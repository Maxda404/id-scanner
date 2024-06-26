let scannedCodes = [];
let video;
let isScanning = false;
let dbPromise;

function openDB() {
    return new Promise((resolve, reject) => {
        dbPromise = window.indexedDB.open('attendanceDB', 1);

        dbPromise.onupgradeneeded = function (event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('attendance')) {
                db.createObjectStore('attendance', { keyPath: 'id', autoIncrement: true });
            }
        };

        dbPromise.onerror = function (event) {
            console.error('Error accessing IndexedDB:', event.target.error);
            reject(event.target.error);
        };

        dbPromise.onsuccess = function (event) {
            resolve(event.target.result);
        };
    });
}

function storeScannedDataIndexedDB(data) {
    openDB().then(db => {
        const tx = db.transaction('attendance', 'readwrite');
        const store = tx.objectStore('attendance');
        data.forEach(entry => {
            const request = store.get(entry.content);
            request.onsuccess = function(event) {
                const existingEntry = event.target.result;
                if (!existingEntry) {
                    // If the entry doesn't already exist, add it to the database
                    store.add(entry);
                }
            };
            request.onerror = function(event) {
                console.error('Error checking for existing entry:', event.target.error);
            };
        });
        tx.oncomplete = function () {
            console.log('Scanned data stored in IndexedDB');
        };
        tx.onerror = function (event) {
            console.error('Error storing scanned data:', event.target.error);
        };
    }).catch(error => {
        console.error('Error opening IndexedDB:', error);
    });
}


async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video = document.getElementById('qr-video');
        video.srcObject = stream;

        return new Promise((resolve) => {
            video.onloadedmetadata = () => {
                resolve(video);
            };
        });
    } catch (error) {
        console.error('Error accessing camera:', error);
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    await openDB();
    await startCamera();
    const storedData = localStorage.getItem('attendanceData');
    if (storedData) {
        scannedCodes = JSON.parse(storedData);
        updateAttendanceList();
    }

    video.addEventListener('loadeddata', function () {
        scanQRCode();
    });
});

function stopCamera(stream) {
    const tracks = stream.getTracks();
    tracks.forEach(track => track.stop());
}

function showSuccessMessage() {
    const modal = document.getElementById('modal');
    modal.style.display = 'block';

    setTimeout(() => {
        modal.classList.add('hide');
    }, 1000);

    setTimeout(() => {
        modal.classList.remove('hide');
        modal.style.display = 'none';
    }, 1500);
}

function storeScannedDataLocally() {
    localStorage.setItem('attendanceData', JSON.stringify(scannedCodes));
    storeScannedDataIndexedDB(scannedCodes);
}

function displayScannedContent(content, timestamp) {
    const resultElement = document.getElementById('result');
    resultElement.innerHTML = '';

    const contentElement = document.createElement('p');
    contentElement.textContent = content;
    resultElement.appendChild(contentElement);

    const timestampElement = document.createElement('p');
    timestampElement.textContent = `Scanned at: ${formatTimestamp(timestamp)}`;
    resultElement.appendChild(timestampElement);

    const matches = content.match(/\[(.*?)\]/g);
    const LRN = matches[0].replace(/\[|\]/g, '');
    const Name = matches[1].replace(/\[|\]/g, ' ').trim();
    const IDNo = matches[2].replace(/\[|\]/g, '');

    const capitalizedFullName = Name.replace(/\b\w/g, (char) => char.toUpperCase());

   
    const isAlreadyScanned = scannedCodes.some(code => code.content === content);
    
    if (!isAlreadyScanned) {
        
        scannedCodes.push({ content, LRN, name: capitalizedFullName, IDNo, timestamp });
        updateAttendanceList();
        showSuccessMessage();
    }

  
    const scanAudio = document.getElementById('scanAudio');
    if (scanAudio) {
        scanAudio.play();
    }
}


function updateAttendanceList() {
    const attendanceTableBody = document.getElementById('attendance-table-body');

    attendanceTableBody.innerHTML = '';

    scannedCodes.forEach((entry, index) => {
        const newRow = document.createElement('tr');
        newRow.classList.add('entry');

        const dateCell = document.createElement('td');
        dateCell.textContent = formatTimestamp(entry.timestamp);
        newRow.appendChild(dateCell);

        const lrnCell = document.createElement('td');
        lrnCell.textContent = entry.LRN;
        newRow.appendChild(lrnCell);

        const nameCell = document.createElement('td');
        nameCell.textContent = entry.name;
        nameCell.classList.add('name-cell');
        newRow.appendChild(nameCell);

        const idNoCell = document.createElement('td');
        idNoCell.textContent = entry.IDNo;
        idNoCell.classList.add('name-cell');
        newRow.appendChild(idNoCell);

        attendanceTableBody.appendChild(newRow);
    });

    storeScannedDataLocally();
}

