let inventoryData = [];

document.addEventListener('DOMContentLoaded', () => {
    populateDropdowns();
    auth.onAuthStateChanged(user => { if (user) loadSheetData(); });
});

function toggleMenu() { document.getElementById('nav-links').classList.toggle('open'); }

function populateDropdowns() {
    const selects = {
        'filter-type': DATA_OPTIONS.materials,
        'new-type': DATA_OPTIONS.materials.filter(m => m !== 'All'),
        'filter-thick': DATA_OPTIONS.thicknesses,
        'new-thickness': DATA_OPTIONS.thicknesses,
        'filter-loc': DATA_OPTIONS.locations,
        'new-location': DATA_OPTIONS.locations
    };
    for (let id in selects) {
        const el = document.getElementById(id);
        if (!el) continue;
        selects[id].forEach(opt => {
            let o = document.createElement('option');
            o.value = opt; o.textContent = opt;
            el.appendChild(o);
        });
    }
}

async function loadSheetData() {
    const list = document.getElementById('sheet-list');
    const selectedTab = document.getElementById('filter-type').value || "All";
    list.innerHTML = '<tr><td colspan="10">Loading ' + selectedTab + '...</td></tr>';
    try {
        const res = await fetch(`${SHEET_CONFIG.SCRIPT_URL}?id=${SHEET_CONFIG.IDS.FULL_SHEET}&tab=${selectedTab}`);
        inventoryData = await res.json();
        filterInventory();
    } catch(e) { list.innerHTML = '<tr><td colspan="10">Error fetching data. Check script URL.</td></tr>'; }
}

function filterInventory() {
    const fThick = document.getElementById('filter-thick').value;
    const fLoc = document.getElementById('filter-loc').value;
    const fCert = document.getElementById('filter-cert').value.toLowerCase();
    const fSize = document.getElementById('filter-size').value.toLowerCase();

    const filtered = inventoryData.filter(item => {
        return (!fThick || item.thickness === fThick) &&
               (!fLoc || item.location === fLoc) &&
               (!fCert || item.cert.toLowerCase().includes(fCert)) &&
               (!fSize || item.size.toLowerCase().includes(fSize));
    });
    renderTable(filtered);
}

function renderTable(data) {
    const list = document.getElementById('sheet-list');
    let html = '';
    data.forEach(item => {
        if(item.id) {
            const reserveClass = item.reserve === 'AVAILABLE' ? 'status-available' : 'status-reserved';
            html += `<tr>
                <td data-label="ID" style="color:var(--accent); font-weight:700;">${item.id}</td>
                <td data-label="Type">${item.type}</td>
                <td data-label="Thick">${item.thickness}</td>
                <td data-label="Size">${item.size}</td>
                <td data-label="Location">${item.location}</td>
                <td data-label="Cert">${item.cert}</td>
                <td data-label="Added">${item.dateAdded}</td>
                <td data-label="Reserve" class="${reserveClass}">${item.reserve}</td>
                <td data-label="User">${item.user}</td>
                <td data-label="Actions">
                    <button onclick="openReserveModal(${item.rowNumber}, '${item.id}', '${item.tabName}')" class="action-btn btn-reserve">RESERVE</button>
                    <button onclick="useItem(${item.rowNumber}, '${item.id}', '${item.tabName}')" class="action-btn btn-use">USE</button>
                </td>
            </tr>`;
        }
    });
    list.innerHTML = html || '<tr><td colspan="10">No matches found.</td></tr>';
}

function openReserveModal(row, id, tab) {
    window.currentRow = row; window.currentTab = tab;
    document.getElementById('modal-id').textContent = id;
    document.getElementById('reserve-modal').style.display = 'flex';
}

function closeModal() { document.getElementById('reserve-modal').style.display = 'none'; }

async function submitReserve() {
    const job = document.getElementById('modal-job').value;
    if(!job) return alert("Enter Job #");
    await postToGoogle({ action: 'reserve', rowNumber: window.currentRow, tabName: window.currentTab, jobNum: job });
}

async function useItem(row, id, tab) {
    if(!confirm("USE ITEM: Remove " + id + " from " + tab + " inventory?")) return;
    await postToGoogle({ action: 'use', rowNumber: row, tabName: tab });
}

async function submitNewItem() {
    const type = document.getElementById('new-type').value;
    const len = document.getElementById('new-len').value;
    const wid = document.getElementById('new-wid').value;
    const payload = {
        action: 'add',
        tabName: type,
        id: 'LN-' + Math.random().toString(36).substr(2,4).toUpperCase(),
        type: type,
        thickness: document.getElementById('new-thickness').value,
        size: len + ' x ' + wid,
        location: document.getElementById('new-location').value,
        cert: document.getElementById('new-cert').value,
        notes: document.getElementById('new-notes').value,
        user: auth.currentUser.displayName || auth.currentUser.email,
        dateAdded: new Date().toLocaleDateString(),
        reservedFor: 'AVAILABLE'
    };
    await postToGoogle(payload);
}

async function postToGoogle(payload) {
    payload.sheetId = SHEET_CONFIG.IDS.FULL_SHEET;
    try {
        await fetch(SHEET_CONFIG.SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
        location.reload();
    } catch(e) { alert("Network Error: Action failed."); }
}

function toggleForm() {
    const f = document.getElementById('add-item-form');
    f.style.display = f.style.display === 'none' ? 'block' : 'none';
}