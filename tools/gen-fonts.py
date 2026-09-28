# 產生 fonts/：自架字型子集切片 + fonts/fonts.css，讓 PWA 離線時字型也正常（不依賴 Google Fonts）
# 用法：
#   1. pip install fonttools brotli
#   2. 從 https://github.com/google/fonts 下載到 tools/fonts-src/（不進版控）：
#        ofl/notosanstc/NotoSansTC[wght].ttf、ofl/notoseriftc/NotoSerifTC[wght].ttf、ofl/mashanzheng/MaShanZheng-Regular.ttf
#   3. 在專案根目錄執行 python tools/gen-fonts.py
#
# 內文字型（Noto Sans TC、Noto Serif TC，用於 --font-body 與 --font-heading）：
#   收錄 index.html、css、js 全部原始碼出現的字（含筆劃庫的名字用字與解讀文字）+ ASCII + 常用標點。
# 書法體（Ma Shan Zheng，用於 --font-display）：只用於標題、等級標籤與「產生的名字」等短字串，
#   只收會以書法體顯示的字（取名用字、常見姓氏、標籤），不跟著內文字型收完整字集，差約 1.7 MB。
#   ⚠️ 新增以 --font-display 顯示的字串時，要把用字加進下面的 LABELS。
# 兩者都不含使用者輸入的罕見字，瀏覽器會自動改用系統字型顯示那個字。
#
# 切片（unicode-range）：每套字型切成多個檔案，瀏覽器只下載畫面上用到的字所在的切片。
#   順序依 tools/font-priority.json（由 tools/collect-font-chars.js 在瀏覽器實際收集）：
#     第 0 片：打開網頁就看到的字 + ASCII 與常用標點 → 首次載入通常只需要這一片
#     接著：示範分析各分頁看到的字 → 這些切片（含第 0 片）由 Service Worker 預先快取
#     其餘：依原始碼出現頻率（介面程式 > 其他程式 > 資料檔）→ 用到時才下載，下載後 Service Worker 會存起來
#   檔名含內容雜湊，內容變了檔名就變，不會拿到舊快取。
#   同時改寫 sw.js 中 fonts:start／fonts:end 之間的預先快取清單。
import collections, glob, hashlib, io, json, os, re
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

SRC = 'tools/fonts-src/'
OUT = 'fonts/'
SLICE = 200    # 每片字數（每字約 270 B（Sans）～ 390 B（Serif），每片另有約 2 KB 固定開銷）

# 標籤：標題、中柱分隔符（和／英文版的 &）、鑑定書標題與印章、五格等級、配對等級
LABELS = '姓名和盤姓名鑑定書命理鑑定天作之合和諧相生平穩相宜尚需調和相沖相剋上等中上中等中下下等'
# 姓氏：常見姓氏，讓「姓氏＋命名用字」產生的名字整組都用書法體顯示
SURNAMES = (
    '陳林黃張李王吳劉蔡楊許鄭謝郭洪邱曾廖賴徐周葉蘇莊呂江何蕭羅高潘簡朱鍾彭游詹胡施沈余盧梁宋鄧杜侯范傅翁藍連柯孫魏溫薛馬方唐石卓馮姚康鄒白秦尤紀董程古'
    '趙錢馮褚衛蔣韓孔曹嚴華金魏陶姜喻柏葛魯韋苗俞袁柳鮑廉岑雷賀倪滕殷畢郝鄔常樂于時皮齊伍卜顧孟平穆尹邵汪祁毛禹狄貝明臧計伏戴談茅龐熊舒屈項祝阮閔席季麻強賈路婁危童顏梅刁駱夏樊凌霍虞萬支管莫房裘繆解應宗丁宣鄧郁單杭包崔龔邢裴陸榮荀羊惠甄封芮靳汲松井段富巫烏焦巴弓牧山谷車侯班秋仲伊宮寧仇欒暴甘厲戎祖武符景束龍幸司韶郜黎薄印宿懷蒲從鄂索咸籍賴藺屠蒙池喬陰胥能蒼雙聞莘黨翟譚貢勞姬申扶堵冉宰酈雍桑桂濮牛壽通邊扈燕冀浦尚農別晏柴瞿閻慕習宦艾魚容向易慎戈庾終暨居衡步都耿滿弘匡國文寇廣祿闕東歐沃利蔚越夔隆師鞏聶晁勾敖融冷辛闞饒空沙養鞠須豐巢關蒯相后荊紅游竺權逯蓋益桓公'
)
# 組出初始介面的檔案：沒被優先字表收到的字裡，這些檔案的字排在前面
UI_FILES = ['index.html', 'js/app.js', 'js/i18n.js', 'js/naming-tools.js']
# 第 0 片一定收的字：ASCII、常用標點，以及日期與時間欄位的瀏覽器內建文字
# （Chrome 的 <input type="time"> 為了算欄位寬度，會把「上午」「下午」都排版一次，畫面上沒顯示也會下載；
#   這些字依使用者語系而定，頁面程式讀不到，collect-font-chars.js 收不到，所以直接列在這裡）
BASIC = {chr(c) for c in range(0x20, 0x7F)} | set('，。、；：？！「」『』（）《》〈〉…—・·') | set('上午下午年月日時分秒')

