/* global describe, it, after */
module.exports = function(browser, options, callback) {
  var error = null;

  function setError(err) {
    error = err;
  }

  browser
    .execute('return navigator.userAgent')

    // version is loaded from server set with JavaScript asynchronously
    .elementByCss('#version').text()
      .should.become('1')
    // cache button should be visible, as app is not cached initially
    .elementByCss('#btn-cache').isDisplayed()
      .should.become(true)
    // when clicked on cache button, "cached" event should eventually appear
    .elementByCss('#btn-cache').click()

    .waitForConditionInBrowser('((document.querySelector("#logs") && document.querySelector("#logs").textContent) || "").indexOf("cached") >= 0', 10 * 1000, 1000)
    .elementByCss('#logs').text()
      .should.eventually.match(/cached/)

    // non-existing paths should no load due to the appCache FALLBACK: / /
    .get(options.baseUrl + '/appcache-fallback-test')

    .elementByCss('#version').text()
      .should.become('1')

    // Is cached? should become "yes"
    .waitForConditionInBrowser('document.body.dataset.iscached === "1"', 10 * 1000)

    // check for update
    .elementByCss('#btn-check').click()

    // wait until first "noupdate" is visible
    .waitForConditionInBrowser('document.querySelector("#logs").textContent.search(/noupdate/) >= 0', 10 * 1000)

    // catch error now as we need to ignore error by next command
    .catch(setError)
    .waitForConditionInBrowser('document.querySelectorAll("#logs").length === 2', 3 * 1000)
    .then(function() {
      // https://github.com/gr2m/appcache-nanny/issues/7
      // Note: despite having the exact same setup on saucelabs as locally,
      //       I was not able to reproduce the bug. Leaving this test for reference
      throw new Error('"noupdate" event should only be triggered once');
    }, function () {
      // expected error, ignore
    })

    .catch(setError)
    .fin(function() {
      // callback(error);
      return browser.quit().then(callback.bind(null, error));
    })
    .done();
};
