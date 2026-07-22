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

  /** 年柱 */
  function yearPillar(year) {
    var idx = (year - 4) % 60;
    return { tg: TIAN_GAN[idx % 10], dz: DI_ZHI[idx % 12], tgEle: TIAN_GAN_ELE[idx % 10], dzEle: DI_ZHI_ELE[idx % 12], zodiac: ZODIAC[idx % 12] };
  }

  /** 月柱：依年干+月份查表 */
  function monthPillar(year, month) {
    var yTG = yearPillar(year).tg;
    var yIdx = TIAN_GAN.indexOf(yTG);
    // 甲己年起丙寅, 乙庚年起戊寅, 丙辛年起庚寅, 丁壬年起壬寅, 戊癸年起甲寅
    var startTG = [2,4,6,8,0][Math.floor(yIdx / 2)]; // index into TIAN_GAN for 寅月
    var mIdx = (month < 2 ? month + 10 : month - 2); // 寅月=0
    var tg = TIAN_GAN[(startTG + mIdx) % 10];
    var dz = DI_ZHI[mIdx % 12];
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
    var idx = Math.floor((hour + 2) % 24 / 2);
    return { name: DI_ZHI[idx] + '時', dz: DI_ZHI[idx], range: (idx*2+23)%24 + ':00-' + ((idx*2+1)%24) + ':59' };
  }

  /** 時柱：日干+時辰 */
  function hourPillar(dayTG, hour) {
    if (hour == null || hour < 0 || hour > 23) return null;
    var sc = getShiChen(hour);
    var dIdx = TIAN_GAN.indexOf(dayTG);
    // 甲己日起甲子, 乙庚日起丙子...
    var startTG = [0,2,4,6,8][Math.floor(dIdx / 2)];
    var hIdx = Math.floor((hour + 2) % 24 / 2);
    var tg = TIAN_GAN[(startTG + hIdx) % 10];
    return { tg: tg, dz: sc.dz, tgEle: TIAN_GAN_ELE[TIAN_GAN.indexOf(tg)], dzEle: DI_ZHI_ELE[DI_ZHI.indexOf(sc.dz)], shiChen: sc };
  }

  /** 完整四柱 */
  function fullBazi(year, month, day, hour) {
    if (!year || !month || !day) return null;
    var yp = yearPillar(year);
    var mp = monthPillar(year, month);
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
      hasHour: !!hp
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
  function fullAnalysis(year,month,day,hour){
    var bazi=fullBazi(year,month,day,hour);
    var ss=getStarSign(month,day);
    return {
      zodiac:bazi?bazi.zodiac:null,
      zodiacNature:bazi?bazi.zodiacNature:null,
      yearPillar:bazi?{tianGan:bazi.pillars[0].tg,dizhi:bazi.pillars[0].dz,element:bazi.pillars[0].tgEle,zodiac:bazi.zodiac}:null,
      dayMaster:bazi?bazi.dayMaster:null,
      starSign:ss,
      hasData:!!(bazi||ss),
      bazi:bazi,
      pillars:bazi?bazi.pillars:null
    };
  }

  // ========== 大運/流年 ==========
  function getDaYun(bazi, gender) {
    if (!bazi) return null;
    var yearTG = bazi.pillars[0].tg;
    var yearTgIdx = TIAN_GAN.indexOf(yearTG);
    var isYang = yearTgIdx % 2 === 0;
    var monthDZ = bazi.pillars[1].dz;
    var monthIdx = DI_ZHI.indexOf(monthDZ);
    var forward = (gender==='male'&&isYang) || (gender==='female'&&!isYang);
    var daYuns = [];
    for (var i = 0; i < 8; i++) {
      var offset = forward ? (i + 1) : -(i + 1);
      var dzIdx = ((monthIdx + offset) % 12 + 12) % 12;
      var tgIdx = ((yearTgIdx + offset) % 10 + 10) % 10;
      daYuns.push({
        name: TIAN_GAN[tgIdx] + DI_ZHI[dzIdx],
        tg: TIAN_GAN[tgIdx], dz: DI_ZHI[dzIdx],
        tgEle: TIAN_GAN_ELE[tgIdx], dzEle: DI_ZHI_ELE[dzIdx],
        ages: (6+i*10) + '-' + (15+i*10) + '歲',
        shiShen: calcShiShen(bazi.dayMaster, TIAN_GAN_ELE[tgIdx])
      });
    }
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

  return {
    yearPillar:yearPillar, monthPillar:monthPillar, dayPillar:dayPillar, hourPillar:hourPillar,
    fullBazi:fullBazi, fullAnalysis:fullAnalysis,
    getZodiac:getZodiac, getYearPillar:getYearPillar, getDayMaster:getDayMaster,
    getStarSign:getStarSign, getShiChen:getShiChen,
    zodiacCompatibility:zodiacCompatibility, zodiacElement:zodiacElement,
    baziNameCompare:baziNameCompare, ZODIAC_NATURE:ZODIAC_NATURE,
    getDaYun:getDaYun, getLiuNian:getLiuNian
  };
})();
