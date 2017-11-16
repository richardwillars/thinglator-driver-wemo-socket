const deviceCache = {};
const activeDevices = [];
const eventCallbackFunctionInstances = {};
const eventsFired = {};

const initDevices = async (devices, commsInterface, wemo, events, createEvent) => {
  // To listen for events from the switches the wemo library requires that we initialise each switch as a
  // class and attach an event listener to it

  // remove existing event listeners
  Object.keys(deviceCache).forEach((deviceId) => {
    deviceCache[deviceId].removeListener('binaryState', eventCallbackFunctionInstances[deviceId]);
    delete deviceCache[deviceId];
  });

  // get the new callback url
  const cbUrl = wemo.getCallbackURL();

  // loop through the devices and initialise them
  devices.forEach((device) => {
    const newDevice = Object.assign(device, {});
    // update the callback url
    newDevice.specs.additionalInfo.callbackURL = cbUrl;

    deviceCache[newDevice._id] = wemo.client(newDevice.specs.additionalInfo);

    eventCallbackFunctionInstances[newDevice._id] = (value) => {
      // as soon as we setup the event listener this event will fire. We want to ignore this initial event..
      if (typeof eventsFired[newDevice._id] === 'undefined') {
        eventsFired[newDevice._id] = true;
        return;
      }

      if (value === '1') {
        createEvent(events.ON, newDevice._id, {
          on: true,
        });
      } else {
        createEvent(events.ON, newDevice._id, {
          on: false,
        });
      }
    };

    deviceCache[newDevice._id].on('binaryState', eventCallbackFunctionInstances[newDevice._id]);

    deviceCache[newDevice._id].on('error', (err) => {
      if ((err.code === 'EHOSTUNREACH') || (err.code === 'ECONNREFUSED') || (err.code === 'ETIMEDOUT')) {
        // activeDevices = activeDevices.filter(item => item.additionalInfo.host !== err.address);
      }
    });
  });
};

const discover = async () => Promise.resolve(activeDevices);

const commandOn = async (device, wemo) => {
  const wemoSwitchInstance = wemo.client(device.specs.additionalInfo);
  wemoSwitchInstance.setBinaryState(1);
};

const commandOff = async (device, wemo) => {
  const wemoSwitchInstance = wemo.client(device.specs.additionalInfo);
  wemoSwitchInstance.setBinaryState(0);
};


module.exports = async (getSettings, updateSettings, commsInterface, Wemo, events, createEvent) => {
  const wemo = new Wemo();
  wemo.discover((err, info) => {
    if (err) {
      return;
    }

    if (info.modelName !== 'Socket') {
      return;
    }

    const device = {
      originalId: info.serialNumber,
      name: info.friendlyName,
      address: info.callbackURL,
      commands: {
        on: true,
        off: true,
      },
      events: {
        [events.ON]: true,
      },
      additionalInfo: info,
    };
    activeDevices.push(device);
  });
  return {
    initDevices: async devices => initDevices(devices, commsInterface, wemo, events, createEvent),
    authentication_getSteps: [],
    discover: async () => discover(),
    command_on: async device => commandOn(device, wemo),
    command_off: async device => commandOff(device, wemo),
  };
};
