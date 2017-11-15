const Wemo = require('wemo-client');
const driver = require('./driver');

module.exports = {
  initialise: (settings, updateSettings, commsInterface, events, createEvent) => driver(settings, updateSettings, commsInterface, Wemo, events, createEvent),
  driverType: 'socket',
  interface: 'http',
  driverId: 'thinglator-driver-wemo-socket',
};
