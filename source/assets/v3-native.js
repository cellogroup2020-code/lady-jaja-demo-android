(function(){
  var scheduled=false,reapplying=false;

  function scheduleEnhance(){
    if(scheduled)return;
    scheduled=true;
    setTimeout(function(){scheduled=false;enhance();},0);
  }

  function getDB(){return window.LJ&&LJ.getDB?LJ.getDB():null;}
  function sessionUser(db){
    try{
      var raw=sessionStorage.getItem('LJ_BO_SESSION');
      var s=raw?JSON.parse(raw):null;
      if(!s||!db)return null;
      return (db.users||[]).find(function(u){return u.id===s.userId;})||null;
    }catch(e){return null;}
  }
  function accessibleSubs(db,user){
    if(!db||!user)return [];
    var outletIds=user.role==='Administrator'?(db.outlets||[]).map(function(o){return o.id;}):(user.outlets||[]);
    return (db.submissions||[]).filter(function(s){return outletIds.indexOf(s.outletId)!==-1;});
  }
  function val(id){var el=document.getElementById(id);return el?el.value||'':'';}
  function currentFilters(){
    return {search:val('fSearch').trim().toLowerCase(),date:val('fDate'),outlet:val('fOutlet'),dept:val('fDept'),employee:val('fEmployee'),form:val('fForm')};
  }
  function filterCandidates(subs,db,target){
    var f=currentFilters();
    return subs.filter(function(s){
      var form=LJ.formById(db,s.formId);
      if(target!=='search'&&f.search){
        var hay=((s.employeeName||'')+' '+(s.employeeId||'')+' '+(form?form.name:'')+' '+(s.outletName||'')).toLowerCase();
        if(hay.indexOf(f.search)===-1)return false;
      }
      if(target!=='date'&&f.date&&s.submissionDate!==f.date)return false;
      if(target!=='outlet'&&f.outlet&&s.outletId!==f.outlet)return false;
      if(target!=='dept'&&f.dept&&s.department!==f.dept)return false;
      if(target!=='employee'&&f.employee&&s.userId!==f.employee)return false;
      if(target!=='form'&&f.form&&s.formId!==f.form)return false;
      return true;
    });
  }
  function setOptions(select,firstLabel,options){
    if(!select)return false;
    var current=select.value||'',seen={},clean=[];
    options.forEach(function(o){if(o&&o.value&&!seen[o.value]){seen[o.value]=true;clean.push(o);}});
    var key=JSON.stringify(clean.map(function(o){return [o.value,o.label];}));
    if(select.getAttribute('data-v3-options')===key)return false;
    select.setAttribute('data-v3-options',key);
    select.innerHTML='<option value="">'+LJ.esc(firstLabel)+'</option>'+clean.map(function(o){return '<option value="'+LJ.esc(o.value)+'">'+LJ.esc(o.label)+'</option>';}).join('');
    if(current&&seen[current])select.value=current;else select.value='';
    return !!current&&!seen[current];
  }
  function refreshCascadingFilters(){
    if(!document.getElementById('fDept'))return;
    var db=getDB(),user=sessionUser(db),base=accessibleSubs(db,user),invalid=false;
    if(!db||!user)return;

    var outletSubs=filterCandidates(base,db,'outlet'),outletMap={};
    outletSubs.forEach(function(s){if(!outletMap[s.outletId])outletMap[s.outletId]=s.outletName||s.outletId;});
    invalid=setOptions(document.getElementById('fOutlet'),'All outlets',Object.keys(outletMap).map(function(id){return {value:id,label:outletMap[id]};}).sort(function(a,b){return a.label.localeCompare(b.label);}))||invalid;

    var deptSubs=filterCandidates(base,db,'dept');
    invalid=setOptions(document.getElementById('fDept'),'FOH + BOH',['FOH','BOH'].filter(function(d){return deptSubs.some(function(s){return s.department===d;});}).map(function(d){return {value:d,label:d};}))||invalid;

    var employeeSubs=filterCandidates(base,db,'employee'),employeeMap={};
    employeeSubs.forEach(function(s){if(!employeeMap[s.userId])employeeMap[s.userId]=s.employeeName||s.employeeId||s.userId;});
    invalid=setOptions(document.getElementById('fEmployee'),'All employees',Object.keys(employeeMap).map(function(id){return {value:id,label:employeeMap[id]};}).sort(function(a,b){return a.label.localeCompare(b.label);}))||invalid;

    var formSubs=filterCandidates(base,db,'form'),formMap={};
    formSubs.forEach(function(s){if(!formMap[s.formId]){var form=LJ.formById(db,s.formId);formMap[s.formId]=form?form.name:'Form';}});
    invalid=setOptions(document.getElementById('fForm'),'All form types',Object.keys(formMap).map(function(id){return {value:id,label:formMap[id]};}).sort(function(a,b){return a.label.localeCompare(b.label);}))||invalid;

    if(invalid&&!reapplying){
      reapplying=true;
      setTimeout(function(){var search=document.getElementById('fSearch');if(search)search.dispatchEvent(new Event('input',{bubbles:true}));reapplying=false;},0);
    }
  }

  function addClearFilters(){
    var filters=document.querySelector('.filters');
    if(!filters||document.getElementById('clearAllFilters'))return;
    var cell=document.createElement('div');
    cell.className='filter-clear-cell';
    cell.innerHTML='<button type="button" class="btn btn-soft" id="clearAllFilters">Clear all filters</button>';
    filters.appendChild(cell);
    document.getElementById('clearAllFilters').onclick=function(){
      ['fSearch','fDate','fOutlet','fDept','fEmployee','fForm'].forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});
      ['fOutlet','fDept','fEmployee','fForm'].forEach(function(id){var el=document.getElementById(id);if(el)el.removeAttribute('data-v3-options');});
      refreshCascadingFilters();
      var search=document.getElementById('fSearch');if(search)search.dispatchEvent(new Event('input',{bubbles:true}));
      if(window.LJ&&LJ.toast)LJ.toast('All filters cleared.');
    };
  }

  function addTopLogout(){
    var actions=document.querySelector('.bo-topbar .top-actions');
    if(!actions||document.getElementById('v3TopLogout'))return;
    var btn=document.createElement('button');
    btn.type='button';btn.id='v3TopLogout';btn.className='btn btn-soft v3-top-logout';btn.textContent='Sign Out';btn.setAttribute('aria-label','Sign Out');
    btn.onclick=function(){var existing=document.getElementById('logoutBtn');if(existing){existing.click();return;}sessionStorage.removeItem('LJ_BO_SESSION');location.reload();};
    actions.appendChild(btn);
  }

  function deleteForm(id){
    var db=getDB(),form=db&&LJ.formById(db,id);if(!db||!form)return;
    var count=(db.submissions||[]).filter(function(s){return s.formId===id;}).length;
    var msg='Delete “'+form.name+'”?'+(count?'\n\nThis will also delete '+count+' related submission'+(count===1?'':'s')+' and saved drafts for this form.':'\n\nAny saved drafts for this form will also be removed.')+'\n\nThis action cannot be undone.';
    if(!confirm(msg))return;
    db.forms=(db.forms||[]).filter(function(f){return f.id!==id;});
    db.submissions=(db.submissions||[]).filter(function(s){return s.formId!==id;});
    Object.keys(db.drafts||{}).forEach(function(k){if(db.drafts[k]&&db.drafts[k].formId===id)delete db.drafts[k];});
    LJ.saveDB(db);LJ.toast('Form deleted.');
    setTimeout(function(){var nav=document.querySelector('[data-page="forms"]');if(nav)nav.click();},0);
  }
  function addFormDeleteButtons(){
    document.querySelectorAll('[data-edit-form]').forEach(function(edit){
      var id=edit.getAttribute('data-edit-form'),actions=edit.closest('.builder-actions');
      if(!actions||actions.querySelector('[data-v3-delete-form]'))return;
      var btn=document.createElement('button');btn.type='button';btn.className='btn btn-danger small';btn.setAttribute('data-v3-delete-form',id);btn.textContent='Delete';btn.onclick=function(){deleteForm(id);};actions.appendChild(btn);
    });
  }

  function deleteUser(id){
    var db=getDB(),current=sessionUser(db);if(!db)return;
    var target=(db.users||[]).find(function(u){return u.id===id;});if(!target)return;
    if(current&&current.id===id){LJ.toast('You cannot delete the account you are currently using.');return;}
    if(target.role==='Administrator'){
      var others=(db.users||[]).filter(function(u){return u.role==='Administrator'&&u.id!==id;});
      if(!others.length){LJ.toast('Keep at least one Administrator account.');return;}
    }
    var count=(db.submissions||[]).filter(function(s){return s.userId===id;}).length;
    var msg='Delete user “'+target.name+'” ('+target.employeeId+')?'+(count?'\n\nThis will also delete '+count+' related submission'+(count===1?'':'s')+' and saved drafts for this user.':'\n\nAny saved drafts for this user will also be removed.')+'\n\nThis action cannot be undone.';
    if(!confirm(msg))return;
    db.users=(db.users||[]).filter(function(u){return u.id!==id;});
    db.submissions=(db.submissions||[]).filter(function(s){return s.userId!==id;});
    Object.keys(db.drafts||{}).forEach(function(k){if(db.drafts[k]&&db.drafts[k].userId===id)delete db.drafts[k];});
    LJ.saveDB(db);LJ.toast('User deleted.');
    setTimeout(function(){var nav=document.querySelector('[data-page="users"]');if(nav)nav.click();},0);
  }
  function addUserDeleteButtons(){
    document.querySelectorAll('[data-edit-user]').forEach(function(edit){
      var id=edit.getAttribute('data-edit-user'),cell=edit.closest('td');
      if(!cell||cell.querySelector('[data-v3-delete-user]'))return;
      var btn=document.createElement('button');btn.type='button';btn.className='btn btn-danger small v3-delete-user';btn.setAttribute('data-v3-delete-user',id);btn.textContent='Delete';btn.onclick=function(){deleteUser(id);};cell.appendChild(btn);
    });
  }

  function enhance(){
    if(!window.LJ)return;
    addTopLogout();
    if(document.getElementById('fDept')){addClearFilters();refreshCascadingFilters();}
    addFormDeleteButtons();addUserDeleteButtons();
  }

  document.addEventListener('change',function(e){var id=e.target&&e.target.id;if(id==='fDate'||id==='fOutlet'||id==='fDept'||id==='fEmployee'||id==='fForm')scheduleEnhance();},true);
  document.addEventListener('input',function(e){if(e.target&&e.target.id==='fSearch')scheduleEnhance();},true);
  document.addEventListener('click',function(){scheduleEnhance();},true);
  setInterval(enhance,250);
  scheduleEnhance();
})();
