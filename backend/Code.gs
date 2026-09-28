const SHEET_ID = '1t7u7aMsj3imueMN6Qa0OPcaLWnnpg2i7aRLLJCF0NUE';

function doGet(e) {
  try {
    const action = String((e && e.parameter && e.parameter.action) || 'public');
    if (action === 'health') return json_({ok:true, service:'311-1811-v2', time:new Date().toISOString()});
    if (action === 'public') return json_({ok:true, data:readPublic_(), time:new Date().toISOString()});
    return json_({ok:false, error:'unknown_action'});
  } catch (err) {
    return json_({ok:false, error:String(err && err.message || err)});
  }
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const token = String(body.token || '');
    const expected = PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN') || '';
    if (!expected || token !== expected) return json_({ok:false, error:'unauthorized'});
    if (body.action === 'save') {
      saveEditable_(body.data || {});
      return json_({ok:true, data:readPublic_(), time:new Date().toISOString()});
    }
    return json_({ok:false, error:'unknown_action'});
  } catch (err) {
    return json_({ok:false, error:String(err && err.message || err)});
  }
}

function readPublic_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  return {
    notice: objectFromFirstDataRow_(ss.getSheetByName('公告')),
    practice: objectFromFirstDataRow_(ss.getSheetByName('本週操練')),
    events: table_(ss.getSheetByName('活動')),
    archive: table_(ss.getSheetByName('歷次活動')),
    templates: table_(ss.getSheetByName('活動模板'))
  };
}

function saveEditable_(data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    if (data.notice) writeObjectRow_(ss.getSheetByName('公告'), data.notice);
    if (data.practice) writeObjectRow_(ss.getSheetByName('本週操練'), data.practice);
    if (data.event) upsertCurrentEvent_(ss.getSheetByName('活動'), data.event);
  } finally {
    lock.releaseLock();
  }
}

function table_(sheet) {
  if (!sheet) return [];
  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);
  return values.slice(1).filter(r => r.some(Boolean)).map(r => {
    const o = {}; headers.forEach((h,i) => o[h] = r[i] == null ? '' : String(r[i])); return o;
  });
}

function objectFromFirstDataRow_(sheet) {
  const rows = table_(sheet);
  return rows[0] || {};
}

function writeObjectRow_(sheet, obj) {
  const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0];
  const row = headers.map(h => obj[h] == null ? '' : String(obj[h]));
  sheet.getRange(2,1,1,row.length).setValues([row]);
}

function upsertCurrentEvent_(sheet, obj) {
  const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0];
  const values = sheet.getDataRange().getDisplayValues();
  let target = 2;
  for (let i=1;i<values.length;i++) {
    if (values[i][headers.indexOf('lifecycle')] === 'current') { target=i+1; break; }
  }
  const row = headers.map(h => obj[h] == null ? '' : String(obj[h]));
  sheet.getRange(target,1,1,row.length).setValues([row]);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
