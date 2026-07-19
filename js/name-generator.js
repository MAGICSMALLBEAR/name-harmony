/**
 * 姓名生成器 — 根據姓氏推薦吉數名字
 */
window.NameGenerator = (function() {

  // 各筆劃數的推薦用字（康熙筆劃），依性別偏好分類
  var GOOD_NAME_CHARS = {
    // 男/中性字
    unisex: {
      3: ['大','川','凡','子','士'],
      4: ['仁','元','文','方','天','中','心'],
      5: ['正','生','弘','平','永','玄'],
      6: ['光','旭','全','宇','安','丞','吉','名','如','守'],
      7: ['志','宏','廷','成','孝','均','佑','呈','吾','甫','秀','良'],
      8: ['明','昌','承','東','和','宗','卓','周','佳','岳','忠','念','怡','房','昊','朋','武','知','秉','竺','金','長','青','信','冠'],
      9: ['亮','俊','彥','建','思','星','春','昭','柏','泉','威','皇','科','紀','致','英','衍','帥','勁','南','則','品','奕','姚','姿','宣','封','彥'],
      10: ['哲','倫','剛','峰','家','宸','庭','展','晉','書','格','桓','桐','桂','泰','浩','海','真','祖','祐','秦','耿','能','軒','袁','原','晏','朗','時','師','修','值','凌','峻','侯','唐','殷'],
      11: ['偉','健','國','堂','堅','培','基','常','康','強','彬','得','晨','望','梁','梓','梧','清','深','涵','淳','淨','祥','章','紹','羚','翊','聆','啟','敏','曼','執','專','敖','戚'],
      12: ['博','凱','傑','勝','善','喜','堯','富','尊','斌','斐','斯','普','景','智','曾','朝','棋','森','棧','欽','皓','硯','童','竣','策','翔','舒','舜','華','萍','菊','雯','雅','雄','集','開','陽','順','馮','傅','斯','敦'],
      13: ['敬','新','暉','暐','楠','楷','業','楊','楓','楚','極','楨','源','溫','溪','煒','煜','煥','照','瑞','瑛','瑜','靖','聖','群','義','經','詩','誠','資','路','農','道','達','雷','靖','鼎','會','勤','傳','園','圓','雍','頌','預'],
      14: ['嘉','銘','榮','榕','榜','歌','演','漢','滿','漁','瑋','福','禎','端','箏','綠','綺','維','綱','綿','緊','緒','聞','與','舞','蓉','蓋','蓓','語','說','豪','賓','趙','輔','輕','遠','銀','銅','閣','際','韶','鳳','齊','僑','僧','廖','弊','彰','願','態','慢','慣','旗','歉','爾','磁','種','管','算','誌','認','誘','誥','誨','誤','誡','貌','賑','趕','辣','遣','酸','銓','銖','閥','雌','需','頗','領','颯','鳴'],
      15: ['德','慧','樂','毅','鋒','銳','震','霆','瑤','瑩','磊','範','箴','緯','輝','頡','頤','養','徵','廣','彈','徵','慧','慮','慰','摯','播','撰','敵','暫','暴','樂','樓','樊','標','歐','潛','潤','潔','熠','瑾','璋','璇','確','碼','磊','稷','稼','穀','節','篇','篆','箱','線','編','緩','練','緹','罷','蓮','蔡','衛','衝','複','調','談','請','諍','諒','論','諾','賢','質','適','遭','鄭','鄧','醇','銷','銳','鋒','閱','震','頡','養','駐','駕','黎','儉','億','劉','劍','厲','增','墨','審','寫','寬','導','層','廟','廠','廢','慕','暮','獎'],
      16: ['儒','學','樹','樺','澤','熹','穎','臻','翰','融','衡','穆','蓉','燕','龍','勳','戰','曉','樵','機','橘','濃','澤','激','燃','燕','璞','璟','盧','積','穎','窺','銘','錫','錢','鋼','靜','霖','霏','霓','雕','霍','頭','頻','館','駱','鮑','默','儒','儘','冀','凝','劑','壇','奮','寰','憲','憩','擂','擅','擇','擋','擒','操','樸','橋','樹','橫','歷','澹','燁','燕','獨','禦','築','篤','篩','糕','縝','縉','縫','繁','翰','翱','臻','融','螢','衡','褪','親','諧','豫','賴','輯','輸','辨','辦','遵','選','遲','遺','鋼','錄','錢','錦','錫','隨','雕','霍','靜','霖','霓','頻','館','駱','鮑','鴛','默','龍','學','導'],
      17: ['謙','鴻','霞','韓','黛','彌','嶺','嶽','徽','璩','濬','燦','瞬','瞭','禪','禧','簡','績','薇','蕾','薑','薛','薦','薪','襄','講','謙','謝','謠','豁','蹈','轅','還','邀','隱','鞠','韓','顆','鴻','麋','點','齋','儲','優','壓','嬰','孺','彌','嶺','嶽','幫','徽','濬','濱','爵','璐','璨','瞭','矯','禪','簇','簡','糧','總','繁','績','繩','聰','聯','舉','艱','薄','蕾','薇','薈','薑','薦','薪','螺','襄','謙','謝','豁','趨','蹈','輿','避','還','邁','隱','霞','鞠','韓','顆','鴻','黛','點']
    },
    // 女性偏好字
    feminine: {
      4: ['月','心'],
      6: ['妃','如','好'],
      7: ['妙','妤','妍','妝','彤','秀'],
      8: ['妮','妹','姊','姑','怡','念','昕','玥','玫','芃','芯','芸','芷'],
      9: ['姿','姚','姣','盈','玲','珊','美','苑','苓','苡','英','柔','品'],
      10: ['娜','娟','娥','宸','倩','倪','庭','真','珮','珠','芬','芳','芝','芙','芯','芮','芷','芩','芫','花','珍','純','素','紡','紋','紗','笑','留','畝'],
      11: ['婉','婕','婧','婥','婭','敏','晨','梓','淑','涵','淨','淳','清','淺','添','淇','淋','涯','淞','祥','紫','羚','翎','聆','紹','翊','翌','習','聊','莉','莎','莞','莓','荷','苹','被','許','訪','設','訣','規','覓','袖','術','處'],
      12: ['婷','媛','媚','嵐','惠','晴','晶','棠','棻','棋','茵','茜','茱','荏','絜','絮','雯','雅','雁','雄','集','開','陽','順','馮','黃','黍','黑','畫','番','皖','盜','短','硝','硯','稍','稅','程','童','竣','筆','等','筏','筒','答','策','粟','粥','結','絡','絢','給','絨','絮','絲','翔','翕','舒','舜','舜','菡','萍','菩','華','菱','菲','菽','萌','虛','蛛','蛟','蛤','街','裁','裂','訴','診','註','証','評','詞','詠','象','貳','貴','買','貸','費','賀','超','越','距','軸','軻','辜','逮','週','進','逸','釉','鈔','鈕','鈞','開','閎','閑','間','閔','陽','隊','隋','隍','雁','雄','雯','雲','項','順','須','馮','黃','黍','黑'],
      13: ['暖','暉','暄','楨','楷','楓','楚','業','溫','溪','煒','煜','煥','照','瑞','瑛','瑜','瑋','瑟','睛','督','睦','睫','祺','祿','禁','經','群','羨','義','聖','聘','肅','腸','腮','腳','腹','腦','詹','試','詩','詭','詹','詢','詣','誅','誇','誠','話','該','詳','裘','裔','裝','解','資','賈','賄','賊','跡','跟','跨','路','跳','較','載','辟','農','遊','運','過','道','達','違','酪','酬','釉','鈴','鉑','鉅','鉛','鉚','鉞','鉤','隔','隘','隕','雍','雋','雉','雷','雹','電','靖','靳','靴','靶','頌','預','頑','頒','頓','飼','馴','鳩','鼎','鼓','鼠','傳','匯','圓','園','媽','嫁','嫌','嵩','廈','廉','微','意','愚','愛','感','愷','慎','慈','慈']
    }
  };

  // 吉數列表
  var AUSPICIOUS_NUMBERS = [1,3,5,6,7,8,11,13,15,16,17,18,21,23,24,25,31,32,33,35,37,39,41,45,47,48,52,57,58,61,63,65,67,68,81];

  function isAuspicious(num) { return AUSPICIOUS_NUMBERS.indexOf(num) >= 0; }

  /** 根據姓氏推薦名字，使五格多吉數 */
  function suggestNames(surname, gender) {
    if (!surname || surname.length < 1) return [];
    gender = gender || 'unisex';

    var surnameStrokes = [];
    for (var i = 0; i < surname.length; i++) {
      var s = window.strokeMap ? window.strokeMap[surname[i]] : undefined;
      surnameStrokes.push(typeof s === 'number' ? s : -1);
    }

    var surnameTotal = 0;
    var hasMissing = false;
    surnameStrokes.forEach(function(s) { if (s > 0) surnameTotal += s; else hasMissing = true; });
    if (hasMissing) return [{ note: '姓氏中有些字不在筆劃庫中，無法精確推薦' }];

    var surnameLast = surnameStrokes[surnameStrokes.length - 1];
    var results = [];

    // 雙名推薦
    var unisex = GOOD_NAME_CHARS.unisex || {};
    var fem = GOOD_NAME_CHARS.feminine || {};
    var chars1 = (gender === 'female' ? mergeChars(unisex, fem) : unisex);
    var chars2 = (gender === 'female' ? mergeChars(unisex, fem) : unisex);

    // 遍歷筆劃組合
    var strokes1 = Object.keys(chars1).map(Number).filter(function(s) { return s >= 1 && s <= 25; });
    var strokes2 = Object.keys(chars2).map(Number).filter(function(s) { return s >= 1 && s <= 25; });

    var goodCount = 0;
    for (var si = 0; si < Math.min(strokes1.length, 12); si++) {
      var s1 = strokes1[si];
      for (var sj = 0; sj < Math.min(strokes2.length, 10); sj++) {
        var s2 = strokes2[sj];
        if (goodCount >= 8) break;

        var tian = surnameStrokes.length >= 2 ? surnameTotal : surnameTotal + 1;
        var ren = surnameLast + s1;
        var di = s1 + s2;
        var wai = s2 + 1;
        var zong = surnameTotal + s1 + s2;

        var good = 0;
        [tian, ren, di, wai, zong].forEach(function(n) { if (isAuspicious(n) && n <= 81) good++; });
        // 至少人格吉數
        if (!isAuspicious(ren) || ren > 81) continue;
        if (good < 3) continue;

        var c1Arr = chars1[s1] || [];
        var c2Arr = chars2[s2] || [];
        if (!c1Arr.length || !c2Arr.length) continue;

        // 隨機取字
        var pick1 = c1Arr[Math.floor(Math.random() * c1Arr.length)];
        var pick2 = c2Arr[Math.floor(Math.random() * c2Arr.length)];
        if (pick1 === pick2) pick2 = c2Arr.length > 1 ? c2Arr[0] : c2Arr[Math.min(1, c2Arr.length-1)];

        results.push({
          name: surname + pick1 + pick2,
          chars: [pick1, pick2],
          strokes: [s1, s2],
          grids: { tian:tian, ren:ren, di:di, wai:wai, zong:zong },
          goodCount: good,
          element: window.ChineseNumerology ? window.ChineseNumerology.digitToElement(ren) : '?'
        });
        goodCount++;
      }
      if (goodCount >= 8) break;
    }

    if (results.length === 0) {
      // 單名 fallback
      for (var si = 0; si < Math.min(strokes1.length, 15); si++) {
        var s1 = strokes1[si];
        var tian = surnameStrokes.length >= 2 ? surnameTotal : surnameTotal + 1;
        var ren = surnameLast + s1;
        var di = s1 + 1;
        var wai = s1 + 1;
        var zong = surnameTotal + s1;
        var good = 0;
        [tian, ren, di, wai, zong].forEach(function(n) { if (isAuspicious(n) && n <= 81) good++; });
        if (!isAuspicious(ren) || ren > 81 || good < 3) continue;
        var c1Arr = chars1[s1] || [];
        if (!c1Arr.length) continue;
        var pick = c1Arr[Math.floor(Math.random() * c1Arr.length)];
        results.push({
          name: surname + pick,
          chars: [pick],
          strokes: [s1],
          grids: { tian:tian, ren:ren, di:di, wai:wai, zong:zong },
          goodCount: good,
          element: window.ChineseNumerology ? window.ChineseNumerology.digitToElement(ren) : '?'
        });
        if (results.length >= 5) break;
      }
    }

    return results;
  }

  function mergeChars(base, extra) {
    var merged = {};
    Object.keys(base).forEach(function(k) { merged[k] = (base[k] || []).slice(); });
    Object.keys(extra).forEach(function(k) {
      if (!merged[k]) merged[k] = [];
      merged[k] = merged[k].concat(extra[k]);
    });
    return merged;
  }

  return { suggestNames: suggestNames, AUSPICIOUS_NUMBERS: AUSPICIOUS_NUMBERS, isAuspicious: isAuspicious };
})();
