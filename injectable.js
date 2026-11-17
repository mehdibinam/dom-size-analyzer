// injectable.js – runs in page context

(function () {
  const BUS_KEY = 'DOM_SIZE_ANALYZER_V2';

  const TYPES = {
    GET_DOM_DETAILS: 'GET_DOM_DETAILS',
    HIGHLIGHT_ELEMENT: 'HIGHLIGHT_ELEMENT',
    REMOVE_HIGHLIGHT: 'REMOVE_HIGHLIGHT',
    PING: 'ping',
  };

  // State to map indices -> elements
  window[BUS_KEY] = {
    elementsArray: [],
    insertIntoElementsArray(el) {
      return this.elementsArray.push(el) - 1;
    }
  };

  // Overlay for highlight
  function ensureOverlay() {
    let ov = document.getElementById('domCountAnalyzerOverlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'domCountAnalyzerOverlay';
      ov.style.zIndex = '2147483647';
      ov.style.background = 'rgba(96, 165, 250, 0.35)';
      ov.style.outline = '2px solid rgba(59,130,246,0.8)';
      ov.style.display = 'none';
      ov.style.position = 'absolute';
      ov.style.pointerEvents = 'none';
      document.body.appendChild(ov);
    }
    return ov;
  }
  ensureOverlay();

  function scrollAndOverlay(el) {
    if (!el || typeof el.getBoundingClientRect !== 'function') return;
    try { el.scrollIntoView({ block: 'center', inline: 'center' }); } catch (_) {}
    const r = el.getBoundingClientRect();
    const ov = ensureOverlay();
    ov.style.display = 'block';
    ov.style.top = `${r.top + window.scrollY}px`;
    ov.style.left = `${r.left + window.scrollX}px`;
    ov.style.width = `${Math.max(0, r.width)}px`;
    ov.style.height = `${Math.max(0, r.height)}px`;
  }

  function hideOverlay() {
    const ov = ensureOverlay();
    ov.style.display = 'none';
  }

  function generateNodeDescription(n = {}) {
    const { id, class: cls } = n;
    const tag = n.tagName || n.nodeName || '';
    const idPart = id ? `#${id}` : '';
    const clsPart = cls ? `.${String(cls).split(' ').join('.')}` : '';
    return `${tag}${idPart}${clsPart}`;
  }

  function collect(root = document.body) {
    const bus = window[BUS_KEY];
    bus.elementsArray = [];

    function toMeta(el, depth) {
      const attrs = (el.attributes && typeof el.attributes.entries === 'function')
        ? Array.from(el.attributes.entries())
        : el.attributes
          ? Array.from(el.attributes).map(a => [a.name, a.value])
          : [];

      const meta = {
        nodeType: el.nodeType,
        tagName: el.tagName,
        nodeName: el.nodeName,
        nodeValue: el.nodeValue,
        id: el.attributes?.id ? el.attributes.id.value : undefined,
        class: el.attributes?.class ? el.attributes.class.value : undefined,
        descendantsCount: typeof el.getElementsByTagName === 'function' ? el.getElementsByTagName('*').length : 0,
        attributesArr: attrs,
        uniqueIndex: bus.insertIntoElementsArray(el),
        depth
      };

      const children = el.childNodes ? Array.from(el.childNodes) : [];
      meta.childNodes = children.map(ch => toMeta(ch, depth + 1));
      return meta;
    }

    const domTree = toMeta(root, 0);

    // Metrics
    const flat = [];
    (function walk(n) {
      flat.push(n);
      (n.childNodes || []).forEach(walk);
    })(domTree);

    const totalNodes = flat.length;
    const maxDepth = Math.max(...flat.map(n => n.depth || 0));
    const inlineStyleCount = flat.reduce((acc, n) => acc + (n.attributesArr?.some(([k]) => k === 'style') ? 1 : 0), 0);
    const totalAttributes = flat.reduce((acc, n) => acc + (n.attributesArr?.length || 0), 0);

    const tagCounts = {};
    flat.forEach(n => {
      const t = (n.tagName || n.nodeName || '').toLowerCase();
      if (!t) return;
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    });

    const heavyNodesTop = flat
      .filter(n => (n.descendantsCount || 0) > 0)
      .sort((a, b) => (b.descendantsCount || 0) - (a.descendantsCount || 0))
      .slice(0, 10)
      .map(n => ({ desc: generateNodeDescription(n), descendantsCount: n.descendantsCount, uniqueIndex: n.uniqueIndex }));

    // Warning level heuristics
    // 0 good, 1 medium, 2 heavy
    let warningLevel = 0;
    if (totalNodes > 1500 || maxDepth > 25 || inlineStyleCount > 200) warningLevel = 2;
    else if (totalNodes > 800 || maxDepth > 18 || inlineStyleCount > 100) warningLevel = 1;

    return {
      dom: domTree,
      metrics: {
        totalNodes,
        maxDepth,
        tagCounts,
        inlineStyleCount,
        totalAttributes,
        heavyNodesTop,
        warningLevel
      }
    };
  }

  function post(type, data, tabID) {
    const ev = new CustomEvent('commandEvent', {
      detail: { type, data, tabID, src: 'injected-script' }
    });
    window.dispatchEvent(ev);
  }

  const handlers = {
    [TYPES.GET_DOM_DETAILS]: () => {
      const result = collect(document.body || document.documentElement);
      return result;
    },
    [TYPES.HIGHLIGHT_ELEMENT]: ({ uniqueElementIndex }) => {
      const el = window[BUS_KEY].elementsArray[uniqueElementIndex];
      scrollAndOverlay(el);
    },
    [TYPES.REMOVE_HIGHLIGHT]: () => {
      hideOverlay();
    },
    [TYPES.PING]: () => true
  };

  window.addEventListener('commandEvent', (evt) => {
    const { detail } = evt || {};
    const { src, type, data, tabID } = detail || {};
    if (src === 'injected-script') return;
    if (!type || !(type in handlers)) return;
    const out = handlers[type](data || {});
    post(type, out, tabID);
  });
})();