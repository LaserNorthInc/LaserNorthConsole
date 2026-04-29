let inventoryData = [];

document.addEventListener('DOMContentLoaded', () => {
    populateDropdowns();
    auth.onAuthStateChanged(user => { if (user) loadSheetData(); });
});

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
    const selectedTab = document.getElementById('filter-type').value || "All";
    try {
        const res = await fetch(`${SHEET_CONFIG.SCRIPT_URL}?id=${SHEET_CONFIG.IDS.FULL_SHEET}&tab=${selectedTab}`);
        inventoryData = await res.json();
        filterInventory();
    } catch(e) { console.error("Data fetch error", e); }
}

function clearFilters() {
    document.getElementById('filter-type').value = "All";
    document.getElementById('filter-thick').value = "All";
    document.getElementById('filter-loc').value = "All";
    document.getElementById('filter-status').value = "";
    document.getElementById('filter-cert').value = "";
    loadSheetData();
}

function filterInventory() {
    const fThick = document.getElementById('filter-thick').value;
    const fLoc = document.getElementById('filter-loc').value;
    const fStatus = document.getElementById('filter-status').value;
    const fSearch = document.getElementById('filter-cert').value.toLowerCase();

    const filtered = inventoryData.filter(item => {
        const matchesStatus = !fStatus || (fStatus === "AVAILABLE" ? item.reserve === 'AVAILABLE' : item.reserve !== 'AVAILABLE');
        const matchesThick = fThick === "All" || item.thickness === fThick;
        const matchesLoc = fLoc === "All" || item.location === fLoc;
        const matchesSearch = !fSearch || JSON.stringify(item).toLowerCase().includes(fSearch);

        return matchesStatus && matchesThick && matchesLoc && matchesSearch;
    });
    renderTable(filtered);
}

function renderTable(data) {
    const list = document.getElementById('sheet-list');
    list.innerHTML = data.map(item => `
        <tr>
            <td style="color:var(--accent); font-weight:700;">${item.id}</td>
            <td>${item.type}</td>
            <td>${item.thickness}</td>
            <td>${item.size}</td>
            <td>${item.location}</td>
            <td>${item.cert}</td>
            <td>${item.dateAdded}</td>
            <td class="${item.reserve === 'AVAILABLE' ? 'status-available' : 'status-reserved'}">${item.reserve}</td>
            <td>${item.user}</td>
            <td style="text-align:center;">
                <button onclick="openReserveModal(${item.rowNumber}, '${item.id}', '${item.tabName}')" class="action-btn btn-reserve">RESERVE</button>
                <button onclick="useItem(${item.rowNumber}, '${item.id}', '${item.tabName}')" class="action-btn btn-use">USE</button>
            </td>
        </tr>
    `).join('');
}

// ... existing openReserveModal, closeModal, submitReserve, useItem, submitNewItem functions ...
async function postToGoogle(payload) {
    payload.sheetId = SHEET_CONFIG.IDS.FULL_SHEET;
    try {
        await fetch(SHEET_CONFIG.SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
        location.reload();
    } catch(e) { alert("Network Error"); }
}

function toggleForm() {
    const f = document.getElementById('add-item-form');
    f.style.display = f.style.display === 'none' ? 'block' : 'none';
}