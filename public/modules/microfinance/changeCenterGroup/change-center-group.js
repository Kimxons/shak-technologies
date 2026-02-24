/**
 * Change Center/Group Module
 * Handles center and group search, client selection, and group transfer operations
 */

// ───────────────────────────────────────────────────────────────────────────
// Toast Helpers (aligned with Center Maintenance system)
// ───────────────────────────────────────────────────────────────────────────

function ccgEnsureToastContainer() {
  let el = document.querySelector('[data-kairo-toast-container]');
  if (!el) {
    el = document.getElementById('toastContainer');
  }
  if (el) return el;

  el = document.createElement('div');
  el.className = 'kairo-toast-container';
  el.setAttribute('data-kairo-toast-container', '');
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-relevant', 'additions');
  document.body.appendChild(el);
  return el;
}

function ccgShowToast(message, { title = 'Validation', variant = 'danger', timeoutMs = 9000 } = {}) {
  const container = ccgEnsureToastContainer();

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
    try {
      toast.classList.remove('is-show');
      setTimeout(() => toast.remove(), 160);
    } catch {
      // ignore
    }
  };

  setTimeout(() => toast.classList.add('is-show'), 0);
  if (timeoutMs && timeoutMs > 0) setTimeout(remove, timeoutMs);
}

function ccgShowSystemToast(message, { title = 'Notice', variant = 'info', timeoutMs = 5000 } = {}) {
  const container = ccgEnsureToastContainer();
  const existingToasts = container.querySelectorAll('.kairo-toast');
  existingToasts.forEach(t => t.remove());

  ccgShowToast(message, { title, variant, timeoutMs });
}

// ───────────────────────────────────────────────────────────────────────────
// State management
// ───────────────────────────────────────────────────────────────────────────

let currentCenter = null;
let currentGroup = null;
let selectedClients = [];
let clientsData = [];
let isNextStepActive = false; // Track if we're in the "next step" (transfer) state

// Context for passing to search dialogs
const parentContext = {
    branchId: '',
    centerId: '',
    centerName: ''
};

// New group context for transfer
const newGroupContext = {
    branchId: '',
    centerId: '',
    centerName: ''
};

/**
 * Initialize the module
 */
document.addEventListener('DOMContentLoaded', async function() {
    await initializeServices();
    setupEventListeners();
});

/**
 * Load required services
 */
async function initializeServices() {
    if (window.ServiceLoader) {
        try {
            await window.ServiceLoader.loadCore();
            await window.ServiceLoader.loadScript('../../../assets/js/services/shared/lookupService.js');
            await window.ServiceLoader.loadScript('../../../assets/js/services/microfinance/groupService.js');
            await window.ServiceLoader.loadScript('../../common/confirmationDialog/confirmation-dialog.js');
        } catch (error) {
            showStatus('Failed to load required services', 'error');
        }
    }
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Search buttons
    document.querySelectorAll('[data-search]').forEach(btn => {
        btn.addEventListener('click', handleSearchClick);
    });

    // Action buttons
    document.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', handleActionClick);
    });

    // Enter key on Center ID field
    document.getElementById('CenterId').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleView();
        }
    });

    // Enter key on Group ID field
    document.getElementById('GroupId').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            loadGroupMembers();
        }
    });

    // Select all checkbox
    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
        selectAll.addEventListener('change', handleSelectAll);
    }

    // Status close button
    document.querySelector('.status-close')?.addEventListener('click', () => {
        document.getElementById('statusMessage').classList.add('hidden');
    });

    // Listen for messages from search dialogs
    window.addEventListener('message', handleSearchMessage);
}

/**
 * Handle search button clicks
 */
function handleSearchClick(event) {
    const searchType = event.currentTarget.dataset.search;
    
    switch (searchType) {
        case 'center':
            openCenterSearch();
            break;
        case 'group':
            openGroupSearch();
            break;
        case 'newCenter':
            openNewCenterSearch();
            break;
        case 'newGroup':
            openNewGroupSearch();
            break;
    }
}

