# 產生 js/data/char-element.js：依部首判定字五行（只收部首本身明確帶五行的字）
# 用法：先照 gen-stroke-db.py 的說明把 Unihan 解壓到 tools/unihan/，在專案根目錄執行 python tools/gen-char-element.py
import re

RADICAL_ELEMENT = {
    85: '水', 15: '水', 173: '水',              # 水（氵）、冫、雨
    75: '木', 140: '木', 118: '木', 115: '木',  # 木、艸（艹）、竹、禾
    86: '火', 72: '火',                         # 火（灬）、日
    32: '土', 46: '土', 112: '土', 102: '土',   # 土、山、石、田
    167: '金',                                  # 金
}

rad = {}
for line in open('tools/unihan/Unihan_IRGSources.txt', encoding='utf8'):
    if not line.startswith('U+'): continue
    cp, key, val = line.rstrip('\n').split('\t')
    if key != 'kRSUnicode': continue
    first = [v for v in val.split() if "'" not in v]
    if first: rad[chr(int(cp[2:], 16))] = int(first[0].split('.')[0])

src = open('js/data/stroke-db.js', encoding='utf8').read()
chars = sorted(set(re.findall(r"'(.)':\d+", src)))
by = {e: [] for e in '木火土金水'}
for c in chars:
    e = RADICAL_ELEMENT.get(rad.get(c))
    if e: by[e].append(c)

lines = ['/**',
         ' * 字五行：部首明確帶五行的字（由 tools/gen-char-element.py 從 Unihan 部首產生）',
         ' *   水：氵、冫、雨　木：木、艹、竹、禾　火：火、灬、日　土：土、山、石、田　金：金',
         ' * 其他字在 BabyName.elementOf 依字音（五音）判定',
         ' */',
         'window.CharElementByRadical = {']
for e in '木火土金水':
    lines.append("  '%s': '%s'," % (e, ''.join(by[e])))
lines[-1] = lines[-1].rstrip(',')
lines += ['};', '']
open('js/data/char-element.js', 'w', encoding='utf8', newline='\n').write('\n'.join(lines))
print({e: len(v) for e, v in by.items()})
