document.addEventListener('DOMContentLoaded', async () => {
    // Verify user is logged in before fetching data
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            await loadSheetInventory();
        }
    });
});

async function loadSheetInventory() {
    const tableBody = document.getElementById('sheet-table-body');
    const url = SHEET_CONFIG.getUrl(SHEET_CONFIG.SHEET_STOCK_ID);

    try {
        const response = await fetch(url);
        const data = await response.text();
        
        // Simple CSV Parser (Split by line, then by comma)
        const rows = data.split('\n').slice(1); // slice(1) skips the header row
        
        tableBody.innerHTML = ''; // Clear "Loading" message

        rows.forEach(row => {
            const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); // Regex to handle commas inside quotes
            
            if (cols.length > 1) {
                const [material, gauge, width, length, qty] = cols.map(c => c.replace(/"/g, ''));
                
                const statusClass = parseInt(qty) < 5 ? 'stock-low' : 'stock-ok';
                const statusText = parseInt(qty) < 5 ? 'Low' : 'OK';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="col-highlight">${material}</td>
                    <td>${gauge}</td>
                    <td>${width} x ${length}</td>
                    <td>${qty}</td>
                    <td><span class="stock-badge ${statusClass}">${statusText}</span></td>
                    <td><button class="btn-icon">✎</button></td>
                `;
                tableBody.appendChild(tr);
            }
        });
    } catch (error) {
        console.error("Error loading Sheet data:", error);
        tableBody.innerHTML = '<tr><td colspan="6">Error loading data. Check Sheet permissions.</td></tr>';
    }
}