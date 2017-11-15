/* eslint-disable new-cap, no-unused-expressions, no-undef, global-require */
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const driverTests = require('thinglator/utils/testDriver');

const expect = chai.expect; // eslint-disable-line no-unused-vars
chai.use(sinonChai);

const driverName = 'aeotec-socket';
const driverType = 'socket';
const driverInterface = 'zwave';

const Driver = require('../index');

driverTests(driverName, Driver, driverType, driverInterface, expect);

describe('functionality', () => {
    let driver;
    let getUnclaimedNodesStub;
    let getNodesClaimedByDriverStub;
    let claimNodeStub;
    let setValueStub;
    let eventEmitterStub;

    beforeEach(() => {
        getUnclaimedNodesStub = sinon.stub().returns(Promise.resolve([
            {
                manufacturer: 'Aeotec',
                product: 'ZW075 Smart Switch Gen5',
                nodeid: 3
            },
            {
                manufacturer: 'Foo',
                product: 'Bar',
                nodeid: 4
            }
        ]));

        getNodesClaimedByDriverStub = sinon.stub().returns(Promise.resolve([]));
        claimNodeStub = sinon.stub();
        setValueStub = sinon.stub().returns(Promise.resolve());
        eventEmitterStub = sinon.stub();

        driver = new Driver();
        driver.init({
            get: () => Promise.resolve({})
        }, {
            getValueChangedEventEmitter: () => ({
                on: sinon.stub()
            }),
            getUnclaimedNodes: getUnclaimedNodesStub,
            getNodesClaimedByDriver: getNodesClaimedByDriverStub,
            claimNode: claimNodeStub,
            setValue: setValueStub
        }, {
            emit: eventEmitterStub
        });
    });

    describe('initDevices method', () => {
        it('should initialise existing devices', () => {
            const devices = [{
                _id: 'a',
                specs: {
                    deviceId: 5
                }
            },
            {
                _id: 'b',
                specs: {
                    deviceId: 6
                }
            }];
            return driver.initDevices(devices).then(() => {
                expect(claimNodeStub.firstCall).to.have.been.calledWith('aeotec-socket', 5);
                expect(claimNodeStub.secondCall).to.have.been.calledWith('aeotec-socket', 6);
            });
        });
    });

    describe('getAuthenticationProcess method', () => {
        it('should return the authentication process', () => {
            expect(driver.getAuthenticationProcess()).to.deep.equal([]);
        });
    });

    describe('discover method', () => {
        it('should look for unclaimed zwave devices and claim them', () => driver.discover().then(() => {
            expect(getUnclaimedNodesStub).to.have.been.calledOnce;
            expect(claimNodeStub).to.have.been.calledOnce;
            expect(claimNodeStub).to.have.been.calledWith('aeotec-socket', 3);
        }));
    });

    describe('command_on method', () => {
        it('should issue the correct zwave command to turn on the device when this method is called', () => {
            driver.nodeIdCache = {
                5: 'a',
                6: 'b'
            };

            return driver.command_on({
                _id: 'a'
            }).then(() => {
                expect(setValueStub).to.have.been.calledOnce;
                expect(setValueStub).to.have.been.calledWith('5', 37, 1, 0, 255);
                expect(eventEmitterStub).to.have.been.calledOnce;
                expect(eventEmitterStub).to.have.been.calledWith('on', 'aeotec-socket', 'a', { on: true });
            });
        });
    });

    describe('command_off method', () => {
        it('should issue the correct zwave command to turn off the device when this method is called', () => {
            driver.nodeIdCache = {
                5: 'a',
                6: 'b'
            };

            return driver.command_off({
                _id: 'a'
            }).then(() => {
                expect(setValueStub).to.have.been.calledOnce;
                expect(setValueStub).to.have.been.calledWith('5', 37, 1, 0, 0);
                expect(eventEmitterStub).to.have.been.calledOnce;
                expect(eventEmitterStub).to.have.been.calledWith('on', 'aeotec-socket', 'a', { on: false });
            });
        });
    });

    describe('processIncomingEvent method', () => {
        it('should issue the correct zwave command to turn off the device when this method is called', () => {
            driver.nodeIdCache = {
                5: 'a',
                6: 'b'
            };
            driver.processIncomingEvent({
                comclass: 50, index: 8, nodeId: 6, value: 123
            });
            driver.processIncomingEvent({
                comclass: 51, index: 8, nodeId: 5, value: 456
            });
            expect(eventEmitterStub).to.have.been.calledOnce;
            expect(eventEmitterStub).to.have.been.calledWith('energy', 'aeotec-socket', 'b', { energy: 123 });
        });
    });
});
