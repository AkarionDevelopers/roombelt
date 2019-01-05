const router = require("express-promise-router")();

router.get("/auth", async (req, res) => {
  res.json({
    scope: req.context.session.scope,
    adminUrl: req.context.calendarProvider.getAuthUrl(),
    isLinked: !!req.context.session.userId,
    isAccessTokenValid: await req.context.calendarProvider.isAccessTokenValid()
  });
});

router.put("/auth/device", async function(req, res) {
  if (req.context.session.scope !== "device") {
    const { deviceId } = await req.context.storage.devices.createDevice();
    await req.context.storage.session.updateSession(req.context.session.token, { scope: "device", deviceId });
  }

  res.sendStatus(200);
});

router.delete("/auth", async function(req, res) {
  res.clearCookie("sessionToken", { httpOnly: true });
  res.sendStatus(204);
});

module.exports = router;
