const TYPES = { GET_DOM_DETAILS: 'GET_DOM_DETAILS', PING: 'ping' };
const tabId   = chrome.devtools.inspectedWindow.tabId;
const port    = chrome.runtime.connect({ name: 'dom-size-analyzer:devtools' });

let state = {
  dom: null,
  flat: [],
  selectedUniqueIndex: null,
  snapshots: [],
  inflight: false,
  filterTag: null
};

// ----------  DOM  ----------
const treeEl      = document.getElementById('tree');
const metricsEl   = document.getElementById('metrics');
const btnAnalyze  = document.getElementById('btnAnalyze');
const btnExportJ  = document.getElementById('btnExportJson');
const btnExportC  = document.getElementById('btnExportCsv');
const btnSnapshot = document.getElementById('btnSnapshot');
const btnCompare  = document.getElementById('btnCompare');
const btnClear    = document.getElementById('btnClearHistory');
const btnCollapse = document.getElementById('btnCollapseAll');
const searchInput = document.getElementById('searchInput');

// ----------  helpers  ----------
function send(type, data) { port.postMessage({ type, data, tabId }); }
function download(name, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/octet-stream' }));
  a.download = name; a.click(); URL.revokeObjectURL(a.href);
}
function nodeLabel(n) {
  const tag = n.tagName || n.nodeName || '';
  const id  = n.id ? `#${n.id}` : '';
  const cls = n.class ? `.${String(n.class).split(' ').join('.')}` : '';
  return `<span class="tag">${tag}</span><span class="id">${id}</span><span class="cls">${cls}</span>`;
}
function flatten(root) {
  const out = [];
  (function walk(n) { out.push(n); (n.childNodes || []).forEach(walk); })(root);
  return out;
}
function heavinessClass(d) {
  if (d >= 1000) return 'hx-red';
  if (d >= 300)  return 'hx-orange';
  if (d >= 80)   return 'hx-yellow';
  return 'hx-green';
}

// ----------  tree builder  ----------
function buildTree(node, opts = {}) {
  const { query = '', filterTag = null } = opts;
  function matches(n) {
    const tag = (n.tagName || '').toLowerCase();
    const txt = (n.tagName + n.id + n.class).toLowerCase();
    return (!filterTag || tag === filterTag) && (!query || txt.includes(query.toLowerCase()));
  }
  function render(n) {
    const hasChildren = n.childNodes && n.childNodes.length;
    const childEls = (n.childNodes || []).map(c => render(c)).filter(Boolean);
    const childMatch = childEls.length > 0;
    if (!n.descendantsCount && !childMatch) return null;
    const li = document.createElement('li');
    const header = document.createElement('div');
    header.className = 'node ' + heavinessClass(n.descendantsCount || 0);
    header.dataset.uniqueIndex = n.uniqueIndex;
    const tri = document.createElement('span');
    tri.textContent = hasChildren ? '▸' : '•';
    header.appendChild(tri);
    const label = document.createElement('span');
    label.innerHTML = `${nodeLabel(n)} <span class="small">(${n.descendantsCount} desc)</span>`;
    header.appendChild(label);
    header.addEventListener('click', () => {
      state.selectedUniqueIndex = n.uniqueIndex;
      document.querySelectorAll('.node.selected').forEach(x => x.classList.remove('selected'));
      header.classList.add('selected');
      const ul = li.querySelector('ul');
      if (ul) {
        const visible = ul.style.display !== 'none';
        ul.style.display = visible ? 'none' : '';
        tri.textContent = visible ? '▸' : '▾';
      }
    });
    li.appendChild(header);
    if (hasChildren) {
      const ul = document.createElement('ul');
      ul.style.display = 'none';
      childEls.forEach(e => ul.appendChild(e));
      li.appendChild(ul);
    }
    return matches(n) || childMatch ? li : null;
  }
  const rootUL = document.createElement('ul');
  const r = render(node);
  if (r) rootUL.appendChild(r);
  return rootUL;
}

