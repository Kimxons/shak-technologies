// Application Cache Details Module
document.addEventListener('DOMContentLoaded', initializeApplicationCacheDetails);

// Form Control References
let totalItems = null;
let searchField = null;
let filterField = null;
let keys = null;
let lastAccessedTime = null;
let scavengingPriority = null;
let willBeExpired = null;
let eligibleForScavenging = null;
let value = null;
let tableBody = null;
let statusMsg = null;

// Button References
let btnRefresh = null;
let btnDelete = null;
let btnRefreshAction = null;
let btnDeleteAction = null;

// Sample data storage
let cacheData = [
    {
        key: 'UserLoggedIn',
        lastAccessed: '2024-01-14 10:30:45',
        priority: 'High',
        expiration: '2024-01-15',
        scavenging: 'Yes',
        value: 'true'
    },
    {
        key: 'a76d4150-4aa5-4217-9628-f6a2a0f1c905TSEDEY00SARAH172.16.3.0UserBRUserPassword',
        lastAccessed: '2024-01-14 09:15:30',
        priority: 'Critical',
        expiration: '2024-01-16',
        scavenging: 'No',
        value: '•••••••••'
    },
    {
        key: 'a76d4150-4aa5-4217-9628-f6a2a0f1c905TSEDEY00SARAH172.16.3.0DataForTitle',
        lastAccessed: '2024-01-14 08:45:15',
        priority: 'Medium',
        expiration: '2024-01-14 22:00:00',
        scavenging: 'Yes',
        value: 'Dashboard Data'
    }
];

let currentRecord = null;

function initializeApplicationCacheDetails() {
    // Initialize form controls
    totalItems = document.getElementById('totalItems');
    searchField = document.getElementById('searchField');
    filterField = document.getElementById('filterField');
    keys = document.getElementById('keys');
    lastAccessedTime = document.getElementById('lastAccessedTime');
    scavengingPriority = document.getElementById('scavengingPriority');
    willBeExpired = document.getElementById('willBeExpired');
    eligibleForScavenging = document.getElementById('eligibleForScavenging');
    value = document.getElementById('value');
    tableBody = document.getElementById('tableBody');
    statusMsg = document.getElementById('statusMsg');

    // Initialize buttons
    btnRefresh = document.getElementById('btnRefresh');
    btnDelete = document.getElementById('btnDelete');
    btnRefreshAction = document.getElementById('btnRefreshAction');
    btnDeleteAction = document.getElementById('btnDeleteAction');

    // Attach event listeners
    btnRefresh.addEventListener('click', handleRefresh);
    btnDelete.addEventListener('click', handleDelete);
    btnRefreshAction.addEventListener('click', handleRefresh);
    btnDeleteAction.addEventListener('click', handleDelete);
    searchField.addEventListener('keyup', handleSearch);
    filterField.addEventListener('keyup', handleFilter);

    // Populate table
    populateTable();
    updateTotalItems();
    
    // Initialize sidebar navigation
    initializeSidebarNavigation();
}

function populateTable(data = cacheData) {
    tableBody.innerHTML = '';
    
    if (data.length === 0) {
        tableBody.innerHTML = '<tr class="empty-row"><td>No records found</td></tr>';
        return;
    }

    data.forEach(record => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${record.key}</td>`;
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => selectRecord(record));
        tableBody.appendChild(row);
    });
}

function selectRecord(record) {
    currentRecord = record;
    keys.value = record.key;
    lastAccessedTime.value = record.lastAccessed;
    scavengingPriority.value = record.priority;
    willBeExpired.value = record.expiration;
    eligibleForScavenging.value = record.scavenging;
    value.value = record.value;
    
    // Highlight row
    Array.from(tableBody.querySelectorAll('tr')).forEach(row => {
        row.style.backgroundColor = '';
    });
    event.currentTarget.style.backgroundColor = '#e3f2fd';
    
    showStatus('Cache record selected', 'info');
}

function handleRefresh() {
    populateTable();
    updateTotalItems();
    clearDetails();
    showStatus('Cache refreshed successfully', 'success');
}

function handleDelete() {
    if (!currentRecord) {
        showStatus('Please select a cache record to delete', 'warning');
        return;
    }
    
    if (confirm('Are you sure you want to delete this cache entry?')) {
        cacheData = cacheData.filter(r => r.key !== currentRecord.key);
        populateTable();
        updateTotalItems();
        clearDetails();
        showStatus('Cache entry deleted successfully', 'success');
    }
}

function handleSearch() {
    const searchTerm = searchField.value.toLowerCase();
    if (searchTerm === '') {
        populateTable();
        return;
    }
    
    const filtered = cacheData.filter(record => 
        record.key.toLowerCase().includes(searchTerm)
    );
    populateTable(filtered);
}

function handleFilter() {
    const filterTerm = filterField.value.toLowerCase();
    if (filterTerm === '') {
        populateTable();
        return;
    }
    
    const filtered = cacheData.filter(record => 
        record.priority.toLowerCase().includes(filterTerm) ||
        record.scavenging.toLowerCase().includes(filterTerm)
    );
    populateTable(filtered);
}

function updateTotalItems() {
    totalItems.value = cacheData.length;
}

function clearDetails() {
    keys.value = '';
    lastAccessedTime.value = '';
    scavengingPriority.value = '';
    willBeExpired.value = '';
    eligibleForScavenging.value = '';
    value.value = '';
    currentRecord = null;
    
    Array.from(tableBody.querySelectorAll('tr')).forEach(row => {
        row.style.backgroundColor = '';
    });
}

function showStatus(message, type = 'info') {
    statusMsg.textContent = message;
    statusMsg.className = `status ${type}`;
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
        statusMsg.classList.add('hidden');
    }, 4000);
}

function toggleNav(button) {
    const items = button.nextElementSibling;
    button.classList.toggle('collapsed');
    items.classList.toggle('collapsed');
}

function navigateTo(module) {
    showStatus('Navigating to ' + module, 'info');
}

// Initialize sidebar navigation
function initializeSidebarNavigation() {
    const toggleButtons = document.querySelectorAll('.nav-toggle');
    toggleButtons.forEach(button => {
        const items = button.nextElementSibling;
        if (items && items.classList.contains('nav-items')) {
            items.classList.remove('collapsed');
        }
    });
}
