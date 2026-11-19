#!/usr/bin/env python3
"""
產生 js/data/dialect-db.js：
1. 粵語（Jyutping 粵拼）：由 Unihan_Readings.txt (kCantonese) 擷取 stroke-db.js 5,616 字之讀音，附常見姓氏／命名多音候選。
2. 台語（台羅 Tâi-lô）：姓氏／命名慣讀優先 + 教育部閩南語辭典（dict-twblg.json / ext），並保留文讀（:w）／白話（:b）多音候選。
3. 客語（四縣腔）：姓氏／命名優先字表 + 教育部客家語辭典（dict-hakka.json）單字與詞尾音，附多音候選。
4. 客語（海陸腔）：姓氏／命名優先字表 + 教育部客家語辭典（dict-hakka.json）海⃞ 單字與詞尾音，附多音候選。
"""
import json
import os
import re
import unicodedata
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STROKE_JS = os.path.join(ROOT, 'js', 'data', 'stroke-db.js')
UNIHAN = os.path.join(ROOT, 'tools', 'unihan', 'Unihan_Readings.txt')
CACHE_DIR = os.path.join(ROOT, 'tools', 'dialect-cache')
TWBLG_JSON = os.path.join(CACHE_DIR, 'dict-twblg.json')
TWBLG_EXT_JSON = os.path.join(CACHE_DIR, 'dict-twblg-ext.json')
HAKKA_JSON = os.path.join(CACHE_DIR, 'dict-hakka.json')
OUT_JS = os.path.join(ROOT, 'js', 'data', 'dialect-db.js')

TAILO_TONE_MARKS = {
    '\u0301': 2,
    '\u0300': 3,
    '\u0302': 5,
    '\u030c': 6,
    '\u0304': 7,
    '\u030d': 8,
}

# 四縣腔六聲（教育部客語拼音調值對應數字聲調 1–6）
HAKKA_FOUR_TONES = {
    '²⁴': 1,  # 陰平
    '¹¹': 2,  # 陽平
    '³¹': 3,  # 上聲
    '⁵⁵': 4,  # 去聲
    '²': 5,   # 陰入
    '⁵': 6,   # 陽入
}

# 海陸腔七聲（教育部客語拼音調值對應數字聲調 1–7）
HAKKA_HAILU_TONES = {
    '⁵³': 1,  # 陰平
    '⁵⁵': 2,  # 陽平
    '²⁴': 3,  # 上聲
    '¹¹': 4,  # 陰去
    '³³': 5,  # 陽去
    '⁵': 6,   # 陰入
    '²': 7,   # 陽入
}

