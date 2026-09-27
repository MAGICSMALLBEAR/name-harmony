/**
 * 寶寶取名：八字喜用神 + 五格三才 + 字五行 + 音韻諧音，支援輩分字與避諱字
 * 需要：js/data/name-chars.js、js/data/char-element.js、js/data/pinyin-db.js、js/data/stroke-db.js、
 *       js/zodiac-bazi.js、js/chinese-numerology.js、js/phonetics.js
 */
window.BabyName = (function() {

  var ELEMENTS = ['木', '火', '土', '金', '水'];
  var GEN = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };       // 生
  var CTRL = { '木': '土', '火': '金', '土': '水', '金': '木', '水': '火' };      // 剋
  function genBy(e) { for (var k in GEN) if (GEN[k] === e) return k; }          // 生我者
  function ctrlBy(e) { for (var k in CTRL) if (CTRL[k] === e) return k; }       // 剋我者

  // ---------- 字五行 ----------
  var RADICAL_MAP = null;
  // 五音：唇音羽水、舌音徵火、牙音角木、喉音宮土、齒音商金
  function elementBySound(py) {
    var m = /^(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw]?)/.exec(py || '');
    var ini = m ? m[1] : '';
    if (/^[bpmf]$/.test(ini)) return '水';
    if (/^[dtnl]$/.test(ini)) return '火';
    if (/^[gk]$/.test(ini)) return '木';
    if (/^(h|y|w|)$/.test(ini)) return '土';
    return '金';
  }
  /** 字五行：部首明確者依部首，其餘依字音；回傳 { el, by: '部首'|'字音' } */
  function elementOf(ch) {
    if (!RADICAL_MAP) {
      RADICAL_MAP = {};
      var src = window.CharElementByRadical || {};
      Object.keys(src).forEach(function(e) { src[e].split('').forEach(function(c) { RADICAL_MAP[c] = e; }); });
    }
    if (RADICAL_MAP[ch]) return { el: RADICAL_MAP[ch], by: '部首' };
    var py = window.PinyinDB && window.PinyinDB.CHAR[ch];
    return py ? { el: elementBySound(py), by: '字音' } : null;
  }

  // ---------- 喜用神（扶抑法） ----------
  var HIDDEN = {
    '子': '癸', '丑': '己癸辛', '寅': '甲丙戊', '卯': '乙', '辰': '戊乙癸', '巳': '丙庚戊',
    '午': '丁己', '未': '己丁乙', '申': '庚壬戊', '酉': '辛', '戌': '戊辛丁', '亥': '壬甲'
  };
  var HIDDEN_W = [[1], [0.7, 0.3], [0.6, 0.3, 0.1]];
  var STEM_ELE = { '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土', '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水' };
  // 各位置權重：月支（月令）最重，日支次之
  var W = { stem: 1, yearBranch: 1, monthBranch: 2.5, dayBranch: 1.5, hourBranch: 1 };

  /**
   * 由八字判斷日主強弱與喜用神
   * @param bazi ZodiacBazi.fullBazi 的結果
   */
  function xiYong(bazi) {
    if (!bazi || !bazi.pillars) return null;
    var dm = bazi.dayMaster;
    var score = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };
    bazi.pillars.forEach(function(p, i) {
      if (p.tg === '?' || !p.tg) return; // 沒有時辰
      if (i !== 2) score[STEM_ELE[p.tg]] += W.stem;
      var hs = HIDDEN[p.dz] || '';
      var bw = [W.yearBranch, W.monthBranch, W.dayBranch, W.hourBranch][i];
      hs.split('').forEach(function(s, k) { score[STEM_ELE[s]] += bw * HIDDEN_W[hs.length - 1][k]; });
    });
    var yin = genBy(dm), bi = dm, shi = GEN[dm], cai = CTRL[dm], guan = ctrlBy(dm);
    var self = score[bi] + score[yin];
    var sum = ELEMENTS.reduce(function(a, e) { return a + score[e]; }, 0);
    var ratio = sum ? self / sum : 0.5;
    var strong = ratio >= 0.5;
    var strength = ratio > 0.6 ? '身強' : ratio >= 0.5 ? '中和偏強' : ratio >= 0.4 ? '中和偏弱' : '身弱';
    var yong, xi, ji, reason;
    var monthEle = STEM_ELE[(HIDDEN[bazi.pillars[1].dz] || ' ').charAt(0)];
    var deLing = monthEle === bi || monthEle === yin;
    var pct = Math.round(ratio * 100);
    if (strong) {
      // 身強：印多用財破印，比劫多用官殺制身；食傷洩秀為喜
      if (score[yin] > score[bi]) { yong = cai; xi = shi; reason = '印星（' + yin + '）偏重，用財（' + cai + '）制印，食傷（' + shi + '）洩秀'; }
      else { yong = guan; xi = shi; reason = '比劫（' + bi + '）偏重，用官殺（' + guan + '）制身，食傷（' + shi + '）洩秀'; }
      ji = [yin, bi];
    } else {
      yong = yin; xi = bi;
      reason = '日主（' + dm + '）力量不足，用印（' + yin + '）生身、比劫（' + bi + '）幫身';
      ji = [guan, cai];
    }
    var missing = ELEMENTS.filter(function(e) { return score[e] === 0; });
    return {
      dayMaster: dm, dayMasterTG: bazi.dayMasterTG, score: score, ratio: ratio, strength: strength, deLing: deLing,
      yong: yong, xi: xi, favorable: [yong, xi], unfavorable: ji, missing: missing, hasHour: bazi.hasHour,
      text: '日主' + bazi.dayMasterTG + dm + (deLing ? '，生於' + bazi.pillars[1].dz + '月得令' : '，生於' + bazi.pillars[1].dz + '月失令') +
        '；同黨（' + bi + '、' + yin + '）佔 ' + pct + '%，屬' + strength + '。' + reason + '。'
    };
  }

  // ---------- 取名 ----------
  var POOL = null;
  function pool() {
    if (POOL) return POOL;
    var DB = window.PinyinDB ? window.PinyinDB.CHAR : {};
    var strokes = window.strokeMap || {};
    var seen = {};
    POOL = [];
    (window.NameChars || []).forEach(function(row) {
      var f = row.split('|');
      var c = f[0];
      if (seen[c] || f[4] === 't' || !DB[c] || typeof strokes[c] !== 'number') return;
      seen[c] = 1;
      var el = elementOf(c);
      POOL.push({ c: c, meaning: f[1], tags: f[2].split(','), g: f[3], py: DB[c], strokes: strokes[c], el: el.el, elBy: el.by });
    });
    return POOL;
  }

  function charInfo(c) {
    var hit = pool().filter(function(x) { return x.c === c; })[0];
    if (hit) return hit;
    var py = window.PinyinDB && window.PinyinDB.CHAR[c];
    var el = elementOf(c);
    return { c: c, meaning: '', tags: [], g: 'n', py: py || '', strokes: (window.strokeMap || {})[c], el: el ? el.el : '', elBy: el ? el.by : '' };
  }

  function pyBase(py) { return (py || '').replace(/\d$/, ''); }

  var GLORY = { '大吉': 3, '吉': 2, '中吉': 1.5, '半吉': 0.5, '凶': -3, '大凶': -4 };
  var GRID_W = { ren: 3, di: 2, zong: 3, wai: 1, tian: 0 };
  var SANCAI = { '大吉': 4, '吉': 2.5, '平': 1, '半吉': 0, '凶': -4, '大凶': -6 };

  function gridScore(cn) {
    var s = 0;
    Object.keys(GRID_W).forEach(function(k) {
      var f = cn.grids[k].fortune;
      s += GRID_W[k] * (f ? GLORY[f.glory] || 0 : 0);
    });
    return s + (SANCAI[cn.sancai.level] || 0);
  }

  /**
   * @param opts {
   *   surname, gender: 'male'|'female'|'', single: bool,
   *   generation: { c: '字', pos: 1|2 }（輩分字，可省略）, avoid: '避諱字',
   *   traits: [], favorable: ['木', ...], unfavorable: [...]
   * }
   */
  function suggest(opts) {
    var sur = (opts.surname || '').trim();
    if (!sur) return { error: '請輸入姓氏' };
    if (!window.ChineseNumerology) return { error: '分析模組沒有載入' };
    var strokes = window.strokeMap || {};
    var missingSur = sur.split('').filter(function(c) { return typeof strokes[c] !== 'number'; });
    if (missingSur.length) return { error: '筆劃庫沒有「' + missingSur.join('') + '」，無法計算五格' };

    var gen = opts.generation && opts.generation.c ? { c: opts.generation.c.trim().charAt(0), pos: opts.generation.pos === 2 ? 2 : 1 } : null;
    if (gen && typeof strokes[gen.c] !== 'number') return { error: '筆劃庫沒有輩分字「' + gen.c + '」' };
    var single = !!opts.single && !gen;
    var fav = opts.favorable || [], unfav = opts.unfavorable || [];
    var traits = opts.traits || [];

    // 避諱：字本身與同音字（不論聲調）都避開
    var avoidChars = (opts.avoid || '').replace(/[\s,，、]/g, '').split('').filter(Boolean);
    var avoidPy = {};
    avoidChars.forEach(function(c) { var py = window.PinyinDB && window.PinyinDB.CHAR[c]; if (py) avoidPy[pyBase(py)] = c; });
    var surChars = sur.split('');
    var excluded = [];
    var candidates = pool().filter(function(ch) {
      if (opts.gender && ch.g !== 'n' && ch.g !== (opts.gender === 'male' ? 'm' : 'f')) return false;
      if (surChars.indexOf(ch.c) >= 0 || (gen && ch.c === gen.c)) return false;
      if (avoidChars.indexOf(ch.c) >= 0) { excluded.push(ch.c); return false; }
      if (avoidPy[pyBase(ch.py)]) { excluded.push(ch.c); return false; }
      return true;
    });

    function charScore(ch) {
      var s = 0, why = [];
      if (ch.el === fav[0]) { s += 12; why.push(ch.c + '屬' + ch.el + '（用神）'); }
      else if (fav.indexOf(ch.el) >= 0) { s += 8; why.push(ch.c + '屬' + ch.el + '（喜神）'); }
      else if (unfav.indexOf(ch.el) >= 0) { s -= 10; why.push(ch.c + '屬' + ch.el + '（忌神）'); }
      var hit = ch.tags.filter(function(t) { return traits.indexOf(t) >= 0; });
      if (hit.length) { s += 8; why.push(ch.c + '：' + hit.join('、')); }
      return { s: s, why: why };
    }

    // 五格只和筆劃有關：每種筆劃組合只分析一次
    var byStroke = {};
    candidates.forEach(function(ch) { (byStroke[ch.strokes] = byStroke[ch.strokes] || []).push(ch); });
    var strokeKeys = Object.keys(byStroke).map(Number);
    var genInfo = gen ? charInfo(gen.c) : null;
    var combos = []; // [strokes1, strokes2|null]
    if (single) strokeKeys.forEach(function(s) { combos.push([s]); });
    else if (gen) strokeKeys.forEach(function(s) { combos.push(gen.pos === 1 ? [genInfo.strokes, s] : [s, genInfo.strokes]); });
    else strokeKeys.forEach(function(a) { strokeKeys.forEach(function(b) { combos.push([a, b]); }); });

    var gridByKey = {};
    combos.forEach(function(sk) {
      // 用任一組同筆劃的字代表
      var pick = sk.map(function(s, i) {
        if (gen && (i + 1) === gen.pos) return gen.c;
        return byStroke[s][0].c;
      });
      var cn = window.ChineseNumerology.analyze(sur + pick.join(''));
      if (!cn || cn.error) return;
      gridByKey[sk.join(',')] = { gs: gridScore(cn), cn: cn };
    });
    var allKeys = Object.keys(gridByKey).sort(function(a, b) { return gridByKey[b].gs - gridByKey[a].gs; });
    var best = allKeys.length ? gridByKey[allKeys[0]].gs : 0;
    // 只留五格分數接近最高的組合（人、地、總格不能有凶）
    var goodKeys = allKeys.filter(function(k) {
      var g = gridByKey[k].cn.grids;
      return gridByKey[k].gs >= best - 8 && ['ren', 'di', 'zong'].every(function(x) { return !g[x].fortune || GLORY[g[x].fortune.glory] > 0; });
    });
    // 輩分字或姓氏讓人格固定為凶數時，只能退而求其次
    var note = '';
    if (!goodKeys.length && allKeys.length) {
      goodKeys = allKeys.slice(0, 12);
      var g0 = gridByKey[allKeys[0]].cn.grids;
      var badGrid = ['ren', 'di', 'zong'].filter(function(x) { return g0[x].fortune && GLORY[g0[x].fortune.glory] < 0; })
        .map(function(x) { return g0[x].name + ' ' + g0[x].number; });
      note = '這個姓' + (gen ? '和輩分字「' + gen.c + '」' : '') + '的組合無法讓人格、地格、總格都是吉數（最佳組合仍有' + badGrid.join('、') + '），以下為五格分數最高的名字';
    }

    // 在好的筆劃組合裡挑字
    var scored = [];
    goodKeys.forEach(function(k) {
      var sk = k.split(',').map(Number);
      var gs = gridByKey[k].gs;
      var lists = sk.map(function(s, i) { return gen && (i + 1) === gen.pos ? [genInfo] : byStroke[s]; });
      var add = function(chs) {
        var cs = chs.map(charScore);
        scored.push({ key: k, chars: chs, gs: gs, cs: cs, quick: gs * 3 + cs.reduce(function(a, x) { return a + x.s; }, 0) });
      };
      if (lists.length === 1) lists[0].forEach(function(a) { add([a]); });
      else lists[0].forEach(function(a) { lists[1].forEach(function(b) { if (a.c !== b.c) add([a, b]); }); });
    });
    scored.sort(function(a, b) { return b.quick - a.quick; });

    // 前幾百個再做完整分析與音韻檢查；同一種筆劃組合最多三個，讓五格有變化
    var out = [], used = {}, perKey = {};
    for (var i = 0; i < scored.length && i < 1500 && out.length < 12; i++) {
      var x = scored[i];
      if ((perKey[x.key] || 0) >= 3) continue;
      var name = sur + x.chars.map(function(c) { return c.c; }).join('');
      var cn = window.ChineseNumerology.analyze(name);
      if (!cn || cn.error || (cn.unknownChars && cn.unknownChars.length)) continue;
      var ph = window.Phonetics ? window.Phonetics.checkChinese(cn.parsed) : null;
      if (ph && ph.grade === '需注意') continue;
      // 同一個字最多出現兩次（輩分字除外），讓選擇多一點
      var over = x.chars.some(function(c) { return !(gen && c.c === gen.c) && (used[c.c] || 0) >= 2; });
      if (over) continue;
      x.chars.forEach(function(c) { used[c.c] = (used[c.c] || 0) + 1; });
      perKey[x.key] = (perKey[x.key] || 0) + 1;
      out.push({
        name: name, chars: x.chars, analysis: cn, phonetics: ph,
        gridScore: x.gs, score: x.quick + (ph && ph.grade === '良好' ? 4 : 0),
        reasons: [].concat.apply([], x.cs.map(function(c) { return c.why; }))
      });
    }
    out.sort(function(a, b) { return b.score - a.score; });
    return {
      surname: sur, single: single, generation: gen, favorable: fav, unfavorable: unfav,
      poolSize: candidates.length, excluded: excluded, candidates: out, note: note
    };
  }

  return { suggest: suggest, xiYong: xiYong, elementOf: elementOf, elementBySound: elementBySound, pool: pool };
})();
