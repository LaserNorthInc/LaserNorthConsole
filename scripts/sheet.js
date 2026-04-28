// scripts/sheet.js
document.addEventListener('DOMContentLoaded', () => {
    initSheetApp();
});

async function initSheetApp() {
    console.log("Initializing Sheet Inventory...");
    const data = await fetchSheetData();
    renderSheetTable(data);
}

async function fetchSheetData() {
    // Logic for Sheet-specific data
    return [
        { material: "MS", gauge: "10ga", size: "48x96", qty: 25 },
        { material: "AL", gauge: ".125", size: "60x120", qty: 8 }
    ];
}

function renderSheetTable(items) {
    const container = document.getElementById('sheet-output');
    if (!container) return;

    container.innerHTML = `
        <table class="inventory-table">
            <thead>
                <tr><th>Material</th><th>Gauge</th><th>Size</th><th>Qty</th></tr>
            </thead>
            <tbody>
                ${items.map(i => `
                    <tr>
                        <td>${i.material}</td>
                        <td>${i.gauge}</td>
                        <td>${i.size}</td>
                        <td>${i.qty}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}