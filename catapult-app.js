var express = require("express");
var bodyParser = require("body-parser");
var winston = require("winston");
var moment = require("moment");
var Q = require("q");

var Catapult = require("./lib/catapult-mock");
var config = require("./lib/catapult-config");

var app = express();
var consoleLogLevel = config.log.consoleLevel;
var port = config.catapult.apiPort;
app.use(bodyParser());

var catapult = new Catapult();

winston.remove(winston.transports.Console)
	.add(winston.transports.Console, {
		level       : consoleLogLevel,
		colorize    : config.log.consoleColorize,
		prettyPrint : true,
		timestamp   : true
	});
winston.add(winston.transports.File, {
	level       : config.log.fileLevel,
	timestamp   : true,
	colorize    : false,
	prettyPrint : true,
	filename    : "catapultMock-" + moment().format("YYYY_MM_DD") + ".log"
});

var callControl = {
	autoAnswerOutBoundCalls : false,
	autoHangupOutBoundCalls : false,
	autoAnswerMS            : 0,
	autoHangupMS            : 0,
	autoEndMediaPlayback    : false
};

function processCallControlBody (body) {
	for (var key in body){
		callControl[key] = body[key];
	}
}

function setupInboundCall (call) {
	winston.log("verbose", "Setting up inbound call!");
	var phoneNumber   = catapult.getPhoneNumbersByNumberString()[call.getData().to];
	var applicationId = phoneNumber.getApplicationId();
	var hasApplicationId = (typeof applicationId !== "undefined" && applicationId);
	if (hasApplicationId) {
		var application = catapult.getApplications()[applicationId];
		if (application.hasCallCallback) {
			call.setCallbackUrl(application.getIncomingCallUrl());
		}
		call.start();
		if (application.autoAnswer()) {
			call.answer();
		}
	}
}

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();// get an instance of the express Router
// middleware to use for all requests
router.use(function (req, res, next) {
	// do logging
	winston.log("silly", "Reqest was made to the Catapult Mock!");
	winston.log("debug", "Request Method: " + req.method);
	winston.log("debug", "Request Url: " + req.url);
	next(); // make sure we go to the next routes and don't stop here
});

//on routes that end in /applications
// ----------------------------------------------------
router.route("/applications")
	.post(function (req, res) {
		var application = catapult.newApplication(req.body);
		res.location(application.getLocation());
		res.send(201);

	})
	.get(function (req, res) {
		var applications = catapult.getApplications();
		var appResponse = [];
		for (var app in applications){
			appResponse.push(applications[app].getData());
		}
		res.send(200, appResponse);
	});

//on routes that end in /applications/:applicationId
// ----------------------------------------------------
router.route("/applications/:applicationId")
	.get(function (req, res) {
		var appId = req.params.applicationId;
		var app = catapult.getApplications()[appId];
		res.send(app.getData());
	});

//on routes that end in /phoneNumbers
// ----------------------------------------------------
router.route("/phoneNumbers")
	.post(function (req, res) {
		var phoneNumber = catapult.newPhoneNumber(req.body);
		res.location(phoneNumber.getLocation());
		res.send(201);
	})
	.get(function (req, res) {
		var phoneNumbers = catapult.getPhoneNumbersByNumberId();
		var phoneNumberRespone = [];
		for (var phoneNumber in phoneNumbers){
			phoneNumberRespone.push(phoneNumbers[phoneNumber].getData());
		}
		res.send(200, phoneNumberRespone);
	});

//on routes that end in /phoneNumbers/:numberId
// ----------------------------------------------------
router.route("/phoneNumbers/:numberId")
	.get(function (req, res) {
		var phoneId = req.params.numberId;
		var phoneNumber = catapult.getPhoneNumbersByNumberId()[phoneId];
		res.send(phoneNumber.getData());
	});

