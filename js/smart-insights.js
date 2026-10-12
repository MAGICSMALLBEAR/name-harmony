/**
 * 智能總結引擎 — 一句話總結 + 優缺點 + 行動建議 + PK排名
 */
window.SmartInsights = (function() {

  // 英文模式（js/l10n.js）：T 查術語、L 組合句子
  function T(x) { return window.L10N ? window.L10N.t(x) : x; }
  function L(zh, en) { return window.L10N ? window.L10N.L(zh, en) : zh; }

  // ========== 一句話總結 ==========
  function oneLiner(chineseResult, englishResult, zodiacData) {
    var parts = [];
    if (chineseResult) {
      var g = chineseResult.grids.ren;
      var f = g.fortune ? g.fortune.glory : '?';
      var sancai = chineseResult.sancai.level;
      parts.push(L('你的中文名五格為' + chineseResult.overall + '格局', 'Your Chinese name\'s five grids are ' + T(chineseResult.overall).toLowerCase() + ' overall'));
      parts.push(L('人格' + g.number + '劃屬' + g.element + '（' + f + '）', 'Person Grid ' + g.number + ' strokes, ' + T(g.element) + ' (' + T(f).toLowerCase() + ')'));
      parts.push(L('三才配置' + sancai, 'Three Powers ' + T(sancai).toLowerCase()));
      if (zodiacData && zodiacData.zodiac) {
        parts.push(L('生肖' + zodiacData.zodiac + '、日主' + (zodiacData.dayMaster||'?'), 'zodiac ' + T(zodiacData.zodiac) + ', Day Master ' + T(zodiacData.dayMaster || '?')));
      }
    }
    if (englishResult) {
      parts.push(L('英文命運數字' + englishResult.destiny, 'English Destiny Number ' + englishResult.destiny));
    }
    return parts.join(L('，', '; ')) + L('。', '.');
  }

  // ========== 優缺點清單 ==========
  function prosAndCons(chineseResult) {
    if (!chineseResult) return null;
    var pros = [], cons = [];
    var grids = chineseResult.grids;
    var sancai = chineseResult.sancai;

    // 人格
    var ren = grids.ren;
    if (ren.fortune && (ren.fortune.glory==='大吉'||ren.fortune.glory==='吉')) {
      pros.push(L('人格' + ren.number + '劃為吉數，主運亨通，個人能力與運勢俱佳', 'Person Grid ' + ren.number + ' is auspicious: the main fortune flows well, with strong personal ability and luck'));
    } else {
      cons.push(L('人格' + ren.number + '劃為凶數，主運受阻，需多修身養性', 'Person Grid ' + ren.number + ' is inauspicious: the main fortune meets obstacles — focus on self-cultivation'));
    }
    // 三才
    if (sancai.level.indexOf('吉') >= 0) {
      pros.push(L('三才配置' + sancai.level + '，天人地和諧，基礎穩固', 'Three Powers ' + T(sancai.level).toLowerCase() + ': Heaven, Person and Earth in harmony, a solid foundation'));
    } else if (sancai.level === '凶' || sancai.level === '大凶') {
      cons.push(L('三才配置' + sancai.level + '，五行相剋，需注意身心健康', 'Three Powers ' + T(sancai.level).toLowerCase() + ': the phases clash — look after your physical and mental health'));
    }
    // 五行
    var elements = {};
    ['tian','ren','di','wai','zong'].forEach(function(k) {
      var el = grids[k].element;
      elements[el] = (elements[el]||0) + 1;
    });
    var missing = [];
    ['木','火','土','金','水'].forEach(function(el) {
      if (!elements[el]) missing.push(el);
    });
    if (missing.length > 0) {
      cons.push(L('五行缺' + missing.join('、') + '，建議補充對應屬性', 'Missing ' + missing.map(T).join(', ') + ' — consider strengthening these elements'));
    } else {
      pros.push(L('五行俱全，命格均衡發展', 'All five elements present — a balanced pattern'));
    }
    // 總格
    if (grids.zong.fortune && (grids.zong.fortune.glory==='大吉'||grids.zong.fortune.glory==='吉')) {
      pros.push(L('總格吉數，晚年運勢順遂', 'Total Grid is auspicious: later years go smoothly'));
    } else if (grids.zong.fortune && grids.zong.fortune.glory==='凶') {
      cons.push(L('總格凶數，晚年需多加注意', 'Total Grid is inauspicious: take extra care in later years'));
    }

    return { pros: pros, cons: cons };
  }

  // ========== 行動建議卡 ==========
  function actionCard(chineseResult, zodiacData) {
    var actions = [];
    if (!chineseResult) return actions;

    var g = chineseResult.grids;
    var sancai = chineseResult.sancai;

    // 依人格五行
    var el = g.ren.element;
    var elemTips = {
      '木': ['多接近大自然，綠色植物有助運勢','培養耐心與包容心','適合往東發展'],
      '火': ['多穿紅色系衣服增強氣場','保持熱情但控制脾氣','適合往南發展'],
      '土': ['穩健踏實是最大優勢，勿急功近利','多接觸大地色系','適合留在本地發展'],
      '金': ['保持果斷但別太強硬','白色金屬飾品有助運勢','適合往西發展'],
      '水': ['多與人交流，打開資訊管道','藍黑色系能增強智慧運','適合往北發展']
    };
    if (elemTips[el]) actions.push(T(elemTips[el][Math.floor(Math.random()*elemTips[el].length)]));

    // 三才建議
    if (sancai.level === '凶' || sancai.level === '大凶') {
      actions.push(L('三才不順，建議多行善積德、修身養性來化解', 'The Three Powers are out of balance — good deeds and self-cultivation help offset it'));
    }

    // 五行建議
    var elemCount = {};
    ['tian','ren','di','wai','zong'].forEach(function(k) {
      elemCount[g[k].element] = (elemCount[g[k].element]||0) + 1;
    });
    var overMax = Object.keys(elemCount).filter(function(e) { return elemCount[e] >= 3; });
    if (overMax.length) {
      var bal = ({'木':'金','火':'水','土':'木','金':'火','水':'土'})[overMax[0]];
      actions.push(L(overMax[0] + '氣過盛，可用' + bal + '來平衡', 'Too much ' + T(overMax[0]) + ' — balance it with ' + T(bal)));
    }

    return actions;
  }

  // ========== 關係一句話 ==========
  function relationshipOneLiner(pairResult) {
    if (!pairResult) return '';
    var s = pairResult.score;
    var t = pairResult.tier;
    var prefix = '';
    if (s >= 80) prefix = L('天作之合！', 'A perfect match! ');
    else if (s >= 65) prefix = L('相當契合，', 'A strong fit — ');
    else if (s >= 50) prefix = L('中規中矩，', 'A middling fit — ');
    else prefix = L('需要努力，', 'Needs work — ');
    var first = pairResult.dimensions && pairResult.dimensions[0] ? T(pairResult.dimensions[0].detail) : '';
    return prefix + L('你們的' + pairResult.mode + '得分' + s + '分（' + t + '）。', 'your ' + T(pairResult.mode) + ' score is ' + s + ' (' + T(t) + '). ') +
      (first ? first.substring(0, L(40, 90)) + '...' : '');
  }

  // ========== 關係改善指南 ==========
  /** @return [{ text, good }]：good 為強項（保持），否則為待加強 */
  function relationshipTips(pairResult) {
    if (!pairResult || !pairResult.dimensions) return [];
    var tips = [];
    pairResult.dimensions.forEach(function(d) {
      var pct = d.score / d.max;
      // 標籤是「表情符號 + 空白 + 名稱」；表情符號多為兩個 UTF-16 單元，不能用字元類別逐一去掉
      var label = d.label.replace(/^\S+\s+/, '');
      if (pct < 0.5) tips.push({ good: false, text: L('加強' + label + '：得分偏低，建議多溝通磨合', 'Work on ' + label + ': a low score — talk more and adjust to each other') });
      if (pct >= 0.8) tips.push({ good: true, text: L('保持' + label + '：這是你們的強項，繼續維持', 'Keep up ' + label + ': this is a strength — keep it going') });
    });
    if (!tips.length) tips.push({ good: true, text: L('各方面均衡發展，持續保持良好互動', 'Balanced across the board — keep up the good interaction') });
    return tips;
  }

  // ========== 名字 PK 排名 ==========
  function rankNames(surname, candidateNames) {
    if (!surname || !candidateNames || !candidateNames.length || !window.ChineseNumerology) return [];
    var results = [];
    candidateNames.forEach(function(name) {
      var full = surname + name;
      var r = window.ChineseNumerology.analyze(full);
      if (r.error || (r.unknownChars && r.unknownChars.length)) return; // 筆劃庫沒有的字無法計算
      var good = (r.fortuneCounts['大吉']||0)+(r.fortuneCounts['吉']||0)+(r.fortuneCounts['中吉']||0);
      var bad = (r.fortuneCounts['凶']||0)+(r.fortuneCounts['大凶']||0);
      results.push({
        name: full,
        score: good * 20 - bad * 20 + 50,
        good: good, bad: bad,
        ren: r.grids.ren.number + '劃 ' + r.grids.ren.element,
        renGlory: r.grids.ren.fortune ? r.grids.ren.fortune.glory : '?',
        sancai: r.sancai.level,
        overall: r.overall
      });
    });
    results.sort(function(a, b) { return b.score - a.score; });
    return results;
  }

  return {
    oneLiner: oneLiner,
    prosAndCons: prosAndCons,
    actionCard: actionCard,
    relationshipOneLiner: relationshipOneLiner,
    relationshipTips: relationshipTips,
    rankNames: rankNames
  };
})();
