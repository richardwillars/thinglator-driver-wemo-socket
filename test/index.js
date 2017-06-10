/* eslint-disable new-cap, no-unused-expressions, no-undef, global-require */
const chai = require('chai');
const mockery = require('mockery');
const driverTests = require('thinglator/utils/testDriver');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

const expect = chai.expect;
chai.use(sinonChai);

const driverName = 'wemo-socket';
const driverType = 'socket';
const driverInterface = 'http';


describe('WemoSocket', () => {
    const wemoMock = class HueApi {
        discover() {
            return Promise.resolve({});
        }
        getCallbackURL() {
            return '';
        }
        client() {
            return {
                setBinaryState: sinon.stub(),
                on: sinon.stub(),
                removeListener: sinon.stub()
            };
        }
    };

    mockery.enable({
        useCleanCache: true,
        warnOnUnregistered: false
    });

    mockery.registerMock('wemo-client', wemoMock);
    const Driver = require('../index');

    driverTests(driverName, Driver, driverType, driverInterface, expect);
});
