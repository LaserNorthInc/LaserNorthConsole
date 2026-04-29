// SECTION: SHEET PAGE LOGIC
let inventoryData = [];

document.addEventListener('DOMContentLoaded', () => {
    populateDropdowns();
    if (typeof auth !== 'undefined') {
        auth.onAuthStateChanged(user => { if (user) loadSheetData(); });
    }
});

// Helper for MM/DD/YYYY format
function getFormattedDate() {
    const d = new Date();
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
}

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
        el.innerHTML = (id.startsWith('filter')) ? '<option value="All">All</option>' : '';
        selects[id].forEach(opt => {
            let o = document.createElement('option');
            o.value = opt; o.textContent = opt;
            el.appendChild(o);
        });
    }
}

async function loadSheetData() {
    const filterEl = document.getElementById('filter-type');
    const selectedTab = filterEl ? filterEl.value : "All";
    if (typeof SHEET_CONFIG === 'undefined') return;

    try {
        const res = await fetch(`${SHEET_CONFIG.SCRIPT_URL}?id=${SHEET_CONFIG.IDS.FULL_SHEET}&tab=${selectedTab}`);
        inventoryData = await res.json();
        filterInventory();
    } catch(e) { console.error("Fetch failed", e); }
}

function filterInventory() {
    const fThick = document.getElementById('filter-thick')?.value || "All";
    const fLoc = document.getElementById('filter-loc')?.value || "All";
    const fStatus = document.getElementById('filter-status')?.value || "";
    const fCert = document.getElementById('filter-cert')?.value?.toLowerCase() || "";
    const fSize = document.getElementById('filter-size')?.value?.toLowerCase() || "";

    const filtered = inventoryData.filter(item => {
        const matchesStatus = !fStatus || (fStatus === "AVAILABLE" ? item.reserve === 'AVAILABLE' : item.reserve !== 'AVAILABLE');
        const matchesThick = fThick === "All" || item.thickness === fThick;
        const matchesLoc = fLoc === "All" || item.location === fLoc;
        const matchesCert = !fCert || String(item.cert).toLowerCase().includes(fCert);
        const matchesSize = !fSize || String(item.size).toLowerCase().includes(fSize);
        return matchesStatus && matchesThick && matchesLoc && matchesCert && matchesSize;
    });
    renderTable(filtered);
}

function renderTable(data) {
    const list = document.getElementById('sheet-list');
    if (!list) return;
    list.innerHTML = data.map(item => `
        <tr>
            <td style="color:var(--accent); font-weight:700;">${item.id}</td>
            <td>${item.type}</td><td>${item.thickness}</td><td>${item.size}</td><td>${item.location}</td>
            <td>${item.cert}</td><td>${item.dateAdded}</td>
            <td class="${item.reserve === 'AVAILABLE' ? 'status-available' : 'status-reserved'}">${item.reserve}</td>
            <td>${item.user}</td>
            <td style="text-align:center;">
                <button onclick="openReserveModal(${item.rowNumber}, '${item.id}', '${item.tabName}')" class="action-btn btn-reserve">RESERVE</button>
                <button onclick="useItem(${item.rowNumber}, '${item.id}', '${item.tabName}')" class="action-btn btn-use">USE</button>
            </td>
        </tr>
    `).join('');
}

async function useItem(row, id, tab) {
    if (!confirm(`REMOVE ${id} from inventory?`)) return;
    await postToGoogle({ action: 'use', rowNumber: row, tabName: tab });
}

async function submitNewItem() {
    const type = document.getElementById('new-type').value;
    const len = document.getElementById('new-len').value;
    const wid = document.getElementById('new-wid').value;
    if(!type || !len || !wid) return alert("Fill required fields");

    const payload = {
        action: 'add',
        tabName: type,
        id: 'LN-' + Math.random().toString(36).substr(2,4).toUpperCase(),
        type: type,
        thickness: document.getElementById('new-thickness').value,
        size: `${len} x ${wid}`,
        location: document.getElementById('new-location').value,
        cert: document.getElementById('new-cert-add').value,
        notes: document.getElementById('new-notes').value,
        user: auth.currentUser.email,
        dateAdded: getFormattedDate(),
        reservedFor: 'AVAILABLE'
    };
    await postToGoogle(payload);
}

function clearFilters() {
    const ids = ['filter-type', 'filter-thick', 'filter-loc', 'filter-status', 'filter-cert', 'filter-size'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = (id.includes('type') || id.includes('thick') || id.includes('loc')) ? "All" : "";
    });
    loadSheetData();
}

async function postToGoogle(payload) {
    if (typeof SHEET_CONFIG === 'undefined') return;
    payload.sheetId = SHEET_CONFIG.IDS.FULL_SHEET;
    try {
        await fetch(SHEET_CONFIG.SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
        location.reload();
    } catch(e) { alert("Action saved. Refreshing..."); location.reload(); }
}

function toggleForm() {
    const f = document.getElementById('add-item-form');
    if (f) f.style.display = f.style.display === 'none' ? 'block' : 'none';
}