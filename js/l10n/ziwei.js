/**
 * 英文字典：紫微斗數
 * 星曜、宮位、亮度、四化等名稱放在命名空間 zw（用 L10N.tn('zw', 名) 查），避免和占星的「火星」「太陽」撞名
 * 星曜用拼音（英文紫微文獻的慣例），宮位用意譯
 */
(function() {
  var zw = {
    // 十四主星
    '紫微': 'Zi Wei', '天機': 'Tian Ji', '太陽': 'Tai Yang', '武曲': 'Wu Qu', '天同': 'Tian Tong', '廉貞': 'Lian Zhen', '天府': 'Tian Fu',
    '太陰': 'Tai Yin', '貪狼': 'Tan Lang', '巨門': 'Ju Men', '天相': 'Tian Xiang', '天梁': 'Tian Liang', '七殺': 'Qi Sha', '破軍': 'Po Jun',
    // 六吉、祿馬、六煞
    '左輔': 'Zuo Fu', '右弼': 'You Bi', '文昌': 'Wen Chang', '文曲': 'Wen Qu', '天魁': 'Tian Kui', '天鉞': 'Tian Yue',
    '祿存': 'Lu Cun', '天馬': 'Tian Ma',
    '擎羊': 'Qing Yang', '陀羅': 'Tuo Luo', '火星': 'Huo Xing', '鈴星': 'Ling Xing', '地空': 'Di Kong', '地劫': 'Di Jie',
    // 雜曜
    '紅鸞': 'Hong Luan', '天喜': 'Tian Xi', '天姚': 'Tian Yao', '天刑': 'Tian Xing', '解神': 'Jie Shen', '三台': 'San Tai', '八座': 'Ba Zuo',
    '恩光': 'En Guang', '天貴': 'Tian Gui', '龍池': 'Long Chi', '鳳閣': 'Feng Ge', '天才': 'Tian Cai', '天壽': 'Tian Shou', '台輔': 'Tai Fu',
    '封誥': 'Feng Gao', '天德': 'Tian De', '月德': 'Yue De', '天空': 'Tian Kong', '旬空': 'Xun Kong', '孤辰': 'Gu Chen', '寡宿': 'Gua Su',
    '天哭': 'Tian Ku', '天虛': 'Tian Xu', '天使': 'Tian Shi', '天傷': 'Tian Shang', '年解': 'Nian Jie', '天官': 'Tian Guan', '天福': 'Tian Fu (blessing)',
    '天廚': 'Tian Chu', '天月': 'Tian Yue (moon)', '天巫': 'Tian Wu', '陰煞': 'Yin Sha', '截路': 'Jie Lu', '空亡': 'Kong Wang', '華蓋': 'Hua Gai',
    '咸池': 'Xian Chi', '蜚廉': 'Fei Lian', '破碎': 'Po Sui', '大耗': 'Da Hao', '龍德': 'Long De',
    // 博士十二神、歲前十二神、將前十二神
    '博士': 'Bo Shi', '力士': 'Li Shi', '青龍': 'Qing Long', '小耗': 'Xiao Hao', '將軍': 'Jiang Jun', '奏書': 'Zou Shu',
    '飛廉': 'Fei Lian', '喜神': 'Xi Shen', '病符': 'Bing Fu', '伏兵': 'Fu Bing', '官府': 'Guan Fu',
    '歲建': 'Sui Jian', '晦氣': 'Hui Qi', '喪門': 'Sang Men', '貫索': 'Guan Suo', '官符': 'Guan Fu (charge)', '歲破': 'Sui Po',
    '白虎': 'Bai Hu', '弔客': 'Diao Ke',
    '將星': 'Jiang Xing', '攀鞍': 'Pan An', '歲驛': 'Sui Yi', '息神': 'Xi Shen (rest)', '劫煞': 'Jie Sha', '災煞': 'Zai Sha',
    '天煞': 'Tian Sha', '指背': 'Zhi Bei', '月煞': 'Yue Sha', '亡神': 'Wang Shen',
    // 十二長生
    '長生': 'Birth', '沐浴': 'Bath', '冠帶': 'Cap & Belt', '臨官': 'Official', '帝旺': 'Prime', '衰': 'Decline',
    '病': 'Illness', '死': 'Death', '墓': 'Tomb', '絕': 'Extinction', '胎': 'Conception', '養': 'Nurture',
    // 宮位
    '命宮': 'Life Palace', '兄弟宮': 'Siblings Palace', '夫妻宮': 'Spouse Palace', '子女宮': 'Children Palace', '財帛宮': 'Wealth Palace',
    '疾厄宮': 'Health Palace', '遷移宮': 'Travel Palace', '交友宮': 'Friends Palace', '官祿宮': 'Career Palace', '田宅宮': 'Property Palace',
    '福德宮': 'Fortune Palace', '父母宮': 'Parents Palace',
    // 亮度
    '廟': 'Temple', '旺': 'Prosperous', '得': 'Favorable', '利': 'Beneficial', '平': 'Neutral', '不': 'Weak', '陷': 'Fallen',
    // 四化
    '化祿': 'Hua Lu', '化權': 'Hua Quan', '化科': 'Hua Ke', '化忌': 'Hua Ji'
  };
  // 流曜：流（流年）、月（流月）、日（流日）＋ 魁鉞昌曲祿羊陀鸞喜馬
  var FLOW_PREFIX = { '流': 'Yearly', '月': 'Monthly', '日': 'Daily' };
  var FLOW_BASE = { '魁': 'Kui', '鉞': 'Yue', '昌': 'Chang', '曲': 'Qu', '祿': 'Lu', '羊': 'Yang', '陀': 'Tuo', '鸞': 'Luan', '喜': 'Xi', '馬': 'Ma' };
  Object.keys(FLOW_PREFIX).forEach(function(p) {
    Object.keys(FLOW_BASE).forEach(function(b) { zw[p + b] = FLOW_PREFIX[p] + ' ' + FLOW_BASE[b]; });
  });
  var ns = {};
  Object.keys(zw).forEach(function(k) { ns['zw:' + k] = zw[k]; });
  L10N.add(ns);
})();

