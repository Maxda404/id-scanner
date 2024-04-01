// Function to retrieve attendance data from localStorage
function getAttendanceDataFromLocalStorage() {
    const storedData = localStorage.getItem('attendanceData');
    if (storedData) {
        return JSON.parse(storedData);
    }
    return [];
}

// Function to display attendance data
function displayAttendanceData() {
    const attendanceData = getAttendanceDataFromLocalStorage();
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
        nameCell.classList.add('name-cell'); // Add CSS class to prevent text wrapping
        newRow.appendChild(nameCell);

        const idNoCell = document.createElement('td');
        idNoCell.textContent = entry.IDNo;
        idNoCell.classList.add('name-cell'); // Add CSS class to prevent text wrapping
        newRow.appendChild(idNoCell);

        attendanceTableBody.appendChild(newRow);
    });
}

// Call this function when the page is loaded to display attendance data
document.addEventListener('DOMContentLoaded', function () {
    displayAttendanceData();
});
