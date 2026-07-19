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
  function analyzeXiYongShen(yearPillar, dayMaster, nameElements) {
    if (!yearPillar || !dayMaster) return null;

    // 日主五行
    var dm = dayMaster;
    // 統計名字五格中的五行分佈
    var elementCount = { '木':0,'火':0,'土':0,'金':0,'水':0 };
    nameElements.forEach(function(el) { if (elementCount[el] !== undefined) elementCount[el]++; });

    // 判斷日主強弱（簡化：以名字同五行數量判斷）
    var sameCount = elementCount[dm] || 0;
    var totalCount = nameElements.length || 5;

    // 喜用神判斷
    var xiShen, jiShen, analysis;

    if (sameCount >= 3) {
      // 日主過強，喜剋洩
      var overcomeBy = { '木':'金','火':'水','土':'木','金':'火','水':'土' };
      var generatedBy = { '木':'水','火':'木','土':'火','金':'土','水':'金' };
      xiShen = overcomeBy[dm];
      jiShen = dm;
      analysis = '日主' + dm + '過強（五格中佔' + sameCount + '/' + totalCount + '），宜用' + xiShen + '來剋制平衡，或用洩氣之五行來疏導過旺的能量。若名字中缺' + xiShen + '，建議補充。';
    } else if (sameCount <= 1) {
      // 日主偏弱，喜生扶
      var generatedBy = { '木':'水','火':'木','土':'火','金':'土','水':'金' };
      xiShen = generatedBy[dm];
      jiShen = { '木':'金','火':'水','土':'木','金':'火','水':'土' }[dm];
      analysis = '日主' + dm + '偏弱（五格中僅佔' + sameCount + '/' + totalCount + '），宜用' + xiShen + '來生扶。建議名字中增加' + xiShen + '屬性的字，以增強日主能量。';
    } else {
      xiShen = dm;
      jiShen = null;
      analysis = '日主' + dm + '五行適中（佔' + sameCount + '/' + totalCount + '），保持平衡即可。名字與命格五行配合良好。';
    }

    return {
      dayMaster: dm,
      xiShen: xiShen,
      jiShen: jiShen,
      elementCount: elementCount,
      analysis: analysis,
      quote: getClassicalQuote('五行', sameCount >= 1 && sameCount <= 3)
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
    ['tian','ren','di','wai','zong'].forEach(function(k) {
      var g = grids[k];
      var fortune = g.fortune;
      var q = getClassicalQuote(k === 'tian' ? '天格' : k === 'ren' ? '人格' : k === 'di' ? '地格' : k === 'wai' ? '天格' : '天格',
        fortune && (fortune.glory === '大吉' || fortune.glory === '吉' || fortune.glory === '中吉'));
      gridDetails.push({
        name: g.name, number: g.number, element: g.element,
        fortune: fortune ? fortune.glory : '?',
        description: fortune ? fortune.description : '',
        implication: fortune ? fortune.implication : '',
        quote: q
      });
    });

    // 五行診斷
    var elementDiag = diagnoseElements(grids);

    // 喜用神
    var xiYong = null;
    if (zodiacData && zodiacData.yearPillar && zodiacData.dayMaster) {
      var els = gridDetails.map(function(g) { return g.element; });
      xiYong = analyzeXiYongShen(zodiacData.yearPillar, zodiacData.dayMaster, els);
    }

    // 八字
    var baziInfo = null;
    if (zodiacData && zodiacData.yearPillar) {
      baziInfo = {
        year: zodiacData.yearPillar.tianGan + zodiacData.yearPillar.diZhi,
        zodiac: zodiacData.zodiac,
        dayMaster: zodiacData.dayMaster
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
      lines.push('【喜用神】');
      lines.push('  日主：' + report.xiYong.dayMaster);
      lines.push('  喜神：' + report.xiYong.xiShen);
      if (report.xiYong.jiShen) lines.push('  忌神：' + report.xiYong.jiShen);
      lines.push('  分析：' + report.xiYong.analysis);
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

  return {
    analyzeXiYongShen: analyzeXiYongShen,
    diagnoseElements: diagnoseElements,
    generateReport: generateReport,
    reportToText: reportToText,
    getClassicalQuote: getClassicalQuote
  };
})();
