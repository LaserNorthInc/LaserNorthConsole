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
            alert("Auth failed: " + error.message);
        }
    });
});