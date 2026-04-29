let cachedInventory = [];

document.addEventListener('DOMContentLoaded', () => {
    initializeInterface();
    if (typeof auth !== 'undefined') {
        auth.onAuthStateChanged(user => { if (user) loadInventoryData(); });
    }
});

// SECTION: CLEAN DATE FORMATTING
function cleanDate(dateStr) {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr; 
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
}

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
    const isFullSheet = window.CURRENT_RESOURCE_ID === SHEET_CONFIG.IDS.FULL_SHEET;

    tableBody.innerHTML = data.map(item => `
        <tr>
            <td class="id-cell" data-label="ID">${item.id}</td>
            <td data-label="Material">${item.type}</td>
            <td data-label="Thick">${item.thickness}</td>
            <td data-label="Size">${item.size}</td>
            <td data-label="Loc">${item.location}</td>
            <td data-label="${isFullSheet ? 'QTY' : 'Cert #'}">${isFullSheet ? (item.qty || 1) : (item.cert || 'N/A')}</td>
            <td data-label="Date">${cleanDate(item.dateAdded)}</td>
            <td data-label="Status" class="${item.reserve === 'AVAILABLE' ? 'status-ready' : 'status-held'}">${item.reserve}</td>
            <td data-label="User">${item.user}</td>
            <td class="action-cell">
                <button onclick="openReserveModal(${item.rowNumber}, '${item.id}', '${item.tabName}', ${item.qty || 1})" class="btn-action btn-reserve">RESERVE</button>
                <button onclick="removeResource(${item.rowNumber}, '${item.id}', '${item.tabName}', ${item.qty || 1})" class="btn-action btn-remove">USE</button>
            </td>
        </tr>
    `).join('');
}

async function removeResource(row, id, tab, currentQty) {
    const isFullSheet = window.CURRENT_RESOURCE_ID === SHEET_CONFIG.IDS.FULL_SHEET;
    if (isFullSheet && currentQty > 1) {
        const used = prompt(`Inventory: ${currentQty} pieces. How many are you using?`, "1");
        if (!used || isNaN(used)) return;
        await postTransaction({ action: 'updateQty', rowNumber: row, tabName: tab, usedQty: parseInt(used) });
    } else {
        if (!confirm(`Confirm removal of ${id}?`)) return;
        await postTransaction({ action: 'use', rowNumber: row, tabName: tab });
    }
}

async function submitNewItem() {
    const type = document.getElementById('new-type')?.value;
    const isFullSheet = window.CURRENT_RESOURCE_ID === SHEET_CONFIG.IDS.FULL_SHEET;
    
    const payload = {
        action: 'add',
        tabName: type,
        id: 'LN-' + Math.random().toString(36).substr(2, 4).toUpperCase(),
        type: type,
        thickness: document.getElementById('new-thickness')?.value,
        size: `${document.getElementById('new-len')?.value} x ${document.getElementById('new-wid')?.value}`,
        location: document.getElementById('new-location')?.value,
        cert: !isFullSheet ? document.getElementById('new-cert-add')?.value : 'N/A',
        qty: isFullSheet ? document.getElementById('new-qty')?.value : 1,
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

function openReserveModal(row, id, tab, currentQty) {
    const isFullSheet = window.CURRENT_RESOURCE_ID === SHEET_CONFIG.IDS.FULL_SHEET;
    const jobNum = prompt(`Enter Job Number for ${id}:`);
    if (!jobNum) return;

    let finalStatus = jobNum;
    if (isFullSheet) {
        const resQty = prompt(`In Stock: ${currentQty}. How many sheets for this job?`, "1");
        if (resQty) finalStatus += ` (Qty: ${resQty})`;
    }

    postTransaction({ action: 'reserve', rowNumber: row, tabName: tab, jobNum: finalStatus });
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