function scanQRCode() {
    if (isScanning) return;
    isScanning = true;

    const now = Date.now(); // Current timestamp
    const resultElement = document.getElementById('result');

    const canvasElement = document.createElement('canvas');
    const canvas = canvasElement.getContext('2d');
    canvasElement.width = video.videoWidth;
    canvasElement.height = video.videoHeight;

    canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
    const imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);

    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code) {
        const scannedContent = code.data.trim().toLowerCase();

        const matches = scannedContent.match(/\[(.*?)\]/g);
        if (matches && matches.length >= 3) {
            const timestamp = now; // Use milliseconds

            // Check if any previous scan occurred on the same day
            const isAlreadyScanned = scannedCodes.some(code => {
                const date = new Date(code.timestamp);
                const currentDay = new Date(timestamp).getDate();
                const scannedDay = date.getDate();
                return code.content === scannedContent && currentDay === scannedDay;
            });

            if (!isAlreadyScanned) {
                displayScannedContent(scannedContent, timestamp);
            } else {
                resultElement.textContent = 'Student already scanned today.';
            }
        } else {
            resultElement.textContent = 'Invalid Student ID';
        }
    } else {
        resultElement.textContent = 'No QR code detected.';
    }

    // Call the function again after 1 second
    setTimeout(scanQRCode, 1000);

    isScanning = false;
}


function displayScannedContent(content, timestamp) {
    const resultElement = document.getElementById('result');
    resultElement.innerHTML = '';

    const contentElement = document.createElement('p');
    contentElement.textContent = content;
    resultElement.appendChild(contentElement);

    const timestampElement = document.createElement('p');
    timestampElement.textContent = `Scanned at: ${formatTimestamp(timestamp)}`;
    resultElement.appendChild(timestampElement);

    const matches = content.match(/\[(.*?)\]/g);
    const LRN = matches[0].replace(/\[|\]/g, '');
    const Name = matches[1].replace(/\[|\]/g, ' ').trim();
    const IDNo = matches[2].replace(/\[|\]/g, '');

    const capitalizedFullName = Name.replace(/\b\w/g, (char) => char.toUpperCase());

    scannedCodes.push({ content, LRN, name: capitalizedFullName, IDNo, timestamp });
    updateAttendanceList();
    showSuccessMessage();
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const milliseconds = date.getMilliseconds();

    return `${month}/${day}/${year} ${hours}:${minutes < 10 ? '0' + minutes : minutes}:${seconds < 10 ? '0' + seconds : seconds}.${milliseconds}`;
}


function navigateToAttendanceList() {
    const attendanceList = document.getElementById('attendance-list');
    attendanceList.style.display = 'block';

    updateAttendanceList();
}

function closeAttendanceList() {
    const attendanceList = document.getElementById('attendance-list');
    attendanceList.style.display = 'none';
}

document.getElementById('attendanceButton').addEventListener('click', function () {
    this.classList.add('button-clicked');
    setTimeout(() => {
        this.classList.remove('button-clicked');
    }, 100);
    navigateToAttendanceList();
});

document.addEventListener('beforeunload', () => {
    stopCamera(video.srcObject);
});

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes();

    return `${month}/${day}/${year} ${hours}:${minutes < 10 ? '0' + minutes : minutes}`;
}

function searchAttendance() {
    const searchInput = document.getElementById('searchInput').value.toLowerCase();
    const rows = document.querySelectorAll('#attendance-table-body tr');

    rows.forEach(row => {
        const lrn = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
        const name = row.querySelector('td:nth-child(3)').textContent.toLowerCase();
        const idNo = row.querySelector('td:nth-child(4)').textContent.toLowerCase();
        const dateAndTime = row.querySelector('td:nth-child(1)').textContent.toLowerCase();

        if (lrn.includes(searchInput) || name.includes(searchInput) || idNo.includes(searchInput) || dateAndTime.includes(searchInput)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}
