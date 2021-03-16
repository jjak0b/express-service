const http = module.exports = require('stream-http')
const ClientRequest = http.ClientRequest
const ServerResponse = ClientRequest

if (!http.ServerResponse) {
  http.ServerResponse = ServerResponse
}

