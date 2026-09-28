/**
 * 專業命理分析引擎
 * 喜用神 + 五行強弱診斷 + 古籍斷語庫 + 專業鑑定報告
 */
window.Professional = (function() {

  // ============ 古籍斷語庫 ============
  var CLASSICAL_QUOTES = {
    天格: {
      吉: ['《姓名學》云：「天格為祖蔭，吉數者祖先福德深厚，家運昌隆。」',
           '《三命通會》曰：「天格主先天之運，得吉數則根基穩固。」'],
      凶: ['《姓名學》云：「天格凶數，祖業凋零，須自力更生。」',
           '古諺云：「天格不吉，如樹無根，雖榮易折。」']
    },
    人格: {
      吉: ['《姓名學》云：「人格為一身之主，得吉數則智慧超群，事業有成。」',
           '《命理正宗》曰：「人格佳者，天賦異稟，可成大器。」',
           '古云：「人格者，人之本也，吉則萬事可期。」'],
      凶: ['《姓名學》云：「人格凶數，一生勞碌，有志難伸。」',
           '《滴天髓》曰：「人格不吉，猶舟無舵，隨波逐流。」']
    },
    地格: {
      吉: ['《姓名學》云：「地格吉數，家庭和睦，早年順遂。」',
           '古云：「地格佳者，幼年得蔭，基礎穩固。」'],
      凶: ['《姓名學》云：「地格凶數，少年坎坷，家運不濟。」']
    },
    外格: {
      吉: ['《姓名學》云：「外格吉數，人緣廣闊，得貴人相助，出外順遂。」',
           '古云：「外格佳者，善與人交，處世圓融。」'],
      凶: ['《姓名學》云：「外格凶數，人際多阻，易招是非。」',
           '古云：「外格不吉，孤立無援，宜廣結善緣。」']
    },
    總格: {
      吉: ['《姓名學》云：「總格吉數，晚運昌隆，一生努力終得善果。」',
           '古云：「總格佳者，福澤綿長，老而彌堅。」'],
      凶: ['《姓名學》云：「總格凶數，晚景多磨，宜及早積福養德。」',
           '古云：「總格不吉，如舟行遇風，持之以恆方能靠岸。」']
    },
    三才: {
      吉: ['《姓名學》云：「三才配置得宜，天人地相生，運勢亨通。」',
           '《五行精紀》曰：「三才和合者，天地人三才貫通，福澤綿長。」'],
      凶: ['《姓名學》云：「三才相剋，五行失調，宜改名調和。」']
    },
    五行: {
      平衡: ['《黃帝內經》云：「五行和合，陰陽平衡，身心健康。」',
             '古云：「五行俱全者，得天獨厚，運勢非凡。」'],
      失衡: ['《五行大義》曰：「五行偏枯，如車輪失圓，行之不遠。」',
             '《命理探源》云：「五行有所偏者，當補其不足，洩其有餘。」']
    }
  };

  function getClassicalQuote(category, isGood) {
    var quotes = CLASSICAL_QUOTES[category];
    if (!quotes) return '';
    var pool = isGood ? (quotes['吉'] || quotes['平衡'] || []) : (quotes['凶'] || quotes['失衡'] || []);
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : '';
  }

  // ============ 喜用神分析 ============
  /**
   * 日主強弱一律由八字（扶抑法）判定，名字只負責「補」。
   * 舊版拿名字五格的五行數量去推日主強弱，那等於讓名字決定命格——同一個時辰出生的人
   * 會因為名字不同而得到不同的喜用神，吉日、幸運色也跟著跑掉。現改為呼叫 ZodiacBazi.xiYongShen。
   * @param bazi ZodiacBazi.fullBazi 的結果
   * @param nameElements 五格五行，用來檢查名字有沒有補到喜用神
   */
  function analyzeXiYongShen(bazi, nameElements) {
    if (!bazi || !bazi.pillars || !window.ZodiacBazi || !window.ZodiacBazi.xiYongShen) return null;
    var base = window.ZodiacBazi.xiYongShen(bazi);
    if (!base) return null;

    // 命格決定「該補什麼」，名字決定「補到了沒」
    var elementCount = { '木':0,'火':0,'土':0,'金':0,'水':0 };
    (nameElements || []).forEach(function(el) { if (elementCount[el] !== undefined) elementCount[el]++; });
    var nameHits = base.favorable.filter(function(e) { return elementCount[e] > 0; });
    var nameMissing = base.favorable.filter(function(e) { return !elementCount[e]; });

    var pct = Math.round(base.ratio * 100);
    var analysis = '日主' + base.dayMaster + '（' + base.dayMasterTG + '）生於' + base.monthBranch + '月，' +
      (base.deLing ? '得令' : '失令') + '；同黨（比劫、印）佔 ' + pct + '%，屬' + base.strength + '。' +
      (base.hasHour ? '' : '未填出生時辰，時柱未納入，強弱為概估。') +
      '用神取' + base.yong + '、喜神取' + base.xi + '。' +
      (nameMissing.length
        ? '名字五格' + (nameHits.length ? '已補' + nameHits.join('、') + '，但未見' + nameMissing.join('、') : '未見' + nameMissing.join('、')) + '，建議以該五行的字補強。'
        : '名字五格已見' + nameHits.join('、') + '，與命格相輔。');

    return {
      // 主要欄位（沿用既有欄位名，吉日／幸運色依 xiShen 計算）
      dayMaster: base.dayMaster,
      dayMasterTG: base.dayMasterTG,
      xiShen: base.yong,
      jiShen: base.unfavorable[0] || null,
      analysis: analysis,
      quote: getClassicalQuote('五行', nameMissing.length === 0),
      // 完整資訊
      yong: base.yong, xi: base.xi,
      favorable: base.favorable, unfavorable: base.unfavorable,
      strength: base.strength, ratio: base.ratio, score: base.score,
      deLing: base.deLing, hasHour: base.hasHour, missing: base.missing,
      elementCount: elementCount, nameHits: nameHits, nameMissing: nameMissing
    };
  }

  // ============ 五行強弱診斷 ============
  function diagnoseElements(grids) {
    var count = { '木':0,'火':0,'土':0,'金':0,'水':0 };
    var total = 0;
    ['tian','ren','di','wai','zong'].forEach(function(k) {
      var el = grids[k].element;
      if (count[el] !== undefined) { count[el]++; total++; }
    });

    var diagnosis = {};
    var maxVal = 0, minVal = total;
    Object.keys(count).forEach(function(el) {
      maxVal = Math.max(maxVal, count[el]);
      minVal = Math.min(minVal, count[el]);
    });

    var issues = [];
    var strengths = [];

    Object.keys(count).forEach(function(el) {
      var cnt = count[el];
      var pct = Math.round(cnt / total * 100);
      var level, advice;

      if (cnt >= total * 0.5) {
        level = '過強';
        advice = el + '氣過盛（佔' + pct + '%），宜用' + ({'木':'金','火':'水','土':'木','金':'火','水':'土'})[el] + '來剋制平衡。';
        issues.push(advice);
      } else if (cnt === 0) {
        level = '缺失';
        advice = el + '完全缺失，建議補充' + el + '屬性的字來平衡五行。';
        issues.push(advice);
      } else if (cnt <= 1 && total >= 4) {
        level = '偏弱';
        advice = el + '氣偏弱，可適度補充。';
        issues.push(advice);
      } else {
        level = '適中';
        strengths.push(el + '氣均衡，為命格加分。');
      }

      diagnosis[el] = { count: cnt, pct: pct, level: level, advice: advice };
    });

    var balanceScore = Math.round((1 - (maxVal - minVal) / total) * 100);

    return {
      diagnosis: diagnosis,
      balanceScore: balanceScore,
      balanceLevel: balanceScore >= 85 ? '優秀' : balanceScore >= 65 ? '良好' : balanceScore >= 45 ? '尚可' : '失衡',
      issues: issues,
      strengths: strengths,
      quote: getClassicalQuote('五行', balanceScore >= 65)
    };
  }

  // ============ 專業鑑定報告 ============
  function generateReport(personData, cnResult, enResult, zodiacData) {
    if (!cnResult) return null;

    var grids = cnResult.grids;
    var sancai = cnResult.sancai;

    // 取得各格吉凶統計
    var gridDetails = [];
    var QUOTE_KEY = { tian: '天格', ren: '人格', di: '地格', wai: '外格', zong: '總格' };
    ['tian','ren','di','wai','zong'].forEach(function(k) {
      var g = grids[k];
      var fortune = g.fortune;
      var q = getClassicalQuote(QUOTE_KEY[k],
        fortune && (fortune.glory === '大吉' || fortune.glory === '吉' || fortune.glory === '中吉'));
      gridDetails.push({
        name: g.name, number: g.number, element: g.element,
        fortune: fortune ? fortune.glory : '?',
        description: fortune ? fortune.description : '',
        implication: fortune ? fortune.implication : '',
        reducedFrom: fortune && fortune.reducedFrom ? fortune.reducedFrom : null,
        quote: q
      });
    });

    // 五行診斷
    var elementDiag = diagnoseElements(grids);

    // 喜用神（需要完整八字，不是只有年柱）
    var xiYong = null;
    if (zodiacData && zodiacData.bazi) {
      var els = gridDetails.map(function(g) { return g.element; });
      xiYong = analyzeXiYongShen(zodiacData.bazi, els);
    }

    // 八字
    var baziInfo = null;
    if (zodiacData && zodiacData.yearPillar) {
      baziInfo = {
        year: zodiacData.yearPillar.tianGan + zodiacData.yearPillar.diZhi,
        zodiac: zodiacData.zodiac,
        dayMaster: zodiacData.dayMaster,
        monthBranch: zodiacData.bazi ? zodiacData.bazi.pillars[1].dz : null
      };
    }

    // 總評
    var goodCount = (cnResult.fortuneCounts['大吉']||0)+(cnResult.fortuneCounts['吉']||0)+(cnResult.fortuneCounts['中吉']||0);
    var badCount = (cnResult.fortuneCounts['凶']||0)+(cnResult.fortuneCounts['大凶']||0);
    var overallLevel;
    if (goodCount >= 4) overallLevel = '上等';
    else if (goodCount >= 3) overallLevel = '中上';
    else if (goodCount >= 2 && badCount <= 1) overallLevel = '中等';
    else if (badCount >= 3) overallLevel = '下等';
    else overallLevel = '中下';

    var overallSummary = '';
    if (overallLevel === '上等') overallSummary = '此姓名五格配置優秀，多為吉數，三才和諧，五行均衡。為上等之名，建議終身使用。';
    else if (overallLevel === '中上') overallSummary = '此姓名整體配置良好，雖有小瑕但不掩大瑜。部分格局稍弱但可透過後天努力補足。';
    else if (overallLevel === '中等') overallSummary = '此姓名配置中庸，吉凶參半。建議在使用上多加注意弱項，並透過個人修養補強。';
    else overallSummary = '此姓名存在較多凶數或五行失衡，建議諮詢專業命理師，考慮改名或取字號補足。';

    // 靈數
    var numerInfo = null;
    if (enResult) {
      numerInfo = {
        destiny: enResult.destiny,
        soulUrge: enResult.soulUrge,
        personality: enResult.personality
      };
    }

    return {
      name: cnResult.parsed.surname + cnResult.parsed.givenName,
      overallLevel: overallLevel,
      overallSummary: overallSummary,
      gridDetails: gridDetails,
      sancai: { level: sancai.level, description: sancai.description, quote: getClassicalQuote('三才', sancai.level.indexOf('吉')>=0) },
      elementDiagnosis: elementDiag,
      xiYong: xiYong,
      bazi: baziInfo,
      numerology: numerInfo,
      generatedAt: new Date().toLocaleString('zh-TW')
    };
  }

  // ============ 報告轉文字 ============
  function reportToText(report) {
    if (!report) return '';
    var lines = [];
    lines.push('╔══════════════════════════════╗');
    lines.push('║    姓 名 鑑 定 報 告 書     ║');
    lines.push('╚══════════════════════════════╝');
    lines.push('');
    lines.push('【基本資料】');
    lines.push('  鑑定姓名：' + report.name);
    lines.push('  鑑定日期：' + report.generatedAt);
    lines.push('  綜合評級：' + report.overallLevel);
    if (report.bazi) {
      lines.push('  八字年柱：' + report.bazi.year + '（生肖' + report.bazi.zodiac + '）');
      lines.push('  日主五行：' + report.bazi.dayMaster);
    }
    lines.push('');
    lines.push('【五格剖象】');
    report.gridDetails.forEach(function(g) {
      lines.push('  ' + g.name + '：' + g.number + '劃（屬' + g.element + '）— ' + g.fortune);
      lines.push('    ' + g.implication);
      if (g.quote) lines.push('    📜 ' + g.quote);
    });
    lines.push('');
    lines.push('【三才配置】');
    lines.push('  評級：' + report.sancai.level);
    lines.push('  說明：' + report.sancai.description);
    if (report.sancai.quote) lines.push('  📜 ' + report.sancai.quote);
    lines.push('');
    lines.push('【五行診斷】');
    var diag = report.elementDiagnosis;
    lines.push('  平衡度：' + diag.balanceScore + '%（' + diag.balanceLevel + '）');
    Object.keys(diag.diagnosis).forEach(function(el) {
      var d = diag.diagnosis[el];
      lines.push('  ' + el + '：' + d.count + '次（' + d.pct + '%）— ' + d.level);
    });
    if (diag.issues.length) {
      lines.push('  ⚠️ 待改善：');
      diag.issues.forEach(function(i) { lines.push('    - ' + i); });
    }
    if (diag.strengths.length) {
      lines.push('  ✅ 優勢：');
      diag.strengths.forEach(function(s) { lines.push('    - ' + s); });
    }
    lines.push('');
    if (report.xiYong) {
      var xy = report.xiYong;
      lines.push('【喜用神】');
      lines.push('  日主：' + xy.dayMaster + (xy.dayMasterTG ? '（' + xy.dayMasterTG + '）' : '') + '　' + (xy.strength || ''));
      lines.push('  用神：' + xy.yong + '　喜神：' + xy.xi);
      if (xy.unfavorable && xy.unfavorable.length) lines.push('  忌神：' + xy.unfavorable.join('、'));
      if (xy.missing && xy.missing.length) lines.push('  八字缺：' + xy.missing.join('、'));
      lines.push('  分析：' + xy.analysis);
      lines.push('');
    }
    lines.push('【綜合評語】');
    lines.push('  ' + report.overallSummary);
    lines.push('');
    lines.push('═══════════════════════════════');
    lines.push('  以上分析僅供參考，請勿過度迷信');
    lines.push('  姓名和盤 · 專業命理分析');

    return lines.join('\n');
  }

  // ========== 改名對比 + 行業建議 ==========
  var GRID_KEYS = ['tian','ren','di','wai','zong'];

  /**
   * @param oldName 原名（字串）或已分析好的結果（沿用手動筆劃）
   * @param newName 新名字
   * @param favorable 命格喜用五行（可省略）；有值時一併比較新舊名字補到了沒
   * @param manualStrokes 手動筆劃
   */
  function compareNames(oldName, newName, favorable, manualStrokes) {
    if (!oldName || !newName || !window.ChineseNumerology) return null;
    var CN = window.ChineseNumerology;
    var oR = typeof oldName === 'string' ? CN.analyze(oldName, manualStrokes) : oldName;
    var nR = CN.analyze(newName, manualStrokes);
    if (!oR || oR.error) return { error: (oR && oR.error) || '原名無法分析' };
    if (!nR || nR.error) return { error: (nR && nR.error) || '新名字無法分析' };
    // 筆劃庫沒有的字會以 0 劃計算，五格全錯，不能拿來比
    if (nR.hasUnknown) return { error: '「' + nR.unknownChars.join('、') + '」不在筆劃庫，無法比較', unknownChars: nR.unknownChars };
    oldName = typeof oldName === 'string' ? oldName : oR.parsed.surname + oR.parsed.givenName;
    var oG = (oR.fortuneCounts['大吉']||0)+(oR.fortuneCounts['吉']||0)+(oR.fortuneCounts['中吉']||0);
    var oB = (oR.fortuneCounts['凶']||0)+(oR.fortuneCounts['大凶']||0);
    var nG = (nR.fortuneCounts['大吉']||0)+(nR.fortuneCounts['吉']||0)+(nR.fortuneCounts['中吉']||0);
    var nB = (nR.fortuneCounts['凶']||0)+(nR.fortuneCounts['大凶']||0);
    var imp = nG - oG + (oB - nB);
    var changes = [];
    GRID_KEYS.forEach(function(k) {
      var og=oR.grids[k], ng=nR.grids[k];
      changes.push({
        name:og.name, changed:og.number!==ng.number||og.element!==ng.element,
        old:{num:og.number,ele:og.element,glory:og.fortune?og.fortune.glory:'?'},
        new:{num:ng.number,ele:ng.element,glory:ng.fortune?ng.fortune.glory:'?'}
      });
    });
    var hits = function(R) {
      var els = GRID_KEYS.map(function(k) { return R.grids[k].element; });
      return (favorable || []).filter(function(e) { return els.indexOf(e) >= 0; });
    };
    return {
      oldName:oldName, newName:newName, oldGood:oG, oldBad:oB, newGood:nG, newBad:nB,
      improvement:imp, verdict:imp>=3?'大幅改善':imp>=1?'明顯改善':imp>0?'略有改善':imp===0?'吉凶數相同':'效果不佳',
      gridChanges:changes,
      favorable: favorable || null,
      oldHits: favorable ? hits(oR) : null,
      newHits: favorable ? hits(nR) : null
    };
  }

  /** @param element 有八字時傳用神（與風水一致），沒有時傳人格五行 */
  function careerSuggestions(element) {
    var el=element||'木';
    var c={
      '木':'教育、出版、園藝、設計、醫療、環保',
      '火':'餐飲、娛樂、媒體、科技、業務、公關',
      '土':'房地產、建築、金融、管理、顧問、農業',
      '金':'法律、軍警、機械、工程、會計、銀行',
      '水':'貿易、物流、寫作、藝術、心理諮商、旅遊'
    };
    return {element:el, suggestion:c[el]||c['木']};
  }

  // ========== 風水方位 ==========
  /**
   * @param nameElement 人格五行（沒有八字時的退路）
   * @param preferElement 喜用神的用神；有八字時以它為準，風水才不會和喜用神打架
   */
  function fengshuiAdvice(nameElement, preferElement) {
    var el = preferElement || nameElement || '木';
    var advice = {
      '木':{door:'東或東南',bed:'頭朝東',desk:'面東而坐',decor:'綠色植物、木質家具',avoid:'過多金屬裝飾'},
      '火':{door:'南',bed:'頭朝南',desk:'面南而坐',decor:'紅色系、三角形擺設',avoid:'過多黑色/藍色'},
      '土':{door:'中央或西南',bed:'頭朝西南',desk:'面西南而坐',decor:'大地色系、方形家具',avoid:'過多綠色植物'},
      '金':{door:'西或西北',bed:'頭朝西',desk:'面西而坐',decor:'白色系、金屬圓形飾品',avoid:'過多紅色裝飾'},
      '水':{door:'北',bed:'頭朝北',desk:'面北而坐',decor:'黑色藍色、波浪型擺設',avoid:'過多黃棕色家具'}
    };
    return advice[el] || advice['木'];
  }

  // ========== 面相特質 ==========
  function faceReading(element) {
    var el = element || '木';
    var readings = {
      '木':{forehead:'高寬飽滿，有思考力',eyes:'清澈有神，目光遠大',nose:'挺拔修長',mouth:'嘴角上揚',best:'額頭飽滿、身形修長，給人朝氣蓬勃的印象。',style:'適合俐落短髮或自然長直髮。'},
      '火':{forehead:'寬闊明亮，熱情外顯',eyes:'炯炯有神，充滿熱情',nose:'尖挺有勢',mouth:'唇色紅潤',best:'眼神明亮、笑容燦爛，舉手投足充滿活力。',style:'適合俐落短髮或亮色系穿搭。'},
      '土':{forehead:'圓潤飽滿，給人安全感',eyes:'溫和敦厚，可信賴',nose:'鼻頭有肉',mouth:'唇厚有福',best:'臉型圓潤、氣色紅潤，讓人感到穩重可靠。',style:'適合中規中矩的經典造型。'},
      '金':{forehead:'方正飽滿，正義感強',eyes:'銳利有神，判斷力佳',nose:'鼻樑高挺',mouth:'唇形分明',best:'五官立體、輪廓分明，自帶威嚴氣場。',style:'適合俐落短髮、線條分明的穿搭。'},
      '水':{forehead:'圓潤柔和，智慧內斂',eyes:'深邃有靈氣',nose:'鼻型秀氣',mouth:'唇薄靈巧',best:'眼神靈動、氣質柔和，給人聰明細膩的印象。',style:'適合柔順中長髮或波浪捲髮。'}
    };
    return readings[el] || readings['木'];
  }

  return {
    analyzeXiYongShen:analyzeXiYongShen, diagnoseElements:diagnoseElements,
    generateReport:generateReport, reportToText:reportToText,
    getClassicalQuote:getClassicalQuote, compareNames:compareNames,
    careerSuggestions:careerSuggestions,
    fengshuiAdvice:fengshuiAdvice, faceReading:faceReading
  };
})();
