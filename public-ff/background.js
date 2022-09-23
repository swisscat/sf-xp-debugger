browser.runtime.onMessage.addListener(async (event) => {
  switch (event.type) {
    case 'getCookie':
      return await browser.cookies.get(event.data);
  }
})

let ports = [];

browser.runtime.onConnect.addListener(port => {
  const portKey = ports.push(port) - 1;

  port.onDisconnect.addListener(p => {
    ports = ports.splice(portKey, 1);
  })
})

browser.cookies.onChanged.addListener(({ cookie }) => {
  ports.forEach(port => {
    if (port.name === 'cookie-change-listener') {
      port.postMessage({cookie});
    } 
  })
});