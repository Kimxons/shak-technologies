// Client Limit Verification - Kairo Banking Application

// ========== STATE MANAGEMENT ==========
let currentRecord = null;
let isVerified = false;
let branchMap = {}; // Cache for branch lookups

let statusHideTimer = null;

let branchLookupModal = null;
let applicationLookupModal = null;

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
  initializeForm();
  setupEventListeners();
  enableActionButtons();
  loadWorkflowTypeId();

  wireCollapsibleSections();

  initializeLookupModals();
  preloadServices();
});

function wireCollapsibleSections() {
  document.querySelectorAll('.form-section[data-section]').forEach(section => {
    const header = section.querySelector('[data-section-toggle]');
    const content = section.querySelector('[data-section-content]');
    const toggleBtn = section.querySelector('.section-toggle-btn');

    if (!header || !content) return;

    header.addEventListener('click', function(e) {
      // Don't toggle if clicking on a button (except the toggle button itself)
      if (e.target.closest('button') && !e.target.closest('.section-toggle-btn')) return;

      const isCollapsed = section.classList.contains('collapsed');
      if (isCollapsed) {
        section.classList.remove('collapsed');
        if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
      } else {
        section.classList.add('collapsed');
        if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
      }
    });
  });
}

function preloadServices() {
  try {
    const loader = window.ServiceLoader;
    if (!loader) return;
    Promise.allSettled([
      loader.loadLookupService?.(),
      loader.loadApplicationSearchService?.(),
    ]).catch(() => undefined);
  } catch {
    // ignore
  }
}

function getBootstrapModal(modalElement) {
  const ModalCtor = window.bootstrap?.Modal;
  if (!ModalCtor || !modalElement) return null;
  return typeof ModalCtor.getOrCreateInstance === 'function'
    ? ModalCtor.getOrCreateInstance(modalElement)
    : new ModalCtor(modalElement);
}

function initializeLookupModals() {
  branchLookupModal = getBootstrapModal(document.getElementById('branchLookupModal'));
  applicationLookupModal = getBootstrapModal(document.getElementById('applicationLookupModal'));

  const branchModalEl = document.getElementById('branchLookupModal');
  if (branchModalEl) {
    const form = branchModalEl.querySelector('[data-lookup-form]');
    const resetBtn = branchModalEl.querySelector('[data-lookup-reset]');
    const resultsBody = branchModalEl.querySelector('[data-lookup-results]');

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await performBranchLookupSearch();
    });

    resetBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      resetLookupModal(branchModalEl);
    });

    resultsBody?.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-select-branch]');
      if (!btn) return;
      selectBranch(btn.dataset.branchId || '', btn.dataset.branchName || '');
      branchLookupModal?.hide();
    });
  }

  const appModalEl = document.getElementById('applicationLookupModal');
  if (appModalEl) {
    const form = appModalEl.querySelector('[data-lookup-form]');
    const resetBtn = appModalEl.querySelector('[data-lookup-reset]');
    const resultsBody = appModalEl.querySelector('[data-lookup-results]');

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await performApplicationLookupSearch();
    });

    resetBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      resetLookupModal(appModalEl);
    });

    resultsBody?.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-select-application]');
      if (!btn) return;
      const appId = btn.dataset.applicationId || '';
      const clientId = btn.dataset.clientId || '';
      if (appId) {
        document.getElementById('applicationId').value = appId;
        document.getElementById('clientId').value = clientId;
        loadApplicationDetails(appId, clientId);
      }
      applicationLookupModal?.hide();
    });
  }
}

function resetLookupModal(modalEl) {
  if (!modalEl) return;
  modalEl.querySelectorAll('[data-lookup-field]').forEach((input) => {
    input.value = '';
  });
  const resultsBody = modalEl.querySelector('[data-lookup-results]');
  if (resultsBody) resultsBody.innerHTML = '';
  showLookupLoading(modalEl, false);
  showLookupEmpty(modalEl, true, 'Enter at least one filter above and click Search.');
}

