const app=document.getElementById('app'),toastEl=document.getElementById('toast');
const EXAM={data:null,section:'idle',studentName:'',timer:null,remaining:0,answers:{},submitted:false,audio:null,audioTimer:null,reviewMode:false,reviewDeadline:0};
function goTop(){window.scrollTo({top:0,left:0,behavior:'auto'});document.documentElement.scrollTop=0;document.body.scrollTop=0}
function setPhaseTimer(seconds,onEnd){clearTimers();EXAM.remaining=seconds;paintTimer();const deadline=Date.now()+seconds*1000;EXAM.timer=setInterval(()=>{EXAM.remaining=Math.max(0,Math.ceil((deadline-Date.now())/1000));paintTimer();if(EXAM.remaining<=0){clearInterval(EXAM.timer);EXAM.timer=null;onEnd()}},200);}
const CENTER={address:'K814 H83B/37 Trần Cao Vân, Thanh Khê, Đà Nẵng',contact:'0905655413'};
const centerAddressEl=document.getElementById('center-address'); if(centerAddressEl) centerAddressEl.textContent=CENTER.address; const centerContactEl=document.getElementById('center-contact'); if(centerContactEl) centerContactEl.textContent=CENTER.contact;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const norm=v=>String(v??'').trim().toUpperCase().replace(/\s+/g,'');
function toast(m){toastEl.textContent=m;toastEl.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>toastEl.classList.remove('show'),3000)}
function route(){
  let h=location.hash.slice(1)||'home';
  if(h==='home')renderHome();
  else if(h==='practice')renderPracticeHome();
  else if(/^hsk[1-6]$/i.test(h))renderLevelHome(h.toUpperCase());
  else if(h.startsWith('practice-'))renderExamHome(decodeURIComponent(h.slice('practice-'.length)));
  else if(h.startsWith('exam-'))renderExamHome(decodeURIComponent(h.slice('exam-'.length)));
  else renderHome();
  document.querySelectorAll('.main-nav a').forEach(a=>a.classList.toggle('active',a.dataset.route===h));
}
function getVocabModules(){return Object.values(window.CoBiData?.vocab||{}).sort((a,b)=>String(a.level).localeCompare(String(b.level),undefined,{numeric:true}));}
function getExamModules(){return Object.values(window.CoBiData?.exams||{}).sort((a,b)=>String(a.meta?.level||'').localeCompare(String(b.meta?.level||''),undefined,{numeric:true}) || String(a.meta?.title||'').localeCompare(String(b.meta?.title||'')));}
function findVocab(id){return window.CoBiData?.vocab?.[id]||null}
function findExam(id){return window.CoBiData?.exams?.[id]||null}

function renderReviewHome(){app.innerHTML=`<section class="page review-home"><div class="section-title"><span class="cn">温故知新</span><span class="vi">Ôn tập</span></div><p class="review-intro">Ôn lại từ vựng, luyện dịch, luyện đọc và bài tập Hán Ngữ theo trình độ.</p><div class="review-category-grid"><a class="card review-category" href="#review-hsk"><div class="review-symbol">词</div><h3>Từ vựng</h3><p>HSK1–HSK6 và từ vựng chuyên ngành.</p><span class="review-arrow">进入 →</span></a><div class="card review-category disabled-card"><div class="review-symbol">译</div><h3>Luyện dịch</h3><p>Dịch mẫu câu và bài tập giáo viên giao.</p><span class="coming">Sắp mở</span></div><div class="card review-category disabled-card"><div class="review-symbol">读</div><h3>Luyện đọc</h3><p>Đọc đoạn văn không pinyin theo trình độ.</p><span class="coming">Sắp mở</span></div><a class="card review-category" href="#practice"><div class="review-symbol">练</div><h3>Bài tập & luyện đề</h3><p>Ngữ pháp, bài tập và luyện đề theo cấp độ.</p><span class="review-arrow">进入 →</span></a></div></section>`}

