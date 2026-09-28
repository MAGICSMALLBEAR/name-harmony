/**
 * 取名工具的大量檢查（不需要瀏覽器）：node tools/test-naming.js
 * 涵蓋：姓名熱門度、品牌命名、Big Five、家庭命名規劃、寶寶取名、外國人取中文名、易經起卦、喜用神、生日靈數、改名對比、吉數姓名推薦
 */
var vm = require('vm');
var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..');
var ctx = { console: console, Promise: Promise };
ctx.window = ctx;
vm.createContext(ctx);
[
  'data/stroke-db', 'data/s2t-map', 'data/fortune-81', 'chinese-numerology',
  'data/pinyin-db', 'data/english-phonetics', 'phonetics', 'pair-harmony',
  'data/name-chars', 'data/char-element', 'data/english-translit', 'foreign-name',
  'zodiac-bazi', 'baby-name', 'professional',
  'data/name-trends', 'naming-extensions', 'iching',
  'data/english-number-meanings', 'english-numerology', 'name-generator',
  'data/iching-yao', 'deep-readings'
].forEach(function(f) {
  vm.runInContext(fs.readFileSync(path.join(root, 'js', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
});
var N = ctx.NamingExtensions, T = ctx.NameTrends;

var failures = 0, checks = 0;
function ok(cond, msg) {
  checks++;
  if (!cond) { failures++; if (failures <= 30) console.error('✗ ' + msg); }
}
function section(name, fn) {
  var before = failures, t0 = Date.now();
  fn();
  console.log((failures === before ? '✓ ' : '✗ ') + name + '（' + (Date.now() - t0) + ' ms）');
}

// 固定亂數，結果可重現
var seed = 20260927;
function rand() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
function pick(a) { return a[Math.floor(rand() * a.length)]; }

var nameChars = Object.keys(ctx.PinyinDB.CHAR).filter(function(c) { return typeof ctx.strokeMap[c] === 'number'; });
var SURNAMES = '陳林黃張李王吳劉蔡楊許鄭謝洪郭邱曾廖賴徐周葉蘇莊呂江何蕭羅高潘簡朱鍾彭游詹胡施沈余盧梁趙顏柯翁魏孫戴范方宋鄧杜傅侯曹薛丁卓阮馬董温唐藍蔣石古紀姚連馮歐程湯黃田康姜白汪鄒尤巫鐘黎涂龔嚴韓袁金童陸夏柳凃邵'.split('');

section('熱門度資料格式', function() {
  var nDec = T.us.decades.length;
  ['F', 'M'].forEach(function(sex) {
    var rows = T.us[sex].split('|');
    ok(rows.length > 2000, sex + ' 名字數量 ' + rows.length);
    rows.forEach(function(row) {
      var i = row.indexOf(':'), name = row.slice(0, i), cells = row.slice(i + 1).split(',');
      ok(/^[A-Z][a-z]+$/.test(name), '名字格式：' + name);
      ok(cells.length === nDec + 1, name + ' 欄位數 ' + cells.length);
      ok(cells.slice(0, nDec).some(Boolean), name + ' 至少一個年代有排名');
      cells.forEach(function(c) { ok(c === '' || (+c >= 1 && +c <= 1000 && String(+c) === c), name + ' 排名 ' + c); });
    });
    // 每個年代的排名 1..1000 各出現一次
    for (var d = 0; d < nDec; d++) {
      var seen = {};
      rows.forEach(function(row) { var c = row.split(':')[1].split(',')[d]; if (c) seen[c] = (seen[c] || 0) + 1; });
      ok(Object.keys(seen).length === 1000 && Object.keys(seen).every(function(k) { return seen[k] === 1; }), sex + ' ' + T.us.decades[d] + ' 年代排名不連續');
    }
    ok(T.us.top2025[sex].length === 10, sex + ' 2025 前十名');
  });
  T.tw.decades.forEach(function(d) {
    ['M', 'F'].forEach(function(sex) {
      ok(d[sex].length === 10, d.label + sex + ' 十名');
      d[sex].forEach(function(p, k) {
        ok(/^[一-鿿]{1,2}$/.test(p[0]), d.label + ' 名字 ' + p[0]);
        ok(k === 0 || d[sex][k - 1][1] >= p[1], d.label + sex + ' 人數未遞減');
      });
    });
    ok(d.to >= d.from && d.from >= 1921 && d.to <= 2023, d.label + ' 西元年');
  });
});

section('英文名時代感（已知事實）', function() {
  var cases = [
    ['Mary', 'F', 1940, 1], ['Linda', 'F', 1940, 2], ['Jennifer', 'F', 1970, 1], ['Jessica', 'F', 1980, 1],
    ['Emily', 'F', 2000, 1], ['Emma', 'F', 2010, 1], ['Olivia', 'F', 2020, 1],
    ['James', 'M', 1940, 1], ['Michael', 'M', 1960, 1], ['Jacob', 'M', 2000, 1], ['Liam', 'M', 2020, 1]
  ];
  cases.forEach(function(c) {
    var r = N.trendEnglish(c[0], c[1]);
    ok(r.found && r.peak.decade === c[2] && r.peak.rank === c[3], c[0] + ' 巔峰應為 ' + c[2] + ' 年代第 ' + c[3] + ' 名，得到 ' + JSON.stringify(r.peak));
  });
  ok(N.trendEnglish('Olivia', 'F').latest === 1 && N.trendEnglish('Liam', 'M').latest === 1, '2024 年第一名');
  ok(N.trendEnglish('Olivia', 'F').top2025 === 1 && N.trendEnglish('Eliana', 'F').top2025 === 10, '2025 前十名');
  ok(N.trendEnglish('olivia smith', '').name === 'Olivia', '大小寫與姓氏');
  ok(N.trendEnglish('Emma', 'F').trend === 'steady', 'Emma 第 1 → 2 名應為持平');
  ok(N.trendEnglish('Linda', 'F').trend === 'falling' || N.trendEnglish('Linda', 'F').trend === 'steady', 'Linda 趨勢');
  ok(N.trendEnglish('Theodore', 'M').trend === 'rising', 'Theodore 上升');
  ok(N.trendEnglish('Zzyqxv', '').found === false, '沒收錄的名字');
  ok(N.trendEnglish('', '').error, '空白輸入');
  // 不指定性別時取排名較好的：Taylor 在女性較高
  ok(N.trendEnglish('Taylor', '').sex === 'F', 'Taylor 不指定性別');
  // 全部名字都能查、欄位完整
  ['F', 'M'].forEach(function(sex) {
    T.us[sex].split('|').forEach(function(row) {
      var name = row.split(':')[0], r = N.trendEnglish(name, sex);
      ok(r.found && r.decades.length === T.us.decades.length && r.peak.rank >= 1 && r.era && r.trend, name + ' 查詢結果');
    });
  });
});

section('中文名時代感', function() {
  T.tw.decades.forEach(function(d) {
    ['M', 'F'].forEach(function(sex) {
      d[sex].forEach(function(p, k) {
        var r = N.trendChinese(p[0]);
        ok(!r.error && r.hits.some(function(h) { return h.label === d.label && h.sex === sex && h.rank === k + 1 && h.count === p[1]; }), p[0] + ' 應在 ' + d.label + ' 第 ' + (k + 1) + ' 名');
      });
    });
  });
  var r = N.trendChinese('陳家豪');
  ok(r.given === '家豪' && r.overall && r.overall.rank === 1, '全名拆出名字、全國第一');
  ok(N.trendChinese('淑芬').overall.sex === 'F', '淑芬全國女性');
  ok(N.trendChinese('志玲').charEra.from === 1971, '志玲用字推估民國 60 年代');
  ok(N.trendChinese('晴恩').charEra.from >= 2011, '晴恩用字推估民國 100 年後');
  ok(N.trendChinese('Olivia').error, '英文輸入要回錯誤');
  for (var i = 0; i < 5000; i++) {
    var name = pick(SURNAMES) + pick(nameChars) + pick(nameChars);
    var x = N.trendChinese(name);
    ok(!x.error && x.given.length >= 1 && typeof x.era === 'string' && x.era.indexOf('undefined') < 0, name + ' 時代感');
  }
});

section('品牌命名評分', function() {
  var bad = ctx.Phonetics.BAD_WORDS.filter(function(w) { return w[3] !== 'exact'; });
  var flagged = 0, tested = 0;
  bad.forEach(function(w) {
    // 用拼音庫中讀音完全相同的字組出品牌名，應被抓到諧音
    var sylls = w[0].split(' ');
    var chars = sylls.map(function(py) { return nameChars.filter(function(c) { return ctx.PinyinDB.CHAR[c] === py; })[0]; });
    if (chars.some(function(c) { return !c; })) return;
    tested++;
    var r = N.scoreBrand(chars.join(''));
    if (r.items.some(function(x) { return x.label === '諧音' && x.pts <= -15; })) flagged++;
    else ok(false, chars.join('') + ' 應有諧音「' + w[1] + '」');
  });
  ok(tested > 50, '可組出的諧音詞 ' + tested);
  console.log('   諧音詞 ' + flagged + '/' + tested + ' 被抓到');

  ok(N.scoreBrand('森月').slug === 'senyue', '中文轉拼音網域');
  ok(N.scoreBrand('Luma Studio').slug === 'lumastudio', '英文網域');
  ok(N.scoreBrand('綠').items.some(function(x) { return x.label === '長度' && x.pts === 0; }), '一字品牌名');
  ok(N.scoreBrand('Dick').items.some(function(x) { return x.label === '聯想' && x.pts < 0; }), 'Dick 俚語');
  ok(N.scoreBrand('Luma森').kind === 'mixed', '中英混合');
  ok(N.scoreBrand('').error, '空白輸入');
  ok(!N.scoreBrand('123').error, '純數字不應出錯');

  var translit = Object.keys(ctx.EnglishTranslit || {});
  var inputs = translit.slice();
  for (var i = 0; i < 3000; i++) {
    var len = 1 + Math.floor(rand() * 5), s = '';
    for (var k = 0; k < len; k++) s += pick(nameChars);
    inputs.push(s);
    var e = '';
    for (k = 0; k < 2 + Math.floor(rand() * 10); k++) e += pick('abcdefghijklmnopqrstuvwxyz');
    inputs.push(e);
  }
  inputs.forEach(function(s) {
    var r = N.scoreBrand(s);
    ok(!r.error && r.score >= 0 && r.score <= 100 && r.items.length >= 1 && /^[a-z0-9]*$/.test(r.slug), s + ' 評分 ' + JSON.stringify(r));
  });
});

section('網域查詢結果判讀（模擬 RDAP）', function() {
  var calls = [];
  var fake = function(url) {
    calls.push(url);
    if (/\.com$/.test(url)) return Promise.resolve({ status: 200 });
    if (/\.net$/.test(url)) return Promise.resolve({ status: 404 });
    if (/\.io$/.test(url)) return Promise.resolve({ status: 429 });
    return Promise.reject(new Error('offline'));
  };
  return N.checkDomains('senyue', fake).then(function(list) {
    var st = {};
    list.forEach(function(d) { st[d.tld] = d.status; });
    ok(st.com === 'taken' && st.net === 'free' && st.io === 'error' && st.app === 'error', '狀態判讀 ' + JSON.stringify(st));
    ok(calls[0] === 'https://rdap.verisign.com/com/v1/domain/senyue.com', 'RDAP 網址 ' + calls[0]);
    asyncDone('網域查詢');
  });
});

section('Big Five 計分', function() {
  var FACTORS = N.FACTORS;
  var all = function(pos, neg) { return FACTORS.map(function(q) { return q[2] > 0 ? pos : neg; }); };
  var hi = N.scoreBigFive(all(5, 1)), lo = N.scoreBigFive(all(1, 5)), mid = N.scoreBigFive(all(3, 3));
  Object.keys(hi).forEach(function(k) {
    ok(hi[k].score === 100 && hi[k].level === '偏高', k + ' 最高');
    ok(lo[k].score === 0 && lo[k].level === '偏低', k + ' 最低');
    ok(mid[k].score === 50 && mid[k].level === '中等', k + ' 中間');
  });
  // 每個因素兩題 × 5 × 5 種組合
  for (var a = 1; a <= 5; a++) for (var b = 1; b <= 5; b++) {
    var ans = FACTORS.map(function(q) { return q[2] > 0 ? a : b; });
    var r = N.scoreBigFive(ans);
    var expect = Math.round(((a + 6 - b) / 2 - 1) / 4 * 100);
    Object.keys(r).forEach(function(k) { ok(r[k].score === expect, k + ' ' + a + '/' + b + ' 應為 ' + expect + '，得到 ' + r[k].score); });
  }
  ok(N.scoreBigFive([]).O.score === 50, '沒作答以 3 分計');
});

section('家庭命名規劃', function() {
  var r = N.checkFamily({ candidate: '王怡蘊', parents: ['王大明', '林小美'], siblings: ['王子晴'] });
  ok(!r.error && !r.blocked && r.warns.length === 0 && r.pairs.length === 3, '一般情況 ' + JSON.stringify(r.warns));
  r = N.checkFamily({ candidate: '王子晴', siblings: ['王子晴'] });
  ok(r.blocked, '和手足同名要擋下');
  r = N.checkFamily({ candidate: '王明軒', parents: ['王大明'] });
  ok(r.warns.some(function(w) { return w.indexOf('「明」') >= 0; }), '用了家長的字');
  r = N.checkFamily({ candidate: '王銘軒', parents: ['王大明'] });
  ok(r.warns.some(function(w) { return w.indexOf('同音') >= 0; }), '和家長同音（銘／明）');
  r = N.checkFamily({ candidate: '王子安', siblings: ['王子晴'] });
  ok(r.infos.some(function(w) { return w.indexOf('輩分字') >= 0; }) && !r.blocked, '手足共用輩分字');
  r = N.checkFamily({ candidate: '王宇', parents: ['林小美'] });
  ok(!r.error && r.warns.length === 0, '單名不該誤判重字（舊版 charAt(1) 為空字串時必定判定重字）');
  r = N.checkFamily({ candidate: '王大明', parents: ['王大明'] });
  ok(r.blocked, '和家長同名');
  ok(N.checkFamily({ candidate: '王' }).error, '只有姓');
  ok(N.checkFamily({ candidate: 'Tom' }).error, '英文');
  r = N.checkFamily({ candidate: '王怡蘊', parents: ['abc'] });
  ok(r.infos.some(function(w) { return w.indexOf('略過') >= 0; }), '無法辨識的家人要提示');

  for (var i = 0; i < 3000; i++) {
    var sur = pick(SURNAMES);
    var gen = pick(nameChars);
    var cand = sur + gen + pick(nameChars);
    var sib = sur + gen + pick(nameChars);
    var pa = sur + pick(nameChars) + pick(nameChars), pb = pick(SURNAMES) + pick(nameChars) + pick(nameChars);
    var x = N.checkFamily({ candidate: cand, parents: [pa, pb], siblings: [sib] });
    if (x.error) { ok(false, cand + ' ' + x.error); continue; }
    ok(x.blocked === (cand === sib || cand === pa || cand === pb), cand + ' blocked 判斷');
    var shareSib = cand !== sib;
    ok(!shareSib || x.infos.concat(x.warns).some(function(w) { return w.indexOf(sib) >= 0; }), cand + ' 應提到共用輩分字的手足 ' + sib);
    x.pairs.forEach(function(p) { ok(p.score >= 0 && p.score <= 100, cand + ' × ' + p.name + ' 分數 ' + p.score); });
    // 用了家長名字的字 ⇔ 有對應警告
    var pGiven = ctx.ChineseNumerology.analyze(pa).parsed.givenNameChars;
    var cGiven = ctx.ChineseNumerology.analyze(cand).parsed.givenNameChars;
    var uses = cGiven.some(function(c) { return pGiven.indexOf(c) >= 0; });
    ok(cand === pa || uses === x.warns.some(function(w) { return w.indexOf('用了家長「' + pa + '」') >= 0; }), cand + ' 家長 ' + pa + ' 重字判斷');
  }
});

section('寶寶取名', function() {
  var B = ctx.BabyName;
  var genders = ['male', 'female', ''];
  var EL = ['木', '火', '土', '金', '水'];
  for (var i = 0; i < 300; i++) {
    var sur = SURNAMES[i % SURNAMES.length];
    var fav = [pick(EL)], unfav = EL.filter(function(e) { return e !== fav[0]; }).slice(0, 1);
    var opts = { surname: sur, gender: genders[i % 3], single: i % 7 === 0, favorable: fav, unfavorable: unfav, avoid: i % 5 === 0 ? '明' : '' };
    if (i % 4 === 0) opts.generation = { c: pick('子承宇家品思'.split('')), pos: 1 + (i % 2) };
    var r = B.suggest(opts);
    if (r.error) { ok(false, sur + ' ' + r.error); continue; }
    ok(r.candidates.length > 0, sur + ' 應有候選 ' + JSON.stringify(opts));
    r.candidates.forEach(function(c) {
      ok(c.name.indexOf(sur) === 0, c.name + ' 以姓開頭');
      ok(!c.analysis.error && !(c.analysis.unknownChars || []).length, c.name + ' 五格可計算');
      ok(!c.phonetics || c.phonetics.grade !== '需注意', c.name + ' 音韻需注意的應排除');
      if (opts.avoid) ok(c.name.slice(sur.length).indexOf('明') < 0, c.name + ' 避諱字');
      if (opts.generation) ok(c.name.charAt(sur.length + opts.generation.pos - 1) === opts.generation.c, c.name + ' 輩分字位置');
      if (r.single) ok(c.name.length === sur.length + 1, c.name + ' 單名');
    });
  }
  ok(B.suggest({ surname: '' }).error, '沒有姓氏');
});

section('外國人取中文名', function() {
  var F = ctx.ForeignName;
  var names = Object.keys(ctx.EnglishTranslit || {});
  ok(names.length > 200, '譯名數量 ' + names.length);
  names.forEach(function(n) {
    ['male', 'female', ''].forEach(function(g) {
      var r = F.suggest({ english: n + ' Smith', gender: g, traits: [] });
      ok(!r.error && r.candidates.length > 0, n + ' ' + g + ' 應有候選');
      (r.candidates || []).forEach(function(c) {
        var a = ctx.ChineseNumerology.analyze(c.name);
        ok(!a.error && !(a.unknownChars || []).length, n + ' → ' + c.name + ' 五格可計算');
      });
    });
  });
  ok(F.suggest({ english: '' }).error, '空白輸入');
});

section('易經起卦', function() {
  var I = ctx.IChing;
  var ORDER = ['乾','兌','離','震','巽','坎','艮','坤'];
  var IMG = { '天':'乾', '地':'坤', '雷':'震', '風':'巽', '水':'坎', '火':'離', '山':'艮', '澤':'兌' };
  // 卦名首二字就是上卦、下卦；用名字反查卦序，等於同時驗證對照表與 HEXAGRAMS 的排列一致
  I.getAllHexagrams().forEach(function(h) {
    var pure = h.n.match(/^(.+)為(.)$/);
    var up = pure ? pure[1] : IMG[h.n[0]];
    var low = pure ? pure[1] : IMG[h.n[1]];
    var idx = I.HEXAGRAMS.indexOf(h);
    ok(I.nameToHexagram({ grids: { ren: { number: ORDER.indexOf(up) + 1 }, di: { number: ORDER.indexOf(low) + 1 }, zong: { number: 1 } } }).hexIndex === idx,
      h.n + ' 由上卦' + up + '、下卦' + low + '應得第 ' + idx + ' 卦');
  });
  // 變卦：動爻陰陽翻轉，六爻都要取得到，且不會等於本卦
  I.getAllHexagrams().forEach(function(h) {
    var pure = h.n.match(/^(.+)為(.)$/);
    var up = pure ? pure[1] : IMG[h.n[0]];
    var low = pure ? pure[1] : IMG[h.n[1]];
    for (var y = 1; y <= 6; y++) {
      var ch = I.changedHexagram({ upperTrigram: up, lowerTrigram: low, movingYao: y });
      ok(ch && ch.n !== h.n, h.n + ' 第' + y + '爻動應有變卦且不等於本卦');
    }
  });
  // 已知事實：乾為天初爻動 → 天風姤；坤為地初爻動 → 地雷復；離為火三爻動 → 火雷噬嗑
  var known = [['乾','乾',1,'天風姤'], ['乾','乾',5,'火天大有'], ['坤','坤',1,'地雷復'],
               ['離','離',3,'火雷噬嗑'], ['坎','震',1,'水地比'], ['坎','震',3,'水火既濟']];
  known.forEach(function(k) {
    ok(I.changedHexagram({ upperTrigram: k[0], lowerTrigram: k[1], movingYao: k[2] }).n === k[3],
      '上' + k[0] + '下' + k[1] + ' 第' + k[2] + '爻動應為' + k[3]);
  });
  // 陳小明：人格 19 % 8 = 3 → 離、地格 11 % 8 = 3 → 離
  var cn = ctx.ChineseNumerology.analyze('陳小明');
  ok(I.nameToHexagram(cn).hexName === '離為火', '陳小明應起得離為火');

  // 爻辭：64 卦 × 6 爻，爻題的九／六必須與卦象的陽／陰爻一致（由卦名推上下卦，獨立於 iching.js）
  var BITS = { '乾': '111', '兌': '110', '離': '101', '震': '100', '巽': '011', '坎': '010', '艮': '001', '坤': '000' };
  var POS = ['初', '二', '三', '四', '五', '上'];
  var Y = ctx.IChingYao;
  ok(Y && Object.keys(Y).length === 64, '爻辭收錄 64 卦');
  I.getAllHexagrams().forEach(function(h, k) {
    var pure = h.n.match(/^(.+)為(.)$/);
    var up = pure ? pure[1] : IMG[h.n[0]], low = pure ? pure[1] : IMG[h.n[1]];
    var lines = (BITS[low] + BITS[up]).split('');
    var yao = Y[k + 1];
    ok(yao && yao.length === 6, h.n + ' 六爻齊全');
    (yao || []).forEach(function(y, i) {
      var label = y[0];
      ok(label.indexOf(POS[i]) >= 0, h.n + ' 第' + (i + 1) + '爻爻題 ' + label);
      ok(label.indexOf(lines[i] === '1' ? '九' : '六') >= 0, h.n + ' 第' + (i + 1) + '爻陰陽：' + label + ' 應為' + (lines[i] === '1' ? '陽' : '陰'));
      ok(y[1].length >= 2 && y[2].length >= 10 && !/[{}<>|\[\]「」]/.test(y[1]), h.n + ' ' + label + ' 原文與白話');
      var r = ctx.DeepReadings.getHexagramDeepReading({ hexIndex: k + 1, hexName: h.n, hexUnicode: h.u, element: h.el, glory: h.g, description: h.d,
        upperTrigram: up, lowerTrigram: low, movingYao: i + 1 }, cn);
      ok(r.indexOf(label + '：' + y[1]) >= 0 && r.indexOf('白話：') >= 0 && r.indexOf('未載入') < 0, h.n + ' ' + label + ' 深度解讀含爻辭');
    });
  });
  // 已知原文（易錯字）：兩個來源曾不一致的地方
  var known = { '9-3': '輿說輻', '10-6': '考祥', '26-4': '童牛之牿', '30-3': '大耋之嗟', '52-5': '言有序', '59-1': '用拯馬壯，吉。', '61-4': '月幾望', '12-5': '繫于苞桑', '24-1': '无祇悔' };
  Object.keys(known).forEach(function(key) {
    var p = key.split('-');
    ok(Y[p[0]][p[1] - 1][1].indexOf(known[key]) >= 0, '第' + p[0] + '卦第' + p[1] + '爻應含「' + known[key] + '」：' + Y[p[0]][p[1] - 1][1]);
  });
});

section('喜用神（扶抑法）', function() {
  var Z = ctx.ZodiacBazi, P = ctx.Professional, B = ctx.BabyName;
  ok(Z && typeof Z.xiYongShen === 'function', 'ZodiacBazi.xiYongShen 存在（八字引擎擁有扶抑法）');

  var bz = Z.fullBazi(1990, 5, 15, 10, 30, 8);
  ok(!!bz && !!bz.dayMaster, '八字可計算');
  // 取名與鑑定書必須是同一套實作
  ok(JSON.stringify(B.xiYong(bz)) === JSON.stringify(Z.xiYongShen(bz)), 'BabyName.xiYong 與 ZodiacBazi.xiYongShen 同源');

  var xy = Z.xiYongShen(bz);
  ok(xy.favorable.length === 2, '喜用為用神＋喜神兩個');
  ok(xy.favorable.indexOf(xy.yong) >= 0 && xy.favorable.indexOf(xy.xi) >= 0, 'favorable 含用神與喜神');
  ok(xy.unfavorable.indexOf(xy.yong) < 0 && xy.unfavorable.indexOf(xy.xi) < 0, '忌神不與喜用重疊');
  ok(xy.favorable.every(function(e) { return xy.unfavorable.indexOf(e) < 0; }), '喜用與忌神互斥');
  ok(xy.score[xy.dayMaster] > 0, '日主本身有計分');
  ok(xy.ratio >= 0 && xy.ratio <= 1, '同黨比例 ' + xy.ratio.toFixed(3));
  ok((xy.ratio >= 0.5) === (xy.strength === '身強' || xy.strength === '中和偏強'), '強弱與比例一致：' + xy.strength);
  ok(xy.missing.every(function(e) { return xy.score[e] === 0; }), '八字缺＝得分為 0 的五行');

  // 五行生剋：身弱取印（生我）比（同我），身強取官殺／財／食傷
  var GEN = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
  var genBy = function(e) { for (var k in GEN) if (GEN[k] === e) return k; };
  if (xy.strength === '身弱' || xy.strength === '中和偏弱') {
    ok(xy.yong === genBy(xy.dayMaster) && xy.xi === xy.dayMaster, '身弱用印比：用' + xy.yong + '、喜' + xy.xi);
  }

  // 回歸測試：喜用神只看八字。舊版用名字五格的五行數量推日主強弱，
  // 同一個時辰出生的人會因為名字不同而得到不同的喜用神。
  var zodiac = Z.fullAnalysis(1990, 5, 15, 10, 30, 8);
  var names = ['陳小明', '林大維', '黃美玲', '張家豪', '王金水', '李木火'];
  var sigs = names.map(function(n) {
    var rep = P.generateReport({ label: '' }, ctx.ChineseNumerology.analyze(n), null, zodiac);
    var x = rep && rep.xiYong;
    return x ? [x.strength, x.yong, x.xi, x.favorable.join(''), x.unfavorable.join('')].join('|') : 'null';
  });
  ok(sigs.every(function(s) { return s !== 'null' && s === sigs[0]; }), '同一八字不同名字 → 相同喜用神（' + sigs.join(' / ') + '）');

  // 名字只影響「補到了沒」，不影響命格判定
  var withName = P.generateReport({ label: '' }, ctx.ChineseNumerology.analyze('陳小明'), null, zodiac).xiYong;
  ok(withName.nameHits.length + withName.nameMissing.length === 2, '名字命中／未命中加起來等於喜用數');
  ok(withName.nameHits.every(function(e) { return withName.favorable.indexOf(e) >= 0; }), 'nameHits 只會是喜用五行');

  // 沒有八字時不該硬生喜用神
  ok(P.generateReport({ label: '' }, ctx.ChineseNumerology.analyze('陳小明'), null, null).xiYong === null, '無八字 → 無喜用神');
  ok(P.generateReport({ label: '' }, ctx.ChineseNumerology.analyze('陳小明'), null, { yearPillar: null, dayMaster: null }).xiYong === null, '只有年柱 → 無喜用神');
});

section('生日靈數', function() {
  var E = ctx.EnglishNumerology;
  var VALID = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33];
  var b = { year: 1990, month: 5, day: 15 };
  // 手算：月 5、日 15→6、年 1990→19→10→1
  ok(E.getLifePath(b) === 3, '1990-05-15 生命靈數 3');
  ok(E.getPinnacleNumbers(b).map(function(p) { return p.number; }).join() === '11,7,9,6', '高峰數 11／7／9／6');
  ok(E.getChallengeNumbers(b).map(function(c) { return c.number; }).join() === '1,5,4,4', '挑戰數 1／5／4／4');
  ok(E.getPinnacleNumbers(b)[0].endAge === 33, '第一高峰到 36−3＝33 歲');
  ok(E.getPersonalYear(b, 2026).number === 3, '2026 個人年 3（5＋6＋1＝12→3）');
  ok(E.getLifeCycleNumbers(b).map(function(c) { return c.number; }).join() === '5,6,1', '生命週期取月、日、年');
  // 名字不影響任何生日數字（與喜用神同一個教訓：生日的性質不能從名字推）
  var a1 = E.getAdvancedNumbers(E.analyze('John Smith'), b), a2 = E.getAdvancedNumbers(E.analyze('Mary Ann Lee'), b);
  ok(JSON.stringify([a1.lifePath, a1.pinnacles, a1.challenges, a1.cycles]) === JSON.stringify([a2.lifePath, a2.pinnacles, a2.challenges, a2.cycles]), '不同名字、同一生日 → 生日數字相同');
  ok(a1.maturity === E.reduceNumber(a1.lifePath + E.analyze('John Smith').destiny), '成熟數＝生命靈數＋命運數');
  var none = E.getAdvancedNumbers(E.analyze('John Smith'), null);
  ok(none.balance && none.lifePath === null && none.pinnacles === null && none.maturity === null, '沒有生日 → 只有平衡數');
  ok(E.getAdvancedNumbers(E.analyze('John Smith'), { year: 1990, month: 5 }).lifePath === null, '缺日 → 不計算');

  // 1900–2100 每一天
  var d = new Date(Date.UTC(1900, 0, 1)), end = Date.UTC(2100, 11, 31);
  for (; d.getTime() <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    var bd = { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
    var tag = bd.year + '-' + bd.month + '-' + bd.day;
    var lp = E.getLifePath(bd);
    ok(VALID.indexOf(lp) >= 0, tag + ' 生命靈數 ' + lp);
    var pins = E.getPinnacleNumbers(bd);
    ok(pins[0].endAge === 36 - E.reduceSingle(lp) && pins[0].endAge >= 27 && pins[0].endAge <= 35, tag + ' 第一高峰結束年齡');
    ok(pins[1].startAge === pins[0].endAge + 1 && pins[2].startAge === pins[1].endAge + 1 && pins[3].startAge === pins[2].endAge + 1 && pins[3].endAge === null, tag + ' 高峰年齡連續');
    ok(pins.every(function(p) { return VALID.indexOf(p.number) >= 0; }), tag + ' 高峰數有效');
    var ch = E.getChallengeNumbers(bd);
    ok(ch.every(function(c) { return c.number >= 0 && c.number <= 8 && c.desc; }) && ch[2].number === Math.abs(ch[0].number - ch[1].number), tag + ' 挑戰數');
    var cy = E.getLifeCycleNumbers(bd);
    ok(cy[0].endAge === pins[0].endAge && cy[1].startAge === cy[0].endAge + 1 && cy[2].startAge === cy[1].endAge + 1, tag + ' 生命週期與高峰對齊');
  }
  // 個人年每年 +1，九年一輪（含 2009、2029 這類年份本身是大師數的情況）
  for (var y = 1990; y < 2060; y++) {
    var py = E.getPersonalYear(b, y).number, nx = E.getPersonalYear(b, y + 1).number;
    ok(nx === py % 9 + 1, y + '→' + (y + 1) + ' 個人年 ' + py + '→' + nx);
  }
});

section('改名對比', function() {
  var P = ctx.Professional, CN = ctx.ChineseNumerology;
  var same = P.compareNames('陳小明', '陳小明');
  ok(same.improvement === 0 && same.gridChanges.every(function(g) { return !g.changed; }), '同名 → 無變化');
  ok(same.verdict === '吉凶數相同', '同名 verdict：' + same.verdict);
  var viaObj = P.compareNames(CN.analyze('陳小明'), '陳大明');
  ok(viaObj.oldName === '陳小明' && !viaObj.error, '原名可傳分析結果');
  ok(P.compareNames('陳小明', '陳龘明').error && P.compareNames('陳小明', '陳龘明').unknownChars[0] === '龘', '新名字有未知字 → 回報錯誤，不以 0 劃硬算');
  ok(!P.compareNames('陳小明', '陳龘明', null, { '龘': 48 }).error, '手動筆劃可用於新名字');
  var fav = ['火', '水'];
  var c = P.compareNames('陳小明', '陳大維', fav);
  ok(c.oldHits.every(function(e) { return fav.indexOf(e) >= 0; }) && c.newHits.every(function(e) { return fav.indexOf(e) >= 0; }), '喜用命中只會是喜用五行');
  ok(P.compareNames('陳小明', '陳大維').oldHits === null, '沒給喜用 → 不比喜用');
  // 隨機名字：improvement 與吉凶數一致
  for (var i = 0; i < 3000; i++) {
    var n1 = pick(SURNAMES) + pick(nameChars) + pick(nameChars), n2 = n1[0] + pick(nameChars) + pick(nameChars);
    var r = P.compareNames(n1, n2);
    ok(r && !r.error && r.improvement === (r.newGood - r.oldGood) + (r.oldBad - r.newBad), n1 + '→' + n2 + ' 改善分數一致');
  }
});

section('吉數姓名推薦', function() {
  var G = ctx.NameGenerator, CN = ctx.ChineseNumerology;
  ok(G.AUSPICIOUS_NUMBERS.join() === '1,3,5,6,7,8,11,13,15,16,17,18,21,23,24,25,31,32,33,35,37,39,41,45,47,48,52,57,58,61,63,65,67,68,81', '吉數表由 81 數推導，與原本一致');
  var tag = {};
  ctx.NameChars.forEach(function(l) { var p = l.split('|'); tag[p[0]] = p[3] + (p[4] || ''); });
  var ALLOWED = { male: 'mn', female: 'fn', '': 'mfn' };
  SURNAMES.concat(['歐陽', '司馬', '諸葛']).forEach(function(sn) {
    ['male', 'female', ''].forEach(function(g) {
      var list = G.suggestNames(sn, g);
      ok(list.length >= 6 && !list[0].note, sn + '（' + (g || '全部') + '）至少 6 個推薦：' + list.length);
      var seen = {};
      list.forEach(function(r) {
        var cn = CN.analyze(r.name);
        ok(!cn.hasUnknown && ['tian', 'ren', 'di', 'wai', 'zong'].every(function(k) { return cn.grids[k].number === r.grids[k]; }), r.name + ' 五格與全站分析一致');
        ok(G.isAuspicious(r.grids.ren) && r.goodCount >= 3, r.name + ' 人格吉且至少三吉');
        ok(r.element === cn.grids.ren.element, r.name + ' 人格五行一致');
        r.chars.forEach(function(c) {
          ok(tag[c] && tag[c].indexOf('t') < 0 && ALLOWED[g].indexOf(tag[c][0]) >= 0, r.name + ' 的「' + c + '」符合性別（' + (g || '全部') + '）：' + tag[c]);
          ok(!seen[c], sn + ' 同一批不重複用字：' + c);
          seen[c] = true;
        });
      });
      for (var i = 1; i < list.length; i++) ok(list[i - 1].goodCount >= list[i].goodCount, sn + ' 依吉數多寡排序');
    });
  });
  // 單姓「歐」配上「陽」字會變成複姓「歐陽」：不能產生這種名字（五格會跟著變）
  for (var t = 0; t < 200; t++) {
    ['歐', '司', '諸'].forEach(function(sn) {
      G.suggestNames(sn, '').forEach(function(r) { ok(CN.analyze(r.name).parsed.surname === sn, sn + ' → ' + r.name + ' 姓氏仍為' + sn); });
    });
  }
  // 男生不會出現女性字、女生不會出現男性字（舊版選「男」與「全部」同一份字表）
  var maleF = 0, femaleM = 0;
  for (var k = 0; k < 50; k++) {
    G.suggestNames('陳', 'male').forEach(function(r) { r.chars.forEach(function(c) { if (tag[c][0] === 'f') maleF++; }); });
    G.suggestNames('陳', 'female').forEach(function(r) { r.chars.forEach(function(c) { if (tag[c][0] === 'm') femaleM++; }); });
  }
  ok(maleF === 0 && femaleM === 0, '性別不混用（男出現女性字 ' + maleF + '、女出現男性字 ' + femaleM + '）');
  // 姓氏是罕用字：沒有手動筆劃時說明原因，有手動筆劃時照常推薦
  var none = G.suggestNames('龘', 'male');
  ok(none.length === 1 && none[0].note && none[0].unknownChars[0] === '龘', '罕用姓氏 → 說明原因');
  var manual = G.suggestNames('龘', 'male', { '龘': 48 });
  ok(manual.length >= 6 && manual.every(function(r) { return CN.analyze(r.name, { '龘': 48 }).grids.ren.number === r.grids.ren; }), '罕用姓氏＋手動筆劃 → 照常推薦且五格正確');
});

var pending = 1;
function asyncDone() {
  if (--pending) return;
  console.log('\n' + checks + ' 項檢查，' + (failures ? failures + ' 項失敗' : '全部通過'));
  process.exit(failures ? 1 : 0);
}
