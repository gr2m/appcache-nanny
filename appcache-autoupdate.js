(function(global){
  'use strict';

  // AutoUpdate
  // ==========
  //
  // a helper class for autoupdating HTML5 offline cache (appcache)
  // Recommended reads:
  //
  // - http://www.html5rocks.com/en/tutorials/appcache/beginner/
  // - http://alistapart.com/article/application-cache-is-a-douchebag
  //
  var AutoUpdate = (function() { // public event API, requires jQuery/Zepto
    var fallback = { bind: noop, on: noop, trigger: noop, unbind: noop };
    var eventProvider = global.jQuery || global.Zepto;
    return eventProvider && eventProvider({}) || fallback;
  })();

  //
  //
  //
  AutoUpdate.isSupported = function isSupported() {
    var hasAppCacheSupport = !! global.applicationCache;
    var documentHasManifestAttribute = !! document.documentElement.getAttribute('manifest');

    return hasAppCacheSupport && documentHasManifestAttribute;
  };

  //
  // request the appcache.manifest file and check if there's an update
  //
  AutoUpdate.check = function check() {
    if (! AutoUpdate.isSupported()) return;
    applicationCache.check();
  };

  //
  // start auto updating. Optionally pass interval in ms to
  // overwrite the current.
  //
  var intervalPointer;
  AutoUpdate.start = function start (interval) {
    if (interval) checkInterval = interval;

    global.clearInterval(intervalPointer);
    intervalPointer = global.setInterval(AutoUpdate.check, checkInterval);
  };

  //
  // stop auto updating
  //
  AutoUpdate.stop = function stop() {
    global.clearInterval(intervalPointer);
  };

  //
  // returns true if an update has been fully received, otherwise false
  //
  AutoUpdate.hasUpdate = function hasUpdate() {
    return hasUpdateFlag;
  };

  //
  // overwrite default checkInterval
  // Do not allow less than 1s
  //
  AutoUpdate.setInterval = function setInterval(intervalInMs) {
    checkInterval = Math.max(parseInt(intervalInMs) || 0, 1000);
  };

  //
  // overwrite default checkInterval when offline
  //
  AutoUpdate.setInterval = function setOfflineInterval(intervalInMs) {
    checkOfflineInterval = Math.max(parseInt(intervalInMs) || 0, 1000);
  };

  // Private
  // -------

  // default check interval in ms
  var checkInterval = 30000;

  // optional: shorter interval when offline
  var checkOfflineInterval;

  // flag if there is a pending update, being applied after next page reload
  var hasUpdateFlag = false;

  // flag if there was an error updating the appCache, usually meaning
  // it couldn't connect, a.k.a. you're offline.
  var hasNetworkError = false;

  //
  // setup AutoUpdate
  //
  var doneSetup = false;
  var noop = function(){};
  function setup() {
    var dataSetting;

    if (doneSetup) return;
    doneSetup = true;

    if (! AutoUpdate.isSupported()) {
      AutoUpdate.check = noop;
      return;
    }

    // Fired when the manifest resources have been newly redownloaded.
    on('updateready', function() {
      // I have seen both Chorme & Firefox throw exceptions when trying
      // to swap cache on updateready. I was not able to reproduce it,
      // for for the sake of sanity, I'm making it fail silently
      try {
        AutoUpdate.swapCache();
        hasUpdateFlag = true;
        AutoUpdate.trigger('updateready');
      } catch(error) {}
    });

    // Fired after the first cache of the manifest.
    on('cached', function() {
      hasUpdateFlag = true;
    });

    // fired when manifest download failed
    on('error',        handleNetworkError);

    // fired when manifest download succeeded
    on('noupdate',     handleNetworkSucces);
    on('cached',       handleNetworkSucces);
    on('updateready',  handleNetworkSucces);
    on('progress',     handleNetworkSucces);
    on('downloading',  handleNetworkSucces);

    // when browser goes online/offline, trigger check to double check.
    global.addEventListener('online', AutoUpdate.check, false);
    global.addEventListener('offline', AutoUpdate.check, false);

    dataSetting = document.documentElement.getAttribute('data');

    if (dataSetting === 'false') return;
    if (!dataSetting) return AutoUpdate.start();

    AutoUpdate.start(parseInt(dataSetting));
  }

  //
  // interface to bind events to cache events
  //
  function on(event, callback) {
    applicationCache.addEventListener(event, callback, false);
  }

  //
  //
  //
  function handleNetworkSucces() {
    if (! hasNetworkError) return;
    hasNetworkError = false;

    // reset check interval
    AutoUpdate.start(checkInterval);

    AutoUpdate.trigger('online');
  }

  //
  //
  //
  function handleNetworkError () {
    if (hasNetworkError) return;
    hasNetworkError = true;

    // Edge case: private mode in Safari & FF say they support applicationCache,
    // but they fail. To get arround that, we only trigger the offline event
    // when applicationCache.status != uncached
    if (applicationCache.status === applicationCache.UNCACHED) return;

    // check with offline interval
    AutoUpdate.start(checkOfflineInterval || checkInterval);

    AutoUpdate.trigger('offline');
  }

  setup();

  global.AutoUpdate = AutoUpdate;
})(window);
