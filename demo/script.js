/* global appCacheNanny */

// log all appCacheNanny events
[
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
    log('event', eventName)
  });
});

// log errors
appCacheNanny.on('error', function() {
  log('error', 'appCacheNanny error');
});

// update "has update?" state in UI
appCacheNanny.on('updateready', function() {
  document.body.setAttribute('data-hasupdate', '1');
});

// update "is cached?" state in UI
[
  'noupdate',
  'cached',
  'init:cached'
].forEach(function(eventName) {
  appCacheNanny.on(eventName, function() {
    document.body.setAttribute('data-iscached', '1');
  });
});
appCacheNanny.on('obsolete', function() {
  document.body.setAttribute('data-iscached', '0');
});
// requesting non-existing path will only succeed when
// app is cached, because of the `/ /` line below FALLBACK
request({
  path: '/non-existing',
  onSuccess: function() {
    document.body.setAttribute('data-iscached', '1');
  },
  onError: function(xhr) {
    console.log('You can ignore the failing request to /non-existing. It\'s just a test if the app is cached or not.')

    // IE response with error code, but returns the text
    if (/appCache Demo page/.test(xhr.responseText)) {
      document.body.setAttribute('data-iscached', '1');
    }
  }
});

function log (type, text) {
  var item = document.createElement('p');

  item.innerHTML = '<strong>'+type+'</strong> ' + text;
  item.className = type;
  document.querySelector('#logs').appendChild(item);
  document.body.setAttribute('data-haslogs', '1');
}

function clearLogs() {
  document.querySelector('#logs').innerHTML = '';
  document.body.setAttribute('data-haslogs', '0');
}

function check() {
  log('command', 'appCacheNanny.update()');
  appCacheNanny.update();
}
function start (interval) {
  if (interval) {
    log('command', 'appCacheNanny.start({checkInterval: '+interval+'})');
    appCacheNanny.start({checkInterval: interval});
  } else {
    log('command', 'appCacheNanny.start()');
    appCacheNanny.start();
  }
  document.body.setAttribute('data-isautoupdating', '1');
}
function stop () {
  log('command', 'appCacheNanny.stop()');
  appCacheNanny.stop();
  document.body.setAttribute('data-isautoupdating', '0');
}

function bumpVersion () {
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
      appCacheNanny.update()
      appCacheNanny.on('obsolete', createManifest)
    },
    onError: function() {
      log('error', 'Could not remove manifest – server error');
    }
  });
}

function createManifest () {
  request({
    path: '/recreate-manifest',
    onSuccess: function() {
      log('server', 'Cache manifes recreated.');
      appCacheNanny.off('obsolete', createManifest)
    },
    onError: function() {
      log('error', 'Could not recreate manifest – server error');
    }
  });
}



function request(options) {
  var req = new XMLHttpRequest();
  req.open('GET', options.path, true);

  req.onload = function() {
    if (req.status !== 200){
      return options.onError && options.onError(req);
    }
    options.onSuccess && options.onSuccess(req.responseText);
  };

  req.onerror = function() {
    options.onError && options.onError(req);
  }
  req.send();
}
