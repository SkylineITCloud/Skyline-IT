const API_BASE = '/api/studysync';

let authToken = localStorage.getItem('ss_token');
let currentUser = JSON.parse(localStorage.getItem('ss_user') || 'null');

function setAuth(token, user) {
  authToken = token;
  currentUser = user;
  if (token) localStorage.setItem('ss_token', token);
  else localStorage.removeItem('ss_token');
  if (user) localStorage.setItem('ss_user', JSON.stringify(user));
  else localStorage.removeItem('ss_user');
}

async function apiRequest(method, path, body) {
  const url = API_BASE + path;
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = 'Bearer ' + authToken;

  const opts = { method, headers };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

function apiGet(path) { return apiRequest('GET', path); }
function apiPost(path, body) { return apiRequest('POST', path, body); }
function apiPut(path, body) { return apiRequest('PUT', path, body); }
function apiDelete(path) { return apiRequest('DELETE', path); }

// Auth
async function login(email, password) {
  const data = await apiPost('/auth/login', { email, password });
  setAuth(data.token, data.user);
  return data.user;
}

async function register(name, email, password, course, study_method, availability) {
  const data = await apiPost('/auth/register', { name, email, password, course, study_method, availability });
  setAuth(data.token, data.user);
  return data.user;
}

async function logout() {
  setAuth(null, null);
}

async function fetchMe() {
  const data = await apiGet('/auth/me');
  currentUser = data.user;
  localStorage.setItem('ss_user', JSON.stringify(data.user));
  return data.user;
}

// Groups
async function fetchGroups(params) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiGet('/groups' + qs);
}

async function fetchMyGroups() {
  return apiGet('/groups/mine');
}

async function fetchGroup(id) {
  return apiGet('/groups/' + id);
}

async function createGroup(data) {
  return apiPost('/groups', data);
}

async function joinGroup(id) {
  return apiPost('/groups/' + id + '/join');
}

async function leaveGroup(id) {
  return apiPost('/groups/' + id + '/leave');
}

// Sessions
async function fetchSessions(groupId) {
  const qs = groupId ? '?group_id=' + groupId : '';
  return apiGet('/sessions' + qs);
}

async function createSession(data) {
  return apiPost('/sessions', data);
}

async function attendSession(id) {
  return apiPost('/sessions/' + id + '/attend');
}

// Tasks
async function fetchTasks(groupId) {
  const qs = groupId ? '?group_id=' + groupId : '';
  return apiGet('/tasks' + qs);
}

async function createTask(data) {
  return apiPost('/tasks', data);
}

async function updateTask(id, data) {
  return apiPut('/tasks/' + id, data);
}

async function deleteTask(id) {
  return apiDelete('/tasks/' + id);
}

// Messages
async function fetchMessages(groupId) {
  return apiGet('/messages?group_id=' + groupId);
}

async function sendMessage(groupId, content) {
  return apiPost('/messages', { group_id: groupId, content });
}

async function sendShoutout(groupId, memberId, message) {
  return apiPost('/messages/shoutout', { group_id: groupId, member_id: memberId, message });
}

// Pomodoro
async function completePomodoro(duration) {
  return apiPost('/pomodoro/complete', { duration });
}

async function fetchPomodoroStats() {
  return apiGet('/pomodoro/stats');
}

// Notifications
async function fetchNotifications() {
  return apiGet('/notifications');
}

async function markNotificationRead(id) {
  return apiPut('/notifications/' + id + '/read');
}

async function markAllNotificationsRead() {
  return apiPut('/notifications/read-all');
}

// User
async function updateProfile(data) {
  const result = await apiPut('/users/profile', data);
  currentUser = result.user;
  localStorage.setItem('ss_user', JSON.stringify(result.user));
  return result.user;
}

async function updateSettings(data) {
  const result = await apiPut('/users/settings', data);
  currentUser = result.user;
  localStorage.setItem('ss_user', JSON.stringify(result.user));
  return result.user;
}

async function fetchLeaderboard() {
  return apiGet('/users/leaderboard');
}

async function deleteAccount() {
  const result = await apiDelete('/users/account');
  setAuth(null, null);
  return result;
}

// Heartbeat
async function sendHeartbeat() {
  return apiPost('/users/heartbeat');
}

// Admin
async function adminFetchUsers(page, limit) {
  const qs = '?' + new URLSearchParams({ page: page || 1, limit: limit || 50 }).toString();
  return apiGet('/admin/users' + qs);
}

async function adminCreateUser(data) {
  return apiPost('/admin/users', data);
}

async function adminToggleOnline(userId) {
  return apiPut('/admin/users/' + userId + '/toggle-online');
}

async function adminDeleteUser(userId) {
  return apiDelete('/admin/users/' + userId);
}
