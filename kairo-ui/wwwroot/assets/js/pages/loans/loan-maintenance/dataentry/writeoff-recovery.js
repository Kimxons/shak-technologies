(function () {
  const root = document.querySelector("[data-lwrc-root]");
  if (!root) return;

  const rowsBody = root.querySelector("[data-lwrc-rows]");
  const emptyEl = root.querySelector("[data-lwrc-empty]");
  const actionButtons = Array.from(root.querySelectorAll("[data-action]"));

  const editableFields = Array.from(
    root.querySelectorAll(
      "#Transaction,#TrxAccountID,#TrxAccountName,#RecoveryGL,#RecoveryGLName,#Remarks,#RecoveredAmountTrx"
    )
  );

  const lookupButtons = Array.from(root.querySelectorAll("[data-lookup]"));

  let mode = "view"; // view | add
  let dataRows = [];
  let transactionTypes = [];

  function ensureEmptyState() {
    if (!rowsBody || !emptyEl) return;
    const hasRows = rowsBody.children.length > 0;
    emptyEl.toggleAttribute("hidden", hasRows);
  }

  function formatCurrency(value) {
    if (!value || isNaN(value)) return '';
    const num = parseFloat(value);
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function parseFormattedValue(value) {
    if (!value) return '';
    return value.toString().replace(/,/g, '').replace(/%/g, '').replace(/\$/g, '').trim();
  }

  function getContextFromParent() {
    const parentDoc = window.parent?.document;
    const read = (id) => parentDoc?.getElementById(id)?.value?.trim?.() || "";
    const branchId = read("BranchID");
    const clientId = read("ClientID");
    const accountId = read("AccountID");
    const loanSeries = read("LoanSeries");
    if (window.WriteOffRecoveryService) {
      window.WriteOffRecoveryService.setDynamicValue("BranchID", branchId);
    }
    return { branchId, clientId, accountId, loanSeries };
  }

  function setFieldsEnabled(enabled, mode) {
    editableFields.forEach((el) => {
      if (!el) return;
      if (mode === "add") {
        el.disabled = false;
      } else {
        el.disabled = true;
      }
    });

    lookupButtons.forEach((btn) => {
      btn.disabled = !enabled;
    });
  }

  function clearTransactionFields() {
    editableFields.forEach((el) => {
      if (!el) return;
      el.value = "";
    });
  }

  function fillForm(row) {
    if (!row) return;
    
    const set = (id, val) => {
      const el = root.querySelector(`#${id}`);
      if (el) {
        if (id === 'RecoveredAmountTrx' && val) {
          el.value = formatCurrency(val);
        } else {
          el.value = val || '';
        }
      }
    };

    set("Transaction", row.TransactionType || row.transactionType || '');
    set("TrxAccountID", row.RecoveryAccountID || row.recoveryAccountID || '');
    set("TrxAccountName", row.RecoveryAccountName || row.recoveryAccountName || '');
    set("RecoveryGL", row.RecoveryGL || row.recoveryGL || '');
    set("RecoveryGLName", row.RecoveryGLName || row.recoveryGLName || '');
    set("Remarks", row.Remarks || row.remarks || '');
    set("RecoveredAmountTrx", row.RecoveredAmount || row.recoveredAmount || '');
  }

  function readPayload(context) {
    const read = (id) => {
      const val = root.querySelector(`#${id}`)?.value?.trim() || "";
      return parseFormattedValue(val);
    };

    // Sanitize all values to prevent NULL defaults - use empty strings for null/undefined
    const sanitizeString = (val) => {
      return (val === null || val === undefined || val === 'null' || val === 'undefined') ? '' : String(val).trim();
    };

    const sanitizeNumber = (val) => {
      const num = parseFloat(val);
      return isNaN(num) ? 0 : num;
    };

    return {
      OurBranchID: sanitizeString(context.branchId),
      CurrencyID: sanitizeString(root.querySelector('#Currency')?.value),
      AccountID: sanitizeString(context.accountId),
      LoanSeries: sanitizeNumber(context.loanSeries),
      TransactionType: sanitizeString(read("Transaction")),
      RecoveryAccountID: sanitizeString(read("TrxAccountID")),
      RecoveredAmount: sanitizeNumber(read("RecoveredAmountTrx")),
      RecoveryGL: sanitizeString(read("RecoveryGL")),
      Remarks: sanitizeString(read("Remarks")),
      OperatorID: sanitizeString(window.WriteOffRecoveryService?.getOperatorId?.() || "MARTIN_MARANGA"),
      CreatedBy: sanitizeString(window.WriteOffRecoveryService?.getOperatorId?.() || "MARTIN_MARANGA")
    };
  }

  function setMode(nextMode) {
    mode = nextMode;
    const addBtn = root.querySelector('[data-action="add"]');
    const saveBtn = root.querySelector('[data-action="save"]');
    const cancelBtn = root.querySelector('[data-action="cancel"]');

    if (mode === "view") {
      setFieldsEnabled(false, mode);
      if (addBtn) addBtn.disabled = false;
      if (saveBtn) saveBtn.disabled = true;
      if (cancelBtn) cancelBtn.disabled = false;
      return;
    }

    if (mode === "add") {
      clearTransactionFields();
      setFieldsEnabled(true, mode);
      if (addBtn) addBtn.disabled = true;
      if (saveBtn) saveBtn.disabled = false;
      if (cancelBtn) cancelBtn.disabled = false;
      root.querySelector('#Transaction')?.focus();
      return;
    }
  }

  function renderRows(rows) {
    if (!rowsBody) return;
    rowsBody.innerHTML = "";

    rows.forEach((r) => {
      const rowEl = document.createElement("tr");
      rowEl.innerHTML = `
        <td>${r.TransactionType || r.transactionType || ""}</td>
        <td>${r.RecoveryAccountID || r.recoveryAccountID || ""}</td>
        <td>${r.RecoveryAccountName || r.recoveryAccountName || ""}</td>
        <td>${r.RecoveryGL || r.recoveryGL || ""}</td>
        <td class="text-end">${formatCurrency(r.RecoveredAmount || r.recoveredAmount || 0)}</td>
        <td>${r.Remarks || r.remarks || ""}</td>
        <td>${r.CreatedBy || r.createdBy || ""}</td>
        <td>${r.CreatedOn || r.createdOn || ""}</td>
      `;
      rowsBody.appendChild(rowEl);
    });

    ensureEmptyState();
  }

  function validatePayload(payload) {
    // RecoveredAmount required and > 0
    const recoveredAmount = parseFloat(parseFormattedValue(payload.RecoveredAmount));
    if (!payload.RecoveredAmount || recoveredAmount === 0) {
      alert("Recovered Amount is required and must be greater than zero.");
      return false;
    }

    // TransactionType required
    if (!payload.TransactionType) {
      alert("Transaction Type is required.");
      return false;
    }

    // If TransactionType is 007, RecoveryAccountID is required
    if (payload.TransactionType === "007" && !payload.RecoveryAccountID) {
      alert("Recovery Account ID is required for this transaction type.");
      return false;
    }

    // RecoveryGL required
    if (!payload.RecoveryGL) {
      alert("Recovery GL is required.");
      return false;
    }

    return true;
  }

  async function loadData() {
    try {
      const ctx = getContextFromParent();

      // Fetch write-off details from p_GetWriteOffDetails
      const writeOffData = await window.WriteOffRecoveryService.fetchWriteOffDetails(ctx);
      console.log('[loadData] Write-off details:', writeOffData);

      if (writeOffData) {
        const set = (id, val) => {
          const el = root.querySelector(`#${id}`);
          if (el) {
            // Only update if val is not null/undefined/empty
            if (val !== null && val !== undefined && val !== '') {
              if (id === 'DisbursedAmount' || id === 'WriteOffBalance' || id === 'WriteOffAmount' || id === 'RecoveredAmount') {
                el.value = formatCurrency(val);
              } else {
                el.value = val;
              }
              console.log(`[loadData] Set ${id} to:`, val);
            } else {
              // Keep existing value from parent (don't override with empty)
              console.log(`[loadData] Database has no value for ${id}, keeping existing:`, el.value);
            }
          }
        };

        // Map result set fields to form fields
        // Database values override parent values, but parent values are preserved if database returns nothing
        set("Currency", writeOffData.CurrencyID || writeOffData.Currency);
        set("AccountID", writeOffData.AccountID);
        set("AccountName", writeOffData.AccountName);
        set("LoanSeries", writeOffData.LoanSeries);
        set("DisbursedAmount", writeOffData.DisbursedAmount || writeOffData.AdvancedAmount);
        set("WriteOffBalance", writeOffData.WriteOffBalance);
        set("WriteOffAmount", writeOffData.WriteOffAmount);
        set("WriteOffDate", writeOffData.WriteOffDate);
        set("RecoveredAmount", writeOffData.RecoveredAmount);
        set("LastRecoveryDate", writeOffData.LastRecoveryDate);

        set("CreatedBy", writeOffData.CreatedBy);
        set("CreatedOn", writeOffData.CreatedOn);
        set("ModifiedBy", writeOffData.ModifiedBy);
        set("ModifiedOn", writeOffData.ModifiedOn);
        set("SupervisedBy", writeOffData.SupervisedBy);
        set("SupervisedOn", writeOffData.SupervisedOn);
      }

      // Fetch recovery transactions
      const rows = await window.WriteOffRecoveryService.fetchRecoveryTransactions(ctx);
      dataRows = rows || [];
      renderRows(dataRows);

      setMode("view");
    } catch (err) {
      console.error("[WriteOff Recovery] loadData error", err);
    }
  }

  async function handleSave() {
    const ctx = getContextFromParent();
    const payload = readPayload(ctx);
    
    if (!validatePayload(payload)) return;

    try {
      console.log('[handleSave] Saving recovery transaction with payload:', payload);
      const result = await window.WriteOffRecoveryService.saveRecoveryTransaction(payload);
      console.log('[handleSave] Save result:', result);

      alert('Recovery transaction saved successfully');

      // Reload data and return to view mode
      await loadData();
      setMode("view");
    } catch (err) {
      console.error("[WriteOff Recovery] save error", err);
      alert("Save failed: " + (err.message || "Unknown error"));
    }
  }

  function closeSubwindow() {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ action: 'close-child-form' }, '*');
    }
  }

  actionButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-action");

      switch (action) {
        case "add":
          setMode("add");
          break;
        case "save":
          handleSave();
          break;
        case "cancel":
          if (mode === "view") {
            closeSubwindow();
            return;
          }
          if (mode === "add") {
            clearTransactionFields();
          }
          setMode("view");
          break;
        case "back":
          closeSubwindow();
          break;
      }
    });
  });

  // Lookup buttons use shared service wiring
  if (window.WriteOffRecoveryService) {
    window.WriteOffRecoveryService.initializeLookupButtons();
  }

  // Populate transaction types dropdown
  async function populateTransactionTypes() {
    try {
      const transactionDropdown = root.querySelector('#Transaction');
      if (!transactionDropdown) return;

      const service = window.WriteOffRecoveryService;
      if (!service) {
        console.warn('[WriteoffRecovery] WriteOffRecoveryService not available');
        return;
      }

      const transactions = await service.fetchTransactionDescriptions();
      console.log('[WriteoffRecovery] Transaction descriptions fetched:', transactions);

      // Clear existing options (except --Select--)
      transactionDropdown.innerHTML = '<option value="">--Select--</option>';

      // Populate with transaction descriptions
      if (Array.isArray(transactions)) {
        transactions.forEach((trx) => {
          const option = document.createElement('option');
          option.value = trx.TrxDescriptionID || '';
          option.textContent = trx.TrxDescription || '';
          transactionDropdown.appendChild(option);
        });
      }

      console.log('[WriteoffRecovery] Transaction types dropdown populated with', transactions.length, 'items');
    } catch (error) {
      console.error('[WriteoffRecovery] Error populating transaction types:', error);
    }
  }

  // Populate parent data on screen load
  function populateParentData() {
    const parentDoc = window.parent?.document;
    const read = (id) => parentDoc?.getElementById(id)?.value?.trim?.() || "";
    
    const accountId = read("AccountID");
    const accountName = read("AccountName");
    const loanSeries = read("LoanSeries");
    const currencyId = read("CurrencyID");
    
    // Set the fields from parent - these are identification fields
    const accountIdField = root.querySelector("#AccountID");
    const accountNameField = root.querySelector("#AccountName");
    const loanSeriesField = root.querySelector("#LoanSeries");
    const currencyField = root.querySelector("#Currency");
    const writeOffDateField = root.querySelector("#WriteOffDate");
    
    if (accountIdField) accountIdField.value = accountId;
    if (accountNameField) accountNameField.value = accountName;
    if (loanSeriesField) loanSeriesField.value = loanSeries;
    if (currencyField) currencyField.value = currencyId;
    
    // Set Write Off Date to current system date
    if (writeOffDateField) {
      const today = new Date().toISOString().split('T')[0];
      writeOffDateField.value = today;
    }
    
    console.log('[WriteoffRecovery] Parent data populated - AccountID:', accountId, ', LoanSeries:', loanSeries, ', Currency:', currencyId);
  }

  ensureEmptyState();
  populateParentData();
  populateTransactionTypes();
  setMode("view");
  loadData();
})();
