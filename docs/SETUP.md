# Setup Instructions

Create a Typescript React App
```
npx create-react-app --template typescript sf-xp-debugger
````

```
npm i @salesforce-ux/design-system @salesforce/design-system-react jsforce "https://gitpkg.now.sh/swisscat/debug-log-analyzer/log-viewer?main&scripts.postinstall=npm%20install%20--ignore-scripts%20%26%26%20npm%20run%20build" webextension-polyfill

npm i -D @types/har-format @types/jsforce @types/webextension-polyfill bestzip postinstall web-ext @craco/craco@alpha npm-run-all copy-and-watch

package.json:

add

  "postinstall": {
    "@salesforce-ux/design-system/assets/styles/salesforce-lightning-design-system.min.css": "link public/lib/",
    "@salesforce-ux/design-system/assets/icons": "link public/lib/",
    "webextension-polyfill/dist/browser-polyfill.min.*": "link public/lib/",
    "logviewer/out/*": "copy public/lib/logviewer/"
  },

add
,
    "postinstall": "postinstall"

```