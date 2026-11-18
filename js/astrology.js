/**
 * 占星盤引擎 — 真實星曆行星位置 + 上升點 + 宮位 + 相位 + 姓名對應
 */
window.Astrology = (function() {

  // 英文模式（js/l10n.js）
  function T(x) { return window.L10N ? window.L10N.t(x) : x; }
  function L(zh, en) { return window.L10N ? window.L10N.L(zh, en) : zh; }

  var PLANETS = [
    {n:'太陽',e:'☀️',el:'火',desc:'核心自我、生命力、外在形象。代表你的本質與人生目標。'},
    {n:'月亮',e:'🌙',el:'水',desc:'情緒、潛意識、內在需求。代表你的情感模式與安全感來源。'},
    {n:'水星',e:'☿',el:'水',desc:'思維、溝通、學習。代表你的思考方式與表達能力。'},
    {n:'金星',e:'♀',el:'金',desc:'愛情、美感、價值觀。代表你的審美、感情與金錢觀。'},
    {n:'火星',e:'♂',el:'火',desc:'行動、慾望、競爭。代表你的動能、勇氣與脾氣。'},
    {n:'木星',e:'♃',el:'木',desc:'擴張、幸運、智慧。代表你的成長機會與人生哲學。'},
    {n:'土星',e:'♄',el:'土',desc:'責任、限制、紀律。代表你的人生課題與需要努力的方向。'},
    {n:'天王星',e:'♅',el:'金',desc:'創新、突破、自由。代表你的獨特性與改革精神。'},
    {n:'海王星',e:'♆',el:'水',desc:'夢想、靈性、幻覺。代表你的直覺、藝術天分與理想。'},
    {n:'冥王星',e:'♇',el:'火',desc:'轉化、重生、權力。代表你的深層力量與蛻變能力。'}
  ];

  var HOUSES = [
    {n:'第一宮 命宮',desc:'自我形象、氣質、給人的第一印象'},
    {n:'第二宮 財帛',desc:'金錢觀、價值觀、物質資源'},
    {n:'第三宮 溝通',desc:'思維模式、兄弟姊妹、短程旅行'},
    {n:'第四宮 家庭',desc:'原生家庭、根源、內心安全感'},
    {n:'第五宮 創作',desc:'戀愛、創意、子女、娛樂'},
    {n:'第六宮 工作',desc:'日常工作、健康、服務'},
    {n:'第七宮 婚姻',desc:'伴侶關係、合作、公開對手'},
    {n:'第八宮 轉化',desc:'深度連結、共享資源、轉變'},
    {n:'第九宮 探索',desc:'高等教育、哲學、長途旅行'},
    {n:'第十宮 事業',desc:'社會地位、職業、人生目標'},
    {n:'第十一宮 社群',desc:'朋友、團體、理想與願景'},
    {n:'第十二宮 潛意識',desc:'隱藏的自我、靈性、退隱'}
  ];

  var SIGNS = [
    {n:'牡羊座♈',el:'火',date:'3/21-4/19',desc:'開創火象，勇敢直接、充滿行動力。'},
    {n:'金牛座♉',el:'土',date:'4/20-5/20',desc:'固定土象，穩重務實、重視感官享受。'},
    {n:'雙子座♊',el:'風',date:'5/21-6/21',desc:'變動風象，聰明靈活、善於溝通。'},
    {n:'巨蟹座♋',el:'水',date:'6/22-7/22',desc:'開創水象，情感豐富、重視家庭與安全感。'},
    {n:'獅子座♌',el:'火',date:'7/23-8/22',desc:'固定火象，自信大方、有領導魅力。'},
    {n:'處女座♍',el:'土',date:'8/23-9/22',desc:'變動土象，細心謹慎、追求完美。'},
    {n:'天秤座♎',el:'風',date:'9/23-10/23',desc:'開創風象，優雅和諧、重視人際關係。'},
    {n:'天蠍座♏',el:'水',date:'10/24-11/22',desc:'固定水象，深沉神秘、意志堅強。'},
    {n:'射手座♐',el:'火',date:'11/23-12/21',desc:'變動火象，樂觀自由、追求冒險。'},
    {n:'摩羯座♑',el:'土',date:'12/22-1/19',desc:'開創土象，腳踏實地、有企圖心。'},
    {n:'水瓶座♒',el:'風',date:'1/20-2/18',desc:'固定風象，獨立創新、重視自由。'},
    {n:'雙魚座♓',el:'水',date:'2/19-3/20',desc:'變動水象，敏感慈悲、有藝術天分。'}
  ];

  function getSign(month, day) {
    if (!month || !day) return SIGNS[0];
    var dateStr = month + '/' + day;
    var cuts = [[3,21],[4,20],[5,21],[6,22],[7,23],[8,23],[9,23],[10,24],[11,23],[12,22],[1,20],[2,19]];
    for (var i = 0; i < cuts.length; i++) {
      var next = cuts[(i + 1) % 12];
      if ((month > cuts[i][0] || (month === cuts[i][0] && day >= cuts[i][1])) &&
          (month < next[0] || (month === next[0] && day <= next[1] || (next[0] === 1 && month === 12)))) {
        return SIGNS[(i + 1) % 12];
      }
    }
    return SIGNS[3]; // default
  }

  // ========== 真實星曆（js/vendor/astronomy.browser.min.js，astronomy-engine MIT） ==========

  var BODIES = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];

  // 預設出生地：台北（尚無出生地欄位），時區 UTC+8
  var DEFAULT_PLACE = { name: '台北', lat: 25.03, lon: 121.56, tz: 8 };

  // 主要相位與次要相位（小相位）
  var ASPECT_DEFS = [
    { type:'合相',   angle:0,   orb:8, nature:'中性', priority:1, desc:'兩星能量完全融合，特質疊加、效果加乘（吉凶依星曜本質而定）。' },
    { type:'對分相', angle:180, orb:8, nature:'挑戰', priority:1, desc:'兩極拉扯、彼此對立，需要學習整合並找到平衡點。' },
    { type:'四分相', angle:90,  orb:7, nature:'挑戰', priority:2, desc:'產生摩擦與張力，帶來壓力但也是成長與突破的契機。' },
    { type:'三合相', angle:120, orb:7, nature:'吉',   priority:3, desc:'順暢自然的合作關係，兩股力量相輔相成、如虎添翼。' },
    { type:'六合相', angle:60,  orb:5, nature:'吉',   priority:4, desc:'和諧的助力，兩者能自然搭配、創造機會與資源。' }
  ];
  var MINOR_ASPECT_DEFS = [
    { type:'半六分相', angle:30,  orb:2, nature:'中性', priority:5, minor:true, desc:'相鄰星座的細微互動，需要主動意識才能協調銜接。' },
    { type:'半四分相', angle:45,  orb:2, nature:'挑戰', priority:6, minor:true, desc:'輕微內在摩擦，常在細節或節奏不一致時浮現。' },
    { type:'補八分相', angle:135, orb:2, nature:'挑戰', priority:6, minor:true, desc:'隱性張力與反覆調整，推動把潛在問題處理到位。' },
    { type:'補十二分相', angle:150, orb:3, nature:'挑戰', priority:5, minor:true, desc:'兩個星座性質互不相通，需要刻意轉彎與重新對焦。' }
  ];

  function norm360(x) { return ((x % 360) + 360) % 360; }
  function separation(a, b) { var d = norm360(a - b); return Math.min(d, 360 - d); }
  function midpoint(a, b) { return Math.abs(separation(a, b) - 180) < 1e-8 ? null : norm360(a + (norm360(b - a + 180) - 180) / 2); }

  /** 天體的地心視黃經（真黃道，of date） */
  function eclipticLongitude(A, body, date) {
    return A.Ecliptic(A.GeoVector(body, date, true)).elon;
  }

  /** 上升點與中天（MC）：依恆星時、真黃赤交角與出生地緯度 */
  function ascendant(A, date, place) {
    var rad = Math.PI / 180;
    var ramc = norm360(A.SiderealTime(date) * 15 + place.lon) * rad;
    var eps = A.e_tilt(A.MakeTime(date)).tobl * rad;
    var phi = place.lat * rad;
    var asc = Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps)));
    return norm360(asc / rad);
  }

  function midheaven(A, date, place) {
    var rad = Math.PI / 180;
    var ramc = norm360(A.SiderealTime(date) * 15 + place.lon) * rad;
    var eps = A.e_tilt(A.MakeTime(date)).tobl * rad;
    var mc = Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(eps));
    return norm360(mc / rad);
  }

  /** 平均北交點（Mean North Node，Jean Meeus J2000） */
  function meanNorthNode(date) {
    var jd = date.getTime() / 86400000 + 2440587.5;
    var t = (jd - 2451545.0) / 36525;
    return norm360(125.04452 - 1934.136261 * t + 0.0020708 * t * t + (t * t * t) / 450000);
  }

  function signOf(lon) { return SIGNS[Math.floor(norm360(lon) / 30)]; }

  function fmtDeg(lon) {
    var inSign = norm360(lon) % 30;
    var d = Math.floor(inSign);
    var m = Math.floor((inSign - d) * 60);
    return d + '°' + (m < 10 ? '0' : '') + m + '′';
  }

  /** 計算全行星兩兩相位（依實際黃經夾角與容許度），依重要性與緊密度排序 */
  function getAspects(planets, skipMoon, defs) {
    defs = defs || ASPECT_DEFS;
    var list = [];
    for (var i = 0; i < planets.length; i++) {
      for (var j = i + 1; j < planets.length; j++) {
        if (skipMoon && (planets[i].name === '月亮' || planets[j].name === '月亮')) continue;
        var sep = Math.abs(planets[i].lon - planets[j].lon);
        if (sep > 180) sep = 360 - sep;
        for (var k = 0; k < defs.length; k++) {
          var def = defs[k];
          var orb = Math.abs(sep - def.angle);
          if (orb > def.orb) continue;
          list.push({
            p1: planets[i].name, p1Emoji: planets[i].emoji,
            p2: planets[j].name, p2Emoji: planets[j].emoji,
            type: def.type, angle: def.angle + '°', orb: Math.round(orb * 10) / 10,
            nature: def.nature, priority: def.priority, minor: !!def.minor,
            desc: L(planets[i].name + '與' + planets[j].name + '形成' + def.type + '（' + def.angle + '°，容許度 ' + orb.toFixed(1) + '°）：' + def.desc,
              T(planets[i].name) + ' and ' + T(planets[j].name) + ' form a ' + T(def.type).toLowerCase() + ' (' + def.angle + '°, orb ' + orb.toFixed(1) + '°): ' + T(def.desc))
          });
          break;
        }
      }
    }
    list.sort(function(a, b) { return a.priority - b.priority || a.orb - b.orb; });
    return list;
  }

  /**
   * 本命星盤
   * 有出生時間：計算上升點並以整宮制（Whole Sign）分宮
   * 沒有出生時間：以正午計算，採太陽宮位制（太陽星座為第一宮），並略過月亮相位（月亮一天移動約 13°）
   */
  function getChart(year, month, day, hour, minute, place) {
    if (!year || !month || !day) return null;
    var A = window.Astronomy;
    if (!A) return null;
    place = place || DEFAULT_PLACE;
    var timeKnown = hour != null && hour >= 0 && hour <= 23;
    var date = new Date(Date.UTC(year, month - 1, day, timeKnown ? hour : 12, timeKnown ? (minute || 0) : 0) - place.tz * 3600000);
    var nextDay = new Date(date.getTime() + 86400000);

    var planets = PLANETS.map(function(p, i) {
      var lon = eclipticLongitude(A, BODIES[i], date);
      var move = norm360(eclipticLongitude(A, BODIES[i], nextDay) - lon + 180) - 180;
      return {
        name: p.n, emoji: p.e, element: p.el, desc: p.desc,
        lon: lon, sign: signOf(lon), degree: fmtDeg(lon),
        retrograde: i > 1 && move < 0
      };
    });

    var sunSign = planets[0].sign;
    var asc = timeKnown ? ascendant(A, date, place) : null;
    var mc = timeKnown ? midheaven(A, date, place) : null;
    var firstHouseSign = Math.floor((asc != null ? asc : planets[0].lon) / 30);
    planets.forEach(function(p) {
      p.house = HOUSES[(Math.floor(p.lon / 30) - firstHouseSign + 12) % 12];
    });
    var nnLon = meanNorthNode(date), snLon = norm360(nnLon + 180);
    var nodes = [
      { name: '北交點', emoji: '☊', lon: nnLon, sign: signOf(nnLon), degree: fmtDeg(nnLon), house: HOUSES[(Math.floor(nnLon / 30) - firstHouseSign + 12) % 12], isNode: true },
      { name: '南交點', emoji: '☋', lon: snLon, sign: signOf(snLon), degree: fmtDeg(snLon), house: HOUSES[(Math.floor(snLon / 30) - firstHouseSign + 12) % 12], isNode: true }
    ];

    // 主導元素：太陽、月亮、上升各計 2 分，其餘行星 1 分
    var score = { '火':0, '土':0, '風':0, '水':0 };
    planets.forEach(function(p, i) { score[p.sign.el] += (i < 2 ? 2 : 1); });
    if (asc != null) score[signOf(asc).el] += 2;
    var dominant = Object.keys(score).sort(function(a, b) { return score[b] - score[a]; })[0];

    var nameMatch = {
      '火':'熱情行動派，名字若多火屬性則加倍旺盛，缺火則可補。',
      '土':'穩健務實派，名字若多土屬性則根基穩固，缺土則可補。',
      '風':'靈活溝通派，名字若多金屬性則思維敏捷，缺金則可補。',
      '水':'感性直覺派，名字若多水屬性則感受力強，缺水則可補。'
    };

    return {
      sunSign: sunSign,
      moonSign: planets[1].sign,
      ascendant: asc != null ? { lon: asc, sign: signOf(asc), degree: fmtDeg(asc) } : null,
      midheaven: mc != null ? { lon: mc, sign: signOf(mc), degree: fmtDeg(mc), house: HOUSES[(Math.floor(mc / 30) - firstHouseSign + 12) % 12] } : null,
      nodes: nodes,
      firstHouseSign: firstHouseSign,
      timeKnown: timeKnown,
      houseSystem: timeKnown ? L('整宮制（' + place.name + '）', 'Whole Sign (' + T(place.name) + ')') : L('太陽宮位制', 'Solar houses'),
      planets: planets,
      aspects: getAspects(planets, !timeKnown),
      minorAspects: getAspects(planets, !timeKnown, MINOR_ASPECT_DEFS),
      elementScore: score,
      dominantElement: dominant,
      nameAdvice: nameMatch[dominant] || ''
    };
  }

  /**
   * 占星組合盤（Composite Chart）：
   * - 同名行星短弧中點；若恰好對分（180°）則標示二義性並略過
   * - 雙方皆有出生時間時，計算組合上升點並採整宮制（Whole Sign）分宮；否則以組合太陽為第 1 宮並略過組合月亮
   * - 計算組合盤內部行星相位與十二宮行星分佈
   */
  function getCompositeChart(chartA, chartB) {
    if (!chartA || !chartB || !chartA.planets || !chartB.planets) return null;
    var bothTime = !!(chartA.timeKnown && chartB.timeKnown);
    var planets = [];
    var omitted = [];
    PLANETS.forEach(function(def, idx) {
      if (!bothTime && def.n === '月亮') return;
      var pa = chartA.planets.filter(function(p) { return p.name === def.n && Number.isFinite(p.lon); })[0];
      var pb = chartB.planets.filter(function(p) { return p.name === def.n && Number.isFinite(p.lon); })[0];
      if (!pa || !pb) return;
      var lon = midpoint(pa.lon, pb.lon);
      if (lon == null) {
        omitted.push(def.n);
        planets.push({ name: def.n, emoji: def.e, element: def.el, desc: def.desc, lon: null, sign: null, degree: null, house: null, ambiguous: true });
      } else {
        planets.push({ name: def.n, emoji: def.e, element: def.el, desc: def.desc, lon: lon, sign: signOf(lon), degree: fmtDeg(lon), house: null, idx: idx });
      }
    });

    var compAsc = (bothTime && chartA.ascendant && chartB.ascendant)
      ? midpoint(chartA.ascendant.lon, chartB.ascendant.lon) : null;
    var compMc = (bothTime && chartA.midheaven && chartB.midheaven)
      ? midpoint(chartA.midheaven.lon, chartB.midheaven.lon) : null;
    var ascAmbiguous = bothTime && chartA.ascendant && chartB.ascendant && compAsc == null;
    var compSun = planets.filter(function(p) { return p.name === '太陽' && p.lon != null; })[0];
    var anchorLon = compAsc != null ? compAsc : (compSun ? compSun.lon : 0);
    var firstHouseSign = Math.floor(norm360(anchorLon) / 30);

    var validPlanets = planets.filter(function(p) { return p.lon != null; });
    validPlanets.forEach(function(p) {
      p.houseNum = (Math.floor(p.lon / 30) - firstHouseSign + 12) % 12 + 1;
      p.house = HOUSES[p.houseNum - 1];
    });
    var compNodes = [];
    if (chartA.nodes && chartB.nodes && chartA.nodes[0] && chartB.nodes[0]) {
      var cnn = midpoint(chartA.nodes[0].lon, chartB.nodes[0].lon);
      if (cnn != null) {
        var csn = norm360(cnn + 180);
        compNodes.push({ name: '北交點', emoji: '☊', lon: cnn, sign: signOf(cnn), degree: fmtDeg(cnn), house: HOUSES[(Math.floor(cnn / 30) - firstHouseSign + 12) % 12], isNode: true });
        compNodes.push({ name: '南交點', emoji: '☋', lon: csn, sign: signOf(csn), degree: fmtDeg(csn), house: HOUSES[(Math.floor(csn / 30) - firstHouseSign + 12) % 12], isNode: true });
      }
    }

    var houses = HOUSES.map(function(h, i) {
      var sIdx = (firstHouseSign + i) % 12;
      return {
        num: i + 1,
        name: h.n,
        desc: h.desc,
        sign: SIGNS[sIdx],
        planets: validPlanets.filter(function(p) { return p.houseNum === i + 1; })
      };
    });

    var score = { '火': 0, '土': 0, '風': 0, '水': 0 };
    validPlanets.forEach(function(p) { score[p.sign.el] += (p.name === '太陽' || p.name === '月亮' ? 2 : 1); });
    if (compAsc != null) score[signOf(compAsc).el] += 2;
    var dominant = Object.keys(score).sort(function(a, b) { return score[b] - score[a]; })[0];
    var aspects = getAspects(validPlanets, false);
    var minorAspects = getAspects(validPlanets, false, MINOR_ASPECT_DEFS);

    return {
      timeKnown: bothTime,
      partial: !bothTime,
      ascendant: compAsc != null ? { lon: compAsc, sign: signOf(compAsc), degree: fmtDeg(compAsc) } : null,
      midheaven: compMc != null ? { lon: compMc, sign: signOf(compMc), degree: fmtDeg(compMc), house: HOUSES[(Math.floor(compMc / 30) - firstHouseSign + 12) % 12] } : null,
      nodes: compNodes,
      ascAmbiguous: ascAmbiguous,
      firstHouseSign: firstHouseSign,
      houseSystem: compAsc != null
        ? L('整宮制（組合上升）', 'Whole Sign (Composite Ascendant)')
        : (ascAmbiguous ? L('太陽宮位制（雙方上升對分）', 'Solar houses (Ascendants opposed)') : L('太陽宮位制（缺時辰估算）', 'Solar houses (partial time)')),
      planets: planets,
      validPlanets: validPlanets,
      omitted: omitted,
      houses: houses,
      aspects: aspects,
      minorAspects: minorAspects,
      elementScore: score,
      dominantElement: dominant
    };
  }

  function escSvg(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /**
   * 完整星盤圖形 SVG（560×560）：外圈十二星座、中圈十二宮位（整宮制）、行星／交點符號與相位連線
   * 適用本命盤或組合盤；opts 可選 showNodes (預設 true)、showMinor (預設 false)
   */
  function renderWheelSVG(chart, opts) {
    if (!chart) return '';
    var showNodes = !opts || opts.showNodes !== false;
    var showMinor = !!(opts && opts.showMinor);
    var basePlanets = (chart.validPlanets || chart.planets || []).filter(function(p) { return Number.isFinite(p.lon); });
    if (!basePlanets.length) return '';
    var planets = showNodes && Array.isArray(chart.nodes) && chart.nodes.length
      ? basePlanets.concat(chart.nodes.filter(function(n) { return Number.isFinite(n.lon); }))
      : basePlanets;
    var firstHouseSign = chart.firstHouseSign != null
      ? chart.firstHouseSign
      : Math.floor(norm360(chart.ascendant ? chart.ascendant.lon : planets[0].lon) / 30);
    var refLon = firstHouseSign * 30;
    var cx = 280, cy = 280;
    var rOuter = 252, rSignIn = 212, rHouseIn = 186, rPlanet = 158, rAspect = 128;
    var rad = Math.PI / 180;
    var pt = function(r, lon) {
      var a = (180 + norm360(lon - refLon)) * rad;
      return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) };
    };
    var EL_FILL = { '火': 'rgba(231,76,60,0.12)', '土': 'rgba(212,168,67,0.12)', '風': 'rgba(93,173,226,0.12)', '水': 'rgba(46,204,113,0.12)' };
    var ASP_COL = { '吉': '#2ecc71', '挑戰': '#e74c3c', '中性': '#d4a843' };

    var svg = '<svg class="astro-wheel-svg" viewBox="0 0 560 560" role="img" aria-label="' + escSvg((opts && opts.title) || L('星盤圖', 'Astrology Wheel')) + '">';
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + rOuter + '" fill="var(--color-bg-mid, #2D1810)" stroke="var(--color-gold-primary, #D4A843)" stroke-width="1.5"/>';

    // 12 星座與宮位扇區
    for (var i = 0; i < 12; i++) {
      var sIdx = (firstHouseSign + i) % 12;
      var sign = SIGNS[sIdx];
      var lonStart = sIdx * 30, lonEnd = lonStart + 30;
      var p1o = pt(rOuter, lonStart), p2o = pt(rOuter, lonEnd);
      var p1i = pt(rSignIn, lonStart), p2i = pt(rSignIn, lonEnd);
      svg += '<path d="M ' + p1i.x.toFixed(1) + ' ' + p1i.y.toFixed(1) + ' L ' + p1o.x.toFixed(1) + ' ' + p1o.y.toFixed(1) +
        ' A ' + rOuter + ' ' + rOuter + ' 0 0 0 ' + p2o.x.toFixed(1) + ' ' + p2o.y.toFixed(1) +
        ' L ' + p2i.x.toFixed(1) + ' ' + p2i.y.toFixed(1) +
        ' A ' + rSignIn + ' ' + rSignIn + ' 0 0 1 ' + p1i.x.toFixed(1) + ' ' + p1i.y.toFixed(1) + ' Z" ' +
        'fill="' + (EL_FILL[sign.el] || 'transparent') + '" stroke="rgba(212,168,67,0.35)" stroke-width="1"/>';

      var sMid = pt((rOuter + rSignIn) / 2, lonStart + 15);
      var glyph = sign.n.slice(-1);
      svg += '<text x="' + sMid.x.toFixed(1) + '" y="' + (sMid.y + 5).toFixed(1) + '" text-anchor="middle" font-size="16" fill="var(--color-gold-light, #F0D78C)">' + escSvg(glyph) + '</text>';

      var hLineOut = pt(rSignIn, lonStart), hLineIn = pt(rAspect, lonStart);
      var isAxis = i === 0 || i === 3 || i === 6 || i === 9;
      svg += '<line x1="' + hLineIn.x.toFixed(1) + '" y1="' + hLineIn.y.toFixed(1) + '" x2="' + hLineOut.x.toFixed(1) + '" y2="' + hLineOut.y.toFixed(1) + '" ' +
        'stroke="' + (isAxis ? 'var(--color-gold-primary, #D4A843)' : 'rgba(212,168,67,0.28)') + '" stroke-width="' + (isAxis ? '1.6' : '0.8') + '"/>';
      var hMid = pt((rSignIn + rHouseIn) / 2, lonStart + 15);
      svg += '<text x="' + hMid.x.toFixed(1) + '" y="' + (hMid.y + 4).toFixed(1) + '" text-anchor="middle" font-size="11" font-weight="' + (isAxis ? '700' : '500') + '" fill="var(--color-text-secondary, #C4A870)">' + (i + 1) + '</text>';
    }

    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + rSignIn + '" fill="none" stroke="rgba(212,168,67,0.5)" stroke-width="1"/>';
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + rHouseIn + '" fill="none" stroke="rgba(212,168,67,0.28)" stroke-width="0.9"/>';
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + rAspect + '" fill="var(--color-bg-deep, #1A0A0A)" fill-opacity="0.72" stroke="rgba(212,168,67,0.45)" stroke-width="1"/>';

    if (chart.ascendant && Number.isFinite(chart.ascendant.lon)) {
      var ascOut = pt(rSignIn, chart.ascendant.lon), ascIn = pt(rAspect, chart.ascendant.lon);
      svg += '<line x1="' + ascIn.x.toFixed(1) + '" y1="' + ascIn.y.toFixed(1) + '" x2="' + ascOut.x.toFixed(1) + '" y2="' + ascOut.y.toFixed(1) + '" stroke="#f5d78e" stroke-width="2" stroke-dasharray="4,2"/>';
      var ascLbl = pt(rAspect - 13, chart.ascendant.lon);
      svg += '<text x="' + ascLbl.x.toFixed(1) + '" y="' + (ascLbl.y + 3.5).toFixed(1) + '" text-anchor="middle" font-size="9.5" font-weight="700" fill="#f5d78e">ASC</text>';
    }
    if (chart.midheaven && Number.isFinite(chart.midheaven.lon)) {
      var mcOut = pt(rSignIn, chart.midheaven.lon), mcIn = pt(rAspect, chart.midheaven.lon);
      svg += '<line x1="' + mcIn.x.toFixed(1) + '" y1="' + mcIn.y.toFixed(1) + '" x2="' + mcOut.x.toFixed(1) + '" y2="' + mcOut.y.toFixed(1) + '" stroke="#5dade2" stroke-width="1.8" stroke-dasharray="4,2"/>';
      var mcLbl = pt(rAspect - 13, chart.midheaven.lon);
      svg += '<text x="' + mcLbl.x.toFixed(1) + '" y="' + (mcLbl.y + 3.5).toFixed(1) + '" text-anchor="middle" font-size="9.5" font-weight="700" fill="#5dade2">MC</text>';
    }

    var placed = planets.map(function(p) { return { p: p, dispLon: norm360(p.lon) }; })
      .sort(function(a, b) { return a.dispLon - b.dispLon; });
    for (var pass = 0; pass < 4; pass++) {
      for (var k = 0; k < placed.length; k++) {
        var next = placed[(k + 1) % placed.length];
        var diff = norm360(next.dispLon - placed[k].dispLon);
        if (diff < 11) {
          var nudge = (11 - diff) / 2;
          placed[k].dispLon = norm360(placed[k].dispLon - nudge);
          next.dispLon = norm360(next.dispLon + nudge);
        }
      }
    }

    var byName = {};
    planets.forEach(function(p) { byName[p.name] = p; });
    var drawAspects = (chart.aspects || []).concat(showMinor ? (chart.minorAspects || []) : []);
    drawAspects.forEach(function(a) {
      var p1 = byName[a.p1], p2 = byName[a.p2];
      if (!p1 || !p2) return;
      var q1 = pt(rAspect, p1.lon), q2 = pt(rAspect, p2.lon);
      var col = ASP_COL[a.nature] || '#d4a843';
      var dash = a.minor ? ' stroke-dasharray="2,3"' : (a.type === '六合相' ? ' stroke-dasharray="3,2"' : '');
      svg += '<line x1="' + q1.x.toFixed(1) + '" y1="' + q1.y.toFixed(1) + '" x2="' + q2.x.toFixed(1) + '" y2="' + q2.y.toFixed(1) + '" ' +
        'stroke="' + col + '" stroke-width="' + (a.minor ? '0.9' : '1.25') + '" stroke-opacity="' + (a.minor ? '0.45' : '0.72') + '"' + dash + '/>';
    });

    placed.forEach(function(item) {
      var p = item.p;
      var tickOut = pt(rHouseIn, p.lon), tickIn = pt(rAspect, p.lon);
      var gp = pt(rPlanet, item.dispLon);
      svg += '<line x1="' + tickIn.x.toFixed(1) + '" y1="' + tickIn.y.toFixed(1) + '" x2="' + tickOut.x.toFixed(1) + '" y2="' + tickOut.y.toFixed(1) + '" stroke="rgba(240,215,140,0.35)" stroke-width="0.8"/>';
      svg += '<circle cx="' + tickIn.x.toFixed(1) + '" cy="' + tickIn.y.toFixed(1) + '" r="2.3" fill="' + (p.isNode ? '#5dade2' : 'var(--color-gold-light, #F0D78C)') + '"/>';
      svg += '<text x="' + gp.x.toFixed(1) + '" y="' + (gp.y + 5).toFixed(1) + '" text-anchor="middle" font-size="' + (p.isNode ? '12.5' : '14') + '" fill="' + (p.isNode ? '#85c1e9' : 'var(--color-text-primary, #F5E6CC)') + '">' + escSvg(p.emoji) + '</text>';
    });

    svg += '</svg>';
    return svg;
  }

  /**
   * 流年行運（Transit）：指定日期行星位置對本命盤之宮位與主要相位
   * 略過行運月亮（每日移動約 13°）；本命缺時辰時亦略過本命月亮／上升／中天
   */
  function getTransits(natalChart, year, month, day, place) {
    if (!natalChart || !natalChart.planets || !year || !month || !day) return null;
    var sky = getChart(year, month, day, 12, 0, place);
    if (!sky) return null;
    var firstHouseSign = natalChart.firstHouseSign != null
      ? natalChart.firstHouseSign
      : Math.floor(norm360(natalChart.ascendant ? natalChart.ascendant.lon : natalChart.planets[0].lon) / 30);

    var transits = sky.planets.filter(function(p) { return p.name !== '月亮'; }).map(function(p) {
      return {
        name: p.name, emoji: p.emoji, lon: p.lon, sign: p.sign, degree: p.degree, retrograde: p.retrograde,
        natalHouse: HOUSES[(Math.floor(p.lon / 30) - firstHouseSign + 12) % 12]
      };
    });

    var targets = natalChart.planets.filter(function(p) { return natalChart.timeKnown || p.name !== '月亮'; })
      .map(function(p) { return { name: p.name, emoji: p.emoji, lon: p.lon }; });
    if (natalChart.timeKnown && natalChart.ascendant) targets.push({ name: '上升點', emoji: 'ASC', lon: natalChart.ascendant.lon });
    if (natalChart.timeKnown && natalChart.midheaven) targets.push({ name: '中天', emoji: 'MC', lon: natalChart.midheaven.lon });

    var aspects = [];
    transits.forEach(function(tp) {
      var inner = ['太陽','水星','金星','火星'].indexOf(tp.name) >= 0;
      targets.forEach(function(np) {
        var sep = separation(tp.lon, np.lon);
        for (var k = 0; k < ASPECT_DEFS.length; k++) {
          var def = ASPECT_DEFS[k];
          var maxOrb = Math.min(def.orb, inner ? 3 : 5);
          var orb = Math.abs(sep - def.angle);
          if (orb > maxOrb) continue;
          aspects.push({
            tPlanet: tp.name, tEmoji: tp.emoji,
            nPoint: np.name, nEmoji: np.emoji,
            type: def.type, angle: def.angle + '°', orb: Math.round(orb * 10) / 10,
            nature: def.nature, priority: def.priority,
            desc: L('行運' + tp.name + def.type + '本命' + np.name + '（容許度 ' + orb.toFixed(1) + '°）',
              'Transit ' + T(tp.name) + ' ' + T(def.type).toLowerCase() + ' natal ' + T(np.name) + ' (orb ' + orb.toFixed(1) + '°)')
          });
          break;
        }
      });
    });
    aspects.sort(function(a, b) { return a.priority - b.priority || a.orb - b.orb; });
    return {
      dateStr: year + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day,
      planets: transits,
      aspects: aspects
    };
  }

  return {
    getChart: getChart, getCompositeChart: getCompositeChart, getTransits: getTransits, renderWheelSVG: renderWheelSVG,
    getAspects: getAspects, midpoint: midpoint, separation: separation, norm360: norm360,
    PLANETS: PLANETS, HOUSES: HOUSES, SIGNS: SIGNS, ASPECT_DEFS: ASPECT_DEFS, MINOR_ASPECT_DEFS: MINOR_ASPECT_DEFS, getSign: getSign
  };
})();
