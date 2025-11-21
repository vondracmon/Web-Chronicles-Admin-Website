import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import {
  getFirestore, collection, query, where, getDocs, doc, updateDoc, getDoc, setDoc
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

let allStudents = [];
let currentUserRole = "";

document.addEventListener("DOMContentLoaded", () => {
  const teacherPfp = document.querySelector(".teacher_pfp");
  const teacherName = document.querySelector(".teacher_name");
  const classNameDiv = document.querySelector(".class_name");
  const classSizeDiv = document.querySelector(".class_size");
  const csvList = document.getElementById("csvList");
  const topTenDiv = document.getElementById("top_ten_students");
  const extraContainer = document.querySelector(".class_extra_container .student_saves_info");

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      teacherName.textContent = "Not signed in";
      clearDisplay();
      return;
    }

    try {
      const teacherDocRef = doc(db, "teachers", user.uid);
      const teacherSnap = await getDoc(teacherDocRef);
      if (!teacherSnap.exists()) {
        teacherName.textContent = "Teacher not found";
        clearDisplay();
        return;
      }
      const teacherData = teacherSnap.data();
      currentUserRole = (teacherData.role || teacherData.Role || "").toLowerCase();

      // ------------ ADMIN BRANCH -----------
      if (currentUserRole === "admin") {
        teacherName.textContent = "Admin: " + (teacherData.name || teacherData.email);
        showAdminPanel();
        return;
      }

      // ------------ TEACHER BRANCH ----------
      if (currentUserRole !== "teacher") {
        teacherName.textContent = "Not a teacher or admin account";
        clearDisplay();
        return;
      }
      // Normal teacher UI below
      teacherName.textContent = teacherData.name || teacherData.email || "Teacher";
      const avatarSrc = teacherData.pfpBase64 || "Statics/blankProfile.jpg";
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
          try {
            await updateDoc(teacherDocRef, { pfpBase64: compressedBase64 });
            avatarImg.src = compressedBase64;
          } catch (err) {
            console.error("Error updating avatar:", err);
          }
        };
        input.click();
      });

      // Load previous students
      const infoRef = doc(db, "teachers", user.uid, "Infos", "InfoDoc");
      const infoSnap = await getDoc(infoRef);
      if (infoSnap.exists()) {
        const infoData = infoSnap.data();
        allStudents = infoData.students || [];
        displayStudentsFromFirestore(allStudents);
      } else {
        clearDisplay();
      }
    } catch (err) {
      console.error("Error fetching teacher info:", err);
      teacherName.textContent = "Could not load teacher info";
      clearDisplay();
    }
  });

  // ----------- clearing UI -----------
  function clearDisplay() {
    if (csvList) csvList.innerHTML = "No students loaded.";
    if (classNameDiv) classNameDiv.textContent = "-";
    if (classSizeDiv) classSizeDiv.textContent = "0";
    if (topTenDiv) topTenDiv.innerHTML = "";
    if (extraContainer) extraContainer.innerHTML = "";
    const adminPanel = document.getElementById("adminPanel");
    if (adminPanel) adminPanel.remove();
  }

  // ----------- ADMIN PANEL UI + LOGIC -----------
  async function showAdminPanel() {
    // Clear teacher/class UI
    if (classNameDiv) classNameDiv.textContent = "-";
    if (classSizeDiv) classSizeDiv.textContent = "-";
    if (topTenDiv) topTenDiv.innerHTML = "";
    if (extraContainer) extraContainer.innerHTML = "";
    if (csvList) csvList.innerHTML = ""; // Prepare area for admin board

    let adminPanel = document.getElementById("adminPanel");
    if (adminPanel) adminPanel.remove();
    adminPanel = document.createElement("div");
    adminPanel.id = "adminPanel";
    adminPanel.style.background = "#f5f5f5";
    adminPanel.style.border = "2px solid #00796b";
    adminPanel.style.borderRadius = "10px";
    adminPanel.style.padding = "16px";
    adminPanel.style.margin = "15px 0";
    adminPanel.innerHTML = `<h2>Admin Panel: All Teachers Leaderboards & Students</h2>`;

    try {
      const teachersCol = collection(db, "teachers");
      const teachersSnap = await getDocs(teachersCol);

      for (const docSnap of teachersSnap.docs) {
        const tdata = docSnap.data();
        const tid = docSnap.id;
        const tRole = (tdata.role || tdata.Role || "").toLowerCase();
        if (tRole === "admin") continue;

        // Collapsible teacher panel
        const teacherDiv = document.createElement("div");
        teacherDiv.style.border = "1px solid #00796b";
        teacherDiv.style.borderRadius = "8px";
        teacherDiv.style.background = "#e0fcfa";
        teacherDiv.style.marginBottom = "18px";
        teacherDiv.style.padding = "12px";

        // Header (teacher info + promote button + toggle leaderboard)
        const headerDiv = document.createElement("div");
        headerDiv.style.display = "flex";
        headerDiv.style.alignItems = "center";
        headerDiv.style.justifyContent = "space-between";

        const infoSpan = document.createElement("span");
        infoSpan.textContent = `Teacher: ${tdata.name || tdata.email || ("ID: " + tid)}`;
        infoSpan.style.fontWeight = "bold";

        const promoteBtn = document.createElement("button");
        promoteBtn.textContent = "Promote to Admin";
        promoteBtn.style.padding = "6px 10px";
        promoteBtn.style.borderRadius = "6px";
        promoteBtn.style.background = "#43a047";
        promoteBtn.style.color = "#fff";
        promoteBtn.style.border = "none";
        promoteBtn.style.cursor = "pointer";
        promoteBtn.style.marginLeft = "15px";
        promoteBtn.onclick = async () => {
          if (!confirm(`Promote "${tdata.name || tdata.email}" to admin?`)) return;
          try {
            await updateDoc(doc(db, "teachers", tid), { role: "admin" });
            promoteBtn.disabled = true;
            promoteBtn.textContent = "Promoted!";
            alert("Teacher promoted to admin.");
          } catch (err) {
            alert("Error promoting: " + err);
          }
        };

        // Collapsible toggle
        const collapseBtn = document.createElement("button");
        collapseBtn.textContent = "Show Leaderboard";
        collapseBtn.style.marginLeft = "10px";
        collapseBtn.style.borderRadius = "6px";
        collapseBtn.style.border = "1px solid #00796b";
        collapseBtn.style.background = "#fff";
        collapseBtn.style.cursor = "pointer";

        headerDiv.appendChild(infoSpan);
        headerDiv.appendChild(promoteBtn);
        headerDiv.appendChild(collapseBtn);

        teacherDiv.appendChild(headerDiv);

        // Teacher's leaderboard content
        const leaderboardDiv = document.createElement("div");
        leaderboardDiv.style.display = "none";
        leaderboardDiv.style.marginTop = "9px";

        // Fetch students for this teacher
        const infoRef = doc(db, "teachers", tid, "Infos", "InfoDoc");
        const infoSnap = await getDoc(infoRef);
        let studentList = [];
        if (infoSnap.exists()) {
          studentList = infoSnap.data().students || [];
        }

        // Get student extra info (score, saves, etc)
        const studentsMap = await fetchUsersMapByStudentNumbers(studentList.map(s => s.student_number));

        // Prepare leaderboard (sorted by score)
        const studentsRows = studentList.map(s => {
          const dbRec = studentsMap[s.student_number] || {};
          return {
            studentNumber: s.student_number || "",
            name: s.name || dbRec.username || dbRec.name || "",
            username: s.name || dbRec.username || dbRec.name || "",
            score: dbRec.score ?? 0,
            section: dbRec.section ?? s.section ?? "",
            save_data: dbRec.save_data ?? dbRec.saves ?? dbRec.Save_Data ?? [],
            rawFirestore: dbRec ? { ...dbRec, _docId: dbRec._docId } : null
          };
        }).sort((a, b) => (b.score || 0) - (a.score || 0));

        // Section filter
        const sections = ["All", ...new Set(studentsRows.map(s => s.section).filter(Boolean))];
        const filterDiv = document.createElement("div");
        filterDiv.style.marginBottom = "5px";
        const select = document.createElement("select");
        select.style.padding = "4px";
        sections.forEach(sec => {
          const opt = document.createElement("option");
          opt.value = sec;
          opt.textContent = sec;
          select.appendChild(opt);
        });
        filterDiv.appendChild(document.createTextNode("Filter by section: "));
        filterDiv.appendChild(select);
        leaderboardDiv.appendChild(filterDiv);

        // Table
        const table = document.createElement("table");
        table.style.width = "100%";
        table.style.borderCollapse = "collapse";
        const header = document.createElement("tr");
        ["Student Number", "Name", "Score", "Section"].forEach(h => {
          const th = document.createElement("th");
          th.textContent = h;
          th.style.background = "#00796b";
          th.style.color = "#fff";
          th.style.padding = "4px";
          th.style.position = "sticky";
          th.style.top = "0";
          header.appendChild(th);
        });
        table.appendChild(header);

        function renderRows(rows) {
          table.querySelectorAll("tr:not(:first-child)").forEach(n => n.remove());
          rows.forEach(row => {
            const tr = document.createElement("tr");
            tr.style.border = "1px solid #00796b";
            tr.style.cursor = "pointer";
            [row.studentNumber, row.username, row.score, row.section].forEach(val => {
              const td = document.createElement("td");
              td.textContent = val;
              td.style.padding = "4px";
              td.style.border = "1px solid #00796b";
              tr.appendChild(td);
            });

            tr.addEventListener("click", () => {
              table.querySelectorAll("tr").forEach(r => r.style.backgroundColor = "");
              tr.style.backgroundColor = "#b2ebf2";

              studentDetailDiv.innerHTML = "";
              const infoTable = document.createElement("table");
              infoTable.style.width = "100%";
              infoTable.style.borderCollapse = "collapse";

              const addRow = (label, value) => {
                const trI = document.createElement("tr");
                const tdLabel = document.createElement("td");
                tdLabel.textContent = label;
                tdLabel.style.fontWeight = "bold";
                tdLabel.style.padding = "4px 6px";
                tdLabel.style.width = "100px";
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
                trI.appendChild(tdLabel);
                trI.appendChild(tdValue);
                infoTable.appendChild(trI);
              };

              addRow("Name", row.username || row.name);
              addRow("Student ID", row.studentNumber);
              addRow("Score", row.score ?? 0);
              addRow("Section", row.section ?? "");
              addRow("Saved Data", row.save_data.length > 0 ? row.save_data : "No save data");

              studentDetailDiv.appendChild(infoTable);
            });

            table.appendChild(tr);
          });
        }

        const studentDetailDiv = document.createElement("div");
        studentDetailDiv.style.marginTop = "12px";
        studentDetailDiv.style.background = "#f0f8ff";
        studentDetailDiv.style.borderRadius = "12px";
        studentDetailDiv.style.padding = "10px";
        studentDetailDiv.style.fontSize = "13px";

        select.onchange = () => {
          const sel = select.value;
          let rows = studentsRows;
          if (sel !== "All")
            rows = studentsRows.filter(r => r.section === sel);
          renderRows(rows);
          studentDetailDiv.innerHTML = "";
        };
        renderRows(studentsRows);

        leaderboardDiv.appendChild(table);
        leaderboardDiv.appendChild(studentDetailDiv);

        if (studentsRows.length > 0) {
          const top10Div = document.createElement("div");
          top10Div.style.margin = "12px 0";
          top10Div.innerHTML = "<b>Top 10 Students:</b>";
          const ol = document.createElement("ol");
          studentsRows.filter(s => s.score > 0).slice(0, 10).forEach(student => {
            const li = document.createElement("li");
            li.textContent = `${student.username || student.name} - ${student.score}`;
            ol.appendChild(li);
          });
          top10Div.appendChild(ol);
          leaderboardDiv.appendChild(top10Div);
        }

        collapseBtn.onclick = () => {
          leaderboardDiv.style.display = leaderboardDiv.style.display === "none" ? "block" : "none";
          collapseBtn.textContent = leaderboardDiv.style.display === "none" ? "Show Leaderboard" : "Hide Leaderboard";
        };

        teacherDiv.appendChild(leaderboardDiv);
        adminPanel.appendChild(teacherDiv);
      }
    } catch (err) {
      adminPanel.innerHTML += "<div style='color:red;'>Failed to load teachers. " + err + "</div>";
    }
    if (csvList) csvList.appendChild(adminPanel);
  }

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
    csvList.style.maxHeight = "1000px";
    csvList.addEventListener("dragover", (e) => {
      e.preventDefault();
      csvList.classList.add("dragover");
    });
    csvList.addEventListener("dragleave", (e) => {
      e.preventDefault();
      csvList.classList.remove("dragover");
    });
    csvList.addEventListener("drop", async (e) => {
      if (currentUserRole === "admin") return;
      e.preventDefault();
      csvList.classList.remove("dragover");
      const file = e.dataTransfer.files[0];
      if (!file) return;
      if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
        alert("Please drop a CSV file.");
        return;
      }
      let section = prompt("Enter the Section for this CSV (e.g., 4A, 5B):");
      if (!section) section = "Unknown";
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target.result;
        const lines = text.replace(/\r\n/g, "\n").split("\n").filter(line => line.trim() !== "");
        const csvEntries = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
          const name = (values[0] || "").trim();
          const id = (values[1] || "").trim();
          if (id) csvEntries.push({ student_number: id, name, section });
        }
        allStudents = allStudents.concat(csvEntries);
        const user = auth.currentUser;
        if (user) {
          try {
            const infoRef = doc(db, "teachers", user.uid, "Infos", "InfoDoc");
            await setDoc(infoRef, { students: allStudents }, { merge: true });
            displayStudentsFromFirestore(allStudents);
          } catch (err) {
            console.error("Error saving Students to teacher Infos:", err);
            alert("Failed to save students to your account.");
          }
        } else {
          alert("You must be signed in to save the CSV.");
        }
      };
      reader.readAsText(file);
    });
  }

  async function displayStudentsFromFirestore(studentsArray) {
    if (!Array.isArray(studentsArray) || studentsArray.length === 0) {
      clearDisplay();
      return;
    }
    allStudents = studentsArray;

    let sectionFilterDiv = document.getElementById("sectionFilterDiv");
    if (!sectionFilterDiv) {
      sectionFilterDiv = document.createElement("div");
      sectionFilterDiv.id = "sectionFilterDiv";
      sectionFilterDiv.style.marginBottom = "10px";

      const label = document.createElement("label");
      label.textContent = "Filter by Section: ";
      label.style.fontWeight = "bold";

      const select = document.createElement("select");
      select.id = "sectionFilter";
      select.style.padding = "6px";
      select.style.borderRadius = "8px";
      select.style.marginLeft = "6px";

      sectionFilterDiv.appendChild(label);
      sectionFilterDiv.appendChild(select);

      csvList.prepend(sectionFilterDiv);
    }

    const select = document.getElementById("sectionFilter");
    const sections = ["All", ...new Set(studentsArray.map(s => s.section).filter(Boolean))];
    select.innerHTML = "";
    sections.forEach(sec => {
      const option = document.createElement("option");
      option.value = sec;
      option.textContent = sec;
      select.appendChild(option);
    });

    function applyFilter() {
      const selected = select.value;
      let filteredRows = studentsArray;
      if (selected !== "All") {
        filteredRows = studentsArray.filter(s => s.section === selected);
      }
      renderStudentTable(filteredRows);
    }

    select.onchange = applyFilter;
    applyFilter();
    addDeleteSectionButton();
  }

  async function renderStudentTable(filteredRows) {
    const numbers = filteredRows.map(s => s.student_number).filter(Boolean);
    const usersMap = await fetchUsersMapByStudentNumbers(numbers);

    filteredRows = filteredRows.map(s => {
      const dbRec = usersMap[s.student_number] || null;
      return {
        studentNumber: s.student_number || "",
        name: s.name || (dbRec?.username || dbRec?.name || ""),
        username: s.name || (dbRec?.username || dbRec?.name || ""),
        score: dbRec?.score ?? 0,
        section: dbRec?.section ?? s.section ?? "",
        save_data: dbRec?.save_data ?? dbRec?.saves ?? dbRec?.Save_Data ?? [],
        rawFirestore: dbRec ? { ...dbRec, _docId: dbRec._docId } : null
      };
    });

    filteredRows.sort((a, b) => (b.score || 0) - (a.score || 0));

    classNameDiv.textContent = filteredRows[0]?.section || "All Sections";
    classSizeDiv.textContent = filteredRows.length.toString();

    csvList.querySelectorAll("table, .csv_table_wrapper").forEach(n => n.remove());
    topTenDiv.innerHTML = "";
    extraContainer.innerHTML = "";

    const innerDiv = document.createElement("div");
    innerDiv.classList.add("csv_table_wrapper");
    innerDiv.style.overflowY = "auto";
    innerDiv.style.height = "100%";
    innerDiv.style.width = "100%";

    const table = document.createElement("table");
    table.classList.add("csv_table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";

    const header = document.createElement("tr");
    ["Student Number", "Name", "Score", "Section"].forEach(h => {
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

    filteredRows.forEach(row => {
      const tr = document.createElement("tr");
      tr.style.border = "1px solid #00796b";
      tr.style.cursor = row.studentNumber ? "pointer" : "default";

      [row.studentNumber, row.username, row.score, row.section].forEach(val => {
        const td = document.createElement("td");
        td.textContent = val;
        td.style.padding = "6px";
        td.style.border = "1px solid #00796b";
        tr.appendChild(td);
      });

      tr.addEventListener("click", () => {
        table.querySelectorAll("tr").forEach(r => r.style.backgroundColor = "");
        tr.style.backgroundColor = "#b2ebf2";
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
          const trI = document.createElement("tr");
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
          trI.appendChild(tdLabel);
          trI.appendChild(tdValue);
          infoTable.appendChild(trI);
        };

        addRow("Name", row.username || row.name);
        addRow("Student ID", row.studentNumber);
        addRow("Score", row.score ?? 0);
        addRow("Section", row.section ?? "");
        addRow("Saved Data", row.save_data.length > 0 ? row.save_data : "No save data");

        infoDiv.appendChild(infoTable);
        extraContainer.appendChild(infoDiv);
      });

      table.appendChild(tr);
    });

    innerDiv.appendChild(table);
    csvList.appendChild(innerDiv);

    if (topTenDiv) {
      const top10 = filteredRows.filter(s => s.score > 0).slice(0, 10);
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

  function addDeleteSectionButton() {
    if (!csvList) return;
    let deleteBtnDiv = document.getElementById("deleteSectionDiv");
    if (!deleteBtnDiv) {
      deleteBtnDiv = document.createElement("div");
      deleteBtnDiv.id = "deleteSectionDiv";
      deleteBtnDiv.style.margin = "10px 0";
      const btn = document.createElement("button");
      btn.textContent = "Delete Section";
      btn.style.padding = "6px 12px";
      btn.style.borderRadius = "8px";
      btn.style.border = "none";
      btn.style.background = "#e74c3c";
      btn.style.color = "#fff";
      btn.style.cursor = "pointer";
      btn.style.fontWeight = "bold";
      btn.style.transition = "0.2s";
      btn.onmouseover = () => btn.style.background = "#c0392b";
      btn.onmouseout = () => btn.style.background = "#e74c3c";
      btn.addEventListener("click", async () => {
        const sections = [...new Set(allStudents.map(s => s.section).filter(Boolean))];
        if (sections.length === 0) {
          alert("No sections available to delete.");
          return;
        }
        let sectionToDelete = prompt("Enter the section to delete:\nAvailable: " + sections.join(","));
        if (!sectionToDelete || !sections.includes(sectionToDelete)) {
          alert("Invalid or empty section. Action cancelled.");
          return;
        }
        if (!confirm(`Are you sure you want to delete all students in section "${sectionToDelete}"? This cannot be undone.`)) return;
        allStudents = allStudents.filter(s => s.section !== sectionToDelete);
        const user = auth.currentUser;
        if (user) {
          try {
            const infoRef = doc(db, "teachers", user.uid, "Infos", "InfoDoc");
            await setDoc(infoRef, { students: allStudents }, { merge: true });
            displayStudentsFromFirestore(allStudents);
            alert(`Section "${sectionToDelete}" deleted successfully.`);
          } catch (err) {
            console.error("Error deleting section:", err);
            alert("Failed to delete section.");
          }
        }
      });
      deleteBtnDiv.appendChild(btn);
      csvList.prepend(deleteBtnDiv);
    }
  }
});
