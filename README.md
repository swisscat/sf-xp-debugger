# sf-xp-debugger

Cross-browser extension providing capability to debug traces directly in the browser developer tools for Experience Cloud Websites.

[![Build Status](https://app.travis-ci.com/swisscat/sf-xp-debugger.svg?branch=master)](https://app.travis-ci.com/swisscat/sf-xp-debugger)

## [:pushpin: Add to Chrome](https://chrome.google.com/webstore/detail/salesforce-experience-clo/gbhgnplfajpgpdiflbpfllfolnamcnac)

The extension is developed as cross-browser, but has been only tested on Chrome. Firefox will be added soon.

It makes use of https://github.com/financialforcedev/debug-log-analyzer to display log information.

![Request Example](assets/request-example.png "Request Example")
![Request Example](assets/stack-example.png "Stack Example")

## Development

### Chrome
 * Download repository
 * `npm install`
 * `npm run start:chrome`

### Firefox (NOT READY)
 * Download repository
 * `npm install`
 * `npm run start:firefox`

## Icon

Agent icons created by Freepik - Flaticon: https://www.flaticon.com/free-icons/agent

## TODO

* Use web-ext on chrome + firefox with saved profile in ignored folder
* Remove errors on Chrome technical pages