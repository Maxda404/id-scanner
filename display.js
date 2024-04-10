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

            attendanceData.forEach((entry) => {
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
        })
        .catch(error => {
            console.error('Error fetching data from IndexedDB:', error);
        });
}

document.addEventListener('DOMContentLoaded', function () {
    displayAttendanceData();
});

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
