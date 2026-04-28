// scripts/config.js
const CONFIG = {
    // Firebase Configuration
    FIREBASE_CONFIG: {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_PROJECT.firebaseapp.com",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_PROJECT.appspot.com",
        messagingSenderId: "YOUR_SENDER_ID",
        appId: "YOUR_APP_ID"
    },
    // Sheet IDs
    SHEET_IDS: {
        STRUCTURAL: "YOUR_STRUCTURAL_SHEET_ID",
        SHEET: "YOUR_SHEET_INVENTORY_ID"
    },
    // Common settings
    APP_NAME: "Laser North Console"
};

// Global helper for fetching (example for Google Sheets)
const getSheetUrl = (id) => `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv`;