function showLookupLoading(modalEl, isLoading) {
  const loading = modalEl?.querySelector('[data-lookup-loading]');
  if (!loading) return;
  loading.classList.toggle('d-none', !isLoading);
}

function showLookupEmpty(modalEl, isEmpty, message) {
  const empty = modalEl?.querySelector('[data-lookup-empty]');
  if (!empty) return;
  if (typeof message === 'string') empty.textContent = message;
  empty.classList.toggle('d-none', !isEmpty);
}

function collectLookupFilters(modalEl) {
  const filters = {};
  modalEl?.querySelectorAll('[data-lookup-field]').forEach((input) => {
    const fieldName = input.getAttribute('data-lookup-field');
    const value = input.value.trim();
    const modeSelect = modalEl.querySelector(`[data-lookup-mode="${fieldName}"]`);
    const mode = modeSelect ? modeSelect.value : 'Like';
    if (value) {
      filters[fieldName] = { value, mode };
    }
  });
  return filters;
}

function hasAtLeastOneFilter(filters) {
  return Object.keys(filters || {}).length > 0;
}

function initializeForm() {
  // Clear all fields on initialization
  clearForm();
  
  // Load current user's branch
  loadUserBranch();
}

function loadUserBranch() {
  // Auto-populate branch from session
  const branchId = getCurrentBranchId();
  const branchName = getCurrentBranchName();
  
  document.getElementById('branchId').value = branchId;
  document.getElementById('branchName').value = branchName;
  
  // Cache the current branch
  branchMap[branchId] = branchName;
  
  showStatus('Branch loaded from session', 'success');
}

function loadWorkflowTypeId() {
  // This would typically come from a configuration or API
  // Leaving blank to be populated dynamically
  document.getElementById('workflowTypeId').value = '';
}

function setupEventListeners() {
  // Form submit prevention
  document.getElementById('clientLimitVerificationForm').addEventListener('submit', function(e) {
    e.preventDefault();
  });

  // Auto-populate fields when application is selected
  document.getElementById('applicationId').addEventListener('blur', function() {
    if (this.value.trim()) {
      loadApplicationDetails(this.value.trim());
    }
  });

  // Branch lookup on branchId input (LC/PO pattern)
  const branchIdInput = document.getElementById('branchId');
  const branchNameInput = document.getElementById('branchName');
  
  if (branchIdInput && branchNameInput) {
    // Auto-populate branch name on blur
    branchIdInput.addEventListener('blur', fetchBranchName);
    
    // Also trigger on Tab key
    branchIdInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Tab' && branchIdInput.value.trim()) {
        await fetchBranchName();
      }
    });
  }

  // Setup search button click handlers
  document.querySelectorAll('[data-lookup]').forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      const lookupType = this.getAttribute('data-lookup');
      handleLookup(lookupType);
    });
  });
}

// ========== SEARCH FUNCTIONS ==========

/**
 * Get current user's branch ID from session
 * @returns {string} Branch ID
 */
function getCurrentBranchId() {
  const nimbleSessionStr = localStorage.getItem('nimble_auth_session');
  const nimbleSession = JSON.parse(nimbleSessionStr || '{}');
  return nimbleSession.branchID || nimbleSession.branchId || '000';
}

/**
 * Get current user's branch name from session
 * @returns {string} Branch name
 */
function getCurrentBranchName() {
  const nimbleSessionStr = localStorage.getItem('nimble_auth_session');
  const nimbleSession = JSON.parse(nimbleSessionStr || '{}');
  return nimbleSession.branchName || 'HEAD OFFICE-ADMIN';
}

/**
 * Fetch and populate branch name when branchId is entered (LC/PO pattern)
 */
