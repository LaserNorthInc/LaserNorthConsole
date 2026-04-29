// SECTION: SHEET PAGE LOGIC
let inventoryData = [];

document.addEventListener('DOMContentLoaded', () => {
    populateDropdowns();
    if (typeof auth !== 'undefined') {
        auth.onAuthStateChanged(user => { if (user) loadSheetData(); });
    }
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
    const fSearch = document.getElementById('filter-cert')?.value?.toLowerCase() || "";

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
            </td>
        </tr>
    `).join('');
}

function clearFilters() {
    const ids = ['filter-type', 'filter-thick', 'filter-loc', 'filter-status', 'filter-cert'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = (id.includes('type') || id.includes('thick') || id.includes('loc')) ? "All" : "";
    });
    loadSheetData();
}

function toggleForm() {
    const f = document.getElementById('add-item-form');
    if (f) f.style.display = f.style.display === 'none' ? 'block' : 'none';
}

async function postToGoogle(payload) {
    if (typeof SHEET_CONFIG === 'undefined') return;
    payload.sheetId = SHEET_CONFIG.IDS.FULL_SHEET;
    try {
        await fetch(SHEET_CONFIG.SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
        location.reload();
    } catch(e) { alert("Network Error"); }
}