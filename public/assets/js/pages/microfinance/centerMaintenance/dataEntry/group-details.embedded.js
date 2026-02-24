/**
 * Group Details - Data Entry
 * Handles CRUD operations for groups within center maintenance
 */

let currentMode = 'view'; // 'view', 'add', 'edit'
let currentGroupData = null;

/**
 * Parent context - Branch ID and Center ID from Center Maintenance
 */
let parentContext = {
  branchId: '',
  branchName: '',
  centerId: '',
  centerName: ''
};

document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    getParentContext();
    updateButtonStates();
});

function initializeEventListeners() {
    // Close buttons
    document.querySelectorAll('[data-dataentry-close]').forEach(btn => {
        btn.addEventListener('click', () => {
            window.parent.postMessage({ type: 'kairo-dataentry-close' }, '*');
        });
    });

    // Main action buttons
    document.querySelectorAll('[data-mcn-de-action]').forEach(btn => {
        btn.addEventListener('click', handleAction);
    });

    // Lookup buttons
    document.querySelectorAll('[data-mcn-lookup]').forEach(btn => {
        btn.addEventListener('click', handleLookup);
    });

    // Listen for messages from search dialogs
    window.addEventListener('message', handleMessage);
}

function handleAction(event) {
    const action = event.target.closest('[data-mcn-de-action]')?.dataset?.mcnDeAction;
    if (!action) return;
    
    console.log('[Group Details] Action:', action);
    
    switch (action) {
        case 'view':
            viewGroup();
            break;
        case 'add':
            addNewGroup();
            break;
        case 'edit':
            editGroup();
            break;
        case 'delete':
            deleteGroup();
            break;
        case 'save':
            saveGroup();
            break;
    }
}

function handleLookup(event) {
    const type = event.target.closest('[data-mcn-lookup]')?.dataset?.mcnLookup;
    if (!type) return;
    
    console.log('[Group Details] Lookup clicked:', type);
    
    switch(type) {
        case 'subGroupId':
            console.log('[Group Details] Opening subgroup search...');
            openSubGroupSearch();
            break;
        default:
            console.log('[Group Details] Unknown lookup type:', type);
    }
}

/**
 * Open subgroup search dialog
 */
function openSubGroupSearch() {
    // Validate parent context first
    if (!validateParentContext()) {
        showMessage('Please select Branch and Center first', 'error');
        return;
    }
    
    console.log('[Group Details] Sending message to parent to open subgroup search');
    console.log('[Group Details] Parent context:', parentContext);
    
    window.parent.postMessage({
        type: 'kairo-open-dataentry',
        url: './modules/common/searchDialogs/subgroup-search/subgroup-search.html',
        title: 'Sub Group Search'
    }, '*');
    
    console.log('[Group Details] Message sent to parent');
}

/**
 * Handle messages from search dialogs
 */
function handleMessage(event) {
    if (event.data.type === 'SUBGROUP_SELECTED') {
        console.log('[Group Details] SubGroup selected:', event.data);
        document.getElementById('SubGroupId').value = event.data.subGroupId;
        document.getElementById('GroupDescription').value = event.data.description || '';
        
        // Populate behind the scene fields if available
        if (event.data.data) {
            populateGroupData(event.data.data);
        }
        
        showMessage('Sub Group selected', 'success');
        updateButtonStates();
    }
}

/**
 * Populate form with group data
 */
function populateGroupData(data) {
    currentGroupData = data;
    
    // Populate Behind The Scene fields
    document.getElementById('NoOfMembers').value = data.NoOfMembers || '';
    document.getElementById('LoanCycleRequired').value = data.LoanCycleRequired || '';
    document.getElementById('CreatedBy').value = data.CreatedBy || '';
    document.getElementById('ModifiedBy').value = data.ModifiedBy || '';
    document.getElementById('SupervisedBy').value = data.SupervisedBy || '';
    document.getElementById('CreatedOn').value = data.CreatedOn || '';
    document.getElementById('ModifiedOn').value = data.ModifiedOn || '';
    document.getElementById('SupervisedOn').value = data.SupervisedOn || '';
}

/**
 * Get parent context (Branch ID and Center ID) from Center Maintenance
 */
function getParentContext() {
    try {
        if (window.parent && window.parent !== window) {
            const parentDoc = window.parent.document;
            
            // Get Branch ID and Name
            parentContext.branchId = parentDoc.getElementById('branchId')?.value?.trim() || '';
            parentContext.branchName = parentDoc.getElementById('branchName')?.value?.trim() || '';
            
            // Get Center ID and Name
            parentContext.centerId = parentDoc.getElementById('centerId')?.value?.trim() || '';
            parentContext.centerName = parentDoc.getElementById('centerName')?.value?.trim() || '';
            
            console.log('[Group Details] Parent context loaded:', parentContext);
            return true;
        }
    } catch (error) {
        console.warn('[Group Details] Could not get parent context:', error);
        return false;
    }
    return false;
}

