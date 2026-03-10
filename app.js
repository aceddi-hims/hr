// ACEDDI HR WebApp - Frontend only, localStorage-based
// Roles: admin, employee
// Default admin: userId "admin", password "admin123"

const STORAGE_KEYS = {
  USERS: 'aceddi_hr_users',
  LEAVES: 'aceddi_hr_leaves',
  NOTIFICATIONS: 'aceddi_hr_notifications'
};

let currentUser = null;

// ---- Storage helpers ----
function loadFromStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadUsers() {
  return loadFromStorage(STORAGE_KEYS.USERS);
}

function saveUsers(users) {
  saveToStorage(STORAGE_KEYS.USERS, users);
}

function loadLeaves() {
  return loadFromStorage(STORAGE_KEYS.LEAVES);
}

function saveLeaves(leaves) {
  saveToStorage(STORAGE_KEYS.LEAVES, leaves);
}

function loadNotifications() {
  return loadFromStorage(STORAGE_KEYS.NOTIFICATIONS);
}

function saveNotifications(notifs) {
  saveToStorage(STORAGE_KEYS.NOTIFICATIONS, notifs);
}

// ---- Utility ----
function ensureDefaultAdmin() {
  let users = loadUsers();
  const hasAdmin = users.some(u => u.role === 'admin');
  if (!hasAdmin) {
    users.push({
      id: 'admin',
      name: 'HR Admin',
      department: 'HR',
      password: 'admin123',
      role: 'admin'
    });
    saveUsers(users);
  }
}

function generateId(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

function showSection(sectionId) {
  const sections = ['login-section', 'register-section', 'employee-section', 'admin-section'];
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === sectionId) el.classList.remove('hidden');
    else el.classList.add('hidden');
  });
}

function setMessage(elementId, text, type) {
  const el = document.getElementById(elementId);
  if (!el) return;
  if (!text) {
    el.classList.add('hidden');
    el.textContent = '';
    el.classList.remove('message-error', 'message-success');
    return;
  }
  el.textContent = text;
  el.classList.remove('hidden', 'message-error', 'message-success');
  if (type === 'error') el.classList.add('message-error');
  else if (type === 'success') el.classList.add('message-success');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString();
}

function formatDateTime(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString();
}

function statusBadge(status) {
  const st = (status || '').toLowerCase();
  let cls = 'badge-pending';
  let label = 'PENDING';
  if (st === 'approved') {
    cls = 'badge-approved';
    label = 'APPROVED';
  } else if (st === 'rejected') {
    cls = 'badge-rejected';
    label = 'REJECTED';
  }
  return '<span class="badge ' + cls + '">' + label + '</span>';
}

// ---- Auth & navigation ----
function handleLogin(event) {
  event.preventDefault();
  const userId = document.getElementById('loginUserId').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!userId || !password) {
    setMessage('login-message', 'Please enter both User ID and Password.', 'error');
    return;
  }

  const users = loadUsers();
  const user = users.find(u => u.id === userId && u.password === password);

  if (!user) {
    setMessage('login-message', 'Invalid credentials. Please try again.', 'error');
    return;
  }

  currentUser = user;
  document.getElementById('loginUserId').value = '';
  document.getElementById('loginPassword').value = '';
  setMessage('login-message', '', '');

  if (user.role === 'admin') {
    enterAdminDashboard();
  } else {
    enterEmployeeDashboard();
  }
}

function handleRegister(event) {
  event.preventDefault();
  const userId = document.getElementById('registerUserId').value.trim();
  const name = document.getElementById('registerName').value.trim();
  const department = document.getElementById('registerDepartment').value.trim();
  const password = document.getElementById('registerPassword').value;
  const confirm = document.getElementById('registerConfirmPassword').value;

  if (!userId || !name || !department || !password || !confirm) {
    setMessage('register-message', 'All fields are required.', 'error');
    return;
  }

  if (password !== confirm) {
    setMessage('register-message', 'Passwords do not match.', 'error');
    return;
  }

  let users = loadUsers();
  const exists = users.some(u => u.id === userId);
  if (exists) {
    setMessage('register-message', 'User ID already exists. Choose another.', 'error');
    return;
  }

  users.push({
    id: userId,
    name: name,
    department: department,
    password: password,
    role: 'employee'
  });
  saveUsers(users);

  document.getElementById('register-form').reset();
  setMessage('register-message', 'Account created successfully. You can now log in.', 'success');

  setTimeout(function () {
    showSection('login-section');
    setMessage('register-message', '', '');
  }, 1200);
}

