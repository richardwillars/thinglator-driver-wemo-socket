'use strict';

var Wemo = require('wemo-client');
var wemo = new Wemo();

var activeDevices = [];
var deviceCache = {};
var eventCallbackFunctionInstances = {};
var eventsFired = {};

class WemoSwitchDriver {
	constructor(driverSettingsObj, interfaces) {
		var self = this;

		this.interface = interfaces[this.getInterface()];
	}

	getName() {
		return 'wemo-switch';
	}

	getType() {
		return 'switch';
	}

	getInterface() {
		return 'http';
	}

	setEventEmitter(eventEmitter) {
		this.eventEmitter = eventEmitter;
	}

	initDevices(devices) {
		var self = this;
		
		//To listen for events from the switches the wemo library requires that we initialise each switch as a class and attach an event listener to it

		//remove existing event listeners
		for(var i in deviceCache) {
			deviceCache[i].removeListener('binaryState', eventCallbackFunctionInstances[i]);
		}

		//wipe the cache
		deviceCache = {};

		//get the new callback url
		var cbUrl = wemo.getCallbackURL();

		//loop through the devices and initialise them
		for(var i in devices) {
			//update the callback url
			devices[i].specs.additionalInfo.callbackURL = cbUrl;

		 	deviceCache[devices[i]._id] = wemo.client(devices[i].specs.additionalInfo);

		 	//create a scope so we can pass params to our event listener callback within a loop
		 	(function () {
		 		eventCallbackFunctionInstances[devices[i]._id] = function(value) {
		 			//as soon as we setup the event listener this event will fire. We want to ignore this initial event..
		 			if(typeof eventsFired[devices[i]._id] === "undefined") {
		 				eventsFired[devices[i]._id] = true;
		 				return;
		 			}

					if(value==='1') {
						self.eventEmitter.emit('on','wemo-switch',devices[i]._id);
					}
					else {
						self.eventEmitter.emit('off','wemo-switch',devices[i]._id);
					}
				}

				deviceCache[devices[i]._id].on('binaryState', eventCallbackFunctionInstances[devices[i]._id]);

				deviceCache[devices[i]._id].on('error', function(err) {
					if((err.code==='EHOSTUNREACH') || (err.code==='ECONNREFUSED') || (err.code==='ETIMEDOUT')) {
						activeDevices = _(activeDevices).filter(function(item) {
						    return item.additionalInfo.host !== err.address;
						});
					}
				});
			}()); // immediate invocation	
		}
	}

	

	getAuthenticationProcess() {
		return [];
	}

	discover() {
		return new Promise(function(resolve) {

			//the wemo-client library is event driven. Setup a listener that gets fired whenever a new device is discovered
			wemo.discover(function(info,foo) {
			  	if(info.modelName !== 'Socket') {
			  		return;
			  	}

			  	var device = {
					deviceId: info.serialNumber,
					name: info.friendlyName,
					address: info.callbackURL,
					capabilities: {
						on: true,
						off: true
					},
					additionalInfo: info
				};
				activeDevices.push(device);
			});
			setTimeout(function() {
			  resolve(activeDevices);
			}, 8000);			
		});
	}

	capability_on(device, props) {
		return new Promise(function(resolve) {
			var wemoSwitchInstance = wemo.client(device.specs.additionalInfo);
			wemoSwitchInstance.setBinaryState(1);
			resolve({
				on: true
			});
		});
	}

	capability_off(device, props) {
		return new Promise(function(resolve) {
			var wemoSwitchInstance = wemo.client(device.specs.additionalInfo);
			wemoSwitchInstance.setBinaryState(0);
			resolve({
				off: true
			});
		});
	}
}

module.exports = WemoSwitchDriver;