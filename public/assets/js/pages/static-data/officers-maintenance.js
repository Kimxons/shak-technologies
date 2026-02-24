(() => {
  if (window.__kairoOfficersMaintenanceLoaded) return;
  window.__kairoOfficersMaintenanceLoaded = true;

  const MODES = {
    VIEW: "View",
    ADD: "Add",
    UPDATE: "Update"
  };

  const VIEWS = {
    OFFICER: "officer",
    BRANCH_ASSIGNED: "branch-assigned"
  };

  const state = {
    view: VIEWS.OFFICER,
    officerMode: MODES.VIEW,
    branchMode: MODES.VIEW,
    branchGridAction: null, // Track current grid action: null, 'new', 'alter'
    branchAssignedRows: [], // Array of assigned branch records
    selectedBranchRowIndex: -1, // Index of selected row for alter/remove
    isBusy: false,
    hasLoaded: false,
    recordNotFound: false,
    currentUpdateCount: 0,
    lastLoadedOfficerRow: null, // Store last loaded officer data for modal refresh
  };

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function formatAmount(value) {
    const num = parseFloat(value) || 0;
    return num.toFixed(2);
  }

  function escapeXml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  // ==================== TOAST HELPERS (Kairo Design System) ====================
  function ensureToastContainer() {
    let el = document.querySelector('[data-kairo-toast-container]');
    if (el) return el;
    el = document.createElement('div');
    el.className = 'kairo-toast-container';
    el.setAttribute('data-kairo-toast-container', '');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-relevant', 'additions');
    document.body.appendChild(el);
    return el;
  }

  function showToast(message, { title = 'Notice', variant = 'info', timeoutMs = 5000 } = {}) {
    const container = ensureToastContainer();

    // Limit to one toast at a time - remove existing
    const existingToasts = container.querySelectorAll('.kairo-toast');
    existingToasts.forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `kairo-toast kairo-toast--${variant}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-atomic', 'true');

    const body = document.createElement('div');
    body.className = 'kairo-toast__body';
    body.textContent = String(message || '');

    toast.appendChild(body);
    container.appendChild(toast);

    const remove = () => {
      try {
        toast.classList.remove('is-show');
        setTimeout(() => toast.remove(), 160);
      } catch {
        // ignore
      }
    };

    setTimeout(() => toast.classList.add('is-show'), 0);
    if (timeoutMs && timeoutMs > 0) setTimeout(remove, timeoutMs);
  }

  function showSuccessToast(message) {
    showToast(message, { title: 'Success', variant: 'success', timeoutMs: 3000 });
  }

  function showErrorToast(message) {
    showToast(message, { title: 'Error', variant: 'danger', timeoutMs: 4000 });
  }

  function showWarningToast(message) {
    showToast(message, { title: 'Warning', variant: 'warning', timeoutMs: 3000 });
  }

  function showInfoToast(message) {
    showToast(message, { title: 'Info', variant: 'info', timeoutMs: 3000 });
  }

  function setToast(message, variant = "success") {
    switch (variant) {
      case 'success':
        showSuccessToast(message);
        break;
      case 'danger':
      case 'error':
        showErrorToast(message);
        break;
      case 'warning':
        showWarningToast(message);
        break;
      case 'info':
      default:
        showInfoToast(message);
        break;
    }
  }

  // ==================== VALIDATION SUMMARY (Account Maintenance Style) ====================
  function showSuccessMessage(message) {
    const summary = qs('.validation-summary');
    console.log('[Officers] showSuccessMessage called:', message, 'Element found:', !!summary);
    if (!summary) {
      // Fallback to toast if banner not found
      setToast(message, 'success');
      return;
    }

    // Update icon for success
    const iconEl = summary.querySelector('.validation-summary__icon');
    if (iconEl) {
      iconEl.className = 'bi bi-check-circle validation-summary__icon';
    }

    // Update message and show with success styling
    const textEl = summary.querySelector('.validation-summary__text');
    if (textEl) textEl.textContent = message;

    summary.classList.remove('validation-summary--error');
    summary.classList.add('is-visible', 'validation-summary--success');
    
    // Force visibility with inline styles (in case CSS isn't loading)
    summary.style.display = 'flex';
    summary.style.background = '#d4edda';
    summary.style.border = '1px solid #198754';
    summary.style.borderRadius = '6px';
    summary.style.padding = '10px 14px';
    summary.style.marginBottom = '14px';
    summary.style.alignItems = 'center';
    summary.style.gap = '10px';
    
    if (iconEl) {
      iconEl.style.color = '#198754';
      iconEl.style.fontSize = '16px';
    }
    if (textEl) {
      textEl.style.color = '#155724';
      textEl.style.fontSize = '12px';
      textEl.style.flex = '1';
    }
    
    console.log('[Officers] Banner classes after adding:', summary.className);

    // Setup close button handler
    const closeBtn = summary.querySelector('.validation-summary__close');
    if (closeBtn && !closeBtn._omHandlerAttached) {
      closeBtn.addEventListener('click', () => hideValidationSummary());
      closeBtn._omHandlerAttached = true;
    }
  }

  function hideValidationSummary() {
    const summary = qs('.validation-summary');
    if (summary) {
      summary.classList.remove('is-visible', 'validation-summary--success', 'validation-summary--error');
    }
  }

  function setButtonDisabled(buttonEl, disabled) {
    if (!buttonEl) return;
    buttonEl.disabled = !!disabled;
    if (disabled) {
      buttonEl.setAttribute("disabled", "");
      buttonEl.setAttribute("aria-disabled", "true");
      buttonEl.classList.add("is-disabled");
    } else {
      buttonEl.removeAttribute("disabled");
      buttonEl.setAttribute("aria-disabled", "false");
      buttonEl.classList.remove("is-disabled");
    }
  }

  function getActionButtons() {
    return {
      view: qs('[data-shell-mode="View"]'),
      add: qs('[data-shell-mode="Add"]'),
      edit: qs('[data-shell-mode="Update"]'),
      del: qs('[data-om-action="delete"]'),
      save: qs('[data-om-action="save"]'),
      cancel: qs('[data-om-action="cancel"]'),
      resign: qs('[data-om-action="resign"]'),
    };
  }

  function updateActionButtons() {
    const { view, add, edit, del, save, cancel, resign } = getActionButtons();
    const isEditable = state.officerMode === MODES.ADD || state.officerMode === MODES.UPDATE;
    const isViewingData = state.officerMode === MODES.VIEW && state.hasLoaded;
    const hasOfficerIdInput = !!(qs("#OfficerId")?.value || "").trim();

    // View: enabled only in VIEW mode with no record loaded
    setButtonDisabled(view, state.officerMode !== MODES.VIEW || state.hasLoaded);

    // Add: enabled only in VIEW mode with no record loaded
    setButtonDisabled(add, state.officerMode !== MODES.VIEW || state.hasLoaded);

    // Edit: enabled only when record is loaded in VIEW mode
    setButtonDisabled(edit, !isViewingData);

    // Save: only in Add/Edit modes
    setButtonDisabled(save, !isEditable);

    // Cancel: enabled in edit modes, when viewing data, or when an Officer ID is present.
    // (User may type/search an ID and want to cancel/clear without loading.)
    const shouldEnableCancel = isEditable || isViewingData || hasOfficerIdInput;
    setButtonDisabled(cancel, !shouldEnableCancel);

    // Delete: only when record is loaded in VIEW mode
    setButtonDisabled(del, !isViewingData);

    // Resign: enabled when record is loaded in VIEW mode
    setButtonDisabled(resign, !isViewingData);
  }

  function getContext() {
    const session = window.AuthService?.getSession() || {};
    return {
      BankID: session.bankID || window.Environment?.bankID || "00",
      OurBranchID: session.branchID || window.Environment?.branchID || "0101",
      OperatorID: session.operatorID || session.operatorId || window.sessionStorage?.getItem?.("operatorID") || "ADMIN",
    };
  }

  // --- Client Lookup Modal Logic (reused from Maintain Guarantors) ---

  let clientLookupModal = null;

  function openClientLookupModal() {
    // Only allow changing client in Add/Edit modes.
    if (state.officerMode === MODES.VIEW) {
      setToast("Switch to Add/Edit to select a Client.", "info");
      return;
    }

    const el = qs("#clientLookupModal");
    if (!el) return;

    qs("#clientLookupForm")?.reset();

    if (!clientLookupModal) {
      clientLookupModal = new bootstrap.Modal(el);
    }
    clientLookupModal.show();

    // Auto-search to show all records by default
    handleClientSearch();

    setTimeout(() => {
      qs("#clientSearchId")?.focus();
    }, 300);
  }

  const clientSearchState = {
    allResults: [],
    currentPage: 0,
    pageSize: 5,
    get totalPages() {
      return Math.ceil(this.allResults.length / this.pageSize);
    }
  };

  async function ensureClientSearchService() {
    if (window.ClientSearchService) return;
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "../../assets/js/services/workflow/clientSearchService.js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function handleClientSearch(e) {
    if (e) e.preventDefault();

    const idValue = (qs("#clientSearchId")?.value || "").trim();
    const nameValue = (qs("#clientSearchName")?.value || "").trim();
    const idMode = (qs("#clientSearchModeId")?.value || "like").trim();
    const nameMode = (qs("#clientSearchModeName")?.value || "like").trim();

    const tbody = qs("#clientSearchResults");
    const emptyMsg = qs("#clientSearchEmpty");
    const loader = qs("#clientSearchLoading");

    if (tbody) tbody.innerHTML = "";
    emptyMsg?.classList.add("d-none");
    loader?.classList.remove("d-none");

    try {
      await ensureClientSearchService();
      if (!window.ClientSearchService) throw new Error("ClientSearchService not available");

      const results = await window.ClientSearchService.searchClients({
        clientId: idValue,
        clientIdOperator: idMode,
        clientName: nameValue,
        clientNameOperator: nameMode,
      });

      loader?.classList.add("d-none");

      if (Array.isArray(results) && results.length) {
        clientSearchState.allResults = results;
        clientSearchState.currentPage = 0;
        displayClientSearchPage();
        updateClientSearchPagination();
      } else {
        clientSearchState.allResults = [];
        clientSearchState.currentPage = 0;
        updateClientSearchPagination();
        emptyMsg?.classList.remove("d-none");
        if (emptyMsg) emptyMsg.textContent = "No clients found matching the criteria.";
      }
    } catch (err) {
      console.error("Client search error", err);
      loader?.classList.add("d-none");
      emptyMsg?.classList.remove("d-none");
      if (emptyMsg) emptyMsg.textContent = "Error occurred during search.";
      setToast("Client search failed.", "danger");
    }
  }

  function displayClientSearchPage() {
    const start = clientSearchState.currentPage * clientSearchState.pageSize;
    const end = start + clientSearchState.pageSize;
    const pageResults = clientSearchState.allResults.slice(start, end);
    renderClientResults(pageResults);
  }

  function updateClientSearchPagination() {
    const btnPrev = qs("#clientSearchPrevious");
    const btnNext = qs("#clientSearchNext");
    if (btnPrev) btnPrev.disabled = clientSearchState.currentPage === 0;
    if (btnNext) btnNext.disabled = clientSearchState.currentPage >= clientSearchState.totalPages - 1;
  }

  function renderClientResults(rows) {
    const tbody = qs("#clientSearchResults");
    if (!tbody) return;

    tbody.innerHTML = Array.isArray(rows)
      ? rows
          .map((row, index) => {
            const id = row.ClientID || row.ClientId || row.ID || "";
            const name = row.Name || row.name || row.Description || "";
            if (!id) return "";

            const safeId = String(id).replace(/'/g, "\\'");
            const safeName = String(name || "").replace(/'/g, "\\'");

            return `
              <tr style="cursor: pointer;" ondblclick="window.selectLookupClient('${safeId}', '${safeName}')">
                <td>${index + 1}</td>
                <td>${id}</td>
                <td>${name}</td>
              </tr>
            `;
          })
          .join("")
      : "";
  }

  window.selectLookupClient = (id, name) => {
    const clientId = qs("#ClientId");
    const clientName = qs("#ClientName");

    if (clientId) clientId.value = id;
    if (clientName) clientName.value = name;

    if (clientLookupModal) clientLookupModal.hide();
  };

  // --- Officer Lookup Modal Logic ---

  let officerLookupModal = null;
  let officerLookupTargetField = null; // 'OfficerId' or 'ReportingTo'

  function openOfficerLookupModal(targetField = 'OfficerId') {
    officerLookupTargetField = targetField;
    const el = qs("#officerLookupModal");
    if (!el) return;

    qs("#officerLookupForm")?.reset();

    if (!officerLookupModal) {
      officerLookupModal = new bootstrap.Modal(el);
    }
    officerLookupModal.show();

    // Auto-search to load all records when modal opens
    handleOfficerSearch();

    setTimeout(() => {
      qs("#officerSearchId")?.focus();
    }, 500);
  }

  let officerSearchState = {
    allResults: [],
    currentPage: 0,
    pageSize: 5,
    get totalPages() { return Math.ceil(this.allResults.length / this.pageSize); }
  };

  async function handleOfficerSearch(e) {
    if (e) e.preventDefault();

    const idInput = (qs("#officerSearchId")?.value || "").trim();
    const idModeRaw = (qs("#officerSearchModeId")?.value || "Like").trim();
    const nameInput = (qs("#officerSearchName")?.value || "").trim();
    const nameModeRaw = (qs("#officerSearchModeName")?.value || "Like").trim();
    const reportingBranchInput = (qs("#officerSearchReportingBranch")?.value || "").trim();
    const reportingBranchModeRaw = (qs("#officerSearchModeReportingBranch")?.value || "Like").trim();

    const normalizeMode = (v) => String(v || '').trim().toLowerCase();
    const isExactMode = (v) => {
      const m = normalizeMode(v);
      return m === 'exact' || m === 'equals' || m === 'equal' || m === '=';
    };

    const tbody = qs("#officerSearchResults");
    const emptyMsg = qs("#officerSearchEmpty");
    const loader = qs("#officerSearchLoading");

    tbody.innerHTML = "";
    emptyMsg.classList.add("d-none");
    loader.classList.remove("d-none");

    try {
      const ctx = getContext();

      const sanitizeSqlLiteral = (value) => String(value || "").replace(/'/g, "''");

      const clauses = [];

      if (idInput) {
        const safeId = sanitizeSqlLiteral(idInput);
        if (isExactMode(idModeRaw)) {
          clauses.push(`OfficerID = '${safeId}'`);
        } else {
          clauses.push(`OfficerID LIKE '%${safeId}%'`);
        }
      }

      if (nameInput) {
        const safeName = sanitizeSqlLiteral(nameInput);
        if (isExactMode(nameModeRaw)) {
          clauses.push(`(Name = '${safeName}' OR Names = '${safeName}' OR FullName = '${safeName}' OR OfficerName = '${safeName}')`);
        } else {
          clauses.push(`(Name LIKE '%${safeName}%' OR Names LIKE '%${safeName}%' OR FullName LIKE '%${safeName}%' OR OfficerName LIKE '%${safeName}%')`);
        }
      }

      if (reportingBranchInput) {
        const safeBranch = sanitizeSqlLiteral(reportingBranchInput);
        if (isExactMode(reportingBranchModeRaw)) {
          clauses.push(`ReportingBranchID = '${safeBranch}'`);
        } else {
          clauses.push(`ReportingBranchID LIKE '%${safeBranch}%'`);
        }
      }

      const whereClause = clauses.join(" AND ");

      const payload = {
        WhereStmt: whereClause || "",
        TableID: "OfficerID",
        RefID: "",
        PrevOrNext: 0,
        AdvFilterString: `BankID = '${ctx.BankID}'`,
        OperatorID: ctx.OperatorID,
        ModuleID: 0,
        OurBranchID: ctx.OurBranchID,
        SearchKey: "",
        LanguageID: "ENG"
      };

      console.log('[OfficerSearch] Sending p_GetSearchResult payload:', payload);

      const response = await window.CoreApi.post(
        (window.Environment?.baseUrlSystemCodes || "http://localhost:5059").replace(/\/+$/, "") + "/api/OldAPI",
        window.CoreApi.makeRequestEnvelope("p_GetSearchResult", payload)
      );

      loader.classList.add("d-none");

      console.log('[OfficerSearch] API Response received:', response);

      let rows = [];

      if (response && response.data && Array.isArray(response.data) && response.data.length > 0) {
        rows = response.data.filter(r => r.OfficerID && r.OfficerID.trim() !== "");
        console.log('[OfficerSearch] Found officer records in response.data (' + rows.length + ' records)');
      } else if (response && response.Details && Array.isArray(response.Details) && response.Details.length > 0) {
        rows = response.Details.filter(r => r.OfficerID && r.OfficerID.trim() !== "");
        console.log('[OfficerSearch] Found officer records in response.Details (' + rows.length + ' records)');
      }

      if (!Array.isArray(rows)) {
        rows = [];
      }

      console.log('[OfficerSearch] Total officer records found: ' + rows.length);

      if (rows.length === 0) {
        emptyMsg.classList.remove("d-none");
        if (idInput || nameInput || reportingBranchInput) {
          const parts = [];
          if (idInput) parts.push(`ID: ${idInput}`);
          if (nameInput) parts.push(`Name: ${nameInput}`);
          if (reportingBranchInput) parts.push(`Branch: ${reportingBranchInput}`);
          emptyMsg.textContent = `No officer found for (${parts.join(", ")}).`;
        } else {
          emptyMsg.innerHTML = `
            <div style="padding: 20px; text-align: center;">
              <p><strong>No officer records found.</strong></p>
              <p style="font-size: 0.9em; color: #666; margin-top: 10px;">
                To add a new officer, use the <strong>Add</strong> button in the main form.
              </p>
            </div>
          `;
        }
        return;
      }

      officerSearchState.allResults = rows;
      officerSearchState.currentPage = 0;
      displayOfficerSearchPage();
      updateOfficerSearchPagination();

    } catch (err) {
      console.error("Officer search error", err);
      loader.classList.add("d-none");
      emptyMsg.classList.remove("d-none");
      emptyMsg.textContent = "Error searching officers.";
      setToast("Search failed.", "danger");
    }
  }

  function displayOfficerSearchPage() {
    const start = officerSearchState.currentPage * officerSearchState.pageSize;
    const end = start + officerSearchState.pageSize;
    const pageResults = officerSearchState.allResults.slice(start, end);
    renderOfficerResults(pageResults);
  }

  function updateOfficerSearchPagination() {
    const btnPrev = qs("#officerSearchPrevious");
    const btnNext = qs("#officerSearchNext");

    if (btnPrev) btnPrev.disabled = officerSearchState.currentPage === 0;
    if (btnNext) btnNext.disabled = officerSearchState.currentPage >= officerSearchState.totalPages - 1;

    console.log(`[OfficerSearch] Page ${officerSearchState.currentPage + 1}/${officerSearchState.totalPages}, Total: ${officerSearchState.allResults.length}`);
  }

  function renderOfficerResults(rows) {
    const tbody = qs("#officerSearchResults");
    if (!tbody) return;

    tbody.innerHTML = Array.isArray(rows) ?
      rows.map((row, index) => {
        const id = row.OfficerID || '';
        const name = row.Name || row.OfficerName || '';

        if (!id) return '';

        const safeId = id.replace(/'/g, "\\'");
        const safeName = name.replace(/'/g, "\\'");

        return `
          <tr style="cursor: pointer;" ondblclick="window.selectLookupOfficer('${safeId}', '${safeName}')">
            <td>${index + 1}</td>
            <td>${id}</td>
            <td>${name}</td>
          </tr>
        `;
      }).join("") : '';
  }

  window.selectLookupOfficer = (id, name) => {
    if (officerLookupTargetField === 'ReportingTo') {
      // Populate Reporting To fields
      const reportingToId = qs("#ReportingTo");
      const reportingToName = qs("#ReportingToName");
      
      if (reportingToId) reportingToId.value = id;
      if (reportingToName) reportingToName.value = name;
    } else {
      // Populate Officer ID fields (default)
      const officerId = qs("#OfficerId");
      const officerName = qs("#OfficerName");

      if (officerId) officerId.value = id;
      if (officerName) officerName.value = name;
      
      // Auto-fetch the full record only for Officer ID
      void fetchOfficer(id, 0, { quiet: false });
    }

    if (officerLookupModal) officerLookupModal.hide();
  };

  async function ensureServicesLoaded() {
    if (window.StaticDataService?.getAccountOfficers) return;
    if (window.ServiceLoader?.load) {
      await window.ServiceLoader.load([
        "../../assets/js/services/shared/coreApi.js",
        "../../assets/js/services/shared/serviceLoader.js",
        "../../assets/js/services/static-data/staticDataService.js",
      ]);
    }
    if (!window.StaticDataService?.getAccountOfficers) {
      throw new Error("StaticDataService.getAccountOfficers is not available");
    }
  }

  async function loadDesignationDropdown() {
    try {
      console.log("[DesignationDropdown] Starting load...");
      
      const select = qs("#Designation");
      if (!select) {
        console.warn("[DesignationDropdown] Designation select element not found");
        return;
      }

      // Ensure CoreApi is loaded
      if (!window.CoreApi) {
        console.warn("[DesignationDropdown] CoreApi not available");
        return;
      }

      console.log("[DesignationDropdown] Calling CoreApi for OfficerTypeID options...");
      
      const requestData = { CodeID: "OfficerTypeID" };
      const envelope = window.CoreApi.makeRequestEnvelope("p_v1_GetSystemCodes", requestData);
      
      const response = await window.CoreApi.post(
        (window.Environment?.baseUrlCommon || window.Environment?.baseUrlSystemCodes || "http://localhost:5059").replace(/\/+$/, "") + "/api/OldAPI",
        envelope
      );

      console.log("[DesignationDropdown] CoreApi response:", response);

      if (!response?.success || !response?.data) {
        console.warn("[DesignationDropdown] No data returned from CoreApi");
        return;
      }

      const rows = Array.isArray(response.data) ? response.data : [response.data];
      
      // Map the response to options
      const options = rows.map((row) => ({
        value: row.SubCodeID,
        label: row.CodeDescription,
        order: row.DisplayOrder ?? 0
      })).sort((a, b) => a.order - b.order);

      console.log("[DesignationDropdown] Mapped options:", options);

      // Clear existing options
      select.innerHTML = '<option value="">--Select--</option>';

      // Add options
      if (options && options.length > 0) {
        options.forEach((opt) => {
          const option = document.createElement('option');
          option.value = opt.value;
          option.textContent = `${opt.value} - ${opt.label}`;
          select.appendChild(option);
        });
        console.log("[DesignationDropdown] Successfully loaded", options.length, "options");
      } else {
        console.warn("[DesignationDropdown] No options in response");
      }
    } catch (e) {
      console.error("[DesignationDropdown] Error loading options:", e);
      console.error("[DesignationDropdown] Error stack:", e.stack);
    }
  }

  async function loadPeriodDropdown() {
    try {
      console.log("[PeriodDropdown] Starting load...");
      
      const baPeriodSelect = qs("#BaPeriod");
      const mainPeriodSelect = qs("#Period");
      
      if (!baPeriodSelect && !mainPeriodSelect) {
        console.warn("[PeriodDropdown] No period select elements found");
        return;
      }

      // Use LookupService to fetch PaymentFrequencyID options
      if (!window.LookupService) {
        console.warn("[PeriodDropdown] LookupService not available");
        return;
      }

      console.log("[PeriodDropdown] Calling LookupService for PaymentFrequencyID options...");
      
      const options = await window.LookupService.getSystemCodeOptions("PaymentFrequencyID");

      console.log("[PeriodDropdown] LookupService returned options:", options);

      // Populate both dropdowns
      const defaultOption = '<option value="">--Select--</option>';
      
      if (baPeriodSelect) {
        baPeriodSelect.innerHTML = defaultOption;
      }
      if (mainPeriodSelect) {
        mainPeriodSelect.innerHTML = defaultOption;
      }

      // Add options to both
      if (options && options.length > 0) {
        options.forEach((opt) => {
          if (baPeriodSelect) {
            const option1 = document.createElement('option');
            option1.value = opt.value;
            option1.textContent = `${opt.value} - ${opt.label}`;
            baPeriodSelect.appendChild(option1);
          }
          if (mainPeriodSelect) {
            const option2 = document.createElement('option');
            option2.value = opt.value;
            option2.textContent = `${opt.value} - ${opt.label}`;
            mainPeriodSelect.appendChild(option2);
          }
        });
        console.log("[PeriodDropdown] Successfully loaded", options.length, "options");
      } else {
        console.warn("[PeriodDropdown] No options returned from LookupService");
      }
      
      // Ensure main Period stays disabled (read-only display only)
      if (mainPeriodSelect) {
        mainPeriodSelect.disabled = true;
      }
    } catch (e) {
      console.error("[PeriodDropdown] Error loading options:", e);
      console.error("[PeriodDropdown] Error stack:", e.stack);
    }
  }

  function setBusy(nextBusy) {
    state.isBusy = !!nextBusy;
    const buttons = qsa("button");
    buttons.forEach((btn) => {
      if (btn.hasAttribute("data-always-enabled")) return;
      // Keep navigation and close/back responsive where possible.
      if (btn.getAttribute("data-om-ba-action") === "back") return;
      btn.disabled = state.isBusy || btn.disabled;
    });
  }

  function normDateToInput(value) {
    if (!value) return "";
    const s = String(value).trim();
    if (!s) return "";
    // Already yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      console.log(`[DateNorm] Input already YYYY-MM-DD: ${s}`);
      return s;
    }
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      const pad2 = (n) => String(n).padStart(2, "0");
      const result = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
      console.log(`[DateNorm] Converted "${s}" to "${result}"`);
      return result;
    }
    // Try MM/DD/YYYY
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) {
      const mm = String(m[1]).padStart(2, "0");
      const dd = String(m[2]).padStart(2, "0");
      const yyyy = m[3];
      const result = `${yyyy}-${mm}-${dd}`;
      console.log(`[DateNorm] Converted MM/DD/YYYY "${s}" to "${result}"`);
      return result;
    }
    console.warn(`[DateNorm] Could not parse date: "${s}"`);
    return "";
  }

  function getCaseInsensitive(obj, ...keys) {
    if (!obj) return "";
    const lower = Object.create(null);
    Object.keys(obj).forEach((k) => (lower[k.toLowerCase()] = k));
    for (const key of keys) {
      if (!key) continue;
      const k = lower[String(key).toLowerCase()];
      if (k != null) {
        const v = obj[k];
        if (v === null || v === undefined) return "";
        return v;
      }
    }
    return "";
  }

  function extractFirstRow(resp) {
    const tryParseJson = (value) => {
      if (typeof value !== "string") return value;
      const s = value.trim();
      if (!s) return value;
      if (!(s.startsWith("{") || s.startsWith("["))) return value;
      try {
        return JSON.parse(s);
      } catch {
        return value;
      }
    };

    console.log("[OfficerFetch] Response structure:", {
      hasData: !!resp?.data,
      dataKeys: resp?.data ? Object.keys(resp.data) : [],
      topKeys: Object.keys(resp || {}),
      Details01: resp?.data?.Details01 ? (Array.isArray(resp.data.Details01) ? `Array(${resp.data.Details01.length})` : typeof resp.data.Details01) : "undefined",
      Details02: resp?.data?.Details02 ? (Array.isArray(resp.data.Details02) ? `Array(${resp.data.Details02.length})` : typeof resp.data.Details02) : "undefined",
      Details: resp?.Details ? (Array.isArray(resp.Details) ? `Array(${resp.Details.length})` : typeof resp.Details) : "undefined",
    });

    if (resp?.data?.Details01?.[0]) {
      console.log("[OfficerFetch] Details01[0]:", resp.data.Details01[0]);
    }
    if (resp?.data?.Details02?.[0]) {
      console.log("[OfficerFetch] Details02[0]:", resp.data.Details02[0]);
    }
    if (resp?.Details?.[0]) {
      console.log("[OfficerFetch] Details[0]:", resp.Details[0]);
    }

    // Check Details02 FIRST, then Details01, then others
    // Details02 typically contains the main officer record
    const candidates = [
      resp?.data?.Details02,
      resp?.data?.Details2,
      resp?.data?.Details01,
      resp?.data?.Details1,
      resp?.data?.Details,
      resp?.Details02,
      resp?.Details2,
      resp?.Details01,
      resp?.Details1,
      resp?.Details,
      resp?.data,
    ];

    for (const c of candidates) {
      if (Array.isArray(c) && c.length) {
        // Try to parse the first element in case it's a JSON string
        const first = tryParseJson(c[0]);
        // If it's an object, validate it has officer data
        if (first && typeof first === "object" && !Array.isArray(first)) {
          // Must have OfficerID to be considered officer data
          const hasOfficerId = getCaseInsensitive(first, "OfficerID", "OfficerId");
          if (hasOfficerId) {
            console.log("[OfficerFetch] Extracted row object:", first);
            console.log("[OfficerFetch] Row keys:", Object.keys(first));
            const joinedDateField = getCaseInsensitive(first, "JoinedDate", "JoinedOn", "JoinedDateTime");
            console.log("[OfficerFetch] JoinedDate value from row:", joinedDateField);
            return first;
          }
        }
        // If parsing gave us an array, try the first element of that
        if (Array.isArray(first) && first.length) {
          const nested = tryParseJson(first[0]);
          if (nested && typeof nested === "object" && !Array.isArray(nested)) {
            const hasOfficerId = getCaseInsensitive(nested, "OfficerID", "OfficerId");
            if (hasOfficerId) {
              console.log("[OfficerFetch] Extracted nested row object:", nested);
              console.log("[OfficerFetch] Nested row keys:", Object.keys(nested));
              const joinedDateField = getCaseInsensitive(nested, "JoinedDate", "JoinedOn", "JoinedDateTime");
              console.log("[OfficerFetch] JoinedDate value from nested row:", joinedDateField);
              return nested;
            }
          }
        }
      }
    }

    console.log("[OfficerFetch] No row found in response:", resp);
    return null;
  }

  async function ensureClientNameLoaded() {
    const clientId = qs("#ClientId")?.value?.trim();
    const clientName = qs("#ClientName")?.value?.trim();
    const officerName = qs("#OfficerName")?.value?.trim();
    
    console.log("[ClientNameLookup] Starting: clientId=", clientId, "clientName=", clientName, "officerName=", officerName);
    
    // Only attempt to fetch if we have a ClientId but no ClientName
    if (clientId && !clientName) {
      try {
        console.log("[ClientNameLookup] Fetching name for ClientID:", clientId);
        
        // Ensure the ClientSearchService is loaded
        await ensureClientSearchService();
        
        if (!window.ClientSearchService) {
          console.warn("[ClientNameLookup] ClientSearchService not available after loading");
          return;
        }
        
        console.log("[ClientNameLookup] Searching with ClientSearchService...");
        const results = await window.ClientSearchService.searchClients({
          clientId: clientId,
          clientIdOperator: "equals",
          clientName: "",
          clientNameOperator: "like"
        });

        console.log("[ClientNameLookup] Search results:", results);
        
        if (Array.isArray(results) && results.length > 0) {
          const client = results[0];
          console.log("[ClientNameLookup] First result:", client);
          
          const name = client.Name || client.name || client.ClientName || client.Description || "";
          if (name) {
            const nameEl = qs("#ClientName");
            if (nameEl) {
              nameEl.value = name;
              nameEl.dispatchEvent(new Event('change', { bubbles: true }));
              nameEl.dispatchEvent(new Event('input', { bubbles: true }));
              console.log("[ClientNameLookup] Successfully set ClientName to:", name);
            }
            
            // If Officer Name is empty, use the client name as officer name
            const officerNameEl = qs("#OfficerName");
            if (officerNameEl && !officerName) {
              officerNameEl.value = name;
              officerNameEl.dispatchEvent(new Event('change', { bubbles: true }));
              officerNameEl.dispatchEvent(new Event('input', { bubbles: true }));
              console.log("[ClientNameLookup] Successfully set OfficerName to:", name);
            }
          }
        } else {
          console.warn("[ClientNameLookup] No matching client found for ClientID:", clientId, "- this ClientID may not exist in the system or may be a different entity type (e.g., branch/officer ID)");
        }
      } catch (err) {
        console.error("[ClientNameLookup] Error fetching client name:", err);
      }
    } else {
      console.log("[ClientNameLookup] Skipped - clientId:", clientId, "clientName already has value:", !!clientName);
    }
  }

  function applyOfficerToForm(row) {
    if (!row || typeof row !== "object") return;

    try {
      console.log("[OfficerApply] Row object keys:", Object.keys(row));
      console.log("[OfficerApply] Full row data:", JSON.stringify(row));

    const setVal = (id, val) => {
      const el = qs(`#${id}`);
      if (!el) {
        console.log(`[OfficerApply] Element #${id} not found`);
        return;
      }
      const strVal = val == null ? "" : String(val);
      
      // Handle span elements (Behind The Scene fields) - use textContent
      if (el.tagName === "SPAN") {
        el.textContent = strVal;
        console.log(`[OfficerApply] Set #${id} (span) textContent = "${strVal}"`);
        return;
      }
      
      if (el.type === "checkbox") {
        const v = val;
        const s = v == null ? "" : String(v).trim().toLowerCase();
        el.checked = v === true || v === 1 || s === "1" || s === "true" || s === "yes" || s === "y";
        console.log(`[OfficerApply] Set #${id} (checkbox) = ${el.checked}, input val=${val}`);
      }
      else {
        el.value = strVal;
        
        // If this is a Flatpickr date field (type=hidden with _flatpickr property)
        if (el._flatpickr && el.type === "hidden") {
          try {
            if (strVal) {
              // Use GlobalUtils for consistent date parsing if available
              const isoVal = window.GlobalUtils?.parseDateInput ? window.GlobalUtils.parseDateInput(strVal) : strVal;
              el._flatpickr.setDate(isoVal, true); // true = trigger change event
              console.log(`[OfficerApply] Set Flatpickr #${id} to "${isoVal}" (from "${strVal}")`);
            } else {
              el._flatpickr.clear();
              console.log(`[OfficerApply] Cleared Flatpickr #${id}`);
            }
          } catch (e) {
            console.warn(`[OfficerApply] Failed to set Flatpickr #${id}:`, e);
          }
        }
        
        // Force a change event to trigger any listeners
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('input', { bubbles: true }));
        const actualValue = el.value;
        console.log(`[OfficerApply] Set #${id} (${el.type}) = "${actualValue}" (requested: "${strVal}", element.value check: "${el.value}")`);
        // Double check it's actually set
        setTimeout(() => {
          console.log(`[OfficerApply] Delayed check #${id}: value="${el.value}", placeholder="${el.placeholder}"`);
        }, 100);
      }
    };

    // === Officer View Fields ===
    setVal("OfficerId", getCaseInsensitive(row, "OfficerID", "OfficerId"));
    setVal("OfficerName", getCaseInsensitive(row, "Name", "OfficerName", "Names"));
    setVal("ClientId", getCaseInsensitive(row, "ClientID", "ClientId"));
    setVal("ClientName", getCaseInsensitive(row, "ClientName", "Client"));

    const joinedDateValue = getCaseInsensitive(row, "JoinedDate", "JoinedOn", "JoinedDateTime");
    const joinedDateFormatted = normDateToInput(joinedDateValue);
    console.log("[OfficerApply] JoinedDate raw:", joinedDateValue, "-> formatted:", joinedDateFormatted);
    setVal("JoinedOn", joinedDateFormatted);
    
    setVal("Designation", getCaseInsensitive(row, "OfficerTypeID", "Designation", "OfficerTypeId"));

    setVal("BaseBranch", getCaseInsensitive(row, "ReportingBranchID", "BaseBranch", "OurBranchID"));
    setVal("BaseBranchName", getCaseInsensitive(row, "ReportingBranch", "ReportingBranchName", "BaseBranchName", "BranchName"));

    setVal("ReportingTo", getCaseInsensitive(row, "ReportingOfficerID", "ReportingTo"));
    setVal("ReportingToName", getCaseInsensitive(row, "ReportingOfficer", "ReportingOfficerName", "ReportingToName"));

    setVal("AccountId", getCaseInsensitive(row, "AccountID", "AccountId"));
    setVal("AccountName", getCaseInsensitive(row, "AccountName", "Account"));

    setVal("SanctioningAuthority", getCaseInsensitive(row, "IsSanctionAuthority", "SanctioningAuthority"));

    setVal("Period", getCaseInsensitive(row, "RestrictedPeriodID", "Period", "RestrictedPeriodId"));
    setVal("NoOfLoans", getCaseInsensitive(row, "NoOfLoans"));
    setVal("FixedAmount", formatAmount(getCaseInsensitive(row, "RestrictedAmount", "FixedAmount", "RestrictedAmountValue")));

    setVal("Status", getCaseInsensitive(row, "Status", "STATUSFLAG"));
    setVal("ResignedOn", normDateToInput(getCaseInsensitive(row, "ResignedDate", "ResignedOn")));

    setVal("CreatedBy", getCaseInsensitive(row, "CreatedBy"));
    setVal("CreatedOn", normDateToInput(getCaseInsensitive(row, "CreatedOn")));
    setVal("ModifiedBy", getCaseInsensitive(row, "ModifiedBy"));
    setVal("ModifiedOn", normDateToInput(getCaseInsensitive(row, "ModifiedOn")));
    setVal("SupervisedBy", getCaseInsensitive(row, "SupervisedBy"));
    setVal("SupervisedOn", normDateToInput(getCaseInsensitive(row, "SupervisedOn")));

    // === Branch Assigned (Ba*) View Fields ===
    // Populate the branch-assigned screen with the same officer's reporting branch and restriction data
    setVal("BaReportingBranch", getCaseInsensitive(row, "ReportingBranchID", "BaseBranch", "OurBranchID"));
    setVal("BaReportingBranchName", getCaseInsensitive(row, "ReportingBranch", "ReportingBranchName", "BaseBranchName", "BranchName"));
    setVal("BaPeriod", getCaseInsensitive(row, "RestrictedPeriodID", "Period", "RestrictedPeriodId"));
    setVal("BaNoOfLoans", getCaseInsensitive(row, "NoOfLoans"));
    setVal("BaFixedAmount", formatAmount(getCaseInsensitive(row, "RestrictedAmount", "FixedAmount", "RestrictedAmountValue")));

    // Behind The Scene fields for branch-assigned view
    setVal("BaCreatedBy", getCaseInsensitive(row, "CreatedBy"));
    setVal("BaCreatedOn", normDateToInput(getCaseInsensitive(row, "CreatedOn")));
    setVal("BaModifiedBy", getCaseInsensitive(row, "ModifiedBy"));
    setVal("BaModifiedOn", normDateToInput(getCaseInsensitive(row, "ModifiedOn")));
    setVal("BaSupervisedBy", getCaseInsensitive(row, "SupervisedBy"));
    setVal("BaSupervisedOn", normDateToInput(getCaseInsensitive(row, "SupervisedOn")));

    const updateCount = Number(getCaseInsensitive(row, "UpdateCount", "Updatecount", "UpdateCnt")) || 0;
    state.currentUpdateCount = updateCount;
    console.log("[OfficerApply] Done. UpdateCount:", updateCount);
    } catch (e) {
      console.error("[OfficerApply] Error applying officer to form:", e);
      console.error("[OfficerApply] Error stack:", e.stack);
    }
  }

  async function loadBranchAssignments(officerId, officerRow) {
    try {
      if (!officerId) {
        console.log('[BranchAssignments] No officer ID provided');
        renderBranchAssignmentsGrid([]);
        return;
      }

      console.log('[BranchAssignments] Loading for officer:', officerId);

      // First check if DetailRecords is in the officer row (from save operations)
      let detailRecords = null;
      if (officerRow) {
        for (let key in officerRow) {
          if (key.toLowerCase() === 'detailrecords') {
            detailRecords = officerRow[key];
            console.log('[BranchAssignments] Found DetailRecords in officer row with key:', key);
            break;
          }
        }
      }

      // If DetailRecords found, parse and use it
      if (detailRecords) {
        const rows = parseDetailRecords(detailRecords);
        console.log('[BranchAssignments] Parsed rows from DetailRecords:', rows.length);
        renderBranchAssignmentsGrid(rows);
        return;
      }

      // Try fetching from t_AccountOfficerDetail table
      console.log('[BranchAssignments] No DetailRecords in officer row, trying API');
      await fetchBranchAssignmentsViaAPI(officerId);
    } catch (e) {
      console.error('[BranchAssignments] Error loading:', e);
      console.error('[BranchAssignments] Error stack:', e.stack);
      renderBranchAssignmentsGrid([]);
    }
  }

  async function fetchBranchAssignmentsViaAPI(officerId) {
    try {
      await ensureServicesLoaded();
      const ctx = getContext();
      const env = window.Environment || {};
      const operatorId = (env.userId || env.operatorId || "").toString().trim() || "SYSTEM";

      // Try multiple approaches to fetch branch assignments
      let result = null;

      // Approach 1: Try p_GetAccountOfficerDetail procedure
      console.log('[BranchAssignments] Trying p_GetAccountOfficerDetail procedure...');
      const params1 = {
        BankID: ctx.BankID,
        OfficerID: officerId,
        OurBranchID: ctx.BankID,  // The bank ID, not the reporting branch
        OperatorID: operatorId
      };

      try {
        const envelope1 = window.CoreApi.makeRequestEnvelope("dbo.p_GetAccountOfficerDetail", params1);
        result = await window.CoreApi.post(
          `${(env.baseUrlCommon || "http://localhost:5059").replace(/\/+$/g, "")}/api/OldAPI`,
          envelope1
        );
        console.log('[BranchAssignments] p_GetAccountOfficerDetail Response:', result);
      } catch (e) {
        console.log('[BranchAssignments] p_GetAccountOfficerDetail failed:', e.message);
        result = null;
      }

      // Approach 2: If first approach failed, try p_GetSearchResult with different parameters
      if (!result?.success) {
        console.log('[BranchAssignments] Trying p_GetSearchResult with AccountOfficerDetail table...');
        const params2 = {
          TableID: "AccountOfficerDetail",
          RefID: officerId,
          PrevOrNext: 0,
          AdvFilterString: `OfficerID = '${officerId}' AND BankID = '${ctx.BankID}'`,
          OperatorID: operatorId,
          ModuleID: 5130
        };

        const envelope2 = window.CoreApi.makeRequestEnvelope("dbo.p_GetSearchResult", params2);
        result = await window.CoreApi.post(
          `${(env.baseUrlCommon || "http://localhost:5059").replace(/\/+$/g, "")}/api/OldAPI`,
          envelope2
        );
        console.log('[BranchAssignments] p_GetSearchResult Response:', result);
      }

      console.log('[BranchAssignments] Full API Response:', result);
      console.log('[BranchAssignments] Response.success:', result?.success);

      if (result?.success) {
        // Extract rows from multiple possible response structures
        let rows = [];
        
        // Check Details01 array (actual branch assignments)
        if (Array.isArray(result?.data?.Details01) && result.data.Details01.length > 0) {
          rows = result.data.Details01;
          console.log('[BranchAssignments] Found rows in data.Details01:', rows.length);
        }
        // Check Details array
        else if (Array.isArray(result?.Details01) && result.Details01.length > 0) {
          rows = result.Details01;
          console.log('[BranchAssignments] Found rows in Details01:', rows.length);
        }
        // Check Details array (fallback)
        else if (Array.isArray(result?.Details) && result.Details.length > 0 && result.Details[0].AssignedBranchID) {
          rows = result.Details;
          console.log('[BranchAssignments] Found rows in Details:', rows.length);
        }
        // Check data.Details array
        else if (Array.isArray(result?.data?.Details) && result.data.Details.length > 0 && result.data.Details[0].AssignedBranchID) {
          rows = result.data.Details;
          console.log('[BranchAssignments] Found rows in data.Details:', rows.length);
        }
        // Check if data itself is an array
        else if (Array.isArray(result?.data) && result.data.length > 0) {
          rows = result.data;
          console.log('[BranchAssignments] Found rows in data:', rows.length);
        }
        
        console.log('[BranchAssignments] Extracted rows:', rows.length);
        if (rows.length > 0) {
          console.log('[BranchAssignments] First row:', rows[0]);
          console.log('[BranchAssignments] First row keys:', Object.keys(rows[0]));
        }
        
        renderBranchAssignmentsGrid(rows);
        return;
      }

      console.log('[BranchAssignments] API calls unsuccessful or returned no data');
      renderBranchAssignmentsGrid([]);
    } catch (e) {
      console.error('[BranchAssignments] Error in API call:', e);
      console.error('[BranchAssignments] Error message:', e.message);
      renderBranchAssignmentsGrid([]);
    }
  }

  function parseDetailRecords(xmlString) {
    console.log('[ParseDetailRecords] Input string:', xmlString);
    console.log('[ParseDetailRecords] Input type:', typeof xmlString);
    console.log('[ParseDetailRecords] Input length:', xmlString?.length);

    if (!xmlString || typeof xmlString !== 'string') {
      console.log('[ParseDetailRecords] Invalid input - returning empty array');
      return [];
    }

    const rows = [];
    
    // Match all <dt_AccountOfficerDetail>...</dt_AccountOfficerDetail> blocks
    const pattern = /<dt_AccountOfficerDetail>([\s\S]*?)<\/dt_AccountOfficerDetail>/g;
    console.log('[ParseDetailRecords] Pattern test on string:', pattern.test(xmlString));
    
    let match;
    let matchCount = 0;

    while ((match = pattern.exec(xmlString)) !== null) {
      matchCount++;
      const content = match[1];
      console.log(`[ParseDetailRecords] Match ${matchCount}:`, content);
      
      // Extract fields using regex
      const getField = (fieldName) => {
        const regex = new RegExp(`<${fieldName}>(.*?)<\/${fieldName}>`, 'i');
        const m = content.match(regex);
        const value = m ? m[1] : '';
        console.log(`[ParseDetailRecords] Field ${fieldName}:`, value);
        return value;
      };

      const assignedBranchId = getField('AssignedBranchID');
      const noOfLoans = getField('NoOFLoans') || getField('NoofLoans') || getField('NoOfLoans');
      const restrictedAmount = getField('RestrictedAmount');

      console.log(`[ParseDetailRecords] Extracted: BranchID=${assignedBranchId}, Loans=${noOfLoans}, Amount=${restrictedAmount}`);

      if (assignedBranchId) {
        rows.push({
          AssignedBranchID: assignedBranchId,
          NoOfLoans: noOfLoans,
          RestrictedAmount: restrictedAmount,
        });
      }
    }

    console.log('[ParseDetailRecords] Total matches found:', matchCount);
    console.log('[ParseDetailRecords] Returning rows:', rows.length, rows);
    return rows;
  }

  function renderBranchAssignmentsGrid(rows) {
    // Convert API rows to state format and store in branchAssignedRows
    state.branchAssignedRows = (rows || []).map(row => {
      // Handle field names from t_AccountOfficerDetail
      const branchId = getCaseInsensitive(row, 'AssignedBranchID', 'BranchID', 'OurBranchID') || '';
      
      // Try to find branch name from baseline if not in the data
      let branchName = getCaseInsensitive(row, 'BranchName', 'Branch', 'BranchDescription') || '';
      if (!branchName && branchId && branchLookupState.baselineRows?.length) {
        const foundBranch = branchLookupState.baselineRows.find(b => b.id === branchId);
        branchName = foundBranch?.name || '';
      }
      
      const period = getCaseInsensitive(row, 'RestrictedPeriodID', 'Period', 'RestrictedPeriod', 'PeriodID') || '';
      const noOfLoans = getCaseInsensitive(row, 'NoOfLoans', 'NoOFLoans', 'LoanCount') || '0';
      const fixedAmount = formatAmount(getCaseInsensitive(row, 'RestrictedAmount', 'FixedAmount', 'Amount') || '0');
      
      // Audit fields for Behind The Scene
      const createdBy = getCaseInsensitive(row, 'CreatedBy', 'CREATEDBY') || '';
      const createdOn = getCaseInsensitive(row, 'CreatedOn', 'CREATEDON') || '';
      const modifiedBy = getCaseInsensitive(row, 'ModifiedBy', 'MODIFIEDBY') || '';
      const modifiedOn = getCaseInsensitive(row, 'ModifiedOn', 'MODIFIEDON') || '';
      const supervisedBy = getCaseInsensitive(row, 'SupervisedBy', 'SUPERVISEDBY') || '';
      const supervisedOn = getCaseInsensitive(row, 'SupervisedOn', 'SUPERVISEDON') || '';

      return {
        branchId,
        branchName,
        period,
        periodText: period, // Will be updated if we have dropdown labels
        noOfLoans,
        fixedAmount,
        createdBy,
        createdOn,
        modifiedBy,
        modifiedOn,
        supervisedBy,
        supervisedOn,
        isNew: false,      // Loaded from DB, not new
        isAltered: false   // Initially unaltered
      };
    });
    
    // Reset selection
    state.selectedBranchRowIndex = -1;
    
    // Use the unified grid rendering function
    renderBranchAssignedGrid();
  }

  async function fetchOfficer(officerId, direction = 0, options = {}) {
    const quiet = !!options.quiet;
    const id = (officerId || "").trim();
    if (!id) {
      if (!quiet) setToast("Please enter Officer ID", "warning");
      return;
    }

    if (state.isBusy) return;
    state.isBusy = true;
    updateActionButtons();

    try {
      await ensureServicesLoaded();
      const ctx = getContext();

      const payload = {
        BankID: ctx.BankID,
        OurBranchID: ctx.OurBranchID,
        OfficerID: id,
        OperatorID: ctx.OperatorID,
        Direction: direction,
      };

      const resp = await window.StaticDataService.getAccountOfficers(payload);
      const row = extractFirstRow(resp);

      if (!row || !getCaseInsensitive(row, "OfficerID", "OfficerId")) {
        state.hasLoaded = false;
        state.recordNotFound = true;
        if (!quiet) setToast("Record not found. You can Add.", "info");
        return;
      }

      // Ensure designation dropdown is loaded before applying form data
      await loadDesignationDropdown();

      applyOfficerToForm(row);
      
      // Store the loaded officer row for modal refresh
      state.lastLoadedOfficerRow = row;
      
      // Fetch client name if not present in the officer data
      await ensureClientNameLoaded();
      
      // Load branch assignments for this officer from DetailRecords
      await loadBranchAssignments(id, row);
      
      console.log('[Officers] After loadBranchAssignments, about to set state');
      state.hasLoaded = true;
      state.recordNotFound = false;
      updateBranchAssignedButtonState();
      setOfficerMode(MODES.VIEW);
      console.log('[Officers] About to call showSuccessMessage, quiet=', quiet);
      if (!quiet) showSuccessMessage(`Officer details loaded successfully. Officer ID: ${id}`);
    } catch (e) {
      console.error(e);
      if (!quiet) setToast(e?.message || "Error fetching officer.", "danger");
      else throw e;
    } finally {
      state.isBusy = false;
      updateActionButtons();
    }
  }

  function clearOfficerForm({ keepOfficerId = false } = {}) {
    const officerId = keepOfficerId ? (qs("#OfficerId")?.value || "") : "";
    
    // Hide validation summary banner
    hideValidationSummary();
    
    // Clear all form fields in main form container
    const mainForm = qs('[data-main-form]') || qs('#mainFormContainer');
    if (mainForm) {
      qsa("input, select, textarea", mainForm).forEach((el) => {
        if (el.type === "button" || el.type === "submit" || el.type === "reset") return;
        if (el.type === "hidden") return; // Don't clear hidden fields
        if (el.type === "checkbox") el.checked = false;
        else el.value = "";
      });
      // Clear span values in behind-scene section
      qsa(".behind-scene-value", mainForm).forEach((el) => {
        el.textContent = "";
      });
    }
    
    // Clear branch-assigned view
    const branchRoot = qs('#branchAssignedContainer');
    if (branchRoot) {
      qsa("input, select, textarea", branchRoot).forEach((el) => {
        if (el.type === "button" || el.type === "submit" || el.type === "reset") return;
        if (el.type === "hidden") return;
        if (el.type === "checkbox") el.checked = false;
        else el.value = "";
      });
    }
    
    if (keepOfficerId) {
      const el = qs("#OfficerId");
      if (el) el.value = officerId;
    }
    
    // Clear branch assignments grid
    renderBranchAssignmentsGrid([]);
    
    state.hasLoaded = false;
    state.recordNotFound = false;
    state.currentUpdateCount = 0;
    state.lastLoadedOfficerRow = null;
    updateBranchAssignedButtonState();
    
    // Update action buttons to reflect cleared state
    updateActionButtons();
  }

  function buildOfficerSavePayload() {
    const ctx = getContext();
    const now = new Date();
    const pad2 = (n) => String(n).padStart(2, "0");
    const formatMDYHMS = (d) => {
      const mm = pad2(d.getMonth() + 1);
      const dd = pad2(d.getDate());
      const yyyy = d.getFullYear();
      const hh = pad2(d.getHours());
      const mi = pad2(d.getMinutes());
      const ss = pad2(d.getSeconds());
      return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
    };

    const ymdToMdyStartOfDay = (ymd) => {
      const m = String(ymd || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!m) return String(ymd || "").trim();
      return `${m[2]}/${m[3]}/${m[1]} 00:00:00`;
    };

    // Helper to get value from input or textContent from span
    const getFieldValue = (id) => {
      const el = qs(`#${id}`);
      if (!el) return "";
      if (el.tagName === "SPAN") return el.textContent?.trim() || "";
      return el.value?.trim() || "";
    };

    const officerId = getFieldValue("OfficerId");
    const createdByExisting = getFieldValue("CreatedBy");
    const createdOnExistingRaw = getFieldValue("CreatedOn");
    const createdOnExisting = createdOnExistingRaw ? ymdToMdyStartOfDay(createdOnExistingRaw) : "";

    const joinedDateInput = qs("#JoinedOn")?.value?.trim() || "";
    const joinedDate = joinedDateInput
      ? (() => {
          const m = joinedDateInput.match(/^(\d{4})-(\d{2})-(\d{2})$/);
          if (!m) return joinedDateInput;
          return `${m[2]}/${m[3]}/${m[1]} 00:00:00`;
        })()
      : "";

    const newRecord =
      state.officerMode === MODES.ADD
        ? 1
        : (state.currentUpdateCount || 0);

    return {
      BankID: ctx.BankID,
      OfficerID: officerId,
      Name: qs("#OfficerName")?.value?.trim() || "",
      ClientID: qs("#ClientId")?.value?.trim() || "",
      JoinedDate: joinedDate,
      OfficerTypeID: qs("#Designation")?.value?.trim() || "",
      ReportingBranchID: qs("#BaseBranch")?.value?.trim() || "",
      ReportingOfficerID: qs("#ReportingTo")?.value?.trim() || "",
      RestrictedPeriodID: qs("#Period")?.value?.trim() || "",
      NoOfLoans: qs("#NoOfLoans")?.value?.trim() || "0",
      RestrictedAmount: qs("#FixedAmount")?.value?.trim() || "0",
      IsSanctionAuthority: !!qs("#SanctioningAuthority")?.checked,
      AccountID: qs("#AccountId")?.value?.trim() || "",
      CreatedBy: createdByExisting || ctx.OperatorID,
      CreatedOn: createdOnExisting || formatMDYHMS(now),
      ModifiedBy: ctx.OperatorID,
      ModifiedOn: formatMDYHMS(now),
      SupervisedBy: getFieldValue("SupervisedBy"),
      NewRecord: newRecord,
    };
  }

  async function handleSaveOfficer() {
    if (state.officerMode === MODES.VIEW) return;
    if (state.isBusy) return;

    const clientId = qs("#ClientId")?.value?.trim() || "";
    const officerId = qs("#OfficerId")?.value?.trim() || "";
    
    // In ADD mode, Officer ID comes from Client ID; in UPDATE mode, Officer ID is required
    if (state.officerMode === MODES.ADD) {
      if (!clientId) {
        setToast("Please select a Client ID", "warning");
        return;
      }
      // Set Officer ID to Client ID for new records
      const officerIdInput = qs("#OfficerId");
      if (officerIdInput) {
        officerIdInput.value = clientId;
      }
    } else {
      if (!officerId) {
        setToast("Please enter Officer ID", "warning");
        return;
      }
    }

    const form = qs("#officers-maintenance-form");
    if (form && typeof form.reportValidity === "function") {
      const ok = form.reportValidity();
      if (!ok) {
        setToast("Please fill the required fields.", "warning");
        return;
      }
    }

    state.isBusy = true;
    updateActionButtons();

    try {
      await ensureServicesLoaded();
      const payload = buildOfficerSavePayload();
      console.log("[OfficerSave] Payload to save:", payload);
      const resp = await window.StaticDataService.addEditAccountOfficers(payload);
      if (!resp?.success) {
        setToast(resp?.message || "Save failed.", "danger");
        return;
      }

      // After saving main officer, save branch assignments if they exist in state
      if (state.branchAssignedRows && state.branchAssignedRows.length > 0) {
        // Build DetailRecords XML for branch assignments from state
        let detailXml = '<dt_AccountOfficerDetail>';
        state.branchAssignedRows.forEach(row => {
          detailXml += `<dt_AccountOfficerDetail>
            <AssignedBranchID>${escapeXml(row.branchId || '')}</AssignedBranchID>
            <RestrictedPeriodID>${escapeXml(row.period || '')}</RestrictedPeriodID>
            <NoOFLoans>${escapeXml(row.noOfLoans || '')}</NoOFLoans>
            <RestrictedAmount>${escapeXml(row.fixedAmount || '')}</RestrictedAmount>
            <ButtonMark>A</ButtonMark>
          </dt_AccountOfficerDetail>`;
        });
        detailXml += '</dt_AccountOfficerDetail>';

        const ctx = getContext();
        const branchPayload = {
          BankID: ctx.BankID,
          OfficerID: payload.OfficerID,
          OperatedBy: ctx.OperatorID,
          UpdateCount: payload.NewRecord,
          DetailRecords: detailXml
        };

        console.log("[OfficerSave] Branch assignments payload:", branchPayload);
        const branchResp = await window.StaticDataService.addEditAccountOfficerDetail(branchPayload);
        if (!branchResp?.success) {
          console.warn("[OfficerSave] Warning: Branch assignments may not have saved properly", branchResp?.message);
        }
      }

      const modeText = state.officerMode === MODES.ADD ? "created" : "updated";
      setToast(`Officer ${modeText} successfully.`, "success");
      // Clear the form after successful save
      clearOfficerForm({ keepOfficerId: false });
      setOfficerMode(MODES.VIEW);
    } catch (e) {
      console.error(e);
      setToast(e?.message || "Error saving officer.", "danger");
    } finally {
      state.isBusy = false;
      updateActionButtons();
    }
  }

  async function handleDeleteOfficer() {
    if (!state.hasLoaded) {
      setToast("Load a record before deleting.", "warning");
      return;
    }
    if (state.isBusy) return;

    const officerId = qs("#OfficerId")?.value?.trim() || "";
    if (!officerId) {
      setToast("Please enter Officer ID", "warning");
      return;
    }

    const result = await window.Swal.fire({
      title: 'Delete Record?',
      text: `Are you sure you want to delete officer ${officerId}? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      confirmButtonColor: '#dc3545',
      cancelButtonText: 'Cancel',
      cancelButtonColor: '#6c757d'
    });

    if (!result.isConfirmed) return;

    state.isBusy = true;
    updateActionButtons();

    try {
      await ensureServicesLoaded();
      const ctx = getContext();
      const payload = {
        BankID: ctx.BankID,
        OfficerID: officerId,
        NewRecord: state.currentUpdateCount || 0,
      };
      const resp = await window.StaticDataService.deleteAccountOfficers(payload);
      if (!resp?.success) {
        setToast(resp?.message || "Delete failed.", "danger");
        return;
      }
      setToast("Officer deleted successfully.", "success");
      clearOfficerForm({ keepOfficerId: false });
      setOfficerMode(MODES.VIEW);
    } catch (e) {
      console.error(e);
      setToast(e?.message || "Error deleting officer.", "danger");
    } finally {
      state.isBusy = false;
      updateActionButtons();
    }
  }

  /**
   * Save branch assignments for the current officer
   */
  async function handleSaveBranchAssignments() {
    if (state.branchMode === MODES.VIEW) return;
    if (state.isBusy) return;

    const officerId = qs("#OfficerId")?.value?.trim() || "";
    if (!officerId) {
      setToast("No officer loaded. Please load an officer first.", "warning");
      return;
    }

    if (!state.hasLoaded) {
      setToast("Please load an officer record first.", "warning");
      return;
    }

    state.isBusy = true;
    updateActionButtons();

    try {
      await ensureServicesLoaded();
      const ctx = getContext();

      // Fetch fresh officer data to get current UpdateCount using p_GetAccountOfficerDetail
      console.log("[BranchSave] Fetching fresh officer data for UpdateCount...");
      let freshUpdateCount = 0;
      try {
        const env = window.Environment || {};
        const baseUrl = (env.baseUrlCommon || "http://localhost:5059").replace(/\/+$/g, "");
        const payload = {
          BankID: ctx.BankID,
          OfficerID: officerId,
          OurBranchID: ctx.BankID,  // Required parameter
          OperatorID: ctx.OperatorID || "SYSTEM"
        };
        const envelope = window.CoreApi.makeRequestEnvelope("dbo.p_GetAccountOfficerDetail", payload);
        const resp = await window.CoreApi.post(`${baseUrl}/api/OldAPI`, envelope);
        console.log("[BranchSave] Fresh officer response:", resp);
        if (resp?.success && resp.Details?.length > 0) {
          const row = resp.Details[0];
          freshUpdateCount = Number(row.UpdateCount || row.Updatecount || row.UpdateCnt || 0);
          console.log("[BranchSave] Fresh UpdateCount from DB:", freshUpdateCount);
        } else {
          console.warn("[BranchSave] No officer data returned, using cached UpdateCount");
          freshUpdateCount = state.currentUpdateCount || 0;
        }
      } catch (e) {
        console.warn("[BranchSave] Could not fetch fresh UpdateCount, using cached:", e.message);
        freshUpdateCount = state.currentUpdateCount || 0;
      }

      // Build DetailRecords XML - only include NEW or ALTERED records
      // Unchanged existing records don't need to be sent
      const changedRows = state.branchAssignedRows.filter(row => row.isNew || row.isAltered);
      
      if (changedRows.length === 0) {
        setToast("No changes to save.", "info");
        return;
      }
      
      console.log("[BranchSave] Changed rows to save:", changedRows.length);
      
      let detailXml = '<dt_AccountOfficerDetail>';
      changedRows.forEach(row => {
        // ButtonMark: 'N' for new records, 'A' for altered existing records
        const buttonMark = row.isNew ? 'N' : 'A';
        detailXml += `<dt_AccountOfficerDetail>
          <AssignedBranchID>${escapeXml(row.branchId || '')}</AssignedBranchID>
          <RestrictedPeriodID>${escapeXml(row.period || '')}</RestrictedPeriodID>
          <NoOFLoans>${escapeXml(row.noOfLoans || '')}</NoOFLoans>
          <RestrictedAmount>${escapeXml(row.fixedAmount || '')}</RestrictedAmount>
          <ButtonMark>${buttonMark}</ButtonMark>
        </dt_AccountOfficerDetail>`;
      });
      detailXml += '</dt_AccountOfficerDetail>';

      const savePayload = {
        BankID: ctx.BankID,
        OfficerID: officerId,
        OperatedBy: ctx.OperatorID,
        UpdateCount: freshUpdateCount,
        DetailRecords: detailXml
      };

      console.log("[BranchSave] Saving branch assignments with payload:");
      console.log("[BranchSave] OfficerID:", officerId);
      console.log("[BranchSave] UpdateCount:", freshUpdateCount);
      console.log("[BranchSave] Total rows:", state.branchAssignedRows.length);
      console.log("[BranchSave] Changed rows being saved:", changedRows.map(r => ({
        branchId: r.branchId,
        isNew: r.isNew,
        isAltered: r.isAltered
      })));
      console.log("[BranchSave] DetailRecords XML:", detailXml);
      
      const resp = await window.StaticDataService.addEditAccountOfficerDetail(savePayload);
      console.log("[BranchSave] API Response:", resp);
      
      if (!resp?.success) {
        setToast(resp?.message || "Failed to save branch assignments.", "danger");
        return;
      }

      console.log("[BranchSave] Save successful, reloading branch assignments...");
      setToast("Branch assignments saved successfully.", "success");
      setBranchMode(MODES.VIEW);
      state.branchGridAction = null;
      state.selectedBranchRowIndex = -1;
      updateBranchGridButtons();
      
      // Reload branch assignments via API to show updated data
      await fetchBranchAssignmentsViaAPI(officerId);
      console.log("[BranchSave] Branch assignments reloaded");
    } catch (e) {
      console.error("[BranchSave] Error:", e);
      setToast(e?.message || "Error saving branch assignments.", "danger");
    } finally {
      state.isBusy = false;
      updateActionButtons();
    }
  }

  async function handleResignOfficer() {
    if (!state.hasLoaded) {
      setToast("Load a record before resigning.", "warning");
      return;
    }
    if (state.isBusy) return;

    const officerId = qs("#OfficerId")?.value?.trim() || "";
    if (!officerId) {
      setToast("Please enter Officer ID", "warning");
      return;
    }

    const result = await window.Swal.fire({
      title: 'Resign Officer?',
      text: `Are you sure you want to resign officer ${officerId}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Resign',
      confirmButtonColor: '#dc3545',
      cancelButtonText: 'Cancel',
      cancelButtonColor: '#6c757d'
    });

    if (!result.isConfirmed) return;

    try {
      await ensureServicesLoaded();
      const ctx = getContext();
      const now = new Date();
      const pad2 = (n) => String(n).padStart(2, "0");
      const formatMDYHMS = (d) => {
        const mm = pad2(d.getMonth() + 1);
        const dd = pad2(d.getDate());
        const yyyy = d.getFullYear();
        const hh = pad2(d.getHours());
        const mi = pad2(d.getMinutes());
        const ss = pad2(d.getSeconds());
        return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
      };

      const ymdToMdyStartOfDay = (ymd) => {
        const m = String(ymd || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!m) return String(ymd || "").trim();
        return `${m[2]}/${m[3]}/${m[1]} 00:00:00`;
      };

      const resignedInput = qs("#ResignedOn")?.value?.trim() || "";
      const resignedDate = resignedInput ? ymdToMdyStartOfDay(resignedInput) : formatMDYHMS(now);

      const payload = {
        OurBranchID: ctx.OurBranchID,
        OfficerID: officerId,
        ResignedDate: resignedDate,
        ModifiedBy: ctx.OperatorID,
        ModifiedOn: formatMDYHMS(now),
        SupervisedBy: qs("#SupervisedBy")?.value?.trim() || "",
        NewRecord: state.currentUpdateCount || 0,
      };

      const resp = await window.StaticDataService.resignAccountOfficers(payload);
      if (!resp?.success) {
        setToast(resp?.message || "Resign failed.", "danger");
        return;
      }
      setToast("Officer resigned successfully.", "success");
      clearOfficerForm({ keepOfficerId: false });
      setOfficerMode(MODES.VIEW);
    } catch (e) {
      console.error(e);
      setToast(e?.message || "Error resigning officer.", "danger");
    } finally {
      state.isBusy = false;
      updateActionButtons();
    }
  }

  function setOfficerMode(nextMode) {
    state.officerMode = nextMode;

    const pill = qs("[data-page-function-pill]");
    if (pill) pill.textContent = `Mode · ${nextMode}`;

    const officerRoot = qs('[data-main-form]');
    if (!officerRoot) return;

    const isEditable = nextMode === MODES.ADD || nextMode === MODES.UPDATE;
    const isAddMode = nextMode === MODES.ADD;

    qsa("input, select, textarea", officerRoot).forEach((el) => {
      if (el.hasAttribute("data-om-audit")) {
        el.disabled = true;
        return;
      }
      if (el.hasAttribute("data-always-enabled")) {
        // In ADD mode, disable Officer ID field specifically
        if (isAddMode && (el.id === "OfficerId" || el.id === "OfficerName")) {
          el.disabled = true;
          return;
        }
        el.disabled = false;
        return;
      }
      el.disabled = !isEditable;
    });

    qsa("[data-always-enabled]", officerRoot).forEach((el) => {
      // In ADD mode, keep Officer ID lookup disabled
      if (isAddMode && el.id === "btnOfficerLookup") {
        setButtonDisabled(el, true);
        return;
      }
      el.disabled = false;
    });

    qsa("[data-om-audit]", officerRoot).forEach((el) => {
      el.disabled = true;
    });

    // Disable/enable lookup buttons based on mode (branch, account, user controls)
    qsa(".kairo-branch-control .btn-lookup", officerRoot).forEach((btn) => {
      if (btn.hasAttribute("data-always-enabled")) return;
      setButtonDisabled(btn, !isEditable);
    });

    qsa(".kairo-account-control .btn-lookup", officerRoot).forEach((btn) => {
      if (btn.hasAttribute("data-always-enabled")) return;
      setButtonDisabled(btn, !isEditable);
    });

    qsa(".kairo-user-control .btn-lookup", officerRoot).forEach((btn) => {
      // In ADD mode, disable Officer lookup button specifically
      if (isAddMode && btn.id === "btnOfficerLookup") {
        setButtonDisabled(btn, true);
        return;
      }
      if (btn.hasAttribute("data-always-enabled")) return;
      setButtonDisabled(btn, !isEditable);
    });

    updateActionButtons();
  }

  function setBranchMode(nextMode) {
    state.branchMode = nextMode;

    const branchRoot = qs('#branchAssignedContainer');
    if (!branchRoot) return;

    const isEditable = nextMode === MODES.UPDATE;

    qsa("input, select, textarea", branchRoot).forEach((el) => {
      if (el.hasAttribute("data-om-audit")) {
        el.disabled = true;
        return;
      }
      if (el.hasAttribute("data-always-enabled")) {
        el.disabled = false;
        return;
      }
      el.disabled = !isEditable;
    });

    qsa("[data-always-enabled]", branchRoot).forEach((el) => {
      el.disabled = false;
    });

    qsa("[data-om-audit]", branchRoot).forEach((el) => {
      el.disabled = true;
    });

    // Enable/disable BaPeriod dropdown based on mode
    const baPeriod = qs('#BaPeriod');
    if (baPeriod) baPeriod.disabled = !isEditable;

    // Update grid button states based on mode and current action
    updateBranchGridButtons();

    // Disable/enable branch lookup button based on mode
    qsa(".om-ba-lookup", branchRoot).forEach((btn) => {
      if (btn.hasAttribute("data-always-enabled")) return;
      setButtonDisabled(btn, !isEditable);
    });

    const saveBtn = qs('[data-om-ba-action="save"]');
    if (saveBtn) saveBtn.disabled = !isEditable;

    // Toggle Edit button: disabled when editing, enabled when viewing
    const editBtn = qs('[data-om-ba-action="edit"]');
    if (editBtn) editBtn.disabled = isEditable;
  }

  function updateBranchGridButtons() {
    const branchRoot = qs('#branchAssignedContainer');
    if (!branchRoot) return;

    const isEditable = state.branchMode === MODES.UPDATE;
    const currentAction = state.branchGridAction;

    // Get all grid buttons
    const newBtn = qs('[data-om-ba-grid="new"]', branchRoot);
    const alterBtn = qs('[data-om-ba-grid="alter"]', branchRoot);
    const removeBtn = qs('[data-om-ba-grid="remove"]', branchRoot);
    const updateBtn = qs('[data-om-ba-grid="update"]', branchRoot);
    const clearBtn = qs('[data-om-ba-grid="clear"]', branchRoot);

    if (!isEditable) {
      // View mode - disable all grid buttons
      setButtonDisabled(newBtn, true);
      setButtonDisabled(alterBtn, true);
      setButtonDisabled(removeBtn, true);
      setButtonDisabled(updateBtn, true);
      setButtonDisabled(clearBtn, true);
    } else if (currentAction === 'new' || currentAction === 'alter') {
      // New or Alter mode - only Update and Clear are active
      setButtonDisabled(newBtn, true);
      setButtonDisabled(alterBtn, true);
      setButtonDisabled(removeBtn, true);
      setButtonDisabled(updateBtn, false);
      setButtonDisabled(clearBtn, false);
    } else {
      // Edit mode without action - New, Alter, and Remove are active
      setButtonDisabled(newBtn, false);
      setButtonDisabled(alterBtn, false);
      setButtonDisabled(removeBtn, false);
      setButtonDisabled(updateBtn, true);
      setButtonDisabled(clearBtn, true);
    }
  }

  function setView(nextView) {
    state.view = nextView;

    const officerView = qs('[data-om-view="officer"]');
    const branchView = qs('[data-om-view="branch-assigned"]');
    if (officerView) officerView.hidden = nextView !== VIEWS.OFFICER;
    if (branchView) branchView.hidden = nextView !== VIEWS.BRANCH_ASSIGNED;

    const officerActions = qs('[data-om-actions-view="officer"]');
    const branchActions = qs('[data-om-actions-view="branch-assigned"]');
    if (officerActions) officerActions.hidden = nextView !== VIEWS.OFFICER;
    if (branchActions) branchActions.hidden = nextView !== VIEWS.BRANCH_ASSIGNED;

    qsa("[data-om-view-trigger]").forEach((btn) => {
      const view = btn.getAttribute("data-om-view-trigger");
      const isCurrent = view === nextView;
      btn.classList.toggle("is-active", isCurrent);
      if (isCurrent) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
    });

    if (nextView === VIEWS.OFFICER) {
      setOfficerMode(MODES.VIEW);
    }

    if (nextView === VIEWS.BRANCH_ASSIGNED) {
      setBranchMode(MODES.VIEW);
    }
  }

  function bindModeButtons() {
    qsa("[data-shell-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const next = btn.getAttribute("data-shell-mode");
        if (!next || !MODES[next.toUpperCase()]) return;
        const nextMode = MODES[next.toUpperCase()];

        if (nextMode === MODES.VIEW) {
          const idInput = qs("#OfficerId");
          if (!idInput || !idInput.value || idInput.value.trim() === "") {
            setToast("Please enter Officer ID", "warning");
            return;
          }
          void fetchOfficer(idInput.value.trim(), 0);
          return;
        }

        if (nextMode === MODES.ADD) {
          setToast("Adding a new officer record.", "info");
          clearOfficerForm({ keepOfficerId: false });
          // Ensure designation dropdown is loaded for ADD mode
          void loadDesignationDropdown();
          setOfficerMode(nextMode);
          state.hasLoaded = false;
          state.recordNotFound = false;
          return;
        }

        if (nextMode === MODES.UPDATE) {
          if (!state.hasLoaded) {
            setToast("Load a record before editing.", "warning");
            return;
          }
          setToast("Record in edit mode. Make your changes and save.", "info");
          // Ensure designation dropdown is loaded for UPDATE mode
          void loadDesignationDropdown();
          setOfficerMode(nextMode);
          return;
        }

        setOfficerMode(nextMode);
      });
    });
  }

  function bindViewButtons() {
    qsa("[data-om-view-trigger]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const view = btn.getAttribute("data-om-view-trigger");
        if (view === VIEWS.BRANCH_ASSIGNED) {
          // Only allow branch-assigned view if a record is loaded
          if (!state.hasLoaded) {
            setToast("Load a record first to view branch assignments.", "warning");
            return;
          }
          setView(VIEWS.BRANCH_ASSIGNED);
        }
      });
    });
  }

  function updateBranchAssignedButtonState() {
    // Enable/disable branch-assigned button based on whether a record is loaded
    const officerId = qs("#OfficerId")?.value || "";
    const officerName = qs("#OfficerName")?.value || "";
    
    // Call the window function from HTML to update modal header and button state
    if (typeof window.updateBranchAssignedAccess === 'function') {
      window.updateBranchAssignedAccess(state.hasLoaded, officerId, officerName);
    }
    
    // Fallback for direct button update
    const branchBtn = qs('[data-om-view-trigger="branch-assigned"]');
    if (branchBtn) {
      branchBtn.disabled = !state.hasLoaded;
    }
  }

  function bindActions() {
    const saveBtn = qs('[data-om-action="save"]');
    const cancelBtn = qs('[data-om-action="cancel"]');
    const deleteBtn = qs('[data-om-action="delete"]');
    const resignBtn = qs('[data-om-action="resign"]');

    const baEditBtn = qs('[data-om-ba-action="edit"]');
    const baSaveBtn = qs('[data-om-ba-action="save"]');
    const baCancelBtn = qs('[data-om-ba-action="cancel"]');
    const baBackBtn = qs('[data-om-ba-action="back"]');

    saveBtn?.addEventListener("click", () => {
      void handleSaveOfficer();
    });

    cancelBtn?.addEventListener("click", () => {
      const btn = qs('[data-om-action="cancel"]');
      if (btn?.disabled) return;

      // If editing a loaded record, re-fetch to revert changes
      if (state.hasLoaded && state.officerMode !== MODES.VIEW) {
        void fetchOfficer(qs("#OfficerId")?.value || "", 0, { quiet: true });
        setToast("Changes cancelled.", "info");
      } else {
        // If in View mode with loaded record or adding new, just clear
        clearOfficerForm({ keepOfficerId: false });
        state.hasLoaded = false;
        state.recordNotFound = false;
        setOfficerMode(MODES.VIEW);
        setToast("Changes cancelled.", "info");
      }
    });

    deleteBtn?.addEventListener("click", () => {
      void handleDeleteOfficer();
    });

    resignBtn?.addEventListener("click", () => {
      void handleResignOfficer();
    });

    baEditBtn?.addEventListener("click", () => {
      setBranchMode(MODES.UPDATE);
    });

    baSaveBtn?.addEventListener("click", () => {
      if (state.branchMode === MODES.VIEW) return;
      void handleSaveBranchAssignments();
    });

    baCancelBtn?.addEventListener("click", () => {
      // Reload original data from officer record
      const officerId = qs("#OfficerId")?.value?.trim() || "";
      if (officerId && state.hasLoaded) {
        void fetchOfficer(officerId, 0, { quiet: true });
      }
      setBranchMode(MODES.VIEW);
      state.branchGridAction = null; // Reset grid action on cancel
    });

    baBackBtn?.addEventListener("click", () => {
      setView(VIEWS.OFFICER);
    });

    // Branch grid action buttons
    qs('[data-om-ba-grid="new"]')?.addEventListener("click", () => {
      if (state.branchMode !== MODES.UPDATE) return;
      state.branchGridAction = 'new';
      state.selectedBranchRowIndex = -1;
      clearBranchAssignedFilters();
      updateBranchGridButtons();
      console.log('[BranchGrid] New action triggered');
    });

    qs('[data-om-ba-grid="alter"]')?.addEventListener("click", () => {
      if (state.branchMode !== MODES.UPDATE) return;
      if (state.selectedBranchRowIndex < 0) {
        setToast('Please select a row to alter.', 'warning');
        return;
      }
      state.branchGridAction = 'alter';
      // Load selected row data into filters
      const row = state.branchAssignedRows[state.selectedBranchRowIndex];
      if (row) {
        if (qs('#BaReportingBranch')) qs('#BaReportingBranch').value = row.branchId || '';
        if (qs('#BaReportingBranchName')) qs('#BaReportingBranchName').value = row.branchName || '';
        if (qs('#BaPeriod')) qs('#BaPeriod').value = row.period || '';
        if (qs('#BaNoOfLoans')) qs('#BaNoOfLoans').value = row.noOfLoans || '0';
        if (qs('#BaFixedAmount')) qs('#BaFixedAmount').value = formatAmount(row.fixedAmount || '0');
      }
      updateBranchGridButtons();
      console.log('[BranchGrid] Alter action triggered');
    });

    qs('[data-om-ba-grid="remove"]')?.addEventListener("click", () => {
      if (state.branchMode !== MODES.UPDATE) return;
      if (state.selectedBranchRowIndex < 0) {
        setToast('Please select a row to remove.', 'warning');
        return;
      }
      // Remove selected row from grid
      state.branchAssignedRows.splice(state.selectedBranchRowIndex, 1);
      state.selectedBranchRowIndex = -1;
      renderBranchAssignedGrid();
      setToast('Row removed.', 'info');
      console.log('[BranchGrid] Remove action triggered');
    });

    qs('[data-om-ba-grid="update"]')?.addEventListener("click", () => {
      if (!state.branchGridAction) return;
      
      // Validate required fields
      const branchId = qs('#BaReportingBranch')?.value?.trim() || '';
      const branchName = qs('#BaReportingBranchName')?.value?.trim() || '';
      const period = qs('#BaPeriod')?.value || '';
      const periodText = qs('#BaPeriod')?.selectedOptions?.[0]?.text || period;
      const noOfLoans = qs('#BaNoOfLoans')?.value?.trim() || '0';
      const fixedAmount = formatAmount(qs('#BaFixedAmount')?.value?.trim() || '0');
      
      if (!branchId) {
        setToast('Please select a Reporting Branch.', 'warning');
        return;
      }
      
      if (state.branchGridAction === 'new') {
        // Check for duplicate branch
        const exists = state.branchAssignedRows.some(r => r.branchId === branchId);
        if (exists) {
          setToast('This branch is already assigned.', 'warning');
          return;
        }
        const rowData = {
          branchId,
          branchName,
          period,
          periodText,
          noOfLoans,
          fixedAmount,
          isNew: true,
          isAltered: false
        };
        state.branchAssignedRows.push(rowData);
        setToast('Branch added to grid.', 'success');
      } else if (state.branchGridAction === 'alter') {
        if (state.selectedBranchRowIndex >= 0) {
          const existingRow = state.branchAssignedRows[state.selectedBranchRowIndex];
          const rowData = {
            branchId,
            branchName,
            period,
            periodText,
            noOfLoans,
            fixedAmount,
            isNew: existingRow?.isNew || false,
            isAltered: !existingRow?.isNew // Mark as altered only if not a new record
          };
          state.branchAssignedRows[state.selectedBranchRowIndex] = rowData;
          setToast('Branch updated.', 'success');
        }
      }
      
      renderBranchAssignedGrid();
      clearBranchAssignedFilters();
      state.branchGridAction = null;
      state.selectedBranchRowIndex = -1;
      updateBranchGridButtons();
      console.log('[BranchGrid] Update action triggered for:', state.branchGridAction);
    });

    qs('[data-om-ba-grid="clear"]')?.addEventListener("click", () => {
      if (!state.branchGridAction) return;
      clearBranchAssignedFilters();
      state.branchGridAction = null;
      state.selectedBranchRowIndex = -1;
      updateBranchGridButtons();
      console.log('[BranchGrid] Clear action triggered');
    });
  }

  /**
   * Render the Branch Assigned grid table
   */
  function renderBranchAssignedGrid() {
    const tbody = qs('.om-ba-grid table tbody');
    const countSpan = qs('#baRecordCount');
    
    if (!tbody) return;
    
    const rows = state.branchAssignedRows;
    if (countSpan) countSpan.textContent = rows.length;
    
    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No records to display.</td></tr>';
      return;
    }
    
    tbody.innerHTML = rows.map((row, idx) => `
      <tr class="ba-grid-row ${state.selectedBranchRowIndex === idx ? 'table-primary' : ''}" data-ba-row-index="${idx}" style="cursor: pointer;">
        <td>${escapeHtml(row.branchId)}</td>
        <td>${escapeHtml(row.branchName)}</td>
        <td>${escapeHtml(row.periodText || row.period)}</td>
        <td>${escapeHtml(row.noOfLoans || '0')}</td>
        <td>${escapeHtml(formatAmount(row.fixedAmount))}</td>
      </tr>
    `).join('');
    
    // Add click handlers to rows for selection
    qsa('.ba-grid-row', tbody).forEach(tr => {
      tr.addEventListener('click', () => {
        const idx = parseInt(tr.dataset.baRowIndex, 10);
        state.selectedBranchRowIndex = idx;
        // Highlight selected row
        qsa('.ba-grid-row', tbody).forEach(r => r.classList.remove('table-primary'));
        tr.classList.add('table-primary');
        
        // Populate Behind The Scene fields with selected row data
        const selectedRow = state.branchAssignedRows[idx];
        if (selectedRow) {
          if (qs('#BaCreatedBy')) qs('#BaCreatedBy').value = selectedRow.createdBy || '';
          if (qs('#BaCreatedOn')) qs('#BaCreatedOn').value = selectedRow.createdOn || '';
          if (qs('#BaModifiedBy')) qs('#BaModifiedBy').value = selectedRow.modifiedBy || '';
          if (qs('#BaModifiedOn')) qs('#BaModifiedOn').value = selectedRow.modifiedOn || '';
          if (qs('#BaSupervisedBy')) qs('#BaSupervisedBy').value = selectedRow.supervisedBy || '';
          if (qs('#BaSupervisedOn')) qs('#BaSupervisedOn').value = selectedRow.supervisedOn || '';
        }
      });
    });
  }

  /**
   * Clear Branch Assigned filter fields and Behind The Scene
   */
  function clearBranchAssignedFilters() {
    if (qs('#BaReportingBranch')) qs('#BaReportingBranch').value = '';
    if (qs('#BaReportingBranchName')) qs('#BaReportingBranchName').value = '';
    if (qs('#BaPeriod')) qs('#BaPeriod').value = '';
    if (qs('#BaNoOfLoans')) qs('#BaNoOfLoans').value = '0';
    if (qs('#BaFixedAmount')) qs('#BaFixedAmount').value = '0.00';
    // Clear Behind The Scene fields
    if (qs('#BaCreatedBy')) qs('#BaCreatedBy').value = '';
    if (qs('#BaCreatedOn')) qs('#BaCreatedOn').value = '';
    if (qs('#BaModifiedBy')) qs('#BaModifiedBy').value = '';
    if (qs('#BaModifiedOn')) qs('#BaModifiedOn').value = '';
    if (qs('#BaSupervisedBy')) qs('#BaSupervisedBy').value = '';
    if (qs('#BaSupervisedOn')) qs('#BaSupervisedOn').value = '';
  }

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  window.addEventListener("load", () => {
    bindModeButtons();
    bindViewButtons();
    bindActions();
    setView(VIEWS.OFFICER);
    setOfficerMode(MODES.VIEW);
    updateBranchAssignedButtonState();  // Initialize button state (disabled until record loaded)

    // Load designation dropdown
    void loadDesignationDropdown();

    // Load period dropdown for Branch Assigned
    void loadPeriodDropdown();

    // Officer ID lookup button: open search modal
    qs("#btnOfficerLookup")?.addEventListener("click", () => {
      openOfficerLookupModal();
    });

    // Client ID lookup button: open client search modal (only in Add/Edit)
    qs("#btnClientLookup")?.addEventListener("click", () => {
      openClientLookupModal();
    });

    // Client ID field: auto-lookup name when Client ID is entered
    qs("#ClientId")?.addEventListener("change", () => {
      void ensureClientNameLoaded();
    });
    qs("#ClientId")?.addEventListener("blur", () => {
      void ensureClientNameLoaded();
    });

    // Auto-format amount fields on blur
    qs("#BaFixedAmount")?.addEventListener("blur", (e) => {
      e.target.value = formatAmount(e.target.value);
    });
    qs("#BaNoOfLoans")?.addEventListener("blur", (e) => {
      const val = parseInt(e.target.value, 10);
      e.target.value = isNaN(val) ? '0' : String(val);
    });

    // Officer search modal events
    qs("#officerLookupForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      handleOfficerSearch();
    });

    qs("#officerSearchSubmit")?.addEventListener("click", (e) => {
      // Button is type=submit in the new markup, but keep click handler safe.
      e?.preventDefault?.();
      handleOfficerSearch();
    });

    qs("#officerSearchRefresh")?.addEventListener("click", () => {
      const idEl = qs("#officerSearchId");
      if (idEl) idEl.value = "";
      const nameEl = qs("#officerSearchName");
      if (nameEl) nameEl.value = "";
      const branchEl = qs("#officerSearchReportingBranch");
      if (branchEl) branchEl.value = "";
      const idModeEl = qs("#officerSearchModeId");
      if (idModeEl) idModeEl.value = "Like";
      const nameModeEl = qs("#officerSearchModeName");
      if (nameModeEl) nameModeEl.value = "Like";
      const branchModeEl = qs("#officerSearchModeReportingBranch");
      if (branchModeEl) branchModeEl.value = "Like";
      officerSearchState.currentPage = 0;
      officerSearchState.allResults = [];
      qs("#officerSearchResults").innerHTML = '';
      qs("#officerSearchEmpty").classList.add("d-none");
      updateOfficerSearchPagination();

      // Sync/reload the latest records.
      handleOfficerSearch();
    });

    qs("#officerSearchPrevious")?.addEventListener("click", () => {
      if (officerSearchState.currentPage > 0) {
        officerSearchState.currentPage--;
        displayOfficerSearchPage();
        updateOfficerSearchPagination();
        console.log(`[OfficerSearch] Navigated to page ${officerSearchState.currentPage + 1}`);
      }
    });

    qs("#officerSearchNext")?.addEventListener("click", () => {
      if (officerSearchState.currentPage < officerSearchState.totalPages - 1) {
        officerSearchState.currentPage++;
        displayOfficerSearchPage();
        updateOfficerSearchPagination();
        console.log(`[OfficerSearch] Navigated to page ${officerSearchState.currentPage + 1}`);
      }
    });

    // Client search modal events
    qs("#clientLookupForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      handleClientSearch();
    });

    qs("#clientSearchSubmit")?.addEventListener("click", (e) => {
      e?.preventDefault?.();
      handleClientSearch();
    });

    qs("#clientSearchRefresh")?.addEventListener("click", () => {
      const idEl = qs("#clientSearchId");
      if (idEl) idEl.value = "";
      const nameEl = qs("#clientSearchName");
      if (nameEl) nameEl.value = "";
      const idModeEl = qs("#clientSearchModeId");
      if (idModeEl) idModeEl.value = "like";
      const nameModeEl = qs("#clientSearchModeName");
      if (nameModeEl) nameModeEl.value = "like";

      clientSearchState.currentPage = 0;
      clientSearchState.allResults = [];
      const tbody = qs("#clientSearchResults");
      if (tbody) tbody.innerHTML = "";
      qs("#clientSearchEmpty")?.classList.add("d-none");
      updateClientSearchPagination();

      // Sync/reload latest client records.
      handleClientSearch();
    });

    qs("#clientSearchPrevious")?.addEventListener("click", () => {
      if (clientSearchState.currentPage > 0) {
        clientSearchState.currentPage--;
        displayClientSearchPage();
        updateClientSearchPagination();
      }
    });

    qs("#clientSearchNext")?.addEventListener("click", () => {
      if (clientSearchState.currentPage < clientSearchState.totalPages - 1) {
        clientSearchState.currentPage++;
        displayClientSearchPage();
        updateClientSearchPagination();
      }
    });

    // ===============================
    // BRANCH LOOKUP
    // ===============================
    let branchLookupModalInstance = null;
    let branchLookupTargetField = null; // 'BaseBranch' or 'BaReportingBranch'

    const branchLookupState = {
      baselineRows: [],
      baselineLoadedAt: 0,
      isLoadingBaseline: false,
      lastError: null,
    };

    // Account Lookup State
    let accountLookupModalInstance = null;

    const accountLookupState = {
      baselineRows: [],
      baselineLoadedAt: 0,
      isLoadingBaseline: false,
      lastError: null,
    };

    function extractOldApiRows(resp) {
      // OldAPI responses vary - check multiple possible structures
      const candidates = [
        resp?.data?.Details01,
        resp?.Details01,
        resp?.data?.Details,
        resp?.Details,
        resp?.data?.Table,
        resp?.Table,
        resp?.data?.SearchResults,
        resp?.SearchResults,
        resp?.data,
      ];

      const toRows = (value) => {
        if (!value) return [];
        if (Array.isArray(value)) return value.filter((x) => x && typeof x === "object");
        if (typeof value === "object") return [value];
        return [];
      };

      // Return the first non-empty rowset
      for (const c of candidates) {
        const rows = toRows(c);
        if (rows.length) return rows;
      }

      return [];
    }

    function normalizeBranchRow(raw) {
      return {
        id: raw.OurBranchID || raw.BranchID || raw.BranchId || raw.ID || "",
        name: raw.BranchName || raw.Name || raw.OurBranchName || raw.Description || "",
      };
    }

    function isBranchDisplayable(n) {
      return Boolean((n?.id && n.id !== "---") || (n?.name && n.name !== "---"));
    }

    async function ensureBranchBaselineLoaded() {
      const cacheMs = 5 * 60 * 1000; // 5 minutes
      if (branchLookupState.baselineRows.length && Date.now() - branchLookupState.baselineLoadedAt < cacheMs) {
        return branchLookupState.baselineRows;
      }

      if (branchLookupState.isLoadingBaseline) {
        while (branchLookupState.isLoadingBaseline) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        return branchLookupState.baselineRows;
      }

      branchLookupState.isLoadingBaseline = true;
      branchLookupState.lastError = null;

      try {
        const env = window.Environment || {};
        const bankId = (env.defaultBankId || env.defaultBankID || "").toString().trim() || "00";

        // Try pc_SearchSystemBranches first (best option)
        const svc = window.StaticDataService;
        if (svc?.postOldApi) {
          const envelope = window.CoreApi.makeRequestEnvelope("dbo.pc_SearchSystemBranches", { BankID: bankId });
          const result = await window.CoreApi.post(
            `${(env.baseUrlCommon || "http://localhost:5059").replace(/\/+$/g, "")}/api/OldAPI`,
            envelope
          );

          console.log('[BranchLookup] API Response:', result);

          if (result?.success) {
            const rows = extractOldApiRows(result);
            console.log('[BranchLookup] Extracted rows:', rows.length);
            
            if (rows.length > 0) {
              branchLookupState.baselineRows = rows.map(normalizeBranchRow).filter(isBranchDisplayable);
              branchLookupState.baselineLoadedAt = Date.now();
              console.log('[BranchLookup] Displayable branches:', branchLookupState.baselineRows.length);
              return branchLookupState.baselineRows;
            }
          }

          branchLookupState.lastError = result?.message || "Failed to load branches";
        } else {
          branchLookupState.lastError = "Service unavailable";
        }
        return [];
      } catch (err) {
        console.error("Error loading branches:", err);
        branchLookupState.lastError = err?.message || "Error loading branches";
        return [];
      } finally {
        branchLookupState.isLoadingBaseline = false;
      }
    }

    function filterBranchBaseline(baselineRows, { idValue, nameValue, idMode, nameMode }) {
      const idNeedle = String(idValue || "").toLowerCase();
      const nameNeedle = String(nameValue || "").toLowerCase();
      
      console.log('[BranchLookup] Filtering:', { idNeedle, nameNeedle, idMode, nameMode, totalRows: baselineRows.length });
      
      return baselineRows.filter((r) => {
        const idHay = (r.id || "").toLowerCase();
        const nameHay = (r.name || "").toLowerCase();

        const matchId = !idNeedle || (idMode === "Exact" ? idHay === idNeedle : idHay.includes(idNeedle));
        const matchName = !nameNeedle || (nameMode === "Exact" ? nameHay === nameNeedle : nameHay.includes(nameNeedle));
        return matchId && matchName;
      });
    }

    function renderBranchRows(rows) {
      const results = qs("#branchSearchResults");
      const empty = qs("#branchSearchEmpty");
      const loading = qs("#branchSearchLoading");

      if (results) results.innerHTML = "";
      if (loading) loading.classList.add("d-none");

      console.log('[BranchLookup] renderBranchRows called with:', rows);

      // Data is already normalized at this point - don't normalize again
      const safeRows = (Array.isArray(rows) ? rows : []).filter((r) => {
        const isDisplayable = isBranchDisplayable(r);
        console.log('[BranchLookup] Row:', r, '-> Displayable:', isDisplayable);
        return isDisplayable;
      });

      console.log('[BranchLookup] Safe rows to display:', safeRows.length);

      if (!safeRows.length) {
        if (empty) {
          empty.textContent = "No branches found.";
          empty.style.display = "block";
        }
        return;
      }

      if (empty) empty.style.display = "none";

      safeRows.forEach((r, index) => {
        // Data is already normalized with {id, name} structure
        const n = r;
        const row = document.createElement("tr");
        row.style.cursor = "pointer";
        row.innerHTML = `
          <td>${index + 1}</td>
          <td>${n.id}</td>
          <td>${n.name}</td>
        `;

        row.addEventListener("dblclick", () => {
          handleBranchSelect(n);
        });

        results.appendChild(row);
      });
    }

    function handleBranchSelect(branch) {
      if (branchLookupTargetField === "BaseBranch") {
        if (qs("#BaseBranch")) qs("#BaseBranch").value = branch.id;
        if (qs("#BaseBranchName")) qs("#BaseBranchName").value = branch.name;
      } else if (branchLookupTargetField === "BaReportingBranch") {
        if (qs("#BaReportingBranch")) qs("#BaReportingBranch").value = branch.id;
        if (qs("#BaReportingBranchName")) qs("#BaReportingBranchName").value = branch.name;
      }

      branchLookupModalInstance?.hide();
    }

    function openBranchSearchPanel(targetField) {
      branchLookupTargetField = targetField;
      const modalElement = qs("#branchLookupModal");
      if (!modalElement) return;
      branchLookupModalInstance = branchLookupModalInstance || new bootstrap.Modal(modalElement);
      branchLookupModalInstance.show();

      qs("#branchLookupForm")?.reset();
      if (qs("#branchSearchResults")) qs("#branchSearchResults").innerHTML = "";
      if (qs("#branchSearchEmpty")) {
        qs("#branchSearchEmpty").textContent = "Loading branches...";
        qs("#branchSearchEmpty").style.display = "block";
      }

      setTimeout(() => {
        qs("#branchSearchId")?.focus();
        void performBranchSearch();
      }, 250);
    }

    async function performBranchSearch(e) {
      if (e) e.preventDefault();

      const idValue = qs("#branchSearchId")?.value?.trim() || "";
      const nameValue = qs("#branchSearchName")?.value?.trim() || "";
      const idMode = qs("#branchSearchModeId")?.value || "Like";
      const nameMode = qs("#branchSearchModeName")?.value || "Like";

      const results = qs("#branchSearchResults");
      const empty = qs("#branchSearchEmpty");
      const loading = qs("#branchSearchLoading");

      if (results) results.innerHTML = "";
      if (empty) empty.style.display = "none";
      if (loading) loading.classList.remove("d-none");

      try {
        const baseline = await ensureBranchBaselineLoaded();
        console.log('[BranchLookup] Baseline loaded:', baseline.length);
        
        if (Array.isArray(baseline) && baseline.length) {
          const filtered = filterBranchBaseline(baseline, { idValue, nameValue, idMode, nameMode });
          console.log('[BranchLookup] Filtered results:', filtered.length);
          renderBranchRows(filtered);
          return;
        }

        if (empty && branchLookupState.lastError) {
          empty.textContent = branchLookupState.lastError;
          empty.style.display = "block";
        }
      } catch (err) {
        console.error(err);
        if (empty) empty.style.display = "block";
      } finally {
        if (loading) loading.classList.add("d-none");
      }
    }

    // ===============================
    // ACCOUNT LOOKUP FUNCTIONS
    // ===============================

    async function ensureAccountsLoaded() {
      const cacheMs = 5 * 60 * 1000; // 5 minutes
      if (accountLookupState.baselineRows.length && Date.now() - accountLookupState.baselineLoadedAt < cacheMs) {
        return accountLookupState.baselineRows;
      }

      if (accountLookupState.isLoadingBaseline) {
        while (accountLookupState.isLoadingBaseline) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        return accountLookupState.baselineRows;
      }

      accountLookupState.isLoadingBaseline = true;
      accountLookupState.lastError = null;

      try {
        const env = window.Environment || {};
        const bankId = (env.defaultBankId || env.defaultBankID || "").toString().trim() || "00";
        const operatorId = (env.userId || env.operatorId || "").toString().trim() || "SYSTEM";

        // Call p_GetSearchResult with GLCrTrxAllowID table
        const svc = window.StaticDataService;
        if (svc?.postOldApi) {
          const params = {
            TableID: "GLCrTrxAllowID",
            RefID: null,
            PrevOrNext: 0,
            AdvFilterString: "",  // Try without filter first to see if we get any data
            OperatorID: operatorId,
            ModuleID: 5130
          };

          console.log('[AccountLookup] Calling with params:', params);
          console.log('[AccountLookup] Environment:', { bankId, operatorId });

          const envelope = window.CoreApi.makeRequestEnvelope("dbo.p_GetSearchResult", params);
          const result = await window.CoreApi.post(
            `${(env.baseUrlCommon || "http://localhost:5059").replace(/\/+$/g, "")}/api/OldAPI`,
            envelope
          );

          console.log('[AccountLookup] API Response:', result);
          console.log('[AccountLookup] Response structure check:', {
            hasData: !!result?.data,
            hasDetails: !!result?.Details,
            hasDetails01: !!result?.Details01,
            hasDataDetails: !!result?.data?.Details,
            hasDataDetails01: !!result?.data?.Details01,
            hasTable: !!result?.Table,
            hasDataTable: !!result?.data?.Table,
            dataKeys: result?.data ? Object.keys(result.data) : [],
            resultKeys: Object.keys(result || {})
          });

          if (result?.success) {
            const rows = extractOldApiRows(result);
            console.log('[AccountLookup] Extracted rows:', rows.length);
            console.log('[AccountLookup] First row sample:', rows[0]);
            
            if (rows.length > 0) {
              accountLookupState.baselineRows = rows.map(normalizeAccountRow).filter(isAccountDisplayable);
              accountLookupState.baselineLoadedAt = Date.now();
              console.log('[AccountLookup] Displayable accounts:', accountLookupState.baselineRows.length);
              return accountLookupState.baselineRows;
            }
          }

          accountLookupState.lastError = result?.message || "Failed to load accounts";
        } else {
          accountLookupState.lastError = "Service unavailable";
        }
        return [];
      } catch (err) {
        console.error("Error loading accounts:", err);
        accountLookupState.lastError = err?.message || "Error loading accounts";
        return [];
      } finally {
        accountLookupState.isLoadingBaseline = false;
      }
    }

    function normalizeAccountRow(row) {
      // Handle multiple possible response structures
      const accountId = row?.AccountID || row?.AccountId || row?.account_id || row?.id || "";
      const description = row?.Description || row?.AccountName || row?.Name || row?.description || "";

      return {
        id: String(accountId).trim(),
        name: String(description).trim(),
      };
    }

    function isAccountDisplayable(row) {
      return row && row.id && row.id.length > 0;
    }

    function filterAccountBaseline(baselineRows, { idValue, descValue, idMode, descMode }) {
      const idNeedle = String(idValue || "").toLowerCase();
      const descNeedle = String(descValue || "").toLowerCase();
      
      console.log('[AccountLookup] Filtering:', { idNeedle, descNeedle, idMode, descMode, totalRows: baselineRows.length });
      
      return baselineRows.filter((r) => {
        const idHay = (r.id || "").toLowerCase();
        const descHay = (r.name || "").toLowerCase();

        const matchId = !idNeedle || (idMode === "Exact" ? idHay === idNeedle : idHay.includes(idNeedle));
        const matchDesc = !descNeedle || (descMode === "Exact" ? descHay === descNeedle : descHay.includes(descNeedle));
        return matchId && matchDesc;
      });
    }

    function renderAccountRows(rows) {
      const results = qs("#accountSearchResults");
      const empty = qs("#accountSearchEmpty");
      const loading = qs("#accountSearchLoading");

      if (results) results.innerHTML = "";
      if (loading) loading.classList.add("d-none");

      console.log('[AccountLookup] renderAccountRows called with:', rows);

      const safeRows = (Array.isArray(rows) ? rows : []).filter((r) => {
        const isDisplayable = isAccountDisplayable(r);
        console.log('[AccountLookup] Row:', r, '-> Displayable:', isDisplayable);
        return isDisplayable;
      });

      console.log('[AccountLookup] Safe rows to display:', safeRows.length);

      if (!safeRows.length) {
        if (empty) {
          empty.textContent = "No accounts found.";
          empty.style.display = "block";
        }
        return;
      }

      if (empty) empty.style.display = "none";

      safeRows.forEach((r, index) => {
        const n = r;
        const row = document.createElement("tr");
        row.style.cursor = "pointer";
        row.innerHTML = `
          <td>${index + 1}</td>
          <td>${n.id}</td>
          <td>${n.name}</td>
        `;

        row.addEventListener("dblclick", () => {
          handleAccountSelect(n);
        });

        results.appendChild(row);
      });
    }

    function handleAccountSelect(account) {
      if (qs("#AccountId")) qs("#AccountId").value = account.id;
      if (qs("#AccountName")) qs("#AccountName").value = account.name;

      accountLookupModalInstance?.hide();
    }

    function openAccountSearchPanel() {
      const modalElement = qs("#accountLookupModal");
      if (!modalElement) return;
      accountLookupModalInstance = accountLookupModalInstance || new bootstrap.Modal(modalElement);
      accountLookupModalInstance.show();

      qs("#accountLookupForm")?.reset();
      if (qs("#accountSearchResults")) qs("#accountSearchResults").innerHTML = "";
      if (qs("#accountSearchEmpty")) {
        qs("#accountSearchEmpty").textContent = "Loading accounts...";
        qs("#accountSearchEmpty").style.display = "block";
      }

      setTimeout(() => {
        qs("#accountSearchId")?.focus();
        void performAccountSearch();
      }, 250);
    }

    async function performAccountSearch(e) {
      if (e) e.preventDefault();

      const idValue = qs("#accountSearchId")?.value?.trim() || "";
      const descValue = qs("#accountSearchDesc")?.value?.trim() || "";
      const idMode = qs("#accountSearchModeId")?.value || "Like";
      const descMode = qs("#accountSearchModeDesc")?.value || "Like";

      const results = qs("#accountSearchResults");
      const empty = qs("#accountSearchEmpty");
      const loading = qs("#accountSearchLoading");

      if (results) results.innerHTML = "";
      if (empty) empty.style.display = "none";
      if (loading) loading.classList.remove("d-none");

      try {
        const baseline = await ensureAccountsLoaded();
        console.log('[AccountLookup] Baseline loaded:', baseline.length);
        
        if (Array.isArray(baseline) && baseline.length) {
          const filtered = filterAccountBaseline(baseline, { idValue, descValue, idMode, descMode });
          console.log('[AccountLookup] Filtered results:', filtered.length);
          renderAccountRows(filtered);
          return;
        }

        if (empty && accountLookupState.lastError) {
          empty.textContent = accountLookupState.lastError;
          empty.style.display = "block";
        }
      } catch (err) {
        console.error(err);
        if (empty) empty.style.display = "block";
      } finally {
        if (loading) loading.classList.add("d-none");
      }
    }

    // Wire up branch lookup buttons
    qsa(".kairo-branch-control .btn-lookup").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        const control = btn.closest(".kairo-branch-control");
        const idInput = control?.querySelector(".kairo-branch-control__id");
        const targetField = idInput?.id;

        if (targetField === "BaseBranch") {
          openBranchSearchPanel("BaseBranch");
        } else if (targetField === "BaReportingBranch") {
          openBranchSearchPanel("BaReportingBranch");
        }
      });
    });

    qs("#branchLookupForm")?.addEventListener("submit", performBranchSearch);

    qs("#branchSearchRefresh")?.addEventListener("click", async () => {
      branchLookupState.baselineRows = [];
      branchLookupState.baselineLoadedAt = 0;
      qs("#branchLookupForm")?.reset();
      await performBranchSearch();
    });

    // Wire up account lookup button
    qsa(".kairo-account-control .btn-lookup").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        openAccountSearchPanel();
      });
    });

    // Wire up Reporting To lookup button
    qsa(".kairo-user-control .btn-lookup").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        const control = btn.closest(".kairo-user-control");
        const idInput = control?.querySelector(".kairo-user-control__id");
        const targetField = idInput?.id;
        
        if (targetField === "ReportingTo") {
          openOfficerLookupModal("ReportingTo");
        }
      });
    });

    qs("#accountLookupForm")?.addEventListener("submit", performAccountSearch);

    qs("#accountSearchRefresh")?.addEventListener("click", async () => {
      accountLookupState.baselineRows = [];
      accountLookupState.baselineLoadedAt = 0;
      qs("#accountLookupForm")?.reset();
      await performAccountSearch();
    });

    // Fetch on Enter in OfficerId field.
    qs("#OfficerId")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        void fetchOfficer(qs("#OfficerId")?.value || "", 0);
      }
    });
    
    // Expose refresh function for modal to call
    window.refreshBranchAssignments = function() {
      const officerId = qs("#OfficerId")?.value || "";
      if (officerId && state.hasLoaded) {
        console.log('[refreshBranchAssignments] Refreshing data for officer:', officerId);
        // Get the last loaded officer row if available
        const officerRow = state.lastLoadedOfficerRow || null;
        void loadBranchAssignments(officerId, officerRow);
      } else {
        console.log('[refreshBranchAssignments] No officer loaded, clearing grid');
        renderBranchAssignmentsGrid([]);
      }
    };

    // ============ SIDEBAR HAMBURGER TOGGLE ============
    const sidebar = document.getElementById('main-sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const mainContainer = document.querySelector('.main-container');

    if (sidebar && sidebarToggle) {
      sidebarToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const isCollapsed = sidebar.classList.toggle('collapsed');
        if (mainContainer) mainContainer.classList.toggle('sidebar-collapsed', isCollapsed);
        sidebarToggle.setAttribute('aria-expanded', !isCollapsed);
      });
    }

    // ============ DATA ENTRY DROPDOWN (Nav Section Toggle) ============
    document.querySelectorAll('[data-nav-section]').forEach(section => {
      const header = section.querySelector('.nav-header--card');
      const arrow = section.querySelector('.nav-arrow--card');
      const items = section.querySelector('.nav-items--card');

      if (!header || !items) return;

      header.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // If sidebar is collapsed, expand it first then open this section
        if (sidebar && sidebar.classList.contains('collapsed')) {
          sidebar.classList.remove('collapsed');
          if (mainContainer) mainContainer.classList.remove('sidebar-collapsed');
          if (sidebarToggle) sidebarToggle.setAttribute('aria-expanded', 'true');
          
          // Close other sections
          document.querySelectorAll('[data-nav-section]').forEach(s => {
            if (s !== section) {
              s.classList.remove('is-open');
              const sItems = s.querySelector('.nav-items--card');
              if (sItems) sItems.hidden = true;
              const sArrow = s.querySelector('.nav-arrow--card');
              if (sArrow) sArrow.setAttribute('aria-expanded', 'false');
            }
          });
          
          // Open this section
          section.classList.add('is-open');
          items.hidden = false;
          if (arrow) arrow.setAttribute('aria-expanded', 'true');
          return;
        }

        // Normal toggle
        const isOpen = section.classList.toggle('is-open');
        items.hidden = !isOpen;
        if (arrow) arrow.setAttribute('aria-expanded', isOpen);
      });
    });

    // ============ SECTION HEADER COLLAPSIBLES ============
    document.querySelectorAll('[data-section-toggle]').forEach(header => {
      const section = header.closest('[data-section]');
      if (!section) return;

      const content = section.querySelector('[data-section-content]');
      const btn = header.querySelector('.section-toggle-btn');
      const icon = btn?.querySelector('i');

      if (!content || !btn) return;

      header.addEventListener('click', (e) => {
        e.stopPropagation();
        const isExpanded = btn.getAttribute('aria-expanded') === 'true';
        const newState = !isExpanded;

        btn.setAttribute('aria-expanded', newState);
        content.hidden = !newState;

        // Toggle chevron icon
        if (icon) {
          icon.classList.toggle('bi-chevron-up', newState);
          icon.classList.toggle('bi-chevron-down', !newState);
        }
      });

      // Keyboard accessibility
      header.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          header.click();
        }
      });

      // Set initial state
      const initialExpanded = btn.getAttribute('aria-expanded') === 'true';
      content.hidden = !initialExpanded;
    });

    // ============ SUCCESS MESSAGE FUNCTION ============
    window.showOfficerLoadedSuccess = function(officerId, officerName) {
      if (window.Swal) {
        Swal.fire({
          icon: 'success',
          title: 'Officer Loaded Successfully',
          text: `Officer ID: ${officerId}`,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          background: '#d4edda',
          color: '#155724'
        });
      }
    };

    // ============ BRANCH ASSIGNED SCREEN TOGGLE ============
    const branchAssignedBtn = document.querySelector('[data-om-view-trigger="branch-assigned"]');
    const mainFormContainer = document.getElementById('mainFormContainer');
    const branchAssignedContainer = document.getElementById('branchAssignedContainer');
    const officerActions = document.querySelector('[data-om-actions-view="officer"]');
    const branchAssignedActions = document.querySelector('[data-om-actions-view="branch-assigned"]');
    const baBackBtn = document.getElementById('baBackBtn');
    
    // Function to enable/disable Branch Assigned based on officer load state
    window.updateBranchAssignedAccess = function(hasLoaded, officerId = '', officerName = '') {
      if (branchAssignedBtn) {
        branchAssignedBtn.disabled = !hasLoaded;
        branchAssignedBtn.style.opacity = hasLoaded ? '1' : '0.5';
        branchAssignedBtn.style.cursor = hasLoaded ? 'pointer' : 'not-allowed';
      }
    };
    
    if (branchAssignedBtn) {
      branchAssignedBtn.addEventListener('click', () => {
        if (branchAssignedBtn.disabled) {
          if (window.Swal) {
            Swal.fire({
              icon: 'warning',
              title: 'No Officer Loaded',
              text: 'Please load an officer record first to view branch assignments.',
              toast: true,
              position: 'top-end',
              showConfirmButton: false,
              timer: 3000
            });
          }
          return;
        }
        
        // Show branch assigned, hide main form
        if (mainFormContainer) mainFormContainer.classList.add('d-none');
        if (branchAssignedContainer) branchAssignedContainer.classList.remove('d-none');
        
        // Toggle action panels
        if (officerActions) officerActions.classList.add('d-none');
        if (branchAssignedActions) branchAssignedActions.classList.remove('d-none');
        
        // Trigger data refresh
        if (typeof window.refreshBranchAssignments === 'function') {
          window.refreshBranchAssignments();
        }
      });
    }
    
    // Handle Back button in Branch Assigned screen
    window.showBranchAssignedBack = function() {
      if (mainFormContainer) mainFormContainer.classList.remove('d-none');
      if (branchAssignedContainer) branchAssignedContainer.classList.add('d-none');
      
      // Toggle action panels
      if (officerActions) officerActions.classList.remove('d-none');
      if (branchAssignedActions) branchAssignedActions.classList.add('d-none');
    };
    
    // Wire up Back button click handler
    if (baBackBtn) {
      baBackBtn.addEventListener('click', () => {
        window.showBranchAssignedBack();
      });
    }

    // ============ SUBMODULE SEARCH FUNCTIONALITY ============
    const searchInput = document.getElementById('submoduleSearch');
    const searchClear = document.getElementById('submoduleSearchClear');

    if (searchInput) {
      searchInput.addEventListener('input', function() {
        const term = this.value.toLowerCase().trim();
        document.querySelectorAll('.sidebar-item--enhanced').forEach(item => {
          const title = item.querySelector('.sidebar-item__title')?.textContent.toLowerCase() || '';
          const desc = item.querySelector('.sidebar-item__description')?.textContent.toLowerCase() || '';
          item.style.display = (!term || title.includes(term) || desc.includes(term)) ? '' : 'none';
        });

        // Show/hide clear button
        if (searchClear) {
          searchClear.style.display = term ? 'flex' : 'none';
        }
      });
    }

    if (searchClear) {
      searchClear.addEventListener('click', () => {
        if (searchInput) {
          searchInput.value = '';
          searchInput.dispatchEvent(new Event('input'));
          searchInput.focus();
        }
      });
    }
  });
})();
