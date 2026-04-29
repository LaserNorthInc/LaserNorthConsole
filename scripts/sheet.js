/**
 * LNI CONSOLE - MATERIAL MANAGEMENT LOGIC
 * Version: 3.1 (Fixed Cropper Buttons + Inventory Validation)
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

    tableBody.innerHTML = data.map(item => {
        // Ensure Croppers have a virtual QTY of 1 so the modal logic works
        const itemQty = isFullSheet ? (parseInt(item.qty) || 0) : 1;
        
        return `
        <tr>
            <td class="id-cell" data-label="ID">${item.id}</td>
            <td data-label="Material">${item.type}</td>
            <td data-label="Thick">${item.thickness}</td>
            <td data-label="Size">${item.size}</td>
            <td data-label="Loc">${item.location}</td>
            <td data-label="${isFullSheet ? 'QTY' : 'Cert #'}">${isFullSheet ? itemQty : (item.cert || 'N/A')}</td>
            <td data-label="Date Added">${cleanDate(item.dateAdded)}</td>
            <td data-label="Status" class="${item.reserve === 'AVAILABLE' ? 'status-ready' : 'status-held'}">${item.reserve}</td>
            <td data-label="User">${item.user || 'System'}</td>
            <td class="action-cell">
                <button onclick="openTransactionModal('reserve', ${item.rowNumber}, '${item.id}', '${item.tabName}', ${itemQty})" class="btn-action btn-reserve">RESERVE</button>
                <button onclick="openTransactionModal('use', ${item.rowNumber}, '${item.id}', '${item.tabName}', ${itemQty})" class="btn-action btn-remove">USE</button>
            </td>
        </tr>`;
    }).join('');
}

function openTransactionModal(action, row, id, tab, maxQty) {
    const modal = document.getElementById('transaction-modal');
    const isFullSheet = window.CURRENT_RESOURCE_ID === SHEET_CONFIG.IDS.FULL_SHEET;
    
    window.currentTx = { action, row, id, tab, maxQty };

    document.getElementById('modal-title').innerText = (action === 'reserve' ? 'Reserve Resource' : 'Log Usage');
    document.getElementById('modal-part-id').innerText = `${tab} | ${id}`;
    
    document.getElementById('modal-job-group').style.display = (action === 'reserve' ? 'block' : 'none');
    document.getElementById('modal-qty-group').style.display = (isFullSheet ? 'block' : 'none');
    
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
    const isFullSheet = window.CURRENT_RESOURCE_ID === SHEET_CONFIG.IDS.FULL_SHEET;
    
    const qtyVal = parseInt(document.getElementById('modal-qty-input').value);
    const jobVal = document.getElementById('modal-job-input').value;

    // ERROR HANDLING: INVENTORY VALIDATION
    if (isFullSheet && qtyVal > maxQty) {
        alert(`ERROR: Cannot process ${qtyVal} sheets. Only ${maxQty} remain in this stack.`);
        return;
    }

    if (action === 'reserve') {
        if (!jobVal) return alert("Job Number is required.");
        let statusText = jobVal + (isFullSheet ? ` (Qty: ${qtyVal})` : "");
        await postTransaction({ action: 'reserve', rowNumber: row, tabName: tab, jobNum: statusText });
    } else {
        if (isFullSheet) {
            await postTransaction({ action: 'updateQty', rowNumber: row, tabName: tab, usedQty: qtyVal });
        } else {
            if (!confirm("Confirm full removal of this remnant?")) return;
            await postTransaction({ action: 'use', rowNumber: row, tabName: tab });
        }
    }
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