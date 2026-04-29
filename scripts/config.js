// SECTION: FIREBASE AND GOOGLE SHEET CONFIGURATION

const firebaseConfig = {
    apiKey: "AIzaSyBhwDfRQLphl_0Lk8pQDZQ3jO8pr795aqU",
    authDomain: "lasernorthconsole-32295.firebaseapp.com",
    projectId: "lasernorthconsole-32295",
    storageBucket: "lasernorthconsole-32295.firebasestorage.app",
    messagingSenderId: "1025143824511",
    appId: "1:1025143824511:web:1d74f15c191ee78a3b5f4a"
};

// Initialize Firebase services
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore(); // Needed for the Dashboard summary counts

const SHEET_CONFIG = {
    IDS: {
        FULL_SHEET: '1kG_fjYX4Vc0D8qId4yaHEgJZl5xJ-9Y1MaIo549a_l8',
        // Updated keys to match the fetching logic in structural.js
        BEAMS: 'YOUR_BEAMS_SHEET_ID', 
        TUBING: 'YOUR_TUBING_SHEET_ID'
    },
    // The backend URL for the Google Apps Script
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxsEIqi6_gjzCMTJCvb56uqebBoWF1DgLBmUZi_qvLVm4CUfarR_xybWM_voLANgsWupw/exec',
    getReadUrl: (id, gid=0) => `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${gid}`
};

// SECTION: LOGOUT HELPER
async function logoutUser() {
    await auth.signOut();
    window.location.href = "../index.html";
}