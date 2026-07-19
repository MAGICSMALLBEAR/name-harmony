/**
 * 生肖八字簡易分析引擎
 * 生肖計算、天干地支、五行歸屬、生肖配對
 */
window.ZodiacBazi = (function() {

  // 天干
  var TIAN_GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  var TIAN_GAN_ELE = ['木','木','火','火','土','土','金','金','水','水'];

  // 地支
  var DI_ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  var DI_ZHI_ELE = ['水','土','木','木','土','火','火','土','金','金','土','水'];

  // 生肖
  var ZODIAC = ['鼠','牛','虎','兔','龍','蛇','馬','羊','猴','雞','狗','豬'];
  var ZODIAC_ELE = ['水','土','木','木','土','火','火','土','金','金','土','水'];
  var ZODIAC_NATURE = {
    '鼠': '機智靈敏、善於應變、社交能力強、有時過於謹慎',
    '牛': '勤奮踏實、有耐心毅力、責任感強、有時固執',
    '虎': '勇敢果斷、有領導力、熱情洋溢、有時衝動',
    '兔': '溫和敏感、有藝術天分、善解人意、有時優柔寡斷',
    '龍': '自信大方、有領導魅力、充滿活力、有時自負',
    '蛇': '智慧深邃、直覺敏銳、善於思考、有時多疑',
    '馬': '熱情自由、行動力強、樂觀進取、有時急躁',
    '羊': '溫柔和善、有同理心、藝術氣質、有時依賴',
    '猴': '聰明機智、多才多藝、好奇心強、有時善變',
    '雞': '勤勉認真、注重細節、有原則、有時挑剔',
    '狗': '忠誠正直、有正義感、值得信賴、有時固執',
    '豬': '寬厚真誠、樂於分享、心地善良、有時天真'
  };

  // 生肖配對（傳統六合三合）
  var ZODIAC_COMPAT = {
    '鼠': { best: ['牛','龍','猴'], good: ['鼠','虎','兔','豬'], bad: ['馬','羊'] },
    '牛': { best: ['鼠','蛇','雞'], good: ['牛','虎','兔','豬'], bad: ['馬','羊','龍'] },
    '虎': { best: ['馬','狗','豬'], good: ['虎','兔','龍','鼠'], bad: ['蛇','猴'] },
    '兔': { best: ['羊','狗','豬'], good: ['兔','虎','龍','鼠'], bad: ['雞','鼠'] },
    '龍': { best: ['鼠','猴','雞'], good: ['龍','虎','兔','蛇'], bad: ['狗','牛'] },
    '蛇': { best: ['牛','雞','猴'], good: ['蛇','馬','羊','龍'], bad: ['虎','豬'] },
    '馬': { best: ['虎','羊','狗'], good: ['馬','蛇','猴','雞'], bad: ['鼠','牛'] },
    '羊': { best: ['兔','馬','豬'], good: ['羊','蛇','猴','雞'], bad: ['鼠','牛'] },
    '猴': { best: ['鼠','龍','蛇'], good: ['猴','狗','豬','雞'], bad: ['虎','豬'] },
    '雞': { best: ['牛','龍','蛇'], good: ['雞','狗','豬','猴'], bad: ['兔','鼠'] },
    '狗': { best: ['虎','兔','馬'], good: ['狗','猴','雞','豬'], bad: ['龍','牛'] },
    '豬': { best: ['虎','兔','羊'], good: ['豬','鼠','牛','狗'], bad: ['蛇','猴'] }
  };

  // 生肖五行
  function zodiacElement(zodiac) {
    var idx = ZODIAC.indexOf(zodiac);
    return idx >= 0 ? ZODIAC_ELE[idx] : null;
  }

  // 計算生肖
  function getZodiac(year) {
    if (!year) return null;
    // 以農曆立春約 2/4 為界，此處簡化為 2/1
    var idx = (year - 4) % 12;
    return ZODIAC[idx];
  }

  // 計算八字（簡易版：年柱）
  function getYearPillar(year) {
    if (!year) return null;
    var tgIdx = (year - 4) % 10;
    var dzIdx = (year - 4) % 12;
    return {
      tianGan: TIAN_GAN[tgIdx],
      diZhi: DI_ZHI[dzIdx],
      element: TIAN_GAN_ELE[tgIdx],
      zodiac: ZODIAC[dzIdx]
    };
  }

  // 計算日主五行（簡化：以年天干代表）
  function getDayMaster(year) {
    if (!year) return null;
    var tgIdx = (year - 4) % 10;
    return TIAN_GAN_ELE[tgIdx];
  }

  // 星座（太陽星座，簡化日期範圍）
  function getStarSign(month, day) {
    if (!month || !day) return null;
    var signs = [
      { name: '摩羯座', emoji: '♑', element: '土', start: [1,1], end: [1,19] },
      { name: '水瓶座', emoji: '♒', element: '風', start: [1,20], end: [2,18] },
      { name: '雙魚座', emoji: '♓', element: '水', start: [2,19], end: [3,20] },
      { name: '牡羊座', emoji: '♈', element: '火', start: [3,21], end: [4,19] },
      { name: '金牛座', emoji: '♉', element: '土', start: [4,20], end: [5,20] },
      { name: '雙子座', emoji: '♊', element: '風', start: [5,21], end: [6,21] },
      { name: '巨蟹座', emoji: '♋', element: '水', start: [6,22], end: [7,22] },
      { name: '獅子座', emoji: '♌', element: '火', start: [7,23], end: [8,22] },
      { name: '處女座', emoji: '♍', element: '土', start: [8,23], end: [9,22] },
      { name: '天秤座', emoji: '♎', element: '風', start: [9,23], end: [10,23] },
      { name: '天蠍座', emoji: '♏', element: '水', start: [10,24], end: [11,22] },
      { name: '射手座', emoji: '♐', element: '火', start: [11,23], end: [12,21] },
      { name: '摩羯座', emoji: '♑', element: '土', start: [12,22], end: [12,31] }
    ];
    for (var i = 0; i < signs.length; i++) {
      var s = signs[i];
      if ((month > s.start[0] || (month === s.start[0] && day >= s.start[1])) &&
          (month < s.end[0] || (month === s.end[0] && day <= s.end[1]))) {
        return s;
      }
    }
    return signs[0]; // fallback
  }

  // 生肖配對分析
  function zodiacCompatibility(z1, z2) {
    if (!z1 || !z2) return null;
    var c = ZODIAC_COMPAT[z1];
    if (!c) return { score: 50, detail: z1 + '與' + z2 + ' — 未知配對。' };
    if (c.best.indexOf(z2) >= 0) {
      return { score: 95, detail: z1 + '與' + z2 + '是傳統六合/三合生肖配對，極為契合！天生就有高度的理解與默契，無論合作或情感關係都非常適合。' };
    }
    if (c.good.indexOf(z2) >= 0) {
      return { score: 75, detail: z1 + '與' + z2 + '生肖相容，彼此相處融洽，雖然不是最頂級的配對，但能建立良好的互動關係。' };
    }
    if (c.bad.indexOf(z2) >= 0) {
      return { score: 30, detail: z1 + '與' + z2 + '在傳統生肖配對中相沖，彼此的個性與處事方式有較大差異，需更多的包容與理解。但相沖不代表不能相處，反而可以互相學習成長。' };
    }
    return { score: 60, detail: z1 + '與' + z2 + ' — 中等的生肖配對，沒有特別的優勢或劣勢，關係發展取決於後天的相處與經營。' };
  }

  // 五行與生肖綜合分析
  function fullAnalysis(year, month, day) {
    var zodiac = year ? getZodiac(year) : null;
    var yearPillar = year ? getYearPillar(year) : null;
    var dayMaster = year ? getDayMaster(year) : null;
    var starSign = (month && day) ? getStarSign(month, day) : null;

    return {
      zodiac: zodiac,
      zodiacNature: zodiac ? ZODIAC_NATURE[zodiac] : null,
      yearPillar: yearPillar,
      dayMaster: dayMaster,
      starSign: starSign,
      hasData: !!(zodiac || starSign)
    };
  }

  return {
    getZodiac: getZodiac,
    getYearPillar: getYearPillar,
    getDayMaster: getDayMaster,
    getStarSign: getStarSign,
    zodiacCompatibility: zodiacCompatibility,
    fullAnalysis: fullAnalysis,
    zodiacElement: zodiacElement,
    ZODIAC_NATURE: ZODIAC_NATURE
  };
})();
