let scannedCodes = [];
let video;
let db;

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

async function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('AttendanceDB', 1);

        request.onerror = function(event) {
            console.error('IndexedDB error:', event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = function(event) {
            db = event.target.result;
            resolve(db);
        };

        request.onupgradeneeded = function(event) {
            const db = event.target.result;
            const objectStore = db.createObjectStore('scannedCodes', { keyPath: 'timestamp' });
            objectStore.createIndex('timestamp', 'timestamp', { unique: true });
        };
    });
}

async function loadDataFromDB() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['scannedCodes'], 'readonly');
        const objectStore = transaction.objectStore('scannedCodes');
        const request = objectStore.getAll();

        request.onsuccess = function(event) {
            const data = event.target.result;
            scannedCodes = data || [];
            resolve(scannedCodes);
        };

        request.onerror = function(event) {
            console.error('Error loading data from IndexedDB:', event.target.error);
            reject(event.target.error);
        };
    });
}

async function storeDataInDB(data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['scannedCodes'], 'readwrite');
        const objectStore = transaction.objectStore('scannedCodes');

        data.forEach(item => {
            const request = objectStore.put(item);
            request.onsuccess = function(event) {
                resolve();
            };

            request.onerror = function(event) {
                console.error('Error storing data in IndexedDB:', event.target.error);
                reject(event.target.error);
            };
        });
    });
}

document.addEventListener('DOMContentLoaded', async function () {
    try {
        await openDB();
        await startCamera();
        await loadDataFromDB();

        console.log('IndexedDB initialized and data loaded successfully:', scannedCodes);

        video.addEventListener('loadeddata', function () {
            setInterval(scanQRCode, 1000); 
        });
    } catch (error) {
        console.error('Error initializing IndexedDB or loading data:', error);
    }
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
    storeDataInDB(scannedCodes)
        .then(() => console.log('Data stored in IndexedDB successfully'))
        .catch(error => console.error('Error storing data in IndexedDB:', error));
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
}

function scanQRCode() {
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
            const timestamp = Date.now();

            const existingEntry = scannedCodes.find(entry => entry.content.trim().toLowerCase() === scannedContent);

            if (!existingEntry || (timestamp - existingEntry.timestamp) > 20 * 60 * 60 * 1000) {
                displayScannedContent(scannedContent, timestamp);
                showSuccessMessage();
            } else {
                resultElement.textContent = 'Student already scanned for today.';
            }
        } else {
            resultElement.textContent = 'Invalid Student ID';
        }
    } else {
        resultElement.textContent = 'No QR code detected.';
    }
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes();

    return `${month}/${day}/${year} ${hours}:${minutes < 10 ? '0' + minutes : minutes}`;
}
