# 產生 js/data/name-trends.js：美國 SSA 各年代英文名排名 + 台灣各出生年代前十大名字
# 用法：
#   1. 下載 SSA 逐年檔 yob1940.txt ~ yob2024.txt 到 tools/ssa/
#      （ssa.gov 的 names.zip 會擋自動下載；鏡像：https://github.com/dxdc/babynames 的 raw/ 目錄）
#   2. 在專案根目錄執行 python tools/gen-name-trends.py
import collections, json

DECADES = list(range(1940, 2030, 10))   # 2020 年代只到 2024
LATEST = 2024

# SSA 2025 年前十名（2026-05-08 官方公布；完整逐年檔尚未有可下載的鏡像）
TOP_2025 = {
    'M': ['Liam', 'Noah', 'Oliver', 'Theodore', 'Henry', 'James', 'Elijah', 'Mateo', 'William', 'Lucas'],
    'F': ['Olivia', 'Charlotte', 'Emma', 'Amelia', 'Sophia', 'Mia', 'Isabella', 'Evelyn', 'Sofia', 'Eliana'],
}

# 內政部戶政司《全國姓名統計分析》112 年版，統計表五十六「各出生年前十大名字排名與人數按性別分」（第 280–281 頁）
# 人數是 112 年 6 月 30 日仍設籍者，依出生年代分組；民國 1–9 年人數太少，不收
TW_DECADES = [
    # (民國起年, 民國迄年, 男性前十, 女性前十)
    (10, 19, '金龍46 金水44 金生40 水木38 清泉31 金木29 添福29 傑29 榮華29 福來29',
             '秀英340 玉蘭263 玉英201 玉187 梅175 月英164 彩雲155 月娥145 秀琴139 金枝137'),
    (20, 29, '正雄768 文雄760 武雄673 義雄545 金龍354 金水337 俊雄323 國雄314 秀雄284 正義263',
             '秀英2237 玉蘭1704 梅1614 秀琴1547 雪1472 玉英1434 月娥1329 玉1245 秀蘭1242 菊1197'),
    (30, 39, '武雄2262 正雄2216 文雄2053 義雄1606 勝雄1182 國雄1041 金龍982 正義958 茂雄914 進財905',
             '秀英5026 秀琴4444 美玉3851 秀蘭3553 月娥3459 秀鳳3296 玉蘭3017 玉英2863 秀美2841 月英2702'),
    (40, 49, '金龍2427 進財2101 榮華1983 進興1912 明輝1839 明德1781 文龍1659 進發1640 聰明1629 文章1544',
             '麗華11120 秀琴8813 秀英7661 秀美7540 麗珠7308 美玉7201 美珠6953 美華6674 秀鳳6602 淑貞6472'),
    (50, 59, '志明4577 志成3360 文雄2530 明德2415 明輝2400 金龍2380 俊雄2258 志宏2255 文龍2221 國華2196',
             '淑芬14492 美玲13562 淑惠12531 美惠10137 淑娟9094 淑貞8820 麗華8459 美華8215 麗娟8173 淑華7998'),
    (60, 69, '志偉4847 志明4739 建宏4231 志豪4161 志強3939 俊宏3806 志宏3615 俊傑3211 志忠3152 家豪2667',
             '淑芬10644 雅惠10471 淑娟8424 淑惠8277 雅玲7624 美玲7240 怡君5703 美惠5575 雅雯5473 淑華5160'),
    (70, 79, '家豪4864 志豪3964 志偉3531 宗翰3254 建宏3149 俊傑3122 俊宏3030 冠宇2104 家銘1980 信宏1903',
             '雅婷11310 怡君8316 雅雯5983 欣怡5271 怡婷4626 雅惠4177 雅玲3906 婉婷3586 佩珊3435 佳蓉3155'),
    (80, 89, '家豪4039 冠宇3603 冠廷3399 承翰3008 宗翰2831 柏翰2594 彥廷2502 冠霖2114 俊傑2084 承恩1918',
             '雅婷5797 怡君3575 怡婷3183 雅雯3084 詩涵3006 鈺婷2775 怡萱2729 雅筑2700 郁婷2600 宜庭2555'),
    (90, 99, '承恩2997 承翰2636 冠廷2452 冠宇2206 宇翔1938 柏翰1885 彥廷1610 冠霖1509 柏宇1471 柏諺1409',
             '宜蓁2629 欣妤1643 詩涵1610 思妤1561 雅婷1439 宜庭1394 佳穎1375 品妤1336 子涵1271 怡萱1258'),
    (100, 109, '承恩2215 宥廷2036 品睿2021 宸睿1904 宇恩1860 宇翔1713 承翰1556 宥辰1532 柏睿1511 睿恩1503',
               '品妍2421 子晴2087 詠晴2001 品妤1697 禹彤1578 羽彤1434 芯語1342 宥蓁1226 語彤1221 苡晴1164'),
    (110, 112, '恩碩469 宥廷366 子睿327 承恩322 品睿316 宇恩315 宸睿309 睿恩286 子宸267 子恩262',
               '品妍355 苡菲306 雨霏301 芸菲294 芯語285 苡安283 玥彤280 羽彤276 子晴260 禹彤258'),
]
# 同份報告第 56 頁：全體國人前十大常見名字
TW_OVERALL = (
    '家豪14038 志明12719 建宏12196 俊傑12187 俊宏11189 志豪10676 志偉10563 承翰9726 冠宇9655 志強9101',
    '淑芬31879 淑惠30420 美玲27487 麗華25624 美惠25015 淑貞23904 雅婷23407 秀英23020 淑娟22828 秀琴22266',
)


