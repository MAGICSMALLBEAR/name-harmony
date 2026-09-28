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
        return '最流行：' + p.decade + ' 年代第 ' + p.rank + ' 名；' + p.latestYear + ' 年：' + (p.latest ? '第 ' + p.latest + ' 名' : '不在前 1,000 名') +
          (p.top2025 ? '；2025 年第 ' + p.top2025 + ' 名' : '');
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
      lbl: { length: '長度', consistency: '一致性', easy: '好唸', homophone: '諧音', tone: '聲調', awkward: '拗口', slang: '聯想', mandarin: '華語使用者', digits: '數字' },
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
      candidate: '候選完整姓名', candidatePh: '例如 王怡蘊',
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
      blocked: '不能使用', warnCount: function(p) { return '需留意 ' + p.n + ' 項'; }, familyOk: '家庭規劃',
      familyGrid: function(p) { return '人格五行：' + p.el + '；總格：' + p.zong + ' ' + p.glory + (p.phon ? '；音韻：' + p.phon : ''); },
      notListed: '未收錄', noMatch: '無法比對',
      familyNote: '此工具協助比較命名的一致性與辨識度，不取代家人的偏好、文化傳承或戶籍登記規定。',
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
        return 'Peak: #' + p.rank + ' in the ' + p.decade + 's; ' + p.latestYear + ': ' + (p.latest ? '#' + p.latest : 'not in top 1,000') +
          (p.top2025 ? '; 2025: #' + p.top2025 : '');
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
      lbl: { length: 'Length', consistency: 'Consistency', easy: 'Easy to say', homophone: 'Homophones', tone: 'Tones', awkward: 'Tongue-twister', slang: 'Associations', mandarin: 'For Mandarin speakers', digits: 'Digits' },
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
      candidate: 'Candidate full name', candidatePh: 'e.g. 王怡蘊',
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
      blocked: 'Cannot use', warnCount: function(p) { return p.n + ' thing' + (p.n === 1 ? '' : 's') + ' to note'; }, familyOk: 'Family plan',
      familyGrid: function(p) { return 'Personality element: ' + p.el + '; total grid: ' + p.zong + ' ' + p.glory + (p.phon ? '; phonetics: ' + p.phon : ''); },
      notListed: 'not listed', noMatch: 'cannot compare',
      familyNote: 'This tool compares consistency and distinctiveness only; it does not replace family preferences, cultural traditions or household registration rules.',
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
   * @return { found:false } 或 { name, sex, decades:[{ decade, rank }], latest, peak, trend, era, top2025 }
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
    var top25 = function(s) { var i = T.top2025[s].map(function(x) { return x.toLowerCase(); }).indexOf(key); return i >= 0 ? i + 1 : 0; };
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
      latestYear: T.latest, peak: peak, trend: trend, era: era, top2025: top25(best.sex)
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
    brand: { name: '', tone: 'trust', ran: false, domains: null },
    bf: { answers: [], ran: false },
    family: { parentA: '', parentB: '', candidate: '', siblings: '', ran: false }
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
    html += '<p class="tool-line">' + tr('peakLine', { decade: r.peak.decade, rank: r.peak.rank, latestYear: r.latestYear, latest: r.latest, top2025: r.top2025 }) + '</p>';
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
   * @return { name, kind: 'zh'|'en'|'mixed', score, items: [{ key, label, pts, note }], slug }
   */
  function scoreBrand(name) {
    name = String(name || '').trim();
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

    var score = 50 + items.reduce(function(s, x) { return s + x.pts; }, 0);
    return { name: name, kind: kind, score: Math.max(0, Math.min(100, score)), items: items, slug: brandSlug(name) };
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
    el.innerHTML = html;
    if (s.ran) runBrand(true);
  }

  function domainRows(list) {
    return list.map(function(d) {
      return '<span class="tool-grid domain-' + d.status + '">' + esc(d.domain) + tr('colon') + tr('domain.' + d.status) + '</span>';
    }).join('');
  }

  /** @param reuse 重畫（切換語言）時沿用已查到的網域結果，不重新查詢 */
  function runBrand(reuse) {
    var out = document.getElementById('brandResult');
    var r = scoreBrand(val('brandName'));
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
      (r.slug ? '<a class="btn-action btn-action-secondary" target="_blank" rel="noopener" href="https://www.twnic.tw/whois_n.php?query=' + encodeURIComponent(r.slug + '.com.tw') + '">' + tr('twLink') + '</a>' : '') + '</div>';
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
    return { candidate: cand, blocked: blocked, warns: warns, infos: infos, pairs: pairs, phonetics: ph };
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
    html += '<button type="button" class="btn-download-img" id="familyGo">' + tr('familyGo') + '</button><div id="familyResult"></div>';
    el.innerHTML = html;
    if (s.ran) runFamily();
  }

  function runFamily() {
    state.family.ran = true;
    var r = checkFamily({
      candidate: val('familyCandidate'),
      parents: [val('familyParentA').trim(), val('familyParentB').trim()].filter(Boolean),
      siblings: val('familySiblings').split(/[、,，\s]+/).filter(Boolean)
    });
    var out = document.getElementById('familyResult');
    if (r.error) { out.innerHTML = '<p class="tool-msg">' + esc(r.error) + '</p>'; return; }
    var g = r.candidate.analysis.grids;
    var html = '<div class="tool-cand"><div class="tool-cand-head"><span class="tool-cand-name">' + esc(r.candidate.full) + '</span>' +
      '<span class="tool-badge">' + (r.blocked ? tr('blocked') : r.warns.length ? tr('warnCount', { n: r.warns.length }) : tr('familyOk')) + '</span></div>';
    html += '<p class="tool-line">' + tr('familyGrid', {
      el: term(g.ren.element), zong: g.zong.number, glory: g.zong.fortune ? term(g.zong.fortune.glory) : tr('notListed'),
      phon: r.phonetics ? term(r.phonetics.grade) : ''
    }) + '</p>';
    html += r.warns.map(function(w) { return '<p class="tool-line">⚠️ ' + esc(w) + '</p>'; }).join('');
    html += r.infos.map(function(w) { return '<p class="tool-line">・' + esc(w) + '</p>'; }).join('');
    html += r.pairs.map(function(p) {
      return '<p class="tool-line">' + p.who + ' ' + esc(p.name) + ' × ' + esc(r.candidate.full) + tr('colon') + (p.score != null ? p.score + '/100' + tr('paren', { x: term(p.tier) }) : tr('noMatch')) + '</p>';
    }).join('');
    html += '<p class="tool-note">' + tr('familyNote') + '</p></div>';
    out.innerHTML = html;
  }

  // ============ 初始化 ============

  /** 把畫面上的輸入讀回 state（切換語言重畫前呼叫） */
  function readForms() {
    if (document.getElementById('trendName')) { state.trend.name = val('trendName'); state.trend.gender = val('trendGender'); }
    if (document.getElementById('brandName')) { state.brand.name = val('brandName'); state.brand.tone = val('brandTone') || 'trust'; }
    if (document.querySelector('#toolPersonality .bf')) state.bf.answers = readBfAnswers();
    if (document.getElementById('familyCandidate')) {
      state.family.parentA = val('familyParentA'); state.family.parentB = val('familyParentB');
      state.family.candidate = val('familyCandidate'); state.family.siblings = val('familySiblings');
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
      else if (id === 'bfGo') runPersonality();
      else if (id === 'familyGo') runFamily();
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
    scoreBigFive: scoreBigFive, FACTORS: FACTORS,
    checkFamily: checkFamily
  };
})();
