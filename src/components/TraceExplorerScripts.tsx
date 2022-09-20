// @ts-nocheck

export function dispatchEventOnNavigation() {
  const { pushState, replaceState, _isEventLoaded } = window.history;

  if (_isEventLoaded) {
    return;
  }
  window.history._isEventLoaded = true;

  const notifyUrlChange = (url) => {
    document.dispatchEvent(new CustomEvent('urlChange', { detail: { url } }))
  }

  window.history.pushState = (state, unused, url) => {
    pushState.apply(window.history, [state, unused, url]);
    notifyUrlChange(url);
  }
  window.history.replaceState = (state, unused, url) => {
    replaceState.apply(window.history, [state, unused, url]);
    notifyUrlChange(url);
  }
}

export function sendMessageOnNavigationEvent() {
  const _browser = chrome || browser;

  if (!_browser) {
    throw "Could not find the browser API"
  }

  if (document._sendMessageConfigured) {
    return;
  }

  document._sendMessageConfigured = 1;

  document.addEventListener('urlChange', (e) => {
    _browser.runtime.sendMessage({ type: 'urlChange', url: e.detail.url });
  });
}