(function (global) {
  if (global.__BillInwardOutwardDocAppLoaded_v2) {
    return;
  }
  global.__BillInwardOutwardDocAppLoaded_v2 = true;

  // ============================================
  // DOM ELEMENTS & STATE
  // ============================================

  const form = document.getElementById("documentary-app-form");
  const toastContainer = document.getElementById("toastContainer");

  const supportedPages = ["bill-inward-outward-documentary-application"];
  const activePage = document.body?.dataset?.page;
  if (!supportedPages.includes(activePage)) {
    return;
  }

  let dependenciesReady = false;

  // Load dependencies using ServiceLoader
  (async () => {
    const { ServiceLoader } = global;
    if (!ServiceLoader) {
      console.error("[BillInwardOutwardDocApp] ServiceLoader not found!");
      return;
    }

    try {
      await ServiceLoader.loadCore();
      await ServiceLoader.loadAuthService();
      await ServiceLoader.loadBillAccountService();
      await ServiceLoader.loadLookupService();
      await ServiceLoader.loadChargeService();
      await ServiceLoader.loadUserService();

      dependenciesReady = true;
      console.log("[BillInwardOutwardDocApp] Dependencies loaded");

      // Initialize form
      init();
    } catch (error) {
      console.error("[BillInwardOutwardDocApp] Failed to load dependencies:", error);
    }
  })();

  // ============================================
  // CONSTANTS & STATE
  // ============================================

  const MODES = {
    VIEW: "view",
    ADD: "add",
    UPDATE: "update"
  };

  let activeMode = MODES.VIEW;

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  // Toast notification using Account Maintenance's kairo-toast styling
  function showSystemToast(message, { title = 'Notice', variant = 'info', timeoutMs = 5000 } = {}) {
    const container = ensureToastContainer();
    // Remove existing toasts
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
      } catch { }
    };

    setTimeout(() => toast.classList.add('is-show'), 0);
    if (timeoutMs && timeoutMs > 0) setTimeout(remove, timeoutMs);
  }

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

  // Legacy wrapper for compatibility
  function setToast(message, variant = "success") {
    showSystemToast(message, { variant, timeoutMs: 5000 });
  }

  function hideToast() {
    const container = document.querySelector('[data-kairo-toast-container]');
    if (container) {
      const toasts = container.querySelectorAll('.kairo-toast');
      toasts.forEach(t => t.remove());
    }
  }

  function setupRemarksAutoResize() {
    const textareas = form?.querySelectorAll('textarea.bs-textarea');
    textareas?.forEach(textarea => {
      // Set initial height
      textarea.style.height = '22px';
      textarea.style.overflowY = 'hidden';

      // Expand on input
      textarea.addEventListener('input', function () {
        if (this.value.length > 0) {
          this.style.height = '22px'; // Reset to minimum
          this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        } else {
          this.style.height = '22px'; // Reset when empty
        }
      });
    });
  }

  // Populate a <select name=...> with options, preserving current value if needed
  function populateSelectOptions(name, options = []) {
    try {
      const sel = form?.querySelector(`[name="${name}"]`);
      if (!sel) return;
      const current = sel.value;
      // Clear existing except first placeholder if present
      const keepFirst = sel.options.length > 0 && sel.options[0].value === "";
      sel.innerHTML = keepFirst ? sel.options[0].outerHTML : "";
      const frag = document.createDocumentFragment();
      options.forEach(opt => {
        const o = document.createElement('option');
        o.value = opt.value ?? opt;
        o.textContent = opt.label ?? String(opt);
        frag.appendChild(o);
      });
      sel.appendChild(frag);
      // Restore current if present, else leave placeholder
      if (current && Array.from(sel.options).some(o => o.value == current)) {
        sel.value = current;
      }
    } catch (e) {
      console.warn("[BillInwardOutwardDocApp] populateSelectOptions failed for", name, e?.message);
    }
  }

  async function ensureBillTypeAndContractTypeOptions() {
    // Try LookupService first; fallback to static list reflecting legacy UI
    const staticBillTypes = [
      { value: "CAD", label: "Export Bill CAD" },
      { value: "INV", label: "Invoice" },
      { value: "PN", label: "Promissory Note" },
      { value: "CHQ", label: "Cheque" },
      { value: "ADV", label: "Export Bill Advance Payment" },
      { value: "LPO", label: "LPO" },
      { value: "EBLC", label: "Export Bill Under LC" },
      { value: "IBLC", label: "Import Bill Under LC" },
      { value: "IBNLC", label: "Import Bill Not Under LC" }
    ];

    let billTypeOptions = [];
    let contractTypeOptions = [];

    try {
      const ls = global.LookupService;
      if (ls?.getSystemCodeOptions) {
        const fetchedBillTypes = await ls.getSystemCodeOptions("BDTypeID");
        if (Array.isArray(fetchedBillTypes) && fetchedBillTypes.length) {
          billTypeOptions = fetchedBillTypes.map(x => ({ value: x.value || x.SubCodeID || x.code || x.label, label: x.label || x.CodeDescription || x.text || x.value }));
        }
        const fetchedContractTypes = await ls.getSystemCodeOptions("ContractTypeID");
        if (Array.isArray(fetchedContractTypes) && fetchedContractTypes.length) {
          contractTypeOptions = fetchedContractTypes.map(x => ({ value: x.value || x.SubCodeID || x.code || x.label, label: x.label || x.CodeDescription || x.text || x.value }));
        }
      }
    } catch (e) {
      console.warn("[BillInwardOutwardDocApp] LookupService system codes fetch failed:", e?.message);
    }

    if (!billTypeOptions.length) billTypeOptions = staticBillTypes;
    if (!contractTypeOptions.length) contractTypeOptions = billTypeOptions; // fallback: mirror bill types

    populateSelectOptions("BillTypeID", billTypeOptions);
    populateSelectOptions("ContractType", contractTypeOptions);
  }

  async function populateTermsDropdowns() {
    const ls = global.LookupService;
    if (!ls?.getSystemCodeOptions) return;

    try {
      const dropdowns = [
        { name: "ConfirmationType", code: "ConfirmationType" },
        { name: "ModeOfTransport", code: "ModeOfTransport" },
        { name: "LCConditions", code: "LCConditions" },
        { name: "LCPaymentTerms", code: "LCPaymentTerms" },
        { name: "DocumentType", code: "DocumentType" },
        { name: "IncoTerms", code: "IncoTerms" },
        { name: "TransportModeID", code: "TransportMode" }
      ];

      for (const d of dropdowns) {
        const opts = await ls.getSystemCodeOptions(d.code);
        if (opts && opts.length) {
          populateSelectOptions(d.name, opts.map(x => ({
            value: x.SubCodeID || x.value || x.code,
            label: x.CodeDescription || x.label || x.text
          })));
        }
      }
    } catch (e) {
      console.warn("[BillInwardOutwardDocApp] populateTermsDropdowns failed:", e?.message);
    }
  }

  // Lightweight wrapper to surface search status/messages via the toast
  function renderSearchFeedback(message, variant = "info") {
    setToast(message, variant);
  }

  function setMode(mode) {
    activeMode = (mode || "view").toLowerCase();
    hideToast();

    // Enable fields logic can be added here if needed

    document.querySelectorAll("[data-biod-mode]").forEach((btn) => {
      const btnMode = (btn.getAttribute("data-biod-mode") || "").toLowerCase();
      btn.classList.toggle("is-active", btnMode === activeMode);
    });
  }

  function setFieldValue(fieldName, value) {
    const el = form?.querySelector(`[name="${fieldName}"]`);
    if (!el) {
      console.warn(`[BillInwardOutwardDocApp] Field "${fieldName}" not found.`);
      return;
    }
    const nameLower = (el.getAttribute("name") || "").toLowerCase();
    const isAmountLike = el.hasAttribute("data-format-amount") || ((nameLower.includes("amount") || nameLower.includes("limit")) && !nameLower.includes("rate"));
    const isRateLike = el.hasAttribute("data-format-rate") || nameLower.includes("rate");

    if (isAmountLike && global.AmountFormatter?.setFormattedAmount) {
      el.setAttribute("data-format-amount", "");
      el.classList.add("text-end");
      global.AmountFormatter.setFormattedAmount(el, value ?? "");
      return;
    }

    if (isRateLike && global.RateFormatter?.setFormattedRate) {
      el.setAttribute("data-format-rate", "");
      el.classList.add("text-end");
      global.RateFormatter.setFormattedRate(el, value ?? "");
      return;
    }

    el.value = value ?? "";
  }

  function renderDocumentsTable(docs) {
    const tbody = document.getElementById('documents-table-body');
    if (!tbody) return;

    if (!docs || docs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">No records to display.</td></tr>';
      return;
    }

    tbody.innerHTML = docs.map((doc, idx) => `
      <tr>
        <td class="ps-3 py-2">${doc.DocumentName || doc.DocumentID || ''}</td>
        <td class="py-2 text-center">${doc.Original ?? doc.NoOfOriginal ?? 0}</td>
        <td class="py-2 text-center">${doc.Copy ?? doc.NoOfCopy ?? 0}</td>
        <td class="py-2">${doc.LocationID || doc.Location || ''}</td>
        <td class="py-2">${doc.Remarks || doc.DocumentRemarks || ''}</td>
        <td class="py-2">${doc.ReceivedBy || ''}</td>
        <td class="py-2">${doc.ReceivedDate || ''}</td>
        <td class="pe-3 py-2 text-end">
          <button type="button" class="btn btn-sm btn-link text-primary p-0 me-2 edit-doc" data-index="${idx}"><i class="bi bi-pencil"></i></button>
          <button type="button" class="btn btn-sm btn-link text-danger p-0 delete-doc" data-index="${idx}"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `).join('');
  }

  async function resolveBranchName(branchId) {
    const id = (branchId || "").toString().trim();
    if (!id) return null;
    const BillAccountService = global.BillAccountService;
    if (!BillAccountService?.searchBranches) return null;
    try {
      const spinner = document.getElementById('header-branch-name-spinner');
      spinner?.classList.remove('d-none');
      const resp = await BillAccountService.searchBranches(id);
      console.log('[BillInwardOutward] resolveBranchName raw', resp);
      const rows = resp?.data?.Details01 || resp?.data?.Details || (Array.isArray(resp?.data) ? resp.data : []);
      const list = Array.isArray(rows) ? rows : [];
      const match = list.find(r => String(r?.BranchID ?? r?.branchId ?? r?.OurBranchID ?? '').trim() === id) || list[0];
      return match?.BranchName || match?.OurBranchName || null;
    } catch (err) { console.error(err); return null; } finally { document.getElementById('header-branch-name-spinner')?.classList.add('d-none'); }
  }

  async function resolveClientName(clientId) {
    const id = (clientId || "").toString().trim();
    if (!id) return null;
    const BillAccountService = global.BillAccountService;
    if (!BillAccountService?.searchClients) return null;
    try {
      const spinner = document.getElementById('header-client-name-spinner');
      spinner?.classList.remove('d-none');
      const resp = await BillAccountService.searchClients(id);
      console.log('[BillInwardOutward] resolveClientName raw', resp);
      const rows = resp?.data?.Details01 || resp?.data?.Details || (Array.isArray(resp?.data) ? resp.data : []);
      const list = Array.isArray(rows) ? rows : [];
      const match = list.find(r => String(r?.ClientID ?? r?.clientId ?? '').trim() === id) || list[0];
      return match?.ClientName || match?.Name || null;
    } catch (err) { console.error(err); return null; } finally { document.getElementById('header-client-name-spinner')?.classList.add('d-none'); }
  }

  async function resolveProductName(productId) {
    const id = (productId || "").toString().trim();
    if (!id) return null;
    const BillAccountService = global.BillAccountService;
    if (!BillAccountService?.searchProducts) return null;
    try {
      const spinner = document.getElementById('header-product-name-spinner');
      spinner?.classList.remove('d-none');
      const resp = await BillAccountService.searchProducts(id);
      console.log('[BillInwardOutward] resolveProductName raw', resp);
      const rows = resp?.data?.Details01 || resp?.data?.Details || (Array.isArray(resp?.data) ? resp.data : []);
      const list = Array.isArray(rows) ? rows : [];
      const match = list.find(r => String(r?.ProductID ?? r?.productId ?? '').trim() === id) || list[0];
      return match?.ProductName || match?.Description || null;
    } catch (err) { console.error(err); return null; } finally { document.getElementById('header-product-name-spinner')?.classList.add('d-none'); }
  }

  async function resolveAccountName(accountId) {
    const id = (accountId || "").toString().trim();
    if (!id) return null;
    const BillAccountService = global.BillAccountService;
    if (!BillAccountService?.searchAccounts) return null;
    try {
      const spinner = document.getElementById('header-account-name-spinner');
      spinner?.classList.remove('d-none');
      const resp = await BillAccountService.searchAccounts(id);
      console.log('[BillInwardOutward] resolveAccountName raw', resp);
      const rows = resp?.data?.Details01 || resp?.data?.Details || (Array.isArray(resp?.data) ? resp.data : []);
      const list = Array.isArray(rows) ? rows : [];
      const match = list.find(r => String(r?.AccountID ?? r?.accountId ?? r?.AccountId ?? '').trim() === id) || list[0];
      return match?.AccountName || match?.Description || null;
    } catch (err) { console.error(err); return null; } finally { document.getElementById('header-account-name-spinner')?.classList.add('d-none'); }
  }

  async function resolveApplicationName(applicationId) {
    const id = (applicationId || "").toString().trim();
    if (!id) return null;
    const BillAccountService = global.BillAccountService;
    if (!BillAccountService?.searchApplications) return null;
    try {
      const resp = await BillAccountService.searchApplications(id);
      const rows = resp?.data?.Details01 || (Array.isArray(resp?.data) ? resp.data : []);
      const match = rows.find(r => String(r?.ApplicationID ?? r?.applicationId ?? '').trim() === id) || rows[0];
      return match?.ClientName || match?.ApplicationID || null;
    } catch { return null; }
  }

  async function resolveCurrencyName(currencyId) {
    const id = (currencyId || "").toString().trim();
    if (!id) return null;
    const ChargeService = global.ChargeService;
    if (!ChargeService?.searchCurrencies) return null;
    try {
      const resp = await ChargeService.searchCurrencies(id);
      const rows = resp?.data?.Details01 || (Array.isArray(resp?.data) ? resp.data : []);
      const match = rows.find(r => String(r?.CurrencyID ?? r?.currencyId ?? '').trim() === id) || rows[0];
      return match?.CurrencyName || match?.Description || null;
    } catch { return null; }
  }

  async function updateName(idFieldName, nameFieldName, resolveFn) {
    if (activeMode === MODES.VIEW) return;
    const idInput = form?.querySelector(`[name="${idFieldName}"]`);
    const nameInput = form?.querySelector(`[name="${nameFieldName}"]`);
    const id = (idInput?.value || '').trim();
    if (!id) {
      if (nameInput) nameInput.value = "";
      return;
    }
    try {
      renderSearchFeedback(`Resolving ${idFieldName}...`, "info");
      const name = await resolveFn?.(id);
      if (name && nameInput) {
        nameInput.value = name;
        renderSearchFeedback(`${idFieldName} resolved`, "success");
      } else {
        renderSearchFeedback(`${idFieldName} not found`, "warning");
      }
    } catch (err) {
      console.error("[BillInwardOutwardDocApp] updateName error:", err);
      renderSearchFeedback(`Failed to resolve ${idFieldName}`, "danger");
    }
  }

  // Render search results in a modal with inline refine and prev/next
  function showSearchResults(label, results, idField, nameField, term, searchFnName) {
    const searchTerm = term || "";
    const modalId = `search-results-${Date.now()}`;
    const firstResult = results[0] || {};
    const columnKeys = Object.keys(firstResult);
    const displayKeys = columnKeys.filter(k =>
      !['UpdateCount', 'EventID', 'NewData', 'CreatedOn', 'ModifiedOn', 'SupervisedOn'].includes(k)
    );

    const tableHeaders = displayKeys.slice(0, 5).map(key => `<th style="background: linear-gradient(90deg, #1e7cc4 0%, #1a6ba3 100%) !important; color: white !important;">${key}</th>`).join('');

    const modalHTML = `
      <div class="modal fade" id="${modalId}" tabindex="-1" role="dialog">
        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable" style="--bs-modal-width: 50vw;">
          <div class="modal-content">
            <div class="modal-header d-flex align-items-center justify-content-between" style="background: linear-gradient(90deg, #1e7cc4 0%, #1a6ba3 100%); color: white;">
              <div class="d-flex align-items-center gap-3">
                <h5 class="modal-title mb-0" style="color: white;">${label} Search Results (${results.length} found)</h5>
                <div class="input-group input-group-sm" style="width: 300px;">
                  <input type="text" class="form-control" id="inline-search-${modalId}" 
                         placeholder="Refine search..." value="${searchTerm}">
                  <button class="btn btn-primary" type="button" id="inline-search-btn-${modalId}">
                    <i class="bi bi-search"></i> Find
                  </button>
                </div>
              </div>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" style="color: white; filter: brightness(0) invert(1);"></button>
            </div>
            <div class="modal-body">
              <div class="table-responsive">
                <table class="table table-hover table-sm">
                  <thead style="background: linear-gradient(90deg, #1e7cc4 0%, #1a6ba3 100%) !important; color: white !important;">
                    <tr>
                      ${tableHeaders}
                      <th style="background: linear-gradient(90deg, #1e7cc4 0%, #1a6ba3 100%) !important; color: white !important;">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${results.slice(0, 50).map((item, idx) => `
                      <tr data-result-index="${idx}">
                        ${displayKeys.slice(0, 5).map(key => `<td>${item[key] ?? ''}</td>`).join('')}
                        <td>
                          <button type="button" class="btn btn-sm btn-primary select-result">Select</button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
                ${results.length === 0 ? '<div class="text-center py-3">No results found</div>' : ''}
              </div>
            </div>
            <div class="modal-footer justify-content-between">
              <button type="button" class="btn btn-outline-secondary" id="btn-prev-${modalId}">
                <i class="bi bi-chevron-left"></i> Previous
              </button>
              <button type="button" class="btn btn-outline-primary" id="btn-next-${modalId}">
                Next <i class="bi bi-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);

    const modalEl = document.getElementById(modalId);
    const ModalCtor = window.bootstrap?.Modal || window.Modal;
    const modal = new ModalCtor(modalEl, { backdrop: 'static', keyboard: false });

    modalEl.querySelectorAll('.select-result').forEach((btn, idx) => {
      btn.addEventListener('click', async () => {
        const result = results[idx];
        modal.hide();

        const idValue = result[idField]
          || (idField === 'HeaderApplicationID' ? (result.ApplicationID || result.ApplicationId || result.AppID || result.BillID || result.SerialID || result.SerialId || '') : '')
          || (idField === 'HeaderClientID' ? (result.ClientID || result.ClientId || result.ApprovedClientID || '') : '')
          || (idField === 'HeaderBranchID' ? (result.BranchID || result.OurBranchID || '') : '')
          || (idField === 'HeaderAccountID' ? (result.AccountID || result.BillAccountID || '') : '')
          || (idField === 'HeaderProductID' ? (result.ProductID || result.ProductId || '') : '')
          || (idField === 'ReceivedByID' ? (result.OperatorID || result.OperatorId || result.UserID || '') : '')
          || '';
        let nameValue = '';

        if (idField === 'BranchID' || idField === 'HeaderBranchID') nameValue = result.BranchName || result.OurBranchName || '';
        else if (idField === 'ClientID' || idField === 'HeaderClientID') nameValue = result.ClientName || result.Name || '';
        else if (idField === 'ProductID' || idField === 'HeaderProductID') nameValue = result.ProductName || result.Name || '';
        else if (idField === 'AccountID' || idField === 'HeaderAccountID') nameValue = result.AccountName || result.Name || '';
        else if (idField === 'HeaderApplicationID') nameValue = result.ApplicationName || result.BillName || result.Name || '';
        else if (idField === 'ReceivedByID') nameValue = result.UserName || result.Name || result.FullName || '';
        else if (idField === 'DocumentID') nameValue = result.DocumentName || result.Name || '';
        else nameValue = result.Name || result.Description || '';

        if (idField) {
          const idInput = form?.querySelector(`[name="${idField}"]`);
          if (idInput) {
            idInput.value = idValue;
            console.log(`[BillInwardOutwardDocApp] Set ${idField} field to:`, idValue);
          } else {
            console.warn(`[BillInwardOutwardDocApp] Could not find input field with name="${idField}"`);
          }
        }
        if (nameField && nameValue) {
          const nameInput = form?.querySelector(`[name="${nameField}"]`);
          if (nameInput) {
            nameInput.value = nameValue;
            console.log(`[BillInwardOutwardDocApp] Set ${nameField} field to:`, nameValue);
          }
        }

        renderSearchFeedback(`${label} selected: ${idValue}`, 'success');

        // UX Improvements: Focus management
        if (idField === 'HeaderClientID' || idField === 'ClientID') {
          setTimeout(() => form?.querySelector('[name="HeaderAccountID"]')?.focus(), 100);
        }

        // Auto-load ProductID/Name when AccountID is selected from search
        if (idField === 'HeaderAccountID' || idField === 'AccountID') {
          const clientId = form?.querySelector('[name="HeaderClientID"]')?.value || "";
          if (idValue) {
            void onLoadAccountDetails(idValue, clientId);
          }
        }

        if (idField === 'HeaderApplicationID' && idValue) {
          console.log('[BillInwardOutwardDocApp] ApplicationID selected from search, triggering data load for:', idValue);
          setTimeout(async () => {
            console.log('[BillInwardOutwardDocApp] Now calling onLoadBillApplication after 300ms delay...');
            await onLoadBillApplication();
          }, 300);
        }

        setTimeout(() => modalEl.remove(), 500);
      });
    });

    modalEl.querySelector(`#btn-prev-${modalId}`)?.addEventListener('click', () => {
      modal.hide();
      setTimeout(() => modalEl.remove(), 500);
      performLookupSearch({ term: searchTerm, label, searchFnName, idField, nameField, prevOrNext: 2 });
    });

    modalEl.querySelector(`#btn-next-${modalId}`)?.addEventListener('click', () => {
      modal.hide();
      setTimeout(() => modalEl.remove(), 500);
      performLookupSearch({ term: searchTerm, label, searchFnName, idField, nameField, prevOrNext: 1 });
    });

    modal.show();

    const inlineInput = modalEl.querySelector(`#inline-search-${modalId}`);
    const inlineBtn = modalEl.querySelector(`#inline-search-btn-${modalId}`);
    const triggerRefinedSearch = () => {
      const term2 = inlineInput.value.trim();
      modal.hide();
      setTimeout(() => modalEl.remove(), 500);
      performLookupSearch({ term: term2, label, searchFnName, idField, nameField });
    };
    inlineBtn?.addEventListener('click', triggerRefinedSearch);
    inlineInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') triggerRefinedSearch(); });

    setTimeout(() => {
      inlineInput?.focus();
      const val = inlineInput?.value || '';
      if (inlineInput) { inlineInput.value = ''; inlineInput.value = val; }
    }, 300);
  }

  async function performLookupSearch({ term, label, searchFnName, idField, nameField, prevOrNext = 0 }) {
    // Match Bill Account Application behavior: allow empty to fetch all, and auto-wildcard non-empty terms
    const cleaned = (term || "").trim();
    const toSearchPattern = (value) => {
      const raw = (value || "").trim();
      if (!raw) return "%";           // empty -> all
      if (/[%_]/.test(raw)) return raw; // keep user wildcards
      return `${raw}%`;                 // prefix match
    };
    const searchTerm = toSearchPattern(cleaned);

    const BillAccountService = global.BillAccountService;
    const LookupService = global.LookupService;

    // Handle special case for searchBillAccounts which requires clientID
    let serviceFunc = null;
    let extraArgs = [];

    if (searchFnName === 'searchBillAccounts') {
      if (!BillAccountService || typeof BillAccountService.searchBillAccounts !== 'function') {
        renderSearchFeedback("BillAccountService.searchBillAccounts not available", "danger");
        return;
      }
      // Extract ClientID from form
      const clientId = form?.querySelector('[name="HeaderClientID"]')?.value ||
        form?.querySelector('[name="ClientID"]')?.value || "";

      if (!clientId) {
        renderSearchFeedback("Please select a Client ID first.", "warning");
        return;
      }

      // Bind and prepare args
      serviceFunc = BillAccountService.searchBillAccounts.bind(BillAccountService);
      extraArgs = [clientId];
    } else {
      // Standard resolution
      serviceFunc = searchFnName && BillAccountService && typeof BillAccountService[searchFnName] === "function"
        ? BillAccountService[searchFnName].bind(BillAccountService)
        : searchFnName && LookupService && typeof LookupService[searchFnName] === "function"
          ? LookupService[searchFnName].bind(LookupService)
          : null;

      // Local searchUsers definition if not in services
      if (!serviceFunc && searchFnName === 'searchUsers') {
        serviceFunc = async (term, prev) => {
          const payload = {
            TableID: "OperatorID",
            AdvFilterString: "",
            WhereStmt: term && term !== "%" ? `OperatorID like '%${term}%' OR UserName like '%${term}%'` : "",
            PrevOrNext: prev,
            OperatorID: BillAccountService?.getOperatorId?.() || "",
            OurBranchID: BillAccountService?.getBranchId?.() || "0101"
          };
          const envelope = global.CoreApi.makeRequestEnvelope("p_GetSearchResult", payload);
          return global.CoreApi.post((global.Environment?.baseUrlCommon || "").replace(/\/$/, "") + "/api/OldAPI", envelope);
        };
      }

      // Local searchDocuments definition if not in services
      if (!serviceFunc && searchFnName === 'searchDocuments') {
        serviceFunc = async (term, prev) => {
          const payload = {
            TableID: "DocumentID",
            AdvFilterString: "",
            WhereStmt: term && term !== "%" ? `DocumentID like '%${term}%' OR DocumentName like '%${term}%'` : "",
            PrevOrNext: prev,
            OperatorID: BillAccountService?.getOperatorId?.() || "",
            OurBranchID: BillAccountService?.getBranchId?.() || "0101"
          };
          const envelope = global.CoreApi.makeRequestEnvelope("p_GetSearchResult", payload);
          return global.CoreApi.post((global.Environment?.baseUrlCommon || "").replace(/\/$/, "") + "/api/OldAPI", envelope);
        };
      }
    }

    if (!serviceFunc) {
      renderSearchFeedback(`${label} service is not available.`, "danger");
      return;
    }

    renderSearchFeedback(cleaned ? `Searching ${label}...` : `Retrieving all ${label}...`, "info");
    try {
      // Call service with (searchTerm, ...extraArgs, prevOrNext)
      // Note: searchBillAccounts takes (searchTerm, clientId, prevOrNext)
      // Standard services take (searchTerm, prevOrNext)
      // We pass extraArgs in between

      const response = await serviceFunc(searchTerm, ...extraArgs, prevOrNext);
      let results = [];

      if (response?.success) {
        if (Array.isArray(response.data)) {
          results = response.data;
        } else if (typeof response.data === 'object' && response.data !== null) {
          results = response.data.Details01 || response.data.Details || response.data.TableResults || response.data.Result || response.data.Results || [];
          if (results.length === 0) {
            for (const key of Object.keys(response.data)) {
              if (Array.isArray(response.data[key]) && response.data[key].length > 0) {
                results = response.data[key];
                break;
              }
            }
          }
        }
      }
      showSearchResults(label, results, idField, nameField, term, searchFnName);
    } catch (error) {
      renderSearchFeedback(error?.message || "Search failed", "danger");
    }
  }

  function attachSearchHandler(selector, getTerm, searchFnName, label, idField, nameField) {
    const button = document.querySelector(selector);
    console.log(`[BillInwardOutwardDocApp] attachSearchHandler for ${label}: button found?`, !!button, selector);
    if (!button) {
      console.warn(`[BillInwardOutwardDocApp] Search button not found for selector: ${selector}`);
      return;
    }

    // Create handler function
    const handleClick = async (event) => {
      console.log(`[BillInwardOutwardDocApp] ${label} search button clicked!`, 'target:', event.target.tagName, 'currentTarget:', event.currentTarget.tagName);
      event.preventDefault();
      event.stopPropagation();
      hideToast();
      let initialTerm = getTerm?.();
      console.log(`[BillInwardOutwardDocApp] ${label} search - initialTerm:`, initialTerm);
      if (initialTerm === null) {
        console.warn(`[BillInwardOutwardDocApp] ${label} search aborted - getTerm returned null`);
        return; // Don't proceed if getTerm explicitly returned null
      }
      await performLookupSearch({ term: initialTerm || "", label, searchFnName, idField, nameField });
    };

    // Attach to button with capture phase to intercept clicks before they bubble
    button.addEventListener("click", handleClick, true);

    // Also attach directly to icon child if exists
    const icon = button.querySelector('i, svg');
    if (icon) {
      console.log(`[BillInwardOutwardDocApp] Also attaching click handler to icon for ${label}`);
      icon.addEventListener("click", handleClick, true);
    }
  }

  async function loadDocumentaryDataByApplicationId(applicationId) {
    const BillAccountService = global.BillAccountService;

    // Check which method is available - getBillApplication or getAccountApplication
    const getDataMethod = BillAccountService?.getBillApplication || BillAccountService?.getAccountApplication;

    if (!getDataMethod) {
      console.warn("[BillInwardOutwardDocApp] BillAccountService methods not available");
      setToast("Service method not available", "danger");
      return;
    }

    setToast("Loading documentary data...", "info");

    try {
      const payload = {
        ApplicationID: applicationId || "",
        OperatorID: getOperatorId?.() || "",
        Direction: 0,
        OurBranchID: "0101",
        BankID: "00"
      };

      console.log("[BillInwardOutwardDocApp] Loading documentary data with payload:", payload);
      const response = await getDataMethod.call(BillAccountService, payload);

      console.log("[BillInwardOutwardDocApp] API Response:", response);

      if (response?.success && response?.data) {
        // Get the data from Details01 array or directly from response.data
        const docData = (Array.isArray(response.data?.Details01) && response.data.Details01[0]) ||
          (Array.isArray(response.data) && response.data[0]) ||
          response.data;

        if (!docData || Object.keys(docData).length === 0) {
          setToast("No data found for this Application ID", "warning");
          return;
        }

        console.log("[BillInwardOutwardDocApp] Documentary data loaded:", docData);

        // Header Section Fields
        if (docData.BranchID) setFieldValue("HeaderBranchID", docData.BranchID);
        if (docData.BranchName) setFieldValue("HeaderBranchName", docData.BranchName);
        if (docData.ApplicationID) setFieldValue("HeaderApplicationID", docData.ApplicationID);
        if (docData.ClientID) setFieldValue("HeaderClientID", docData.ClientID);
        if (docData.ClientName) setFieldValue("HeaderClientName", docData.ClientName);
        if (docData.AccountID) setFieldValue("HeaderAccountID", docData.AccountID);
        if (docData.AccountName) setFieldValue("HeaderAccountName", docData.AccountName);
        if (docData.ProductID) setFieldValue("HeaderProductID", docData.ProductID);
        if (docData.ProductName) setFieldValue("HeaderProductName", docData.ProductName);
        if (docData.BillNo) setFieldValue("BillNo", docData.BillNo);
        if (docData.BillReferenceNo) {
          setFieldValue("BillReferenceNo", docData.BillReferenceNo);
          setFieldValue("HeaderBillReferenceNo", docData.BillReferenceNo);
        }

        // Application Tab Fields
        // Application Tab Fields
        if (docData.LCReferenceNumber) {
          setFieldValue("LCPOReferenceNo", docData.LCReferenceNumber); // Maps to LC/PO Reference No
          // Some forms might use LCPOApplicationID for the same data or similar
          setFieldValue("LCPOApplicationID", docData.LCReferenceNumber);
        }
        if (docData.BDTypeID) setFieldValue("BillTypeID", docData.BDTypeID); // Maps Bill TypeID
        if (docData.LCClientID) setFieldValue("LCPOClientID", docData.LCClientID); // Maps LC/PO ClientID
        if (docData.ContractTypeID) setFieldValue("ContractType", docData.ContractTypeID); // Fix Contract Type

        if (docData.CurrencyID) setFieldValue("CurrencyID", docData.CurrencyID);
        if (docData.CurrencyName) setFieldValue("CurrencyName", docData.CurrencyName);
        if (docData.ExchangeRate) setFieldValue("ExchangeRate", docData.ExchangeRate);
        if (docData.Amount) setFieldValue("Amount", docData.Amount);
        if (docData.LocalAmount) setFieldValue("LocalAmount", docData.LocalAmount);
        if (docData.BillDate) setFieldValue("BillDate", docData.BillDate);
        if (docData.ExpiryDueDate) setFieldValue("ExpiryDueDate", docData.ExpiryDueDate);
        if (docData.InterestRate) setFieldValue("InterestRate", docData.InterestRate);
        if (docData.GracePeriod) setFieldValue("GracePeriod", docData.GracePeriod);
        if (docData.NumberOfDays) setFieldValue("NumberOfDays", docData.NumberOfDays);
        if (docData.DebitBranchID) setFieldValue("DebitBranchID", docData.DebitBranchID);
        if (docData.DebitBranchName) setFieldValue("DebitBranchName", docData.DebitBranchName);
        if (docData.CreditDebitAccountID) setFieldValue("CreditDebitAccountID", docData.CreditDebitAccountID);
        if (docData.CreditDebitAccountName) setFieldValue("CreditDebitAccountName", docData.CreditDebitAccountName);

        // Marginable Section
        if (docData.Marginable !== undefined) {
          const marginableCheckbox = form?.querySelector('[name="Marginable"]');
          if (marginableCheckbox) marginableCheckbox.checked = Boolean(docData.Marginable);
        }
        if (docData.MarginType) setFieldValue("MarginType", docData.MarginType);
        if (docData.MarginAccountID) setFieldValue("MarginAccountID", docData.MarginAccountID);
        if (docData.MarginAmount) setFieldValue("MarginAmount", docData.MarginAmount);
        if (docData.AccountMarginAmount) setFieldValue("AccountMarginAmount", docData.AccountMarginAmount);
        if (docData.MarginCurrency) setFieldValue("MarginCurrency", docData.MarginCurrency);

        // Behind The Scene Section
        if (docData.ApplicationStatus) setFieldValue("ApplicationStatus", docData.ApplicationStatus);
        if (docData.OutstandingContractAmount) setFieldValue("OutstandingContractAmount", docData.OutstandingContractAmount);
        if (docData.RejectedBy) setFieldValue("RejectedBy", docData.RejectedBy);
        if (docData.RejectedOn) setFieldValue("RejectedOn", docData.RejectedOn);
        if (docData.RejectReason) setFieldValue("RejectReason", docData.RejectReason);
        if (docData.ApprovedBy) setFieldValue("ApprovedBy", docData.ApprovedBy);
        if (docData.ApprovedOn) setFieldValue("ApprovedOn", docData.ApprovedOn);
        if (docData.CreatedBy) setFieldValue("CreatedBy", docData.CreatedBy);
        if (docData.CreatedOn) setFieldValue("CreatedOn", docData.CreatedOn);
        if (docData.ModifiedBy) setFieldValue("ModifiedBy", docData.ModifiedBy);
        if (docData.ModifiedOn) setFieldValue("ModifiedOn", docData.ModifiedOn);
        if (docData.CancelledBy) setFieldValue("CancelledBy", docData.CancelledBy);
        if (docData.CancellationDate) setFieldValue("CancellationDate", docData.CancellationDate);
        if (docData.CancelReason) setFieldValue("CancelReason", docData.CancelReason);

        // ===============================================
        // POPULATE OTHER TABS (Documents, Terms, etc.)
        // ===============================================

        // Documents Tab (Result Set 3 -> Details02)
        const documentsList = response.data.Details02 || [];
        const documentsData = documentsList[0] || {};
        if (documentsData) {
          console.log("[BillInwardOutwardDocApp] Populating Documents Fields:", documentsData);
          if (documentsData.DocumentID) setFieldValue("DocumentID", documentsData.DocumentID);
          if (documentsData.DocumentName) setFieldValue("DocumentName", documentsData.DocumentName);
          if (documentsData.Original) setFieldValue("NoOfOriginal", documentsData.Original);
          if (documentsData.Copy) setFieldValue("NoOfCopy", documentsData.Copy);
          if (documentsData.DocumentAmount) setFieldValue("DocumentAmount", documentsData.DocumentAmount);
          if (documentsData.DocumentCurrencyID) setFieldValue("DocumentCurrencyID", documentsData.DocumentCurrencyID);
          if (documentsData.LocalAmount) setFieldValue("DocumentLocalAmount", documentsData.LocalAmount);
          if (documentsData.LocationID) setFieldValue("Location", documentsData.LocationID);
          if (documentsData.ReceivedBy) setFieldValue("ReceivedBy", documentsData.ReceivedBy);
          if (documentsData.ReceivedDate) setFieldValue("ReceivedDate", documentsData.ReceivedDate);
          if (documentsData.VoyageNo) setFieldValue("VoyageNo", documentsData.VoyageNo);
          if (documentsData.VesselName) setFieldValue("VesselName", documentsData.VesselName);
          if (documentsData.DocumentImagePath) setFieldValue("DocumentImagePath", documentsData.DocumentImagePath);
          // Verify if Remarks exists in this set or if it clashes with Application remarks
          if (documentsData.Remarks) setFieldValue("DocumentRemarks", documentsData.Remarks);
        }
        renderDocumentsTable(documentsList);

        // Terms Tab (Result Set 4 -> Details03)
        const termsData = (response.data.Details03 && response.data.Details03[0]) || {};
        if (termsData) {
          console.log("[BillInwardOutwardDocApp] Populating Terms Tab:", termsData);

          // Charge Details
          if (termsData.AdvisingChargeID) setFieldValue("AdvisingCharges", termsData.AdvisingChargeID);
          if (termsData.ClaimAdviceInSwift !== undefined) setCheckboxValue("ClaimAdviceInSwift", termsData.ClaimAdviceInSwift);
          if (termsData.OurChargesToDrawerDrawee !== undefined) setCheckboxValue("OurChargesToDrawerDrawee", termsData.OurChargesToDrawerDrawee);
          if (termsData.PassInterestToDrawerDrawee !== undefined) setCheckboxValue("PassInterestToDrawerDrawee", termsData.PassInterestToDrawerDrawee);
          if (termsData.AreOurChargesRefused !== undefined) setCheckboxValue("AreOurChargesRefused", termsData.AreOurChargesRefused);
          if (termsData.AreYourChargesRefused !== undefined) setCheckboxValue("AreYourChargesRefused", termsData.AreYourChargesRefused);

          if (termsData.ConfirmationTypeID) setFieldValue("ConfirmationType", termsData.ConfirmationTypeID);
          if (termsData.ModeOfTransportID) setFieldValue("ModeOfTransport", termsData.ModeOfTransportID);
          if (termsData.LCConditionsID) setFieldValue("LCConditions", termsData.LCConditionsID);
          if (termsData.LCPaymentTermsID) setFieldValue("LCPaymentTerms", termsData.LCPaymentTermsID);

          // Document Details (Terms section)
          if (termsData.LetterDated) setFieldValue("LetterDated", termsData.LetterDated);
          if (termsData.AcknowledgementDate) setFieldValue("AcknowledgementDate", termsData.AcknowledgementDate);
          if (termsData.DocumentTypeID) setFieldValue("DocumentType", termsData.DocumentTypeID);
          if (termsData.OriginalDocumentReceived !== undefined) setCheckboxValue("OriginalDocumentReceived", termsData.OriginalDocumentReceived);
          if (termsData.DuplicateDocumentReceived !== undefined) setCheckboxValue("DuplicateDocumentReceived", termsData.DuplicateDocumentReceived);
          if (termsData.AcknowledgementReceived !== undefined) setCheckboxValue("AcknowledgementReceived", termsData.AcknowledgementReceived);

          // Other Details
          if (termsData.AutoLiquidate !== undefined) setCheckboxValue("AutoLiquidate", termsData.AutoLiquidate);
          if (termsData.LinkToLoan !== undefined) setCheckboxValue("LinkToLoan", termsData.LinkToLoan);
          if (termsData.AdvanceByLoan !== undefined) setCheckboxValue("AdvanceByLoan", termsData.AdvanceByLoan);
          if (termsData.LoanProductID) setFieldValue("LoanProductID", termsData.LoanProductID);
          if (termsData.AllowRollover !== undefined) setCheckboxValue("AllowRollover", termsData.AllowRollover);
          if (termsData.SettleAvailableAmount !== undefined) setCheckboxValue("SettleAvailableAmount", termsData.SettleAvailableAmount);
          if (termsData.UseLCReferenceInMessage !== undefined) setCheckboxValue("UseLCReferenceInMessage", termsData.UseLCReferenceInMessage);
          if (termsData.LCDetailsInPaymentMessage !== undefined) setCheckboxValue("LCDetailsInPaymentMessage", termsData.LCDetailsInPaymentMessage);
          if (termsData.AvailableForRediscount !== undefined) setCheckboxValue("AvailableForRediscount", termsData.AvailableForRediscount);
          if (termsData.AllowBrokerage !== undefined) setCheckboxValue("AllowBrokerage", termsData.AllowBrokerage);
          if (termsData.BrokerageToBePaidByUs !== undefined) setCheckboxValue("BrokerageToBePaidByUs", termsData.BrokerageToBePaidByUs);

          if (termsData.IncoTermsID) setFieldValue("IncoTerms", termsData.IncoTermsID);
          if (termsData.RelatedReference) setFieldValue("RelatedReference", termsData.RelatedReference);
          if (termsData.GoodsDescription) setFieldValue("GoodsDescription", termsData.GoodsDescription);
          if (termsData.SenderToReceiverInfo) setFieldValue("SenderToReceiverInfo", termsData.SenderToReceiverInfo);
        }

        // Participants Tab (Result Set 5 -> Details04)
        const participantsData = (response.data.Details04 && response.data.Details04[0]) || {};
        if (participantsData) {
          console.log("[BillInwardOutwardDocApp] Populating Participants Tab:", participantsData);
          if (participantsData.ParticipantClientID) setFieldValue("ParticipantClientID", participantsData.ParticipantClientID);
          if (participantsData.ParticipantName) setFieldValue("ParticipantName", participantsData.ParticipantName); // Check exact field name
          if (participantsData.ParticipantAccountID) setFieldValue("ParticipantAccountID", participantsData.ParticipantAccountID);
        }

        // Bill Components (Result Set 6 -> Details05)
        const componentsData = (response.data.Details05 && response.data.Details05[0]) || {};
        if (componentsData) {
          console.log("[BillInwardOutwardDocApp] Populating Components Tab:", componentsData);
          // Map component fields
        }

        // Insurance Details (Result Set 7 -> Details06)
        const insuranceData = (response.data.Details06 && response.data.Details06[0]) || {};
        if (insuranceData) {
          console.log("[BillInwardOutwardDocApp] Populating Insurance Tab:", insuranceData);
          if (insuranceData.InsuranceID) setFieldValue("InsuranceID", insuranceData.InsuranceID);
          if (insuranceData.InsuranceCompanyName) setFieldValue("InsuranceCompanyName", insuranceData.InsuranceCompanyName);
          if (insuranceData.Address1) setFieldValue("InsuranceAddress", insuranceData.Address1);
        }

        // Discrepancies (Result Set 8 -> Details07)
        const discrepancyData = (response.data.Details07 && response.data.Details07[0]) || {};
        if (discrepancyData) {
          console.log("[BillInwardOutwardDocApp] Populating Discrepancies Tab:", discrepancyData);
          if (discrepancyData.DiscrepancyID) setFieldValue("DiscrepancyID", discrepancyData.DiscrepancyID);
          if (discrepancyData.DiscrepancyName) setFieldValue("DiscrepancyName", discrepancyData.DiscrepancyName);
          if (discrepancyData.Remarks) setFieldValue("DiscrepancyRemarks", discrepancyData.Remarks);
        }

        setToast("Documentary data loaded successfully", "success");
      } else {
        const errorMsg = response?.message || "No documentary record found for this Application ID";
        console.warn("[BillInwardOutwardDocApp] Failed to load documentary data:", errorMsg);
        setToast(errorMsg, "warning");
      }
    } catch (error) {
      console.error("[BillInwardOutwardDocApp] Error loading documentary data:", error);
      setToast("Error loading documentary data: " + (error?.message || "Unknown error"), "danger");
    }
  }

  function getOperatorId() {
    try {
      const session = global.AuthService?.getSession?.();
      const rawSession = session || JSON.parse(localStorage.getItem('nimble_auth_session') || '{}');

      console.log("[BillInwardOutwardDocApp] getOperatorId - Session object:", rawSession);

      const opId = rawSession?.operatorId ||
        rawSession?.operatorID ||
        rawSession?.OperatorId ||
        rawSession?.OperatorID ||
        rawSession?.UserID ||
        rawSession?.userId ||
        localStorage.getItem("OperatorID");

      console.log("[BillInwardOutwardDocApp] getOperatorId - Resolved to:", opId);
      return opId;
    } catch (err) {
      console.error("[BillInwardOutwardDocApp] Error resolving OperatorID:", err);
      return null;
    }
  }

  // Load BranchName when BranchID is entered
  async function onLoadBranchName() {
    try {
      const branchIdField = form?.querySelector('[name="HeaderBranchID"]');
      const branchNameField = form?.querySelector('[name="HeaderBranchName"]');

      console.log("[BillInwardOutwardDocApp] onLoadBranchName: Fields found?", {
        branchIdField: !!branchIdField,
        branchNameField: !!branchNameField
      });

      if (!branchIdField || !branchNameField) {
        console.warn("[BillInwardOutwardDocApp] BranchID or BranchName field not found");
        return;
      }

      const branchId = (branchIdField.value || "").trim();

      console.log("[BillInwardOutwardDocApp] onLoadBranchName: BranchID value =", branchId);

      if (!branchId) {
        console.log("[BillInwardOutwardDocApp] BranchID is empty, skipping lookup");
        branchNameField.value = "";
        return;
      }

      console.log("[BillInwardOutwardDocApp] ===== onLoadBranchName START =====");
      console.log("[BillInwardOutwardDocApp] BranchID entered:", branchId);

      if (!dependenciesReady) {
        console.warn("[BillInwardOutwardDocApp] Dependencies not ready for branch lookup");
        return;
      }

      if (!global.BillAccountService?.searchBranches) {
        console.error("[BillInwardOutwardDocApp] BillAccountService.searchBranches not available");
        return;
      }

      // Search for the branch - returns all branches, we need to filter
      console.log("[BillInwardOutwardDocApp] Calling searchBranches...");
      const searchResults = await BillAccountService.searchBranches({});
      console.log("[BillInwardOutwardDocApp] Branch search results:", searchResults);

      if (searchResults?.success && searchResults?.data) {
        // Find the branch matching the entered BranchID
        const allBranches = searchResults.data || [];
        console.log("[BillInwardOutwardDocApp] All branches:", allBranches);

        const matchedBranch = allBranches.find(b => b.OurBranchID === branchId);

        console.log("[BillInwardOutwardDocApp] All branches count:", allBranches.length);
        console.log("[BillInwardOutwardDocApp] Matched branch:", matchedBranch);

        if (matchedBranch) {
          const branchName = matchedBranch.BranchName || "";
          console.log("[BillInwardOutwardDocApp] ✓ Found branch:", branchName);
          branchNameField.value = branchName;
          console.log("[BillInwardOutwardDocApp] Set branchNameField.value to:", branchNameField.value);
          setToast(`Branch "${branchName}" loaded.`, "success");
        } else {
          console.warn("[BillInwardOutwardDocApp] No branch found with OurBranchID:", branchId);
          branchNameField.value = "";
          setToast(`Branch ID "${branchId}" not found.`, "warning");
        }
      } else {
        console.warn("[BillInwardOutwardDocApp] Search returned no data");
        branchNameField.value = "";
        setToast("Failed to load branches.", "danger");
      }

      console.log("[BillInwardOutwardDocApp] ===== onLoadBranchName END =====");
    } catch (error) {
      console.error("[BillInwardOutwardDocApp] Error in onLoadBranchName:", error);
      setToast("Error loading branch name.", "danger");
    }
  }



  async function onLoadAccountDetails(accountId, clientId) {
    if (!accountId) return;
    console.log("[BillInwardOutwardDocApp] onLoadAccountDetails:", accountId, clientId);

    const BillAccountService = global.BillAccountService;
    if (!BillAccountService || !BillAccountService.getAccountCustomers) {
      console.warn("[BillInwardOutwardDocApp] getAccountCustomers service missing");
      return;
    }

    try {
      const response = await BillAccountService.getAccountCustomers({
        AccountID: accountId,
        ClientID: clientId || "",
        OurBranchID: form?.querySelector('[name="HeaderBranchID"]')?.value || "0104",
        Direction: 0
      });

      if (response?.success && response.data) {
        const details = Array.isArray(response.data) ? response.data[0] :
          (response.data.Details || response.data.Details01 || [])[0];

        if (details) {
          console.log("[BillInwardOutwardDocApp] Account Details loaded:", details);
          // Populate Product ID and Name
          // Check response keys based on user snippet or standard
          const prodId = details.ProductID || details.ProductId || details.productID || details.AccountProductID || details.AccountProductId || "";
          const prodName = details.ProductName || details.productName || details.AccountProductName || details.ProductDesc || details.Description || "";

          if (prodId) setFieldValue("HeaderProductID", prodId);
          if (prodName) setFieldValue("HeaderProductName", prodName);
          // Notify on successful product auto-load
          try {
            const toastMsg = prodName ? `Product loaded: ${prodName}` : "Product loaded";
            if (typeof showToast === "function") showToast(toastMsg, "success");
            else if (typeof setToast === "function") setToast(toastMsg, "success");
          } catch { }

          setToast("Account details loaded", "success");
        } else {
          console.warn("[BillInwardOutwardDocApp] No details found for account");
        }
      }
    } catch (e) {
      console.error("[BillInwardOutwardDocApp] Error loading account details:", e);
    }
  }

  function getFormPayload() {
    if (!form) return {};
    return Object.fromEntries(new FormData(form).entries());
  }

  function populateForm(data) {
    if (!form || !data) {
      console.warn("[BillInwardOutwardDocApp] populateForm: form or data is null/undefined");
      return;
    }

    console.log("[BillInwardOutwardDocApp] populateForm: Starting form population");
    let populatedCount = 0;
    let fieldsMissed = [];

    Object.keys(data).forEach(key => {
      const input = form.querySelector(`[name="${key}"]`);
      if (input) {
        const oldValue = input.value;
        input.value = data[key];
        populatedCount++;
        console.log(`[BillInwardOutwardDocApp] ✓ Field "${key}": "${oldValue}" → "${data[key]}"`);
      } else {
        fieldsMissed.push(key);
      }
    });

    console.log(`[BillInwardOutwardDocApp] populateForm complete: ${populatedCount} fields populated`);
    if (fieldsMissed.length > 0) {
      console.warn(`[BillInwardOutwardDocApp] Fields in response but no matching form inputs: ${fieldsMissed.join(", ")}`);
    }
  }

  // ============================================
  // DATA RETRIEVAL - onLoadBillApplication
  // ============================================

  async function onLoadBillApplication(e) {
    console.log("[BillInwardOutwardDocApp] ========== onLoadBillApplication START ==========");
    console.log("[BillInwardOutwardDocApp] dependenciesReady:", dependenciesReady);

    if (e) {
      e.preventDefault();
    }

    if (!dependenciesReady) {
      console.warn("[BillInwardOutwardDocApp] Dependencies not ready!");
      console.warn("[BillInwardOutwardDocApp] Waiting for dependencies to load...");
      // Don't return - try anyway with a small delay
      await new Promise(resolve => setTimeout(resolve, 500));
      if (!dependenciesReady) {
        setToast("System is still loading dependencies. Please wait.", "warning");
        return;
      }
    }

    const BillAccountService = global.BillAccountService;
    console.log("[BillInwardOutwardDocApp] BillAccountService available:", !!BillAccountService);

    if (!BillAccountService) {
      console.error("[BillInwardOutwardDocApp] BillAccountService not available");
      setToast("Service not available", "danger");
      return;
    }

    // Check which method is available - getBillApplication or getAccountApplication
    const getDataMethod = BillAccountService?.getBillApplication || BillAccountService?.getAccountApplication;
    if (!getDataMethod) {
      console.error("[BillInwardOutwardDocApp] BillAccountService methods not available");
      console.error("[BillInwardOutwardDocApp] Available methods:", Object.keys(BillAccountService || {}));
      setToast("Service method not available", "danger");
      return;
    }

    console.log("[BillInwardOutwardDocApp] Using method:", getDataMethod === BillAccountService.getBillApplication ? 'getBillApplication' : 'getAccountApplication');

    const formData = getFormPayload();
    // Try ApplicationID from details section first, then header section
    let applicationId = (formData.ApplicationID || formData.HeaderApplicationID || "").toString().trim();

    console.log("[BillInwardOutwardDocApp] ApplicationID:", applicationId);

    // Validate input
    if (!applicationId) {
      console.warn("[BillInwardOutwardDocApp] No ApplicationID provided");
      setToast("Please enter an Application ID to retrieve data.", "warning");
      return;
    }

    setToast("Retrieving data...", "info");

    // Get BranchID from form if available, otherwise use session/user's branch
    let ourBranchId = (formData.HeaderBranchID || "").trim();

    console.log("[BillInwardOutwardDocApp] ===== BranchID Resolution Debug =====");
    console.log("[BillInwardOutwardDocApp] Step 1 - HeaderBranchID field:", ourBranchId);

    if (!ourBranchId) {
      // Try to get from BranchID input field
      try {
        const branchIdField = document.querySelector('[name="HeaderBranchID"]');
        ourBranchId = branchIdField?.value?.trim() || '';
        console.log("[BillInwardOutwardDocApp] Step 2 - BranchID input field:", ourBranchId);
      } catch (err) {
        console.error("[BillInwardOutwardDocApp] Error getting BranchID input field:", err);
      }
    }

    if (!ourBranchId) {
      // Try to get from session
      try {
        const session = global.AuthService?.getSession?.();
        console.log("[BillInwardOutwardDocApp] Step 3 - Full session object:", JSON.stringify(session));
        ourBranchId = session?.branchId || session?.branchID || session?.OurBranchID || '';
        console.log("[BillInwardOutwardDocApp] Step 3 - Session branchId:", ourBranchId);
      } catch (e) {
        console.error("[BillInwardOutwardDocApp] Error getting branch from session:", e);
      }
    }

    if (!ourBranchId) {
      // Last resort: use default
      ourBranchId = "0101";
      console.log("[BillInwardOutwardDocApp] Step 4 - Using default fallback: 0101");
    } else {
      console.log(`[BillInwardOutwardDocApp] ✓ Using resolved OurBranchID: "${ourBranchId}"`);
    }

    let operatorId = "";
    try {
      operatorId = getOperatorId();
      console.log("[BillInwardOutwardDocApp] Retrieved OperatorID:", operatorId);
    } catch (err) {
      console.error("[BillInwardOutwardDocApp] Error getting OperatorID:", err);
    }

    const payload = {
      ApplicationID: applicationId,
      OperatorID: operatorId,
      Direction: 0,
      OurBranchID: ourBranchId,
      BankID: "00"
    };

    console.log(`[BillInwardOutwardDocApp] Final OurBranchID being sent: "${ourBranchId}"`);
    console.log("[BillInwardOutwardDocApp] Final payload to send:", JSON.stringify(payload, null, 2));

    try {
      console.log("[BillInwardOutwardDocApp] Making API call...");
      const response = await getDataMethod.call(BillAccountService, payload);

      console.log("[BillInwardOutwardDocApp] API response status:", response?.success);
      console.log("[BillInwardOutwardDocApp] API response code:", response?.code);
      console.log("[BillInwardOutwardDocApp] API response message:", response?.message);
      console.log("[BillInwardOutwardDocApp] Full API response:", JSON.stringify(response, null, 2));

      if (response?.success) {
        console.log("[BillInwardOutwardDocApp] ✓ Response successful");

        let responseData = null;

        // Log detailed response structure
        console.log("[BillInwardOutwardDocApp] Response.data type:", typeof response.data);
        if (response.data) {
          console.log("[BillInwardOutwardDocApp] Response.data keys:", Object.keys(response.data));

          // The stored procedure returns multiple result sets
          // We need to find the one with actual application data

          // First, try Details01 (typically the main application data)
          if (Array.isArray(response.data.Details01) && response.data.Details01.length > 0) {
            responseData = response.data.Details01[0];
            console.log("[BillInwardOutwardDocApp] Found data in Details01");
          }
          // If Details01 is empty, check if application data is in response.data directly (if it's at root level)
          else if (response.data.ApplicationID) {
            responseData = response.data;
            console.log("[BillInwardOutwardDocApp] Found application data at root level of response.data");
          }
          // Try looking in other common locations
          else if (Array.isArray(response.data.Details) && response.data.Details.length > 0 && response.data.Details[0].ApplicationID) {
            responseData = response.data.Details[0];
            console.log("[BillInwardOutwardDocApp] Found data with ApplicationID in Details");
          }
          // Try the response root level (in case the service normalized it differently)
          else if (response.ApplicationID) {
            responseData = response;
            console.log("[BillInwardOutwardDocApp] Found application data at response root level");
          }
          // Last resort: search all result sets for one that has ApplicationID
          else {
            console.warn("[BillInwardOutwardDocApp] Details01 is empty, searching other details arrays for ApplicationID...");
            for (const key of ['Details02', 'Details03', 'Details04', 'Details05', 'Details06', 'Details07']) {
              if (Array.isArray(response.data[key]) && response.data[key].length > 0 && response.data[key][0].ApplicationID) {
                console.log(`[BillInwardOutwardDocApp] Found ApplicationID in ${key}`);
                responseData = response.data[key][0];
                break;
              }
            }
          }

          // If still not found, the application data might not exist for this ApplicationID/Branch combination
          if (!responseData) {
            console.warn("[BillInwardOutwardDocApp] ⚠ No application data found in any result set");
            console.warn("[BillInwardOutwardDocApp] Available Details arrays:", Object.keys(response.data).filter(k => k.startsWith('Details')));
            // Check if the issue is branch mismatch
            if (response.data.Details07?.[0]?.ApplicationID) {
              console.warn("[BillInwardOutwardDocApp] ApplicationID exists in Discrepancies but not in main application - possible branch mismatch");
            }
          }
        }

        console.log("[BillInwardOutwardDocApp] Extracted responseData:", JSON.stringify(responseData, null, 2));

        // Normalize possible ID fields
        if (responseData) {
          const resolvedAppId = responseData.ApplicationID || responseData.SerialID || responseData.ApplicationId || responseData.applicationId || null;
          if (resolvedAppId) {
            responseData.ApplicationID = String(resolvedAppId).trim();
          }
        }

        console.log("[BillInwardOutwardDocApp] Found ApplicationID:", !!responseData?.ApplicationID);

        if (responseData && responseData.ApplicationID) {
          console.log("[BillInwardOutwardDocApp] ✓ Data found, populating form...");

          // Helper: Convert datetime string to date-only format (YYYY-MM-DD)
          const extractDatePart = (dateStr) => {
            if (!dateStr) return '';
            const trimmed = String(dateStr).trim();
            if (!trimmed || trimmed === '0' || trimmed === 'null' || trimmed === 'undefined') return '';
            return trimmed.split('T')[0].split(' ')[0];
          };

          // Use the setFieldValue helper to populate all fields
          // Header Section Fields
          if (responseData.BranchID) setFieldValue("HeaderBranchID", responseData.BranchID);
          if (responseData.OurBranchID) setFieldValue("HeaderBranchID", responseData.OurBranchID);
          if (responseData.BranchName || responseData.OurBranchName) setFieldValue("HeaderBranchName", responseData.BranchName || responseData.OurBranchName);
          if (responseData.ApplicationID) setFieldValue("HeaderApplicationID", responseData.ApplicationID);
          if (responseData.ClientID) setFieldValue("HeaderClientID", responseData.ClientID);
          if (responseData.ClientName) setFieldValue("HeaderClientName", responseData.ClientName);
          if (responseData.AccountID) setFieldValue("HeaderAccountID", responseData.AccountID);
          if (responseData.AccountName) setFieldValue("HeaderAccountName", responseData.AccountName);
          if (responseData.ProductID) setFieldValue("HeaderProductID", responseData.ProductID);
          if (responseData.ProductName) setFieldValue("HeaderProductName", responseData.ProductName);
          if (responseData.BillID) setFieldValue("BillNo", responseData.BillID);
          if (responseData.BillReferenceNumber) {
            setFieldValue("BillReferenceNo", responseData.BillReferenceNumber);
            setFieldValue("HeaderBillReferenceNo", responseData.BillReferenceNumber);
          }

          // Application Tab Fields
          if (responseData.ReferenceNumber) setFieldValue("LCPOReferenceNo", responseData.ReferenceNumber);
          if (responseData.LCReferenceNumber) setFieldValue("LCPOReferenceNo", responseData.LCReferenceNumber);
          if (responseData.BDTypeID) setFieldValue("BillTypeID", responseData.BDTypeID);
          if (responseData.LCClientID) {
            setFieldValue("LCPOClientID", responseData.LCClientID);
          }
          // Also try to populate LC/PO Client Name if available
          if (responseData.ClientName && !responseData.LCClientID) {
            // If no LCClientID but we have main ClientName, show it in LC/PO field
            setFieldValue("LCPOClientName", responseData.ClientName);
          }
          if (responseData.ContractTypeID) setFieldValue("ContractType", responseData.ContractTypeID);
          if (responseData.FXPermitNumber) setFieldValue("FXPermitNumber", responseData.FXPermitNumber);
          if (responseData.CurrencyID) setFieldValue("CurrencyID", responseData.CurrencyID);
          if (responseData.CurrencyName) setFieldValue("CurrencyName", responseData.CurrencyName);
          if (responseData.ExchangeRate) setFieldValue("ExchangeRate", responseData.ExchangeRate);
          if (responseData.Amount) setFieldValue("BillAmount", responseData.Amount);
          if (responseData.LocalAmount) setFieldValue("LocalAmount", responseData.LocalAmount);

          // Populate Grace Period
          if (responseData.GracePeriod !== undefined) setFieldValue("GracePeriod", responseData.GracePeriod);

          // Calculate NumberOfDays from BillDate to DueDate
          if (responseData.BillDate && responseData.DueDate) {
            try {
              const billDate = new Date(responseData.BillDate);
              const dueDate = new Date(responseData.DueDate);
              const diffTime = Math.abs(dueDate - billDate);
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              console.log("[BillInwardOutwardDocApp] Calculated NumberOfDays:", diffDays, "from", responseData.BillDate, "to", responseData.DueDate);
              setFieldValue("NumberOfDays", diffDays);
            } catch (err) {
              console.error("[BillInwardOutwardDocApp] Error calculating NumberOfDays:", err);
            }
          }

          // Populate Bill Date
          console.log("[BillInwardOutwardDocApp] About to set BillDate, raw value:", responseData.BillDate);
          if (responseData.BillDate) {
            const billDateValue = extractDatePart(responseData.BillDate);
            console.log("[BillInwardOutwardDocApp] Extracted billDateValue:", billDateValue);
            const billDateInput = document.querySelector('input[name="BillDate"]');
            console.log("[BillInwardOutwardDocApp] BillDate input element:", billDateInput);

            // Check if Flatpickr is initialized on this input
            if (billDateInput && billDateInput._flatpickr) {
              console.log("[BillInwardOutwardDocApp] Using Flatpickr setDate for BillDate");
              billDateInput._flatpickr.setDate(billDateValue, true);
            } else {
              console.log("[BillInwardOutwardDocApp] Using setFieldValue for BillDate");
              setFieldValue("BillDate", billDateValue);
            }
            console.log("[BillInwardOutwardDocApp] BillDate set completed, value:", billDateInput?.value);
          }

          if (responseData.InterestRate) setFieldValue("InterestRate", responseData.InterestRate);

          // Populate Due Date / Expiry Date
          console.log("[BillInwardOutwardDocApp] About to set ExpiryDueDate, raw value:", responseData.DueDate);
          if (responseData.DueDate) {
            const dueDateValue = extractDatePart(responseData.DueDate);
            console.log("[BillInwardOutwardDocApp] Extracted dueDateValue:", dueDateValue);
            const dueDateInput = document.querySelector('input[name="ExpiryDueDate"]');
            console.log("[BillInwardOutwardDocApp] ExpiryDueDate input element:", dueDateInput);

            // Check if Flatpickr is initialized on this input
            if (dueDateInput && dueDateInput._flatpickr) {
              console.log("[BillInwardOutwardDocApp] Using Flatpickr setDate for ExpiryDueDate");
              dueDateInput._flatpickr.setDate(dueDateValue, true);
            } else {
              console.log("[BillInwardOutwardDocApp] Using setFieldValue for ExpiryDueDate");
              setFieldValue("ExpiryDueDate", dueDateValue);
            }
            console.log("[BillInwardOutwardDocApp] ExpiryDueDate set completed, value:", dueDateInput?.value);
          }

          // Drawer/Payee fields (Participants)
          if (responseData.DrawerID) setFieldValue("DrawerID", responseData.DrawerID);
          if (responseData.DrawerName) setFieldValue("DrawerName", responseData.DrawerName);
          if (responseData.PayeeID) setFieldValue("PayeeID", responseData.PayeeID);
          // Map Debit/Credit fields from backend keys
          const creditDebitBranch = responseData.CreditDebitBranch || responseData.DebitBranchID || responseData.CreditBranchID || responseData.BranchID;
          const creditDebitBranchName = responseData.CreditDebitBranchName || responseData.DebitBranchName || responseData.BranchName || responseData.OurBranchName;
          const creditDebitAccount = responseData.CreditDebitAccount || responseData.DebitAccountID || responseData.CreditAccountID;
          const creditDebitAccountName = responseData.CreditDebitAccountName || responseData.DebitAccountName || responseData.CreditAccountName;
          if (creditDebitBranch) setFieldValue("CreditDebitBranch", creditDebitBranch);
          if (creditDebitBranchName) setFieldValue("CreditDebitBranchName", creditDebitBranchName);
          if (creditDebitAccount) setFieldValue("CreditDebitAccountID", creditDebitAccount);
          if (creditDebitAccountName) setFieldValue("CreditDebitAccountName", creditDebitAccountName);
          // Also populate Debit* fields if present in the form
          if (responseData.DebitBranchID) setFieldValue("DebitBranchID", responseData.DebitBranchID);
          if (responseData.DebitBranchName) setFieldValue("DebitBranchName", responseData.DebitBranchName);
          if (responseData.DebitAccountID) setFieldValue("CreditDebitAccountID", responseData.DebitAccountID);
          if (responseData.DebitAccountName) setFieldValue("CreditDebitAccountName", responseData.DebitAccountName);
          // Map LC reference number
          if (responseData.LCReferenceNumber) setFieldValue("LCPOReferenceNo", responseData.LCReferenceNumber);
          if (responseData.Remarks || responseData.ApplicationRemarks) setFieldValue("ApplicationRemarks", responseData.Remarks || responseData.ApplicationRemarks);

          // Application Details Fields (from other responses)
          if (responseData.ApplicationDate) setFieldValue("ApplicationDate", extractDatePart(responseData.ApplicationDate));
          if (responseData.ApplicationStatus || responseData.BDAplnStatusID || responseData.BDApplnStatusID || responseData.BDApplStatusID) {
            setFieldValue("ApplicationStatus", responseData.ApplicationStatus || responseData.BDAplnStatusID || responseData.BDApplnStatusID || responseData.BDApplStatusID);
          }

          // Generic pass: populate any exact-name matches not covered above
          try {
            populateForm(responseData);
          } catch (e) {
            console.warn("[BillInwardOutwardDocApp] populateForm fallback failed:", e?.message);
          }

          setToast("Data retrieved successfully.", "success");
          console.log("[BillInwardOutwardDocApp] ✓ Form populated");
        } else {
          console.warn("[BillInwardOutwardDocApp] ⚠ No ApplicationID found in response data");
          console.warn("[BillInwardOutwardDocApp] ResponseData object:", JSON.stringify(responseData, null, 2));
          setToast("No data found for the provided criteria.", "info");
        }
      } else {
        const errorMsg = response?.message || "Failed to retrieve data.";
        console.error("[BillInwardOutwardDocApp] ✗ API returned success: false");
        console.error("[BillInwardOutwardDocApp] Response code:", response?.code);
        console.error("[BillInwardOutwardDocApp] Error message:", errorMsg);
        console.error("[BillInwardOutwardDocApp] Full response:", JSON.stringify(response, null, 2));
        setToast(errorMsg, "danger");
      }
    } catch (error) {
      console.error("[BillInwardOutwardDocApp] ✗ Exception caught:", error);
      console.error("[BillInwardOutwardDocApp] Error message:", error?.message);
      console.error("[BillInwardOutwardDocApp] Error stack:", error?.stack);
      setToast(error?.message || "An error occurred while fetching data.", "danger");
    }

    console.log("[BillInwardOutwardDocApp] ========== onLoadBillApplication END ==========");
  }


  // ============================================
  // INITIALIZATION
  // ============================================

  function init() {
    console.log("[BillInwardOutwardDocApp] Initializing handlers...");
    console.log("[BillInwardOutwardDocApp] Form exists:", !!form, "Form ID:", form?.id);

    // Title bar button handlers - with debugging
    const titleBtns = document.querySelectorAll(".tf-title-btn");
    console.log("[BillInwardOutwardDocApp] Found title buttons:", titleBtns.length);

    titleBtns.forEach((btn, index) => {
      const action = btn.dataset.action;
      console.log(`[BillInwardOutwardDocApp] Attaching handler for button ${index}: action=${action}`);

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log(`[BillInwardOutwardDocApp] Button clicked: action=${action}`);

        if (action === "refresh") {
          console.log("[BillInwardOutwardDocApp] Refresh clicked");
          // Reload the iframe
          const iframe = window.parent?.document?.querySelector(".legacy-modal__iframe");
          if (iframe) {
            console.log("[BillInwardOutwardDocApp] Reloading iframe");
            iframe.src = iframe.src;
          } else {
            console.warn("[BillInwardOutwardDocApp] Could not find iframe to refresh");
          }
        } else if (action === "minimize") {
          console.log("[BillInwardOutwardDocApp] Minimize clicked");
          try {
            window.parent?.postMessage({ type: "window-action", action: "minimize" }, "*");
          } catch (err) {
            console.warn("[BillInwardOutwardDocApp] Could not minimize:", err);
          }
        } else if (action === "maximize") {
          console.log("[BillInwardOutwardDocApp] Maximize clicked");
          try {
            window.parent?.postMessage({ type: "window-action", action: "maximize" }, "*");
          } catch (err) {
            console.warn("[BillInwardOutwardDocApp] Could not maximize:", err);
          }
        } else if (action === "close") {
          console.log("[BillInwardOutwardDocApp] Close clicked");
          try {
            // Try multiple methods to close the modal

            // Method 1: Try to close via parent Bootstrap Modal
            if (window.parent && window.parent.document) {
              const modal = window.parent.document.querySelector("#billInOutDocumentaryApplicationModal");
              if (modal) {
                console.log("[BillInwardOutwardDocApp] Found modal, attempting to close");
                // Try Bootstrap first
                if (window.parent.bootstrap && window.parent.bootstrap.Modal) {
                  const bootstrapModal = window.parent.bootstrap.Modal.getInstance(modal);
                  if (bootstrapModal) {
                    bootstrapModal.hide();
                    console.log("[BillInwardOutwardDocApp] Closed via Bootstrap");
                    return;
                  }
                }
                // Method 2: Fallback to manual close
                modal.style.display = 'none';
                modal.classList.remove('show');
                modal.classList.remove('fade');
                modal.setAttribute('aria-hidden', 'true');
                const backdrop = window.parent.document.querySelector('.modal-backdrop');
                if (backdrop) backdrop.remove();
                console.log("[BillInwardOutwardDocApp] Closed via manual method");
                return;
              }
            }

            // Method 3: Try to trigger dismiss on parent
            if (window.parent && window.parent.document) {
              const dismissBtn = window.parent.document.querySelector("#billInOutDocumentaryApplicationModal .btn-close");
              if (dismissBtn) {
                dismissBtn.click();
                console.log("[BillInwardOutwardDocApp] Closed via btn-close");
                return;
              }
            }

            console.warn("[BillInwardOutwardDocApp] Could not find modal to close");
          } catch (err) {
            console.warn("[BillInwardOutwardDocApp] Error closing modal:", err);
          }
        }
      });
    });

    // Load Bill Application Button Handler
    const loadBtn = document.getElementById("btn-load-bill-application");
    if (loadBtn) {
      loadBtn.addEventListener("click", (e) => {
        e.preventDefault();
        console.log("[BillInwardOutwardDocApp] Load button clicked");
        void onLoadBillApplication();
      });
    }

    // Populate dropdowns (Bill Type, Contract Type)
    void ensureBillTypeAndContractTypeOptions();
    void populateTermsDropdowns();

    // Auto-load when ApplicationID changes
    const applicationIdInput = form?.querySelector('[name="HeaderApplicationID"]');
    if (applicationIdInput) {
      applicationIdInput.addEventListener('change', () => {
        console.log("[BillInwardOutwardDocApp] ApplicationID change event fired");
        void onLoadBillApplication();
      });

      applicationIdInput.addEventListener('blur', () => {
        console.log("[BillInwardOutwardDocApp] ApplicationID blur event fired");
        void onLoadBillApplication();
      });

      applicationIdInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          console.log("[BillInwardOutwardDocApp] ApplicationID Enter key pressed");
          e.preventDefault();
          void onLoadBillApplication();
        }
      });
    }

    // Search Handlers - updated to use Header* field names
    attachSearchHandler("[data-branch-search]", () => form?.querySelector("[name=HeaderBranchID]")?.value, "searchBranches", "Branch", "HeaderBranchID", "HeaderBranchName");
    // Ensure branch is set before application search so envelope uses correct OurBranchID
    attachSearchHandler("[data-application-search]", () => {
      const branch = form?.querySelector("[name=HeaderBranchID]")?.value
        || form?.querySelector("[name=BranchID]")?.value
        || "";
      if (!branch) {
        setToast("Please enter/select Branch ID first", "warning");
        return null;
      }
      return form?.querySelector("[name=HeaderApplicationID]")?.value;
    }, "searchApplications", "Application", "HeaderApplicationID", "HeaderApplicationName");
    attachSearchHandler("[data-client-search]", () => form?.querySelector("[name=HeaderClientID]")?.value, "searchClients", "Client", "HeaderClientID", "HeaderClientName");
    attachSearchHandler("[data-product-search]", () => form?.querySelector("[name=HeaderProductID]")?.value, "searchProducts", "Product", "HeaderProductID", "HeaderProductName");
    attachSearchHandler("[data-user-search]", () => form?.querySelector("[name=ReceivedByID]")?.value, "searchUsers", "User", "ReceivedByID", "ReceivedByName");
    attachSearchHandler("[data-document-search]", () => form?.querySelector("[name=DocumentID]")?.value, "searchDocuments", "Document", "DocumentID", "DocumentName");

    // Updated Account Search to use searchBillAccounts (which filters by ClientID)
    attachSearchHandler("[data-account-search]", () => form?.querySelector("[name=HeaderAccountID]")?.value, "searchBillAccounts", "Account", "HeaderAccountID", "HeaderAccountName");

    console.log("[BillInwardOutwardDocApp] ✓ All search handlers attached successfully");

    // Currency Search Handler
    try {
      console.log("[BillInwardOutwardDocApp] Setting up currency search handlers...");
      const currencySearchButtons = form?.querySelectorAll("[data-currency-search]");
      console.log("[BillInwardOutwardDocApp] Found", currencySearchButtons?.length || 0, "currency search buttons");
      
      currencySearchButtons?.forEach((button) => {
        button.addEventListener("click", async () => {
          try {
            if (!window.CurrencySearchService) {
              setToast("Currency search service not available", "danger");
              return;
            }

            // Determine which currency field this button belongs to
            const parentControl = button.closest(".kairo-currency-control");
            const idInput = parentControl?.querySelector(".kairo-currency-control__id");
            const nameInput = parentControl?.querySelector(".kairo-currency-control__name");

            await window.CurrencySearchService.openSearchModal((currencyId, currencyName) => {
              if (idInput) idInput.value = currencyId || "";
              if (nameInput) nameInput.value = currencyName || "";
              console.log("[BillInwardOutwardDocApp] Currency selected:", currencyId, currencyName);
            });
          } catch (error) {
            console.error("[BillInwardOutwardDocApp] Currency search error:", error);
            setToast("Currency search failed", "danger");
          }
        });
      });
      console.log("[BillInwardOutwardDocApp] ✓ Currency search handlers attached");
    } catch (err) {
      console.error("[BillInwardOutwardDocApp] ❌ Error setting up currency search:", err);
      console.error("[BillInwardOutwardDocApp] Error stack:", err?.stack);
    }

    // Shared currency resolution function
    const resolveCurrencyName = async (currencyId) => {
      if (!currencyId) return null;
      try {
        if (!window.CurrencySearchService) return null;
        const response = await window.CurrencySearchService.getCurrencies();
        const currencies = response?.data?.Details || response?.Details || [];
        const match = currencies.find(c => String(c?.CurrencyID || '').trim().toUpperCase() === currencyId.toUpperCase());
        return match?.CurrencyName || match?.Description || null;
      } catch (err) {
        console.error("[BillInwardOutwardDocApp] Error resolving currency:", err);
        return null;
      }
    };

    // Add blur handlers for all currency fields
    try {
      console.log("[BillInwardOutwardDocApp] Attaching blur handlers for currency fields...");
      attachIdFieldHandlers("CurrencyID", "CurrencyName", resolveCurrencyName);
      attachIdFieldHandlers("MarginCurrency", "MarginCurrencyName", resolveCurrencyName);
      attachIdFieldHandlers("DocumentCurrencyID", "DocumentCurrencyName", resolveCurrencyName);
      console.log("[BillInwardOutwardDocApp] ✓ Currency field handlers attached");
    } catch (err) {
      console.error("[BillInwardOutwardDocApp] ❌ Error attaching currency field handlers:", err);
      console.error("[BillInwardOutwardDocApp] Error stack:", err?.stack);
    }

    /* REMOVED: Special handler for Application Details BranchID - this section was removed from HTML
    const appBranchSearchBtn = document.querySelector("[data-app-branch-search]");
    ... obsolete code removed ...
    */

    // Initialize Remarks auto-resize
    try {
      console.log("[BillInwardOutwardDocApp] Setting up remarks auto-resize...");
      setupRemarksAutoResize();
      console.log("[BillInwardOutwardDocApp] ✓ Remarks auto-resize initialized");
    } catch (err) {
      console.error("[BillInwardOutwardDocApp] ❌ Error setting up remarks auto-resize:", err);
    }

    // Attach Blur & Double-click Handlers for ID fields
    const attachIdFieldHandlers = (idFieldName, nameFieldName, resolveFn) => {
      const idInput = form?.querySelector(`[name="${idFieldName}"]`);
      if (!idInput) return;

      const triggerResolve = () => updateName(idFieldName, nameFieldName, resolveFn);

      idInput.addEventListener("blur", triggerResolve);
      idInput.addEventListener("dblclick", triggerResolve);
      idInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          triggerResolve();
        }
      });
    };

    // Helper to update field name via resolve function
    async function updateName(idFieldName, nameFieldName, resolveFn) {
      const idInput = form?.querySelector(`[name="${idFieldName}"]`);
      const nameInput = form?.querySelector(`[name="${nameFieldName}"]`);
      if (!idInput || !nameInput || !resolveFn) return;

      const id = idInput.value.trim();
      if (!id) {
        nameInput.value = "";
        return;
      }

      try {
        const name = await resolveFn(id);
        if (name) {
          nameInput.value = name;
        }
      } catch (err) {
        console.error(`[BillInwardOutwardDocApp] Error resolving name for ${idFieldName}:`, err);
      }
    }

    // Resolution helpers missing in this form
    async function resolveClientName(id) {
      if (!id) return null;
      const res = await fetchIdDescription(id, 'CLIENT');
      return res?.ClientName || null;
    }

    async function resolveProductName(id) {
      if (!id) return null;
      const res = await fetchIdDescription(id, 'ProductID', "BankID='00' AND ProductTypeID='BD'");
      return res?.ProductName || null;
    }

    async function resolveAccountName(id) {
      if (!id) return null;
      const res = await fetchIdDescription(id, 'ACCOUNT');
      return res?.AccountName || null;
    }

    async function resolveApplicationName(id) {
      const BillAccountService = global.BillAccountService;
      if (!BillAccountService?.searchApplications) return null;
      try {
        const resp = await BillAccountService.searchApplications(id);
        const rows = resp?.data?.Details01 || resp?.data || [];
        const match = (Array.isArray(rows) ? rows : [rows]).find(r => String(r.ApplicationID || r.SerialID).trim() === String(id).trim());
        return match?.ClientName || match?.AccountName || null;
      } catch { return null; }
    }

    async function resolveUserName(id) {
      if (!id) return null;
      const res = await fetchIdDescription(id, 'OperatorID');
      return res?.Description || res?.Name || null;
    }

    async function resolveDocumentName(id) {
      if (!id) return null;
      const res = await fetchIdDescription(id, 'DocumentID');
      return res?.Description || res?.DocumentName || null;
    }

    async function fetchIdDescription(id, controlTypeID, advanceFilter = '') {
      try {
        const requestData = {
          OurBranchID: form?.querySelector('[name="HeaderBranchID"]')?.value || "0104",
          ControlTypeID: controlTypeID,
          ID: id,
          BankID: '00',
          AdvanceFilter: advanceFilter,
          LanguageID: 'en'
        };
        const envelope = global.CoreApi.makeRequestEnvelope('dbo.p_GetIDDescription', requestData);
        const url = `${(global.Environment?.baseUrlCommon || '').replace(/\/$/, '')}/api/OldAPI`;
        const resp = await global.CoreApi.post(url, envelope);
        if (resp?.success && resp.data) {
          const details = (Array.isArray(resp.data.Details01) ? resp.data.Details01[0] :
            (Array.isArray(resp.data) ? resp.data[0] : resp.data));
          const desc = details?.Description || details?.Name || details?.ProductName || details?.ClientName;
          return { ClientName: desc, ProductName: desc, AccountName: desc, Description: desc };
        }
      } catch (err) { console.error('[BillInwardOutwardDocApp] fetchIdDescription error', err); }
      return null;
    }

    function setFieldValue(fieldName, value) {
      const el = form?.querySelector(`[name="${fieldName}"]`);
      if (!el) return;

      const val = value ?? "";

      if (el._flatpickr) {
        if (val) {
          el._flatpickr.setDate(val, true);
        } else {
          el._flatpickr.clear();
        }
      } else {
        el.value = val;
        // Dispatch change event to trigger listeners
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // Explicitly trigger formatting if needed
      if (el.hasAttribute('data-format-amount') && window.amountFormatter) {
        window.amountFormatter.setup(el);
      }
    }

    try {
      console.log("[BillInwardOutwardDocApp] Attaching ID field handlers for all fields...");
      attachIdFieldHandlers("HeaderBranchID", "HeaderBranchName", resolveBranchName);
      attachIdFieldHandlers("HeaderApplicationID", "HeaderApplicationName", resolveApplicationName);
      attachIdFieldHandlers("HeaderClientID", "HeaderClientName", resolveClientName);
      attachIdFieldHandlers("HeaderProductID", "HeaderProductName", resolveProductName);
      attachIdFieldHandlers("HeaderAccountID", "HeaderAccountName", resolveAccountName);
      attachIdFieldHandlers("ReceivedByID", "ReceivedByName", resolveUserName);
      attachIdFieldHandlers("DocumentID", "DocumentName", resolveDocumentName);
      console.log("[BillInwardOutwardDocApp] ✓ All ID field handlers attached");
    } catch (err) {
      console.error("[BillInwardOutwardDocApp] ❌ Error attaching ID field handlers:", err);
      console.error("[BillInwardOutwardDocApp] Error stack:", err?.stack);
    }

    // Helper for checkboxes
    function setCheckboxValue(fieldName, value) {
      const el = form?.querySelector(`[name="${fieldName}"]`);
      if (el) el.checked = Boolean(value);
    }

    // Note: BillDate and ExpiryDueDate are NOT auto-defaulted to today
    // to preserve values loaded from the database
    const todayStr = new Date().toISOString().slice(0, 10);
    // const billDateInput = form?.querySelector('[name="BillDate"], #BillDate');
    // const dueDateInput = form?.querySelector('[name="ExpiryDueDate"], #ExpiryDueDate');
    // if (billDateInput && !billDateInput.value) billDateInput.value = todayStr;
    // if (dueDateInput && !dueDateInput.value) dueDateInput.value = todayStr;

    // Additional date fields on consolidated in/out page: default to today if empty
    const receivedDate = form?.querySelector('#ReceivedDate');
    const letterDated = form?.querySelector('#LetterDated');
    const acknowledgementDate = form?.querySelector('#AcknowledgementDate');
    const partDate = form?.querySelector('#PartDate');
    if (receivedDate && !receivedDate.value) receivedDate.value = todayStr;
    if (letterDated && !letterDated.value) letterDated.value = todayStr;
    if (acknowledgementDate && !acknowledgementDate.value) acknowledgementDate.value = todayStr;
    if (partDate && !partDate.value) partDate.value = todayStr;

    // Calendar toggle buttons: open native date picker if supported
    const dateToggleButtons = form?.querySelectorAll('[data-date-toggle]');
    dateToggleButtons?.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const fieldName = btn.getAttribute('data-date-toggle');
        // Try name, then id, then previousElementSibling
        let input = form?.querySelector(`[name="${fieldName}"]`);
        if (!input) input = form?.querySelector(`#${CSS.escape(fieldName)}`);
        if (!input && btn.previousElementSibling && btn.previousElementSibling.tagName === 'INPUT') {
          input = btn.previousElementSibling;
        }
        if (input) {
          try {
            if (typeof input.showPicker === 'function') {
              input.showPicker();
              return;
            }
          } catch { }
          // Fallbacks: focus and click to trigger browser picker
          input.focus();
          try { input.click(); } catch { }
        }
      });
    });

    // Auto-load Product details when AccountID is entered manually or changed
    try {
      console.log("[BillInwardOutwardDocApp] Setting up account details auto-load...");
      const headerAccountInput = form?.querySelector('[name="HeaderAccountID"]');
      if (headerAccountInput) {
        const triggerProductLoad = () => {
          const accId = headerAccountInput.value.trim();
          const clientId = form?.querySelector('[name="HeaderClientID"]')?.value || "";
          if (accId) {
            void onLoadAccountDetails(accId, clientId);
          }
        };
        headerAccountInput.addEventListener("blur", triggerProductLoad);
        headerAccountInput.addEventListener("change", triggerProductLoad);
        console.log("[BillInwardOutwardDocApp] ✓ Account details auto-load configured");
      }
    } catch (err) {
      console.error("[BillInwardOutwardDocApp] ❌ Error setting up account details auto-load:", err);
    }

    // Currency field handlers are defined above with the currency search handler

    // Auto-load name resolution for all ID fields on blur (tab out)
    // The blur handlers above are already wired, so when user enters an ID and tabs out,
    // the corresponding name field will be populated automatically
    if (global.BillDiscountingAutoLoadUtil && dependenciesReady) {
      // The existing blur handlers handle name resolution
      // This is already sufficient for these forms' current functionality
      console.log("[BillInwardOutwardDocApp] Auto-load utilities available for enhanced functionality");
    }

    // Existing sidebar toggle logic is in the HTML, but we could move it here if desired

    console.log("[BillInwardOutwardDocApp] Setting up mode switcher...");

    // Mode switcher with focus management
    try {
      document.querySelectorAll("[data-shell-mode]").forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          const mode = (btn.dataset.shellMode || "").toLowerCase();
          setMode(mode);

          // UX: focus should start in ClientID when adding
          if (mode === "add") {
            setTimeout(() => {
              form?.querySelector('[name="HeaderClientID"]')?.focus();
            }, 50);
          }
        });
      });
      console.log("[BillInwardOutwardDocApp] ✓ Mode switcher configured");
    } catch (err) {
      console.error("[BillInwardOutwardDocApp] ❌ Error setting up mode switcher:", err);
    }

    console.log("[BillInwardOutwardDocApp] About to auto-load branch...");

    // Auto-load logged-in user's branch on initialization
    // Give a brief delay to ensure all form elements are ready
    try {
      setTimeout(() => {
        console.log("[BillInwardOutwardDocApp] Calling autoLoadLoggedInBranch from init()...");
        autoLoadLoggedInBranch().catch(err => {
          console.error("[BillInwardOutwardDocApp] Error in autoLoadLoggedInBranch:", err);
        });
      }, 100);
    } catch (e) {
      console.error("[BillInwardOutwardDocApp] Exception scheduling autoLoadLoggedInBranch:", e);
    }

    console.log("[BillInwardOutwardDocApp] Initialization complete");
  }

  /**
   * Auto-load the logged-in user's branch into the HeaderBranchID field
   * Only loads if the field is empty (allows manual override)
   * Automatically resolves and populates the Branch Name
   */
  async function autoLoadLoggedInBranch() {
    try {
      console.log("[BillInwardOutwardDocApp] Starting autoLoadLoggedInBranch...");
      console.log("[BillInwardOutwardDocApp] Form element:", form);
      console.log("[BillInwardOutwardDocApp] Form ID:", form?.id);
      
      if (!form) {
        console.error("[BillInwardOutwardDocApp] ❌ Form element is null/undefined");
        return;
      }

      const branchIdInput = form.querySelector('[name="HeaderBranchID"]');
      const branchNameInput = form.querySelector('[name="HeaderBranchName"]');

      console.log("[BillInwardOutwardDocApp] Branch inputs found:", {
        branchIdInput: !!branchIdInput,
        branchNameInput: !!branchNameInput,
        branchIdName: branchIdInput?.name,
        branchNameName: branchNameInput?.name
      });

      if (!branchIdInput) {
        console.warn("[BillInwardOutwardDocApp] ⚠️ HeaderBranchID input not found in DOM");
        // Try alternate lookups
        const allInputs = form.querySelectorAll('input[type="text"]');
        console.log("[BillInwardOutwardDocApp] Found", allInputs.length, "text inputs in form");
        allInputs.forEach((inp, i) => {
          if (inp.getAttribute('name')?.includes('Branch') || inp.placeholder?.includes('Branch')) {
            console.log(`  [${i}] name="${inp.getAttribute('name')}" placeholder="${inp.placeholder}"`);
          }
        });
        return;
      }

      // Only auto-load if the field is empty
      const currentValue = (branchIdInput.value || '').trim();
      if (currentValue) {
        console.log("[BillInwardOutwardDocApp] ℹ️ HeaderBranchID already has value:", currentValue);
        return;
      }

      // Get logged-in user's branch from session
      // Check multiple possible property names (different formats in different contexts)
      const session = global.AuthService?.getSession?.() || {};
      console.log("[BillInwardOutwardDocApp] Session data:", {
        hasAuthService: !!global.AuthService,
        hasSession: !!session,
        sessionKeys: Object.keys(session)
      });

      const loggedInBranch = 
        session?.branchId || 
        session?.branchID || 
        session?.OurBranchID || 
        session?.ourBranchID || 
        "";

      if (!loggedInBranch) {
        console.warn("[BillInwardOutwardDocApp] ⚠️ No logged-in branch found in session");
        console.warn("[BillInwardOutwardDocApp] Session object keys:", Object.keys(session));
        return;
      }

      console.log("[BillInwardOutwardDocApp] ✓ Auto-loading logged-in branch ID:", loggedInBranch);

      // Set the HeaderBranchID
      branchIdInput.value = loggedInBranch;
      branchIdInput.dataset.autoLoadedFromSession = "true";

      // Resolve and set the HeaderBranchName automatically
      if (branchNameInput) {
        try {
          const branchName = await resolveBranchName(loggedInBranch);
          if (branchName) {
            branchNameInput.value = branchName;
            console.log("[BillInwardOutwardDocApp] ✓ Resolved branch name:", branchName);
          } else {
            console.warn("[BillInwardOutwardDocApp] ⚠️ Could not resolve branch name for ID:", loggedInBranch);
          }
        } catch (err) {
          console.error("[BillInwardOutwardDocApp] ❌ Error resolving branch name:", err);
        }
      } else {
        console.warn("[BillInwardOutwardDocApp] ⚠️ HeaderBranchName input not found, skipping name resolution");
      }

      console.log("[BillInwardOutwardDocApp] ✓ Successfully auto-loaded logged-in branch:", {
        branchId: branchIdInput.value,
        branchName: branchNameInput?.value || "(not resolved)"
      });
    } catch (error) {
      console.error("[BillInwardOutwardDocApp] ❌ Error auto-loading branch:", error);
      console.error("[BillInwardOutwardDocApp] Error stack:", error?.stack);
    }
  }

  // Button handlers below (Clear, Cancel, Refresh, Save)
  // These are attached after init()

  // Wait for DOM to be fully ready before attaching button handlers
  setTimeout(() => {
    // **CLEAR BUTTON HANDLER**
    const clearBtn = document.querySelector('[data-submit-action="clear"]');
    if (clearBtn) {
      console.log("[BillInwardOutwardDocApp] Attaching Clear button handler");
      clearBtn.addEventListener("click", (e) => {
        e.preventDefault();
        console.log("[BillInwardOutwardDocApp] Clear button clicked");

        // Clear all form fields
        const form = document.querySelector("form");
        if (form) {
          // Clear all input fields but preserve branch fields (HeaderBranchID/HeaderBranchName)
          form.querySelectorAll('input[type="text"], input[type="number"], input[type="date"], textarea').forEach(input => {
            const name = input.getAttribute('name') || '';
            if (name === 'HeaderBranchID' || name === 'HeaderBranchName') return; // preserve branch
            input.value = "";
          });

          // Clear all select/dropdowns
          form.querySelectorAll('select').forEach(select => {
            select.selectedIndex = 0;
          });

          // Clear all checkboxes
          form.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
          });

          console.log("[BillInwardOutwardDocApp] ✅ Form cleared");

          // Show success message
          if (typeof showToast === "function") {
            showToast("Form cleared successfully", "success");
          }

          // Focus on first field (ClientID) after clear
          setTimeout(() => {
            form.querySelector('[name="HeaderClientID"]')?.focus();
          }, 50);
        }
      });
    }

    // **CANCEL BUTTON HANDLER**
    const cancelBtn = document.querySelector('[data-submit-action="cancel"]');
    if (cancelBtn) {
      console.log("[BillInwardOutwardDocApp] Attaching Cancel button handler");
      cancelBtn.addEventListener("click", (e) => {
        e.preventDefault();
        console.log("[BillInwardOutwardDocApp] Cancel button clicked - clearing form");

        // Clear all form fields (same as Clear and Refresh buttons)
        const form = document.querySelector("form");
        if (form) {
          // Clear all input fields
          form.querySelectorAll('input[type="text"], input[type="number"], input[type="date"], textarea').forEach(input => {
            input.value = "";
          });

          // Clear all select/dropdowns
          form.querySelectorAll('select').forEach(select => {
            select.selectedIndex = 0;
          });

          // Clear all checkboxes
          form.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
          });

          console.log("[BillInwardOutwardDocApp] ✅ Form cleared via Cancel");

          // Show success message
          if (typeof showToast === "function") {
            showToast("Form cancelled and cleared", "info");
          }

          // Focus on first field
          setTimeout(() => {
            form.querySelector('[name="HeaderClientID"]')?.focus();
          }, 50);
        }
      });
    }

    // **IMPROVE REFRESH BUTTON** - Make it clear the form
    const refreshBtn = document.querySelector('[data-action="refresh"]');
    if (refreshBtn) {
      console.log("[BillInwardOutwardDocApp] Re-attaching improved Refresh button handler");
      // Remove old handler by cloning the button
      const newRefreshBtn = refreshBtn.cloneNode(true);
      refreshBtn.parentNode.replaceChild(newRefreshBtn, refreshBtn);

      newRefreshBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("[BillInwardOutwardDocApp] Refresh button clicked - clearing form");

        // Clear all form fields (same as Clear button)
        const form = document.querySelector("form");
        if (form) {
          // Clear all input fields
          form.querySelectorAll('input[type="text"], input[type="number"], input[type="date"], textarea').forEach(input => {
            input.value = "";
          });

          // Clear all select/dropdowns
          form.querySelectorAll('select').forEach(select => {
            select.selectedIndex = 0;
          });

          // Clear all checkboxes
          form.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
          });

          console.log("[BillInwardOutwardDocApp] ✅ Form cleared via Refresh");

          // Show success message
          if (typeof showToast === "function") {
            showToast("Form refreshed", "success");
          }

          // Focus on first field
          setTimeout(() => {
            form.querySelector('[name="HeaderClientID"]')?.focus();
          }, 50);
        }
      });
    }

    // **SAVE BUTTON HANDLER**
    const saveBtn = document.querySelector('[data-submit-action="save"]');
    if (saveBtn) {
      console.log("[BillInwardOutwardDocApp] Attaching Save button handler");
      saveBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        console.log("[BillInwardOutwardDocApp] Save button clicked");

        // Validate basic identifying fields (use actual input names present in form)
        const requiredFields = ["HeaderBranchID", "HeaderClientID", "HeaderAccountID", "HeaderProductID", "BillTypeID", "BillAmount"];
        const missing = requiredFields.filter(f => !form?.querySelector(`[name="${f}"]`)?.value);
        // Log current values for debugging why save may abort
        try {
          const values = requiredFields.reduce((acc, f) => {
            const el = form?.querySelector(`[name="${f}"]`);
            acc[f] = el ? (el.value || '') : null;
            return acc;
          }, {});
          console.log('[BillInwardOutwardDocApp] Required field values at Save:', values);
        } catch (e) { console.warn('[BillInwardOutwardDocApp] Error reading required fields for debug', e); }

        if (missing.length > 0) {
          console.warn('[BillInwardOutwardDocApp] Missing required fields:', missing);
          const msg = `Missing required fields: ${missing.join(", ")}`;
          if (typeof setToast === "function") setToast(msg, "error");
          else if (typeof showToast === "function") showToast(msg, "error");
          return;
        }

        try {
          // Construct ExtraDetails JSON as required by p_AddEditBillApplication
          const extraDetailsObj = {
            PresentingBank: form?.querySelector('[name="PresentingBankRef"]')?.value || "",
            PresentingBankAccountID: form?.querySelector('[name="PresentingBankAccountID"]')?.value || "",
            DisposalDocument: form?.querySelector('[name="DisposalDocument"]')?.value || "",
            AmountClaimed: form?.querySelector('[name="AmountClaimed"]')?.value?.replace(/,/g, '') || "0",
            ChargesClaimed: form?.querySelector('[name="ChargesClaimed"]')?.value?.replace(/,/g, '') || "0",
            RelatedReference: form?.querySelector('[name="RelatedReference"]')?.value || "NONREF",
            SenderToReceiverInfo: form?.querySelector('[name="SenderToReceiverInfo"]')?.value || "",
            AdditionalInformation: ""
          };

          const todayStr = new Date().toISOString().slice(0, 10);

          // Collect form data mapped to dbo.p_AddEditBillApplication parameters
          const formData = {
            ApplicationID: form?.querySelector('[name="HeaderApplicationID"]')?.value || "0",
            OurBranchID: form?.querySelector('[name="HeaderBranchID"]')?.value || "",
            ClientID: form?.querySelector('[name="HeaderClientID"]')?.value || "",
            ProductID: form?.querySelector('[name="HeaderProductID"]')?.value || "",
            AccountID: form?.querySelector('[name="HeaderAccountID"]')?.value || "",
            BDTypeID: form?.querySelector('[name="BillTypeID"]')?.value || "",
            ReferenceNumber: form?.querySelector('[name="LCPOReferenceNo"]')?.value || "",
            Amount: form?.querySelector('[name="BillAmount"]')?.value?.replace(/,/g, '') || "0",
            LocalAmount: form?.querySelector('[name="LocalAmount"]')?.value?.replace(/,/g, '') || "0",
            DrawerID: form?.querySelector('[name="DrawerID"]')?.value || "",
            PayeeID: form?.querySelector('[name="PayeeID"]')?.value || "",
            PayeeAccountID: form?.querySelector('[name="PayeeAccountID"]')?.value || "",
            BillDate: form?.querySelector('[name="BillDate"]')?.value || todayStr,
            GracePeriod: form?.querySelector('[name="GracePeriod"]')?.value || "0",
            DueDate: form?.querySelector('[name="ExpiryDueDate"]')?.value || todayStr,
            InterestRate: form?.querySelector('[name="InterestRate"]')?.value || "0",
            MarginTypeID: form?.querySelector('[name="MarginType"]')?.value || "",
            MarginCurrency: form?.querySelector('[name="MarginCurrency"]')?.value || "",
            MarginAmount: form?.querySelector('[name="MarginAmountPercentage"]')?.value?.replace(/,/g, '') || "0",
            MarginAccount: form?.querySelector('[name="MarginAccountID"]')?.value || "",
            CreditAccountID: form?.querySelector('[name="CreditAccountID"]')?.value || "",
            OverdueAccountID: form?.querySelector('[name="OverdueAccountID"]')?.value || "",
            Remarks: form?.querySelector('[name="Remarks"]')?.value || "",
            BDApplStatusID: "P",
            RejectedReason: "",
            CreatedBy: global.AuthService?.getOperatorID() || "SYS",
            CreatedOn: null,
            ModifiedBy: null,
            ModifiedOn: null,
            SupervisedBy: null,
            SupervisedOn: null,
            UpdateCount: 1, // Default for new
            SerialID: 0,
            LCClientID: form?.querySelector('[name="LCPOClientID"]')?.value || "",
            LCReferenceNo: form?.querySelector('[name="LCPOReferenceNo"]')?.value || "",
            CurrencyID: form?.querySelector('[name="CurrencyID"]')?.value || "",
            FxPermitNumber: form?.querySelector('[name="FXPermitNumber"]')?.value || "",
            ExchangeRate: form?.querySelector('[name="ExchangeRate"]')?.value || "1",
            AccountMarginAmount: form?.querySelector('[name="AccountMarginAmount"]')?.value?.replace(/,/g, '') || "0",
            LocalCurrencyEquivalent: null,
            OutstandingAmount: null,
            DebitAccountID: form?.querySelector('[name="CreditDebitAccountID"]')?.value || "",
            DiscrepancyRemarks: form?.querySelector('[name="DiscrepancyRemarks"]')?.value || "",
            ExtraDetails: JSON.stringify(extraDetailsObj)
          };

          console.log("[BillInwardOutwardDocApp] Submitting form data:", formData);

          // Build API request
          const apiRequest = {
            RequestID: "dbo.p_AddEditBillApplication",
            FormId: "dbo.p_AddEditBillApplication",
            RequestData: formData,
            RequestTime: new Date().toISOString(),
            AppName: "PROJECT_KAIRO",
            Checksum: ""
          };

          console.log("[BillInwardOutwardDocApp] Sending API request:", apiRequest);

          // Call API - adjust endpoint as needed
          const CoreApi = global.CoreApi || window.CoreApi;
          if (!CoreApi) throw new Error("CoreApi not available");

          const response = await CoreApi.post("/api/OldAPI", apiRequest);
          console.log("[BillInwardOutwardDocApp] Save response:", response);

          if (response?.success) {
            console.log("[BillInwardOutwardDocApp] ✅ Save successful!");
            const savedApplicationId = response?.data?.ApplicationID || response?.data?.SerialID || formData.ApplicationID;

            if (typeof setToast === "function") setToast(`Application saved successfully. ID: ${savedApplicationId}`, "success");
            else if (typeof showToast === "function") showToast("Bill Application saved successfully!", "success");

            const appIdField = form?.querySelector('[name="ApplicationID"]');
            if (appIdField && (!appIdField.value || appIdField.value === "0")) {
              appIdField.value = savedApplicationId;
            }

            // Reload data and switch mode
            setTimeout(async () => {
              try {
                if (typeof onLoadBillApplication === "function") {
                  await onLoadBillApplication();
                  console.log("[BillInwardOutwardDocApp] ✅ Data reloaded successfully!");
                  if (typeof setMode === "function") setMode("edit");
                }
              } catch (reloadErr) {
                console.error("[BillInwardOutwardDocApp] Reload error:", reloadErr);
              }
            }, 500);
          } else {
            throw new Error(response?.message || "Save failed");
          }
        } catch (error) {
          console.error("[BillInwardOutwardDocApp] ❌ Save error:", error);
          const errorMsg = "Error saving: " + (error.message || "Unknown error");
          if (typeof setToast === "function") setToast(errorMsg, "error");
          else if (typeof showToast === "function") showToast(errorMsg, "error");
        }
      });
    }
  }, 100); // End of setTimeout for button handlers

  // **EVENT DELEGATION APPROACH**
  // Attach handlers to FORM instead of inputs - immune to element replacement
  setTimeout(() => {
    console.log("[BillInwardOutwardDocApp] ===== EVENT DELEGATION START =====");

    const targetForm = document.querySelector("form");
    if (!targetForm) {
      console.error("[BillInwardOutwardDocApp] Form not found!");
      return;
    }

    console.log("[BillInwardOutwardDocApp] Attaching delegated event listeners to FORM");

    // Branch lookup handler
    const handleBranchLookup = async (branchIdInput) => {
      console.log("[BillInwardOutwardDocApp] 🔥 BRANCH LOOKUP TRIGGERED");
      const branchId = (branchIdInput.value || "").trim();
      console.log("[BillInwardOutwardDocApp] BranchID value:", branchId);
      console.log("[BillInwardOutwardDocApp] Input field name:", branchIdInput.name);

      if (!branchId) {
        console.log("[BillInwardOutwardDocApp] Empty branchId, skipping");
        return;
      }

      try {
        console.log("[BillInwardOutwardDocApp] Calling searchBranches with ID:", branchId);
        const result = await global.BillAccountService.searchBranches(branchId);
        console.log("[BillInwardOutwardDocApp] ✅ AWAIT COMPLETED!");
        console.log("[BillInwardOutwardDocApp] Raw API result:", result);
        console.log("[BillInwardOutwardDocApp] Result type:", typeof result);
        console.log("[BillInwardOutwardDocApp] Result keys:", result ? Object.keys(result) : "null");

        // Try multiple possible response structures (like bill-account-application.js does)
        let branches = [];

        if (result?.data && typeof result.data === 'object') {
          // Try common array properties
          branches = result.data.Details01 || result.data.Details || result.data.TableResults ||
            result.data.Result || result.data.Results || result.data || [];
          console.log("[BillInwardOutwardDocApp] Extracted from result.data, length:", Array.isArray(branches) ? branches.length : "not array");
        }

        // If Details is a single object, wrap it in array
        if (!Array.isArray(branches) || branches.length === 0) {
          if (result?.data?.Details && typeof result.data.Details === 'object' && !Array.isArray(result.data.Details)) {
            branches = [result.data.Details];
            console.log("[BillInwardOutwardDocApp] Wrapped single Details object");
          } else if (result?.Details && typeof result.Details === 'object') {
            branches = Array.isArray(result.Details) ? result.Details : [result.Details];
            console.log("[BillInwardOutwardDocApp] Used top-level Details");
          }
        }

        // Fallback delegated save handler (defensive): if the primary save handler failed
        // to attach (e.g., init didn't complete), this ensures a save attempt still
        // reaches the API and logs useful diagnostics. Uses a minimal payload.
        document.addEventListener('click', async function (ev) {
          try {
            const btn = ev.target.closest && ev.target.closest('[data-submit-action="save"]');
            if (!btn) return;
            // If primary handler already processed this click, skip
            if (btn.__billFallbackProcessed) return;
            btn.__billFallbackProcessed = true;

            console.log('[BillInwardOutwardDocApp] Fallback save handler triggered');
            ev.preventDefault();
            ev.stopPropagation();

            const formEl = document.querySelector('form');
            if (!formEl) {
              console.error('[BillInwardOutwardDocApp] Fallback save: form element not found');
              return;
            }

            const payload = Object.fromEntries(new FormData(formEl).entries());
            // Minimal required fields for server-side validation
            const required = ['HeaderBranchID', 'HeaderClientID', 'HeaderAccountID', 'HeaderProductID', 'BillTypeID', 'BillAmount'];
            const missing = required.filter(f => !payload[f]);
            if (missing.length) {
              const msg = `Fallback Save aborted - missing required fields: ${missing.join(', ')}`;
              console.warn('[BillInwardOutwardDocApp] ' + msg);
              if (typeof setToast === 'function') setToast(msg, 'danger');
              return;
            }

            // Build minimal request matching p_AddEditBillApplication expectations
            const apiData = {
              ApplicationID: payload.HeaderApplicationID || '0',
              OurBranchID: payload.HeaderBranchID || '',
              ClientID: payload.HeaderClientID || '',
              ProductID: payload.HeaderProductID || '',
              AccountID: payload.HeaderAccountID || '',
              BDTypeID: payload.BillTypeID || '',
              Amount: (payload.BillAmount || '0').toString().replace(/,/g, ''),
              Remarks: payload.Remarks || '',
              ExtraDetails: JSON.stringify({ fallback: true })
            };

            console.log('[BillInwardOutwardDocApp] Fallback Save payload:', apiData);

            const CoreApi = global.CoreApi || window.CoreApi;
            if (!CoreApi || typeof CoreApi.makeRequestEnvelope !== 'function' || typeof CoreApi.post !== 'function') {
              console.error('[BillInwardOutwardDocApp] CoreApi not available for fallback save');
              if (typeof setToast === 'function') setToast('Save failed: CoreApi unavailable', 'danger');
              return;
            }

            const envelope = CoreApi.makeRequestEnvelope('dbo.p_AddEditBillApplication', apiData);
            const url = `${(global.Environment?.baseUrlCommon || '').replace(/\/$/, '')}/api/OldAPI` || '/api/OldAPI';

            console.log('[BillInwardOutwardDocApp] Fallback Save sending envelope to', url, envelope);
            const resp = await CoreApi.post(url, envelope);
            console.log('[BillInwardOutwardDocApp] Fallback Save response:', resp);

            if (resp?.success) {
              if (typeof setToast === 'function') setToast('Application saved (fallback).', 'success');
            } else {
              const errMsg = resp?.message || 'Unknown server error';
              console.error('[BillInwardOutwardDocApp] Fallback save failed:', errMsg, resp);
              if (typeof setToast === 'function') setToast('Save failed: ' + errMsg, 'danger');
            }
          } catch (e) {
            console.error('[BillInwardOutwardDocApp] Exception in fallback save handler:', e);
            if (typeof setToast === 'function') setToast('Save failed: ' + (e?.message || 'Exception'), 'danger');
          }
        }, true);

        console.log("[BillInwardOutwardDocApp] Got branches:", branches.length);
        console.log("[BillInwardOutwardDocApp] Branches array:", branches);

        if (branches.length > 0) {
          console.log("[BillInwardOutwardDocApp] First branch:", branches[0]);
          console.log("[BillInwardOutwardDocApp] Looking for OurBranchID:", branchId);
        }

        // Find match - try multiple property names like bill-account-application.js
        const match = branches.find(b => {
          const candidate = String(b?.BranchID ?? b?.branchId ?? b?.BranchId ?? b?.BRANCHID ?? b?.OurBranchID ?? b?.ourBranchId ?? '').trim();
          console.log("[BillInwardOutwardDocApp] Comparing:", candidate, "===", branchId);
          return candidate === branchId;
        }) || branches[0]; // Fallback to first result if no exact match

        console.log("[BillInwardOutwardDocApp] Match found?", !!match, match);

        if (match) {
          // Find the corresponding BranchName field
          let nameField;

          if (branchIdInput.name === 'HeaderBranchID') {
            // For HeaderBranchID, find HeaderBranchName
            nameField = targetForm.querySelector('[name="HeaderBranchName"]');
            console.log("[BillInwardOutwardDocApp] Looking for HeaderBranchName field, found?", !!nameField);
          } else {
            // For BranchID, find BranchName
            nameField = targetForm.querySelector('[name="BranchName"]');
            console.log("[BillInwardOutwardDocApp] Looking for BranchName field, found?", !!nameField);
          }

          if (nameField) {
            // Try multiple name properties
            const branchName = match.BranchName || match.branchName || match.Name || match.name || "";
            nameField.value = branchName;
            console.log("[BillInwardOutwardDocApp] ✅ SET BranchName:", branchName);

            // Show success toast
            if (typeof showToast === "function") {
              showToast("Branch loaded: " + branchName, "success");
            }
          } else {
            console.warn("[BillInwardOutwardDocApp] ❌ BranchName field not found!");
          }
        } else {
          console.warn("[BillInwardOutwardDocApp] ❌ No match for:", branchId);
          if (typeof showToast === "function") {
            showToast("Branch not found: " + branchId, "error");
          }
        }
      } catch (e) {
        console.error("[BillInwardOutwardDocApp] ❌❌❌ CAUGHT ERROR:", e);
        console.error("[BillInwardOutwardDocApp] Error message:", e?.message);
        console.error("[BillInwardOutwardDocApp] Error stack:", e?.stack);
      }

      console.log("[BillInwardOutwardDocApp] 🏁 HANDLER FINISHED");
    };

    // DELEGATED EVENT LISTENERS on FORM
    // These work even if input elements are replaced/recreated

    // Capture all focusout events
    targetForm.addEventListener('focusout', (e) => {
      console.log("[BillInwardOutwardDocApp] 🔥 FORM FOCUSOUT - target:", e.target.name || "<empty string>");

      if (e.target.name === 'BranchID' || e.target.name === 'HeaderBranchID') {
        console.log("[BillInwardOutwardDocApp] ✅ BranchID focusout detected!");
        handleBranchLookup(e.target);
      }
    }, true); // Capture phase

    // Capture all blur events
    targetForm.addEventListener('blur', (e) => {
      console.log("[BillInwardOutwardDocApp] 🔥 FORM BLUR - target:", e.target.name || "<empty string>");

      if (e.target.name === 'BranchID' || e.target.name === 'HeaderBranchID') {
        console.log("[BillInwardOutwardDocApp] ✅ BranchID blur detected!");
        handleBranchLookup(e.target);
      }
    }, true); // Capture phase

    // Capture all change events
    targetForm.addEventListener('change', (e) => {
      console.log("[BillInwardOutwardDocApp] 🔥 FORM CHANGE - target:", e.target.name || "<empty string>");

      if (e.target.name === 'BranchID' || e.target.name === 'HeaderBranchID') {
        console.log("[BillInwardOutwardDocApp] ✅ BranchID change detected!");
        handleBranchLookup(e.target);
      }
    }, true);

    // Capture all input events
    targetForm.addEventListener('input', (e) => {
      if (e.target.name === 'BranchID' || e.target.name === 'HeaderBranchID') {
        console.log("[BillInwardOutwardDocApp] 🔥 FORM INPUT - BranchID value:", e.target.value);
      }
    }, true);

    // Capture all keydown events
    targetForm.addEventListener('keydown', (e) => {
      if (e.target.name === 'BranchID' || e.target.name === 'HeaderBranchID') {
        console.log("[BillInwardOutwardDocApp] 🔥 FORM KEYDOWN - key:", e.key, "value:", e.target.value);

        if (e.key === 'Tab' || e.key === 'Enter') {
          console.log("[BillInwardOutwardDocApp] ✅ Tab/Enter on BranchID!");
          setTimeout(() => handleBranchLookup(e.target), 50);
        }
      }

      // ClientID - Move to AccountID after population
      if (e.target.name === 'HeaderClientID' && (e.key === 'Tab' || e.key === 'Enter')) {
        console.log("[BillInwardOutwardDocApp] ✅ Tab/Enter on ClientID!");
        setTimeout(async () => {
          await handleClientLookup(e.target);
          // Move focus to AccountID
          targetForm.querySelector('[name="HeaderAccountID"]')?.focus();
        }, 50);
      }

      // AccountID - Move to ProductID after population
      if (e.target.name === 'HeaderAccountID' && (e.key === 'Tab' || e.key === 'Enter')) {
        console.log("[BillInwardOutwardDocApp] ✅ Tab/Enter on AccountID!");
        setTimeout(async () => {
          await handleAccountLookup(e.target);
          // Move focus to ProductID
          targetForm.querySelector('[name="HeaderProductID"]')?.focus();
        }, 50);
      }

      // ProductID - Populate ProductName
      if (e.target.name === 'HeaderProductID' && (e.key === 'Tab' || e.key === 'Enter')) {
        console.log("[BillInwardOutwardDocApp] ✅ Tab/Enter on ProductID!");
        setTimeout(() => handleProductLookup(e.target), 50);
      }

      if (e.target.name === 'ApplicationID' && e.key === 'Enter') {
        console.log("[BillInwardOutwardDocApp] ✅ Enter on ApplicationID!");
        e.preventDefault();
        void onLoadBillApplication();
      }
    }, true);

    // ClientID lookup handler
    const handleClientLookup = async (clientIdInput) => {
      console.log("[BillInwardOutwardDocApp] 🔥 CLIENT LOOKUP TRIGGERED");
      const clientId = (clientIdInput.value || "").trim();

      if (!clientId) return;

      try {
        console.log("[BillInwardOutwardDocApp] Calling searchClients with ID:", clientId);
        // Assuming similar service exists - adjust as needed
        const result = await global.BillAccountService.searchClients?.(clientId);

        if (result?.data) {
          const clients = Array.isArray(result.data) ? result.data : [result.data];
          const match = clients.find(c => c.ClientID === clientId) || clients[0];

          if (match) {
            const nameField = targetForm.querySelector('[name="HeaderClientName"]');
            if (nameField) {
              nameField.value = match.ClientName || match.Name || "";
              console.log("[BillInwardOutwardDocApp] ✅ SET ClientName:", match.ClientName);
            }
          }
        }
      } catch (e) {
        console.error("[BillInwardOutwardDocApp] Client lookup error:", e);
      }
    };

    // AccountID lookup handler
    const handleAccountLookup = async (accountIdInput) => {
      console.log("[BillInwardOutwardDocApp] 🔥 ACCOUNT LOOKUP TRIGGERED");
      const accountId = (accountIdInput.value || "").trim();

      if (!accountId) return;

      try {
        console.log("[BillInwardOutwardDocApp] Calling searchAccounts with ID:", accountId);
        const result = await global.BillAccountService.searchAccounts?.(accountId);

        if (result?.data) {
          // Normalize result array as done in other handlers (handleBranchLookup)
          let accounts = [];
          if (result?.data && typeof result.data === 'object') {
            accounts = result.data.Details01 || result.data.Details || result.data.TableResults || result.data.Result || result.data.Results || result.data || [];
          }
          if (!Array.isArray(accounts)) accounts = [accounts];
          const match = accounts.find(a => String(a?.AccountID ?? a?.accountId ?? a?.AccountId ?? '').trim() === accountId) || accounts[0];

          if (match) {
            const nameField = targetForm.querySelector('[name="HeaderAccountName"]');
            if (nameField) {
              nameField.value = match.AccountName || match.accountName || match.Name || match.Description || "";
              console.log("[BillInwardOutwardDocApp] ✅ SET AccountName:", match.AccountName);
            }
            // If product info is present on the account record, set it immediately
            const mProdId = match.ProductID || match.ProductId || match.AccountProductID || match.AccountProductId;
            const mProdName = match.ProductName || match.AccountProductName || match.ProductDesc || match.Description;
            if (mProdId) setFieldValue('HeaderProductID', mProdId);
            if (mProdName) setFieldValue('HeaderProductName', mProdName);
            if (mProdId || mProdName) {
              try {
                const toastMsg = mProdName ? `Product loaded: ${mProdName}` : "Product loaded";
                if (typeof showToast === "function") showToast(toastMsg, "success");
                else if (typeof setToast === "function") setToast(toastMsg, "success");
              } catch { }
            }
            // Trigger Product auto-load after account is resolved
            const clientId = targetForm.querySelector('[name="HeaderClientID"]')?.value || "";
            void onLoadAccountDetails(accountId, clientId);
          }
        }
      } catch (e) {
        console.error("[BillInwardOutwardDocApp] Account lookup error:", e);
      }
    };

    // ProductID lookup handler
    const handleProductLookup = async (productIdInput) => {
      console.log("[BillInwardOutwardDocApp] 🔥 PRODUCT LOOKUP TRIGGERED");
      const productId = (productIdInput.value || "").trim();

      if (!productId) return;

      try {
        console.log("[BillInwardOutwardDocApp] Calling searchProducts with ID:", productId);
        const result = await global.BillAccountService.searchProducts?.(productId);

        if (result?.data) {
          // Normalize result array similar to branch/account
          let products = [];
          if (result?.data && typeof result.data === 'object') {
            products = result.data.Details01 || result.data.Details || result.data.TableResults || result.data.Result || result.data.Results || result.data || [];
          }
          if (!Array.isArray(products)) products = [products];
          const match = products.find(p => String(p?.ProductID ?? p?.ProductId ?? p?.productId ?? '').trim() === productId) || products[0];

          if (match) {
            const nameField = targetForm.querySelector('[name="HeaderProductName"]');
            if (nameField) {
              nameField.value = match.ProductName || match.productName || match.AccountProductName || match.Description || match.Name || "";
              console.log("[BillInwardOutwardDocApp] ✅ SET ProductName:", nameField.value);
              // Toast on manual ProductID resolution
              try {
                const toastMsg = nameField.value ? `Product loaded: ${nameField.value}` : "Product loaded";
                if (typeof showToast === "function") showToast(toastMsg, "success");
                else if (typeof setToast === "function") setToast(toastMsg, "success");
              } catch { }
            }
          }
        }
      } catch (e) {
        console.error("[BillInwardOutwardDocApp] Product lookup error:", e);
      }
    };

    // Capture focus events for debugging
    targetForm.addEventListener('focus', (e) => {
      if (e.target.name === 'BranchID' || e.target.name === 'HeaderBranchID') {
        console.log("[BillInwardOutwardDocApp] 🔥 FORM FOCUS - BranchID focused");
      }
    }, true);

    // Blur handlers for auto-population
    targetForm.addEventListener('blur', (e) => {
      if (e.target.name === 'ApplicationID') {
        console.log("[BillInwardOutwardDocApp] 🔥 ApplicationID blur detected!");
        void onLoadBillApplication();
      }

      // ClientID blur - populate ClientName
      if (e.target.name === 'HeaderClientID') {
        console.log("[BillInwardOutwardDocApp] 🔥 ClientID blur detected!");
        setTimeout(() => handleClientLookup(e.target), 50);
      }

      // AccountID blur - populate AccountName
      if (e.target.name === 'HeaderAccountID') {
        console.log("[BillInwardOutwardDocApp] 🔥 AccountID blur detected!");
        setTimeout(() => handleAccountLookup(e.target), 50);
      }

      // ProductID blur - populate ProductName
      if (e.target.name === 'HeaderProductID') {
        console.log("[BillInwardOutwardDocApp] 🔥 ProductID blur detected!");
        setTimeout(() => handleProductLookup(e.target), 50);
      }
    }, true);

    console.log("[BillInwardOutwardDocApp] ✅ EVENT DELEGATION ATTACHED TO FORM");
    console.log("[BillInwardOutwardDocApp] ===== EVENT DELEGATION END =====");
  }, 1500);

})(window);
