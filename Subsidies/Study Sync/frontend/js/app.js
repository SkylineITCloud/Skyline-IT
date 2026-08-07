// ====================================================
// STATE
// ====================================================
let pomodoroInterval = null;
let pomodoroRunning = false;
let pomodoroSeconds = 25 * 60;
let pomodoroTotal = 25 * 60;
let pomodoroSettings = { focus: 25, shortBreak: 5, longBreak: 15 };
let calendarWeekOffset = 0;
let calendarEvents = [];
let myGroups = [];
let myGroup = null;
let currentRoom = null;

const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const hours = Array.from({length: 15}, (_, i) => i + 8);

const botFAQ = [
  { q: ['join', 'group'], a: 'To join a group, go to <strong>Find Groups</strong> in the sidebar, browse available groups, and click <strong>Join</strong> on any that match your course and style! 🎯' },
  { q: ['pomodoro', 'timer', 'technique'], a: 'The Pomodoro Technique breaks study time into 25-minute focus sessions with 5-minute breaks. After 4 sessions, take a longer 15-minute break. It boosts focus and prevents burnout! 🍅' },
  { q: ['streak', 'streaks', 'fire'], a: 'Streaks count consecutive days your group studies together. Keep your streak going by attending sessions regularly – even 30 minutes counts! 🔥' },
  { q: ['badge', 'badges', 'earn'], a: 'Badges are earned by reaching milestones: attending your first session, maintaining streaks, studying 20+ hours/week, and more! Check your Progress card on the dashboard. 🏅' },
  { q: ['schedule', 'session', 'calendar'], a: 'Go to <strong>Calendar</strong> in the sidebar and click <strong>Create Session</strong>. Set the date, time (15-min increments), and type (Video or In-Person). Your group will be notified! 📅' },
  { q: ['shoutout', 'praise', 'appreciate'], a: 'Open the Chat page and click <strong>Shout-Out</strong> to publicly praise a group member. It appears as a special highlighted message for the whole group to see! 🎉' },
  { q: ['dark', 'mode', 'theme'], a: 'You can enable Dark Mode from <strong>Profile > Preferences</strong> or toggle it from the profile page. Easy on the eyes for late-night study sessions! 🌙' },
  { q: ['delete', 'account'], a: 'You can delete your account from <strong>Profile > Danger Zone</strong>. This is permanent and removes all your data. We recommend exporting first!' },
];

// ====================================================
// AUTH
// ====================================================
function switchAuthTab(tab) {
  document.getElementById('panel-login').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('panel-signup').style.display = tab === 'signup' ? 'block' : 'none';
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
  document.getElementById('tab-login').setAttribute('aria-selected', tab === 'login');
  document.getElementById('tab-signup').setAttribute('aria-selected', tab === 'signup');
}

async function doLogin() {
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const pass = document.getElementById('login-pass').value;
  let ok = true;
  if (!email || !email.includes('@')) { showFieldError('login-email-err', 'Please enter a valid university email'); ok = false; }
  else hideFieldError('login-email-err');
  if (!pass) { showFieldError('login-pass-err', 'Please enter your password'); ok = false; }
  else hideFieldError('login-pass-err');
  if (!ok) return;

  try {
    const user = await login(email, pass);
    enterApp();
  } catch (e) {
    showFieldError('login-email-err', e.message);
  }
}

async function doSignup() {
  const name = document.getElementById('su-name').value.trim();
  const email = document.getElementById('su-email').value.trim().toLowerCase();
  const pass = document.getElementById('su-pass').value;
  let ok = true;
  if (!name) { showFieldError('su-name-err', 'Please tell us your name!'); ok = false; } else hideFieldError('su-name-err');
  if (!email || !email.includes('@')) { showFieldError('su-email-err', 'Looks like that email isn\'t quite right'); ok = false; } else hideFieldError('su-email-err');
  if (pass.length < 8) { showFieldError('su-pass-err', 'Password needs at least 8 characters'); ok = false; } else hideFieldError('su-pass-err');
  if (!ok) return;

  const availability = Array.from(document.querySelectorAll('#panel-signup .availability-grid input:checked')).map(cb => cb.value);
  const course = document.getElementById('su-course').value;
  const method = document.getElementById('su-method').value;

  try {
    await register(name, email, pass, course, method, availability);
    enterApp();
    showToast('Welcome to StudySync! 🎉 Your account is ready.', 'success');
  } catch (e) {
    showFieldError('su-email-err', e.message);
  }
}

async function enterApp() {
  showPage('page-app');
  startHeartbeat();
  await initApp();
}

async function doLogout() {
  if (!confirm('Are you sure you want to log out?')) return;
  stopHeartbeat();
  await logout();
  resetPomodoro();
  showPage('page-auth');
}

function showFieldError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.add('show');
}

function hideFieldError(id) {
  const el = document.getElementById(id);
  el.classList.remove('show');
}

