(function (global) {
  if (global.__LoanGuarantorLoaded) {
    console.warn("loan-guarantor.js already loaded; skipping duplicate execution.");
    return;
  }
  global.__LoanGuarantorLoaded = true;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const LoanGuarantorService = global.LoanGuarantorService;

  if (!LoanGuarantorService) {
    console.error("[LoanGuarantor] LoanGuarantorService not loaded");
    return;
  }

  function init() {
    const root = $("[data-lg-root]");
    if (!root) return;

    // ========================
    // DOM Element References
    // ========================
    const actionBtns = {
      view: $("[data-action='view']", root),
      add: $("[data-action='add']", root),
      edit: $("[data-action='edit']", root),
      save: $("[data-action='save']", root),
      cancel: $("[data-action='cancel']", root),
      back: $("[data-action='back']", root)
    };

    const lookupBtns = $$('[data-lookup]', root);
    const rowsBody = $("[data-lg-rows]", root);
    const emptyEl = $("[data-lg-empty]", root);
    const statusEl = $("[data-lmg-status]", root);

    // Form fields
    const fields = {
      guarantorType: $("#GuarantorType", root),
      guarantorID: $("#GuarantorID", root),
      institutionID: $("#InstitutionID", root),
      clientID: $("#ClientID", root),
      guaranteeAmount: $("#GuaranteeAmount", root),
      remarks: $("#Remarks", root),
      // BTS fields
      alreadyGuaranteedAmount: $("#AlreadyGuaranteedAmount", root),
      noOfLoansAlreadyGuaranteed: $("#NoOfLoansAlreadyGuaranteed", root),
      netWorth: $("#NetWorth", root),
      guaranteeSignedBy: $("#GuaranteeSignedBy", root),
      maxGuaranteeAmount: $("#MaxGuaranteeAmount", root),
      maxNoOfLoans: $("#MaxNoOfLoans", root),
      liability: $("#Liability", root),
      // Audit
      createdBy: $("#CreatedBy", root),
      createdOn: $("#CreatedOn", root),
      modifiedBy: $("#ModifiedBy", root),
      modifiedOn: $("#ModifiedOn", root),
      supervisedBy: $("#SupervisedBy", root),
      supervisedOn: $("#SupervisedOn", root)
    };

    // ========================
    // State Management
    // ========================
    const state = {
      mode: 'view', // view | add | edit
      hasRecord: false,
      selectedRowIndex: null,
      currentGuarantorID: null,
      updateCount: 0,
      masterData: null, // Details01 (BTS fields)
      gridData: [], // Details02 (grid rows)
      editOperator: null,
      currentOperator: LoanGuarantorService.getOperatorId()
    };

    // ========================
    // Utility Functions
    // ========================
    function formatCurrency(value) {
      if (value === null || value === undefined || value === "") return "";
      const num = parseFloat(value);
      if (isNaN(num)) return "";
      return num.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }

    function parseCurrency(formatted) {
      if (!formatted) return 0;
      return parseFloat(formatted.toString().replace(/,/g, "")) || 0;
    }

    function formatDate(val) {
      if (!val) return '';
      if (typeof val === 'string' && val.length >= 10) return val.substring(0, 10);
      return val;
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

    function showMessage(msg, color = "Red") {
      if (!statusEl) return;
      statusEl.textContent = msg;
      statusEl.style.color = color === "Red" ? "red" : color === "Green" ? "green" : "orange";
      statusEl.style.display = msg ? "block" : "none";
      console.log(`[LoanGuarantor] ${color}: ${msg}`);
    }

    function clearMessage() {
      showMessage("");
    }

    function populateParentData() {
      try {
        // Get parent context from window.parent
        const parentDoc = global.parent?.document;
        if (!parentDoc) {
          console.warn("[LoanGuarantor] No parent document found");
          return;
        }

        const branchId = parentDoc.querySelector('[data-lm-branch-id]')?.value ||
                         parentDoc.getElementById('BranchID')?.value ||
                         parentDoc.getElementById('OurBranchID')?.value || '';
        const accountId = parentDoc.querySelector('[data-lm-account-id]')?.value ||
                          parentDoc.getElementById('AccountID')?.value || '';
        const loanSeries = parentDoc.querySelector('[data-lm-loan-series]')?.value ||
                           parentDoc.getElementById('LoanSeries')?.value || '0';

        LoanGuarantorService.setDynamicValue('BranchID', branchId);
        LoanGuarantorService.setDynamicValue('AccountID', accountId);
        LoanGuarantorService.setDynamicValue('LoanSeries', loanSeries);

        console.log("[LoanGuarantor] Parent data populated:", {
          branchId, accountId, loanSeries
        });
      } catch (error) {
        console.error("[LoanGuarantor] Error populating parent data:", error);
      }
    }

    function getContextFromParent() {
      const branchId = LoanGuarantorService.getDynamicValue('BranchID');
      const accountId = LoanGuarantorService.getDynamicValue('AccountID');
      const loanSeries = LoanGuarantorService.getDynamicValue('LoanSeries');

      if (!branchId || !accountId) {
        console.error("[LoanGuarantor] Missing required context values");
        return null;
      }

      return {
        moduleID: "4350",
        ourBranchID: branchId,
        accountID: accountId,
        accountSeries: loanSeries || "0",
        operatorID: LoanGuarantorService.getOperatorId()
      };
    }

    // ========================
    // Dropdown Loading
    // ========================
    const loadDropdowns = async () => {
      try {
        console.log("[LoanGuarantor] Loading dropdowns...");

        // Load Guarantor Types (System Code: GuarantorTypeID)
        let guarantorTypes = await LoanGuarantorService.fetchDropdownData('GuarantorType');
        console.log('[LoanGuarantor] GuarantorType response:', guarantorTypes);
        
        if (fields.guarantorType) {
          fields.guarantorType.innerHTML = '<option value="">--Select--</option>';
          if (guarantorTypes && guarantorTypes.length > 0) {
            guarantorTypes.forEach((item) => {
              const option = document.createElement('option');
              option.value = item.value || '';
              option.textContent = item.label || '';
              fields.guarantorType.appendChild(option);
            });
          }
          console.log('[LoanGuarantor] GuarantorType dropdown populated with', fields.guarantorType.options.length - 1, 'options');
        }
      } catch (error) {
        console.error("[LoanGuarantor] Error loading dropdowns:", error);
      }
    };

    function setFieldsEnabled(enabled) {
      const editableFields = [
        fields.guarantorType,
        fields.guarantorID,
        fields.institutionID,
        fields.clientID,
        fields.guaranteeAmount,
        fields.remarks
      ];

      editableFields.forEach((el) => {
        if (el) el.disabled = !enabled;
      });

      // Lookup buttons
      lookupBtns.forEach((btn) => {
        btn.disabled = !enabled;
      });
    }

    function clearForm() {
      if (fields.guarantorType) fields.guarantorType.value = "";
      if (fields.guarantorID) fields.guarantorID.value = "";
      if (fields.institutionID) fields.institutionID.value = "";
      if (fields.clientID) fields.clientID.value = "";
      if (fields.guaranteeAmount) fields.guaranteeAmount.value = "";
      if (fields.remarks) fields.remarks.value = "";

      // Clear BTS fields
      if (fields.alreadyGuaranteedAmount) fields.alreadyGuaranteedAmount.value = "";
      if (fields.noOfLoansAlreadyGuaranteed) fields.noOfLoansAlreadyGuaranteed.value = "";
      if (fields.netWorth) fields.netWorth.value = "";
      if (fields.guaranteeSignedBy) fields.guaranteeSignedBy.value = "";
      if (fields.maxGuaranteeAmount) fields.maxGuaranteeAmount.value = "";
      if (fields.maxNoOfLoans) fields.maxNoOfLoans.value = "";
      if (fields.liability) fields.liability.value = "";

      // Clear audit
      if (fields.createdBy) fields.createdBy.value = "";
      if (fields.createdOn) fields.createdOn.value = "";
      if (fields.modifiedBy) fields.modifiedBy.value = "";
      if (fields.modifiedOn) fields.modifiedOn.value = "";
      if (fields.supervisedBy) fields.supervisedBy.value = "";
      if (fields.supervisedOn) fields.supervisedOn.value = "";

      clearMessage();
    }

    function clearFormExceptGuarantorType() {
      // Keep GuarantorType, clear everything else
      if (fields.guarantorID) fields.guarantorID.value = "";
      if (fields.institutionID) fields.institutionID.value = "";
      if (fields.clientID) fields.clientID.value = "";
      if (fields.guaranteeAmount) fields.guaranteeAmount.value = "";
      if (fields.remarks) fields.remarks.value = "";

      // Clear BTS fields
      if (fields.alreadyGuaranteedAmount) fields.alreadyGuaranteedAmount.value = "";
      if (fields.noOfLoansAlreadyGuaranteed) fields.noOfLoansAlreadyGuaranteed.value = "";
      if (fields.netWorth) fields.netWorth.value = "";
      if (fields.guaranteeSignedBy) fields.guaranteeSignedBy.value = "";
      if (fields.maxGuaranteeAmount) fields.maxGuaranteeAmount.value = "";
      if (fields.maxNoOfLoans) fields.maxNoOfLoans.value = "";
      if (fields.liability) fields.liability.value = "";

      // Clear audit
      if (fields.createdBy) fields.createdBy.value = "";
      if (fields.createdOn) fields.createdOn.value = "";
      if (fields.modifiedBy) fields.modifiedBy.value = "";
      if (fields.modifiedOn) fields.modifiedOn.value = "";
      if (fields.supervisedBy) fields.supervisedBy.value = "";
      if (fields.supervisedOn) fields.supervisedOn.value = "";

      clearMessage();
    }

    function fillForm(rowData) {
      const data = { ...state.masterData, ...rowData };

      if (fields.guarantorType) fields.guarantorType.value = data.GuarantorTypeID || data.GuarantorType || "";
      if (fields.guarantorID) fields.guarantorID.value = data.GuarantorID || "";
      if (fields.institutionID) fields.institutionID.value = data.GuarantorRelevantID || data.GuarantorReleventID || "";
      if (fields.clientID) fields.clientID.value = data.GuarantorName || "";
      if (fields.guaranteeAmount) fields.guaranteeAmount.value = data.GuaranteeAmount ? formatCurrency(data.GuaranteeAmount) : "";
      if (fields.remarks) fields.remarks.value = data.Remarks || "";

      // BTS fields - note the typos in the backend response (Guaranted vs Guaranteed)
      if (fields.alreadyGuaranteedAmount) fields.alreadyGuaranteedAmount.value = data.AlreadyGuarantedAmount !== null && data.AlreadyGuarantedAmount !== undefined ? formatCurrency(data.AlreadyGuarantedAmount) : "";
      if (fields.noOfLoansAlreadyGuaranteed) fields.noOfLoansAlreadyGuaranteed.value = data.NoOfLoansAlreadyGuaranted !== null && data.NoOfLoansAlreadyGuaranted !== undefined ? data.NoOfLoansAlreadyGuaranted : "";
      if (fields.netWorth) fields.netWorth.value = data.NetWorth ? formatCurrency(data.NetWorth) : "";
      if (fields.guaranteeSignedBy) fields.guaranteeSignedBy.value = data.GuaranteeSignedBy || "";
      if (fields.maxGuaranteeAmount) fields.maxGuaranteeAmount.value = data.MaxGuaranteeAmount ? formatCurrency(data.MaxGuaranteeAmount) : "";
      if (fields.maxNoOfLoans) fields.maxNoOfLoans.value = data.MaxNoOfLoans !== null && data.MaxNoOfLoans !== undefined ? data.MaxNoOfLoans : "";
      if (fields.liability) fields.liability.value = data.Liability ? formatCurrency(data.Liability) : "";

      // Audit fields
      if (fields.createdBy) fields.createdBy.value = data.CreatedBy || "";
      if (fields.createdOn) fields.createdOn.value = formatDate(data.CreatedOn);
      if (fields.modifiedBy) fields.modifiedBy.value = data.ModifiedBy || "";
      if (fields.modifiedOn) fields.modifiedOn.value = formatDate(data.ModifiedOn);
      if (fields.supervisedBy) fields.supervisedBy.value = data.SupervisedBy || "";
      if (fields.supervisedOn) fields.supervisedOn.value = formatDate(data.SupervisedOn);

      state.updateCount = data.UpdateCount || 0;
      state.editOperator = data.CreatedBy || null;
    }

    function setMode(nextMode) {
      state.mode = nextMode;

      if (nextMode === 'view') {
        if (actionBtns.view) actionBtns.view.disabled = false;
        if (actionBtns.add) actionBtns.add.disabled = false;
        if (actionBtns.edit) actionBtns.edit.disabled = state.selectedRowIndex === null;
        if (actionBtns.save) actionBtns.save.disabled = true;
        if (actionBtns.cancel) actionBtns.cancel.disabled = true;
        setFieldsEnabled(false);
        if (fields.guarantorType) fields.guarantorType.disabled = false; // Allow selection in view mode
        if (fields.guarantorID) fields.guarantorID.disabled = false; // Allow search in view mode
        lookupBtns.forEach((btn) => {
          if (btn.getAttribute('data-lookup') === 'guarantor') btn.disabled = false;
        });
      }

      if (nextMode === 'add') {
        if (actionBtns.view) actionBtns.view.disabled = true;
        if (actionBtns.add) actionBtns.add.disabled = true;
        if (actionBtns.edit) actionBtns.edit.disabled = true;
        if (actionBtns.save) actionBtns.save.disabled = false;
        if (actionBtns.cancel) actionBtns.cancel.disabled = false;
        clearFormExceptGuarantorType();
        if (fields.guarantorType) fields.guarantorType.disabled = true; // Disable with selected value
        state.masterData = {};
        state.hasRecord = false;
        state.currentGuarantorID = null;
        setFieldsEnabled(true);
        if (fields.guarantorID) fields.guarantorID.focus();
      }

      if (nextMode === 'edit') {
        if (actionBtns.view) actionBtns.view.disabled = true;
        if (actionBtns.add) actionBtns.add.disabled = true;
        if (actionBtns.edit) actionBtns.edit.disabled = true;
        if (actionBtns.save) actionBtns.save.disabled = false;
        if (actionBtns.cancel) actionBtns.cancel.disabled = false;
        setFieldsEnabled(true);
        if (fields.guarantorID) fields.guarantorID.disabled = true; // Cannot change ID in edit mode
        if (fields.guaranteeAmount) fields.guaranteeAmount.focus();
      }
    }

    function renderGrid(rows) {
      if (!rowsBody) return;

      state.gridData = rows || [];
      rowsBody.innerHTML = "";

      if (state.gridData.length === 0) {
        if (emptyEl) emptyEl.removeAttribute("hidden");
        return;
      }

      if (emptyEl) emptyEl.setAttribute("hidden", "");

      state.gridData.forEach((row, idx) => {
        const tr = document.createElement("tr");
        tr.setAttribute("data-row-index", idx.toString());
        if (idx === state.selectedRowIndex) {
          tr.classList.add("is-selected");
        }

        tr.innerHTML = `
          <td class="text-truncate" style="min-width: 100px;">${row.GuarantorID || ""}</td>
          <td class="text-truncate" style="min-width: 150px;">${row.GuarantorName || ""}</td>
          <td class="text-end text-truncate" style="min-width: 120px;">${row.GuaranteeAmount ? formatCurrency(row.GuaranteeAmount) : ""}</td>
        `;

        tr.addEventListener("click", () => {
          state.selectedRowIndex = idx;
          Array.from(rowsBody.querySelectorAll("tr")).forEach((r) =>
            r.classList.remove("is-selected")
          );
          tr.classList.add("is-selected");
          fillForm(state.gridData[idx]);
          state.hasRecord = true;
          state.currentGuarantorID = row.GuarantorID;
          setMode("view");
        });

        rowsBody.appendChild(tr);
      });
    }

    function validateForm() {
      const errors = [];

      if (!fields.guarantorType?.value || fields.guarantorType.value.trim() === "") {
        errors.push("Guarantor Type is required");
      }

      if (!fields.guarantorID?.value || fields.guarantorID.value.trim() === "") {
        errors.push("Guarantor ID is required [No:403005]");
      }

      const guaranteeAmount = parseCurrency(fields.guaranteeAmount?.value);
      if (!guaranteeAmount || guaranteeAmount <= 0) {
        errors.push("Guarantee Amount must be greater than 0 [No:403015]");
      }

      // Check max guarantee amount
      const maxGuaranteeAmount = parseCurrency(fields.maxGuaranteeAmount?.value);
      const alreadyGuaranteedAmount = parseCurrency(fields.alreadyGuaranteedAmount?.value);
      const availableAmount = maxGuaranteeAmount - alreadyGuaranteedAmount;

      if (maxGuaranteeAmount && guaranteeAmount > availableAmount) {
        errors.push(`Guarantee Amount cannot exceed available limit (${formatCurrency(availableAmount)}) [No:403009]`);
      }

      // Check max number of loans (for ADD mode only)
      if (state.mode === 'add') {
        const maxNoOfLoans = parseInt(fields.maxNoOfLoans?.value) || 0;
        const noOfLoansAlreadyGuaranteed = parseInt(fields.noOfLoansAlreadyGuaranteed?.value) || 0;

        if (maxNoOfLoans && noOfLoansAlreadyGuaranteed >= maxNoOfLoans) {
          errors.push(`Maximum number of loans already guaranteed [No:403010]`);
        }
      }

      if (errors.length > 0) {
        alert(errors.join("\n"));
        return false;
      }

      return true;
    }

    async function loadData() {
      const context = getContextFromParent();
      if (!context) {
        console.error("[LoanGuarantor] Cannot get parent context");
        showMessage("Cannot retrieve account context", "Red");
        return;
      }

      try {
        // Fetch both master data and grid data
        const response = await LoanGuarantorService.fetchGuarantors({
          branchId: context.ourBranchID,
          accountId: context.accountID,
          accountSeries: context.accountSeries
        });

        console.log("[LoanGuarantor] Data loaded:", response);

        // Extract master data (Details01) and grid data (Details02)
        if (response.Details01 && response.Details01.length > 0) {
          state.masterData = response.Details01[0];
        }

        const gridRows = response.Details02 || [];
        renderGrid(gridRows);

        // Auto-select first row
        if (gridRows.length > 0) {
          state.selectedRowIndex = 0;
          state.hasRecord = true;
          state.currentGuarantorID = gridRows[0].GuarantorID;
          fillForm(gridRows[0]);
          if (rowsBody) {
            const firstRow = rowsBody.querySelector("tr");
            if (firstRow) firstRow.classList.add("is-selected");
          }
        }

        setMode("view");
        clearMessage();
      } catch (error) {
        console.error("[LoanGuarantor] Load error:", error);
        showMessage("Error loading guarantor data", "Red");
      }
    }

    async function handleView() {
      const guarantorID = fields.guarantorID?.value?.trim();
      if (!guarantorID) {
        showMessage("Please Enter Valid Guarantor ID [No:403005]", "Red");
        fields.guarantorID?.focus();
        return;
      }

      const context = getContextFromParent();
      if (!context) {
        showMessage("Cannot retrieve account context", "Red");
        return;
      }

      try {
        clearMessage();

        // Fetch specific guarantor data
        const response = await LoanGuarantorService.fetchGuarantors({
          branchId: context.ourBranchID,
          accountId: context.accountID,
          accountSeries: context.accountSeries
        });

        // Extract master data and grid data
        if (response.Details01 && response.Details01.length > 0) {
          state.masterData = response.Details01[0];
        }

        const gridRows = response.Details02 || [];

        // Find the specific guarantor
        const guarantorRow = gridRows.find(r => r.GuarantorID === guarantorID);

        if (guarantorRow) {
          state.hasRecord = true;
          state.currentGuarantorID = guarantorID;
          fillForm(guarantorRow);
          renderGrid(gridRows);

          // Select the found row in grid
          const rowIndex = gridRows.findIndex(r => r.GuarantorID === guarantorID);
          if (rowIndex >= 0) {
            state.selectedRowIndex = rowIndex;
            if (rowsBody) {
              const rows = rowsBody.querySelectorAll("tr");
              rows.forEach((r) => r.classList.remove("is-selected"));
              if (rows[rowIndex]) rows[rowIndex].classList.add("is-selected");
            }
          }

          setMode("view");
        } else {
          showMessage(`Guarantor ${guarantorID} not found for this account [No:1305]`, "Red");
          state.hasRecord = false;
        }
      } catch (error) {
        console.error("[LoanGuarantor] View error:", error);
        showMessage("Error fetching guarantor data", "Red");
      }
    }

    async function handleSave() {
      if (!validateForm()) {
        return;
      }

      const context = getContextFromParent();
      if (!context) {
        showMessage("Cannot retrieve account context", "Red");
        return;
      }

      try {
        const payload = {
          OurBranchID: context.ourBranchID,
          AccountID: context.accountID,
          AccountSeries: parseInt(context.accountSeries) || 0,
          GuarantorID: fields.guarantorID?.value?.trim() || '',
          GuaranteeAmount: parseCurrency(fields.guaranteeAmount?.value) || 0,
          Remarks: fields.remarks?.value?.trim() || '',
          CreatedBy: state.mode === 'add' ? context.operatorID : state.editOperator || context.operatorID,
          CreatedOn: state.mode === 'add' ? '' : (state.masterData?.CreatedOn || ''),
          ModifiedBy: state.mode === 'edit' ? context.operatorID : '',
          ModifiedOn: state.mode === 'edit' ? new Date().toISOString() : '',
          SupervisedBy: '',
          NewRecord: state.mode === 'add' ? 1 : state.updateCount
        };

        // Convert all remaining null/undefined values to empty strings
        const cleanPayload = convertNullToEmpty(payload);

        console.log("[LoanGuarantor] Saving guarantor with payload:", cleanPayload);

        const result = await LoanGuarantorService.saveGuarantor(cleanPayload);

        if (result.success) {
          alert("Data Saved Successfully");
          
          // Clear all fields
          clearForm();
          
          // Reload data to show updated grid
          await loadData();
          
          // Reset to view mode
          setMode("view");
          clearMessage();
        } else {
          alert("Save failed: " + (result.error || "Unknown error"));
        }
      } catch (error) {
        console.error("[LoanGuarantor] Save error:", error);
        alert("Error saving guarantor: " + error.message);
      }
    }

    function requestClose() {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ action: 'close-child-form' }, '*');
      }
    }

    // ========================
    // Event Listeners
    // ========================

    actionBtns.view?.addEventListener('click', async () => {
      clearMessage();
      await handleView();
    });

    actionBtns.add?.addEventListener('click', () => {
      clearMessage();
      setMode('add');
    });

    actionBtns.edit?.addEventListener('click', () => {
      clearMessage();
      if (!state.hasRecord || state.selectedRowIndex === null) {
        showMessage('No record selected to edit', 'Red');
        return;
      }

      // Check if current operator can edit
      if (state.editOperator && state.currentOperator && state.editOperator !== state.currentOperator) {
        showMessage(`Record was created by another operator (${state.editOperator}). Cannot edit.`, 'Red');
        return;
      }

      setMode('edit');
    });

    actionBtns.save?.addEventListener('click', async () => {
      clearMessage();
      await handleSave();
    });

    actionBtns.cancel?.addEventListener('click', () => {
      clearMessage();

      if (state.mode === 'add' || state.mode === 'edit') {
        if (!confirm('Cancel changes?')) return;

        if (state.hasRecord && state.selectedRowIndex !== null) {
          fillForm(state.gridData[state.selectedRowIndex]);
        } else {
          clearForm();
        }
        setMode('view');
      }
    });

    actionBtns.back?.addEventListener('click', () => {
      if (state.mode !== 'view') {
        if (!confirm('Exit without saving changes?')) return;
      }
      requestClose();
    });

    // Lookup button handlers
    lookupBtns.forEach((btn) => {
      btn.addEventListener('click', async () => {
        const context = getContextFromParent();
        if (!context) {
          showMessage('Cannot retrieve account context', 'Red');
          return;
        }

        try {
          console.log("[LoanGuarantor] Guarantor search button clicked, mode:", state.mode);
          
          // In ADD mode, include the selected guarantor type in the search filter
          const guarantorType = state.mode === 'add' ? (fields.guarantorType?.value?.trim() || '') : '';
          
          const modal = LoanGuarantorService.displayGuarantorSearchModal({
            branchId: context.ourBranchID,
            accountId: context.accountID,
            accountSeries: context.accountSeries,
            mode: state.mode, // 'view' or 'add'
            guarantorType: guarantorType,
            onSelect: (record) => {
              console.log('[LoanGuarantor] Guarantor selected from search:', record);
              // Populate GuarantorID and trigger View
              if (fields.guarantorID) {
                fields.guarantorID.value = record.GuarantorID || '';
              }
              modal?.close?.();
              clearMessage();
              // Auto-trigger View after selection
              setTimeout(() => {
                handleView();
              }, 300);
            }
          });
        } catch (error) {
          console.error("[LoanGuarantor] Search error:", error);
          showMessage('Search failed: ' + error.message, 'Red');
        }
      });
    });

    // GuarantorID blur event - auto-fetch on blur in ADD mode
    if (fields.guarantorID) {
      fields.guarantorID.addEventListener('blur', async () => {
        const guarantorID = fields.guarantorID.value?.trim();
        if (state.mode === 'add' && guarantorID) {
          await handleView();
        }
      });

      // Enter key triggers view
      fields.guarantorID.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleView();
        }
      });
    }

    // ========================
    // Initialize
    // ========================
    (async () => {
      populateParentData();
      await loadDropdowns();
      await loadData();
    })();
  }

  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof window !== "undefined" ? window : this);
