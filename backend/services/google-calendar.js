const crypto = require("crypto");
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
const Moment = require("moment");
const logger = require("../logger");
const Cache = require("./cache");

const CHANNEL_TTL_CALENDARS = 60 * 2;
const CHANNEL_TTL_EVENTS = 60 * 5;

const valuesCache = Cache("google");
const watchersCache = Cache("google-watchers");

const getTime = time => {
  if (!time) {
    return null;
  }

  const [year, month, day, hour, minute, second] = Moment.utc(time.dateTime || time.date).toArray();

  return { year, month, day, hour, minute, second, isTimeZoneFixedToUTC: !!time.dateTime };
};

const getStatus = (status, attendees) => {
  if (status.toLowerCase() === "cancelled") return "declined";

  const room = attendees && attendees.find(attendee => attendee.self);

  if (!room) return "accepted";

  if (room.responseStatus.toLowerCase() === "accepted") return "accepted";
  if (room.responseStatus.toLowerCase() !== "declined") return "tentative";

  return "declined";
};

const mapEvent = ({ id, summary, start, end, organizer, status, attendees, extendedProperties, visibility }) => ({
  id,
  summary,
  organizer: organizer && { displayName: organizer.displayName || organizer.email },
  isAllDayEvent: !!(start && start.date) || !!(end && end.date),
  start: getTime(start),
  end: getTime(end),
  attendees: (attendees && attendees.map(attendee => ({ displayName: attendee.displayName || attendee.email }))) || [],
  isCheckedIn: extendedProperties && extendedProperties.private && extendedProperties.private.roombeltIsCheckedIn === "true",
  isPrivate: visibility === "private" || visibility === "confidential",
  status: getStatus(status, attendees)
});

