(async () => {
  console.log("[LC-MoreInfo] Script loaded!");
  const SUPPORTED_PAGE = "lc-more-info";

  function toast(message, variant = "info") {
    const el = document.getElementById("lcMoreInfoToast");
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

  async function loadServices() {
    const loader = window.ServiceLoader;
    if (!loader) {
      toast("ServiceLoader not found. Include services/shared/serviceLoader.js.", "danger");
      return;
    }

    try {
      await loader.loadCore();
      await loader.loadLCApplicationService();
      await loader.loadLookupService();
      await loader.loadSearchService();
    } catch (error) {
      console.error(error);
      toast("Failed to load services. Check console for details.", "danger");
    }
  }

  function getOperatorId() {
    try {
      const session = window.AuthService?.getSession?.();
      return session?.operatorId || session?.operatorID || session?.name || "web_portal";
    } catch {
      return "web_portal";
    }
  }

  function setValue(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = value == null ? "" : String(value);
  }

  function bindRecord(record) {
    if (!record || typeof record !== "object") return;
    Object.entries(record).forEach(([key, value]) => {
      const el = document.getElementById(key);
      if (!el) return;
      if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
        el.value = value == null ? "" : String(value);
      }
    });
  }

  async function tryGetLCApplication() {
    const service = window.LCApplicationService;
    if (!service?.getLCApplication) {
      toast("LCApplicationService not loaded.", "danger");
      return;
    }

    const branchId = (document.getElementById("BranchID")?.value || "").trim();
    const applicationId = (document.getElementById("ApplicationID")?.value || "").trim();

    if (!branchId) {
      toast("Branch ID is required.", "warning");
      return;
    }
    if (!applicationId) {
      toast("Application ID is required.", "warning");
      return;
    }

    toast("Loading application...", "info");
    const result = await service.getLCApplication({
      ApplicationID: applicationId,
      OurBranchID: branchId,
      OperatorID: getOperatorId(),
      Direction: 0,
      BankID: ""
    });

    if (!result?.success) {
      toast(result?.message || "Failed to load application.", "danger");
      return;
    }

    const payload = result.data;
    const record = Array.isArray(payload) ? payload[0] : payload;
    bindRecord(record);
    setHasRecord(true);
    setMode("view");
    toast("Application loaded.", "success");
  }

  function pickFirstRow(rows) {
    if (!Array.isArray(rows)) return null;
    return rows.length ? rows[0] : null;
  }

  function bindBranchFromRow(row) {
    if (!row || typeof row !== "object") return false;
    const branchId = row.BranchID ?? row.OurBranchID ?? row.BranchCode ?? row.Code ?? row.ID;
    const branchName = row.BranchName ?? row.BranchDescription ?? row.Description ?? row.Name;
    if (branchId != null) setValue("BranchID", branchId);
    if (branchName != null) setValue("BranchName", branchName);
    return branchId != null || branchName != null;
  }

  async function lookupBranch() {
    const search = window.SearchService;
    if (!search?.search) {
      toast("SearchService not loaded.", "danger");
      return;
    }

    const currentBranch = (document.getElementById("BranchID")?.value || "").trim();
    const term = window.prompt("Search Branch (type at least 2 chars)", currentBranch);
    if (term == null) return;

    const filter = term.trim();
    if (filter.length < 2) {
      toast("Enter at least 2 characters.", "warning");
      return;
    }

    const operatorId = getOperatorId();
    const moduleId = 1000;
    const candidates = ["branchId", "BranchID", "OurBranchID"];

    toast("Searching branches...", "info");
    for (const tableId of candidates) {
      const requestData = {
        TableID: tableId,
        AdvFilterString: "",
        WhereStmt: `${tableId} like '%${filter.replace(/'/g, "''")}%'`,
        PrevOrNext: "1",
        RefID: "",
        OperatorID: operatorId,
        ModuleID: moduleId,
        OurBranchID: currentBranch || ""
      };

      const result = await search.search(requestData);
      if (!result?.success) {
        continue;
      }

      const rows = Array.isArray(result.data) ? result.data : (result.data ? [result.data] : []);
      const row = pickFirstRow(rows);
      if (!row) {
        continue;
      }

      const bound = bindBranchFromRow(row);
      if (!bound) {
        console.warn("Unrecognized branch row shape:", row);
        toast("Branch found but could not bind fields (check console).", "warning");
        return;
      }

      toast("Branch selected.", "success");
      return;
    }

    toast("No branches found (TableID might be different).", "warning");
  }

  function clearFormData() {
    console.log("[LC-MoreInfo] Clearing form data");
    
    // Clear text fields
    const textFields = ['DescriptionOfGoods', 'ShipmentBy', 'ShipmentFrom', 'ShipmentTo', 'ShipmentMarks'];
    textFields.forEach(fieldId => {
      const el = document.getElementById(fieldId);
      if (el) el.value = "";
    });
    
    // Clear dropdowns
    const dropdown = document.getElementById("CountryOfOrigin");
    if (dropdown) dropdown.value = "";
    
    // Clear date fields
    const dateFields = ['ShipmentDate', 'LastShipmentDateAllowed'];
    dateFields.forEach(fieldId => {
      const el = document.getElementById(fieldId);
      if (el) el.value = "";
    });
    
    // Uncheck all checkboxes
    const checkboxes = ['Revocable', 'IRevocable', 'Revolving', 'Confirmed', 'Transferable', 'TransShipment', 'PartialShipment'];
    checkboxes.forEach(fieldId => {
      const el = document.getElementById(fieldId);
      if (el && el.type === 'checkbox') el.checked = false;
    });
    
    // Clear audit fields
    const auditFields = ['CreatedBy', 'CreatedOn', 'ModifiedBy', 'ModifiedOn', 'SupervisedBy', 'SupervisedOn'];
    auditFields.forEach(fieldId => {
      const el = document.getElementById(fieldId);
      if (el) el.value = "";
    });
    
    // Keep BranchID, ApplicationID, and BranchName - don't clear them
  }

  function setEditable(enabled) {
    document.querySelectorAll('[data-editable="true"]').forEach((node) => {
      if (node instanceof HTMLInputElement || node instanceof HTMLSelectElement || node instanceof HTMLTextAreaElement) {
        node.disabled = !enabled;
      }
    });

    // Always keep identifiers readonly in add/edit mode
    const applicationId = document.getElementById("ApplicationID");
    if (applicationId) applicationId.disabled = true;
    const branchId = document.getElementById("BranchID");
    if (branchId) branchId.disabled = true;
    
    // Always keep audit/behind the scenes fields readonly
    const auditFields = ['CreatedBy', 'CreatedOn', 'ModifiedBy', 'ModifiedOn', 'SupervisedBy', 'SupervisedOn'];
    auditFields.forEach(fieldId => {
      const el = document.getElementById(fieldId);
      if (el) el.disabled = true;
    });
  }

  function hasRecord() {
    return document.documentElement.dataset.lcMoreInfoHasRecord === "true";
  }

  function setHasRecord(value) {
    document.documentElement.dataset.lcMoreInfoHasRecord = value ? "true" : "false";
  }

  function setButtons(mode) {
    const buttons = {
      add: document.querySelector('[data-action="add"]'),
      edit: document.querySelector('[data-action="edit"]'),
      del: document.querySelector('[data-action="delete"]'),
      save: document.querySelector('[data-action="save"]'),
      cancel: document.querySelector('[data-action="cancel"]')
    };

    const isEditLike = mode === "add" || mode === "edit";
    const hasRec = hasRecord();
    
    console.log("[LC-MoreInfo] setButtons - mode:", mode, "hasRecord:", hasRec, "isEditLike:", isEditLike);

    // Disable add button when in edit mode OR when data already exists
    if (buttons.add) {
      buttons.add.disabled = isEditLike || hasRec;
      console.log("[LC-MoreInfo] Add button disabled:", buttons.add.disabled);
    }
    if (buttons.save) buttons.save.disabled = !isEditLike;
    if (buttons.cancel) buttons.cancel.disabled = !isEditLike;

    const canEdit = mode === "view" && hasRec;
    if (buttons.edit) buttons.edit.disabled = !canEdit;
    if (buttons.del) buttons.del.disabled = !canEdit;
  }

  function setMode(mode) {
    document.documentElement.dataset.lcMoreInfoMode = mode;
    setEditable(mode === "add" || mode === "edit");
    setButtons(mode);
  }

  function wireLookups() {
    document.querySelectorAll("[data-lookup]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const kind = btn.getAttribute("data-lookup");
        if (!kind) return;

        if (kind === "application") {
          await tryGetLCApplication();
          return;
        }

        if (kind === "branch") {
          await lookupBranch();
          return;
        }

        toast(`Lookup (${kind}) not configured yet.`, "warning");
      });
    });
  }

  async function loadCountries() {
    console.log("[LC-MoreInfo] Loading countries...");
    
    if (!window.tradeFinanceService) {
      console.error("[LC-MoreInfo] tradeFinanceService not available");
      return;
    }

    try {
      const response = await window.tradeFinanceService.getCountries({ CountryID: "" });
      console.log("[LC-MoreInfo] Countries response:", response);

      if (!response || response.IsError || response.ErrorMessage) {
        console.error("[LC-MoreInfo] Error loading countries:", response?.ErrorMessage);
        return;
      }

      // Extract countries from response
      let countries = null;
      
      if (response.data?.Details01 && response.data.Details01.length > 0) {
        countries = response.data.Details01;
      } else if (response.Details01 && response.Details01.length > 0) {
        countries = response.Details01;
      } else if (response.data?.Details && response.data.Details.length > 0) {
        countries = response.data.Details;
      } else if (response.Details && response.Details.length > 0) {
        countries = response.Details;
      } else if (response.data && Array.isArray(response.data)) {
        countries = response.data;
      }

      if (countries && countries.length > 0) {
        console.log("[LC-MoreInfo] Found countries:", countries.length);
        populateCountriesDropdown(countries);
      } else {
        console.warn("[LC-MoreInfo] No countries found in response");
      }
    } catch (error) {
      console.error("[LC-MoreInfo] Error fetching countries:", error);
    }
  }

  function populateCountriesDropdown(countries) {
    const dropdown = document.getElementById("CountryOfOrigin");
    if (!dropdown) {
      console.warn("[LC-MoreInfo] CountryOfOrigin dropdown not found");
      return;
    }

    // Store current value to restore after populating
    const currentValue = dropdown.value;

    // Clear existing options except first (placeholder)
    dropdown.innerHTML = '<option value="">Select Country</option>';

    // Add country options
    countries.forEach(country => {
      const option = document.createElement("option");
      // Try different possible field names for country code/ID
      option.value = country.CountryID || country.CountryCode || country.Code || country.ID || "";
      // Try different possible field names for country name
      option.textContent = country.CountryName || country.Name || country.Description || option.value;
      dropdown.appendChild(option);
    });

    // Restore previous value if it exists
    if (currentValue) {
      dropdown.value = currentValue;
    }

    console.log("[LC-MoreInfo] Populated", countries.length, "countries");
  }

  async function deleteLCMoreInfo(branchId, applicationId) {
    console.log("[LC-MoreInfo] deleteLCMoreInfo called with:", { branchId, applicationId });
    
    const operatorId = window.sessionStorage?.getItem?.("operatorId") || "SYSTEM";

    const requestData = {
      ApplicationID: applicationId,
      OurBranchID: branchId,
      OperatorID: operatorId
    };

    console.log("[LC-MoreInfo] Delete request data:", requestData);

    try {
      toast("Deleting LC More Info...", "info");

      if (!window.tradeFinanceService) {
        console.error("[LC-MoreInfo] tradeFinanceService not available");
        toast("Service not available.", "danger");
        return;
      }

      const response = await window.tradeFinanceService.deleteLCMoreInfo(requestData);
      console.log("[LC-MoreInfo] Delete response:", response);

      if (!response) {
        console.error("[LC-MoreInfo] No response from server");
        toast("No response from server.", "danger");
        return;
      }

      if (response.IsError || response.ErrorMessage) {
        console.error("[LC-MoreInfo] Delete error:", response.ErrorMessage);
        toast(response.ErrorMessage || "Failed to delete LC More Info.", "danger");
        return;
      }

      toast("LC More Info deleted successfully.", "success");
      
      // Clear the form and reset state
      clearFormData();
      setHasRecord(false);
      setMode("view");
    } catch (error) {
      console.error("[LC-MoreInfo] Error deleting LC More Info:", error);
      toast(`Error: ${error.message || "Failed to delete LC More Info."}`, "danger");
    }
  }

  async function saveLCMoreInfo() {
    console.log("[LC-MoreInfo] saveLCMoreInfo called");
    
    const branchId = document.getElementById("BranchID")?.value || "";
    const applicationId = document.getElementById("ApplicationID")?.value || "";
    
    if (!branchId || !applicationId) {
      toast("Branch ID and Application ID are required.", "warning");
      return;
    }

    const operatorId = window.sessionStorage?.getItem?.("operatorId") || "SYSTEM";
    const mode = document.documentElement.dataset.lcMoreInfoMode;
    
    console.log("[LC-MoreInfo] Current mode:", mode);
    console.log("[LC-MoreInfo] OperatorId:", operatorId);
    
    // Get stored UpdateCount for edit operations
    let updateCount = 1;
    if (mode === "edit") {
      const storedUpdateCount = document.documentElement.dataset.lcMoreInfoUpdateCount;
      updateCount = storedUpdateCount ? parseInt(storedUpdateCount, 10) : 1;
      console.log("[LC-MoreInfo] Stored UpdateCount string:", storedUpdateCount);
      console.log("[LC-MoreInfo] Using UpdateCount for edit:", updateCount);
    } else {
      console.log("[LC-MoreInfo] Using UpdateCount for add:", updateCount);
    }
    
    // Helper to get checkbox value as bit (0 or 1)
    const getCheckboxValue = (id) => {
      const el = document.getElementById(id);
      return el && el.checked ? 1 : 0;
    };
    
    // Helper to get input value
    const getValue = (id) => {
      const el = document.getElementById(id);
      return el ? el.value : "";
    };
    
    // Format date for SQL (YYYY-MM-DD or null)
    const formatDateForSQL = (dateValue) => {
      if (!dateValue) return null;
      // Date input already provides YYYY-MM-DD format
      return dateValue;
    };
    
    // Get current date/time for timestamps
    const getCurrentDateTime = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    const requestData = {
      ApplicationID: applicationId,
      OurBranchID: branchId,
      DescriptionOfGoods: getValue("DescriptionOfGoods"),
      Revocable: getCheckboxValue("Revocable"),
      IRevocable: getCheckboxValue("IRevocable"),
      Revolving: getCheckboxValue("Revolving"),
      Confirmed: getCheckboxValue("Confirmed"),
      Transferable: getCheckboxValue("Transferable"),
      TransShipment: getCheckboxValue("TransShipment"),
      PartialShipment: getCheckboxValue("PartialShipment"),
      CountryOfOrigin: getValue("CountryOfOrigin"),
      ShipmentBy: getValue("ShipmentBy"),
      ShipmentFrom: getValue("ShipmentFrom"),
      ShipmentTo: getValue("ShipmentTo"),
      ShipmentMarks: getValue("ShipmentMarks"),
      ShipmentDate: formatDateForSQL(getValue("ShipmentDate")),
      LastdateAllowedforShipment: formatDateForSQL(getValue("LastShipmentDateAllowed")),
      CreatedBy: mode === "add" ? operatorId : getValue("CreatedBy") || operatorId,
      ModifiedBy: mode === "edit" ? operatorId : "",
      SupervisedBy: "",
      UpdateCount: updateCount
    };
    
    console.log("[LC-MoreInfo] Mode check - mode:", mode, "mode === 'edit':", mode === "edit");
    console.log("[LC-MoreInfo] ModifiedBy value:", requestData.ModifiedBy);
    console.log("[LC-MoreInfo] CreatedBy value:", requestData.CreatedBy);
    console.log("[LC-MoreInfo] UpdateCount value:", requestData.UpdateCount);

    console.log("[LC-MoreInfo] Save request data:", requestData);

    try {
      toast("Saving LC More Info...", "info");

      if (!window.tradeFinanceService) {
        console.error("[LC-MoreInfo] tradeFinanceService not available");
        toast("Service not available.", "danger");
        return;
      }

      const response = await window.tradeFinanceService.addEditLCMoreInfo(requestData);
      console.log("[LC-MoreInfo] Save response:", response);

      if (!response) {
        console.error("[LC-MoreInfo] No response from server");
        toast("No response from server.", "danger");
        return;
      }

      if (response.IsError || response.ErrorMessage) {
        console.error("[LC-MoreInfo] Save error:", response.ErrorMessage);
        toast(response.ErrorMessage || "Failed to save LC More Info.", "danger");
        return;
      }

      setHasRecord(true);
      toast("Data Saved Successfully", "success");
      
      // Reload the data to show updated ModifiedBy and ModifiedOn
      if (mode === "edit" && branchId && applicationId) {
        setTimeout(() => {
          fetchLCMoreInfo(branchId, applicationId);
        }, 300);
      } else {
        // For add mode, clear the form but keep BranchID and ApplicationID
        clearFormData();
        setMode("view");
      }
    } catch (error) {
      console.error("[LC-MoreInfo] Error saving LC More Info:", error);
      toast(`Error: ${error.message || "Failed to save LC More Info."}`, "danger");
    }
  }

  function wireActions() {
    const form = document.getElementById("lcMoreInfoForm");

    const addBtn = document.querySelector('[data-action="add"]');
    const editBtn = document.querySelector('[data-action="edit"]');
    const deleteBtn = document.querySelector('[data-action="delete"]');
    const saveBtn = document.querySelector('[data-action="save"]');
    const cancelBtn = document.querySelector('[data-action="cancel"]');
    const backBtn = document.querySelector('[data-action="back"]');

    if (addBtn) {
      addBtn.addEventListener("click", () => {
        form?.classList.remove("was-validated");
        clearFormData();
        toast("Add mode.", "info");
        setMode("add");
      });
    }

    if (editBtn) {
      editBtn.addEventListener("click", () => {
        toast("Edit mode.", "info");
        setMode("edit");
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener("click", async () => {
        const branchId = document.getElementById("BranchID")?.value || "";
        const applicationId = document.getElementById("ApplicationID")?.value || "";
        
        if (!branchId || !applicationId) {
          toast("Branch ID and Application ID are required.", "warning");
          return;
        }
        
        const confirmDelete = window.confirm("Are you sure you want to delete this LC More Info? This action cannot be undone.");
        if (!confirmDelete) {
          return;
        }
        
        await deleteLCMoreInfo(branchId, applicationId);
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener("click", async () => {
        if (!form) return;

        form.classList.add("was-validated");
        if (!form.checkValidity()) {
          toast("Please fill the required fields.", "danger");
          return;
        }

        await saveLCMoreInfo();
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => {
        form?.classList.remove("was-validated");
        toast("Cancelled.", "info");
        setMode("view");
      });
    }

    const close = () => postToParent("tradefinance:close-popout", { popout: "lc-more-info" });

    if (backBtn) backBtn.addEventListener("click", close);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
  }

  async function fetchLCMoreInfo(branchId, applicationId) {
    console.log("[LC-MoreInfo] fetchLCMoreInfo called with:", { branchId, applicationId });
    
    if (!branchId || !applicationId) {
      console.warn("[LC-MoreInfo] Missing branchId or applicationId");
      toast("Branch ID and Application ID are required.", "warning");
      return;
    }

    const operatorId = window.sessionStorage?.getItem?.("operatorId") || "SYSTEM";

    const requestData = {
      ApplicationID: applicationId,
      OurBranchID: branchId,
      OperatorID: operatorId
    };

    console.log("[LC-MoreInfo] Request data:", requestData);

    try {
      toast("Loading more info...", "info");

      if (!window.tradeFinanceService) {
        console.error("[LC-MoreInfo] tradeFinanceService not available");
        toast("Service not available.", "danger");
        return;
      }

      console.log("[LC-MoreInfo] Calling getLCMoreInfo...");
      const response = await window.tradeFinanceService.getLCMoreInfo(requestData);
      console.log("[LC-MoreInfo] API Response:", response);

      if (!response) {
        console.error("[LC-MoreInfo] No response from server");
        toast("No response from server.", "danger");
        return;
      }

      if (response.IsError || response.ErrorMessage) {
        console.error("[LC-MoreInfo] API Error:", response.ErrorMessage);
        toast(response.ErrorMessage || "Failed to fetch more info.", "danger");
        return;
      }

      // Extract data from response
      let moreInfoData = null;
      
      console.log("[LC-MoreInfo] Checking response structure:");
      console.log("[LC-MoreInfo] response.data?.Details:", response.data?.Details);
      console.log("[LC-MoreInfo] response.data?.Details01:", response.data?.Details01);
      console.log("[LC-MoreInfo] response.Details:", response.Details);
      console.log("[LC-MoreInfo] response.Details01:", response.Details01);
      
      // Log the actual content
      if (response.data?.Details?.[0]) {
        console.log("[LC-MoreInfo] response.data.Details[0] (expanded):", JSON.stringify(response.data.Details[0], null, 2));
      }
      if (response.data?.Details01?.[0]) {
        console.log("[LC-MoreInfo] response.data.Details01[0] (expanded):", JSON.stringify(response.data.Details01[0], null, 2));
      }
      
      // Check Details01 first as it typically contains the actual data
      if (response.data?.Details01 && response.data.Details01.length > 0) {
        moreInfoData = response.data.Details01[0];
        console.log("[LC-MoreInfo] Using response.data.Details01");
      } else if (response.Details01 && response.Details01.length > 0) {
        moreInfoData = response.Details01[0];
        console.log("[LC-MoreInfo] Using response.Details01");
      } else if (response.data?.Details && response.data.Details.length > 0) {
        moreInfoData = response.data.Details[0];
        console.log("[LC-MoreInfo] Using response.data.Details");
      } else if (response.Details && response.Details.length > 0) {
        moreInfoData = response.Details[0];
        console.log("[LC-MoreInfo] Using response.Details");
      }

      if (moreInfoData) {
        // Log audit fields specifically
        console.log("[LC-MoreInfo] Audit fields from API:");
        console.log("  CreatedBy:", moreInfoData.CreatedBy);
        console.log("  CreatedOn:", moreInfoData.CreatedOn);
        console.log("  ModifiedBy:", moreInfoData.ModifiedBy);
        console.log("  ModifiedOn:", moreInfoData.ModifiedOn);
        console.log("  SupervisedBy:", moreInfoData.SupervisedBy);
        console.log("  SupervisedOn:", moreInfoData.SupervisedOn);
        
        // Check if this is actually a meaningful record or just an empty placeholder
        const hasActualData = moreInfoData.DescriptionOfGoods || 
                             moreInfoData.CountryOfOrigin || 
                             moreInfoData.ShipmentBy || 
                             moreInfoData.ShipmentFrom || 
                             moreInfoData.ShipmentTo ||
                             moreInfoData.CreatedBy;
        
        if (hasActualData) {
          console.log("[LC-MoreInfo] More info data found, populating:", moreInfoData);
          populateMoreInfo(moreInfoData);
          setHasRecord(true);
          setMode("view");
          toast("More info loaded.", "success");
        } else {
          console.warn("[LC-MoreInfo] Empty record returned, treating as no data");
          setHasRecord(false);
          setMode("view");
          toast("No Details Found!!", "warning");
        }
      } else {
        console.warn("[LC-MoreInfo] No more info data found in response");
        setHasRecord(false);
        setMode("view");
        toast("No Details Found!!", "warning");
      }
    } catch (error) {
      console.error("[LC-MoreInfo] Error fetching more info:", error);
      toast(`Error: ${error.message || "Failed to fetch more info."}`, "danger");
    }
  }

  function populateMoreInfo(data) {
    console.log("[LC-MoreInfo] populateMoreInfo called with:", data);
    
    // Helper function to format datetime to date (YYYY-MM-DD)
    const formatDate = (dateValue) => {
      if (!dateValue) return "";
      try {
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return "";
        // Format as YYYY-MM-DD for HTML date input
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      } catch {
        return "";
      }
    };
    
    // Map all fields from the API response to form fields
    const fieldMapping = {
      'DescriptionOfGoods': data.DescriptionOfGoods,
      'CountryOfOrigin': data.CountryOfOrigin,
      'ShipmentBy': data.ShipmentBy,
      'ShipmentFrom': data.ShipmentFrom,
      'ShipmentTo': data.ShipmentTo,
      'ShipmentMarks': data.ShipmentMarks,
      'ShipmentDate': formatDate(data.ShipmentDate),
      'LastShipmentDateAllowed': formatDate(data.LastdateAllowedforShipment || data.LastShipmentDateAllowed),
      'CreatedBy': data.CreatedBy,
      'CreatedOn': data.CreatedOn,
      'ModifiedBy': data.ModifiedBy,
      'ModifiedOn': data.ModifiedOn,
      'SupervisedBy': data.SupervisedBy,
      'SupervisedOn': data.SupervisedOn
    };
    
    // Store UpdateCount for edit operations
    if (data.UpdateCount !== undefined && data.UpdateCount !== null) {
      document.documentElement.dataset.lcMoreInfoUpdateCount = data.UpdateCount;
      console.log('[LC-MoreInfo] Stored UpdateCount:', data.UpdateCount);
    } else {
      document.documentElement.dataset.lcMoreInfoUpdateCount = '0';
    }

    Object.keys(fieldMapping).forEach(fieldId => {
      const el = document.getElementById(fieldId);
      if (el) {
        const value = fieldMapping[fieldId] !== null && fieldMapping[fieldId] !== undefined ? fieldMapping[fieldId] : "";
        console.log(`[LC-MoreInfo] Setting ${fieldId} to:`, value);
        el.value = value;
      } else {
        console.warn(`[LC-MoreInfo] Element not found: ${fieldId}`);
      }
    });
    
    // Handle checkboxes separately (checked when value is 1)
    const checkboxMapping = {
      'Revocable': data.Revocable,
      'IRevocable': data.IRevocable,
      'Revolving': data.Revolving,
      'Confirmed': data.Confirmed,
      'Transferable': data.Transferable,
      'TransShipment': data.TransShipment,
      'PartialShipment': data.PartialShipment
    };
    
    Object.keys(checkboxMapping).forEach(fieldId => {
      const el = document.getElementById(fieldId);
      if (el && el.type === 'checkbox') {
        const value = checkboxMapping[fieldId];
        el.checked = value === 1 || value === '1' || value === true;
        console.log(`[LC-MoreInfo] Setting checkbox ${fieldId} to:`, el.checked, '(value:', value, ')');
      } else if (el) {
        console.warn(`[LC-MoreInfo] ${fieldId} is not a checkbox`);
      } else {
        console.warn(`[LC-MoreInfo] Checkbox not found: ${fieldId}`);
      }
    });
  }

  function wireParentMessaging() {
    window.addEventListener("message", (event) => {
      const data = event?.data;
      if (!data || typeof data !== "object") return;

      if (data.type === "tradefinance:init-moreinfo") {
        console.log("[LC-MoreInfo] Received init message:", data);
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
        
        // Fetch more info details
        if (branchId && applicationId) {
          console.log("[LC-MoreInfo] Fetching more info for:", { branchId, applicationId });
          fetchLCMoreInfo(branchId, applicationId);
        } else {
          console.log("[LC-MoreInfo] Skipping fetch - missing branchId or applicationId");
        }
      }
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    console.log("[LC-MoreInfo] DOMContentLoaded fired");
    const page = document.body?.dataset?.page;
    console.log("[LC-MoreInfo] Page:", page, "Expected:", SUPPORTED_PAGE);
    if (page !== SUPPORTED_PAGE) return;

    console.log("[LC-MoreInfo] Initializing...");
    await loadServices();
    setHasRecord(false);
    
    // Load countries dropdown
    await loadCountries();
    
    wireLookups();
    wireActions();
    wireParentMessaging();
    setMode("view");
    console.log("[LC-MoreInfo] Initialization complete");

    // Auto-fetch if BranchID and ApplicationID are present
    setTimeout(() => {
      const branchId = document.getElementById("BranchID")?.value;
      const applicationId = document.getElementById("ApplicationID")?.value;
      
      if (branchId && applicationId) {
        console.log("[LC-MoreInfo] Auto-fetching with:", { branchId, applicationId });
        fetchLCMoreInfo(branchId, applicationId);
      }
    }, 500);
  });
})();
