/**
 * 紫微斗數宮干飛化與自化引擎
 * - 十二宮宮干四化（含離心自化、對宮向心自化、逢生年四化與忌沖對宮）
 * - 十二宮飛化路徑圖（互動式 SVG 方盤）
 * - 雙人宮干飛化交互解讀與跨盤飛化路徑圖
 */
window.ZiweiFlying = (function() {
  'use strict';

  function L(zh, en) { return window.L10N ? window.L10N.L(zh, en) : zh; }
  function T(s) { return window.L10N ? window.L10N.t(s) : s; }
  function Z(s) { return window.L10N ? window.L10N.tn('zw', s) : s; }
  function GZ(s) { return window.L10N ? window.L10N.ganzhi(s) : s; }

  var SIHUA_TYPES = ['化祿', '化權', '化科', '化忌'];
  var TYPE_META = {
    '化祿': { shortZh: '祿', shortEn: 'Lu', color: '#2ecc71', delta: 16 },
    '化權': { shortZh: '權', shortEn: 'Quan', color: '#f39c12', delta: 6 },
    '化科': { shortZh: '科', shortEn: 'Ke', color: '#5dade2', delta: 12 },
    '化忌': { shortZh: '忌', shortEn: 'Ji', color: '#e74c3c', delta: -16 }
  };

  var SELF_MEANING = {
    '化祿': ['自我給足、樂觀展現或易隨性花費，好處常先向內消化再外顯', 'Self-generated optimism and ease, though gains may disperse casually without discipline'],
    '化權': ['主見強、自我要求與掌控慾較明顯，事情傾向自己扛下主導', 'Strong autonomy and self-drive; tends to take charge rather than delegate'],
    '化科': ['重視體面、原則與形象修飾，善於自我梳理與維持風度', 'Values composure, clarity and reputation; maintains poise on one’s own'],
    '化忌': ['容易反覆糾結、自我消耗或過度在意該宮課題，宜留白與放手', 'Prone to overthinking, self-friction or perfectionism in this area; pacing matters']
  };

  var FOCUS_MAP = {
    general: ['命宮', '福德宮', '遷移宮'],
    romantic: ['夫妻宮', '福德宮'],
    spouses: ['夫妻宮', '田宅宮', '福德宮'],
    parentchild: ['父母宮', '子女宮'],
    friends: ['交友宮', '福德宮'],
    business: ['官祿宮', '財帛宮', '交友宮']
  };

  function mod12(n) { return ((n % 12) + 12) % 12; }

  function findStarPalace(chart, star) {
    if (!chart || !chart.palaces) return null;
    return chart.palaces.filter(function(p) {
      return (!p.borrowed && p.stars.indexOf(star) >= 0) || p.minorStars.indexOf(star) >= 0;
    })[0] || null;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /**
   * 單人十二宮宮干飛化與自化分析
   * @param chart Ziwei.getZiweiChart 的結果（需含出生時辰）
   */
  function analyze(chart) {
    var Zw = window.Ziwei;
    if (!Zw || !chart || chart.needHour || !Array.isArray(chart.palaces) || chart.palaces.length !== 12) return null;
    var STEMS = Zw.TIAN_GAN || ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
    var TABLE = Zw.SIHUA_TABLE;
    if (!TABLE) return null;

    var byPos = {}, byName = {}, natalByStar = {};
    chart.palaces.forEach(function(p) { byPos[p.pos] = p; byName[p.name] = p; });
    if (chart.sihua && Array.isArray(chart.sihua.list)) {
      chart.sihua.list.forEach(function(s) { natalByStar[s.star] = s.type; });
    }

    var centrifugal = [];
    var centripetal = [];
    var palaces = chart.palaces.map(function(from) {
      var stem = STEMS[from.tg];
      var table = TABLE[stem] || {};
      var oppPos = mod12(from.pos + 6);
      var transforms = SIHUA_TYPES.map(function(type) {
        var star = table[type];
        var to = findStarPalace(chart, star);
        var self = !!(to && to.pos === from.pos);
        var opposite = !!(to && to.pos === oppPos);
        var clashPalace = to ? byPos[mod12(to.pos + 6)] : null;
        var natalType = natalByStar[star] || null;

        var desc;
        if (self) {
          desc = L(
            from.name + '（' + stem + '干）使本宮' + star + '自化' + type.charAt(1) + '：' + SELF_MEANING[type][0] + '。',
            Z(from.name) + ' (' + GZ(stem) + ') self-transforms ' + Z(star) + ' (' + Z(type) + '): ' + SELF_MEANING[type][1] + '.'
          );
        } else if (opposite) {
          desc = L(
            from.name + '（' + stem + '干）飛' + star + type + '入對宮' + to.name + '（向心呼應本宮）' + (type === '化忌' ? '，形成對宮沖照本宮之張力。' : '，外在機緣或對象直接回照本宮。'),
            Z(from.name) + ' (' + GZ(stem) + ') flies ' + Z(star) + ' ' + Z(type) + ' into the opposite ' + Z(to.name) +
              (type === '化忌' ? ', casting tension directly back onto the source palace.' : ', drawing external energy directly back to the source palace.')
          );
        } else if (to) {
          desc = L(
            from.name + '（' + stem + '干）飛' + star + type + '入' + to.name +
              (type === '化忌' && clashPalace ? '（並沖照對宮' + clashPalace.name + '）' : '') + '。',
            Z(from.name) + ' (' + GZ(stem) + ') flies ' + Z(star) + ' ' + Z(type) + ' into ' + Z(to.name) +
              (type === '化忌' && clashPalace ? ' (clashing the opposite ' + Z(clashPalace.name) + ')' : '') + '.'
          );
        } else {
          desc = L(from.name + '（' + stem + '干）' + star + type, Z(from.name) + ' (' + GZ(stem) + ') ' + Z(star) + ' ' + Z(type));
        }

        if (natalType) {
          desc += L('〔逢生年' + natalType + '〕', ' [meets natal ' + Z(natalType) + ']');
        }

        var item = {
          fromName: from.name,
          fromPos: from.pos,
          fromStem: stem,
          type: type,
          star: star,
          toName: to ? to.name : null,
          toPos: to ? to.pos : null,
          toBranch: to ? to.branch : null,
          clashName: clashPalace ? clashPalace.name : null,
          clashPos: clashPalace ? clashPalace.pos : null,
          self: self,
          opposite: opposite,
          natalType: natalType,
          desc: desc
        };
        if (self) {
          centrifugal.push({
            palace: from.name, pos: from.pos, stem: stem, type: type, star: star, natalType: natalType, desc: desc
          });
        }
        if (opposite && to) {
          centripetal.push({
            fromPalace: from.name, fromPos: from.pos, toPalace: to.name, toPos: to.pos,
            stem: stem, type: type, star: star, natalType: natalType, desc: desc
          });
        }
        return item;
      });

      return {
        name: from.name,
        pos: from.pos,
        branch: from.branch,
        ganzhi: from.ganzhi,
        stem: stem,
        isMing: from.isMing,
        isShen: from.isShen,
        transforms: transforms,
        selfList: transforms.filter(function(t) { return t.self; })
      };
    });

    // 飛化重點線索：命宮四化、宮位互化（互祿／互忌／祿忌交錯）、生年祿忌轉飛
    var byFlyName = {};
    palaces.forEach(function(p) { byFlyName[p.name] = p; });

    var highlights = [];
    var ming = byFlyName['命宮'];
    if (ming) {
      var mingLu = ming.transforms[0], mingJi = ming.transforms[3];
      highlights.push({
        kind: 'ming',
        title: L('命宮飛化主軸', 'Life Palace Flying Axis'),
        text: L(
          '命宮（' + ming.stem + '干）化祿入' + mingLu.toName + '（重感情與資源投入之處），化忌入' + mingJi.toName +
            (mingJi.self ? '（命宮自化忌，自我要求高、易自我糾結）' : '（並沖' + mingJi.clashName + '，該軸線為主要執著與課題）') + '。',
          'Life Palace (' + GZ(ming.stem) + ') flies ' + Z('化祿') + ' into ' + Z(mingLu.toName) + ' (where effort & care flow naturally) and ' +
            Z('化忌') + ' into ' + Z(mingJi.toName) +
            (mingJi.self ? ' (self-Hua Ji: high inner standards and self-friction).' : ' (clashing ' + Z(mingJi.clashName) + ': the core attachment axis).')
        )
      });
    }

    // 雙宮互化（避免重複，i < j）
    for (var i = 0; i < palaces.length; i++) {
      for (var j = i + 1; j < palaces.length; j++) {
        var pa = palaces[i], pb = palaces[j];
        var ab = pa.transforms.filter(function(t) { return t.toName === pb.name; });
        var ba = pb.transforms.filter(function(t) { return t.toName === pa.name; });
        if (!ab.length || !ba.length) continue;
        var abLu = ab.some(function(t) { return t.type === '化祿'; });
        var baLu = ba.some(function(t) { return t.type === '化祿'; });
        var abJi = ab.some(function(t) { return t.type === '化忌'; });
        var baJi = ba.some(function(t) { return t.type === '化忌'; });
        if (abLu && baLu) {
          highlights.push({
            kind: 'mutual-lu',
            title: L('雙宮互祿：' + pa.name + ' ↔ ' + pb.name, 'Mutual Hua Lu: ' + Z(pa.name) + ' ↔ ' + Z(pb.name)),
            text: L(
              pa.name + '（' + pa.stem + '）與' + pb.name + '（' + pb.stem + '）彼此化祿入對方宮位，兩個領域互相帶動與增益。',
              Z(pa.name) + ' (' + GZ(pa.stem) + ') and ' + Z(pb.name) + ' (' + GZ(pb.stem) + ') send ' + Z('化祿') + ' to each other, forming a mutually supportive loop.'
            )
          });
        } else if (abJi && baJi) {
          highlights.push({
            kind: 'mutual-ji',
            title: L('雙宮互忌：' + pa.name + ' ↔ ' + pb.name, 'Mutual Hua Ji: ' + Z(pa.name) + ' ↔ ' + Z(pb.name)),
            text: L(
              pa.name + '與' + pb.name + '彼此化忌牽動，兩個領域容易互相拉扯、互為壓力來源，宜分清界線。',
              Z(pa.name) + ' and ' + Z(pb.name) + ' send ' + Z('化忌') + ' to each other, creating mutual tension and entanglement; clear boundaries help.'
            )
          });
        } else if ((abLu && baJi) || (baLu && abJi)) {
          var giver = abLu ? pa : pb, receiver = abLu ? pb : pa;
          highlights.push({
            kind: 'lu-ji-exchange',
            title: L('祿忌交纏：' + giver.name + ' ↔ ' + receiver.name, 'Lu–Ji Exchange: ' + Z(giver.name) + ' ↔ ' + Z(receiver.name)),
            text: L(
              giver.name + '化祿入' + receiver.name + '，而' + receiver.name + '化忌回' + giver.name + '，呈現「一方給予資源、另一方較易產生執著或壓力」的互動。',
              Z(giver.name) + ' sends ' + Z('化祿') + ' to ' + Z(receiver.name) + ' while ' + Z(receiver.name) + ' returns ' + Z('化忌') + ', showing an asymmetric give-and-tension dynamic.'
            )
          });
        }
      }
    }

    // 生年祿與生年忌的宮位轉飛（祿轉忌、忌轉忌）
    if (chart.sihua && Array.isArray(chart.sihua.list)) {
      var natalLu = chart.sihua.list.filter(function(s) { return s.type === '化祿' && s.palace; })[0];
      var natalJi = chart.sihua.list.filter(function(s) { return s.type === '化忌' && s.palace; })[0];
      if (natalLu && byFlyName[natalLu.palace.name]) {
        var luPal = byFlyName[natalLu.palace.name];
        var luToLu = luPal.transforms[0], luToJi = luPal.transforms[3];
        highlights.push({
          kind: 'natal-lu-chain',
          title: L('生年化祿轉飛（' + luPal.name + '）', 'Natal Hua Lu Chain (' + Z(luPal.name) + ')'),
          text: L(
            '生年化祿坐' + luPal.name + '，其宮干（' + luPal.stem + '）再飛化祿入' + luToLu.toName + '、化忌入' + luToJi.toName +
              (luToJi.self ? '（自化忌，福氣易分散或自耗）' : '（祿隨忌走，資源最終常流向或卡在' + luToJi.toName + '）') + '。',
            'Natal ' + Z('化祿') + ' sits in ' + Z(luPal.name) + '; its stem (' + GZ(luPal.stem) + ') flies ' + Z('化祿') + ' to ' + Z(luToLu.toName) +
              ' and ' + Z('化忌') + ' to ' + Z(luToJi.toName) +
              (luToJi.self ? ' (self-Hua Ji: gains tend to dissipate).' : ' (Lu follows Ji: energy ultimately gravitates toward ' + Z(luToJi.toName) + ').')
          )
        });
      }
      if (natalJi && byFlyName[natalJi.palace.name]) {
        var jiPal = byFlyName[natalJi.palace.name];
        var jiToJi = jiPal.transforms[3];
        highlights.push({
          kind: 'natal-ji-chain',
          title: L('生年化忌轉飛（' + jiPal.name + '）', 'Natal Hua Ji Chain (' + Z(jiPal.name) + ')'),
          text: L(
            '生年化忌坐' + jiPal.name + '，其宮干（' + jiPal.stem + '）化忌飛入' + jiToJi.toName +
              (jiToJi.self ? '（忌出／自化忌，課題往往透過自我消化或割捨釋放）' : '（忌轉忌並沖' + jiToJi.clashName + '，可留意此處的壓力傳導）') + '。',
            'Natal ' + Z('化忌') + ' sits in ' + Z(jiPal.name) + '; its stem (' + GZ(jiPal.stem) + ') flies ' + Z('化忌') + ' to ' + Z(jiToJi.toName) +
              (jiToJi.self ? ' (self-Hua Ji: tension releases through letting go).' : ' (clashing ' + Z(jiToJi.clashName) + ': watch how pressure transfers here).')
          )
        });
      }
    }

    return {
      palaces: palaces,
      centrifugal: centrifugal,
      centripetal: centripetal,
      highlights: highlights,
      note: L(
        '採欽天／飛星基礎宮干四化（十天干與中州／通行四化表一致），區分「本宮離心自化」與「對宮飛入向心呼應」；空宮借星不重複掛靠飛化落點。',
        'Uses palace-stem Four Transformations (aligned with the chart\'s Sihua table), distinguishing centrifugal self-transformations from centripetal opposite-palace inflows; borrowed stars in empty palaces are not double-counted as landing sites.'
      )
    };
  }

  // 4×4 紫微傳統方盤座標（地支 0=子 .. 11=亥）
  var GRID_POS = [
    [3, 2], [3, 1], [3, 0], [2, 0], [1, 0], [0, 0],
    [0, 1], [0, 2], [0, 3], [1, 3], [2, 3], [3, 3]
  ];

  function cellRect(pos) {
    var rc = GRID_POS[pos];
    return { row: rc[0], col: rc[1], x: 10 + rc[1] * 145, y: 10 + rc[0] * 145, w: 140, h: 140 };
  }

  function innerAnchor(pos) {
    var r = cellRect(pos);
    if (r.row === 0) return { x: r.x + r.w / 2, y: r.y + r.h, side: 'top' };
    if (r.row === 3) return { x: r.x + r.w / 2, y: r.y, side: 'bottom' };
    if (r.col === 0) return { x: r.x + r.w, y: r.y + r.h / 2, side: 'left' };
    return { x: r.x, y: r.y + r.h / 2, side: 'right' };
  }

  function shortPalaceName(name) {
    if (window.L10N && window.L10N.en()) {
      return Z(name).replace(/ Palace$/, '');
    }
    return name.replace('宮', '');
  }

  /**
   * 繪製互動式十二宮飛化路徑 SVG（600×600 方盤）
   * @param chart getZiweiChart 結果
   * @param flying analyze 結果
   * @param activePalaceName 目前檢視的發射宮名稱（預設 '命宮'）
   * @param opts 可選：{ scopeNamesByPos, scopeTag } 用於大限／流年三盤疊飛檢視
   */
  function renderChartSVG(chart, flying, activePalaceName, opts) {
    if (!chart || !flying) return '';
    var active = flying.palaces.filter(function(p) { return p.name === activePalaceName; })[0] || flying.palaces[0];
    var scopeMap = opts && opts.scopeNamesByPos ? opts.scopeNamesByPos : null;
    var uid = 'zwf-' + Math.random().toString(36).slice(2, 7);

    // 記錄各宮有哪些來自 active 的飛入標記
    var incomingAt = {};
    active.transforms.forEach(function(tr) {
      if (tr.toPos != null) {
        (incomingAt[tr.toPos] = incomingAt[tr.toPos] || []).push(tr);
      }
    });

    var svg = '<svg class="zw-fly-svg" viewBox="0 0 600 600" role="img" aria-label="' + esc(L('紫微十二宮飛化路徑圖', 'Zi Wei 12-Palace Flying Path Diagram')) + '">';
    svg += '<defs>';
    SIHUA_TYPES.forEach(function(type, idx) {
      var col = TYPE_META[type].color;
      svg += '<marker id="' + uid + '-arr-' + idx + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
        + '<path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="' + col + '"/></marker>';
    });
    svg += '</defs>';

    // 12 宮格
    chart.palaces.forEach(function(p) {
      var fp = flying.palaces.filter(function(x) { return x.pos === p.pos; })[0];
      var rect = cellRect(p.pos);
      var isActive = p.pos === active.pos;
      var inc = incomingAt[p.pos] || [];
      var borderCol = isActive ? 'var(--color-gold-primary, #d4a843)'
        : inc.length ? TYPE_META[inc[0].type].color : 'rgba(212,168,67,0.28)';
      var fillCol = isActive ? 'rgba(212,168,67,0.18)' : inc.length ? 'rgba(212,168,67,0.08)' : 'var(--color-bg-mid, #2D1810)';

      svg += '<g class="zw-fly-cell' + (isActive ? ' is-active' : '') + '" data-palace="' + esc(p.name) + '" style="cursor:pointer;">';
      svg += '<rect x="' + rect.x + '" y="' + rect.y + '" width="' + rect.w + '" height="' + rect.h + '" rx="8" fill="' + fillCol + '" stroke="' + borderCol + '" stroke-width="' + (isActive ? '2.5' : inc.length ? '1.8' : '1') + '"/>';

      // 宮名 + 干支（若有運限疊盤則併列大限／流年宮位簡稱）
      var pTitle = shortPalaceName(p.name) + (p.isShen ? L('·身', '·B') : '') + (scopeMap && scopeMap[p.pos] ? ' [' + scopeMap[p.pos].short + ']' : '');
      svg += '<text x="' + (rect.x + 8) + '" y="' + (rect.y + 20) + '" font-size="12.5" font-weight="700" fill="' + (isActive ? 'var(--color-gold-light, #f5d78e)' : 'var(--color-gold-primary, #d4a843)') + '">' + esc(pTitle) + '</text>';
      svg += '<text x="' + (rect.x + rect.w - 8) + '" y="' + (rect.y + 20) + '" text-anchor="end" font-size="10.5" fill="var(--color-text-muted, #aaa)">' + esc(GZ(p.ganzhi)) + '</text>';

      // 主星（最多顯示兩行，簡短）
      var starLines = p.stars.length ? p.stars.slice(0, 2).map(function(s) { return Z(s); }) : [L('空宮', 'Empty')];
      starLines.forEach(function(st, si) {
        var tag = (si === 0 && p.borrowed) ? L(' (借)', ' (B)') : '';
        svg += '<text x="' + (rect.x + 8) + '" y="' + (rect.y + 40 + si * 15) + '" font-size="11" fill="var(--color-text-primary, #f0e6d2)">' + esc(st + tag) + '</text>';
      });

      // 生年四化標記
      var natalHits = (chart.sihua ? chart.sihua.list : []).filter(function(s) { return s.palace && s.palace.pos === p.pos; });
      if (natalHits.length) {
        var natalTxt = natalHits.map(function(s) { return L('年' + s.type.charAt(1), 'Y·' + TYPE_META[s.type].shortEn); }).join(' ');
        svg += '<text x="' + (rect.x + 8) + '" y="' + (rect.y + 78) + '" font-size="10" fill="var(--color-gold-light, #f5d78e)">' + esc(natalTxt) + '</text>';
      }

      // 離心自化標記
      if (fp && fp.selfList.length) {
        var bx = rect.x + 8, by = rect.y + 92;
        fp.selfList.forEach(function(st, bi) {
          var meta = TYPE_META[st.type];
          var lbl = L('自化' + meta.shortZh, 'Self ' + meta.shortEn);
          var bw = L(44, 52);
          svg += '<rect x="' + (bx + bi * (bw + 4)) + '" y="' + by + '" width="' + bw + '" height="16" rx="4" fill="' + meta.color + '" fill-opacity="0.22" stroke="' + meta.color + '" stroke-width="0.8"/>';
          svg += '<text x="' + (bx + bi * (bw + 4) + bw / 2) + '" y="' + (by + 11.5) + '" text-anchor="middle" font-size="9.5" font-weight="700" fill="' + meta.color + '">' + esc(lbl) + '</text>';
        });
      }

      // 目前發射宮飛入標記
      if (inc.length) {
        var inTxt = inc.map(function(t) { return '←' + L(TYPE_META[t.type].shortZh, TYPE_META[t.type].shortEn); }).join(' ');
        svg += '<text x="' + (rect.x + rect.w - 8) + '" y="' + (rect.y + rect.h - 10) + '" text-anchor="end" font-size="10.5" font-weight="700" fill="' + TYPE_META[inc[0].type].color + '">' + esc(inTxt) + '</text>';
      }
      svg += '</g>';
    });

    // 飛化曲線箭頭（畫在內區 y/x 155..445）
    var srcPt = innerAnchor(active.pos);
    active.transforms.forEach(function(tr, idx) {
      if (tr.toPos == null) return;
      var meta = TYPE_META[tr.type];
      var col = meta.color;
      var badge = L(meta.shortZh, meta.shortEn);

      if (tr.self) {
        // 自化迴圈
        var dx = srcPt.side === 'left' ? 24 : srcPt.side === 'right' ? -24 : 0;
        var dy = srcPt.side === 'top' ? 24 : srcPt.side === 'bottom' ? -24 : 0;
        var sx = srcPt.x + (srcPt.side === 'top' || srcPt.side === 'bottom' ? (idx - 1.5) * 14 : 0);
        var sy = srcPt.y + (srcPt.side === 'left' || srcPt.side === 'right' ? (idx - 1.5) * 14 : 0);
        var lx = sx + dx, ly = sy + dy;
        svg += '<path d="M ' + sx + ' ' + sy + ' Q ' + (lx + (dy ? 16 : 0)) + ' ' + (ly + (dx ? 16 : 0)) + ' ' + lx + ' ' + ly + '" fill="none" stroke="' + col + '" stroke-width="2" stroke-dasharray="3,2"/>';
        svg += '<circle cx="' + lx + '" cy="' + ly + '" r="9" fill="' + col + '"/>';
        svg += '<text x="' + lx + '" y="' + (ly + 3.5) + '" text-anchor="middle" font-size="9.5" font-weight="700" fill="#111">' + esc(badge) + '</text>';
        return;
      }

      var dstPt = innerAnchor(tr.toPos);
      var spread = (idx - 1.5) * 10;
      var mx = (srcPt.x + dstPt.x) / 2, my = (srcPt.y + dstPt.y) / 2;
      var vx = dstPt.x - srcPt.x, vy = dstPt.y - srcPt.y;
      var len = Math.hypot(vx, vy) || 1;
      var nx = -vy / len, ny = vx / len;

      // 控制點朝向中心 (300,300) 拉出弧線，避免壓住中宮文字太密，同時彼此錯開
      var c1x = srcPt.x + (300 - srcPt.x) * 0.45 + nx * spread;
      var c1y = srcPt.y + (300 - srcPt.y) * 0.45 + ny * spread;
      var c2x = dstPt.x + (300 - dstPt.x) * 0.45 + nx * spread;
      var c2y = dstPt.y + (300 - dstPt.y) * 0.45 + ny * spread;

      svg += '<path d="M ' + srcPt.x.toFixed(1) + ' ' + srcPt.y.toFixed(1) + ' C ' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ', ' + c2x.toFixed(1) + ' ' + c2y.toFixed(1) + ', ' + dstPt.x.toFixed(1) + ' ' + dstPt.y.toFixed(1) + '" '
        + 'fill="none" stroke="' + col + '" stroke-width="2" stroke-opacity="0.88" marker-end="url(#' + uid + '-arr-' + idx + ')"/>';

      // 曲線 t=0.72 放一個小圓標註「祿/權/科/忌」
      var t = 0.72, u = 1 - t;
      var bx = u*u*u*srcPt.x + 3*u*u*t*c1x + 3*u*t*t*c2x + t*t*t*dstPt.x;
      var by = u*u*u*srcPt.y + 3*u*u*t*c1y + 3*u*t*t*c2y + t*t*t*dstPt.y;
      svg += '<circle cx="' + bx.toFixed(1) + '" cy="' + by.toFixed(1) + '" r="8.5" fill="' + col + '"/>';
      svg += '<text x="' + bx.toFixed(1) + '" y="' + (by + 3.2).toFixed(1) + '" text-anchor="middle" font-size="9" font-weight="700" fill="#111">' + esc(badge) + '</text>';
    });

    // 中央摘要區（半透明底，確保可讀性）
    var centerTitle = (scopeMap && scopeMap[active.pos] ? scopeMap[active.pos].full + ' · ' : '') +
      Z(active.name) + ' · ' + L(active.stem + '干飛化', GZ(active.stem) + ' stem');
    svg += '<rect x="182" y="212" width="236" height="176" rx="12" fill="var(--color-bg-card, #3D2218)" fill-opacity="0.92" stroke="var(--color-gold-primary, #d4a843)" stroke-opacity="0.45" stroke-width="1.2"/>';
    svg += '<text x="300" y="236" text-anchor="middle" font-size="12" font-weight="700" fill="var(--color-gold-light, #F0D78C)">'
      + esc(centerTitle) + '</text>';

    active.transforms.forEach(function(tr, idx) {
      var meta = TYPE_META[tr.type];
      var y = 264 + idx * 24;
      var toLabel = tr.toName ? (Z(tr.toName) + (scopeMap && tr.toPos != null && scopeMap[tr.toPos] ? ' (' + scopeMap[tr.toPos].short + ')' : '')) : '';
      var targetTxt = tr.self
        ? L('自化' + meta.shortZh + '（' + tr.star + '）', 'Self ' + meta.shortEn + ' (' + Z(tr.star) + ')')
        : Z(tr.star) + ' → ' + toLabel + (tr.opposite ? L(' (對宮)', ' (opp.)') : '');
      svg += '<text x="200" y="' + y + '" font-size="11.5" font-weight="700" fill="' + meta.color + '">' + esc(Z(tr.type)) + '</text>';
      svg += '<text x="248" y="' + y + '" font-size="11" fill="var(--color-text-primary, #F5E6CC)">' + esc(targetTxt) + '</text>';
    });

    svg += '<text x="300" y="372" text-anchor="middle" font-size="10" fill="var(--color-text-muted, #8B7355)">'
      + esc(L('點擊外圍任一宮位切換飛化路徑', 'Click any outer palace to switch paths')) + '</text>';
    svg += '</svg>';
    return svg;
  }

  /**
   * 雙人宮干飛化交互解讀（命宮 + 關係重點宮雙向互飛）
   * @param chartA A 盤
   * @param chartB B 盤
   * @param modeKey general / romantic / spouses / parentchild / friends / business
   */
  function pairAnalyze(chartA, chartB, modeKey) {
    var Zw = window.Ziwei;
    if (!Zw || !chartA || !chartB || chartA.needHour || chartB.needHour) return null;
    var STEMS = Zw.TIAN_GAN || ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
    var TABLE = Zw.SIHUA_TABLE;
    if (!TABLE) return null;

    var focus = FOCUS_MAP[modeKey] || FOCUS_MAP.general;
    var sourceNames = ['命宮'].concat(focus.filter(function(n) { return n !== '命宮'; }));

    var flyA = analyze(chartA), flyB = analyze(chartB);
    var selfMapA = {}, selfMapB = {};
    if (flyA) flyA.centrifugal.forEach(function(c) { (selfMapA[c.palace] = selfMapA[c.palace] || []).push(c.type); });
    if (flyB) flyB.centrifugal.forEach(function(c) { (selfMapB[c.palace] = selfMapB[c.palace] || []).push(c.type); });

    function projectSide(fromChart, toChart, toSelfMap, sideLabel) {
      var toByPos = {}, toNatal = {};
      toChart.palaces.forEach(function(p) { toByPos[p.pos] = p; });
      if (toChart.sihua && Array.isArray(toChart.sihua.list)) {
        toChart.sihua.list.forEach(function(s) { toNatal[s.star] = s.type; });
      }

      var rows = [];
      sourceNames.forEach(function(pName) {
        var fp = fromChart.palaces.filter(function(p) { return p.name === pName; })[0];
        if (!fp) return;
        var stem = STEMS[fp.tg];
        var table = TABLE[stem] || {};
        SIHUA_TYPES.forEach(function(type) {
          var star = table[type];
          var dest = findStarPalace(toChart, star);
          if (!dest) return;
          var oppDest = toByPos[mod12(dest.pos + 6)];
          var inCore = dest.name === '命宮' || focus.indexOf(dest.name) >= 0;
          var clashesCore = type === '化忌' && oppDest && (oppDest.name === '命宮' || focus.indexOf(oppDest.name) >= 0) && !inCore;
          var hitsSelf = toSelfMap[dest.name] || [];
          var hitsNatal = toNatal[star] || null;

          var delta = TYPE_META[type].delta * (inCore ? 1.5 : 1) - (clashesCore ? 8 : 0);
          var score = Math.max(0, Math.min(100, Math.round(60 + delta)));

          var noteParts = [];
          if (inCore) noteParts.push(L('落入對方核心／重點宮', 'lands in partner\'s core/focus palace'));
          if (clashesCore) noteParts.push(L('沖照對方' + oppDest.name, 'clashes partner\'s ' + Z(oppDest.name)));
          if (hitsSelf.length) noteParts.push(L('對方該宮有' + hitsSelf.map(function(x) { return '自化' + x.charAt(1); }).join('、'), 'partner palace has self-' + hitsSelf.map(function(x) { return Z(x); }).join('/')));
          if (hitsNatal) noteParts.push(L('逢對方生年' + hitsNatal, 'meets partner\'s natal ' + Z(hitsNatal)));

          rows.push({
            side: sideLabel,
            fromPalace: fp.name,
            fromStem: stem,
            type: type,
            star: star,
            toPalace: dest.name,
            toPos: dest.pos,
            clashPalace: oppDest ? oppDest.name : null,
            inCore: inCore,
            clashesCore: clashesCore,
            hitsSelf: hitsSelf,
            hitsNatal: hitsNatal,
            score: score,
            note: noteParts.join(L('、', '; '))
          });
        });
      });
      return rows;
    }

    var aToB = projectSide(chartA, chartB, selfMapB, 'A → B');
    var bToA = projectSide(chartB, chartA, selfMapA, 'B → A');

    // 雙向交互重點解讀（互祿、互科、互忌、忌沖核心、飛化逢自化）
    var insights = [];
    var abCoreLu = aToB.filter(function(r) { return r.type === '化祿' && r.inCore; });
    var baCoreLu = bToA.filter(function(r) { return r.type === '化祿' && r.inCore; });
    if (abCoreLu.length && baCoreLu.length) {
      insights.push({
        type: 'mutual-lu',
        text: L(
          '雙向化祿入核心宮：A 飛祿入 B 的' + abCoreLu.map(function(r) { return r.toPalace; }).join('、') +
            '，B 亦飛祿入 A 的' + baCoreLu.map(function(r) { return r.toPalace; }).join('、') + '，互動中彼此願意付出與包容。',
          'Mutual Hua Lu into core palaces: A sends ' + Z('化祿') + ' to B\'s ' + abCoreLu.map(function(r) { return Z(r.toPalace); }).join(', ') +
            ' and B sends ' + Z('化祿') + ' to A\'s ' + baCoreLu.map(function(r) { return Z(r.toPalace); }).join(', ') + ' — strong mutual warmth and goodwill.'
        )
      });
    }

    var abCoreKe = aToB.filter(function(r) { return r.type === '化科' && r.inCore; });
    var baCoreKe = bToA.filter(function(r) { return r.type === '化科' && r.inCore; });
    if (abCoreKe.length && baCoreKe.length) {
      insights.push({
        type: 'mutual-ke',
        text: L(
          '雙向化科呼應：雙方重點宮互飛化科，遇分歧時較能以理性、體面與溝通協調處理。',
          'Mutual Hua Ke resonance: both charts fly ' + Z('化科') + ' into each other\'s focus palaces, favoring calm communication and mutual respect.'
        )
      });
    }

    var jiAlerts = aToB.concat(bToA).filter(function(r) { return r.type === '化忌' && (r.inCore || r.clashesCore); });
    if (jiAlerts.length) {
      insights.push({
        type: 'ji-alert',
        text: L(
          '化忌牽動與磨合點：' + jiAlerts.map(function(r) {
            return r.side + ' ' + r.fromPalace + '（' + r.fromStem + '）化忌入' + r.toPalace +
              (r.clashesCore ? '（沖' + r.clashPalace + '）' : '');
          }).join('；') + '。忌入重點宮代表黏著與在意，忌沖則容易出現期待落差，宜先說清楚界線。',
          'Hua Ji tension points: ' + jiAlerts.map(function(r) {
            return r.side + ' ' + Z(r.fromPalace) + ' (' + GZ(r.fromStem) + ') ' + Z('化忌') + ' → ' + Z(r.toPalace) +
              (r.clashesCore ? ' (clashes ' + Z(r.clashPalace) + ')' : '');
          }).join('; ') + '. Direct hits show strong attachment; clashes signal friction where explicit boundaries help.'
        )
      });
    }

    var selfHits = aToB.concat(bToA).filter(function(r) { return r.hitsSelf.length && (r.type === '化祿' || r.type === '化忌'); });
    if (selfHits.length) {
      insights.push({
        type: 'self-hit',
        text: L(
          '飛化逢對方自化：' + selfHits.slice(0, 4).map(function(r) {
            return r.side + ' ' + r.fromPalace + '飛' + r.type + '入對方' + r.toPalace + '（對方自化' + r.hitsSelf.map(function(x) { return x.charAt(1); }).join('、') + '）';
          }).join('；') + '，代表付出或壓力容易受到對方該宮自我消化與變動的影響。',
          'Flying hits partner self-transformation: ' + selfHits.slice(0, 4).map(function(r) {
            return r.side + ' ' + Z(r.fromPalace) + ' ' + Z(r.type) + ' → ' + Z(r.toPalace) + ' (self-' + r.hitsSelf.map(function(x) { return Z(x); }).join('/') + ')';
          }).join('; ') + ', meaning effort or tension is modulated by the partner\'s own self-transformation there.'
        )
      });
    }

    var all = aToB.concat(bToA);
    var score = all.length ? Math.round(all.reduce(function(s, r) { return s + r.score; }, 0) / all.length) : 60;

    return {
      sourcePalaces: sourceNames,
      focusPalaces: focus,
      aToB: aToB,
      bToA: bToA,
      insights: insights,
      score: score
    };
  }

  /**
   * 雙人飛化路徑圖 SVG（左：發射方重點宮位，右：接收方十二宮；支援切換 A→B / B→A）
   * @param pairFlying pairAnalyze 結果
   * @param direction 'AB' 或 'BA'
   * @param sourceFilter 可選：只顯示某個發射宮（如 '命宮'），未填則顯示全部重點宮
   */
  function renderPairSVG(pairFlying, direction, sourceFilter) {
    if (!pairFlying) return '';
    var dir = direction === 'BA' ? 'BA' : 'AB';
    var rows = (dir === 'AB' ? pairFlying.aToB : pairFlying.bToA).filter(function(r) {
      return !sourceFilter || r.fromPalace === sourceFilter;
    });
    var fromLabel = dir === 'AB' ? L('A 方發射宮', 'Person A Source') : L('B 方發射宮', 'Person B Source');
    var toLabel = dir === 'AB' ? L('B 方落入宮位', 'Person B Target') : L('A 方落入宮位', 'Person A Target');

    var PALACE_ORDER = ['命宮','兄弟宮','夫妻宮','子女宮','財帛宮','疾厄宮','遷移宮','交友宮','官祿宮','田宅宮','福德宮','父母宮'];
    var sources = sourceFilter ? [sourceFilter] : pairFlying.sourcePalaces;
    var uid = 'zwp-' + Math.random().toString(36).slice(2, 7);

    var svgH = 390, svgW = 560;
    var svg = '<svg class="zw-pair-svg" viewBox="0 0 ' + svgW + ' ' + svgH + '" role="img" aria-label="' + esc(L('雙人紫微飛化路徑圖', 'Two-Person Zi Wei Flying Path Diagram')) + '">';
    svg += '<defs>';
    SIHUA_TYPES.forEach(function(type, idx) {
      svg += '<marker id="' + uid + '-p-' + idx + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">'
        + '<path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="' + TYPE_META[type].color + '"/></marker>';
    });
    svg += '</defs>';

    svg += '<text x="80" y="20" text-anchor="middle" font-size="11.5" font-weight="700" fill="var(--color-gold-primary, #d4a843)">' + esc(fromLabel) + '</text>';
    svg += '<text x="468" y="20" text-anchor="middle" font-size="11.5" font-weight="700" fill="var(--color-gold-primary, #d4a843)">' + esc(toLabel) + '</text>';

    var srcYMap = {}, dstYMap = {};
    var srcSpan = svgH - 54, srcStep = srcSpan / Math.max(sources.length, 1);
    sources.forEach(function(name, i) {
      var y = 38 + srcStep * (i + 0.5) - 18;
      srcYMap[name] = y + 18;
      var stemHit = rows.filter(function(r) { return r.fromPalace === name; })[0];
      svg += '<rect x="14" y="' + y.toFixed(1) + '" width="132" height="36" rx="7" fill="rgba(212,168,67,0.12)" stroke="rgba(212,168,67,0.55)" stroke-width="1.2"/>';
      svg += '<text x="80" y="' + (y + 22).toFixed(1) + '" text-anchor="middle" font-size="11.5" font-weight="700" fill="var(--color-gold-light, #f5d78e)">'
        + esc(shortPalaceName(name) + (stemHit ? ' (' + GZ(stemHit.fromStem) + ')' : '')) + '</text>';
    });

    var dstHits = {};
    rows.forEach(function(r) { (dstHits[r.toPalace] = dstHits[r.toPalace] || []).push(r); });
    PALACE_ORDER.forEach(function(name, i) {
      var y = 34 + i * 28.5;
      dstYMap[name] = y + 12;
      var hits = dstHits[name] || [];
      var isFocus = name === '命宮' || pairFlying.focusPalaces.indexOf(name) >= 0;
      var col = hits.length ? TYPE_META[hits[0].type].color : isFocus ? 'rgba(212,168,67,0.45)' : 'rgba(212,168,67,0.22)';
      svg += '<rect x="402" y="' + y.toFixed(1) + '" width="142" height="24" rx="5" fill="' + (hits.length ? 'rgba(212,168,67,0.12)' : 'var(--color-bg-mid, #2D1810)') + '" stroke="' + col + '" stroke-width="' + (hits.length ? '1.4' : '0.8') + '"/>';
      svg += '<text x="412" y="' + (y + 15.5).toFixed(1) + '" font-size="10.5" font-weight="' + (isFocus ? '700' : '500') + '" fill="' + (isFocus ? 'var(--color-gold-light, #f5d78e)' : 'var(--color-text-secondary, #ccc)') + '">'
        + esc(shortPalaceName(name)) + '</text>';
      if (hits.length) {
        var tags = hits.map(function(h) { return L(TYPE_META[h.type].shortZh, TYPE_META[h.type].shortEn); }).join(' ');
        svg += '<text x="536" y="' + (y + 15.5).toFixed(1) + '" text-anchor="end" font-size="10" font-weight="700" fill="' + TYPE_META[hits[0].type].color + '">' + esc(tags) + '</text>';
      }
    });

    rows.forEach(function(r) {
      var sy = srcYMap[r.fromPalace], dy = dstYMap[r.toPalace];
      if (sy == null || dy == null) return;
      var tIdx = SIHUA_TYPES.indexOf(r.type);
      var meta = TYPE_META[r.type];
      var offset = (tIdx - 1.5) * 8;
      var c1x = 240 + offset, c1y = sy + offset * 0.6;
      var c2x = 310 + offset, c2y = dy - offset * 0.6;
      svg += '<path d="M 146 ' + sy.toFixed(1) + ' C ' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ', ' + c2x.toFixed(1) + ' ' + c2y.toFixed(1) + ', 398 ' + dy.toFixed(1) + '" '
        + 'fill="none" stroke="' + meta.color + '" stroke-width="1.8" stroke-opacity="0.82" marker-end="url(#' + uid + '-p-' + tIdx + ')"/>';
    });

    svg += '</svg>';
    return svg;
  }

  /**
   * 紫微運限飛化：大限／流年十二宮展開與三盤疊飛（本命、大限、流年）
   * @param chart Ziwei.getZiweiChart 結果
   * @param horoscope Ziwei.getHoroscope 結果
   */
  function horoscopeAnalyze(chart, horoscope) {
    var Zw = window.Ziwei;
    if (!Zw || !chart || chart.needHour || !horoscope) return null;
    var flying = analyze(chart);
    if (!flying) return null;
    var STEMS = Zw.TIAN_GAN || ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
    var TABLE = Zw.SIHUA_TABLE;
    var PALACES = Zw.PALACES || [];
    var byPos = {};
    chart.palaces.forEach(function(p) { byPos[p.pos] = p; });

    function buildScopeMap(startPos, prefixZh, shortPrefixZh, prefixEn, shortPrefixEn) {
      if (startPos == null) return null;
      var map = {};
      PALACES.forEach(function(p, i) {
        var pos = mod12(startPos - i);
        map[pos] = {
          natalName: byPos[pos] ? byPos[pos].name : '',
          full: L(prefixZh + p.n, prefixEn + ' ' + Z(p.n)),
          short: L(shortPrefixZh + p.n.replace('宮', ''), shortPrefixEn + Z(p.n).replace(/ Palace$/, '').slice(0, 3))
        };
      });
      return map;
    }

    var decadalMap = horoscope.decadal ? buildScopeMap(horoscope.decadal.pos, '大限', '大', 'Decade', 'D·') : null;
    var yearlyMap = horoscope.yearlyMing ? buildScopeMap(horoscope.yearlyMing.pos, '流年', '流', 'Yearly', 'Y·') : null;

    function annotateTransforms(stem, sourceLabelZh, sourceLabelEn, sourcePos) {
      var tbl = TABLE[stem] || {};
      return SIHUA_TYPES.map(function(type) {
        var star = tbl[type];
        var dest = findStarPalace(chart, star);
        var oppPos = dest ? mod12(dest.pos + 6) : null;
        var self = !!(dest && sourcePos != null && dest.pos === sourcePos);
        var clashes = [];
        if (type === '化忌' && oppPos != null) {
          if (oppPos === chart.mingPalace.pos) clashes.push(L('本命命宮', 'Natal Life'));
          if (horoscope.decadal && oppPos === horoscope.decadal.pos) clashes.push(L('大限命宮', 'Decade Life'));
          if (horoscope.yearlyMing && oppPos === horoscope.yearlyMing.pos) clashes.push(L('流年命宮', 'Yearly Life'));
        }
        var layers = [];
        if (dest) {
          layers.push(L('本命' + dest.name, 'Natal ' + Z(dest.name)));
          if (decadalMap && decadalMap[dest.pos]) layers.push(decadalMap[dest.pos].full);
          if (yearlyMap && yearlyMap[dest.pos]) layers.push(yearlyMap[dest.pos].full);
        }
        var text = L(sourceLabelZh + '（' + stem + '干）' + star + type + '入', sourceLabelEn + ' (' + GZ(stem) + ') ' + Z(star) + ' ' + Z(type) + ' → ') +
          layers.join(' / ') +
          (self ? L('（本宮自化）', ' (self)') : '') +
          (clashes.length ? L('〔沖' + clashes.join('、') + '〕', ' [clashes ' + clashes.join(', ') + ']') : '');
        return {
          type: type, star: star, toPos: dest ? dest.pos : null, toName: dest ? dest.name : null,
          decadalName: dest && decadalMap ? decadalMap[dest.pos].full : null,
          yearlyName: dest && yearlyMap ? yearlyMap[dest.pos].full : null,
          self: self, clashes: clashes, text: text
        };
      });
    }

    var decadalStem = horoscope.decadal ? STEMS[horoscope.decadal.tg] : null;
    var decadalTransforms = decadalStem
      ? annotateTransforms(decadalStem, '大限命宮（本命' + horoscope.decadal.name + '）', 'Decade Life (Natal ' + Z(horoscope.decadal.name) + ')', horoscope.decadal.pos)
      : [];
    var yearlyStem = horoscope.ganzhi ? horoscope.ganzhi.charAt(0) : null;
    var yearlyStemTransforms = yearlyStem
      ? annotateTransforms(yearlyStem, '流年歲干', 'Yearly Stem', null)
      : [];
    var yearlyMingStem = horoscope.yearlyMing ? STEMS[horoscope.yearlyMing.tg] : null;
    var yearlyMingTransforms = yearlyMingStem
      ? annotateTransforms(yearlyMingStem, '流年命宮（本命' + horoscope.yearlyMing.name + '）', 'Yearly Life (Natal ' + Z(horoscope.yearlyMing.name) + ')', horoscope.yearlyMing.pos)
      : [];

    // 疊宮檢查：大限四化與流年歲干四化落入同宮（雙祿／雙忌）
    var insights = [];
    if (decadalTransforms.length && yearlyStemTransforms.length) {
      var dLu = decadalTransforms[0], yLu = yearlyStemTransforms[0];
      var dJi = decadalTransforms[3], yJi = yearlyStemTransforms[3];
      if (dLu.toPos != null && dLu.toPos === yLu.toPos) {
        insights.push(L(
          '雙祿疊宮：大限化祿與流年化祿同會於本命' + dLu.toName + '（' + (decadalMap ? decadalMap[dLu.toPos].full : '') + ' / ' + (yearlyMap ? yearlyMap[dLu.toPos].full : '') + '），該領域機會與資源明顯放大。',
          'Double Hua Lu convergence: Decade and Yearly ' + Z('化祿') + ' both meet in Natal ' + Z(dLu.toName) + ', amplifying opportunities there.'
        ));
      }
      if (dJi.toPos != null && dJi.toPos === yJi.toPos) {
        insights.push(L(
          '雙忌疊宮：大限化忌與流年化忌同入本命' + dJi.toName + '（' + (decadalMap ? decadalMap[dJi.toPos].full : '') + ' / ' + (yearlyMap ? yearlyMap[dJi.toPos].full : '') + '），該宮與對宮今年壓力較集中，宜保守應對。',
          'Double Hua Ji convergence: Decade and Yearly ' + Z('化忌') + ' both enter Natal ' + Z(dJi.toName) + ', concentrating tension on that palace axis this year.'
        ));
      } else if (dJi.toPos != null && yJi.toPos != null && mod12(dJi.toPos + 6) === yJi.toPos) {
        insights.push(L(
          '大限化忌（入' + dJi.toName + '）與流年化忌（入' + yJi.toName + '）落於對沖軸線，需留意兩端事務互相拉扯。',
          'Decade ' + Z('化忌') + ' (' + Z(dJi.toName) + ') and Yearly ' + Z('化忌') + ' (' + Z(yJi.toName) + ') oppose each other across the same axis.'
        ));
      }
    }
    decadalTransforms.concat(yearlyStemTransforms, yearlyMingTransforms).forEach(function(tr) {
      if (tr.clashes.length) insights.push(tr.text);
    });

    return {
      flying: flying,
      decadalMap: decadalMap,
      yearlyMap: yearlyMap,
      decadalTransforms: decadalTransforms,
      yearlyStemTransforms: yearlyStemTransforms,
      yearlyMingTransforms: yearlyMingTransforms,
      insights: insights
    };
  }

  return {
    analyze: analyze,
    horoscopeAnalyze: horoscopeAnalyze,
    renderChartSVG: renderChartSVG,
    pairAnalyze: pairAnalyze,
    renderPairSVG: renderPairSVG,
    SIHUA_TYPES: SIHUA_TYPES,
    TYPE_META: TYPE_META
  };
})();
