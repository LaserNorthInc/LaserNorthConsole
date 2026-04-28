// scripts/config.js

// 1. Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBhwDfRQLphl_0Lk8pQDZQ3jO8pr795aqU",
  authDomain: "lasernorthconsole-32295.firebaseapp.com",
  projectId: "lasernorthconsole-32295",
  storageBucket: "lasernorthconsole-32295.firebasestorage.app",
  messagingSenderId: "1025143824511",
  appId: "1:1025143824511:web:1d74f15c191ee78a3b5f4a"
};

// 2. Initialize Firebase globally
// The 'firebase' object is provided by the -compat.js script in your HTML
firebase.initializeApp(firebaseConfig);

// 3. Set up easy references for other scripts to use
const auth = firebase.auth();
const db = firebase.firestore();

// 4. Logout function (Non-modular version)
async function logoutUser() {
    try {
        await auth.signOut();
        window.location.href = "../pages/login.html";
    } catch (error) {
        console.error("Error signing out:", error);
    }
}