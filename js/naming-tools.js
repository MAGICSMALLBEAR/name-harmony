/**
 * 取名工具區（表單下方）：外國人取中文名
 * 介面跟著中英文切換；「用這個名字分析」會把名字填回表單並開始分析
 * 需要：js/foreign-name.js、js/i18n.js
 */
window.NamingTools = (function() {

  var TEXT = {
    zh: {
      title: '取名工具',
      foreignTitle: '🌏 外國人取中文名',
      foreignDesc: '輸入英文名字，挑幾個想要的特質，會給出音義兼顧的中文名，並檢查五格與諧音。',
      enName: '英文名字（名 姓）',
      enNamePh: '例：Michael Smith',
      gender: '性別',
      any: '不限', male: '男', female: '女',
      traits: '想要的特質（可複選）',
      go: '✨ 取名',
      needName: '請輸入英文名字',
      none: '找不到合適的組合，試試換個特質或不限性別',
      surname: '姓氏',
      knownSound: '依慣用譯名的讀音比對',
      guessSound: '這個名字沒有收錄慣用譯名，依英文拼字估計讀音',
      typeName: { '音譯': '音譯', '音義': '音義', '意譯': '意譯' },
      typeDesc: { '音譯': '兩個字都取英文名的音', '音義': '第一字取音、第二字取意', '意譯': '只取字義' },
      sound: '讀音',
      wuge: '五格吉數',
      sancai: '三才',
      phon: '音韻',
      analyze: '🔮 用這個名字分析',
      copy: '📋 複製',
      copied: '已複製'
    },
    en: {
      title: 'Naming Tools',
      foreignTitle: '🌏 Get a Chinese Name',
      foreignDesc: 'Enter your English name and pick a few traits. You get Chinese names that echo your name\'s sound and carry good meanings, checked for stroke numerology and awkward homophones.',
      enName: 'English name (first last)',
      enNamePh: 'e.g. Michael Smith',
      gender: 'Gender',
      any: 'Any', male: 'Male', female: 'Female',
      traits: 'Traits you\'d like (pick any)',
      go: '✨ Suggest Names',
      needName: 'Please enter an English name',
      none: 'No good combination found — try other traits or "Any" gender',
      surname: 'Surname',
      knownSound: 'Matched to the standard Chinese transliteration of your name',
      guessSound: 'No standard transliteration on file — sound estimated from spelling',
      typeName: { '音譯': 'Sound', '音義': 'Sound + Meaning', '意譯': 'Meaning' },
      typeDesc: { '音譯': 'both characters echo your name', '音義': 'first echoes your name, second is chosen for meaning', '意譯': 'chosen for meaning only' },
      sound: 'Sound',
      wuge: 'Lucky grids',
      sancai: 'San Cai',
      phon: 'Phonetics',
      analyze: '🔮 Analyze this name',
      copy: '📋 Copy',
      copied: 'Copied'
    }
  };

  var TRAIT_EN = {
    '智慧': 'wisdom', '勇敢': 'courage', '溫柔': 'gentleness', '快樂': 'joy', '正直': 'integrity', '美麗': 'beauty', '成功': 'success',
    '和平': 'peace', '自由': 'freedom', '創意': 'creativity', '仁慈': 'kindness', '堅毅': 'perseverance', '光明': 'brightness', '自然': 'nature'
  };
  var GRADE_EN = { '良好': 'good', '尚可': 'fair', '需注意': 'caution' };

  function lang() { return window.I18N && window.I18N.getLang() === 'en' ? 'en' : 'zh'; }
  function t(k) { return TEXT[lang()][k]; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /** 數字聲調 → 聲調符號（ming2 → míng） */
  var MARKS = { a: 'āáǎà', e: 'ēéěè', i: 'īíǐì', o: 'ōóǒò', u: 'ūúǔù', 'ü': 'ǖǘǚǜ' };
  function toneMark(py) {
    var m = /^([a-zv]+)([1-5])$/.exec(py || '');
    if (!m) return py || '';
    var s = m[1].replace(/v/g, 'ü'), tone = +m[2];
    if (tone === 5) return s;
    var idx = s.search(/[ae]/);
    if (idx < 0) idx = s.indexOf('ou');
    if (idx < 0) { var v = s.match(/[iouü]/g); idx = v ? s.lastIndexOf(v[v.length - 1]) : -1; }
    if (idx < 0) return s;
    var ch = s.charAt(idx);
    return s.slice(0, idx) + MARKS[ch].charAt(tone - 1) + s.slice(idx + 1);
  }

  // ---------- 外國人取中文名 ----------
  var state = { english: '', gender: '', traits: [], result: null };

  function renderForeign() {
    var box = document.getElementById('toolForeign');
    if (!box || !window.ForeignName) return;
    var en = lang() === 'en';
    var html = '<p class="tool-desc">' + t('foreignDesc') + '</p>';
    html += '<div class="tool-row">';
    html += '<label class="tool-field" style="flex:3;"><span>' + t('enName') + '</span><input type="text" class="form-input" id="fnEnglish" maxlength="60" autocomplete="off" placeholder="' + t('enNamePh') + '" value="' + esc(state.english) + '"></label>';
    html += '<label class="tool-field" style="flex:1;"><span>' + t('gender') + '</span><select class="form-input" id="fnGender">' +
      ['', 'male', 'female'].map(function(g) { return '<option value="' + g + '"' + (state.gender === g ? ' selected' : '') + '>' + t(g || 'any') + '</option>'; }).join('') + '</select></label>';
    html += '</div>';
    html += '<div class="tool-field"><span>' + t('traits') + '</span><div class="tool-chips">';
    window.ForeignName.TRAITS.forEach(function(tr) {
      var on = state.traits.indexOf(tr) >= 0;
      html += '<label class="tool-chip' + (on ? ' on' : '') + '"><input type="checkbox" value="' + tr + '"' + (on ? ' checked' : '') + '>' + tr + (en ? ' <small>' + TRAIT_EN[tr] + '</small>' : '') + '</label>';
    });
    html += '</div></div>';
    html += '<button type="button" class="btn-download-img" id="fnGo">' + t('go') + '</button>';
    html += '<div id="fnResults">' + (state.result ? renderForeignResults(state.result) : '') + '</div>';
    box.innerHTML = html;
  }

  function renderForeignResults(r) {
    if (r.error) return '<p class="tool-msg">' + t('needName') + '</p>';
    if (!r.candidates.length) return '<p class="tool-msg">' + t('none') + '</p>';
    var en = lang() === 'en';
    var DB = window.PinyinDB;
    var s = r.surname;
    var why = !en ? s.why : s.sound ? 'from the "' + s.sound + '" sound of ' + s.from : 'common Chinese surname for ' + s.from;
    var colon = en ? ': ' : '：';
    var html = '<p class="tool-note">' + t('surname') + colon + '<strong>' + esc(s.c) + '</strong>' + (en ? ' (' + esc(why) + ')' : '（' + esc(why) + '）') + '<br>' +
      (r.known ? t('knownSound') + colon + esc(r.sounds.join(' ')) : t('guessSound')) + '</p>';
    r.candidates.forEach(function(c, i) {
      var chars = [r.surname.c].concat(c.chars.map(function(x) { return x.c; }));
      var pys = chars.map(function(ch, k) { return toneMark(k === 0 ? (DB.SURNAME[ch] || DB.CHAR[ch]) : DB.CHAR[ch]); });
      var ph = c.phonetics;
      html += '<div class="tool-cand">';
      html += '<div class="tool-cand-head"><span class="tool-cand-name">' + c.name + '</span><span class="tool-cand-py">' + pys.join(' ') + '</span>' +
        '<span class="tool-badge" title="' + t('typeDesc')[c.type] + '">' + t('typeName')[c.type] + '</span></div>';
      if (c.soundText) html += '<p class="tool-line">🔊 ' + t('sound') + '：' + esc(c.soundText) + '</p>';
      html += '<p class="tool-line">' + c.chars.map(function(x) {
        return '<strong>' + x.c + '</strong> ' + x.meaning + (en ? ' (' + x.tags.map(function(tg) { return TRAIT_EN[tg]; }).join(', ') + ')' : '');
      }).join(en ? '; ' : '；') + '</p>';
      html += '<p class="tool-line tool-meta">' + t('wuge') + ' ' + c.good + '/5・' + t('sancai') + ' ' + esc(c.level || '-') +
        (ph ? '・' + t('phon') + ' ' + (en ? GRADE_EN[ph.grade] || ph.grade : ph.grade) : '') + '</p>';
      html += '<div class="tool-actions"><button type="button" class="btn-action btn-action-secondary fn-analyze" data-i="' + i + '">' + t('analyze') + '</button>' +
        '<button type="button" class="btn-action btn-action-secondary fn-copy" data-i="' + i + '">' + t('copy') + '</button></div>';
      html += '</div>';
    });
    return html;
  }

  function readForeignForm() {
    state.english = (document.getElementById('fnEnglish') || {}).value || '';
    state.gender = (document.getElementById('fnGender') || {}).value || '';
    state.traits = [].map.call(document.querySelectorAll('#toolForeign .tool-chip input:checked'), function(el) { return el.value; });
  }

  function runForeign() {
    readForeignForm();
    state.result = window.ForeignName.suggest({ english: state.english, gender: state.gender, traits: state.traits });
    document.getElementById('fnResults').innerHTML = renderForeignResults(state.result);
  }

  // ---------- 寶寶取名 ----------
  var ELS = ['木', '火', '土', '金', '水'];
  var EL_EN = { '木': 'Wood', '火': 'Fire', '土': 'Earth', '金': 'Metal', '水': 'Water' };
  var baby = { surname: '', gender: '', single: false, date: '', time: '', gen: '', genPos: 1, avoid: '', traits: [], fav: [], unfav: [], xy: null, bazi: null, result: null };

  function chipsHtml(name, list, selected, labelFn) {
    return '<div class="tool-chips">' + list.map(function(v) {
      var on = selected.indexOf(v) >= 0;
      return '<label class="tool-chip' + (on ? ' on' : '') + '"><input type="checkbox" name="' + name + '" value="' + v + '"' + (on ? ' checked' : '') + '>' + labelFn(v) + '</label>';
    }).join('') + '</div>';
  }

  function renderBaby() {
    var box = document.getElementById('toolBaby');
    if (!box || !window.BabyName) return;
    var en = lang() === 'en';
    var elLabel = function(e) { return '<span class="element-' + e + '">' + e + '</span>' + (en ? ' <small>' + EL_EN[e] + '</small>' : ''); };
    var html = '<p class="tool-desc">' + t('babyDesc') + '</p>';
    html += '<div class="tool-row">';
    html += '<label class="tool-field" style="flex:1;"><span>' + t('surname') + '</span><input type="text" class="form-input" id="bbSurname" maxlength="2" autocomplete="off" value="' + esc(baby.surname) + '"></label>';
    html += '<label class="tool-field" style="flex:1;"><span>' + t('gender') + '</span><select class="form-input" id="bbGender">' +
      ['', 'male', 'female'].map(function(g) { return '<option value="' + g + '"' + (baby.gender === g ? ' selected' : '') + '>' + t(g || 'any') + '</option>'; }).join('') + '</select></label>';
    html += '<label class="tool-field" style="flex:1;"><span>' + t('nameLen') + '</span><select class="form-input" id="bbSingle"><option value="0">' + t('double') + '</option><option value="1"' + (baby.single ? ' selected' : '') + '>' + t('singleName') + '</option></select></label>';
    html += '</div>';
    html += '<div class="tool-row">';
    html += '<label class="tool-field" style="flex:2;"><span>' + t('birth') + '</span><input type="date" class="form-input" id="bbDate" min="1900-01-01" max="2100-12-31" value="' + esc(baby.date) + '"></label>';
    html += '<label class="tool-field" style="flex:1;"><span>' + t('birthTime') + '</span><input type="time" class="form-input" id="bbTime" value="' + esc(baby.time) + '"></label>';
    html += '</div>';
    html += '<div id="bbBazi">' + renderBabyBazi() + '</div>';
    html += '<div class="tool-field"><span>' + t('favEl') + '</span>' + chipsHtml('bbFav', ELS, baby.fav, elLabel) + '</div>';
    html += '<div class="tool-field"><span>' + t('unfavEl') + '</span>' + chipsHtml('bbUnfav', ELS, baby.unfav, elLabel) + '</div>';
    html += '<div class="tool-row">';
    html += '<label class="tool-field" style="flex:1;"><span>' + t('genChar') + '</span><input type="text" class="form-input" id="bbGen" maxlength="1" autocomplete="off" value="' + esc(baby.gen) + '"></label>';
    html += '<label class="tool-field" style="flex:1;"><span>' + t('genPos') + '</span><select class="form-input" id="bbGenPos"><option value="1">' + t('pos1') + '</option><option value="2"' + (baby.genPos === 2 ? ' selected' : '') + '>' + t('pos2') + '</option></select></label>';
    html += '<label class="tool-field" style="flex:2;"><span>' + t('avoid') + '</span><input type="text" class="form-input" id="bbAvoid" maxlength="30" autocomplete="off" placeholder="' + t('avoidPh') + '" value="' + esc(baby.avoid) + '"></label>';
    html += '</div>';
    html += '<div class="tool-field"><span>' + t('traits') + '</span>' + chipsHtml('bbTrait', window.ForeignName ? window.ForeignName.TRAITS : [], baby.traits, function(tr) { return tr + (en ? ' <small>' + TRAIT_EN[tr] + '</small>' : ''); }) + '</div>';
    html += '<button type="button" class="btn-download-img" id="bbGo">' + t('babyGo') + '</button>';
    html += '<div id="bbResults">' + (baby.result ? renderBabyResults(baby.result) : '') + '</div>';
    box.innerHTML = html;
  }

  function renderBabyBazi() {
    if (!baby.xy) return baby.date ? '' : '<p class="tool-note">' + t('noBirth') + '</p>';
    var xy = baby.xy, bz = baby.bazi;
    var html = '<div class="tool-bazi">';
    html += '<div class="tool-pillars">' + bz.pillars.map(function(p) {
      return '<span><small>' + p.name + '</small><b>' + (p.tg === '?' ? '—' : p.tg + p.dz) + '</b></span>';
    }).join('') + '</div>';
    html += '<p class="tool-line">' + esc(xy.text) + '</p>';
    html += '<p class="tool-line">' + t('useGod') + '：<strong class="element-' + xy.yong + '">' + xy.yong + '</strong>　' + t('joyGod') + '：<strong class="element-' + xy.xi + '">' + xy.xi + '</strong>　' +
      t('avoidGod') + '：' + xy.unfavorable.map(function(e) { return '<strong class="element-' + e + '">' + e + '</strong>'; }).join('、') +
      (xy.missing.length ? '　' + t('missing') + '：' + xy.missing.join('、') : '') + '</p>';
    html += '<p class="tool-line tool-meta">' + t('xyNote') + (xy.hasHour ? '' : t('noHour')) + '</p>';
    return html + '</div>';
  }

  function gridHtml(cn) {
    var names = { tian: '天', ren: '人', di: '地', wai: '外', zong: '總' };
    return ['tian', 'ren', 'di', 'wai', 'zong'].map(function(k) {
      var g = cn.grids[k], gl = g.fortune ? g.fortune.glory : '?';
      var cls = gl === '大吉' ? 'great' : gl === '吉' ? 'good' : gl === '半吉' ? 'neutral' : 'bad';
      return '<span class="tool-grid fortune-' + cls + '">' + names[k] + ' ' + g.number + ' ' + gl + '</span>';
    }).join('');
  }

  function renderBabyResults(r) {
    if (r.error) return '<p class="tool-msg">' + esc(r.error) + '</p>';
    var html = '';
    if (r.note) html += '<p class="tool-msg">' + esc(r.note) + '</p>';
    if (r.excluded.length) html += '<p class="tool-note">' + t('excluded') + '：' + esc(r.excluded.join('')) + '</p>';
    if (!r.candidates.length) return html + '<p class="tool-msg">' + t('none') + '</p>';
    var DB = window.PinyinDB;
    html += '<p class="tool-note">' + t('tianNote') + '</p>';
    r.candidates.forEach(function(c, i) {
      var chars = c.analysis.parsed.surnameChars.concat(c.chars.map(function(x) { return x.c; }));
      var sLen = c.analysis.parsed.surnameChars.length;
      var pys = chars.map(function(ch, k) { return toneMark(k < sLen ? (DB.SURNAME[ch] || DB.CHAR[ch]) : DB.CHAR[ch]); });
      html += '<div class="tool-cand">';
      html += '<div class="tool-cand-head"><span class="tool-cand-name">' + c.name + '</span><span class="tool-cand-py">' + pys.join(' ') + '</span>' +
        '<span class="tool-badge">' + t('sancai') + ' ' + c.analysis.sancai.level + '</span></div>';
      html += '<p class="tool-line">' + c.chars.map(function(x) {
        return '<strong>' + x.c + '</strong> <span class="element-' + x.el + '">' + x.el + '</span><small class="tool-meta">（' + x.elBy + '）</small>' + (x.meaning ? ' ' + x.meaning : '');
      }).join('；') + '</p>';
      html += '<div class="tool-grids">' + gridHtml(c.analysis) + '</div>';
      if (c.reasons.length) html += '<p class="tool-line tool-meta">✓ ' + esc(c.reasons.join('；')) + '</p>';
      if (c.phonetics) html += '<p class="tool-line tool-meta">🗣️ ' + t('phon') + ' ' + c.phonetics.grade + '・' + esc(c.phonetics.pinyin) + (c.phonetics.warns.length ? '・' + esc(c.phonetics.warns[0]) : '') + '</p>';
      html += '<div class="tool-actions"><button type="button" class="btn-action btn-action-secondary bb-analyze" data-i="' + i + '">' + t('analyze') + '</button>' +
        '<button type="button" class="btn-action btn-action-secondary bb-copy" data-i="' + i + '">' + t('copy') + '</button></div>';
      html += '</div>';
    });
    html += '<button type="button" class="btn-download-img" id="bbPrint" style="margin-top:12px;">' + t('printReport') + '</button>';
    return html;
  }

  function readBabyForm() {
    var v = function(id) { var el = document.getElementById(id); return el ? el.value : ''; };
    var checked = function(name) { return [].map.call(document.querySelectorAll('#toolBaby input[name="' + name + '"]:checked'), function(el) { return el.value; }); };
    if (!document.getElementById('bbSurname')) return;
    baby.surname = v('bbSurname').trim();
    baby.gender = v('bbGender');
    baby.single = v('bbSingle') === '1';
    baby.date = v('bbDate');
    baby.time = v('bbTime');
    baby.gen = v('bbGen').trim();
    baby.genPos = +v('bbGenPos') === 2 ? 2 : 1;
    baby.avoid = v('bbAvoid');
    baby.traits = checked('bbTrait');
    baby.fav = checked('bbFav');
    baby.unfav = checked('bbUnfav');
  }

  /** 生日改變：重算八字與喜用神，並預選喜用、忌神 */
  function updateBazi() {
    readBabyForm();
    baby.xy = baby.bazi = null;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(baby.date);
    if (m && window.ZodiacBazi) {
      var tm = /^(\d{1,2}):(\d{2})/.exec(baby.time || '');
      baby.bazi = window.ZodiacBazi.fullBazi(+m[1], +m[2], +m[3], tm ? +tm[1] : null, tm ? +tm[2] : 0, 8);
      baby.xy = window.BabyName.xiYong(baby.bazi);
      if (baby.xy) { baby.fav = baby.xy.favorable.slice(); baby.unfav = baby.xy.unfavorable.slice(); }
    }
    renderBaby();
  }

  function runBaby() {
    readBabyForm();
    baby.result = window.BabyName.suggest({
      surname: baby.surname, gender: baby.gender, single: baby.single,
      generation: baby.gen ? { c: baby.gen, pos: baby.genPos } : null,
      avoid: baby.avoid, traits: baby.traits,
      // 用神放第一個（加分較多）
      favorable: baby.xy && baby.fav.indexOf(baby.xy.yong) >= 0 ? [baby.xy.yong].concat(baby.fav.filter(function(e) { return e !== baby.xy.yong; })) : baby.fav,
      unfavorable: baby.unfav
    });
    document.getElementById('bbResults').innerHTML = renderBabyResults(baby.result);
  }

  /** 列印報告（瀏覽器的列印對話框可另存 PDF） */
  function printBabyReport() {
    var r = baby.result;
    if (!r || !r.candidates || !r.candidates.length) return;
    var xy = baby.xy;
    var rows = r.candidates.map(function(c, i) {
      var g = c.analysis.grids;
      return '<tr><td>' + (i + 1) + '</td><td class="nm">' + c.name + '</td><td>' + c.chars.map(function(x) { return x.c + '（' + x.el + '）' + (x.meaning || ''); }).join('<br>') + '</td>' +
        '<td>' + ['tian', 'ren', 'di', 'wai', 'zong'].map(function(k) { return g[k].name + ' ' + g[k].number + ' ' + (g[k].fortune ? g[k].fortune.glory : ''); }).join('<br>') + '</td>' +
        '<td>' + c.analysis.sancai.level + '</td><td>' + (c.phonetics ? c.phonetics.grade + '<br><small>' + esc(c.phonetics.pinyin) + '</small>' : '') + '</td></tr>';
    }).join('');
    var cond = [];
    cond.push('姓氏：' + esc(r.surname));
    if (baby.gender) cond.push('性別：' + t(baby.gender));
    cond.push(r.single ? '單名' : '雙名');
    if (r.generation) cond.push('輩分字：' + esc(r.generation.c) + '（第 ' + r.generation.pos + ' 字）');
    if (baby.avoid.trim()) cond.push('避諱：' + esc(baby.avoid.trim()) + '（含同音字）');
    if (baby.traits.length) cond.push('特質：' + baby.traits.join('、'));
    if (r.favorable.length) cond.push('喜用五行：' + r.favorable.join('、'));
    if (r.unfavorable.length) cond.push('忌：' + r.unfavorable.join('、'));
    var doc = '<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><title>寶寶取名報告 — ' + esc(r.surname) + '</title><style>' +
      'body{font-family:"Noto Serif TC","PMingLiU",serif;color:#2c1810;margin:24px;}h1{font-size:22px;margin:0 0 4px;}h2{font-size:16px;margin:18px 0 6px;border-bottom:1px solid #b8860b;padding-bottom:4px;}' +
      'p{font-size:13px;line-height:1.7;margin:4px 0;}table{border-collapse:collapse;width:100%;font-size:12px;}th,td{border:1px solid #c4a870;padding:5px 6px;vertical-align:top;text-align:left;}th{background:#f5ecd8;}' +
      '.nm{font-size:18px;white-space:nowrap;}.pillars span{display:inline-block;margin-right:14px;font-size:15px;}small{color:#8b7355;}.foot{margin-top:18px;font-size:11px;color:#8b7355;}' +
      '@page{margin:14mm;}tr{page-break-inside:avoid;}</style></head><body>' +
      '<h1>👶 寶寶取名報告</h1><p><small>姓名和盤・' + new Date().toLocaleDateString('zh-TW') + '</small></p>' +
      '<h2>取名條件</h2><p>' + cond.join('　') + '</p>' +
      (xy ? '<h2>八字與喜用神</h2><p class="pillars">' + baby.bazi.pillars.map(function(p) { return '<span><small>' + p.name + '</small> ' + (p.tg === '?' ? '—' : p.tg + p.dz) + '</span>'; }).join('') + '</p>' +
        '<p>' + esc(xy.text) + '</p><p>用神 ' + xy.yong + '、喜神 ' + xy.xi + '、忌神 ' + xy.unfavorable.join('、') + (xy.missing.length ? '；八字缺 ' + xy.missing.join('、') : '') + '</p>' : '') +
      '<h2>推薦名字</h2>' + (r.note ? '<p>' + esc(r.note) + '</p>' : '') +
      '<table><thead><tr><th>#</th><th>名字</th><th>用字（字五行）</th><th>五格</th><th>三才</th><th>音韻</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<p class="foot">天格由姓氏決定，不列入評分。字五行：部首明確者依部首（氵→水、木/艹→木、火/日→火、土/山/石→土、金→金），其餘依字音五音。喜用神以扶抑法簡化計算。以上僅供參考。</p>' +
      '</body></html>';
    var frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(frame);
    var d = frame.contentWindow.document;
    d.open(); d.write(doc); d.close();
    setTimeout(function() {
      frame.contentWindow.focus();
      frame.contentWindow.print();
      setTimeout(function() { frame.remove(); }, 1000);
    }, 300);
  }

  /** 把名字填進甲方並開始分析 */
  function analyzeName(cn, en) {
    var cnA = document.getElementById('cnA'), enA = document.getElementById('enA');
    if (!cnA) return;
    cnA.value = cn;
    if (enA && en) enA.value = en;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    var btn = document.getElementById('analyzeBtn');
    if (btn) btn.click();
  }

  function onClick(e) {
    var el = e.target;
    if (el.id === 'fnGo') return runForeign();
    var chip = el.closest && el.closest('.tool-chip');
    if (chip && el.tagName === 'INPUT') { chip.classList.toggle('on', el.checked); return; }
    var btn = el.closest && el.closest('.fn-analyze, .fn-copy');
    if (!btn || !state.result || !state.result.candidates) return;
    var c = state.result.candidates[+btn.dataset.i];
    if (!c) return;
    if (btn.classList.contains('fn-analyze')) return analyzeName(c.name, state.english.trim());
    if (navigator.clipboard) navigator.clipboard.writeText(c.name).then(function() { btn.textContent = '✅ ' + t('copied'); }).catch(function() {});
  }

  function render() {
    var title = document.getElementById('toolsTitle');
    if (title) title.textContent = t('title');
    var sum = document.getElementById('toolForeignSummary');
    if (sum) sum.textContent = t('foreignTitle');
    var box = document.getElementById('toolForeign');
    if (box && box.innerHTML) readForeignForm();
    renderForeign();
  }

  function init() {
    var card = document.getElementById('toolsCard');
    if (!card) return;
    card.addEventListener('click', onClick);
    card.addEventListener('keydown', function(e) { if (e.key === 'Enter' && e.target.id === 'fnEnglish') runForeign(); });
    // 語言切換後重畫（等 I18N 存好新語言）
    var lt = document.getElementById('langToggle');
    if (lt) lt.addEventListener('click', function() { setTimeout(render, 0); });
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return { toneMark: toneMark, analyzeName: analyzeName };
})();
