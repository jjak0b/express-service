// patch and mock the environment

// setImmediate is missing in the ServiceWorker
if (typeof setImmediate === 'undefined') {
  global.setImmediate = function setImmediate (cb, param) {
    setTimeout(cb.bind(null, param), 0)
  }
}

module.exports = {
  // patch http env
  http: require('./http'),
  // patch express env
  express: require('./express').express
}
