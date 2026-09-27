/**
 * 取名工具的大量檢查（不需要瀏覽器）：node tools/test-naming.js
 * 涵蓋：姓名熱門度、品牌命名、Big Five、家庭命名規劃、寶寶取名、外國人取中文名
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
  'data/name-chars', 'data/char-element', 'data/english-translit', 'foreign-name', 'baby-name',
  'data/name-trends', 'naming-extensions'
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

var pending = 1;
function asyncDone() {
  if (--pending) return;
  console.log('\n' + checks + ' 項檢查，' + (failures ? failures + ' 項失敗' : '全部通過'));
  process.exit(failures ? 1 : 0);
}
