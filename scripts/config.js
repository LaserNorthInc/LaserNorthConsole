// Firebase application configuration for Laser North Console.
// This is the shared configuration used by all pages that need authentication.
const firebaseConfig = {
  apiKey: "AIzaSyBhwDfRQLphl_0Lk8pQDZQ3jO8pr795aqU",
  authDomain: "lasernorthconsole-32295.firebaseapp.com",
  projectId: "lasernorthconsole-32295",
  storageBucket: "lasernorthconsole-32295.firebasestorage.app",
  messagingSenderId: "1025143824511",
  appId: "1:1025143824511:web:1d74f15c191ee78a3b5f4a"
};

// Initialize Firebase and create the auth helper object.
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// Configuration values used to access Google Sheets and the Google Apps Script backend.
const SHEET_CONFIG = {
    IDS: {
        // Spreadsheet ID for the full sheet inventory data.
        FULL_SHEET: '1kG_fjYX4Vc0D8qId4yaHEgJZl5xJ-9Y1MaIo549a_l8',
        FULL_STRUCTURAL: 'YOUR_SHEET_ID_HERE',
        CROPPER_SHEET: 'YOUR_SHEET_ID_HERE',
        CROPPER_STRUCTURAL: 'YOUR_SHEET_ID_HERE'
    },
    // This is the Google Apps Script endpoint used to read and write sheet data.
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxsEIqi6_gjzCMTJCvb56uqebBoWF1DgLBmUZi_qvLVm4CUfarR_xybWM_voLANgsWupw/exec',
    getReadUrl: (id, gid=0) => `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${gid}`
};

// Log the user out and return to the sign-in landing page.
async function logoutUser() {
    await auth.signOut();
    window.location.href = "../index.html";
}