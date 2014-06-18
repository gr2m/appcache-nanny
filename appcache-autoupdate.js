// AutoUpdate
// ==========
//
// a helper class for autoupdating HTML5 offline cache (appcache)
//
// Recommended reads:
//
// - http://www.html5rocks.com/en/tutorials/appcache/beginner/
// - http://alistapart.com/article/application-cache-is-a-douchebag
//

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

  var AutoUpdate = new Events();

  //
  //
  //
  AutoUpdate.isSupported = function isSupported() {
    return !! applicationCache;
  };

  //
  // request the appcache.manifest file and check if there's an update
  //
  AutoUpdate.check = function check() {
    if (! setupDone) {
      setupCallbacks.push(AutoUpdate.check);
      setup();
      return true;
    }
    if (! AutoUpdate.isSupported()) return false;
    try {
      applicationCache.update();
      return true;
    } catch (e) {
      // there might still be cases when ApplicationCache is not support
      // e.g. in Chrome, when returned HTML is status code 40X, or if
      // the applicationCache became obsolete
      AutoUpdate.check = noop;
      return false;
    }
  };

  //
  // start auto updating. Optionally pass interval in ms to
  // overwrite the current.
  //
  var intervalPointer;
  var setupDone = false;
  AutoUpdate.start = function start(interval) {
    if (! setupDone) {
      setupCallbacks.push(AutoUpdate.start);
      setup();
      return true;
    }
    if (interval) checkInterval = interval;

    clearInterval(intervalPointer);
    intervalPointer = setInterval(AutoUpdate.check, checkInterval);
    trigger('start');
  };

  //
  // stop auto updating
  //
  AutoUpdate.stop = function stop() {
    clearInterval(intervalPointer);
    trigger('stop');
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
    checkInterval = Math.max(parseInt(intervalInMs, 10) || 0, 1000);
  };

  //
  // overwrite default checkInterval when offline
  //
  AutoUpdate.setOfflineInterval = function setOfflineInterval(intervalInMs) {
    checkOfflineInterval = Math.max(parseInt(intervalInMs, 10) || 0, 1000);
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
  var isInitialDownload = false;

  //
  // setup AutoUpdate
  //
  var noop = function(){};
  var APPCACHE_STORE_KEY = '_appcache_autoupdate';
  var setupCallbacks = [];
  function setup() {
    var iframe;
    var scriptTag;

    try {
      isInitialDownload = ! localStorage.getItem(APPCACHE_STORE_KEY);
      localStorage.setItem(APPCACHE_STORE_KEY, '1');
    } catch(e) {}

    if (! AutoUpdate.isSupported()) {
      AutoUpdate.check = noop;
      return;
    }

    // load the appcache-loader.html using an iframe
    iframe = document.createElement('iframe');
    iframe.src = '/appcache-loader.html';
    iframe.style.display = 'none';
    iframe.onload = function() {
      // we use the iFrame's applicationCache Object now
      applicationCache = iframe.contentWindow.applicationCache;

      subscribeToEvents();
      setupDone = true;
      setupCallbacks.forEach(function(callback) {
        callback();
      });
    };
    iframe.onerror = function() {
      throw new Error('/appcache-loader.html could not be loaded.');
    };

    scriptTag = document.getElementsByTagName('script')[0];
    scriptTag.parentNode.insertBefore(iframe,scriptTag);
  }

  //
  //
  //
  function subscribeToEvents () {
    // Fired when the manifest resources have been downloaded.
    on('updateready', handleUpdateReady);

    // fired when manifest download request failed
    // (no connection or 5xx server response)
    on('error',        handleNetworkError);

    // fired when manifest download request succeeded
    // but server returned 404 / 410
    on('obsolete',     handleNetworkObsolete);

    // fired when manifest download succeeded
    on('noupdate',     handleNetworkSucces);
    on('cached',       handleNetworkSucces);
    on('updateready',  handleNetworkSucces);
    on('progress',     handleNetworkSucces);
    on('downloading',  handleNetworkSucces);

    // when browser goes online/offline, trigger check to double check.
    addEventListener('online', AutoUpdate.check, false);
    addEventListener('offline', AutoUpdate.check, false);
  }

  //
  // interface to bind events to cache events
  //
  function on(eventName, callback) {
    applicationCache.addEventListener(eventName, callback, false);
  }

  //
  // Trigger event on AutoUpdate. Once an update is ready, we
  // keep looking for another update, but we stop triggering events.
  //
  function trigger(eventName) {
    if (hasUpdateFlag) return;
    AutoUpdate.trigger(eventName);
  }

  //
  //
  //
  function handleUpdateReady () {
    // I have seen both Chorme & Firefox throw exceptions when trying
    // to swap cache on updateready. I was not able to reproduce it,
    // but for the sake of sanity, I'm making it fail silently
    try {

      if (! hasUpdateFlag) {
        hasUpdateFlag = true;
        // don't use trigger here, otherwise the event wouldn't get triggered
        AutoUpdate.trigger('updateready');
      }
      applicationCache.swapCache();
    } catch(error) {}
  }

  //
  //
  //
  function handleNetworkSucces(event) {
    var prefix = '';

    // when page gets opened for the very first time, it already has
    // the correct assets, but appCache still triggers 'downloading',
    // 'progress' and 'cached' events. Once the first 'cached' event
    // gets triggered, all assets are cached offline. We prefix these
    // initial events with 'init:'
    if (isInitialDownload) {
      prefix = 'init:';
      if (event.type === 'cached') {
        isInitialDownload = false;
      }
    }


    // re-trigger event via AutoUpdate
    trigger(prefix + event.type);

    if (! hasNetworkError) return;
    hasNetworkError = false;

    // reset check interval
    AutoUpdate.start(checkInterval);

    trigger('online');
  }

  //
  //
  //
  function handleNetworkError () {
    // re-trigger event via AutoUpdate
    trigger('error');

    if (hasNetworkError) return;
    hasNetworkError = true;

    // Edge case: private mode in Safari & FF say they support applicationCache,
    // but they fail. To get arround that, we only trigger the offline event
    // when applicationCache.status != uncached
    if (applicationCache.status === applicationCache.UNCACHED) return;

    // check with offline interval
    AutoUpdate.start(checkOfflineInterval || checkInterval);

    trigger('offline');
  }

  //
  // The 'obsolete' event gets triggered if the requested *.appcache file
  // has been removed or renamed. The intent behind renaming an *.appcache
  // file is to clear all locally cached files, it's the only way to do so.
  // Therefore we don't treet it as an error, it usually means that there
  // is an update availble that becomes visible after the next page reload.
  //
  function handleNetworkObsolete () {
    // re-trigger event via AutoUpdate
    trigger('obsolete');

    if (hasNetworkError) {
      hasNetworkError = false;
      trigger('online');
    }

    // Once applicationCache status is obsolete, calling .udate() throws
    // an error, so we stop checking here
    AutoUpdate.stop();

    // Tell the user that an update is waiting on next page reload
    if (! hasUpdateFlag) {
      hasUpdateFlag = true;
      // don't use trigger here, otherwise the event wouldn't get triggered
      AutoUpdate.trigger('updateready');
    }
  }

  return AutoUpdate;
});
