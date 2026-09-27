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