TAIWANESE_STARTER = {
    # 常見姓氏（文讀／姓氏慣讀）
    '陳': 'tan5', '林': 'lim5', '黃': 'ng5', '張': 'tiunn1', '李': 'li2',
    '王': 'ong5', '吳': 'ngoo5', '蔡': 'tshua3', '劉': 'lau5', '楊': 'iunn5',
    '許': 'khoo2', '鄭': 'tenn7', '謝': 'sia7', '郭': 'kueh4', '洪': 'ang5',
    '邱': 'khu1', '曾': 'tsan1', '廖': 'liau7', '賴': 'lua7', '徐': 'tshi5',
    '周': 'tsiu1', '葉': 'iap8', '蘇': 'soo1', '莊': 'tsng1', '呂': 'lu7',
    '江': 'kang1', '何': 'ho5', '蕭': 'siau1', '羅': 'lo5', '高': 'ko1',
    '潘': 'phuann1', '簡': 'kan2', '朱': 'tsu1', '鍾': 'tsiong1', '游': 'iu5',
    '彭': 'phenn5', '詹': 'tsiam1', '胡': 'oo5', '施': 'si1', '沈': 'sim2',
    '余': 'i5', '盧': 'loo5', '梁': 'niu5', '趙': 'tio7', '顏': 'gan5',
    '柯': 'khua1', '翁': 'ang1', '魏': 'gui7', '孫': 'sun1', '戴': 'te3',
    '范': 'huan7', '宋': 'song3', '方': 'hong1', '鄧': 'ting7', '杜': 'too7',
    '傅': 'poo3', '侯': 'hau5', '薛': 'sih4', '丁': 'ting1', '馬': 'ma2',
    '曹': 'tso5', '唐': 'tong5', '卓': 'toh4', '藍': 'na5', '石': 'tsioh8',
    '董': 'tang2', '紀': 'ki2', '連': 'lian5', '歐': 'au1', '程': 'ting5',
    '溫': 'un1', '温': 'un1', '涂': 'thoo5', '凃': 'thoo5', '白': 'peh8',
    '史': 'su2', '韋': 'ui5', '嚴': 'giam5', '姚': 'iau5',
    '馮': 'pang5', '姜': 'kiunn1', '汪': 'ong1', '田': 'tian5', '康': 'khong1',
    '章': 'tsiong1', '鄒': 'tsoo1', '熊': 'him5', '陸': 'liok8', '孔': 'khong2',
    # 常用命名與避諱關鍵字
    '明': 'bing5', '華': 'hua5', '志': 'tsi3', '豪': 'ho5', '文': 'bun5',
    '傑': 'kiat8', '宇': 'u2', '軒': 'hian1', '恩': 'un1', '承': 'sing5',
    '睿': 'jue7', '誠': 'sing5', '欣': 'him1', '怡': 'i5', '婷': 'ting5',
    '雅': 'nga2', '慧': 'hui7', '敏': 'bin2', '靜': 'tsing7', '瑜': 'ju5',
    '珊': 'san1', '詩': 'si1', '安': 'an1', '平': 'ping5', '德': 'tik4',
    '福': 'hok4', '壽': 'siu7', '美': 'bi2', '麗': 'le7', '芳': 'hong1',
    '玉': 'giok8', '秀': 'siu3', '春': 'tshun1', '秋': 'tshiu1', '冬': 'tang1',
    '夏': 'ha7', '龍': 'liong5', '鳳': 'hong7', '虎': 'hoo2', '梅': 'mui5',
    '蘭': 'lan5', '竹': 'tik4', '松': 'siong5', '柏': 'pik4', '森': 'sim1',
    '海': 'hai2', '山': 'san1', '河': 'ho5', '水': 'tsui2', '火': 'hue2',
    '土': 'thoo2', '金': 'kim1', '木': 'bok8', '天': 'thian1', '地': 'te7',
    '日': 'jit8', '月': 'gueh8', '星': 'tshinn1', '雲': 'hun5', '風': 'hong1',
    '雨': 'hoo7', '花': 'hue1', '草': 'tshau2', '心': 'sim1', '意': 'i3',
    '情': 'tsing5', '愛': 'ai3', '真': 'tsin1', '善': 'sian7', '忠': 'tiong1',
    '孝': 'hau3', '仁': 'jin5', '義': 'gi7', '禮': 'le2', '智': 'ti3',
    '信': 'sin3', '勇': 'iong2', '正': 'tsing3', '光': 'kong1', '輝': 'hui1',
    '耀': 'iau7', '昌': 'tshiong1', '盛': 'sing7', '興': 'hing1', '旺': 'ong7',
    '發': 'huat4', '財': 'tsai5', '富': 'hu3', '貴': 'kui3', '榮': 'ing5',
    '成': 'sing5', '功': 'kong1', '立': 'lip8', '業': 'giap8', '家': 'ka1',
    '國': 'kok4', '邦': 'pang1', '民': 'bin5', '樂': 'lok8', '歡': 'huan1',
    '喜': 'hi2', '嘉': 'ka1', '佳': 'ka1', '凱': 'khai2', '翔': 'siong5',
    '哲': 'tiat4', '維': 'ui5', '宏': 'hong5', '偉': 'ui2', '強': 'kiong5',
    '健': 'kian7', '俊': 'tsun3', '彥': 'gian7', '廷': 'ting5', '涵': 'ham5',
    '潔': 'kiat4', '晴': 'tsing5', '晨': 'sin5', '語': 'gi2', '彤': 'tong5',
    '瑄': 'suan1', '琳': 'lim5', '琪': 'ki5', '瑤': 'iau5', '馨': 'hing1',
    '蕾': 'lui2', '蓮': 'lian5', '蓉': 'iong5', '君': 'kun1', '冠': 'kuan1',
    '宥': 'iu7', '宸': 'sin5', '品': 'phin2', '妤': 'u5', '博': 'phok4',
    '元': 'guan5', '達': 'tat8', '宗': 'tsong1', '毅': 'ge7', '靖': 'tsing7',
    '謙': 'khiam1', '瑩': 'ing5', '珍': 'tin1', '珠': 'tsu1', '寶': 'po2',
    '晶': 'tsing1', '雪': 'seh4', '霜': 'song1', '露': 'loo7', '霞': 'ha5',
    '虹': 'khong7', '雷': 'lui5', '電': 'tian7', '陽': 'iong5', '陰': 'im1',
    '乾': 'khian5', '坤': 'khun1',
    '死': 'si2', '屎': 'sai2', '輸': 'su1', '衰': 'sue1', '龜': 'ku1',
    '豬': 'tu1', '狗': 'kau2', '猴': 'kau5', '破': 'phua3', '臭': 'tshau3',
    '哭': 'khau3', '慘': 'tsham2', '鬼': 'kui2', '傻': 'so5', '笨': 'pun7',
    '呆': 'gong7', '瘋': 'siau2', '小': 'sio2', '阿': 'a1', '公': 'kong1',
    '婆': 'po5', '哥': 'ko1', '爸': 'pe7', '漆': 'tshat4', '落': 'loh8'
}

