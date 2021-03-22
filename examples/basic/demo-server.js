var express = require('express')
var app = express()
var path = require("path");
const session = require("express-session");

var indexPage = [
  '<!DOCTYPE html>',
  '<html lang="en">',
  '<head>',
  '<meta charset="utf-8">',
  '<link rel="stylesheet" type="text/css" href="/static/css/style.css" />',
  '</head>',
  '<body>',
  '<h1>Hello World</h1>',
  '<p>Served by Express framework</p>',
  '<p>read <a href="./about">about page</a></p>',
  '</body>',
  '</html>'
].join('\n')

var aboutPage = [
  '<!DOCTYPE html>',
  '<html lang="en">',
  '<head>',
  '<meta charset="utf-8">',
  '<link rel="stylesheet" type="text/css" href="/static/css/style.css" />',
  '</head>',
  '<body>',
  '<h1>About express-service</h1>',
  '<p>Served by Express framework</p>',
  '<button id="refresh-button">Refresh</button>',
  '<iframe id="views-container" width="50%" height="50%" title="Views"></iframe>',
  '<script src="./static/js/updateViews.js"></script>',
  '</body>',
  '</html>'
].join('\n')

function sendIndexPage (req, res) {
  res.send(indexPage)
}

function sendAboutPage (req, res) {
  res.send(aboutPage)
}

app.use( session({
  secret: '42',
  resave: false,
  saveUninitialized: false,
  store: new session.MemoryStore(),
  proxy: true,
  cookie: {
    httpOnly: false,
    secure: true,
    maxAge: 60000
  }
}));

app.get('/', sendIndexPage)
app.get('/about', sendAboutPage)
app.get( "/views", function (req, res ) {
  if (req.session.views) {
    req.session.views++
    res.setHeader('Content-Type', 'text/html')
    res.write('<p>views: ' + req.session.views + '</p>')
    res.write('<p>expires in: ' + (req.session.cookie.maxAge / 1000) + 's</p>')
    res.end()
  }
  else {
    res.setHeader('Content-Type', 'text/plain')
    req.session.views = 1
    res.end('welcome to the session demo. refresh!')
  }
})
app.use('/static', express.static( path.join( path.sep ) ) );
app.use('*', function (req, res) {
  res.sendStatus( 404 );
});
module.exports = app
