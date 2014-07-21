var supertest  = require("supertest");
var expect     = require("chai").expect;
var app        = require("../../catapult-app.js");
var config     = require("../../lib/catapult-config");
var uri        = config.catapult.userPath;

describe("Catapult Mock Phone Number API", function () {

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

	var phoneNumberId;

	var phoneNumberConfig1 = {
		number        : "+19195555555",
		applicationId : "a-Y9G2Skflfh2wJvKtm4QkSps",
		name          : "Test Number #1"
	};
	var phoneNumberConfig2 = {
		number : "+19195555556",
		name   : "Test Number #2"
	};

	before ("creates a new phone number with Application", function (done) {
		supertest(app)
		.post(uri + "/phoneNumbers")
		.expect(201)
		.send(phoneNumberConfig1)
		.end(function (e, res) {
			expect(e).to.be.null;
			expect(res.header.location).not.to.be.null;
			phoneNumberId = res.header.location.substr(res.header.location.length - 25);
			expect(phoneNumberId).to.match(/^n-/);
			done();
		});
	});

	before ("creates a new phone number with no application ID", function (done) {
		supertest(app)
		.post(uri + "/phoneNumbers")
		.expect(201)
		.send(phoneNumberConfig2)
		.end(function (e, res) {
			expect(e).to.be.null;
			expect(res.header.location).not.to.be.null;
			var id = res.header.location.substr(res.header.location.length - 25);
			expect(id).to.match(/^n-/);
			done();
		});
	});

	it("gets information for specific phone number", function (done) {
		supertest(app)
		.get(uri + "/phoneNumbers/" + phoneNumberId)
		.expect(200)
		.send()
		.end(function (e, res) {
			expect(e).to.be.null;
			expect(res.body).not.to.be.null;
			expect(res.body.name).to.equal(phoneNumberConfig1.name);
			expect(res.body.number).to.equal(phoneNumberConfig1.number);
			expect(res.body.applicationId).to.equal(phoneNumberConfig1.applicationId);
			done();
		});
	});

	it("gets information for all phone numbers", function (done) {
		supertest(app)
		.get(uri + "/phoneNumbers")
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