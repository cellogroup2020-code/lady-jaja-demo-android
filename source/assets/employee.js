(function(){
  LJ.showSplash();
  if('serviceWorker' in navigator && location.protocol!=='file:'){navigator.serviceWorker.register('sw.js').catch(()=>{})}
  const app=document.getElementById('app');
  let db=LJ.getDB();
  let session=null,currentUser=null,currentOutletId=null,tab='forms';
  let activeFormId=null,activeStartTime=null,activeResponses={},validationErrors={};

  function loadSession(){
    try{session=JSON.parse(sessionStorage.getItem('LJ_EMP_SESSION')||'null')}catch(e){session=null}
    if(session){currentUser=db.users.find(u=>u.id===session.userId)||null;currentOutletId=session.outletId||null}
  }
  function saveSession(){sessionStorage.setItem('LJ_EMP_SESSION',JSON.stringify({userId:currentUser?.id,outletId:currentOutletId}))}
  function logout(){sessionStorage.removeItem('LJ_EMP_SESSION');currentUser=null;currentOutletId=null;activeFormId=null;renderLogin()}

  function renderLogin(error=''){
    app.innerHTML=`<div class="login-shell">
      <section class="login-visual"><div class="login-brand"><img src="assets/logo.png" alt="Lady Jaja"></div><div class="login-claim"><h1>Simple tools.<br>Consistent shifts.</h1><p>BUILT ON EVERYDAY TRUST</p></div></section>
      <section class="login-panel"><div class="login-card"><h2>Employee sign in</h2><p class="lede">Use your Employee ID and PIN to open your Lady Jaja forms.</p>${error?`<div class="error-box">${LJ.esc(error)}</div>`:''}
      <form id="loginForm"><div class="field"><label>Employee ID</label><input class="input" id="employeeId" autocomplete="username" placeholder="e.g. FOH001" required></div><div class="field"><label>PIN</label><input class="input" id="pin" type="password" inputmode="numeric" autocomplete="current-password" placeholder="4-digit PIN" required></div><button class="btn btn-primary full" type="submit">Sign In</button></form>
      <div class="login-note">Lady Jaja Employee App • FOH / BOH</div></div></section></div>`;
    document.getElementById('loginForm').addEventListener('submit',e=>{
      e.preventDefault();db=LJ.getDB();
      const id=document.getElementById('employeeId').value.trim(),pin=document.getElementById('pin').value.trim();
      const user=LJ.userByEmployeeId(db,id);
      if(!user||user.pin!==pin)return renderLogin('Employee ID or PIN is incorrect.');
      if(!['FOH In-Charge','BOH In-Charge'].includes(user.role))return renderLogin('This account belongs to Backoffice. Please use the Manager / Admin portal.');
      currentUser=user;currentOutletId=null;saveSession();renderBranchSelection();
    });
  }

  function renderBranchSelection(){
    db=LJ.getDB();
    const outlets=currentUser.outlets.map(id=>LJ.outletById(db,id)).filter(Boolean);
    app.innerHTML=`<div class="login-shell"><section class="login-visual"><div class="login-brand"><img src="assets/logo.png" alt="Lady Jaja"></div><div class="login-claim"><h1>Select your<br>outlet.</h1><p>${LJ.esc(currentUser.role.toUpperCase())}</p></div></section><section class="login-panel"><div class="login-card"><h2>Good to see you, ${LJ.esc(currentUser.name.split(' ')[0])}</h2><p class="lede">Choose the Lady Jaja outlet you are working in for this session.</p><div class="branch-grid">${outlets.map((o,i)=>`<button class="branch-card" data-outlet="${o.id}"><div class="branch-no">0${i+1}</div><h4>${LJ.esc(o.name)}</h4><div class="small muted">Open this outlet →</div></button>`).join('')}</div><button id="branchLogout" class="btn btn-ghost full" style="margin-top:18px">Sign Out</button></div></section></div>`;
    document.querySelectorAll('.branch-card').forEach(b=>b.addEventListener('click',()=>{currentOutletId=b.dataset.outlet;saveSession();renderApp()}));
    document.getElementById('branchLogout').onclick=logout;
  }

  function topbar(){
    const outlet=LJ.outletById(db,currentOutletId);
    return `<header class="topbar"><div class="brand-lockup"><img src="assets/logo.png"><div><div class="brand-title">Lady Jaja</div><div class="brand-sub">${LJ.esc(outlet?.name||'')}</div></div></div><div class="top-actions"><button class="icon-btn" id="changeOutlet" title="Change outlet">↔</button><div class="user-chip"><div class="avatar">${LJ.initials(currentUser.name)}</div><div class="u-text"><div class="small strong">${LJ.esc(currentUser.name)}</div><div class="small muted">${LJ.esc(currentUser.role)}</div></div></div><button class="icon-btn" id="logoutBtn" title="Sign out">↗</button></div></header>`;
  }
  function greeting(){const h=new Date().getHours();return h<12?'morning':h<18?'afternoon':'evening'}

  function renderApp(){
    db=LJ.getDB();
    if(!currentUser||!currentOutletId)return renderLogin();
    const outlet=LJ.outletById(db,currentOutletId),first=currentUser.name.split(' ')[0];
    app.innerHTML=`<div class="mobile-shell">${topbar()}<main class="employee-main"><section class="hero-card"><div class="hero-kicker">${LJ.esc(currentUser.department)} • ${LJ.esc(outlet.name)}</div><h1>Good ${greeting()}, ${LJ.esc(first)}.</h1><div class="hero-meta"><span class="pill">${LJ.formatDate(LJ.dateKey())}</span><span class="pill">${LJ.esc(currentUser.role)}</span></div></section><div class="employee-tabs"><button class="tab-btn ${tab==='forms'?'active':''}" data-tab="forms">My Forms</button><button class="tab-btn ${tab==='history'?'active':''}" data-tab="history">Submission History</button></div><div id="tabContent"></div></main></div>`;
    document.getElementById('logoutBtn').onclick=logout;
    document.getElementById('changeOutlet').onclick=()=>{currentOutletId=null;saveSession();renderBranchSelection()};
    document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;renderApp()});
    tab==='forms'?renderForms():renderHistory();
  }

  function draftKey(formId){return `${currentUser.id}|${currentOutletId}|${formId}`}
  function getDraft(formId){return db.drafts[draftKey(formId)]||null}
  function todaySubmissions(formId){return db.submissions.filter(s=>s.formId===formId&&s.userId===currentUser.id&&s.outletId===currentOutletId&&s.submissionDate===LJ.dateKey()).sort((a,b)=>new Date(b.submitTime)-new Date(a.submitTime))}
  function formQuestionCount(form){return form.sections.reduce((n,s)=>n+s.questions.length,0)}
  function draftProgress(form,draft){
    if(!draft)return 0;let answered=0,total=0;
    form.sections.forEach(sec=>sec.questions.forEach(q=>{total++;const r=draft.responses?.[q.id];if(r&&((q.type==='photo'&&(r.photos||[]).length)||(!['',null,undefined].includes(r.value))))answered++}));
    return total?Math.round(answered/total*100):0;
  }

  function renderForms(){
    const forms=db.forms.filter(f=>f.published&&f.department===currentUser.department&&f.outlets.includes(currentOutletId));
    const c=document.getElementById('tabContent');
    c.innerHTML=`<div class="section-title"><div><h2>Your forms</h2><p>Demo mode allows repeated submissions so you can test each form as many times as needed.</p></div></div><div class="form-list">${forms.map(f=>{
      const subs=todaySubmissions(f.id),latest=subs[0],draft=getDraft(f.id),pc=draftProgress(f,draft);
      const status=subs.length?`Submitted ${subs.length}× today`:'Pending';
      return `<article class="form-card"><div class="form-icon">${f.category==='Daily Report'?'R':f.category==='Opening Checklist'?'O':'C'}</div><div class="form-card-body"><h3>${LJ.esc(f.name)}</h3><div class="form-meta">${formQuestionCount(f)} items • ${LJ.esc(f.category)}${draft?` • Draft saved`:''}</div>${draft?`<div class="progress-line"><span style="width:${pc}%"></span></div>`:''}</div><div class="form-card-actions"><span class="status ${subs.length?'submitted':'pending'}">${status}</span>${latest?`<button class="btn btn-soft small" data-view-sub="${latest.id}">View latest</button>`:''}<button class="btn btn-primary small" data-open-form="${f.id}">${draft?'Resume Draft':subs.length?'Submit Again':'Open'}</button></div></article>`;
    }).join('')}</div>`;
    c.querySelectorAll('[data-open-form]').forEach(b=>b.onclick=()=>openForm(b.dataset.openForm));
    c.querySelectorAll('[data-view-sub]').forEach(b=>b.onclick=()=>showSubmission(b.dataset.viewSub));
  }

  function renderHistory(){
    const subs=db.submissions.filter(s=>s.userId===currentUser.id).sort((a,b)=>new Date(b.submitTime)-new Date(a.submitTime));
    const c=document.getElementById('tabContent');
    c.innerHTML=`<div class="section-title"><div><h2>Submission history</h2><p>All forms submitted from your account, including repeat demo tests.</p></div></div>${subs.length?subs.map(s=>{const f=LJ.formById(db,s.formId);return `<article class="history-card"><div class="history-top"><div><div class="history-title">${LJ.esc(f?.name||'Form')}</div><div class="history-meta">${LJ.esc(s.outletName)} • ${LJ.formatDateTime(s.submitTime)}</div></div><button class="btn btn-soft small" data-view-sub="${s.id}">View</button></div></article>`}).join(''):`<div class="history-card muted">No submissions yet.</div>`}`;
    c.querySelectorAll('[data-view-sub]').forEach(b=>b.onclick=()=>showSubmission(b.dataset.viewSub));
  }

  function openForm(formId){
    db=LJ.getDB();const form=LJ.formById(db,formId);if(!form)return;
    activeFormId=formId;validationErrors={};
    const draft=getDraft(formId);
    activeStartTime=draft?.startTime||new Date().toISOString();
    activeResponses=LJ.clone(draft?.responses||{});
    renderFormPage();window.scrollTo({top:0,behavior:'smooth'});
  }
  function responseFor(qid){if(!activeResponses[qid])activeResponses[qid]={value:'',comment:'',photos:[]};return activeResponses[qid]}
  function answeredCount(form){let total=0,answered=0;form.sections.forEach(s=>s.questions.forEach(q=>{total++;const r=responseFor(q.id);const ok=q.type==='photo'?(r.photos||[]).length:r.value!==''&&r.value!==null&&r.value!==undefined;if(ok)answered++}));return {answered,total,pct:total?Math.round(answered/total*100):0}}

  function renderFormPage(){
    const form=LJ.formById(db,activeFormId),outlet=LJ.outletById(db,currentOutletId),progress=answeredCount(form);
    app.innerHTML=`<div class="mobile-shell">${topbar()}<main class="employee-main form-page"><div class="form-header"><button class="btn btn-ghost small" id="backToForms">← Forms</button><div class="form-heading"><div class="hero-kicker">${LJ.esc(form.category)} • ${LJ.esc(outlet.name)}</div><h1>${LJ.esc(form.name)}</h1><p>${LJ.esc(form.description||'Complete the form below and submit at the end.')}</p></div><div class="form-progress-box"><div><strong>${progress.pct}%</strong><span>${progress.answered}/${progress.total} answered</span></div><div class="progress-bar"><span style="width:${progress.pct}%"></span></div></div></div><section class="auto-meta"><div><span>Employee</span><strong>${LJ.esc(currentUser.name)}</strong></div><div><span>Employee ID</span><strong>${LJ.esc(currentUser.employeeId)}</strong></div><div><span>Outlet</span><strong>${LJ.esc(outlet.name)}</strong></div><div><span>Started</span><strong>${LJ.formatTime(activeStartTime)}</strong></div></section><form id="activeForm">${form.sections.map((sec,si)=>`<section class="form-section"><div class="form-section-head"><div class="section-number">${String(si+1).padStart(2,'0')}</div><div><h2>${LJ.esc(sec.title)}</h2>${sec.description?`<p>${LJ.esc(sec.description)}</p>`:''}</div></div>${sec.questions.map((q,qi)=>renderQuestion(q,qi)).join('')}</section>`).join('')}</form><div class="form-footer"><button class="btn btn-soft" id="saveDraftBtn">Save Draft</button><button class="btn btn-primary" id="submitFormBtn">Submit Form</button></div></main></div>`;
    document.getElementById('logoutBtn').onclick=logout;document.getElementById('changeOutlet').onclick=()=>{saveDraft();currentOutletId=null;saveSession();renderBranchSelection()};
    document.getElementById('backToForms').onclick=()=>{saveDraft();activeFormId=null;renderApp()};
    bindQuestions();document.getElementById('saveDraftBtn').onclick=e=>{e.preventDefault();saveDraft()};document.getElementById('submitFormBtn').onclick=e=>{e.preventDefault();submitForm()};
  }
  function renderQuestion(q,qi){
    const r=responseFor(q.id),err=validationErrors[q.id];let control='';
    const req=q.required?'<span class="req">Required</span>':'<span class="optional">Optional</span>';
    if(q.type==='yesno'||q.type==='yesnona'){const opts=q.type==='yesnona'?['Yes','No','N/A']:['Yes','No'];control=`<div class="choice-row">${opts.map(o=>`<button type="button" class="choice-btn ${r.value===o?'selected':''}" data-q="${q.id}" data-choice="${o}">${o}</button>`).join('')}</div>`}
    else if(q.type==='multiple'){control=`<div class="choice-row wrap">${(q.options||[]).map(o=>`<button type="button" class="choice-btn ${r.value===o?'selected':''}" data-q="${q.id}" data-choice="${LJ.esc(o)}">${LJ.esc(o)}</button>`).join('')}</div>`}
    else if(q.type==='shorttext')control=`<input class="input" data-input="${q.id}" value="${LJ.esc(r.value||'')}" placeholder="${LJ.esc(q.placeholder||'Enter response')}" maxlength="${q.maxLength||500}">`;
    else if(q.type==='longtext')control=`<textarea class="textarea" data-input="${q.id}" placeholder="${LJ.esc(q.placeholder||'Enter details')}" maxlength="${q.maxLength||2000}">${LJ.esc(r.value||'')}</textarea>`;
    else if(q.type==='number')control=`<input class="input" type="number" data-input="${q.id}" value="${LJ.esc(r.value||'')}" min="${q.min??''}" max="${q.max??''}" step="${q.step||1}" placeholder="${LJ.esc(q.placeholder||'Enter number')}"><div class="field-help">Accepted${q.min!==''&&q.min!==undefined?` from ${q.min}`:''}${q.max!==''&&q.max!==undefined?` to ${q.max}`:''}${q.step?` • step ${q.step}`:''}</div>`;
    else if(q.type==='date')control=`<input class="input" type="date" data-input="${q.id}" value="${LJ.esc(r.value||'')}" min="${q.minDate||''}" max="${q.maxDate||''}"><div class="field-help">Format: YYYY-MM-DD${q.minDate||q.maxDate?` • ${q.minDate?`from ${q.minDate}`:''}${q.minDate&&q.maxDate?' ':''}${q.maxDate?`to ${q.maxDate}`:''}`:''}</div>`;
    else if(q.type==='time')control=`<input class="input" type="time" data-input="${q.id}" value="${LJ.esc(r.value||'')}" min="${q.minTime||''}" max="${q.maxTime||''}"><div class="field-help">Format: HH:MM${q.minTime||q.maxTime?` • ${q.minTime?`from ${q.minTime}`:''}${q.minTime&&q.maxTime?' ':''}${q.maxTime?`to ${q.maxTime}`:''}`:''}</div>`;
    else if(q.type==='rating'){const max=q.ratingMax||5;control=`<div class="rating-row">${Array.from({length:max},(_,i)=>i+1).map(n=>`<button type="button" class="rating-btn ${Number(r.value)===n?'selected':''}" data-q="${q.id}" data-rating="${n}">${n}</button>`).join('')}</div><div class="rating-caption"><span>1</span><span>Rating out of ${max}</span><span>${max}</span></div>`}
    else if(q.type==='photo'){const max=q.maxPhotos||1;control=`<div class="photo-uploader"><input type="file" accept="image/*" capture="environment" multiple class="photo-input" id="photo_${q.id}" data-photo="${q.id}"><label for="photo_${q.id}" class="photo-upload-btn"><span>＋</span><strong>Take Photo${max>1?'s':''}</strong><small>Camera only • up to ${max}</small></label></div>${renderPhotos(q,r)}`}
    return `<div class="question-block ${err?'has-error':''}" id="q_${q.id}"><div class="question-head"><div class="question-copy"><div class="question-index">${String(qi+1).padStart(2,'0')}</div><div><div class="question-label">${LJ.esc(q.label)}</div>${q.help?`<div class="question-help">${LJ.esc(q.help)}</div>`:''}</div></div>${req}</div><div class="answer-area">${control}</div>${q.requireCommentOnNo&&r.value==='No'?`<div class="conditional-comment"><label>Comment required for “No”</label><textarea class="textarea" data-comment="${q.id}" placeholder="Explain what you observed...">${LJ.esc(r.comment||'')}</textarea></div>`:''}${err?`<div class="validation-message">${LJ.esc(err)}</div>`:''}</div>`;
  }
  function renderPhotos(q,r){return (r.photos||[]).length?`<div class="photo-strip">${r.photos.map((p,i)=>`<div class="photo-thumb"><img src="${p}"><button type="button" data-remove-photo="${q.id}|${i}" title="Remove">✕</button></div>`).join('')}</div>`:''}
  function bindQuestions(){
    document.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{responseFor(b.dataset.q).value=b.dataset.choice;delete validationErrors[b.dataset.q];renderFormPage()});
    document.querySelectorAll('[data-rating]').forEach(b=>b.onclick=()=>{responseFor(b.dataset.q).value=Number(b.dataset.rating);delete validationErrors[b.dataset.q];renderFormPage()});
    document.querySelectorAll('[data-input]').forEach(el=>el.onchange=()=>{responseFor(el.dataset.input).value=el.value;delete validationErrors[el.dataset.input]});
    document.querySelectorAll('[data-comment]').forEach(el=>el.oninput=()=>{responseFor(el.dataset.comment).comment=el.value;delete validationErrors[el.dataset.comment]});
    document.querySelectorAll('[data-photo]').forEach(input=>input.onchange=async()=>{const qId=input.dataset.photo,q=LJ.findQuestion(LJ.formById(db,activeFormId),qId),r=responseFor(qId);const files=[...input.files],slots=(q.maxPhotos||1)-(r.photos||[]).length;if(slots<=0)return LJ.toast(`Maximum ${q.maxPhotos||1} photo${(q.maxPhotos||1)>1?'s':''}.`);for(const file of files.slice(0,slots)){r.photos.push(await compressImage(file))}delete validationErrors[qId];renderFormPage()});
    document.querySelectorAll('[data-remove-photo]').forEach(b=>b.onclick=()=>{const [qid,idx]=b.dataset.removePhoto.split('|');responseFor(qid).photos.splice(Number(idx),1);renderFormPage()});
  }
  function compressImage(file){return new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{const max=900;let w=img.width,h=img.height;const scale=Math.min(1,max/Math.max(w,h));w=Math.round(w*scale);h=Math.round(h*scale);const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);resolve(c.toDataURL('image/jpeg',.72))};img.src=reader.result};reader.readAsDataURL(file)})}

  function saveDraft(){db=LJ.getDB();db.drafts[draftKey(activeFormId)]={formId:activeFormId,userId:currentUser.id,outletId:currentOutletId,startTime:activeStartTime,updatedAt:new Date().toISOString(),responses:LJ.clone(activeResponses)};LJ.saveDB(db);LJ.toast('Draft saved.')}
  function validateForm(){
    validationErrors={};const form=LJ.formById(db,activeFormId);
    form.sections.forEach(sec=>sec.questions.forEach(q=>{
      const r=responseFor(q.id),empty=q.type==='photo'?!(r.photos||[]).length:(r.value===''||r.value===null||r.value===undefined);
      if(q.required&&empty)validationErrors[q.id]='This item is required.';
      if(q.requireCommentOnNo&&r.value==='No'&&!String(r.comment||'').trim())validationErrors[q.id]='Please add a comment for this “No” response.';
      if(q.type==='number'&&!empty){const n=Number(r.value);if(Number.isNaN(n))validationErrors[q.id]='Enter a valid number.';else if(q.min!==''&&q.min!==undefined&&n<Number(q.min))validationErrors[q.id]=`Minimum accepted value is ${q.min}.`;else if(q.max!==''&&q.max!==undefined&&n>Number(q.max))validationErrors[q.id]=`Maximum accepted value is ${q.max}.`}
      if(q.type==='date'&&!empty){if(q.minDate&&r.value<q.minDate)validationErrors[q.id]=`Earliest accepted date is ${q.minDate}.`;if(q.maxDate&&r.value>q.maxDate)validationErrors[q.id]=`Latest accepted date is ${q.maxDate}.`}
      if(q.type==='time'&&!empty){if(q.minTime&&r.value<q.minTime)validationErrors[q.id]=`Earliest accepted time is ${q.minTime}.`;if(q.maxTime&&r.value>q.maxTime)validationErrors[q.id]=`Latest accepted time is ${q.maxTime}.`}
    }));
    return Object.keys(validationErrors).length===0;
  }
  function submitForm(){
    db=LJ.getDB();if(!validateForm()){renderFormPage();const first=Object.keys(validationErrors)[0];document.getElementById('q_'+first)?.scrollIntoView({behavior:'smooth',block:'center'});LJ.toast('Please complete the required items.');return}
    const form=LJ.formById(db,activeFormId),outlet=LJ.outletById(db,currentOutletId),responses=form.sections.flatMap(sec=>sec.questions).map(q=>({questionId:q.id,value:responseFor(q.id).value,comment:responseFor(q.id).comment||'',photos:responseFor(q.id).photos||[]}));
    db.submissions.push({id:LJ.uid('sub'),formId:form.id,userId:currentUser.id,employeeId:currentUser.employeeId,employeeName:currentUser.name,role:currentUser.role,department:currentUser.department,outletId:outlet.id,outletName:outlet.name,submissionDate:LJ.dateKey(),startTime:activeStartTime,submitTime:new Date().toISOString(),responses});
    delete db.drafts[draftKey(activeFormId)];LJ.saveDB(db);activeFormId=null;activeResponses={};validationErrors={};tab='forms';renderApp();LJ.toast('Form submitted. You can submit another demo test anytime.');
  }

  function submissionContext(sub){
    const f=LJ.formById(db,sub.formId),qMap={};f?.sections.forEach(sec=>sec.questions.forEach(q=>qMap[q.id]={...q,section:sec.title}));return {f,qMap};
  }
  function photoRecords(sub){const {qMap}=submissionContext(sub),out=[];(sub.responses||[]).forEach(r=>(r.photos||[]).forEach((p,i)=>out.push({data:p,q:qMap[r.questionId],index:i+1})));return out}
  function downloadAllPhotos(sub){
    const photos=photoRecords(sub);if(!photos.length)return LJ.toast('No photos attached to this submission.');
    const base=LJ.safeFilename(`${sub.submissionDate}_${sub.outletName}_${sub.employeeName}`);photos.forEach((x,i)=>setTimeout(()=>LJ.downloadDataUrl(`${base}_Photo_${String(i+1).padStart(2,'0')}.${LJ.dataUrlExtension(x.data)}`,x.data),i*180));LJ.toast(`${photos.length} photo download${photos.length===1?'':'s'} started.`);
  }
  function exportSubmissionExcel(sub){
    const {f,qMap}=submissionContext(sub),rows=(sub.responses||[]).map(r=>{const q=qMap[r.questionId];return `<tr><td>${LJ.esc(q?.section||'')}</td><td>${LJ.esc(q?.label||'')}</td><td>${LJ.esc(r.value||((r.photos||[]).length?`${r.photos.length} photo(s)`:'—'))}</td><td>${LJ.esc(r.comment||'')}</td><td>${(r.photos||[]).length}</td></tr>`}).join('');
    const html=`<html><head><meta charset="utf-8"></head><body><h2>Lady Jaja - ${LJ.esc(f?.name||'Submission')}</h2><table border="1"><tr><th>Outlet</th><td>${LJ.esc(sub.outletName)}</td><th>Employee</th><td>${LJ.esc(sub.employeeName)}</td></tr><tr><th>Employee ID</th><td>${LJ.esc(sub.employeeId)}</td><th>Department</th><td>${LJ.esc(sub.department)}</td></tr><tr><th>Start</th><td>${LJ.esc(LJ.formatDateTime(sub.startTime))}</td><th>Submitted</th><td>${LJ.esc(LJ.formatDateTime(sub.submitTime))}</td></tr></table><br><table border="1"><tr><th>Section</th><th>Question</th><th>Answer</th><th>Comment</th><th>Photos</th></tr>${rows}</table></body></html>`;
    LJ.download(`${LJ.safeFilename(f?.name||'Lady_Jaja_Submission')}_${sub.submissionDate}.xls`,html,'application/vnd.ms-excel');
  }
  function exportSubmissionPDF(sub){
    const {f,qMap}=submissionContext(sub),w=window.open('','_blank');if(!w)return LJ.toast('Please allow pop-ups to export PDF.');let current='',body='';
    (sub.responses||[]).forEach(r=>{const q=qMap[r.questionId];if(!q)return;if(q.section!==current){current=q.section;body+=`<h3>${LJ.esc(current)}</h3>`}body+=`<div class="row"><div class="q">${LJ.esc(q.label)}</div><div>${LJ.esc(r.value||((r.photos||[]).length?'Photo evidence':'—'))}</div>${r.comment?`<div class="comment"><b>Comment:</b> ${LJ.esc(r.comment)}</div>`:''}${(r.photos||[]).length?`<div class="photos">${r.photos.map(p=>`<img src="${p}">`).join('')}</div>`:''}</div>`});
    w.document.write(`<html><head><title>${LJ.esc(f?.name||'Lady Jaja')}</title><style>body{font-family:Arial,sans-serif;padding:30px;color:#111}h1{color:#E74605;margin-bottom:4px}h3{color:#E74605;border-bottom:1px solid #eee;padding-bottom:6px;margin-top:24px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;background:#FBF0E3;padding:14px;border-radius:12px}.row{padding:12px 0;border-bottom:1px solid #eee;font-size:12px}.q{font-weight:700;margin-bottom:5px}.comment{margin-top:5px}.photos{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.photos img{width:145px;height:110px;object-fit:cover;border:1px solid #ddd;border-radius:8px}@media print{button{display:none}}</style></head><body><h1>Lady Jaja</h1><h2>${LJ.esc(f?.name||'Submission')}</h2><div class="meta"><div><b>Outlet:</b> ${LJ.esc(sub.outletName)}</div><div><b>Employee:</b> ${LJ.esc(sub.employeeName)} (${LJ.esc(sub.employeeId)})</div><div><b>Department:</b> ${LJ.esc(sub.department)}</div><div><b>Submitted:</b> ${LJ.esc(LJ.formatDateTime(sub.submitTime))}</div></div>${body}<script>setTimeout(()=>window.print(),500)<\/script></body></html>`);w.document.close();
  }

  function showSubmission(id){
    db=LJ.getDB();const sub=db.submissions.find(s=>s.id===id);if(!sub)return;const {f,qMap}=submissionContext(sub);let current='',body='';
    (sub.responses||[]).forEach(r=>{const q=qMap[r.questionId];if(!q)return;if(q.section!==current){current=q.section;body+=`<div class="answer-section"><h4>${LJ.esc(current)}</h4></div>`}body+=`<div class="answer-row"><div class="question">${LJ.esc(q.label)}</div><div class="answer">${LJ.esc(r.value||((r.photos||[]).length?'Photo evidence':'—'))}${r.comment?`<div class="small" style="margin-top:5px"><strong>Comment:</strong> ${LJ.esc(r.comment)}</div>`:''}${(r.photos||[]).length?`<div class="evidence-grid">${r.photos.map((p,i)=>`<figure class="evidence-item"><img src="${p}"><button class="photo-download" type="button" data-download-photo="${r.questionId}|${i}">↓ Download</button></figure>`).join('')}</div>`:''}</div></div>`});
    const photos=photoRecords(sub),modal=document.createElement('div');modal.className='modal';modal.innerHTML=`<div class="modal-card"><div class="modal-head"><div><div class="small muted">${LJ.esc(sub.department)} • ${LJ.esc(f?.category||'Form')}</div><h3 style="margin-top:3px">${LJ.esc(f?.name||'Submission')}</h3></div><button class="icon-btn" data-close>✕</button></div><div class="modal-body"><div class="submission-meta-grid"><div class="meta-box"><span>Outlet</span><strong>${LJ.esc(sub.outletName)}</strong></div><div class="meta-box"><span>Submitted</span><strong>${LJ.formatDateTime(sub.submitTime)}</strong></div><div class="meta-box"><span>Employee</span><strong>${LJ.esc(sub.employeeName)}</strong></div></div>${body}</div><div class="modal-foot modal-foot-split"><div class="toolbar"><button class="btn btn-soft" id="employeeExportXls">Export Excel</button><button class="btn btn-soft" id="employeeExportPdf">Export PDF</button>${photos.length?`<button class="btn btn-soft" id="employeeDownloadPhotos">Download Photos (${photos.length})</button>`:''}</div><button class="btn btn-primary" data-close>Done</button></div></div>`;document.body.appendChild(modal);LJ.bindModal(modal);
    document.getElementById('employeeExportXls').onclick=()=>exportSubmissionExcel(sub);document.getElementById('employeeExportPdf').onclick=()=>exportSubmissionPDF(sub);if(photos.length)document.getElementById('employeeDownloadPhotos').onclick=()=>downloadAllPhotos(sub);
    modal.querySelectorAll('[data-download-photo]').forEach(b=>b.onclick=()=>{const [qid,idx]=b.dataset.downloadPhoto.split('|'),r=sub.responses.find(x=>x.questionId===qid),p=r?.photos?.[Number(idx)];if(p)LJ.downloadDataUrl(`${LJ.safeFilename(f?.name)}_${qid}_${Number(idx)+1}.${LJ.dataUrlExtension(p)}`,p)});
  }

  loadSession();
  if(currentUser){if(currentOutletId&&currentUser.outlets.includes(currentOutletId))renderApp();else renderBranchSelection()}else renderLogin();
})();
