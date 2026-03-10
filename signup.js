import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const userId = document.getElementById('userId').value;
    const name = document.getElementById('name').value;
    const department = document.getElementById('department').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Save user data to Firestore
        await addDoc(collection(db, "users"), {
            uid: user.uid,
            userId: userId,
            name: name,
            department: department,
            email: email,
            role: "employee",
            createdAt: new Date()
        });

        alert('Account created successfully!');
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error creating account:', error.message);
        alert('Sign up failed: ' + error.message);
    }
});