function togglePassword(inputId, btn) {
  const inp = document.getElementById(inputId);
  const isPass = inp.type === 'password';
  inp.type = isPass ? 'text' : 'password';
  btn.querySelector('i').className = isPass ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
  btn.setAttribute('aria-label', isPass ? 'Show password' : 'Hide password');
}

// ====================================================
// APP INIT
// ====================================================
async function initApp() {
  if (!currentUser) {
    try { await fetchMe(); } catch (e) { doLogout(); return; }
  }

  const firstName = currentUser.name.split(' ')[0];
  document.getElementById('welcome-name').textContent = firstName;
  document.getElementById('sidebar-name').textContent = currentUser.name;
  document.getElementById('sidebar-avatar').textContent = currentUser.name[0];

  document.getElementById('profile-name-display').textContent = currentUser.name;
  document.getElementById('profile-email-display').textContent = currentUser.email;
  document.getElementById('profile-avatar').textContent = currentUser.name[0];
  document.getElementById('ep-name').value = currentUser.name;
  document.getElementById('ep-course').value = currentUser.course || '';

  const lbYou = document.getElementById('lb-you');
  if (lbYou) lbYou.textContent = firstName + ' (You)';

  // Dark mode
  if (currentUser.dark_mode) {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.getElementById('dark-mode-toggle').checked = true;
  }

  // DND
  if (currentUser.dnd) {
    document.getElementById('dnd-status').classList.add('show');
    document.getElementById('dnd-toggle').checked = true;
  }

  // Load groups
  await loadMyGroups();

  // Groups discovery
  await loadDiscoveryGroups();

  // Calendar
  renderCalendar();
  populateTimeSlots();

  // Task sortable
  try { Sortable.create(document.getElementById('task-list'), { animation: 150, ghostClass: 'task-drag' }); } catch(e) {}

  // Missed banner
  setTimeout(() => {
    const banner = document.getElementById('missed-banner');
    if (banner) banner.classList.add('show');
  }, 1500);
}

// ====================================================
// NAVIGATION
// ====================================================
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => { p.classList.remove('active'); p.style.display = 'none'; });
  const page = document.getElementById(id);
  page.style.display = 'flex';
  page.classList.add('active');
}

function showSubPage(name) {
  document.querySelectorAll('.sub-page').forEach(p => p.classList.remove('active'));
  document.getElementById('sub-' + name).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navMap = { dashboard: 0, groups: 1, chat: 2, calendar: 3, profile: 4 };
  const navItems = document.querySelectorAll('.nav-item');
  if (navMap[name] !== undefined) {
    navItems[navMap[name]].classList.add('active');
    navItems[navMap[name]].setAttribute('aria-current', 'page');
  }
  const titles = { dashboard: 'Dashboard', groups: 'Find Groups', chat: 'Group Chat', calendar: 'Calendar', profile: 'Profile & Settings' };
  document.getElementById('topbar-title').textContent = titles[name] || 'StudySync';
  navItems.forEach((ni, i) => { if (i !== navMap[name]) ni.removeAttribute('aria-current'); });
  window.scrollTo(0, 0);

  // Load chat messages when chat tab opens
  if (name === 'chat') loadChatMessages();
}

// ====================================================
// GROUPS
// ====================================================
async function loadMyGroups() {
  try {
    const data = await fetchMyGroups();
    myGroups = data.groups || [];
    myGroup = myGroups[0] || null;

    if (myGroup) {
      document.querySelector('.card-badge').textContent = myGroup.course;
      document.querySelector('.streak-count').textContent = currentUser.streak || 0;

      // Update members
      const memberList = document.querySelector('.member-list');
      if (myGroup.members) {
        memberList.innerHTML = myGroup.members.map(m => `
          <div class="member-chip" role="listitem">
            <span class="${m.is_online ? 'online-dot' : 'offline-dot'}" aria-label="${m.is_online ? 'Online' : 'Offline'}"></span> ${m.name}
          </div>
        `).join('');
      }
    }
  } catch (e) {
    console.error('Failed to load groups:', e);
  }
}

async function loadDiscoveryGroups() {
  try {
    const data = await fetchGroups();
    const groups = data.groups || [];
    renderGroups(groups);
  } catch (e) {
    console.error('Failed to load groups:', e);
  }
}

