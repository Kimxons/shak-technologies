/**
 * Repayment Accounts Module
 * 
 * Business logic for Repayment Accounts screen in Loan Maintenance module.
 * Aligned with legacy implementation: frmLoanRepaymentAccount.js
 * 
 * Module ID: 3119
 * Location: Loans > Loan Maintenance > Data Entry > Repayment Accounts
 * 
 * Key Features:
 * - Load repayment account records (dtRepaymentAccount, dtRepaymentAccountLocal)
 * - Edit mode with Alter, Update, Clear operations
 * - Validations: Recovery order uniqueness, Main account restriction
 * - Grid selection and data binding (RowSelected pattern)
 * - Save with supervisor support (fnIsValid, fnbtnSaveClick)
 * - User rights management (fnUserRights)
 * 
 * Legacy Functions Aligned:
 * - fnPageLoad() -> init()
 * - DataLoad_CallBack() -> handleDataLoadSuccess()
 * - fnbtnEditClick() -> onEditClick()
 * - fnbtnSaveClick() -> onSaveClick()
 * - fnbtnCancelClick() -> onCancelClick()
 * - fnbtnAlterClick() -> onAlterClick()
 * - fnbtnUpdateClick() -> onUpdateClick()
 * - fnbtnClearClick() -> onClearClick()
 * - fnIsValid() -> validateBeforeSave()
 * - fnIsUpdateValid() -> validateUpdate()
 * - OnRowSelection() -> selectRow()
 * - fnUserRights() -> checkUserRights()
 * - fnchkIsRepaymentAccountClick() -> onIsRepaymentAccountChange()
 * - fnchkIsMainRepaymentAccount() -> onIsMainRepaymentAccountChange()
 * 
 * @author CBS Development Team
 * @date January 31, 2026
 */

