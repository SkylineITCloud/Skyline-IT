/* No credentials or location data are persisted in browser storage. */
'use strict';
function locationLabel(event, now = Date.now()) {
  if (!event.location) return 'No location sent by the device';
  const p = event.location;
  if (!Number.isFinite(p.latitude) || !Number.isFinite(p.longitude)) return 'Location reading is not valid';
  const ts = Date.parse(event.captured_at);
  const age = Number.isFinite(ts) ? Math.max(0, Math.floor((now - ts) / 1000)) : null;
  const freshness = Number.isFinite(ts) && ts > now + 60000 ? 'device time may be wrong' : age === null ? 'time not known' : age <= 120 ? 'recent' : age <= 900 ? 'older reading' : 'old reading';
  const accuracy = Number.isFinite(p.accuracy_m) ? `location may be about ${p.accuracy_m} metres from the exact position` : 'accuracy not known';
  return `${p.latitude.toFixed(5)}, ${p.longitude.toFixed(5)} · ${freshness}${age === null ? '' : ` (${age} seconds ago)`} · ${accuracy} · ${p.source==='GNSS'?'GPS':p.source==='LAST_KNOWN'?'last known location':'location source not known'}`;
}
function stateLabel(value) { return {ACTIVE:'Open',CANCELLATION_REQUESTED:'Asked to close',CLOSED:'Closed'}[value] || 'Status not known'; }
function contactStatusLabel(value) { return {INVITED:'Waiting for acceptance',ACCEPTED:'Accepted',REVOKED:'Sharing stopped'}[value] || 'Status not known'; }
function listFrom(result, field) { return Array.isArray(result) ? result : Array.isArray(result?.[field]) ? result[field] : []; }
function isSafetyRuntime(hostname, health) {
  return ['127.0.0.1', 'localhost'].includes(hostname) && health?.status === 'ok' && health?.mode === 'LOCAL_PROTOTYPE' && health?.notifications === 'SIMULATED_ONLY';
}
if (typeof module !== 'undefined') module.exports = { locationLabel, listFrom, isSafetyRuntime };
if (typeof document !== 'undefined') {
let runtimeReady = false;
let token = null, user = null, contacts = [], generation = 0, authorizedEvents = [], map = null, mapLayer = null, historyLine = null, mapEnabled = false, registeredDevices = [], selectedEventId = null;
const $ = id => document.getElementById(id);
const el = (tag, text, cls) => { const n = document.createElement(tag); if(text !== undefined) n.textContent = text; if(cls)n.className=cls; return n; };
function notice(message, error=false) { $('status').textContent=message; $('status').className=error?'status error':'status'; }
function requestError(message) {
  return {'Authentication required':'Please sign in again.','Invalid login':'Check your email and password.','Device authentication required':'Check the private test device code.','Event unavailable':'You cannot view this alert.','Stale sequence':'Increase the test number before creating the next alert.','Invalid sequence':'Enter a whole test number greater than zero.','Conflicting event replay':'That test alert reference was already used with different details. Start a new test alert.','Request cancellation before closing':'First choose “Ask to close this alert”, then enter a reason and choose “Close alert”.','Accepted contact required':'Your contact must accept the invitation before you share this alert.','Event is closed':'This alert is already closed.','Invitation unavailable':'Check the invitation code and that you are signed in with the invited email address.','Contact invitation already exists':'An invitation already exists for this contact.'}[message] || message || 'We could not complete this action. Please try again.';
}
async function initializeRuntime() {
  const previewMessage = 'Website preview only. Sign-in and practice alerts need the local safety server.';
  for (const input of document.querySelectorAll('#authForm input, #authForm button')) input.disabled = true;
  $('runtimeNotice').hidden = false;
  if (!['127.0.0.1', 'localhost'].includes(window.location.hostname) || window.location.protocol !== 'http:') {
    notice(previewMessage); $('connectionStatus').textContent = 'Website preview only'; return;
  }
  notice('Checking the local safety server…');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch('/api/health', {headers:{Accept:'application/json'},credentials:'omit',cache:'no-store',redirect:'error',signal:controller.signal});
    const health = response.ok ? await response.json() : null;
    if (!isSafetyRuntime(window.location.hostname, health)) throw new Error('Safety server unavailable');
    runtimeReady = true;
    for (const input of document.querySelectorAll('#authForm input, #authForm button')) input.disabled = false;
    $('runtimeNotice').hidden = true;
    notice('Local test server connected. Sign in with made-up test details. No real alerts are sent.');
    $('connectionStatus').textContent = 'Local test server · signed out';
  } catch {
    notice(previewMessage); $('connectionStatus').textContent = 'Website preview only';
  } finally { clearTimeout(timeout); }
}
async function api(path, method='GET', body, credential=token) {
  if (!runtimeReady || !['127.0.0.1', 'localhost'].includes(window.location.hostname)) throw new Error('Website preview only. Sign-in and practice alerts need the local safety server.');
  const headers = {Accept:'application/json'};
  if(credential) headers.Authorization=`Bearer ${credential}`;
  if(body !== undefined) headers['Content-Type']='application/json';
  let response;
  try { response=await fetch(path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',credentials:'omit'}); }
  catch { throw new Error('Cannot connect. The action has not been confirmed. Try again when you have a connection.'); }
  const data=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(requestError(data.error));
  return data;
}
function action(label, fn, cls='secondary') { const b=el('button',label,cls); b.type='button'; b.addEventListener('click',()=>run(fn)); return b; }
async function run(fn) { try { await fn(); } catch(e) { notice(e.message,true); } }
function stamp(value) { if(!value)return 'Unknown time'; const d=new Date(value); return Number.isNaN(d.getTime())?'Unknown time':d.toLocaleString(); }
function setSession(result) { document.body.dataset.session='signed-in'; selectTab('overview'); token=result.token; user=result.user; generation++; $('auth').hidden=true; $('workspace').hidden=false; $('sideWorkspace').hidden=false; $('showMap').disabled=false; $('identity').textContent=`${user.name || user.email} · signed in`; $('password').value=''; notice('Signed in. Loading your alerts…'); refresh(); }
async function refresh() {
  if(!token)return;
  const current=++generation;
  try {
    const [ds,cs,es,as]=await Promise.all([api('/api/devices'),api('/api/contacts'),api('/api/events'),api('/api/audit')]);
    if(current!==generation || !token)return;
    contacts=listFrom(cs,'contacts'); authorizedEvents=listFrom(es,'events'); renderDevices(listFrom(ds,'devices')); renderContacts(); renderEvents(authorizedEvents); renderAudit(listFrom(as,'audit')); updateOverview(); syncMap();
    notice(`Your alerts were updated at ${new Date().toLocaleTimeString()}. This test version sends no real alerts.`);
  } catch(e) {
    if(current!==generation)return;
    for(const id of ['devices','contacts','events','audit'])$(id).replaceChildren(el('p','We could not load these details. Sign in again or try Refresh.','muted'));
    clearSelectedAlert();
    clearMap(); $('avgBattery').textContent='Unknown'; $('activeToday').textContent='-'; $('lastUpdate').textContent='Could not refresh'; $('panicBar').replaceChildren(); $('panicBar').style.display='none'; $('connectionStatus').textContent='Could not refresh · details hidden'; $('connectionStatus').className='disconnected'; notice(e.message,true);
  }
}
function renderDevices(items) {
 registeredDevices=items; const root=$('devices'); root.replaceChildren();
 $('deviceCount').textContent=items.length?items.length+' device'+(items.length===1?'':'s')+' added.':'No devices added yet.';
 $('overviewTitle').textContent=items.length?'Your device, at a glance.':"Let's get started.";
 $('primaryAction').textContent=items.length?'View my alerts':'Add a device';
 if(!items.length)root.append(el('p','Add a test pendant, wristband or clip.','muted'));
 items.forEach(d=>{const card=el('div',undefined,'device-card');card.append(el('h3',d.name),el('span',d.form_factor,'pill'),el('p','Connection and battery are not confirmed by adding a device.','small'));root.append(card);});
}
function renderContacts() { const root=$('contacts'); root.replaceChildren(); if(!contacts.length)root.append(el('p','No contacts added yet. Your contact must accept an invitation before you can share an alert.','muted')); contacts.forEach(c=>{const card=el('div',undefined,'item');card.append(el('h3',c.email || c.contact_email || c.id),el('span',contactStatusLabel(c.status),'pill'),action('Stop sharing with this contact',async()=>{await api(`/api/contacts/${encodeURIComponent(c.id)}`,'DELETE');await refresh();},'danger'));root.append(card);}); }
function renderEvents(items) {
 const root=$('events');root.replaceChildren();
 if(!items.length)root.append(el('p','No alerts to show yet.','muted'));
 items.forEach(e=>{
  const row=action('',()=>openAlert(e.id),'alert-row');row.setAttribute('aria-pressed',String(e.id===selectedEventId));
  row.append(el('strong',stateLabel(e.state)+' alert'),el('span',stamp(e.captured_at||e.received_at)));root.append(row);
 });
 const selected=items.find(e=>e.id===selectedEventId);
 if(selected)renderAlertDetail(selected);else clearSelectedAlert();
}
function clearSelectedAlert(){
 selectedEventId=null; $('selectedAlert').replaceChildren(el('h3','Choose an alert.'),el('p','Open one alert to see its details, sharing and location.','muted'));$('mapPanel').hidden=true;
}
function hideMapKeepData(){const held=authorizedEvents;clearMap();authorizedEvents=held;}
async function openAlert(eventId){
 const version=generation;
 try{
  const event=await api('/api/events/'+encodeURIComponent(eventId));
  if(version!==generation||!token)return;
  hideMapKeepData();selectedEventId=eventId;
  authorizedEvents=authorizedEvents.map(e=>e.id===eventId?event:e);
  renderEvents(authorizedEvents);selectTab('alerts');
 }catch(error){clearMap();clearSelectedAlert();$('events').replaceChildren(el('p','This alert is no longer available. Refresh to check your access.','muted'));throw error;}
}
function renderAlertDetail(e){
 const card=$('selectedAlert');card.replaceChildren();card.className='panel alert-detail';$('mapPanel').hidden=false;
 const head=el('header');head.append(el('h3','Alert details'),el('span',stateLabel(e.state),'pill'));card.append(head);
 card.append(el('p','Alert saved: '+stamp(e.received_at)));
 const current=e.latest_sample||e;
 card.append(el('p','Latest device reading: '+stamp(current.captured_at)),el('p',locationLabel(current),'muted'));
 if(!e.latest_sample)card.append(el('p','No newer reading has arrived.','small'));
 const shares=Array.isArray(e.shares)?e.shares:[];
 card.append(el('p',shares.length?'Shared with '+shares.filter(s=>s.active).length+' contact(s).':'Not shared with a contact.'));
 const buttons=el('div',undefined,'actions');const id=encodeURIComponent(e.id);
 buttons.append(action('View location',()=>focusEvent(e.id)));
 if(e.wearer_id!==user.id)buttons.append(action('I have seen this alert',async()=>{await api(`/api/events/${id}/ack`,'POST',{});await refresh();}));
 card.append(buttons);
 if(e.wearer_id===user.id&&e.state!=='CLOSED'){
  const activeContacts=contacts.filter(c=>['ACCEPTED','accepted'].includes(c.status));
  if(activeContacts.length){const label=el('label','Share this alert');const select=el('select');select.setAttribute('aria-label','Choose a contact for this alert');activeContacts.forEach(c=>{const option=el('option',c.email||c.id);option.value=c.id;select.append(option);});label.append(select);const share=el('div',undefined,'actions');share.append(label,action('Share',async()=>{await api(`/api/events/${id}/share`,'POST',{contact_id:select.value});await refresh();}));card.append(share);}
  else card.append(action('Add a trusted contact',()=>selectTab('people'),'secondary'));
 }
 const delivery=el('details');delivery.append(el('summary','Sharing and delivery details'));
 const labels={QUEUED:'Waiting for the test notification step',SIMULATED_ONLY:'Test step complete - no real message sent',CANCELLED_REVOKED:'Test step stopped after sharing ended',CANCELLED_CLOSED:'Test step stopped after this alert closed'};
 if(!shares.length)delivery.append(el('p','No contact delivery recorded. Saving this alert does not mean help is on the way.','small'));
 shares.forEach(s=>{const contact=contacts.find(c=>c.id===s.contact_id);delivery.append(el('p',(contact?.email||'Chosen contact')+' · '+(s.active?'can view this alert':'sharing stopped')+' · '+(s.acknowledged_at?'marked as seen '+stamp(s.acknowledged_at):'not marked as seen'),'small'),el('p',labels[s.notification_status]||'No delivery recorded.','small'));});
 if(e.responses?.length)delivery.append(el('p','What your contact said (not checked by Mzansi Connect): '+e.responses.map(r=>r.message).join('; '),'small'));
 card.append(delivery);
 if(e.wearer_id===user.id&&e.state!=='CLOSED'){
  const close=el('details',undefined,'close-controls');close.append(el('summary','Close this alert'));
  if(e.state!=='CANCELLATION_REQUESTED'){close.append(el('p','First ask to close the alert. This request does not close it yet.','small'),action('Ask to close',async()=>{await api(`/api/events/${id}/cancellation`,'POST',{});await refresh();},'secondary'));}
  else {const reason=el('input');reason.placeholder='Why are you closing this alert?';reason.maxLength=300;reason.setAttribute('aria-label','Reason for closing this alert');close.append(reason,action('Close alert',async()=>{if(!reason.value.trim())throw new Error('Please enter a reason.');await api(`/api/events/${id}/close`,'POST',{reason:reason.value.trim()});await refresh();},'danger'));}
  card.append(close);
 }
}
function activityLabel(action) { return {SESSION_CREATED:'Signed in',SIMULATOR_DEVICE_PROVISIONED:'Test device added',DEVICE_REVOKED:'Device stopped',CONTACT_INVITED:'Contact invited',CONTACT_ACCEPTED:'Invitation accepted',CONTACT_REVOKED:'Contact sharing stopped',EVENT_COMMITTED:'Alert saved',EVENT_VIEWED:'Alert opened',EVENT_SHARED:'Alert shared',CONTACT_ACKNOWLEDGED:'Contact marked an alert as seen',CONTACT_DECLARED_RESPONSE:'Contact added a response',CANCELLATION_REQUESTED:'Asked to close an alert',EVENT_CLOSED:'Alert closed',SIMULATED_NOTIFICATION_ATTEMPT:'Test notification step tried',LOCATION_SAMPLE_COMMITTED:'Location reading saved',LOCATION_SAMPLES_VIEWED:'Earlier locations opened',IDENTICAL_RETRY:'Repeated alert received',SAMPLE_IDENTICAL_RETRY:'Repeated location reading received'}[action] || 'Account activity'; }
function renderAudit(items){const root=$('audit');root.replaceChildren();items.slice(0,20).forEach(a=>root.append(el('div',`${stamp(a.created_at || a.at)} · ${activityLabel(a.action || a.type)}`,'item')));if(!items.length)root.append(el('p','No account activity to show yet.','muted'));}
$('authForm').addEventListener('submit',e=>{e.preventDefault();run(async()=>setSession(await api('/api/login','POST',{email:$('email').value.trim(),password:$('password').value},null)));});
$('register').addEventListener('click',()=>run(async()=>{if(!$('authForm').reportValidity())return;if(!$('name').value.trim())throw new Error('Enter your name to create an account. A name is not needed to sign in.');setSession(await api('/api/register','POST',{email:$('email').value.trim(),password:$('password').value,name:$('name').value.trim()},null));}));
$('logout').addEventListener('click',()=>run(async()=>{try{await api('/api/logout','POST',{});}finally{document.body.dataset.session='signed-out';registeredDevices=[];selectedEventId=null;clearSelectedAlert();token=null;user=null;contacts=[];generation++;$('workspace').hidden=true;$('sideWorkspace').hidden=true;$('auth').hidden=false;$('showMap').disabled=true;clearMap();$('connectionStatus').textContent='Signed out · private';$('connectionStatus').className='';$('deviceCount').textContent='Your devices';$('lastUpdate').textContent='Private by default';$('avgBattery').textContent='Unknown';$('activeToday').textContent='-';$('panicBar').replaceChildren();$('panicBar').style.display='none';for(const id of ['devices','contacts','events','audit','deviceToken','invitationResult'])$(id).replaceChildren();$('deviceSecret').hidden=true;$('invitationResult').hidden=true;$('simulationToken').value='';notice('Signed out on this device. Any problem ending the server session is shown separately.');}}));
$('refresh').addEventListener('click',refresh);
$('deviceForm').addEventListener('submit',e=>{e.preventDefault();run(async()=>{const r=await api('/api/devices','POST',{name:$('deviceName').value.trim(),form_factor:$('formFactor').value});$('deviceToken').textContent=r.device_token;$('deviceSecret').hidden=false;await refresh();});});
$('hideSecret').addEventListener('click',()=>{$('deviceToken').textContent='';$('deviceSecret').hidden=true;});
$('inviteForm').addEventListener('submit',e=>{e.preventDefault();run(async()=>{const r=await api('/api/contacts/invitations','POST',{email:$('contactEmail').value.trim()});$('invitationResult').replaceChildren(el('strong','Invitation code - no message sent'),el('p','Give this code only to the person you want to invite, using a private way you both trust.'),el('code',r.invitation_token));$('invitationResult').hidden=false;await refresh();});});
$('acceptForm').addEventListener('submit',e=>{e.preventDefault();run(async()=>{await api('/api/contacts/invitations/accept','POST',{invitation_token:$('invitationToken').value.trim()});$('invitationToken').value='';await refresh();});});
$('simulationEvent').value=crypto.randomUUID();
$('simulationForm').addEventListener('submit',e=>{e.preventDefault();run(async()=>{await api('/api/device/events','POST',{event_id:$('simulationEvent').value,sequence:Number($('simulationSequence').value),captured_at:new Date().toISOString(),location:null,battery_v:3.9,connectivity:'SIMULATED'},$('simulationToken').value.trim());await refresh();});});
$('dispatch').addEventListener('click',()=>run(async()=>{await api('/api/simulation/dispatch','POST',{});await refresh();}));

// The original Leaflet panel is retained, but has no external tiles or public data.
function clearMap() {
 authorizedEvents=[]; mapEnabled=false;
 if(map){map.remove();map=null;mapLayer=null;historyLine=null;}
 $('map').hidden=true; $('mapPlaceholder').hidden=false; $('showMap').textContent='Show location';
 $('mapTitle').textContent='Location stays in your control.';
 $('mapExplanation').textContent='The map is off. No outside map service is used.';
}
function updateOverview(){
 $('lastUpdate').textContent='Updated '+new Date().toLocaleTimeString();
 $('connectionStatus').textContent='Signed in · private alerts'; $('connectionStatus').className='connected';
 const active=authorizedEvents.filter(e=>e.state!=='CLOSED'); $('activeToday').textContent=String(active.length);
 const batteries=authorizedEvents.map(e=>(e.latest_sample||e).battery_v).filter(v=>Number.isFinite(v));
 $('avgBattery').textContent=batteries.length?(batteries.reduce((a,b)=>a+b,0)/batteries.length).toFixed(2)+' V':'Unknown';
 const bar=$('panicBar');bar.replaceChildren();bar.style.display=active.length?'flex':'none';
 if(active.length){bar.append(el('strong',active.length+' open test alert'+(active.length===1?'':'s')),el('span','No real alerts sent. Saving an alert does not mean help is on the way.'));}
}
function enableMap(){
 if(!token)throw new Error('Sign in first to see shared locations.');
 if(typeof L==='undefined')throw new Error('The map could not open. You can still read the location details in the alert.');
 mapEnabled=true; $('map').hidden=false; $('mapPlaceholder').hidden=true; $('showMap').textContent='Hide map';
 if(!map){map=L.map('map',{attributionControl:true}).setView([-29.0,25.0],5);map.attributionControl.setPrefix(false);mapLayer=L.layerGroup().addTo(map);}
 map.invalidateSize(); syncMap();
}
function syncMap(){
 if(!mapEnabled||!map)return; mapLayer.clearLayers(); if(historyLine){map.removeLayer(historyLine);historyLine=null;}
 const points=[];
 authorizedEvents.filter(e=>!selectedEventId||e.id===selectedEventId).forEach(e=>{const current=e.latest_sample||e;const p=current.location;
  if(!p||!Number.isFinite(p.latitude)||!Number.isFinite(p.longitude))return;
  const point=[p.latitude,p.longitude];points.push(point);
  const popup=el('div');popup.append(el('strong','Shared alert location'),el('p',e.event_id),el('p',locationLabel(current)));
  L.circleMarker(point,{radius:8,color:e.state==='CLOSED'?'#b6b0c7':document.body.dataset.theme==='purple'?'#c8a6ff':'#d1b873',fillColor:document.body.dataset.theme==='purple'?'#c8a6ff':'#d1b873',fillOpacity:0.8,weight:2}).bindPopup(popup).addTo(mapLayer);
 });
 $('mapTitle').textContent=points.length?'Shared alert locations':'No current location is available';
 $('mapExplanation').textContent='Private map · '+points.length+' location reading'+(points.length===1?'':'s')+'. No outside map service is used. Check each alert for the reading time and accuracy.';
 if(points.length===1)map.setView(points[0],13);else if(points.length>1)map.fitBounds(points,{padding:[30,30],maxZoom:14});
}
async function focusEvent(eventId){
 selectTab('alerts');$('locationDisclosure').open=true;
 const selected=authorizedEvents.find(e=>e.id===eventId);if(!selected)throw new Error('You can no longer view this alert.');
 if(!mapEnabled)enableMap();
 const current=selected.latest_sample||selected; const p=current.location;
 if(p&&Number.isFinite(p.latitude)&&Number.isFinite(p.longitude))map.setView([p.latitude,p.longitude],14);
 const version=generation;
 try {const response=await api('/api/events/'+encodeURIComponent(eventId)+'/locations');if(version!==generation||!token||!mapEnabled)return;
  if(historyLine){map.removeLayer(historyLine);historyLine=null;}
  const samples=listFrom(response,'samples').slice().reverse();const line=samples.filter(s=>s.location&&Number.isFinite(s.location.latitude)&&Number.isFinite(s.location.longitude)).map(s=>[s.location.latitude,s.location.longitude]);
  if(line.length>1)historyLine=L.polyline(line,{color:'#9bbb9c',weight:3,dashArray:'6,6'}).addTo(map);
  $('mapTitle').textContent='Selected alert · '+stateLabel(selected.state);
  $('mapExplanation').textContent=(p?locationLabel(current):'The latest location is missing. Earlier readings do not show where the person is now.')+' Earlier locations: '+line.length+'. A dashed line shows past movement, not the current position. No outside map service is used.';
  $('map').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});
 }catch(error){clearMap();throw error;}
}
const tabs=[['overview','tabOverview','overviewPanel'],['people','tabPeople','peoplePanel'],['alerts','tabAlerts','alertsPanel']];
function selectTab(name){tabs.forEach(([key,tab,panel])=>{const active=key===name;$(tab).setAttribute('aria-selected',String(active));$(tab).tabIndex=active?0:-1;$(panel).hidden=!active;});if(name==='alerts'&&map)map.invalidateSize();}
tabs.forEach(([name,id],index)=>{ $(id).addEventListener('click',()=>selectTab(name));$(id).addEventListener('keydown',event=>{let next=index;if(event.key==='ArrowRight')next=(index+1)%tabs.length;else if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;event.preventDefault();selectTab(tabs[next][0]);$(tabs[next][1]).focus();});});
$('primaryAction').addEventListener('click',()=>{if(registeredDevices.length)selectTab('alerts');else{$('addDevice').open=true;$('deviceName').focus();}});
$('goPeople').addEventListener('click',()=>selectTab('people'));
$('locationDisclosure').addEventListener('toggle',()=>{if(map&&$('locationDisclosure').open)map.invalidateSize();});
document.addEventListener('mzansi-theme-change',()=>syncMap());
$('showMap').addEventListener('click',()=>run(async()=>{if(mapEnabled){const held=authorizedEvents;clearMap();authorizedEvents=held;}else enableMap();}));
// Refresh rechecks permissions; it is not a claim of a continuous cellular connection.
setInterval(()=>{if(token&&!document.hidden&&!['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))refresh();},30000);
document.addEventListener('visibilitychange',()=>{if(token&&!document.hidden)refresh();});
initializeRuntime();
}