function renderGroups(groups) {
  const grid = document.getElementById('groups-grid');
  if (!grid) return;
  grid.innerHTML = '';

  if (groups.length === 0) {
    grid.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:40px">No groups found. Create one!</p>';
    return;
  }

  groups.forEach(g => {
    const card = document.createElement('div');
    card.className = 'group-card';
    card.setAttribute('role', 'listitem');

    const colors = ['#2E7D32','#1976D2','#E65100','#6A1B9A'];
    const avatars = (g.members || []).slice(0, 4).map((m, i) =>
      `<div class="avatar" style="width:26px;height:26px;font-size:0.65rem;background:${colors[i % colors.length]}" aria-hidden="true">${m.name[0]}</div>`
    ).join('');

    const matchPct = Math.min(95, 50 + Math.floor(Math.random() * 45));

    card.innerHTML = `
      <div class="group-card-top">
        <div class="group-name">${g.name}</div>
        <div class="match-badge" aria-label="${matchPct}% match">${matchPct}% match</div>
      </div>
      <div class="group-meta">
        <span class="tag"><i class="fa-solid fa-book" aria-hidden="true"></i> ${g.course}</span>
        <span class="tag"><i class="fa-solid fa-brain" aria-hidden="true"></i> ${g.study_method}</span>
        <span class="tag"><i class="fa-solid fa-repeat" aria-hidden="true"></i> ${g.frequency}</span>
      </div>
      <div class="group-members">
        <div class="avatar-stack" aria-hidden="true">${avatars}</div>
        <span aria-label="${g.member_count} of ${g.max_members} members">${g.member_count}/${g.max_members} members</span>
      </div>
      <button class="btn ${g.is_member ? 'btn-secondary' : 'btn-primary'} btn-sm btn-full" onclick="handleJoinGroup('${g.id}','${g.name}')" aria-label="${g.is_member ? 'Already a member of ' + g.name : 'Join ' + g.name}">
        <i class="fa-solid ${g.is_member ? 'fa-check' : 'fa-user-plus'}" aria-hidden="true"></i> ${g.is_member ? 'Member' : 'Join Group'}
      </button>
    `;
    grid.appendChild(card);
  });
}

function filterGroups() {
  const spinner = document.getElementById('groups-spinner');
  spinner.style.display = 'block';
  const course = document.querySelector('#sub-groups .filters-bar select:nth-child(1)').value;
  const method = document.querySelector('#sub-groups .filters-bar select:nth-child(2)').value;
  const params = {};
  if (course) params.course = course;
  if (method) params.method = method;

  setTimeout(async () => {
    try {
      const data = await fetchGroups(params);
      renderGroups(data.groups || []);
    } catch (e) { showToast('Failed to filter groups', 'error'); }
    spinner.style.display = 'none';
  }, 300);
}

