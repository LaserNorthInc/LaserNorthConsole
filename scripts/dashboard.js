// This dashboard file is intended to load summary counts for the overview page.
// It reads data from Firestore and updates the page with inventory totals.

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Dashboard Loaded - Fetching Overview...");
    
    try {
        // Replace these with your actual Firestore collections if used.
        const structuralSnap = await db.collection('structural').get();
        const sheetSnap = await db.collection('sheet').get();

        document.getElementById('structural-summary').innerText = 
            `${structuralSnap.size} unique items in stock.`;
        
        document.getElementById('sheet-summary').innerText = 
            `${sheetSnap.size} material types available.`;
    } catch (error) {
        // If there is an error, show it in the browser console for debugging.
        console.error("Summary fetch failed:", error);
    }
});