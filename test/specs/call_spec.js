var supertest  = require("supertest-as-promised");
var expect     = require("chai").expect;
var nock       = require("nock");
var app        = require("../../catapult-app.js");
var config     = require("../../lib/catapult-config");
var uri        = config.catapult.userPath;

describe("Catapult Mock Call API", function () {
	before (function (done) {
		supertest(app)
		.post(uri + "/reset")
		.expect(200)
		.end(function (e, res) {
			expect(e).to.be.null;
			expect(res.body).to.be.empty;
			done();
		});
	});

	var inboundCallId;
	var outboundCallId;
	var inboundCallConfig = {
		from      : "+19195555555",
		to        : "+19191111111",
		direction : "in"
	};
	var outboundCallConfig = {
		to          : "+19192222222",
		from        : "+19191111111",
		callbackUrl : "https://mysite.com/call/hahahahaha",
		tag         : "1233"
	};

	var mediaPlayback = {
		fileUrl : "blah.mp3",
		tag     : "x0x0x0x0x0x0x0x0x0"
	};

	var stopPlayback = {
		fileUrl : ""
	};

	var answer = {
		state : "active"
	};

	var hangup = {
		state : "completed"
	};

	before (function (done) {
		var applicationPOST = {
			name            : "Jailbreak App",
			incomingCallUrl : "https://mysite.com/call/lalalalallala",
			incomingSmsUrl  : "https://mysite.com/sms/lalalalallala"
		};

		var phoneNumberConfig = {
			number : "+19191111111",
			name   : "Test Number #1"
		};

		supertest(app)
		.post(uri + "/applications")
		.send(applicationPOST)
		.expect(201)
		.then(function (res) {
			expect(res.header.location).not.to.be.null;
			var appId = res.header.location.substr(res.header.location.length - 25);
			expect(appId).to.match(/^a-/);
			phoneNumberConfig.applicationId = appId;
			supertest(app)
			.post(uri + "/phoneNumbers")
			.expect(201)
			.send(phoneNumberConfig)
			.end(function (e, res) {
				expect(e).to.be.null;
				expect(res.header.location).not.to.be.null;
				var phoneNumberId = res.header.location.substr(res.header.location.length - 25);
				expect(phoneNumberId).to.match(/^n-/);
				done();
			});
		});

	});

	describe ("inbound calls", function () {

		describe ("Auto Answer Verification", function () {
			it("creates a new inbound call with auto answer", function (done) {
				var isIncomingCallEvent;
				var isAnswerEvent;
				supertest(app)
				.post(uri + "/calls")
				.send(inboundCallConfig)
				.expect(201)
				.end(function (e, res) {
					expect(e).to.be.null;
					expect(res.header.location).not.to.be.null;
					var callId = res.header.location.substr(res.header.location.length - 25);
					expect(callId).to.match(/^c-/);
				});

				nock("https://mysite.com")
				.filteringRequestBody(function () {
					return "*";
				})
				.post("/call/lalalalallala", "*")
				.times(2)
				.reply(200, function (url, b) {
					var body = JSON.parse(b);
					var eventType = body.eventType;
					isIncomingCallEvent = (eventType === "incomingcall");
					isAnswerEvent = (eventType === "answer");
					expect(body.to).to.equal(inboundCallConfig.to);
					expect(body.from).to.equal(inboundCallConfig.from);
					expect(body.callState).to.equal("active");
					expect(body.callId).to.match(/^c-/);
					if (isIncomingCallEvent){
						expect(body.eventType).to.equal("incomingcall");
					}
					if (isAnswerEvent) {
						expect(body.eventType).to.equal("answer");
						done();
					}
				});
			});
		});

		describe ("Call Information Retrival and Manipulation", function () {
			before(function (done) {
				supertest(app)
				.post(uri + "/calls")
				.send(inboundCallConfig)
				.expect(201)
				.end(function (e, res) {
					inboundCallId = res.header.location.substr(res.header.location.length - 25);
					done();
				});
			});

			it("gets info for inbound call", function (done) {
				supertest(app)
				.get(uri + "/calls/" + inboundCallId)
				.expect(200)
				.send()
				.end(function (e, res) {
					expect(e).to.be.null;
					expect(res.body).not.to.be.null;
					expect(res.body.to).to.equal(inboundCallConfig.to);
					expect(res.body.from).to.equal(inboundCallConfig.from);
					expect(res.body.direction).to.equal(inboundCallConfig.direction);
					expect(res.body.to).to.equal(inboundCallConfig.to);
					expect(res.body.state).to.equal("active");
					done();
				});

			});

			it("plays and stops media in the inbound call that has callbacks", function (done) {
				nock("https://mysite.com")
				.filteringRequestBody(function () {
					return "*";
				})
				.post("/call/lalalalallala", "*")
				.reply(200, function (url, b) {
					var body = JSON.parse(b);
					expect(body.eventType).to.equal("Playback");
					expect(body.status).to.equal("started");
					expect(body.callId).to.equal(inboundCallId);
					expect(body.tag).to.equal(mediaPlayback.tag);

					nock("https://mysite.com")
					.filteringRequestBody(function () {
						return "*";
					})
					.post("/call/lalalalallala", "*")
					.reply(200, function (url, b) {
						var body = JSON.parse(b);
						expect(body.eventType).to.equal("Playback");
						expect(body.status).to.equal("done");
						expect(body.callId).to.equal(inboundCallId);
						expect(body.tag).to.equal(mediaPlayback.tag);
						done();
					});

					supertest(app)
					.post(uri + "/calls/" + inboundCallId + "/audio")
					.expect(200)
					.send(stopPlayback)
					.end(function (e, res) {
						expect(e).to.be.null;
						expect(res).not.to.be.null;
					});
				});
				supertest(app)
				.post(uri + "/calls/" + inboundCallId + "/audio")
				.expect(200)
				.send(mediaPlayback)
				.end(function (e, res) {
					expect(e).to.be.null;
					expect(res).not.to.be.null;
				});
			});
		});
	});

	describe ("outbound calls", function () {

		describe("outbound call creation", function () {
			it("creates a new outbound call with callback url", function (done) {
				supertest(app)
				.post(uri + "/calls")
				.send(outboundCallConfig)
				.expect(201)
				.end(function (e, res) {
					expect(e).to.be.null;
					expect(res.header.location).not.to.be.null;
					var callId = res.header.location.substr(res.header.location.length - 25);
					expect(callId).to.match(/^c-/);
					done();
				});
			});
		});

		describe ("Call Information Retrival and Manipulation", function () {

			before ("creates a new outbound call with callback url", function (done) {
				supertest(app)
				.post(uri + "/calls")
				.send(outboundCallConfig)
				.expect(201)
				.end(function (e, res) {
					outboundCallId = res.header.location.substr(res.header.location.length - 25);
					done();
				});
			});

			before("enables quick media playback", function (done) {
				var callControl = {
					autoEndMediaPlayback : true
				};
				supertest(app)
				.post(uri + "/control/calls")
				.send(callControl)
				.expect(200)
				.end(function (e, res) {
					expect(e).to.be.null;
					expect(res).to.not.be.null;
					done();
				});
			});

			it("gets info for outbound call", function (done) {
				supertest(app)
				.get(uri + "/calls/" + outboundCallId)
				.expect(200)
				.send()
				.end(function (e, res) {
					expect(e).to.be.null;
					expect(res.body).not.to.be.null;
					expect(res.body.to).to.equal(outboundCallConfig.to);
					expect(res.body.from).to.equal(outboundCallConfig.from);
					expect(res.body.direction).to.equal(outboundCallConfig.direction);
					expect(res.body.to).to.equal(outboundCallConfig.to);
					expect(res.body.state).to.equal("started");
					done();
				});

			});

			it("answers a outbound call with callback url", function (done) {
				var scope = nock("https://mysite.com")
				.filteringRequestBody(function () {
					return "*";
				})
				.post("/call/hahahahaha", "*")
				.reply(200, function (uri, b) {
					var body = JSON.parse(b);
					expect(body.eventType).to.equal("answer");
					expect(body.to).to.equal(outboundCallConfig.to);
					expect(body.from).to.equal(outboundCallConfig.from);
					expect(body.callState).to.equal("active");
					expect(body.callId).to.equal(outboundCallId);
					done();
				});

				supertest(app)
				.post(uri + "/calls/" + outboundCallId)
				.send(answer)
				.expect(200)
				.end(function (e, res) {
					expect(e).to.be.null;
					expect(res).not.to.be.null;
				});

				scope.isDone();
			});

			it("checks to see if auto-end playback is enabled", function (done) {
				supertest(app)
				.get(uri + "/control/calls")
				.expect(200)
				.end(function (e, res) {
					expect(e).to.be.null;
					expect(res).not.to.be.null;
					expect(res.body.autoEndMediaPlayback).to.be.true;
					done();
				});
			});

			it("plays back audio with auto end", function (done) {
				nock("https://mysite.com")
				.filteringRequestBody(function () {
					return "*";
				})
				.post("/call/hahahahaha", "*")
				.times(2)
				.reply(200, function (uri, b) {
					var body = JSON.parse(b);
					expect(body.eventType).to.equal("Playback");
					var status = body.status;
					if (status === "done") {
						expect(body.status).to.equal("done");
						done();
					}
					expect(body.callId).to.equal(outboundCallId);
					expect(body.tag).to.equal(mediaPlayback.tag);
				});
				supertest(app)
				.post(uri + "/calls/" + outboundCallId + "/audio")
				.expect(200)
				.send(mediaPlayback)
				.end(function (e, res) {
					expect(e).to.be.null;
					expect(res).not.to.be.null;
				});
			});

			it("hangs up a outbound call with callback url", function (done) {
				var scope = nock("https://mysite.com")
				.filteringRequestBody(function () {
					return "*";
				})
				.post("/call/hahahahaha", "*")
				.reply(200, function (uri, b) {
					var body = JSON.parse(b);
					expect(body.to).to.equal(outboundCallConfig.to);
					expect(body.from).to.equal(outboundCallConfig.from);
					expect(body.cause).to.equal("NORMAL_CLEARING");
					expect(body.callId).to.equal(outboundCallId);
					expect(body.eventType).to.equal("hangup");
					done();
				});
				supertest(app)
				.post(uri + "/calls/" + outboundCallId)
				.send(hangup)
				.expect(200)
				.end(function (e, res) {
					expect(e).to.be.null;
					expect(res).not.to.be.null;
				});

				scope.isDone();
			});
		});
	});
});
