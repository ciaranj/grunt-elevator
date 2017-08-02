# grunt-elevator [![Build Status](https://travis-ci.org/ciaranj/grunt-elevator.svg?branch=master)](https://travis-ci.org/ciaranj/grunt-elevator)
Automatically elevate your grunt script's UAC privileges in windows.

## Install
```
$ npm install --save grunt-elevator
```

## Usage
```js
// Gruntfile.js
module.exports = grunt => {
	// require it at the top and pass in the grunt instance
	require('grunt-elevator')(grunt);

	grunt.initConfig();
}
```

## License
MIT © [Ciaran Jessup](ciaranj@gmail.com)