// SECTION: STRUCTURAL INVENTORY LOADING
// This pulls data directly from the Beams and Tubing Google Sheets.

document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) loadAllStructural();
    });
});

async function loadAllStructural() {
    const tableBody = document.getElementById('inventory-list');
    if (!tableBody) return;

    const sources = [SHEET_CONFIG.IDS.BEAMS, SHEET_CONFIG.IDS.TUBING];
    tableBody.innerHTML = '<tr><td colspan="5">Loading shop data...</td></tr>';

    let htmlOutput = '';

    for (const id of sources) {
        if (!id || id === 'YOUR_SHEET_ID_HERE') continue;

        try {
            const res = await fetch(SHEET_CONFIG.getReadUrl(id));
            const csv = await res.text();
            // Split rows and skip the header
            const rows = csv.split('\n').slice(1);

            rows.forEach(row => {
                const [type, size, len, qty] = row.split(',').map(c => c.replace(/"/g, ''));
                if (type && type.trim() !== "") {
                    htmlOutput += `
                        <tr>
                            <td data-label="Material" class="col-highlight">${type}</td>
                            <td data-label="Size">${size}</td>
                            <td data-label="Length">${len}</td>
                            <td data-label="In Stock">${qty}</td>
                            <td data-label="Action">
                                <button class="btn-update" onclick="alert('Function coming soon')">+</button>
                            </td>
                        </tr>`;
                }
            });
        } catch (e) {
            console.error("Error reading structural sheet:", e);
        }
    }
    tableBody.innerHTML = htmlOutput || '<tr><td colspan="5">No data found. Check Sheet IDs.</td></tr>';
}