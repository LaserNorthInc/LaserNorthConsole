// scripts/dashboard.js
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Dashboard Loaded - Fetching Overview...");
    
    // Example: Fetch counts from Firestore
    try {
        const structuralSnap = await db.collection('structural').get();
        const sheetSnap = await db.collection('sheet').get();

        document.getElementById('structural-summary').innerText = 
            `${structuralSnap.size} unique items in stock.`;
        
        document.getElementById('sheet-summary').innerText = 
            `${sheetSnap.size} material types available.`;
            
    } catch (error) {
        console.error("Summary fetch failed:", error);
    }
});