async function fetchBranchName() {
  const branchIdInput = document.getElementById('branchId');
  const branchNameInput = document.getElementById('branchName');
  
  if (!branchIdInput || !branchNameInput) return;
  
  const branchId = branchIdInput.value.trim();
  
  if (!branchId) {
    branchNameInput.value = '';
    return;
  }

  // Check if it's the current user's branch
  if (branchId === getCurrentBranchId()) {
    branchNameInput.value = getCurrentBranchName();
    return;
  }

  // Check cache first
  if (branchMap[branchId]) {
    branchNameInput.value = branchMap[branchId];
    return;
  }

  // Fetch from API using tradeFinanceService pattern
  try {
    // Ensure service is available
    if (!window.LookupService && !window.tradeFinanceService) {
      console.error('[ClientLimitVerification] No branch lookup service available');
      return;
    }

    let response;
    
    // Try tradeFinanceService first (matches LC/PO pattern)
    if (window.tradeFinanceService?.searchBranches) {
      response = await window.tradeFinanceService.searchBranches({
        BankID: "00" // Get all branches
      });
    } 
    // Fallback to LookupService
    else if (window.LookupService?.getBranches) {
      response = await window.LookupService.getBranches({ BankID: "00" });
    }

    console.log('[ClientLimitVerification] Branch lookup response:', response);

    // Extract branches array from response
    let branches = [];
    if (Array.isArray(response)) {
      branches = response;
    } else if (Array.isArray(response?.data)) {
      branches = response.data;
    } else if (Array.isArray(response?.Details)) {
      branches = response.Details;
    }

    console.log('[ClientLimitVerification] Extracted branches count:', branches.length);

    if (branches.length > 0) {
      // Try to match by BranchID or OurBranchID
      const matchedBranch = branches.find(b =>
        b.BranchID === branchId || 
        b.OurBranchID === branchId || 
        b.BranchCode === branchId
      );

      if (matchedBranch) {
        // Try different field names for branch description
        const branchName = matchedBranch.BranchName ||
          matchedBranch.BranchDescription ||
          matchedBranch.Description ||
          matchedBranch.Name ||
          matchedBranch.BranchDesc || "";

        if (branchName) {
          branchNameInput.value = branchName;
          // Cache for future use
          branchMap[branchId] = branchName;
        }
      } else {
        console.warn('[ClientLimitVerification] No matching branch found for ID:', branchId);
        showStatus(`Branch ${branchId} not found`, 'warning');
      }
    } else {
      console.warn('[ClientLimitVerification] No branches returned from API');
    }
  } catch (error) {
    console.error('[ClientLimitVerification] Error looking up branch:', error);
    showStatus('Error loading branch details', 'error');
  }
}

/**
 * Handle lookup button clicks
 * @param {string} lookupType - Type of lookup (branch, application)
 */
function handleLookup(lookupType) {
  console.log('[ClientLimitVerification] Lookup requested:', lookupType);
  
  if (lookupType === 'branch') {
    openBranchSearch();
  } else if (lookupType === 'application') {
    openApplicationSearch();
  } else if (lookupType === 'workflowtype') {
    showStatus('Workflow Type lookup is not configured for this screen yet.', 'info');
  }
}

/**
 * Open branch search modal
 */
function openBranchSearch() {
  const modalEl = document.getElementById('branchLookupModal');
  if (!modalEl || !branchLookupModal) {
    showStatus('Branch search modal not available', 'error');
    return;
  }
  resetLookupModal(modalEl);
  branchLookupModal.show();
}

