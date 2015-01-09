/* global appCacheNanny */

// log all events
[
  'error',
  'obsolete',
  'noupdate',
  'downloading',
  'progress',
  'cached',
  'updateready',
  'init:downloading',
  'init:progress',
  'init:cached',
  'start',
  'stop',
  'online',
  'offline'
].forEach(function(eventName) {
  appCacheNanny.on(eventName, function() {
    if (eventName === 'error') {
      log('error', 'appCacheNanny error');
    } else {
      log('appCacheNanny', eventName);
    }

    if (appCacheNanny.hasUpdate()) {
      document.querySelector('#hasUpdate').textContent = 'yes!';
    }
  });
});

function log (type, text) {
  var item = document.createElement('p');

  item.innerHTML = '<strong>'+type+'</strong> ' + text;
  item.className = type;
  document.querySelector('#logs').appendChild(item);
}

var startButton = document.querySelector('#start');
var stopButton = document.querySelector('#stop');
function start () {
  startButton.style.display = 'none';
  stopButton.style.display = 'inline';
  appCacheNanny.start();
  document.querySelector('#isChecking').textContent = 'yes!';
}
function stop () {
  startButton.style.display = 'inline';
  stopButton.style.display = 'none';
  appCacheNanny.stop();
  document.querySelector('#isChecking').textContent = 'no';
}

function bumpRevision () {
  request({
    path: '/bump-version',
    onSuccess: function(version) {
      log('server', 'New version: ' + version);
    },
    onError: function() {
      log('error', 'Could not bump version – server error');
    }
  });
}

function removeManifest () {
  request({
    path: '/remove-manifest',
    onSuccess: function() {
      log('server', 'Cache manifes removed.');
    },
    onError: function() {
      log('error', 'Could not remove manifest – server error');
    }
  });
}

function request(options) {
  var req = new XMLHttpRequest();
  req.open('GET', options.path, true);

  req.onload = function() {
    if (req.status !== 200){
      return options.onError();
    }
    options.onSuccess(req.responseText);
  };

  req.onerror = options.onError;
  req.send();
}

function clearLogs() {
  document.querySelector('#logs').innerHTML = '';
}
