// ==========================================
// TỪ ĐIỂN API - ĐIỀN LINK GOOGLE SHEETS VÀO ĐÂY
// ==========================================
const COBI_APIS = {https://script.google.com/macros/s/AKfycbzwC5JyYCwTxDXIP7l-0vNU2S0S_5ofj1rkbg5ff3jzfwSNH4K5oY9HZcnGJMb0ABcy/exec
  'HSK1': '',
  'HSK2': '', 
  'HSK3': '',
  'HSK4': '', 
  'HSK5': '',
  'HSK6': ''
};

// ==========================================
// HÀM BẢO VỆ (Tránh lỗi cache từ hệ thống cũ)
// ==========================================
function getVocabModules(){return [];}
function getExamModules(){return [];}
function findVocab(id){return null;}
function findExam(id){return null;}

// ==========================================
// KHỞI TẠO ỨNG DỤNG
// ==========================================
const app = document.getElementById('app'), toastEl = document.getElementById('toast');
const EXAM = { data: null, section: 'idle', studentName: '', timer: null, remaining: 0, answers: {}, submitted: false, audio: null, audioTimer: null, reviewMode: false, reviewDeadline: 0 };

function goTop() { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); }
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
const norm = v => String(v ?? '').trim().toUpperCase().replace(/\s+/g, '');
function toast(m) { toastEl.textContent = m; toastEl.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => toastEl.classList.remove('show'), 3000); }
function setPhaseTimer(seconds, onEnd) { clearTimers(); EXAM.remaining = seconds; paintTimer(); const deadline = Date.now() + seconds * 1000; EXAM.timer = setInterval(() => { EXAM.remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000)); paintTimer(); if (EXAM.remaining <= 0) { clearInterval(EXAM.timer); EXAM.timer = null; onEnd(); } }, 200); }
function clearTimers() { clearInterval(EXAM.timer); clearInterval(EXAM.audioTimer); EXAM.timer = null; EXAM.audioTimer = null; }

function route() {
  let h = location.hash.slice(1) || 'home';
  if (h === 'home' || h === 'practice') renderHome();
  else if (/^hsk[1-6]$/i.test(h)) renderLevelHome(h.toUpperCase());
  else if (h.startsWith('exam-')) renderExamHome(decodeURIComponent(h.slice('exam-'.length)));
  else renderHome();
  document.querySelectorAll('.main-nav a').forEach(a => a.classList.toggle('active', a.dataset.route === h));
}

// ==========================================
// GIAO DIỆN TRANG CHỦ & DANH SÁCH
// ==========================================
function renderHome() {
  app.innerHTML = `<section class="page hero"><div><div class="hero-kicker">漢 · 考 · 試 · 堂</div><h1><span class="hero-vn">CoBi Khảo Thí Đường</span></h1><h2>一场考试，一次成长</h2><p>Hệ thống thi thử HSK 3.0 trực tuyến hoàn toàn mới.</p><div class="hero-ornament">— ❖ —</div></div></section><section class="page" style="padding-top:0"><div class="section-title"><span class="cn">选择级别</span><span class="vi">Chọn cấp độ</span></div><div class="level-grid">${[1, 2, 3, 4, 5, 6].map(n => `<a class="level-card selected" href="#hsk${n}"><span>HSK${n}</span><small>Lấy đề động từ Sheet</small></a>`).join('')}</div></section>`;
}

function renderLevelHome(level) {
  app.innerHTML = `<section class="page"><div class="section-title"><span class="cn">${esc(level)} 模拟考试</span><span class="vi">Luyện đề ${esc(level)}</span></div>
    <div class="card" style="max-width: 600px; margin: 0 auto 30px; text-align: center; background: #fffaf0; border-color: var(--gold);">
       <h3 style="margin-top:0; color: var(--red);">Tải đề thi từ máy chủ</h3>
       <p style="color: var(--muted); font-size: 14px;">Nhập tên Tab đề (Ví dụ: De1, De2) trong file Google Sheets để làm bài.</p>
       <div style="display:flex; gap:10px; justify-content:center; margin-top: 15px;">
          <input id="dynamic-exam-id" placeholder="VD: De1" style="flex:1; max-width: 300px; padding:12px; border:1px solid var(--line); border-radius:3px; outline:none;">
          <button class="btn red" onclick="loadDynamicExam('${level}')">Tải đề ngay</button>
       </div>
    </div><div class="back-row"><a class="btn secondary" href="#home">← Về trang chủ</a></div></section>`;
}

