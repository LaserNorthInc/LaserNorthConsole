// scripts/auth.js
// Assuming you link Firebase Auth in your HTML
function checkAuthState() {
    const user = sessionStorage.getItem('loggedInUser'); // Simple placeholder
    if (!user && !window.location.pathname.includes('login.html')) {
        window.location.href = '../pages/login.html';
    }
}

function logout() {
    sessionStorage.removeItem('loggedInUser');
    window.location.href = '../pages/login.html';
}

checkAuthState();