/**
 * 紫微斗數引擎 — 農曆排盤：命身宮、五行局、14主星、輔星、生年四化
 */
window.Ziwei = (function() {

  var TIAN_GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];

  // 生年四化（中州派）：年干 → 化祿/化權/化科/化忌 對應的星曜
  // 部分對應星（文昌/文曲/左輔/右弼）不在14主星表中，此時該化落於輔星，不掛靠任何宮位
  var SIHUA_TABLE = {
    '甲': { '化祿':'廉貞', '化權':'破軍', '化科':'武曲', '化忌':'太陽' },
    '乙': { '化祿':'天機', '化權':'天梁', '化科':'紫微', '化忌':'太陰' },
    '丙': { '化祿':'天同', '化權':'天機', '化科':'文昌', '化忌':'廉貞' },
    '丁': { '化祿':'太陰', '化權':'天同', '化科':'天機', '化忌':'巨門' },
    '戊': { '化祿':'貪狼', '化權':'太陰', '化科':'右弼', '化忌':'天機' },
    '己': { '化祿':'武曲', '化權':'貪狼', '化科':'天梁', '化忌':'文曲' },
    '庚': { '化祿':'太陽', '化權':'武曲', '化科':'太陰', '化忌':'天同' },
    '辛': { '化祿':'巨門', '化權':'太陽', '化科':'文曲', '化忌':'文昌' },
    '壬': { '化祿':'天梁', '化權':'紫微', '化科':'左輔', '化忌':'武曲' },
    '癸': { '化祿':'破軍', '化權':'巨門', '化科':'太陰', '化忌':'貪狼' }
  };

  var SIHUA_MEANING = {
    '化祿': '增益、順遂、財源與人緣的加持，四化中最吉，代表該宮位之事容易水到渠成。',
    '化權': '掌握主導權、企圖心與行動力增強，能有所成就，但也容易流於強勢或壓力過大。',
    '化科': '帶來名聲、貴人、考運與文書上的順利，是較溫和的吉象，利於學業與名譽。',
    '化忌': '容易出現糾結、阻礙、反覆或需要特別留意的課題，是四化中最需謹慎面對的一化。'
  };

  // 14主星
  var STARS = {
    '紫微':{el:'土',g:'大吉',desc:'帝星，尊貴權威。有領導力、自尊心強、追求卓越。適合管理職、政治、高階主管。'},
    '天機':{el:'木',g:'吉',desc:'智慧之星，善於策劃與思考。聰明靈活、適應力強。適合顧問、策劃、科技業。'},
    '太陽':{el:'火',g:'吉',desc:'光明熱情，慷慨大方。外向積極、有正義感。適合公眾人物、業務、外交。'},
    '武曲':{el:'金',g:'吉',desc:'財星，果斷剛毅。理財能力強、執行力高。適合金融、軍警、運動。'},
    '天同':{el:'水',g:'吉',desc:'福星，溫和善良。知足常樂、人緣佳。適合服務業、藝術、教育。'},
    '廉貞':{el:'火',g:'平',desc:'桃花星兼權星。有魅力、善交際但有時衝動。適合公關、設計、娛樂。'},
    '天府':{el:'土',g:'大吉',desc:'庫星，穩重包容。善於理財與管理。適合銀行、不動產、倉儲物流。'},
    '太陰':{el:'水',g:'吉',desc:'陰柔之星，細膩敏感。有藝術氣質、重視家庭。適合文學、設計、房產。'},
    '貪狼':{el:'木',g:'平',desc:'桃花星，多才多藝。有魅力、善社交但有時貪心。適合演藝、行銷、外交。'},
    '巨門':{el:'水',g:'平',desc:'暗星，口才犀利。有辯才、善分析但有時多疑。適合律師、評論、研究。'},
    '天相':{el:'水',g:'吉',desc:'印星，溫和善良。善於輔佐與服務。適合秘書、醫療、公務員。'},
    '天梁':{el:'土',g:'吉',desc:'壽星，正直穩重。有長者風範、樂於助人。適合醫護、教育、社福。'},
    '七殺':{el:'金',g:'凶',desc:'將星，剛強果斷。有開創力但有時孤僻。適合軍警、創業、競技。'},
    '破軍':{el:'水',g:'凶',desc:'破耗之星，敢於破壞重建。有改革精神但有時衝動。適合改革者、冒險家。'}
  };

  // 12宮位
  var PALACES = [
    {n:'命宮',desc:'代表自我、性格、天賦與命運主軸。'},
    {n:'兄弟宮',desc:'代表手足關係、同儕互動。'},
    {n:'夫妻宮',desc:'代表婚姻、伴侶關係與感情觀。'},
    {n:'子女宮',desc:'代表子女、創作、享樂。'},
    {n:'財帛宮',desc:'代表財運、理財能力與金錢觀。'},
    {n:'疾厄宮',desc:'代表健康、體質與災厄。'},
    {n:'遷移宮',desc:'代表外出運、變動與旅行。'},
    {n:'交友宮',desc:'代表人際關係、朋友與下屬。'},
    {n:'官祿宮',desc:'代表事業、工作與社會地位。'},
    {n:'田宅宮',desc:'代表家庭、房產與居住環境。'},
    {n:'福德宮',desc:'代表精神生活、福氣與享受。'},
    {n:'父母宮',desc:'代表父母、長輩與上司關係。'}
  ];

  var DI_ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

  // 六十甲子納音五行（每兩組干支一個納音）
  var NAYIN_ELE = '金火木土金火水土金木水土火木水金火木土金火水土金木水土火木水';
  var BUREAU = { '水':2, '木':3, '金':4, '土':5, '火':6 };

  function mod12(n) { return ((n % 12) + 12) % 12; }

  // 祿存：依年干（甲寅 乙卯 丙戊巳 丁己午 庚申 辛酉 壬亥 癸子）
  var LUCUN_POS = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0];
  // 天魁、天鉞：甲戊庚牛羊、乙己鼠猴鄉、丙丁豬雞位、壬癸兔蛇藏、辛逢馬虎
  var KUI_YUE = [[1,7],[0,8],[11,9],[11,9],[1,7],[0,8],[1,7],[6,2],[3,5],[3,5]];
  // 年支三合局：0 申子辰、1 巳酉丑、2 寅午戌、3 亥卯未
  var SAN_HE = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3];
  var TIANMA_POS = [2, 11, 8, 5];
  var HUO_START = [2, 3, 1, 9];
  var LING_START = [10, 10, 3, 10];
  // 煞星（畫面上以警示色顯示）
  var SHA_STARS = ['擎羊', '陀羅', '火星', '鈴星', '地空', '地劫'];

  var CHANGSHENG = ['長生','沐浴','冠帶','臨官','帝旺','衰','病','死','墓','絕','胎','養'];

  // 星曜亮度（廟旺得利平不陷），字串第 n 個字 = 地支 n（子起）；「－」表示該宮不入
  // 資料取自 iztro（MIT License）預設表
  var BRIGHTNESS = {
    '紫微': '平廟旺旺得旺廟廟旺旺得旺',
    '天機': '廟陷得旺利平廟陷得旺利平',
    '太陽': '陷不旺廟旺旺旺得得平不陷',
    '武曲': '旺廟得利廟平旺廟得利廟平',
    '天同': '旺不利平平廟陷不旺平平廟',
    '廉貞': '平利廟平利陷平利廟平利陷',
    '天府': '廟廟廟得廟得旺廟得旺廟得',
    '太陰': '廟廟旺陷陷陷不不利旺旺廟',
    '貪狼': '旺廟平利廟陷旺廟平利廟陷',
    '巨門': '旺不廟廟陷旺旺不廟廟陷旺',
    '天相': '廟廟廟陷得得廟得廟陷得得',
    '天梁': '廟旺廟廟廟陷廟旺陷得廟陷',
    '七殺': '旺廟廟旺廟平旺廟廟旺廟平',
    '破軍': '廟旺得陷旺平廟旺得陷旺平',
    '文昌': '得廟陷利得廟陷利得廟陷利',
    '文曲': '得廟平旺得廟陷旺得廟陷旺',
    '火星': '陷得廟利陷得廟利陷得廟利',
    '鈴星': '陷得廟利陷得廟利陷得廟利',
    '擎羊': '陷廟－陷廟－陷廟－陷廟－',
    '陀羅': '－廟陷－廟陷－廟陷－廟陷'
  };

  // 年干系雜曜與流曜
  var CHANG_BY_TG = [5, 6, 8, 9, 8, 9, 11, 0, 2, 3];  // 流昌：甲巳 乙午 丙戊申 丁己酉 庚亥 辛子 壬寅 癸卯
  var QU_BY_TG    = [9, 8, 6, 5, 6, 5, 3, 2, 0, 11];  // 流曲
  var TIANGUAN_POS = [7, 4, 5, 2, 3, 9, 11, 9, 10, 6];
  var TIANFU_ADJ_POS = [9, 8, 0, 11, 3, 2, 6, 5, 6, 5];
  var TIANCHU_POS = [5, 6, 0, 5, 6, 8, 2, 6, 9, 11];
  var JIELU_POS = [8, 6, 4, 2, 0];     // 依年干 % 5
  var KONGWANG_POS = [9, 7, 5, 3, 1];
  // 年支系：依三合局（0 申子辰、1 巳酉丑、2 寅午戌、3 亥卯未）
  var HUAGAI_POS = [4, 1, 10, 7];
  var XIANCHI_POS = [9, 6, 3, 0];
  var XIAOXIAN_START = [10, 7, 4, 1]; // 小限起宮：申子辰戌、巳酉丑未、寅午戌辰、亥卯未丑
  var FEILIAN_POS = [8, 9, 10, 5, 6, 7, 2, 3, 4, 11, 0, 1];
  var POSUI_POS = [5, 1, 9];           // 依年支 % 3
  // 月系（正月 = 0）
  var TIANYUE_POS = [10, 5, 4, 2, 7, 3, 11, 7, 2, 6, 10, 2];
  var TIANWU_POS = [5, 8, 2, 11];      // 依月 % 4
  var YINSHA_POS = [2, 0, 10, 8, 6, 4]; // 依月 % 6

  // 雜曜分類（畫面顯示用）
  var FLOWER_STARS = ['紅鸞', '天喜', '天姚', '咸池'];
  var HELPER_STARS = ['解神', '年解', '天德', '月德', '天官', '天福', '恩光', '天貴', '三台', '八座', '龍池', '鳳閣', '台輔', '封誥', '天才', '天壽', '天廚', '華蓋'];

  /** 孤辰、寡宿：依年支所屬方局（寅卯辰、巳午未、申酉戌、亥子丑） */
  function guGua(dz) {
    var g = Math.floor(mod12(dz - 2) / 3);
    return [[5, 1], [8, 4], [11, 7], [2, 10]][g];
  }

  /** 流曜（流年用）：依天干、地支安流魁鉞昌曲祿羊陀馬鸞喜與年解 */
  function yearlyStarsAt(tgI, dzI) {
    var at = {};
    function put(n, pos) { pos = mod12(pos); (at[pos] = at[pos] || []).push(n); }
    var lu = LUCUN_POS[tgI];
    put('流魁', KUI_YUE[tgI][0]); put('流鉞', KUI_YUE[tgI][1]);
    put('流昌', CHANG_BY_TG[tgI]); put('流曲', QU_BY_TG[tgI]);
    put('流祿', lu); put('流羊', lu + 1); put('流陀', lu - 1);
    put('流馬', TIANMA_POS[SAN_HE[dzI]]);
    put('流鸞', 3 - dzI); put('流喜', 9 - dzI);
    put('年解', 10 - dzI);
    return at;
  }
  // 長生起點：水土申、木亥、金巳、火寅
  var CHANGSHENG_START = { '水': 8, '土': 8, '木': 11, '金': 5, '火': 2 };

  /** 國曆轉農曆（js/lunar.js），回傳 { year, month, day, leap } */
  function toLunar(year, month, day) {
    return window.Lunar ? window.Lunar.fromSolar(year, month, day) : null;
  }

  /** 天干地支 → 六十甲子序號 */
  function jiaziIndex(tgIdx, dzIdx) {
    return ((6 * tgIdx - 5 * dzIdx) % 60 + 60) % 60;
  }

  /** 紫微星所在地支：農曆日 + 五行局數 */
  function ziweiPosition(lunarDay, bureau) {
    var x = 0;
    while ((lunarDay + x) % bureau !== 0) x++;
    var q = (lunarDay + x) / bureau;
    var pos = 2 + q - 1; // 由寅宮起數
    pos += (x % 2 === 1) ? -x : x; // 補數為奇數退、偶數進
    return mod12(pos);
  }

  /**
   * 依生日排紫微盤（以農曆正月初一換年；命宮與主星需要出生時辰）
   * 沒有時辰時只回傳生年四化，needHour = true
   * gender（'male' / 'female'）用於排大限：陽男陰女順行、陰男陽女逆行，由命宮起、局數為起始歲數（虛歲）
   */
  function getZiweiChart(year, month, day, hour, gender) {
    if (!year || !month || !day) return null;
    var hasHour = hour != null && hour >= 0 && hour <= 23;

    // 23 點後為子時，屬於隔天
    var lunar = hasHour && hour === 23
      ? (function() { var d = new Date(Date.UTC(year, month - 1, day + 1)); return toLunar(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()); })()
      : toLunar(year, month, day);
    if (!lunar) return null;

    var yIdx = ((lunar.year - 4) % 60 + 60) % 60;
    var yearTG = TIAN_GAN[yIdx % 10];
    var yearDZ = DI_ZHI[yIdx % 12];
    var lunarText = '農曆' + yearTG + yearDZ + '年' + (lunar.leap ? '閏' : '') + lunar.month + '月' + lunar.day + '日';

    if (!hasHour) {
      return { needHour: true, lunar: lunar, lunarText: lunarText, sihua: getSihua(yearTG, null) };
    }

    // 閏月：前半月算本月，後半月算下個月
    var m = lunar.month + (lunar.leap && lunar.day > 15 ? 1 : 0);
    if (m > 12) m = 1;
    var hIdx = Math.floor((hour + 1) % 24 / 2); // 子=0
    var mingPos = mod12(2 + (m - 1) - hIdx);
    var shenPos = mod12(2 + (m - 1) + hIdx);

    // 宮干：五虎遁，由年干定寅宮天干
    var yinTG = [2, 4, 6, 8, 0][yIdx % 10 % 5];
    function palaceTG(pos) { return (yinTG + mod12(pos - 2)) % 10; }

    // 五行局：命宮干支納音
    var mingTG = palaceTG(mingPos);
    var nayin = NAYIN_ELE.charAt(Math.floor(jiaziIndex(mingTG, mingPos) / 2));
    var bureau = BUREAU[nayin];

    // 安十四主星
    var z = ziweiPosition(lunar.day, bureau);
    var f = mod12(4 - z); // 天府與紫微以寅申線對稱
    var starAt = {};
    function put(name, pos) { pos = mod12(pos); (starAt[pos] = starAt[pos] || []).push(name); }
    put('紫微', z); put('天機', z - 1); put('太陽', z - 3); put('武曲', z - 4); put('天同', z - 5); put('廉貞', z - 8);
    put('天府', f); put('太陰', f + 1); put('貪狼', f + 2); put('巨門', f + 3); put('天相', f + 4); put('天梁', f + 5); put('七殺', f + 6); put('破軍', f + 10);

    var minorAt = {};
    function putMinor(name, pos) { pos = mod12(pos); (minorAt[pos] = minorAt[pos] || []).push(name); }
    putMinor('文昌', 10 - hIdx); putMinor('文曲', 4 + hIdx); putMinor('左輔', 4 + (m - 1)); putMinor('右弼', 10 - (m - 1));

    // 年干系：祿存、擎羊、陀羅、天魁、天鉞
    var tgI = yIdx % 10, dzI = yIdx % 12;
    var lu = LUCUN_POS[tgI];
    putMinor('祿存', lu); putMinor('擎羊', lu + 1); putMinor('陀羅', lu - 1);
    putMinor('天魁', KUI_YUE[tgI][0]); putMinor('天鉞', KUI_YUE[tgI][1]);
    // 年支系：天馬；年支+時辰：火星、鈴星；時辰：地空、地劫
    var trio = SAN_HE[dzI];
    putMinor('天馬', TIANMA_POS[trio]);
    putMinor('火星', HUO_START[trio] + hIdx); putMinor('鈴星', LING_START[trio] + hIdx);
    putMinor('地空', 11 - hIdx); putMinor('地劫', 11 + hIdx);

    // 雜曜（38 顆）
    var adjAt = {};
    function putAdj(name, pos) { pos = mod12(pos); (adjAt[pos] = adjAt[pos] || []).push(name); }
    var mi = m - 1;                 // 正月 = 0
    var di = lunar.day - 1;         // 初一 = 0
    var zuo = 4 + mi, you = 10 - mi, chang = 10 - hIdx, qu = 4 + hIdx;
    var luan = 3 - dzI;
    putAdj('紅鸞', luan); putAdj('天喜', luan + 6);
    putAdj('天姚', 1 + mi); putAdj('天刑', 9 + mi);
    putAdj('咸池', XIANCHI_POS[trio]); putAdj('華蓋', HUAGAI_POS[trio]);
    putAdj('解神', 8 + 2 * Math.floor(mi / 2));
    putAdj('三台', zuo + di); putAdj('八座', you - di);
    putAdj('恩光', chang + di - 1); putAdj('天貴', qu + di - 1);
    putAdj('龍池', 4 + dzI); putAdj('鳳閣', 10 - dzI);
    putAdj('天才', mingPos + dzI); putAdj('天壽', shenPos + dzI);
    putAdj('台輔', 6 + hIdx); putAdj('封誥', 2 + hIdx);
    putAdj('天巫', TIANWU_POS[mi % 4]); putAdj('天月', TIANYUE_POS[mi]); putAdj('陰煞', YINSHA_POS[mi % 6]);
    putAdj('天官', TIANGUAN_POS[tgI]); putAdj('天福', TIANFU_ADJ_POS[tgI]); putAdj('天廚', TIANCHU_POS[tgI]);
    putAdj('天德', 9 + dzI); putAdj('月德', 5 + dzI);
    putAdj('天空', dzI + 1);
    putAdj('截路', JIELU_POS[tgI % 5]); putAdj('空亡', KONGWANG_POS[tgI % 5]);
    var xun = mod12(dzI + 10 - tgI);
    if (dzI % 2 !== xun % 2) xun = mod12(xun + 1);
    putAdj('旬空', xun);
    var gg = guGua(dzI);
    putAdj('孤辰', gg[0]); putAdj('寡宿', gg[1]);
    putAdj('蜚廉', FEILIAN_POS[dzI]); putAdj('破碎', POSUI_POS[dzI % 3]);
    putAdj('天哭', 6 - dzI); putAdj('天虛', 6 + dzI);
    putAdj('天使', mingPos - 5); putAdj('天傷', mingPos - 7); // 疾厄宮、交友宮
    putAdj('年解', 10 - dzI);

    // 小限：依生年三合定起宮，男順女逆，一歲一宮（虛歲）
    var xxAt = {};
    if (gender === 'male' || gender === 'female') {
      var xxStart = XIAOXIAN_START[trio];
      for (var k = 0; k < 12; k++) xxAt[mod12(xxStart + (gender === 'male' ? k : -k))] = k + 1;
    }

    // 十二長生：依五行局定長生位，陽男陰女順行、陰男陽女逆行（需要性別）
    var csAt = {};
    if (gender === 'male' || gender === 'female') {
      var csForward = (gender === 'male') === (yIdx % 2 === 0);
      var csStart = CHANGSHENG_START[nayin];
      CHANGSHENG.forEach(function(name, i) { csAt[mod12(csStart + (csForward ? i : -i))] = name; });
    }

    // 12宮：由命宮逆排
    var palaces = PALACES.map(function(p, i) {
      var pos = mod12(mingPos - i);
      var stars = starAt[pos] || [];
      var borrowed = false;
      if (!stars.length) { stars = starAt[mod12(pos + 6)] || []; borrowed = true; } // 空宮借對宮主星
      var first = STARS[stars[0]];
      return {
        name: p.n,
        desc: p.desc,
        branch: DI_ZHI[pos],
        ganzhi: TIAN_GAN[palaceTG(pos)] + DI_ZHI[pos],
        stars: stars,
        pos: pos,
        tg: palaceTG(pos),
        minorStars: minorAt[pos] || [],
        adjStars: adjAt[pos] || [],
        brightness: stars.map(function(s) { return brightnessOf(s, borrowed ? mod12(pos + 6) : pos); }),
        minorBrightness: (minorAt[pos] || []).map(function(s) { return brightnessOf(s, pos); }),
        xiaoxianAge: xxAt[pos] || null,
        changsheng: csAt[pos] || '',
        borrowed: borrowed,
        star: stars.join('、') + (borrowed ? '（借）' : ''),
        starDesc: stars.map(function(s) { return s + '：' + STARS[s].desc; }).join(' '),
        starEle: first ? first.el : '土',
        starGlory: stars.map(function(s) { return STARS[s].g; }).join('/'),
        starText: stars.map(function(s) { var b = brightnessOf(s, borrowed ? mod12(pos + 6) : pos); return s + (b ? '（' + b + '）' : ''); }).join('、') + (borrowed ? '（借）' : ''),
        isMing: i === 0,
        isShen: pos === shenPos
      };
    });

    // 大限
    var hasGender = gender === 'male' || gender === 'female';
    var forward = hasGender && ((gender === 'male') === (yIdx % 2 === 0));
    var nowAge = new Date().getFullYear() - lunar.year + 1; // 虛歲（約略）
    var currentDecadal = null;
    if (hasGender) {
      palaces.forEach(function(p, i) {
        var pos = mod12(mingPos - i);
        var j = forward ? mod12(pos - mingPos) : mod12(mingPos - pos);
        p.decadal = { start: bureau + j * 10, end: bureau + j * 10 + 9 };
        if (nowAge >= p.decadal.start && nowAge <= p.decadal.end) { p.isCurrentDecadal = true; currentDecadal = p; }
      });
    }

    var mingPalace = palaces[0];
    var shenPalace = palaces.filter(function(p) { return p.isShen; })[0];

    return {
      palaces: palaces,
      lunar: lunar,
      lunarText: lunarText,
      bureau: nayin + ['','','二','三','四','五','六'][bureau] + '局',
      mingPalace: mingPalace,
      shenPalace: shenPalace,
      mingStar: mingPalace.star,
      mingEle: mingPalace.starEle,
      mingGlory: mingPalace.starGlory,
      mingDesc: (mingPalace.borrowed ? '命宮無主星，借對宮（遷移宮）' + mingPalace.stars.join('、') + '論。' : '') + mingPalace.starDesc,
      sihua: getSihua(yearTG, palaces),
      decadal: hasGender ? { forward: forward, current: currentDecadal, nowAge: nowAge } : null,
      birthLunarYear: lunar.year,
      gender: hasGender ? gender : ''
    };
  }

  function brightnessOf(star, pos) {
    var row = BRIGHTNESS[star];
    if (!row) return '';
    var c = row.charAt(pos);
    return c === '－' ? '' : c;
  }

  /** 某天干的四化落在盤上哪一宮 */
  function sihuaOf(tg, palaces) {
    var table = SIHUA_TABLE[tg];
    return Object.keys(table).map(function(type) {
      var star = table[type];
      var palace = palaces.filter(function(p) {
        return (!p.borrowed && p.stars.indexOf(star) >= 0) || p.minorStars.indexOf(star) >= 0;
      })[0] || null;
      return { type: type, star: star, palace: palace };
    });
  }

  /**
   * 運限：指定農曆年的大限、小限、流年（需要出生時辰與性別）
   * @param chart getZiweiChart 的結果
   * @param lunarYear 要看的農曆年（例如 2026 = 丙午年）
   */
  function getHoroscope(chart, lunarYear) {
    if (!chart || chart.needHour || !chart.gender) return null;
    var age = lunarYear - chart.birthLunarYear + 1; // 虛歲
    if (age < 1) return null;
    var yIdx = ((lunarYear - 4) % 60 + 60) % 60;
    var tgI = yIdx % 10, dzI = yIdx % 12;
    var byPos = {};
    chart.palaces.forEach(function(p) { byPos[p.pos] = p; });

    var decadal = chart.palaces.filter(function(p) { return p.decadal && age >= p.decadal.start && age <= p.decadal.end; })[0] || null;
    var xiaoxian = chart.palaces.filter(function(p) { return p.xiaoxianAge && (age - p.xiaoxianAge) % 12 === 0; })[0] || null;

    // 流年十二宮：流年命宮在流年地支，其餘逆排
    var yearlyNames = {};
    PALACES.forEach(function(p, i) { yearlyNames[mod12(dzI - i)] = '流' + p.n.replace('宮', ''); });

    return {
      year: lunarYear,
      ganzhi: TIAN_GAN[tgI] + DI_ZHI[dzI],
      age: age,
      decadal: decadal,
      decadalSihua: decadal ? sihuaOf(TIAN_GAN[decadal.tg], chart.palaces) : null,
      xiaoxian: xiaoxian,
      yearlyMing: byPos[dzI],
      yearlyNames: yearlyNames,
      yearlySihua: sihuaOf(TIAN_GAN[tgI], chart.palaces),
      yearlyStars: yearlyStarsAt(tgI, dzI)
    };
  }

  /** 依農曆年干取生年四化，並比對落於哪個宮位（palaces 為 null 時只列星曜） */
  function getSihua(tg, palaces) {
    var table = SIHUA_TABLE[tg];
    if (!table) return null;

    var list = Object.keys(table).map(function(type) {
      var star = table[type];
      var palace = null;
      if (palaces) {
        palace = palaces.filter(function(p) {
          return (!p.borrowed && p.stars.indexOf(star) >= 0) || p.minorStars.indexOf(star) >= 0;
        })[0] || null;
      }
      var reading = star + (palace ? '在' + palace.name : '') + type + '：' + SIHUA_MEANING[type];
      return { type: type, star: star, palace: palace, reading: reading };
    });

    return { tg: tg, list: list };
  }

  /** 紫微命宮 vs 姓名人格比對 */
  function ziweiNameCompare(ziwei, chineseResult) {
    if (!ziwei || ziwei.needHour || !chineseResult) return null;
    var renEle = chineseResult.grids.ren.element;
    var mingEle = ziwei.mingEle;

    // 五行關係
    var relMap = {
      '木木':'同氣相求','火火':'同氣相求','土土':'同氣相求','金金':'同氣相求','水水':'同氣相求',
      '木火':'相生吉配','火土':'相生吉配','土金':'相生吉配','金水':'相生吉配','水木':'相生吉配',
      '火木':'被生有貴人','土火':'被生有貴人','金土':'被生有貴人','水金':'被生有貴人','木水':'被生有貴人',
      '木土':'相剋需調和','土水':'相剋需調和','水火':'相剋需調和','火金':'相剋需調和','金木':'相剋需調和',
      '土木':'被剋有壓力','水土':'被剋有壓力','火水':'被剋有壓力','金火':'被剋有壓力','木金':'被剋有壓力'
    };
    var rel = relMap[mingEle + renEle] || '一般';

    var score = rel.indexOf('吉') >= 0 ? 85 : rel.indexOf('生') >= 0 ? 75 : rel.indexOf('同') >= 0 ? 70 : rel.indexOf('相剋') >= 0 ? 40 : 30;

    return {
      rel: rel,
      score: score,
      reading: '命宮主星' + ziwei.mingStar + '（' + mingEle + '）與人格' + renEle + '的關係為「' + rel + '」。' +
        (score >= 70 ? '命格與姓名五行和諧，先天命盤與後天姓名互相加持。' :
         '命格與姓名五行有衝突，建議透過改名或開運物來調和。')
    };
  }

  return {
    getZiweiChart: getZiweiChart,
    ziweiNameCompare: ziweiNameCompare,
    getHoroscope: getHoroscope,
    FLOWER_STARS: FLOWER_STARS,
    HELPER_STARS: HELPER_STARS,
    STARS: STARS,
    SHA_STARS: SHA_STARS,
    PALACES: PALACES
  };
})();