# 字頻：分三層，同層內依出現次數
def read(path):
    return open(path, encoding='utf8').read()

code_files = ['index.html', 'manifest.json'] + glob.glob('css/*.css') + glob.glob('js/**/*.js', recursive=True)
code_files = [p.replace('\\', '/') for p in code_files if 'vendor' not in p.replace('\\', '/')]
freq = collections.Counter()
tier = {}
for path in code_files:
    text = read(path)
    freq.update(text)
    level = 0 if path in UI_FILES else 2 if path.startswith('js/data/') else 1
    for c in set(text):
        tier[c] = min(tier.get(c, 9), level)

# 內文字型：原始碼全部出現的字
chars = set(freq)
chars |= {chr(c) for c in range(0x20, 0x7F)}           # ASCII
chars |= {chr(c) for c in range(0x3000, 0x3040)}       # CJK 標點
chars |= {chr(c) for c in range(0xFF01, 0xFF5F)}       # 全形英數與標點
chars |= set('‘’“”…—–·•°′″')
body_chars = {c for c in chars if c.isprintable()}
cjk = [c for c in body_chars if 0x3400 <= ord(c) <= 0x9FFF or 0xF900 <= ord(c) <= 0xFAFF]
print('內文收錄字元', len(body_chars), '（漢字', len(cjk), '）')

# 書法體：取名用字（name-chars.js 每筆的「字|意義|特質|性別」取第一欄）+ 姓氏 + 標籤 + ASCII
name_src = read('js/data/name-chars.js')
name_chars = {e.split('|')[0] for e in re.findall(r"'([^']*)'", name_src) if '|' in e}
display_chars = {c for c in name_chars | set(SURNAMES) | set(LABELS) | {chr(c) for c in range(0x20, 0x7F)} if c.isprintable()}
print('書法體收錄字元', len(display_chars), '（取名用字', len(name_chars), '）')

priority = json.load(open('tools/font-priority.json', encoding='utf8'))


def order(chars, family):
    """依優先順序排好並切片，回傳 [(切片的字, 是否預先快取)]"""
    initial = (set(priority['initial'].get(family, '')) | BASIC) & chars
    demo = (set(priority['demo'].get(family, '')) & chars) - initial
    rest = chars - initial - demo
    key = lambda c: (tier.get(c, 9), -freq[c], c)
    slices = [(sorted(initial), True)]
    demo, rest = sorted(demo, key=key), sorted(rest, key=key)
    slices += [(demo[i:i + SLICE], True) for i in range(0, len(demo), SLICE)]
    slices += [(rest[i:i + SLICE], False) for i in range(0, len(rest), SLICE)]
    return slices


def unicode_range(codes):
    """把碼位合併成 CSS unicode-range（連續的寫成 U+4E00-4E05）"""
    codes = sorted(codes)
    parts, start = [], None
    for i, c in enumerate(codes):
        if start is None:
            start = c
        if i + 1 == len(codes) or codes[i + 1] != c + 1:
            parts.append('U+%X' % start if start == c else 'U+%X-%X' % (start, c))
            start = None
    return ', '.join(parts)


