const firebaseConfig = {
    apiKey: "AIzaSyBhwDfRQLphl_0Lk8pQDZQ3jO8pr795aqU",
    authDomain: "lasernorthconsole-32295.firebaseapp.com",
    projectId: "lasernorthconsole-32295",
    storageBucket: "lasernorthconsole-32295.firebasestorage.app",
    messagingSenderId: "1025143824511",
    appId: "1:1025143824511:web:1d74f15c191ee78a3b5f4a"
};

// Initialize Firebase globally
firebase.initializeApp(firebaseConfig);

// Global references for other scripts
const auth = firebase.auth();
const db = firebase.firestore();

async function logoutUser() {
    await auth.signOut();
    window.location.href = "login.html";
}