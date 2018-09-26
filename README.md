# grunt-elevator [![Build Status](https://travis-ci.org/ciaranj/grunt-elevator.svg?branch=master)](https://travis-ci.org/ciaranj/grunt-elevator)
Automatically elevate your grunt script's UAC privileges in windows.

## Install
```
$ npm install --save grunt-elevator
```

## Usage
```js
// tasks/elevate.js
module.exports = function (grunt) {
  require("grunt-elevator")(grunt, {
    env: {
      //We need to copy these variables to the elevated process.
      names: ["HOME", "PATH", "SSH_AUTH_SOCK", "SSH_AGENT_PID"],
      tmp: "c:\\temp\\elevatedEnv.tmp", // optional - defaults to working directory
      cb: function (name, value) {
        if (name == "HOME" && process.env.HOMESHARE) {
          //We substitute HOME with HOMESHARE as the elevated process cannot access U:\
          return process.env.HOMESHARE;
        }
        else if ((name == "SSH_AUTH_SOCK" || name == "SSH_AGENT_PID") && !value) {
          //If the ssh-agent is not running then issue a warning.
          grunt.log.writeln(("You have not set " + name + ". This could cause you to be banned from git!").yellow.bold);
        }
      }
    },
    triggers: [
      /activate/,
      /deactivate/
    ]
  });
};
```

## License
MIT © [Ciaran Jessup](ciaranj@gmail.com)