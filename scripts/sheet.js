/**
 * LNI CONSOLE - MATERIAL MANAGEMENT LOGIC
 * Version: 5.0 (Updated Sheet Layout: [ID, Mat, Thick, Size, Loc, Avail, Total, User, Date, Notes])
 */

let cachedInventory = [];

document.addEventListener('DOMContentLoaded', () => {
    initializeInterface();
    if (typeof auth !== 'undefined') {
        auth.onAuthStateChanged(user => { 
            if (user) {
                loadInventoryData(); 
            }
        });
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
    } catch (e) {
        console.error("Failed to fetch inventory:", e);
    }
}

function applyFilters() {
    const thickness = document.getElementById('filter-thickness')?.value || "All";
    const location = document.getElementById('filter-location')?.value || "All";
    const sizeSearch = document.getElementById('filter-size')?.value?.toLowerCase() || "";

    const filtered = cachedInventory.filter(item => {
        const matchThick = thickness === "All" || item.thickness === thickness;
        const matchLoc = location === "All" || item.location === location;
        const matchSize = !sizeSearch || String(item.size || "").toLowerCase().includes(sizeSearch);
        return matchThick && matchLoc && matchSize;
    });

    renderInventoryTable(filtered);
}

function cleanDate(dateStr) {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr; 
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
}

function renderInventoryTable(data) {
    const tableBody = document.getElementById('inventory-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = data.map(item => {
        const avail = parseInt(item.availableStock) || 0;
        const total = parseInt(item.totalStock) || 0;
        
        return `
        <tr>
            <td class="id-cell" data-label="ID">${item.id}</td>
            <td data-label="Material">${item.type}</td>
            <td data-label="Thickness">${item.thickness}</td>
            <td data-label="Size">${item.size}</td>
            <td data-label="Location">${item.location}</td>
            <td data-label="Available" class="qty-avail" style="color:var(--success); font-weight:800;">${avail}</td>
            <td data-label="Total Stock" class="qty-total">${total}</td>
            <td data-label="User">${item.user || 'System'}</td>
            <td data-label="Date Added">${cleanDate(item.dateAdded)}</td>
            <td data-label="Notes">${item.notes || ''}</td>
            <td class="action-cell">
                <button onclick="openTransactionModal('use', ${item.rowNumber}, '${item.id}', '${item.tabName}', ${avail})" class="btn-action btn-remove">USE</button>
            </td>
        </tr>`;
    }).join('');
}

function openTransactionModal(action, row, id, tab, maxQty) {
    const modal = document.getElementById('transaction-modal');
    window.currentTx = { action, row, id, tab, maxQty };

    document.getElementById('modal-title').innerText = 'Log Material Usage';
    document.getElementById('modal-part-id').innerText = `${tab} | ${id}`;
    
    document.getElementById('modal-job-group').style.display = 'none'; 
    document.getElementById('modal-qty-group').style.display = 'block';
    
    const qtyInput = document.getElementById('modal-qty-input');
    qtyInput.value = 1;
    qtyInput.max = maxQty;

    modal.style.display = 'flex';
}

function closeTransactionModal() {
    document.getElementById('transaction-modal').style.display = 'none';
}

async function submitTransaction() {
    const { action, row, tab, maxQty } = window.currentTx;
    const qtyVal = parseInt(document.getElementById('modal-qty-input').value);

    if (qtyVal > maxQty) {
        alert(`ERROR: Cannot process ${qtyVal} units. Only ${maxQty} available.`);
        return;
    }

    // Default usage logic: subtracts from both Available and Total
    await postTransaction({ 
        action: 'updateQty', 
        rowNumber: row, 
        tabName: tab, 
        usedQty: qtyVal 
    });
}

async function postTransaction(payload) {
    payload.sheetId = window.CURRENT_RESOURCE_ID;
    try {
        await fetch(SHEET_CONFIG.SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
        location.reload();
    } catch (e) {
        location.reload();
    }
}

async function submitNewItem() {
    const type = document.getElementById('new-type')?.value;
    const qty = parseInt(document.getElementById('new-qty')?.value) || 1;

    const payload = {
        action: 'add',
        tabName: type,
        id: 'LN-' + Math.random().toString(36).substr(2, 4).toUpperCase(),
        type: type,
        thickness: document.getElementById('new-thickness')?.value,
        size: `${document.getElementById('new-len')?.value} x ${document.getElementById('new-wid')?.value}`,
        location: document.getElementById('new-location')?.value,
        qty: qty, // Sent as starting value for both Available and Total
        user: auth.currentUser?.email || 'System',
        dateAdded: new Date().toLocaleDateString('en-US'),
        notes: document.getElementById('new-notes')?.value || ''
    };

    await postTransaction(payload);
}

function toggleForm() {
    const form = document.getElementById('add-item-form');
    if (form) form.style.display = (form.style.display === 'none' || form.style.display === '') ? 'block' : 'none';
}

function resetFilters() {
    const ids = ['filter-material', 'filter-thickness', 'filter-location', 'filter-size'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = el.tagName === 'SELECT' ? "All" : "";
    });
    loadInventoryData();
}