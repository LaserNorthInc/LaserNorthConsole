async function loadSharedHeader() {
    const placeholder = document.getElementById('header-placeholder');
    if (!placeholder) return;

    try {
        const response = await fetch('header.html');
        if (!response.ok) throw new Error('Unable to load shared header');
        placeholder.innerHTML = await response.text();
        activateSharedHeader();
        
        // Initialize the Online Status check
        updateOnlineStatus();
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);

        try { window._sharedHeaderLoaded = Date.now(); if (window.indexSheetData) window.indexSheetData(); } catch(e){}
    } catch (error) {
        console.error('Header load failed:', error);
    }
}

// Function to handle real-time connectivity status
function updateOnlineStatus() {
    const dot = document.getElementById('status-dot');
    const text = document.getElementById('status-text');
    if (!dot || !text) return;

    if (navigator.onLine) {
        dot.style.backgroundColor = 'var(--success)';
        dot.style.boxShadow = '0 0 8px var(--success)';
        text.innerText = 'System Online';
        text.style.color = 'var(--success)';
    } else {
        dot.style.backgroundColor = 'var(--danger)';
        dot.style.boxShadow = '0 0 8px var(--danger)';
        text.innerText = 'System Offline';
        text.style.color = 'var(--danger)';
    }
}

function activateSharedHeader() {
    const pagePath = window.location.pathname.split('/').pop().toLowerCase();
    const bodyMode = document.body.dataset.pageMode;
    let activePage = bodyMode || pagePath.replace('.html', '');

    if (activePage === 'sheet') activePage = 'croppers';
    if (activePage === 'full-sheets') activePage = 'full-sheet';
    if (!activePage || activePage === 'index') activePage = 'dashboard';

    document.querySelectorAll('.nav-tabs [data-page]').forEach(el => {
        el.classList.toggle('active', el.dataset.page === activePage);
    });

    const dropdownToggle = document.querySelector('.dropdown-btn');
    if (dropdownToggle) {
        const isSheetPage = activePage === 'croppers' || activePage === 'full-sheet';
        dropdownToggle.classList.toggle('active', isSheetPage);
    }
}

document.addEventListener('DOMContentLoaded', loadSharedHeader);