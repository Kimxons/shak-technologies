// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    const { ServiceLoader } = window;
    
    try {
        await ServiceLoader.loadCore();
        await ServiceLoader.loadRoleService();
        await ServiceLoader.loadLookupService(); // For dropdowns
        await ServiceLoader.loadCommonServices(); // For SearchService
        
        initializeRoleMaintenance();
    } catch (error) {
        console.error('Failed to load services:', error);
        showStatus('Failed to load services. Please refresh the page.', 'error');
    }
});

// Sample data for Role Maintenance (fallback)
const roleSampleData = [
    {
        id: 'R001',
        name: 'System Administrator',
        accessLevel: 'High',
        cashierRole: true,
        createdBy: 'ADMIN001',
        createdOn: '2024-01-15 10:30',
        modifiedBy: 'ADMIN001',
        modifiedOn: '2024-01-20 14:45',
        supervisedBy: 'SUPER001',
        supervisedOn: '2024-01-20 15:00'
    },
    {
        id: 'R002',
        name: 'Teller',
        accessLevel: 'Medium',
        cashierRole: true,
        createdBy: 'ADMIN001',
        createdOn: '2024-01-10 09:15',
        modifiedBy: 'ADMIN002',
        modifiedOn: '2024-01-18 11:20',
        supervisedBy: 'SUPER001',
        supervisedOn: '2024-01-18 12:00'
    },
    {
        id: 'R003',
        name: 'Report Viewer',
        accessLevel: 'Low',
        cashierRole: false,
        createdBy: 'ADMIN001',
        createdOn: '2024-01-05 08:00',
        modifiedBy: null,
        modifiedOn: null,
        supervisedBy: null,
        supervisedOn: null
    }
];

// Make currentRole accessible to child windows (iframes)
window.currentRole = null;
let currentRole = null;
let isEditMode = false;
let selectedRoleIndex = -1;
let rolesData = [];
let roleNotFound = false; // Track if search returned no role
let statusTimeout = null; // Track status message timeout

// Initialize the module
function initializeRoleMaintenance() {
    setupEventListeners();
    setupModalEventListeners();
    setupMessageListeners();
    initializeFormState();
}

/**
 * Set initial form state - only View and Cancel buttons active
 */
function initializeFormState() {
    setEditMode(false);
    updateButtonStates();
}

function setupEventListeners() {
    const roleIdInput = document.getElementById('RoleId');
    const roleNameInput = document.getElementById('RoleName');
    
    // Search on Enter key
    roleIdInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleRoleSearch();
    });
    
    // Search button click
    const searchBtn = document.querySelector('[data-action="search"]');
    if (searchBtn) {
        searchBtn.addEventListener('click', handleRoleSearch);
    }
    
    // Action buttons
    const actionButtons = {
        'view': handleView,
        'add': handleAdd,
        'edit': handleEdit,
        'delete': handleDelete,
        'save': handleSave,
        'cancel': handleCancel
    };
    
    Object.entries(actionButtons).forEach(([action, handler]) => {
        const button = document.querySelector(`.btn-action[data-mcs-action="${action}"]`);
        if (button) {
            button.addEventListener('click', handler);
        }
    });
}

function handleRoleSearch() {
    showRoleSearchModal();
}

/**
 * Show the role search modal
 */
function showRoleSearchModal() {
    const modal = document.getElementById('roleMaintenanceRoleSearchModal');
    const frame = document.getElementById('roleMaintenanceRoleSearchFrame');
    if (modal) {
        modal.style.display = 'flex';
    }
    if (frame) {
        frame.src = '../../../modules/common/searchDialogs/role-search/role-search.html';
    }
}

/**
 * Hide the role search modal
 */
function hideRoleSearchModal() {
    const modal = document.getElementById('roleMaintenanceRoleSearchModal');
    if (modal) {
        modal.style.display = 'none';
    }
    const frame = document.getElementById('roleMaintenanceRoleSearchFrame');
    if (frame) {
        frame.src = 'about:blank';
    }
}

