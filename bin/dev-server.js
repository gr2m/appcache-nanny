#!/usr/bin/env node

'use strict';

var Hapi = require('hapi');

var http = require('http');
var util = require('util');
var url = require('url');
var fs = require('fs');
var moment = require('moment');
var PORT = 8888;
var HOSTNAME = '127.0.0.1'

var server = new Hapi.Server();

var version = 1;
var timestamp = moment().format('H:mm:ss');
var manifestRemoved;

server.connection({
  host: HOSTNAME,
  port: PORT
});

// Serve dynamic js file to set version / timestamp
server.route({
  method: 'GET',
  path: '/version.js',
  handler: function(request, reply) {
    var setVersion = util.format('document.querySelector("#version").textContent = "%s";', version);
    var setLastChange = util.format('document.querySelector("#last-change").textContent = "%s";', timestamp);

    var response = reply([setVersion,setLastChange].join('\n'));
    response.type('application/javascript');
  }
});

// serve appcache-nanny.js
server.route({
  method: 'GET',
  path: '/appcache-nanny.js',
  handler: function(request, reply) {
    reply.file('./appcache-nanny.js');
  }
});
// serve appcache-loader.html
server.route({
  method: 'GET',
  path: '/appcache-loader.html',
  handler: function(request, reply) {
    reply.file('./appcache-loader.html');
  }
});

// serve manifest.appcache
server.route({
  method: 'GET',
  path: '/manifest.appcache',
  handler: manifest
});

// serve empty favicon
server.route({
  method: 'GET',
  path: '/favicon.ico',
  handler: function(request, reply) {
    reply();
  }
});

server.route({
  method: 'GET',
  path: '/bump-version',
  handler: bumpVersion
});

server.route({
  method: 'GET',
  path: '/remove-manifest',
  handler: removeManifest
});
server.route({
  method: 'GET',
  path: '/recreate-manifest',
  handler: recreateManifest
});

// Serve static assets in public
server.route({
  method: 'GET',
  path: '/{param*}',
  handler: {
    directory: {
      path: './demo'
    }
  }
});




function manifest(request, reply) {
  var text;
  var response;

  if (manifestRemoved) {
    reply().code(404);
    return;
  }

  text = fs.readFileSync(__dirname + '/../demo/manifest.appcache').toString();
  text += '\n# last change: ' + timestamp + '\n';

  reply(text).type('text/cache-manifest');
}

function bumpVersion(request, reply) {
  version++;
  timestamp = moment().format('H:mm:ss');
  reply(version);
}

var manifestRemoved = false;
function removeManifest(request, reply) {
  manifestRemoved = true;
  reply('manifest removed');
}
function recreateManifest(request, reply) {
  manifestRemoved = false;
  reply('manifest recreated');
}


if (require.main === module) {
  server.start(function () {
    console.log('AppCache demo server running at %s\nCTRL + C to shutdown', server.info.uri);
  });
} else {
  module.exports = server;
}
