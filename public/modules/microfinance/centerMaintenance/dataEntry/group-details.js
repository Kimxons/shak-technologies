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

// ---------------------------------------------------------------------------
// Toast helpers (aligned with Center Maintenance system)
// ---------------------------------------------------------------------------

function ensureToastContainer() {
    let el = document.querySelector('[data-kairo-toast-container]');
    if (el) return el;

    el = document.createElement('div');
    el.className = 'kairo-toast-container';
    el.setAttribute('data-kairo-toast-container', '');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-relevant', 'additions');
    document.body.appendChild(el);
    return el;
}

function showToast(message, { title = 'Notice', variant = 'info', timeoutMs = 5000 } = {}) {
    const container = ensureToastContainer();

    const toast = document.createElement('div');
    toast.className = `kairo-toast kairo-toast--${variant}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-atomic', 'true');

    const body = document.createElement('div');
    body.className = 'kairo-toast__body';
    body.textContent = String(message || '');

    toast.appendChild(body);
    container.appendChild(toast);

    const remove = () => {
        toast.classList.remove('is-show');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
        setTimeout(() => toast.remove(), 300);
    };

    setTimeout(() => toast.classList.add('is-show'), 0);
    if (timeoutMs && timeoutMs > 0) setTimeout(remove, timeoutMs);
}

function showSystemToast(message, { title = 'Notice', variant = 'info', timeoutMs = 5000 } = {}) {
    const container = ensureToastContainer();
    const existingToasts = container.querySelectorAll('.kairo-toast');
    existingToasts.forEach(t => t.remove());
    showToast(message, { title, variant, timeoutMs });
}

function showSnackbar(message, type = 'info') {
    console.log('[Group Details] showSnackbar:', type, message);
    let variant = 'info';
    if (type === 'success') variant = 'success';
    else if (type === 'error' || type === 'danger') variant = 'danger';
    else if (type === 'warning') variant = 'warning';
    showSystemToast(message, { title: 'Notice', variant });
}

// Show loading overlay
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.hidden = !show;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    getParentContext();
    updateButtonStates();
});

function initializeEventListeners() {
    // Close button in header
    document.getElementById('btnClose')?.addEventListener('click', () => {
        window.parent.postMessage({ type: 'kairo-dataentry-close' }, '*');
    });
    
    // Refresh button
    document.getElementById('btnRefresh')?.addEventListener('click', () => {
        window.location.reload();
    });

    // Main action buttons - use data-action attribute from HTML
    document.querySelectorAll('[data-action]').forEach(btn => {
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
    const btn = event.target.closest('[data-action]');
    const action = btn?.dataset?.action;
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
        case 'cancel':
            handleCancel();
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
 * Open subgroup search dialog - delegates to parent window's modal
 */
function openSubGroupSearch() {
    // Validate parent context first
    if (!validateParentContext()) {
        showSnackbar('Please select Branch and Center first', 'error');
        return;
    }
    
    console.log('[Group Details] Opening subgroup search dialog via parent window');
    console.log('[Group Details] Parent context:', parentContext);
    console.log('[Group Details] Current mode:', currentMode);
    
    // Send message to parent to open search dialog
    // URL is relative to PARENT's location (center-maintenance.html), not this child iframe
    window.parent.postMessage({
        type: 'kairo-open-search',
        action: 'openSearchDialog',
        lookupType: 'subGroupSearch',
        title: 'Sub Group Search',
        url: '../../common/searchDialogs/subgroup-search/subgroup-search.html',
        source: 'group-details'
    }, '*');
    
    console.log('[Group Details] Search dialog request sent to parent');
}

/**
 * Handle messages from search dialogs
 */
async function handleMessage(event) {
    if (event.data.type === 'SUBGROUP_SELECTED') {
        console.log('[Group Details] SubGroup selected:', event.data);
        document.getElementById('SubGroupId').value = event.data.subGroupId;
        document.getElementById('GroupDescription').value = event.data.subGroupName || '';
        
        // No need to close local modal - parent closes its modal
        // The search was opened in parent's modal via postMessage
        
        // Auto-fetch complete subgroup details from server
        await fetchSubGroupDetails(event.data.subGroupId);
    } else if (event.data.type === 'kairo-dataentry-close') {
        // Handle close from search dialog (no local modal to close anymore)
        console.log('[Group Details] Received close message from search dialog');
    }
}

/**
 * Auto-fetch subgroup details using p_GetSubGroup API
 */
async function fetchSubGroupDetails(subGroupId) {
    try {
        showLoading(true);
        showSnackbar('Loading subgroup details...', 'info');
        
        const response = await GroupService.getSubGroup({
            OurBranchID: parentContext.branchId,
            GroupID: parentContext.centerId,
            SubGroupID: subGroupId,
            OperatorID: 'CSADM', // TODO: Get from session
            Direction: 0 // 0 for current record
        });
        
        console.log('[Group Details] Auto-fetched subgroup details:', response);
        showLoading(false);
        
        if (response.success && response.data && response.data.Details02 && response.data.Details02.length > 0) {
            // Get data from Details02 array (main subgroup data)
            const data = response.data.Details02[0];
            currentGroupData = data;
            
            // Get additional data from Details01 (NoOfMembers, IsStaggered)
            const details01 = response.data.Details01 && response.data.Details01.length > 0 ? response.data.Details01[0] : {};
            
            // Populate form fields
            document.getElementById('SubGroupId').value = data.SubGroupID || subGroupId;
            document.getElementById('GroupDescription').value = data.SubGroupName || '';
            
            // Populate behind the scene fields
            document.getElementById('NoOfMembers').value = details01.NoOfMembers || '0';
            document.getElementById('LoanCycleRequired').value = details01.IsStaggered ? 'Yes' : 'No';
            document.getElementById('CreatedBy').textContent = data.CreatedBy || '-';
            document.getElementById('ModifiedBy').textContent = data.ModifiedBy || '-';
            document.getElementById('SupervisedBy').textContent = data.SupervisedBy || '-';
            document.getElementById('CreatedOn').textContent = data.CreatedOn ? formatDateTime(data.CreatedOn) : '-';
            document.getElementById('ModifiedOn').textContent = data.ModifiedOn ? formatDateTime(data.ModifiedOn) : '-';
            document.getElementById('SupervisedOn').textContent = data.SupervisedOn ? formatDateTime(data.SupervisedOn) : '-';
            
            showSnackbar('Sub Group loaded successfully', 'success');
            
            // Stay in view mode with data loaded (View button will be disabled)
            currentMode = 'view';
            updateButtonStates();
        } else {
            // If fetch fails, use minimal data
            currentGroupData = {
                SubGroupID: subGroupId,
                SubGroupName: document.getElementById('GroupDescription').value,
                UpdateCount: 1
            };
            showSnackbar('Sub Group selected (details not found)', 'warning');
            currentMode = 'view';
            updateButtonStates();
        }
    } catch (error) {
        console.error('[Group Details] Error auto-fetching subgroup details:', error);
        showLoading(false);
        // Use minimal data from search as fallback
        currentGroupData = {
            SubGroupID: subGroupId,
            SubGroupName: document.getElementById('GroupDescription').value,
            UpdateCount: 1
        };
        showSnackbar('Sub Group selected (could not load details)', 'warning');
        currentMode = 'view';
        updateButtonStates();
    }
}

/**
 * Format datetime string for display
 */
function formatDateTime(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    } catch (error) {
        return dateString;
    }
}

/**
 * Populate form with group data
 */
function populateGroupData(data) {
    currentGroupData = data;
    
    // Populate Behind The Scene fields (audit fields are spans, use textContent)
    document.getElementById('NoOfMembers').value = data.NoOfMembers || '';
    document.getElementById('LoanCycleRequired').value = data.LoanCycleRequired || '';
    document.getElementById('CreatedBy').textContent = data.CreatedBy || '-';
    document.getElementById('ModifiedBy').textContent = data.ModifiedBy || '-';
    document.getElementById('SupervisedBy').textContent = data.SupervisedBy || '-';
    document.getElementById('CreatedOn').textContent = data.CreatedOn ? formatDateTime(data.CreatedOn) : '-';
    document.getElementById('ModifiedOn').textContent = data.ModifiedOn ? formatDateTime(data.ModifiedOn) : '-';
    document.getElementById('SupervisedOn').textContent = data.SupervisedOn ? formatDateTime(data.SupervisedOn) : '-';
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
        showSnackbar('Branch ID is required. Please select a branch in Center Maintenance first.', 'error');
        return false;
    }
    if (!parentContext.centerId) {
        showSnackbar('Center ID is required. Please select a center in Center Maintenance first.', 'error');
        return false;
    }
    return true;
}

function viewGroup() {
    if (!validateParentContext()) {
        return;
    }
    currentMode = 'view';
    updateButtonStates();
    showSnackbar('View mode - search for a sub group', 'info');
}

function addNewGroup() {
    if (!validateParentContext()) {
        return;
    }
    currentMode = 'add';
    clearForm();
    updateButtonStates();
    showSnackbar('Add mode - enter sub group details', 'info');
}

function handleCancel() {
    clearForm();
    currentMode = 'view';
    updateButtonStates();
    showSnackbar('Operation cancelled', 'info');
}

function editGroup() {
    if (!currentGroupData) {
        showSnackbar('Please select a group first', 'warning');
        return;
    }
    if (!validateParentContext()) {
        return;
    }
    currentMode = 'edit';
    updateButtonStates();
    showSnackbar('Edit mode - modify sub group details', 'info');
}

async function deleteGroup() {
    if (!currentGroupData) {
        showSnackbar('Please select a group first', 'warning');
        return;
    }
    
    // Use custom confirmation dialog
    const confirmed = await showConfirmationDialog(
        'Delete Group',
        `Are you sure you want to delete the group "${currentGroupData.SubGroupName || currentGroupData.SubGroupID}"? This action cannot be undone.`,
        'danger'
    );
    
    if (!confirmed) {
        return;
    }
    
    if (!validateParentContext()) {
        return;
    }
    
    try {
        showLoading(true);
        showSnackbar('Deleting group...', 'info');
        
        // Prepare request data for deleteSubGroup
        const requestData = {
            OurBranchID: parentContext.branchId,
            GroupID: parentContext.centerId,
            SubGroupID: currentGroupData.SubGroupID,
            UpdateCount: currentGroupData.UpdateCount || 1
        };
        
        console.log('[Group Details] Deleting subgroup:', requestData);
        
        const response = await GroupService.deleteSubGroup(requestData);
        
        console.log('[Group Details] Delete response:', response);
        showLoading(false);
        
        if (response.success) {
            showSnackbar('Group deleted successfully', 'success');
            clearForm();
            currentMode = 'view';
            updateButtonStates();
        } else {
            showSnackbar('Failed to delete group: ' + (response.message || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('[Group Details] Error deleting group:', error);
        showLoading(false);
        showSnackbar('Failed to delete group: ' + (error.message || 'Unknown error'), 'error');
    }
}

async function saveGroup() {
    if (currentMode !== 'add' && currentMode !== 'edit') {
        showSnackbar('No changes to save', 'warning');
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
        showLoading(true);
        showSnackbar('Saving group...', 'info');
        
        // Prepare request data for addEditSubGroup
        const requestData = {
            OurBranchID: parentContext.branchId,
            GroupID: parentContext.centerId, // Center ID is used as Group ID
            SubGroupID: formData.subGroupId || '', // Empty for add mode (autogenerated)
            SubGroupName: formData.groupDescription,
            CreatedBy: 'CSADM', // TODO: Get from session
            CreatedOn: currentMode === 'add' ? new Date().toISOString() : (currentGroupData?.CreatedOn || new Date().toISOString()),
            ModifiedBy: currentMode === 'edit' ? 'CSADM' : '', // TODO: Get from session
            ModifiedOn: currentMode === 'edit' ? new Date().toISOString() : '',
            SupervisedBy: currentGroupData?.SupervisedBy || '',
            UpdateCount: currentMode === 'add' ? 1 : (currentGroupData?.UpdateCount || 1)
        };
        
        console.log('[Group Details] Saving group:', requestData);
        
        const response = await GroupService.addEditSubGroup(requestData);
        
        console.log('[Group Details] Save response:', response);
        showLoading(false);
        
        if (response.success) {
            showSnackbar('Group saved successfully', 'success');
            
            // If add mode, populate the SubGroupId from response
            if (currentMode === 'add' && response.data) {
                const newSubGroupId = response.data.SubGroupID || response.data.Details?.[0]?.SubGroupID || '';
                if (newSubGroupId) {
                    document.getElementById('SubGroupId').value = newSubGroupId;
                    currentGroupData = { SubGroupID: newSubGroupId, SubGroupName: formData.groupDescription, UpdateCount: 1 };
                }
            }
            
            currentMode = 'view';
            updateButtonStates();
        } else {
            showSnackbar('Failed to save group: ' + (response.message || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('[Group Details] Error saving:', error);
        showLoading(false);
        showSnackbar('Failed to save group: ' + (error.message || 'Unknown error'), 'error');
    }
}

function clearForm() {
    document.getElementById('SubGroupId').value = '';
    document.getElementById('GroupDescription').value = '';
    document.getElementById('NoOfMembers').value = '';
    document.getElementById('LoanCycleRequired').value = '';
    document.getElementById('CreatedBy').textContent = '-';
    document.getElementById('ModifiedBy').textContent = '-';
    document.getElementById('SupervisedBy').textContent = '-';
    document.getElementById('CreatedOn').textContent = '-';
    document.getElementById('ModifiedOn').textContent = '-';
    document.getElementById('SupervisedOn').textContent = '-';
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
    if (currentMode === 'add') {
        // In add mode, only description is required (SubGroupId is autogenerated)
        if (!data.groupDescription) {
            showSnackbar('Description is required', 'error');
            return false;
        }
    } else {
        // In edit mode, both are required
        if (!data.subGroupId) {
            showSnackbar('Sub Group ID is required', 'error');
            return false;
        }
        if (!data.groupDescription) {
            showSnackbar('Description is required', 'error');
            return false;
        }
    }
    return true;
}

function updateButtonStates() {
    const hasData = !!currentGroupData;
    const isEditing = currentMode === 'add' || currentMode === 'edit';
    
    // Main buttons - use data-action attribute
    const viewBtn = document.querySelector('[data-action="view"]');
    const addBtn = document.querySelector('[data-action="add"]');
    const editBtn = document.querySelector('[data-action="edit"]');
    const deleteBtn = document.querySelector('[data-action="delete"]');
    const saveBtn = document.querySelector('[data-action="save"]');
    const cancelBtn = document.querySelector('[data-action="cancel"]');
    
    // View mode without data: View, Add enabled
    // View mode with data: Edit, Delete enabled
    // Add/Edit mode: Save, Cancel enabled
    if (viewBtn) viewBtn.disabled = hasData || isEditing;
    if (addBtn) addBtn.disabled = isEditing;
    if (editBtn) editBtn.disabled = !hasData || isEditing;
    if (deleteBtn) deleteBtn.disabled = !hasData || isEditing;
    if (saveBtn) saveBtn.disabled = !isEditing;
    if (cancelBtn) cancelBtn.disabled = false; // Always enabled
    
    // Form inputs
    const subGroupIdInput = document.getElementById('SubGroupId');
    const descriptionInput = document.getElementById('GroupDescription');
    
    if (subGroupIdInput) {
        // SubGroupId is readonly in add mode (autogenerated) and disabled in view mode
        // In edit mode, it should be readonly (can't change ID)
        subGroupIdInput.readOnly = currentMode === 'add' || currentMode === 'edit';
        subGroupIdInput.disabled = false;
        if (currentMode === 'add') {
            subGroupIdInput.placeholder = 'Auto-generated';
        } else {
            subGroupIdInput.placeholder = '';
        }
    }
    
    if (descriptionInput) {
        // Description is enabled in add and edit modes
        descriptionInput.readOnly = currentMode === 'view';
        descriptionInput.disabled = false;
    }
    
    // Lookup buttons - enabled in view mode for searching, disabled in add/edit modes
    document.querySelectorAll('[data-mcn-lookup]').forEach(btn => {
        btn.disabled = currentMode !== 'view';
    });
    
    // Visual feedback - add active class to indicate mode
    document.querySelectorAll('.btn-action').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (currentMode === 'add' && addBtn) {
        addBtn.classList.add('active');
    } else if (currentMode === 'edit' && editBtn) {
        editBtn.classList.add('active');
    } else if (currentMode === 'view' && !hasData && viewBtn) {
        viewBtn.classList.add('active');
    }
    
    console.log('[Group Details] Button states updated - Mode:', currentMode, 'HasData:', hasData);
}

