import { auth, GOOGLE_SCRIPT_URL } from './config.js';

let currentView = 'full';

// Handle View Toggling
window.setView = (view) => {
    currentView = view;
    const dimGroup = document.getElementById('dimensions-group');
    
    // UI Feedback
    document.getElementById('btnFull').classList.toggle('active', view === 'full');
    document.getElementById('btnCropper').classList.toggle('active', view === 'cropper');

    if (view === 'cropper') {
        dimGroup.innerHTML = `
            <label>Dimensions (inches)</label>
            <div class="flex-row">
                <input type="number" id="length" placeholder="Length" required>
                <span>x</span>
                <input type="number" id="width" placeholder="Width" required>
            </div>
            <label>Quantity</label>
            <input type="number" id="qty" required>
        `;
    } else {
        dimGroup.innerHTML = `
            <label>Quantity (Full Sheets)</label>
            <input type="number" id="qty" required>
        `;
    }
};

// Form Submission
document.getElementById('inventoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        type: currentView,
        material: document.getElementById('material').value,
        thickness: document.getElementById('thickness').value,
        qty: document.getElementById('qty').value,
        dimensions: currentView === 'cropper' 
            ? `${document.getElementById('length').value}x${document.getElementById('width').value}` 
            : 'Full'
    };

    // Send to Google Sheets
    submitToGoogle(formData);
});

async function submitToGoogle(data) {
    const status = document.getElementById('submitBtn');
    status.disabled = true;
    status.innerText = "Saving...";

    try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(data)
        });
        alert("Inventory Updated!");
        document.getElementById('inventoryForm').reset();
    } catch (err) {
        console.error(err);
    } finally {
        status.disabled = false;
        status.innerText = "Log Entry";
    }
}