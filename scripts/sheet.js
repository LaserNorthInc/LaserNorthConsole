/**
 * LNI CONSOLE - MATERIAL MANAGEMENT LOGIC
 * Version: 3.0 (Quantity Math + Transaction Modals)
 */

let cachedInventory = [];

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initializeInterface();
    // Firebase Auth Listener
    if (typeof auth !== 'undefined') {
        auth.onAuthStateChanged(user => { 
            if (user) {
                loadInventoryData(); 
            } else {
                console.warn("User not logged in.");
            }
        });
    }
});

/**
 * SECTION: INITIALIZATION & DROPDOWNS
 */
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
            o.value = opt;
            o.textContent = opt;
            el.appendChild(o);
        });
    }
}

/**
 * SECTION: DATA FETCHING & FILTERING
 */
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

/**
 * SECTION: TABLE RENDERING
 */
function cleanDate(dateStr) {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr; 
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
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
            <td data-label="Date Added">${cleanDate(item.dateAdded)}</td>
            <td data-label="Status" class="${item.reserve === 'AVAILABLE' ? 'status-ready' : 'status-held'}">${item.reserve}</td>
            <td data-label="User">${item.user || 'System'}</td>
            <td class="action-cell">
                <button onclick="openTransactionModal('reserve', ${item.rowNumber}, '${item.id}', '${item.tabName}', ${item.qty || 1})" class="btn-action btn-reserve">RESERVE</button>
                <button onclick="openTransactionModal('use', ${item.rowNumber}, '${item.id}', '${item.tabName}', ${item.qty || 1})" class="btn-action btn-remove">USE</button>
            </td>
        </tr>
    `).join('');
}

/**
 * SECTION: TRANSACTION MODAL LOGIC
 */
function openTransactionModal(action, row, id, tab, maxQty) {
    const modal = document.getElementById('transaction-modal');
    const isFullSheet = window.CURRENT_RESOURCE_ID === SHEET_CONFIG.IDS.FULL_SHEET;
    
    // Store context for submission
    window.currentTx = { action, row, id, tab, maxQty };

    // Update UI labels
    document.getElementById('modal-title').innerText = (action === 'reserve' ? 'Reserve Resource' : 'Log Usage');
    document.getElementById('modal-part-id').innerText = `${tab} | ${id}`;
    
    // Toggle relevant fields
    document.getElementById('modal-job-group').style.display = (action === 'reserve' ? 'block' : 'none');
    document.getElementById('modal-qty-group').style.display = (isFullSheet ? 'block' : 'none');
    
    if (isFullSheet) {
        const qtyInput = document.getElementById('modal-qty-input');
        qtyInput.max = maxQty;
        qtyInput.value = 1;
    }

    modal.style.display = 'flex';
}

function closeTransactionModal() {
    document.getElementById('transaction-modal').style.display = 'none';
}

async function submitTransaction() {
    const { action, row, tab } = window.currentTx;
    const isFullSheet = window.CURRENT_RESOURCE_ID === SHEET_CONFIG.IDS.FULL_SHEET;
    
    const qtyVal = parseInt(document.getElementById('modal-qty-input').value);
    const jobVal = document.getElementById('modal-job-input').value;

    if (action === 'reserve') {
        if (!jobVal) return alert("Job Number is required.");
        let statusText = jobVal + (isFullSheet ? ` (Qty: ${qtyVal})` : "");
        await postTransaction({ action: 'reserve', rowNumber: row, tabName: tab, jobNum: statusText });
    } else {
        if (isFullSheet) {
            await postTransaction({ action: 'updateQty', rowNumber: row, tabName: tab, usedQty: qtyVal });
        } else {
            if (!confirm("Confirm full removal of this item?")) return;
            await postTransaction({ action: 'use', rowNumber: row, tabName: tab });
        }
    }
}

/**
 * SECTION: FORM SUBMISSION (ADD NEW)
 */
async function submitNewItem() {
    const type = document.getElementById('new-type')?.value;
    const thickness = document.getElementById('new-thickness')?.value;
    const len = document.getElementById('new-len')?.value;
    const wid = document.getElementById('new-wid')?.value;
    const isFullSheet = window.CURRENT_RESOURCE_ID === SHEET_CONFIG.IDS.FULL_SHEET;

    if (!type || !len || !wid) return alert("Required dimensions missing.");

    const payload = {
        action: 'add',
        tabName: type,
        id: 'LN-' + Math.random().toString(36).substr(2, 4).toUpperCase(),
        type: type,
        thickness: thickness,
        size: `${len} x ${wid}`,
        location: document.getElementById('new-location')?.value,
        cert: !isFullSheet ? document.getElementById('new-cert-add')?.value : 'N/A',
        qty: isFullSheet ? parseInt(document.getElementById('new-qty')?.value) : 1,
        notes: document.getElementById('new-notes')?.value || '',
        user: auth.currentUser?.email || 'System',
        dateAdded: new Date().toLocaleDateString('en-US'),
        reservedFor: 'AVAILABLE'
    };

    await postTransaction(payload);
}

/**
 * SECTION: CORE COMMUNICATION
 */
async function postTransaction(payload) {
    payload.sheetId = window.CURRENT_RESOURCE_ID;
    try {
        await fetch(SHEET_CONFIG.SCRIPT_URL, { 
            method: 'POST', 
            body: JSON.stringify(payload) 
        });
        location.reload();
    } catch (e) {
        // Handle Google Script redirect/CORS quirk
        location.reload();
    }
}

/**
 * SECTION: UTILS
 */
function toggleMobileMenu() {
    document.querySelector('.nav-tabs').classList.toggle('active');
}

function toggleForm() {
    const form = document.getElementById('add-item-form');
    if (form) form.style.display = (form.style.display === 'none' || form.style.display === '') ? 'block' : 'none';
}

function resetFilters() {
    const ids = ['filter-material', 'filter-thickness', 'filter-location', 'filter-status', 'filter-cert', 'filter-size'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = el.tagName === 'SELECT' ? "All" : "";
    });
    loadInventoryData();
}