(async function() {
  'use strict';

  // Load required services
  const { ServiceLoader } = window;
  await ServiceLoader.loadCore();
  await ServiceLoader.loadBranchService();
  await ServiceLoader.loadCenterService();
  await ServiceLoader.loadGroupCollectionService();
  await ServiceLoader.loadTillService();
  await ServiceLoader.loadSearchService();
  await ServiceLoader.loadLookupService();

  const BranchService = window.BranchService;
  const CenterService = window.CenterService;
  const GroupCollectionService = window.GroupCollectionService;
  const TillService = window.TillService;
  const SearchService = window.SearchService;
  const LookupService = window.LookupService;
  const Environment = window.Environment;

  // Store all branch data for filtering
  let allBranches = [];
  let allCenters = [];
  
  // Track current mode (add or edit)
  let currentMode = null; // 'add' or 'edit'

  // DOM Elements
  let formElements = {
    branchIdField: null,
    branchNameField: null,
    centerIdField: null,
    centerNameField: null,
    creditOfficerIdField: null,
    creditOfficerNameField: null,
    serialIdField: null,
    selectAllCheckbox: null,
    projectionDetailsBody: null,
    totalExpectedField: null,
    totalReceivedField: null,
    valueDateField: null,
    tillField: null,
    tillIdField: null,
    transactionTypeSelect: null,
    refField: null,
    centerCollectionAcctIdField: null,
    centerCollectionAcctNameField: null,
    contraAccountIdField: null,
    contraAccountNameField: null,
    narrationField: null,
    savingBalanceField: null,
    memberField: null,
    osLoanBalanceField: null,
    netBalanceField: null,
    savingOsLoanPctField: null,
    totalLoanAmountField: null,
    createdByField: null,
    supervisedByField: null,
    createdOnField: null,
    supervisedOnField: null,
    viewAllBtn: null,
    printBtn: null,
    denominationBtn: null,
    viewBtn: null,
    addBtn: null,
    editBtn: null,
    deleteBtn: null,
    saveBtn: null,
    cancelBtn: null
  };

  /**
   * Initialize form elements
   */
  function initializeElements() {
    formElements.branchIdField = document.getElementById('branchIdField');
    formElements.branchNameField = document.getElementById('branchNameField');
    formElements.centerIdField = document.getElementById('centerIdField');
    formElements.centerNameField = document.getElementById('centerNameField');
    formElements.creditOfficerIdField = document.getElementById('creditOfficerIdField');
    formElements.creditOfficerNameField = document.getElementById('creditOfficerNameField');
    formElements.serialIdField = document.getElementById('serialIdField');
    formElements.selectAllCheckbox = document.getElementById('selectAllCheckbox');
    formElements.projectionDetailsBody = document.getElementById('projectionDetailsBody');
    formElements.totalExpectedField = document.getElementById('totalExpectedField');
    formElements.totalReceivedField = document.getElementById('totalReceivedField');
    formElements.valueDateField = document.getElementById('valueDateField');
    formElements.tillField = document.getElementById('tillField');
    formElements.tillIdField = document.getElementById('tillIdField');
    formElements.transactionTypeSelect = document.getElementById('transactionTypeSelect');
    formElements.refField = document.getElementById('refField');
    formElements.centerCollectionAcctIdField = document.getElementById('centerCollectionAcctIdField');
    formElements.centerCollectionAcctNameField = document.getElementById('centerCollectionAcctNameField');
    formElements.contraAccountIdField = document.getElementById('contraAccountIdField');
    formElements.contraAccountNameField = document.getElementById('contraAccountNameField');
    formElements.narrationField = document.getElementById('narrationField');
    formElements.savingBalanceField = document.getElementById('savingBalanceField');
    formElements.memberField = document.getElementById('memberField');
    formElements.osLoanBalanceField = document.getElementById('osLoanBalanceField');
    formElements.netBalanceField = document.getElementById('netBalanceField');
    formElements.savingOsLoanPctField = document.getElementById('savingOsLoanPctField');
    formElements.totalLoanAmountField = document.getElementById('totalLoanAmountField');
    formElements.createdByField = document.getElementById('createdByField');
    formElements.supervisedByField = document.getElementById('supervisedByField');
    formElements.createdOnField = document.getElementById('createdOnField');
    formElements.supervisedOnField = document.getElementById('supervisedOnField');
    formElements.viewAllBtn = document.getElementById('viewAllBtn');
    formElements.printBtn = document.getElementById('printBtn');
    formElements.denominationBtn = document.getElementById('denominationBtn');
    formElements.viewBtn = document.getElementById('viewBtn');
    formElements.addBtn = document.getElementById('addBtn');
    formElements.editBtn = document.getElementById('editBtn');
    formElements.deleteBtn = document.getElementById('deleteBtn');
    formElements.saveBtn = document.getElementById('saveBtn');
    formElements.cancelBtn = document.getElementById('cancelBtn');
  }

  /**
   * Bind event listeners
   */
  function bindEvents() {
    // Top right panel buttons
    if (formElements.viewAllBtn) {
      formElements.viewAllBtn.addEventListener('click', handleViewAllAction);
    }
    if (formElements.printBtn) {
      formElements.printBtn.addEventListener('click', handlePrintAction);
    }
    if (formElements.denominationBtn) {
      formElements.denominationBtn.addEventListener('click', handleDenominationAction);
    }

    // Right side panel buttons
    if (formElements.viewBtn) {
      formElements.viewBtn.addEventListener('click', handleViewAction);
    }
    if (formElements.addBtn) {
      formElements.addBtn.addEventListener('click', handleAddAction);
    }
    if (formElements.editBtn) {
      formElements.editBtn.addEventListener('click', handleEditAction);
    }
    if (formElements.deleteBtn) {
      formElements.deleteBtn.addEventListener('click', handleDeleteAction);
    }
    if (formElements.saveBtn) {
      formElements.saveBtn.addEventListener('click', handleSaveAction);
    }
    if (formElements.cancelBtn) {
      formElements.cancelBtn.addEventListener('click', handleCancelAction);
    }

    // Select all checkbox
    if (formElements.selectAllCheckbox) {
      formElements.selectAllCheckbox.addEventListener('change', handleSelectAll);
    }

    // Auto-search and load when Branch ID is entered and loses focus
    if (formElements.branchIdField) {
      formElements.branchIdField.addEventListener('blur', async () => {
        const branchId = formElements.branchIdField.value.trim();
        
        // Auto-search for branch name if ID is entered
        if (branchId && !formElements.branchNameField?.value) {
          await autoSearchBranch(branchId);
        }
        
        // Auto-load group details if both Branch ID and Center ID are filled
        const centerId = formElements.centerIdField?.value.trim();
        if (branchId && centerId) {
          await loadGroupDetails();
        }
      });
    }
    
    // Auto-search and load when Center ID is entered and loses focus
    if (formElements.centerIdField) {
      formElements.centerIdField.addEventListener('blur', async () => {
        const centerId = formElements.centerIdField.value.trim();
        
        // Auto-search for center name if ID is entered
        if (centerId && !formElements.centerNameField?.value) {
          await autoSearchCenter(centerId);
        }
        
        // Auto-load group details if both Branch ID and Center ID are filled
        const branchId = formElements.branchIdField?.value.trim();
        if (branchId && centerId) {
          await loadGroupDetails();
        }
      });
    }

    // Transaction Type change event
    if (formElements.transactionTypeSelect) {
      formElements.transactionTypeSelect.addEventListener('change', handleTransactionTypeChange);
    }

    // Contra Account ID auto-search on blur
    if (formElements.contraAccountIdField) {
      formElements.contraAccountIdField.addEventListener('blur', async () => {
        const transactionType = formElements.transactionTypeSelect?.value;
        const contraAccountId = formElements.contraAccountIdField.value.trim();
        
        // Only auto-search for Transfer or Cheque
        if ((transactionType === 'Transfer' || transactionType === 'Cheque') && contraAccountId && !formElements.contraAccountNameField?.value) {
          await autoSearchContraAccount(contraAccountId);
        }
      });
    }

    // Search buttons
    setupSearchHandlers();
  }

  /**
   * Setup search button handlers
   */
  function setupSearchHandlers() {
    const searchButtons = document.querySelectorAll('[data-search]');
    searchButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const searchType = btn.getAttribute('data-search');
        handleSearch(searchType);
      });
    });
  }

  /**
   * Handle search functionality
   */
  async function handleSearch(searchType) {
    console.log('Searching for:', searchType);
    
    if (searchType === 'branchId') {
      await searchBranches();
    } else if (searchType === 'centerId') {
      await searchCenters();
    } else if (searchType === 'contraAccountId') {
      await searchContraAccounts();
    } else {
      showToast(`Search for ${searchType} not yet implemented`, { 
        title: 'Info', 
        variant: 'info' 
      });
    }
  }

  /**
   * Search for branches
   */
  async function searchBranches() {
    try {
      showSearchModal('Loading branches...');
      
      const result = await BranchService.searchBranches({ 
        BankID: "00" 
      });
      
      if (result.success && result.data) {
        displayBranchResults(result.data);
      } else {
        showToast(result.message || 'Failed to load branches', { 
          title: 'Error', 
          variant: 'danger' 
        });
        closeSearchModal();
      }
    } catch (error) {
      console.error('Branch search error:', error);
      showToast('An error occurred while searching for branches', { 
        title: 'Error', 
        variant: 'danger' 
      });
      closeSearchModal();
    }
  }

  /**
   * Search for centers
   */
  async function searchCenters(filterParams = {}) {
    try {
      showSearchModal('Loading centers...', 'center');
      
      const branchId = formElements.branchIdField?.value || '';
      const centerId = filterParams.centerId || '';
      const centerName = filterParams.centerName || '';
      const centerIdOp = filterParams.centerIdOp || 'like';
      const centerNameOp = filterParams.centerNameOp || 'like';
      
      // Build WHERE clause
      let whereConditions = [];
      
      if (branchId) {
        whereConditions.push(`OurBranchID = '${branchId}'`);
      }
      
      if (centerId) {
        switch (centerIdOp) {
          case 'equals':
            whereConditions.push(`GroupID = '${centerId}'`);
            break;
          case 'starts':
            whereConditions.push(`GroupID like '${centerId}%'`);
            break;
          case 'like':
          default:
            whereConditions.push(`GroupID like '%${centerId}%'`);
            break;
        }
      }
      
      if (centerName) {
        switch (centerNameOp) {
          case 'equals':
            whereConditions.push(`GroupName = '${centerName}'`);
            break;
          case 'starts':
            whereConditions.push(`GroupName like '${centerName}%'`);
            break;
          case 'like':
          default:
            whereConditions.push(`GroupName like '%${centerName}%'`);
            break;
        }
      }
      
      const whereStmt = whereConditions.length > 0 ? whereConditions.join(' AND ') : "1=1";
      
      const result = await CenterService.searchCenters({ 
        WhereStmt: whereStmt,
        AdvFilterString: "",
        OurBranchID: branchId || "002",
        ModuleID: 1000,
        OperatorID: "web_portal"
      });
      
      if (result.success && result.data) {
        displayCenterResults(result.data);
      } else {
        showToast(result.message || 'Failed to load centers', { 
          title: 'Error', 
          variant: 'danger' 
        });
        closeSearchModal();
      }
    } catch (error) {
      console.error('Center search error:', error);
      showToast('An error occurred while searching for centers', { 
        title: 'Error', 
        variant: 'danger' 
      });
      closeSearchModal();
    }
  }

  /**
   * Search for contra accounts
   */
  async function searchContraAccounts(filterParams = {}) {
    const branchId = formElements.branchIdField?.value.trim();
    
    if (!branchId) {
      showToast('Please select a Branch ID first', { 
        title: 'Required', 
        variant: 'warning' 
      });
      return;
    }
    
    try {
      showSearchModal('Loading accounts...', 'contraAccount');
      
      let whereStmt = `OurBranchID = '${branchId}'`;
      
      // Add filter conditions if provided
      if (filterParams.accountId) {
        whereStmt += ` AND AccountID LIKE '%${filterParams.accountId}%'`;
      }
      if (filterParams.description) {
        whereStmt += ` AND Description LIKE '%${filterParams.description}%'`;
      }
      
      const result = await SearchService.search({
        TableID: "GLDrTrxAllowID",
        AdvFilterString: "",
        WhereStmt: whereStmt,
        PrevOrNext: "1",
        RefID: "",
        OperatorID: "web_portal",
        ModuleID: 1000,
        OurBranchID: branchId
      });
      
      if (result.success && result.data) {
        displayContraAccountResults(result.data);
      } else {
        showToast(result.message || 'Failed to load accounts', { 
          title: 'Error', 
          variant: 'danger' 
        });
        closeSearchModal();
      }
    } catch (error) {
      console.error('Contra account search error:', error);
      showToast('An error occurred while searching for accounts', { 
        title: 'Error', 
        variant: 'danger' 
      });
      closeSearchModal();
    }
  }

  /**
   * Auto-search for contra account by ID
   */
  async function autoSearchContraAccount(accountId) {
    const branchId = formElements.branchIdField?.value.trim();
    
    if (!branchId) {
      showToast('Please select a Branch ID first', { 
        title: 'Required', 
        variant: 'warning' 
      });
      return;
    }
    
    try {
      const result = await SearchService.search({
        TableID: "GLDrTrxAllowID",
        AdvFilterString: "",
        WhereStmt: `OurBranchID = '${branchId}' AND AccountID = '${accountId}'`,
        PrevOrNext: "1",
        RefID: "",
        OperatorID: "web_portal",
        ModuleID: 1000,
        OurBranchID: branchId
      });
      
      if (result.success && result.data) {
        const accounts = result.data.Details || result.data;
        
        if (Array.isArray(accounts) && accounts.length > 0) {
          const account = accounts[0];
          formElements.contraAccountNameField.value = account.AccountName || account.GlName || account.Name || '';
        } else {
          showToast(`Account ID ${accountId} not found`, { 
            title: 'Not Found', 
            variant: 'warning' 
          });
        }
      }
    } catch (error) {
      console.error('Auto-search contra account error:', error);
    }
  }

  /**
   * Display branch search results
   */
  function displayBranchResults(data) {
    // data could be an array or have a Details property
    const branches = Array.isArray(data) ? data : (data.Details || []);
    
    // Store all branches for filtering
    allBranches = branches;
    
    // Display all branches initially
    renderBranchTable(allBranches);
  }

  /**
   * Display center search results
   */
  function displayCenterResults(data) {
    // data could be an array or have a Details property
    const centers = Array.isArray(data) ? data : (data.Details || []);
    
    // Store all centers for filtering
    allCenters = centers;
    
    // Display all centers initially
    renderCenterTable(allCenters);
  }

  /**
   * Display contra account search results
   */
  function displayContraAccountResults(data) {
    // data could be an array or have a Details property
    const accounts = Array.isArray(data) ? data : (data.Details || []);
    
    // Display all accounts
    renderContraAccountTable(accounts);
  }

  /**
   * Render branch table with given data
   */
  function renderBranchTable(branches) {
    const tbody = document.getElementById('searchResultsBody');
    if (!tbody) return;
    
    if (branches.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px;">No branches found</td></tr>';
      return;
    }
    
    tbody.innerHTML = branches.map(branch => {
      const branchId = branch.OurBranchID || branch.BranchID || branch.branchID || '';
      const branchName = (branch.BranchName || branch.branchName || '').replace(/'/g, '&apos;');
      
      return `
        <tr ondblclick="window.GroupCollection.selectBranch('${branchId}', '${branchName}')" style="cursor: pointer;">
          <td>${branchId}</td>
          <td>${branchName}</td>
          <td>
            <button class="btn-action" onclick="window.GroupCollection.selectBranch('${branchId}', '${branchName}')">
              <i class="bi bi-check-circle"></i> Select
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Render center table with given data
   */
  function renderCenterTable(centers) {
    const tbody = document.getElementById('searchResultsBody');
    if (!tbody) return;
    
    if (centers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px;">No centers found</td></tr>';
      return;
    }
    
    tbody.innerHTML = centers.map(center => {
      // Map GroupID to CenterID and GroupName to CenterName
      const centerId = center.GroupID || center.CenterID || center.centerID || '';
      const centerName = (center.GroupName || center.CenterName || center.centerName || '').replace(/'/g, '&apos;');
      
      return `
        <tr ondblclick="window.GroupCollection.selectCenter('${centerId}', '${centerName}')" style="cursor: pointer;">
          <td>${centerId}</td>
          <td>${centerName}</td>
          <td>
            <button class="btn-action" onclick="window.GroupCollection.selectCenter('${centerId}', '${centerName}')">
              <i class="bi bi-check-circle"></i> Select
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Render contra account table with given data
   */
  function renderContraAccountTable(accounts) {
    const tbody = document.getElementById('searchResultsBody');
    if (!tbody) return;
    
    if (accounts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px;">No accounts found</td></tr>';
      return;
    }
    
    tbody.innerHTML = accounts.map(account => {
      const accountId = account.AccountID || '';
      const description = (account.Description || account.AccountName || account.GlName || account.Name || '').replace(/'/g, '&apos;');
      
      return `
        <tr ondblclick="window.GroupCollection.selectContraAccount('${accountId}', '${description}')" style="cursor: pointer;">
          <td>${accountId}</td>
          <td>${description}</td>
          <td>
            <button class="btn-action" onclick="window.GroupCollection.selectContraAccount('${accountId}', '${description}')">
              <i class="bi bi-check-circle"></i> Select
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Filter branches based on user input
   */
  function filterBranches() {
    const branchIdInput = document.getElementById('filterBranchId')?.value.toLowerCase().trim() || '';
    const branchNameInput = document.getElementById('filterBranchName')?.value.toLowerCase().trim() || '';
    const branchIdOp = document.getElementById('branchIdOperator')?.value || 'like';
    const branchNameOp = document.getElementById('branchNameOperator')?.value || 'like';
    
    const filtered = allBranches.filter(branch => {
      const branchId = (branch.OurBranchID || branch.BranchID || branch.branchID || '').toLowerCase();
      const branchName = (branch.BranchName || branch.branchName || '').toLowerCase();
      
      let idMatch = true;
      let nameMatch = true;
      
      // Filter by Branch ID
      if (branchIdInput) {
        switch (branchIdOp) {
          case 'equals':
            idMatch = branchId === branchIdInput;
            break;
          case 'starts':
            idMatch = branchId.startsWith(branchIdInput);
            break;
          case 'like':
          default:
            idMatch = branchId.includes(branchIdInput);
            break;
        }
      }
      
      // Filter by Branch Name
      if (branchNameInput) {
        switch (branchNameOp) {
          case 'equals':
            nameMatch = branchName === branchNameInput;
            break;
          case 'starts':
            nameMatch = branchName.startsWith(branchNameInput);
            break;
          case 'like':
          default:
            nameMatch = branchName.includes(branchNameInput);
            break;
        }
      }
      
      return idMatch && nameMatch;
    });
    
    renderBranchTable(filtered);
  }

  /**
   * Filter centers based on user input
   */
  async function filterCenters() {
    const centerIdInput = document.getElementById('filterBranchId')?.value.trim() || '';
    const centerNameInput = document.getElementById('filterBranchName')?.value.trim() || '';
    const centerIdOp = document.getElementById('branchIdOperator')?.value || 'like';
    const centerNameOp = document.getElementById('branchNameOperator')?.value || 'like';
    
    // Call API with filter parameters
    await searchCenters({
      centerId: centerIdInput,
      centerName: centerNameInput,
      centerIdOp: centerIdOp,
      centerNameOp: centerNameOp
    });
  }

  /**
   * Clear filter inputs
   */
  async function clearFilters() {
    const filterBranchId = document.getElementById('filterBranchId');
    const filterBranchName = document.getElementById('filterBranchName');
    
    if (filterBranchId) filterBranchId.value = '';
    if (filterBranchName) filterBranchName.value = '';
    
    // Reload data based on current search type
    if (window._currentSearchType === 'center') {
      await searchCenters();
    } else {
      renderBranchTable(allBranches);
    }
  }

  /**
   * Select a branch from search results
   */
  function selectBranch(branchId, branchName) {
    if (formElements.branchIdField) formElements.branchIdField.value = branchId;
    if (formElements.branchNameField) formElements.branchNameField.value = branchName;
    closeSearchModal();
    showToast('Branch selected successfully', { 
      title: 'Success', 
      variant: 'success' 
    });
  }

  /**
   * Select a center from search results
   */
  async function selectCenter(centerId, centerName) {
    if (formElements.centerIdField) formElements.centerIdField.value = centerId;
    if (formElements.centerNameField) formElements.centerNameField.value = centerName;
    closeSearchModal();
    showToast('Center selected successfully', { 
      title: 'Success', 
      variant: 'success' 
    });
    
    // Auto-load group details if both Branch ID and Center ID are filled
    const branchId = formElements.branchIdField?.value.trim();
    if (branchId && centerId) {
      await loadGroupDetails();
    }
  }

  /**
   * Select contra account from search results
   */
  function selectContraAccount(accountId, accountName) {
    if (formElements.contraAccountIdField) formElements.contraAccountIdField.value = accountId;
    if (formElements.contraAccountNameField) formElements.contraAccountNameField.value = accountName;
    closeSearchModal();
    showToast('Account selected successfully', { 
      title: 'Success', 
      variant: 'success' 
    });
  }

  /**
   * Show search modal using Bootstrap Modal API
   */
  function showSearchModal(message = 'Loading...', searchType = 'branch') {
    const modal = document.getElementById('searchModal');
    const tbody = document.getElementById('searchResultsBody');
    const modalTitle = document.getElementById('searchModalLabel');
    const headerIdTh = document.getElementById('searchHeaderId');
    const headerNameTh = document.getElementById('searchHeaderName');
    
    // Store current search type
    window._currentSearchType = searchType;
    
    if (modal) {
      if (tbody && message) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted" style="padding: 20px;">${message}</td></tr>`;
      }
      
      // Update modal title based on search type
      if (modalTitle) {
        modalTitle.textContent = searchType === 'center' ? 'Search Centers' : searchType === 'contraAccount' ? 'Search Accounts' : 'Search Branches';
      }
      
      // Update table headers
      if (headerIdTh && headerNameTh) {
        if (searchType === 'center') {
          headerIdTh.textContent = 'Center ID';
          headerNameTh.textContent = 'Center Name';
        } else if (searchType === 'contraAccount') {
          headerIdTh.textContent = 'Account ID';
          headerNameTh.textContent = 'Description';
        } else {
          headerIdTh.textContent = 'Branch ID';
          headerNameTh.textContent = 'Branch Name';
        }
      }
      
      // Update filter placeholders
      const filterIdInput = document.getElementById('filterBranchId');
      const filterNameInput = document.getElementById('filterBranchName');
      if (filterIdInput && filterNameInput) {
        if (searchType === 'center') {
          filterIdInput.setAttribute('placeholder', 'Enter Center ID');
          filterNameInput.setAttribute('placeholder', 'Enter Center Name');
        } else if (searchType === 'contraAccount') {
          filterIdInput.setAttribute('placeholder', 'Enter Account ID');
          filterNameInput.setAttribute('placeholder', 'Enter Description');
        } else {
          filterIdInput.setAttribute('placeholder', 'Enter Branch ID');
          filterNameInput.setAttribute('placeholder', 'Enter Branch Name');
        }
      }
      
      // Show modal using Bootstrap API
      const bsModal = new bootstrap.Modal(modal);
      bsModal.show();
    }
  }

  /**
   * Close search modal using Bootstrap Modal API
   */
  function closeSearchModal() {
    const modal = document.getElementById('searchModal');
    if (modal) {
      const bsModal = bootstrap.Modal.getInstance(modal);
      if (bsModal) bsModal.hide();
    }
  }

  /**
   * Initialize search modal handlers
   */
  function initSearchModal() {
    const applyFilterBtn = document.getElementById('applyFilterBtn');
    const clearFilterBtn = document.getElementById('clearFilterBtn');
    const filterBranchId = document.getElementById('filterBranchId');
    const filterBranchName = document.getElementById('filterBranchName');
    
    // Store current search type
    let currentSearchType = 'branch';
    
    if (applyFilterBtn) {
      applyFilterBtn.addEventListener('click', async () => {
        if (currentSearchType === 'center') {
          await filterCenters();
        } else {
          filterBranches();
        }
      });
    }
    
    if (clearFilterBtn) {
      clearFilterBtn.addEventListener('click', clearFilters);
    }
    
    // Remove real-time filtering for centers (only for branches)
    if (filterBranchId) {
      filterBranchId.addEventListener('input', () => {
        if (window._currentSearchType === 'branch') {
          filterBranches();
        }
      });
      
      // Allow Enter key to trigger filter
      filterBranchId.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
          if (currentSearchType === 'center') {
            await filterCenters();
          } else {
            filterBranches();
          }
        }
      });
    }
    
    if (filterBranchName) {
      filterBranchName.addEventListener('input', () => {
        if (window._currentSearchType === 'branch') {
          filterBranches();
        }
      });
      
      // Allow Enter key to trigger filter
      filterBranchName.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
          if (currentSearchType === 'center') {
            await filterCenters();
          } else {
            filterBranches();
          }
        }
      });
    }
    
    // Store search type for filter functions
    window._currentSearchType = 'branch';
    Object.defineProperty(window, '_currentSearchType', {
      get: () => currentSearchType,
      set: (value) => { currentSearchType = value; }
    });
  }

  /**
   * Handle Select All checkbox
   */
  function handleSelectAll(e) {
    const isChecked = e.target.checked;
    const checkboxes = formElements.projectionDetailsBody.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.checked = isChecked;
    });
  }

  /**
   * Handle transaction type change
   */
  async function handleTransactionTypeChange(e) {
    const transactionType = e.target.value;
    
    console.log('Transaction type changed to:', transactionType);
    
    // Note: Adjust these values to match your CashOrTrf system code values
    // Check the actual values from your dropdown
    if (transactionType === 'Cash' || transactionType === 'C' || transactionType.toLowerCase().includes('cash')) {
      // Enable till field
      if (formElements.tillField) {
        formElements.tillField.disabled = false;
      }
      
      // Call API to get till details and populate till + contra account
      await loadTillDetails();
      
      // Disable contra account ID field (populated from till API)
      if (formElements.contraAccountIdField) {
        formElements.contraAccountIdField.disabled = true;
      }
    } else if (transactionType === 'Transfer' || transactionType === 'T' || transactionType.toLowerCase().includes('transfer')) {
      // Clear and disable till field
      if (formElements.tillField) {
        formElements.tillField.value = '';
        formElements.tillField.disabled = true;
      }

      // Clear till ID field
      if (formElements.tillIdField) {
        formElements.tillIdField.value = '';
      }
      
      // Clear and enable contra account fields
      if (formElements.contraAccountIdField) {
        formElements.contraAccountIdField.value = '';
        formElements.contraAccountIdField.disabled = false;
      }
      if (formElements.contraAccountNameField) {
        formElements.contraAccountNameField.value = '';
      }
    } else {
      // For other transaction types, enable both fields
      if (formElements.tillField) {
        formElements.tillField.disabled = false;
      }
      if (formElements.contraAccountIdField) {
        formElements.contraAccountIdField.disabled = false;
      }
    }
  }

  /**
   * Load till details for cash transactions
   */
  async function loadTillDetails() {
    const branchId = formElements.branchIdField?.value.trim();
    
    if (!branchId) {
      console.log('Branch ID required to load till details');
      return;
    }
    
    try {
      // For now, using a default CashierID. You may want to get this from user session
      const result = await TillService.getTillDetails({
        CashierID: "web_portal"
      });
      
      console.log('Till details result:', result);
      
      if (result.success && result.data) {
        const tillDetails = result.data.Details || result.data;
        
        if (Array.isArray(tillDetails)) {
          // Filter by OurBranchID matching selected branch AND LocalCurrency = 1
          const matchingTill = tillDetails.find(till => 
            String(till.OurBranchID || '').trim() === String(branchId).trim() &&
            (till.LocalCurrency === 1 || till.LocalCurrency === '1')
          );
          
          console.log('Matching till:', matchingTill);
          
          if (matchingTill) {
            // Populate Till field with TillName
            if (formElements.tillField) {
              formElements.tillField.value = matchingTill.TillName || matchingTill.Till || '';
            }

            // Store Till ID in hidden field
            if (formElements.tillIdField) {
              formElements.tillIdField.value = matchingTill.Till || matchingTill.TillID || '';
            }
            
            // Populate Contra Account ID with CashControlGLID
            if (formElements.contraAccountIdField) {
              formElements.contraAccountIdField.value = matchingTill.CashControlGLID || '';
            }
            
            // Populate Contra Account Name with GlName
            if (formElements.contraAccountNameField) {
              formElements.contraAccountNameField.value = matchingTill.GlName || '';
            }
          } else {
            console.log('No till found for branch:', branchId, 'with LocalCurrency=1');
          }
        }
      }
    } catch (error) {
      console.error('Load till details error:', error);
    }
  }

  /**
   * Auto-search for contra account by ID
   */
  async function autoSearchContraAccount(accountId) {
    const branchId = formElements.branchIdField?.value.trim();
    
    if (!branchId) {
      showToast('Please select a Branch ID first', { 
        title: 'Required', 
        variant: 'warning' 
      });
      return;
    }
    
    try {
      console.log('Auto-searching for contra account:', accountId);
      const result = await SearchService.search({
        TableID: "GLDrTrxAllowID",
        AdvFilterString: "",
        WhereStmt: `OurBranchID = '${branchId}' AND AccountID = '${accountId}'`,
        PrevOrNext: "1",
        RefID: "",
        OperatorID: "web_portal",
        ModuleID: 1000,
        OurBranchID: branchId
      });
      
      console.log('Contra account search result:', result);
      
      if (result.success && result.data) {
        const accounts = result.data.Details || result.data;
        
        if (Array.isArray(accounts) && accounts.length > 0) {
          const account = accounts[0];
          formElements.contraAccountNameField.value = account.Description || account.AccountName || account.GlName || account.Name || '';
        } else {
          showToast(`Account ID ${accountId} not found`, { 
            title: 'Not Found', 
            variant: 'warning' 
          });
        }
      }
    } catch (error) {
      console.error('Auto-search contra account error:', error);
    }
  }

  /**
   * Handle View All action
   */
  /**
   * Handle View All action - Display all group transactions
   */
  async function handleViewAllAction() {
    console.log('View All action clicked');
    
    try {
      // Get BranchID from session or use default
      const branchId = formElements.branchIdField?.value.trim() || '0603';
      
      const result = await GroupCollectionService.getTrxGroupList({
        OurBranchID: branchId,
        OperatorID: 'web_portal'
      });
      
      if (result.success && result.data) {
        displayViewAllModal(result.data);
      } else {
        showToast(result.message || 'Failed to load transactions', {
          title: 'Error',
          variant: 'error',
          timeoutMs: 5000
        });
      }
    } catch (error) {
      console.error('View All error:', error);
      showToast('An error occurred while loading transactions', {
        title: 'Error',
        variant: 'error',
        timeoutMs: 5000
      });
    }
  }

  /**
   * Display View All results in a modal
   */
  function displayViewAllModal(data) {
    const transactions = data.Details || data || [];
    
    // Remove existing modal if any
    const existingModal = document.getElementById('viewAllModal');
    if (existingModal) {
      existingModal.remove();
    }
    
    // Create Bootstrap modal HTML
    const modalHtml = `
      <div class="modal fade" id="viewAllModal" tabindex="-1" aria-labelledby="viewAllModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-xl modal-dialog-scrollable">
          <div class="modal-content">
            <div class="modal-header bg-primary text-white">
              <div>
                <p class="mb-0 small">Group Collection</p>
                <h5 class="modal-title" id="viewAllModalLabel">All Transactions</h5>
              </div>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              ${transactions.length > 0 ? `
                <div class="table-responsive">
                  <table class="table table-bordered table-hover table-sm">
                    <thead class="table-light">
                      <tr>
                        <th>Batch ID</th>
                        <th>Serial ID</th>
                        <th>Group ID</th>
                        <th>Group Name</th>
                        <th>Is Posted</th>
                        <th>Loan Scheme</th>
                        <th>Officer ID</th>
                        <th>Officer Name</th>
                        <th style="text-align: right;">Total Collection</th>
                        <th>Value Date</th>
                      </tr>
                    </thead>
                    <tbody id="viewAllTableBody">
                    </tbody>
                  </table>
                </div>
              ` : '<p class="text-center text-muted py-4">No transactions found.</p>'}
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Populate table with double-click handlers
    if (transactions.length > 0) {
      const tbody = document.getElementById('viewAllTableBody');
      transactions.forEach(trx => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${trx.TrxBatchID || ''}</td>
          <td>${trx.TrxSerialID || ''}</td>
          <td>${trx.GroupID || ''}</td>
          <td>${trx.GroupName || ''}</td>
          <td>${trx.IsPosted ? 'Yes' : 'No'}</td>
          <td>${trx.LoanScheme || ''}</td>
          <td>${trx.OfficerID || ''}</td>
          <td>${trx.OfficerName || ''}</td>
          <td style="text-align: right;">${formatCurrency(trx.TotalCollection || 0)}</td>
          <td>${trx.ValueDate || ''}</td>
        `;
        
        // Add double-click handler with pointer cursor
        row.style.cursor = 'pointer';
        row.addEventListener('dblclick', () => handleRowDoubleClick(trx));
        
        tbody.appendChild(row);
      });
    }
    
    // Show the modal using Bootstrap
    const modalElement = document.getElementById('viewAllModal');
    const bsModal = new bootstrap.Modal(modalElement);
    bsModal.show();
    
    // Clean up modal from DOM when hidden
    modalElement.addEventListener('hidden.bs.modal', () => {
      modalElement.remove();
    });
  }

  /**
   * Handle double-click on a transaction row in View All modal
   */
  async function handleRowDoubleClick(transaction) {
    console.log('Row double-clicked:', transaction);
    
    if (!transaction.TrxBatchID) {
      showToast('Invalid transaction - no Batch ID', {
        title: 'Error',
        variant: 'error',
        timeoutMs: 5000
      });
      return;
    }
    
    try {
      // Close the Bootstrap modal
      const modalElement = document.getElementById('viewAllModal');
      if (modalElement) {
        const bsModal = bootstrap.Modal.getInstance(modalElement);
        if (bsModal) {
          bsModal.hide();
        }
      }
      
      // Get branch ID from form or default
      const branchId = formElements.branchIdField?.value.trim() || '0603';
      
      // Get operator ID (adjust based on your auth system)
      const operatorId = 'web_portal';
      
      // Call API to get full transaction details
      const result = await GroupCollectionService.getGroupTransaction({
        OurBranchID: branchId,
        TrxSerialID: transaction.TrxBatchID,
        Direction: 0, // Default direction
        OperatorID: operatorId
      });
      
      console.log('Transaction details response:', result);
      
      if (result.success && result.data) {
        // Bind the data to the form
        bindTransactionToForm(result.data);
        showToast('Transaction loaded successfully', {
          title: 'Success',
          variant: 'success',
          timeoutMs: 5000
        });
      } else {
        showToast(result.message || 'Failed to load transaction details', {
          title: 'Error',
          variant: 'error',
          timeoutMs: 5000
        });
      }
    } catch (error) {
      console.error('Error loading transaction:', error);
      showToast('Error loading transaction details', {
        title: 'Error',
        variant: 'error',
        timeoutMs: 5000
      });
    }
  }

  /**
   * Bind transaction data to the form
   */
  function bindTransactionToForm(data) {
    console.log('Binding transaction data to form:', data);
    
    // Clear form first
    clearForm();
    
    // Log the complete data structure
    console.log('Transaction data structure:', JSON.stringify(data, null, 2));
    
    // Extract data sections
    const summaryData = data.Details && data.Details[0] ? data.Details[0] : null;
    const headerData = data.Details01 && data.Details01[0] ? data.Details01[0] : null;
    const gridData = data.Details02 || [];
    
    if (!headerData) {
      showToast('Invalid transaction data structure', {
        title: 'Error',
        variant: 'error',
        timeoutMs: 5000
      });
      return;
    }
    
    // === Bind Query Section Fields ===
    if (formElements.branchIdField) formElements.branchIdField.value = headerData.ContraBranchID || '';
    if (formElements.branchNameField) formElements.branchNameField.value = headerData.ContraBranchName || '';
    if (formElements.centerIdField) formElements.centerIdField.value = headerData.GroupID || '';
    if (formElements.centerNameField) formElements.centerNameField.value = headerData.GroupName || '';
    if (formElements.creditOfficerIdField) formElements.creditOfficerIdField.value = headerData.OfficerID || '';
    if (formElements.creditOfficerNameField) formElements.creditOfficerNameField.value = headerData.OfficerName || '';
    if (formElements.serialIdField) formElements.serialIdField.value = headerData.TrxSerialID || '';
    
    // === Bind Collection Details Section ===
    // Value Date - format from ISO string to YYYY-MM-DD
    if (formElements.valueDateField && headerData.ValueDate) {
      const valueDate = new Date(headerData.ValueDate);
      formElements.valueDateField.value = valueDate.toISOString().split('T')[0];
    }
    
    // Till fields
    if (formElements.tillField) formElements.tillField.value = headerData.TillName || '';
    if (formElements.tillIdField) formElements.tillIdField.value = headerData.TillID || '';
    
    // Transaction Type
    if (formElements.transactionTypeSelect) formElements.transactionTypeSelect.value = headerData.TransactionTypeID || '';
    
    // Reference and Narration
    if (formElements.refField) formElements.refField.value = headerData.ReferenceNo || '';
    if (formElements.narrationField) formElements.narrationField.value = headerData.Narration || '';
    
    // Center Collection Account
    if (formElements.centerCollectionAcctIdField) formElements.centerCollectionAcctIdField.value = headerData.GroupCollectionAccountID || '';
    if (formElements.centerCollectionAcctNameField) formElements.centerCollectionAcctNameField.value = headerData.GroupCollectionAccountName || '';
    
    // Contra Account (GL Account)
    if (formElements.contraAccountIdField) formElements.contraAccountIdField.value = headerData.GLAccountID || '';
    if (formElements.contraAccountNameField) formElements.contraAccountNameField.value = headerData.GLAccount || '';
    
    // === Bind Behind The Scene Section ===
    if (summaryData) {
      if (formElements.savingBalanceField) formElements.savingBalanceField.textContent = formatCurrency(summaryData.SavingBalance || 0);
      if (formElements.osLoanBalanceField) formElements.osLoanBalanceField.textContent = formatCurrency(Math.abs(summaryData.LoanBalance || 0));
      if (formElements.memberField) formElements.memberField.textContent = summaryData.NoOfMember || 0;
      if (formElements.totalLoanAmountField) formElements.totalLoanAmountField.textContent = formatCurrency(summaryData.TotalLoanAmt || 0);
      
      // Calculate net balance (Saving - Loan)
      const netBalance = (summaryData.SavingBalance || 0) + (summaryData.LoanBalance || 0);
      if (formElements.netBalanceField) formElements.netBalanceField.textContent = formatCurrency(netBalance);
      
      // Saving/OS Loan Ratio
      if (formElements.savingOsLoanPctField) formElements.savingOsLoanPctField.textContent = summaryData.SavingLoanRatio || 0;
    }
    
    // Created/Supervised By/On
    if (formElements.createdByField) formElements.createdByField.textContent = headerData.CreatedBy || '';
    if (formElements.supervisedByField) formElements.supervisedByField.textContent = headerData.SupervisionID || '';
    
    if (formElements.createdOnField && headerData.CreatedOn) {
      const createdOn = new Date(headerData.CreatedOn);
      formElements.createdOnField.textContent = createdOn.toLocaleString();
    }
    
    if (formElements.supervisedOnField && headerData.SupervisionOn) {
      const supervisedOn = new Date(headerData.SupervisionOn);
      formElements.supervisedOnField.textContent = supervisedOn.toLocaleString();
    }
    
    // === Bind Grid Data (Details02) ===
    if (gridData.length > 0 && formElements.projectionDetailsBody) {
      formElements.projectionDetailsBody.innerHTML = '';
      
      let totalExpected = 0;
      let totalReceived = 0;
      
      gridData.forEach((row, index) => {
        const tr = document.createElement('tr');
        
        // Checkbox column
        const checkboxCell = document.createElement('td');
        checkboxCell.style.textAlign = 'center';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = true;
        checkboxCell.appendChild(checkbox);
        tr.appendChild(checkboxCell);
        
        // Component column
        const componentCell = document.createElement('td');
        componentCell.textContent = row.GrpColComponentID || row.Component || '';
        tr.appendChild(componentCell);
        
        // Expected Amount column
        const expectedCell = document.createElement('td');
        expectedCell.style.textAlign = 'right';
        expectedCell.textContent = formatCurrency(row.ExpectedAmount || 0);
        tr.appendChild(expectedCell);
        
        // Received Amount column (editable input)
        const receivedCell = document.createElement('td');
        const receivedInput = document.createElement('input');
        receivedInput.type = 'number';
        receivedInput.step = '0.01';
        receivedInput.value = row.ReceivedAmount || 0;
        receivedInput.className = 'form-control';
        receivedInput.style.textAlign = 'right';
        receivedInput.addEventListener('input', updateTotals);
        receivedCell.appendChild(receivedInput);
        tr.appendChild(receivedCell);
        
        formElements.projectionDetailsBody.appendChild(tr);
        
        totalExpected += parseFloat(row.ExpectedAmount || 0);
        totalReceived += parseFloat(row.ReceivedAmount || 0);
      });
      
      // Update totals
      if (formElements.totalExpectedField) formElements.totalExpectedField.value = formatCurrency(totalExpected);
      if (formElements.totalReceivedField) formElements.totalReceivedField.value = formatCurrency(totalReceived);
    }
  }

  /**
   * Auto-search for branch by ID
   */
  async function autoSearchBranch(branchId) {
    try {
      console.log('Auto-searching for branch:', branchId);
      const result = await BranchService.searchBranches({
        BankID: "00"
      });
      
      console.log('Branch search result:', result);
      
      if (result.success && result.data) {
        // Handle both result.data.Details and result.data being the array directly
        const branches = result.data.Details || result.data;
        console.log('Branches array:', branches);
        
        if (Array.isArray(branches)) {
          const branch = branches.find(b => 
            String(b.OurBranchID).trim() === String(branchId).trim() || 
            String(b.BranchID || '').trim() === String(branchId).trim()
          );
          
          console.log('Found branch:', branch);
          
          if (branch) {
            formElements.branchNameField.value = branch.BranchName || '';
          } else {
            showToast(`Branch ID ${branchId} not found`, { 
              title: 'Not Found', 
              variant: 'warning' 
            });
          }
        }
      }
    } catch (error) {
      console.error('Auto-search branch error:', error);
    }
  }

  /**
   * Auto-search for center by ID
   */
  async function autoSearchCenter(centerId) {
    try {
      const result = await CenterService.searchCenters({
        TableID: "GroupID",
        AdvFilterString: "",
        WhereStmt: `GroupID = '${centerId}'`
      });
      
      if (result.success && result.data && result.data.Details) {
        const centers = result.data.Details;
        
        if (centers.length > 0) {
          const center = centers[0];
          formElements.centerNameField.value = center.GroupName || center.CenterName || '';
        } else {
          showToast(`Center ID ${centerId} not found`, { 
            title: 'Not Found', 
            variant: 'warning' 
          });
        }
      }
    } catch (error) {
      console.error('Auto-search center error:', error);
    }
  }

  /**
   * Handle Print action
   */
  function handlePrintAction() {
    console.log('Print action clicked');
    // TODO: Implement print logic
  }

  /**
   * Handle Denomination action
   */
  function handleDenominationAction() {
    console.log('Denomination action clicked');
    // TODO: Implement denomination logic
  }

  /**
   * Load group collection details
   */
  async function loadGroupDetails() {
    const branchId = formElements.branchIdField?.value.trim();
    const centerId = formElements.centerIdField?.value.trim();
    
    // Check if both required fields are filled
    if (!branchId || !centerId) {
      console.log('Branch ID and Center ID are required');
      return;
    }
    
    try {
      // Show loading state
      if (formElements.projectionDetailsBody) {
        formElements.projectionDetailsBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #64748b;"><i class="bi bi-hourglass-split"></i> Loading group details...</td></tr>';
      }
      
      const result = await GroupCollectionService.getGroupDetails({
        OurBranchID: branchId,
        GroupID: centerId,
        OperatorID: "web_portal",
        GroupBranchID: branchId
      });
      
      if (result.success && result.data) {
        populateGroupDetails(result.data);
        // Keep collection section disabled after auto-load - user must click Add to edit
        disableCollectionSection();
        // Highlight Add button to indicate user should click it to edit
        if (formElements.addBtn) {
          formElements.addBtn.classList.add('ready');
        }
        showToast('Group details loaded successfully', { 
          title: 'Success', 
          variant: 'success' 
        });
      } else {
        showToast(result.message || 'Failed to load group details', { 
          title: 'Error', 
          variant: 'danger' 
        });
        if (formElements.projectionDetailsBody) {
          formElements.projectionDetailsBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #64748b;">No records to display.</td></tr>';
        }
      }
    } catch (error) {
      console.error('Load group details error:', error);
      showToast('An error occurred while loading group details', { 
        title: 'Error', 
        variant: 'danger' 
      });
      if (formElements.projectionDetailsBody) {
        formElements.projectionDetailsBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #64748b;">No records to display.</td></tr>';
      }
    }
  }

  /**
   * Populate group details on the screen
   */
  function populateGroupDetails(data) {
    console.log('Raw data received:', data);
    
    // Handle multi-result set response structure
    // First result set is in data.Details array
    const groupDetails = data.Details && data.Details.length > 0 ? data.Details[0] : {};
    
    console.log('Group details extracted:', groupDetails);
    
    // Second result set contains projection details (data.Details01)
    const gridData = data.Details01 || [];
    
    // Populate Credit Officer fields FIRST
    console.log('Credit Officer ID:', groupDetails.CreditOfficerID);
    console.log('Credit Officer Name:', groupDetails.CreditOfficerName);
    console.log('Field elements:', formElements.creditOfficerIdField, formElements.creditOfficerNameField);
    
    if (formElements.creditOfficerIdField) {
      formElements.creditOfficerIdField.value = groupDetails.CreditOfficerID || '';
      console.log('Set Credit Officer ID to:', formElements.creditOfficerIdField.value);
    }
    if (formElements.creditOfficerNameField) {
      formElements.creditOfficerNameField.value = groupDetails.CreditOfficerName || '';
      console.log('Set Credit Officer Name to:', formElements.creditOfficerNameField.value);
    }
    
    // Populate Group Collection Account fields
    if (groupDetails.GroupCollectionAccountID !== undefined && formElements.centerCollectionAcctIdField) {
      formElements.centerCollectionAcctIdField.value = groupDetails.GroupCollectionAccountID || '';
    }
    if (groupDetails.GroupCollectionAccountName !== undefined && formElements.centerCollectionAcctNameField) {
      formElements.centerCollectionAcctNameField.value = groupDetails.GroupCollectionAccountName || '';
    }
    
    // Populate Behind The Scene fields
    if (groupDetails.SavingBalance !== undefined && formElements.savingBalanceField) {
      formElements.savingBalanceField.textContent = formatCurrency(groupDetails.SavingBalance || 0);
    }
    if (groupDetails.LoanBalance !== undefined && formElements.osLoanBalanceField) {
      formElements.osLoanBalanceField.textContent = formatCurrency(groupDetails.LoanBalance || 0);
    }
    
    // Calculate Net Balance (Saving Balance - Loan Balance)
    if (formElements.netBalanceField) {
      const savingBalance = parseFloat(groupDetails.SavingBalance || 0);
      const loanBalance = parseFloat(groupDetails.LoanBalance || 0);
      const netBalance = savingBalance - loanBalance;
      formElements.netBalanceField.textContent = formatCurrency(netBalance);
    }
    
    if (groupDetails.NoOfMember !== undefined && formElements.memberField) {
      formElements.memberField.textContent = groupDetails.NoOfMember || '';
    }
    if (groupDetails.SavingLoanRatio !== undefined && formElements.savingOsLoanPctField) {
      formElements.savingOsLoanPctField.textContent = groupDetails.SavingLoanRatio || '';
    }
    if (groupDetails.TotalLoanAmt !== undefined && formElements.totalLoanAmountField) {
      formElements.totalLoanAmountField.textContent = formatCurrency(groupDetails.TotalLoanAmt || 0);
    }
    
    // Populate the Group Projection Details table
    if (formElements.projectionDetailsBody && gridData.length > 0) {
      formElements.projectionDetailsBody.innerHTML = gridData.map((row, index) => `
        <tr>
          <td style="width: 50px; text-align: center;">
            <input type="checkbox" id="row_${index}" />
          </td>
          <td style="width: 40%; text-align: left; padding-left: 8px;">${row.Component || row.component || row.ComponentName || ''}</td>
          <td style="width: 30%; text-align: right; padding-right: 12px;">${formatCurrency(row.ExpectedAmount || row.expectedAmount || 0)}</td>
          <td style="width: 30%; text-align: right; padding-right: 12px;">
            <input type="text" class="input-small" data-format="money" style="width: 95%; max-width: 150px;" 
                   id="received_${index}" value="${formatCurrency(row.ReceivedAmount || row.receivedAmount || 0)}" />
          </td>
        </tr>
      `).join('');
      
      // Calculate and display totals
      calculateTotals(gridData);
      
      // Add event listeners for received amount inputs to auto-calculate total
      setupReceivedAmountListeners();
    } else if (formElements.projectionDetailsBody) {
      formElements.projectionDetailsBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #64748b;">No projection details found.</td></tr>';
    }
  }

  /**
   * Setup event listeners for received amount inputs
   */
  function setupReceivedAmountListeners() {
    if (!formElements.projectionDetailsBody) return;
    
    // Use event delegation to handle input changes
    formElements.projectionDetailsBody.addEventListener('input', (e) => {
      if (e.target.id && e.target.id.startsWith('received_')) {
        calculateReceivedTotal();
      }
    });
  }

  /**
   * Calculate total received amount from all input fields
   */
  function calculateReceivedTotal() {
    let totalReceived = 0;
    
    // Find all received amount inputs
    const receivedInputs = formElements.projectionDetailsBody.querySelectorAll('input[id^="received_"]');
    receivedInputs.forEach(input => {
      const value = parseFloat(input.value.replace(/,/g, '')) || 0;
      totalReceived += value;
    });
    
    // Update the total received field
    if (formElements.totalReceivedField) {
      formElements.totalReceivedField.value = formatCurrency(totalReceived);
    }
  }

  /**
   * Calculate and display totals
   */
  function calculateTotals(gridData) {
    const totalExpected = gridData.reduce((sum, row) => sum + (parseFloat(row.ExpectedAmount || row.expectedAmount || 0)), 0);
    const totalReceived = gridData.reduce((sum, row) => sum + (parseFloat(row.ReceivedAmount || row.receivedAmount || 0)), 0);
    
    if (formElements.totalExpectedField) {
      formElements.totalExpectedField.value = formatCurrency(totalExpected);
    }
    if (formElements.totalReceivedField) {
      formElements.totalReceivedField.value = formatCurrency(totalReceived);
    }
  }

  /**
   * Update totals from DOM inputs (used by event listeners)
   */
  function updateTotals() {
    if (!formElements.projectionDetailsBody) return;
    
    let totalExpected = 0;
    let totalReceived = 0;
    
    const rows = formElements.projectionDetailsBody.querySelectorAll('tr');
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 4) {
        // Expected amount is in 3rd column (index 2)
        const expectedText = cells[2]?.textContent || '0';
        totalExpected += parseFloat(expectedText.replace(/,/g, '')) || 0;
        
        // Received amount input is in 4th column (index 3)
        const receivedInput = cells[3]?.querySelector('input');
        if (receivedInput) {
          totalReceived += parseFloat(receivedInput.value) || 0;
        }
      }
    });
    
    if (formElements.totalExpectedField) {
      formElements.totalExpectedField.value = formatCurrency(totalExpected);
    }
    if (formElements.totalReceivedField) {
      formElements.totalReceivedField.value = formatCurrency(totalReceived);
    }
  }

  /**
   * Format number as currency
   */
  function formatCurrency(value) {
    const num = parseFloat(value) || 0;
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /**
   * Clear active state from all action buttons
   */
  function clearActiveButtons() {
    const buttons = [formElements.viewBtn, formElements.addBtn, formElements.editBtn];
    buttons.forEach(btn => {
      if (btn) btn.classList.remove('active');
    });
  }

  /**
   * Disable Collection Details section and grid
   */
  function disableCollectionSection() {
    // Disable Collection Details fields
    if (formElements.valueDateField) formElements.valueDateField.disabled = true;
    if (formElements.tillField) formElements.tillField.disabled = true;
    if (formElements.transactionTypeSelect) formElements.transactionTypeSelect.disabled = true;
    if (formElements.refField) formElements.refField.disabled = true;
    if (formElements.centerCollectionAcctIdField) formElements.centerCollectionAcctIdField.disabled = true;
    if (formElements.contraAccountIdField) formElements.contraAccountIdField.disabled = true;
    if (formElements.narrationField) formElements.narrationField.disabled = true;

    // Disable grid received amount inputs
    if (formElements.projectionDetailsBody) {
      const inputs = formElements.projectionDetailsBody.querySelectorAll('input[type="text"]');
      inputs.forEach(input => input.disabled = true);
    }

    // Disable Save button
    if (formElements.saveBtn) formElements.saveBtn.disabled = true;

    console.log('Collection section disabled');
  }

  /**
   * Enable Collection Details section and grid
   */
  function enableCollectionSection() {
    // Enable Collection Details fields
    if (formElements.valueDateField) {
      formElements.valueDateField.disabled = false;
      formElements.valueDateField.removeAttribute('readonly');
    }
    if (formElements.transactionTypeSelect) formElements.transactionTypeSelect.disabled = false;
    if (formElements.refField) formElements.refField.disabled = false;
    if (formElements.centerCollectionAcctIdField) formElements.centerCollectionAcctIdField.disabled = false;
    if (formElements.narrationField) formElements.narrationField.disabled = false;

    // Enable till and contra account based on transaction type
    const transactionType = formElements.transactionTypeSelect?.value;
    if (transactionType === 'Cash') {
      if (formElements.tillField) formElements.tillField.disabled = false;
      if (formElements.contraAccountIdField) formElements.contraAccountIdField.disabled = true;
    } else {
      if (formElements.tillField) formElements.tillField.disabled = true;
      if (formElements.contraAccountIdField) formElements.contraAccountIdField.disabled = false;
    }

    // Enable grid received amount inputs based on component type and expected amount
    if (formElements.projectionDetailsBody) {
      const rows = formElements.projectionDetailsBody.querySelectorAll('tr');
      rows.forEach(row => {
        const componentCell = row.querySelector('td:nth-child(2)');
        const expectedCell = row.querySelector('td:nth-child(3)');
        const receivedInput = row.querySelector('input[type="text"]');
        
        if (componentCell && expectedCell && receivedInput) {
          const componentName = componentCell.textContent.trim().toLowerCase();
          const expectedText = expectedCell.textContent.trim();
          const expectedAmount = parseFloat(expectedText.replace(/[^0-9.-]/g, '')) || 0;
          
          // Enable received amount based on component type
          if (componentName.includes('saving')) {
            // For Savings Amount: always enable regardless of expected value
            receivedInput.disabled = false;
          } else if (componentName.includes('loan')) {
            // For Loan Amount: only enable if expected amount is not 0
            receivedInput.disabled = expectedAmount === 0;
          } else {
            // For other components: enable if expected amount is not 0
            receivedInput.disabled = expectedAmount === 0;
          }
        }
      });
    }

    // Enable Save button
    if (formElements.saveBtn) formElements.saveBtn.disabled = false;

    console.log('Collection section enabled');
  }

  /**
   * Handle View action
   */
  async function handleViewAction() {
    console.log('View action clicked');
    clearActiveButtons();
    if (formElements.viewBtn) formElements.viewBtn.classList.add('active');
    await loadGroupDetails();
    // Keep collection section disabled after view - user must click Add to edit
    disableCollectionSection();
  }

  /**
   * Handle Add action
   */
  function handleAddAction() {
    console.log('Add action clicked');
    
    // Check if Branch ID and Center ID are filled
    const branchId = formElements.branchIdField?.value.trim();
    const centerId = formElements.centerIdField?.value.trim();
    
    if (!branchId || !centerId) {
      showToast('Please enter Branch ID and Center ID before adding', {
        title: 'Validation Error',
        variant: 'error',
        timeoutMs: 5000
      });
      return;
    }
    
    // Set current mode to 'add'
    currentMode = 'add';
    
    // Remove ready highlight
    if (formElements.addBtn) {
      formElements.addBtn.classList.remove('ready');
    }
    
    // Set active state
    clearActiveButtons();
    if (formElements.addBtn) formElements.addBtn.classList.add('active');
    
    // Disable Add button after clicking
    if (formElements.addBtn) {
      formElements.addBtn.disabled = true;
    }
    
    // Enable the collection section and grid
    enableCollectionSection();
    
    showToast('Form enabled for data entry', {
      title: 'Success',
      variant: 'success',
      timeoutMs: 3000
    });
  }

  /**
   * Handle Edit action
   */
  function handleEditAction() {
    console.log('Edit action clicked');
    
    // Set current mode to 'edit'
    currentMode = 'edit';
    
    clearActiveButtons();
    if (formElements.editBtn) formElements.editBtn.classList.add('active');
    // TODO: Implement edit logic
  }

  /**
   * Handle Delete action
   */
  function handleDeleteAction() {
    console.log('Delete action clicked');
    // TODO: Implement delete logic
  }

  /**
   * Handle Save action
   */
  /**
   * Generate XML DetailRecords from grid data
   * @returns {string} XML string for DetailRecords parameter
   */
  function generateDetailRecordsXML() {
    const gridBody = document.getElementById('projectionDetailsBody');
    if (!gridBody) return '';

    const rows = gridBody.querySelectorAll('tr');
    let xml = '';

    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      // Grid structure: [0]=checkbox, [1]=Component, [2]=ExpectedAmount, [3]=ReceivedAmount
      if (cells.length >= 4) {
        const component = cells[1].textContent.trim();
        const expectedAmount = cells[2].textContent.trim().replace(/,/g, '');
        const receivedInput = cells[3].querySelector('input');
        const receivedAmount = receivedInput ? receivedInput.value.trim().replace(/,/g, '') : '0';

        // Extract component type from component ID (last character)
        const componentType = component.length > 0 ? component.charAt(component.length - 1) : 'C';

        xml += `<dt_GrpGridDetails>`;
        xml += `<ExpectedAmount>${expectedAmount || '0'}</ExpectedAmount>`;
        xml += `<ReceivedAmount>${receivedAmount || '0'}</ReceivedAmount>`;
        xml += `<GrpColComponentID>${component}</GrpColComponentID>`;
        xml += `<GrpColComponentTypeID>${componentType} </GrpColComponentTypeID>`;
        xml += `</dt_GrpGridDetails>`;
      }
    });

    return xml;
  }

  /**
   * Validate form before saving
   * @returns {boolean} True if valid, false otherwise
   */
  function validateForm() {
    let isValid = true;
    const errors = [];

    // Clear previous invalid states
    clearInvalid(formElements.branchIdField);
    clearInvalid(formElements.centerIdField);
    clearInvalid(formElements.valueDateField);
    clearInvalid(formElements.transactionTypeSelect);

    // Required: Branch ID
    if (!formElements.branchIdField || !formElements.branchIdField.value.trim()) {
      markInvalid(formElements.branchIdField);
      errors.push('Branch ID is required');
      isValid = false;
    }

    // Required: Center ID
    if (!formElements.centerIdField || !formElements.centerIdField.value.trim()) {
      markInvalid(formElements.centerIdField);
      errors.push('Center ID is required');
      isValid = false;
    }

    // Required: Value Date
    if (!formElements.valueDateField || !formElements.valueDateField.value.trim()) {
      markInvalid(formElements.valueDateField);
      errors.push('Value Date is required');
      isValid = false;
    }

    // Required: Transaction Type
    if (!formElements.transactionTypeSelect || !formElements.transactionTypeSelect.value.trim()) {
      markInvalid(formElements.transactionTypeSelect);
      errors.push('Transaction Type is required');
      isValid = false;
    }

    // Show validation errors
    if (!isValid) {
      showToast(errors.join(', '), { title: 'Validation Error', variant: 'error', timeoutMs: 7000 });
    }

    return isValid;
  }

  /**
   * Handle Save action
   */
  async function handleSaveAction() {
    console.log('Save action clicked');

    // Validate form
    if (!validateForm()) {
      return;
    }

    try {
      // Show loading state
      if (formElements.saveBtn) {
        formElements.saveBtn.disabled = true;
        formElements.saveBtn.textContent = 'Saving...';
      }

      // Generate XML from grid
      const detailRecordsXML = generateDetailRecordsXML();

      // Determine UpdateCount based on current mode
      // Add mode = 1, Edit mode = 2
      const updateCount = currentMode === 'add' ? 1 : (currentMode === 'edit' ? 2 : 0);

      // Collect form data
      const requestData = {
        OurBranchID: formElements.branchIdField.value.trim(),
        TrxGroupRowID: 0, // 0 for new record
        TrxBatchID: '', // Empty for new
        TrxSerialID: formElements.serialIdField ? formElements.serialIdField.value.trim() : '',
        ValueDate: formElements.valueDateField.value.trim(),
        GroupID: formElements.centerIdField.value.trim(),
        LoanSchemeID: '', // Not on form
        OfficerID: formElements.creditOfficerIdField ? formElements.creditOfficerIdField.value.trim() : '',
        Narration: formElements.narrationField ? formElements.narrationField.value.trim() : '',
        ReferenceNo: formElements.refField ? formElements.refField.value.trim() : '',
        TransactionTypeID: formElements.transactionTypeSelect.value.trim(),
        TillID: formElements.tillIdField ? formElements.tillIdField.value.trim() : '',
        ContraBranchID: formElements.branchIdField.value.trim(), // Same as OurBranchID
        ContraAccountID: formElements.contraAccountIdField ? formElements.contraAccountIdField.value.trim() : '',
        IsPosted: 0, // Not posted yet
        TrxFlagID: '', // Default
        CreatedBy: 'web_portal',
        CreatedOn: new Date().toISOString(),
        SupervisionID: 'web_portal',
        DetailRecords: detailRecordsXML,
        UpdateCount: updateCount // 1 for Add, 2 for Edit
      };

      console.log('Save request data:', requestData);
      console.log('DetailRecords XML:', detailRecordsXML);

      // Call service
      const response = await GroupCollectionService.saveGroupCollection(requestData);

      console.log('Save response:', response);

      if (response && response.success) {
        showToast('Group collection saved successfully', { 
          title: 'Success', 
          variant: 'success', 
          timeoutMs: 5000 
        });

        // Auto-clear screen after successful save
        clearForm();
        clearActiveButtons();
        currentMode = null;
        disableCollectionSection();
        
        // Re-enable Add button
        if (formElements.addBtn) {
          formElements.addBtn.disabled = false;
        }
      } else {
        const errorMsg = response?.message || 'Failed to save group collection';
        showToast(errorMsg, { title: 'Error', variant: 'error', timeoutMs: 7000 });
      }

    } catch (error) {
      console.error('Error saving group collection:', error);
      showToast(error.message || 'An error occurred while saving', { 
        title: 'Error', 
        variant: 'error', 
        timeoutMs: 7000 
      });
    } finally {
      // Reset button state
      if (formElements.saveBtn) {
        formElements.saveBtn.disabled = false;
        formElements.saveBtn.textContent = 'Save';
      }
    }
  }

  /**
   * Handle Cancel action
   */
  function handleCancelAction() {
    console.log('Cancel action clicked');
    // Clear form fields
    clearForm();
    // Clear active button states
    clearActiveButtons();
    // Clear ready state from Add button
    if (formElements.addBtn) {
      formElements.addBtn.classList.remove('ready');
      formElements.addBtn.disabled = false; // Re-enable Add button
    }
    // Reset current mode
    currentMode = null;
    // Disable collection section after cancel
    disableCollectionSection();
  }

  /**
   * Clear all form fields
   */
  function clearForm() {
    if (formElements.branchIdField) formElements.branchIdField.value = '';
    if (formElements.branchNameField) formElements.branchNameField.value = '';
    if (formElements.centerIdField) formElements.centerIdField.value = '';
    if (formElements.centerNameField) formElements.centerNameField.value = '';
    if (formElements.creditOfficerIdField) formElements.creditOfficerIdField.value = '';
    if (formElements.creditOfficerNameField) formElements.creditOfficerNameField.value = '';
    if (formElements.serialIdField) formElements.serialIdField.value = '';
    
    // Clear Collection Details section
    if (formElements.valueDateField) formElements.valueDateField.value = '';
    if (formElements.tillField) formElements.tillField.value = '';
    if (formElements.tillIdField) formElements.tillIdField.value = '';
    if (formElements.transactionTypeSelect) formElements.transactionTypeSelect.value = '';
    if (formElements.refField) formElements.refField.value = '';
    if (formElements.centerCollectionAcctIdField) formElements.centerCollectionAcctIdField.value = '';
    if (formElements.centerCollectionAcctNameField) formElements.centerCollectionAcctNameField.value = '';
    if (formElements.contraAccountIdField) formElements.contraAccountIdField.value = '';
    if (formElements.contraAccountNameField) formElements.contraAccountNameField.value = '';
    if (formElements.narrationField) formElements.narrationField.value = '';
    
    // Clear Behind The Scene section
    if (formElements.savingBalanceField) formElements.savingBalanceField.textContent = '';
    if (formElements.memberField) formElements.memberField.textContent = '';
    if (formElements.osLoanBalanceField) formElements.osLoanBalanceField.textContent = '';
    if (formElements.netBalanceField) formElements.netBalanceField.textContent = '';
    if (formElements.savingOsLoanPctField) formElements.savingOsLoanPctField.textContent = '';
    if (formElements.totalLoanAmountField) formElements.totalLoanAmountField.textContent = '';
    if (formElements.createdByField) formElements.createdByField.textContent = '';
    if (formElements.supervisedByField) formElements.supervisedByField.textContent = '';
    if (formElements.createdOnField) formElements.createdOnField.textContent = '';
    if (formElements.supervisedOnField) formElements.supervisedOnField.textContent = '';
    
    // Clear totals
    if (formElements.totalExpectedField) formElements.totalExpectedField.value = '';
    if (formElements.totalReceivedField) formElements.totalReceivedField.value = '';
    
    // Clear projection details table
    if (formElements.projectionDetailsBody) {
      formElements.projectionDetailsBody.innerHTML = '<tr style="text-align: center; color: #64748b;"><td colspan="4" style="padding: 20px;">No records to display.</td></tr>';
    }
  }

  /**
   * Initialize module when DOM is ready
   */
  function init() {
    initializeElements();
    bindEvents();
    initSearchModal();
    wireSectionToggles();
    ensureToastContainer();
    loadTransactionTypeDropdown();
    initializeDatePicker();
    disableCollectionSection(); // Disable collection section on page load
    console.log('Group Collection module initialized');
  }

  /**
   * Wire section toggle functionality
   */
  function wireSectionToggles() {
    document.querySelectorAll('[data-section-toggle]').forEach(header => {
      header.addEventListener('click', function() {
        const section = this.closest('[data-section]');
        const content = section?.querySelector('[data-section-content]');
        const toggleBtn = this.querySelector('.section-toggle-btn');
        const icon = toggleBtn?.querySelector('i');
        
        if (content) {
          const isHidden = content.hidden;
          content.hidden = !isHidden;
          
          if (icon) {
            icon.className = isHidden ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
          }
          if (toggleBtn) {
            toggleBtn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
          }
        }
      });
    });
  }

  /**
   * Initialize Flatpickr date picker for Value Date field
   */
  function initializeDatePicker() {
    if (formElements.valueDateField && typeof flatpickr !== 'undefined') {
      const fpInstance = flatpickr(formElements.valueDateField, {
        dateFormat: 'd M Y',
        altInput: true,
        altFormat: 'd M Y',
        allowInput: false,
        disableMobile: true,
        onReady: function(selectedDates, dateStr, instance) {
          // Style the calendar icon
          instance.calendarContainer.style.boxShadow = '0 8px 18px rgba(44, 62, 80, 0.15)';
        }
      });
      
      // Make calendar icon clickable - search within the input-group container
      const inputGroup = formElements.valueDateField.closest('.input-group');
      const calendarIcon = inputGroup ? inputGroup.querySelector('.date-picker-icon') : null;
      if (calendarIcon) {
        calendarIcon.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          if (!formElements.valueDateField.disabled) {
            fpInstance.open();
          }
        });
      }
      
      console.log('Date picker initialized');
    }
  }

  /**
   * Load Transaction Type dropdown from system codes
   */
  async function loadTransactionTypeDropdown() {
    try {
      const options = await LookupService.getSystemCodeOptions('CashOrTrf');
      
      if (formElements.transactionTypeSelect) {
        formElements.transactionTypeSelect.innerHTML = '<option value="">--Select--</option>';
        
        options.forEach(opt => {
          formElements.transactionTypeSelect.innerHTML += `<option value="${opt.value}">${opt.label}</option>`;
        });
        
        console.log('Transaction Type dropdown loaded:', options.length, 'options');
      }
    } catch (error) {
      console.error('Error loading transaction type dropdown:', error);
    }
  }

  /**
   * Ensure toast container exists
   */
  function ensureToastContainer() {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container position-fixed top-0 end-0 p-3';
      container.style.zIndex = '1100';
      document.body.appendChild(container);
    }
  }

  /**
   * Show toast notification
   */
  function showToast(message, { title = 'Notification', variant = 'info', timeoutMs = 5000 } = {}) {
    const container = document.querySelector('.toast-container');
    if (!container) return;

    // Map variant to Bootstrap color classes
    const variantMap = {
      success: 'text-bg-success',
      error: 'text-bg-danger',
      warning: 'text-bg-warning',
      info: 'text-bg-info'
    };
    const colorClass = variantMap[variant] || 'text-bg-info';

    const toastId = 'toast-' + Date.now();
    const toastHtml = `
      <div id="${toastId}" class="toast ${colorClass}" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="${timeoutMs}">
        <div class="toast-header ${colorClass}">
          <strong class="me-auto">${title}</strong>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
          ${message}
        </div>
      </div>
    `;
    
    container.insertAdjacentHTML('beforeend', toastHtml);
    const toastEl = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastEl);
    toast.show();

    // Remove from DOM after hidden
    toastEl.addEventListener('hidden.bs.toast', () => {
      toastEl.remove();
    });
  }

  /**
   * Mark field as invalid
   */
  function markInvalid(el) {
    if (el) el.classList.add('kairo-invalid');
  }

  /**
   * Clear invalid state
   */
  function clearInvalid(el) {
    if (el) el.classList.remove('kairo-invalid');
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose functions for external use
  window.GroupCollection = {
    showToast,
    clearForm,
    markInvalid,
    clearInvalid,
    selectBranch,
    selectCenter,
    selectContraAccount
  };
})();;
