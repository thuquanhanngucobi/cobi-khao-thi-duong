// ==========================================
// TỪ ĐIỂN API VÀ CẤU HÌNH THỜI GIAN
// ==========================================
const COBI_APIS = {
  'HSK1': 'https://script.google.com/macros/s/AKfycbyyMWttUjN8CbvzPjYLJrQNWHbuMMVkaAIkRNZ_dGiJ177sG88A5Ug29mhLwb9S2dC0/exec',
  'HSK2': 'https://script.google.com/macros/s/AKfycbzwC5JyYCwTxDXIP7l-0vNU2S0S_5ofj1rkbg5ff3jzfwSNH4K5oY9HZcnGJMb0ABcy/exec',
  'HSK3': '',
  'HSK4': '',
  'HSK5': '',
  'HSK6': ''
};

// Cấu hình thời gian thi (Đơn vị: Phút). Phần Listening chạy theo độ dài Audio.
const TIMING_CONFIG = {
  'HSK1': { reading: 17, writing: 0, review: 5 },
  'HSK2': { reading: 25, writing: 0, review: 5 },
  'HSK3': { reading: 30, writing: 15, review: 5 },
  'HSK4': { reading: 40, writing: 25, review: 5 },
  'HSK5': { reading: 45, writing: 40, review: 5 },
  'HSK6': { reading: 50, writing: 45, review: 5 }
};

const app = document.getElementById('app'), toastEl = document.getElementById('toast');
const EXAM = { data: null, section: 'idle', studentName: '', timer: null, remaining: 0, answers: {}, submitted: false, audio: null, audioTimer: null, reviewMode: false, reviewDeadline: 0 };

const sleep = ms => new Promise(r => setTimeout(r, ms));
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

// Xử lý Pinyin xuống dòng và Ảnh
function renderContent(str) {
  if (!str) return '';
  let s = String(str).trim();
  if (/^[^<]*\.(jpeg|jpg|gif|png|webp)$/i.test(s)) {
      return `<img src="${s}" style="display:block; max-height:150px; max-width:100%; border-radius:5px; margin-top:8px; border: 1px solid #ddd;">`;
  }
  return s.replace(/\n/g, '<br>');
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
       <p style="color: var(--muted); font-size: 14px;">Nhập mã đề (Ví dụ: De1, De2) trong file Google Sheets để làm bài.</p>
       <div style="display:flex; gap:10px; justify-content:center; margin-top: 15px;">
          <input id="dynamic-exam-id" placeholder="VD: De1" style="flex:1; max-width: 300px; padding:12px; border:1px solid var(--line); border-radius:3px; outline:none;">
          <button class="btn red" onclick="loadDynamicExam('${level}')">Tải đề ngay</button>
       </div>
    </div><div class="back-row"><a class="btn secondary" href="#home">← Về trang chủ</a></div></section>`;
}

window.loadDynamicExam = function (level) {
  const tabName = document.getElementById('dynamic-exam-id').value.trim();
  if (!tabName) return toast('Vui lòng nhập mã đề (VD: De1).');
  location.hash = `#exam-${level}_${encodeURIComponent(tabName)}`;
};

// ==========================================
// TẢI ĐỀ TỪ API VÀ CHUẨN BỊ THI
// ==========================================
async function fetchExamWithRetry(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 20000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      return await res.json();
    } catch (e) {
      await sleep(1000 * (i + 1));
    }
  }
  throw new Error('Không tải được đề (mạng chậm hoặc máy chủ đang bận). Vui lòng bấm F5 để thử lại.');
}