# 常見姓氏與命名用字的台語文白異讀補充（w=文讀, b=白話）
TAIWANESE_WENBAI = {
    '陳': [('tan5', 'b'), ('tin5', 'w')],
    '林': [('lim5', 'w'), ('na5', 'b')],
    '黃': [('ng5', 'b'), ('hong5', 'w')],
    '張': [('tiunn1', 'b'), ('tiong1', 'w')],
    '吳': [('ngoo5', 'b'), ('goo5', 'w')],
    '蔡': [('tshua3', 'b'), ('tshai3', 'w')],
    '楊': [('iunn5', 'b'), ('iong5', 'w')],
    '許': [('khoo2', 'b'), ('hi2', 'w')],
    '鄭': [('tenn7', 'b'), ('ting7', 'w')],
    '郭': [('kueh4', 'b'), ('kok4', 'w')],
    '洪': [('ang5', 'b'), ('hong5', 'w')],
    '賴': [('lua7', 'b'), ('lai7', 'w')],
    '葉': [('iap8', 'w'), ('hioh8', 'b')],
    '莊': [('tsng1', 'b'), ('tsong1', 'w')],
    '江': [('kang1', 'b'), ('kong1', 'w')],
    '潘': [('phuann1', 'b'), ('phuan1', 'w')],
    '彭': [('phenn5', 'b'), ('phing5', 'w')],
    '梁': [('niu5', 'b'), ('liong5', 'w')],
    '趙': [('tio7', 'b'), ('tiau7', 'w')],
    '柯': [('khua1', 'b'), ('kho1', 'w')],
    '戴': [('te3', 'b'), ('tai3', 'w')],
    '藍': [('na5', 'b'), ('lam5', 'w')],
    '石': [('tsioh8', 'b'), ('sik8', 'w')],
    '白': [('peh8', 'b'), ('pik8', 'w')],
    '明': [('bing5', 'w'), ('mia5', 'b')],
    '小': [('sio2', 'b'), ('siau2', 'w')],
    '大': [('tai7', 'w'), ('tua7', 'b')],
    '平': [('ping5', 'w'), ('penn5', 'b')],
    '冬': [('tang1', 'b'), ('tong1', 'w')],
    '夏': [('ha7', 'w'), ('he7', 'b')],
    '龍': [('liong5', 'w'), ('ling5', 'b')],
    '竹': [('tik4', 'w'), ('tik4', 'b')],
    '山': [('san1', 'w'), ('suann1', 'b')],
    '水': [('tsui2', 'b'), ('sui2', 'w')],
    '火': [('hue2', 'b'), ('ho2', 'w')],
    '木': [('bok8', 'w'), ('bak8', 'b')],
    '天': [('thian1', 'w'), ('thinn1', 'b')],
    '地': [('te7', 'b'), ('ti7', 'w')],
    '月': [('gueh8', 'b'), ('guat8', 'w')],
    '星': [('tshinn1', 'b'), ('sing1', 'w')],
    '風': [('hong1', 'w'), ('huang1', 'b')],
    '雨': [('hoo7', 'b'), ('u2', 'w')],
    '花': [('hue1', 'b'), ('hua1', 'w')],
    '草': [('tshau2', 'b'), ('tsho2', 'w')],
    '光': [('kong1', 'w'), ('kng1', 'b')],
    '成': [('sing5', 'w'), ('siann5', 'b')],
    '家': [('ka1', 'w'), ('ke1', 'b')],
    '正': [('tsing3', 'w'), ('tsiann3', 'b')],
    '生': [('sing1', 'w'), ('senn1', 'b')],
    '行': [('hing5', 'w'), ('kiann5', 'b')],
    '樂': [('lok8', 'w'), ('gak8', 'w')],
    '長': [('tiong5', 'w'), ('tng5', 'b'), ('tiong2', 'w')],
    '重': [('tiong7', 'w'), ('tang7', 'b'), ('tiong5', 'w')],
    '名': [('bing5', 'w'), ('mia5', 'b')],
    '聲': [('sing1', 'w'), ('siann1', 'b')],
    '香': [('hiong1', 'w'), ('phang1', 'b')],
    '清': [('tshing1', 'w'), ('tshenn1', 'b')],
    '青': [('tshing1', 'w'), ('tshenn1', 'b')],
    '紅': [('hong5', 'w'), ('ang5', 'b')],
    '飛': [('hui1', 'w'), ('pe1', 'b')],
    '雪': [('seh4', 'b'), ('suat4', 'w')],
    '雲': [('hun5', 'b'), ('un5', 'w')],
    '松': [('siong5', 'w'), ('tsing5', 'b')],
    '柏': [('pik4', 'w'), ('peh4', 'b')],
    '芳': [('hong1', 'w'), ('phang1', 'b')],
    '春': [('tshun1', 'w')],
    '秋': [('tshiu1', 'w')],
    '安': [('an1', 'w')],
    '曾': [('tsan1', 'b'), ('tsing1', 'w')],
    '落': [('loh8', 'b'), ('lok8', 'w')],
}

