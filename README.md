# 歐式 21 點練習

歐式 21 點（莊家無底牌）基本策略練習。一手一手出題，你做決定後立刻告訴你是否符合策略表。
純前端（HTML + CSS + JavaScript），可架在 GitHub Pages，並支援離線使用。

## 功能

- **單手練習**：不用下注、不算籌碼，每手都是一道題。
- **對照自製策略表**：每次要牌 / 停牌 / 加倍 / 分牌 / 投降後，立刻顯示對錯與圖表上的格子（例如「硬 16 對莊家 10：圖表 X/H，應該投降」）。
- **題型篩選**：全部隨機、只練硬牌、只練軟牌（A,x）、只練對子。
- **統計**：答題數、正確率、連續答對、最佳紀錄。
- **策略表**：「策略表」分頁或練習時按「看策略表」可隨時查看 `chart.png`。
- **離線使用**：第一次開啟後所有檔案會存進快取，沒網路也能練習。

快捷鍵：`H` 要牌、`S` 停牌、`D` 加倍、`P` 分牌、`R` 投降、`Enter` 下一手。

## 練習規則

莊家沒有底牌，玩家行動完才補牌；莊家 Blackjack 時加倍、分牌的注碼全輸。莊家軟 17 停牌。
任意兩張可加倍、分牌後可加倍、只能分牌一次、分 A 只發一張。開局兩張可投降。

## 換成別的策略表

- **只換圖片**：用同名檔案 `chart.png` 覆蓋即可。
- **判斷對錯的規則**寫在 `engine.js` 的 `HARD`、`SOFT`、`PAIRS` 三張表裡，每一列是莊家 2～A 的十個格子，代號與圖上相同（`P` 代表 SP、`X` 代表 X/H）。換了圖記得也改這三張表。

## 架到 GitHub Pages（網頁上傳）

1. 登入 GitHub，按右上角 **+ → New repository**，取個名字（例如 `euro-blackjack`），選 **Public**，按 **Create repository**。
2. 點 **uploading an existing file**，把資料夾裡的所有檔案拖進去，按 **Commit changes**。
   - 包含 `chart.png`、`icons` 資料夾（整個資料夾拖進去）和 `.nojekyll`（隱藏檔，需在檔案總管開啟「顯示隱藏的項目」）。
   - 不需要上傳 `.claude` 資料夾。
3. 到 **Settings → Pages**，**Source** 選 **Deploy from a branch**，Branch 選 `main`、資料夾 `/ (root)`，按 **Save**。
4. 等一兩分鐘，網址會是 `https://<你的帳號>.github.io/euro-blackjack/`。

## 離線使用

- **手機**：開啟網址一次，然後「加入主畫面」（iPhone Safari：分享 → 加入主畫面；Android Chrome：選單 → 安裝應用程式）。
- **電腦**：Chrome / Edge 網址列右邊會出現「安裝」圖示。
- **完全不連網**：也可以直接雙擊 `index.html` 用瀏覽器開啟。

## 更新版本

在 GitHub 上更新檔案後，使用者下一次開啟會在背景下載新版，再下一次開啟就會是新版。
若新增或刪除檔案，記得同步更新 `sw.js` 裡的 `ASSETS`，並把 `CACHE` 版本號加一（例如 `euro-bj-v3`）。

## 檔案說明

| 檔案 | 用途 |
| --- | --- |
| `index.html` | 頁面結構 |
| `style.css` | 樣式 |
| `engine.js` | 發牌、規則、結算、策略表判斷 |
| `app.js` | 畫面互動、統計 |
| `chart.png` | 策略表圖片 |
| `sw.js` | Service Worker，負責離線快取 |
| `manifest.webmanifest` | PWA 安裝資訊 |
| `icons/` | App 圖示 |
| `.nojekyll` | 讓 GitHub Pages 直接提供檔案 |
