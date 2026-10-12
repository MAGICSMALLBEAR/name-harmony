/**
 * 深度詳解引擎 — 易經爻辭 + 塔羅詳解 + 卡巴拉生命樹 + 擴充解讀
 */
window.DeepReadings = (function() {

  // 英文模式（js/l10n.js）：T 查字典、L 組合句子
  function T(x) { return window.L10N ? window.L10N.t(x) : x; }
  function L(zh, en) { return window.L10N ? window.L10N.L(zh, en) : zh; }

  // ========== 易經爻辭擴充 ==========
  // 英文模式：卦名、卦辭簡解在 l10n/iching.js 的字典；爻辭英譯在 L10N.ICHING_YAO（[原文英譯, 白話英譯] ×6）
  function getHexagramDeepReading(hexResult, cnResult) {
    if (!hexResult) return '';
    var parts = [];
    var hex = hexResult;

    parts.push(L('【卦象解讀】', '[Hexagram] ') + hex.hexUnicode + ' ' + T(hex.hexName));
    parts.push(L('本卦「' + hex.hexName + '」五行屬' + hex.element + '，判為' + hex.glory + '。',
      'Primary hexagram: ' + T(hex.hexName) + '. Element: ' + T(hex.element) + '; verdict: ' + T(hex.glory) + '.'));
    parts.push(T(hex.description));

    // 爻辭解讀
    var yaoReadings = getYaoReading(hex.hexIndex, hex.movingYao);
    if (yaoReadings) {
      parts.push(L('【動爻解析 — 第' + hex.movingYao + '爻】', '[Moving Line — line ' + hex.movingYao + ' from the bottom]'));
      parts.push(yaoReadings);
    }

    // 變卦（動爻陰陽翻轉）
    var changedHex = getChangedHexagram(hex);
    if (changedHex) {
      parts.push(L('【變卦】' + changedHex.u + ' ' + changedHex.n + '（' + changedHex.g + '）',
        '[Changing To] ' + changedHex.u + ' ' + T(changedHex.n) + ' (' + T(changedHex.g) + ')'));
      parts.push(L('此卦代表事情發展的趨勢與結果：', 'This shows where things are heading: ') + T(changedHex.d));
    }

    // 人生指引
    parts.push(L('【對你的啟示】', '[What It Means for You]'));
    parts.push(getPersonalGuidance(hex.glory, cnResult));

    return parts.join('\n\n');
  }

  /** 爻題英譯：初九 → Nine at the beginning、六二 → Six in the second place、上六 → Six at the top */
  var YAO_PLACE = { '初': 'at the beginning', '二': 'in the second place', '三': 'in the third place', '四': 'in the fourth place', '五': 'in the fifth place', '上': 'at the top' };
  function yaoTitleEn(title) {
    var num = title.indexOf('九') >= 0 ? 'Nine' : 'Six';
    var place = YAO_PLACE[title.replace(/[九六]/g, '')];
    return place ? num + ' ' + place : title;
  }

  /** 動爻爻辭：原文＋白話（js/data/iching-yao.js）；資料未載入時退回爻位解讀 */
  function getYaoReading(hexIdx, yao) {
    var lines = window.IChingYao && window.IChingYao[hexIdx];
    var y = lines && lines[yao - 1];
    var en = window.L10N && window.L10N.en() && window.L10N.ICHING_YAO && window.L10N.ICHING_YAO[hexIdx];
    if (y && en && en[yao - 1]) return yaoTitleEn(y[0]) + ': ' + en[yao - 1][0] + '\nIn plain words: ' + en[yao - 1][1];
    if (y && !(window.L10N && window.L10N.en())) return y[0] + '：' + y[1] + '\n白話：' + y[2];
    return L('（爻辭資料未載入，以下依爻位解讀）', '(Line text not available; reading by line position) ') + L(YAO_POSITION[yao], YAO_POSITION_EN[yao]);
  }

  // 六爻爻位的基本意義：由下而上代表事情的發展階段
  var YAO_POSITION = {
    1: '初爻居全卦最下，代表事情的開端。此時位卑力薄，宜潛伏準備、打好基礎，不宜急於表現。',
    2: '二爻居下卦之中，居中得正，通常是全卦較安穩的位置。宜守中道、與人合作，踏實經營。',
    3: '三爻居下卦之極，正處內外卦交界，進退兩難，傳統上多凶險。宜謹慎自守，不可躁進。',
    4: '四爻居上卦之初，已接近核心但地位尚未穩固。宜謹言慎行、觀察形勢，伺機而動。',
    5: '五爻居上卦之中，是全卦最尊貴的君位，多半為吉。宜承擔責任、發揮影響力，是全局的關鍵。',
    6: '上爻居全卦之極，物極必反。此時宜知所進退、見好就收，不宜戀棧。'
  };
  var YAO_POSITION_EN = {
    1: 'The first line sits at the very bottom and marks the beginning of a matter. Position and strength are still slight: prepare quietly and lay foundations rather than rushing to show yourself.',
    2: 'The second line is central in the lower trigram, usually one of the steadiest places. Keep to the middle way, cooperate with others and build steadily.',
    3: 'The third line is at the top of the lower trigram, on the border between inner and outer, caught between advancing and retreating — traditionally a dangerous place. Be careful and restrained; do not push ahead.',
    4: 'The fourth line begins the upper trigram: close to the centre of power but not yet secure. Speak and act carefully, watch the situation and move when the time is right.',
    5: 'The fifth line is central in the upper trigram — the ruler\'s place and usually auspicious. Take responsibility and use your influence; this is the key to the whole situation.',
    6: 'The top line is at the extreme of the hexagram, where things turn into their opposite. Know when to stop, quit while ahead and do not cling to your position.'
  };

  function getChangedHexagram(hexResult) {
    if (!hexResult) return null;
    if (window.IChing && window.IChing.changedHexagram) return window.IChing.changedHexagram(hexResult);
    return null;
  }

  function getPersonalGuidance(glory, cnResult) {
    var guides = {
      '大吉': L('這是一個極為吉利的卦象。命運正處於上升期，現在是展開新計劃、建立新關係的最佳時機。你的名字筆劃所起的卦與你的命格高度契合，建議把握當下的好運，勇敢前行。',
        'A very auspicious hexagram. Your fortunes are on the rise, making this the best time to start new plans and new relationships. The hexagram cast from your name\'s strokes fits your chart closely — seize the moment and move forward boldly.'),
      '吉': L('整體卦象吉祥，雖然不是完美無缺，但主流是好的。建議在順利時也保持警惕，不要在順境中放鬆警覺。你的名字與此卦的能量相容，可以信賴自己的直覺。',
        'An auspicious hexagram overall — not flawless, but the main current is good. Stay alert even when things go smoothly and do not let your guard down. Your name is in tune with this hexagram, so you can trust your intuition.'),
      '平': L('卦象平穩，沒有大起大落。這是一個適合耕耘而非收穫的時期。建議踏實地做好每件小事，累積實力。' + (cnResult ? '你的人格「' + cnResult.grids.ren.name + '」為' + cnResult.grids.ren.number + '劃，建議多加發揮' + cnResult.grids.ren.element + '屬性的優勢。' : ''),
        'A steady hexagram without big ups and downs — a time for sowing rather than reaping. Do each small task well and build up your strength.' + (cnResult ? ' Your Person Grid is ' + cnResult.grids.ren.number + ' strokes; make the most of its ' + T(cnResult.grids.ren.element) + ' strengths.' : '')),
      '凶': L('卦象警示較多阻礙，但易經的核心精神是「變易」— 凶中可以轉吉。現在最重要的是保持耐心與冷靜，不要做重大決定。靜待時機，凶象自然會過去。',
        'The hexagram warns of obstacles, but the heart of the I Ching is change — misfortune can turn to good fortune. For now, stay patient and calm and avoid major decisions. Wait for the right moment and the bad omens will pass.')
    };
    return guides[glory] || guides['平'];
  }

  // ========== 塔羅詳解 ==========
  function getTarotDeepReading(destinyNumber, enResult) {
    var tarot = window.FunExtras ? window.FunExtras.getTarot(destinyNumber) : null;
    if (!tarot) return '';

    var parts = [];
    parts.push(L('【塔羅本命牌】', '[Birth Tarot Card] ') + tarot.e + ' ' + T(tarot.card));

    // 擴充解讀
    var expanded = {
      'I 魔術師': '正位：創造力、自信、技能純熟。你天生具有將想法變為現實的魔力。在人生道路上，你擁有所有需要的工具與資源，關鍵是相信自己。逆位：可能表示能力被埋沒或欺騙。注意不要過度自信而變得操縱。',
      'II 女祭司': '正位：直覺、潛意識、奧秘。你的力量來自於內在的智慧與直覺。安靜下來，聆聽內心的聲音，答案就在那裡。逆位：可能表示壓抑直覺或被表相蒙蔽。',
      'III 皇后': '正位：豐饒、母性、感官享受。你擁有創造與滋養的天賦。無論是家庭、事業或藝術創作，你都能讓事物開花結果。逆位：依賴、缺乏創造力或過度放縱。',
      'IV 皇帝': '正位：權威、結構、領導力。你是天生的領袖，能用秩序與紀律建立穩固的王國。逆位：專制、缺乏彈性或濫用權力。',
      'V 教皇': '正位：智慧導師、傳統、信仰。你適合教導他人或從導師處學習。遵循傳統智慧的引導。逆位：盲從、教條或反叛。',
      'VI 戀人': '正位：愛情、和諧、價值觀的選擇。重要關係正在成形。這不只是愛情，更關乎你內心價值觀的抉擇。逆位：分離、價值衝突或錯誤的選擇。',
      'VII 戰車': '正位：意志力、勝利、前進。透過堅強的意志與決心，你能克服一切障礙。逆位：失控、挫折或方向迷失。',
      'VIII 力量': '正位：內在力量、勇氣、耐心。真正的力量來自內心，以柔克剛。你有能力馴服人生的野獸。逆位：軟弱、自我懷疑或被情緒控制。',
      'IX 隱者': '正位：內省、智慧、獨處。現在是沉澱與思考的時刻。退一步，從更高視角審視你的人生。逆位：孤僻、退縮或拒絕指引。',
      'XI 正義': '正位：公正、因果、平衡。種什麼因得什麼果，現在是收成或承擔的時刻。保持公正客觀。逆位：不公平、逃避責任。',
      'XXI 世界': '正位：完成、圓滿、成就。你已走到一個重要里程碑。享受成功的喜悅，準備迎接下一個循環。逆位：未完成的課題或延遲。',
      '0 愚者': '正位：新的開始、冒險、無限可能。你正站在一個全新的起點，帶著赤子之心踏上未知的旅程。相信宇宙的安排。逆位：魯莽、不負責任。'
    };
    if (expanded[tarot.card]) parts.push(T(expanded[tarot.card]));

    // 與名字關聯
    if (enResult) {
      parts.push(L('【與你的名字】你的命運數字是' + destinyNumber + '，這張牌反映你人生旅程的核心課題。' +
        '當你在人生重要關頭需要指引時，可以回想這張牌的智慧。',
        '[Your name] Your Destiny Number is ' + destinyNumber + ', and this card reflects the core lesson of your life journey. ' +
        'When you need guidance at an important moment, recall the wisdom of this card.'));
    }

    return parts.join('\n\n');
  }

  // ========== 卡巴拉生命樹 ==========
  function getKabbalahReading(chaldeanNum) {
    var sephiroth = {
      1:{n:'Kether 王冠',desc:'至高神性，純粹的意志與存在的本源。你與宇宙源頭有直接連結，具有強大的開創力。',color:'白'},
      2:{n:'Chokmah 智慧',desc:'原始的創造能量，直覺的洞察。你擁有超乎常人的直覺力與宏觀視野。',color:'灰'},
      3:{n:'Binah 理解',desc:'形式的塑造者，將靈感轉化為結構。你擅長將抽象概念變成具體計劃。',color:'黑'},
      4:{n:'Chesed 慈悲',desc:'擴張與恩典，無條件的給予。你是天生的施予者，慷慨大方。',color:'藍'},
      5:{n:'Geburah 力量',desc:'紀律與勇氣，打破舊有限制。你擁有克服困難的強大意志力。',color:'紅'},
      6:{n:'Tiphareth 美麗',desc:'和諧與平衡，心靈的中心。你追求內在與外在的平衡與美。',color:'金'},
      7:{n:'Netzach 勝利',desc:'情感與藝術，永不放棄的精神。你被藝術、愛與美所驅動。',color:'綠'},
      8:{n:'Hod 榮耀',desc:'智慧與溝通，邏輯與語言的力量。你擁有條理分明的思維。',color:'橙'},
      9:{n:'Yesod 基礎',desc:'潛意識與夢境，連接物質與靈性的橋樑。你的直覺極強。',color:'紫'},
      10:{n:'Malkuth 王國',desc:'物質世界的實現，將一切靈性落實為具體成果。你擅長把理想變成看得見的成果。',color:'褐'}
    };
    // 大師數（11/22/33）化簡後才對應質點：11→2、22→4、33→6
    var base = chaldeanNum;
    var isMaster = chaldeanNum === 11 || chaldeanNum === 22 || chaldeanNum === 33;
    if (isMaster) base = chaldeanNum === 11 ? 2 : chaldeanNum === 22 ? 4 : 6;
    var s = sephiroth[base] || sephiroth[9];
    var head = isMaster
      ? L('【卡巴拉生命樹】' + chaldeanNum + ' 屬大師數，化簡為 ' + base + '，對應生命之樹的「' + s.n + '」質點。',
        '[Kabbalah Tree of Life] ' + chaldeanNum + ' is a master number; reduced to ' + base + ', it corresponds to the sephirah ' + T(s.n) + '. ')
      : L('【卡巴拉生命樹】數字' + chaldeanNum + '對應生命之樹的「' + s.n + '」質點。',
        '[Kabbalah Tree of Life] The number ' + chaldeanNum + ' corresponds to the sephirah ' + T(s.n) + '. ');
    return head + T(s.desc) + L(' 代表色：' + s.color + '。', ' Color: ' + T(s.color + '色') + '.');
  }

  // ---------- 生命之樹的 22 條路徑與四個世界（金色黎明系統） ----------
  // 質點名稱與所屬世界：依 YHVH 四字母對應 — Yod→Chokmah（Kether 為 Yod 之尖）、Heh→Binah、Vav→Chesed～Yesod、末 Heh→Malkuth
  var SEPH = {
    1: { n: 'Kether 王冠', w: 0 }, 2: { n: 'Chokmah 智慧', w: 0 }, 3: { n: 'Binah 理解', w: 1 },
    4: { n: 'Chesed 慈悲', w: 2 }, 5: { n: 'Geburah 力量', w: 2 }, 6: { n: 'Tiphareth 美麗', w: 2 },
    7: { n: 'Netzach 勝利', w: 2 }, 8: { n: 'Hod 榮耀', w: 2 }, 9: { n: 'Yesod 基礎', w: 2 }, 10: { n: 'Malkuth 王國', w: 3 }
  };
  // 三柱：嚴厲之柱（左）、慈悲之柱（右）、平衡之柱（中）
  var PILLAR = { 1: '平衡之柱', 6: '平衡之柱', 9: '平衡之柱', 10: '平衡之柱', 2: '慈悲之柱', 4: '慈悲之柱', 7: '慈悲之柱', 3: '嚴厲之柱', 5: '嚴厲之柱', 8: '嚴厲之柱' };

  var WORLDS = [
    { n: 'Atziluth 原型界', el: '火', yhvh: 'Yod', suit: '權杖', desc: '純粹的意志與起心動念，事情還只是「想要」的火花。' },
    { n: 'Briah 創造界', el: '水', yhvh: 'Heh', suit: '聖杯', desc: '理解與構想，把火花孕育成可以感受的形狀。' },
    { n: 'Yetzirah 形成界', el: '風', yhvh: 'Vav', suit: '寶劍', desc: '思想、情感與計畫的世界，事情在心裡反覆成形。' },
    { n: 'Assiah 行動界', el: '土', yhvh: '末 Heh', suit: '錢幣', desc: '物質與行動，把一切落實成看得見的結果。' }
  ];
  var EL_WORLD = { '火': 0, '水': 1, '風': 2, '土': 3 };

  // 22 條路徑（11–32）：希伯來字母、連接的質點、大阿爾克那（Rider-Waite 牌序，與本站塔羅一致）、
  // 《形成之書》分類（母字母＝元素、雙字母＝行星、單字母＝星座）與元素
  var PATHS = [
    { p: 11, h: 'א', l: 'Aleph', a: 1, b: 2, t: '0 愚者', kind: '母', attr: '風', el: '風' },
    { p: 12, h: 'ב', l: 'Beth', a: 1, b: 3, t: 'I 魔術師', kind: '雙', attr: '水星', el: '' },
    { p: 13, h: 'ג', l: 'Gimel', a: 1, b: 6, t: 'II 女祭司', kind: '雙', attr: '月亮', el: '' },
    { p: 14, h: 'ד', l: 'Daleth', a: 2, b: 3, t: 'III 皇后', kind: '雙', attr: '金星', el: '' },
    { p: 15, h: 'ה', l: 'Heh', a: 2, b: 6, t: 'IV 皇帝', kind: '單', attr: '牡羊座', el: '火' },
    { p: 16, h: 'ו', l: 'Vav', a: 2, b: 4, t: 'V 教皇', kind: '單', attr: '金牛座', el: '土' },
    { p: 17, h: 'ז', l: 'Zayin', a: 3, b: 6, t: 'VI 戀人', kind: '單', attr: '雙子座', el: '風' },
    { p: 18, h: 'ח', l: 'Cheth', a: 3, b: 5, t: 'VII 戰車', kind: '單', attr: '巨蟹座', el: '水' },
    { p: 19, h: 'ט', l: 'Teth', a: 4, b: 5, t: 'VIII 力量', kind: '單', attr: '獅子座', el: '火' },
    { p: 20, h: 'י', l: 'Yod', a: 4, b: 6, t: 'IX 隱者', kind: '單', attr: '處女座', el: '土' },
    { p: 21, h: 'כ', l: 'Kaph', a: 4, b: 7, t: 'X 命運之輪', kind: '雙', attr: '木星', el: '' },
    { p: 22, h: 'ל', l: 'Lamed', a: 5, b: 6, t: 'XI 正義', kind: '單', attr: '天秤座', el: '風' },
    { p: 23, h: 'מ', l: 'Mem', a: 5, b: 8, t: 'XII 吊人', kind: '母', attr: '水', el: '水' },
    { p: 24, h: 'נ', l: 'Nun', a: 6, b: 7, t: 'XIII 死神', kind: '單', attr: '天蠍座', el: '水' },
    { p: 25, h: 'ס', l: 'Samekh', a: 6, b: 9, t: 'XIV 節制', kind: '單', attr: '射手座', el: '火' },
    { p: 26, h: 'ע', l: 'Ayin', a: 6, b: 8, t: 'XV 惡魔', kind: '單', attr: '摩羯座', el: '土' },
    { p: 27, h: 'פ', l: 'Peh', a: 7, b: 8, t: 'XVI 高塔', kind: '雙', attr: '火星', el: '' },
    { p: 28, h: 'צ', l: 'Tzaddi', a: 7, b: 9, t: 'XVII 星星', kind: '單', attr: '水瓶座', el: '風' },
    { p: 29, h: 'ק', l: 'Qoph', a: 7, b: 10, t: 'XVIII 月亮', kind: '單', attr: '雙魚座', el: '水' },
    { p: 30, h: 'ר', l: 'Resh', a: 8, b: 9, t: 'XIX 太陽', kind: '雙', attr: '太陽', el: '' },
    { p: 31, h: 'ש', l: 'Shin', a: 8, b: 10, t: 'XX 審判', kind: '母', attr: '火', el: '火' },
    { p: 32, h: 'ת', l: 'Tav', a: 9, b: 10, t: 'XXI 世界', kind: '雙', attr: '土星（兼屬土）', el: '土' }
  ];
  function sephShort(k) { var n = SEPH[k].n.split(' '); return L(n[1], n[0]); }

  var BY_LETTER = {};
  PATHS.forEach(function(x) { BY_LETTER[x.l] = x; });
  var KIND_TEXT = { '母': '母字母（元素）', '雙': '雙字母（行星）', '單': '單字母（星座）' };

  // 英文字母轉希伯來字母（金色黎明常用的轉寫對照）；先比對雙字母
  var DIGRAPH = { SH: ['Shin'], TH: ['Tav'], CH: ['Cheth'], PH: ['Peh'], TZ: ['Tzaddi'], TS: ['Tzaddi'], CK: ['Kaph'] };
  var SINGLE = {
    A: ['Aleph'], B: ['Beth'], C: ['Kaph'], D: ['Daleth'], E: ['Heh'], F: ['Peh'], G: ['Gimel'], H: ['Heh'], I: ['Yod'],
    J: ['Yod'], K: ['Kaph'], L: ['Lamed'], M: ['Mem'], N: ['Nun'], O: ['Ayin'], P: ['Peh'], Q: ['Qoph'], R: ['Resh'],
    S: ['Samekh'], T: ['Teth'], U: ['Vav'], V: ['Vav'], W: ['Vav'], X: ['Kaph', 'Samekh'], Y: ['Yod'], Z: ['Zayin']
  };

  /** 名字轉成希伯來字母序列：[{ src: 'SH', letter: 'Shin' }, ...]；軟音 C（接 E/I/Y）讀作 S → Samekh */
  function nameToHebrew(name) {
    var s = String(name || '').toUpperCase().replace(/[^A-Z]/g, ''), out = [];
    for (var i = 0; i < s.length; i++) {
      var two = s.substr(i, 2);
      if (two.length === 2 && DIGRAPH[two]) {
        DIGRAPH[two].forEach(function(l) { out.push({ src: two, letter: l }); });
        i++;
        continue;
      }
      var c = s[i];
      var ls = c === 'C' && /[EIY]/.test(s[i + 1] || '') ? ['Samekh'] : SINGLE[c];
      ls.forEach(function(l) { out.push({ src: c, letter: l }); });
    }
    return out;
  }

  /**
   * 生命之樹完整資料
   * @return { num, base, master, sephirah: { no, n, world, pillar }, adjacent: [path...],
   *           letters: [{ src, letter, path }], paths: [{ path, count, src }], kinds: { 母, 雙, 單 },
   *           worlds: [{ n, el, ..., count, share }], mainWorld }
   */
  function getKabbalahTree(chaldeanNum, name) {
    var base = chaldeanNum === 11 ? 2 : chaldeanNum === 22 ? 4 : chaldeanNum === 33 ? 6 : chaldeanNum;
    if (!SEPH[base]) base = 9;
    var seph = { no: base, n: SEPH[base].n, world: WORLDS[SEPH[base].w].n, pillar: PILLAR[base] };
    var adjacent = PATHS.filter(function(x) { return x.a === base || x.b === base; });

    var letters = nameToHebrew(name).map(function(x) { return { src: x.src, letter: x.letter, path: BY_LETTER[x.letter] }; });
    var tally = {};
    letters.forEach(function(x) {
      var t = tally[x.path.p] || (tally[x.path.p] = { path: x.path, count: 0, src: [] });
      t.count++;
      if (t.src.indexOf(x.src) < 0) t.src.push(x.src);
    });
    var paths = Object.keys(tally).map(function(k) { return tally[k]; })
      .sort(function(x, y) { return y.count - x.count || x.path.p - y.path.p; });

    var kinds = { '母': 0, '雙': 0, '單': 0 };
    var wc = [0, 0, 0, 0], withEl = 0;
    letters.forEach(function(x) {
      kinds[x.path.kind]++;
      if (x.path.el) { wc[EL_WORLD[x.path.el]]++; withEl++; }
    });
    var worlds = WORLDS.map(function(w, i) {
      return { n: w.n, el: w.el, yhvh: w.yhvh, suit: w.suit, desc: w.desc, count: wc[i], share: withEl ? wc[i] / withEl : 0 };
    });
    var mainWorld = null;
    if (withEl) {
      var max = Math.max.apply(null, wc);
      var tops = worlds.filter(function(w) { return w.count === max; });
      mainWorld = tops.length === 1 ? tops[0] : null;
    }
    return {
      num: chaldeanNum, base: base, master: base !== chaldeanNum && chaldeanNum >= 11,
      sephirah: seph, adjacent: adjacent, letters: letters, paths: paths, kinds: kinds,
      worlds: worlds, mainWorld: mainWorld, withElement: withEl
    };
  }

  // 生命之樹圖：質點座標（上為 Kether）
  var POS = { 1: [150, 30], 2: [250, 85], 3: [50, 85], 4: [250, 195], 5: [50, 195], 6: [150, 250], 7: [250, 305], 8: [50, 305], 9: [150, 360], 10: [150, 440] };

  /** 生命之樹 SVG：本命質點實心、名字走過的路徑加粗（次數越多越粗） */
  function getKabbalahTreeSVG(tree) {
    var used = {};
    (tree ? tree.paths : []).forEach(function(x) { used[x.path.p] = x.count; });
    var gold = 'var(--color-gold-primary, #D4A843)', dim = 'var(--color-text-muted, #8B7355)';
    var svg = '<svg viewBox="0 0 300 470" role="img" aria-label="' + L('生命之樹', 'Tree of Life') + '" style="width:100%;max-width:260px;display:block;margin:6px auto;">';
    PATHS.forEach(function(x) {
      var A = POS[x.a], B = POS[x.b], n = used[x.p] || 0;
      svg += '<line x1="' + A[0] + '" y1="' + A[1] + '" x2="' + B[0] + '" y2="' + B[1] + '" stroke="' + (n ? gold : dim) + '"'
        + ' stroke-width="' + (n ? Math.min(2 + n, 7) : 1) + '" stroke-opacity="' + (n ? 0.9 : 0.35) + '"><title>' + x.p + ' ' + x.l + ' ' + x.h + ' — ' + T(x.t) + (n ? L('（名字 ×' + n + '）', ' (name ×' + n + ')') : '') + '</title></line>';
      if (n) {
        var mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
        svg += '<text x="' + mx + '" y="' + (my + 4) + '" text-anchor="middle" font-size="13" fill="' + gold + '" stroke="var(--color-bg-card, #3D2218)" stroke-width="3" paint-order="stroke">' + x.h + '</text>';
      }
    });
    for (var k = 1; k <= 10; k++) {
      var P = POS[k], me = tree && tree.base === k;
      svg += '<circle cx="' + P[0] + '" cy="' + P[1] + '" r="17" fill="' + (me ? gold : 'var(--color-bg-card, #3D2218)') + '" stroke="' + gold + '" stroke-width="' + (me ? 3 : 1.5) + '"><title>' + k + ' ' + T(SEPH[k].n) + '</title></circle>';
      svg += '<text x="' + P[0] + '" y="' + (P[1] + 4) + '" text-anchor="middle" font-size="' + L(11, 8) + '" fill="' + (me ? 'var(--color-bg-deep, #1A0A0A)' : gold) + '">' + sephShort(k) + '</text>';
    }
    return svg + '</svg>';
  }

  /** 路徑與四個世界的文字解讀（純文字，以換行分段） */
  function getKabbalahPathsReading(tree) {
    if (!tree) return '';
    var parts = [];
    var s = tree.sephirah;
    parts.push(L('【本命質點】' + s.n + '：位於' + s.pillar + '，屬於' + s.world + '。與它相連的路徑有 ' + tree.adjacent.length + ' 條：'
      + tree.adjacent.map(function(x) { return x.l + '（' + x.t + '）'; }).join('、') + '。',
      '[Your sephirah] ' + T(s.n) + ': on the ' + T(s.pillar) + ', in ' + T(s.world) + '. ' + tree.adjacent.length + ' paths connect to it: '
      + tree.adjacent.map(function(x) { return x.l + ' (' + T(x.t) + ')'; }).join(', ') + '.'));
    if (tree.paths.length) {
      parts.push(L('【名字走過的路徑】依金色黎明的轉寫，名字的字母化為 ' + tree.letters.length + ' 個希伯來字母，走過 ' + tree.paths.length + ' 條路徑：',
        '[Paths your name walks] Using the Golden Dawn transliteration, your name becomes ' + tree.letters.length + ' Hebrew letters walking ' + tree.paths.length + ' paths:'));
      parts.push(tree.paths.map(function(x) {
        var p = x.path;
        return L('・路徑 ' + p.p + ' ' + p.h + ' ' + p.l + '（' + x.src.join('/') + (x.count > 1 ? '，×' + x.count : '') + '）：'
          + sephShort(p.a) + '↔' + sephShort(p.b) + '，' + KIND_TEXT[p.kind] + '・' + p.attr + '，塔羅「' + p.t + '」',
          '・Path ' + p.p + ' ' + p.h + ' ' + p.l + ' (' + x.src.join('/') + (x.count > 1 ? ', ×' + x.count : '') + '): '
          + sephShort(p.a) + '↔' + sephShort(p.b) + ', ' + T(KIND_TEXT[p.kind]) + ' · ' + T(p.attr) + ', tarot "' + T(p.t) + '"');
      }).join('\n'));
      var top = tree.paths[0];
      if (top.count > 1 && (tree.paths.length === 1 || tree.paths[1].count < top.count)) {
        parts.push(L('名字最常走的是路徑 ' + top.path.p + '（' + top.path.l + '，' + top.path.t + '），這條路的課題在你的名字裡反覆出現。',
          'Your name walks path ' + top.path.p + ' (' + top.path.l + ', ' + T(top.path.t) + ') most often — its lesson keeps returning in your name.'));
      }
      if (tree.adjacent.some(function(x) { return x.p === top.path.p; })) {
        parts.push(L('這條路徑正好連到你的本命質點，名字與靈數指向同一處。', 'This path connects directly to your sephirah — your name and your number point to the same place.'));
      }
      var k = tree.kinds;
      parts.push(L('字母分類：母字母 ' + k['母'] + '、雙字母 ' + k['雙'] + '、單字母 ' + k['單'] + '。', 'Letter types: ' + k['母'] + ' mother, ' + k['雙'] + ' double, ' + k['單'] + ' simple. ')
        + (k['母'] > k['雙'] && k['母'] > k['單'] ? L('母字母偏多，名字帶著較強的元素性、根本性的力量。', 'Mostly mother letters: your name carries strong elemental, fundamental force.')
          : k['雙'] > k['母'] && k['雙'] > k['單'] ? L('雙字母偏多，名字與行星的兩面性（剛柔、順逆）連結較深。', 'Mostly double letters: your name is closely tied to the two-sidedness of the planets (hard and soft, direct and retrograde).')
          : k['單'] > k['母'] && k['單'] > k['雙'] ? L('單字母偏多，名字的能量偏向星座所代表的日常性格與節奏。', 'Mostly simple letters: your name leans toward the everyday temperament and rhythm of the zodiac signs.') : ''));
    }
    parts.push(L('【四個世界】', '[The Four Worlds]'));
    parts.push(tree.worlds.map(function(w) {
      return L('・' + w.n + '（' + w.el + '・' + w.yhvh + '・' + w.suit + '）' + (tree.withElement ? '：名字 ' + w.count + ' 個字母' : '') + ' — ' + w.desc,
        '・' + T(w.n) + ' (' + T(w.el) + ' · ' + T(w.yhvh) + ' · ' + T(w.suit) + ')' + (tree.withElement ? ': ' + w.count + ' letter' + (w.count === 1 ? '' : 's') + ' in your name' : '') + ' — ' + T(w.desc));
    }).join('\n'));
    if (tree.mainWorld) {
      parts.push(L('名字的元素最集中在「' + tree.mainWorld.n + '」，你最自在的層次是' + tree.mainWorld.desc.replace(/。$/, '') + '。'
        + (tree.mainWorld.n !== s.world ? '本命質點則在' + s.world + '，兩個層次之間的落差，就是你成長的方向。' : '與本命質點同一個世界，內外一致。'),
        'Your name\'s elements gather most in ' + T(tree.mainWorld.n) + ' — the level where you feel most at home: ' + T(tree.mainWorld.desc).replace(/\.$/, '') + '. '
        + (tree.mainWorld.n !== s.world ? 'Your sephirah sits in ' + T(s.world) + '; the gap between the two levels is your direction of growth.' : 'It is the same world as your sephirah — inner and outer are aligned.')));
    } else if (tree.withElement) {
      var max = Math.max.apply(null, tree.worlds.map(function(w) { return w.count; }));
      var tied = tree.worlds.filter(function(w) { return w.count === max; });
      parts.push(tied.length === 4
        ? L('名字的元素平均分布在四個世界，沒有特別偏重的層次。', 'Your name\'s elements are spread evenly across the four worlds, with no level standing out.')
        : L('名字的元素在' + tied.map(function(w) { return '「' + w.n + '」'; }).join('與') + '並列最多，這幾個層次對你同樣重要。',
          'Your name\'s elements are tied between ' + tied.map(function(w) { return T(w.n); }).join(' and ') + ' — these levels matter equally to you.'));
    }
    parts.push(L('（字母轉寫與四個世界的劃分依金色黎明系統；不同流派的對應略有差異，僅供參考。）', '(Transliteration and the division into four worlds follow the Golden Dawn system; other schools differ slightly. For reference only.)'));
    return parts.join('\n');
  }

  // ========== 公開 API ==========
  return {
    getHexagramDeepReading: getHexagramDeepReading,
    getTarotDeepReading: getTarotDeepReading,
    getKabbalahReading: getKabbalahReading,
    getKabbalahTree: getKabbalahTree,
    getKabbalahTreeSVG: getKabbalahTreeSVG,
    getKabbalahPathsReading: getKabbalahPathsReading,
    KABBALAH_PATHS: PATHS,
    nameToHebrew: nameToHebrew,
    getPersonalGuidance: getPersonalGuidance
  };
})();
