// main.js – DevTools panel logic (no build step)

// --- Constants
const TYPES = {
  GET_DOM_DETAILS: 'GET_DOM_DETAILS',
  HIGHLIGHT_ELEMENT: 'HIGHLIGHT_ELEMENT',
  REMOVE_HIGHLIGHT: 'REMOVE_HIGHLIGHT',
  PING: 'ping',
};

const tabId = chrome.devtools.inspectedWindow.tabId;
const port = chrome.runtime.connect({ name: 'dom-size-analyzer:devtools' });

const state = {
  dom: null,
  flat: [], // flattened nodes for search/index
  selectedUniqueIndex: null,
  snapshots: [], // history of last analyses
};

// --- UI elements
const treeEl = document.getElementById('tree');
const metricsEl = document.getElementById('metrics');
const statusChip = document.getElementById('statusChip');
const statusDetail = document.getElementById('statusDetail');
const btnAnalyze = document.getElementById('btnAnalyze');
const btnRefresh = document.getElementById('btnRefresh');
const btnExportJson = document.getElementById('btnExportJson');
const btnExportCsv = document.getElementById('btnExportCsv');
const btnHighlight = document.getElementById('btnHighlight');
const btnRemoveHighlight = document.getElementById('btnRemoveHighlight');
const btnSnapshot = document.getElementById('btnSnapshot');
const btnCompare = document.getElementById('btnCompare');
const historyList = document.getElementById('historyList');
const searchInput = document.getElementById('searchInput');

// --- Helpers
function setStatus(text, detail = '') {
  statusChip.textContent = text;
  statusDetail.textContent = detail;
}

function send(type, data) {
  port.postMessage({ type, data, tabId });
}

