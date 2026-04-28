document.addEventListener('DOMContentLoaded', () => {
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            loadAllStructural();
        }
    });
});

async function loadAllStructural() {
    const tableBody = document.getElementById('structural-data');
    
    // IDs from your config.js
    const sources = [SHEET_CONFIG.IDS.STRUCTURAL_BEAMS, SHEET_CONFIG.IDS.STRUCTURAL_TUBING];
    
    tableBody.innerHTML = '<tr><td colspan="5">Fetching inventory...</td></tr>';

    let htmlOutput = '';

    for (const id of sources) {
        try {
            const res = await fetch(SHEET_CONFIG.getReadUrl(id));
            const csv = await res.text();
            const rows = csv.split('\n').slice(1);

            rows.forEach(row => {
                const [type, size, len, qty] = row.split(',').map(c => c.replace(/"/g, ''));
                if (type) {
                    htmlOutput += `
                        <tr>
                            <td data-label="Material" style="color:var(--accent); font-weight:bold;">${type}</td>
                            <td data-label="Size">${size}</td>
                            <td data-label="Length">${len}</td>
                            <td data-label="In Stock">${qty}</td>
                            <td data-label="Action"><button onclick="updateQty('${type}', ${qty})">+</button></td>
                        </tr>`;
                }
            });
        } catch (e) { console.error("Sheet error", e); }
    }
    tableBody.innerHTML = htmlOutput;
}