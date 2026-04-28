import { protectPage, logoutUser } from './auth.js';

// Run security check immediately
protectPage();

// Attach logout listener
document.getElementById('logoutBtn').addEventListener('click', () => {
    logoutUser();
});