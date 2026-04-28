// scripts/login.js
document.addEventListener('DOMContentLoaded', () => {
    // 1. Get the login button
    const googleBtn = document.getElementById('google-signin-btn');
    
    // 2. Set up the Google Auth Provider
    const provider = new firebase.auth.GoogleAuthProvider();

    // 3. Attach click event
    googleBtn.addEventListener('click', async () => {
        try {
            googleBtn.innerHTML = 'Signing In...'; // Provide UX feedback
            
            // Trigger the Google Pop-up
            const result = await firebase.auth().signInWithPopup(provider);
            
            // successful login!
            const user = result.user;
            console.log("Logged in:", user.displayName);
            
            // Redirect to dashboard (this assumes your auth.js logic is already listening for the login state)
            window.location.href = 'dashboard.html';

        } catch (error) {
            console.error("Login Failed:", error.message);
            googleBtn.innerHTML = 'Sign in with Google (Failed)';
            alert('Unable to authenticate. Please check that your domain is authorized in Firebase.');
        }
    });
});