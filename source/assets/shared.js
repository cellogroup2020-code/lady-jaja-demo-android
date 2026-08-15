(function(){
  const KEY='LJ_DEMO_DB_V1';
  const VERSION=5;
  const clone=o=>JSON.parse(JSON.stringify(o));
  const pad=n=>String(n).padStart(2,'0');
  const dateKey=(d=new Date())=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const isoAt=(daysAgo,hour,min)=>{const d=new Date();d.setDate(d.getDate()-daysAgo);d.setHours(hour,min,0,0);return d.toISOString()};
  const uid=prefix=>prefix+'_'+Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-5);
  const placeholder=(label, tone='#E74605')=>{
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450"><rect width="100%" height="100%" rx="28" fill="#FBF0E3"/><rect x="18" y="18" width="564" height="414" rx="22" fill="${tone}" opacity=".10" stroke="${tone}" stroke-width="3"/><circle cx="300" cy="180" r="64" fill="${tone}" opacity=".18"/><path d="M236 290l70-72 46 44 33-34 66 62H236z" fill="${tone}" opacity=".35"/><text x="300" y="365" text-anchor="middle" font-family="Arial" font-size="24" font-weight="700" fill="#111">${label}</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  };

  const q=(id,label,type='yesno',required=true,extra={})=>({id,label,type,required,...extra});
  const s=(id,title,questions)=>({id,title,questions});

  function baseForms(){
    return [
      {
        id:'foh-opening',name:'FOH Opening Checklist',department:'FOH',category:'Opening Checklist',published:true,outlets:['branch01','branch02'],
        sections:[
          s('entrance','Entrance & Guest Area',[
            q('fo1','Entrance and guest-facing area are visually clean and ready for opening.','yesno',true,{requireCommentOnNo:true}),
            q('fo2','Brand signage and visible presentation areas are clean and presentable.','yesno',true,{requireCommentOnNo:true}),
            q('fo3','Capture the opening condition of the entrance / guest area.','photo',true,{maxPhotos:3}),
            q('fo4','Guest seating and tables are clean and arranged.','yesno',true,{requireCommentOnNo:true}),
            q('fo5','Floors are visually clean, dry, and ready for guests.','yesno',true,{requireCommentOnNo:true})
          ]),
          s('counter','Counter & Service Readiness',[
            q('fo6','Counter area is clean, organized, and ready for service.','yesno',true,{requireCommentOnNo:true}),
            q('fo7','Menu display / ordering information appears ready and clear.','yesnona',true),
            q('fo8','POS / payment equipment appears ready for use.','yesnona',true,{requireCommentOnNo:true}),
            q('fo9','Required guest-service items (trays, napkins, packaging) are available.','yesno',true,{requireCommentOnNo:true}),
            q('fo10','FOH team grooming and uniform presentation are ready for service.','yesno',true,{requireCommentOnNo:true}),
            q('fo11','Guest-facing areas are free from visible maintenance concerns.','yesno',true,{requireCommentOnNo:true}),
            q('fo12','Overall FOH opening readiness.','rating',true,{scale:5}),
            q('fo13','Opening remarks / anything management should know.','longtext',false)
          ])
        ]
      },
      {
        id:'foh-closing',name:'FOH Closing Checklist',department:'FOH',category:'Closing Checklist',published:true,outlets:['branch01','branch02'],
        sections:[
          s('guest-close','Guest Area Closing',[
            q('fc1','Guest area is cleared, clean, and left in an orderly condition.','yesno',true,{requireCommentOnNo:true}),
            q('fc2','Tables and chairs are clean and arranged.','yesno',true,{requireCommentOnNo:true}),
            q('fc3','Floors are visually clean and dry.','yesno',true,{requireCommentOnNo:true}),
            q('fc4','Guest-facing bins / waste points are cleared as required.','yesno',true,{requireCommentOnNo:true}),
            q('fc5','Lost-property check has been completed.','yesno',true,{requireCommentOnNo:true}),
            q('fc6','Capture the closing condition of the guest area.','photo',true,{maxPhotos:3})
          ]),
          s('counter-close','Counter & Handover',[
            q('fc7','Counter is clean, organized, and left ready for the next opening.','yesno',true,{requireCommentOnNo:true}),
            q('fc8','Guest-service items are organized and stored appropriately.','yesno',true,{requireCommentOnNo:true}),
            q('fc9','Visible menu / brand presentation areas are left clean and presentable.','yesno',true,{requireCommentOnNo:true}),
            q('fc10','Guest-facing equipment is left in the agreed closing condition.','yesnona',true,{requireCommentOnNo:true}),
            q('fc11','Any outstanding FOH issue has been noted in the shift report / handover.','yesnona',true,{requireCommentOnNo:true}),
            q('fc12','Overall FOH closing condition.','rating',true,{scale:5}),
            q('fc13','Closing remarks / handover notes.','longtext',false)
          ])
        ]
      },
      {
        id:'foh-daily',name:'FOH End of Shift Daily Report',department:'FOH',category:'Daily Report',published:true,outlets:['branch01','branch02'],
        sections:[
          s('shift-overview','Shift Overview',[
            q('fd1','Overall shift level.','multiple',true,{options:['Quiet','Normal','Busy','Very Busy']}),
            q('fd2','Overall guest-service performance.','rating',true,{scale:5}),
            q('fd3','Were any customer complaints received?','multiple',true,{options:['No','Yes']}),
            q('fd4','Customer complaint / guest feedback details (if any).','longtext',false),
            q('fd5','Were there any staffing or attendance challenges affecting the shift?','multiple',true,{options:['No','Yes']}),
            q('fd6','Were there any guest-facing maintenance concerns?','multiple',true,{options:['No','Yes']}),
            q('fd7','Were there any delivery / dispatch service concerns reported to FOH?','multiple',true,{options:['No','Yes']}),
            q('fd8','Was any menu item unavailable to guests during the shift?','multiple',true,{options:['No','Yes']})
          ]),
          s('management','Management Notes',[
            q('fd9','Key issue or observation from the shift.','longtext',false),
            q('fd10','Action taken during the shift (if applicable).','longtext',false),
            q('fd11','Positive guest feedback / team highlight.','longtext',false),
            q('fd12','Handover note for the next shift / management.','longtext',false),
            q('fd13','Optional photo evidence.','photo',false,{maxPhotos:3})
          ])
        ]
      },
      {
        id:'boh-opening',name:'BOH Opening Checklist',department:'BOH',category:'Opening Checklist',published:true,outlets:['branch01','branch02'],
        sections:[
          s('kitchen-ready','Kitchen Readiness',[
            q('bo1','Kitchen work areas are visually clean, organized, and ready for opening.','yesno',true,{requireCommentOnNo:true}),
            q('bo2','Required workstations are set up and ready for service.','yesno',true,{requireCommentOnNo:true}),
            q('bo3','Required products and ingredients are available for planned service.','yesno',true,{requireCommentOnNo:true}),
            q('bo4','Fresh local chicken stock is available and visually checked for service readiness.','yesno',true,{requireCommentOnNo:true}),
            q('bo5','Storage areas are organized and product identification is clear.','yesno',true,{requireCommentOnNo:true}),
            q('bo6','Capture the opening condition of the kitchen / preparation area.','photo',true,{maxPhotos:3})
          ]),
          s('service-ready','Service & Dispatch Readiness',[
            q('bo7','Kitchen equipment appears operational and ready for planned service.','yesnona',true,{requireCommentOnNo:true}),
            q('bo8','Preparation / assembly areas are ready and organized.','yesno',true,{requireCommentOnNo:true}),
            q('bo9','Packaging and dispatch materials are available.','yesno',true,{requireCommentOnNo:true}),
            q('bo10','Cleaning materials required for the shift are available.','yesno',true,{requireCommentOnNo:true}),
            q('bo11','BOH team grooming and uniform presentation are ready for service.','yesno',true,{requireCommentOnNo:true}),
            q('bo12','Product presentation / quality appears acceptable for opening readiness.','yesno',true,{requireCommentOnNo:true}),
            q('bo13','Overall BOH opening readiness.','rating',true,{scale:5}),
            q('bo14','Opening remarks / issues requiring management awareness.','longtext',false)
          ])
        ]
      },
      {
        id:'boh-closing',name:'BOH Closing Checklist',department:'BOH',category:'Closing Checklist',published:true,outlets:['branch01','branch02'],
        sections:[
          s('kitchen-close','Kitchen Closing',[
            q('bc1','Workstations are cleaned and left in an orderly closing condition.','yesno',true,{requireCommentOnNo:true}),
            q('bc2','Kitchen equipment is left clean and in the agreed closing condition.','yesnona',true,{requireCommentOnNo:true}),
            q('bc3','Remaining products are stored / handled according to approved restaurant procedures.','yesno',true,{requireCommentOnNo:true}),
            q('bc4','Any wastage or quality loss requiring reporting has been noted.','yesnona',true,{requireCommentOnNo:true}),
            q('bc5','Storage areas are organized for the next opening.','yesno',true,{requireCommentOnNo:true}),
            q('bc6','Capture the closing condition of the kitchen / preparation area.','photo',true,{maxPhotos:3})
          ]),
          s('dispatch-close','Dispatch & Handover',[
            q('bc7','Packing / dispatch area is clean and organized.','yesno',true,{requireCommentOnNo:true}),
            q('bc8','Floors and visible BOH cleaning points are left clean.','yesno',true,{requireCommentOnNo:true}),
            q('bc9','Waste points are cleared as required.','yesno',true,{requireCommentOnNo:true}),
            q('bc10','Any equipment or operational issue has been included in the daily report / handover.','yesnona',true,{requireCommentOnNo:true}),
            q('bc11','Any product availability concern for the next shift has been noted.','yesnona',true,{requireCommentOnNo:true}),
            q('bc12','Overall BOH closing condition.','rating',true,{scale:5}),
            q('bc13','Closing remarks / handover notes.','longtext',false)
          ])
        ]
      },
      {
        id:'boh-daily',name:'BOH End of Shift Daily Report',department:'BOH',category:'Daily Report',published:true,outlets:['branch01','branch02'],
        sections:[
          s('boh-shift','Shift Overview',[
            q('bd1','Overall production / kitchen shift level.','multiple',true,{options:['Quiet','Normal','Busy','Very Busy']}),
            q('bd2','Overall BOH operational performance.','rating',true,{scale:5}),
            q('bd3','Was there any product availability issue?','multiple',true,{options:['No','Yes']}),
            q('bd4','Was there any fresh chicken availability concern?','multiple',true,{options:['No','Yes']}),
            q('bd5','Was there any product quality / consistency concern?','multiple',true,{options:['No','Yes']}),
            q('bd6','Was there any equipment issue affecting the shift?','multiple',true,{options:['No','Yes']}),
            q('bd7','Was there any packing / dispatch issue?','multiple',true,{options:['No','Yes']}),
            q('bd8','Was there any wastage / stock concern requiring management awareness?','multiple',true,{options:['No','Yes']})
          ]),
          s('boh-notes','Management Notes',[
            q('bd9','Main operational or quality issue from the shift.','longtext',false),
            q('bd10','Action taken during the shift (if applicable).','longtext',false),
            q('bd11','Product availability / stock note for the next shift.','longtext',false),
            q('bd12','Handover note for management / next shift.','longtext',false),
            q('bd13','Optional photo evidence.','photo',false,{maxPhotos:3})
          ])
        ]
      }
    ];
  }

  function seedDB(){
    const forms=baseForms();
    const outlets=[
      {id:'branch01',name:'Lady Jaja – Branch 01'},
      {id:'branch02',name:'Lady Jaja – Branch 02'}
    ];
    const users=[
      {id:'u_foh',employeeId:'FOH001',pin:'1111',name:'Omar Hassan',role:'FOH In-Charge',department:'FOH',outlets:['branch01','branch02'],active:true},
      {id:'u_boh',employeeId:'BOH001',pin:'2222',name:'Rami Khaled',role:'BOH In-Charge',department:'BOH',outlets:['branch01','branch02'],active:true},
      {id:'u_mgr',employeeId:'MG001',pin:'3333',name:'Sara Ahmed',role:'Manager',department:null,outlets:['branch01','branch02'],active:true},
      {id:'u_admin',employeeId:'AD001',pin:'4444',name:'Demo Administrator',role:'Administrator',department:null,outlets:['branch01','branch02'],active:true}
    ];
    const r=(questionId,value,comment='',photos=[])=>({questionId,value,comment,photos});
    const submissions=[
      {id:'sub1',formId:'foh-opening',userId:'u_foh',employeeId:'FOH001',employeeName:'Omar Hassan',role:'FOH In-Charge',department:'FOH',outletId:'branch01',outletName:'Lady Jaja – Branch 01',startTime:isoAt(0,10,57),submitTime:isoAt(0,11,9),submissionDate:dateKey(),responses:[r('fo1','Yes'),r('fo2','Yes'),r('fo3','Photos','',[placeholder('FOH Opening Evidence')]),r('fo4','Yes'),r('fo5','Yes'),r('fo6','Yes'),r('fo7','Yes'),r('fo8','Yes'),r('fo9','Yes'),r('fo10','Yes'),r('fo11','Yes'),r('fo12',5),r('fo13','Ready for service.')]},
      {id:'sub2',formId:'boh-opening',userId:'u_boh',employeeId:'BOH001',employeeName:'Rami Khaled',role:'BOH In-Charge',department:'BOH',outletId:'branch01',outletName:'Lady Jaja – Branch 01',startTime:isoAt(0,10,50),submitTime:isoAt(0,11,12),submissionDate:dateKey(),responses:[r('bo1','Yes'),r('bo2','Yes'),r('bo3','Yes'),r('bo4','Yes'),r('bo5','Yes'),r('bo6','Photos','',[placeholder('BOH Opening Evidence','#111111')]),r('bo7','Yes'),r('bo8','Yes'),r('bo9','Yes'),r('bo10','Yes'),r('bo11','Yes'),r('bo12','Yes'),r('bo13',5),r('bo14','No opening concerns.')]},
      {id:'sub3',formId:'foh-opening',userId:'u_foh',employeeId:'FOH001',employeeName:'Omar Hassan',role:'FOH In-Charge',department:'FOH',outletId:'branch02',outletName:'Lady Jaja – Branch 02',startTime:isoAt(0,10,58),submitTime:isoAt(0,11,16),submissionDate:dateKey(),responses:[r('fo1','Yes'),r('fo2','Yes'),r('fo3','Photos','',[placeholder('Branch 02 FOH')]),r('fo4','Yes'),r('fo5','Yes'),r('fo6','Yes'),r('fo7','Yes'),r('fo8','N/A'),r('fo9','Yes'),r('fo10','Yes'),r('fo11','No','Small visible issue near counter - shared with manager.'),r('fo12',4),r('fo13','Otherwise ready.')]},
      {id:'sub4',formId:'boh-opening',userId:'u_boh',employeeId:'BOH001',employeeName:'Rami Khaled',role:'BOH In-Charge',department:'BOH',outletId:'branch02',outletName:'Lady Jaja – Branch 02',startTime:isoAt(0,10,51),submitTime:isoAt(0,11,8),submissionDate:dateKey(),responses:[r('bo1','Yes'),r('bo2','Yes'),r('bo3','Yes'),r('bo4','Yes'),r('bo5','Yes'),r('bo6','Photos','',[placeholder('Branch 02 BOH','#111111')]),r('bo7','Yes'),r('bo8','Yes'),r('bo9','Yes'),r('bo10','Yes'),r('bo11','Yes'),r('bo12','Yes'),r('bo13',5),r('bo14','')]},
      {id:'sub5',formId:'foh-daily',userId:'u_foh',employeeId:'FOH001',employeeName:'Omar Hassan',role:'FOH In-Charge',department:'FOH',outletId:'branch01',outletName:'Lady Jaja – Branch 01',startTime:isoAt(0,23,40),submitTime:isoAt(0,23,52),submissionDate:dateKey(),responses:[r('fd1','Busy'),r('fd2',4),r('fd3','Yes'),r('fd4','One guest asked about waiting time; handled during the shift.'),r('fd5','No'),r('fd6','No'),r('fd7','No'),r('fd8','No'),r('fd9','Peak period was smooth overall.'),r('fd10','Guest was updated and supported.'),r('fd11','Positive feedback on team friendliness.'),r('fd12','No pending FOH matter.'),r('fd13','Photos','',[placeholder('Daily FOH Evidence')])]},
      {id:'sub6',formId:'boh-daily',userId:'u_boh',employeeId:'BOH001',employeeName:'Rami Khaled',role:'BOH In-Charge',department:'BOH',outletId:'branch01',outletName:'Lady Jaja – Branch 01',startTime:isoAt(0,23,35),submitTime:isoAt(0,23,50),submissionDate:dateKey(),responses:[r('bd1','Busy'),r('bd2',4),r('bd3','No'),r('bd4','No'),r('bd5','No'),r('bd6','No'),r('bd7','Yes'),r('bd8','No'),r('bd9','Short dispatch delay during peak.'),r('bd10','Team reorganized packing sequence.'),r('bd11','No availability concern.'),r('bd12','Monitor dispatch flow during next peak.'),r('bd13','Photos','',[placeholder('Daily BOH Evidence','#111111')])]},
      {id:'sub7',formId:'foh-closing',userId:'u_foh',employeeId:'FOH001',employeeName:'Omar Hassan',role:'FOH In-Charge',department:'FOH',outletId:'branch01',outletName:'Lady Jaja – Branch 01',startTime:isoAt(1,1,2),submitTime:isoAt(1,1,19),submissionDate:dateKey(new Date(Date.now()-86400000)),responses:[r('fc1','Yes'),r('fc2','Yes'),r('fc3','Yes'),r('fc4','Yes'),r('fc5','Yes'),r('fc6','Photos','',[placeholder('Closing Evidence')]),r('fc7','Yes'),r('fc8','Yes'),r('fc9','Yes'),r('fc10','Yes'),r('fc11','Yes'),r('fc12',5),r('fc13','Closed in good condition.')]},
      {id:'sub8',formId:'boh-closing',userId:'u_boh',employeeId:'BOH001',employeeName:'Rami Khaled',role:'BOH In-Charge',department:'BOH',outletId:'branch02',outletName:'Lady Jaja – Branch 02',startTime:isoAt(1,1,0),submitTime:isoAt(1,1,24),submissionDate:dateKey(new Date(Date.now()-86400000)),responses:[r('bc1','Yes'),r('bc2','Yes'),r('bc3','Yes'),r('bc4','N/A'),r('bc5','Yes'),r('bc6','Photos','',[placeholder('BOH Closing','#111111')]),r('bc7','Yes'),r('bc8','Yes'),r('bc9','Yes'),r('bc10','Yes'),r('bc11','Yes'),r('bc12',5),r('bc13','No pending issue.')]}
    ];
    return {version:VERSION,createdAt:new Date().toISOString(),outlets,users,forms,submissions,drafts:{}};
  }

  function getDB(){
    let db;
    try{db=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){db=null}
    if(!db || db.version!==VERSION){db=seedDB();saveDB(db)}
    return db;
  }
  function saveDB(db){localStorage.setItem(KEY,JSON.stringify(db))}
  function resetDB(){const db=seedDB();saveDB(db);return db}
  function formById(db,id){return db.forms.find(f=>f.id===id)}
  function outletById(db,id){return db.outlets.find(o=>o.id===id)}
  function userByEmployeeId(db,id){return db.users.find(u=>u.employeeId.toUpperCase()===String(id).trim().toUpperCase() && u.active)}
  function formatDateTime(iso){if(!iso)return '—';const d=new Date(iso);return d.toLocaleString([], {year:'numeric',month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit'})}
  function formatDate(key){if(!key)return '—';const [y,m,d]=key.split('-').map(Number);return new Date(y,m-1,d).toLocaleDateString([],{year:'numeric',month:'short',day:'2-digit'})}
  function initials(name){return (name||'?').split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase()}
  function toast(msg){const el=document.createElement('div');el.className='toast';el.textContent=msg;document.body.appendChild(el);setTimeout(()=>el.remove(),2600)}
  function esc(v){return String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
  function download(filename,content,type='text/plain'){if(window.AndroidBridge&&AndroidBridge.saveText){AndroidBridge.saveText(filename,String(content),type);return}const blob=new Blob([content],{type});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
  function safeFilename(v){return String(v||'Lady_Jaja').trim().replace(/[^a-zA-Z0-9._-]+/g,'_').replace(/^_+|_+$/g,'')||'Lady_Jaja'}
  function dataUrlExtension(dataUrl){const m=String(dataUrl||'').match(/^data:image\/([^;,]+)/i);const t=(m?.[1]||'jpg').toLowerCase();return t.includes('svg')?'svg':t==='jpeg'?'jpg':t}
  function downloadDataUrl(filename,dataUrl){if(window.AndroidBridge&&AndroidBridge.saveDataUrl){AndroidBridge.saveDataUrl(filename,dataUrl);return}const a=document.createElement('a');a.href=dataUrl;a.download=filename;a.rel='noopener';document.body.appendChild(a);a.click();a.remove()}
  function bindModal(modal,{closeOnBackdrop=true}={}){
    if(!modal)return ()=>{};
    const close=()=>{if(modal.isConnected)modal.remove();document.removeEventListener('keydown',onKey)};
    const onKey=e=>{if(e.key==='Escape'){e.preventDefault();close()}};
    document.addEventListener('keydown',onKey);
    if(closeOnBackdrop)modal.addEventListener('mousedown',e=>{if(e.target===modal)close()});
    modal.querySelectorAll('[data-close]').forEach(x=>x.addEventListener('click',close));
    modal.__close=close;
    return close;
  }
  function showSplash(){const s=document.getElementById('splash');if(!s)return;setTimeout(()=>s.classList.add('hide'),2850);setTimeout(()=>s.remove(),3400)}

  window.LJ={KEY,VERSION,getDB,saveDB,resetDB,uid,dateKey,formById,outletById,userByEmployeeId,formatDateTime,formatDate,initials,toast,esc,download,safeFilename,dataUrlExtension,downloadDataUrl,bindModal,showSplash,clone,placeholder};
})();
