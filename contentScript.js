// contentScript.js (MV3-safe)
// Inject page-level script (injectable.js) to access DOM fully

(function inject() {
  const id = 'dom-size-analyzer-injector';
  if (document.getElementById(id)) return;
  const s = document.createElement('script');
  s.id = id;
  s.src = chrome.runtime.getURL('injectable.js');
  (document.head || document.documentElement).appendChild(s);
  s.onload = () => s.remove();
})();

// Relay custom events <-> extension
window.addEventListener('commandEvent', (e) => {
  const detail = (e || {}).detail || {};
  if (detail?.src === 'content-script') return;
  chrome.runtime.sendMessage(detail);
});

chrome.runtime.onMessage.addListener((msg) => {
  // forward to page
  const ev = new CustomEvent('commandEvent', { detail: { ...msg, src: 'content-script' } });
  window.dispatchEvent(ev);
});