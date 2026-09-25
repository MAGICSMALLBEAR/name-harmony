/**
 * 英文 UI 翻譯層 — 只覆蓋介面文字（標籤/按鈕/導覽/空狀態），
 * 不覆蓋命理分析結果內文（五格/八字/紫微等解讀維持中文，避免專有名詞誤譯）
 */
window.I18N = (function() {
  var LANG_KEY = 'name-harmony-lang';

  var EN = {
    docTitle: 'Name Harmony — Chinese & English Name Numerology',
    appSubtitle: 'Chinese & English Name Numerology Analysis',
    themeToggleTitle: 'Toggle light/dark theme',
    formCardTitle: 'Enter Names',
    formCardSubtitle: 'Fill in one or more fields — the app auto-detects the analysis mode',
    cnNameLabel: 'Chinese Name',
    cnNamePlaceholder: 'Surname + given name',
    enNameLabel: 'English Name',
    bdayLabel: '📅 Birthday',
    formOptional: 'optional',
    bdayHint: '🐉 Add a birthday to unlock Zodiac + BaZi + Astrology; add a birth time for the Hour Pillar, Zi Wei Life Palace and Ascendant; add gender for luck cycles',
    btimeTitle: 'Birth time (optional)',
    genderLabel: 'Gender',
    genderMale: 'Male',
    genderFemale: 'Female',
    placeLabel: '📍 Birthplace',
    bloodLabel: '🩸 Blood Type',
    dividerSymbol: '&',
    addPersonBtn: 'Add Member (max 5)',
    analyzeBtn: 'Start Team Analysis',
    demoBtn: '✨ Demo',
    manualStrokeTitle: '✏️ Manual Stroke Count',
    manualStrokeDesc: 'The following characters are not in the stroke database. Please enter the Kangxi Dictionary stroke count manually:',
    manualStrokeBtn: 'Re-analyze',
    removePersonTitle: 'Remove',
    tabMembers: 'Members',
    tabMatrix: 'Matrix',
    tabTeam: 'Team Report',
    tabReport: 'Report',
    tabLucky: 'Lucky Guide',
    tabHistory: 'History',
    matrixTitle: 'Pairing Matrix',
    teamTitle: 'Team Numerology Report',
    historyPanelTitle: 'Analysis History',
    shareBtn: 'Share Results',
    saveBtn: 'Save Record',
    backBtn: 'Start Over',
    loadingText: 'Analyzing...',
    scrollTopTitle: 'Back to top',
    pkTitle: '🏆 Name Battle Ranking',
    pkDesc: 'Enter a surname and several candidate names, separated by commas (e.g. Bo-Yu,Guan-Ting,Yi-Jun,Zhi-Hao)',
    pkSurnamePh: 'Surname',
    pkNamesPh: 'Candidate names (comma-separated)',
    pkBtn: '📊 Start Battle',
    historyModalTitle: 'History',
    historyClearBtn: '🗑️ Clear All Records',
    footerText: 'For entertainment reference only — please don’t take it too seriously',
    emptyNeedCn: 'A Chinese name is required',
    emptyNeedCnReport: 'to generate a numerology report',
    emptyNeedCnLucky: 'Please analyze a Chinese name first',
    linkBtn: 'Link',
    profileBtn: 'Save Profile',
    qrBtn: 'QR',
    igBtn: 'IG',
    speakBtn: 'Read Aloud',
    speakReportBtn: '🔊 Read Report',
    speakGuideBtn: '🔊 Read Guide',
    copyReportBtn: '📋 Copy Report',
    exportBtn: 'Export'
  };

  function getLang() {
    return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'zh';
  }

  function setLang(lang) {
    localStorage.setItem(LANG_KEY, lang === 'en' ? 'en' : 'zh');
  }

  function cacheOriginal(el, attr, cacheAttr) {
    if (el.dataset[cacheAttr] === undefined) {
      el.dataset[cacheAttr] = attr ? (el.getAttribute(attr) || '') : el.textContent;
    }
    return el.dataset[cacheAttr];
  }

  var ZH_TITLE = document.title;

  function apply(lang) {
    lang = lang === 'en' ? 'en' : 'zh';
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-Hant';
    document.title = lang === 'en' ? EN.docTitle : ZH_TITLE;

    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      var zh = cacheOriginal(el, null, 'i18nZh');
      el.textContent = (lang === 'en' && EN[key]) ? EN[key] : zh;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-placeholder');
      var zh = cacheOriginal(el, 'placeholder', 'i18nPhZh');
      el.setAttribute('placeholder', (lang === 'en' && EN[key]) ? EN[key] : zh);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-title');
      var zh = cacheOriginal(el, 'title', 'i18nTitleZh');
      el.setAttribute('title', (lang === 'en' && EN[key]) ? EN[key] : zh);
    });
  }

  return { getLang: getLang, setLang: setLang, apply: apply, EN: EN };
})();
