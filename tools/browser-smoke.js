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

  var requestId = 0, waiting = {}, errors = [], requests = [];
  var PAGE_ORIGIN = 'http://127.0.0.1:8765';
  // 只算這個網站的錯誤。瀏覽器擴充功能會把內容腳本注入頁面，它們的錯誤網址也是頁面網址，
  // 但執行環境的來源是 chrome-extension://（--disable-extensions 擋不住已安裝的擴充功能），
  // 所以用 executionContextId 對應的來源判斷，而不是錯誤本身的網址。
  var contextOrigin = {};
  var fromApp = function(contextId, st, url) {
    var origin = contextOrigin[contextId];
    if (origin) return origin.indexOf(PAGE_ORIGIN) === 0;
    var u = url || (st && st.callFrames && st.callFrames[0] && st.callFrames[0].url) || '';
    return u === '' || u.indexOf(PAGE_ORIGIN) === 0;
  };
  ws.onmessage = function(event) {
    var data = JSON.parse(event.data), p = data.params;
    if (data.method === 'Runtime.executionContextCreated') contextOrigin[p.context.id] = p.context.origin;
    if (data.method === 'Runtime.executionContextsCleared') contextOrigin = {};
    if (data.method === 'Network.requestWillBeSent') {
      var st = p.initiator && p.initiator.stack;
      requests.push({ url: p.request.url, from: (st && st.callFrames && st.callFrames[0] && st.callFrames[0].url) || '' });
    }
    if (data.method === 'Runtime.exceptionThrown' && fromApp(p.exceptionDetails.executionContextId, p.exceptionDetails.stackTrace, p.exceptionDetails.url)) {
      errors.push(p.exceptionDetails.exception ? p.exceptionDetails.exception.description : p.exceptionDetails.text);
    }
    if (data.method === 'Runtime.consoleAPICalled' && p.type === 'error' && fromApp(p.executionContextId, p.stackTrace)) {
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

    // 自架字型：三套都要載入（瀏覽器擴充功能也注入了一堆字型，只看自家的三套）
    await document.fonts.ready;
    out.fonts = [...document.fonts]
      .filter(f => /^(Noto Sans TC|Noto Serif TC|Ma Shan Zheng)$/.test(f.family.replace(/"/g, '')))
      .map(f => f.family.replace(/"/g, '') + ':' + f.status).sort().join(' ');
    out.fontChecks = [
      document.fonts.check('16px "Noto Sans TC"', '姓名') ? 'sans' : 'NO-sans',
      document.fonts.check('16px "Noto Serif TC"', '姓名') ? 'serif' : 'NO-serif',
      document.fonts.check('16px "Ma Shan Zheng"', '姓名') ? 'display' : 'NO-display'
    ].join(' ');

    $('bbSurname').value = '温'; $('bbGender').value = 'female'; $('bbGo').click();
    out.baby = $('bbResults').innerText;

    // 列印報告：iframe 是 document.write 出來的，要自己帶 @font-face；攔下 print()，看列印當下字型是否已載入
    const printed = new Promise(resolve => {
      new MutationObserver((list, obs) => list.forEach(m => m.addedNodes.forEach(n => {
        if (n.tagName !== 'IFRAME') return;
        obs.disconnect();
        n.contentWindow.print = () => {
          const d = n.contentDocument, name = d.querySelector('.nm').textContent;
          resolve([[...d.fonts].some(f => /Noto Serif TC/.test(f.family) && f.status === 'loaded') ? 'loaded' : 'not-loaded',
            d.fonts.check('16px "Noto Serif TC"', name) ? 'check' : 'no-check'].join(' '));
        };
      }))).observe(document.body, { childList: true });
    });
    $('bbPrint').click();
    out.printFonts = await Promise.race([printed, new Promise(r => setTimeout(() => r('timeout'), 8000))]);

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

    // AI 解讀：用模擬的 SDK 跑對話流程（不需要金鑰、不會呼叫 API）
    [...document.querySelectorAll('button')].find(b => /示範|Demo/.test(b.textContent)).click();
    $('analyzeBtn').click();
    await wait(() => $('reportContent') && $('reportContent').textContent.trim().length > 100);
    out.aiContext = window.AiReading.collectContext().match(/^# .*/gm).join(',');
    const calls = [], sleep = ms => new Promise(r => setTimeout(r, ms));
    class APIError extends Error {}
    class APIUserAbortError extends APIError {}
    const fakeStream = params => {
      calls.push(JSON.parse(JSON.stringify(params)));
      let done, fail, stop = false;
      const fin = new Promise((a, b) => { done = a; fail = b; });
      return {
        abort() { stop = true; fail(new APIUserAbortError('aborted')); },
        finalMessage() { return fin; },
        async *[Symbol.asyncIterator]() {
          for (const c of ['## 總覽\\n', '**互補**的一對']) { if (stop) return; await sleep(200); yield { type: 'content_block_delta', delta: { type: 'text_delta', text: c } }; }
          if (!stop) done({ stop_reason: 'end_turn', model: 'claude-opus-5', content: [{ type: 'thinking', thinking: '', signature: 's' }, { type: 'text', text: '## 總覽\\n**互補**的一對' }], usage: { input_tokens: 10, output_tokens: 5 } });
        }
      };
    };
    window.AiReading._useSdk({ default: class { constructor() { this.beta = { messages: { stream: fakeStream } }; } }, APIError, APIUserAbortError,
      APIConnectionError: class extends APIError {}, AuthenticationError: class extends APIError {}, PermissionDeniedError: class extends APIError {}, RateLimitError: class extends APIError {} });
    document.querySelector('.tab-btn[data-tab="ai"]').click();
    if ($('aiKey')) { $('aiKey').value = 'sk-ant-fake'; $('aiSaveKey').click(); }
    $('aiGo').click();
    await wait(() => !$('aiStop'));
    $('aiAsk').value = '追問'; $('aiSend').click();
    await wait(() => calls.length === 2 && !$('aiStop'));
    $('aiAsk').value = '停止測試'; $('aiSend').click();
    await sleep(250); $('aiStop').click();
    await wait(() => !$('aiStop'));
    out.ai = [calls[0].model, calls[0].fallbacks, calls[1].messages.map(m => m.role).join('/'), window.AiReading._messages().length,
      document.querySelector('.ai-bot h4') ? 'h4' : 'no-h4', $('aiLog').innerText.includes('已停止') ? 'stopped' : 'not-stopped'].join(' ');
    $('aiRemoveKey').click();
    return out;
  })()`);

  var expect = {
    fonts: /^Ma Shan Zheng:loaded Noto Sans TC:loaded Noto Serif TC:loaded$/,
    fontChecks: /^sans serif display$/,
    baby: /温/,
    printFonts: /^loaded check$/,
    trendEnglish: /Linda[\s\S]*1940 年代[\s\S]*時代感/,
    trendBars: /^9$/,
    trendChinese: /家豪[\s\S]*全國男性第 1 大/,
    brand: /senyue\.com：(已被註冊|查無登記)/,
    brandTaken: /google\.com：已被註冊/,
    personality: /開放性 50\/100/,          // 正向題 5 分、反向題也 5 分 → 平均 3 → 50
    family: /用了家長「王大明」名字中的「明」/,
    aiContext: /^# 成員分析,# 配對矩陣,# 團隊報告,# 鑑定書$/,
    ai: /^claude-opus-5 default user\/assistant\/user 4 h4 stopped$/
  };
  // 標題實際用哪個字型畫的（比 document.fonts 更直接：字型有沒有真的套用）
  // 書法體是簡體字型，標題「姓名和盤」的「盤」會退回 Noto Serif TC，所以只要求前段是書法體
  var titleFonts = '';
  try {
    var doc = await send('DOM.getDocument', { depth: -1 });
    var node = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: '.app-title' });
    var fonts = await send('CSS.getPlatformFontsForNode', { nodeId: node.result.nodeId });
    titleFonts = (fonts.result.fonts || []).map(function(x) { return x.familyName + '(' + x.glyphCount + ')'; }).join(', ');
  } catch (e) { titleFonts = 'error: ' + e.message; }
  expect.titleFonts = /^Ma Shan Zheng\([1-9]\d*\)/;
  result.titleFonts = titleFonts;

  var failed = 0;
  Object.keys(expect).forEach(function(key) {
    var v = String(result[key]);
    var bad = !expect[key].test(v) || /undefined|NaN/.test(v);
    if (bad) failed++;
    console.log((bad ? '✗ ' : '✓ ') + key + (bad ? '\n' + v : ''));
  });
  if (errors.length) { failed++; console.log('✗ console 錯誤：\n' + errors.join('\n')); }
  // 不依賴 CDN：除了本站與品牌工具刻意查詢的 RDAP，不該有別的 http(s) 請求
  // （擴充功能自己發出的請求不算：它們的發起者是 chrome-extension://）
  var RDAP = /^https:\/\/(rdap\.verisign\.com|rdap\.identitydigital\.services|pubapi\.registry\.google)\//;
  var external = requests.filter(function(r) {
    return /^https?:/.test(r.url) && r.url.indexOf(PAGE_ORIGIN) !== 0 && !RDAP.test(r.url) &&
      (r.from === '' || r.from.indexOf(PAGE_ORIGIN) === 0);
  }).map(function(r) { return r.url; });
  if (external.length) { failed++; console.log('✗ 有外部請求（離線時會失效）：\n' + external.join('\n')); }
  else console.log('✓ 沒有外部請求');
  ws.close();
  if (failed) process.exit(1);
  console.log('瀏覽器冒煙測試通過');
}()).catch(function(err) { console.error(err); process.exit(1); });
