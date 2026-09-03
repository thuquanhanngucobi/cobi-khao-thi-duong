(function(){
  window.CoBiBootVersion='2026-09-03-v7';
  const registry={exams:{}};
  window.CoBiData={
    exams:registry.exams,
    registerExam(data){
      if(!data||!data.meta){console.error('[CoBi] Đề không có meta:',data);return;}
      const id=String(data.meta.id||`exam_${Object.keys(registry.exams).length+1}`);
      data.meta.id=id;
      registry.exams[id]=data;
      console.info('[CoBi] Đã đăng ký đề:',id,data.meta.title||'');
    }
  };
  window.CoBiBoot={files:[],loaded:[],failed:[],errors:[],startedAt:new Date().toISOString()};
  const app=document.getElementById('app');
  function showLoading(){
    if(app) app.innerHTML='<section class="page"><div class="section-title"><span class="cn">考场正在开门</span><span class="vi">Đang tải dữ liệu Khảo Thí Đường…</span></div><div class="card"><div class="notice">Hệ thống đang nạp dữ liệu đề thi…</div></div></section>';
  }
  function loadScript(url,path){
    return new Promise((resolve,reject)=>{
      let settled=false;
      const s=document.createElement('script');
      const fail=(message)=>{if(settled)return;settled=true;window.CoBiBoot.failed.push(path);window.CoBiBoot.errors.push(message);reject(new Error(message));};
      s.src=url;
      s.onload=()=>{
        if(settled)return;
        settled=true;
        window.CoBiBoot.loaded.push(path);
        resolve();
      };
      s.onerror=()=>fail('Không tải được: '+url);
      document.head.appendChild(s);
    });
  }
  function bootError(err){
    console.error('[CoBi Boot]',err);
    if(app) app.innerHTML='<section class="page"><div class="section-title"><span class="cn">载入失败</span><span class="vi">Không tải được dữ liệu đề thi</span></div><div class="card"><div class="notice">Hệ thống không tải được dữ liệu đề thi.</div><pre style="white-space:pre-wrap">'+String(err.message||err)+'</pre><p style="margin-top:12px">Đã tải: '+window.CoBiBoot.loaded.length+' · Lỗi: '+window.CoBiBoot.failed.length+'</p></div></section>';
  }
  async function boot(){
    showLoading();
    try{
      const manifestUrl='data/manifest.json?v=20260903-v7';
      const response=await fetch(manifestUrl,{cache:'no-store'});
      if(!response.ok) throw new Error('Không tải được data/manifest.json · HTTP '+response.status);
      const manifest=await response.json();
      const files=(Array.isArray(manifest.files)?manifest.files:[])
        .filter(path=>/^data\/exams\/.+\.js$/i.test(path))
        .sort((a,b)=>a.localeCompare(b));
      window.CoBiBoot.files=files.slice();
      if(!files.length) throw new Error('data/manifest.json chưa có file đề thi.');

      // Bắt lỗi runtime của từng file đề. Lỗi trong test02 không được phép bị “nuốt” và làm mất đề mà không báo.
      for(const path of files){
        const before=Object.keys(registry.exams).length;
        let runtimeError=null;
        const onError=(event)=>{
          const src=String(event?.filename||'');
          if(src.includes(path.split('/').pop())) runtimeError=event.error||new Error(event.message||('Lỗi trong '+path));
        };
        window.addEventListener('error',onError);
        try{
          await loadScript(path+'?v=20260903-v7',path);
        }finally{
          window.removeEventListener('error',onError);
        }
        if(runtimeError) throw new Error(path+': '+String(runtimeError.message||runtimeError));
        const after=Object.keys(registry.exams).length;
        if(after===before) throw new Error(path+' đã tải nhưng không đăng ký được đề qua window.CoBiData.registerExam().');
      }

      window.CoBiBoot.loadedExamIds=Object.keys(registry.exams);
      window.CoBiBoot.loadedAt=new Date().toISOString();
      console.info('[CoBi] Boot hoàn tất:',window.CoBiBoot.loadedExamIds);

      await loadScript('script.js?v=20260903-v7','script.js');
    }catch(err){bootError(err);}
  }
  boot();
})();
