// scripts/dashboard.js
document.addEventListener('DOMContentLoaded', () => {
    initStructuralApp();
});

async function initStructuralApp() {
    console.log("Initializing Structural Inventory...");
    const data = await fetchStructuralData();
    renderStructuralTable(data);
}

async function fetchStructuralData() {
    // Placeholder for Firebase or Sheet Fetch
    // Example: const snapshot = await getDocs(collection(db, "structural"));
    return [
        { id: "B1", type: "I-Beam", size: "10x20", length: "20ft", qty: 5 },
        { id: "T1", type: "Tube", size: "4x4", length: "10ft", qty: 12 }
    ];
}

function renderStructuralTable(items) {
    const container = document.getElementById('inventory-output');
    if (!container) return;
    
    container.innerHTML = items.map(item => `
        <div class="inventory-card">
            <h3>${item.type} (${item.size})</h3>
            <p>Length: ${item.length} | Stock: <strong>${item.qty}</strong></p>
        </div>
    `).join('');
}