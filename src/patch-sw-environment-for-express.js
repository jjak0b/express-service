// patch and mock the environment

// setImmediate is missing in the ServiceWorker
if (typeof setImmediate === 'undefined') {
  global.setImmediate = function setImmediate (cb, param) {
    setTimeout(cb.bind(null, param), 0)
  }
}
// patch http env
var http = require('./patch-http')

if( !http.ServerResponse.prototype._implicitHeader ) {
    // leave empty for now: it's used by express-session and node compression lib
    http.ServerResponse.prototype._implicitHeader = function() {
        // Implicit headers sent!
        // this._header = true;
        // this._headerSent = true;
    };
}

// patch express env
require('./patch-express')

module.exports = {
  http
}
