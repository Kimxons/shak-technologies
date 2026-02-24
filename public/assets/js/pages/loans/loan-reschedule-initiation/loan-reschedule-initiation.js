(function (global) {
  if (global.__LoanRescheduleInitiationLoaded) {
    console.warn("loan-reschedule-initiation.js already loaded; skipping duplicate execution.");
    return;
  }
  global.__LoanRescheduleInitiationLoaded = true;

  console.log("%c=== LOAN RESCHEDULE INITIATION LOADING ===", "background: #222; color: #bada55; font-weight: bold;");

  const CoreApi = global.CoreApi;
  const SearchService = global.SearchService;
  const LoanRescheduleInitiationService = global.LoanRescheduleInitiationService;

  // Constants
  const MODULE_ID = "4400"; // Loan Reschedule Initiation Module ID
  const FORM_ID = "loanRescheduleInitiationForm";

  // State management
  let formState = {
    mode: "search", // view, add, edit, search
    loanData: null,
    components: [],
    selectedComponentIndex: -1,
    isDirty: false
  };

  // DOM Elements
  const form = document.getElementById(FORM_ID);
  const actionButtons = {
    view: document.querySelector("[data-action='view']"),
    add: document.querySelector("[data-action='add']"),
    edit: document.querySelector("[data-action='edit']"),
    delete: document.querySelector("[data-action='delete']"),
    save: document.querySelector("[data-action='save']"),
    cancel: document.querySelector("[data-action='cancel']"),
    proceed: form?.querySelector("[data-action='proceed']"),
    alter: form?.querySelector("[data-action='alter']"),
    update: form?.querySelector("[data-action='update']"),
    clear: form?.querySelector("[data-action='clear']"),
    supervise: document.querySelector("[data-action='supervise']"),
    schedule: document.querySelector("[data-action='schedule']"),
    payment: document.querySelector("[data-action='payment']"),
    newSchedule: document.querySelector("[data-action='newSchedule']")
  };

  const fields = {
    branchId: form?.elements.BranchID,
    branchName: form?.elements.BranchName,
    clientId: form?.elements.ClientID,
    clientName: form?.elements.ClientName,
    accountId: form?.elements.AccountID,
    accountName: form?.elements.AccountName,
    loanSeries: form?.elements.LoanSeries,
    fromInstallmentNo: form?.elements.FromInstallmentNo,
    changeTerm: form?.elements.ChangeTerm,
    changeRate: form?.elements.ChangeRate,
    postponeOverdue: form?.elements.PostponeOverdue,
    withBreakPeriod: form?.elements.WithBreakPeriod,
    payInterest: form?.elements.PayInterest,
    payPenalty: form?.elements.PayPenalty,
    proposedInterestRate: form?.elements.ProposedInterestRate,
    breakTermMonths: form?.elements.BreakTermMonths,
    collectInterestDuringBreak: form?.elements.CollectInterestDuringBreak,
    rescheduleStartDate: form?.elements.RescheduleStartDate,
    rescheduleTermType: form?.elements.RescheduleTermType,
    newTerm: form?.elements.NewTerm,
    proposedTerm: form?.elements.ProposedTerm,
    repaymentFrequency: form?.elements.RepaymentFrequency,
    component: form?.elements.Component,
    actualAmount: form?.elements.ActualAmount,
    proposedAmount: form?.elements.ProposedAmount,
    outstandingActual: form?.elements.OutstandingActual,
    outstandingProposed: form?.elements.OutstandingProposed,
    btsLoanAmount: form?.elements.BTSLoanAmount,
    btsOutstandingPrincipal: form?.elements.BTSOutstandingPrincipal,
    btsTotalTerm: form?.elements.BTSTotalTerm,
    btsProductId: form?.elements.BTSProductID,
    btsOverduePrincipal: form?.elements.BTSOverduePrincipal,
    btsBalanceTerm: form?.elements.BTSBalanceTerm,
    btsMaturityDate: form?.elements.BTSMaturityDate,
    btsOverdueInterest: form?.elements.BTSOverdueInterest,
    btsStatus: form?.elements.BTSStatus
  };

  // Utility functions
  const showToast = (message, type = "info") => {
    console.log(`[${type.toUpperCase()}] ${message}`);
    // Implement toast notification if available in global scope
    if (global.showNotification) {
      global.showNotification(message, type);
    }
  };

  // Field Logic Handlers
  const handleChangeTermCheckbox = () => {
    const isChecked = fields.changeTerm?.checked || false;
    
    if (isChecked) {
      // Enable term-related fields
      fields.rescheduleTermType.disabled = false;
      fields.newTerm.disabled = false;
      fields.proposedTerm.disabled = false;
      fields.repaymentFrequency.disabled = false;
      
      // Disable rate field when term is selected
      fields.changeRate.checked = false;
      fields.proposedInterestRate.disabled = true;
      fields.proposedInterestRate.value = '';
      
      // Enable other Reschedule Details fields
      disableRescheduleDetailsFields();
    } else {
      // Disable term-related fields
      fields.rescheduleTermType.disabled = true;
      fields.newTerm.disabled = true;
      fields.proposedTerm.disabled = true;
      fields.repaymentFrequency.disabled = true;
      
      // Clear values
      fields.rescheduleTermType.value = '';
      fields.newTerm.value = '';
      fields.proposedTerm.value = '';
      
      // Check if ChangeRate is still enabled
      if (!fields.changeRate.checked) {
        disableRescheduleDetailsFields();
      }
    }
    
    console.log('[ChangeTermCheckbox] Term fields', isChecked ? 'enabled' : 'disabled');
  };

  const handleChangeRateCheckbox = () => {
    const isChecked = fields.changeRate?.checked || false;
    
    if (isChecked) {
      // Enable rate field
      fields.proposedInterestRate.disabled = false;
      
      // Disable term checkbox when rate is selected
      fields.changeTerm.checked = false;
      handleChangeTermCheckbox(); // Disable term fields
      
      // Enable other Reschedule Details fields
      disableRescheduleDetailsFields();
    } else {
      // Disable and clear rate field
      fields.proposedInterestRate.disabled = true;
      fields.proposedInterestRate.value = '';
      
      // Check if ChangeTerm is still enabled
      if (!fields.changeTerm.checked) {
        disableRescheduleDetailsFields();
      }
    }
    
    console.log('[ChangeRateCheckbox] Rate field', isChecked ? 'enabled' : 'disabled');
  };

  const handleWithBreakPeriodCheckbox = () => {
    const isChecked = fields.withBreakPeriod?.checked || false;
    
    if (isChecked) {
      // Enable break period fields
      fields.breakTermMonths.disabled = false;
      fields.collectInterestDuringBreak.disabled = false;
    } else {
      // Disable and clear break period fields
      fields.breakTermMonths.disabled = true;
      fields.collectInterestDuringBreak.disabled = true;
      fields.breakTermMonths.value = '';
      fields.collectInterestDuringBreak.checked = false;
    }
    
    console.log('[WithBreakPeriodCheckbox] Break period fields', isChecked ? 'enabled' : 'disabled');
  };

  const handleRescheduleTermTypeChange = () => {
    const termType = fields.rescheduleTermType?.value || '';
    const newTermLabel = form?.querySelector('label[for="NewTerm"]');
    
    if (termType === 'EXT') {
      // Extend: Enable new term field
      fields.newTerm.disabled = false;
      fields.newTerm.placeholder = 'Enter extension term';
      if (newTermLabel) {
        newTermLabel.textContent = 'Extend Term By';
      }
    } else if (termType === 'RED') {
      // Reduce: Enable new term field
      fields.newTerm.disabled = false;
      fields.newTerm.placeholder = 'Enter reduction term';
      if (newTermLabel) {
        newTermLabel.textContent = 'Reduce Term By';
      }
    } else {
      // Clear and disable
      fields.newTerm.disabled = true;
      fields.newTerm.value = '';
      fields.newTerm.placeholder = '';
      if (newTermLabel) {
        newTermLabel.textContent = 'Term';
      }
    }
    
    // Recalculate proposed term when term type changes
    if (termType && fields.newTerm.value) {
      calculateProposedTerm();
    }
    
    console.log('[RescheduleTermType] Changed to:', termType);
  };

  const calculateProposedTerm = () => {
    const termType = fields.rescheduleTermType?.value || '';
    const newTerm = parseFloat(fields.newTerm?.value || 0);
    const balanceTerm = parseFloat(fields.btsBalanceTerm?.value || 0);
    
    if (!termType || !newTerm || !balanceTerm) {
      fields.proposedTerm.value = '';
      return;
    }
    
    let proposedTerm = 0;
    if (termType === 'EXT') {
      // Extend: Balance Term + New Term
      proposedTerm = balanceTerm + newTerm;
    } else if (termType === 'RED') {
      // Reduce: Balance Term - New Term
      proposedTerm = balanceTerm - newTerm;
      
      if (proposedTerm < 0) {
        showToast('Reduction term cannot exceed balance term', 'error');
        fields.newTerm.value = '';
        fields.proposedTerm.value = '';
        return;
      }
    }
    
    fields.proposedTerm.value = proposedTerm;
    console.log('[ProposedTerm] Calculated:', proposedTerm);
  };

  const validateBreakTermMonths = () => {
    const breakTerm = parseFloat(fields.breakTermMonths?.value || 0);
    const maxBreakPeriod = parseFloat(fields.btsBalanceTerm?.value || 0); // Using balance term as max
    
    if (breakTerm > maxBreakPeriod) {
      showToast(`Break period cannot exceed ${maxBreakPeriod} months`, 'error');
      fields.breakTermMonths.value = '';
      return false;
    }
    
    return true;
  };

  const validateNewTerm = () => {
    const termType = fields.rescheduleTermType?.value || '';
    const newTerm = parseFloat(fields.newTerm?.value || 0);
    const repaymentFreq = fields.repaymentFrequency?.value || '';
    const balanceTerm = parseFloat(fields.btsBalanceTerm?.value || 0);
    
    if (!newTerm) return true;
    
    // Check if term is divisible by repayment frequency
    if (repaymentFreq && newTerm % parseFloat(repaymentFreq) !== 0) {
      showToast(`Term must be divisible by repayment frequency (${repaymentFreq})`, 'error');
      fields.newTerm.value = '';
      return false;
    }
    
    // For reduction, check it doesn't exceed balance term
    if (termType === 'RED' && newTerm > balanceTerm) {
      showToast('Reduction term cannot exceed balance term', 'error');
      fields.newTerm.value = '';
      return false;
    }
    
    return true;
  };

  const setFormMode = (mode) => {
    formState.mode = mode;
    console.log(`[FormMode] Changing mode to: ${mode}`);

    const inputs = form.querySelectorAll("input, select, textarea");
    inputs.forEach((el) => {
      if (el.hasAttribute("readonly")) return;
      if (el.id === "BranchID" || el.id === "ClientID" || el.id === "AccountID") {
        // Identifier fields: always enabled for searching
        el.disabled = false;
        return;
      }
      // Other fields: disabled in view mode, enabled in add/edit modes
      el.disabled = mode === "view";
    });

    // Update button states
    actionButtons.view.disabled = mode !== "view" && mode !== "search";
    actionButtons.add.disabled = mode !== "view" && mode !== "search";
    actionButtons.edit.disabled = (mode !== "view" && mode !== "search") || !formState.loanData;
    actionButtons.delete.disabled = mode !== "view" && mode !== "search";
    actionButtons.save.disabled = mode === "view" || mode === "search";
    actionButtons.cancel.disabled = mode === "view" || mode === "search";
    actionButtons.alter.disabled = mode === "view" || mode === "search";
  };

  // Clear only reschedule-related fields (for Add mode) - DO NOT clear identifiers or FromInstallmentNo
  const clearFormDataForAdd = () => {
    // DO NOT CLEAR - they should remain populated
    // - identifiers (BranchID, ClientID, AccountID, LoanSeries)
    // - FromInstallmentNo (comes from DB and is readonly)

    // Clear Reschedule By section fields
    fields.changeTerm.checked = false;
    fields.changeRate.checked = false;
    fields.proposedInterestRate.value = '';

    // Clear Reschedule Details section fields (BUT NOT FromInstallmentNo)
    // fields.fromInstallmentNo.value = '';  // DO NOT CLEAR - readonly from DB
    fields.postponeOverdue.checked = false;
    fields.withBreakPeriod.checked = false;
    fields.breakTermMonths.value = '';
    fields.collectInterestDuringBreak.checked = false;
    fields.rescheduleTermType.value = '';
    fields.newTerm.value = '';
    fields.proposedTerm.value = '';
    fields.repaymentFrequency.value = '';
    fields.rescheduleStartDate.value = '';
    fields.payInterest.checked = false;
    fields.payPenalty.checked = false;

    // Clear Component Editor fields
    fields.component.value = '';
    fields.actualAmount.value = '';
    fields.proposedAmount.value = '';
    fields.outstandingActual.value = '';
    fields.outstandingProposed.value = '';

    // Clear components grid
    formState.components = [];
    formState.selectedComponentIndex = -1;
    renderComponentsGrid();
    
    // Disable Reschedule Details fields initially (until ChangeTerm/ChangeRate is checked)
    disableRescheduleDetailsFields();

    console.log("[ClearFormDataForAdd] Cleared reschedule fields, identifiers and FromInstallmentNo preserved");
  };

  // Clear all form data including identifiers and BTS (for Cancel)
  const clearFormData = () => {
    // Clear identifiers
    fields.branchId.value = '';
    fields.branchName.value = '';
    fields.clientId.value = '';
    fields.clientName.value = '';
    fields.accountId.value = '';
    fields.accountName.value = '';
    fields.loanSeries.value = '';

    // Clear Reschedule By section
    fields.changeTerm.checked = false;
    fields.changeRate.checked = false;
    fields.proposedInterestRate.value = '';

    // Clear Reschedule Details section
    fields.fromInstallmentNo.value = '';
    fields.postponeOverdue.checked = false;
    fields.withBreakPeriod.checked = false;
    fields.breakTermMonths.value = '';
    fields.collectInterestDuringBreak.checked = false;
    fields.rescheduleTermType.value = '';
    fields.newTerm.value = '';
    fields.proposedTerm.value = '';
    fields.repaymentFrequency.value = '';
    fields.rescheduleStartDate.value = '';
    fields.payInterest.checked = false;
    fields.payPenalty.checked = false;

    // Clear Component Editor fields
    fields.component.value = '';
    fields.actualAmount.value = '';
    fields.proposedAmount.value = '';
    fields.outstandingActual.value = '';
    fields.outstandingProposed.value = '';

    // Clear Behind The Scene section
    fields.btsLoanAmount.value = '';
    fields.btsOutstandingPrincipal.value = '';
    fields.btsTotalTerm.value = '';
    fields.btsProductId.value = '';
    fields.btsOverduePrincipal.value = '';
    fields.btsBalanceTerm.value = '';
    fields.btsMaturityDate.value = '';
    fields.btsOverdueInterest.value = '';
    if (fields.btsStatus) {
      fields.btsStatus.value = '';
    }

    // Clear components
    formState.components = [];
    formState.selectedComponentIndex = -1;
    renderComponentsGrid();

    console.log("[ClearFormData] Cleared all form data");
  };

  const calculateOutstanding = () => {
    let actualTotal = 0;
    let proposedTotal = 0;

    formState.components.forEach((comp) => {
      actualTotal += Number(comp.ActualAmount || 0);
      proposedTotal += Number(comp.ProposedAmount || 0);
    });

    if (fields.outstandingActual) {
      fields.outstandingActual.value = actualTotal > 0 ? actualTotal.toFixed(2) : "";
    }
    if (fields.outstandingProposed) {
      fields.outstandingProposed.value = proposedTotal > 0 ? proposedTotal.toFixed(2) : "";
    }
  };

  const renderComponentsGrid = () => {
    const tbody = form.querySelector("[data-component-rows]");
    const emptyMsg = form.querySelector("[data-component-empty]");

    if (!tbody) return;

    tbody.innerHTML = "";

    if (!formState.components || formState.components.length === 0) {
      emptyMsg?.classList.remove("d-none");
      calculateOutstanding();
      return;
    }

    emptyMsg?.classList.add("d-none");

    formState.components.forEach((comp, idx) => {
      const tr = document.createElement("tr");
      tr.className = idx === formState.selectedComponentIndex ? "table-active" : "";
      tr.innerHTML = `
        <td>${comp.ComponentID || comp.Component || ""}</td>
        <td class="text-end">${(Number(comp.ActualAmount || 0)).toFixed(2)}</td>
        <td class="text-end">${(Number(comp.ProposedAmount || 0)).toFixed(2)}</td>
      `;

      tr.addEventListener("click", () => {
        formState.selectedComponentIndex = idx;
        selectComponent(idx);
        renderComponentsGrid();
      });

      tbody.appendChild(tr);
    });

    calculateOutstanding();
  };

  const selectComponent = (index) => {
    if (index < 0 || index >= formState.components.length) return;

    const comp = formState.components[index];
    fields.component.value = comp.ComponentID || comp.Component || "";
    fields.actualAmount.value = comp.ActualAmount || "";
    fields.proposedAmount.value = "";

    formState.selectedComponentIndex = index;
  };

  // Enable/Disable Reschedule Details fields based on ChangeTerm or ChangeRate checkbox
  const disableRescheduleDetailsFields = () => {
    const isEnabled = fields.changeTerm.checked || fields.changeRate.checked;
    
    const detailsFields = [
      fields.postponeOverdue,
      fields.withBreakPeriod,
      fields.breakTermMonths,
      fields.collectInterestDuringBreak,
      fields.rescheduleTermType,
      fields.newTerm,
      fields.proposedTerm,
      fields.repaymentFrequency,
      fields.rescheduleStartDate,
      fields.payInterest,
      fields.payPenalty
    ];
    
    detailsFields.forEach(field => {
      if (field) field.disabled = !isEnabled;
    });
    
    console.log('[DisableRescheduleDetailsFields] Fields', isEnabled ? 'enabled' : 'disabled');
  };

  // Event Handlers
  const handleViewClick = async () => {
    if (!validateIdentifiers()) return;

    console.log("[View] Loading loan reschedule details");

    try {
      // Database Call #4: GET LOAN RESCHEDULE DETAILS
      const response = await LoanRescheduleInitiationService.getLoanRescheduleDetails(
        fields.branchId.value.trim(),
        fields.accountId.value.trim(),
        "web_portal"
      );

      console.log("[View] Full response:", response);

      // Check if we have valid data
      if (!response || !response.AccountID) {
        console.error("[View] No loan data found in response", { response });
        showToast("No loan data found", "error");
        return;
      }

      // Map response to form (response is already flattened by service)
      formState.loanData = response;
      populateFormFromData(response);

      // Load components from the mapped response
      formState.components = response.componentDetails || [];
      renderComponentsGrid();

      setFormMode("view");
      showToast("Loan details loaded successfully", "success");
    } catch (error) {
      console.error("[View] Error:", error);
      showToast("Error loading loan details", "error");
    }
  };

  // Populate form fields from API response
  const populateFormFromData = (response) => {
    try {
      console.log("[PopulateForm] Starting population with response:", response);

      if (!response) {
        console.warn("[PopulateForm] No response provided");
        return;
      }

      // Response is flattened by CoreApi, so all fields are at top level
      // Details01 fields are merged directly into response object
      // Details02 fields are also merged into response object

      // ====== POPULATE TOP IDENTIFIERS (from flattened response) ======
      fields.branchId.value = response.BranchID || response.OurBranchID || '';
      fields.branchName.value = response.BranchName || '';
      fields.clientId.value = response.ClientID || '';
      fields.clientName.value = response.ClientName || '';
      fields.accountId.value = response.AccountID || '';
      fields.accountName.value = response.AccountName || '';
      fields.loanSeries.value = response.LoanSeries || '';

      // ====== POPULATE RESCHEDULE BY SECTION ======
      fields.changeTerm.checked = convertToBoolean(response.ChangeTerm);
      fields.changeRate.checked = convertToBoolean(response.ChangeRate);
      fields.proposedInterestRate.value = response.ProposedInterestRate !== null && response.ProposedInterestRate !== undefined ? response.ProposedInterestRate : '';

      // ====== POPULATE RESCHEDULE DETAILS SECTION ======
      fields.fromInstallmentNo.value = response.FromInstallmentNo !== null && response.FromInstallmentNo !== undefined ? response.FromInstallmentNo : '';
      fields.postponeOverdue.checked = convertToBoolean(response.PostponeOverdue);
      fields.withBreakPeriod.checked = convertToBoolean(response.WithBreakPeriod);
      fields.breakTermMonths.value = response.BreakTermMonths !== null && response.BreakTermMonths !== undefined ? response.BreakTermMonths : '';
      fields.collectInterestDuringBreak.checked = convertToBoolean(response.CollectInterestDuringBreak);
      fields.rescheduleTermType.value = response.RescheduleTermType || '';
      fields.newTerm.value = response.Term !== null && response.Term !== undefined ? response.Term : '';
      fields.proposedTerm.value = response.ProposedTerm !== null && response.ProposedTerm !== undefined ? response.ProposedTerm : '';

      // Repayment Frequency comes from Details02
      fields.repaymentFrequency.value = response.RepaymentFrequency || '';

      // Reschedule Start Date - this is a SELECT dropdown (Next/Current/empty)
      if (response.RescheduleStartDate !== null && response.RescheduleStartDate !== undefined) {
        fields.rescheduleStartDate.value = response.RescheduleStartDate;
      } else {
        fields.rescheduleStartDate.value = '';
      }

      // Pay Interest and Pay Penalty
      if (response.PayInterest !== undefined) {
        fields.payInterest.checked = convertToBoolean(response.PayInterest);
      }
      if (response.PayPenalty !== undefined) {
        fields.payPenalty.checked = convertToBoolean(response.PayPenalty);
      }

      // ====== POPULATE BEHIND THE SCENE SECTION (Details02 fields) ======
      fields.btsLoanAmount.value = response.LoanAmount !== null && response.LoanAmount !== undefined ? response.LoanAmount : '';
      fields.btsOutstandingPrincipal.value = response.OutstandingPrincipal !== null && response.OutstandingPrincipal !== undefined ? response.OutstandingPrincipal : '';
      fields.btsTotalTerm.value = response.TotalTerm !== null && response.TotalTerm !== undefined ? response.TotalTerm : '';
      fields.btsProductId.value = response.ProductID || '';
      fields.btsOverduePrincipal.value = response.OverduePrincipal !== null && response.OverduePrincipal !== undefined ? response.OverduePrincipal : '';
      fields.btsBalanceTerm.value = response.BalanceTerm !== null && response.BalanceTerm !== undefined ? response.BalanceTerm : '';
      fields.btsMaturityDate.value = response.MaturityDate ? formatDate(response.MaturityDate) : '';
      fields.btsOverdueInterest.value = response.OverdueInterest !== null && response.OverdueInterest !== undefined ? response.OverdueInterest : '';
      
      // Loan Status
      if (response.LoanStatus && fields.btsStatus) {
        fields.btsStatus.value = response.LoanStatus;
      }

      console.log("[PopulateForm] Form populated successfully with flattened response", {
        mappedIdentifiers: {
          branchId: fields.branchId.value,
          clientId: fields.clientId.value,
          accountId: fields.accountId.value,
          loanSeries: fields.loanSeries.value
        },
        mappedRescheduleBy: {
          changeTerm: fields.changeTerm.checked,
          changeRate: fields.changeRate.checked,
          proposedInterestRate: fields.proposedInterestRate.value
        },
        mappedBTS: {
          loanAmount: fields.btsLoanAmount.value,
          outstandingPrincipal: fields.btsOutstandingPrincipal.value,
          maturityDate: fields.btsMaturityDate.value
        }
      });
    } catch (error) {
      console.error("[PopulateForm] Error populating form:", error);
    }
  };

  // Helper function to convert various boolean representations to boolean
  const convertToBoolean = (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') return value.toLowerCase() === 'true' || value === '1';
    return false;
  };

  // Helper function to format dates
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    } catch (e) {
      console.warn("[FormatDate] Invalid date:", dateString);
      return '';
    }
  };

  const handleAddClick = () => {
    clearFormDataForAdd();
    fields.branchId.disabled = true;
    fields.clientId.disabled = true;
    fields.accountId.disabled = true;
    setFormMode("add");
    fields.changeTerm.focus();
    showToast("Add mode enabled - Behind The Scene data preserved", "info");
  };

  const handleEditClick = () => {
    if (!formState.loanData) {
      showToast("No loan data loaded", "warning");
      return;
    }
    setFormMode("edit");
    showToast("Edit mode enabled", "info");
  };

  const handleProceedClick = async () => {
    if (!validateIdentifiers()) return;

    console.log("[Proceed] Building component list");

    const branchId = fields.branchId.value.trim();
    const accountId = fields.accountId.value.trim();
    const loanSeries = fields.loanSeries.value.trim();

    try {
      // Database Call #5: GET LOAN RESCHEDULE COMPONENTS
      const components = await LoanRescheduleInitiationService.getLoanRescheduleComponents(
        branchId,
        accountId,
        loanSeries,
        "web_portal"
      );

      if (!components || components.length === 0) {
        showToast("No components found for this loan", "info");
        return;
      }

      formState.components = components;
      renderComponentsGrid();
      setFormMode("edit");
      showToast("Components loaded. You can now update proposed amounts.", "success");
    } catch (error) {
      console.error("[Proceed] Error:", error);
      showToast("Error proceeding with reschedule", "error");
    }
  };

  const handleAlterClick = () => {
    // Check if a component is selected
    if (formState.selectedComponentIndex < 0) {
      showToast("Please select a component to alter", "error");
      return;
    }
    
    // Enable ProposedAmount field for editing
    fields.proposedAmount.disabled = false;
    fields.proposedAmount.focus();
    
    // Enable Update and Clear buttons
    actionButtons.update.disabled = false;
    actionButtons.clear.disabled = false;
    actionButtons.alter.disabled = true;
    
    console.log('[Alter] Component editor enabled for editing');
  };

  const handleUpdateClick = () => {
    if (formState.selectedComponentIndex < 0) {
      showToast("No component selected", "error");
      return;
    }
    
    const proposedAmount = parseFloat(fields.proposedAmount.value || 0);
    const actualAmount = parseFloat(fields.actualAmount.value || 0);
    
    // Validation: proposed cannot be empty
    if (proposedAmount <= 0) {
      showToast("Proposed amount must be greater than 0", "error");
      return;
    }
    
    // Validation: For non-CLIENT_PAYMENT components, proposed cannot exceed actual
    const component = formState.components[formState.selectedComponentIndex];
    if (component && component.ComponentID !== 'CLIENT_PAYMENT' && proposedAmount > actualAmount) {
      showToast("Proposed amount cannot exceed actual amount", "error");
      return;
    }
    
    // Update the component in the grid
    formState.components[formState.selectedComponentIndex].ProposedAmount = proposedAmount;
    formState.isDirty = true;
    
    // Disable editor fields
    fields.proposedAmount.disabled = true;
    
    // Disable Update and Clear, enable Alter
    actionButtons.update.disabled = true;
    actionButtons.clear.disabled = true;
    actionButtons.alter.disabled = false;
    
    // Re-render grid to show updated values
    renderComponentsGrid();
    
    // Clear selection and editor
    formState.selectedComponentIndex = -1;
    fields.component.value = '';
    fields.actualAmount.value = '';
    fields.proposedAmount.value = '';
    
    showToast("Component updated successfully", "success");
    console.log('[Update] Component updated and grid refreshed');
  };

  const handleClearClick = () => {
    // Clear component editor fields
    fields.component.value = "";
    fields.actualAmount.value = "";
    fields.proposedAmount.value = "";
    
    // Disable editor fields
    fields.proposedAmount.disabled = true;
    
    // Reset button states
    actionButtons.update.disabled = true;
    actionButtons.clear.disabled = true;
    actionButtons.alter.disabled = false;
    
    // Clear selection
    formState.selectedComponentIndex = -1;
    
    showToast("Component editor cleared", "info");
    console.log('[Clear] Component editor cleared');
  };

  const handleSaveClick = async () => {
    // Validate that we have loan data
    if (!validateIdentifiers()) return;
    
    // Validate that at least one reschedule option is selected
    if (!fields.changeTerm.checked && !fields.changeRate.checked) {
      showToast("Please select \"Change Term\" or \"Change Rate\"", "error");
      return;
    }

    const branchId = fields.branchId.value.trim();
    const accountId = fields.accountId.value.trim();
    const clientId = fields.clientId.value.trim();
    const loanSeries = fields.loanSeries.value.trim();

    if (!confirm("Are you sure you want to save this reschedule initiation?")) {
      return;
    }

    console.log("[Save] Saving reschedule with components:", formState.components);

    try {
      // Show loading state
      const saveBtn = actionButtons.save;
      const originalText = saveBtn?.textContent;
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Saving...';
      }

      // Database Call #9: SAVE LOAN RESCHEDULE
      const rescheduleData = {
        ourBranchID: branchId,
        clientID: clientId,
        accountID: accountId,
        loanSeries: parseInt(loanSeries),
        isChangeTerm: fields.changeTerm.checked ? 1 : 0,
        isRateofIntChange: fields.changeRate.checked ? 1 : 0,
        proposedInterestRate: fields.changeRate.checked ? Number(fields.proposedInterestRate.value || 0) : null,
        fromInstNo: Number(fields.fromInstallmentNo.value || 0),
        isPostponeDueInst: fields.postponeOverdue.checked ? 1 : 0,
        isBrokenPeriod: fields.withBreakPeriod.checked ? 1 : 0,
        brokenTerm: fields.withBreakPeriod.checked ? Number(fields.breakTermMonths.value || 0) : null,
        termExtendReduceID: fields.changeTerm.checked ? fields.rescheduleTermType.value : null,
        extRedTerm: fields.changeTerm.checked ? Number(fields.newTerm.value || 0) : null,
        rescheduleStartDate: fields.rescheduleStartDate.value || null,
        proposedTerm: fields.changeTerm.checked ? Number(fields.proposedTerm.value || 0) : null,
        rescheduleStatusID: 'RP',
        operatorID: 'web_portal',
        collectInterestDuringBreak: fields.withBreakPeriod.checked ? (fields.collectInterestDuringBreak.checked ? 1 : 0) : 0,
        repaymentFrequencyID: fields.changeTerm.checked ? fields.repaymentFrequency.value : null,
        updateCount: 1,
        components: formState.components
      };

      console.log("[Save] Reschedule data:", rescheduleData);

      const response = await LoanRescheduleInitiationService.saveLoanReschedule(rescheduleData);

      console.log("[Save] Response:", response);

      // Restore button state
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
      }

      // Handle response
      if (response && response.success) {
        showToast("Loan reschedule saved successfully", "success");
        formState.isDirty = false;
        
        // Reset form to view mode
        clearFormData();
        setFormMode("search");
        
        console.log('[Save] Loan reschedule saved successfully');
      } else if (response && response.message) {
        showToast("Save failed: " + response.message, "error");
        console.error('[Save] Save failed:', response.message);
      } else {
        showToast("Failed to save reschedule initiation. Please try again.", "error");
        console.error('[Save] Unexpected response:', response);
      }
    } catch (error) {
      console.error("[Save] Error:", error);
      showToast("Error saving reschedule: " + (error.message || 'Unknown error'), "error");
      
      // Restore button state
      const saveBtn = actionButtons.save;
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save";
      }
    }
  };

  const handleCancelClick = () => {
    if (!confirm("Are you sure you want to cancel?")) {
      return;
    }
    clearFormData();
    setFormMode("view");
    showToast("Changes cancelled", "info");
  };

  const handleDeleteClick = () => {
    showToast("Delete functionality coming soon", "info");
  };

  const handleSuperviseClick = () => {
    showToast("Supervise functionality coming soon", "info");
  };

  // Database Call #6: GET LOAN INSTALLMENTS (Schedule button)
  const handleScheduleClick = async () => {
    if (!validateIdentifiers()) return;

    try {
      const ourBranchId = fields.branchId.value.trim();
      const accountId = fields.accountId.value.trim();
      const loanSeries = fields.loanSeries.value.trim();

      console.log("[Schedule] Loading installment schedule");
      console.log("[DEBUG] BranchID Field element:", fields.branchId);
      console.log("[DEBUG] BranchID Value:", ourBranchId);
      console.log("[DEBUG] AccountID Value:", accountId);
      console.log("[DEBUG] LoanSeries Value:", loanSeries);

      const installments = await LoanRescheduleInitiationService.getLoanInstallments(
        ourBranchId,
        accountId,
        loanSeries
      );

      if (!installments || installments.length === 0) {
        showToast("No installment schedule found", "info");
        return;
      }

      // Display in a modal or table
      console.log("[Schedule] Installments:", installments);
      displayInstallmentScheduleModal(installments);
      showToast(`Loaded ${installments.length} installments`, "success");
    } catch (error) {
      console.error("[Schedule] Error:", error);
      showToast("Error loading installment schedule", "error");
    }
  };

  // Database Call #7: GET LOAN REPAYMENT DETAIL (Payment button)
  const handlePaymentClick = async () => {
    if (!validateIdentifiers()) return;

    try {
      const ourBranchId = fields.branchId.value.trim();
      const accountId = fields.accountId.value.trim();
      const loanSeries = fields.loanSeries.value.trim();

      console.log("[Payment] Loading repayment details");
      console.log("[DEBUG] BranchID Value:", ourBranchId);
      console.log("[DEBUG] AccountID Value:", accountId);
      console.log("[DEBUG] LoanSeries Value:", loanSeries);

      const paymentDetails = await LoanRescheduleInitiationService.getLoanRepaymentDetail(
        ourBranchId,
        accountId,
        loanSeries,
        "web_portal"
      );

      if (!paymentDetails || paymentDetails.length === 0) {
        showToast("No repayment details found", "info");
        return;
      }

      console.log("[Payment] Details:", paymentDetails);
      displayRepaymentDetailsModal(paymentDetails);
      showToast(`Loaded repayment details`, "success");
    } catch (error) {
      console.error("[Payment] Error:", error);
      showToast("Error loading repayment details", "error");
    }
  };

  // Database Call #8: GENERATE NEW SCHEDULE (New Schedule button)
  const handleNewScheduleClick = async () => {
    if (!validateIdentifiers()) return;

    try {
      const ourBranchId = fields.branchId.value.trim();
      const accountId = fields.accountId.value.trim();
      const loanSeries = fields.loanSeries.value.trim();

      console.log("[NewSchedule] Generating new installment schedule");
      console.log("[DEBUG] BranchID Value:", ourBranchId);
      console.log("[DEBUG] AccountID Value:", accountId);
      console.log("[DEBUG] LoanSeries Value:", loanSeries);

      // Collect reschedule parameters
      const scheduleParams = {
        ourBranchID: ourBranchId,
        accountID: accountId,
        loanSeries: parseInt(loanSeries),
        amount: formState.loanData?.loanAmount || 0,
        interestRate: fields.proposedInterestRate.value || formState.loanData?.interestRate || 0,
        periodTypeID: 'M',
        installmentFrequencyID: fields.repaymentFrequency.value || 'M',
        term: Number(fields.newTerm.value || 0),
        installmentStartDate: fields.rescheduleStartDate.value,
        createdBy: 'web_portal',
        loanDisbDate: formState.loanData?.disbursementDate || new Date().toISOString(),
        startInstallmentNo: fields.fromInstallmentNo.value || '1',
        gracePeriodReschedule: '0',
        collectInterestDuringBreakPeriod: fields.collectInterestDuringBreak.checked ? 'true' : 'false'
      };

      const newSchedule = await LoanRescheduleInitiationService.generateLoanRescheduleInstallment(scheduleParams);

      if (!newSchedule || newSchedule.length === 0) {
        showToast("No schedule generated. Please verify parameters.", "warning");
        return;
      }

      console.log("[NewSchedule] Generated schedule:", newSchedule);
      displayNewScheduleModal(newSchedule);
      showToast("New schedule generated successfully", "success");
    } catch (error) {
      console.error("[NewSchedule] Error:", error);
      showToast("Error generating new schedule: " + (error.message || 'Unknown error'), "error");
    }
  };

  // Helper: Display installment schedule modal
  const displayInstallmentScheduleModal = (installments) => {
    const tableBody = document.getElementById('scheduleTableBody');
    if (!tableBody) {
      console.error('[DisplaySchedule] Schedule table body not found');
      return;
    }
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    // Add installment rows
    installments.forEach((inst) => {
      // Skip summary rows (no installment number)
      if (!inst.InstallmentNo) {
        return;
      }
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${inst.InstallmentNo}</td>
        <td>${inst.InstallmentDueDate || ''}</td>
        <td class="text-end">${Number(inst.InstallmentAmount || 0).toFixed(2)}</td>
        <td class="text-end">${Number(inst.PrincipalDue || 0).toFixed(2)}</td>
        <td class="text-end">${Number(inst.InterestDue || 0).toFixed(2)}</td>
        <td class="text-end">${Number(inst.LoanBalance || 0).toFixed(2)}</td>
        <td>${inst.PaidStatus === 1 || inst.PaidStatus === '1' ? '<span class="badge bg-success">Paid</span>' : '<span class="badge bg-warning">Pending</span>'}</td>
      `;
      tableBody.appendChild(row);
    });
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('scheduleModal'));
    modal.show();
    
    console.log('[DisplaySchedule] Schedule modal displayed with', installments.length, 'records');
  };

  const displayRepaymentDetailsModal = (details) => {
    const paymentContent = document.getElementById('paymentContent');
    if (!paymentContent) {
      console.error('[DisplayPayment] Payment content container not found');
      return;
    }
    
    // Clear existing content
    paymentContent.innerHTML = '';
    
    if (!details || details.length === 0) {
      paymentContent.innerHTML = '<p class="text-muted">No repayment details found.</p>';
    } else {
      // Create details table
      let html = '<div class="table-responsive"><table class="table table-sm table-bordered">';
      html += '<thead class="table-light"><tr>';
      
      // Get all unique keys from details
      const firstRow = details[0];
      const keys = Object.keys(firstRow);
      keys.forEach(key => {
        html += `<th class="fw-bold">${key}</th>`;
      });
      
      html += '</tr></thead><tbody>';
      
      // Add rows
      details.forEach(item => {
        html += '<tr>';
        keys.forEach(key => {
          html += `<td>${item[key] || ''}</td>`;
        });
        html += '</tr>';
      });
      
      html += '</tbody></table></div>';
      paymentContent.innerHTML = html;
    }
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('paymentModal'));
    modal.show();
    
    console.log('[DisplayPayment] Payment details modal displayed');
  };

  const displayNewScheduleModal = (scheduleData) => {
    const tableBody = document.getElementById('generatedScheduleTableBody');
    if (!tableBody) {
      console.error('[DisplayNewSchedule] Generated schedule table body not found');
      return;
    }
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    if (!Array.isArray(scheduleData) || scheduleData.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = '<td colspan="6" class="text-center text-muted">No schedule data generated</td>';
      tableBody.appendChild(row);
    } else {
      // Add generated schedule rows
      scheduleData.forEach((inst) => {
        // Skip summary rows (no installment number)
        if (!inst.InstallmentNo) {
          return;
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${inst.InstallmentNo}</td>
          <td>${inst.InstallmentDueDate || inst.DueDate || ''}</td>
          <td class="text-end">${Number(inst.InstallmentAmount || inst.Amount || 0).toFixed(2)}</td>
          <td class="text-end">${Number(inst.PrincipalDue || inst.Principal || 0).toFixed(2)}</td>
          <td class="text-end">${Number(inst.InterestDue || inst.Interest || 0).toFixed(2)}</td>
          <td class="text-end">${Number(inst.LoanBalance || 0).toFixed(2)}</td>
        `;
        tableBody.appendChild(row);
      });
    }
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('generatedScheduleModal'));
    modal.show();
    
    console.log('[DisplayNewSchedule] New schedule modal displayed with', scheduleData.length, 'records');
  };

  // Validation
  const validateIdentifiers = () => {
    if (!fields.branchId.value.trim()) {
      showToast("Please select a Branch ID", "warning");
      fields.branchId.focus();
      return false;
    }
    if (!fields.accountId.value.trim()) {
      showToast("Please select an Account ID", "warning");
      fields.accountId.focus();
      return false;
    }
    return true;
  };

  // Data population
  const populateFormData = (data) => {
    if (!data) return;

    if (fields.branchName && data.branchName) {
      fields.branchName.value = data.branchName;
    }
    if (fields.clientName && data.clientName) {
      fields.clientName.value = data.clientName;
    }
    if (fields.loanSeries && data.loanSeries) {
      fields.loanSeries.value = data.loanSeries;
    }
  };

  const populateBTSData = (data) => {
    if (!data) return;

    if (fields.btsLoanAmount) fields.btsLoanAmount.value = data.loanAmount || "";
    if (fields.btsOutstandingPrincipal) fields.btsOutstandingPrincipal.value = data.outstandingPrincipal || "";
    if (fields.btsTotalTerm) fields.btsTotalTerm.value = data.totalTerm || "";
    if (fields.btsProductId) fields.btsProductId.value = data.productId || "";
    if (fields.btsOverduePrincipal) fields.btsOverduePrincipal.value = data.overduePrincipal || "";
    if (fields.btsBalanceTerm) fields.btsBalanceTerm.value = data.balanceTerm || "";
    if (fields.btsMaturityDate) fields.btsMaturityDate.value = data.maturityDate || "";
    if (fields.btsOverdueInterest) fields.btsOverdueInterest.value = data.overdueInterest || "";
    if (fields.btsStatus) fields.btsStatus.value = data.status || "";
  };

  // Helper function to get operator ID
  const getOperatorId = () => {
    return AuthService?.getCurrentUser?.()?.OperatorId || 'web_portal';
  };

  // Helper function to get branch ID
  const getOurBranchId = () => {
    return fields.branchId?.value || '';
  };

  // Wait for SearchModal to be available
  function waitForSearchModal(callback, maxWaitMs = 5000, intervalMs = 100) {
    const start = Date.now();
    (function poll() {
      if (window.SearchModal) {
        callback();
      } else if (Date.now() - start < maxWaitMs) {
        setTimeout(poll, intervalMs);
      } else {
        console.warn('[LoanRescheduleInitiation] SearchModal not available after timeout');
      }
    })();
  }

  // Setup search handlers for lookups using SearchModal
  const setupSearchHandlers = () => {
    waitForSearchModal(() => {
      // Branch Search Modal
      const branchModal = new window.SearchModal({
        prefix: 'lri-branch-search',
        moduleID: MODULE_ID,
        getOperatorId,
        getOurBranchId
      });

      const branchSearchBtn = form?.querySelector("[data-lookup='branch']");
      if (branchSearchBtn) {
        branchSearchBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const branchIDValue = fields.branchId?.value || '';
          branchModal.open({
            tableID: 'BranchID',
            searchFields: [
              { name: 'BranchID', label: 'Branch ID', column: 'OurBranchID', value: branchIDValue },
              { name: 'BranchName', label: 'Branch Name', column: 'BranchName' }
            ],
            autoSearch: !!branchIDValue,
            onSelect: (record) => {
              fields.branchId.value = record.OurBranchID || '';
              fields.branchName.value = record.BranchName || '';
              showToast("Branch selected: " + record.BranchName, "success");
            }
          });
        });
      }

      // Client Search Modal
      const clientModal = new window.SearchModal({
        prefix: 'lri-client-search',
        moduleID: MODULE_ID,
        getOperatorId,
        getOurBranchId
      });

      const clientSearchBtn = form?.querySelector("[data-lookup='client']");
      if (clientSearchBtn) {
        clientSearchBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const branchID = fields.branchId?.value;
          if (!branchID) {
            showToast("Please select a Branch first", "warning");
            return;
          }
          const clientIDValue = fields.clientId?.value || '';
          clientModal.open({
            tableID: 'ClientAccountID',
            whereStmt: `ProductTypeID='LN' AND OurBranchID = '${branchID}'`,
            searchFields: [
              { name: 'ClientID', label: 'Client ID', column: 'ClientID', value: clientIDValue },
              { name: 'ClientName', label: 'Client Name', column: 'ClientName' }
            ],
            autoSearch: !!clientIDValue,
            onSelect: (record) => {
              fields.clientId.value = record.ClientID || '';
              fields.clientName.value = record.ClientName || record.Name || '';
              showToast("Client selected: " + (record.ClientName || record.Name), "success");
            }
          });
        });
      }

      // Account Search Modal
      const accountModal = new window.SearchModal({
        prefix: 'lri-account-search',
        moduleID: MODULE_ID,
        getOperatorId,
        getOurBranchId
      });

      const accountSearchBtn = form?.querySelector("[data-lookup='account']");
      if (accountSearchBtn) {
        accountSearchBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const branchID = fields.branchId?.value;
          if (!branchID) {
            showToast("Please select a Branch first", "warning");
            return;
          }
          const accountIDValue = fields.accountId?.value || '';
          accountModal.open({
            tableID: 'LoanID',
            whereStmt: `OurBranchID='${branchID}' AND LoanStatusID IN('A','N')`,
            searchFields: [
              { name: 'AccountID', label: 'Account ID', column: 'AccountID', value: accountIDValue },
              { name: 'AccountName', label: 'Account Name', column: 'Name' },
              { name: 'LoanSeries', label: 'Loan Series', column: 'LoanSeries' }
            ],
            autoSearch: !!accountIDValue,
            onSelect: (record) => {
              fields.accountId.value = record.AccountID || '';
              fields.accountName.value = record.Name || '';
              fields.loanSeries.value = record.LoanSeries || '';
              showToast("Account selected", "success");
            }
          });
        });
      }
    });
  };

  // Setup blur event handlers for auto-lookup (mirrors Loan Maintenance GetDescription logic)
  const setupBlurHandlers = () => {
    // Helper function to perform lookup on blur
    const performLookup = async (fieldId, relatedFieldId, tableID, whereColumn, advFilterString = '') => {
      const value = (fields[fieldId]?.value || '').trim();
      
      if (!value) {
        if (fields[relatedFieldId]) {
          fields[relatedFieldId].value = '';
        }
        return null;
      }

      try {
        if (!window.SearchService) {
          console.warn('[LoanRescheduleInitiation] SearchService not available');
          return null;
        }

        const whereStmt = `${whereColumn} LIKE '%${value.replace(/'/g, "''")}'`;
        const operatorId = getOperatorId();
        const branchId = (fields.branchId?.value || '').trim();

        const response = await window.SearchService.searchClients({
          TableID: tableID,
          WhereStmt: whereStmt,
          AdvFilterString: advFilterString,
          PrevOrNext: '1',
          RefID: '',
          OperatorID: operatorId,
          ModuleID: MODULE_ID,
          OurBranchID: branchId || value,
          SearchKey: ''
        });

        const responseData = response?.Details || response?.Data || [];
        if (responseData && responseData.length > 0) {
          const record = responseData[0];
          let displayValue = '';

          switch (tableID) {
            case 'BranchID':
              displayValue = record.BranchName || record.Name || '';
              break;
            case 'ClientAccountID':
              displayValue = record.ClientName || record.Name || '';
              break;
            case 'LoanID':
              displayValue = record.AccountName || record.Name || '';
              break;
            default:
              displayValue = record.Name || '';
          }

          if (fields[relatedFieldId]) {
            fields[relatedFieldId].value = displayValue;
          }
          return record;
        } else {
          if (fields[relatedFieldId]) {
            fields[relatedFieldId].value = '';
          }
          return null;
        }
      } catch (error) {
        console.error(`[LoanRescheduleInitiation] Lookup failed for ${fieldId}:`, error);
        return null;
      }
    };

    // Branch ID blur handler
    if (fields.branchId) {
      fields.branchId.addEventListener('blur', () => {
        performLookup('branchId', 'branchName', 'BranchID', 'OurBranchID');
      });
    }

    // Client ID blur handler
    if (fields.clientId) {
      fields.clientId.addEventListener('blur', () => {
        const advFilter = `ProductTypeID='LN'`;
        performLookup('clientId', 'clientName', 'ClientAccountID', 'ClientID', advFilter);
      });
    }

    // Account ID blur handler
    if (fields.accountId) {
      fields.accountId.addEventListener('blur', async () => {
        const value = (fields.accountId?.value || '').trim();
        if (!value) {
          if (fields.accountName) fields.accountName.value = '';
          if (fields.loanSeries) fields.loanSeries.value = '';
          return;
        }

        try {
          if (!window.SearchService) {
            console.warn('[LoanRescheduleInitiation] SearchService not available');
            return;
          }

          const branchId = (fields.branchId?.value || '').trim();
          let whereStmt = `AccountID = '${value.replace(/'/g, "''")}'`;
          if (branchId) {
            whereStmt += ` AND OurBranchID = '${branchId.replace(/'/g, "''")}'`;
          }

          const response = await window.SearchService.searchClients({
            TableID: 'LoanID',
            WhereStmt: whereStmt,
            AdvFilterString: '',
            PrevOrNext: '1',
            RefID: '',
            OperatorID: getOperatorId(),
            ModuleID: MODULE_ID,
            OurBranchID: branchId || value,
            SearchKey: ''
          });

          const responseData = response?.Details || response?.Data || [];
          if (responseData.length > 0) {
            const record = responseData[0];
            if (fields.accountName) fields.accountName.value = record.AccountName || record.Name || '';
            if (fields.loanSeries) fields.loanSeries.value = record.LoanSeries || '';
          } else {
            if (fields.accountName) fields.accountName.value = '';
            if (fields.loanSeries) fields.loanSeries.value = '';
          }
        } catch (error) {
          console.error('[LoanRescheduleInitiation] AccountID blur lookup failed:', error);
          if (fields.accountName) fields.accountName.value = '';
          if (fields.loanSeries) fields.loanSeries.value = '';
        }
      });
    }
  };

  // Populate dropdowns on init
  const populateDropdowns = async () => {
    try {
      console.log('[Init] Populating dropdowns...');

      // Load TermExtendReduceID dropdown
      if (fields.rescheduleTermType && global.LookupService) {
        const termTypes = await global.LookupService.getSystemCodeOptions('TermExtendReduceID');
        console.log('[Init] TermExtendReduceID options:', termTypes);
        
        // Clear existing options except placeholder
        fields.rescheduleTermType.innerHTML = '<option value="">--Select--</option>';
        
        termTypes.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt.value;
          option.textContent = opt.label;
          fields.rescheduleTermType.appendChild(option);
        });
        
        console.log(`[Init] Populated RescheduleTermType with ${termTypes.length} options`);
      }

      // Load RepaymentFrequencyID dropdown
      if (fields.repaymentFrequency && global.LookupService) {
        const frequencies = await global.LookupService.getSystemCodeOptions('InstallmentFrequencyID');
        console.log('[Init] InstallmentFrequencyID options:', frequencies);
        
        // Clear existing options except placeholder
        fields.repaymentFrequency.innerHTML = '<option value="">--Select--</option>';
        
        frequencies.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt.value;
          option.textContent = opt.label;
          fields.repaymentFrequency.appendChild(option);
        });
        
        console.log(`[Init] Populated RepaymentFrequency with ${frequencies.length} options`);
      }
      
      // Disable Reschedule Details fields initially
      disableRescheduleDetailsFields();

      console.log('[Init] Dropdowns populated and Reschedule Details fields disabled');
    } catch (error) {
      console.error('[Init] Error populating dropdowns:', error);
    }
  };

  // Initialize
  const init = async () => {
    if (!form) {
      console.error("Form not found");
      return;
    }

    console.log("[Init] Initializing Loan Reschedule Initiation");

    // Setup event listeners for action buttons
    actionButtons.view?.addEventListener("click", handleViewClick);
    actionButtons.add?.addEventListener("click", handleAddClick);
    actionButtons.edit?.addEventListener("click", handleEditClick);
    actionButtons.delete?.addEventListener("click", handleDeleteClick);
    actionButtons.save?.addEventListener("click", handleSaveClick);
    actionButtons.cancel?.addEventListener("click", handleCancelClick);
    actionButtons.proceed?.addEventListener("click", handleProceedClick);
    actionButtons.alter?.addEventListener("click", handleAlterClick);
    actionButtons.update?.addEventListener("click", handleUpdateClick);
    actionButtons.clear?.addEventListener("click", handleClearClick);
    actionButtons.supervise?.addEventListener("click", handleSuperviseClick);
    actionButtons.schedule?.addEventListener("click", handleScheduleClick);
    actionButtons.payment?.addEventListener("click", handlePaymentClick);
    actionButtons.newSchedule?.addEventListener("click", handleNewScheduleClick);

    // Setup checkbox change handlers
    if (fields.changeTerm) {
      fields.changeTerm.addEventListener("change", handleChangeTermCheckbox);
    }
    if (fields.changeRate) {
      fields.changeRate.addEventListener("change", handleChangeRateCheckbox);
    }
    if (fields.withBreakPeriod) {
      fields.withBreakPeriod.addEventListener("change", handleWithBreakPeriodCheckbox);
    }

    // Setup dropdown change handler
    if (fields.rescheduleTermType) {
      fields.rescheduleTermType.addEventListener("change", handleRescheduleTermTypeChange);
    }

    // Setup validation handlers for term fields
    if (fields.breakTermMonths) {
      fields.breakTermMonths.addEventListener("blur", validateBreakTermMonths);
    }
    if (fields.newTerm) {
      fields.newTerm.addEventListener("blur", () => {
        if (validateNewTerm()) {
          calculateProposedTerm();
        }
      });
      fields.newTerm.addEventListener("input", calculateProposedTerm);
    }

    setupSearchHandlers();
    setupBlurHandlers();
    
    // Populate dropdowns
    await populateDropdowns();
    
    setFormMode("search");

    console.log("[Init] Loan Reschedule Initiation initialized successfully");
  };

  // Auto-initialize on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Export to global scope
  global.LoanRescheduleInitiation = {
    getFormState: () => formState,
    setFormMode: setFormMode,
    clearFormData: clearFormData
  };
})(window);
