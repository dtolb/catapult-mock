var winston = require("winston");
var config = require("./catapult-config");
var utils = require("./catapult-utils");

/**
 * Creates an application object
 * @constructor
 * @param {Object} parms - parms to configure call. The following are expected/allowed
 *    @type String name - required name of the app
 *    @type String incomingCallUrl - optional sms callback url
 *    @type String incomingSmsUrl - optional sms callback url
 *    @type String incomingCallUrlCallbackTimeout    - optional timeout in milliseconds
 *    @type String incomingCallFallbackUrl    - optional fallback callback url
 *    @type String incomingSmsUrlCallbackTimeout    - optional timeout in milliseconds
 *    @type String incomingSmsFallbackUrl    - optional fallback callback url
 *    @type String callbackHttpMethod    - optional Method change, default is POST
 *    @type boolean autoAnswer    - optional boolean, default is true
 **/
exports.Application = function (applicationConfig) {
	winston.log("silly", "Creating new application");
	var data = applicationConfig;
	data.id = utils.generateId("a-");
	var useDefaultAutoAnswer = (typeof applicationConfig.autoAnswer === "undefined");
	var useDefaultHttpMethod = (typeof applicationConfig.callbackHttpMethod === "undefined");
	if (useDefaultAutoAnswer) {
		data.autoAnswer = true;
		winston.log("debug", "Setting AutoAnswer to default: True");
	}
	if (useDefaultHttpMethod) {
		data.callbackHttpMethod = "POST";
		winston.log("debug", "Setting Http Method to default: 'POST'");
	}

	this.getIncomingCallUrl = function () {
		return data.incomingCallUrl;
	};

	this.getIncomingSmsUrl = function () {
		return data.incomingSmsUrl;
	};

	this.getId = function () {
		return data.id;
	};

	this.hasCallCallback = function () {
		return (typeof data.incomingCallUrl !== "undefined" && data.incomingCallUrl);
	};

	this.hasSmsCallback = function () {
		return (typeof data.incomingSmsUrl !== "undefined" && data.incomingSmsUrl);
	};

	this.autoAnswer = function () {
		return data.autoAnswer;
	};

	this.getLocation = function () {
		return config.catapult.userPath + "/applications/" + data.id;
	};

	this.getData = function () {
		return data;
	};

};