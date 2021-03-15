'use strict'

// ServiceWorker script
// functions as an adaptor between the Express
// and the ServiceWorker environment
const { http } = require('./patch-sw-environment-for-express')
const os = require('os')
const url = require('url')
const myName = 'express-service'

// server - Express application, as in
// var express = require('express')
// var app = express()
// think of this as equivalent to http.createServer(app)
function expressService (app, cachedResources = [], cacheName = 'express-service') {
  /* global self, Promise, Response, Blob, caches */

  console.log(myName, 'startup')

  self.addEventListener('install', function (event) {
    console.log(myName, 'installed')
    if (cachedResources.length) {
      event.waitUntil(
        caches.open(cacheName)
          .then((cache) => cache.addAll(cachedResources))
          .then(() => {
            console.log(myName, 'cached %d resources', cachedResources.length)
          })
      )
    }
  })

  self.addEventListener('activate', function () {
    console.log(myName, 'activated')
  })

  self.addEventListener('fetch', function (event) {
    const parsedUrl = url.parse(event.request.url)

    if (os.hostname() !== parsedUrl.hostname) {
      return
    }

    console.log(myName, 'fetching page', parsedUrl)

    event.respondWith(new Promise(function (resolve) {
      // let Express handle the request, but get the result
      console.log(myName, 'handle request', JSON.stringify(parsedUrl, null, 2), event.request)

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

        console.log(myName, 'Forwarding', event.request, 'as fake request to express:', req)

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

  console.log('output "%s ..."', res._body.toString().substr(0, 10))
  console.log('%d %s %d', res.statusCode || 200,
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

  console.log(myName, 'resolving', req, ' through', res, 'as', response)

  resolve(response)
}

module.exports = expressService