// ----------  metrics renderer  ----------
function renderMetrics(payload) {
  const { totalNodes, maxDepth, tagCounts, inlineStyleCount, totalAttributes, heavyNodesTop } = payload;
  const bodyNode = state.dom;
  const bodyDesc = bodyNode ? bodyNode.descendantsCount : totalNodes;

  const tagList = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([k, v]) => `<span class="tagitem" data-tag="${k}">${k}: ${v}</span>`)
    .join('');

  const heavyList = heavyNodesTop.map(n =>
    `<div class="row"><span class="desc">${n.desc}</span><span class="small">${n.descendantsCount}</span></div>`).join('');

  const maxNodes = 15000;
  const percent = Math.min(totalNodes / maxNodes, 1) * 100;

  metricsEl.innerHTML = `
    <div class="kpi">
      <div class="card"><div class="small">Total nodes</div><div style="font-size:20px">${bodyDesc}</div></div>
      <div class="card"><div class="small">Max depth</div><div style="font-size:20px">${maxDepth}</div></div>
      <div class="card"><div class="small">Inline styles</div><div style="font-size:20px">${inlineStyleCount}</div></div>
      <div class="card"><div class="small">Attributes</div><div style="font-size:20px">${totalAttributes}</div></div>
    </div>
    <div class="card" style="margin-top:10px">
      <div class="row"><strong>DOM Status</strong></div>
      <div class="progress-wrapper">
        <div class="progress-segment"></div><div class="progress-segment"></div><div class="progress-segment"></div>
        <div class="progress-marker" style="left:${percent}%"></div>
      </div>
    </div>
    <div class="card" style="margin-top:10px">
      <div class="row"><strong>Tag distribution</strong></div>
      <div class="taglist">${tagList}</div>
    </div>
    <div class="card" style="margin-top:10px">
      <div class="row"><strong>Heaviest nodes</strong><span class="small">Top 10</span></div>
      <div>${heavyList}</div>
    </div>
  `;

  // restore tag filter click
  metricsEl.querySelectorAll('.tagitem[data-tag]').forEach(el => {
    el.addEventListener('click', () => {
      const tag = el.getAttribute('data-tag');
      state.filterTag = state.filterTag === tag ? null : tag;
      metricsEl.querySelectorAll('.tagitem.active').forEach(x => x.classList.remove('active'));
      if (state.filterTag) el.classList.add('active');
      searchInput.value = '';
      treeEl.innerHTML = '';
      treeEl.appendChild(buildTree(state.dom, { query: '', filterTag: state.filterTag }));
    });
  });
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
    n.attributesArr?.length || 0,
    n.depth ?? ''
  ]);
  return [header, ...rows].map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
}
function renderHistory() {
  historyList.innerHTML = state.snapshots
    .map((s, idx) => `<span class="tagitem">#${idx+1} nodes:${s.metrics.totalNodes} depth:${s.metrics.maxDepth}</span>`)
    .join('');
}

// ----------  port & events  ----------
port.onMessage.addListener(msg => {
  const { type, data } = msg || {};
  if (type === TYPES.GET_DOM_DETAILS) {
    state.dom = data.dom;
    state.flat = flatten(state.dom);
    state.inflight = false;
    btnAnalyze.textContent = 'Reset';
    treeEl.innerHTML = '';
    treeEl.appendChild(buildTree(state.dom, { query: searchInput.value.trim() }));
    renderMetrics(data.metrics);
  }
});
send(TYPES.PING);

// ----------  actions  ----------
btnAnalyze.addEventListener('click', () => {
  if (state.inflight) return;
  if (btnAnalyze.textContent === 'Reset') { // second click
    treeEl.innerHTML = '';
    renderMetrics({ totalNodes:0, maxDepth:0, tagCounts:{}, inlineStyleCount:0, totalAttributes:0, heavyNodesTop:[] });
    btnAnalyze.textContent = 'Analyze DOM';
    state.dom = null;
    state.flat = [];
    return;
  }
  state.inflight = true;
  state.filterTag = null;
  btnAnalyze.textContent = 'Loading...';
  send(TYPES.GET_DOM_DETAILS);
});

btnExportJ.addEventListener('click', () => {
  if (state.dom) download('dom-analyzer.json', JSON.stringify({ dom: state.dom }, null, 2));
});
btnExportC.addEventListener('click', () => {
  if (state.dom) download('dom-analyzer.csv', buildCsv(state.flat));
});
btnSnapshot.addEventListener('click', () => {
  if (!state.dom) return;
  const snap = { ts: Date.now(), metrics: { totalNodes: state.flat.length, maxDepth: Math.max(...state.flat.map(n => n.depth || 0)) } };
  state.snapshots.push(snap);
  if (state.snapshots.length > 50) state.snapshots.shift();
  renderHistory();
});
btnCompare.addEventListener('click', () => {
  if (state.snapshots.length < 2) return;
  const a = state.snapshots[state.snapshots.length - 2];
  const b = state.snapshots[state.snapshots.length - 1];
  const diff = {
    nodesDiff: b.metrics.totalNodes - a.metrics.totalNodes,
    depthDiff: b.metrics.maxDepth - a.metrics.maxDepth
  };
  alert(`Compare last two snapshots:\n\nNodes diff: ${diff.nodesDiff}\nDepth diff: ${diff.depthDiff}`);
});
btnClear.addEventListener('click', () => { state.snapshots = []; renderHistory(); });
searchInput.addEventListener('input', () => {
  state.filterTag = null;
  metricsEl.querySelectorAll('.tagitem.active').forEach(x => x.classList.remove('active'));
  if (!state.dom) return;
  treeEl.innerHTML = '';
  treeEl.appendChild(buildTree(state.dom, { query: searchInput.value.trim() }));
});
let collapsedAll = true;
btnCollapse.addEventListener('click', () => {
  const uls = treeEl.querySelectorAll('ul');
  uls.forEach(ul => { if (ul === treeEl.firstElementChild) return; ul.style.display = collapsedAll ? '' : 'none'; });
  treeEl.querySelectorAll('.node > span:first-child').forEach(tri => { if (tri.textContent !== '•') tri.textContent = collapsedAll ? '▾' : '▸'; });
  collapsedAll = !collapsedAll;
});