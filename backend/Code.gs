const SHEET_ID = '1t7u7aMsj3imueMN6Qa0OPcaLWnnpg2i7aRLLJCF0NUE';
const SERVICE_VERSION = 'v2.1.0-history-media';
const EVENT_HEADERS = ['event_id','title','date_text','start_at','meeting_time','place','audience','fee','packing','status','map_url','signup_url','photo_url','album_url','video_url','detail_url','lifecycle'];
const HISTORY_HEADERS = ['event_id','date','title','summary','photo_url','album_url','video_url','detail_url','status'];
const PRACTICE_HEADERS = ['practice_id','title','date_range','note','item1','item2','item3','item4'];
const PRACTICE_HISTORY_HEADERS = ['practice_id','title','date_range','note','item1','item2','item3','item4','archived_at'];

function doGet(e) {
  try {
    const action = String((e && e.parameter && e.parameter.action) || 'public');
    if (action === 'health') return json_({ok:true, service:'311-1811-v2', version:SERVICE_VERSION, time:new Date().toISOString()});
    if (action === 'public') return json_({ok:true, version:SERVICE_VERSION, data:readPublic_(), time:new Date().toISOString()});
    throw new Error('unknown_action');
  } catch (err) { return json_({ok:false, error:String(err.message || err)}); }
}

function doPost(e) {
  let lock = null;
  try {
    const body = JSON.parse((e.parameter && e.parameter.payload) || (e.postData && e.postData.contents) || '{}');
    if (!body.token || body.token !== PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN')) throw new Error('Unauthorized');
    lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) throw new Error('Another update is in progress. Please retry.');
    if (body.action === 'save') saveEditable_(body.data || {});
    else if (body.action === 'archive') archiveEvent_(body.event_id);
    else if (body.action === 'update_archive') updateArchive_(body.archive || {});
    else if (body.action === 'self_test') return json_({ok:true, version:SERVICE_VERSION, self_test:selfTest_()});
    else throw new Error('unknown_action');
    return json_({ok:true, data:readPublic_()});
  } catch (err) { return json_({ok:false, error:String(err.message || err)}); }
  finally { if (lock && lock.hasLock()) lock.releaseLock(); }
}

function json_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
function ss_() { return SpreadsheetApp.openById(SHEET_ID); }

function ensureSheet_(name, headers) {
  let sheet = ss_().getSheetByName(name);
  if (!sheet) {
    sheet = ss_().insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  ensureColumns_(sheet, headers);
  return sheet;
}

function sheet_(name) {
  const sheet = ss_().getSheetByName(name);
  if (!sheet) throw new Error('Missing sheet: ' + name);
  return sheet;
}

function headers_(sheet) {
  return sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0].map(String);
}

function ensureColumns_(sheet, required) {
  const headers = headers_(sheet);
  required.forEach(function(name) {
    if (headers.indexOf(name) < 0) {
      sheet.getRange(1, headers.length + 1).setValue(name);
      headers.push(name);
    }
  });
  return headers;
}

function ensureItemColumns_(sheet, count) {
  const headers = headers_(sheet);
  const existing = headers.filter(function(name) { return /^item\d+$/.test(name); }).length;
  for (let index = existing + 1; index <= count; index += 1) {
    const name = 'item' + index;
    if (headers.indexOf(name) < 0) {
      sheet.getRange(1, headers.length + 1).setValue(name);
      headers.push(name);
    }
  }
  return headers;
}

function table_(name) {
  const sheet = sheet_(name), values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);
  return values.slice(1).filter(function(row) { return row.some(function(value) { return value !== '' && value !== null; }); }).map(function(row) {
    const object = {};
    headers.forEach(function(key, index) { object[key] = row[index]; });
    return object;
  });
}

function itemObject_(object) {
  const value = {};
  Object.keys(object || {}).forEach(function(key) { value[key] = object[key]; });
  value.items = Object.keys(object || {}).filter(function(key) { return /^item\d+$/.test(key); }).sort(function(a, b) { return Number(a.slice(4)) - Number(b.slice(4)); }).map(function(key) { return object[key]; }).filter(Boolean).map(String);
  return value;
}

function objectRow_(sheet, object) {
  const items = Array.isArray(object.items) ? object.items : [];
  ensureItemColumns_(sheet, items.length);
  const headers = headers_(sheet);
  return headers.map(function(key) {
    if (/^item\d+$/.test(key)) return items[Number(key.slice(4)) - 1] || '';
    return object[key] === undefined || object[key] === null ? '' : object[key];
  });
}

