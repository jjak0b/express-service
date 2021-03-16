/* global URL */
const Url = require('url-parse');
const path = require('path')
const express = require("express")
const httpProxy = require('http-proxy')
const serveStaticProxy = httpProxy.createProxyServer()
const debug = require( "debug" )("express-service:express.static")

express.static = function (root, options) {
  function serveProxy (req, res) {

    let originalUrl = new Url(req.originalUrl)
    let pathname = new Url(req.url).pathname

    debug( "Got request to serve static", pathname )

    // make sure redirect occurs at mount
    if (pathname === '/' && originalUrl.pathname.substr(-1) !== '/') {
      pathname = ''
    }

    pathname = getPathOrStatusCode( root, pathname );
    if( !isNaN( pathname ) ) {
      res.sendStatus( pathname );
      return;
    }

    originalUrl.set( "pathname", pathname )

    // let parsedURL = new URL(req.originalUrl)
    // parsedURL.pathname = pathname
    // let endUrl = parsedURL.toString()

    let endUrl = originalUrl.toString();
    req.url = endUrl

    debug( "Forwarding request from", req.originalUrl, "to", endUrl );

    serveStaticProxy.web(
      req,
      res,
      {
        target: originalUrl.origin,
        followRedirects: false,
        prependPath: false
      }
    )
  }

  return serveProxy
}

var join = path.join
var normalize = path.normalize
var resolve = path.resolve
var sep = path.sep
var UP_PATH_REGEXP = /(?:^|[\\/])\.\.(?:[\\/]|$)/

function decode (path) {
  try {
    return decodeURIComponent(path)
  } catch (err) {
    return -1
  }
}


// get final path ( something like the pipe function in send module )
function getPathOrStatusCode (
  // root path
  root,
  // pathname
  path
) {

  // decode the path
  path = decode(path)
  if (path === -1) {
    return 400
  }

  // null byte(s)
  if (~path.indexOf('\0')) {
    return 400;
  }

  // let parts
  if (root !== null) {
    // normalize
    if (path) {
      path = normalize('.' + sep + path)
    }

    // malicious path
    if (UP_PATH_REGEXP.test(path)) {
      debug('malicious path "%s"', path)
      return 403
    }

    // explode path parts
    // parts = path.split(sep)

    // join / normalize from optional root dir
    path = normalize(join(root, path))
  }
  else {
    // ".." is malicious without "root"
    if (UP_PATH_REGEXP.test(path)) {
      debug('malicious path "%s"', path)
      return 403
    }

    // explode path parts
    // parts = normalize(path).split(sep)

    // resolve the path
    path = resolve(path)
  }

  return path;
}

module.exports = {
  serveStaticProxy
}