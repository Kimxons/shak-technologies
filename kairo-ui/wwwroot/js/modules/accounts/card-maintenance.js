/**
 * Card Maintenance Module - Complete Implementation
 * Handles CRUD operations for card management within Account Maintenance
 */

(function () {
  'use strict';

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  const state = {
    currentMode: 'VIEW', // VIEW, ADD, EDIT
    currentRecord: null,
    cardList: [],
    isLoading: false,
    accountContext: {}
  };

  // ============================================================================
  // DOM ELEMENTS
  // ============================================================================
  const elements = {
    // Header & Controls
    headerRefresh: document.querySelector('[data-action="refresh"]'),
    headerMaximize: document.querySelector('[data-action="maximize"]'),
    headerClose: document.querySelector('[data-action="close"]'),

    // Search Fields
    trackingId: document.getElementById('trackingId'),
    cardProvider: document.getElementById('cardProvider'),
    cardName: document.getElementById('cardName'),
    cardType: document.getElementById('cardType'),

    // Card Details Fields
    cardId: document.getElementById('cardId'),
    cardRemarks: document.getElementById('cardRemarks'),
    isApproved: document.getElementById('isApproved'),
    approvedDate: document.getElementById('approvedDate'),
    isExported: document.getElementById('isExported'),
    exportedDate: document.getElementById('exportedDate'),
    isActive: document.getElementById('isActive'),
    activatedDate: document.getElementById('activatedDate'),
    startDate: document.getElementById('startDate'),
    expiryDate: document.getElementById('expiryDate'),
    collected: document.getElementById('collected'),
    collectionDate: document.getElementById('collectionDate'),
    deactivationDate: document.getElementById('deactivationDate'),
    reason: document.getElementById('reason'),
    reactivationDate: document.getElementById('reactivationDate'),
    reactivationRemarks: document.getElementById('reactivationRemarks'),
    status: document.getElementById('status'),
    initialTransaction: document.getElementById('initialTransaction'),

    // Audit Fields - using correct IDs from HTML
    makerID: document.getElementById('MakerID'),
    makerDT: document.getElementById('MakerDT'),
    checkerID: document.getElementById('CheckerID'),
    checkerDT: document.getElementById('CheckerDT'),
    modifierID: document.getElementById('ModifierID'),
    modifierDT: document.getElementById('ModifierDT'),

    // List & Grid
    cardsListTable: document.getElementById('cardsListTable'),
    recordCount: document.getElementById('recordCount'),

    // Action Buttons
    btnView: document.querySelector('[data-action="view"]'),
    btnAdd: document.querySelector('[data-action="add"]'),
    btnEdit: document.querySelector('[data-action="edit"]'),
    btnSave: document.querySelector('[data-action="save"]'),
    btnDelete: document.querySelector('[data-action="delete"]'),
    btnCancel: document.querySelector('[data-action="cancel"]'),
    btnClose: document.querySelector('[data-action="close"]'),

    // Messages & Loading
    messagePanel: document.querySelector('.am-message-panel'),
    loadingOverlay: document.getElementById('loadingOverlay')
  };

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  
  /**
   * Show message in message panel
   */
  function showMessage(message, type = 'info') {
    if (!elements.messagePanel) return;
    
    const span = elements.messagePanel.querySelector('span');
    if (span) span.textContent = message;
    
    elements.messagePanel.classList.remove('show', 'success', 'error', 'warning');
    elements.messagePanel.classList.add('show', type);
    
    setTimeout(() => {
      elements.messagePanel.classList.remove('show');
    }, 4000);
  }

  /**
   * Show loading overlay
   */
  function showLoader(show) {
    if (!elements.loadingOverlay) return;
    elements.loadingOverlay.hidden = !show;
    state.isLoading = show;
  }

  /**
   * Get context from parent window
   * Also retrieves AccountName for auto-populating CardName
   */
  function getContextFromParent() {
    try {
      if (window.parent && window.parent !== window) {
        const context = window.parent.AccountMaintenanceState || {};
        state.accountContext = {
          accountId: context.AccountID || '',
          accountName: context.AccountName || '', // Get AccountName for CardName auto-population
          clientId: context.ClientID || '',
          branchId: context.OurBranchID || '',
          operatorId: context.OperatorID || ''
        };
      }
    } catch (e) {
      console.error('[CardMaintenance] Error getting context from parent:', e);
    }
  }

  /**
   * Post close message to parent
   */
  function postClose() {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'accountMaintenanceChildClose' }, '*');
      }
    } catch (e) {
      console.error('[CardMaintenance] Error posting close message:', e);
    }
  }

  /**
   * Format date for display
   */
  function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  /**
   * Format date for input fields (YYYY-MM-DD format)
   */
  function formatDateForInput(dateStr) {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  }

  /**
   * Get all form values
   */
  function getFormValues() {
    return {
      trackingId: elements.trackingId?.value?.trim() || '',
      cardProvider: elements.cardProvider?.value?.trim() || '',
      cardName: elements.cardName?.value?.trim() || '',
      cardType: elements.cardType?.value?.trim() || '',
      cardId: elements.cardId?.value?.trim() || '',
      cardRemarks: elements.cardRemarks?.value?.trim() || '',
      isApproved: elements.isApproved?.checked || false,
      approvedDate: elements.approvedDate?.value || '',
      isExported: elements.isExported?.checked || false,
      exportedDate: elements.exportedDate?.value || '',
      isActive: elements.isActive?.checked || false,
      activatedDate: elements.activatedDate?.value || '',
      startDate: elements.startDate?.value || '',
      expiryDate: elements.expiryDate?.value || '',
      collected: elements.collected?.checked || false,
      collectionDate: elements.collectionDate?.value || '',
      deactivationDate: elements.deactivationDate?.value || '',
      reason: elements.reason?.value?.trim() || '',
      reactivationDate: elements.reactivationDate?.value || '',
      reactivationRemarks: elements.reactivationRemarks?.value?.trim() || '',
      status: elements.status?.value?.trim() || '',
      initialTransaction: elements.initialTransaction?.value?.trim() || ''
    };
  }

  /**
   * Set form values from record
   */
  function setFormValues(record) {
    if (!record) {
      console.warn('[CardMaintenance] setFormValues called with null record');
      return;
    }

    console.log('[CardMaintenance] Setting form values from record:', record);

    if (elements.trackingId) elements.trackingId.value = record.trackingCardId || record.trackingId || '';
    if (elements.cardProvider) {
      elements.cardProvider.value = record.cardProvider || '';
      console.log('[CardMaintenance] Setting cardProvider to:', record.cardProvider, '- Element value:', elements.cardProvider.value);
    }
    if (elements.cardName) elements.cardName.value = record.cardName || '';
    if (elements.cardType) {
      elements.cardType.value = record.cardType || '';
      console.log('[CardMaintenance] Setting cardType to:', record.cardType, '- Element value:', elements.cardType.value);
    }
    if (elements.cardId) elements.cardId.value = record.cardId || '';
    if (elements.cardRemarks) elements.cardRemarks.value = record.cardRemarks || '';
    if (elements.isApproved) elements.isApproved.checked = record.isApproved || false;
    if (elements.approvedDate) elements.approvedDate.value = formatDateForInput(record.approvedDate) || '';
    if (elements.isExported) elements.isExported.checked = record.isExported || false;
    if (elements.exportedDate) elements.exportedDate.value = formatDateForInput(record.exportedDate) || '';
    if (elements.isActive) elements.isActive.checked = record.isActive !== false;
    if (elements.activatedDate) elements.activatedDate.value = formatDateForInput(record.activatedDate) || '';
    if (elements.startDate) elements.startDate.value = formatDateForInput(record.startDate) || '';
    if (elements.expiryDate) elements.expiryDate.value = formatDateForInput(record.expiryDate) || '';
    if (elements.collected) elements.collected.checked = record.collected || false;
    if (elements.collectionDate) elements.collectionDate.value = formatDateForInput(record.collectionDate) || '';
    if (elements.deactivationDate) elements.deactivationDate.value = formatDateForInput(record.deactivationDate) || '';
    if (elements.reason) elements.reason.value = record.reason || '';
    if (elements.reactivationDate) elements.reactivationDate.value = formatDateForInput(record.reactivationDate) || '';
    if (elements.reactivationRemarks) elements.reactivationRemarks.value = record.reactivationRemarks || '';
    if (elements.status) elements.status.value = record.status || '';
    if (elements.initialTransaction) elements.initialTransaction.value = record.initialTransaction || '';
    
    // Populate audit section
    if (elements.makerID) elements.makerID.textContent = record.createdBy || '-';
    if (elements.makerDT) elements.makerDT.textContent = formatDate(record.createdOn) || '-';
    if (elements.checkerID) elements.checkerID.textContent = record.checkedBy || '-';
    if (elements.checkerDT) elements.checkerDT.textContent = formatDate(record.checkedOn) || '-';
    if (elements.modifierID) elements.modifierID.textContent = record.modifiedBy || '-';
    if (elements.modifierDT) elements.modifierDT.textContent = formatDate(record.modifiedOn) || '-';
  }

  /**
   * Clear all form fields
   */
  function clearForm() {
    document.querySelectorAll('input[type="text"], input[type="date"], textarea, select').forEach(el => {
      if (el.type === 'checkbox') {
        el.checked = el.id === 'isActive';
      } else {
        el.value = '';
      }
    });
  }

  /**
   * Get next tracking ID based on existing cards
   */
  function getNextTrackingId() {
    if (state.cardList.length === 0) return 1;
    
    const maxId = Math.max(...state.cardList.map(card => {
      const id = parseInt(card.trackingCardId, 10);
      return isNaN(id) ? 0 : id;
    }));
    
    return maxId + 1;
  }

  /**
   * Clear audit section
   */
  function clearAuditSection() {
    if (elements.makerID) elements.makerID.textContent = '-';
    if (elements.makerDT) elements.makerDT.textContent = '-';
    if (elements.checkerID) elements.checkerID.textContent = '-';
    if (elements.checkerDT) elements.checkerDT.textContent = '-';
    if (elements.modifierID) elements.modifierID.textContent = '-';
    if (elements.modifierDT) elements.modifierDT.textContent = '-';
  }

  /**
   * Clear row selection in table
   */
  function clearRowSelection() {
    if (!elements.cardsListTable) return;
    const rows = elements.cardsListTable.querySelectorAll('tbody tr');
    rows.forEach(row => row.classList.remove('selected', 'table-active'));
  }

  /**
   * Toggle form controls enabled/disabled state
   */
  function toggleFormControls(enabled) {
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.disabled = !enabled;
    });
  }

  // ============================================================================
  // MODE MANAGEMENT
  // ============================================================================

  /**
   * Set mode to VIEW
   */
  function setViewMode() {
    state.currentMode = 'VIEW';
    toggleFormControls(false);
    
    if (elements.btnView) elements.btnView.disabled = false;
    if (elements.btnAdd) elements.btnAdd.disabled = false;
    if (elements.btnEdit) elements.btnEdit.disabled = false;
    if (elements.btnDelete) elements.btnDelete.disabled = false;
    if (elements.btnSave) elements.btnSave.disabled = true;
    if (elements.btnCancel) elements.btnCancel.disabled = true;
  }

  /**
   * Set mode to ADD
   */
  function setAddMode() {
    state.currentMode = 'ADD';
    state.currentRecord = null;
    clearForm();
    toggleFormControls(true);
    
    // Auto-generate next TrackingID
    const nextTrackingId = getNextTrackingId();
    if (elements.trackingId) {
      elements.trackingId.value = nextTrackingId;
      elements.trackingId.disabled = true; // TrackingID should be read-only
    }
    
    // Auto-populate CardName from AccountName (from parent Account Maintenance form)
    // CardName is readonly as it comes from the account
    if (elements.cardName) {
      elements.cardName.value = state.accountContext.accountName || '';
      elements.cardName.disabled = true; // CardName is readonly - comes from account
    }
    
    // Clear audit section for new record
    clearAuditSection();
    
    // Clear row selection
    clearRowSelection();
    
    if (elements.btnView) elements.btnView.disabled = true;
    if (elements.btnAdd) elements.btnAdd.disabled = true;
    if (elements.btnEdit) elements.btnEdit.disabled = true;
    if (elements.btnDelete) elements.btnDelete.disabled = true;
    if (elements.btnSave) elements.btnSave.disabled = false;
    if (elements.btnCancel) elements.btnCancel.disabled = false;

    showMessage('Add mode: Enter card details and click Save', 'info');
  }

  /**
   * Set mode to EDIT
   */
  function setEditMode() {
    state.currentMode = 'EDIT';
    toggleFormControls(true);
    
    // TrackingID should be read-only in edit mode
    if (elements.trackingId) {
      elements.trackingId.disabled = true;
    }
    
    // CardName should be read-only in edit mode - comes from account
    if (elements.cardName) {
      elements.cardName.disabled = true;
    }
    
    if (elements.btnView) elements.btnView.disabled = true;
    if (elements.btnAdd) elements.btnAdd.disabled = true;
    if (elements.btnEdit) elements.btnEdit.disabled = true;
    if (elements.btnDelete) elements.btnDelete.disabled = true;
    if (elements.btnSave) elements.btnSave.disabled = false;
    if (elements.btnCancel) elements.btnCancel.disabled = false;

    showMessage('Edit mode: Modify card details and click Save', 'info');
  }

  // ============================================================================
  // CARD LIST OPERATIONS
  // ============================================================================

  /**
   * Load cards list from API
   */
  async function loadCardsList() {
    // Check if we have an AccountID - required for loading cards
    if (!state.accountContext.accountId) {
      console.log('[CardMaintenance] No AccountID found, skipping card list load');
      state.cardList = [];
      renderCardsList();
      updateRecordCount();
      return;
    }

    showLoader(true);
    try {
      const accountService = window.accountservice || window.AccountService;
      
      // Try getAccountElectronicCards first (gets cards by AccountID)
      if (accountService && typeof accountService.getAccountElectronicCards === 'function') {
        const requestData = {
          AccountID: state.accountContext.accountId || ''
        };
        
        console.log('[CardMaintenance] Loading cards with getAccountElectronicCards:', requestData);
        const response = await accountService.getAccountElectronicCards(requestData);
        console.log('[CardMaintenance] Cards response:', response);
        
        processCardsResponse(response);
      } 
      // Fallback to getElectronicCards if getAccountElectronicCards not available
      else if (accountService && typeof accountService.getElectronicCards === 'function') {
        // For getElectronicCards (stage-wise), we need to get ALL stages and filter by AccountID
        const requestData = {
          BankID: '00',
          OurBranchID: state.accountContext.branchId || '',
          StageID: '', // Empty to get all cards
          OperatorID: state.accountContext.operatorId || ''
        };
        
        console.log('[CardMaintenance] Loading cards with getElectronicCards (fallback):', requestData);
        const response = await accountService.getElectronicCards(requestData);
        console.log('[CardMaintenance] Cards response:', response);
        
        processCardsResponse(response);
      } else {
        console.warn('[CardMaintenance] No card service available');
        state.cardList = [];
      }

      renderCardsList();
      updateRecordCount();
      if (state.cardList.length > 0) {
        showMessage('Cards list loaded successfully', 'success');
      } else {
        console.log('[CardMaintenance] No cards found for this account. Note: p_GetAccountElectronicCards SP may need to be created on the database.');
      }
    } catch (error) {
      console.error('[CardMaintenance] Error loading cards:', error);
      // Check if error is due to missing SP
      const errorMsg = error?.message || error?.Message || JSON.stringify(error);
      if (errorMsg.includes('procedure') || errorMsg.includes('not found') || errorMsg.includes('does not exist')) {
        console.warn('[CardMaintenance] The stored procedure p_GetAccountElectronicCards may not exist. Please create it to enable card loading by AccountID.');
        showMessage('Card service not configured', 'warning');
      } else {
        showMessage('Error loading cards list', 'error');
      }
      state.cardList = [];
      renderCardsList();
    } finally {
      showLoader(false);
    }
  }

  /**
   * Map card status values to CreditCardStatus system codes
   * CreditCardStatus codes: A=Pending Card Issuance, I=Card Issued, P=Pending Approval, R=Rejected
   */
  function mapCardStatusToCode(cardStatus) {
    if (!cardStatus) return '';
    
    const statusMap = {
      'APPLIED': 'P',           // Applied = Pending Approval
      'PENDING APPROVAL': 'P',  // Pending Approval
      'PENDING': 'P',           // Pending
      'APPROVED': 'A',          // Approved = Pending Card Issuance
      'A': 'A',                 // Already in code format
      'ISSUED': 'I',            // Issued = Card Issued
      'CARD ISSUED': 'I',       // Card Issued
      'I': 'I',                 // Already in code format
      'REJECTED': 'R',          // Rejected
      'REJECTED CARD APPLICATION': 'R',
      'R': 'R',                 // Already in code format
      'BLOCKED': 'R',           // Blocked = Rejected
      'EXPIRED': 'R',           // Expired = Rejected
      'P': 'P',                 // Already in code format
      'PENDING ISSUANCE': 'A'   // Pending Issuance
    };
    
    const upperStatus = String(cardStatus).toUpperCase().trim();
    const mappedCode = statusMap[upperStatus];
    
    console.log('[CardMaintenance] Mapping status:', cardStatus, '-> Code:', mappedCode);
    return mappedCode || '';
  }

  /**
   * Process cards response from API
   */
  function processCardsResponse(response) {
    // Handle response structure - could be Details, Details01, or data
    let cards = [];
    if (response?.success || response?.IsSuccess) {
      cards = response?.data?.Details || response?.data?.Details01 || response?.Details || response?.Details01 || [];
      if (cards && !Array.isArray(cards)) cards = [cards];
    }
    
    // Log raw card data for debugging
    console.log('[CardMaintenance] Raw cards from API:', cards);
    if (cards && cards.length > 0) {
      console.log('[CardMaintenance] First card fields:', Object.keys(cards[0]));
      console.log('[CardMaintenance] First card data:', JSON.stringify(cards[0], null, 2));
    }
    
    // Check if response contains actual card data (has TrackingCardID or CardID)
    const hasCardData = cards && cards.length > 0 && (cards[0].TrackingCardID || cards[0].CardID || cards[0].CardName || cards[0].CardProvider);
    
    if (!hasCardData) {
      console.log('[CardMaintenance] Response does not contain card data, using empty list');
      state.cardList = [];
      return;
    }
    
    // Filter cards by AccountID if returned data contains multiple accounts
    const filteredCards = cards.filter(card => {
      const cardAccountId = card.AccountID || card.accountId || '';
      return !cardAccountId || cardAccountId === state.accountContext.accountId;
    });
    
    state.cardList = filteredCards.map(card => ({
      trackingCardId: card.TrackingCardID || card.trackingCardId || card.TrackingID || '',
      cardName: card.CardName || card.cardName || '',
      cardId: card.CardID || card.cardId || '',
      cardProvider: card.CardProvider || card.cardProvider || '',
      cardType: card.CardType || card.cardType || '',
      cardRemarks: card.Remarks || card.cardRemarks || card.CardRemarks || '',
      isApproved: card.IsApproved || card.isApproved || false,
      approvedDate: card.ApprovalDate || card.approvedDate || '',
      isExported: card.IsCardExported || card.isExported || false,
      exportedDate: card.CardExportedDate || card.exportedDate || '',
      isActive: card.IsActive !== undefined ? card.IsActive : (card.isActive !== undefined ? card.isActive : true),
      activatedDate: card.ActvationDate || card.ActivationDate || card.activatedDate || '',
      startDate: card.StartDate || card.startDate || '',
      expiryDate: card.ExpiryDate || card.expiryDate || '',
      collected: card.IsCollected || card.collected || false,
      collectionDate: card.CollectionDate || card.collectionDate || '',
      reason: card.CardBlockReasonID || card.reason || card.Reason || '',
      deactivationDate: card.CardBlockDate || card.deactivationDate || '',
      reactivationDate: card.ReactivationDate || card.reactivationDate || '',
      reactivationRemarks: card.ReactivationRemarks || card.reactivationRemarks || '',
      status: mapCardStatusToCode(card.CardStatus || card.Status || card.status || ''),
      initialTransaction: card.InitialTransaction || card.initialTransaction || '',
      // Audit fields
      createdBy: card.CreatedBy || card.createdBy || card.MakerID || '',
      createdOn: card.CreatedOn || card.createdOn || card.MakerDT || '',
      modifiedBy: card.ModifiedBy || card.modifiedBy || card.ModifierID || '',
      modifiedOn: card.ModifiedOn || card.modifiedOn || card.Modifiedon || card.ModifierDT || '',
      checkedBy: card.CheckedBy || card.SupervisedBy || '',
      checkedOn: card.CheckedOn || card.SupervisedOn || ''
    }));
    
    console.log('[CardMaintenance] Processed card list:', state.cardList);
  }

  /**
   * Render cards list in table
   */
  function renderCardsList() {
    if (!elements.cardsListTable || !elements.cardsListTable.querySelector('tbody')) return;

    const tbody = elements.cardsListTable.querySelector('tbody');
    tbody.innerHTML = '';

    if (state.cardList.length === 0) {
      tbody.innerHTML = '<tr class="table-empty"><td colspan="5">No records to display.</td></tr>';
      return;
    }

    state.cardList.forEach((card, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${card.trackingCardId || '-'}</td>
        <td>${card.cardId || '-'}</td>
        <td>${state.accountContext.accountId || '-'}</td>
        <td>${card.cardProvider || '-'}</td>
        <td>${card.cardRemarks || '-'}</td>
      `;
      row.addEventListener('click', () => selectCard(index));
      tbody.appendChild(row);
    });
  }

  /**
   * Update record count display
   */
  function updateRecordCount() {
    if (elements.recordCount) {
      elements.recordCount.textContent = `(${state.cardList.length} records)`;
    }
  }

  /**
   * Select card from list
   */
  function selectCard(index) {
    if (index < 0 || index >= state.cardList.length) return;
    
    // Clear previous selection
    clearRowSelection();
    
    // Highlight selected row
    if (elements.cardsListTable) {
      const rows = elements.cardsListTable.querySelectorAll('tbody tr');
      if (rows[index]) {
        rows[index].classList.add('selected', 'table-active');
      }
    }
    
    state.currentRecord = state.cardList[index];
    console.log('[CardMaintenance] Selected card:', state.currentRecord);
    setFormValues(state.currentRecord);
    setViewMode();
  }

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  /**
   * Validate form before save
   * Note: CardName is not required as it is auto-populated from AccountName
   * Note: CardID is not required as it will be provided by the database
   */
  function validateForm() {
    const values = getFormValues();
    const errors = [];

    if (!values.cardProvider) errors.push('Card Provider is required');
    if (!values.cardType) errors.push('Card Type is required');

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Get next tracking card ID for new card
   */
  async function getNextTrackingCardID() {
    const accountService = window.accountservice || window.AccountService;
    if (!accountService || typeof accountService.getNextTrackingCardID !== 'function') {
      console.warn('[CardMaintenance] getNextTrackingCardID not available');
      return null;
    }

    try {
      const requestData = {
        BankID: '00',
        OurBranchID: state.accountContext.branchId || '',
        AccountID: state.accountContext.accountId || ''
      };
      
      console.log('[CardMaintenance] Getting next tracking card ID:', requestData);
      const response = await accountService.getNextTrackingCardID(requestData);
      console.log('[CardMaintenance] Next tracking card ID response:', response);
      
      // Extract the tracking ID from response
      if (response?.success || response?.IsSuccess) {
        const details = response?.Details || response?.data?.Details || response?.data || [];
        console.log('[CardMaintenance] Details array:', details);
        
        if (details.length > 0) {
          const firstItem = details[0];
          console.log('[CardMaintenance] First item in details:', firstItem);
          
          // Try multiple possible field names
          const trackingId = firstItem?.TrackingCardID || 
                            firstItem?.NextTrackingCardID || 
                            firstItem?.NextID ||
                            firstItem?.CardID ||
                            firstItem?.ID ||
                            // If it's a single value object, get the first value
                            (Object.keys(firstItem || {}).length === 1 ? Object.values(firstItem)[0] : null);
          
          console.log('[CardMaintenance] Extracted tracking ID:', trackingId);
          return trackingId;
        }
      }
      return null;
    } catch (error) {
      console.error('[CardMaintenance] Error getting next tracking card ID:', error);
      return null;
    }
  }

  /**
   * Save card (Add or Update)
   */
  async function saveCard() {
    const validation = validateForm();
    if (!validation.isValid) {
      showMessage(validation.errors.join('; '), 'error');
      return;
    }

    // Check if we have an AccountID - required for saving cards
    if (!state.accountContext.accountId) {
      showMessage('Cannot save card: No account loaded in Account Maintenance', 'error');
      return;
    }

    showLoader(true);
    try {
      const values = getFormValues();
      const isNew = state.currentMode === 'ADD';
      
      // CardName should come from AccountName in the parent form context
      // If not provided in form, use accountContext.accountName
      const cardNameValue = values.cardName || state.accountContext.accountName || '';
      
      // For new cards, get the next tracking card ID first
      let trackingCardId = '';
      if (isNew) {
        trackingCardId = await getNextTrackingCardID();
        if (!trackingCardId) {
          showMessage('Could not generate tracking card ID', 'error');
          showLoader(false);
          return;
        }
        console.log('[CardMaintenance] Generated tracking card ID:', trackingCardId);
      } else {
        trackingCardId = state.currentRecord?.trackingCardId || '';
      }
      
      // Build payload matching legacy p_AddEditElectronicCard parameters exactly
      // Uses IsNew: 'ADD'/'EDIT' (string), empty strings for dates
      const payload = {
        TrackingCardID: trackingCardId,
        CardName: cardNameValue,
        CardID: values.cardId || '',
        CardProvider: values.cardProvider || '',
        CardType: values.cardType || '',
        BranchID: state.accountContext.branchId || '',
        AccountID: state.accountContext.accountId || '',
        Remarks: values.cardRemarks || '',
        CreatedBy: state.accountContext.operatorId || '',
        CreatedOn: '',
        ModifiedBy: state.accountContext.operatorId || '',
        ModifiedOn: '',
        IsNew: isNew ? 'ADD' : 'EDIT',
        IsActive: values.isActive ? 1 : 0,
        ActvationDate: values.activatedDate || '',
        StartDate: values.startDate || '',
        ExpiryDate: values.expiryDate || '',
        IsCollected: values.collected ? 1 : 0,
        CollectionDate: values.collectionDate || '',
        CardBlockDate: values.deactivationDate || '',
        CardBlockReasonID: values.reason || 'null',
        ReactivationDate: values.reactivationDate || '',
        ReactivationRemarks: values.reactivationRemarks || ''
      };

      console.log('[CardMaintenance] Saving card with payload:', payload);

      // Call API to save
      const accountService = window.accountservice || window.AccountService;
      if (accountService && typeof accountService.addEditElectronicCard === 'function') {
        const response = await accountService.addEditElectronicCard(payload);
        console.log('[CardMaintenance] Save response:', response);
        
        if (response?.success || response?.IsSuccess) {
          showMessage(`Card ${isNew ? 'added' : 'updated'} successfully`, 'success');
          await loadCardsList();
          setViewMode();
        } else {
          showMessage(response?.message || response?.Message || 'Error saving card', 'error');
        }
      } else {
        console.error('[CardMaintenance] AccountService.addEditElectronicCard not available');
        showMessage('Card service not available', 'error');
      }
    } catch (error) {
      console.error('[CardMaintenance] Error saving card:', error);
      showMessage('Error saving card', 'error');
    } finally {
      showLoader(false);
    }
  }

  /**
   * Delete card
   */
  async function deleteCard() {
    if (!state.currentRecord) {
      showMessage('Please select a card to delete', 'warning');
      return;
    }

    if (!state.accountContext.accountId) {
      showMessage('Cannot delete card: No account loaded in Account Maintenance', 'error');
      return;
    }

    if (!confirm('Are you sure you want to delete this card?')) {
      return;
    }

    showLoader(true);
    try {
      // Build payload matching p_DeleteElectronicCard parameters
      const payload = {
        TrackingCardID: state.currentRecord.trackingCardId || '',
        BranchID: state.accountContext.branchId || '',
        AccountID: state.accountContext.accountId || ''
      };

      console.log('[CardMaintenance] Deleting card with payload:', payload);

      // Call API to delete
      const accountService = window.accountservice || window.AccountService;
      if (accountService && typeof accountService.deleteElectronicCard === 'function') {
        const response = await accountService.deleteElectronicCard(payload);
        console.log('[CardMaintenance] Delete response:', response);
        
        if (response?.success || response?.IsSuccess) {
          showMessage('Card deleted successfully', 'success');
          state.currentRecord = null;
          await loadCardsList();
          clearForm();
          setViewMode();
        } else {
          showMessage(response?.message || response?.Message || 'Error deleting card', 'error');
        }
      } else {
        console.error('[CardMaintenance] AccountService.deleteElectronicCard not available');
        showMessage('Card service not available', 'error');
      }
    } catch (error) {
      console.error('[CardMaintenance] Error deleting card:', error);
      showMessage('Error deleting card', 'error');
    } finally {
      showLoader(false);
    }
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Wire up event listeners
   */
  function wireEventListeners() {
    // Header buttons
    if (elements.headerRefresh) {
      elements.headerRefresh.addEventListener('click', () => {
        loadCardsList();
      });
    }

    if (elements.headerMaximize) {
      elements.headerMaximize.addEventListener('click', () => {
        const window_el = document.querySelector('.window');
        if (window_el) {
          window_el.classList.toggle('maximized');
        }
      });
    }

    if (elements.headerClose) {
      elements.headerClose.addEventListener('click', postClose);
    }

    // Action buttons
    if (elements.btnView) {
      elements.btnView.addEventListener('click', () => {
        if (state.currentRecord) {
          setFormValues(state.currentRecord);
          setViewMode();
          showMessage('Viewing card details', 'info');
        }
      });
    }

    if (elements.btnAdd) {
      elements.btnAdd.addEventListener('click', setAddMode);
    }

    if (elements.btnEdit) {
      elements.btnEdit.addEventListener('click', () => {
        if (state.currentRecord) {
          setEditMode();
        } else {
          showMessage('Please select a card to edit', 'warning');
        }
      });
    }

    if (elements.btnSave) {
      elements.btnSave.addEventListener('click', saveCard);
    }

    if (elements.btnDelete) {
      elements.btnDelete.addEventListener('click', deleteCard);
    }

    if (elements.btnCancel) {
      elements.btnCancel.addEventListener('click', () => {
        clearForm();
        setViewMode();
        showMessage('Operation cancelled', 'info');
      });
    }

    if (elements.btnClose) {
      elements.btnClose.addEventListener('click', postClose);
    }

    // Section toggles
    document.querySelectorAll('[data-section-toggle]').forEach(header => {
      header.addEventListener('click', function() {
        const section = this.closest('[data-section]');
        if (!section) return;
        
        const content = section.querySelector('[data-section-content]');
        const btn = section.querySelector('[data-section-toggle] .section-toggle-btn');
        
        if (content && btn) {
          const isHidden = content.style.display === 'none';
          content.style.display = isHidden ? 'block' : 'none';
          
          const icon = btn.querySelector('i');
          if (icon) {
            icon.className = isHidden ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
          }
        }
      });
    });
  }

  // ============================================================================
  // DROPDOWN LOADING
  // ============================================================================

  /**
   * Populate a dropdown with options
   * @param {HTMLSelectElement} selectElement - The select element to populate  
   * @param {Array} options - Array of { value, label } objects
   */
  function populateDropdown(selectElement, options) {
    if (!selectElement) return;
    
    // Keep the default option and add new options
    selectElement.innerHTML = '<option value="">--Select--</option>';
    options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      selectElement.appendChild(option);
    });
  }

  /**
   * Load dropdown options from database
   * CardProvider: t_SystemCodeDetail where ID = 'CardProviderID'
   * CardType: t_SystemCodeDetail where ID = 'AccountOpeningFacilityID'
   * Status: t_SystemCodeDetail where ID = 'CreditCardStatus'
   */
  async function loadDropdowns() {
    try {
      console.log('[CardMaintenance] Loading dropdowns...');
      
      const LookupService = window.LookupService;
      if (!LookupService) {
        console.error('[CardMaintenance] LookupService not available');
        return;
      }

      // Load Card Provider dropdown (t_SystemCodeDetail where ID = 'CardProviderID')
      const cardProviderOptions = await LookupService.getSystemCodeOptions('CardProviderID');
      populateDropdown(elements.cardProvider, cardProviderOptions);
      console.log('[CardMaintenance] Card Provider dropdown loaded with', cardProviderOptions.length, 'options');

      // Load Card Type dropdown (t_SystemCodeDetail where ID = 'AccountOpeningFacilityID')
      const cardTypeOptions = await LookupService.getSystemCodeOptions('AccountOpeningFacilityID');
      populateDropdown(elements.cardType, cardTypeOptions);
      console.log('[CardMaintenance] Card Type dropdown loaded with', cardTypeOptions.length, 'options');

      // Load Status dropdown (t_SystemCodeDetail where ID = 'CreditCardStatus')
      const statusOptions = await LookupService.getSystemCodeOptions('CreditCardStatus');
      populateDropdown(elements.status, statusOptions);
      console.log('[CardMaintenance] Status dropdown loaded with', statusOptions.length, 'options');

      // Load Reason dropdown (t_SystemCodeDetail where ID = 'CardBlockReason')
      const reasonOptions = await LookupService.getSystemCodeOptions('CardBlockReason');
      populateDropdown(elements.reason, reasonOptions);
      console.log('[CardMaintenance] Reason dropdown loaded with', reasonOptions.length, 'options');

    } catch (error) {
      console.error('[CardMaintenance] Error loading dropdowns:', error);
      showMessage('Error loading dropdown options', 'error');
    }
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initialize module
   */
  function init() {
    console.log('[CardMaintenance] Initializing...');
    
    getContextFromParent();
    wireEventListeners();
    loadDropdowns();
    setViewMode();
    loadCardsList();

    console.log('[CardMaintenance] Initialized with context:', state.accountContext);
  }

  // Start initialization
  document.addEventListener('DOMContentLoaded', init);

  // Expose to global scope for parent communication
  window.CardMaintenance = {
    state: state,
    refresh: loadCardsList
  };
})();
