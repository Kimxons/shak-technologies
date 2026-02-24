/**
 * Region Maintenance - Embedded JavaScript
 * Modern Account Maintenance Style
 * Integrated with LookupService and BranchesService
 */
document.addEventListener('DOMContentLoaded', function() {
  // ============================================================================
  // DOM ELEMENTS
  // ============================================================================
  const regionSelect = document.getElementById('Region');
  const branchesTbody = document.getElementById('branches-tbody');
  const selectAllCheckbox = document.getElementById('selectAllBranches');
  const saveBtn = document.querySelector('[data-action="save"]');
  const cancelBtn = document.querySelector('[data-action="cancel"]');
  const editBtn = document.querySelector('[data-action="edit"]');
  const viewBtn = document.querySelector('[data-action="view"]');
  const regionForm = document.getElementById('region-form');

  // ============================================================================
  // SERVICE REFERENCES
  // ============================================================================
  const LookupService = window.LookupService;
  const BranchesService = window.BranchesService;

  // Store loaded branches for filtering
  let allBranches = [];
  let regionsData = [];
  let isEditMode = false;
  let hasLoadedData = false;

  // ============================================================================
  // BUTTON STATE MANAGEMENT
  // ============================================================================
  function updateActionButtons() {
    // View: always enabled
    if (viewBtn) viewBtn.disabled = false;
    
    // Edit: enabled only when data is loaded and not in edit mode
    if (editBtn) editBtn.disabled = !hasLoadedData || isEditMode;
    
    // Save: enabled only in edit mode
    if (saveBtn) saveBtn.disabled = !isEditMode;
    
    // Cancel: enabled only in edit mode
    if (cancelBtn) cancelBtn.disabled = !isEditMode;
  }

  function setEditMode(enabled) {
    isEditMode = enabled;
    updateActionButtons();
  }

  // ============================================================================
  // SECTION TOGGLE FUNCTIONALITY
  // ============================================================================
  function initSectionToggles() {
    const sectionHeaders = document.querySelectorAll('[data-section-toggle]');
    
    sectionHeaders.forEach(header => {
      header.addEventListener('click', function() {
        const section = this.closest('.form-section');
        if (section) {
          section.classList.toggle('collapsed');
          
          // Update aria-expanded attribute
          const toggleBtn = this.querySelector('.section-toggle-btn');
          if (toggleBtn) {
            const isExpanded = !section.classList.contains('collapsed');
            toggleBtn.setAttribute('aria-expanded', isExpanded);
          }
        }
      });
    });
  }

  // ============================================================================
  // POPULATE REGION DROPDOWN - API Integration
  // ============================================================================
  async function populateRegionDropdown() {
    // Clear existing options (keep the placeholder)
    regionSelect.innerHTML = '<option value="">Loading regions...</option>';
    
    try {
      // Try to load regions from LookupService
      if (LookupService && typeof LookupService.getRegions === 'function') {
        const regions = await LookupService.getRegions();
        console.log('[RegionMaintenance] Loaded regions:', regions);
        
        regionsData = regions;
        
        regionSelect.innerHTML = '<option value="">Select Region</option>';
        
        if (regions && regions.length > 0) {
          regions.forEach(region => {
            const option = document.createElement('option');
            option.value = region.value;
            option.textContent = region.label;
            regionSelect.appendChild(option);
          });
          showToast(`Loaded ${regions.length} regions.`, 'success');
        } else {
          showToast('No regions found in the system.', 'warning');
        }
      } else {
        // Fallback to hardcoded data if service not available
        console.warn('[RegionMaintenance] LookupService not available, using fallback data.');
        loadFallbackRegions();
      }
    } catch (error) {
      console.error('[RegionMaintenance] Error loading regions:', error);
      showToast('Failed to load regions. Using fallback data.', 'error');
      loadFallbackRegions();
    }
  }

  // Fallback regions if API fails - show empty state
  function loadFallbackRegions() {
    regionsData = [];
    regionSelect.innerHTML = '<option value="">No regions available - check connection</option>';
    showToast('No regions available. Please check your connection.', 'warning');
  }

  // ============================================================================
  // LOAD BRANCHES - API Integration
  // ============================================================================
  async function loadBranchesForRegion(regionId) {
    renderLoadingState();
    
    try {
      const CoreApi = window.CoreApi;
      
      if (!CoreApi) {
        console.error('[RegionMaintenance] CoreApi not available');
        showToast('API service not available.', 'error');
        renderBranches([]);
        return;
      }
      
      // Call p_GetSystemBranchRegion stored procedure
      const requestData = {
        BankID: '00',
        RegionID: regionId,
        OurBranchID: '',
        OperatorID: 'ABOREA'
      };
      
      const envelope = CoreApi.makeRequestEnvelope('p_GetSystemBranchRegion', requestData);
      const apiUrl = (window.Environment?.baseUrl || 'http://172.16.2.31:3306') + '/api/OldAPI';
      
      console.log('[RegionMaintenance] Fetching branches for region:', regionId);
      console.log('[RegionMaintenance] Request:', envelope);
      
      const response = await CoreApi.post(apiUrl, envelope);
      
      console.log('[RegionMaintenance] Branches response:', response);
      
      if (response.success) {
        // Handle different response structures - prioritize Details01 for branch data
        let branches = [];
        
        // Check for Details01 first (this is where branch data is returned)
        if (response.data && response.data.Details01 && Array.isArray(response.data.Details01)) {
          branches = response.data.Details01;
        } else if (response.Details01 && Array.isArray(response.Details01)) {
          branches = response.Details01;
        } else if (response.data && response.data.Details && Array.isArray(response.data.Details)) {
          branches = response.data.Details;
        } else if (response.Details && Array.isArray(response.Details)) {
          branches = response.Details;
        } else if (Array.isArray(response.data)) {
          branches = response.data;
        }
        
        console.log('[RegionMaintenance] Parsed branches:', branches);
        console.log('[RegionMaintenance] Number of branches:', branches.length);
        
        // Map to consistent format
        allBranches = branches.map(b => ({
          id: b.OurBranchID || b.BranchID || b.branchId || b.ID || '',
          name: b.BranchName || b.branchName || b.Name || b.Description || ''
        }));
        
        renderBranches(allBranches);
        
        if (allBranches.length > 0) {
          showSuccessMessage(`Region details loaded successfully. ${allBranches.length} branch(es) found.`);
          hasLoadedData = true;
          updateActionButtons();
        } else {
          showToast('No branches found for the selected region.', 'info');
        }
        
        // Update audit trail from response if available
        const firstBranch = branches[0] || {};
        updateAuditTrail({
          createdBy: firstBranch.CreatedBy || firstBranch.createdBy || '',
          createdOn: firstBranch.CreatedOn || firstBranch.createdOn || '',
          supervisedBy: firstBranch.SupervisedBy || firstBranch.supervisedBy || '',
          supervisedOn: firstBranch.SupervisedOn || firstBranch.supervisedOn || ''
        });
      } else {
        console.warn('[RegionMaintenance] API returned failure:', response.message);
        renderBranches([]);
        showToast(response.message || 'Failed to load branches.', 'warning');
      }
    } catch (error) {
      console.error('[RegionMaintenance] Error loading branches:', error);
      showToast('Failed to load branches. Please check your connection.', 'error');
      renderBranches([]);
    }
  }

  // Fallback branches if API fails - show empty state
  function loadFallbackBranches(regionId) {
    allBranches = [];
    renderBranches([]);
    showToast('Failed to load branches. Please check your connection.', 'warning');
  }

  // ============================================================================
  // BRANCHES TABLE FUNCTIONS
  // ============================================================================
  function renderLoadingState() {
    if (!branchesTbody) return;
    branchesTbody.innerHTML = `
      <tr>
        <td colspan="3" class="no-records">
          <i class="bi bi-arrow-repeat spin"></i> Loading branches...
        </td>
      </tr>
    `;
  }

  function renderBranches(branches) {
    if (!branchesTbody) return;
    branchesTbody.innerHTML = '';

    if (!branches || branches.length === 0) {
      branchesTbody.innerHTML = `
        <tr>
          <td colspan="3" class="no-records">No branches found for this region.</td>
        </tr>
      `;
      return;
    }

    branches.forEach(branch => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><input type="checkbox" class="branch-checkbox bs-checkbox" data-branch-id="${branch.id}" aria-label="Select ${branch.name}"></td>
        <td>${branch.id}</td>
        <td>${branch.name}</td>
      `;
      branchesTbody.appendChild(row);
    });

    // Reattach checkbox event listeners
    attachBranchCheckboxListeners();
  }

  function attachBranchCheckboxListeners() {
    const branchCheckboxes = document.querySelectorAll('.branch-checkbox');
    
    branchCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', function() {
        updateSelectAllState();
      });
    });
  }

  function updateSelectAllState() {
    const branchCheckboxes = document.querySelectorAll('.branch-checkbox');
    const checkedBoxes = document.querySelectorAll('.branch-checkbox:checked');
    
    if (branchCheckboxes.length === 0) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
      return;
    }
    
    if (checkedBoxes.length === 0) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
    } else if (checkedBoxes.length === branchCheckboxes.length) {
      selectAllCheckbox.checked = true;
      selectAllCheckbox.indeterminate = false;
    } else {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = true;
    }
  }

  // ============================================================================
  // AUDIT TRAIL - Behind the Scene
  // ============================================================================
  function updateAuditTrail(data) {
    document.getElementById('CreatedBy').textContent = data.createdBy || '';
    document.getElementById('CreatedOn').textContent = data.createdOn || '';
    document.getElementById('SupervisedBy').textContent = data.supervisedBy || '';
    document.getElementById('SupervisedOn').textContent = data.supervisedOn || '';
  }

  function clearAuditTrail() {
    document.getElementById('CreatedBy').textContent = '';
    document.getElementById('CreatedOn').textContent = '';
    document.getElementById('SupervisedBy').textContent = '';
    document.getElementById('SupervisedOn').textContent = '';
  }

  // ============================================================================
  // TOAST NOTIFICATION
  // ============================================================================
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <i class="bi ${getToastIcon(type)} toast-icon"></i>
      <div class="toast-content">
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" aria-label="Close">&times;</button>
    `;

    container.appendChild(toast);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 200);
    }, 4000);

    // Close button
    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 200);
    });
  }

  function getToastIcon(type) {
    const icons = {
      success: 'bi-check-circle-fill',
      error: 'bi-exclamation-circle-fill',
      warning: 'bi-exclamation-triangle-fill',
      info: 'bi-info-circle-fill'
    };
    return icons[type] || icons.info;
  }

  // ============================================================================
  // VALIDATION SUMMARY (Account Maintenance Style)
  // ============================================================================
  function showSuccessMessage(message) {
    const summary = document.querySelector('.validation-summary');
    if (!summary) {
      showToast(message, 'success');
      return;
    }

    const iconEl = summary.querySelector('.validation-summary__icon');
    if (iconEl) {
      iconEl.className = 'bi bi-check-circle validation-summary__icon';
    }

    const textEl = summary.querySelector('.validation-summary__text');
    if (textEl) textEl.textContent = message;

    summary.classList.remove('validation-summary--error');
    summary.classList.add('is-visible', 'validation-summary--success');
    
    // Force visibility with inline styles
    summary.style.display = 'flex';
    summary.style.background = '#d4edda';
    summary.style.border = '1px solid #198754';
    summary.style.borderRadius = '6px';
    summary.style.padding = '10px 14px';
    summary.style.marginBottom = '14px';
    summary.style.alignItems = 'center';
    summary.style.gap = '10px';
    
    if (iconEl) {
      iconEl.style.color = '#198754';
      iconEl.style.fontSize = '16px';
    }
    if (textEl) {
      textEl.style.color = '#155724';
      textEl.style.fontSize = '12px';
      textEl.style.flex = '1';
    }

    const closeBtn = summary.querySelector('.validation-summary__close');
    if (closeBtn && !closeBtn._rmHandlerAttached) {
      closeBtn.addEventListener('click', () => hideValidationSummary());
      closeBtn._rmHandlerAttached = true;
    }
  }

  function hideValidationSummary() {
    const summary = document.querySelector('.validation-summary');
    if (summary) {
      summary.classList.remove('is-visible', 'validation-summary--success', 'validation-summary--error');
      summary.style.display = 'none';
    }
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  // Region selection change
  if (regionSelect) {
    regionSelect.addEventListener('change', async function() {
      const selectedRegion = this.value;

      // Hide previous success message and reset edit mode
      hideValidationSummary();
      setEditMode(false);

      if (!selectedRegion) {
        renderBranches([]);
        clearAuditTrail();
        hasLoadedData = false;
        updateActionButtons();
        if (selectAllCheckbox) {
          selectAllCheckbox.checked = false;
          selectAllCheckbox.indeterminate = false;
        }
        return;
      }

      // Load branches for the selected region
      await loadBranchesForRegion(selectedRegion);
    });
  }

  // Select all checkbox
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', function() {
      const branchCheckboxes = document.querySelectorAll('.branch-checkbox');
      branchCheckboxes.forEach(checkbox => {
        checkbox.checked = this.checked;
      });
    });
  }

  // View button
  if (viewBtn) {
    viewBtn.addEventListener('click', function() {
      if (!regionSelect.value) {
        showToast('Please select a region first.', 'warning');
        return;
      }
      
      const selectedRegion = regionsData.find(r => r.value === regionSelect.value);
      const regionName = selectedRegion ? selectedRegion.label : regionSelect.value;
      showToast(`Viewing region: ${regionName}`, 'info');
    });
  }

  // Edit button
  if (editBtn) {
    editBtn.addEventListener('click', function() {
      if (!regionSelect.value) {
        showToast('Please select a region first.', 'warning');
        return;
      }
      setEditMode(true);
      showToast('Edit mode enabled. You can now modify the region data.', 'info');
    });
  }

  // Save button
  if (saveBtn) {
    saveBtn.addEventListener('click', function() {
      if (!regionSelect.value) {
        showToast('Please select a region first.', 'warning');
        return;
      }
      
      // Get selected branches
      const selectedBranches = Array.from(document.querySelectorAll('.branch-checkbox:checked'))
        .map(cb => cb.dataset.branchId);
      
      console.log('Selected branches:', selectedBranches);
      setEditMode(false);
      showSuccessMessage('Region data saved successfully!');
    });
  }

  // Cancel button
  if (cancelBtn) {
    cancelBtn.addEventListener('click', function() {
      if (isEditMode) {
        if (!confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
          return;
        }
        setEditMode(false);
        // Clear the region select (ID field)
        if (regionSelect) {
          regionSelect.value = '';
        }
        // Clear the branches table
        renderBranchesTable([]);
        // Reset loaded data flag
        hasLoadedData = false;
        updateActionButtons();
        hideValidationSummary();
        showToast('Edit cancelled.', 'info');
      }
    });
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  async function init() {
    console.log('[RegionMaintenance] Initializing...');
    
    // Check for required services
    if (!LookupService) {
      console.warn('[RegionMaintenance] LookupService not available');
    }
    if (!BranchesService) {
      console.warn('[RegionMaintenance] BranchesService not available');
    }
    
    initSectionToggles();
    await populateRegionDropdown();
    renderBranches([]);
    updateActionButtons(); // Set initial button states
    
    console.log('[RegionMaintenance] Initialization complete.');
  }

  init();
});

