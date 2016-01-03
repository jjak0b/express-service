'use strict'
// ServiceWorker script
// functions as an adaptor between the Express
// and the ServiceWorker environment

// patch and mock the environment
if (typeof global.XMLHttpRequest === 'undefined') {
  global.XMLHttpRequest = require('./XMLHttpRequest-mock')
}
var http = require('http')
if (!http.IncomingMessage) {
  http.IncomingMessage = {}
}
if (!http.ServerResponse) {
  http.ServerResponseProto = {
    _headers: {},
    setHeader: function setHeader (name, value) {
      console.log('set header %s to %s', name, value)
      this._headers[name] = value
    },
    getHeader: function getHeader (name) {
      return this._headers[name]
    },
    get: function get (name) {
      return this._headers[name]
    }
  }
  http.ServerResponse = Object.create({}, http.ServerResponseProto)
}

/* global self, Promise, Response, fetch */
const url = require('url')
const myName = 'express-service'
console.log(myName, 'startup')

const app = require('./demo-server')
console.log('got demo express server', typeof app)

self.addEventListener('install', function (event) {
  console.log(myName, 'installed')
})

self.addEventListener('activate', function () {
  console.log(myName, 'activated')
})

function isIndexPageRequest (path) {
  return path === '/'
}

function isJsRequest (path) {
  return /\.js$/.test(path)
}

self.addEventListener('fetch', function (event) {
  const parsedUrl = url.parse(event.request.url)
  console.log(myName, 'fetching page', parsedUrl.path)
  if (isIndexPageRequest(parsedUrl.path)) {
    return fetch(event.request)
  }
  if (isJsRequest(parsedUrl.path)) {
    return fetch(event.request)
  }

  event.respondWith(new Promise(function (resolve) {
    // let Express handle the request, but get the result

    console.log(myName, 'handle request', JSON.stringify(parsedUrl, null, 2))
    var req = {
      url: parsedUrl.href,
      method: 'GET'
    }
    console.log(req)
    var res = {
      _headers: {},
      setHeader: function setHeader (name, value) {
        console.log('set header %s to %s', name, value)
        this._headers[name] = value
      },
      getHeader: function getHeader (name) {
        return this._headers[name]
      },
      get: function get (name) {
        return this._headers[name]
      }
    }

    function endWithFinish (chunk, encoding) {
      console.log('ending response for request', req.url)
      console.log('output "%s ..."', chunk.toString().substr(0, 10))
      console.log('%d %s %d', res.statusCode || 200,
        res.get('Content-Type'),
        res.get('Content-Length'))
      // end.apply(res, arguments)
      const responseOptions = {
        status: res.statusCode || 200,
        headers: {
          'Content-Length': res.get('Content-Length'),
          'Content-Type': res.get('Content-Type')
        }
      }
      resolve(new Response(chunk, responseOptions))
    }

    res.end = endWithFinish
    app(req, res)
  }))
})
