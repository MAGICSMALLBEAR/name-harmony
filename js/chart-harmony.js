/** 命盤和盤：各系統獨立呈現；分數是可解釋的經驗權重，不代表事件機率。 */
window.ChartHarmony = (function() {
  'use strict';
  function L(z, e) { return window.L10N ? window.L10N.L(z, e) : z; }
  function T(s) { return window.L10N ? window.L10N.t(s) : s; }
  function G(s) { return window.L10N ? window.L10N.ganzhi(s) : s; }
  function Z(s) { return window.L10N ? window.L10N.tn('zw', s) : s; }
  function clamp(n) { return Math.max(0, Math.min(100, Math.round(n))); }
  function mean(a, fallback) { return a.length ? a.reduce(function(s, v) { return s + v; }, 0) / a.length : fallback; }
  var MODES = {
    general: { zh: '一般關係', en: 'General', weights: [30, 20, 25, 25], advice: ['先確認彼此的期待，再討論互補與差異。', 'Start by agreeing on expectations, then discuss strengths and differences.'] },
    romantic: { zh: '情侶', en: 'Dating', weights: [30, 15, 20, 35], advice: ['討論情緒表達、相處頻率與個人空間。', 'Discuss emotional expression, time together and personal space.'] },
    spouses: { zh: '夫妻', en: 'Marriage', weights: [25, 10, 25, 40], advice: ['先約定家務、共同支出與衝突後的修復方式。', 'Agree on chores, shared expenses and how to reconnect after conflict.'] },
    parentchild: { zh: '親子', en: 'Parent and child', weights: [40, 10, 30, 20], advice: ['依孩子的年齡調整溝通，避免用分數替孩子貼標籤。', 'Adapt communication to the child\'s age and avoid labelling them by a score.'] },
    friends: { zh: '朋友', en: 'Friendship', weights: [25, 30, 25, 20], advice: ['確認聯絡頻率與互相幫忙的界線，保留各自生活。', 'Agree on contact and boundaries around helping, with room for separate lives.'] },
    business: { zh: '合夥人', en: 'Business partners', weights: [35, 30, 25, 10], advice: ['把決策權、分工、財務與退出條件寫清楚。', 'Write down decision rights, responsibilities, finances and exit terms.'] }
  };
  // 各系統維度不同，不能把八字「天干」的權重直接當成占星「情感」權重。
  var SYSTEM_WEIGHTS = {
    '占星合盤': {general:[25,30,25,20],romantic:[20,40,15,25],spouses:[20,35,20,25],parentchild:[35,30,20,15],friends:[40,20,20,20],business:[35,10,40,15]},
    '紫微合盤': {general:[15,25,15,20,25],romantic:[15,25,15,20,25],spouses:[10,25,15,25,25],parentchild:[15,20,15,25,25],friends:[15,20,20,20,25],business:[15,20,15,25,25]}
  };
  function modeKey(k) { return Object.prototype.hasOwnProperty.call(MODES, k) ? k : 'general'; }
  function modeName(k) { var m = MODES[modeKey(k)]; return L(m.zh, m.en); }
  function options(k) { return Object.keys(MODES).map(function(id) { return { id: id, label: modeName(id), selected: id === modeKey(k) }; }); }
  function note() { return L('分數依本站經驗規則與關係權重計算，並非科學驗證或關係成敗機率。', 'Scores use this app\'s heuristic rules and relationship weights; they are not scientifically validated or a probability of relationship success.'); }
  function finish(mode, modeEn, dims, k, summary, extra) {
    k = modeKey(k);
    var weights = SYSTEM_WEIGHTS[mode] ? SYSTEM_WEIGHTS[mode][k] : MODES[k].weights;
    var totalWeight = dims.reduce(function(s,d,i) { return s + weights[d.slot == null ? i : d.slot]; },0);
    var usedWeight = 0;
    dims.forEach(function(d, i) {
      d.max = 100; d.score = clamp(d.score);
      d.weight = i === dims.length - 1 ? 100 - usedWeight : Math.round(weights[d.slot == null ? i : d.slot] / totalWeight * 100);
      usedWeight += d.weight;
    });
    var score = clamp(dims.reduce(function(s, d) { return s + d.score * d.weight / 100; }, 0));
    var w = dims.map(function(d) { return d.label + ' ' + d.weight + '%'; }).join(L('、', ', '));
    return Object.assign({
      mode: mode, modeClass: 'mode-chart', score: score, rawScore: score, maxRawScore: 100,
      tier: window.PairHarmony.getTier(score), tierDesc: note(), dimensions: dims, relationship: k,
      reading: { summary: summary + '\n\n' + L('關係模式：', 'Relationship: ') + modeName(k) + '\n' + w + '\n' +
        L.apply(null, MODES[k].advice) + '\n' + note() }
    }, extra || {});
  }
  // 既有姓名分數一般模式維持原算法；指定情境時才按維度重算。
  function namePair(pair, kind, k) {
    if (!pair || modeKey(k) === 'general') return pair;
    k = modeKey(k);
    var weights = {
      'cn-cn': { romantic: [35,15,25,5,20], spouses: [25,15,35,5,20], parentchild: [35,10,35,5,15], friends: [30,15,15,25,15], business: [25,30,10,25,10] },
      'en-en': { romantic: [20,40,25,15], spouses: [25,35,25,15], parentchild: [20,35,30,15], friends: [20,25,40,15], business: [40,15,30,15] },
      'cn-en': { romantic: [25,35,25,15], spouses: [30,30,25,15], parentchild: [35,25,25,15], friends: [25,25,35,15], business: [40,15,30,15] }
    };
    var ws = weights[kind] && weights[kind][k];
    if (!ws || pair.dimensions.length !== ws.length) return pair;
    pair.dimensions = pair.dimensions.map(function(d, i) { return Object.assign({}, d, { weight: ws[i] }); });
    pair.score = clamp(pair.dimensions.reduce(function(s, d) { return s + clamp(d.score / d.max * 100) * d.weight / 100; }, 0));
    pair.rawScore = pair.score; pair.maxRawScore = 100;
    pair.tier = window.PairHarmony.getTier(pair.score);
    pair.tierDesc = note();
    // 原摘要含原分數與評級，情境加權後改用新摘要，避免互相矛盾。
    pair.reading = { summary: L('此為', 'This is a ') + modeName(k) + L('模式的姓名配對；分數依各維度加權。', ' name pairing, weighted by dimension.') + '\n' +
      pair.dimensions.map(function(d) { return d.label + ' ' + d.weight + '%'; }).join(L('、', ', ')) + '\n' + L.apply(null, MODES[k].advice) + '\n' + note() };
    pair.relationship = k;
    return pair;
  }

  var STEM_COMB = ['甲己', '乙庚', '丙辛', '丁壬', '戊癸'];
  var STEM_CLASH = ['甲庚', '乙辛', '丙壬', '丁癸'];
  var BRANCH_RULES = [
    { zh: '六合', en: 'six harmony', pairs: ['子丑','寅亥','卯戌','辰酉','巳申','午未'], delta: 20 },
    { zh: '沖', en: 'clash', pairs: ['子午','丑未','寅申','卯酉','辰戌','巳亥'], delta: -25 },
    { zh: '刑', en: 'punishment interaction', pairs: ['子卯','寅巳','巳申','申寅','丑戌','戌未','未丑'], delta: -15 },
    { zh: '害', en: 'harm interaction', pairs: ['子未','丑午','寅巳','卯辰','申亥','酉戌'], delta: -15 },
    { zh: '破', en: 'break interaction', pairs: ['子酉','丑辰','寅亥','卯午','巳申','未戌'], delta: -10 }
  ];
  function inPairs(a, b, list) { return list.indexOf(a + b) >= 0 || list.indexOf(b + a) >= 0; }
  function branchRelations(a, b) {
    return BRANCH_RULES.filter(function(r) { return inPairs(a, b, r.pairs); }).map(function(r) { return { type: r.zh, label: L(r.zh, r.en), delta: r.delta }; });
  }
  function pillars(b) { return b.pillars.filter(function(p) { return p.tg !== '?' && p.dz !== '?'; }); }
  function support(from, toXY) {
    var total = Object.keys(from.score).reduce(function(s, e) { return s + from.score[e]; }, 0);
    if (!total) return 50;
    return clamp(50 + 50 * toXY.favorable.reduce(function(s, e) { return s + from.score[e]; }, 0) / total -
      35 * toXY.unfavorable.reduce(function(s, e) { return s + from.score[e]; }, 0) / total);
  }
  function baziPair(a, b, k) {
    if (!a || !b || !a.pillars || !b.pillars) return null;
    var A = pillars(a), B = pillars(b), xa = window.ZodiacBazi.xiYongShen(a), xb = window.ZodiacBazi.xiYongShen(b);
    var ab = support(xa, xb), ba = support(xb, xa), stemHits = [], branchHits = [], ss = [], bs = [];
    A.forEach(function(p) { B.forEach(function(q) {
      var prefix = T(p.name) + ' ' + G(p.tg + p.dz) + ' ↔ ' + T(q.name) + ' ' + G(q.tg + q.dz) + ': ';
      var st = 60;
      if (inPairs(p.tg, q.tg, STEM_COMB)) { stemHits.push(prefix + L('天干五合', 'stem combination')); st += 20; }
      if (inPairs(p.tg, q.tg, STEM_CLASH)) { stemHits.push(prefix + L('天干沖', 'stem clash')); st -= 25; }
      ss.push(st);
      var relations = branchRelations(p.dz, q.dz);
      relations.forEach(function(r) { branchHits.push(prefix + r.label); });
      bs.push(clamp(60 + relations.reduce(function(s, r) { return s + r.delta; }, 0)));
    }); });
    var groupHits = [];
    [['三合', 'three-harmony group', ['申子辰','亥卯未','寅午戌','巳酉丑']], ['三會', 'seasonal group', ['寅卯辰','巳午未','申酉戌','亥子丑']]].forEach(function(set) {
      set[2].forEach(function(g) {
        var chars = g.split(''), all = A.concat(B).map(function(p) { return p.dz; });
        if (chars.every(function(c) { return all.indexOf(c) >= 0; }) &&
            A.some(function(p) { return chars.indexOf(p.dz) >= 0; }) && B.some(function(p) { return chars.indexOf(p.dz) >= 0; }) &&
            ![A,B].some(function(ps) { return chars.every(function(c) { return ps.some(function(p) { return p.dz === c; }); }); })) {
          groupHits.push(G(g) + ' ' + L(set[0], set[1]));
        }
      });
    });
    var day = branchRelations(a.pillars[2].dz, b.pillars[2].dz);
    var dayScore = clamp(60 + day.reduce(function(s, r) { return s + r.delta; }, 0));
    var coverage = A.length + B.length;
    var summary = L('雙方四柱：', 'Four Pillars: ') + '\nA: ' + a.pillars.map(function(p) { return G(p.tg + p.dz); }).join(' / ') +
      '\nB: ' + b.pillars.map(function(p) { return G(p.tg + p.dz); }).join(' / ') + '\n' +
      L('有效柱數 ', 'Available pillars: ') + coverage + '/8' + (coverage < 8 ? L('；未填時辰者不計時柱，結果為部分資料。', '; missing birth times mean the Hour Pillar is excluded. This is a partial reading.') : '') + '\n' +
      L('喜用神採簡化扶抑法；合、刑與三合三會僅列跨盤互動，不判成局或合化。', 'Favourable elements use a simplified strength model. Combinations, punishments and groups flag cross-chart interactions; no formation or transformation is assumed.');
    return finish('八字合盤', 'BaZi pairing', [
      { id: 'support', label: L('🌿 喜用互補', '🌿 Element support'), score: mean([ab,ba]), detail: L('A 對 B：', 'A to B: ') + ab + '/100; ' + L('B 對 A：', 'B to A: ') + ba + '/100. ' +
        L('A 喜用 ', 'A favours ') + xa.favorable.map(T).join('/') + '; ' + L('B 喜用 ', 'B favours ') + xb.favorable.map(T).join('/') + '. ' +
        L('日干十神：A 看 B 為', 'Day-stem roles: B from A\'s view: ') + T(window.ZodiacBazi.calcShiShen(a.dayMasterTG,b.dayMasterTG)) +
        L('，B 看 A 為', '; A from B\'s view: ') + T(window.ZodiacBazi.calcShiShen(b.dayMasterTG,a.dayMasterTG)) },
      { id: 'stems', label: L('☯ 天干互動', '☯ Stem interactions'), score: mean(ss,60), detail: stemHits.join('; ') || L('未見跨盤五合或天干沖；無互動的組合以中性基準計。', 'No cross-chart stem combination or clash; unmatched pairs use a neutral baseline.') },
      { id: 'branches', label: L('🔗 地支互動', '🔗 Branch interactions'), score: mean(bs,60), detail: branchHits.concat(groupHits).join('; ') || L('未見跨盤六合、沖、刑、害、破或跨盤湊齊的三合三會。', 'No cross-chart branch harmony, clash, punishment, harm, break or completed cross-chart group.') },
      { id: 'daily', label: L('🏠 日支相處', '🏠 Day-branch interaction'), score: dayScore, detail: G(a.pillars[2].dz) + ' ↔ ' + G(b.pillars[2].dz) + ': ' +
        (day.length ? day.map(function(r) { return r.label; }).join(', ') : L('無上述直接互動', 'none of the listed direct interactions')) + L('。以日支觀察日常相處；親子或合作模式不將此稱為夫妻宮。', '. Day branches are used as a cue for everyday interaction, without assuming a romantic relationship.') }
    ], k, summary, { coverage: coverage, directionalSupport: { aToB: ab, bToA: ba }, stemHits: stemHits, branchHits: branchHits, groups: groupHits });
  }

  // 占星比較盤：只比較 A 與 B 的行星，不混入各自本命相位。
  var ASPECTS = [
    { type:'合相', en:'conjunction', angle:0, orb:8, value:65 },
    { type:'六合相', en:'sextile', angle:60, orb:5, value:80 },
    { type:'四分相', en:'square', angle:90, orb:7, value:35 },
    { type:'三合相', en:'trine', angle:120, orb:7, value:85 },
    { type:'對分相', en:'opposition', angle:180, orb:8, value:40 }
  ];
  function norm(x) { return ((x % 360) + 360) % 360; }
  function separation(a,b) { var d = norm(a-b); return Math.min(d,360-d); }
  function midpoint(a,b) { return Math.abs(separation(a,b)-180) < 1e-8 ? null : norm(a + (norm(b-a+180)-180)/2); }
  function validPlanets(chart) { return chart.planets.filter(function(p) { return Number.isFinite(p.lon) && (chart.timeKnown || p.name !== '月亮'); }); }
  function synastry(a,b) {
    var out = [];
    validPlanets(a).forEach(function(p) { validPlanets(b).forEach(function(q) {
      var sep = separation(p.lon,q.lon);
      var def = ASPECTS.filter(function(d) { return Math.abs(sep-d.angle) <= d.orb; })[0];
      if (def) out.push({ a:p.name, b:q.name, type:def.type, label:L(def.type,def.en), orb:Math.round(Math.abs(sep-def.angle)*100)/100,
        score:50+(def.value-50)*(1-Math.abs(sep-def.angle)/(def.orb+1)) });
    }); });
    return out.sort(function(x,y) { return x.orb-y.orb || x.a.localeCompare(y.a) || x.b.localeCompare(y.b); });
  }
  function houseOverlays(source,target,side) {
    if (!target.timeKnown || !target.ascendant) return [];
    var first = Math.floor(norm(target.ascendant.lon)/30);
    return validPlanets(source).map(function(p) {
      return { side:side, planet:p.name, house:(Math.floor(norm(p.lon)/30)-first+12)%12+1 };
    });
  }
  function astrologyPair(a,b,k) {
    if (!a || !b || !a.planets || !b.planets) return null;
    var aspects = synastry(a,b), overlays = houseOverlays(a,b,'A → B').concat(houseOverlays(b,a,'B → A'));
    var compChart = window.Astrology && window.Astrology.getCompositeChart ? window.Astrology.getCompositeChart(a, b) : null;
    var composite = [];
    if (compChart) {
      composite = compChart.planets.map(function(p) { return { planet: p.name, lon: p.lon, sign: p.sign, degree: p.degree, house: p.house }; });
    } else {
      validPlanets(a).forEach(function(p) {
        var q = validPlanets(b).filter(function(x) { return x.name === p.name; })[0];
        if (q) composite.push({ planet:p.name, lon:midpoint(p.lon,q.lon) });
      });
    }
    function aspectText(xs) {
      return xs.map(function(x) { return 'A ' + T(x.a) + ' ↔ B ' + T(x.b) + ': ' + x.label + ' (' + L('容許度 ', 'orb ') + x.orb + '°)'; }).join('; ') ||
        L('本類別在設定容許度內沒有相位，採中性 50 分。', 'No aspects in this category fall within the set orbs; the neutral score is 50.');
    }
    var communication = aspects.filter(function(x) { return x.a === '水星' || x.b === '水星'; });
    var emotional = aspects.filter(function(x) { return ['太陽','月亮','金星'].indexOf(x.a) >= 0 && ['太陽','月亮','金星'].indexOf(x.b) >= 0; });
    var action = aspects.filter(function(x) { return ['火星','木星','土星'].indexOf(x.a) >= 0 || ['火星','木星','土星'].indexOf(x.b) >= 0; });
    var dims = [
      { slot:0, id:'communication',label:L('🗣️ 溝通相位','🗣️ Communication aspects'),score:mean(communication.map(function(x) { return x.score; }),50),detail:aspectText(communication) },
      { slot:1, id:'emotion',label:L('💖 情感相位','💖 Emotional aspects'),score:mean(emotional.map(function(x) { return x.score; }),50),detail:aspectText(emotional) },
      { slot:2, id:'action',label:L('🎯 行動與責任','🎯 Action and responsibility'),score:mean(action.map(function(x) { return x.score; }),50),detail:aspectText(action) }
    ];
    var houses = { general:[1,3,7,11],romantic:[5,7,8],spouses:[4,7,8],parentchild:[4,5,9],friends:[3,9,11],business:[2,6,10,11] }[modeKey(k)];
    var personalOverlays = overlays.filter(function(x) { return ['太陽','月亮','水星','金星','火星'].indexOf(x.planet)>=0; });
    if (personalOverlays.length) dims.push({ slot:3,id:'houses',label:L('🏠 雙向落宮','🏠 House overlays'),
      score:50+30*personalOverlays.filter(function(x) { return houses.indexOf(x.house)>=0; }).length/personalOverlays.length,
      detail:overlays.map(function(x) { return x.side+' '+T(x.planet)+' '+L('落第','in house ')+x.house+L('宮',''); }).join('; ')+
        L('。採整宮制；所選關係重點宮為 ',' (Whole Sign). Focus houses for this relationship: ')+houses.join('/') });
    var unknown = !a.timeKnown || !b.timeKnown;
    var compHeader = compChart
      ? L('組合盤（短弧中點・' + compChart.houseSystem + '，主導元素：' + compChart.dominantElement + '）：',
          'Composite chart (short-arc midpoints · ' + compChart.houseSystem + ', dominant element: ' + T(compChart.dominantElement) + '):') +
        (compChart.ascendant ? '\n' + L('組合上升：', 'Composite Ascendant: ') + T(compChart.ascendant.sign.n) + ' ' + compChart.ascendant.degree : '')
      : L('組合盤（同名行星短弧中點）：','Composite positions (short-arc midpoints of matching planets):');
    var compAspLine = compChart && compChart.aspects && compChart.aspects.length
      ? '\n' + L('組合盤相位（共 ' + compChart.aspects.length + ' 組）：', 'Composite aspects (' + compChart.aspects.length + ' total): ') +
        compChart.aspects.slice(0, 6).map(function(x) {
          return T(x.p1) + ' × ' + T(x.p2) + ' ' + T(x.type) + ' (' + x.orb + '°)';
        }).join('; ')
      : '';
    var summary = L('跨盤相位 ', 'Cross-chart aspects: ')+aspects.length+L(' 組。','.')+'\n'+
      (unknown ? L('缺時辰的一方以正午估算，排除該方月亮、上升與接收落宮；其他行星位置仍有時間誤差。', 'For a person without a birth time, noon is used and their Moon, Ascendant and receiving houses are excluded; other planet positions still carry timing uncertainty.') : L('雙方已填時辰，使用實際出生地與時區。', 'Both birth times are available; actual birthplaces and time zones are used.'))+'\n'+
      compHeader+'\n'+
      composite.map(function(p) { return T(p.planet)+': '+(p.lon == null ? L('正好對分，中點有二義性，略過','exact opposition: midpoint ambiguous, omitted') :
        T(window.Astrology.SIGNS[Math.floor(p.lon/30)].n)+' '+(p.lon%30).toFixed(2)+'°' + (p.house ? ' · ' + T(p.house.n.split(' ')[0]) : '')); }).join('; ')+
      compAspLine+'\n'+
      L('合相依中性融合計；和諧相位較高、挑戰相位較低，越接近容許度邊緣越回到中性。未取得的宮位不計分，其他維度重新分配權重。', 'Conjunctions use a neutral blending value. Harmonious aspects score higher and challenging aspects lower; wider orbs approach neutral. Unavailable houses are omitted and remaining weights are normalized.');
    return finish('占星合盤','Astrology pairing',dims,k,summary,{aspects:aspects,overlays:overlays,composite:composite,compositeChart:compChart,partial:unknown});
  }

  var GEN = {'木':'火','火':'土','土':'金','金':'水','水':'木'};
  var CTRL = {'木':'土','火':'金','土':'水','金':'木','水':'火'};
  function elementFit(a,b) { return a===b ? 70 : GEN[a]===b || GEN[b]===a ? 80 : CTRL[a]===b || CTRL[b]===a ? 45 : 50; }
  function focusPalaces(k) {
    return {general:['命宮','福德宮','遷移宮'],romantic:['夫妻宮','福德宮'],spouses:['夫妻宮','田宅宮','福德宮'],
      parentchild:['父母宮','子女宮'],friends:['交友宮','福德宮'],business:['官祿宮','財帛宮','交友宮']}[modeKey(k)];
  }
  function ziweiPair(a,b,k) {
    if (!a || !b || a.needHour || b.needHour || !a.palaces || !b.palaces) return null;
    var focus = focusPalaces(k), transfers = [];
    // 生年干四化投射法：找對方盤上同名星的實際安星宮，不把空宮借星當成第二顆星。
    function project(from,to,side) {
      from.sihua.list.forEach(function(s) {
        var dest = to.palaces.filter(function(p) { return (!p.borrowed && p.stars.indexOf(s.star)>=0) || p.minorStars.indexOf(s.star)>=0; })[0];
        if (dest) transfers.push({side:side,star:s.star,type:s.type,palace:dest.name,focus:focus.indexOf(dest.name)>=0});
      });
    }
    project(a,b,'A → B'); project(b,a,'B → A');
    var overlayAB = b.palaces.filter(function(p) { return p.pos===a.mingPalace.pos; })[0];
    var overlayBA = a.palaces.filter(function(p) { return p.pos===b.mingPalace.pos; })[0];
    var pscore = function(p) { return focus.indexOf(p.name)>=0 ? 80 : 60; };
    var ausp = ['文昌','文曲','左輔','右弼','天魁','天鉞','祿存'], hard = ['擎羊','陀羅','火星','鈴星','地空','地劫'];
    var focusDetails = [], focusScores = [];
    [a,b].forEach(function(chart,i) {
      chart.palaces.filter(function(p) { return focus.indexOf(p.name)>=0; }).forEach(function(p) {
        var good = p.minorStars.filter(function(s) { return ausp.indexOf(s)>=0; });
        var bad = p.minorStars.filter(function(s) { return hard.indexOf(s)>=0; });
        focusScores.push(clamp(60+5*good.length-5*bad.length));
        focusDetails.push((i?'B ':'A ')+Z(p.name)+': '+p.stars.map(Z).join('/')+(p.borrowed?L('（借對宮）',' (borrowed)'):'')+
          '; '+L('吉曜 ','supporting stars ')+good.length+', '+L('煞曜 ','challenging stars ')+bad.length);
      });
    });
    var transferText = transfers.map(function(s) {
      return s.side+' '+Z(s.star)+' '+Z(s.type)+' → '+Z(s.palace)+': '+window.ZiweiReading.sihuaIn(s.type,s.palace);
    }).join('; ');
    var flying = window.ZiweiFlying ? window.ZiweiFlying.pairAnalyze(a, b, modeKey(k)) : null;
    var dims = [
      {id:'ming',slot:0,label:L('🌿 命宮五行','🌿 Life Palace elements'),score:elementFit(a.mingEle,b.mingEle),detail:T(a.mingEle)+' ↔ '+T(b.mingEle)+L('；相同 70、相生 80、相剋 45。主星五行取命宮第一主星，空宮沿用借星。','; same element 70, generating 80, controlling 45. Uses the first Life Palace main star, including a borrowed star when empty.')},
      {id:'transformations',slot:1,label:L('✨ 雙向四化','✨ Mutual transformations'),score:mean(transfers.map(function(s) {return clamp(60+({'化祿':15,'化權':5,'化科':15,'化忌':-20}[s.type])*(s.focus?1.5:1));}),60),detail:transferText},
      {id:'overlay',slot:2,label:L('🔗 命宮疊宮','🔗 Life Palace overlays'),score:mean([pscore(overlayAB),pscore(overlayBA)]),detail:'A → B: '+Z(overlayAB.name)+'; B → A: '+Z(overlayBA.name)+L('。命宮地支落對方的重點宮計 80，其他宮計 60。','. A Life Palace in the other person\'s focus palace scores 80; other palaces score 60.')},
      {id:'focus',slot:3,label:L('🏠 關係重點宮','🏠 Relationship focus palaces'),score:mean(focusScores,60),detail:focusDetails.join('; ')}
    ];
    var flyingSummaryLine = '';
    if (flying) {
      var formatFly = function(r) {
        return r.side+' '+Z(r.fromPalace)+'('+G(r.fromStem)+') '+Z(r.star)+' '+Z(r.type)+' → '+Z(r.toPalace)+(r.note?' ['+r.note+']':'');
      };
      var isKey = function(r) { return r.fromPalace==='命宮' || r.inCore || r.clashesCore; };
      var abKey = flying.aToB.filter(isKey), baKey = flying.bToA.filter(isKey);
      var flyRows = (abKey.length ? abKey : flying.aToB).slice(0, 6).concat((baKey.length ? baKey : flying.bToA).slice(0, 6));
      var flyDetail = (flying.insights.length ? flying.insights.map(function(x) { return x.text; }).join(' ') + ' ' : '') +
        flyRows.map(formatFly).join('; ');
      dims.push({id:'flying',slot:4,label:L('🕊️ 宮干飛化交互','🕊️ Flying-star interactions'),score:flying.score,detail:flyDetail});
      flyingSummaryLine = flying.insights.length ? '\n' + flying.insights.map(function(x) { return '• ' + x.text; }).join('\n') : '';
    }
    var summary = L('採生年干四化投射法、十二宮宮干飛化交互與同地支宮位疊盤。各流派合盤方法不同，分數僅作結構化參考。', 'Uses birth-year stem projection, palace-stem flying-transformation interactions, and matching earthly-branch overlays. Schools differ; scores are structured heuristics.')+'\n'+
      'A: '+Z(a.mingPalace.name)+' '+a.mingPalace.stars.map(Z).join('/')+'; B: '+Z(b.mingPalace.name)+' '+b.mingPalace.stars.map(Z).join('/')+'\n'+
      L('重點宮：','Focus palaces: ')+focus.map(Z).join('/')+'\n'+
      L('四化以 60 分為基準，祿、科加 15，權加 5，忌減 20；落入重點宮的變化乘 1.5。重點宮以吉曜每顆加 5、煞曜每顆減 5 作觀察。', 'Transformations use a baseline of 60: Lu/Ke +15, Quan +5, Ji -20, with changes multiplied by 1.5 in focus palaces. Focus-palace supporting/challenging stars add/subtract 5 each.')+
      flyingSummaryLine;
    return finish('紫微合盤','Zi Wei pairing',dims,k,summary,{transfers:transfers,focus:focus,flying:flying});
  }

  return { baziPair:baziPair, branchRelations:branchRelations, namePair:namePair, modeKey:modeKey, modeName:modeName, options:options,
    astrologyPair:astrologyPair, synastry:synastry, midpoint:midpoint, ziweiPair:ziweiPair };
})();