//on routes that end in /calls
// ----------------------------------------------------
router.route("/calls")
	.post(function (req, res) {
		winston.log("debug", "Creating call with body:");
		winston.log("debug", req.body);
		var call = catapult.newCall(req.body);
		res.location(call.getLocation());
		res.send(201);
		var isInboundCall = (call.getData().direction === "in");
		if (isInboundCall) {
			setupInboundCall(call);
		}
		else {
			call.start();
			if (callControl.autoAnswerOutBoundCalls) {
				setTimeout(call.answer, callControl.autoAnswerMS);
			}
			if (callControl.autoHangupOutBoundCalls) {
				setTimeout(call.hangup, callControl.autoAnswerMS +
					callControl.autoHangupMS);
			}
		}
	})
	.get(function (req, res) {
		var calls = catapult.getCalls();
		var callsResponse = [];
		for (var call in calls){
			callsResponse.push(calls[call].getData());
		}
		res.send(200, callsResponse);
	});

//on routes that end in /calls/:callId/:action
// ----------------------------------------------------
router.route("/calls/:callId/:action")
	.post(function (req, res) {
		var action = req.params.action;
		var isAudio = (action === "audio");
		if (isAudio) {
			var callId = req.params.callId;
			var call = catapult.getCalls()[callId];
			call.processPostBody(req.body);
			if (callControl.autoEndMediaPlayback) {
				winston.log("debug", "Auto Ending Media Playback");
				call.processPostBody({ fileUrl : "" });
			}
		}
		res.send(200, "OK");
	});

//on routes that end in /calls/:callId
// ----------------------------------------------------
router.route("/calls/:callId")
	.get(function (req, res) {
		var callId = req.params.callId;
		var call = catapult.getCalls()[callId];
		res.send(call.getData());
	})
	.post(function (req, res) {
		var callId = req.params.callId;
		var call = catapult.getCalls()[callId];
		call.processPostBody(req.body);
		res.send(200, "OK");
	});

//on routes that end in /calls/control/
// ----------------------------------------------------
router.route("/control/calls")
	.post(function (req, res) {
		processCallControlBody(req.body);
		res.send(200);
	})
	.get(function (req, res) {
		res.send(200, callControl);
	});

//on routes that end in /bridges
// ----------------------------------------------------
router.route("/bridges")
	.post(function (req, res) {
		var bridge = catapult.newBridge(req.body);
		res.location(bridge.getLocation());
		res.send(201);
	})
	.get(function (req, res) {
		var bridges = catapult.getBridges();
		var bridgesResponse = [];
		for (var bridge in bridges){
			bridgesResponse.push(bridges[bridge].getData());
		}
		res.send(200, bridgesResponse);
	});

//on routes that end in /bridges/:bridgeId
// ----------------------------------------------------
router.route("/bridges/:bridgeId")
	.get(function (req, res) {
		var bridgeId = req.params.bridgeId;
		var bridge = catapult.getBridges()[bridgeId];
		res.send(bridge.getData());
	})
	.post(function (req, res) {
		var bridgeId = req.params.bridgeId;
		var bridge = catapult.getBridges()[bridgeId];
		bridge.processPostBody(req.body);
		res.send(200, "OK");
	});

router.route("/reset")
	.post(function (req, res) {
		callControl = {
			autoAnswerOutBoundCalls : false,
			autoHangupOutBoundCalls : false,
			autoAnswerMS            : 0,
			autoHangupMS            : 0,
			autoEndMediaPlayback    : false
		};
		Q.fcall(catapult.reset)
		.then(function (finished) {
			if (finished) {
				winston.log("debug", "Finished Resetting Catapult");
				res.send(200);
			}
		});
	});

router.route("/resetCalls")
	.post(function (req, res) {
		catapult.resetCalls();
		res.send(200);
	});
// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with the defined user uri "v1/users/<user_id>"
app.use(config.catapult.userPath, router);
app.listen(port);
winston.log("info", "Catapult Mock running on port: " + port);
winston.log("info", "Catapult Mock using path: " + config.catapult.userPath);

module.exports = app;