function enterEmployeeDashboard() {
  if (!currentUser) return;
  showSection('employee-section');
  const welcome = currentUser.name
    ? currentUser.name + ' (' + currentUser.department + ')'
    : currentUser.id;
  document.getElementById('employee-welcome').textContent = 'EMPLOYEE: ' + welcome.toUpperCase();
  document.getElementById('leave-form').reset();
  setMessage('leave-message', '', '');
  renderEmployeeLeaves();
  renderEmployeeNotifications();
}

function enterAdminDashboard() {
  if (!currentUser) return;
  showSection('admin-section');
  const label = currentUser.name ? currentUser.name : currentUser.id;
  document.getElementById('admin-welcome').textContent = 'ADMIN: ' + label.toUpperCase();
  renderAdminUsers();
  renderAdminLeaves();
  populateNotificationEmployeeSelect();
  setMessage('admin-users-message', '', '');
  setMessage('notification-message', '', '');
}

// ---- Employee leave & notifications ----
function handleLeaveSubmit(event) {
  event.preventDefault();
  if (!currentUser || currentUser.role !== 'employee') {
    setMessage('leave-message', 'You must be logged in as an employee.', 'error');
    return;
  }

  const type = document.getElementById('leaveType').value;
  const start = document.getElementById('leaveStart').value;
  const end = document.getElementById('leaveEnd').value;
  const reason = document.getElementById('leaveReason').value.trim();

  if (!type || !start || !end || !reason) {
    setMessage('leave-message', 'Please complete all fields.', 'error');
    return;
  }

  if (new Date(end) < new Date(start)) {
    setMessage('leave-message', 'End date cannot be before start date.', 'error');
    return;
  }

  const leaves = loadLeaves();
  leaves.push({
    id: generateId('leave'),
    employeeId: currentUser.id,
    type: type,
    startDate: start,
    endDate: end,
    reason: reason,
    status: 'Pending',
    createdAt: Date.now()
  });
  saveLeaves(leaves);

  document.getElementById('leave-form').reset();
  setMessage('leave-message', 'Leave request submitted successfully.', 'success');
  renderEmployeeLeaves();
}

