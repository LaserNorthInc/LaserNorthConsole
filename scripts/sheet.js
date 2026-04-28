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
    list.innerHTML = '<tr><td colspan="10">Loading inventory...</td></tr>';
    
    try {
        const res = await fetch(SHEET_CONFIG.getReadUrl(SHEET_CONFIG.IDS.FULL_SHEET));
        const data = await res.text();
        const rows = data.split('\n').slice(1);
        let html = '';

        rows.forEach(r => {
            const cols = r.split(',').map(c => c.replace(/"/g, ''));
            if(cols[0]) {
                const [id, type, thick, size, loc, cert, date, reserve, user, notes] = cols;
                const reserveClass = reserve === 'AVAILABLE' ? 'status-available' : 'status-reserved';
                html += `
                    <tr>
                        <td data-label="ID" class="col-highlight">${id}</td>
                        <td data-label="Type">${type}</td>
                        <td data-label="Thickness">${thick}</td>
                        <td data-label="Size">${size}</td>
                        <td data-label="Location">${loc}</td>
                        <td data-label="Cert">${cert}</td>
                        <td data-label="Date Added">${date}</td>
                        <td data-label="Reserve" class="${reserveClass}">${reserve}</td>
                        <td data-label="User">${user}</td>
                        <td data-label="Notes">${notes}</td>
                    </tr>`;
            }
        });
        list.innerHTML = html;
    } catch(e) { list.innerHTML = '<tr><td colspan="10">Error loading sheet data.</td></tr>'; }
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