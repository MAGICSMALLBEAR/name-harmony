/**
 * 英文姓名靈數引擎
 * 畢達哥拉斯（Pythagorean）字母數字學系統
 */

window.EnglishNumerology = (function() {

  // ============ 畢達哥拉斯字母數字對照表 ============
  var PYTHAGOREAN_MAP = {
    'A':1,'B':2,'C':3,'D':4,'E':5,'F':6,'G':7,'H':8,'I':9,
    'J':1,'K':2,'L':3,'M':4,'N':5,'O':6,'P':7,'Q':8,'R':9,
    'S':1,'T':2,'U':3,'V':4,'W':5,'X':6,'Y':7,'Z':8
  };

  // 母音
  var VOWELS = { 'A':true,'E':true,'I':true,'O':true,'U':true,'Y':true };

  // ============ 數字縮減 ============

  /** 大師數字 */
  var MASTER_NUMBERS = { 11:true, 22:true, 33:true };

  function reduceNumber(num) {
    // 防呆：非正整數或 0
    if (!num || num <= 0 || !Number.isFinite(num)) return 0;
    // 如果是大師數字，保留
    if (MASTER_NUMBERS[num]) return num;
    // 如果已有含義（1-9），直接返回
    if (num >= 1 && num <= 9) return num;
    // 繼續縮減
    var sum = 0;
    var n = num;
    while (n > 0) {
      sum += n % 10;
      n = Math.floor(n / 10);
    }
    if (sum === 0) return 0;
    return reduceNumber(sum);
  }

  // ============ 字母轉數字 ============

  function letterToNumber(letter) {
    var upper = letter.toUpperCase();
    return PYTHAGOREAN_MAP[upper] || 0;
  }

  function isVowel(letter) {
    return !!VOWELS[letter.toUpperCase()];
  }

  // ============ 名字分析 ============

  function analyzeName(fullName) {
    if (!fullName || !fullName.trim()) return null;

    var name = fullName.trim().toUpperCase().replace(/[^A-Z\s\-']/g, '');
    var letters = name.replace(/[^A-Z]/g, '').split('');

    if (letters.length === 0) return null;

    // 每個字母對應的數字
    var letterValues = letters.map(function(l) {
      return { letter: l, number: PYTHAGOREAN_MAP[l] || 0 };
    });

    // 母音總和 → 靈魂數字 (Soul Urge / Heart's Desire)
    var vowelLetters = letters.filter(function(l) { return isVowel(l); });
    var vowelSum = vowelLetters.reduce(function(sum, l) { return sum + (PYTHAGOREAN_MAP[l] || 0); }, 0);
    var soulUrge = reduceNumber(vowelSum);

    // 子音總和 → 個性數字 (Personality)
    var consonantLetters = letters.filter(function(l) { return !isVowel(l); });
    var consonantSum = consonantLetters.reduce(function(sum, l) { return sum + (PYTHAGOREAN_MAP[l] || 0); }, 0);
    var personality = reduceNumber(consonantSum);

    // 全名總和 → 命運數字 (Destiny / Expression)
    var totalSum = letters.reduce(function(sum, l) { return sum + (PYTHAGOREAN_MAP[l] || 0); }, 0);
    var destiny = reduceNumber(totalSum);

    return {
      name: fullName.trim(),
      normalizedName: name,
      letterCount: letters.length,
      letterValues: letterValues,
      destiny: destiny,
      soulUrge: soulUrge,
      personality: personality,
      totalSum: totalSum,
      vowelSum: vowelSum,
      consonantSum: consonantSum,
      numbers: {
        destiny: destiny,
        soulUrge: soulUrge,
        personality: personality
      }
    };
  }

  // ============ 取得數字含義 ============

  function getNumberMeaning(num) {
    return window.englishNumberMeanings[num] || null;
  }

  // ============ 五大核心數字 ============

  function getFullReport(analysis) {
    if (!analysis) return null;

    var destinyM = getNumberMeaning(analysis.destiny) || {};
    var soulM = getNumberMeaning(analysis.soulUrge) || {};
    var personalityM = getNumberMeaning(analysis.personality) || {};

    return {
      name: analysis.name,
      coreNumbers: [
        {
          name: '命運數字',
          enName: 'Destiny Number',
          number: analysis.destiny,
          meaning: destinyM,
          description: '代表一生的使命與方向，是最重要的核心數字。'
        },
        {
          name: '靈魂數字',
          enName: 'Soul Urge Number',
          number: analysis.soulUrge,
          meaning: soulM,
          description: '代表內心深處的渴望、動機與價值觀。'
        },
        {
          name: '個性數字',
          enName: 'Personality Number',
          number: analysis.personality,
          meaning: personalityM,
          description: '代表外在表現、他人眼中的你。'
        }
      ],
      letterValues: analysis.letterValues,
      totalSum: analysis.totalSum,
      letterCount: analysis.letterCount
    };
  }

  // ============ 生命週期分析 ============

  function getLifeCycleNumbers(destinyNumber) {
    // 生命週期分為三個階段，根據命運數字計算
    var cycles = {
      1: { first: { age: '0-30歲', focus: '獨立發展期', desc: '建立自我認同、發展領導力與獨特性。' }, second: { age: '31-50歲', focus: '合作成長期', desc: '學習與人合作、平衡獨立與依賴。' }, third: { age: '51歲+', focus: '豐收傳承期', desc: '運用畢生智慧，領導和啟發他人。' } },
      2: { first: { age: '0-30歲', focus: '敏感覺察期', desc: '培養直覺力與同理心，建立人際關係基礎。' }, second: { age: '31-50歲', focus: '平衡調和期', desc: '學習在合作中保持自我，發展外交能力。' }, third: { age: '51歲+', focus: '智慧分享期', desc: '以豐富的感受力與經驗滋養他人。' } },
      3: { first: { age: '0-30歲', focus: '創意探索期', desc: '發掘藝術天分，培養表達與溝通能力。' }, second: { age: '31-50歲', focus: '社交拓展期', desc: '建立廣泛人脈，將創意轉化為實際成果。' }, third: { age: '51歲+', focus: '喜悅分享期', desc: '以樂觀與創意豐富自己與他人的生活。' } },
      4: { first: { age: '0-30歲', focus: '基礎建設期', desc: '建立穩固的知識與技能基礎，培養紀律。' }, second: { age: '31-50歲', focus: '事業成就期', desc: '辛勤耕耘獲得回報，建立穩固的事業。' }, third: { age: '51歲+', focus: '穩固守成期', desc: '運用累積的經驗與資源，享受穩定生活。' } },
      5: { first: { age: '0-30歲', focus: '自由探索期', desc: '多元嘗試，累積豐富的人生經驗。' }, second: { age: '31-50歲', focus: '資源整合期', desc: '將多方經驗整合，找到真正適合的方向。' }, third: { age: '51歲+', focus: '智慧傳承期', desc: '以豐富閱歷引導年輕人，享受自由人生。' } },
      6: { first: { age: '0-30歲', focus: '責任培養期', desc: '學習關懷他人，建立家庭與社群觀念。' }, second: { age: '31-50歲', focus: '奉獻付出期', desc: '全心投入家庭與社區，承擔重要責任。' }, third: { age: '51歲+', focus: '圓滿收穫期', desc: '收穫愛與尊重，享受家人圍繞的幸福。' } },
      7: { first: { age: '0-30歲', focus: '知識累積期', desc: '深度學習與研究，發展分析與思考能力。' }, second: { age: '31-50歲', focus: '專業精進期', desc: '在專業領域深耕，成為權威專家。' }, third: { age: '51歲+', focus: '靈性昇華期', desc: '追求更高層次的智慧與精神滿足。' } },
      8: { first: { age: '0-30歲', focus: '能力鍛鍊期', desc: '建立自信與能力基礎，學習管理與領導。' }, second: { age: '31-50歲', focus: '權力巔峰期', desc: '事業達到高峰，實現財務與地位目標。' }, third: { age: '51歲+', focus: '影響力延續期', desc: '運用資源與影響力，回饋社會。' } },
      9: { first: { age: '0-30歲', focus: '理想萌芽期', desc: '培養博愛精神，追尋人生的崇高意義。' }, second: { age: '31-50歲', focus: '奉獻實踐期', desc: '將理想轉化為行動，為社會做出貢獻。' }, third: { age: '51歲+', focus: '智慧圓滿期', desc: '以豐富的人生智慧，成為他人的燈塔。' } }
    };

    var num = reduceNumber(destinyNumber) || 1;
    // 大師數字映射
    if (num === 0) num = 1;
    if (num === 11) num = 2;
    if (num === 22) num = 4;
    if (num === 33) num = 6;

    return cycles[num] || cycles[1];
  }

  function getPersonalYear(destinyNumber, birthMonth, birthDay) {
    var now = new Date();
    var currentYear = now.getFullYear();
    // 如果生日還沒到，用去年
    var birthday = new Date(currentYear, (birthMonth || 1) - 1, birthDay || 1);
    if (now < birthday) currentYear--;
    // 年份數字和
    var yearSum = String(currentYear).split('').reduce(function(s, d) { return s + parseInt(d); }, 0);
    var personalYear = reduceNumber(destinyNumber + yearSum);
    var meanings = {
      1: { focus: '新開始', desc: '今年是開啟新篇章的一年。適合開始新計劃、新關係或新方向。' },
      2: { focus: '合作等待', desc: '今年需要耐心與合作。適合培養關係、等待時機成熟。' },
      3: { focus: '創意表達', desc: '今年充滿創意與社交能量。適合表達自己、拓展人脈。' },
      4: { focus: '辛勤耕耘', desc: '今年需要努力打基礎。適合專注工作、建立秩序與紀律。' },
      5: { focus: '改變冒險', desc: '今年充滿變化與機遇。適合旅行、嘗試新事物、突破框架。' },
      6: { focus: '家庭責任', desc: '今年重心在家庭與關係。適合經營感情、承擔責任。' },
      7: { focus: '內省學習', desc: '今年適合沉澱與學習。適合進修、研究、心靈成長。' },
      8: { focus: '收穫成就', desc: '今年是收割成果的一年。適合追求事業目標與財務規劃。' },
      9: { focus: '完結釋放', desc: '今年是循環的結束。適合清理舊事物、為新循環做準備。' }
    };
    return {
      year: currentYear,
      number: personalYear,
      focus: (meanings[personalYear] || {}).focus || '',
      desc: (meanings[personalYear] || {}).desc || ''
    };
  }
  return {
    analyze: analyzeName,
    getMeaning: getNumberMeaning,
    getFullReport: getFullReport,
    getLifeCycleNumbers: getLifeCycleNumbers,
    getPersonalYear: getPersonalYear,
    letterToNumber: letterToNumber,
    reduceNumber: reduceNumber,
    PYTHAGOREAN_MAP: PYTHAGOREAN_MAP
  };

})();
