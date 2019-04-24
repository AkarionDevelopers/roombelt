const router = require("express-promise-router")();
const Moment = require("moment");

const context = require("../context");
const logger = require("../logger");

const getTimestamp = time => time.isTimeZoneFixedToUTC && Moment.utc(time).valueOf();

router.use("/device", context.deviceContext);

router.post("/device", async function(req, res) {
  if (!req.context.session.deviceId) {
    const { deviceId } = await req.context.storage.devices.createDevice();
    await req.context.storage.session.updateSession(req.context.session.token, { deviceId });
  }

  res.sendStatus(200);
});

router.delete("/device", async (req, res) => {
  await req.context.storage.devices.removeDevice(req.context.session.deviceId);
  await req.context.removeSession(req, res);
  res.sendStatus(204);
});

router.use("/device", async function(req, res) {
  logger.debug(`Device ID ${req.context.session.deviceId}`);

  if (!req.context.session.deviceId) {
    logger.error(`Missing Device ID`);
    return res.sendStatus(403);
  }

  req.context.device = await req.context.storage.devices.getDeviceById(req.context.session.deviceId);

  if (!req.context.device) {
    logger.error(`Device not found: ${req.context.session.deviceId}`);
    return res.sendStatus(404);
  }

  if (req.context.subscriptionStatus && req.context.subscriptionStatus.areDevicesBlocked) {
    logger.info(`Invalid subscription. User: ${req.context.device.userId}. Device: ${req.context.session.deviceId}`);
    return res.sendStatus(402);
  }

  return "next";
});

async function getCalendarInfo(calendarId, calendarProvider, showTentativeMeetings) {
  const calendar = calendarId && await calendarProvider.getCalendar(calendarId);
  const calendarEvents = calendarId && await calendarProvider.getEvents(calendarId, { showTentativeMeetings });

  const events = calendarId && calendarEvents
    .filter(event => event.isAllDayEvent || getTimestamp(event.end) > Date.now())
    .slice(0, 10)
    .map(event => !event.isPrivate ? event : {
      ...event,
      summary: null,
      organizer: {},
      attendees: []
    });

  return calendar && {
    id: calendarId,
    name: calendar && calendar.summary,
    canModifyEvents: calendar && calendar.canModifyEvents,
    events
  };
}

async function getUserCalendars(req) {
  const devices = await req.context.storage.devices.getDevicesForUser(req.context.device.userId);
  const calendarIds = devices
    .map(device => device.deviceType === "calendar" && device.calendarId)
    .filter(calendarId => calendarId);

  const uniqueCalendarIds = [...new Set(calendarIds)];
  const calendars = await Promise.all(uniqueCalendarIds.map(
    calendarId => getCalendarInfo(calendarId, req.context.calendarProvider, req.context.device.showTentativeMeetings))
  );

  return calendars.filter(calendar => calendar);
}

router.get("/device", async function(req, res) {
  const device = req.context.device;

  const isDashboard = device.deviceType === "dashboard";
  const isCalendarSelected = device.calendarId;
  const getAllCalendars = isDashboard || (isCalendarSelected && req.query["all-calendars"] === "true");

  const calendar = isCalendarSelected ? await getCalendarInfo(device.calendarId, req.context.calendarProvider, req.context.device.showTentativeMeetings) : null;
  const allCalendars = getAllCalendars ? await getUserCalendars(req) : null;
  const isReadOnlyDevice = device.isReadOnlyDevice || (calendar && !calendar.canModifyEvents);

  res.json({
    deviceType: device.deviceType,
    language: process.env["REFRESH_LANG"] || device.language,
    clockType: device.clockType,
    connectionCode: device.connectionCode,
    minutesForCheckIn: isReadOnlyDevice ? 0 : device.minutesForCheckIn,
    minutesForStartEarly: isReadOnlyDevice ? 15 : device.minutesForStartEarly,
    showAvailableRooms: device.showAvailableRooms,
    isReadOnlyDevice,
    calendar,
    allCalendars
  });

  await req.context.storage.devices.heartbeatDevice(req.context.session.deviceId);
});

router.use("/device/meeting", (req, res, next) => (req.context.device.calendarId ? next() : res.sendStatus(400)));

router.post("/device/meeting", async function(req, res) {
  if (req.body.calendarId) {
    const devices = await req.context.storage.devices.getDevicesForUser(req.context.device.userId);
    const device = devices.find(device => device.deviceType === "calendar" && device.calendarId === req.body.calendarId);

    if (!device) {
      return res.sendStatus(404);
    }
  }

  const calendarId = req.body.calendarId || req.context.device.calendarId;

  logger.info(`Creating new meeting from device ${req.context.session.deviceId} in calendar ${calendarId}`);

  const calendar = await req.context.calendarProvider.getCalendar(calendarId);
  const events = await req.context.calendarProvider.getEvents(calendarId, {
    invalidateCache: true,
    showTentativeMeetings: req.context.device.showTentativeMeetings
  });

  const currentEvent = events.find(event => !event.isAllDayEvent && getTimestamp(event.start) < Date.now() && getTimestamp(event.end) > Date.now());
  if (currentEvent) {
    return res.sendStatus(409);
  }

  const nextEvent = events.find(event => !event.isAllDayEvent && getTimestamp(event.start) > Date.now());

  const desiredStartTime = Date.now() + (req.body.timeInMinutes || 15) * 60 * 1000;
  const nextEventStartTime = nextEvent ? getTimestamp(nextEvent.start) : Number.POSITIVE_INFINITY;

  await req.context.calendarProvider.createEvent(calendarId, {
    startDateTime: Date.now(),
    endDateTime: Math.min(desiredStartTime, nextEventStartTime),
    isCheckedIn: true,
    summary: req.body.summary || `Meeting in ${calendar.summary}`
  });

  res.sendStatus(201);
});

router.put("/device/meeting/:meetingId", async function(req, res) {
  logger.info(`Altering meeting ${req.params.meetingId} from device ${req.context.session.deviceId}`);

  const events = await req.context.calendarProvider.getEvents(req.context.device.calendarId, {
    invalidateCache: true,
    showTentativeMeetings: req.context.device.showTentativeMeetings
  });
  const event = events.find(event => event.id === req.params.meetingId);

  if (event === -1) {
    return res.sendStatus(404);
  }

  const startNowTime = req.body.startNow && Date.now();
  const endNowTime = req.body.endNow && Date.now();
  const isCheckedIn = req.body.checkIn === true;
  const extensionTime = getExtensionTime();

  await req.context.calendarProvider.patchEvent(req.context.device.calendarId, req.params.meetingId, {
    startDateTime: startNowTime,
    endDateTime: endNowTime || extensionTime,
    isCheckedIn
  });

  res.sendStatus(204);

  function getExtensionTime() {
    if (!req.body.extensionTime) return;

    const nextEvent = events.find(event => !event.isAllDayEvent && getTimestamp(event.start) > Date.now());

    const currentEventEndTimestamp = getTimestamp(event.end);
    const nextEventStartTimestamp = nextEvent ? getTimestamp(nextEvent.start) : Number.POSITIVE_INFINITY;

    const endTime = Math.min(currentEventEndTimestamp + req.body.extensionTime * 60 * 1000, nextEventStartTimestamp);

    return Math.max(currentEventEndTimestamp, endTime);
  }
});

router.delete("/device/meeting/:meetingId", async function(req, res) {
  logger.info(`Removing meeting ${req.params.meetingId} from device ${req.context.session.deviceId}`);

  await req.context.calendarProvider.deleteEvent(req.context.device.calendarId, req.params.meetingId);

  res.sendStatus(204);
});

module.exports = router;
