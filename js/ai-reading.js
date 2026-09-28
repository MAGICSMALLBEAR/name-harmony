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
      desc: '把這次分析的所有結果交給 Claude 整合：找出各系統共同指向的特質、互相矛盾的地方，並可以繼續追問。',
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
      desc: 'Send all results from this analysis to Claude: it finds what the systems agree on, where they conflict, and you can ask follow-up questions.',
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

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ============ 金鑰 ============

  var memKey = '';
  function getKey() {
    if (memKey) return memKey;
    try { return localStorage.getItem(KEY_STORE) || ''; } catch (e) { return ''; }
  }
  function setKey(key, remember) {
    memKey = key;
    try {
      if (remember) localStorage.setItem(KEY_STORE, key);
      else localStorage.removeItem(KEY_STORE);
    } catch (e) { /* 無痕模式等情況：只存在記憶體 */ }
  }
  function clearKey() {
    memKey = '';
    try { localStorage.removeItem(KEY_STORE); } catch (e) {}
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
  function ask(userText, shown) {
    var key = getKey();
    if (!key || busy) return;
    busy = true;
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
      var u = msg.usage || {};
      reply.usage = t('usage')({ input: (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0), cacheRead: u.cache_read_input_tokens || 0, output: u.output_tokens || 0 });
      if (msg.model && msg.model !== MODEL) reply.usage += ' ' + t('fallback')(msg.model);
    }).catch(function(err) {
      reply.pending = false;
      messages.pop();                          // 失敗或停止的這輪不留在歷史，下一次可以重問
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
    ask(first, t('generate').replace(/^\S+\s/, ''));
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
    try { remembered = !!localStorage.getItem(KEY_STORE); } catch (e) {}
    return '<label class="tool-field"><span>' + t('keyLabel') + '</span><input type="password" class="form-input" id="aiKey" placeholder="' + t('keyPh') + '" autocomplete="off" spellcheck="false"></label>' +
      '<label class="ai-check"><input type="checkbox" id="aiRemember"' + (remembered ? ' checked' : '') + '> ' + t('remember') + '</label>' +
      '<button type="button" class="btn-download-img" id="aiSaveKey">' + t('saveKey') + '</button>' +
      '<p class="tool-note">' + t('keyHelp') + '</p>';
  }

  function messageHtml(m, i) {
    if (m.role === 'user') return '<div class="ai-msg ai-user"><div class="ai-who">' + t('you') + '</div><div class="ai-body">' + esc(m.text) + '</div></div>';
    return '<div class="ai-msg ai-bot" data-i="' + i + '"><div class="ai-who">Claude</div><div class="ai-body">' +
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
    html += '<div class="ai-key">' + keyHtml() + '</div>';
    if (getKey()) {
      html += '<p class="tool-note">' + t('privacy') + '</p>';
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
      messages = []; log = []; notice = '';
      render();
    } else if (id === 'aiSend') {
      followUp();
    }
  }

  function init() {
    var box = document.getElementById('aiContent');
    if (!box) return;
    box.addEventListener('click', onClick);
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
    messages = []; log = [];
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return {
    render: render, reset: reset,
    // 測試用：tools/browser-smoke.js 以模擬的 SDK 檢查對話流程，不需要金鑰
    collectContext: collectContext, renderMarkdown: renderMarkdown, SYSTEM: SYSTEM, MODEL: MODEL,
    _useSdk: function(mod) { sdk = mod; },
    _messages: function() { return messages; }
  };
})();
