/**
 * 姓名生成器 — 根據姓氏推薦吉數名字
 * 用字來自 data/name-chars.js（與寶寶取名、外國人取中文名共用，有意義與性別標記），
 * 筆劃與五格一律交給 ChineseNumerology（康熙筆劃），跟全站的分析結果一致。
 */
window.NameGenerator = (function() {

  // 吉數：81 數吉凶表中的「大吉」「吉」（不含半吉）
  var AUSPICIOUS_NUMBERS = [];
  for (var n = 1; n <= 81; n++) {
    var f = window.fortune81 && window.fortune81[n];
    if (f && (f.glory === '大吉' || f.glory === '吉')) AUSPICIOUS_NUMBERS.push(n);
  }

  function isAuspicious(num) { return AUSPICIOUS_NUMBERS.indexOf(num) >= 0; }

  var GRID_KEYS = ['tian', 'ren', 'di', 'wai', 'zong'];
  var GENDER_TAGS = { male: 'mn', female: 'fn' };  // 其他（全部）：m、f、n 都收

  /** 依性別挑字，按康熙筆劃分組；主要用於音譯的字不收 */
  function charPool(gender, strokes) {
    var tags = GENDER_TAGS[gender] || 'mfn';
    var byStroke = {};
    (window.NameChars || []).forEach(function(line) {
      var p = line.split('|');
      if (p[4] === 't' || tags.indexOf(p[3]) < 0) return;
      var s = strokes(p[0]);
      if (!(s > 0)) return;
      (byStroke[s] = byStroke[s] || []).push(p[0]);
    });
    return byStroke;
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /**
   * 根據姓氏推薦雙名，人格必為吉數、五格至少三吉；吉數越多越前面，同分隨機（「換一批」會換）
   * @param gender 'male' | 'female' | 其他（全部）
   * @param manualStrokes 手動筆劃（姓氏有罕用字時）
   * @returns 名字陣列；姓氏有字查不到筆劃時回傳 [{ note, unknownChars }]
   */
  function suggestNames(surname, gender, manualStrokes, limit) {
    var CN = window.ChineseNumerology;
    if (!surname || !CN) return [];
    limit = limit || 8;
    var strokes = function(c) {
      if (manualStrokes && manualStrokes[c] > 0) return manualStrokes[c];
      var s = window.strokeMap ? window.strokeMap[c] : undefined;
      return typeof s === 'number' ? s : -1;
    };
    var unknown = surname.split('').filter(function(c) { return !(strokes(c) > 0); });
    if (unknown.length) return [{ note: '姓氏「' + unknown.join('、') + '」不在筆劃庫中，請先在分析時補上筆劃', unknownChars: unknown }];

    var pool = charPool(gender, strokes);
    var keys = Object.keys(pool).map(Number);

    // 五格只取決於筆劃：每種筆劃組合用一個代表名字分析一次
    var combos = [];
    keys.forEach(function(s1) {
      keys.forEach(function(s2) {
        var cn = CN.analyze(surname + pool[s1][0] + pool[s2][0], manualStrokes);
        if (!cn || cn.error || cn.hasUnknown) return;
        var nums = GRID_KEYS.map(function(k) { return cn.grids[k].number; });
        if (!isAuspicious(cn.grids.ren.number)) return;
        var good = nums.filter(isAuspicious).length;
        if (good >= 3) combos.push({ s1: s1, s2: s2, good: good, grids: cn.grids });
      });
    });
    shuffle(combos).sort(function(a, b) { return b.good - a.good; });

    var results = [], used = {};
    for (var i = 0; i < combos.length && results.length < limit; i++) {
      var c = combos[i];
      var c1 = shuffle(pool[c.s1].slice()).filter(function(x) { return !used[x]; })[0];
      var c2 = shuffle(pool[c.s2].slice()).filter(function(x) { return !used[x] && x !== c1; })[0];
      if (!c1 || !c2) continue;
      // 「歐」＋「陽」會被當成複姓「歐陽」，五格就不是這組筆劃算出來的
      var check = CN.analyze(surname + c1 + c2, manualStrokes);
      if (!check || check.error || check.parsed.surname !== surname) continue;
      used[c1] = used[c2] = true;  // 同一批不重複用字，名字才有變化
      results.push({
        name: surname + c1 + c2,
        chars: [c1, c2],
        strokes: [c.s1, c.s2],
        grids: { tian: c.grids.tian.number, ren: c.grids.ren.number, di: c.grids.di.number, wai: c.grids.wai.number, zong: c.grids.zong.number },
        goodCount: c.good,
        element: c.grids.ren.element
      });
    }
    return results;
  }

  return { suggestNames: suggestNames, AUSPICIOUS_NUMBERS: AUSPICIOUS_NUMBERS, isAuspicious: isAuspicious };
})();
