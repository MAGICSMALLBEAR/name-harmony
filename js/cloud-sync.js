/**
 * 雲端同步引擎 — GitHub 私密 Gist（純前端零後端、免費永不休眠）
 * - 未設定／未登入時完全零網路請求
 * - 透過 DataBackup 固定白名單打包，嚴格排除 AI API 金鑰與同步 Token
 * - 支援雙向智慧合併（merge）、上傳覆蓋（push）、下載覆蓋（pull）與離線待同步佇列
 */
window.CloudSync = (function() {
  'use strict';

  var API_BASE = 'https://api.github.com';
  var SYNC_FILE = 'name-harmony-sync.json';
  var GIST_DESC = '姓名和盤 Name Harmony — 雲端同步備份（自動管理，請勿公開）';
  var CFG_STORE = 'name-harmony-sync-cfg';
  var TOKEN_STORE = 'name-harmony-sync-token';
  var PENDING_STORE = 'name-harmony-sync-pending';

  var memToken = '';
  var customFetch = null;
  var stateProvider = null;
  var appliedCallback = null;
  var syncTimer = null;
  var syncing = false;
  var statusSpec = null;
  var statusIsError = false;
  function setStatus(zh, en, isErr) { statusSpec = zh ? { zh: zh, en: en || zh } : null; statusIsError = !!isErr; }
  function statusText() { return statusSpec ? L(statusSpec.zh, statusSpec.en) : ''; }

  function lang() {
    return window.I18N && window.I18N.getLang ? window.I18N.getLang() : 'zh';
  }
  function L(zh, en) { return lang() === 'en' ? en : zh; }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function getStorage(s) {
    if (s) return s;
    try { return window.localStorage; } catch (e) { return null; }
  }
  function fetchImpl() {
    return customFetch || (typeof fetch === 'function' ? fetch.bind(window) : null);
  }
  function isOnline() {
    return typeof navigator === 'undefined' || navigator.onLine !== false;
  }

  // ============ 設定、Token 與離線佇列 ============

  function readJson(storage, key, fallback) {
    if (!storage) return fallback;
    try {
      var raw = storage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  }

  function loadConfig(storage) {
    var s = getStorage(storage);
    var raw = readJson(s, CFG_STORE, {}) || {};
    return {
      gistId: typeof raw.gistId === 'string' && /^[a-f0-9]{10,64}$/i.test(raw.gistId) ? raw.gistId : '',
      userLogin: typeof raw.userLogin === 'string' ? raw.userLogin.slice(0, 60) : '',
      autoSync: !!raw.autoSync,
      lastSyncAt: typeof raw.lastSyncAt === 'string' ? raw.lastSyncAt : '',
      lastMode: typeof raw.lastMode === 'string' ? raw.lastMode : ''
    };
  }

  function saveConfig(cfg, storage) {
    var s = getStorage(storage);
    if (!s) return;
    try {
      s.setItem(CFG_STORE, JSON.stringify({
        gistId: cfg.gistId || '',
        userLogin: cfg.userLogin || '',
        autoSync: !!cfg.autoSync,
        lastSyncAt: cfg.lastSyncAt || '',
        lastMode: cfg.lastMode || ''
      }));
    } catch (e) {}
  }

  function getToken(storage) {
    if (memToken) return memToken;
    var s = getStorage(storage);
    if (!s) return '';
    try { return s.getItem(TOKEN_STORE) || ''; } catch (e) { return ''; }
  }

  function setToken(token, remember, storage) {
    memToken = String(token || '').trim();
    var s = getStorage(storage);
    if (!s) return;
    try {
      if (remember && memToken) s.setItem(TOKEN_STORE, memToken);
      else s.removeItem(TOKEN_STORE);
    } catch (e) {}
  }

  function clearToken(storage) {
    memToken = '';
    var s = getStorage(storage);
    if (!s) return;
    try { s.removeItem(TOKEN_STORE); } catch (e) {}
  }

  function getPending(storage) {
    var s = getStorage(storage);
    var p = readJson(s, PENDING_STORE, null);
    return p && p.pending ? p : null;
  }

  function setPending(reason, storage) {
    var s = getStorage(storage);
    if (!s) return null;
    var prev = getPending(s) || { pending: true, reasons: [], queuedAt: new Date().toISOString() };
    if (reason && prev.reasons.indexOf(reason) < 0) prev.reasons.push(reason);
    prev.pending = true;
    prev.updatedAt = new Date().toISOString();
    try { s.setItem(PENDING_STORE, JSON.stringify(prev)); } catch (e) {}
    return prev;
  }

  function clearPending(storage) {
    var s = getStorage(storage);
    if (!s) return;
    try { s.removeItem(PENDING_STORE); } catch (e) {}
  }

  // ============ 雙向智慧合併（純函式，可單元測試） ============

  function isBackupEmpty(b) {
    var d = b && b.data;
    if (!d) return true;
    var hasPerson = (d.currentPersons || []).some(function(p) { return !!(p.cn || p.en || p.birthday); });
    var hasDialect = Object.keys(d.customDialects || {}).some(function(k) { return Object.keys(d.customDialects[k] || {}).length > 0; });
    return !d.history.length && !d.profiles.length && !d.brandList.length && !(d.brandFeedback || []).length &&
      !d.namingPrefs && !Object.keys(d.manualStrokes || {}).length && !Object.keys(d.customPinyin || {}).length &&
      !hasDialect && !hasPerson;
  }

  function mergeMaps(primary, secondary, limit) {
    var out = {};
    var keys = Object.keys(primary || {}).concat(Object.keys(secondary || {}));
    keys.forEach(function(k) {
      if (out[k] !== undefined) return;
      if (Object.keys(out).length >= limit) return;
      out[k] = (primary && primary[k] !== undefined) ? primary[k] : secondary[k];
    });
    return out;
  }

  function mergeBackups(localBackup, remoteBackup) {
    var DB = window.DataBackup;
    var loc = DB.validate(localBackup);
    var rem = DB.validate(remoteBackup);
    var l = loc.data, r = rem.data;
    var locEmpty = isBackupEmpty(loc), remEmpty = isBackupEmpty(rem);
    var locTs = Date.parse(loc.exportedAt) || 0;
    var remTs = Date.parse(rem.exportedAt) || 0;
    var preferLocal = remEmpty ? true : locEmpty ? false : locTs >= remTs;
    var newer = preferLocal ? l : r;
    var older = preferLocal ? r : l;

    // 歷史記錄：以 time 去重，由新到舊取最多 20 筆
    var histMap = {};
    newer.history.concat(older.history).forEach(function(e) {
      if (!histMap[e.time]) histMap[e.time] = e;
    });
    var history = Object.keys(histMap).map(function(k) { return histMap[k]; })
      .sort(function(a, b) { return Date.parse(b.time) - Date.parse(a.time); }).slice(0, 20);

    // 客戶檔案：同名保留較新時間，無名以 time 去重，最多 50 筆
    var profMap = {};
    newer.profiles.concat(older.profiles).forEach(function(e) {
      var key = e.name ? 'n:' + e.name.trim().toLowerCase() : 't:' + e.time;
      if (!profMap[key] || Date.parse(e.time) > Date.parse(profMap[key].time)) profMap[key] = e;
    });
    var profiles = Object.keys(profMap).map(function(k) { return profMap[k]; })
      .sort(function(a, b) { return Date.parse(b.time) - Date.parse(a.time); }).slice(0, 50);

    // 品牌比較清單：聯集去重（英文不分大小寫），最多 8 個
    var brandSeen = {}, brandList = [];
    newer.brandList.concat(older.brandList).forEach(function(s) {
      var k = s.trim().toLowerCase();
      if (!k || brandSeen[k] || brandList.length >= 8) return;
      brandSeen[k] = true;
      brandList.push(s);
    });

    // 品牌調性本機回饋：以 id 去重，由新到舊取最多 200 筆
    var fbMap = {};
    (newer.brandFeedback || []).concat(older.brandFeedback || []).forEach(function(item) {
      var k = item.id || (item.time + '|' + item.name.toLowerCase());
      if (!fbMap[k] || Date.parse(item.time) > Date.parse(fbMap[k].time)) fbMap[k] = item;
    });
    var brandFeedback = Object.keys(fbMap).map(function(k) { return fbMap[k]; })
      .sort(function(a, b) { return Date.parse(b.time) - Date.parse(a.time); }).slice(0, 200);

    // 筆劃與自訂讀音：鍵值合併（較新端優先）
    var manualStrokes = mergeMaps(newer.manualStrokes, older.manualStrokes, 500);
    var customPinyin = mergeMaps(newer.customPinyin, older.customPinyin, 100);
    var customDialects = {};
    ['yue', 'tw', 'hak', 'hhl'].forEach(function(dk) {
      var m = mergeMaps(newer.customDialects && newer.customDialects[dk], older.customDialects && older.customDialects[dk], 60);
      if (Object.keys(m).length) customDialects[dk] = m;
    });

    var newerHasPersons = (newer.currentPersons || []).some(function(p) { return !!(p.cn || p.en || p.birthday); });
    var currentPersons = newerHasPersons ? newer.currentPersons : older.currentPersons;
    var namingPrefs = newer.namingPrefs || older.namingPrefs || null;
    var settings = newer.settings;

    var merged = DB.validate({
      format: loc.format,
      version: loc.version,
      exportedAt: new Date(Math.max(locTs, remTs, Date.now())).toISOString(),
      data: {
        history: history,
        profiles: profiles,
        namingPrefs: namingPrefs,
        brandList: brandList,
        brandFeedback: brandFeedback,
        settings: settings,
        manualStrokes: manualStrokes,
        customPinyin: customPinyin,
        customDialects: customDialects,
        currentPersons: currentPersons
      }
    });

    return {
      backup: merged,
      stats: {
        history: history.length,
        profiles: profiles.length,
        brandList: brandList.length,
        brandFeedback: brandFeedback.length,
        strokes: Object.keys(manualStrokes).length,
        pinyin: Object.keys(customPinyin).length,
        dialects: Object.keys(customDialects).reduce(function(s, k) { return s + Object.keys(customDialects[k]).length; }, 0)
      }
    };
  }

  function payloadEqual(a, b) {
    if (!a || !b) return false;
    return JSON.stringify(a.data) === JSON.stringify(b.data);
  }

  // ============ GitHub Gist API ============

  function ghHeaders(token, withBody) {
    var h = {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
    if (withBody) h['Content-Type'] = 'application/json';
    return h;
  }

  function ghRequest(path, opts, token) {
    var f = fetchImpl();
    if (!f) return Promise.reject(new Error(L('此環境不支援網路請求。', 'Network requests are unavailable in this environment.')));
    var url = /^https?:\/\//.test(path) ? path : API_BASE + path;
    var reqOpts = {
      method: (opts && opts.method) || 'GET',
      headers: ghHeaders(token, !!(opts && opts.body))
    };
    if (opts && opts.body) reqOpts.body = opts.body;
    return f(url, reqOpts).then(function(res) {
      return res.text().then(function(txt) {
        var json = null;
        try { json = txt ? JSON.parse(txt) : null; } catch (e) {}
        if (!res.ok) {
          var err = new Error((json && json.message) || ('HTTP ' + res.status));
          err.status = res.status;
          err.scopes = res.headers && res.headers.get ? res.headers.get('x-oauth-scopes') : '';
          throw err;
        }
        return { data: json, text: txt, status: res.status, headers: res.headers };
      });
    });
  }

  function friendlyError(err, storage) {
    if (!err) return L('同步失敗。', 'Sync failed.');
    if (err.status === 401) {
      clearToken(storage);
      return L('GitHub Token 無效或已過期，已清除本機 Token，請重新輸入。', 'GitHub token is invalid or expired. Local token cleared — please reconnect.');
    }
    if (err.status === 403 || err.status === 429) {
      return L('權限不足（請確認 Token 勾選 gist 權限）或觸發 GitHub 頻率限制。', 'Permission denied (ensure the token has gist scope) or GitHub rate limit reached.');
    }
    if (err.status === 404) {
      return L('找不到指定的私密 Gist（可能已刪除或 Token 無權讀取）。', 'Private Gist not found (deleted or inaccessible with this token).');
    }
    if (/Failed to fetch|NetworkError|network|fetch/i.test(err.message || '')) {
      return L('無法連線到 GitHub，變更已留在離線佇列，恢復網路後自動重試。', 'Cannot reach GitHub. Changes remain queued and will retry when back online.');
    }
    return err.message || L('同步失敗。', 'Sync failed.');
  }

  function extractGistBackup(gist, token) {
    var file = gist && gist.files && gist.files[SYNC_FILE];
    if (!file) return Promise.resolve(null);
    var getContent = file.truncated && file.raw_url
      ? ghRequest(file.raw_url, { method: 'GET' }, token).then(function(r) { return r.text; })
      : Promise.resolve(file.content || '');
    return getContent.then(function(content) {
      if (!content || !content.trim()) return null;
      return window.DataBackup.parse(content);
    });
  }

  function findExistingGist(token, preferredId) {
    if (preferredId) {
      return ghRequest('/gists/' + encodeURIComponent(preferredId), { method: 'GET' }, token).then(function(r) {
        return r.data;
      });
    }
    return ghRequest('/gists?per_page=100', { method: 'GET' }, token).then(function(r) {
      var list = Array.isArray(r.data) ? r.data : [];
      for (var i = 0; i < list.length; i++) {
        if (list[i] && list[i].public === false && list[i].files && list[i].files[SYNC_FILE]) {
          return ghRequest('/gists/' + encodeURIComponent(list[i].id), { method: 'GET' }, token).then(function(g) { return g.data; });
        }
      }
      return null;
    });
  }

  function writeGist(token, gistId, backup) {
    var body = JSON.stringify({
      description: GIST_DESC,
      public: false,
      files: (function() { var o = {}; o[SYNC_FILE] = { content: JSON.stringify(backup, null, 2) }; return o; })()
    });
    if (gistId) {
      return ghRequest('/gists/' + encodeURIComponent(gistId), { method: 'PATCH', body: body }, token).then(function(r) { return r.data; });
    }
    return ghRequest('/gists', { method: 'POST', body: body }, token).then(function(r) { return r.data; });
  }

  // ============ 公開同步流程 ============

  function defaultState() {
    if (typeof stateProvider === 'function') return stateProvider();
    return { persons: [], relationship: 'general', tst: false };
  }

  function syncNow(opts) {
    opts = opts || {};
    var storage = getStorage(opts.storage);
    var mode = opts.mode || 'merge';
    var token = opts.token || getToken(storage);
    if (!token) {
      return Promise.reject(new Error(L('尚未設定 GitHub Token。', 'GitHub token not configured.')));
    }
    if (!isOnline()) {
      setPending('offline-' + mode, storage);
      return Promise.resolve({ queued: true, offline: true });
    }
    var cfg = loadConfig(storage);
    var targetGistId = opts.gistId !== undefined ? opts.gistId : cfg.gistId;
    var state = opts.state || defaultState();
    var localBackup = window.DataBackup.capture(storage, state);

    syncing = true;
    renderUI();

    var flow = Promise.resolve().then(function() {
      if (mode === 'push') {
        return writeGist(token, targetGistId, localBackup).then(function(g) {
          return { gist: g, finalBackup: localBackup, uploaded: true, restored: false };
        });
      }
      return findExistingGist(token, targetGistId).then(function(remoteGist) {
        if (!remoteGist) {
          if (mode === 'pull') {
            throw new Error(L('雲端尚無同步 Gist，請先執行「雙向同步」或「上傳覆蓋雲端」。', 'No cloud sync Gist found yet. Run Two-way Sync or Push first.'));
          }
          return writeGist(token, '', localBackup).then(function(g) {
            return { gist: g, finalBackup: localBackup, uploaded: true, restored: false, created: true };
          });
        }
        return extractGistBackup(remoteGist, token).then(function(remoteBackup) {
          if (mode === 'pull') {
            if (!remoteBackup) throw new Error(L('雲端 Gist 內容為空。', 'Remote Gist backup is empty.'));
            window.DataBackup.restore(storage, remoteBackup);
            return { gist: remoteGist, finalBackup: remoteBackup, uploaded: false, restored: true };
          }
          var mergedRes = remoteBackup ? mergeBackups(localBackup, remoteBackup) : { backup: localBackup };
          var merged = mergedRes.backup;
          var needRestore = !payloadEqual(localBackup, merged);
          var needUpload = !remoteBackup || !payloadEqual(remoteBackup, merged);
          if (needRestore) window.DataBackup.restore(storage, merged);
          var up = needUpload ? writeGist(token, remoteGist.id, merged) : Promise.resolve(remoteGist);
          return up.then(function(g) {
            return { gist: g, finalBackup: merged, uploaded: needUpload, restored: needRestore, stats: mergedRes.stats };
          });
        });
      });
    });

    return flow.then(function(res) {
      cfg.gistId = (res.gist && res.gist.id) || cfg.gistId;
      cfg.lastSyncAt = new Date().toISOString();
      cfg.lastMode = mode;
      saveConfig(cfg, storage);
      clearPending(storage);
      syncing = false;
      if (res.created) setStatus('已建立私密 Gist 並完成首次備份。', 'Created private Gist and completed first backup.', false);
      else if (mode === 'push') setStatus('已上傳本機資料至雲端私密 Gist。', 'Pushed local data to private Gist.', false);
      else if (mode === 'pull') setStatus('已從雲端私密 Gist 還原至本機。', 'Pulled data from private Gist to this device.', false);
      else if (res.restored && res.uploaded) setStatus('已完成雙向合併，本機與雲端已更新至最新。', 'Two-way merge complete — both local and cloud updated.', false);
      else if (res.restored) setStatus('已從雲端同步較新資料至本機。', 'Synced newer changes from cloud to this device.', false);
      else if (res.uploaded) setStatus('已將本機最新變更同步至雲端。', 'Uploaded latest local changes to cloud.', false);
      else setStatus('本機與雲端資料完全一致。', 'Local and cloud data are already in sync.', false);
      renderUI();
      var cb = opts.onApplied || appliedCallback;
      if (res.restored && typeof cb === 'function') cb(res.finalBackup);
      return res;
    }, function(err) {
      syncing = false;
      if (!err || !err.status) setPending('retry-' + mode, storage);
      var msg = friendlyError(err, storage);
      setStatus(msg, msg, true);
      renderUI();
      throw err;
    });
  }

  function connect(opts) {
    opts = opts || {};
    var storage = getStorage(opts.storage);
    var token = String(opts.token || '').trim();
    if (!token) return Promise.reject(new Error(L('請輸入 GitHub Token。', 'Please enter a GitHub token.')));
    var manualGist = String(opts.gistId || '').trim();
    if (manualGist && !/^[a-f0-9]{10,64}$/i.test(manualGist)) {
      return Promise.reject(new Error(L('Gist ID 格式不正確（應為英數十六進位字串）。', 'Invalid Gist ID format.')));
    }
    syncing = true;
    setStatus('驗證 GitHub Token 中…', 'Verifying GitHub token…', false);
    renderUI();

    return ghRequest('/user', { method: 'GET' }, token).then(function(uRes) {
      var scopes = uRes.headers && uRes.headers.get ? (uRes.headers.get('x-oauth-scopes') || '') : '';
      // 僅對 Classic PAT（有回傳 x-oauth-scopes）檢查 gist 權限；Fine-grained PAT 不回傳此標頭
      if (scopes && !/\bgist\b/.test(scopes)) {
        var e = new Error(L('此 Token 未勾選 gist 權限，無法讀寫私密 Gist。', 'This token lacks the gist scope.'));
        e.status = 403;
        throw e;
      }
      var login = (uRes.data && uRes.data.login) || 'github-user';
      setToken(token, !!opts.remember, storage);
      var cfg = loadConfig(storage);
      cfg.userLogin = login;
      if (manualGist) cfg.gistId = manualGist;
      cfg.autoSync = opts.autoSync !== false;
      saveConfig(cfg, storage);
      return syncNow({ mode: 'merge', storage: storage, token: token, gistId: manualGist || cfg.gistId, state: opts.state, onApplied: opts.onApplied });
    }, function(err) {
      syncing = false;
      var msg = friendlyError(err, storage);
      setStatus(msg, msg, true);
      renderUI();
      throw err;
    });
  }

  function disconnect(storage) {
    var s = getStorage(storage);
    if (syncTimer) { clearTimeout(syncTimer); syncTimer = null; }
    clearToken(s);
    clearPending(s);
    var cfg = loadConfig(s);
    cfg.userLogin = '';
    cfg.autoSync = false;
    saveConfig(cfg, s);
    setStatus('已中斷雲端同步並清除本機 Token（本機分析資料保留）。', 'Disconnected cloud sync and cleared local token (local data kept).', false);
    renderUI();
  }

  /** 資料變更時通知雲端同步：未設定 Token 或未開自動同步時完全不做任何網路呼叫 */
  function markDirty(reason, storage) {
    var s = getStorage(storage);
    var token = getToken(s);
    var cfg = loadConfig(s);
    if (!token || !cfg.autoSync) return false;
    setPending(reason || 'change', s);
    if (!isOnline()) {
      setStatus('離線中，變更已加入同步佇列，恢復網路後自動同步。', 'Offline — changes queued and will sync automatically when back online.', false);
      renderUI();
      return true;
    }
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(function() {
      syncTimer = null;
      if (!syncing && getToken(s) && loadConfig(s).autoSync && isOnline()) {
        syncNow({ mode: 'merge', storage: s }).catch(function() {});
      }
    }, 2500);
    renderUI();
    return true;
  }

  function flushPending(storage) {
    var s = getStorage(storage);
    if (syncing || !isOnline()) return Promise.resolve(null);
    if (!getToken(s) || !loadConfig(s).autoSync || !getPending(s)) return Promise.resolve(null);
    return syncNow({ mode: 'merge', storage: s }).catch(function() { return null; });
  }

  // ============ UI ============

  function renderUI() {
    var box = typeof document !== 'undefined' ? document.getElementById('cloudSyncBox') : null;
    if (!box) return;
    var cfg = loadConfig();
    var token = getToken();
    var pending = getPending();
    var remembered = false;
    try { remembered = !!localStorage.getItem(TOKEN_STORE); } catch (e) {}
    var prevDetails = document.getElementById('cloudSyncDetails');
    var curStatus = statusText();
    var shouldOpen = !!(token || curStatus || (prevDetails && prevDetails.open));
    var summaryBadge = token ? ' ✅ @' + esc(cfg.userLogin || 'GitHub') : '';
    var html = '<details class="cloud-sync-details" id="cloudSyncDetails"' + (shouldOpen ? ' open' : '') + '>' +
      '<summary class="cloud-sync-header">☁️ ' +
      L('雲端同步（GitHub 私密 Gist · 免費永不休眠）', 'Cloud Sync (GitHub Private Gist · Free, Always-On)') + summaryBadge + '</summary>';
    html += '<p class="tool-note">' +
      L('資料僅存於你自己的 GitHub 私密 Gist，不經本站伺服器；嚴格排除 AI API 金鑰與對話。未設定時完全零網路請求。',
        'Data is stored only in your own private GitHub Gist — never through this site. AI API keys and chats are strictly excluded. Zero network requests when disconnected.') + '</p>';

    if (!token) {
      html += '<div class="cloud-sync-form">' +
        '<label class="tool-field"><span>' + L('GitHub Personal Access Token（僅需 gist 權限）', 'GitHub Personal Access Token (gist scope only)') + '</span>' +
        '<input type="password" id="cloudSyncToken" class="form-input" placeholder="ghp_... / github_pat_..." autocomplete="off" spellcheck="false"></label>' +
        '<label class="tool-field"><span>' + L('指定既有 Gist ID（選填，留空會自動尋找或新建私密 Gist）', 'Existing Gist ID (optional — leave blank to auto-find or create)') + '</span>' +
        '<input type="text" id="cloudSyncGistId" class="form-input" value="' + esc(cfg.gistId) + '" placeholder="' + L('留空自動偵測', 'Auto-detect if blank') + '" autocomplete="off" spellcheck="false"></label>' +
        '<label class="ai-check"><input type="checkbox" id="cloudSyncRemember"' + (remembered ? ' checked' : '') + '> ' + L('記住 Token（僅存於此瀏覽器）', 'Remember token (stored in this browser only)') + '</label>' +
        '<label class="ai-check"><input type="checkbox" id="cloudSyncAuto" checked> ' + L('資料變更時自動背景同步（含離線佇列）', 'Auto-sync on changes (with offline queue)') + '</label>' +
        '<div class="tool-actions">' +
        '<button type="button" class="btn-action" id="cloudSyncConnect"' + (syncing ? ' disabled' : '') + '>🔗 ' + L('連線並雙向同步', 'Connect & Sync') + '</button>' +
        '<a class="btn-action btn-action-secondary" target="_blank" rel="noopener" href="https://github.com/settings/tokens/new?scopes=gist&description=Name%20Harmony%20Sync">🔑 ' + L('建立 GitHub Gist Token', 'Create GitHub Gist Token') + '</a>' +
        '</div></div>';
    } else {
      var gistUrl = cfg.gistId ? 'https://gist.github.com/' + encodeURIComponent(cfg.gistId) : '';
      html += '<div class="cloud-sync-connected">' +
        '<p class="tool-line">✅ ' + L('已連線帳號：', 'Connected: ') + '<strong>@' + esc(cfg.userLogin || 'GitHub') + '</strong>' +
        (cfg.gistId ? '・Gist <a href="' + gistUrl + '" target="_blank" rel="noopener"><code>' + esc(cfg.gistId.slice(0, 10)) + '…</code></a>' : '') + '</p>' +
        '<p class="tool-note">' +
        (cfg.lastSyncAt ? L('上次同步：', 'Last synced: ') + esc(new Date(cfg.lastSyncAt).toLocaleString()) : L('尚未完成同步', 'Not synced yet')) +
        (pending ? '・<strong style="color:var(--color-fortune-neutral);">⏳ ' + L('有待同步離線變更', 'Pending offline changes') + '</strong>' : '') +
        '</p>' +
        '<label class="ai-check"><input type="checkbox" id="cloudSyncAutoLive"' + (cfg.autoSync ? ' checked' : '') + '> ' + L('資料變更時自動同步（含離線佇列）', 'Auto-sync on changes (with offline queue)') + '</label>' +
        '<div class="tool-actions">' +
        '<button type="button" class="btn-action" id="cloudSyncMerge"' + (syncing ? ' disabled' : '') + '>🔄 ' + L('立即雙向同步', 'Two-way Sync Now') + '</button>' +
        '<button type="button" class="btn-action btn-action-secondary" id="cloudSyncPush"' + (syncing ? ' disabled' : '') + '>⬆️ ' + L('本機覆蓋雲端', 'Push to Cloud') + '</button>' +
        '<button type="button" class="btn-action btn-action-secondary" id="cloudSyncPull"' + (syncing ? ' disabled' : '') + '>⬇️ ' + L('雲端覆蓋本機', 'Pull from Cloud') + '</button>' +
        '<button type="button" class="btn-action btn-action-secondary" id="cloudSyncDisconnect"' + (syncing ? ' disabled' : '') + '>🔌 ' + L('中斷連線', 'Disconnect') + '</button>' +
        '</div></div>';
    }
    if (curStatus) {
      html += '<p id="cloudSyncStatus" class="tool-msg' + (statusIsError ? ' ai-error' : '') + '" role="status" aria-live="polite">' + esc(curStatus) + '</p>';
    }
    html += '</details>';
    box.innerHTML = html;
  }

  function init(opts) {
    opts = opts || {};
    stateProvider = opts.getState || stateProvider;
    appliedCallback = opts.onApplied || appliedCallback;
    var box = typeof document !== 'undefined' ? document.getElementById('cloudSyncBox') : null;
    if (box && !box.dataset.bound) {
      box.dataset.bound = '1';
      box.addEventListener('click', function(e) {
        var id = e.target && e.target.id;
        if (id === 'cloudSyncConnect') {
          var tok = document.getElementById('cloudSyncToken');
          var gid = document.getElementById('cloudSyncGistId');
          var rem = document.getElementById('cloudSyncRemember');
          var auto = document.getElementById('cloudSyncAuto');
          connect({
            token: tok ? tok.value : '',
            gistId: gid ? gid.value : '',
            remember: !!(rem && rem.checked),
            autoSync: !!(auto && auto.checked)
          }).catch(function() {});
        } else if (id === 'cloudSyncMerge') {
          syncNow({ mode: 'merge' }).catch(function() {});
        } else if (id === 'cloudSyncPush') {
          syncNow({ mode: 'push' }).catch(function() {});
        } else if (id === 'cloudSyncPull') {
          syncNow({ mode: 'pull' }).catch(function() {});
        } else if (id === 'cloudSyncDisconnect') {
          disconnect();
        }
      });
      box.addEventListener('change', function(e) {
        if (e.target && e.target.id === 'cloudSyncAutoLive') {
          var cfg = loadConfig();
          cfg.autoSync = !!e.target.checked;
          saveConfig(cfg);
        }
      });
      if (typeof window !== 'undefined') {
        window.addEventListener('online', function() { flushPending(); });
      }
    }
    renderUI();
    // 僅在已記住 Token、開啟自動同步、且存在未完成離線佇列時才自動續傳；未設定時零網路請求
    if (getToken() && loadConfig().autoSync && getPending() && isOnline()) {
      flushPending();
    }
  }

  return {
    init: init,
    render: renderUI,
    connect: connect,
    disconnect: disconnect,
    syncNow: syncNow,
    mergeBackups: mergeBackups,
    markDirty: markDirty,
    flushPending: flushPending,
    loadConfig: loadConfig,
    getPending: getPending,
    getToken: getToken,
    SYNC_FILE: SYNC_FILE,
    _setFetch: function(fn) { customFetch = fn || null; },
    _clearMem: function() { memToken = ''; statusSpec = null; statusIsError = false; syncing = false; }
  };
})();
