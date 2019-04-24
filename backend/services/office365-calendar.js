const crypto = require("crypto");
const axios = require("axios");
const simpleOAuth2 = require("simple-oauth2");
const jwt = require("jsonwebtoken");
const graph = require("@microsoft/microsoft-graph-client");
const Moment = require("moment");
const ms = require("ms");
const Cache = require("./cache");
const qs = require("qs");
const logger = require("../logger");

const isCheckedInExtension = "Com.Roombelt.IsCheckedIn";
const cache = Cache("office-365");
const CACHE_TTL = 30;

const getTime = (time, isAllDayEvent) => {
  if (!time) {
    return null;
  }

  const [year, month, day, hour, minute, second] = Moment.utc(time.dateTime).toArray();
  return { year, month, day, hour, minute, second, isTimeZoneFixedToUTC: !isAllDayEvent };
};

const serviceAuthProvider = (config, credentials) => async cb => {
  if (!credentials || !credentials.refreshToken) {
    return cb(null, null);
  }

  const cacheKey = `service-auth-${credentials.userId}`;

  let result = await cache.get(cacheKey);
  if (!result) {
    const { data: { access_token, expires_in } } = await axios.post(`https://login.microsoftonline.com/${credentials.tenantId}/oauth2/v2.0/token`, qs.stringify({
      grant_type: "client_credentials",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      scope: "https://graph.microsoft.com/.default"
    }));

    result = access_token;
    await cache.set(cacheKey, access_token, expires_in - 60 * 5);
  }

  cb(null, result);
};

const getStatus = (responseStatus) => {
  const response = responseStatus && responseStatus.response && responseStatus.response.toLowerCase();
  if (response === "declined") return "declined";
  if (response === "accepted" || response === "organizer") return "accepted";
  return "tentative";
};

const consumeStream = (stream) => new Promise(resolve => {
  const chunks = [];
  stream.on("data", chunk => chunks.push(chunk));
  stream.on("end", () => resolve(Buffer.concat(chunks)));
});

