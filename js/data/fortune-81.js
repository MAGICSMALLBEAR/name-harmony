/**
 * 81數吉凶資料庫
 * 依姓名學傳統81靈數系統，每個數字對應：
 *   - glory: 吉凶屬性（大吉/吉/中吉/半吉/凶/大凶）
 *   - name: 數理名稱
 *   - description: 簡短解說
 *   - implication: 詳細暗示
 *   - element: 五行歸屬（依尾數：1,2木 3,4火 5,6土 7,8金 9,0水）
 */

window.fortune81 = [
  null, // index 0 不使用

  // 1-10
  {
    number: 1, glory: '大吉', name: '太極之數',
    description: '萬物開泰，生發無窮，利祿亨通，繁榮尊貴。',
    implication: '天地開闢，萬物起始之象。為最大吉祥之暗示。具有創始、領導、獨立、向上之力量。',
    element: '木'
  },
  {
    number: 2, glory: '凶', name: '兩儀之數',
    description: '混沌未定，進退保守，志望難達，內外分離。',
    implication: '分離、猶豫、不安之象。雖有感受性與協調力，但易受外界影響而動搖。宜守不宜攻。',
    element: '木'
  },
  {
    number: 3, glory: '大吉', name: '三才之數',
    description: '根深蒂固，蒸蒸日上，如意吉祥，百事順遂。',
    implication: '富有創造力、表現力與進取心。為人聰明靈敏，處事圓融，名譽地位易得。',
    element: '火'
  },
  {
    number: 4, glory: '凶', name: '四象之數',
    description: '破壞無常，身遭凶變，萬事休止，辛苦不絕。',
    implication: '具備破壞性與不穩定性。雖有才能但多受阻礙，易陷入孤立無援之境。需格外謹慎。',
    element: '火'
  },
  {
    number: 5, glory: '大吉', name: '五行之數',
    description: '五行俱全，循環相生，圓通暢達，福祉無窮。',
    implication: '五行和合、陰陽調和之吉數。為人溫和寬厚，處事穩健，家庭圓滿，事業有成。',
    element: '土'
  },
  {
    number: 6, glory: '大吉', name: '六爻之數',
    description: '天德地祥，福慶弘廣，萬寶朝宗，安富尊榮。',
    implication: '具有天祐地護之吉運。為人正直仁慈，德望兼備，能得貴人相助，一生安泰。',
    element: '土'
  },
  {
    number: 7, glory: '大吉', name: '七政之數',
    description: '剛毅果斷，勇往直前，獨立權威，排除萬難。',
    implication: '具有精力的行動力與決斷力。個性剛強，不畏艱難，具備領導者氣質。',
    element: '金'
  },
  {
    number: 8, glory: '吉', name: '八卦之數',
    description: '八卦相盪，勤勉發展，貫徹志望，成功可期。',
    implication: '具有堅毅不拔的意志力。先難後易之象，只要持之有恆，終可成大業。',
    element: '金'
  },
  {
    number: 9, glory: '凶', name: '九宮之數',
    description: '大氣晚成，興盡凶始，窮乏困苦，病弱短命。',
    implication: '雖有才智，但易陷入孤高自傲。成功之後需防得意忘形，否則易招失敗與病厄。',
    element: '水'
  },
  {
    number: 10, glory: '凶', name: '零暗之數',
    description: '萬事終局，零落暗黑，凶禍頻至，入墓之運。',
    implication: '為萬物終了之象。人生起伏劇烈，易遭挫折打擊。須以退為進，守成為上。',
    element: '水'
  },

  // 11-20
  {
    number: 11, glory: '大吉', name: '春木之數',
    description: '新木逢春，枝葉繁茂，萬物更新，家運隆昌。',
    implication: '為開運發達之吉數。具有創新的才能與旺盛的生命力。如春木萌發，生生不息。',
    element: '木'
  },
  {
    number: 12, glory: '凶', name: '掘井之數',
    description: '薄弱無力，無理伸張，意志不堅，孤獨無援。',
    implication: '如挖井無水，徒勞無功之象。須充實內在，培養實力，不可好高騖遠。',
    element: '木'
  },
  {
    number: 13, glory: '大吉', name: '春陽之數',
    description: '博學多才，智略超凡，處事圓融，善於交際。',
    implication: '具有聰明才智與藝術天分。人緣佳，善於運用智慧與人脈成就事業。',
    element: '火'
  },
  {
    number: 14, glory: '凶', name: '破兆之數',
    description: '家緣淡薄，離鄉背井，孤獨失意，多遭災難。',
    implication: '帶有分離、流離之暗示。須獨立自主，不宜過度依賴他人。宜在外地發展。',
    element: '火'
  },
  {
    number: 15, glory: '大吉', name: '福壽之數',
    description: '福壽圓滿，富貴榮譽，涵養雅量，德高望重。',
    implication: '具有溫厚包容的品格。人生平穩順遂，家庭幸福，受人敬重，晚年安泰。',
    element: '土'
  },
  {
    number: 16, glory: '大吉', name: '厚重之數',
    description: '厚重載德，安富尊榮，眾人望所歸，興家立業。',
    implication: '具有領導統御的氣度與能力。為人誠實可信，能得眾人信賴，成就大業。',
    element: '土'
  },
  {
    number: 17, glory: '吉', name: '剛健之數',
    description: '權威剛強，突破萬難，如願以償，功成名就。',
    implication: '具有堅強的意志與執行力。但需注意剛柔並濟，過剛易折，宜以柔克剛。',
    element: '金'
  },
  {
    number: 18, glory: '大吉', name: '隆昌之數',
    description: '經商得利，事業發達，萬事如意，名利雙收。',
    implication: '具有商業頭腦與執行能力。努力耕耘必得豐收，為名利雙全之吉數。',
    element: '金'
  },
  {
    number: 19, glory: '凶', name: '風雲之數',
    description: '風雲蔽月，辛苦重來，雖有智謀，挫折不絕。',
    implication: '具有才智但運途多舛。宜培養耐心與堅韌，不宜急功近利。中年後運勢好轉。',
    element: '水'
  },
  {
    number: 20, glory: '凶', name: '破滅之數',
    description: '非業破運，災禍頻至，萬事不成，終世不遇。',
    implication: '為最凶之暗示。一生多災多難，宜修身養性、積德行善以化解凶運。',
    element: '水'
  },

  // 21-30
  {
    number: 21, glory: '大吉', name: '明月之數',
    description: '明月光照，質實剛健，獨立權威，首領之格。',
    implication: '如皓月當空，光輝照人。具有卓越的領導力與創造力。男性得此數大吉。',
    element: '木'
  },
  {
    number: 22, glory: '凶', name: '秋草之數',
    description: '秋草逢霜，懷才不遇，憂愁怨苦，事不如意。',
    implication: '如秋草遇霜，生機受阻。雖有才能卻時運不濟，宜以韌性等待時機。',
    element: '木'
  },
  {
    number: 23, glory: '大吉', name: '旭日之數',
    description: '旭日東昇，名顯四方，漸次進展，終成大業。',
    implication: '如旭日東昇，朝氣蓬勃。具有旺盛的領導力與開創力，為首領之格。',
    element: '火'
  },
  {
    number: 24, glory: '大吉', name: '家門之數',
    description: '錦繡前程，須靠自力，白手起家，財源廣進。',
    implication: '具有自力更生的精神與能力。勤勞踏實，可由無到有，建立豐厚家業。',
    element: '火'
  },
  {
    number: 25, glory: '吉', name: '英俊之數',
    description: '資性英敏，剛毅果斷，才能卓越，自成大業。',
    implication: '具有靈敏的才智與獨特的個性。創意豐富，善於開創新局，但偶有過於固執之嫌。',
    element: '土'
  },
  {
    number: 26, glory: '凶', name: '變怪之數',
    description: '變怪奇異，波瀾重疊，英雄豪傑，大成大敗。',
    implication: '為英雄豪傑之格，一生波瀾萬丈。成功與失敗皆可能達到極端。宜中庸處世。',
    element: '土'
  },
  {
    number: 27, glory: '凶', name: '增長之數',
    description: '慾望無止，自我強烈，多受毀謗，終至失敗。',
    implication: '自我意識過強，易與人衝突。須培養謙虛包容之心，否則成功難持久。',
    element: '金'
  },
  {
    number: 28, glory: '凶', name: '闊水之數',
    description: '四海飄泊，離群孤獨，意氣用事，終生浮浪。',
    implication: '具有流浪飄泊之象。個性豪爽但缺乏定性，易因意氣用事而失去機會。',
    element: '金'
  },
  {
    number: 29, glory: '半吉', name: '不平之數',
    description: '謀事難成，半生辛苦，雖有智謀，事與願違。',
    implication: '才智與慾望並存，但時運不濟。女性得此數多為才女，但情感生活多波折。',
    element: '水'
  },
  {
    number: 30, glory: '凶', name: '浮沉之數',
    description: '勝敗無常，絕處逢生，浮沉不定，僥倖成功。',
    implication: '運勢起伏劇烈，吉凶參半。須把握時機，危機中亦可能有轉機。',
    element: '水'
  },

  // 31-40
  {
    number: 31, glory: '大吉', name: '春林之數',
    description: '智勇得志，博得名利，統領眾人，繁榮富貴。',
    implication: '如春林繁茂，生機盎然。具有卓越的領導才能與智慧，為最佳首領格。',
    element: '木'
  },
  {
    number: 32, glory: '大吉', name: '寶馬之數',
    description: '僥倖多望，貴人得助，財帛如裕，繁榮至上。',
    implication: '如獲寶馬金鞍，機遇極佳。善於把握機會，且能得貴人提攜，一躍成名。',
    element: '木'
  },
  {
    number: 33, glory: '大吉', name: '昇天之數',
    description: '旭日昇天，鸞鳳相會，名聞天下，隆昌至極。',
    implication: '為最極之吉數。如旭日昇天，光芒萬丈。才德兼備，名望地位無不達到頂峰。',
    element: '火'
  },
  {
    number: 34, glory: '凶', name: '破家之數',
    description: '破家亡身，見識短小，辛苦遭逢，災禍至極。',
    implication: '為大凶之暗示。人生多災難，宜修身養性、行善積德以化解。不宜擔當重任。',
    element: '火'
  },
  {
    number: 35, glory: '大吉', name: '高樓之數',
    description: '溫和平靜，學藝俱佳，保守平安，成就非凡。',
    implication: '具有溫和細膩的心思與卓越的學習能力。女性得此數尤為優雅賢淑，家庭美滿。',
    element: '土'
  },
  {
    number: 36, glory: '凶', name: '風浪之數',
    description: '風浪不靜，波瀾重疊，傾家蕩產，俠義風度。',
    implication: '一生多風波，但具備俠義心腸。宜從事公益事業，以善行化解凶運。',
    element: '土'
  },
  {
    number: 37, glory: '大吉', name: '猛虎之數',
    description: '權威顯達，熱誠忠信，宜著雅量，終身榮富。',
    implication: '如猛虎下山，威勢不可擋。為人正直忠誠，具有強大的人格魅力與領導力。',
    element: '金'
  },
  {
    number: 38, glory: '凶', name: '磨鐵之數',
    description: '意志薄弱，刻意經營，雖有才能，難望成功。',
    implication: '雖有才華但缺乏持久力。宜從事藝術或專門技術工作，不宜經商創業。',
    element: '金'
  },
  {
    number: 39, glory: '大吉', name: '富貴之數',
    description: '雲開見月，富貴長壽，權力旺盛，富貴榮華。',
    implication: '為富貴榮華之極數。雲開見月，苦盡甘來。女性得此數易為女強人，但感情宜多用心。',
    element: '水'
  },
  {
    number: 40, glory: '凶', name: '退安之數',
    description: '智謀膽力，冒險投機，沉浮不定，退守保身。',
    implication: '具有膽識但運勢不穩。宜穩守不宜冒進，以退為進方為上策。',
    element: '水'
  },

  // 41-50
  {
    number: 41, glory: '大吉', name: '德望之數',
    description: '純陽獨秀，德高望重，和順圓滿，名揚四海。',
    implication: '具有崇高的品德與影響力。為人正直仁慈，能以德服人，成就大事業。',
    element: '木'
  },
  {
    number: 42, glory: '凶', name: '寒蟬之數',
    description: '博識多能，精通世情，但乏氣力，十藝九不成。',
    implication: '多才多藝但博而不精。須專注於一兩項，否則樣樣通樣樣鬆，終無所成。',
    element: '木'
  },
  {
    number: 43, glory: '凶', name: '散財之數',
    description: '散財破產，外祥內苦，盛衰不定，雖有才華。',
    implication: '財運不佳，易因過度散財或投資不慎而陷入困境。須學習理財之道。',
    element: '火'
  },
  {
    number: 44, glory: '凶', name: '荒蕪之數',
    description: '破家亡身，暗藏慘澹，亂世出英雄，盛世為苦勞。',
    implication: '一生多勞苦，宜培養堅韌不拔的精神。亂世中反能脫穎而出。',
    element: '火'
  },
  {
    number: 45, glory: '大吉', name: '順風之數',
    description: '順風揚帆，新生泰和，萬事如意，名揚四海。',
    implication: '如順風之船，事半功倍。頭腦聰明，反應靈敏，善於把握時勢。',
    element: '土'
  },
  {
    number: 46, glory: '凶', name: '載寶之數',
    description: '載寶沉舟，浪裡淘金，歷盡艱難，終得成功。',
    implication: '為先難後成之格。一生須經大難方能得大成就。宜堅定信念，不畏艱難。',
    element: '土'
  },
  {
    number: 47, glory: '大吉', name: '開花之數',
    description: '開花結實，萬象更新，權威顯達，終成大業。',
    implication: '如花開結果，努力終有回報。具有領導才能與創造力，能得眾人擁戴。',
    element: '金'
  },
  {
    number: 48, glory: '大吉', name: '有德之數',
    description: '德智兼備，才望高雅，為人師表，名利雙收。',
    implication: '才德兼備的典範。適合從事教育、顧問、諮詢等行業，能成為眾人楷模。',
    element: '金'
  },
  {
    number: 49, glory: '凶', name: '轉變之數',
    description: '吉凶難分，得而復失，辛苦不斷，轉變無常。',
    implication: '運勢多變，難以預測。須有隨機應變的能力，不宜固守成規。',
    element: '水'
  },
  {
    number: 50, glory: '凶', name: '小舟之數',
    description: '小舟入海，成敗交加，絕處逢生，需防凶險。',
    implication: '如小舟入大海，前程難料。須有冒險精神與危機意識，審慎決策。',
    element: '水'
  },

  // 51-60
  {
    number: 51, glory: '半吉', name: '浮沉之數',
    description: '盛衰交加，波瀾重疊，一盛一衰，終得成功。',
    implication: '人生有起有伏，需以平常心面對。盛時不驕，衰時不餒，方能度過難關。',
    element: '木'
  },
  {
    number: 52, glory: '大吉', name: '達眼之數',
    description: '卓識達理，先見之明，理想實現，名利雙收。',
    implication: '具有卓越的洞見與智慧。能見人所未見，搶得先機，成就非凡事業。',
    element: '木'
  },
  {
    number: 53, glory: '凶', name: '煩惱之數',
    description: '外觀儼然，內實困苦，是非口舌，煩惱不絕。',
    implication: '外表風光內裡辛酸。須注意人際關係，避免口舌是非，保持低調為宜。',
    element: '火'
  },
  {
    number: 54, glory: '凶', name: '石上之數',
    description: '石上栽花，辛苦難成，多難多災，有志難伸。',
    implication: '如石上栽花，難以成功。須付出超乎常人的努力，方可看見成果。',
    element: '火'
  },
  {
    number: 55, glory: '凶', name: '善惡之數',
    description: '外美內苦，外善內惡，和順反逆，虛實難辨。',
    implication: '表裡不一的暗示。須時時反省內心，真誠待人，否則終將失去一切。',
    element: '土'
  },
  {
    number: 56, glory: '凶', name: '浪裡之數',
    description: '浪裡行舟，歷盡艱辛，晚景禎祥，暮年轉佳。',
    implication: '一生勞碌奔波，但晚年運勢轉好。宜有耐心，堅持不懈，終有苦盡甘來之日。',
    element: '土'
  },
  {
    number: 57, glory: '吉', name: '長青之數',
    description: '松柏長青，歲寒不凋，剛強堅毅，終得成功。',
    implication: '如松柏之堅毅，經得起考驗。具有堅強的意志與不屈不撓的精神。',
    element: '金'
  },
  {
    number: 58, glory: '吉', name: '砥柱之數',
    description: '中流砥柱，穩健踏實，先難後易，晚景安泰。',
    implication: '為中流砥柱之人，能承擔重任。先苦後甘，晚年生活安穩無虞。',
    element: '金'
  },
  {
    number: 59, glory: '凶', name: '無恆之數',
    description: '寒風凜冽，耐力不足，半途而廢，難望成功。',
    implication: '缺乏耐心與恆心，做事容易半途而廢。須培養堅持到底的精神。',
    element: '水'
  },
  {
    number: 60, glory: '凶', name: '晦冥之數',
    description: '黑暗無光，心迷意亂，志向難定，終至失敗。',
    implication: '內心混亂，方向不明。須先安定心神，找到人生方向，不可盲目行動。',
    element: '水'
  },

  // 61-70
  {
    number: 61, glory: '大吉', name: '牡丹之數',
    description: '牡丹富貴，名利雙收，天賦幸運，繁榮發達。',
    implication: '如牡丹盛開，富貴榮華。具有卓越的才能與好運，為人生勝利組。',
    element: '木'
  },
  {
    number: 62, glory: '凶', name: '衰敗之數',
    description: '衰敗不振，誠信缺乏，內外不合，萬事難成。',
    implication: '缺乏誠信基礎，內外關係不佳。須重建信用，改善人際關係。',
    element: '木'
  },
  {
    number: 63, glory: '大吉', name: '繁榮之數',
    description: '萬物化育，繁榮之象，賢能有德，終成大業。',
    implication: '具有化育萬物的能量。為人賢德，能成就利人利己的大事業。',
    element: '火'
  },
  {
    number: 64, glory: '凶', name: '骨肉之數',
    description: '骨肉分離，親情淡薄，孤獨無援，多遭苦難。',
    implication: '家庭運不佳，親情關係淡薄。須學習獨立自主，同時修復家庭關係。',
    element: '火'
  },
  {
    number: 65, glory: '大吉', name: '圓滿之數',
    description: '富貴長壽，家門隆昌，事事如意，福祿雙全。',
    implication: '為最圓滿之吉數。一生順遂，家庭美滿，事業有成，名利雙收。',
    element: '土'
  },
  {
    number: 66, glory: '凶', name: '進退之數',
    description: '進退失據，內外不和，信用缺乏，終至失敗。',
    implication: '進退兩難之象。須重新建立信用與人際關係，不可急功近利。',
    element: '土'
  },
  {
    number: 67, glory: '大吉', name: '通達之數',
    description: '天賜吉祥，萬事如意，獨享天福，富貴自來。',
    implication: '為天助自助之吉數。具有天然的幸運與魅力，能吸引貴人與機會。',
    element: '金'
  },
  {
    number: 68, glory: '吉', name: '發明之數',
    description: '思考縝密，頭腦清晰，發明創新，名利雙收。',
    implication: '具有卓越的創造力與思考力。適合從事科技、研發、學術等領域。',
    element: '金'
  },
  {
    number: 69, glory: '凶', name: '病苦之數',
    description: '病弱短命，窮困苦勞，富貴難得，一生辛苦。',
    implication: '健康運勢不佳，須格外注重養生保健。勞碌一生，須學習放鬆身心。',
    element: '水'
  },
  {
    number: 70, glory: '凶', name: '滅亡之數',
    description: '廢疾滅亡，淒涼悲慘，妻子傷亡，孤獨終生。',
    implication: '為極凶之暗示。須格外小心謹慎，多行善積德以化解凶運。',
    element: '水'
  },

  // 71-81
  {
    number: 71, glory: '凶', name: '養子之數',
    description: '養子承家，辛苦備嘗，忍受勞苦，積蓄無多。',
    implication: '一生辛勞但收穫有限。須量入為出，審慎理財，不宜投機。',
    element: '木'
  },
  {
    number: 72, glory: '凶', name: '勞苦之數',
    description: '勞苦相伴，有志難伸，心身過勞，一生不遇。',
    implication: '勞碌命格。宜降低慾望，學習知足常樂，避免身心過度耗損。',
    element: '木'
  },
  {
    number: 73, glory: '半吉', name: '無勇之數',
    description: '志大才疏，勇氣不足，受人排擠，有志難成。',
    implication: '志氣高昂但行動力不足。須培養勇氣與執行力，方能將理想付諸實現。',
    element: '火'
  },
  {
    number: 74, glory: '凶', name: '殘花之數',
    description: '殘花敗柳，運氣不佳，多逆多難，終身不遂。',
    implication: '運氣不佳，做事多阻礙。宜保守行事，不適合冒險創業。',
    element: '火'
  },
  {
    number: 75, glory: '凶', name: '退守之數',
    description: '退守保身，先難後易，晚景安泰，中年前勞。',
    implication: '中年以前較為辛苦，宜退守待時。晚年運勢轉好，生活安定。',
    element: '土'
  },
  {
    number: 76, glory: '凶', name: '離散之數',
    description: '離散不安，骨肉分離，內外不和，傾家蕩產。',
    implication: '家庭關係緊張，易有分離之象。須積極修復感情，重建家庭和諧。',
    element: '土'
  },
  {
    number: 77, glory: '凶', name: '守成之數',
    description: '家庭不睦，半吉半凶，先甘後苦，守成為宜。',
    implication: '前半生尚可，後半生宜守不宜攻。家庭關係需多加經營。',
    element: '金'
  },
  {
    number: 78, glory: '凶', name: '秋景之數',
    description: '晚年淒涼，無子送終，孤獨寂寞，無依無靠。',
    implication: '晚年運勢較差。宜提前做好養老規劃，建立良好的人際關係網絡。',
    element: '金'
  },
  {
    number: 79, glory: '凶', name: '墮落之數',
    description: '墮落無能，信用掃地，失去方向，一事無成。',
    implication: '須避免自暴自棄。重建自信與信用是當務之急，不可放任沉淪。',
    element: '水'
  },
  {
    number: 80, glory: '凶', name: '遁世之數',
    description: '遁世離俗，隱居山林，與世無爭，孤獨以終。',
    implication: '具有隱士般的性格。不適合世俗的競爭，宜從事獨立的藝術或研究工作。',
    element: '水'
  },
  {
    number: 81, glory: '大吉', name: '歸元之數',
    description: '萬物歸元，還本還原，最極之數，繁榮發達。',
    implication: '為81數之極，回到本源。具有最圓滿的運勢，萬事萬物歸於和諧。為還元之吉數。',
    element: '木'
  }
];