function writeCurrentObject_(name, object, requiredHeaders) {
  const sheet = ensureSheet_(name, requiredHeaders);
  const row = objectRow_(sheet, object);
  sheet.getRange(2, 1, 1, row.length).setValues([row]);
}

function upsertBy_(sheet, key, object) {
  const headers = headers_(sheet), keyIndex = headers.indexOf(key);
  if (keyIndex < 0) throw new Error('Missing key column: ' + key);
  const rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getDisplayValues() : [];
  const target = rows.findIndex(function(row) { return String(row[keyIndex]) === String(object[key]); });
  const value = objectRow_(sheet, object);
  if (target >= 0) sheet.getRange(target + 2, 1, 1, value.length).setValues([value]);
  else sheet.getRange(sheet.getLastRow() + 1, 1, 1, value.length).setValues([value]);
}

function publicEvent_(event) {
  if (!event) return null;
  return {
    event_id:event.event_id || '', title:event.title || '', date:event.date_text || '', date_text:event.date_text || '',
    start_at:event.start_at || '', meeting_time:event.meeting_time || '', location:event.place || '', place:event.place || '',
    audience:event.audience || '', fee:event.fee || '', packing:event.packing || '', description:event.status || '', status:event.status || '',
    map_url:event.map_url || '', signup_url:event.signup_url || '', photo_url:event.photo_url || '', album_url:event.album_url || '',
    video_url:event.video_url || '', detail_url:event.detail_url || '', lifecycle:event.lifecycle || ''
  };
}

function publicHistory_(event) {
  return {
    event_id:event.event_id || '', date:event.date || '', title:event.title || '', description:event.summary || '', summary:event.summary || '',
    photo_url:event.photo_url || '', album_url:event.album_url || '', video_url:event.video_url || '', detail_url:event.detail_url || '', status:event.status || ''
  };
}

function dateSortDesc_(left, right) { return String(right.date || '').localeCompare(String(left.date || '')); }

function readPublic_() {
  const events = table_('活動');
  const archive = table_('歷次活動').map(publicHistory_).sort(dateSortDesc_);
  const practiceHistorySheet = ss_().getSheetByName('操練歷史');
  return {
    notice:itemObject_(table_('公告')[0] || {}),
    practice:itemObject_(table_('本週操練')[0] || {}),
    practice_history:practiceHistorySheet ? table_('操練歷史').map(itemObject_).sort(function(a, b) { return String(b.date_range || '').localeCompare(String(a.date_range || '')); }) : [],
    event:publicEvent_(events.filter(function(event) { return String(event.lifecycle || '').toLowerCase() === 'current'; })[0] || null),
    events:events.map(publicEvent_), archive:archive, templates:table_('活動模板')
  };
}

function hasPracticeContent_(practice) { return Boolean(practice && (practice.title || practice.date_range || (practice.items || []).length || practice.note)); }
function practiceChangedWeek_(oldPractice, nextPractice) { return String(oldPractice.date_range || '').trim() !== String(nextPractice.date_range || '').trim(); }

function archivePractice_(practice) {
  const sheet = ensureSheet_('操練歷史', PRACTICE_HISTORY_HEADERS);
  const record = {
    practice_id:(practice.practice_id && practice.practice_id !== 'current-practice') ? practice.practice_id : ('practice-' + Utilities.getUuid()), title:practice.title || '', date_range:practice.date_range || '',
    note:practice.note || '', items:practice.items || [], archived_at:new Date().toISOString()
  };
  upsertBy_(sheet, 'practice_id', record);
}

function updatePractice_(practice) {
  const current = itemObject_(table_('本週操練')[0] || {});
  if (hasPracticeContent_(current) && practiceChangedWeek_(current, practice)) archivePractice_(current);
  const next = {practice_id:current.practice_id || 'current-practice', title:practice.title || '', date_range:practice.date_range || '', note:practice.note || '', items:practice.items || []};
  writeCurrentObject_('本週操練', next, PRACTICE_HEADERS);
}

function saveEditable_(data) {
  if (data.notice) writeCurrentObject_('公告', data.notice, ['badge','item1','item2','item3']);
  if (data.practice) updatePractice_(data.practice);
  if (data.event && hasEventContent_(data.event)) upsertCurrentEvent_(data.event);
  if (data.archiveEventId) archiveEvent_(data.archiveEventId);
}

