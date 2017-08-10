var escalatedSpawn = require('@mh-cbon/aghfabsowecwn').spawn;
var execSync = require("child_process").execSync;
var hooker = require("hooker");
var path = require('path');
"use strict";

if (!String.prototype.hashCode) {
  //A hash code implementation copied from: http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
  String.prototype.hashCode = function () {
    var result = 0;
    for (var a = 0; a < this.length; a++) {
      var character = this.charCodeAt(a);
      result = ((result << 5) - result) + character;
      result |= 0;
    }
    return result;
  };
}

//This file only exists for a moment and is hopefully unique enough.
//Usually we would use the PID but this changes between normal and elevated states.
var envFile = path.join(process.env["TEMP"], "path." + process.argv.join().hashCode() + ".tmp");

module.exports = function (grunt) {

  var save_env = function () {
    if (grunt.file.exists(envFile)) {
      grunt.verbose.writeln("Environment has already been saved.");
      return;
    }
    var env = {}
    //The environment variable names to save.
    var names = grunt.config.get("elevator.env.names");
    if (names) {
      var cb = grunt.config.get("elevator.env.cb");
      for (var a in names) {
        var key = names[a];
        var value = process.env[key];
        if (cb) {
          value = cb(key, value) || value;
        }
        env[key] = value;
        grunt.verbose.writeln("Saving environment variable: " + key + " => " + value);
      }
    }

    grunt.file.write(envFile, JSON.stringify(env));
    grunt.verbose.writeln("Saved environment variables to " + envFile);
  };

  var restore_env = function () {
    if (!grunt.file.exists(envFile)) {
      grunt.verbose.writeln("No environment to restore.");
      return;
    }
    var env = JSON.parse(grunt.file.read(envFile));
    for (var key in env) {
      var value = env[key];
      process.env[key] = value;
      grunt.verbose.writeln("Restored environment variable: " + key + " => " + value);
    }
    grunt.file.delete(envFile, { force: true });
    grunt.verbose.writeln("Restored environment variables from " + envFile);
  };

  var elevatedOk = false;

  hooker.hook(grunt.task, "runTaskFn", {
    pre: function (context, fn, done, asyncDone) {
      try {
        if (!elevatedOk) {
          execSync("net session", { "stdio": "ignore" });
          // If we make it to here carry on as normal.
          grunt.log.ok("Gruntfile is being executed by an elevated user.");
          restore_env();
          elevatedOk = true;
        }
      }
      catch (e) {
        // Assuming we get an error here because access is denied.
        grunt.log.warn("User elevation of Gruntfile is required");
        grunt.task.clearQueue();
        save_env();
        var opts = {
          bridgeTimeout: 10000,
          stdio: 'pipe'
        };
        var child = escalatedSpawn(process.argv[0], process.argv.slice(1), opts);
        child.stdout.pipe(process.stdout);
        child.stderr.pipe(process.stderr);
        child.on('exit', function (code) {
          done(null, true);
        });
        // if UAC is not validated, or refused, an error is emitted
        child.on('error', function (error) {
          if (error.code === 'ECONNREFUSED') {
            grunt.fail.fatal('UAC was probably not validated.');
          }
        });
        return hooker.preempt();
      }
    }
  });
};
