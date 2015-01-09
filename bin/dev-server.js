#!/usr/bin/env node

'use strict';
var http = require('http'),
    url = require('url'),
    fs = require('fs'),
    moment = require('moment'),
    port = process.argv[2] || 8888;

http.createServer(function(request, response) {

  var uri = url.parse(request.url).pathname;

  console.log(uri);

  if (uri === '/manifest.appcache') return manifest(response);
  if (uri === '/appcache-nanny.js') return script(response);
  if (uri === '/appcache-loader.html') return loader(response);
  if (uri === '/bump-revision') return bumpRevision(response);
  if (uri === '/remove-manifest') return removeManifest(response);
  if (uri === '/favicon.ico') return empty(response);

  // for any other URL, return index.html
  return page(response);
}).listen(parseInt(port, 10));

var revision = 1;
var timestamp = moment().format('H:mm:ss');
function bumpRevision(response) {
  revision++;
  timestamp = moment().format('H:mm:ss');
  response.writeHead(200);
  response.end();
}

var manifestRemoved = false;
function removeManifest(response) {
  manifestRemoved = true;
  response.writeHead(200);
  response.end();
}

function empty(response) {
  response.writeHead(200);
  response.end();
}


function page(response) {
  var html = fs.readFileSync(__dirname + '/../demo/index.html').toString();
  html = html.replace('{timestamp}', timestamp);
  html = html.replace('{revision}', revision);

  // simulate a slow connection
  setTimeout(function() {
    response.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
    response.write(html + '\n');
    response.end();
  }, 100);
}

function loader(response) {
  var html = fs.readFileSync(__dirname + '/../appcache-loader.html').toString();

  response.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
  response.write(html + '\n');
  response.end();
}

function manifest(response) {
  var text;

  if (manifestRemoved) {
    response.writeHead(404);
    response.end();
    return;
  }

  text = fs.readFileSync(__dirname + '/../demo/manifest.appcache').toString();
  text += '\n# last change: ' + timestamp;

  response.writeHead(200, {'Content-Type': 'text/cache-manifest'});
  response.write(text + '\n');
  response.end();
}

function script(response) {
  var content = fs.readFileSync(__dirname + '/../appcache-nanny.js').toString();

  response.writeHead(200, {'Content-Type': 'application/x-javascript'});
  response.write(content + '\n');
  response.end();
}

console.log('AppCache demo server running at\n  => http://localhost:' + port + '/\nCTRL + C to shutdown');
