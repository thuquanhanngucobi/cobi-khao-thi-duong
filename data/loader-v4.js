(function(){
  window.CoBiBootVersion='2026-09-02-v4';
  const registry={exams:{}};
  window.CoBiData={
    exams:registry.exams,
    registerExam(data){
      if(!data||!data.meta)return;
      const id=data.meta.id||`exam_${Object.keys(registry.exams).length+1}`;
      data.meta.id=id;
      registry.exams[id]=data;
    }
  };

  const app=document.getElementById('app');

  function showLoading(){
    if(app) app.innerHTML='<section class="page"><div class="section-title"><span class="cn">考场正在开门</span><span class="vi">Đang tải dữ liệu Khảo Thí Đường…</span></div><div class="card"><div class="notice">Hệ thống đang nạp dữ liệu đề thi…</div></div></section>';
  }

  function loadScript(url){
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src=url;
      s.onload=resolve;
      s.onerror=()=>reject(new Error('Không tải được: '+url));
      document.head.appendChild(s);
    });
  }

  async function boot(){
    showLoading();
    try{
      // Khảo Thí Đường dùng manifest.json làm danh sách dữ liệu.
      // Không dùng GitHub API hay raw.githubusercontent.com.
      const manifest=await fetch('data/manifest.json?v=20260902',{cache:'no-store'})
        .then(r=>{if(!r.ok)throw new Error('Không tải được data/manifest.json');return r.json();});

      const files=(manifest.files||[])
        .filter(path=>/^data\/exams\/.+\.js$/i.test(path))
        .sort((a,b)=>a.localeCompare(b));

      if(!files.length) throw new Error('data/manifest.json chưa có file đề thi.');

      for(const path of files){
        await loadScript(path+'?v=20260902');
      }

      window.CoBiBoot={files,loadedAt:new Date().toISOString()};
      await loadScript('script.js?v=20260902');
    }catch(err){
      console.error(err);
      if(app) app.innerHTML='<section class="page"><div class="section-title"><span class="cn">载入失败</span><span class="vi">Không tải được dữ liệu đề thi</span></div><div class="card"><div class="notice">Hệ thống không tải được dữ liệu đề thi.</div><pre style="white-space:pre-wrap">'+String(err.message||err)+'</pre></div></section>';
    }
  }

  boot();
})();