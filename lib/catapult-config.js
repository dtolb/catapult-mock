var config = module.exports = {};

config.callbackPayloads = {
	incomingcall : {
		callState : "active",
		eventType : "incomingcall"
	},
	answer       : {
		callState : "active",
		eventType : "answer"
	},
	rejected     : {
		callState : "complete",
		eventType : "hangup",
		cause     : "CALL_REJECTED"
	},
	hangup       : {
		callState : "complete",
		eventType : "hangup",
		cause     : "NORMAL_CLEARING"
	}
};

config.catapult = {
	apiProtocol : "http",
	apiHost     : process.env.CATAPULT_API_HOST,
	apiPort     : process.env.CATAPULT_API_PORT,
	userId      : process.env.CATAPULT_API_USER,
	userToken   : process.env.CATAPULT_API_TOKEN,
	userSecret  : process.env.CATAPULT_API_SECRET,
	numberPrice : "0.60"
};

config.catapult.Uri =  config.catapult.apiProtocol + "://" + config.catapult.apiHost +
	":" + config.catapult.apiPort;

config.catapult.userPath = "/v1/users/" + config.catapult.userId;

config.catapult.userApi = config.catapult.Uri + config.catapult.userPath;

// Logging
config.log = {
	consoleLevel    : process.env.CONSOLE_LEVEL || "error",
	consoleColorize : true,
	fileLevel       : "silly"
};

// Catapult options
config.catapultMedia = {
	defaultParkedMsg    : "default_parked_msg.mp3",
	defaultVoicemailMsg : "default_voicemail_msg.mp3",
	ring                : "ring.mp3",
	brandedRing         : "branded_ring.mp3",
	beep                : "beep.mp3",
};

config.catapultEvents = {
	answer          : "answer",
	dtmf            : "dtmf", // Should be used as dtmf#X where X is the di           git pressed
	dtmf1           : "dtmf$1",
	dtmf2           : "dtmf$2",
	dtmf3           : "dtmf$3",
	dtmf4           : "dtmf$4",
	dtmf5           : "dtmf$5",
	dtmf6           : "dtmf$6",
	dtmf7           : "dtmf$7",
	dtmf8           : "dtmf$8",
	dtmf9           : "dtmf$9",
	dtmf0           : "dtmf$0",
	dtmfP           : "dtmf$#",
	dtmfS           : "dtmf$*",
	error           : "error",
	gather          : "gather",
	gatherStarted   : "gather#started",
	gatherDone      : "gather#completed",
	hangup          : "hangup",
	incomingcall    : "incomingcall",
	playback        : "playback", // Should not be used
	playbackStarted : "playback#started",
	playbackDone    : "playback#done",
	recording       : "recording",
	recordingDone   : "recording#complete",
	recordingError  : "recording#error",
	speak           : "speak", // Should not be used
	speakStarted    : "speak#started",
	speakDone       : "speak#done",
	sms             : "sms"
};

config.mediaBodies = {
	ring        : {
		fileUrl     : config.catapult.userApi + "/media/" + config.catapultMedia.ring,
		loopEnabled : "true"
	},
	brandedRing : {
		fileUrl     : config.catapult.userApi + "/media/" + config.catapultMedia.brandedRing,
		loopEnabled : "true"
	},
	stop        : {
		fileUrl : ""
	}
};