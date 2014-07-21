var request = require("request");
var config  = require("./catapult-config");
var winston = require("winston");

var utils   = module.exports = {};

utils.getTime = function () {
	var date = new Date();
	return date.toISOString();
};

utils.generateId = function (preFix) {
	var result = "";
	var chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
	var length = 23;
	for (var i = 0; i < length; i += 1) {
		result += chars[Math.round(Math.random() * (chars.length - 1))];
	}
	return preFix + result;
};

utils.removeRingToUrl = function (Url) {
	var ringtoUrl = "https://api-proxy-prod.ring.to";
	return Url.replace(ringtoUrl,"");
};

/**
 * Creates a callback payload
 * @param {Object} callbackVars - parms to configure call
 *	@type String eventType - required "eventType"
 *	@type String callState - requried "callState"
 *	@type String cause - optional "cause"
 *@return String returns JSON.stringify for the callback
 **/
utils.buildCallbackEvent = function (eventType, callbackPayload) {
	winston.log("silly", "Creating Callback event: " + eventType);
	var payload = callbackPayload;
	for (var key in config.callbackPayloads[eventType]){
		payload[key] = config.callbackPayloads[eventType][key];
	}
	payload.time = utils.getTime();
	winston.log("debug", "Callback payload : " + JSON.stringify(payload));
	return payload;
};

utils.buildAudioPlaybackEvent = function (status, callId, tag) {
	winston.log("debug", "Creating Audo File Playback Event: " + status);
	var payload = {
		eventType : "Playback",
		callId    : callId,
		tag       : tag,
		status    : status,
		callUri   : config.catapult.userApi + "/calls/" + callId
	};
	payload.time = utils.getTime();
	winston.log("debug", "Callback payload : " + JSON.stringify(payload));
	return payload;
};

utils.sendCallbackEvent = function (callbackUrl, payload) {
	function requestHandler (error, response, body) {
		if (error) {
			winston.log("verbose", "Error when sending callback");
		}
		else {
			winston.log("silly", "Callback response: " + response);
			winston.log("silly", "Callback body: " + body);
		}
	}
	winston.log("debug", "Sending callback to: " + callbackUrl);
	winston.log("debug", "	payload: " + JSON.stringify(payload));
	var postRequest = {
		uri    : callbackUrl,
		method : "POST",
		json   : payload
	};
	request(postRequest, requestHandler);
};

utils.getCallCallbackUrlFromAppId = function (appId, catapult) {
	var applications = catapult.getApplications();
	var callbackUrl = applications[appId].getIncomingCallUrl();
	return callbackUrl;
};

utils.getSmsCallbackUrlFromAppId = function (appId, catapult) {
	var applications = catapult.getApplications();
	var callback = applications[appId].getIncomingSmsUrl();
	return callback;
};

/**
* Generates a random "valid" phone number for testing
* @param  String countryCode - optional country code for phone number (defaults to "+1")
* @returns String phoneNumber - phone number
**/
utils.generateNumber = function (countryCode) {
	var noCountryCode = (typeof countryCode === "undefined");
	var cc = "";
	if (noCountryCode){
		cc = "+1";
	}
	else {
		cc = countryCode;
	}
	var areas = [ "203", "308", "316", "423", "442", "503", "508", "510", "516", "803", "816", "903", "908", "916" ];
	var area = areas[Math.floor(Math.random() * areas.length)];
	return cc + area + (Math.floor(Math.random() * (9999999 - 2111111 + 1)) + 2111111).toString();
};

utils.getUserApi = function () {
	return config.catapult.apiProtocol + "://" + config.catapult.apiHost +
		"/" + config.catapult.userId;
};

utils.getNatNumber = function (number) {
	var natNumber = number.replace("+1","(");
	natNumber = natNumber.substring(0,4) + ") " + natNumber.substring(4,7) + "-" +
		natNumber.substring(7, natNumber.length);
	return natNumber;
};