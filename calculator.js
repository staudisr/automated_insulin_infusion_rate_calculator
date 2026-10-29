let selectedRowIndex = -1;
        let selectedColIndex = -1;
        let timerInterval;
        let isHeld = false; // Tracks if the infusion is currently held

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

        // Unlock Input
        document.getElementById("new-fsbs").addEventListener("input", function() {
            if(this.value.length > 0) {
                document.getElementById("calc-btn").disabled = false;
            } else {
                document.getElementById("calc-btn").disabled = true;
            }
        });
        
        document.getElementById("new-fsbs").disabled = false;

        // Grid Click Listener (For Manual Adjustments)
        document.querySelector("tbody").addEventListener("click", function(e) {
            if (e.target && e.target.nodeName === "BUTTON") {
                isHeld = false; 
                
                document.querySelectorAll(".cell-btn").forEach(btn => btn.classList.remove("selected", "target"));
                document.getElementById("result-box").style.display = "none";
                clearInterval(timerInterval); 
                document.getElementById("alarm-sound").pause();
                
                e.target.classList.add("selected");
                
                selectedRowIndex = parseInt(e.target.getAttribute("data-rindex"));
                selectedColIndex = parseInt(e.target.getAttribute("data-col"));
                const currentVal = e.target.getAttribute("data-val");
                const rowLabel = gridData[selectedRowIndex][0];
                
                document.getElementById("display-current").innerHTML = `${currentVal} ml/hr (Column ${selectedColIndex}, Row ${rowLabel}) <br><span style="font-size: 14px; color: #6c757d;">(Manual Selection)</span>`;
                
                // Transform button to Adjustment Mode
                const calcBtn = document.getElementById("calc-btn");
                calcBtn.innerText = "Calculate Rate Adjustment";
                calcBtn.style.backgroundColor = "#0056b3"; // Blue
                
                if(document.getElementById("new-fsbs").value.length > 0) {
                    calcBtn.disabled = false;
                }
                document.getElementById("new-fsbs").select();
            }
        });

        // Smart Router: Determines which logic to run based on grid state
        function processCalculation() {
            if (selectedColIndex === -1 && !isHeld) {
                calculateNewStart();
            } else {
                calculateNewRate();
            }
        }

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

        // Helper: Auto-Updates the UI for the next calculation
        function updateCurrentUI() {
            const currentVal = getRateValue(selectedRowIndex, selectedColIndex);
            const rowLabel = gridData[selectedRowIndex][0];
            
            let statusText = isHeld ? `<br><span style="font-size: 14px; color: #dc3545;">(Auto-Updated: On HOLD - Ready for Recheck)</span>` 
                                    : `<br><span style="font-size: 14px; color: #28a745;">(Auto-Updated for Next Entry)</span>`;
            
            document.getElementById("display-current").innerHTML = `${currentVal} ml/hr (Column ${selectedColIndex}, Row ${rowLabel}) ${statusText}`;
            
            document.querySelectorAll(".cell-btn").forEach(btn => btn.classList.remove("selected", "target"));
            
            // Array to hold all columns that need highlighting (handles > 16)
            let colsToHighlight = [];
            let remaining = selectedColIndex;
            
            if (remaining <= 16) {
                colsToHighlight.push(remaining);
            } else {
                while (remaining > 16) {
                    if (!colsToHighlight.includes(16)) colsToHighlight.push(16);
                    remaining -= 16;
                }
                if (remaining > 0) {
                    colsToHighlight.push(remaining);
                }
            }

            document.querySelectorAll(".cell-btn").forEach(btn => {
                if (parseInt(btn.getAttribute("data-rindex")) === selectedRowIndex && colsToHighlight.includes(parseInt(btn.getAttribute("data-col")))) {
                    btn.classList.add("selected");
                    if (!isHeld) btn.classList.add("target");
                }
            });
            
            // Keep button in Adjustment Mode for chaining
            const calcBtn = document.getElementById("calc-btn");
            calcBtn.innerText = "Calculate Rate Adjustment";
            calcBtn.style.backgroundColor = "#0056b3"; // Blue
            calcBtn.disabled = false;

            document.getElementById("new-fsbs").select();
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
            
            let targetRowIndex = getRowIndex(newFSBS);
            let targetColIndex = 2; // New starts always in Col 2
            
            resultBox.className = "result-success";
            resultBox.style.display = "block";
            
            if (newFSBS < 110) {
                isHeld = true;
                targetColIndex = 1; 
                resultBox.className = "result-danger";
                resultText.innerHTML = `<strong>ACTION REQUIRED: DO NOT START INFUSION.</strong><br>FSBS is < 110. Recheck in 30 minutes. Once FSBS > 120, you will start the drip in Column 1.`;
                timerContainer.style.display = "block";
                document.getElementById("start-timer-btn").style.display = "inline-block";
                document.getElementById("timer-display").style.display = "none";
                document.getElementById("stop-alarm-btn").style.display = "none";
            } else {
                isHeld = false;
                let finalRate = getRateValue(targetRowIndex, targetColIndex);
                resultText.innerHTML = `<strong>NEW START RATE: ${finalRate} ml/hr</strong> (Column 2, Row ${gridData[targetRowIndex][0]})<br><br><strong>Why:</strong> New continuous insulin infusions always begin in Column 2.`;
            }
            
            selectedRowIndex = targetRowIndex;
            selectedColIndex = targetColIndex;
            updateCurrentUI();
        }

        // ADJUSTMENT LOGIC
        function calculateNewRate() {
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

            let targetRowIndex = getRowIndex(newFSBS);
            let targetColIndex = selectedColIndex;
            let actionTaken = "";
            let alertClass = "result-success";

            if (isHeld) {
                if (newFSBS <= 120) {
                    alertClass = "result-danger";
                    actionTaken = "<strong>DO NOT RESTART YET.</strong> FSBS must be > 120 to restart the infusion. Keep holding and recheck.";
                    targetRowIndex = selectedRowIndex; 
                } else {
                    actionTaken = "Restarting from Hold: Resuming 1 column to the left of the pre-hold column.";
                    isHeld = false;
                }
            } else {
                if (newFSBS < 110) {
                    targetColIndex = Math.max(1, selectedColIndex - 1);
                    actionTaken = "<strong>HOLD INFUSION IMMEDIATELY.</strong> Recheck in 30 minutes. Once FSBS > 120, restart 1 column to the left.";
                    alertClass = "result-danger";
                    isHeld = true;
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
            }

            resultBox.className = alertClass;
            resultBox.style.display = "block";
            
            if (isHeld) {
                resultText.innerHTML = `<strong>ACTION REQUIRED:</strong> ${actionTaken}`;
                timerContainer.style.display = "block";
                document.getElementById("start-timer-btn").style.display = "inline-block";
                document.getElementById("timer-display").style.display = "none";
                document.getElementById("stop-alarm-btn").style.display = "none";
            } else {
                let finalRate = getRateValue(targetRowIndex, targetColIndex);
                let mathNote = targetColIndex > 16 ? ` <em>(Calculated as Col 16 + Col ${targetColIndex - 16})</em>` : "";
                resultText.innerHTML = `<strong>NEW RATE: ${finalRate} ml/hr</strong> (Column ${targetColIndex}, Row ${gridData[targetRowIndex][0]})${mathNote}<br><br><strong>Why:</strong> ${actionTaken}`;
            }

            selectedRowIndex = targetRowIndex;
            selectedColIndex = targetColIndex;
            updateCurrentUI();
        }
        
        // TIMER LOGIC (Updated to bypass browser background throttling)
        function startHypoTimer() {
            document.getElementById("start-timer-btn").style.display = "none";
            const timerDisplay = document.getElementById("timer-display");
            timerDisplay.style.display = "block";
            timerDisplay.innerText = "30:00";
            
            // Calculate the exact absolute time 30 minutes from right now
            const durationInSeconds = 30 * 60;
            const endTime = Date.now() + (durationInSeconds * 1000);
            
            clearInterval(timerInterval);
            timerInterval = setInterval(function() {
                // Calculate actual time left based on the system clock, not browser ticks
                let timeLeft = Math.round((endTime - Date.now()) / 1000);
                
                if (timeLeft <= 0) {
                    clearInterval(timerInterval);
                    timerDisplay.innerText = "RECHECK FSBS NOW!";
                    timerDisplay.style.color = "#ff3333";
                    document.getElementById("alarm-sound").play();
                    document.getElementById("stop-alarm-btn").style.display = "inline-block";
                    return;
                }

                let minutes = Math.floor(timeLeft / 60);
                let seconds = timeLeft % 60;
                
                if (seconds < 10) seconds = "0" + seconds;
                timerDisplay.innerText = `${minutes}:${seconds}`;
                
            }, 1000);
        }
        
        function stopAlarm() {
            document.getElementById("alarm-sound").pause();
            document.getElementById("alarm-sound").currentTime = 0;
            document.getElementById("stop-alarm-btn").style.display = "none";
            document.getElementById("timer-display").innerText = "Timer Stopped";
            document.getElementById("timer-display").style.color = "#721c24";
        }

        // ENTER KEY HANDLER (Routes to smart function)
        document.getElementById("new-fsbs").addEventListener("keypress", function(event) {
            if (event.key === "Enter") {
                event.preventDefault();
                if(this.value.length > 0) {
                    processCalculation();
                }
            }
        });

        // RESET 
        function resetCalculator() {
            selectedRowIndex = -1;
            selectedColIndex = -1;
            isHeld = false;
            clearInterval(timerInterval);
            document.getElementById("alarm-sound").pause();
            
            document.getElementById("display-current").innerText = "None (Click the grid below)";
            document.getElementById("display-current").style.color = "#0056b3";
            document.getElementById("new-fsbs").value = "";
            
            // Revert button to New Start mode
            const calcBtn = document.getElementById("calc-btn");
            calcBtn.innerText = "Calculate NEW Infusion Start";
            calcBtn.style.backgroundColor = "#17a2b8";
            calcBtn.disabled = true;
            
            document.getElementById("result-box").style.display = "none";
            document.getElementById("timer-container").style.display = "none";
            document.getElementById("timer-display").style.color = "black";
            
            document.querySelectorAll(".cell-btn").forEach(btn => btn.classList.remove("selected", "target"));
        }
