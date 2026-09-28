# 產生 fonts/*.woff2：自架字型子集，讓 PWA 離線時字型也正常（不依賴 Google Fonts）
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
import glob, os, re
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

SRC = 'tools/fonts-src/'
OUT = 'fonts/'

# 標籤：標題、中柱分隔符（和／英文版的 &）、鑑定書標題與印章、五格等級、配對等級
LABELS = '姓名和盤姓名鑑定書命理鑑定天作之合和諧相生平穩相宜尚需調和相沖相剋上等中上中等中下下等'
# 姓氏：常見姓氏，讓「姓氏＋命名用字」產生的名字整組都用書法體顯示
SURNAMES = (
    '陳林黃張李王吳劉蔡楊許鄭謝郭洪邱曾廖賴徐周葉蘇莊呂江何蕭羅高潘簡朱鍾彭游詹胡施沈余盧梁宋鄧杜侯范傅翁藍連柯孫魏溫薛馬方唐石卓馮姚康鄒白秦尤紀董程古'
    '趙錢馮褚衛蔣韓孔曹嚴華金魏陶姜喻柏葛魯韋苗俞袁柳鮑廉岑雷賀倪滕殷畢郝鄔常樂于時皮齊伍卜顧孟平穆尹邵汪祁毛禹狄貝明臧計伏戴談茅龐熊舒屈項祝阮閔席季麻強賈路婁危童顏梅刁駱夏樊凌霍虞萬支管莫房裘繆解應宗丁宣鄧郁單杭包崔龔邢裴陸榮荀羊惠甄封芮靳汲松井段富巫烏焦巴弓牧山谷車侯班秋仲伊宮寧仇欒暴甘厲戎祖武符景束龍幸司韶郜黎薄印宿懷蒲從鄂索咸籍賴藺屠蒙池喬陰胥能蒼雙聞莘黨翟譚貢勞姬申扶堵冉宰酈雍桑桂濮牛壽通邊扈燕冀浦尚農別晏柴瞿閻慕習宦艾魚容向易慎戈庾終暨居衡步都耿滿弘匡國文寇廣祿闕東歐沃利蔚越夔隆師鞏聶晁勾敖融冷辛闞饒空沙養鞠須豐巢關蒯相后荊紅游竺權逯蓋益桓公'
)

# 內文字型：原始碼全部出現的字
chars = set()
for path in ['index.html', 'manifest.json'] + glob.glob('css/*.css') + glob.glob('js/**/*.js', recursive=True):
    if 'vendor' in path.replace('\\', '/'):
        continue
    chars |= set(open(path, encoding='utf8').read())
chars |= {chr(c) for c in range(0x20, 0x7F)}           # ASCII
chars |= {chr(c) for c in range(0x3000, 0x3040)}       # CJK 標點
chars |= {chr(c) for c in range(0xFF01, 0xFF5F)}       # 全形英數與標點
chars |= set('‘’“”…—–·•°′″')
text = ''.join(sorted(c for c in chars if c.isprintable()))
cjk = [c for c in text if 0x3400 <= ord(c) <= 0x9FFF or 0xF900 <= ord(c) <= 0xFAFF]
print('內文收錄字元', len(text), '（漢字', len(cjk), '）')

# 書法體：取名用字（name-chars.js 每筆的「字|意義|特質|性別」取第一欄）+ 姓氏 + 標籤 + ASCII
name_src = open('js/data/name-chars.js', encoding='utf8').read()
name_chars = {e.split('|')[0] for e in re.findall(r"'([^']*)'", name_src) if '|' in e}
display_chars = name_chars | set(SURNAMES) | set(LABELS) | {chr(c) for c in range(0x20, 0x7F)}
display = ''.join(sorted(c for c in display_chars if c.isprintable()))
print('書法體收錄字元', len(display), '（取名用字', len(name_chars), '）')


def build(src, out, text, wght=None):
    font = TTFont(SRC + src)
    opts = subset.Options()
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    opts.hinting = False           # 高解析度螢幕不需要 hinting，可再省一些空間
    sub = subset.Subsetter(opts)
    sub.populate(text=text)
    # 先子集再實例化：部分實例化會丟掉「不隨字重變化」字形的 gvar 項目（此字型的製表符號等
    # 229 個），子集化工具卻假設每個字形都有，會 KeyError。先子集也快得多。
    sub.subset(font)
    if wght and 'fvar' in font:
        # 只保留用得到的字重範圍，檔案較小。
        # updateFontNames：原檔的 wght 預設值是 200（ExtraLight），不更新名稱表的話，
        # 縮到 400 起之後字型仍自稱 ExtraLight（實際渲染沒問題，但名稱會誤導）。
        font = instancer.instantiateVariableFont(font, {'wght': wght}, updateFontNames=True)
    os.makedirs(OUT, exist_ok=True)
    font.flavor = 'woff2'
    font.save(OUT + out)
    print(out, round(os.path.getsize(OUT + out) / 1024), 'KB')


build('NotoSansTC[wght].ttf', 'NotoSansTC-subset.woff2', text, wght=(400, 700))
build('NotoSerifTC[wght].ttf', 'NotoSerifTC-subset.woff2', text, wght=(400, 900))
build('MaShanZheng-Regular.ttf', 'MaShanZheng-display.woff2', display)
