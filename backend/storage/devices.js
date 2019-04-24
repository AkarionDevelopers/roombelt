const Sequelize = require("sequelize");

module.exports = class {
  constructor(sequelize) {
    this.Model = sequelize.define("devices", {
      deviceId: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      connectionCode: { type: Sequelize.STRING, defaultValue: () => Math.floor(Math.random() * 100000).toString() },
      userId: Sequelize.STRING,
      location: Sequelize.STRING,
      language: { type: Sequelize.STRING, defaultValue: "en-US" },
      clockType: { type: Sequelize.INTEGER, defaultValue: 24 },
      deviceType: { type: Sequelize.STRING, defaultValue: "calendar" },
      calendarId: Sequelize.STRING,
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE,
      lastActivityAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      minutesForCheckIn: { type: Sequelize.INTEGER, defaultValue: 0 },
      minutesForStartEarly: { type: Sequelize.INTEGER, defaultValue: 5 },
      showAvailableRooms: { type: Sequelize.BOOLEAN, defaultValue: false },
      showTentativeMeetings: { type: Sequelize.BOOLEAN, defaultValue: true },
      isReadOnlyDevice: { type: Sequelize.BOOLEAN, defaultValue: false }
    });
  }

  async createDevice() {
    const model = this.Model.build({});
    await model.save();
    return model;
  }

  async removeDevice(deviceId) {
    await this.Model.destroy({ where: { deviceId } });
  }

  async getDeviceById(deviceId) {
    return await this.Model.findByPk(deviceId);
  }

  async getDeviceByConnectionCode(connectionCode) {
    return await this.Model.findOne({ where: { connectionCode } });
  }

  async getDevicesForUser(userId) {
    return await this.Model.findAll({ where: { userId } });
  }

  async countDevicesForUser(userId) {
    return await this.Model.count({ where: { userId } });
  }

  async connectDevice(deviceId, userId) {
    await this.Model.update({ userId, connectionCode: null }, { where: { deviceId } });
  }

  async heartbeatDevice(deviceId) {
    await this.Model.update({ lastActivityAt: new Date() }, { where: { deviceId } });
  }

  async setDeviceOptions(deviceId, { deviceType, calendarId, location, language, clockType, minutesForCheckIn, minutesForStartEarly, showAvailableRooms, showTentativeMeetings, isReadOnlyDevice }) {
    await this.Model.update({
      deviceType,
      calendarId,
      location,
      language,
      clockType,
      minutesForCheckIn,
      minutesForStartEarly,
      showAvailableRooms,
      showTentativeMeetings,
      isReadOnlyDevice
    }, { where: { deviceId } });
  }
};
