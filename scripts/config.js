import { auth } from './config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.x.x/firebase-auth.js";

// 1. Protect the page
export function protectPage() {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            // No user is signed in, redirect to login
            window.location.href = "login.html";
        }
    });
}

// 2. Logout function
export async function logoutUser() {
    try {
        await signOut(auth);
        window.location.href = "login.html";
    } catch (error) {
        console.error("Error signing out:", error);
    }
}