window.loadDynamicExam = function (level) {
  const tabName = document.getElementById('dynamic-exam-id').value.trim();
  if (!tabName) return toast('Vui lòng nhập mã đề (VD: De1).');
  location.hash = `#exam-${level}_${tabName}`;
};

// ==========================================
// TẢI ĐỀ TỪ API VÀ CHUẨN BỊ THI
// ==========================================
async function renderExamHome(id) {
  let [targetLevel, tabName] = id.split('_');
  if (!tabName) { targetLevel = 'HSK4'; tabName = id; } 
  
  app.innerHTML = `<section class="page"><div class="section-title"><span class="cn">加载中</span><span class="vi">Đang nạp dữ liệu...</span></div><div class="card"><div class="notice">Đang kết nối đến máy chủ <b>${targetLevel}</b> để lấy đề <b>${tabName}</b>...</div></div></section>`;
  
  try {
    const apiUrl = COBI_APIS[targetLevel];
    if (!apiUrl) throw new Error(`Bạn chưa cài đặt link Google Sheets cho ${targetLevel} trong code.`);
    
    const response = await fetch(`${apiUrl}?action=getExam&id=${tabName}`);
    const data = await response.json();
    
    if (data.error) throw new Error(data.error);
    
    EXAM.data = data;
    const meta = data.meta || {};
    const counts = [
      ['听力', data.listening?.length || 0],
      ['阅读', data.reading?.length || 0],
      ['书写', data.writing?.length || 0]
    ].filter(x => x[1] > 0);
    
    app.innerHTML = `<section class="page"><div class="section-title"><span class="cn">${esc(meta.level)} 模拟考试</span><span class="vi">${esc(meta.title)}</span></div><div class="notice">${counts.map(x => `<strong>${x[0]}:</strong> ${x[1]}题`).join(' · ')}</div><div class="card-grid">${counts.map(x => `<div class="card"><h3>${x[0]}</h3><p>${x[1]} 题</p></div>`).join('')}</div><div class="card start-card"><label><strong>姓名 · Họ tên học viên</strong></label><input id="student-name" placeholder="Nhập họ tên của bạn"><button class="btn red" id="start-exam">开始考试 · Bắt đầu thi</button></div><div class="back-row"><a class="btn secondary" href="#${targetLevel.toLowerCase()}">← Chọn đề khác</a></div></section>`;
    document.getElementById('start-exam').onclick = () => startExam();
  } catch (e) {
    app.innerHTML = `<section class="page"><div class="section-title"><span class="cn">错误</span><span class="vi">Lỗi tải đề</span></div><div class="card"><div class="notice" style="border-left-color:var(--red); color:var(--red);">${e.message}</div></div><div class="back-row"><a class="btn secondary" href="#${targetLevel.toLowerCase()}">← Quay lại</a></div></section>`;
  }
}

function allQuestions() { return [...(EXAM.data.listening || []), ...(EXAM.data.reading || []), ...(EXAM.data.writing || [])]; }
function sectionQuestions(section) { return EXAM.data[section] || []; }
function isDone(q) { return EXAM.answers[q.id] !== undefined && String(EXAM.answers[q.id]).trim() !== ''; }

function startExam() {
  let n = document.getElementById('student-name').value.trim();
  if (!n) return toast('Vui lòng nhập họ tên học viên.');
  EXAM.studentName = n; EXAM.answers = {}; EXAM.submitted = false; EXAM.reviewMode = false;
  if (EXAM.data.listening?.length) renderSection('listening');
  else if (EXAM.data.reading?.length) renderSection('reading');
}

