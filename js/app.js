/**
 * 姓名和盤 v3 — 多人團隊和盤
 */
(function() {
  'use strict';

  // ============ DOM ============
  var formSection = document.getElementById('formSection');
  var resultsSection = document.getElementById('resultsSection');
  var analyzeBtn = document.getElementById('analyzeBtn');
  var formError = document.getElementById('formError');
  var tabNav = document.getElementById('tabNav');
  var extraPersons = document.getElementById('extraPersons');
  var addPersonBtn = document.getElementById('addPersonBtn');
  var personTemplate = document.getElementById('personTemplate');

  // 手動筆劃
  var manualStrokeCard = document.getElementById('manualStrokeCard');
  var manualStrokeFields = document.getElementById('manualStrokeFields');
  var manualStrokeBtn = document.getElementById('manualStrokeBtn');
  var manualStrokeError = document.getElementById('manualStrokeError');

  // 操作按鈕
  var shareBtn = document.getElementById('shareBtn');
  var saveBtn = document.getElementById('saveBtn');
  var backBtn = document.getElementById('backBtn');
  var demoBtn = document.getElementById('demoBtn');
  var scrollTopBtn = document.getElementById('scrollTopBtn');
  var loadingOverlay = document.getElementById('loadingOverlay');
  var proModeToggle = document.getElementById('proModeToggle');
  var reportContent = document.getElementById('reportContent');
  var isProMode = false;
  var historyBtn = null;

  // 模態框
  var pairModal = document.getElementById('pairModal');
  var modalTitle = document.getElementById('modalTitle');
  var modalBody = document.getElementById('modalBody');
  var modalClose = document.getElementById('modalClose');
  var historyModal = document.getElementById('historyModal');
  var historyList = document.getElementById('historyList');
  var historyClose = document.getElementById('historyClose');
  var historyClear = document.getElementById('historyClear');

  // 面板
  var membersContent = document.getElementById('membersContent');
  var matrixContent = document.getElementById('matrixContent');
  var teamContent = document.getElementById('teamContent');

  // 狀態
  var currentData = null;
  var extraCount = 0;
  var MAX_PERSONS = 5;
  // 使用者手動輸入的筆劃（字 → 筆劃）；筆劃庫沒收錄的字靠這個才分析得下去
  var manualStrokes = {};
  // 吉數姓名推薦目前選擇的性別（'' 表示全部）
  var genGender = '';

  // ============ 初始化 ============
  function init() {
    initPlaceSelects(document);
    // 紫微運限：切換年份時只重算該區塊
    document.addEventListener('change', function(e) {
      var cl = e.target.classList;
      if (!cl || !(cl.contains('zw-year') || cl.contains('zw-month') || cl.contains('zw-day'))) return;
      var box = e.target.closest('.zw-horoscope');
      var zw = box ? zwCharts[+box.dataset.zw] : null;
      if (!zw) return;
      var monthSel = box.querySelector('.zw-month'), daySel = box.querySelector('.zw-day');
      var year = +box.querySelector('.zw-year').value;
      if (cl.contains('zw-year')) {
        box.querySelector('.zw-horo-body').innerHTML = renderZiweiHoroscope(zw, year);
        monthSel.innerHTML = zwMonthOptions(year, monthSel.value);
      }
      if (!cl.contains('zw-day')) daySel.innerHTML = zwDayOptions(year, monthSel.value, +daySel.value);
      box.querySelector('.zw-md-body').innerHTML = renderZiweiMonthDaily(zw, year, monthSel.value, +daySel.value);
    });
    var tstToggle = document.getElementById('tstToggle');
    if (tstToggle) {
      try { tstToggle.checked = localStorage.getItem('name-harmony-tst') === 'true'; } catch (e) {}
      tstToggle.addEventListener('change', function() {
        try { localStorage.setItem('name-harmony-tst', tstToggle.checked ? 'true' : 'false'); } catch (e) {}
      });
    }
    analyzeBtn.addEventListener('click', function() { handleAnalyze(); });
    manualStrokeBtn.addEventListener('click', handleManualReanalyze);
    shareBtn.addEventListener('click', handleShare);
    saveBtn.addEventListener('click', handleSave);
    backBtn.addEventListener('click', handleBack);
    demoBtn.addEventListener('click', loadDemo);
    // 名字PK
    var pkBtn = document.getElementById('pkBtn');
    if (pkBtn) pkBtn.addEventListener('click', runNamePK);
    // 專業模式記憶
    if (localStorage.getItem('name-harmony-pro') === 'true') {
      proModeToggle.checked = true;
      isProMode = true;
    }
    proModeToggle.addEventListener('change', function() {
      isProMode = this.checked;
      localStorage.setItem('name-harmony-pro', isProMode ? 'true' : 'false');
      if (currentData) { renderAll(); }
    });
    addPersonBtn.addEventListener('click', addPerson);
    scrollTopBtn.addEventListener('click', function() { window.scrollTo({top:0,behavior:'smooth'}); });
    window.addEventListener('scroll', function() {
      scrollTopBtn.classList.toggle('hidden', window.scrollY < 400);
    });

    // 模態框關閉
    modalClose.addEventListener('click', function() { pairModal.classList.add('hidden'); });
    pairModal.addEventListener('click', function(e) { if (e.target === pairModal) pairModal.classList.add('hidden'); });
    historyClose.addEventListener('click', function() { historyModal.classList.add('hidden'); });
    historyModal.addEventListener('click', function(e) { if (e.target === historyModal) historyModal.classList.add('hidden'); });
    historyClear.addEventListener('click', function() {
      if (confirm('確定清除全部歷史記錄？')) {
        localStorage.removeItem('name-harmony-v3');
        renderHistoryList();
        toast('歷史記錄已清除');
      }
    });

    // 英文UI切換
    var langToggle = document.getElementById('langToggle');
    if (window.I18N) window.I18N.apply(window.I18N.getLang());
    langToggle.addEventListener('click',function(){
      var next = window.I18N.getLang() === 'en' ? 'zh' : 'en';
      window.I18N.setLang(next);
      window.I18N.apply(next);
      toast(next === 'en' ? 'Switched to English' : '已切換為繁體中文');
    });

    // 主題切換
    var themeToggle = document.getElementById('themeToggle');
    var savedTheme = localStorage.getItem('name-harmony-theme');
    if (savedTheme === 'light' || (!savedTheme && window.matchMedia('(prefers-color-scheme: light)').matches)) {
      document.documentElement.setAttribute('data-theme', 'light');
      themeToggle.textContent = '🌙';
    }
    themeToggle.addEventListener('click', function() {
      var isLight = document.documentElement.getAttribute('data-theme') === 'light';
      if (isLight) {
        document.documentElement.removeAttribute('data-theme');
        themeToggle.textContent = '☀️';
        localStorage.setItem('name-harmony-theme', 'dark');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
        themeToggle.textContent = '🌙';
        localStorage.setItem('name-harmony-theme', 'light');
      }
    });

    var actionBar = document.getElementById('actionBar');

    // QR/連結分享鍵
    var linkBtn = document.createElement('button');
    linkBtn.className = 'btn-action';
    linkBtn.innerHTML = '<span>🔗</span> <span data-i18n="linkBtn">連結</span>';
    linkBtn.addEventListener('click', function() {
      var text = buildShareText();
      var url = 'https://magicsmallbear.github.io/name-harmony/';
      copyText(url + '\n\n' + text);
      toast('網址+報告已複製！可貼到訊息分享');
    });
    actionBar.insertBefore(linkBtn, backBtn);

    // 客戶存檔
    var profileBtn = document.createElement('button');
    profileBtn.className = 'btn-action';
    profileBtn.innerHTML = '<span>💼</span> <span data-i18n="profileBtn">存檔</span>';
    profileBtn.addEventListener('click', saveProfile);
    actionBar.insertBefore(profileBtn, backBtn);

    // QR Code 圖片
    var qrBtn = document.createElement('button');
    qrBtn.className = 'btn-action';
    qrBtn.innerHTML = '<span>📱</span> <span data-i18n="qrBtn">QR</span>';
    qrBtn.addEventListener('click', function() {
      var url = 'https://magicsmallbear.github.io/name-harmony/';
      var qrImg = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(url);
      var win = window.open('', '_blank');
      if (win) { win.document.write('<title>QR Code - 姓名和盤</title><body style="background:#1A0A0A;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><img src="'+qrImg+'" style="border:3px solid #D4A843;border-radius:12px;"><p style="color:#D4A843;margin-top:16px;font-family:sans-serif;">姓名和盤</p></div></body>'); }
    });
    actionBar.insertBefore(qrBtn, backBtn);

    // IG分享
    var igBtn = document.createElement('button');
    igBtn.className = 'btn-action';
    igBtn.innerHTML = '<span>📱</span> <span data-i18n="igBtn">IG</span>';
    igBtn.addEventListener('click', function() {
      if (!currentData) return;
      if (window.ShareCard && window.ShareCard.downloadIG) {
        window.ShareCard.downloadIG(currentData).then(function() { toast('IG 分享圖已下載！'); });
      }
    });
    actionBar.insertBefore(igBtn, backBtn);

    // TTS 語音朗讀（摘要）
    var ttsBtn = document.createElement('button');
    ttsBtn.className = 'btn-action';
    ttsBtn.innerHTML = '<span>🔊</span> <span data-i18n="speakBtn">朗讀</span>';
    ttsBtn.addEventListener('click', function() {
      if (!currentData) return;
      speakText(buildShareText(), '正在朗讀分析摘要...', ttsBtn);
    });
    actionBar.insertBefore(ttsBtn, backBtn);

    // 動態插入歷史和匯出按鈕
    var actionBar = document.getElementById('actionBar');
    historyBtn = document.createElement('button');
    historyBtn.className = 'btn-action';
    historyBtn.innerHTML = '<span>📋</span> <span data-i18n="tabHistory">歷史</span>';
    historyBtn.addEventListener('click', openHistory);
    actionBar.insertBefore(historyBtn, backBtn);

    var exportBtn = document.createElement('button');
    exportBtn.className = 'btn-action';
    exportBtn.innerHTML = '<span>📄</span> <span data-i18n="exportBtn">匯出</span>';
    exportBtn.addEventListener('click', exportImage);
    actionBar.insertBefore(exportBtn, backBtn);

    // 套用目前語言到所有動態按鈕（含上方剛建立的）
    if (window.I18N) window.I18N.apply(window.I18N.getLang());

    // Enter
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
        e.preventDefault();
        handleAnalyze();
      }
    });

    // 分頁
    tabNav.addEventListener('click', function(e) {
      var btn = e.target.closest('.tab-btn');
      if (!btn) return;
      switchTab(btn.dataset.tab);
    });

    // PWA 每日推播：每次開啟/回到前景時檢查是否已跨日，跨日則推播一次
    // （純前端無後端，無法在App完全關閉時保證推播；periodicSync 為額外的best-effort加強，見 sw.js）
    if ('Notification' in window) {
      setTimeout(checkDailyFortune, 5000);
      document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') checkDailyFortune();
      });
    }

    // 金粉粒子
    spawnParticles();
    // 圖片下載按鈕
    addDownloadImgBtn();

    showForm();
  }

  function spawnParticles() {
    var container = document.createElement('div');
    container.className = 'particles-container';
    document.body.appendChild(container);
    for (var i = 0; i < 30; i++) {
      var p = document.createElement('div');
      p.className = 'particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.animationDuration = (Math.random() * 8 + 6) + 's';
      p.style.animationDelay = Math.random() * 8 + 's';
      p.style.width = p.style.height = (Math.random() * 3 + 1) + 'px';
      container.appendChild(p);
    }
  }

  function addDownloadImgBtn() {
    var actionBar = document.getElementById('actionBar');
    var dlBtn = document.createElement('button');
    dlBtn.className = 'btn-action';
    dlBtn.innerHTML = '<span>🖼️</span> 圖片';
    dlBtn.addEventListener('click', function() {
      if (!currentData) return;
      window.ShareCard.downloadImage(currentData).then(function() { toast('圖片已下載！'); });
    });
    actionBar.insertBefore(dlBtn, backBtn);
  }

  // ============ 新增/移除成員 ============
  function addPerson() {
    if (extraCount + 2 >= MAX_PERSONS) { toast('最多 ' + MAX_PERSONS + ' 人'); return; }
    extraCount++;
    var clone = document.importNode(personTemplate.content, true);
    var el = clone.querySelector('.extra-person');
    el.querySelector('.person-badge-extra').textContent = '成員' + (extraCount + 2);
    el.querySelector('.btn-remove-person').addEventListener('click', function() {
      el.remove();
      extraCount--;
      updateAddBtn();
    });
    initPlaceSelects(el);
    extraPersons.appendChild(el);
    updateAddBtn();
    return el;
  }

  /** 填入出生地選單選項（預設台北），選「其他」時顯示緯度、經度、時區欄位 */
  function initPlaceSelects(scope) {
    if (!window.BirthPlace) return;
    scope.querySelectorAll('.place-input').forEach(function(sel) {
      if (sel.options.length) return;
      sel.innerHTML = window.BirthPlace.optionsHtml();
      var box = document.createElement('span');
      box.className = 'custom-place hidden';
      box.innerHTML = '<input type="number" class="form-input place-lat" step="0.01" min="-90" max="90" placeholder="緯度（北正南負）" aria-label="緯度">'
        + '<input type="number" class="form-input place-lon" step="0.01" min="-180" max="180" placeholder="經度（東正西負）" aria-label="經度">'
        + '<select class="form-input place-tz" aria-label="時區"></select>';
      var row = sel.closest('.birth-meta-row') || sel.parentNode;
      row.appendChild(box);
      sel.addEventListener('change', function() { toggleCustomPlace(sel); });
    });
  }

  function toggleCustomPlace(sel) {
    var row = sel.closest('.birth-meta-row') || sel.parentNode;
    var box = row.querySelector('.custom-place');
    if (!box) return;
    var show = sel.value === 'custom';
    box.classList.toggle('hidden', !show);
    var tz = box.querySelector('.place-tz');
    if (show && !tz.options.length) {
      tz.innerHTML = window.BirthPlace.zoneOptionsHtml(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Taipei');
    }
  }

  /** 讀取出生地：預設地點回傳 key，自訂回傳 custom:緯度,經度,時區；自訂但資料不完整回傳 'custom!' */
  function readPlace(scope) {
    var sel = scope ? scope.querySelector('.place-input') : null;
    if (!sel) return '';
    if (sel.value !== 'custom') return sel.value;
    var row = sel.closest('.birth-meta-row') || sel.parentNode;
    var lat = row.querySelector('.place-lat').value.trim();
    var lon = row.querySelector('.place-lon').value.trim();
    var tz = row.querySelector('.place-tz').value;
    var key = window.BirthPlace.customKey(lat, lon, tz);
    return lat && lon && tz && window.BirthPlace.parseCustom(key) ? key : 'custom!';
  }

  /** 還原出生地欄位（含自訂） */
  function writePlace(scope, value) {
    var sel = scope.querySelector('.place-input');
    if (!sel) return;
    var c = window.BirthPlace ? window.BirthPlace.parseCustom(value) : null;
    if (c) {
      sel.value = 'custom';
      toggleCustomPlace(sel);
      var row = sel.closest('.birth-meta-row') || sel.parentNode;
      row.querySelector('.place-lat').value = c.lat;
      row.querySelector('.place-lon').value = c.lon;
      row.querySelector('.place-tz').value = c.tz;
    } else {
      sel.value = value || (window.BirthPlace ? window.BirthPlace.DEFAULT_KEY : '');
      toggleCustomPlace(sel);
    }
  }

  function updateAddBtn() {
    if (extraCount + 2 >= MAX_PERSONS) {
      addPersonBtn.disabled = true;
      addPersonBtn.querySelector('span').textContent = '已達上限';
    } else {
      addPersonBtn.disabled = false;
      addPersonBtn.querySelector('span').textContent = '＋';
    }
  }

  // ============ 表單切換 ============
  function showForm() {
    formSection.classList.remove('hidden');
    resultsSection.classList.add('hidden');
    manualStrokeCard.classList.add('hidden');
  }

  function showResults() {
    formSection.classList.add('hidden');
    resultsSection.classList.remove('hidden');
    manualStrokeCard.classList.add('hidden');
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ============ 收集全部輸入 ============
  function collectInputs() {
    // 讀取自訂標籤
    var labels = document.querySelectorAll('.person-label');
    var defaultLabels = ['甲方','乙方'];
    var customLabels = [];
    labels.forEach(function(el) {
      var txt = el.textContent.trim();
      customLabels.push(txt && txt !== el.dataset.default ? txt : null);
    });

    var persons = [];
    // Person A
    var mainSections = document.querySelectorAll('#formSection .person-section');
    var aSection = mainSections[0];
    var aBlood = aSection ? aSection.querySelector('.blood-input') : null;
    persons.push({
      id: 'A', label: customLabels[0] || '甲方',
      cn: document.getElementById('cnA').value.trim(),
      en: document.getElementById('enA').value.trim(),
      birthday: readBirthday(aSection),
      gender: readSelect(aSection, '.gender-input'),
      place: readPlace(aSection),
      blood: (aBlood ? aBlood.value : '') || ''
    });
    // Person B
    var bSection = mainSections[1];
    var bBlood = bSection ? bSection.querySelector('.blood-input') : null;
    persons.push({
      id: 'B', label: customLabels[1] || '乙方',
      cn: document.getElementById('cnB').value.trim(),
      en: document.getElementById('enB').value.trim(),
      birthday: readBirthday(bSection),
      gender: readSelect(bSection, '.gender-input'),
      place: readPlace(bSection),
      blood: (bBlood ? bBlood.value : '') || ''
    });
    // Extra persons
    var extraDivs = extraPersons.querySelectorAll('.extra-person');
    var labels = ['C','D','E'];
    extraDivs.forEach(function(div, i) {
      persons.push({
        id: labels[i],
        label: '成員' + (i + 3),
        cn: div.querySelector('.cn-input').value.trim(),
        en: div.querySelector('.en-input').value.trim(),
        birthday: readBirthday(div),
        gender: readSelect(div, '.gender-input'),
        place: readPlace(div)
      });
    });
    return persons;
  }

  // ============ 分析 ============
  function handleAnalyze() {
    formError.classList.add('hidden');
    zwCharts = [];
    showLoading();
    try {
      doAnalyze();
    } catch(e) {
      console.error('Analysis error:', e);
      showError('分析時發生錯誤：' + (e.message || '未知錯誤'));
    }
    hideLoading();
  }

  function doAnalyze() {
    var persons = collectInputs();
    var hasAny = persons.some(function(p) { return p.cn || p.en; });
    if (!hasAny) { showError('請至少輸入一組姓名'); return; }

    // 過濾有輸入的成員
    persons = persons.filter(function(p) { return p.cn || p.en; });

    // 分析每人
    var results = [];
    for (var i = 0; i < persons.length; i++) {
      var r = analyzeOne(persons[i]);
      if (r.error) { showError(persons[i].label + ': ' + r.error); return; }
      if (r.needsManual) {
        showManualInput(r.unknownChars);
        return;
      }
      // 生日分析
      if (persons[i].place === 'custom!') {
        showError(persons[i].label + '：自訂出生地請填入緯度（-90～90）、經度（-180～180）並選擇時區');
        return;
      }
      var bday = applyBirthPlace(parseBirthday(persons[i].birthday), persons[i].place, useTrueSolarTime());
      var zodiac = bday ? window.ZodiacBazi.fullAnalysis(bday.year, bday.month, bday.day, bday.hour, bday.minute, bday.tzOffset) : null;
      r.zodiac = zodiac;
      r.gender = persons[i].gender || '';

      results.push({ person: persons[i], result: r, birthday: bday });
    }

    // 生成所有配對
    var pairs = [];
    for (var i = 0; i < results.length; i++) {
      for (var j = i + 1; j < results.length; j++) {
        var a = results[i].result;
        var b = results[j].result;
        var labelA = results[i].person.label;
        var labelB = results[j].person.label;
        var bdA = results[i].birthday;
        var bdB = results[j].birthday;

        // 中中和盤
        if (a.cn && b.cn) {
          var p = window.PairHarmony.cncnHarmony(a.cn, b.cn);
          if (p) {
            // 血型配對
            var bA = results[i].person.blood, bB = results[j].person.blood;
            if (bA && bB) {
              var bc = bloodCompatibility(bA, bB);
              if (bc) { p.dimensions.push({ label: '🩸 血型配對', score: bc.score, max: 100, detail: bc.detail }); }
            }
            // 加入生肖配對
            if (bdA && bdB && a.zodiac && b.zodiac && a.zodiac.zodiac && b.zodiac.zodiac) {
              var zc = window.ZodiacBazi.zodiacCompatibility(a.zodiac.zodiac, b.zodiac.zodiac);
              if (zc) {
                p.dimensions.push({ label: '🐉 生肖配對', score: zc.score, max: 100, detail: zc.detail });
                if (p.reading && p.reading.summary) p.reading.summary += '\n\n【生肖加成】' + zc.detail;
              }
            }
            pairs.push({ a: labelA, b: labelB, pair: p, type: 'cn-cn' });
          }
        }
        // 英英和盤
        if (a.en && b.en) {
          var p = window.PairHarmony.enenHarmony(a.en, b.en);
          if (p) pairs.push({ a: labelA, b: labelB, pair: p, type: 'en-en' });
        }
        // 中英跨文化
        if (a.cn && b.en) {
          var p = window.PairHarmony.cnenCrossHarmony(a.cn, b.en);
          if (p) pairs.push({ a: labelA, b: labelB, pair: p, type: 'cn-en' });
        }
        if (a.en && b.cn) {
          var p = window.PairHarmony.cnenCrossHarmony(b.cn, a.en);
          if (p) pairs.push({ a: labelA, b: labelB, pair: p, type: 'cn-en' });
        }
      }
    }

    currentData = { results: results, pairs: pairs };
    // 顯示PK區
    var pkSection = document.getElementById('namePkSection');
    if (pkSection) pkSection.classList.remove('hidden');

    renderAll();
    // 2人直接看配對，3人以上看成員
    switchTab(results.length === 2 && pairs.length > 0 ? 'matrix' : 'members');
    showResults();
  }

  function analyzeOne(person) {
    var r = { cn: null, en: null, enReport: null };
    if (person.cn) {
      r.cn = window.ChineseNumerology.analyze(person.cn, manualStrokes);
      if (r.cn.error) return { error: r.cn.error };
      if (r.cn.hasUnknown && r.cn.unknownChars.length > 0) {
        return { needsManual: true, unknownChars: r.cn.unknownChars };
      }
    }
    if (person.en) {
      r.en = window.EnglishNumerology.analyze(person.en);
      if (!r.en) return { error: '無法分析英文' };
      r.enReport = window.EnglishNumerology.getFullReport(r.en);
    }
    return r;
  }

  function showError(msg) {
    formError.textContent = msg;
    formError.classList.remove('hidden');
  }

  // 血型配對表
  var BLOOD_COMPAT = {
    'A': { best:['A','AB'], ok:['O'], bad:['B'] },
    'B': { best:['B','AB'], ok:['O'], bad:['A'] },
    'AB': { best:['A','B','AB','O'], ok:[], bad:[] },
    'O': { best:['O'], ok:['A','B','AB'], bad:[] }
  };
  function bloodCompatibility(b1, b2) {
    if (!b1 || !b2) return null;
    var c = BLOOD_COMPAT[b1.toUpperCase()];
    if (!c) return { score: 50, detail: '未知血型配對' };
    if (c.best.indexOf(b2) >= 0) return { score: 90, detail: b1+'與'+b2+'型高度相容，溝通順暢，適合長期合作與親密關係。' };
    if (c.ok.indexOf(b2) >= 0) return { score: 65, detail: b1+'與'+b2+'型相容度尚可，一般相處沒問題，特別場合多加注意即可。' };
    if (c.bad.indexOf(b2) >= 0) return { score: 30, detail: b1+'與'+b2+'型傳統上較不相容，需要更多耐心與理解。' };
    return { score: 50, detail: '血型配對中等' };
  }

  /** 讀取某人的生日欄位；有填出生時間時組成「YYYY-MM-DD HH:MM」 */
  function readBirthday(scope) {
    if (!scope) return '';
    var d = scope.querySelector('.bday-input');
    var t = scope.querySelector('.btime-input');
    var v = d ? d.value.trim() : '';
    if (v && t && t.value) v += ' ' + t.value;
    return v;
  }

  function readSelect(scope, selector) {
    var el = scope ? scope.querySelector(selector) : null;
    return el ? el.value : '';
  }

  /**
   * 依出生地換算：有出生時間時扣除夏令時間、改為當地標準時間
   * 回傳的 year..minute 為標準時間；clock 保留使用者輸入的時鐘時間
   */
  function useTrueSolarTime() {
    var el = document.getElementById('tstToggle');
    return !!(el && el.checked);
  }

  function applyBirthPlace(bday, placeKey, useTST) {
    if (!bday || !window.BirthPlace) return bday;
    var B = window.BirthPlace;
    var place = B.getPlace(placeKey);
    bday.place = place;
    if (bday.hour == null) {
      bday.tzOffset = B.standardOffset(place.tz, bday.year);
      bday.dst = false;
      return bday;
    }
    var res = B.resolve(bday.year, bday.month, bday.day, bday.hour, bday.minute, place.key);
    bday.clock = { hour: bday.hour, minute: bday.minute };
    bday.year = res.std.year; bday.month = res.std.month; bday.day = res.std.day;
    bday.hour = res.std.hour; bday.minute = res.std.minute;
    bday.tzOffset = res.stdOffset;
    bday.dst = res.dst;
    bday.std = { hour: bday.hour, minute: bday.minute };
    if (useTST) {
      // 真太陽時：日期、時辰都改用出生地的視太陽時；tzOffset 相應調整，讓節氣與占星仍對應同一個 UTC 時刻
      var tst = B.trueSolarTime(res.utcMs, place.lat, place.lon);
      var t = new Date(tst.ms);
      bday.year = t.getUTCFullYear(); bday.month = t.getUTCMonth() + 1; bday.day = t.getUTCDate();
      bday.hour = t.getUTCHours(); bday.minute = t.getUTCMinutes();
      bday.tzOffset = (tst.ms - res.utcMs) / 3600000;
      bday.tst = { eotMin: tst.eotMin, lonMin: tst.lonMin - res.stdOffset * 60 };
    }
    return bday;
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  // ============ 紫微：宮位表與運限 ============
  var zwCharts = []; // 供運限年份切換重新計算

  function currentLunarYear() {
    var d = new Date();
    var l = window.Lunar ? window.Lunar.fromSolar(d.getFullYear(), d.getMonth() + 1, d.getDate()) : null;
    return l ? l.year : d.getFullYear();
  }

  /** 音韻與諧音：中文聲調、拗口、諧音、綽號；英文音節、重音、難發音、俚語 */
  function renderPhonetics(cn, en) {
    if (!cn && !en) return '';
    var gradeColor = function(g) { return g === '良好' ? 'var(--color-fortune-good)' : g === '尚可' ? 'var(--color-fortune-neutral)' : 'var(--color-danger, #c0392b)'; };
    var p = function(text, color) { return '<p style="font-size:0.76rem;color:' + (color || 'var(--color-text-secondary)') + ';margin:2px 0;line-height:1.6;">' + text + '</p>'; };
    var summary = [cn ? '中文' + cn.grade : '', en ? '英文' + en.grade : ''].filter(Boolean).join('・');
    var worst = [cn && cn.grade, en && en.grade].indexOf('需注意') >= 0 ? '需注意' : [cn && cn.grade, en && en.grade].indexOf('尚可') >= 0 ? '尚可' : '良好';
    var html = '<details style="margin:4px 0;font-size:0.85rem;"><summary style="color:var(--color-gold-primary);cursor:pointer;">🗣️ 音韻與諧音：<span style="color:' + gradeColor(worst) + ';">' + summary + '</span></summary>';
    if (cn) {
      html += p('<strong style="color:var(--color-gold-light);">中文</strong> ' + cn.toneText);
      cn.homophones.forEach(function(h) {
        var how = h.level === 3 ? '同音' : h.level === 2 ? '口音相近（zh/z、sh/s、ing/in 等不分時）' : '音近（聲調不同）';
        html += p('⚠️ 「' + h.text + '」與「' + h.word + '」' + how + '，屬' + h.cat + '聯想', h.level >= 2 ? 'var(--color-danger, #c0392b)' : 'var(--color-fortune-neutral)');
      });
      cn.warns.forEach(function(t) { html += p('⚠️ ' + t, 'var(--color-fortune-neutral)'); });
      cn.nicknames.forEach(function(t) { html += p('🏷️ 綽號風險：' + t, 'var(--color-text-muted)'); });
      cn.notes.forEach(function(t) { html += p('・' + t); });
      if (!cn.homophones.length) html += p('✅ 沒有發現常見的不雅諧音', 'var(--color-fortune-good)');
    }
    if (en) {
      html += p('<strong style="color:var(--color-gold-light);">英文 ' + en.name + '</strong> ' + en.notes.join('；'));
      if (en.slang) html += p('⚠️ ' + en.slang, 'var(--color-danger, #c0392b)');
      en.hard.forEach(function(t) { html += p('🔤 難點：' + t, 'var(--color-fortune-neutral)'); });
      en.warns.forEach(function(t) { html += p('・' + t); });
    }
    html += '</details>';
    return html;
  }

  function todayLunar() {
    var d = new Date();
    return (window.Lunar && window.Lunar.fromSolar(d.getFullYear(), d.getMonth() + 1, d.getDate())) || { year: d.getFullYear(), month: 1, day: 1, leap: false };
  }

  var LUNAR_MONTH_NAMES = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
  var LUNAR_DAY_NAMES = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
    '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];

  /** 流月選單：值為「月份」或「月份L」（閏月）；原本選的月份在新的一年不存在時改選同月 */
  function zwMonthOptions(year, selKey) {
    var months = window.Lunar.monthsOf(year) || [];
    var keys = months.map(function(mo) { return mo.month + (mo.leap ? 'L' : ''); });
    if (keys.indexOf(selKey) < 0) selKey = String(parseInt(selKey, 10) || 1);
    return months.map(function(mo, i) {
      return '<option value="' + keys[i] + '"' + (keys[i] === selKey ? ' selected' : '') + '>' + (mo.leap ? '閏' : '') + LUNAR_MONTH_NAMES[mo.month - 1] + '月</option>';
    }).join('');
  }

  /** 流日選單：依該月大小列出初一到廿九或三十 */
  function zwDayOptions(year, monthKey, selDay) {
    var months = window.Lunar.monthsOf(year) || [];
    var mo = months.filter(function(x) { return x.month + (x.leap ? 'L' : '') === monthKey; })[0];
    var days = mo ? mo.days : 29;
    selDay = Math.min(Math.max(selDay || 1, 1), days);
    var html = '';
    for (var i = 1; i <= days; i++) html += '<option value="' + i + '"' + (i === selDay ? ' selected' : '') + '>' + LUNAR_DAY_NAMES[i - 1] + '</option>';
    return html;
  }

  function renderZiweiMonthDaily(zw, year, monthKey, day) {
    var month = parseInt(monthKey, 10), leap = /L$/.test(monthKey);
    var dateKey = function(y, m, lp, d) { return ((y * 13 + m) * 2 + (lp ? 1 : 0)) * 31 + d; }; // 閏月排在同月之後
    if (dateKey(year, month, leap, day) < dateKey(zw.lunar.year, zw.lunar.month, zw.lunar.leap, zw.lunar.day)) {
      return '<p style="font-size:0.72rem;color:var(--color-text-muted);">這一天還沒出生</p>';
    }
    var md = window.Ziwei.getMonthlyDaily(zw, year, month, leap, day);
    if (!md) return '';
    var line = function(label, body) {
      return '<p style="font-size:0.74rem;color:var(--color-text-secondary);margin:3px 0;line-height:1.6;"><strong style="color:var(--color-gold-light);">' + label + '</strong> ' + body + '</p>';
    };
    var sihuaText = function(list) {
      return list.map(function(s) {
        var t = s.star + s.type + (s.palace ? '在' + s.palace.name : '');
        return s.type === '化忌' ? '<span style="color:var(--color-danger, #c0392b);">' + t + '</span>' : t;
      }).join('、');
    };
    var starsText = function(stars) {
      var out = [];
      zw.palaces.forEach(function(p) {
        var list = stars[p.pos];
        if (list) out.push(list.map(function(n) { return zwStarSpan(n); }).join('、') + '在' + p.name);
      });
      return out.join('；');
    };
    var html = '<p style="font-size:0.7rem;color:var(--color-text-muted);margin:4px 0 2px;">國曆 ' + md.solar.year + '/' + md.solar.month + '/' + md.solar.day
      + '・斗君（流年正月）在' + md.douJun.name + '（' + md.douJun.branch + '）</p>';
    [['流月', md.monthly, '這個月'], ['流日', md.daily, '這一天']].forEach(function(row) {
      var label = row[0], f = row[1];
      html += '<p style="font-size:0.78rem;color:var(--color-gold-primary);margin:6px 0 2px;">' + label + '・' + f.ganzhi + '</p>';
      html += line(label + '命宮', '落在本命' + f.ming.name + '（' + f.ming.branch + '），主星 ' + (f.ming.starText || '空宮'));
      html += line(label + '四化', sihuaText(f.sihua));
      html += line(label.charAt(1) + '曜', starsText(f.stars));
      html += zwSihuaTips(f.sihua, row[2]);
    });
    return html;
  }

  /** 四化提示：化祿與化忌各一句，說明落入的宮位代表什麼 */
  function zwSihuaTips(list, when) {
    var R = window.ZiweiReading;
    return list.filter(function(s) { return (s.type === '化祿' || s.type === '化忌') && s.palace; }).map(function(s) {
      var text = R ? R.sihuaIn(s.type, s.palace.name) : s.palace.desc;
      return '<p style="font-size:0.72rem;color:var(--color-text-muted);margin:2px 0 0;line-height:1.6;">' + (s.type === '化祿' ? '🍀 ' : '⚠️ ')
        + when + s.type + '入' + s.palace.name + '：' + text + '</p>';
    }).join('');
  }

  function zwStarSpan(name, extra) {
    var Z = window.Ziwei;
    var color = Z.SHA_STARS.indexOf(name) >= 0 || /^[流月日](羊|陀)$/.test(name) ? 'var(--color-danger, #c0392b)'
      : Z.FLOWER_STARS.indexOf(name) >= 0 || /^[流月日](鸞|喜)$/.test(name) ? '#d4769b'
      : 'inherit';
    return '<span style="color:' + color + ';">' + name + (extra || '') + '</span>';
  }

  function renderZiweiPalaces(zw) {
    var html = '<div style="display:grid;grid-template-columns:auto 1fr;gap:4px 8px;margin-top:8px;font-size:0.7rem;">';
    zw.palaces.forEach(function(p) {
      html += '<span style="color:var(--color-text-secondary);' + (p.isCurrentDecadal ? 'text-decoration:underline;' : '') + '">' + p.name
        + '<br><span style="font-size:0.6rem;">' + p.ganzhi + (p.isShen ? '・身' : '') + (p.decadal ? ' ' + p.decadal.start + '–' + p.decadal.end : '')
        + (p.changsheng ? '・' + p.changsheng : '') + '</span>'
        + '<br><span style="font-size:0.56rem;color:var(--color-text-muted);">' + [p.boshi, p.jiangqian, p.suiqian].filter(Boolean).join('・') + '</span></span>';
      html += '<span style="color:var(--color-gold-light);' + (p.isMing ? 'font-weight:700;' : '') + '">' + (p.starText || '空宮')
        + (p.minorStars.length ? ' <span style="font-size:0.62rem;color:var(--color-text-secondary);">' + p.minorStars.map(function(n, i) {
            var b = p.minorBrightness[i];
            return zwStarSpan(n, b ? '（' + b + '）' : '');
          }).join('、') + '</span>' : '')
        + (p.adjStars.length ? '<br><span style="font-size:0.58rem;color:var(--color-text-muted);">' + p.adjStars.map(function(n) { return zwStarSpan(n); }).join(' ') + '</span>' : '')
        + '</span>';
    });
    html += '</div>';
    html += '<p style="font-size:0.62rem;color:var(--color-text-muted);margin:2px 0;">（）內為亮度：廟 旺 得 利 平 不 陷；紅字為煞星、粉字為桃花星；小字為雜曜'
      + (zw.decadal ? '；宮名下方為大限歲數與十二長生，再下一行為博士・將前・歲前十二神' : '；宮名下方為將前・歲前十二神，填性別後另顯示大限、十二長生與博士十二神') + '</p>';
    return html;
  }

  function renderZiweiHoroscope(zw, year) {
    var h = window.Ziwei.getHoroscope(zw, year);
    if (!h) return '<p style="font-size:0.72rem;color:var(--color-text-muted);">這一年還沒出生</p>';
    var line = function(label, body) {
      return '<p style="font-size:0.74rem;color:var(--color-text-secondary);margin:3px 0;line-height:1.6;"><strong style="color:var(--color-gold-light);">' + label + '</strong> ' + body + '</p>';
    };
    var palaceName = function(p) { return p ? p.name + '（' + p.branch + '）' : '—'; };
    var sihuaText = function(list) {
      return list.map(function(s) {
        var t = s.star + s.type + (s.palace ? '在' + s.palace.name : '');
        return s.type === '化忌' ? '<span style="color:var(--color-danger, #c0392b);">' + t + '</span>' : t;
      }).join('、');
    };
    var html = '<p style="font-size:0.8rem;color:var(--color-gold-primary);margin:6px 0 2px;">' + h.ganzhi + '年・虛歲 ' + h.age + '</p>';
    html += line('大限', h.decadal
      ? palaceName(h.decadal) + ' ' + h.decadal.ganzhi + '，' + h.decadal.decadal.start + '–' + h.decadal.decadal.end + ' 歲，主星 ' + (h.decadal.starText || '空宮')
      : '尚未起大限（童限期間）');
    if (h.decadalSihua) html += line('大限四化', sihuaText(h.decadalSihua));
    html += line('小限', palaceName(h.xiaoxian));
    html += line('流年命宮', '落在本命' + palaceName(h.yearlyMing) + '，主星 ' + (h.yearlyMing.starText || '空宮'));
    html += line('流年四化', sihuaText(h.yearlySihua));
    var liu = [];
    zw.palaces.forEach(function(p) {
      var list = h.yearlyStars[p.pos];
      if (list) liu.push(list.map(function(n) { return zwStarSpan(n); }).join('、') + '在' + p.name);
    });
    html += line('流曜', liu.join('；'));
    var shenText = function(map) {
      return zw.palaces.map(function(p) { return map[p.pos] + '在' + p.name.replace('宮', ''); }).join('、');
    };
    html += line('歲前', shenText(h.yearly12.suiqian));
    html += line('將前', shenText(h.yearly12.jiangqian));
    if (h.decadalSihua) html += zwSihuaTips(h.decadalSihua, '這十年');
    html += zwSihuaTips(h.yearlySihua, '今年');
    return html;
  }

  function parseBirthday(str) {
    if (!str) return null;
    // 支援 YYYY-MM-DD (date input) 和 YYYY/M/D 格式，可選「 HH:MM」出生時間
    var mt = str.trim().match(/^(\d{4})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{1,2}))?(?:[\sT]+(\d{1,2})(?::(\d{1,2}))?)?/);
    if (!mt) return null;
    var y = parseInt(mt[1], 10);
    var m = parseInt(mt[2], 10);
    var d = mt[3] ? parseInt(mt[3], 10) : 1;
    if (y < 1900 || y > 2100 || m < 1 || m > 12) return null;
    var hour = mt[4] != null ? parseInt(mt[4], 10) : null;
    var minute = mt[5] != null ? parseInt(mt[5], 10) : 0;
    if (hour != null && (hour > 23 || minute > 59)) { hour = null; minute = 0; }
    return { year: y, month: m, day: d || 1, hour: hour, minute: minute };
  }

  // ============ 手動筆劃 ============
  function showManualInput(unknownChars) {
    var unique = [];
    unknownChars.forEach(function(c) { if (unique.indexOf(c) < 0) unique.push(c); });
    var html = '';
    unique.forEach(function(c) {
      html += '<div class="manual-stroke-item"><span class="manual-stroke-char">'+c+'</span>';
      html += '<input type="number" class="manual-stroke-input" data-char="'+c+'" placeholder="筆劃" min="1" max="64" inputmode="numeric">';
      html += '<span class="manual-stroke-hint">請輸入「'+c+'」康熙筆劃</span></div>';
    });
    manualStrokeFields.innerHTML = html;
    manualStrokeError.classList.add('hidden');
    manualStrokeCard.classList.remove('hidden');
  }

  function handleManualReanalyze() {
    var inputs = manualStrokeFields.querySelectorAll('.manual-stroke-input');
    var hasErr = false;
    var entered = {};
    inputs.forEach(function(inp) {
      var v = parseInt(inp.value);
      if (isNaN(v) || v < 1 || v > 64) { hasErr = true; inp.style.borderColor = '#F44336'; }
      else { inp.style.borderColor = 'var(--color-gold-primary)'; entered[inp.dataset.char] = v; }
    });
    if (hasErr) { manualStrokeError.textContent = '請輸入有效筆劃(1-64)'; manualStrokeError.classList.remove('hidden'); return; }
    // 記住這次輸入的筆劃，再跑一次分析；analyzeOne 會把它們一起送進五格計算
    Object.keys(entered).forEach(function(c) { manualStrokes[c] = entered[c]; });
    manualStrokeCard.classList.add('hidden');
    handleAnalyze();
  }

  // ============ 分頁 ============
  function switchTab(tab) {
    tabNav.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.toggle('active', b.dataset.tab === tab); });
    document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
    var m = { members: 'panelMembers', matrix: 'panelMatrix', team: 'panelTeam', report: 'panelReport', lucky: 'panelLucky', ai: 'panelAi', history: 'panelHistory' };
    var panel = document.getElementById(m[tab] || 'panelMembers');
    if (panel) panel.classList.add('active');
    // AI 面板的文字跟著目前語言重繪
    if (tab === 'ai' && window.AiReading) window.AiReading.render();
  }

  // ============ 渲染 ============
  function renderAll() {
    if (!currentData) return;
    renderMembers();
    renderMatrix();
    renderTeam();
    renderProfessionalReports();
    renderLuckyGuide();
    renderHistoryPanel();
    // 分析結果換了，舊的 AI 對話不再適用
    if (window.AiReading) window.AiReading.reset();
    if (window.I18N) window.I18N.apply(window.I18N.getLang());
  }

  // ============ 成員分析（摺疊） ============
  function renderMembers() {
    var html = '';

    // 智能總結卡
    html += renderSmartSummary();

    // 結果摘要卡
    html += renderSummaryCard();

    // 每日運勢卡
    html += renderDailyFortuneCard();
    // 五行說明（可摺疊）
    html += renderElementLegend();

    // 並排比較
    html += renderSideBySide();

    // 姓名生成器
    html += renderNameGeneratorUI();
    currentData.results.forEach(function(item, i) {
      var p = item.person;
      var r = item.result;
      var isOpen = i === 0;
      html += '<div class="member-accordion"><div class="member-accordion-header" onclick="this.nextElementSibling.classList.toggle(\'open\')">';
      html += '<span class="person-badge" style="background:var(--color-gold-dark);color:var(--color-bg-deep);">' + p.label + '</span>';
      html += '<span style="flex:1;color:var(--color-gold-light);font-weight:600;">' + (p.cn||'') + (p.cn&&p.en?' / ':'') + (p.en||'') + '</span>';
      html += '<span style="font-size:0.75rem;color:var(--color-text-secondary);">▼</span>';
      html += '</div><div class="member-accordion-body' + (isOpen ? ' open' : '') + '">';
      html += renderPersonDetail(r, item.birthday);
      html += '</div></div>';
    });
    membersContent.innerHTML = html;
    wireNameGenerator();
  }

  function renderPersonDetail(r, bday) {
    var html = '';

    // 生日資訊
    if (r.zodiac && r.zodiac.hasData) {
      html += '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px;padding:8px 12px;background:rgba(212,168,67,0.06);border-radius:8px;">';
      if (r.zodiac.zodiac) {
        var ze = window.ZodiacBazi.zodiacElement(r.zodiac.zodiac);
        html += '<span style="font-size:0.85rem;">🐉 生肖：<strong class="element-' + (ze||'earth') + '">' + r.zodiac.zodiac + '</strong></span>';
      }
      if (r.zodiac.yearPillar) {
        html += '<span style="font-size:0.85rem;">📜 ' + r.zodiac.yearPillar.tianGan + r.zodiac.yearPillar.diZhi + '年</span>';
      }
      if (r.zodiac.dayMaster) {
        html += '<span style="font-size:0.85rem;">☀ 五行：<strong class="element-' + r.zodiac.dayMaster + '">' + r.zodiac.dayMaster + '</strong></span>';
      }
      if (r.zodiac.starSign) {
        html += '<span style="font-size:0.85rem;">' + r.zodiac.starSign.emoji + ' ' + r.zodiac.starSign.name + '</span>';
      }
      if (bday && bday.dst) {
        html += '<span style="font-size:0.75rem;color:var(--color-text-muted);">🕐 ' + bday.place.name + '當時實施夏令時間：' + pad2(bday.clock.hour) + ':' + pad2(bday.clock.minute)
          + ' 已換算為標準時間 ' + pad2(bday.std.hour) + ':' + pad2(bday.std.minute) + '</span>';
      }
      if (bday && bday.tst) {
        var sgn = function(v) { v = Math.round(v); return (v >= 0 ? '+' : '−') + Math.abs(v); };
        html += '<span style="font-size:0.75rem;color:var(--color-text-muted);">☀️ 真太陽時 ' + pad2(bday.hour) + ':' + pad2(bday.minute)
          + '（' + bday.place.name + '，經度校正 ' + sgn(bday.tst.lonMin) + ' 分、均時差 ' + sgn(bday.tst.eotMin) + ' 分）</span>';
      }
      // 完整四柱
      if (r.zodiac.bazi && r.zodiac.bazi.pillars) {
        html += '<div style="margin-top:4px;overflow-x:auto;"><table style="width:100%;font-size:0.75rem;border-collapse:collapse;">';
        html += '<tr style="color:var(--color-text-muted);">';
        r.zodiac.bazi.pillars.forEach(function(p) {
          html += '<td style="text-align:center;padding:2px 6px;border:1px solid rgba(212,168,67,0.1);">' + p.name + '</td>';
        });
        html += '</tr><tr style="font-weight:700;font-size:0.85rem;">';
        r.zodiac.bazi.pillars.forEach(function(p) {
          var c = p.isDayMaster ? 'color:var(--color-gold-primary);' : '';
          html += '<td style="text-align:center;padding:4px 6px;border:1px solid rgba(212,168,67,0.1);'+c+'">' + p.tg + p.dz + '</td>';
        });
        html += '</tr><tr style="color:var(--color-text-muted);">';
        r.zodiac.bazi.pillars.forEach(function(p) {
          html += '<td style="text-align:center;padding:2px 6px;border:1px solid rgba(212,168,67,0.1);">' + p.tgEle + p.dzEle + '</td>';
        });
        html += '</tr>';
        if (r.zodiac.bazi.hasHour) {
          html += '<tr style="color:var(--color-text-muted);font-size:0.65rem;">';
          r.zodiac.bazi.pillars.forEach(function(p) {
            html += '<td style="text-align:center;padding:2px 6px;">' + (p.shiShen || '') + '</td>';
          });
          html += '</tr>';
        }
        html += '</table></div>';
        html += '<p style="font-size:0.7rem;color:var(--color-text-muted);margin:2px 0;">☀ 日主：<strong class="element-' + r.zodiac.bazi.dayMaster + '">' + r.zodiac.bazi.dayMaster + '</strong>（' + r.zodiac.bazi.dayMasterTG + '） — 代表你的核心本質</p>';
      }

      if (r.zodiac.zodiacNature) {
        html += '<p style="font-size:0.75rem;color:var(--color-text-muted);margin:4px 0 0;">' + r.zodiac.zodiacNature + '</p>';
      }
      html += '</div>';

      // MBTI
      if (r.en && window.FunExtras) {
        var mbti = window.FunExtras.getMBTI(r.en.destiny);
        html += '<div class="mbti-card" style="margin-bottom:8px;">';
        html += '<span class="mbti-type">' + mbti.mbti + '</span>';
        html += '<span class="mbti-label">' + mbti.label + ' — ' + mbti.desc.substring(0,30) + '...</span>';
        html += '</div>';
      }

      // 塔羅深度詳解
      if (r.en && window.FunExtras && window.DeepReadings) {
        var tarotDeep = window.DeepReadings.getTarotDeepReading(r.en.destiny, r.en);
        html += '<details style="margin:4px 0;font-size:0.85rem;"><summary style="color:var(--color-gold-primary);cursor:pointer;">🃏 塔羅解析</summary>';
        html += '<p style="color:var(--color-text-secondary);line-height:1.8;white-space:pre-line;">' + tarotDeep + '</p></details>';
      }

      // 占星盤
      if (bday && window.Astrology) {
        var astroPlace = bday.place ? { name: bday.place.name, lat: bday.place.lat, lon: bday.place.lon, tz: bday.tzOffset } : null;
        var astro = window.Astrology.getChart(bday.year, bday.month, bday.day, bday.hour, bday.minute, astroPlace);
        if (astro) {
          var astroTitle = '太陽' + astro.sunSign.n + (astro.timeKnown ? ' · 月亮' + astro.moonSign.n : '') + (astro.ascendant ? ' · 上升' + astro.ascendant.sign.n : '');
          html += '<details style="margin:4px 0;font-size:0.85rem;"><summary style="color:var(--color-gold-primary);cursor:pointer;">🌟 占星盤：' + astroTitle + '</summary>';
          html += '<p style="font-size:0.8rem;color:var(--color-text-secondary);">' + astro.sunSign.desc + '</p>';
          if (astro.ascendant) html += '<p style="font-size:0.8rem;color:var(--color-text-secondary);">⬆️ 上升' + astro.ascendant.sign.n + ' ' + astro.ascendant.degree + '：' + astro.ascendant.sign.desc + '</p>';
          html += '<p style="font-size:0.8rem;color:var(--color-text-secondary);">主導元素：<strong class="element-' + astro.dominantElement + '">' + astro.dominantElement + '</strong> — ' + astro.nameAdvice + '</p>';
          html += '<div style="display:grid;grid-template-columns:auto 1fr auto;gap:2px 8px;font-size:0.72rem;color:var(--color-text-secondary);margin-top:6px;">';
          astro.planets.forEach(function(pl) {
            html += '<span>' + pl.emoji + ' ' + pl.name + '</span>';
            html += '<span style="color:var(--color-gold-light);">' + pl.sign.n + ' ' + pl.degree + (pl.retrograde ? ' <span title="逆行">℞</span>' : '') + '</span>';
            html += '<span>' + pl.house.n.split(' ')[0] + '</span>';
          });
          html += '</div>';
          html += '<p style="font-size:0.68rem;color:var(--color-text-muted);margin:4px 0;">' + (astro.timeKnown
            ? '宮位：' + astro.houseSystem
            : '未填出生時間：以正午計算，月亮位置可能差數度，宮位採太陽宮位制，並略過月亮相位') + '</p>';
          if (astro.aspects && astro.aspects.length) {
            var topAspects = astro.aspects.slice(0, 6);
            html += '<div style="margin-top:8px;font-size:0.75rem;">📐 主要相位（共' + astro.aspects.length + '組）</div>';
            topAspects.forEach(function(a) {
              var color = a.nature === '吉' ? 'var(--color-gold-light)' : (a.nature === '挑戰' ? 'var(--color-danger, #c0392b)' : 'var(--color-text-secondary)');
              html += '<p style="font-size:0.72rem;color:' + color + ';margin:2px 0;line-height:1.6;">' + a.p1Emoji + a.p1 + ' × ' + a.p2Emoji + a.p2 + ' ' + a.type + '（' + a.angle + '，差 ' + a.orb + '°）— ' + (a.nature === '吉' ? '和諧' : a.nature === '挑戰' ? '張力' : '融合') + '</p>';
            });
          }
          html += '</details>';
        }
      }

      // 紫微斗數
      if (r.cn && bday && window.Ziwei) {
        var zw = window.Ziwei.getZiweiChart(bday.year, bday.month, bday.day, bday.hour, r.gender);
        if (zw && zw.needHour) {
          html += '<details style="margin:4px 0;font-size:0.85rem;"><summary style="color:var(--color-gold-primary);cursor:pointer;">🔮 紫微斗數：需要出生時間</summary>';
          html += '<p style="font-size:0.8rem;color:var(--color-text-secondary);line-height:1.8;">' + zw.lunarText + '。命宮與十四主星的位置由出生時辰決定，填入出生時間即可排出完整命盤。</p>';
          if (zw.sihua && zw.sihua.list.length) {
            html += '<div style="margin-top:4px;font-size:0.75rem;">🌟 生年四化（' + zw.sihua.tg + '干）：' + zw.sihua.list.map(function(s) { return s.star + s.type; }).join('、') + '</div>';
          }
          html += '</details>';
        } else if (zw) {
          html += '<details style="margin:4px 0;font-size:0.85rem;"><summary style="color:var(--color-gold-primary);cursor:pointer;">🔮 紫微斗數：命宮' + zw.mingStar + '</summary>';
          html += '<p style="font-size:0.72rem;color:var(--color-text-muted);margin:2px 0;">' + zw.lunarText + ' · ' + zw.bureau + ' · 身宮在' + zw.shenPalace.name + '</p>';
          if (zw.decadal) {
            var cd = zw.decadal.current;
            html += '<p style="font-size:0.78rem;color:var(--color-gold-light);margin:2px 0;">📅 大限' + (zw.decadal.forward ? '順行' : '逆行')
              + (cd ? '，目前（虛歲 ' + zw.decadal.nowAge + '）走' + cd.name + '大限（' + cd.decadal.start + '–' + cd.decadal.end + ' 歲，' + cd.star + '）' : '') + '</p>';
          } else {
            html += '<p style="font-size:0.72rem;color:var(--color-text-muted);margin:2px 0;">填入性別即可排出十年大限</p>';
          }
          var zr = window.ZiweiReading && window.ZiweiReading.mingReading(zw);
          if (zr) {
            html += '<p style="font-size:0.82rem;color:var(--color-gold-light);margin:6px 0 2px;font-weight:600;">📖 ' + zr.title + '</p>';
            zr.paragraphs.forEach(function(t) { html += '<p style="font-size:0.8rem;color:var(--color-text-secondary);line-height:1.8;margin:2px 0;">' + t + '</p>'; });
          } else {
            html += '<p style="font-size:0.8rem;color:var(--color-text-secondary);line-height:1.8;">' + zw.mingDesc + '</p>';
          }
          var zc = window.Ziwei.ziweiNameCompare(zw, r.cn);
          if (zc) html += '<p style="font-size:0.85rem;color:var(--color-gold-light);margin-top:4px;">📊 命宮vs姓名：' + zc.reading + '</p>';
          // 12宮簡表：主星（亮度）、輔星、雜曜、十二長生
          html += renderZiweiPalaces(zw);
          if (window.ZiweiReading) {
            html += '<details style="margin-top:6px;"><summary style="font-size:0.75rem;color:var(--color-gold-primary);cursor:pointer;">📜 十二宮重點</summary>';
            window.ZiweiReading.palaceReadings(zw).forEach(function(pr) {
              html += '<p style="font-size:0.72rem;color:var(--color-text-secondary);margin:3px 0;line-height:1.6;"><strong style="color:var(--color-gold-light);">' + pr.palace.name + '</strong> '
                + pr.text + '<span style="color:var(--color-text-muted);">' + pr.palace.desc + '</span></p>';
            });
            html += '</details>';
          }
          if (zw.sihua && zw.sihua.list.length) {
            html += '<div style="margin-top:8px;font-size:0.75rem;">🌟 生年四化（' + zw.sihua.tg + '干）</div>';
            zw.sihua.list.forEach(function(s) {
              var color = s.type === '化忌' ? 'var(--color-danger, #c0392b)' : 'var(--color-gold-light)';
              var inText = s.palace && window.ZiweiReading ? window.ZiweiReading.sihuaIn(s.type, s.palace.name) : '';
              html += '<p style="font-size:0.75rem;color:' + color + ';margin:2px 0;line-height:1.6;">'
                + (inText ? s.star + s.type + '入' + s.palace.name + '：' + inText : s.reading) + '</p>';
            });
          }
          // 運限（大限、小限、流年）：可切換年份
          if (zw.gender) {
            var zwIdx = zwCharts.push(zw) - 1;
            var thisYear = currentLunarYear();
            html += '<div class="zw-horoscope" data-zw="' + zwIdx + '" style="margin-top:10px;padding:8px 10px;background:rgba(212,168,67,0.06);border-radius:8px;">';
            html += '<label style="font-size:0.78rem;color:var(--color-gold-primary);">🗓️ 運限 <select class="form-input zw-year" style="width:auto;padding:2px 6px;font-size:0.75rem;">';
            for (var yy = zw.birthLunarYear; yy <= zw.birthLunarYear + 100; yy++) {
              html += '<option value="' + yy + '"' + (yy === thisYear ? ' selected' : '') + '>' + yy + '</option>';
            }
            html += '</select></label>';
            html += '<div class="zw-horo-body">' + renderZiweiHoroscope(zw, thisYear) + '</div>';
            // 流月、流日：預設今天的農曆日期
            var today = todayLunar();
            var mKey = today.month + (today.leap ? 'L' : '');
            html += '<div style="margin-top:8px;padding-top:6px;border-top:1px dashed rgba(212,168,67,0.25);">';
            html += '<label style="font-size:0.78rem;color:var(--color-gold-primary);">📆 流月、流日 '
              + '<select class="form-input zw-month" style="width:auto;padding:2px 6px;font-size:0.75rem;">' + zwMonthOptions(thisYear, mKey) + '</select> '
              + '<select class="form-input zw-day" style="width:auto;padding:2px 6px;font-size:0.75rem;">' + zwDayOptions(thisYear, mKey, today.day) + '</select></label>';
            html += '<div class="zw-md-body">' + renderZiweiMonthDaily(zw, thisYear, mKey, today.day) + '</div>';
            html += '</div>';
            html += '</div>';
          } else {
            html += '<p style="font-size:0.72rem;color:var(--color-text-muted);margin-top:6px;">填入性別即可查看大限、小限與流年</p>';
          }
          html += '</details>';
        }
      }

      // 卡巴拉深度
      if (r.en && window.EnglishNumerology && window.DeepReadings) {
        var chal = window.EnglishNumerology.chaldeanNumber(r.en.name || r.enReport.name);
        var kabReading = window.DeepReadings.getKabbalahReading(chal);
        html += '<details style="margin:4px 0;font-size:0.85rem;"><summary style="color:var(--color-gold-primary);cursor:pointer;">🔯 卡巴拉生命樹</summary>';
        html += '<p style="color:var(--color-text-secondary);line-height:1.8;">' + kabReading + '</p></details>';
      }

      // 今日幸運
      if (r.en && window.FunExtras) {
        var el = r.cn ? r.cn.grids.ren.element : '?';
        var df = window.FunExtras.getDailyFortune(r.en.destiny, el);
        html += '<div class="daily-fortune">';
        html += '<span class="fortune-stars" style="color:var(--color-gold-primary);">' + df.starDisplay + '</span>';
        html += '<div class="fortune-items">';
        html += '<span class="fortune-item">🎨 <strong>' + df.color + '</strong></span>';
        html += '<span class="fortune-item">🧭 <strong>' + df.direction + '</strong></span>';
        html += '<span class="fortune-item">🔢 <strong>' + df.number + '</strong></span>';
        html += '</div>';
        html += '<span style="font-size:0.7rem;color:var(--color-text-muted);margin-left:auto;">' + df.tip.substring(0,20) + '...</span>';
        html += '</div>';
      }
    }

    if (r.cn) {
      html += '<div class="letter-grid">';
      var allS = r.cn.wuge.strokeDetails.surname.concat(r.cn.wuge.strokeDetails.givenName);
      allS.forEach(function(s) { html += '<div class="letter-chip"><span class="letter">'+s.char+'</span><span class="number">'+(s.strokes<0?'?':s.strokes)+'劃</span></div>'; });
      html += '</div>';
      html += '<div class="wuge-grid">';
      ['tian','ren','di','wai','zong'].forEach(function(k) {
        var g = r.cn.grids[k];
        var fc = g.fortune?'fortune-'+(g.fortune.glory==='大吉'?'great':g.fortune.glory==='吉'?'good':g.fortune.glory==='中吉'||g.fortune.glory==='半吉'?'neutral':g.fortune.glory==='凶'?'bad':'terrible'):'';
        html += '<div class="wuge-row'+(g.isMain?' is-main':'')+'"><span class="wuge-name">'+g.name+'</span><span class="wuge-number">'+g.number+'</span><span class="wuge-element element-'+g.element+'">'+g.element+'</span><span class="wuge-fortune '+fc+'">'+(g.fortune?g.fortune.glory:'?')+'</span></div>';
      });
      html += '</div>';
      html += '<p style="font-size:0.85rem;color:var(--color-text-secondary);">三才：'+r.cn.sancai.level+' | 整體：'+r.cn.overall+'</p>';
    }
    // 英文名含義
    if (r.enReport && window.englishNameMeanings) {
      var nameParts = r.enReport.name.toUpperCase().split(/\s+/);
      nameParts.forEach(function(np) {
        var meaning = window.englishNameMeanings[np];
        if (meaning) {
          html += '<p style="font-size:0.8rem;color:var(--color-text-muted);margin:2px 0;">📛 ' + np + '：' + meaning + '</p>';
        }
      });
    }

    // 音韻與諧音（只看名字，不需要生日）
    if (window.Phonetics && (r.cn || r.en)) {
      var enName = r.enReport ? r.enReport.name : (r.en ? r.en.name : '');
      html += renderPhonetics(r.cn ? window.Phonetics.checkChinese(r.cn.parsed) : null, enName ? window.Phonetics.checkEnglish(enName) : null);
    }

    if (r.enReport) {
      var enData = r.enReport;
      html += '<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(212,168,67,0.1);"><strong style="color:var(--color-gold-primary);">🔢 英文靈數</strong></div>';
      html += '<div class="numerology-grid">';
      enData.coreNumbers.forEach(function(n) {
        var isM = (n.number===11||n.number===22||n.number===33);
        html += '<div class="number-card"><div class="'+(isM?'number-circle master-number':'number-circle')+'">'+n.number+'</div><div class="number-info"><div class="number-name">'+n.name+'</div><div class="number-desc">'+ (n.meaning.title||'') +'</div></div></div>';
      });
      html += '</div>';

      // 進階靈數
      var adv = window.EnglishNumerology.getAdvancedNumbers(r.en);
      if (adv) {
        html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">';
        if (adv.challenge) html += '<span style="font-size:0.8rem;color:var(--color-text-secondary);background:var(--color-bg-mid);padding:4px 10px;border-radius:12px;">⚔️ 挑戰:' + adv.challenge.primary + '/' + adv.challenge.secondary + '</span>';
        if (adv.maturity) html += '<span style="font-size:0.8rem;color:var(--color-text-secondary);background:var(--color-bg-mid);padding:4px 10px;border-radius:12px;">🌟 成熟:' + adv.maturity + '</span>';
        if (adv.balance) html += '<span style="font-size:0.8rem;color:var(--color-text-secondary);background:var(--color-bg-mid);padding:4px 10px;border-radius:12px;">⚖️ 平衡:' + adv.balance + '</span>';
        html += '</div>';
      }
    }
    return html;
  }

  // ============ 配對矩陣 ============
  function renderMatrix() {
    if (!currentData || !currentData.pairs.length) {
      matrixContent.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💫</div><div class="empty-state-text">需要至少兩位成員輸入姓名</div><div class="empty-state-hint">才能產出配對矩陣</div></div>';
      return;
    }

    var labels = currentData.results.map(function(r) { return r.person.label; });
    var n = labels.length;

    // 建立查表
    var pairMap = {};
    currentData.pairs.forEach(function(p) {
      var key = p.a + '|' + p.b;
      if (!pairMap[key] || pairMap[key].pair.score < p.pair.score) pairMap[key] = p;
    });

    // 表格
    var html = '<div style="overflow-x:auto;"><table class="matrix-table"><thead><tr><th></th>';
    labels.forEach(function(l) { html += '<th>' + l + '</th>'; });
    html += '</tr></thead><tbody>';

    for (var i = 0; i < n; i++) {
      html += '<tr><th>' + labels[i] + '</th>';
      for (var j = 0; j < n; j++) {
        if (i === j) {
          html += '<td class="matrix-self">—</td>';
        } else {
          var a = labels[Math.min(i,j)], b = labels[Math.max(i,j)];
          var key = a + '|' + b;
          var entry = pairMap[key];
          if (entry) {
            var sc = entry.pair.score;
            var color = sc>=80?'var(--color-fortune-great)':sc>=60?'var(--color-fortune-good)':sc>=40?'var(--color-fortune-neutral)':'var(--color-fortune-bad)';
            html += '<td class="matrix-pair" title="'+entry.pair.mode+'">';
            html += '<span class="matrix-score-big" style="color:'+color+';">'+sc+'</span>';
            html += '<span class="matrix-tier-sm" style="color:'+color+';">'+entry.pair.tier+'</span>';
            html += '<span class="matrix-mode-sm">'+entry.pair.mode+'</span>';
            html += '</td>';
          } else {
            html += '<td class="matrix-self">N/A</td>';
          }
        }
      }
      html += '</tr>';
    }
    html += '</tbody></table></div>';

    // 每組配對的詳細解讀（直接顯示）
    html += '<div style="margin-top:var(--space-xl);">';
    html += '<h3 style="color:var(--color-gold-primary);margin-bottom:var(--space-md);">📖 各組配對詳細解讀</h3>';

    currentData.pairs.forEach(function(entry) {
      var scColor = entry.pair.score>=80?'var(--color-fortune-great)':entry.pair.score>=60?'var(--color-fortune-good)':entry.pair.score>=40?'var(--color-fortune-neutral)':'var(--color-fortune-bad)';
      html += '<div class="fortune-detail" style="margin-bottom:var(--space-lg);cursor:pointer;" onclick="var e=arguments[0]||window.event;e.stopPropagation();">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-sm);">';
      html += '<strong style="color:var(--color-gold-light);">' + entry.a + ' ↔ ' + entry.b + '</strong>';
      html += '<span class="analysis-mode-badge ' + entry.pair.modeClass + '">' + entry.pair.mode + '</span>';
      html += '</div>';

      // 迷你雷達圖
      if (entry.pair.dimensions && entry.pair.dimensions.length >= 3) {
        html += renderMiniRadar(entry.pair.dimensions);
      }

      // 分數摘要（含動畫）
      html += '<div style="display:flex;align-items:center;gap:var(--space-md);margin-bottom:var(--space-sm);">';
      html += '<span class="score-animate" style="font-family:var(--font-en);font-size:2rem;font-weight:900;color:' + scColor + ';">' + entry.pair.score + '</span>';
      html += '<span style="font-size:0.8rem;color:var(--color-text-secondary);">/100</span>';
      html += '<span style="font-family:var(--font-heading);color:' + scColor + ';">' + entry.pair.tier + '</span>';
      html += '</div>';

      // 各維度分數條
      if (entry.pair.dimensions) {
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:var(--space-sm);">';
        entry.pair.dimensions.forEach(function(d) {
          var pct = Math.round(d.score/d.max*100);
          var fc = pct>=80?'var(--color-fortune-great)':pct>=60?'var(--color-fortune-good)':pct>=40?'var(--color-fortune-neutral)':'var(--color-fortune-bad)';
          html += '<div style="font-size:0.8rem;"><span style="color:var(--color-text-secondary);">' + d.label + '</span>';
          html += '<div class="pair-dim-bar" style="margin-top:2px;"><div class="pair-dim-fill" style="width:' + pct + '%;background:' + fc + ';"></div></div>';
          html += '<span style="float:right;color:var(--color-text-secondary);font-size:0.7rem;">' + d.score + '/' + d.max + '</span></div>';
        });
        html += '</div>';
      }

      // 每個維度的詳細說明
      if (entry.pair.dimensions) {
        entry.pair.dimensions.forEach(function(d) {
          html += '<details style="margin:4px 0;font-size:0.85rem;"><summary style="color:var(--color-gold-primary);cursor:pointer;">' + d.label + '：' + d.score + '/' + d.max + '</summary>';
          html += '<p style="color:var(--color-text-secondary);margin:4px 0 8px 16px;line-height:1.8;">' + d.detail + '</p></details>';
        });
      }

      // 關係一句話
      if (window.SmartInsights) {
        var rl = window.SmartInsights.relationshipOneLiner(entry.pair);
        var rtips = window.SmartInsights.relationshipTips(entry.pair);
        html += '<p style="font-size:0.85rem;color:var(--color-gold-light);margin:4px 0;">💬 ' + rl + '</p>';
        if (rtips.length) {
          html += '<div style="margin:4px 0;">';
          rtips.forEach(function(t) {
            var isGood = t.indexOf('保持') === 0;
            html += '<p style="font-size:0.75rem;color:' + (isGood?'var(--color-fortune-good)':'var(--color-fortune-neutral)') + ';margin:1px 0;">' + (isGood?'✅ ':'🔧 ') + t + '</p>';
          });
          html += '</div>';
        }
      }

      // 綜合解讀
      if (entry.pair.reading && entry.pair.reading.summary) {
        html += '<div style="margin-top:var(--space-sm);padding-top:var(--space-sm);border-top:1px solid rgba(212,168,67,0.15);">';
        html += '<p style="font-size:0.85rem;color:var(--color-text-secondary);line-height:2;white-space:pre-line;">' + entry.pair.reading.summary + '</p>';
        html += '</div>';
      }

      html += '</div>';
    });
    html += '</div>';

    matrixContent.innerHTML = html;

    // 點擊矩陣儲存格查看詳情
    matrixContent.querySelectorAll('.matrix-pair').forEach(function(td) {
      td.addEventListener('click', function() {
        var row = this.closest('tr');
        var rowLabel = row ? row.querySelector('th').textContent : '';
        var colIdx = Array.from(this.parentElement.children).indexOf(this);
        var table = this.closest('table');
        var colLabel = table ? table.querySelector('thead tr').children[colIdx].textContent : '';
        openPairDetail(rowLabel, colLabel);
      });
    });
  }

  // ============ 團隊報告 ============
  function renderTeam() {
    if (!currentData || !currentData.pairs.length) {
      teamContent.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-text">需要至少兩位成員</div><div class="empty-state-hint">才能產出團隊命理報告</div></div>';
      return;
    }

    var pairs = currentData.pairs;
    var scores = pairs.map(function(p) { return p.pair.score; });
    var avg = Math.round(scores.reduce(function(a,b){return a+b;},0) / scores.length);
    var maxScore = Math.max.apply(null, scores);
    var minScore = Math.min.apply(null, scores);
    var sorted = pairs.slice().sort(function(a,b) { return b.pair.score - a.pair.score; });
    var best = sorted.slice(0, 3);
    var worst = sorted.slice(-3).reverse();

    var avgColor = avg>=80?'var(--color-fortune-great)':avg>=60?'var(--color-fortune-good)':avg>=40?'var(--color-fortune-neutral)':'var(--color-fortune-bad)';
    var tier = window.PairHarmony.getTier(avg);

    var html = '';

    // 統計卡片
    html += '<div class="team-stats">';
    html += '<div class="team-stat-card"><div class="team-stat-value" style="color:'+avgColor+';">'+avg+'</div><div class="team-stat-label">團隊均分</div></div>';
    html += '<div class="team-stat-card"><div class="team-stat-value" style="color:var(--color-fortune-great);">'+maxScore+'</div><div class="team-stat-label">最佳配對</div></div>';
    html += '<div class="team-stat-card"><div class="team-stat-value" style="color:var(--color-fortune-bad);">'+minScore+'</div><div class="team-stat-label">最低配對</div></div>';
    html += '</div>';

    // 團隊評級
    html += '<div class="pair-summary" style="padding:var(--space-md);">';
    html += '<div class="pair-tier" style="color:'+avgColor+';">團隊命理評級：' + tier + '</div>';
    html += '<p style="color:var(--color-text-secondary);font-size:0.9rem;">共 ' + currentData.results.length + ' 位成員，' + pairs.length + ' 組配對分析</p>';
    html += '</div>';

    // 五行分佈
    var elements = {};
    currentData.results.forEach(function(item) {
      if (item.result.cn) {
        var el = item.result.cn.grids.ren.element;
        elements[el] = (elements[el] || 0) + 1;
      }
    });
    if (Object.keys(elements).length > 0) {
      html += '<div class="wuxing-chart" style="margin-bottom:var(--space-md);">';
      var elInfo = { '木':'🌳','火':'🔥','土':'⛰️','金':'⚔️','水':'💧' };
      var elKeys = ['木','火','土','金','水'];
      var maxC = Math.max.apply(null, elKeys.map(function(k){return elements[k]||0;}));
      elKeys.forEach(function(el) {
        var c = elements[el] || 0;
        var h = maxC > 0 ? Math.max(8, c/maxC*80) : 0;
        html += '<div class="wuxing-bar-group"><span class="wuxing-bar-label">'+(elInfo[el]||el)+'</span><div class="wuxing-bar-track"><div class="wuxing-bar-fill '+el+'" style="height:'+h+'%;"></div></div><span class="wuxing-bar-value element-'+el+'">'+el+' ×'+c+'</span></div>';
      });
      html += '</div>';
    }

    // 最佳/最差配對
    html += '<div class="team-best-worst">';
    html += '<h3 style="color:var(--color-gold-primary);margin-bottom:var(--space-sm);">🏆 最佳配對</h3>';
    best.forEach(function(p) {
      var sc = p.pair.score>=80?'var(--color-fortune-great)':p.pair.score>=60?'var(--color-fortune-good)':p.pair.score>=40?'var(--color-fortune-neutral)':'var(--color-fortune-bad)';
      html += '<div class="team-pair-card" style="border-left-color:'+sc+';">';
      html += '<div class="team-pair-info"><div class="team-pair-names">'+p.a+' ↔ '+p.b+'</div><div class="team-pair-detail">'+p.pair.mode+' — '+p.pair.tier+'</div></div>';
      html += '<div class="team-pair-score" style="color:'+sc+';">'+p.pair.score+'</div></div>';
    });
    html += '<h3 style="color:var(--color-text-secondary);margin:var(--space-md) 0 var(--space-sm);">⚠️ 需關注配對</h3>';
    worst.forEach(function(p) {
      var sc = p.pair.score>=80?'var(--color-fortune-great)':p.pair.score>=60?'var(--color-fortune-good)':p.pair.score>=40?'var(--color-fortune-neutral)':'var(--color-fortune-bad)';
      html += '<div class="team-pair-card" style="border-left-color:'+sc+';">';
      html += '<div class="team-pair-info"><div class="team-pair-names">'+p.a+' ↔ '+p.b+'</div><div class="team-pair-detail">'+p.pair.mode+' — '+p.pair.tier+'</div></div>';
      html += '<div class="team-pair-score" style="color:'+sc+';">'+p.pair.score+'</div></div>';
    });
    html += '</div>';

    // 團隊角色建議
    html += renderTeamRoles();

    teamContent.innerHTML = html;

    // 點擊配對卡片
    teamContent.querySelectorAll('.team-pair-card').forEach(function(card) {
      card.style.cursor = 'pointer';
      card.addEventListener('click', function() {
        var names = this.querySelector('.team-pair-names').textContent.split('↔');
        if (names.length === 2) openPairDetail(names[0].trim(), names[1].trim());
      });
    });
  }

  function renderDailyFortuneCard() {
    if (!currentData || !window.FunExtras) return '';
    var r = currentData.results[0];
    if (!r || !r.result.en) return '';
    var el = r.result.cn ? r.result.cn.grids.ren.element : '?';
    var df = window.FunExtras.getDailyFortune(r.result.en.destiny, el);
    var html = '<div class="fortune-detail" style="text-align:center;background:linear-gradient(135deg,rgba(212,168,67,0.06),rgba(196,30,58,0.04));">';
    html += '<h3>🔮 今日姓名運勢</h3>';
    html += '<div style="font-size:1.5rem;margin:8px 0;color:var(--color-gold-primary);">' + df.starDisplay + '</div>';
    html += '<div style="display:flex;justify-content:center;gap:16px;flex-wrap:wrap;font-size:0.85rem;">';
    html += '<span>🎨 <strong style="color:var(--color-gold-light);">' + df.color + '</strong></span>';
    html += '<span>🧭 <strong style="color:var(--color-gold-light);">' + df.direction + '</strong></span>';
    html += '<span>🔢 <strong style="color:var(--color-gold-light);">' + df.number + '</strong></span>';
    html += '</div>';
    html += '<p style="font-size:0.8rem;color:var(--color-text-secondary);margin-top:4px;">' + df.tip + '</p>';
    html += '<p style="font-size:0.65rem;color:var(--color-text-muted);">' + df.date + '</p>';
    html += '</div>';
    return html;
  }

  // ============ 並排比較五格 ============
  function renderSideBySide() {
    if (!currentData || !currentData.results || currentData.results.length < 2) return '';
    // 只顯示有中文名的
    var withCN = currentData.results.filter(function(r) { return r.result.cn; });
    if (withCN.length < 2) return '';

    var html = '<h3 style="color:var(--color-gold-primary);margin:1rem 0;font-size:1rem;">⚖️ 五格並排比較</h3>';
    html += '<div class="compare-grid">';

    withCN.forEach(function(item) {
      var cn = item.result.cn;
      var g = cn.grids;
      html += '<div class="compare-card">';
      html += '<div class="compare-card-header"><span class="compare-name">' + item.person.label + '</span>';
      html += '<span style="font-size:0.75rem;color:var(--color-text-secondary);">' + (cn.parsed.surname + cn.parsed.givenName) + '</span></div>';
      html += '<div class="compare-mini-grid">';
      ['tian','ren','di','wai','zong'].forEach(function(k) {
        var v = g[k];
        var fc = v.fortune ? 'fortune-'+(v.fortune.glory==='大吉'?'great':v.fortune.glory==='吉'?'good':v.fortune.glory==='中吉'||v.fortune.glory==='半吉'?'neutral':v.fortune.glory==='凶'?'bad':'terrible') : '';
        html += '<span class="compare-mini-label">' + v.name + '</span>';
        html += '<span class="compare-mini-val">' + v.number + ' <span class="element-' + v.element + '" style="font-size:0.7rem;">' + v.element + '</span></span>';
        html += '<span class="compare-mini-tag ' + fc + '">' + (v.fortune ? v.fortune.glory : '?') + '</span>';
      });
      html += '</div></div>';
    });

    html += '</div>';
    return html;
  }

  // ============ 專業鑑定報告 ============
  function renderProfessionalReports() {
    if (!currentData || !currentData.results) return;

    var html = '';
    currentData.results.forEach(function(item, idx) {
      var r = item.result;
      if (!r.cn) return;

      var zodiac = r.zodiac;
      var report = window.Professional.generateReport(item.person, r.cn, r.en, zodiac);
      if (!report) return;

      // 診斷資料
      var diag = report.elementDiagnosis;
      var balanceColor = diag.balanceScore >= 85 ? 'var(--color-fortune-great)' : diag.balanceScore >= 65 ? 'var(--color-fortune-good)' : 'var(--color-fortune-neutral)';

      // 專業模式：完整報告書
      html += '<div class="report-certificate" style="margin-bottom:var(--space-2xl);">';

      // 標題
      html += '<div class="report-cert-header">';
      html += '<div class="report-cert-title">姓名鑑定書</div>';
      html += '<div class="report-cert-subtitle">' + report.generatedAt + ' 鑑定</div>';
      html += '</div>';

      // 基本資料
      html += '<div class="report-section">';
      html += '<div class="report-section-title">📋 基本資料</div>';
      html += '<table class="report-table"><tr><th>姓名</th><th>綜合評級</th>';
      if (report.bazi) html += '<th>八字年柱</th><th>生肖</th><th>日主</th>';
      if (report.numerology) html += '<th>命運數</th>';
      html += '</tr><tr>';
      html += '<td><strong style="font-size:1.2rem;">' + report.name + '</strong></td>';
      var lvlColor = report.overallLevel==='上等'?'var(--color-fortune-great)':report.overallLevel==='中上'?'var(--color-fortune-good)':'var(--color-fortune-neutral)';
      html += '<td><strong style="color:'+lvlColor+';">' + report.overallLevel + '</strong></td>';
      if (report.bazi) {
        html += '<td>' + report.bazi.year + '</td><td>' + report.bazi.zodiac + '</td><td class="element-' + report.bazi.dayMaster + '">' + report.bazi.dayMaster + '</td>';
      }
      if (report.numerology) html += '<td>' + report.numerology.destiny + '</td>';
      html += '</tr></table></div>';

      // 五格剖象表
      html += '<div class="report-section">';
      html += '<div class="report-section-title">📊 五格剖象</div>';
      html += '<table class="report-table"><tr><th>格局</th><th>筆劃</th><th>五行</th><th>吉凶</th><th>數理解說</th><th>古籍參照</th></tr>';
      report.gridDetails.forEach(function(g) {
        var fc = g.fortune==='大吉'?'fortune-great':g.fortune==='吉'?'fortune-good':g.fortune==='中吉'||g.fortune==='半吉'?'fortune-neutral':g.fortune==='凶'?'fortune-bad':'fortune-terrible';
        html += '<tr><td><strong>' + g.name + '</strong></td><td>' + g.number + '</td><td class="element-' + g.element + '">' + g.element + '</td><td><span class="wuge-fortune ' + fc + '">' + g.fortune + '</span></td><td style="text-align:left;font-size:0.8rem;">' + g.implication.substring(0,60) + '...</td><td class="quote-cell">' + (g.quote||'') + '</td></tr>';
      });
      html += '</table></div>';

      // 三才
      html += '<div class="report-section">';
      html += '<div class="report-section-title">☯ 三才配置</div>';
      html += '<p style="font-size:0.9rem;color:var(--color-text-secondary);">評級：<strong>' + report.sancai.level + '</strong></p>';
      html += '<p style="font-size:0.85rem;color:var(--color-text-secondary);">' + report.sancai.description + '</p>';
      if (report.sancai.quote) html += '<p class="quote-cell">📜 ' + report.sancai.quote + '</p>';
      html += '</div>';

      // 五行診斷
      html += '<div class="report-section">';
      html += '<div class="report-section-title">🌟 五行診斷</div>';
      html += '<p style="font-size:0.8rem;color:var(--color-text-secondary);margin-bottom:8px;">名字五格各有五行屬性，分佈越均衡越好。以下分析你名字中每個五行出現的次數與佔比：</p>';
      html += '<div style="text-align:center;margin-bottom:12px;">平衡度：<strong style="font-size:1.2rem;color:' + balanceColor + ';">' + diag.balanceScore + '%</strong>（' + diag.balanceLevel + '）</div>';
      html += '<div class="wuxing-ring">';
      var elInfo = { '木':{icon:'🌳',color:'var(--color-wuxing-wood)'}, '火':{icon:'🔥',color:'var(--color-wuxing-fire)'}, '土':{icon:'⛰️',color:'var(--color-wuxing-earth)'}, '金':{icon:'⚔️',color:'var(--color-wuxing-metal)'}, '水':{icon:'💧',color:'var(--color-wuxing-water)'} };
      Object.keys(diag.diagnosis).forEach(function(el) {
        var d = diag.diagnosis[el];
        var info = elInfo[el];
        var bg = d.level==='過強'?'rgba(255,215,0,0.08)':d.level==='缺失'?'rgba(158,158,158,0.08)':'rgba(0,0,0,0.05)';
        html += '<div class="wuxing-ring-item">';
        html += '<div class="wuxing-ring-circle" style="border-color:'+info.color+';background:'+bg+';">' + info.icon + '</div>';
        html += '<div class="wuxing-ring-label element-' + el + '">' + el + '</div>';
        html += '<div class="wuxing-ring-level">' + d.count + '次 (' + d.pct + '%)</div>';
        html += '<div class="wuxing-ring-level">' + d.level + '</div>';
        html += '</div>';
      });
      html += '</div>';

      // 等級說明
      html += '<div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:center;font-size:0.7rem;color:var(--color-text-muted);margin-top:8px;">';
      html += '<span>🟢 適中=五行均衡</span><span>🟡 偏弱=稍嫌不足</span><span>🔴 過強=太過旺盛</span><span>⚫ 缺失=完全沒有</span>';
      html += '</div>';

      if (diag.issues.length && isProMode) {
        html += '<p style="font-size:0.8rem;color:var(--color-fortune-neutral);margin-top:8px;">⚠️ ' + diag.issues.join('；') + '</p>';
      }
      if (diag.strengths.length && isProMode) {
        html += '<p style="font-size:0.8rem;color:var(--color-fortune-good);margin-top:4px;">✅ ' + diag.strengths.join('；') + '</p>';
      }
      html += '</div>';

      // 八字 vs 姓名比對
      if (isProMode && r.zodiac && r.zodiac.bazi && r.cn) {
        var compare = window.ZodiacBazi.baziNameCompare(r.zodiac.bazi, r.cn);
        if (compare) {
          var cScore = compare.score >= 85 ? 'var(--color-fortune-great)' : compare.score >= 65 ? 'var(--color-fortune-good)' : compare.score >= 45 ? 'var(--color-fortune-neutral)' : 'var(--color-fortune-bad)';
          html += '<div class="report-section">';
          html += '<div class="report-section-title">🔗 八字 × 姓名比對</div>';
          html += '<div style="text-align:center;margin-bottom:8px;">互補度：<strong style="font-size:1.2rem;color:' + cScore + ';">' + compare.score + '%</strong>（' + compare.level + '）</div>';
          html += '<p style="font-size:0.85rem;color:var(--color-text-secondary);line-height:1.8;">' + compare.reading + '</p>';
          html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;font-size:0.75rem;">';
          var elKeys = ['木','火','土','金','水'];
          elKeys.forEach(function(el) {
            html += '<span style="padding:2px 8px;background:rgba(0,0,0,0.1);border-radius:8px;">' + el + ' 命盤:' + compare.baziElements[el] + ' 名字:' + compare.nameElements[el] + '</span>';
          });
          html += '</div>';
          if (compare.baziMissing.length) html += '<p style="font-size:0.75rem;color:var(--color-fortune-neutral);margin-top:4px;">⚠️ 命盤缺：' + compare.baziMissing.join('、') + '</p>';
          html += '</div>';
        }
      }

      // 大運流年（專業模式+有八字）
      if (isProMode && r.zodiac && r.zodiac.bazi) {
        var dayuns = window.ZodiacBazi.getDaYun(r.zodiac.bazi, r.gender);
        var liunian = window.ZodiacBazi.getLiuNian(r.zodiac.bazi.dayMaster);
        html += '<div class="report-section">';
        html += '<div class="report-section-title">📅 大運流年</div>';
        if (dayuns) {
          html += '<p style="font-size:0.75rem;color:var(--color-text-muted);">十年大運（' + (dayuns.forward ? '順排' : '逆排') + '，' + dayuns.startText + '）：</p>';
          html += '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;">';
          dayuns.forEach(function(dy) {
            html += '<span style="font-size:0.7rem;padding:3px 8px;background:rgba(0,0,0,0.1);border-radius:10px;">' + dy.name + ' <span class="element-' + dy.tgEle + '">' + dy.tgEle + '</span> ' + dy.ages + (dy.startYear ? '（' + dy.startYear + '）' : '') + '</span>';
          });
          html += '</div>';
        } else {
          html += '<p style="font-size:0.75rem;color:var(--color-text-muted);">大運的順逆由性別決定，填入性別即可排出。</p>';
        }
        if (liunian) {
          html += '<p style="font-size:0.85rem;color:var(--color-text-secondary);">📌 ' + liunian.year + '流年：' + liunian.pillar + '（' + liunian.zodiac + '年）— <strong>' + liunian.shiShen + '</strong></p>';
          html += '<p style="font-size:0.8rem;color:var(--color-text-secondary);">' + liunian.tip + '</p>';
        }
        html += '</div>';
      }

      // 喜用神（專業模式才有）；日主強弱由八字扶抑法判定，與寶寶取名共用同一套
      if (isProMode && report.xiYong) {
        var xy = report.xiYong;
        var elems = function(list) { return list.map(function(e) { return '<strong class="element-' + e + '">' + e + '</strong>'; }).join('、'); };
        html += '<div class="report-section">';
        html += '<div class="report-section-title">🔮 喜用神分析</div>';
        html += '<p style="font-size:0.9rem;color:var(--color-text-secondary);">日主：<strong class="element-' + xy.dayMaster + '">' + xy.dayMaster + '</strong>' +
          (xy.dayMasterTG ? '（' + xy.dayMasterTG + '）' : '') + (xy.strength ? '　命格：<strong>' + xy.strength + '</strong>' : '') + '</p>';
        html += '<p style="font-size:0.9rem;color:var(--color-text-secondary);">用神：<strong class="element-' + xy.yong + '">' + xy.yong + '</strong>　喜神：<strong class="element-' + xy.xi + '">' + xy.xi + '</strong></p>';
        if (xy.unfavorable && xy.unfavorable.length) html += '<p style="font-size:0.9rem;color:var(--color-text-secondary);">忌神：' + elems(xy.unfavorable) + '</p>';
        if (xy.missing && xy.missing.length) html += '<p style="font-size:0.9rem;color:var(--color-text-secondary);">八字缺：' + xy.missing.join('、') + '</p>';
        html += '<p style="font-size:0.85rem;color:var(--color-text-secondary);margin-top:8px;">' + xy.analysis + '</p>';
        if (xy.quote) html += '<p class="quote-cell">📜 ' + xy.quote + '</p>';
        html += '</div>';
      }

      // 面相特質
      if (isProMode && r.cn && window.Professional) {
        var face = window.Professional.faceReading(r.cn.grids.ren.element);
        if (face) {
          html += '<div class="report-section">';
          html += '<div class="report-section-title">👁️ 面相特質</div>';
          html += '<p style="font-size:0.8rem;color:var(--color-text-secondary);">依人格五行推演的理想面相特徵：</p>';
          html += '<p style="font-size:0.8rem;color:var(--color-text-secondary);">額頭：' + face.forehead + '</p>';
          html += '<p style="font-size:0.8rem;color:var(--color-text-secondary);">眼睛：' + face.eyes + '</p>';
          html += '<p style="font-size:0.8rem;color:var(--color-text-secondary);">鼻子：' + face.nose + '　嘴巴：' + face.mouth + '</p>';
          html += '<p style="font-size:0.8rem;color:var(--color-text-secondary);">整體：' + face.best + '</p>';
          html += '<p style="font-size:0.8rem;color:var(--color-text-secondary);">髮型穿搭：' + face.style + '</p>';
          html += '</div>';
        }
      }

      // 風水建議（專業模式）
      if (isProMode && r.cn && window.Professional) {
        // 有八字時以用神為準，風水才不會和上面的喜用神互相矛盾
        var fsEl = report.xiYong ? report.xiYong.yong : r.cn.grids.ren.element;
        var fs = window.Professional.fengshuiAdvice(r.cn.grids.ren.element, fsEl);
        if (fs) {
          html += '<div class="report-section">';
          html += '<div class="report-section-title">🏠 風水方位建議</div>';
          html += '<p style="font-size:0.8rem;color:var(--color-text-secondary);">' +
            (report.xiYong ? '依命格用神屬' + fsEl : '人格屬' + fsEl) + '，居家/辦公建議：</p>';
          html += '<p style="font-size:0.8rem;color:var(--color-text-secondary);">🚪 大門朝向：<strong>' + fs.door + '</strong></p>';
          html += '<p style="font-size:0.8rem;color:var(--color-text-secondary);">🛏️ 床頭方向：<strong>' + fs.bed + '</strong></p>';
          html += '<p style="font-size:0.8rem;color:var(--color-text-secondary);">🪑 辦公座位：<strong>' + fs.desk + '</strong></p>';
          html += '<p style="font-size:0.8rem;color:var(--color-text-secondary);">🎨 裝飾建議：<strong>' + fs.decor + '</strong></p>';
          html += '<p style="font-size:0.75rem;color:var(--color-fortune-neutral);">⚠️ 避免：' + fs.avoid + '</p>';
          html += '</div>';
        }
      }

      // 改名建議（專業模式）
      if (isProMode && report.xiYong && report.elementDiagnosis) {
        html += '<div class="report-section">';
        html += '<div class="report-section-title">✏️ 命名建議</div>';
        var elemChars = {
          '木': '林、森、桐、楠、柏、楷、楨、榮、樺、樹、木、禾、竹、柳、栩、桓、桂、桃、梅、梓',
          '火': '炎、煒、煜、燁、熹、照、煥、輝、炫、烜、明、昌、旭、昊、昕、晟、昭、晉、晞、暄',
          '土': '坤、坦、坪、培、基、堂、堅、聖、城、垣、均、圭、垚、堉、墩、壁、壘、圭、垚',
          '金': '金、鈞、銘、鋒、銳、鎧、錦、鈴、釗、錡、鋼、銀、銓、銳、鋒、銘、鈞、鋼、錦',
          '水': '水、泉、浩、涵、淳、清、澤、鴻、源、海、江、河、沛、泳、淵、瀚、濬、瀾、泓'
        };
        var charLine = function(el) {
          return '<p style="font-size:0.8rem;margin:4px 0;"><span class="element-' + el + '">' + el + '：</span>' + (elemChars[el] || '') + '</p>';
        };
        // 主要建議看命格（喜用神），不是看名字自己缺什麼
        var need = report.xiYong.nameMissing || [];
        html += '<p style="font-size:0.85rem;color:var(--color-text-secondary);">依命格宜補<strong>' + report.xiYong.favorable.join('、') +
          '</strong>（用神' + report.xiYong.yong + '、喜神' + report.xiYong.xi + '）：</p>';
        if (need.length === 0) html += '<p style="font-size:0.85rem;color:var(--color-fortune-good);">✅ 名字已帶喜用五行，無須再補。</p>';
        need.forEach(function(el) { html += charLine(el); });
        // 次要：名字本身的五行偏枯（排除已列過的）
        var diag = report.elementDiagnosis;
        var extra = [];
        Object.keys(diag.diagnosis).forEach(function(el) {
          if ((diag.diagnosis[el].level === '缺失' || diag.diagnosis[el].level === '偏弱') && need.indexOf(el) < 0) extra.push(el);
        });
        if (extra.length) {
          html += '<p style="font-size:0.8rem;color:var(--color-text-secondary);margin-top:8px;">名字本身偏弱或從缺的五行（次要）：<strong>' + extra.join('、') + '</strong></p>';
          extra.forEach(function(el) { html += charLine(el); });
        }
        html += '</div>';
      }

      // 易經卦象（專業模式）
      if (isProMode && r.cn && window.IChing && window.DeepReadings) {
        var hex = window.IChing.nameToHexagram(r.cn);
        if (hex) {
          var hexReading = window.DeepReadings.getHexagramDeepReading(hex, r.cn);
          html += '<div class="report-section">';
          html += '<div class="report-section-title">🔮 易經卦象 ' + hex.hexUnicode + '</div>';
          html += '<p style="font-size:0.9rem;color:var(--color-text-secondary);line-height:2;white-space:pre-line;">' + hexReading + '</p>';
          html += '</div>';
        }
      }

      // 綜合評語
      html += '<div class="report-overall">';
      html += '<div class="report-overall-badge" style="color:' + lvlColor + ';border:2px solid ' + lvlColor + ';">' + report.overallLevel + '</div>';
      html += '<p style="font-size:0.95rem;color:var(--color-text-secondary);margin-top:12px;line-height:2;">' + report.overallSummary + '</p>';
      html += '</div>';

      // 操作按鈕
      html += '<div class="report-actions">';
      html += '<button class="btn-download-img copy-report-btn" data-idx="' + idx + '" data-i18n="copyReportBtn">📋 複製報告</button>';
      html += '<button class="btn-download-img speak-report-btn" data-idx="' + idx + '" data-i18n="speakReportBtn">🔊 朗讀報告</button>';
      html += '</div>';

      // 印章
      html += '<div class="report-cert-stamp">姓名和盤<br>命理鑑定</div>';

      html += '</div>';
    });

    if (!html) html = '<div class="empty-state"><div class="empty-state-icon">📜</div><div class="empty-state-text" data-i18n="emptyNeedCn">需要輸入中文姓名</div><div class="empty-state-hint" data-i18n="emptyNeedCnReport">才能產生命理鑑定書</div></div>';

    reportContent.innerHTML = html;

    // 綁定複製報告按鈕
    reportContent.querySelectorAll('.copy-report-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(this.dataset.idx);
        var item = currentData.results[idx];
        if (!item || !item.result.cn) return;
        var report = window.Professional.generateReport(item.person, item.result.cn, item.result.en, item.result.zodiac);
        var text = window.Professional.reportToText(report);
        copyText(text);
        toast('專業報告已複製！（可貼到文件或訊息）');
      });
    });

    // 綁定朗讀報告按鈕
    reportContent.querySelectorAll('.speak-report-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(this.dataset.idx);
        var item = currentData.results[idx];
        if (!item || !item.result.cn) return;
        var card = this.closest('.report-certificate');
        var text = card ? reportCardToSpeech(card)
          : window.Professional.reportToText(window.Professional.generateReport(item.person, item.result.cn, item.result.en, item.result.zodiac));
        speakText(text, '正在朗讀' + item.person.label + '的鑑定書...', this);
      });
    });
  }

  // ============ 開運指南 ============
  var luckyContent = document.getElementById('luckyContent');

  function renderLuckyGuide() {
    if (!luckyContent || !currentData || !window.LuckyItems) {
      if (luckyContent) luckyContent.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💎</div><div class="empty-state-text" data-i18n="emptyNeedCn">需要輸入中文姓名</div></div>';
      return;
    }
    var html = '';
    currentData.results.forEach(function(item, idx) {
      var r = item.result;
      if (!r.cn) return;
      var el = r.cn.grids.ren.element;
      html += '<div class="card" style="margin-bottom:var(--space-lg);">';
      html += '<h2 class="card-title"><span class="title-icon">💎</span>' + item.person.label + ' 開運指南</h2>';
      html += '<p style="font-size:0.9rem;color:var(--color-text-secondary);margin-bottom:12px;">人格屬<strong class="element-' + el + '">' + el + '</strong>，以下是專屬的開運建議：</p>';
      html += window.LuckyItems.generateGuide(el);
      var ld = luckyDaysFor(item);
      if (ld) {
        html += '<div style="margin-top:12px;padding:10px 12px;background:rgba(212,168,67,0.06);border-radius:8px;font-size:0.8rem;color:var(--color-text-secondary);line-height:1.7;">';
        html += '<strong style="color:var(--color-gold-primary);">📅 近期吉日</strong>（喜用' + ld.favorable.join('、') + (ld.unfavorable.length ? '、避忌神' + ld.unfavorable.join('、') : '') + '，不沖生肖與日支）<br>';
        html += ld.list.length
          ? ld.list.slice(0, 6).map(function(e) { return '<span style="white-space:nowrap;">' + e.m + '/' + e.d + ' ' + e.ganzhi + (e.level === '大吉' ? ' <strong style="color:var(--color-gold-light);">大吉</strong>' : ' 吉') + '</span>'; }).join('、')
            + '<br><span style="font-size:0.72rem;color:var(--color-text-muted);">未來 90 天共 ' + ld.list.length + ' 個吉日，可匯出到手機或電腦行事曆，當天早上 8 點提醒</span>'
          : '未來 90 天沒有符合條件的吉日';
        html += '</div>';
      } else {
        html += '<p style="margin-top:10px;font-size:0.75rem;color:var(--color-text-muted);">填入生日即可推算個人吉日並匯出行事曆提醒</p>';
      }
      html += '<div class="report-actions"><button class="btn-download-img speak-guide-btn" data-idx="' + idx + '" data-i18n="speakGuideBtn">🔊 朗讀開運指南</button>'
        + (ld && ld.list.length ? '<button class="btn-download-img ics-btn" data-idx="' + idx + '">📅 匯出吉日提醒（.ics）</button>' : '') + '</div>';
      html += '</div>';
    });
    luckyContent.innerHTML = html || '<div class="empty-state"><div class="empty-state-icon">💎</div><div class="empty-state-text" data-i18n="emptyNeedCnLucky">請輸入中文姓名後分析</div></div>';

    // 綁定吉日 .ics 匯出
    luckyContent.querySelectorAll('.ics-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var item = currentData.results[parseInt(this.dataset.idx)];
        var ld = item && luckyDaysFor(item);
        if (!ld || !ld.list.length) return;
        var name = item.result.cn.parsed.surname + item.result.cn.parsed.givenName;
        var ics = window.LuckyDays.toICS(ld.list, { name: name, xiShen: ld.xiShen });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
        a.download = name + '-吉日.ics';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function() { URL.revokeObjectURL(a.href); }, 1000);
        toast('📅 已下載 ' + ld.list.length + ' 個吉日，開啟檔案即可加入行事曆');
      });
    });

    // 綁定朗讀開運指南按鈕
    luckyContent.querySelectorAll('.speak-guide-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(this.dataset.idx);
        var item = currentData.results[idx];
        if (!item || !item.result.cn) return;
        var el = item.result.cn.grids.ren.element;
        speakText(window.LuckyItems.guideToText(el), '正在朗讀' + item.person.label + '的開運指南...', this);
      });
    });
  }

  // ============ 歷史面板 ============
  var historyPanelContent = document.getElementById('historyPanelContent');

  function renderHistoryPanel() {
    if (!historyPanelContent) return;
    var hist = loadHistory();
    if (!hist.length) {
      historyPanelContent.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">尚無歷史記錄</div><div class="empty-state-hint">分析和盤後到下方點「💾 儲存記錄」即可保存，之後可在此頁籤查看</div></div>';
      return;
    }

    var html = '';
    hist.forEach(function(entry, idx) {
      var time = entry.time ? new Date(entry.time).toLocaleString('zh-TW',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}) : '';
      var members = (entry.persons||[]).map(function(p){return (p.cn||'')+(p.cn&&p.en?' / ':'')+(p.en||'');}).filter(function(s){return s;}).join('、');
      var avg = (entry.pairs||[]).length ? Math.round(entry.pairs.reduce(function(a,b){return a+b.score;},0)/entry.pairs.length) : 0;
      var sc = avg>=80?'var(--color-fortune-great)':avg>=60?'var(--color-fortune-good)':avg>=40?'var(--color-fortune-neutral)':'var(--color-fortune-bad)';

      html += '<div style="background:var(--color-bg-mid);border:1px solid rgba(212,168,67,0.15);border-radius:8px;padding:12px;margin-bottom:8px;">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">';
      html += '<span style="font-size:0.8rem;color:var(--color-text-muted);">' + time + '</span>';
      html += '<span style="font-family:var(--font-en);font-size:1.2rem;font-weight:700;color:' + sc + ';">' + avg + '分</span>';
      html += '</div>';
      html += '<div style="font-size:0.9rem;color:var(--color-gold-light);margin-bottom:8px;">' + members + '</div>';

      // 顯示配對
      if (entry.pairs && entry.pairs.length) {
        html += '<div style="display:flex;gap:8px;flex-wrap:wrap;">';
        entry.pairs.forEach(function(p) {
          var c = p.score>=80?'var(--color-fortune-great)':p.score>=60?'var(--color-fortune-good)':p.score>=40?'var(--color-fortune-neutral)':'var(--color-fortune-bad)';
          html += '<span style="font-size:0.75rem;padding:2px 8px;background:rgba(0,0,0,0.15);border-radius:10px;">' + p.a + '↔' + p.b + ' <strong style="color:'+c+';">' + p.score + '</strong> ' + (p.mode||'') + '</span>';
        });
        html += '</div>';
      }

      // 載入按鈕
      html += '<button class="btn-download-img" style="margin-top:8px;font-size:0.75rem;" data-load-idx="' + idx + '">📥 載入此記錄重新分析</button>';
      html += '</div>';
    });

    // 客戶檔案區
    var profiles = loadProfiles();
    if (profiles.length) {
      html += '<h3 style="color:var(--color-gold-primary);margin:1rem 0 8px;padding-top:1rem;border-top:1px solid rgba(212,168,67,0.15);">💼 客戶檔案</h3>';
      profiles.forEach(function(p, i) {
        var members = (p.persons||[]).map(function(ps){return (ps.cn||'')+(ps.cn&&ps.en?' / ':'')+(ps.en||'');}).filter(function(s){return s;}).join('、');
        var avg = (p.pairs||[]).length ? Math.round(p.pairs.reduce(function(a,b){return a+b.score;},0)/p.pairs.length) : 0;
        html += '<div style="display:flex;align-items:center;gap:8px;padding:8px;border-bottom:1px solid rgba(212,168,67,0.1);">';
        html += '<span style="flex:1;font-size:0.85rem;"><strong style="color:var(--color-gold-light);">' + (p.name||'未命名') + '</strong><br><span style="font-size:0.7rem;color:var(--color-text-secondary);">' + members + '</span></span>';
        html += '<span style="font-size:0.8rem;color:var(--color-text-secondary);">' + avg + '分</span>';
        html += '<button class="btn-download-img" style="font-size:0.7rem;padding:4px 8px;" data-load-profile="'+i+'">📥</button>';
        html += '<button class="btn-download-img" style="font-size:0.7rem;padding:4px 8px;background:rgba(244,67,54,0.1);border-color:rgba(244,67,54,0.3);" data-del-profile="'+i+'">🗑️</button>';
        html += '</div>';
      });
    }

    historyPanelContent.innerHTML = html;

    // 客戶檔案按鈕事件
    historyPanelContent.querySelectorAll('[data-load-profile]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(this.dataset.loadProfile);
        var p = loadProfiles()[idx];
        if (!p || !p.persons) return;
        fillForm(p.persons);
        handleAnalyze();
        toast('已載入：' + (p.name||''));
      });
    });
    // 刪除按鈕
    historyPanelContent.querySelectorAll('[data-del-profile]').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var idx = parseInt(this.dataset.delProfile);
        var profiles = loadProfiles();
        var name = profiles[idx] ? profiles[idx].name : '';
        if (confirm('刪除「' + name + '」？')) {
          profiles.splice(idx, 1);
          localStorage.setItem('name-harmony-profiles', JSON.stringify(profiles));
          renderHistoryPanel();
          toast('已刪除');
        }
      });
    });

    // 載入按鈕事件
    historyPanelContent.querySelectorAll('[data-load-idx]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(this.dataset.loadIdx);
        var entry = loadHistory()[idx];
        if (!entry || !entry.persons) return;
        fillForm(entry.persons);
        handleAnalyze();
        switchTab('members');
        toast('已載入並重新分析！');
      });
    });
  }

  // ============ 迷你雷達圖 ============
  function renderMiniRadar(dimensions) {
    var w = 200, h = 160, cx = w/2, cy = h/2, r = 55;
    var count = dimensions.length;
    var html = '<svg width="' + w + '" height="' + h + '" style="display:block;margin:0 auto;">';
    // 背景網格
    for (var level = 1; level <= 3; level++) {
      var pts = [];
      for (var i = 0; i < count; i++) {
        var angle = (Math.PI * 2 / count) * i - Math.PI / 2;
        var lr = r * level / 3;
        pts.push((cx + lr * Math.cos(angle)).toFixed(1) + ',' + (cy + lr * Math.sin(angle)).toFixed(1));
      }
      html += '<polygon points="' + pts.join(' ') + '" fill="none" stroke="rgba(212,168,67,0.2)" stroke-width="1"/>';
    }
    // 軸線
    for (var i = 0; i < count; i++) {
      var angle = (Math.PI * 2 / count) * i - Math.PI / 2;
      html += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + r * Math.cos(angle)).toFixed(1) + '" y2="' + (cy + r * Math.sin(angle)).toFixed(1) + '" stroke="rgba(212,168,67,0.15)" stroke-width="1"/>';
    }
    // 數據多邊形
    var dataPts = [];
    for (var i = 0; i < count; i++) {
      var angle = (Math.PI * 2 / count) * i - Math.PI / 2;
      var pct = Math.max(0.1, dimensions[i].score / dimensions[i].max);
      var lr = r * pct;
      dataPts.push((cx + lr * Math.cos(angle)).toFixed(1) + ',' + (cy + lr * Math.sin(angle)).toFixed(1));
    }
    html += '<polygon points="' + dataPts.join(' ') + '" fill="rgba(212,168,67,0.2)" stroke="var(--color-gold-primary)" stroke-width="2"/>';
    // 標籤
    for (var i = 0; i < count; i++) {
      var angle = (Math.PI * 2 / count) * i - Math.PI / 2;
      var lx = cx + (r + 20) * Math.cos(angle);
      var ly = cy + (r + 20) * Math.sin(angle);
      var label = dimensions[i].label.replace(/[🎭🎯🏠🌐🔢🩸🐉🌿💖🎪📏]/g,'').substring(0,2);
      html += '<text x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '" text-anchor="middle" font-size="9" fill="var(--color-text-secondary)">' + label + '</text>';
    }
    html += '</svg>';
    return '<div style="float:right;margin-left:12px;">' + html + '</div>';
  }

  // ============ 智能總結 ============
  function renderSmartSummary() {
    if (!currentData || !window.SmartInsights) return '';
    var html = '';
    currentData.results.forEach(function(item) {
      var r = item.result;
      var one = window.SmartInsights.oneLiner(r.cn, r.en, r.zodiac);
      var pc = window.SmartInsights.prosAndCons(r.cn);

      html += '<div class="fortune-detail" style="margin-bottom:var(--space-md);border-left:3px solid var(--color-gold-primary);">';
      html += '<h3 style="margin-bottom:4px;">' + item.person.label + '</h3>';
      html += '<p style="font-size:0.9rem;color:var(--color-gold-light);line-height:1.8;">💬 ' + one + '</p>';

      if (pc) {
        if (pc.pros.length) {
          html += '<div style="margin-top:8px;">';
          pc.pros.forEach(function(p) {
            html += '<p style="font-size:0.8rem;color:var(--color-fortune-good);margin:2px 0;">✅ ' + p + '</p>';
          });
          html += '</div>';
        }
        if (pc.cons.length) {
          html += '<div style="margin-top:4px;">';
          pc.cons.forEach(function(c) {
            html += '<p style="font-size:0.8rem;color:var(--color-fortune-neutral);margin:2px 0;">⚠️ ' + c + '</p>';
          });
          html += '</div>';
        }
      }

      // 行動建議
      var actions = window.SmartInsights.actionCard(r.cn, r.zodiac);
      if (actions.length) {
        html += '<p style="font-size:0.8rem;color:var(--color-text-secondary);margin-top:6px;">💡 建議：' + actions.slice(0,3).join('；') + '</p>';
      }

      html += '</div>';
    });
    return html;
  }

  // ============ 結果摘要卡 ============
  function renderSummaryCard() {
    if (!currentData || !currentData.results) return '';
    var r = currentData.results;
    if (r.length === 0) return '';

    var html = '<div class="summary-card">';
    html += '<h3>📊 分析摘要</h3>';
    html += '<div class="summary-quick-stats">';
    html += '<div class="summary-stat"><div class="summary-stat-val" style="color:var(--color-gold-light);">' + r.length + '</div><div class="summary-stat-label">成員數</div></div>';
    html += '<div class="summary-stat"><div class="summary-stat-val" style="color:var(--color-gold-light);">' + currentData.pairs.length + '</div><div class="summary-stat-label">配對組數</div></div>';

    if (currentData.pairs.length > 0) {
      var avg = Math.round(currentData.pairs.reduce(function(a,b){return a+b.pair.score;},0) / currentData.pairs.length);
      var ac = avg>=80?'var(--color-fortune-great)':avg>=60?'var(--color-fortune-good)':'var(--color-fortune-neutral)';
      html += '<div class="summary-stat"><div class="summary-stat-val" style="color:'+ac+';">' + avg + '</div><div class="summary-stat-label">平均分數</div></div>';
    }
    html += '</div></div>';
    return html;
  }

  // ============ 姓名生成器 UI ============
  function genCardsHtml(names) {
    if (!names || !names.length) {
      return '<p style="font-size:0.75rem;color:var(--color-text-secondary);">這個姓氏暫時找不到合適的吉數組合，換個性別或稍後再試。</p>';
    }
    var html = '';
    names.slice(0, 6).forEach(function(n) {
      if (!n.name) return;
      var fc = n.goodCount >= 4 ? 'var(--color-fortune-great)' : 'var(--color-fortune-good)';
      html += '<div class="gen-name-card" onclick="document.getElementById(\'cnA\').value=\'' + n.name + '\';document.getElementById(\'cnB\').focus();window.scrollTo({top:0,behavior:\'smooth\'});var t=document.createElement(\'div\');t.className=\'share-toast\';t.textContent=\'已填入：' + n.name + '\';document.body.appendChild(t);setTimeout(function(){t.remove();},2000);">';
      html += '<div class="gen-name-text">' + n.name + '</div>';
      html += '<div class="gen-name-info">人格' + n.grids.ren + ' ' + n.element + ' <span style="color:' + fc + ';">' + n.goodCount + '吉</span></div>';
      html += '<div class="gen-name-strokes">天' + n.grids.tian + ' 地' + n.grids.di + ' 外' + n.grids.wai + ' 總' + n.grids.zong + '</div>';
      html += '</div>';
    });
    return html;
  }

  function renderNameGeneratorUI() {
    if (!currentData || !currentData.results) return '';
    // 找到第一個有中文姓名的成員的姓氏
    var surname = '';
    currentData.results.some(function(r) {
      if (r.result.cn && r.result.cn.parsed) {
        surname = r.result.cn.parsed.surname;
        return true;
      }
      return false;
    });
    if (!surname || !window.NameGenerator) return '';

    var names = window.NameGenerator.suggestNames(surname, genGender || 'unisex');
    // 姓氏有字不在筆劃庫時 suggestNames 會回傳帶 note 的結果，此時整個區塊不顯示
    if (names && names.length && names[0].note) return '';

    var html = '<div class="fortune-detail" id="genBlock" data-surname="' + surname + '" style="margin-bottom:var(--space-lg);">';
    html += '<h3>🎯 吉數姓名推薦（姓氏：' + surname + '）</h3>';
    html += '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;">';
    html += '<select id="genGender" class="form-input" style="width:auto;padding:4px 8px;font-size:0.75rem;">'
      + '<option value=""' + (genGender === '' ? ' selected' : '') + '>全部</option>'
      + '<option value="male"' + (genGender === 'male' ? ' selected' : '') + '>男</option>'
      + '<option value="female"' + (genGender === 'female' ? ' selected' : '') + '>女</option></select>';
    html += '<button id="genRefresh" class="btn-download-img" style="font-size:0.75rem;">🔄 換一批</button>';
    html += '</div>';
    html += '<p style="font-size:0.75rem;color:var(--color-text-secondary);margin-bottom:8px;">確保<strong>人格（主運）為吉數</strong>，點擊名字可填入甲方：</p>';
    html += '<div class="generator-results" id="genResults">' + genCardsHtml(names) + '</div>';
    html += '</div>';
    return html;
  }

  /** 性別選單與「換一批」：重抽吉數名字，只換結果區塊，不用重繪整頁 */
  function refreshGenResults() {
    var block = document.getElementById('genBlock');
    var box = document.getElementById('genResults');
    if (!block || !box || !window.NameGenerator) return;
    box.innerHTML = genCardsHtml(window.NameGenerator.suggestNames(block.dataset.surname, genGender || 'unisex'));
  }

  function wireNameGenerator() {
    var genderSel = document.getElementById('genGender');
    var refreshBtn = document.getElementById('genRefresh');
    if (genderSel) genderSel.addEventListener('change', function() {
      genGender = genderSel.value;
      refreshGenResults();
    });
    if (refreshBtn) refreshBtn.addEventListener('click', refreshGenResults);
  }

  // ============ 五行說明卡 ============
  function renderElementLegend() {
    var elInfo = {
      '木': { icon:'🌳', nature:'生長、創意、仁慈', body:'肝膽', direction:'東方', season:'春天', color: 'var(--color-wuxing-wood)' },
      '火': { icon:'🔥', nature:'熱情、行動、禮儀', body:'心臟', direction:'南方', season:'夏天', color: 'var(--color-wuxing-fire)' },
      '土': { icon:'⛰️', nature:'穩定、誠信、包容', body:'脾胃', direction:'中央', season:'長夏', color: 'var(--color-wuxing-earth)' },
      '金': { icon:'⚔️', nature:'果斷、正義、剛毅', body:'肺', direction:'西方', season:'秋天', color: 'var(--color-wuxing-metal)' },
      '水': { icon:'💧', nature:'智慧、靈活、溝通', body:'腎', direction:'北方', season:'冬天', color: 'var(--color-wuxing-water)' }
    };
    var cycle = '🌳木生🔥火 → 🔥火生⛰️土 → ⛰️土生⚔️金 → ⚔️金生💧水 → 💧水生🌳木';
    var clash = '🌳木剋⛰️土 → ⛰️土剋💧水 → 💧水剋🔥火 → 🔥火剋⚔️金 → ⚔️金剋🌳木';

    var html = '<details style="margin:12px 0;font-size:0.85rem;">';
    html += '<summary style="color:var(--color-gold-primary);cursor:pointer;font-weight:600;">📖 五行是什麼？點擊展開說明</summary>';
    html += '<div style="margin-top:8px;padding:12px;background:rgba(212,168,67,0.05);border-radius:8px;">';
    html += '<p style="font-size:0.8rem;color:var(--color-text-secondary);margin-bottom:8px;">姓名學中每個數字尾數對應一個五行屬性。五格（天/人/地/外/總）各有五行，組合起來可以看出你的命理特質。</p>';
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;margin-bottom:8px;">';
    Object.keys(elInfo).forEach(function(el) {
      var info = elInfo[el];
      html += '<div style="padding:6px 10px;background:rgba(0,0,0,0.1);border-radius:6px;">';
      html += '<span style="font-size:1.1rem;">' + info.icon + '</span> ';
      html += '<strong style="color:' + info.color + ';">' + el + '</strong>';
      html += '<span style="font-size:0.7rem;color:var(--color-text-secondary);"> — ' + info.nature + '</span>';
      html += '<div style="font-size:0.65rem;color:var(--color-text-muted);">臟腑:' + info.body + ' | 方位:' + info.direction + ' | 季節:' + info.season + '</div>';
      html += '</div>';
    });
    html += '</div>';
    html += '<p style="font-size:0.75rem;color:var(--color-fortune-good);">✅ <strong>相生（好）</strong>：' + cycle + '</p>';
    html += '<p style="font-size:0.75rem;color:var(--color-fortune-bad);">⚠️ <strong>相剋（衝突）</strong>：' + clash + '</p>';
    html += '<p style="font-size:0.7rem;color:var(--color-text-muted);margin-top:4px;">當你的名字五行分佈不均（某個過強或缺失），可以透過改名、配戴飾品、選擇有利方位來平衡。</p>';
    html += '</div></details>';
    return html;
  }

  // ============ 團隊角色建議 ============
  function renderTeamRoles() {
    if (!currentData || currentData.results.length < 2) return '';

    var roles = {
      '木': { role: '🌳 創新策劃', desc: '木屬性成員適合擔任創意發想、策略規劃的角色。他們有遠見、敢創新，能為團隊開創新局。' },
      '火': { role: '🔥 行動推動', desc: '火屬性成員是天生的行動派與激勵者。適合帶領執行、對外發言、凝聚士氣。' },
      '土': { role: '⛰️ 穩定執行', desc: '土屬性成員是最可靠的執行者。適合負責專案管理、品質控管、後勤支援。' },
      '金': { role: '⚔️ 決策判斷', desc: '金屬性成員果斷明快，適合做關鍵決策、資源分配、風險評估。' },
      '水': { role: '💧 溝通協調', desc: '水屬性成員善於溝通與傾聽。適合擔任對內對外的協調者、資訊整合者。' }
    };

    // 收集每個成員的五行角色
    var memberRoles = [];
    currentData.results.forEach(function(item) {
      var el = item.result.cn ? item.result.cn.grids.ren.element : null;
      if (el && roles[el]) {
        memberRoles.push({ label: item.person.label, element: el, role: roles[el] });
      }
    });

    if (memberRoles.length < 2) return '';

    var html = '<div class="fortune-detail" style="margin-top:var(--space-lg);">';
    html += '<h3>👥 團隊角色建議</h3>';
    html += '<p style="font-size:0.85rem;color:var(--color-text-secondary);margin-bottom:12px;">根據每位成員的五行屬性，以下是建議的團隊分工：</p>';

    memberRoles.forEach(function(mr) {
      html += '<div class="team-pair-card" style="border-left-color:var(--color-wuxing-' + mr.element + ');cursor:default;">';
      html += '<div class="team-pair-rank element-' + mr.element + '">' + mr.element + '</div>';
      html += '<div class="team-pair-info"><div class="team-pair-names">' + mr.label + '：' + mr.role.role + '</div>';
      html += '<div class="team-pair-detail">' + mr.role.desc + '</div></div></div>';
    });

    // 缺失元素提醒
    var presentElements = {};
    memberRoles.forEach(function(mr) { presentElements[mr.element] = true; });
    var allElements = ['木','火','土','金','水'];
    var missing = allElements.filter(function(el) { return !presentElements[el]; });
    if (missing.length > 0) {
      html += '<p style="font-size:0.8rem;color:var(--color-fortune-neutral);margin-top:8px;">⚠️ 團隊缺少 ' + missing.join('、') + ' 屬性，可考慮招募具備這些特質的成員來補足。</p>';
    }

    html += '</div>';
    return html;
  }

  // ============ 分享 ============
  function buildShareText() {
    if (!currentData) return '';
    var lines = ['🔮 姓名和盤團隊分析'];
    currentData.results.forEach(function(item) {
      lines.push(item.person.label + ': ' + (item.person.cn||'') + (item.person.cn&&item.person.en?' / ':'') + (item.person.en||''));
    });
    lines.push('');
    var scores = currentData.pairs.map(function(p){return p.pair.score;});
    if (scores.length) {
      var avg = Math.round(scores.reduce(function(a,b){return a+b;},0)/scores.length);
      lines.push('團隊均分: ' + avg + '/100 [' + window.PairHarmony.getTier(avg) + ']');
      lines.push('共 ' + currentData.results.length + ' 人，' + currentData.pairs.length + ' 組配對');
    }
    lines.push('— 姓名和盤');
    return lines.join('\n');
  }

  function handleShare() {
    if (!currentData) return;
    var text = buildShareText();
    if (navigator.share) navigator.share({title:'姓名和盤',text:text}).catch(function(){});
    else copyText(text);
  }

  /** 個人吉日：需要八字（生日）與鑑定書的喜用神 */
  function luckyDaysFor(item) {
    var r = item.result, z = r.zodiac;
    if (!window.LuckyDays || !window.Professional || !r.cn || !z || !z.pillars) return null;
    var report = window.Professional.generateReport(item.person, r.cn, r.en, z);
    if (!report || !report.xiYong) return null;
    var xy = report.xiYong;
    return {
      xiShen: xy.xiShen,          // 主要喜用（用神）：顯示與幸運色用
      jiShen: xy.jiShen,
      favorable: xy.favorable, unfavorable: xy.unfavorable,
      // 吉日以完整的用神＋喜神、忌神全列篩選
      list: window.LuckyDays.find({ xiShen: xy.favorable, jiShen: xy.unfavorable, yearDZ: z.pillars[0].dz, dayDZ: z.pillars[2].dz }, new Date(), 90)
    };
  }

  /** 把畫面上的鑑定書轉成適合朗讀的文字：表格唸成「欄位 值」，略過按鈕與印章 */
  function reportCardToSpeech(card) {
    var box = card.cloneNode(true);
    box.querySelectorAll('.report-actions, .report-cert-stamp, button').forEach(function(el) { el.remove(); });
    // 五行環：每個五行合成一句「木 1次 (20%) 偏弱」
    box.querySelectorAll('.wuxing-ring-item').forEach(function(it) {
      var p = document.createElement('p');
      p.textContent = [].slice.call(it.querySelectorAll('.wuxing-ring-label, .wuxing-ring-level')).map(function(el) { return el.textContent.trim(); }).join(' ') + '。';
      it.parentNode.replaceChild(p, it);
    });
    box.querySelectorAll('table').forEach(function(t) {
      var rows = [].slice.call(t.rows).map(function(tr) { return [].slice.call(tr.cells).map(function(c) { return c.textContent.trim(); }); });
      var head = t.rows[0] && t.rows[0].querySelector('th') ? rows.shift() : null;
      var spoken = rows.map(function(cells) {
        return cells.map(function(v, i) { return head && head[i] ? head[i] + ' ' + v : v; }).join('，');
      }).join('。');
      var p = document.createElement('p'); p.textContent = spoken + '。';
      t.parentNode.replaceChild(p, t);
    });
    // innerText 需要元素已排版：暫時放到畫面外
    box.style.cssText = 'position:absolute;left:-9999px;top:0;width:600px;';
    document.body.appendChild(box);
    var text = box.innerText;
    box.remove();
    return text;
  }

  var ttsActiveBtn = null, ttsLabel = '';
  function ttsReset() {
    if (ttsActiveBtn) { ttsActiveBtn.innerHTML = ttsLabel; ttsActiveBtn = null; }
  }

  /**
   * 語音朗讀：清除 emoji／符號後分句排入佇列（Chrome 單段過長會中途停止）
   * 傳入 btn 時，朗讀中按鈕變成「停止」，再按一次即停止
   */
  function speakText(text, statusMsg, btn) {
    if (!text) return;
    if (!('speechSynthesis' in window)) { toast('您的瀏覽器不支援語音朗讀'); return; }
    var synth = window.speechSynthesis;
    var wasSame = btn && btn === ttsActiveBtn;
    synth.cancel();
    ttsReset();
    if (wasSame) { toast('⏹ 已停止朗讀'); return; }

    // 移除emoji、box-drawing符號等不利朗讀的字元，保留中英文/數字/標點
    var clean = text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}─-╿]/gu, ' ').replace(/\.{3}|…+/g, ' ');
    var chunks = [];
    clean.split(/\n+/).forEach(function(line) {
      line = line.replace(/\s{2,}/g, ' ').replace(/^[\s，、]+/, '').trim();
      if (!line) return;
      // 句末標點後的右引號、右括號跟著前一句，不單獨成段
      (line.match(/[^。！？；]+[。！？；]*[」』）)]*/g) || []).forEach(function(s) {
        s = s.replace(/^[\s，、。]+/, '');
        s = s.trim();
        while (s.length > 120) { chunks.push(s.slice(0, 120)); s = s.slice(120); }
        if (s) chunks.push(s);
      });
    });
    if (!chunks.length) return;

    if (btn) { ttsActiveBtn = btn; ttsLabel = btn.innerHTML; btn.innerHTML = '⏹ 停止朗讀'; }
    var mine = btn || {};
    chunks.forEach(function(s, i) {
      var u = new SpeechSynthesisUtterance(s);
      u.lang = 'zh-TW'; u.rate = 0.9;
      if (i === chunks.length - 1) u.onend = function() { if (ttsActiveBtn === mine) ttsReset(); };
      synth.speak(u);
    });
    toast('🔊 ' + (statusMsg || '正在朗讀...'));
  }

  function copyText(text) {
    if (navigator.clipboard) { navigator.clipboard.writeText(text).then(function(){toast('已複製！');}); return; }
    var ta = document.createElement('textarea'); ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
    document.body.removeChild(ta); toast('已複製！');
  }

  function toast(msg) {
    var t = document.querySelector('.share-toast'); if(t) t.remove();
    t = document.createElement('div'); t.className = 'share-toast'; t.textContent = msg;
    document.body.appendChild(t); setTimeout(function(){t.remove();}, 3000);
  }

  // ============ 儲存 ============
  function savedPerson(p) {
    return { cn: p.cn, en: p.en, blood: p.blood || '', birthday: p.birthday || '', gender: p.gender || '', place: p.place || '' };
  }

  /** 把存檔的成員資料填回表單（姓名、生日、時間、性別、出生地、血型），多出的成員自動新增 */
  function fillForm(persons) {
    extraPersons.innerHTML = '';
    extraCount = 0;
    // 注意：不能用 :nth-of-type，兩區之間的「和」分隔線也是 div
    var sections = document.querySelectorAll('#formSection .person-section');
    (persons || []).forEach(function(p, i) {
      var scope;
      if (i < 2) {
        scope = sections[i];
        document.getElementById(i === 0 ? 'cnA' : 'cnB').value = p.cn || '';
        document.getElementById(i === 0 ? 'enA' : 'enB').value = p.en || '';
      } else {
        scope = addPerson();
        if (!scope) return;
        scope.querySelector('.cn-input').value = p.cn || '';
        scope.querySelector('.en-input').value = p.en || '';
      }
      if (!scope) return;
      var parts = (p.birthday || '').split(' ');
      var set = function(sel, v) { var el = scope.querySelector(sel); if (el) el.value = v || ''; };
      set('.bday-input', parts[0]);
      set('.btime-input', parts[1]);
      set('.gender-input', p.gender);
      set('.blood-input', p.blood);
      writePlace(scope, p.place);
    });
    updateAddBtn();
  }

  function handleSave() {
    if (!currentData) return;
    var entry = {
      persons: currentData.results.map(function(r){ return savedPerson(r.person); }),
      pairs: currentData.pairs.map(function(p){ return {a:p.a,b:p.b,mode:p.pair.mode,score:p.pair.score,tier:p.pair.tier}; }),
      time: new Date().toISOString()
    };
    var hist = loadHistory();
    hist.unshift(entry); if (hist.length > 20) hist = hist.slice(0, 20);
    try { localStorage.setItem('name-harmony-v3', JSON.stringify(hist)); toast('已儲存！'); }
    catch(e) { toast('儲存失敗'); }
  }

  // ========== 客戶存檔 ==========
  function saveProfile() {
    if (!currentData) return;
    var profiles = loadProfiles();
    var entry = {
      name: prompt('請為這份檔案命名（例：客戶張先生）', '') || ('未命名_' + new Date().toLocaleDateString()),
      time: new Date().toISOString(),
      persons: currentData.results.map(function(r) {
        return savedPerson(r.person);
      }),
      pairs: currentData.pairs.map(function(p) {
        return { a: p.a, b: p.b, mode: p.pair.mode, score: p.pair.score, tier: p.pair.tier };
      })
    };
    if (!entry.name) return;
    profiles.unshift(entry);
    if (profiles.length > 50) profiles = profiles.slice(0, 50);
    try {
      localStorage.setItem('name-harmony-profiles', JSON.stringify(profiles));
      toast('已存檔：' + entry.name);
      profileBtn.querySelector('span').textContent = '✅';
      setTimeout(function() { profileBtn.querySelector('span').textContent = '💼'; }, 1500);
    } catch(e) { toast('存檔失敗'); }
  }

  function loadProfiles() {
    try { return JSON.parse(localStorage.getItem('name-harmony-profiles') || '[]'); } catch(e) { return []; }
  }

  // ============ 每日運勢推播 ============
  function checkDailyFortune() {
    if (!('Notification' in window)) return;
    var todayStr = new Date().toDateString();
    if (localStorage.getItem('daily-fortune-shown') === todayStr) return;

    if (Notification.permission === 'granted') {
      showDailyFortuneNotification(todayStr);
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then(function(p) {
        if (p === 'granted') showDailyFortuneNotification(todayStr);
      });
    }
  }

  function showDailyFortuneNotification(todayStr) {
    var body = '打開 APP 查看今日幸運色、方位與數字。';
    try {
      var profiles = loadProfiles();
      var p = profiles[0];
      if (p && p.persons && p.persons[0] && window.FunExtras) {
        var r = analyzeOne(p.persons[0]);
        if (r && !r.error && !r.needsManual && r.en) {
          var el = r.cn ? r.cn.grids.ren.element : '?';
          var df = window.FunExtras.getDailyFortune(r.en.destiny, el);
          body = df.starDisplay + ' 幸運色' + df.color + ' · 幸運方位' + df.direction + ' · 幸運數字' + df.number;
        }
      }
    } catch (e) {}
    new Notification('🔮 姓名和盤 · 今日運勢', { body: body, icon: 'img/icon-192.png' });
    localStorage.setItem('daily-fortune-shown', todayStr);
  }

  function loadHistory() {
    try { return JSON.parse(localStorage.getItem('name-harmony-v3') || '[]'); } catch(e) { return []; }
  }

  // ============ 示範資料 ============
  // ========== 名字PK ==========
  function runNamePK() {
    var surname = document.getElementById('pkSurname').value.trim();
    var namesStr = document.getElementById('pkNames').value.trim();
    if (!surname || !namesStr) { toast('請輸入姓氏和備選名字'); return; }
    var names = namesStr.split(/[,，\s]+/).filter(function(n){return n;});
    if (!names.length || !window.SmartInsights) return;

    var results = window.SmartInsights.rankNames(surname, names);
    if (!results.length) { toast('無法分析，請確認名字格式'); return; }

    var html = '<div style="margin-top:8px;">';
    results.forEach(function(r, i) {
      var medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':'';
      var gloryColor = r.renGlory==='大吉'?'var(--color-fortune-great)':r.renGlory==='吉'?'var(--color-fortune-good)':'var(--color-fortune-neutral)';
      html += '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(212,168,67,0.1);">';
      html += '<span style="font-size:1.2rem;">'+medal+'</span>';
      html += '<span style="font-family:var(--font-heading);font-size:1.1rem;color:var(--color-gold-light);flex:1;">'+r.name+'</span>';
      html += '<span style="font-family:var(--font-en);font-weight:700;color:var(--color-gold-light);">'+r.score+'分</span>';
      html += '<span style="font-size:0.75rem;color:'+gloryColor+';">'+r.ren+'('+r.renGlory+')</span>';
      html += '<span style="font-size:0.7rem;color:var(--color-text-secondary);">'+r.sancai+'</span>';
      html += '</div>';
    });
    html += '</div>';
    document.getElementById('pkResults').innerHTML = html;
  }

  function loadDemo() {
    document.getElementById('cnA').value = '陳小明';
    document.getElementById('enA').value = 'John Smith';
    document.getElementById('cnB').value = '林小美';
    document.getElementById('enB').value = 'Mary Jane';
    // 生日示範
    var inputs = document.querySelectorAll('.bday-input');
    if (inputs[0]) inputs[0].value = '1990-06-15';
    var times = document.querySelectorAll('.btime-input');
    if (times[0]) times[0].value = '08:30';
    var genders = document.querySelectorAll('.gender-input');
    if (genders[0]) genders[0].value = 'male';
    if (genders[1]) genders[1].value = 'female';
    if (inputs[1]) inputs[1].value = '1992-03-20';
    toast('示範資料已載入！點擊「開始團隊和盤分析」查看');
  }

  function showLoading() { if (loadingOverlay) loadingOverlay.classList.remove('hidden'); }
  function hideLoading() { if (loadingOverlay) loadingOverlay.classList.add('hidden'); }

  function handleBack() {
    showForm();
    currentData = null;
    manualStrokes = {};
    genGender = '';
    extraPersons.innerHTML = '';
    extraCount = 0;
    updateAddBtn();
  }

  // ============ 配對詳情彈窗 ============
  function openPairDetail(aLabel, bLabel) {
    if (!currentData) return;
    var key = aLabel + '|' + bLabel;
    var rev = bLabel + '|' + aLabel;
    var entry = null;
    currentData.pairs.forEach(function(p) {
      var k = p.a + '|' + p.b;
      if (k === key || k === rev) entry = p;
    });
    if (!entry) return;

    var p = entry.pair;
    var sc = p.score >= 80 ? 'var(--color-fortune-great)' : p.score >= 60 ? 'var(--color-fortune-good)' : p.score >= 40 ? 'var(--color-fortune-neutral)' : 'var(--color-fortune-bad)';

    modalTitle.innerHTML = '<span class="title-icon">💫</span>' + entry.a + ' ↔ ' + entry.b;

    var html = '<span class="analysis-mode-badge '+p.modeClass+'" style="margin-bottom:1rem;">'+p.mode+'</span>';
    html += '<div style="text-align:center;margin:1rem 0;">';
    html += '<div class="pair-score-ring" style="border-color:'+sc+';box-shadow:0 0 30px '+sc+'33;margin:0 auto;"><span class="pair-score-value" style="color:'+sc+';">'+p.score+'</span><span class="pair-score-label">/100</span></div>';
    html += '<div class="pair-tier" style="color:'+sc+';">'+p.tier+'</div>';
    html += '<p style="color:var(--color-text-secondary);font-size:0.9rem;">'+p.tierDesc+'</p></div>';

    if (p.dimensions && p.dimensions.length) {
      html += '<div class="pair-dimensions">';
      p.dimensions.forEach(function(d) {
        var pct = Math.round(d.score/d.max*100);
        var fc = pct>=80?'var(--color-fortune-great)':pct>=60?'var(--color-fortune-good)':pct>=40?'var(--color-fortune-neutral)':'var(--color-fortune-bad)';
        html += '<div class="pair-dim-item"><div class="pair-dim-label">'+d.label+'</div>';
        html += '<div class="pair-dim-score">'+d.score+'<span style="font-size:0.75rem;opacity:0.5;">/'+d.max+'</span></div>';
        html += '<div class="pair-dim-bar"><div class="pair-dim-fill" style="width:'+pct+'%;background:'+fc+';"></div></div>';
        html += '<p style="font-size:0.75rem;color:var(--color-text-secondary);margin-top:4px;">'+d.detail+'</p></div>';
      });
      html += '</div>';
    }

    // 豐富解讀
    if (p.reading && p.reading.summary) {
      html += '<div class="harmony-advice" style="margin-top:var(--space-lg);">';
      html += '<h3>📖 詳細解讀</h3>';
      html += '<p style="font-size:0.9rem;line-height:2;white-space:pre-line;">' + p.reading.summary + '</p>';
      html += '</div>';
    }

    if (p.isSelf && p.selfResult) {
      var h = p.selfResult;
      html += '<div class="harmony-details">';
      var ds = [{l:'🌿 五行互補',s:h.details.elementComplement.score,m:h.details.elementComplement.max,d:h.details.elementComplement.detail},{l:'🔢 數字共振',s:h.details.numberResonance.score,m:h.details.numberResonance.max,d:h.details.numberResonance.detail},{l:'☯ 陰陽平衡',s:h.details.yinYang.score,m:h.details.yinYang.max,d:h.details.yinYang.detail},{l:'📊 完整度',s:h.details.completeness.score,m:h.details.completeness.max,d:h.details.completeness.detail}];
      ds.forEach(function(dd) {
        html+='<div class="harmony-item"><div><span class="harmony-item-label">'+dd.l+'</span><p style="font-size:0.8rem;">'+dd.d+'</p></div><span class="harmony-item-score">'+dd.s+'/'+dd.m+'</span></div>';
      });
      html += '</div>';
    }

    modalBody.innerHTML = html;
    pairModal.classList.remove('hidden');
  }

  // ============ 歷史記錄檢視 ============
  function openHistory() {
    renderHistoryList();
    historyModal.classList.remove('hidden');
  }

  function renderHistoryList() {
    var hist = loadHistory();
    if (!hist.length) {
      historyList.innerHTML = '<div class="history-empty">尚無歷史記錄<br><span style="font-size:0.8rem;">分析和盤後點擊「💾 儲存記錄」即可儲存</span></div>';
      return;
    }
    var html = '';
    hist.forEach(function(entry, idx) {
      var members = entry.persons.map(function(p) { return (p.cn||'') + (p.cn&&p.en?' / ':'') + (p.en||''); }).filter(function(s){return s;}).join('、');
      var avg = entry.pairs.length ? Math.round(entry.pairs.reduce(function(a,b){return a+b.score;},0)/entry.pairs.length) : 0;
      var sc = avg>=80?'var(--color-fortune-great)':avg>=60?'var(--color-fortune-good)':avg>=40?'var(--color-fortune-neutral)':'var(--color-fortune-bad)';
      var time = entry.time ? new Date(entry.time).toLocaleString('zh-TW',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '';
      html += '<div class="history-entry" data-idx="'+idx+'">';
      html += '<div class="history-entry-names"><div class="history-entry-members">'+members+'</div><div style="font-size:0.7rem;color:var(--color-text-muted);">'+entry.pairs.length+' 組配對</div></div>';
      html += '<div class="history-entry-meta"><div class="history-entry-score" style="color:'+sc+';">'+avg+'</div><div class="history-entry-time">'+time+'</div></div>';
      html += '</div>';
    });
    historyList.innerHTML = html;

    // 點擊恢復
    historyList.querySelectorAll('.history-entry').forEach(function(el) {
      el.addEventListener('click', function() {
        var idx = parseInt(this.dataset.idx);
        var entry = loadHistory()[idx];
        if (!entry) return;
        fillForm(entry.persons);
        historyModal.classList.add('hidden');
        toast('已載入記錄，點擊「開始團隊和盤分析」重新分析');
      });
    });
  }

  // ============ 匯出圖片 ============
  function exportImage() {
    if (!currentData) return;
    // 簡單文字匯出（較可靠）
    var lines = ['🔮 姓名和盤團隊報告', '═'.repeat(30), ''];
    currentData.results.forEach(function(r) {
      lines.push('【' + r.person.label + '】' + (r.person.cn||'') + (r.person.cn&&r.person.en?' / ':'') + (r.person.en||''));
      if (r.result.cn) {
        lines.push('  人格：' + r.result.cn.grids.ren.number + '劃(' + r.result.cn.grids.ren.element + ', ' + (r.result.cn.grids.ren.fortune?r.result.cn.grids.ren.fortune.glory:'?') + ')');
        lines.push('  三才：' + r.result.cn.sancai.level + ' | 整體：' + r.result.cn.overall);
      }
      if (r.result.en) lines.push('  命運數字：' + r.result.en.destiny);
    });
    lines.push(''); lines.push('─'.repeat(30));
    currentData.pairs.forEach(function(p) {
      lines.push(p.a + ' ↔ ' + p.b + ' [' + p.pair.mode + ']: ' + p.pair.score + '分 ' + p.pair.tier);
    });
    lines.push(''); lines.push('姓名和盤 — 中英文姓名命理分析');

    var text = lines.join('\n');
    copyText(text);
    toast('報告已複製到剪貼簿！可貼到記事本或訊息中');
  }

  // ============ 啟動 ============
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
