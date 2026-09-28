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
    // 字型依 unicode-range 切片：每套至少有一片已載入，且首次畫面不該把整套都載入
    await document.fonts.ready;
    const faces = [...document.fonts].filter(f => /^(Noto Sans TC|Noto Serif TC|Bakudai)$/.test(f.family.replace(/"/g, '')));
    out.fonts = ['Bakudai', 'Noto Sans TC', 'Noto Serif TC'].map(fam => {
      const mine = faces.filter(f => f.family.replace(/"/g, '') === fam);
      return fam + ':' + (mine.some(f => f.status === 'loaded') ? 'loaded' : 'none');
    }).join(' ');
    out.fontSlicesAtStart = faces.filter(f => f.status === 'loaded').length + '/' + faces.length;
    out.fontChecks = [
      document.fonts.check('16px "Noto Sans TC"', '姓名') ? 'sans' : 'NO-sans',
      document.fonts.check('16px "Noto Serif TC"', '姓名') ? 'serif' : 'NO-serif',
      document.fonts.check('16px "Bakudai"', '姓名') ? 'display' : 'NO-display'
    ].join(' ');

    // 分享圖：canvas 不會等字型下載。拿最後一片 Sans 切片的字來畫，畫完那一片應該已載入
    const lastSans = faces.filter(f => f.family.replace(/"/g, '') === 'Noto Sans TC').pop();
    const rareChar = String.fromCodePoint(parseInt(lastSans.unicodeRange.split(',')[0].trim().slice(2).split('-')[0], 16));
    const before = lastSans.status;
    await window.ShareCard.drawWithFonts(() => {
      const c = document.createElement('canvas'), ctx = c.getContext('2d');
      ctx.font = '16px "Noto Sans TC", sans-serif'; ctx.fillText(rareChar, 0, 16); return c;
    });
    out.canvasFont = before + '→' + lastSans.status;

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

    // 切換成英文：四個工具要重畫成英文，保留輸入與結果；品牌網域沿用已查到的結果，不重新查詢
    let rdapCalls = 0;
    const origFetch = window.fetch;
    window.fetch = function(u) { if (/rdap/.test(String(u))) rdapCalls++; return origFetch.apply(this, arguments); };
    const toggleLang = async (want) => { $('langToggle').click(); await wait(() => window.I18N.getLang() === want && document.querySelector('#toolBrand').parentElement.querySelector('summary').textContent !== (want === 'en' ? '🏢 品牌命名工作台' : '🏢 Brand Name Workbench')); await new Promise(r => setTimeout(r, 100)); };
    await toggleLang('en');
    const summaries = ['toolTrends', 'toolBrand', 'toolPersonality', 'toolFamily'].map(id => $(id).parentElement.querySelector('summary').textContent);
    const zhChars = s => (s.match(/[一-鿿]/g) || []).length;
    out.i18nTools = [
      summaries.every(s => zhChars(s) === 0) ? 'summaries-en' : 'summaries:' + summaries.join('|'),
      $('trendName').value === '陳家豪' && /most common male name in Taiwan/.test($('trendResult').innerText) ? 'trend-en' : 'trend:' + $('trendName').value + ':' + $('trendResult').innerText.slice(0, 80),
      $('brandName').value === 'google' && /google\\.com: registered/.test($('brandResult').innerText) && rdapCalls === 0 ? 'brand-en' : 'brand:rdap=' + rdapCalls + ':' + $('brandResult').innerText.slice(0, 120),
      [...document.querySelectorAll('#toolPersonality .bf')].every(s => s.value === '5') && /Openness 50\\/100/.test($('bfResult').innerText) ? 'bf-en' : 'bf:' + $('bfResult').innerText.slice(0, 80),
      $('familyCandidate').value === '王明軒' && /Uses 「明」 from parent 「王大明」/.test($('familyResult').innerText) ? 'family-en' : 'family:' + $('familyResult').innerText.slice(0, 120)
    ].join(' ');
    // 描述文字不該殘留中文（範例名字、書名號裡的字除外）
    out.i18nLeftover = ['toolTrends', 'toolBrand', 'toolPersonality', 'toolFamily'].map(id => {
      const el = $(id).cloneNode(true);
      el.querySelectorAll('input, .tool-cand-name').forEach(n => n.remove());
      // 使用者輸入的名字（例如配對行的「王大明 × 王明軒」）本來就是中文
      const names = [...$(id).querySelectorAll('input')].flatMap(i => i.value.split(/[、,，\\s]+/)).filter(Boolean);
      let txt = el.innerText.replace(/「[^」]*」/g, '').replace(/e\\.g\\.[^\\n]*/g, '');
      names.forEach(n => { txt = txt.split(n).join(''); });
      return id + ':' + zhChars(txt);
    }).join(' ');
    await toggleLang('zh');
    out.i18nBack = /時代感/.test($('trendResult').innerText) && /已被註冊/.test($('brandResult').innerText) && /開放性 50\\/100/.test($('bfResult').innerText) ? 'zh' : 'not-zh';
    window.fetch = origFetch;

    // AI 解讀：用模擬的 SDK 跑對話流程（不需要金鑰、不會呼叫 API）
    [...document.querySelectorAll('button')].find(b => /示範|Demo/.test(b.textContent)).click();
    $('analyzeBtn').click();
    await wait(() => $('reportContent') && $('reportContent').textContent.trim().length > 100);
    out.aiContext = window.AiReading.collectContext().match(/^# .*/gm).join(',');

    // 吉數姓名推薦：性別選單與「換一批」先前沒有事件處理，是死的
    const genSamples = [$('genResults').innerText];
    for (let i = 0; i < 3; i++) { $('genRefresh').click(); genSamples.push($('genResults').innerText); }
    out.genRefresh = new Set(genSamples).size > 1 ? 'changed' : 'same';
    $('genGender').value = 'female';
    $('genGender').dispatchEvent(new Event('change'));
    out.genGender = $('genResults').innerText.length > 0 ? 'rendered' : 'empty';

    // 易經起卦：人格→上卦、地格→下卦（先天八卦取數），動爻翻轉要得到真正的變卦
    const cnHex = window.ChineseNumerology.analyze('陳小明');
    const hex = window.IChing.nameToHexagram(cnHex);
    out.hexagram = hex.hexName + ' 上' + hex.upperTrigram + '下' + hex.lowerTrigram + ' ' + hex.movingYao + '爻→' + window.IChing.changedHexagram(hex).n;
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

    // 喜用神：日主強弱要看八字（扶抑法），不能因為名字不同而改變；吉日與幸運色沿用它
    $('proModeToggle').checked = true;
    $('proModeToggle').dispatchEvent(new Event('change'));
    $('backBtn').click();
    // 兩人同一個時辰出生、名字不同 → 喜用神必須相同（示範資料原本給兩人不同的生日）
    [$('cnA'), $('cnB')].forEach(function(inp, i) {
      const card = inp.closest('.person-section');
      card.querySelector('.bday-input').value = '1990-05-15';
      card.querySelector('.btime-input').value = '10:30';
      inp.value = i ? '林大維' : '陳小明';
    });
    $('analyzeBtn').click();
    await wait(() => !$('resultsSection').classList.contains('hidden'));
    document.querySelector('.tab-btn[data-tab="report"]').click();
    await wait(() => /喜用神/.test($('reportContent').innerText));
    out.xiYongUi = $('reportContent').innerText.replace(/\\s+/g, ' ');
    // 兩個名字不同、生日相同的人，鑑定書上的命格／用神／喜神必須一模一樣
    const strengths = [...out.xiYongUi.matchAll(/命格：(\\S+?) 用神：([木火土金水]) 喜神：([木火土金水])/g)].map(m => m.slice(1).join('/'));
    out.xiYongSame = strengths.length >= 2 && new Set(strengths).size === 1 ? 'same:' + strengths[0] : 'diff:' + strengths.join(' ');
    // 易經動爻：陳小明起得離為火、動第三爻 → 顯示爻辭原文與白話（不再是「尚未收錄」）
    out.yaoUi = (out.xiYongUi.match(/第3爻】 九三：[^ ]+ 白話：[^ ]+/) || [(out.xiYongUi.match(/動爻解析.{0,80}/) || ["（沒有爻辭）"])[0]])[0];
    // 風水方位要跟喜用神走，不能又退回人格五行
    out.fengshui = (out.xiYongUi.match(/依命格用神屬[木火土金水]，居家/) || ['（沒跟喜用神）'])[0];
    document.querySelector('.tab-btn[data-tab="lucky"]').click();
    await wait(() => /近期吉日|填入生日/.test($('luckyContent').innerText));
    out.luckyDays = $('luckyContent').innerText.replace(/\\s+/g, ' ');
    // 開運指南（水晶、色彩…）要跟鑑定書同一個用神，不能又退回人格五行
    const reportYong = [...out.xiYongUi.matchAll(/用神：([木火土金水])/g)].map(m => m[1]);
    const guideYong = [...document.querySelectorAll('#luckyContent .lucky-basis')].map(p => (p.innerText.match(/用神屬([木火土金水])/) || [, '人格'])[1]);
    out.luckyBasis = guideYong.length >= 2 && guideYong.join() === reportYong.slice(0, guideYong.length).join() ? 'same:' + guideYong.join() : 'guide:' + guideYong.join() + ' report:' + reportYong.join();

    // 行業建議跟風水同一個依據（用神）；改名對比要能輸入、比較，並列出喜用神補到了沒
    out.career = (out.xiYongUi.match(/用神屬[木火土金水]，較能發揮的領域：\\S+/) || ['（沒有行業建議）'])[0];
    document.querySelector('.tab-btn[data-tab="report"]').click();
    const rename = document.querySelector('.rename-compare');
    rename.querySelector('.rename-input').value = '陳大維';
    rename.querySelector('.rename-btn').click();
    out.rename = rename.querySelector('.rename-result').innerText.replace(/\\s+/g, ' ');
    rename.querySelector('.rename-input').value = '陳龘明';
    rename.querySelector('.rename-btn').click();
    out.renameUnknown = rename.querySelector('.rename-result').innerText.trim();

    // 生日靈數：1990-05-15 → 生命靈數 3、高峰 11/7/9/6；名字不同也一樣
    document.querySelector('.tab-btn[data-tab="members"]').click();
    await wait(() => document.querySelector('.birth-numerology'));
    const bn = [...document.querySelectorAll('.birth-numerology')].map(el => el.innerText.replace(/\\s+/g, ' '));
    out.lifePath = bn.length >= 2 && bn.every(t => /生命靈數 3 /.test(t)) ? 'both:3' : bn.join(' | ');
    const bnd = document.querySelector('.birth-numerology-detail');
    if (bnd) bnd.open = true;
    out.pinnacles = bnd ? [...bnd.innerText.replace(/\\s+/g, ' ').matchAll(/第[一二三四]高峰 ([\\d–]+ 歲(?:以後)?) (\\d+)/g)].map(m => m[1] + ':' + m[2]).join(',') : 'none';

    // 手動筆劃：筆劃庫沒有的字，補上筆劃後要真的完成分析（先前輸入值不會被套用，會卡在手動輸入卡）
    $('backBtn').click();
    $('cnA').value = '龘小明'; $('cnB').value = '王大明';
    $('analyzeBtn').click();
    await wait(() => !$('manualStrokeCard').classList.contains('hidden'));
    out.manualShown = $('manualStrokeCard').classList.contains('hidden') ? 'no' : 'yes';
    document.querySelectorAll('#manualStrokeFields input').forEach(i => { i.value = '48'; });
    $('manualStrokeBtn').click();
    await wait(() => !$('resultsSection').classList.contains('hidden'));
    out.manual = $('resultsSection').classList.contains('hidden') ? 'stuck'
      : /龘/.test($('membersContent').innerText) ? 'analyzed' : 'no-name';
    // 姓氏是罕用字：推薦區塊要沿用手動筆劃，不能整塊消失
    out.genManual = $('genResults') ? ($('genResults').querySelectorAll('.gen-name-card').length + ':' + (/^龘/.test($('genResults').innerText.trim()) ? '龘' : $('genResults').innerText.trim().slice(0, 20))) : 'no-block';
    const manualCn = window.ChineseNumerology.analyze('龘小明', { '龘': 48 });
    out.manualGrid = manualCn.grids.ren.number + '/' + manualCn.grids.zong.number;

    return out;
  })()`);

  var expect = {
    fonts: /^Bakudai:loaded Noto Sans TC:loaded Noto Serif TC:loaded$/,
    fontChecks: /^sans serif display$/,
    fontSlicesAtStart: /^([1-9]|1\d)\/\d{2,}$/,   // 首次畫面只載入少數幾片（不到 20 片）
    baby: /温/,
    printFonts: /^loaded check$/,
    canvasFont: /^unloaded→loaded$/,
    trendEnglish: /Linda[\s\S]*1940 年代[\s\S]*時代感/,
    trendBars: /^9$/,
    trendChinese: /家豪[\s\S]*全國男性第 1 大/,
    brand: /senyue\.com：(已被註冊|查無登記)/,
    brandTaken: /google\.com：已被註冊/,
    personality: /開放性 50\/100/,          // 正向題 5 分、反向題也 5 分 → 平均 3 → 50
    family: /用了家長「王大明」名字中的「明」/,
    i18nTools: /^summaries-en trend-en brand-en bf-en family-en$/,
    i18nLeftover: /^toolTrends:0 toolBrand:0 toolPersonality:0 toolFamily:0$/,
    i18nBack: /^zh$/,
    aiContext: /^# 成員分析,# 配對矩陣,# 團隊報告,# 鑑定書$/,
    ai: /^claude-opus-5 default user\/assistant\/user 4 h4 stopped$/,
    genRefresh: /^changed$/,
    genGender: /^rendered$/,
    // 鑑定書的喜用神區塊：日主（天干）、命格、用神、喜神都要出現
    xiYongUi: /日主：[木火土金水]（[甲乙丙丁戊己庚辛壬癸]） 命格：(身強|中和偏強|中和偏弱|身弱) 用神：[木火土金水] 喜神：[木火土金水]/,
    xiYongSame: /^same:/,
    fengshui: /^依命格用神屬[木火土金水]，居家$/,
    yaoUi: /^第3爻】 九三：日昃之離，不鼓缶而歌，則大耋之嗟，凶。 白話：/,
    luckyDays: /近期吉日（喜用[木火土金水]、[木火土金水]、避忌神/,
    luckyBasis: /^same:[木火土金水],[木火土金水]$/,
    career: /^用神屬[木火土金水]，較能發揮的領域：/,
    rename: /陳小明 → 陳大維：.+（吉數 \d→\d、凶數 \d→\d）.*天格.*總格.*命格喜用[木火土金水]、[木火土金水]：原名(已補|未補).*新名(已補|未補)/,
    renameUnknown: /「龘」不在筆劃庫，無法比較/,
    lifePath: /^both:3$/,
    pinnacles: /^0–33 歲:11,34–42 歲:7,43–51 歲:9,52 歲以後:6$/,

    // 陳小明：人格 19 % 8 = 3 → 離、地格 11 % 8 = 3 → 離（離為火）；
    // 總格 27 % 6 = 3 → 三爻動，下卦離 101 翻第三爻成 100（震）→ 火雷噬嗑
    hexagram: /^離為火 上離下離 3爻→火雷噬嗑$/,
    manualShown: /^yes$/,
    manual: /^analyzed$/,
    genManual: /^6:龘$/,
    // 龘 手動 48 劃：人格 48+3=51、總格 48+3+8=59
    manualGrid: /^51\/59$/
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
  expect.titleFonts = /^Bakudai\([1-9]\d*\)/;
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
