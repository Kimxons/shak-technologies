// Accounting Rule - JavaScript Functions

// Open Rule Details Modal
function showRuleDetailsForm() {
    const modal = document.getElementById('ruleDetailsModal');
    modal.style.display = 'flex';
}

// Close Rule Details Modal
function closeRuleDetailsModal() {
    const modal = document.getElementById('ruleDetailsModal');
    modal.style.display = 'none';
}

// Minimize Rule Details Modal
function minimizeRuleDetailsModal() {
    alert('Minimize functionality');
}

// Toggle Data Entry Menu
function toggleDataEntryMenu() {
    const submenu = document.getElementById('dataEntrySubmenu');
    const icon = document.getElementById('collapseIcon');
    
    if (submenu.style.display === 'none' || submenu.style.display === '') {
        submenu.style.display = 'block';
        icon.textContent = '▲';
    } else {
        submenu.style.display = 'none';
        icon.textContent = '▼';
    }
}

// Open Rule Details Modal
function openRuleDetailsModal() {
    const modal = document.getElementById('ruleDetailsModal');
    modal.style.display = 'flex';
}

// Toggle Rule Details Section
function toggleRuleDetails() {
    const section = document.getElementById('ruleDetailsSection');
    const icon = document.getElementById('collapseIcon');
    
    if (section.style.display === 'none' || section.style.display === '') {
        section.style.display = 'block';
        icon.textContent = '▲';
    } else {
        section.style.display = 'none';
        icon.textContent = '▼';
    }
}

// Keep old functions for compatibility
function showMainForm() {
    closeRuleDetailsModal();
}

function minimizeRuleDetails() {
    minimizeRuleDetailsModal();
}

function handleViewChange(value) {
    if (value === 'details') {
        showRuleDetailsForm();
    }
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const modal = document.getElementById('ruleDetailsModal');
    if (e.target === modal) {
        closeRuleDetailsModal();
    }
});

// Button functionality
document.addEventListener('DOMContentLoaded', function() {
    // Save buttons
    const saveButtons = document.querySelectorAll('.btn-primary');
    saveButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            alert('Form saved successfully!');
        });
    });

    // Search button
    const searchBtn = document.querySelector('.search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', function(e) {
            e.preventDefault();
            alert('Search for existing rules');
        });
    }
});
