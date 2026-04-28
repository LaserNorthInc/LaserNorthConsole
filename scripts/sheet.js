document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            // Check if user email is an admin (Modify with your email)
            if (user.email === 'admin@lasernorthinc.com') {
                document.getElementById('admin-add-btn').style.display = 'block';
            }
            loadSheetData();
        }
    });
});

async function loadSheetData() {
    const list = document.getElementById('sheet-list');
    // Fetch from 'Full Sheet' and 'Cropper Sheet'
    const sources = [
        {id: SHEET_CONFIG.IDS.FULL_SHEET, gid: SHEET_CONFIG.TABS.STEEL},
        {id: SHEET_CONFIG.IDS.CROPPER_SHEET, gid: SHEET_CONFIG.TABS.STEEL}
    ];
    
    let html = '';
    for (const source of sources) {
        const res = await fetch(SHEET_CONFIG.getTabUrl(source.id, source.gid));
        const data = await res.text();
        const rows = data.split('\n').slice(1);
        
        rows.forEach(r => {
            const [mat, gauge, size, qty] = r.split(',').map(c => c.replace(/"/g, ''));
            if(mat) html += `
                <tr>
                    <td data-label="Material" class="col-highlight">${mat}</td>
                    <td data-label="Gauge">${gauge}</td>
                    <td data-label="Size">${size}</td>
                    <td data-label="Qty">${qty}</td>
                    <td data-label="Status"><span class="stock-badge ${qty < 5 ? 'stock-low' : 'stock-ok'}">${qty < 5 ? 'Low' : 'OK'}</span></td>
                </tr>`;
        });
    }
    list.innerHTML = html;
}

function toggleAddForm() {
    const form = document.getElementById('add-item-form');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

async function submitNewItem() {
    const payload = {
        sheetId: SHEET_CONFIG.IDS.FULL_SHEET, // Target sheet
        material: document.getElementById('new-material').value,
        gauge: document.getElementById('new-gauge').value,
        size: document.getElementById('new-size').value,
        qty: document.getElementById('new-qty').value
    };

    const response = await fetch(SHEET_CONFIG.SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    if (response.ok) {
        alert("Item Added!");
        location.reload();
    }
}