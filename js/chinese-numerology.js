/**
 * 中文姓名學引擎
 * 五格剖象法 + 三才五行分析
 */

window.ChineseNumerology = (function() {

  // ============ 工具函數 ============

  /** 數字尾數 → 五行 */
  function digitToElement(num) {
    const d = num % 10;
    if (d === 1 || d === 2) return '木';
    if (d === 3 || d === 4) return '火';
    if (d === 5 || d === 6) return '土';
    if (d === 7 || d === 8) return '金';
    return '水'; // 9, 0
  }

  /** 五行相生相剋判斷 */
  const ELEMENT_RELATIONS = {
    '木': { generates: '火', overcomes: '土', overcomeBy: '金', generatedBy: '水' },
    '火': { generates: '土', overcomes: '金', overcomeBy: '水', generatedBy: '木' },
    '土': { generates: '金', overcomes: '水', overcomeBy: '木', generatedBy: '火' },
    '金': { generates: '水', overcomes: '木', overcomeBy: '火', generatedBy: '土' },
    '水': { generates: '木', overcomes: '火', overcomeBy: '土', generatedBy: '金' }
  };

  /** 兩元素關係 */
  function elementRelation(a, b) {
    if (a === b) return '相同';
    const rel = ELEMENT_RELATIONS[a];
    if (!rel) return '未知';
    if (rel.generates === b) return '相生';
    if (rel.overcomes === b) return '相剋';
    if (rel.generatedBy === b) return '被生';
    if (rel.overcomeBy === b) return '被剋';
    return '未知';
  }

  /** 筆劃查詢（含簡轉繁 + 手動覆蓋） */
  function getStrokes(char, manualStrokes) {
    if (!char) return 0;
    // 手動輸入優先
    if (manualStrokes && manualStrokes[char] !== undefined) {
      return parseInt(manualStrokes[char]) || -1;
    }
    // 直接查詢
    var s = window.strokeMap[char];
    if (typeof s === 'number') return s;
    // 簡轉繁體再查
    if (window.s2tMap && window.s2tMap[char]) {
      var trad = window.s2tMap[char];
      s = window.strokeMap[trad];
      if (typeof s === 'number') return s;
      // 多字對照（如「钟」→「鍾」）
      for (var i = 0; i < trad.length; i++) {
        var sub = trad[i];
        s = window.strokeMap[sub];
        if (typeof s === 'number') return s;
      }
    }
    return -1;
  }

  // ============ 複姓判斷 ============
  var COMPOUND_SURNAMES = [
    '司馬', '上官', '歐陽', '夏侯', '諸葛', '聞人', '東方', '赫連', '皇甫', '尉遲',
    '公羊', '澹臺', '公冶', '宗政', '濮陽', '淳于', '單于', '太叔', '申屠', '公孫',
    '軒轅', '令狐', '鍾離', '宇文', '長孫', '慕容', '鮮于', '閭丘', '司徒', '司空',
    '丌官', '司寇', '仉督', '子車', '顓孫', '端木', '巫馬', '公西', '漆雕', '樂正',
    '壤駟', '公良', '拓拔', '夾谷', '宰父', '穀梁', '段干', '百里', '東郭', '南門',
    '呼延', '歸海', '羊舌', '微生', '岳帥', '緱亢', '況後', '有琴', '梁丘', '左丘',
    '東門', '西門', '商牟', '佘佴', '伯賞', '南宮', '墨哈', '譙笪', '年愛', '陽佟',
    '第五', '言福'
  ];

  // ============ 姓名解析 ============

  /** 解析中文姓名為姓和名 */
  function parseChineseName(fullName) {
    var name = fullName.trim().replace(/\s+/g, '');
    if (!name) return null;

    var surname = '';
    var givenName = '';

    // 檢查複姓
    for (var i = 0; i < COMPOUND_SURNAMES.length; i++) {
      var cs = COMPOUND_SURNAMES[i];
      if (name.indexOf(cs) === 0) {
        surname = cs;
        givenName = name.substring(cs.length);
        break;
      }
    }

    // 單姓（取第一個字）
    if (!surname) {
      surname = name.charAt(0);
      givenName = name.substring(1);
    }

    if (!givenName) return null;

    return {
      surname: surname,
      givenName: givenName,
      surnameChars: surname.split(''),
      givenNameChars: givenName.split('')
    };
  }

  // ============ 五格計算 ============

  function calcFiveGrids(parsed, manualStrokes) {
    var sc = parsed.surnameChars.map(function(c) { return getStrokes(c, manualStrokes); });
    var gc = parsed.givenNameChars.map(function(c) { return getStrokes(c, manualStrokes); });

    var surnameTotal = 0;
    var hasUnknown = false;
    var unknownChars = [];

    for (var i = 0; i < sc.length; i++) {
      if (sc[i] < 0) { hasUnknown = true; unknownChars.push(parsed.surnameChars[i]); }
      else surnameTotal += sc[i];
    }
    for (var i = 0; i < gc.length; i++) {
      if (gc[i] < 0) { hasUnknown = true; unknownChars.push(parsed.givenNameChars[i]); }
    }

    var surnameLast = sc[sc.length - 1] > 0 ? sc[sc.length - 1] : 0;
    var given1 = gc.length >= 1 && gc[0] > 0 ? gc[0] : 0;
    var given2 = gc.length >= 2 && gc[1] > 0 ? gc[1] : 0;
    var givenTotal = gc.filter(function(s) { return s > 0; }).reduce(function(a, b) { return a + b; }, 0);

    // 天格: 複姓取姓筆劃總和，單姓則姓筆劃+1
    var tian = parsed.surnameChars.length >= 2 ? surnameTotal : surnameTotal + 1;

    // 人格: 姓最後一字 + 名第一字
    var ren = surnameLast + given1;

    // 地格: 雙名取兩字總和，單名則+1
    var di = parsed.givenNameChars.length >= 2 ? givenTotal : given1 + 1;

    // 外格: 名最後一字+1，或總格-人格+1（雙名）
    var total = surnameTotal + givenTotal;
    var wai = parsed.givenNameChars.length >= 2 ? (given2 || given1) + 1 : given1 + 1;
    // 複姓 + 單名時外格算法微調
    if (parsed.surnameChars.length >= 2 && parsed.givenNameChars.length === 1) {
      wai = given1 + 1;
    }

    // 總格
    var zong = total;

    return {
      tian: tian,
      ren: ren,
      di: di,
      wai: wai,
      zong: zong,
      hasUnknown: hasUnknown,
      unknownChars: unknownChars,
      strokeDetails: {
        surname: sc.map(function(s, i) { return { char: parsed.surnameChars[i], strokes: s }; }),
        givenName: gc.map(function(s, i) { return { char: parsed.givenNameChars[i], strokes: s }; })
      }
    };
  }

  // ============ 81數吉凶查詢 ============

  function getFortune(num) {
    if (num < 1 || num > 81) return null;
    return window.fortune81[num] || null;
  }

  // ============ 三才分析 ============

  function analyzeSancai(wuge) {
    var heavenEl = digitToElement(wuge.tian);
    var personEl = digitToElement(wuge.ren);
    var earthEl = digitToElement(wuge.di);

    var hpRel = elementRelation(heavenEl, personEl);
    var peRel = elementRelation(personEl, earthEl);

    // 三才配置評級
    var level = '大吉';
    var description = '';

    var goodRels = 0;
    if (hpRel === '相生' || hpRel === '被生') goodRels++;
    if (peRel === '相生' || peRel === '被生') goodRels++;
    var badRels = 0;
    if (hpRel === '相剋' || hpRel === '被剋') badRels++;
    if (peRel === '相剋' || peRel === '被剋') badRels++;

    if (goodRels === 2 && badRels === 0) {
      level = '大吉';
      description = '天、人、地三才配置極為優良。天人地相互滋生，運勢亨通順遂，基礎穩固，成功可期。';
    } else if (goodRels === 1 && badRels === 0) {
      level = '吉';
      description = '三才配置良好。整體運勢順遂，雖非極佳，但穩健發展，仍能獲得成功與幸福。';
    } else if (goodRels === 0 && badRels === 0) {
      level = '平';
      description = '三才配置平穩。五行相同或和諧，無明顯衝突但也缺乏互助力量，須靠自身努力。';
    } else if (goodRels >= 1 && badRels >= 1) {
      level = '半吉';
      description = '三才配置吉凶參半。部分配置良好，但亦有衝突之處。需在優勢面多加發揮，劣勢面謹慎應對。';
    } else if (badRels === 1) {
      level = '凶';
      description = '三才配置不佳。五行相剋導致運勢受阻，身體或事業易遇挫折。建議加強內在修養，以德化解。';
    } else {
      level = '大凶';
      description = '三才配置嚴重衝突。天人地相互剋制，可能導致諸事不順、健康受損。宜尋求改名或加強德行修養。';
    }

    return {
      heaven: { element: heavenEl, number: wuge.tian },
      person: { element: personEl, number: wuge.ren },
      earth: { element: earthEl, number: wuge.di },
      relations: {
        heavenPerson: hpRel,
        personEarth: peRel
      },
      level: level,
      description: description
    };
  }

  // ============ 完整分析 ============

  function analyze(fullName, manualStrokes) {
    var parsed = parseChineseName(fullName);
    if (!parsed) return { error: '請輸入有效的中文姓名（至少一個姓和一個名）' };

    var wuge = calcFiveGrids(parsed, manualStrokes);

    var grids = {
      tian: { name: '天格', number: wuge.tian, element: digitToElement(wuge.tian), fortune: getFortune(wuge.tian), meaning: '祖先留傳，影響不大。代表與長輩、上司的關係。' },
      ren: { name: '人格', number: wuge.ren, element: digitToElement(wuge.ren), fortune: getFortune(wuge.ren), meaning: '主運，影響一生最大。代表自我、性格、才能與中心命運。', isMain: true },
      di: { name: '地格', number: wuge.di, element: digitToElement(wuge.di), fortune: getFortune(wuge.di), meaning: '前運，影響青少年時期。代表家庭、子女、下屬關係。' },
      wai: { name: '外格', number: wuge.wai, element: digitToElement(wuge.wai), fortune: getFortune(wuge.wai), meaning: '副運，影響社交與外在。代表與外界、朋友的互動關係。' },
      zong: { name: '總格', number: wuge.zong, element: digitToElement(wuge.zong), fortune: getFortune(wuge.zong), meaning: '後運，影響中晚年。代表一生的總結與最終成就。' }
    };

    var sancai = analyzeSancai(wuge);

    // 整體吉凶統計
    var fortuneCounts = { '大吉': 0, '吉': 0, '中吉': 0, '半吉': 0, '凶': 0, '大凶': 0 };
    var gridKeys = ['tian', 'ren', 'di', 'wai', 'zong'];
    for (var i = 0; i < gridKeys.length; i++) {
      var f = grids[gridKeys[i]].fortune;
      if (f) fortuneCounts[f.glory] = (fortuneCounts[f.glory] || 0) + 1;
    }

    var overall = '吉';
    var goodCount = (fortuneCounts['大吉'] || 0) + (fortuneCounts['吉'] || 0) + (fortuneCounts['中吉'] || 0);
    var badCount = (fortuneCounts['凶'] || 0) + (fortuneCounts['大凶'] || 0);
    if (goodCount >= 4) overall = '大吉';
    else if (goodCount >= 3) overall = '吉';
    else if (goodCount >= 2 && badCount <= 1) overall = '中吉';
    else if (badCount >= 3) overall = '凶';
    else overall = '平';

    return {
      parsed: parsed,
      wuge: wuge,
      grids: grids,
      sancai: sancai,
      overall: overall,
      fortuneCounts: fortuneCounts,
      hasUnknown: wuge.hasUnknown,
      unknownChars: wuge.unknownChars
    };
  }

  // ============ 公開 API ============
  return {
    analyze: analyze,
    digitToElement: digitToElement,
    elementRelation: elementRelation,
    getFortune: getFortune,
    parseChineseName: parseChineseName,
    calcFiveGrids: calcFiveGrids,
    analyzeSancai: analyzeSancai
  };

})();