function paintTimer() {
  let e = document.getElementById('timer'); if (!e) return;
  let s = Math.max(0, EXAM.remaining), m = Math.floor(s / 60), r = s % 60;
  e.textContent = `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  e.classList.toggle('warning', s <= 60);
}

function shell(title, qs) {
  app.innerHTML = `<div class="practice-shell"><div class="practice-top"><div class="practice-top-row"><div><div class="exam-title">${esc(EXAM.data.meta.title)}</div><div class="subhead">${esc(title)}</div></div><div class="timer" id="timer">00:00</div></div><div class="progress-line"><div class="progress-fill" id="progress-fill"></div></div></div><div class="exam-layout"><main class="exam-main" id="exam-main"></main><aside class="reading-nav"><h3>答题卡</h3><div class="legend"><span class="dot green"></span> Đã làm <span class="dot red"></span> Chưa làm</div><div class="palette" id="palette"></div></aside></div></div>`;
  renderPalette(); updateProgress();
}

// ==========================================
// VẼ GIAO DIỆN BÀI THI & CÂU HỎI
// ==========================================
function renderSection(sectionName, reviewMode = false) {
  clearTimers(); goTop(); EXAM.section = sectionName; EXAM.reviewMode = reviewMode;
  const qs = sectionQuestions(sectionName);
  const titleMap = { 'listening': '听力 (Nghe)', 'reading': '阅读 (Đọc)', 'writing': '书写 (Viết)' };
  
  shell(reviewMode ? `Rà soát: ${titleMap[sectionName]}` : titleMap[sectionName], qs);
  const main = document.getElementById('exam-main');
  
  if (sectionName === 'listening' && !reviewMode && EXAM.data.meta?.listeningAudio) {
    const audio = document.createElement('audio'); audio.src = EXAM.data.meta.listeningAudio; audio.style.display = 'none';
    audio.addEventListener('loadedmetadata', () => { if (isFinite(audio.duration)) { setPhaseTimer(Math.ceil(audio.duration), nextSection); }});
    audio.addEventListener('timeupdate', () => { if (isFinite(audio.duration)) { EXAM.remaining = Math.max(0, Math.ceil(audio.duration - audio.currentTime)); paintTimer(); }});
    audio.addEventListener('error', () => { toast('Chưa tìm thấy file Audio. Thời gian mặc định 30 phút.'); setPhaseTimer(30 * 60, nextSection); });
    main.appendChild(audio); EXAM.audio = audio; audio.play().catch(() => toast('Trình duyệt chặn tự động phát. Vui lòng bấm F5 hoặc cấp quyền âm thanh.'));
  } else if (!reviewMode) {
    setPhaseTimer(40 * 60, nextSection); // Mặc định 40p cho Đọc/Viết, bạn có thể chỉnh lại sau.
  }
  
  qs.forEach(q => main.appendChild(questionElement(q)));
  
  const btnRow = document.createElement('div'); btnRow.className = 'action-row';
  btnRow.innerHTML = reviewMode ? `<span></span><button class="btn secondary" onclick="renderReview()">← Quay lại rà soát</button>` : `<span></span><button class="btn red" onclick="nextSection()">Xong phần này →</button>`;
  main.appendChild(btnRow);
  
  renderPalette(); updateProgress();
}

window.nextSection = function() {
  clearTimers(); if (EXAM.audio) { EXAM.audio.pause(); EXAM.audio = null; }
  if (EXAM.section === 'listening' && EXAM.data.reading?.length) renderSection('reading');
  else if ((EXAM.section === 'listening' || EXAM.section === 'reading') && EXAM.data.writing?.length) renderSection('writing');
  else startReview();
};

window.renderReview = function() {
  clearTimers(); goTop(); EXAM.section = 'review'; EXAM.reviewMode = false;
  let qs = allQuestions(), un = qs.filter(q => !isDone(q));
  app.innerHTML = `<section class="page"><div class="review-top"><div class="section-title"><span class="cn">检查答案</span><span class="vi">Rà soát · còn ${un.length} câu chưa làm</span></div></div><div class="card"><p><b class="green-text">Xanh</b> = đã làm · <b class="red-text">Đỏ</b> = chưa làm. Bấm số câu để xem và sửa đáp án.</p><div class="palette review-palette">${qs.map(q => `<button class="${isDone(q) ? 'done' : ''}" onclick="jumpToQuestion(${q.id}, '${q.section}')">${q.id}</button>`).join('')}</div></div><div class="card"><button class="btn red" onclick="submitExam()">提交答案 · Nộp bài</button></div></section>`;
};

window.jumpToQuestion = function(id, sec) {
  if (EXAM.section !== 'review') return;
  renderSection(sec, true);
  setTimeout(() => document.getElementById('q-' + id)?.scrollIntoView({ behavior: 'auto', block: 'start' }), 80);
};

function questionElement(q) {
  const c = document.createElement('article'); c.className = 'question-card'; c.id = 'q-' + q.id;
  let body = '';
  // Tự động quét và hiển thị đáp án từ A đến F nhờ vào q.options
  if (q.type === 'tf' || q.type === 'mcq' || q.type === 'cloze' || q.type === 'reading') {
    body = `<div class="question-text">${esc(q.question)}</div><div class="options">${Object.entries(q.options).map(([k, v]) => `<label class="option"><input type="radio" name="q-${q.id}" value="${k}" ${EXAM.answers[q.id] === k ? 'checked' : ''}><span><b>${k}.</b> ${esc(v)}</span></label>`).join('')}</div>`;
  } else {
    body = `<div class="question-text">${esc(q.question)}</div><input class="answer-input" data-answer="${q.id}" value="${esc(EXAM.answers[q.id] || '')}" placeholder="Nhập câu trả lời của bạn...">`;
  }
  c.innerHTML = `<div class="q-head"><span class="q-number">第 ${q.id} 题</span></div>${body}`;
  c.querySelectorAll('input[type=radio]').forEach(r => r.onchange = () => setAnswer(q.id, r.value));
  c.querySelectorAll('.answer-input').forEach(i => i.oninput = () => setAnswer(q.id, i.value));
  return c;
}

function setAnswer(id, v) { EXAM.answers[id] = v; renderPalette(); updateProgress(); }
function renderPalette() { let e = document.getElementById('palette'); if (!e) return; e.innerHTML = sectionQuestions(EXAM.section).map(q => `<button class="${isDone(q) ? 'done' : ''}" onclick="document.getElementById('q-${q.id}')?.scrollIntoView({behavior:'smooth'})">${q.id}</button>`).join(''); }
function updateProgress() { let e = document.getElementById('progress-fill'); if (!e) return; let qs = sectionQuestions(EXAM.section); e.style.width = qs.length ? `${qs.filter(isDone).length / qs.length * 100}%` : '0%'; }

// ==========================================
// CHẤM ĐIỂM & TRẢ KẾT QUẢ VỀ GOOGLE SHEETS
// ==========================================
window.submitExam = function() {
  if (EXAM.submitted) return; EXAM.submitted = true;
  let qs = allQuestions();
  let correctCount = 0;
  let wrong = [];
  
  qs.forEach(q => {
    // Chỉ chấm tự động các câu có khai báo đáp án đúng (cột ANSWER)
    if (q.answer && q.type !== 'picture' && q.type !== 'essay') {
      let isCorrect = norm(EXAM.answers[q.id]) === norm(q.answer);
      if (isCorrect) correctCount++;
      else wrong.push({ id: q.id, student: EXAM.answers[q.id] || '', correct: q.answer });
    }
  });

  let r = {
    examId: EXAM.data.meta.title,
    level: EXAM.data.meta.level,
    studentName: EXAM.studentName,
    submittedAt: new Date().toISOString(),
    autoScore: correctCount,
    wrong: wrong
  };
  
  renderResult(r);
  sendToSheet(r);
};

function renderResult(r) {
  app.innerHTML = `<section class="page"><div class="result-box"><div class="section-title"><span class="cn">考试结果</span><span class="vi">Kết quả làm bài</span></div><div class="score-big">${r.autoScore} <span style="font-size:20px; color:var(--muted)">câu đúng tự động</span></div><p class="result-note">Học viên: <b>${esc(r.studentName)}</b></p><h3>Chi tiết câu sai (Phần trắc nghiệm)</h3><div class="wrong-list">${r.wrong.length ? r.wrong.map(w => `<div class="wrong-item"><b>Câu ${w.id}</b> · Bạn: <code>${esc(w.student || 'Chưa làm')}</code> · Đáp án: <code>${esc(w.correct)}</code></div>`).join('') : 'Hoàn hảo! Không sai câu nào.'}</div><div class="back-row"><a class="btn secondary" href="#${String(r.level).toLowerCase()}">← Về trang danh sách</a></div></div></section>`;
}

function sendToSheet(r) {
  const apiUrl = COBI_APIS[r.level];
  if (!apiUrl) return;
  fetch(apiUrl, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ ...r, wrong: JSON.stringify(r.wrong) }) })
    .then(() => toast(`Đã gửi kết quả lên hệ thống ${r.level}.`))
    .catch(() => toast('Không kết nối được với hệ thống lưu trữ.'));
}

window.addEventListener('hashchange', route); route();
