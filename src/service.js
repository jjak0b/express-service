'use strict'

// ServiceWorker script
// functions as an adaptor between the Express
// and the ServiceWorker environment
const { http } = require('./patch-sw-environment-for-express')
const os = require('os')
const Url = require('url-parse');
const debug = require( "debug" )('express-service')

// server - Express application, as in
// var express = require('express')
// var app = express()
// think of this as equivalent to http.createServer(app)
function expressService (app, cachedResources = [], cacheName = 'express-service') {
  /* global self, Promise, Response, Blob, caches */

  debug( 'startup' )

  self.addEventListener('install', function (event) {
    debug('installed')
    if (cachedResources.length) {
      event.waitUntil(
        caches.open(cacheName)
          .then((cache) => cache.addAll(cachedResources))
          .then(() => {
            debug( 'cached %d resources', cachedResources.length)
          })
      )
    }
  })

  self.addEventListener('activate', function () {
    debug('activated')
  })

  self.addEventListener('fetch', function (event) {
    const parsedUrl = new Url(event.request.url)
    if (os.hostname() !== parsedUrl.hostname) {
      return
    }

    debug('fetching page', parsedUrl)

    event.respondWith(new Promise(function (resolve) {
      // let Express handle the request, but get the result
      debug('handle request', JSON.stringify(parsedUrl, null, 2), event.request)

      event.request.clone().text().then(function (text) {
        let body = text

        // setup request
        let responseOptions = {
          status: 200,
          statusText: undefined,
          headers: event.request.headers
        }
        responseOptions.statusText = http.STATUS_CODES[ responseOptions.status ]
        let fakeResponse = new Response(body, responseOptions)
        Object.defineProperty(fakeResponse, 'url', { value: event.request.url })
        let req = new http.IncomingMessage(null, fakeResponse, 'fetch', 6000)
        // empty stubs
        req.method = event.request.method
        req.connection = {}
        req.socket = {}

        debug('Forwarding to express', event.request, 'as fake request:', req)

        // setup response
        let res = new http.ServerResponse({ headers: {} })
        // replace listener in stream-http.IncomingMessage when "finish" event has been triggered by Writable.end()
        res._onFinish = function () {
          _onFinish(req, this, resolve, event.request)
        }.bind(res)

        app(req, res)
      })
    }))
  })
}

function _onFinish (req, res, resolve, originalRequest) {
  let opts = res._opts
  let body
  if (opts.method !== 'GET' && opts.method !== 'HEAD') {
    body = new Blob(res._body, {
      type: (res.getHeader('content-type') || {}) || ''
    })
  }

  debug('output "%s ..."', res._body.toString().substr(0, 10))
  debug('%d %s %d', res.statusCode || 200,
    res.getHeader('Content-Type'),
    res.getHeader('Content-Length')
  )

  let responseOptions = {
    status: res.statusCode,
    statusText: http.STATUS_CODES[ res.statusCode ],
    headers: res.headers
  }
  let response = new Response(
    body,
    responseOptions
  )

  debug( 'Resolving', req, ' through', res, 'as', response)

  resolve(response)
}

module.exports = expressService
