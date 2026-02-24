// Data Entry Supervision - Main JavaScript

// DOM Elements
const refreshBtn = document.getElementById('refreshBtn');
const approveBtn = document.getElementById('approveBtn');
const rejectBtn = document.getElementById('rejectBtn');

// Form Elements
const mainModule = document.getElementById('mainModule');
const itemCount = document.getElementById('itemCount');
const emptyState = document.getElementById('emptyState');
const itemsList = document.getElementById('itemsList');
const noDataMessage = document.getElementById('noDataMessage');
const detailsContent = document.getElementById('detailsContent');

// Tab Elements
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Stats Elements
const statPending = document.getElementById('statPending');
const statApproved = document.getElementById('statApproved');
const statRejected = document.getElementById('statRejected');

// Data Storage
let pendingItems = [];
let selectedItem = null;
let stats = {
    pending: 0,
    approvedToday: 0,
    rejectedToday: 0
};

// Event Listeners
refreshBtn.addEventListener('click', refreshData);
approveBtn.addEventListener('click', approveItem);
rejectBtn.addEventListener('click', rejectItem);
mainModule.addEventListener('change', loadModuleItems);

// Tab Switching
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.getAttribute('data-tab');
        switchTab(tabName);
    });
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateStats();
});

function loadModuleItems() {
    const module = mainModule.value;
    
    if (!module) {
        showEmptyState();
        return;
    }

    // Show empty state - no dummy data
    showEmptyState();
}

function renderItems() {
    emptyState.style.display = 'none';
    itemsList.style.display = 'block';
    itemsList.innerHTML = '';

    pendingItems.forEach(item => {
        const itemCard = document.createElement('div');
        itemCard.className = 'item-card';
        itemCard.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div>
                    <h4 style="margin: 0 0 8px 0; font-size: 14px; color: var(--text-dark);">
                        <i class="bi bi-file-earmark-text" style="color: var(--primary-blue);"></i>
                        ${item.type}
                    </h4>
                    <p style="margin: 0; font-size: 12px; color: var(--text-gray);">
                        <strong>Reference:</strong> ${item.reference}
                    </p>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: var(--text-gray);">
                        <strong>Created By:</strong> ${item.createdBy} on ${item.createdDate}
                    </p>
                </div>
                <span style="padding: 4px 12px; background: var(--warning); color: white; border-radius: 12px; font-size: 11px; font-weight: 600;">
                    ${item.status}
                </span>
            </div>
        `;
        
        itemCard.addEventListener('click', () => selectItem(item, itemCard));
        itemsList.appendChild(itemCard);
    });

    itemCount.textContent = pendingItems.length;
}

function selectItem(item, cardElement) {
    // Remove previous selection
    document.querySelectorAll('.item-card').forEach(card => {
        card.classList.remove('selected');
    });

    // Add selection to clicked card
    cardElement.classList.add('selected');
    selectedItem = item;

    // Show item details
    showItemDetails(item);
}

function showItemDetails(item) {
    noDataMessage.style.display = 'none';
    detailsContent.style.display = 'block';
    
    detailsContent.innerHTML = `
        <div style="display: grid; gap: 16px;">
            <div style="display: grid; grid-template-columns: 150px 1fr; gap: 12px; padding: 12px; background: var(--secondary-gray); border-radius: 4px;">
                <strong>Module:</strong>
                <span>${item.module}</span>
                
                <strong>Type:</strong>
                <span>${item.type}</span>
                
                <strong>Reference:</strong>
                <span>${item.reference}</span>
                
                <strong>Created By:</strong>
                <span>${item.createdBy}</span>
                
                <strong>Created Date:</strong>
                <span>${item.createdDate}</span>
                
                <strong>Status:</strong>
                <span style="color: var(--warning); font-weight: 600;">${item.status}</span>
            </div>
            
            <div style="padding: 12px; border: 1px solid var(--border-color); border-radius: 4px;">
                <h4 style="margin: 0 0 12px 0; font-size: 14px; color: var(--text-dark);">
                    <i class="bi bi-info-circle"></i> Additional Information
                </h4>
                <p style="color: var(--text-gray); font-size: 13px;">
                    This item is pending supervisor approval. Review the changes and approve or reject accordingly.
                </p>
            </div>
        </div>
    `;
}

function showEmptyState() {
    emptyState.style.display = 'block';
    itemsList.style.display = 'none';
    itemCount.textContent = '0';
    stats.pending = 0;
    updateStats();
}

function refreshData() {
    showMessage('Refreshing data...', 'info');
    
    if (mainModule.value) {
        loadModuleItems();
    }
    
    showMessage('Data refreshed successfully', 'success');
}

function approveItem() {
    if (!selectedItem) {
        showMessage('Please select an item to approve', 'warning');
        return;
    }

    if (confirm(`Are you sure you want to approve "${selectedItem.type}" (${selectedItem.reference})?`)) {
        // Remove from pending items
        pendingItems = pendingItems.filter(item => item.id !== selectedItem.id);
        stats.pending = pendingItems.length;
        stats.approvedToday++;
        
        renderItems();
        updateStats();
        
        // Clear selection
        selectedItem = null;
        noDataMessage.style.display = 'block';
        detailsContent.style.display = 'none';
        
        showMessage('Item approved successfully', 'success');
    }
}

function rejectItem() {
    if (!selectedItem) {
        showMessage('Please select an item to reject', 'warning');
        return;
    }

    const reason = prompt('Please enter the reason for rejection:');
    if (reason) {
        // Remove from pending items
        pendingItems = pendingItems.filter(item => item.id !== selectedItem.id);
        stats.pending = pendingItems.length;
        stats.rejectedToday++;
        
        renderItems();
        updateStats();
        
        // Clear selection
        selectedItem = null;
        noDataMessage.style.display = 'block';
        detailsContent.style.display = 'none';
        
        showMessage('Item rejected successfully', 'success');
    }
}

function switchTab(tabName) {
    // Remove active class from all tabs
    tabBtns.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));

    // Add active class to selected tab
    const selectedBtn = document.querySelector(`[data-tab="${tabName}"]`);
    const selectedContent = document.getElementById(`${tabName}Tab`);
    
    if (selectedBtn && selectedContent) {
        selectedBtn.classList.add('active');
        selectedContent.classList.add('active');
    }
}

function updateStats() {
    statPending.textContent = stats.pending;
    statApproved.textContent = stats.approvedToday;
    statRejected.textContent = stats.rejectedToday;
}

function showMessage(message, type) {
    // Simple alert for now - can be replaced with toast notifications
    const icon = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
    };

    alert(`${icon[type] || ''} ${message}`);
}
