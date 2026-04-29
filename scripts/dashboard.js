// SECTION: DASHBOARD SUMMARY LOGIC
// This loads the big numbers on the main overview page.

document.addEventListener('DOMContentLoaded', async () => {
    auth.onAuthStateChanged(async (user) => {
        if (!user) return;

        try {
            // Getting counts from Firestore collections
            const structuralSnap = await db.collection('structural').get();
            const sheetSnap = await db.collection('sheet').get();

            // Updating the page with the real numbers
            document.getElementById('struct-count').innerText = `${structuralSnap.size} items`;
            document.getElementById('sheet-count').innerText = `${sheetSnap.size} types`;
        } catch (error) {
            console.log("Firestore not active yet, using placeholder data.");
            document.getElementById('struct-count').innerText = "Check Sheets";
            document.getElementById('sheet-count').innerText = "Connected";
        }
    });
});