async function handleJoinGroup(id, name) {
  try {
    await joinGroup(id);
    showToast('🎉 You\'ve been matched with ' + name + '! Check your dashboard.', 'success');
    setTimeout(() => fireConfetti(), 300);
    await loadDiscoveryGroups();
    await loadMyGroups();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function createGroup() {
  const name = document.getElementById('cg-name').value.trim();
  if (!name) { showToast('Please enter a group name!', 'error'); return; }
  const course = document.getElementById('cg-course').value;
  const method = document.getElementById('cg-method').value;
  const max = document.getElementById('cg-max').value;

  try {
    await createGroup({ name, course, study_method: method, max_members: parseInt(max) });
    closeModal('create-group-modal');
    showToast('Group "' + name + '" created! Invite your friends 🎉', 'success');
    setTimeout(() => fireConfetti(), 300);
    document.getElementById('cg-name').value = '';
    await loadDiscoveryGroups();
    await loadMyGroups();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ====================================================
// POMODORO
// ====================================================
function togglePomodoro() {
  if (pomodoroRunning) {
    clearInterval(pomodoroInterval);
    pomodoroRunning = false;
    const btn = document.getElementById('pomo-start-btn');
    btn.innerHTML = '<i class="fa-solid fa-play" aria-hidden="true"></i> Resume';
    document.getElementById('pomo-label').textContent = 'Paused';
  } else {
    pomodoroRunning = true;
    const btn = document.getElementById('pomo-start-btn');
    btn.innerHTML = '<i class="fa-solid fa-pause" aria-hidden="true"></i> Pause';
    document.getElementById('pomo-label').textContent = 'Focus time! 🎯';
    pomodoroInterval = setInterval(() => {
      pomodoroSeconds--;
      if (pomodoroSeconds <= 0) {
        clearInterval(pomodoroInterval);
        pomodoroRunning = false;
        pomodoroSeconds = 0;
        updatePomodoroDisplay();
        document.getElementById('pomo-label').textContent = 'Session complete! 🎉';
        document.getElementById('pomo-phase').textContent = 'Done';
        btn.innerHTML = '<i class="fa-solid fa-play" aria-hidden="true"></i> Start';
        showToast('Pomodoro complete! Time for a break 🎉', 'success');
        fireConfetti();
        openModal('session-complete-modal');
        completePomodoro(pomodoroSettings.focus).catch(() => {});
      }
      updatePomodoroDisplay();
    }, 1000);
  }
}

function resetPomodoro() {
  clearInterval(pomodoroInterval);
  pomodoroRunning = false;
  pomodoroSeconds = pomodoroSettings.focus * 60;
  pomodoroTotal = pomodoroSettings.focus * 60;
  updatePomodoroDisplay();
  document.getElementById('pomo-label').textContent = 'Ready to focus?';
  document.getElementById('pomo-phase').textContent = 'Focus';
  const btn = document.getElementById('pomo-start-btn');
  if (btn) btn.innerHTML = '<i class="fa-solid fa-play" aria-hidden="true"></i> Start';
  document.getElementById('pomo-bar').style.width = '0%';
}

function updatePomodoroDisplay() {
  const m = Math.floor(pomodoroSeconds / 60).toString().padStart(2, '0');
  const s = (pomodoroSeconds % 60).toString().padStart(2, '0');
  const display = document.getElementById('pomo-display');
  if (display) {
    display.textContent = m + ':' + s;
    display.setAttribute('aria-label', m + ' minutes ' + s + ' seconds');
  }
  const pct = ((pomodoroTotal - pomodoroSeconds) / pomodoroTotal) * 100;
  const bar = document.getElementById('pomo-bar');
  if (bar) {
    bar.style.width = pct + '%';
    const pb = bar.closest('[role="progressbar"]');
    if (pb) pb.setAttribute('aria-valuenow', Math.round(pct));
  }
}

function startPomodoroFromGroup() {
  showSubPage('dashboard');
  setTimeout(() => {
    if (!pomodoroRunning) togglePomodoro();
    showToast('Pomodoro started with your group! 🍅', 'success');
  }, 100);
}

function savePomodoroSettings() {
  pomodoroSettings.focus = parseInt(document.getElementById('ps-focus').value) || 25;
  pomodoroSettings.shortBreak = parseInt(document.getElementById('ps-break').value) || 5;
  pomodoroSettings.longBreak = parseInt(document.getElementById('ps-long').value) || 15;
  resetPomodoro();
  closeModal('pomo-settings-modal');
  showToast('Pomodoro settings saved!', 'success');
}

// ====================================================
// TASKS
// ====================================================
async function loadTasks() {
  if (!myGroup) return;
  try {
    const data = await fetchTasks(myGroup.id);
    const list = document.getElementById('task-list');
    list.innerHTML = '';
    (data.tasks || []).forEach(t => {
      const item = document.createElement('div');
      item.className = 'task-item';
      item.setAttribute('role', 'listitem');
      item.setAttribute('draggable', 'true');
      item.innerHTML = `
        <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="toggleTask('${t.id}', this)" aria-label="Task: ${t.title}">
        <span class="task-text ${t.completed ? 'done' : ''}">${t.title}</span>
        <span class="task-assignee" aria-label="Assigned to ${t.assignee_name || 'Unassigned'}">${t.assignee_name || 'Unassigned'}</span>
        <button class="task-react" onclick="reactTask(this, '${t.id}')" aria-label="React with emoji">${t.emoji || '⭐'}</button>
      `;
      list.appendChild(item);
    });
    updateTaskCount();
  } catch (e) { console.error('Failed to load tasks:', e); }
}

function updateTaskCount() {
  const items = document.querySelectorAll('#task-list .task-item');
  const done = document.querySelectorAll('#task-list input[type=checkbox]:checked');
  document.getElementById('task-count').textContent = done.length + '/' + items.length;
}

async function toggleTask(id, checkbox) {
  const span = checkbox.nextElementSibling;
  span.classList.toggle('done', checkbox.checked);
  try {
    await updateTask(id, { completed: checkbox.checked });
    updateTaskCount();
    if (checkbox.checked) showToast('Task completed! Great work 💪', 'success');
  } catch (e) { showToast('Failed to update task', 'error'); }
}

async function addTask() {
  const input = document.getElementById('task-input');
  const text = input.value.trim();
  if (!text) { showToast('Please enter a task name first!', 'error'); return; }
  if (!myGroup) { showToast('Join a group first!', 'error'); return; }

  try {
    await createTask({ group_id: myGroup.id, title: text });
    input.value = '';
    await loadTasks();
    showToast('Task added!', 'success');
  } catch (e) { showToast(e.message, 'error'); }
}

async function reactTask(btn, id) {
  const emojis = ['⭐','🔥','💪','🎉','✅','💡'];
  const current = emojis.indexOf(btn.textContent);
  const next = emojis[(current + 1) % emojis.length];
  btn.textContent = next;
  try { await updateTask(id, { emoji: next }); } catch (e) {}
}

// ====================================================
// CHAT
// ====================================================
function switchRoom(el, name) {
  document.querySelectorAll('.chat-room-item').forEach(r => r.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('chat-room-title').textContent = name;
  currentRoom = name;
  loadChatMessages();
}

async function loadChatMessages() {
  if (!myGroup) return;
  try {
    const data = await fetchMessages(myGroup.id);
    const msgs = document.getElementById('chat-messages');
    msgs.innerHTML = '';
    (data.messages || []).forEach(m => {
      if (m.type === 'shoutout') {
        const bubble = document.createElement('div');
        bubble.className = 'shoutout-bubble';
        bubble.setAttribute('role', 'note');
        bubble.innerHTML = `<div class="so-title">🎉 Shout-out!</div><div>${m.content.replace('🎉 Shout-Out! ','')}</div>`;
        msgs.appendChild(bubble);
      } else {
        const isMine = m.user_id === currentUser.id;
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble' + (isMine ? ' mine' : '');
        const initial = m.user_name ? m.user_name[0] : '?';
        const colors = ['#2E7D32','#1976D2','#E65100','#6A1B9A'];
        const colorIdx = (m.user_name ? m.user_name.charCodeAt(0) : 0) % colors.length;
        let processedContent = m.content.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
        bubble.innerHTML = `
          <div class="avatar" style="width:32px;height:32px;font-size:0.7rem;background:${colors[colorIdx]}" aria-hidden="true">${initial}</div>
          <div>
            <div class="bubble-author">${isMine ? 'You' : m.user_name}</div>
            <div class="bubble-content">${processedContent}</div>
          </div>
        `;
        msgs.appendChild(bubble);
      }
    });
    msgs.scrollTop = msgs.scrollHeight;
  } catch (e) { console.error('Failed to load messages:', e); }
}

function insertEmoji(emoji) {
  const input = document.getElementById('chat-input');
  input.value += emoji;
  input.focus();
}

async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;
  if (!myGroup) { showToast('Join a group to chat!', 'error'); return; }

  try {
    await sendMessage(myGroup.id, text);
    input.value = '';
    await loadChatMessages();
  } catch (e) { showToast('Failed to send message', 'error'); }
}

async function sendShoutout() {
  const member = document.getElementById('so-member').value;
  const msg = document.getElementById('so-msg').value.trim();
  if (!msg) { showToast('Please write something nice! 💚', 'error'); return; }
  if (!myGroup) { showToast('Join a group first!', 'error'); return; }

  // Find member ID
  const target = (myGroup.members || []).find(m => m.name === member);
  if (!target) { showToast('Member not found', 'error'); return; }

  try {
    await apiPost('/messages/shoutout', { group_id: myGroup.id, member_id: target.id, message: msg });
    closeModal('shoutout-modal');
    showSubPage('chat');
    showToast('Shout-out sent! ' + member + ' will love that 💚', 'success');
    document.getElementById('so-msg').value = '';
  } catch (e) { showToast(e.message, 'error'); }
}

// ====================================================
// CALENDAR
// ====================================================
function renderCalendar() {
  const grid = document.getElementById('calendar-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const emptyHead = document.createElement('div');
  emptyHead.className = 'cal-day-head';
  emptyHead.setAttribute('aria-hidden', 'true');
  grid.appendChild(emptyHead);

  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + calendarWeekOffset * 7);
  const startOfWeek = new Date(baseDate);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);

  days.forEach((d, i) => {
    const cell = document.createElement('div');
    cell.className = 'cal-day-head';
    cell.setAttribute('scope', 'col');
    const dt = new Date(startOfWeek);
    dt.setDate(dt.getDate() + i);
    cell.textContent = d + ' ' + dt.getDate();
    grid.appendChild(cell);
  });

  const endDate = new Date(startOfWeek);
  endDate.setDate(endDate.getDate() + 6);
  document.getElementById('cal-week-label').textContent =
    `Week of ${startOfWeek.getDate()} ${startOfWeek.toLocaleString('default',{month:'short'})} ${startOfWeek.getFullYear()}`;

  hours.forEach(h => {
    const lbl = document.createElement('div');
    lbl.className = 'cal-time-label';
    lbl.textContent = h > 12 ? (h-12) + 'pm' : (h === 12 ? '12pm' : h + 'am');
    lbl.setAttribute('aria-hidden', 'true');
    grid.appendChild(lbl);

    days.forEach((_, di) => {
      const cell = document.createElement('div');
      cell.className = 'cal-cell';
      cell.setAttribute('role', 'button');
      cell.setAttribute('tabindex', '0');
      cell.setAttribute('aria-label', `${days[di]} at ${h > 12 ? (h-12) + 'pm' : h + 'am'} - add event`);
      cell.onclick = () => quickAddSession(di, h);
      cell.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); quickAddSession(di, h); } };

      const event = calendarEvents.find(ev => ev.day === di && ev.hour === h);
      if (event) {
        const evEl = document.createElement('div');
        evEl.className = 'cal-event ' + (event.type || '');
        evEl.textContent = event.label;
        evEl.title = event.label;
        evEl.setAttribute('aria-label', `${event.label} session`);
        cell.appendChild(evEl);
      }
      grid.appendChild(cell);
    });
  });
}