# 粵語常見姓氏與命名多音字（補足 Unihan kCantonese 單讀音）
CANTONESE_VARIANTS = {
    '樂': ['lok6', 'ngok6'],
    '長': ['coeng4', 'zoeng2'],
    '曾': ['zang1', 'cang4'],
    '華': ['waa4', 'waa6'],
    '行': ['hang4', 'hong4', 'hang6'],
    '重': ['cung5', 'zung6', 'cung4'],
    '解': ['gaai2', 'haai6'],
    '區': ['keoi1', 'au1'],
    '單': ['daan1', 'sin6'],
    '仇': ['sau4', 'kau4'],
    '查': ['caa4', 'zaa1'],
    '任': ['jam6', 'jam4'],
    '盛': ['sing6', 'sing4'],
    '朝': ['ciu4', 'ziu1'],
    '傳': ['cyun4', 'zyun6'],
    '冠': ['gun1', 'gun3'],
    '處': ['cyu3', 'cyu2'],
    '參': ['caam1', 'sam1'],
    '應': ['jing3', 'jing1'],
    '寧': ['ning4', 'ning6'],
    '柏': ['paak3', 'baak3'],
    '校': ['haau6', 'gaau3'],
    '率': ['seot1', 'leot6'],
    '省': ['saang2', 'sing2'],
    '稱': ['cing1', 'can3'],
    '調': ['tiu4', 'diu6'],
    '數': ['sou3', 'sou2'],
    '差': ['caa1', 'caai1'],
    '奇': ['kei4', 'gei1'],
    '藏': ['cong4', 'zong6'],
    '覺': ['gok3', 'gaau3'],
    '強': ['koeng4', 'koeng5'],
    '露': ['lou6', 'lau6'],
    '好': ['hou2', 'hou3'],
    '中': ['zung1', 'zung3'],
    '正': ['zing3', 'zing1'],
    '大': ['daai6', 'taai3'],
    '少': ['siu2', 'siu3'],
    '和': ['wo4', 'wo6'],
    '分': ['fan1', 'fan6'],
    '相': ['soeng1', 'soeng3'],
    '發': ['faat3'],
    '當': ['dong1', 'dong3'],
    '興': ['hing1', 'hing3'],
    '間': ['gaan1', 'gaan3'],
    '鮮': ['sin1', 'sin2'],
    '薄': ['bok6', 'bok3'],
    '落': ['lok6', 'laai6'],
    '宿': ['suk1', 'sau3'],
    '角': ['gok3', 'luk6'],
    '為': ['wai4', 'wai6'],
    '更': ['gang1', 'gang3'],
    '還': ['waan4', 'syun4'],
    '難': ['naan4', 'naan6'],
    '度': ['dou6', 'dok6'],
    '都': ['dou1'],
    '種': ['zung2', 'zung3'],
    '空': ['hung1', 'hung3'],
    '論': ['leon6', 'leon4'],
    '量': ['loeng4', 'loeng6'],
    '騎': ['ke4', 'kei4'],
    '磨': ['mo4', 'mo6'],
    '禁': ['gam3', 'gam1'],
    '累': ['leoi6', 'leoi5'],
    '喪': ['song1', 'song3'],
    '蒙': ['mung4', 'mung2'],
    '景': ['ging2', 'jing2'],
    '員': ['jyun4', 'wan4'],
    '秘': ['bei3', 'mat6'],
    '令': ['ling6', 'ling4'],
    '燕': ['jin3', 'jin1'],
    '陸': ['luk6'],
    '蓋': ['goi3', 'got3'],
    '蔚': ['wai3', 'wat1'],
    '逢': ['fung4', 'pung4'],
    '折': ['zit3', 'sit6'],
    '朴': ['pok3', 'piu4'],
    '洗': ['sai2', 'sin2'],
    '柏': ['paak3', 'baak3'],
    '殷': ['jan1', 'jin1'],
    '紀': ['gei2', 'gei3'],
    '盛': ['sing6', 'sing4'],
}