L10N.add({
  // 四化的意義
  '增益、順遂、財源與人緣的加持，四化中最吉，代表該宮位之事容易水到渠成。': 'Gain, ease, and a boost to money and popularity — the most auspicious transformation; matters of this palace fall into place easily.',
  '掌握主導權、企圖心與行動力增強，能有所成就，但也容易流於強勢或壓力過大。': 'Taking control, with stronger ambition and drive; it brings achievement, but can tip into dominance or heavy pressure.',
  '帶來名聲、貴人、考運與文書上的順利，是較溫和的吉象，利於學業與名譽。': 'Brings reputation, helpful people, luck in exams and smooth paperwork — a gentle blessing that favors study and reputation.',
  '容易出現糾結、阻礙、反覆或需要特別留意的課題，是四化中最需謹慎面對的一化。': 'Tends to bring knots, obstacles, back-and-forth or issues that need special care — the transformation to handle most carefully.',

  // 十四主星
  '帝星，尊貴權威。有領導力、自尊心強、追求卓越。適合管理職、政治、高階主管。': 'The emperor star — noble and authoritative. A leader with strong self-respect who strives for excellence. Suited to management, politics and senior roles.',
  '智慧之星，善於策劃與思考。聰明靈活、適應力強。適合顧問、策劃、科技業。': 'The star of wisdom, good at planning and thinking. Clever, flexible and adaptable. Suited to consulting, planning and technology.',
  '光明熱情，慷慨大方。外向積極、有正義感。適合公眾人物、業務、外交。': 'Bright and warm, generous. Outgoing, proactive and principled. Suited to public figures, sales and diplomacy.',
  '財星，果斷剛毅。理財能力強、執行力高。適合金融、軍警、運動。': 'The wealth star — decisive and resolute. Strong with money and execution. Suited to finance, the military or police, and sport.',
  '福星，溫和善良。知足常樂、人緣佳。適合服務業、藝術、教育。': 'The blessing star — gentle and kind. Content, cheerful and well liked. Suited to service, the arts and education.',
  '桃花星兼權星。有魅力、善交際但有時衝動。適合公關、設計、娛樂。': 'A romance star that is also a power star. Charming and sociable, sometimes impulsive. Suited to PR, design and entertainment.',
  '庫星，穩重包容。善於理財與管理。適合銀行、不動產、倉儲物流。': 'The treasury star — steady and accepting. Good at finance and management. Suited to banking, real estate and logistics.',
  '陰柔之星，細膩敏感。有藝術氣質、重視家庭。適合文學、設計、房產。': 'A soft, yin star — delicate and sensitive. Artistic and family-minded. Suited to literature, design and property.',
  '桃花星，多才多藝。有魅力、善社交但有時貪心。適合演藝、行銷、外交。': 'The romance star — multi-talented. Charming and sociable, sometimes greedy. Suited to performing, marketing and diplomacy.',
  '暗星，口才犀利。有辯才、善分析但有時多疑。適合律師、評論、研究。': 'The dark star — sharp-tongued. Persuasive and analytical, sometimes suspicious. Suited to law, criticism and research.',
  '印星，溫和善良。善於輔佐與服務。適合秘書、醫療、公務員。': 'The seal star — gentle and kind. Good at supporting and serving. Suited to secretarial work, healthcare and civil service.',
  '壽星，正直穩重。有長者風範、樂於助人。適合醫護、教育、社福。': 'The longevity star — upright and steady. Elder-like and helpful. Suited to healthcare, education and social welfare.',
  '將星，剛強果斷。有開創力但有時孤僻。適合軍警、創業、競技。': 'The general star — strong and decisive. Pioneering but sometimes aloof. Suited to the military or police, startups and competition.',
  '破耗之星，敢於破壞重建。有改革精神但有時衝動。適合改革者、冒險家。': 'The star of breaking and spending — dares to tear down and rebuild. Reforming but sometimes impulsive. Suited to reformers and adventurers.',

  // 十二宮
  '代表自我、性格、天賦與命運主軸。': 'Represents the self, character, talents and the main thread of destiny.',
  '代表手足關係、同儕互動。': 'Represents siblings and relationships with peers.',
  '代表婚姻、伴侶關係與感情觀。': 'Represents marriage, partnership and views on love.',
  '代表子女、創作、享樂。': 'Represents children, creativity and pleasure.',
  '代表財運、理財能力與金錢觀。': 'Represents financial luck, money management and attitudes to money.',
  '代表健康、體質與災厄。': 'Represents health, constitution and misfortune.',
  '代表外出運、變動與旅行。': 'Represents luck away from home, change and travel.',
  '代表人際關係、朋友與下屬。': 'Represents relationships, friends and subordinates.',
  '代表事業、工作與社會地位。': 'Represents career, work and social standing.',
  '代表家庭、房產與居住環境。': 'Represents home, property and living environment.',
  '代表精神生活、福氣與享受。': 'Represents inner life, blessings and enjoyment.',
  '代表父母、長輩與上司關係。': 'Represents parents, elders and superiors.',

  // 命宮與姓名
  '同氣相求': 'kindred phases', '相生吉配': 'a generating, auspicious match', '被生有貴人': 'generated — helpful people appear',
  '相剋需調和': 'controlling — needs balancing', '被剋有壓力': 'controlled — under pressure', '一般': 'ordinary',

  // 主星組合：格局名
  '紫微獨坐': 'Zi Wei alone', '天機獨坐': 'Tian Ji alone', '太陽獨坐': 'Tai Yang alone', '武曲獨坐': 'Wu Qu alone',
  '天同獨坐': 'Tian Tong alone', '廉貞獨坐': 'Lian Zhen alone', '天府獨坐': 'Tian Fu alone', '太陰獨坐': 'Tai Yin alone',
  '貪狼獨坐': 'Tan Lang alone', '巨門獨坐': 'Ju Men alone', '天相獨坐': 'Tian Xiang alone', '天梁獨坐': 'Tian Liang alone',
  '七殺獨坐': 'Qi Sha alone', '破軍獨坐': 'Po Jun alone',
  '紫府同宮': 'Zi Wei with Tian Fu', '紫相同宮': 'Zi Wei with Tian Xiang', '紫殺同宮': 'Zi Wei with Qi Sha', '紫破同宮': 'Zi Wei with Po Jun',
  '紫貪同宮': 'Zi Wei with Tan Lang', '機陰同宮': 'Tian Ji with Tai Yin', '機巨同宮': 'Tian Ji with Ju Men', '機梁同宮': 'Tian Ji with Tian Liang',
  '日月同宮': 'Tai Yang with Tai Yin', '陽巨同宮': 'Tai Yang with Ju Men', '陽梁同宮': 'Tai Yang with Tian Liang',
  '武府同宮': 'Wu Qu with Tian Fu', '武相同宮': 'Wu Qu with Tian Xiang', '武殺同宮': 'Wu Qu with Qi Sha', '武破同宮': 'Wu Qu with Po Jun',
  '武貪同宮': 'Wu Qu with Tan Lang', '同陰同宮': 'Tian Tong with Tai Yin', '同巨同宮': 'Tian Tong with Ju Men', '同梁同宮': 'Tian Tong with Tian Liang',
  '廉府同宮': 'Lian Zhen with Tian Fu', '廉相同宮': 'Lian Zhen with Tian Xiang', '廉殺同宮': 'Lian Zhen with Qi Sha', '廉破同宮': 'Lian Zhen with Po Jun',
  '廉貪同宮': 'Lian Zhen with Tan Lang',

  // 主星組合：他宮重點
  '有主導力與格局，重視品質與面子': 'commanding and broad-minded, values quality and face',
  '變動多、重思考與規劃': 'much change, emphasis on thinking and planning',
  '主動付出、重名聲，貴人多為男性或長輩': 'gives freely, values reputation; helpers are often men or elders',
  '重實際與財務，行事果決': 'practical and money-minded, decisive',
  '和諧、享受，先勞後逸': 'harmony and enjoyment; hard work first, ease later',
  '魅力與是非並存，重原則與分寸': 'charm alongside disputes; principled and measured',
  '穩定、有庫存，善於守成': 'stable, with reserves; good at preserving',
  '細膩、重積蓄，與女性或母親緣分深': 'delicate and saving-minded; close ties with women or the mother',
  '多才、交際廣、慾望強': 'multi-talented, wide social circle, strong desires',
  '口舌與分析，容易有是非或誤會': 'words and analysis; prone to disputes or misunderstandings',
  '協調、服務，重信用與形象': 'coordination and service; values trust and image',
  '庇蔭、化解，常有長輩或貴人照顧': 'protection and resolution; often cared for by elders or benefactors',
  '變動大、衝勁強，先苦後成': 'big changes and strong drive; hardship first, success later',
  '破舊立新，變動與消耗較大': 'out with the old, in with the new; much change and spending',
  '格局大、資源豐厚，穩中求進': 'large scope and ample resources; steady progress',
  '重規矩與形象，善於協調': 'values rules and image, good at coordinating',
  '化殺為權，有魄力也有壓力': 'turning force into authority — bold, but under pressure',
  '開創改革，變動中求突破': 'pioneering and reforming, seeking breakthroughs through change',
  '魅力與享受，桃花人緣旺': 'charm and enjoyment, very popular in love',
  '靈巧細膩、多變動，重企劃': 'nimble and delicate, much change, focused on planning',
  '分析與口才，需防是非反覆': 'analysis and eloquence; beware disputes and reversals',
  '謀略與庇蔭，善於給建議': 'strategy and protection; good at giving advice',
  '陰陽兼具，名利並重但易反覆': 'both yin and yang; seeks both fame and gain but wavers',
  '以口揚名，是非需光明化解': 'gains fame through speech; resolve disputes openly',
  '重名聲、有貴人，利考試與公職': 'values reputation, has benefactors; favors exams and public office',
  '財庫豐厚，善於守財': 'rich reserves, good at keeping wealth',
  '重信用與責任，財務穩健': 'values trust and responsibility; sound finances',
  '以拚搏求財，剛強有衝勁': 'earns by striving; strong and driven',
  '財來財去，敢於冒險投資': 'money comes and goes; willing to take investment risks',
  '企圖心強，財運晚發': 'strong ambition; wealth comes later in life',
  '溫柔享受，感情豐富': 'gentle and pleasure-loving, emotionally rich',
  '外和內憂，需防誤會與口舌': 'calm outside, worried inside; beware misunderstandings and gossip',
  '福蔭深厚，樂於助人': 'deeply blessed and protected, glad to help others',
  '精明穩重，善於經營': 'shrewd and steady, good at running things',
  '重原則與規範，公正負責': 'principled and rule-minded; fair and responsible',
  '奮鬥打拚，衝勁與風險並存': 'striving hard; drive and risk go together',
  '大破大立，變動與冒險': 'great destruction and great building; change and risk',
  '桃花與慾望旺，需懂節制': 'strong romance and desire; needs restraint',

  // 主星組合：命宮解讀
  '帝星獨守，自尊心強、有主見，天生帶有領導氣質，重視面子與原則。做事希望由自己主導，適合在組織中擔任決策角色；需要留意耳根子軟、喜歡聽好話，身邊有得力助手時最能發揮。':
    'The emperor star stands alone: proud and opinionated, a born leader who values face and principle. You like to be in charge and suit decision-making roles in an organization. Watch out for being swayed by flattery — you shine brightest with capable helpers at your side.',
  '反應快、點子多，善於分析與規劃，對新事物充滿好奇。擅長動腦勝過體力，適合策劃、顧問、技術研發；缺點是想得多、容易多變，定下方向後持之以恆，成就會更穩固。':
    'Quick, full of ideas, good at analysis and planning, and curious about everything new. Better with the mind than the body — suited to planning, consulting and R&D. The downside is overthinking and changeability; commit to a direction and your achievements will be more solid.',
  '熱情開朗、樂於付出，有正義感與公眾魅力，喜歡照顧別人。適合面向群眾的工作，名聲往往比實利來得快；要留意付出過多而忽略自己，量力而為才能長久發光。':
    'Warm, cheerful and giving, with a sense of justice and public charm; you like looking after others. Suited to public-facing work — reputation often comes faster than material gain. Don\'t give so much that you neglect yourself; pace yourself to shine for longer.',
  '財星坐命，個性剛毅果決、講求效率，對金錢與數字敏感，執行力強。適合財務、金融、技術與需要決斷的工作；說話直接、不喜拖泥帶水，在人際上多一分柔軟會更順。':
    'The wealth star in the Life Palace: resolute, efficient, sharp with money and numbers, strong at execution. Suited to finance, technical work and roles that need decisiveness. You speak bluntly and dislike dithering — a little more softness with people makes things smoother.',
  '福星坐命，性情溫和、知足常樂，人緣好、懂得享受生活。不喜歡衝突與壓力，常有「先苦後甜」或「白手成家」的歷程；要避免過於安逸、缺乏衝勁，給自己設定目標會更有成就。':
    'The blessing star in the Life Palace: gentle, content, well liked and good at enjoying life. You avoid conflict and pressure, and life often goes from bitter to sweet or from nothing to something. Avoid getting too comfortable — setting goals brings greater achievement.',
  '次桃花星，外表有魅力、心思細密，是非分明、好勝心強。能力多元，適合公關、設計、法政或需要交際手腕的工作；情緒起伏時較衝動，學會收斂鋒芒、把好勝心用在正途，發展更好。':
    'A secondary romance star: attractive, meticulous, clear on right and wrong, and competitive. Versatile — suited to PR, design, law and politics, or work that needs social skill. You can be impulsive when emotions run high; temper your edge and channel your competitiveness well.',
  '庫星坐命，穩重寬厚、保守謹慎，善於守成與理財，給人可靠的感覺。適合管理、財務、行政與資產相關工作；優點是穩，缺點是開創力稍弱，偶爾主動出擊能打開新局面。':
    'The treasury star in the Life Palace: steady, generous, cautious, good at preserving and managing money, and reassuringly reliable. Suited to management, finance, administration and assets. Your strength is stability, your weakness a lack of initiative — occasionally taking the lead opens new doors.',
  '溫柔細膩、感受力強，重視家庭與安全感，有藝術與審美天分。財運偏向累積型，適合房產、設計、文藝、幕僚工作；情緒容易受環境影響，給自己安靜的空間能恢復能量。':
    'Gentle, delicate and perceptive, family-minded and security-seeking, with artistic taste. Wealth builds up gradually — suited to property, design, the arts and advisory roles. Your mood is easily affected by surroundings; quiet space helps you recharge.',
  '多才多藝、交際手腕好，慾望與企圖心強，對新鮮事物興趣廣泛。適合業務、演藝、行銷、娛樂與宗教玄學；桃花與應酬多，專注在一兩個領域深耕，才華更能轉化成成就。':
    'Multi-talented and socially skilled, with strong desires and ambition and wide interests. Suited to sales, performing, marketing, entertainment and the esoteric. Romance and socializing abound; focusing deeply on one or two fields turns talent into achievement.',
  '口才好、分析力強，善於發現問題，有研究精神。適合以口為業的工作，如律師、教師、業務、評論；容易因說話太直或多疑引起是非，先聆聽再表達，能化口舌為影響力。':
    'Articulate and analytical, quick to spot problems, with a researcher\'s spirit. Suited to work that lives by speaking — law, teaching, sales, commentary. Bluntness or suspicion can stir disputes; listen first, then speak, and words become influence.',
  '印星坐命，端莊正直、重承諾，有服務與協調的天分，是可靠的輔佐人才。適合秘書、公職、醫療、行政；容易受身邊人影響而左右搖擺，找到值得追隨的人或理念時表現最好。':
    'The seal star in the Life Palace: dignified, upright, true to your word, with a gift for service and coordination — a reliable right hand. Suited to secretarial work, public service, healthcare and administration. You can be swayed by those around you; you do best when you find a person or cause worth following.',
  '蔭星坐命，成熟穩重、有長者風範，樂於照顧他人，常能逢凶化吉。適合醫療、教育、社福、宗教與監察工作；有時愛說教或過於老成，放下「一定要照我說的」的想法，人緣更好。':
    'The protecting star in the Life Palace: mature, steady and elder-like, glad to care for others, often turning bad luck into good. Suited to healthcare, education, social welfare, religion and oversight. You can lecture or seem old beyond your years; letting go of "it must be my way" wins more friends.',
  '將星坐命，剛強果斷、不服輸，有開創與冒險精神，人生起伏較大但能成大事。適合軍警、創業、業務開拓與競技；性子急、容易獨斷，學會等待時機與團隊合作，衝勁才有方向。':
    'The general star in the Life Palace: strong, decisive and unwilling to lose, with a pioneering, adventurous spirit — life has big ups and downs but can achieve great things. Suited to the military or police, startups, business development and competition. Impatient and prone to acting alone; learning to wait and work as a team gives your drive direction.',
  '耗星坐命，敢於打破舊局、重新開始，不喜歡被束縛，有改革與創新的魄力。適合開創性工作、改革或需要突破的領域；人生多變動，財來財去，建立儲蓄與計畫能讓破後有立。':
    'The spending star in the Life Palace: willing to break the old and start over, dislikes constraint, with the boldness to reform and innovate. Suited to pioneering work, reform and fields that need breakthroughs. Life changes often and money comes and goes; savings and plans let you rebuild after each break.',
  '帝星與庫星同宮，兼具領導氣度與守成能力，穩重大方、格局大，一生多能得到資源與支持。適合管理與經營；要留意過於自信或固執，偶爾聽聽不同意見，會更上一層樓。':
    'The emperor and treasury stars together: leadership plus the ability to preserve — steady, generous and broad in scope, with plenty of resources and support through life. Suited to management and business. Beware overconfidence or stubbornness; listening to other views takes you further.',
  '帝星得印星輔佐，重視形象與規矩，做事有條理、懂得協調各方，適合在組織中擔任要職。個性講究公平，但也可能因顧慮太多而猶豫不決；確立原則後果斷執行，表現最佳。':
    'The emperor star assisted by the seal star: image- and rule-conscious, orderly, good at coordinating all sides — suited to key roles in organizations. You value fairness but may hesitate from too many considerations; set your principles and act decisively.',
  '帝星化殺為權，有魄力與威嚴，行動力強、敢於承擔重任，常在變局中脫穎而出。適合創業或高壓的領導職；脾氣較急、要求高，學會授權與體恤部屬，事業更能長久。':
    'The emperor star turns force into authority: bold and commanding, action-oriented, ready for heavy responsibility, often standing out in turbulent times. Suited to startups or high-pressure leadership. Quick-tempered and demanding — learning to delegate and care for your team makes success last.',
  '帝星與耗星同宮，有開創與改革的雄心，不甘平凡、勇於破舊立新。人生變化較多，常經歷大起大落後建立事業；決策前多做評估，避免一時衝動推翻原有成果。':
    'The emperor and spending stars together: ambitious to pioneer and reform, unwilling to be ordinary, bold in replacing the old. Life brings much change, often building a career after big ups and downs. Evaluate before deciding, and don\'t overturn past gains on impulse.',
  '帝星與桃花星同宮，魅力十足、多才多藝，交際能力強，對生活品質與享受有要求。適合需要人脈與表現的工作；桃花與誘惑較多，把熱情投入在事業與專長上，能成就非凡。':
    'The emperor and romance stars together: highly charming, multi-talented and sociable, with high standards for the good life. Suited to work built on networks and presence. Romance and temptation abound — pour your passion into your career and craft to achieve something remarkable.',
  '聰明細膩、心思靈巧，善於企劃與文書，有審美與藝術天分。適合設計、企劃、文字、幕僚；情緒較敏感、變動多，常在動中求財，穩定的作息與目標能減少內耗。':
    'Clever, delicate and nimble-minded, good at planning and writing, with an eye for beauty and art. Suited to design, planning, writing and advisory roles. Sensitive and changeable, often earning on the move; steady routines and goals reduce inner friction.',
  '頭腦敏捷、口才一流，研究與分析能力強，常能看到別人忽略的細節。適合研究、教學、法律、媒體與顧問；想法多也容易多疑，把懷疑轉為求證的精神，專業會很突出。':
    'Quick-witted and highly articulate, strong at research and analysis, often spotting details others miss. Suited to research, teaching, law, media and consulting. Many ideas can turn into suspicion; turn doubt into a spirit of verification and your expertise will stand out.',
  '智慧與慈悲兼具，善於出謀劃策、喜歡談論道理，有宗教或哲學的興趣。適合顧問、教育、醫療、社工與公職；有時紙上談兵多於實際行動，想到就去做，能把智慧化成成果。':
    'Wise and compassionate, good at strategy and fond of discussing principles, with an interest in religion or philosophy. Suited to consulting, education, healthcare, social work and public service. Sometimes more talk than action — act on your ideas and wisdom becomes results.',
  '太陽與太陰同宮，個性兼具熱情與細膩，陰陽調和但也容易內心矛盾、猶豫不決。能在不同環境中切換角色，適合需要溝通協調的工作；給自己明確的方向，就能兼得名與利。':
    'The Sun and Moon stars together: both warm and delicate, yin and yang in balance, yet prone to inner conflict and indecision. You can switch roles across settings and suit work that needs communication and coordination. A clear direction lets you win both fame and gain.',
  '太陽照耀巨門的暗，口才好又有正義感，適合以口為業、揚名於外。適合外交、教學、傳播、法律與業務；說話直率可能得罪人，以理服人、就事論事，能贏得信任與名聲。':
    'The Sun lights up Ju Men\'s darkness: articulate and principled, suited to earning a name by speaking. Suited to diplomacy, teaching, media, law and sales. Bluntness may offend; persuade with reason and stick to the facts to win trust and reputation.',
  '太陽與蔭星同宮，有領袖氣質與服務熱忱，重名聲、樂於提攜後進。適合公職、醫療、教育、學術與考試出身的專業；對自己要求高、愛照顧人，也要記得照顧自己的身心。':
    'The Sun with the protecting star: a leader\'s bearing and a passion for service, valuing reputation and glad to mentor others. Suited to public service, healthcare, education, academia and exam-based professions. Demanding of yourself and caring of others — remember to look after your own body and mind too.',
  '財星與庫星同宮，理財能力一流、重視安全感，能守住財富並逐步累積。適合金融、財務、經營與不動產；個性務實也較保守，在守成之外保留一些冒險空間，財富更能成長。':
    'The wealth and treasury stars together: first-rate with money, security-minded, able to keep wealth and grow it steadily. Suited to finance, business and real estate. Practical and conservative — leaving some room for risk helps your wealth grow.',
  '財星得印星輔佐，做事負責、講信用，善於管理財務與資源分配。適合財務、會計、行政管理、專業技術；有時過於在意別人的看法，堅持自己的判斷，更能展現實力。':
    'The wealth star assisted by the seal star: responsible, trustworthy, good at managing money and allocating resources. Suited to finance, accounting, administration and technical professions. You sometimes care too much what others think; trusting your own judgment shows your real ability.',
  '財星與將星同宮，剛毅果敢、行動力強，敢拚敢衝，常在競爭中求財。適合軍警、工程、金融交易、創業；性格剛硬、容易孤軍奮鬥，懂得借助團隊並控制風險，財富才守得住。':
    'The wealth and general stars together: resolute, bold and action-driven, earning through competition. Suited to the military or police, engineering, trading and startups. Hard-edged and prone to going it alone — use your team and control risk to keep what you earn.',
  '財星與耗星同宮，敢於投資與冒險，對賺錢有獨到眼光，但也容易財來財去。適合需要突破的行業、技術與創業；要建立理財紀律、避免衝動決策，才能把破耗轉為開創。':
    'The wealth and spending stars together: willing to invest and take risks, with a distinctive eye for money, though it comes and goes easily. Suited to fields that need breakthroughs, technology and startups. Build financial discipline and avoid impulsive decisions to turn losses into ventures.',
  '財星與慾望之星同宮，企圖心強、對賺錢有熱情，常是先苦後甜、中年以後發跡。適合商業、業務、金融與技藝；早年多累積實力與人脈，時機成熟時能一鳴驚人。':
    'The wealth star with the star of desire: ambitious and passionate about earning, often bitter first then sweet, prospering after middle age. Suited to business, sales, finance and skilled crafts. Build ability and connections early, and when the time is right you can make a striking success.',
  '福星與太陰同宮，溫柔體貼、感情豐富，重視生活品質與家庭溫暖，人緣極佳。適合服務、設計、藝術、餐飲與照護；較依賴安全感、決斷力稍弱，培養獨立與果斷，福氣更穩。':
    'The blessing star with Tai Yin: gentle, caring and emotionally rich, valuing quality of life and a warm home, and extremely well liked. Suited to service, design, the arts, food and care work. You lean on security and can be indecisive; growing independence and decisiveness steadies your good fortune.',
  '福星與暗星同宮，外表隨和、內心敏感，常有想法卻不輕易說出口，容易自我煩惱。口才與觀察力不錯，適合諮商、教學、服務與研究；適度表達真實感受，能減少誤會與內耗。':
    'The blessing star with the dark star: easygoing outside, sensitive within, often keeping thoughts to yourself and worrying alone. Good speaking and observation skills — suited to counseling, teaching, service and research. Expressing your real feelings reduces misunderstandings and inner strain.',
  '福星與蔭星同宮，心地善良、樂於助人，有長者或貴人照顧，一生多能逢凶化吉。適合公職、醫療、社福、教育與服務業；個性較閒散，給自己一些挑戰與目標，才華更能發揮。':
    'The blessing star with the protecting star: kind-hearted and helpful, cared for by elders or benefactors, often turning bad luck into good. Suited to public service, healthcare, social welfare, education and service work. A little laid-back — some challenges and goals bring out your talents.',
  '廉貞得天府收斂，精明幹練又穩重，擅長經營與管理，重視規劃與效率。適合經營管理、財務、行政與法律；有時過於計較得失，保持大方與彈性，人際與財運都會更好。':
    'Lian Zhen tempered by Tian Fu: shrewd, capable and steady, good at running and managing things, valuing planning and efficiency. Suited to management, finance, administration and law. You sometimes weigh gains and losses too closely; generosity and flexibility improve both relationships and finances.',
  '廉貞得天相制衡，正直守法、重視規範，做事認真負責，有正義感。適合法政、行政、監察、公關與專業技術；要留意因堅持原則與人起衝突，柔中帶剛更能服眾。':
    'Lian Zhen balanced by Tian Xiang: upright, law-abiding and rule-minded, earnest and responsible, with a sense of justice. Suited to law and politics, administration, oversight, PR and technical professions. Sticking to principles can cause clashes; firmness wrapped in gentleness wins people over.',
  '廉貞與將星同宮，有衝勁與膽識，意志堅定、不畏艱難，常經歷一番奮鬥後有所成。適合軍警、工程、技術、業務開拓；行事較激進，注意安全與健康，衝刺之餘也要休息。':
    'Lian Zhen with the general star: driven and daring, determined and unafraid of hardship, often succeeding after a hard struggle. Suited to the military or police, engineering, technical work and business development. You can be aggressive — mind safety and health, and rest between sprints.',
  '廉貞與耗星同宮，敢愛敢恨、不按牌理出牌，有強烈的改變慾望與冒險精神。適合創新、設計、演藝或需要突破的工作；人生起伏大，建立穩定的根基與理財習慣尤其重要。':
    'Lian Zhen with the spending star: loves and hates boldly, unconventional, with a strong urge for change and adventure. Suited to innovation, design, performing or work that needs breakthroughs. Life has big swings, so a stable base and good money habits matter especially.',
  '兩顆桃花星同宮，魅力強、善交際，多才多藝、熱愛生活與享受。適合演藝、公關、行銷、設計與娛樂；慾望與誘惑也多，懂得節制與專注，才能讓魅力成為事業助力。':
    'Two romance stars together: very charming and sociable, multi-talented, in love with life and its pleasures. Suited to performing, PR, marketing, design and entertainment. Desire and temptation are plentiful too; restraint and focus turn charm into a career asset.',

  // 身宮
  '身命同宮：個性表裡如一，主觀意識強，一生的發展較依靠自己的努力與意志。': 'Body and Life Palaces coincide: what you see is what you get, with strong opinions; your path depends mainly on your own effort and will.',
  '身宮在夫妻宮：後天重心在伴侶與家庭，婚姻對人生影響大，也容易受另一半的想法左右。': 'Body Palace in the Spouse Palace: later life centers on partner and family; marriage shapes your life, and your partner\'s views influence you strongly.',
  '身宮在財帛宮：後天重視金錢與物質保障，對理財與賺錢特別用心，財務狀況牽動心情。': 'Body Palace in the Wealth Palace: later life values money and material security; you put special care into earning and managing money, and finances affect your mood.',
  '身宮在遷移宮：後天重心在外，適合外出發展或經常變動的環境，人脈與外在機會是關鍵。': 'Body Palace in the Travel Palace: later life centers on the outside world; you suit working away from home or changing environments, and connections and outside opportunities are key.',
  '身宮在官祿宮：後天以事業為重心，工作成就感是人生主要動力，容易成為工作狂。': 'Body Palace in the Career Palace: later life centers on career; achievement at work is your main drive, and you can easily become a workaholic.',
  '身宮在福德宮：後天重視精神生活與興趣，追求內心的滿足與享受，思想深刻但也較容易多慮。': 'Body Palace in the Fortune Palace: later life values inner life and interests, seeking inner fulfillment and enjoyment; deep-thinking but prone to overthinking.',

  // 四化入宮：化祿
  '福氣與人緣佳，機會常主動上門，個性圓融、懂得享受。': 'Blessed and well liked; opportunities come knocking, and you are easygoing and know how to enjoy life.',
  '與兄弟姊妹、同事或合夥人關係和睦，能互相幫助，合作易生財。': 'Harmonious with siblings, colleagues or partners; you help each other, and cooperation brings money.',
  '感情緣分佳，伴侶能帶來助力或財富，婚姻生活較甜蜜。': 'Good fortune in love; your partner brings support or wealth, and married life is sweeter.',
  '與子女緣分深、子女有出息，也利於合夥、投資與創作收益。': 'Close ties with your children, who do well; also favorable for partnerships, investment and creative income.',
  '財源順暢、賺錢機會多，理財觀念務實，收入較豐。': 'Money flows smoothly with many chances to earn; a practical approach to finances and a healthy income.',
  '身體底子好、較少大病，但要留意口腹之慾造成的體重與代謝問題。': 'A strong constitution with few serious illnesses, but watch weight and metabolism from overindulging.',
  '外出運佳，在外地或向外發展易得機會與貴人，人脈廣。': 'Good luck away from home; opportunities and helpers come when you go out into the world, with a wide network.',
  '朋友多、人緣好，常得朋友或部屬幫忙，也要留意人情開銷。': 'Many friends and much goodwill; friends or staff often help, but watch the cost of social obligations.',
  '事業順利、工作有成就感，容易升遷或事業擴展。': 'A smooth career and satisfying work; promotion or business growth comes easily.',
  '家庭和樂，利於置產、房地產或家業累積，居住環境舒適。': 'A happy home; favorable for buying property, real estate or building family assets, with comfortable living.',
  '心態樂觀、懂得享受，精神生活充實，晚年福氣好。': 'Optimistic and good at enjoying life, with a rich inner life and good fortune in later years.',
  '與父母長輩關係好，能得長輩、上司照顧提攜，利於文書與考試。': 'Good relations with parents and elders; elders and superiors look after and promote you; favorable for paperwork and exams.',
  // 化權
  '主觀意識與企圖心強，有領導慾與執行力，做事積極但可能較強勢。': 'Strong-minded and ambitious, with a will to lead and the ability to execute; proactive but possibly domineering.',
  '兄弟姊妹或同事中有能力強者，互動中可能有主導權之爭。': 'Capable people among siblings or colleagues; there may be a struggle over who leads.',
  '伴侶能力強、有主見，婚姻中容易有主導權的拉扯，宜多溝通。': 'A capable, opinionated partner; tug-of-war over control in marriage — talk things through.',
  '子女個性獨立、有主見，對子女的管教較嚴格；利於開創副業。': 'Independent, opinionated children and a stricter parenting style; favorable for starting a side business.',
  '掌握財權，賺錢積極且有魄力，適合經手較大的資金或投資。': 'Control over finances; active and bold in earning, suited to handling larger sums or investments.',
  '體力好、恢復快，但容易因工作過勞，要留意筋骨與壓力相關問題。': 'Good stamina and quick recovery, but prone to overwork; watch muscles, bones and stress-related issues.',
  '在外有表現舞台，能獲得權位與影響力，適合外出發展。': 'A stage to shine away from home, gaining position and influence; suited to developing elsewhere.',
  '朋友或部屬中有強勢者，容易受他人影響，也可能遇到能力強的助力。': 'Strong personalities among friends or staff; you are easily influenced, but may also meet capable helpers.',
  '事業心強、掌實權，適合管理或專業領域，易在工作上有所成就。': 'Career-driven with real authority, suited to management or specialist fields; achievement at work comes readily.',
  '對家庭事務有主導權，利於購置不動產或擴充家業。': 'In charge of household matters; favorable for buying property or expanding family assets.',
  '主觀性強、自我要求高，精神上較有壓力，但也追求有品質的生活。': 'Strong-minded and demanding of yourself, with more mental pressure, but also a pursuit of quality living.',
  '父母或上司較嚴格強勢，但也可能得到有權力的長輩提攜。': 'Strict, forceful parents or superiors, but possibly also promotion by powerful elders.',
  // 化科
  '氣質斯文、重視名聲，有貴人緣，做事有條理，利於考試與學習。': 'Refined and reputation-minded, with helpful people around you; orderly in your work and favored in exams and study.',
  '兄弟姊妹或同事相處理性和諧，彼此能在知識或名聲上互相幫襯。': 'Rational, harmonious relations with siblings or colleagues; you support each other in knowledge or reputation.',
  '伴侶有氣質或學識，感情理性溫和，婚姻較平穩。': 'A refined or educated partner; a calm, gentle relationship and a steady marriage.',
  '子女聰明、有學習能力，教育上較省心。': 'Bright children who learn well, making education easier.',
  '財務規劃有條理，收入穩定，較少大起大落，也利於以專業或名聲生財。': 'Orderly financial planning and a steady income with few big swings; favorable for earning through expertise or reputation.',
  '遇到疾病容易找到良醫，病情較能化解。': 'When ill, you tend to find good doctors, and illnesses are more easily resolved.',
  '在外名聲好，容易得到他人的肯定與貴人相助。': 'A good reputation away from home; recognition and help from others come easily.',
  '朋友多為有學識、有修養的人，能給予良好的建議。': 'Friends tend to be knowledgeable and cultivated, offering good advice.',
  '事業上有好名聲與專業形象，利於學術、文職與考試升等。': 'A good reputation and professional image at work; favorable for academia, clerical work and promotion exams.',
  '家庭氣氛和諧有文化氣息，購屋置產過程較順利。': 'A harmonious, cultured home; buying property goes more smoothly.',
  '精神生活充實，重視修養與學習，心情較平和。': 'A rich inner life that values cultivation and learning, with a calmer mood.',
  '與父母長輩溝通良好，易得長輩賞識，文書與證照事務順利。': 'Good communication with parents and elders, who appreciate you; paperwork and certifications go smoothly.',
  // 化忌
  '個性較執著、容易鑽牛角尖，人生課題多但也因此磨練出韌性，凡事放寬心會順很多。': 'A persistent personality prone to fixating; many life lessons, but they build resilience — loosening up makes things much smoother.',
  '與兄弟姊妹、同事或合夥人緣分較薄或容易有摩擦，金錢往來宜謹慎。': 'Thinner ties or friction with siblings, colleagues or partners; be careful with money between you.',
  '感情上容易有糾結或期待落差，婚姻需要更多經營與包容，多溝通、少猜測為上。': 'Love can bring entanglements or unmet expectations; marriage needs more care and tolerance — communicate more, guess less.',
  '為子女操心較多，也要留意合夥、投資上的損失。': 'More worry over children; also watch for losses in partnerships and investments.',
  '賺錢較辛苦或容易有財務壓力，不宜投機與借貸，量入為出為佳。': 'Earning is harder or financial pressure common; avoid speculation and borrowing, and live within your means.',
  '要特別注意身體保養，有小毛病及早檢查，避免過勞。': 'Take special care of your health; check small problems early and avoid overwork.',
  '在外發展容易遇到阻礙，出行宜注意安全，凡事多做準備。': 'Obstacles when developing away from home; travel safely and prepare well.',
  '容易被朋友拖累或誤解，交友宜謹慎，作保、借貸須三思。': 'Friends may drag you down or misunderstand you; choose friends carefully and think twice before guaranteeing or lending.',
  '工作壓力大或事業起伏，宜專注本業、踏實累積，避免頻繁轉換跑道。': 'Heavy work pressure or career swings; focus on your core work, build steadily and avoid changing tracks too often.',
  '家庭事務操心較多，購屋置產要謹慎評估，留意居家安全。': 'More worry over household matters; assess property purchases carefully and mind home safety.',
  '容易想太多、心理壓力大，要學習放鬆與排解情緒。': 'Prone to overthinking and mental stress; learn to relax and release emotions.',
  '與父母或上司溝通不易，文書、合約事務要仔細確認。': 'Communication with parents or superiors is difficult; check paperwork and contracts carefully.'
});