function download(filename, text) {
  const blob = new Blob([text], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
}

function nodeLabel(n) {
  const tag = n.tagName || n.nodeName || '';
  const id = n.id ? `#${n.id}` : '';
  const cls = n.class ? `.${String(n.class).split(' ').join('.')}` : '';
  return `<span class="tag">${tag}</span><span class="id">${id}</span><span class="cls">${cls}</span>`;
}

function flatten(root) {
  const out = [];
  (function walk(n) {
    out.push(n);
    (n.childNodes || []).forEach(walk);
  })(root);
  return out;
}

function buildTree(node, query = '') {
  const matches = (html) => {
    if (!query) return true;
    const q = query.toLowerCase();
    const text = html.replace(/<[^>]+>/g, '').toLowerCase();
    return text.includes(q);
  };

  function render(n) {
    const hasChildren = (n.childNodes && n.childNodes.length);
    const li = document.createElement('li');
    const header = document.createElement('div');
    header.className = 'node';
    header.innerHTML = `${hasChildren ? '▸' : '•'} ${nodeLabel(n)} <span class="small">(${n.descendantsCount} desc)</span>`;
    header.onclick = () => {
      state.selectedUniqueIndex = n.uniqueIndex;
      document.querySelectorAll('.node.selected').forEach(x => x.classList.remove('selected'));
      header.classList.add('selected');
    };
    li.appendChild(header);

    if (hasChildren) {
      const ul = document.createElement('ul');
      ul.style.display = 'none';
      (n.childNodes || []).forEach(child => {
        const childEl = render(child);
        if (childEl) ul.appendChild(childEl);
      });
      header.addEventListener('click', (e) => {
        // toggle only when clicking triangle area: acceptable simple toggle
        ul.style.display = ul.style.display === 'none' ? '' : 'none';
        header.firstChild.textContent = (ul.style.display === 'none' ? '▸' : '▾');
        e.stopPropagation();
      }, { once: true }); // set initial triangle change on first expand
      li.appendChild(ul);
    }
    const html = header.innerHTML;
    if (!matches(html)) return null;
    return li;
  }

  const rootUL = document.createElement('ul');
  const r = render(node);
  if (r) rootUL.appendChild(r);
  return rootUL;
}

function renderMetrics(payload) {
  const {
    totalNodes,
    maxDepth,
    tagCounts,
    inlineStyleCount,
    totalAttributes,
    heavyNodesTop, // [{desc, descendantsCount, uniqueIndex}]
    warningLevel
  } = payload;

  const tagList = Object.entries(tagCounts)
    .sort((a,b) => b[1]-a[1])
    .slice(0, 12)
    .map(([k,v]) => `<span class="tagitem">${k}: ${v}</span>`)
    .join('');

  const heavyList = heavyNodesTop.map(n =>
    `<div class="row"><span>${n.desc}</span><span>${n.descendantsCount}</span></div>`
  ).join('');

  const warnChip = warningLevel >= 2 ? '⚠️ سنگین' : (warningLevel === 1 ? '🟡 متوسط' : '🟢 خوب');

  metricsEl.innerHTML = `
    <div class="kpi">
      <div class="card"><div class="small">کل نودها</div><div style="font-size:20px">${totalNodes}</div></div>
      <div class="card"><div class="small">بیشترین عمق</div><div style="font-size:20px">${maxDepth}</div></div>
      <div class="card"><div class="small">Inline Styles</div><div style="font-size:20px">${inlineStyleCount}</div></div>
      <div class="card"><div class="small">Attributes</div><div style="font-size:20px">${totalAttributes}</div></div>
    </div>
    <div class="card" style="margin-top:10px">
      <div class="row"><strong>وضعیت DOM</strong><span>${warnChip}</span></div>
      <div class="small">تعداد زیاد نودها و عمق زیاد می‌تواند باعث کاهش Performance شود.</div>
    </div>
    <div class="card" style="margin-top:10px">
      <div class="row"><strong>پراکندگی تگ‌ها (Top 12)</strong></div>
      <div class="taglist" style="margin-top:8px">${tagList || '<span class="small">—</span>'}</div>
    </div>
    <div class="card" style="margin-top:10px">
      <div class="row"><strong>سنگین‌ترین نودها (descendants)</strong><span class="small">Top 10</span></div>
      <div style="margin-top:8px">${heavyList || '<span class="small">—</span>'}</div>
    </div>
  `;
}

function buildCsv(flat) {
  const header = ['uniqueIndex','nodeType','tagName','nodeName','id','class','descendantsCount','attributesCount','depth'];
  const rows = flat.map(n => [
    n.uniqueIndex,
    n.nodeType ?? '',
    n.tagName ?? '',
    n.nodeName ?? '',
    n.id ?? '',
    (n.class ?? '').toString().replace(/\s+/g,'.'),
    n.descendantsCount ?? 0,
    (n.attributesArr?.length || 0),
    n.depth ?? ''
  ]);
  return [header, ...rows].map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
}

function renderHistory() {
  historyList.innerHTML = state.snapshots
    .map((s, idx) => `<span class="tagitem">#${idx+1} nodes:${s.metrics.totalNodes} depth:${s.metrics.maxDepth}</span>`)
    .join('');
}

// --- Handlers
port.onMessage.addListener((msg) => {
  const { type, data, src } = msg || {};
  if (type === TYPES.GET_DOM_DETAILS && src === 'injected-script') {
    const { dom, metrics } = data;
    state.dom = dom;
    state.flat = flatten(dom);

    setStatus('Success', `nodes: ${metrics.totalNodes}, depth: ${metrics.maxDepth}`);
    treeEl.innerHTML = '';
    treeEl.appendChild(buildTree(dom, searchInput.value.trim()));
    renderMetrics(metrics);
  }
});

// Initial ping to ensure wiring
send(TYPES.PING);

// --- UI events
btnAnalyze.onclick = () => {
  setStatus('Loading', 'collecting DOM...');
  send(TYPES.GET_DOM_DETAILS);
};

btnRefresh.onclick = () => {
  if (!state.dom) return btnAnalyze.click();
  setStatus('Loading', 'refreshing...');
  send(TYPES.GET_DOM_DETAILS);
};

btnExportJson.onclick = () => {
  if (!state.dom) return;
  download('dom-analyzer.json', JSON.stringify({ dom: state.dom }, null, 2));
};

btnExportCsv.onclick = () => {
  if (!state.dom) return;
  download('dom-analyzer.csv', buildCsv(state.flat));
};

btnHighlight.onclick = () => {
  if (state.selectedUniqueIndex == null) return;
  send(TYPES.HIGHLIGHT_ELEMENT, { uniqueElementIndex: state.selectedUniqueIndex });
};

btnRemoveHighlight.onclick = () => {
  send(TYPES.REMOVE_HIGHLIGHT);
};

btnSnapshot.onclick = () => {
  if (!state.dom) return;
  // keep last 10
  const metrics = metricsEl.innerText ? {} : {};
  const snapshot = { ts: Date.now(), metrics: {} };
  // extract basic metrics from current UI (we also have them in last GET result)
  // Better: reconstruct from state.flat/dom (not stored). We add minimal persisted metrics:
  snapshot.metrics = {
    totalNodes: state.flat.length,
    maxDepth: Math.max(...state.flat.map(n => n.depth || 0))
  };
  state.snapshots.push(snapshot);
  if (state.snapshots.length > 10) state.snapshots.shift();
  renderHistory();
};

btnCompare.onclick = () => {
  if (state.snapshots.length < 2) return;
  const a = state.snapshots[state.snapshots.length - 2];
  const b = state.snapshots[state.snapshots.length - 1];
  const diff = {
    nodesDiff: (b.metrics.totalNodes || 0) - (a.metrics.totalNodes || 0),
    depthDiff: (b.metrics.maxDepth || 0) - (a.metrics.maxDepth || 0),
  };
  alert(`مقایسه آخرین ۲ Snapshot:\n\nاختلاف نودها: ${diff.nodesDiff}\nاختلاف عمق: ${diff.depthDiff}`);
};

searchInput.addEventListener('input', () => {
  if (!state.dom) return;
  treeEl.innerHTML = '';
  treeEl.appendChild(buildTree(state.dom, searchInput.value.trim()));
});