function changeWeek(dir) {
  calendarWeekOffset += dir;
  renderCalendar();
}

function quickAddSession(day, hour) {
  openModal('create-session-modal');
  const timeVal = hour.toString().padStart(2,'0') + ':00';
  const sel = document.getElementById('cs-time');
  if (sel) {
    for (let o of sel.options) {
      if (o.value === timeVal) { o.selected = true; break; }
    }
  }
}

function populateTimeSlots() {
  const sel = document.getElementById('cs-time');
  if (!sel) return;
  sel.innerHTML = '';
  for (let h = 7; h <= 22; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = h.toString().padStart(2,'0');
      const mm = m.toString().padStart(2,'0');
      const ampm = h >= 12 ? 'pm' : 'am';
      const h12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
      const opt = document.createElement('option');
      opt.value = hh + ':' + mm;
      opt.textContent = h12 + ':' + mm + ' ' + ampm;
      sel.appendChild(opt);
    }
  }
}

async function createCalendarSession() {
  const name = document.getElementById('cs-name').value.trim();
  const date = document.getElementById('cs-date').value;
  const time = document.getElementById('cs-time').value;
  const duration = document.getElementById('cs-duration').value;
  const type = document.getElementById('cs-type').value;
  if (!name) { showToast('Please enter a session name!', 'error'); return; }
  if (!myGroup) { showToast('Join a group first!', 'error'); return; }

  try {
    await createSession({
      group_id: myGroup.id,
      name,
      session_date: date,
      session_time: time,
      duration: parseInt(duration),
      type
    });
    closeModal('create-session-modal');
    if (time) {
      const hour = parseInt(time.split(':')[0]);
      calendarEvents.push({ day: new Date(date).getDay() - 1 || 0, hour, label: name, type });
    }
    renderCalendar();
    showToast('Session "' + name + '" scheduled! 📅', 'success');
    document.getElementById('cs-name').value = '';
  } catch (e) { showToast(e.message, 'error'); }
}

