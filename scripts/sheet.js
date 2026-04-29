// SECTION: DATA MANAGEMENT
let cachedInventory = [];

document.addEventListener('DOMContentLoaded', () => {
    initializeInterface();
    if (typeof auth !== 'undefined') {
        auth.onAuthStateChanged(user => { if (user) loadInventoryData(); });
    }
});

function cleanDate(dateStr) {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr; 
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
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
    } catch (e) { console.error("Fetch error", e); }
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
                <button onclick="openTransactionModal('reserve', ${item.rowNumber}, '${item.id}', '${item.tabName}', ${item.qty || 1})" class="btn-action btn-reserve">RESERVE</button>
                <button onclick="openTransactionModal('use', ${item.rowNumber}, '${item.id}', '${item.tabName}', ${item.qty || 1})" class="btn-action btn-remove">USE</button>
            </td>
        </tr>
    `).join('');
}

// SECTION: MODAL LOGIC
function openTransactionModal(action, row, id, tab, maxQty) {
    const isFullSheet = window.CURRENT_RESOURCE_ID === SHEET_CONFIG.IDS.FULL_SHEET;
    const modal = document.getElementById('transaction-modal');
    window.currentTx = { action, row, id, tab, maxQty };

    document.getElementById('modal-title').innerText = action === 'reserve' ? 'Reserve Metal' : 'Log Usage';
    document.getElementById('modal-part-id').innerText = `${tab} | ${id}`;
    
    document.getElementById('modal-job-group').style.display = action === 'reserve' ? 'block' : 'none';
    document.getElementById('modal-qty-group').style.display = isFullSheet ? 'block' : 'none';
    
    if (isFullSheet) document.getElementById('modal-qty-input').max = maxQty;
    modal.style.display = 'flex';
}

function closeTransactionModal() { document.getElementById('transaction-modal').style.display = 'none'; }

async function submitTransaction() {
    const { action, row, tab, maxQty } = window.currentTx;
    const isFullSheet = window.CURRENT_RESOURCE_ID === SHEET_CONFIG.IDS.FULL_SHEET;
    const qtyVal = parseInt(document.getElementById('modal-qty-input').value);
    const jobVal = document.getElementById('modal-job-input').value;

    if (action === 'reserve') {
        if (!jobVal) return alert("Job # is required.");
        let status = jobVal + (isFullSheet ? ` (Res: ${qtyVal})` : "");
        await postTransaction({ action: 'reserve', rowNumber: row, tabName: tab, jobNum: status });
    } else {
        if (isFullSheet) {
            await postTransaction({ action: 'updateQty', rowNumber: row, tabName: tab, usedQty: qtyVal });
        } else {
            await postTransaction({ action: 'use', rowNumber: row, tabName: tab });
        }
    }
}

async function postTransaction(payload) {
    payload.sheetId = window.CURRENT_RESOURCE_ID;
    try {
        await fetch(SHEET_CONFIG.SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
        location.reload();
    } catch(e) { location.reload(); }
}

function toggleMobileMenu() { document.querySelector('.nav-tabs').classList.toggle('active'); }