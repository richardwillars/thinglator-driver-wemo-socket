const Wemo = require('wemo-client');

class WemoSocketDriver {
    constructor() {
        this.driverSettings = {};
        this.commsInterface = null;
        this.deviceCache = {};
        this.activeDevices = [];
        this.eventsFired = {};
        this.eventCallbackFunctionInstances = {};
        this.wemo = new Wemo();
    }
    init(driverSettingsObj, commsInterface, eventEmitter) {
        this.driverSettingsObj = driverSettingsObj;

        this.eventEmitter = eventEmitter;
        this.commsInterface = commsInterface;

        return this.driverSettingsObj.get().then((settings) => {
            this.driverSettings = settings;

            this.wemo.discover((err, info) => {
                if(err) {
                    return;
                }

                if (info.modelName !== 'Socket') {
                    return;
                }

                const device = {
                    deviceId: info.serialNumber,
                    name: info.friendlyName,
                    address: info.callbackURL,
                    commands: {
                        on: true,
                        off: true
                    },
                    events: {
                        on: true
                    },
                    additionalInfo: info
                };
                this.activeDevices.push(device);
            });
        });
    }

    getName() {
        return 'wemo-socket';
    }

    getType() {
        return 'socket';
    }

    getInterface() {
        return 'http';
    }

    getEventEmitter() {
        return this.eventEmitter;
    }


    initDevices(devices) {
        // To listen for events from the switches the wemo library requires that we initialise each switch as a
        // class and attach an event listener to it

        // remove existing event listeners
        Object.keys(this.deviceCache).forEach((deviceId) => {
            this.deviceCache[deviceId].removeListener('binaryState', this.eventCallbackFunctionInstances[deviceId]);
        });

        // wipe the cache
        this.deviceCache = {};

        // get the new callback url
        const cbUrl = this.wemo.getCallbackURL();

        // loop through the devices and initialise them
        devices.forEach((device) => {
            const newDevice = Object.assign(device, {});
            // update the callback url
            newDevice.specs.additionalInfo.callbackURL = cbUrl;

            this.deviceCache[newDevice._id] = this.wemo.client(newDevice.specs.additionalInfo);

            this.eventCallbackFunctionInstances[newDevice._id] = (value) => {
                // as soon as we setup the event listener this event will fire. We want to ignore this initial event..
                if (typeof this.eventsFired[newDevice._id] === 'undefined') {
                    this.eventsFired[newDevice._id] = true;
                    return;
                }

                if (value === '1') {
                    this.eventEmitter.emit('on', 'wemo-socket', newDevice._id, {
                        on: true
                    });
                } else {
                    this.eventEmitter.emit('on', 'wemo-socket', newDevice._id, {
                        on: false
                    });
                }
            };

            this.deviceCache[newDevice._id].on('binaryState', this.eventCallbackFunctionInstances[newDevice._id]);

            this.deviceCache[newDevice._id].on('error', (err) => {
                if ((err.code === 'EHOSTUNREACH') || (err.code === 'ECONNREFUSED') || (err.code === 'ETIMEDOUT')) {
                    this.activeDevices = this.activeDevices.filter(item => item.additionalInfo.host !== err.address);
                }
            });
        });
    }


    getAuthenticationProcess() {
        return [];
    }

    discover() {
        return Promise.resolve(this.activeDevices);
    }

    command_on(device) { // eslint-disable-line camelcase
        return new Promise((resolve) => {
            const wemoSwitchInstance = this.wemo.client(device.specs.additionalInfo);
            wemoSwitchInstance.setBinaryState(1);
            resolve();
        });
    }

    command_off(device) { // eslint-disable-line camelcase
        return new Promise((resolve) => {
            const wemoSwitchInstance = this.wemo.client(device.specs.additionalInfo);
            wemoSwitchInstance.setBinaryState(0);
            resolve();
        });
    }
}

module.exports = WemoSocketDriver;