function renderEmployeeLeaves() {
  if (!currentUser) return;
  const tbody = document.getElementById('employee-leaves-table-body');
  tbody.innerHTML = '';
  const allLeaves = loadLeaves();
  const myLeaves = allLeaves
    .filter(l => l.employeeId === currentUser.id)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  if (myLeaves.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 5;
    td.textContent = 'No leave applications yet.';
    td.className = 'helper-text';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  myLeaves.forEach(l => {
    const tr = document.createElement('tr');

    const typeTd = document.createElement('td');
    typeTd.textContent = l.type || '';
    tr.appendChild(typeTd);

    const periodTd = document.createElement('td');
    periodTd.textContent = formatDate(l.startDate) + ' \u2192 ' + formatDate(l.endDate);
    tr.appendChild(periodTd);

    const reasonTd = document.createElement('td');
    reasonTd.textContent = l.reason || '';
    tr.appendChild(reasonTd);

    const statusTd = document.createElement('td');
    statusTd.innerHTML = statusBadge(l.status);
    tr.appendChild(statusTd);

    const submittedTd = document.createElement('td');
    submittedTd.textContent = l.createdAt ? formatDateTime(l.createdAt) : '';
    tr.appendChild(submittedTd);

    tbody.appendChild(tr);
  });
}

function renderEmployeeNotifications() {
  if (!currentUser) return;
  const listEl = document.getElementById('employee-notifications-list');
  const emptyEl = document.getElementById('employee-no-notifications');
  listEl.innerHTML = '';

  const allNotifs = loadNotifications();
  const myNotifs = allNotifs
    .filter(n => n.employeeId === currentUser.id)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  if (myNotifs.length === 0) {
    emptyEl.classList.remove('hidden');
    emptyEl.textContent = 'No notifications from HR yet.';
    return;
  }
  emptyEl.classList.add('hidden');

  myNotifs.forEach(n => {
    const li = document.createElement('li');
    li.className = 'notification-item';

    const msg = document.createElement('div');
    msg.textContent = n.message || '';
    li.appendChild(msg);

    const meta = document.createElement('div');
    meta.className = 'notification-meta';
    meta.textContent = 'From HR • ' + formatDateTime(n.createdAt);
    li.appendChild(meta);

    listEl.appendChild(li);
  });
}

// ---- Admin: users ----
function renderAdminUsers() {
  const tbody = document.getElementById('admin-users-table-body');
  tbody.innerHTML = '';
  const users = loadUsers().sort((a, b) => {
    if (a.role === b.role) return a.id.localeCompare(b.id);
    return a.role === 'admin' ? -1 : 1;
  });

  if (users.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 6;
    td.textContent = 'No users found.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  users.forEach(u => {
    const tr = document.createElement('tr');

    const idTd = document.createElement('td');
    idTd.textContent = u.id;
    tr.appendChild(idTd);

    const nameTd = document.createElement('td');
    nameTd.textContent = u.name || '';
    tr.appendChild(nameTd);

    const deptTd = document.createElement('td');
    deptTd.textContent = u.department || '';
    tr.appendChild(deptTd);

    const roleTd = document.createElement('td');
    const span = document.createElement('span');
    span.className = u.role === 'admin' ? 'role-tag-admin' : 'role-tag-employee';
    span.textContent = u.role.toUpperCase();
    roleTd.appendChild(span);
    tr.appendChild(roleTd);

    const inputTd = document.createElement('td');
    const input = document.createElement('input');
    input.type = 'password';
    input.placeholder = 'New password';
    inputTd.appendChild(input);
    tr.appendChild(inputTd);

    const actionTd = document.createElement('td');
    const btn = document.createElement('button');
    btn.textContent = 'Update';
    btn.className = 'btn-secondary btn-small';
    btn.addEventListener('click', function () {
      const newPass = input.value;
      if (!newPass) {
        setMessage('admin-users-message', 'Please enter a new password for ' + u.id + '.', 'error');
        return;
      }
      updateUserPassword(u.id, newPass);
      input.value = '';
      setMessage('admin-users-message', 'Password updated for ' + u.id + '.', 'success');
    });
    actionTd.appendChild(btn);
    tr.appendChild(actionTd);

    tbody.appendChild(tr);
  });
}

function updateUserPassword(userId, newPassword) {
  let users = loadUsers();
  users = users.map(u => {
    if (u.id === userId) {
      return { ...u, password: newPassword };
    }
    return u;
  });
  saveUsers(users);

  if (currentUser && currentUser.id === userId) {
    currentUser.password = newPassword;
  }
}

