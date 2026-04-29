/**
 * LNI CONSOLE - MATERIAL MANAGEMENT LOGIC
 * This script handles data fetching, filtering, and transactions 
 * for both Cropper Remnants and Full Sheet Stock.
 */

let cachedInventory = [];

document.addEventListener('DOMContentLoaded', () => {
    initializeInterface();
    // Start authentication listener
    if (typeof auth !== 'undefined') {
        auth.onAuthStateChanged(user => { 
            if (user) {
                loadInventoryData(); 
            } else {
                console.warn("User not authenticated. Redirecting...");
            }
        });
    }
});

/**
 * SECTION: INITIALIZATION
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
        const selectElement = document.getElementById(id);
        if (!selectElement) continue;

        // Filters get an "All" option, inputs do not
        selectElement.innerHTML = id.startsWith('filter') ? '<option value="All">All</option>' : '';

        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            selectElement.appendChild(option);
        });
    }
}

/**
 * SECTION: DATA FETCHING
 */
async function loadInventoryData() {
    const materialSelect = document.getElementById('filter-material');
    const selectedTab = materialSelect ? materialSelect.value : "All";
    
    // Dynamic ID provided by the HTML file (Cropper vs Full Sheet)
    const activeSpreadsheetId = window.CURRENT_RESOURCE_ID;

    if (!activeSpreadsheetId || typeof SHEET_CONFIG === 'undefined') {
        console.error("Configuration Error: Spreadsheet ID or Config missing.");
        return;
    }

    try {
        const fetchUrl = `${SHEET_CONFIG.SCRIPT_URL}?id=${activeSpreadsheetId}&tab=${selectedTab}`;
        const response = await fetch(fetchUrl);
        cachedInventory = await response.json();
        applyFilters();
    } catch (error) {
        console.error("Failed to load inventory from Google Sheets:", error);
    }
}

/**
 * SECTION: FILTERING & RENDERING
 */
function applyFilters() {
    const thickness = document.getElementById('filter-thickness')?.value || "All";
    const location = document.getElementById('filter-location')?.value || "All";
    const status = document.getElementById('filter-status')?.value || "";
    const certSearch = document.getElementById('filter-cert')?.value?.toLowerCase() || "";
    const sizeSearch = document.getElementById('filter-size')?.value?.toLowerCase() || "";

    const filteredResults = cachedInventory.filter(item => {
        const matchStatus = !status || (status === "AVAILABLE" ? item.reserve === 'AVAILABLE' : item.reserve !== 'AVAILABLE');
        const matchThick = thickness === "All" || item.thickness === thickness;
        const matchLoc = location === "All" || item.location === location;
        const matchCert = !certSearch || String(item.cert).toLowerCase().includes(certSearch);
        const matchSize = !sizeSearch || String(item.size).toLowerCase().includes(sizeSearch);
        
        return matchStatus && matchThick && matchLoc && matchCert && matchSize;
    });

    renderInventoryTable(filteredResults);
}

function renderInventoryTable(data) {
    const tableBody = document.getElementById('inventory-table-body');
    if (!tableBody) return;

    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:20px;">No matching records found.</td></tr>';
        return;
    }

    tableBody.innerHTML = data.map(item => `
        <tr>
            <td class="id-cell">${item.id}</td>
            <td>${item.type}</td>
            <td>${item.thickness}</td>
            <td>${item.size}</td>
            <td>${item.location}</td>
            <td>${item.cert || 'N/A'}</td>
            <td>${item.dateAdded}</td>
            <td class="${item.reserve === 'AVAILABLE' ? 'status-ready' : 'status-held'}">
                ${item.reserve}
            </td>
            <td>${item.user || 'System'}</td>
            <td class="action-cell">
                <button onclick="openReserveModal(${item.rowNumber}, '${item.id}', '${item.tabName}')" class="btn-action btn-reserve">RESERVE</button>
                <button onclick="removeResource(${item.rowNumber}, '${item.id}', '${item.tabName}')" class="btn-action btn-remove">USE</button>
            </td>
        </tr>
    `).join('');
}

/**
 * SECTION: TRANSACTIONS (RESERVE / USE / ADD)
 */
async function removeResource(rowNumber, id, tabName) {
    const confirmed = confirm(`Are you sure you want to MARK AS USED: ${id}?\nThis will remove it from inventory.`);
    if (!confirmed) return;

    await postTransaction({
        action: 'use',
        rowNumber: rowNumber,
        tabName: tabName
    });
}

async function submitNewItem() {
    const type = document.getElementById('new-type').value;
    const len = document.getElementById('new-len').value;
    const wid = document.getElementById('new-wid').value;
    
    if (!type || !len || !wid) return alert("Material Type and Dimensions (LxW) are required.");

    const payload = {
        action: 'add',
        tabName: type,
        id: 'LN-' + Math.random().toString(36).substr(2, 4).toUpperCase(),
        type: type,
        thickness: document.getElementById('new-thickness').value,
        size: `${len} x ${wid}`,
        location: document.getElementById('new-location').value,
        cert: document.getElementById('new-cert-add')?.value || 'N/A',
        notes: document.getElementById('new-notes')?.value || '',
        user: auth.currentUser.email,
        dateAdded: new Date().toLocaleDateString('en-US'),
        reservedFor: 'AVAILABLE'
    };

    await postTransaction(payload);
}

async function postTransaction(payload) {
    // Determine which sheet to write to
    payload.sheetId = window.CURRENT_RESOURCE_ID;

    try {
        await fetch(SHEET_CONFIG.SCRIPT_URL, { 
            method: 'POST', 
            body: JSON.stringify(payload) 
        });
        
        // Refresh to show update
        location.reload();
    } catch (error) {
        // Due to no-cors limitations in Google Script, we often hit the catch block 
        // even on success. We reload anyway as the data usually hits the sheet.
        console.warn("Transaction submitted. Refreshing list...");
        location.reload();
    }
}

/**
 * SECTION: UI HELPERS
 */
function resetFilters() {
    const filterIds = ['filter-material', 'filter-thickness', 'filter-location', 'filter-status', 'filter-cert', 'filter-size'];
    filterIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = el.tagName === 'SELECT' && id.includes('filter') ? "All" : "";
    });
    loadInventoryData();
}

function toggleForm() {
    const form = document.getElementById('add-item-form');
    if (form) {
        form.style.display = (form.style.display === 'none' || form.style.display === '') ? 'block' : 'none';
    }
}

function openReserveModal(row, id, tab) {
    // Implementing modal logic here if desired, or using simple prompt
    const jobNum = prompt(`Enter Job Number to reserve ${id}:`);
    if (jobNum) {
        postTransaction({
            action: 'reserve',
            rowNumber: row,
            tabName: tab,
            jobNum: jobNum
        });
    }
}