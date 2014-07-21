var winston = require("winston");

var Application = require("./catapult-application").Application;
var PhoneNumber = require("./catapult-phonenumber").PhoneNumber;
var Call = require("./catapult-call");
var Bridge = require("./catapult-bridge").Bridge;

/**
* Intercepts and sends requests to/from catapult
* @pconstructor
* @param {Object} app - express app under test
**/
function Catapult () {
	var calls = {};
	var applications = {};
	var phoneNumbersByNumberId = {};
	var phoneNumbersByNumberString = {};
	var bridges = {};
	var self = this;

	this.addCall = function (call) {
		var callId = call.getId();
		calls[callId] = call;
	};

	this.addApplication = function (application) {
		var appId = application.getId();
		applications[appId] = application;
	};

	this.addPhoneNumber = function (phoneNumber) {
		var numberId = phoneNumber.getId();
		var phoneNumberNumber = phoneNumber.getNumber();
		phoneNumbersByNumberId[numberId] = phoneNumber;
		phoneNumbersByNumberString[phoneNumberNumber] = phoneNumber;
	};

	this.addBridge = function (bridge) {
		var bridgeId = bridge.getId();
		bridges[bridgeId] = bridge;
	};

	this.getCalls = function () {
		return calls;
	};

	this.getApplications = function () {
		return applications;
	};

	this.getBridges = function () {
		return bridges;
	};

	this.getPhoneNumbersByNumberId = function () {
		return phoneNumbersByNumberId;
	};

	this.getPhoneNumbersByNumberString = function () {
		return phoneNumbersByNumberString;
	};

	this.getSelf = function () {
		return self;
	};

	this.reset = function () {
		calls = {};
		applications = {};
		phoneNumbersByNumberId = {};
		phoneNumbersByNumberString = {};
		bridges = {};
		winston.log("info", "Reseting Catapult Objects");
		return true;
	};

	this.resetCalls = function () {
		winston.log("info", "Reseting Catapult Call Objects");
		calls = {};
	};
}

Catapult.prototype.newApplication = function (applicationConfig) {
	var application = new Application(applicationConfig);
	this.addApplication(application);
	return application;
};

Catapult.prototype.newPhoneNumber = function (numberConfig) {
	var number = new PhoneNumber(numberConfig);
	this.addPhoneNumber(number);
	return number;
};

Catapult.prototype.newCall = function (parms) {
	var call = new Call(parms);
	this.addCall(call);
	return call;
};

Catapult.prototype.getCallObjectFromCallId = function (callId) {
	var calls = this.getCalls();
	return calls[callId];
};

/**
* Creates a bridge object
* @constructor
* @param {Object} parms - parms to configure call
*	@type String bridgeAudio - optional bridgeAudio, some reason stored boolean in string
*	@type callIds - optional list of callIds to bridge ["{callId1}","{callId2}"]
**/
Catapult.prototype.newBridge = function (parms) {
	var bridgeConfig = parms;
	var bridgeCalls = [];
	var self = this; //need to keep dat scope!
	var hasCallIds = (typeof bridgeConfig.callIds === "object");
	if (hasCallIds) {
		bridgeConfig.callIds.forEach(function (callId) {
			bridgeCalls.push(self.getCallObjectFromCallId(callId));
		});
		delete bridgeConfig.callIds; //We will push the calls later!
	}
	var bridge = new Bridge(bridgeConfig);
	if (hasCallIds){
		bridge.activateBridge(); //Correct the bridge status
		bridgeCalls.forEach(function (call) {
			bridge.addCall(call);
		});
	}
	this.addBridge(bridge);
	return bridge;
};

module.exports = Catapult;