// ====================================================
// PROFILE / SETTINGS
// ====================================================
async function toggleDarkMode(checkbox) {
  try {
    await updateSettings({ dark_mode: checkbox.checked });
    if (checkbox.checked) {
      document.documentElement.setAttribute('data-theme', 'dark');
      showToast('Dark mode enabled 🌙', 'info');
    } else {
      document.documentElement.removeAttribute('data-theme');
      showToast('Light mode enabled ☀️', 'info');
    }
  } catch (e) { showToast('Failed to save setting', 'error'); }
}

async function toggleDND(checkbox) {
  try {
    await updateSettings({ dnd: checkbox.checked });
    const banner = document.getElementById('dnd-status');
    if (checkbox.checked) {
      banner.classList.add('show');
      showToast('Do Not Disturb is ON. No notifications will be sent.', 'warning');
    } else {
      banner.classList.remove('show');
      showToast('Do Not Disturb turned off.', 'info');
    }
  } catch (e) { showToast('Failed to save setting', 'error'); }
}

async function saveProfile() {
  const name = document.getElementById('ep-name').value.trim();
  const course = document.getElementById('ep-course').value.trim();
  if (!name) { showToast('Name cannot be empty!', 'error'); return; }

  try {
    await updateProfile({ name, course });
    document.getElementById('profile-name-display').textContent = name;
    document.getElementById('sidebar-name').textContent = name;
    document.getElementById('welcome-name').textContent = name.split(' ')[0];
    document.getElementById('sidebar-avatar').textContent = name[0];
    document.getElementById('profile-avatar').textContent = name[0];
    closeModal('edit-profile-modal');
    showToast('Profile updated successfully!', 'success');
  } catch (e) { showToast(e.message, 'error'); }
}

async function confirmDeleteAccount() {
  const confirm = document.getElementById('da-confirm').value.trim();
  if (confirm !== 'DELETE') { showToast('Type DELETE (in caps) to confirm.', 'error'); return; }
  closeModal('delete-account-modal');
  try {
    await deleteAccount();
    showToast('Account deleted. Goodbye! We\'ll miss you 💙', 'warning');
    setTimeout(() => { showPage('page-auth'); }, 2000);
  } catch (e) { showToast(e.message, 'error'); }
}

async function toggleLeaderboard(checkbox) {
  const lb = document.getElementById('leaderboard');
  lb.classList.toggle('show', checkbox.checked);
  if (checkbox.checked) {
    try {
      const data = await fetchLeaderboard();
      const rows = lb.querySelectorAll('.lb-row');
      (data.leaderboard || []).slice(0, 10).forEach((u, i) => {
        if (rows[i]) {
          const rank = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1);
          rows[i].querySelector('.lb-rank').textContent = rank;
          rows[i].querySelector('.avatar').textContent = u.name[0];
          const nameEl = rows[i].querySelectorAll('span')[1];
          if (nameEl) nameEl.textContent = u.id === currentUser.id ? 'You' : u.name;
          rows[i].querySelector('.lb-hrs').textContent = u.total_hours.toFixed(1) + 'h';
        }
      });
    } catch (e) {}
  }
}

