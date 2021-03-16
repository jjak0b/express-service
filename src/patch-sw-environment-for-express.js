// patch and mock the environment

// setImmediate is missing in the ServiceWorker
if (typeof setImmediate === 'undefined') {
  global.setImmediate = function setImmediate (cb, param) {
    setTimeout(cb.bind(null, param), 0)
  }
}
// patch http env
var http = require('./patch-http')

// patch express env
require('./patch-express')

module.exports = {
  http
}
