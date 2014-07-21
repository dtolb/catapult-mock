var supertest  = require("supertest");
var expect     = require("chai").expect;
var config     = require("../../lib/catapult-config");
var app        = require("../../catapult-app.js");
var uri        = config.catapult.userPath;

describe("Catapult Mock Application API", function () {

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

	var appId;
	var applicationPOST = {
		name            : "Jailbreak App",
		incomingCallUrl : "https://mysite.com/call/lalalalallala",
		incomingSmsUrl  : "https://mysite.com/sms/lalalalallala"
	};
	var appAutoAnswerFalse = {
		name            : "Jailbreak App",
		incomingCallUrl : "https://mysite.com/call/tada",
		incomingSmsUrl  : "https://mysite.com/sms/tada",
		autoAnswer      : false
	};

	it ("creates a new application", function (done) {
		supertest(app)
		.post(uri + "/applications")
		.expect(201)
		.send(applicationPOST)
		.end(function (e, res) {
			expect(e).to.be.null;
			expect(res.header.location).not.to.be.null;
			appId = res.header.location.substr(res.header.location.length - 25);
			expect(appId).to.match(/^a-/);
			done();
		});

	});

	it("gets information for specific application", function (done) {
		supertest(app)
		.get(uri + "/applications/" + appId)
		.expect(200)
		.send()
		.end(function (e, res) {
			expect(e).to.be.null;
			expect(res.body).not.to.be.null;
			expect(res.body.name).to.equal(applicationPOST.name);
			expect(res.body.incomingCallUrl).to.equal(applicationPOST.incomingCallUrl);
			expect(res.body.incomingSmsUrl).to.equal(applicationPOST.incomingSmsUrl);
			expect(res.body.autoAnswer).to.be.true;
			expect(res.body.callbackHttpMethod).to.equal("POST");
			done();
		});
	});

	it ("creates a new application with autoAnswer false", function (done) {
		supertest(app)
		.post(uri + "/applications")
		.expect(201)
		.send(appAutoAnswerFalse)
		.end(function (e, res) {
			expect(e).to.be.null;
			expect(res.header.location).not.to.be.null;
			var id = res.header.location.substr(res.header.location.length - 25);
			expect(id).to.match(/^a-/);
			done();
		});

	});

	it("gets information for all application", function (done) {
		supertest(app)
		.get(uri + "/applications")
		.expect(200)
		.send()
		.end(function (e, res) {
			expect(e).to.be.null;
			expect(res.body).not.to.be.null;
			expect(res.body[0]).not.to.be.null;
			expect(res.body[1]).not.to.be.null;
			expect(res.body).to.have.length(2);
			done();
		});
	});
});