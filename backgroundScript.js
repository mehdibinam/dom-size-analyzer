// backgroundScript.js (MV3 service worker)

const portsByTab = new Map(); // tabId -> devtools Port

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'dom-size-analyzer:devtools') return;

  let attachedTabId = null;

  port.onMessage.addListener(async (msg) => {
    const { type, tabId, data } = msg || {};
    if (!tabId) return;

    // Remember mapping
    attachedTabId = tabId;
    portsByTab.set(tabId, port);

    // Ensure content/injectable are ready (best-effort)
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['contentScript.js']
      });
    } catch (_) { /* content script may already be present */ }

    // Relay specific commands to content script
    chrome.tabs.sendMessage(tabId, { type, data, tabId, src: 'background' });
  });

  port.onDisconnect.addListener(() => {
    if (attachedTabId) {
      const p = portsByTab.get(attachedTabId);
      if (p === port) portsByTab.delete(attachedTabId);
    }
  });
});

// Relay messages coming from content script back to DevTools panel
chrome.runtime.onMessage.addListener((request, sender) => {
  const { tab } = sender;
  const tabId = request?.tabID || tab?.id;
  if (!tabId) return;
  const port = portsByTab.get(tabId);
  if (port) {
    port.postMessage(request);
  }
});