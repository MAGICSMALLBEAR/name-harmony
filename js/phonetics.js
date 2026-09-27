/**
 * 音韻與諧音檢查
 * 中文：聲調組合（平仄）、拗口（聲母、韻母重複）、不雅諧音、綽號風險
 * 英文：音節與重音、華語使用者較難發的音、俚語或迷因聯想
 * 拼音來自 js/data/pinyin-db.js，英文音節來自 js/data/english-phonetics.js
 */
window.Phonetics = (function() {

  // 不雅或負面的詞（拼音以空白分隔、聲調數字）；exact = 只比對完全同音（避免疊字等誤判）
  var BAD_WORDS = [
    // 不吉
    ['si3 wang2', '死亡', '不吉'], ['si3 ren2', '死人', '不吉'], ['si3 gui3', '死鬼', '不吉'], ['si3 shi1', '死屍', '不吉'],
    ['bing4 si3', '病死', '不吉'], ['zang4 li3', '葬禮', '不吉'], ['sang1 shi4', '喪事', '不吉'], ['fen2 mu4', '墳墓', '不吉'],
    ['duan3 ming4', '短命', '不吉'], ['mei2 ming4', '沒命', '不吉'], ['jue2 hou4', '絕後', '不吉'], ['duan4 qi4', '斷氣', '不吉'],
    ['ai2 zheng4', '癌症', '不吉'], ['bing4 du2', '病毒', '不吉'], ['tan1 huan4', '癱瘓', '不吉'], ['shi1 bai4', '失敗', '不吉'],
    ['po4 chan3', '破產', '不吉'], ['pei2 qian2', '賠錢', '不吉'], ['kui1 ben3', '虧本', '不吉'], ['dao3 mei2', '倒楣', '不吉'],
    ['zao1 yang1', '遭殃', '不吉'], ['e4 yun4', '惡運', '不吉'], ['e4 mo2', '惡魔', '不吉'], ['mo2 gui3', '魔鬼', '不吉'],
    ['yao1 guai4', '妖怪', '不吉'], ['yao1 jing1', '妖精', '不吉'], ['gui3 hun2', '鬼魂', '不吉'], ['diao4 si3', '吊死', '不吉'],
    ['tiao4 lou2', '跳樓', '不吉'], ['sha1 ren2', '殺人', '不吉'], ['kan3 tou2', '砍頭', '不吉'], ['jian1 yu4', '監獄', '不吉'],
    ['fan4 ren2', '犯人', '不吉'], ['zui4 fan4', '罪犯', '不吉'], ['mei2 qian2', '沒錢', '不吉'], ['mei2 you3 qian2', '沒有錢', '不吉'],
    // 貶義、罵人
    ['lai4 pi2', '賴皮', '貶義'], ['sha3 gua1', '傻瓜', '貶義'], ['sha3 zi5', '傻子', '貶義'], ['ben4 dan4', '笨蛋', '貶義'], ['hun2 dan4', '混蛋', '貶義'],
    ['wang2 ba1', '王八', '貶義'], ['wang2 ba1 dan4', '王八蛋', '貶義'], ['fei4 wu4', '廢物', '貶義'], ['fei4 chai2', '廢柴', '貶義'],
    ['la1 ji1', '垃圾', '貶義'], ['bai2 chi1', '白痴', '貶義'], ['bai2 mu4', '白目', '貶義'], ['zhu1 tou2', '豬頭', '貶義'],
    ['fan4 tong3', '飯桶', '貶義'], ['ben4 zhu1', '笨豬', '貶義'], ['chun3 zhu1', '蠢豬', '貶義'], ['chun3 cai2', '蠢材', '貶義'],
    ['shen2 jing1 bing4', '神經病', '貶義'], ['feng1 zi5', '瘋子', '貶義'], ['fa1 feng1', '發瘋', '貶義'], ['pian4 zi5', '騙子', '貶義'],
    ['xiao3 tou1', '小偷', '貶義'], ['qiang2 dao4', '強盜', '貶義'], ['tu3 fei3', '土匪', '貶義'], ['liu2 mang2', '流氓', '貶義'],
    ['wu2 lai4', '無賴', '貶義'], ['wu2 neng2', '無能', '貶義'], ['wu2 liao2', '無聊', '貶義'], ['wu2 chi3', '無恥', '貶義'],
    ['wu2 zhi1', '無知', '貶義'], ['wu2 qing2', '無情', '貶義'], ['mei2 yong4', '沒用', '貶義'], ['ma2 fan5', '麻煩', '貶義'],
    ['lan3 gui3', '懶鬼', '貶義'], ['lan3 duo4', '懶惰', '貶義'], ['jiu3 gui3', '酒鬼', '貶義'], ['du3 gui3', '賭鬼', '貶義'],
    ['wo1 nang2', '窩囊', '貶義'], ['qiong2 gui3', '窮鬼', '貶義'], ['qiong2 guang1 dan4', '窮光蛋', '貶義'], ['gou3 tui3', '狗腿', '貶義'],
    ['zou3 gou3', '走狗', '貶義'], ['ma3 pi4', '馬屁', '貶義'], ['pang4 zi5', '胖子', '貶義'], ['ai3 zi5', '矮子', '貶義'],
    ['tu1 tou2', '禿頭', '貶義'], ['xia1 zi5', '瞎子', '貶義'], ['long2 zi5', '聾子', '貶義'], ['ya3 ba5', '啞巴', '貶義'],
    ['chou3 ba1 guai4', '醜八怪', '貶義'], ['ma2 zi5', '麻子', '貶義'], ['hu2 li5 jing1', '狐狸精', '貶義'], ['jian4 ren2', '賤人', '貶義'],
    ['fan4 jian4', '犯賤', '貶義'], ['xiao3 ren2', '小人', '貶義'], ['xiao3 qi4', '小氣', '貶義'], ['xiao3 chou3', '小丑', '貶義'],
    ['xiao3 gui3', '小鬼', '貶義'], ['xiao3 san1', '小三', '貶義'], ['er4 nai3', '二奶', '貶義'], ['lv4 mao4', '綠帽', '貶義'],
    ['se4 lang2', '色狼', '貶義'], ['ji4 nv3', '妓女', '貶義'], ['sao1 huo4', '騷貨', '貶義'], ['a1 dou3', '阿斗', '貶義'],
    ['a1 san1', '阿三', '貶義'], ['a1 fei1', '阿飛', '貶義'], ['a1 gou3', '阿狗', '貶義'],
    // 粗俗、身體、排泄
    ['shi3 zhen1 xiang1', '屎真香', '粗俗'], ['da4 bian4', '大便', '粗俗'], ['xiao3 bian4', '小便', '粗俗'], ['fang4 pi4', '放屁', '粗俗'],
    ['pi4 gu5', '屁股', '粗俗'], ['niao4 bu4', '尿布', '粗俗'], ['ce4 suo3', '廁所', '粗俗'], ['mao2 keng1', '茅坑', '粗俗'],
    ['ma3 tong3', '馬桶', '粗俗'], ['bian4 mi4', '便秘', '粗俗'], ['la1 du4 zi5', '拉肚子', '粗俗'], ['du4 zi5 teng2', '肚子疼', '粗俗'],
    ['wei4 sheng1 jin1', '衛生巾', '粗俗'], ['yang2 wei3', '陽痿', '粗俗'], ['zao3 xie4', '早洩', '粗俗'], ['luo3 ti3', '裸體', '粗俗'],
    ['bian4 bian4', '便便', '粗俗', 'exact'], ['pi4 pi4', '屁屁', '粗俗', 'exact'], ['niao4 niao4', '尿尿', '粗俗', 'exact'],
    ['sha3 bi1', '傻屄', '粗話'], ['niu2 bi1', '牛屄', '粗話'], ['ta1 ma1 de5', '他媽的', '粗話'], ['ma1 de5', '媽的', '粗話'],
    ['ji1 ba5', '雞巴', '粗話'], ['ji1 bai1', '雞掰', '粗話'], ['xiao3 ji1 ji1', '小雞雞', '粗話']
  ];

  // 容易被取綽號的姓氏
  var SURNAME_NICK = {
    '朱': '豬', '史': '屎', '吳': '無', '苟': '狗', '侯': '猴子', '熊': '熊', '牛': '牛', '馬': '馬',
    '賴': '癩（皮）', '杜': '肚子', '范': '飯（桶）', '沈': '神（經）', '胡': '狐狸、鬍子', '費': '廢', '裴': '賠',
    '毛': '毛毛', '甘': '肝', '姬': '雞', '祝': '豬', '諸': '豬', '武': '五', '伍': '五', '石': '石頭', '龜': '烏龜'
  };

  var TONE_NAME = ['', '一聲', '二聲', '三聲', '四聲', '輕聲'];

  /** 拼音拆成聲母、韻母、聲調 */
  function splitPy(py) {
    var m = /^(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw]?)([a-zv]+)([1-5])$/.exec(py);
    if (!m) return null;
    var fin = m[2];
    // y/w 開頭的零聲母：還原成韻母比較
    var ini = m[1];
    if (ini === 'y' || ini === 'w') { ini = ''; }
    return { py: py, ini: ini, fin: fin, base: m[1] + m[2], tone: +m[3] };
  }

  /** 台灣口音常見的混淆：zh/z、ch/c、sh/s、eng/en、ing/in */
  function fuzzy(base) {
    return base.replace(/^zh/, 'z').replace(/^ch/, 'c').replace(/^sh/, 's').replace(/eng$/, 'en').replace(/ing$/, 'in');
  }

  function pinyinOf(chars, surnameLen) {
    var DB = window.PinyinDB;
    if (!DB) return null;
    return chars.map(function(c, i) {
      var p = (i < surnameLen && DB.SURNAME[c]) || DB.CHAR[c];
      return p ? splitPy(p) : null;
    });
  }

  // BAD_WORDS 預先拆好拼音（取名器一次會檢查上百個名字）
  var BAD_PARSED = null;
  function badParsed() {
    if (!BAD_PARSED) BAD_PARSED = BAD_WORDS.map(function(w) {
      var parts = w[0].split(' ').map(splitPy);
      return { w: w, parts: parts, fz0: fuzzy(parts[0].base) };
    });
    return BAD_PARSED;
  }

  /** 找出音節序列中和 BAD_WORDS 相符的片段 */
  function findHomophones(sylls, chars) {
    var hits = [];
    badParsed().forEach(function(bp) {
      var w = bp.w, parts = bp.parts;
      var n = parts.length;
      for (var i = 0; i + n <= sylls.length; i++) {
        if (!sylls[i] || fuzzy(sylls[i].base) !== bp.fz0) continue; // 第一個音就不像，後面不用比
        var seg = sylls.slice(i, i + n);
        if (seg.some(function(s) { return !s; })) continue;
        var exactTone = seg.every(function(s, k) { return s.base === parts[k].base && (s.tone === parts[k].tone || parts[k].tone === 5 || s.tone === 5); });
        var sameBase = seg.every(function(s, k) { return s.base === parts[k].base; });
        var fuzzyBase = seg.every(function(s, k) { return fuzzy(s.base) === fuzzy(parts[k].base); });
        var fuzzyTone = fuzzyBase && seg.every(function(s, k) { return s.tone === parts[k].tone || parts[k].tone === 5 || s.tone === 5; });
        var level = exactTone ? 3 : (w[3] === 'exact' ? 0 : fuzzyTone ? 2 : sameBase ? 1 : 0);
        if (level) {
          hits.push({ text: chars.slice(i, i + n).join(''), word: w[1], cat: w[2], level: level });
        }
      }
    });
    // 同一片段只留最高等級
    hits.sort(function(a, b) { return b.level - a.level; });
    var seen = {};
    return hits.filter(function(h) { var k = h.text + h.word; if (seen[k]) return false; seen[k] = 1; return true; });
  }

  /** 中文名檢查 */
  function checkChinese(parsed) {
    if (!parsed || !window.PinyinDB) return null;
    var chars = parsed.surnameChars.concat(parsed.givenNameChars);
    var sLen = parsed.surnameChars.length;
    var sylls = pinyinOf(chars, sLen);
    var known = sylls.filter(Boolean).length;
    var notes = [], warns = [];

    // 聲調與平仄
    var tones = sylls.map(function(s) { return s ? s.tone : 0; });
    var toneText = chars.map(function(c, i) { return c + (sylls[i] ? '（' + sylls[i].py.replace(/\d/, '') + ' ' + TONE_NAME[sylls[i].tone] + '）' : '（?）'); }).join(' ');
    if (known === chars.length) {
      var ping = tones.filter(function(t) { return t === 1 || t === 2; }).length;
      var ze = tones.filter(function(t) { return t === 3 || t === 4; }).length;
      var allSame = tones.every(function(t) { return t === tones[0]; });
      if (allSame && chars.length >= 3) warns.push('全名都是' + TONE_NAME[tones[0]] + '，唸起來平板、缺少起伏');
      else if (!ze) warns.push('全名都是平聲（一、二聲），聲音偏柔、少了頓挫');
      else if (!ping) warns.push('全名都是仄聲（三、四聲），唸起來較硬、較費力');
      else notes.push('平仄相間（平聲 ' + ping + '、仄聲 ' + ze + '），唸起來有高低起伏');
      var run3 = 0, maxRun3 = 0;
      tones.forEach(function(t) { run3 = t === 3 ? run3 + 1 : 0; maxRun3 = Math.max(maxRun3, run3); });
      if (maxRun3 >= 3) warns.push('連續三個三聲，會產生連續變調，別人容易唸錯');
      else if (maxRun3 === 2) notes.push('有兩個三聲相連，前一字會變成二聲（例：「小雨」唸成 xiáo yǔ），屬正常現象');
      var last = tones[tones.length - 1];
      notes.push(last === 1 || last === 2 ? '名字以平聲收尾，叫起來響亮、容易拉長' : '名字以仄聲收尾，叫起來短促有力');
    }

    // 拗口：相鄰字聲母或韻母相同（同字疊字除外）
    for (var i = 1; i < chars.length; i++) {
      var a = sylls[i - 1], b = sylls[i];
      if (!a || !b || chars[i] === chars[i - 1]) continue;
      if (a.base === b.base) warns.push('「' + chars[i - 1] + chars[i] + '」同音（' + a.base + '），連讀像重複');
      else if (a.ini && a.ini === b.ini) notes.push('「' + chars[i - 1] + chars[i] + '」聲母相同（' + a.ini + '），唸快時稍微繞口');
      else if (a.fin === b.fin && a.fin.length >= 2) notes.push('「' + chars[i - 1] + chars[i] + '」韻母相同（' + a.fin + '），有押韻感，唸快時稍微繞口');
    }

    // 不雅諧音：全名、名字、以及常見叫法（小X、阿X、疊字）
    var homos = findHomophones(sylls, chars);
    var last = parsed.givenNameChars[parsed.givenNameChars.length - 1];
    var lastPy = sylls[sylls.length - 1];
    var nicknames = [];
    if (lastPy) {
      [['小', 'xiao3'], ['阿', 'a1']].forEach(function(pre) {
        if (chars.join('').indexOf(pre[0] + last) >= 0) return; // 名字本身就是這個叫法，已在上面的諧音檢查
        var h = findHomophones([splitPy(pre[1]), lastPy], [pre[0], last]).filter(function(x) { return x.level === 3; });
        h.forEach(function(x) { nicknames.push('「' + pre[0] + last + '」聽起來像「' + x.word + '」'); });
      });
      findHomophones([lastPy, lastPy], [last, last]).filter(function(x) { return x.level === 3; })
        .forEach(function(x) { nicknames.push('疊字「' + last + last + '」聽起來像「' + x.word + '」'); });
    }
    var sn = SURNAME_NICK[parsed.surname];
    if (sn) nicknames.push('姓「' + parsed.surname + '」在學校常被聯想成「' + sn + '」');

    // 評等
    var severe = homos.filter(function(h) { return h.level >= 2; }).length;
    var grade = severe ? '需注意' : (homos.length || warns.length >= 2 || nicknames.length >= 2) ? '尚可' : '良好';
    return {
      pinyin: sylls.map(function(s) { return s ? s.py : '?'; }).join(' '),
      toneText: toneText,
      notes: notes,
      warns: warns,
      homophones: homos,
      nicknames: nicknames,
      grade: grade
    };
  }

  // ---------- 英文 ----------
  var SLANG = {
    'DICK': '英文俚語指男性生殖器，現在多改用 Richard 或 Rick',
    'FANNY': '英式俚語指女性私處，在英國、澳洲容易引人發笑',
    'WILLY': '英式俚語指男性生殖器',
    'RANDY': '英式俚語意為「性慾旺盛」',
    'PETER': '舊式俚語可指男性生殖器，但日常仍非常普遍',
    'JOHNNY': '英式俚語可指保險套',
    'ROGER': '英式俚語可指性行為；無線電用語也常被拿來開玩笑',
    'GAY': '現代英文幾乎只當「同性戀」解，作名字容易被聯想',
    'CHERRY': '俚語可指「處女」',
    'KITTY': '俚語可指女性私處，也常被當成寵物名',
    'CANDY': '常被聯想為夜店舞者的藝名',
    'BAMBI': '常被聯想為夜店舞者的藝名',
    'BUNNY': '容易聯想到 Playboy 兔女郎',
    'MOLLY': '俚語指搖頭丸（MDMA）',
    'CHARLIE': '俚語可指古柯鹼，但作名字仍相當普遍',
    'NANCY': '舊式俚語用來嘲笑「娘娘腔」',
    'KAREN': '網路迷因，指無理取鬧、動不動要找經理的人',
    'BECKY': '網路迷因，帶有刻板印象的嘲諷',
    'CHAD': '網路迷因，指自以為是的「猛男」',
    'KEVIN': '在德語圈是網路迷因（Kevinismus），英語圈沒有問題',
    'ADOLF': '易聯想到希特勒',
    'ISIS': '易聯想到恐怖組織',
    'ALEXA': '與 Amazon 智慧音箱同名，常被開玩笑或誤喚醒裝置',
    'SIRI': '與 Apple 語音助理同名，常被開玩笑'
  };
  var FLAG_TEXT = {
    t: 'TH 音（咬舌音）',
    v: 'V 音（上齒輕咬下唇）',
    l: 'L 與 R 同時出現，華語使用者容易混淆',
    o: '字首有子音群（如 Str-、Br-、Cl-），容易被唸成多一個音節',
    c: '字尾有子音群（如 -nd、-rt、-lds），容易被省略或多加母音'
  };

  /** 沒有收錄的名字：以拼字估計音節與難點 */
  function guessEnglish(name) {
    var w = name.toLowerCase();
    var groups = w.replace(/e$/, '').match(/[aeiouy]+/g) || [];
    var n = Math.max(1, groups.length);
    var flags = '';
    if (/th/.test(w)) flags += 't';
    if (/v/.test(w)) flags += 'v';
    if (/l/.test(w) && /r/.test(w)) flags += 'l';
    if (/^[^aeiouy]{2,}/.test(w) && !/^(ch|sh|th|ph|wh)[aeiouy]/.test(w)) flags += 'o';
    if (/[^aeiouy]{2,}$/.test(w.replace(/e$/, '')) && !/(ch|sh|th|ph|ck|ll|ss|tt|nn)$/.test(w)) flags += 'c';
    // 重音：-ette、-elle、-ique、-ine 等法式結尾在最後，其餘多在第一音節
    var stressAt = /(ette|elle|ique|ise|aine)$/.test(w) ? n - 1 : 0;
    var pattern = '';
    for (var i = 0; i < n; i++) pattern += i === stressAt ? '1' : '0';
    return pattern + flags;
  }

  function checkEnglish(name) {
    if (!name) return null;
    var key = name.trim().split(/\s+/)[0].toUpperCase().replace(/[^A-Z]/g, '');
    if (!key) return null;
    var data = (window.EnglishPhonetics || {})[key];
    var estimated = !data;
    if (!data) data = guessEnglish(key);
    var stress = data.match(/^\d+/)[0];
    var flags = data.slice(stress.length).split('');
    var syll = stress.length;
    var primary = stress.indexOf('1') + 1;
    var notes = [], warns = [];
    notes.push(syll + ' 個音節' + (syll > 1 ? '，重音在第 ' + primary + ' 音節' : '') + (estimated ? '（依拼字估計）' : ''));
    if (syll >= 4) warns.push('音節較多，朋友之間常會簡稱');
    var hard = flags.map(function(f) { return FLAG_TEXT[f]; }).filter(Boolean);
    if (!hard.length) notes.push('沒有華語使用者特別難發的音，容易唸對');
    var slang = SLANG[key] || null;
    var grade = slang ? '需注意' : hard.length >= 2 ? '尚可' : '良好';
    return { name: key.charAt(0) + key.slice(1).toLowerCase(), syllables: syll, stressAt: primary, stress: stress, hard: hard, slang: slang, notes: notes, warns: warns, estimated: estimated, grade: grade };
  }

  return { checkChinese: checkChinese, checkEnglish: checkEnglish, findHomophones: findHomophones, splitPy: splitPy, BAD_WORDS: BAD_WORDS };
})();