function renderReviewHsk(){
  const modules=getVocabModules(), byLevel={}; modules.forEach(m=>byLevel[m.level]=m);
  const cards=[1,2,3,4,5,6].map(n=>{const m=byLevel[`HSK${n}`];return m?`<a class="level-card selected" href="#vocab-${encodeURIComponent(m.id)}"><span>HSK ${n}</span><small>${m.items.length} mục · Đang mở</small></a>`:`<div class="level-card muted-level"><span>HSK ${n}</span><small>Chưa có dữ liệu</small></div>`}).join('');
  const custom=modules.filter(m=>!/^HSK[1-6]$/i.test(m.level||''));
  app.innerHTML=`<section class="page"><div class="section-title"><span class="cn">词汇复习</span><span class="vi">Từ vựng</span></div><p class="review-intro">Chọn trình độ để mở danh sách từ, học bằng thẻ lật và làm bài kiểm tra.</p><div class="level-grid">${cards}</div>${custom.length?`<div class="section-title" style="margin-top:44px"><span class="cn">专业词汇</span><span class="vi">Từ vựng chuyên ngành</span></div><div class="level-grid">${custom.map(m=>`<a class="level-card selected" href="#vocab-${encodeURIComponent(m.id)}"><span>${esc(m.level||m.id)}</span><small>${m.items.length} mục</small></a>`).join('')}</div>`:''}<div class="back-row"><a class="btn secondary" href="#review">← Quay lại Ôn tập</a></div></section>`;
}
function renderVocab(id){
  const data=findVocab(id); if(!data){placeholder('Không tìm thấy dữ liệu','File từ vựng chưa được đăng ký hoặc đường dẫn không đúng.');return;}
  const words=(data.items||[]).map((w,i)=>({...w,id:w.id??`${data.id}_${i+1}`})); const total=words.length; const storageKey=data.id==='hsk2'?'cobi_hsk2_vocab':`cobi_vocab_${data.id}`; const saved=JSON.parse(localStorage.getItem(storageKey)||'{}');
  let current=Math.min(Number(sessionStorage.getItem(`${storageKey}_current`)||0),Math.max(0,total-1)),mode='list',quiz=[],quizIndex=0,quizScore=0;
  const speak=text=>{if(!text)return;if(!('speechSynthesis' in window))return toast('Trình duyệt này không hỗ trợ phát âm.');speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='zh-CN';u.rate=.82;speechSynthesis.speak(u)};
  const shuffle=a=>[...a].sort(()=>Math.random()-.5);
  const markLearned=id=>{saved[id]=true;localStorage.setItem(storageKey,JSON.stringify(saved));renderVocabContent()};
  const appView=()=>{const learned=Object.keys(saved).filter(k=>saved[k]).length;app.innerHTML=`<section class="page vocab-page"><div class="section-title"><span class="cn">${esc(data.level||'词汇')}</span><span class="vi">${esc(data.title||'Từ vựng')} · ${total} mục</span></div><div class="vocab-toolbar"><a class="btn secondary" href="#review-hsk">← Từ vựng</a><div class="vocab-progress">Đã đánh dấu học: <b>${learned}/${total}</b></div></div><div class="vocab-tabs"><button class="vocab-tab ${mode==='list'?'active':''}" data-mode="list">Danh sách</button><button class="vocab-tab ${mode==='study'?'active':''}" data-mode="study">Học từ</button><button class="vocab-tab ${mode==='quiz'?'active':''}" data-mode="quiz">Kiểm tra</button></div><div id="vocab-content"></div></section>`;document.querySelectorAll('.vocab-tab').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;if(mode==='quiz')startVocabQuiz();else renderVocabContent()});renderVocabContent()};
  function renderVocabContent(){const box=document.getElementById('vocab-content');if(!box)return;
    if(mode==='list'){box.innerHTML=`<div class="vocab-search-row"><input id="vocab-search" class="vocab-search" placeholder="Tìm chữ Hán, pinyin hoặc nghĩa tiếng Việt..."><span class="vocab-count">${total} từ</span></div><div class="vocab-table-wrap"><table class="vocab-table"><thead><tr><th>#</th><th>汉字</th><th>Pinyin</th><th>Nghĩa</th><th></th></tr></thead><tbody id="vocab-body"></tbody></table></div>`;const fill=()=>{const q=(document.getElementById('vocab-search').value||'').trim().toLowerCase();document.getElementById('vocab-body').innerHTML=words.filter(w=>!q||`${w.hanzi} ${w.pinyin} ${w.meaning}`.toLowerCase().includes(q)).map((w,i)=>`<tr class="${saved[w.id]?'learned':''}"><td>${i+1}</td><td class="hanzi-cell">${esc(w.hanzi)}</td><td>${esc(w.pinyin)}</td><td>${esc(w.meaning)}</td><td><button class="icon-btn" data-speak="${esc(w.hanzi)}" title="Nghe">🔊</button></td></tr>`).join('');document.querySelectorAll('[data-speak]').forEach(b=>b.onclick=()=>speak(b.dataset.speak))};document.getElementById('vocab-search').oninput=fill;fill();return}
    if(mode==='study'){const w=words[current];sessionStorage.setItem(`${storageKey}_current`,current);box.innerHTML=`<div class="study-wrap"><div class="study-index">${current+1} / ${total}</div><div id="study-flip" class="flip-card"><div class="flip-inner"><div class="flip-face flip-front"><div class="front-label">NHÌN CHỮ HÁN</div><div class="study-hanzi">${esc(w.hanzi)}</div><button class="speak-btn" id="speak-word">🔊 Nghe phát âm</button><div class="flip-hint">Nghe xong → chạm vào thẻ để lật</div></div><div class="flip-face flip-back"><div class="front-label">MẶT SAU</div><div class="study-hanzi small">${esc(w.hanzi)}</div><div class="study-pinyin">${esc(w.pinyin)}</div><div class="study-meaning">${esc(w.meaning)}</div><div class="example-box"><div class="example-label">CÂU VÍ DỤ</div><div class="example-cn">${esc(w.example||'Chưa có câu ví dụ.')}</div>${w.examplePinyin?`<div class="example-pinyin">${esc(w.examplePinyin)}</div>`:''}<div class="example-vi">${esc(w.exampleVi||'')}</div>${w.example?`<button class="speak-example" id="speak-example">🔊 Nghe câu ví dụ</button>`:''}</div></div></div></div><button class="flip-button" id="flip-btn">↻ Lật thẻ</button><div class="study-actions"><button class="btn secondary" id="prev-word" ${current===0?'disabled':''}>← Từ trước</button><button class="btn red" id="learn-word">${saved[w.id]?'✓ Đã học':'Đánh dấu đã học'}</button><button class="btn secondary" id="next-word">Từ tiếp →</button></div></div>`;const flip=()=>document.getElementById('study-flip')?.classList.toggle('flipped');document.getElementById('study-flip').onclick=flip;document.getElementById('flip-btn').onclick=flip;document.getElementById('speak-word').onclick=e=>{e.stopPropagation();speak(w.hanzi)};document.getElementById('speak-example')?.addEventListener('click',e=>{e.stopPropagation();speak(w.example)});document.getElementById('prev-word').onclick=()=>{current=Math.max(0,current-1);renderVocabContent()};document.getElementById('next-word').onclick=()=>{current=(current+1)%total;renderVocabContent()};document.getElementById('learn-word').onclick=()=>markLearned(w.id);return}
    if(mode==='quiz')renderQuizContent();
  }
  function startVocabQuiz(){quiz=shuffle(words).slice(0,Math.min(10,total));quizIndex=0;quizScore=0;renderVocabContent()}
  function nextQuiz(){quizIndex++;renderVocabContent()}
  function renderQuizContent(){const box=document.getElementById('vocab-content');if(!quiz.length){startVocabQuiz();return}if(quizIndex>=quiz.length){box.innerHTML=`<div class="quiz-result"><div class="quiz-score">${quizScore}/${quiz.length}</div><h3>Hoàn thành lượt ôn ${esc(data.level||'')}</h3><p>Mỗi lượt gồm ${quiz.length} từ được chọn ngẫu nhiên từ toàn bộ danh sách ${total} từ.</p><button class="btn red" id="quiz-again">Làm lượt mới</button></div>`;document.getElementById('quiz-again').onclick=startVocabQuiz;return}const w=quiz[quizIndex],candidates=shuffle([w,...shuffle(words.filter(x=>x.id!==w.id)).slice(0,3)]),type=total>=4?shuffle(['meaning','pinyin','hanzi','match'])[0]:'meaning';let title='',prompt='',body='';if(type==='meaning'){title='Hán tự → Nghĩa';prompt=`<div class="quiz-prompt">${esc(w.hanzi)} <button class="icon-btn" id="quiz-speak">🔊</button></div><p class="quiz-sub">Chọn nghĩa đúng của từ.</p>`;body=candidates.map((x,i)=>`<button class="quiz-option" data-answer="${esc(x.id)}">${String.fromCharCode(65+i)}. ${esc(x.meaning)}</button>`).join('')}if(type==='pinyin'){title='Hán tự → Pinyin';prompt=`<div class="quiz-prompt">${esc(w.hanzi)} <button class="icon-btn" id="quiz-speak">🔊</button></div><p class="quiz-sub">Chọn pinyin đúng.</p>`;body=candidates.map((x,i)=>`<button class="quiz-option" data-answer="${esc(x.id)}">${String.fromCharCode(65+i)}. ${esc(x.pinyin)}</button>`).join('')}if(type==='hanzi'){title='Nghĩa → Hán tự';prompt=`<div class="quiz-prompt quiz-vietnamese">${esc(w.meaning)}</div><p class="quiz-sub">Chọn Hán tự đúng.</p>`;body=candidates.map((x,i)=>`<button class="quiz-option hanzi-option" data-answer="${esc(x.id)}">${String.fromCharCode(65+i)}. ${esc(x.hanzi)}</button>`).join('')}if(type==='match'){title='Hán tự → Pinyin';prompt=`<div class="quiz-prompt">${esc(w.hanzi)}</div><p class="quiz-sub">Chọn cặp Hán tự – Pinyin đúng.</p>`;body=candidates.map((x,i)=>`<button class="quiz-option" data-answer="${esc(x.id)}">${String.fromCharCode(65+i)}. ${esc(x.hanzi)} — ${esc(x.pinyin)}</button>`).join('')}box.innerHTML=`<div class="quiz-card"><div class="quiz-meta"><span>Câu ${quizIndex+1}/${quiz.length}</span><b>${title}</b></div>${prompt}<div class="quiz-options">${body}</div></div>`;document.getElementById('quiz-speak')?.addEventListener('click',e=>{e.stopPropagation();speak(w.hanzi)});document.querySelectorAll('.quiz-option').forEach(b=>b.onclick=()=>{const ok=String(b.dataset.answer)===String(w.id);if(ok)quizScore++;document.querySelectorAll('.quiz-option').forEach(x=>x.disabled=true);b.classList.add(ok?'correct':'wrong');if(!ok)[...document.querySelectorAll('.quiz-option')].find(x=>String(x.dataset.answer)===String(w.id))?.classList.add('correct');setTimeout(nextQuiz,550)})}
  appView();
}