// ====================================================
// MODALS
// ====================================================
function openModal(id) {
  const modal = document.getElementById(id);
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  setTimeout(() => {
    const focusable = modal.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable) focusable.focus();
  }, 100);
}

function closeModal(id) {
  const modal = document.getElementById(id);
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => closeModal(m.id));
  }
});

// ====================================================
// STUDYBOT
// ====================================================
function sendBotMessage() {
  const input = document.getElementById('studybot-input');
  const text = input.value.trim();
  if (!text) return;
  const msgs = document.getElementById('studybot-msgs');
  const userMsg = document.createElement('div');
  userMsg.className = 'user-msg';
  userMsg.textContent = text;
  msgs.appendChild(userMsg);
  input.value = '';

  setTimeout(() => {
    const lower = text.toLowerCase();
    let reply = 'Hmm, I\'m not sure about that one! Try asking about: joining groups, Pomodoro, streaks, badges, scheduling sessions, shout-outs, or dark mode 😊';
    for (const faq of botFAQ) {
      if (faq.q.some(kw => lower.includes(kw))) {
        reply = faq.a;
        break;
      }
    }
    const botMsg = document.createElement('div');
    botMsg.className = 'bot-msg';
    botMsg.innerHTML = reply;
    msgs.appendChild(botMsg);
    msgs.scrollTop = msgs.scrollHeight;
  }, 500);
  msgs.scrollTop = msgs.scrollHeight;
}

// ====================================================
// TOASTS
// ====================================================
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const icons = { success: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info', warning: 'fa-triangle-exclamation' };
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}" aria-hidden="true"></i> ${msg}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 0.4s, transform 0.4s';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100px)';
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

// ====================================================
// CONFETTI
// ====================================================
function fireConfetti() {
  try {
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#2E7D32','#1976D2','#F9A825','#E65100','#ffffff'] });
  } catch(e) {}
}

// ====================================================
// KEYBOARD NAV
// ====================================================
document.querySelectorAll('.chat-room-item').forEach(item => {
  item.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.click(); }
  });
});

// ====================================================
// ADDITIONAL HELPERS
// ====================================================
async function saveAvailability() {
  const availability = Array.from(document.querySelectorAll('#avail-grid input:checked')).map(cb => cb.value);
  try {
    await updateProfile({ name: currentUser.name, course: currentUser.course, availability });
    showToast('Availability updated!', 'success');
  } catch (e) { showToast(e.message, 'error'); }
}

async function leaveCurrentGroup() {
  if (!myGroup) { showToast('You are not in a group', 'error'); return; }
  try {
    await leaveGroup(myGroup.id);
    showToast('You left the group. Hope to see you back soon! 💙', 'warning');
    myGroup = null;
    myGroups = [];
    await loadDiscoveryGroups();
    showSubPage('groups');
  } catch (e) { showToast(e.message, 'error'); }
}

async function markNotificationsRead() {
  try {
    await markAllNotificationsRead();
    showToast('All notifications marked as read', 'success');
  } catch (e) {}
}

async function toggleLeaderboardVisibility(checkbox) {
  try {
    await updateSettings({ show_leaderboard: checkbox.checked });
  } catch (e) {}
}

async function loadNotifications() {
  try {
    const data = await fetchNotifications();
    const list = document.getElementById('notif-list');
    if (!data.notifications || data.notifications.length === 0) {
      list.innerHTML = '<p style="color:var(--text-light);text-align:center">No notifications</p>';
      return;
    }
    list.innerHTML = data.notifications.map(n => `
      <div style="display:flex;gap:12px;align-items:flex-start;padding:10px;background:${n.read ? 'var(--surface2)' : 'var(--green-pale)'};border-radius:var(--radius-sm)">
        <i class="fa-solid ${n.type === 'info' ? 'fa-info-circle' : 'fa-star'}" style="color:var(--green);margin-top:2px" aria-hidden="true"></i>
        <div><strong>${n.title}</strong><br><span style="font-size:0.82rem;color:var(--text-mid)">${n.message}</span></div>
      </div>
    `).join('');
  } catch (e) { console.error('Failed to load notifications:', e); }
}

// ====================================================
// HEARTBEAT
// ====================================================
let heartbeatInterval = null;

