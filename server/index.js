'use strict';
var http = require('http'),
    url = require('url'),
    fs = require('fs'),
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
var timestamp = Date.now();
function bumpRevision(response) {
  revision++;
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
  var html = fs.readFileSync('./index.html').toString();
  var color = 'rgb('+randomColor()+','+randomColor()+','+randomColor()+')';
  html = html.replace('{color}', color);
  html = html.replace('{revision}', timestamp + '-' + revision);

  // simulate a slow connection
  setTimeout(function() {
    response.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
    response.write(html + '\n');
    response.end();
  }, 1000);
}

function randomColor() {
  return parseInt(Math.random()*150 + 100, 10);
}

function loader(response) {
  var html = fs.readFileSync('../appcache-loader.html').toString();

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

  text = fs.readFileSync('./manifest.appcache').toString();
  text += '\n# rev ' + timestamp + '-' + revision;

  response.writeHead(200, {'Content-Type': 'text/cache-manifest'});
  response.write(text + '\n');
  response.end();
}

function script(response) {
  var script = fs.readFileSync('../appcache-nanny.js').toString();

  response.writeHead(200, {'Content-Type': 'application/x-javascript'});
  response.write(script + '\n');
  response.end();
}

console.log('AppCache debug server running at\n  => http://localhost:' + port + '/\nCTRL + C to shutdown');
