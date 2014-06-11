/* global define */
'use strict';

(function (root, factory) {

  // based on https://github.com/allouis/minivents/blob/master/minivents.js
  function Events(){
    var events = {};
    var api = this;

    // listen to events
    api.on = function on(type, func, ctx){
      if (!events[type]) (events[type] = []);
      events[type].push({f:func, c:ctx});
    };

    // stop listening to event / specific callback
    api.off = function off(type, func){
      var list = events[type] || [];
      var i = list.length = func ? list.length : 0;
      while(i-->0) if (func === list[i].f) list.splice(i,1);
    };

    // send event, callbacks will be triggered
    api.trigger = function trigger(){
      var args = Array.apply([], arguments);
      var list = events[args.shift()] || [];
      var i = list.length;
      var j;
      for(j=0;j<i;j++) list[j].f.apply(list[j].c, args);
    };

    // aliases
    api.bind = api.on;
    api.unbind = api.off;
    api.emit = api.trigger;
  }


  if (typeof define === 'function' && define.amd) {
    define([], function () {
      root.AutoUpdate = factory(applicationCache, Events);
      return root.AutoUpdate;
    });
  } else if (typeof exports === 'object') {
    module.exports = factory(applicationCache, Events);
  } else {
    root.AutoUpdate = factory(applicationCache, Events);
  }
})(this, function(applicationCache, Events){ // jshint ignore:line

  // AutoUpdate
  // ==========
  //
  // a helper class for autoupdating HTML5 offline cache (appcache)
  // Recommended reads:
  //
  // - http://www.html5rocks.com/en/tutorials/appcache/beginner/
  // - http://alistapart.com/article/application-cache-is-a-douchebag
  //
  var AutoUpdate = new Events();

  //
  //
  //
  AutoUpdate.isSupported = function isSupported() {
    var hasAppCacheSupport = !! applicationCache;
    var documentHasManifestAttribute = !! document.documentElement.getAttribute('manifest');

    return hasAppCacheSupport && documentHasManifestAttribute;
  };

  //
  // request the appcache.manifest file and check if there's an update
  //
  AutoUpdate.check = function check() {
    if (! AutoUpdate.isSupported()) return false;
    try {
      applicationCache.update();
      return true;
    } catch (e) {
      // there might still be cases when ApplicationCache is not support
      // e.g. in Chrome, when returned HTML is status code 40X
      AutoUpdate.check = noop;
      return false;
    }

  };

  //
  // start auto updating. Optionally pass interval in ms to
  // overwrite the current.
  //
  var intervalPointer;
  AutoUpdate.start = function start (interval) {
    if (interval) checkInterval = interval;

    clearInterval(intervalPointer);
    intervalPointer = setInterval(AutoUpdate.check, checkInterval);
  };

  //
  // stop auto updating
  //
  AutoUpdate.stop = function stop() {
    clearInterval(intervalPointer);
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
      // but for the sake of sanity, I'm making it fail silently
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
    addEventListener('online', AutoUpdate.check, false);
    addEventListener('offline', AutoUpdate.check, false);

    dataSetting = document.documentElement.getAttribute('data-autoupdate');

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
  function handleNetworkSucces(event) {
    if (! hasNetworkError) return;
    hasNetworkError = false;

    // reset check interval
    AutoUpdate.start(checkInterval);

    AutoUpdate.trigger('online');
    AutoUpdate.trigger(event.type);
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

  return AutoUpdate;
});
