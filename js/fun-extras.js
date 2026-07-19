/**
 * 趣味附加功能：MBTI對照 + 今日幸運
 */
window.FunExtras = (function() {

  // ============ 靈數 → MBTI 對照 ============
  var NUM_MBTI = {
    1: { mbti: 'ENTJ', label: '指揮官', desc: '天生的領袖，果斷、有遠見。適合統籌全局、制定策略。', match: ['INTJ','ENTP','ESTJ'] },
    2: { mbti: 'ISFJ', label: '守衛者', desc: '溫柔細膩，善於照顧他人。重視和諧與安全感。', match: ['ESFJ','INFJ','ISTJ'] },
    3: { mbti: 'ENFP', label: '競選者', desc: '充滿創意與熱情，善於表達與社交。總有新點子。', match: ['INFJ','ENTP','ESFP'] },
    4: { mbti: 'ISTJ', label: '物流師', desc: '務實可靠，按部就班。追求秩序與穩定，值得信賴。', match: ['ESTJ','ISFJ','INTJ'] },
    5: { mbti: 'ESTP', label: '企業家', desc: '熱愛自由與冒險，反應敏捷，享受活在當下。', match: ['ENTP','ESFP','ISTP'] },
    6: { mbti: 'ESFJ', label: '執政官', desc: '熱心負責，重視人際和諧。是天生的照顧者。', match: ['ISFJ','ENFJ','ESTJ'] },
    7: { mbti: 'INTJ', label: '建築師', desc: '深度思考者，獨立自主。追求知識與真理。', match: ['ENTJ','INTP','INFJ'] },
    8: { mbti: 'ESTJ', label: '總經理', desc: '果斷務實，善於管理。追求效率與成果。', match: ['ISTJ','ENTJ','ESFJ'] },
    9: { mbti: 'INFJ', label: '提倡者', desc: '理想主義者，富有同理心。追求意義與貢獻。', match: ['ENFJ','INTJ','INFP'] },
    11: { mbti: 'INFP', label: '調停者', desc: '富有靈性與直覺。善於啟發他人，有藝術氣質。', match: ['INFJ','ENFP','INTJ'] },
    22: { mbti: 'ENTJ', label: '指揮官(大師)', desc: '大師級的領導者，兼具遠見與執行力。能成就大事。', match: ['INTJ','ESTJ','ENTP'] },
    33: { mbti: 'ENFJ', label: '主人公(大師)', desc: '無私的奉獻者，具有強大的感染力與領導魅力。', match: ['INFJ','ESFJ','ENTJ'] }
  };

  function getMBTI(destinyNumber) {
    return NUM_MBTI[destinyNumber] || NUM_MBTI[1];
  }

  var MBTI_DESC = {
    'ENTJ': '果斷領導者，善於制定策略並帶領團隊執行',
    'INTJ': '策略思考者，獨立、有遠見，擅長規劃',
    'ENTP': '辯論家，機智靈活，喜歡挑戰既有框架',
    'INTP': '邏輯學家，善於分析，追求知識',
    'ENFJ': '教育家，富有感染力，善於引導他人成長',
    'INFJ': '提倡者，理想主義，有深度同理心',
    'ENFP': '競選者，熱情創意，擅長連結人與想法',
    'INFP': '調停者，理想主義，重視價值觀與意義',
    'ESTJ': '總經理，務實可靠，擅長組織與執行',
    'ISTJ': '物流師，腳踏實地，注重細節與秩序',
    'ESFJ': '執政官，熱心關懷，善於照顧他人需求',
    'ISFJ': '守衛者，忠誠奉獻，默默守護所愛',
    'ESTP': '企業家，行動派，享受冒險與挑戰',
    'ISTP': '鑑賞家，冷靜靈活，擅長解決實際問題',
    'ESFP': '表演者，活潑開朗，享受當下的樂趣',
    'ISFP': '探險家，感性細膩，追求美與和諧'
  };

  // ============ 今日幸運 ============
  var LUCKY_COLORS = ['紅色','金色','藍色','綠色','紫色','白色','橙色','粉色','銀色','黃色'];
  var LUCKY_DIRS = ['東','南','西','北','東南','西南','東北','西北'];
  var LUCKY_TIPS = [
    '今天適合踏出舒適圈，嘗試新事物。',
    '保持微笑，好運會自然靠近你。',
    '今天與人合作會有意想不到的收穫。',
    '放慢腳步，用心感受身邊的美好。',
    '今天適合整理環境，清出新的空間迎接好運。',
    '說出你的想法，今天你的聲音會被聽見。',
    '給自己一個小獎勵，你值得被善待。',
    '幫助身邊的人，善的循環會回到你身上。'
  ];

  function getDailyFortune(destinyNumber, personElement) {
    var now = new Date();
    // 用日期+命運數字做 pseudo-random
    var seed = now.getFullYear() * 10000 + (now.getMonth()+1) * 100 + now.getDate() + destinyNumber;
    var rng = function(n) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };

    var color = LUCKY_COLORS[rng(LUCKY_COLORS.length)];
    var dir = LUCKY_DIRS[rng(LUCKY_DIRS.length)];
    var num = rng(9) + 1;
    var tip = LUCKY_TIPS[rng(LUCKY_TIPS.length)];

    // 幸運指數 1-5 星
    var stars = (destinyNumber + now.getDate()) % 5 + 1;

    return {
      date: now.toISOString().slice(0,10),
      stars: stars,
      starDisplay: '★'.repeat(stars) + '☆'.repeat(5-stars),
      color: color,
      direction: dir,
      number: num,
      tip: tip,
      element: personElement || '?'
    };
  }

  return {
    getMBTI: getMBTI,
    MBTI_DESC: MBTI_DESC,
    getDailyFortune: getDailyFortune
  };
})();
