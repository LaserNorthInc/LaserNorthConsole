document.addEventListener('DOMContentLoaded', () => {
    const googleBtn = document.getElementById('google-signin-btn');

    if (googleBtn) {
        const provider = new firebase.auth.GoogleAuthProvider();

        googleBtn.addEventListener('click', async () => {
            try {
                googleBtn.innerText = "Authenticating...";
                await firebase.auth().signInWithPopup(provider);
                window.location.href = "dashboard.html";
            } catch (error) {
                console.error("Auth Error:", error);
                googleBtn.innerText = "Sign in with Google";
                alert("Login failed: " + error.message);
            }
        });
    }
});