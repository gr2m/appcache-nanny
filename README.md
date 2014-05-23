appCache AutoUpdate
===================

> Auto Updates for Offline First Applications

Installation
------------

Install using [bower](http://bower.io/) for usage in browser:

```
bower install --save appcache-autoupdate
```

Usage
-----

Make sure the `manifest` attribute is set on the `<html>` tag.

```html
<html manifest="appcache.manifest">
<script src="appache-autoupdate.js">
```

AutoUpdate starts checking automatically for updates every
30 seconds. To prevent that, add `data-autoupdate="false"`.
You can also alter the check interval by setting a time
in ms: `data-autoupdate="10000"`.

The JS API:

```js
// event API requires jQuery / Zepto to be present
AutoUpdate.on('updateready', reloadPage)

// AutoUpdate also offers reliable online/offline events
// in case the cache manifest could not be downloaded
AutoUpdate.on('offline', showOfflineIndicator)
AutoUpdate.on('online', hideOfflineIndicator)

// set interval for checking for updates in ms
// (default is 30000)
AutoUpdate.setInterval(60000)

// set alternative interval when offline
AutoUpdate.setOfflineInterval(30000)

// reload page when routing, if update is ready
function onRoute(event) {
  if (AutoUpdate.hasUpdate()) {
    location.reload(1)
  }
}
```

Use Case
--------

I extracted `appCache-autoupdate.js` out of [minutes.io](https://minutes.io), which is an [Offline First](http://offlinefirst.org/)
web application, anno 2011. It's battle tested by a ton of users, devices, internet environment.

minutes.io checks every 30 seconds if an update is available. And whenever the user navigates
from one view to another, it reloads the page in case there is. As the assets are all cached,
the user cannot tell that his page got just reloaded. It's silent, without any notification,
or a prompt asking the user to reload the page. And it works very well so far.

Demo
----

I don't have a demo app ready yet, I'm happily accepting pull requests though.
But here's my idea for a tiny node.js app, hosted for free on Heroku or whereever:

1. Autogenerate `appcache.manifest` that changes every 30s
2. Autogenerate `theme.css` that changes the background color every time it gets requested
3. Maka a tiny application with some tabs that the user can navigate between. Make sure the
   URL changes so the app can be reloaded & remain at the current tab.

Fine Print
----------

appCache Autoupdate has been authored by [Gregor Martynus](https://github.com/gr2m),
proud member of [Team Hoodie](http://hood.ie/). Support our work: [gittip us](https://www.gittip.com/hoodiehq/).

License: MIT
