// This file handles the login page behavior.
// It attaches the Google Sign-In button and sends the user to the dashboard after sign-in.

document.addEventListener('DOMContentLoaded', () => {
    const googleBtn = document.getElementById('google-signin-btn');
    if (!googleBtn) return;

    // Set up Firebase Google authentication.
    const provider = new firebase.auth.GoogleAuthProvider();

    googleBtn.addEventListener('click', async () => {
        try {
            googleBtn.innerText = "Signing In...";
            // Open the Google sign-in popup and wait for the user to sign in.
            await auth.signInWithPopup(provider);
            // After successful sign-in, go to the dashboard page.
            window.location.href = "dashboard.html";
        } catch (error) {
            console.error(error);
            googleBtn.innerText = "Sign in with Google";
            // graceful toast fallback for login page
            (function(msg){
                var container = document.getElementById('login-toast-container');
                if (!container) { container = document.createElement('div'); container.id = 'login-toast-container'; container.style.position = 'fixed'; container.style.right = '20px'; container.style.bottom = '20px'; container.style.zIndex = '5000'; document.body.appendChild(container); }
                var el = document.createElement('div'); el.className = 'toast error'; el.innerText = msg; container.appendChild(el);
                setTimeout(function(){ el.style.opacity = '0'; setTimeout(function(){ el.remove(); },300); }, 3500);
            })("Auth failed: " + error.message);
        }
    });
});