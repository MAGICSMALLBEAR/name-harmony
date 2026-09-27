/**
 * 外國人取中文名：英文名 + 個性 → 音義兼顧的中文名，附五格與諧音檢查
 * 需要：js/data/name-chars.js、js/data/english-translit.js、js/data/pinyin-db.js、js/data/stroke-db.js、js/chinese-numerology.js、js/phonetics.js
 */
window.ForeignName = (function() {

  var TRAITS = ['智慧', '勇敢', '溫柔', '快樂', '正直', '美麗', '成功', '和平', '自由', '創意', '仁慈', '堅毅', '光明', '自然'];

  // 常見英文姓氏 → 中文姓
  var SURNAME_TABLE = {
    SMITH: '史', JOHNSON: '江', WILLIAMS: '韋', BROWN: '白', JONES: '鍾', GARCIA: '賈', MILLER: '米', DAVIS: '戴',
    RODRIGUEZ: '羅', MARTINEZ: '馬', HERNANDEZ: '何', LOPEZ: '盧', GONZALEZ: '龔', WILSON: '魏', ANDERSON: '安',
    THOMAS: '湯', TAYLOR: '戴', MOORE: '穆', JACKSON: '賈', MARTIN: '馬', LEE: '李', PEREZ: '裴', THOMPSON: '湯',
    WHITE: '懷', HARRIS: '何', SANCHEZ: '孫', CLARK: '柯', RAMIREZ: '雷', LEWIS: '劉', ROBINSON: '羅', WALKER: '華',
    YOUNG: '楊', ALLEN: '艾', KING: '金', WRIGHT: '賴', SCOTT: '司', TORRES: '陶', NGUYEN: '阮', HILL: '席',
    FLORES: '傅', GREEN: '葛', ADAMS: '安', NELSON: '倪', BAKER: '貝', HALL: '霍', RIVERA: '黎', CAMPBELL: '康',
    MITCHELL: '梅', CARTER: '柯', ROBERTS: '羅', PHILLIPS: '費', EVANS: '艾', TURNER: '滕', PARKER: '裴',
    COLLINS: '柯', EDWARDS: '艾', STEWART: '司徒', MORRIS: '莫', MURPHY: '莫', COOK: '顧', ROGERS: '羅',
    MORGAN: '莫', PETERSON: '畢', COOPER: '顧', REED: '芮', BAILEY: '貝', BELL: '貝', GOMEZ: '高', KELLY: '柯',
    HOWARD: '霍', WARD: '華', COX: '高', DIAZ: '狄', RICHARDSON: '黎', WOOD: '伍', WATSON: '華', BROOKS: '卜',
    BENNETT: '貝', GRAY: '葛', GREY: '葛', JAMES: '詹', REYES: '雷', HUGHES: '胡', PRICE: '蒲', MYERS: '麥',
    LONG: '龍', FOSTER: '傅', SANDERS: '孫', ROSS: '羅', SULLIVAN: '蘇', RUSSELL: '盧', ORTIZ: '歐',
    JENKINS: '簡', PERRY: '裴', BUTLER: '柏', BARNES: '班', FISHER: '費', HENDERSON: '韓', COLEMAN: '柯',
    SIMMONS: '施', PATTERSON: '潘', JORDAN: '喬', REYNOLDS: '雷', HAMILTON: '韓', GRAHAM: '葛', WALLACE: '華',
    WEST: '衛', OWENS: '歐', MARSHALL: '馬', GIBSON: '吉', ELLIS: '艾', STONE: '石', FOX: '霍', MILLS: '麥',
    GRANT: '葛', LYNCH: '林', SHAW: '蕭', DEAN: '丁', DUNN: '鄧', BURKE: '柏', WAGNER: '華', WEBER: '韋',
    SCHMIDT: '施', MULLER: '穆', MUELLER: '穆', FISCHER: '費', MEYER: '梅', BECKER: '貝', HOFFMANN: '霍',
    SCHULZ: '舒', ZIMMERMANN: '齊', LANGE: '郎', DUBOIS: '杜', BERNARD: '柏', DURAND: '杜', MOREAU: '莫',
    LAURENT: '羅', SIMON: '席', ROSSI: '羅', RUSSO: '魯', FERRARI: '費', BIANCHI: '畢', ROMANO: '羅',
    RICCI: '李', KIM: '金', PARK: '朴', CHEN: '陳', WANG: '王', LI: '李', ZHANG: '張', LIU: '劉', WONG: '黃', CHAN: '陳'
  };

  // 可用於音譯的中文姓（依發音比對）
  var SURNAMES = '艾安班白包貝畢卞柏卜蔡曹岑陳程崔戴鄧丁董杜范方費馮傅高葛龔顧郭韓杭何賀洪胡華黃霍吉賈簡江金柯孔賴藍郎雷黎李連梁林凌劉龍盧陸魯羅呂馬麥梅孟米苗莫穆倪聶歐潘裴彭蒲齊錢喬秦邱任芮阮沙施石史舒司宋蘇孫譚湯唐陶田萬汪王韋衛魏溫吳伍武席夏蕭謝辛熊徐許薛嚴顏楊姚葉易殷尹于余俞袁岳曾詹張趙鄭鍾周朱莊卓';

  // ---------- 發音比對 ----------
  var PY_RE = /^(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw]?)([a-zv]+?)([1-5])$/;
  function parsePy(py) {
    var m = PY_RE.exec(py || '');
    return m ? { ini: m[1], fin: m[2], tone: +m[3], base: m[1] + m[2] } : null;
  }

  // 英文字首子音 → 中文聲母候選（排越前面越像）
  var ONSET = {
    b: ['b', 'p'], p: ['p', 'b'], m: ['m'], f: ['f', 'h'], ph: ['f', 'h'], v: ['w', 'f'], d: ['d', 't'], t: ['t', 'd'],
    n: ['n', 'l'], l: ['l', 'r'], r: ['r', 'l'], g: ['g', 'k'], gj: ['j', 'zh'], k: ['k', 'g', 'q'], c: ['k', 'g'], cs: ['s', 'x'],
    q: ['k', 'q'], h: ['h'], j: ['j', 'zh'], ch: ['q', 'ch', 'zh', 'j'], sh: ['x', 'sh'], s: ['s', 'x', 'sh'], z: ['z', 'j'],
    th: ['s', 't'], w: ['w', 'h'], wh: ['w', 'h'], y: ['y'], x: ['x', 's'], '': ['', 'y', 'w']
  };
  // 英文母音 → 中文韻母候選
  var NUCLEUS = {
    a: ['a', 'ai', 'an', 'ang', 'ia'], e: ['e', 'ei', 'ai', 'en', 'ie'], i: ['i', 'in', 'ing', 'ai'], o: ['o', 'uo', 'ou', 'ao', 'ong'],
    u: ['u', 'ou', 'ong', 'un'], y: ['i', 'ai'], ee: ['i', 'ei'], ea: ['i', 'ai'], ie: ['i', 'ie'], ey: ['i', 'ei'], ei: ['ai', 'ei'],
    ai: ['ai', 'ei'], ay: ['ai', 'ei'], oa: ['ou', 'o'], ow: ['ou', 'ao'], oe: ['ou', 'o'], ou: ['ou', 'ao', 'u'], oo: ['u', 'ou'],
    au: ['ao', 'o'], aw: ['ao', 'o'], ia: ['ia', 'i', 'a'], io: ['i', 'ao'], ua: ['ua', 'a'], ue: ['u', 'ei'], ui: ['ui', 'i']
  };

  function onsetKey(on, nextVowel) {
    if (!on) return '';
    var o = on.toLowerCase();
    var digraph = /^(sch|ch|sh|th|ph|wh|ck|qu)/.exec(o);
    if (digraph) return { sch: 'sh', ck: 'k', qu: 'q' }[digraph[1]] || digraph[1];
    var c = o.charAt(0);
    if (c === 'g' && o.length === 1 && /^[eiy]/.test(nextVowel)) return 'gj';
    if (c === 'c' && o.length === 1 && /^[eiy]/.test(nextVowel)) return 'cs';
    return ONSET[c] ? c : '';
  }

  /** 英文拼字切成音節：[{ on, nu, coda }] */
  function syllables(word) {
    var w = word.toLowerCase().replace(/[^a-z]/g, '');
    // 字尾不發音的 e（Grace、Mike）
    if (/[^aeiouy]e$/.test(w) && /[aeiouy].*[^aeiouy]e$/.test(w)) w = w.slice(0, -1);
    var re = /([^aeiouy]*)([aeiouy]+)/g, out = [], m, last = 0;
    while ((m = re.exec(w))) {
      // y 在母音前當子音（Yvonne 除外）
      out.push({ on: m[1], nu: m[2] });
      last = re.lastIndex;
    }
    if (!out.length) return [{ on: w, nu: '', coda: '' }];
    out[out.length - 1].coda = w.slice(last);
    // 中間子音：兩個以上時第一個歸前一音節（Mar-tin）
    for (var i = 1; i < out.length; i++) {
      var on = out[i].on;
      if (on.length >= 2 && !/^(ch|sh|th|ph|wh|ck|qu)$/.test(on) && !/^[bcdfgkpt][lr]$/.test(on)) {
        out[i - 1].coda = (out[i - 1].coda || '') + on.charAt(0);
        out[i].on = on.slice(1);
      }
    }
    return out;
  }

  /** 英文音節與中文拼音的相似度（0～1） */
  function soundSim(syl, py) {
    var p = parsePy(py);
    if (!p) return 0;
    var key = onsetKey(syl.on, syl.nu);
    var inis = ONSET[key] || [''];
    var iniScore = 0;
    var ini = p.ini;
    var k = inis.indexOf(ini);
    if (k === 0) iniScore = 1; else if (k > 0) iniScore = 0.7;
    var nu = syl.nu.toLowerCase();
    var fins = NUCLEUS[nu.slice(0, 2)] || NUCLEUS[nu.charAt(0)] || [];
    var fin = p.fin;
    if ((ini === 'y' || ini === 'w') && key === '') fin = ini === 'y' ? 'i' + fin : 'u' + fin;
    var finScore = 0;
    var j = fins.indexOf(fin);
    if (j === 0) finScore = 1; else if (j > 0) finScore = 0.75;
    else if (fin.charAt(0) === (fins[0] || '').charAt(0)) finScore = 0.45;
    // 鼻音結尾（Dan、Tom）對上 -n、-ng 韻母加分
    var coda = (syl.coda || '').charAt(0);
    if (/[nm]/.test(coda) && /n$|ng$/.test(fin)) finScore = Math.min(1, finScore + 0.25);
    return iniScore * 0.5 + finScore * 0.5;
  }

  /** 單音節名字的字尾子音當成一個輕音節（Mark → 馬克） */
  function codaSyllable(syl) {
    var c = (syl.coda || '').replace(/^[nm]+/, '');
    if (!c) return null;
    var on = /^(ch|sh|th|ck)/.test(c) ? c.slice(0, 2) : c.charAt(0);
    return { on: on, nu: 'e', coda: '', light: true };
  }

  // 拼音對拼音（慣用譯名已知時）：聲母、韻母各半，相近的音給部分分數
  var INI_GROUP = [['z', 'zh', 'j'], ['c', 'ch', 'q'], ['s', 'sh', 'x'], ['l', 'n', 'r'], ['f', 'h'], ['b', 'p'], ['d', 't'], ['g', 'k'], ['y', ''], ['w', '']];
  function pySim(target, py) {
    var a = parsePy(target + '1'), b = parsePy(py);
    if (!a || !b) return 0;
    var ini = a.ini === b.ini ? 1 : INI_GROUP.some(function(g) { return g.indexOf(a.ini) >= 0 && g.indexOf(b.ini) >= 0; }) ? 0.7 : 0;
    var fa = a.fin, fb = b.fin;
    var fin = fa === fb ? 1 : fa.replace(/g$/, '') === fb.replace(/g$/, '') ? 0.8
      : fa.replace(/n?g?$/, '') === fb.replace(/n?g?$/, '') ? 0.6 : fa.charAt(0) === fb.charAt(0) ? 0.45 : 0;
    return ini * 0.5 + fin * 0.5;
  }

  /**
   * 名字的目標音節：[{ label, sim(拼音) }]
   * 有慣用譯名時用譯名拼音比對；沒有時用英文拼字估計
   */
  function targetsOf(word) {
    var key = word.toUpperCase().replace(/[^A-Z]/g, '');
    var tr = (window.EnglishTranslit || {})[key];
    if (tr) {
      return {
        known: true,
        list: tr.split(' ').map(function(p) { return { label: p, sim: function(py) { return pySim(p, py); } }; })
      };
    }
    var syls = syllables(word);
    if (syls.length === 1) {
      var extra = codaSyllable(syls[0]);
      if (extra) syls = syls.concat([extra]);
    }
    return {
      known: false,
      list: syls.map(function(s) {
        return { label: s.light ? '(' + s.on + ')' : s.on + s.nu, sim: function(py) { return soundSim(s, py); } };
      })
    };
  }

  // ---------- 字庫 ----------
  var CHARS = null;
  function chars() {
    if (CHARS) return CHARS;
    var DB = window.PinyinDB ? window.PinyinDB.CHAR : {};
    var strokes = window.strokeMap || {};
    var seen = {};
    CHARS = [];
    (window.NameChars || []).forEach(function(row) {
      var f = row.split('|');
      if (seen[f[0]] || !DB[f[0]] || typeof strokes[f[0]] !== 'number') return; // 要有拼音與筆劃才能分析
      seen[f[0]] = 1;
      CHARS.push({ c: f[0], meaning: f[1], tags: f[2].split(','), g: f[3], py: DB[f[0]] });
    });
    return CHARS;
  }

  function genderOk(ch, gender) {
    return !gender || ch.g === 'n' || (gender === 'male' ? ch.g === 'm' : ch.g === 'f');
  }

  // 三才加減分：凶、大凶的組合排到後面（仍保留，避免完全沒有結果）
  var SANCAI_SCORE = { '大吉': 8, '吉': 5, '平': 0, '半吉': 0, '凶': -20, '大凶': -30 };

  // 發音最像的字；夠像的（≥0.6）不到兩個時放寬到 0.35
  function bestBySound(target, gender, n) {
    var all = chars().filter(function(ch) { return genderOk(ch, gender); })
      .map(function(ch) { return { ch: ch, sim: target.sim(ch.py) }; })
      .sort(function(a, b) { return b.sim - a.sim; });
    var good = all.filter(function(x) { return x.sim >= 0.6; });
    return (good.length >= 2 ? good : all.filter(function(x) { return x.sim >= 0.35; })).slice(0, n);
  }

  function surnameBySound(target, word) {
    var DB = window.PinyinDB;
    var best = null;
    SURNAMES.split('').forEach(function(c) {
      var py = DB.SURNAME[c] || DB.CHAR[c];
      if (!py) return;
      var s = target.sim(py);
      if (!best || s > best.s) best = { c: c, s: s, py: py };
    });
    return { c: best.c, from: word, sound: target.label, why: word + ' 的「' + target.label + '」→ ' + best.c + '（' + best.py.replace(/\d/, '') + '）' };
  }

  /**
   * 取名
   * @param opts { english: 'Michael Smith', gender: 'male'|'female'|'', traits: ['智慧', ...] }
   * @return { surname, known, sounds, candidates: [...] } 或 { error }
   */
  function suggest(opts) {
    var parts = (opts.english || '').trim().split(/\s+/).filter(function(p) { return /[a-z]/i.test(p); });
    if (!parts.length) return { error: '請輸入英文名字' };
    var first = parts[0], last = parts.length > 1 ? parts[parts.length - 1] : '';
    var gender = opts.gender || '';
    var traits = (opts.traits || []).filter(function(t) { return TRAITS.indexOf(t) >= 0; });

    var tg = targetsOf(first);
    var nameTargets = tg.list;
    var sur;
    if (last) {
      var key = last.toUpperCase().replace(/[^A-Z]/g, '');
      sur = SURNAME_TABLE[key] ? { c: SURNAME_TABLE[key], from: last, why: last + ' → ' + SURNAME_TABLE[key] + '（常見譯法）' }
        : surnameBySound(targetsOf(last).list[0], last);
    } else {
      // 沒有姓：名字的第一個音當姓，其餘的音放進名字
      sur = surnameBySound(nameTargets[0], first);
      nameTargets = nameTargets.slice(1);
    }

    var s1 = nameTargets[0] ? bestBySound(nameTargets[0], gender, 6) : [];
    var s2 = nameTargets[1] ? bestBySound(nameTargets[1], gender, 6) : [];
    var pool = chars().filter(function(ch) { return genderOk(ch, gender); });
    var byTrait = pool.filter(function(ch) { return ch.tags.some(function(t) { return traits.indexOf(t) >= 0; }); });
    if (!byTrait.length) byTrait = pool.slice(0, 40);

    var combos = [];
    s1.forEach(function(a) {
      s2.forEach(function(b) { combos.push([a.ch, b.ch, a.sim, b.sim, '音譯']); });
      byTrait.forEach(function(t) { combos.push([a.ch, t, a.sim, null, '音義']); });
    });
    // 沒有可對應的音（單音節名字已用在姓）：只取意義
    if (!s1.length) {
      byTrait.slice(0, 20).forEach(function(a) {
        byTrait.slice(0, 20).forEach(function(b) { combos.push([a, b, null, null, '意譯']); });
      });
    }

    var seen = {};
    var scored = [];
    combos.forEach(function(cb) {
      if (cb[0].c === cb[1].c || cb[0].c === sur.c || cb[1].c === sur.c) return;
      var name = sur.c + cb[0].c + cb[1].c;
      if (seen[name]) return;
      seen[name] = 1;
      var cn = window.ChineseNumerology.analyze(name);
      if (!cn || cn.error || (cn.unknownChars && cn.unknownChars.length)) return;
      var ph = window.Phonetics ? window.Phonetics.checkChinese(cn.parsed) : null;
      if (ph && ph.grade === '需注意') return;
      var good = (cn.fortuneCounts['大吉'] || 0) + (cn.fortuneCounts['吉'] || 0) + (cn.fortuneCounts['中吉'] || 0);
      var traitHits = [cb[0], cb[1]].filter(function(ch) { return ch.tags.some(function(t) { return traits.indexOf(t) >= 0; }); }).length;
      var sound = cb[2] == null ? 0.5 : cb[3] == null ? cb[2] : (cb[2] + cb[3]) / 2;
      var sancai = cn.sancai ? cn.sancai.level : '';
      var score = sound * 40 + traitHits * 12 + good * 6 + (ph && ph.grade === '良好' ? 8 : 0) + (SANCAI_SCORE[sancai] || 0);
      var soundN = cb[4] === '音譯' ? 2 : cb[4] === '音義' ? 1 : 0;
      scored.push({
        name: name, surname: sur, chars: [cb[0], cb[1]], type: cb[4], sound: sound, traitHits: traitHits,
        good: good, level: cn.sancai ? cn.sancai.level : '', phonetics: ph, score: score, analysis: cn,
        soundText: nameTargets.slice(0, soundN).map(function(t, i) {
          return t.label + ' → ' + cb[i].c + ' ' + cb[i].py.replace(/\d/, '');
        }).join('、')
      });
    });
    scored.sort(function(a, b) { return b.score - a.score; });

    // 前幾名避免同一個首字重複太多；音譯（兩字都取音）至少保留兩個，不被音義擠掉
    var out = [], firstCount = {};
    function take(x) {
      var k = x.chars[0].c;
      if (out.length >= 6 || out.indexOf(x) >= 0 || (firstCount[k] || 0) >= 2) return;
      firstCount[k] = (firstCount[k] || 0) + 1;
      out.push(x);
    }
    scored.filter(function(x) { return x.type === '音譯' && x.sound >= 0.6; }).slice(0, 2).forEach(take);
    scored.forEach(take);
    out.sort(function(a, b) { return b.score - a.score; });
    return { surname: sur, known: tg.known, sounds: tg.list.map(function(t) { return t.label; }), candidates: out };
  }

  return { suggest: suggest, TRAITS: TRAITS, syllables: syllables, soundSim: soundSim, pySim: pySim };
})();
