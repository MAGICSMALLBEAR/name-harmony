/**
 * 紫微斗數簡易引擎 — 12宮+14主星+命宮分析
 */
window.Ziwei = (function() {

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

  /** 依生日排紫微盤 */
  function getZiweiChart(year, month, day, hour) {
    if (!year || !month || !day) return null;
    // 用生日+性別決定命宮位置（簡化演算法）
    var seed = year * 10000 + month * 100 + day + (hour || 12);
    var mingIdx = seed % 12;

    // 排14主星到12宮（簡化分配）
    var starKeys = Object.keys(STARS);
    var palaces = PALACES.map(function(p, i) {
      var starIdx = (seed + i * 7) % starKeys.length;
      var starName = starKeys[starIdx];
      var star = STARS[starName];
      return {
        name: p.n,
        desc: p.desc,
        star: starName,
        starDesc: star.desc,
        starEle: star.el,
        starGlory: star.g,
        isMing: i === mingIdx
      };
    });

    var mingPalace = palaces[mingIdx];

    return {
      palaces: palaces,
      mingPalace: mingPalace,
      mingStar: mingPalace.star,
      mingEle: mingPalace.starEle,
      mingGlory: mingPalace.starGlory,
      mingDesc: mingPalace.starDesc
    };
  }

  /** 紫微命宮 vs 姓名人格比對 */
  function ziweiNameCompare(ziwei, chineseResult) {
    if (!ziwei || !chineseResult) return null;
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
    STARS: STARS,
    PALACES: PALACES
  };
})();