HAKKA_STARTER = {
    # 四縣腔常見姓氏（數字調：1 陰平, 2 陽平, 3 上聲, 4 去聲, 5 陰入, 6 陽入）
    '陳': 'chin2', '林': 'lim2', '黃': 'vong2', '張': 'chong1', '李': 'li3',
    '王': 'vong2', '吳': 'ng2', '蔡': 'chhai4', '劉': 'liu2', '楊': 'yong2',
    '許': 'hi3', '鄭': 'chhang4', '謝': 'chhia4', '郭': 'kok5', '洪': 'fung2',
    '邱': 'hiu1', '曾': 'chen1', '廖': 'liau4', '賴': 'lai4', '徐': 'chhi2',
    '周': 'chiu1', '葉': 'yap6', '蘇': 'su1', '莊': 'chong1', '呂': 'li1',
    '江': 'kong1', '何': 'ho2', '蕭': 'siau1', '羅': 'lo2', '高': 'ko1',
    '潘': 'phan1', '簡': 'kien3', '朱': 'chu1', '鍾': 'chung1', '游': 'yu2',
    '彭': 'phang2', '詹': 'cham1', '胡': 'fu2', '施': 'sii1', '沈': 'siim3',
    '余': 'yi2', '盧': 'lu2', '梁': 'liong2', '趙': 'chheu4', '顏': 'ngien2',
    '柯': 'kho1', '翁': 'vung1', '魏': 'ngui4', '孫': 'sun1', '戴': 'tai4',
    '范': 'fam4', '宋': 'sung4', '方': 'fong1', '鄧': 'then4', '杜': 'thu4',
    '溫': 'vun1', '温': 'vun1', '涂': 'thu2', '凃': 'thu2', '白': 'phak6',
    '馬': 'ma1', '唐': 'thong2', '藍': 'lam2', '石': 'sak6', '連': 'lien2',
    '古': 'ku3', '傅': 'fu4', '馮': 'fung2', '丁': 'ten1',
    # 常用命名與避諱關鍵字
    '明': 'min2', '華': 'fa2', '志': 'chii4', '豪': 'ho2', '文': 'vun2',
    '傑': 'khiet6', '宇': 'yi3', '軒': 'hien1', '恩': 'en1', '承': 'siin2',
    '睿': 'yui4', '誠': 'siin2', '欣': 'him1', '怡': 'yi2', '婷': 'thin2',
    '雅': 'nga1', '慧': 'fi4', '敏': 'men3', '靜': 'chhin4', '瑜': 'yi2',
    '珊': 'san1', '詩': 'sii1', '安': 'on1', '平': 'phin2', '德': 'tet5',
    '福': 'fuk5', '壽': 'su4', '美': 'mui1', '麗': 'li4', '芳': 'fong1',
    '玉': 'ngiuk6', '秀': 'siu4', '春': 'chhun1', '秋': 'chhiu1', '冬': 'tung1',
    '夏': 'ha4', '龍': 'liung2', '鳳': 'fung4', '虎': 'fu3', '梅': 'moi2',
    '蘭': 'lan2', '竹': 'chuk5', '松': 'chhiung2', '柏': 'pak5', '森': 'sem1',
    '海': 'hoi3', '山': 'san1', '河': 'ho2', '水': 'sui3', '火': 'fo3',
    '土': 'thu3', '金': 'kim1', '木': 'muk5', '天': 'thien1', '地': 'thi4',
    '日': 'ngit5', '月': 'ngiet6', '星': 'sen1', '雲': 'yun2', '風': 'fung1',
    '雨': 'yi3', '花': 'fa1', '草': 'chho3', '心': 'sim1', '意': 'yi4',
    '情': 'chhin2', '愛': 'oi4', '真': 'chiin1', '善': 'san4', '忠': 'chung1',
    '孝': 'hau4', '仁': 'yin2', '義': 'ngi4', '禮': 'li1', '智': 'chii4',
    '信': 'sin4', '勇': 'yung3', '正': 'chiin4', '光': 'kong1', '輝': 'fi1',
    '耀': 'yau4', '昌': 'chhong1', '盛': 'siin4', '興': 'hin1', '旺': 'vong4',
    '發': 'fat5', '財': 'choi2', '富': 'fu4', '貴': 'kui4', '榮': 'yung2',
    '成': 'siin2', '功': 'kung1', '立': 'lip6', '業': 'ngiap6', '家': 'ka1',
    '國': 'kok5', '邦': 'pang1', '民': 'min2', '樂': 'lok6', '歡': 'fon1',
    '喜': 'hi3', '嘉': 'ka1', '佳': 'ka1', '凱': 'khai3', '翔': 'siong2',
    '哲': 'chat5', '維': 'vi2', '宏': 'fen2', '偉': 'vi1', '強': 'khiong2',
    '健': 'khien4', '俊': 'chun4', '彥': 'ngien4', '廷': 'thin2', '涵': 'ham2',
    '潔': 'kiet5', '晴': 'chhiang2', '晨': 'siin2', '語': 'ngi1', '彤': 'thung2',
    '瑄': 'sien1', '琳': 'lim2', '琪': 'khi2', '瑤': 'yau2', '馨': 'hin1',
    '蕾': 'lui2', '蓮': 'lien2', '蓉': 'yung2', '君': 'kiun1', '博': 'pok5',
    '元': 'ngien2', '達': 'that6', '宗': 'chung1', '毅': 'ngi4', '靖': 'chhin4',
    '謙': 'khiam1', '瑩': 'yin2', '珍': 'chiin1', '珠': 'chu1', '寶': 'po3',
    '晶': 'chin1', '雪': 'siet5', '霜': 'song1', '露': 'lu4', '陽': 'yong2',
    '死': 'si3', '屎': 'si3', '輸': 'su1', '衰': 'soi1', '龜': 'kui1',
    '豬': 'chu1', '狗': 'kieu3', '破': 'pho4', '臭': 'chhu4', '鬼': 'kui3',
    '笨': 'pun4', '呆': 'ngoi2', '癲': 'tien1', '小': 'siau3', '阿': 'a1'
}