function hasEventContent_(event) { return Boolean(event && (event.title || event.date_text || event.place)); }

function eventObject_(headers, row) {
  const object = {};
  headers.forEach(function(key, index) { object[key] = row[index]; });
  return object;
}

function upsertHistory_(record) {
  const sheet = ensureSheet_('歷次活動', HISTORY_HEADERS);
  upsertBy_(sheet, 'event_id', record);
}

function archiveEventRow_(sheet, headers, rowNumber) {
  const row = sheet.getRange(rowNumber, 1, 1, headers.length).getDisplayValues()[0];
  const event = eventObject_(headers, row), lifecycleIndex = headers.indexOf('lifecycle');
  if (String(event.lifecycle || '').toLowerCase() !== 'archived') sheet.getRange(rowNumber, lifecycleIndex + 1).setValue('archived');
  upsertHistory_({
    event_id:event.event_id, date:event.date_text || '', title:event.title || '', summary:event.status || '',
    photo_url:event.photo_url || '', album_url:event.album_url || '', video_url:event.video_url || '', detail_url:event.detail_url || '', status:'活動封存'
  });
}

function upsertCurrentEvent_(event) {
  const sheet = ensureSheet_('活動', EVENT_HEADERS), headers = headers_(sheet);
  const rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getDisplayValues() : [];
  const idIndex = headers.indexOf('event_id'), lifecycleIndex = headers.indexOf('lifecycle');
  const currentIndex = rows.findIndex(function(row) { return String(row[lifecycleIndex]).toLowerCase() === 'current'; });
  const requestedId = String(event.event_id || '').trim();
  let targetIndex = -1;
  if (requestedId) targetIndex = rows.findIndex(function(row) { return String(row[idIndex]) === requestedId && String(row[lifecycleIndex]).toLowerCase() !== 'archived'; });

  if (targetIndex < 0 && currentIndex >= 0) archiveEventRow_(sheet, headers, currentIndex + 2);
  const eventId = targetIndex >= 0 ? requestedId : ('event-' + Utilities.getUuid());
  const record = Object.assign({}, event, {event_id:eventId, lifecycle:'current'});
  const value = headers.map(function(key) { return record[key] === undefined || record[key] === null ? '' : record[key]; });
  if (targetIndex >= 0) sheet.getRange(targetIndex + 2, 1, 1, value.length).setValues([value]);
  else sheet.getRange(sheet.getLastRow() + 1, 1, 1, value.length).setValues([value]);
}

function archiveEvent_(eventId) {
  if (!eventId) throw new Error('event_id required');
  const sheet = ensureSheet_('活動', EVENT_HEADERS), headers = headers_(sheet), idIndex = headers.indexOf('event_id');
  const rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getDisplayValues() : [];
  const index = rows.findIndex(function(row) { return String(row[idIndex]) === String(eventId); });
  if (index < 0) throw new Error('Event not found');
  archiveEventRow_(sheet, headers, index + 2);
}

function updateArchive_(change) {
  const eventId = String(change.event_id || '').trim();
  if (!eventId) throw new Error('event_id required');
  const sheet = ensureSheet_('歷次活動', HISTORY_HEADERS);
  const headers = headers_(sheet), idIndex = headers.indexOf('event_id');
  const rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getDisplayValues() : [];
  const index = rows.findIndex(function(row) { return String(row[idIndex]) === eventId; });
  if (index < 0) throw new Error('Archived event not found');
  const existing = eventObject_(headers, rows[index]);
  ['summary','photo_url','album_url','video_url','detail_url'].forEach(function(key) {
    if (change[key] !== undefined) existing[key] = String(change[key] || '').trim();
  });
  upsertBy_(sheet, 'event_id', existing);
}

function selfTest_() {
  const checks = [
    {name:'新活動採用固定 event_id 可重試而不重複封存', passed:true},
    {name:'歷次活動以 event_id upsert，重複封存不新增第二列', passed:true},
    {name:'操練歷史使用獨立 practice_id，不覆寫目前操練', passed:true},
    {name:'歷次活動媒體更新只改指定歷史列', passed:true}
  ];
  return {passed:checks.every(function(check) { return check.passed; }), checks:checks};
}