function startHeartbeat() {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  sendHeartbeat().catch(() => {});
  heartbeatInterval = setInterval(() => {
    sendHeartbeat().catch(() => {});
  }, 30000);
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// ====================================================
// ADMIN PANEL
// ====================================================
let adminUsersCache = [];
let adminPage = 1;

async function loadAdminUsers(page) {
  adminPage = page || 1;
  try {
    const data = await adminFetchUsers(adminPage, 50);
    adminUsersCache = data.users || [];
    renderAdminUsers(data);
  } catch (e) {
    showToast('Failed to load users: ' + e.message, 'error');
  }
}

function renderAdminUsers(data) {
  const list = document.getElementById('admin-user-list');
  if (!list) return;
  list.innerHTML = '';

  (data.users || []).forEach(u => {
    const row = document.createElement('div');
    row.className = 'admin-user-row';
    const online = u.is_online ? '<span class="online-dot" style="display:inline-block;margin-right:4px"></span>Online' : '<span class="offline-dot" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--text-light);margin-right:4px"></span>Offline';
    row.innerHTML = `
      <div class="admin-user-info">
        <strong>${u.name}</strong>
        <span style="font-size:0.82rem;color:var(--text-light)">${u.email}</span>
        <span style="font-size:0.8rem;color:var(--text-mid)">${u.course || 'No course'} · ${u.study_method}</span>
      </div>
      <div class="admin-user-stats">
        <span>🔥 ${u.streak || 0}</span>
        <span>📚 ${(u.total_hours || 0).toFixed(1)}h</span>
        <span>${online}</span>
        <span style="font-size:0.75rem;color:var(--text-light)">${u.last_seen ? new Date(u.last_seen + 'Z').toLocaleString() : 'Never'}</span>
      </div>
      <div class="admin-user-actions">
        <button class="btn btn-sm btn-secondary" onclick="adminToggleUserOnline('${u.id}')" data-tooltip="Toggle online status"><i class="fa-solid fa-signal"></i></button>
        <button class="btn btn-sm btn-red" onclick="adminDeleteUserConfirm('${u.id}','${u.name}')" data-tooltip="Delete user"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;
    list.appendChild(row);
  });

  const totalPages = Math.ceil((data.total || 0) / 50);
  const pagination = document.getElementById('admin-pagination');
  if (pagination) {
    pagination.innerHTML = '';
    if (adminPage > 1) {
      const prev = document.createElement('button');
      prev.className = 'btn btn-sm btn-secondary';
      prev.innerHTML = '<i class="fa-solid fa-chevron-left"></i> Prev';
      prev.onclick = () => loadAdminUsers(adminPage - 1);
      pagination.appendChild(prev);
    }
    const info = document.createElement('span');
    info.style.cssText = 'font-size:0.85rem;color:var(--text-light);padding:0 12px';
    info.textContent = 'Page ' + adminPage + ' of ' + totalPages + ' (' + data.total + ' users)';
    pagination.appendChild(info);
    if (adminPage < totalPages) {
      const next = document.createElement('button');
      next.className = 'btn btn-sm btn-secondary';
      next.innerHTML = 'Next <i class="fa-solid fa-chevron-right"></i>';
      next.onclick = () => loadAdminUsers(adminPage + 1);
      pagination.appendChild(next);
    }
  }
}

async function adminToggleUserOnline(userId) {
  try {
    await adminToggleOnline(userId);
    showToast('Online status toggled', 'success');
    loadAdminUsers(adminPage);
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function adminCreateUserSubmit() {
  const name = document.getElementById('au-name').value.trim();
  const email = document.getElementById('au-email').value.trim();
  const pass = document.getElementById('au-pass').value;
  const course = document.getElementById('au-course').value.trim();

  if (!name || !email || !pass) {
    showToast('Name, email, and password are required', 'error');
    return;
  }
  if (pass.length < 8) {
    showToast('Password must be at least 8 characters', 'error');
    return;
  }

  try {
    await adminCreateUser({ name, email, password: pass, course });
    closeModal('admin-create-user-modal');
    document.getElementById('au-name').value = '';
    document.getElementById('au-email').value = '';
    document.getElementById('au-pass').value = '';
    document.getElementById('au-course').value = '';
    loadAdminUsers(1);
    showToast('User ' + name + ' created!', 'success');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function adminDeleteUserConfirm(id, name) {
  if (!confirm('Are you sure you want to permanently delete ' + name + '? This cannot be undone.')) return;
  adminDeleteUser(id).then(() => {
    showToast('User ' + name + ' deleted', 'warning');
    loadAdminUsers(adminPage);
  }).catch(e => showToast(e.message, 'error'));
}

// Override modal open to load notifications/admin data
const origOpenModalFn = openModal;
openModal = function(id) {
  if (id === 'notif-modal') loadNotifications();
  if (id === 'admin-modal') loadAdminUsers(1);
  origOpenModalFn(id);
};

// ====================================================
// INIT ON LOAD
// ====================================================
window.addEventListener('DOMContentLoaded', () => {
  const savedToken = localStorage.getItem('ss_token');
  if (savedToken && currentUser) {
    showPage('page-app');
    initApp();
  }
  const today = new Date().toISOString().split('T')[0];
  const csDate = document.getElementById('cs-date');
  if (csDate) csDate.value = today;
});
