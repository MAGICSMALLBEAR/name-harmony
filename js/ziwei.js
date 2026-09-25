/**
 * 紫微斗數引擎 — 農曆排盤：命身宮、五行局、14主星、輔星、生年四化
 */
window.Ziwei = (function() {

  var TIAN_GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];

  // 生年四化（中州派）：年干 → 化祿/化權/化科/化忌 對應的星曜
  // 部分對應星（文昌/文曲/左輔/右弼）不在14主星表中，此時該化落於輔星，不掛靠任何宮位
  var SIHUA_TABLE = {
    '甲': { '化祿':'廉貞', '化權':'破軍', '化科':'武曲', '化忌':'太陽' },
    '乙': { '化祿':'天機', '化權':'天梁', '化科':'紫微', '化忌':'太陰' },
    '丙': { '化祿':'天同', '化權':'天機', '化科':'文昌', '化忌':'廉貞' },
    '丁': { '化祿':'太陰', '化權':'天同', '化科':'天機', '化忌':'巨門' },
    '戊': { '化祿':'貪狼', '化權':'太陰', '化科':'右弼', '化忌':'天機' },
    '己': { '化祿':'武曲', '化權':'貪狼', '化科':'天梁', '化忌':'文曲' },
    '庚': { '化祿':'太陽', '化權':'武曲', '化科':'太陰', '化忌':'天同' },
    '辛': { '化祿':'巨門', '化權':'太陽', '化科':'文曲', '化忌':'文昌' },
    '壬': { '化祿':'天梁', '化權':'紫微', '化科':'左輔', '化忌':'武曲' },
    '癸': { '化祿':'破軍', '化權':'巨門', '化科':'太陰', '化忌':'貪狼' }
  };

  var SIHUA_MEANING = {
    '化祿': '增益、順遂、財源與人緣的加持，四化中最吉，代表該宮位之事容易水到渠成。',
    '化權': '掌握主導權、企圖心與行動力增強，能有所成就，但也容易流於強勢或壓力過大。',
    '化科': '帶來名聲、貴人、考運與文書上的順利，是較溫和的吉象，利於學業與名譽。',
    '化忌': '容易出現糾結、阻礙、反覆或需要特別留意的課題，是四化中最需謹慎面對的一化。'
  };

  // 14主星
  var STARS = {
    '紫微':{el:'土',g:'大吉',desc:'帝星，尊貴權威。有領導力、自尊心強、追求卓越。適合管理職、政治、高階主管。'},
    '天機':{el:'木',g:'吉',desc:'智慧之星，善於策劃與思考。聰明靈活、適應力強。適合顧問、策劃、科技業。'},
    '太陽':{el:'火',g:'吉',desc:'光明熱情，慷慨大方。外向積極、有正義感。適合公眾人物、業務、外交。'},
    '武曲':{el:'金',g:'吉',desc:'財星，果斷剛毅。理財能力強、執行力高。適合金融、軍警、運動。'},
    '天同':{el:'水',g:'吉',desc:'福星，溫和善良。知足常樂、人緣佳。適合服務業、藝術、教育。'},
    '廉貞':{el:'火',g:'平',desc:'桃花星兼權星。有魅力、善交際但有時衝動。適合公關、設計、娛樂。'},
    '天府':{el:'土',g:'大吉',desc:'庫星，穩重包容。善於理財與管理。適合銀行、不動產、倉儲物流。'},
    '太陰':{el:'水',g:'吉',desc:'陰柔之星，細膩敏感。有藝術氣質、重視家庭。適合文學、設計、房產。'},
    '貪狼':{el:'木',g:'平',desc:'桃花星，多才多藝。有魅力、善社交但有時貪心。適合演藝、行銷、外交。'},
    '巨門':{el:'水',g:'平',desc:'暗星，口才犀利。有辯才、善分析但有時多疑。適合律師、評論、研究。'},
    '天相':{el:'水',g:'吉',desc:'印星，溫和善良。善於輔佐與服務。適合秘書、醫療、公務員。'},
    '天梁':{el:'土',g:'吉',desc:'壽星，正直穩重。有長者風範、樂於助人。適合醫護、教育、社福。'},
    '七殺':{el:'金',g:'凶',desc:'將星，剛強果斷。有開創力但有時孤僻。適合軍警、創業、競技。'},
    '破軍':{el:'水',g:'凶',desc:'破耗之星，敢於破壞重建。有改革精神但有時衝動。適合改革者、冒險家。'}
  };

  // 12宮位
  var PALACES = [
    {n:'命宮',desc:'代表自我、性格、天賦與命運主軸。'},
    {n:'兄弟宮',desc:'代表手足關係、同儕互動。'},
    {n:'夫妻宮',desc:'代表婚姻、伴侶關係與感情觀。'},
    {n:'子女宮',desc:'代表子女、創作、享樂。'},
    {n:'財帛宮',desc:'代表財運、理財能力與金錢觀。'},
    {n:'疾厄宮',desc:'代表健康、體質與災厄。'},
    {n:'遷移宮',desc:'代表外出運、變動與旅行。'},
    {n:'交友宮',desc:'代表人際關係、朋友與下屬。'},
    {n:'官祿宮',desc:'代表事業、工作與社會地位。'},
    {n:'田宅宮',desc:'代表家庭、房產與居住環境。'},
    {n:'福德宮',desc:'代表精神生活、福氣與享受。'},
    {n:'父母宮',desc:'代表父母、長輩與上司關係。'}
  ];

  var DI_ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

  // 六十甲子納音五行（每兩組干支一個納音）
  var NAYIN_ELE = '金火木土金火水土金木水土火木水金火木土金火水土金木水土火木水';
  var BUREAU = { '水':2, '木':3, '金':4, '土':5, '火':6 };

  function mod12(n) { return ((n % 12) + 12) % 12; }

  /** 國曆轉農曆（js/lunar.js），回傳 { year, month, day, leap } */
  function toLunar(year, month, day) {
    return window.Lunar ? window.Lunar.fromSolar(year, month, day) : null;
  }

  /** 天干地支 → 六十甲子序號 */
  function jiaziIndex(tgIdx, dzIdx) {
    return ((6 * tgIdx - 5 * dzIdx) % 60 + 60) % 60;
  }

  /** 紫微星所在地支：農曆日 + 五行局數 */
  function ziweiPosition(lunarDay, bureau) {
    var x = 0;
    while ((lunarDay + x) % bureau !== 0) x++;
    var q = (lunarDay + x) / bureau;
    var pos = 2 + q - 1; // 由寅宮起數
    pos += (x % 2 === 1) ? -x : x; // 補數為奇數退、偶數進
    return mod12(pos);
  }

  /**
   * 依生日排紫微盤（以農曆正月初一換年；命宮與主星需要出生時辰）
   * 沒有時辰時只回傳生年四化，needHour = true
   * gender（'male' / 'female'）用於排大限：陽男陰女順行、陰男陽女逆行，由命宮起、局數為起始歲數（虛歲）
   */
  function getZiweiChart(year, month, day, hour, gender) {
    if (!year || !month || !day) return null;
    var hasHour = hour != null && hour >= 0 && hour <= 23;

    // 23 點後為子時，屬於隔天
    var lunar = hasHour && hour === 23
      ? (function() { var d = new Date(Date.UTC(year, month - 1, day + 1)); return toLunar(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()); })()
      : toLunar(year, month, day);
    if (!lunar) return null;

    var yIdx = ((lunar.year - 4) % 60 + 60) % 60;
    var yearTG = TIAN_GAN[yIdx % 10];
    var yearDZ = DI_ZHI[yIdx % 12];
    var lunarText = '農曆' + yearTG + yearDZ + '年' + (lunar.leap ? '閏' : '') + lunar.month + '月' + lunar.day + '日';

    if (!hasHour) {
      return { needHour: true, lunar: lunar, lunarText: lunarText, sihua: getSihua(yearTG, null) };
    }

    // 閏月：前半月算本月，後半月算下個月
    var m = lunar.month + (lunar.leap && lunar.day > 15 ? 1 : 0);
    if (m > 12) m = 1;
    var hIdx = Math.floor((hour + 1) % 24 / 2); // 子=0
    var mingPos = mod12(2 + (m - 1) - hIdx);
    var shenPos = mod12(2 + (m - 1) + hIdx);

    // 宮干：五虎遁，由年干定寅宮天干
    var yinTG = [2, 4, 6, 8, 0][yIdx % 10 % 5];
    function palaceTG(pos) { return (yinTG + mod12(pos - 2)) % 10; }

    // 五行局：命宮干支納音
    var mingTG = palaceTG(mingPos);
    var nayin = NAYIN_ELE.charAt(Math.floor(jiaziIndex(mingTG, mingPos) / 2));
    var bureau = BUREAU[nayin];

    // 安十四主星
    var z = ziweiPosition(lunar.day, bureau);
    var f = mod12(4 - z); // 天府與紫微以寅申線對稱
    var starAt = {};
    function put(name, pos) { pos = mod12(pos); (starAt[pos] = starAt[pos] || []).push(name); }
    put('紫微', z); put('天機', z - 1); put('太陽', z - 3); put('武曲', z - 4); put('天同', z - 5); put('廉貞', z - 8);
    put('天府', f); put('太陰', f + 1); put('貪狼', f + 2); put('巨門', f + 3); put('天相', f + 4); put('天梁', f + 5); put('七殺', f + 6); put('破軍', f + 10);

    var minorAt = {};
    function putMinor(name, pos) { pos = mod12(pos); (minorAt[pos] = minorAt[pos] || []).push(name); }
    putMinor('文昌', 10 - hIdx); putMinor('文曲', 4 + hIdx); putMinor('左輔', 4 + (m - 1)); putMinor('右弼', 10 - (m - 1));

    // 12宮：由命宮逆排
    var palaces = PALACES.map(function(p, i) {
      var pos = mod12(mingPos - i);
      var stars = starAt[pos] || [];
      var borrowed = false;
      if (!stars.length) { stars = starAt[mod12(pos + 6)] || []; borrowed = true; } // 空宮借對宮主星
      var first = STARS[stars[0]];
      return {
        name: p.n,
        desc: p.desc,
        branch: DI_ZHI[pos],
        ganzhi: TIAN_GAN[palaceTG(pos)] + DI_ZHI[pos],
        stars: stars,
        minorStars: minorAt[pos] || [],
        borrowed: borrowed,
        star: stars.join('、') + (borrowed ? '（借）' : ''),
        starDesc: stars.map(function(s) { return s + '：' + STARS[s].desc; }).join(' '),
        starEle: first ? first.el : '土',
        starGlory: stars.map(function(s) { return STARS[s].g; }).join('/'),
        isMing: i === 0,
        isShen: pos === shenPos
      };
    });

    // 大限
    var hasGender = gender === 'male' || gender === 'female';
    var forward = hasGender && ((gender === 'male') === (yIdx % 2 === 0));
    var nowAge = new Date().getFullYear() - lunar.year + 1; // 虛歲（約略）
    var currentDecadal = null;
    if (hasGender) {
      palaces.forEach(function(p, i) {
        var pos = mod12(mingPos - i);
        var j = forward ? mod12(pos - mingPos) : mod12(mingPos - pos);
        p.decadal = { start: bureau + j * 10, end: bureau + j * 10 + 9 };
        if (nowAge >= p.decadal.start && nowAge <= p.decadal.end) { p.isCurrentDecadal = true; currentDecadal = p; }
      });
    }

    var mingPalace = palaces[0];
    var shenPalace = palaces.filter(function(p) { return p.isShen; })[0];

    return {
      palaces: palaces,
      lunar: lunar,
      lunarText: lunarText,
      bureau: nayin + ['','','二','三','四','五','六'][bureau] + '局',
      mingPalace: mingPalace,
      shenPalace: shenPalace,
      mingStar: mingPalace.star,
      mingEle: mingPalace.starEle,
      mingGlory: mingPalace.starGlory,
      mingDesc: (mingPalace.borrowed ? '命宮無主星，借對宮（遷移宮）' + mingPalace.stars.join('、') + '論。' : '') + mingPalace.starDesc,
      sihua: getSihua(yearTG, palaces),
      decadal: hasGender ? { forward: forward, current: currentDecadal, nowAge: nowAge } : null
    };
  }

  /** 依農曆年干取生年四化，並比對落於哪個宮位（palaces 為 null 時只列星曜） */
  function getSihua(tg, palaces) {
    var table = SIHUA_TABLE[tg];
    if (!table) return null;

    var list = Object.keys(table).map(function(type) {
      var star = table[type];
      var palace = null;
      if (palaces) {
        palace = palaces.filter(function(p) {
          return (!p.borrowed && p.stars.indexOf(star) >= 0) || p.minorStars.indexOf(star) >= 0;
        })[0] || null;
      }
      var reading = star + (palace ? '在' + palace.name : '') + type + '：' + SIHUA_MEANING[type];
      return { type: type, star: star, palace: palace, reading: reading };
    });

    return { tg: tg, list: list };
  }

  /** 紫微命宮 vs 姓名人格比對 */
  function ziweiNameCompare(ziwei, chineseResult) {
    if (!ziwei || ziwei.needHour || !chineseResult) return null;
    var renEle = chineseResult.grids.ren.element;
    var mingEle = ziwei.mingEle;

    // 五行關係
    var relMap = {
      '木木':'同氣相求','火火':'同氣相求','土土':'同氣相求','金金':'同氣相求','水水':'同氣相求',
      '木火':'相生吉配','火土':'相生吉配','土金':'相生吉配','金水':'相生吉配','水木':'相生吉配',
      '火木':'被生有貴人','土火':'被生有貴人','金土':'被生有貴人','水金':'被生有貴人','木水':'被生有貴人',
      '木土':'相剋需調和','土水':'相剋需調和','水火':'相剋需調和','火金':'相剋需調和','金木':'相剋需調和',
      '土木':'被剋有壓力','水土':'被剋有壓力','火水':'被剋有壓力','金火':'被剋有壓力','木金':'被剋有壓力'
    };
    var rel = relMap[mingEle + renEle] || '一般';

    var score = rel.indexOf('吉') >= 0 ? 85 : rel.indexOf('生') >= 0 ? 75 : rel.indexOf('同') >= 0 ? 70 : rel.indexOf('相剋') >= 0 ? 40 : 30;

    return {
      rel: rel,
      score: score,
      reading: '命宮主星' + ziwei.mingStar + '（' + mingEle + '）與人格' + renEle + '的關係為「' + rel + '」。' +
        (score >= 70 ? '命格與姓名五行和諧，先天命盤與後天姓名互相加持。' :
         '命格與姓名五行有衝突，建議透過改名或開運物來調和。')
    };
  }

  return {
    getZiweiChart: getZiweiChart,
    ziweiNameCompare: ziweiNameCompare,
    STARS: STARS,
    PALACES: PALACES
  };
})();
