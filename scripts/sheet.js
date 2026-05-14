/**
 * LNI CONSOLE - MATERIAL MANAGEMENT LOGIC
 * Version: 6.0 (Cropper and Full Sheet Actions)
 */

let cachedInventory = [];
const PAGE_MODE = document.body?.dataset.pageMode || 'full-sheet';
const IS_CROPPER_PAGE = PAGE_MODE === 'croppers';
const INDEX_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

function _getIndexCacheKey(sheetId, pageMode) {
    return `lni_index_${sheetId || 'global'}_${pageMode || PAGE_MODE}`;
}

function _readIndexCache(sheetId) {
    try {
        const key = _getIndexCacheKey(sheetId);
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.ts || !Array.isArray(parsed.data)) return null;
        return parsed;
    } catch (e) { return null; }
}

function _writeIndexCache(sheetId, data) {
    try {
        const key = _getIndexCacheKey(sheetId);
        localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
    } catch (e) { /* ignore */ }
}

async function fetchIndexAndCache(sheetId) {
    if (!sheetId || typeof SHEET_CONFIG === 'undefined') return null;
    try {
        const resp = await fetch(`${SHEET_CONFIG.SCRIPT_URL}?id=${sheetId}&tab=All&pageMode=${PAGE_MODE}`);
        if (!resp.ok) return null;
        const inv = await resp.json();
        if (Array.isArray(inv)) {
            _writeIndexCache(sheetId, inv);
            return inv;
        }
    } catch (e) { console.warn('fetchIndexAndCache failed', e); }
    return null;
}

// Public: index the sheet and cache inventory for faster initial renders
async function indexSheetData(force = false) {
    const sheetId = window.CURRENT_RESOURCE_ID;
    if (!sheetId || typeof SHEET_CONFIG === 'undefined') return;
    try {
        const cached = _readIndexCache(sheetId);
        if (cached && !force && (Date.now() - cached.ts) < INDEX_CACHE_TTL) {
            cachedInventory = cached.data.slice();
            try { applyFilters(); } catch (e) {}
            // still refresh in background
            fetchIndexAndCache(sheetId).then((fresh) => { if (fresh) { cachedInventory = fresh; try { applyFilters(); } catch (e){} } });
            return;
        }

        const fresh = await fetchIndexAndCache(sheetId);
        if (fresh) {
            cachedInventory = fresh.slice();
            try { applyFilters(); } catch (e) {}
        }
    } catch (e) { console.warn('indexSheetData failed', e); }
}

// expose for header to call early
try { window.indexSheetData = indexSheetData; } catch (e) {}

