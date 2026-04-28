/* PLANT LOGIC: This script pulls the rack data and handles the search filters */
let inventoryData = []; 

document.addEventListener('DOMContentLoaded', () => {
    // Check if team member is logged in
    auth.onAuthStateChanged(user => {
        if (user) { loadSheetData(); }
    });
});

// COLLAPSIBLE MENU LOGIC for Mobile
function toggleMenu() {
    document.getElementById('nav-links').classList.toggle('open');
}

// FETCH DATA from the Private Google Proxy
async function loadSheetData() {
    const list = document.getElementById('sheet-list');
    list.innerHTML = '<tr><td colspan="10">Loading Rack Data...</td></tr>';
    try {
        // We ask the Google Script URL for data using the Sheet ID
        const res = await fetch(`${SHEET_CONFIG.SCRIPT_URL}?id=${SHEET_CONFIG.IDS.FULL_SHEET}`);
        inventoryData = await res.json();
        renderTable(inventoryData);
    } catch(e) {
        list.innerHTML = '<tr><td colspan="10">Error loading database. Check permissions.</td></tr>';
    }
}

// DRAW THE LIST on the screen
function renderTable(data) {
    const list = document.getElementById('sheet-list');
    let html = '';
    data.forEach(item => {
        if(item.id) {
            const reserveClass = item.reserve === 'AVAILABLE' ? 'status-available' : 'status-reserved';
            html += `<tr>
                <td data-label="ID" class="col-highlight">${item.id}</td>
                <td data-label="Type">${item.type}</td>
                <td data-label="Thick">${item.thickness}</td>
                <td data-label="Size">${item.size}</td>
                <td data-label="Location">${item.location}</td>
                <td data-label="Cert">${item.cert}</td>
                <td data-label="Added">${item.dateAdded}</td>
                <td data-label="Reserve" class="${reserveClass}">${item.reserve}</td>
                <td data-label="User">${item.user}</td>
                <td data-label="Notes">${item.notes}</td>
            </tr>`;
        }
    });
    list.innerHTML = html;
}

// SEARCH FILTER LOGIC: Checks every box as you type
function filterInventory() {
    const fType = document.getElementById('filter-type').value.toLowerCase();
    const fThick = document.getElementById('filter-thick').value.toLowerCase();
    const fSize = document.getElementById('filter-size').value.toLowerCase();
    const fCert = document.getElementById('filter-cert').value.toLowerCase();
    const fRes = document.getElementById('filter-reserve').value;

    const filtered = inventoryData.filter(item => {
        const matchType = item.type.toString().toLowerCase().includes(fType);
        const matchThick = item.thickness.toString().toLowerCase().includes(fThick);
        const matchSize = item.size.toString().toLowerCase().includes(fSize);
        const matchCert = item.cert.toString().toLowerCase().includes(fCert);
        let matchRes = true;
        if(fRes === 'AVAILABLE') matchRes = (item.reserve === 'AVAILABLE');
        if(fRes === 'RESERVED') matchRes = (item.reserve !== 'AVAILABLE');
        
        return matchType && matchThick && matchSize && matchCert && matchRes;
    });
    renderTable(filtered);
}

// UPLOAD NEW ITEM LOGIC
async function submitNewItem() {
    const user = auth.currentUser;
    const today = new Date();
    const payload = {
        sheetId: SHEET_CONFIG.IDS.FULL_SHEET,
        id: 'LN-' + Math.random().toString(36).substr(2, 4).toUpperCase(),
        type: document.getElementById('new-type').value,
        thickness: document.getElementById('new-thickness').value,
        size: document.getElementById('new-size').value,
        location: document.getElementById('new-location').value,
        cert: document.getElementById('new-cert').value,
        notes: document.getElementById('new-notes').value,
        user: user.displayName || user.email,
        dateAdded: (today.getMonth()+1)+'/'+today.getDate()+'/'+today.getFullYear(),
        reservedFor: document.getElementById('new-job').value || "AVAILABLE"
    };

    try {
        await fetch(SHEET_CONFIG.SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
        alert("Success: " + payload.id);
        location.reload();
    } catch(e) { alert("Error uploading to sheet."); }
}

function toggleForm() {
    const f = document.getElementById('add-item-form');
    f.style.display = f.style.display === 'none' ? 'block' : 'none';
}