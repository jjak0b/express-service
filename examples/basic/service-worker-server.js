process.env.DEBUG="express-service,express-service:*"
const { createServer } = require('../..')
const app = require('./demo-server')

createServer(app)
  .listen(80);