function placeholder(t,d){app.innerHTML=`<section class="page"><div class="section-title"><span class="cn">${esc(t)}</span><span class="vi">${esc(d)}</span></div><div class="card"><div class="notice">Khu vực này đã được giữ sẵn trong hệ thống Thư Quán.</div></div></section>`}
function renderHome(){app.innerHTML=`<section class="page hero"><div><div class="hero-kicker">漢 · 書 · 語 · 學</div><h1><span class="hero-vn">Thư Quán Hán Ngữ</span> <span class="hero-cobi">CoBi</span></h1><h2>一朝入书馆，一生伴汉语</h2><p>Một ngày nhập Thư Quán, trọn đời hành Hán Ngữ.</p><div class="hero-ornament">— ❖ —</div></div></section><section class="page" style="padding-top:0"><div class="section-title"><span class="cn">入馆三卷</span><span class="vi">Ba không gian học tập của Thư Quán</span></div><div class="card-grid"><a class="card menu-card" href="#knowledge"><div class="symbol">知</div><h3>Kiến Thức</h3><p>Từ vựng, ngữ pháp, cấu trúc câu.</p></a><a class="card menu-card" href="#review"><div class="symbol">习</div><h3>Ôn tập</h3><p>Ôn lại kiến thức theo trình độ.</p></a><a class="card menu-card" href="#practice"><div class="symbol">试</div><h3>Luyện đề</h3><p>Luyện đề HSK1–HSK6.</p></a></div></section>`}
function renderHome(){
  app.innerHTML=`<section class="page hero"><div><div class="hero-kicker">漢 · 考 · 試 · 堂</div><h1><span class="hero-vn">CoBi Khảo Thí Đường</span></h1><h2>一场考试，一次成长</h2><p>Nơi luyện thi HSK theo cấp độ và bộ đề.</p><div class="hero-ornament">— ❖ —</div></div></section><section class="page" style="padding-top:0"><div class="section-title"><span class="cn">六级考场</span><span class="vi">Chọn cấp độ</span></div><p class="review-intro">Chọn HSK1–HSK6. Khi có thêm file đề mới, hệ thống sẽ tự nhận dữ liệu.</p><div class="level-grid">${[1,2,3,4,5,6].map(n=>{const level='HSK'+n;const count=getExamModules().filter(e=>String(e.meta?.level||'').toUpperCase()===level).length;return `<a class="level-card selected" href="#hsk${n}"><span>${level}</span><small>${count?`${count} bộ đề · Đang mở`:'Chưa có dữ liệu'}</small></a>`}).join('')}</div></section>`;
}
function renderPracticeHome(){renderHome()}
function renderLevelHome(level){
  const exams=getExamModules().filter(e=>String(e.meta?.level||'').toUpperCase()===level);
  const n=level.replace('HSK','');
  app.innerHTML=`<section class="page"><div class="section-title"><span class="cn">${esc(level)} 模拟考试</span><span class="vi">Luyện đề ${esc(level)}</span></div><p class="review-intro">Chọn bộ đề để bắt đầu. Các file đề mới trong <code>data/exams/</code> sẽ tự xuất hiện.</p><div class="card-grid">${exams.map((e,i)=>{const id=e.meta?.id||`exam_${i+1}`;e.meta=e.meta||{};e.meta.id=id;return `<a class="card menu-card" href="#exam-${encodeURIComponent(id)}"><div class="symbol">试</div><h3>${esc(e.meta.title||`Đề ${i+1}`)}</h3><p>Nghe · 阅读 · 书写</p><span class="review-arrow">进入 →</span></a>`}).join('')||`<div class="card"><div class="notice">${level} hiện chưa có đề. Khi thêm file dữ liệu vào <code>data/exams/${level.toLowerCase()}/</code>, đề sẽ tự xuất hiện.</div></div>`}</div><div class="back-row"><a class="btn secondary" href="#home">← Về Khảo Thí Đường</a></div></section>`;
}
function renderExamHome(id){
  const data=findExam(id);if(!data){placeholder('Không tìm thấy đề','File đề chưa được đăng ký hoặc đường dẫn không đúng.');return;}EXAM.data=data;
  const meta=data.meta||{}, counts=[['听力',data.listening?.length||0],['阅读',data.reading?.length||0],['书写',(data.writingOrder?.length||0)+(data.writingPicture?.length||0)]];
  app.innerHTML=`<section class="page"><div class="section-title"><span class="cn">${esc(meta.level||'HSK')} 模拟考试</span><span class="vi">${esc(meta.title||'Bộ đề')}</span></div><div class="notice">${counts.map(x=>`<strong>${x[0]}:</strong> ${x[1]}题`).join(' · ')}${meta.reviewMinutes?` · <strong>检查:</strong> ${meta.reviewMinutes} phút`:''}</div><div class="card-grid">${counts.map(x=>`<div class="card"><h3>${x[0]} · ${x[1]}题</h3><p>${x[0]==='听力'?'判断正误 + 选择题.':x[0]==='阅读'?'选词填空 + 排列顺序 + 阅读理解.':'完成句子 + 看图造句.'}</p></div>`).join('')}</div><div class="card start-card"><label><strong>姓名 · Họ tên học viên</strong></label><input id="student-name" placeholder="Nhập họ tên"><button class="btn red" id="start-exam">开始考试 · Bắt đầu</button></div><div class="back-row"><a class="btn secondary" href="#hsk${String(meta.level||'HSK').toLowerCase().replace('hsk','hsk')}">← Quay lại danh sách ${esc(meta.level||'HSK')}</a></div></section>`;
  document.getElementById('start-exam').onclick=()=>startExam(data);
}

