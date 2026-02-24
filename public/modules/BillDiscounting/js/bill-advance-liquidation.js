(() => {
    if (window.__billAdvanceLiquidationLoaded) {
        return;
    }
    window.__billAdvanceLiquidationLoaded = true;

    const supportedPages = ["bill-advance-liquidation"];
    const activePage = document.body?.dataset?.page;
    if (!supportedPages.includes(activePage)) {
        return;
    }

    const form = document.getElementById("advance-liquidation-form");
    let dependenciesReady = false;
    const toastEl = document.getElementById("formToast");

    function setToast(message, variant = "success") {
        if (!toastEl) return;
        toastEl.classList.remove("d-none", "alert-success", "alert-info", "alert-warning", "alert-danger");
        toastEl.classList.add(`alert-${variant}`);
        toastEl.textContent = message;
    }

    function hideToast() {
        toastEl?.classList.add("d-none");
    }

    function renderSearchFeedback(message, variant = "info") {
        setToast(message, variant);
    }

    // Load dependencies
    (async () => {
        const { ServiceLoader } = window;
        if (!ServiceLoader) {
            console.error("[BillAdvanceLiquidation] ServiceLoader not found!");
            return;
        }

        try {
            await ServiceLoader.loadCore();
            await ServiceLoader.loadAuthService();
            await ServiceLoader.loadBillAccountService();
            await ServiceLoader.loadLookupService();

            dependenciesReady = true;
            console.log("[BillAdvanceLiquidation] Dependencies loaded");
            init();
        } catch (error) {
            console.error("[BillAdvanceLiquidation] Failed to load dependencies:", error);
        }
    })();

    function showSearchResults(label, results, idField, nameField, searchTerm, searchFnName) {
        if (!results || results.length === 0) {
            renderSearchFeedback(`No ${label} results found.`, "warning");
            return;
        }

        const modalId = `search-results-${Date.now()}`;
        const firstResult = results[0];
        const columnKeys = Object.keys(firstResult || {});
        // Filter out technical fields
        const displayKeys = columnKeys.filter(k =>
            !['UpdateCount', 'EventID', 'NewData', 'CreatedOn', 'ModifiedOn', 'SupervisedOn'].includes(k)
        );
        const tableHeaders = displayKeys.slice(0, 5).map(key => `<th style="background: linear-gradient(90deg, #1e7cc4 0%, #1a6ba3 100%) !important; color: white !important;">${key}</th>`).join('');

        const modalHTML = `
                    <div class="modal fade" id="${modalId}" tabindex="-1">
                        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable" style="--bs-modal-width: 50vw;">
              <div class="modal-content">
                <div class="modal-header d-flex align-items-center justify-content-between" style="background: linear-gradient(90deg, #1e7cc4 0%, #1a6ba3 100%); color: white;">
                  <div class="d-flex align-items-center gap-3">
                    <h5 class="modal-title mb-0" style="color: white;">${label} Search Results (${results.length})</h5>
                    <div class="input-group input-group-sm" style="width: 300px;">
                        <input type="text" class="form-control" id="inline-search-${modalId}" placeholder="Refine search..." value="${searchTerm || ''}">
                        <button class="btn btn-primary" type="button" id="inline-search-btn-${modalId}"><i class="bi bi-search"></i> Find</button>
                    </div>
                  </div>
                  <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" style="filter: brightness(0) invert(1);"></button>
                </div>
                <div class="modal-body">
                  <div class="table-responsive">
                    <table class="table table-hover table-sm">
                      <thead style="background: linear-gradient(90deg, #1e7cc4 0%, #1a6ba3 100%) !important; color: white !important;">
                        <tr>${tableHeaders}<th style="background: linear-gradient(90deg, #1e7cc4 0%, #1a6ba3 100%) !important; color: white !important;">Action</th></tr>
                      </thead>
                      <tbody>
                        ${results.slice(0, 50).map((item, idx) => `
                          <tr>
                            ${displayKeys.slice(0, 5).map(key => `<td>${item[key] || ''}</td>`).join('')}
                            <td><button type="button" class="btn btn-sm btn-primary select-result" data-idx="${idx}">Select</button></td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;

        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);

        const modalEl = document.getElementById(modalId);
        const modal = new (window.bootstrap?.Modal || window.Modal)(modalEl, { backdrop: 'static', keyboard: false });

        // Wire selection
        modalEl.querySelectorAll('.select-result').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                const result = results[idx];
                modal.hide();

                if (result[idField]) {
                    const idInput = form?.querySelector(`[name="${idField}"]`);
                    if (idInput) idInput.value = result[idField];

                    if (nameField) {
                        // Determine name field value based on entity type (logic from contract maintenance)
                        let nameValue = '';
                        if (idField === 'BranchID') {
                            nameValue = result.BranchName || result.OurBranchName || '';
                        } else if (idField === 'ClientID') {
                            nameValue = result.ClientName || result.Name || '';
                        } else if (idField === 'ProductID') {
                            nameValue = result.ProductName || result.Name || '';
                        } else if (idField === 'AccountID' || idField.includes('Account')) {
                            nameValue = result.AccountName || result.Name || '';
                        } else if (idField === 'CurrencyID') {
                            nameValue = result.CurrencyName || result.Name || '';
                        } else if (idField === 'ApplicationID') {
                            nameValue = result.ClientName || '';
                        } else {
                            nameValue = result[nameField] || result.Name || result.Description || '';
                        }

                        const nameInput = form?.querySelector(`[name="${nameField}"]`);
                        if (nameInput) nameInput.value = nameValue;
                    }
                    renderSearchFeedback(`${label} selected: ${result[idField]}`, "success");
                }

                setTimeout(() => modalEl.remove(), 500);
            });
        });

        // Wire inline search
        const inlineInput = modalEl.querySelector(`#inline-search-${modalId}`);
        const inlineBtn = modalEl.querySelector(`#inline-search-btn-${modalId}`);

        const triggerRefinedSearch = () => {
            const term = inlineInput.value.trim();
            modal.hide();
            setTimeout(() => modalEl.remove(), 500);
            // Assuming prevOrNext=0 for refined search
            performLookupSearch({ term, label, searchFnName, idField, nameField });
        };

        inlineBtn?.addEventListener('click', triggerRefinedSearch);
        inlineInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') triggerRefinedSearch();
        });

        modal.show();
        // Autofocus
        setTimeout(() => {
            inlineInput?.focus();
        }, 500);
    }

    async function performLookupSearch({ term, label, searchFnName, idField, nameField, prevOrNext = 0 }) {
        const searchTerm = (term || "").trim() || "%";
        const LookupService = window.LookupService;
        const BillAccountService = window.BillAccountService;

        const serviceFunc = searchFnName && BillAccountService && typeof BillAccountService[searchFnName] === "function"
            ? BillAccountService[searchFnName].bind(BillAccountService)
            : searchFnName && LookupService && typeof LookupService[searchFnName] === "function"
                ? LookupService[searchFnName].bind(LookupService)
                : null;

        if (!serviceFunc) {
            renderSearchFeedback(`${label} service is not available.`, "danger");
            return;
        }

        renderSearchFeedback(`Searching ${label}...`, "info");

        try {
            const response = await serviceFunc(searchTerm, prevOrNext);
            let results = [];

            if (response?.success) {
                if (Array.isArray(response.data)) {
                    results = response.data;
                } else if (response.data?.Details01) {
                    results = response.data.Details01;
                } else if (response.data?.Details) {
                    results = response.data.Details;
                }
            }

            showSearchResults(label, results, idField, nameField, searchTerm, searchFnName);
            if (results.length > 0) {
                renderSearchFeedback(`Found ${results.length} ${label} results`, "success");
            } else {
                renderSearchFeedback(`No ${label} results found`, "warning");
            }

        } catch (error) {
            renderSearchFeedback(error?.message || "Search failed", "danger");
        }
    }

    function attachSearchHandler(selector, getTerm, searchFnName, label, idField, nameField) {
        const button = document.querySelector(selector);
        button?.addEventListener("click", async (event) => {
            event.preventDefault();
            await performLookupSearch({ term: getTerm?.() || "", label, searchFnName, idField, nameField });
        });
    }

    function setFieldValue(fieldName, value) {
        const el = form?.querySelector(`[name="${fieldName}"]`);
        if (!el) return;
        el.value = value ?? "";
    }

    async function resolveBranchName(branchId) {
        const id = (branchId || "").toString().trim();
        if (!id) return null;
        const BillAccountService = window.BillAccountService;
        try {
            const resp = await BillAccountService.searchBranches(id);
            const rows = resp?.data?.Details01 || (Array.isArray(resp?.data) ? resp.data : []);
            const match = rows.find(r => String(r?.BranchID ?? r?.branchId ?? '').trim() === id) || rows[0];
            return match?.BranchName || match?.OurBranchName || null;
        } catch { return null; }
    }

    async function resolveApplicationName(applicationId) {
        const id = (applicationId || "").toString().trim();
        if (!id) return null;
        const BillAccountService = window.BillAccountService;
        try {
            const resp = await BillAccountService.searchApplications(id);
            const rows = resp?.data?.Details01 || (Array.isArray(resp?.data) ? resp.data : []);
            const match = rows.find(r => String(r?.ApplicationID ?? r?.applicationId ?? '').trim() === id) || rows[0];
            return match?.ClientName || match?.ApplicationID || null;
        } catch { return null; }
    }

    async function resolveAccountName(accountId) {
        const id = (accountId || "").toString().trim();
        if (!id) return null;
        const BillAccountService = window.BillAccountService;
        try {
            const resp = await BillAccountService.searchAccounts(id);
            const rows = resp?.data?.Details01 || (Array.isArray(resp?.data) ? resp.data : []);
            const match = rows.find(r => String(r?.AccountID ?? r?.accountId ?? '').trim() === id) || rows[0];
            return match?.AccountName || match?.Description || null;
        } catch { return null; }
    }

    async function resolveProductName(productId) {
        const id = (productId || "").toString().trim();
        if (!id) return null;
        const BillAccountService = window.BillAccountService;
        try {
            const resp = await BillAccountService.searchProducts(id);
            const rows = resp?.data?.Details01 || (Array.isArray(resp?.data) ? resp.data : []);
            const match = rows.find(r => String(r?.ProductID ?? r?.productId ?? '').trim() === id) || rows[0];
            return match?.ProductName || match?.Description || null;
        } catch { return null; }
    }

    async function updateName(idFieldName, nameFieldName, resolveFn) {
        const input = form?.querySelector(`[name="${idFieldName}"]`);
        const nameInput = form?.querySelector(`[name="${nameFieldName}"]`);
        const id = (input?.value || '').trim();

        if (!id) {
            if (nameInput) nameInput.value = "";
            return;
        }

        try {
            renderSearchFeedback(`Resolving ${idFieldName}...`, "info");
            const name = await resolveFn(id);

            if (name) {
                if (nameInput) nameInput.value = name;
                renderSearchFeedback(`${idFieldName} resolved`, "success");
            } else {
                renderSearchFeedback(`${idFieldName} not found`, "warning");
                if (nameInput) nameInput.value = "";
            }
        } catch (err) {
            console.error(`[BillAdvanceLiquidation] updateName error:`, err);
            renderSearchFeedback(`Failed to resolve ${idFieldName}`, "danger");
        }
    }

    function init() {
        console.log("[BillAdvanceLiquidation] Initializing search handlers...");

        attachSearchHandler("[data-branch-search]", () => form?.querySelector("[name=BranchID]")?.value, "searchBranches", "Branch", "BranchID", "BranchName");
        attachSearchHandler("[data-application-search]", () => form?.querySelector("[name=ApplicationID]")?.value, "searchApplications", "Application", "ApplicationID", "ApplicationName");
        attachSearchHandler("[data-debit-account-search]", () => form?.querySelector("[name=DebitAccountID]")?.value, "searchAccounts", "Debit Account", "AccountID", "AccountName");
        attachSearchHandler("[data-product-search]", () => form?.querySelector("[name=LoanProductID]")?.value, "searchProducts", "Loan Product", "ProductID", "ProductName");
        attachSearchHandler("[data-loan-account-search]", () => form?.querySelector("[name=LoanAccountID]")?.value, "searchAccounts", "Loan Account", "AccountID", "AccountName");

        // Blur Handlers - Using event delegation to survive form clears/refreshes
        form?.addEventListener("blur", (e) => {
            console.log("[BillAdvanceLiquidation] Blur event on:", e.target.name);
            if (e.target.name === "BranchID") {
                updateName("BranchID", "BranchName", resolveBranchName);
            } else if (e.target.name === "ApplicationID") {
                updateName("ApplicationID", "ApplicationName", resolveApplicationName);
            } else if (e.target.name === "DebitAccountID") {
                updateName("DebitAccountID", "AccountName", resolveAccountName);
            } else if (e.target.name === "LoanProductID") {
                updateName("LoanProductID", "ProductName", resolveProductName);
            } else if (e.target.name === "LoanAccountID") {
                updateName("LoanAccountID", "AccountName", resolveAccountName);
            }
        }, true);

        // Auto-load name resolution for all ID fields on blur (tab out)
        // The blur handlers above automatically populate name fields when user tabs out after entering an ID
        if (global.BillDiscountingAutoLoadUtil && dependenciesReady) {
            // All blur handlers are already wired above
            // This provides universal auto-load capability across all Trade Finance forms
            console.log("[BillAdvanceLiquidation] Auto-load utilities available");
        }

        console.log("[BillAdvanceLiquidation] Search handlers initialized");
    }

    // Handle cancel/back buttons
    document.addEventListener("click", (event) => {
        const button = event.target.closest("[data-advance-liquidation-action]");
        if (!button) return;

        const action = (button.dataset.advanceLiquidationAction || "").trim().toLowerCase();
        if (action !== "cancel" && action !== "back") return;

        try {
            const parent = window.parent;
            const modalId = "billAdvanceLiquidationModal";
            const modalEl = parent?.document?.getElementById(modalId);

            if (modalEl) {
                const bootstrapLib = parent?.bootstrap || window.bootstrap;
                if (bootstrapLib?.Modal) {
                    const instance = bootstrapLib.Modal.getInstance(modalEl) || bootstrapLib.Modal.getOrCreateInstance(modalEl);
                    if (instance) {
                        instance.hide();
                        return;
                    }
                }
            }
        } catch (e) {
            console.error("Failed to close parent modal", e);
        }

        window.history.back();
    });
})();

