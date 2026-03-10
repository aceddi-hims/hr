// ACEDDI HR WebApp - Firebase (shared online database)
// Roles: admin, employee
// Default admin: userId "admin", password "admin123"

let currentUser = null;
let db = null;

// ---- Firebase setup ----
// 1) Go to Firebase console and create a project.
// 2) Add a Web App and copy the "firebaseConfig" object.
// 3) Paste your values below, replacing the placeholders.
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDAXPQjKQ9S2f_iKzEhHYiEfRmaKHoczMI",
  authDomain: "aceddi-hr.firebaseapp.com",
  projectId: "aceddi-hr",
  storageBucket: "aceddi-hr.firebasestorage.app",
  messagingSenderId: "1012480513897",
  appId: "1:1012480513897:web:c358906a4553de0642cff8",
  measurementId: "G-KVE1FL4M2G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
};

function initFirebase() {
  if (!firebaseConfig || !firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY") {
    console.warn("Firebase is not configured yet. Please paste your firebaseConfig values in app.js.");
    return;
  }
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  db = firebase.firestore();
}

// ---- Utility helpers ----
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

// ---- Firestore helpers ----
async function ensureDefaultAdmin() {
  if (!db) return;
  const docRef = db.collection('users').doc('admin');
  const snap = await docRef.get();
  if (!snap.exists) {
    await docRef.set({
      name: 'HR Admin',
      department: 'HR',
      password: 'admin123',
      role: 'admin'
    });
  }
}

