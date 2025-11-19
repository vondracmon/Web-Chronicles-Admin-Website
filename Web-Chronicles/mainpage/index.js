import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { 
  getFirestore, collection, query, where, getDocs, doc, updateDoc, getDoc 
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { 
  getAuth, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyBFonMdLxltVjWBsQAtHH60lxAFLedd19I",
  authDomain: "web-chronicles.firebaseapp.com",
  databaseURL: "https://web-chronicles-default-rtdb.firebaseio.com",
  projectId: "web-chronicles",
  storageBucket: "web-chronicles.firebasestorage.app",
  messagingSenderId: "250178417089",
  appId: "1:250178417089:web:29ff41b1864019d4efff40",
  measurementId: "G-SVGQM57HNM"
};

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth();

document.addEventListener("DOMContentLoaded", () => {
  const teacherPfp = document.querySelector(".teacher_pfp");
  const teacherName = document.querySelector(".teacher_name");
  const classNameDiv = document.querySelector(".class_name");
  const classSizeDiv = document.querySelector(".class_size");
  const csvList = document.getElementById("csvList");
  const topTenDiv = document.getElementById("top_ten_students"); // div for Top 10

  // ========== FETCH LOGGED-IN TEACHER ==========
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      teacherName.textContent = "Not signed in";
      return;
    }

    try {
      const teacherRef = doc(db, "users", user.uid);
      const snap = await getDoc(teacherRef);

      if (!snap.exists()) {
        teacherName.textContent = "Teacher not found";
        return;
      }

      const data = snap.data();

      if (data.role !== "Teacher") {
        teacherName.textContent = "Not a teacher account";
        return;
      }

      // ---- Display teacher name ----
      teacherName.textContent = data.name || data.email;

      // ---- Display teacher profile picture ----
      const avatarSrc = data.pfpBase64 || "Statics/blankProfile.jpg";

      teacherPfp.innerHTML = "";
      const avatarImg = document.createElement("img");
      avatarImg.src = avatarSrc;
      avatarImg.classList.add("pfp_img");
      avatarImg.style.width = "100%";
      avatarImg.style.height = "100%";
      avatarImg.style.borderRadius = "50%";
      avatarImg.style.objectFit = "cover";
      avatarImg.style.cursor = "pointer";

      teacherPfp.appendChild(avatarImg);

      // ---- Change teacher PFP ----
      avatarImg.addEventListener("click", () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";

        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (!file) return;

          const compressedBase64 = await resizeImage(file, 100, 100);
          await updateDoc(teacherRef, { pfpBase64: compressedBase64 });
          avatarImg.src = compressedBase64;
        };

        input.click();
      });

    } catch (err) {
      console.error("Error fetching teacher info:", err);
      teacherName.textContent = "Error";
    }
  });

  // --- Resize Image Function ---
  function resizeImage(file, maxWidth = 300, maxHeight = 300) {
    return new Promise((resolve) => {
      const img = document.createElement("img");
      const reader = new FileReader();
      reader.onload = (event) => {
        img.src = event.target.result;
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.9));
        };
      };
      reader.readAsDataURL(file);
    });
  }

  // ======== CSV UPLOAD LOGIC (unchanged) ========
  if (csvList) {
    csvList.style.position = "relative";
    csvList.style.overflow = "auto";
    csvList.style.maxHeight = "300px";

    csvList.addEventListener("dragover", (e) => {
      e.preventDefault();
      csvList.classList.add("dragover");
    });

    csvList.addEventListener("dragleave", (e) => {
      e.preventDefault();
      csvList.classList.remove("dragover");
    });

    csvList.addEventListener("drop", async (e) => {
      e.preventDefault();
      csvList.classList.remove("dragover");

      const file = e.dataTransfer.files[0];
      if (!file) return;

      if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
        alert("Please drop a CSV file.");
        return;
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target.result;
        await displayCSV(text);
      };
      reader.readAsText(file);
    });

    async function displayCSV(csvText) {
      const lines = csvText.replace(/\r\n/g, "\n").split("\n").filter(line => line.trim() !== "");
      if (lines.length === 0) {
        csvList.innerHTML = "No data found in CSV.";
        classNameDiv.textContent = "-";
        classSizeDiv.textContent = "0";
        if (topTenDiv) topTenDiv.innerHTML = "";
        return;
      }

      const sectionName = "Section 4A";
      classNameDiv.textContent = sectionName;
      classSizeDiv.textContent = lines.length - 1;

      csvList.innerHTML = "";
      if (topTenDiv) topTenDiv.innerHTML = "";

      const innerDiv = document.createElement("div");
      innerDiv.style.overflowY = "auto";
      innerDiv.style.height = "100%";
      innerDiv.style.width = "100%";

      const table = document.createElement("table");
      table.classList.add("csv_table");
      table.style.width = "100%";

      const header = document.createElement("tr");
      ["Student Number", "Name", "Score"].forEach(h => {
        const th = document.createElement("th");
        th.textContent = h;
        th.style.position = "sticky";
        th.style.top = "0";
        th.style.backgroundColor = "#00796b";
        th.style.color = "#fff";
        th.style.zIndex = "1";
        th.style.padding = "6px";
        header.appendChild(th);
      });
      table.appendChild(header);

      const studentPromises = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
        const name = values[0]?.trim() || "";
        const studentNumber = values[1]?.trim() || "";

        studentPromises.push(
          (async () => {
            let score = 0;
            let username = name;
            if (studentNumber) {
              try {
                const usersRef = collection(db, "users");
                const q = query(usersRef, where("student_number", "==", studentNumber));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                  const studentDoc = querySnapshot.docs[0].data();
                  score = studentDoc.Score ?? 0;
                  username = studentDoc.username || name;
                }
              } catch (err) {
                console.error("Error fetching score:", err);
              }
            }
            return { studentNumber, name, username, score };
          })()
        );
      }

      const studentRows = await Promise.all(studentPromises);

      studentRows.sort((a, b) => b.score - a.score);

      studentRows.forEach(row => {
        const tr = document.createElement("tr");
        [row.studentNumber, row.name, row.score].forEach(val => {
          const td = document.createElement("td");
          td.textContent = val;
          td.style.padding = "6px";
          td.style.border = "1px solid #00796b";
          tr.appendChild(td);
        });
        table.appendChild(tr);
      });

      innerDiv.appendChild(table);
      csvList.appendChild(innerDiv);

      if (topTenDiv) {
        const top10 = studentRows.filter(s => s.score > 0).slice(0, 10);
        topTenDiv.innerHTML = "<h3>Top 10 Students</h3>";
        const ol = document.createElement("ol");
        top10.forEach(student => {
          const li = document.createElement("li");
          li.textContent = `${student.username} - ${student.score}`;
          ol.appendChild(li);
        });
        topTenDiv.appendChild(ol);
      }
    }
  }
});
