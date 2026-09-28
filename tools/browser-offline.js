/**
 * 離線測試：Service Worker 是否把資源（含自架字型）都快取起來，斷網後仍能正常顯示
 * 用法：
 *   1. python -m http.server 8765
 *   2. 用 Edge 開頁面（見 tools/browser-smoke.js 的說明；擴充功能的雜訊會被略過）：
 *      msedge --headless=new --disable-extensions --remote-debugging-port=9222 --user-data-dir=.edge-test-profile http://127.0.0.1:8765/
 *   3. node tools/browser-offline.js（連接埠不是 9222 時設定 CDP_PORT）
 * 動到 sw.js 的快取清單或字型時跑這支，確認斷網後字型與畫面都還在。
 */
(async function() {
  var port = process.env.CDP_PORT || '9222';
  var targets = await (await fetch('http://127.0.0.1:' + port + '/json')).json();
  var page = targets.find(function(x) { return x.type === 'page' && /^http:\/\/127\.0\.0\.1:8765\//.test(x.url); });
  if (!page) throw new Error('找不到 http://127.0.0.1:8765/ 的分頁');
  var ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(function(resolve, reject) { ws.onopen = resolve; ws.onerror = reject; });

  var requestId = 0, waiting = {}, errors = [], contextOrigin = {};
  var PAGE_ORIGIN = 'http://127.0.0.1:8765';
  // 只算本站的錯誤（擴充功能的內容腳本注入頁面後也會報錯，見 browser-smoke.js）
  var fromApp = function(contextId, url) {
    var origin = contextOrigin[contextId];
    if (origin) return origin.indexOf(PAGE_ORIGIN) === 0;
    return !url || url.indexOf(PAGE_ORIGIN) === 0;
  };
  ws.onmessage = function(event) {
    var data = JSON.parse(event.data), p = data.params;
    if (data.method === 'Runtime.executionContextCreated') contextOrigin[p.context.id] = p.context.origin;
    if (data.method === 'Runtime.executionContextsCleared') contextOrigin = {};
    if (data.method === 'Runtime.exceptionThrown' && fromApp(p.exceptionDetails.executionContextId, p.exceptionDetails.url)) {
      errors.push(p.exceptionDetails.exception ? p.exceptionDetails.exception.description : p.exceptionDetails.text);
    }
    if (data.method === 'Runtime.consoleAPICalled' && p.type === 'error' && fromApp(p.executionContextId)) {
      errors.push(p.args.map(function(a) { return a.value || a.description; }).join(' '));
    }
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

  await send('Runtime.enable');
  await send('Page.enable');
  await send('DOM.enable');
  await send('CSS.enable');
  await send('Network.enable');
  await send('Network.setBypassServiceWorker', { bypass: false });   // 這次要讓 Service Worker 接手
  await send('Page.reload', { ignoreCache: true });
  await new Promise(function(r) { setTimeout(r, 3000); });           // 等載入完成（reload 會中斷跑在頁面裡的程式）
  console.log('… 等 Service Worker 把資源快取起來');

  // 等 Service Worker 安裝完成、資源（含字型）都進快取
  var cached = await evaluate(`(async () => {
    await navigator.serviceWorker.ready;
    // 字型切片的檔名含雜湊，直接看 sw.js 的預先快取清單要哪些。
    // 加查詢參數繞過 Service Worker：它是快取優先，會回傳快取裡的舊 sw.js
    const sw = await (await fetch('sw.js?' + Date.now())).text();
    const version = (sw.match(/CACHE_NAME = '([^']+)'/) || [])[1];
    const need = (sw.match(/[.][/]fonts[/][^']+/g) || []).map(f => f.slice(1));
    if (!version || need.length < 2) return 'NO-FONTS-IN-SW';
    // 只認目前版本的快取（舊版本的快取也可能剛好有同名檔案）
    const t0 = Date.now();
    while (Date.now() - t0 < 60000) {
      if ((await caches.keys()).includes(version)) {
        const keys = (await (await caches.open(version)).keys()).map(r => new URL(r.url).pathname);
        if (need.every(f => keys.includes(f))) return version + ':' + keys.length;
      }
      await new Promise(r => setTimeout(r, 500));
    }
    return 'TIMEOUT ' + version;
  })()`);
  console.log('  快取：' + cached);

  // 斷網後重新載入：所有資源都必須由 Service Worker 從快取提供
  console.log('… 斷網後重新載入');
  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await new Promise(function(r) { setTimeout(r, 500); });
  await send('Page.reload', { ignoreCache: true });
  await new Promise(function(r) { setTimeout(r, 4000); });

  var offline = await evaluate(`(async () => {
    await document.fonts.ready;
    const faces = [...document.fonts];
    const loaded = ['Ma Shan Zheng', 'Noto Sans TC', 'Noto Serif TC'].map(fam =>
      fam + ':' + (faces.some(f => f.family.replace(/"/g, '') === fam && f.status === 'loaded') ? 'loaded' : 'none')).join(' ');
    return { online: navigator.onLine, title: document.title, fonts: loaded,
      heading: (document.querySelector('.app-title') || {}).textContent || '',
      body: document.body.innerText.length };
  })()`);
  // 標題實際用哪個字型畫的（斷網後仍應是自架的書法體）
  var doc = await send('DOM.getDocument', { depth: -1 });
  var node = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: '.app-title' });
  var fonts = await send('CSS.getPlatformFontsForNode', { nodeId: node.result.nodeId });
  var titleFonts = (fonts.result.fonts || []).map(function(x) { return x.familyName + '(' + x.glyphCount + ')'; }).join(', ');

  await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });

  var expect = {
    cached: /^name-harmony-v\d+:\d+$/,
    offline: /^false$/,                         // navigator.onLine 為 false：確實斷網了
    fonts: /^Ma Shan Zheng:loaded Noto Sans TC:loaded Noto Serif TC:loaded$/,
    titleFonts: /^Ma Shan Zheng\([1-9]\d*\)/,
    heading: /姓名和盤/,
    body: /^[1-9]\d{2,}$/                       // 畫面有真的畫出來，不是空白頁
  };
  var values = { cached: cached, offline: String(offline.online), fonts: offline.fonts,
    titleFonts: titleFonts, heading: offline.heading, body: String(offline.body) };
  var failed = 0;
  Object.keys(expect).forEach(function(key) {
    var v = values[key];
    var bad = !expect[key].test(v) || /undefined|NaN/.test(v);
    if (bad) failed++;
    console.log((bad ? '✗ ' : '✓ ') + key + (bad ? '\n' + v : ''));
  });
  if (errors.length) { failed++; console.log('✗ console 錯誤：\n' + errors.join('\n')); }
  ws.close();
  if (failed) process.exit(1);
  console.log('離線測試通過（' + cached.split(':')[1] + ' 個資源快取，斷網後字型與畫面正常）');
}()).catch(function(err) { console.error(err); process.exit(1); });
