(() => {
'use strict';
const VALUES = [100000,50000,20000,10000,5000,2000,1000,500,200,100,50];
const COINS = new Set([1000,500,200,100,50]);
const breakdown = items => ({bills:total(items.filter(d=>!COINS.has(d.value))),coins:total(items.filter(d=>COINS.has(d.value)))});
const KEY = 'caja-calculator-v3', LEGACY = 'caja-calculator-v2';
const zero = () => VALUES.map(value => ({value, qty:0}));
const copy = x => JSON.parse(JSON.stringify(x));
const snapshot = s => JSON.stringify({items:s.items, note:s.note});
const total = items => items.reduce((n,d) => n + d.value*d.qty, 0);
const stamp = () => new Date().toISOString();
const validDate = d => typeof d === 'string' && Number.isFinite(Date.parse(d));
function validateSnapshot(s, dated = true) {
  if (!s || !Array.isArray(s.items) || s.items.length !== VALUES.length || typeof s.note !== 'string' || s.note.length > 120 || (dated && !validDate(s.updatedAt))) throw Error('Conteo inválido.');
  const seen = new Set();
  const items = s.items.map(d => {
    if (!d || !VALUES.includes(d.value) || seen.has(d.value) || !Number.isSafeInteger(d.qty) || d.qty < 0) throw Error('Denominación o cantidad inválida.');
    seen.add(d.value); return {value:d.value, qty:d.qty};
  }).sort((a,b) => b.value-a.value);
  if (!Number.isSafeInteger(total(items))) throw Error('El total supera el límite permitido.');
  return {items, note:s.note, updatedAt:s.updatedAt || stamp()};
}
function validateState(s) {
  if (!s || s.version !== 3 || !Array.isArray(s.records) || s.records.length > 10) throw Error('Formato de respaldo no compatible.');
  const ids = new Set();
  const records = s.records.map(r => {
    const row = validateSnapshot(r);
    if (typeof r.id !== 'string' || !r.id || ids.has(r.id) || !validDate(r.savedAt)) throw Error('Registro inválido.');
    ids.add(r.id); return {...row, id:r.id, savedAt:r.savedAt};
  }).sort((a,b) => Date.parse(b.savedAt)-Date.parse(a.savedAt));
  return {version:3, draft:validateSnapshot(s.draft), records};
}
const $ = id => document.getElementById(id);
const nf = new Intl.NumberFormat('es-CO', {style:'currency',currency:'COP',maximumFractionDigits:0});
const money = n => nf.format(n);
const date = d => d ? new Intl.DateTimeFormat('es-CO',{dateStyle:'medium',timeStyle:'short'}).format(new Date(d)) : 'Sin guardar aún';
let state = {version:3, draft:{items:zero(),note:'',updatedAt:null},records:[]};
let timer, stored = '', blocked = false, detailRecord = null, pending = null;
const dialogFocus = new Map();
function message(text, error=false) {
  for(const id of ['notice','hub-notice']) {$(id).textContent=text; $(id).className='notice'+(error?' error':'');}
}
function status(text, error=false) {
  for(const id of ['save-status','hub-status']) {$(id).textContent=text; $(id).className=error?'status error':'status';}
}
function persist() {
  clearTimeout(timer);
  if(blocked) { status('No se pudo guardar: recupera o respalda los datos existentes.',true); return false; }
  const previous = state.draft.updatedAt;
  state.draft.updatedAt = stamp();
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    stored = snapshot(state.draft);
    status('Borrador guardado · '+date(state.draft.updatedAt));
    $('draft-time').textContent=date(state.draft.updatedAt);
    return true;
  } catch(e) {
    state.draft.updatedAt = previous;
    status('No se pudo guardar. Exporta un respaldo y vuelve a intentarlo.',true);
    const dialogError=document.querySelector('dialog[open] .dialog-error');
    if(dialogError)dialogError.textContent='No se pudo guardar. El conteo actual se conserva; cancela y exporta un respaldo.';
    return false;
  }
}
function schedule() {
  status('Guardando…'); clearTimeout(timer);
  timer=setTimeout(persist,250);
}
function matchingRecord() { return state.records.find(r => snapshot(r)===snapshot(state.draft)); }
function unsaved() {
  return !matchingRecord() && (state.draft.items.some(d=>d.qty>0) || state.draft.note.trim());
}
function renderTotals() {
  state.draft.items.forEach(d => $('subtotal-'+d.value).textContent=money(d.value*d.qty));
  $('grand-total').textContent=money(total(state.draft.items));
  $('draft-total').textContent=money(total(state.draft.items));
  const sums=breakdown(state.draft.items);
  $('bills-total').textContent=money(sums.bills); $('coins-total').textContent=money(sums.coins);
  $('draft-note').textContent=state.draft.note || 'Sin nombre';
  $('draft-breakdown').replaceChildren(...breakdownLabels(state.draft.items));
  $('draft-caption').textContent=matchingRecord()?'Este conteo ya tiene un registro guardado.':'Conteo en curso; el autoguardado no crea registros en el historial.';
}
function text(tag, content, cls) { const el=document.createElement(tag); el.textContent=content; if(cls)el.className=cls; return el; }
function action(label, fn, cls='secondary') {
  const b=text('button',label,cls); b.type='button'; b.addEventListener('click',fn); return b;
}
function breakdownLabels(items) {
  const sums=breakdown(items);
  return [text('span','Billetes: '+money(sums.bills)),text('span','Monedas: '+money(sums.coins))];
}
function renderHistory() {
  $('history-count').textContent=state.records.length+'/10';
  const host=$('history-list'); host.replaceChildren();
  if(!state.records.length) host.append(text('p','Todavía no tienes conteos guardados. Usa «Guardar conteo» para conservar una sesión.','muted empty'));
  state.records.forEach(r => {
    const article=document.createElement('article'); article.className='record';
    const info=document.createElement('div');
    info.append(text('span','Conteo guardado','badge manual'),text('h3',r.note || 'Sin nombre'),text('p',date(r.savedAt),'muted'));
    const sums=document.createElement('div');sums.className='breakdown';sums.append(...breakdownLabels(r.items));info.append(sums);
    const side=document.createElement('div'); side.className='record-side';
    const buttons=document.createElement('div'); buttons.className='actions';
    buttons.append(action('Ver detalle',()=>openDetail(r)),action('Usar como base',()=>{closeDialog('sessions-dialog');requestReplacement(()=>useRecord(r));}));
    side.append(text('strong',money(total(r.items)),'record-total'),buttons);
    article.append(info,side); host.append(article);
  });
}
function render() {
  state.draft.items.forEach(d => $('qty-'+d.value).value=d.qty);
  $('note').value=state.draft.note;
  $('draft-time').textContent=date(state.draft.updatedAt);
  renderTotals(); renderHistory();
}
function saveRecord() {
  clearTimeout(timer);
  if(blocked) { persist(); return false; }
  if(matchingRecord()) {
    const ok=persist(); if(ok)message('Este conteo ya está guardado. No se creó un duplicado.'); return ok;
  }
  const previous=copy(state.records), now=stamp();
  const r={...copy(state.draft),id:crypto.randomUUID ? crypto.randomUUID() : now+'-'+Math.random().toString(16).slice(2),updatedAt:now,savedAt:now};
  state.records=[r,...state.records].slice(0,10);
  if(!persist()) { state.records=previous; message('El registro no se pudo guardar. El conteo sigue disponible en pantalla.',true); return false; }
  renderHistory(); renderTotals(); message('Conteo guardado en el historial.'); return true;
}
function showDialog(id) {
  dialogFocus.set(id,document.activeElement);
  $(id).showModal();
}
function closeDialog(id) {
  $(id).close(); const error=$(id).querySelector('.dialog-error'); if(error)error.textContent=''; const previousFocus=dialogFocus.get(id);dialogFocus.delete(id);if(previousFocus && previousFocus.isConnected)previousFocus.focus();
}
function requestReplacement(fn) {
  if(blocked) { message('Hay datos que no se pudieron leer. Exporta el respaldo antes de continuar.',true); return; }
  if(unsaved()) { pending=fn; showDialog('replace-dialog'); }
  else fn();
}
function useRecord(r) {
  const old=copy(state.draft);
  state.draft={items:copy(r.items),note:r.note,updatedAt:r.updatedAt};
  if(!persist()) { state.draft=old;render();return; }
  render(); message('Registro cargado como base. El original se conserva en el historial.'); $('qty-100000').focus();
}
function newCount() {
  const old=copy(state.draft);
  state.draft={items:zero(),note:'',updatedAt:null};
  if(!persist()) {state.draft=old;render();return;}
  render();message('Nuevo conteo listo.');$('qty-100000').focus();
}
function openDetail(r) {
  detailRecord=r;
  $('detail-title').textContent=r.note || 'Conteo sin nombre';
  $('detail-date').textContent='Conteo guardado · '+date(r.savedAt);
  const body=$('detail-body'); body.replaceChildren();
  let lastType;
  r.items.forEach(d=>{
    const type=COINS.has(d.value)?'Monedas':'Billetes';
    if(type!==lastType){const group=document.createElement('tr'),label=text('th',type);group.className='group-heading';label.colSpan=3;label.scope='colgroup';group.append(label);body.append(group);lastType=type;}
    const tr=document.createElement('tr');
    tr.append(text('td',money(d.value)),text('td',String(d.qty)),text('td',money(d.value*d.qty))); body.append(tr);
  });
  const sums=breakdown(r.items);$('detail-bills').textContent=money(sums.bills);$('detail-coins').textContent=money(sums.coins);
  $('detail-total').textContent=money(total(r.items));showDialog('detail-dialog');
}
function download(data,name) {
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob), a=document.createElement('a');
  a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportBackup() {
  // Back up the current in-memory draft even if storage is unavailable.
  if(blocked) {
    try {download({app:'caja-calculator-recovery',v3:localStorage.getItem(KEY),v2:localStorage.getItem(LEGACY)},'caja-recuperacion.json');message('Se exportó una copia de recuperación de los datos originales.');}
    catch {message('No se puede acceder al almacenamiento para exportarlo.',true);} return;
  }
  const data=copy(state); data.draft.updatedAt=stamp();
  download({app:'caja-calculator',exportedAt:stamp(),...data},'caja-respaldo-'+new Date().toISOString().slice(0,10)+'.json');
  message('Respaldo exportado: borrador y '+state.records.length+' registros.');
}
let imported=null;
async function readImport(event) {
  const file=event.target.files[0];event.target.value=''; if(!file)return;
  try {
    if(file.size>1024*1024)throw Error('El archivo supera el límite de 1 MB.');
    const data=JSON.parse(await file.text());
    if(data.app!=='caja-calculator')throw Error('Este archivo no es un respaldo de Caja Calculator.');
    imported=validateState(data);
    $('import-summary').textContent='Se restaurará el borrador y '+imported.records.length+' registros. Se reemplazarán los datos actuales de este navegador. Exporta un respaldo antes de continuar.';
    showDialog('import-dialog');
  }catch(e){message('No se importó nada. '+e.message,true);}
}
function restoreImport() {
  if(!imported)return;
  clearTimeout(timer);const previous=state, wasBlocked=blocked;
  state=imported;blocked=false;
  if(!persist()){state=previous;blocked=wasBlocked;render();return;}
  imported=null;closeDialog('import-dialog');render();message('Respaldo restaurado correctamente.');
}
function load() {
  try {
    const raw=localStorage.getItem(KEY);
    if(raw) {state=validateState(JSON.parse(raw));stored=snapshot(state.draft);status('Borrador guardado · '+date(state.draft.updatedAt));}
    else {
      const old=localStorage.getItem(LEGACY);
      if(old) {
        const legacy=JSON.parse(old), items=Array.isArray(legacy)?legacy:legacy.items;
        if(!Array.isArray(items))throw Error('Datos anteriores inválidos.');
        const legacyMap=new Map(items.map(d=>[d.value,d.qty]));
        state.draft={items:VALUES.map(value=>({value,qty:legacyMap.get(value)??0})),note:'',updatedAt:validDate(legacy.updatedAt)?legacy.updatedAt:stamp()};
        state.draft=validateSnapshot(state.draft);
        if(persist())message('Tu conteo anterior se recuperó como borrador. Puedes guardarlo en el historial.');
      }
    }
    if(!raw && !localStorage.getItem(LEGACY))stored=snapshot(state.draft);
  }catch(e){blocked=true;stored=snapshot(state.draft);status('No se pudieron leer los datos guardados.',true);message('Los datos originales se conservaron. Exporta una copia de recuperación o importa un respaldo válido.',true);}
}
function init() {
  VALUES.forEach((value,i)=>{
    const row=document.createElement('tr'), denomination=text('th',money(value));denomination.scope='row';
    const field=document.createElement('td'), input=document.createElement('input');
    input.type='number';input.min='0';input.step='1';input.inputMode='numeric';input.value='0';input.id='qty-'+value;
    input.setAttribute('aria-label','Unidades de '+value);
    input.addEventListener('input',()=>{
      const raw=Number(input.value); const qty=Number.isFinite(raw)?Math.max(0,Math.trunc(raw)):0;
      const previous=state.draft.items[i].qty;
      state.draft.items[i].qty=qty;
      if(!Number.isSafeInteger(qty) || !Number.isSafeInteger(total(state.draft.items))) {
        state.draft.items[i].qty=previous;input.value=previous;message('La cantidad supera el límite permitido.',true);return;
      }
      if(input.value!=='' && String(qty)!==input.value)input.value=qty;
      renderTotals();schedule();
    });
    input.addEventListener('blur',()=>{if(input.value==='')input.value=0;});
    input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const next=$('qty-'+VALUES[Math.min(i+1,VALUES.length-1)]);next.focus();next.select();}});
    field.append(input);const subtotal=text('td',money(0),'numeric');subtotal.id='subtotal-'+value;
    row.append(denomination,field,subtotal);$(COINS.has(value)?'coins-body':'count-body').append(row);
  });
  $('note').addEventListener('input',e=>{state.draft.note=e.target.value.slice(0,120);renderTotals();schedule();});
  $('save-record').addEventListener('click',saveRecord);
  $('new-count').addEventListener('click',()=>requestReplacement(newCount));
  $('help-open').addEventListener('click',()=>showDialog('help-dialog'));
  $('help-close').addEventListener('click',()=>closeDialog('help-dialog'));
  $('sessions-open').addEventListener('click',()=>{renderTotals();renderHistory();showDialog('sessions-dialog');});
  $('sessions-close').addEventListener('click',()=>closeDialog('sessions-dialog'));
  $('draft-resume').addEventListener('click',()=>{closeDialog('sessions-dialog');$('qty-100000').focus();});
  $('export').addEventListener('click',exportBackup);
  $('import-file').addEventListener('change',readImport);
  $('detail-close').addEventListener('click',()=>closeDialog('detail-dialog'));
  $('detail-use').addEventListener('click',()=>{const r=detailRecord;closeDialog('detail-dialog');if($('sessions-dialog').open)closeDialog('sessions-dialog');requestReplacement(()=>useRecord(r));});
  $('replace-cancel').addEventListener('click',()=>{pending=null;closeDialog('replace-dialog');});
  $('replace-discard').addEventListener('click',()=>{const fn=pending;pending=null;closeDialog('replace-dialog');if(fn)fn();});
  $('replace-save').addEventListener('click',()=>{if(!saveRecord())return;const fn=pending;pending=null;closeDialog('replace-dialog');if(fn)fn();});
  $('import-cancel').addEventListener('click',()=>{imported=null;closeDialog('import-dialog');});
  $('import-confirm').addEventListener('click',restoreImport);
  $('import-backup').addEventListener('click',exportBackup);
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();if(!document.querySelector('dialog[open]'))saveRecord();}});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&snapshot(state.draft)!==stored)persist();});
  window.addEventListener('pagehide',()=>{if(snapshot(state.draft)!==stored)persist();});
  window.addEventListener('beforeunload',e=>{if(snapshot(state.draft)!==stored&&!persist()){e.preventDefault();e.returnValue='';}});
  load();render();
}
if(typeof document!=='undefined')init();
if(typeof module!=='undefined')module.exports={validateState,validateSnapshot,total,snapshot,VALUES};
})();