# 海陸腔常見姓氏與避諱關鍵字補強（教育部海陸腔拼音；數字調 1–7）
HAKKA_HAILU_STARTER = {
    '陳': 'chin2', '林': 'lim2', '黃': 'vong2', '張': 'zhong1', '李': 'li3',
    '王': 'vong2', '吳': 'ng2', '蔡': 'cai4', '劉': 'liu2', '楊': 'rhong2',
    '許': 'hi3', '鄭': 'chang5', '謝': 'cia5', '郭': 'gog6', '洪': 'fung2',
    '邱': 'hiu1', '曾': 'zen1', '廖': 'liau5', '賴': 'lai5', '徐': 'ci2',
    '周': 'zhiu1', '葉': 'rhab7', '蘇': 'su1', '莊': 'zong1', '呂': 'li1',
    '温': 'vun1', '凃': 'tu2', '癲': 'dien1', '阿': 'a1',
}


def parse_tailo(syl):
    if not syl or syl.startswith('--'):
        return None
    s = unicodedata.normalize('NFD', syl.strip().lower()).replace('o\u0358', 'oo')
    tone = None
    letters = []
    for ch in s:
        if ch in TAILO_TONE_MARKS:
            if tone is None:
                tone = TAILO_TONE_MARKS[ch]
        elif 'a' <= ch <= 'z':
            letters.append(ch)
        else:
            return None
    base = ''.join(letters)
    if not base:
        return None
    if tone is None:
        tone = 4 if base[-1] in ('p', 't', 'k', 'h') else 1
    out = f'{base}{tone}'
    return out if re.match(r'^[a-z]+[1-8]$', out) else None


def parse_hakka_syllable(tok, tone_map):
    tm = re.search(r'([¹²³⁴⁵⁶⁷⁸⁹⁰]+)$', tok)
    if not tm:
        return None
    tone = tone_map.get(tm.group(1))
    if tone is None:
        return None
    base = tok[:tm.start()].lower()
    if not re.match(r'^[a-z]+$', base):
        return None
    return f'{base}{tone}'


def parse_hakka_field(pinyin, marker, tone_map):
    m = re.search(re.escape(marker) + r'([^\s\u3000,;、/()（）文白替俗]+)', pinyin or '')
    if not m:
        return None
    tok = re.sub(r'[-－].*$', '', m.group(1))
    return parse_hakka_syllable(tok, tone_map)


def parse_hakka_compound_last(pinyin, marker, tone_map, char_len):
    m = re.search(re.escape(marker) + r'([^\s\u3000,;、/()（）]+)', pinyin or '')
    if not m:
        return None
    tok = re.sub(r'[-－]', '', m.group(1)).lower()
    syls = re.findall(r'[a-z]+[¹²³⁴⁵⁶⁷⁸⁹⁰]+', tok)
    if len(syls) != char_len or ''.join(syls) != tok:
        return None
    return parse_hakka_syllable(syls[-1], tone_map)


def merge_variant_list(items, max_items=4):
    """去重並保留優先順序，同時保留 w/b 標記。items: [(py, tag)]"""
    out = []
    idx_by_py = {}
    for py, tag in items:
        if not py:
            continue
        if py in idx_by_py:
            if tag and not out[idx_by_py[py]][1]:
                out[idx_by_py[py]] = (py, tag)
            continue
        idx_by_py[py] = len(out)
        out.append((py, tag))
        if len(out) >= max_items:
            break
    return out


def encode_variants(var_map):
    encoded = {}
    for ch, items in var_map.items():
        clean = merge_variant_list(items)
        if len(clean) >= 2:
            encoded[ch] = '|'.join(f'{py}:{tag}' if tag else py for py, tag in clean)
    return encoded


def build_taiwanese(stroke_chars):
    result = {}
    variants_raw = defaultdict(list)

    for ch, syl in TAIWANESE_STARTER.items():
        if ch in stroke_chars and re.match(r'^[a-z]+[1-8]$', syl):
            result[ch] = syl

    for ch, pairs in TAIWANESE_WENBAI.items():
        if ch in stroke_chars:
            for py, tag in pairs:
                if re.match(r'^[a-z]+[1-8]$', py):
                    variants_raw[ch].append((py, tag))

    tw_sources = []
    for path in (TWBLG_JSON, TWBLG_EXT_JSON):
        if os.path.exists(path):
            tw_sources.append(json.load(open(path, encoding='utf-8')))
    if not tw_sources:
        return result, encode_variants(variants_raw)

    single_best = {}
    comp_cands = defaultdict(Counter)

    # 單字音（僅主辭典有 reading/單字義項）
    for e in tw_sources[0]:
        t = e.get('title', '')
        if len(t) == 1 and t in stroke_chars:
            for h in e.get('heteronyms', []):
                trs = (h.get('trs') or '').strip()
                if not trs or trs.startswith('--'):
                    continue
                r = h.get('reading', '')
                tag = 'w' if r == '文' else 'b' if r == '白' else ''
                parts = [p for p in re.split(r'[\s,/]+', trs) if p and not p.startswith('--')]
                for idx, part in enumerate(parts):
                    parsed = parse_tailo(part)
                    if not parsed:
                        continue
                    variants_raw[t].append((parsed, tag))
                    if idx == 0:
                        rank = 4 if r == '文' else 3 if r == '' else 2 if r == '白' else 1
                        prev = single_best.get(t)
                        if prev is None or rank > prev[0]:
                            single_best[t] = (rank, parsed)

    # 多字詞尾音備援（詞尾不發生前字變調，採高頻讀音）
    for src in tw_sources:
        for e in src:
            t = e.get('title', '')
            if not (2 <= len(t) <= 4 and all('\u4e00' <= c <= '\u9fff' for c in t)):
                continue
            last_ch = t[-1]
            if last_ch not in stroke_chars:
                continue
            for h in e.get('heteronyms', []):
                trs = (h.get('trs') or '').strip()
                if not trs or '--' in trs or ' ' in trs or '/' in trs or ',' in trs:
                    continue
                parts = trs.split('-')
                if len(parts) != len(t):
                    continue
                parsed = parse_tailo(parts[-1])
                if parsed:
                    comp_cands[last_ch][parsed] += 1

    for ch, (_, syl) in single_best.items():
        result.setdefault(ch, syl)
    for ch, cnt in comp_cands.items():
        if ch not in result:
            result[ch] = cnt.most_common(1)[0][0]

    # 確保預設音永遠包含在多音候選清單裡（作為第一個非衝突候選或補齊）
    for ch, items in list(variants_raw.items()):
        if ch in result:
            def_py = result[ch]
            if not any(py == def_py for py, _ in items):
                variants_raw[ch] = [(def_py, '')] + items
    return result, encode_variants(variants_raw)