(function (global) {
  'use strict';

  // Module guard
  if (global.__RepaymentAccountsLoaded) {
    console.warn('repayment-accounts.js already loaded; skipping duplicate execution.');
    return;
  }
  global.__RepaymentAccountsLoaded = true;

  // ============================================================================
  // SELECTORS
  // ============================================================================

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => document.querySelectorAll(selector);

  // ============================================================================
  // STATE MANAGEMENT (Legacy: dtRepaymentAccount, dtRepaymentAccountLocal, etc.)
  // ============================================================================

  const state = {
    // Data tables (legacy: dtRepaymentAccount, dtRepaymentAccountLocal)
    dtRepaymentAccount: [],         // Working copy - modified during edit
    dtRepaymentAccountLocal: [],    // Original copy - for cancel/restore
    
    // Selection state (legacy: SelectedIndex, SelectedRow)
    SelectedIndex: null,
    intRows: 0,
    
    // Mode tracking (legacy: Mode, hdnEditMode)
    Mode: 'NONE',
    
    // Edit state tracking (legacy: IsEdited)
    IsEdited: false,
    
    // Session data from parent (legacy: global variables)
    OurBranchID: '',
    AccountID: '',
    LoanSeries: '',
    ApplicationID: '',
    BankID: '',
    OperatorID: '',
    SystemDate: '',
    DayStatus: '',
    
    // Hidden field states (legacy: hdnXxx)
    hdnIsSupervised: '0',
    hdnEditOperator: '',
    hdnEditMode: 'NONE',
    hdnSVUpdateCount: '0',
    hdnEventID: '',
    
    // Configuration (legacy: RepaymentAccountRequired)
    RepaymentAccountRequired: false
  };

  // ============================================================================
  // DOM ELEMENTS
  // ============================================================================

  const elements = {
    // Fields (legacy: chkIsRepaymentAccount, chkIsMainRepaymentAccount, txtOrder)
    chkIsRepaymentAccount: null,
    chkIsMainRepaymentAccount: null,
    txtOrder: null,
    
    // Behind The Scene fields (legacy: txtModifiedBy, txtModifiedOn, etc.)
    txtModifiedBy: null,
    txtModifiedOn: null,
    txtSupervisedBy: null,
    txtSupervisedOn: null,
    
    // Grid (legacy: RadGrid1)
    rowsBody: null,
    emptyState: null,
    
    // Error display (legacy: lblMessage)
    errorDisplay: null,
    errorMessage: null,
    
    // Main action buttons (legacy: btnEdit, btnSave, btnCancel, btnBack)
    btnEdit: null,
    btnSave: null,
    btnCancel: null,
    btnBack: null,
    
    // Row action buttons (legacy: btnAlter, btnUpdate, btnClear)
    btnAlter: null,
    btnUpdate: null,
    btnClear: null
  };

  // ============================================================================
  // INITIALIZATION (Legacy: fnPageLoad)
  // ============================================================================

  /**
   * Initialize the module - aligned with legacy fnPageLoad()
   */
  function init() {
    console.log('Initializing Repayment Accounts module...');
    
    cacheDomElements();
    initializeFromSession();
    bindEvents();
    
    // Load data (legacy: frmLoanRepaymentAccount.Data_Load)
    loadRepaymentAccountData();
  }

  /**
   * Cache DOM elements
   */
  function cacheDomElements() {
    // Fields
    elements.chkIsRepaymentAccount = $('#IsRepaymentAccount');
    elements.chkIsMainRepaymentAccount = $('#IsMainRepaymentAccount');
    elements.txtOrder = $('#RecoveryOrder');
    
    // Behind The Scene fields
    elements.txtModifiedBy = $('#ModifiedBy');
    elements.txtModifiedOn = $('#ModifiedOn');
    elements.txtSupervisedBy = $('#SupervisedBy');
    elements.txtSupervisedOn = $('#SupervisedOn');
    
    // Grid
    elements.rowsBody = $('[data-lra-rows]');
    elements.emptyState = $('[data-lra-empty]');
    
    // Error display
    elements.errorDisplay = $('[data-lra-error]');
    elements.errorMessage = $('[data-error-message]');
    
    // Main action buttons
    elements.btnEdit = $('[data-action="edit"]');
    elements.btnSave = $('[data-action="save"]');
    elements.btnCancel = $('[data-action="cancel"]');
    elements.btnBack = $('[data-action="back"]');
    
    // Row action buttons
    elements.btnAlter = $('[data-action="alter"]');
    elements.btnUpdate = $('[data-action="update"]');
    elements.btnClear = $('[data-action="clear"]');
  }

  /**
   * Initialize data from session storage
   */
  function initializeFromSession() {
    try {
      if (typeof AuthService !== 'undefined' && AuthService.getSession) {
        const session = AuthService.getSession();
        if (session) {
          state.OperatorID = session.operatorID || session.OperatorID || '';
          state.BankID = session.bankID || session.BankID || '';
          state.SystemDate = session.systemDate || session.SystemDate || '';
          state.DayStatus = session.dayStatus || session.DayStatus || '';
        }
      }
      
      // Get session data from parent window
      const sessionData = getSessionData();
      if (sessionData) {
        state.OurBranchID = sessionData.OurBranchID || '';
        state.AccountID = sessionData.AccountID || '';
        state.LoanSeries = sessionData.LoanSeries || '';
        state.ApplicationID = sessionData.ApplicationID || '';
        state.RepaymentAccountRequired = sessionData.RepaymentAccountRequired || false;
      }
      
      console.log('Session data initialized:', {
        OurBranchID: state.OurBranchID,
        AccountID: state.AccountID,
        LoanSeries: state.LoanSeries,
        ApplicationID: state.ApplicationID
      });
    } catch (error) {
      console.error('Error initializing from session:', error);
    }
  }

  /**
   * Get session data from parent window
   * Reads values directly from parent document form elements (same pattern as loan-collaterals.js)
   */
  function getSessionData() {
    try {
      // Primary method: Read directly from parent document form elements
      const parentDoc = global.parent?.document;
      if (parentDoc) {
        const read = (id) => parentDoc?.getElementById(id)?.value?.trim?.() || '';
        
        const ourBranchID = read('BranchID') || read('OurBranchID');
        const accountID = read('AccountID');
        const loanSeries = read('LoanSeries');
        const applicationID = read('ApplicationID');
        const loanRefNo = read('LoanRefNo');
        
        if (ourBranchID && accountID) {
          console.log('Session data from parent document:', {
            OurBranchID: ourBranchID,
            AccountID: accountID,
            LoanSeries: loanSeries,
            ApplicationID: applicationID
          });
          return {
            OurBranchID: ourBranchID,
            AccountID: accountID,
            LoanSeries: loanSeries,
            ApplicationID: applicationID,
            LoanRefNo: loanRefNo
          };
        }
      }
      
      // Fallback: Try to get data from sessionStorage
      const sessionStr = sessionStorage.getItem('lm-repayment-accounts-context');
      if (sessionStr) {
        return JSON.parse(sessionStr);
      }
      
      // Fallback: Try getLoanMaintenanceContext from parent window
      if (global.parent && global.parent !== global) {
        const parentData = global.parent.getLoanMaintenanceContext?.();
        if (parentData) {
          return parentData;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting session data:', error);
      return null;
    }
  }

  /**
   * Bind event listeners
   */
  function bindEvents() {
    // Main action buttons
    if (elements.btnEdit) {
      elements.btnEdit.addEventListener('click', fnbtnEditClick);
    }
    if (elements.btnSave) {
      elements.btnSave.addEventListener('click', fnbtnSaveClick);
    }
    if (elements.btnCancel) {
      elements.btnCancel.addEventListener('click', fnbtnCancelClick);
    }
    if (elements.btnBack) {
      elements.btnBack.addEventListener('click', fnbtnBackClick);
    }
    
    // Row action buttons
    if (elements.btnAlter) {
      elements.btnAlter.addEventListener('click', fnbtnAlterClick);
    }
    if (elements.btnUpdate) {
      elements.btnUpdate.addEventListener('click', fnbtnUpdateClick);
    }
    if (elements.btnClear) {
      elements.btnClear.addEventListener('click', fnbtnClearClick);
    }
    
    // Field change events (legacy: onclick handlers)
    if (elements.chkIsRepaymentAccount) {
      elements.chkIsRepaymentAccount.addEventListener('change', fnchkIsRepaymentAccountClick);
    }
    if (elements.chkIsMainRepaymentAccount) {
      elements.chkIsMainRepaymentAccount.addEventListener('change', fnchkIsMainRepaymentAccount);
    }
    
    // Page unload (legacy: fnPageUnLoad)
    window.addEventListener('beforeunload', fnPageUnLoad);
  }

  // ============================================================================
  // DATA LOADING (Legacy: DataLoad_CallBack)
  // ============================================================================

  /**
   * Load repayment account data from API
   * Calls: exec p_GetLoanRepaymentAccount @OurBranchID, @AccountID, @LoanSeries, @ApplicationID, @OperatorID
   */
  async function loadRepaymentAccountData() {
    try {
      fnShowMsg('');
      
      // Validate required session data
      if (!state.OurBranchID || !state.AccountID) {
        fnShowMsg('Branch ID and Account ID are required.', 'Red');
        fnEnableFields('btnBack');
        fnDisableFields('btnEdit', 'btnSave', 'btnCancel');
        return;
      }
      
      const params = {
        OurBranchID: state.OurBranchID,
        AccountID: state.AccountID,
        LoanSeries: state.LoanSeries || '',
        ApplicationID: state.ApplicationID || ''
      };
      
      console.log('Loading Repayment Accounts with params:', params);
      console.log('OperatorID from state:', state.OperatorID);
      
      const response = await RepaymentAccountsService.getRepaymentAccountDetails(params);
      
      console.log('Repayment Accounts API response:', response);
      
      if (response && response.success) {
        DataLoad_CallBack(response.data);
      } else {
        fnShowMsg(response?.message || 'Failed to load repayment account data.', 'Red');
        fnEnableFields('btnBack');
        fnDisableFields('btnEdit', 'btnSave', 'btnCancel');
      }
    } catch (error) {
      console.error('Error loading repayment account data:', error);
      fnShowMsg('Failed to load repayment account data. Please try again.', 'Red');
      fnEnableFields('btnBack');
      fnDisableFields('btnEdit', 'btnSave', 'btnCancel');
    }
  }

  /**
   * Handle data load callback - aligned with legacy DataLoad_CallBack()
   * 
   * Response Structure from p_GetLoanRepaymentAccount:
   * - Details: [{OperatorID, EventID, NewData, CreatedOn, UpdateCount}] - Event/edit lock info
   * - Details01: [{RepaymentAccountID, RepaymentAccount, IsMainRepaymentAccount, RecoveryOrder, ...}] - Records
   */
  function DataLoad_CallBack(data) {
    try {
      // Extract event info from Details array (legacy: hdnEventID, hdnEditOperator)
      if (data && data.Details && Array.isArray(data.Details) && data.Details.length > 0) {
        const eventInfo = data.Details[0];
        state.hdnEventID = String(eventInfo.EventID || '');
        state.hdnEditOperator = eventInfo.OperatorID || '';
        state.hdnSVUpdateCount = String(eventInfo.UpdateCount || '0');
      }
      
      // Parse repayment account records from Details01 array
      if (data && data.Details01 && Array.isArray(data.Details01)) {
        state.dtRepaymentAccount = data.Details01.map(record => ({
          RowID: record.RowID || 0,
          OurBranchID: record.OurBranchID || state.OurBranchID,
          BranchName: record.BranchName || '',
          AccountID: record.AccountID || state.AccountID,
          AccountName: record.AccountName || '',
          LoanSeries: record.LoanSeries || state.LoanSeries,
          ApplicationID: record.ApplicationID || state.ApplicationID,
          ClientID: record.ClientID || '',
          ClientName: record.ClientName || '',
          RepaymentAccountID: record.RepaymentAccountID || '',
          RepaymentAccount: record.RepaymentAccount || '',
          RepaymentAccountBranchID: record.RepaymentAccountBranchID || '',
          RepaymentAccountBranch: record.RepaymentAccountBranch || '',
          IsMainRepaymentAccount: record.IsMainRepaymentAccount || false,
          RecoveryOrder: record.RecoveryOrder || 0,
          CreatedBy: record.CreatedBy || '',
          CreatedOn: record.CreatedOn || '',
          ModifiedBy: record.ModifiedBy || '',
          ModifiedOn: record.ModifiedOn || '',
          SupervisedBy: record.SupervisedBy || '',
          SupervisedOn: record.SupervisedOn || '',
          UpdateCount: record.UpdateCount || 1,
          Applicable: record.Applicable || false,
          WFAppStatusID: record.WFAppStatusID || null,
          WFAdvStageID: record.WFAdvStageID || null,
          WFAppStatus: record.WFAppStatus || null,
          ButtonMark: ''
        }));
        
        // Make a deep copy for local comparison (legacy: dtRepaymentAccountLocal)
        state.dtRepaymentAccountLocal = JSON.parse(JSON.stringify(state.dtRepaymentAccount));
        
        // Bind grid data (legacy: fnBindData)
        fnBindData(state.dtRepaymentAccount);
        fnSetFocus('btnEdit');
        
        // Check event status (legacy: hdnEventID checks)
        if (state.hdnEventID === '3' && state.hdnEditOperator !== state.OperatorID) {
          fnShowMsg('Record is being edited by another operator.', 'Red');
          fnDisableFields('btnEdit', 'btnCancel', 'btnSave');
          fnSetFocus('btnBack');
          return;
        } else if (state.hdnEventID === '3' && state.hdnEditOperator === state.OperatorID) {
          fnShowMsg('Record is being edited by another operator.', 'Red');
          fnEnableFields('btnEdit', 'btnBack');
          fnDisableFields('btnSave', 'btnCancel');
          fnSetFocus('btnEdit');
          return;
        } else if (state.dtRepaymentAccount.length > 0 &&
                   state.dtRepaymentAccount[0].WFAppStatusID === 'DIS' &&
                   state.dtRepaymentAccount[0].WFAdvStageID === '60DISB') {
          fnShowMsg(`Record is in ${state.dtRepaymentAccount[0].WFAppStatus || 'Disbursed'} status and cannot be edited.`, 'Red');
          state.hdnEditMode = 'NONE';
          fnEnableFields('btnBack');
          fnDisableFields('btnEdit', 'btnSave', 'btnCancel');
          return;
        } else {
          state.hdnEditMode = 'NONE';
          fnEnableFields('btnBack');
          fnDisableFields('btnEdit', 'btnSave', 'btnCancel');
        }
        
        // Clear and disable fields (legacy pattern)
        fnSetValue('chkIsRepaymentAccount', false);
        fnSetValue('chkIsMainRepaymentAccount', false);
        fnClearTextBox('txtOrder');
        fnDisableFields('chkIsRepaymentAccount', 'chkIsMainRepaymentAccount', 'txtOrder', 'btnUpdate');
        
        // Enable Edit if records exist (legacy pattern)
        if (state.dtRepaymentAccount.length > 0) {
          fnEnableFields('btnEdit');
          fnSetFocus('btnEdit');
        } else {
          fnShowMsg('No records to display.', 'Red');
          fnDisableFields('btnEdit');
          fnEnableFields('btnBack');
          fnSetFocus('btnBack');
        }
      } else {
        fnShowMsg('No records to display.', 'Red');
        fnDisableFields('btnEdit');
        fnEnableFields('btnBack');
        fnSetFocus('btnBack');
      }
    } catch (error) {
      console.error('Error in DataLoad_CallBack:', error);
      fnShowMsg('Error processing repayment account data.', 'Red');
    }
  }

  // ============================================================================
  // VALIDATION (Legacy: fnIsValid, fnIsUpdateValid)
  // ============================================================================

  /**
   * Validate before save - aligned with legacy fnIsValid()
   */
  function fnIsValid() {
    let CountRepaymentAccount = 0;
    let CountMainRepaymentAccount = 0;
    let IsEdited = false;

    for (let i = 0; i < state.dtRepaymentAccount.length; i++) {
      if (state.dtRepaymentAccount[i].Applicable === 'true' ||
          state.dtRepaymentAccount[i].Applicable === true) {
        CountRepaymentAccount++;
      }
      if (state.dtRepaymentAccount[i].IsMainRepaymentAccount === 'true' ||
          state.dtRepaymentAccount[i].IsMainRepaymentAccount === true) {
        CountMainRepaymentAccount++;
      }
      if (state.dtRepaymentAccount[i].ButtonMark === 'A') {
        IsEdited = true;
      }
    }

    // Check if any changes were made (legacy: 200203)
    if (IsEdited === false) {
      fnShowMsg('No changes to save.', 'Red');
      return false;
    }

    // Check if at least one repayment account is selected (legacy: 709002)
    if (CountRepaymentAccount < 1 && 
        (state.RepaymentAccountRequired === 'true' || state.RepaymentAccountRequired === true)) {
      fnShowMsg('At least one repayment account must be selected.', 'Red');
      return false;
    } else if (CountRepaymentAccount > 0 && CountMainRepaymentAccount < 1) {
      // Check if exactly one main repayment account is selected (legacy: 709005)
      fnShowMsg('One main repayment account must be selected.', 'Red');
      return false;
    }
    
    return true;
  }

  /**
   * Validate update operation - aligned with legacy fnIsUpdateValid()
   */
  function fnIsUpdateValid() {
    const isRepaymentChecked = elements.chkIsRepaymentAccount?.checked || false;
    
    if (isRepaymentChecked) {
      const order = fnGetValue('txtOrder');
      
      // Check if recovery order is provided (legacy: 7041001)
      if (order === undefined || order === null || order === '') {
        fnShowMsg('Recovery Order is required.', 'Red');
        return false;
      }

      // Validate against other records
      for (let i = 0; i < state.dtRepaymentAccount.length; i++) {
        // Check if another record already has IsMainRepaymentAccount = true (legacy: 7041003)
        if (i !== parseInt(state.SelectedIndex) && 
            elements.chkIsMainRepaymentAccount?.checked === true &&
            (state.dtRepaymentAccount[i].IsMainRepaymentAccount === 'true' ||
             state.dtRepaymentAccount[i].IsMainRepaymentAccount === true)) {
          fnShowMsg('Only one main repayment account can be selected.', 'Red');
          return false;
        }
        
        // Check if recovery order is unique (legacy: 7041002)
        if (i !== state.SelectedIndex && 
            parseInt(order) === parseInt(state.dtRepaymentAccount[i].RecoveryOrder)) {
          fnShowMsg('Recovery Order must be unique.', 'Red');
          return false;
        }
      }
    }

    return true;
  }

  // ============================================================================
  // BUTTON HANDLERS - MAIN ACTIONS (Legacy: fnbtnXxxClick)
  // ============================================================================

  /**
   * Handle Edit button click - triggers fnUserRights('EDIT')
   */
  async function fnbtnEditClick() {
    try {
      fnShowMsg('');
      
      if (state.dtRepaymentAccount.length === 0) {
        fnShowMsg('No records to edit.', 'Red');
        return;
      }
      
      // Check user rights (legacy: fnUserRights('EDIT'))
      await fnUserRights('EDIT');
    } catch (error) {
      console.error('Error in fnbtnEditClick:', error);
      fnShowMsg('Failed to enter edit mode.', 'Red');
    }
  }

  /**
   * Handle Save button click - aligned with legacy fnbtnSaveClick()
   */
  async function fnbtnSaveClick() {
    try {
      fnShowMsg('');
      
      // Validate (legacy: fnIsValid)
      if (fnIsValid() === false) {
        return;
      }
      
      // Disable save button (legacy: fnBtnDisable('SAVE'))
      fnDisableFields('btnSave');
      
      // Get remarks if supervised
      let strRemarks = null;
      if (state.hdnIsSupervised === '1') {
        strRemarks = await getRemarks();
        if (strRemarks === null) {
          fnEnableFields('btnSave');
          return;
        }
      }
      
      // Prepare save data (legacy: dsRepaymentAccount)
      const params = {
        OurBranchID: state.OurBranchID,
        AccountID: state.AccountID,
        LoanSeries: state.LoanSeries,
        ApplicationID: state.ApplicationID,
        RepaymentAccounts: state.dtRepaymentAccount,
        Remarks: strRemarks,
        UpdateCount: state.hdnSVUpdateCount,
        IsSupervised: state.hdnIsSupervised
      };
      
      // Call save API
      const response = await RepaymentAccountsService.saveRepaymentAccounts(params);
      
      // Handle response (legacy: fnbtnSave_CallBack)
      fnbtnSave_CallBack(response);
    } catch (error) {
      console.error('Error in fnbtnSaveClick:', error);
      fnShowMsg('Failed to save repayment accounts.', 'Red');
      fnEnableFields('btnSave');
    }
  }

  /**
   * Handle Save callback - aligned with legacy fnbtnSave_CallBack()
   */
  async function fnbtnSave_CallBack(response) {
    state.IsEdited = false;
    
    if (!response || !response.success) {
      // Show error popup instead of bottom message
      await showErrorPopup(response?.message || 'Failed to save.', 'Save Failed');
      fnEnableFields('btnSave');
      return;
    }
    
    if (state.hdnIsSupervised === '1') {
      // Supervised transaction (legacy: 1020)
      fnEnableFields('btnBack');
      fnDisableFields('btnEdit', 'btnSave', 'btnCancel');
      // Show success popup
      await showSuccessPopup('Saved successfully and sent for supervision.', 'Save Successful');
      fnBindData(state.dtRepaymentAccount);
      fnSetFocus('btnBack');
    } else {
      // Non-supervised transaction (legacy: 1021)
      state.hdnEditMode = 'ONSAVE';
      fnEnableFields('btnBack', 'btnEdit');
      fnDisableFields('btnSave', 'btnCancel');
      state.IsEdited = true;
      
      // Reload data (legacy: frmLoanRepaymentAccount.GetRepaymentAccount)
      await loadRepaymentAccountData();
      
      if (state.IsEdited) {
        // Show success popup instead of bottom message
        await showSuccessPopup('Saved successfully.', 'Save Successful');
      }
    }
    
    // Clear message area and Behind The Scene fields
    fnShowMsg('');
    fnClearTextBox('txtModifiedBy', 'txtModifiedOn', 'txtSupervisedBy', 'txtSupervisedOn');
  }

  /**
   * Handle Cancel button click - aligned with legacy fnbtnCancelClick()
   */
  async function fnbtnCancelClick() {
    try {
      fnShowMsg('');
      
      // Confirm cancel (legacy: BRDialog(1, "1100"))
      const confirmed = await showConfirmDialog('Are you sure you want to cancel?');
      if (!confirmed) {
        return;
      }
      
      // Update button states
      fnEnableFields('btnEdit', 'btnBack');
      fnDisableFields('btnSave', 'btnCancel');
      
      // Check user rights for NONE mode (legacy: fnUserRights('NONE'))
      await fnUserRights('NONE');
      
      fnSetFocus('btnEdit');
      fnShowMsg('');
    } catch (error) {
      console.error('Error in fnbtnCancelClick:', error);
    }
  }

  /**
   * Handle Back button click
   */
  async function fnbtnBackClick() {
    try {
      // Check if in edit mode (legacy: fnPageUnLoad pattern)
      if (state.hdnEditMode.toUpperCase() === 'EDIT') {
        const confirmed = await showConfirmDialog('You have unsaved changes. Are you sure you want to go back?');
        if (!confirmed) {
          return;
        }
        
        // Release edit lock
        await fnUserRights('NONE');
      }
      
      // Close subwindow
      closeSubwindow();
    } catch (error) {
      console.error('Error in fnbtnBackClick:', error);
      closeSubwindow();
    }
  }

  // ============================================================================
  // BUTTON HANDLERS - ROW ACTIONS (Legacy: fnbtnAlterClick, fnbtnUpdateClick, fnbtnClearClick)
  // ============================================================================
  // BUTTON HANDLERS - ROW ACTIONS (Legacy: fnbtnAlterClick, fnbtnUpdateClick, fnbtnClearClick)
  // ============================================================================

  /**
   * Handle Alter button click - aligned with legacy fnbtnAlterClick()
   */
  function fnbtnAlterClick() {
    try {
      fnShowMsg('');
      
      if (state.hdnEditMode !== 'EDIT') {
        return;
      }
      
      if (state.SelectedIndex === null || state.SelectedIndex < 0) {
        fnShowMsg('Please select a record to alter.', 'Red');
        return;
      }
      
      // Disable all row action buttons first
      fnDisableFields('btnAlter', 'btnUpdate', 'btnClear', 'chkIsRepaymentAccount', 'chkIsMainRepaymentAccount', 'txtOrder');
      
      // Enable Update and Clear
      fnEnableFields('btnUpdate', 'btnClear');
      
      // Enable fields based on IsRepaymentAccount state (legacy pattern)
      const isRepaymentChecked = elements.chkIsRepaymentAccount?.checked || false;
      
      if (isRepaymentChecked) {
        fnEnableFields('chkIsRepaymentAccount', 'chkIsMainRepaymentAccount', 'txtOrder');
        
        // If IsMainRepaymentAccount is checked, disable txtOrder (legacy: fnchkIsMainRepaymentAccount)
        if (elements.chkIsMainRepaymentAccount?.checked) {
          fnDisableFields('txtOrder');
        } else {
          fnEnableFields('txtOrder');
        }
      } else {
        fnEnableFields('chkIsRepaymentAccount');
      }
      
      // Apply fnchkIsMainRepaymentAccount logic
      fnchkIsMainRepaymentAccount();
      
      console.log('Alter mode activated for row:', state.SelectedIndex);
    } catch (error) {
      console.error('Error in fnbtnAlterClick:', error);
      fnShowMsg('Failed to alter record.', 'Red');
    }
  }

  /**
   * Handle Update button click - aligned with legacy fnbtnUpdateClick()
   */
  function fnbtnUpdateClick() {
    try {
      fnShowMsg('');
      
      if (state.SelectedIndex === null || state.SelectedIndex < 0) {
        fnShowMsg('Please select a record to update.', 'Red');
        return;
      }
      
      if (state.dtRepaymentAccount[state.SelectedIndex] === undefined || 
          state.dtRepaymentAccount[state.SelectedIndex] === null) {
        return;
      }
      
      // Validate update (legacy: fnIsUpdateValid)
      if (fnIsUpdateValid() === false) {
        return;
      }
      
      // Get values from fields
      const isRepayment = fnGetValue('chkIsRepaymentAccount');
      const isMain = fnGetValue('chkIsMainRepaymentAccount');
      const order = parseInt(fnGetValue('txtOrder') || '0');
      
      // Update record based on original state (legacy pattern)
      if (state.dtRepaymentAccountLocal[state.SelectedIndex].Applicable === 'true' ||
          state.dtRepaymentAccountLocal[state.SelectedIndex].Applicable === true) {
        // Existing record - mark as modified
        state.dtRepaymentAccount[state.SelectedIndex].ModifiedBy = state.OperatorID;
        state.dtRepaymentAccount[state.SelectedIndex].UpdateCount = 
          parseInt(state.dtRepaymentAccountLocal[state.SelectedIndex].UpdateCount || 0) + 1;
      } else {
        // New record - mark as created
        state.dtRepaymentAccount[state.SelectedIndex].CreatedBy = state.OperatorID;
        state.dtRepaymentAccount[state.SelectedIndex].UpdateCount = 2;
      }
      
      // Update record fields
      state.dtRepaymentAccount[state.SelectedIndex].Applicable = isRepayment;
      state.dtRepaymentAccount[state.SelectedIndex].IsMainRepaymentAccount = isMain;
      state.dtRepaymentAccount[state.SelectedIndex].RecoveryOrder = order;
      state.dtRepaymentAccount[state.SelectedIndex].ApplicationID = state.ApplicationID;
      state.dtRepaymentAccount[state.SelectedIndex].AccountID = state.AccountID;
      state.dtRepaymentAccount[state.SelectedIndex].LoanSeries = state.LoanSeries;
      state.dtRepaymentAccount[state.SelectedIndex].OurBranchID = state.OurBranchID;
      state.dtRepaymentAccount[state.SelectedIndex].ButtonMark = 'A'; // Mark as altered
      
      // Clear editor fields (legacy pattern)
      fnSetValue('chkIsRepaymentAccount', false);
      fnSetValue('chkIsMainRepaymentAccount', false);
      fnClearTextBox('txtOrder');
      fnDisableFields('btnAlter', 'btnUpdate', 'btnClear', 'chkIsRepaymentAccount', 'chkIsMainRepaymentAccount', 'txtOrder');
      
      // Re-render grid
      fnBindData(state.dtRepaymentAccount);
      
      console.log('Record updated:', state.dtRepaymentAccount[state.SelectedIndex]);
    } catch (error) {
      console.error('Error in fnbtnUpdateClick:', error);
      fnShowMsg('Failed to update record.', 'Red');
    }
  }

  /**
   * Handle Clear button click - aligned with legacy fnbtnClearClick()
   */
  async function fnbtnClearClick() {
    try {
      fnShowMsg('');
      
      // Confirm clear (legacy: BRDialog(1, "1100"))
      const confirmed = await showConfirmDialog('Are you sure you want to clear?');
      if (!confirmed) {
        return;
      }
      
      // Clear editor fields (legacy pattern)
      fnSetValue('chkIsRepaymentAccount', false);
      fnSetValue('chkIsMainRepaymentAccount', false);
      fnClearTextBox('txtOrder');
      fnDisableFields('btnAlter', 'btnUpdate', 'btnClear', 'chkIsRepaymentAccount', 'chkIsMainRepaymentAccount', 'txtOrder');
      
      console.log('Editor cleared');
    } catch (error) {
      console.error('Error in fnbtnClearClick:', error);
    }
  }

  // ============================================================================
  // FIELD CHANGE HANDLERS (Legacy: fnchkIsRepaymentAccountClick, fnchkIsMainRepaymentAccount)
  // ============================================================================

  /**
   * Handle IsRepaymentAccount checkbox change - aligned with legacy fnchkIsRepaymentAccountClick()
   */
  function fnchkIsRepaymentAccountClick() {
    const isChecked = elements.chkIsRepaymentAccount?.checked || false;
    
    if (isChecked) {
      // Enable related fields
      fnEnableFields('chkIsRepaymentAccount', 'chkIsMainRepaymentAccount', 'txtOrder');
    } else {
      // Disable and clear related fields
      fnSetValue('chkIsMainRepaymentAccount', false);
      fnClearTextBox('txtOrder');
      fnDisableFields('chkIsMainRepaymentAccount', 'txtOrder');
    }
  }

  /**
   * Handle IsMainRepaymentAccount checkbox change - aligned with legacy fnchkIsMainRepaymentAccount()
   */
  function fnchkIsMainRepaymentAccount() {
    const isChecked = elements.chkIsMainRepaymentAccount?.checked || false;
    
    if (isChecked) {
      // Set recovery order to 1 and disable field (legacy pattern)
      fnSetValue('txtOrder', '1');
      fnDisableFields('txtOrder');
    } else {
      // Enable recovery order field
      fnEnableFields('txtOrder');
    }
  }

  // ============================================================================
  // GRID MANAGEMENT (Legacy: fnBindData, RowSelected, OnRowSelection)
  // ============================================================================

  /**
   * Bind data to grid - aligned with legacy fnBindData()
   */
  function fnBindData(dtTable) {
    state.intRows = 0;
    
    if (!elements.rowsBody) return;
    
    elements.rowsBody.innerHTML = '';
    
    if (dtTable && dtTable.length > 0) {
      state.intRows = dtTable.length;
      
      if (elements.emptyState) {
        elements.emptyState.classList.add('lra-hidden');
      }
      
      // Render rows
      dtTable.forEach((record, index) => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.setAttribute('data-index', index);
        
        // Highlight selected row
        if (index === state.SelectedIndex) {
          tr.classList.add('is-selected', 'table-active');
        }
        
        // Build row HTML (legacy: RadGrid columns)
        const isRepaymentChecked = (record.Applicable === true || record.Applicable === 'true') ? 'checked' : '';
        const isMainChecked = (record.IsMainRepaymentAccount === true || record.IsMainRepaymentAccount === 'true') ? 'checked' : '';
        
        tr.innerHTML = `
          <td class="text-center lra-col-check">
            <input class="form-check-input" type="checkbox" ${isRepaymentChecked} disabled />
          </td>
          <td class="lra-col-accountid">${escapeHtml(record.RepaymentAccountID || '')}</td>
          <td class="lra-col-accountname">${escapeHtml(record.RepaymentAccount || '')}</td>
          <td class="text-center lra-col-main">
            <input class="form-check-input" type="checkbox" ${isMainChecked} disabled />
          </td>
          <td class="text-end lra-col-order">${record.RecoveryOrder || ''}</td>
        `;
        
        // Add click handler (legacy: RowSelected)
        tr.addEventListener('click', () => {
          RowSelected(index, record);
        });
        
        elements.rowsBody.appendChild(tr);
      });
    } else {
      // Show empty state
      if (elements.emptyState) {
        elements.emptyState.classList.remove('lra-hidden');
      }
    }
  }

  /**
   * Handle row selection - aligned with legacy RowSelected()
   */
  function RowSelected(index, record) {
    state.SelectedIndex = index;
    
    // Call OnRowSelection (legacy pattern)
    OnRowSelection(record);
  }

  /**
   * Handle row selection data binding - aligned with legacy OnRowSelection()
   */
  function OnRowSelection(SelectedRow) {
    if (state.dtRepaymentAccount === null || state.dtRepaymentAccount.length === 0) {
      return;
    }
    
    // Load record data into editor fields
    fnSetValue('chkIsRepaymentAccount', state.dtRepaymentAccount[state.SelectedIndex].Applicable);
    fnSetValue('chkIsMainRepaymentAccount', state.dtRepaymentAccount[state.SelectedIndex].IsMainRepaymentAccount);
    fnSetValue('txtOrder', state.dtRepaymentAccount[state.SelectedIndex].RecoveryOrder);
    
    // Load Behind The Scene data
    fnSetValue('txtModifiedBy', fnCheckNull(SelectedRow.ModifiedBy));
    fnSetValue('txtModifiedOn', fnSetGridDate(SelectedRow.ModifiedOn));
    fnSetValue('txtSupervisedBy', fnCheckNull(SelectedRow.SupervisedBy));
    fnSetValue('txtSupervisedOn', fnSetGridDate(SelectedRow.SupervisedOn));
    
    // Enable Alter button if in edit mode (legacy pattern)
    if (state.hdnEditMode === 'EDIT') {
      fnDisableFields('btnAlter', 'btnUpdate', 'btnClear');
      fnEnableFields('btnAlter');
    }
    
    // Re-render grid to highlight selection
    fnBindData(state.dtRepaymentAccount);
  }

  // ============================================================================
  // USER RIGHTS (Legacy: fnUserRights, fnRights_CallBack)
  // ============================================================================

  /**
   * Check user rights - aligned with legacy fnUserRights()
   */
  async function fnUserRights(strEvent) {
    state.Mode = strEvent;
    
    try {
      const params = {
        Mode: strEvent,
        OurBranchID: state.OurBranchID,
        AccountID: state.AccountID,
        LoanSeries: state.LoanSeries,
        ApplicationID: state.ApplicationID,
        BankID: state.BankID,
        UpdateCount: state.hdnSVUpdateCount
      };
      
      const response = await RepaymentAccountsService.getUserRights(params);
      
      // Handle response (legacy: fnRights_CallBack)
      fnRights_CallBack(response);
    } catch (error) {
      console.error('Error in fnUserRights:', error);
      fnShowMsg('Failed to check user rights.', 'Red');
    }
  }

  /**
   * Handle user rights callback - aligned with legacy fnRights_CallBack()
   */
  function fnRights_CallBack(response) {
    if (!response || !response.success) {
      fnShowMsg(response?.message || 'Failed to check user rights.', 'Red');
      return;
    }
    
    state.hdnIsSupervised = response.data?.IsSupervised || '0';
    
    switch (state.Mode.toUpperCase()) {
      case 'EDIT':
        state.hdnEditMode = 'EDIT';
        fnDisableFields('btnEdit', 'btnBack');
        fnEnableFields('btnSave', 'btnCancel');
        fnBindData(state.dtRepaymentAccountLocal);
        break;
        
      case 'NONE':
        state.hdnEditMode = 'NONE';
        fnSetValue('chkIsRepaymentAccount', false);
        fnSetValue('chkIsMainRepaymentAccount', false);
        fnClearTextBox('txtOrder');
        fnDisableFields('btnAlter', 'btnUpdate', 'btnClear', 'chkIsRepaymentAccount', 'chkIsMainRepaymentAccount', 'txtOrder');
        fnBindData(state.dtRepaymentAccountLocal);
        break;
    }
  }

  // ============================================================================
  // PAGE LIFECYCLE (Legacy: fnPageUnLoad)
  // ============================================================================

  /**
   * Handle page unload - aligned with legacy fnPageUnLoad()
   */
  function fnPageUnLoad() {
    if (state.hdnEditMode.toUpperCase() === 'EDIT') {
      fnUserRights('NONE');
    }
    
    // Clear state
    state.dtRepaymentAccount = null;
    state.dtRepaymentAccountLocal = null;
  }

  // ============================================================================
  // UI HELPER FUNCTIONS (Legacy-aligned: fnSetValue, fnGetValue, fnClearTextBox, etc.)
  // ============================================================================

  /**
   * Set value to element - legacy fnSetValue pattern
   */
  function fnSetValue(elementId, value) {
    let element = null;
    
    switch (elementId) {
      case 'chkIsRepaymentAccount':
        element = elements.chkIsRepaymentAccount;
        break;
      case 'chkIsMainRepaymentAccount':
        element = elements.chkIsMainRepaymentAccount;
        break;
      case 'txtOrder':
        element = elements.txtOrder;
        break;
      case 'txtModifiedBy':
        element = elements.txtModifiedBy;
        break;
      case 'txtModifiedOn':
        element = elements.txtModifiedOn;
        break;
      case 'txtSupervisedBy':
        element = elements.txtSupervisedBy;
        break;
      case 'txtSupervisedOn':
        element = elements.txtSupervisedOn;
        break;
    }
    
    if (!element) return;
    
    if (element.type === 'checkbox') {
      element.checked = value === true || value === 'true';
    } else {
      element.value = value || '';
    }
  }

  /**
   * Get value from element - legacy fnGetValue pattern
   */
  function fnGetValue(elementId) {
    let element = null;
    
    switch (elementId) {
      case 'chkIsRepaymentAccount':
        element = elements.chkIsRepaymentAccount;
        break;
      case 'chkIsMainRepaymentAccount':
        element = elements.chkIsMainRepaymentAccount;
        break;
      case 'txtOrder':
        element = elements.txtOrder;
        break;
    }
    
    if (!element) return null;
    
    if (element.type === 'checkbox') {
      return element.checked;
    } else {
      return element.value?.trim() || '';
    }
  }

  /**
   * Clear text boxes - legacy fnClearTextBox pattern
   */
  function fnClearTextBox(...elementIds) {
    elementIds.forEach(id => {
      fnSetValue(id, '');
    });
  }

  /**
   * Enable fields - legacy fnEnableFields pattern
   */
  function fnEnableFields(...fields) {
    fields.forEach(field => {
      let element = null;
      
      switch (field) {
        case 'btnEdit':
          element = elements.btnEdit;
          break;
        case 'btnSave':
          element = elements.btnSave;
          break;
        case 'btnCancel':
          element = elements.btnCancel;
          break;
        case 'btnBack':
          element = elements.btnBack;
          break;
        case 'btnAlter':
          element = elements.btnAlter;
          break;
        case 'btnUpdate':
          element = elements.btnUpdate;
          break;
        case 'btnClear':
          element = elements.btnClear;
          break;
        case 'chkIsRepaymentAccount':
          element = elements.chkIsRepaymentAccount;
          break;
        case 'chkIsMainRepaymentAccount':
          element = elements.chkIsMainRepaymentAccount;
          break;
        case 'txtOrder':
          element = elements.txtOrder;
          break;
      }
      
      if (element) {
        element.disabled = false;
      }
    });
  }

  /**
   * Disable fields - legacy fnDisableFields pattern
   */
  function fnDisableFields(...fields) {
    fields.forEach(field => {
      let element = null;
      
      switch (field) {
        case 'btnEdit':
          element = elements.btnEdit;
          break;
        case 'btnSave':
          element = elements.btnSave;
          break;
        case 'btnCancel':
          element = elements.btnCancel;
          break;
        case 'btnBack':
          element = elements.btnBack;
          break;
        case 'btnAlter':
          element = elements.btnAlter;
          break;
        case 'btnUpdate':
          element = elements.btnUpdate;
          break;
        case 'btnClear':
          element = elements.btnClear;
          break;
        case 'chkIsRepaymentAccount':
          element = elements.chkIsRepaymentAccount;
          break;
        case 'chkIsMainRepaymentAccount':
          element = elements.chkIsMainRepaymentAccount;
          break;
        case 'txtOrder':
          element = elements.txtOrder;
          break;
      }
      
      if (element) {
        element.disabled = true;
      }
    });
  }

  /**
   * Set focus to element - legacy fnSetFocus pattern
   */
  function fnSetFocus(elementId) {
    let element = null;
    
    switch (elementId) {
      case 'btnEdit':
        element = elements.btnEdit;
        break;
      case 'btnBack':
        element = elements.btnBack;
        break;
    }
    
    if (element && !element.disabled) {
      element.focus();
    }
  }

  /**
   * Show message - now uses popups for all messages
   * For clearing messages (empty string), hides the error display
   * For actual messages, shows a popup based on color
   */
  function fnShowMsg(message, color = '') {
    // Always hide the bottom error display area
    if (elements.errorDisplay) {
      elements.errorDisplay.classList.add('lra-hidden');
    }
    
    // If no message, just return (clearing)
    if (!message) {
      return;
    }
    
    // Log the message
    console.log(`[${color || 'INFO'}] ${message}`);
    
    // Show popup based on color
    switch (color.toLowerCase()) {
      case 'red':
        showWarningPopup(message, 'Warning');
        break;
      case 'blue':
        showInfoPopup(message, 'Information');
        break;
      default:
        showWarningPopup(message, 'Notice');
    }
  }

  /**
   * Show warning popup modal (for validation errors, etc.)
   * @param {string} message - The warning message to display
   * @param {string} title - Optional title (defaults to 'Warning')
   */
  function showWarningPopup(message, title = 'Warning') {
    return new Promise((resolve) => {
      // Check if modal already exists, remove it
      const existingModal = document.getElementById('lraWarningModal');
      if (existingModal) {
        existingModal.remove();
      }

      // Create modal HTML
      const modalHtml = `
        <div class="modal fade" id="lraWarningModal" tabindex="-1" aria-labelledby="lraWarningModalLabel" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered modal-sm">
            <div class="modal-content">
              <div class="modal-header bg-warning text-dark py-2">
                <h6 class="modal-title" id="lraWarningModalLabel">
                  <i class="bi bi-exclamation-triangle-fill me-2"></i>${escapeHtml(title)}
                </h6>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body text-center py-4">
                <i class="bi bi-exclamation-triangle-fill text-warning" style="font-size: 3rem;"></i>
                <p class="mt-3 mb-0">${escapeHtml(message)}</p>
              </div>
              <div class="modal-footer py-2 justify-content-center">
                <button type="button" class="btn btn-warning btn-sm px-4" data-bs-dismiss="modal">OK</button>
              </div>
            </div>
          </div>
        </div>
      `;

      // Append modal to body
      document.body.insertAdjacentHTML('beforeend', modalHtml);

      // Get the modal element and create Bootstrap modal instance
      const modalElement = document.getElementById('lraWarningModal');
      const modal = new bootstrap.Modal(modalElement, {
        backdrop: 'static',
        keyboard: true
      });

      // Handle modal close
      modalElement.addEventListener('hidden.bs.modal', () => {
        modalElement.remove();
        resolve();
      });

      // Show the modal
      modal.show();
    });
  }

  /**
   * Show info popup modal (for informational messages)
   * @param {string} message - The info message to display
   * @param {string} title - Optional title (defaults to 'Information')
   */
  function showInfoPopup(message, title = 'Information') {
    return new Promise((resolve) => {
      // Check if modal already exists, remove it
      const existingModal = document.getElementById('lraInfoModal');
      if (existingModal) {
        existingModal.remove();
      }

      // Create modal HTML
      const modalHtml = `
        <div class="modal fade" id="lraInfoModal" tabindex="-1" aria-labelledby="lraInfoModalLabel" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered modal-sm">
            <div class="modal-content">
              <div class="modal-header bg-info text-white py-2">
                <h6 class="modal-title" id="lraInfoModalLabel">
                  <i class="bi bi-info-circle-fill me-2"></i>${escapeHtml(title)}
                </h6>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body text-center py-4">
                <i class="bi bi-info-circle-fill text-info" style="font-size: 3rem;"></i>
                <p class="mt-3 mb-0">${escapeHtml(message)}</p>
              </div>
              <div class="modal-footer py-2 justify-content-center">
                <button type="button" class="btn btn-info btn-sm px-4 text-white" data-bs-dismiss="modal">OK</button>
              </div>
            </div>
          </div>
        </div>
      `;

      // Append modal to body
      document.body.insertAdjacentHTML('beforeend', modalHtml);

      // Get the modal element and create Bootstrap modal instance
      const modalElement = document.getElementById('lraInfoModal');
      const modal = new bootstrap.Modal(modalElement, {
        backdrop: 'static',
        keyboard: true
      });

      // Handle modal close
      modalElement.addEventListener('hidden.bs.modal', () => {
        modalElement.remove();
        resolve();
      });

      // Show the modal
      modal.show();
    });
  }

  /**
   * Check null value - legacy fnCheckNull pattern
   */
  function fnCheckNull(value) {
    return value || '';
  }

  /**
   * Format grid date - legacy fnSetGridDate pattern
   */
  function fnSetGridDate(dateStr) {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch {
      return dateStr;
    }
  }

  /**
   * Show confirm dialog - replacement for BRDialog
   */
  function showConfirmDialog(message) {
    return new Promise((resolve) => {
      const confirmed = confirm(message);
      resolve(confirmed);
    });
  }

  /**
   * Show success popup modal
   * @param {string} message - The success message to display
   * @param {string} title - Optional title (defaults to 'Success')
   */
  function showSuccessPopup(message, title = 'Success') {
    return new Promise((resolve) => {
      // Check if modal already exists, remove it
      const existingModal = document.getElementById('lraSuccessModal');
      if (existingModal) {
        existingModal.remove();
      }

      // Create modal HTML
      const modalHtml = `
        <div class="modal fade" id="lraSuccessModal" tabindex="-1" aria-labelledby="lraSuccessModalLabel" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered modal-sm">
            <div class="modal-content">
              <div class="modal-header bg-success text-white py-2">
                <h6 class="modal-title" id="lraSuccessModalLabel">
                  <i class="bi bi-check-circle-fill me-2"></i>${escapeHtml(title)}
                </h6>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body text-center py-4">
                <i class="bi bi-check-circle-fill text-success" style="font-size: 3rem;"></i>
                <p class="mt-3 mb-0">${escapeHtml(message)}</p>
              </div>
              <div class="modal-footer py-2 justify-content-center">
                <button type="button" class="btn btn-success btn-sm px-4" data-bs-dismiss="modal">OK</button>
              </div>
            </div>
          </div>
        </div>
      `;

      // Append modal to body
      document.body.insertAdjacentHTML('beforeend', modalHtml);

      // Get the modal element and create Bootstrap modal instance
      const modalElement = document.getElementById('lraSuccessModal');
      const modal = new bootstrap.Modal(modalElement, {
        backdrop: 'static',
        keyboard: true
      });

      // Handle modal close
      modalElement.addEventListener('hidden.bs.modal', () => {
        modalElement.remove();
        resolve();
      });

      // Show the modal
      modal.show();
    });
  }

  /**
   * Show error popup modal
   * @param {string} message - The error message to display
   * @param {string} title - Optional title (defaults to 'Error')
   */
  function showErrorPopup(message, title = 'Error') {
    return new Promise((resolve) => {
      // Check if modal already exists, remove it
      const existingModal = document.getElementById('lraErrorModal');
      if (existingModal) {
        existingModal.remove();
      }

      // Create modal HTML
      const modalHtml = `
        <div class="modal fade" id="lraErrorModal" tabindex="-1" aria-labelledby="lraErrorModalLabel" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered modal-sm">
            <div class="modal-content">
              <div class="modal-header bg-danger text-white py-2">
                <h6 class="modal-title" id="lraErrorModalLabel">
                  <i class="bi bi-exclamation-triangle-fill me-2"></i>${escapeHtml(title)}
                </h6>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body text-center py-4">
                <i class="bi bi-exclamation-triangle-fill text-danger" style="font-size: 3rem;"></i>
                <p class="mt-3 mb-0">${escapeHtml(message)}</p>
              </div>
              <div class="modal-footer py-2 justify-content-center">
                <button type="button" class="btn btn-danger btn-sm px-4" data-bs-dismiss="modal">OK</button>
              </div>
            </div>
          </div>
        </div>
      `;

      // Append modal to body
      document.body.insertAdjacentHTML('beforeend', modalHtml);

      // Get the modal element and create Bootstrap modal instance
      const modalElement = document.getElementById('lraErrorModal');
      const modal = new bootstrap.Modal(modalElement, {
        backdrop: 'static',
        keyboard: true
      });

      // Handle modal close
      modalElement.addEventListener('hidden.bs.modal', () => {
        modalElement.remove();
        resolve();
      });

      // Show the modal
      modal.show();
    });
  }

  /**
   * Get remarks from user (for supervised transactions)
   */
  function getRemarks() {
    return new Promise((resolve) => {
      const remarks = prompt('Please enter remarks for this transaction:');
      resolve(remarks);
    });
  }

  /**
   * Close subwindow
   */
  function closeSubwindow() {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ action: 'close-child-form' }, '*');
    }
  }

  /**
   * Escape HTML special characters
   */
  function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  }

  // ============================================================================
  // BOOTSTRAP
  // ============================================================================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);

