// Full working script - paste into your page
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
  const topTenDiv = document.getElementById("top_ten_students");
  const extraContainer = document.querySelector(".class_extra_container .student_saves_info");

  // --- Load CSV from localStorage if available ---
  const localCSV = localStorage.getItem("lastCSV");
  if (localCSV) displayCSV(localCSV);

  // --- Listen for Auth State Changes ---
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      teacherName.textContent = "Not signed in";
      return;
    }

    try {
      const teacherRef = doc(db, "teachers", user.uid);
      const snap = await getDoc(teacherRef);

      if (!snap.exists()) {
        teacherName.textContent = "Teacher not found";
        return;
      }

      const data = snap.data();
      if ((data.role || data.Role) !== "Teacher") {
        teacherName.textContent = "Not a teacher account";
        return;
      }

      teacherName.textContent = data.name || data.email;
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
      teacherName.textContent = "Could not load teacher info";
    }
  });

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

        const lines = text.replace(/\r\n/g, "\n").split("\n").filter(line => line.trim() !== "");
        const csvEntries = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
          const name = (values[0] || "").trim();
          const id = (values[1] || "").trim();
          if (id) csvEntries.push({ studentNumber: id, name });
        }

        const studentNumberList = csvEntries.map(s => s.studentNumber);
        const usersMap = await fetchUsersMapByStudentNumbers(studentNumberList);

        const students = csvEntries.map(e => {
          const dbRec = usersMap[e.studentNumber] || null;
          return {
            student_number: e.studentNumber,
            name: e.name || (dbRec?.username || dbRec?.name || ""),
            score: dbRec?.score ?? 0,
            section: dbRec?.section ?? "",
            save_data: dbRec?.save_data ?? dbRec?.saves ?? dbRec?.Save_Data ?? [],
            firestore_docId: dbRec?._docId ?? null,
            raw: dbRec ?? null
          };
        });

        const user = auth.currentUser;
        if (user) {
          try {
            const teacherRef = doc(db, "teachers", user.uid);
            await updateDoc(teacherRef, { Students: students });
            console.log("CSV saved and merged student info saved under teacher's Students array.");
          } catch (err) {
            console.error("Error saving merged Students to teacher document:", err);
          }
        }

        localStorage.setItem("lastCSV", text);
        displayCSV(text, usersMap);
      };
      reader.readAsText(file);
    });
  }

  function chunkArray(arr, chunkSize) {
    const out = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
      out.push(arr.slice(i, i + chunkSize));
    }
    return out;
  }

  async function fetchUsersMapByStudentNumbers(numbers) {
    const map = {};
    if (!numbers || numbers.length === 0) return map;

    const chunks = chunkArray(numbers, 10);
    const usersRef = collection(db, "users");

    for (const chunk of chunks) {
      const q = query(usersRef, where("student_number", "in", chunk));
      try {
        const snap = await getDocs(q);
        snap.forEach(docSnap => {
          const d = docSnap.data();
          const roleVal = d.role || d.Role || "";
          if (roleVal === "Student") {
            map[d.student_number] = { ...(d), _docId: docSnap.id };
          }
        });
      } catch (err) {
        console.warn("Chunk query failed, falling back to single queries for chunk:", err);
        for (const num of chunk) {
          try {
            const q2 = query(usersRef, where("student_number", "==", num));
            const s2 = await getDocs(q2);
            if (!s2.empty) {
              const docSnap = s2.docs[0];
              const d = docSnap.data();
              const roleVal = d.role || d.Role || "";
              if (roleVal === "Student") map[d.student_number] = { ...(d), _docId: docSnap.id };
            }
          } catch (err2) {
            console.error("single query fallback failed for", num, err2);
          }
        }
      }
    }
    return map;
  }

  async function displayCSV(csvText, usersMap = null) {
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
    classSizeDiv.textContent = (lines.length - 1).toString();

    csvList.innerHTML = "";
    if (topTenDiv) topTenDiv.innerHTML = "";
    if (extraContainer) extraContainer.innerHTML = "";

    const innerDiv = document.createElement("div");
    innerDiv.style.overflowY = "auto";
    innerDiv.style.height = "100%";
    innerDiv.style.width = "100%";

    const table = document.createElement("table");
    table.classList.add("csv_table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";

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

    const studentRows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
      const name = values[0]?.trim() || "";
      const studentNumber = values[1]?.trim() || "";

      let rowData = {
        studentNumber,
        name,
        username: name,
        score: 0,
        section: "",
        save_data: [],
        rawFirestore: null
      };

      if (usersMap && usersMap[studentNumber]) {
        const dbRec = usersMap[studentNumber];
        rowData.score = dbRec.score ?? 0;
        rowData.section = dbRec.section ?? "";
        rowData.save_data = dbRec.save_data ?? dbRec.saves ?? dbRec.Save_Data ?? [];
        rowData.username = dbRec.username ?? dbRec.name ?? name;
        rowData.rawFirestore = dbRec;
      } else if (studentNumber) {
        try {
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("student_number", "==", studentNumber));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const studentDoc = snap.docs[0];
            const studentData = studentDoc.data();
            const roleVal = studentData.role || studentData.Role || "";
            if (roleVal === "Student") {
              rowData.score = studentData.score ?? 0;
              rowData.section = studentData.section ?? "";
              rowData.save_data = studentData.save_data ?? studentData.saves ?? studentData.Save_Data ?? [];
              rowData.username = studentData.username ?? studentData.name ?? name;
              rowData.rawFirestore = { ...(studentData), _docId: studentDoc.id };
            }
          }
        } catch (err) {
          console.error("Error fetching single user for display:", err);
        }
      }

      studentRows.push(rowData);
    }

    studentRows.sort((a, b) => (b.score || 0) - (a.score || 0));

    studentRows.forEach(row => {
      const tr = document.createElement("tr");
      tr.style.border = "1px solid #00796b";
      tr.style.cursor = row.studentNumber ? "pointer" : "default";

      const tdNum = document.createElement("td");
      tdNum.textContent = row.studentNumber;
      tdNum.style.padding = "6px";
      tdNum.style.border = "1px solid #00796b";
      tr.appendChild(tdNum);

      const tdName = document.createElement("td");
      tdName.textContent = row.username || row.name;
      tdName.style.padding = "6px";
      tdName.style.border = "1px solid #00796b";
      tr.appendChild(tdName);

      const tdScore = document.createElement("td");
      tdScore.textContent = (row.score ?? 0).toString();
      tdScore.style.padding = "6px";
      tdScore.style.border = "1px solid #00796b";
      tr.appendChild(tdScore);

      tr.addEventListener("click", () => {
        if (!row.studentNumber) return;
        table.querySelectorAll("tr").forEach(r => r.style.backgroundColor = "");
        tr.style.backgroundColor = "#b2ebf2";

        if (extraContainer) {
          extraContainer.innerHTML = "";

          const infoDiv = document.createElement("div");
          infoDiv.style.maxHeight = "260px";
          infoDiv.style.overflowY = "auto";
          infoDiv.style.padding = "10px";
          infoDiv.style.background = "#f0f8ff";
          infoDiv.style.borderRadius = "12px";
          infoDiv.style.fontFamily = "Arial, sans-serif";
          infoDiv.style.fontSize = "13px";

          const infoTable = document.createElement("table");
          infoTable.style.width = "100%";
          infoTable.style.borderCollapse = "collapse";

          const addRow = (label, value) => {
            const tr = document.createElement("tr");
            const tdLabel = document.createElement("td");
            tdLabel.textContent = label;
            tdLabel.style.fontWeight = "bold";
            tdLabel.style.padding = "4px 6px";
            tdLabel.style.width = "120px";
            tdLabel.style.verticalAlign = "top";
            const tdValue = document.createElement("td");
            tdValue.style.padding = "4px 6px";
            tdValue.style.whiteSpace = "pre-wrap";

            if (Array.isArray(value)) {
              value.forEach((s, i) => {
                const saveDiv = document.createElement("div");
                const toggle = document.createElement("button");
                toggle.textContent = `Save ${i+1} (click to toggle)`;
                toggle.style.marginBottom = "4px";
                toggle.style.cursor = "pointer";
                toggle.style.fontSize = "12px";

                const content = document.createElement("pre");
                content.textContent = JSON.stringify(s, null, 2);
                content.style.display = "none";
                content.style.padding = "4px";
                content.style.background = "#eaeaea";
                content.style.borderRadius = "6px";
                content.style.fontSize = "12px";
                content.style.overflowX = "auto";

                toggle.addEventListener("click", () => {
                  content.style.display = content.style.display === "none" ? "block" : "none";
                });

                saveDiv.appendChild(toggle);
                saveDiv.appendChild(content);
                tdValue.appendChild(saveDiv);
              });
            } else {
              tdValue.textContent = value;
            }

            tr.appendChild(tdLabel);
            tr.appendChild(tdValue);
            infoTable.appendChild(tr);
          };

          addRow("Name", row.username || row.name);
          addRow("Student ID", row.studentNumber);
          addRow("Score", row.score ?? 0);
          addRow("Section", row.section ?? "");
          addRow("Saved Data", row.save_data.length > 0 ? row.save_data : "No save data");

          infoDiv.appendChild(infoTable);
          extraContainer.appendChild(infoDiv);
        }
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
        li.textContent = `${student.username || student.name} - ${student.score}`;
        ol.appendChild(li);
      });
      topTenDiv.appendChild(ol);
    }
  }
});
