# 重新產生 js/data/stroke-db.js（姓名學用的康熙筆劃）
# 用法：
#   1. 下載 https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip，解壓到 tools/unihan/
#   2. 在專案根目錄執行 python tools/gen-stroke-db.py        （只列出差異）
#                     python tools/gen-stroke-db.py --write （寫入）
# 規則見產生的檔案開頭註解；目前的 stroke-db.js 會當成「舊資料」，所以重跑結果不變，只會補上新字
#  - 數字一到十：依數值（姓名學慣例）
import re, collections, sys
D = 'tools/unihan/'
ROOT = ''

def rad_strokes(n):
    for hi, s in [(6,1),(29,2),(60,3),(94,4),(117,5),(146,6),(166,7),(175,8),(186,9),(194,10),(200,11),(204,12),(208,13),(210,14),(211,15),(213,16),(214,17)]:
        if n <= hi: return s

# 簡寫部首：水 手 心 犬 玉 示 衣 肉 艸 辵 阜 邑 网 老
ABBREV = {85, 64, 61, 94, 96, 113, 145, 130, 140, 162, 170, 163, 122, 125}
NUMERALS = dict(zip('一二三四五六七八九十', range(1, 11)))

rs, total = {}, {}
for line in open(D + 'Unihan_IRGSources.txt', encoding='utf8'):
    if line.startswith('#') or not line.strip(): continue
    cp, key, val = line.rstrip('\n').split('\t')
    ch = chr(int(cp[2:], 16))
    if key == 'kRSUnicode':
        out = []
        for v in val.split():
            m = re.match(r"(\d+)('*)\.(-?\d+)", v)
            out.append((int(m.group(1)), m.group(2), int(m.group(3))))
        rs[ch] = out
    elif key == 'kTotalStrokes':
        total[ch] = int(val.split()[-1])

def radical(ch):
    """康熙部首（有多個時優先取簡寫部首）"""
    lst = [r for r in rs.get(ch, []) if not r[1]]
    if not lst: return None
    ab = [r for r in lst if r[0] in ABBREV]
    return (ab or lst)[0]

def kangxi(ch):
    if ch in NUMERALS: return NUMERALS[ch]
    r = radical(ch)
    if r and r[0] in ABBREV: return rad_strokes(r[0]) + r[2]
    return total.get(ch)



src = open(ROOT + 'js/data/stroke-db.js', encoding='utf8').read()
old = {m.group(1): int(m.group(2)) for m in re.finditer(r"'(.)':\s*(\d+)", src)}
py = open(ROOT + 'js/data/pinyin-db.js', encoding='utf8').read()
body = py[py.index('BY_PINYIN'):py.index('};', py.index('BY_PINYIN'))]
pychars = set(''.join(re.findall(r":'([^']*)'", body)))
sur = re.search(r"SURNAME\s*[:=]\s*\{([^}]*)\}", py)
if sur: pychars |= set(re.findall(r"'?(.)'?\s*:", sur.group(1)))

# 簡寫部首和康熙原形的筆劃差（台灣寫法；艹 可能 3 或 4、辶 3 或 4、阝 3）
REDUCE = {85: {1}, 64: {1}, 61: {1}, 94: {1}, 96: {1}, 113: {0, 1}, 145: {1}, 130: {2}, 140: {2, 3}, 162: {3, 4}, 170: {5}, 163: {4}, 122: {1}, 125: {2}}

# Unihan 部首外筆劃採現代字形、和康熙不同的字（姓名學慣用值）
OVERRIDE = {'即': 9, '既': 11, '卿': 12, '節': 15, '戴': 18, '琉': 12, '卽': 9, '旣': 11}

def computed(ch):
    r = radical(ch)
    return rad_strokes(r[0]) + r[2] if r else None

out, why = {}, collections.Counter()
changes = []
for ch in sorted(set(old) | pychars):
    if len(ch) != 1 or not ('㐀' <= ch <= '鿿' or '豈' <= ch <= '﫿'): continue
    a = computed(ch)
    o = old.get(ch)
    if ch in NUMERALS: v, k = NUMERALS[ch], 'numeral'
    elif ch in OVERRIDE: v, k = OVERRIDE[ch], 'override'
    elif o is None:
        if a is None: continue
        v, k = a, 'new'
    elif a is None or a == o: v, k = o, 'same'
    else:
        r = radical(ch)
        if r and r[0] in ABBREV and (a - o) in REDUCE[r[0]]: v, k = a, 'radical'
        elif o == total.get(ch): v, k = o, 'keep-total'
        else: v, k = a, 'fix'
    out[ch] = v
    why[k] += 1
    if o is not None and o != v: changes.append((ch, o, v, k))

print(why, 'total', len(out), 'changed', len(changes))
print(' '.join('%s:%d→%d' % c[:3] for c in changes if c[3] == 'fix'))

if '--write' in sys.argv:
    by = collections.defaultdict(list)
    for ch, v in out.items(): by[v].append(ch)
    lines = ['/**',
             ' * 漢字筆劃資料庫 — 姓名學用的康熙筆劃，共 %d 字' % len(out),
             ' * 由 Unicode Unihan（kRSUnicode 部首與部首外筆劃）產生：',
             ' *   部首以康熙原形計（氵→水 4、扌→手 4、忄→心 4、犭→犬 4、王→玉 5、礻→示 5、衤→衣 6、月→肉 6、艹→艸 6、辶→辵 7、阝左→阜 8、阝右→邑 7、罒→网 6、耂→老 6）',
             ' *   數字一到十依數值計（四 4、五 5 … 十 10）',
             ' *   Unihan 部首外筆劃採現代字形的少數字手動校正（即 9、既 11、卿 12、節 15、戴 18、琉 12）',
             ' *   與舊資料不同、且不是部首還原造成的差異：舊值等於 Unicode 總筆劃時保留舊值（成 7、柴 10），否則採部首計算',
             ' * 以 2026-09-27 前的舊資料為基礎，另加入 Big5 常用字',
             ' */', '', 'var strokeMap = {']
    for v in sorted(by):
        lines.append('  // %d劃' % v)
        chars = sorted(by[v])
        for i in range(0, len(chars), 20):
            lines.append('  ' + ' '.join("'%s':%d," % (c, v) for c in chars[i:i + 20]))
    lines[-1] = lines[-1].rstrip(',')
    lines += ['};', '', 'window.strokeMap = strokeMap;', '']
    open(ROOT + 'js/data/stroke-db.js', 'w', encoding='utf8', newline='\n').write('\n'.join(lines))
    print('written')