def build(src, family, stem, chars, weight, wght=None):
    """回傳 (@font-face 規則, 預先快取的檔名, 全部檔名)"""
    rules, precache, files, total = [], [], [], 0
    for n, (text, pre) in enumerate(order(chars, family)):
        font = TTFont(SRC + src)
        opts = subset.Options()
        opts.layout_features = ['*']
        opts.name_IDs = ['*']
        opts.notdef_outline = True
        opts.hinting = False           # 高解析度螢幕不需要 hinting，可再省一些空間
        sub = subset.Subsetter(opts)
        sub.populate(text=''.join(text))
        sub.subset(font)
        if wght and 'fvar' in font:
            # 只保留用得到的字重範圍，檔案較小。
            # updateFontNames：原檔的 wght 預設值是 200（ExtraLight），不更新名稱表的話，
            # 縮到 400 起之後字型仍自稱 ExtraLight（實際渲染沒問題，但名稱會誤導）。
            font = instancer.instantiateVariableFont(font, {'wght': wght}, updateFontNames=True)
        # unicode-range 只列字型真的有的字：書法體沒有的繁體字不該觸發下載，直接退回下一個字型
        codes = [ord(c) for c in text if ord(c) in font.getBestCmap()]
        if not codes:
            continue
        font.flavor = 'woff2'
        buf = io.BytesIO()
        font.save(buf)
        data = buf.getvalue()
        name = '%s-%d.%s.woff2' % (stem, n, hashlib.sha1(data).hexdigest()[:8])
        open(OUT + name, 'wb').write(data)
        total += len(data)
        files.append(name)
        if pre:
            precache.append(name)
        rules.append("@font-face {\n  font-family: '%s';\n  src: url('%s') format('woff2');\n  font-weight: %s;\n"
                     "  font-style: normal;\n  font-display: swap;\n  unicode-range: %s;\n}\n" % (family, name, weight, unicode_range(codes)))
    size = lambda names: round(sum(os.path.getsize(OUT + f) for f in names) / 1024)
    print('%s：%d 片，共 %d KB；第 0 片 %d KB；預先快取 %d 片 %d KB' % (
        family, len(files), round(total / 1024), size(files[:1]), len(precache), size(precache)))
    return rules, precache, files


os.makedirs(OUT, exist_ok=True)
for old in glob.glob(OUT + '*.woff2'):
    os.remove(old)

css, precache = [], []
for args in [('NotoSansTC[wght].ttf', 'Noto Sans TC', 'NotoSansTC', body_chars, '400 700', (400, 700)),
             ('NotoSerifTC[wght].ttf', 'Noto Serif TC', 'NotoSerifTC', body_chars, '400 900', (400, 900)),
             ('MaShanZheng-Regular.ttf', 'Ma Shan Zheng', 'MaShanZheng', display_chars, '400', None)]:
    rules, pre, files = build(*args)
    css += rules
    precache += pre

header = ('/* 由 tools/gen-fonts.py 產生，請勿手動修改。\n'
          '   每套字型依 unicode-range 切片，瀏覽器只下載畫面上用到的字所在的切片。\n'
          '   書法體為簡體字型，沒有的繁體字（含標題的「盤」）自動退回 Noto Serif TC。 */\n')
open(OUT + 'fonts.css', 'w', encoding='utf8', newline='\n').write(header + '\n'.join(css))

# sw.js：預先快取 fonts.css 與初始、示範畫面會用到的切片
sw = read('sw.js')
lines = ''.join("  './fonts/%s',\n" % f for f in ['fonts.css'] + precache)
sw, count = re.subn(r"(  // fonts:start[^\n]*\n).*?(  // fonts:end)", lambda m: m.group(1) + lines + m.group(2), sw, flags=re.S)
if count != 1:
    raise SystemExit('sw.js 找不到 // fonts:start 與 // fonts:end')
open('sw.js', 'w', encoding='utf8', newline='\n').write(sw)
print('fonts.css：%d 條 @font-face；sw.js 預先快取 %d 個字型切片' % (len(css), len(precache)))
