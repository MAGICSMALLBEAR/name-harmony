/**
 * 深度詳解引擎 — 易經爻辭 + 塔羅詳解 + 卡巴拉生命樹 + 擴充解讀
 */
window.DeepReadings = (function() {

  // ========== 易經爻辭擴充 ==========
  function getHexagramDeepReading(hexResult, cnResult) {
    if (!hexResult) return '';
    var parts = [];
    var hex = hexResult;

    parts.push('【卦象解讀】' + hex.hexUnicode + ' ' + hex.hexName);
    parts.push('本卦「' + hex.hexName + '」五行屬' + hex.element + '，判為' + hex.glory + '。');
    parts.push(hex.description);

    // 爻辭解讀
    var yaoReadings = getYaoReading(hex.hexIndex, hex.movingYao);
    if (yaoReadings) {
      parts.push('【動爻解析 — 第' + hex.movingYao + '爻】');
      parts.push(yaoReadings);
    }

    // 變卦（動爻陰陽翻轉）
    var changedHex = getChangedHexagram(hex);
    if (changedHex) {
      parts.push('【變卦】' + changedHex.u + ' ' + changedHex.n + '（' + changedHex.g + '）');
      parts.push('此卦代表事情發展的趨勢與結果：' + changedHex.d);
    }

    // 人生指引
    parts.push('【對你的啟示】');
    parts.push(getPersonalGuidance(hex.glory, cnResult));

    return parts.join('\n\n');
  }

  /** 動爻爻辭：原文＋白話（js/data/iching-yao.js）；資料未載入時退回爻位解讀 */
  function getYaoReading(hexIdx, yao) {
    var lines = window.IChingYao && window.IChingYao[hexIdx];
    var y = lines && lines[yao - 1];
    if (y) return y[0] + '：' + y[1] + '\n白話：' + y[2];
    return '（爻辭資料未載入，以下依爻位解讀）' + YAO_POSITION[yao];
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

  function getChangedHexagram(hexResult) {
    if (!hexResult) return null;
    if (window.IChing && window.IChing.changedHexagram) return window.IChing.changedHexagram(hexResult);
    return null;
  }

  function getPersonalGuidance(glory, cnResult) {
    var guides = {
      '大吉': '這是一個極為吉利的卦象。命運正處於上升期，現在是展開新計劃、建立新關係的最佳時機。你的名字筆劃所起的卦與你的命格高度契合，建議把握當下的好運，勇敢前行。',
      '吉': '整體卦象吉祥，雖然不是完美無缺，但主流是好的。建議在順利時也保持警惕，不要在順境中放鬆警覺。你的名字與此卦的能量相容，可以信賴自己的直覺。',
      '平': '卦象平穩，沒有大起大落。這是一個適合耕耘而非收穫的時期。建議踏實地做好每件小事，累積實力。' + (cnResult ? '你的人格「' + cnResult.grids.ren.name + '」為' + cnResult.grids.ren.number + '劃，建議多加發揮' + cnResult.grids.ren.element + '屬性的優勢。' : ''),
      '凶': '卦象警示較多阻礙，但易經的核心精神是「變易」— 凶中可以轉吉。現在最重要的是保持耐心與冷靜，不要做重大決定。靜待時機，凶象自然會過去。'
    };
    return guides[glory] || guides['平'];
  }

  // ========== 塔羅詳解 ==========
  function getTarotDeepReading(destinyNumber, enResult) {
    var tarot = window.FunExtras ? window.FunExtras.getTarot(destinyNumber) : null;
    if (!tarot) return '';

    var parts = [];
    parts.push('【塔羅本命牌】' + tarot.e + ' ' + tarot.card);

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
    if (expanded[tarot.card]) parts.push(expanded[tarot.card]);

    // 與名字關聯
    if (enResult) {
      parts.push('【與你的名字】你的命運數字是' + destinyNumber + '，這張牌反映你人生旅程的核心課題。' +
        '當你在人生重要關頭需要指引時，可以回想這張牌的智慧。');
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
      ? '【卡巴拉生命樹】' + chaldeanNum + ' 屬大師數，化簡為 ' + base + '，對應生命之樹的「' + s.n + '」質點。'
      : '【卡巴拉生命樹】數字' + chaldeanNum + '對應生命之樹的「' + s.n + '」質點。';
    return head + s.desc + ' 代表色：' + s.color + '。';
  }

  // ========== 公開 API ==========
  return {
    getHexagramDeepReading: getHexagramDeepReading,
    getTarotDeepReading: getTarotDeepReading,
    getKabbalahReading: getKabbalahReading,
    getPersonalGuidance: getPersonalGuidance
  };
})();