async function renderExamHome(id) {
  let targetLevel, tabName;
  const sep = id.indexOf('_');
  if (sep === -1) { targetLevel = 'HSK4'; tabName = id; }
  else { targetLevel = id.slice(0, sep); tabName = id.slice(sep + 1); }

  app.innerHTML = `<section class="page"><div class="section-title"><span class="cn">加载中</span><span class="vi">Đang nạp dữ liệu...</span></div><div class="card"><div class="notice">Đang kết nối đến máy chủ <b>${esc(targetLevel)}</b> để lấy đề <b>${esc(tabName)}</b>...</div></div></section>`;

  try {
    const apiUrl = COBI_APIS[targetLevel];
    if (!apiUrl) throw new Error(`Bạn chưa cài đặt link Google Sheets cho ${targetLevel} trong code.`);

    const data = await fetchExamWithRetry(`${apiUrl}?action=getExam&id=${encodeURIComponent(tabName)}`);

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
    app.innerHTML = `<section class="page"><div class="section-title"><span class="cn">错误</span><span class="vi">Lỗi tải đề</span></div><div class="card"><div class="notice" style="border-left-color:var(--red); color:var(--red);">${esc(e.message)}</div></div><div class="back-row"><a class="btn secondary" href="#${targetLevel.toLowerCase()}">← Quay lại</a></div></section>`;
  }
}

function allQuestions() { return [...(EXAM.data.listening || []), ...(EXAM.data.reading || []), ...(EXAM.data.writing || [])]; }
function sectionQuestions(section) { return EXAM.data[section] || []; }
function isDone(q) { return EXAM.answers[q.id] !== undefined && String(EXAM.answers[q.id]).trim() !== ''; }

