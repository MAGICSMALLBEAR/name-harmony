/**
 * 取名工具延伸：姓名熱門度、品牌命名、人格對照、家庭命名規劃
 * 計算函式（trendEnglish、trendChinese、scoreBrand、scoreBigFive、checkFamily）不碰 DOM，
 * 可在 Node 直接測試（tools/test-naming.js）；只有網域查詢需要連網。
 * 文字依 I18N 語言切換（沒有 I18N 時為中文）；切換語言時保留已輸入的內容與結果並重畫。
 */
window.NamingExtensions = (function() {

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function val(id) { var el = document.getElementById(id); return el ? el.value : ''; }
  function num(n) { return Number(n).toLocaleString(lang() === 'en' ? 'en-US' : 'zh-TW'); }
  function ord(n) {
    var s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  // ============ 文字 ============
  // 字串或 function(p)；英文缺的鍵退回中文

  var TEXT = {
    zh: {
      // 熱門度
      trendsTitle: '📈 姓名熱門度與時代感',
      trendsDesc: '輸入英文名或中文名，看它在哪個年代最流行。英文名依美國社會安全署（SSA）1940–2024 年各年代排名；中文名依內政部戶政司 112 年全國姓名統計的各出生年代前十大名字。',
      trendName: '名字', trendNamePh: '例如 Olivia、怡君、陳家豪',
      trendGender: '性別（英文名）', anySex: '不指定', F: '女', M: '男',
      trendGo: '📈 查看時代感',
      trendSource: '資料來源：<a href="https://www.ssa.gov/oact/babynames/" target="_blank" rel="noopener">SSA 美國姓名排行</a>（各年代前 1,000 名；2025 年只有官方公布的前十名）、' +
        '<a href="https://www.ris.gov.tw/documents/data/5/2/112namestat.pdf" target="_blank" rel="noopener">內政部戶政司全國姓名統計分析（112 年）</a>統計表五十六。台灣人數是 112 年 6 月底仍設籍的人，較早年代的人數會因過世、移出而偏少。',
      needTrendName: '請輸入名字。', loading: '載入資料中…',
      trendsBadFormat: '資料格式錯誤', trendsLoadFail: '無法載入熱門度資料（離線且尚未快取）', trendsNotLoaded: '熱門度資料尚未載入',
      needEnName: '請輸入英文名', needCnName: '請輸入中文名字',
      gen: { old: '祖父母輩', mid: '父母輩', young: '年輕一代', kid: '兒童' },
      trend: { rising: '上升中', falling: '下滑中', steady: '持平', 'new': '新進榜', gone: '已退出前 1,000 名' },
      eraNow: '當代熱門名字，同齡人之間容易撞名',
      eraMillennial: function(p) { return '千禧世代的熱門名字，' + (p.rising ? '近年又回升' : '現在的新生兒較少用'); },
      eraDecade: function(p) { return '聽起來像 ' + p.decade + ' 年代出生的人（' + p.gen + '）' + (p.rising ? '，但近年有復古回流' : ''); },
      eraTwHit: function(p) { return '「' + p.given + '」是' + p.label + '（西元 ' + p.from + '–' + p.to + '）出生者的第 ' + p.rank + ' 大名字，屬於' + p.gen + '的常見名'; },
      eraTwChar: function(p) { return '沒有進入任何年代的前十大；用字「' + p.chars.join('、') + '」最常出現在' + p.label + '（西元 ' + p.from + '–' + p.to + '）的熱門名字'; },
      eraTwNone: '名字和用字都不在各年代前十大名字中，撞名機率較低',
      barTitle: function(p) { return p.decade + ' 年代：' + (p.rank ? '第 ' + p.rank + ' 名' : '不在前 1,000 名'); },
      notFoundEn: function(p) { return '<strong>' + esc(p.name) + '</strong> 在 1940 年以後的任何年代都沒有進入' + (p.sex ? p.sexText + '名' : '') + '前 1,000 名。'; },
      notFoundEnEra: '時代感：少見或新創的名字，不容易撞名；也可能是拼法較少見，可試試常見拼法。',
      sexTrendBadge: function(p) { return p.sexText + '名・' + p.trend; },
      peakLine: function(p) {
        return '最流行：' + p.decade + ' 年代第 ' + p.rank + ' 名；' + p.latestYear + ' 年：' + (p.latest ? '第 ' + p.latest + ' 名' : '不在前 1,000 名');
      },
      eraLabel: '時代感：',
      twOverall: function(p) { return '全國' + p.sexText + '性第 ' + p.rank + ' 大常見名（' + num(p.count) + ' 人）'; },
      twHit: function(p) { return p.label + '（' + p.from + '–' + p.to + '）出生' + p.sexText + '性：第 ' + p.rank + ' 名，' + num(p.count) + ' 人'; },

      // 品牌
      brandTitle: '🏢 品牌命名工作台',
      brandDesc: '輸入候選品牌名：檢查長度、好唸程度、諧音或英文俚語聯想，並自動查 .com、.net、.io、.app 網域是否已被註冊。',
      brandName: '候選品牌名', brandNamePh: '例如 森月、Luma', brandTone: '品牌調性',
      tone: { trust: '專業可信', warm: '溫暖親和', bold: '創新有力', calm: '自然療癒' },
      toneText: {
        trust: '專業可信：適合穩定、清楚的字，避免過度俏皮或諧音梗',
        warm: '溫暖親和：適合口語、好唸、有畫面感的字',
        bold: '創新有力：短而有辨識度，可接受新創字詞',
        calm: '自然療癒：適合柔和的音與自然意象'
      },
      brandGo: '🏢 初篩品牌名', needBrand: '請輸入候選品牌名',
      // 品牌候選比較
      cmpTitle: '📊 候選比較', cmpDesc: '一次比較 2–8 個候選名（以逗號、頓號或換行分隔），依目前選的調性排序。清單只存在這台裝置。',
      cmpPh: '例如：森月、Luma、青禾、Kodex', cmpGo: '📊 比較候選', cmpAdd: '⭐ 加入比較', cmpClear: '清空清單',
      cmpExport: '⬇️ 下載決策摘要', cmpCopy: '📋 複製摘要', cmpCopied: '已複製決策摘要',
      cmpAdded: function(p) { return '已加入比較清單（共 ' + p.n + ' 個）'; }, cmpFull: '比較清單最多 8 個',
      cmpNeed: '請至少輸入 2 個候選名', cmpTrim: function(p) { return '只比較前 8 個，略過：' + p.list; },
      cmpCol: { rank: '名次', name: '候選名', score: '總分', base: '基礎', fit: '調性', bestTone: '最適合', risk: '風險', domains: '網域' },
      cmpNoRisk: '—', cmpRaw: '未封頂的原始分，用來排序', cmpTop: function(p) { return '🏆 依「' + p.tone + '」調性，「' + p.name + '」分數最高（' + p.score + ' 分）'; },
      cmpTie: function(p) { return '🤝 「' + p.names + '」同分（' + p.score + ' 分），請用網域或品牌故事決定'; },
      sumTitle: '品牌命名決策摘要', sumDate: '產生日期', sumTone: '選定調性', sumRank: '排名',
      sumTable: '| 名次 | 候選名 | 總分 | 基礎分 | 調性契合 | 最適合的調性 | .com | .net | .io | .app |',
      sumWhy: '各候選名的扣分與提醒', sumNone: '沒有扣分項目',
      sumDomainNote: '網域狀態為產生摘要當下的 RDAP 查詢結果；「查無登記」仍可能是保留字或溢價網域。',
      sumDisclaimer: '本摘要只是語音、諧音與網域的初篩，不能取代商標檢索與法律意見。正式使用前，請到智慧財產局商標檢索系統查詢相同或近似商標，並諮詢專業人士。',
      dShort: { taken: '已註冊', free: '查無', error: '失敗', pending: '查詢中' },
      lbl: { length: '長度', consistency: '一致性', easy: '好唸', homophone: '諧音', tone: '聲調', awkward: '拗口', slang: '聯想', mandarin: '華語使用者', digits: '數字', toneFit: '調性契合' },
      fit: {
        trustHomo: '專業調性下，諧音更傷信任感', trustSlang: '專業調性下，負面聯想更傷信任感',
        trustDigits: '專業調性不宜用數字', trustMixed: '專業調性宜用單一語言',
        trustClear: '用字清楚、沒有不當聯想，符合專業調性',
        warmTones: '聲調有起伏，唸起來親切', warmFlat: '聲調平板，少了親切感', warmRare: '有不常用的字，不夠口語',
        warmShort: function(p) { return p.n + ' 個音節，好唸好叫'; }, warmHard: '有較難發的音，親切感打折',
        boldShortZh: '兩字短名，辨識度高', boldLongZh: function(p) { return p.n + ' 個字，不夠俐落'; },
        boldShortEn: function(p) { return p.n + ' 個字母，短而有力'; }, boldLongEn: function(p) { return p.n + ' 個字母，不夠俐落'; },
        boldMixed: '創新調性可以接受中英混搭', boldDigits: '創新調性可以接受數字',
        calmNature: function(p) { return '有自然意象（' + p.chars + '）'; }, calmNoNature: '沒有自然意象的字',
        calmSoft: '字尾收在柔和的音', calmHard: '有 K、Q、X、Z 等硬音，不夠柔和',
        trustChars: function(p) { return '有穩重、可靠的字（' + p.chars + '）'; },
        trustFormal: function(p) { return p.n + ' 個音節，聽起來完整正式'; }, trustCute: '疊字像暱稱，正式感不足',
        warmDouble: '疊字，可愛好叫', warmChars: function(p) { return '有親切、生活感的字（' + p.chars + '）'; },
        warmOpen: '收在母音，聽起來親切',
        boldSoundZh: '有清脆的塞音或收在去聲，語氣果斷', boldSoundEn: '有爆破或摩擦的硬音，聽起來有力',
        calmFlow: '沒有爆破音，唸起來流暢柔和'
      },
      zhLenGood: function(p) { return p.n + ' 個字，容易記'; },
      zhLenLong: function(p) { return p.n + ' 個字，略長，可準備簡稱'; },
      zhLenOne: '只有 1 個字，難註冊也難搜尋',
      zhLenTooLong: function(p) { return p.n + ' 個字，太長不易記'; },
      enLenGood: function(p) { return p.n + ' 個字母，好拼好記'; },
      enLenLong: function(p) { return p.n + ' 個字母，略長'; },
      enLenShort: '太短，網域與商標多半已被使用', enLenTooLong: '太長，不易拼寫',
      mixed: '中英混合，口頭介紹時容易不知道怎麼唸',
      rareChars: function(p) { return '「' + p.chars + '」不是常用字，客人可能唸不出來'; },
      commonChars: '都是常用字',
      homo3: function(p) { return '「' + p.text + '」音同「' + p.word + '」'; },
      homo2: function(p) { return '「' + p.text + '」在台灣口音下近似「' + p.word + '」'; },
      homo1: function(p) { return '「' + p.text + '」音近「' + p.word + '」（聲調不同）'; },
      noHomo: '沒有發現不雅諧音',
      flatTone: '每個字聲調相同，唸起來平板', variedTone: '聲調有起伏',
      sameSound: function(p) { return '「' + p.pair + '」同音相連'; },
      slangHit: function(p) { return '英文俚語聯想：' + p.slang; },
      noSlang: '沒有收錄到負面俚語聯想',
      syllables: function(p) { return p.n + ' 個音節' + (p.est ? '（依拼字估計）' : ''); },
      syllablesLong: function(p) { return p.n + ' 個音節，偏長'; },
      hardSounds: function(p) { return '較難發的音：' + p.list.join('、'); },
      hasDigits: '含數字，口頭說明時要多解釋寫法',
      screenScore: function(p) { return '初篩 ' + p.score + '/100'; },
      toneLine: '調性：',
      domainsBy: function(p) { return '網域' + (p.slug ? '（以拼音 ' + esc(p.slug) + ' 查詢）' : '') + '：'; },
      domain: { taken: '已被註冊', free: '查無登記，可能可註冊', error: '查詢失敗', pending: '查詢中…' },
      tmLink: '™ 查台灣商標', twLink: '🌐 查 .com.tw',
      brandNote: '網域以各登記處的 RDAP 即時查詢；「查無登記」仍可能是保留字或溢價網域，購買前請到註冊商確認。商標沒有開放查詢介面，請到智慧財產局檢索系統查相同或近似商標。.tw 網域 TWNIC 不開放瀏覽器直接查詢，請用連結。',

      // 人格
      bfTitle: '🧠 名字與自我人格對照',
      bfDesc: '10 題 Big Five 自我觀察（娛樂、反思用途，不是心理診斷）。完成後可和姓名分析中的 MBTI 趣味推估對照閱讀。',
      bfOpt: { 1: '1 很不同意', 3: '3 普通', 5: '5 很同意' },
      bfGo: '🧠 產生人格對照',
      factor: { O: '開放性', C: '盡責性', E: '外向性', A: '親和性', N: '情緒敏感度' },
      level: { high: '偏高', low: '偏低', mid: '中等' },
      bfNote: '把這份自評與主分析中的靈數 → MBTI 趣味對照放在一起看，可以當作「自我感受與系統敘事」的討論起點，不應用於招聘、醫療或任何高風險判斷。',

      // 家庭
      familyTitle: '👨‍👩‍👧 家庭命名規劃',
      familyDesc: '比較候選名字與父母、手足的重字、同音字與五格人格五行。所有資料只在這台裝置的瀏覽器計算。',
      parentA: '家長姓名（選填）', parentAPh: '例如 王大明',
      parentB: '另一位家長（選填）', parentBPh: '例如 林小美',
      candidate: '候選完整姓名（可多個，以逗號或頓號分隔）', candidatePh: '例如 王怡蘊、王子安',
      siblings: '手足姓名（選填，以逗號或頓號分隔）', siblingsPh: '例如 王子晴、王子安',
      familyGo: '👨‍👩‍👧 檢查家庭一致性',
      needCandidate: '請輸入筆劃庫可分析的完整中文姓名（姓＋名）',
      who: { parent: '家長', sibling: '手足' },
      sameName: function(p) { return '和' + p.who + '「' + p.name + '」同名，不能使用'; },
      parentChar: function(p) { return '用了家長「' + p.name + '」名字中的「' + p.chars + '」；傳統上晚輩避用長輩名字的字'; },
      parentSound: function(p) { return '「' + p.chars + '」和家長「' + p.name + '」名字的字同音；講究避諱時也會避開'; },
      siblingChar: function(p) { return '和手足「' + p.name + '」共用「' + p.chars + '」；若是輩分字很常見，否則容易被叫混'; },
      siblingSound: function(p) { return '「' + p.chars + '」和手足「' + p.name + '」名字的字同音，叫名字時容易搞混'; },
      noFamily: '沒有輸入家人姓名，只檢查候選名本身',
      familyClear: '和已輸入的家人沒有重字或同音字，辨識度良好',
      skipped: function(p) { return '略過無法辨識的姓名：' + p.names.join('、'); },
      phonCaution: function(p) { return '候選名音韻需注意：' + p.warn; },
      blocked: '不能使用', warnCount: function(p) { return '需留意 ' + p.n + ' 項'; }, familyOk: '沒有需留意項目',
      familyGrid: function(p) { return '人格五行：' + p.el + '；總格：' + p.zong + ' ' + p.glory + (p.phon ? '；音韻：' + p.phon : ''); },
      notListed: '未收錄', noMatch: '無法比對',
      familyNote: '此工具協助比較命名的一致性與辨識度，不取代家人的偏好、文化傳承或戶籍登記規定。',
      generation: '輩分字（選填）', generationPh: '例如 子',
      avoid: '避諱字或長輩姓名（選填）', avoidPh: '例如 祖父王建國、外婆陳月娥',
      genHas: function(p) { return '用了輩分字「' + p.c + '」（名字第 ' + p.pos + ' 字）'; },
      genMissing: function(p) { return '沒有用到輩分字「' + p.c + '」'; },
      avoidChar: function(p) { return '用了避諱字「' + p.chars + '」'; },
      avoidSound: function(p) { return '「' + p.chars + '」和避諱字同音；講究避諱時也會避開'; },
      famMulti: function(p) { return '共比較 ' + p.n + ' 個候選名，依「能否使用 → 需留意項目 → 與家人的和諧度」排序'; },
      famTrim: function(p) { return '最多比較 5 個候選名，略過：' + p.names; },
      famAvg: function(p) { return '與家人平均和諧度 ' + p.avg + '/100'; },
      famReport: '🖨️ 列印家庭決策報告（可另存 PDF）',
      repTitle: '家庭命名決策報告', repFamily: '家庭成員與條件', repParents: '家長', repSiblings: '手足',
      repGen: '輩分字', repAvoid: '避諱', repNone: '未填', repRank: '候選名比較', repDetail: '各候選名的檢查結果',
      repHead: ['名次', '候選名', '結論', '人格五行', '總格', '音韻', '需留意', '家人和諧度'],
      repDecide: '家人討論紀錄', repDecideHint: '最後決定：＿＿＿＿＿＿　　理由：＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿',
      repFoot: '本報告依筆劃、字音與五格計算，協助比較命名的一致性與辨識度，不取代家人的偏好、文化傳承或戶籍登記規定。',
      colon: '：', paren: function(p) { return '（' + p.x + '）'; }
    },
    en: {
      trendsTitle: '📈 Name Popularity & Era',
      trendsDesc: 'Enter an English or Chinese name to see which era it was most popular in. English names use US Social Security Administration (SSA) rankings by decade, 1940–2024; Chinese names use the top-10 names by birth decade from Taiwan\'s 2023 national name statistics (Ministry of the Interior).',
      trendName: 'Name', trendNamePh: 'e.g. Olivia, 怡君, 陳家豪',
      trendGender: 'Sex (English names)', anySex: 'Either', F: 'Female', M: 'Male',
      trendGo: '📈 Show Era',
      trendSource: 'Sources: <a href="https://www.ssa.gov/oact/babynames/" target="_blank" rel="noopener">SSA baby names</a> (top 1,000 per decade; 2025 has only the official top 10) and ' +
        '<a href="https://www.ris.gov.tw/documents/data/5/2/112namestat.pdf" target="_blank" rel="noopener">Taiwan Ministry of the Interior national name statistics (2023)</a>, table 56. Taiwan counts are people still registered in June 2023, so earlier decades are undercounted.',
      needTrendName: 'Please enter a name.', loading: 'Loading data…',
      trendsBadFormat: 'Unexpected data format', trendsLoadFail: 'Could not load popularity data (offline and not cached yet)', trendsNotLoaded: 'Popularity data not loaded yet',
      needEnName: 'Please enter an English name', needCnName: 'Please enter a Chinese name',
      gen: { old: 'grandparents\' generation', mid: 'parents\' generation', young: 'young adults', kid: 'children' },
      trend: { rising: 'rising', falling: 'falling', steady: 'steady', 'new': 'new entry', gone: 'dropped out of the top 1,000' },
      eraNow: 'A current favourite — expect classmates with the same name',
      eraMillennial: function(p) { return 'A millennial-era favourite, ' + (p.rising ? 'and climbing again lately' : 'now less common for newborns'); },
      eraDecade: function(p) { return 'Sounds like someone born in the ' + p.decade + 's (' + p.gen + ')' + (p.rising ? ', though it is making a retro comeback' : ''); },
      eraTwHit: function(p) { return '「' + p.given + '」 was the #' + p.rank + ' name for people born ' + p.from + '–' + p.to + ' — typical of the ' + p.gen; },
      eraTwChar: function(p) { return 'Not in any decade\'s top 10; the characters 「' + p.chars.join('、') + '」 appear most in popular names from ' + p.from + '–' + p.to; },
      eraTwNone: 'Neither the name nor its characters appear in any decade\'s top 10 — unlikely to be shared',
      barTitle: function(p) { return p.decade + 's: ' + (p.rank ? '#' + p.rank : 'not in top 1,000'); },
      notFoundEn: function(p) { return '<strong>' + esc(p.name) + '</strong> has not been in the top 1,000' + (p.sex ? ' ' + p.sexText.toLowerCase() + ' names' : '') + ' in any decade since 1940.'; },
      notFoundEnEra: 'Era: rare or newly coined — unlikely to be shared. It may also be an uncommon spelling; try a common one.',
      sexTrendBadge: function(p) { return p.sexText + ' name · ' + p.trend; },
      peakLine: function(p) {
        return 'Peak: #' + p.rank + ' in the ' + p.decade + 's; ' + p.latestYear + ': ' + (p.latest ? '#' + p.latest : 'not in top 1,000');
      },
      eraLabel: 'Era: ',
      twOverall: function(p) { return ord(p.rank) + ' most common ' + p.sexText.toLowerCase() + ' name in Taiwan (' + num(p.count) + ' people)'; },
      twHit: function(p) { return p.sexText + 's born ' + p.from + '–' + p.to + ': #' + p.rank + ', ' + num(p.count) + ' people'; },

      brandTitle: '🏢 Brand Name Workbench',
      brandDesc: 'Enter a candidate brand name to check length, ease of pronunciation, awkward homophones or English slang, and whether the .com, .net, .io and .app domains are registered.',
      brandName: 'Candidate brand name', brandNamePh: 'e.g. 森月, Luma', brandTone: 'Brand tone',
      tone: { trust: 'Professional', warm: 'Warm', bold: 'Bold', calm: 'Calm' },
      toneText: {
        trust: 'Professional: steady, clear words; avoid puns and overly playful sounds',
        warm: 'Warm: conversational, easy to say, evokes a picture',
        bold: 'Bold: short and distinctive; coined words are fine',
        calm: 'Calm: soft sounds and natural imagery'
      },
      brandGo: '🏢 Screen Brand Name', needBrand: 'Please enter a candidate brand name',
      // Brand candidate comparison
      cmpTitle: '📊 Compare Candidates', cmpDesc: 'Compare 2–8 candidates at once (separate with commas or new lines), ranked for the selected tone. The list is stored only on this device.',
      cmpPh: 'e.g. 森月, Luma, 青禾, Kodex', cmpGo: '📊 Compare', cmpAdd: '⭐ Add to comparison', cmpClear: 'Clear list',
      cmpExport: '⬇️ Download decision summary', cmpCopy: '📋 Copy summary', cmpCopied: 'Decision summary copied',
      cmpAdded: function(p) { return 'Added to comparison (' + p.n + ' in list)'; }, cmpFull: 'The comparison list holds at most 8 names',
      cmpNeed: 'Please enter at least 2 candidates', cmpTrim: function(p) { return 'Only the first 8 are compared; skipped: ' + p.list; },
      cmpCol: { rank: '#', name: 'Candidate', score: 'Total', base: 'Base', fit: 'Tone', bestTone: 'Best tone', risk: 'Risks', domains: 'Domains' },
      cmpNoRisk: '—', cmpRaw: 'Uncapped raw score, used for ranking', cmpTop: function(p) { return '🏆 For a "' + p.tone + '" tone, "' + p.name + '" scores highest (' + p.score + ')'; },
      cmpTie: function(p) { return '🤝 "' + p.names + '" are tied (' + p.score + ') — let domains or the brand story decide'; },
      sumTitle: 'Brand Naming Decision Summary', sumDate: 'Generated', sumTone: 'Selected tone', sumRank: 'Ranking',
      sumTable: '| # | Candidate | Total | Base | Tone fit | Best tone | .com | .net | .io | .app |',
      sumWhy: 'Deductions and warnings per candidate', sumNone: 'No deductions',
      sumDomainNote: 'Domain status reflects RDAP lookups at the time this summary was generated; "no record" can still be a reserved or premium domain.',
      sumDisclaimer: 'This summary only screens sound, homophones and domains. It is not a trademark search or legal advice. Before using a name, search Taiwan IPO\'s trademark database for identical or similar marks and consult a professional.',
      dShort: { taken: 'taken', free: 'free', error: 'failed', pending: 'checking' },
      lbl: { length: 'Length', consistency: 'Consistency', easy: 'Easy to say', homophone: 'Homophones', tone: 'Tones', awkward: 'Tongue-twister', slang: 'Associations', mandarin: 'For Mandarin speakers', digits: 'Digits', toneFit: 'Tone fit' },
      fit: {
        trustHomo: 'Homophones hurt credibility more for a professional tone', trustSlang: 'Negative associations hurt credibility more for a professional tone',
        trustDigits: 'Digits do not suit a professional tone', trustMixed: 'A professional tone reads better in one language',
        trustClear: 'Clear wording with no awkward associations — fits a professional tone',
        warmTones: 'Varied tones sound friendly', warmFlat: 'Flat tones feel less friendly', warmRare: 'Uncommon characters feel less conversational',
        warmShort: function(p) { return p.n + ' syllable' + (p.n === 1 ? '' : 's') + ' — easy to say and call out'; }, warmHard: 'Harder sounds make it feel less friendly',
        boldShortZh: 'Two characters — short and distinctive', boldLongZh: function(p) { return p.n + ' characters — not punchy enough'; },
        boldShortEn: function(p) { return p.n + ' letters — short and punchy'; }, boldLongEn: function(p) { return p.n + ' letters — not punchy enough'; },
        boldMixed: 'A bold tone can carry mixed Chinese and English', boldDigits: 'A bold tone can carry digits',
        calmNature: function(p) { return 'Natural imagery (' + p.chars + ')'; }, calmNoNature: 'No natural imagery',
        calmSoft: 'Ends on a soft sound', calmHard: 'Hard sounds (K, Q, X, Z) feel less calm',
        trustChars: function(p) { return 'Steady, reliable characters (' + p.chars + ')'; },
        trustFormal: function(p) { return p.n + ' syllables — sounds complete and formal'; }, trustCute: 'Reduplication reads like a nickname, less formal',
        warmDouble: 'Reduplication — cute and easy to call out', warmChars: function(p) { return 'Homely, friendly characters (' + p.chars + ')'; },
        warmOpen: 'Ends on a vowel — sounds friendly',
        boldSoundZh: 'Crisp stops or a falling final tone — sounds decisive', boldSoundEn: 'Plosive or fricative sounds — sounds strong',
        calmFlow: 'No plosives — flows smoothly'
      },
      zhLenGood: function(p) { return p.n + ' characters — easy to remember'; },
      zhLenLong: function(p) { return p.n + ' characters — a bit long, prepare a short form'; },
      zhLenOne: 'Only 1 character — hard to register and to search for',
      zhLenTooLong: function(p) { return p.n + ' characters — too long to remember'; },
      enLenGood: function(p) { return p.n + ' letters — easy to spell and remember'; },
      enLenLong: function(p) { return p.n + ' letters — a bit long'; },
      enLenShort: 'Too short — the domain and trademark are probably taken', enLenTooLong: 'Too long to spell easily',
      mixed: 'Mixes Chinese and English — people won\'t know how to say it aloud',
      rareChars: function(p) { return '「' + p.chars + '」 are uncommon characters — customers may not know how to read them'; },
      commonChars: 'All common characters',
      homo3: function(p) { return '「' + p.text + '」 sounds the same as 「' + p.word + '」'; },
      homo2: function(p) { return '「' + p.text + '」 sounds like 「' + p.word + '」 in a Taiwanese accent'; },
      homo1: function(p) { return '「' + p.text + '」 sounds close to 「' + p.word + '」 (different tones)'; },
      noHomo: 'No awkward homophones found',
      flatTone: 'Every character has the same tone — sounds flat', variedTone: 'Tones vary',
      sameSound: function(p) { return '「' + p.pair + '」 repeats the same syllable'; },
      slangHit: function(p) { return 'English slang association: ' + p.slang; },
      noSlang: 'No negative slang associations on file',
      syllables: function(p) { return p.n + ' syllable' + (p.n === 1 ? '' : 's') + (p.est ? ' (estimated from spelling)' : ''); },
      syllablesLong: function(p) { return p.n + ' syllables — on the long side'; },
      hardSounds: function(p) { return 'Harder sounds: ' + p.list.join('; '); },
      hasDigits: 'Contains digits — needs explaining when said aloud',
      screenScore: function(p) { return 'Screening ' + p.score + '/100'; },
      toneLine: 'Tone: ',
      domainsBy: function(p) { return 'Domains' + (p.slug ? ' (checked as pinyin ' + esc(p.slug) + ')' : '') + ':'; },
      domain: { taken: 'registered', free: 'no record — may be available', error: 'lookup failed', pending: 'checking…' },
      tmLink: '™ Taiwan trademarks', twLink: '🌐 Check .com.tw',
      brandNote: 'Domains are checked live via each registry\'s RDAP; "no record" can still be a reserved or premium domain, so confirm with a registrar before buying. Trademarks have no public lookup API — search Taiwan IPO\'s database for identical or similar marks. TWNIC does not allow browser lookups of .tw domains; use the link.',

      bfTitle: '🧠 Name vs. Self-Rated Personality',
      bfDesc: 'A 10-item Big Five self-reflection (for fun and reflection, not a psychological assessment). Read it alongside the playful MBTI estimate in the name analysis.',
      bfOpt: { 1: '1 Strongly disagree', 3: '3 Neutral', 5: '5 Strongly agree' },
      bfGo: '🧠 Compare Personality',
      factor: { O: 'Openness', C: 'Conscientiousness', E: 'Extraversion', A: 'Agreeableness', N: 'Emotional sensitivity' },
      level: { high: 'high', low: 'low', mid: 'moderate' },
      bfNote: 'Put this self-rating next to the numerology → MBTI estimate from the main analysis as a starting point for talking about how you see yourself versus what the system says. Do not use it for hiring, health or any high-stakes decision.',

      familyTitle: '👨‍👩‍👧 Family Naming Planner',
      familyDesc: 'Compare a candidate name with parents\' and siblings\' names for shared characters, same-sounding characters and the five-grid personality element. Everything is computed in this browser.',
      parentA: 'Parent (optional)', parentAPh: 'e.g. 王大明',
      parentB: 'Other parent (optional)', parentBPh: 'e.g. 林小美',
      candidate: 'Candidate full names (one or more, comma-separated)', candidatePh: 'e.g. 王怡蘊, 王子安',
      siblings: 'Siblings (optional, separated by commas)', siblingsPh: 'e.g. 王子晴, 王子安',
      familyGo: '👨‍👩‍👧 Check Family Fit',
      needCandidate: 'Please enter a full Chinese name (surname + given name) found in the stroke database',
      who: { parent: 'parent', sibling: 'sibling' },
      sameName: function(p) { return 'Same name as ' + p.who + ' 「' + p.name + '」 — cannot be used'; },
      parentChar: function(p) { return 'Uses 「' + p.chars + '」 from parent 「' + p.name + '」\'s name; traditionally children avoid characters from elders\' names'; },
      parentSound: function(p) { return '「' + p.chars + '」 sounds the same as a character in parent 「' + p.name + '」\'s name; also avoided by those who observe the taboo'; },
      siblingChar: function(p) { return 'Shares 「' + p.chars + '」 with sibling 「' + p.name + '」; common for a generation character, otherwise easily mixed up'; },
      siblingSound: function(p) { return '「' + p.chars + '」 sounds the same as a character in sibling 「' + p.name + '」\'s name — easily confused when called'; },
      noFamily: 'No family names entered — only the candidate itself was checked',
      familyClear: 'No shared or same-sounding characters with the family members entered — easy to tell apart',
      skipped: function(p) { return 'Skipped names that could not be read: ' + p.names.join(', '); },
      phonCaution: function(p) { return 'Candidate\'s phonetics need attention: ' + p.warn; },
      blocked: 'Cannot use', warnCount: function(p) { return p.n + ' thing' + (p.n === 1 ? '' : 's') + ' to note'; }, familyOk: 'Nothing to note',
      familyGrid: function(p) { return 'Personality element: ' + p.el + '; total grid: ' + p.zong + ' ' + p.glory + (p.phon ? '; phonetics: ' + p.phon : ''); },
      notListed: 'not listed', noMatch: 'cannot compare',
      familyNote: 'This tool compares consistency and distinctiveness only; it does not replace family preferences, cultural traditions or household registration rules.',
      generation: 'Generation character (optional)', generationPh: 'e.g. 子',
      avoid: 'Characters or elders\' names to avoid (optional)', avoidPh: 'e.g. 王建國, 陳月娥',
      genHas: function(p) { return 'Uses the generation character "' + p.c + '" (character ' + p.pos + ' of the given name)'; },
      genMissing: function(p) { return 'Does not use the generation character "' + p.c + '"'; },
      avoidChar: function(p) { return 'Uses an avoided character: ' + p.chars; },
      avoidSound: function(p) { return '"' + p.chars + '" sounds the same as an avoided character — strict naming taboos avoid these too'; },
      famMulti: function(p) { return p.n + ' candidates compared, ranked by usable → things to note → harmony with the family'; },
      famTrim: function(p) { return 'At most 5 candidates are compared; skipped: ' + p.names; },
      famAvg: function(p) { return 'Average harmony with family ' + p.avg + '/100'; },
      famReport: '🖨️ Print family decision report (save as PDF)',
      repTitle: 'Family Naming Decision Report', repFamily: 'Family members and conditions', repParents: 'Parents', repSiblings: 'Siblings',
      repGen: 'Generation character', repAvoid: 'Avoid', repNone: 'not given', repRank: 'Candidate comparison', repDetail: 'Checks per candidate',
      repHead: ['#', 'Candidate', 'Verdict', 'Personality element', 'Total grid', 'Phonetics', 'To note', 'Family harmony'],
      repDecide: 'Family discussion notes', repDecideHint: 'Final choice: ____________    Reason: ______________________________',
      repFoot: 'This report is computed from stroke counts, character sounds and the five grids to compare consistency and distinctiveness. It does not replace family preferences, cultural traditions or household registration rules.',
      colon: ': ', paren: function(p) { return ' (' + p.x + ')'; }
    }
  };

  // Big Five 英文題目（與 FACTORS 同順序）
  var FACTORS_EN = [
    'I enjoy exploring new ideas and unfamiliar fields.', 'I prefer familiar methods and dislike change.',
    'I plan my work and finish on time.', 'I often put things off until the last minute.',
    'I start conversations with strangers.', 'Long stretches of socialising drain me quickly.',
    'I usually try to understand the other person\'s position first.', 'I tend to challenge other people\'s views directly.',
    'Small things easily make me tense or worried.', 'Under pressure I usually stay steady.'
  ];
  // 音韻模組回傳的中文代碼 → 英文（其餘說明維持原文）
  var EN_TERM = {
    '良好': 'good', '尚可': 'fair', '需注意': 'caution',
    '大吉': 'very auspicious', '吉': 'auspicious', '半吉': 'mixed', '凶': 'inauspicious',
    '天作之合': 'perfect match', '和諧相生': 'harmonious', '平穩相宜': 'compatible', '尚需調和': 'needs work', '相沖相剋': 'clashing',
    '木': 'Wood', '火': 'Fire', '土': 'Earth', '金': 'Metal', '水': 'Water',
    'TH 音（咬舌音）': 'TH', 'V 音（上齒輕咬下唇）': 'V', 'L 與 R 同時出現，華語使用者容易混淆': 'both L and R',
    '字首有子音群（如 Str-、Br-、Cl-），容易被唸成多一個音節': 'initial consonant cluster', '字尾有子音群（如 -nd、-rt、-lds），容易被省略或多加母音': 'final consonant cluster'
  };

  function lang() { return window.I18N && window.I18N.getLang && window.I18N.getLang() === 'en' ? 'en' : 'zh'; }
  /** tr('a.b', params)：取目前語言的字串；是 function 就帶參數呼叫 */
  function tr(key, p) {
    var get = function(dict) { return key.split('.').reduce(function(o, k) { return o == null ? o : o[k]; }, dict); };
    var s = get(TEXT[lang()]);
    if (s == null) s = get(TEXT.zh);
    return typeof s === 'function' ? s(p || {}) : s;
  }
  /** 中文術語在英文模式下換成英文 */
  function term(s) { return lang() === 'en' && EN_TERM[s] ? EN_TERM[s] : s; }

  // ============ 姓名熱門度與時代感 ============

  var TRENDS_SRC = 'js/data/name-trends.js';
  var usIndex = null;   // { F: { olivia: [ranks...] }, M: {...} }
  var twIndex = null;   // { '家豪': [{ d, sex, rank, count }] }

  /** 熱門度資料約 140 KB，打開工具時才載入 */
  function loadTrends(cb) {
    if (window.NameTrends) return cb(null);
    var s = document.createElement('script');
    s.src = TRENDS_SRC;
    s.onload = function() { cb(window.NameTrends ? null : tr('trendsBadFormat')); };
    s.onerror = function() { cb(tr('trendsLoadFail')); };
    document.head.appendChild(s);
  }

  function buildIndex() {
    var T = window.NameTrends;
    if (!T) return false;
    if (usIndex) return true;
    usIndex = { F: {}, M: {} };
    ['F', 'M'].forEach(function(sex) {
      T.us[sex].split('|').forEach(function(row) {
        var i = row.indexOf(':');
        usIndex[sex][row.slice(0, i).toLowerCase()] = {
          name: row.slice(0, i),
          ranks: row.slice(i + 1).split(',').map(function(x) { return x ? +x : 0; })
        };
      });
    });
    twIndex = {};
    T.tw.decades.forEach(function(d, di) {
      ['M', 'F'].forEach(function(sex) {
        d[sex].forEach(function(p, k) {
          (twIndex[p[0]] = twIndex[p[0]] || []).push({ d: di, sex: sex, rank: k + 1, count: p[1] });
        });
      });
    });
    return true;
  }

  /** 1950 → 祖父母輩 等世代說法（以今年為基準） */
  function generationOf(year) {
    var age = new Date().getFullYear() - year;
    if (age >= 60) return tr('gen.old');
    if (age >= 35) return tr('gen.mid');
    if (age >= 15) return tr('gen.young');
    return tr('gen.kid');
  }

  /**
   * 英文名在美國各年代的排名
   * @param sex 'F' | 'M' | ''（不指定時取排名較好的性別）
   * @return { found:false } 或 { name, sex, decades:[{ decade, rank }], latest, latestYear, peak, trend, era }
   */
  function trendEnglish(name, sex) {
    if (!buildIndex()) return { error: tr('trendsNotLoaded') };
    var key = String(name || '').trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, '');
    if (!key) return { error: tr('needEnName') };
    var T = window.NameTrends.us;
    var nDec = T.decades.length;
    var sexes = sex === 'F' || sex === 'M' ? [sex] : ['F', 'M'];
    var best = null;
    sexes.forEach(function(s) {
      var e = usIndex[s][key];
      if (!e) return;
      // 只比各年代（最後一欄是單一年份）
      var peak = Math.min.apply(null, e.ranks.slice(0, nDec).filter(Boolean));
      if (!best || peak < best.peakRank) best = { sex: s, e: e, peakRank: peak };
    });
    if (!best) return { found: false, name: key.charAt(0).toUpperCase() + key.slice(1), sex: sexes.length === 1 ? sexes[0] : '' };

    var ranks = best.e.ranks;
    var decades = T.decades.map(function(d, i) { return { decade: d, rank: ranks[i] }; });
    var latest = ranks[nDec];
    var peakIdx = ranks.slice(0, nDec).indexOf(best.peakRank);
    var peak = decades[peakIdx];
    var last = ranks[nDec - 1], prev = ranks[nDec - 2];
    var trend;
    if (!last && !prev) trend = 'gone';
    else if (!prev) trend = 'new';
    else if (!last) trend = 'falling';
    // 比例和名次差距都要夠大，避免 1 → 2 名這種小變動被當成下滑
    else if (last <= prev * 0.7 && prev - last >= 10) trend = 'rising';
    else if (last >= prev * 1.4 && last - prev >= 10) trend = 'falling';
    else trend = 'steady';

    var era, rising = trend === 'rising';
    if (peak.decade >= 2010 && latest && latest <= 100) era = tr('eraNow');
    else if (peak.decade >= 2000) era = tr('eraMillennial', { rising: rising });
    else era = tr('eraDecade', { decade: peak.decade, gen: generationOf(peak.decade + 5), rising: rising });

    return {
      found: true, name: best.e.name, sex: best.sex, decades: decades, latest: latest,
      latestYear: T.latest, peak: peak, trend: trend, era: era
    };
  }

  /**
   * 中文名在台灣各出生年代前十大的出現情形；不在榜上時以用字推估年代
   * @param input 名字（2 字）或全名（會用 ChineseNumerology 拆出名字）
   */
  function trendChinese(input) {
    if (!buildIndex()) return { error: tr('trendsNotLoaded') };
    var s = String(input || '').replace(/\s/g, '');
    if (!/^[一-鿿]+$/.test(s)) return { error: tr('needCnName') };
    var given = s;
    if (s.length >= 3 && window.ChineseNumerology) {
      var r = window.ChineseNumerology.analyze(s);
      if (r && !r.error) given = r.parsed.givenNameChars.join('');
    }
    var tw = window.NameTrends.tw;
    var hits = (twIndex[given] || []).map(function(h) {
      var d = tw.decades[h.d];
      return { label: d.label, from: d.from, to: d.to, sex: h.sex, rank: h.rank, count: h.count };
    });
    var overall = null;
    ['M', 'F'].forEach(function(sex) {
      tw.overall[sex].forEach(function(p, k) { if (p[0] === given) overall = { sex: sex, rank: k + 1, count: p[1] }; });
    });

    // 用字推估：每個年代前十大名字中含該字的人數占比，加總後取最高
    var weights = tw.decades.map(function(d) {
      var total = 0, w = 0, chars = [];
      ['M', 'F'].forEach(function(sex) {
        d[sex].forEach(function(p) {
          total += p[1];
          given.split('').forEach(function(c) {
            if (p[0].indexOf(c) >= 0) { w += p[1]; if (chars.indexOf(c) < 0) chars.push(c); }
          });
        });
      });
      return { label: d.label, from: d.from, to: d.to, share: total ? w / total : 0, chars: chars };
    });
    var bestW = weights.reduce(function(a, b) { return b.share > a.share ? b : a; });
    var charEra = bestW.share > 0 ? bestW : null;

    var era;
    if (hits.length) {
      var first = hits.reduce(function(a, b) { return b.rank < a.rank ? b : a; });
      era = tr('eraTwHit', { given: given, label: first.label, from: first.from, to: first.to, rank: first.rank, gen: generationOf(Math.round((first.from + first.to) / 2)) });
    } else if (charEra) {
      era = tr('eraTwChar', charEra);
    } else {
      era = tr('eraTwNone');
    }
    return { given: given, hits: hits, overall: overall, charEra: charEra, era: era };
  }

  // 各工具的輸入值與「已執行過」旗標：切換語言重畫時還原
  var state = {
    trend: { name: '', gender: '', ran: false },
    brand: { name: '', tone: 'trust', ran: false, domains: null, listText: null, cmpRan: false, cmp: null, cmpDomains: {}, cmpPending: {} },
    bf: { answers: [], ran: false },
    family: { parentA: '', parentB: '', candidate: '', siblings: '', generation: '', avoid: '', ran: false, ranked: null, opts: null }
  };

  function renderTrends() {
    var el = document.getElementById('toolTrends');
    if (!el) return;
    var s = state.trend;
    var html = '<p class="tool-desc">' + tr('trendsDesc') + '</p>';
    html += '<div class="tool-row">';
    html += '<label class="tool-field" style="flex:2;"><span>' + tr('trendName') + '</span><input id="trendName" class="form-input" placeholder="' + esc(tr('trendNamePh')) + '" autocomplete="off" value="' + esc(s.name) + '"></label>';
    html += '<label class="tool-field" style="flex:1;"><span>' + tr('trendGender') + '</span><select id="trendGender" class="form-input">' +
      [['', tr('anySex')], ['F', tr('F')], ['M', tr('M')]].map(function(o) {
        return '<option value="' + o[0] + '"' + (s.gender === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
      }).join('') + '</select></label>';
    html += '</div>';
    html += '<button type="button" class="btn-download-img" id="trendGo">' + tr('trendGo') + '</button><div id="trendResult"></div>';
    html += '<p class="tool-note">' + tr('trendSource') + '</p>';
    el.innerHTML = html;
    if (s.ran) runTrend();
  }

  function rankBars(decades) {
    return '<div class="trend-bars">' + decades.map(function(d) {
      // 對數刻度：第 1 名 100%、第 10 名 67%、第 100 名 33%
      var h = d.rank ? Math.max(4, Math.round((1 - Math.log(d.rank) / Math.log(1000)) * 100)) : 0;
      return '<div class="trend-bar" title="' + esc(tr('barTitle', d)) + '">' +
        '<span class="trend-bar-fill" style="height:' + h + '%"></span><small>' + String(d.decade).slice(2) + '</small></div>';
    }).join('') + '</div>';
  }

  function renderTrendEnglish(r) {
    if (r.error) return '<p class="tool-msg">' + esc(r.error) + '</p>';
    if (!r.found) {
      return '<div class="tool-cand">' + tr('notFoundEn', { name: r.name, sex: r.sex, sexText: r.sex ? tr(r.sex) : '' }) +
        '<p class="tool-line">' + tr('notFoundEnEra') + '</p></div>';
    }
    var html = '<div class="tool-cand"><div class="tool-cand-head"><span class="tool-cand-name">' + esc(r.name) + '</span>' +
      '<span class="tool-badge">' + tr('sexTrendBadge', { sexText: tr(r.sex), trend: tr('trend.' + r.trend) }) + '</span></div>';
    html += rankBars(r.decades);
    html += '<p class="tool-line">' + tr('peakLine', { decade: r.peak.decade, rank: r.peak.rank, latestYear: r.latestYear, latest: r.latest }) + '</p>';
    html += '<p class="tool-line">' + tr('eraLabel') + esc(r.era) + '</p>';
    return html + '</div>';
  }

  function renderTrendChinese(r) {
    if (r.error) return '<p class="tool-msg">' + esc(r.error) + '</p>';
    var html = '<div class="tool-cand"><div class="tool-cand-head"><span class="tool-cand-name">' + esc(r.given) + '</span>' +
      (r.overall ? '<span class="tool-badge">' + tr('twOverall', { sexText: tr(r.overall.sex), rank: r.overall.rank, count: r.overall.count }) + '</span>' : '') + '</div>';
    r.hits.forEach(function(h) {
      html += '<p class="tool-line">' + tr('twHit', { label: h.label, from: h.from, to: h.to, sexText: tr(h.sex), rank: h.rank, count: h.count }) + '</p>';
    });
    html += '<p class="tool-line">' + tr('eraLabel') + esc(r.era) + '</p>';
    return html + '</div>';
  }

  function runTrend() {
    var out = document.getElementById('trendResult');
    var name = val('trendName').trim();
    state.trend.ran = true;
    if (!name) { out.innerHTML = '<p class="tool-msg">' + tr('needTrendName') + '</p>'; return; }
    out.innerHTML = '<p class="tool-note">' + tr('loading') + '</p>';
    loadTrends(function(err) {
      if (err) { out.innerHTML = '<p class="tool-msg">' + esc(err) + '</p>'; return; }
      out.innerHTML = /[一-鿿]/.test(name) ? renderTrendChinese(trendChinese(name)) : renderTrendEnglish(trendEnglish(name, val('trendGender')));
    });
  }

  // ============ 品牌命名工作台 ============

  var TLDS = [
    { tld: 'com', rdap: 'https://rdap.verisign.com/com/v1/domain/' },
    { tld: 'net', rdap: 'https://rdap.verisign.com/net/v1/domain/' },
    { tld: 'io', rdap: 'https://rdap.identitydigital.services/rdap/domain/' },
    { tld: 'app', rdap: 'https://pubapi.registry.google/rdap/domain/' }
  ];
  var TONES = ['trust', 'warm', 'bold', 'calm'];

  /** 中文轉無聲調拼音當網域（森月 → senyue）；英文只保留英數 */
  function brandSlug(name) {
    var s = String(name || '').trim();
    var DB = window.PinyinDB;
    var out = s.split('').map(function(c) {
      if (/[a-z0-9]/i.test(c)) return c.toLowerCase();
      var py = DB && DB.CHAR[c];
      return py ? py.replace(/\d$/, '').replace('v', 'u') : '';
    }).join('');
    return out.slice(0, 63);
  }

  /**
   * 品牌名初篩（不含網域與商標）
   * @param tone 品牌調性 trust | warm | bold | calm（可省略；給了就多列「調性契合」加減分）
   * @return { name, kind: 'zh'|'en'|'mixed', tone, score, items: [{ key, label, pts, note }], slug }
   */
  function scoreBrand(name, tone) {
    name = String(name || '').trim();
    var chars, tones, e;
    if (!name) return { error: tr('needBrand') };
    var zh = (name.match(/[一-鿿]/g) || []).length;
    var en = (name.match(/[a-z]/ig) || []).length;
    var kind = zh && en ? 'mixed' : zh ? 'zh' : 'en';
    var items = [];
    var add = function(key, pts, note) { items.push({ key: key, label: tr('lbl.' + key), pts: pts, note: note }); };

    if (kind === 'zh') {
      if (zh >= 2 && zh <= 4) add('length', 20, tr('zhLenGood', { n: zh }));
      else if (zh >= 5 && zh <= 6) add('length', 10, tr('zhLenLong', { n: zh }));
      else add('length', 0, zh === 1 ? tr('zhLenOne') : tr('zhLenTooLong', { n: zh }));
    } else {
      var letters = name.replace(/[^a-z]/ig, '').length;
      if (letters >= 3 && letters <= 8) add('length', 20, tr('enLenGood', { n: letters }));
      else if (letters <= 12) add('length', 10, tr('enLenLong', { n: letters }));
      else add('length', 0, letters < 3 ? tr('enLenShort') : tr('enLenTooLong'));
    }
    if (kind === 'mixed') add('consistency', -5, tr('mixed'));

    var P = window.Phonetics, DB = window.PinyinDB;
    if (kind === 'zh' && P && DB) {
      var chars = name.replace(/[^一-鿿]/g, '').split('');
      var sylls = chars.map(function(c) { return DB.CHAR[c] ? P.splitPy(DB.CHAR[c]) : null; });
      var unknown = chars.filter(function(c, i) { return !sylls[i]; });
      if (unknown.length) add('easy', 0, tr('rareChars', { chars: unknown.join('') }));
      else add('easy', 10, tr('commonChars'));
      var homos = P.findHomophones(sylls, chars);
      var worst = homos.length ? homos[0] : null;
      if (worst && worst.level === 3) add('homophone', -30, tr('homo3', worst));
      else if (worst && worst.level === 2) add('homophone', -15, tr('homo2', worst));
      else if (worst) add('homophone', -5, tr('homo1', worst));
      else add('homophone', 15, tr('noHomo'));
      var tones = sylls.filter(Boolean).map(function(s) { return s.tone; });
      if (tones.length >= 2 && tones.every(function(t) { return t === tones[0]; })) add('tone', -5, tr('flatTone'));
      else if (tones.length >= 2) add('tone', 5, tr('variedTone'));
      for (var i = 1; i < sylls.length; i++) {
        if (sylls[i] && sylls[i - 1] && sylls[i].base === sylls[i - 1].base && chars[i] !== chars[i - 1]) { add('awkward', -5, tr('sameSound', { pair: chars[i - 1] + chars[i] })); break; }
      }
    } else if (kind === 'en' && P && en) {
      var e = P.checkEnglish(name.replace(/[^a-z]/ig, ''));
      if (e.slang) add('slang', -30, tr('slangHit', { slang: e.slang }));
      else add('slang', 15, tr('noSlang'));
      if (e.syllables <= 3) add('easy', 10, tr('syllables', { n: e.syllables, est: e.estimated }));
      else add('easy', 0, tr('syllablesLong', { n: e.syllables }));
      if (e.hard.length) add('mandarin', -5 * e.hard.length, tr('hardSounds', { list: e.hard.map(term) }));
    }
    if (/\d/.test(name)) add('digits', -5, tr('hasDigits'));

    if (TONES.indexOf(tone) >= 0) {
      toneFit(tone, {
        name: name, kind: kind, zh: zh, letters: name.replace(/[^a-z]/ig, '').length, chars: chars || [],
        tones: tones || [], sylls: sylls || [], english: e || null, pts: function(key) { return items.filter(function(x) { return x.key === key; }).reduce(function(s, x) { return s + x.pts; }, 0); }
      }).forEach(function(f) { items.push({ key: 'toneFit', label: tr('lbl.toneFit'), pts: f[0], note: f[1] }); });
    }

    var score = 50 + items.reduce(function(s, x) { return s + x.pts; }, 0);
    return { name: name, kind: kind, tone: tone || '', score: Math.max(0, Math.min(100, score)), items: items, slug: brandSlug(name) };
  }

  // 調性用字（2026-10-06 依真實品牌案例校準，見 tools/test-naming.js「品牌調性校準」）
  // 自然療癒：自然意象，加上寧靜、素樸的字
  var NATURE = '山水木林森月雲風花草葉溪湖海雨露晴光青綠禾竹松柏楓櫻梅蘭荷蓮泉川澗谷石岩星日晨曦霞雪霧島嶼田野苗芽種果橘桃杏茶棉麻晴霽澄清蔚藍藤籽靜寧柔淨悠禪素良原純簡恬';
  // 專業可信：穩固、國家、財富、誠信的字
  var TRUST_CHARS = '國泰富邦信華中安正誠聯興銀通永鴻宏成達元金台電豐隆盛恆聖德鼎晶積實台榮匯證保';
  // 溫暖親和：家常、親暱、甜美的字
  var WARM_CHARS = '家美小好樂愛心甜暖喜乖寶貝親媽童糖蜜歡笑甘福媽阿麻吉趣';
  // 有力的聲母（塞音、塞擦音）
  var HARD_INI = { k: 1, g: 1, t: 1, p: 1, q: 1, j: 1, zh: 1, ch: 1, z: 1, c: 1 };

  /**
   * 品牌調性的加減分（不改基礎分，另列「調性契合」讓使用者看得到原因）
   * 每種調性看自己的特徵，名字短不再只對「創新有力」加分（多數品牌名本來就短）
   * @return [[pts, note], ...]
   */
  function toneFit(tone, c) {
    var out = [], add = function(p, key, params) { out.push([p, tr('fit.' + key, params)]); };
    var en = c.english;
    var w = c.name.toLowerCase().replace(/[^a-z]/g, '');
    var pick = function(list) { return c.chars.filter(function(ch, i) { return list.indexOf(ch) >= 0 && c.chars.indexOf(ch) === i; }); };
    var doubled = c.kind === 'zh' ? c.chars.some(function(ch, i) { return i && ch === c.chars[i - 1]; })
      : c.kind === 'en' && /^([a-z]{2,3})\1$/.test(w);
    if (tone === 'trust') {
      // 專業可信：諧音、俚語、數字、中英混搭都更傷信任感；穩重的字、完整的音節加分
      var bad = c.pts('homophone') < 0 || c.pts('slang') < 0;
      if (c.pts('homophone') < 0) add(Math.round(c.pts('homophone') / 2), 'trustHomo');
      if (c.pts('slang') < 0) add(-15, 'trustSlang');
      if (c.pts('digits') < 0) add(-5, 'trustDigits');
      if (c.kind === 'mixed') add(-5, 'trustMixed');
      if (!bad && c.pts('digits') === 0 && c.kind !== 'mixed' && c.pts('easy') > 0) add(5, 'trustClear');
      if (doubled) add(-5, 'trustCute');
      else if (c.kind === 'zh') { var tc = pick(TRUST_CHARS); if (tc.length) add(10, 'trustChars', { chars: tc.join('、') }); }
      else if (en && en.syllables >= 3 && en.syllables <= 4) add(5, 'trustFormal', { n: en.syllables });
    } else if (tone === 'warm') {
      // 溫暖親和：疊字、家常的字、聲調起伏、收在母音
      if (doubled) add(10, 'warmDouble');
      if (c.kind === 'zh') {
        var wc = pick(WARM_CHARS);
        if (wc.length) add(10, 'warmChars', { chars: wc.join('、') });
        if (c.tones.length >= 2) {
          if (c.pts('tone') > 0) add(5, 'warmTones');
          else if (!doubled) add(-5, 'warmFlat');
        }
        if (c.pts('easy') === 0) add(-5, 'warmRare');
      }
      if (en) {
        if (en.syllables <= 2) add(5, 'warmShort', { n: en.syllables });
        if (/[aeiouy]$/.test(w)) add(5, 'warmOpen');
        if (en.hard.length) add(-5, 'warmHard');
      }
    } else if (tone === 'bold') {
      // 創新有力：短而有力的音（塞音、去聲收尾、爆破音），可接受中英混搭與數字
      if (c.kind === 'zh') {
        if (c.zh === 2) add(5, 'boldShortZh');
        else if (c.zh >= 4) add(-5, 'boldLongZh', { n: c.zh });
        var sy = c.sylls.filter(Boolean);
        if (sy.some(function(s) { return HARD_INI[s.ini]; }) || (sy.length && sy[sy.length - 1].tone === 4)) add(5, 'boldSoundZh');
      } else if (c.kind === 'en') {
        if (c.letters >= 3 && c.letters <= 5) add(5, 'boldShortEn', { n: c.letters });
        else if (c.letters > 8) add(-5, 'boldLongEn', { n: c.letters });
        if (/[kxzq]|ck|^[bgkpt]/.test(w)) add(5, 'boldSoundEn');
      } else {
        add(5, 'boldMixed');
      }
      if (c.pts('digits') < 0) add(5, 'boldDigits');
    } else if (tone === 'calm') {
      // 自然療癒：自然或寧靜的意象、柔和的音
      if (c.kind === 'zh') {
        var hits = pick(NATURE);
        if (hits.length) add(10, 'calmNature', { chars: hits.join('、') });
        else add(-5, 'calmNoNature');
      } else if (c.kind === 'en') {
        if (/[aeiouylmn]$/.test(w) && !/[kqxz]/.test(w)) add(5, 'calmSoft');
        else if (/[kqxz]/.test(w)) add(-5, 'calmHard');
        if (!/[bdgkpqtxzc]/.test(w)) add(5, 'calmFlow');
      }
    }
    // 有嚴重諧音或負面俚語時，任何調性都不加分（只保留扣分）
    if (c.pts('slang') < 0 || c.pts('homophone') <= -15) out = out.filter(function(f) { return f[0] < 0; });
    return out;
  }

  /**
   * 以 RDAP 查網域：404 = 登記處沒有紀錄（多半可註冊），200 = 已被註冊
   * @param fetchFn 可替換（測試用），預設 window.fetch
   * @return Promise<[{ tld, domain, status: 'taken'|'free'|'error' }]>
   */
  function checkDomains(slug, fetchFn) {
    fetchFn = fetchFn || (typeof fetch === 'function' ? fetch : null);
    return Promise.all(TLDS.map(function(t) {
      var domain = slug + '.' + t.tld;
      if (!fetchFn || !slug) return Promise.resolve({ tld: t.tld, domain: domain, status: 'error' });
      return fetchFn(t.rdap + encodeURIComponent(domain), { headers: { Accept: 'application/rdap+json' } }).then(function(res) {
        return { tld: t.tld, domain: domain, status: res.status === 200 ? 'taken' : res.status === 404 ? 'free' : 'error' };
      }, function() {
        return { tld: t.tld, domain: domain, status: 'error' };
      });
    }));
  }

  function renderBrand() {
    var el = document.getElementById('toolBrand');
    if (!el) return;
    var s = state.brand;
    var html = '<p class="tool-desc">' + tr('brandDesc') + '</p>';
    html += '<div class="tool-row">';
    html += '<label class="tool-field" style="flex:1;"><span>' + tr('brandName') + '</span><input id="brandName" class="form-input" placeholder="' + esc(tr('brandNamePh')) + '" autocomplete="off" value="' + esc(s.name) + '"></label>';
    html += '<label class="tool-field" style="flex:1;"><span>' + tr('brandTone') + '</span><select id="brandTone" class="form-input">' +
      TONES.map(function(k) { return '<option value="' + k + '"' + (s.tone === k ? ' selected' : '') + '>' + tr('tone.' + k) + '</option>'; }).join('') + '</select></label>';
    html += '</div>';
    html += '<button type="button" class="btn-download-img" id="brandGo">' + tr('brandGo') + '</button><div id="brandResult"></div>';
    if (s.listText == null) s.listText = loadCmpList().join('\n');
    html += '<div class="tool-compare"><h4 class="tool-subtitle">' + tr('cmpTitle') + '</h4><p class="tool-desc">' + tr('cmpDesc') + '</p>' +
      '<textarea id="brandCompareInput" class="form-input" rows="3" placeholder="' + esc(tr('cmpPh')) + '">' + esc(s.listText) + '</textarea>' +
      '<div class="tool-actions"><button type="button" class="btn-download-img" id="brandCompareGo">' + tr('cmpGo') + '</button>' +
      '<button type="button" class="btn-action btn-action-secondary" id="brandCompareClear">' + tr('cmpClear') + '</button></div>' +
      '<div id="brandCompareResult"></div></div>';
    el.innerHTML = html;
    if (s.ran) runBrand(true);
    if (s.cmpRan) runCompare(true);
  }

  function domainRows(list) {
    return list.map(function(d) {
      return '<span class="tool-grid domain-' + d.status + '">' + esc(d.domain) + tr('colon') + tr('domain.' + d.status) + '</span>';
    }).join('');
  }

  /** @param reuse 重畫（切換語言）時沿用已查到的網域結果，不重新查詢 */
  function runBrand(reuse) {
    var out = document.getElementById('brandResult');
    var r = scoreBrand(val('brandName'), val('brandTone'));
    state.brand.ran = true;
    if (r.error) { out.innerHTML = '<p class="tool-msg">' + esc(r.error) + '</p>'; return; }
    var cached = reuse === true && state.brand.domains && state.brand.domains.slug === r.slug ? state.brand.domains.list : null;
    var html = '<div class="tool-cand"><div class="tool-cand-head"><span class="tool-cand-name">' + esc(r.name) + '</span><span class="tool-badge">' + tr('screenScore', r) + '</span></div>';
    html += r.items.map(function(x) {
      return '<p class="tool-line">' + (x.pts > 0 ? '✅' : x.pts < 0 ? '⚠️' : '・') + ' <strong>' + esc(x.label) + '</strong>' + tr('colon') + esc(x.note) + (x.pts ? tr('paren', { x: (x.pts > 0 ? '+' : '') + x.pts }) : '') + '</p>';
    }).join('');
    html += '<p class="tool-line">' + tr('toneLine') + esc(tr('toneText.' + val('brandTone')) || '') + '</p>';
    if (r.slug) {
      html += '<p class="tool-line">' + tr('domainsBy', { slug: r.kind !== 'en' ? r.slug : '' }) + '</p><div class="tool-grids" id="brandDomains">' +
        domainRows(cached || TLDS.map(function(t) { return { domain: r.slug + '.' + t.tld, status: 'pending' }; })) + '</div>';
    }
    html += '<div class="tool-actions">' +
      '<a class="btn-action btn-action-secondary" target="_blank" rel="noopener" href="https://twtmsearch.tipo.gov.tw/">' + tr('tmLink') + '</a>' +
      (r.slug ? '<a class="btn-action btn-action-secondary" target="_blank" rel="noopener" href="https://www.twnic.tw/whois_n.php?query=' + encodeURIComponent(r.slug + '.com.tw') + '">' + tr('twLink') + '</a>' : '') +
      '<button type="button" class="btn-action btn-action-secondary" id="brandAdd">' + tr('cmpAdd') + '</button></div><p class="tool-msg" id="brandAddMsg"></p>';
    html += '<p class="tool-note">' + tr('brandNote') + '</p>';
    out.innerHTML = html + '</div>';
    if (!r.slug || cached) return;
    state.brand.domains = null;
    checkDomains(r.slug).then(function(list) {
      // 使用者可能已經改查別的名字
      if (val('brandName').trim() !== r.name) return;
      state.brand.domains = { slug: r.slug, list: list };
      var box = document.getElementById('brandDomains');
      if (box) box.innerHTML = domainRows(list);
    });
  }

  // ============ 品牌候選比較 ============

  var CMP_MAX = 8, CMP_STORE = 'name-harmony-brand-list';

  /** 文字拆成候選名：逗號、頓號、分號、換行分隔；去掉重複（英文不分大小寫）；最多 8 個 */
  function parseBrandCandidates(text) {
    var seen = {}, list = [];
    String(text || '').split(/[,，、;；\n\r]+/).forEach(function(s) {
      s = s.trim();
      var key = s.toLowerCase();
      if (!s || seen[key]) return;
      seen[key] = true;
      list.push(s);
    });
    return { list: list.slice(0, CMP_MAX), skipped: list.slice(CMP_MAX) };
  }

  function sumPts(items, fit) {
    return items.filter(function(x) { return (x.key === 'toneFit') === fit; }).reduce(function(s, x) { return s + x.pts; }, 0);
  }

  /**
   * 比較多個候選名
   * @return { tone, rows: [{ rank, name, kind, slug, score, base, fit, bestTones: [tone], risks: [{ label, note, pts }], items }] }
   *   依總分、基礎分排序；同分同名次
   */
  function compareBrands(names, tone) {
    if (TONES.indexOf(tone) < 0) tone = 'trust';
    var rows = [];
    (names || []).forEach(function(n, i) {
      var r = scoreBrand(n, tone);
      if (r.error) return;
      var fits = TONES.map(function(t) { return sumPts(scoreBrand(n, t).items, true); });
      var max = Math.max.apply(null, fits);
      rows.push({
        order: i, name: r.name, kind: r.kind, slug: r.slug, score: r.score, raw: 50 + sumPts(r.items, false) + sumPts(r.items, true), items: r.items,
        base: Math.max(0, Math.min(100, 50 + sumPts(r.items, false))), fit: sumPts(r.items, true),
        // 四種調性都沒有正分（例如有負面俚語）時不硬選
        bestTones: max > 0 ? TONES.filter(function(t, k) { return fits[k] === max; }) : [],
        risks: r.items.filter(function(x) { return x.pts < 0; }).map(function(x) { return { label: x.label, note: x.note, pts: x.pts }; })
      });
    });
    // 分數夾在 0–100，好名字常一起封頂；排序用未夾的原始分，才分得出高下
    rows.sort(function(a, b) { return b.raw - a.raw || b.base - a.base || a.order - b.order; });
    rows.forEach(function(r, i) { r.rank = i && r.raw === rows[i - 1].raw && r.base === rows[i - 1].base ? rows[i - 1].rank : i + 1; });
    return { tone: tone, rows: rows };
  }

  /**
   * 決策摘要（Markdown）
   * @param domains { slug: [{ tld, status }] }（可省略：網域欄顯示「查詢中」）
   * @param date YYYY-MM-DD
   */
  function brandDecisionSummary(cmp, domains, date) {
    domains = domains || {};
    var md = function(s) { return String(s).replace(/\|/g, '\\|'); };
    var lines = ['# ' + tr('sumTitle'), '', '- ' + tr('sumDate') + tr('colon') + date, '- ' + tr('sumTone') + tr('colon') + tr('tone.' + cmp.tone), ''];
    var top = cmp.rows.filter(function(r) { return r.rank === 1; });
    if (top.length === 1) lines.push(tr('cmpTop', { tone: tr('tone.' + cmp.tone), name: top[0].name, score: top[0].score }), '');
    else if (top.length > 1) lines.push(tr('cmpTie', { names: top.map(function(r) { return r.name; }).join('、'), score: top[0].score }), '');
    lines.push('## ' + tr('sumRank'), '', tr('sumTable'), '|' + new Array(11).join('---|'));
    cmp.rows.forEach(function(r) {
      var d = domains[r.slug] || [];
      var cell = function(tld) {
        var x = d.filter(function(y) { return y.tld === tld; })[0];
        return r.slug ? tr('dShort.' + (x ? x.status : 'pending')) : '—';
      };
      lines.push('| ' + [r.rank, md(r.name), r.score + (r.raw !== r.score ? ' (' + r.raw + ')' : ''), r.base, (r.fit > 0 ? '+' : '') + r.fit,
        r.bestTones.map(function(t) { return tr('tone.' + t); }).join('、') || '—', cell('com'), cell('net'), cell('io'), cell('app')].join(' | ') + ' |');
    });
    lines.push('', '## ' + tr('sumWhy'), '');
    cmp.rows.forEach(function(r) {
      lines.push('### ' + r.rank + '. ' + r.name, '');
      if (!r.risks.length) lines.push('- ' + tr('sumNone'));
      r.risks.forEach(function(x) { lines.push('- ' + x.label + tr('colon') + x.note + tr('paren', { x: x.pts })); });
      lines.push('');
    });
    lines.push('---', '', '> ' + tr('sumDomainNote'), '>', '> ' + tr('sumDisclaimer'), '');
    return lines.join('\n');
  }

  function loadCmpList() {
    try { var a = JSON.parse(localStorage.getItem(CMP_STORE) || '[]'); return Array.isArray(a) ? a.filter(function(s) { return typeof s === 'string'; }).slice(0, CMP_MAX) : []; } catch (e) { return []; }
  }
  function saveCmpList(list) {
    try { localStorage.setItem(CMP_STORE, JSON.stringify(list)); } catch (e) {}
  }

  /** 單一結果的「加入比較」 */
  function addToCompare() {
    var name = val('brandName').trim(), box = document.getElementById('brandCompareInput'), msg = document.getElementById('brandAddMsg');
    if (!name || !box) return;
    var p = parseBrandCandidates(box.value);
    if (p.list.some(function(s) { return s.toLowerCase() === name.toLowerCase(); })) {
      if (msg) msg.textContent = tr('cmpAdded', { n: p.list.length });
      return;
    }
    if (p.list.length >= CMP_MAX) { if (msg) msg.textContent = tr('cmpFull'); return; }
    p.list.push(name);
    box.value = p.list.join('\n');
    state.brand.listText = box.value;
    saveCmpList(p.list);
    if (msg) msg.textContent = tr('cmpAdded', { n: p.list.length });
  }

  function cmpDomainCells(slug) {
    var list = state.brand.cmpDomains[slug] || TLDS.map(function(t) { return { tld: t.tld, status: 'pending' }; });
    return list.map(function(d) {
      return '<span class="tool-grid domain-' + d.status + '" title="' + esc(slug + '.' + d.tld) + tr('colon') + esc(tr('domain.' + d.status)) + '">.' + d.tld + ' ' + esc(tr('dShort.' + d.status)) + '</span>';
    }).join('');
  }

  /** @param reuse 切換調性或語言時重畫，網域沿用已查到的結果 */
  function runCompare(reuse) {
    var out = document.getElementById('brandCompareResult'), box = document.getElementById('brandCompareInput');
    if (!out || !box) return;
    var p = parseBrandCandidates(box.value);
    state.brand.listText = box.value;
    if (reuse !== true) saveCmpList(p.list);
    if (p.list.length < 2) { out.innerHTML = '<p class="tool-msg">' + tr('cmpNeed') + '</p>'; state.brand.cmpRan = false; return; }
    state.brand.cmpRan = true;
    var cmp = compareBrands(p.list, val('brandTone'));
    state.brand.cmp = cmp;
    var C = function(k) { return '<th>' + tr('cmpCol.' + k) + '</th>'; };
    var html = p.skipped.length ? '<p class="tool-msg">' + esc(tr('cmpTrim', { list: p.skipped.join('、') })) + '</p>' : '';
    var top = cmp.rows.filter(function(r) { return r.rank === 1; });
    html += '<p class="tool-line"><strong>' + esc(top.length > 1
      ? tr('cmpTie', { names: top.map(function(r) { return r.name; }).join('、'), score: top[0].score })
      : tr('cmpTop', { tone: tr('tone.' + cmp.tone), name: top[0].name, score: top[0].score })) + '</strong></p>';
    html += '<div class="cmp-wrap"><table class="report-table cmp-table"><thead><tr>' + C('rank') + C('name') + C('score') + C('base') + C('fit') + C('bestTone') + C('risk') + C('domains') + '</tr></thead><tbody>';
    cmp.rows.forEach(function(r) {
      html += '<tr' + (r.rank === 1 ? ' class="cmp-best"' : '') + '><td>' + r.rank + '</td><td class="cmp-name">' + esc(r.name) + '</td><td><strong>' + r.score + '</strong>' + (r.raw !== r.score ? '<small class="tool-meta" title="' + esc(tr('cmpRaw')) + '">（' + r.raw + '）</small>' : '') + '</td><td>' + r.base + '</td>' +
        '<td>' + (r.fit > 0 ? '+' : '') + r.fit + '</td><td>' + (r.bestTones.map(function(t) { return esc(tr('tone.' + t)); }).join('<br>') || '—') + '</td>' +
        '<td class="cmp-risk">' + (r.risks.length ? r.risks.map(function(x) { return '<span title="' + esc(x.note) + '">⚠️ ' + esc(x.label) + ' ' + x.pts + '</span>'; }).join('<br>') : tr('cmpNoRisk')) + '</td>' +
        '<td class="cmp-dom" data-slug="' + esc(r.slug) + '">' + (r.slug ? cmpDomainCells(r.slug) : '—') + '</td></tr>';
    });
    html += '</tbody></table></div>';
    html += '<div class="tool-actions"><button type="button" class="btn-action btn-action-secondary" id="brandExport">' + tr('cmpExport') + '</button>' +
      '<button type="button" class="btn-action btn-action-secondary" id="brandCopy">' + tr('cmpCopy') + '</button></div>';
    html += '<p class="tool-note" id="brandCmpMsg">' + tr('sumDisclaimer') + '</p>';
    out.innerHTML = html;
    // 查還沒查過的網域（同一個 slug 只查一次）
    cmp.rows.forEach(function(r) {
      if (!r.slug || state.brand.cmpDomains[r.slug] || state.brand.cmpPending[r.slug]) return;
      state.brand.cmpPending[r.slug] = true;
      checkDomains(r.slug).then(function(list) {
        delete state.brand.cmpPending[r.slug];
        state.brand.cmpDomains[r.slug] = list;
        document.querySelectorAll('#brandCompareResult .cmp-dom').forEach(function(td) {
          if (td.getAttribute('data-slug') === r.slug) td.innerHTML = cmpDomainCells(r.slug);
        });
      });
    });
  }

  function today() {
    var d = new Date(), z = function(n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
  }

  function exportCompare(copy) {
    if (!state.brand.cmp) return;
    var text = brandDecisionSummary(state.brand.cmp, state.brand.cmpDomains, today());
    var msg = document.getElementById('brandCmpMsg');
    if (copy) {
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(function() { if (msg) msg.textContent = tr('cmpCopied'); });
      return;
    }
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
    a.download = 'brand-decision-' + today() + '.md';
    document.body.appendChild(a);
    a.click();
    setTimeout(function() { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  // ============ 名字與自我人格對照（Big Five） ============

  var FACTORS = [
    ['O', '我喜歡探索新觀點與陌生領域。', 1], ['O', '我偏好熟悉的方法，不喜歡改變。', -1],
    ['C', '我做事有計畫，並按時完成。', 1], ['C', '我常常拖到最後一刻才處理事情。', -1],
    ['E', '我會主動和陌生人互動。', 1], ['E', '長時間社交會讓我很快耗盡能量。', -1],
    ['A', '我通常會先理解別人的立場。', 1], ['A', '我傾向直接挑戰他人的觀點。', -1],
    ['N', '我容易因小事感到緊張或擔心。', 1], ['N', '壓力來時，我通常能保持平穩。', -1]
  ];
  var FACTOR_KEYS = ['O', 'C', 'E', 'A', 'N'];

  /**
   * @param answers 與 FACTORS 對應的 1–5 分
   * @return { O: { name, score: 0–100, level }, ... }；反向題以 6 − 分數計
   */
  function scoreBigFive(answers) {
    var sum = {}, cnt = {};
    FACTORS.forEach(function(q, i) {
      var v = Math.max(1, Math.min(5, +answers[i] || 3));
      sum[q[0]] = (sum[q[0]] || 0) + (q[2] > 0 ? v : 6 - v);
      cnt[q[0]] = (cnt[q[0]] || 0) + 1;
    });
    var out = {};
    FACTOR_KEYS.forEach(function(k) {
      var score = Math.round((sum[k] / cnt[k] - 1) / 4 * 100);
      out[k] = { name: tr('factor.' + k), score: score, level: tr('level.' + (score >= 70 ? 'high' : score <= 30 ? 'low' : 'mid')) };
    });
    return out;
  }

  function renderPersonality() {
    var el = document.getElementById('toolPersonality');
    if (!el) return;
    var en = lang() === 'en';
    var html = '<p class="tool-desc">' + tr('bfDesc') + '</p>';
    html += FACTORS.map(function(q, i) {
      var cur = state.bf.answers[i] || 3;
      var opts = [1, 2, 3, 4, 5].map(function(v) {
        return '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + (tr('bfOpt.' + v) || v) + '</option>';
      }).join('');
      return '<label class="tool-field"><span>' + (en ? FACTORS_EN[i] : q[1]) + '</span><select class="form-input bf" data-i="' + i + '">' + opts + '</select></label>';
    }).join('');
    html += '<button type="button" class="btn-download-img" id="bfGo">' + tr('bfGo') + '</button><div id="bfResult"></div>';
    el.innerHTML = html;
    if (state.bf.ran) runPersonality();
  }

  function readBfAnswers() {
    var answers = [];
    [].forEach.call(document.querySelectorAll('#toolPersonality .bf'), function(x) { answers[+x.dataset.i] = +x.value; });
    return answers;
  }

  function runPersonality() {
    state.bf.ran = true;
    var r = scoreBigFive(readBfAnswers());
    var html = '<div class="tool-cand">' + FACTOR_KEYS.map(function(k) {
      return '<p class="tool-line"><strong>' + r[k].name + '</strong> ' + r[k].score + '/100　' + r[k].level + '</p>';
    }).join('');
    html += '<p class="tool-note">' + tr('bfNote') + '</p></div>';
    document.getElementById('bfResult').innerHTML = html;
  }

  // ============ 家庭命名規劃 ============

  /** 拆出姓與名；筆劃庫不足時以第一個字當姓 */
  function splitName(full) {
    full = String(full || '').replace(/\s/g, '');
    if (!/^[一-鿿]{2,}$/.test(full)) return null;
    var r = window.ChineseNumerology && window.ChineseNumerology.analyze(full);
    if (r && !r.error) return { full: full, surname: r.parsed.surnameChars.join(''), given: r.parsed.givenNameChars, analysis: r };
    return { full: full, surname: full.charAt(0), given: full.slice(1).split(''), analysis: null };
  }

  function pyBase(c) {
    var p = window.PinyinDB && window.PinyinDB.CHAR[c];
    return p ? p.replace(/\d$/, '') : null;
  }

  /**
   * @param opts { candidate: '王怡蘊', parents: ['王大明', ...], siblings: ['王子晴', ...] }
   * @return { error } 或 { candidate, blocked, warns: [], infos: [], pairs: [{ who, name, score, tier }], phonetics }
   */
  function checkFamily(opts) {
    var cand = splitName(opts.candidate);
    if (!cand || !cand.analysis) return { error: tr('needCandidate') };
    var members = [];
    var skipped = [];
    (opts.parents || []).forEach(function(n) { var m = splitName(n); if (m) members.push({ role: 'parent', m: m }); else if (n) skipped.push(n); });
    (opts.siblings || []).forEach(function(n) { var m = splitName(n); if (m) members.push({ role: 'sibling', m: m }); else if (n) skipped.push(n); });

    var blocked = false, warns = [], infos = [];
    members.forEach(function(x) {
      var m = x.m;
      if (m.full === cand.full) { blocked = true; warns.push(tr('sameName', { who: tr('who.' + x.role), name: m.full })); return; }
      var shared = cand.given.filter(function(c) { return m.given.indexOf(c) >= 0; });
      var sameSound = cand.given.filter(function(c) {
        var b = pyBase(c);
        return b && shared.indexOf(c) < 0 && m.given.some(function(g) { return g !== c && pyBase(g) === b; });
      });
      if (x.role === 'parent') {
        if (shared.length) warns.push(tr('parentChar', { name: m.full, chars: shared.join('、') }));
        if (sameSound.length) warns.push(tr('parentSound', { name: m.full, chars: sameSound.join('、') }));
      } else {
        if (shared.length) infos.push(tr('siblingChar', { name: m.full, chars: shared.join('、') }));
        if (sameSound.length) warns.push(tr('siblingSound', { name: m.full, chars: sameSound.join('、') }));
      }
    });
    // 輩分字：名字裡要有這個字
    var gen = String(opts.generation || '').replace(/[^一-鿿]/g, '').charAt(0);
    var genOk = null;
    if (gen) {
      var pos = cand.given.indexOf(gen);
      genOk = pos >= 0;
      if (genOk) infos.push(tr('genHas', { c: gen, pos: pos + 1 }));
      else warns.push(tr('genMissing', { c: gen }));
    }
    // 避諱：字或長輩姓名裡的每個字，名字不能用到相同或同音的字
    var avoid = String(opts.avoid || '').replace(/[^一-鿿]/g, '').split('').filter(function(c, i, a) { return a.indexOf(c) === i; });
    if (avoid.length) {
      var hit = cand.given.filter(function(c) { return avoid.indexOf(c) >= 0; });
      var homo = cand.given.filter(function(c) {
        var b = pyBase(c);
        return b && hit.indexOf(c) < 0 && avoid.some(function(a) { return a !== c && pyBase(a) === b; });
      });
      if (hit.length) warns.push(tr('avoidChar', { chars: hit.join('、') }));
      if (homo.length) warns.push(tr('avoidSound', { chars: homo.join('、') }));
    }
    if (!members.length) infos.push(tr('noFamily'));
    else if (!warns.length && !infos.length) infos.push(tr('familyClear'));
    if (skipped.length) infos.push(tr('skipped', { names: skipped }));

    var H = window.PairHarmony;
    var pairs = members.filter(function(x) { return x.m.analysis && x.m.full !== cand.full; }).map(function(x) {
      var h = H ? H.cncnHarmony(x.m.analysis, cand.analysis) : null;
      return { who: tr('who.' + x.role), role: x.role, name: x.m.full, score: h ? h.score : null, tier: h ? h.tier : '' };
    });
    var ph = window.Phonetics ? window.Phonetics.checkChinese(cand.analysis.parsed) : null;
    if (ph && ph.grade === '需注意') warns.push(tr('phonCaution', { warn: ph.warns[0] || '' }));
    var scored = pairs.filter(function(p) { return p.score != null; });
    var avg = scored.length ? Math.round(scored.reduce(function(s, p) { return s + p.score; }, 0) / scored.length) : null;
    return { candidate: cand, blocked: blocked, warns: warns, infos: infos, pairs: pairs, phonetics: ph, avgHarmony: avg, generationOk: genOk };
  }

  /** 候選名字串拆成清單：逗號、頓號、分號、換行或空白分隔，去重，最多 5 個 */
  function parseFamilyCandidates(text) {
    var seen = {}, list = [];
    String(text || '').split(/[,，、;；\s]+/).forEach(function(s) { if (s && !seen[s]) { seen[s] = 1; list.push(s); } });
    return { list: list.slice(0, 5), skipped: list.slice(5) };
  }

  /**
   * 比較多個候選名
   * @param opts checkFamily 的參數，但 candidates 是陣列
   * @return { results: [{ rank, ...checkFamily 結果 }]（依能否使用、需留意項目、平均和諧度排序）, errors: [{ name, error }] }
   */
  function rankFamily(opts) {
    var results = [], errors = [];
    (opts.candidates || []).forEach(function(name, i) {
      var r = checkFamily({ candidate: name, parents: opts.parents, siblings: opts.siblings, generation: opts.generation, avoid: opts.avoid });
      if (r.error) errors.push({ name: name, error: r.error });
      else { r.order = i; results.push(r); }
    });
    var key = function(r) { return [r.blocked ? 1 : 0, r.warns.length, -(r.avgHarmony == null ? -1 : r.avgHarmony), r.order]; };
    results.sort(function(a, b) {
      var x = key(a), y = key(b);
      for (var k = 0; k < x.length; k++) if (x[k] !== y[k]) return x[k] - y[k];
      return 0;
    });
    results.forEach(function(r, i) {
      var p = results[i - 1];
      r.rank = p && p.blocked === r.blocked && p.warns.length === r.warns.length && p.avgHarmony === r.avgHarmony ? p.rank : i + 1;
    });
    return { results: results, errors: errors };
  }

  /** 結論文字：不能使用／需留意 n 項／沒有需留意項目 */
  function familyVerdict(r) {
    return r.blocked ? tr('blocked') : r.warns.length ? tr('warnCount', { n: r.warns.length }) : tr('familyOk');
  }

  /**
   * 家庭決策報告（完整 HTML 文件，給 NamingTools.printHtml 列印或另存 PDF）
   * @param opts { parents, siblings, generation, avoid }
   */
  function familyReportHtml(ranked, opts, date) {
    var e = esc, results = ranked.results;
    var none = '<small>' + tr('repNone') + '</small>';
    var cond = [
      [tr('repParents'), (opts.parents || []).map(e).join('、') || none],
      [tr('repSiblings'), (opts.siblings || []).map(e).join('、') || none],
      [tr('repGen'), opts.generation ? e(opts.generation) : none],
      [tr('repAvoid'), opts.avoid ? e(opts.avoid) : none]
    ];
    var rows = results.map(function(r) {
      var g = r.candidate.analysis.grids;
      return '<tr><td>' + r.rank + '</td><td class="nm">' + e(r.candidate.full) + '</td><td>' + e(familyVerdict(r)) + '</td><td>' + e(term(g.ren.element)) + '</td>' +
        '<td>' + g.zong.number + ' ' + e(g.zong.fortune ? term(g.zong.fortune.glory) : tr('notListed')) + '</td><td>' + e(r.phonetics ? term(r.phonetics.grade) : '—') + '</td>' +
        '<td>' + r.warns.length + '</td><td>' + (r.avgHarmony == null ? '—' : r.avgHarmony + '/100') + '</td></tr>';
    }).join('');
    var details = results.map(function(r) {
      return '<h3>' + r.rank + '. ' + e(r.candidate.full) + '　<small>' + e(familyVerdict(r)) + '</small></h3><ul>' +
        r.warns.map(function(w) { return '<li>⚠️ ' + e(w) + '</li>'; }).join('') +
        r.infos.map(function(w) { return '<li>' + e(w) + '</li>'; }).join('') +
        r.pairs.map(function(p) { return '<li>' + e(p.who) + ' ' + e(p.name) + tr('colon') + (p.score != null ? p.score + '/100' + tr('paren', { x: e(term(p.tier)) }) : tr('noMatch')) + '</li>'; }).join('') +
        '</ul>';
    }).join('');
    var errs = ranked.errors.length ? '<p><small>' + ranked.errors.map(function(x) { return e(x.name) + tr('colon') + e(x.error); }).join('<br>') + '</small></p>' : '';
    return '<!doctype html><html lang="' + (lang() === 'en' ? 'en' : 'zh-Hant') + '"><head><meta charset="utf-8"><title>' + tr('repTitle') + '</title><style>' +
      'body{font-family:"Noto Serif TC","PMingLiU",serif;color:#2c1810;margin:24px;}h1{font-size:22px;margin:0 0 4px;}h2{font-size:16px;margin:18px 0 6px;border-bottom:1px solid #b8860b;padding-bottom:4px;}' +
      'h3{font-size:15px;margin:12px 0 4px;}p,li{font-size:13px;line-height:1.7;margin:2px 0;}ul{margin:0;padding-left:1.4em;}table{border-collapse:collapse;width:100%;font-size:12px;}' +
      'th,td{border:1px solid #c4a870;padding:5px 6px;vertical-align:top;text-align:left;}th{background:#f5ecd8;}.nm{font-size:17px;white-space:nowrap;}small{color:#8b7355;}' +
      '.cond td:first-child{width:7em;background:#faf5eb;}.decide{border:1px dashed #b8860b;padding:10px 12px;min-height:90px;}.foot{margin-top:18px;font-size:11px;color:#8b7355;}' +
      '@page{margin:14mm;}tr,h3,ul{page-break-inside:avoid;}</style></head><body>' +
      '<h1>👨‍👩‍👧 ' + tr('repTitle') + '</h1><p><small>' + e(date) + '</small></p>' +
      '<h2>' + tr('repFamily') + '</h2><table class="cond">' + cond.map(function(c) { return '<tr><td>' + c[0] + '</td><td>' + c[1] + '</td></tr>'; }).join('') + '</table>' +
      '<h2>' + tr('repRank') + '</h2><table><thead><tr>' + tr('repHead').map(function(h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' + rows + '</tbody></table>' + errs +
      '<h2>' + tr('repDetail') + '</h2>' + details +
      '<h2>' + tr('repDecide') + '</h2><div class="decide"><p>' + tr('repDecideHint') + '</p></div>' +
      '<p class="foot">' + tr('repFoot') + '</p></body></html>';
  }

  function renderFamily() {
    var el = document.getElementById('toolFamily');
    if (!el) return;
    var s = state.family;
    var field = function(id, key, value, flex) {
      return '<label class="tool-field"' + (flex ? ' style="flex:1;"' : '') + '><span>' + tr(key) + '</span><input id="' + id + '" class="form-input" placeholder="' + esc(tr(key + 'Ph')) + '" autocomplete="off" value="' + esc(value) + '"></label>';
    };
    var html = '<p class="tool-desc">' + tr('familyDesc') + '</p>';
    html += '<div class="tool-row">' + field('familyParentA', 'parentA', s.parentA, true) + field('familyParentB', 'parentB', s.parentB, true) + '</div>';
    html += field('familyCandidate', 'candidate', s.candidate);
    html += field('familySiblings', 'siblings', s.siblings);
    html += '<div class="tool-row">' + field('familyGeneration', 'generation', s.generation, true) + field('familyAvoid', 'avoid', s.avoid, true) + '</div>';
    html += '<button type="button" class="btn-download-img" id="familyGo">' + tr('familyGo') + '</button><div id="familyResult"></div>';
    el.innerHTML = html;
    if (s.ran) runFamily();
  }

  function familyOpts() {
    return {
      parents: [val('familyParentA').trim(), val('familyParentB').trim()].filter(Boolean),
      siblings: val('familySiblings').split(/[、,，\s]+/).filter(Boolean),
      generation: val('familyGeneration').trim(), avoid: val('familyAvoid').trim()
    };
  }

  function runFamily() {
    state.family.ran = true;
    var out = document.getElementById('familyResult');
    var p = parseFamilyCandidates(val('familyCandidate'));
    var opts = familyOpts();
    opts.candidates = p.list;
    var ranked = rankFamily(opts);
    state.family.ranked = ranked;
    state.family.opts = opts;
    var html = '';
    if (p.skipped.length) html += '<p class="tool-msg">' + esc(tr('famTrim', { names: p.skipped.join('、') })) + '</p>';
    if (!ranked.results.length) {
      out.innerHTML = html + '<p class="tool-msg">' + esc(ranked.errors.length ? ranked.errors[0].name + tr('colon') + ranked.errors[0].error : tr('needCandidate')) + '</p>';
      return;
    }
    if (ranked.results.length > 1) html += '<p class="tool-line"><strong>' + esc(tr('famMulti', { n: ranked.results.length })) + '</strong></p>';
    html += ranked.results.map(familyCard).join('');
    html += ranked.errors.map(function(x) { return '<p class="tool-msg">' + esc(x.name + tr('colon') + x.error) + '</p>'; }).join('');
    html += '<div class="tool-actions"><button type="button" class="btn-action btn-action-secondary" id="familyReport">' + tr('famReport') + '</button></div>';
    html += '<p class="tool-note">' + tr('familyNote') + '</p>';
    out.innerHTML = html;
  }

  function printFamilyReport() {
    var f = state.family;
    if (!f.ranked || !f.ranked.results.length || !window.NamingTools || !window.NamingTools.printHtml) return;
    window.NamingTools.printHtml(familyReportHtml(f.ranked, f.opts, today()));
  }

  function familyCard(r) {
    var g = r.candidate.analysis.grids;
    var html = '<div class="tool-cand"><div class="tool-cand-head"><span class="tool-cand-name">' + (r.rank ? '<small class="tool-meta">' + r.rank + '.</small> ' : '') + esc(r.candidate.full) + '</span>' +
      '<span class="tool-badge">' + familyVerdict(r) + '</span></div>';
    html += '<p class="tool-line">' + tr('familyGrid', {
      el: term(g.ren.element), zong: g.zong.number, glory: g.zong.fortune ? term(g.zong.fortune.glory) : tr('notListed'),
      phon: r.phonetics ? term(r.phonetics.grade) : ''
    }) + '</p>';
    html += r.warns.map(function(w) { return '<p class="tool-line">⚠️ ' + esc(w) + '</p>'; }).join('');
    html += r.infos.map(function(w) { return '<p class="tool-line">・' + esc(w) + '</p>'; }).join('');
    html += r.pairs.map(function(p) {
      return '<p class="tool-line">' + p.who + ' ' + esc(p.name) + ' × ' + esc(r.candidate.full) + tr('colon') + (p.score != null ? p.score + '/100' + tr('paren', { x: term(p.tier) }) : tr('noMatch')) + '</p>';
    }).join('');
    if (r.avgHarmony != null && r.pairs.length > 1) html += '<p class="tool-line tool-meta">' + tr('famAvg', { avg: r.avgHarmony }) + '</p>';
    return html + '</div>';
  }

  // ============ 個人化偏好（由 NamingTools 的偏好面板呼叫） ============

  /** 目前的品牌調性（表單已畫出就讀表單） */
  function getPrefs() {
    return { brandTone: document.getElementById('brandTone') ? val('brandTone') : state.brand.tone };
  }

  /** 帶入偏好：品牌調性、家庭的輩分字與避諱；只覆寫有值的欄位，已跑過的結果重算 */
  function applyPrefs(p) {
    p = p || {};
    readForms();
    if (TONES.indexOf(p.brandTone) >= 0) state.brand.tone = p.brandTone;
    if (p.generation) state.family.generation = p.generation;
    if (p.avoid) state.family.avoid = p.avoid;
    renderBrand();
    renderFamily();
  }

  function toneLabel(k) { return tr('tone.' + k); }

  // ============ 初始化 ============

  /** 把畫面上的輸入讀回 state（切換語言重畫前呼叫） */
  function readForms() {
    if (document.getElementById('trendName')) { state.trend.name = val('trendName'); state.trend.gender = val('trendGender'); }
    if (document.getElementById('brandName')) { state.brand.name = val('brandName'); state.brand.tone = val('brandTone') || 'trust'; }
    if (document.getElementById('brandCompareInput')) state.brand.listText = val('brandCompareInput');
    if (document.querySelector('#toolPersonality .bf')) state.bf.answers = readBfAnswers();
    if (document.getElementById('familyCandidate')) {
      state.family.parentA = val('familyParentA'); state.family.parentB = val('familyParentB');
      state.family.candidate = val('familyCandidate'); state.family.siblings = val('familySiblings');
      state.family.generation = val('familyGeneration'); state.family.avoid = val('familyAvoid');
    }
  }

  var SUMMARY = { toolTrends: 'trendsTitle', toolBrand: 'brandTitle', toolPersonality: 'bfTitle', toolFamily: 'familyTitle' };

  function render() {
    readForms();
    Object.keys(SUMMARY).forEach(function(id) {
      var box = document.getElementById(id);
      var sum = box && box.parentElement && box.parentElement.querySelector('summary');
      if (sum) sum.textContent = tr(SUMMARY[id]);
    });
    renderTrends();
    renderBrand();
    renderPersonality();
    renderFamily();
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('click', function(e) {
      var id = e.target && e.target.id;
      if (id === 'trendGo') runTrend();
      else if (id === 'brandGo') runBrand();
      else if (id === 'brandAdd') addToCompare();
      else if (id === 'brandCompareGo') runCompare();
      else if (id === 'brandCompareClear') { document.getElementById('brandCompareInput').value = ''; state.brand.listText = ''; state.brand.cmpRan = false; state.brand.cmp = null; saveCmpList([]); document.getElementById('brandCompareResult').innerHTML = ''; }
      else if (id === 'brandExport') exportCompare(false);
      else if (id === 'brandCopy') exportCompare(true);
      else if (id === 'bfGo') runPersonality();
      else if (id === 'familyGo') runFamily();
      else if (id === 'familyReport') printFamilyReport();
    });
    document.addEventListener('change', function(e) {
      if (e.target && e.target.id === 'brandTone' && state.brand.ran) runBrand(true);
      if (e.target && e.target.id === 'brandTone' && state.brand.cmpRan) runCompare(true);
    });
    document.addEventListener('keydown', function(e) {
      if (e.key !== 'Enter' || !e.target) return;
      if (e.target.id === 'trendName') runTrend();
      else if (e.target.id === 'brandName') runBrand();
    });
  }

  return {
    render: render,
    trendEnglish: trendEnglish, trendChinese: trendChinese,
    scoreBrand: scoreBrand, brandSlug: brandSlug, checkDomains: checkDomains,
    parseBrandCandidates: parseBrandCandidates, compareBrands: compareBrands, brandDecisionSummary: brandDecisionSummary,
    scoreBigFive: scoreBigFive, FACTORS: FACTORS,
    getPrefs: getPrefs, applyPrefs: applyPrefs, toneLabel: toneLabel,
    checkFamily: checkFamily, parseFamilyCandidates: parseFamilyCandidates, rankFamily: rankFamily, familyReportHtml: familyReportHtml
  };
})();
