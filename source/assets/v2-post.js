(function(){
  if(!window.LJ) return;

  const isBackoffice=location.pathname.endsWith('backoffice.html') || document.title.includes('Backoffice');
  if(!isBackoffice) return;

  let scheduled=false;
  let reapplying=false;

  function scheduleEnhance(){
    if(scheduled) return;
    scheduled=true;
    setTimeout(()=>{scheduled=false;enhance();},0);
  }

  function sessionUser(db){
    try{
      const s=JSON.parse(sessionStorage.getItem('LJ_BO_SESSION')||'null');
      return s ? db.users.find(u=>u.id===s.userId)||null : null;
    }catch(e){return null;}
  }

  function accessibleSubs(db,user){
    if(!user) return [];
    const outletIds=user.role==='Administrator' ? db.outlets.map(o=>o.id) : (user.outlets||[]);
    return (db.submissions||[]).filter(s=>outletIds.includes(s.outletId));
  }

  function currentFilterValues(){
    const v=id=>document.getElementById(id)?.value||'';
    return {
      search:v('fSearch').trim().toLowerCase(),
      date:v('fDate'),
      outlet:v('fOutlet'),
      dept:v('fDept'),
      employee:v('fEmployee'),
      form:v('fForm')
    };
  }

  function filterCandidates(subs,db,targetId){
    const f=currentFilterValues();
    return subs.filter(s=>{
      const form=LJ.formById(db,s.formId);
      if(f.search){
        const hay=`${s.employeeName||''} ${s.employeeId||''} ${form?.name||''} ${s.outletName||''}`.toLowerCase();
        if(!hay.includes(f.search)) return false;
      }
      if(f.date && s.submissionDate!==f.date) return false;
      if(targetId!=='fOutlet' && f.outlet && s.outletId!==f.outlet) return false;
      if(targetId!=='fDept' && f.dept && s.department!==f.dept) return false;
      if(targetId==='fEmployee' && f.form && s.formId!==f.form) return false;
      if(targetId==='fForm' && f.employee && s.userId!==f.employee) return false;
      return true;
    });
  }

  function setSelectOptions(select,firstLabel,options){
    if(!select) return false;
    const current=select.value;
    const clean=[];
    const seen=new Set();
    options.forEach(o=>{
      if(!o || !o.value || seen.has(o.value)) return;
      seen.add(o.value);clean.push(o);
    });
    const key=JSON.stringify(clean.map(o=>[o.value,o.label]));
    if(select.dataset.v2OptionsKey===key) return false;
    select.dataset.v2OptionsKey=key;
    select.innerHTML=`<option value="">${LJ.esc(firstLabel)}</option>`+clean.map(o=>`<option value="${LJ.esc(o.value)}">${LJ.esc(o.label)}</option>`).join('');
    if(current && seen.has(current)) select.value=current;
    else select.value='';
    return !!current && !seen.has(current);
  }

  function refreshCascadingFilters(){
    const fDept=document.getElementById('fDept');
    if(!fDept) return;
    const db=LJ.getDB();
    const user=sessionUser(db);
    const base=accessibleSubs(db,user);
    let invalidCleared=false;

    const outletSubs=filterCandidates(base,db,'fOutlet');
    invalidCleared=setSelectOptions(document.getElementById('fOutlet'),'All outlets',
      [...new Set(outletSubs.map(s=>s.outletId))].map(id=>({value:id,label:db.outlets.find(o=>o.id===id)?.name||outletSubs.find(s=>s.outletId===id)?.outletName||id}))) || invalidCleared;

    const deptSubs=filterCandidates(base,db,'fDept');
    const deptOrder=['FOH','BOH'];
    invalidCleared=setSelectOptions(fDept,'FOH + BOH',
      deptOrder.filter(d=>deptSubs.some(s=>s.department===d)).map(d=>({value:d,label:d}))) || invalidCleared;

    const employeeSubs=filterCandidates(base,db,'fEmployee');
    const employeeMap=new Map();
    employeeSubs.forEach(s=>{if(!employeeMap.has(s.userId)) employeeMap.set(s.userId,s.employeeName||s.employeeId||s.userId);});
    invalidCleared=setSelectOptions(document.getElementById('fEmployee'),'All employees',
      [...employeeMap.entries()].sort((a,b)=>a[1].localeCompare(b[1])).map(([value,label])=>({value,label}))) || invalidCleared;

    const formSubs=filterCandidates(base,db,'fForm');
    const formIds=[...new Set(formSubs.map(s=>s.formId))];
    invalidCleared=setSelectOptions(document.getElementById('fForm'),'All form types',
      formIds.map(id=>({value:id,label:LJ.formById(db,id)?.name||'Form'})).sort((a,b)=>a.label.localeCompare(b.label))) || invalidCleared;

    if(invalidCleared && !reapplying){
      reapplying=true;
      setTimeout(()=>{
        const search=document.getElementById('fSearch');
        if(search) search.dispatchEvent(new Event('input',{bubbles:true}));
        reapplying=false;
      },0);
    }
  }

  function addClearFilters(){
    const filters=document.querySelector('.filters');
    if(!filters || document.getElementById('clearAllFilters')) return;
    const cell=document.createElement('div');
    cell.className='filter-clear-cell';
    cell.innerHTML='<button type="button" class="btn btn-soft" id="clearAllFilters">Clear all filters</button>';
    filters.appendChild(cell);
    document.getElementById('clearAllFilters').onclick=()=>{
      ['fSearch','fDate','fOutlet','fDept','fEmployee','fForm'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
      document.querySelectorAll('#fOutlet,#fDept,#fEmployee,#fForm').forEach(el=>delete el.dataset.v2OptionsKey);
      const search=document.getElementById('fSearch');
      if(search) search.dispatchEvent(new Event('input',{bubbles:true}));
      refreshCascadingFilters();
      LJ.toast('All filters cleared.');
    };
  }

  function addTopLogout(){
    const actions=document.querySelector('.bo-topbar .top-actions');
    if(!actions || document.getElementById('v2TopLogout')) return;
    const btn=document.createElement('button');
    btn.type='button';btn.id='v2TopLogout';btn.className='icon-btn v2-top-logout';
    btn.title='Sign Out';btn.innerHTML='<span class="logout-icon">↗</span><span class="logout-label">Sign Out</span>';
    btn.onclick=()=>{sessionStorage.removeItem('LJ_BO_SESSION');location.reload();};
    actions.appendChild(btn);
  }

  function deleteForm(id){
    const db=LJ.getDB();
    const form=LJ.formById(db,id);if(!form) return;
    const submissionCount=(db.submissions||[]).filter(s=>s.formId===id).length;
    const message=`Delete “${form.name}”?${submissionCount?`\n\nThis will also delete ${submissionCount} related submission${submissionCount===1?'':'s'} and any saved drafts so the demo data stays consistent.`:'\n\nAny saved drafts for this form will also be removed.'}\n\nThis action cannot be undone.`;
    if(!confirm(message)) return;
    db.forms=(db.forms||[]).filter(f=>f.id!==id);
    db.submissions=(db.submissions||[]).filter(s=>s.formId!==id);
    Object.keys(db.drafts||{}).forEach(k=>{if(db.drafts[k]?.formId===id) delete db.drafts[k];});
    LJ.saveDB(db);LJ.toast('Form deleted.');
    setTimeout(()=>document.querySelector('[data-page="forms"]')?.click(),0);
  }

  function addFormDeleteButtons(){
    document.querySelectorAll('[data-edit-form]').forEach(edit=>{
      const id=edit.dataset.editForm;
      const actions=edit.closest('.builder-actions');
      if(!actions || actions.querySelector('[data-v2-delete-form]')) return;
      const btn=document.createElement('button');
      btn.type='button';btn.className='btn btn-danger small';btn.dataset.v2DeleteForm=id;btn.textContent='Delete';
      btn.onclick=()=>deleteForm(id);actions.appendChild(btn);
    });
  }

  function deleteUser(id){
    const db=LJ.getDB();
    const current=sessionUser(db);
    const target=(db.users||[]).find(u=>u.id===id);if(!target) return;
    if(current?.id===id){LJ.toast('You cannot delete the account you are currently using.');return;}
    if(target.role==='Administrator'){
      const otherAdmins=(db.users||[]).filter(u=>u.role==='Administrator'&&u.id!==id);
      if(!otherAdmins.length){LJ.toast('Keep at least one Administrator account.');return;}
    }
    const submissionCount=(db.submissions||[]).filter(s=>s.userId===id).length;
    const message=`Delete user “${target.name}” (${target.employeeId})?${submissionCount?`\n\nThis will also delete ${submissionCount} related submission${submissionCount===1?'':'s'} and any saved drafts for this demo user.`:'\n\nAny saved drafts for this user will also be removed.'}\n\nThis action cannot be undone.`;
    if(!confirm(message)) return;
    db.users=(db.users||[]).filter(u=>u.id!==id);
    db.submissions=(db.submissions||[]).filter(s=>s.userId!==id);
    Object.keys(db.drafts||{}).forEach(k=>{if(db.drafts[k]?.userId===id) delete db.drafts[k];});
    LJ.saveDB(db);LJ.toast('User deleted.');
    setTimeout(()=>document.querySelector('[data-page="users"]')?.click(),0);
  }

  function addUserDeleteButtons(){
    document.querySelectorAll('[data-edit-user]').forEach(edit=>{
      const id=edit.dataset.editUser;
      const cell=edit.closest('td');
      if(!cell || cell.querySelector('[data-v2-delete-user]')) return;
      const btn=document.createElement('button');
      btn.type='button';btn.className='btn btn-danger small v2-delete-user';btn.dataset.v2DeleteUser=id;btn.textContent='Delete';
      btn.onclick=()=>deleteUser(id);cell.appendChild(btn);
    });
  }

  function enhance(){
    addTopLogout();
    if(document.getElementById('fDept')){addClearFilters();refreshCascadingFilters();}
    addFormDeleteButtons();
    addUserDeleteButtons();
  }

  document.addEventListener('change',e=>{
    if(['fDate','fOutlet','fDept','fEmployee','fForm'].includes(e.target?.id)) scheduleEnhance();
  },true);
  document.addEventListener('input',e=>{
    if(e.target?.id==='fSearch') scheduleEnhance();
  },true);

  const root=document.getElementById('app')||document.body;
  new MutationObserver(scheduleEnhance).observe(root,{childList:true,subtree:true});
  enhance();
})();
