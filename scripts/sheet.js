/**
 * LNI CONSOLE - MATERIAL MANAGEMENT LOGIC
 * Version: 6.0 (Cropper and Full Sheet Actions)
 */

let cachedInventory = [];
const PAGE_MODE = document.body?.dataset.pageMode || 'full-sheet';
const IS_CROPPER_PAGE = PAGE_MODE === 'croppers';

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

document.addEventListener('DOMContentLoaded', () => {
    initializeInterface();
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

function initializeInterface() {
    populateDropdowns();
}

function populateDropdowns() {
    const dropdownMapping = {
        'filter-material': DATA_OPTIONS.materials,
        'new-type': DATA_OPTIONS.materials.filter(m => m !== 'All'),
        'edit-type': DATA_OPTIONS.materials.filter(m => m !== 'All'),
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
        el.innerHTML = id.startsWith('filter') ? '<option value="All">All</option>' : '';
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            el.appendChild(option);
        });
    }
}

async function loadInventoryData() {
    const spreadsheetId = window.CURRENT_RESOURCE_ID;
    const materialSelect = document.getElementById('filter-material');
    const selectedTab = materialSelect ? materialSelect.value : 'All';

    if (!spreadsheetId || typeof SHEET_CONFIG === 'undefined') return;

    try {
        const response = await fetch(`${SHEET_CONFIG.SCRIPT_URL}?id=${spreadsheetId}&tab=${selectedTab}&pageMode=${PAGE_MODE}`);
        cachedInventory = await response.json();
        applyFilters();
    } catch (error) {
        console.error('Failed to fetch inventory:', error);
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
                        data-total="${total}">EDIT</button>
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
    window.currentEditTx = { rowNumber: Number(data.row), tabName: data.tab, pageMode: PAGE_MODE, originalUser };
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

    const reservedForGroup = document.getElementById('edit-reserved-for-group');
    const qtyGroup = document.getElementById('edit-qty-group');
    const totalGroup = document.getElementById('edit-total-group');
    const reservedForInput = document.getElementById('edit-reserved-for');

    if (IS_CROPPER_PAGE) {
        if (reservedForGroup) reservedForGroup.style.display = 'grid';
        if (qtyGroup) qtyGroup.style.display = 'none';
        if (totalGroup) totalGroup.style.display = 'none';
        if (reservedForInput) reservedForInput.value = data.reservedFor || '';
    } else {
        if (reservedForGroup) reservedForGroup.style.display = 'none';
        if (qtyGroup) qtyGroup.style.display = 'grid';
        if (totalGroup) totalGroup.style.display = 'grid';
        document.getElementById('edit-available').value = data.available || 0;
        document.getElementById('edit-total').value = data.total || 0;
    }

    modal.style.display = 'flex';
}

function closeEditModal() {
    const modal = document.getElementById('edit-modal');
    if (modal) modal.style.display = 'none';
}

async function submitEdit() {
    const { rowNumber, tabName } = window.currentEditTx || {};
    if (!rowNumber || !tabName) return;

    const payload = {
        action: 'updateRow',
        rowNumber,
        tabName,
        pageMode: PAGE_MODE,
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
        alert('Cert # is required.');
        return;
    }

    if (IS_CROPPER_PAGE) {
        payload.reservedFor = sanitizeInput(document.getElementById('edit-reserved-for')?.value || '');
    } else {
        payload.availableQty = parseInt(document.getElementById('edit-available')?.value) || 0;
        payload.totalQty = parseInt(document.getElementById('edit-total')?.value) || 0;
        if (payload.availableQty > payload.totalQty) {
            alert('Available quantity cannot exceed total quantity.');
            return;
        }
    }

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
                alert(`ERROR: Cannot reserve ${qtyVal} units. Only ${availQty} available.`);
                return;
            }
            payload.action = 'reserve';
            payload.reserveQty = qtyVal;
        } else {
            const selectedUseMode = document.querySelector('input[name="modal-use-mode"]:checked')?.value || 'nonReserved';
            if (selectedUseMode === 'reserved') {
                if (qtyVal > reservedQty) {
                    alert(`ERROR: Cannot use ${qtyVal} reserved units. Only ${reservedQty} reserved.`);
                    return;
                }
                payload.action = 'useReservedQty';
                payload.usedQty = qtyVal;
            } else {
                if (qtyVal > availQty) {
                    alert(`ERROR: Cannot use ${qtyVal} units from non-reserved stock. Only ${availQty} available.`);
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
        await fetch(SHEET_CONFIG.SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
        location.reload();
    } catch (error) {
        location.reload();
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
        alert('Cert # is required.');
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