function escapeAttr(value) {
  return String(value || '').replace(/"/g, '&quot;');
}

async function performBranchLookupSearch() {
  const modalEl = document.getElementById('branchLookupModal');
  if (!modalEl) return;

  const resultsBody = modalEl.querySelector('[data-lookup-results]');
  const filters = collectLookupFilters(modalEl);
  if (!resultsBody) return;

  if (!hasAtLeastOneFilter(filters)) {
    resultsBody.innerHTML = '';
    showLookupEmpty(modalEl, true, 'Enter at least one filter above and click Search.');
    return;
  }

  showLookupEmpty(modalEl, false);
  showLookupLoading(modalEl, true);
  resultsBody.innerHTML = '';

  try {
    if (!window.tradeFinanceService?.searchBranches && !window.LookupService?.getBranches) {
      showLookupEmpty(modalEl, true, 'Branch lookup service not available.');
      return;
    }

    let response;
    if (window.tradeFinanceService?.searchBranches) {
      response = await window.tradeFinanceService.searchBranches({ BankID: '00' });
    } else {
      response = await window.LookupService.getBranches({ BankID: '00' });
    }

    let branches = [];
    if (Array.isArray(response)) {
      branches = response;
    } else if (Array.isArray(response?.data)) {
      branches = response.data;
    } else if (Array.isArray(response?.Details)) {
      branches = response.Details;
    }

    const idFilter = filters.BranchID?.value?.toLowerCase() || '';
    const nameFilter = filters.BranchName?.value?.toLowerCase() || '';
    const idMode = filters.BranchID?.mode || 'Like';
    const nameMode = filters.BranchName?.mode || 'Like';

    if (idFilter) {
      branches = branches.filter((b) => {
        const branchId = (b.OurBranchID || b.BranchID || b.BranchCode || '').toLowerCase();
        return idMode === 'Exact' ? branchId === idFilter : branchId.includes(idFilter);
      });
    }

    if (nameFilter) {
      branches = branches.filter((b) => {
        const branchName = (b.BranchName || b.BranchDescription || b.Description || '').toLowerCase();
        return nameMode === 'Exact' ? branchName === nameFilter : branchName.includes(nameFilter);
      });
    }

    if (!branches.length) {
      showLookupEmpty(modalEl, true, 'No branches matched the supplied filters.');
      return;
    }

    showLookupEmpty(modalEl, false);
    resultsBody.innerHTML = branches.map((branch) => {
      const branchId = branch.OurBranchID || branch.BranchID || '';
      const branchName = branch.BranchName || branch.BranchDescription || branch.Description || '';
      const regionId = branch.RegionID || '';
      return `
        <tr>
          <td>${escapeHtml(branchId)}</td>
          <td>${escapeHtml(branchName)}</td>
          <td>${escapeHtml(regionId)}</td>
          <td class="text-end">
            <button type="button" class="btn btn-sm btn-outline-primary" data-select-branch="1" data-branch-id="${escapeAttr(branchId)}" data-branch-name="${escapeAttr(branchName)}">Select</button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('[ClientLimitVerification] Branch lookup error:', error);
    showLookupEmpty(modalEl, true, error?.message || 'Error loading branches.');
  } finally {
    showLookupLoading(modalEl, false);
  }
}

function openApplicationSearch() {
  const modalEl = document.getElementById('applicationLookupModal');
  if (!modalEl || !applicationLookupModal) {
    showStatus('Application search modal not available', 'error');
    return;
  }
  resetLookupModal(modalEl);
  applicationLookupModal.show();
}

async function performApplicationLookupSearch() {
  const modalEl = document.getElementById('applicationLookupModal');
  if (!modalEl) return;

  const resultsBody = modalEl.querySelector('[data-lookup-results]');
  const filters = collectLookupFilters(modalEl);
  if (!resultsBody) return;

  if (!hasAtLeastOneFilter(filters)) {
    resultsBody.innerHTML = '';
    showLookupEmpty(modalEl, true, 'Enter at least one filter above and click Search.');
    return;
  }

  showLookupEmpty(modalEl, false);
  showLookupLoading(modalEl, true);
  resultsBody.innerHTML = '';

  try {
    const loader = window.ServiceLoader;
    if (loader?.loadApplicationSearchService) {
      await loader.loadApplicationSearchService();
    }

    if (!window.ApplicationSearchService?.searchApplications) {
      showLookupEmpty(modalEl, true, 'ApplicationSearchService not available.');
      return;
    }

    const appVal = filters.ApplicationID?.value || '';
    const clientVal = filters.ClientID?.value || '';
    const appMode = filters.ApplicationID?.mode === 'Exact' ? 'equals' : 'like';
    const clientMode = filters.ClientID?.mode === 'Exact' ? 'equals' : 'like';

    const response = await window.ApplicationSearchService.searchApplications({
      applicationId: appVal ? { value: appVal, operator: appMode } : undefined,
      clientId: clientVal ? { value: clientVal, operator: clientMode } : undefined,
    });

    let results = response?.Details || response?.data?.Details || response?.data || [];
    if (!Array.isArray(results)) results = results ? [results] : [];

    if (!results.length) {
      showLookupEmpty(modalEl, true, 'No applications matched the supplied filters.');
      return;
    }

    showLookupEmpty(modalEl, false);
    resultsBody.innerHTML = results.map((item) => {
      const applicationId = item.ApplicationID || item.ApplicationId || item.WFLoanIndvAppID || '';
      const clientId = item.ClientID || item.ClientId || '';
      const productId = item.ProductID || item.ProductId || '';
      return `
        <tr>
          <td>${escapeHtml(applicationId)}</td>
          <td>${escapeHtml(clientId)}</td>
          <td>${escapeHtml(productId)}</td>
          <td class="text-end">
            <button type="button" class="btn btn-sm btn-outline-primary" data-select-application="1" data-application-id="${escapeAttr(applicationId)}" data-client-id="${escapeAttr(clientId)}">Select</button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('[ClientLimitVerification] Application lookup error:', error);
    showLookupEmpty(modalEl, true, error?.message || 'Error loading applications.');
  } finally {
    showLookupLoading(modalEl, false);
  }
}

/**
 * Select a branch from search results
 * @param {string} branchId - Selected branch ID
 * @param {string} branchName - Selected branch name
 */
function selectBranch(branchId, branchName) {
  // Populate form fields
  document.getElementById('branchId').value = branchId;
  document.getElementById('branchName').value = branchName;
  
  // Cache the selection
  branchMap[branchId] = branchName;
  
  // Show success message
  showStatus(`Branch ${branchId} selected`, 'success');
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function searchBranch() {
  showStatus('Searching for branch...', 'info');
  
  // In a real application, this would open a branch search modal
  // For demonstration, simulating a branch selection
  setTimeout(() => {
    // Simulate branch selection
    const sampleBranches = [
      { id: '0101', name: 'Head Office' },
      { id: '0102', name: 'Nairobi Branch' },
      { id: '0103', name: 'Mombasa Branch' }
    ];
    
    // For now, just show the message
    showStatus('Branch search dialog would open here', 'info');
    
    // In production, a modal would open and user would select
    // Then populate: document.getElementById('branchId').value and document.getElementById('branchName').value
  }, 500);
}

function searchApplication() {
  const applicationId = document.getElementById('applicationId').value.trim();
  
  if (!applicationId) {
    showStatus('Please enter an Application ID', 'error');
    return;
  }
  
  showStatus('Searching for application...', 'info');
  
  // Simulate API call to search application
  setTimeout(() => {
    loadApplicationDetails(applicationId);
  }, 500);
}

function loadApplicationDetails(applicationId, clientIdOverride) {
  // In a real application, this would be an API call
  // Simulating the response
  showStatus('Loading application details...', 'info');
  
  // Simulate API call
  setTimeout(() => {
    // Sample data - in production this comes from API
    const applicationData = {
      applicationId: applicationId,
      clientId: clientIdOverride || ('CL' + applicationId.substring(0, 6)),
      applicationDate: formatDate(new Date()),
      loanType: 'Term Loan',
      createdBy: 'ADMIN001',
      createdOn: formatDateTime(new Date(Date.now() - 86400000)), // Yesterday
      workflowTypeId: '7240'
    };
    
    // Populate form fields
    populateApplicationData(applicationData);
    
    showStatus('Application details loaded successfully', 'success');
  }, 800);
}

function populateApplicationData(data) {
  if (data.clientId) {
    document.getElementById('clientId').value = data.clientId;
  }
  
  if (data.applicationDate) {
    document.getElementById('applicationDate').value = data.applicationDate;
  }
  
  if (data.loanType) {
    document.getElementById('loanType').value = data.loanType;
  }
  
  if (data.createdBy) {
    document.getElementById('createdBy').value = data.createdBy;
  }
  
  if (data.createdOn) {
    document.getElementById('createdOn').value = data.createdOn;
  }
  
  if (data.workflowTypeId) {
    document.getElementById('workflowTypeId').value = data.workflowTypeId;
  }
  
}

// ========== ACTION FUNCTIONS ==========
function handleView() {
  const applicationId = document.getElementById('applicationId').value.trim();
  
  if (!applicationId) {
    showStatus('Please enter an Application ID to view', 'error');
    return;
  }
  
  showStatus('View mode activated', 'info');
  disableFields();
  isVerified = false;
  
  // Load the application details
  loadApplicationDetails(applicationId);
}

function handleVerify() {
  if (!validateForm()) {
    showStatus('Please fill all required fields before verifying', 'error');
    return;
  }
  
  if (isVerified) {
    showStatus('This application has already been verified', 'warning');
    return;
  }
  
  if (!confirm('Are you sure you want to verify this client limit application?')) {
    return;
  }
  
  showStatus('Verifying client limit application...', 'info');
  
  // Simulate API call for verification
  setTimeout(() => {
    const now = formatDateTime(new Date());
    const currentUser = 'VERIFIER001'; // In production, get from session
    
    document.getElementById('verifiedBy').value = currentUser;
    document.getElementById('verifiedOn').value = now;
    
    isVerified = true;
    
    showStatus('Client limit application verified successfully', 'success');
    
    // Optionally disable form after verification
    disableFields();
  }, 1000);
}

function handleCancel() {
  if (confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
    clearForm();
    isVerified = false;
    showStatus('Form cleared', 'info');
  }
}

function handleClose() {
  if (currentRecord && !isVerified) {
    if (!confirm('You have unverified data. Are you sure you want to close?')) {
      return;
    }
  }
  
  // Close the window/form
  if (window.opener) {
    window.close();
  } else {
    // If opened in iframe or modal, post message to parent
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ action: 'closeModal' }, '*');
    } else {
      // Redirect to dashboard or previous page
      window.history.back();
    }
  }
}

// ========== FORM MANAGEMENT ==========
function enableFields() {
  const form = document.getElementById('clientLimitVerificationForm');
  const inputs = form.querySelectorAll('input:not([readonly])');
  
  inputs.forEach(input => {
    input.disabled = false;
  });
  
  // Enable search buttons
  const searchButtons = form.querySelectorAll('.btn-lookup');
  searchButtons.forEach(btn => {
    btn.disabled = false;
  });
}

function disableFields() {
  const form = document.getElementById('clientLimitVerificationForm');
  const inputs = form.querySelectorAll('input:not([readonly])');
  
  inputs.forEach(input => {
    // Only disable non-readonly fields that are not search fields
    if (!input.readOnly && input.id !== 'branchId' && input.id !== 'applicationId') {
      input.disabled = true;
    }
  });
}

function enableActionButtons() {
  // Enable all action buttons (View, Verify, Cancel, Close)
  const actionButtons = document.querySelectorAll('.btn-action');
  actionButtons.forEach(btn => {
    btn.disabled = false;
  });
}

function clearForm() {
  const form = document.getElementById('clientLimitVerificationForm');
  form.reset();
  
  // Clear all fields explicitly
  document.getElementById('branchId').value = '';
  document.getElementById('branchName').value = '';
  document.getElementById('workflowTypeId').value = '';
  document.getElementById('workflowTypeName').value = '';
  document.getElementById('applicationId').value = '';
  document.getElementById('clientId').value = '';
  document.getElementById('applicationDate').value = '';
  
  // Clear Behind The Scene fields
  document.getElementById('loanType').value = '';
  document.getElementById('createdBy').value = '';
  document.getElementById('createdOn').value = '';
  document.getElementById('verifiedBy').value = '';
  document.getElementById('verifiedOn').value = '';
  
  currentRecord = null;
  isVerified = false;
}

function validateForm() {
  const branchId = document.getElementById('branchId').value.trim();
  const applicationId = document.getElementById('applicationId').value.trim();
  const clientId = document.getElementById('clientId').value.trim();
  
  if (!branchId) {
    showStatus('Branch ID is required', 'error');
    return false;
  }
  
  if (!applicationId) {
    showStatus('Application ID is required', 'error');
    return false;
  }
  
  if (!clientId) {
    showStatus('Client ID is required', 'error');
    return false;
  }
  
  return true;
}

// ========== UTILITY FUNCTIONS ==========
function formatDate(date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${day} ${month} ${year}`;
}

function formatDateTime(date) {
  const formattedDate = formatDate(date);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${formattedDate} ${hours}:${minutes}`;
}

// ========== STATUS MESSAGES ==========
function showStatus(message, type = 'info') {
  const statusDiv = document.getElementById('statusMessage');
  if (!statusDiv) return;

  const bsType = (() => {
    switch (type) {
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'danger';
      case 'info':
      default:
        return 'info';
    }
  })();

  statusDiv.textContent = message;
  statusDiv.classList.remove('d-none');

  // Remove any previous alert-* type classes
  statusDiv.classList.remove('alert-success', 'alert-warning', 'alert-danger', 'alert-info');
  statusDiv.classList.add('alert', `alert-${bsType}`);

  if (statusHideTimer) {
    clearTimeout(statusHideTimer);
  }

  statusHideTimer = setTimeout(() => {
    statusDiv.classList.add('d-none');
  }, 3500);
}

// ========== KEYBOARD SHORTCUTS ==========
document.addEventListener('keydown', function(e) {
  // Ctrl+V for Verify
  if (e.ctrlKey && e.key === 'v') {
    e.preventDefault();
    handleVerify();
  }
  
  // Escape to Cancel
  if (e.key === 'Escape') {
    handleCancel();
  }
  
  // F5 for View (prevent default refresh)
  if (e.key === 'F5') {
    e.preventDefault();
    handleView();
  }
});

// ========== API INTEGRATION HELPERS ==========
// These would be used in production to interact with backend

/**
 * Fetch application details from API
 * @param {string} applicationId - The application ID to fetch
 * @returns {Promise<Object>} Application data
 */
async function fetchApplicationFromAPI(applicationId) {
  try {
    // Example API call structure
    // const response = await fetch(`/api/limits/applications/${applicationId}`);
    // const data = await response.json();
    // return data;
    
    // For now, return mock data
    return {
      applicationId: applicationId,
      clientId: 'CL' + applicationId.substring(0, 6),
      applicationDate: formatDate(new Date()),
      loanType: 'Term Loan',
      createdBy: 'ADMIN001',
      createdOn: formatDateTime(new Date(Date.now() - 86400000)),
      workflowTypeId: '7240'
    };
  } catch (error) {
    console.error('Error fetching application:', error);
    showStatus('Error loading application details', 'error');
    return null;
  }
}

/**
 * Submit verification to API
 * @param {Object} verificationData - The verification data to submit
 * @returns {Promise<boolean>} Success status
 */
async function submitVerificationToAPI(verificationData) {
  try {
    // Example API call structure
    // const response = await fetch('/api/limits/verify', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(verificationData)
    // });
    // const result = await response.json();
    // return result.success;
    
    // For now, simulate success
    return true;
  } catch (error) {
    console.error('Error submitting verification:', error);
    showStatus('Error submitting verification', 'error');
    return false;
  }
}
