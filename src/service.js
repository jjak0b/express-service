'use strict'
/* global self, Promise, Response, Blob, caches */

const { http } = require('./patch-sw-environment-for-express');
const express = require("express");
const os = require('os');
const path = require( "path" );
const Url = require('url-parse');
const charset = require('charset');
const jschardet = require('jschardet');
const Buffer = require("buffer").Buffer;
const debug = require( "debug" )('express-service');

// ServiceWorker script
// functions as an adaptor between the Express
// and the ServiceWorker environment
class Server {
  constructor () {
    this.resolveMount = null;
    this.promiseMount = new Promise( (resolve) => this.resolveMount = resolve );

    this.mountUrl = null;
    this.serverApp = express();
    this.port = 80;
    this.registerService();
  }

  registerService() {
    self.addEventListener('install', this.onInstall.bind( this ) );
    self.addEventListener('activate', this.onActivate.bind( this ) );
    self.addEventListener('fetch', this.onFetch.bind( this ) );
  }

  mount( app ) {
    setImmediate(this.resolveMount, app );
  }

  listen( port ) {
    if( port ) {
      this.port = port;
    }
  }

  onInstall(event) {
    this.mountUrl = new Url( self.registration.scope );
    let mountPath = this.mountUrl.pathname;

    this.serverApp.all( "*", mountExpressAt( mountPath ) );
    debug('installed at mount: \"%s\"', mountPath, self.registration );

    this.promiseMount
      .then( (app) => {
        this.serverApp.use( this.mountUrl.pathname, app )
        debug("Mounted app @", this.mountUrl.toString() );
      })
  }

  onActivate(event) {
    debug("Activated");
  }

  onFetch(event) {
    const parsedUrl = new Url(event.request.url)

    if (
      parsedUrl.hostname !== os.hostname()
      || ( !parsedUrl.port.length && 80 !== this.port ) || (parsedUrl.port.length && parsedUrl.port !== this.port.toString() )
    ) {
      // ignore unhandled
      debug("Ignoring", parsedUrl.toString() );
      return
    }

    debug('Fetching page', parsedUrl)

    event.respondWith(
      this.handle( event.request )
    );
  }

  /**
   *
   * @param request {Request}
   * @return {Response|Promise<Response>}
   */
  handle( request ) {
    const parsedUrl = new Url(request.url)
    let app = this.serverApp;

    // let Express handle the request, but get the result
    debug('handle request', JSON.stringify(parsedUrl, null, 2), request, Object.fromEntries( request.headers.entries()));

    return new Promise(function (resolve) {
      request = request.clone();
      buildRequest( request )
        .then( req => {

          // setup empty response
          let res = buildResponse( request, resolve );
/*
          // replace listener in stream-http.IncomingMessage when "finish" event has been triggered by Writable.end()
          res._onFinish = function () {
            _onFinish(req, this, resolve, request)
          }.bind(res)
*/
          debug('Forwarding to express', request, 'as fake request:', req)

          app(req, res)
        })
    })
  }
}

/**
 *
 * @param request {Request}
 * @return Promise<htto.IncomingMessage>
 */
function buildRequest( request ) {
  return request.blob()
    .then(( blob ) => blob.text()
      .then( ( body ) => {

        if (!request.body) {
          // all browsers don't support Request.body: why ?!
          // Safari, Opera don't support Blob.stream()
          Object.defineProperty(request, 'body', { value: blob.stream() })
        }

        let rawHeaders = Object.fromEntries( request.headers.entries() );
        let headers = new Headers( rawHeaders );

        // use encoding based on headers or detection
        let encoding = request.headers.get("charset");

        // looks like we don't have some headers like charset and content-length automatically set by browser in service worker
        // so try to set them
        if (!encoding) {
          encoding = charset( rawHeaders, body)
            || jschardet.detect(body).encoding;
          if( encoding ) {
            encoding = encoding.toLowerCase();
          }

          headers.append("charset", encoding);
        }

        if (!headers.has("content-length") && !headers.has("transfer-encoding")) {
          headers.append("content-length", Buffer.byteLength(body, encoding).toString())
        }

        Object.defineProperty(request, 'headers', { value: headers })

        let req = new http.IncomingMessage(null, request, 'fetch', 6000)

        // empty stubs
        req.method = request.method
        req.connection = {
          encrypted: !!global.isSecureContext
        }
        req.socket = {} // this could be linked to a virtual socket

        return req;
  }))
}

/**
 *
 * @return {http.ServerResponse}
 */
function buildResponse ( request, responseResolveFunc ) {
  return new http.ServerResponse({ headers: {} }, request, responseResolveFunc );
}

// server - Express application, as in
// var express = require('express')
// var app = express()
// think of this as equivalent to http.createServer(app)
function expressService (app) {
  let server = new Server();
  server.mount( app );
  return server;
}

function mountExpressAt ( mountPath ) {
  function handler(req, res, next) {
    let redirectUrl = new Url( req.url );

    if( !( redirectUrl.pathname && redirectUrl.pathname.startsWith( mountPath ) ) ) {
      redirectUrl.set( "pathname", path.join( mountPath, redirectUrl.pathname ) );
      debug( "Request", req, redirectUrl.pathname , "doesn't start with", mountPath, "So it should be supposed to forward it @ mount and redirecting to", redirectUrl );
      req.originalUrl = req.url = redirectUrl.toString()
    }

    next();
  }
  return handler;
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

  debug( 'Resolving', req.originalUrl, req, 'through', res, 'as', response)

  resolve(response)
}

module.exports = {
  ExpressService: Server,
  createServer: expressService
}
