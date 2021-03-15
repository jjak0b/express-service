/* global URL */

const path = require('path')
const express = require('express')
const httpProxy = require('http-proxy')
const serveStaticProxy = httpProxy.createProxyServer()

express.static = function (root, options) {
  function serveProxy (req, res) {
    let endPath = path.join(path.sep, root, req.params[ 0 ])

    let parsedURL = new URL(req.originalUrl)
    parsedURL.pathname = endPath

    let endUrl = parsedURL.toString()
    req.url = endUrl

    console.warn('express-service', 'forwarding', req.originalUrl, 'to', endUrl)
    serveStaticProxy.web(
      req,
      res,
      {
        target: parsedURL.origin,
        followRedirects: false,
        prependPath: false
      }
    )
  }

  return serveProxy
}

module.exports = {
  express,
  serveStaticProxy
}
