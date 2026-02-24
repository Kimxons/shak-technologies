// Data Cache Details Module
document.addEventListener('DOMContentLoaded', initializeDataCacheDetails);

// Form Control References
let totalItems = null;
let searchField = null;
let filterField = null;
let cacheId = null;
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
        id: 'DC001',
        key: 'TSEDEY00UserParticipantTypeIDUCD',
        lastAccessed: '2024-01-14 11:20:30',
        priority: 'High',
        expiration: '2024-01-15',
        scavenging: 'Yes',
        value: 'Participant Type Configuration'
    },
    {
        id: 'DC002',
        key: 'TSEDEY00SystemFeeCapitalisationIDenSCD',
        lastAccessed: '2024-01-14 10:45:15',
        priority: 'Medium',
        expiration: '2024-01-16',
        scavenging: 'No',
        value: 'Fee Capitalization Data'
    },
    {
        id: 'DC003',
        key: 'TSEDEY00UserShipmentTypeIDUCD',
        lastAccessed: '2024-01-14 09:30:00',
        priority: 'Low',
        expiration: '2024-01-17',
        scavenging: 'Yes',
        value: 'Shipment Type Data'
    },
    {
        id: 'DC004',
        key: 'TSEDEY00SystemSettlementOptionenSCD',
        lastAccessed: '2024-01-14 08:15:45',
        priority: 'Critical',
        expiration: '2024-01-14 20:00:00',
        scavenging: 'No',
        value: 'Settlement Options'
    }
];

let currentRecord = null;

function initializeDataCacheDetails() {
    // Initialize form controls
    totalItems = document.getElementById('totalItems');
    searchField = document.getElementById('searchField');
    filterField = document.getElementById('filterField');
    cacheId = document.getElementById('cacheId');
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
    cacheId.value = record.id;
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
    
    showStatus('Data cache record selected: ' + record.id, 'info');
}

function handleRefresh() {
    populateTable();
    updateTotalItems();
    clearDetails();
    showStatus('Data cache refreshed successfully', 'success');
}

function handleDelete() {
    if (!currentRecord) {
        showStatus('Please select a cache record to delete', 'warning');
        return;
    }
    
    if (confirm('Are you sure you want to delete this data cache entry?')) {
        cacheData = cacheData.filter(r => r.id !== currentRecord.id);
        populateTable();
        updateTotalItems();
        clearDetails();
        showStatus('Data cache entry deleted successfully', 'success');
    }
}

function handleSearch() {
    const searchTerm = searchField.value.toLowerCase();
    if (searchTerm === '') {
        populateTable();
        return;
    }
    
    const filtered = cacheData.filter(record => 
        record.key.toLowerCase().includes(searchTerm) ||
        record.id.toLowerCase().includes(searchTerm)
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
    cacheId.value = '';
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
