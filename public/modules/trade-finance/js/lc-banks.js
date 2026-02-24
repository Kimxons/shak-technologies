(() => {
  const SUPPORTED_PAGE = "lc-banks";
  
  // Track removed rows for deletion
  const removedRows = [];

  function toast(message, variant = "info") {
    const el = document.getElementById("lcBanksToast");
    if (!el) return;

    el.classList.remove("alert-info", "alert-success", "alert-danger", "alert-warning", "is-visible");
    el.classList.add(`alert-${variant}`, "is-visible");
    el.textContent = message;

    window.clearTimeout(toast._timer);
    toast._timer = window.setTimeout(() => el.classList.remove("is-visible"), 3500);
  }

  function postToParent(type, payload = {}) {
    try {
      window.parent?.postMessage({ type, ...payload }, "*");
    } catch {
      // ignore
    }
  }

  function setEditable(enabled) {
    document.querySelectorAll('[data-editable="true"]').forEach((node) => {
      if (node instanceof HTMLInputElement || node instanceof HTMLSelectElement || node instanceof HTMLTextAreaElement) {
        node.disabled = !enabled;
      }
    });

    // BranchID and ApplicationID should ALWAYS be disabled (not editable)
    const applicationId = document.getElementById("ApplicationID");
    if (applicationId) applicationId.disabled = true;
    const branchId = document.getElementById("BranchID");
    if (branchId) branchId.disabled = true;
  }

  function hasRecord() {
    return document.documentElement.dataset.lcBanksHasRecord === "true";
  }

  function setHasRecord(value) {
    document.documentElement.dataset.lcBanksHasRecord = value ? "true" : "false";
  }

  function clearFormData() {
    console.log("[LC-Banks] Clearing form data, maintaining BranchID, ApplicationID, and BranchName");
    
    // Store BranchID, ApplicationID, and BranchName
    const branchId = document.getElementById("BranchID")?.value || "";
    const applicationId = document.getElementById("ApplicationID")?.value || "";
    const branchName = document.getElementById("BranchName")?.value || "";
    
    // Clear all input fields
    const form = document.getElementById("lcBanksForm");
    if (form) {
      form.querySelectorAll("input, select, textarea").forEach((field) => {
        if (field.type === "checkbox") {
          field.checked = false;
        } else if (field.id !== "BranchID" && field.id !== "ApplicationID" && field.id !== "BranchName") {
          field.value = "";
        }
      });
    }
    
    // Restore BranchID, ApplicationID, and BranchName
    const branchIdField = document.getElementById("BranchID");
    const applicationIdField = document.getElementById("ApplicationID");
    const branchNameField = document.getElementById("BranchName");
    if (branchIdField) branchIdField.value = branchId;
    if (applicationIdField) applicationIdField.value = applicationId;
    if (branchNameField) branchNameField.value = branchName;
    
    // DON'T clear the table here - table should only be cleared when fetching new data
    // The table clearing is handled in fetchLCBankDetails()
    
    console.log("[LC-Banks] Form cleared");
  }

  function addBankToTable(bankData) {
    const tbody = document.querySelector(".lc-table tbody");
    if (!tbody) return;

    // Remove "No records" message if present
    const noRecordsRow = tbody.querySelector('tr td[colspan]');
    if (noRecordsRow) {
      tbody.innerHTML = "";
    }

    // Map bank type to ID
    const bankTypeMap = {
      'negotiating': 'NB',
      'confirming': 'CB',
      'paying': 'PB',
      'advising': 'AB',
      'reimbursing': 'RB'
    };
    const bankTypeId = bankTypeMap[bankData.BankType] || bankData.BankType;

    // Check if a row with the same BankID and BranchID already exists
    const existingRow = Array.from(tbody.querySelectorAll("tr")).find(row => {
      const cells = row.querySelectorAll("td");
      return cells.length >= 3 && 
             cells[1].textContent === bankData.BankID && 
             cells[2].textContent === bankData.BranchID;
    });

    if (existingRow) {
      // Update existing row
      const cells = existingRow.querySelectorAll("td");
      cells[0].textContent = bankTypeId;
      cells[1].textContent = bankData.BankID;
      cells[2].textContent = bankData.BranchID;
      cells[3].textContent = bankData.Address1;
      cells[4].textContent = bankData.Address2;
      cells[5].textContent = bankData.Phone;
      cells[6].textContent = bankData.Fax;
      
      // Highlight updated row
      tbody.querySelectorAll("tr").forEach(r => r.classList.remove("table-active"));
      existingRow.classList.add("table-active");
      
      return; // Exit early
    }

    // Create new row if not updating
    const row = document.createElement("tr");
    row.dataset.isNew = "true"; // Mark as new record added by user
    row.innerHTML = `
      <td>${bankTypeId}</td>
      <td>${bankData.BankID}</td>
      <td>${bankData.BranchID}</td>
      <td>${bankData.Address1}</td>
      <td>${bankData.Address2}</td>
      <td>${bankData.Phone}</td>
      <td>${bankData.Fax}</td>
    `;

    // Add click handler to select row
    row.addEventListener("click", async function() {
      tbody.querySelectorAll("tr").forEach(r => r.classList.remove("table-active"));
      this.classList.add("table-active");
      
      // Load data back into form (convert ID back to dropdown value)
      const reverseBankTypeMap = {
        'NB': 'negotiating',
        'CB': 'confirming',
        'PB': 'paying',
        'AB': 'advising',
        'RB': 'reimbursing'
      };
      const cells = this.querySelectorAll("td");
      document.getElementById("BankType").value = reverseBankTypeMap[cells[0].textContent] || cells[0].textContent;
      
      const bankIdField = document.getElementById("BankID");
      const bankId = cells[1].textContent;
      bankIdField.value = bankId;
      
      const branchField = document.getElementById("Branch");
      const branchId = cells[2].textContent;
      branchField.value = branchId;
      
      document.getElementById("Address1").value = cells[3].textContent;
      document.getElementById("Address2").value = cells[4].textContent;
      document.getElementById("Phone").value = cells[5].textContent;
      document.getElementById("Fax").value = cells[6].textContent;
      
      // Fetch and populate bank name and branch name
      const bankName = await fetchBankNameById(bankId);
      if (bankName) {
        document.getElementById("BankName").value = bankName;
      }
      
      const branchName = await fetchBranchNameById(branchId);
      if (branchName) {
        document.getElementById("BranchDesc").value = branchName;
      }
    });

    tbody.appendChild(row);
    setHasRecord(true);
  }

  function setMode(mode) {
    document.documentElement.dataset.lcBanksMode = mode;
    
    const addBtn = document.querySelector('[data-action="add"]');
    const editBtn = document.querySelector('[data-action="edit"]');
    const deleteBtn = document.querySelector('[data-action="delete"]');
    const saveBtn = document.querySelector('[data-action="save"]');
    const cancelBtn = document.querySelector('[data-action="cancel"]');
    const backBtn = document.querySelector('[data-action="back"]');
    const newBtn = document.querySelector('[data-action="new"]');
    const alterBtn = document.querySelector('[data-action="alter"]');
    const removeBtn = document.querySelector('[data-action="remove"]');
    const updateBtn = document.querySelector('[data-action="update"]');
    const clearBtn = document.querySelector('[data-action="clear"]');

    // Disable all by default except Back button which is always enabled
    [addBtn, editBtn, deleteBtn, saveBtn, cancelBtn, newBtn, alterBtn, removeBtn, updateBtn, clearBtn].forEach(btn => {
      if (btn) btn.disabled = true;
    });
    if (backBtn) backBtn.disabled = false; // Back button always enabled

    setEditable(false);

    if (mode === "view") {
      // View mode: if records exist, show Edit/Delete; if no records, show Add/Cancel
      if (hasRecord()) {
        if (editBtn) editBtn.disabled = false;
        if (deleteBtn) deleteBtn.disabled = false;
      } else {
        // No records: only Add and Cancel active
        if (addBtn) addBtn.disabled = false;
        if (cancelBtn) cancelBtn.disabled = false;
      }
    } else if (mode === "add") {
      // Add mode: form editable, Clear, Cancel and Update enabled
      setEditable(true);
      if (updateBtn) updateBtn.disabled = false;
      if (clearBtn) clearBtn.disabled = false;
      if (cancelBtn) cancelBtn.disabled = false;
    } else if (mode === "new") {
      // New mode: after clicking New, waiting to update table
      setEditable(true);
      if (newBtn) newBtn.disabled = false;
      if (clearBtn) clearBtn.disabled = false;
    } else if (mode === "edit") {
      // Edit mode: can alter/remove/update selected rows, plus New for adding more
      if (newBtn) newBtn.disabled = false;
      if (alterBtn) alterBtn.disabled = false;
      if (removeBtn) removeBtn.disabled = false;
      if (saveBtn) saveBtn.disabled = false;
      if (cancelBtn) cancelBtn.disabled = false;
      setEditable(true);
    } else if (mode === "alter") {
      // Alter mode: only Update, Cancel, and Clear active
      if (updateBtn) updateBtn.disabled = false;
      if (cancelBtn) cancelBtn.disabled = false;
      if (clearBtn) clearBtn.disabled = false;
      setEditable(true);
    }
  }

  async function fetchLCBankDetails(branchId, applicationId) {
    try {
      console.log("[LC-Banks] Fetching bank details for:", { branchId, applicationId });
      
      // Clear removed rows tracking when fetching fresh data
      removedRows.length = 0;
      
      const operatorId = window.sessionStorage?.getItem?.("operatorId") || "SYSTEM";
      
      const requestData = {
        ApplicationID: applicationId,
        OurBranchID: branchId,
        OperatorID: operatorId
      };

      const response = await window.tradeFinanceService.getLCBankDetails(requestData);
      
      console.log("[LC-Banks] Full Response:", response);
      console.log("[LC-Banks] Response keys:", Object.keys(response || {}));

      // Handle both response formats: {success, code, data} and {ResponseStatus, ResponseData}
      const isSuccess = response?.success === true || response?.ResponseStatus === "000";
      const responseData = response?.data || response?.ResponseData;
      const errorMsg = response?.message || response?.ResponseDescription || "Failed to fetch bank details.";

      console.log("[LC-Banks] isSuccess:", isSuccess);
      console.log("[LC-Banks] responseData:", responseData);
      console.log("[LC-Banks] responseData keys:", Object.keys(responseData || {}));

      if (!response || !isSuccess) {
        toast(errorMsg, "danger");
        console.error("[LC-Banks] Error response:", response);
        return;
      }

      // Parse the response data - check multiple possible locations
      const data = responseData;
      
      // Check for Details01 (actual bank records), Details array, dt_LCBank, or direct array in data
      let bankRecords = data?.Details01 || data?.Details || data?.dt_LCBank || response?.Details;
      
      // If data itself is an array, use it
      if (Array.isArray(data)) {
        bankRecords = data;
      }
      
      console.log("[LC-Banks] bankRecords:", bankRecords);
      console.log("[LC-Banks] bankRecords length:", bankRecords?.length);
      
      if (!bankRecords || bankRecords.length === 0) {
        console.log("[LC-Banks] No bank records found");
        toast("No bank records found for this application.", "info");
        
        // Clear the table and show "No records" message
        const tbody = document.querySelector(".lc-table tbody");
        if (tbody) {
          tbody.innerHTML = '<tr><td colspan="7">No records to display.</td></tr>';
        }
        
        // Clear form data while keeping BranchID and ApplicationID
        clearFormData();
        
        setHasRecord(false);
        setMode("view");
        return;
      }

      // Clear the existing table
      const tbody = document.querySelector(".lc-table tbody");
      console.log("[LC-Banks] tbody element:", tbody);
      console.log("[LC-Banks] tbody exists:", !!tbody);
      if (tbody) {
        tbody.innerHTML = "";
        console.log("[LC-Banks] tbody cleared");
      } else {
        console.error("[LC-Banks] tbody not found!");
      }

      // Populate the table with bank records
      const banks = Array.isArray(bankRecords) ? bankRecords : [bankRecords];
      
      console.log("[LC-Banks] Processing", banks.length, "bank records");
      console.log("[LC-Banks] First bank record:", banks[0]);
      
      banks.forEach((bank, index) => {
        console.log(`[LC-Banks] Bank ${index}:`, bank);
        
        const row = document.createElement("tr");
        row.dataset.isNew = "false"; // Mark as existing record from database
        row.innerHTML = `
          <td>${bank.BankType || ""}</td>
          <td>${bank.BankID || ""}</td>
          <td>${bank.BranchID || ""}</td>
          <td>${bank.Address1 || ""}</td>
          <td>${bank.Address2 || ""}</td>
          <td>${bank.Phone || ""}</td>
          <td>${bank.Fax || ""}</td>
        `;
        
        console.log("[LC-Banks] Created row HTML:", row.innerHTML);
        
        // Add click handler to select row
        row.addEventListener("click", async function() {
          console.log("[LC-Banks] Row clicked!");
          tbody.querySelectorAll("tr").forEach(r => r.classList.remove("table-active"));
          this.classList.add("table-active");
          
          // Load data into form
          const reverseBankTypeMap = {
            'NB': 'negotiating',
            'CB': 'confirming',
            'PB': 'paying',
            'AB': 'advising',
            'RB': 'reimbursing'
          };
          const cells = this.querySelectorAll("td");
          console.log("[LC-Banks] Setting form fields from row...");
          document.getElementById("BankType").value = reverseBankTypeMap[cells[0].textContent] || cells[0].textContent;
          
          const bankIdField = document.getElementById("BankID");
          const bankId = cells[1].textContent;
          bankIdField.value = bankId;
          
          const branchField = document.getElementById("Branch");
          const branchId = cells[2].textContent;
          branchField.value = branchId;
          
          document.getElementById("Address1").value = cells[3].textContent;
          document.getElementById("Address2").value = cells[4].textContent;
          document.getElementById("Phone").value = cells[5].textContent;
          document.getElementById("Fax").value = cells[6].textContent;
          
          console.log("[LC-Banks] Form fields set, fetching names...");
          // Fetch and populate bank name and branch name
          const bankName = await fetchBankNameById(bankId);
          if (bankName) {
            document.getElementById("BankName").value = bankName;
            console.log("[LC-Banks] Bank name set:", bankName);
          }
          
          const branchName = await fetchBranchNameById(branchId);
          if (branchName) {
            document.getElementById("BranchDesc").value = branchName;
            console.log("[LC-Banks] Branch name set:", branchName);
          }
          console.log("[LC-Banks] Row click handler complete");
        });
        
        tbody.appendChild(row);
        console.log("[LC-Banks] Row appended to tbody. Total rows now:", tbody.querySelectorAll("tr").length);
      });

      // Clear form data while keeping BranchID and ApplicationID
      clearFormData();

      // Populate "Behind The Scene" fields if available
      if (banks[0]) {
        const firstRecord = banks[0];
        if (firstRecord.CreatedBy) document.getElementById("CreatedBy").value = firstRecord.CreatedBy;
        if (firstRecord.CreatedOn) document.getElementById("CreatedOn").value = firstRecord.CreatedOn;
        if (firstRecord.ModifiedBy) document.getElementById("ModifiedBy").value = firstRecord.ModifiedBy;
        if (firstRecord.ModifiedOn) document.getElementById("ModifiedOn").value = firstRecord.ModifiedOn;
        if (firstRecord.SupervisedBy) document.getElementById("SupervisedBy").value = firstRecord.SupervisedBy;
        if (firstRecord.SupervisedOn) document.getElementById("SupervisedOn").value = firstRecord.SupervisedOn;
      }

      setHasRecord(true);
      setMode("view");
      toast("Bank details loaded successfully.", "success");
      
      // Debug: Check if rows are still in tbody after everything completes
      setTimeout(() => {
        const tbody = document.querySelector(".lc-table tbody");
        console.log("[LC-Banks] After load complete, tbody rows:", tbody?.querySelectorAll("tr").length);
        console.log("[LC-Banks] tbody HTML:", tbody?.innerHTML);
      }, 100);
      
      console.log("[LC-Banks] Bank details loaded successfully");
    } catch (error) {
      console.error("[LC-Banks] Error fetching bank details:", error);
      toast(`Error: ${error.message || "Failed to fetch bank details."}`, "danger");
    }
  }

  async function fetchBankNameById(bankId) {
    if (!bankId) return null;
    try {
      const operatorId = window.sessionStorage?.getItem?.("operatorId") || "SYSTEM";
      const branchId = document.getElementById("BranchID")?.value || "";
      
      const response = await window.tradeFinanceService.search({
        TableID: "LCBankID",
        AdvFilterString: "",
        WhereStmt: "",
        PrevOrNext: false,
        RefID: "",
        OperatorID: operatorId,
        ModuleID: 9947,
        OurBranchID: branchId,
        SearchKey: bankId,
        LanguageID: "EN"
      });
      
      const results = response.data?.Details || response.Details || response.data?.Details01 || response.Details01 || [];
      const bank = results.find(b => b.BankID === bankId);
      return bank ? (bank.BankName || bank.Name || "") : null;
    } catch (error) {
      console.error("Error fetching bank name:", error);
      return null;
    }
  }

  async function fetchBranchNameById(branchId) {
    if (!branchId) return null;
    try {
      const operatorId = window.sessionStorage?.getItem?.("operatorId") || "SYSTEM";
      const brId = document.getElementById("BranchID")?.value || "";
      const bankId = document.getElementById("BankID")?.value || "";
      
      const response = await window.tradeFinanceService.search({
        TableID: "BankBranchID",
        AdvFilterString: "",
        WhereStmt: "",
        PrevOrNext: false,
        RefID: "",
        OperatorID: operatorId,
        ModuleID: 9947,
        OurBranchID: brId,
        BankID: bankId,
        SearchKey: branchId,
        LanguageID: "EN"
      });
      
      const results = response.data?.Details || response.Details || response.data?.Details01 || response.Details01 || [];
      const branch = results.find(b => b.BranchID === branchId || b.Branch === branchId);
      return branch ? (branch.BranchName || branch.BranchDesc || branch.Description || branch.Name || "") : null;
    } catch (error) {
      console.error("Error fetching branch name:", error);
      return null;
    }
  }

  function wireLookups() {
    document.querySelectorAll("[data-lookup]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const lookupType = btn.getAttribute("data-lookup");
        
        if (lookupType === "bank") {
          await performBankLookup();
        } else if (lookupType === "bankBranch") {
          await performBranchLookup();
        } else {
          toast(`${lookupType} lookup is not wired yet.`, "warning");
        }
      });
    });
  }

  async function performBranchLookup() {
    try {
      const bankIdField = document.getElementById("BankID");
      const bankId = bankIdField?.value || "";
      
      if (!bankId) {
        toast("Please select a bank first.", "warning");
        return;
      }

      toast("Searching branches...", "info");
      
      const operatorId = window.sessionStorage?.getItem?.("operatorId") || "SYSTEM";
      const branchId = document.getElementById("BranchID")?.value || "";
      
      const response = await window.tradeFinanceService.search({
        TableID: "LCBranchID",
        AdvFilterString: `BankID='${bankId}'`,
        WhereStmt: "",
        PrevOrNext: false,
        RefID: "",
        OperatorID: operatorId,
        ModuleID: 9947,
        OurBranchID: branchId,
        SearchKey: "",
        LanguageID: "EN"
      });

      console.log("Branch lookup response:", response);

      if (!response || response.IsError) {
        toast(response?.ErrorMessage || "Failed to fetch branches.", "danger");
        return;
      }

      const results = response.data?.Details || response.Details || response.data?.Details01 || response.Details01 || [];
      
      if (results.length === 0) {
        toast("No branches found for this bank.", "warning");
        return;
      }

      const config = {
        tableId: "LCBranchID",
        displayField: "BranchDesc",
        valueField: "Branch"
      };

      showSearchResults("bankBranch", results, config);
    } catch (error) {
      console.error("Branch lookup error:", error);
      toast(`Error: ${error.message || "Failed to search branches."}`, "danger");
    }
  }

  async function performBankLookup() {
    try {
      toast("Searching banks...", "info");
      
      const operatorId = window.sessionStorage?.getItem?.("operatorId") || "SYSTEM";
      const branchId = document.getElementById("BranchID")?.value || "";
      
      const response = await window.tradeFinanceService.search({
        TableID: "LCBankID",
        AdvFilterString: "",
        WhereStmt: "",
        PrevOrNext: false,
        RefID: "",
        OperatorID: operatorId,
        ModuleID: 9947,
        OurBranchID: branchId,
        SearchKey: "",
        LanguageID: "EN"
      });

      console.log("Bank lookup response:", response);

      if (!response || response.IsError) {
        toast(response?.ErrorMessage || "Failed to fetch banks.", "danger");
        return;
      }

      const results = response.data?.Details || response.Details || response.data?.Details01 || response.Details01 || [];
      
      if (results.length === 0) {
        toast("No banks found.", "warning");
        return;
      }

      const config = {
        tableId: "LCBankID",
        displayField: "BankName",
        valueField: "BankID"
      };

      showSearchResults("bank", results, config);
    } catch (error) {
      console.error("Bank lookup error:", error);
      toast(`Error: ${error.message || "Failed to search banks."}`, "danger");
    }
  }

  function showSearchResults(lookupType, results, config) {
    const modalEl = document.getElementById("searchResultsModal");
    if (!modalEl) {
      toast("Search results modal not found.", "danger");
      return;
    }

    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    const titleEl = document.getElementById("searchResultsTitle");
    const searchFiltersContainer = document.getElementById("searchFiltersContainer");
    const searchButton = document.getElementById("searchButton");

    modalEl._allResults = results;
    modalEl._config = config;
    modalEl._lookupType = lookupType;
    modalEl._currentFilters = {};

    if (titleEl) {
      titleEl.textContent = lookupType.charAt(0).toUpperCase() + lookupType.slice(1);
    }

    generateSearchFilters(lookupType, searchFiltersContainer);
    renderFilteredResults(results, config, lookupType);

    if (searchButton) {
      searchButton.onclick = function() {
        performFilteredSearch(modalEl);
      };
    }

    modal.show();

    modalEl.addEventListener('shown.bs.modal', function() {
      const firstInput = searchFiltersContainer.querySelector('input');
      if (firstInput) firstInput.focus();
    }, { once: true });
  }

  function generateSearchFilters(lookupType, container) {
    if (!container) return;

    const filterConfigs = {
      bank: [
        { label: 'Bank ID', field: 'BankID', type: 'text' },
        { label: 'Bank Name', field: 'BankName', type: 'text' }
      ],
      bankBranch: [
        { label: 'Branch ID', field: 'Branch', type: 'text' },
        { label: 'Description', field: 'BranchDesc', type: 'text' }
      ]
    };

    const operators = ['Like', 'Equal', 'Starts With', 'Ends With', 'Greater Than', 'Less Than'];
    const fields = filterConfigs[lookupType] || [];

    let filtersHtml = '';
    fields.forEach(fieldConfig => {
      filtersHtml += `
        <div class="row mb-2">
          <div class="col-md-3">
            <label class="form-label small mb-1">${fieldConfig.label}</label>
          </div>
          <div class="col-md-3">
            <select class="form-select form-select-sm" data-filter-operator="${fieldConfig.field}">
              ${operators.map(op => `<option value="${op}">${op}</option>`).join('')}
            </select>
          </div>
          <div class="col-md-6">
            <input type="${fieldConfig.type}" class="form-control form-control-sm" 
                   data-filter-field="${fieldConfig.field}" 
                   placeholder="Enter ${fieldConfig.label.toLowerCase()}">
          </div>
        </div>
      `;
    });

    container.innerHTML = filtersHtml;
  }

  function performFilteredSearch(modalEl) {
    const allResults = modalEl._allResults;
    const searchFiltersContainer = document.getElementById("searchFiltersContainer");
    
    if (!allResults || !searchFiltersContainer) return;

    const filters = [];
    const filterInputs = searchFiltersContainer.querySelectorAll('[data-filter-field]');
    
    filterInputs.forEach(input => {
      const field = input.getAttribute('data-filter-field');
      const value = input.value.trim();
      const operatorSelect = searchFiltersContainer.querySelector(`[data-filter-operator="${field}"]`);
      const operator = operatorSelect ? operatorSelect.value : 'Like';
      
      if (value) {
        filters.push({ field, value, operator });
      }
    });

    let filtered = allResults;
    
    if (filters.length > 0) {
      filtered = allResults.filter(result => {
        return filters.every(filter => {
          const fieldValue = result[filter.field];
          if (fieldValue === null || fieldValue === undefined) return false;
          
          const resultStr = String(fieldValue).toLowerCase();
          const filterStr = filter.value.toLowerCase();
          
          switch (filter.operator) {
            case 'Equal':
              return resultStr === filterStr;
            case 'Like':
              return resultStr.includes(filterStr);
            case 'Starts With':
              return resultStr.startsWith(filterStr);
            case 'Ends With':
              return resultStr.endsWith(filterStr);
            case 'Greater Than':
              return parseFloat(resultStr) > parseFloat(filterStr);
            case 'Less Than':
              return parseFloat(resultStr) < parseFloat(filterStr);
            default:
              return resultStr.includes(filterStr);
          }
        });
      });
    }

    renderFilteredResults(filtered, modalEl._config, modalEl._lookupType);
  }

  function renderFilteredResults(results, config, lookupType) {
    const modalEl = document.getElementById("searchResultsModal");
    const headerEl = document.getElementById("searchResultsHeader");
    const bodyEl = document.getElementById("searchResultsBody");
    const emptyEl = document.getElementById("searchResultsEmpty");
    const containerEl = document.getElementById("searchResultsContainer");
    const countLabel = document.getElementById("searchResultsCountLabel");
    const totalResults = modalEl._allResults ? modalEl._allResults.length : results.length;

    if (countLabel) {
      if (modalEl._allResults && results.length < totalResults) {
        countLabel.textContent = `Search Results (${results.length} of ${totalResults})`;
      } else {
        countLabel.textContent = `Search Results (${results.length})`;
      }
    }

    if (results.length === 0) {
      if (containerEl) containerEl.style.display = "none";
      if (emptyEl) emptyEl.style.display = "block";
      return;
    }

    if (containerEl) containerEl.style.display = "block";
    if (emptyEl) emptyEl.style.display = "none";

    const firstResult = results[0];
    const columns = Object.keys(firstResult);
    
    let headerHtml = "<tr>";
    columns.forEach(col => {
      headerHtml += `<th>${col}</th>`;
    });
    headerHtml += "</tr>";
    if (headerEl) headerEl.innerHTML = headerHtml;

    let bodyHtml = "";
    results.forEach((result, index) => {
      bodyHtml += `<tr style="cursor: pointer;" data-select-index="${index}">`;
      columns.forEach(col => {
        const value = result[col] !== null && result[col] !== undefined ? result[col] : "";
        bodyHtml += `<td>${value}</td>`;
      });
      bodyHtml += "</tr>";
    });
    if (bodyEl) bodyEl.innerHTML = bodyHtml;

    modalEl._filteredResults = results;

    bodyEl.querySelectorAll("tr[data-select-index]").forEach(row => {
      row.addEventListener("click", function() {
        bodyEl.querySelectorAll("tr").forEach(r => r.classList.remove("table-active"));
        this.classList.add("table-active");
      });

      row.addEventListener("dblclick", function() {
        const index = parseInt(this.getAttribute("data-select-index"));
        populateLookupFields(lookupType, results[index]);
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        toast("Record selected.", "success");
      });
    });
  }

  function populateLookupFields(lookupType, data) {
    console.log(`[LC-Banks] Populating ${lookupType} fields with data:`, data);
    console.log(`[LC-Banks] Available fields:`, Object.keys(data));

    if (lookupType === "bank") {
      const bankIdField = document.getElementById("BankID");
      const bankNameField = document.getElementById("BankName");
      
      // Try multiple possible field names
      const bankIdValue = data.BankID || data.bankID || data.BankId || "";
      const bankNameValue = data.BankName || data.bankName || data.Name || data.Description || data.ShortName || "";
      
      console.log(`[LC-Banks] Setting BankID to: "${bankIdValue}"`);
      console.log(`[LC-Banks] Setting BankName to: "${bankNameValue}"`);
      console.log(`[LC-Banks] BankID field exists:`, !!bankIdField);
      console.log(`[LC-Banks] BankName field exists:`, !!bankNameField);
      
      if (bankIdField) {
        bankIdField.value = bankIdValue;
        console.log(`[LC-Banks] BankID field value after set:`, bankIdField.value);
      }
      if (bankNameField) {
        bankNameField.value = bankNameValue;
        console.log(`[LC-Banks] BankName field value after set:`, bankNameField.value);
      }
    } else if (lookupType === "bankBranch") {
      const branchField = document.getElementById("Branch");
      const branchDescField = document.getElementById("BranchDesc");
      
      // Try multiple possible field names from API
      const branchValue = data.Branch || data.BranchID || data.BranchCode || data.BranchId || "";
      const branchDescValue = data.BranchDesc || data.BranchName || data.Description || data.Name || "";
      
      console.log(`[LC-Banks] Setting Branch to: "${branchValue}"`);
      console.log(`[LC-Banks] Setting BranchDesc to: "${branchDescValue}"`);
      console.log(`[LC-Banks] Branch field exists:`, !!branchField);
      console.log(`[LC-Banks] BranchDesc field exists:`, !!branchDescField);
      
      if (branchField) {
        branchField.value = branchValue;
        console.log(`[LC-Banks] Branch field value after set:`, branchField.value);
      }
      if (branchDescField) {
        branchDescField.value = branchDescValue;
        console.log(`[LC-Banks] BranchDesc field value after set:`, branchDescField.value);
      }
    }
  }

  function wireSearchModalButtons() {
    const modalEl = document.getElementById("searchResultsModal");
    const okBtn = modalEl?.querySelector('.modal-footer button:nth-child(2)');
    const prevBtn = document.getElementById("prevPageBtn");
    const nextBtn = document.getElementById("nextPageBtn");

    if (okBtn) {
      okBtn.addEventListener("click", () => {
        const bodyEl = document.getElementById("searchResultsBody");
        const selectedRow = bodyEl?.querySelector("tr.table-active");
        
        if (selectedRow) {
          const index = parseInt(selectedRow.getAttribute("data-select-index"));
          const results = modalEl._filteredResults || modalEl._allResults || [];
          const lookupType = modalEl._lookupType;
          
          if (results[index] && lookupType) {
            populateLookupFields(lookupType, results[index]);
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
            toast("Record selected.", "success");
          }
        } else {
          toast("Please select a row first.", "warning");
        }
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        toast("Previous page functionality coming soon.", "info");
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        toast("Next page functionality coming soon.", "info");
      });
    }
  }

  function wireActions() {
    const form = document.getElementById("lcBanksForm");

    const addBtn = document.querySelector('[data-action="add"]');
    const editBtn = document.querySelector('[data-action="edit"]');
    const deleteBtn = document.querySelector('[data-action="delete"]');
    const saveBtn = document.querySelector('[data-action="save"]');
    const cancelBtn = document.querySelector('[data-action="cancel"]');
    const backBtn = document.querySelector('[data-action="back"]');
    const newBtn = document.querySelector('[data-action="new"]');
    const alterBtn = document.querySelector('[data-action="alter"]');
    const removeBtn = document.querySelector('[data-action="remove"]');
    const updateBtn = document.querySelector('[data-action="update"]');
    const clearBtn = document.querySelector('[data-action="clear"]');

    // Add new bank to table
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        form?.classList.remove("was-validated");
        clearFormData();
        toast("Add mode - Enter new bank details.", "info");
        setMode("add");
      });
    }

    // Prepare form for new entry OR add to table if in add mode
    if (newBtn) {
      newBtn.addEventListener("click", () => {
        const mode = document.documentElement.dataset.lcBanksMode;
        
        // If we're in add mode and form has data, add to table
        if (mode === "add") {
          if (!form) return;

          form.classList.add("was-validated");
          if (!form.checkValidity()) {
            toast("Please fill the required fields.", "danger");
            return;
          }

          // Map dropdown value to ID
          const bankTypeMap = {
            'negotiating': 'NB',
            'confirming': 'CB',
            'paying': 'PB',
            'advising': 'AB',
            'reimbursing': 'RB'
          };
          const bankTypeValue = document.getElementById("BankType")?.value || "";
          const bankTypeId = bankTypeMap[bankTypeValue] || bankTypeValue;

          // Collect form data
          const bankData = {
            BankType: bankTypeId,
            BankID: document.getElementById("BankID")?.value || "",
            BranchID: document.getElementById("Branch")?.value || "",
            Address1: document.getElementById("Address1")?.value || "",
            Address2: document.getElementById("Address2")?.value || "",
            Phone: document.getElementById("Phone")?.value || "",
            Fax: document.getElementById("Fax")?.value || ""
          };

          // Add to table
          addBankToTable(bankData);
          
          toast("Bank added to list. Click Save to persist changes.", "success");
          
          // Clear form but keep BranchID and ApplicationID
          form.classList.remove("was-validated");
          const branchId = document.getElementById("BranchID")?.value || "";
          const applicationId = document.getElementById("ApplicationID")?.value || "";
          
          // Clear editable fields only
          document.getElementById("BankType").value = "";
          document.getElementById("BankID").value = "";
          document.getElementById("BankName").value = "";
          document.getElementById("Branch").value = "";
          document.getElementById("BranchDesc").value = "";
          document.getElementById("Address1").value = "";
          document.getElementById("Address2").value = "";
          document.getElementById("Phone").value = "";
          document.getElementById("Fax").value = "";
          
          // Activate Save and Cancel buttons
          if (saveBtn) saveBtn.disabled = false;
          if (cancelBtn) cancelBtn.disabled = false;
          
          setMode("add"); // Stay in add mode
        } else {
          // Otherwise, clear form for new entry (in edit mode, switch to add mode)
          form?.classList.remove("was-validated");
          const branchId = document.getElementById("BranchID")?.value || "";
          const applicationId = document.getElementById("ApplicationID")?.value || "";
          form?.reset();
          const branchIdField = document.getElementById("BranchID");
          const applicationIdField = document.getElementById("ApplicationID");
          if (branchIdField) branchIdField.value = branchId;
          if (applicationIdField) applicationIdField.value = applicationId;
          const tbody = document.querySelector(".lc-table tbody");
          if (tbody) tbody.querySelectorAll("tr").forEach(r => r.classList.remove("table-active"));
          toast("Form cleared, ready for new bank entry.", "info");
          setMode("add"); // Use add mode to enable Update, Cancel, Clear
        }
      });
    }

    // Edit selected row in table
    if (alterBtn) {
      alterBtn.addEventListener("click", async () => {
        const tbody = document.querySelector(".lc-table tbody");
        const selectedRow = tbody?.querySelector("tr.table-active");
        if (!selectedRow) {
          toast("Select a row to alter.", "warning");
          return;
        }
        // Load row data into form
        const cells = selectedRow.querySelectorAll("td");
        
        // Map ID back to dropdown value
        const reverseBankTypeMap = {
          'NB': 'negotiating',
          'CB': 'confirming',
          'PB': 'paying',
          'AB': 'advising',
          'RB': 'reimbursing'
        };
        const bankTypeValue = reverseBankTypeMap[cells[0].textContent] || cells[0].textContent;
        
        document.getElementById("BankType").value = bankTypeValue;
        
        const bankIdField = document.getElementById("BankID");
        const bankId = cells[1].textContent;
        bankIdField.value = bankId;
        
        const branchField = document.getElementById("Branch");
        const branchId = cells[2].textContent;
        branchField.value = branchId;
        
        document.getElementById("Address1").value = cells[3].textContent;
        document.getElementById("Address2").value = cells[4].textContent;
        document.getElementById("Phone").value = cells[5].textContent;
        document.getElementById("Fax").value = cells[6].textContent;
        
        // Fetch and populate bank name and branch name
        const bankName = await fetchBankNameById(bankId);
        if (bankName) {
          document.getElementById("BankName").value = bankName;
        }
        
        const branchName = await fetchBranchNameById(branchId);
        if (branchName) {
          document.getElementById("BranchDesc").value = branchName;
        }
        
        setMode("alter");
        toast("Alter mode - Modify details and click Update.", "info");
      });
    }

    // Remove selected row from table
    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        const tbody = document.querySelector(".lc-table tbody");
        const selectedRow = tbody?.querySelector("tr.table-active");
        if (!selectedRow) {
          toast("Select a row to remove.", "warning");
          return;
        }
        if (!confirm("Are you sure you want to remove this bank record?")) return;
        
        // Get row data before removing
        const cells = selectedRow.querySelectorAll("td");
        if (cells.length >= 7) {
          const rowData = {
            BankType: cells[0].textContent,
            BankID: cells[1].textContent,
            BranchID: cells[2].textContent,
            Address1: cells[3].textContent,
            Address2: cells[4].textContent,
            Phone: cells[5].textContent,
            Fax: cells[6].textContent
          };
          removedRows.push(rowData);
          console.log("[LC-Banks] Row marked for deletion:", rowData);
        }
        
        selectedRow.remove();
        toast("Bank record removed from list. Click Save to persist.", "info");
      });
    }

    // Update selected row in table OR add new bank if in add mode
    if (updateBtn) {
      updateBtn.addEventListener("click", () => {
        const mode = document.documentElement.dataset.lcBanksMode;
        const tbody = document.querySelector(".lc-table tbody");
        
        // Validate form
        if (!form) return;
        form.classList.add("was-validated");
        if (!form.checkValidity()) {
          toast("Please fill the required fields.", "danger");
          return;
        }
        
        // Map dropdown value to ID
        const bankTypeMap = {
          'negotiating': 'NB',
          'confirming': 'CB',
          'paying': 'PB',
          'advising': 'AB',
          'reimbursing': 'RB'
        };
        const bankTypeValue = document.getElementById("BankType")?.value || "";
        const bankTypeId = bankTypeMap[bankTypeValue] || bankTypeValue;
        
        const newBankID = document.getElementById("BankID")?.value || "";
        const newBranchID = document.getElementById("Branch")?.value || "";
        
        // If in "add" mode, add a new bank to the table
        if (mode === "add") {
          // Check if this bank already exists
          const duplicateRow = Array.from(tbody.querySelectorAll("tr")).find(row => {
            const cells = row.querySelectorAll("td");
            if (cells.length < 3) return false; // Skip "no records" row
            return cells[1].textContent === newBankID && cells[2].textContent === newBranchID;
          });
          
          if (duplicateRow) {
            toast("A bank with this BankID and BranchID already exists in the list.", "danger");
            return;
          }
          
          // Collect form data
          const bankData = {
            BankType: bankTypeId,
            BankID: newBankID,
            BranchID: newBranchID,
            Address1: document.getElementById("Address1")?.value || "",
            Address2: document.getElementById("Address2")?.value || "",
            Phone: document.getElementById("Phone")?.value || "",
            Fax: document.getElementById("Fax")?.value || ""
          };
          
          // Add to table
          addBankToTable(bankData);
          
          // Clear validation
          form.classList.remove("was-validated");
          
          // DON'T clear form - keep data so user can continue or save
          // Form will be cleared after Save or when user clicks Clear/Cancel
          
          // Go to edit mode to enable New, Alter, Remove, Save, Cancel
          setMode("edit");
          
          // Enable Save and Cancel buttons
          if (saveBtn) saveBtn.disabled = false;
          if (cancelBtn) cancelBtn.disabled = false;
          
          toast("New bank record added to list. Click Save to persist.", "success");
          return;
        }
        
        // Otherwise, update an existing selected row
        const selectedRow = tbody?.querySelector("tr.table-active");
        if (!selectedRow) {
          toast("Select a row to update.", "warning");
          return;
        }
        
        // Get the current cell values before update to check if it's new or existing
        const cells = selectedRow.querySelectorAll("td");
        const oldBankID = cells[1].textContent;
        const oldBranchID = cells[2].textContent;
        
        // Check if this is a modification to an existing bank or a new one
        const isExistingBank = (oldBankID && oldBranchID && oldBankID !== "" && oldBranchID !== "");
        const isModified = (oldBankID !== newBankID || oldBranchID !== newBranchID);
        
        if (isExistingBank && isModified) {
          // Check if another row already has the new BankID/BranchID combination
          const duplicateRow = Array.from(tbody.querySelectorAll("tr")).find(row => {
            if (row === selectedRow) return false; // Skip the current row
            const rowCells = row.querySelectorAll("td");
            return rowCells[1].textContent === newBankID && rowCells[2].textContent === newBranchID;
          });
          
          if (duplicateRow) {
            toast("A bank with this BankID and BranchID already exists in the list.", "danger");
            return;
          }
        }
        
        // Update row cells with form values
        cells[0].textContent = bankTypeId;
        cells[1].textContent = newBankID;
        cells[2].textContent = newBranchID;
        cells[3].textContent = document.getElementById("Address1")?.value || "";
        cells[4].textContent = document.getElementById("Address2")?.value || "";
        cells[5].textContent = document.getElementById("Phone")?.value || "";
        cells[6].textContent = document.getElementById("Fax")?.value || "";
        
        // Clear validation
        form.classList.remove("was-validated");
        
        // Clear row selection
        tbody.querySelectorAll("tr").forEach(r => r.classList.remove("table-active"));
        
        // Go back to edit mode with New, Alter, Remove, Cancel, Save active
        setMode("edit");
        
        // Enable Save and Cancel buttons
        if (saveBtn) saveBtn.disabled = false;
        if (cancelBtn) cancelBtn.disabled = false;
        
        toast(isExistingBank ? "Bank record updated. Click Save to persist." : "New bank record added. Click Save to persist.", "success");
      });
    }

    // Clear form fields
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        form?.classList.remove("was-validated");
        clearFormData();
        toast("Form cleared.", "info");
      });
    }

    // Edit button (from right sidebar)
    if (editBtn) {
      editBtn.addEventListener("click", () => {
        const tbody = document.querySelector(".lc-table tbody");
        const selectedRow = tbody?.querySelector("tr.table-active");
        if (!selectedRow) {
          toast("Select a bank record to edit.", "warning");
          return;
        }
        setMode("edit");
        toast("Edit mode - You can now Alter, Remove or Update records.", "info");
      });
    }

    // Delete button (from right sidebar)
    if (deleteBtn) {
      deleteBtn.addEventListener("click", async () => {
        const tbody = document.querySelector(".lc-table tbody");
        const selectedRow = tbody?.querySelector("tr.table-active");
        if (!selectedRow) {
          toast("Select a bank record to delete.", "warning");
          return;
        }
        if (!confirm("Are you sure you want to delete this bank record?")) return;
        
        // Get row data before removing
        const cells = selectedRow.querySelectorAll("td");
        if (cells.length >= 7) {
          const rowData = {
            BankType: cells[0].textContent,
            BankID: cells[1].textContent,
            BranchID: cells[2].textContent,
            Address1: cells[3].textContent,
            Address2: cells[4].textContent,
            Phone: cells[5].textContent,
            Fax: cells[6].textContent
          };
          removedRows.push(rowData);
          console.log("[LC-Banks] Row marked for deletion:", rowData);
        }

        selectedRow.remove();

        // Check if table is now empty
        const remainingRows = tbody.querySelectorAll("tr");
        if (remainingRows.length === 0) {
          tbody.innerHTML = '<tr><td colspan="7">No records to display.</td></tr>';
          setHasRecord(false);
        }

        // Enable save to persist the deletion
        if (saveBtn) saveBtn.disabled = false;
        if (cancelBtn) cancelBtn.disabled = false;

        toast("Bank record removed. Click Save to persist.", "success");
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener("click", async () => {
        console.log("[LC-Banks] Save clicked");
        
        const branchId = document.getElementById("BranchID")?.value || "";
        const applicationId = document.getElementById("ApplicationID")?.value || "";
        
        if (!branchId || !applicationId) {
          toast("Branch ID and Application ID are required.", "danger");
          return;
        }

        // Get all bank records from table
        const tbody = document.querySelector(".lc-table tbody");
        if (!tbody) {
          toast("No table found.", "danger");
          return;
        }

        const rows = tbody.querySelectorAll("tr");
        if (rows.length === 0 || rows[0].querySelector('td[colspan]')) {
          toast("No bank records to save.", "warning");
          return;
        }


        // Determine if we are editing or adding (mode)
        const mode = document.documentElement.dataset.lcBanksMode || "view";
        
        // Check if there are any new records (marked with data-is-new="true")
        const hasNewRecords = Array.from(rows).some(row => row.dataset.isNew === "true");
        
        // UpdateCount logic:
        // - If ALL records are new (first time adding): UpdateCount = 1 (uses simple INSERT)
        // - If mixing new and existing records OR if there are removed rows: UpdateCount = 0 (uses complex DELETE/UPDATE/INSERT)
        const allRecordsNew = Array.from(rows).every(row => row.dataset.isNew === "true");
        const hasRemovedRows = removedRows.length > 0;
        const updateCount = (allRecordsNew && !hasRemovedRows) ? 1 : 0;
        
        console.log("[LC-Banks] UpdateCount:", updateCount, "AllNew:", allRecordsNew, "HasRemoved:", hasRemovedRows);

        const operatorId = window.sessionStorage?.getItem?.("operatorId") || "SYSTEM";

        // Build XML for stored procedure (without wrapper)
        let detailRecords = "";
        
        // Add existing/modified rows
        rows.forEach(row => {
          const cells = row.querySelectorAll("td");
          if (cells.length >= 7) {
            // Check if this is a new record or existing record
            const isNewRecord = row.dataset.isNew === "true";
            
            detailRecords += "<dt_LCBank>";
            detailRecords += `<OurBranchID>${branchId}</OurBranchID>`;
            detailRecords += `<ApplicationID>${applicationId}</ApplicationID>`;
            detailRecords += `<Phone>${cells[5].textContent}</Phone>`;
            detailRecords += `<Fax>${cells[6].textContent}</Fax>`;
            detailRecords += `<BankType>${cells[0].textContent}</BankType>`;
            detailRecords += `<BankID>${cells[1].textContent}</BankID>`;
            detailRecords += `<BranchID>${cells[2].textContent}</BranchID>`;
            // Mark as 'N' (new) for new records, 'A' (alter) for existing modified records
            detailRecords += `<ButtonMark>${isNewRecord ? "N" : "A"}</ButtonMark>`;
            detailRecords += `<Address1>${cells[3].textContent}</Address1>`;
            detailRecords += `<Address2>${cells[4].textContent}</Address2>`;
            detailRecords += `<CreatedBy>${operatorId}</CreatedBy>`;
            detailRecords += `<ModifiedBy>${operatorId}</ModifiedBy>`;
            detailRecords += `<UpdateCount>${updateCount}</UpdateCount>`;
            detailRecords += "</dt_LCBank>";
          }
        });
        
        // Add removed rows with ButtonMark='R' so the stored procedure deletes them
        removedRows.forEach(rowData => {
          detailRecords += "<dt_LCBank>";
          detailRecords += `<OurBranchID>${branchId}</OurBranchID>`;
          detailRecords += `<ApplicationID>${applicationId}</ApplicationID>`;
          detailRecords += `<Phone>${rowData.Phone}</Phone>`;
          detailRecords += `<Fax>${rowData.Fax}</Fax>`;
          detailRecords += `<BankType>${rowData.BankType}</BankType>`;
          detailRecords += `<BankID>${rowData.BankID}</BankID>`;
          detailRecords += `<BranchID>${rowData.BranchID}</BranchID>`;
          detailRecords += `<ButtonMark>R</ButtonMark>`;
          detailRecords += `<Address1>${rowData.Address1}</Address1>`;
          detailRecords += `<Address2>${rowData.Address2}</Address2>`;
          detailRecords += `<CreatedBy>${operatorId}</CreatedBy>`;
          detailRecords += `<ModifiedBy>${operatorId}</ModifiedBy>`;
          detailRecords += `<UpdateCount>${updateCount}</UpdateCount>`;
          detailRecords += "</dt_LCBank>";
        });
        
        console.log("[LC-Banks] Built DetailRecords with", rows.length, "rows and", removedRows.length, "removed rows, UpdateCount:", updateCount);
        const now = new Date();
        const formatDateTime = (d) => {
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          const yyyy = d.getFullYear();
          const hh = String(d.getHours()).padStart(2, '0');
          const mi = String(d.getMinutes()).padStart(2, '0');
          const ss = String(d.getSeconds()).padStart(2, '0');
          return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
        };

        // Match exact parameters from old system
        const requestData = {
          ApplicationID: applicationId,
          OurBranchID: branchId,
          DetailRecords: detailRecords,
          CreatedBy: operatorId,
          ModifiedBy: operatorId,
          SupervisedBy: operatorId,
          UpdateCount: updateCount
        };

        // Log the full envelope and XML before sending
        const formId = "dbo.p_AddEditLCBankDetails";
        const envelope = window.CoreApi.makeRequestEnvelope
          ? window.CoreApi.makeRequestEnvelope(formId, requestData, "PROJECT_KAIRO")
          : { RequestID: formId, FormID: formId, FormId: formId, RequestData: requestData, RequestTime: formatDateTime(now), AppName: "PROJECT_KAIRO", Checksum: "" };
        envelope.RequestID = formId;
        envelope.FormID = formId;
        envelope.FormId = formId;
        envelope.RequestTime = formatDateTime(now);
        console.log("[LC-Banks] --- FULL SAVE ENVELOPE ---", JSON.stringify(envelope, null, 2));
        console.log("[LC-Banks] --- DetailRecords XML ---", detailRecords);

        try {
          toast("Saving bank details...", "info");
          
          if (!window.tradeFinanceService) {
            toast("Service not available.", "danger");
            return;
          }

          // When UpdateCount=0, the stored procedure will delete all existing records and re-insert
          // This handles removals automatically - we just send the remaining rows
          const response = await window.tradeFinanceService.addEditLCBankDetails(requestData);
          console.log("Save bank details response:", response);

          if (!response) {
            toast("No response from server.", "danger");
            return;
          }

          if (response.IsError || response.ErrorMessage) {
            toast(response.ErrorMessage || "Failed to save bank details.", "danger");
            return;
          }

          // Check for success
          if (response.code === '00' || response.success === true) {
            toast("Bank details saved successfully.", "success");
            setHasRecord(true);
            setMode("view");
            
            // Clear removed rows tracking
            removedRows.length = 0;
            console.log("[LC-Banks] Removed rows cleared after successful save");
            
            // Clear form data while keeping BranchID and ApplicationID
            clearFormData();
            
            // Re-fetch data to confirm save and refresh table
            const branchId = document.getElementById("BranchID")?.value || "";
            const applicationId = document.getElementById("ApplicationID")?.value || "";
            if (branchId && applicationId) {
              setTimeout(() => {
                fetchLCBankDetails(branchId, applicationId);
              }, 500);
            }
          } else {
            toast(response.message || "Failed to save bank details.", "danger");
          }
        } catch (error) {
          console.error("Save bank details error:", error);
          toast(`Error: ${error.message || "Failed to save bank details."}`, "danger");
        }
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => {
        console.log("[LC-Banks] Cancel clicked");
        form?.classList.remove("was-validated");
        toast("Cancelled.", "info");
        
        // Reload data if we have branchId and applicationId
        const branchId = document.getElementById("BranchID")?.value;
        const applicationId = document.getElementById("ApplicationID")?.value;
        if (branchId && applicationId) {
          fetchLCBankDetails(branchId, applicationId);
        } else {
          setMode("view");
        }
      });
    }

    const close = () => postToParent("tradefinance:close-popout", { popout: "lc-banks" });

    if (backBtn) backBtn.addEventListener("click", close);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
  }

  function wireParentMessaging() {
    window.addEventListener("message", (event) => {
      const data = event?.data;
      if (!data || typeof data !== "object") return;

      if (data.type === "tradefinance:init-banks") {
        console.log("LC Banks received init message:", data);
        const branchId = data.branchId || "";
        const applicationId = data.applicationId || "";
        const branchName = data.branchName || "";
        
        // Populate BranchID, ApplicationID, and BranchName fields
        const branchIdField = document.getElementById("BranchID");
        const applicationIdField = document.getElementById("ApplicationID");
        const branchNameField = document.getElementById("BranchName");
        
        if (branchIdField) branchIdField.value = branchId;
        if (applicationIdField) applicationIdField.value = applicationId;
        if (branchNameField) branchNameField.value = branchName;
        
        // Fetch bank details
        if (branchId && applicationId) {
          console.log("Fetching LC Bank details for:", { branchId, applicationId });
          fetchLCBankDetails(branchId, applicationId);
        } else {
          console.log("Skipping fetch - missing branchId or applicationId");
        }
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const page = document.body?.dataset?.page;
    if (page !== SUPPORTED_PAGE) return;

    setHasRecord(false);
    wireLookups();
    wireActions();
    wireSearchModalButtons();
    wireParentMessaging();
    setMode("view");

    // Auto-fetch bank details if BranchID and ApplicationID are present
    setTimeout(() => {
      const branchId = document.getElementById("BranchID")?.value;
      const applicationId = document.getElementById("ApplicationID")?.value;
      
      if (branchId && applicationId) {
        fetchLCBankDetails(branchId, applicationId);
      }
    }, 500);
  });
})();
