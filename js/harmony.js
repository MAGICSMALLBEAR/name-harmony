/**
 * 和盤綜合分析引擎
 * 中英文姓名綜合配對：五行互補 + 數字共振 + 陰陽平衡 + 綜合評分
 */

window.Harmony = (function() {

  // ============ 五行互補分析 ============

  function elementComplementScore(chineseResult, englishResult) {
    if (!chineseResult || !englishResult) return { score: 0, detail: '' };

    // 取人格的五行作為中文代表
    var cnElement = chineseResult.grids.ren.element;
    // 取英文命運數字的五行
    var enMeaning = window.EnglishNumerology.getMeaning(englishResult.destiny);
    var enElement = enMeaning ? enMeaning.element : null;

    if (!cnElement || !enElement) {
      return { score: 12, detail: '因缺少五行資訊，給予基本分。' };
    }

    // 五行對應表（中西轉換）
    var elementMatch = {
      '木': ['火', '風'],
      '火': ['火', '風'],
      '土': ['土'],
      '金': ['水', '風'],
      '水': ['水']
    };

    var compatible = elementMatch[cnElement] || [];
    var score;
    var detail;

    if (cnElement === '木' && enElement === '風') {
      score = 22;
      detail = '東方木與西方風屬性相合，木得風助，生機蓬勃，五行互補極佳。';
    } else if (cnElement === '火' && enElement === '風') {
      score = 20;
      detail = '火得風助更加旺盛，五行配置良好，動力十足。';
    } else if (cnElement === '火' && enElement === '火') {
      score = 18;
      detail = '雙火相映，熱情奔放。五行相同，能量強大但需注意過猶不及。';
    } else if (cnElement === '水' && enElement === '水') {
      score = 20;
      detail = '雙水匯流，智慧交融。五行相合，思維敏捷，直覺力強。';
    } else if (cnElement === '土' && enElement === '土') {
      score = 20;
      detail = '雙土厚實，穩固踏實。五行相同，基礎穩健，適合長期發展。';
    } else if (cnElement === '金' && enElement === '水') {
      score = 22;
      detail = '金生水，五行相生。中文名的金被英文名的水所生，運勢流暢。';
    } else if (cnElement === '水' && enElement === '風') {
      score = 15;
      detail = '水與風屬性中和，尚可互補，但非最佳配置。';
    } else if (compatible.indexOf(enElement) >= 0) {
      score = 18;
      detail = '五行配置和諧，中英文名命理元素相容，相互助益。';
    } else {
      score = 8;
      detail = '五行元素不完全匹配，可透過其他層面互補調和。';
    }

    return { score: score, detail: detail, cnElement: cnElement, enElement: enElement };
  }

  // ============ 數字共振分析 ============

  function numberResonanceScore(chineseResult, englishResult) {
    if (!chineseResult || !englishResult) return { score: 0, detail: '' };

    var zong = chineseResult.wuge.zong;
    var destiny = englishResult.destiny;

    var score, detail;

    // 人格與命運數字比較
    var ren = chineseResult.wuge.ren;

    if (ren === destiny) {
      score = 22;
      detail = '人格數字與命運數字相同（' + ren + '）！中英文名核心數字完美共振，命理高度一致。';
    } else if (ren % 10 === destiny % 10 || zong % 10 === destiny % 10) {
      score = 18;
      detail = '中英文名數字尾數相同，五行屬性一致，具有隱性的數字共振。';
    } else if (Math.abs(ren - destiny) <= 3) {
      score = 16;
      detail = '中文人格' + ren + '與英文命運數字' + destiny + '差距微小，頻率接近，和諧度佳。';
    } else if (ren === reduceSum(destiny) || destiny === reduceSum(ren)) {
      score = 15;
      detail = '數字間存在隱性連動關係，有一定的共鳴效果。';
    } else {
      score = 8;
      detail = '中英文名數字頻率差異較大，各自獨立運作，無明顯共振。';
    }

    return { score: score, detail: detail };
  }

  function reduceSum(num) {
    var s = 0;
    while (num > 0) { s += num % 10; num = Math.floor(num / 10); }
    return s;
  }

  // ============ 陰陽平衡分析 ============

  function yinYangScore(chineseResult, englishResult) {
    if (!chineseResult || !englishResult) return { score: 0, detail: '' };

    // 以總筆劃的奇偶代表陰陽
    var cnParity = chineseResult.wuge.zong % 2; // 0=偶(陰), 1=奇(陽)
    var enParity = englishResult.letterCount % 2;

    var score, detail;
    if (cnParity !== enParity) {
      score = 18;
      detail = '中文總筆劃' + (cnParity ? '奇數（陽）' : '偶數（陰）') +
              '，英文字母數' + (enParity ? '奇數（陽）' : '偶數（陰）') +
              '，陰陽調和，剛柔並濟，配置極佳。';
    } else {
      score = 10;
      detail = '中英文陰陽屬性相同，雖同質但缺乏互補。建議在性格上多元發展，達到內外平衡。';
    }

    return { score: score, detail: detail };
  }

  // ============ 姓名完整度分析 ============

  function completenessScore(chineseResult, englishResult) {
    if (!chineseResult || !englishResult) return { score: 0, detail: '' };

    var cnGood = (chineseResult.fortuneCounts['大吉'] || 0) + (chineseResult.fortuneCounts['吉'] || 0) + (chineseResult.fortuneCounts['中吉'] || 0);
    var cnBad = (chineseResult.fortuneCounts['凶'] || 0) + (chineseResult.fortuneCounts['大凶'] || 0);

    var enMaster = englishResult.destiny;
    var enIsSpecial = (enMaster === 11 || enMaster === 22 || enMaster === 33);

    var score = 15;
    var detail = '';

    if (cnGood >= 4 && enIsSpecial) {
      score = 17;
      detail = '中文名五格多吉數，英文名為大師數字。雙名皆有特殊吉運，完整性極高。';
    } else if (cnGood >= 3 && enIsSpecial) {
      score = 16;
      detail = '中文名基礎良好，英文名為大師數字。整體配置優良。';
    } else if (cnGood >= 4) {
      score = 15;
      detail = '中文名五格多吉數，基礎穩固。英文名可作為輔助力量。';
    } else if (cnBad >= 3) {
      score = 5;
      detail = '中文名五格凶數較多，建議多加注意。英文名的力量或許能提供部分平衡。';
    } else {
      score = 10;
      detail = '中英文名各有優劣，整體完整度中等。可透過後天努力補足命理不足。';
    }

    return { score: score, detail: detail };
  }

  // ============ 綜合分析 ============

  function analyze(chineseResult, englishResult) {
    var elem = elementComplementScore(chineseResult, englishResult);
    var num = numberResonanceScore(chineseResult, englishResult);
    var yy = yinYangScore(chineseResult, englishResult);
    var comp = completenessScore(chineseResult, englishResult);

    var totalScore = elem.score + num.score + yy.score + comp.score;
    // 滿分 17+22+18+17 = 74，標準化到 100
    var normalizedScore = Math.round(totalScore / 74 * 100);
    // 限制範圍
    normalizedScore = Math.max(10, Math.min(98, normalizedScore));

    // 評級
    var tier, tierDesc;
    if (normalizedScore >= 90) {
      tier = '天作之合';
      tierDesc = '中英文姓名命理配置極為和諧，五行互補、數字共振、陰陽平衡俱佳。此名組合堪稱完美，有如天賜良緣，一生順遂。';
    } else if (normalizedScore >= 75) {
      tier = '和諧相生';
      tierDesc = '中英文姓名配置良好，多數命理指標均呈現正面力量。雖非完美，但和諧程度高，彼此相生相成。';
    } else if (normalizedScore >= 60) {
      tier = '平穩相宜';
      tierDesc = '中英文姓名命理配置尚可，部分指標良好，部分持平。整體平穩，無重大衝突，屬中等偏上的組合。';
    } else if (normalizedScore >= 40) {
      tier = '尚需調和';
      tierDesc = '中英文姓名命理存在部分不和諧之處。建議在弱項方面多加注意，透過後天努力與德行修養來補足命理之不足。';
    } else {
      tier = '相沖相剋';
      tierDesc = '中英文姓名命理存在較大衝突。五行相剋、數字頻率差異大，建議考慮調整其中一個名字，或加強個人修養以化解。';
    }

    return {
      score: normalizedScore,
      tier: tier,
      tierDescription: tierDesc,
      details: {
        elementComplement: elem,
        numberResonance: num,
        yinYang: yy,
        completeness: comp
      },
      rawScore: totalScore,
      maxRawScore: 74,
      advice: generateAdvice(elem, num, yy, comp, normalizedScore)
    };
  }

  function generateAdvice(elem, num, yy, comp, score) {
    var advices = [];

    if (num.score >= 20) {
      advices.push('中英文名的核心數字高度共振，這是非常難得的命理優勢。建議在日常生活中多使用兩個名字，讓能量充分融合。');
    }

    if (elem.score >= 20) {
      advices.push('五行互補極佳，中英文名的元素能量相互助益。在使用場合上，正式場合多用中文名，國際場合多用英文名，讓各自的能量在適當的場域發揮。');
    }

    if (yy.score >= 16) {
      advices.push('陰陽平衡和諧，代表內外協調、剛柔並濟。建議在生活中保持此平衡，不偏廢任何一面。');
    }

    if (score >= 80) {
      advices.push('整體來看，你的中英文姓名組合非常優良，命理能量相輔相成。這是一組值得珍惜的名字，建議終身使用。');
    } else if (score >= 60) {
      advices.push('名字組合大致良好，尚有進步空間。建議在簽名、名片等場合，讓兩個名字同時出現，增強連結能量。');
    } else if (score >= 40) {
      advices.push('名字組合存在部分不和諧，可以考慮在非正式場合給自己取一個小名或暱稱，增加正面的能量流動。');
    } else {
      advices.push('名字組合衝突較大，建議尋求專業命理師的協助，考慮調整名字。同時，多行善積德、保持正向心態，可化解部分負面影響。');
    }

    if (!advices.length) {
      advices.push('名字如同衣著，適合自己最重要。命理分析僅供參考，真正的命運掌握在自己手中。');
    }

    // 加上常見建議
    advices.push('命理僅供娛樂參考。真正的成功來自於努力、智慧與善良的心。名字是輔助，行動才是關鍵。');

    return advices;
  }

  // ============ 公開 API ============
  return {
    analyze: analyze,
    elementComplementScore: elementComplementScore,
    numberResonanceScore: numberResonanceScore,
    yinYangScore: yinYangScore,
    completenessScore: completenessScore
  };

})();
