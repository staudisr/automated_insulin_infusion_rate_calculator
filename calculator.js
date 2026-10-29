let selectedRowIndex = -1;
        let selectedColIndex = -1;
        let timerInterval;

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

        // Unlock Inputs without needing grid selection (For New Starts)
        document.getElementById("new-fsbs").addEventListener("input", function() {
            if(this.value.length > 0) {
                document.getElementById("start-btn").disabled = false;
                if(selectedColIndex !== -1) {
                    document.getElementById("calc-btn").disabled = false;
                }
            } else {
                document.getElementById("start-btn").disabled = true;
                document.getElementById("calc-btn").disabled = true;
            }
        });
        
        // Initial unlock of FSBS box to allow New Starts without grid clicking
        document.getElementById("new-fsbs").disabled = false;

        // Grid Click Listener (For Adjustments)
        document.querySelector("tbody").addEventListener("click", function(e) {
            if (e.target && e.target.nodeName === "BUTTON") {
                // Remove previous selection
                document.querySelectorAll(".cell-btn").forEach(btn => btn.classList.remove("selected", "target"));
                document.getElementById("result-box").style.display = "none";
                clearInterval(timerInterval); // stop any running timer
                document.getElementById("alarm-sound").pause();
                
                // Highlight new selection
                e.target.classList.add("selected");
                
                selectedRowIndex = parseInt(e.target.getAttribute("data-rindex"));
                selectedColIndex = parseInt(e.target.getAttribute("data-col"));
                const currentVal = e.target.getAttribute("data-val");
                const rowLabel = gridData[selectedRowIndex][0];
                
                document.getElementById("display-current").innerText = `${currentVal} ml/hr (Column ${selectedColIndex}, Row ${rowLabel})`;
                
                if(document.getElementById("new-fsbs").value.length > 0) {
                    document.getElementById("calc-btn").disabled = false;
                }
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
            return Math.round(total * 10) / 10;
        }
        
        // NEW START LOGIC
        function calculateNewStart() {
            const newFSBS = parseInt(document.getElementById("new-fsbs").value);
            const resultBox = document.getElementById("result-box");
            const resultText = document.getElementById("result-text");
            const timerContainer = document.getElementById("timer-container");
            
            if (isNaN(newFSBS) || newFSBS < 10) {
                alert("Please enter a valid FSBS number.");
                return;
            }
            
            clearInterval(timerInterval);
            document.getElementById("alarm-sound").pause();
            timerContainer.style.display = "none";
            document.querySelectorAll(".cell-btn").forEach(btn => btn.classList.remove("selected", "target"));
            
            let targetRowIndex = getRowIndex(newFSBS);
            
            // Protocol: New starts always begin in Column 2
            let targetColIndex = 2;
            let finalRate = (newFSBS < 110) ? 0 : getRateValue(targetRowIndex, targetColIndex);
            
            resultBox.className = "result-success";
            resultBox.style.display = "block";
            
            if (newFSBS < 110) {
                resultBox.className = "result-danger";
                resultText.innerHTML = `<strong>ACTION REQUIRED: DO NOT START INFUSION.</strong><br>FSBS is < 110. Recheck in 30 minutes. Once FSBS > 120, you will start the drip in Column 2 for that specific FSBS.`;
                timerContainer.style.display = "block";
                document.getElementById("start-timer-btn").style.display = "inline-block";
                document.getElementById("timer-display").style.display = "none";
                document.getElementById("stop-alarm-btn").style.display = "none";
            } else {
                resultText.innerHTML = `<strong>NEW START RATE: ${finalRate} ml/hr</strong> (Column 2, Row ${gridData[targetRowIndex][0]})<br><br><strong>Why:</strong> New continuous insulin infusions always begin in Column 2.`;
            }
            
            // Highlight target
            if (targetColIndex <= 16 && newFSBS >= 110) {
                document.querySelectorAll(".cell-btn").forEach(btn => {
                    if (parseInt(btn.getAttribute("data-rindex")) === targetRowIndex && parseInt(btn.getAttribute("data-col")) === targetColIndex) {
                        btn.classList.add("target");
                    }
                });
            }
        }

        // ADJUSTMENT LOGIC (Existing)
        function calculateNewRate() {
            const newFSBS = parseInt(document.getElementById("new-fsbs").value);
            const resultBox = document.getElementById("result-box");
            const resultText = document.getElementById("result-text");
            const timerContainer = document.getElementById("timer-container");
            
            if (isNaN(newFSBS) || newFSBS < 10) {
                alert("Please enter a valid FSBS number.");
                return;
            }
            if (selectedColIndex === -1) {
                alert("Please select the CURRENT rate on the grid first.");
                return;
            }

            clearInterval(timerInterval);
            document.getElementById("alarm-sound").pause();
            timerContainer.style.display = "none";

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
                if (targetRowIndex > selectedRowIndex) { 
                    targetColIndex = selectedColIndex;
                    actionTaken = "Current BG Row is lower than previous row: Stay in the same column.";
                } else {
                    targetColIndex = selectedColIndex + 1;
                    actionTaken = "Current BG Row is same or higher than previous row: Move 1 column to the right.";
                }
            }

            let finalRate = (newFSBS < 110) ? 0 : getRateValue(targetRowIndex, targetColIndex);
            
            resultBox.className = alertClass;
            resultBox.style.display = "block";
            
            if (newFSBS < 110) {
                resultText.innerHTML = `<strong>ACTION REQUIRED:</strong> ${actionTaken}<br><em>(When restarting, the new rate in Column ${targetColIndex} will be ${getRateValue(targetRowIndex, targetColIndex)} ml/hr).</em>`;
                // Show Timer elements
                timerContainer.style.display = "block";
                document.getElementById("start-timer-btn").style.display = "inline-block";
                document.getElementById("timer-display").style.display = "none";
                document.getElementById("stop-alarm-btn").style.display = "none";
                
            } else {
                let mathNote = targetColIndex > 16 ? ` <em>(Calculated as Col 16 + Col ${targetColIndex - 16})</em>` : "";
                resultText.innerHTML = `<strong>NEW RATE: ${finalRate} ml/hr</strong> (Column ${targetColIndex}, Row ${gridData[targetRowIndex][0]})${mathNote}<br><br><strong>Why:</strong> ${actionTaken}`;
            }

            // Highlight target
            document.querySelectorAll(".cell-btn").forEach(btn => btn.classList.remove("target"));
            if (targetColIndex <= 16 && newFSBS >= 110) {
                document.querySelectorAll(".cell-btn").forEach(btn => {
                    if (parseInt(btn.getAttribute("data-rindex")) === targetRowIndex && parseInt(btn.getAttribute("data-col")) === targetColIndex) {
                        btn.classList.add("target");
                    }
                });
            }
        }
        
        // TIMER LOGIC
        function startHypoTimer() {
            document.getElementById("start-timer-btn").style.display = "none";
            const timerDisplay = document.getElementById("timer-display");
            timerDisplay.style.display = "block";
            timerDisplay.innerText = "30:00";
            
            let timeLeft = 30 * 60; // 30 mins in seconds
            
            clearInterval(timerInterval);
            timerInterval = setInterval(function() {
                timeLeft--;
                
                let minutes = Math.floor(timeLeft / 60);
                let seconds = timeLeft % 60;
                
                if (seconds < 10) seconds = "0" + seconds;
                
                timerDisplay.innerText = `${minutes}:${seconds}`;
                
                if (timeLeft <= 0) {
                    clearInterval(timerInterval);
                    timerDisplay.innerText = "RECHECK FSBS NOW!";
                    timerDisplay.style.color = "#ff3333";
                    document.getElementById("alarm-sound").play();
                    document.getElementById("stop-alarm-btn").style.display = "inline-block";
                }
            }, 1000);
        }
        
        function stopAlarm() {
            document.getElementById("alarm-sound").pause();
            document.getElementById("alarm-sound").currentTime = 0;
            document.getElementById("stop-alarm-btn").style.display = "none";
            document.getElementById("timer-display").innerText = "Timer Stopped";
            document.getElementById("timer-display").style.color = "#721c24";
        }

        // Allow Enter key to trigger calculation (defaults to Adjustment calc if a grid cell is selected, else New Start if not)
        document.getElementById("new-fsbs").addEventListener("keypress", function(event) {
            if (event.key === "Enter") {
                event.preventDefault();
                if(selectedColIndex !== -1) {
                    calculateNewRate();
                } else if(this.value.length > 0) {
                    calculateNewStart();
                }
            }
        });

        function resetCalculator() {
            selectedRowIndex = -1;
            selectedColIndex = -1;
            clearInterval(timerInterval);
            document.getElementById("alarm-sound").pause();
            
            document.getElementById("display-current").innerText = "None (Click the grid below)";
            document.getElementById("display-current").style.color = "#0056b3";
            document.getElementById("new-fsbs").value = "";
            document.getElementById("calc-btn").disabled = true;
            document.getElementById("start-btn").disabled = true;
            
            document.getElementById("result-box").style.display = "none";
            document.getElementById("timer-container").style.display = "none";
            document.getElementById("timer-display").style.color = "black";
            
            document.querySelectorAll(".cell-btn").forEach(btn => btn.classList.remove("selected", "target"));
        }
