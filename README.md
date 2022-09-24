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
 * `npm run watch`

> :warning: **Do not forget to close the web browser if you stop watch**: You will face ECONNREFUSED when starting again otherwise.

### Firefox
 * Download repository
 * `npm install`
 * `npm run dev:chrome`
 * `npm run dev:firefox` ONCE chrome is watching. Keep in mind that any changes to the manifest.json will require this command to be reloaded!

## Icon

Agent icons created by Freepik - Flaticon: https://www.flaticon.com/free-icons/agent

## TODO

* Delete logs on flush
* Use web-ext on chrome + firefox with saved profile in ignored folder
* Use react-scripts v5 with correct config