function startExam() {
  let n = document.getElementById('student-name').value.trim();
  if (!n) return toast('Vui lòng nhập họ tên học viên.');
  EXAM.studentName = n; EXAM.answers = {}; EXAM.submitted = false; EXAM.reviewMode = false;
  EXAM.reviewDeadline = 0; // Đặt lại bộ đếm rà soát
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
// VẼ GIAO DIỆN BÀI THI & XỬ LÝ AUDIO CHỐNG GIAN LẬN
// ==========================================
function renderSection(sectionName, reviewMode = false) {
  // NẾU ĐANG LÀ CHẾ ĐỘ RÀ SOÁT -> KHÔNG ĐƯỢC TẮT ĐỒNG HỒ 5 PHÚT
  if (!reviewMode) {
      clearTimers();
  }

  goTop(); EXAM.section = sectionName; EXAM.reviewMode = reviewMode;
  const qs = sectionQuestions(sectionName);
  const titleMap = { 'listening': '听力 (Nghe)', 'reading': '阅读 (Đọc)', 'writing': '书写 (Viết)' };

  shell(reviewMode ? `Rà soát: ${titleMap[sectionName]}` : titleMap[sectionName], qs);
  const main = document.getElementById('exam-main');
  const currentLevel = String(EXAM.data.meta?.level || 'HSK2').toUpperCase();

  if (sectionName === 'listening' && !reviewMode) {
    let levelStr = currentLevel.toLowerCase();
    let titleStr = String(EXAM.data.meta?.title || 'de1').toLowerCase().trim();

    const audio = document.createElement('audio');
    audio.style.display = 'none';

    const gate = document.createElement('div');
    gate.className = 'card';
    gate.style.textAlign = 'center';
    gate.style.padding = '40px 20px';
    gate.innerHTML = `
      <h3 style="color:var(--red); font-size:24px;">Phần thi Nghe (听力)</h3>
      <p id="audio-status" style="color:var(--muted); margin: 15px 0 25px;">Đang tải dữ liệu âm thanh...</p>
      <button class="btn red" id="btn-start-audio" disabled style="font-size:18px; padding:12px 30px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">▶ Bắt đầu Nghe & Tính giờ</button>
    `;

    const qContainer = document.createElement('div');
    qContainer.style.display = 'none';

    main.appendChild(gate);
    main.appendChild(qContainer);
    main.appendChild(audio);

    let audioReady = false;

    // Bật nút bắt đầu nghe (dùng cho cả trường hợp tải xong và trường hợp dự phòng)
    const enableStart = () => {
      if (audioReady) return;
      audioReady = true;
      const btn = document.getElementById('btn-start-audio');
      if (!btn) return;
      btn.disabled = false;
      btn.onclick = () => {
        gate.style.display = 'none';
        qContainer.style.display = 'block';
        audio.play().catch(() => toast('Trình duyệt chặn âm thanh, hãy chạm vào màn hình rồi thử lại.'));
        const secs = isFinite(audio.duration) && audio.duration > 0 ? Math.ceil(audio.duration) : 30 * 60;
        setPhaseTimer(secs, nextSection);
      };
    };

    audio.addEventListener('loadedmetadata', () => {
      document.getElementById('audio-status').innerHTML = `Thời lượng Audio: <b>${Math.ceil(audio.duration / 60)} phút</b>.<br><i>Toàn bộ câu hỏi đã bị ẩn. Bấm nút dưới đây để phát Audio, xem câu hỏi và bắt đầu tính giờ.</i>`;
      enableStart();
    });

    audio.addEventListener('timeupdate', () => {
      if (isFinite(audio.duration) && EXAM.section === 'listening') {
        EXAM.remaining = Math.max(0, Math.ceil(audio.duration - audio.currentTime));
        paintTimer();
      }
    });

    audio.addEventListener('error', () => {
      if (audioReady) return;
      audioReady = true;
      document.getElementById('audio-status').innerHTML = '<span style="color:red">Lỗi: Không tìm thấy file Audio. Bạn có thể làm chay trong 30 phút.</span>';
      const btn = document.getElementById('btn-start-audio');
      btn.disabled = false;
      btn.onclick = () => {
        gate.style.display = 'none';
        qContainer.style.display = 'block';
        setPhaseTimer(30 * 60, nextSection);
      };
    });

    // Dự phòng cho iPhone/mạng chậm: sau 6 giây vẫn chưa tải xong thì vẫn cho bấm nút
    setTimeout(() => {
      if (!audioReady && EXAM.section === 'listening') {
        document.getElementById('audio-status').innerHTML = 'Âm thanh đang tải chậm. Bạn vẫn có thể bấm nút bên dưới để bắt đầu nghe.';
        enableStart();
      }
    }, 6000);

    audio.preload = 'auto';
    audio.src = `audio/${levelStr}/${encodeURIComponent(titleStr)}.mp3`;
    audio.load();
    EXAM.audio = audio;

    qs.forEach(q => qContainer.appendChild(questionElement(q)));
    const btnRow = document.createElement('div'); btnRow.className = 'action-row';
    btnRow.innerHTML = `<span></span><button class="btn red" onclick="nextSection()">Xong phần Nghe →</button>`;
    qContainer.appendChild(btnRow);

  } else {
    // Logic Đọc, Viết
    if (!reviewMode) {
      let configTime = TIMING_CONFIG[currentLevel] ? TIMING_CONFIG[currentLevel][sectionName] : 40;
      setPhaseTimer(configTime * 60, nextSection);
    }
    qs.forEach(q => main.appendChild(questionElement(q)));

    const btnRow = document.createElement('div'); btnRow.className = 'action-row';
    btnRow.innerHTML = reviewMode ? `<span></span><button class="btn secondary" onclick="startReview(true)">← Quay lại rà soát</button>` : `<span></span><button class="btn red" onclick="nextSection()">Xong phần này →</button>`;
    main.appendChild(btnRow);
  }

  renderPalette(); updateProgress();
}

window.nextSection = function() {
  clearTimers(); if (EXAM.audio) { EXAM.audio.pause(); EXAM.audio = null; }
  if (EXAM.section === 'listening' && EXAM.data.reading?.length) renderSection('reading');
  else if ((EXAM.section === 'listening' || EXAM.section === 'reading') && EXAM.data.writing?.length) renderSection('writing');
  else startReview();
};

// ==========================================
// THỜI GIAN 5 PHÚT RÀ SOÁT VÀ NỘP BÀI
// ==========================================
// Đồng hồ rà soát dùng chung, không bị chết khi chuyển trang
function startReviewTimer() {
    clearInterval(EXAM.timer);
    EXAM.timer = setInterval(() => {
        EXAM.remaining = Math.max(0, Math.ceil((EXAM.reviewDeadline - Date.now()) / 1000));

        // Cập nhật giao diện đồng hồ nhỏ (Nếu đang sửa câu)
        paintTimer();

        // Cập nhật giao diện đồng hồ lớn (Nếu ở màn hình chọn câu)
        let reviewTimerEl = document.getElementById('review-timer');
        if (reviewTimerEl) {
            let s = EXAM.remaining, m = Math.floor(s / 60), r = s % 60;
            reviewTimerEl.textContent = `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
            reviewTimerEl.classList.toggle('warning', s <= 60);
        }

        if (EXAM.remaining <= 0) {
            clearInterval(EXAM.timer);
            submitExam();
        }
    }, 200);
}

window.startReview = function(isReturning = false) {
  if (EXAM.section === 'review' && !isReturning) return;
  goTop(); EXAM.section = 'review'; EXAM.reviewMode = false;

  let currentLevel = String(EXAM.data.meta?.level || 'HSK2').toUpperCase();
  let rTime = TIMING_CONFIG[currentLevel]?.review || 5;

  // NẾU LÀ LẦN ĐẦU VÀO RÀ SOÁT -> BẬT ĐỒNG HỒ 5 PHÚT
  if (!EXAM.reviewDeadline || EXAM.reviewDeadline === 0) {
      EXAM.reviewDeadline = Date.now() + rTime * 60 * 1000;
      startReviewTimer();
  }

  renderReviewUI();
}

function renderReviewUI() {
  let qs = allQuestions(), un = qs.filter(q => !isDone(q));
  app.innerHTML = `<section class="page"><div class="review-top" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;"><div class="section-title" style="margin-bottom:0;"><span class="cn">检查答案</span><span class="vi">Rà soát · còn ${un.length} câu chưa làm</span></div><div class="review-timer" id="review-timer" style="font-size:24px; color:var(--red); font-weight:bold; border: 1px solid var(--red); padding: 5px 15px; border-radius: 5px; background: #fff8ef;">05:00</div></div><div class="card"><p><b class="green-text">Xanh</b> = đã làm · <b class="red-text">Đỏ</b> = chưa làm. Bấm số câu để sửa đáp án.</p><div class="palette review-palette">${qs.map(q => `<button class="${isDone(q) ? 'done' : ''}" onclick="jumpToQuestion(${q.id}, '${q.section}')">${q.id}</button>`).join('')}</div></div><div class="card"><button class="btn red" onclick="submitExam()">提交答案 · Nộp bài ngay</button></div></section>`;
}

window.jumpToQuestion = function(id, sec) {
  if (EXAM.section !== 'review') return;
  renderSection(sec, true);
  setTimeout(() => document.getElementById('q-' + id)?.scrollIntoView({ behavior: 'auto', block: 'start' }), 80);
};

// ==========================================
// RENDER CÂU HỎI & LỰA CHỌN
// ==========================================
function questionElement(q) {
  const c = document.createElement('article'); c.className = 'question-card'; c.id = 'q-' + q.id;
  let body = '';

  if (q.type === 'tf' || q.type === 'mcq' || q.type === 'cloze' || q.type === 'reading' || q.type === 'order') {
    body = `<div class="question-text" style="line-height:1.8;">${renderContent(q.question)}</div>
            <div class="options" style="align-items: center;">
               ${Object.entries(q.options).map(([k, v]) => `
                 <label class="option">
                   <input type="radio" name="q-${q.id}" value="${k}" ${EXAM.answers[q.id] === k ? 'checked' : ''}>
                   <span style="width:100%;"><b>${k}.</b> ${renderContent(v)}</span>
                 </label>
               `).join('')}
            </div>`;
  } else {
    body = `<div class="question-text" style="line-height:1.8;">${renderContent(q.question)}</div><input class="answer-input" data-answer="${q.id}" value="${esc(EXAM.answers[q.id] || '')}" placeholder="Nhập câu trả lời của bạn...">`;
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
  clearTimers(); if (EXAM.audio) EXAM.audio.pause();

  let qs = allQuestions();
  let correctCount = 0;
  let wrong = [];

  qs.forEach(q => {
    if (q.answer && q.type !== 'picture' && q.type !== 'essay') {
      let isCorrect = norm(EXAM.answers[q.id]) === norm(q.answer);
      if (isCorrect) correctCount++;
      else wrong.push({ id: q.id, student: EXAM.answers[q.id] || '', correct: q.answer });
    }
  });

  let r = {
    submissionId: Date.now() + '-' + Math.random().toString(36).slice(2, 10),
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
  window.__lastResult = r;
  app.innerHTML = `<section class="page"><div class="result-box"><div class="section-title"><span class="cn">考试结果</span><span class="vi">Kết quả làm bài</span></div><div class="score-big">${r.autoScore} <span style="font-size:20px; color:var(--muted)">câu đúng tự động</span></div><p class="result-note">Học viên: <b>${esc(r.studentName)}</b></p><div id="send-status" class="notice" style="margin:12px 0;"></div><h3>Chi tiết câu sai (Phần trắc nghiệm)</h3><div class="wrong-list">${r.wrong.length ? r.wrong.map(w => `<div class="wrong-item"><b>Câu ${w.id}</b> · Bạn: <code>${esc(w.student || 'Chưa làm')}</code> · Đáp án: <code>${esc(w.correct)}</code></div>`).join('') : 'Hoàn hảo! Không sai câu nào.'}</div><div class="back-row"><a class="btn secondary" href="#${String(r.level).toLowerCase()}">← Về trang danh sách</a></div></div></section>`;
}

async function sendToSheet(r) {
  let level = String(r.level).toUpperCase();
  if (level === 'HSK_LEVEL') level = 'HSK2';
  const apiUrl = COBI_APIS[level];
  const setStatus = html => { const el = document.getElementById('send-status'); if (el) el.innerHTML = html; };
  const retryBtn = ` <button class="btn red" style="padding:6px 14px" onclick="sendToSheet(window.__lastResult)">Gửi lại</button>`;

  if (!apiUrl) { setStatus('❌ Chưa cài link Google Sheets cho ' + esc(level) + '.'); return; }

  const body = JSON.stringify({ ...r, wrong: JSON.stringify(r.wrong) });
  try { localStorage.setItem('cobi_pending_' + r.submissionId, body); } catch (e) {}

  setStatus('⏳ Đang gửi kết quả lên hệ thống... (vui lòng không đóng trang)');

  for (let i = 1; i <= 4; i++) {
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body
      });
      const d = await res.json();
      if (d && d.success) {
        try { localStorage.removeItem('cobi_pending_' + r.submissionId); } catch (e) {}
        setStatus('✅ Đã gửi kết quả thành công! Giáo viên đã nhận được bài của bạn.');
        return;
      }
      throw new Error((d && d.error) || 'Lỗi không xác định');
    } catch (e) {
      setStatus(`⏳ Lần gửi ${i}/4 chưa được, đang thử lại...`);
      await sleep(1500 * i);
    }
  }

  // Dự phòng cuối: gửi kiểu không đọc phản hồi (server vẫn chống trùng nhờ submissionId)
  try {
    await fetch(apiUrl, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body });
    setStatus('⚠️ Đã gửi nhưng chưa nhận được xác nhận. Hãy CHỤP MÀN HÌNH trang này và báo giáo viên.' + retryBtn);
  } catch (e) {
    setStatus('❌ Không gửi được do lỗi mạng. Hãy CHỤP MÀN HÌNH trang này, báo giáo viên rồi bấm Gửi lại.' + retryBtn);
  }
}
window.sendToSheet = sendToSheet;

// Cảnh báo khi học viên lỡ F5 / đóng tab giữa lúc đang thi
window.addEventListener('beforeunload', e => {
  const inExam = EXAM.data && ['listening', 'reading', 'writing', 'review'].includes(EXAM.section) && !EXAM.submitted;
  if (inExam) { e.preventDefault(); e.returnValue = ''; }
});

window.addEventListener('hashchange', route); route();
