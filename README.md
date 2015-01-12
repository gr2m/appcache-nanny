The appCache Nanny
==================

> Teaches the applicationCache douchebag some manners!

[![Build Status](https://travis-ci.org/gr2m/appcache-nanny.svg)](https://travis-ci.org/gr2m/appcache-nanny)

As we all know, the [Application Cache is a Douchbag](http://alistapart.com/article/application-cache-is-a-douchebag).
It's time to teach it some manners – The appCache Nanny for Rescue!

No more manifest attributes on your HTML files. Whether you want to cache
your assets offline or not, when to start ... You Are In Control™

Have a glance:

```js
// start to check for updates every 30s
appCacheNanny.start()

// optionally, pass intervals in ms
appCacheNanny.start({checkInterval: 10000})

// you can also check for updates at any time
appCacheNanny.update()

// The appCache nanny tells you if there is a new update available
appCacheNanny.hasUpdate()

// She tells you about all relevant applicationCache events
appCacheNanny.on('update', handleUpdate)
appCacheNanny.on('error', handleError)
appCacheNanny.on('obsolete', handleObsolete)
appCacheNanny.on('noupdate', handleNoupdate)
appCacheNanny.on('downloading', handleDownloading)
appCacheNanny.on('progress', handleProgress)
appCacheNanny.on('cached', handleCached)
appCacheNanny.on('updateready', handleUpdateready)

// plus some extra ones
appCacheNanny.on('init:downloading', handleInitDownloading)
appCacheNanny.on('init:progress', handleInitProgress)
appCacheNanny.on('init:cached', handleInitCached)
appCacheNanny.on('start', handleStart)
appCacheNanny.on('stop', handleStop)

// options
appCacheNanny.set('loaderPath', '/path/to/my-custom-loader.html')
appCacheNanny.set({ 'loaderPath': '/path/to/my-custom-loader.html' })
appCacheNanny.get('loaderPath')
appCacheNanny.get() // returns all options
```

Setup
-----

1. Copy `appcache-loader.html` into the root directory of your app,
   so that it's accessible at `/appcache-loader.html`.
2. Create the `manifest.appcache` file and put it in the root directory
   of your app, next to `/appcache-loader.html`. If you use a different
   name, make sure to set it accordingly in `appcache-loader.html`.

Then load the `appache-nanny.js` on your HTML pages.

```html
<script src="appache-nanny.js" async></script>
```

If you use [bower](http://bower.io/), you can install it using:

```
bower install --save appcache-nanny
```

Background
----------

I extracted `appcache-nanny.js` from [minutes.io](https://minutes.io), which is an [Offline First](http://offlinefirst.org/)
web application, anno 2011. It's battle tested by a ton of users, devices, internet environments.

minutes.io checks every 30 seconds if an update is available. And whenever the user navigates
from one view to another, it reloads the page in case there is. As the assets are all cached,
the user cannot tell that his page got just reloaded. It's silent, without any notification,
or a prompt asking the user to reload the page. And it works very well so far.

Demo
----

The appCache Nanny comes with a simple server for testing. Start it using Node:

```js
npm start
```

It will start a local server at http://localhost:8888.

This is a static server with a few hidden features:

- `GET /bump-version` increases the app version, so an update gets triggered
  on next check
- `GET /remove-manifest` makes `GET /manifest.appcache` return 404, so it
  becomes obsolete on next check
- `GET /recreate-manifest` undoes the previous step.


Gotchas
-------

### Unlisted paths get loaded from the server, not from cache (via FALLBACK)

Thanks to the [iframe hack](http://labs.ft.com/category/tutorial/), your HTML pages do
not get added to the list of cached assets locally, and won't get checked for updates
each time. Which is great especially for a Single Page Application with pushState enabled.
But if your app has paths like `/welcome`, `/Dashboard`, `Meeting/123` and your `manifest.appcache`
looks something like

```
CACHE MANIFEST

/
/app.js
/styles.css

FALLBACK:
/ /
```

Beware that opening `http://yourapp.com` will always show the currently cached
version, as it is explicetly listed, while `http://yourapp.com/welcome` and
other paths will load the page from the server, unless the user is offline.

You might have learned that assets that are not listed in the cache manifest
cannot be loaded at all, even when online. But that's not the case if the
loaded HTML page does not have the `manifest` property on the `html` tag.


Acknowledgement
---------------

The appCache Nanny is based on tremendeous amount of research others have done
on applicationCache. I'd like to highlight

* **[Jake Archibald](https://twitter.com/jaffathecake)**: [Application Cache is a Douchebag](http://alistapart.com/article/application-cache-is-a-douchebag)
  and for some great laughs: [Network connectivity: optional](http://www.youtube.com/watch?v=Z7sRMg0f5Hk)
* **[Financial Times Lab Team](http://labs.ft.com)**: [Tutorial: How to make an offline HTML5 web app](http://labs.ft.com/category/tutorial/),
  also recommended: [Andrew Betts – Offline rules](http://www.youtube.com/watch?v=Ut4R4udJ4Gw)
* **[Eric Bidelman](https://twitter.com/ebidel)**: [A Beginner's Guide to Using the Application Cache](http://www.html5rocks.com/en/tutorials/appcache/beginner/)
* [Appcache Facts](http://appcachefacts.info/) by [Mark Christian](https://twitter.com/shinypb) & [Peter Lubbers](https://twitter.com/peterlubbers)


TODOs / IDEAs
-------------

* on obsolete, remove the iframe, load it again to check if a new *.appcache path
  has been set. If yes, update and trigger `updateready` event, otherwise trigger
  `obsolete` event

Fine Print
----------

The appCache Nanny has been authored by [Gregor Martynus](https://github.com/gr2m),
proud member of [Team Hoodie](http://hood.ie/). Support our work: [gittip us](https://www.gittip.com/hoodiehq/).

License: MIT
