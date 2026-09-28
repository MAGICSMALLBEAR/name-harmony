/**
 * 英文姓名靈數引擎
 * 畢達哥拉斯（Pythagorean）字母數字學系統
 */

window.EnglishNumerology = (function() {

  // ============ 畢達哥拉斯字母數字對照表 ============
  // 卡巴拉系統 (Chaldean/Hebrew) — 另一套字母數字對照
  var CHALDEAN_MAP = {
    'A':1,'B':2,'C':3,'D':4,'E':5,'F':8,'G':3,'H':5,'I':1,
    'J':1,'K':2,'L':3,'M':4,'N':5,'O':7,'P':8,'Q':1,'R':2,
    'S':3,'T':4,'U':6,'V':6,'W':6,'X':5,'Y':1,'Z':7
  };
  function chaldeanNumber(name) {
    if (!name) return 0;
    var sum = 0;
    var chars = name.toUpperCase().replace(/[^A-Z]/g,'').split('');
    chars.forEach(function(c) {
      sum += (CHALDEAN_MAP[c] || 0);
    });
    return reduceNumber(sum);
  }

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

  // ============ 生日靈數（分項化簡法） ============
  // 出生月、日、年先各自化簡（保留大師數）再相加。
  // 生命靈數、個人年、高峰數、挑戰數、生命週期都只看出生日期，跟名字無關。

  /** 化簡到個位數（大師數也拆掉），挑戰數、個人年、年齡計算用 */
  function reduceSingle(num) {
    num = Math.abs(num);
    while (num > 9) num = String(num).split('').reduce(function(s, d) { return s + +d; }, 0);
    return num;
  }

  function birthParts(birth) {
    if (!birth || !birth.year || !birth.month || !birth.day) return null;
    return { m: reduceNumber(birth.month), d: reduceNumber(birth.day), y: reduceNumber(birth.year) };
  }

  function getLifePath(birth) {
    var p = birthParts(birth);
    return p ? reduceNumber(p.m + p.d + p.y) : null;
  }

  // 各數字在三個生命週期的主題：[成長期標題, 說明, 生產期標題, 說明, 收穫期標題, 說明]
  var CYCLE_TEXT = {
    1: ['獨立發展期', '建立自我認同、發展領導力與獨特性。', '開創事業期', '主導自己的方向，適合創業、帶領團隊。', '自主傳承期', '運用畢生智慧，領導和啟發他人。'],
    2: ['敏感覺察期', '培養直覺力與同理心，建立人際關係基礎。', '合作調和期', '在合作中保持自我，發展協調與外交能力。', '智慧分享期', '以豐富的感受力與經驗滋養他人。'],
    3: ['創意探索期', '發掘藝術天分，培養表達與溝通能力。', '社交拓展期', '建立廣泛人脈，將創意轉化為實際成果。', '喜悅分享期', '以樂觀與創意豐富自己與他人的生活。'],
    4: ['基礎建設期', '建立穩固的知識與技能基礎，培養紀律。', '事業耕耘期', '辛勤耕耘獲得回報，建立穩固的事業。', '穩固守成期', '運用累積的經驗與資源，享受穩定生活。'],
    5: ['自由探索期', '多元嘗試，累積豐富的人生經驗。', '變動轉型期', '工作與環境變化多，把多方經驗整合成方向。', '自在遊歷期', '以豐富閱歷引導年輕人，享受自由人生。'],
    6: ['責任培養期', '學習關懷他人，建立家庭與社群觀念。', '奉獻付出期', '全心投入家庭與社區，承擔重要責任。', '圓滿收穫期', '收穫愛與尊重，享受家人圍繞的幸福。'],
    7: ['知識累積期', '深度學習與研究，發展分析與思考能力。', '專業精進期', '在專業領域深耕，成為權威專家。', '靈性昇華期', '追求更高層次的智慧與精神滿足。'],
    8: ['能力鍛鍊期', '建立自信與能力基礎，學習管理與領導。', '成就權力期', '事業達到高峰，實現財務與地位目標。', '影響力延續期', '運用資源與影響力，回饋社會。'],
    9: ['理想萌芽期', '培養博愛精神，追尋人生的崇高意義。', '奉獻實踐期', '將理想轉化為行動，為社會做出貢獻。', '智慧圓滿期', '以豐富的人生智慧，成為他人的燈塔。']
  };

  /** 第一高峰結束的年齡：36 − 生命靈數（化簡到個位數），之後每 9 年換一個高峰 */
  function firstPeriodEnd(birth) {
    return 36 - reduceSingle(getLifePath(birth));
  }

  /** 生命週期：出生月→成長週期、出生日→生產週期、出生年→收穫週期（分界與高峰數對齊） */
  function getLifeCycleNumbers(birth) {
    var p = birthParts(birth);
    if (!p) return null;
    var end1 = firstPeriodEnd(birth);
    var nums = [p.m, p.d, p.y];
    var bounds = [[0, end1], [end1 + 1, end1 + 27], [end1 + 28, null]];
    var names = ['成長週期', '生產週期', '收穫週期'];
    return nums.map(function(n, i) {
      var t = CYCLE_TEXT[reduceSingle(n)], b = bounds[i];
      return {
        number: n, name: names[i], startAge: b[0], endAge: b[1],
        age: b[1] == null ? b[0] + ' 歲以後' : b[0] + '–' + b[1] + ' 歲',
        focus: t[i * 2], desc: t[i * 2 + 1]
      };
    });
  }

  var PERSONAL_YEAR = {
    1: { focus: '新開始', desc: '九年循環的第一年。適合開始新計劃、新關係或新方向。' },
    2: { focus: '合作等待', desc: '需要耐心與合作。適合培養關係、等待時機成熟。' },
    3: { focus: '創意表達', desc: '充滿創意與社交能量。適合表達自己、拓展人脈。' },
    4: { focus: '辛勤耕耘', desc: '需要努力打基礎。適合專注工作、建立秩序與紀律。' },
    5: { focus: '改變冒險', desc: '充滿變化與機遇。適合旅行、嘗試新事物、突破框架。' },
    6: { focus: '家庭責任', desc: '重心在家庭與關係。適合經營感情、承擔責任。' },
    7: { focus: '內省學習', desc: '適合沉澱與學習。適合進修、研究、心靈成長。' },
    8: { focus: '收穫成就', desc: '收割成果的一年。適合追求事業目標與財務規劃。' },
    9: { focus: '完結釋放', desc: '九年循環的最後一年。適合清理舊事物、為新循環做準備。' }
  };

  /** 個人年：出生月＋出生日＋當年（西曆年，1 月 1 日換年） */
  function getPersonalYear(birth, year) {
    if (!birth || !birth.month || !birth.day) return null;
    year = year || new Date().getFullYear();
    var n = reduceSingle(reduceNumber(birth.month) + reduceNumber(birth.day) + reduceNumber(year));
    return { year: year, number: n, focus: PERSONAL_YEAR[n].focus, desc: PERSONAL_YEAR[n].desc };
  }

  /** 高峰數：月＋日、日＋年、前兩者相加、月＋年 */
  function getPinnacleNumbers(birth) {
    var p = birthParts(birth);
    if (!p) return null;
    var p1 = reduceNumber(p.m + p.d), p2 = reduceNumber(p.d + p.y);
    var nums = [p1, p2, reduceNumber(p1 + p2), reduceNumber(p.m + p.y)];
    var end1 = firstPeriodEnd(birth);
    return nums.map(function(n, i) {
      var from = i === 0 ? 0 : end1 + 1 + (i - 1) * 9;
      var to = i === 3 ? null : end1 + i * 9;
      var m = getNumberMeaning(n) || {};
      return {
        number: n,
        startAge: from, endAge: to,
        age: to == null ? from + ' 歲以後' : from + '–' + to + ' 歲',
        startYear: birth.year + from,
        title: m.title || '',
        keywords: m.keywords || ''
      };
    });
  }

  var CHALLENGE_TEXT = {
    0: '選擇之課：沒有特定弱點，也因此要自己決定往哪裡用力，避免什麼都想做。',
    1: '自我之課：學習獨立與自信，不被別人的意見左右，也不過度強勢。',
    2: '敏感之課：學習不過度在意他人眼光，在合作中保有自己的立場。',
    3: '表達之課：學習把情緒與想法說出來，不壓抑也不流於膚淺。',
    4: '紀律之課：學習耐心與按部就班，克服懶散或過度死板。',
    5: '自由之課：在自由與責任之間取得平衡，不因害怕改變而停滯，也不衝動放縱。',
    6: '責任之課：學習照顧他人但不控制，放下完美主義與過高標準。',
    7: '信任之課：學習信任他人與自己的直覺，不因懷疑而封閉。',
    8: '物質之課：學習正確看待金錢與權力，不過度追逐也不刻意迴避。'
  };

  /** 挑戰數：月、日、年化簡到個位數後相減取絕對值 */
  function getChallengeNumbers(birth) {
    var p = birthParts(birth);
    if (!p) return null;
    var m = reduceSingle(p.m), d = reduceSingle(p.d), y = reduceSingle(p.y);
    var c1 = Math.abs(m - d), c2 = Math.abs(d - y);
    var nums = [c1, c2, Math.abs(c1 - c2), Math.abs(m - y)];
    var names = ['第一挑戰', '第二挑戰', '主要挑戰', '第四挑戰'];
    return nums.map(function(n, i) { return { number: n, name: names[i], desc: CHALLENGE_TEXT[n] }; });
  }

  /** 轉折年：換下一個高峰的年份（共 3 次） */
  function getTurningYears(birth, thisYear) {
    var pins = getPinnacleNumbers(birth);
    if (!pins) return null;
    thisYear = thisYear || new Date().getFullYear();
    return pins.slice(1).map(function(pn) {
      return { year: pn.startYear, age: pn.startAge, isPast: pn.startYear <= thisYear };
    });
  }

  /** 成熟數：生命靈數＋命運數 */
  function getMaturityNumber(analysis, birth) {
    var lp = getLifePath(birth);
    if (!analysis || lp == null) return null;
    return reduceNumber(lp + analysis.destiny);
  }

  /** 平衡數：全名各段首字母相加 */
  function getBalanceNumber(fullName) {
    if (!fullName) return null;
    var parts = fullName.trim().toUpperCase().replace(/[^A-Z\s]/g, '').split(/\s+/).filter(Boolean);
    if (!parts.length) return null;
    var sum = 0;
    parts.forEach(function(p) { sum += letterToNumber(p[0]); });
    return reduceNumber(sum);
  }

  /** 進階數字；沒有完整出生日期時只有平衡數 */
  function getAdvancedNumbers(analysis, birth) {
    var hasBirth = !!birthParts(birth);
    return {
      balance: analysis ? getBalanceNumber(analysis.name) : null,
      lifePath: hasBirth ? getLifePath(birth) : null,
      maturity: getMaturityNumber(analysis, birth),
      personalYear: hasBirth ? getPersonalYear(birth) : null,
      pinnacles: getPinnacleNumbers(birth),
      challenges: getChallengeNumbers(birth),
      cycles: getLifeCycleNumbers(birth),
      turningYears: getTurningYears(birth)
    };
  }

  return {
    analyze: analyzeName,
    getMeaning: getNumberMeaning,
    getFullReport: getFullReport,
    getLifePath: getLifePath,
    getLifeCycleNumbers: getLifeCycleNumbers,
    getPersonalYear: getPersonalYear,
    getChallengeNumbers: getChallengeNumbers,
    getMaturityNumber: getMaturityNumber,
    getBalanceNumber: getBalanceNumber,
    getPinnacleNumbers: getPinnacleNumbers,
    getTurningYears: getTurningYears,
    chaldeanNumber: chaldeanNumber, CHALDEAN_MAP: CHALDEAN_MAP,
    getAdvancedNumbers: getAdvancedNumbers,
    letterToNumber: letterToNumber,
    reduceNumber: reduceNumber,
    reduceSingle: reduceSingle,
    PYTHAGOREAN_MAP: PYTHAGOREAN_MAP
  };

})();
