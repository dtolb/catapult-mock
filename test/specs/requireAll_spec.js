var expect = require("chai").expect;
describe("Requires all lib files", function () {
	var libs = require("require-all")(__dirname + "/../../lib");

	it ("Created an index for code coverage reasons", function () {
		expect(libs).not.to.be.null;
	});
});