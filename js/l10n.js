/**
 * 分析內容的英文層（介面文字在 i18n.js）
 * - L10N.t(中文)：查「中文原文 → 英文」字典，查不到就原樣回傳（中文模式一律回傳原文）
 * - L10N.L(中文, 英文)：組合句子用，依目前語言二選一
 * - L10N.term(中文)：短術語（五行、吉凶、生肖、天干地支…），同 t()
 * - 大型字典（81 數、易經、紫微…）放在 js/l10n/*.js，只在英文模式才載入；載入完成後觸發 'l10n:ready'
 * 專有名詞的譯法：五行 Wood/Fire/Earth/Metal/Water；天干地支用拼音（甲 Jia、子 Zi）；
 * 姓名學五格 Heaven/Person/Earth/Outer/Total Grid；紫微星曜用拼音加意譯
 */
window.L10N = (function() {
  var dict = {};
  var PACKS = ['core', 'numerology', 'extras', 'deep', 'astrology', 'bazi', 'ziwei', 'report', 'iching', 'names'];
  var loaded = false, loading = null;

  function en() { return !!(window.I18N && window.I18N.getLang() === 'en'); }

  /** 字典登記（各字典檔呼叫）：{ 中文: 英文 } */
  function add(map) { for (var k in map) if (Object.prototype.hasOwnProperty.call(map, k)) dict[k] = map[k]; }

  function t(zh) {
    if (!en() || zh == null) return zh;
    var s = String(zh);
    return Object.prototype.hasOwnProperty.call(dict, s) ? dict[s] : s;
  }
  /** 有命名空間的查詢：先查「ns:中文」，查不到再查一般字典（例：紫微的「火星」是煞星，不是占星的行星 Mars） */
  function tn(ns, zh) {
    if (!en() || zh == null) return zh;
    var k = ns + ':' + zh;
    return Object.prototype.hasOwnProperty.call(dict, k) ? dict[k] : t(zh);
  }
  function has(zh) { return Object.prototype.hasOwnProperty.call(dict, String(zh)); }
  function L(zh, enText) { return en() ? enText : zh; }

  /** 逐一替換字串中的已知術語（用在中文模板組成、無法整句查表的短片段，例如「金火」「庚午」） */
  function terms(s, list) {
    if (!en() || s == null) return s;
    return String(s).split('').map(function(c) { return dict[c] != null && (!list || list.indexOf(c) >= 0) ? dict[c] : c; }).join(list ? '' : ' ').replace(/\s+/g, ' ').trim();
  }

  // 天干地支用拼音
  var STEM = { 甲: 'Jia', 乙: 'Yi', 丙: 'Bing', 丁: 'Ding', 戊: 'Wu', 己: 'Ji', 庚: 'Geng', 辛: 'Xin', 壬: 'Ren', 癸: 'Gui' };
  var BRANCH = { 子: 'Zi', 丑: 'Chou', 寅: 'Yin', 卯: 'Mao', 辰: 'Chen', 巳: 'Si', 午: 'Wu', 未: 'Wei', 申: 'Shen', 酉: 'You', 戌: 'Xu', 亥: 'Hai' };
  /** 干支組合（庚午 → Geng-Wu）；英文模式才轉換 */
  function ganzhi(s) {
    if (!en() || !s) return s;
    return String(s).split('').map(function(c) { return STEM[c] || BRANCH[c] || c; }).join('-');
  }

  /** 英文模式時載入所有字典檔（只載一次） */
  function load(cb) {
    if (loaded) { if (cb) cb(); return; }
    if (!loading) {
      loading = new Promise(function(resolve) {
        var left = PACKS.length;
        PACKS.forEach(function(p) {
          var s = document.createElement('script');
          s.src = 'js/l10n/' + p + '.js';
          s.onload = s.onerror = function() { if (--left === 0) resolve(); };
          document.head.appendChild(s);
        });
      }).then(function() {
        loaded = true;
        document.dispatchEvent(new Event('l10n:ready'));
      });
    }
    loading.then(function() { if (cb) cb(); });
  }

  // 一開始就是英文模式：先載入
  if (typeof document !== 'undefined' && en()) load();

  return {
    en: en, add: add, t: t, term: t, tn: tn, has: has, L: L, terms: terms, ganzhi: ganzhi, load: load,
    STEM: STEM, BRANCH: BRANCH, PACKS: PACKS,
    isLoaded: function() { return loaded; }, _dict: dict
  };
})();
