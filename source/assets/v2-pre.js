(function(){
  if(!window.LJ) return;

  if(typeof LJ.formatTime!=='function'){
    LJ.formatTime=function(iso){
      if(!iso) return '—';
      const d=new Date(iso);
      if(Number.isNaN(d.getTime())) return '—';
      return d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    };
  }

  if(typeof LJ.findQuestion!=='function'){
    LJ.findQuestion=function(form,questionId){
      if(!form) return null;
      for(const section of (form.sections||[])){
        const found=(section.questions||[]).find(q=>q.id===questionId);
        if(found) return found;
      }
      return null;
    };
  }

  const originalGetDB=LJ.getDB.bind(LJ);
  LJ.getDB=function(){
    const db=originalGetDB();
    let changed=false;
    (db.forms||[]).forEach(form=>(form.sections||[]).forEach(section=>(section.questions||[]).forEach(q=>{
      if(q.type==='rating'){
        const scale=Number(q.scale||q.ratingMax)||5;
        if(q.scale!==scale){q.scale=scale;changed=true;}
        if(q.ratingMax!==scale){q.ratingMax=scale;changed=true;}
      }
    })));
    if(changed) LJ.saveDB(db);
    return db;
  };
})();
