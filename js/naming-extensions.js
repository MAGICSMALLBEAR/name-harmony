/**
 * 取名工具延伸：姓名熱門度、品牌命名、人格對照、家庭命名規劃
 * 計算函式（trendEnglish、trendChinese、scoreBrand、scoreBigFive、checkFamily）不碰 DOM，
 * 可在 Node 直接測試（tools/test-naming.js）；只有網域查詢需要連網。
 */
window.NamingExtensions = (function() {

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function val(id) { var el = document.getElementById(id); return el ? el.value : ''; }

  // ============ 姓名熱門度與時代感 ============

  var TRENDS_SRC = 'js/data/name-trends.js';
  var usIndex = null;   // { F: { olivia: [ranks...] }, M: {...} }
  var twIndex = null;   // { '家豪': [{ d, sex, rank, count }] }

  /** 熱門度資料約 140 KB，打開工具時才載入 */
  function loadTrends(cb) {
    if (window.NameTrends) return cb(null);
    var s = document.createElement('script');
    s.src = TRENDS_SRC;
    s.onload = function() { cb(window.NameTrends ? null : '資料格式錯誤'); };
    s.onerror = function() { cb('無法載入熱門度資料（離線且尚未快取）'); };
    document.head.appendChild(s);
  }

  function buildIndex() {
    var T = window.NameTrends;
    if (!T) return false;
    if (usIndex) return true;
    usIndex = { F: {}, M: {} };
    ['F', 'M'].forEach(function(sex) {
      T.us[sex].split('|').forEach(function(row) {
        var i = row.indexOf(':');
        usIndex[sex][row.slice(0, i).toLowerCase()] = {
          name: row.slice(0, i),
          ranks: row.slice(i + 1).split(',').map(function(x) { return x ? +x : 0; })
        };
      });
    });
    twIndex = {};
    T.tw.decades.forEach(function(d, di) {
      ['M', 'F'].forEach(function(sex) {
        d[sex].forEach(function(p, k) {
          (twIndex[p[0]] = twIndex[p[0]] || []).push({ d: di, sex: sex, rank: k + 1, count: p[1] });
        });
      });
    });
    return true;
  }

  /** 1950 → 祖父母輩 等世代說法（以今年為基準） */
  function generationOf(year) {
    var age = new Date().getFullYear() - year;
    if (age >= 60) return '祖父母輩';
    if (age >= 35) return '父母輩';
    if (age >= 15) return '年輕一代';
    return '兒童';
  }

  /**
   * 英文名在美國各年代的排名
   * @param sex 'F' | 'M' | ''（不指定時取排名較好的性別）
   * @return { found:false } 或 { name, sex, decades:[{ decade, rank }], latest, peak, trend, era, top2025 }
   */
  function trendEnglish(name, sex) {
    if (!buildIndex()) return { error: '熱門度資料尚未載入' };
    var key = String(name || '').trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, '');
    if (!key) return { error: '請輸入英文名' };
    var T = window.NameTrends.us;
    var nDec = T.decades.length;
    var sexes = sex === 'F' || sex === 'M' ? [sex] : ['F', 'M'];
    var best = null;
    sexes.forEach(function(s) {
      var e = usIndex[s][key];
      if (!e) return;
      // 只比各年代（最後一欄是單一年份）
      var peak = Math.min.apply(null, e.ranks.slice(0, nDec).filter(Boolean));
      if (!best || peak < best.peakRank) best = { sex: s, e: e, peakRank: peak };
    });
    var top25 = function(s) { var i = T.top2025[s].map(function(x) { return x.toLowerCase(); }).indexOf(key); return i >= 0 ? i + 1 : 0; };
    if (!best) return { found: false, name: key.charAt(0).toUpperCase() + key.slice(1), sex: sexes.length === 1 ? sexes[0] : '' };

    var ranks = best.e.ranks;
    var decades = T.decades.map(function(d, i) { return { decade: d, rank: ranks[i] }; });
    var latest = ranks[nDec];
    var peakIdx = ranks.slice(0, nDec).indexOf(best.peakRank);
    var peak = decades[peakIdx];
    var last = ranks[nDec - 1], prev = ranks[nDec - 2];
    var trend;
    if (!last && !prev) trend = 'gone';
    else if (!prev) trend = 'new';
    else if (!last) trend = 'falling';
    // 比例和名次差距都要夠大，避免 1 → 2 名這種小變動被當成下滑
    else if (last <= prev * 0.7 && prev - last >= 10) trend = 'rising';
    else if (last >= prev * 1.4 && last - prev >= 10) trend = 'falling';
    else trend = 'steady';

    var era;
    if (peak.decade >= 2010 && latest && latest <= 100) era = '當代熱門名字，同齡人之間容易撞名';
    else if (peak.decade >= 2000) era = '千禧世代的熱門名字，' + (trend === 'rising' ? '近年又回升' : '現在的新生兒較少用');
    else era = '聽起來像 ' + peak.decade + ' 年代出生的人（' + generationOf(peak.decade + 5) + '）' + (trend === 'rising' ? '，但近年有復古回流' : '');

    return {
      found: true, name: best.e.name, sex: best.sex, decades: decades, latest: latest,
      latestYear: T.latest, peak: peak, trend: trend, era: era, top2025: top25(best.sex)
    };
  }

  /**
   * 中文名在台灣各出生年代前十大的出現情形；不在榜上時以用字推估年代
   * @param input 名字（2 字）或全名（會用 ChineseNumerology 拆出名字）
   */
  function trendChinese(input) {
    if (!buildIndex()) return { error: '熱門度資料尚未載入' };
    var s = String(input || '').replace(/\s/g, '');
    if (!/^[一-鿿]+$/.test(s)) return { error: '請輸入中文名字' };
    var given = s;
    if (s.length >= 3 && window.ChineseNumerology) {
      var r = window.ChineseNumerology.analyze(s);
      if (r && !r.error) given = r.parsed.givenNameChars.join('');
    }
    var tw = window.NameTrends.tw;
    var hits = (twIndex[given] || []).map(function(h) {
      var d = tw.decades[h.d];
      return { label: d.label, from: d.from, to: d.to, sex: h.sex, rank: h.rank, count: h.count };
    });
    var overall = null;
    ['M', 'F'].forEach(function(sex) {
      tw.overall[sex].forEach(function(p, k) { if (p[0] === given) overall = { sex: sex, rank: k + 1, count: p[1] }; });
    });

    // 用字推估：每個年代前十大名字中含該字的人數占比，加總後取最高
    var weights = tw.decades.map(function(d) {
      var total = 0, w = 0, chars = [];
      ['M', 'F'].forEach(function(sex) {
        d[sex].forEach(function(p) {
          total += p[1];
          given.split('').forEach(function(c) {
            if (p[0].indexOf(c) >= 0) { w += p[1]; if (chars.indexOf(c) < 0) chars.push(c); }
          });
        });
      });
      return { label: d.label, from: d.from, to: d.to, share: total ? w / total : 0, chars: chars };
    });
    var bestW = weights.reduce(function(a, b) { return b.share > a.share ? b : a; });
    var charEra = bestW.share > 0 ? bestW : null;

    var era;
    if (hits.length) {
      var first = hits.reduce(function(a, b) { return b.rank < a.rank ? b : a; });
      era = '「' + given + '」是' + first.label + '（西元 ' + first.from + '–' + first.to + '）出生者的第 ' + first.rank + ' 大名字，屬於' + generationOf(Math.round((first.from + first.to) / 2)) + '的常見名';
    } else if (charEra) {
      era = '沒有進入任何年代的前十大；用字「' + charEra.chars.join('、') + '」最常出現在' + charEra.label + '（西元 ' + charEra.from + '–' + charEra.to + '）的熱門名字';
    } else {
      era = '名字和用字都不在各年代前十大名字中，撞名機率較低';
    }
    return { given: given, hits: hits, overall: overall, charEra: charEra, era: era };
  }

  function renderTrends() {
    var el = document.getElementById('toolTrends');
    if (!el || el.innerHTML) return;
    var html = '<p class="tool-desc">輸入英文名或中文名，看它在哪個年代最流行。英文名依美國社會安全署（SSA）1940–2024 年各年代排名；中文名依內政部戶政司 112 年全國姓名統計的各出生年代前十大名字。</p>';
    html += '<div class="tool-row">';
    html += '<label class="tool-field" style="flex:2;"><span>名字</span><input id="trendName" class="form-input" placeholder="例如 Olivia、怡君、陳家豪" autocomplete="off"></label>';
    html += '<label class="tool-field" style="flex:1;"><span>性別（英文名）</span><select id="trendGender" class="form-input"><option value="">不指定</option><option value="F">女</option><option value="M">男</option></select></label>';
    html += '</div>';
    html += '<button type="button" class="btn-download-img" id="trendGo">📈 查看時代感</button><div id="trendResult"></div>';
    html += '<p class="tool-note">資料來源：<a href="https://www.ssa.gov/oact/babynames/" target="_blank" rel="noopener">SSA 美國姓名排行</a>（各年代前 1,000 名；2025 年只有官方公布的前十名）、' +
      '<a href="https://www.ris.gov.tw/documents/data/5/2/112namestat.pdf" target="_blank" rel="noopener">內政部戶政司全國姓名統計分析（112 年）</a>統計表五十六。台灣人數是 112 年 6 月底仍設籍的人，較早年代的人數會因過世、移出而偏少。</p>';
    el.innerHTML = html;
  }

  var SEX_TEXT = { F: '女', M: '男' };
  var TREND_TEXT = { rising: '上升中', falling: '下滑中', steady: '持平', 'new': '新進榜', gone: '已退出前 1,000 名' };

  function rankBars(decades) {
    return '<div class="trend-bars">' + decades.map(function(d) {
      // 對數刻度：第 1 名 100%、第 10 名 67%、第 100 名 33%
      var h = d.rank ? Math.max(4, Math.round((1 - Math.log(d.rank) / Math.log(1000)) * 100)) : 0;
      return '<div class="trend-bar" title="' + d.decade + ' 年代：' + (d.rank ? '第 ' + d.rank + ' 名' : '不在前 1,000 名') + '">' +
        '<span class="trend-bar-fill" style="height:' + h + '%"></span><small>' + String(d.decade).slice(2) + '</small></div>';
    }).join('') + '</div>';
  }

  function renderTrendEnglish(r) {
    if (r.error) return '<p class="tool-msg">' + esc(r.error) + '</p>';
    if (!r.found) {
      return '<div class="tool-cand"><strong>' + esc(r.name) + '</strong> 在 1940 年以後的任何年代都沒有進入' + (r.sex ? SEX_TEXT[r.sex] + '名' : '') + '前 1,000 名。' +
        '<p class="tool-line">時代感：少見或新創的名字，不容易撞名；也可能是拼法較少見，可試試常見拼法。</p></div>';
    }
    var html = '<div class="tool-cand"><div class="tool-cand-head"><span class="tool-cand-name">' + esc(r.name) + '</span>' +
      '<span class="tool-badge">' + SEX_TEXT[r.sex] + '名・' + TREND_TEXT[r.trend] + '</span></div>';
    html += rankBars(r.decades);
    html += '<p class="tool-line">最流行：' + r.peak.decade + ' 年代第 ' + r.peak.rank + ' 名；' + r.latestYear + ' 年：' + (r.latest ? '第 ' + r.latest + ' 名' : '不在前 1,000 名') +
      (r.top2025 ? '；2025 年第 ' + r.top2025 + ' 名' : '') + '</p>';
    html += '<p class="tool-line">時代感：' + esc(r.era) + '</p>';
    return html + '</div>';
  }

  function renderTrendChinese(r) {
    if (r.error) return '<p class="tool-msg">' + esc(r.error) + '</p>';
    var html = '<div class="tool-cand"><div class="tool-cand-head"><span class="tool-cand-name">' + esc(r.given) + '</span>' +
      (r.overall ? '<span class="tool-badge">全國' + SEX_TEXT[r.overall.sex] + '性第 ' + r.overall.rank + ' 大常見名（' + r.overall.count.toLocaleString() + ' 人）</span>' : '') + '</div>';
    r.hits.forEach(function(h) {
      html += '<p class="tool-line">' + h.label + '（' + h.from + '–' + h.to + '）出生' + SEX_TEXT[h.sex] + '性：第 ' + h.rank + ' 名，' + h.count.toLocaleString() + ' 人</p>';
    });
    html += '<p class="tool-line">時代感：' + esc(r.era) + '</p>';
    return html + '</div>';
  }

  function runTrend() {
    var out = document.getElementById('trendResult');
    var name = val('trendName').trim();
    if (!name) { out.innerHTML = '<p class="tool-msg">請輸入名字。</p>'; return; }
    out.innerHTML = '<p class="tool-note">載入資料中…</p>';
    loadTrends(function(err) {
      if (err) { out.innerHTML = '<p class="tool-msg">' + esc(err) + '</p>'; return; }
      out.innerHTML = /[一-鿿]/.test(name) ? renderTrendChinese(trendChinese(name)) : renderTrendEnglish(trendEnglish(name, val('trendGender')));
    });
  }

  // ============ 品牌命名工作台 ============

  var TLDS = [
    { tld: 'com', rdap: 'https://rdap.verisign.com/com/v1/domain/' },
    { tld: 'net', rdap: 'https://rdap.verisign.com/net/v1/domain/' },
    { tld: 'io', rdap: 'https://rdap.identitydigital.services/rdap/domain/' },
    { tld: 'app', rdap: 'https://pubapi.registry.google/rdap/domain/' }
  ];
  var TONE_TEXT = {
    trust: '專業可信：適合穩定、清楚的字，避免過度俏皮或諧音梗',
    warm: '溫暖親和：適合口語、好唸、有畫面感的字',
    bold: '創新有力：短而有辨識度，可接受新創字詞',
    calm: '自然療癒：適合柔和的音與自然意象'
  };

  /** 中文轉無聲調拼音當網域（森月 → senyue）；英文只保留英數 */
  function brandSlug(name) {
    var s = String(name || '').trim();
    var DB = window.PinyinDB;
    var out = s.split('').map(function(c) {
      if (/[a-z0-9]/i.test(c)) return c.toLowerCase();
      var py = DB && DB.CHAR[c];
      return py ? py.replace(/\d$/, '').replace('v', 'u') : '';
    }).join('');
    return out.slice(0, 63);
  }

  /**
   * 品牌名初篩（不含網域與商標）
   * @return { name, kind: 'zh'|'en'|'mixed', score, items: [{ label, pts, note }], slug }
   */
  function scoreBrand(name) {
    name = String(name || '').trim();
    if (!name) return { error: '請輸入候選品牌名' };
    var zh = (name.match(/[一-鿿]/g) || []).length;
    var en = (name.match(/[a-z]/ig) || []).length;
    var kind = zh && en ? 'mixed' : zh ? 'zh' : 'en';
    var items = [];
    var add = function(label, pts, note) { items.push({ label: label, pts: pts, note: note }); };

    if (kind === 'zh') {
      if (zh >= 2 && zh <= 4) add('長度', 20, zh + ' 個字，容易記');
      else if (zh >= 5 && zh <= 6) add('長度', 10, zh + ' 個字，略長，可準備簡稱');
      else add('長度', 0, zh === 1 ? '只有 1 個字，難註冊也難搜尋' : zh + ' 個字，太長不易記');
    } else {
      var letters = name.replace(/[^a-z]/ig, '').length;
      if (letters >= 3 && letters <= 8) add('長度', 20, letters + ' 個字母，好拼好記');
      else if (letters <= 12) add('長度', 10, letters + ' 個字母，略長');
      else add('長度', 0, letters < 3 ? '太短，網域與商標多半已被使用' : '太長，不易拼寫');
    }
    if (kind === 'mixed') add('一致性', -5, '中英混合，口頭介紹時容易不知道怎麼唸');

    var P = window.Phonetics, DB = window.PinyinDB;
    if (kind === 'zh' && P && DB) {
      var chars = name.replace(/[^一-鿿]/g, '').split('');
      var sylls = chars.map(function(c) { return DB.CHAR[c] ? P.splitPy(DB.CHAR[c]) : null; });
      var unknown = chars.filter(function(c, i) { return !sylls[i]; });
      if (unknown.length) add('好唸', 0, '「' + unknown.join('') + '」不是常用字，客人可能唸不出來');
      else add('好唸', 10, '都是常用字');
      var homos = P.findHomophones(sylls, chars);
      var worst = homos.length ? homos[0] : null;
      if (worst && worst.level === 3) add('諧音', -30, '「' + worst.text + '」音同「' + worst.word + '」');
      else if (worst && worst.level === 2) add('諧音', -15, '「' + worst.text + '」在台灣口音下近似「' + worst.word + '」');
      else if (worst) add('諧音', -5, '「' + worst.text + '」音近「' + worst.word + '」（聲調不同）');
      else add('諧音', 15, '沒有發現不雅諧音');
      var tones = sylls.filter(Boolean).map(function(s) { return s.tone; });
      if (tones.length >= 2 && tones.every(function(t) { return t === tones[0]; })) add('聲調', -5, '每個字聲調相同，唸起來平板');
      else if (tones.length >= 2) add('聲調', 5, '聲調有起伏');
      for (var i = 1; i < sylls.length; i++) {
        if (sylls[i] && sylls[i - 1] && sylls[i].base === sylls[i - 1].base && chars[i] !== chars[i - 1]) { add('拗口', -5, '「' + chars[i - 1] + chars[i] + '」同音相連'); break; }
      }
    } else if (kind === 'en' && P && en) {
      var e = P.checkEnglish(name.replace(/[^a-z]/ig, ''));
      if (e.slang) add('聯想', -30, '英文俚語聯想：' + e.slang);
      else add('聯想', 15, '沒有收錄到負面俚語聯想');
      if (e.syllables <= 3) add('好唸', 10, e.syllables + ' 個音節' + (e.estimated ? '（依拼字估計）' : ''));
      else add('好唸', 0, e.syllables + ' 個音節，偏長');
      if (e.hard.length) add('華語使用者', -5 * e.hard.length, '較難發的音：' + e.hard.join('、'));
    }
    if (/\d/.test(name)) add('數字', -5, '含數字，口頭說明時要多解釋寫法');

    var score = 50 + items.reduce(function(s, x) { return s + x.pts; }, 0);
    return { name: name, kind: kind, score: Math.max(0, Math.min(100, score)), items: items, slug: brandSlug(name) };
  }

  /**
   * 以 RDAP 查網域：404 = 登記處沒有紀錄（多半可註冊），200 = 已被註冊
   * @param fetchFn 可替換（測試用），預設 window.fetch
   * @return Promise<[{ tld, domain, status: 'taken'|'free'|'error' }]>
   */
  function checkDomains(slug, fetchFn) {
    fetchFn = fetchFn || (typeof fetch === 'function' ? fetch : null);
    return Promise.all(TLDS.map(function(t) {
      var domain = slug + '.' + t.tld;
      if (!fetchFn || !slug) return Promise.resolve({ tld: t.tld, domain: domain, status: 'error' });
      return fetchFn(t.rdap + encodeURIComponent(domain), { headers: { Accept: 'application/rdap+json' } }).then(function(res) {
        return { tld: t.tld, domain: domain, status: res.status === 200 ? 'taken' : res.status === 404 ? 'free' : 'error' };
      }, function() {
        return { tld: t.tld, domain: domain, status: 'error' };
      });
    }));
  }

  function renderBrand() {
    var el = document.getElementById('toolBrand');
    if (!el || el.innerHTML) return;
    var html = '<p class="tool-desc">輸入候選品牌名：檢查長度、好唸程度、諧音或英文俚語聯想，並自動查 .com、.net、.io、.app 網域是否已被註冊。</p>';
    html += '<div class="tool-row">';
    html += '<label class="tool-field" style="flex:1;"><span>候選品牌名</span><input id="brandName" class="form-input" placeholder="例如 森月、Luma" autocomplete="off"></label>';
    html += '<label class="tool-field" style="flex:1;"><span>品牌調性</span><select id="brandTone" class="form-input">' +
      '<option value="trust">專業可信</option><option value="warm">溫暖親和</option><option value="bold">創新有力</option><option value="calm">自然療癒</option></select></label>';
    html += '</div>';
    html += '<button type="button" class="btn-download-img" id="brandGo">🏢 初篩品牌名</button><div id="brandResult"></div>';
    el.innerHTML = html;
  }

  var DOMAIN_TEXT = { taken: '已被註冊', free: '查無登記，可能可註冊', error: '查詢失敗', pending: '查詢中…' };

  function domainRows(list) {
    return list.map(function(d) {
      return '<span class="tool-grid domain-' + d.status + '">' + esc(d.domain) + '：' + DOMAIN_TEXT[d.status] + '</span>';
    }).join('');
  }

  function runBrand() {
    var out = document.getElementById('brandResult');
    var r = scoreBrand(val('brandName'));
    if (r.error) { out.innerHTML = '<p class="tool-msg">' + esc(r.error) + '</p>'; return; }
    var html = '<div class="tool-cand"><div class="tool-cand-head"><span class="tool-cand-name">' + esc(r.name) + '</span><span class="tool-badge">初篩 ' + r.score + '/100</span></div>';
    html += r.items.map(function(x) {
      return '<p class="tool-line">' + (x.pts > 0 ? '✅' : x.pts < 0 ? '⚠️' : '・') + ' <strong>' + esc(x.label) + '</strong>：' + esc(x.note) + (x.pts ? '（' + (x.pts > 0 ? '+' : '') + x.pts + '）' : '') + '</p>';
    }).join('');
    html += '<p class="tool-line">調性：' + esc(TONE_TEXT[val('brandTone')] || '') + '</p>';
    if (r.slug) {
      html += '<p class="tool-line">網域' + (r.kind !== 'en' ? '（以拼音 ' + esc(r.slug) + ' 查詢）' : '') + '：</p><div class="tool-grids" id="brandDomains">' +
        domainRows(TLDS.map(function(t) { return { domain: r.slug + '.' + t.tld, status: 'pending' }; })) + '</div>';
    }
    html += '<div class="tool-actions">' +
      '<a class="btn-action btn-action-secondary" target="_blank" rel="noopener" href="https://twtmsearch.tipo.gov.tw/">™ 查台灣商標</a>' +
      (r.slug ? '<a class="btn-action btn-action-secondary" target="_blank" rel="noopener" href="https://www.twnic.tw/whois_n.php?query=' + encodeURIComponent(r.slug + '.com.tw') + '">🌐 查 .com.tw</a>' : '') + '</div>';
    html += '<p class="tool-note">網域以各登記處的 RDAP 即時查詢；「查無登記」仍可能是保留字或溢價網域，購買前請到註冊商確認。商標沒有開放查詢介面，請到智慧財產局檢索系統查相同或近似商標。.tw 網域 TWNIC 不開放瀏覽器直接查詢，請用連結。</p>';
    out.innerHTML = html + '</div>';
    if (!r.slug) return;
    checkDomains(r.slug).then(function(list) {
      var box = document.getElementById('brandDomains');
      // 使用者可能已經改查別的名字
      if (box && val('brandName').trim() === r.name) box.innerHTML = domainRows(list);
    });
  }

  // ============ 名字與自我人格對照（Big Five） ============

  var FACTORS = [
    ['O', '我喜歡探索新觀點與陌生領域。', 1], ['O', '我偏好熟悉的方法，不喜歡改變。', -1],
    ['C', '我做事有計畫，並按時完成。', 1], ['C', '我常常拖到最後一刻才處理事情。', -1],
    ['E', '我會主動和陌生人互動。', 1], ['E', '長時間社交會讓我很快耗盡能量。', -1],
    ['A', '我通常會先理解別人的立場。', 1], ['A', '我傾向直接挑戰他人的觀點。', -1],
    ['N', '我容易因小事感到緊張或擔心。', 1], ['N', '壓力來時，我通常能保持平穩。', -1]
  ];
  var FACTOR_NAME = { O: '開放性', C: '盡責性', E: '外向性', A: '親和性', N: '情緒敏感度' };

  /**
   * @param answers 與 FACTORS 對應的 1–5 分
   * @return { O: { name, score: 0–100, level }, ... }；反向題以 6 − 分數計
   */
  function scoreBigFive(answers) {
    var sum = {}, cnt = {};
    FACTORS.forEach(function(q, i) {
      var v = Math.max(1, Math.min(5, +answers[i] || 3));
      sum[q[0]] = (sum[q[0]] || 0) + (q[2] > 0 ? v : 6 - v);
      cnt[q[0]] = (cnt[q[0]] || 0) + 1;
    });
    var out = {};
    Object.keys(FACTOR_NAME).forEach(function(k) {
      var score = Math.round((sum[k] / cnt[k] - 1) / 4 * 100);
      out[k] = { name: FACTOR_NAME[k], score: score, level: score >= 70 ? '偏高' : score <= 30 ? '偏低' : '中等' };
    });
    return out;
  }

  function renderPersonality() {
    var el = document.getElementById('toolPersonality');
    if (!el || el.innerHTML) return;
    var opts = '<option value="1">1 很不同意</option><option value="2">2</option><option value="3" selected>3 普通</option><option value="4">4</option><option value="5">5 很同意</option>';
    var html = '<p class="tool-desc">10 題 Big Five 自我觀察（娛樂、反思用途，不是心理診斷）。完成後可和姓名分析中的 MBTI 趣味推估對照閱讀。</p>';
    html += FACTORS.map(function(q, i) {
      return '<label class="tool-field"><span>' + q[1] + '</span><select class="form-input bf" data-i="' + i + '">' + opts + '</select></label>';
    }).join('');
    html += '<button type="button" class="btn-download-img" id="bfGo">🧠 產生人格對照</button><div id="bfResult"></div>';
    el.innerHTML = html;
  }

  function runPersonality() {
    var answers = [];
    [].forEach.call(document.querySelectorAll('#toolPersonality .bf'), function(x) { answers[+x.dataset.i] = +x.value; });
    var r = scoreBigFive(answers);
    var html = '<div class="tool-cand">' + Object.keys(r).map(function(k) {
      return '<p class="tool-line"><strong>' + r[k].name + '</strong> ' + r[k].score + '/100　' + r[k].level + '</p>';
    }).join('');
    html += '<p class="tool-note">把這份自評與主分析中的靈數 → MBTI 趣味對照放在一起看，可以當作「自我感受與系統敘事」的討論起點，不應用於招聘、醫療或任何高風險判斷。</p></div>';
    document.getElementById('bfResult').innerHTML = html;
  }

  // ============ 家庭命名規劃 ============

  /** 拆出姓與名；筆劃庫不足時以第一個字當姓 */
  function splitName(full) {
    full = String(full || '').replace(/\s/g, '');
    if (!/^[一-鿿]{2,}$/.test(full)) return null;
    var r = window.ChineseNumerology && window.ChineseNumerology.analyze(full);
    if (r && !r.error) return { full: full, surname: r.parsed.surnameChars.join(''), given: r.parsed.givenNameChars, analysis: r };
    return { full: full, surname: full.charAt(0), given: full.slice(1).split(''), analysis: null };
  }

  function pyBase(c) {
    var p = window.PinyinDB && window.PinyinDB.CHAR[c];
    return p ? p.replace(/\d$/, '') : null;
  }

  /**
   * @param opts { candidate: '王怡蘊', parents: ['王大明', ...], siblings: ['王子晴', ...] }
   * @return { error } 或 { candidate, blocked, warns: [], infos: [], pairs: [{ who, name, score, tier }], phonetics }
   */
  function checkFamily(opts) {
    var cand = splitName(opts.candidate);
    if (!cand || !cand.analysis) return { error: '請輸入筆劃庫可分析的完整中文姓名（姓＋名）' };
    var members = [];
    var skipped = [];
    (opts.parents || []).forEach(function(n) { var m = splitName(n); if (m) members.push({ who: '家長', m: m }); else if (n) skipped.push(n); });
    (opts.siblings || []).forEach(function(n) { var m = splitName(n); if (m) members.push({ who: '手足', m: m }); else if (n) skipped.push(n); });

    var blocked = false, warns = [], infos = [];
    members.forEach(function(x) {
      var m = x.m;
      if (m.full === cand.full) { blocked = true; warns.push('和' + x.who + '「' + m.full + '」同名，不能使用'); return; }
      var shared = cand.given.filter(function(c) { return m.given.indexOf(c) >= 0; });
      var sameSound = cand.given.filter(function(c) {
        var b = pyBase(c);
        return b && shared.indexOf(c) < 0 && m.given.some(function(g) { return g !== c && pyBase(g) === b; });
      });
      if (x.who === '家長') {
        if (shared.length) warns.push('用了家長「' + m.full + '」名字中的「' + shared.join('、') + '」；傳統上晚輩避用長輩名字的字');
        if (sameSound.length) warns.push('「' + sameSound.join('、') + '」和家長「' + m.full + '」名字的字同音；講究避諱時也會避開');
      } else {
        if (shared.length) infos.push('和手足「' + m.full + '」共用「' + shared.join('、') + '」；若是輩分字很常見，否則容易被叫混');
        if (sameSound.length) warns.push('「' + sameSound.join('、') + '」和手足「' + m.full + '」名字的字同音，叫名字時容易搞混');
      }
    });
    if (!members.length) infos.push('沒有輸入家人姓名，只檢查候選名本身');
    else if (!warns.length && !infos.length) infos.push('和已輸入的家人沒有重字或同音字，辨識度良好');
    if (skipped.length) infos.push('略過無法辨識的姓名：' + skipped.join('、'));

    var H = window.PairHarmony;
    var pairs = members.filter(function(x) { return x.m.analysis && x.m.full !== cand.full; }).map(function(x) {
      var h = H ? H.cncnHarmony(x.m.analysis, cand.analysis) : null;
      return { who: x.who, name: x.m.full, score: h ? h.score : null, tier: h ? h.tier : '' };
    });
    var ph = window.Phonetics ? window.Phonetics.checkChinese(cand.analysis.parsed) : null;
    if (ph && ph.grade === '需注意') warns.push('候選名音韻需注意：' + (ph.warns[0] || ''));
    return { candidate: cand, blocked: blocked, warns: warns, infos: infos, pairs: pairs, phonetics: ph };
  }

  function renderFamily() {
    var el = document.getElementById('toolFamily');
    if (!el || el.innerHTML) return;
    var html = '<p class="tool-desc">比較候選名字與父母、手足的重字、同音字與五格人格五行。所有資料只在這台裝置的瀏覽器計算。</p>';
    html += '<div class="tool-row">';
    html += '<label class="tool-field" style="flex:1;"><span>家長姓名（選填）</span><input id="familyParentA" class="form-input" placeholder="例如 王大明" autocomplete="off"></label>';
    html += '<label class="tool-field" style="flex:1;"><span>另一位家長（選填）</span><input id="familyParentB" class="form-input" placeholder="例如 林小美" autocomplete="off"></label>';
    html += '</div>';
    html += '<label class="tool-field"><span>候選完整姓名</span><input id="familyCandidate" class="form-input" placeholder="例如 王怡蘊" autocomplete="off"></label>';
    html += '<label class="tool-field"><span>手足姓名（選填，以逗號或頓號分隔）</span><input id="familySiblings" class="form-input" placeholder="例如 王子晴、王子安" autocomplete="off"></label>';
    html += '<button type="button" class="btn-download-img" id="familyGo">👨‍👩‍👧 檢查家庭一致性</button><div id="familyResult"></div>';
    el.innerHTML = html;
  }

  function runFamily() {
    var r = checkFamily({
      candidate: val('familyCandidate'),
      parents: [val('familyParentA').trim(), val('familyParentB').trim()].filter(Boolean),
      siblings: val('familySiblings').split(/[、,，\s]+/).filter(Boolean)
    });
    var out = document.getElementById('familyResult');
    if (r.error) { out.innerHTML = '<p class="tool-msg">' + esc(r.error) + '</p>'; return; }
    var cn = r.candidate.analysis, g = cn.grids;
    var html = '<div class="tool-cand"><div class="tool-cand-head"><span class="tool-cand-name">' + esc(r.candidate.full) + '</span>' +
      '<span class="tool-badge">' + (r.blocked ? '不能使用' : r.warns.length ? '需留意 ' + r.warns.length + ' 項' : '家庭規劃') + '</span></div>';
    html += '<p class="tool-line">人格五行：' + g.ren.element + '；總格：' + g.zong.number + ' ' + (g.zong.fortune ? g.zong.fortune.glory : '未收錄') +
      (r.phonetics ? '；音韻：' + r.phonetics.grade : '') + '</p>';
    html += r.warns.map(function(w) { return '<p class="tool-line">⚠️ ' + esc(w) + '</p>'; }).join('');
    html += r.infos.map(function(w) { return '<p class="tool-line">・' + esc(w) + '</p>'; }).join('');
    html += r.pairs.map(function(p) {
      return '<p class="tool-line">' + p.who + ' ' + esc(p.name) + ' × ' + esc(r.candidate.full) + '：' + (p.score != null ? p.score + '/100（' + p.tier + '）' : '無法比對') + '</p>';
    }).join('');
    html += '<p class="tool-note">此工具協助比較命名的一致性與辨識度，不取代家人的偏好、文化傳承或戶籍登記規定。</p></div>';
    out.innerHTML = html;
  }

  // ============ 初始化 ============

  function render() {
    renderTrends();
    renderBrand();
    renderPersonality();
    renderFamily();
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('click', function(e) {
      var id = e.target && e.target.id;
      if (id === 'trendGo') runTrend();
      else if (id === 'brandGo') runBrand();
      else if (id === 'bfGo') runPersonality();
      else if (id === 'familyGo') runFamily();
    });
    document.addEventListener('keydown', function(e) {
      if (e.key !== 'Enter' || !e.target) return;
      if (e.target.id === 'trendName') runTrend();
      else if (e.target.id === 'brandName') runBrand();
    });
  }

  return {
    render: render,
    trendEnglish: trendEnglish, trendChinese: trendChinese,
    scoreBrand: scoreBrand, brandSlug: brandSlug, checkDomains: checkDomains,
    scoreBigFive: scoreBigFive, FACTORS: FACTORS,
    checkFamily: checkFamily
  };
})();