window.hideRoleSearchModal = hideRoleSearchModal;

/**
 * Setup message listeners for iframe communication
 */
function setupMessageListeners() {
    window.addEventListener('message', (event) => {
        console.log('Message received in role maintenance:', event.data.type, 'from source:', event.source);
        if (event.data.type === 'ROLE_SELECTED') {
            // Handle role selection from search modal
            const roleData = event.data.data;
            currentRole = roleData;
            window.currentRole = currentRole;
            populateForm(roleData);
            setEditMode(false);
            hideRoleSearchModal();
            showStatus(`Role '${roleData.RoleName || roleData.Name}' loaded successfully`, 'success');
        } else if (event.data.type === 'kairo-dataentry-close') {
            // Handle cancel/close from search modal
            hideRoleSearchModal();
        }
    });
}

/**
 * Setup modal event listeners
 */
function setupModalEventListeners() {
    // Role Search Modal close button
    const closeBtn = document.getElementById('roleMaintenanceRoleSearchModalCloseBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', hideRoleSearchModal);
    }
}

function populateForm(role) {
    // Helper to format datetime for display
    const formatDateTime = (dateStr) => {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            return date.toLocaleString();
        } catch {
            return dateStr;
        }
    };
    
    document.getElementById('RoleId').value = role.RoleID || '';
    document.getElementById('RoleName').value = role.RoleName || '';
    
    // Map numeric AccessLevel to dropdown value
    const accessLevel = role.AccessLevel || 0;
    if (accessLevel >= 200) {
        document.getElementById('AccessLevel').value = 'high';
    } else if (accessLevel >= 100) {
        document.getElementById('AccessLevel').value = 'medium';
    } else if (accessLevel > 0) {
        document.getElementById('AccessLevel').value = 'low';
    } else {
        document.getElementById('AccessLevel').value = '--Select--';
    }
    
    document.getElementById('CashierRole').checked = role.IsCashier || false;
    document.getElementById('CreatedBy').value = role.CreatedBy || '';
    document.getElementById('CreatedOn').value = formatDateTime(role.CreatedOn);
    document.getElementById('ModifiedBy').value = role.ModifiedBy || '-';
    document.getElementById('ModifiedOn').value = formatDateTime(role.ModifiedOn);
    document.getElementById('SupervisedBy').value = role.SupervisedBy || '-';
    document.getElementById('SupervisedOn').value = formatDateTime(role.SupervisedOn);
}

function clearFormFields(preserveRoleId = false) {
    const roleIdValue = preserveRoleId ? document.getElementById('RoleId').value : '';
    
    document.getElementById('RoleId').value = roleIdValue;
    document.getElementById('RoleName').value = '';
    document.getElementById('AccessLevel').value = '--Select--';
    document.getElementById('CashierRole').checked = false;
    document.getElementById('CreatedBy').value = '';
    document.getElementById('CreatedOn').value = '';
    document.getElementById('ModifiedBy').value = '';
    document.getElementById('ModifiedOn').value = '';
    document.getElementById('SupervisedBy').value = '';
    document.getElementById('SupervisedOn').value = '';
    currentRole = null;
    window.currentRole = null;
    selectedRoleIndex = -1;
}

