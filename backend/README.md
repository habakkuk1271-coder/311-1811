# 311／1811 V2 後端遷移

此分支為平行施工，不影響 main 正式站。

## 固定架構
- 前端：GitHub Pages
- 資料：Google Sheets
- API：Google Apps Script Web App
- 不使用 Supabase / ChatGPT Sites

## 資料表
Google Sheet ID: 1t7u7aMsj3imueMN6Qa0OPcaLWnnpg2i7aRLLJCF0NUE
分頁：網站設定、公告、本週操練、活動、歷次活動、活動模板。

## 部署 Apps Script
1. 在上述 Google Sheet 開啟「擴充功能 → Apps Script」。
2. 將 backend/Code.gs 貼入 Code.gs。
3. 在「專案設定 → 指令碼屬性」建立 ADMIN_TOKEN，值請用長且不可猜的隨機字串。
4. 部署 → 新部署 → 網頁應用程式；執行身分選自己；存取權依公開站讀取需求設定。
5. 將部署後 /exec URL 填入 V2 前端的 API_URL。

## 安全原則
ADMIN_TOKEN 不得提交到 GitHub 公開 repository。正式切換前需完成讀取、寫入、錯誤回退與手機 Safari 驗收。
