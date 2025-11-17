import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBFonMdLxltVjWBsQAtHH60lxAFLedd19I",
  authDomain: "web-chronicles.firebaseapp.com",
  projectId: "web-chronicles",
  storageBucket: "web-chronicles.firebasestorage.app",
  messagingSenderId: "250178417089",
  appId: "1:250178417089:web:29ff41b1864019d4efff40",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");

loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) return alert("Please fill in both fields.");

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // ➤ BLOCK LOGIN IF EMAIL NOT VERIFIED
    if (!user.emailVerified) {
      alert("⚠️ Verify your email first.\nCheck your inbox.");
      return;
    }

    alert("✅ Login successful!");
    window.location.href = "../mainpage/index.html";

  } catch (err) {
    console.error("Login error:", err);

    if (err.code === "auth/user-not-found") alert("User not found.");
    else if (err.code === "auth/wrong-password") alert("Incorrect password.");
    else if (err.code === "auth/invalid-email") alert("Invalid email format.");
    else alert("Login failed: " + err.message);
  }
});
