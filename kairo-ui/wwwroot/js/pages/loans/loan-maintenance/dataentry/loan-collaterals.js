(function () {
  const root = document.querySelector("[data-lcol-root]");
  if (!root) return;

  const rowsBody = root.querySelector("[data-lcol-rows]");
  const emptyEl = root.querySelector("[data-lcol-empty]");

  const actionButtons = Array.from(root.querySelectorAll("[data-action]"));

  const editableFields = Array.from(
    root.querySelectorAll(
      "#CollateralID,#ApportionedRatio,#ApportionedValue,#Margin,#ApportionedCollateralValue,#LoanCollateralValue,#ReferenceNo,#AssignedDate,#ExchangeRate,#Owner,#CollateralType,#CollateralValue,#CurrencyID,#UsedCollateralValue,#LoanCurrencyID,#SanctionAmount"
    )
  );

    const currencyLabels = {
      apportioned: root.querySelector('#ApportionedValueCurrencyLabel'),
      net: root.querySelector('#NetCollateralValueCurrencyLabel'),
      loan: root.querySelector('#LoanCollateralValueCurrencyLabel')
    };

    let mode = "view"; // view | add | edit
    let selectedRowId = null;
    let dataRows = [];
    let originalRow = null; // Store original row data for edit cancellation
    let masterCollateralData = null; // Store Details01 (collateral master data) to preserve when selecting rows

    function ensureEmptyState() {
      if (!rowsBody || !emptyEl) return;
      const hasRows = rowsBody.children.length > 0;
      emptyEl.toggleAttribute("hidden", hasRows);
    }

    function setCurrencyLabels(collateralCurrency, loanCurrency) {
      if (currencyLabels.apportioned) currencyLabels.apportioned.textContent = collateralCurrency ? `(${collateralCurrency})` : '';
      if (currencyLabels.net) currencyLabels.net.textContent = collateralCurrency ? `(${collateralCurrency})` : '';
      if (currencyLabels.loan) currencyLabels.loan.textContent = loanCurrency ? `(${loanCurrency})` : '';
    }

    function getAction(name) {
      return root.querySelector(`[data-action="${name}"]`);
    }

    // Format amount/currency fields as 1,000,000.00
    function formatCurrency(value) {
      if (!value || isNaN(value)) return '';
      const num = parseFloat(value);
      return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // Format percentage fields as 50.00%
    function formatPercentage(value) {
      if (!value || isNaN(value)) return '';
      const num = parseFloat(value);
      return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // Remove formatting and return numeric value
    function parseFormattedValue(value) {
      if (!value) return '';
      // Strip commas, percent signs, and currency markers (e.g., $)
      return value.toString().replace(/,/g, '').replace(/%/g, '').replace(/\$/g, '').trim();
    }

    function convertNullToEmpty(obj) {
      const converted = { ...obj };
      for (const key in converted) {
        if (converted[key] === null || converted[key] === undefined) {
          converted[key] = '';
        }
      }
      return converted;
    }

    // Apply formatting to currency fields on blur
    function formatCurrencyFields() {
      const currencyFields = ['ApportionedValue', 'ApportionedCollateralValue', 'LoanCollateralValue', 'CollateralValue', 'UsedCollateralValue', 'SanctionAmount'];
      currencyFields.forEach(fieldId => {
        const el = root.querySelector(`#${fieldId}`);
        if (el) {
          el.addEventListener('blur', function() {
            const rawValue = parseFormattedValue(this.value);
            if (rawValue) {
              this.value = formatCurrency(rawValue);
            }
          });
        }
      });
    }

    // Apply formatting to percentage fields on blur
    function formatPercentageFields() {
      const percentageFields = ['ApportionedRatio', 'Margin'];
      percentageFields.forEach(fieldId => {
        const el = root.querySelector(`#${fieldId}`);
        if (el) {
          el.addEventListener('blur', function() {
            const rawValue = parseFormattedValue(this.value);
            if (rawValue) {
              this.value = formatPercentage(rawValue);
            }
          });
        }
      });
    }


    // Legacy-style field enable/disable logic
    function setFieldsEnabled(enabled, mode) {
      editableFields.forEach((el) => {
        if (!el) return;
        // Only enable fields that are editable in ADD/EDIT mode
        if (mode === "add" || mode === "edit") {
          // Always disable these read-only fields
          if (["WithdrawnDate","WithdrawnReason","Status","CreatedBy","CreatedOn","ModifiedBy","ModifiedOn","SupervisedBy","SupervisedOn","ApportionedCollateralValue","LoanCollateralValue","CollateralValue","UsedCollateralValue","SanctionAmount"].includes(el.id)) {
            el.disabled = true;
          } else {
            el.disabled = false;
          }
        } else {
          el.disabled = true;
        }
      });
      
      // Also explicitly disable/enable certain fields in specific modes
      const disableInEditMode = ['AssignedDate', 'RefNo', 'CollateralID'];
      if (mode === 'edit') {
        disableInEditMode.forEach(fieldId => {
          const el = root.querySelector(`#${fieldId}`);
          if (el) el.disabled = true;
        });
      }
    }

    function clearTopForm() {
      editableFields.forEach((el) => {
        if (!el) return;
        el.value = "";
      });
      // Also clear and disable the WithdrawnReason field
      const withdrawnReasonField = root.querySelector('#WithdrawnReason');
      if (withdrawnReasonField) {
        withdrawnReasonField.value = "";
        withdrawnReasonField.disabled = true;
      }
    }

    function getContextFromParent() {
      const parentDoc = window.parent?.document;
      const read = (id) => parentDoc?.getElementById(id)?.value?.trim?.() || "";
      const branchId = read("BranchID");
      const accountId = read("AccountID");
      const loanSeries = read("LoanSeries");
      const loanRefNo = read("LoanRefNo");
      if (window.LoanCollateralsService) {
        window.LoanCollateralsService.setDynamicValue("BranchID", branchId);
      }
      return { branchId, accountId, loanSeries, loanRefNo };
    }

    function fillForm(row) {
      if (!row) return;
      const set = (id, val) => {
        const el = root.querySelector(`#${id}`);
        if (el) {
          // Format currency fields
          if (['ApportionedValue', 'ApportionedCollateralValue', 'LoanCollateralValue', 'CollateralValue', 'UsedCollateralValue', 'SanctionAmount'].includes(id)) {
            el.value = val ? formatCurrency(val) : '';
          }
          // Format percentage fields
          else if (['ApportionedRatio', 'Margin'].includes(id)) {
            el.value = val ? formatPercentage(val) : '';
          }
          // Regular fields
          else {
            el.value = val == null ? "" : String(val);
          }
        }
      };

      // First, populate from the row (Details02 - assignment data)
      set("CollateralID", row.CollateralID || row.collateralId);
      set("CollateralName", row.CollateralName || row.collateralName || row.Description || row.description);
      set("ReferenceNo", row.RefNo || row.referenceNo);
      set("AssignedDate", row.AssignedDate || row.assignedDate);
      set("ApportionedRatio", row.ApportionedRatio || row.apportionedRatio);
      set("ApportionedValue", row.ApportionedValue || row.apportionedValue);
      set("Margin", row.Margin || row.margin);
      const netCollateral = row.ApportionedCollateralValue || row.apportionedCollateralValue || row.NetCollateralValue || row.netCollateralValue;
      set("ApportionedCollateralValue", netCollateral);
      // Prefer provided LoanCollateralValue, otherwise compute from net * exchange rate
      const exchangeRateVal = row.ExchangeRate || row.exchangeRate || '1.00';
      const loanCollateralVal = row.LoanCollateralValue || row.loanCollateralValue || (netCollateral ? parseFloat(netCollateral) * parseFloat(exchangeRateVal || 1) : "");
      set("LoanCollateralValue", loanCollateralVal);
      set("ExchangeRate", exchangeRateVal);
      
      // Then, overlay with master collateral data (Details01) to preserve collateral details
      // This ensures fields like Owner, CollateralType, CollateralValue stay populated
      if (masterCollateralData) {
        set("CollateralName", masterCollateralData.CollateralName || masterCollateralData.Description || masterCollateralData.collateralName || masterCollateralData.description);
        set("Owner", masterCollateralData.OwnerClientID || masterCollateralData.Owner);
        set("CollateralType", masterCollateralData.CollateralTypeName || masterCollateralData.CollateralType);
        set("CollateralValue", masterCollateralData.CollateralValue);
        set("CurrencyID", masterCollateralData.CurrencyID);
        set("UsedCollateralValue", masterCollateralData.UsedCollateralValue);
        set("LoanCurrencyID", masterCollateralData.AccountCurrencyID || masterCollateralData.LoanCurrencyID);
        set("SanctionAmount", masterCollateralData.SanctionedAmount || masterCollateralData.SanctionAmount);
      }

      // Behind-the-scene / audit fields from Details02
      set("WithdrawnDate", row.WithdrawnDate || row.withdrawnDate);
      set("WithdrawnReason", row.WithdrawnReason || row.withdrawnReason);
      set("Status", row.LoanCollateralStatus || row.Status || row.LoanCollateralStatusID);
      set("CreatedBy", row.CreatedBy || row.createdBy);
      set("CreatedOn", row.CreatedOn || row.createdOn);
      set("ModifiedBy", row.ModifiedBy || row.modifiedBy);
      set("ModifiedOn", row.ModifiedOn || row.modifiedOn);
      set("SupervisedBy", row.SupervisedBy || row.supervisedBy);
      set("SupervisedOn", row.SupervisedOn || row.supervisedOn);

      // Update currency labels based on available currencies
      const collateralCurrency = (masterCollateralData && masterCollateralData.CurrencyID) || row.CurrencyID;
      const loanCurrency = (masterCollateralData && (masterCollateralData.AccountCurrencyID || masterCollateralData.LoanCurrencyID)) || row.AccountCurrencyID || row.LoanCurrencyID;
      setCurrencyLabels(collateralCurrency, loanCurrency);
    }

    function readPayload(context) {
      const read = (id) => {
        const val = root.querySelector(`#${id}`)?.value?.trim() || "";
        // Parse formatted values (remove commas and percent signs)
        return parseFormattedValue(val);
      };
      
      // Get AssignedDate and format it properly for SQL
      const assignedDateField = root.querySelector('#AssignedDate')?.value?.trim() || "";
      let assignedDate = null;
      if (assignedDateField) {
        // If it's already in date format, convert to SQL datetime
        const dateObj = new Date(assignedDateField);
        if (!isNaN(dateObj.getTime())) {
          assignedDate = dateObj.toISOString().replace('T', ' ').substring(0, 19);
        }
      }
      
      const createdByFromRow = mode === "edit" ? (originalRow?.CreatedBy || originalRow?.createdBy) : null;

      return {
        OurBranchID: context.branchId,
        AccountID: context.accountId,
        LoanSeries: context.loanSeries || 0,
        CollateralID: read("CollateralID"),
        RefNo: read("ReferenceNo") || 0,
        AssignedDate: assignedDate,
        ApportionedRatio: read("ApportionedRatio") || 0,
        ApportionedValue: read("ApportionedValue") || 0,
        Margin: read("Margin") || 0,
        ApportionedCollateralValue: read("ApportionedCollateralValue") || 0,
        LoanCollateralValue: read("LoanCollateralValue") || 0,
        ExchangeRate: read("ExchangeRate") || 1,
        Owner: read("Owner"),
        CollateralType: read("CollateralType"),
        CollateralValue: read("CollateralValue"),
        CurrencyID: read("CurrencyID"),
        UsedCollateralValue: read("UsedCollateralValue"),
        LoanCurrencyID: read("LoanCurrencyID"),
        SanctionAmount: read("SanctionAmount"),
        Mode: mode,
        OperatorID: window.LoanCollateralsService?.getOperatorId?.() || "MARTIN_MARANGA",
        CreatedBy: createdByFromRow || window.LoanCollateralsService?.getOperatorId?.() || "MARTIN_MARANGA"
      };
    }

    function setMode(nextMode) {
      mode = nextMode;
      const editBtn = getAction("edit");
      const deleteBtn = getAction("delete");
      const saveBtn = getAction("save");
      const cancelBtn = getAction("cancel");
      const withdrawBtn = getAction("withdraw");
      const addBtn = getAction("add");
      // Legacy-style: always enable Cancel, Back; Add only in view; Save only in add/edit; Edit/Delete/Withdraw only if row selected
      if (mode === "view") {
        setFieldsEnabled(false, mode);
        if (editBtn) editBtn.disabled = !selectedRowId;
        if (deleteBtn) deleteBtn.disabled = !selectedRowId;
        if (withdrawBtn) withdrawBtn.disabled = !selectedRowId;
        if (saveBtn) saveBtn.disabled = true;
        if (cancelBtn) cancelBtn.disabled = false;
        if (addBtn) addBtn.disabled = false;
        return;
      }
      if (mode === "add") {
        clearTopForm();
        setFieldsEnabled(true, mode);
        selectedRowId = null;
        // Re-enable CollateralID field in add mode
        const collateralIDField = root.querySelector('#CollateralID');
        if (collateralIDField) collateralIDField.disabled = false;
        if (editBtn) editBtn.disabled = true;
        if (deleteBtn) deleteBtn.disabled = true;
        if (withdrawBtn) withdrawBtn.disabled = true;
        if (saveBtn) saveBtn.disabled = false;
        if (cancelBtn) cancelBtn.disabled = false;
        if (addBtn) addBtn.disabled = true;
        return;
      }
      if (mode === "edit") {
        setFieldsEnabled(true, mode);
        if (editBtn) editBtn.disabled = true;
        if (deleteBtn) deleteBtn.disabled = true;
        if (withdrawBtn) withdrawBtn.disabled = false;
        if (saveBtn) saveBtn.disabled = false;
        if (cancelBtn) cancelBtn.disabled = false;
        if (addBtn) addBtn.disabled = true;
        
        // In edit mode, disable certain fields that shouldn't change
        const disableFields = ['CollateralID', 'AssignedDate', 'RefNo', 'CollateralValue', 'UsedCollateralValue', 'Owner', 'CollateralType', 'CurrencyID', 'LoanCurrencyID', 'SanctionAmount'];
        disableFields.forEach(fieldId => {
          const el = root.querySelector(`#${fieldId}`);
          if (el) el.disabled = true;
        });
        
        return;
      }
    }

    function renderRows(rows) {
      if (!rowsBody) return;
      rowsBody.innerHTML = "";

      rows.forEach((r) => {
        const id = r.CollateralID || r.collateralId || "";
        const rowEl = document.createElement("tr");
        rowEl.setAttribute("data-row-id", id || "(new)");
        rowEl.innerHTML = `
          <td>${id}</td>
          <td>${r.RefNo || r.referenceNo || ""}</td>
          <td>${r.AssignedDate || r.assignedDate || ""}</td>
          <td class="text-end">${r.ApportionedRatio || r.apportionedRatio || ""}</td>
          <td class="text-end">${r.ApportionedValue || r.apportionedValue || ""}</td>
          <td class="text-end">${r.Margin || r.margin || ""}</td>
          <td class="text-end">${r.ApportionedCollateralValue || r.apportionedCollateralValue || r.NetCollateralValue || r.netCollateralValue || ""}</td>
          <td class="text-end">${r.LoanCollateralValue || r.loanCollateralValue || ""}</td>
          <td class="text-end">${r.ExchangeRate || r.exchangeRate || ""}</td>
          <td>${r.Owner || r.OwnerClientID || ""}</td>
          <td>${r.CollateralType || r.CollateralTypeName || ""}</td>
          <td class="text-end">${r.CollateralValue || ""}</td>
          <td class="text-end">${r.UsedCollateralValue || ""}</td>
          <td>${r.CurrencyID || ""}</td>
        `;
        rowEl.addEventListener("click", () => {
          selectedRowId = id;
          Array.from(rowsBody.querySelectorAll("tr")).forEach((x) => x.classList.remove("is-selected"));
          rowEl.classList.add("is-selected");
          fillForm(r);
          setMode("view");
        });
        rowsBody.appendChild(rowEl);
      });

      ensureEmptyState();
    }


    // Legacy-style validation logic
    function validatePayload(payload) {
      // Collateral ID required
      if (!payload.CollateralID) {
        alert("Collateral ID is required.");
        return false;
      }
      // Apportioned Value required and > 0
      const apporVal = parseFloat(parseFormattedValue(payload.ApportionedValue));
      if (!payload.ApportionedValue || apporVal === 0) {
        alert("Apportioned Value is required and must be greater than zero.");
        return false;
      }
      // Apportioned Ratio must be <= 100
      const ratio = parseFloat(parseFormattedValue(payload.ApportionedRatio));
      if (ratio > 100) {
        alert("Apportioned Ratio cannot exceed 100.");
        return false;
      }
      // Margin required
      if (!payload.Margin) {
        alert("Margin is required.");
        return false;
      }
      // Apportioned Value must not exceed CollateralValue - UsedCollateralValue
      if (payload.CollateralValue && payload.UsedCollateralValue) {
        const collVal = parseFloat(parseFormattedValue(payload.CollateralValue));
        const usedVal = parseFloat(parseFormattedValue(payload.UsedCollateralValue));
        const diffVal = collVal - usedVal;
        const apporValue = parseFloat(parseFormattedValue(payload.ApportionedValue));
        if (diffVal < apporValue) {
          alert("Apportioned Value cannot exceed available collateral.");
          return false;
        }
      }
      // Currency checks (simplified)
      if (payload.LoanCurrencyID && payload.CurrencyID && payload.LoanCurrencyID !== payload.CurrencyID) {
        alert("Limit currency and collateral currency must match.");
        return false;
      }
      return true;
    }

    async function loadData() {
      try {
        const ctx = getContextFromParent();
        
        // First, fetch account-level collateral data to populate form
        const accountCollateralsData = await window.LoanCollateralsService.fetchAccountCollaterals(ctx);
        console.log('[loadData] Account collaterals data:', accountCollateralsData);
        
        // Store master collateral data for later use when selecting grid rows
        if (accountCollateralsData && accountCollateralsData.length > 0) {
          masterCollateralData = accountCollateralsData[0];
          const accountData = masterCollateralData;
          
          // Map account data to form fields
          const set = (id, val) => {
            const el = root.querySelector(`#${id}`);
            if (el && val != null) {
              // Format currency fields
              if (['ApportionedValue', 'ApportionedCollateralValue', 'LoanCollateralValue', 'CollateralValue', 'UsedCollateralValue', 'SanctionAmount'].includes(id)) {
                el.value = formatCurrency(val);
              }
              // Format percentage fields
              else if (['ApportionedRatio', 'Margin'].includes(id)) {
                el.value = formatPercentage(val);
              }
              // Regular fields
              else {
                el.value = String(val);
              }
            }
          };
          
          set("Owner", accountData.OwnerClientID || accountData.Owner);
          set("CollateralType", accountData.CollateralTypeName || accountData.CollateralType);
          set("CollateralValue", accountData.CollateralValue);
          set("UsedCollateralValue", accountData.UsedCollateralValue);
          set("Margin", accountData.TypeMargin || accountData.Margin);
          set("SanctionAmount", accountData.SanctionedAmount || accountData.SanctionAmount);
          set("CurrencyID", accountData.CurrencyID);
          set("LoanCurrencyID", accountData.AccountCurrencyID || accountData.AdvanceCurrencyID || accountData.LoanCurrencyID);
          set("ExchangeRate", accountData.ExchangeRate || '1.00');
          setCurrencyLabels(accountData.CurrencyID, accountData.AccountCurrencyID || accountData.AdvanceCurrencyID || accountData.LoanCurrencyID);
        }
        
        // Then fetch grid data (list of collaterals)
        const rows = await window.LoanCollateralsService.fetchCollaterals(ctx);
        dataRows = rows || [];
        renderRows(dataRows);
        
        // Automatically select and populate the first row if available
        if (dataRows.length > 0) {
          const firstRow = dataRows[0];
          selectedRowId = firstRow.CollateralID || firstRow.collateralId || "";
          
          // Mark first row as selected in the table
          const firstRowElement = rowsBody?.querySelector('[data-row-id]');
          if (firstRowElement) {
            Array.from(rowsBody.querySelectorAll("tr")).forEach((x) => x.classList.remove("is-selected"));
            firstRowElement.classList.add("is-selected");
          }
          
          // Populate form with first row data
          fillForm(firstRow);
          console.log('[loadData] First row auto-selected and populated:', firstRow);
        }
        
        setMode("view");
      } catch (err) {
        console.error("[Loan Collaterals] loadData error", err);
      }
    }


    async function handleWithdraw() {
      if (!selectedRowId) {
        alert("Please select a collateral to withdraw.");
        return;
      }

      const row = dataRows.find((r) => (r.CollateralID || r.collateralId) === selectedRowId);
      if (!row) return;

      // Enable the withdrawn reason field for user input
      const withdrawnReasonField = root.querySelector('#WithdrawnReason');
      if (withdrawnReasonField) {
        withdrawnReasonField.disabled = false;
        withdrawnReasonField.value = ''; // Clear any previous value
        withdrawnReasonField.focus(); // Focus on the field for user input
      }

      // Show a message to prompt user for reason
      alert(`Please enter the reason for withdrawing this collateral.\n\nCollateral ID: ${selectedRowId}`);
      
      // Wait for user to enter reason
      const withdrawnReason = withdrawnReasonField?.value?.trim() || '';

      if (!withdrawnReason) {
        alert("Please enter a reason for withdrawal.");
        if (withdrawnReasonField) {
          withdrawnReasonField.disabled = true;
          withdrawnReasonField.value = '';
        }
        return;
      }

      if (!confirm(`Are you sure you want to withdraw this collateral?\n\nCollateral ID: ${selectedRowId}\nReason: ${withdrawnReason}`)) {
        // User cancelled, disable the field again
        if (withdrawnReasonField) {
          withdrawnReasonField.disabled = true;
          withdrawnReasonField.value = '';
        }
        return;
      }

      try {
        const ctx = getContextFromParent();
        const payload = {
          OurBranchID: ctx.branchId,
          AccountID: ctx.accountId,
          LoanSeries: ctx.loanSeries || 0,
          CollateralID: row.CollateralID || row.collateralId,
          RefNo: row.RefNo || row.referenceNo || 0,
          WithdrawnBy: window.LoanCollateralsService?.getOperatorId?.() || "MARTIN_MARANGA",
          WithdrawnDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
          WithdrawnReason: withdrawnReason,
          SupervisedBy: null
        };

        console.log('[handleWithdraw] Withdrawing collateral with payload:', payload);
        const result = await window.LoanCollateralsService.withdrawCollateral(payload);
        console.log('[handleWithdraw] Withdraw result:', result);

        alert('Collateral withdrawn successfully');

        // Disable the field and reload data
        if (withdrawnReasonField) {
          withdrawnReasonField.disabled = true;
          withdrawnReasonField.value = '';
        }

        // Reload data and return to view mode
        await loadData();
        setMode("view");
      } catch (err) {
        console.error("[Loan Collaterals] withdraw error", err);
        alert("Withdraw failed: " + (err.message || "Unknown error"));
        // Disable the field on error
        if (withdrawnReasonField) {
          withdrawnReasonField.disabled = true;
          withdrawnReasonField.value = '';
        }
      }
    }

    // Calculation logic (legacy CalNetColl)
    function calculateNetCollateralValue() {
      const apportionedValue = parseFloat(parseFormattedValue(root.querySelector('#ApportionedValue')?.value || '0'));
      const margin = parseFloat(parseFormattedValue(root.querySelector('#Margin')?.value || '0'));
      if (isNaN(apportionedValue) || isNaN(margin)) return "";
      const mulVal = (apportionedValue * margin) / 100;
      const calValue = apportionedValue - mulVal;
      const formattedValue = formatCurrency(calValue);
      root.querySelector('#ApportionedCollateralValue').value = calValue === 0 ? "" : formattedValue;
      
      // Calculate Loan Collateral Value = NetCollateralValue * ExchangeRate
      calculateLoanCollateralValue(calValue);
      return calValue;
    }

    // Calculate Loan Collateral Value (NetCollateralValue * ExchangeRate)
    function calculateLoanCollateralValue(netCollateralValue) {
      const exchangeRate = parseFloat(parseFormattedValue(root.querySelector('#ExchangeRate')?.value || '1'));
      if (isNaN(exchangeRate) || exchangeRate === 0) return "";
      
      const loanCollateralValue = netCollateralValue * exchangeRate;
      const formattedValue = formatCurrency(loanCollateralValue);
      root.querySelector('#LoanCollateralValue').value = loanCollateralValue === 0 ? "" : formattedValue;
      return loanCollateralValue;
    }

    // Handle collateral selection (fetch details)
    async function handleCollateralSelected(collateralID) {
      if (!collateralID || mode !== 'add') return;

      try {
        const ctx = getContextFromParent();
        const operatorID = 'MARTIN_MARANGA';

        console.log('[handleCollateralSelected] Fetching details for:', collateralID);
        
        // Call p_GetCollateralDetails
        const response = await window.LoanCollateralsService.fetchCollateralDetails(
          ctx.branchId,
          collateralID,
          4310, // ModuleID for Loan Collaterals
          ctx.accountId,
          operatorID
        );

        console.log('[handleCollateralSelected] Response:', response);

        if (response && response.Details && response.Details.length > 0) {
          const details = response.Details[0];

          // Validate collateral status (must be Active)
          if (details.CollateralStatusID !== 'A') {
            alert('Collateral is not active and cannot be assigned.');
            root.querySelector('#CollateralID').value = '';
            return;
          }

          // Validate collateral value
          if (parseFloat(details.CollateralValue) === 0) {
            alert('Collateral value is zero and cannot be assigned.');
            root.querySelector('#CollateralID').value = '';
            return;
          }

          // Populate fields
          root.querySelector('#Owner').value = details.OwnerClientID || '';
          root.querySelector('#CollateralType').value = details.CollateralTypeName || '';
          root.querySelector('#CollateralName').value = details.Description || details.CollateralName || '';
          root.querySelector('#CollateralValue').value = formatCurrency(details.CollateralValue) || '';
          root.querySelector('#UsedCollateralValue').value = formatCurrency(details.UsedCollateralValue) || '';
          root.querySelector('#Margin').value = formatPercentage(details.TypeMargin) || '';
          root.querySelector('#SanctionAmount').value = formatCurrency(details.SanctionedAmount) || '';
          root.querySelector('#ExchangeRate').value = '1.00'; // Default exchange rate
          root.querySelector('#CurrencyID').value = details.CurrencyID || '';
          root.querySelector('#LoanCurrencyID').value = details.AdvanceCurrencyID || '';
          
          // Initialize Loan Collateral Value and Apportioned Collateral Value as empty
          root.querySelector('#ApportionedCollateralValue').value = '';
          root.querySelector('#LoanCollateralValue').value = '';

          // Set assigned date to working date
          const today = new Date().toISOString().split('T')[0];
          root.querySelector('#AssignedDate').value = today;

          // Enable editable fields
          root.querySelector('#ApportionedRatio').disabled = false;
          root.querySelector('#ApportionedValue').disabled = false;
          root.querySelector('#Margin').disabled = false;

          // Disable CollateralID field after selection
          root.querySelector('#CollateralID').disabled = true;

          // Set focus to first editable field
          root.querySelector('#ApportionedRatio')?.focus();

          console.log('[handleCollateralSelected] Fields populated successfully');

        } else {
          alert('Collateral not found or invalid.');
          root.querySelector('#CollateralID').value = '';
        }
      } catch (error) {
        console.error('[handleCollateralSelected] Error:', error);
        alert('Error fetching collateral details: ' + error.message);
        root.querySelector('#CollateralID').value = '';
      }
    }

    // Ratio blur logic (legacy fnRatioBlur)
    function handleRatioBlur() {
      const apportionedRatio = parseFloat(parseFormattedValue(root.querySelector('#ApportionedRatio')?.value || '0'));
      const collateralValue = parseFloat(parseFormattedValue(root.querySelector('#CollateralValue')?.value || '0'));
      if (apportionedRatio > 100) {
        alert('Apportioned Ratio cannot exceed 100.');
        root.querySelector('#ApportionedRatio').focus();
        return false;
      }
      const apporVal = (apportionedRatio / 100) * collateralValue;
      const formattedValue = formatCurrency(apporVal);
      root.querySelector('#ApportionedValue').value = apporVal === 0 ? "" : formattedValue;
      calculateNetCollateralValue();
    }

    // Wire up calculation/validation events
    root.querySelector('#ApportionedRatio')?.addEventListener('blur', handleRatioBlur);
    root.querySelector('#ApportionedValue')?.addEventListener('blur', calculateNetCollateralValue);
    root.querySelector('#Margin')?.addEventListener('blur', calculateNetCollateralValue);
    
    // ExchangeRate blur - triggers Loan Collateral Value calculation
    root.querySelector('#ExchangeRate')?.addEventListener('blur', function() {
      const netCollateralValue = parseFloat(parseFormattedValue(root.querySelector('#ApportionedCollateralValue')?.value || '0'));
      if (!isNaN(netCollateralValue) && netCollateralValue > 0) {
        calculateLoanCollateralValue(netCollateralValue);
      }
    });

    // Wire up CollateralID field to fetch details when value is entered
    const collateralIDField = root.querySelector('#CollateralID');
    if (collateralIDField) {
      // Trigger on blur
      collateralIDField.addEventListener('blur', async function() {
        const collateralID = this.value.trim();
        if (collateralID) {
          await handleCollateralSelected(collateralID);
        }
      });

      // Trigger on Enter key
      collateralIDField.addEventListener('keydown', async function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          const collateralID = this.value.trim();
          if (collateralID) {
            await handleCollateralSelected(collateralID);
          }
        }
      });
    }

    async function handleSave() {
      const ctx = getContextFromParent();
      const payload = readPayload(ctx);
      if (!validatePayload(payload)) return;
      
      // Ensure calculations are up to date
      calculateNetCollateralValue();
      
      try {
        // Convert all null/undefined values to empty strings
        const cleanPayload = convertNullToEmpty(payload);
        
        console.log('[handleSave] Saving collateral with payload:', cleanPayload);
        const result = await window.LoanCollateralsService.saveCollateral(cleanPayload);
        console.log('[handleSave] Save result:', result);
        
        // Show success message
        alert('Collateral saved successfully');
        
        // Reload data and return to view mode
        await loadData();
        setMode("view");
      } catch (err) {
        console.error("[Loan Collaterals] save error", err);
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
          case "prev":
          case "next":
            alert(`${action === "prev" ? "Previous" : "Next"} not implemented.`);
            break;
          case "withdraw":
            handleWithdraw();
            break;
          case "add":
            setMode("add");
            break;
          case "edit":
            if (!selectedRowId) return;
            const row = dataRows.find((r) => (r.CollateralID || r.collateralId) === selectedRowId);
            originalRow = JSON.parse(JSON.stringify(row)); // Store original for cancel
            fillForm(row);
            setMode("edit");
            break;
          case "delete":
            if (selectedRowId) {
              alert("Collateral ID Cannot Be Deleted. Use Withdraw To Remove");
            }
            break;
          case "save": {
            handleSave();
            break;
          }
          case "cancel":
            if (mode === "view") {
              closeSubwindow();
              return;
            }
            if (mode === "edit" && originalRow) {
              // Restore original form data
              fillForm(originalRow);
              originalRow = null;
            }
            setMode("view");
            if (selectedRowId) {
              const rowSel = dataRows.find((r) => (r.CollateralID || r.collateralId) === selectedRowId);
              fillForm(rowSel);
            } else {
              clearTopForm();
            }
            break;
          case "back":
            closeSubwindow();
            break;
        }
      });
    });

  // Lookup buttons use shared service wiring
  if (window.LoanCollateralsService) {
    window.LoanCollateralsService.initializeLookupButtons();
  }

  // Initialize formatting for currency and percentage fields
  formatCurrencyFields();
  formatPercentageFields();

  // Disable WithdrawnReason field initially - it should only be enabled when Withdraw button is clicked
  const withdrawnReasonField = root.querySelector('#WithdrawnReason');
  if (withdrawnReasonField) {
    withdrawnReasonField.disabled = true;
  }

  ensureEmptyState();
  setMode("view");
  loadData();
})();