def build_hakka_dialect(stroke_chars, starter, marker, tone_map, tone_regex):
    result = {}
    variants_raw = defaultdict(list)
    for ch, syl in starter.items():
        if ch in stroke_chars and re.match(tone_regex, syl):
            result[ch] = syl

    if not os.path.exists(HAKKA_JSON):
        return result, {}

    hk_data = json.load(open(HAKKA_JSON, encoding='utf-8'))
    single_best = {}
    comp_cands = defaultdict(Counter)

    for e in hk_data:
        t = e.get('title', '')
        if len(t) == 1 and t in stroke_chars:
            for h in e.get('heteronyms', []):
                py = h.get('pinyin', '')
                if marker not in py:
                    continue
                parsed = parse_hakka_field(py, marker, tone_map)
                if not parsed:
                    continue
                tag = 'w' if '文' in py else 'b' if '白' in py else ''
                variants_raw[t].append((parsed, tag))
                rank = 3 if tag == 'w' else 1 if tag == 'b' else 2
                prev = single_best.get(t)
                if prev is None or rank > prev[0]:
                    single_best[t] = (rank, parsed)
        elif 2 <= len(t) <= 4 and t[-1] in stroke_chars and all('\u4e00' <= c <= '\u9fff' for c in t):
            for h in e.get('heteronyms', []):
                py = h.get('pinyin', '')
                if marker not in py:
                    continue
                parsed = parse_hakka_compound_last(py, marker, tone_map, len(t))
                if parsed:
                    comp_cands[t[-1]][parsed] += 1

    for ch, (_, syl) in single_best.items():
        result.setdefault(ch, syl)
    for ch, cnt in comp_cands.items():
        if ch not in result:
            result[ch] = cnt.most_common(1)[0][0]

    for ch, items in list(variants_raw.items()):
        if ch in result:
            def_py = result[ch]
            if not any(py == def_py for py, _ in items):
                variants_raw[ch] = [(def_py, '')] + items
    return result, encode_variants(variants_raw)


def append_grouped_map(lines, group_var, target_var, data):
    by_py = defaultdict(list)
    for ch, py in data.items():
        by_py[py].append(ch)
    lines.append(f'  var {group_var} = {{')
    items = [f"{k}:'{''.join(sorted(v))}'" for k, v in sorted(by_py.items())]
    for i in range(0, len(items), 12):
        comma = ',' if i + 12 < len(items) else ''
        lines.append('    ' + ', '.join(items[i:i + 12]) + comma)
    lines.append('  };')
    lines.append(f'  var {target_var} = {{}};')
    lines.append(f'  Object.keys({group_var}).forEach(function(py) {{')
    lines.append(f"    {group_var}[py].split('').forEach(function(ch) {{ {target_var}[ch] = py; }});")
    lines.append('  });')


def append_variant_map(lines, var_name, data):
    lines.append(f'  var {var_name} = {{')
    items = [f"'{ch}':'{val}'" for ch, val in sorted(data.items())]
    for i in range(0, len(items), 8):
        comma = ',' if i + 8 < len(items) else ''
        lines.append('    ' + ', '.join(items[i:i + 8]) + comma)
    lines.append('  };')


