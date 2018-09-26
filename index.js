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

module.exports = function (grunt, config) {
  //This file only exists for a moment and is hopefully unique enough.
  //Usually we would use the PID but this changes between normal and elevated states.
  var envFile = config.env.tmp || path.join("." + process.argv.join().hashCode() + ".env");

  var save_env = function () {
    if (grunt.file.exists(envFile)) {
      grunt.verbose.writeln("Environment has already been saved.");
      return;
    }
    var env = {}
    //The environment variable names to save.
    var names = config.env.names;
    if (names) {
      //The environment variable call back.
      var cb = config.env.cb;
      for (var a in names) {
        var key = names[a];
        var value = process.env[key];
        if (cb) {
          //If the call back returned a value then overwrite the local value.
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
    grunt.file.delete(envFile, {force: true});
    grunt.verbose.writeln("Restored environment variables from " + envFile);
  };

  function should_elevate(name, args) {
    var triggers = config.triggers;
    if (!triggers || !triggers.length) {
      grunt.verbose.writeln("No elevation triggers have been defined, will elevate.");
      return true;
    }
    for (var a = 0; a < triggers.length; a++) {
      var trigger = triggers[a];
      if (typeof (trigger) == 'string' || trigger instanceof String) {
        var pattern = get_pattern(trigger);
        if (pattern) {
          trigger = pattern;
        }
        else {
          if (name == trigger || args == trigger) {
            grunt.verbose.writeln("Elevation trigger matches string: " + trigger + ", will elevate");
            return true;
          }
          return;
        }
      }
      if (trigger instanceof RegExp) {
        if (trigger.test(name) || trigger.test(args)) {
          grunt.verbose.writeln("Elevation trigger matches pattern: " + trigger + ", will elevate");
          return true;
        }
      }
    }
    grunt.verbose.writeln("No elevation task trigger matches, won't elevate.");
    return false;
  }

  function get_pattern(trigger) {
    var pattern = /regex:(.*)/.exec(trigger);
    if (pattern) {
      grunt.verbose.writeln("Extracted pattern from trigger: " + pattern[1])
      return new RegExp(pattern[1]);
    }
  }

  var elevatedOk = false;

  hooker.hook(grunt.task, "runTaskFn", {
    pre: function (context, fn, done, asyncDone) {
      try {
        if (!elevatedOk) {
          if (!should_elevate(context.name, context.nameArgs)) {
            return;
          }
          execSync("net session", {"stdio": "ignore"});
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
        //Redirect input.
        process.stdin.pipe(child.stdin);
        //Redirect output.
        child.stdout.pipe(process.stdout);
        child.stderr.pipe(process.stderr);
        //Setup events.
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