function allQuestions(){return [...(EXAM.data.listening||[]),...(EXAM.data.reading||[]),...(EXAM.data.writingOrder||[]),...(EXAM.data.writingPicture||[])]}
function sectionQuestions(section){if(section==='listening')return EXAM.data.listening||[];if(section==='reading')return EXAM.data.reading||[];if(section==='writing')return [...(EXAM.data.writingOrder||[]),...(EXAM.data.writingPicture||[])];return allQuestions()}
function questionSection(id){const s=EXAM.data?.meta?.sections;if(s){for(const [name,range] of Object.entries(s)){if(id>=range[0]&&id<=range[1])return name}}if(id<=45)return'listening';if(id<=85)return'reading';return'writing'}
function isDone(q){return EXAM.answers[q.id]!==undefined&&String(EXAM.answers[q.id]).trim()!==''}
function startExam(data){let n=document.getElementById('student-name').value.trim();if(!n)return toast('Vui lòng nhập họ tên học viên.');EXAM.data=data;EXAM.studentName=n;EXAM.answers={};EXAM.submitted=false;EXAM.section='listening';EXAM.reviewMode=false;renderListening()}
function clearTimers(){clearInterval(EXAM.timer);clearInterval(EXAM.audioTimer);EXAM.timer=null;EXAM.audioTimer=null}
function startClock(seconds,onEnd){setPhaseTimer(seconds,onEnd)}
function startAudioClock(){clearInterval(EXAM.audioTimer);EXAM.audioTimer=setInterval(()=>{if(EXAM.audio&&!EXAM.audio.paused&&isFinite(EXAM.audio.duration)){EXAM.remaining=Math.max(0,Math.ceil(EXAM.audio.duration-EXAM.audio.currentTime));paintTimer()}},250)}
function paintTimer(){let e=document.getElementById('timer');if(!e)return;let s=Math.max(0,EXAM.remaining),m=Math.floor(s/60),r=s%60;e.textContent=`${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`;e.classList.toggle('warning',s<=60)}
function shell(title,sub,qs){app.innerHTML=`<div class="practice-shell"><div class="practice-top"><div class="practice-top-row"><div><div class="exam-title">${esc(EXAM.data.meta.title)}</div><div class="subhead">${esc(title)} · ${esc(sub)}</div></div><div class="timer" id="timer">00:00</div></div><div class="progress-line"><div class="progress-fill" id="progress-fill"></div></div></div><div class="exam-layout"><main class="exam-main" id="exam-main"></main><aside class="reading-nav"><h3>答题卡</h3><div class="legend"><span class="dot green"></span> Đã làm <span class="dot red"></span> Chưa làm</div><div class="palette" id="palette"></div></aside></div></div>`;renderPalette();updateProgress()}
function renderListening(reviewMode=false){
  if(!reviewMode) clearTimers();
  goTop();
  EXAM.section='listening'; EXAM.reviewMode=reviewMode;
  shell(reviewMode?'检查答案 · 听力':'听力','Nghe'+(reviewMode?' · Rà soát':' · Audio'),EXAM.data.listening);
  const main=document.getElementById('exam-main');
  if(!reviewMode){
    const audio=document.createElement('audio'); audio.id='listening-audio'; audio.src=EXAM.data.meta.listeningAudio; audio.preload='metadata'; audio.controls=false; audio.style.display='none';
    audio.addEventListener('loadedmetadata',()=>{if(isFinite(audio.duration)&&audio.duration>0){EXAM.remaining=Math.ceil(audio.duration);paintTimer();startAudioClock()}});
    audio.addEventListener('timeupdate',()=>{if(isFinite(audio.duration)&&audio.duration>0){EXAM.remaining=Math.max(0,Math.ceil(audio.duration-audio.currentTime));paintTimer()}});
    audio.addEventListener('ended',endListening);
    audio.addEventListener('error',()=>toast('Không đọc được audio. Kiểm tra file audio/hsk4/test01.mp3.'));
    main.appendChild(audio); EXAM.audio=audio; audio.play().catch(()=>toast('Nếu trình duyệt chặn tự phát audio, hãy cho phép âm thanh rồi mở lại bài.'));
  }
  EXAM.data.listening.forEach(q=>main.appendChild(questionElement(q)));
  if(reviewMode){
    main.insertAdjacentHTML('beforeend',`<div class="action-row"><span></span><button class="btn secondary" id="back-review">← 回到检查答案 · Quay lại rà soát</button></div>`);
    document.getElementById('back-review').onclick=renderReview;
  }else{
    main.insertAdjacentHTML('beforeend',`<div class="action-row"><span></span><button class="btn red" id="next-section">下一部分 → Sang 阅读</button></div>`);
    document.getElementById('next-section').onclick=endListening;
  }
  renderPalette(); updateProgress();
  if(!reviewMode) setTimeout(()=>{if(EXAM.audio&&isFinite(EXAM.audio.duration)&&EXAM.audio.duration>0)startAudioClock()},500);
}
function endListening(){if(EXAM.section!=='listening')return;clearTimers();if(EXAM.audio){EXAM.audio.pause();EXAM.audio.currentTime=0}EXAM.audio=null;renderReading()}
function renderReading(reviewMode=false){
  if(!reviewMode) clearTimers();
  goTop();
  EXAM.section='reading'; EXAM.reviewMode=reviewMode;
  shell(reviewMode?'检查答案 · 阅读':'阅读','Đọc · '+(reviewMode?'Rà soát':'40 phút'),EXAM.data.reading);
  const main=document.getElementById('exam-main');
  const groups=[['第一部分 · 选词填空',EXAM.data.reading.filter(q=>q.id<=55)],['第二部分 · 排列顺序',EXAM.data.reading.filter(q=>q.id>=56&&q.id<=65)],['第三部分 · 阅读理解',EXAM.data.reading.filter(q=>q.id>=66)]];
  groups.forEach(([title,qs])=>{main.insertAdjacentHTML('beforeend',`<div class="exam-section-heading"><span>${esc(title)}</span></div>`);qs.forEach(q=>main.appendChild(questionElement(q)))});
  if(reviewMode){
    main.insertAdjacentHTML('beforeend',`<div class="action-row"><span></span><button class="btn secondary" id="back-review">← 回到检查答案 · Quay lại rà soát</button></div>`);
    document.getElementById('back-review').onclick=renderReview;
  }else{
    main.insertAdjacentHTML('beforeend',`<div class="action-row"><span></span><button class="btn red" id="next-writing">下一部分 → Sang 书写</button></div>`);
    document.getElementById('next-writing').onclick=()=>renderWriting(false);
    setPhaseTimer(40*60,()=>renderWriting(false));
  }
  renderPalette(); updateProgress();
}
function renderWriting(reviewMode=false){
  if(!reviewMode) clearTimers();
  goTop();
  EXAM.section='writing'; EXAM.reviewMode=reviewMode;
  shell(reviewMode?'检查答案 · 书写':'书写','Viết · '+(reviewMode?'Rà soát':'25 phút'),sectionQuestions('writing'));
  const main=document.getElementById('exam-main');
  main.insertAdjacentHTML('beforeend',`<div class="exam-section-heading"><span>第一部分 · 完成句子</span></div>`);
  EXAM.data.writingOrder.forEach(q=>main.appendChild(questionElement(q)));
  main.insertAdjacentHTML('beforeend',`<div class="exam-section-heading"><span>第二部分 · 看图，用词造句</span></div><div class="shared-writing-image"><img src="${esc(EXAM.data.meta.writingPicture)}" alt="HSK4 96–100"><p>第96–100题共用此图</p></div>`);
  EXAM.data.writingPicture.forEach(q=>main.appendChild(questionElement(q)));
  if(reviewMode){
    main.insertAdjacentHTML('beforeend',`<div class="action-row"><span></span><button class="btn secondary" id="back-review">← 回到检查答案 · Quay lại rà soát</button></div>`);
    document.getElementById('back-review').onclick=renderReview;
  }else{
    main.insertAdjacentHTML('beforeend',`<div class="action-row"><span></span><button class="btn red" id="next-review">检查答案 → 进入 5 分钟 rà soát</button></div>`);
    document.getElementById('next-review').onclick=startReview;
    setPhaseTimer(25*60,startReview);
  }
  renderPalette(); updateProgress();
}
function startReview(){
  if(EXAM.section==='review')return;
  goTop();
  clearTimers();
  if(EXAM.audio)EXAM.audio.pause();
  EXAM.audio=null; EXAM.section='review'; EXAM.reviewMode=false;
  EXAM.reviewDeadline=Date.now()+EXAM.data.meta.reviewMinutes*60*1000;
  renderReview();
}
function questionElement(q){const c=document.createElement('article');c.className='question-card';c.id='q-'+q.id;let body='';if(q.type==='tf'){body=`<div class="statement">★ ${esc(q.statement)}</div>${options(q,q.options)}`}else if(q.type==='mcq'){body=options(q,q.options)}else if(q.type==='cloze'){body=(q.example?`<div class="example"><strong>例如：</strong>${esc(q.example)}</div>`:'')+`<div class="cloze-text">${esc(q.question)}</div>${options(q,q.options)}`}else if(q.type==='order'){const keys=Array.isArray(q.parts)?q.parts.map((_,i)=>String.fromCharCode(65+i)):Object.keys(q.parts);const labels=Array.isArray(q.parts)?q.parts:Object.values(q.parts);const saved=String(EXAM.answers[q.id]||'').split('').filter(Boolean);const ordered=saved.length?saved:keys;body=`<div class="order-parts">${labels.map((v,i)=>`<div class="order-part"><b>${keys[i]}</b><span>${esc(v)}</span></div>`).join('')}</div><p class="drag-hint">拖动下方字母排列顺序 · Có thể kéo thả hoặc bấm để đổi vị trí</p><div class="order-builder" data-order="${q.id}">${ordered.map(k=>`<button type="button" class="order-token" draggable="true" data-token="${k}">${k}</button>`).join('')}</div><input type="hidden" class="answer-input" data-answer="${q.id}" value="${esc(ordered.join(''))}">`}else if(q.type==='reading'){body=`<div class="passage">${esc(q.passage)}</div><div class="question-text">${esc(q.question)}</div>${options(q,q.options)}`}else if(q.type==='picture'){body=`<div class="picture-instruction">看图，用词“<strong>${esc(q.word)}</strong>”造句</div><input class="answer-input picture-answer" data-answer="${q.id}" value="${esc(EXAM.answers[q.id]||'')}" placeholder="请输入句子">`};c.innerHTML=`<div class="q-head"><span class="q-number">第 ${q.id} 题</span><span class="q-type">${typeName(q.type)}</span></div>${body}`;c.querySelectorAll('input[type=radio]').forEach(r=>r.onchange=()=>setAnswer(q.id,r.value));c.querySelectorAll('.answer-input:not([type=hidden])').forEach(i=>i.oninput=()=>setAnswer(q.id,i.value));const builder=c.querySelector('.order-builder');if(builder){let dragged=null;const sync=()=>{const order=[...builder.querySelectorAll('.order-token')].map(b=>b.dataset.token).join('');const input=c.querySelector('.answer-input');input.value=order;setAnswer(q.id,order)};builder.querySelectorAll('.order-token').forEach(btn=>{btn.addEventListener('dragstart',e=>{dragged=btn;btn.classList.add('dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',btn.dataset.token)});btn.addEventListener('dragend',()=>{dragged=null;btn.classList.remove('dragging');builder.querySelectorAll('.drag-over').forEach(x=>x.classList.remove('drag-over'))});btn.addEventListener('dragover',e=>{e.preventDefault();btn.classList.add('drag-over');e.dataTransfer.dropEffect='move'});btn.addEventListener('dragleave',()=>btn.classList.remove('drag-over'));btn.addEventListener('drop',e=>{e.preventDefault();btn.classList.remove('drag-over');if(!dragged||dragged===btn)return;const rect=btn.getBoundingClientRect();builder.insertBefore(dragged,e.clientX>rect.left+rect.width/2?btn.nextSibling:btn);sync()});btn.addEventListener('click',()=>{const arr=[...builder.querySelectorAll('.order-token')];const idx=arr.indexOf(btn);if(idx>0){builder.insertBefore(btn,arr[idx-1]);sync()}else if(arr.length>1){builder.appendChild(btn);sync()}})})}return c}
function typeName(t){return({tf:'判断正误',mcq:'选择题',cloze:'选词填空',reading:'阅读理解',order:'排列顺序',picture:'看图写句'})[t]||''}
function options(q,o){return `<div class="options">${Object.entries(o).map(([k,v])=>`<label class="option"><input type="radio" name="q-${q.id}" value="${k}" ${EXAM.answers[q.id]===k?'checked':''}><span><b>${k}.</b> ${esc(v)}</span></label>`).join('')}</div>`}
function setAnswer(id,v){EXAM.answers[id]=v;renderPalette();updateProgress()}
function renderPalette(){let e=document.getElementById('palette');if(!e)return;let qs=sectionQuestions(EXAM.section);e.innerHTML=qs.map(q=>`<button class="${isDone(q)?'done':''}" data-jump="${q.id}">${q.id}</button>`).join('');e.querySelectorAll('button').forEach(b=>b.onclick=()=>jumpToQuestion(Number(b.dataset.jump)))}
function jumpToQuestion(id){
  const sec=questionSection(id);
  if(EXAM.section===sec && !EXAM.reviewMode){document.getElementById('q-'+id)?.scrollIntoView({behavior:'smooth',block:'start'});return;}
  if(EXAM.section!=='review'){toast('Câu này thuộc phần khác.');return;}
  if(Date.now()>=EXAM.reviewDeadline){submitExam();return;}
  if(sec==='listening')renderListening(true);else if(sec==='reading')renderReading(true);else renderWriting(true);
  setTimeout(()=>document.getElementById('q-'+id)?.scrollIntoView({behavior:'auto',block:'start'}),80);
}
function updateProgress(){let e=document.getElementById('progress-fill');if(!e)return;let qs=sectionQuestions(EXAM.section);e.style.width=qs.length?`${qs.filter(isDone).length/qs.length*100}%`:'0%'}
function renderReview(){
  clearTimers();
  goTop();
  EXAM.section='review'; EXAM.reviewMode=false;
  let qs=allQuestions(),un=qs.filter(q=>!isDone(q));
  app.innerHTML=`<section class="page"><div class="review-top"><div class="section-title"><span class="cn">检查答案</span><span class="vi">Rà soát · còn ${un.length} câu chưa làm</span></div><div class="review-timer" id="review-timer">05:00</div></div><div class="card"><p><b class="green-text">Xanh</b> = đã làm · <b class="red-text">Đỏ</b> = chưa làm. Bấm số câu để xem và sửa đáp án.</p><div class="palette review-palette">${qs.map(q=>`<button class="${isDone(q)?'done':''}" data-jump="${q.id}">${q.id}</button>`).join('')}</div></div><div class="card"><button class="btn red" id="submit-now">提交答案 · Nộp bài ngay</button></div></section>`;
  document.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>jumpToQuestion(Number(b.dataset.jump)));
  document.getElementById('submit-now').onclick=submitExam;
  EXAM.remaining=Math.max(0,Math.ceil((EXAM.reviewDeadline-Date.now())/1000));
  paintReviewTimer();
  EXAM.timer=setInterval(()=>{EXAM.remaining=Math.max(0,Math.ceil((EXAM.reviewDeadline-Date.now())/1000));paintReviewTimer();if(EXAM.remaining<=0){clearTimers();submitExam()}},200);
}
function paintReviewTimer(){const el=document.getElementById('review-timer');if(el){el.textContent=formatTime(EXAM.remaining);el.classList.toggle('warning',EXAM.remaining<=60)}}
function formatTime(s){s=Math.max(0,Math.ceil(s));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`}
function submitExam(){if(EXAM.submitted)return;EXAM.submitted=true;clearTimers();if(EXAM.audio)EXAM.audio.pause();let r=calculateResult();saveResultLocally(r);renderResult(r);sendResultToGoogleSheets(r)}
function calculateResult(){let l=EXAM.data.listening,r=EXAM.data.reading,w=EXAM.data.writingOrder,p=EXAM.data.writingPicture;let lc=l.filter(q=>norm(EXAM.answers[q.id])===norm(q.answer)).length,rc=r.filter(q=>norm(EXAM.answers[q.id])===norm(q.answer)).length,wc=w.filter(q=>norm(EXAM.answers[q.id])===norm(q.answer)).length;const m=EXAM.data.meta||{},lp=Number(m.listeningPoint??2.22),rp=Number(m.readingPoint??2.5),wp=Number(m.writingOrderPoint??6);let wrong=[...l,...r,...w].filter(q=>q.answer&&norm(EXAM.answers[q.id])!==norm(q.answer)).map(q=>({id:q.id,student:EXAM.answers[q.id]||'',correct:q.answer}));return{examId:EXAM.data.meta.title,level:EXAM.data.meta.level,studentName:EXAM.studentName,submittedAt:new Date().toISOString(),listeningCorrect:lc,listeningTotal:l.length,readingCorrect:rc,readingTotal:r.length,writingOrderCorrect:wc,writingOrderTotal:w.length,pictureAnswered:p.filter(isDone).length,pictureTotal:p.length,autoScore:+(lc*lp+rc*rp+wc*wp).toFixed(2),wrong,answers:{...EXAM.answers}}}
function renderResult(r){app.innerHTML=`<section class="page"><div class="result-box"><div class="section-title"><span class="cn">考试结果</span><span class="vi">Kết quả luyện đề</span></div><div class="score-big">${r.autoScore}</div><p class="result-note">Học viên: <b>${esc(r.studentName)}</b><br>Điểm tự động, chưa gồm điểm 96–100 do giáo viên chấm.</p><table class="score-table"><tr><th>Phần</th><th>Đúng</th><th>Điểm</th></tr><tr><td>Nghe</td><td>${r.listeningCorrect}/${r.listeningTotal}</td><td>${(r.listeningCorrect*Number(EXAM.data.meta?.listeningPoint??2.22)).toFixed(2)}</td></tr><tr><td>Đọc</td><td>${r.readingCorrect}/${r.readingTotal}</td><td>${(r.readingCorrect*Number(EXAM.data.meta?.readingPoint??2.5)).toFixed(2)}</td></tr><tr><td>Viết 86–95</td><td>${r.writingOrderCorrect}/${r.writingOrderTotal}</td><td>${(r.writingOrderCorrect*Number(EXAM.data.meta?.writingOrderPoint??6)).toFixed(2)}</td></tr><tr><td>Viết 96–100</td><td>${r.pictureAnswered}/${r.pictureTotal}</td><td>GV chấm</td></tr></table><h3>Câu sai / chưa làm</h3><div class="wrong-list">${r.wrong.length?r.wrong.map(w=>`<div class="wrong-item"><b>Câu ${w.id}</b> · Bạn: <code>${esc(w.student||'Chưa làm')}</code> · Đáp án: <code>${esc(w.correct)}</code></div>`).join(''):'Không có câu sai ở phần tự chấm.'}</div><div class="notice">${GOOGLE_SHEETS_WEB_APP_URL?'Kết quả đã được gửi lên Google Sheets.':''}</div><a class="btn secondary" href="#exam-${encodeURIComponent(EXAM.data.meta.id)}">Làm lại</a></div></section>`}
const GOOGLE_SHEETS_WEB_APP_URL=''; // Dán Web App URL của Google Apps Script vào đây sau khi triển khai
function saveResultLocally(r){try{const key='cobi_hsk_results';const old=JSON.parse(localStorage.getItem(key)||'[]');old.push(r);localStorage.setItem(key,JSON.stringify(old));}catch(e){console.warn('Không lưu được localStorage',e)}}
function sendResultToGoogleSheets(r){if(!GOOGLE_SHEETS_WEB_APP_URL)return;const payload={...r,answers:JSON.stringify(r.answers),wrong:JSON.stringify(r.wrong)};fetch(GOOGLE_SHEETS_WEB_APP_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)}).then(()=>toast('Đã gửi kết quả lên Google Sheets.')).catch(()=>toast('Không gửi được Google Sheets; kết quả vẫn được lưu trên máy.'))}
window.addEventListener('hashchange',route);route();