/**
 * Validate parent context - ensure Branch ID and Center ID are available
 */
function validateParentContext() {
    if (!parentContext.branchId) {
        showMessage('Branch ID is required. Please select a branch in Center Maintenance first.', 'error');
        return false;
    }
    if (!parentContext.centerId) {
        showMessage('Center ID is required. Please select a center in Center Maintenance first.', 'error');
        return false;
    }
    return true;
}

function viewGroup() {
    currentMode = 'view';
    updateButtonStates();
}

function addNewGroup() {
    currentMode = 'add';
    clearForm();
    updateButtonStates();
}

function editGroup() {
    if (!currentGroupData) {
        showMessage('Please select a group first', 'warning');
        return;
    }
    currentMode = 'edit';
    updateButtonStates();
}

function deleteGroup() {
    if (!currentGroupData) {
        showMessage('Please select a group first', 'warning');
        return;
    }
    if (confirm('Are you sure you want to delete this group?')) {
        // TODO: Implement delete via GroupService
        showMessage('Group deleted successfully', 'success');
        clearForm();
        currentMode = 'view';
        updateButtonStates();
    }
}

async function saveGroup() {
    if (currentMode !== 'add' && currentMode !== 'edit') {
        showMessage('No changes to save', 'warning');
        return;
    }
    
    if (!validateParentContext()) {
        return;
    }
    
    const formData = getFormData();
    if (!validateFormData(formData)) {
        return;
    }
    
    try {
        // TODO: Implement save via GroupService
        showMessage('Group saved successfully', 'success');
        currentMode = 'view';
        updateButtonStates();
    } catch (error) {
        console.error('[Group Details] Error saving:', error);
        showMessage('Failed to save group: ' + (error.message || 'Unknown error'), 'error');
    }
}

function clearForm() {
    document.getElementById('SubGroupId').value = '';
    document.getElementById('GroupDescription').value = '';
    document.getElementById('NoOfMembers').value = '';
    document.getElementById('LoanCycleRequired').value = '';
    document.getElementById('CreatedBy').value = '';
    document.getElementById('ModifiedBy').value = '';
    document.getElementById('SupervisedBy').value = '';
    document.getElementById('CreatedOn').value = '';
    document.getElementById('ModifiedOn').value = '';
    document.getElementById('SupervisedOn').value = '';
    currentGroupData = null;
}

function getFormData() {
    return {
        subGroupId: document.getElementById('SubGroupId').value.trim(),
        groupDescription: document.getElementById('GroupDescription').value.trim(),
        branchId: parentContext.branchId,
        centerId: parentContext.centerId
    };
}

function validateFormData(data) {
    if (!data.subGroupId) {
        showMessage('Sub Group ID is required', 'error');
        return false;
    }
    if (!data.groupDescription) {
        showMessage('Description is required', 'error');
        return false;
    }
    return true;
}

function updateButtonStates() {
    const hasData = !!currentGroupData;
    const isEditing = currentMode === 'add' || currentMode === 'edit';
    
    // Main buttons
    const viewBtn = document.querySelector('[data-mcn-de-action="view"]');
    const addBtn = document.querySelector('[data-mcn-de-action="add"]');
    const editBtn = document.querySelector('[data-mcn-de-action="edit"]');
    const deleteBtn = document.querySelector('[data-mcn-de-action="delete"]');
    const saveBtn = document.querySelector('[data-mcn-de-action="save"]');
    
    if (viewBtn) viewBtn.disabled = currentMode === 'view';
    if (addBtn) addBtn.disabled = isEditing;
    if (editBtn) editBtn.disabled = !hasData || isEditing;
    if (deleteBtn) deleteBtn.disabled = !hasData || isEditing;
    if (saveBtn) saveBtn.disabled = !isEditing;
    
    // Form inputs
    const editableInputs = ['SubGroupId', 'GroupDescription'];
    editableInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.disabled = currentMode === 'view';
        }
    });
    
    // Lookup buttons
    document.querySelectorAll('[data-mcn-lookup]').forEach(btn => {
        btn.disabled = currentMode === 'view';
    });
}

function showMessage(message, type = 'info') {
    // Try to use parent snackbar if available
    if (window.parent && window.parent.showSnackbar) {
        window.parent.showSnackbar(message, type);
    } else {
        console.log(`[Group Details] ${type.toUpperCase()}: ${message}`);
    }
    
    // Also update local status bar
    const statusBar = document.querySelector('.cu-status-bar');
    if (statusBar) {
        statusBar.textContent = message;
        statusBar.className = 'cu-status-bar';
        if (type === 'error') {
            statusBar.classList.add('error');
        } else if (type === 'success') {
            statusBar.classList.add('success');
        }
        
        // Clear after 3 seconds
        setTimeout(() => {
            statusBar.textContent = '';
            statusBar.className = 'cu-status-bar';
        }, 3000);
    }
}

