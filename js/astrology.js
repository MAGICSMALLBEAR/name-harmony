/**
 * 占星盤引擎 — 行星+宮位+相位+姓名對應
 */
window.Astrology = (function() {

  var PLANETS = [
    {n:'太陽',e:'☀️',el:'火',desc:'核心自我、生命力、外在形象。代表你的本質與人生目標。'},
    {n:'月亮',e:'🌙',el:'水',desc:'情緒、潛意識、內在需求。代表你的情感模式與安全感來源。'},
    {n:'水星',e:'☿',el:'水',desc:'思維、溝通、學習。代表你的思考方式與表達能力。'},
    {n:'金星',e:'♀',el:'金',desc:'愛情、美感、價值觀。代表你的審美、感情與金錢觀。'},
    {n:'火星',e:'♂',el:'火',desc:'行動、慾望、競爭。代表你的動能、勇氣與脾氣。'},
    {n:'木星',e:'♃',el:'木',desc:'擴張、幸運、智慧。代表你的成長機會與人生哲學。'},
    {n:'土星',e:'♄',el:'土',desc:'責任、限制、紀律。代表你的人生課題與需要努力的方向。'},
    {n:'天王星',e:'♅',el:'金',desc:'創新、突破、自由。代表你的獨特性與改革精神。'},
    {n:'海王星',e:'♆',el:'水',desc:'夢想、靈性、幻覺。代表你的直覺、藝術天分與理想。'},
    {n:'冥王星',e:'♇',el:'火',desc:'轉化、重生、權力。代表你的深層力量與蛻變能力。'}
  ];

  var HOUSES = [
    {n:'第一宮 命宮',desc:'自我形象、氣質、給人的第一印象'},
    {n:'第二宮 財帛',desc:'金錢觀、價值觀、物質資源'},
    {n:'第三宮 溝通',desc:'思維模式、兄弟姊妹、短程旅行'},
    {n:'第四宮 家庭',desc:'原生家庭、根源、內心安全感'},
    {n:'第五宮 創作',desc:'戀愛、創意、子女、娛樂'},
    {n:'第六宮 工作',desc:'日常工作、健康、服務'},
    {n:'第七宮 婚姻',desc:'伴侶關係、合作、公開對手'},
    {n:'第八宮 轉化',desc:'深度連結、共享資源、轉變'},
    {n:'第九宮 探索',desc:'高等教育、哲學、長途旅行'},
    {n:'第十宮 事業',desc:'社會地位、職業、人生目標'},
    {n:'第十一宮 社群',desc:'朋友、團體、理想與願景'},
    {n:'第十二宮 潛意識',desc:'隱藏的自我、靈性、退隱'}
  ];

  var SIGNS = [
    {n:'牡羊座♈',el:'火',date:'3/21-4/19',desc:'開創火象，勇敢直接、充滿行動力。'},
    {n:'金牛座♉',el:'土',date:'4/20-5/20',desc:'固定土象，穩重務實、重視感官享受。'},
    {n:'雙子座♊',el:'風',date:'5/21-6/21',desc:'變動風象，聰明靈活、善於溝通。'},
    {n:'巨蟹座♋',el:'水',date:'6/22-7/22',desc:'開創水象，情感豐富、重視家庭與安全感。'},
    {n:'獅子座♌',el:'火',date:'7/23-8/22',desc:'固定火象，自信大方、有領導魅力。'},
    {n:'處女座♍',el:'土',date:'8/23-9/22',desc:'變動土象，細心謹慎、追求完美。'},
    {n:'天秤座♎',el:'風',date:'9/23-10/23',desc:'開創風象，優雅和諧、重視人際關係。'},
    {n:'天蠍座♏',el:'水',date:'10/24-11/22',desc:'固定水象，深沉神秘、意志堅強。'},
    {n:'射手座♐',el:'火',date:'11/23-12/21',desc:'變動火象，樂觀自由、追求冒險。'},
    {n:'摩羯座♑',el:'土',date:'12/22-1/19',desc:'開創土象，腳踏實地、有企圖心。'},
    {n:'水瓶座♒',el:'風',date:'1/20-2/18',desc:'固定風象，獨立創新、重視自由。'},
    {n:'雙魚座♓',el:'水',date:'2/19-3/20',desc:'變動水象，敏感慈悲、有藝術天分。'}
  ];

  function getSign(month, day) {
    if (!month || !day) return SIGNS[0];
    var dateStr = month + '/' + day;
    var cuts = [[3,21],[4,20],[5,21],[6,22],[7,23],[8,23],[9,23],[10,24],[11,23],[12,22],[1,20],[2,19]];
    for (var i = 0; i < cuts.length; i++) {
      var next = cuts[(i + 1) % 12];
      if ((month > cuts[i][0] || (month === cuts[i][0] && day >= cuts[i][1])) &&
          (month < next[0] || (month === next[0] && day <= next[1] || (next[0] === 1 && month === 12)))) {
        return SIGNS[(i + 1) % 12];
      }
    }
    return SIGNS[3]; // default
  }

  // 主要相位定義：以12宮位間隔（每宮30°）換算的角度關係
  // step = 兩宮位索引差（取最短方向，0~6）
  var ASPECT_DEFS = {
    0: { type:'合相',   angle:'0°',   nature:'中性', priority:1, desc:'兩星能量完全融合，特質疊加、效果加乘（吉凶依星曜本質而定）。' },
    2: { type:'六合相', angle:'60°',  nature:'吉',   priority:4, desc:'和諧的助力，兩者能自然搭配、創造機會與資源。' },
    3: { type:'四分相', angle:'90°',  nature:'挑戰', priority:2, desc:'產生摩擦與張力，帶來壓力但也是成長與突破的契機。' },
    4: { type:'三合相', angle:'120°', nature:'吉',   priority:3, desc:'順暢自然的合作關係，兩股力量相輔相成、如虎添翼。' },
    6: { type:'對分相', angle:'180°', nature:'挑戰', priority:1, desc:'兩極拉扯、彼此對立，需要學習整合並找到平衡點。' }
  };

  /** 計算全行星兩兩相位（10星共45組），依重要性排序 */
  function getAspects(planets) {
    var list = [];
    for (var i = 0; i < planets.length; i++) {
      for (var j = i + 1; j < planets.length; j++) {
        var hi = HOUSES.indexOf(planets[i].house);
        var hj = HOUSES.indexOf(planets[j].house);
        var diff = Math.abs(hi - hj);
        var step = Math.min(diff, 12 - diff);
        var def = ASPECT_DEFS[step];
        if (!def) continue; // 30°/150° 為次要相位，略過
        list.push({
          p1: planets[i].name, p1Emoji: planets[i].emoji,
          p2: planets[j].name, p2Emoji: planets[j].emoji,
          type: def.type, angle: def.angle, nature: def.nature, priority: def.priority,
          desc: planets[i].name + '與' + planets[j].name + '形成' + def.type + '（' + def.angle + '）：' + def.desc
        });
      }
    }
    list.sort(function(a, b) { return a.priority - b.priority; });
    return list;
  }

  function getChart(year, month, day, hour) {
    if (!year || !month || !day) return null;
    var sunSign = getSign(month, day);
    var seed = year * 10000 + month * 100 + day + (hour || 12);

    // 簡化行星+宮位分配
    var planets = PLANETS.map(function(p, i) {
      var houseIdx = (seed + i * 3 + 7) % 12;
      return { name: p.n, emoji: p.e, element: p.el, desc: p.desc, house: HOUSES[houseIdx] };
    });

    // 全行星相位
    var aspects = getAspects(planets);

    // 姓名對應
    var dominant = sunSign.element;
    var nameMatch = {
      '火':'熱情行動派，名字若多火屬性則加倍旺盛，缺火則可補。',
      '土':'穩健務實派，名字若多土屬性則根基穩固，缺土則可補。',
      '風':'靈活溝通派，名字若多金屬性則思維敏捷，缺金則可補。',
      '水':'感性直覺派，名字若多水屬性則感受力強，缺水則可補。'
    };

    return {
      sunSign: sunSign,
      planets: planets,
      aspects: aspects,
      dominantElement: dominant,
      nameAdvice: nameMatch[dominant] || ''
    };
  }

  return { getChart: getChart, PLANETS: PLANETS, HOUSES: HOUSES, SIGNS: SIGNS, getSign: getSign };
})();
