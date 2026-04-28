// DO NOT USE 'import' STATEMENTS HERE
document.addEventListener('DOMContentLoaded', () => {
    const googleBtn = document.getElementById('google-signin-btn');
    
    // We access firebase via the global object created by the compat script
    const provider = new firebase.auth.GoogleAuthProvider();

    googleBtn.addEventListener('click', async () => {
        try {
            const result = await firebase.auth().signInWithPopup(provider);
            console.log("Success! User:", result.user.displayName);
            window.location.href = 'dashboard.html';
        } catch (error) {
            console.error("Auth Error:", error.code, error.message);
            alert("Login failed. Make sure Google Auth is enabled in Firebase Console.");
        }
    });
});