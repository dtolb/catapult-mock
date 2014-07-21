var winston      = require("winston");
var moment       = require("moment");
var events       = require("events");
var util         = require("util");
var EventEmitter = require("events").EventEmitter;

// Custom modules
var config = require("./catapult-config");
var utils = require("./catapult-utils");

/**
* Creates a call object.
* 7/2/14 - Nock is used to create outbound calls for RingTo Testing, if a callId is passed
* as part of the parms value, it assumes it was created by nock and sets the nockCreated
* boolean to true. This determines what values to include or exclude when working with
* callbacks. If this is extended beyond ringto use, probably need to change this logic.
* --------
* The call also emits status changed based on the callId, I originally thought that bridges
* would consume all of the call statuses and end them within catapult, but it appears as if
* that ringTo posts to end remaining calls
* --------
* @constructor
* @param {Object} parms - parms to configure call
*	@type String from - required 'from'
*	@type String to - requried 'to'
*	@type String callbackUrl - optional callbackUrl
*	@type String bridgeId - optional bridgeId
*	@type String tag - optional tag
*	@type boolean recordingEnabled - optional flag for recordingEnabled
*	@type String id - Optional if callID is already passed, don't make another!
* @param {Object} expressApp - pointer to the express App undertest
**/
function Call (parms) {
	events.EventEmitter.call(this); //Emits change in status
	var data = parms;
	data.id = utils.generateId("c-");
	var mediaTag;
	winston.log("silly", "Creating New Call Object");
	data.startTime = utils.getTime();
	var callPath = "/calls/" + data.id;
//	var location = config.catapult.userPath + callPath;
	data.events = config.catapult.userApi + callPath + "/events";
	data.callUri = config.catapult.userApi + callPath;
	var recordingEnabled = false;
	var ended = false;
	var isOutboundCall = (data.direction === "undefined");
	var isInboundCall = (data.direction === "in");
	var activated = false;
	var callbackEnabled = false;
	var callEvents = [];
	var payloadData = {
		from    : data.from,
		to      : data.to,
		callUri : data.callUri,
		callId  : data.id
	};
	var hasCallbackUrl = (typeof data.callbackUrl !== "undefined" && data.callbackUrl);
	if (hasCallbackUrl){
		callbackEnabled = true;
		winston.log("debug", "Callbacks Enabled for Call: " + data.id);
	}
	if (isOutboundCall){
		data.direction = "out";
	}
	var self = this;

	function addEvent (Event) {
		callEvents.push(Event);
	}

	function enableRecording () {
		recordingEnabled = true;
	}

	function disableRecording () {
		recordingEnabled = false;
	}

	function setMediaTag (tag) {
		winston.log("debug", "Setting mediaTag: " + tag + " for call: " + data.id);
		mediaTag = tag;
	}

	function startMediaPlayback () {
		winston.log("debug", "Starting Media playback");
		var playbackEvent = utils.buildAudioPlaybackEvent("started", data.id, mediaTag);
		var eventToAdd = {
			name : "playback started",
			time : utils.getTime()
		};
		addEvent(eventToAdd);
		return utils.sendCallbackEvent(data.callbackUrl, playbackEvent);
	}

	function endMediaPlayback () {
		winston.log("debug", "Ending Media playback");
		var playbackEvent = utils.buildAudioPlaybackEvent("done", data.id, mediaTag);
		var eventToAdd = {
			name : "playback stopped",
			time : utils.getTime()
		};
		addEvent(eventToAdd);
		return utils.sendCallbackEvent(data.callbackUrl, playbackEvent);
	}

	function setEndTime () {
		data.endTime = utils.getTime();
	}

	function setActiveTime () {
		data.activeTime = utils.getTime();
	}

	this.getLocation = function () {
		return config.catapult.userPath + "/calls/" + data.id;
	};

	this.setCallbackUrl = function (callbackUrl) {
		winston.log("debug", "Setting callback url for call: " + data.id + " to: " + callbackUrl);
		data.callbackUrl = callbackUrl;
		callbackEnabled = true;
	};

	this.getData = function () {
		return data;
	};

	this.getId = function () {
		return data.id;
	};

	this.getJSONGetPayload = function () {
		return JSON.stringify(data);
	};

	this.getEvents = function () {
		return callEvents;
	};

	this.getMediaTag = function () {
		return mediaTag;
	};

	this.getStatus = function () {
		return data.state;
	};

	this.isActive = function () {
		return (data.state === "active");
	};

	this.getCallPath = function () {
		return callPath;
	};

	this.setChargeableDuration = function (overRideValue) {
		winston.log("silly", "Calculating chargeable duration");
		var hasOverRideValue = (typeof overRideValue !== "undefined" && overRideValue);
		if (hasOverRideValue) {
			data.chargeableDuration = overRideValue;
			winston.log("debug", "Manually setting call duration for callid: " +
				data.id + " to: " + overRideValue);
		}
		else {
			var activeTime = moment(data.activeTime);
			var endTime = moment(data.endTime);
			var secondsDiff = endTime.diff(activeTime, "seconds");
			data.chargeableDuration = secondsDiff;
			winston.log("debug", "Call duration for callid: " + data.id + "is: " +
				secondsDiff);
		}
	};

	function changeState (state, callbackPayload) {
		var hasCallbackPayload = (typeof callbackPayload !== "undefined" && callbackPayload); //now local var
		var hasTag = (typeof data.tag !== "undefined" && data.tag);
		winston.log("debug", "Changing state to: " + state + " for call: " + data.id);
		data.state = state;
		var eventToAdd = {
			state : state,
			time  : utils.getTime()
		};
		addEvent(eventToAdd);
		self.emit(data.id, state);
		if (hasCallbackPayload && callbackEnabled){
			winston.log("silly", "Submitting Callback to be sent");
			if (hasTag) {
				callbackPayload.tag = data.tag;//need to add the tag field for outbound calls
			}
			return utils.sendCallbackEvent(data.callbackUrl, callbackPayload);
		}
	}

	this.start = function () {
		var callbackPayload;
		if (ended || activated){
			winston.log("warn", "Unable to start an ended or activated call. Call id:" + data.id);
			return;
		}
		winston.log("debug", "Starting Call. Call id: " + data.id);
		if (isInboundCall) {
			callbackPayload = utils.buildCallbackEvent("incomingcall",payloadData);
		}
		return changeState("started", callbackPayload);
	};

	this.answer = function () {
		if (ended || activated){
			winston.log("warn", "Unable to activate an ended or activated call. Call id:" + data.id);
			return;
		}
		winston.log("debug", "Answering Call. Call id: " + data.id);
		var callbackPayload = utils.buildCallbackEvent("answer",payloadData);
		activated = true;
		setActiveTime();
		return changeState("active", callbackPayload);
	};

	this.reject = function () {
		if (ended){
			winston.log("warn", "Unable to reject an ended call. Call id: " + data.id);
			return;
		}
		winston.log("debug", "Rejecting Call. Call id: " + data.id);
		changeState("rejected");
		ended = true;
		setEndTime();
		var callbackPayload = utils.buildCallbackEvent("rejected",payloadData);
		this.setChargeableDuration(0);
		return changeState("completed", callbackPayload);
	};

	this.hangup = function () {
		if (ended){
			winston.log("warn", "Unable to hangup an ended call. Call id: " + data.id);
			return;
		}
		ended = true;
		winston.log("debug", "Hangingup Call. Call id: " + data.id);
		var callbackPayload = utils.buildCallbackEvent("hangup",payloadData);
		setEndTime();
		return changeState("completed", callbackPayload);
	};

	var stateFunctions = {
		completed    : this.hangup,
		active       : this.answer,
		rejected     : this.rejected,
		transferring : this.transferring
	};

	var recordingFucntions = {
		true  : enableRecording,
		false : disableRecording
	};

	this.processPostBody = function (body) {
		var noBody = (typeof body === "undefined");
		var hasState = false;
		var hasRecording = false;
		var isAudioPlayback = false;
		var stopPlayback = false;
		if (noBody) {
			winston.log("debug", "No body send to call");
			return;
		}
		else {
			hasState = (typeof body.state !== "undefined" && body.state);
			hasRecording = (typeof body.recordingEnabled !== "undefined" && body.recordingEnabled);
			isAudioPlayback = (typeof body.fileUrl !== "undefined" && body.fileUrl);
			stopPlayback = (body.fileUrl === "");
		}
		if (hasState) {
			stateFunctions[body.state]();
		}
		if (hasRecording) {
			recordingFucntions[body.recordingEnabled]();
		}
		if (stopPlayback) {
			endMediaPlayback();
		}
		if (isAudioPlayback) {
			var hasTag = (typeof body.tag !== "undefined" && body.tag);
			if (hasTag){
				setMediaTag(body.tag);
			}
			startMediaPlayback();
		}

		return;
	};
}

util.inherits(Call, EventEmitter);
module.exports = Call;