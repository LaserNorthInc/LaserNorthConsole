document.addEventListener('DOMContentLoaded', () => {
    const googleBtn = document.getElementById('google-signin-btn');
    if (!googleBtn) return;

    const provider = new firebase.auth.GoogleAuthProvider();

    googleBtn.addEventListener('click', async () => {
        try {
            googleBtn.innerText = "Signing In...";
            await auth.signInWithPopup(provider);
            window.location.href = "dashboard.html";
        } catch (error) {
            console.error(error);
            googleBtn.innerText = "Sign in with Google";
            alert("Auth failed: " + error.message);
        }
    });
});