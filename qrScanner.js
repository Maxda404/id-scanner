let scannedCodes = [];
let video;
let isScanning = false; 

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
    await startCamera();
const storedData = localStorage.getItem('attendanceData');
    if (storedData) {
        const parsedData = JSON.parse(storedData);
        scannedCodes.push(parsedData);
        updateAttendanceList();
    }
    video.addEventListener('loadeddata', function () {
        setInterval(scanQRCode, 1000); 
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
        modal.classList.add('hide'); // Add 'hide' class to trigger animation
    }, 1000);

    // Remove the 'hide' class after animation completes
    setTimeout(() => {
        modal.classList.remove('hide');
        modal.style.display = 'none';
    }, 1500);
}


function displayScannedContent(content, timestamp) {
    const resultElement = document.getElementById('result');
    resultElement.innerHTML = '';

    // Display the QR code content
    const contentElement = document.createElement('p');
    contentElement.textContent = content;
    resultElement.appendChild(contentElement);

    // Check if the content is a URL
    const isURL = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i.test(content);

    if (isURL) {
        const link = document.createElement('a');
        link.href = content;
        link.target = '_blank';
        link.textContent = content;
        resultElement.appendChild(link);
    } else {
        resultElement.textContent = content;
    }

    // Display the timestamp
    const timestampElement = document.createElement('p');
    timestampElement.textContent = `Scanned at: ${formatTimestamp(timestamp)}`;
    resultElement.appendChild(timestampElement);

    // Extract LRN, Name, and ID No. from the content
    const matches = content.match(/\[(.*?)\]/g);
    const LRN = matches[0].replace(/\[|\]/g, '');
    const Name = matches[1].replace(/\[|\]/g, ' ').trim(); // Concatenate name components without line breaks
    const IDNo = matches[2].replace(/\[|\]/g, '');

    // Capitalize the first letter of each word in the name
    const capitalizedFullName = Name.replace(/\b\w/g, (char) => char.toUpperCase());

    // Add the scanned code to the array with correct properties
    scannedCodes.push({ content, LRN, name: capitalizedFullName, IDNo, timestamp }); // Include the 'content' property

    // Update the attendance list
    updateAttendanceList();
}

function updateAttendanceList() {
    const attendanceTableBody = document.getElementById('attendance-table-body');

    // Clear existing entries in the table body
    attendanceTableBody.innerHTML = '';

    // Create new entries
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
        nameCell.classList.add('name-cell'); // Add CSS class to prevent text wrapping
        newRow.appendChild(nameCell);

        const idNoCell = document.createElement('td');
        idNoCell.textContent = entry.IDNo;
        idNoCell.classList.add('name-cell'); // Add CSS class to prevent text wrapping
        newRow.appendChild(idNoCell);

        attendanceTableBody.appendChild(newRow);
    });
}

function scanQRCode() {
    // Set the scanning flag to true to indicate that scanning is in progress
    isScanning = true;

    const resultElement = document.getElementById('result');

    const canvasElement = document.createElement('canvas');
    const canvas = canvasElement.getContext('2d');
    canvasElement.width = video.videoWidth;
    canvasElement.height = video.videoHeight;

    canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
    const imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);

    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code) {
        const scannedContent = code.data.trim().toLowerCase(); // Ensure consistency by trimming and converting to lowercase

        // Check if the scanned content contains LRN, Name, and ID No.
        const matches = scannedContent.match(/\[(.*?)\]/g);
        if (matches && matches.length >= 3) {
            const timestamp = Date.now();

            // Check if the scanned content already exists in the array
            const existingEntry = scannedCodes.find(entry => entry.content.trim().toLowerCase() === scannedContent);

            if (!existingEntry || (timestamp - existingEntry.timestamp) > 20 * 60 * 60 * 1000) {
                // Display the scanned content and timestamp
                displayScannedContent(scannedContent, timestamp);

                // Show success message
                showSuccessMessage();
            } else {
                resultElement.textContent = 'Student already scanned for today.';
            }
        } else {
            // Display "Invalid student QR" message if the QR code is missing required information
            resultElement.textContent = 'Invalid Student ID';
        }
    } else {
        resultElement.textContent = 'No QR code detected.';
    }

    // Reset the scanning flag
    isScanning = false;
}

// Function to navigate to the attendance list page
function navigateToAttendanceList() {
    const attendanceList = document.getElementById('attendance-list');
    attendanceList.style.display = 'block';

    // Update the attendance list
    updateAttendanceList();
}

// Function to close the attendance list section
function closeAttendanceList() {
    const attendanceList = document.getElementById('attendance-list');
    attendanceList.style.display = 'none';
}

document.getElementById('attendanceButton').addEventListener('click', function () {
    this.classList.add('button-clicked'); // Add class to change background color
    setTimeout(() => {
        this.classList.remove('button-clicked'); // Remove class after a short delay
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

// Function to filter and display attendance entries based on search query
function searchAttendance() {
    const searchInput = document.getElementById('searchInput').value.toLowerCase();
    const rows = document.querySelectorAll('#attendance-table-body tr');

    rows.forEach(row => {
        const lrn = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
        const name = row.querySelector('td:nth-child(3)').textContent.toLowerCase();
        const idNo = row.querySelector('td:nth-child(4)').textContent.toLowerCase();
        const dateAndTime = row.querySelector('td:nth-child(1)').textContent.toLowerCase(); // Include date and time column

        if (lrn.includes(searchInput) || name.includes(searchInput) || idNo.includes(searchInput) || dateAndTime.includes(searchInput)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}
// Function to store attendance data locally
function storeAttendanceDataLocally(data) {
    localStorage.setItem('attendanceData', JSON.stringify(data));
}

// Function to handle scanned data and store it locally
function handleScannedData(content, timestamp, LRN, name, IDNo) {
    const attendanceData = {
        content,
        timestamp,
        LRN,
        name,
        IDNo
    };
    // Store attendance data locally
    storeAttendanceDataLocally(attendanceData);
}