function sanitizeInput(value) {
    if (typeof value !== 'string') return '';
    return value
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .replace(/[^a-zA-Z0-9\s\-\_\.\,\/\#\(\)]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

document.addEventListener('DOMContentLoaded', async () => {
    await initializeInterface();
    if (typeof auth !== 'undefined') {
        auth.onAuthStateChanged(user => {
            if (user) {
                loadInventoryData();
            }
        });
    } else {
        loadInventoryData();
    }
});

async function initializeInterface() {
    await populateDropdowns();
    // Ensure default filter selections are explicit 'All' when available
    ['filter-material', 'filter-thickness', 'filter-location'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        try {
            if (el.tagName === 'SELECT') {
                if (Array.from(el.options).some(o => o.value === 'All')) {
                    el.value = 'All';
                } else if (el.options.length) {
                    el.selectedIndex = 0;
                }
            }
        } catch (e) { /* ignore */ }
    });
}
async function populateDropdowns() {
    const spreadsheetId = window.CURRENT_RESOURCE_ID;
    // Prefer an editable materials list stored in the spreadsheet (MATERIALS sheet)
    let localMaterials = Array.isArray(DATA_OPTIONS.materials) ? DATA_OPTIONS.materials.slice() : [];
    try {
        if (spreadsheetId) {
            const matResp = await fetch(`${SHEET_CONFIG.SCRIPT_URL}?id=${spreadsheetId}&listMaterials=1`);
            if (matResp.ok) {
                const mats = await matResp.json();
                if (Array.isArray(mats) && mats.length) {
                    localMaterials = mats.slice();
                }
            }
            // Also merge sheet tabs so types that exist as tabs are included
            const resp = await fetch(`${SHEET_CONFIG.SCRIPT_URL}?id=${spreadsheetId}&listTabs=1`);
            if (resp.ok) {
                const tabs = await resp.json();
                tabs.forEach(t => {
                    if (!t) return;
                    // ignore control sheets
                    if (String(t).toUpperCase() === 'MATERIALS') return;
                    if (localMaterials.indexOf(t) === -1) localMaterials.push(t);
                });
            }
            // Fetch inventory for all tabs to determine which materials currently have stock
            try {
                // Use cached index if available to speed up dropdown population
                const cached = _readIndexCache(spreadsheetId);
                let inv = null;
                if (cached && (Date.now() - cached.ts) < INDEX_CACHE_TTL) {
                    inv = cached.data.slice();
                } else {
                    const invResp = await fetch(`${SHEET_CONFIG.SCRIPT_URL}?id=${spreadsheetId}&tab=All&pageMode=${PAGE_MODE}`);
                    if (invResp.ok) {
                        inv = await invResp.json();
                        if (Array.isArray(inv)) _writeIndexCache(spreadsheetId, inv);
                    }
                }
                if (Array.isArray(inv)) {
                    const present = new Set();
                    inv.forEach(item => {
                        const type = item.type;
                        if (!type) return;
                        if (PAGE_MODE === 'croppers') {
                            present.add(type);
                        } else {
                            const total = parseInt(item.totalStock) || 0;
                            const avail = parseInt(item.availableStock) || 0;
                            if (total > 0 || avail > 0) present.add(type);
                        }
                    });
                    var presentMaterials = localMaterials.filter(m => present.has(m));
                    // populate cachedInventory so initial render can use this data
                    cachedInventory = inv.slice();
                }
            } catch (e) {
                console.warn('Could not fetch inventory for material presence:', e);
            }
        }
    } catch (err) {
        console.warn('Could not fetch materials/tabs:', err);
    }

    const dropdownMapping = {
        'filter-material': ['All'].concat(typeof presentMaterials !== 'undefined' ? presentMaterials : localMaterials),
        'new-type': localMaterials,
        'edit-type': localMaterials,
        'filter-thickness': DATA_OPTIONS.thicknesses,
        'new-thickness': DATA_OPTIONS.thicknesses,
        'edit-thickness': DATA_OPTIONS.thicknesses,
        'filter-location': DATA_OPTIONS.locations,
        'new-location': DATA_OPTIONS.locations,
        'edit-location': DATA_OPTIONS.locations
    };

    for (const [id, options] of Object.entries(dropdownMapping)) {
        const el = document.getElementById(id);
        if (!el) continue;
        el.innerHTML = id.startsWith('filter') ? '' : '';
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            el.appendChild(option);
        });
        // If filter select, ensure 'All' is at top
        if (id.startsWith('filter') && el.options.length && el.options[0].value !== 'All') {
            const allOpt = document.createElement('option'); allOpt.value = 'All'; allOpt.textContent = 'All';
            el.insertBefore(allOpt, el.firstChild);
        }
    }
}

// --- Materials editor modal logic ---
function openMaterialsModal() {
    // Load current materials into editor array
    window.materialsEditor = [];
    const el = document.getElementById('new-type');
    // prefer server-provided list if available via populateDropdowns logic; otherwise read current options
    const readFromSelect = () => {
        const sel = document.getElementById('new-type');
        if (!sel) return [];
        return Array.from(sel.options).map(o => o.value).filter(v => v && v !== 'All');
    };
    window.materialsEditor = readFromSelect();
    renderMaterialsEditor();
    const modal = document.getElementById('materials-modal');
    if (modal) modal.style.display = 'flex';
}

// --- Global UI helpers: toast, confirm, loader ---
function showToast(message, type = 'info', timeout = 3000) {
    try {
        const container = document.getElementById('global-toast');
        if (!container) return;
        const el = document.createElement('div');
        el.className = 'toast ' + (type || 'info');
        el.innerText = message;
        container.appendChild(el);
        setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, timeout);
    } catch (e) { console.warn('toast failed', e); }
}

function showConfirm(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('global-confirm');
        const msg = document.getElementById('global-confirm-message');
        const ok = document.getElementById('global-confirm-ok');
        const cancel = document.getElementById('global-confirm-cancel');
        if (!modal || !msg || !ok || !cancel) {
            resolve(window.confirm(message));
            return;
        }
        msg.innerText = message;
        modal.style.display = 'flex';
        const cleanup = () => { ok.onclick = null; cancel.onclick = null; modal.style.display = 'none'; };
        ok.onclick = () => { cleanup(); resolve(true); };
        cancel.onclick = () => { cleanup(); resolve(false); };
    });
}

function showLoader(show, message) {
    const loader = document.getElementById('global-loader');
    const msg = document.getElementById('global-loader-msg');
    if (!loader) return;
    if (typeof message !== 'undefined' && msg) msg.innerText = message || 'Working…';
    loader.style.display = show ? 'flex' : 'none';
}

