var escalatedSpawn = require('@mh-cbon/aghfabsowecwn').spawn;
var execSync= require("child_process").execSync;
var hooker = require("hooker");
"use strict";

module.exports = function (grunt) {
  var elevatedOk= false;
  hooker.hook(grunt.task, "runTaskFn", {
    pre: function(context,fn,done,asyncDone) {
      try {
        if(!elevatedOk) {
          execSync( "net session", {"stdio":"ignore"} );
          // If we make it to here carry on as normal.
          grunt.log.ok("Gruntfile is being executed by an elevated user.");
          elevatedOk= true;
        }
      }
      catch(e) {
        // Assuming we get an error here because accses is denied.
        grunt.log.warn("User elevation of Gruntfile is required");
        grunt.task.clearQueue();
        var opts = {
          bridgeTimeout: 10000,
          stdio: 'pipe'
        };
        var child= escalatedSpawn(process.argv[0], process.argv.slice(1),opts);
        child.stdout.pipe(process.stdout);
        child.stderr.pipe(process.stderr);
        child.on('exit', function (code) {
          done(null, true);
        });
        // if UAC is not validated, or refused, an error is emitted
        child.on('error', function (error) {
          if (error.code==='ECONNREFUSED') {
            grunt.fail.fatal('UAC was probably not validated.');
          }
        });            
        return hooker.preempt();
      }
    }
  });
};
