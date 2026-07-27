/**
 * 開運物推薦引擎 — 水晶/礦石/色彩/香氛/飲食/穿搭
 */
window.LuckyItems = (function() {

  var ELEMENT_ITEMS = {
    '木': {
      crystal: [
        {n:'綠幽靈',e:'招正財、事業運',emoji:'💎'},
        {n:'橄欖石',e:'增強自信、帶來好運',emoji:'🟢'},
        {n:'孔雀石',e:'轉化負能量、保護',emoji:'💚'},
        {n:'綠松石',e:'溝通表達、旅行平安',emoji:'🔷'}
      ],
      color: {main:'綠色、青色',accent:'翠綠、薄荷綠',avoid:'白色、金色過多'},
      aroma: {name:'檀香、松木、檸檬草',effect:'穩定心神、增強創造力'},
      diet: '多吃綠色蔬菜、芽菜、抹茶。少食辛辣油膩。',
      style: '自然風、棉麻材質、植物圖騰。適合簡約文青風格。',
      powerSpot: '森林、公園、植物園。多接觸大自然能量。'
    },
    '火': {
      crystal: [
        {n:'紅寶石',e:'熱情自信、事業成功',emoji:'❤️'},
        {n:'石榴石',e:'活化生命力、增強魅力',emoji:'🔴'},
        {n:'太陽石',e:'帶來歡樂、消除憂鬱',emoji:'☀️'},
        {n:'紫水晶',e:'開智慧、鎮定心神',emoji:'💜'}
      ],
      color: {main:'紅色、紫色、粉紅色',accent:'酒紅、珊瑚色',avoid:'黑色、藍色過多'},
      aroma: {name:'肉桂、茉莉、橙花',effect:'提升熱情、增強行動力'},
      diet: '適量辣椒、番茄、紅棗。多補充鐵質。',
      style: '亮眼時尚風、紅色配件。適合展現個人魅力。',
      powerSpot: '繁華市區、高樓景觀、人多熱鬧處。'
    },
    '土': {
      crystal: [
        {n:'黃水晶',e:'招偏財、事業順利',emoji:'💛'},
        {n:'琥珀',e:'安神定氣、避邪化煞',emoji:'🟤'},
        {n:'虎眼石',e:'增強自信、判斷力',emoji:'🐯'},
        {n:'茶晶',e:'穩定情緒、接地氣',emoji:'🤎'}
      ],
      color: {main:'黃色、棕色、大地色',accent:'卡其、駝色',avoid:'綠色過多'},
      aroma: {name:'檀香、廣藿香、雪松',effect:'穩定踏實、增強安全感'},
      diet: '根莖類、南瓜、黃豆。飲食定時定量。',
      style: '經典穩重風、大地色系。西裝外套、質感配件。',
      powerSpot: '山區、茶園、古蹟寺廟。穩定氣場。'
    },
    '金': {
      crystal: [
        {n:'白水晶',e:'淨化磁場、增強能量',emoji:'💎'},
        {n:'月光石',e:'平衡情緒、提升直覺',emoji:'🌙'},
        {n:'蛋白石',e:'創意靈感、藝術氣質',emoji:'✨'},
        {n:'鑽石',e:'純淨能量、提升氣場',emoji:'💠'}
      ],
      color: {main:'白色、金色、銀色',accent:'米白、珍珠白',avoid:'紅色過多'},
      aroma: {name:'乳香、沒藥、尤加利',effect:'淨化思緒、增強決斷力'},
      diet: '白色食物、杏仁、豆腐。清淡飲食。',
      style: '極簡高級風、金屬飾品。黑白配、線條俐落。',
      powerSpot: '金融區、圖書館、美術館。提升專業氣場。'
    },
    '水': {
      crystal: [
        {n:'海藍寶',e:'溝通表達、勇氣',emoji:'🌊'},
        {n:'黑曜石',e:'避邪擋煞、清除負能量',emoji:'🖤'},
        {n:'青金石',e:'智慧、真理、直覺',emoji:'🔵'},
        {n:'藍寶石',e:'智慧、忠誠、心靈平靜',emoji:'💙'}
      ],
      color: {main:'藍色、黑色、深灰色',accent:'海軍藍、靛藍',avoid:'棕色、黃色過多'},
      aroma: {name:'薰衣草、薄荷、迷迭香',effect:'放鬆心情、增強直覺'},
      diet: '多喝水、海鮮、黑色食物（黑豆黑芝麻）。',
      style: '知性優雅風、藍黑色系。流線型設計、飄逸材質。',
      powerSpot: '海邊、湖邊、溫泉、流水處。洗滌心靈。'
    }
  };

  function getRecommendations(element) {
    var el = element || '木';
    return ELEMENT_ITEMS[el] || ELEMENT_ITEMS['木'];
  }

  /** 產生個人開運指南 HTML */
  function generateGuide(element) {
    var items = getRecommendations(element);
    var html = '';

    // 水晶推薦
    html += '<div class="report-section"><div class="report-section-title">💎 開運水晶</div>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">';
    items.crystal.forEach(function(c) {
      html += '<div style="padding:8px;background:var(--color-bg-mid);border-radius:8px;text-align:center;">';
      html += '<div style="font-size:1.5rem;">' + c.emoji + '</div>';
      html += '<div style="font-weight:600;color:var(--color-gold-light);font-size:0.85rem;">' + c.n + '</div>';
      html += '<div style="font-size:0.7rem;color:var(--color-text-secondary);">' + c.e + '</div>';
      html += '</div>';
    });
    html += '</div></div>';

    // 色彩能量
    html += '<div class="report-section"><div class="report-section-title">🎨 色彩能量</div>';
    html += '<p style="font-size:0.85rem;color:var(--color-text-secondary);">🟢 主色調：<strong>' + items.color.main + '</strong></p>';
    html += '<p style="font-size:0.85rem;color:var(--color-text-secondary);">✨ 點綴色：<strong>' + items.color.accent + '</strong></p>';
    html += '<p style="font-size:0.8rem;color:var(--color-fortune-neutral);">⚠️ 避免：' + items.color.avoid + '</p>';
    html += '</div>';

    // 香氛
    html += '<div class="report-section"><div class="report-section-title">🕯️ 開運香氛</div>';
    html += '<p style="font-size:0.85rem;color:var(--color-text-secondary);"><strong>' + items.aroma.name + '</strong></p>';
    html += '<p style="font-size:0.8rem;color:var(--color-text-secondary);">功效：' + items.aroma.effect + '</p>';
    html += '</div>';

    // 穿搭
    html += '<div class="report-section"><div class="report-section-title">👗 穿搭建議</div>';
    html += '<p style="font-size:0.85rem;color:var(--color-text-secondary);">' + items.style + '</p>';
    html += '</div>';

    // 飲食
    html += '<div class="report-section"><div class="report-section-title">🍽️ 開運飲食</div>';
    html += '<p style="font-size:0.85rem;color:var(--color-text-secondary);">' + items.diet + '</p>';
    html += '</div>';

    // 能量景點
    html += '<div class="report-section"><div class="report-section-title">📍 能量景點</div>';
    html += '<p style="font-size:0.85rem;color:var(--color-text-secondary);">' + items.powerSpot + '</p>';
    html += '</div>';

    return html;
  }

  return {
    getRecommendations: getRecommendations,
    generateGuide: generateGuide,
    ELEMENT_ITEMS: ELEMENT_ITEMS
  };
})();
