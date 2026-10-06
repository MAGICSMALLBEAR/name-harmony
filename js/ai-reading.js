/**
 * AI 綜合解讀：把畫面上的分析結果（成員分析、配對、團隊、鑑定書）交給 Claude 整合，並可追問
 * - 使用者自備 Claude API 金鑰，瀏覽器直接呼叫 API（沒有經過本站伺服器）
 * - 金鑰預設只存在記憶體；勾選「記住」才寫入這台裝置的 localStorage
 * - SDK 在第一次使用時從 jsDelivr 載入（鎖定版本）
 */
window.AiReading = (function() {

  var SDK_URL = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.128.0/+esm';
  var MODEL = 'claude-opus-5';
  var KEY_STORE = 'name-harmony-ai-key';

  // 每百萬 tokens 的美元價格（Anthropic 官方定價，2026-09）：輸入、輸出、快取讀取、快取寫入（5 分鐘／1 小時）
  // 只用來估算；實際金額以 Console 帳單為準。備援模型（fallbacks: 'default'）可能是 Opus 4.8
  var PRICES = {
    'claude-opus-5': { input: 5, output: 25, read: 0.5, write5m: 6.25, write1h: 10 },
    'claude-opus-4-8': { input: 5, output: 25, read: 0.5, write5m: 6.25, write1h: 10 },
    'claude-opus-5-5': { input: 4, output: 20, read: 0.2, write5m: 5, write1h: 8 },
    'claude-sonnet-5-5': { input: 2, output: 10, read: 0.2, write5m: 2.5, write1h: 4 }
  };

  // ---------- DeepSeek（OpenAI 相容的 Chat Completions，瀏覽器可直接呼叫） ----------
  var PROVIDER_STORE = 'name-harmony-ai-provider';
  var DS_MODEL_STORE = 'name-harmony-ai-ds-model';
  var DS_URL = 'https://api.deepseek.com/chat/completions';
  var DS_MODELS = ['deepseek-v4-pro', 'deepseek-flash'];
  // 尖峰時段的每百萬 tokens 美元價格（DeepSeek 官方定價，2026-10）；離峰半價
  var DS_PRICES = {
    'deepseek-v4-pro': { hit: 0.044, miss: 1.32, output: 3.96 },
    'deepseek-flash': { hit: 0.006, miss: 0.30, output: 1.20 }
  };

  /** DeepSeek 尖峰時段：UTC 週一至週五 01:00–04:00、06:00–10:00（中國國定假日也算離峰，這裡無法判斷） */
  function dsPeak(d) {
    var day = d.getUTCDay(), h = d.getUTCHours();
    return day >= 1 && day <= 5 && ((h >= 1 && h < 4) || (h >= 6 && h < 10));
  }

  /** DeepSeek 用量與費用：prompt_tokens＝快取命中＋未命中 */
  function dsUsageStats(usage, model, at) {
    var u = usage || {}, d = u.prompt_tokens_details || {};
    var hit = d.prompt_cache_hit_tokens != null ? d.prompt_cache_hit_tokens : (u.prompt_cache_hit_tokens || 0);
    var miss = d.prompt_cache_miss_tokens != null ? d.prompt_cache_miss_tokens : (u.prompt_cache_miss_tokens != null ? u.prompt_cache_miss_tokens : Math.max(0, (u.prompt_tokens || 0) - hit));
    var p = DS_PRICES[model], peak = dsPeak(at || new Date());
    var k = peak ? 1 : 0.5;
    return {
      model: model, input: miss, cacheWrite: 0, cacheRead: hit, output: u.completion_tokens || 0,
      reasoning: (u.completion_tokens_details || {}).reasoning_tokens || 0, peak: peak,
      cost: p ? (hit * p.hit + miss * p.miss + (u.completion_tokens || 0) * p.output) * k / 1e6 : null
    };
  }

  /** 拆 SSE：回傳完整的 data 事件（已 JSON.parse）、是否收到 [DONE]、剩下未完整的一行 */
  function parseSSE(buf) {
    var lines = buf.split('\n'), rest = lines.pop(), events = [], done = false;
    lines.forEach(function(line) {
      line = line.replace(/\r$/, '');
      if (line.indexOf('data:') !== 0) return;
      var data = line.slice(5).trim();
      if (data === '[DONE]') { done = true; return; }
      try { events.push(JSON.parse(data)); } catch (e) { /* keep-alive 或不完整的行 */ }
    });
    return { events: events, done: done, rest: rest };
  }

  var SYSTEM = [
    '你是「姓名和盤」App 的命理整合顧問。使用者會提供 App 對一位或多位成員的分析結果，涵蓋姓名學（五格、三才）、靈數、八字、易經、塔羅、紫微斗數、西洋占星、生肖星座血型、開運建議，以及多人之間的配對。',
    '你的工作是把這些系統的結果整合成一份讀得懂、用得上的解讀：',
    '1. 找出多個系統共同指向的特質與課題，說明是哪幾個系統、依據是什麼（引用結果中的具體數字或星曜，例如「人格 23 劃」「紫微命宮天機」）。',
    '2. 指出系統之間互相矛盾的地方，並說明可能的理解方式，不要硬湊成一致。',
    '3. 有多位成員時，說明彼此的互動模式與相處建議。',
    '4. 給出具體、可行的建議。',
    '原則：只根據提供的結果解讀，不要自行重新排盤或編造結果中沒有的星曜、數字；結果不足時直接說明缺什麼（例如沒有出生時間就沒有時柱與紫微命宮）。',
    '命理是文化傳統與自我反思的工具，不是科學預測；避免宿命論與恐嚇式說法，不做醫療、法律、投資的判斷。',
    '格式：使用 Markdown 的標題（##、###）、條列與粗體，不要使用表格。語氣溫和、直接，避免空泛的套話。'
  ].join('\n');

  var TEXT = {
    zh: {
      title: '🤖 AI 綜合解讀',
      desc: '把這次分析的所有結果交給 AI（Claude 或 DeepSeek）整合：找出各系統共同指向的特質、互相矛盾的地方，並可以繼續追問。',
      keyLabel: 'Claude API 金鑰',
      keyPh: 'sk-ant-...',
      remember: '記住金鑰（存在這台裝置的瀏覽器）',
      saveKey: '使用這個金鑰',
      keyHelp: '還沒有金鑰？到 <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">Anthropic Console</a> 建立，費用由金鑰所屬帳戶支付。',
      keySet: '已設定金鑰',
      changeKey: '更換',
      removeKey: '移除',
      privacy: '按下「產生」後，這次分析的結果（包含姓名、生日、出生地等）會直接從你的瀏覽器傳送到 Anthropic，不經過本站伺服器。金鑰只用於呼叫 Anthropic API。',
      generate: '✨ 產生綜合解讀',
      regenerate: '🔄 重新產生',
      needAnalysis: '請先在上方輸入姓名並完成分析。',
      askPh: '想追問什麼？例如：我們兩個合作時要注意什麼？',
      send: '送出',
      stop: '⏹ 停止',
      clear: '清除對話',
      you: '你',
      thinking: '思考中…',
      loadingSdk: '載入中…',
      stopped: '（已停止）',
      truncated: '（回覆太長被截斷，可以請它「繼續」）',
      refusal: '這個請求被模型拒絕了，請換個問法。',
      usage: function(u) { return '輸入 ' + u.input + ' tokens（快取讀取 ' + u.cacheRead + '）・輸出 ' + u.output + ' tokens'; },
      fallback: function(m) { return '（由備援模型 ' + m + ' 回覆）'; },
      provider: 'AI 服務', dsModel: 'DeepSeek 模型',
      dsModelName: { 'deepseek-v4-pro': 'V4 Pro（品質較好）', 'deepseek-flash': 'Flash（便宜、快）' },
      ds_keyLabel: 'DeepSeek API 金鑰', ds_keyPh: 'sk-...',
      ds_keyHelp: '還沒有金鑰？到 <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener">DeepSeek 開放平台</a> 建立並儲值，費用由金鑰所屬帳戶支付。',
      ds_privacy: '按下「產生」後，這次分析的結果（包含姓名、生日、出生地等）會直接從你的瀏覽器傳送到 DeepSeek（深度求索，中國公司），依其隱私政策處理，不經過本站伺服器。金鑰只用於呼叫 DeepSeek API。',
      dsPeak: '（尖峰時段計價）', dsOffPeak: '（離峰半價）',
      dsBalance: 'DeepSeek 帳戶餘額不足，請到開放平台儲值。',
      dsFiltered: '這個請求被 DeepSeek 的內容審查擋下，請換個問法。',
      dsBusy: 'DeepSeek 伺服器資源不足，請稍後再試。',
      timing: function(p) { return '・耗時 ' + p.s + ' 秒（首字 ' + p.first + ' 秒）・約 ' + p.cost; },
      session: function(p) { return '本次對話累計：' + p.n + ' 輪・輸入 ' + p.input + '・輸出 ' + p.output + ' tokens・約 ' + p.cost + (p.unknown ? '（另有 ' + p.unknown + ' 輪中斷，費用不明）' : ''); },
      exportUsage: '📊 匯出驗收紀錄', usageCopied: '已複製驗收紀錄',
      repTitle: 'AI 解讀驗收紀錄', repDate: '日期：', repModel: '模型：',
      repTotal: function(p) { return '合計 ' + p.n + ' 輪：輸入 ' + p.input + ' tokens、輸出 ' + p.output + ' tokens、耗時 ' + p.s + ' 秒、約 ' + p.cost + (p.unknown ? '（另有 ' + p.unknown + ' 輪中斷，費用不明）' : ''); },
      repHead: '| # | 類型 | 回覆模型 | 結束原因 | 輸入 | 快取寫入 | 快取讀取 | 輸出 | 首字（秒） | 耗時（秒） | 估算費用 |',
      repNote: '費用依官方定價估算（Claude 2026-09，含備援嘗試；DeepSeek 2026-10，依 UTC 時間區分尖峰／離峰，中國國定假日的離峰價未計入），實際金額以服務商後台帳單為準。本紀錄不含對話內容與金鑰。',
      errAuth: '金鑰無效或已被撤銷，請更換金鑰。',
      errPermission: '這個金鑰沒有使用此模型的權限。',
      errRate: '請求太頻繁或額度已用完，請稍後再試。',
      errNet: '無法連線到 Anthropic，請確認網路。',
      errSdk: '無法載入 Claude SDK（需要網路）。',
      errOther: function(m) { return '發生錯誤：' + m; },
      reset: '分析結果已更新，先前的 AI 對話已清除。',
      langLine: '請用繁體中文（台灣用語）回答。',
      firstAsk: '請依系統提示整合以上結果，開頭先用兩三句話總結，接著分段說明。'
    },
    en: {
      title: '🤖 AI Synthesis',
      desc: 'Send all results from this analysis to an AI (Claude or DeepSeek): it finds what the systems agree on, where they conflict, and you can ask follow-up questions.',
      keyLabel: 'Claude API key',
      keyPh: 'sk-ant-...',
      remember: 'Remember the key (stored in this browser)',
      saveKey: 'Use this key',
      keyHelp: 'No key yet? Create one in the <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">Anthropic Console</a>. Usage is billed to the key\'s account.',
      keySet: 'Key set',
      changeKey: 'Change',
      removeKey: 'Remove',
      privacy: 'When you press Generate, this analysis (including names, birthdays and birthplaces) is sent from your browser directly to Anthropic, not through this site. The key is only used to call the Anthropic API.',
      generate: '✨ Generate synthesis',
      regenerate: '🔄 Regenerate',
      needAnalysis: 'Enter names above and run an analysis first.',
      askPh: 'Ask a follow-up question…',
      send: 'Send',
      stop: '⏹ Stop',
      clear: 'Clear conversation',
      you: 'You',
      thinking: 'Thinking…',
      loadingSdk: 'Loading…',
      stopped: '(stopped)',
      truncated: '(The reply hit the length limit — ask it to continue.)',
      refusal: 'The model declined this request. Try rephrasing.',
      usage: function(u) { return 'Input ' + u.input + ' tokens (cache read ' + u.cacheRead + ') · output ' + u.output + ' tokens'; },
      fallback: function(m) { return '(answered by fallback model ' + m + ')'; },
      provider: 'AI service', dsModel: 'DeepSeek model',
      dsModelName: { 'deepseek-v4-pro': 'V4 Pro (higher quality)', 'deepseek-flash': 'Flash (cheap, fast)' },
      ds_keyLabel: 'DeepSeek API key', ds_keyPh: 'sk-...',
      ds_keyHelp: 'No key yet? Create one and top up on the <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener">DeepSeek Platform</a>. Usage is billed to the key\'s account.',
      ds_privacy: 'When you press Generate, this analysis (including names, birthdays and birthplaces) is sent from your browser directly to DeepSeek (a company based in China) and handled under its privacy policy, not through this site. The key is only used to call the DeepSeek API.',
      dsPeak: '(peak-hour pricing)', dsOffPeak: '(off-peak, half price)',
      dsBalance: 'Your DeepSeek balance is too low. Please top up on the platform.',
      dsFiltered: 'DeepSeek\'s content filter blocked this request. Try rephrasing.',
      dsBusy: 'DeepSeek is short on server capacity. Please try again later.',
      timing: function(p) { return ' · ' + p.s + ' s (first token ' + p.first + ' s) · about ' + p.cost; },
      session: function(p) { return 'This conversation: ' + p.n + ' turn' + (p.n === 1 ? '' : 's') + ' · input ' + p.input + ' · output ' + p.output + ' tokens · about ' + p.cost + (p.unknown ? ' (' + p.unknown + ' interrupted turn' + (p.unknown === 1 ? '' : 's') + ' not priced)' : ''); },
      exportUsage: '📊 Export usage log', usageCopied: 'Usage log copied',
      repTitle: 'AI Synthesis Usage Log', repDate: 'Date: ', repModel: 'Model: ',
      repTotal: function(p) { return p.n + ' turns: ' + p.input + ' input tokens, ' + p.output + ' output tokens, ' + p.s + ' s, about ' + p.cost + (p.unknown ? ' (' + p.unknown + ' interrupted, not priced)' : ''); },
      repHead: '| # | Kind | Served by | Stop reason | Input | Cache write | Cache read | Output | First token (s) | Total (s) | Est. cost |',
      repNote: 'Costs are estimated from list prices (Claude: September 2026, including fallback attempts; DeepSeek: October 2026, peak/off-peak by UTC time, Chinese public-holiday off-peak rates not applied); your provider\'s bill is authoritative. This log contains no conversation content and no key.',
      errAuth: 'The API key is invalid or revoked. Please change it.',
      errPermission: 'This key is not allowed to use this model.',
      errRate: 'Rate limited or out of credit. Please try again later.',
      errNet: 'Cannot reach Anthropic. Check your connection.',
      errSdk: 'Could not load the Claude SDK (requires internet).',
      errOther: function(m) { return 'Error: ' + m; },
      reset: 'The analysis changed, so the previous AI conversation was cleared.',
      langLine: 'Please answer in English. The analysis text is in Chinese; translate terms where helpful and keep the original Chinese term in parentheses.',
      firstAsk: 'Please synthesize the results above as described in the system prompt. Start with a two-to-three sentence summary, then go section by section.'
    }
  };
  function t(k) {
    var lang = window.I18N && window.I18N.getLang ? window.I18N.getLang() : 'zh';
    return (TEXT[lang] || TEXT.zh)[k];
  }

  /** 依目前服務取字串：DeepSeek 有專屬版本（ds_ 開頭）就用它 */
  function pt(k) {
    var d = provider === 'deepseek' ? t('ds_' + k) : null;
    return d != null ? d : t(k);
  }

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ============ 金鑰 ============

  // 服務：claude（預設）或 deepseek；兩家的金鑰分開保存
  var provider = 'claude', dsModel = DS_MODELS[0];
  try {
    if (localStorage.getItem(PROVIDER_STORE) === 'deepseek') provider = 'deepseek';
    if (DS_MODELS.indexOf(localStorage.getItem(DS_MODEL_STORE)) >= 0) dsModel = localStorage.getItem(DS_MODEL_STORE);
  } catch (e) {}
  function keyStore() { return provider === 'deepseek' ? KEY_STORE + '-deepseek' : KEY_STORE; }

  var memKeys = {};
  function getKey() {
    if (memKeys[provider]) return memKeys[provider];
    try { return localStorage.getItem(keyStore()) || ''; } catch (e) { return ''; }
  }
  function setKey(key, remember) {
    memKeys[provider] = key;
    try {
      if (remember) localStorage.setItem(keyStore(), key);
      else localStorage.removeItem(keyStore());
    } catch (e) { /* 無痕模式等情況：只存在記憶體 */ }
  }
  function clearKey() {
    memKeys[provider] = '';
    try { localStorage.removeItem(keyStore()); } catch (e) {}
  }

  // ============ 分析結果轉文字 ============

  var PANELS = [
    ['membersContent', '成員分析'],
    ['matrixContent', '配對矩陣'],
    ['teamContent', '團隊報告'],
    ['reportContent', '鑑定書']
  ];

  /** 把一個結果面板轉成純文字：展開所有摺疊、去掉按鈕與圖形，表格轉成「欄 值」 */
  function panelToText(el) {
    var box = el.cloneNode(true);
    box.querySelectorAll('details').forEach(function(d) { d.open = true; });
    box.querySelectorAll('button, select, input, textarea, svg, canvas, img, script, style, .report-actions, .report-cert-stamp, .rename-compare, .action-bar').forEach(function(n) { n.remove(); });
    box.querySelectorAll('.hidden').forEach(function(n) { n.classList.remove('hidden'); });
    box.querySelectorAll('table').forEach(function(tb) {
      var rows = [].slice.call(tb.rows).map(function(tr) { return [].slice.call(tr.cells).map(function(c) { return c.textContent.replace(/\s+/g, ' ').trim(); }); });
      var head = tb.rows[0] && tb.rows[0].querySelector('th') ? rows.shift() : null;
      var p = document.createElement('div');
      p.textContent = rows.map(function(cells) {
        return cells.map(function(v, i) { return head && head[i] ? head[i] + ' ' + v : v; }).join('｜');
      }).join('\n');
      p.style.whiteSpace = 'pre-line';
      tb.parentNode.replaceChild(p, tb);
    });
    // innerText 需要排版後才會依區塊換行：暫時放到畫面外
    box.style.cssText = 'position:absolute;left:-9999px;top:0;width:720px;';
    document.body.appendChild(box);
    var text = box.innerText;
    box.remove();
    return text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  /** @return 分析結果全文；還沒分析時回傳空字串 */
  function collectContext() {
    var parts = [];
    PANELS.forEach(function(p) {
      var el = document.getElementById(p[0]);
      if (!el || !el.textContent.trim() || el.querySelector('.empty-state') && el.children.length === 1) return;
      var text = panelToText(el);
      if (text) parts.push('# ' + p[1] + '\n\n' + text);
    });
    return parts.join('\n\n');
  }

  // ============ Markdown（只支援回覆會用到的：標題、條列、粗體、段落） ============

  function inline(s) {
    return esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
  }
  function renderMarkdown(md) {
    var out = [], list = null, para = [];
    function flushPara() { if (para.length) { out.push('<p>' + para.map(inline).join('<br>') + '</p>'); para = []; } }
    function flushList() { if (list) { out.push('</' + list + '>'); list = null; } }
    md.split('\n').forEach(function(line) {
      var m;
      if (!line.trim()) { flushPara(); flushList(); return; }
      if ((m = /^(#{1,4})\s+(.*)$/.exec(line))) {
        flushPara(); flushList();
        out.push('<h' + Math.min(6, m[1].length + 2) + ' class="ai-h">' + inline(m[2]) + '</h' + Math.min(6, m[1].length + 2) + '>');
      } else if ((m = /^\s*[-*•]\s+(.*)$/.exec(line)) || (m = /^\s*\d+[.)]\s+(.*)$/.exec(line))) {
        flushPara();
        var type = /^\s*\d/.test(line) ? 'ol' : 'ul';
        if (list !== type) { flushList(); out.push('<' + type + '>'); list = type; }
        out.push('<li>' + inline(m[1]) + '</li>');
      } else if (/^\s*(---|\*\*\*)\s*$/.test(line)) {
        flushPara(); flushList(); out.push('<hr>');
      } else {
        flushList(); para.push(line);
      }
    });
    flushPara(); flushList();
    return out.join('');
  }

  // ============ 對話 ============

  var sdk = null;          // import 後的模組
  var messages = [];       // 送給 API 的完整歷史（assistant 內容原封不動送回，保留 thinking 區塊）
  var log = [];            // 畫面上顯示的 [{ role, text, note }]
  var busy = false;
  var stream = null;
  var notice = '';         // 分析結果更新後的提示，下次產生時清除

  var turns = [];          // 每輪的用量紀錄（驗收用，不含對話內容）

  /** 一次嘗試的 tokens（缺的欄位當 0） */
  function tokensOf(u, model) {
    u = u || {};
    var cc = u.cache_creation || {};
    var w1h = cc.ephemeral_1h_input_tokens || 0;
    var write = u.cache_creation_input_tokens || 0;
    return { model: model, input: u.input_tokens || 0, cacheWrite: write, cacheWrite1h: Math.min(w1h, write), cacheRead: u.cache_read_input_tokens || 0, output: u.output_tokens || 0 };
  }

  /** 依定價估算一次嘗試的費用；不認得的模型回傳 null */
  function costOf(x) {
    var p = PRICES[x.model];
    if (!p) return null;
    return (x.input * p.input + (x.cacheWrite - x.cacheWrite1h) * p.write5m + x.cacheWrite1h * p.write1h + x.cacheRead * p.read + x.output * p.output) / 1e6;
  }

  /**
   * 整理一則回覆的用量。有備援時頂層 usage 只涵蓋最後一次嘗試，逐次的用量在 usage.iterations
   * @return { model, attempts: [tokens…], input, cacheWrite, cacheRead, output, cost（null＝有不認得的模型）, fellBack }
   */
  function usageStats(msg) {
    var u = (msg && msg.usage) || {};
    var its = Array.isArray(u.iterations) && u.iterations.length ? u.iterations : null;
    var attempts = its ? its.map(function(it) { return tokensOf(it, it.model || msg.model); }) : [tokensOf(u, msg && msg.model)];
    var sum = function(k) { return attempts.reduce(function(s, a) { return s + a[k]; }, 0); };
    var costs = attempts.map(costOf);
    return {
      model: msg && msg.model, attempts: attempts,
      input: sum('input'), cacheWrite: sum('cacheWrite'), cacheRead: sum('cacheRead'), output: sum('output'),
      cost: costs.some(function(c) { return c == null; }) ? null : costs.reduce(function(s, c) { return s + c; }, 0),
      fellBack: !!(its && its.some(function(it) { return it.type === 'fallback_message'; })) || !!(msg && msg.model && msg.model !== MODEL)
    };
  }

  function money(c) { return c == null ? '?' : 'US$' + (c < 0.01 ? c.toFixed(4) : c.toFixed(3)); }
  function secs(ms) { return ms == null ? '—' : (ms / 1000).toFixed(1); }

  /** 驗收紀錄（Markdown，只有數字，不含對話內容與金鑰） */
  function usageReport(list, date) {
    var tot = { input: 0, cacheWrite: 0, cacheRead: 0, output: 0, ms: 0, cost: 0 }, unknown = 0;
    var rows = list.map(function(x, i) {
      ['input', 'cacheWrite', 'cacheRead', 'output', 'ms'].forEach(function(k) { tot[k] += x[k] || 0; });
      if (x.cost == null) unknown++; else tot.cost += x.cost;
      return '| ' + [i + 1, x.kind, x.model || '—', x.stop || '—', x.input, x.cacheWrite, x.cacheRead, x.output, secs(x.ttft), secs(x.ms), money(x.cost)].join(' | ') + ' |';
    });
    return [
      '# ' + t('repTitle'), '',
      '- ' + t('repDate') + date,
      '- ' + t('repModel') + (provider === 'deepseek' ? 'DeepSeek ' + dsModel : MODEL + '（fallbacks: default）'),
      '- ' + t('repTotal')({ n: list.length, input: tot.input + tot.cacheWrite + tot.cacheRead, output: tot.output, s: secs(tot.ms), cost: money(tot.cost), unknown: unknown }), '',
      t('repHead'), '|' + new Array(12).join('---|'), rows.join('\n'), '',
      '> ' + t('repNote'), ''
    ].join('\n');
  }

  function loadSdk() {
    if (sdk) return Promise.resolve(sdk);
    return import(SDK_URL).then(function(mod) { sdk = mod; return mod; });
  }

  function errorText(err) {
    if (!sdk) return t('errSdk');
    if (err instanceof sdk.AuthenticationError) return t('errAuth');
    if (err instanceof sdk.PermissionDeniedError) return t('errPermission');
    if (err instanceof sdk.RateLimitError) return t('errRate');
    if (err instanceof sdk.APIConnectionError) return t('errNet');   // 在 APIError 之前：它是 APIError 的子類別
    if (err instanceof sdk.APIError) return t('errOther')((err.status ? err.status + ' ' : '') + err.message);
    return t('errOther')(err && err.message || String(err));
  }

  /** 送出一則使用者訊息並串流回覆 */
  /** DeepSeek：fetch 串流（SSE），歷史只存純文字（沒有工具時 reasoning_content 不需送回） */
  function askDeepSeek(userText, shown, kind) {
    var key = getKey();
    if (!key || busy) return;
    busy = true;
    var t0 = Date.now(), ttft = null, at = new Date(), model = dsModel;
    messages.push({ role: 'user', content: userText });
    log.push({ role: 'user', text: shown });
    var reply = { role: 'assistant', text: '', note: '', pending: true, by: 'DeepSeek' };
    log.push(reply);
    render();

    var ctrl = new AbortController();
    stream = { abort: function() { ctrl.abort(); } };
    var usage = null, finish = null, httpError = null;
    fetch(DS_URL, {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify({
        model: model, stream: true, stream_options: { include_usage: true },
        max_tokens: 32000, thinking: { type: 'enabled' },
        messages: [{ role: 'system', content: SYSTEM }].concat(messages)
      })
    }).then(function(res) {
      if (!res.ok) {
        return res.text().then(function(body) {
          var msg = '';
          try { msg = JSON.parse(body).error.message; } catch (e) { msg = body.slice(0, 200); }
          httpError = { status: res.status, message: msg };
          throw httpError;
        });
      }
      var reader = res.body.getReader(), dec = new TextDecoder(), buf = '';
      return (function pump() {
        return reader.read().then(function(r) {
          if (r.done) return;
          var p = parseSSE(buf + dec.decode(r.value, { stream: true }));
          buf = p.rest;
          p.events.forEach(function(ev) {
            if (ev.usage) usage = ev.usage;
            var c = ev.choices && ev.choices[0];
            if (!c) return;
            if (c.finish_reason) finish = c.finish_reason;
            if (c.delta && c.delta.content) {
              if (ttft == null) ttft = Date.now() - t0;
              reply.text += c.delta.content;
              reply.pending = false;
              updateReply(reply);
            }
          });
          return p.done ? null : pump();
        });
      })();
    }).then(function() {
      reply.pending = false;
      if (finish === 'content_filter' || finish === 'insufficient_system_resource') {
        reply.note = t(finish === 'content_filter' ? 'dsFiltered' : 'dsBusy');
        reply.error = finish !== 'content_filter';
        messages.pop();
      } else {
        messages.push({ role: 'assistant', content: reply.text });
        if (finish === 'length') reply.note = t('truncated');
      }
      var st = dsUsageStats(usage, model, at), ms = Date.now() - t0;
      turns.push({ kind: kind || 'follow-up', model: model, stop: finish, input: st.input, cacheWrite: 0, cacheRead: st.cacheRead, output: st.output, ttft: ttft, ms: ms, cost: usage ? st.cost : null });
      reply.usage = t('usage')({ input: st.input + st.cacheRead, cacheRead: st.cacheRead, output: st.output }) +
        t('timing')({ s: secs(ms), first: secs(ttft), cost: usage ? money(st.cost) : '?' }) + ' ' + t(st.peak ? 'dsPeak' : 'dsOffPeak');
    }).catch(function(err) {
      reply.pending = false;
      messages.pop();
      var aborted = err && err.name === 'AbortError';
      turns.push({ kind: kind || 'follow-up', model: null, stop: aborted ? 'aborted' : 'error', input: 0, cacheWrite: 0, cacheRead: 0, output: 0, ttft: ttft, ms: Date.now() - t0, cost: null });
      if (aborted) { reply.note = t('stopped'); return; }
      reply.error = true;
      if (httpError) {
        var s = httpError.status;
        reply.note = s === 401 ? t('errAuth') : s === 402 ? t('dsBalance') : s === 429 ? t('errRate') : t('errOther')(s + ' ' + httpError.message);
        if (s === 401) clearKey();
      } else {
        reply.note = t('errNet');
      }
    }).then(function() {
      busy = false;
      stream = null;
      render();
    });
  }

  function ask(userText, shown, kind) {
    if (provider === 'deepseek') return askDeepSeek(userText, shown, kind);
    var key = getKey();
    if (!key || busy) return;
    busy = true;
    var t0 = Date.now(), ttft = null;
    messages.push({ role: 'user', content: userText });
    log.push({ role: 'user', text: shown });
    var reply = { role: 'assistant', text: '', note: '', pending: true };
    log.push(reply);
    render();

    loadSdk().then(function(mod) {
      var client = new mod.default({ apiKey: key, dangerouslyAllowBrowser: true });
      stream = client.beta.messages.stream({
        model: MODEL,
        max_tokens: 16000,
        system: SYSTEM,
        thinking: { type: 'adaptive' },
        cache_control: { type: 'ephemeral' },   // 追問時重複利用已送出的分析結果
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',                    // 被安全機制拒絕時，由 API 自動改用建議的備援模型
        messages: messages
      });
      (async function() {
        for await (var ev of stream) {
          if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') {
            if (ttft == null) ttft = Date.now() - t0;
            reply.text += ev.delta.text;
            reply.pending = false;
            updateReply(reply);
          }
        }
      })().catch(function() { /* 錯誤由 finalMessage 處理 */ });
      return stream.finalMessage();
    }).then(function(msg) {
      reply.pending = false;
      if (msg.stop_reason === 'refusal') {
        reply.note = t('refusal');
        messages.pop();                        // 拒絕的這輪不留在歷史
      } else {
        messages.push({ role: 'assistant', content: msg.content });
        if (msg.stop_reason === 'max_tokens') reply.note = t('truncated');
      }
      var st = usageStats(msg), ms = Date.now() - t0;
      turns.push({ kind: kind || 'follow-up', model: st.model, stop: msg.stop_reason, input: st.input, cacheWrite: st.cacheWrite, cacheRead: st.cacheRead, output: st.output, ttft: ttft, ms: ms, cost: st.cost });
      reply.usage = t('usage')({ input: st.input + st.cacheWrite + st.cacheRead, cacheRead: st.cacheRead, output: st.output }) +
        t('timing')({ s: secs(ms), first: secs(ttft), cost: money(st.cost) });
      if (st.fellBack) reply.usage += ' ' + t('fallback')(msg.model);
    }).catch(function(err) {
      reply.pending = false;
      messages.pop();                          // 失敗或停止的這輪不留在歷史，下一次可以重問
      // 停止或失敗時拿不到 usage（已串流的部分仍可能計費），費用記為不明
      turns.push({ kind: kind || 'follow-up', model: null, stop: sdk && err instanceof sdk.APIUserAbortError ? 'aborted' : 'error', input: 0, cacheWrite: 0, cacheRead: 0, output: 0, ttft: ttft, ms: Date.now() - t0, cost: null });
      if (sdk && err instanceof sdk.APIUserAbortError) {
        reply.note = t('stopped');
      } else {
        reply.note = errorText(err);
        reply.error = true;
        if (sdk && err instanceof sdk.AuthenticationError) clearKey();
      }
    }).then(function() {
      busy = false;
      stream = null;
      render();
    });
  }

  function generate() {
    var ctx = collectContext();
    if (!ctx) { render(); return; }
    messages = []; log = [];
    notice = '';
    var first = '<analysis>\n' + ctx + '\n</analysis>\n\n' + t('langLine') + '\n' + t('firstAsk');
    turns = [];
    ask(first, t('generate').replace(/^\S+\s/, ''), 'analysis');
  }

  function followUp() {
    var box = document.getElementById('aiAsk');
    var q = box ? box.value.trim() : '';
    if (!q || !messages.length) return;
    box.value = '';
    ask(q, q);
  }

  // ============ 畫面 ============

  function hasAnalysis() {
    var el = document.getElementById('membersContent');
    return !!(el && el.textContent.trim());
  }

  function keyHtml() {
    var key = getKey();
    if (key) {
      return '<p class="tool-line">🔑 ' + t('keySet') + '（…' + esc(key.slice(-4)) + '）' +
        ' <button type="button" class="btn-action btn-action-secondary ai-small" id="aiChangeKey">' + t('changeKey') + '</button>' +
        ' <button type="button" class="btn-action btn-action-secondary ai-small" id="aiRemoveKey">' + t('removeKey') + '</button></p>';
    }
    var remembered = false;
    try { remembered = !!localStorage.getItem(keyStore()); } catch (e) {}
    return '<label class="tool-field"><span>' + pt('keyLabel') + '</span><input type="password" class="form-input" id="aiKey" placeholder="' + pt('keyPh') + '" autocomplete="off" spellcheck="false"></label>' +
      '<label class="ai-check"><input type="checkbox" id="aiRemember"' + (remembered ? ' checked' : '') + '> ' + t('remember') + '</label>' +
      '<button type="button" class="btn-download-img" id="aiSaveKey">' + t('saveKey') + '</button>' +
      '<p class="tool-note">' + pt('keyHelp') + '</p>';
  }

  function messageHtml(m, i) {
    if (m.role === 'user') return '<div class="ai-msg ai-user"><div class="ai-who">' + t('you') + '</div><div class="ai-body">' + esc(m.text) + '</div></div>';
    return '<div class="ai-msg ai-bot" data-i="' + i + '"><div class="ai-who">' + (m.by || 'Claude') + '</div><div class="ai-body">' +
      (m.text ? renderMarkdown(m.text) : m.pending ? '<p class="ai-pending">' + t('thinking') + '</p>' : '') + '</div>' +
      (m.note ? '<p class="tool-msg' + (m.error ? ' ai-error' : '') + '">' + esc(m.note) + '</p>' : '') +
      (m.usage ? '<p class="tool-note ai-usage">' + esc(m.usage) + '</p>' : '') + '</div>';
  }

  function render() {
    var box = document.getElementById('aiContent');
    if (!box) return;
    var draft = document.getElementById('aiAsk');
    var draftText = draft ? draft.value : '';
    var html = '<p class="tool-desc">' + t('desc') + '</p>';
    html += '<div class="tool-row"><label class="tool-field" style="flex:1;"><span>' + t('provider') + '</span><select class="form-input" id="aiProvider"' + (busy ? ' disabled' : '') + '>' +
      '<option value="claude">Claude（Anthropic）</option><option value="deepseek"' + (provider === 'deepseek' ? ' selected' : '') + '>DeepSeek</option></select></label>' +
      (provider === 'deepseek' ? '<label class="tool-field" style="flex:1;"><span>' + t('dsModel') + '</span><select class="form-input" id="aiDsModel"' + (busy ? ' disabled' : '') + '>' +
        DS_MODELS.map(function(m) { return '<option value="' + m + '"' + (m === dsModel ? ' selected' : '') + '>' + esc(t('dsModelName')[m]) + '</option>'; }).join('') + '</select></label>' : '') + '</div>';
    html += '<div class="ai-key">' + keyHtml() + '</div>';
    if (getKey()) {
      html += '<p class="tool-note">' + pt('privacy') + '</p>';
      if (!hasAnalysis()) html += '<p class="tool-msg">' + t('needAnalysis') + '</p>';
      else {
        html += '<div class="tool-actions">' +
          (busy ? '<button type="button" class="btn-download-img" id="aiStop">' + t('stop') + '</button>'
            : '<button type="button" class="btn-download-img" id="aiGo">' + (log.length ? t('regenerate') : t('generate')) + '</button>' +
              (log.length ? '<button type="button" class="btn-action btn-action-secondary" id="aiClear">' + t('clear') + '</button>' : '')) +
          '</div>';
      }
    }
    html += '<div class="ai-log" id="aiLog">' + (log.length ? log.map(messageHtml).join('') : notice ? '<p class="tool-note">' + notice + '</p>' : '') + '</div>';
    if (turns.length && !busy) {
      var tot = turns.reduce(function(a, x) {
        a.input += x.input + x.cacheWrite + x.cacheRead; a.output += x.output;
        if (x.cost == null) a.unknown++; else a.cost += x.cost;
        return a;
      }, { input: 0, output: 0, cost: 0, unknown: 0 });
      html += '<p class="tool-note ai-session">' + esc(t('session')({ n: turns.length, input: tot.input, output: tot.output, cost: money(tot.cost), unknown: tot.unknown })) +
        ' <button type="button" class="btn-action btn-action-secondary ai-small" id="aiExport">' + t('exportUsage') + '</button></p>';
    }
    if (messages.length && getKey()) {
      html += '<div class="ai-ask"><textarea class="form-input" id="aiAsk" rows="2" placeholder="' + t('askPh') + '"' + (busy ? ' disabled' : '') + '></textarea>' +
        '<button type="button" class="btn-download-img" id="aiSend"' + (busy ? ' disabled' : '') + '>' + t('send') + '</button></div>';
    }
    box.innerHTML = html;
    var newDraft = document.getElementById('aiAsk');
    if (newDraft && draftText) newDraft.value = draftText;
  }

  /** 串流時只更新最後一則回覆，避免整頁重繪 */
  function updateReply(reply) {
    var logEl = document.getElementById('aiLog');
    var i = log.indexOf(reply);
    var el = logEl && logEl.querySelector('.ai-bot[data-i="' + i + '"] .ai-body');
    if (el) el.innerHTML = renderMarkdown(reply.text);
    else render();
  }

  function onClick(e) {
    var id = e.target && e.target.id;
    if (id === 'aiSaveKey') {
      var v = (document.getElementById('aiKey').value || '').trim();
      if (!v) return;
      setKey(v, document.getElementById('aiRemember').checked);
      render();
    } else if (id === 'aiChangeKey' || id === 'aiRemoveKey') {
      clearKey();
      render();
    } else if (id === 'aiGo') {
      generate();
    } else if (id === 'aiStop') {
      if (stream) stream.abort();
    } else if (id === 'aiClear') {
      messages = []; log = []; notice = ''; turns = [];
      render();
    } else if (id === 'aiExport') {
      var d = new Date(), z = function(n) { return (n < 10 ? '0' : '') + n; };
      var date = d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([usageReport(turns, date)], { type: 'text/markdown;charset=utf-8' }));
      a.download = 'ai-usage-' + date + '.md';
      document.body.appendChild(a);
      a.click();
      setTimeout(function() { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    } else if (id === 'aiSend') {
      followUp();
    }
  }

  function init() {
    var box = document.getElementById('aiContent');
    if (!box) return;
    box.addEventListener('click', onClick);
    box.addEventListener('change', function(e) {
      var id = e.target && e.target.id;
      if (id === 'aiProvider') {
        // 兩家的對話格式不同（Claude 要送回 thinking 區塊），換服務就清掉對話
        if (busy && stream) stream.abort();
        provider = e.target.value === 'deepseek' ? 'deepseek' : 'claude';
        try { localStorage.setItem(PROVIDER_STORE, provider); } catch (err) {}
        messages = []; log = []; turns = []; notice = '';
        render();
      } else if (id === 'aiDsModel') {
        if (DS_MODELS.indexOf(e.target.value) >= 0) dsModel = e.target.value;
        try { localStorage.setItem(DS_MODEL_STORE, dsModel); } catch (err) {}
      }
    });
    box.addEventListener('keydown', function(e) {
      if (e.target.id === 'aiAsk' && e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); followUp(); }
      if (e.target.id === 'aiKey' && e.key === 'Enter') document.getElementById('aiSaveKey').click();
    });
    render();
  }

  /** 分析結果重新產生時呼叫：舊對話根據的是舊結果，清掉 */
  function reset() {
    if (busy && stream) stream.abort();
    if (log.length) notice = t('reset');
    messages = []; log = []; turns = [];
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return {
    render: render, reset: reset,
    // 測試用：tools/browser-smoke.js 以模擬的 SDK 檢查對話流程，不需要金鑰
    collectContext: collectContext, renderMarkdown: renderMarkdown, SYSTEM: SYSTEM, MODEL: MODEL,
    usageStats: usageStats, usageReport: usageReport, PRICES: PRICES,
    dsUsageStats: dsUsageStats, dsPeak: dsPeak, parseSSE: parseSSE, DS_PRICES: DS_PRICES, DS_MODELS: DS_MODELS,
    _turns: function() { return turns; },
    _useSdk: function(mod) { sdk = mod; },
    _messages: function() { return messages; }
  };
})();
