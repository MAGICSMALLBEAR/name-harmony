/**
 * 雙人和盤引擎
 * 中中和盤 + 英英和盤 + 中英跨文化和盤
 */

window.PairHarmony = (function() {

  // ============ 工具函數 ============
  function digitToElement(num) {
    var d = num % 10;
    if (d === 1 || d === 2) return '木';
    if (d === 3 || d === 4) return '火';
    if (d === 5 || d === 6) return '土';
    if (d === 7 || d === 8) return '金';
    return '水';
  }

  var ELEMENT_RELATIONS = {
    '木': { generates: '火', overcomes: '土', overcomeBy: '金', generatedBy: '水' },
    '火': { generates: '土', overcomes: '金', overcomeBy: '水', generatedBy: '木' },
    '土': { generates: '金', overcomes: '水', overcomeBy: '木', generatedBy: '火' },
    '金': { generates: '水', overcomes: '木', overcomeBy: '火', generatedBy: '土' },
    '水': { generates: '木', overcomes: '火', overcomeBy: '土', generatedBy: '金' }
  };

  function elementRelation(a, b) {
    if (a === b) return '相同';
    var rel = ELEMENT_RELATIONS[a];
    if (!rel) return '未知';
    if (rel.generates === b) return '相生';
    if (rel.overcomes === b) return '相剋';
    if (rel.generatedBy === b) return '被生';
    if (rel.overcomeBy === b) return '被剋';
    return '未知';
  }

  // ============ 中中和盤 ============
  function cncnHarmony(cnA, cnB) {
    if (!cnA || !cnB) return null;

    // 1. 人格配對（最重要）
    var renA = cnA.grids.ren;
    var renB = cnB.grids.ren;
    var renElementRel = elementRelation(renA.element, renB.element);

    var renScore = 0, renDetail = '';
    if (renElementRel === '相生' || renElementRel === '被生') {
      renScore = 30;
      renDetail = '人格五行' + renElementRel + '（' + renA.element + '→' + renB.element + '），彼此助益，關係融洽。';
    } else if (renElementRel === '相同') {
      renScore = 22;
      renDetail = '人格五行相同（' + renA.element + '），志趣相投，但需注意互補不足。';
    } else if (renElementRel === '被剋') {
      renScore = 10;
      renDetail = '人格五行' + renElementRel + '（' + renA.element + '被' + renB.element + '剋），可能存在壓制關係。';
    } else {
      renScore = 15;
      renDetail = '人格五行相剋（' + renA.element + '剋' + renB.element + '），需互相包容。';
    }

    // 2. 總格配對
    var zongA = cnA.grids.zong.number;
    var zongB = cnB.grids.zong.number;
    var zongScore = 0, zongDetail = '';

    var diff = Math.abs(zongA - zongB);
    if (diff <= 3) {
      zongScore = 20;
      zongDetail = '總格數字' + zongA + '與' + zongB + '差距微小，頻率接近，人生方向一致。';
    } else if (diff <= 8) {
      zongScore = 15;
      zongDetail = '總格數字差距中等，有一定默契但需要磨合。';
    } else {
      zongScore = 8;
      zongDetail = '總格數字差距較大，人生方向有所不同，需更多理解。';
    }

    // 同尾數加分
    if (zongA % 10 === zongB % 10) {
      zongScore += 5;
      zongDetail += ' 總格尾數相同（五行一致），加分。';
    }

    // 3. 三才配對
    var sancaiA = cnA.sancai;
    var sancaiB = cnB.sancai;
    var sancaiScore = 0, sancaiDetail = '';

    var levels = { '大吉': 5, '吉': 4, '平': 3, '半吉': 2, '凶': 1, '大凶': 0 };
    var la = levels[sancaiA.level] || 3;
    var lb = levels[sancaiB.level] || 3;
    sancaiScore = (la + lb) * 2; // 0-20

    if (la >= 4 && lb >= 4) {
      sancaiDetail = '雙方三才配置皆優良，基礎穩固，適合長期合作。';
    } else if (la >= 3 && lb >= 3) {
      sancaiDetail = '雙方三才配置平穩，合作關係可穩定發展。';
    } else if (la <= 2 && lb <= 2) {
      sancaiDetail = '雙方三才配置皆不佳，關係中容易產生衝突與誤解。';
    } else {
      sancaiDetail = '雙方三才配置一強一弱，強方可輔助弱方，但需注意平衡。';
    }

    // 4. 吉凶數互補
    var goodA = (cnA.fortuneCounts['大吉'] || 0) + (cnA.fortuneCounts['吉'] || 0) + (cnA.fortuneCounts['中吉'] || 0);
    var badA = (cnA.fortuneCounts['凶'] || 0) + (cnA.fortuneCounts['大凶'] || 0);
    var goodB = (cnB.fortuneCounts['大吉'] || 0) + (cnB.fortuneCounts['吉'] || 0) + (cnB.fortuneCounts['中吉'] || 0);
    var badB = (cnB.fortuneCounts['凶'] || 0) + (cnB.fortuneCounts['大凶'] || 0);

    var complementaryScore = 0, complementaryDetail = '';
    if (goodA >= 3 && goodB >= 3) {
      complementaryScore = 20;
      complementaryDetail = '雙方五格多吉數，命理能量互相增強。';
    } else if (goodA + goodB >= 5) {
      complementaryScore = 15;
      complementaryDetail = '五格吉數總量尚可，彼此有一定助益。';
    } else if (badA + badB >= 4) {
      complementaryScore = 5;
      complementaryDetail = '雙方凶數較多，命理能量相互拉扯，需更多努力維繫關係。';
    } else {
      complementaryScore = 10;
      complementaryDetail = '五格吉凶互有參差，關係發展需視後天努力。';
    }

    var rawScore = renScore + zongScore + sancaiScore + complementaryScore;
    // max: 30+25+20+20 = 95
    var score = Math.round(rawScore / 95 * 100);
    score = Math.max(8, Math.min(98, score));

    return {
      mode: '中中和盤',
      modeClass: 'mode-cncn',
      score: score,
      rawScore: rawScore,
      maxRawScore: 95,
      tier: getTier(score),
      tierDesc: getTierDesc(score, '中中文'),
      dimensions: [
        { label: '🎭 人格配對', score: renScore, max: 30, detail: renDetail },
        { label: '🎯 總格共振', score: zongScore, max: 25, detail: zongDetail },
        { label: '🏛️ 三才契合', score: sancaiScore, max: 20, detail: sancaiDetail },
        { label: '🔢 吉凶互補', score: complementaryScore, max: 20, detail: complementaryDetail }
      ]
    };
  }

  // ============ 英英和盤 ============
  function enenHarmony(enA, enB) {
    if (!enA || !enB) return null;

    var aDestiny = enA.destiny;
    var bDestiny = enB.destiny;

    // 1. 命運數字配對
    var destinyScore = 0, destinyDetail = '';

    // 數字相容性表
    var compatibility = {
      1: [1,3,5,7,9], 2: [2,4,6,8], 3: [1,3,5,6,9], 4: [2,4,6,7,8],
      5: [1,3,5,7,9], 6: [2,3,4,6,9], 7: [1,4,5,7], 8: [2,4,6,8],
      9: [1,3,5,6,9], 11: [2,4,6,7,9], 22: [4,6,8], 33: [3,6,9]
    };

    var compat = compatibility[aDestiny] || [];
    if (compat.indexOf(bDestiny) >= 0) {
      destinyScore = 30;
      destinyDetail = '命運數字' + aDestiny + '與' + bDestiny + '高度相容，是天生的好搭檔。';
    } else if (Math.abs(aDestiny - bDestiny) <= 2) {
      destinyScore = 20;
      destinyDetail = '命運數字接近，頻率和諧，互相理解容易。';
    } else {
      destinyScore = 12;
      destinyDetail = '命運數字差異較大，需要更多溝通與包容。';
    }

    // 2. 靈魂數字配對
    var soulScore = 0, soulDetail = '';
    var aSoul = enA.soulUrge;
    var bSoul = enB.soulUrge;

    if (aSoul === bSoul) {
      soulScore = 25;
      soulDetail = '靈魂數字相同（' + aSoul + '），內心渴望高度一致，深層連結強。';
    } else if (Math.abs(aSoul - bSoul) <= 2) {
      soulScore = 18;
      soulDetail = '靈魂數字接近，內心世界有一定共鳴。';
    } else {
      soulScore = 10;
      soulDetail = '靈魂方向不同，需學習理解對方的內在需求。';
    }

    // 3. 個性數字配對
    var personScore = 0, personDetail = '';
    var aPerson = enA.personality;
    var bPerson = enB.personality;

    if (aPerson === bPerson) {
      personScore = 20;
      personDetail = '個性數字相同（' + aPerson + '），外在表現一致，容易互相吸引。';
    } else {
      // 互補性判斷
      var compPairs = [[1,9],[2,8],[3,7],[4,6],[5,5],[6,4],[7,3],[8,2],[9,1],[11,2],[22,4],[33,6]];
      var isComp = false;
      for (var i = 0; i < compPairs.length; i++) {
        if ((compPairs[i][0] === aPerson && compPairs[i][1] === bPerson) ||
            (compPairs[i][0] === bPerson && compPairs[i][1] === aPerson)) {
          isComp = true; break;
        }
      }
      if (isComp) {
        personScore = 22;
        personDetail = '個性互補（' + aPerson + '與' + bPerson + '），彼此能補足對方的不足。';
      } else {
        personScore = 12;
        personDetail = '個性風格不同，但有機會互相學習成長。';
      }
    }

    // 4. 名字長度共振
    var lenScore = 0, lenDetail = '';
    var diff = Math.abs(enA.letterCount - enB.letterCount);
    if (diff === 0) { lenScore = 15; lenDetail = '名字長度相同（' + enA.letterCount + '字母），奇妙的巧合！'; }
    else if (diff <= 2) { lenScore = 12; lenDetail = '名字長度接近，有一定共振效果。'; }
    else { lenScore = 7; lenDetail = '名字長度差異較大。'; }

    var rawScore = destinyScore + soulScore + personScore + lenScore;
    // max: 30+25+22+15 = 92
    var score = Math.round(rawScore / 92 * 100);
    score = Math.max(8, Math.min(98, score));

    return {
      mode: '英英和盤',
      modeClass: 'mode-enen',
      score: score,
      rawScore: rawScore,
      maxRawScore: 92,
      tier: getTier(score),
      tierDesc: getTierDesc(score, '英文'),
      dimensions: [
        { label: '🎭 命運配對', score: destinyScore, max: 30, detail: destinyDetail },
        { label: '💖 靈魂共鳴', score: soulScore, max: 25, detail: soulDetail },
        { label: '🎪 個性互補', score: personScore, max: 22, detail: personDetail },
        { label: '📏 長度共振', score: lenScore, max: 15, detail: lenDetail }
      ]
    };
  }

  // ============ 中英跨文化和盤 ============
  function cnenCrossHarmony(cnResult, enResult) {
    if (!cnResult || !enResult) return null;

    var ren = cnResult.grids.ren;
    var destinyEl = digitToElement(enResult.destiny);

    // 1. 五行跨文化
    var elemRel = elementRelation(ren.element, destinyEl);
    var elemScore = 0, elemDetail = '';

    if (elemRel === '相生' || elemRel === '被生') {
      elemScore = 30;
      elemDetail = '中文人格' + ren.element + '與英文命運' + destinyEl + '為' + elemRel + '關係，跨文化和諧。';
    } else if (elemRel === '相同') {
      elemScore = 22;
      elemDetail = '中文人格與英文命運五行相同，頻率一致，溝通順暢。';
    } else if (elemRel === '被剋') {
      elemScore = 12;
      elemDetail = '五行' + elemRel + '，英文能量較強，中文方需學習適應。';
    } else {
      elemScore = 16;
      elemDetail = '五行' + elemRel + '，需互相理解文化差異帶來的能量衝突。';
    }

    // 2. 數字跨文化共振
    var numScore = 0, numDetail = '';
    if (ren.number === enResult.destiny) {
      numScore = 25; numDetail = '人格數字與英文命運數字相同（' + ren.number + '），跨文化完美共振！';
    } else if (ren.number % 10 === enResult.destiny % 10) {
      numScore = 20; numDetail = '數字尾數相同，五行呼應，有隱性連結。';
    } else if (Math.abs(ren.number - enResult.destiny) <= 4) {
      numScore = 16; numDetail = '數字接近，跨文化交流有一定基礎。';
    } else {
      numScore = 10; numDetail = '數字頻率差異，需要更多跨文化理解。';
    }

    // 3. 陰陽跨文化
    var yyScore = cnResult.wuge.zong % 2 !== enResult.letterCount % 2 ? 18 : 10;
    var yyDetail = yyScore >= 18 ?
      '中英文陰陽互補，代表跨文化結合能達成良好平衡。' :
      '陰陽屬性相同，跨文化合作中可能缺乏互補彈性。';

    // 4. 語言能量
    var langScore = 0, langDetail = '';
    var cnSyllables = cnResult.parsed.givenNameChars.length;
    var enSyllables = enResult.normalizedName.replace(/[^AEIOUY]/gi, '').length || 1;
    if (Math.abs(cnSyllables - enSyllables) <= 1) {
      langScore = 15; langDetail = '音節數接近，語言能量流暢。';
    } else {
      langScore = 8; langDetail = '音節數不同，語言節奏有差異，但增添異文化魅力。';
    }

    var rawScore = elemScore + numScore + yyScore + langScore;
    // max: 30+25+18+15 = 88
    var score = Math.round(rawScore / 88 * 100);
    score = Math.max(8, Math.min(98, score));

    return {
      mode: '中英和盤',
      modeClass: 'mode-cnen',
      score: score,
      rawScore: rawScore,
      maxRawScore: 88,
      tier: getTier(score),
      tierDesc: getTierDesc(score, '中英'),
      dimensions: [
        { label: '🌉 五行跨文化', score: elemScore, max: 30, detail: elemDetail },
        { label: '🔢 數字共振', score: numScore, max: 25, detail: numDetail },
        { label: '☯ 陰陽調和', score: yyScore, max: 18, detail: yyDetail },
        { label: '🗣️ 語言能量', score: langScore, max: 15, detail: langDetail }
      ]
    };
  }

  // ============ 綜合和盤（個人中英文名）============
  function selfHarmony(cn, en) {
    // 沿用舊版 harmony.js 的邏輯
    return window.Harmony.analyze(cn, en);
  }

  // ============ 輔助函數 ============
  function getTier(score) {
    if (score >= 90) return '天作之合';
    if (score >= 75) return '和諧相生';
    if (score >= 60) return '平穩相宜';
    if (score >= 40) return '尚需調和';
    return '相沖相剋';
  }

  function getTierDesc(score, type) {
    var prefix = type + '姓名';
    if (score >= 90) return prefix + '命理配置極為和諧！彼此是絕佳的夥伴，無論合作或交往都極具潛力。';
    if (score >= 75) return prefix + '配置良好，多數指標正面，適合深入發展關係。';
    if (score >= 60) return prefix + '配置尚可，關係可穩定發展，部分領域需多加磨合。';
    if (score >= 40) return prefix + '存在部分不和諧，需用心經營。建議多溝通理解，彌補先天差異。';
    return prefix + '衝突較大，建議保持距離或尋求專業命理建議調整。';
  }

  // ============ 公開 API ============
  return {
    cncnHarmony: cncnHarmony,
    enenHarmony: enenHarmony,
    cnenCrossHarmony: cnenCrossHarmony,
    selfHarmony: selfHarmony,
    getTier: getTier
  };

})();
