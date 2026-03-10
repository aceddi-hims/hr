import { auth, db } from './firebase-config.js';
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { collection, addDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

let currentUser = null;

// Check authentication
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        loadUserProfile();
        loadLeaves();
    } else {
        window.location.href = 'index.html';
    }
});

// Load user profile
async function loadUserProfile() {
    const q = query(collection(db, "users"), where("uid", "==", currentUser.uid));
    const querySnapshot = await getDocs(q);
    
    querySnapshot.forEach((doc) => {
        const userData = doc.data();
        document.getElementById('userName').textContent = userData.name;
        document.getElementById('profileUserId').textContent = userData.userId;
        document.getElementById('profileName').textContent = userData.name;
        document.getElementById('profileDept').textContent = userData.department;
        document.getElementById('profileEmail').textContent = userData.email;
    });
}

// Submit leave request
document.getElementById('leaveForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const leaveType = document.getElementById('leaveType').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const reason = document.getElementById('reason').value;

    try {
        await addDoc(collection(db, "leaves"), {
            uid: currentUser.uid,
            leaveType: leaveType,
            startDate: startDate,
            endDate: endDate,
            reason: reason,
            status: "pending",
            createdAt: new Date()
        });
        
        alert('Leave request submitted successfully!');
        document.getElementById('leaveForm').reset();
        loadLeaves();
    } catch (error) {
        console.error('Error submitting leave:', error);
        alert('Error submitting leave: ' + error.message);
    }
});

// Load leaves
async function loadLeaves() {
    const q = query(collection(db, "leaves"), where("uid", "==", currentUser.uid));
    const querySnapshot = await getDocs(q);
    
    const leavesList = document.getElementById('leavesList');
    leavesList.innerHTML = '';
    
    let pending = 0, approved = 0, rejected = 0;
    
    querySnapshot.forEach((doc) => {
        const leave = doc.data();
        const leaveCard = document.createElement('div');
        leaveCard.className = `leave-card status-${leave.status}`;
        leaveCard.innerHTML = `
            <h3>${leave.leaveType.toUpperCase()}</h3>
            <p><strong>From:</strong> ${leave.startDate} <strong>To:</strong> ${leave.endDate}</p>
            <p><strong>Reason:</strong> ${leave.reason}</p>
            <p class="status"><strong>Status:</strong> <span class="badge badge-${leave.status}">${leave.status.toUpperCase()}</span></p>
        `;
        leavesList.appendChild(leaveCard);
        
        if (leave.status === 'pending') pending++;
        if (leave.status === 'approved') approved++;
        if (leave.status === 'rejected') rejected++;
    });
    
    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('approvedCount').textContent = approved;
    document.getElementById('rejectedCount').textContent = rejected;
}

// Navigation
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        if (link.id !== 'logout') {
            e.preventDefault();
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            
            const sectionId = link.getAttribute('href').substring(1);
            document.getElementById(sectionId).classList.add('active');
            link.classList.add('active');
        }
    });
});

// Logout
document.getElementById('logout').addEventListener('click', async (e) => {
    e.preventDefault();
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error logging out:', error);
    }
});