def main():
    txt = open(STROKE_JS, encoding='utf-8').read()
    chars = set(re.findall(r"'([\u4e00-\u9fff])':\d+", txt))

    jyutping = {}
    yue_var_raw = defaultdict(list)
    for line in open(UNIHAN, encoding='utf-8'):
        if not line.startswith('U+'):
            continue
        cp, field, val = line.rstrip('\n').split('\t', 2)
        if field != 'kCantonese':
            continue
        c = chr(int(cp[2:], 16))
        if c not in chars:
            continue
        readings = val.split()
        if readings:
            jyutping[c] = readings[0]
            if len(readings) > 1:
                for r in readings:
                    yue_var_raw[c].append((r, ''))

    for ch, rlist in CANTONESE_VARIANTS.items():
        if ch in chars:
            if ch in jyutping:
                yue_var_raw[ch].append((jyutping[ch], ''))
            for r in rlist:
                if re.match(r'^[a-z]+[1-6]$', r):
                    yue_var_raw[ch].append((r, ''))
    yue_variants = encode_variants(yue_var_raw)

    taiwanese, tw_variants = build_taiwanese(chars)
    hakka, hak_variants = build_hakka_dialect(chars, HAKKA_STARTER, '四⃞', HAKKA_FOUR_TONES, r'^[a-z]+[1-6]$')
    hakka_hailu, hhl_variants = build_hakka_dialect(chars, HAKKA_HAILU_STARTER, '海⃞', HAKKA_HAILU_TONES, r'^[a-z]+[1-7]$')

    lines = [
        '/**',
        ' * 多語音韻字庫（含文白異讀／多音候選與客語海陸腔）：',
        f' * - 粵語（Jyutping 粵拼）：Unihan kCantonese，共 {len(jyutping)} 字（多音 {len(yue_variants)} 字）',
        f' * - 台語（台羅 Tâi-lô）：姓氏／命名慣讀 + 教育部閩南語辭典，共 {len(taiwanese)} 字（文白／多音 {len(tw_variants)} 字）',
        f' * - 客語（四縣腔）：姓氏／命名優先 + 教育部客家語辭典，共 {len(hakka)} 字（多音 {len(hak_variants)} 字）',
        f' * - 客語（海陸腔）：姓氏／命名優先 + 教育部客家語辭典，共 {len(hakka_hailu)} 字（多音 {len(hhl_variants)} 字）',
        ' */',
        'window.DialectDB = (function() {'
    ]
    append_grouped_map(lines, 'BY_JYUTPING', 'JYUTPING', jyutping)
    append_grouped_map(lines, 'BY_TAILO', 'TAIWANESE', taiwanese)
    append_grouped_map(lines, 'BY_HAKKA', 'HAKKA', hakka)
    append_grouped_map(lines, 'BY_HAKKA_HAILU', 'HAKKA_HAILU', hakka_hailu)
    append_variant_map(lines, 'VAR_YUE', yue_variants)
    append_variant_map(lines, 'VAR_TW', tw_variants)
    append_variant_map(lines, 'VAR_HAK', hak_variants)
    append_variant_map(lines, 'VAR_HHL', hhl_variants)
    lines.extend([
        '  var DICTS = { yue: JYUTPING, tw: TAIWANESE, hak: HAKKA, hhl: HAKKA_HAILU };',
        '  var VARIANTS = { yue: VAR_YUE, tw: VAR_TW, hak: VAR_HAK, hhl: VAR_HHL };',
        '  function getVariants(lang, ch) {',
        '    var raw = VARIANTS[lang] && VARIANTS[lang][ch];',
        '    if (raw) {',
        "      return raw.split('|').map(function(tok) {",
        "        var parts = tok.split(':');",
        "        return { py: parts[0], tag: parts[1] || '' };",
        '      });',
        '    }',
        '    var single = DICTS[lang] && DICTS[lang][ch];',
        "    return single ? [{ py: single, tag: '' }] : [];",
        '  }',
        '  function getReading(lang, ch, mode) {',
        "    if (lang === 'tw' && (mode === 'wen' || mode === 'bai')) {",
        "      var want = mode === 'wen' ? 'w' : 'b';",
        '      var vars = getVariants(lang, ch);',
        '      for (var i = 0; i < vars.length; i++) {',
        '        if (vars[i].tag === want) return vars[i];',
        '      }',
        '    }',
        '    var py = DICTS[lang] && DICTS[lang][ch];',
        '    if (!py) return null;',
        '    var all = getVariants(lang, ch);',
        '    for (var j = 0; j < all.length; j++) {',
        '      if (all[j].py === py) return all[j];',
        '    }',
        "    return { py: py, tag: '' };",
        '  }',
        '  return {',
        '    JYUTPING: JYUTPING, TAIWANESE: TAIWANESE, HAKKA: HAKKA, HAKKA_HAILU: HAKKA_HAILU,',
        '    VARIANTS: VARIANTS, getVariants: getVariants, getReading: getReading',
        '  };',
        '})();',
    ])

    with open(OUT_JS, 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(lines) + '\n')
    print(
        f'Wrote {OUT_JS}: yue={len(jyutping)} (var {len(yue_variants)}), '
        f'tw={len(taiwanese)} (var {len(tw_variants)}), '
        f'hak={len(hakka)} (var {len(hak_variants)}), '
        f'hhl={len(hakka_hailu)} (var {len(hhl_variants)})'
    )


if __name__ == '__main__':
    main()
