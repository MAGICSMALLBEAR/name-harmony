/**
 * 收集畫面上實際用自架字型繪製的字，寫入 tools/font-priority.json，給 tools/gen-fonts.py 決定切片順序
 *   initial：打開網頁就看到的字（中英文介面）→ 放在最前面的切片，首次載入只下載這幾片
 *   demo：示範資料分析後、切過每個分頁看到的字 → 接在後面，Service Worker 會預先快取到這裡
 * 用法：
 *   1. python -m http.server 8765
 *   2. 用 Edge 開頁面（見 tools/browser-smoke.js 的說明）
 *   3. node tools/collect-font-chars.js，再跑 python tools/gen-fonts.py
 * 介面文字大改後重跑即可。沒重跑也不會顯示錯字，只是首次載入可能多下載幾片。
 */
var fs = require('fs');
var path = require('path');

(async function() {
  var port = process.env.CDP_PORT || '9222';
  var targets = await (await fetch('http://127.0.0.1:' + port + '/json')).json();
  var page = targets.find(function(x) { return x.type === 'page' && /^http:\/\/127\.0\.0\.1:8765\//.test(x.url); });
  if (!page) throw new Error('找不到 http://127.0.0.1:8765/ 的分頁');
  var ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(function(resolve, reject) { ws.onopen = resolve; ws.onerror = reject; });
  var requestId = 0, waiting = {};
  ws.onmessage = function(event) {
    var data = JSON.parse(event.data);
    if (data.id && waiting[data.id]) { waiting[data.id](data); delete waiting[data.id]; }
  };
  function send(method, params) {
    return new Promise(function(resolve) { var id = ++requestId; waiting[id] = resolve; ws.send(JSON.stringify({ id: id, method: method, params: params || {} })); });
  }
  async function evaluate(expression) {
    var data = await send('Runtime.evaluate', { expression: expression, returnByValue: true, awaitPromise: true });
    if (data.error || data.result.exceptionDetails) throw new Error(JSON.stringify(data.error || data.result.exceptionDetails));
    return data.result.result.value;
  }
  var sleep = function(ms) { return new Promise(function(r) { setTimeout(r, ms); }); };

  await send('Network.enable');
  await send('Network.setBypassServiceWorker', { bypass: true });
  await send('Page.reload', { ignoreCache: true });
  await sleep(3000);

  // 有排版的文字（含輸入框的提示字與值、下拉選單的選項），依 font-family 列出的自架字型分組。
  // 書法體沒有的字會退回 Noto Serif TC，所以書法體的字也算進 Serif。
  var COLLECT = `(() => {
    const FAMS = ['Noto Sans TC', 'Noto Serif TC', 'Ma Shan Zheng'];
    const out = {}; FAMS.forEach(f => out[f] = new Set());
    const add = (el, text, pseudo) => {
      if (!text || !el.getClientRects().length) return;
      // visibility: hidden 仍會排版（瀏覽器照樣下載字型），所以不排除
      const cs = getComputedStyle(el, pseudo);
      const fams = cs.fontFamily.split(',').map(s => s.replace(/["']/g, '').trim());
      const first = fams.find(f => FAMS.includes(f));
      if (!first) return;
      const targets = first === 'Ma Shan Zheng' && fams.includes('Noto Serif TC') ? [first, 'Noto Serif TC'] : [first];
      for (const c of text) targets.forEach(f => out[f].add(c));
    };
    // CSS 產生的文字（::before、::after 的 content，清單標記）也要算
    document.querySelectorAll('body *').forEach(el => ['::before', '::after', '::marker'].forEach(p => {
      const content = getComputedStyle(el, p).content;
      if (content && content !== 'none' && content !== 'normal') add(el, (content.match(/"(?:[^"\\\\]|\\\\.)*"/g) || []).join(''), p);
    }));
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = tw.nextNode())) if (n.parentElement) add(n.parentElement, n.textContent);
    document.querySelectorAll('input, textarea').forEach(el => { add(el, el.placeholder); add(el, el.value); });
    // 下拉選單要算寬度，每個選項都會排版，不只目前選的那個
    document.querySelectorAll('select').forEach(el => [...el.options].forEach(o => add(el, o.textContent)));
    return Object.fromEntries(FAMS.map(f => [f, [...out[f]].join('')]));
  })()`;

  var initial = [], demo = [];
  initial.push(await evaluate(COLLECT));
  await evaluate('window.I18N.setLang("en"); window.I18N.apply("en")');
  await sleep(500);
  initial.push(await evaluate(COLLECT));
  await evaluate('window.I18N.setLang("zh"); window.I18N.apply("zh")');
  await sleep(500);

  // 示範資料分析，逐一切換分頁；取名工具也展開並各跑一次
  await evaluate(`(async () => {
    [...document.querySelectorAll('button')].find(b => /示範|Demo/.test(b.textContent)).click();
    document.getElementById('analyzeBtn').click();
    const t0 = Date.now();
    while (!(document.getElementById('reportContent') && document.getElementById('reportContent').textContent.trim().length > 100) && Date.now() - t0 < 15000) await new Promise(r => setTimeout(r, 100));
  })()`);
  var tabs = await evaluate('[...document.querySelectorAll(".tab-btn")].map(b => b.dataset.tab)');
  for (var i = 0; i < tabs.length; i++) {
    await evaluate('document.querySelector(\'.tab-btn[data-tab="' + tabs[i] + '"]\').click()');
    await sleep(800);
    demo.push(await evaluate(COLLECT));
  }
  await evaluate(`(async () => {
    const $ = id => document.getElementById(id);
    document.querySelectorAll('details').forEach(d => d.open = true);
    await new Promise(r => setTimeout(r, 1000));
    $('bbSurname').value = '陳'; $('bbGo').click();
    if ($('fnGo')) { $('fnEnglish').value = 'Michael Smith'; $('fnGo').click(); }
  })()`);
  await sleep(1500);
  demo.push(await evaluate(COLLECT));
  ws.close();

  var merge = function(list) {
    var out = {};
    list.forEach(function(r) { Object.keys(r).forEach(function(f) { out[f] = (out[f] || '') + r[f]; }); });
    Object.keys(out).forEach(function(f) { out[f] = Array.from(new Set(Array.from(out[f]))).sort().join(''); });
    return out;
  };
  var result = { initial: merge(initial), demo: merge(demo) };
  var file = path.join(__dirname, 'font-priority.json');
  fs.writeFileSync(file, JSON.stringify(result, null, 1) + '\n');
  Object.keys(result).forEach(function(k) {
    console.log(k + '：' + Object.keys(result[k]).map(function(f) { return f + ' ' + Array.from(result[k][f]).length + ' 字'; }).join('、'));
  });
  console.log('已寫入 ' + file);
}()).catch(function(err) { console.error(err); process.exit(1); });