async function handleView() {
    const roleId = document.getElementById('RoleId').value.trim();
    
    if (!roleId) {
        showStatus('Please enter a Role ID to view', 'warning');
        return;
    }
    
    try {
        showStatus('Loading role data...', 'loading');
        
        const requestData = {
            RoleID: roleId,
            OurBranchID: window.Environment?.defaultBranchId || '0603',
            OperatorID: window.Environment?.operatorId || 'CSADM',
            Direction: ''
        };
        
        const response = await window.RoleService.getRoles(requestData);
        if (!response.success) {
            currentRole = null;
            window.currentRole = null;
            roleNotFound = true;
            showStatus(response.message || 'Role not found. Click "Add" to create a new role', 'error');
            clearFormFields(true); // Preserve role ID for Add action
            updateButtonStates();
            return;
        }
        
        // Parse response - role data is in Details01 array
        const roleData = response.data?.Details01 || [];
        if (!roleData || roleData.length === 0) {
            currentRole = null;
            window.currentRole = null;
            roleNotFound = true;
            showStatus('Role not found. Click "Add" to create a new role', 'error');
            clearFormFields(true); // Preserve role ID for Add action
            updateButtonStates();
            return;
        }
        
        // Get first role from Details01 array
        const role = roleData[0];
        currentRole = role;
        window.currentRole = role;
        roleNotFound = false;
        rolesData = roleData;
        selectedRoleIndex = 0;
        
        populateForm(role);
        setEditMode(false);
        showStatus(`Role '${roleId}' loaded successfully`, 'success');
        
    } catch (error) {
        currentRole = null;
        window.currentRole = null;
        console.error('Role search failed:', error);
        showStatus('Failed to load role data. Please try again.', 'error');
        clearFormFields();
        updateButtonStates();
    }
}

function handleAdd() {
    const roleIdValue = document.getElementById('RoleId').value.trim();
    clearFormFields(!!roleIdValue); // Preserve role ID if it exists
    setEditMode(true);
    
    // Focus on role ID if empty, otherwise focus on role name
    if (roleIdValue) {
        document.getElementById('RoleName').focus();
    } else {
        document.getElementById('RoleId').focus();
    }
    showStatus('Ready to add new role', 'info');
}

function handleEdit() {
    if (!currentRole) {
        showStatus('Please select a role first', 'error');
        return;
    }
    
    if (isEditMode) {
        showStatus('Already in edit mode', 'warning');
        return;
    }
    
    setEditMode(true);
    document.getElementById('RoleName').focus();
    showStatus(`Editing role '${currentRole.RoleName || currentRole.name}'`, 'info');
}

function handleDelete() {
    if (!currentRole) {
        showStatus('Please select a role first', 'error');
        return;
    }
    
    const roleId = currentRole.RoleID || currentRole.id;
    const roleName = currentRole.RoleName || currentRole.name;
    
    // Show confirmation dialog
    showDeleteConfirmDialog(roleId, roleName);
}

/**
 * Show delete confirmation dialog
 */