module.exports = class {
  constructor(config, credentials) {
    this.oauthClient = new OAuth2(config.clientId, config.clientSecret, config.redirectUrl);

    this.oauthClient.setCredentials({
      access_token: credentials && credentials.accessToken,
      refresh_token: credentials && credentials.refreshToken
    });

    this.calendarClient = google.calendar({ version: "v3", auth: this.oauthClient });
    this.peopleClient = google.people({ version: "v1", auth: this.oauthClient });

    this.cacheKey = credentials && crypto.createHash("md5").update(credentials.refreshToken).digest("hex");
    this.clientId = config.clientId;
    this.webHookUrl = config.webHookUrl;
  }

  getAuthUrl(forceConsent) {
    if (!this.clientId) return null;

    const scopes = ["https://www.googleapis.com/auth/calendar", "profile", "email"];

    return this.oauthClient.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: forceConsent ? "consent" : undefined
    });
  }

  async getAuthTokens(authCode) {
    const { tokens } = await this.oauthClient.getToken(authCode);
    const verification = await this.oauthClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: this.clientId
    });

    return {
      provider: "google",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      userId: verification.payload.sub,
      tenantId: verification.payload.tid
    };
  }

  async isAccessTokenValid() {
    try {
      await this.getUserDetails();
      return true;
    } catch (err) {
      return false;
    }
  }

  async getUserDetails() {
    const { data } = await new Promise((res, rej) =>
      this.peopleClient.people.get({
        resourceName: "people/me",
        personFields: "names,photos,emailAddresses"
      }, (err, data) => (err ? rej(err) : res(data)))
    );

    return {
      displayName: (data.names && data.names[0] && data.names[0].displayName) || "Unknown",
      photoUrl: (data.photos && data.photos[0] && data.photos[0].url) || "",
      email: (data.emailAddresses && data.emailAddresses[0] && data.emailAddresses[0].value) || ""
    };
  }

  async getCalendars(options = { invalidateCache: false }) {
    const cacheKey = `calendars-${this.cacheKey}`;

    if (!await watchersCache.get(cacheKey) && this.webHookUrl) {
      logger.debug(`Set calendars watcher`);

      const channelId = crypto.randomBytes(64).toString("hex");
      await watchersCache.set(cacheKey, channelId, 5);

      this.$watchCalendars(cacheKey, channelId, CHANNEL_TTL_CALENDARS)
        .then(() => watchersCache.set(cacheKey, channelId, CHANNEL_TTL_CALENDARS - 10));
    }

    if (options.invalidateCache) {
      await valuesCache.delete(cacheKey);
    }

    let result = await valuesCache.get(cacheKey);
    if (!result) {
      logger.debug(`Fetch calendars`);

      const { items } = await new Promise((res, rej) => this.calendarClient.calendarList.list((err, data) => (err ? rej(err) : res(data.data))));
      result = items.map(calendar => ({
        id: calendar.id,
        summary: calendar.summary,
        canModifyEvents: calendar.accessRole === "writer" || calendar.accessRole === "owner"
      }));

      await valuesCache.set(cacheKey, result, this.webHookUrl ? CHANNEL_TTL_CALENDARS : 30);
    }

    return result;
  }

  async getCalendar(calendarId) {
    const calendars = await this.getCalendars();
    return calendars.find(calendar => calendar.id === calendarId);
  }

  async getEvents(calendarId, options = { invalidateCache: false, showTentativeMeetings: false }) {
    const cacheKey = `events-${this.cacheKey}-${calendarId}`;

    if (options.invalidateCache) {
      await valuesCache.delete(cacheKey);
    }

    if (!await watchersCache.get(cacheKey) && this.webHookUrl) {
      logger.debug(`Set events watcher for calendar ${calendarId}`);

      const channelId = crypto.randomBytes(64).toString("hex");
      await watchersCache.set(cacheKey, channelId, 5);

      this.$watchEvents(calendarId, cacheKey, channelId, CHANNEL_TTL_EVENTS)
        .then(() => watchersCache.set(cacheKey, channelId, CHANNEL_TTL_EVENTS - 10));
    }

    const query = {
      calendarId: encodeURIComponent(calendarId),
      timeMin: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      timeMax: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      singleEvents: true,
      orderBy: "startTime"
    };

    let result = await valuesCache.get(cacheKey);
    if (!result) {
      logger.debug(`Fetch events for ${calendarId}`);

      const { items } = await new Promise((res, rej) => this.calendarClient.events.list(query, (err, data) => (err ? rej(err) : res(data.data))));

      result = items.map(mapEvent);
      await valuesCache.set(cacheKey, result, this.webHookUrl ? CHANNEL_TTL_EVENTS : 30);
    }

    return result.filter(event => event.status === "accepted" || (options.showTentativeMeetings && event.status === "tentative"));
  }

  async createEvent(calendarId, { startDateTime, endDateTime, isCheckedIn, summary }) {
    const query = {
      calendarId: encodeURIComponent(calendarId),
      resource: {
        summary,
        start: { dateTime: new Date(startDateTime).toISOString() },
        end: { dateTime: new Date(endDateTime).toISOString() },
        extendedProperties: { private: { roombeltIsCheckedIn: isCheckedIn ? "true" : "false" } }
      }
    };

    await new Promise((res, rej) =>
      this.calendarClient.events.insert(query, (err, data) => (err ? rej(err) : res(data)))
    );

    await valuesCache.delete(`events-${this.cacheKey}-${calendarId}`);
  }

  async patchEvent(calendarId, eventId, { startDateTime, endDateTime, isCheckedIn }) {
    const resource = {};
    if (startDateTime) resource.start = { dateTime: new Date(startDateTime).toISOString() };
    if (endDateTime) resource.end = { dateTime: new Date(endDateTime).toISOString() };
    if (isCheckedIn) resource.extendedProperties = { private: { roombeltIsCheckedIn: "true" } };

    const query = {
      calendarId: encodeURIComponent(calendarId),
      eventId: encodeURIComponent(eventId),
      resource
    };

    await new Promise((res, rej) =>
      this.calendarClient.events.patch(query, (err, data) => (err ? rej(err) : res(data)))
    );

    await valuesCache.delete(`events-${this.cacheKey}-${calendarId}`);
  }

  async deleteEvent(calendarId, eventId) {
    const query = {
      calendarId: encodeURIComponent(calendarId),
      eventId: encodeURIComponent(eventId)
    };

    await new Promise((res, rej) =>
      this.calendarClient.events.delete(query, (err, data) => (err ? rej(err) : res(data)))
    );

    await valuesCache.delete(`events-${this.cacheKey}-${calendarId}`);
  }

  $watchCalendars(key, channelId, ttl) {
    return new Promise((res, rej) =>
      this.calendarClient.calendarList.watch(
        { resource: { id: channelId, token: key, type: "web_hook", address: this.webHookUrl, params: { ttl } } },
        (err, data) => (err ? rej(err) : res(data.data))
      )
    );
  }

  $watchEvents(calendarId, key, channelId, ttl) {
    return new Promise((res, rej) => {
      this.calendarClient.events.watch(
        {
          calendarId,
          resource: { id: channelId, token: key, type: "web_hook", address: this.webHookUrl, params: { ttl } }
        },
        (err, data) => (err ? rej(err) : res(data.data))
      );
    });
  }
};

module.exports.valuesCache = valuesCache;
module.exports.watchersCache = watchersCache;