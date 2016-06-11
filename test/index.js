/* global describe, beforeEach, it */

require('@gr2m/frontend-test-setup')

function toValue (result) {
  if (isError(result.value)) {
    var error = new Error(result.value.message)
    Object.keys(result.value).forEach(function (key) {
      error[key] = result.value[key]
    })
    throw error
  }

  return result.value
}

function isError (value) {
  return value && value.name && /error/i.test(value.name)
}

describe('hoodie.account', function () {
  this.timeout(30000)

  beforeEach(function () {
    return this.client.url('/')
  })

  it('should be funky', function () {
    return this.client

      // version is loaded from server set with JavaScript asynchronously
      .getText('#version')
        .should.eventually.equal('1')
      // cache button should be visible, as app is not cached initially
      .isVisible('#btn-cache')
        .should.eventually.equal(true)
      // when clicked on cache button, "cached" event should eventually appear
      .click('#btn-cache')

      .waitUntil(function () {
        return this.execute(function () {
          var $logs = document.querySelector('#logs')
          if (!$logs) return
          return ($logs.textContent || '').indexOf('cached') >= 0
        }).then(toValue)
      }, 10 * 1000, 1000)
      .getText('#logs')
        .should.eventually.match(/cached/)

      // non-existing paths should no load due to the appCache FALLBACK: / /
      .url('/appcache-fallback-test')

      .getText('#version')
        .should.become('1')

      // Is cached? should become "yes"
      .waitUntil(function () {
        return this.execute(function () {
          return document.body.dataset.iscached === '1'
        }).then(toValue)
      }, 10 * 1000)

      // check for update
      .click('#btn-check')

      // wait until first "noupdate" is visible
      .waitUntil(function () {
        return this.execute(function () {
          return document.querySelector('#logs').textContent.search(/noupdate/) >= 0
        }).then(toValue)
      }, 10 * 1000)
  })
})
