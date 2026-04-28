document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            // Display Admin tools if authorized
            const adminArea = document.getElementById('admin-tools');
            if (user.email.includes('admin') || user.email.includes('lasernorth')) {
                adminArea.style.display = 'flex';
            }
            loadSheetData();
        }
    });
});

function generateID() {
    return 'LN-' + Math.random().toString(36).substr(2, 4).toUpperCase();
}

async function loadSheetData() {
    const list = document.getElementById('sheet-list');
    list.innerHTML = '<tr><td colspan="10">Loading Private Inventory...</td></tr>';
    
    try {
        // We call your Script URL and pass the Sheet ID as a parameter
        const res = await fetch(`${SHEET_CONFIG.SCRIPT_URL}?id=${SHEET_CONFIG.IDS.FULL_SHEET}`);
        const data = await res.json();

        if (data.error) throw new Error(data.error);

        let html = '';
        data.forEach(item => {
            if(item.id) {
                const reserveClass = item.reserve === 'AVAILABLE' ? 'status-available' : 'status-reserved';
                html += `
                    <tr>
                        <td data-label="ID" class="col-highlight">${item.id}</td>
                        <td data-label="Type">${item.type}</td>
                        <td data-label="Thickness">${item.thickness}</td>
                        <td data-label="Size">${item.size}</td>
                        <td data-label="Location">${item.location}</td>
                        <td data-label="Cert">${item.cert}</td>
                        <td data-label="Date Added">${item.dateAdded}</td>
                        <td data-label="Reserve" class="${reserveClass}">${item.reserve}</td>
                        <td data-label="User">${item.user}</td>
                        <td data-label="Notes">${item.notes}</td>
                    </tr>`;
            }
        });
        list.innerHTML = html;
    } catch(e) {
        console.error(e);
        list.innerHTML = '<tr><td colspan="10">Error: Could not access private data.</td></tr>';
    }
}

function toggleForm() {
    const f = document.getElementById('add-item-form');
    f.style.display = f.style.display === 'none' ? 'block' : 'none';
}

async function submitNewItem() {
    const user = auth.currentUser;
    const jobNum = document.getElementById('new-job').value;
    const today = new Date();
    const dateStr = (today.getMonth()+1) + '/' + today.getDate() + '/' + today.getFullYear();

    const payload = {
        sheetId: SHEET_CONFIG.IDS.FULL_SHEET,
        id: generateID(),
        type: document.getElementById('new-type').value,
        thickness: document.getElementById('new-thickness').value,
        size: document.getElementById('new-size').value,
        cert: document.getElementById('new-cert').value,
        location: document.getElementById('new-location').value,
        notes: document.getElementById('new-notes').value,
        user: user.displayName || user.email,
        dateAdded: dateStr,
        reservedFor: jobNum || "AVAILABLE"
    };

    try {
        await fetch(SHEET_CONFIG.SCRIPT_URL, { 
            method: 'POST', 
            mode: 'no-cors', 
            body: JSON.stringify(payload) 
        });
        alert("Upload Success: " + payload.id);
        location.reload();
    } catch(e) { alert("Failed to connect to Google Sheets."); }
}