/**
 * Handle action button clicks
 */
function handleActionClick(event) {
    const action = event.currentTarget.dataset.action;
    
    switch (action) {
        case 'view':
            handleView();
            break;
        case 'select':
            handleSelect();
            break;
        case 'next':
            handleNext();
            break;
        case 'change':
            handleChange();
            break;
        case 'cancel':
            handleCancel();
            break;
    }
}

/**
 * Open Center Search Dialog
 */
function openCenterSearch() {
    const modal = document.getElementById('centerSearchModal');
    const iframe = document.getElementById('centerSearchFrame');
    const modalTitle = document.getElementById('centerSearchModalLabel');

    if (!modal || !iframe || !modalTitle) {
        return;
    }

    modalTitle.textContent = 'Center Search';
    iframe.src = '../../common/searchDialogs/group-search/group-search.html';

    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

/**
 * Open Group/SubGroup Search Dialog
 */
function openGroupSearch() {
    const centerId = document.getElementById('CenterId').value.trim();
    
    if (!centerId) {
        showStatus('Please select a Center first', 'error');
        return;
    }

    const modal = document.getElementById('groupSearchModal');
    const iframe = document.getElementById('groupSearchFrame');
    const modalTitle = document.getElementById('groupSearchModalLabel');

    if (!modal || !iframe || !modalTitle) {
        return;
    }

    modalTitle.textContent = 'Sub Group Search';
    iframe.src = '../../common/searchDialogs/subgroup-search/subgroup-search.html';

    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

/**
 * Open New Center Search Dialog (for transfer destination)
 */
function openNewCenterSearch() {
    // Set the flag to indicate we're selecting for the new group section
    isNextStepActive = true;

    const modal = document.getElementById('centerSearchModal');
    const iframe = document.getElementById('centerSearchFrame');
    const modalTitle = document.getElementById('centerSearchModalLabel');

    if (!modal || !iframe || !modalTitle) {
        return;
    }

    modalTitle.textContent = 'Select New Center';
    iframe.src = '../../common/searchDialogs/group-search/group-search.html';

    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

/**
 * Open New Group/SubGroup Search Dialog (for transfer destination)
 */
function openNewGroupSearch() {
    const newCenterId = document.getElementById('NewCenterId').value.trim();
    
    if (!newCenterId) {
        showStatus('Please select a New Center first', 'error');
        return;
    }

    // Set the flag to indicate we're selecting for the new group section
    isNextStepActive = true;

    const modal = document.getElementById('groupSearchModal');
    const iframe = document.getElementById('groupSearchFrame');
    const modalTitle = document.getElementById('groupSearchModalLabel');

    if (!modal || !iframe || !modalTitle) {
        return;
    }

    modalTitle.textContent = 'Select New Sub Group';
    iframe.src = '../../common/searchDialogs/subgroup-search/subgroup-search.html';

    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

/**
 * Handle messages from search dialogs
 */
function handleSearchMessage(event) {
    const { type, data } = event.data;

    switch (type) {
        case 'GROUP_SELECTED':
            // Center/Group selected from group-search dialog
            
            // Check if this is for the new group section or original section
            if (isNextStepActive) {
                // Populate new center fields
                document.getElementById('NewCenterId').value = event.data.groupId || '';
                document.getElementById('NewCenterName').value = event.data.groupName || '';
                
                // Update new group context
                newGroupContext.branchId = event.data.branchId || '0603';
                newGroupContext.centerId = event.data.groupId || '';
                newGroupContext.centerName = event.data.groupName || '';
                
                // Clear new group fields when center changes
                document.getElementById('NewGroupId').value = '';
                document.getElementById('NewGroupName').value = '';
                
                showStatus(`New Center '${event.data.groupName}' selected`, 'success');
                
                // Update button states (Change disabled until new group is selected)
                updateActionButtons();
            } else {
                // Populate original center fields
                document.getElementById('CenterId').value = event.data.groupId || '';
                document.getElementById('CenterName').value = event.data.groupName || '';
                
                // Update parent context for subgroup search
                parentContext.branchId = event.data.branchId || '0603';
                parentContext.centerId = event.data.groupId || '';
                parentContext.centerName = event.data.groupName || '';
                
                currentCenter = event.data.data || event.data;
                
                // Clear group fields when center changes
                document.getElementById('GroupId').value = '';
                document.getElementById('GroupName').value = '';
                clearClientTable();
                
                showStatus(`Center '${event.data.groupName}' selected`, 'success');
            }
            
            // Close the center search modal
            closeCenterSearchModal();
            break;

        case 'SUBGROUP_SELECTED':
            // SubGroup selected from subgroup-search dialog
            
            if (isNextStepActive) {
                // Populate new group fields
                document.getElementById('NewGroupId').value = event.data.subGroupId || '';
                document.getElementById('NewGroupName').value = event.data.subGroupName || '';
                
                showStatus(`New Group '${event.data.subGroupName}' selected`, 'success');
                
                // Update button states so Change becomes enabled
                updateActionButtons();
            } else {
                // Populate original group fields
                document.getElementById('GroupId').value = event.data.subGroupId || '';
                document.getElementById('GroupName').value = event.data.subGroupName || '';
                
                currentGroup = event.data.data || event.data;
                
                showStatus(`Group '${event.data.subGroupName}' selected`, 'success');
                
                // Automatically load group members
                loadGroupMembers();
            }
            
            // Close the group search modal
            closeGroupSearchModal();
            break;

        case 'kairo-dataentry-close':
            // Close any open modals
            closeCenterSearchModal();
            closeGroupSearchModal();
            break;
    }
}

/**
 * Close center search modal
 */
function closeCenterSearchModal() {
    const modal = document.getElementById('centerSearchModal');
    if (modal) {
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) bsModal.hide();
    }
}

/**
 * Close group search modal
 */
function closeGroupSearchModal() {
    const modal = document.getElementById('groupSearchModal');
    if (modal) {
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) bsModal.hide();
    }
}

/**
 * Handle View action - load center details and group members if group is selected
 */
async function handleView() {
    const centerId = document.getElementById('CenterId').value.trim();
    const groupId = document.getElementById('GroupId').value.trim();
    
    if (!centerId) {
        showStatus('Please enter a Center ID', 'error');
        return;
    }

    try {
        showStatus('Loading center details...', 'info');

        // Try to fetch center details using the group search API
        if (!window.LookupService) {
            showStatus('LookupService not available', 'error');
            return;
        }

        const payload = {
            TableID: 'GroupID',
            OurBranchID: parentContext.branchId || '0603',
            WhereStmt: `GroupID='${centerId}'`,
            RefID: null,
            PrevOrNext: 0,
            AdvFilterString: '',
            OperatorID: 'CSADM',
            ModuleID: 5060,
            SearchKey: null,
            LanguageID: 'en'
        };

        const result = await window.LookupService.getSearchResult(payload);

        if (result.success && result.data) {
            const groups = Array.isArray(result.data) ? result.data : (result.Details || []);
            const center = groups.find(g => g.GroupID === centerId);

            if (center) {
                document.getElementById('CenterName').value = center.GroupName || '';
                parentContext.branchId = center.OurBranchID || parentContext.branchId || '0603';
                parentContext.centerId = center.GroupID;
                parentContext.centerName = center.GroupName;
                currentCenter = center;
                
                showStatus(`Center '${center.GroupName}' loaded`, 'success');
                
                // If group ID is also provided, load members
                if (groupId) {
                    await loadGroupMembers();
                }
            } else {
                showStatus('Center not found', 'error');
            }
        } else {
            showStatus('Center not found', 'error');
        }
    } catch (error) {
        showStatus('Error loading center details', 'error');
    }
}

/**
 * Load group members when a subgroup is selected
 */
async function loadGroupMembers() {
    const centerId = document.getElementById('CenterId').value.trim();
    const groupId = document.getElementById('GroupId').value.trim();

    if (!centerId) {
        showStatus('Please select a Center first', 'warning');
        return;
    }

    const tbody = document.querySelector('#clientTable tbody');
    
    try {
        showStatus('Loading group members...', 'info');
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Loading members...</td></tr>';

        // Check if GroupService is available
        if (!window.GroupService) {
            showStatus('GroupService not available', 'error');
            tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Service not available</td></tr>';
            return;
        }

        // Prepare request data for getGroupMemberList
        const requestData = {
            OurBranchID: parentContext.branchId || '0603',
            GroupID: centerId,
            SubGroupID: groupId || '',  // Optional - can be empty to get all members
            OperatorID: 'CSADM',
            ModuleID: 5067
        };

        const result = await window.GroupService.getGroupMemberList(requestData);

        if (result.success && result.data) {
            // Extract members from response - Details01 contains the member list
            let members = [];
            if (result.data.Details01 && Array.isArray(result.data.Details01) && result.data.Details01.length > 0) {
                members = result.data.Details01;
            }

            clientsData = members;
            renderClientTable(members);

            if (members.length > 0) {
                document.getElementById('selectAll').disabled = false;
                showStatus(`Loaded ${members.length} member(s)`, 'success');
            } else {
                document.getElementById('selectAll').disabled = true;
                tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No members found for this group</td></tr>';
                showStatus('No members found', 'info');
            }
        } else {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No members found</td></tr>';
            document.getElementById('selectAll').disabled = true;
            showStatus('No members found', 'info');
        }

        updateActionButtons();

    } catch (error) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Error loading members</td></tr>';
        showStatus('Error loading group members: ' + (error.message || 'Unknown error'), 'error');
    }
}

/**
 * Render client table with member data
 */
function renderClientTable(members) {
    const tbody = document.querySelector('#clientTable tbody');
    
    if (!members || members.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No records to display.</td></tr>';
        return;
    }

    tbody.innerHTML = members.map((member, index) => {
        // Map API response fields to table columns
        const clientId = member.ClientID || member.MemberID || '';
        const clientName = member.ClientName || member.MemberName || member.Name || '';
        const clientType = member.ClientType || member.MemberType || 'Individual';
        const regDate = formatDate(member.RegistrationDate || member.RegDate || '');
        const joinDate = formatDate(member.JoinDate || member.JoiningDate || '');
        
        return `
            <tr data-member-index="${index}">
                <td class="checkbox-col">
                    <input type="checkbox" value="${clientId}" onchange="handleRowCheckbox(this)">
                </td>
                <td>${clientId}</td>
                <td>${clientName}</td>
                <td>${clientType}</td>
                <td>${regDate}</td>
                <td>${joinDate}</td>
            </tr>
        `;
    }).join('');
}

/**
 * Format date for display
 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return dateStr;
    }
}

/**
 * Handle individual row checkbox change
 */
function handleRowCheckbox(checkbox) {
    updateSelectedClients();
    updateActionButtons();
    
    // Update select all checkbox state
    const allCheckboxes = document.querySelectorAll('#clientTable tbody input[type="checkbox"]');
    const checkedCount = document.querySelectorAll('#clientTable tbody input[type="checkbox"]:checked').length;
    const selectAll = document.getElementById('selectAll');
    
    if (checkedCount === 0) {
        selectAll.checked = false;
        selectAll.indeterminate = false;
    } else if (checkedCount === allCheckboxes.length) {
        selectAll.checked = true;
        selectAll.indeterminate = false;
    } else {
        selectAll.checked = false;
        selectAll.indeterminate = true;
    }
}

/**
 * Clear client table
 */
function clearClientTable() {
    const tbody = document.querySelector('#clientTable tbody');
    tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No records to display.</td></tr>';
    document.getElementById('selectAll').disabled = true;
    document.getElementById('selectAll').checked = false;
    selectedClients = [];
    clientsData = [];
    updateActionButtons();
}

/**
 * Handle Select All checkbox
 */
function handleSelectAll() {
    const selectAll = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('#clientTable tbody input[type="checkbox"]');
    
    checkboxes.forEach(cb => {
        cb.checked = selectAll.checked;
    });

    updateSelectedClients();
    updateActionButtons();
}

/**
 * Update selected clients array based on checked checkboxes
 */
function updateSelectedClients() {
    const checkboxes = document.querySelectorAll('#clientTable tbody input[type="checkbox"]:checked');
    selectedClients = Array.from(checkboxes).map(cb => cb.value);
}

/**
 * Update action button states based on selection and workflow state
 */
function updateActionButtons() {
    const hasSelection = selectedClients.length > 0;
    const hasCenter = document.getElementById('CenterId').value.trim() !== '';
    const hasGroup = document.getElementById('GroupId').value.trim() !== '';
    
    // Get new group section values when in next step
    const hasNewCenter = document.getElementById('NewCenterId')?.value.trim() !== '';
    const hasNewGroup = document.getElementById('NewGroupId')?.value.trim() !== '';

    const selectBtn = document.querySelector('[data-action="select"]');
    const nextBtn = document.querySelector('[data-action="next"]');
    const changeBtn = document.querySelector('[data-action="change"]');

    if (isNextStepActive) {
        // In the next step, Next is disabled and Change is enabled when new group is selected
        selectBtn.disabled = true;
        nextBtn.disabled = true;
        changeBtn.disabled = !(hasNewCenter && hasNewGroup);
    } else {
        // Normal flow - enable based on selection
        selectBtn.disabled = !hasSelection;
        nextBtn.disabled = !hasSelection;
        changeBtn.disabled = true; // Change only enabled after Next is clicked
    }
}

/**
 * Handle Select action
 */
function handleSelect() {
    updateSelectedClients();
    
    if (selectedClients.length === 0) {
        showStatus('Please select at least one client', 'error');
        return;
    }

    showStatus(`${selectedClients.length} client(s) selected`, 'success');
}

/**
 * Handle Next action - show New Group section with pre-filled center
 */
function handleNext() {
    // Make sure we have selected clients
    updateSelectedClients();
    
    if (selectedClients.length === 0) {
        showStatus('Please select at least one client first', 'error');
        return;
    }

    // Get current center values
    const currentCenterId = document.getElementById('CenterId').value.trim();
    const currentCenterName = document.getElementById('CenterName').value.trim();
    
    if (!currentCenterId) {
        showStatus('Please select a Center first', 'error');
        return;
    }

    // Show the New Group section
    const newGroupSection = document.getElementById('newGroupSection');
    if (newGroupSection) {
        newGroupSection.classList.remove('d-none');
    }

    // Pre-fill the new center with current center
    document.getElementById('NewCenterId').value = currentCenterId;
    document.getElementById('NewCenterName').value = currentCenterName;
    
    // Update newGroupContext
    newGroupContext.branchId = parentContext.branchId || '0603';
    newGroupContext.centerId = currentCenterId;
    newGroupContext.centerName = currentCenterName;

    // Clear new group fields
    document.getElementById('NewGroupId').value = '';
    document.getElementById('NewGroupName').value = '';

    // Set the flag
    isNextStepActive = true;

    // Update button states
    updateActionButtons();

    showStatus(`Select a new Center/Group for ${selectedClients.length} client(s)`, 'info');
}

/**
 * Handle Change action - Transfer selected clients to new group
 */
async function handleChange() {
    // Validate selections
    updateSelectedClients();
    
    if (selectedClients.length === 0) {
        showStatus('Please select clients first', 'error');
        return;
    }

    const newCenterId = document.getElementById('NewCenterId').value.trim();
    const newGroupId = document.getElementById('NewGroupId').value.trim();

    if (!newCenterId || !newGroupId) {
        showStatus('Please select a new Center and Group', 'error');
        return;
    }

    // Confirm the transfer using custom confirmation dialog
    const confirmMessage = `Are you sure you want to transfer ${selectedClients.length} client(s) to Center: ${newCenterId}, Group: ${newGroupId}?`;
    
    let confirmed = false;
    if (window.showConfirmationDialog) {
        confirmed = await window.showConfirmationDialog('Confirm Transfer', confirmMessage, 'primary');
    } else {
        // Fallback to native confirm if dialog not loaded
        confirmed = confirm(confirmMessage);
    }
    
    if (!confirmed) {
        return;
    }

    try {
        showStatus('Processing center/group change...', 'info');

        // Check if GroupService is available
        if (!window.GroupService) {
            showStatus('GroupService not available', 'error');
            return;
        }

        let successCount = 0;
        let errorCount = 0;
        const errors = [];
        const currentDate = new Date().toISOString();

        // Process each selected client
        for (const clientId of selectedClients) {
            // Find the client data from clientsData
            const clientData = clientsData.find(c => 
                (c.ClientID || c.MemberID) === clientId
            ) || {};

            const requestData = {
                ClientID: clientId,
                RefID: clientData.RefID || 0,
                OurBranchID: newGroupContext.branchId || parentContext.branchId || '0603',
                GroupID: newCenterId,
                SubGroupID: newGroupId,
                RegistrationDate: clientData.RegistrationDate || currentDate,
                JoinDate: currentDate,  // New join date for the new group
                GroupMemberTypeID: clientData.GroupMemberTypeID || 'MEMBER',
                CreatedBy: 'CSADM',
                CreatedOn: currentDate,
                ModifiedBy: 'CSADM',
                ModifiedOn: currentDate,
                SupervisedBy: clientData.SupervisedBy || 'CSADM',
                NewRecord: 1  // Indicates a new group assignment
            };

            try {
                const result = await window.GroupService.changeMemberGroupID(requestData);

                if (result.success) {
                    successCount++;
                } else {
                    errorCount++;
                    errors.push(`${clientId}: ${result.message || 'Failed'}`);
                }
            } catch (clientError) {
                errorCount++;
                errors.push(`${clientId}: ${clientError.message || 'Error'}`);
            }
        }

        // Show results
        if (errorCount === 0) {
            showStatus(`Successfully transferred ${successCount} client(s) to new group`, 'success');
            
            // Reset the form after successful transfer
            setTimeout(() => {
                handleCancel();
            }, 2000);
        } else if (successCount > 0) {
            showStatus(`Transferred ${successCount} client(s), ${errorCount} failed`, 'warning');
        } else {
            showStatus(`Failed to transfer clients: ${errors[0] || 'Unknown error'}`, 'error');
        }

    } catch (error) {
        showStatus('Error processing center/group change: ' + (error.message || 'Unknown error'), 'error');
    }
}

/**
 * Handle Cancel action - reset all state and hide new group section
 */
function handleCancel() {
    // Reset current center/group section
    document.getElementById('CenterId').value = '';
    document.getElementById('CenterName').value = '';
    document.getElementById('GroupId').value = '';
    document.getElementById('GroupName').value = '';
    
    // Reset new group section
    const newGroupSection = document.getElementById('newGroupSection');
    if (newGroupSection) {
        newGroupSection.classList.add('d-none');
    }
    document.getElementById('NewCenterId').value = '';
    document.getElementById('NewCenterName').value = '';
    document.getElementById('NewGroupId').value = '';
    document.getElementById('NewGroupName').value = '';
    
    // Reset state
    currentCenter = null;
    currentGroup = null;
    selectedClients = [];
    isNextStepActive = false;
    
    parentContext.branchId = '';
    parentContext.centerId = '';
    parentContext.centerName = '';
    
    newGroupContext.branchId = '';
    newGroupContext.centerId = '';
    newGroupContext.centerName = '';
    
    clearClientTable();
    updateActionButtons();
    
    showStatus('Cancelled', 'info');
}

/**
 * Show status message using toast system
 */
function showStatus(message, type = 'info') {
    let variant = 'info';
    if (type === 'success') variant = 'success';
    else if (type === 'error') variant = 'danger';
    else if (type === 'warning') variant = 'warning';

    ccgShowSystemToast(message, { title: 'Notice', variant });
}
