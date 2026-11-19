# 中英文姓名和盤

輸入成員的中文或英文姓名，即可查看五格、靈數與配對結果。補上出生資料後，可進一步查看八字、占星與紫微合盤。首頁也提供寶寶取名、品牌命名、名字熱門度與家庭命名工具。

這是純前端 PWA。瀏覽器直接載入 HTML、CSS、JavaScript 與隨附字庫。首次連線完成離線快取後，核心分析可離線使用。AI 解讀與 GitHub Gist 同步則需另外設定並連網。

## 在本機試用

在專案根目錄，以 Python 3 啟動靜態伺服器。

```sh
python -m http.server 8000 --bind 127.0.0.1
```

開啟 [本機首頁](http://127.0.0.1:8000/)，點「示範」帶入資料，再點「開始團隊和盤分析」查看結果。按 Ctrl+C 可停止伺服器。

## 修改功能時去哪裡找

| 要修改的部分 | 檔案與職責 |
| --- | --- |
| 首頁表單與結果頁 | `index.html` 定義頁面和腳本載入順序，`js/app.js` 串接輸入、分析與顯示，`css/style.css` 管理版面 |
| 姓名計算與配對 | `js/chinese-numerology.js`、`js/english-numerology.js` 計算個人結果，`js/pair-harmony.js`、`js/chart-harmony.js` 處理合盤 |
| 生辰命盤 | `js/zodiac-bazi.js`、`js/bazi-advanced.js`、`js/astrology.js`、`js/ziwei*.js` |
| 取名與讀音 | `js/naming-tools.js` 串接工具介面，`js/baby-name.js`、`js/naming-extensions.js`、`js/phonetics.js` 處理取名與音韻 |
| 字庫與中英切換 | `js/data/` 放筆劃、讀音、名字等資料，`js/i18n.js` 與 `js/l10n/` 提供介面與解讀譯文 |
| 備份、同步與 AI | `js/data-backup.js` 處理匯出與還原，`js/cloud-sync.js` 處理 Gist 同步，`js/ai-reading.js` 處理解讀請求 |
| 安裝與離線資源 | `manifest.json` 定義安裝資訊，`img/` 放圖示，`fonts/` 放自架字型，`sw.js` 管理離線快取 |

## 執行測試

使用 Node.js 與 npm，在專案根目錄執行 `npm test`（Windows PowerShell 可用 `npm.cmd test`）。這個指令依序執行下列兩套檢查，使用 Node.js 內建模組，無須安裝套件或啟動網站。

| 單獨執行 | 檢查範圍 |
| --- | --- |
| `node tools/test-naming.js` | 取名評分、姓名資料覆蓋、音韻與翻譯 |
| `node tools/test-advanced.js` | 命盤合盤、JSON 備份、雲端合併與離線佇列 |

介面與離線測試使用固定的網站連接埠。先執行 `python -m http.server 8765 --bind 127.0.0.1`，再依 [瀏覽器測試腳本](tools/browser-smoke.js) 開啟使用獨立設定檔的 Edge。使用提供全域 WebSocket 的 Node.js（例如 Node.js 24），在另一個終端機依需要執行以下指令。

```sh
node tools/browser-smoke.js
node tools/browser-advanced.js
node tools/browser-offline.js
```

三支腳本分別檢查首頁取名操作、進階合盤與備份介面，以及斷網後的頁面與字型。瀏覽器偵錯連接埠預設為 9222，可透過環境變數 `CDP_PORT` 指定其他偵錯埠。

## 更新字庫與離線資源

- **字庫**依資料種類使用 `tools/gen-stroke-db.py`、`gen-char-element.py`、`gen-dialect-db.py` 或 `gen-name-trends.py`。各腳本開頭列出來源與操作方式，從專案根目錄執行。
- **字型**先以 `tools/collect-font-chars.js` 更新優先用字，再執行 `python tools/gen-fonts.py`。產生器會一併更新字型切片、`fonts/fonts.css` 與 `sw.js` 的字型預載清單。
- **離線快取**採快取優先。發佈修改過的快取資源時，更新 `sw.js` 的 `CACHE_NAME`；新增頁面所需的腳本或樣式時，也要將路徑加入 `ASSETS_TO_CACHE`。

歷次功能變更、資料來源與待辦事項見 [工作日誌](WORKLOG.md)。
