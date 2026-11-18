/** 本機 JSON 備份：固定白名單，不讀取或匯入 AI 金鑰。所有寫入失敗時復原原資料。 */
window.DataBackup = (function() {
  'use strict';
  var FORMAT = 'name-harmony-backup', VERSION = 1, MAX_BYTES = 2 * 1024 * 1024;
  function L(z,e) { return window.L10N ? window.L10N.L(z,e) : z; }
  function fail(field) { throw new Error(L('備份格式不正確：', 'Invalid backup field: ') + field); }
  function obj(v, field) { if (!v || typeof v !== 'object' || Array.isArray(v)) fail(field); return v; }
  function str(v, max, field) {
    if (typeof v !== 'string' || v.length > max || /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v)) fail(field);
    return v;
  }
  function arr(v, max, field) { if (!Array.isArray(v) || v.length > max) fail(field); return v; }
  function date(v, field) { str(v,40,field); if (!Number.isFinite(Date.parse(v))) fail(field); return v; }
  function birthday(v) {
    str(v,16,'birthday'); if (!v) return v;
    var m = /^(\d{4})-(\d{2})-(\d{2})(?: ([01]\d|2[0-3]):([0-5]\d))?$/.exec(v);
    if (!m) fail('birthday');
    var d = new Date(Date.UTC(+m[1],+m[2]-1,+m[3]));
    if (+m[1] < 1900 || +m[1] > 2100 || d.getUTCFullYear() !== +m[1] || d.getUTCMonth()+1 !== +m[2] || d.getUTCDate() !== +m[3]) fail('birthday');
    return v;
  }
  function person(p) {
    obj(p,'person');
    var place = str(p.place || '',150,'place');
    if (place && window.BirthPlace.getPlace(place).key !== place) fail('place');
    var gender = p.gender || '', blood = p.blood || '';
    if (['','male','female'].indexOf(gender) < 0 || ['','A','B','O','AB'].indexOf(blood) < 0) fail('gender/blood');
    return { cn: str(p.cn || '',12,'cn'), en: str(p.en || '',60,'en'), birthday: birthday(p.birthday || ''),
      place: place, gender: gender, blood: blood, label: str(p.label || '',40,'label') };
  }
  function strokes(v) {
    if (v == null) return {};
    obj(v,'manualStrokes'); var out = Object.create(null), keys = Object.keys(v);
    if (keys.length > 500) fail('manualStrokes');
    keys.forEach(function(c) { if (Array.from(c).length !== 1 || !Number.isInteger(v[c]) || v[c] < 1 || v[c] > 64) fail('manualStrokes'); out[c] = v[c]; });
    return out;
  }
  function settings(v) {
    obj(v,'settings');
    var mode = v.relationship || 'general';
    if (window.ChartHarmony.modeKey(mode) !== mode || typeof v.tst !== 'boolean') fail('settings');
    return { relationship: mode, tst: v.tst };
  }
  function entry(v, profile) {
    obj(v,'entry');
    var out = { time: date(v.time,'time'), persons: arr(v.persons,5,'persons').map(person),
      pairs: arr(v.pairs || [],100,'pairs').map(function(p) {
        obj(p,'pair'); if (typeof p.score !== 'number' || !Number.isFinite(p.score) || p.score < 0 || p.score > 100) fail('score');
        return { a:str(p.a,40,'a'), b:str(p.b,40,'b'), mode:str(p.mode,60,'mode'), score:p.score, tier:str(p.tier,60,'tier') };
      }) };
    if (!out.persons.length) fail('persons');
    if (profile) out.name = str(v.name || '',100,'profile.name');
    if (v.relationship != null) out.relationship = settings({ relationship:v.relationship, tst:!!v.tst }).relationship;
    if (v.tst != null) { if (typeof v.tst !== 'boolean') fail('tst'); out.tst = v.tst; }
    if (v.manualStrokes != null) out.manualStrokes = strokes(v.manualStrokes);
    return out;
  }
  function prefs(v) {
    if (v == null) return null;
    obj(v,'namingPrefs');
    // 使用與取名工具相同的清理器；只回傳固定欄位。
    if (!window.NamingTools || !window.NamingTools.sanitizePrefs) fail('namingPrefs');
    return window.NamingTools.sanitizePrefs(v);
  }
  function validate(v) {
    obj(v,'root'); if (v.format !== FORMAT || v.version !== VERSION) fail('format/version');
    var d = obj(v.data,'data'), state = settings(d.settings), current = arr(d.currentPersons || [],5,'currentPersons').map(person);
    return { format: FORMAT, version: VERSION, exportedAt: date(v.exportedAt,'exportedAt'), data: {
      history: arr(d.history,20,'history').map(function(e) { return entry(e,false); }),
      profiles: arr(d.profiles,50,'profiles').map(function(e) { return entry(e,true); }),
      namingPrefs: prefs(d.namingPrefs), brandList: arr(d.brandList,8,'brandList').map(function(s) { return str(s,60,'brandList'); }),
      settings: state, manualStrokes: strokes(d.manualStrokes), currentPersons: current
    } };
  }
  function parse(text) {
    if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_BYTES) fail('size');
    var v; try { v = JSON.parse(text.replace(/^\uFEFF/,'')); } catch (e) { fail('JSON'); }
    return validate(v);
  }
  function read(storage,key,fallback) { var s = storage.getItem(key); return s == null ? fallback : JSON.parse(s); }
  function capture(storage, state) {
    return validate({ format:FORMAT, version:VERSION, exportedAt:new Date().toISOString(), data: {
      history:read(storage,'name-harmony-v3',[]), profiles:read(storage,'name-harmony-profiles',[]),
      namingPrefs:read(storage,'name-harmony-naming-prefs',null), brandList:read(storage,'name-harmony-brand-list',[]),
      settings:{ relationship:state.relationship || 'general', tst:!!state.tst }, manualStrokes:state.manualStrokes || {}, currentPersons:state.persons || []
    } });
  }
  function restore(storage, backup) {
    var d = validate(backup).data;
    var changes = {
      'name-harmony-v3':JSON.stringify(d.history), 'name-harmony-profiles':JSON.stringify(d.profiles),
      'name-harmony-naming-prefs': d.namingPrefs ? JSON.stringify(d.namingPrefs) : null,
      'name-harmony-brand-list':JSON.stringify(d.brandList), 'name-harmony-relationship':d.settings.relationship,
      'name-harmony-tst':String(d.settings.tst),
      'name-harmony-strokes':JSON.stringify(d.manualStrokes),
      'name-harmony-restored-draft':JSON.stringify({persons:d.currentPersons, relationship:d.settings.relationship,tst:d.settings.tst,manualStrokes:d.manualStrokes})
    };
    var keys = Object.keys(changes), previous = {};
    keys.forEach(function(k) { previous[k] = storage.getItem(k); });
    try {
      keys.forEach(function(k) { if (changes[k] === null) storage.removeItem(k); else storage.setItem(k,changes[k]); });
    } catch (e) {
      var rollbackFailed = false;
      keys.forEach(function(k) { try { if (previous[k] === null) storage.removeItem(k); else storage.setItem(k,previous[k]); } catch (_) { rollbackFailed = true; } });
      throw new Error(rollbackFailed ? L('還原失敗，部分原資料無法復原；請保留備份檔。', 'Restore failed and some original data could not be recovered; keep your backup file.') : L('儲存空間不足或無法寫入，已復原原資料。', 'Storage is full or unavailable. Original data has been restored.'));
    }
    return d;
  }
  var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  function toB64Url(strVal) {
    var bytes = new TextEncoder().encode(strVal), out = '';
    if (typeof btoa === 'function') {
      var bin = '';
      for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    for (var i = 0; i < bytes.length; i += 3) {
      var a = bytes[i], b = i + 1 < bytes.length ? bytes[i + 1] : 0, c = i + 2 < bytes.length ? bytes[i + 2] : 0;
      out += B64[a >> 2] + B64[((a & 3) << 4) | (b >> 4)];
      if (i + 1 < bytes.length) out += B64[((b & 15) << 2) | (c >> 6)];
      if (i + 2 < bytes.length) out += B64[c & 63];
    }
    return out;
  }
  function fromB64Url(token) {
    if (typeof token !== 'string' || !token || token.length > 8192 || !/^[A-Za-z0-9\-_]+$/.test(token)) fail('shareToken');
    var bytes;
    if (typeof atob === 'function') {
      var b64 = token.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      var bin = atob(b64);
      bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } else {
      var arrB = [];
      for (var i = 0; i < token.length; i += 4) {
        var c0 = B64.indexOf(token[i]), c1 = B64.indexOf(token[i + 1]);
        var c2 = i + 2 < token.length ? B64.indexOf(token[i + 2]) : -1;
        var c3 = i + 3 < token.length ? B64.indexOf(token[i + 3]) : -1;
        arrB.push((c0 << 2) | (c1 >> 4));
        if (c2 >= 0) arrB.push(((c1 & 15) << 4) | (c2 >> 2));
        if (c3 >= 0) arrB.push(((c2 & 3) << 6) | c3);
      }
      bytes = new Uint8Array(arrB);
    }
    if (typeof TextDecoder === 'function') return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    var pct = '';
    for (var j = 0; j < bytes.length; j++) pct += '%' + ('0' + bytes[j].toString(16)).slice(-2);
    return decodeURIComponent(pct);
  }
  function cleanPyMap(v) {
    if (v == null) return {};
    if (window.Phonetics && window.Phonetics.sanitizePinyinMap) return window.Phonetics.sanitizePinyinMap(v);
    obj(v, 'customPinyin');
    var out = Object.create(null);
    Object.keys(v).slice(0, 100).forEach(function(k) {
      if (/^(?:\d+:)?[\u4e00-\u9fff]$/.test(k) && /^[a-zv]+[1-5]$/.test(String(v[k]))) out[k] = String(v[k]);
    });
    return out;
  }
  function cleanDialectMaps(v) {
    var out = {};
    if (!v || typeof v !== 'object' || Array.isArray(v)) return out;
    ['yue', 'tw', 'hak'].forEach(function(lang) {
      if (!v[lang]) return;
      if (window.Phonetics && window.Phonetics.sanitizeDialectMap) {
        var m = window.Phonetics.sanitizeDialectMap(v[lang]);
        if (Object.keys(m).length) out[lang] = m;
      } else {
        obj(v[lang], 'customDialects');
        var sub = Object.create(null);
        Object.keys(v[lang]).slice(0, 60).forEach(function(k) {
          if (/^(?:\d+:)?[\u4e00-\u9fff]$/.test(k) && /^[a-z]+\d$/.test(String(v[lang][k]))) sub[k] = String(v[lang][k]);
        });
        if (Object.keys(sub).length) out[lang] = sub;
      }
    });
    return out;
  }
  function encodeShare(state) {
    obj(state, 'shareState');
    var ps = arr(state.persons || [], 5, 'persons').map(person);
    if (!ps.length) fail('persons');
    var usedChars = {};
    ps.forEach(function(p) { (p.cn || '').split('').forEach(function(c) { usedChars[c] = 1; }); });
    var allStrokes = strokes(state.manualStrokes);
    var usedStrokes = {};
    Object.keys(allStrokes).forEach(function(c) { if (usedChars[c]) usedStrokes[c] = allStrokes[c]; });
    var allPy = cleanPyMap(state.customPinyin);
    var usedPy = {};
    Object.keys(allPy).forEach(function(k) {
      var ch = k.slice(-1);
      if (usedChars[ch]) usedPy[k] = allPy[k];
    });
    var usedDia = {};
    var allDia = cleanDialectMaps(state.customDialects);
    Object.keys(allDia).forEach(function(lang) {
      var sub = {};
      Object.keys(allDia[lang]).forEach(function(k) { if (usedChars[k.slice(-1)]) sub[k] = allDia[lang][k]; });
      if (Object.keys(sub).length) usedDia[lang] = sub;
    });
    var st = settings({ relationship: state.relationship || 'general', tst: !!state.tst });
    var payload = {
      v: 1,
      p: ps.map(function(x) {
        var o = {};
        ['cn','en','birthday','place','gender','blood','label'].forEach(function(f) { if (x[f]) o[f] = x[f]; });
        return o;
      }),
      r: st.relationship,
      t: st.tst
    };
    if (state.pro) payload.pro = true;
    if (Object.keys(usedStrokes).length) payload.m = usedStrokes;
    if (Object.keys(usedPy).length) payload.py = usedPy;
    if (Object.keys(usedDia).length) payload.dy = usedDia;
    return toB64Url(JSON.stringify(payload));
  }
  function decodeShare(token) {
    var raw = fromB64Url(token);
    var v; try { v = JSON.parse(raw); } catch (e) { fail('shareJSON'); }
    obj(v, 'shareRoot');
    if (v.v !== 1) fail('shareVersion');
    var ps = arr(v.p, 5, 'persons').map(person);
    if (!ps.length) fail('persons');
    var st = settings({ relationship: v.r || 'general', tst: !!v.t });
    return {
      persons: ps,
      relationship: st.relationship,
      tst: st.tst,
      pro: !!v.pro,
      manualStrokes: strokes(v.m),
      customPinyin: cleanPyMap(v.py),
      customDialects: cleanDialectMaps(v.dy)
    };
  }
  return { capture:capture, parse:parse, validate:validate, restore:restore, strokes:strokes,
    encodeShare:encodeShare, decodeShare:decodeShare, MAX_BYTES:MAX_BYTES };
})();
