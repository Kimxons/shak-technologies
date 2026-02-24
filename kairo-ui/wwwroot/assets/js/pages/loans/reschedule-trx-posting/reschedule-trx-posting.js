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
    // Use the form for element lookups, matching Loan Maintenance
    const form = document.forms['rescheduleTrxForm'];
    const elements = {
      // Identifiers
      BranchID: form ? form.BranchID : null,
      BranchName: root.querySelector("#BranchName"),
      ClientID: form ? form.ClientID : null,
      ClientName: root.querySelector("#ClientName"),
      AccountID: form ? form.AccountID : null,
      AccountName: root.querySelector("#AccountName"),
      LoanSeries: form ? form.LoanSeries : null,

      // Transaction Header - Left
      ClientContribution: form ? form.ClientContribution : null,
      LocalAmount: form ? form.LocalAmount : null,
      TransactionType: form ? form.TransactionType : null,
      AccountType: form ? form.AccountType : null,
      ContraAccountID: form ? form.ContraAccountID : null,
      ContraAccountName: root.querySelector("#ContraAccountName"),
      ValueDate: form ? form.ValueDate : null,
      Narration: form ? form.Narration : null,

      // Transaction Header - Right
      ExchangeRate: form ? form.ExchangeRate : null,
      ForexGainLoss: form ? form.ForexGainLoss : null,
      Till: form ? form.Till : null,
      ReferenceNo: form ? form.ReferenceNo : null,

      // Behind The Scene (read-only)
      LoanAmount: form ? form.LoanAmount : null,
      LoanBalance: form ? form.LoanBalance : null,
      ProposedAmount: form ? form.ProposedAmount : null,
      NetAmount: form ? form.NetAmount : null,
      ProductID: form ? form.ProductID : null,
      Status: form ? form.Status : null
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
    } // <-- Properly close setFieldsEnabled function

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
      if (elements.AccountName) elements.AccountName.value = convertNullToEmpty(row.AccountName || row.Name);
      if (elements.LoanSeries) elements.LoanSeries.value = convertNullToEmpty(row.LoanSeries);

      // Transaction Header - Handle both number and text input types
      if (elements.ClientContribution) {
        const clientContribValue = row.ClientContribution || 0;
        if (elements.ClientContribution.type === "number") {
          elements.ClientContribution.value = clientContribValue > 0 ? clientContribValue.toString() : "";
        } else {
          elements.ClientContribution.value = formatCurrency(clientContribValue);
        }
      }
      if (elements.LocalAmount) {
        const localAmtValue = row.LocalAmount || 0;
        if (elements.LocalAmount.type === "number") {
          elements.LocalAmount.value = localAmtValue > 0 ? localAmtValue.toString() : "";
        } else {
          elements.LocalAmount.value = formatCurrency(localAmtValue);
        }
      }
      if (elements.TransactionType) elements.TransactionType.value = convertNullToEmpty(row.TransactionType);
      if (elements.AccountType) elements.AccountType.value = convertNullToEmpty(row.AccountType);
      if (elements.ContraAccountID) elements.ContraAccountID.value = convertNullToEmpty(row.ContraAccountID);
      if (elements.ValueDate) elements.ValueDate.value = convertNullToEmpty(row.ValueDate);
      if (elements.Narration) elements.Narration.value = convertNullToEmpty(row.Narration);
      if (elements.ExchangeRate) elements.ExchangeRate.value = convertNullToEmpty(row.ExchangeRate);
      if (elements.ForexGainLoss) {
        const forexValue = row.ForexGainLoss || 0;
        if (elements.ForexGainLoss.type === "number") {
          elements.ForexGainLoss.value = forexValue !== 0 ? forexValue.toString() : "";
        } else {
          elements.ForexGainLoss.value = formatCurrency(forexValue);
        }
      }
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
          <td>${convertNullToEmpty(row.TrxDescription)}</td>
          <td>${convertNullToEmpty(row.TrxType)}</td>
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

      console.log("[RescheduleTrxPosting] calculateBehindTheScene - LA:", localAmount, "CC:", clientContribution);

      // Legacy formula (from fnBindData and legacy behavior)
      // ProposedAmount = LocalAmount
      const proposedAmount = localAmount;

      // Legacy formula (from legacy system: txtBHSNetAmount)
      // NetAmount = LocalAmount - ClientContribution
      // This is used in Proceed button validation and transaction posting
      const netAmount = Math.max(0, localAmount - clientContribution);

      // Update Behind The Scene fields with currency formatting
      // Handle both number and text inputs - ALWAYS set a value
      if (elements.NetAmount) {
        const valueToSet = Math.max(0, netAmount);
        const formattedValue = formatCurrency(valueToSet);
        if (elements.NetAmount.type === "number") {
          elements.NetAmount.value = valueToSet.toString();
        } else {
          elements.NetAmount.value = formattedValue;
        }
        console.log("[RescheduleTrxPosting] NetAmount set to:", elements.NetAmount.value);
      }
      if (elements.ProposedAmount) {
        const valueToSet = Math.max(0, proposedAmount);
        const formattedValue = formatCurrency(valueToSet);
        if (elements.ProposedAmount.type === "number") {
          elements.ProposedAmount.value = valueToSet.toString();
        } else {
          elements.ProposedAmount.value = formattedValue;
        }
        console.log("[RescheduleTrxPosting] ProposedAmount set to:", elements.ProposedAmount.value);
      }

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
      // Use Client Contribution for calculation, not LocalAmount
      const clientContribution = parseFormattedValue(elements.ClientContribution?.value || "0");
      const exchangeRateRaw = elements.ExchangeRate?.value?.trim();
      const exchangeRate = exchangeRateRaw ? parseFormattedValue(exchangeRateRaw) : 1.0;

      console.log("[RescheduleTrxPosting] calculateLocalAmount - CC:", clientContribution, "ER:", exchangeRate);

      // Calculate local amount: localAmount = clientContribution * exchangeRate
      const localAmount = clientContribution * exchangeRate;
      
      if (elements.LocalAmount && localAmount !== undefined) {
        // Always set a value, never leave empty
        const valueToSet = localAmount > 0 ? localAmount : 0;
        
        // Handle both number and text inputs
        if (elements.LocalAmount.type === "number") {
          elements.LocalAmount.value = valueToSet.toString();
        } else {
          elements.LocalAmount.value = formatCurrency(valueToSet);
        }
        console.log("[RescheduleTrxPosting] LocalAmount set to:", elements.LocalAmount.value);
      }
      
      calculateBehindTheScene();
      // Also trigger forex gain/loss calculation after local amount
      calculateForexGainLoss();
    }

    /**
     * Calculate forex gain/loss (legacy: fnCalProfitLoss)
     */
    async function calculateForexGainLoss() {
      // Calculate Forex Gain/Loss: (Client Contribution * (ExchangeRate - MarketRate))
      const clientContribution = parseFormattedValue(elements.ClientContribution?.value || "0");
      const exchangeRate = parseFormattedValue(elements.ExchangeRate?.value || "1.0");
      const marketRate = 1.0; // Default market rate, can be replaced with actual if available
      const gainLoss = clientContribution * (exchangeRate - marketRate);
      if (elements.ForexGainLoss) {
        // Handle both number and text inputs
        if (elements.ForexGainLoss.type === "number") {
          elements.ForexGainLoss.value = gainLoss !== 0 ? gainLoss.toString() : "";
        } else {
          elements.ForexGainLoss.value = formatCurrency(gainLoss);
        }
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
        
        // CRITICAL: Set mode to "add" FIRST before any other setup
        console.log('[RescheduleTrxPosting] handleAdd - Setting mode to "add"');
        mode = "add";
        EventID = "ADD";
        console.log('[RescheduleTrxPosting] handleAdd - Mode set to:', mode, 'EventID:', EventID);

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

        // Update mode badge
        if (modeBadge) {
          modeBadge.textContent = 'Add';
          modeBadge.className = 'badge bg-success';
        }

        console.log('[RescheduleTrxPosting] ✅ Add mode activated - ready for transaction entry, mode is now:', mode);
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
      try {
        console.log("🔴🔴🔴 HANDLEPROCEED FUNCTION ENTERED 🔴🔴🔴");
        console.log("[RescheduleTrxPosting] handleProceed called - mode:", mode, "EventID:", EventID);
        console.log("[RescheduleTrxPosting] Function is executing");
        
        // CRITICAL: Check mode is "add" not "view" 
        if (mode !== "add") {
          console.log("[RescheduleTrxPosting] ⚠️ BLOCKING PROCEED - Mode is not 'add', current mode:", mode);
          alert(`Cannot proceed in ${mode} mode. Enter Add mode first.`);
          return;
        }

        console.log("[RescheduleTrxPosting] ✅ Mode check passed - mode is 'add'");
        
        // Clear previous errors
        clearAllFieldErrors();

        // Legacy: Validate required fields with error styling
        if (!elements.TransactionType?.value) {
          console.log("[RescheduleTrxPosting] Validation failed - TransactionType is empty");
          setFieldError("TransactionType", true);
          alert("Transaction Type is required. (Code 1645)");
          elements.TransactionType?.focus();
          return;
        }
        setFieldError("TransactionType", false);
        console.log("[RescheduleTrxPosting] TransactionType valid:", elements.TransactionType.value);

        if (!elements.AccountType?.value) {
          console.log("[RescheduleTrxPosting] Validation failed - AccountType is empty");
          setFieldError("AccountType", true);
          alert("Account Type is required. (Code 1655)");
          elements.AccountType?.focus();
          return;
        }
        setFieldError("AccountType", false);
        console.log("[RescheduleTrxPosting] AccountType valid:", elements.AccountType.value);

        // Legacy: ValueDate validation (compare with WorkingDate)
        if (!elements.ValueDate?.value) {
          console.log("[RescheduleTrxPosting] Validation failed - ValueDate is empty");
          setFieldError("ValueDate", true);
          alert("Value Date is required. (Code 1620)");
          elements.ValueDate?.focus();
          return;
        }
        setFieldError("ValueDate", false);
        console.log("[RescheduleTrxPosting] ValueDate valid:", elements.ValueDate.value);

        if (elements.TransactionType.value === "Transfer") {
          if (!elements.ContraAccountID?.value?.trim()) {
            console.log("[RescheduleTrxPosting] Validation failed - ContraAccountID is required for Transfer");
            setFieldError("ContraAccountID", true);
            alert("Contra Account ID is required for Transfer.");
            elements.ContraAccountID?.focus();
            return;
          }
          setFieldError("ContraAccountID", false);
        }

        const accountID = elements.AccountID?.value?.trim() || "";
        const localAmount = parseFormattedValue(elements.LocalAmount?.value || "0");
        const clientContribution = parseFormattedValue(elements.ClientContribution?.value || "0");
        const exchangeRateRaw = elements.ExchangeRate?.value?.trim();
        const exchangeRate = exchangeRateRaw ? parseFormattedValue(exchangeRateRaw) : 1.0;
        const profit = parseFormattedValue(elements.ForexGainLoss?.value || "0");
        const meanRate = MeanRate || 0;
        const narration = elements.Narration?.value || "";
        const referenceNo = elements.ReferenceNo?.value || "";
        const valueDateRaw = elements.ValueDate?.value || new Date().toISOString();
        
        // Format ValueDate as 'YYYY-MM-DD 00:00:00'
        let valueDate = valueDateRaw;
        if (/^\d{4}-\d{2}-\d{2}$/.test(valueDateRaw)) {
          valueDate = valueDateRaw + " 00:00:00";
        }

        console.log("[RescheduleTrxPosting] Field values:", {
          accountID,
          transactionType: elements.TransactionType.value,
          accountType: elements.AccountType.value,
          localAmount,
          clientContribution,
          exchangeRate,
          profit,
          valueDate,
          all_fields_logged: true
        });

        // Validation: Check that we have required values for the service call
        if (!accountID) {
          console.log("[RescheduleTrxPosting] Validation failed - AccountID is empty");
          alert("Provide an Account ID before proceeding.");
          elements.AccountID?.focus();
          return;
        }

        // Map TransactionType and AccountType to IDs
        const transactionTypeMapping = { "Transfer": "T", "Cash": "C", "JV": "JV" };
        const accountTypeMapping = { "Customer": "C", "GL": "G", "Internal": "I" };
        const trxTypeID = transactionTypeMapping[elements.TransactionType.value] || elements.TransactionType.value;
        const accountTypeID = accountTypeMapping[elements.AccountType.value] || elements.AccountType.value;

        console.log("[RescheduleTrxPosting] Mapping:", {
          trxTypeID,
          accountTypeID,
          mappingDone: true
        });

        // Use currency from header if available, else default
        const trxCurrencyID = dtBHSRescheduleTrxPost?.CurrencyID || "ETB";

        // OperatorID from service or fallback
        const operatorID = (window.RescheduleTrxPostingService?.getOperatorId && window.RescheduleTrxPostingService.getOperatorId()) || "web_portal";

        // Build payload as per user spec
        const payload = {
          ourBranchID: elements.BranchID?.value || "",
          accountID: accountID,
          loanSeries: elements.LoanSeries?.value || 1,
          trxTypeID: trxTypeID,
          accountTypeID: accountTypeID,
          contraAccountID: elements.ContraAccountID?.value || "",
          trxCurrencyID: trxCurrencyID,
          valueDate: valueDate,
          referenceNo: referenceNo,
          clientContribution: clientContribution,
          localAmount: localAmount,
          exchangeRate: exchangeRate,
          meanRate: meanRate,
          profit: profit,
          narration: narration,
          operatorID: operatorID
        };

      console.log("[RescheduleTrxPosting] ✅ All validations passed - Proceeding with payload:", JSON.stringify(payload, null, 2));
      console.log("[RescheduleTrxPosting] Service available:", !!window.RescheduleTrxPostingService);
      console.log("[RescheduleTrxPosting] Method available:", !!window.RescheduleTrxPostingService?.getReschLoanPostTrx);

      try {
        if (!window.RescheduleTrxPostingService) {
          console.error("[RescheduleTrxPosting] Service not available");
          alert("Service is not available. Please refresh the page.");
          return;
        }

        if (!window.RescheduleTrxPostingService.getReschLoanPostTrx) {
          console.error("[RescheduleTrxPosting] getReschLoanPostTrx method not available");
          alert("Service method is not available. Please refresh the page.");
          return;
        }

        console.log("[RescheduleTrxPosting] Calling getReschLoanPostTrx...");
        
        // Call the service with the correct payload
        const response = await window.RescheduleTrxPostingService.getReschLoanPostTrx(payload);

        console.log("[RescheduleTrxPosting] Response received:", response);

        // Accept both { Details: [...] } and array
        let details = Array.isArray(response) ? response : response?.Details;
        
        console.log("[RescheduleTrxPosting] Extracted details:", details);
        
        if (!details || !Array.isArray(details) || details.length === 0) {
          console.warn("[RescheduleTrxPosting] No transaction lines in response");
          alert("No transaction lines returned from service. Please check your inputs.");
          return;
        }

        // Map response to grid (transactions)
        console.log("[RescheduleTrxPosting] Adding", details.length, "transaction(s) to grid");
        transactions = details;
        renderTransactions();
        calculateBehindTheScene();

        console.log("[RescheduleTrxPosting] Grid updated successfully");
        alert(`${details.length} transaction line(s) added to grid.`);
      } catch (error) {
        console.error("[RescheduleTrxPosting] handleProceed error:", error);
        console.error("[RescheduleTrxPosting] Error details:", {
          message: error.message,
          response: error.response,
          status: error.status,
          stack: error.stack
        });
        
        // User-friendly error messages
        let userMessage = "Failed to generate transaction lines.";
        
        if (error.response) {
          // Server responded with error
          const errorData = error.response.data || error.response;
          if (typeof errorData === 'string') {
            userMessage += `\n\nDetails: ${errorData}`;
          } else if (errorData.message) {
            userMessage += `\n\nDetails: ${errorData.message}`;
          } else if (errorData.error) {
            userMessage += `\n\nDetails: ${errorData.error}`;
          }
        } else if (error.message) {
          // Network or other error
          if (error.message.includes('Network')) {
            userMessage += "\n\nPlease check your internet connection and try again.";
          } else {
            userMessage += `\n\nDetails: ${error.message}`;
          }
        }
        
        alert(userMessage);
      }
      } catch (outerError) {
        console.error("[RescheduleTrxPosting] Outer error in handleProceed:", outerError);
        console.error("[RescheduleTrxPosting] Error details:", {
          message: outerError.message,
          stack: outerError.stack
        });
        
        let userMessage = "An unexpected error occurred.";
        if (outerError.message) {
          userMessage += `\n\nDetails: ${outerError.message}`;
        }
        
        alert(userMessage);
      }
    }

    /**
     * Handle Cancel button
     * Legacy: Reset EventID when canceling
     * Clears form and returns to entry mode
     */
    function handleCancel() {
      console.log("[RescheduleTrxPosting] handleCancel called - mode:", mode);
      
      if (mode === "view" || mode === "entry") {
        console.log("[RescheduleTrxPosting] Cancel ignored - already in view/entry mode");
        return;
      }

      if (confirm("Cancel changes? Unsaved changes will be lost.")) {
        console.log("[RescheduleTrxPosting] Cancel confirmed - clearing form");
        EventID = "NONE"; // Legacy: Reset EventID
        clearTopForm();
        transactions = [];
        renderTransactions();
        setEntryMode();
        console.log("[RescheduleTrxPosting] Form cleared and reset to Entry mode");
      }
    }

    /**
     * Handle Save button
     * Legacy: Save transaction posting to database
     * DB CALL #6: Uses p_SaveReschLoanPostTrx or similar
     */
    async function handleSave() {
      try {
        console.log("[RescheduleTrxPosting] handleSave called - mode:", mode);
        
        // Validate mode is "add"
        if (mode !== "add") {
          alert("Cannot save in current mode. Enter Add mode first.");
          return;
        }

        // Validate we have transaction lines in the grid
        if (!transactions || transactions.length === 0) {
          alert("No transaction lines to save. Click Proceed to generate transaction lines first.");
          return;
        }

        // Validate required fields
        const accountID = elements.AccountID?.value?.trim() || "";
        const branchID = elements.BranchID?.value?.trim() || "";
        
        if (!accountID) {
          alert("Account ID is required to save.");
          elements.AccountID?.focus();
          return;
        }

        if (!branchID) {
          alert("Branch ID is required to save.");
          elements.BranchID?.focus();
          return;
        }

        // Confirm save action
        if (!confirm(`Save ${transactions.length} transaction line(s)?`)) {
          console.log("[RescheduleTrxPosting] Save cancelled by user");
          return;
        }

        // Check if service is available
        if (!window.RescheduleTrxPostingService) {
          console.error("[RescheduleTrxPosting] Service not available");
          alert("Service is not available. Please refresh the page.");
          return;
        }

        // Get operator ID
        const operatorID = (window.RescheduleTrxPostingService?.getOperatorId && 
                           window.RescheduleTrxPostingService.getOperatorId()) || "web_portal";

        // Build save payload matching p_AddLoanReschPostTrx parameters
        const payload = {
          ourBranchID: branchID,                    // @OurBranchID
          accountID: accountID,                      // @AccountID
          loanSeries: parseInt(elements.LoanSeries?.value || 1),  // @LoanSeries
          transactions: transactions,                // Will be converted to @DetailRecords XML
          createdBy: operatorID,                     // @CreatedBy
          createdOn: new Date().toISOString().replace('T', ' ').substring(0, 19),  // @CreatedOn 'YYYY-MM-DD HH:MM:SS'
          modifiedBy: operatorID,                    // @ModifiedBy
          modifiedOn: null,                          // @ModifiedOn (NULL for new records)
          supervisedBy: null,                        // @SupervisedBy
          supervisedOn: null                         // @SupervisedOn
        };

        console.log("[RescheduleTrxPosting] Saving with payload:", payload);
        console.log("[RescheduleTrxPosting] Transaction lines:", transactions.length);

        // Call save service method
        let response;
        if (window.RescheduleTrxPostingService.saveReschLoanPostTrx) {
          response = await window.RescheduleTrxPostingService.saveReschLoanPostTrx(payload);
        } else {
          // Fallback to generic save if specific method not available
          console.warn("[RescheduleTrxPosting] saveReschLoanPostTrx method not found, using fallback");
          alert("Save method not configured. Please contact system administrator.");
          return;
        }

        console.log("[RescheduleTrxPosting] Save response:", response);

        // Check response for success
        const success = response?.success !== false && response?.Success !== false;
        
        if (success) {
          // Show success message with TrxBatchID if available
          let successMsg = "Transaction posting saved successfully!";
          if (response?.trxBatchID) {
            successMsg += `\n\nTransaction Batch ID: ${response.trxBatchID}`;
          }
          if (response?.trxSerialID) {
            successMsg += `\nTransaction Serial ID: ${response.trxSerialID}`;
          }
          alert(successMsg);
          
          // Reset to view mode
          setViewMode();
          
          // Keep data displayed but disable editing
          setFieldsEnabled(false);
          
          console.log("[RescheduleTrxPosting] Save completed successfully");
        } else {
          const errorMsg = response?.message || response?.Message || "Save failed with unknown error.";
          alert(`Failed to save transaction posting:\n\n${errorMsg}`);
          console.error("[RescheduleTrxPosting] Save failed:", response);
        }
      } catch (error) {
        console.error("[RescheduleTrxPosting] handleSave error:", error);
        
        // User-friendly error message
        let userMessage = "Failed to save transaction posting.";
        
        if (error.response) {
          const errorData = error.response.data || error.response;
          if (typeof errorData === 'string') {
            userMessage += `\n\nDetails: ${errorData}`;
          } else if (errorData.message) {
            userMessage += `\n\nDetails: ${errorData.message}`;
          } else if (errorData.error) {
            userMessage += `\n\nDetails: ${errorData.error}`;
          }
        } else if (error.message) {
          if (error.message.includes('Network')) {
            userMessage += "\n\nPlease check your internet connection and try again.";
          } else {
            userMessage += `\n\nDetails: ${error.message}`;
          }
        }
        
        alert(userMessage);
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
      console.log('[RescheduleTrxPosting] wireLookups called');

      // Wait for SearchModal to be available
      function waitForSearchModal(callback, maxWaitMs = 5000, intervalMs = 100) {
        const start = Date.now();
        (function check() {
          if (window.SearchModal) {
            console.log('[RescheduleTrxPosting] SearchModal loaded');
            callback();
          } else if (Date.now() - start < maxWaitMs) {
            setTimeout(check, intervalMs);
          } else {
            console.warn('[RescheduleTrxPosting] SearchModal not available after timeout');
          }
        })();
      }

      // If DOM is already loaded, wire immediately
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        waitForSearchModal(() => {
          wireLookupModals();
        });
      } else {
        document.addEventListener('DOMContentLoaded', function() {
          waitForSearchModal(() => {
            wireLookupModals();
          });
        });
      }
      
      function wireLookupModals() {
        // Create modal instances once and reuse them
        const branchModal = new window.SearchModal({
          prefix: 'rtp-branch-search',
          moduleID: '4300',
          getOperatorId: () => (typeof window.getOperatorId === 'function' ? window.getOperatorId() : 'web_portal'),
          getOurBranchId: () => document.getElementById('BranchID')?.value || ''
        });
        const clientModal = new window.SearchModal({
          prefix: 'rtp-client-search',
          moduleID: '4300',
          getOperatorId: () => (typeof window.getOperatorId === 'function' ? window.getOperatorId() : 'web_portal'),
          getOurBranchId: () => document.getElementById('BranchID')?.value || ''
        });
        const accountModal = new window.SearchModal({
          prefix: 'rtp-account-search',
          moduleID: '4300',
          getOperatorId: () => (typeof window.getOperatorId === 'function' ? window.getOperatorId() : 'web_portal'),
          getOurBranchId: () => document.getElementById('BranchID')?.value || ''
        });
        const contraModal = new window.SearchModal({
          prefix: 'rtp-contra-search',
          moduleID: '4300',
          getOperatorId: () => (typeof window.getOperatorId === 'function' ? window.getOperatorId() : 'web_portal'),
          getOurBranchId: () => document.getElementById('BranchID')?.value || ''
        });

        // Wire up all lookup buttons using data-target-input
        const lookupButtons = document.querySelectorAll('button[data-target-input]');
        console.log('[RescheduleTrxPosting] Found lookup buttons:', lookupButtons.length, lookupButtons);
        lookupButtons.forEach((btn) => {
          const targetInput = btn.getAttribute('data-target-input');
          if (!targetInput) {
            console.warn('[RescheduleTrxPosting] Lookup button missing data-target-input:', btn);
            return;
          }
          btn.addEventListener('click', (e) => {
            console.log('[RescheduleTrxPosting] Lookup button event handler fired:', targetInput);
            e.preventDefault();
            const branchID = document.getElementById('BranchID')?.value || '';
            if (!branchID && targetInput !== 'BranchID') {
              alert('Please enter Branch ID first');
              return;
            }
            try {
              if (targetInput === 'BranchID') {
                const branchIDValue = document.getElementById('BranchID')?.value || '';
                console.log('[RescheduleTrxPosting] Calling branchModal.open');
                branchModal.open({
                  tableID: 'BranchID',
                  searchFields: [
                    { name: 'BranchID', label: 'Branch ID', column: 'OurBranchID', value: branchIDValue },
                    { name: 'BranchName', label: 'Branch Name', column: 'BranchName' }
                  ],
                  autoSearch: !!branchIDValue,
                  onSelect: (record) => {
                    document.getElementById('BranchID').value = record.OurBranchID || '';
                    document.getElementById('BranchName').value = record.BranchName || '';
                  }
                });
                console.log('[RescheduleTrxPosting] branchModal.open called');
              } else if (targetInput === 'ClientID') {
                const clientIDValue = document.getElementById('ClientID')?.value || '';
                console.log('[RescheduleTrxPosting] Calling clientModal.open');
                clientModal.open({
                  tableID: 'ClientAccountID',
                  whereStmt: `ProductTypeID='LN' AND OurBranchID = '${branchID}'`,
                  searchFields: [
                    { name: 'ClientID', label: 'Client ID', column: 'ClientID', value: clientIDValue },
                    { name: 'ClientName', label: 'Client Name', column: 'ClientName' }
                  ],
                  autoSearch: !!clientIDValue,
                  onSelect: (record) => {
                    document.getElementById('ClientID').value = record.ClientID || '';
                    const clientName = record.ClientName || record.Name || '';
                    const clientNameEl = document.getElementById('ClientName');
                    if (clientNameEl) clientNameEl.value = clientName;
                  }
                });
                console.log('[RescheduleTrxPosting] clientModal.open called');
              } else if (targetInput === 'AccountID') {
                const branchID = document.getElementById('BranchID')?.value || '';
                console.log('[RescheduleTrxPosting] Calling accountModal.open');
                accountModal.open({
                  tableID: 'RescheduleIniAccount',
                  whereStmt: '',
                  searchFields: [
                    { name: 'AccountID', label: 'Account ID', column: 'AccountID' }
                  ],
                  autoSearch: false,
                  advFilterString: `OurBranchID='${branchID}'`,
                  operatorId: 'MARTIN_MARANGA', // Replace with dynamic username if needed
                  moduleID: '4404',
                  ourBranchId: branchID,
                  prevOrNext: 0,
                  refId: null,
                  searchKey: null,
                  languageId: 'en',
                  onSelect: (record) => {
                    document.getElementById('AccountID').value = record.AccountID || '';
                    document.getElementById('AccountName').value = record.AccountName || record.Name || '';
                    document.getElementById('LoanSeries').value = record.LoanSeries || '';
                  }
                });
                console.log('[RescheduleTrxPosting] accountModal.open called');
              }
              else if (targetInput === 'ContraAccountID') {
                const contraAccountIDValue = document.getElementById('ContraAccountID')?.value || '';
                const accountType = document.getElementById('AccountType')?.value || '';
                const branchID = document.getElementById('BranchID')?.value || '';
                const currencyID = window.RescheduleTrxPostingService?.getDynamicValue("ProductCurrencyID") || 'ETB';
                const clientID = document.getElementById('ClientID')?.value || '';
                let tableID = '';
                let advFilterString = '';
                let searchFields = [];
                if (accountType === 'C' || accountType === 'Customer') {
                  tableID = 'AccountCrTrxAllowID';
                  advFilterString = `OurBranchID='${branchID}' AND CurrencyID='${currencyID}' AND ClientID='${clientID}'`;
                  searchFields = [
                    { name: 'AccountID', label: 'Account ID', column: 'AccountID', value: contraAccountIDValue },
                    { name: 'Name', label: 'Name', column: 'Name' },
                    { name: 'ProductID', label: 'Product ID', column: 'ProductID' },
                    { name: 'CurrencyID', label: 'Currency ID', column: 'CurrencyID' }
                  ];
                } else if (accountType === 'G' || accountType === 'GL') {
                  tableID = 'GLCrTrxAllowID';
                  advFilterString = `OurBranchID='${branchID}' AND CurrencyID='${currencyID}'`;
                  searchFields = [
                    { name: 'AccountID', label: 'Account ID', column: 'AccountID', value: contraAccountIDValue },
                    { name: 'Description', label: 'Description', column: 'Description' },
                    { name: 'CurrencyID', label: 'Currency ID', column: 'CurrencyID' },
                    { name: 'GLAccountTypeID', label: 'GL Account Type ID', column: 'GLAccountTypeID' }
                  ];
                } else {
                  // Default/fallback
                  tableID = 'LoanID';
                  advFilterString = `OurBranchID='${branchID}'`;
                  searchFields = [
                    { name: 'AccountID', label: 'Account ID', column: 'AccountID', value: contraAccountIDValue },
                    { name: 'LoanID', label: 'Loan ID', column: 'LoanID' },
                    { name: 'LoanSeries', label: 'Loan Series', column: 'LoanSeries' }
                  ];
                }
                console.log('[RescheduleTrxPosting] Calling contraModal.open');
                contraModal.open({
                  tableID: tableID,
                  whereStmt: '',
                  advFilterString: advFilterString,
                  searchFields: searchFields,
                  autoSearch: !!contraAccountIDValue,
                  onSelect: (record) => {
                    document.getElementById('ContraAccountID').value = record.AccountID || '';
                    document.getElementById('ContraAccountName').value = record.Name || record.Description || '';
                  }
                });
                console.log('[RescheduleTrxPosting] contraModal.open called');
              }
            } catch (err) {
              console.error('[RescheduleTrxPosting] Error opening search modal:', err);
            }
          });
          console.log('[RescheduleTrxPosting] Lookup button wired:', targetInput);
        });

        // Add blur/enter handlers for search fields
        const branchInput = document.getElementById('BranchID');
        if (branchInput) {
          branchInput.addEventListener('blur', function(e) {
            console.log('[RescheduleTrxPosting] BranchID blur event');
            handleBranchSearch(e.target.value);
          });
          branchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
              console.log('[RescheduleTrxPosting] BranchID enter event');
              handleBranchSearch(e.target.value);
            }
          });
        }
        const clientInput = document.getElementById('ClientID');
        if (clientInput) {
          clientInput.addEventListener('blur', function(e) {
            console.log('[RescheduleTrxPosting] ClientID blur event');
            handleClientSearch(e.target.value);
          });
          clientInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
              console.log('[RescheduleTrxPosting] ClientID enter event');
              handleClientSearch(e.target.value);
            }
          });
        }
        const accountInput = document.getElementById('AccountID');
        if (accountInput) {
          accountInput.addEventListener('blur', function(e) {
            console.log('[RescheduleTrxPosting] AccountID blur event');
            handleAccountSearch(e.target.value);
          });
          accountInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
              console.log('[RescheduleTrxPosting] AccountID enter event');
              handleAccountSearch(e.target.value);
            }
          });
        }
        const contraInput = document.getElementById('ContraAccountID');
        if (contraInput) {
          contraInput.addEventListener('blur', function(e) {
            console.log('[RescheduleTrxPosting] ContraAccountID blur event');
            handleContraAccountSearch(e.target.value);
          });
          contraInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
              console.log('[RescheduleTrxPosting] ContraAccountID enter event');
              handleContraAccountSearch(e.target.value);
            }
          });
        }
      }
    }
    // ========== SEARCH HANDLERS (Called by blur/Enter and lookup buttons) ==========

    /**
     * Handle Branch ID search (blur/Enter)
     */
    async function handleBranchSearch(searchValue) {
      try {
        if (!window.SearchService) {
          console.warn("[RescheduleTrxPosting] SearchService not available");
          return;
        }

        let responseData = [];
        // Prefer getBranches if available
        if (typeof window.SearchService.getBranches === 'function') {
          const response = await window.SearchService.getBranches({ BankID: '00' });
          responseData = response?.Details || response?.Data || response || [];
          // Filter by OurBranchID
          responseData = responseData.filter(b => (b.OurBranchID || '').toLowerCase().includes(searchValue.toLowerCase()));
        } else if (typeof window.SearchService.searchClients === 'function') {
          // Fallback to searchClients with TableID 'BranchID'
          const whereStmt = `OurBranchID LIKE '%${searchValue.replace(/'/g, "''")}'`;
          const operatorId = window.RescheduleTrxPostingService?.getOperatorId() || 'web_portal';
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
          responseData = response?.Details || response?.Data || [];
        } else {
          console.warn("[RescheduleTrxPosting] No suitable branch search method available");
          return;
        }

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
          alert("Please select Branch ID first.");
          const clientIDEl = document.getElementById('ClientID');
          if (clientIDEl) clientIDEl.value = "";
          return;
        }
        if (!window.SearchService || typeof window.SearchService.searchClients !== 'function') {
          alert("SearchService not available.");
          return;
        }
        // Use TableID 'ClientID' for client search
        const response = await window.SearchService.searchClients({
          TableID: 'ClientID',
          SearchValue: searchValue,
          BranchID: branchID
        });
        const responseData = response?.Details || response?.Data || response || [];
        if (responseData && responseData.length > 0) {
          const client = responseData[0];
          const clientIDEl = document.getElementById('ClientID');
          const clientNameEl = document.getElementById('ClientName');
          if (clientIDEl) clientIDEl.value = client.ClientID || client.ID || searchValue;
          if (clientNameEl) clientNameEl.value = client.Name || client.ClientName || "";
        } else {
          const clientNameEl = document.getElementById('ClientName');
          if (clientNameEl) clientNameEl.value = "";
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
          alert("Please select Branch ID first.");
          const accountIDEl = document.getElementById('AccountID');
          if (accountIDEl) accountIDEl.value = "";
          return;
        }
        if (!window.SearchService || typeof window.SearchService.searchAccounts !== 'function') {
          alert("SearchService not available.");
          return;
        }
        // Use TableID 'AccountID' for account search
        const response = await window.SearchService.searchAccounts({
          TableID: 'AccountID',
          SearchValue: searchValue,
          BranchID: branchID
        });
        const responseData = response?.Details || response?.Data || response || [];
        if (responseData && responseData.length > 0) {
          const account = responseData[0];
          const accountIDEl = document.getElementById('AccountID');
          const accountNameEl = document.getElementById('AccountName');
          const loanSeriesEl = document.getElementById('LoanSeries');
          if (accountIDEl) accountIDEl.value = account.AccountID || account.ID || searchValue;
          if (accountNameEl) accountNameEl.value = account.Name || account.AccountName || "";
          if (account.LoanSeries && loanSeriesEl) {
            loanSeriesEl.value = account.LoanSeries;
          }
        } else {
          const accountNameEl = document.getElementById('AccountName');
          const loanSeriesEl = document.getElementById('LoanSeries');
          if (accountNameEl) accountNameEl.value = "";
          if (loanSeriesEl) loanSeriesEl.value = "";
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
        if (!branchID) {
          alert("Please select Branch ID first.");
          const contraAccountIDEl = document.getElementById('ContraAccountID');
          if (contraAccountIDEl) contraAccountIDEl.value = "";
          return;
        }
        if (!accountType) {
          alert("Please select Account Type first.");
          elements.AccountType?.focus();
          return;
        }
        if (!window.SearchService || typeof window.SearchService.searchAccounts !== 'function') {
          alert("SearchService not available.");
          return;
        }
        // Use TableID and filter based on account type
        let tableID = 'AccountID';
        if (accountType === 'G' || accountType === 'GL') {
          tableID = 'GLAccountID';
        }
        const response = await window.SearchService.searchAccounts({
          TableID: tableID,
          SearchValue: searchValue,
          BranchID: branchID
        });
        const responseData = response?.Details || response?.Data || response || [];
        if (responseData && responseData.length > 0) {
          const account = responseData[0];
          const contraAccountIDEl = document.getElementById('ContraAccountID');
          const contraAccountNameEl = document.getElementById('ContraAccountName');
          if (accountType === 'G' || accountType === 'GL') {
            if (contraAccountIDEl) contraAccountIDEl.value = account.AccountID || account.ID || searchValue;
            if (contraAccountNameEl) contraAccountNameEl.value = account.Description || '';
          } else {
            if (contraAccountIDEl) contraAccountIDEl.value = account.AccountID || account.ID || searchValue;
            if (contraAccountNameEl) contraAccountNameEl.value = account.Name || '';
          }
        } else {
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
      console.log("[RescheduleTrxPosting] actionButtons object:", actionButtons);
      
      // Debug: Log all buttons found in root
      const allButtons = root.querySelectorAll('button');
      console.log("[RescheduleTrxPosting] Total buttons in root:", allButtons.length);
      allButtons.forEach((btn, idx) => {
        console.log(`  Button ${idx}:`, btn.getAttribute('data-action'), btn.className, btn.disabled);
      });
      
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
        console.log("[RescheduleTrxPosting] Proceed button element:", actionButtons.proceed);
        console.log("[RescheduleTrxPosting] Proceed button classList:", actionButtons.proceed.className);
        console.log("[RescheduleTrxPosting] Proceed button disabled:", actionButtons.proceed.disabled);
        
        // Add click handler with logging
        actionButtons.proceed.addEventListener("click", (e) => {
          console.log("🔴 PROCEED BUTTON CLICKED! Event:", e);
          console.log("[RescheduleTrxPosting] About to call handleProceed");
          try {
            handleProceed();
          } catch (err) {
            console.error("[RescheduleTrxPosting] Error calling handleProceed:", err);
            console.error("[RescheduleTrxPosting] Error stack:", err.stack);
          }
        });
        console.log("[RescheduleTrxPosting] Proceed button event handler attached successfully");
      } else {
        console.warn("[RescheduleTrxPosting] Proceed button not found!");
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

      // Client Contribution: format and recalculate on blur
      if (elements.ClientContribution) {
        elements.ClientContribution.addEventListener("blur", () => {
          const rawValue = elements.ClientContribution.value?.trim() || "";
          
          if (rawValue) {
            const parsed = parseFormattedValue(rawValue);
            console.log("[RescheduleTrxPosting] ClientContribution blur - raw:", rawValue, "parsed:", parsed);
            
            // Ensure value stays set (prevent accidental clearing)
            if (parsed > 0) {
              // Apply currency formatting with commas
              elements.ClientContribution.value = formatCurrency(parsed);
              console.log("[RescheduleTrxPosting] ClientContribution formatted to:", elements.ClientContribution.value);
            } else {
              // Only clear if parsed value is actually 0 or invalid
              console.log("[RescheduleTrxPosting] ClientContribution parsed to 0, clearing field");
              elements.ClientContribution.value = "";
              return; // Don't recalculate if value is 0
            }
            
            // Only recalculate if ExchangeRate has a value, otherwise skip
            const exchangeRate = parseFormattedValue(elements.ExchangeRate?.value || "1.0");
            console.log("[RescheduleTrxPosting] ExchangeRate value:", exchangeRate);
            
            calculateLocalAmount();
          }
        });
        
        elements.ClientContribution.addEventListener("focus", () => {
          // Strip formatting to show plain number for editing
          if (elements.ClientContribution.value) {
            const parsed = parseFormattedValue(elements.ClientContribution.value);
            if (parsed > 0) {
              elements.ClientContribution.value = parsed.toString();
            }
          }
        });
      }
      // Local Amount: just format on blur (no calculation, as it's derived)
      if (elements.LocalAmount) {
        elements.LocalAmount.addEventListener("blur", () => {
          if (elements.LocalAmount.value) {
            const parsed = parseFormattedValue(elements.LocalAmount.value);
            // Handle both number and text inputs
            if (elements.LocalAmount.type === "number") {
              elements.LocalAmount.value = parsed > 0 ? parsed.toString() : "";
            } else {
              elements.LocalAmount.value = formatCurrency(parsed);
            }
          }
        });
      }
      // Exchange Rate: recalculate on blur
      if (elements.ExchangeRate) {
        elements.ExchangeRate.addEventListener("blur", () => {
          calculateLocalAmount();
        });
      }

      // ValueDate: ensure field is visible and has a date picker
      if (elements.ValueDate) {
        elements.ValueDate.type = "date";
        elements.ValueDate.style.display = "";
        // Optionally, set today's date as default if empty
        if (!elements.ValueDate.value) {
          const today = new Date();
          const yyyy = today.getFullYear();
          const mm = String(today.getMonth() + 1).padStart(2, '0');
          const dd = String(today.getDate()).padStart(2, '0');
          elements.ValueDate.value = `${yyyy}-${mm}-${dd}`;
        }
      }

      // Legacy: TransactionType change handler
      // If TransactionType == "T" (Transfer), ContraAccountID is required
      // If TransactionType == "C" (Cash), Denomination button may be required
      if (elements.TransactionType) {
        elements.TransactionType.addEventListener("change", () => {
          console.log('[RescheduleTrxPosting] TransactionType change event fired. Value:', elements.TransactionType.value);
          // TEMP: Alert for debug
          // alert('Transaction Type changed to: ' + elements.TransactionType.value);
          const transactionType = elements.TransactionType.value;
          const contraField = elements.ContraAccountID;

          // Handle Till field based on TransactionType (Cash vs Transfer)
          if (transactionType === "C") {
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
          } else if (transactionType === "T" || transactionType === "JV") {
            // Transfer/JV - clear Till field
            if (elements.Till) elements.Till.value = '';
            selectedTillID = null;
          }

          if (mode !== "view") {
            // Clear ContraAccountID if switching away from Transfer
            if (transactionType !== "T") {
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
            if (transactionType === "C" && IsDenominationReqd) {
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
    
    // --- Dropdown population logic (matches Loan Maintenance) ---
    async function populateDropdown(selectId, systemCodeType) {
      const select = document.getElementById(selectId);
      if (!select || !window.LookupService || !window.LookupService.getSystemCodeOptions) return;
      try {
        const options = await window.LookupService.getSystemCodeOptions(systemCodeType);
        select.innerHTML = '';
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = '--Select--';
        select.appendChild(placeholder);
        if (Array.isArray(options)) {
          options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value ?? opt.CodeID ?? opt.id ?? '';
            option.textContent = opt.label ?? opt.Description ?? opt.Name ?? opt.Text ?? opt.value ?? opt.CodeID ?? opt.id ?? '';
            select.appendChild(option);
          });
        }
        // Set default selection
        if (options && options.length > 0) {
          select.selectedIndex = 1;
        } else {
          select.selectedIndex = 0;
        }
      } catch (err) {
        console.error(`[RescheduleTrxPosting] Failed to populate dropdown ${selectId}:`, err);
      }
    }

    // Initialize dropdowns for TransactionType and AccountType (Loan Maintenance style)
    function initDropdowns() {
      populateDropdown('TransactionType', 'CashOrTrf');
      populateDropdown('AccountType', 'AccountTypeID');
    }
    initDropdowns();
    
    // Start in Entry mode (Loan Maintenance pattern)
    setEntryMode();
    console.log("[RescheduleTrxPosting] Module initialization complete - Entry mode active");

    // Load context from parent on load
    const parentContext = getContextFromParent();
    if (parentContext.BranchID && elements.BranchID) {
      elements.BranchID.value = parentContext.BranchID;
    }

    // Wire lookup buttons after everything is initialized
    wireLookups();

    console.log("[RescheduleTrxPosting] Initialized successfully.");
  } // <-- This closes initRescheduleTrxPosting

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