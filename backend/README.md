# 311／1811 V2 後端遷移

此分支為平行施工，不影響 main 正式站。

## 固定架構
- 前端：GitHub Pages
- 資料：Google Sheets
- API：Google Apps Script Web App
- 不使用 Supabase / ChatGPT Sites

## 資料表
Google Sheet ID: 1t7u7aMsj3imueMN6Qa0OPcaLWnnpg2i7aRLLJCF0NUE
分頁：網站設定、公告、本週操練、操練歷史、活動、歷次活動、活動模板。

## 每週管理行為
- 管理頁是日常唯一需要操作的介面；Google Sheet 是保存資料與備份的位置。
- 發布不同日期範圍的本週操練時，舊內容會自動保存到「操練歷史」。
- 在管理頁選擇「建立下一個活動」並發布時，原本的目前活動會自動封存到「歷次活動」。
- 精選照片、OneDrive 相簿、精選影片與活動詳情連結會隨封存一併保留。

## 部署 Apps Script
1. 在上述 Google Sheet 開啟「擴充功能 → Apps Script」。
2. 將 backend/Code.gs 貼入 Code.gs。
3. 在「專案設定 → 指令碼屬性」建立 ADMIN_TOKEN，值請用長且不可猜的隨機字串。
4. 部署 → 新部署 → 網頁應用程式；執行身分選自己；存取權依公開站讀取需求設定。
5. 將部署後 /exec URL 填入 V2 前端的 API_URL。

## 安全原則
ADMIN_TOKEN 不得提交到 GitHub 公開 repository。正式切換前需完成讀取、寫入、錯誤回退與手機 Safari 驗收。
## 管理流程補充

- 每週在 `admin.html` 更新公告與本週操練；改變操練日期範圍時，上一週會自動存進 `操練歷史`。
- 在管理頁建立下一個活動並發布，前一個目前活動會安全封存到 `歷次活動`，相同活動不會重複封存。
- 「補充歷次活動內容」可為已封存活動補上 OneDrive 精選照片、相簿、影片與詳情；不會動到目前活動。
