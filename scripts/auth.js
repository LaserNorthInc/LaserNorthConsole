// Legacy authentication helper file.

function checkAuthState() {
    // Check for a saved user value in browser session storage.
    const user = sessionStorage.getItem('loggedInUser');
    if (!user && !window.location.pathname.includes('login.html')) {
        // If no user is signed in, send the browser to the login page.
        window.location.href = '../pages/login.html';
    }
}

function logout() {
    // Remove the stored user and redirect to the login page.
    sessionStorage.removeItem('loggedInUser');
    window.location.href = '../pages/login.html';
}

checkAuthState();
