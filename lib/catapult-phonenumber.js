var winston = require("winston");
var Call = require("./catapult-call");

// Custom modules
var config = require("./catapult-config");
var utils = require("./catapult-utils");

/**
* Creates a phoneNumber object
* @constructor
* @param {Object} numberConfig - parms to configure call
*	@type String number - required phonenumber, must be in E164 format
*	@type String applicationId - optional application to associate with number
*	@type String name - optional name for phoneNumber
*	@type String fallbackNumber - optional fallback numbers
**/
exports.PhoneNumber = function (numberConfig) {
	winston.log("silly", "Creating PhoneNumber");
	var data = numberConfig;
	var hasAppId = (typeof numberConfig.applicationId !== "undefined" && numberConfig.applicationId);
	winston.log("silly", "PhoneNumber appid : " + hasAppId);
	if (hasAppId) {
		var appId = numberConfig.applicationId;
		data.application = config.catapult.userApi + "/applications/" + appId;
	}
	data.id = utils.generateId("n-");
	data.createdTime = utils.getTime();
	data.numberState = "enabled";
	data.state = "NC";
	data.price = config.catapult.numberPrice;

	data.nationalNumber = utils.getNatNumber(data.number);

	this.getId = function () {
		return data.id;
	};

	this.getData = function () {
		return data;
	};

	this.getLocation = function () {
		return config.catapult.userPath + "/phoneNumbers/" + data.id;
	};

	this.getNumber = function () {
		return data.number;
	};

	this.getApplicationId = function () {
		return appId;
	};

	/** Creates a call object based on the phone number
	*	If an express app is not passed, expect weird behaviour when changing call state
	* @param {Object} parms - required fields to make the number
	*	@type String - from - required. the origination number
	*	@type String - callbackUrl - required. The address to send events
	* @param {Object} app - optional express app to send callbacks for the call
	**/
	this.createCallToThisNumber = function (parms) {
		if (hasAppId === false) {
			winston.log("warn", "Can't create incoming call to number without application");
			return;
		}
		var callParms = parms;
		callParms.direction = "i";
		callParms.to = data.number;
		var call = new Call(callParms);
		return call;
	};
};
