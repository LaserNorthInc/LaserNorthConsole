/**
 * LNI CONSOLE - MATERIAL MANAGEMENT LOGIC
 * Version: 6.0 (Cropper and Full Sheet Actions)
 */

let cachedInventory = [];
const PAGE_MODE = document.body?.dataset.pageMode || 'full-sheet';
const IS_CROPPER_PAGE = PAGE_MODE === 'croppers';

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
    const sizeSearch = document.getElementById('filter-size')?.value?.toLowerCase() || '';
    const certSearch = document.getElementById('filter-cert')?.value?.toLowerCase() || '';

    const filtered = cachedInventory.filter(item => {
        const matchThick = thickness === 'All' || item.thickness === thickness;
        const matchLoc = location === 'All' || item.location === location;
        const matchSize = !sizeSearch || String(item.size || '').toLowerCase().includes(sizeSearch);
        const matchCert = !certSearch || String(item.cert || item.availableStock || '').toLowerCase().includes(certSearch);
        return matchThick && matchLoc && matchSize && matchCert;
    });

    renderInventoryTable(filtered);
}

function cleanDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (isNaN(date)) return dateStr;
    return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
}

function renderInventoryTable(data) {
    const tableBody = document.getElementById('inventory-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = data.map(item => {
        const cert = item.cert || item.availableStock || '';
        const reservedFor = item.reservedFor || '';
        const reservedDisplay = reservedFor ? reservedFor : 'AVAILABLE';
        const reservedClass = reservedFor ? 'status-reserved' : 'status-available';
        const dateAdded = cleanDate(item.dateAdded || item.dateAddedRaw || '');
        const notes = item.notes || '';
        const user = item.user || 'System';
        const avail = parseInt(item.availableStock) || 0;
        const total = parseInt(item.totalStock) || 0;

        if (IS_CROPPER_PAGE) {
            return `
                <tr>
                    <td data-label="ID">${item.id}</td>
                    <td data-label="Type">${item.type}</td>
                    <td data-label="Thickness">${item.thickness}</td>
                    <td data-label="Size">${item.size}</td>
                    <td data-label="Location">${item.location}</td>
                    <td data-label="Cert">${cert}</td>
                    <td data-label="Date Added">${dateAdded}</td>
                    <td data-label="Reserved For" class="${reservedClass}">${reservedDisplay}</td>
                    <td data-label="User">${user}</td>
                    <td data-label="Notes">${notes}</td>
                    <td class="action-cell">
                        <button onclick="openTransactionModal('use', ${item.rowNumber}, '${item.id}', '${item.tabName}', 0)" class="btn-action btn-remove">USE</button>
                        <button onclick="openTransactionModal('reserve', ${item.rowNumber}, '${item.id}', '${item.tabName}', 0, '${reservedFor.replace(/'/g, "\\'")}')" class="btn-action btn-secondary">RESERVE</button>
                        <button onclick="openNoteModal(${item.rowNumber}, '${item.tabName}', '${item.id}', '${notes.replace(/'/g, "\\'")}')" class="btn-action btn-secondary">NOTE</button>
                    </td>
                </tr>`;
        }

        return `
            <tr>
                <td data-label="ID">${item.id}</td>
                <td data-label="Type">${item.type}</td>
                <td data-label="Thickness">${item.thickness}</td>
                <td data-label="Size">${item.size}</td>
                <td data-label="Location">${item.location}</td>
                <td data-label="Available Qty" class="qty-avail" style="color:var(--success); font-weight:800;">${avail}</td>
                <td data-label="Total Qty" class="qty-total">${total}</td>
                <td data-label="Date Added">${dateAdded}</td>
                <td data-label="User">${user}</td>
                <td data-label="Notes">${notes}</td>
                <td class="action-cell">
                    <button onclick="openTransactionModal('use', ${item.rowNumber}, '${item.id}', '${item.tabName}', ${avail}, ${total})" class="btn-action btn-remove">USE</button>
                    <button onclick="openTransactionModal('reserve', ${item.rowNumber}, '${item.id}', '${item.tabName}', ${avail})" class="btn-action btn-secondary">RESERVE</button>
                    <button onclick="openNoteModal(${item.rowNumber}, '${item.tabName}', '${item.id}', '${notes.replace(/'/g, "\\'")}')" class="btn-action btn-secondary">NOTE</button>
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

function openNoteModal(row, tab, id, currentNotes = '') {
    const modal = document.getElementById('note-modal');
    if (!modal) return;

    window.currentNoteTx = { rowNumber: row, tabName: tab };
    document.getElementById('note-modal-title').innerText = 'Edit Notes';
    document.getElementById('note-modal-part-id').innerText = `${tab} | ${id}`;
    const noteInput = document.getElementById('note-modal-input');
    noteInput.value = currentNotes || '';
    document.getElementById('note-modal-count').innerText = `${noteInput.value.length}/50`;
    noteInput.oninput = () => document.getElementById('note-modal-count').innerText = `${noteInput.value.length}/50`;
    modal.style.display = 'flex';
}

function closeNoteModal() {
    const modal = document.getElementById('note-modal');
    if (modal) modal.style.display = 'none';
}

async function submitNote() {
    const { rowNumber, tabName } = window.currentNoteTx || {};
    const noteInput = document.getElementById('note-modal-input');
    if (!noteInput || !rowNumber || !tabName) return;

    const noteValue = noteInput.value.trim().slice(0, 50);
    const payload = {
        action: 'updateNote',
        rowNumber,
        tabName,
        note: noteValue
    };

    await postTransaction(payload);
}

async function submitTransaction() {
    const { action, row, tab, availQty, totalQty, reservedQty } = window.currentTx;
    const payload = { rowNumber: row, tabName: tab };

    if (IS_CROPPER_PAGE) {
        if (action === 'reserve') {
            const rawValue = document.getElementById('modal-reserved-for-input')?.value.trim();
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
    const size = `${document.getElementById('new-len')?.value || ''} x ${document.getElementById('new-wid')?.value || ''}`;
    const location = document.getElementById('new-location')?.value;
    const notes = document.getElementById('new-notes')?.value || '';
    const user = auth?.currentUser?.email || 'System';
    const dateAdded = new Date().toLocaleDateString('en-US');

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
        notes
    };

    if (IS_CROPPER_PAGE) {
        payload.cert = document.getElementById('new-cert-add')?.value || '';
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
    const ids = ['filter-material', 'filter-thickness', 'filter-location', 'filter-size', 'filter-cert'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = el.tagName === 'SELECT' ? 'All' : '';
    });
    loadInventoryData();
}
