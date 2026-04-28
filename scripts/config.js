// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBhwDfRQLphl_0Lk8pQDZQ3jO8pr795aqU",
  authDomain: "lasernorthconsole-32295.firebaseapp.com",
  projectId: "lasernorthconsole-32295",
  storageBucket: "lasernorthconsole-32295.firebasestorage.app",
  messagingSenderId: "1025143824511",
  appId: "1:1025143824511:web:1d74f15c191ee78a3b5f4a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// 2. Logout function
export async function logoutUser() {
    try {
        await signOut(auth);
        window.location.href = "login.html";
    } catch (error) {
        console.error("Error signing out:", error);
    }
}