function closeMaterialsModal() {
    const modal = document.getElementById('materials-modal');
    if (modal) modal.style.display = 'none';
}

function renderMaterialsEditor() {
    const list = document.getElementById('materials-list');
    if (!list) return;
    list.innerHTML = '';
    (window.materialsEditor || []).forEach((m, i) => {
        const item = document.createElement('div');
        item.className = 'materials-item';
        item.style.display = 'flex';
        item.style.gap = '8px';
        item.style.alignItems = 'center';
        item.innerHTML = `<div style="flex:1">${escapeHtml(m)}</div>`;
        const up = document.createElement('button'); up.textContent = '▲'; up.className = 'btn-small';
        up.onclick = () => { moveMaterial(i, -1); };
        const down = document.createElement('button'); down.textContent = '▼'; down.className = 'btn-small';
        down.onclick = () => { moveMaterial(i, 1); };
        const del = document.createElement('button'); del.textContent = '✕'; del.className = 'btn-danger btn-small';
        del.onclick = () => { removeMaterial(i); };
        item.appendChild(up); item.appendChild(down); item.appendChild(del);
        list.appendChild(item);
    });
}

function addMaterialEditor() {
    const val = (document.getElementById('materials-new-input')?.value || '').trim();
    if (!val) return;
    if (!window.materialsEditor) window.materialsEditor = [];
    if (window.materialsEditor.indexOf(val) !== -1) {
        showToast('Material already exists', 'error');
        return;
    }
    window.materialsEditor.push(val);
    document.getElementById('materials-new-input').value = '';
    renderMaterialsEditor();
}

function moveMaterial(index, dir) {
    const arr = window.materialsEditor || [];
    const to = index + dir;
    if (to < 0 || to >= arr.length) return;
    const tmp = arr[to]; arr[to] = arr[index]; arr[index] = tmp;
    renderMaterialsEditor();
}

async function removeMaterial(index) {
    if (!window.materialsEditor) return;
    const name = window.materialsEditor[index];
    const ok = await showConfirm(`Remove material type "${name}"? This cannot be undone.`);
    if (!ok) return;
    window.materialsEditor.splice(index,1);
    renderMaterialsEditor();
}

