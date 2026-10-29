<script>
        let selectedRowIndex = -1;
        let selectedColIndex = -1;

        // Build Table
        const headerRow = document.getElementById("table-headers");
        for (let i = 1; i <= 16; i++) {
            const th = document.createElement("th");
            th.innerHTML = `Col ${i}`;
            headerRow.appendChild(th);
        }

        const tbody = document.querySelector("#drip-table tbody");
        gridData.forEach((row, index) => {
            const tr = document.createElement("tr");
            tr.innerHTML += `<td class="bg-row">${row[0]}</td>`;
            for(let i = 1; i <= 16; i++) {
                tr.innerHTML += `<td><button class="cell-btn" data-rindex="${index}" data-col="${i}" data-val="${row[i]}">${row[i]}</button></td>`;
            }
            tbody.appendChild(tr);
        });

        // Grid Click Listener
        document.querySelector("tbody").addEventListener("click", function(e) {
            if (e.target && e.target.nodeName === "BUTTON") {
                // Remove previous selection
                document.querySelectorAll(".cell-btn").forEach(btn => btn.classList.remove("selected", "target"));
                document.getElementById("result-box").style.display = "none";
                
                // Highlight new selection
                e.target.classList.add("selected");
                
                selectedRowIndex = parseInt(e.target.getAttribute("data-rindex"));
                selectedColIndex = parseInt(e.target.getAttribute("data-col"));
                const currentVal = e.target.getAttribute("data-val");
                const rowLabel = gridData[selectedRowIndex][0];
                
                document.getElementById("display-current").innerText = `${currentVal} ml/hr (Column ${selectedColIndex}, Row ${rowLabel})`;
                
                // Enable inputs
                document.getElementById("new-fsbs").disabled = false;
                document.getElementById("new-fsbs").focus();
                document.getElementById("calc-btn").disabled = false;
            }
        });

        // Helper: Convert FSBS number to Row Index
        function getRowIndex(fsbs) {
            if (fsbs > 500) return 0;
            if (fsbs >= 451) return 1;
            if (fsbs >= 385) return 2;
            if (fsbs >= 334) return 3;
            if (fsbs >= 290) return 4;
            if (fsbs >= 251) return 5;
            if (fsbs >= 217) return 6;
            if (fsbs >= 181) return 7;
            if (fsbs >= 163) return 8;
            if (fsbs >= 141) return 9;
            if (fsbs >= 121) return 10;
            if (fsbs >= 111) return 11;
            return 12; // < 110
        }

        // Helper: Calculate rate (handles columns > 16)
        function getRateValue(rowIndex, colIndex) {
            if (colIndex <= 16) return gridData[rowIndex][colIndex];
            
            // If > 16, do the additive math
            let total = 0;
            let remaining = colIndex;
            while (remaining > 16) {
                total += gridData[rowIndex][16];
                remaining -= 16;
            }
            if (remaining > 0) {
                total += gridData[rowIndex][remaining];
            }
            // Round to 1 decimal place to prevent JS floating point weirdness
            return Math.round(total * 10) / 10;
        }

        // Main Calculator Logic
        function calculateNewRate() {
            const newFSBS = parseInt(document.getElementById("new-fsbs").value);
            const resultBox = document.getElementById("result-box");
            
            if (isNaN(newFSBS) || newFSBS < 10) {
                alert("Please enter a valid FSBS number.");
                return;
            }

            let targetRowIndex = getRowIndex(newFSBS);
            let targetColIndex = selectedColIndex;
            let actionTaken = "";
            let alertClass = "result-success";

            // Rules Logic
            if (newFSBS < 110) {
                targetColIndex = Math.max(1, selectedColIndex - 1);
                actionTaken = "<strong>HOLD INFUSION IMMEDIATELY.</strong> Recheck in 30 minutes. Once FSBS > 120, restart 1 column to the left.";
                alertClass = "result-danger";
            } 
            else if (newFSBS < 141) {
                targetColIndex = Math.max(1, selectedColIndex - 1);
                actionTaken = "FSBS < 141: Move 1 column to the left.";
                alertClass = "result-warning";
            }
            else if (newFSBS >= 141 && newFSBS <= 180) {
                targetColIndex = selectedColIndex;
                actionTaken = "FSBS is in Target Zone (141-180): Stay in the same column.";
            }
            else {
                // FSBS > 180. Compare to previous row.
                // Note: Lower index = Higher blood sugar row
                if (targetRowIndex > selectedRowIndex) { 
                    // Current BG row is LOWER than previous BG row
                    targetColIndex = selectedColIndex;
                    actionTaken = "Current BG Row is lower than previous row: Stay in the same column.";
                } else {
                    // Current BG row is SAME or HIGHER than previous row
                    targetColIndex = selectedColIndex + 1;
                    actionTaken = "Current BG Row is same or higher than previous row: Move 1 column to the right.";
                }
            }

            // Calculate final rate
            let finalRate = (newFSBS < 110) ? 0 : getRateValue(targetRowIndex, targetColIndex);
            
            // Output the result
            resultBox.className = alertClass;
            resultBox.style.display = "block";
            
            if (newFSBS < 110) {
                resultBox.innerHTML = `<strong>ACTION REQUIRED:</strong> ${actionTaken}<br><em>(When restarting, the new rate in Column ${targetColIndex} will be ${getRateValue(targetRowIndex, targetColIndex)} ml/hr).</em>`;
            } else {
                let mathNote = targetColIndex > 16 ? ` <em>(Calculated as Col 16 + Col ${targetColIndex - 16})</em>` : "";
                resultBox.innerHTML = `<strong>NEW RATE: ${finalRate} ml/hr</strong> (Column ${targetColIndex}, Row ${gridData[targetRowIndex][0]})${mathNote}<br><br><strong>Why:</strong> ${actionTaken}`;
            }

            // Highlight the target cell on the grid if it's column <= 16
            document.querySelectorAll(".cell-btn").forEach(btn => btn.classList.remove("target"));
            if (targetColIndex <= 16) {
                document.querySelectorAll(".cell-btn").forEach(btn => {
                    if (parseInt(btn.getAttribute("data-rindex")) === targetRowIndex && parseInt(btn.getAttribute("data-col")) === targetColIndex) {
                        btn.classList.add("target");
                    }
                });
            }
        }

        // Allow Enter key to trigger calculation
        document.getElementById("new-fsbs").addEventListener("keypress", function(event) {
            if (event.key === "Enter") {
                event.preventDefault();
                calculateNewRate();
            }
        });

        function resetCalculator() {
            selectedRowIndex = -1;
            selectedColIndex = -1;
            document.getElementById("display-current").innerText = "None (Click the grid below)";
            document.getElementById("display-current").style.color = "#0056b3";
            document.getElementById("new-fsbs").value = "";
            document.getElementById("new-fsbs").disabled = true;
            document.getElementById("calc-btn").disabled = true;
            document.getElementById("result-box").style.display = "none";
            document.querySelectorAll(".cell-btn").forEach(btn => btn.classList.remove("selected", "target"));
        }
    </script>
