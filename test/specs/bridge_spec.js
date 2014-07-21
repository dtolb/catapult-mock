var supertest  = require("supertest-as-promised");
var expect     = require("chai").expect;
var app        = require("../../catapult-app.js");
var config     = require("../../lib/catapult-config");
var uri        = config.catapult.userPath;

describe("Catapult Mock Bridge API", function () {
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

	var bridgeId;
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

	var bridgeConfig = {
		bridgeAudio : "true"
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

	it("creates a new inbound call with auto answer", function (done) {
		supertest(app)
		.post(uri + "/calls")
		.send(inboundCallConfig)
		.expect(201)
		.end(function (e, res) {
			expect(e).to.be.null;
			expect(res.header.location).not.to.be.null;
			inboundCallId = res.header.location.substr(res.header.location.length - 25);
			expect(inboundCallId).to.match(/^c-/);
			bridgeConfig.callIds = [ inboundCallId ];
			done();
		});
	});

	it("creates a new outbound call with callback url", function (done) {
		supertest(app)
		.post(uri + "/calls")
		.send(outboundCallConfig)
		.expect(201)
		.end(function (e, res) {
			expect(e).to.be.null;
			expect(res.header.location).not.to.be.null;
			outboundCallId = res.header.location.substr(res.header.location.length - 25);
			expect(outboundCallId).to.match(/^c-/);
			bridgeConfig.callIds.push(outboundCallId);
			done();
		});
	});

	it("answers a outbound call with callback url", function (done) {
		supertest(app)
		.post(uri + "/calls/" + outboundCallId)
		.send(answer)
		.expect(200)
		.end(function (e, res) {
			expect(e).to.be.null;
			expect(res).not.to.be.null;
			done();
		});
	});

	it("creates a bridge with the two calls", function (done) {
		supertest(app)
		.post(uri + "/bridges")
		.send(bridgeConfig)
		.expect(201)
		.end(function (e, res) {
			expect(e).to.be.null;
			expect(res).not.to.be.null;
			expect(res.header.location).not.to.be.null;
			bridgeId = res.header.location.substr(res.header.location.length - 27);
			expect(bridgeId).to.match(/^brg-/);
			done();
		});
	});

	it("gets info for created bridge", function (done) {
		supertest(app)
		.get(uri + "/bridges/" + bridgeId)
		.expect(200)
		.send()
		.end(function (e, res) {
			expect(e).to.be.null;
			expect(res.body).not.to.be.null;
			expect(res.body.id).to.equal(bridgeId);
			expect(res.body.state).to.equal("active");
			expect(res.body.callIds).to.have.length(2);
			done();
		});
	});

	it("hangs up the outbound call", function (done) {
		supertest(app)
		.post(uri + "/calls/" + outboundCallId)
		.send(hangup)
		.expect(200)
		.end(function (e, res) {
			expect(e).to.be.null;
			expect(res).not.to.be.null;
			done();
		});
	});

	it("gets info for created bridge after a single call hangsup", function (done) {
		supertest(app)
		.get(uri + "/bridges/" + bridgeId)
		.expect(200)
		.send()
		.end(function (e, res) {
			expect(e).to.be.null;
			expect(res.body).not.to.be.null;
			expect(res.body.id).to.equal(bridgeId);
			expect(res.body.state).to.equal("active");
			expect(res.body.callIds).to.have.length(2);
			done();
		});
	});

	it("hangs up the inbound call", function (done) {
		supertest(app)
		.post(uri + "/calls/" + inboundCallId)
		.send(hangup)
		.expect(200)
		.end(function (e, res) {
			expect(e).to.be.null;
			expect(res).not.to.be.null;
			done();
		});
	});

	it("gets info for created bridge after a both calls hangup", function (done) {
		supertest(app)
		.get(uri + "/bridges/" + bridgeId)
		.expect(200)
		.send()
		.end(function (e, res) {
			expect(e).to.be.null;
			expect(res.body).not.to.be.null;
			expect(res.body.id).to.equal(bridgeId);
			expect(res.body.state).to.equal("completed");
			expect(res.body.callIds).to.have.length(2);
			done();
		});
	});
});
