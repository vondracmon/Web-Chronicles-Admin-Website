import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { 
  getAuth, 
  fetchSignInMethodsForEmail,
  createUserWithEmailAndPassword,
  sendEmailVerification 
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBFonMdLxltVjWBsQAtHH60lxAFLedd19I",
  authDomain: "web-chronicles.firebaseapp.com",
  projectId: "web-chronicles",
  storageBucket: "web-chronicles.firebasestorage.app",
  messagingSenderId: "250178417089",
  appId: "1:250178417089:web:29ff41b1864019d4efff40",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

window.addEventListener("DOMContentLoaded", () => {
  const nameInput = document.querySelector("#name");
  const emailInput = document.querySelector("#email");
  const passwordInput = document.querySelector("#password");
  const registerBtn = document.querySelector("#registerBtn");

  // Inline warning for email
  const emailWarning = document.createElement("small");
  emailWarning.style.color = "red";
  emailWarning.style.display = "block";
  emailInput.parentNode.appendChild(emailWarning);

  let emailExists = false; // track if email is already registered

  // Check email existence when password field gets focus
  passwordInput.addEventListener("focus", async () => {
    const email = emailInput.value.trim();
    emailWarning.textContent = "";
    emailExists = false;

    if (!email) return;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      emailWarning.textContent = "Invalid email format.";
      return;
    }

    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);
      if (methods.length > 0) {
        emailWarning.textContent = "This email is already registered.";
        emailExists = true;
      }
    } catch (err) {
      console.error("Email check error:", err);
      emailWarning.textContent = "Error checking email.";
    }
  });

  registerBtn.addEventListener("click", async () => {
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!name || !email || !password) {
      return alert("Please fill in all fields.");
    }

    if (password.length < 8) {
      return alert("Password must be at least 8 characters.");
    }

    // Check if email was already flagged as existing
    if (emailExists) {
      emailWarning.textContent = "This email is already registered.";
      emailInput.focus();
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Send email verification
      await sendEmailVerification(user);

      // Save user info in Firestore
      await setDoc(doc(db, "teachers", user.uid), {
        uid: user.uid,
        name,
        email,
        createdAt: new Date(),
        role: "Teacher",
      });

      alert("📧 Verification email sent!\nPlease check your inbox before logging in.");
      window.location.href = "../LoginPage/login_page.html";

    } catch (err) {
      console.error("Registration error:", err);

      if (err.code === "auth/email-already-in-use") emailWarning.textContent = "This email is already registered.";
      else if (err.code === "auth/weak-password") alert("Password should be at least 8 characters.");
      else if (err.code === "auth/invalid-email") emailWarning.textContent = "Invalid email format.";
      else alert("Registration failed: " + err.message);
    }
  });
});
