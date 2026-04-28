// CONFIGURATION & INITIALIZATION
const firebaseConfig = {
  apiKey: "AIzaSyBhwDfRQLphl_0Lk8pQDZQ3jO8pr795aqU",
  authDomain: "lasernorthconsole-32295.firebaseapp.com",
  projectId: "lasernorthconsole-32295",
  storageBucket: "lasernorthconsole-32295.firebasestorage.app",
  messagingSenderId: "1025143824511",
  appId: "1:1025143824511:web:1d74f15c191ee78a3b5f4a"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore(); // Just in case you use it for user profiles

// scripts/config.js (Updated)
const SHEET_CONFIG = {
    IDS: {
        FULL_SHEET: 'ID_1',
        FULL_STRUCTURAL: 'ID_2',
        CROPPER_SHEET: 'ID_3',
        CROPPER_STRUCTURAL: 'ID_4'
    },
    // Map your tabs here
    TABS: {
        STEEL: '0',        // The 'gid' for the Steel tab
        ALUMINUM: '12345', // The 'gid' for the Aluminum tab
        BEAMS: '0',
        TUBING: '98765'
    },
    // Helper for reading specific tabs
    getTabUrl: (sheetId, gid) => `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`,
    
    // Deployment URL for your Google Apps Script
    SCRIPT_URL: 'https://script.google.com/macros/s/YOUR_DEPLOY_ID/exec'
};