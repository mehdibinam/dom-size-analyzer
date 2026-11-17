chrome.runtime.onConnect.addListener(devToolsConnection => {
  chrome.runtime.onMessage.addListener((request) => {
    console.log('from bg', request);
    devToolsConnection.postMessage(request);
  });
});

/**
 * injecting contentscript(s) for existing tabs
 */
const injectIntoTab = (tab) => {
  if (tab && tab.id && tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["contentScript.js"]
    }).catch(error => {
      console.error('Inject failed for tab', tab.id, ':', error.message);
    });
  }
};

chrome.windows.getCurrent({ populate: true }, (window) => {
  for (let j = 0; j < window.tabs.length; j++) {
    const currentTab = window.tabs[j];
    injectIntoTab(currentTab);
  }
});