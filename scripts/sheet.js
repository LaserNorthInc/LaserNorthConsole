// SECTION: SHARED RESOURCE LOGIC
let cachedInventory = [];

document.addEventListener('DOMContentLoaded', () => {
    initializeInterface();
    if (typeof auth !== 'undefined') {
        auth.onAuthStateChanged(user => { if (user) loadInventoryData(); });
    }
});

function initializeInterface() {
    populateDropdowns();
}

function populateDropdowns() {
    const dropdownMapping = {
        'filter-material': DATA_OPTIONS.materials,
        'new-type': DATA_OPTIONS.materials.filter(m => m !== 'All'),
        'filter-thickness': DATA_OPTIONS.thicknesses,
        'new-thickness': DATA_OPTIONS.thicknesses,
        'filter-location': DATA_OPTIONS.locations,
        'new-location': DATA_OPTIONS.locations
    };
    for (const [id, options] of Object.entries(dropdownMapping)) {
        const el = document.getElementById(id);
        if (!el) continue;
        el.innerHTML = id.startsWith('filter') ? '<option value="All">All</option>' : '';
        options.forEach(opt => {
            const o = document.createElement('option');
            o.value = opt; o.textContent = opt;
            el.appendChild(o);
        });
    }
}

async function loadInventoryData() {
    const spreadsheetId = window.CURRENT_RESOURCE_ID;
    const materialSelect = document.getElementById('filter-material');
    const selectedTab = materialSelect ? materialSelect.value : "All";
    if (!spreadsheetId || typeof SHEET_CONFIG === 'undefined') return;

    try {
        const response = await fetch(`${SHEET_CONFIG.SCRIPT_URL}?id=${spreadsheetId}&tab=${selectedTab}`);
        cachedInventory = await response.json();
        applyFilters();
    } catch (e) { console.error("Fetch failed", e); }
}

function applyFilters() {
    const thickness = document.getElementById('filter-thickness')?.value || "All";
    const location = document.getElementById('filter-location')?.value || "All";
    const status = document.getElementById('filter-status')?.value || "";
    const certSearch = document.getElementById('filter-cert')?.value?.toLowerCase() || "";
    const sizeSearch = document.getElementById('filter-size')?.value?.toLowerCase() || "";

    const filtered = cachedInventory.filter(item => {
        const matchStatus = !status || (status === "AVAILABLE" ? item.reserve === 'AVAILABLE' : item.reserve !== 'AVAILABLE');
        const matchThick = thickness === "All" || item.thickness === thickness;
        const matchLoc = location === "All" || item.location === location;
        const matchCert = !certSearch || String(item.cert || "").toLowerCase().includes(certSearch);
        const matchSize = !sizeSearch || String(item.size || "").toLowerCase().includes(sizeSearch);
        return matchStatus && matchThick && matchLoc && matchCert && matchSize;
    });
    renderInventoryTable(filtered);
}

function renderInventoryTable(data) {
    const tableBody = document.getElementById('inventory-table-body');
    if (!tableBody) return;

    // Check if we are on the Full Sheet page
    const isFullSheet = window.CURRENT_RESOURCE_ID === SHEET_CONFIG.IDS.FULL_SHEET;

    tableBody.innerHTML = data.map(item => `
        <tr>
            <td class="id-cell">${item.id}</td>
            <td>${item.type}</td>
            <td>${item.thickness}</td>
            <td>${item.size}</td>
            <td>${item.location}</td>
            <td>${isFullSheet ? (item.qty || 1) : (item.cert || 'N/A')}</td>
            <td>${item.dateAdded}</td>
            <td class="${item.reserve === 'AVAILABLE' ? 'status-ready' : 'status-held'}">${item.reserve}</td>
            <td>${item.user}</td>
            <td class="action-cell">
                <button onclick="openReserveModal(${item.rowNumber}, '${item.id}', '${item.tabName}')" class="btn-action btn-reserve">RESERVE</button>
                <button onclick="removeResource(${item.rowNumber}, '${item.id}', '${item.tabName}')" class="btn-action btn-remove">USE</button>
            </td>
        </tr>
    `).join('');
}

async function removeResource(row, id, tab) {
    if (!confirm(`Confirm removal of ${id}?`)) return;
    await postTransaction({ action: 'use', rowNumber: row, tabName: tab });
}

async function submitNewItem() {
    const type = document.getElementById('new-type')?.value;
    const thickness = document.getElementById('new-thickness')?.value;
    const len = document.getElementById('new-len')?.value;
    const wid = document.getElementById('new-wid')?.value;
    const loc = document.getElementById('new-location')?.value;
    
    const isFullSheet = window.CURRENT_RESOURCE_ID === SHEET_CONFIG.IDS.FULL_SHEET;
    
    // Logic to toggle between QTY or Cert # based on the page
    const qtyValue = isFullSheet ? document.getElementById('new-qty')?.value : 1;
    const certValue = !isFullSheet ? document.getElementById('new-cert-add')?.value : 'N/A';

    if (!type || !len || !wid) return alert("Fill required fields.");

    const payload = {
        action: 'add',
        tabName: type,
        id: 'LN-' + Math.random().toString(36).substr(2, 4).toUpperCase(),
        type: type,
        thickness: thickness,
        size: `${len} x ${wid}`,
        location: loc,
        cert: certValue,
        qty: qtyValue,
        notes: document.getElementById('new-notes')?.value || '',
        user: auth.currentUser?.email || 'System',
        dateAdded: new Date().toLocaleDateString('en-US'),
        reservedFor: 'AVAILABLE'
    };
    await postTransaction(payload);
}

async function postTransaction(payload) {
    payload.sheetId = window.CURRENT_RESOURCE_ID;
    try {
        await fetch(SHEET_CONFIG.SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
        location.reload();
    } catch(e) { location.reload(); }
}

function resetFilters() {
    const filterIds = ['filter-material', 'filter-thickness', 'filter-location', 'filter-status', 'filter-cert', 'filter-size'];
    filterIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = el.tagName === 'SELECT' ? "All" : "";
    });
    loadInventoryData();
}

function toggleForm() {
    const form = document.getElementById('add-item-form');
    if (form) form.style.display = (form.style.display === 'none' || form.style.display === '') ? 'block' : 'none';
}

function openReserveModal(row, id, tab) {
    const isFullSheet = window.CURRENT_RESOURCE_ID === SHEET_CONFIG.IDS.FULL_SHEET;
    const jobNum = prompt(`Enter Job Number for ${id}:`);
    if (!jobNum) return;

    let payload = { action: 'reserve', rowNumber: row, tabName: tab, jobNum: jobNum };

    if (isFullSheet) {
        const reserveQty = prompt("How many sheets to reserve?");
        if (reserveQty) payload.jobNum += ` (Qty: ${reserveQty})`;
    }

    postTransaction(payload);
}