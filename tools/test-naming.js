/**
 * 取名工具的大量檢查（不需要瀏覽器）：node tools/test-naming.js
 * 涵蓋：姓名熱門度、品牌命名、Big Five、家庭命名規劃、寶寶取名、外國人取中文名、易經起卦、喜用神、生日靈數、改名對比、吉數姓名推薦、卡巴拉生命樹
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
  'data/iching-yao', 'deep-readings', 'lunar', 'ziwei', 'ziwei-reading'
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
    // 品牌調性：只多列「調性契合」，基礎項目不變；分數＝基礎＋調性加減（夾在 0–100）
    var raw = 50 + r.items.reduce(function(a, x) { return a + x.pts; }, 0);
    ok(r.items.every(function(x) { return x.key !== 'toneFit'; }), s + ' 沒給調性不應有調性項目');
    ['trust', 'warm', 'bold', 'calm'].forEach(function(t) {
      var rt = N.scoreBrand(s, t);
      var base = rt.items.filter(function(x) { return x.key !== 'toneFit'; });
      var fit = rt.items.filter(function(x) { return x.key === 'toneFit'; });
      ok(JSON.stringify(base) === JSON.stringify(r.items), s + ' ' + t + ' 基礎項目不變');
      ok(rt.score === Math.max(0, Math.min(100, raw + fit.reduce(function(a, x) { return a + x.pts; }, 0))), s + ' ' + t + ' 分數＝基礎＋調性');
      var severe = r.items.some(function(x) { return (x.key === 'slang' && x.pts < 0) || (x.key === 'homophone' && x.pts <= -15); });
      ok(!severe || fit.every(function(x) { return x.pts < 0; }), s + ' ' + t + ' 有嚴重諧音／俚語時不加分');
    });
  });
  var fitOf = function(n, t) { return N.scoreBrand(n, t).items.filter(function(x) { return x.key === 'toneFit'; }).map(function(x) { return x.pts; }); };
  ok(fitOf('森月', 'calm').indexOf(10) >= 0 && fitOf('新創科技', 'calm').indexOf(-5) >= 0, '自然療癒：森月有自然意象、新創科技沒有');
  ok(fitOf('Kodex', 'calm').indexOf(-5) >= 0 && fitOf('Luma', 'calm').indexOf(5) >= 0, '自然療癒：Kodex 硬音、Luma 柔和');
  ok(fitOf('Luma', 'bold').indexOf(5) >= 0 && fitOf('A1', 'bold').length === 1, '創新有力：3–5 個字母才算短（A1 只有數字加分）');
  ok(fitOf('Kodex', 'bold').join() === '5,5' && fitOf('Luma', 'bold').join() === '5', '創新有力：硬音另外加分');
  ok(fitOf('乖乖', 'warm').indexOf(10) >= 0 && fitOf('乖乖', 'warm').indexOf(-5) < 0, '溫暖親和：疊字加分、不算聲調平板');
  ok(fitOf('國泰', 'trust').indexOf(10) >= 0 && fitOf('Bobo', 'trust').indexOf(-5) >= 0, '專業可信：穩重的字加分、疊字扣分');
  ok(fitOf('Luna', 'calm').join() === '5,5' && fitOf('Aveda', 'calm').join() === '5', '自然療癒：沒有爆破音另外加分');

  // 調性校準：用定位公認的真實品牌，檢查「本身的調性」拿到四種裡最高（平手算命中）
  // 校準組用來調整用字表與權重；留出組沒有參與調整，用來確認不是只背了案例
  // 2026-10-06 校準前：校準組 25/62、留出組 22/49（「創新有力」幾乎全拿第一）
  var BRAND_TONE = {
    tune: {
      trust: ['國泰', '富邦', '玉山', '中信', '華碩', '宏碁', '長榮', '中華電信', '台積電', '鴻海', 'Oracle', 'Cisco', 'Allianz', 'Siemens', 'Deloitte', 'Fidelity', 'Visa', 'Intel'],
      warm: ['全家', '義美', '乖乖', '小美', '好來', '麥當勞', 'Dove', 'Etsy', 'Airbnb', 'Hallmark', 'Huggies', 'Pampers', 'Lego', 'Bobo'],
      bold: ['小米', '蔚來', '極氪', '特斯拉', 'Gogoro', 'Tesla', 'Nike', 'Uber', 'Xbox', 'Zoom', 'Razer', 'Jeep', 'Red Bull', 'Vox'],
      calm: ['無印良品', '綠藤', '春水堂', '茶籽堂', '阿原', '雪花秀', '森林', '山水', 'Aesop', 'Lush', 'Calm', 'Muji', 'Aveda', 'Origins', 'Aura', 'Luna']
    },
    holdout: {
      trust: ['第一銀行', '統一', '遠東', '中鋼', '台塑', '大同', '新光', 'Boeing', 'Pfizer', 'Honeywell', 'Prudential', 'Mastercard', 'Philips'],
      warm: ['好市多', '樂事', '喜年來', '小熊', '甜心', '媽媽樂', 'Teddy', 'Lulu', 'Mochi', 'Yummy', 'Coco', 'Kleenex'],
      bold: ['酷澎', '極速', '戰鬥', 'Puma', 'Kodak', 'Raptor', 'Jolt', 'Monster', 'Hulk', 'Strike', 'Rocket'],
      calm: ['清心', '清淨', '花草', '靜心', '竹里', 'Breeze', 'Willow', 'Sage', 'Lumi', 'Serene', 'Mellow', 'Haven', 'Bloom']
    }
  };
  var TONE_KEYS = ['trust', 'warm', 'bold', 'calm'];
  var fitSum = function(n, t) { return N.scoreBrand(n, t).items.filter(function(x) { return x.key === 'toneFit'; }).reduce(function(s, x) { return s + x.pts; }, 0); };
  Object.keys(BRAND_TONE).forEach(function(set) {
    var hit = 0, total = 0, wins = { trust: 0, warm: 0, bold: 0, calm: 0 };
    TONE_KEYS.forEach(function(label) {
      BRAND_TONE[set][label].forEach(function(n) {
        var f = TONE_KEYS.map(function(t) { return fitSum(n, t); }), max = Math.max.apply(null, f);
        total++;
        if (f[TONE_KEYS.indexOf(label)] === max) hit++;
        var tied = f.filter(function(v) { return v === max; }).length;
        TONE_KEYS.forEach(function(t, i) { if (f[i] === max) wins[t] += 1 / tied; });
      });
    });
    TONE_KEYS.forEach(function(t) { wins[t] = Math.round(wins[t] * 10) / 10; });
    console.log('   調性校準 ' + set + '：' + hit + '/' + total + '，各調性拿最高（平手平分）' + JSON.stringify(wins));
    ok(hit / total >= 0.75, set + ' 命中率 ' + hit + '/' + total + ' 應 ≥ 75%');
    // 沒有單一調性「通吃」：拿最高的次數不超過 40%（校準前「創新有力」佔 63%）
    ok(TONE_KEYS.every(function(t) { return wins[t] <= total * 0.4; }), set + ' 沒有調性通吃 ' + JSON.stringify(wins));
  });
  ok(fitOf('Luma森', 'trust').indexOf(-5) >= 0 && fitOf('Luma森', 'bold').indexOf(5) >= 0, '中英混搭：專業扣分、創新可接受');
  ok(N.scoreBrand('Dick', 'trust').score < N.scoreBrand('Dick').score, '專業可信：負面俚語扣更多');
  ok(fitOf('Dick', 'bold').length === 0 && fitOf('Dick', 'warm').length === 0, 'Dick 在創新／溫暖都不加分');
  ok(N.scoreBrand('森月', 'nope').items.every(function(x) { return x.key !== 'toneFit'; }), '未知調性當作沒給');
});

section('品牌候選比較', function() {
  // 拆字串：各種分隔符、去重（英文不分大小寫）、最多 8 個
  var p = N.parseBrandCandidates(' 森月、Luma,luma，青禾;Kodex\n\n 森月 \r\nA；B、C、D、E、F ');
  ok(p.list.join('|') === '森月|Luma|青禾|Kodex|A|B|C|D' && p.skipped.join('|') === 'E|F', '拆分與去重 ' + JSON.stringify(p));
  ok(N.parseBrandCandidates('').list.length === 0 && N.parseBrandCandidates(null).list.length === 0, '空字串');

  var names = ['森月', 'Luma', 'Dick', '青禾', 'Kodex', '新創科技股份', 'A1'];
  ['trust', 'warm', 'bold', 'calm'].forEach(function(t) {
    var c = N.compareBrands(names, t);
    ok(c.tone === t && c.rows.length === names.length, t + ' 列數');
    c.rows.forEach(function(r, i) {
      var s = N.scoreBrand(r.name, t);
      ok(r.score === s.score, t + ' ' + r.name + ' 總分與單一評分一致');
      ok(r.base === N.scoreBrand(r.name).score, t + ' ' + r.name + ' 基礎分＝不帶調性的分數');
      var fits = ['trust', 'warm', 'bold', 'calm'].map(function(u) { return N.scoreBrand(r.name, u).items.filter(function(x) { return x.key === 'toneFit'; }).reduce(function(a, x) { return a + x.pts; }, 0); });
      ok(Math.max.apply(null, fits) > 0 ? r.bestTones.length >= 1 : r.bestTones.length === 0, t + ' ' + r.name + ' 最適合調性（沒有正分就不選）');
      ok(r.risks.every(function(x) { return x.pts < 0; }), t + ' ' + r.name + ' 風險都是扣分');
      if (i) {
        var q = c.rows[i - 1];
        ok(q.raw > r.raw || (q.raw === r.raw && q.base >= r.base), t + ' 依原始分、基礎分排序');
        ok(q.score >= r.score, t + ' 顯示的總分也不會倒序');
        ok(r.rank === (q.raw === r.raw && q.base === r.base ? q.rank : i + 1), t + ' 同分同名次');
      }
    });
    ok(c.rows[0].rank === 1, t + ' 第一名');
    ok(c.rows[c.rows.length - 1].name === 'Dick' || c.rows[c.rows.length - 1].score === c.rows.filter(function(r) { return r.name === 'Dick'; })[0].score, t + ' 負面俚語墊底');
  });
  ok(N.compareBrands(['森月', ''], 'calm').rows.length === 1, '空名字略過');
  ok(N.compareBrands(['森月', 'Luma'], 'nope').tone === 'trust', '未知調性用專業可信');
  var tie = N.compareBrands(['森月', '森月'.split('').reverse().join('')], 'calm');
  ok(tie.rows.length === 2, '兩列');
  // 封頂：森月、青禾都是 100，但原始分不同時要分出名次
  var cap = N.compareBrands(['青禾', '森月', '新創科技'], 'calm');
  ok(cap.rows.every(function(r) { return r.score === Math.max(0, Math.min(100, r.raw)); }), '總分＝原始分夾在 0–100');
  ok(cap.rows.filter(function(r) { return r.rank === 1; }).length === 1 || cap.rows[0].raw === cap.rows[1].raw, '封頂時用原始分分出第一');

  // 決策摘要
  var c = N.compareBrands(['森月', 'Luma', 'Dick'], 'calm');
  var md = N.brandDecisionSummary(c, { senyue: [{ tld: 'com', status: 'taken' }, { tld: 'net', status: 'free' }, { tld: 'io', status: 'error' }] }, '2026-10-06');
  ok(/^# 品牌命名決策摘要/.test(md) && /2026-10-06/.test(md) && /選定調性：自然療癒/.test(md), '摘要標頭');
  ok(/\| 1 \| 森月 \|/.test(md) || /\| 1 \| Luma \|/.test(md), '摘要排名表');
  var senRow = md.split('\n').filter(function(l) { return /\| 森月 \|/.test(l); })[0];
  ok(/已註冊 \| 查無 \| 失敗 \| 查詢中 \|$/.test(senRow), '網域欄：有結果的顯示狀態、沒查到的顯示查詢中 ' + senRow);
  ok(md.split('\n').filter(function(l) { return /^\| \d/.test(l); }).length === 3, '三列');
  ok(/### \d\. Dick[\s\S]*聯想/.test(md) && /不能取代商標檢索/.test(md), '扣分理由與免責聲明');
  ok(!/undefined|NaN|null/.test(md), '沒有 undefined');
  ok(N.compareBrands(['Dick', 'Luma'], 'calm').rows.filter(function(r) { return r.name === 'Dick'; })[0].bestTones.length === 0, 'Dick 沒有適合的調性');
  var pipe = N.brandDecisionSummary(N.compareBrands(['A|B', 'Luma'], 'bold'), {}, '2026-10-06');
  ok(/A\\\|B/.test(pipe), '名字裡的 | 會跳脫');
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

section('81 數循環（超過 81 減 80）', function() {
  var CN = ctx.ChineseNumerology, G = ctx.NameGenerator;
  for (var n = 1; n <= 81; n++) ok(CN.getFortune(n) === ctx.fortune81[n] && !CN.getFortune(n).reducedFrom, n + ' 直接查表');
  for (n = 82; n <= 400; n++) {
    var f = CN.getFortune(n), base = (n - 1) % 80 + 1;
    ok(f && f.glory === ctx.fortune81[base].glory && f.reducedFrom === n, n + ' → ' + base);
    ok(CN.digitToElement(n) === CN.digitToElement(base), n + ' 五行與 ' + base + ' 相同');
    ok(G.isAuspicious(n) === G.isAuspicious(base), n + ' 吉數判斷與 ' + base + ' 相同');
  }
  ok(CN.getFortune(82).glory === ctx.fortune81[2].glory && CN.getFortune(161).glory === ctx.fortune81[1].glory, '82 取 2、161 取 1');
  ok(ctx.fortune81[81].reducedFrom === undefined, '查表不會改到原始資料');
  ok(CN.getFortune(0) === null && CN.getFortune(-3) === null, '0 與負數無吉凶');
  // 實際名字：複姓＋兩個 25 劃的字，總格 82
  var r = CN.analyze('歐陽灝灞');
  ok(r.grids.zong.number > 81 && r.grids.zong.fortune && r.grids.zong.fortune.reducedFrom === r.grids.zong.number, '歐陽灝灞 總格 ' + r.grids.zong.number + ' 有吉凶');
  var counted = Object.keys(r.fortuneCounts).reduce(function(s, k) { return s + r.fortuneCounts[k]; }, 0);
  ok(counted === 5, '五格都計入吉凶統計：' + JSON.stringify(r.fortuneCounts));
  // 手動筆劃的罕用字
  r = CN.analyze('龘龘明', { '龘': 48 });
  ok(['tian', 'ren', 'di', 'wai', 'zong'].every(function(k) { return r.grids[k].fortune; }), '龘龘明 五格都有吉凶');
});

section('紫微十二宮解讀', function() {
  // 十四主星的排法只由紫微星位置決定（12 種）；每一組對宮至少有一顆主星，所以每宮都要有解讀
  var Z = ctx.Ziwei, R = ctx.ZiweiReading, layouts = {};
  for (var y = 1950; y < 2010 && Object.keys(layouts).length < 12; y++) for (var m = 1; m <= 12; m++) for (var h = 0; h < 24; h += 2) {
    var zw = Z.getZiweiChart(y, m, (y * 7 + m) % 28 + 1, h, '男');
    if (!zw || zw.needHour) continue;
    var key = zw.palaces.slice().sort(function(a, b) { return a.pos - b.pos; }).map(function(p) { return p.borrowed ? '' : p.stars.join('+'); }).join('|');
    if (layouts[key]) continue;
    layouts[key] = true;
    R.palaceReadings(zw).forEach(function(x) {
      ok(x.text && x.text.indexOf('undefined') < 0, y + '/' + m + ' ' + x.palace.name + '（' + x.palace.stars.join('+') + '）有解讀');
      if (x.palace.borrowed) {
        var opp = zw.palaces.filter(function(q) { return q.pos === (x.palace.pos + 6) % 12; })[0];
        ok(opp && !opp.borrowed, x.palace.name + ' 借星時對宮有主星');
      }
    });
    ok(R.mingReading(zw).paragraphs.length >= 2, y + '/' + m + ' 命宮綜合解讀');
  }
  ok(Object.keys(layouts).length === 12, '涵蓋 12 種主星排法：' + Object.keys(layouts).length);
});

section('卡巴拉生命樹（路徑與四個世界）', function() {
  var D = ctx.DeepReadings, E = ctx.EnglishNumerology, P = D.KABBALAH_PATHS;
  // 結構：22 條路徑、22 個不同字母、3 母 7 雙 12 單、每個質點都有路徑
  ok(P.length === 22 && P.every(function(x, i) { return x.p === 11 + i; }), '路徑編號 11–32');
  ok(new Set(P.map(function(x) { return x.l; })).size === 22 && new Set(P.map(function(x) { return x.h; })).size === 22, '22 個不同的希伯來字母');
  var cnt = function(k) { return P.filter(function(x) { return x.kind === k; }).length; };
  ok(cnt('母') === 3 && cnt('雙') === 7 && cnt('單') === 12, '3 母 7 雙 12 單');
  ok(new Set(P.map(function(x) { return x.a + '-' + x.b; })).size === 22 && P.every(function(x) { return x.a < x.b; }), '路徑不重複');
  var deg = {}; P.forEach(function(x) { deg[x.a] = (deg[x.a] || 0) + 1; deg[x.b] = (deg[x.b] || 0) + 1; });
  ok(JSON.stringify(deg) === JSON.stringify({ 1: 3, 2: 4, 3: 4, 4: 4, 5: 4, 6: 8, 7: 5, 8: 5, 9: 4, 10: 3 }), '各質點的路徑數（Tiphareth 8 條）' + JSON.stringify(deg));
  // 金色黎明的經典對照
  var at = function(p) { return P[p - 11]; };
  ok(at(11).l === 'Aleph' && at(11).t === '0 愚者' && at(11).a === 1 && at(11).b === 2, '路徑 11 Aleph 愚者 Kether–Chokmah');
  ok(at(13).l === 'Gimel' && at(13).b === 6, '路徑 13 Gimel 連 Kether–Tiphareth（跨越深淵）');
  ok(at(19).l === 'Teth' && at(19).t === 'VIII 力量' && at(22).l === 'Lamed' && at(22).t === 'XI 正義', '力量在 Teth、正義在 Lamed（Rider-Waite 牌序）');
  ok(at(32).l === 'Tav' && at(32).t === 'XXI 世界' && at(32).a === 9 && at(32).b === 10, '路徑 32 Tav 世界 Yesod–Malkuth');
  // 轉寫
  var heb = function(n) { return D.nameToHebrew(n).map(function(x) { return x.letter; }).join(' '); };
  ok(heb('David') === 'Daleth Aleph Vav Yod Daleth', 'David → ' + heb('David'));
  ok(heb('Sharon') === 'Shin Aleph Resh Ayin Nun', 'Sharon 先比對 SH → ' + heb('Sharon'));
  ok(heb('Theo Chen') === 'Tav Heh Ayin Cheth Heh Nun', 'TH、CH → ' + heb('Theo Chen'));
  ok(heb('Cecil') === 'Samekh Heh Samekh Yod Lamed' && heb('Carl') === 'Kaph Aleph Resh Lamed', '軟音 C → Samekh、硬音 C → Kaph');
  ok(heb('Max') === 'Mem Aleph Kaph Samekh', 'X → Kaph Samekh');
  ok(heb('') === '' && heb('123 ü') === '', '沒有英文字母時是空的');
  // 本命質點與大師數
  ok(D.getKabbalahTree(11, 'A').base === 2 && D.getKabbalahTree(22, 'A').base === 4 && D.getKabbalahTree(33, 'A').base === 6, '大師數化簡');
  ok(D.getKabbalahTree(11, 'A').master && !D.getKabbalahTree(2, 'A').master, '標明大師數');
  var t = D.getKabbalahTree(6, 'Sharon');
  ok(t.sephirah.n === 'Tiphareth 美麗' && t.sephirah.pillar === '平衡之柱' && t.sephirah.world === 'Yetzirah 形成界' && t.adjacent.length === 8, 'Tiphareth 的位置與相連路徑');
  // Sharon：Shin 火、Aleph 風、Resh（太陽，無元素）、Ayin 土、Nun 水
  ok(t.withElement === 4 && t.worlds.map(function(w) { return w.count; }).join() === '1,1,1,1' && t.mainWorld === null, 'Sharon 四個世界各一');
  ok(t.kinds['母'] === 2 && t.kinds['雙'] === 1 && t.kinds['單'] === 2, 'Sharon 字母分類');
  var a = D.getKabbalahTree(1, 'Ann');
  ok(a.paths[0].path.l === 'Nun' && a.paths[0].count === 2 && a.paths[1].path.l === 'Aleph', 'Ann 路徑次數排序');
  ok(a.mainWorld.n === 'Briah 創造界', 'Ann 水較多 → 創造界');
  a = D.getKabbalahTree(1, 'Anna');
  ok(a.mainWorld === null && a.worlds[1].count === 2 && a.worlds[2].count === 2, 'Anna 水風平手沒有主世界');
  ok(D.getKabbalahTree(9, 'Emma').mainWorld.n === 'Briah 創造界', 'Emma 兩個 Mem → 創造界');
  ok(D.getKabbalahTree(9, 'Emma').base === 9 && D.getKabbalahTree(0, '').base === 9, '無效數字落在 Yesod');
  // 隨機名字：資料一致、文字與圖不出錯
  var AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', firsts = ['David', 'Sharon', 'Theo', 'Chloe', 'Xander', 'Zoe', 'Phoebe', 'Tzipora', 'Quinn', 'Yvette'];
  for (var i = 0; i < 2000; i++) {
    var nm = i < firsts.length ? firsts[i] : '';
    if (!nm) { var len = 1 + Math.floor(rand() * 12); for (var j = 0; j < len; j++) nm += (j && rand() < 0.12 ? ' ' : '') + pick(AZ.split('')); }
    var chal = E.chaldeanNumber(nm), tr = D.getKabbalahTree(chal, nm);
    var letters = nm.replace(/[^A-Za-z]/g, '').length;
    ok(tr.letters.length >= Math.ceil(letters / 2) && tr.letters.length <= letters * 2, nm + ' 字母數合理');
    ok(tr.paths.reduce(function(s, x) { return s + x.count; }, 0) === tr.letters.length, nm + ' 路徑次數加總＝字母數');
    ok(tr.kinds['母'] + tr.kinds['雙'] + tr.kinds['單'] === tr.letters.length, nm + ' 分類加總');
    ok(tr.worlds.reduce(function(s, w) { return s + w.count; }, 0) === tr.withElement, nm + ' 世界加總');
    ok(tr.adjacent.every(function(x) { return x.a === tr.base || x.b === tr.base; }), nm + ' 相連路徑');
    var txt = D.getKabbalahPathsReading(tr), svg = D.getKabbalahTreeSVG(tr);
    ok(txt && !/undefined|NaN|null/.test(txt), nm + ' 解讀文字');
    ok((svg.match(/<line /g) || []).length === 22 && (svg.match(/<circle /g) || []).length === 10 && !/undefined|NaN/.test(svg), nm + ' 生命樹圖');
  }
});

section('英文姓名資料覆蓋（SSA 各年代前 100 名）', function() {
  vm.runInContext(fs.readFileSync(path.join(root, 'js', 'data', 'english-names.js'), 'utf8'), ctx, { filename: 'english-names.js' });
  var M = ctx.englishNameMeanings, X = ctx.EnglishTranslit, P = ctx.EnglishPhonetics, best = {};
  ['F', 'M'].forEach(function(s) {
    T.us[s].split('|').forEach(function(row) {
      var i = row.indexOf(':'), ranks = row.slice(i + 1).split(',').map(Number).filter(Boolean);
      if (ranks.length && Math.min.apply(null, ranks) <= 100) best[row.slice(0, i).toUpperCase()] = true;
    });
  });
  var names = Object.keys(best);
  ok(names.length > 600, '前 100 名共 ' + names.length + ' 個名字');
  var miss = function(o) { return names.filter(function(n) { return !o[n]; }); };
  ok(miss(M).length === 0, '都有字義，缺：' + miss(M).join(' '));
  ok(miss(X).length === 0, '都有中文譯名，缺：' + miss(X).join(' '));
  ok(miss(P).length === 0, '都有音節重音，缺：' + miss(P).join(' '));
  // 格式：字義非空；譯名每個音節都是拼音庫裡有的無聲調拼音；音節重音只含 0/1/2 與旗標 tvloc
  var sylls = {};
  Object.keys(ctx.PinyinDB.CHAR).forEach(function(c) { sylls[ctx.PinyinDB.CHAR[c].replace(/\d$/, '').replace(/v/g, 'u')] = true; });
  Object.keys(M).forEach(function(n) { ok(/^[A-Z]+$/.test(n) && M[n].length >= 4, n + ' 字義格式'); });
  Object.keys(X).forEach(function(n) { ok(X[n].split(' ').every(function(s) { return sylls[s]; }), n + ' 譯名拼音 ' + X[n]); });
  Object.keys(P).forEach(function(n) { ok(/^[012]+[tvloc]*$/.test(P[n]) && /1/.test(P[n]), n + ' 音節重音 ' + P[n]); });
});

section('AI 解讀用量與費用估算', function() {
  // ai-reading.js 載入時會找畫面元素；給一個沒有元素的 document 即可
  var actx = { console: console, document: { readyState: 'complete', getElementById: function() { return null; } } };
  actx.window = actx;
  vm.createContext(actx);
  vm.runInContext(fs.readFileSync(path.join(root, 'js', 'ai-reading.js'), 'utf8'), actx, { filename: 'ai-reading.js' });
  var A = actx.AiReading, near = function(a, b) { return Math.abs(a - b) < 1e-9; };
  ok(A.PRICES[A.MODEL], '目前使用的模型有定價：' + A.MODEL);
  // 沒有快取：10,000 輸入 × $5 ＋ 2,000 輸出 × $25 = $0.05 ＋ $0.05
  var s = A.usageStats({ model: 'claude-opus-5', usage: { input_tokens: 10000, output_tokens: 2000 } });
  ok(near(s.cost, 0.1) && !s.fellBack && s.input === 10000 && s.output === 2000, '基本費用 ' + JSON.stringify(s));
  // 快取：寫入 5 分鐘 ×1.25、1 小時 ×2、讀取 ×0.1
  s = A.usageStats({ model: 'claude-opus-5', usage: { input_tokens: 100, cache_creation_input_tokens: 9000, cache_creation: { ephemeral_5m_input_tokens: 8000, ephemeral_1h_input_tokens: 1000 }, cache_read_input_tokens: 20000, output_tokens: 1000 } });
  ok(near(s.cost, (100 * 5 + 8000 * 6.25 + 1000 * 10 + 20000 * 0.5 + 1000 * 25) / 1e6), '快取寫入與讀取 ' + s.cost);
  ok(s.cacheWrite === 9000 && s.cacheRead === 20000, '快取 tokens');
  // 備援：頂層 usage 只有最後一次，要加總 iterations（被拒絕的那次也算）
  s = A.usageStats({ model: 'claude-opus-4-8', usage: { input_tokens: 500, output_tokens: 300, iterations: [
    { type: 'message', model: 'claude-opus-5', input_tokens: 500, output_tokens: 40 },
    { type: 'fallback_message', model: 'claude-opus-4-8', input_tokens: 500, output_tokens: 300 }] } });
  ok(s.fellBack && s.attempts.length === 2 && s.input === 1000 && s.output === 340, '備援加總 iterations ' + JSON.stringify(s));
  ok(near(s.cost, (1000 * 5 + 340 * 25) / 1e6), '備援費用');
  // 回覆模型和設定不同（黏著路由，沒有 iterations）也算備援
  ok(A.usageStats({ model: 'claude-opus-4-8', usage: { input_tokens: 1, output_tokens: 1 } }).fellBack, '黏著路由算備援');
  ok(A.usageStats({ model: 'claude-unknown-9', usage: { input_tokens: 1, output_tokens: 1 } }).cost === null, '不認得的模型費用不明');
  ok(A.usageStats({ model: 'claude-opus-5' }).cost === 0, '沒有 usage 不出錯');
  // 驗收紀錄
  var md = A.usageReport([
    { kind: 'analysis', model: 'claude-opus-5', stop: 'end_turn', input: 100, cacheWrite: 9000, cacheRead: 0, output: 1500, ttft: 3200, ms: 25000, cost: 0.1 },
    { kind: 'follow-up', model: 'claude-opus-5', stop: 'end_turn', input: 50, cacheWrite: 600, cacheRead: 9000, output: 400, ttft: 1200, ms: 8000, cost: 0.02 },
    { kind: 'follow-up', model: null, stop: 'aborted', input: 0, cacheWrite: 0, cacheRead: 0, output: 0, ttft: null, ms: 900, cost: null }
  ], '2026-10-06');
  ok(/^# AI 解讀驗收紀錄/.test(md) && /2026-10-06/.test(md) && /合計 3 輪：輸入 18750 tokens、輸出 1900 tokens、耗時 33\.9 秒、約 US\$0\.120（另有 1 輪中斷，費用不明）/.test(md), '紀錄合計 ' + md.split('\n')[4]);
  ok(md.split('\n').filter(function(l) { return /^\| \d/.test(l); }).length === 3 && /\| aborted \|.*\| — \| 0\.9 \| \? \|$/m.test(md), '紀錄每輪一列');
  ok(!/undefined|NaN|sk-ant/.test(md), '紀錄沒有 undefined、沒有金鑰');
});

var pending = 1;
function asyncDone() {
  if (--pending) return;
  console.log('\n' + checks + ' 項檢查，' + (failures ? failures + ' 項失敗' : '全部通過'));
  process.exit(failures ? 1 : 0);
}
