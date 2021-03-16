var express = require('express')
var app = express()
var path = require("path");

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
  '<p>read <a href="/about">about page</a></p>',
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
  '</body>',
  '</html>'
].join('\n')

function sendIndexPage (req, res) {
  res.send(indexPage)
}

function sendAboutPage (req, res) {
  res.send(aboutPage)
}

app.get('/', sendIndexPage)
app.get('/about', sendAboutPage)
app.use('/static', require("./routes/static") );
app.use('*', function (req, res) {
  res.sendStatus( 404 );
});
module.exports = app
