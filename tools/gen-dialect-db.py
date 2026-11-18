#!/usr/bin/env python3
"""
產生 js/data/dialect-db.js：
1. 粵語（Jyutping 粵拼）：由 Unihan_Readings.txt (kCantonese) 擷取 stroke-db.js 5,616 字之讀音，以讀音分組壓縮。
2. 台語（台羅 Tâi-lô）：以精選常見姓氏／命名用字優先，並結合萌典教育部閩南語辭典（dict-twblg.json / ext）擴充字音。
3. 客語（四縣腔）：以精選常見姓氏／命名用字優先，並結合萌典教育部客家語辭典（dict-hakka.json）擴充四縣腔字音。
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

HAKKA_SUP_TONES = {
    '²⁴': 1,
    '¹¹': 2,
    '³¹': 3,
    '⁵⁵': 4,
    '²': 5,
    '⁵': 6,
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
    '史': 'su2', '史': 'su2', '韋': 'ui5', '嚴': 'giam5', '姚': 'iau5',
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
    '蕾': 'lui2', '蓮': 'lian5', '蓉': 'iong5', '君': 'kun1', '豪': 'ho5',
    '偉': 'ui2', '冠': 'kuan1', '廷': 'ting5', '哲': 'tiat4', '宥': 'iu7',
    '宸': 'sin5', '品': 'phin2', '晴': 'tsing5', '妤': 'u5', '彤': 'tong5',
    '博': 'phok4', '元': 'guan5', '仁': 'jin5', '達': 'tat8', '智': 'ti3',
    '宗': 'tsong1', '宏': 'hong5', '毅': 'ge7', '靖': 'tsing7', '謙': 'khiam1',
    '謙': 'khiam1', '誠': 'sing5', '潔': 'kiat4', '瑩': 'ing5', '珊': 'san1',
    '珍': 'tin1', '珠': 'tsu1', '寶': 'po2', '晶': 'tsing1', '雪': 'seh4',
    '霜': 'song1', '露': 'loo7', '霞': 'ha5', '虹': 'khong7', '雷': 'lui5',
    '電': 'tian7', '陽': 'iong5', '陰': 'im1', '乾': 'khian5', '坤': 'khun1',
    '死': 'si2', '屎': 'sai2', '輸': 'su1', '衰': 'sue1', '龜': 'ku1',
    '豬': 'tu1', '狗': 'kau2', '猴': 'kau5', '破': 'phua3', '臭': 'tshau3',
    '哭': 'khau3', '慘': 'tsham2', '鬼': 'kui2', '傻': 'so5', '笨': 'pun7',
    '呆': 'gong7', '瘋': 'siau2', '小': 'sio2', '阿': 'a1', '公': 'kong1',
    '婆': 'po5', '哥': 'ko1', '爸': 'pe7', '漆': 'tshat4', '落': 'loh8'
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
    '古': 'ku3', '鍾': 'chung1', '傅': 'fu4', '馮': 'fung2', '丁': 'ten1',
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


def parse_hakka_four(pinyin):
    m = re.search(r'四⃞([^\s\u3000,;、/()（）文白替俗]+)', pinyin or '')
    if not m:
        return None
    tok = re.sub(r'[-－].*$', '', m.group(1))
    tm = re.search(r'([¹²³⁴⁵⁶⁷⁸⁹⁰]+)$', tok)
    if not tm:
        return None
    tone = HAKKA_SUP_TONES.get(tm.group(1))
    if tone is None:
        return None
    base = tok[:tm.start()].lower()
    if not re.match(r'^[a-z]+$', base):
        return None
    return f'{base}{tone}'


def build_taiwanese(stroke_chars):
    result = {}
    for ch, syl in TAIWANESE_STARTER.items():
        if ch in stroke_chars and re.match(r'^[a-z]+[1-8]$', syl):
            result[ch] = syl

    tw_sources = []
    for path in (TWBLG_JSON, TWBLG_EXT_JSON):
        if os.path.exists(path):
            tw_sources.append(json.load(open(path, encoding='utf-8')))
    if not tw_sources:
        return result

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
                first_part = re.split(r'[\s,/]+', trs)[0]
                parsed = parse_tailo(first_part)
                if not parsed:
                    continue
                r = h.get('reading', '')
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
    return result


def build_hakka(stroke_chars):
    result = {}
    for ch, syl in HAKKA_STARTER.items():
        if ch in stroke_chars and re.match(r'^[a-z]+[1-6]$', syl):
            result[ch] = syl
    if not os.path.exists(HAKKA_JSON):
        return result

    hk_data = json.load(open(HAKKA_JSON, encoding='utf-8'))
    single_best = {}
    for e in hk_data:
        t = e.get('title', '')
        if len(t) != 1 or t not in stroke_chars:
            continue
        for h in e.get('heteronyms', []):
            py = h.get('pinyin', '')
            if '四⃞' not in py:
                continue
            parsed = parse_hakka_four(py)
            if not parsed:
                continue
            rank = 3 if '文' in py else 1 if '白' in py else 2
            prev = single_best.get(t)
            if prev is None or rank > prev[0]:
                single_best[t] = (rank, parsed)

    for ch, (_, syl) in single_best.items():
        result.setdefault(ch, syl)
    return result


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


def main():
    txt = open(STROKE_JS, encoding='utf-8').read()
    chars = set(re.findall(r"'([\u4e00-\u9fff])':\d+", txt))

    jyutping = {}
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

    taiwanese = build_taiwanese(chars)
    hakka = build_hakka(chars)

    lines = [
        '/**',
        ' * 多語音韻字庫：',
        f' * - 粵語（Jyutping 粵拼）：擷取自 Unihan_Readings.txt (kCantonese)，共 {len(jyutping)} 字',
        f' * - 台語（台羅 Tâi-lô）：姓氏／命名優先字表 + 教育部閩南語辭典（萌典開放資料），共 {len(taiwanese)} 字',
        f' * - 客語（四縣腔拼音）：姓氏／命名優先字表 + 教育部客家語辭典（萌典開放資料），共 {len(hakka)} 字',
        ' */',
        'window.DialectDB = (function() {'
    ]
    append_grouped_map(lines, 'BY_JYUTPING', 'JYUTPING', jyutping)
    append_grouped_map(lines, 'BY_TAILO', 'TAIWANESE', taiwanese)
    append_grouped_map(lines, 'BY_HAKKA', 'HAKKA', hakka)
    lines.append('  return { JYUTPING: JYUTPING, TAIWANESE: TAIWANESE, HAKKA: HAKKA };')
    lines.append('})();')

    with open(OUT_JS, 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(lines) + '\n')
    print(f'Wrote {OUT_JS}: Cantonese={len(jyutping)}, Taiwanese={len(taiwanese)}, Hakka={len(hakka)}')


if __name__ == '__main__':
    main()
