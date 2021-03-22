const http = require('stream-http')
const debug = require( "debug" )('express-service:http');
const {parse: cookieParse } = require("tough-cookie");

class ServerResponse extends http.ClientRequest {

  /**
   *
   * @param opts {Object}
   * @param request {Request}
   * @param responseResolveFunc {Function}
   */
  constructor ( opts, request, responseResolveFunc ) {
    super( opts );
    this._request = request;
    this._resolveResponse = responseResolveFunc;
    this._isHeaderWritten = false;

    this._responseOptions = {
      status: undefined,
      statusText: undefined,
      headers: new Headers(),
    };
    this._responseOptions.headers.toJSON = function () { return Object.fromEntries( this.entries() ) }.bind( this._responseOptions.headers )
  }

  /**
   *
   * @return {string[]}
   */
  getHeaderNames() {
    return Object.keys( this._headers );
  }

  /**
   *
   * @return {Object}
   */
  getHeaders() {
    let headerNames = this.getHeaderNames();
    let headers = {};
    for( let headerName in this._headers ) {
      headers[ headerName ] = this._headers[ headerName ].value;
    }
    return headers;
  }

  /**
   *
   * @param name
   * @return {boolean}
   */
  hasHeader(name) {
    return name && typeof name === "string" && name.toLowerCase() in this._headers;
  }

  /**
   *
   * @param statusCode {number}
   * @param statusMessage {string}
   * @param headers {Object|Array}
   */
  writeHead(statusCode, statusMessage, headers ) {
    this._isHeaderWritten = true;

    let res = this;
    if( statusMessage && typeof statusMessage !== "string" ) {
      headers = statusMessage;
      statusMessage = undefined;
    }

    if( statusCode ) {
      res.statusCode = statusCode || res.statusCode;
    }

    res.statusMessage = statusMessage || res.statusMessage

    if( headers ) {
      if( typeof headers == "array" ) {
        for (let i = 0; i+1 < headers.length; i += 2 ) {
          // res.append( headers[ i ], headers[ i+1 ] );
          this._responseOptions.headers.set( headers[ i ], headers[ i+1 ] );
        }
      }
      else {
        for (const headersKey in headers) {
          this._responseOptions.headers.set( headersKey, headers[ headersKey ] );
        }
      }
    }

    headers = this.getHeaders();
    for (let headerName in headers ) {
      this._responseOptions.headers.append( headerName, headers[ headerName ] );
    }

    return res;
  }

  // replace listener in stream-http.IncomingMessage when "finish" event has been triggered by Writable.end()
  _onFinish() {
    let req = this.req;
    let res = this;

    if( !this._isHeaderWritten ) {
      this.writeHead(
        res.statusCode,
        res.statusMessage,
        undefined
      );
    }

    this._responseOptions.status = res.statusCode || 200;
    this._responseOptions.statusText = (res.statusMessage && res.statusMessage.length > 0)
      ? res.statusMessage
      : http.STATUS_CODES[ this._responseOptions.status ];

    let body = new Blob(res._body, {
        type: (this._responseOptions.headers.get('content-type') || {}) || ''
      })

    debug('output "%s ..." %s',
      res._body.toString().substr(0, 10),
      JSON.stringify( this._responseOptions, null, 2 )
    );

    let response = new Response(
      body,
      this._responseOptions
    )

    let strCookie = this._responseOptions.headers.get( "set-cookie")
    if( strCookie ) {
      if( "cookieStore" in self ) {
        debug( 'CookieStore is supported');
        let cookieStore = global.cookieStore;

        let cookie = cookieParse( strCookie );
        cookie.name = cookie.key;

        debug( "Parsed cookie", cookie )
        cookieStore.set( cookie )
          .finally( () => {
            debug( 'Resolving', this._request.url, req, 'through', res, 'as', response);
            this._resolveResponse(response);
          })
        return;
      }
      else {
        debug( 'CookieStore is not supported', "Cookies may not be set due to cors restrictions");
      }
    }

    debug( 'Resolving', this._request.url, req, 'through', res, 'as', response);

    this._resolveResponse(response);
  }
};

if (!http.ServerResponse) {
  http.ServerResponse = ServerResponse;
}

module.exports = http;