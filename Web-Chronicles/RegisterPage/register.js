import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { 
  getAuth, 
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

// Init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

window.addEventListener("DOMContentLoaded", () => {
  const nameInput = document.querySelector("#name");
  const emailInput = document.querySelector("#email");
  const passwordInput = document.querySelector("#password");
  const registerBtn = document.querySelector("#registerBtn");

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

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // ➤ SEND EMAIL VERIFICATION
      await sendEmailVerification(user);

      // Save user info in Firestore
      await setDoc(doc(db, "teachers", user.uid), {
        uid: user.uid,
        name,
        email,
        createdAt: new Date(),
        role: "Teacher",
        verified: false
      });

      alert("📧 Verification email sent!\nPlease check your inbox before logging in.");
      window.location.href = "../LoginPage/login_page.html";

    } catch (err) {
      console.error("Registration error:", err);

      if (err.code === "auth/email-already-in-use") alert("This email is already registered.");
      else if (err.code === "auth/weak-password") alert("Password should be at least 8 characters.");
      else if (err.code === "auth/invalid-email") alert("Invalid email format.");
      else alert("Registration failed: " + err.message);
    }
  });
});
