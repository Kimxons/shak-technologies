// Dashboard Items Module
document.addEventListener('DOMContentLoaded', initializeDashboardItems);

// Form Control References
let dashboardsList = null;
let parametersContent = null;
let statusMsg = null;

// Button References
let btnEdit = null;
let btnSave = null;
let btnCancel = null;

// Dashboard data
const dashboardsData = {
    'Executive Dashboard': {
        parameters: [
            'Date Range',
            'Department Filter',
            'KPI Metrics',
            'Report Format'
        ]
    },
    'User Analytics': {
        parameters: [
            'User Segment',
            'Activity Period',
            'Metrics Selection',
            'Export Format'
        ]
    },
    'System Health': {
        parameters: [
            'Server Status',
            'Performance Threshold',
            'Alert Level',
            'Monitoring Interval'
        ]
    },
    'Operations': {
        parameters: [
            'Operation Type',
            'Status Filter',
            'Time Period',
            'Batch Size'
        ]
    }
};

let currentDashboard = null;
let isEditMode = false;

function initializeDashboardItems() {
    // Initialize form controls
    dashboardsList = document.getElementById('dashboardsList');
    parametersContent = document.getElementById('parametersContent');
    statusMsg = document.getElementById('statusMsg');

    // Initialize buttons
    btnEdit = document.getElementById('btnEdit');
    btnSave = document.getElementById('btnSave');
    btnCancel = document.getElementById('btnCancel');

    // Attach event listeners
    btnEdit.addEventListener('click', handleEdit);
    btnSave.addEventListener('click', handleSave);
    btnCancel.addEventListener('click', handleCancel);

    // Initialize sidebar navigation
    initializeSidebarNavigation();
    
    showStatus('Dashboard Items loaded', 'info');
}

function selectDashboard(element, dashboardName) {
    // Remove previous selection
    Array.from(dashboardsList.querySelectorAll('.panel-item')).forEach(item => {
        item.classList.remove('selected');
    });

    // Set current selection
    element.classList.add('selected');
    currentDashboard = dashboardName;

    // Load parameters for selected dashboard
    loadDashboardParameters(dashboardName);
    
    showStatus(`Dashboard selected: ${dashboardName}`, 'info');
}

function loadDashboardParameters(dashboardName) {
    const params = dashboardsData[dashboardName];
    
    if (!params) {
        parametersContent.innerHTML = '<span style="font-size: 11px; text-align: center;">No parameters available</span>';
        return;
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 6px;">';
    params.parameters.forEach((param, index) => {
        html += `
            <div style="padding: 6px 8px; background: var(--secondary); border: 1px solid var(--border); border-radius: 3px; font-size: 11px; cursor: pointer; transition: all 0.2s ease;" 
                 onmouseover="this.style.background='var(--white)'; this.style.borderColor='var(--primary)'; this.style.color='var(--primary)';"
                 onmouseout="this.style.background='var(--secondary)'; this.style.borderColor='var(--border)'; this.style.color='var(--text-dark)';"
                 onclick="handleParameterSelect(this, '${param}')">
                <i class="bi bi-sliders" style="font-size: 10px; margin-right: 4px;"></i>
                <span>${param}</span>
            </div>
        `;
    });
    html += '</div>';

    parametersContent.innerHTML = html;
}

function handleParameterSelect(element, paramName) {
    if (isEditMode) {
        element.style.backgroundColor = '#e3f2fd';
        showStatus(`Parameter selected: ${paramName}`, 'info');
    } else {
        showStatus('Enter Edit mode to modify parameters', 'warning');
    }
}

function handleEdit() {
    if (!currentDashboard) {
        showStatus('Please select a dashboard first', 'warning');
        return;
    }

    isEditMode = true;
    
    // Enable parameter editing UI
    const paramItems = parametersContent.querySelectorAll('div');
    paramItems.forEach(item => {
        item.style.cursor = 'pointer';
        item.style.opacity = '1';
    });

    btnEdit.style.opacity = '0.5';
    btnEdit.disabled = true;
    btnSave.style.opacity = '1';
    btnSave.disabled = false;
    btnCancel.style.opacity = '1';
    btnCancel.disabled = false;

    showStatus(`Editing dashboard: ${currentDashboard}`, 'warning');
}

function handleSave() {
    if (!currentDashboard) {
        showStatus('No dashboard selected', 'error');
        return;
    }

    isEditMode = false;

    // Reset button states
    btnEdit.style.opacity = '1';
    btnEdit.disabled = false;
    btnSave.style.opacity = '0.5';
    btnSave.disabled = true;
    btnCancel.style.opacity = '0.5';
    btnCancel.disabled = true;

    showStatus(`Dashboard '${currentDashboard}' saved successfully`, 'success');
}

function handleCancel() {
    isEditMode = false;

    // Reset button states
    btnEdit.style.opacity = '1';
    btnEdit.disabled = false;
    btnSave.style.opacity = '0.5';
    btnSave.disabled = true;
    btnCancel.style.opacity = '0.5';
    btnCancel.disabled = true;

    // Reload current dashboard parameters
    if (currentDashboard) {
        loadDashboardParameters(currentDashboard);
        showStatus(`Changes cancelled for ${currentDashboard}`, 'warning');
    } else {
        showStatus('Operation cancelled', 'info');
    }
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

    // Initialize button states
    btnSave.disabled = true;
    btnCancel.disabled = true;
    btnSave.style.opacity = '0.5';
    btnCancel.style.opacity = '0.5';
}
