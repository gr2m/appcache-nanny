require('colors');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var wd = require('wd');
var selenium = require('selenium-standalone');
var sauceConnectLauncher = require('sauce-connect-launcher');

var devServer = require('../bin/dev-server');
var test = require('../test');

var username = process.env.SAUCE_USERNAME;
var accessKey = process.env.SAUCE_ACCESS_KEY;

// process.env.CLIENT is a colon seperated list of
// browserName:browserVerion:platform
var tunnelId = process.env.TRAVIS_JOB_NUMBER || 'tunnel-' + Date.now();
var tmp = (process.env.CLIENT || 'selenium:firefox').split(':');
var client = {
  runner: tmp[0],
  browserName: tmp[1],
  version: tmp[2] || null, // Latest
  platform: tmp[3] || null,
  tunnelIdentifier: tunnelId,
  name: tmp[1] + ' - ' + tunnelId,
  // timeouts
  // tunnelTimeout: 30 * 60 * 1000,
  // 'max-duration': 60 * 45,
  // 'command-timeout': 599,
  // 'idle-timeout': 599
};



chai.use(chaiAsPromised);
chai.should();

// enables chai assertion chaining
chaiAsPromised.transferPromiseness = wd.transferPromiseness;

devServer.start(function() {
  if (client.runner === 'saucelabs') {
    startSauceConnect(startTest);
  } else {
    startSelenium(startTest);
  }
});

function startTest(browser, subProcess) {
  // optional extra logging
  // browser.on('status', function(info) {
  //   console.log(info.cyan);
  // });
  browser.on('command', function(eventType, command, response) {
    if (eventType === 'CALL') {
      console.log(' >', command.cyan, (response || '').grey);
    } else {
      console.log(' <', response ? response.replace(/\\n/g,'\n   ') : 'undefined'.grey);
    }
  });


  browser = browser
    .init(client)
    .catch(function(err) {
      console.log('browser.init failed!'.red);
      console.log(err);
      process.exit(1);
    })
    .setAsyncScriptTimeout(30 * 1000)
    .setWaitTimeout(30 * 1000)
    // do always set timeouts in .waitForConditionInBrowser

    .configureHttp({
      timeout: 60000,
      retries: 30,
      retryDelay: 100,
    })

    .get(devServer.info.uri);

  test(browser, {
    baseUrl: devServer.info.uri
  }, function(error) {
    var status = error ? 3 : 0;

    if (error) {
      if (error.name) {
        console.log(error.name.red)
        console.log(error.message)
      } else {
        console.log(error)
      }
    }

    if (subProcess && subProcess.exit) {
      subProcess.exit(status);
    }
    process.exit(status)
  });
}

function startSelenium(callback) {
  selenium({}, {}, function() {
    var browser = wd.promiseChainRemote();
    callback(browser);
  });
}

function startSauceConnect(callback) {

  sauceConnectLauncher({
    username: username,
    accessKey: accessKey,
    tunnelIdentifier: tunnelId
  }, function (err, sauceProcess) {
    if (err) {
      console.error('Failed to connect to saucelabs');
      console.error(err);
      return sauceProcess.exit(1);
    }


    var browser = wd.promiseChainRemote('localhost', 4445, username, accessKey);

    callback(browser, sauceProcess);
  });
}
