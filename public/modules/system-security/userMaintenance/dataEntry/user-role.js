(function () {
  let UserService;
  let LookupService;
  let hasData = false;
  let isEditMode = false;
  let pendingRoles = []; // Roles waiting to be saved
  let savedRoles = []; // Roles already saved
  let selectedRoleIndex = -1; // Index of selected row (-1 means no selection)

  async function loadServices() {
    try {
      const { ServiceLoader } = window;
      if (!ServiceLoader) {
        console.error('❌ User Role: ServiceLoader not available');
        if (window.ToastMessages) {
          ToastMessages.warning('Some features may not work. ServiceLoader not available.');
        }
        return;
      }
      
      await ServiceLoader.loadCore();
      await ServiceLoader.loadUserService();
      await ServiceLoader.loadScript('../../../../../../assets/js/services/shared/lookupService.js');
      UserService = window.UserService;
      LookupService = window.LookupService;
      console.log('✅ User Role: Services loaded successfully');
    } catch (error) {
      console.error('❌ User Role: Error loading services:', error);
      if (window.ToastMessages) {
        ToastMessages.warning('Some features may not work. Failed to load services.');
      }
    }
  }

  async function fetchRoles() {
    if (!UserService || !window.parent.currentUser) return;

    const user = window.parent.currentUser;
    const requestData = {
      OurBranchID: user.OurBranchID || user.BranchID || "0603",
      RoleID: "",
      OperatorID: window.Environment?.operatorId || 'CSADM',
      Direction: 0
    };

    try {
      const response = await UserService.getRoles(requestData);
      console.log('Roles Response:', response);
      if (response.success && response.data && response.data.Details) {
        populateRoleDropdown(response.data.Details);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  }

  function populateRoleDropdown(roles) {
    const roleSelect = document.getElementById('roleId');
    if (!roleSelect) return;

    // Clear existing options except the first one (--Select--)
    roleSelect.innerHTML = '<option value="">--Select--</option>';

    if (!roles || roles.length === 0) return;

    roles.forEach(role => {
      const option = document.createElement('option');
      option.value = role.RoleID || '';
      option.textContent = role.RoleName || role.RoleID || '';
      roleSelect.appendChild(option);
    });
  }

  async function fetchUserRoles() {
    if (!UserService || !window.parent.currentUser) return;

    const user = window.parent.currentUser;
    const requestData = {
      BankID: user.BankID || "00", // Use actual or placeholder
      OurBranchID: user.OurBranchID || user.BranchID || "0603",
      RequireOperatorID: user.OperatorID,
      OperatorID: 'CSADM'
    };

    try {
      const response = await UserService.getUserRoles(requestData);
      console.log('User Roles Response:', response);
      if (response.success && response.data && response.data.Details02) {
        populateRolesTable(response.data.Details02);
      }
    } catch (error) {
      console.error('Error fetching user roles:', error);
    }
  }

  function populateRolesTable(roles) {
    const tbody = document.querySelector('.ur-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!roles || roles.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="ur-no-data">No roles assigned yet</td></tr>';
      hasData = false;
      updateButtonStates();
      return;
    }

    hasData = true;
    roles.forEach(role => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td></td>
        <td>${role.OurBranchID || ''}</td>
        <td>${role.RoleID || ''}</td>
        <td>${role.RoleName || ''}</td>
        <td>${role.AccessLevel || ''}</td>
        <td>${role.SupervisorID || ''}</td>
        <td></td>
      `;
      tbody.appendChild(row);
    });
    updateButtonStates();
  }

  function postClose() {
    try {
      window.parent.postMessage({ type: 'kairo-dataentry-close' }, '*');
    } catch (_) {
      // ignore
    }
  }

  function setMinimized(isMinimized) {
    var root = document.querySelector('[data-ur-window]');
    if (!root) return;
    root.classList.toggle('ur-window--minimized', Boolean(isMinimized));
  }

  function doRefresh() {
    try {
      window.location.reload();
    } catch (_) {
      // ignore
    }
  }

  async function handleNewRole() {
    // Validate required fields
    const branchIdInput = document.getElementById('branchId');
    const roleIdSelect = document.getElementById('roleId');
    const accessLevelSelect = document.getElementById('accessLevel');
    const allBranchesCheckbox = document.getElementById('allBranches');
    const regionIdInput = document.getElementById('regionId');
    const supervisorIdInput = document.getElementById('supervisorId');
    const supervisorRoleIdInput = document.getElementById('supervisorRoleId');
    const expiryDateSelect = document.getElementById('expiryDate');

    const roleId = roleIdSelect.value.trim();
    const accessLevel = accessLevelSelect.value.trim();
    const allBranches = allBranchesCheckbox.checked;
    const branchId = branchIdInput.value.trim();

    // Validation
    if (!roleId) {
      window.ToastMessages.error('Role ID is required');
      roleIdSelect.focus();
      return;
    }

    if (!accessLevel) {
      window.ToastMessages.error('Access Level is required');
      accessLevelSelect.focus();
      return;
    }

    if (!allBranches && !branchId) {
      window.ToastMessages.error('Branch ID is required (or check All Branches)');
      branchIdInput.focus();
      return;
    }

    try {
      let branches = [];
      
      if (allBranches) {
        // Fetch all branches
        window.ToastMessages.info('Fetching all branches...');
        const result = await LookupService.getBranches({ BankID: "00" });
        
        if (result.success && result.data) {
          branches = Array.isArray(result.data) ? result.data : (result.Details || []);
        } else {
          window.ToastMessages.error('Failed to fetch branches');
          return;
        }
      } else {
        // Single branch
        branches = [{ OurBranchID: branchId, BranchName: '', RegionID: regionIdInput.value.trim() }];
      }

      if (branches.length === 0) {
        window.ToastMessages.warning('No branches found');
        return;
      }

      // Get role name from dropdown
      const roleOption = roleIdSelect.options[roleIdSelect.selectedIndex];
      const roleName = roleOption.textContent;

      // Add each branch with the role to pending roles
      branches.forEach(branch => {
        const newRole = {
          RegionID: branch.RegionID || '',
          OurBranchID: branch.OurBranchID || '',
          BranchName: branch.BranchName || '',
          RoleID: roleId,
          RoleName: roleName,
          AccessLevel: accessLevel,
          SupervisorID: supervisorIdInput.value.trim(),
          SupervisorRoleID: supervisorRoleIdInput.value.trim(),
          ExpiryDate: expiryDateSelect.value.trim()
        };
        pendingRoles.push(newRole);
      });

      // Refresh table to show pending roles
      renderPendingRoles();
      
      // Clear form fields after adding
      clearAllFields();
      
      window.ToastMessages.success(`Added ${branches.length} role assignment${branches.length > 1 ? 's' : ''} to pending list`);
    } catch (error) {
      console.error('Error in handleNewRole:', error);
      window.ToastMessages.error('Failed to add role assignments');
    }
  }

  function renderPendingRoles() {
    const tbody = document.querySelector('.ur-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    const allRoles = [...savedRoles, ...pendingRoles];

    if (allRoles.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="ur-no-data">No roles assigned yet</td></tr>';
      selectedRoleIndex = -1;
      updateButtonStates();
      return;
    }

    allRoles.forEach((role, index) => {
      const row = document.createElement('tr');
      const isPending = index >= savedRoles.length;
      
      if (isPending) {
        row.style.backgroundColor = '#fffacd'; // Light yellow for pending
      }
      
      // Highlight selected row
      if (index === selectedRoleIndex) {
        row.style.outline = '2px solid #4A90E2';
      }
      
      row.innerHTML = `
        <td>${role.RegionID || ''}</td>
        <td>${role.OurBranchID || ''}</td>
        <td>${role.RoleID || ''}</td>
        <td>${role.RoleName || ''}</td>
        <td>${role.AccessLevel || ''}</td>
        <td>${role.SupervisorID || ''}</td>
        <td>${role.ExpiryDate || ''}</td>
      `;
      
      row.style.cursor = 'pointer';
      row.addEventListener('click', function() {
        selectedRoleIndex = index;
        renderPendingRoles(); // Re-render to update selection
      });
      
      tbody.appendChild(row);
    });
    
    // Update button states after rendering to reflect selection
    updateButtonStates();
  }

  function wireAllBranchesCheckbox() {
    const allBranchesCheckbox = document.getElementById('allBranches');
    const regionIdInput = document.getElementById('regionId');
    const branchIdInput = document.getElementById('branchId');

    if (allBranchesCheckbox) {
      allBranchesCheckbox.addEventListener('change', function() {
        const isChecked = this.checked;
        
        if (regionIdInput) {
          regionIdInput.disabled = isChecked;
          if (isChecked) regionIdInput.value = '';
        }
        
        if (branchIdInput) {
          branchIdInput.disabled = isChecked;
          if (isChecked) branchIdInput.value = '';
        }
      });
    }
  }

  function wireBranchSearch() {
    const btnBranchLookup = document.querySelector('[data-ur-lookup="branch"]');
    if (!btnBranchLookup) return;

    btnBranchLookup.addEventListener('click', function(e) {
      e.preventDefault();
      openBranchSearchModal();
    });
  }

  function openBranchSearchModal() {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.style.cssText = `
      width: 80%;
      max-width: 900px;
      height: 70%;
      border: none;
      border-radius: 4px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    iframe.src = '../../../common/searchDialogs/branch-search/branch-search.html';

    overlay.appendChild(iframe);
    document.body.appendChild(overlay);

    // Listen for messages from iframe
    function handleMessage(event) {
      if (event.data && event.data.type === 'BRANCH_SELECTED') {
        const branchIdInput = document.getElementById('branchId');
        if (branchIdInput) {
          branchIdInput.value = event.data.branchId || '';
        }
        closeModal();
      } else if (event.data && event.data.type === 'kairo-dataentry-close') {
        closeModal();
      }
    }

    function closeModal() {
      window.removeEventListener('message', handleMessage);
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }

    // Close on overlay click
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeModal();
    });

    window.addEventListener('message', handleMessage);
  }

  function wireTitleBar() {
    var btnClose = document.querySelector('[data-ur-close]');
    var btnMin = document.querySelector('[data-ur-minimize]');
    var btnRefresh = document.querySelector('[data-ur-refresh]');

    if (btnClose) btnClose.addEventListener('click', postClose);

    if (btnMin) {
      btnMin.addEventListener('click', function () {
        var root = document.querySelector('[data-ur-window]');
        var minimized = root && root.classList.contains('ur-window--minimized');
        setMinimized(!minimized);
      });
    }

    if (btnRefresh) btnRefresh.addEventListener('click', doRefresh);
  }

  function disableAllFields() {
    const inputs = document.querySelectorAll('.ur-top-box input, .ur-top-box select');
    inputs.forEach(input => {
      input.disabled = true;
    });
    
    // Also disable lookup buttons
    const lookupButtons = document.querySelectorAll('[data-ur-lookup]');
    lookupButtons.forEach(btn => {
      btn.disabled = true;
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';
    });
  }

  function enableAllFields() {
    const inputs = document.querySelectorAll('.ur-top-box input, .ur-top-box select');
    inputs.forEach(input => {
      input.disabled = false;
    });
    
    // Also enable lookup buttons
    const lookupButtons = document.querySelectorAll('[data-ur-lookup]');
    lookupButtons.forEach(btn => {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
    });
  }

  function clearAllFields() {
    const inputs = document.querySelectorAll('.ur-top-box input');
    inputs.forEach(input => {
      if (input.type !== 'button') {
        input.value = '';
      }
    });
    const selects = document.querySelectorAll('.ur-top-box select');
    selects.forEach(select => {
      select.selectedIndex = 0;
    });
  }

  function updateButtonStates() {
    const btnAdd = document.querySelector('[data-ur-add]');
    const btnEdit = document.querySelector('[data-ur-edit]');
    const btnDelete = document.querySelector('[data-ur-delete]');
    const btnSave = document.querySelector('[data-ur-save]');
    const btnCancel = document.querySelector('[data-ur-cancel]');
    const btnNew = document.querySelector('[data-ur-new]');
    const btnAlter = document.querySelector('[data-ur-alter]');
    const btnRemove = document.querySelector('[data-ur-remove]');
    const btnUpdate = document.querySelector('[data-ur-update]');
    const btnClear = document.querySelector('[data-ur-clear]');

    const hasSelection = selectedRoleIndex !== -1;

    if (isEditMode) {
      // In Add/Edit mode: enable New button, Save/Cancel, disable Add/Edit/Delete
      if (btnAdd) btnAdd.disabled = true;
      if (btnEdit) btnEdit.disabled = true;
      if (btnDelete) btnDelete.disabled = true;
      if (btnNew) btnNew.disabled = false;
      if (btnSave) btnSave.disabled = false;
      if (btnCancel) btnCancel.disabled = false;
      
      // Table buttons: only Remove enabled when row is selected
      if (btnAlter) btnAlter.disabled = true;
      if (btnRemove) btnRemove.disabled = !hasSelection;
      if (btnUpdate) btnUpdate.disabled = true;
      if (btnClear) btnClear.disabled = false;
    } else {
      // Not in edit mode: enable Add or Edit based on data, disable Save/Cancel/New
      if (btnAdd) btnAdd.disabled = hasData;
      if (btnEdit) btnEdit.disabled = !hasData;
      if (btnDelete) btnDelete.disabled = !hasData;
      if (btnNew) btnNew.disabled = true;
      if (btnSave) btnSave.disabled = true;
      if (btnCancel) btnCancel.disabled = true;
      
      // Table buttons: all disabled when not in edit mode
      if (btnAlter) btnAlter.disabled = true;
      if (btnRemove) btnRemove.disabled = true;
      if (btnUpdate) btnUpdate.disabled = true;
      if (btnClear) btnClear.disabled = true;
    }
  }

  function wireTableActionButtons() {
    const btnNew = document.querySelector('[data-ur-new]');
    const btnAlter = document.querySelector('[data-ur-alter]');
    const btnRemove = document.querySelector('[data-ur-remove]');
    const btnUpdate = document.querySelector('[data-ur-update]');
    const btnClear = document.querySelector('[data-ur-clear]');

    // Initialize all buttons as disabled
    if (btnNew) btnNew.disabled = true;
    if (btnAlter) btnAlter.disabled = true;
    if (btnRemove) btnRemove.disabled = true;
    if (btnUpdate) btnUpdate.disabled = true;
    if (btnClear) btnClear.disabled = true;

    if (btnNew) {
      btnNew.addEventListener('click', async function(e) {
        e.preventDefault();
        await handleNewRole();
      });
    }

    if (btnRemove) {
      btnRemove.addEventListener('click', function(e) {
        e.preventDefault();
        handleRemoveRole();
      });
    }

    if (btnClear) {
      btnClear.addEventListener('click', function(e) {
        e.preventDefault();
        clearAllFields();
      });
    }

    // TODO: Wire Alter and Update buttons
  }

  function handleRemoveRole() {
    if (selectedRoleIndex === -1) {
      window.ToastMessages.warning('Please select a role to remove');
      return;
    }

    const allRoles = [...savedRoles, ...pendingRoles];
    const selectedRole = allRoles[selectedRoleIndex];
    
    if (selectedRoleIndex < savedRoles.length) {
      // Removing from saved roles
      const confirmed = confirm('Remove role ' + selectedRole.RoleID + ' for branch ' + selectedRole.OurBranchID + '?');
      if (confirmed) {
        savedRoles.splice(selectedRoleIndex, 1);
        window.ToastMessages.success('Role removed successfully');
      } else {
        return;
      }
    } else {
      // Removing from pending roles
      const pendingIndex = selectedRoleIndex - savedRoles.length;
      pendingRoles.splice(pendingIndex, 1);
      window.ToastMessages.success('Pending role removed');
    }
    
    selectedRoleIndex = -1;
    renderPendingRoles();
    updateButtonStates();
  }

  function wireActionButtons() {
    var btnBack = document.querySelector('[data-ur-back]');
    var btnAdd = document.querySelector('[data-ur-add]');
    var btnEdit = document.querySelector('[data-ur-edit]');
    var btnDelete = document.querySelector('[data-ur-delete]');
    var btnSave = document.querySelector('[data-ur-save]');
    var btnCancel = document.querySelector('[data-ur-cancel]');

    // Initially disable all buttons except Back
    if (btnAdd) btnAdd.disabled = true;
    if (btnEdit) btnEdit.disabled = true;
    if (btnDelete) btnDelete.disabled = true;
    if (btnSave) btnSave.disabled = true;
    if (btnCancel) btnCancel.disabled = true;

    if (btnBack) btnBack.addEventListener('click', postClose);

    if (btnAdd) {
      btnAdd.addEventListener('click', function(e) {
        e.preventDefault();
        isEditMode = true;
        selectedRoleIndex = -1;
        clearAllFields();
        enableAllFields();
        renderPendingRoles();
        updateButtonStates();
      });
    }

    if (btnEdit) {
      btnEdit.addEventListener('click', function(e) {
        e.preventDefault();
        isEditMode = true;
        enableAllFields();
        updateButtonStates();
      });
    }

    if (btnDelete) {
      btnDelete.addEventListener('click', function(e) {
        e.preventDefault();
        // TODO: Implement delete functionality
        console.log('Delete clicked');
      });
    }

    if (btnSave) {
      btnSave.addEventListener('click', async function(e) {
        e.preventDefault();
        
        if (pendingRoles.length === 0) {
          window.ToastMessages.warning('No pending roles to save');
          return;
        }

        try {
          window.ToastMessages.info('Saving role assignments...');
          
          // Get current user info
          const currentUser = window.parent.currentUser || {};
          const operatorId = currentUser.OperatorID || 'CSADM';
          const branchId = currentUser.OurBranchID || currentUser.BranchID || '0603';
          
          // Build DetailRecords XML from pendingRoles
          let detailXml = '<ROOT>';
          pendingRoles.forEach(role => {
            detailXml += '<Detail>';
            detailXml += '<OurBranchID>' + (role.OurBranchID || '') + '</OurBranchID>';
            detailXml += '<RoleID>' + (role.RoleID || '') + '</RoleID>';
            detailXml += '<AccessLevel>' + (role.AccessLevel || '') + '</AccessLevel>';
            detailXml += '<SupervisorID>' + (role.SupervisorID || '') + '</SupervisorID>';
            detailXml += '<SupervisorRoleID>' + (role.SupervisorRoleID || '') + '</SupervisorRoleID>';
            detailXml += '<ExpiryDate>' + (role.ExpiryDate || '') + '</ExpiryDate>';
            detailXml += '</Detail>';
          });
          detailXml += '</ROOT>';
          
          // Prepare request data
          const requestData = {
            OurBranchID: branchId,
            OperatorID: operatorId,
            OperatedBy: operatorId,
            OperatedOn: new Date().toISOString(),
            SupervisedBy: '',
            UpdateCount: 0,
            DetailRecords: detailXml
          };
          
          // Call API
          console.log('Save User Roles Request:', requestData);
          const response = await UserService.addEditUserRoles(requestData);
            console.log('Save User Roles Response:', response);
          if (response.success) {
            // Move pending to saved
            savedRoles.push(...pendingRoles);
            pendingRoles = [];
            
            isEditMode = false;
            disableAllFields();
            updateButtonStates();
            renderPendingRoles();
            
            window.ToastMessages.success('Role assignments saved successfully');
          } else {
            const errorMsg = response.message || 'Failed to save role assignments';
            window.ToastMessages.error(errorMsg);
          }
        } catch (error) {
          console.error('Error saving user roles:', error);
          window.ToastMessages.error('An error occurred while saving role assignments');
        }
      });
    }

    if (btnCancel) {
      btnCancel.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Clear pending roles and selection
        pendingRoles = [];
        selectedRoleIndex = -1;
        
        isEditMode = false;
        disableAllFields();
        clearAllFields();
        updateButtonStates();
        
        // Refresh table
        renderPendingRoles();
        
        window.ToastMessages.info('Changes cancelled');
      });
    }
  }

  async function init() {
    try {
      console.log('🔄 User Role: Initializing...');
      
      await loadServices();
      
      wireTitleBar();
      wireActionButtons();
      wireTableActionButtons();
      wireAllBranchesCheckbox();
      wireBranchSearch();
      disableAllFields();
      
      // Only fetch data if services loaded successfully
      if (UserService) {
        // await fetchRoles();
        await fetchUserRoles();
      }
      
      console.log('✅ User Role: Initialization complete');
    } catch (error) {
      console.error('❌ User Role: Initialization error:', error);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();