function showDeleteConfirmDialog(roleId, roleName) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('deleteConfirmModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'deleteConfirmModal';
        modal.className = 'delete-confirm-overlay';
        modal.innerHTML = `
            <div class="delete-confirm-dialog">
                <div class="delete-confirm-header">
                    <i class="bi bi-exclamation-triangle-fill" style="color: #dc3545; font-size: 24px;"></i>
                    <h5>Confirm Delete</h5>
                </div>
                <div class="delete-confirm-body">
                    <p>Are you sure you want to delete this role?</p>
                    <div class="delete-role-info">
                        <span class="delete-role-id"></span>
                        <span class="delete-role-name"></span>
                    </div>
                    <p class="delete-warning">This action cannot be undone.</p>
                </div>
                <div class="delete-confirm-footer">
                    <button type="button" class="btn-confirm-cancel" id="deleteConfirmCancel">
                        <i class="bi bi-x-circle"></i>
                        <span>Cancel</span>
                    </button>
                    <button type="button" class="btn-confirm-delete" id="deleteConfirmOk">
                        <i class="bi bi-trash-fill"></i>
                        <span>Delete</span>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Add event listeners
        document.getElementById('deleteConfirmCancel').addEventListener('click', hideDeleteConfirmDialog);
        document.getElementById('deleteConfirmOk').addEventListener('click', confirmDeleteRole);
        
        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideDeleteConfirmDialog();
            }
        });
        
        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                hideDeleteConfirmDialog();
            }
        });
    }
    
    // Update dialog content
    modal.querySelector('.delete-role-id').textContent = `Role ID: ${roleId}`;
    modal.querySelector('.delete-role-name').textContent = `Role Name: ${roleName}`;
    
    // Show modal
    modal.classList.add('show');
    document.getElementById('deleteConfirmCancel').focus();
}

/**
 * Hide delete confirmation dialog
 */
function hideDeleteConfirmDialog() {
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

/**
 * Confirm and execute role deletion
 */
async function confirmDeleteRole() {
    hideDeleteConfirmDialog();
    
    if (!currentRole) {
        showStatus('No role selected', 'error');
        return;
    }
    
    const roleId = currentRole.RoleID || currentRole.id;
    
    try {
        showStatus('Deleting role...', 'loading');
        
        const requestData = {
            RoleID: roleId,
            NewRecord: currentRole?.UpdateCount || 0  // Use UpdateCount for optimistic locking
        };
        
        console.log('Deleting role with data:', requestData);
        
        const response = await window.RoleService.deleteRole(requestData);
        
        if (!response.success) {
            showStatus(response.message || 'Failed to delete role', 'error', response.data);
            return;
        }
        
        // Remove from local state
        const index = rolesData.findIndex(r => (r.RoleID || r.id) === roleId);
        if (index > -1) {
            rolesData.splice(index, 1);
        }
        
        clearFormFields();
        setEditMode(false);
        roleNotFound = false;
        showStatus(`Role '${roleId}' deleted successfully`, 'success');
        currentRole = null;
        window.currentRole = null;
        updateButtonStates();
        
    } catch (error) {
        console.error('Delete role failed:', error);
        showStatus('Failed to delete role. Please try again.', 'error');
    }
}

async function handleSave() {
    const roleId = document.getElementById('RoleId').value.trim();
    const roleName = document.getElementById('RoleName').value.trim();
    const accessLevel = document.getElementById('AccessLevel').value;
    const isCashier = document.getElementById('CashierRole').checked;
    
    // Validation
    if (!roleId) {
        showStatus('Role ID is required', 'error');
        document.getElementById('RoleId').focus();
        return;
    }
    
    if (!roleName) {
        showStatus('Role Name is required', 'error');
        document.getElementById('RoleName').focus();
        return;
    }
    
    if (!accessLevel || accessLevel === '--Select--') {
        showStatus('Access Level is required', 'error');
        document.getElementById('AccessLevel').focus();
        return;
    }
    
    try {
        showStatus('Saving role...', 'loading');
        
        // Map dropdown value to numeric AccessLevel
        const accessLevelMap = {
            'high': 200,
            'medium': 100,
            'low': 50
        };
        
        const numericAccessLevel = accessLevelMap[accessLevel] || 100;
        
        // Determine if this is a new record
        const isNewRecord = !currentRole || currentRole.RoleID !== roleId;
        
        // Get current datetime
        const now = new Date().toISOString();
        
        // Build request data
        const requestData = {
            RoleID: roleId,
            RoleName: roleName,
            AccessLevel: numericAccessLevel,
            IsCashier: isCashier ? 1 : 0,
            CreatedBy: currentRole?.CreatedBy || window.Environment?.operatorId || 'CSADM',
            CreatedOn: currentRole?.CreatedOn || now,
            ModifiedBy: window.Environment?.operatorId || 'CSADM',
            ModifiedOn: now,
            SupervisedBy: window.Environment?.operatorId || 'CSADM',
            NewRecord: isNewRecord ? 1 : (currentRole?.UpdateCount || 0)
        };
        
        console.log('Saving role with data:', requestData);
        
        const response = await window.RoleService.addEditRole(requestData);
        
        if (!response.success) {
            showStatus(response.message || 'Failed to save role', 'error', response.data);
            return;
        }
        
        // Update local state
        const savedRole = {
            RoleID: roleId,
            RoleName: roleName,
            AccessLevel: numericAccessLevel,
            IsCashier: isCashier,
            CreatedBy: requestData.CreatedBy,
            CreatedOn: requestData.CreatedOn,
            ModifiedBy: requestData.ModifiedBy,
            ModifiedOn: requestData.ModifiedOn,
            SupervisedBy: requestData.SupervisedBy
        };
        
        if (isNewRecord) {
            rolesData.push(savedRole);
            showStatus(`Role '${roleName}' created successfully`, 'success');
        } else {
            const index = rolesData.findIndex(r => (r.id || r.RoleID) === roleId);
            if (index > -1) {
                rolesData[index] = savedRole;
            }
            showStatus(`Role '${roleName}' updated successfully`, 'success');
        }
        
        currentRole = savedRole;
        window.currentRole = savedRole;
        roleNotFound = false;
        populateForm(savedRole);
        setEditMode(false);
        
    } catch (error) {
        console.error('Save role failed:', error);
        showStatus('Failed to save role. Please try again.', 'error');
    }
}

function handleCancel() {
    if (isEditMode) {
        if (currentRole) {
            populateForm(currentRole);
            setEditMode(false);
            showStatus('Changes cancelled', 'warning');
        } else {
            clearFormFields();
            setEditMode(false);
            roleNotFound = false; // Reset flag
            showStatus('Entry cancelled', 'info');
        }
    } else {
        clearFormFields();
        roleNotFound = false; // Reset flag
        showStatus('Cancelled', 'info');
    }
}

function setEditMode(enabled) {
    isEditMode = enabled;
    const inputs = [
        'RoleId', 'RoleName', 'AccessLevel', 'CashierRole'
    ];
    
    inputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.disabled = !enabled;
            element.style.backgroundColor = enabled ? '#fff' : 'var(--secondary)';
            element.style.color = enabled ? 'var(--text-dark)' : 'var(--text-light)';
            element.style.cursor = enabled ? 'auto' : 'not-allowed';
            
            // Remove readonly attribute for roleName in edit mode
            if (id === 'RoleName') {
                if (enabled) {
                    element.removeAttribute('readonly');
                } else {
                    element.setAttribute('readonly', 'readonly');
                }
            }
        }
    });
    
    // Role ID should always be enabled for search/view purposes, but styled appropriately
    const roleIdElement = document.getElementById('RoleId');
    if (roleIdElement) {
        roleIdElement.disabled = false;
        roleIdElement.style.backgroundColor = '#fff';
        roleIdElement.style.color = 'var(--text-dark)';
        roleIdElement.style.cursor = 'auto';
    }
    
    // Update button states
    updateButtonStates();
}

function updateButtonStates() {
    const viewBtn = document.querySelector('.btn-action[data-mcs-action="view"]');
    const addBtn = document.querySelector('.btn-action[data-mcs-action="add"]');
    const editBtn = document.querySelector('.btn-action[data-mcs-action="edit"]');
    const deleteBtn = document.querySelector('.btn-action[data-mcs-action="delete"]');
    const saveBtn = document.querySelector('.btn-action[data-mcs-action="save"]');
    const cancelBtn = document.querySelector('.btn-action[data-mcs-action="cancel"]');
    
    // Cancel is always active
    if (cancelBtn) {
        cancelBtn.style.opacity = '1';
        cancelBtn.disabled = false;
    }
    
    if (isEditMode) {
        // Add/Edit Mode: only Save and Cancel are active
        if (viewBtn) {
            viewBtn.style.opacity = '0.5';
            viewBtn.disabled = true;
        }
        if (addBtn) {
            addBtn.style.opacity = '0.5';
            addBtn.disabled = true;
        }
        if (editBtn) {
            editBtn.style.opacity = '0.5';
            editBtn.disabled = true;
        }
        if (deleteBtn) {
            deleteBtn.style.opacity = '0.5';
            deleteBtn.disabled = true;
        }
        if (saveBtn) {
            saveBtn.style.opacity = '1';
            saveBtn.disabled = false;
        }
    } else if (currentRole) {
        // Role Found State: View, Edit, Delete, and Cancel are active
        if (viewBtn) {
            viewBtn.style.opacity = '1';
            viewBtn.disabled = false;
        }
        if (addBtn) {
            addBtn.style.opacity = '0.5';
            addBtn.disabled = true;
        }
        if (editBtn) {
            editBtn.style.opacity = '1';
            editBtn.disabled = false;
        }
        if (deleteBtn) {
            deleteBtn.style.opacity = '1';
            deleteBtn.disabled = false;
        }
        if (saveBtn) {
            saveBtn.style.opacity = '0.5';
            saveBtn.disabled = true;
        }
    } else if (roleNotFound) {
        // Role Not Found State: View, Add, and Cancel are active
        if (viewBtn) {
            viewBtn.style.opacity = '1';
            viewBtn.disabled = false;
        }
        if (addBtn) {
            addBtn.style.opacity = '1';
            addBtn.disabled = false;
        }
        if (editBtn) {
            editBtn.style.opacity = '0.5';
            editBtn.disabled = true;
        }
        if (deleteBtn) {
            deleteBtn.style.opacity = '0.5';
            deleteBtn.disabled = true;
        }
        if (saveBtn) {
            saveBtn.style.opacity = '0.5';
            saveBtn.disabled = true;
        }
    } else {
        // Default State: only View and Cancel are active
        if (viewBtn) {
            viewBtn.style.opacity = '1';
            viewBtn.disabled = false;
        }
        if (addBtn) {
            addBtn.style.opacity = '0.5';
            addBtn.disabled = true;
        }
        if (editBtn) {
            editBtn.style.opacity = '0.5';
            editBtn.disabled = true;
        }
        if (deleteBtn) {
            deleteBtn.style.opacity = '0.5';
            deleteBtn.disabled = true;
        }
        if (saveBtn) {
            saveBtn.style.opacity = '0.5';
            saveBtn.disabled = true;
        }
    }
}

function showStatus(message, type = 'info', details = null) {
    const statusDiv = document.getElementById('statusMsg');
    if (!statusDiv) {
        console.warn('Status message element not found:', message);
        return;
    }
    
    let fullMessage = message;
    // If error and details provided, append Status and Message from details
    if (type === 'error' && details && (details.Status || details.Message)) {
        fullMessage += `\n[${details.Status || ''}] ${details.Message || ''}`;
    }
    
    // Map type to appropriate icon and color
    const typeConfig = {
        'info': { icon: 'bi-info-circle-fill', class: 'alert-info' },
        'success': { icon: 'bi-check-circle-fill', class: 'alert-success' },
        'warning': { icon: 'bi-exclamation-triangle-fill', class: 'alert-warning' },
        'error': { icon: 'bi-x-circle-fill', class: 'alert-danger' },
        'loading': { icon: 'bi-hourglass-split', class: 'alert-info' }
    };
    
    const config = typeConfig[type] || typeConfig['info'];
    
    // Create snackbar content with icon
    statusDiv.innerHTML = `
        <i class="bi ${config.icon}" style="margin-right: 8px;"></i>
        <span>${fullMessage}</span>
        <button type="button" class="btn-close btn-close-white ms-auto" aria-label="Close"></button>
    `;
    
    statusDiv.className = `alert ${config.class} d-flex align-items-center`;
    statusDiv.style.display = 'flex';
    
    // Close button functionality
    const closeBtn = statusDiv.querySelector('.btn-close');
    if (closeBtn) {
        closeBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (statusTimeout) {
                clearTimeout(statusTimeout);
                statusTimeout = null;
            }
            statusDiv.classList.add('hiding');
            setTimeout(() => {
                statusDiv.style.display = 'none';
                statusDiv.classList.remove('hiding');
                statusDiv.className = 'alert';
                statusDiv.innerHTML = '';
            }, 300);
        };
    }
    
    // Clear any existing timeout to prevent repeated animations
    if (statusTimeout) {
        clearTimeout(statusTimeout);
        statusTimeout = null;
    }
    
    // Auto-hide after 3 seconds
    statusTimeout = setTimeout(() => {
        statusDiv.classList.add('hiding');
        setTimeout(() => {
            statusDiv.style.display = 'none';
            statusDiv.classList.remove('hiding');
            statusDiv.className = 'alert';
            statusDiv.innerHTML = '';
            statusTimeout = null;
        }, 300);
    }, 3000);
}

function toggleNav(button) {
    const navItems = document.querySelector('.nav-items');
    navItems.style.display = navItems.style.display === 'none' ? 'block' : 'none';
}

function navigateTo(module) {
    console.log('Navigating to:', module);
    // Implementation would navigate to different module
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeRoleMaintenance);

// Add the input-group-icon styling
const style = document.createElement('style');
style.textContent = `
    .input-group-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        margin-left: -35px;
        color: var(--text-gray);
        cursor: pointer;
        transition: color 0.3s;
    }
    
    .input-group-icon:hover {
        color: var(--primary);
    }
    
    .field-control {
        display: flex;
        align-items: center;
        position: relative;
    }
    
    .field-control input {
        width: 100%;
    }
    
    /* Snackbar/Toast Notification Styles */
    #statusMsg {
        position: fixed;
        top: 20px;
        left: 20px;
        z-index: 9999;
        min-width: 300px;
        max-width: 500px;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        display: none !important;
        align-items: center;
        gap: 12px;
        font-size: 14px;
        font-weight: 500;
        animation: slideInLeft 0.3s ease-out;
        border: none;
    }
    
    #statusMsg.d-flex {
        display: flex !important;
    }
    
    #statusMsg i {
        font-size: 20px;
        flex-shrink: 0;
    }
    
    #statusMsg span {
        flex: 1;
        line-height: 1.5;
    }
    
    #statusMsg .btn-close {
        flex-shrink: 0;
        opacity: 1;
        width: 20px;
        height: 20px;
        padding: 0;
        background: transparent;
        background-size: 12px;
        filter: brightness(0) invert(1);
        border: none;
    }
    
    #statusMsg .btn-close:hover {
        opacity: 0.8;
        transform: scale(1.1);
    }
    
    /* Alert color overrides for better snackbar appearance */
    #statusMsg.alert-success {
        background-color: #28a745;
        color: white;
        border-left: 4px solid #1e7e34;
    }
    
    #statusMsg.alert-danger {
        background-color: #dc3545;
        color: white;
        border-left: 4px solid #bd2130;
    }
    
    #statusMsg.alert-warning {
        background-color: #ffc107;
        color: #212529;
        border-left: 4px solid #d39e00;
    }
    
    #statusMsg.alert-warning .btn-close {
        filter: brightness(0) invert(0);
    }
    
    #statusMsg.alert-info {
        background-color: #17a2b8;
        color: white;
        border-left: 4px solid #117a8b;
    }
    
    @keyframes slideInLeft {
        from {
            transform: translateX(-100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutLeft {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(-100%);
            opacity: 0;
        }
    }
    
    #statusMsg.hiding {
        animation: slideOutLeft 0.3s ease-in;
    }
    
    /* Responsive design for mobile */
    @media (max-width: 768px) {
        #statusMsg {
            top: 10px;
            left: 10px;
            right: 10px;
            min-width: auto;
            max-width: none;
        }
    }
    
    /* Delete Confirmation Dialog Styles */
    .delete-confirm-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.2s ease-out;
    }
    
    .delete-confirm-overlay.show {
        display: flex;
        opacity: 1;
    }
    
    .delete-confirm-dialog {
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        min-width: 380px;
        max-width: 450px;
        animation: dialogSlideIn 0.25s ease-out;
        overflow: hidden;
    }
    
    @keyframes dialogSlideIn {
        from {
            transform: scale(0.9) translateY(-20px);
            opacity: 0;
        }
        to {
            transform: scale(1) translateY(0);
            opacity: 1;
        }
    }
    
    .delete-confirm-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 20px 24px;
        border-bottom: 1px solid #e9ecef;
        background: linear-gradient(135deg, #fff5f5 0%, #ffffff 100%);
    }
    
    .delete-confirm-header h5 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #212529;
    }
    
    .delete-confirm-body {
        padding: 24px;
    }
    
    .delete-confirm-body p {
        margin: 0 0 16px 0;
        font-size: 14px;
        color: #495057;
    }
    
    .delete-role-info {
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 16px;
    }
    
    .delete-role-info span {
        display: block;
        font-size: 14px;
        color: #212529;
    }
    
    .delete-role-id {
        font-weight: 600;
        margin-bottom: 4px;
    }
    
    .delete-role-name {
        color: #6c757d !important;
    }
    
    .delete-warning {
        color: #dc3545 !important;
        font-weight: 500;
        font-size: 13px !important;
        margin-bottom: 0 !important;
    }
    
    .delete-confirm-footer {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding: 16px 24px;
        background: #f8f9fa;
        border-top: 1px solid #e9ecef;
    }
    
    .btn-confirm-cancel,
    .btn-confirm-delete {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
    }
    
    .btn-confirm-cancel {
        background: #e9ecef;
        color: #495057;
    }
    
    .btn-confirm-cancel:hover {
        background: #dee2e6;
        color: #212529;
    }
    
    .btn-confirm-delete {
        background: #dc3545;
        color: white;
    }
    
    .btn-confirm-delete:hover {
        background: #c82333;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
    }
    
    .btn-confirm-delete:active {
        transform: translateY(0);
    }
    
    @media (max-width: 480px) {
        .delete-confirm-dialog {
            min-width: auto;
            margin: 16px;
            max-width: calc(100% - 32px);
        }
        
        .delete-confirm-footer {
            flex-direction: column-reverse;
        }
        
        .btn-confirm-cancel,
        .btn-confirm-delete {
            width: 100%;
            justify-content: center;
        }
    }

    /* Child Form Overlay Styles */
    .child-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: rgba(0, 0, 0, 0.5);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 1050;
    }

    .child-overlay[aria-hidden="false"] {
        display: flex;
    }

    .child-frame {
        background: white;
        border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        width: 95vw;
        height: 90vh;
        max-width: 1400px;
        min-width: 1000px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .child-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid #dee2e6;
        background: #f8f9fa;
        flex-shrink: 0;
    }

    .child-title {
        font-weight: 600;
        font-size: 16px;
        color: #212529;
    }

    .child-close-btn {
        background: none;
        border: none;
        font-size: 24px;
        color: #6c757d;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background-color 0.2s, color 0.2s;
    }

    .child-close-btn:hover {
        background-color: #e9ecef;
        color: #495057;
    }

    .child-iframe {
        width: 100%;
        height: 100%;
        border: none;
        flex: 1;
    }
`;
document.head.appendChild(style);

// Expose refreshForm to parent window for dashboard refresh button
window.refreshForm = function() {
    console.log('[RoleMaintenance] Refreshing form...');
    // Clear the form and reset to initial state
    const form = document.querySelector('form') || document.body;
    const inputs = form.querySelectorAll('input:not([type="checkbox"]):not([readonly]), select, textarea');
    inputs.forEach(input => {
        input.value = input.defaultValue || '';
    });
    // Clear checkboxes separately
    const checkboxes = form.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = checkbox.defaultChecked || false;
    });
    // Reset status message
    const statusMessage = document.getElementById('statusMessage');
    if (statusMessage) {
        statusMessage.classList.add('hidden');
    }
    console.log('[RoleMaintenance] Form refreshed');
};
