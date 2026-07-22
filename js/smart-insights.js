/**
 * 智能總結引擎 — 一句話總結 + 優缺點 + 行動建議 + PK排名
 */
window.SmartInsights = (function() {

  // ========== 一句話總結 ==========
  function oneLiner(chineseResult, englishResult, zodiacData) {
    var parts = [];
    if (chineseResult) {
      var g = chineseResult.grids.ren;
      var f = g.fortune ? g.fortune.glory : '?';
      var sancai = chineseResult.sancai.level;
      parts.push('你的中文名五格為' + chineseResult.overall + '格局');
      parts.push('人格' + g.number + '劃屬' + g.element + '（' + f + '）');
      parts.push('三才配置' + sancai);
      if (zodiacData && zodiacData.zodiac) {
        parts.push('生肖' + zodiacData.zodiac + '、日主' + (zodiacData.dayMaster||'?'));
      }
    }
    if (englishResult) {
      parts.push('英文命運數字' + englishResult.destiny + '。');
    }
    return parts.join('，') + '。';
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
      pros.push('人格' + ren.number + '劃為吉數，主運亨通，個人能力與運勢俱佳');
    } else {
      cons.push('人格' + ren.number + '劃為凶數，主運受阻，需多修身養性');
    }
    // 三才
    if (sancai.level.indexOf('吉') >= 0) {
      pros.push('三才配置' + sancai.level + '，天人地和諧，基礎穩固');
    } else if (sancai.level === '凶' || sancai.level === '大凶') {
      cons.push('三才配置' + sancai.level + '，五行相剋，需注意身心健康');
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
      cons.push('五行缺' + missing.join('、') + '，建議補充對應屬性');
    } else {
      pros.push('五行俱全，命格均衡發展');
    }
    // 總格
    if (grids.zong.fortune && (grids.zong.fortune.glory==='大吉'||grids.zong.fortune.glory==='吉')) {
      pros.push('總格吉數，晚年運勢順遂');
    } else if (grids.zong.fortune && grids.zong.fortune.glory==='凶') {
      cons.push('總格凶數，晚年需多加注意');
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
    if (elemTips[el]) actions.push(elemTips[el][Math.floor(Math.random()*elemTips[el].length)]);

    // 三才建議
    if (sancai.level === '凶' || sancai.level === '大凶') {
      actions.push('三才不順，建議多行善積德、修身養性來化解');
    }

    // 五行建議
    var elemCount = {};
    ['tian','ren','di','wai','zong'].forEach(function(k) {
      elemCount[g[k].element] = (elemCount[g[k].element]||0) + 1;
    });
    var overMax = Object.keys(elemCount).filter(function(e) { return elemCount[e] >= 3; });
    if (overMax.length) actions.push(overMax[0] + '氣過盛，可用' + ({'木':'金','火':'水','土':'木','金':'火','水':'土'})[overMax[0]] + '來平衡');

    return actions;
  }

  // ========== 關係一句話 ==========
  function relationshipOneLiner(pairResult) {
    if (!pairResult) return '';
    var s = pairResult.score;
    var t = pairResult.tier;
    var prefix = '';
    if (s >= 80) prefix = '天作之合！';
    else if (s >= 65) prefix = '相當契合，';
    else if (s >= 50) prefix = '中規中矩，';
    else prefix = '需要努力，';
    return prefix + '你們的' + pairResult.mode + '得分' + s + '分（' + t + '）。' +
      (pairResult.dimensions && pairResult.dimensions[0] ? pairResult.dimensions[0].detail.substring(0,40) + '...' : '');
  }

  // ========== 關係改善指南 ==========
  function relationshipTips(pairResult) {
    if (!pairResult || !pairResult.dimensions) return [];
    var tips = [];
    pairResult.dimensions.forEach(function(d) {
      var pct = d.score / d.max;
      if (pct < 0.5) tips.push('加強' + d.label.replace(/[🎭🎯🏠🌐🔢🩸🐉]/g,'') + '：得分偏低，建議多溝通磨合');
      if (pct >= 0.8) tips.push('保持' + d.label.replace(/[🎭🎯🏠🌐🔢🩸🐉]/g,'') + '：這是你們的強項，繼續維持');
    });
    if (!tips.length) tips.push('各方面均衡發展，持續保持良好互動');
    return tips;
  }

  // ========== 名字 PK 排名 ==========
  function rankNames(surname, candidateNames, gender) {
    if (!surname || !candidateNames || !candidateNames.length || !window.ChineseNumerology) return [];
    var results = [];
    candidateNames.forEach(function(name) {
      var full = surname + name;
      var r = window.ChineseNumerology.analyze(full);
      if (r.error) return;
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