async function getUserById(userId) {
  if (!db) return null;
  const docRef = db.collection('users').doc(userId);
  const snap = await docRef.get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

async function getAllUsers() {
  if (!db) return [];
  const snap = await db.collection('users').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function createUser(user) {
  if (!db) return;
  const { id, ...rest } = user;
  await db.collection('users').doc(id).set(rest);
}

async function updateUserPassword(userId, newPassword) {
  if (!db) return;
  await db.collection('users').doc(userId).update({ password: newPassword });
  if (currentUser && currentUser.id === userId) {
    currentUser.password = newPassword;
  }
}

async function createLeave(leave) {
  if (!db) return;
  await db.collection('leaves').add(leave);
}

async function getLeavesForEmployee(employeeId) {
  if (!db) return [];
  const snap = await db
    .collection('leaves')
    .where('employeeId', '==', employeeId)
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function getAllLeaves() {
  if (!db) return [];
  const snap = await db
    .collection('leaves')
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function updateLeaveStatus(leaveId, newStatus) {
  if (!db) return;
  await db.collection('leaves').doc(leaveId).update({ status: newStatus });
}

async function createNotification(notification) {
  if (!db) return;
  await db.collection('notifications').add(notification);
}

async function getNotificationsForEmployee(employeeId) {
  if (!db) return [];
  const snap = await db
    .collection('notifications')
    .where('employeeId', '==', employeeId)
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ---- Auth & navigation ----
async function handleLogin(event) {
  event.preventDefault();
  if (!db) {
    setMessage('login-message', 'Database not ready. Please configure Firebase in app.js.', 'error');
    return;
  }

  const userId = document.getElementById('loginUserId').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!userId || !password) {
    setMessage('login-message', 'Please enter both User ID and Password.', 'error');
    return;
  }

  try {
    const user = await getUserById(userId);
    if (!user || user.password !== password) {
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
  } catch (err) {
    console.error(err);
    setMessage('login-message', 'Error connecting to database.', 'error');
  }
}

async function handleRegister(event) {
  event.preventDefault();
  if (!db) {
    setMessage('register-message', 'Database not ready. Please configure Firebase in app.js.', 'error');
    return;
  }

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

  try {
    const existing = await getUserById(userId);
    if (existing) {
      setMessage('register-message', 'User ID already exists. Choose another.', 'error');
      return;
    }

    await createUser({
      id: userId,
      name: name,
      department: department,
      password: password,
      role: 'employee'
    });

    document.getElementById('register-form').reset();
    setMessage('register-message', 'Account created successfully. You can now log in.', 'success');

    setTimeout(function () {
      showSection('login-section');
      setMessage('register-message', '', '');
    }, 1200);
  } catch (err) {
    console.error(err);
    setMessage('register-message', 'Error saving to database.', 'error');
  }
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
async function handleLeaveSubmit(event) {
  event.preventDefault();
  if (!db) {
    setMessage('leave-message', 'Database not ready. Please configure Firebase in app.js.', 'error');
    return;
  }

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

  try {
    await createLeave({
      employeeId: currentUser.id,
      type: type,
      startDate: start,
      endDate: end,
      reason: reason,
      status: 'Pending',
      createdAt: Date.now()
    });

    document.getElementById('leave-form').reset();
    setMessage('leave-message', 'Leave request submitted successfully.', 'success');
    renderEmployeeLeaves();
  } catch (err) {
    console.error(err);
    setMessage('leave-message', 'Error saving to database.', 'error');
  }
}

async function renderEmployeeLeaves() {
  if (!currentUser || !db) return;
  const tbody = document.getElementById('employee-leaves-table-body');
  tbody.innerHTML = '';

  try {
    const myLeaves = await getLeavesForEmployee(currentUser.id);

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
  } catch (err) {
    console.error(err);
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 5;
    td.textContent = 'Error loading leaves.';
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
}

async function renderEmployeeNotifications() {
  if (!currentUser || !db) return;
  const listEl = document.getElementById('employee-notifications-list');
  const emptyEl = document.getElementById('employee-no-notifications');
  listEl.innerHTML = '';

  try {
    const myNotifs = await getNotificationsForEmployee(currentUser.id);

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
  } catch (err) {
    console.error(err);
    emptyEl.classList.remove('hidden');
    emptyEl.textContent = 'Error loading notifications.';
  }
}

// ---- Admin: users ----
async function renderAdminUsers() {
  if (!db) return;
  const tbody = document.getElementById('admin-users-table-body');
  tbody.innerHTML = '';

  try {
    const users = (await getAllUsers()).sort((a, b) => {
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
      btn.addEventListener('click', async function () {
        const newPass = input.value;
        if (!newPass) {
          setMessage('admin-users-message', 'Please enter a new password for ' + u.id + '.', 'error');
          return;
        }
        try {
          await updateUserPassword(u.id, newPass);
          input.value = '';
          setMessage('admin-users-message', 'Password updated for ' + u.id + '.', 'success');
        } catch (err) {
          console.error(err);
          setMessage('admin-users-message', 'Error updating password.', 'error');
        }
      });
      actionTd.appendChild(btn);
      tr.appendChild(actionTd);

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 6;
    td.textContent = 'Error loading users.';
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
}

// ---- Admin: leaves ----
async function renderAdminLeaves() {
  if (!db) return;
  const tbody = document.getElementById('admin-leaves-table-body');
  tbody.innerHTML = '';

  try {
    const leaves = await getAllLeaves();

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
      saveBtn.addEventListener('click', async function () {
        try {
          await updateLeaveStatus(l.id, select.value);
          renderAdminLeaves();
          if (currentUser && currentUser.role === 'employee') {
            renderEmployeeLeaves();
          }
        } catch (err) {
          console.error(err);
          alert('Error updating status.');
        }
      });
      actionTd.appendChild(select);
      actionTd.appendChild(saveBtn);
      tr.appendChild(actionTd);

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 6;
    td.textContent = 'Error loading leaves.';
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
}

// ---- Admin: notifications ----
async function populateNotificationEmployeeSelect() {
  if (!db) return;
  const select = document.getElementById('notificationUserSelect');
  select.innerHTML = '';

  try {
    const users = await getAllUsers();
    const employees = users.filter(u => u.role === 'employee');

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
  } catch (err) {
    console.error(err);
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'Error loading employees';
    select.appendChild(opt);
    select.disabled = true;
  }
}

async function handleNotificationSubmit(event) {
  event.preventDefault();
  if (!db) {
    setMessage('notification-message', 'Database not ready. Please configure Firebase in app.js.', 'error');
    return;
  }

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

  try {
    await createNotification({
      employeeId: userId,
      message: messageText,
      createdAt: Date.now()
    });

    document.getElementById('notification-form').reset();
    populateNotificationEmployeeSelect();
    setMessage('notification-message', 'Notification sent to ' + userId + '.', 'success');

    if (currentUser && currentUser.role === 'employee' && currentUser.id === userId) {
      renderEmployeeNotifications();
    }
  } catch (err) {
    console.error(err);
    setMessage('notification-message', 'Error saving notification.', 'error');
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

  if (loginForm) loginForm.addEventListener('submit', function (e) { handleLogin(e); });
  if (registerForm) registerForm.addEventListener('submit', function (e) { handleRegister(e); });
  if (leaveForm) leaveForm.addEventListener('submit', function (e) { handleLeaveSubmit(e); });
  if (notifForm) notifForm.addEventListener('submit', function (e) { handleNotificationSubmit(e); });

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

document.addEventListener('DOMContentLoaded', async function () {
  initFirebase();
  if (db) {
    try {
      await ensureDefaultAdmin();
    } catch (err) {
      console.error('Error ensuring default admin', err);
    }
  }
  setupEventListeners();
  showSection('login-section');
});