def parse_tw(s):
    out = []
    for tok in s.split():
        i = next(k for k, ch in enumerate(tok) if ch.isdigit())
        out.append([tok[:i], int(tok[i:])])
    assert len(out) == 10, s
    assert all(out[k][1] >= out[k + 1][1] for k in range(9)), s
    return out


def load(year):
    d = {'F': {}, 'M': {}}
    for line in open(f'tools/ssa/yob{year}.txt', encoding='utf8'):
        name, sex, count = line.strip().split(',')
        d[sex][name] = int(count)
    return d


def ranks(counter):
    return {n: i + 1 for i, (n, _) in enumerate(counter.most_common())}


decade_counts = {s: {D: collections.Counter() for D in DECADES} for s in 'FM'}
for y in range(DECADES[0], LATEST + 1):
    d = load(y)
    for s in 'FM':
        decade_counts[s][y // 10 * 10].update(d[s])
latest = load(LATEST)

us = {'decades': DECADES, 'latest': LATEST, 'top2025': TOP_2025}
for s in 'FM':
    rk = {D: ranks(decade_counts[s][D]) for D in DECADES}
    r_latest = ranks(collections.Counter(latest[s]))
    names = set()
    for D in DECADES:
        names |= {n for n, r in rk[D].items() if r <= 1000}
    rows = []
    for n in sorted(names):
        cells = [rk[D].get(n, 0) for D in DECADES] + [r_latest.get(n, 0)]
        rows.append(n + ':' + ','.join(str(r) if 0 < r <= 1000 else '' for r in cells))
    us[s] = '|'.join(rows)

tw = {
    'asOf': '民國 112 年 6 月 30 日',
    'decades': [{'from': a + 1911, 'to': min(b, 112) + 1911, 'label': f'民國 {a}–{b} 年',
                 'M': parse_tw(m), 'F': parse_tw(f)} for a, b, m, f in TW_DECADES],
    'overall': {'M': parse_tw(TW_OVERALL[0]), 'F': parse_tw(TW_OVERALL[1])},
}

with open('js/data/name-trends.js', 'w', encoding='utf8', newline='\n') as f:
    f.write('/**\n'
            ' * 姓名熱門度資料（由 tools/gen-name-trends.py 產生，請勿手動修改）\n'
            ' * us：美國 SSA 各年代排名。F/M 為「名字:1940年代,1950年代,...,2020年代,' + str(LATEST) + '年」，\n'
            ' *     只收曾進入任一年代前 1,000 名的名字；空白表示該年代不在前 1,000 名。2020 年代為 2020–' + str(LATEST) + '。\n'
            ' * tw：內政部戶政司《全國姓名統計分析》112 年版，各出生年代前十大名字與人數（統計表五十六）。\n'
            ' */\n')
    f.write('window.NameTrends = ')
    json.dump({'us': us, 'tw': tw}, f, ensure_ascii=False, separators=(',', ':'))
    f.write(';\n')
print('F', us['F'].count('|') + 1, 'M', us['M'].count('|') + 1)
