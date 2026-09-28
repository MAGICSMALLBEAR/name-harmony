/**
 * 八字命盤引擎 v2 — 完整四柱 + 十神 + 姓名比對
 */
window.ZodiacBazi = (function() {

  var TIAN_GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  var TIAN_GAN_ELE = ['木','木','火','火','土','土','金','金','水','水'];
  var DI_ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  var DI_ZHI_ELE = ['水','土','木','木','土','火','火','土','金','金','土','水'];
  var ZODIAC = ['鼠','牛','虎','兔','龍','蛇','馬','羊','猴','雞','狗','豬'];
  var ZODIAC_NATURE = {
    '鼠':'機智靈敏、善於應變','牛':'勤奮踏實、有耐心','虎':'勇敢果斷、有領導力',
    '兔':'溫和敏感、有藝術天分','龍':'自信大方、有魅力','蛇':'智慧深邃、直覺敏銳',
    '馬':'熱情自由、行動力強','羊':'溫柔和善、有同理心','猴':'聰明機智、多才多藝',
    '雞':'勤勉認真、注重細節','狗':'忠誠正直、有正義感','豬':'寬厚真誠、心地善良'
  };

  // ========== 四柱計算 ==========

  // ========== 節氣（以太陽視黃經計算，Meeus 低精度公式，誤差約 15 分鐘） ==========

  /** 太陽視黃經（度），jd 為儒略日 */
  function sunLongitude(jd) {
    var T = (jd - 2451545) / 36525;
    var rad = Math.PI / 180;
    var L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    var M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * rad;
    var C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M)
          + (0.019993 - 0.000101 * T) * Math.sin(2 * M)
          + 0.000289 * Math.sin(3 * M);
    var omega = (125.04 - 1934.136 * T) * rad;
    var lon = L0 + C - 0.00569 - 0.00478 * Math.sin(omega);
    return ((lon % 360) + 360) % 360;
  }

  /**
   * 第 k 個「節」的交節時刻（k=0 小寒@1月, 1 立春@2月, …, 11 大雪@12月）
   * 回傳以 UTC+8 牆上時間表示的毫秒值（可直接與 Date.UTC(y,m-1,d,h) 比較）
   */
  var jieCache = {};

  function jieMoment(year, k) {
    var key = year + ':' + k;
    if (jieCache[key] == null) jieCache[key] = computeJie(year, k);
    return jieCache[key];
  }

  function computeJie(year, k) {
    var target = (285 + 30 * k) % 360;
    // 有載入 astronomy-engine 時用它精確求解（秒級），否則用下方 Meeus 近似
    var A = window.Astronomy;
    if (A && A.SearchSunLongitude) {
      try {
        var found = A.SearchSunLongitude(target, new Date(Date.UTC(year, k, 1)), 20);
        if (found) return found.date.getTime() + 8 * 3600000;
      } catch (e) {}
    }
    var jd = Date.UTC(year, k, 6) / 86400000 + 2440587.5; // 各「節」約落在當月 4~8 日
    for (var i = 0; i < 6; i++) {
      var diff = ((target - sunLongitude(jd) + 540) % 360) - 180;
      jd += diff / 0.98565; // 太陽每日平均移動約 0.9856°
    }
    return (jd - 2440587.5) * 86400000 + 8 * 3600000;
  }

  /** 第 k 個節（k 可為 -1 或 12，自動跨年） */
  function jieAt(year, k) {
    if (k < 0) return jieMoment(year - 1, k + 12);
    if (k > 11) return jieMoment(year + 1, k - 12);
    return jieMoment(year, k);
  }

  /**
   * 依節氣決定八字的年與月：立春換年、各「節」換月
   * year..minute 為出生地標準時間，tzOffset 為該地標準時偏移（小時，預設 +8）
   * 未提供時辰時以正午判斷交節當天
   * 回傳 t（出生時刻，UTC+8 表示）與前後兩個節的時刻，供大運起運計算
   */
  function solarYearMonth(year, month, day, hour, minute, tzOffset) {
    var hasHour = hour != null && hour >= 0 && hour <= 23;
    var tz = tzOffset == null ? 8 : tzOffset;
    var t = Date.UTC(year, month - 1, day, hasHour ? hour : 12, hasHour ? (minute || 0) : 0) + (8 - tz) * 3600000;
    var k = month - 1;
    if (t < jieAt(year, k)) k -= 1; // 尚未交本月的節，仍屬上個節氣月
    var baziYear = (t >= jieMoment(year, 1)) ? year : year - 1;
    var mIdx = ((k - 1) % 12 + 12) % 12; // 寅月=0（立春起），小寒起為丑月=11
    return { year: baziYear, mIdx: mIdx, t: t, prevJie: jieAt(year, k), nextJie: jieAt(year, k + 1) };
  }

  /** 年柱（year 為以立春為界的八字年） */
  function yearPillar(year) {
    var idx = ((year - 4) % 60 + 60) % 60;
    return { tg: TIAN_GAN[idx % 10], dz: DI_ZHI[idx % 12], tgEle: TIAN_GAN_ELE[idx % 10], dzEle: DI_ZHI_ELE[idx % 12], zodiac: ZODIAC[idx % 12] };
  }

  /** 月柱：依八字年的年干 + 節氣月（mIdx，寅月=0）起月 */
  function monthPillar(baziYear, mIdx) {
    var yTG = yearPillar(baziYear).tg;
    var yIdx = TIAN_GAN.indexOf(yTG);
    // 甲己年起丙寅, 乙庚年起戊寅, 丙辛年起庚寅, 丁壬年起壬寅, 戊癸年起甲寅
    var startTG = [2,4,6,8,0][yIdx % 5]; // index into TIAN_GAN for 寅月
    var tg = TIAN_GAN[(startTG + mIdx) % 10];
    var dz = DI_ZHI[(mIdx + 2) % 12]; // 寅在地支表的索引為 2
    return { tg: tg, dz: dz, tgEle: TIAN_GAN_ELE[TIAN_GAN.indexOf(tg)], dzEle: DI_ZHI_ELE[DI_ZHI.indexOf(dz)] };
  }

  /** 日柱：基準日推算（1900-01-01 = 甲戌日，驗證準確） */
  function dayPillar(year, month, day) {
    // 用 UTC 避免時區影響
    var base = Date.UTC(1900, 0, 1);
    var target = Date.UTC(year, month - 1, day);
    var days = Math.round((target - base) / 86400000);
    // 1900-01-01 = 甲戌: tgIdx=0(甲), dzIdx=10(戌)
    var tgIdx = ((days % 10) + 10) % 10;
    var dzIdx = ((days % 12) + 10 + 12) % 12;
    return { tg: TIAN_GAN[tgIdx], dz: DI_ZHI[dzIdx], tgEle: TIAN_GAN_ELE[tgIdx], dzEle: DI_ZHI_ELE[dzIdx] };
  }

  /** 時辰 */
  function getShiChen(hour) {
    if (hour == null || hour < 0 || hour > 23) return null;
    var idx = Math.floor((hour + 1) % 24 / 2);
    return { name: DI_ZHI[idx] + '時', dz: DI_ZHI[idx], range: (idx*2+23)%24 + ':00-' + (idx*2) + ':59' };
  }

  /** 時柱：日干+時辰 */
  function hourPillar(dayTG, hour) {
    if (hour == null || hour < 0 || hour > 23) return null;
    var sc = getShiChen(hour);
    var dIdx = TIAN_GAN.indexOf(dayTG);
    // 甲己日起甲子, 乙庚日起丙子...
    var startTG = [0,2,4,6,8][dIdx % 5];
    var hIdx = Math.floor((hour + 1) % 24 / 2);
    var tg = TIAN_GAN[(startTG + hIdx) % 10];
    return { tg: tg, dz: sc.dz, tgEle: TIAN_GAN_ELE[TIAN_GAN.indexOf(tg)], dzEle: DI_ZHI_ELE[DI_ZHI.indexOf(sc.dz)], shiChen: sc };
  }

  /** 完整四柱 */
  function fullBazi(year, month, day, hour, minute, tzOffset) {
    if (!year || !month || !day) return null;
    var sym = solarYearMonth(year, month, day, hour, minute, tzOffset);
    var yp = yearPillar(sym.year);
    var mp = monthPillar(sym.year, sym.mIdx);
    var dp = dayPillar(year, month, day);
    var hp = hourPillar(dp.tg, hour);

    var pillars = [
      { name:'年柱', tg:yp.tg, dz:yp.dz, tgEle:yp.tgEle, dzEle:yp.dzEle, zodiac:yp.zodiac },
      { name:'月柱', tg:mp.tg, dz:mp.dz, tgEle:mp.tgEle, dzEle:mp.dzEle },
      { name:'日柱', tg:dp.tg, dz:dp.dz, tgEle:dp.tgEle, dzEle:dp.dzEle, isDayMaster:true },
      { name:'時柱', tg:hp?hp.tg:'?', dz:hp?hp.dz:'?', tgEle:hp?hp.tgEle:'?', dzEle:hp?hp.dzEle:'?', shiChen: hp?hp.shiChen:null }
    ];

    // 十神
    var dm = dp.tgEle;
    pillars.forEach(function(p) {
      if (p.isDayMaster) { p.shiShen = '日主'; return; }
      p.shiShen = calcShiShen(dm, p.tgEle);
    });

    return {
      pillars: pillars,
      dayMaster: dm,
      dayMasterTG: dp.tg,
      zodiac: yp.zodiac,
      zodiacNature: ZODIAC_NATURE[yp.zodiac],
      hasHour: !!hp,
      birthYear: year,
      jie: { t: sym.t, prev: sym.prevJie, next: sym.nextJie }
    };
  }

  /** 十神計算 */
  function calcShiShen(dayEle, otherEle) {
    var rels = {
      '木木':'比肩','火火':'比肩','土土':'比肩','金金':'比肩','水水':'比肩',
      '木火':'食神','火土':'食神','土金':'食神','金水':'食神','水木':'食神',
      '木土':'正財','火金':'正財','土水':'正財','金木':'正財','水火':'正財',
      '木金':'正官','火水':'正官','土木':'正官','金火':'正官','水土':'正官',
      '木水':'正印','火木':'正印','土火':'正印','金土':'正印','水金':'正印'
    };
    var key = otherEle + dayEle;
    if (rels[key]) return rels[key];
    // 反向：剋日主
    var rev = dayEle + otherEle;
    var revRels = { '木金':'七殺','火水':'七殺','土木':'七殺','金火':'七殺','水土':'七殺', '木火':'傷官','火土':'傷官','土金':'傷官','金水':'傷官','水木':'傷官', '木土':'偏財','火金':'偏財','土水':'偏財','金木':'偏財','水火':'偏財', '木水':'偏印','火木':'偏印','土火':'偏印','金土':'偏印','水金':'偏印' };
    return revRels[rev] || '?';
  }

  // ========== 姓名 vs 八字比對 ==========

  function baziNameCompare(bazi, cnResult) {
    if (!bazi || !cnResult) return null;
    var dm = bazi.dayMaster;

    // 統計八字五行
    var baziCount = { '木':0,'火':0,'土':0,'金':0,'水':0 };
    bazi.pillars.forEach(function(p) {
      if (baziCount[p.tgEle] !== undefined) baziCount[p.tgEle]++;
      if (baziCount[p.dzEle] !== undefined) baziCount[p.dzEle]++;
    });

    // 統計姓名五格五行
    var nameCount = { '木':0,'火':0,'土':0,'金':0,'水':0 };
    ['tian','ren','di','wai','zong'].forEach(function(k) {
      var el = cnResult.grids[k].element;
      if (nameCount[el] !== undefined) nameCount[el]++;
    });

    // 姓名補足分析
    var baziMissing = [];
    var baziStrong = [];
    var nameHelps = [];
    var nameWorsens = [];

    Object.keys(baziCount).forEach(function(el) {
      if (baziCount[el] === 0) baziMissing.push(el);
      if (baziCount[el] >= 3) baziStrong.push(el);
      if (nameCount[el] >= 2 && baziCount[el] <= 1) nameHelps.push(el);
      if (nameCount[el] >= 2 && baziCount[el] >= 3) nameWorsens.push(el);
    });

    var goodPts = nameHelps.length * 10 + (baziMissing.length === 0 ? 20 : 0);
    var badPts = nameWorsens.length * 10;
    var score = Math.max(0, Math.min(100, 60 + goodPts - badPts));

    var reading = '';
    reading += '日主五行為' + dm + '（' + bazi.dayMasterTG + '）。';

    if (baziMissing.length > 0) {
      reading += '命盤中缺少' + baziMissing.join('、') + '，';
      if (nameHelps.length > 0) {
        reading += '而名字中' + nameHelps.join('、') + '較強，正好補足命盤缺口，姓名與八字互補良好。';
      } else {
        reading += '名字中也未補足，建議可考慮在名字中加入' + baziMissing[0] + '屬性的字來平衡。';
      }
    } else {
      reading += '命盤五行齊全，先天條件佳。';
    }

    if (baziStrong.length > 0) {
      reading += '命盤中' + baziStrong.join('、') + '過旺，';
      if (nameWorsens.length > 0) {
        reading += '名字中' + nameWorsens.join('、') + '也偏強，可能加重五行失衡。';
      } else {
        reading += '名字中尚無明顯加重，保持觀察即可。';
      }
    }

    if (score >= 85) {
      reading += ' 總體而言，這個名字與你的八字命盤高度互補，是相當合適的選擇。';
    } else if (score >= 65) {
      reading += ' 總體而言，名字與八字命盤有一定互補，部分細節可以再微調。';
    } else {
      reading += ' 名字與命盤的互補度偏低，建議參考五行分析調整名字。';
    }

    return {
      score: score,
      level: score >= 85 ? '優秀' : score >= 65 ? '良好' : score >= 45 ? '尚可' : '需調整',
      baziElements: baziCount,
      nameElements: nameCount,
      baziMissing: baziMissing,
      baziStrong: baziStrong,
      nameHelps: nameHelps,
      nameWorsens: nameWorsens,
      reading: reading
    };
  }

  // ========== 公開 API（保留舊版相容）==========
  function getZodiac(year) { var p = yearPillar(year); return p.zodiac; }
  function getYearPillar(year) { var p = yearPillar(year); return { tianGan: p.tg, diZhi: p.dz, element: p.tgEle, zodiac: p.zodiac }; }
  function getDayMaster(year) { return yearPillar(year).tgEle; }
  function getStarSign(month, day) {
    if (!month||!day) return null;
    var signs=[{n:'摩羯座',e:'♑',el:'土',s:[1,1],en:[1,19]},{n:'水瓶座',e:'♒',el:'風',s:[1,20],en:[2,18]},{n:'雙魚座',e:'♓',el:'水',s:[2,19],en:[3,20]},{n:'牡羊座',e:'♈',el:'火',s:[3,21],en:[4,19]},{n:'金牛座',e:'♉',el:'土',s:[4,20],en:[5,20]},{n:'雙子座',e:'♊',el:'風',s:[5,21],en:[6,21]},{n:'巨蟹座',e:'♋',el:'水',s:[6,22],en:[7,22]},{n:'獅子座',e:'♌',el:'火',s:[7,23],en:[8,22]},{n:'處女座',e:'♍',el:'土',s:[8,23],en:[9,22]},{n:'天秤座',e:'♎',el:'風',s:[9,23],en:[10,23]},{n:'天蠍座',e:'♏',el:'水',s:[10,24],en:[11,22]},{n:'射手座',e:'♐',el:'火',s:[11,23],en:[12,21]},{n:'摩羯座',e:'♑',el:'土',s:[12,22],en:[12,31]}];
    for(var i=0;i<signs.length;i++){var s=signs[i];if((month>s.s[0]||(month===s.s[0]&&day>=s.s[1]))&&(month<s.en[0]||(month===s.en[0]&&day<=s.en[1])))return{name:s.n,emoji:s.e,element:s.el};}
    return signs[0];
  }

  // 生肖配對
  var ZODIAC_COMPAT = {
    '鼠':{best:['牛','龍','猴'],good:['鼠','虎','兔','豬'],bad:['馬','羊']},
    '牛':{best:['鼠','蛇','雞'],good:['牛','虎','兔','豬'],bad:['馬','羊','龍']},
    '虎':{best:['馬','狗','豬'],good:['虎','兔','龍','鼠'],bad:['蛇','猴']},
    '兔':{best:['羊','狗','豬'],good:['兔','虎','龍','鼠'],bad:['雞','鼠']},
    '龍':{best:['鼠','猴','雞'],good:['龍','虎','兔','蛇'],bad:['狗','牛']},
    '蛇':{best:['牛','雞','猴'],good:['蛇','馬','羊','龍'],bad:['虎','豬']},
    '馬':{best:['虎','羊','狗'],good:['馬','蛇','猴','雞'],bad:['鼠','牛']},
    '羊':{best:['兔','馬','豬'],good:['羊','蛇','猴','雞'],bad:['鼠','牛']},
    '猴':{best:['鼠','龍','蛇'],good:['猴','狗','豬','雞'],bad:['虎','豬']},
    '雞':{best:['牛','龍','蛇'],good:['雞','狗','豬','猴'],bad:['兔','鼠']},
    '狗':{best:['虎','兔','馬'],good:['狗','猴','雞','豬'],bad:['龍','牛']},
    '豬':{best:['虎','兔','羊'],good:['豬','鼠','牛','狗'],bad:['蛇','猴']}
  };
  function zodiacCompatibility(z1,z2){
    if(!z1||!z2)return null;
    var c=ZODIAC_COMPAT[z1];if(!c)return{score:50,detail:z1+'與'+z2+'—未知'};
    if(c.best.indexOf(z2)>=0)return{score:95,detail:z1+z2+'是傳統六合/三合生肖，極為契合！天生默契，適合長期合作或伴侶關係。'};
    if(c.good.indexOf(z2)>=0)return{score:75,detail:z1+z2+'生肖相容，相處融洽，能建立良好關係。'};
    if(c.bad.indexOf(z2)>=0)return{score:30,detail:z1+z2+'傳統相沖，需更多包容理解。'};
    return{score:60,detail:z1+z2+'中等配對，關係取決於後天經營。'};
  }
  function zodiacElement(z){var i=ZODIAC.indexOf(z);return i>=0?DI_ZHI_ELE[i]:null;}

  // 相容舊版 fullAnalysis
  function fullAnalysis(year,month,day,hour,minute,tzOffset){
    var bazi=fullBazi(year,month,day,hour,minute,tzOffset);
    var ss=getStarSign(month,day);
    return {
      zodiac:bazi?bazi.zodiac:null,
      zodiacNature:bazi?bazi.zodiacNature:null,
      yearPillar:bazi?{tianGan:bazi.pillars[0].tg,diZhi:bazi.pillars[0].dz,element:bazi.pillars[0].tgEle,zodiac:bazi.zodiac}:null,
      dayMaster:bazi?bazi.dayMaster:null,
      starSign:ss,
      hasData:!!(bazi||ss),
      bazi:bazi,
      pillars:bazi?bazi.pillars:null
    };
  }

  // ========== 大運/流年 ==========
  /**
   * 八字大運：陽男陰女順排、陰男陽女逆排，由月柱起算
   * 起運：順排數到下一個節、逆排數回上一個節，三天折一年（一天＝四個月）
   */
  function getDaYun(bazi, gender) {
    if (!bazi || (gender !== 'male' && gender !== 'female')) return null;
    var isYang = TIAN_GAN.indexOf(bazi.pillars[0].tg) % 2 === 0;
    var forward = (gender === 'male') === isYang;
    var mTg = TIAN_GAN.indexOf(bazi.pillars[1].tg);
    var mDz = DI_ZHI.indexOf(bazi.pillars[1].dz);

    var span = bazi.jie ? (forward ? bazi.jie.next - bazi.jie.t : bazi.jie.t - bazi.jie.prev) : 0;
    var totalMonths = Math.floor(span / 86400000 * 4); // 1 天 = 4 個月
    var startYears = Math.floor(totalMonths / 12);
    var startMonths = totalMonths % 12;

    var daYuns = [];
    for (var i = 0; i < 8; i++) {
      var offset = forward ? (i + 1) : -(i + 1);
      var dzIdx = ((mDz + offset) % 12 + 12) % 12;
      var tgIdx = ((mTg + offset) % 10 + 10) % 10;
      var age = startYears + i * 10;
      daYuns.push({
        name: TIAN_GAN[tgIdx] + DI_ZHI[dzIdx],
        tg: TIAN_GAN[tgIdx], dz: DI_ZHI[dzIdx],
        tgEle: TIAN_GAN_ELE[tgIdx], dzEle: DI_ZHI_ELE[dzIdx],
        startAge: age,
        startYear: bazi.birthYear ? bazi.birthYear + age : null,
        ages: age + '-' + (age + 9) + '歲',
        shiShen: calcShiShen(bazi.dayMaster, TIAN_GAN_ELE[tgIdx])
      });
    }
    daYuns.forward = forward;
    daYuns.startText = startYears + '歲' + (startMonths ? startMonths + '個月' : '') + '起運';
    return daYuns;
  }

  function getLiuNian(dayMaster, currentYear) {
    if (!currentYear) currentYear = new Date().getFullYear();
    var yp = yearPillar(currentYear);
    var sn = calcShiShen(dayMaster, yp.tgEle);
    var tips = {
      '比肩':'適合建立自信與獨立性，朋友與同輩會是重要支持。',
      '食神':'創意與表達之年，適合發展興趣、享受生活。',
      '正財':'財運穩定之年，努力工作會有合理回報。',
      '正官':'事業發展之年，可能獲得升遷或承擔更多責任。',
      '正印':'學習進修之年，適合讀書、考證照、尋求指導。',
      '七殺':'挑戰與突破之年，壓力較大但成長快速。',
      '傷官':'變革創新之年，適合轉換跑道或突破框架。',
      '偏財':'意外收穫之年，投資運佳但需注意風險。',
      '偏印':'內省沉澱之年，適合獨處與心靈成長。'
    };
    return { year: currentYear, zodiac: yp.zodiac, pillar: yp.tg+yp.dz, shiShen: sn, tip: tips[sn]||'平穩之年', element: yp.tgEle };
  }

  // ========== 喜用神（扶抑法） ==========
  // 日主強弱只看八字本身（同黨＝比劫＋印，月令權重最重），與名字無關。
  // 名字的角色是「補」喜用神，不是決定喜用神——所以這支放在八字引擎裡，取名與鑑定書共用同一套。
  var ELEMENTS = ['木', '火', '土', '金', '水'];
  var GEN = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };       // 生
  var CTRL = { '木': '土', '火': '金', '土': '水', '金': '木', '水': '火' };      // 剋
  function genBy(e) { for (var k in GEN) if (GEN[k] === e) return k; }          // 生我者
  function ctrlBy(e) { for (var k in CTRL) if (CTRL[k] === e) return k; }       // 剋我者
  var HIDDEN = {
    '子': '癸', '丑': '己癸辛', '寅': '甲丙戊', '卯': '乙', '辰': '戊乙癸', '巳': '丙庚戊',
    '午': '丁己', '未': '己丁乙', '申': '庚壬戊', '酉': '辛', '戌': '戊辛丁', '亥': '壬甲'
  };
  var HIDDEN_W = [[1], [0.7, 0.3], [0.6, 0.3, 0.1]];
  var STEM_ELE = { '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土', '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水' };
  // 各位置權重：月支（月令）最重，日支次之
  var BW = { stem: 1, yearBranch: 1, monthBranch: 2.5, dayBranch: 1.5, hourBranch: 1 };

  /**
   * 由八字判斷日主強弱與喜用神（扶抑法）
   * @param bazi fullBazi 的結果
   * @return { dayMaster, dayMasterTG, monthBranch, score, ratio, strength, deLing, hasHour,
   *           yong（用神）, xi（喜神）, favorable, unfavorable, missing, text }
   */
  function xiYongShen(bazi) {
    if (!bazi || !bazi.pillars) return null;
    var dm = bazi.dayMaster;
    var score = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };
    bazi.pillars.forEach(function(p, i) {
      if (p.tg === '?' || !p.tg) return; // 沒有時辰
      if (i !== 2) score[STEM_ELE[p.tg]] += BW.stem;
      var hs = HIDDEN[p.dz] || '';
      var bw = [BW.yearBranch, BW.monthBranch, BW.dayBranch, BW.hourBranch][i];
      hs.split('').forEach(function(s, k) { score[STEM_ELE[s]] += bw * HIDDEN_W[hs.length - 1][k]; });
    });
    var yin = genBy(dm), bi = dm, shi = GEN[dm], cai = CTRL[dm], guan = ctrlBy(dm);
    var self = score[bi] + score[yin];
    var sum = ELEMENTS.reduce(function(a, e) { return a + score[e]; }, 0);
    var ratio = sum ? self / sum : 0.5;
    var strong = ratio >= 0.5;
    var strength = ratio > 0.6 ? '身強' : ratio >= 0.5 ? '中和偏強' : ratio >= 0.4 ? '中和偏弱' : '身弱';
    var yong, xi, ji, reason;
    var monthDz = bazi.pillars[1].dz;
    var monthEle = STEM_ELE[(HIDDEN[monthDz] || ' ').charAt(0)];
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
      dayMaster: dm, dayMasterTG: bazi.dayMasterTG, monthBranch: monthDz,
      score: score, ratio: ratio, strength: strength, deLing: deLing,
      yong: yong, xi: xi, favorable: [yong, xi], unfavorable: ji, missing: missing, hasHour: bazi.hasHour,
      text: '日主' + bazi.dayMasterTG + dm + (deLing ? '，生於' + monthDz + '月得令' : '，生於' + monthDz + '月失令') +
        '；同黨（' + bi + '、' + yin + '）佔 ' + pct + '%，屬' + strength + '。' + reason + '。'
    };
  }

  return {
    yearPillar:yearPillar, monthPillar:monthPillar, dayPillar:dayPillar, hourPillar:hourPillar,
    fullBazi:fullBazi, fullAnalysis:fullAnalysis,
    xiYongShen:xiYongShen,
    jieMoment:jieMoment, solarYearMonth:solarYearMonth,
    getZodiac:getZodiac, getYearPillar:getYearPillar, getDayMaster:getDayMaster,
    getStarSign:getStarSign, getShiChen:getShiChen,
    zodiacCompatibility:zodiacCompatibility, zodiacElement:zodiacElement,
    baziNameCompare:baziNameCompare, ZODIAC_NATURE:ZODIAC_NATURE,
    getDaYun:getDaYun, getLiuNian:getLiuNian
  };
})();
