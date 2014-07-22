"use strict";

var _  = require("lodash");

module.exports = function (grunt) {

	var sourceFiles = [ "*.js", "lib/**/*.js" ];
	var testFiles   = [ "test/**/*.js" ];
	var allFiles    = sourceFiles.concat(testFiles);

	var defaultJsHintOptions = grunt.file.readJSON("./.jshint.json");
	var testJsHintOptions = _.extend(
		grunt.file.readJSON("./test/.jshint.json"),
		defaultJsHintOptions
	);

	grunt.initConfig({
		jscs : {
			src     : allFiles,
			options : {
				config : ".jscsrc",
			}
		},

		jshint : {
			src     : sourceFiles,
			options : defaultJsHintOptions,
			test    : {
				options : testJsHintOptions,
				files   : {
					test : testFiles
				}
			}
		},

		/* jshint camelcase: false */
		mocha_istanbul : {
		/* jshint camelcase: true */
			coverage : {
				src : "test/specs"
			},
			options  : {
				reporter : "spec"
			}
		},

		watch : {
			scripts : {
				files   : sourceFiles,
				tasks   : [ "lint", "style" ],
				options : {
					spawn : false,
				},
			},
		},

		clean : [ "coverage", "test/temp" ]
	});

	grunt.registerTask("setupEnvironment", [], function () {
		function ensureEnvironmentVariable (name, defaultValue) {
			process.env[name] = process.env[name] || defaultValue;
		}

		ensureEnvironmentVariable("CONSOLE_LEVEL", "info");
		ensureEnvironmentVariable("CATAPULT_API_PORT", 5050);
		ensureEnvironmentVariable("CATAPULT_API_HOST", "localhost");
		ensureEnvironmentVariable("CATAPULT_USER_ID", "u-user1");
		ensureEnvironmentVariable("CATAPULT_API_USER", "u-user1");
		ensureEnvironmentVariable("CATAPULT_API_TOKEN", "t-token1");
		ensureEnvironmentVariable("CATAPULT_API_SECRET", "secret");

	});

	// Load plugins
	grunt.loadNpmTasks("grunt-contrib-clean");
	grunt.loadNpmTasks("grunt-contrib-watch");
	grunt.loadNpmTasks("grunt-contrib-jshint");
	grunt.loadNpmTasks("grunt-jscs-checker");
	grunt.loadNpmTasks("grunt-mocha-istanbul");

	grunt.registerTask("test", [ "setupEnvironment", "mocha_istanbul:coverage" ]);

	// Register tasks
	grunt.registerTask("lint", "Check for common code problems.", [ "jshint" ]);
	grunt.registerTask("style", "Check for style conformity.", [ "jscs" ]);
	grunt.registerTask("default", [ "clean", "lint", "style", "test" ]);

};