module.exports = class {
  constructor(config, credentials) {
    this.oauth2 = simpleOAuth2.create({
      client: {
        id: config.clientId,
        secret: config.clientSecret
      },
      auth: {
        tokenHost: "https://login.microsoftonline.com",
        authorizePath: "common/oauth2/v2.0/authorize",
        tokenPath: "common/oauth2/v2.0/token"
      }
    });

    this.serviceClient = graph.Client.init({
      authProvider: serviceAuthProvider(config, credentials),
      defaultVersion: "beta"
    });

    this.clientId = config.clientId;
    this.redirectUrl = config.redirectUrl;
    this.redirectUrlAdmin = config.redirectUrlAdmin;
    this.authScope = "openid profile email offline_access";
    this.cacheKey = credentials && crypto.createHash("md5").update(credentials.refreshToken).digest("hex");
    this.credentials = credentials;
  }

  getAuthUrl() {
    if (!this.clientId) return null;

    return this.oauth2.authorizationCode.authorizeURL({
      redirect_uri: this.redirectUrl,
      scope: this.authScope
    });
  }

  getAdminAuthUrl() {
    return `https://login.microsoftonline.com/common/adminconsent?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUrlAdmin)}`;
  }

  async getAuthTokens(authCode) {
    let result = await this.oauth2.authorizationCode.getToken({
      code: authCode,
      redirect_uri: this.redirectUrl,
      scope: this.authScope
    });

    const { token } = this.oauth2.accessToken.create(result);

    const user = jwt.decode(token.id_token);

    if (user.aud !== this.clientId) {
      throw new Error("Invalid auth token");
    }

    return {
      provider: "office365",
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      userId: user.oid,
      tenantId: user.tid
    };
  }

  async refreshAccessToken() {
    await cache.delete(`service-auth-${this.credentials.userId}`);
  }

  async isAccessTokenValid() {
    if (!this.credentials) {
      return false;
    }

    try {
      logger.debug(`isAccessTokenValid: ${this.credentials.userId}`);

      await this.serviceClient.api(`/users/${this.credentials.userId}`).get();

      logger.debug(`isAccessTokenValid: ${this.credentials.userId} [success]`);

      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  async getUserPhoto() {
    const photo = await this.serviceClient.api(`/users/${this.credentials.userId}/photo/$value`)
      .responseType(graph.ResponseType.RAW)
      .get()
      .then(null, () => null);

    if (!photo || !photo.body) {
      return null;
    }

    const data = await consumeStream(photo.body);
    return `data:${photo.headers.get("content-type")};base64,${data.toString("base64")}`;
  }

  async getUserDetails() {
    const userDetails = await this.serviceClient.api(`/users/${this.credentials.userId}`).get();

    return {
      displayName: (userDetails.displayName) || "Unknown",
      email: (userDetails.mail) || "",
      photoUrl: await this.getUserPhoto() || ""
    };
  }

  async getCalendars(options = { invalidateCache: false }) {
    const cacheKey = `calendars-${this.cacheKey}`;

    if (options.invalidateCache) {
      await cache.delete(cacheKey);
    }

    let result = await cache.get(cacheKey);
    if (!result) {
      const { value } = await this.serviceClient.api(`/users/${this.credentials.userId}/findRooms`).top(100).get();
      result = value.map(calendar => ({
        id: calendar.address,
        summary: calendar.name,
        canModifyEvents: true
      }));

      await cache.set(cacheKey, result, CACHE_TTL);
    }

    return result;
  }

  async getCalendar(calendarId) {
    const calendars = await this.getCalendars();
    return calendars.find(calendar => calendar.id === calendarId);
  }

  async invalidateCalendarCache(calendarId) {
    await cache.delete(`events-${this.cacheKey}-${calendarId}`);
  }

  async assertCalendar(calendarId) {
    if (!await this.getCalendar(calendarId)) {
      throw new Error("Unknown calendar: " + calendarId);
    }
  }

  async getEvents(calendarId, options = { invalidateCache: false, showTentativeMeetings: false }) {
    await this.assertCalendar(calendarId);

    const cacheKey = `events-${this.cacheKey}-${calendarId}`;

    if (options.invalidateCache) {
      await cache.delete(cacheKey);
    }

    let result = await cache.get(cacheKey);
    if (!result) {
      const { value } = await this.serviceClient.api(`/users/${encodeURIComponent(calendarId)}/calendarView`)
        .query({
          StartDateTime: new Date(Date.now() - ms("1 day")).toISOString(),
          EndDateTime: new Date(Date.now() + ms("1 day")).toISOString(),
          $expand: `extensions($filter=id eq '${isCheckedInExtension}')`
        })
        .header("Prefer", `outlook.timezone="UTC"`)
        .top(100)
        .get();

      result = value
        .map(event => ({
          id: event.id,
          summary: event.subject,
          organizer: { displayName: event.organizer && event.organizer.emailAddress && event.organizer.emailAddress.name },
          isAllDayEvent: event.isAllDay,
          start: getTime(event.start, event.isAllDay),
          end: getTime(event.end, event.isAllDay),
          attendees: event.attendees.map(attendee => ({ displayName: attendee.emailAddress && attendee.emailAddress.name })),      // TODO
          isCheckedIn: event.extensions ? event.extensions.some(el => el.isCheckedIn) : false,
          isPrivate: event.sensitivity === "private",
          status: getStatus(event.responseStatus)
        }));

      await cache.set(cacheKey, result, CACHE_TTL);
    }

    return result.filter(event => event.status === "accepted" || (options.showTentativeMeetings && event.status === "tentative"));
  }

  async createEvent(calendarId, { startDateTime, endDateTime, isCheckedIn, summary }) {
    await this.assertCalendar(calendarId);

    await this.serviceClient.api(`/users/${encodeURIComponent(calendarId)}/events`).post({
      subject: summary,
      start: { timezone: "UTC", dateTime: Moment(startDateTime).toISOString(false) },
      end: { timezone: "UTC", dateTime: Moment(endDateTime).toISOString(false) },
      extensions: [{
        "@odata.type": "microsoft.graph.openTypeExtension",
        extensionName: isCheckedInExtension,
        isCheckedIn
      }]
    });

    await this.invalidateCalendarCache(calendarId);
  }

  async patchEvent(calendarId, eventId, { startDateTime, endDateTime, isCheckedIn }) {
    await this.assertCalendar(calendarId);

    const path = `/users/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;

    if (isCheckedIn) {
      await this.serviceClient.api(`${path}/extensions/${isCheckedInExtension}`)
        .patch({
          "@odata.type": "microsoft.graph.openTypeExtension",
          extensionName: isCheckedInExtension,
          isCheckedIn: true
        });
    }

    const resource = {};
    if (startDateTime) resource.start = { timezone: "UTC", dateTime: Moment(startDateTime).toISOString(false) };
    if (endDateTime) resource.end = { timezone: "UTC", dateTime: Moment(endDateTime).toISOString(false) };

    await this.serviceClient.api(path).patch(resource);

    await this.invalidateCalendarCache(calendarId);
  }

  async deleteEvent(calendarId, eventId) {
    await this.assertCalendar(calendarId);
    await this.serviceClient.api(`/users/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`).delete();
    await this.invalidateCalendarCache(calendarId);
  }
};
