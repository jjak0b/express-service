process.env.DEBUG = "express-service,express-service:*,body-parser:json,express-session"
const { createServer } = require('../..')
const app = require('./demo-server')

createServer(app)
  .listen(80);
