async function loadSharedHeader() {
    const placeholder = document.getElementById('header-placeholder');
    if (!placeholder) return;

    try {
        const response = await fetch('header.html');
        if (!response.ok) throw new Error('Unable to load shared header');
        placeholder.innerHTML = await response.text();
        activateSharedHeader();
    } catch (error) {
        console.error('Header load failed:', error);
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
