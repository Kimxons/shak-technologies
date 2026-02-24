(function (global) {
  console.log("[RescheduleTrxPosting] Script loading...");
  
  if (global.__RescheduleTrxPostingLoaded) {
    console.warn("reschedule-trx-posting.js already loaded; skipping duplicate execution.");
    return;
  }
  global.__RescheduleTrxPostingLoaded = true;

  console.log("[RescheduleTrxPosting] Script initializing...");

  // ===========================================
  // RESCHEDULE TRX POSTING CONTROLLER
  // Pattern: Loan Maintenance Data Entry Module
  // Reference: loan-collaterals.js (828 lines)
  // ===========================================

  // Use services directly from window like loan-collaterals.js pattern
  // No local constants - access via window.RescheduleTrxPostingService directly

  console.log("[RescheduleTrxPosting] window.RescheduleTrxPostingService:", !!window.RescheduleTrxPostingService);
  console.log("[RescheduleTrxPosting] window.SearchService:", !!window.SearchService);

  // Root element selector
  const ROOT_ATTR = "[data-rtp-root]";

  // ========== UTILITY FUNCTIONS ==========

  /**
   * Format currency: 1000000 -> "1,000,000.00"
   */
  function formatCurrency(value) {
    const num = parseFloat(value);
    if (isNaN(num)) return "";
    return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /**
   * Format percentage: 50 -> "50.00%"
   */
  function formatPercentage(value) {
    const num = parseFloat(value);
    if (isNaN(num)) return "";
    return num.toFixed(2) + "%";
  }

  /**
   * Parse formatted value: "1,000,000.00" -> 1000000
   * Strips commas, percent signs, dollar signs
   */
  function parseFormattedValue(str) {
    if (!str) return 0;
    return parseFloat(String(str).replace(/,/g, "").replace(/%/g, "").replace(/\$/g, "")) || 0;
  }

  /**
   * Convert null to empty string
   */
  function convertNullToEmpty(value) {
    return value === null || value === undefined ? "" : value;
  }

  /**
   * Get context from parent Loan Maintenance window
   */
  function getContextFromParent() {
    try {
      if (global.self !== global.top && global.parent && global.parent.document) {
        const parentDoc = global.parent.document;
        return {
          BranchID: parentDoc.getElementById("BranchID")?.value || "",
          ClientID: parentDoc.getElementById("ClientID")?.value || "",
          AccountID: parentDoc.getElementById("AccountID")?.value || "",
          LoanSeries: parentDoc.getElementById("LoanSeries")?.value || ""
        };
      }
    } catch (err) {
      console.warn("[RescheduleTrxPosting] Cannot access parent context:", err);
    }
    return { BranchID: "", ClientID: "", AccountID: "", LoanSeries: "" };
  }

  // ========== MAIN CONTROLLER ==========

  function initRescheduleTrxPosting() {
    console.log("[RescheduleTrxPosting] initRescheduleTrxPosting() called");
    
    const root = document.querySelector(ROOT_ATTR);
    console.log("[RescheduleTrxPosting] Root element found:", !!root, ROOT_ATTR);
    console.log("[RescheduleTrxPosting] Root element:", root);
    
    if (!root) {
      console.warn("[RescheduleTrxPosting] Root element not found:", ROOT_ATTR);
      return;
    }

    console.log("[RescheduleTrxPosting] Root element details:", {
      tag: root.tagName,
      class: root.className,
      id: root.id,
      dataAttr: root.getAttribute('data-rtp-root')
    });

    // State - Enhanced with Legacy Variables
    let mode = "view"; // "view" | "add" | "edit"
    let EventID = "NONE"; // "NONE" | "ADD" | "EDIT" | "VIEW" - legacy compatibility
    let originalRow = null;
    let transactions = [];
    let dtBHSRescheduleTrxPost = null; // Legacy: Header record data
    let dtCurrencyRates = null; // Legacy: Currency rates table
    let MeanRate = 0; // Legacy: Mean rate for forex calculations
    let IsDenominationReqd = false; // Legacy: Whether denomination is required
    let dsDenomination = null; // Legacy: Denomination breakdown data
    let userHasRights = false; // Legacy: User rights check
    let tillDetails = []; // Till details from pc_GetTillDetailPerTill
    let selectedTillID = null; // Selected till ID when Cash is chosen

    // Form elements
    const elements = {
      // Identifiers
      BranchID: root.elements.BranchID,
      BranchName: root.querySelector("#BranchName"),
      ClientID: root.elements.ClientID,
      ClientName: root.querySelector("#ClientName"),
      AccountID: root.elements.AccountID,
      AccountName: root.querySelector("#AccountName"),
      LoanSeries: root.elements.LoanSeries,

      // Transaction Header - Left
      ClientContribution: root.elements.ClientContribution,
      LocalAmount: root.elements.LocalAmount,
      TransactionType: root.elements.TransactionType,
      AccountType: root.elements.AccountType,
      ContraAccountID: root.elements.ContraAccountID,
      ContraAccountName: root.querySelector("#ContraAccountName"),
      ValueDate: root.elements.ValueDate,
      Narration: root.elements.Narration,

      // Transaction Header - Right
      ExchangeRate: root.elements.ExchangeRate,
      ForexGainLoss: root.elements.ForexGainLoss,
      Till: root.elements.Till,
      ReferenceNo: root.elements.ReferenceNo,

      // Behind The Scene (read-only)
      LoanAmount: root.elements.LoanAmount,
      LoanBalance: root.elements.LoanBalance,
      ProposedAmount: root.elements.ProposedAmount,
      NetAmount: root.elements.NetAmount,
      ProductID: root.elements.ProductID,
      Status: root.elements.Status
    };

    // Action buttons
    const actionButtons = {
      view: root.querySelector("[data-action='view']"),
      add: root.querySelector("[data-action='add']"),
      save: root.querySelector("[data-action='save']"),
      cancel: root.querySelector("[data-action='cancel']"),
      proceed: root.querySelector("[data-action='proceed']")
    };

    // Debug: Log button state
    console.log("[RescheduleTrxPosting] Action buttons found:", {
      view: actionButtons.view ? "YES" : "NOT FOUND",
      add: actionButtons.add ? "YES" : "NOT FOUND",
      save: actionButtons.save ? "YES" : "NOT FOUND",
      cancel: actionButtons.cancel ? "YES" : "NOT FOUND",
      proceed: actionButtons.proceed ? "YES" : "NOT FOUND"
    });
    console.log("[RescheduleTrxPosting] Root element:", root);
    console.log("[RescheduleTrxPosting] window.RescheduleTrxPostingService available:", !!window.RescheduleTrxPostingService);

    // Grid elements
    const trxRowsBody = root.querySelector("[data-trx-rows]");
    const trxEmpty = root.querySelector("[data-trx-empty]");

    // Mode badge
    const modeBadge = root.querySelector("[data-form-mode]");

    // Editable fields (all fields except read-only Behind The Scene and identifiers in view mode)
    const editableFields = [
      "ClientContribution",
      "LocalAmount",
      "TransactionType",
      "AccountType",
      "ContraAccountID",
      "ValueDate",
      "Narration",
      "ExchangeRate",
      "ForexGainLoss",
      "Till",
      "ReferenceNo"
    ];

    // Currency fields for formatting
    const currencyFields = ["ClientContribution", "LocalAmount", "ForexGainLoss"];

    // ========== ERROR STYLING HELPERS ==========

    /**
     * Set field error styling (legacy: red borders from frmRescheduleTrxPosting)
     */
    function setFieldError(fieldName, showError = true) {
      const field = elements[fieldName];
      if (!field) return;

      const fieldGroup = field.closest(".rtp-row") || field.parentElement;
      if (fieldGroup) {
        if (showError) {
          fieldGroup.classList.add("rtp-field-error");
          fieldGroup.classList.remove("rtp-field-valid");
        } else {
          fieldGroup.classList.remove("rtp-field-error");
          fieldGroup.classList.add("rtp-field-valid");
        }
      }
    }

    /**
     * Clear field error styling (remove red border)
     */
    function clearFieldError(fieldName) {
      const field = elements[fieldName];
      if (!field) return;

      const fieldGroup = field.closest(".rtp-row") || field.parentElement;
      if (fieldGroup) {
        fieldGroup.classList.remove("rtp-field-error");
        fieldGroup.classList.remove("rtp-field-valid");
      }
    }

    /**
     * Clear all field errors
     */
    function clearAllFieldErrors() {
      editableFields.forEach((fieldName) => clearFieldError(fieldName));
    }

    // ========== BUTTON STATE MANAGEMENT (Loan Maintenance Pattern) ==========

    /**
     * Set action button states
     * Follows Loan Maintenance pattern for consistent UX
     */
    function setActionButtonsState({ view = false, add = false, save = false, cancel = false, proceed = false }) {
      console.log('[RescheduleTrxPosting] Setting button states:', { view, add, save, cancel, proceed });
      
      if (actionButtons.view) {
        actionButtons.view.disabled = !view;
        console.log('[RescheduleTrxPosting] View button disabled:', !view);
      }
      if (actionButtons.add) {
        actionButtons.add.disabled = !add;
        console.log('[RescheduleTrxPosting] Add button disabled:', !add);
      }
      if (actionButtons.save) {
        actionButtons.save.disabled = !save;
        console.log('[RescheduleTrxPosting] Save button disabled:', !save);
      }
      if (actionButtons.cancel) {
        actionButtons.cancel.disabled = !cancel;
        console.log('[RescheduleTrxPosting] Cancel button disabled:', !cancel);
      }
      if (actionButtons.proceed) {
        actionButtons.proceed.disabled = !proceed;
        console.log('[RescheduleTrxPosting] Proceed button disabled:', !proceed);
      }
    }

    /**
     * Set all form fields disabled state
     * Loan Maintenance pattern for form control
     * Note: Always keeps BranchID, ClientID, AccountID enabled for lookups
     */
    function setAllFieldsDisabled(disabled) {
      const allFields = root.querySelectorAll('input:not([readonly]), select:not([readonly]), textarea:not([readonly])');
      allFields.forEach((field) => {
        // Skip readonly fields (Behind The Scene, identifiers in view mode)
        if (!field.hasAttribute('readonly')) {
          // Always keep identifier fields enabled (needed for View operation)
          const fieldId = field.id || field.name || '';
          if (fieldId === 'BranchID' || fieldId === 'ClientID' || fieldId === 'AccountID') {
            field.disabled = false;
          } else {
            field.disabled = disabled;
          }
        }
      });
      
      // Keep identifier lookup buttons enabled
      const lookupButtons = root.querySelectorAll('[data-lookup]');
      lookupButtons.forEach((btn) => {
        const lookupType = btn.getAttribute('data-lookup');
        // Always enable branch, client, account lookup buttons
        if (lookupType === 'branch' || lookupType === 'client' || lookupType === 'account') {
          btn.disabled = false;
        } else {
          btn.disabled = disabled;
        }
      });
    }

    /**
     * Set only specific fields enabled (all others disabled)
     */
    function setFieldsEnabledOnly(enabledIds = []) {
      // First disable all
      setAllFieldsDisabled(true);
      
      // Then enable specified fields
      enabledIds.forEach((id) => {
        const field = elements[id] || document.getElementById(id);
        if (field && !field.hasAttribute('readonly')) {
          field.disabled = false;
        }
      });
    }

    // ========== FIELD MANAGEMENT ==========

    /**
     * Set fields enabled/disabled based on mode
     * View: all disabled
     * Add/Edit: editable fields enabled, read-only fields disabled
     * Legacy: Enhanced with Contra Account Type logic
     */
    function setFieldsEnabled(enabled) {
      editableFields.forEach((fieldName) => {
        const field = elements[fieldName];
        if (field) {
          field.disabled = !enabled;
        }
      });

      // Search fields (BranchID, ClientID, AccountID, ContraAccountID) should always be enabled
      // to allow users to search for records even in view mode
      if (elements.BranchID) elements.BranchID.disabled = false;
      if (elements.ClientID) elements.ClientID.disabled = false;
      if (elements.AccountID) elements.AccountID.disabled = false;
      if (elements.ContraAccountID) elements.ContraAccountID.disabled = false;

      // Identifiers behavior - enhanced legacy logic
      if (mode === "view") {
        // View mode: Keep search fields enabled but disable LoanSeries
        if (elements.LoanSeries) elements.LoanSeries.disabled = true;
      } else if (mode === "add") {
        // Add mode: All search fields already enabled above
        if (elements.LoanSeries) elements.LoanSeries.disabled = true; // Legacy: LoanSeries always disabled
      } else if (mode === "edit") {
        // Edit mode: All search fields already enabled above
        if (elements.LoanSeries) elements.LoanSeries.disabled = true;
      }

      // Legacy: ContraAccountID enable/disable based on TransactionType
      // Only enable if TransactionType == "T" (Transfer)
      const transactionType = elements.TransactionType?.value || "";
      if (elements.ContraAccountID) {
        if (enabled && transactionType === "Transfer") {
          elements.ContraAccountID.disabled = false;
        } else {
          elements.ContraAccountID.disabled = true;
        }
      }

      // Legacy: ExchangeRate enable/disable based on currency match
      // If ProductCurrency == LocalCurrency, disable ExchangeRate
      if (dtBHSRescheduleTrxPost) {
        const productCurrency = dtBHSRescheduleTrxPost.CurrencyID || "";
        const localCurrency = "KES"; // TODO: Get from system config
        if (elements.ExchangeRate) {
          if (enabled && productCurrency !== localCurrency) {
            elements.ExchangeRate.disabled = false;
          } else {
            elements.ExchangeRate.disabled = true;
          }
        }
      }

      // Behind The Scene fields always disabled
      const readOnlyFields = ["LoanAmount", "LoanBalance", "ProposedAmount", "NetAmount", "ProductID", "Status"];
      readOnlyFields.forEach((fieldName) => {
        const field = elements[fieldName];
        if (field) field.disabled = true;
      });

      // BranchName always readonly (populated from BranchID search)
      if (elements.BranchName) elements.BranchName.readOnly = true;
    }

    /**
     * Apply currency formatting to fields
     */
    function formatCurrencyFields() {
      currencyFields.forEach((fieldName) => {
        const field = elements[fieldName];
        if (field && field.value) {
          const parsed = parseFormattedValue(field.value);
          field.value = formatCurrency(parsed);
        }
      });
    }

    /**
     * Attach blur event handlers for currency formatting
     */
    function attachCurrencyFormatHandlers() {
      currencyFields.forEach((fieldName) => {
        const field = elements[fieldName];
        if (field) {
          field.addEventListener("blur", () => {
            if (field.value) {
              const parsed = parseFormattedValue(field.value);
              field.value = formatCurrency(parsed);
            }
          });
          field.addEventListener("focus", () => {
            if (field.value) {
              const parsed = parseFormattedValue(field.value);
              field.value = parsed;
            }
          });
        }
      });
    }

    /**
     * Clear all editable fields
     */
    function clearTopForm() {
      editableFields.forEach((fieldName) => {
        const field = elements[fieldName];
        if (field) {
          field.value = "";
        }
      });

      // Clear identifiers (except BranchID which comes from parent)
      if (elements.ClientID) elements.ClientID.value = "";
      if (elements.AccountID) elements.AccountID.value = "";
      if (elements.LoanSeries) elements.LoanSeries.value = "";

      // Clear Behind The Scene
      if (elements.LoanAmount) elements.LoanAmount.value = "";
      if (elements.LoanBalance) elements.LoanBalance.value = "";
      if (elements.ProposedAmount) elements.ProposedAmount.value = "";
      if (elements.NetAmount) elements.NetAmount.value = "";
      if (elements.ProductID) elements.ProductID.value = "";
      if (elements.Status) elements.Status.value = "";

      // Clear transaction grid
      transactions = [];
      renderTransactions();
    }

    /**
     * Fill form from row data
     */
    function fillForm(row) {
      if (!row) return;

      // Identifiers
      if (elements.ClientID) elements.ClientID.value = convertNullToEmpty(row.ClientID);
      if (elements.AccountID) elements.AccountID.value = convertNullToEmpty(row.AccountID);
      if (elements.LoanSeries) elements.LoanSeries.value = convertNullToEmpty(row.LoanSeries);

      // Transaction Header
      if (elements.ClientContribution) elements.ClientContribution.value = formatCurrency(row.ClientContribution || 0);
      if (elements.LocalAmount) elements.LocalAmount.value = formatCurrency(row.LocalAmount || 0);
      if (elements.TransactionType) elements.TransactionType.value = convertNullToEmpty(row.TransactionType);
      if (elements.AccountType) elements.AccountType.value = convertNullToEmpty(row.AccountType);
      if (elements.ContraAccountID) elements.ContraAccountID.value = convertNullToEmpty(row.ContraAccountID);
      if (elements.ValueDate) elements.ValueDate.value = convertNullToEmpty(row.ValueDate);
      if (elements.Narration) elements.Narration.value = convertNullToEmpty(row.Narration);
      if (elements.ExchangeRate) elements.ExchangeRate.value = convertNullToEmpty(row.ExchangeRate);
      if (elements.ForexGainLoss) elements.ForexGainLoss.value = formatCurrency(row.ForexGainLoss || 0);
      if (elements.Till) elements.Till.value = convertNullToEmpty(row.Till);
      if (elements.ReferenceNo) elements.ReferenceNo.value = convertNullToEmpty(row.ReferenceNo);

      // Behind The Scene
      if (elements.LoanAmount) elements.LoanAmount.value = convertNullToEmpty(row.LoanAmount);
      if (elements.LoanBalance) elements.LoanBalance.value = convertNullToEmpty(row.LoanBalance);
      if (elements.ProposedAmount) elements.ProposedAmount.value = convertNullToEmpty(row.ProposedAmount);
      if (elements.NetAmount) elements.NetAmount.value = convertNullToEmpty(row.NetAmount);
      if (elements.ProductID) elements.ProductID.value = convertNullToEmpty(row.ProductID);
      if (elements.Status) elements.Status.value = convertNullToEmpty(row.Status);

      // Load transaction lines if available
      if (row.Transactions && Array.isArray(row.Transactions)) {
        transactions = row.Transactions;
        renderTransactions();
      }
    }

    // ========== MODE MANAGEMENT (Loan Maintenance Pattern) ==========

    /**
     * Set Entry Mode (Initial state)
     * Only View button enabled, all fields disabled
     */
    function setEntryMode() {
      console.log('[RescheduleTrxPosting] Setting Entry Mode');
      mode = "entry";
      EventID = "NONE";
      
      // Button states: Only View enabled
      setActionButtonsState({ 
        view: true, 
        add: false, 
        save: false, 
        cancel: false, 
        proceed: false 
      });
      
      // All fields disabled
      setAllFieldsDisabled(true);
      
      // Update mode badge
      if (modeBadge) {
        modeBadge.textContent = 'Entry';
        modeBadge.className = 'badge bg-secondary';
      }
    }

    /**
     * Set View Mode
     * View complete, can now Edit/Add
     */
    function setViewMode() {
      console.log('[RescheduleTrxPosting] Setting View Mode');
      mode = "view";
      EventID = "VIEW";
      
      // Button states: View disabled, Add enabled, others disabled
      setActionButtonsState({ 
        view: false, 
        add: true, 
        save: false, 
        cancel: false, 
        proceed: false 
      });
      
      // All fields disabled (view only)
      setAllFieldsDisabled(true);
      
      // Update mode badge
      if (modeBadge) {
        modeBadge.textContent = 'View';
        modeBadge.className = 'badge bg-info';
      }
    }

    /**
     * Set Add Mode
     * Adding new transaction, editable fields enabled
     */
    function setAddMode() {
      console.log('[RescheduleTrxPosting] Setting Add Mode');
      mode = "add";
      EventID = "ADD";
      
      // Button states: Save, Cancel, Proceed enabled
      setActionButtonsState({ 
        view: false, 
        add: false, 
        save: true, 
        cancel: true, 
        proceed: true 
      });
      
      // Enable editable fields
      setFieldsEnabled(true);
      
      // Update mode badge
      if (modeBadge) {
        modeBadge.textContent = 'Add';
        modeBadge.className = 'badge bg-success';
      }
    }

    /**
     * Set form mode and update UI (Legacy compatibility)
     */
    function setMode(newMode) {
      console.log(`[RescheduleTrxPosting] setMode called: ${newMode}`);
      
      switch(newMode) {
        case "entry":
          setEntryMode();
          break;
        case "view":
          setViewMode();
          break;
        case "add":
          setAddMode();
          break;
        default:
          console.warn(`[RescheduleTrxPosting] Unknown mode: ${newMode}`);
          setEntryMode();
      }
    }

    // ========== GRID RENDERING ==========

    /**
     * Render transaction lines to grid
     */
    function renderTransactions() {
      if (!trxRowsBody) return;

      trxRowsBody.innerHTML = "";

      if (!transactions || transactions.length === 0) {
        if (trxEmpty) trxEmpty.classList.remove("d-none");
        return;
      }

      if (trxEmpty) trxEmpty.classList.add("d-none");

      transactions.forEach((row) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${convertNullToEmpty(row.AccountType)}</td>
          <td>${convertNullToEmpty(row.OurBranchID)}</td>
          <td>${convertNullToEmpty(row.AccountID)}</td>
          <td>${convertNullToEmpty(row.Name)}</td>
          <td>${convertNullToEmpty(row.Description)}</td>
          <td>${convertNullToEmpty(row.TransactionType)}</td>
          <td class="text-end">${formatCurrency(row.Amount || 0)}</td>
        `;
        trxRowsBody.appendChild(tr);
      });
    }

    // ========== BUSINESS LOGIC ==========

    /**
     * Calculate Behind The Scene fields
     */
    /**
     * Calculate Behind The Scene fields
     * Legacy: NetAmount = LocalAmount - ClientContribution
     * NetAmount is CRITICAL for Proceed button validation
     */
    function calculateBehindTheScene() {
      const localAmount = parseFormattedValue(elements.LocalAmount?.value || "0");
      const clientContribution = parseFormattedValue(elements.ClientContribution?.value || "0");

      // Legacy formula (from fnBindData and legacy behavior)
      // ProposedAmount = LocalAmount
      const proposedAmount = localAmount;

      // Legacy formula (from legacy system: txtBHSNetAmount)
      // NetAmount = LocalAmount - ClientContribution
      // This is used in Proceed button validation and transaction posting
      const netAmount = Math.max(0, localAmount - clientContribution);

      // Update Behind The Scene fields with currency formatting
      if (elements.NetAmount) elements.NetAmount.value = formatCurrency(netAmount);
      if (elements.ProposedAmount) elements.ProposedAmount.value = formatCurrency(proposedAmount);

      // NOTE: LoanAmount and LoanBalance are loaded from dtBHSRescheduleTrxPost
      // when View button is clicked. They should NOT be overwritten here.
      // ProductID and Status come from context and should not be set here.
    }

    /**
     * Validate exchange rate (legacy: fnGetCurrencyRate)
     * Enhanced: Also check currency match and set MeanRate
     */
    async function validateCurrencyRate() {
      if (!window.RescheduleTrxPostingService || !dtBHSRescheduleTrxPost) return;

      const productCurrency = dtBHSRescheduleTrxPost.CurrencyID || "";
      const localCurrency = "KES"; // TODO: Get from system config
      const clientContribution = parseFormattedValue(elements.ClientContribution?.value || "0");

      // If currencies match or no contribution, no rate validation needed
      if (productCurrency === localCurrency || !clientContribution) {
        if (elements.ExchangeRate) elements.ExchangeRate.value = "1.00";
        if (elements.ForexGainLoss) elements.ForexGainLoss.value = "0.00";
        if (elements.ExchangeRate) elements.ExchangeRate.disabled = true;
        return;
      }

      // Legacy: Different currencies - need exchange rate
      const transactionType = elements.TransactionType?.value === "Cash" ? "CSH" : "REV";
      const branchID = elements.BranchID?.value || "";

      try {
        const result = await window.RescheduleTrxPostingService.validateExchangeRate(
          localCurrency,
          parseFormattedValue(elements.ExchangeRate?.value || "1.0"),
          transactionType,
          productCurrency,
          branchID
        );

        if (result.isValid) {
          // Legacy: Store market rate for calculation
          MeanRate = result.marketRate || 1.0;
          
          // Update exchange rate with buying rate if provided
          if (result.gainLoss !== undefined && elements.ForexGainLoss) {
            elements.ForexGainLoss.value = formatCurrency(result.gainLoss);
          }

          // Enable exchange rate field for editing
          if (elements.ExchangeRate) elements.ExchangeRate.disabled = false;
        } else {
          alert(`Exchange rate validation failed: ${result.message}`);
          if (elements.ExchangeRate) elements.ExchangeRate.disabled = true;
        }
      } catch (error) {
        console.error("[RescheduleTrxPosting] validateCurrencyRate error:", error);
      }
    }

    /**
     * Calculate local amount (legacy: fnLocalAmt)
     */
    async function calculateLocalAmount() {
      if (!window.RescheduleTrxPostingService) return;

      const amount = parseFormattedValue(elements.LocalAmount?.value || "0");
      const exchangeRate = parseFormattedValue(elements.ExchangeRate?.value || "1.0");

      try {
        const result = await window.RescheduleTrxPostingService.calculateLocalAmount(amount, exchangeRate);

        if (result.success && elements.LocalAmount) {
          elements.LocalAmount.value = formatCurrency(result.localAmount);
          calculateBehindTheScene();
        }
      } catch (error) {
        console.error("[RescheduleTrxPosting] calculateLocalAmount error:", error);
      }
    }

    /**
     * Calculate forex gain/loss (legacy: fnCalProfitLoss)
     */
    async function calculateForexGainLoss() {
      if (!window.RescheduleTrxPostingService) return;

      const transactionAmount = parseFormattedValue(elements.LocalAmount?.value || "0");
      const exchangeRate = parseFormattedValue(elements.ExchangeRate?.value || "1.0");
      const marketRate = 1.0; // Should be fetched from system or service
      const transactionType = elements.TransactionType?.value || "Transfer";

      try {
        const result = await window.RescheduleTrxPostingService.calculateForexGainLoss(
          transactionAmount,
          exchangeRate,
          marketRate,
          transactionType
        );

        if (result.success && elements.ForexGainLoss) {
          elements.ForexGainLoss.value = formatCurrency(result.gainLoss);
        }
      } catch (error) {
        console.error("[RescheduleTrxPosting] calculateForexGainLoss error:", error);
      }
    }

    // ========== EVENT HANDLERS ==========

    /**
     * Handle View button
     * Legacy: Populate dtBHSRescheduleTrxPost and validate currency rate
     * DB CALL #4: Uses p_GetLoanReschPostDetail
     */
    async function handleView() {
      console.log("🔴🔴🔴 HANDLEVIEW FUNCTION EXECUTING 🔴🔴🔴");
      console.log("[RescheduleTrxPosting] handleView called");
      
      const branchID = document.getElementById('BranchID')?.value || "";
      const accountID = document.getElementById('AccountID')?.value?.trim() || "";

      console.log("[RescheduleTrxPosting] handleView input:", { branchID, accountID });

      if (!branchID) {
        alert("Please select Branch ID first.");
        return;
      }

      if (!accountID) {
        alert("Please enter an Account ID to view.");
        document.getElementById('AccountID')?.focus();
        return;
      }

      if (!window.RescheduleTrxPostingService) {
        console.error("[RescheduleTrxPosting] window.RescheduleTrxPostingService is not available");
        alert("Service not available. Cannot load data.");
        return;
      }

      try {
        console.log("🔴 ABOUT TO CALL SERVICE - window.RescheduleTrxPostingService:", window.RescheduleTrxPostingService);
        console.log("🔴 ABOUT TO CALL SERVICE - window.RescheduleTrxPostingService.getLoanReschPostDetail:", window.RescheduleTrxPostingService?.getLoanReschPostDetail);
        console.log("[RescheduleTrxPosting] Calling window.RescheduleTrxPostingService.getLoanReschPostDetail");

        // DB CALL #4: Get loan reschedule post detail
        const detail = await window.RescheduleTrxPostingService.getLoanReschPostDetail(branchID, accountID);

        console.log("🔴 DETAIL RECEIVED FROM SERVICE:", detail);
        console.log("[RescheduleTrxPosting] Detail received:", detail);

        if (detail && Object.keys(detail).length > 0) {
          // Legacy: Store header data
          dtBHSRescheduleTrxPost = detail;

          // Map response to form fields
          const branchIDEl = document.getElementById('BranchID');
          const branchNameEl = document.getElementById('BranchName');
          const clientIDEl = document.getElementById('ClientID');
          const clientNameEl = document.getElementById('ClientName');
          const accountIDEl = document.getElementById('AccountID');
          const accountNameEl = document.getElementById('AccountName');
          const loanSeriesEl = document.getElementById('LoanSeries');
          const clientContributionEl = document.getElementById('ClientContribution');
          const loanAmountEl = document.getElementById('LoanAmount');
          const loanBalanceEl = document.getElementById('LoanBalance');
          const proposedAmountEl = document.getElementById('ProposedAmount');
          const netAmountEl = document.getElementById('NetAmount');
          const productIDEl = document.getElementById('ProductID');
          const statusEl = document.getElementById('Status');

          if (branchIDEl) branchIDEl.value = detail.OurBranchID || "";
          if (branchNameEl) branchNameEl.value = detail.BranchName || "";
          if (clientIDEl) clientIDEl.value = detail.ClientID || "";
          if (clientNameEl) clientNameEl.value = detail.ClientName || "";
          if (accountIDEl) accountIDEl.value = detail.AccountID || "";
          if (accountNameEl) accountNameEl.value = detail.AccountName || detail.Name || "";
          if (loanSeriesEl) loanSeriesEl.value = detail.LoanSeries || 1;
          if (clientContributionEl) clientContributionEl.value = detail.ClientContribution || 0;
          if (loanAmountEl) loanAmountEl.value = detail.LoanAmount || 0;
          if (loanBalanceEl) loanBalanceEl.value = detail.LoanBalance || 0;
          if (proposedAmountEl) proposedAmountEl.value = detail.ProposedAmount || 0;
          if (netAmountEl) netAmountEl.value = detail.ProposedAmount || 0; // Net Amount same as Proposed Amount
          if (productIDEl) productIDEl.value = detail.ProductID || "";
          if (statusEl) statusEl.value = detail.Status || "";

          // Store CurrencyID for validation
          if (detail.CurrencyID) {
            window.RescheduleTrxPostingService.setDynamicValue("ProductCurrencyID", detail.CurrencyID);
          }

          console.log("[RescheduleTrxPosting] Record loaded successfully:", detail);

          // Switch to View mode (Loan Maintenance pattern)
          setViewMode();
          alert("Record loaded successfully.");
        } else {
          console.warn("[RescheduleTrxPosting] No detail found");
          alert("No record found for the provided Branch ID and Account ID.");
        }
      } catch (error) {
        console.error("[RescheduleTrxPosting] handleView error:", error);
        alert("Failed to load record. Please try again.");
      }
    }

    /**
     * Handle Add button
     * Legacy: fnUserRights("ADD") -> fnRights_CallBack
     * Sets up form for transaction entry with proper field states
     */
    async function handleAdd() {
      const accountID = elements.AccountID?.value?.trim() || "";

      if (!accountID) {
        alert("Account ID is required to add a transaction posting.");
        elements.AccountID?.focus();
        return;
      }

      // User rights check disabled - stored procedure not available
      try {
        userHasRights = true;
        EventID = "ADD";

        // Legacy: Validate loan status if data available
        if (dtBHSRescheduleTrxPost && dtBHSRescheduleTrxPost.StatusID === "FP") {
          // Check WFAdvStageID and WFAppstatusID
          if (dtBHSRescheduleTrxPost.WFAdvStageID !== "40BOOK" || dtBHSRescheduleTrxPost.WFAppstatusID !== "PEN") {
            alert("Loan is not in the correct status for transaction posting.");
            return;
          }
        }

        // Legacy: Set ValueDate to WorkingDate (today)
        const today = new Date();
        const dateStr = today.toISOString().split("T")[0];
        if (elements.ValueDate) elements.ValueDate.value = dateStr;

        // Legacy: Disable ValueDate field (read-only during entry)
        if (elements.ValueDate) elements.ValueDate.disabled = true;

        // Legacy: Set default values
        if (elements.TransactionType) elements.TransactionType.value = "Transfer";
        if (elements.AccountType) elements.AccountType.value = "Customer";
        if (elements.ExchangeRate) elements.ExchangeRate.value = "1.00";

        // Legacy: Clear transaction grid
        transactions = [];
        renderTransactions();

        // Legacy: Enable Denomination if required
        const denomBtn = root.querySelector(".rtp-denom-btn");
        if (IsDenominationReqd && elements.TransactionType?.value === "Cash") {
          if (denomBtn) denomBtn.disabled = false;
        } else {
          if (denomBtn) denomBtn.disabled = true;
        }

        // Legacy: Enable editable fields (TransactionType, AccountType, ReferenceNo, Narration, etc.)
        setFieldsEnabled(true);

        // Legacy: Enable ContraAccountID
        if (elements.ContraAccountID) {
          elements.ContraAccountID.disabled = false;
        }

        // Legacy: Trigger TransactionType change logic (populate Till, etc.)
        const transactionTypeChangeEvent = new Event('change', { bubbles: true });
        if (elements.TransactionType) {
          elements.TransactionType.dispatchEvent(transactionTypeChangeEvent);
        }

        // Legacy: Enable ClientContribution field and set focus
        if (elements.ClientContribution) {
          elements.ClientContribution.disabled = false;
          elements.ClientContribution.focus();
        }

        // Legacy: Update button states - disable Add/View, enable Proceed/Cancel
        setActionButtonsState({
          view: false,
          add: false,
          save: true,
          cancel: true,
          proceed: true
        });

        console.log('[RescheduleTrxPosting] Add mode activated - ready for transaction entry');
      } catch (error) {
        console.error("[RescheduleTrxPosting] handleAdd error:", error);
        alert("Failed to enter Add mode. Please try again.");
      }
    }

    /**
     * Handle Proceed button (add transaction line to grid)
     * Legacy: Validate all required fields before adding line
     * DB CALL #5: Uses p_GetReschLoanPostTrx
     */
    async function handleProceed() {
      if (mode === "view") return;

      // Clear previous errors
      clearAllFieldErrors();

      // Legacy: Validate required fields with error styling
      if (!elements.TransactionType?.value) {
        setFieldError("TransactionType", true);
        alert("Transaction Type is required. (Code 1645)");
        elements.TransactionType?.focus();
        return;
      }
      setFieldError("TransactionType", false);

      if (!elements.AccountType?.value) {
        setFieldError("AccountType", true);
        alert("Account Type is required. (Code 1655)");
        elements.AccountType?.focus();
        return;
      }
      setFieldError("AccountType", false);

      // Legacy: ValueDate validation (compare with WorkingDate)
      if (!elements.ValueDate?.value) {
        setFieldError("ValueDate", true);
        alert("Value Date is required. (Code 1620)");
        elements.ValueDate?.focus();
        return;
      }
      setFieldError("ValueDate", false);

      // Legacy: If TransactionType == "T" (Transfer), ContraAccountID is required
      if (elements.TransactionType.value === "Transfer") {
        if (!elements.ContraAccountID?.value?.trim()) {
          setFieldError("ContraAccountID", true);
          alert("Contra Account ID is required for Transfer transactions. (Code 801051)");
          elements.ContraAccountID?.focus();
          return;
        }
        setFieldError("ContraAccountID", false);
      }

      const accountID = elements.AccountID?.value?.trim() || "";
      const localAmount = parseFormattedValue(elements.LocalAmount?.value || "0");

      if (!accountID) {
        alert("Provide an Account ID before proceeding.");
        elements.AccountID?.focus();
        return;
      }

      if (!localAmount || localAmount <= 0) {
        alert("Provide a positive Local Amount before proceeding.");
        elements.LocalAmount?.focus();
        return;
      }

      // Legacy: Validate exchange rate before proceeding (if needed)
      if (dtBHSRescheduleTrxPost) {
        const productCurrency = dtBHSRescheduleTrxPost.CurrencyID || "";
        const localCurrency = "KES";
        
        if (productCurrency !== localCurrency && elements.ExchangeRate?.value) {
          const isValid = await validateExchangeRate();
          if (!isValid) return;
        }
      }

      try {
        // DB CALL #5: Get reschedule loan post transactions
        const transactionTypeMapping = { "Transfer": "T", "Cash": "C", "JV": "JV" };
        const accountTypeMapping = { "Customer": "C", "GL": "G", "Internal": "I" };
        const trxTypeID = transactionTypeMapping[elements.TransactionType.value] || elements.TransactionType.value;
        const accountTypeID = accountTypeMapping[elements.AccountType.value] || elements.AccountType.value;

        const params = {
          ourBranchID: elements.BranchID?.value || "",
          accountID: accountID,
          loanSeries: elements.LoanSeries?.value || 1,
          trxTypeID: trxTypeID,
          accountTypeID: accountTypeID,
          contraAccountID: elements.ContraAccountID?.value || "",
          trxCurrencyID: dtBHSRescheduleTrxPost?.CurrencyID || "ETB",
          valueDate: elements.ValueDate?.value || new Date().toISOString(),
          referenceNo: elements.ReferenceNo?.value || "",
          clientContribution: parseFormattedValue(elements.ClientContribution?.value || "0"),
          localAmount: localAmount,
          exchangeRate: parseFormattedValue(elements.ExchangeRate?.value || "1"),
          meanRate: MeanRate || 0,
          profit: parseFormattedValue(elements.ForexGainLoss?.value || "0"),
          narration: elements.Narration?.value || ""
        };

        const transactionLines = await window.RescheduleTrxPostingService.getReschLoanPostTrx(params);

        if (!transactionLines || transactionLines.length === 0) {
          alert("No transaction lines were generated. Please check your inputs.");
          return;
        }

        // Replace transactions array with response from service
        transactions = transactionLines;
        renderTransactions();
        calculateBehindTheScene();

        alert(`${transactionLines.length} transaction line(s) added to grid.`);
      } catch (error) {
        console.error("[RescheduleTrxPosting] handleProceed error:", error);
        alert("Failed to generate transaction lines. Please try again.");
      }
    }

    /**
     * Validate exchange rate with error handling
     */
    async function validateExchangeRate() {
      if (!window.RescheduleTrxPostingService) return false;

      const exchangeRate = parseFormattedValue(elements.ExchangeRate?.value || "1.0");
      const localCurrency = "KES";
      const productCurrency = dtBHSRescheduleTrxPost?.CurrencyID || "USD";
      const transactionType = elements.TransactionType?.value === "Cash" ? "CSH" : "REV";
      const branchID = elements.BranchID?.value || "";

      try {
        const result = await window.RescheduleTrxPostingService.validateExchangeRate(
          localCurrency,
          exchangeRate,
          transactionType,
          productCurrency,
          branchID
        );

        if (!result.isValid) {
          alert(`Exchange rate validation failed: ${result.message}`);
          return false;
        }

        // Update gain/loss if provided
        if (result.gainLoss !== undefined && elements.ForexGainLoss) {
          elements.ForexGainLoss.value = formatCurrency(result.gainLoss);
        }

        return true;
      } catch (error) {
        console.error("[RescheduleTrxPosting] validateExchangeRate error:", error);
        alert("Failed to validate exchange rate. Please try again.");
        return false;
      }
    }

    /**
     * Handle Save button
     * Legacy: Validate denomination if required before saving
     * DB CALL #6: Uses p_AddLoanReschPostTrx
     */
    async function handleSave() {
      if (mode === "view") return;

      if (!transactions || transactions.length === 0) {
        alert("No transaction lines to save. Click Proceed to add a line.");
        return;
      }

      const clientContribution = parseFormattedValue(elements.ClientContribution?.value || "0");
      const transactionType = elements.TransactionType?.value || "";

      // Legacy: Validate denomination requirement
      if (clientContribution !== 0 && transactionType === "Cash" && IsDenominationReqd) {
        if (!dsDenomination) {
          alert("Denomination breakdown is required for Cash transactions. Click Denomination button. (Code 311009)");
          return;
        }
      }

      const branchID = elements.BranchID?.value || "";
      const clientID = elements.ClientID?.value || "";
      const accountID = elements.AccountID?.value?.trim() || "";
      const loanSeries = elements.LoanSeries?.value?.trim() || "";

      if (!accountID) {
        alert("Account ID is required to save.");
        elements.AccountID?.focus();
        return;
      }

      if (!window.RescheduleTrxPostingService) {
        alert("Service not available. Cannot save data.");
        return;
      }

      try {
        // DB CALL #6: Save loan reschedule post transaction
        const params = {
          ourBranchID: branchID,
          accountID: accountID,
          loanSeries: loanSeries || 1,
          transactions: transactions,
          createdBy: window.RescheduleTrxPostingService.getDynamicValue("CreatedBy") || window.RescheduleTrxPostingService.getOperatorId(),
          createdOn: window.RescheduleTrxPostingService.getDynamicValue("CreatedOn") || new Date().toISOString(),
          modifiedBy: window.RescheduleTrxPostingService.getOperatorId(),
          modifiedOn: new Date().toISOString(),
          supervisedBy: null,
          supervisedOn: null
        };

        const result = await window.RescheduleTrxPostingService.addLoanReschPostTrx(params);

        if (result.success) {
          alert(
            (result.message || "Reschedule transaction posting saved successfully.") +
            (result.trxBatchID ? `\n\nTrx Batch ID: ${result.trxBatchID}` : "") +
            (result.trxSerialID ? `\nTrx Serial ID: ${result.trxSerialID}` : "")
          );
          EventID = "NONE"; // Reset EventID to NONE after save
          clearTopForm();
          transactions = [];
          renderTransactions();
          setEntryMode();
        } else {
          alert(`Failed to save: ${result.message}`);
        }
      } catch (error) {
        console.error("[RescheduleTrxPosting] handleSave error:", error);
        alert("Failed to save. Please try again.");
      }
    }

    /**
     * Handle Cancel button
     * Legacy: Reset EventID when canceling
     */
    function handleCancel() {
      if (mode === "view" || mode === "entry") return;

      if (confirm("Cancel changes? Unsaved changes will be lost.")) {
        EventID = "NONE"; // Legacy: Reset EventID
        clearTopForm();
        transactions = [];
        renderTransactions();
        setEntryMode();
      }
    }

    /**
     * Handle Denomination button
     * Legacy: fnbtnDenominationClick() - Opens denomination modal dialog
     * Shows breakdown of denomination notes/coins for cash transaction
     */
    async function handleDenomination() {
      if (!window.RescheduleTrxPostingService) {
        alert("Service not available. Cannot load denomination breakdown.");
        return;
      }

      const branchID = elements.BranchID?.value || "";
      const currencyID = dtBHSRescheduleTrxPost?.CurrencyID || "KES";
      const operatorTillID = elements.Till?.value || "";
      const amount = parseFormattedValue(elements.LocalAmount?.value || "0");
      const transactionType = elements.TransactionType?.value || "Transfer";
      const workingDate = new Date().toISOString().split("T")[0];

      if (!amount || amount <= 0) {
        alert("Please enter a Local Amount before viewing denomination breakdown.");
        return;
      }

      try {
        // Legacy: Call denomination service
        const denominations = await window.RescheduleTrxPostingService.getDenominationBreakdown(
          branchID,
          currencyID,
          operatorTillID,
          amount,
          transactionType,
          workingDate
        );

        if (denominations && Array.isArray(denominations) && denominations.length > 0) {
          // Legacy: Store denomination data for later use in save
          dsDenomination = denominations;

          // Modern: Display in Bootstrap modal
          renderDenominationModal(denominations, amount);

          // Open modal using Bootstrap
          const modal = new (global.bootstrap?.Modal || Bootstrap.Modal)(
            document.getElementById("denominationModal")
          );
          modal.show();
        } else {
          alert("No denomination breakdown available for this amount.");
        }
      } catch (error) {
        console.error("[RescheduleTrxPosting] handleDenomination error:", error);
        alert("Failed to load denomination breakdown. Please try again.");
      }
    }

    /**
     * Render denomination breakdown in modal table
     * Legacy: Display notes/coins breakdown from frmCashDenomination
     */
    function renderDenominationModal(denominations, totalAmount) {
      const tbody = document.getElementById("denominationTableBody");
      if (!tbody) return;

      tbody.innerHTML = "";
      let totalCalculated = 0;

      denominations.forEach((item) => {
        const row = document.createElement("tr");
        const amount = parseFloat(item.Amount) || 0;
        totalCalculated += amount;

        row.innerHTML = `
          <td>${item.Currency || "KES"}</td>
          <td>${item.DenominationName || item.Denomination}</td>
          <td class="text-center">${item.Quantity || 1}</td>
          <td class="text-end">${formatCurrency(amount)}</td>
        `;
        tbody.appendChild(row);
      });

      // Update totals
      const variance = totalCalculated - totalAmount;
      const totalAmountField = document.getElementById("denominationTotalAmount");
      const varianceField = document.getElementById("denominationVariance");

      if (totalAmountField) {
        totalAmountField.value = formatCurrency(totalCalculated);
      }
      if (varianceField) {
        varianceField.value = formatCurrency(variance);
        // Highlight variance if not zero
        if (Math.abs(variance) > 0.01) {
          varianceField.classList.add("text-danger", "fw-bold");
        } else {
          varianceField.classList.remove("text-danger", "fw-bold");
        }
      }
    }

    // ========== LOOKUP HANDLERS ==========

    /**
     * Wire lookup buttons
     * Uses new service methods: searchBranch, searchClient, searchAccount
     */
    function wireLookups() {
      // Helper functions
      const getOperatorId = () => window.RescheduleTrxPostingService?.getOperatorId() || 'web_portal';
      const getOurBranchId = () => elements.BranchID?.value || '';
      const moduleID = window.RescheduleTrxPostingService?.moduleID || '4404';

      // Wait for SearchModal to be available
      function waitForSearchModal(callback, maxWaitMs = 5000, intervalMs = 100) {
        const start = Date.now();
        (function poll() {
          if (window.SearchModal) {
            console.log('[RescheduleTrxPosting] SearchModal loaded');
            callback();
          } else if (Date.now() - start < maxWaitMs) {
            setTimeout(poll, intervalMs);
          } else {
            console.warn('[RescheduleTrxPosting] SearchModal not available after timeout');
          }
        })();
      }

      waitForSearchModal(() => {
        // Create modal instances
        const branchModal = new window.SearchModal({
          prefix: 'rtp-branch-search',
          moduleID,
          getOperatorId,
          getOurBranchId
        });

        const clientModal = new window.SearchModal({
          prefix: 'rtp-client-search',
          moduleID,
          getOperatorId,
          getOurBranchId
        });

        const accountModal = new window.SearchModal({
          prefix: 'rtp-account-search',
          moduleID,
          getOperatorId,
          getOurBranchId
        });

        const contraModal = new window.SearchModal({
          prefix: 'rtp-contra-search',
          moduleID,
          getOperatorId,
          getOurBranchId
        });

        // Branch lookup button
        const branchBtn = document.querySelector('[data-lookup="branch"]');
        if (branchBtn) {
          branchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const branchIDValue = elements.BranchID?.value || '';
            branchModal.open({
              tableID: 'BranchID',
              whereStmt: branchIDValue ? `OurBranchID LIKE '%${branchIDValue}%'` : '',
              searchFields: [
                { name: 'BranchID', label: 'Branch ID', column: 'OurBranchID', value: branchIDValue },
                { name: 'BranchName', label: 'Branch Name', column: 'BranchName' }
              ],
              autoSearch: !!branchIDValue,
              onSelect: (record) => {
                if (elements.BranchID) elements.BranchID.value = record.OurBranchID || '';
                if (elements.BranchName) elements.BranchName.value = record.BranchName || '';
                if (record.CurrencyID) {
                  window.RescheduleTrxPostingService.setDynamicValue("BranchCurrencyID", record.CurrencyID);
                }
              }
            });
          });
        }

        // Client lookup button
        const clientBtn = document.querySelector('[data-lookup="client"]');
        if (clientBtn) {
          clientBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const branchID = elements.BranchID?.value || '';
            if (!branchID) {
              alert('Please enter Branch ID first. (Code 1501)');
              return;
            }
            const clientIDValue = elements.ClientID?.value || '';
            clientModal.open({
              tableID: 'ClientAccountID',
              whereStmt: '',
              advFilterString: `ProductTypeID ='LN' AND OurBranchID='${branchID}'`,
              searchFields: [
                { name: 'ClientID', label: 'Client ID', column: 'ClientID', value: clientIDValue },
                { name: 'ClientName', label: 'Client Name', column: 'ClientName' }
              ],
              autoSearch: !!clientIDValue,
              onSelect: (record) => {
                if (elements.ClientID) elements.ClientID.value = record.ClientID || '';
                if (elements.ClientName) elements.ClientName.value = record.ClientName || '';
                if (record.ClientName) {
                  window.RescheduleTrxPostingService.setDynamicValue("ClientName", record.ClientName);
                }
              }
            });
          });
        }

        // Account lookup button
        const accountBtn = document.querySelector('[data-lookup="account"]');
        if (accountBtn) {
          accountBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const branchID = elements.BranchID?.value || '';
            if (!branchID) {
              alert('Please enter Branch ID first. (Code 1501)');
              return;
            }
            const accountIDValue = elements.AccountID?.value || '';
            accountModal.open({
              tableID: 'RescheduleIniAccount',
              whereStmt: '',
              advFilterString: `OurBranchID='${branchID}'`,
              searchFields: [
                { name: 'AccountID', label: 'Account ID', column: 'AccountID', value: accountIDValue },
                { name: 'Name', label: 'Account Name', column: 'Name' },
                { name: 'LoanSeries', label: 'Loan Series', column: 'LoanSeries' }
              ],
              autoSearch: !!accountIDValue,
              onSelect: (record) => {
                if (elements.AccountID) elements.AccountID.value = record.AccountID || '';
                if (elements.AccountName) elements.AccountName.value = record.Name || '';
                if (elements.LoanSeries) elements.LoanSeries.value = record.LoanSeries || '';
                if (record.Name) {
                  window.RescheduleTrxPostingService.setDynamicValue("AccountName", record.Name);
                }
              }
            });
          });
        }

        // Contra account lookup button - Dynamic based on Account Type
        const contraBtn = document.querySelector('[data-lookup="contra"]');
        if (contraBtn) {
          contraBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Validate required fields
            const branchID = elements.BranchID?.value || '';
            const accountType = elements.AccountType?.value || '';
            const currencyID = window.RescheduleTrxPostingService?.getDynamicValue("ProductCurrencyID") || dtBHSRescheduleTrxPost?.CurrencyID || 'ETB';
            const clientID = elements.ClientID?.value || '';
            
            if (!branchID) {
              alert('Please enter Branch ID first. (Code 1501)');
              return;
            }
            
            if (!accountType) {
              alert('Please select Account Type first. (Code 1655)');
              elements.AccountType?.focus();
              return;
            }
            
            // Determine TableID and AdvFilterString based on Account Type
            let tableID = '';
            let advFilterString = '';
            
            if (accountType === 'C' || accountType === 'Customer') {
              // Customer Account Type
              tableID = 'AccountCrTrxAllowID';
              advFilterString = `OurBranchID='${branchID}' AND CurrencyID='${currencyID}' AND ClientID='${clientID}'`;
              
              if (!clientID) {
                alert('Please enter Client ID for Customer account type.');
                elements.ClientID?.focus();
                return;
              }
            } else if (accountType === 'G' || accountType === 'GL') {
              // GL Account Type
              tableID = 'GLCrTrxAllowID';
              advFilterString = `OurBranchID='${branchID}' AND CurrencyID='${currencyID}'`;
            } else {
              alert('Please select a valid Account Type (Customer or GL).');
              return;
            }
            
            const contraIDValue = elements.ContraAccountID?.value || '';
            contraModal.open({
              tableID: tableID,
              whereStmt: '',
              advFilterString: advFilterString,
              searchFields: [
                { name: 'AccountID', label: 'Account ID', column: 'AccountID', value: contraIDValue },
                { name: 'Name', label: 'Account Name', column: 'Name' }
              ],
              autoSearch: !!contraIDValue,
              onSelect: (record) => {
                if (elements.ContraAccountID) elements.ContraAccountID.value = record.AccountID || '';
                if (elements.ContraAccountName) elements.ContraAccountName.value = record.Name || '';
              }
            });
          });
        }
      });
    }

    // ========== SEARCH HANDLERS (Called by blur/Enter and lookup buttons) ==========

    /**
     * Handle Branch ID search (blur/Enter)
     */
    async function handleBranchSearch(searchValue) {
      try {
        if (!window.SearchService || !window.SearchService.searchClients) {
          console.warn("[RescheduleTrxPosting] SearchService not available");
          return;
        }

        // Build WHERE statement with LIKE operator (partial match)
        const whereStmt = `OurBranchID LIKE '%${searchValue.replace(/'/g, "''")}'`;
        const operatorId = window.RescheduleTrxPostingService?.getOperatorId() || 'web_portal';

        console.log('[RescheduleTrxPosting] Branch lookup:', {
          TableID: 'BranchID',
          WhereStmt: whereStmt,
          SearchValue: searchValue
        });

        const response = await window.SearchService.searchClients({
          TableID: 'BranchID',
          WhereStmt: whereStmt,
          AdvFilterString: '',
          PrevOrNext: '1',
          RefID: '',
          OperatorID: operatorId,
          ModuleID: '4404',
          OurBranchID: searchValue,
          SearchKey: ''
        });

        const responseData = response?.Details || response?.Data || [];
        
        if (responseData && responseData.length > 0) {
          const branch = responseData[0];
          const branchIDEl = document.getElementById('BranchID');
          const branchNameEl = document.getElementById('BranchName');
          if (branchIDEl) branchIDEl.value = branch.OurBranchID || searchValue;
          if (branchNameEl) branchNameEl.value = branch.BranchName || "";
          if (branch.CurrencyID) {
            window.RescheduleTrxPostingService.setDynamicValue("BranchCurrencyID", branch.CurrencyID);
          }
          console.log("[RescheduleTrxPosting] Branch found:", branch);
        } else {
          const branchNameEl = document.getElementById('BranchName');
          if (branchNameEl) branchNameEl.value = "";
          console.warn("[RescheduleTrxPosting] Branch not found:", searchValue);
        }
      } catch (error) {
        console.error("[RescheduleTrxPosting] Branch search failed:", error);
      }
    }

    /**
     * Handle Client ID search (blur/Enter)
     */
    async function handleClientSearch(searchValue) {
      try {
        const branchIDEl = document.getElementById('BranchID');
        const branchID = branchIDEl?.value?.trim() || "";
        if (!branchID) {
          alert("Please select Branch ID first. (Code 1501)");
          const clientIDEl = document.getElementById('ClientID');
          if (clientIDEl) clientIDEl.value = "";
          return;
        }

        if (!window.SearchService || !window.SearchService.searchClients) {
          console.warn("[RescheduleTrxPosting] SearchService not available");
          return;
        }

        // Build WHERE statement with LIKE operator
        const whereStmt = `ClientID LIKE '%${searchValue.replace(/'/g, "''")}'`;
        const advFilterString = `ProductTypeID='LN' AND OurBranchID = '${branchID.replace(/'/g, "''")}'`;
        const operatorId = window.RescheduleTrxPostingService?.getOperatorId() || 'web_portal';

        console.log('[RescheduleTrxPosting] Client lookup:', {
          TableID: 'ClientAccountID',
          WhereStmt: whereStmt,
          AdvFilterString: advFilterString
        });

        const response = await window.SearchService.searchClients({
          TableID: 'ClientAccountID',
          WhereStmt: whereStmt,
          AdvFilterString: advFilterString,
          PrevOrNext: '1',
          RefID: '',
          OperatorID: operatorId,
          ModuleID: '4404',
          OurBranchID: branchID,
          SearchKey: ''
        });

        const responseData = response?.Details || response?.Data || [];
        
        if (responseData && responseData.length > 0) {
          const client = responseData[0];
          const clientIDEl = document.getElementById('ClientID');
          const clientNameEl = document.getElementById('ClientName');
          if (clientIDEl) clientIDEl.value = client.ClientID || searchValue;
          if (clientNameEl) clientNameEl.value = client.ClientName || "";
          if (client.ClientName) {
            window.RescheduleTrxPostingService.setDynamicValue("ClientName", client.ClientName);
          }
          console.log("[RescheduleTrxPosting] Client found:", client);
        } else {
          const clientNameEl = document.getElementById('ClientName');
          if (clientNameEl) clientNameEl.value = "";
          console.warn("[RescheduleTrxPosting] Client not found:", searchValue);
        }
      } catch (error) {
        console.error("[RescheduleTrxPosting] Client search failed:", error);
      }
    }

    /**
     * Handle Account ID search (blur/Enter)
     */
    async function handleAccountSearch(searchValue) {
      try {
        const branchIDEl = document.getElementById('BranchID');
        const branchID = branchIDEl?.value?.trim() || "";
        if (!branchID) {
          alert("Please select Branch ID first. (Code 1501)");
          const accountIDEl = document.getElementById('AccountID');
          if (accountIDEl) accountIDEl.value = "";
          return;
        }

        if (!window.SearchService || !window.SearchService.searchClients) {
          console.warn("[RescheduleTrxPosting] SearchService not available");
          return;
        }

        // Build WHERE statement
        const whereStmt = `AccountID = '${searchValue.replace(/'/g, "''")}'`;
        const advFilterString = `OurBranchID='${branchID.replace(/'/g, "''")}'`;
        const operatorId = window.RescheduleTrxPostingService?.getOperatorId() || 'web_portal';

        console.log('[RescheduleTrxPosting] Account lookup:', {
          TableID: 'RescheduleIniAccount',
          WhereStmt: whereStmt,
          AdvFilterString: advFilterString
        });

        const response = await window.SearchService.searchClients({
          TableID: 'RescheduleIniAccount',
          WhereStmt: whereStmt,
          AdvFilterString: advFilterString,
          PrevOrNext: '1',
          RefID: '',
          OperatorID: operatorId,
          ModuleID: '4404',
          OurBranchID: branchID,
          SearchKey: ''
        });

        const responseData = response?.Details || response?.Data || [];
        
        if (responseData && responseData.length > 0) {
          const account = responseData[0];
          const accountIDEl = document.getElementById('AccountID');
          const accountNameEl = document.getElementById('AccountName');
          const loanSeriesEl = document.getElementById('LoanSeries');
          if (accountIDEl) accountIDEl.value = account.AccountID || searchValue;
          if (accountNameEl) accountNameEl.value = account.Name || account.AccountName || "";
          if (account.LoanSeries && loanSeriesEl) {
            loanSeriesEl.value = account.LoanSeries;
          }
          if (account.Name || account.AccountName) {
            window.RescheduleTrxPostingService.setDynamicValue("AccountName", account.Name || account.AccountName);
          }
          console.log("[RescheduleTrxPosting] Account found:", account);
        } else {
          const accountNameEl = document.getElementById('AccountName');
          const loanSeriesEl = document.getElementById('LoanSeries');
          if (accountNameEl) accountNameEl.value = "";
          if (loanSeriesEl) loanSeriesEl.value = "";
          console.warn("[RescheduleTrxPosting] Account not found:", searchValue);
        }
      } catch (error) {
        console.error("[RescheduleTrxPosting] Account search failed:", error);
      }
    }

    /**
     * Handle Contra Account ID search (blur/Enter)
     * Dynamic based on Account Type selection
     */
    async function handleContraAccountSearch(searchValue) {
      try {
        const branchIDEl = document.getElementById('BranchID');
        const branchID = branchIDEl?.value?.trim() || "";
        const accountType = elements.AccountType?.value || '';
        const currencyID = window.RescheduleTrxPostingService?.getDynamicValue("ProductCurrencyID") || dtBHSRescheduleTrxPost?.CurrencyID || 'ETB';
        const clientID = elements.ClientID?.value || '';
        
        if (!branchID) {
          alert("Please select Branch ID first. (Code 1501)");
          const contraAccountIDEl = document.getElementById('ContraAccountID');
          if (contraAccountIDEl) contraAccountIDEl.value = "";
          return;
        }
        
        if (!accountType) {
          alert("Please select Account Type first. (Code 1655)");
          elements.AccountType?.focus();
          return;
        }

        if (!window.SearchService || !window.SearchService.searchClients) {
          console.warn("[RescheduleTrxPosting] SearchService not available");
          return;
        }

        // Determine TableID and AdvFilterString based on Account Type
        let tableID = '';
        let advFilterString = '';
        
        if (accountType === 'C' || accountType === 'Customer') {
          // Customer Account Type
          tableID = 'AccountCrTrxAllowID';
          advFilterString = `OurBranchID='${branchID}' AND CurrencyID='${currencyID}' AND ClientID='${clientID}'`;
          
          if (!clientID) {
            alert('Please enter Client ID for Customer account type.');
            elements.ClientID?.focus();
            return;
          }
        } else if (accountType === 'G' || accountType === 'GL') {
          // GL Account Type
          tableID = 'GLCrTrxAllowID';
          advFilterString = `OurBranchID='${branchID}' AND CurrencyID='${currencyID}'`;
        } else {
          console.warn('[RescheduleTrxPosting] Invalid account type:', accountType);
          return;
        }

        // Build WHERE statement
        const whereStmt = '';
        const operatorId = window.RescheduleTrxPostingService?.getOperatorId() || 'web_portal';

        console.log('[RescheduleTrxPosting] Contra account lookup:', {
          TableID: tableID,
          WhereStmt: whereStmt,
          AdvFilterString: advFilterString
        });

        const response = await window.SearchService.searchClients({
          TableID: tableID,
          WhereStmt: whereStmt,
          AdvFilterString: advFilterString,
          PrevOrNext: '0',
          RefID: null,
          OperatorID: operatorId,
          ModuleID: '4404',
          OurBranchID: branchID,
          SearchKey: null,
          LanguageID: 'en'
        });

        const responseData = response?.Details || response?.Data || [];
        
        if (responseData && responseData.length > 0) {
          const account = responseData[0];
          const contraAccountIDEl = document.getElementById('ContraAccountID');
          const contraAccountNameEl = document.getElementById('ContraAccountName');
          
          if (contraAccountIDEl) contraAccountIDEl.value = account.AccountID || searchValue;
          if (contraAccountNameEl) contraAccountNameEl.value = account.Name || account.AccountName || '';
          
          console.log("[RescheduleTrxPosting] Contra account found:", account);
        } else {
          console.warn("[RescheduleTrxPosting] Contra account not found:", searchValue);
          const contraAccountNameEl = document.getElementById('ContraAccountName');
          if (contraAccountNameEl) contraAccountNameEl.value = '';
        }
      } catch (error) {
        console.error("[RescheduleTrxPosting] Contra account search failed:", error);
      }
    }

    // ========== INITIALIZATION ==========

    /**
     * Wire all event handlers
     */
    function wireEvents() {
      console.log("[RescheduleTrxPosting] wireEvents() called");
      
      // Action buttons
      if (actionButtons.view) {
        console.log("[RescheduleTrxPosting] Attaching handleView to view button");
        console.log("[RescheduleTrxPosting] View button element:", actionButtons.view);
        console.log("[RescheduleTrxPosting] View button classList:", actionButtons.view.className);
        
        // Add immediate test click handler
        actionButtons.view.addEventListener("click", (e) => {
          console.log("🔴 VIEW BUTTON CLICKED! Event:", e);
          handleView();
        });
      } else {
        console.warn("[RescheduleTrxPosting] View button not found!");
        console.warn("[RescheduleTrxPosting] ActionButtons object:", actionButtons);
      }
      
      if (actionButtons.add) {
        console.log("[RescheduleTrxPosting] Attaching handleAdd to add button");
        actionButtons.add.addEventListener("click", handleAdd);
      }
      
      if (actionButtons.save) {
        console.log("[RescheduleTrxPosting] Attaching handleSave to save button");
        actionButtons.save.addEventListener("click", handleSave);
      }
      
      if (actionButtons.cancel) {
        console.log("[RescheduleTrxPosting] Attaching handleCancel to cancel button");
        actionButtons.cancel.addEventListener("click", handleCancel);
      }
      
      if (actionButtons.proceed) {
        console.log("[RescheduleTrxPosting] Attaching handleProceed to proceed button");
        actionButtons.proceed.addEventListener("click", handleProceed);
      }

      // Denomination button
      const denomBtn = root.querySelector(".rtp-denom-btn");
      if (denomBtn) denomBtn.addEventListener("click", handleDenomination);

      // Denomination modal accept button
      const denomAcceptBtn = document.getElementById("denominationAcceptBtn");
      if (denomAcceptBtn) {
        denomAcceptBtn.addEventListener("click", () => {
          // Close modal after accepting
          const modal = global.bootstrap?.Modal?.getInstance(document.getElementById("denominationModal"));
          if (modal) modal.hide();
          // Denomination data is stored in dsDenomination variable for later save
        });
      }

      // Grid row click handlers (Legacy: OnRowSelection equivalent)
      // Allow row selection for viewing transaction details
      if (trxRowsBody) {
        trxRowsBody.addEventListener("click", (event) => {
          const row = event.target.closest("tr");
          if (!row) return;

          const rowData = transactions[Array.from(trxRowsBody.children).indexOf(row)];
          if (rowData) {
            // Legacy: OnRowSelection behavior
            // Populate form with selected row data for reference
            console.log("[RescheduleTrxPosting] Row selected:", rowData);
            // Row selection can be used for edit/delete in future enhancements
            // For now, just log the selection
          }
        });
      }

      // Currency field formatting
      attachCurrencyFormatHandlers();

      // Behind The Scene calculations - Enhanced event handlers
      if (elements.ClientContribution) {
        elements.ClientContribution.addEventListener("blur", calculateBehindTheScene);
        elements.ClientContribution.addEventListener("blur", calculateLocalAmount);
      }
      if (elements.LocalAmount) {
        elements.LocalAmount.addEventListener("blur", () => {
          calculateBehindTheScene();
          calculateLocalAmount();
        });
      }
      if (elements.ExchangeRate) {
        elements.ExchangeRate.addEventListener("blur", () => {
          calculateLocalAmount();
          calculateForexGainLoss();
        });
      }

      // Legacy: TransactionType change handler
      // If TransactionType == "T" (Transfer), ContraAccountID is required
      // If TransactionType == "C" (Cash), Denomination button may be required
      if (elements.TransactionType) {
        elements.TransactionType.addEventListener("change", () => {
          const transactionType = elements.TransactionType.value;
          const contraField = elements.ContraAccountID;

          // Handle Till field based on TransactionType (Cash vs Transfer)
          if (transactionType === "Cash") {
            // Cash transaction - populate Till from till details
            if (tillDetails && tillDetails.length > 0) {
              // Find till matching the loan's currency
              const loanCurrency = dtBHSRescheduleTrxPost?.CurrencyID || elements.CurrencyID?.value || '';
              console.log('[RescheduleTrxPosting] Looking for till with currency:', loanCurrency);
              console.log('[RescheduleTrxPosting] Available till details:', tillDetails);
              
              let matchingTill = null;
              if (loanCurrency) {
                // Find till matching the loan's currency (case-insensitive)
                matchingTill = tillDetails.find(t => 
                  t.CurrencyID && t.CurrencyID.toUpperCase() === loanCurrency.toUpperCase()
                );
              }
              
              if (matchingTill && elements.Till) {
                // Format: TillID-TillName
                elements.Till.value = `${matchingTill.TillID}-${matchingTill.TillName || ''}`;
                selectedTillID = matchingTill.TillID;
                console.log('[RescheduleTrxPosting] Till set to:', elements.Till.value);
              } else if (elements.Till) {
                // Fallback to local currency till or first till
                const localTill = tillDetails.find(t => t.LocalCurrency === 1) || tillDetails[0];
                if (localTill) {
                  elements.Till.value = `${localTill.TillID}-${localTill.TillName || ''}`;
                  selectedTillID = localTill.TillID;
                  console.log('[RescheduleTrxPosting] Fallback till set to:', elements.Till.value);
                } else {
                  elements.Till.value = '';
                }
              }
            } else {
              console.warn('[RescheduleTrxPosting] No till details available');
              if (elements.Till) elements.Till.value = '';
            }
          } else if (transactionType === "Transfer" || transactionType === "JV") {
            // Transfer/JV - clear Till field
            if (elements.Till) elements.Till.value = '';
            selectedTillID = null;
          }

          if (mode !== "view") {
            // Clear ContraAccountID if switching away from Transfer
            if (transactionType !== "Transfer") {
              if (contraField) {
                contraField.value = "";
                contraField.disabled = true;
              }
            } else {
              // Enable ContraAccountID for Transfer
              if (contraField) {
                contraField.disabled = false;
              }
            }

            // Handle Denomination button
            if (transactionType === "Cash" && IsDenominationReqd) {
              const denomBtn = root.querySelector(".rtp-denom-btn");
              if (denomBtn) denomBtn.disabled = false;
            } else {
              const denomBtn = root.querySelector(".rtp-denom-btn");
              if (denomBtn) denomBtn.disabled = true;
            }
          }

          // Legacy: Re-validate currency rate on transaction type change
          if (mode !== "view" && dtBHSRescheduleTrxPost) {
            validateCurrencyRate();
          }
        });
      }

      // Add field change handlers to clear error styling
      // Legacy: Error clearing when user fixes the field
      const fieldsWithValidation = ["TransactionType", "AccountType", "ValueDate", "ContraAccountID", "LocalAmount", "ClientContribution"];
      fieldsWithValidation.forEach((fieldName) => {
        const field = elements[fieldName];
        if (field) {
          // Clear error on any change/input
          field.addEventListener("change", () => clearFieldError(fieldName));
          field.addEventListener("blur", () => {
            // Only keep error if field is empty (required validation)
            if (field.value && field.classList?.contains("rtp-field-error")) {
              clearFieldError(fieldName);
            }
          });
        }
      });

      // Lookup buttons
      wireLookups();

      // ========== SEARCH FIELD HANDLERS (Loan Maintenance Pattern) ==========
      // Add blur and Enter key handlers for auto-search functionality

      // BranchID field - Search on blur/Enter
      const branchIDField = document.getElementById('BranchID');
      if (branchIDField) {
        branchIDField.addEventListener("blur", async () => {
          const value = branchIDField.value?.trim();
          if (value && value !== "0101") {
            await handleBranchSearch(value);
          }
        });

        branchIDField.addEventListener("keypress", async (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const value = branchIDField.value?.trim();
            if (value) {
              await handleBranchSearch(value);
            }
          }
        });
      }

      // ClientID field - Search on blur/Enter
      const clientIDField = document.getElementById('ClientID');
      if (clientIDField) {
        clientIDField.addEventListener("blur", async () => {
          const value = clientIDField.value?.trim();
          if (value) {
            await handleClientSearch(value);
          }
        });

        clientIDField.addEventListener("keypress", async (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const value = clientIDField.value?.trim();
            if (value) {
              await handleClientSearch(value);
            }
          }
        });
      }

      // AccountID field - Search on blur/Enter
      const accountIDField = document.getElementById('AccountID');
      if (accountIDField) {
        accountIDField.addEventListener("blur", async () => {
          const value = accountIDField.value?.trim();
          if (value) {
            await handleAccountSearch(value);
          }
        });

        accountIDField.addEventListener("keypress", async (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const value = accountIDField.value?.trim();
            if (value) {
              await handleAccountSearch(value);
            }
          }
        });
      }

      // ContraAccountID field - Search on blur/Enter
      const contraAccountIDField = document.getElementById('ContraAccountID');
      if (contraAccountIDField) {
        contraAccountIDField.addEventListener("blur", async () => {
          const value = contraAccountIDField.value?.trim();
          if (value && mode !== "view" && mode !== "entry") {
            await handleContraAccountSearch(value);
          }
        });

        contraAccountIDField.addEventListener("keypress", async (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const value = contraAccountIDField.value?.trim();
            if (value && mode !== "view" && mode !== "entry") {
              await handleContraAccountSearch(value);
            }
          }
        });
      }
    }

    /**
     * Detect if running in iframe (embedded mode)
     */
    function initEmbeddedState() {
      try {
        if (global.self !== global.top) {
          document.body.classList.add("rtp-embedded");
        }
      } catch {
        document.body.classList.add("rtp-embedded");
      }
    }

    // Initialize
    console.log("[RescheduleTrxPosting] Initializing module...");
    console.log("[RescheduleTrxPosting] window.CoreApi available:", !!window.CoreApi);
    console.log("[RescheduleTrxPosting] window.RescheduleTrxPostingService available:", !!window.RescheduleTrxPostingService);
    console.log("[RescheduleTrxPosting] window.LookupService available:", !!window.LookupService);
    
    initEmbeddedState();
    
    // Fetch till details from database for Cash transactions
    console.log('[RescheduleTrxPosting] Fetching till details...');
    try {
      if (window.RescheduleTrxPostingService && window.RescheduleTrxPostingService.getTillDetails) {
        window.RescheduleTrxPostingService.getTillDetails().then((tills) => {
          if (tills && Array.isArray(tills)) {
            tillDetails = tills;
            console.log('[RescheduleTrxPosting] Till details loaded:', tillDetails);
          }
        }).catch((error) => {
          console.warn('[RescheduleTrxPosting] Failed to load till details:', error);
        });
      }
    } catch (error) {
      console.warn('[RescheduleTrxPosting] Error fetching till details:', error);
    }
    
    console.log("[RescheduleTrxPosting] About to call wireEvents()");
    wireEvents();
    console.log("[RescheduleTrxPosting] wireEvents() completed successfully");
    
    // Initialize dropdowns from database using LookupService
    console.log("[RescheduleTrxPosting] Initializing dropdowns from database...");
    async function initDropdowns() {
      if (!window.LookupService) {
        console.error("[RescheduleTrxPosting] LookupService not available");
        return;
      }
      
      try {
        // TransactionType - Use system code "TransactionTypeID"
        const transactionTypeEl = document.getElementById('TransactionType');
        if (transactionTypeEl) {
          const transactionTypes = await window.LookupService.getSystemCodeOptions('TransactionTypeID');
          transactionTypeEl.innerHTML = '<option value="">--Select--</option>';
          transactionTypes.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            transactionTypeEl.appendChild(option);
          });
          console.log(`[RescheduleTrxPosting] Loaded ${transactionTypes.length} TransactionType options from database`);
        }
        
        // AccountType - Use system code "AccountTypeID"
        const accountTypeEl = document.getElementById('AccountType');
        if (accountTypeEl) {
          const accountTypes = await window.LookupService.getSystemCodeOptions('AccountTypeID');
          accountTypeEl.innerHTML = '<option value="">--Select--</option>';
          accountTypes.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            accountTypeEl.appendChild(option);
          });
          console.log(`[RescheduleTrxPosting] Loaded ${accountTypes.length} AccountType options from database`);
        }
      } catch (error) {
        console.error("[RescheduleTrxPosting] Failed to initialize dropdowns:", error);
      }
    }
    
    // Call dropdown initialization
    initDropdowns();
    
    // Start in Entry mode (Loan Maintenance pattern)
    setEntryMode();
    console.log("[RescheduleTrxPosting] Module initialization complete - Entry mode active");

    // Load context from parent on load
    const parentContext = getContextFromParent();
    if (parentContext.BranchID && elements.BranchID) {
      elements.BranchID.value = parentContext.BranchID;
    }

    // Legacy: Initialize state variables
    EventID = "NONE";
    userHasRights = false;
    MeanRate = 0;
    IsDenominationReqd = false;
    dsDenomination = null;
    dtBHSRescheduleTrxPost = null;
    dtCurrencyRates = null;

    console.log("[RescheduleTrxPosting] Initialized successfully.");
  }

  // Auto-initialize on DOM ready
  console.log("[RescheduleTrxPosting] Checking DOM state...");
  if (document.readyState === "loading") {
    console.log("[RescheduleTrxPosting] DOM still loading, using DOMContentLoaded");
    document.addEventListener("DOMContentLoaded", () => {
      console.log("[RescheduleTrxPosting] DOMContentLoaded fired");
      initRescheduleTrxPosting();
    });
  } else {
    console.log("[RescheduleTrxPosting] DOM already loaded, initializing immediately");
    initRescheduleTrxPosting();
  }
})(window);
