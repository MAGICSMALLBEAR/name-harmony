/**
 * 取名工具的瀏覽器冒煙測試（實際點按鈕、看畫面）
 * 用法：
 *   1. python -m http.server 8765
 *   2. 用乾淨的 Edge 開頁面（不載入擴充功能，避免它們的 console 錯誤）：
 *      msedge --headless=new --disable-extensions --remote-debugging-port=9222 --user-data-dir=.edge-test-profile http://127.0.0.1:8765/
 *   3. node tools/browser-smoke.js（連接埠不是 9222 時設定 CDP_PORT）
 * 大量的邏輯檢查在 tools/test-naming.js，這裡只確認介面接得起來、沒有 console 錯誤。
 */
(async function() {
  var port = process.env.CDP_PORT || '9222';
  var targets = await (await fetch('http://127.0.0.1:' + port + '/json')).json();
  var page = targets.find(function(x) { return x.type === 'page' && /^http:\/\/127\.0\.0\.1:8765\//.test(x.url); });
  if (!page) throw new Error('找不到 http://127.0.0.1:8765/ 的分頁');
  var ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(function(resolve, reject) { ws.onopen = resolve; ws.onerror = reject; });

  var requestId = 0, waiting = {}, errors = [];
  // 只算這個網站的錯誤；瀏覽器擴充功能（chrome-extension://）的錯誤略過
  var fromApp = function(st, url) {
    var u = url || (st && st.callFrames && st.callFrames[0] && st.callFrames[0].url) || '';
    return u === '' || /^http:\/\/127\.0\.0\.1:8765\//.test(u);
  };
  ws.onmessage = function(event) {
    var data = JSON.parse(event.data), p = data.params;
    if (data.method === 'Runtime.exceptionThrown' && fromApp(p.exceptionDetails.stackTrace, p.exceptionDetails.url)) {
      errors.push(p.exceptionDetails.exception ? p.exceptionDetails.exception.description : p.exceptionDetails.text);
    }
    if (data.method === 'Runtime.consoleAPICalled' && p.type === 'error' && fromApp(p.stackTrace)) {
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
  // 重新載入，確保用到最新的檔案（略過 Service Worker 快取）
  await send('Network.enable');
  await send('Network.setBypassServiceWorker', { bypass: true });
  await send('Page.reload', { ignoreCache: true });
  await new Promise(function(r) { setTimeout(r, 2500); });

  var result = await evaluate(`(async () => {
    const $ = id => document.getElementById(id);
    const wait = async (fn, ms = 15000) => { const t0 = Date.now(); while (!fn()) { if (Date.now() - t0 > ms) return false; await new Promise(r => setTimeout(r, 100)); } return true; };
    ['toolBaby', 'toolTrends', 'toolBrand', 'toolPersonality', 'toolFamily'].forEach(id => $(id).parentElement.open = true);
    if (!await wait(() => $('bbSurname') && $('trendName') && $('familyCandidate'))) return { error: '取名工具表單沒有出現' };
    const out = {};

    $('bbSurname').value = '温'; $('bbGender').value = 'female'; $('bbGo').click();
    out.baby = $('bbResults').innerText;

    $('trendName').value = 'Linda'; $('trendGender').value = ''; $('trendGo').click();
    await wait(() => /時代感/.test($('trendResult').innerText));
    out.trendEnglish = $('trendResult').innerText;
    out.trendBars = document.querySelectorAll('#trendResult .trend-bar').length;
    $('trendName').value = '陳家豪'; $('trendGo').click();
    out.trendChinese = $('trendResult').innerText;

    $('brandName').value = '森月'; $('brandGo').click();
    await wait(() => !/查詢中/.test($('brandResult').innerText));
    out.brand = $('brandResult').innerText;
    $('brandName').value = 'google'; $('brandGo').click();
    await wait(() => !/查詢中/.test($('brandResult').innerText));
    out.brandTaken = $('brandResult').innerText;

    document.querySelectorAll('#toolPersonality .bf').forEach(s => s.value = '5');
    $('bfGo').click();
    out.personality = $('bfResult').innerText;

    $('familyParentA').value = '王大明'; $('familyParentB').value = '林小美';
    $('familyCandidate').value = '王明軒'; $('familySiblings').value = '王子晴';
    $('familyGo').click();
    out.family = $('familyResult').innerText;
    return out;
  })()`);

  var expect = {
    baby: /温/,
    trendEnglish: /Linda[\s\S]*1940 年代[\s\S]*時代感/,
    trendBars: /^9$/,
    trendChinese: /家豪[\s\S]*全國男性第 1 大/,
    brand: /senyue\.com：(已被註冊|查無登記)/,
    brandTaken: /google\.com：已被註冊/,
    personality: /開放性 50\/100/,          // 正向題 5 分、反向題也 5 分 → 平均 3 → 50
    family: /用了家長「王大明」名字中的「明」/
  };
  var failed = 0;
  Object.keys(expect).forEach(function(key) {
    var v = String(result[key]);
    var bad = !expect[key].test(v) || /undefined|NaN/.test(v);
    if (bad) failed++;
    console.log((bad ? '✗ ' : '✓ ') + key + (bad ? '\n' + v : ''));
  });
  if (errors.length) { failed++; console.log('✗ console 錯誤：\n' + errors.join('\n')); }
  ws.close();
  if (failed) process.exit(1);
  console.log('瀏覽器冒煙測試通過');
}()).catch(function(err) { console.error(err); process.exit(1); });
