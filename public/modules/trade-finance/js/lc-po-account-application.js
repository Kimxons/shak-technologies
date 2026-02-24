(() => {
  const SUPPORTED_PAGE = "lcpo-account-application";
  // Lightweight debug logger (disable by default)
  const DEBUG = false;
  const dlog = (...args) => { if (DEBUG) try { console.log(...args); } catch { /* noop */ } };
  const dwarn = (...args) => { if (DEBUG) try { console.warn(...args); } catch { /* noop */ } };

  function openPopout(popout) {
    const mapping = {
      "lc-banks": "lcBanksPopout",
      "lc-more-info": "lcMoreInfoPopout"
    };

    const modalId = mapping[popout];
    if (!modalId) return;

    const modalEl = document.getElementById(modalId);
    if (!modalEl) {
      toast("Popout window is missing on the page.", "danger");
      return;
    }

    // Pass data to lc-banks popout
    if (popout === "lc-banks") {
      const branchId = document.getElementById("branchId")?.value || "";
      const applicationId = document.getElementById("applicationId")?.value || "";

      dlog("[LC-PO] Opening LC Banks with:", { branchId, applicationId });

      const iframe = modalEl.querySelector("iframe");
      if (iframe && iframe.contentWindow) {
        // Send data to iframe when it loads
        const sendData = () => {
          // Add a small delay to ensure iframe JS is ready
          setTimeout(() => {
            const branchName = document.getElementById("branchName")?.value || "";
            dlog("[LC-PO] Sending init message to LC Banks:", { branchId, applicationId, branchName });
            iframe.contentWindow.postMessage({
              type: "tradefinance:init-banks",
              branchId: branchId,
              applicationId: applicationId,
              branchName: branchName
            }, "*");
          }, 100);
        };

        // If iframe is already loaded, send immediately
        if (iframe.contentDocument?.readyState === "complete") {
          dlog("[LC-PO] Iframe already loaded, sending data");
          sendData();
        } else {
          // Otherwise wait for load
          dlog("[LC-PO] Waiting for iframe to load");
          iframe.addEventListener("load", sendData, { once: true });
        }
      }
    }

    // Pass data to lc-more-info popout
    if (popout === "lc-more-info") {
      const branchId = document.getElementById("branchId")?.value || "";
      const applicationId = document.getElementById("applicationId")?.value || "";

      dlog("[LC-PO] Opening LC More Info with:", { branchId, applicationId });

      const iframe = modalEl.querySelector("iframe");
      if (iframe && iframe.contentWindow) {
        // Send data to iframe when it loads
        const sendData = () => {
          // Add a small delay to ensure iframe JS is ready
          setTimeout(() => {
            const branchName = document.getElementById("branchName")?.value || "";
            dlog("[LC-PO] Sending init message to LC More Info:", { branchId, applicationId, branchName });
            iframe.contentWindow.postMessage({
              type: "tradefinance:init-moreinfo",
              branchId: branchId,
              applicationId: applicationId,
              branchName: branchName
            }, "*");
          }, 100);
        };

        // If iframe is already loaded, send immediately
        if (iframe.contentDocument?.readyState === "complete") {
          dlog("[LC-PO] Iframe already loaded, sending data");
          sendData();
        } else {
          // Otherwise wait for load
          dlog("[LC-PO] Waiting for iframe to load");
          iframe.addEventListener("load", sendData, { once: true });
        }
      }
    }

    const modal = bootstrap.Modal.getOrCreateInstance(modalEl, {
      backdrop: "static",
      keyboard: true,
      focus: true
    });

    // Also send data when modal is shown (as a backup)
    if (popout === "lc-banks") {
      modalEl.addEventListener('shown.bs.modal', function () {
        const branchId = document.getElementById("branchId")?.value || "";
        const applicationId = document.getElementById("applicationId")?.value || "";
        const branchName = document.getElementById("branchName")?.value || "";
        const iframe = modalEl.querySelector("iframe");

        if (iframe && iframe.contentWindow && (branchId || applicationId)) {
          dlog("Sending LC Banks data on modal shown:", { branchId, applicationId, branchName });
          iframe.contentWindow.postMessage({
            type: "tradefinance:init-banks",
            branchId: branchId,
            applicationId: applicationId,
            branchName: branchName
          }, "*");
        }
      }, { once: true });
    }

    // Also send data when modal is shown (as a backup) for more info
    if (popout === "lc-more-info") {
      modalEl.addEventListener('shown.bs.modal', function () {
        const branchId = document.getElementById("branchId")?.value || "";
        const applicationId = document.getElementById("applicationId")?.value || "";
        const branchName = document.getElementById("branchName")?.value || "";
        const iframe = modalEl.querySelector("iframe");

        if (iframe && iframe.contentWindow && (branchId || applicationId)) {
          dlog("Sending LC More Info data on modal shown:", { branchId, applicationId, branchName });
          iframe.contentWindow.postMessage({
            type: "tradefinance:init-moreinfo",
            branchId: branchId,
            applicationId: applicationId,
            branchName: branchName
          }, "*");
        }
      }, { once: true });
    }

    modal.show();
  }

  function closePopout(popout) {
    const mapping = {
      "lc-banks": "lcBanksPopout",
      "lc-more-info": "lcMoreInfoPopout"
    };

    const modalId = mapping[popout];
    if (!modalId) return;
    const modalEl = document.getElementById(modalId);
    if (!modalEl) return;

    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
  }

  function getToastEl() {
    return document.getElementById("lcpoToast");
  }

  function toast(message, variant = "info") {
    const el = getToastEl();
    if (!el) return;

    el.classList.remove("d-none", "alert-info", "alert-success", "alert-danger", "alert-warning");
    el.classList.add(`alert-${variant}`);
    el.textContent = message;

    window.clearTimeout(toast._timer);
    toast._timer = window.setTimeout(() => {
      el.classList.add("d-none");
    }, 3500);
  }

  function setEditable(enabled) {
    const editable = document.querySelectorAll('[data-editable="true"]');
    editable.forEach((node) => {
      if (node.tagName === "SELECT" || node.tagName === "INPUT" || node.tagName === "TEXTAREA") {
        node.disabled = !enabled;
      }
    });

    // Keep application ID and account ID disabled in add mode since they're auto-generated.
    // In view mode, applicationId should be enabled for search/locate flows.
    const applicationId = document.getElementById("applicationId");
    const accountId = document.getElementById("accountId");
    const currentMode = document.documentElement.dataset.lcpoMode;

    if (applicationId) {
      applicationId.disabled = (currentMode === "add");
    }

    if (accountId && currentMode === "add") {
      accountId.disabled = true;
    }
  }

  function setButtons(mode) {
    const buttons = {
      view: document.querySelector('[data-lcpo-action="view"]'),
      add: document.querySelector('[data-lcpo-action="add"]'),
      edit: document.querySelector('[data-lcpo-action="edit"]'),
      del: document.querySelector('[data-lcpo-action="delete"]'),
      save: document.querySelector('[data-lcpo-action="save"]'),
      cancel: document.querySelector('[data-lcpo-action="cancel"]')
    };

    // Initial state: Only Add and View are active
    if (buttons.view) buttons.view.disabled = false;
    if (buttons.add) buttons.add.disabled = false;
    if (buttons.edit) buttons.edit.disabled = true;
    if (buttons.del) buttons.del.disabled = true;
    if (buttons.save) buttons.save.disabled = true;
    if (buttons.cancel) buttons.cancel.disabled = true;

    if (mode === "add") {
      // Add mode: Only Save and Cancel active
      if (buttons.view) buttons.view.disabled = true;
      if (buttons.add) buttons.add.disabled = true;
      if (buttons.save) buttons.save.disabled = false;
      if (buttons.cancel) buttons.cancel.disabled = false;
    } else if (mode === "edit") {
      // Edit mode: Only Edit and Cancel active (based on view with data)
      if (buttons.view) buttons.view.disabled = true;
      if (buttons.add) buttons.add.disabled = true;
      if (buttons.edit) buttons.edit.disabled = false;
      if (buttons.save) buttons.save.disabled = false;
      if (buttons.cancel) buttons.cancel.disabled = false;
    } else if (mode === "view-with-data") {
      // After loading data from View: Only Edit and Cancel active
      if (buttons.view) buttons.view.disabled = true;
      if (buttons.add) buttons.add.disabled = true;
      if (buttons.edit) buttons.edit.disabled = false;
      if (buttons.del) buttons.del.disabled = true;
      if (buttons.cancel) buttons.cancel.disabled = false;
    }
  }

  function setMode(mode) {
    document.documentElement.dataset.lcpoMode = mode;
    setEditable(mode === "add" || mode === "edit");
    setButtons(mode);
  }

  function formatDate(dateString) {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    } catch {
      return "";
    }
  }

  function formatDateTime(dateString) {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      const hh = String(date.getHours()).padStart(2, "0");
      const mi = String(date.getMinutes()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
    } catch {
      return "";
    }
  }

  function populateForm(data) {
    if (!data) return;

    // Populate main fields - map API response to form fields
    const fieldMap = {
      branchId: data.OurBranchID || "",
      branchName: data.OurBranchName || "",
      applicationId: data.ApplicationID || "",
      applicationDate: formatDate(data.ApplicationDate || data.IssueDate || data.CreatedOn),
      clientId: data.ClientID || "",
      clientName: data.ClientName || "",
      productId: data.ProductID || "",
      productName: data.ProductName || "",
      accountId: data.AccountID || "",
      accountName: data.AccountName || "",
      purposeId: data.PurposeID || data.AgreementTypeID || "",
      referenceNo: data.ReferenceNumber || data.LCNumber || "",
      remarks: data.Remarks || data.AdditionalConditions || "",
      applicationStatus: data.LCApplnStatusID || "",
      // Behind-the-scenes fields
      rejectionReason: data.RejectionReason || "",
      createdBy: data.CreatedBy || "",
      modifiedBy: data.ModifiedBy || "",
      supervisedBy: data.SupervisedBy || "",
      createdOn: formatDate(data.CreatedOn),
      modifiedOn: formatDate(data.ModifiedOn),
      supervisedOn: formatDate(data.SupervisedOn)
    };

    Object.keys(fieldMap).forEach((fieldId) => {
      const el = document.getElementById(fieldId);
      if (el) {
        el.value = fieldMap[fieldId];
      }
    });

    // Populate the applicationName display (show client name next to Application ID)
    try {
      const appNameEl = document.getElementById('applicationName');
      if (appNameEl) {
        appNameEl.value = fieldMap.clientName || '';
      }
    } catch (e) {
      // ignore
    }

    // If ProductName is missing but ProductID exists, fetch product details
    if (data.ProductID && !data.ProductName) {
      fetchProductName(data.ProductID);
    }

    // If AccountName is missing but AccountID exists, use ClientName as fallback
    if (data.AccountID && !data.AccountName && data.ClientName) {
      const accountNameField = document.getElementById("accountName");
      if (accountNameField) {
        accountNameField.value = data.ClientName;
      }
    }
  }

  async function fetchProductName(productId) {
    try {
      const response = await window.tradeFinanceService.search({
        TableID: "ProductID",
        AdvFilterString: `ProductID='${productId}'`,
        WhereStmt: "",
        PrevOrNext: "1",
        RefID: "",
        OperatorID: window.sessionStorage?.getItem?.("operatorId") || "web_portal",
        ModuleID: 1821,
        OurBranchID: document.getElementById("branchId")?.value || "002",
        SearchKey: "",
        LanguageID: "en"
      });

      let productData = null;
      if (response?.data?.Details && response.data.Details.length > 0) {
        productData = response.data.Details[0];
      } else if (response?.Details && response.Details.length > 0) {
        productData = response.Details[0];
      }

      if (productData && productData.Description) {
        const productNameField = document.getElementById("productName");
        if (productNameField) {
          productNameField.value = productData.Description;
        }
      }
    } catch (error) {
      console.error("[LC-PO] Error fetching product name:", error);
    }

    // Populate Behind The Scene fields
    const btsMap = {
      rejectedBy: data.RejectedBy || "",
      rejectedOn: formatDateTime(data.RejectedOn),
      rejectionReason: data.RejectReason || "",
      createdBy: data.CreatedBy || "",
      modifiedBy: data.ModifiedBy || "",
      supervisedBy: data.SupervisedBy || "",
      createdOn: formatDateTime(data.CreatedOn),
      modifiedOn: formatDateTime(data.ModifiedOn),
      supervisedOn: formatDateTime(data.SupervisedOn)
    };

    Object.keys(btsMap).forEach((fieldId) => {
      const el = document.getElementById(fieldId);
      if (el) {
        el.value = btsMap[fieldId];
      }
    });
  }

  async function fetchLCApplication() {
    const branchId = (document.getElementById("branchId")?.value || "").trim();
    const applicationId = (document.getElementById("applicationId")?.value || "").trim();

    if (!branchId) {
      toast("Branch ID is required to view application.", "danger");
      return;
    }

    if (!applicationId) {
      toast("Application ID is required to view application.", "danger");
      return;
    }

    // Get OperatorID from session or use a default
    const operatorId = window.sessionStorage?.getItem?.("operatorId") || "SYSTEM";

    const requestData = {
      ApplicationID: applicationId,
      OurBranchID: branchId,
      OperatorID: operatorId,
      Direction: 0,
      BankID: ""
    };

    try {
      toast("Fetching application data...", "info");

      if (!window.tradeFinanceService) {
        toast("Service not available. Please check configuration.", "danger");
        return;
      }

      const response = await window.tradeFinanceService.getLCApplication(requestData);
      dlog("LC Application Response:", response);

      if (!response) {
        toast("No response from server.", "danger");
        return;
      }

      // Check for error response
      if (response.IsError || response.ErrorMessage) {
        toast(response.ErrorMessage || "Failed to fetch application.", "danger");
        return;
      }

      // Handle successful response - data is in Details01[0]
      let applicationData = null;

      if (response.data?.Details01 && response.data.Details01.length > 0) {
        applicationData = response.data.Details01[0];
      } else if (response.Details01 && response.Details01.length > 0) {
        applicationData = response.Details01[0];
      }

      if (applicationData) {
        dlog("Application data fields:", Object.keys(applicationData));
        dlog("Application data:", applicationData);
        populateForm(applicationData);
        // Ensure ApplicationID field is always set after fetch
        const appIdField = document.getElementById("applicationId");
        if (appIdField && !appIdField.value) {
          appIdField.value = applicationId;
        }
        toast("Application loaded successfully.", "success");
        setMode("view-with-data");
      } else {
        toast("No application data found.", "warning");
      }
    } catch (error) {
      console.error("Error fetching LC Application:", error);
      toast(`Error: ${error.message || "Failed to fetch application."}`, "danger");
    }
  }

  async function saveLCApplication() {
    dlog("[LC-PO] saveLCApplication called");

    const form = document.getElementById("lcpo-form");
    if (!form) {
      toast("Form not found.", "danger");
      return;
    }

    const operatorId = window.sessionStorage?.getItem?.("operatorId") || "SYSTEM";
    const currentMode = document.documentElement.dataset.lcpoMode || "view";

    // Get form values
    const branchId = document.getElementById("branchId")?.value?.trim() || "";
    const applicationId = document.getElementById("applicationId")?.value?.trim() || "";
    const applicationDate = document.getElementById("applicationDate")?.value || "";
    const accountId = document.getElementById("accountId")?.value?.trim() || "";
    const clientId = document.getElementById("clientId")?.value?.trim() || "";
    const productId = document.getElementById("productId")?.value?.trim() || "";
    const purposeId = document.getElementById("purposeId")?.value?.trim() || "";
    const referenceNo = document.getElementById("referenceNo")?.value?.trim() || "";
    const remarks = document.getElementById("remarks")?.value?.trim() || "";

    // Get behind-the-scenes fields
    const createdBy = document.getElementById("createdBy")?.value || operatorId;
    const createdOn = document.getElementById("createdOn")?.value || "";
    const modifiedBy = document.getElementById("modifiedBy")?.value || "";
    const modifiedOn = document.getElementById("modifiedOn")?.value || "";

    // Format dates for API (MM/DD/YYYY HH:mm:ss)
    const formatApiDateTime = (dateStr) => {
      if (!dateStr) return "";
      try {
        const date = new Date(dateStr);
        const pad2 = (n) => String(n).padStart(2, "0");
        const mm = pad2(date.getMonth() + 1);
        const dd = pad2(date.getDate());
        const yyyy = date.getFullYear();
        const hh = pad2(date.getHours());
        const mi = pad2(date.getMinutes());
        const ss = pad2(date.getSeconds());
        return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
      } catch {
        return "";
      }
    };

    const requestData = {
      OurBranchID: branchId,
      ApplicationID: applicationId || "",
      ApplicationDate: formatApiDateTime(applicationDate || new Date()),
      AccountID: accountId,
      ClientID: clientId,
      ProductID: productId,
      PurposeID: purposeId,
      ReferenceNumber: referenceNo,
      LimitAmount: "0",
      ExpiryDate: "",
      Remarks: remarks,
      ApplStatusID: "P",
      ExchangeRate: "1",
      LocalAmount: "0",
      CreatedBy: currentMode === "add" ? operatorId : createdBy,
      CreatedOn: currentMode === "add" ? formatApiDateTime(new Date()) : createdOn,
      ModifiedBy: currentMode === "edit" ? operatorId : "",
      ModifiedOn: currentMode === "edit" ? formatApiDateTime(new Date()) : "",
      SupervisedBy: "",
      SupervisedOn: "",
      UpdateCount: "1",
      SerialID: "0",
      NextKeyID: ""
    };

    dlog("[LC-PO] Current Mode:", currentMode);
    dlog("[LC-PO] Request data:", requestData);

    try {
      toast("Saving application...", "info");

      if (!window.tradeFinanceService) {
        console.error("[LC-PO] tradeFinanceService not available");
        toast("Service not available.", "danger");
        return;
      }

      dlog("[LC-PO] Calling addEditLCApplication...");
      const response = await window.tradeFinanceService.addEditLCApplication(requestData);
      dlog("[LC-PO] API Response:", response);
      dlog("[LC-PO] Response Details:", response?.Details);
      dlog("[LC-PO] Response Data:", response?.data);

      if (!response) {
        console.error("[LC-PO] No response from server");
        toast("No response from server.", "danger");
        return;
      }

      // Check Details object for backend status (legacy format)
      if (response.Details?.Status && response.Details.Status !== '00' && response.Details.Status !== '000') {
        const errorMsg = response.Details.Message || "Failed to save application.";
        console.error("[LC-PO] Backend Error Status:", response.Details.Status, errorMsg);
        toast(`Error (${response.Details.Status}): ${errorMsg}`, "danger");
        return;
      }

      // Check for error responses
      if (response.success === false && response.code !== '00') {
        // If success is false but we have Details with Status 00, it's actually success
        if (response.Details?.Status === '00' || response.Details?.Status === '000') {
          // Continue to success handling
        } else {
          const errorMsg = response.message || response.ErrorMessage || response.data?.Message || "Failed to save application.";
          console.error("[LC-PO] API Error:", errorMsg, response);
          toast(errorMsg, "danger");
          return;
        }
      }

      // Check for backend status codes in data
      if (response.data?.Status && response.data.Status !== '00' && response.data.Status !== '000') {
        const errorMsg = response.data.Message || "Failed to save application.";
        console.error("[LC-PO] Backend Error Status:", response.data.Status, errorMsg);
        toast(`Error (${response.data.Status}): ${errorMsg}`, "danger");
        return;
      }

      // Extract the generated ApplicationID from response
      let generatedAppId = null;
      if (response.data?.Details01 && response.data.Details01.length > 0 && response.data.Details01[0].ApplicationID) {
        generatedAppId = response.data.Details01[0].ApplicationID;
      } else if (response.data?.ApplicationID) {
        generatedAppId = response.data.ApplicationID;
      } else if (response.data?.Details && response.data.Details.length > 0 && response.data.Details[0].ApplicationID) {
        generatedAppId = response.data.Details[0].ApplicationID;
      }


      // Debug: Always log and show a toast, even if ApplicationID is missing
      if (generatedAppId) {
        dlog("[LC-PO] Showing toast with ApplicationID:", generatedAppId);
        toast(`Application saved successfully. ApplicationID: ${generatedAppId}`, "success");
        // Update the ApplicationID field
        const appIdField = document.getElementById("applicationId");
        if (appIdField) appIdField.value = generatedAppId;
      } else {
        dlog("[LC-PO] Showing fallback toast: Application saved successfully, no ApplicationID returned");
        toast("Application saved successfully (no ApplicationID returned).", "success");
      }

      setMode("view");

      // Always fetch the latest application data using the generated ApplicationID if present
      const fetchId = generatedAppId || applicationId;
      if (fetchId) {
        // Temporarily set the ApplicationID field to the correct value for fetch
        const appIdField = document.getElementById("applicationId");
        if (appIdField) appIdField.value = fetchId;
        await fetchLCApplication();
        // After fetch, AccountID field will be updated by populateForm
      }
    } catch (error) {
      console.error("[LC-PO] Error saving application:", error);
      toast(`Error: ${error.message || "Failed to save application."}`, "danger");
    }
  }

  function wireLookups() {
    const lookupMapping = {
      branch: { tableId: "BranchID", displayField: "BranchName", valueField: "OurBranchID", idKey: "OurBranchID", nameKey: "BranchName", moduleId: 1000 },
      application: { tableId: "LCApplicationID", displayField: "ApplicationID", valueField: "ApplicationID", idKey: "APPLICATIONID", nameKey: null, moduleId: 1821 },
      client: { tableId: "Client", displayField: "ClientName", valueField: "ClientID", idKey: "ClientID", nameKey: "ClientName", moduleId: 1821, advFilterString: "CloseDate Is NULL AND ClientStatusID='A'" },
      product: { tableId: "ProductID", displayField: "ProductName", valueField: "ProductID", idKey: "ProductID", nameKey: "ProductName", moduleId: 1821, advFilterString: "BankID='00' AND ProductTypeID='LC'" },
      account: { tableId: "AccountID", displayField: "AccountName", valueField: "AccountID", idKey: "AccountID", nameKey: "AccountName", moduleId: 1821, advFilterString: "dynamic" }
    };

    document.querySelectorAll("[data-lookup]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const lookupType = btn.getAttribute("data-lookup");
        const config = lookupMapping[lookupType];

        // If Application lookup in add mode, show info and do nothing
        if (lookupType === "application") {
          const mode = document.documentElement.dataset.lcpoMode;
          if (mode === "add") {
            toast("ApplicationID autogenerated", "info");
            return;
          }
        }

        if (!config) {
          toast("Invalid lookup type.", "danger");
          return;
        }

        // Get the corresponding input field
        const inputGroup = btn.closest(".input-group");
        const valueInput = inputGroup?.querySelector("input:not([readonly])");
        const searchValue = valueInput?.value?.trim() || "";

        try {
          toast(`Searching for ${lookupType}...`, "info");

          const branchId = document.getElementById("branchId")?.value || "002";
          const operatorId = window.sessionStorage?.getItem?.("operatorId") || "web_portal";

          let response;

          // Branch search uses different endpoint
          if (lookupType === "branch") {
            const bankId = "00"; // Default bank ID to get all branches
            response = await window.tradeFinanceService.searchBranches({
              BankID: bankId
            });
          } else {
            // Other lookups use the standard search endpoint - fetch all pages
            const whereStmt = searchValue
              ? `${config.valueField} like '%${searchValue}%'`
              : "";

            // Build dynamic AdvFilterString for account lookup
            let advFilterString = config.advFilterString;
            if (lookupType === "account" && advFilterString === "dynamic") {
              const formBranchId = document.getElementById("branchId")?.value || "";
              const formClientId = document.getElementById("clientId")?.value || "";
              advFilterString = `OurBranchID='${formBranchId}' AND ClientID='${formClientId}'`;
            }

            let allResults = [];
            let refId = "";
            let hasMore = true;
            let pageCount = 0;

            // Fetch all pages
            while (hasMore && pageCount < 100) { // Safety limit
              pageCount++;
              const requestData = {
                TableID: config.tableId,
                AdvFilterString: advFilterString || (branchId ? `OurBranchID = '${branchId}'` : ""),
                WhereStmt: whereStmt,
                PrevOrNext: "1",
                RefID: refId,
                OperatorID: operatorId,
                ModuleID: config.moduleId || 1000,
                OurBranchID: branchId,
                SearchKey: searchValue || "",
                LanguageID: "en"
              };

              dlog(`Fetching page ${pageCount} with RefID:`, refId);
              const pageResponse = await window.tradeFinanceService.search(requestData);

              // Extract results from this page
              let pageResults = [];
              if (pageResponse?.data?.Details && Array.isArray(pageResponse.data.Details)) {
                pageResults = pageResponse.data.Details;
              } else if (pageResponse?.Details && Array.isArray(pageResponse.Details)) {
                pageResults = pageResponse.Details;
              } else if (pageResponse?.data?.Details01 && Array.isArray(pageResponse.data.Details01)) {
                pageResults = pageResponse.data.Details01;
              }

              dlog(`Page ${pageCount} returned ${pageResults.length} results`);

              if (pageResults.length > 0) {
                allResults = allResults.concat(pageResults);
                // If we got less than 10 results, we're done
                if (pageResults.length < 10) {
                  dlog(`Last page reached (${pageResults.length} < 10)`);
                  hasMore = false;
                } else {
                  // Set RefID to the last record's ID for next page
                  const lastRecord = pageResults[pageResults.length - 1];
                  const newRefId = lastRecord[config.idKey] || lastRecord.ApplicationID || lastRecord.ID || "";
                  dlog(`Last record:`, lastRecord, `Next RefID:`, newRefId);
                  if (!newRefId || newRefId === refId) {
                    dlog(`Can't paginate - no valid RefID or same as previous`);
                    hasMore = false; // Can't paginate without RefID or if RefID didn't change
                  } else {
                    refId = newRefId;
                  }
                }
              } else {
                dlog(`No results returned, stopping pagination`);
                hasMore = false;
              }
            }

            dlog(`Total results fetched: ${allResults.length} across ${pageCount} pages`);

            // Create a mock response with all results
            response = {
              data: {
                Details: allResults
              }
            };
          }
          dlog(`${lookupType} search response:`, response);
          dlog(`${lookupType} search response.data:`, response?.data);

          if (!response) {
            toast("No response from server.", "danger");
            return;
          }

          // Extract search results - handle multiple response formats
          let results = [];

          // Try normalized response format first (from coreApi.js normalizeResponse)
          if (response.data) {
            dlog(`Checking response.data:`, response.data);

            // Check for Details property
            if (response.data.Details && Array.isArray(response.data.Details)) {
              results = response.data.Details;
              dlog(`Found results in response.data.Details:`, results.length);
            }
            // Check if data itself is array
            else if (Array.isArray(response.data)) {
              results = response.data;
              dlog(`Found results in response.data (array):`, results.length);
            }
            // Check for Details01, Details02 etc (like LC Application)
            else if (response.data.Details01 && Array.isArray(response.data.Details01)) {
              results = response.data.Details01;
              dlog(`Found results in response.data.Details01:`, results.length);
            }
          }

          // Try direct Details property
          if (results.length === 0 && response.Details) {
            if (Array.isArray(response.Details)) {
              results = response.Details;
              dlog(`Found results in response.Details:`, results.length);
            }
          }

          // Try ResponseData
          if (results.length === 0 && response.ResponseData) {
            if (Array.isArray(response.ResponseData)) {
              results = response.ResponseData;
              dlog(`Found results in response.ResponseData:`, results.length);
            }
          }

          dlog(`${lookupType} final results:`, results);
          dlog(`${lookupType} results count:`, results.length);

          if (results.length === 0) {
            toast("No results found.", "warning");
            return;
          }

          // Show all results in modal
          showSearchResults(lookupType, results, config);
        } catch (error) {
          console.error(`Error searching ${lookupType}:`, error);
          toast(`Error: ${error.message || "Search failed."}`, "danger");
        }
      });
    });

    // Auto-fetch application when user types ID and presses Tab or leaves the field
    const appIdInput = document.getElementById("applicationId");
    if (appIdInput) {
      appIdInput.addEventListener("keydown", (e) => {
        if (e.key === "Tab" || e.keyCode === 9) {
          const mode = document.documentElement.dataset.lcpoMode;
          if (mode === "add") {
            toast("ApplicationID autogenerated", "info");
            return;
          }
          // Defer so the field value is updated after the key event
          setTimeout(() => {
            const val = (appIdInput.value || "").trim();
            if (val) {
              try {
                fetchLCApplication();
              } catch (err) {
                console.error("Error fetching application on Tab:", err);
              }
            }
          }, 0);
        }
      });

      appIdInput.addEventListener("blur", () => {
        const mode = document.documentElement.dataset.lcpoMode;
        if (mode === "add") {
          toast("ApplicationID autogenerated", "info");
          return;
        }
        const val = (appIdInput.value || "").trim();
        if (val) {
          try {
            fetchLCApplication();
          } catch (err) {
            console.error("Error fetching application on blur:", err);
          }
        }
      });
    }
  }

  function populateLookupFields(lookupType, data) {
    const lookupMapping = {
      branch: { tableId: "BranchID", displayField: "BranchName", valueField: "OurBranchID", idKey: "OurBranchID", nameKey: "BranchName" },
      application: { tableId: "ApplicationID", displayField: "ApplicationID", valueField: "ApplicationID", idKey: "APPLICATIONID", nameKey: null },
      client: { tableId: "Client", displayField: "ClientName", valueField: "ClientID", idKey: "ClientID", nameKey: "Name" },
      product: { tableId: "ProductID", displayField: "ProductName", valueField: "ProductID", idKey: "ProductID", nameKey: "Description" },
      account: { tableId: "AccountID", displayField: "AccountName", valueField: "AccountID", idKey: "AccountID", nameKey: "Name" }
    };

    const fieldMappings = {
      branch: { id: "branchId", name: "branchName" },
      application: { id: "applicationId", name: null },
      client: { id: "clientId", name: "clientName" },
      product: { id: "productId", name: "productName" },
      account: { id: "accountId", name: "accountName" }
    };

    const config = lookupMapping[lookupType];
    const mapping = fieldMappings[lookupType];
    if (!mapping || !config) return;

    dlog(`Populating ${lookupType} fields with data:`, data);
    dlog(`Using config:`, config);
    dlog(`Using mapping:`, mapping);

    const idField = document.getElementById(mapping.id);
    if (idField && config.idKey) {
      const idValue = data[config.idKey] || "";
      dlog(`Setting ${mapping.id} to ${idValue} (from ${config.idKey})`);
      idField.value = idValue;
    }

    if (mapping.name && config.nameKey) {
      const nameField = document.getElementById(mapping.name);
      if (nameField) {
        const nameValue = data[config.nameKey] || "";
        dlog(`Setting ${mapping.name} to ${nameValue} (from ${config.nameKey})`);
        dlog(`Name field found:`, nameField);
        dlog(`Name field disabled:`, nameField.disabled);
        nameField.value = nameValue;
      } else {
        dwarn(`Name field not found: ${mapping.name}`);
      }
    }

    // If application was selected, fetch full application data
    if (lookupType === "application") {
      setTimeout(() => {
        fetchLCApplication();
      }, 100);
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

    // Store all results and config
    modalEl._allResults = results;
    modalEl._config = config;
    modalEl._lookupType = lookupType;
    modalEl._currentFilters = {};
    modalEl._pageIndex = 0;
    modalEl._pageSize = 10;

    // Set modal title
    if (titleEl) {
      titleEl.textContent = lookupType.charAt(0).toUpperCase() + lookupType.slice(1);
    }

    // Generate dynamic search filters based on lookup type
    generateSearchFilters(lookupType, searchFiltersContainer);

    // Render initial results
    renderFilteredResults(results, config, lookupType);

    // Wire search button
    if (searchButton) {
      searchButton.onclick = function () {
        performFilteredSearch(modalEl);
      };
    }

    modal.show();

    // Focus first filter input when modal is shown
    modalEl.addEventListener('shown.bs.modal', function () {
      const firstInput = searchFiltersContainer.querySelector('input');
      if (firstInput) firstInput.focus();
    }, { once: true });
  }

  function generateSearchFilters(lookupType, container) {
    if (!container) return;

    // Define filter fields based on lookup type
    const filterConfigs = {
      client: [
        { label: 'Client ID', field: 'ClientID', type: 'text' },
        { label: 'Name', field: 'Name', type: 'text' }
      ],
      product: [
        { label: 'Product ID', field: 'ProductID', type: 'text' },
        { label: 'Description', field: 'Description', type: 'text' }
      ],
      account: [
        { label: 'Account ID', field: 'AccountID', type: 'text' },
        { label: 'Name', field: 'Name', type: 'text' }
      ],
      branch: [
        { label: 'Branch ID', field: 'OurBranchID', type: 'text' },
        { label: 'Branch Name', field: 'BranchName', type: 'text' }
      ],
      application: [
        { label: 'Application ID', field: 'APPLICATIONID', type: 'text' }
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

    // Collect filter values
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

    // Apply filters
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

    // Update results count label
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

    // Paging logic
    const pageSize = modalEl._pageSize || 10;
    const pageIndex = modalEl._pageIndex || 0;
    const totalPages = Math.ceil(results.length / pageSize);
    const pagedResults = results.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

    // Build table header dynamically from first result
    const firstResult = pagedResults[0];
    const columns = firstResult ? Object.keys(firstResult) : [];

    let headerHtml = "<tr>";
    columns.forEach(col => {
      headerHtml += `<th>${col}</th>`;
    });
    headerHtml += "</tr>";
    if (headerEl) headerEl.innerHTML = headerHtml;

    // Build table body with double-click support
    let bodyHtml = "";
    pagedResults.forEach((result, index) => {
      bodyHtml += `<tr style="cursor: pointer;" data-select-index="${index}">`;
      columns.forEach(col => {
        const value = result[col] !== null && result[col] !== undefined ? result[col] : "";
        bodyHtml += `<td>${value}</td>`;
      });
      bodyHtml += "</tr>";
    });
    if (bodyEl) bodyEl.innerHTML = bodyHtml;

    // Store filtered results for selection (paged)
    modalEl._filteredResults = pagedResults;
    modalEl._filteredResultsAll = results;

    // Update next/prev button state
    const prevBtn = document.getElementById("prevPageBtn");
    const nextBtn = document.getElementById("nextPageBtn");
    if (prevBtn) prevBtn.disabled = pageIndex <= 0;
    if (nextBtn) nextBtn.disabled = pageIndex >= totalPages - 1;

    // Wire up double-click and single-click row selection
    bodyEl.querySelectorAll("tr[data-select-index]").forEach(row => {
      // Single click for highlighting
      row.addEventListener("click", function () {
        bodyEl.querySelectorAll("tr").forEach(r => r.classList.remove("table-active"));
        this.classList.add("table-active");
      });

      // Double click for selection
      row.addEventListener("dblclick", function () {
        const index = parseInt(this.getAttribute("data-select-index"));
        populateLookupFields(lookupType, results[index]);
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        toast("Record selected.", "success");
      });
    });
  }

  function wireSearchModalButtons() {
    const modalEl = document.getElementById("searchResultsModal");
    const okBtn = modalEl?.querySelector('.modal-footer button:nth-child(2)'); // OK button
    const prevBtn = document.getElementById("prevPageBtn");
    const nextBtn = document.getElementById("nextPageBtn");

    // Wire OK button to select currently highlighted row
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

    // Pagination support (for future multi-page results)
    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        const modalEl = document.getElementById("searchResultsModal");
        if (modalEl._pageIndex > 0) {
          modalEl._pageIndex--;
          renderFilteredResults(modalEl._allResults, modalEl._config, modalEl._lookupType);
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        const modalEl = document.getElementById("searchResultsModal");
        const totalPages = Math.ceil((modalEl._allResults?.length || 0) / (modalEl._pageSize || 10));
        if (modalEl._pageIndex < totalPages - 1) {
          modalEl._pageIndex++;
          renderFilteredResults(modalEl._allResults, modalEl._config, modalEl._lookupType);
        }
      });
    }
  }

  function wireActions() {
    const form = document.getElementById("lcpo-form");
    const applicationId = document.getElementById("applicationId");

    const viewBtn = document.querySelector('[data-lcpo-action="view"]');
    const addBtn = document.querySelector('[data-lcpo-action="add"]');
    const editBtn = document.querySelector('[data-lcpo-action="edit"]');
    const deleteBtn = document.querySelector('[data-lcpo-action="delete"]');
    const saveBtn = document.querySelector('[data-lcpo-action="save"]');
    const cancelBtn = document.querySelector('[data-lcpo-action="cancel"]');
    const refreshBtn = document.getElementById("refreshFormBtn");

    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        if (form) {
          form.reset();
          form.classList.remove("was-validated");
        }

        // Reset date to today
        const dateEl = document.getElementById("applicationDate");
        if (dateEl) {
          const now = new Date();
          const yyyy = now.getFullYear();
          const mm = String(now.getMonth() + 1).padStart(2, "0");
          const dd = String(now.getDate()).padStart(2, "0");
          dateEl.value = `${yyyy}-${mm}-${dd}`;
        }

        setMode("view");
        setEditable(true);
        toast("Form cleared.", "info");
      });
    }

    if (viewBtn) {
      viewBtn.addEventListener("click", () => {
        fetchLCApplication();
      });
    }

    if (addBtn) {
      addBtn.addEventListener("click", () => {
        if (form) form.classList.remove("was-validated");

        // Disable applicationId field since it's auto-generated
        const applicationIdField = document.getElementById("applicationId");
        if (applicationIdField) {
          applicationIdField.disabled = true;
        }

        // Disable accountId field since it's auto-generated in add mode
        const accountIdField = document.getElementById("accountId");
        if (accountIdField) {
          accountIdField.disabled = true;
        }

        // Set application status to Pending
        const applicationStatusField = document.getElementById("applicationStatus");
        if (applicationStatusField) {
          applicationStatusField.value = "Pending";
        }

        toast("ApplicationID generated automatically", "info");
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
      deleteBtn.addEventListener("click", () => {
        toast("Delete is not enabled in this prototype.", "warning");
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

        await saveLCApplication();
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => {
        if (form) {
          form.reset();
          form.classList.remove("was-validated");
        }

        // Reset date to today
        const dateEl = document.getElementById("applicationDate");
        if (dateEl) {
          const now = new Date();
          const yyyy = now.getFullYear();
          const mm = String(now.getMonth() + 1).padStart(2, "0");
          const dd = String(now.getDate()).padStart(2, "0");
          dateEl.value = `${yyyy}-${mm}-${dd}`;
        }

        toast("Cancelled.", "info");
        setMode("view");
        setEditable(true);
      });
    }

    if (applicationId) {
      applicationId.addEventListener("input", () => {
        const currentMode = document.documentElement.dataset.lcpoMode || "view";
        setButtons(currentMode);
      });

      // Helpers adapted from LCApplication.js to robustly bind API records
      const normalizeToken = (s) => {
        if (s === null || s === undefined) return '';
        return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '');
      };

      const getBestRecord = (normalizedResult) => {
        // Prefer nested data container when present
        const container = normalizedResult?.data ?? normalizedResult ?? null;

        // Explicit preference: Details01 over Details
        const prefer = (obj) => {
          if (!obj || typeof obj !== 'object') return null;
          if (Array.isArray(obj.Details01) && obj.Details01.length > 0) return obj.Details01[0];
          if (Array.isArray(obj.Details1) && obj.Details1.length > 0) return obj.Details1[0];
          if (Array.isArray(obj.Details) && obj.Details.length > 0) return obj.Details[0];
          return null;
        };

        // Try container, then top-level
        let pick = prefer(container) ?? prefer(normalizedResult);
        if (pick) return pick;

        // If container itself is an array, take first
        if (Array.isArray(container)) return container[0] || null;

        // Heuristic: scan all array-valued properties and choose the row with the most keys
        if (container && typeof container === 'object') {
          let best = null;
          let score = -1;
          for (const [k, v] of Object.entries(container)) {
            if (Array.isArray(v) && v.length > 0 && v[0] && typeof v[0] === 'object') {
              const s = Object.keys(v[0]).length;
              if (s > score) {
                best = v[0];
                score = s;
              }
            }
          }
          if (best) return best;
        }

        // Fallback: array at top level
        if (Array.isArray(normalizedResult)) return normalizedResult[0] || null;

        return null;
      };

      const bindRecordToInputs = (record) => {
        if (!record || typeof record !== 'object') return;

        const normalizedMap = new Map();
        for (const [key, value] of Object.entries(record)) {
          normalizedMap.set(normalizeToken(key), value);
        }

        const coerceForInput = (el, raw) => {
          const t = (el instanceof HTMLInputElement) ? el.type : '';
          if (raw === null || raw === undefined) return '';
          const val = raw;

          const toYMD = (d) => {
            const pad = (n) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
          };
          const toYMDhm = (d) => {
            const pad = (n) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
          };

          if (t === 'date') {
            if (typeof val === 'string') {
              const mYMD = val.match(/^\d{4}-\d{2}-\d{2}$/);
              if (mYMD) return val;
              const mISO = val.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
              if (mISO) return val.slice(0, 10);
              const d = new Date(val);
              if (!isNaN(d.getTime())) return toYMD(d);
              return '';
            }
            if (val instanceof Date) return toYMD(val);
            const d = new Date(val);
            return isNaN(d.getTime()) ? '' : toYMD(d);
          }

          if (t === 'datetime-local') {
            if (typeof val === 'string') {
              const mISO = val.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
              if (mISO) return val.slice(0, 16);
              const d = new Date(val);
              if (!isNaN(d.getTime())) return toYMDhm(d);
              return '';
            }
            if (val instanceof Date) return toYMDhm(val);
            const d = new Date(val);
            return isNaN(d.getTime()) ? '' : toYMDhm(d);
          }

          if (t === 'time') {
            if (typeof val === 'string') {
              const m = val.match(/T?(\d{2}:\d{2})/);
              return m ? m[1] : '';
            }
            if (val instanceof Date) {
              const pad = (n) => String(n).padStart(2, '0');
              return `${pad(val.getHours())}:${pad(val.getMinutes())}`;
            }
            return '';
          }

          return val ?? '';
        };

        const controls = Array.from(document.querySelectorAll('input, select, textarea'));
        const bound = new Set();

        controls.forEach((el) => {
          const idKey = el.id ? normalizeToken(el.id) : '';
          const nameKey = el.name ? normalizeToken(el.name) : '';
          const matchKey = (idKey && normalizedMap.has(idKey)) ? idKey : (nameKey && normalizedMap.has(nameKey) ? nameKey : null);
          if (!matchKey) return;

          const value = normalizedMap.get(matchKey);
          if (el instanceof HTMLInputElement) {
            if (el.type === 'checkbox') {
              el.checked = value === true || value === 1 || String(value).toLowerCase() === 'true' || String(value) === '1';
              return;
            }
            el.value = coerceForInput(el, value);
            bound.add(el);
            return;
          }

          if (el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
            el.value = value ?? '';
            bound.add(el);
          }
        });

        const fields = Array.from(document.querySelectorAll('.cbs-field'));
        fields.forEach((field) => {
          const label = field.querySelector('.cbs-label');
          const control = field.querySelector('input, select, textarea');
          if (!label || !control) return;
          if (bound.has(control)) return;
          if (control instanceof HTMLInputElement && control.type === 'hidden') return;

          const labelKey = normalizeToken(label.textContent);
          if (!labelKey || !normalizedMap.has(labelKey)) return;

          const value = normalizedMap.get(labelKey);
          if (control instanceof HTMLInputElement) {
            if (control.type === 'checkbox') {
              control.checked = value === true || value === 1 || String(value).toLowerCase() === 'true' || String(value) === '1';
              return;
            }
            control.value = coerceForInput(control, value);
            return;
          }

          if (control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement) {
            control.value = value ?? '';
          }
        });
      };

      // Function to load application data
      const loadApplicationData = async () => {
        const branchIdEl = document.getElementById("branchId");
        const branchIdValue = branchIdEl?.value?.trim();
        const appIdValue = applicationId.value.trim();

        if (branchIdValue && appIdValue) {

          // Prefer the LCApplicationService used by the working View flow; fallback to tradeFinanceService
          let service = null;
          try {
            if (window.ServiceLoader && !window.LCApplicationService?.getLCApplication) {
              await window.ServiceLoader.loadLCApplicationService();
            }
            service = window.LCApplicationService?.getLCApplication ? window.LCApplicationService : window.tradeFinanceService;
          } catch (e) {
            service = window.tradeFinanceService;
          }

          if (service?.getLCApplication) {
            try {
              toast("Loading application...", "info");
              const operatorId = window.sessionStorage?.getItem?.("operatorId") || "SYSTEM";

              const response = await service.getLCApplication({
                ApplicationID: appIdValue,
                OurBranchID: branchIdValue,
                OperatorID: operatorId,
                Direction: 0,
                BankID: ""
              });

              // Extract the most relevant record using tolerant logic
              const record = getBestRecord(response) || getBestRecord(response?.data) || null;

              if (response?.success && record) {
                bindRecordToInputs(record);

                // Optional: update branch/application ids if named differently in record
                const appEl = document.getElementById('applicationId');
                if (appEl && !appEl.value && (record.ApplicationID || record.applicationid)) {
                  appEl.value = record.ApplicationID || record.applicationid;
                }

                const branchEl = document.getElementById('branchId');
                if (branchEl && !branchEl.value && (record.OurBranchID || record.ourbranchid)) {
                  branchEl.value = record.OurBranchID || record.ourbranchid;
                }

                // Ensure Product description is populated if ProductID is present
                try {
                  const productIdEl = document.getElementById('productId');
                  const productNameEl = document.getElementById('productName');
                  const pid = (productIdEl?.value || record.ProductID || record.productid || '').trim();
                  const pname = (productNameEl?.value || record.ProductName || record.productname || '').trim();
                  if (pid && !pname && typeof fetchProductName === 'function') {
                    await fetchProductName(pid);
                  }
                } catch (e) { /* ignore */ }

                toast('Application loaded successfully.', 'success');
                setMode('view-with-data');
              } else { toast('No application data found.', 'warning'); }
            } catch (error) {
              console.error("[LC-PO] Error loading application:", error);
              toast("Failed to load application.", "danger");
            }
          }
        }
      };

      // Load application data when Tab is pressed after entering ApplicationID
      applicationId.addEventListener("keydown", async (e) => {
        if (e.key === "Tab" && applicationId.value.trim()) {
          await loadApplicationData();
        }
      });

      // Also trigger on blur (when field loses focus)
      applicationId.addEventListener("blur", loadApplicationData);
    }

    // Lookup branch name when Tab is pressed after entering BranchID
    const branchIdEl = document.getElementById("branchId");
    const branchNameEl = document.getElementById("branchName");

    if (branchIdEl && branchNameEl) {
      // Function to fetch and populate branch name
      const fetchBranchName = async () => {
        const branchId = branchIdEl.value.trim();
        if (!branchId) return;



        const service = window.tradeFinanceService;
        if (!service?.searchBranches) {
          console.error("[LC-PO] tradeFinanceService.searchBranches not available");
          return;
        }

        try {
          const response = await service.searchBranches({
            BankID: "00" // Get all branches
          });

          // API returns branches in response.data (which is an array)
          let branches = [];
          if (Array.isArray(response?.data)) {
            branches = response.data;
          } else if (Array.isArray(response?.Details)) {
            branches = response.Details;
          }

          if (branches.length > 0) {
            // Try to match by BranchID or OurBranchID
            const matchedBranch = branches.find(b =>
              b.BranchID === branchId || b.OurBranchID === branchId || b.BranchCode === branchId
            );

            if (matchedBranch) {
              // Try different field names for branch description
              const branchName = matchedBranch.BranchName ||
                matchedBranch.BranchDescription ||
                matchedBranch.Description ||
                matchedBranch.Name ||
                matchedBranch.BranchDesc || "";

              if (branchName) {
                branchNameEl.value = branchName;
              } else {
                // no-op if branch name not present
              }
            } else {
              // no-op if no matching branch found
            }
          } else {
            // no-op if no branches returned
          }
        } catch (error) {
          console.error("[LC-PO] Error looking up branch:", error);
        }
      };

      // Trigger on Tab key
      branchIdEl.addEventListener("keydown", async (e) => {
        if (e.key === "Tab" && branchIdEl.value.trim()) {
          await fetchBranchName();
        }
      });

      // Also trigger on blur (when field loses focus)
      branchIdEl.addEventListener("blur", fetchBranchName);
    }

    document.querySelectorAll("[data-lcpo-nav]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const navType = btn.getAttribute("data-lcpo-nav");
        const branchId = document.getElementById("branchId")?.value?.trim();
        const applicationId = document.getElementById("applicationId")?.value?.trim();
        if (!branchId || !applicationId) {
          toast("Branch ID and Application ID required for navigation.", "warning");
          return;
        }
        const operatorId = window.sessionStorage?.getItem?.("operatorId") || "SYSTEM";
        let direction = 0;
        if (navType === "next") direction = 1;
        else if (navType === "prev") direction = -1;
        else {
          toast("Unknown navigation type.", "danger");
          return;
        }
        try {
          toast("Loading application...", "info");
          // Use the same backend as fetchLCApplication, but set Direction
          const requestData = {
            ApplicationID: applicationId,
            OurBranchID: branchId,
            OperatorID: operatorId,
            Direction: direction,
            BankID: ""
          };
          const response = await window.tradeFinanceService.getLCApplication(requestData);
          let nextAppId = null;
          if (response.data?.Details01 && response.data.Details01.length > 0 && response.data.Details01[0].ApplicationID) {
            nextAppId = response.data.Details01[0].ApplicationID;
          } else if (response.data?.ApplicationID) {
            nextAppId = response.data.ApplicationID;
          } else if (response.data?.Details && response.data.Details.length > 0 && response.data.Details[0].ApplicationID) {
            nextAppId = response.data.Details[0].ApplicationID;
          }
          if (nextAppId && nextAppId !== applicationId) {
            const appIdField = document.getElementById("applicationId");
            if (appIdField) appIdField.value = nextAppId;
            await fetchLCApplication();
          } else {
            toast("No more applications in this direction.", "info");
          }
        } catch (err) {
          console.error("[LC-PO] Navigation error:", err);
          toast("Navigation failed.", "danger");
        }
      });
    });
  }

  function wireDataEntry() {
    const items = Array.from(document.querySelectorAll("[data-lcpo-dataentry]"));
    if (!items.length) return;

    const setActive = (activeValue) => {
      items.forEach((item) => {
        const isActive = item.dataset.lcpoDataentry === activeValue;
        if (isActive) {
          item.setAttribute("aria-current", "true");
        } else {
          item.removeAttribute("aria-current");
        }
      });
    };

    // Default to first item (matches legacy feel).
    if (!items.some((item) => item.getAttribute("aria-current") === "true")) {
      setActive(items[0].dataset.lcpoDataentry);
    }

    items.forEach((item) => {
      item.addEventListener("click", () => {
        const value = item.dataset.lcpoDataentry;
        setActive(value);

        if (value === "lc-banks" || value === "lc-more-info") {
          openPopout(value);
          return;
        }

        toast(`${item.textContent.trim()} selected.`, "info");
      });
    });
  }

  function wirePopoutMessaging() {
    window.addEventListener("message", (event) => {
      const data = event?.data;
      if (!data || typeof data !== "object") return;

      if (data.type === "tradefinance:close-popout") {
        closePopout(data.popout);
      }
    });
  }

  function wirePopoutMaximizeControls() {
    const modalIds = ["lcBanksPopout", "lcMoreInfoPopout"];

    const setMaximizeButtonState = (button, isMaximized) => {
      if (!button) return;
      button.setAttribute("aria-pressed", String(isMaximized));
      button.setAttribute("aria-label", isMaximized ? "Restore window" : "Maximize window");

      const icon = button.querySelector("i");
      if (!icon) return;
      icon.classList.toggle("bi-arrows-fullscreen", !isMaximized);
      icon.classList.toggle("bi-fullscreen-exit", isMaximized);
    };

    modalIds.forEach((modalId) => {
      const modalEl = document.getElementById(modalId);
      if (!modalEl) return;

      const dialog = modalEl.querySelector(".modal-dialog");
      const button = modalEl.querySelector('[data-lcpo-popout-control="maximize"]');
      if (!dialog || !button) return;

      button.addEventListener("click", () => {
        const isMaximized = dialog.classList.toggle("is-maximized");
        setMaximizeButtonState(button, isMaximized);
      });

      modalEl.addEventListener("hidden.bs.modal", () => {
        dialog.classList.remove("is-maximized");
        setMaximizeButtonState(button, false);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const page = document.body?.dataset?.page;
    if (page !== SUPPORTED_PAGE) return;

    // Initialize with a sensible default date if empty (matches legacy feel).
    const dateEl = document.getElementById("applicationDate");
    if (dateEl && !dateEl.value) {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      dateEl.value = `${yyyy}-${mm}-${dd}`;
    }

    wireLookups();
    wireActions();
    wireSearchModalButtons();
    wireDataEntry();
    wirePopoutMessaging();
    wirePopoutMaximizeControls();
    setMode("view");
    setEditable(true);
  });
})();
