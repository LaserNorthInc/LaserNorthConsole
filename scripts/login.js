// scripts/login.js

document.addEventListener('DOMContentLoaded', () => {
    const googleBtn = document.getElementById('google-signin-btn');

    // 1. Create the Google Provider
    const provider = new firebase.auth.GoogleAuthProvider();

    // 2. Handle the Click
    googleBtn.addEventListener('click', async () => {
        try {
            // UI Feedback
            googleBtn.innerText = "Authenticating...";
            googleBtn.style.opacity = "0.7";

            // 3. Trigger the Login
            const result = await firebase.auth().signInWithPopup(provider);
            
            // 4. Success!
            console.log("Welcome:", result.user.displayName);
            window.location.href = "dashboard.html"; 

        } catch (error) {
            console.error("Auth Error:", error.code, error.message);
            googleBtn.innerText = "Sign in with Google";
            googleBtn.style.opacity = "1";
            
            // Helpful error for setup
            if (error.code === 'auth/operation-not-allowed') {
                alert("Google Sign-In is not enabled in your Firebase Console.");
            } else {
                alert("Login failed: " + error.message);
            }
        }
    });
});