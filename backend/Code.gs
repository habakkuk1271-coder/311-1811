const SHEET_ID = '1t7u7aMsj3imueMN6Qa0OPcaLWnnpg2i7aRLLJCF0NUE';

function doGet(e) {
  try {
    if ((e.parameter.action || 'public') !== 'public') throw new Error('Unknown action');
    return json_({ok:true,data:readPublic_()});
  } catch (err) { return json_({ok:false,error:String(err.message || err)}); }
}
function doPost(e) {
  try {
    const body = JSON.parse((e.postData && e.postData.contents) || (e.parameter && e.parameter.payload) || '{}');
    if (body.action !== 'save') throw new Error('Unknown action');
    if (!body.token || body.token !== PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN')) throw new Error('Unauthorized');
    saveEditable_(body.data || {});
    return json_({ok:true,data:readPublic_()});
  } catch (err) { return json_({ok:false,error:String(err.message || err)}); }
}
function json_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
function ss_() { return SpreadsheetApp.openById(SHEET_ID); }
function table_(name) {
  const sh=ss_().getSheetByName(name); if(!sh) return [];
  const values=sh.getDataRange().getValues(); if(values.length<2) return [];
  const h=values[0].map(String);
  return values.slice(1).filter(r=>r.some(v=>v!==''&&v!==null)).map(r=>{const o={};h.forEach((k,i)=>o[k]=r[i]);return o;});
}
function readPublic_() {
  const events=table_('活動');
  const archive=events.filter(e=>String(e.lifecycle||'').toLowerCase()==='archived');
  return {notice:objectWithItems_(table_('公告')[0]||{}),practice:objectWithItems_(table_('本週操練')[0]||{}),event:events.filter(e=>String(e.lifecycle||'').toLowerCase()==='current')[0]||null,events:events,archive:archive,templates:table_('活動模板')};
}
function objectWithItems_(obj) {
  const out={}; Object.keys(obj).forEach(k=>out[k]=obj[k]);
  out.items=Object.keys(obj).filter(k=>k.indexOf('item')===0&&Number(k.slice(4))>0).sort((a,b)=>Number(a.slice(4))-Number(b.slice(4))).map(k=>obj[k]).filter(Boolean).map(String);
  return out;
}
function saveEditable_(data) {
  if (data.notice) writeObject_('公告',data.notice);
  if (data.practice) writeObject_('本週操練',data.practice);
  if (data.event) upsertCurrentEvent_(data.event);
  if (data.archiveEventId) archiveEvent_(data.archiveEventId);
}
function writeObject_(name,obj) {
  const sh=ss_().getSheetByName(name); if(!sh) throw new Error('Missing sheet: '+name);
  const h=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
  const row=h.map(k=>Array.isArray(obj.items)&&k.indexOf('item')===0?obj.items[Number(k.slice(4))-1]||'':obj[k]===undefined?'':obj[k]);
  sh.getRange(2,1,1,h.length).setValues([row]);
}
function upsertCurrentEvent_(event) {
  const sh=ss_().getSheetByName('活動'); if(!sh) throw new Error('Missing sheet: 活動');
  const h=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
  const rows=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,h.length).getValues():[];
  const life=h.indexOf('lifecycle'), id=h.indexOf('event_id');
  let target=-1;
  rows.forEach((r,i)=>{if(target<0&&((id>=0&&event.event_id&&String(r[id])===String(event.event_id))||(life>=0&&String(r[life]).toLowerCase()==='current'))) target=i+2;});
  const row=h.map(k=>k==='lifecycle'?(event.lifecycle||'current'):event[k]===undefined?'':event[k]);
  if(target>0) sh.getRange(target,1,1,h.length).setValues([row]); else sh.getRange(sh.getLastRow()+1,1,1,h.length).setValues([row]);
}
function archiveEvent_(eventId) {
  const sh=ss_().getSheetByName('活動'); if(!sh) throw new Error('Missing sheet: 活動');
  const h=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String), id=h.indexOf('event_id'), life=h.indexOf('lifecycle');
  if(id<0||life<0) throw new Error('活動 sheet needs event_id and lifecycle');
  const rows=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,h.length).getValues():[];
  const at=rows.findIndex(r=>String(r[id])===String(eventId));
  if(at<0) throw new Error('Event not found');
  if(String(rows[at][life]).toLowerCase()!=='archived') sh.getRange(at+2,life+1).setValue('archived');
}
