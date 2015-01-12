// appCacheNanny
// =============
//
// Teaches your applicationCache some manners! Because, you know,
// http://alistapart.com/article/application-cache-is-a-douchebag
//

/* global define */
'use strict';

(function (root, factory) {
  var appCache = (typeof applicationCache === 'undefined') ? undefined : applicationCache;

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
      root.appCacheNanny = factory(appCache, Events);
      return root.appCacheNanny;
    });
  } else if (typeof exports === 'object') {
    module.exports = factory(appCache, Events);
  } else {
    root.appCacheNanny = factory(appCache, Events);
  }
})(this, function(applicationCache, Events){ // jshint ignore:line

  var DEFAULT_MANIFEST_LOADER_PATH = '/appcache-loader.html';
  var DEFAULT_CHECK_INTERVAL = 30000;

  var appCacheNanny = new Events();
  var nannyOptions = {
    loaderPath: DEFAULT_MANIFEST_LOADER_PATH,
    checkInterval: DEFAULT_CHECK_INTERVAL,
    offlineCheckInterval: DEFAULT_CHECK_INTERVAL
  };

  //
  //
  //
  appCacheNanny.isSupported = function isSupported() {
    return !! applicationCache;
  };

  //
  // request the appcache.manifest file and check if there's an update
  //
  appCacheNanny.update = function update() {
    trigger('update');
    if (! setupDone) {
      setupCallbacks.push(appCacheNanny.update);
      if (! setupPending) {
        setup();
        setupPending = true;
      }
      return true;
    }
    if (! appCacheNanny.isSupported()) return false;
    try {
      applicationCache.update();
      return true;
    } catch (e) {
      // there might still be cases when ApplicationCache is not support
      // e.g. in Chrome, when returned HTML is status code 40X, or if
      // the applicationCache became obsolete
      appCacheNanny.update = noop;
      return false;
    }
  };

  //
  // start auto updating. Optionally pass interval in ms to
  // overwrite the current.
  //
  var intervalPointer;
  var setupDone = false;
  var setupPending = false;
  appCacheNanny.start = function start(options) {
    if (options) appCacheNanny.set(options);

    if (! setupDone) {
      setupCallbacks.push(appCacheNanny.start);
      if (! setupPending) {
        setup();
        setupPending = true;
      }
      return true;
    }

    clearInterval(intervalPointer);

    // check with offline interval
    checkInterval = hasNetworkError ? appCacheNanny.get('offlineCheckInterval') : appCacheNanny.get('checkInterval');

    intervalPointer = setInterval(appCacheNanny.update, checkInterval);
    isCheckingForUpdatesFlag = true;
    trigger('start');
  };

  //
  // stop auto updating
  //
  appCacheNanny.stop = function stop() {
    clearInterval(intervalPointer);
    isCheckingForUpdatesFlag = false;
    trigger('stop');
  };

  //
  // returns true if the nanny is checking periodically for updates
  //
  appCacheNanny.isCheckingForUpdates = function isCheckingForUpdates() {
    return isCheckingForUpdatesFlag;
  };

  //
  // returns true if an update has been fully received, otherwise false
  //
  appCacheNanny.hasUpdate = function hasUpdate() {
    return hasUpdateFlag;
  };

  //
  //
  //
  appCacheNanny.set = function setOption(key,  value) {
    var property, newSettings;
    if (typeof key === 'object') {
      newSettings = key;
      for (property in newSettings) if (newSettings.hasOwnProperty(property)) {
        nannyOptions[property] = newSettings[property];
      }
      return;
    }
    nannyOptions[key] = value;
  };

  //
  //
  //
  appCacheNanny.get = function getOption(key) {
    var property, settings = {};
    if (key) return nannyOptions[key];

    for (property in nannyOptions) if (nannyOptions.hasOwnProperty(property)) {
      settings[property] = nannyOptions[property];
    }
    return settings;
  };

  // Private
  // -------


  // this is the internal state of checkInterval.
  // It usually differs between online / offline state
  var checkInterval = DEFAULT_CHECK_INTERVAL;

  // flag if there is a pending update, being applied after next page reload
  var hasUpdateFlag = false;

  // flag whether the nanny is checking for updates in the background
  var isCheckingForUpdatesFlag = false;

  // flag if there was an error updating the appCache, usually meaning
  // it couldn't connect, a.k.a. you're offline.
  var hasNetworkError = false;

  //
  var isInitialDownload = false;

  //
  // setup appCacheNanny
  //
  var noop = function(){};
  var APPCACHE_STORE_KEY = '_appcache_nanny';
  var setupCallbacks = [];
  function setup() {
    var iframe;
    var scriptTag;

    try {
      isInitialDownload = ! localStorage.getItem(APPCACHE_STORE_KEY);
      localStorage.setItem(APPCACHE_STORE_KEY, '1');
    } catch(e) {}

    if (! appCacheNanny.isSupported()) {
      appCacheNanny.update = noop;
      return;
    }

    // https://github.com/gr2m/appcache-nanny/issues/7
    if (applicationCache.status !== applicationCache.UNCACHED) {
      subscribeToEvents();
      setupPending = false;
      setupDone = true;
      setupCallbacks.forEach(function(callback) {
        callback();
      });
      return;
    }

    // load the appcache-loader.html using an iframe
    iframe = document.createElement('iframe');
    iframe.src = nannyOptions.loaderPath;
    iframe.style.display = 'none';
    iframe.onload = function() {
      // we use the iFrame's applicationCache Object now
      applicationCache = iframe.contentWindow.applicationCache;

      subscribeToEvents();
      setupPending = false;
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

    // when browser goes online/offline, look for updates to make sure.
    addEventListener('online', appCacheNanny.update, false);
    addEventListener('offline', appCacheNanny.update, false);
  }

  //
  // interface to bind events to cache events
  //
  function on(eventName, callback) {
    applicationCache.addEventListener(eventName, callback, false);
  }

  //
  // Trigger event on appCacheNanny. Once an update is ready, we
  // keep looking for another update, but we stop triggering events.
  //
  function trigger(eventName) {
    if (hasUpdateFlag) return;
    appCacheNanny.trigger(eventName);
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
        appCacheNanny.trigger('updateready');
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


    // re-trigger event via appCacheNanny
    trigger(prefix + event.type);

    if (! hasNetworkError) return;
    hasNetworkError = false;

    appCacheNanny.start();
    trigger('online');
  }

  //
  //
  //
  function handleNetworkError () {
    // re-trigger event via appCacheNanny
    trigger('error');

    if (hasNetworkError) return;
    hasNetworkError = true;

    // Edge case: private mode in Safari & FF say they support applicationCache,
    // but they fail. To get arround that, we only trigger the offline event
    // when applicationCache.status != uncached
    if (applicationCache.status === applicationCache.UNCACHED) return;

    appCacheNanny.start();

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
    // re-trigger event via appCacheNanny
    trigger('obsolete');

    if (hasNetworkError) {
      hasNetworkError = false;
      trigger('online');
    }

    // Once applicationCache status is obsolete, calling .udate() throws
    // an error, so we stop checking here
    appCacheNanny.stop();
  }

  return appCacheNanny;
});