// ---- Admin: leaves ----
function renderAdminLeaves() {
  const tbody = document.getElementById('admin-leaves-table-body');
  tbody.innerHTML = '';
  const leaves = loadLeaves().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  if (leaves.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 6;
    td.textContent = 'No leave applications submitted yet.';
    td.className = 'helper-text';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  leaves.forEach(l => {
    const tr = document.createElement('tr');

    const empTd = document.createElement('td');
    empTd.textContent = l.employeeId || '';
    tr.appendChild(empTd);

    const typeTd = document.createElement('td');
    typeTd.textContent = l.type || '';
    tr.appendChild(typeTd);

    const periodTd = document.createElement('td');
    periodTd.textContent = formatDate(l.startDate) + ' \u2192 ' + formatDate(l.endDate);
    tr.appendChild(periodTd);

    const reasonTd = document.createElement('td');
    reasonTd.textContent = l.reason || '';
    tr.appendChild(reasonTd);

    const statusTd = document.createElement('td');
    statusTd.innerHTML = statusBadge(l.status);
    tr.appendChild(statusTd);

    const actionTd = document.createElement('td');
    const select = document.createElement('select');
    ['Pending', 'Approved', 'Rejected'].forEach(opt => {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt;
      if ((l.status || 'Pending') === opt) o.selected = true;
      select.appendChild(o);
    });
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.className = 'btn-secondary btn-small';
    saveBtn.style.marginLeft = '6px';
    saveBtn.addEventListener('click', function () {
      updateLeaveStatus(l.id, select.value);
    });
    actionTd.appendChild(select);
    actionTd.appendChild(saveBtn);
    tr.appendChild(actionTd);

    tbody.appendChild(tr);
  });
}

function updateLeaveStatus(leaveId, newStatus) {
  let leaves = loadLeaves();
  leaves = leaves.map(l => {
    if (l.id === leaveId) {
      return { ...l, status: newStatus };
    }
    return l;
  });
  saveLeaves(leaves);
  renderAdminLeaves();
  if (currentUser && currentUser.role === 'employee') {
    renderEmployeeLeaves();
  }
}

// ---- Admin: notifications ----
function populateNotificationEmployeeSelect() {
  const select = document.getElementById('notificationUserSelect');
  select.innerHTML = '';
  const employees = loadUsers().filter(u => u.role === 'employee');

  if (employees.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No employees found';
    select.appendChild(opt);
    select.disabled = true;
    return;
  }

  select.disabled = false;
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Select employee...';
  select.appendChild(placeholder);

  employees.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = u.id + ' - ' + (u.name || '');
    select.appendChild(opt);
  });
}

function handleNotificationSubmit(event) {
  event.preventDefault();
  const userId = document.getElementById('notificationUserSelect').value;
  const messageText = document.getElementById('notificationMessage').value.trim();

  if (!userId) {
    setMessage('notification-message', 'Please select an employee.', 'error');
    return;
  }
  if (!messageText) {
    setMessage('notification-message', 'Please enter a message.', 'error');
    return;
  }

  const notifications = loadNotifications();
  notifications.push({
    id: generateId('notif'),
    employeeId: userId,
    message: messageText,
    createdAt: Date.now()
  });
  saveNotifications(notifications);

  document.getElementById('notification-form').reset();
  populateNotificationEmployeeSelect();
  setMessage('notification-message', 'Notification sent to ' + userId + '.', 'success');

  if (currentUser && currentUser.role === 'employee' && currentUser.id === userId) {
    renderEmployeeNotifications();
  }
}

// ---- Event hooks ----
function setupEventListeners() {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const leaveForm = document.getElementById('leave-form');
  const notifForm = document.getElementById('notification-form');
  const goToRegisterBtn = document.getElementById('go-to-register');
  const backToLoginBtn = document.getElementById('back-to-login');
  const employeeLogoutBtn = document.getElementById('employee-logout-btn');
  const adminLogoutBtn = document.getElementById('admin-logout-btn');

  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (registerForm) registerForm.addEventListener('submit', handleRegister);
  if (leaveForm) leaveForm.addEventListener('submit', handleLeaveSubmit);
  if (notifForm) notifForm.addEventListener('submit', handleNotificationSubmit);

  if (goToRegisterBtn) {
    goToRegisterBtn.addEventListener('click', function () {
      showSection('register-section');
      setMessage('register-message', '', '');
      setMessage('login-message', '', '');
    });
  }

  if (backToLoginBtn) {
    backToLoginBtn.addEventListener('click', function () {
      showSection('login-section');
      setMessage('register-message', '', '');
    });
  }

  if (employeeLogoutBtn) {
    employeeLogoutBtn.addEventListener('click', function () {
      currentUser = null;
      showSection('login-section');
    });
  }

  if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener('click', function () {
      currentUser = null;
      showSection('login-section');
    });
  }
}

document.addEventListener('DOMContentLoaded', function () {
  ensureDefaultAdmin();
  setupEventListeners();
  showSection('login-section');
});

