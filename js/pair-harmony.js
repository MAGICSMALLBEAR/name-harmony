/**
 * 雙人和盤引擎 v2 — 豐富解說版
 * 中中和盤 + 英英和盤 + 中英跨文化和盤
 */
window.PairHarmony = (function() {

  function digitToElement(num) {
    var d = num % 10;
    if (d === 1 || d === 2) return '木';
    if (d === 3 || d === 4) return '火';
    if (d === 5 || d === 6) return '土';
    if (d === 7 || d === 8) return '金';
    return '水';
  }

  var EL = {
    '木': { g:'火', o:'土', b:'金', d:'水', name:'木', nature:'生長、向上、仁慈、創意', style:'積極進取、充滿理想、有領導魅力', pair:'重視精神交流，喜歡一同成長進步' },
    '火': { g:'土', o:'金', b:'水', d:'木', name:'火', nature:'熱情、行動、禮儀、表達', style:'熱情奔放、行動力強、感染力十足', pair:'追求熱烈互動，喜歡一起完成目標' },
    '土': { g:'金', o:'水', b:'木', d:'火', name:'土', nature:'穩定、誠信、包容、務實', style:'穩重可靠、腳踏實地、值得信賴', pair:'重視實際承諾，喜歡建立安穩的關係' },
    '金': { g:'水', o:'木', b:'火', d:'土', name:'金', nature:'果斷、正義、剛毅、組織', style:'果決明快、重視原則、有領導力', pair:'重視公平正義，喜歡有規則的互動模式' },
    '水': { g:'木', o:'火', b:'土', d:'金', name:'水', nature:'智慧、靈活、溝通、適應', style:'聰明靈活、善於溝通、有藝術氣質', pair:'重視心靈交流，喜歡深度對話與理解' }
  };

  function relName(a, b) {
    if (a === b) return '相同';
    var r = EL[a]; if (!r) return '未知';
    if (r.g === b) return '相生';
    if (r.o === b) return '相剋';
    if (r.d === b) return '被生';
    if (r.b === b) return '被剋';
    return '未知';
  }

  // ============ 中中和盤（豐富版）============
  function cncnHarmony(cnA, cnB) {
    if (!cnA || !cnB) return null;

    var renA = cnA.grids.ren, renB = cnB.grids.ren;
    var zongA = cnA.grids.zong, zongB = cnB.grids.zong;
    var diA = cnA.grids.di, diB = cnB.grids.di;
    var waiA = cnA.grids.wai, waiB = cnB.grids.wai;
    var rr = relName(renA.element, renB.element);

    // 1. 人格配對（核心，30分）
    var renScore, renDetail;
    if (rr === '相生') {
      renScore = 30;
      renDetail = '人格五行' + renA.element + '生' + renB.element + ' — 這是極為理想的配對。' +
        renA.element + '方的' + EL[renA.element].nature + '特質，能自然而然地滋養、支持' + renB.element + '方。' +
        renA.element + '方像陽光與養分，' + renB.element + '方則像被滋潤的幼苗，雙方關係中有著溫暖的給予與感恩的接受。' +
        '這樣的組合在長期相處中能持續產生正向能量循環。';
    } else if (rr === '被生') {
      renScore = 30;
      renDetail = '人格五行' + renB.element + '生' + renA.element + ' — ' +
        renB.element + '方是' + renA.element + '方的貴人，能看見對方的潛力並給予支持。' +
        renA.element + '方在' + renB.element + '方的陪伴下會感到被理解與被成全。' +
        '這是一種互相成就的關係，一個給予、一個接收，形成美好的能量流動。';
    } else if (rr === '相同') {
      renScore = 24;
      renDetail = '雙方人格五行同為' + renA.element + ' — 你們有相同的本質與價值觀。' +
        '兩個' + renA.element + '屬性的人在一起，就像照鏡子一樣，能深刻理解對方的想法與感受。' +
        EL[renA.element].pair + '。但需注意，過於相似也可能缺少互補，建議在不同領域各自發展所長，回到關係中再互相分享。';
    } else if (rr === '被剋') {
      renScore = 10;
      renDetail = '人格五行' + renA.element + '被' + renB.element + '剋 — ' +
        renA.element + '方在關係中可能感到被壓制或不被理解。' + renB.element + '方雖然本意可能是好的，但表達方式容易讓' + renA.element + '方感到壓力。' +
        '建議' + renB.element + '方多傾聽、多給予空間；' + renA.element + '方則需要學會表達自己的感受，不要一味忍耐。' +
        '雙方若能意識到這個五行動態，反而可以化衝突為成長。';
    } else {
      renScore = 14;
      renDetail = '人格五行' + renA.element + '剋' + renB.element + ' — ' +
        renA.element + '方天生較強勢，容易主導關係走向。' + renB.element + '方可能感到自己的意見不被重視。' +
        '建議' + renA.element + '方練習收斂鋒芒、多給對方表現空間；' + renB.element + '方則可學習' + EL[renB.element].nature + '的優勢來平衡關係。' +
        '若能互相尊重，這仍是一段能教學相長的關係。';
    }

    // 2. 總格配對（20分）
    var diff = Math.abs(zongA.number - zongB.number);
    var zongScore, zongDetail;
    if (diff <= 2) {
      zongScore = 20;
      zongDetail = '總格數字' + zongA.number + '與' + zongB.number + '幾乎相同 — 你們的人生方向與終極目標高度一致。' +
        '就像兩條並行的河流，最終匯入同一片大海。在重大人生決策上，你們容易達成共識，能成為彼此最堅實的盟友。';
    } else if (diff <= 5) {
      zongScore = 17;
      zongDetail = '總格差距' + diff + ' — 人生大方向接近，但路徑有所不同。' +
        '一個可能更注重事業成就，另一個可能更看重家庭生活。雖然目標不盡相同，但可以互相補足彼此的不足，形成全方位的合作關係。';
    } else if (diff <= 10) {
      zongScore = 13;
      zongDetail = '總格差距' + diff + ' — 人生觀有明顯差異，但並非不能調和。' +
        '一個像遠洋航行的船，一個像扎根土地的樹，各自在不同領域發光。關鍵是彼此尊重對方的選擇，不強求對方改變方向。';
    } else {
      zongScore = 7;
      zongDetail = '總格數字差距較大（' + zongA.number + ' vs ' + zongB.number + '）— 人生道路差異明顯。' +
        '不過這不一定是壞事，不同方向的兩個人在一起，反而能看見彼此看不到的風景。需要的是更多的溝通與包容。';
    }
    if (zongA.number % 10 === zongB.number % 10) { zongScore += 3; zongDetail += ' 值得注意的是總格尾數相同，五行一致，這是隱性的頻率共鳴。'; }

    // 3. 地格配對（家族/家庭，15分）
    var diRel = relName(diA.element, diB.element);
    var diScore, diDetail;
    if (diRel === '相生' || diRel === '被生') {
      diScore = 15; diDetail = '地格五行和諧 — 雙方的家庭背景、成長環境能量相容。在共同生活或合作的日常細節上，能自然磨合，建立默契。適合長期共同居住或共事。';
    } else if (diRel === '相同') {
      diScore = 12; diDetail = '地格五行相同 — 雙方的生活習慣與價值觀相近，日常相處融洽。但可能缺乏新鮮感，建議偶爾一起嘗試新事物。';
    } else {
      diScore = 7; diDetail = '地格五行衝突 — 在日常生活細節上可能容易產生摩擦。一個愛整潔、一個較隨性；一個早起、一個夜貓。需要建立明確的生活分工與互相體諒。';
    }

    // 4. 外格配對（社交/對外，15分）
    var waiRel = relName(waiA.element, waiB.element);
    var waiScore, waiDetail;
    if (waiRel === '相生' || waiRel === '被生' || waiRel === '相同') {
      waiScore = 15; waiDetail = '外格和諧 — 在社交場合中配合默契，共同面對外界時能形成良好團隊形象。朋友眼中你們是相輔相成的一對。';
    } else {
      waiScore = 8; waiDetail = '外格衝突 — 在社交圈或公開場合的互動方式不同，一方外向一方內向，或處理外部事務的風格迥異。建議分工：讓適合的人負責適合的場合。';
    }

    // 5. 吉凶互補（20分）
    var goodA = (cnA.fortuneCounts['大吉']||0)+(cnA.fortuneCounts['吉']||0)+(cnA.fortuneCounts['中吉']||0);
    var badA = (cnA.fortuneCounts['凶']||0)+(cnA.fortuneCounts['大凶']||0);
    var goodB = (cnB.fortuneCounts['大吉']||0)+(cnB.fortuneCounts['吉']||0)+(cnB.fortuneCounts['中吉']||0);
    var badB = (cnB.fortuneCounts['凶']||0)+(cnB.fortuneCounts['大凶']||0);
    var compScore, compDetail;
    if (goodA >= 3 && goodB >= 3) {
      compScore = 20; compDetail = '雙方五格吉數充沛（A:' + goodA + '吉 B:' + goodB + '吉），命理基礎穩固。就像兩棵根系發達的大樹，即使遇到風雨也能相互扶持屹立不搖。';
    } else if (goodA + goodB >= 5) {
      compScore = 14; compDetail = '五格吉數總量尚可，命理基礎有一定支撐力。雙方可以在彼此較弱的格局上互相補位，形成團隊優勢。';
    } else if (badA + badB >= 4) {
      compScore = 6; compDetail = '雙方凶數較多（A凶:' + badA + ' B凶:' + badB + '），命理基礎較弱。這不代表關係一定不好，但需要比一般伴侶付出更多的耐心與智慧來經營。';
    } else {
      compScore = 10; compDetail = '五格吉凶參差，一方較強一方較弱。強者可以在關鍵時刻扶持弱者，但長期下來需注意平衡，避免形成單向依賴。';
    }

    var rawScore = renScore + zongScore + diScore + waiScore + compScore;
    var score = Math.round(rawScore / 100 * 100);
    score = Math.max(8, Math.min(98, score));

    // 綜合解讀
    var reading = generateCnCnReading(renA, renB, rr, score, rawScore);

    return {
      mode: '中中和盤', modeClass: 'mode-cncn',
      score: score, rawScore: rawScore, maxRawScore: 100,
      tier: getTier(score), tierDesc: getTierDesc(score, '中中文'),
      reading: reading,
      dimensions: [
        { label: '🎭 人格配對', score: renScore, max: 30, detail: renDetail },
        { label: '🎯 總格共振', score: zongScore, max: 23, detail: zongDetail },
        { label: '🏠 地格契合', score: diScore, max: 15, detail: diDetail },
        { label: '🌐 外格協調', score: waiScore, max: 15, detail: waiDetail },
        { label: '🔢 吉凶互補', score: compScore, max: 20, detail: compDetail }
      ]
    };
  }

  function generateCnCnReading(renA, renB, rr, score, rawScore) {
    var parts = [];
    parts.push('【關係本質】' + renA.element + '（人格' + renA.number + '劃）與' + renB.element + '（人格' + renB.number + '劃）的組合，' +
      '彷彿「' + EL[renA.element].nature + '」遇上了「' + EL[renB.element].nature + '」。');

    if (rr === '相生') {
      parts.push('這是一段互相滋養的關係。在五行循環中，' + renA.element + '生' + renB.element + '，' +
        '就像樹木燃燒產生火焰（木生火）、水流灌溉樹木（水生木），你們之間的能量自然而順暢地流動。' +
        renA.element + '方會不自覺地想要付出與支持，而' + renB.element + '方也會心懷感恩地接受並成長。' +
        '長期來看，這組關係能讓雙方都變得更好——一個學會付出，一個學會接受，形成良性循環。');
    } else if (rr === '被生') {
      parts.push('這是一段有貴人加持的關係。' + renB.element + '生' + renA.element + '，' +
        renB.element + '方像陽光雨露，滋養著' + renA.element + '方的成長。' +
        renA.element + '方在' + renB.element + '方面前會感到被理解、被支持，而' + renB.element + '方也會從付出中獲得成就感。' +
        '需要注意：接受方不要變得過度依賴，給予方也不要忘記照顧自己。平衡的付出與接受才是長久之道。');
    } else if (rr === '相同') {
      parts.push('你們擁有相同的五行本質（' + renA.element + '）。就像兩棵同一品種的樹，' +
        '不需要翻譯就能理解彼此的節奏與需求。' + EL[renA.element].pair + '。' +
        '這種組合的優勢是高度默契，但有時也因太過相似而缺少新鮮感或互補性。' +
        '建議：在共同的基礎上，各自發展不同的興趣與專長，帶回關係中分享，讓關係持續有新的養分。');
    } else if (rr === '被剋') {
      parts.push('五行中' + renA.element + '被' + renB.element + '剋制，就像火被水澆熄、金被火熔解。' +
        renA.element + '方可能在關係中感到壓力或不被理解，而' + renB.element + '方可能察覺不到自己的強勢。' +
        '這不代表關係不能成功，而是需要更高的自覺：' + renB.element + '方要學會柔軟與退讓，' +
        renA.element + '方則需要勇於表達感受，不要一味忍耐。當雙方都能意識到這個動態，' +
        '這段關係反而能成為彼此成長最深的契機。');
    } else {
      parts.push('五行中' + renA.element + '剋' + renB.element + '，' + renA.element + '方天生較強勢。' +
        '這就像斧頭砍樹（金剋木）、水來土掩（土剋水），一方的主導性較強。' +
        '如果不加以調整，' + renB.element + '方可能逐漸失去發言權與自信。' +
        '建議：' + renA.element + '方多給對方空間和肯定，' + renB.element + '方則發展自己的獨立領域以增強自信。' +
        '當雙方找到權力平衡點時，這種組合也能產生強大的互補效果。');
    }

    if (score >= 80) {
      parts.push('【整體評價】這是一組極為契合的中文姓名組合（' + score + '分）。無論是事業合作、友誼或更親密的關係，' +
        '都有極佳的先天條件。你們的能量頻率高度一致，在一起時能創造出一加一大於二的效果。' +
        '建議珍惜這份緣分，用心經營，能開花結果。');
    } else if (score >= 60) {
      parts.push('【整體評價】配置良好（' + score + '分），雖然不是完美無缺，但已具備良好基礎。' +
        '你們在某些領域非常互補，在另一些領域則需要磨合。關鍵是把強項發揮到極致，弱項則用溝通與耐心來補足。' +
        '大多數長久穩定的關係都落在這個區間——既有火花，也需要經營。');
    } else if (score >= 40) {
      parts.push('【整體評價】這組配對需要較多的磨合（' + score + '分）。先天命理有些衝突點，' +
        '但這不代表關係不能成功。反而，需要努力經營的關係往往讓人學到最多。' +
        '關鍵是雙方是否願意為了這段關係付出額外的努力與包容。');
    } else {
      parts.push('【整體評價】命理顯示較多衝突（' + score + '分），若為重要關係，建議多花時間觀察與溝通。' +
        '然而命理僅供參考，真正的關係品質取決於雙方的用心。每一段關係都有其獨特的價值與學習。');
    }

    parts.push('【給' + renA.element + '方的建議】你的人格屬' + renA.element + '，本質是' + EL[renA.element].nature + '。' +
      '在關係中，你擅長' + EL[renA.element].style + '。發揮這個優勢，同時留意' + renA.element + '屬性的盲點。');
    parts.push('【給' + renB.element + '方的建議】你的人格屬' + renB.element + '，本質是' + EL[renB.element].nature + '。' +
      '在關係中，你擅長' + EL[renB.element].style + '。珍惜你的特質，也要學習欣賞對方與你的不同之處。');

    return { summary: parts.join('\n\n') };
  }

  // ============ 英英和盤（豐富版）============
  function enenHarmony(enA, enB) {
    if (!enA || !enB) return null;
    var aD = enA.destiny, bD = enB.destiny;
    var aS = enA.soulUrge, bS = enB.soulUrge;
    var aP = enA.personality, bP = enB.personality;

    // 1. 命運配對（35分）
    var compatMap = {1:[1,3,5,7,9],2:[2,4,6,8],3:[1,3,5,6,9],4:[2,4,6,7,8],5:[1,3,5,7,9],6:[2,3,4,6,9],7:[1,4,5,7],8:[2,4,6,8],9:[1,3,5,6,9],11:[2,4,6,7,9],22:[4,6,8],33:[3,6,9]};
    var compat = compatMap[aD] || [];
    var dScore, dDetail;
    if (compat.indexOf(bD) >= 0) {
      dScore = 35;
      dDetail = '命運數字' + aD + '與' + bD + '高度相容！在畢達哥拉斯數字學中，這兩個數字屬於同一能量族群。' +
        '你們的人生使命相互呼應，在一起時能放大彼此的天賦。如同兩個和諧的音符，組合起來就是一首優美的樂章。';
    } else if (Math.abs(aD - bD) <= 2) {
      dScore = 24;
      dDetail = '命運數字接近（' + aD + '與' + bD + '），能量頻率相鄰。雖然人生方向略有不同，但能互補長短。' +
        '一個的強項往往能補足另一個的弱項，形成實用的合作關係。';
    } else {
      dScore = 14;
      dDetail = '命運數字' + aD + '與' + bD + '屬於不同能量族群。這代表你們來到這個世界要學習的課題不同。' +
        '這樣的組合很有挑戰性，但也提供了廣闊的成長空間。關鍵是尊重彼此的人生道路，不求同化而求理解。';
    }

    // 2. 靈魂共鳴（25分）
    var sScore, sDetail;
    if (aS === bS) {
      sScore = 25;
      sDetail = '靈魂數字同為' + aS + ' — 你們內心深處的渴望完全一致。這是非常罕見的靈魂層面的共鳴。' +
        '在一起時，不需要太多言語就能理解對方的感受。這種深層的連結能超越表面的差異，是關係最堅實的基礎。';
    } else if (Math.abs(aS - bS) <= 2) {
      sScore = 18;
      sDetail = '靈魂數字接近 — 內心世界有一定交集。你們可能喜歡相似的事物、有接近的價值觀。' +
        '雖然不像完全相同那樣心有靈犀，但已經足夠建立深厚的情感連結。';
    } else {
      sScore = 11;
      sDetail = '靈魂數字' + aS + '與' + bS + '有明顯差異。內心的渴望與驅動力不同，可能導致在重要決策上意見分歧。' +
        '建議多花時間了解對方真正在乎的是什麼，不要只從自己的角度解讀對方的行為。';
    }

    // 3. 個性互補（25分）
    var pScore, pDetail;
    if (aP === bP) {
      pScore = 22;
      pDetail = '個性數字同為' + aP + ' — 外在表現相似，初次見面就容易產生好感。' +
        '相似的溝通風格與行為模式讓相處變得輕鬆自然。不過長期下來可能需要刻意創造一些新鮮感。';
    } else {
      var compPairs = {1:9,2:8,3:7,4:6,5:5,6:4,7:3,8:2,9:1,11:2,22:4,33:6};
      if (compPairs[aP] === bP || compPairs[bP] === aP) {
        pScore = 25;
        pDetail = '個性數字' + aP + '與' + bP + '是經典的互補組合！一個負責開創，一個負責收尾；' +
          '一個外向進取，一個內斂沉穩。就像鎖與鑰匙，彼此補足了對方最需要的部分。';
      } else {
        pScore = 14;
        pDetail = '個性風格不同，雖非天生互補，但能帶來不同的視角。' +
          '建議欣賞彼此處理事情的獨特方式，而不是試圖改變對方。差異本身就是一種豐富。';
      }
    }

    // 4. 名字長度共振（15分）
    var diff = Math.abs(enA.letterCount - enB.letterCount);
    var lScore, lDetail;
    if (diff === 0) { lScore = 15; lDetail = '名字長度完全相同（' + enA.letterCount + '字母）— 這是奇妙的數字巧合！在命理學中，代表你們在物理層面有天然的共振。'; }
    else if (diff <= 2) { lScore = 12; lDetail = '名字長度接近，在發音節奏上容易產生和諧感。日常稱呼對方時，音律的親和度會加分。'; }
    else { lScore = 8; lDetail = '名字長度差異較大，音律節奏不同。但這也能成為特色，彼此的稱呼方式本身就帶著異國情調。'; }

    var rawScore = dScore + sScore + pScore + lScore;
    var score = Math.round(rawScore / 100 * 100);
    score = Math.max(8, Math.min(98, score));

    var reading = generateEnEnReading(aD, bD, aS, bS, aP, bP, score);

    return {
      mode: '英英和盤', modeClass: 'mode-enen',
      score: score, rawScore: rawScore, maxRawScore: 100,
      tier: getTier(score), tierDesc: getTierDesc(score, '英文'),
      reading: reading,
      dimensions: [
        { label: '🎭 命運配對', score: dScore, max: 35, detail: dDetail },
        { label: '💖 靈魂共鳴', score: sScore, max: 25, detail: sDetail },
        { label: '🎪 個性互補', score: pScore, max: 25, detail: pDetail },
        { label: '📏 長度共振', score: lScore, max: 15, detail: lDetail }
      ]
    };
  }

  function generateEnEnReading(aD, bD, aS, bS, aP, bP, score) {
    var parts = [];
    parts.push('【數字能量解析】命運數字' + aD + '與命運數字' + bD + '的相遇，靈魂數字' + aS + '與' + bS + '的深層對話，' +
      '個性數字' + aP + '與' + bP + '的外在互動——這三個層次共同描繪了你們的關係全貌。');

    if (aD === 1 || bD === 1) parts.push('數字1（領袖）的能量：在關係中自然地想要主導與開創。有數字1的一方需要練習傾聽與分享權力，' +
      '而另一方則要欣賞對方的行動力，同時溫和地表達自己的需求。');
    if (aD === 2 || bD === 2) parts.push('數字2（外交家）的能量：極度重視關係的和諧與平衡。有數字2的一方對情緒氛圍非常敏感，' +
      '會主動維護關係的和平。另一方需注意不要輕忽了這種細膩的感受力。');
    if (aD === 3 || bD === 3) parts.push('數字3（創作者）的能量：帶來歡笑、創意與社交活力。有數字3的一方善於表達與帶動氣氛，' +
      '讓關係保持新鮮有趣。需注意偶爾的散漫或情緒化可能讓對方感到不安。');
    if (aD === 4 || bD === 4) parts.push('數字4（建造者）的能量：腳踏實地、重視承諾。有數字4的一方是關係中穩定的基石，' +
      '雖然不擅長浪漫，但是最可靠的伴侶。另一方可以多引導對方放鬆與享受生活。');
    if (aD === 5 || bD === 5) parts.push('數字5（冒險家）的能量：熱愛自由與變化。有數字5的一方為關係帶來刺激與新鮮感，' +
      '但可能讓伴侶感到不安。關鍵是找到「自由」與「承諾」之間的平衡點。');
    if (aD === 6 || bD === 6) parts.push('數字6（關懷者）的能量：天生具有強烈的責任感與保護欲。有數字6的一方會無微不至地照顧對方，' +
      '但需注意不要變成過度干涉。關係中最重要的是讓對方感受到被愛而非被控制。');
    if (aD === 7 || bD === 7) parts.push('數字7（探索者）的能量：追求深度與真理。有數字7的一方需要大量獨處時間來思考，' +
      '伴侶需理解這不是冷淡而是天性。精神層面的交流對他們而言比物質更重要。');
    if (aD === 8 || bD === 8) parts.push('數字8（成就者）的能量：目標導向、追求成功。有數字8的一方會努力為關係打造穩固的物質基礎，' +
      '但要注意不要讓工作與成就佔據了情感交流的時間。');
    if (aD === 9 || bD === 9) parts.push('數字9（人道主義者）的能量：胸懷大愛、樂於奉獻。有數字9的一方對世界充滿關懷，' +
      '伴侶需理解他們的注意力有時會分散到更大的群體上。學會在「博愛」與「獨愛」之間找到平衡。');

    if (aD === 11 || aD === 22 || aD === 33 || bD === 11 || bD === 22 || bD === 33) {
      parts.push('💫 大師數字（11/22/33）的出現是一個重要的訊號。擁有這些數字的人帶著更高的使命，' +
        '在關係中可能表現出超凡的直覺（11）、建設力（22）或奉獻精神（33）。' +
        '伴侶需要給予足夠的理解與空間，幫助他們將這份天賦穩定地發揮出來。');
    }

    if (score >= 80) parts.push('【整體】這對英文名組合擁有極佳的數字相容性（' + score + '分）。命運、靈魂、個性三個層面皆和諧共鳴，' +
      '你們在一起時有自然的默契。這是一段值得全心投入的關係。');
    else if (score >= 60) parts.push('【整體】數字相容度良好（' + score + '分），主要數字有正面的互動。在部分領域中多加溝通與磨合，' +
      '關係就能穩定成長。大多數成功的伴侶都屬於這個區間——有默契，也有學習空間。');
    else parts.push('【整體】數字相容性需要更多用心（' + score + '分）。數字的差異不代表不能在一起，而是代表這段關係' +
      '有更多機會讓彼此學習不同的生命課題。耐心與尊重是關鍵。');

    return { summary: parts.join('\n\n') };
  }

  // ============ 中英跨文化和盤（豐富版）============
  function cnenCrossHarmony(cnResult, enResult) {
    if (!cnResult || !enResult) return null;

    var ren = cnResult.grids.ren;
    var destinyEl = digitToElement(enResult.destiny);
    var rr = relName(ren.element, destinyEl);
    var renName = cnResult.parsed.surname + cnResult.parsed.givenName;

    // 1. 五行跨文化（35分）
    var elemScore, elemDetail;
    if (rr === '相生') {
      elemScore = 35;
      elemDetail = '中文人格' + ren.element + '生英文命運' + destinyEl + ' — 這是最和諧的跨文化配置。' +
        '東方' + ren.element + '的能量自然地流向西方' + destinyEl + '，就像東方日出照耀西方大地。' +
        '中文名的能量成為英文名的養分，在國際交流場合中能自然地展現魅力與影響力。';
    } else if (rr === '被生') {
      elemScore = 33;
      elemDetail = '英文命運' + destinyEl + '生中文人格' + ren.element + ' — 西方能量支持東方本質。' +
        '英文名的國際視野與能量，能夠激發中文名的潛能。在跨文化環境中，英文名的影響力會幫助中文名的人格特質得到更好的發揮。';
    } else if (rr === '相同') {
      elemScore = 28;
      elemDetail = '五行同屬' + ren.element + ' — 跨越文化界限，本質相通。' +
        '無論在東方或西方文化場合，都能保持一致的氣質與風格。這有助於建立穩定的國際形象，但也可留意吸收不同文化的滋養。';
    } else if (rr === '被剋') {
      elemScore = 14;
      elemDetail = '英文命運' + destinyEl + '剋中文人格' + ren.element + ' — 在國際場合中，中文名的本質可能被西方能量壓制。' +
        '建議在使用英文名時，有意識地保持中文名的核心特質，不要為了融入而失去自我。可以將這個動態轉化為學習適應力。';
    } else {
      elemScore = 18;
      elemDetail = '中文人格' + ren.element + '剋英文命運' + destinyEl + ' — 東方能量較強，在跨文化互動中傾向主導。' +
        '這是一種文化自信的表現，但需注意不要因此忽略了西方文化的價值。學習相互尊重是跨文化和諧的關鍵。';
    }

    // 2. 數字跨文化共振（25分）
    var numScore, numDetail;
    if (ren.number === enResult.destiny) {
      numScore = 25;
      numDetail = '人格數字' + ren.number + '與英文命運數字完全相同！這是非常罕見的跨文化完美共振。' +
        '代表「' + renName + '」這個中文名與這個英文名在宇宙數字層面上是同一頻率。使用這組名字的人在國際場合能展現驚人的一致性。';
    } else if (ren.number % 10 === enResult.destiny % 10) {
      numScore = 20;
      numDetail = '數字尾數相同（' + ren.number % 10 + '），五行屬性一致。雖然數字不同，但本質頻率相連。' +
        '就像同一首曲子的不同樂器演奏版本，雖然聽起來不同，但核心旋律一致。';
    } else if (Math.abs(ren.number - enResult.destiny) <= 4) {
      numScore = 15;
      numDetail = '人格' + ren.number + '與英文命運' + enResult.destiny + '差距' + Math.abs(ren.number - enResult.destiny) + '，頻率相鄰。' +
        '跨文化溝通上有一定基礎，不需要太大調整就能在兩種文化間自在切換。';
    } else {
      numScore = 10;
      numDetail = '數字頻率差異較大，代表中文名和英文名各自在不同領域發揮。' +
        '在不同場合使用不同名字時，可能會展現出截然不同的人格面向，這本身也是一種多元文化的魅力。';
    }

    // 3. 語言能量（20分）
    var cnChars = cnResult.parsed.givenNameChars.length;
    var enVowels = enResult.normalizedName.replace(/[^AEIOUY]/gi, '').length || 1;
    var langScore, langDetail;
    if (Math.abs(cnChars - enVowels) <= 1) {
      langScore = 20;
      langDetail = '中文名音節數（' + cnChars + '）與英文母音數（' + enVowels + '）相近，語言能量流暢。' +
        '在口語交流中，兩個名字的發音節奏自然和諧，不會有突兀的斷裂感。';
    } else {
      langScore = 12;
      langDetail = '中文' + cnChars + '音節 vs 英文' + enVowels + '母音，語言節奏有所不同。' +
        '這種差異增添了跨文化的獨特韻味，但也表示在不同語言環境中可能需要稍微調整發音方式。';
    }

    // 4. 文化整合度（20分）
    var intScore, intDetail;
    var cnGood = (cnResult.fortuneCounts['大吉']||0)+(cnResult.fortuneCounts['吉']||0);
    var enSpecial = (enResult.destiny === 11 || enResult.destiny === 22 || enResult.destiny === 33);
    if (cnGood >= 3 && enSpecial) {
      intScore = 20; intDetail = '中文名吉數充沛 + 英文名為大師數字 — 雙名皆強，跨文化能量極佳。擁有這種組合的人往往能在國際舞台上發光發熱。';
    } else if (cnGood >= 3 || enSpecial) {
      intScore = 15; intDetail = '其中一個名字能量特別強，可以在跨文化場合中扮演主導角色，另一個名字則提供輔助與平衡。';
    } else {
      intScore = 10; intDetail = '兩個名字的能量各有所長，在各自的文化領域中獨立發揮。中英文名的整合需要更多有意識的努力。';
    }

    var rawScore = elemScore + numScore + langScore + intScore;
    var score = Math.round(rawScore / 100 * 100);
    score = Math.max(8, Math.min(98, score));

    var reading = generateCnEnReading(ren, destinyEl, rr, enResult.destiny, score);

    return {
      mode: '中英和盤', modeClass: 'mode-cnen',
      score: score, rawScore: rawScore, maxRawScore: 100,
      tier: getTier(score), tierDesc: getTierDesc(score, '中英'),
      reading: reading,
      dimensions: [
        { label: '🌉 五行跨文化', score: elemScore, max: 35, detail: elemDetail },
        { label: '🔢 數字共振', score: numScore, max: 25, detail: numDetail },
        { label: '🗣️ 語言能量', score: langScore, max: 20, detail: langDetail },
        { label: '🌍 文化整合', score: intScore, max: 20, detail: intDetail }
      ]
    };
  }

  function generateCnEnReading(ren, destinyEl, rr, enDestiny, score) {
    var parts = [];
    parts.push('【跨文化能量】東方' + ren.element + '（' + EL[ren.element].nature + '）與西方數字' + enDestiny + '（五行屬' + destinyEl + '）的跨文化碰撞。');

    if (rr === '相生' || rr === '被生') {
      parts.push('這是一組和諧的跨文化姓名組合。東西方的能量不是對抗而是互補，' +
        '就像茶的內斂與咖啡的外放，兩者可以同時存在且互相加分。擁有這組名字的人天生就適合在國際化的環境中工作與生活。');
    } else if (rr === '相同') {
      parts.push('中英文名的五行本質相同，代表無論在哪種文化環境中都能保持真實的自我。' +
        '這是一種難得的跨文化一致性，讓人在東西方場合都感到自在。');
    } else {
      parts.push('跨文化能量有些張力，但張力本身可以轉化為創造力。' +
        '在不同文化場合中使用不同的名字時，可以刻意練習展現不同的面向，讓這種差異成為你的多元優勢。');
    }

    if (score >= 80) parts.push('整體跨文化相容度極高，中英文名相互輝映，是難得的國際化姓名組合。');
    else if (score >= 60) parts.push('跨文化整合度良好，在多數國際場合中兩個名字能和平共處、各展所長。');
    else parts.push('中英文名的跨文化整合需要更多磨合，但這也代表你有機會發展出豐富多元的國際人格。');

    return { summary: parts.join('\n\n') };
  }

  // ============ 個人和盤 ============
  function selfHarmony(cn, en) {
    return window.Harmony.analyze(cn, en);
  }

  // ============ 輔助函數 ============
  function getTier(score) {
    if (score >= 90) return '天作之合';
    if (score >= 75) return '和諧相生';
    if (score >= 60) return '平穩相宜';
    if (score >= 40) return '尚需調和';
    return '相沖相剋';
  }

  function getTierDesc(score, type) {
    var p = type + '姓名';
    if (score >= 90) return p + '命理配置極為和諧！彼此是絕佳的夥伴，天生就適合在一起合作或相處。';
    if (score >= 75) return p + '配置良好，多數指標正面，關係有很強的發展潛力。';
    if (score >= 60) return p + '配置平穩，關係可穩定發展，部分領域需要多加磨合與溝通。';
    if (score >= 40) return p + '存在部分不和諧，需要雙方的耐心與智慧來經營。但用心經營的關係往往最為深刻。';
    return p + '衝突較大，若為重要關係，建議尋求專業命理建議或考慮調整名字。';
  }

  return {
    cncnHarmony: cncnHarmony,
    enenHarmony: enenHarmony,
    cnenCrossHarmony: cnenCrossHarmony,
    selfHarmony: selfHarmony,
    getTier: getTier
  };
})();
