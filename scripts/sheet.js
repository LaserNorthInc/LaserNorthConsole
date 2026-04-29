let cachedInventory = [];

document.addEventListener('DOMContentLoaded', () => {
    initializeInterface();
    if (typeof auth !== 'undefined') {
        auth.onAuthStateChanged(user => { 
            if (user) loadInventoryData(); 
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
        const selectElement = document.getElementById(id);
        if (!selectElement) continue;
        selectElement.innerHTML = id.startsWith('filter') ? '<option value="All">All</option>' : '';
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            selectElement.appendChild(option);
        });
    }
}

async function loadInventoryData() {
    const materialSelect = document.getElementById('filter-material');
    const selectedTab = materialSelect ? materialSelect.value : "All";
    const spreadsheetId = window.CURRENT_RESOURCE_ID;

    if (!spreadsheetId || typeof SHEET_CONFIG === 'undefined') return;

    try {
        const response = await fetch(`${SHEET_CONFIG.SCRIPT_URL}?id=${spreadsheetId}&tab=${selectedTab}`);
        cachedInventory = await response.json();
        applyFilters();
    } catch (error) {
        console.error("Fetch failed", error);
    }
}

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
    tableBody.innerHTML = data.map(item => `
        <tr>
            <td class="id-cell">${item.id}</td>
            <td>${item.type}</td>
            <td>${item.thickness}</td>
            <td>${item.size}</td>
            <td>${item.location}</td>
            <td>${item.cert}</td>
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
    const jobNum = prompt(`Enter Job Number for ${id}:`);
    if (jobNum) {
        postTransaction({ action: 'reserve', rowNumber: row, tabName: tab, jobNum: jobNum });
    }
}