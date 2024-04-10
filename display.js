function getAttendanceDataFromIndexedDB() {
    return new Promise((resolve, reject) => {
        const dbPromise = window.indexedDB.open('attendanceDB', 1);

        dbPromise.onerror = function (event) {
            reject(event.target.error);
        };

        dbPromise.onsuccess = function (event) {
            const db = event.target.result;
            const transaction = db.transaction('attendance', 'readonly');
            const objectStore = transaction.objectStore('attendance');
            const request = objectStore.getAll();

            request.onerror = function(event) {
                reject(event.target.error);
            };

            request.onsuccess = function(event) {
                resolve(request.result);
            };
        };
    });
}

function deleteAttendanceDataFromIndexedDB(id) {
    return new Promise((resolve, reject) => {
        const dbPromise = window.indexedDB.open('attendanceDB', 1);

        dbPromise.onerror = function (event) {
            reject(event.target.error);
        };

        dbPromise.onsuccess = function (event) {
            const db = event.target.result;
            const transaction = db.transaction('attendance', 'readwrite');
            const objectStore = transaction.objectStore('attendance');
            const request = objectStore.delete(id);

            request.onerror = function(event) {
                reject(event.target.error);
            };

            request.onsuccess = function(event) {
                resolve();
            };
        };
    });
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

function displayAttendanceData() {
    getAttendanceDataFromIndexedDB()
        .then(attendanceData => {
            const attendanceTableBody = document.getElementById('attendance-table-body');
            attendanceTableBody.innerHTML = '';

            const displayedTimestamps = []; // Array to keep track of displayed timestamps

            attendanceData.forEach((entry) => {
                // Check if the timestamp is already displayed
                if (!displayedTimestamps.includes(entry.timestamp)) {
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

                    const deleteCell = document.createElement('td');
                    const deleteButton = document.createElement('button');
                    deleteButton.textContent = 'Delete';
                    deleteButton.classList.add('delete-button');
                    deleteButton.addEventListener('click', function() {
                        deleteAttendance(entry.id);
                    });
                    deleteCell.appendChild(deleteButton);
                    newRow.appendChild(deleteCell);

                    attendanceTableBody.appendChild(newRow);

                    displayedTimestamps.push(entry.timestamp); // Add the timestamp to the displayed timestamps array
                }
            });
        })
        .catch(error => {
            console.error('Error fetching data from IndexedDB:', error);
        });
}


document.addEventListener('DOMContentLoaded', function () {
    displayAttendanceData();
});

function deleteAttendance(id) {
    deleteAttendanceDataFromIndexedDB(id)
        .then(() => {
            displayAttendanceData();
        })
        .catch(error => {
            console.error('Error deleting data:', error);
        });
}

function deleteAllAttendanceData() {
    if (confirm('Are you sure you want to delete all attendance data?')) {
        const dbPromise = window.indexedDB.open('attendanceDB', 1);

        dbPromise.onerror = function (event) {
            console.error('Error opening IndexedDB:', event.target.error);
        };

        dbPromise.onsuccess = function (event) {
            const db = event.target.result;
            const transaction = db.transaction('attendance', 'readwrite');
            const objectStore = transaction.objectStore('attendance');
            const request = objectStore.clear();

            request.onerror = function(event) {
                console.error('Error clearing data:', event.target.error);
            };

            request.onsuccess = function(event) {
                displayAttendanceData();
            };
        };
    }
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

document.getElementById('searchInput').addEventListener('input', searchAttendance);
