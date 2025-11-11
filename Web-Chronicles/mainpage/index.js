class index_app {
    constructor() {
        // Log out dropdown toggle
        document.getElementById("logout_dd").addEventListener("click", function() {
            document.getElementById("logout_dd").classList.toggle("show");
        });

        // CSV drag-and-drop setup
        this.csvList = document.getElementById("csvList");
        this.initCSVDragDrop();
    }

    //=======================================
    // Initialize drag-and-drop for CSV files
    //=======================================
    initCSVDragDrop() {
        if (!this.csvList) return;

        // Highlight on drag over
        this.csvList.addEventListener("dragover", (e) => {
            e.preventDefault();
            this.csvList.style.backgroundColor = "#b2ebf2";
        });

        // Remove highlight on leave
        this.csvList.addEventListener("dragleave", () => {
            this.csvList.style.backgroundColor = "#E0F7fa";
        });

        // Handle drop
        this.csvList.addEventListener("drop", (e) => {
            e.preventDefault();
            this.csvList.style.backgroundColor = "#E0F7fa";

            const files = e.dataTransfer.files;
            if (files.length === 0) return;

            const file = files[0];
            if (file.type !== "text/csv") {
                alert("Please drop a CSV file only!");
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target.result;
                this.displayCSV(text);
            };
            reader.readAsText(file);
        });
    }

    displayCSV(data) {
            // Normalize newlines to \n, then split to rows
            let rows = data.replace(/\r\n/g, "\n").split("\n").filter(r => r.trim().length > 0);

            // Safely parse each row as CSV
            let parsed = rows.map(row =>
                row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
                    .map(c => c.replace(/^"|"$/g, "").trim())
            );

            const header = parsed[0];
            const nameIdx = header.findIndex(h => h.toLowerCase() === "name");
            const studentNumIdx = header.findIndex(h => h.toLowerCase().includes("student number"));

            if (nameIdx === -1 || studentNumIdx === -1) {
                this.csvList.innerHTML = "<div>CSV must contain 'Name' and 'Student Number' columns.</div>";
                return;
            }

            // Filter: ignore placeholder/truncated and fully empty rows after header
            const dataRows = parsed.slice(1).filter(row =>
                row.length > Math.max(nameIdx, studentNumIdx) &&
                row[nameIdx] &&
                !row[nameIdx].toLowerCase().includes("truncated for brevity")
            );

            // Build and display main table
            this.csvList.innerHTML = "";
            const table = document.createElement("table");
            // Add table header
            const tableHeader = document.createElement("tr");
            [header[nameIdx], header[studentNumIdx]].forEach(cellText => {
                const th = document.createElement("th");
                th.textContent = cellText;
                tableHeader.appendChild(th);
            });
            table.appendChild(tableHeader);

            dataRows.forEach(row => {
                const tr = document.createElement("tr");
                [row[nameIdx], row[studentNumIdx]].forEach(cell => {
                    const td = document.createElement("td");
                    td.textContent = cell;
                    tr.appendChild(td);
                });
                table.appendChild(tr);
            });
            this.csvList.appendChild(table);

            // Display top 10 names in top_ten_students div
            const topTenDiv = document.getElementById("top_ten_students");
            if (topTenDiv) {
                const topTenNames = dataRows.slice(0, 10).map(row => row[nameIdx]);
                topTenDiv.innerHTML = topTenNames.map(name => `<p>${name}</p>`).join("");
            }
        }

}

window.onload = function() {
    new index_app();
};