async function saveMaterialsEditor() {
    const materials = window.materialsEditor || [];
    try {
        showLoader(true, 'Saving materials...');
        const payload = { action: 'saveMaterials', sheetId: window.CURRENT_RESOURCE_ID, materials };
        const resp = await fetch(SHEET_CONFIG.SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
        const res = await resp.json();
        showLoader(false);
        if (res && res.result === 'success') {
            await populateDropdowns();
            closeMaterialsModal();
            showToast('Materials saved.', 'success');
        } else {
            showToast('Failed to save materials.', 'error');
        }
    } catch (err) {
        console.error(err);
        showLoader(false);
        showToast('Error saving materials.', 'error');
    }
}

// Prompt + create a new material type (creates a tab on the spreadsheet)
function createMaterialPrompt() {
    // fallback - open materials modal for editing
    openMaterialsModal();
}

async function createMaterialType(typeName) {
    try {
        showLoader(true, 'Creating material type...');
        const payload = { action: 'createTab', sheetId: window.CURRENT_RESOURCE_ID, tabName: typeName, pageMode: PAGE_MODE };
        const resp = await fetch(SHEET_CONFIG.SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await resp.json();
            showLoader(false);
            if (result && result.result === 'success') {
                await populateDropdowns();
                const filterEl = document.getElementById('filter-material');
                if (filterEl) { try { filterEl.value = typeName; } catch (e) {} }
                try { loadInventoryData(); } catch (e) {}
                showToast(`Material type "${typeName}" created.`, 'success');
            } else {
                showToast('Failed to create material type.', 'error');
            }
    } catch (err) {
        console.error(err);
        showLoader(false);
        showToast('Error creating material type.', 'error');
    }
}

async function loadInventoryData() {
    const spreadsheetId = window.CURRENT_RESOURCE_ID;
    const materialSelect = document.getElementById('filter-material');
    const selectedTab = (materialSelect && materialSelect.value) ? materialSelect.value : 'All';

    if (!spreadsheetId || typeof SHEET_CONFIG === 'undefined') return;

    // If we have a recent cached index, show it immediately for faster first paint
    try {
        const cached = _readIndexCache(spreadsheetId);
        if (cached && (Date.now() - cached.ts) < INDEX_CACHE_TTL) {
            cachedInventory = cached.data.slice();
            try { applyFilters(); } catch (e) {}
            // continue to fetch fresh data in background and update when ready
        }
    } catch (e) { /* ignore cache errors */ }

    // show loading UI and disable refresh buttons
    const loadingOverlay = document.getElementById('table-loading');
    const refreshButtons = document.querySelectorAll('.refresh-table');
    refreshButtons.forEach(b => { b.disabled = true; b.dataset.origHtml = b.innerHTML; b.innerHTML = '<span class="spinner-inline"></span>Loading...'; });
    if (loadingOverlay) loadingOverlay.style.display = 'flex';

    try {
        const response = await fetch(`${SHEET_CONFIG.SCRIPT_URL}?id=${spreadsheetId}&tab=${selectedTab}&pageMode=${PAGE_MODE}`);
        cachedInventory = await response.json();
        applyFilters();
    } catch (error) {
        console.error('Failed to fetch inventory:', error);
    } finally {
        // hide loading UI and re-enable buttons
        if (loadingOverlay) loadingOverlay.style.display = 'none';
        refreshButtons.forEach(b => { b.disabled = false; if (b.dataset.origHtml) { b.innerHTML = b.dataset.origHtml; delete b.dataset.origHtml; } });
    }
}

function applyFilters() {
    const thickness = document.getElementById('filter-thickness')?.value || 'All';
    const location = document.getElementById('filter-location')?.value || 'All';
    const status = document.getElementById('filter-status')?.value || '';
    const sizeSearch = document.getElementById('filter-size')?.value?.toLowerCase() || '';
    const certSearch = document.getElementById('filter-cert')?.value?.toLowerCase() || '';

    const filtered = cachedInventory.filter(item => {
        const matchThick = thickness === 'All' || item.thickness === thickness;
        const matchLoc = location === 'All' || item.location === location;
        const matchStatus = !status || ((item.reservedFor || '').trim() ? 'RESERVED' : 'AVAILABLE') === status;
        const matchSize = !sizeSearch || String(item.size || '').toLowerCase().includes(sizeSearch);
        const matchCert = !certSearch || String(item.cert || item.availableStock || '').toLowerCase().includes(certSearch);
        return matchThick && matchLoc && matchStatus && matchSize && matchCert;
    });

    renderInventoryTable(filtered);
}

function cleanDate(dateStr) {
    if (!dateStr) return 'N/A';
    const normalized = String(dateStr).replace(/,\s*/g, ' ');
    const date = new Date(normalized);
    if (isNaN(date)) return dateStr;
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
}

function renderInventoryTable(data) {
    const tableBody = document.getElementById('inventory-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = data.map(item => {
        const displayValue = value => escapeHtml(value || '');
        const attrValue = value => escapeAttr(value || '');
        const cert = displayValue(item.cert);
        const reservedFor = item.reservedFor || '';
        const reservedDisplay = displayValue(reservedFor ? reservedFor : 'AVAILABLE');
        const reservedClass = reservedFor ? 'status-reserved' : 'status-available';
        const dateAdded = cleanDate(item.dateAdded || item.dateAddedRaw || '');
        const notes = displayValue(item.notes);
        const user = displayValue(item.user || 'System');
        const avail = parseInt(item.availableStock) || 0;
        const total = parseInt(item.totalStock) || 0;
        const minStock = parseInt(item.minStock) || 0;
        const safeIdAttr = attrValue(item.id);
        const safeTabNameAttr = attrValue(item.tabName);
        const safeTypeAttr = attrValue(item.type);
        const safeThicknessAttr = attrValue(item.thickness);
        const safeSizeAttr = attrValue(item.size);
        const safeLocationAttr = attrValue(item.location);
        const safeCertAttr = attrValue(item.cert);
        const safeReservedForAttr = attrValue(reservedFor);
        const safeUserAttr = attrValue(item.user || 'System');
        const safeNotesAttr = attrValue(item.notes);
        const safeDateAddedAttr = attrValue(dateAdded);

        // Determine stock status for full-sheet page
        let stockStatus = '';
        let stockStatusClass = 'stock-ok';
        if (minStock > 0) {
            if (avail <= 0) {
                stockStatus = 'OUT OF STOCK';
                stockStatusClass = 'stock-critical';
            } else if (avail < minStock) {
                stockStatus = 'LOW STOCK';
                stockStatusClass = 'stock-critical';
            } else if (avail < minStock * 1.5) {
                stockStatus = 'APPROACHING MIN';
                stockStatusClass = 'stock-warning';
            } else {
                stockStatus = 'OK';
                stockStatusClass = 'stock-ok';
            }
        }

        if (IS_CROPPER_PAGE) {
            return `
                <tr>
                    <td data-label="ID">${displayValue(item.id)}</td>
                    <td data-label="Type">${displayValue(item.type)}</td>
                    <td data-label="Thickness">${displayValue(item.thickness)}</td>
                    <td data-label="Size">${displayValue(item.size)}</td>
                    <td data-label="Location">${displayValue(item.location)}</td>
                    <td data-label="Cert">${cert}</td>
                    <td data-label="Date Added">${displayValue(dateAdded)}</td>
                    <td data-label="Reserved For" class="${reservedClass}">${reservedDisplay}</td>
                    <td data-label="User">${user}</td>
                    <td data-label="Notes">${notes}</td>
                    <td class="action-cell">
                        <button onclick="openTransactionModal('use', ${item.rowNumber}, '${safeIdAttr}', '${safeTabNameAttr}', 0)" class="btn-action btn-remove">USE</button>
                        <button onclick="openTransactionModal('reserve', ${item.rowNumber}, '${safeIdAttr}', '${safeTabNameAttr}', 0, '${safeReservedForAttr}')" class="btn-action btn-secondary">RESERVE</button>
                        <button onclick="openEditModal(this)" class="btn-action btn-secondary"
                            data-row="${item.rowNumber}"
                            data-tab="${attrValue(item.tabName)}"
                            data-id="${attrValue(item.id)}"
                            data-type="${safeTypeAttr}"
                            data-thickness="${safeThicknessAttr}"
                            data-size="${safeSizeAttr}"
                            data-location="${safeLocationAttr}"
                            data-cert="${safeCertAttr}"
                            data-reserved-for="${safeReservedForAttr}"
                            data-user="${safeUserAttr}"
                            data-notes="${safeNotesAttr}"
                            data-dateadded="${safeDateAddedAttr}"
                            data-available="${avail}"
                            data-total="${total}">EDIT</button>
                    </td>
                </tr>`;
        }

        return `
            <tr>
                <td data-label="ID">${displayValue(item.id)}</td>
                <td data-label="Type">${displayValue(item.type)}</td>
                <td data-label="Thickness">${displayValue(item.thickness)}</td>
                <td data-label="Size">${displayValue(item.size)}</td>
                <td data-label="Location">${displayValue(item.location)}</td>
                <td data-label="Cert">${cert}</td>
                <td data-label="Available Qty" class="qty-avail" style="color:var(--success); font-weight:800;">${avail}</td>
                <td data-label="Total Qty" class="qty-total">${total}</td>
                <td data-label="Stock Status">${minStock > 0 ? `<span class="stock-status ${stockStatusClass}">${stockStatus}</span>` : '<span style="color:var(--text-muted);">N/A</span>'}</td>
                <td data-label="Date Added">${displayValue(dateAdded)}</td>
                <td data-label="User">${user}</td>
                <td data-label="Notes">${notes}</td>
                <td class="action-cell">
                    <button onclick="openTransactionModal('use', ${item.rowNumber}, '${attrValue(item.id)}', '${attrValue(item.tabName)}', ${avail}, ${total})" class="btn-action btn-remove">USE</button>
                    <button onclick="openTransactionModal('reserve', ${item.rowNumber}, '${attrValue(item.id)}', '${attrValue(item.tabName)}', ${avail})" class="btn-action btn-secondary">RESERVE</button>
                    <button onclick="openEditModal(this)" class="btn-action btn-secondary"
                        data-row="${item.rowNumber}"
                        data-tab="${attrValue(item.tabName)}"
                        data-id="${attrValue(item.id)}"
                        data-type="${safeTypeAttr}"
                        data-thickness="${safeThicknessAttr}"
                        data-size="${safeSizeAttr}"
                        data-location="${safeLocationAttr}"
                        data-cert="${safeCertAttr}"
                        data-reserved-for="${safeReservedForAttr}"
                        data-user="${safeUserAttr}"
                        data-notes="${safeNotesAttr}"
                        data-dateadded="${safeDateAddedAttr}"
                        data-available="${avail}"
                        data-total="${total}"
                        data-minstock="${minStock}">EDIT</button>
                </td>
            </tr>`;
    }).join('');
}

function openTransactionModal(action, row, id, tab, maxQty, totalQtyOrReservedFor = '') {
    const modal = document.getElementById('transaction-modal');
    let totalQty = 0;
    let reservedFor = '';

    if (IS_CROPPER_PAGE) {
        reservedFor = totalQtyOrReservedFor || '';
    } else {
        totalQty = parseInt(totalQtyOrReservedFor) || 0;
    }

    const reservedQty = Math.max(0, totalQty - maxQty);
    window.currentTx = { action, row, id, tab, availQty: maxQty, totalQty, reservedQty };

    const modalTitle = action === 'reserve' ? 'Reserve Material' : 'Use Material';
    document.getElementById('modal-title').innerText = modalTitle;
    document.getElementById('modal-part-id').innerText = `${tab} | ${id}`;

    const qtyGroup = document.getElementById('modal-qty-group');
    const useModeGroup = document.getElementById('modal-use-mode-group');
    const reservedGroup = document.getElementById('modal-reserved-for-group');
    const qtyInput = document.getElementById('modal-qty-input');
    const reservedInput = document.getElementById('modal-reserved-for-input');
    const useModeNote = document.getElementById('modal-use-mode-note');

    if (IS_CROPPER_PAGE) {
        qtyGroup.style.display = 'none';
        useModeGroup.style.display = 'none';
        reservedGroup.style.display = action === 'reserve' ? 'block' : 'none';
        reservedInput.value = reservedFor || '';
    } else {
        reservedGroup.style.display = 'none';
        qtyGroup.style.display = 'block';
        qtyInput.value = 1;
        qtyInput.max = Math.max(1, maxQty);

        if (action === 'use') {
            useModeGroup.style.display = 'block';
            document.getElementById('modal-use-nonreserved').checked = true;
            document.getElementById('modal-use-reserved').disabled = reservedQty === 0;
            qtyInput.max = Math.max(1, maxQty);

            const useModeRadios = document.querySelectorAll('input[name="modal-use-mode"]');
            useModeRadios.forEach(radio => {
                radio.onchange = () => {
                    qtyInput.max = radio.value === 'reserved' ? Math.max(1, reservedQty) : Math.max(1, maxQty);
                };
            });

            if (reservedQty > 0) {
                useModeNote.innerText = `${reservedQty} reserved piece${reservedQty === 1 ? '' : 's'} available.`;
            } else {
                useModeNote.innerText = 'No reserved pieces currently available.';
            }
        } else {
            useModeGroup.style.display = 'none';
        }
    }

    modal.style.display = 'flex';
}

function closeTransactionModal() {
    document.getElementById('transaction-modal').style.display = 'none';
}

function openEditModal(button) {
    const data = button.dataset;
    const modal = document.getElementById('edit-modal');
    if (!modal) return;

    const originalUser = data.user || 'System';
    window.currentEditTx = { rowNumber: Number(data.row), tabName: data.tab, pageMode: PAGE_MODE, originalUser, id: data.id };
    document.getElementById('edit-modal-title').innerText = 'Edit Row';
    document.getElementById('edit-modal-part-id').innerText = `${data.tab} | ${data.id}`;

    document.getElementById('edit-id').value = data.id || '';
    document.getElementById('edit-type').value = data.type || '';
    document.getElementById('edit-thickness').value = data.thickness || '';
    document.getElementById('edit-size').value = data.size || '';
    document.getElementById('edit-location').value = data.location || '';
    document.getElementById('edit-cert').value = data.cert || '';
    const editUserEl = document.getElementById('edit-user');
    editUserEl.value = originalUser;
    editUserEl.readOnly = true;
    document.getElementById('edit-date').value = data.dateadded || '';
    document.getElementById('edit-notes').value = data.notes || '';
    document.getElementById('edit-note-count').innerText = `${(data.notes || '').length}/50`;

    const minStockGroup = document.getElementById('edit-min-stock-group');
    const reservedForGroup = document.getElementById('edit-reserved-for-group');
    const qtyGroup = document.getElementById('edit-qty-group');
    const totalGroup = document.getElementById('edit-total-group');
    const reservedForInput = document.getElementById('edit-reserved-for');

    if (IS_CROPPER_PAGE) {
        if (minStockGroup) minStockGroup.style.display = 'none';
        if (reservedForGroup) reservedForGroup.style.display = 'grid';
        if (qtyGroup) qtyGroup.style.display = 'none';
        if (totalGroup) totalGroup.style.display = 'none';
        if (reservedForInput) reservedForInput.value = data.reservedFor || '';
    } else {
        if (minStockGroup) minStockGroup.style.display = 'grid';
        if (reservedForGroup) reservedForGroup.style.display = 'none';
        if (qtyGroup) qtyGroup.style.display = 'grid';
        if (totalGroup) totalGroup.style.display = 'grid';
        const editAvailEl = document.getElementById('edit-available');
        const editTotalEl = document.getElementById('edit-total');
        const editMinEl = document.getElementById('edit-min-stock');
        if (editAvailEl) editAvailEl.value = data.available || 0;
        if (editTotalEl) editTotalEl.value = data.total || 0;
        if (editMinEl) editMinEl.value = data.minstock || 0;
    }

    modal.style.display = 'flex';
}

function closeEditModal() {
    const modal = document.getElementById('edit-modal');
    if (modal) modal.style.display = 'none';
}

function closeHistoryModal() {
    const modal = document.getElementById('history-modal');
    if (modal) modal.style.display = 'none';
}

async function viewEditHistory() {
    const { id, tabName } = window.currentEditTx || {};
    if (!id || !tabName) return;
    
    const modal = document.getElementById('history-modal');
    const historyList = document.getElementById('history-list');
    if (!modal || !historyList) return;

    document.getElementById('history-modal-title').innerText = 'Edit History';
    document.getElementById('history-modal-id').innerText = `${tabName} | ${id}`;
    historyList.innerHTML = '<div style="color:var(--text-muted);">Loading history...</div>';
    modal.style.display = 'flex';

    try {
        const resp = await fetch(`${SHEET_CONFIG.SCRIPT_URL}?id=${window.CURRENT_RESOURCE_ID}&getHistory=1&itemId=${encodeURIComponent(id)}&tabName=${encodeURIComponent(tabName)}`);
        if (!resp.ok) throw new Error('Failed to fetch history');
        const history = await resp.json();

        if (!Array.isArray(history) || history.length === 0) {
            historyList.innerHTML = '<div style="color:var(--text-muted); padding:12px; text-align:center;">No edit history yet</div>';
            return;
        }

        historyList.innerHTML = '';
        history.forEach(entry => {
            const item = document.createElement('div');
            item.style.cssText = 'padding:10px; border:1px solid var(--border); border-radius:6px; background:#0a0a0b; font-size:0.85rem;';
            const timestamp = entry.timestamp || 'Unknown';
            const field = entry.field || 'unknown';
            const oldVal = escapeHtml(String(entry.oldValue || ''));
            const newVal = escapeHtml(String(entry.newValue || ''));
            const changedBy = entry.changedBy || 'System';
            
            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                    <span style="color:var(--accent); font-weight:700;">${field}</span>
                    <span style="color:var(--text-muted); font-size:0.75rem;">${timestamp}</span>
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                    <span style="color:var(--text-muted);">${oldVal || '(empty)'}</span>
                    <span style="color:var(--accent); font-weight:700;">→</span>
                    <span style="color:#22c55e;">${newVal || '(empty)'}</span>
                </div>
                <div style="margin-top:6px; color:var(--text-muted); font-size:0.75rem;">By: ${changedBy}</div>
            `;
            historyList.appendChild(item);
        });
    } catch (err) {
        console.error('Error fetching history:', err);
        historyList.innerHTML = '<div style="color:#ef4444; padding:12px;">Error loading history</div>';
    }
}

async function submitEdit() {
    const { rowNumber, tabName, id } = window.currentEditTx || {};
    if (!rowNumber || !tabName) return;

    const payload = {
        action: 'updateRow',
        rowNumber,
        tabName,
        pageMode: PAGE_MODE,
        sheetId: window.CURRENT_RESOURCE_ID,
        id: sanitizeInput(document.getElementById('edit-id')?.value),
        type: document.getElementById('edit-type')?.value,
        thickness: document.getElementById('edit-thickness')?.value,
        size: sanitizeInput(document.getElementById('edit-size')?.value),
        location: sanitizeInput(document.getElementById('edit-location')?.value),
        cert: sanitizeInput(document.getElementById('edit-cert')?.value),
        user: window.currentEditTx?.originalUser || 'System',
        dateAdded: sanitizeInput(document.getElementById('edit-date')?.value),
        notes: sanitizeInput(document.getElementById('edit-notes')?.value).slice(0, 50)
    };

    if (!payload.cert) {
        showToast('Cert # is required.', 'error');
        return;
    }

    if (IS_CROPPER_PAGE) {
        payload.reservedFor = sanitizeInput(document.getElementById('edit-reserved-for')?.value || '');
    } else {
        payload.availableQty = parseInt(document.getElementById('edit-available')?.value) || 0;
        payload.totalQty = parseInt(document.getElementById('edit-total')?.value) || 0;
        payload.minStock = parseInt(document.getElementById('edit-min-stock')?.value) || 0;
        if (payload.availableQty > payload.totalQty) {
            showToast('Available quantity cannot exceed total quantity.', 'error');
            return;
        }
    }

    console.log('submitEdit payload:', payload);
    await postTransaction(payload);
}

async function submitTransaction() {
    const { action, row, tab, availQty, totalQty, reservedQty } = window.currentTx;
    const payload = { rowNumber: row, tabName: tab };

    if (IS_CROPPER_PAGE) {
        if (action === 'reserve') {
            const rawValue = sanitizeInput(document.getElementById('modal-reserved-for-input')?.value || '');
            let reservedFor = 'RESERVED';
            if (rawValue) {
                reservedFor = /^JOB\b/i.test(rawValue) ? rawValue : `JOB ${rawValue}`;
            }
            payload.action = 'reserve';
            payload.pageMode = PAGE_MODE;
            payload.reserveFor = reservedFor;
        } else if (action === 'use') {
            payload.action = 'useCropper';
            payload.pageMode = PAGE_MODE;
        }
    } else {
        const qtyVal = parseInt(document.getElementById('modal-qty-input')?.value) || 1;

        if (action === 'reserve') {
            if (qtyVal > availQty) {
                    showToast(`ERROR: Cannot reserve ${qtyVal} units. Only ${availQty} available.`, 'error');
                return;
            }
            payload.action = 'reserve';
            payload.reserveQty = qtyVal;
        } else {
            const selectedUseMode = document.querySelector('input[name="modal-use-mode"]:checked')?.value || 'nonReserved';
            if (selectedUseMode === 'reserved') {
                if (qtyVal > reservedQty) {
                    showToast(`ERROR: Cannot use ${qtyVal} reserved units. Only ${reservedQty} reserved.`, 'error');
                    return;
                }
                payload.action = 'useReservedQty';
                payload.usedQty = qtyVal;
            } else {
                if (qtyVal > availQty) {
                    showToast(`ERROR: Cannot use ${qtyVal} units from non-reserved stock. Only ${availQty} available.`, 'error');
                    return;
                }
                payload.action = 'updateQty';
                payload.usedQty = qtyVal;
            }
        }
    }

    await postTransaction(payload);
}

async function postTransaction(payload) {
    payload.sheetId = window.CURRENT_RESOURCE_ID;
    try {
        showLoader(true, 'Processing...');
        console.log('Sending POST payload:', JSON.stringify(payload));
        const resp = await fetch(SHEET_CONFIG.SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
        if (!resp.ok) throw new Error('Server returned error');
        // Refresh in-place: update dropdowns and reload inventory without full page reload
        try {
            await populateDropdowns();
        } catch (e) { console.warn('populateDropdowns after post failed', e); }
        // If this was an 'add' action, reset filters to show all by default
        try {
            if (payload && payload.action === 'add') {
                try { resetFilters(); } catch (e) { console.warn('resetFilters failed', e); }
            } else {
                try { await loadInventoryData(); } catch (e) { console.warn('loadInventoryData after post failed', e); }
            }
        } catch (e) { console.warn('postTransaction refresh handling failed', e); }
        // close modals and hide loader
        try { closeTransactionModal(); } catch (e) {}
        try { closeEditModal(); } catch (e) {}
        showLoader(false);
        showToast('Transaction processed.', 'success');
    } catch (error) {
        showLoader(false);
        showToast('Error processing transaction.', 'error');
        console.error('postTransaction error', error);
        // fallback: reload to ensure UI isn't stale
        try { location.reload(); } catch (e) {}
    }
}

async function submitNewItem() {
    const type = document.getElementById('new-type')?.value;
    const thickness = document.getElementById('new-thickness')?.value;
    const size = sanitizeInput(`${document.getElementById('new-len')?.value || ''} x ${document.getElementById('new-wid')?.value || ''}`);
    const location = sanitizeInput(document.getElementById('new-location')?.value);
    const notes = sanitizeInput(document.getElementById('new-notes')?.value || '');
    const user = auth?.currentUser?.email || 'System';
    const dateAdded = new Date().toLocaleString('en-US', { hour12: false });
    const cert = sanitizeInput(document.getElementById('new-cert-add')?.value || '');

    if (!cert) {
        showToast('Cert # is required.', 'error');
        return;
    }

    const payload = {
        action: 'add',
        pageMode: PAGE_MODE,
        tabName: type,
        id: 'LN-' + Math.random().toString(36).substr(2, 4).toUpperCase(),
        type,
        thickness,
        size,
        location,
        user,
        dateAdded,
        notes,
        cert
    };

    if (IS_CROPPER_PAGE) {
        payload.reservedFor = '';
    } else {
        payload.qty = parseInt(document.getElementById('new-qty')?.value) || 1;
    }

    await postTransaction(payload);
}

function toggleForm() {
    const form = document.getElementById('add-item-form');
    if (form) {
        form.style.display = form.style.display === 'none' || form.style.display === '' ? 'block' : 'none';
    }
}

function resetFilters() {
    const ids = ['filter-material', 'filter-thickness', 'filter-location', 'filter-status', 'filter-size', 'filter-cert'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = el.tagName === 'SELECT' ? (id === 'filter-status' ? '' : 'All') : '';
    });
    loadInventoryData();
}
