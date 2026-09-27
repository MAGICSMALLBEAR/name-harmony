/**
 * 外國人取中文名：英文名 + 個性 → 音義兼顧的中文名，附五格與諧音檢查
 * 需要：js/data/english-translit.js、js/data/pinyin-db.js、js/data/stroke-db.js、js/chinese-numerology.js、js/phonetics.js
 */
window.ForeignName = (function() {

  // 取名用字：字|意義|個性標籤（逗號分隔）|性別傾向（m 男、f 女、n 中性）
  var CHAR_DATA = [
    '安|平安、安定|和平|n', '岸|河岸、穩重|堅毅|m', '昂|昂揚、振奮|勇敢|m', '艾|美好、艾草|美麗|f', '愛|仁愛、愛心|仁慈|f',
    '雅|高雅、文雅|美麗|f', '奧|深奧、奧妙|智慧|m', '歐|歐洲、遼闊|自由|n', '恩|恩惠、感恩|仁慈|n', '爾|如此、自在|自由|n',
    '伊|伊人、美好|美麗|f', '怡|和悅、愉快|快樂|f', '依|依戀、溫順|溫柔|f', '宜|合宜、適當|和平|n', '儀|儀態、風度|美麗|f',
    '逸|安逸、超逸|自由|m', '藝|才藝|創意|n', '英|英傑、英華|勇敢,成功|n', '瑛|美玉的光彩|美麗|f', '穎|聰穎|智慧|n',
    '盈|充盈、圓滿|成功|f', '瑩|晶瑩|美麗|f', '映|映照|光明|n', '友|友誼|仁慈|n', '佑|保佑|仁慈|n',
    '悠|悠然|自由|n', '宇|宇宙、氣宇|自由|m', '羽|羽翼|自由|n', '雨|雨露|自然|f', '語|言語、善言|智慧|f',
    '玉|美玉|美麗|f', '育|培育|仁慈|n', '裕|富裕|成功|n', '元|開始、第一|成功|m', '媛|美女|美麗|f',
    '遠|遠大|成功|m', '緣|緣分|和平|f', '月|明月|美麗,自然|f', '悅|喜悅|快樂|f', '越|超越|成功|m',
    '雲|白雲|自由,自然|n', '允|允諾、誠信|正直|n', '韻|韻味|美麗|f', '蘊|蘊涵|智慧|n', '文|文采|智慧|n',
    '雯|雲彩花紋|美麗|f', '偉|偉大|成功|m', '維|維繫、維護|堅毅|m', '薇|薔薇|美麗|f', '蔚|茂盛、蔚藍|自然|n',
    '威|威武|勇敢|m', '婉|溫婉|溫柔|f', '望|希望|光明|n', '旺|興旺|成功|m', '武|英武|勇敢|m',
    '悟|領悟|智慧|m', '舞|舞蹈|創意|f', '溫|溫和|溫柔|n', '穩|穩重|堅毅|m', '柏|柏樹、長青|堅毅|m',
    '博|博學|智慧|m', '伯|長者、伯仲|正直|m', '寶|珍寶|美麗|n', '貝|寶貝|美麗|f', '蓓|花蕾|美麗|f',
    '斌|文武雙全|智慧|m', '彬|文質彬彬|正直|m', '冰|冰清玉潔|正直|f', '秉|秉持|正直|m', '碧|碧玉|美麗|f',
    '沛|充沛|成功|m', '佩|佩玉、敬佩|美麗|f', '培|培育|仁慈|n', '鵬|大鵬|自由,勇敢|m', '平|平安|和平|n',
    '萍|浮萍|自然|f', '品|品格|正直|n', '樸|樸實|正直|m', '普|普照|光明|m', '美|美好|美麗|f',
    '梅|梅花|堅毅|f', '邁|邁進|勇敢|m', '曼|柔美|溫柔|f', '蔓|蔓延、生機|自然|f', '茂|茂盛|成功|m',
    '敏|敏捷|智慧|n', '明|光明|光明,智慧|n', '銘|銘記|正直|m', '蜜|甜蜜|快樂|f', '沐|沐浴、潤澤|和平|n',
    '牧|牧者|自然|m', '慕|仰慕|溫柔|n', '芳|芬芳|美麗|f', '菲|花草茂盛|美麗|f', '斐|有文采|創意|n',
    '飛|飛翔|自由|m', '豐|豐盛|成功|m', '楓|楓葉|自然|n', '峰|山峰|堅毅|m', '福|福氣|快樂|n',
    '芙|芙蓉|美麗|f', '帆|船帆|自由|m', '凡|非凡|自由|n', '方|方正|正直|m', '達|通達|成功|m',
    '黛|眉黛|美麗|f', '丹|赤誠|正直|n', '德|品德|正直,仁慈|m', '迪|啟迪|智慧|m', '蒂|花蒂|美麗|f',
    '定|安定|和平|m', '東|東方、日出|光明|m', '冬|冬天|自然|n', '朵|花朵|美麗|f', '泰|安泰|和平|m',
    '天|天空|自由|n', '恬|恬靜|溫柔|f', '婷|亭亭玉立|美麗|f', '庭|家庭、庭院|和平|n', '廷|朝廷|成功|m',
    '彤|紅霞、彤雲|光明|f', '桐|梧桐|自然|n', '濤|波濤|勇敢|m', '韜|韜略|智慧|m', '騰|飛騰|成功|m',
    '娜|婀娜|美麗|f', '楠|楠木|堅毅|n', '寧|安寧|和平|n', '凝|凝聚|堅毅|f', '妮|女孩|美麗|f',
    '念|思念|溫柔|f', '諾|承諾|正直|n', '蘭|蘭花|美麗|f', '朗|明朗|光明|m', '樂|快樂|快樂|n',
    '雷|雷霆|勇敢|m', '蕾|花蕾|美麗|f', '磊|光明磊落|正直|m', '黎|黎明|光明|n', '麗|美麗|美麗|f',
    '莉|茉莉|美麗|f', '立|自立|堅毅|m', '力|力量|勇敢|m', '理|道理|智慧|m', '禮|禮儀|正直|n',
    '蓮|蓮花|正直|f', '廉|廉潔|正直|m', '良|善良|仁慈|n', '亮|明亮|光明|m', '琳|美玉|美麗|f',
    '霖|甘霖|仁慈|n', '玲|玉聲|美麗|f', '凌|凌雲|自由|n', '靈|靈巧|智慧|f', '露|露水|自然|f',
    '璐|美玉|美麗|f', '倫|倫理|正直|m', '綸|經綸|智慧|m', '洛|洛水|自然|n', '格|品格|正直|m',
    '歌|歌聲|快樂|f', '戈|干戈|勇敢|m', '國|國家|成功|m', '光|光明|光明|m', '廣|廣闊|自由|m',
    '桂|桂花|美麗|n', '貴|尊貴|成功|n', '冠|冠軍|成功|m', '剛|剛強|堅毅|m', '高|高遠|成功|m',
    '耕|耕耘|堅毅|m', '凱|凱旋|成功,勇敢|m', '楷|楷模|正直|m', '開|開朗|快樂|m', '康|健康|快樂|n',
    '可|可愛|快樂|f', '克|克服|堅毅|m', '坤|大地|堅毅|m', '寬|寬厚|仁慈|m', '奎|奎星、文星|智慧|m',
    '海|大海|自由,自然|m', '涵|涵養|智慧|n', '晗|天將明|光明|n', '翰|翰墨|智慧|m', '漢|漢子|勇敢|m',
    '豪|豪邁|勇敢|m', '浩|浩大|自由|m', '皓|潔白明亮|光明|m', '和|和諧|和平|n', '禾|禾苗|自然|n',
    '荷|荷花|美麗|f', '恆|恆心|堅毅|m', '宏|宏大|成功|m', '弘|弘揚|成功|m', '鴻|鴻鵠|自由|m',
    '虹|彩虹|美麗|f', '華|華麗、中華|美麗,成功|n', '樺|樺木|自然|n', '輝|光輝|光明|m', '慧|智慧|智慧|f',
    '惠|恩惠|仁慈|f', '卉|花卉|美麗|f', '佳|美好|美麗|f', '嘉|嘉美|快樂|n', '家|家庭|和平|n',
    '傑|傑出|成功|m', '潔|純潔|正直|f', '捷|敏捷|智慧|m', '晶|晶瑩|美麗|f', '靜|文靜|溫柔|f',
    '敬|尊敬|正直|n', '婕|美好|美麗|f', '金|黃金|成功|m', '錦|錦繡|美麗|f', '瑾|美玉|美麗|f',
    '君|君子|正直|n', '俊|俊秀|美麗|m', '駿|駿馬|勇敢|m', '娟|秀美|美麗|f', '建|建立|成功|m',
    '健|健康|堅毅|m', '劍|寶劍|勇敢|m', '琪|美玉|美麗|f', '祺|吉祥|快樂|n', '奇|奇特|創意|n',
    '啟|啟發|智慧|m', '綺|美麗的絲織品|美麗|f', '倩|美好|美麗|f', '謙|謙虛|正直|m', '強|強大|勇敢|m',
    '喬|高大|成功|n', '琴|琴瑟|美麗|f', '勤|勤奮|堅毅|n', '晴|晴朗|光明,快樂|f', '清|清澈|正直|n',
    '慶|喜慶|快樂|n', '秋|秋天|自然|f', '泉|泉水|自然|n', '希|希望|光明|n', '曦|晨光|光明|f',
    '熙|光明、興盛|光明|n', '喜|喜悅|快樂|n', '夏|夏天|自然|n', '霞|彩霞|美麗|f', '祥|吉祥|快樂|n',
    '翔|飛翔|自由|m', '香|芳香|美麗|f', '曉|拂曉、明白|智慧,光明|n', '孝|孝順|仁慈|n', '笑|笑容|快樂|f',
    '欣|欣喜|快樂|f', '心|心靈|溫柔|f', '信|誠信|正直|m', '星|星辰|光明|n', '興|興盛|成功|m',
    '雄|雄壯|勇敢|m', '修|修養|正直|m', '秀|秀麗|美麗|f', '軒|氣宇軒昂|勇敢|m', '萱|萱草|溫柔|f',
    '璇|美玉|美麗|f', '學|學問|智慧|n', '雪|白雪|正直|f', '遜|謙遜|正直|m', '真|真誠|正直|n',
    '珍|珍貴|美麗|f', '正|正直|正直|m', '志|志向|堅毅|m', '智|智慧|智慧|m', '致|致力|堅毅|m',
    '中|中正|正直|m', '忠|忠誠|正直|m', '舟|小舟|自由|m', '珠|珍珠|美麗|f', '卓|卓越|成功|m',
    '哲|哲理|智慧|m', '振|振興|成功|m', '臻|至善|成功|n', '展|展翅|自由|m', '昭|昭明|光明|m',
    '晨|早晨|光明|n', '辰|星辰|光明|n', '承|承擔|堅毅|m', '誠|誠實|正直|n', '澄|清澈|正直|n',
    '春|春天|自然|n', '純|純真|正直|f', '楚|楚楚動人|美麗|n', '暢|暢快|快樂|m', '超|超越|成功|m',
    '川|河川|自然|m', '創|創造|創意|m', '善|善良|仁慈|n', '紹|繼承|堅毅|m', '舒|舒展|自由|f',
    '書|書香|智慧|n', '淑|賢淑|溫柔|f', '順|順利|和平|n', '碩|碩大|成功|m', '詩|詩歌|創意,美麗|f',
    '盛|興盛|成功|m', '勝|勝利|成功|m', '聖|神聖|正直|m', '尚|崇尚|正直|m', '珊|珊瑚|美麗|f',
    '杉|杉木|自然|m', '深|深遠|智慧|m', '紳|紳士|正直|m', '然|自然|自然|n', '仁|仁愛|仁慈|m',
    '榮|光榮|成功|n', '容|包容|仁慈|f', '蓉|芙蓉|美麗|f', '瑞|祥瑞|快樂|n', '睿|睿智|智慧|n',
    '潤|潤澤|仁慈|n', '若|若水、柔和|溫柔|f', '儒|儒雅|智慧|m', '如|如意|快樂|f', '澤|恩澤|仁慈|m',
    '子|君子|正直|n', '紫|紫色|美麗|f', '梓|梓樹、故鄉|自然|n', '宗|宗師|正直|m', '尊|尊貴|成功|m',
    '才|才華|智慧|m', '彩|色彩|創意|f', '燦|燦爛|光明|n', '采|風采|美麗|n', '策|策略|智慧|m',
    '聰|聰明|智慧|n', '翠|翠綠|自然|f', '璀|璀璨|光明|f', '思|思考|智慧|n', '斯|斯文|正直|m',
    '絲|絲綢|溫柔|f', '颯|颯爽|勇敢|f', '森|森林|自然|m', '松|松樹|堅毅|m', '頌|歌頌|快樂|n',
    '素|樸素|正直|f', '蘇|甦醒|自然|n', '穗|稻穗|成功|f', '陽|陽光|光明|m', '洋|海洋|自由|m',
    '揚|飛揚|自由|m', '瑤|美玉|美麗|f', '耀|光耀|光明|m', '燁|光輝|光明|n', '業|事業|成功|m',
    '雁|大雁|自由|f', '硯|硯台|智慧|m', '妍|美麗|美麗|f', '言|言語|智慧|n', '延|延續|堅毅|n',
    '嫣|嫣然|美麗|f', '燕|燕子|自由|f', '岩|岩石|堅毅|m', '音|音樂|創意|f', '茵|綠茵|自然|f',
    '銀|白銀|成功|n', '胤|後代|成功|m', '永|永恆|堅毅|m', '勇|勇敢|勇敢|m', '詠|歌詠|創意|n',
    '雍|雍容|和平|n', '克|克服|堅毅|m', '司|主持|正直|m', '瑪|瑪瑙|美麗|f', '麥|麥穗|自然|m',
    '馬|駿馬|勇敢|m', '莎|莎草|溫柔|f', '絲|絲綢|溫柔|f', '妮|女孩|美麗|f', '琳|美玉|美麗|f'
  ];

  var TRAITS = ['智慧', '勇敢', '溫柔', '快樂', '正直', '美麗', '成功', '和平', '自由', '創意', '仁慈', '堅毅', '光明', '自然'];

  // 常見英文姓氏 → 中文姓
  var SURNAME_TABLE = {
    SMITH: '史', JOHNSON: '江', WILLIAMS: '韋', BROWN: '白', JONES: '鍾', GARCIA: '賈', MILLER: '米', DAVIS: '戴',
    RODRIGUEZ: '羅', MARTINEZ: '馬', HERNANDEZ: '何', LOPEZ: '盧', GONZALEZ: '龔', WILSON: '魏', ANDERSON: '安',
    THOMAS: '湯', TAYLOR: '戴', MOORE: '穆', JACKSON: '賈', MARTIN: '馬', LEE: '李', PEREZ: '裴', THOMPSON: '湯',
    WHITE: '懷', HARRIS: '何', SANCHEZ: '孫', CLARK: '柯', RAMIREZ: '雷', LEWIS: '劉', ROBINSON: '羅', WALKER: '華',
    YOUNG: '楊', ALLEN: '艾', KING: '金', WRIGHT: '賴', SCOTT: '司', TORRES: '陶', NGUYEN: '阮', HILL: '席',
    FLORES: '傅', GREEN: '葛', ADAMS: '安', NELSON: '倪', BAKER: '貝', HALL: '霍', RIVERA: '黎', CAMPBELL: '康',
    MITCHELL: '梅', CARTER: '柯', ROBERTS: '羅', PHILLIPS: '費', EVANS: '艾', TURNER: '滕', PARKER: '裴',
    COLLINS: '柯', EDWARDS: '艾', STEWART: '司徒', MORRIS: '莫', MURPHY: '莫', COOK: '顧', ROGERS: '羅',
    MORGAN: '莫', PETERSON: '畢', COOPER: '顧', REED: '芮', BAILEY: '貝', BELL: '貝', GOMEZ: '高', KELLY: '柯',
    HOWARD: '霍', WARD: '華', COX: '高', DIAZ: '狄', RICHARDSON: '黎', WOOD: '伍', WATSON: '華', BROOKS: '卜',
    BENNETT: '貝', GRAY: '葛', GREY: '葛', JAMES: '詹', REYES: '雷', HUGHES: '胡', PRICE: '蒲', MYERS: '麥',
    LONG: '龍', FOSTER: '傅', SANDERS: '孫', ROSS: '羅', SULLIVAN: '蘇', RUSSELL: '盧', ORTIZ: '歐',
    JENKINS: '簡', PERRY: '裴', BUTLER: '柏', BARNES: '班', FISHER: '費', HENDERSON: '韓', COLEMAN: '柯',
    SIMMONS: '施', PATTERSON: '潘', JORDAN: '喬', REYNOLDS: '雷', HAMILTON: '韓', GRAHAM: '葛', WALLACE: '華',
    WEST: '衛', OWENS: '歐', MARSHALL: '馬', GIBSON: '吉', ELLIS: '艾', STONE: '石', FOX: '霍', MILLS: '麥',
    GRANT: '葛', LYNCH: '林', SHAW: '蕭', DEAN: '丁', DUNN: '鄧', BURKE: '柏', WAGNER: '華', WEBER: '韋',
    SCHMIDT: '施', MULLER: '穆', MUELLER: '穆', FISCHER: '費', MEYER: '梅', BECKER: '貝', HOFFMANN: '霍',
    SCHULZ: '舒', ZIMMERMANN: '齊', LANGE: '郎', DUBOIS: '杜', BERNARD: '柏', DURAND: '杜', MOREAU: '莫',
    LAURENT: '羅', SIMON: '席', ROSSI: '羅', RUSSO: '魯', FERRARI: '費', BIANCHI: '畢', ROMANO: '羅',
    RICCI: '李', KIM: '金', PARK: '朴', CHEN: '陳', WANG: '王', LI: '李', ZHANG: '張', LIU: '劉', WONG: '黃', CHAN: '陳'
  };

  // 可用於音譯的中文姓（依發音比對）
  var SURNAMES = '艾安班白包貝畢卞柏卜蔡曹岑陳程崔戴鄧丁董杜范方費馮傅高葛龔顧郭韓杭何賀洪胡華黃霍吉賈簡江金柯孔賴藍郎雷黎李連梁林凌劉龍盧陸魯羅呂馬麥梅孟米苗莫穆倪聶歐潘裴彭蒲齊錢喬秦邱任芮阮沙施石史舒司宋蘇孫譚湯唐陶田萬汪王韋衛魏溫吳伍武席夏蕭謝辛熊徐許薛嚴顏楊姚葉易殷尹于余俞袁岳曾詹張趙鄭鍾周朱莊卓';

  // ---------- 發音比對 ----------
  var PY_RE = /^(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw]?)([a-zv]+?)([1-5])$/;
  function parsePy(py) {
    var m = PY_RE.exec(py || '');
    return m ? { ini: m[1], fin: m[2], tone: +m[3], base: m[1] + m[2] } : null;
  }

  // 英文字首子音 → 中文聲母候選（排越前面越像）
  var ONSET = {
    b: ['b', 'p'], p: ['p', 'b'], m: ['m'], f: ['f', 'h'], ph: ['f', 'h'], v: ['w', 'f'], d: ['d', 't'], t: ['t', 'd'],
    n: ['n', 'l'], l: ['l', 'r'], r: ['r', 'l'], g: ['g', 'k'], gj: ['j', 'zh'], k: ['k', 'g', 'q'], c: ['k', 'g'], cs: ['s', 'x'],
    q: ['k', 'q'], h: ['h'], j: ['j', 'zh'], ch: ['q', 'ch', 'zh', 'j'], sh: ['x', 'sh'], s: ['s', 'x', 'sh'], z: ['z', 'j'],
    th: ['s', 't'], w: ['w', 'h'], wh: ['w', 'h'], y: ['y'], x: ['x', 's'], '': ['', 'y', 'w']
  };
  // 英文母音 → 中文韻母候選
  var NUCLEUS = {
    a: ['a', 'ai', 'an', 'ang', 'ia'], e: ['e', 'ei', 'ai', 'en', 'ie'], i: ['i', 'in', 'ing', 'ai'], o: ['o', 'uo', 'ou', 'ao', 'ong'],
    u: ['u', 'ou', 'ong', 'un'], y: ['i', 'ai'], ee: ['i', 'ei'], ea: ['i', 'ai'], ie: ['i', 'ie'], ey: ['i', 'ei'], ei: ['ai', 'ei'],
    ai: ['ai', 'ei'], ay: ['ai', 'ei'], oa: ['ou', 'o'], ow: ['ou', 'ao'], oe: ['ou', 'o'], ou: ['ou', 'ao', 'u'], oo: ['u', 'ou'],
    au: ['ao', 'o'], aw: ['ao', 'o'], ia: ['ia', 'i', 'a'], io: ['i', 'ao'], ua: ['ua', 'a'], ue: ['u', 'ei'], ui: ['ui', 'i']
  };

  function onsetKey(on, nextVowel) {
    if (!on) return '';
    var o = on.toLowerCase();
    var digraph = /^(sch|ch|sh|th|ph|wh|ck|qu)/.exec(o);
    if (digraph) return { sch: 'sh', ck: 'k', qu: 'q' }[digraph[1]] || digraph[1];
    var c = o.charAt(0);
    if (c === 'g' && o.length === 1 && /^[eiy]/.test(nextVowel)) return 'gj';
    if (c === 'c' && o.length === 1 && /^[eiy]/.test(nextVowel)) return 'cs';
    return ONSET[c] ? c : '';
  }

  /** 英文拼字切成音節：[{ on, nu, coda }] */
  function syllables(word) {
    var w = word.toLowerCase().replace(/[^a-z]/g, '');
    // 字尾不發音的 e（Grace、Mike）
    if (/[^aeiouy]e$/.test(w) && /[aeiouy].*[^aeiouy]e$/.test(w)) w = w.slice(0, -1);
    var re = /([^aeiouy]*)([aeiouy]+)/g, out = [], m, last = 0;
    while ((m = re.exec(w))) {
      // y 在母音前當子音（Yvonne 除外）
      out.push({ on: m[1], nu: m[2] });
      last = re.lastIndex;
    }
    if (!out.length) return [{ on: w, nu: '', coda: '' }];
    out[out.length - 1].coda = w.slice(last);
    // 中間子音：兩個以上時第一個歸前一音節（Mar-tin）
    for (var i = 1; i < out.length; i++) {
      var on = out[i].on;
      if (on.length >= 2 && !/^(ch|sh|th|ph|wh|ck|qu)$/.test(on) && !/^[bcdfgkpt][lr]$/.test(on)) {
        out[i - 1].coda = (out[i - 1].coda || '') + on.charAt(0);
        out[i].on = on.slice(1);
      }
    }
    return out;
  }

  /** 英文音節與中文拼音的相似度（0～1） */
  function soundSim(syl, py) {
    var p = parsePy(py);
    if (!p) return 0;
    var key = onsetKey(syl.on, syl.nu);
    var inis = ONSET[key] || [''];
    var iniScore = 0;
    var ini = p.ini;
    var k = inis.indexOf(ini);
    if (k === 0) iniScore = 1; else if (k > 0) iniScore = 0.7;
    var nu = syl.nu.toLowerCase();
    var fins = NUCLEUS[nu.slice(0, 2)] || NUCLEUS[nu.charAt(0)] || [];
    var fin = p.fin;
    if ((ini === 'y' || ini === 'w') && key === '') fin = ini === 'y' ? 'i' + fin : 'u' + fin;
    var finScore = 0;
    var j = fins.indexOf(fin);
    if (j === 0) finScore = 1; else if (j > 0) finScore = 0.75;
    else if (fin.charAt(0) === (fins[0] || '').charAt(0)) finScore = 0.45;
    // 鼻音結尾（Dan、Tom）對上 -n、-ng 韻母加分
    var coda = (syl.coda || '').charAt(0);
    if (/[nm]/.test(coda) && /n$|ng$/.test(fin)) finScore = Math.min(1, finScore + 0.25);
    return iniScore * 0.5 + finScore * 0.5;
  }

  /** 單音節名字的字尾子音當成一個輕音節（Mark → 馬克） */
  function codaSyllable(syl) {
    var c = (syl.coda || '').replace(/^[nm]+/, '');
    if (!c) return null;
    var on = /^(ch|sh|th|ck)/.test(c) ? c.slice(0, 2) : c.charAt(0);
    return { on: on, nu: 'e', coda: '', light: true };
  }

  // 拼音對拼音（慣用譯名已知時）：聲母、韻母各半，相近的音給部分分數
  var INI_GROUP = [['z', 'zh', 'j'], ['c', 'ch', 'q'], ['s', 'sh', 'x'], ['l', 'n', 'r'], ['f', 'h'], ['b', 'p'], ['d', 't'], ['g', 'k'], ['y', ''], ['w', '']];
  function pySim(target, py) {
    var a = parsePy(target + '1'), b = parsePy(py);
    if (!a || !b) return 0;
    var ini = a.ini === b.ini ? 1 : INI_GROUP.some(function(g) { return g.indexOf(a.ini) >= 0 && g.indexOf(b.ini) >= 0; }) ? 0.7 : 0;
    var fa = a.fin, fb = b.fin;
    var fin = fa === fb ? 1 : fa.replace(/g$/, '') === fb.replace(/g$/, '') ? 0.8
      : fa.replace(/n?g?$/, '') === fb.replace(/n?g?$/, '') ? 0.6 : fa.charAt(0) === fb.charAt(0) ? 0.45 : 0;
    return ini * 0.5 + fin * 0.5;
  }

  /**
   * 名字的目標音節：[{ label, sim(拼音) }]
   * 有慣用譯名時用譯名拼音比對；沒有時用英文拼字估計
   */
  function targetsOf(word) {
    var key = word.toUpperCase().replace(/[^A-Z]/g, '');
    var tr = (window.EnglishTranslit || {})[key];
    if (tr) {
      return {
        known: true,
        list: tr.split(' ').map(function(p) { return { label: p, sim: function(py) { return pySim(p, py); } }; })
      };
    }
    var syls = syllables(word);
    if (syls.length === 1) {
      var extra = codaSyllable(syls[0]);
      if (extra) syls = syls.concat([extra]);
    }
    return {
      known: false,
      list: syls.map(function(s) {
        return { label: s.light ? '(' + s.on + ')' : s.on + s.nu, sim: function(py) { return soundSim(s, py); } };
      })
    };
  }

  // ---------- 字庫 ----------
  var CHARS = null;
  function chars() {
    if (CHARS) return CHARS;
    var DB = window.PinyinDB ? window.PinyinDB.CHAR : {};
    var strokes = window.strokeMap || {};
    var seen = {};
    CHARS = [];
    CHAR_DATA.forEach(function(row) {
      var f = row.split('|');
      if (seen[f[0]] || !DB[f[0]] || typeof strokes[f[0]] !== 'number') return; // 要有拼音與筆劃才能分析
      seen[f[0]] = 1;
      CHARS.push({ c: f[0], meaning: f[1], tags: f[2].split(','), g: f[3], py: DB[f[0]] });
    });
    return CHARS;
  }

  function genderOk(ch, gender) {
    return !gender || ch.g === 'n' || (gender === 'male' ? ch.g === 'm' : ch.g === 'f');
  }

  // 三才加減分：凶、大凶的組合排到後面（仍保留，避免完全沒有結果）
  var SANCAI_SCORE = { '大吉': 8, '吉': 5, '平': 0, '半吉': 0, '凶': -20, '大凶': -30 };

  // 發音最像的字；夠像的（≥0.6）不到兩個時放寬到 0.35
  function bestBySound(target, gender, n) {
    var all = chars().filter(function(ch) { return genderOk(ch, gender); })
      .map(function(ch) { return { ch: ch, sim: target.sim(ch.py) }; })
      .sort(function(a, b) { return b.sim - a.sim; });
    var good = all.filter(function(x) { return x.sim >= 0.6; });
    return (good.length >= 2 ? good : all.filter(function(x) { return x.sim >= 0.35; })).slice(0, n);
  }

  function surnameBySound(target, word) {
    var DB = window.PinyinDB;
    var best = null;
    SURNAMES.split('').forEach(function(c) {
      var py = DB.SURNAME[c] || DB.CHAR[c];
      if (!py) return;
      var s = target.sim(py);
      if (!best || s > best.s) best = { c: c, s: s, py: py };
    });
    return { c: best.c, from: word, sound: target.label, why: word + ' 的「' + target.label + '」→ ' + best.c + '（' + best.py.replace(/\d/, '') + '）' };
  }

  /**
   * 取名
   * @param opts { english: 'Michael Smith', gender: 'male'|'female'|'', traits: ['智慧', ...] }
   * @return { surname, known, sounds, candidates: [...] } 或 { error }
   */
  function suggest(opts) {
    var parts = (opts.english || '').trim().split(/\s+/).filter(function(p) { return /[a-z]/i.test(p); });
    if (!parts.length) return { error: '請輸入英文名字' };
    var first = parts[0], last = parts.length > 1 ? parts[parts.length - 1] : '';
    var gender = opts.gender || '';
    var traits = (opts.traits || []).filter(function(t) { return TRAITS.indexOf(t) >= 0; });

    var tg = targetsOf(first);
    var nameTargets = tg.list;
    var sur;
    if (last) {
      var key = last.toUpperCase().replace(/[^A-Z]/g, '');
      sur = SURNAME_TABLE[key] ? { c: SURNAME_TABLE[key], from: last, why: last + ' → ' + SURNAME_TABLE[key] + '（常見譯法）' }
        : surnameBySound(targetsOf(last).list[0], last);
    } else {
      // 沒有姓：名字的第一個音當姓，其餘的音放進名字
      sur = surnameBySound(nameTargets[0], first);
      nameTargets = nameTargets.slice(1);
    }

    var s1 = nameTargets[0] ? bestBySound(nameTargets[0], gender, 6) : [];
    var s2 = nameTargets[1] ? bestBySound(nameTargets[1], gender, 6) : [];
    var pool = chars().filter(function(ch) { return genderOk(ch, gender); });
    var byTrait = pool.filter(function(ch) { return ch.tags.some(function(t) { return traits.indexOf(t) >= 0; }); });
    if (!byTrait.length) byTrait = pool.slice(0, 40);

    var combos = [];
    s1.forEach(function(a) {
      s2.forEach(function(b) { combos.push([a.ch, b.ch, a.sim, b.sim, '音譯']); });
      byTrait.forEach(function(t) { combos.push([a.ch, t, a.sim, null, '音義']); });
    });
    // 沒有可對應的音（單音節名字已用在姓）：只取意義
    if (!s1.length) {
      byTrait.slice(0, 20).forEach(function(a) {
        byTrait.slice(0, 20).forEach(function(b) { combos.push([a, b, null, null, '意譯']); });
      });
    }

    var seen = {};
    var scored = [];
    combos.forEach(function(cb) {
      if (cb[0].c === cb[1].c || cb[0].c === sur.c || cb[1].c === sur.c) return;
      var name = sur.c + cb[0].c + cb[1].c;
      if (seen[name]) return;
      seen[name] = 1;
      var cn = window.ChineseNumerology.analyze(name);
      if (!cn || cn.error || cn.needsManual) return;
      var ph = window.Phonetics ? window.Phonetics.checkChinese(cn.parsed) : null;
      if (ph && ph.grade === '需注意') return;
      var good = (cn.fortuneCounts['大吉'] || 0) + (cn.fortuneCounts['吉'] || 0) + (cn.fortuneCounts['中吉'] || 0);
      var traitHits = [cb[0], cb[1]].filter(function(ch) { return ch.tags.some(function(t) { return traits.indexOf(t) >= 0; }); }).length;
      var sound = cb[2] == null ? 0.5 : cb[3] == null ? cb[2] : (cb[2] + cb[3]) / 2;
      var sancai = cn.sancai ? cn.sancai.level : '';
      var score = sound * 40 + traitHits * 12 + good * 6 + (ph && ph.grade === '良好' ? 8 : 0) + (SANCAI_SCORE[sancai] || 0);
      var soundN = cb[4] === '音譯' ? 2 : cb[4] === '音義' ? 1 : 0;
      scored.push({
        name: name, surname: sur, chars: [cb[0], cb[1]], type: cb[4], sound: sound, traitHits: traitHits,
        good: good, level: cn.sancai ? cn.sancai.level : '', phonetics: ph, score: score, analysis: cn,
        soundText: nameTargets.slice(0, soundN).map(function(t, i) {
          return t.label + ' → ' + cb[i].c + ' ' + cb[i].py.replace(/\d/, '');
        }).join('、')
      });
    });
    scored.sort(function(a, b) { return b.score - a.score; });

    // 前幾名避免同一個首字重複太多；音譯（兩字都取音）至少保留兩個，不被音義擠掉
    var out = [], firstCount = {};
    function take(x) {
      var k = x.chars[0].c;
      if (out.length >= 6 || out.indexOf(x) >= 0 || (firstCount[k] || 0) >= 2) return;
      firstCount[k] = (firstCount[k] || 0) + 1;
      out.push(x);
    }
    scored.filter(function(x) { return x.type === '音譯' && x.sound >= 0.6; }).slice(0, 2).forEach(take);
    scored.forEach(take);
    out.sort(function(a, b) { return b.score - a.score; });
    return { surname: sur, known: tg.known, sounds: tg.list.map(function(t) { return t.label; }), candidates: out };
  }

  return { suggest: suggest, TRAITS: TRAITS, syllables: syllables, soundSim: soundSim, pySim: pySim };
})();
