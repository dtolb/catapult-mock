var winston = require("winston");

// Custom modules
var config = require("./catapult-config");
var utils = require("./catapult-utils");

var callwatcher = function (call, bridge) {
	var callId = call.getId();
	var b = bridge;
	call.on(callId, function (state) {
		b.processCallStateChange(state);
	});
};

/**
* Creates a bridge object
* @constructor
* @param {Object} parms - parms to configure call
*	@type String bridgeAudio - optional bridgeAudio, some reason stored boolean in string
**/
exports.Bridge = function (bridgeConfig) {
	winston.log("silly", "Creating New Bridge");
	var data;
	var hasConfigs = (typeof bridgeConfig !== "undefined" && bridgeConfig);
	var noBridgeId = (typeof bridgeConfig.id === "undefined");
	if (hasConfigs) {
		data = bridgeConfig;
	}
	else {
		data = {};
	}
	data.callIds = [];
	var calls = [];
	if (noBridgeId){
		data.id = utils.generateId("brg-");
	}
	data.calls = config.catapult.userApi + "/bridges/" + data.id + "/calls";
	data.createdTime = utils.getTime();
	data.state = "";
	var self = this;
//	var bridgePath = "/bridges/" + data.id;
	var ended = false;
	var activated = false;

	function changeState (state) {
		data.state = state;
	}

	this.getLocation = function () {
		return config.catapult.userPath + "/bridges/" + data.id;
	};

	this.getId = function () {
		return data.id;
	};

	this.getCalls = function () {
		return calls;
	};

	this.addCall = function (call) {
		var callId = call.getId();
		data.callIds.push(callId);
		calls.push(call);
		callwatcher(call, self);
	};

	this.getData = function () {
		return data;
	};

	this.getStatus = function () {
		return data.state;
	};

	function createBridge () {
		if (ended || activated) {
			winston.log("warn", "Unable to re-create ended or activated bridge. Bridge Id: " + data.id);
			return;
		}
		changeState("created");
	}

	this.activateBridge = function () {
		if (ended || activated) {
			winston.log("warn", "Unable to re-activate ended or activated bridge. Bridge Id: " + data.id);
			return;
		}
		activated = true;
		changeState("active");
	};

	this.completeBridge = function () {
		if (ended){
			winston.log("warn", "Unable to re-end ended bridge. Bridge Id: " + data.id);
			return;
		}
		var anyCallsStillActive = false;
		calls.forEach(function (call) {
			if (call.isActive()){
				anyCallsStillActive = true;
			}
		});
		if (anyCallsStillActive) {
			winston.log("debug", "Some calls in bridge: " + data.id + " are still active" +
				"bridge is still active");
		}
		else {
			data.completedTime = utils.getTime();
			changeState("completed");
		}
		return;
	};

	this.processCallStateChange = function (state) {
		var activate = (state === "active");
		var complete = (state === "completed");

		if (activate) {
			if (activated) {
				winston.log("verbose", "Bridge: " + data.id + " is already active");
			}
			else {
				this.activateBridge();
			}
		}
		if (complete){
			if (ended) {
				winston.log("verbose", "Bridge: " + data.id + " is already completed");
			}
			else {
				this.completeBridge();
			}
		}
	};

	createBridge();
};