(function (global) {
    if (global.__billContractMaintenanceLoaded) {
        return;
    }
    global.__billContractMaintenanceLoaded = true;

    // ============================================
    // DOM ELEMENTS & STATE
    // ============================================

    const form = document.getElementById("bill-contract-form");
    const toastContainer = document.getElementById("toastContainer");

    const supportedPages = ["bill-contract-maintenance"];
    const activePage = document.body?.dataset?.page;
    if (!supportedPages.includes(activePage)) {
        return;
    }

    let dependenciesReady = false;

    // Load dependencies using ServiceLoader
    (async () => {
        const { ServiceLoader } = global;
        if (!ServiceLoader) {
            console.error("[BillContractMaintenance] ServiceLoader not found!");
            return;
        }

        try {
            await ServiceLoader.loadCore();
            await ServiceLoader.loadAuthService();
            await ServiceLoader.loadBillAccountService();
            await ServiceLoader.loadLookupService();
            await ServiceLoader.loadChargeService();

            dependenciesReady = true;
            console.log("[BillContractMaintenance] Dependencies loaded");

            init();
        } catch (error) {
            console.error("[BillContractMaintenance] Failed to load dependencies:", error);
        }
    })();

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
            } catch {}
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

    function setFieldValue(fieldName, value) {
        const el = form?.querySelector(`[name="${fieldName}"]`);
        if (!el) return;
        el.value = value ?? "";
    }

    async function resolveBranchName(branchId) {
        const id = (branchId || "").toString().trim();
        if (!id) return null;
        const BillAccountService = global.BillAccountService;
        try {
            const spinner = document.getElementById('contract-branch-name-spinner');
            spinner?.classList.remove('d-none');
            const resp = await BillAccountService.searchBranches(id);
            console.log('[BillContract] resolveBranchName raw', resp);
            const rows = resp?.data?.Details01 || resp?.data?.Details || (Array.isArray(resp?.data) ? resp.data : []);
            const list = Array.isArray(rows) ? rows : [];
            const match = list.find(r => String(r?.BranchID ?? r?.branchId ?? r?.OurBranchID ?? '').trim() === id) || list[0];
            return match?.BranchName || match?.OurBranchName || null;
        } catch (err) { console.error(err); return null; } finally { document.getElementById('contract-branch-name-spinner')?.classList.add('d-none'); }
    }

    async function resolveApplicationName(applicationId) {
        const id = (applicationId || "").toString().trim();
        if (!id) return null;
        const BillAccountService = global.BillAccountService;
        try {
            const spinner = document.getElementById('contract-application-name-spinner');
            spinner?.classList.remove('d-none');
            const resp = await BillAccountService.searchApplications(id);
            console.log('[BillContract] resolveApplicationName raw', resp);
            const rows = resp?.data?.Details01 || resp?.data?.Details || (Array.isArray(resp?.data) ? resp.data : []);
            const list = Array.isArray(rows) ? rows : [];
            const match = list.find(r => String(r?.ApplicationID ?? r?.applicationId ?? r?.SerialID ?? '').trim() === id) || list[0];
            return match?.ClientName || match?.ApplicationID || null;
        } catch (err) { console.error(err); return null; } finally { document.getElementById('contract-application-name-spinner')?.classList.add('d-none'); }
    }

    async function resolveAccountName(accountId) {
        const id = (accountId || "").toString().trim();
        if (!id) return null;
        const BillAccountService = global.BillAccountService;
        try {
            const spinner = document.getElementById('contract-account-name-spinner');
            spinner?.classList.remove('d-none');
            const resp = await BillAccountService.searchAccounts(id);
            console.log('[BillContract] resolveAccountName raw', resp);
            const rows = resp?.data?.Details01 || resp?.data?.Details || (Array.isArray(resp?.data) ? resp.data : []);
            const list = Array.isArray(rows) ? rows : [];
            const match = list.find(r => String(r?.AccountID ?? r?.accountId ?? r?.AccountId ?? '').trim() === id) || list[0];
            return match?.AccountName || match?.Description || null;
        } catch (err) { console.error(err); return null; } finally { document.getElementById('contract-account-name-spinner')?.classList.add('d-none'); }
    }

    async function resolveClientName(clientId) {
        const id = (clientId || "").toString().trim();
        if (!id) return null;
        const BillAccountService = global.BillAccountService;
        try {
            const spinner = document.getElementById('contract-client-name-spinner');
            spinner?.classList.remove('d-none');
            const resp = await BillAccountService.searchClients(id);
            console.log('[BillContract] resolveClientName raw', resp);
            const rows = resp?.data?.Details01 || resp?.data?.Details || (Array.isArray(resp?.data) ? resp.data : []);
            const list = Array.isArray(rows) ? rows : [];
            const match = list.find(r => String(r?.ClientID ?? r?.clientId ?? '').trim() === id) || list[0];
            return match?.ClientName || match?.Name || null;
        } catch (err) { console.error(err); return null; } finally { document.getElementById('contract-client-name-spinner')?.classList.add('d-none'); }
    }

    async function resolveProductName(productId) {
        const id = (productId || "").toString().trim();
        if (!id) return null;
        const BillAccountService = global.BillAccountService;
        try {
            const spinner = document.getElementById('contract-product-name-spinner');
            spinner?.classList.remove('d-none');
            const resp = await BillAccountService.searchProducts(id);
            console.log('[BillContract] resolveProductName raw', resp);
            const rows = resp?.data?.Details01 || resp?.data?.Details || (Array.isArray(resp?.data) ? resp.data : []);
            const list = Array.isArray(rows) ? rows : [];
            const match = list.find(r => String(r?.ProductID ?? r?.productId ?? r?.ProductId ?? '').trim() === id) || list[0];
            return match?.ProductName || match?.Description || null;
        } catch (err) { console.error(err); return null; } finally { document.getElementById('contract-product-name-spinner')?.classList.add('d-none'); }
    }

    async function resolveCurrencyName(currencyId) {
        const id = (currencyId || "").toString().trim();
        if (!id) return null;
        try {
            if (!window.CurrencySearchService) return null;
            const response = await window.CurrencySearchService.getCurrencies();
            const currencies = response?.data?.Details || response?.Details || [];
            const match = currencies.find(c => String(c?.CurrencyID || '').trim().toUpperCase() === id.toUpperCase());
            return match?.CurrencyName || match?.Description || null;
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
            console.error(`[BillContractMaintenance] updateName error:`, err);
            renderSearchFeedback(`Failed to resolve ${idFieldName}`, "danger");
        }
    }

    // ============================================
    // SEARCH FUNCTIONS (from bill-account-application.js)
    // ============================================

    function renderSearchFeedback(message, variant = "info") {
        setToast(message, variant);
    }

    function showSearchResults(label, results, idField, nameField, searchTerm, searchFnName) {
        console.log(`[BillContractMaintenance] showSearchResults: label="${label}", results.length=${results?.length}`);

        if (!results || results.length === 0) {
            renderSearchFeedback(`No ${label} results found.`, "warning");
            return;
        }

        const modalId = `search-results-${Date.now()}`;
        const firstResult = results[0];
        const columnKeys = Object.keys(firstResult || {});

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
                         placeholder="Refine search..." value="${searchTerm || ''}">
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
                        ${displayKeys.slice(0, 5).map(key => `<td>${item[key] || ''}</td>`).join('')}
                        <td>
                          <button type="button" class="btn btn-sm btn-primary select-result">
                            Select
                          </button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
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
        const modal = new (window.bootstrap?.Modal || window.Modal)(modalEl, { backdrop: 'static', keyboard: false });

        // Wire selection buttons
        modalEl.querySelectorAll('.select-result').forEach((btn, idx) => {
            btn.addEventListener('click', () => {
                const result = results[idx];
                console.log("[BillContractMaintenance] Search result selected:", result);
                modal.hide();

                // Populate form fields based on idField
                if (result[idField]) {
                    const idValue = result[idField] || '';
                    let nameValue = '';

                    // Determine name field value based on entity type
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
                        nameValue = result.Name || result.Description || '';
                    }

                    // Populate ID field
                    const idInput = form?.querySelector(`[name="${idField}"]`);
                    if (idInput) idInput.value = idValue;

                    // Populate name field if exists
                    if (nameField && nameValue) {
                        const nameInput = form?.querySelector(`[name="${nameField}"]`);
                        if (nameInput) nameInput.value = nameValue;
                    }

                    renderSearchFeedback(`${label} selected: ${idValue}`, "success");
                }

                setTimeout(() => modalEl.remove(), 500);
            });
        });

        // Wire pagination buttons
        const prevBtn = modalEl.querySelector(`#btn-prev-${modalId}`);
        const nextBtn = modalEl.querySelector(`#btn-next-${modalId}`);

        prevBtn?.addEventListener('click', () => {
            modal.hide();
            setTimeout(() => modalEl.remove(), 500);
            performLookupSearch({ term: searchTerm, label, searchFnName, idField, nameField, prevOrNext: 2 });
        });

        nextBtn?.addEventListener('click', () => {
            modal.hide();
            setTimeout(() => modalEl.remove(), 500);
            performLookupSearch({ term: searchTerm, label, searchFnName, idField, nameField, prevOrNext: 1 });
        });

        modal.show();
        renderSearchFeedback(`Found ${results.length} ${label} result(s).`, "success");

        // Wire inline search
        const inlineInput = modalEl.querySelector(`#inline-search-${modalId}`);
        const inlineBtn = modalEl.querySelector(`#inline-search-btn-${modalId}`);

        const triggerRefinedSearch = () => {
            const term = inlineInput.value.trim();
            modal.hide();
            setTimeout(() => modalEl.remove(), 500);
            performLookupSearch({ term, label, searchFnName, idField, nameField });
        };

        inlineBtn?.addEventListener('click', triggerRefinedSearch);
        inlineInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') triggerRefinedSearch();
        });

        // Autofocus the inline search input
        setTimeout(() => {
            inlineInput?.focus();
            const val = inlineInput.value;
            inlineInput.value = '';
            inlineInput.value = val;
        }, 500);
    }

    async function performLookupSearch({ term, label, searchFnName, idField, nameField, prevOrNext = 0 }) {
        const cleaned = (term || "").trim();
        const searchTerm = cleaned || "%";

        console.log(`[BillContractMaintenance] performLookupSearch: ${label}, term="${searchTerm}", prevOrNext=${prevOrNext}`);

        const BillAccountService = global.BillAccountService;
        const LookupService = global.LookupService;

        const serviceFunc = searchFnName && BillAccountService && typeof BillAccountService[searchFnName] === "function"
            ? BillAccountService[searchFnName].bind(BillAccountService)
            : searchFnName && LookupService && typeof LookupService[searchFnName] === "function"
                ? LookupService[searchFnName].bind(LookupService)
                : null;

        if (!serviceFunc) {
            console.error(`[BillContractMaintenance] Service function not found: ${searchFnName}`);
            renderSearchFeedback(`${label} service is not available.`, "danger");
            return;
        }

        const displayMessage = cleaned ? `Searching ${label}...` : `Retrieving all ${label}...`;
        renderSearchFeedback(displayMessage, "info");

        try {
            console.log(`[BillContractMaintenance] Calling ${searchFnName}("${searchTerm}", ${prevOrNext})`);
            const response = await serviceFunc(searchTerm, prevOrNext);
            console.log(`[BillContractMaintenance] ${label} search response:`, response);

            let results = [];

            if (response?.success) {
                if (Array.isArray(response.data)) {
                    results = response.data;
                } else if (typeof response.data === 'object' && response.data !== null) {
                    if (Array.isArray(response.data.Details01)) results = response.data.Details01;
                    else if (Array.isArray(response.data.Details)) results = response.data.Details;
                    else if (Array.isArray(response.data.TableResults)) results = response.data.TableResults;
                    else if (Array.isArray(response.data.Result)) results = response.data.Result;
                    else if (Array.isArray(response.data.Results)) results = response.data.Results;
                    else {
                        for (const key of Object.keys(response.data)) {
                            if (Array.isArray(response.data[key]) && response.data[key].length > 0) {
                                results = response.data[key];
                                break;
                            }
                        }
                    }
                }
            }

            console.log(`[BillContractMaintenance] ${label} final results count:`, results.length);
            showSearchResults(label, results, idField, nameField, term, searchFnName);

        } catch (error) {
            console.error(`[BillContractMaintenance] ${label} search failed:`, error);
            renderSearchFeedback(error?.message || "Search failed", "danger");
        }
    }

    function attachSearchHandler(selector, getTerm, searchFnName, label, idField, nameField) {
        const button = document.querySelector(selector);
        button?.addEventListener("click", async (event) => {
            event.preventDefault();
            hideToast();
            if (!searchFnName) {
                setToast(`${label} search is not wired yet.`, "info");
                return;
            }

            let initialTerm = getTerm?.();
            await performLookupSearch({ term: initialTerm || "", label, searchFnName, idField, nameField });
        });
    }

    async function loadContractDataByApplicationId(applicationId) {
        const BillAccountService = global.BillAccountService;
        if (!BillAccountService?.getAccountApplication) {
            console.warn("[BillContractMaintenance] BillAccountService.getAccountApplication not available");
            return;
        }

        setToast("Loading contract data...", "info");

        try {
            const payload = {
                ApplicationID: applicationId || "",
                AccountID: "",
                OperatorID: getOperatorId?.() || "",
                Direction: 0,
                OurBranchID: "0101",
                BankID: "00"
            };

            console.log("[BillContractMaintenance] Loading contract data with payload:", payload);
            const response = await BillAccountService.getAccountApplication(payload);

            if (response?.success && response?.data?.Details01?.[0]) {
                const contractData = response.data.Details01[0];
                console.log("[BillContractMaintenance] Contract data loaded:", contractData);

                // Populate form fields with the fetched data
                if (contractData.ApplicationID) setFieldValue("ApplicationID", contractData.ApplicationID);
                if (contractData.ApplicationName) setFieldValue("ApplicationName", contractData.ApplicationName);
                if (contractData.ClientID) setFieldValue("ClientID", contractData.ClientID);
                if (contractData.ClientName) setFieldValue("ClientName", contractData.ClientName);
                if (contractData.AccountID) setFieldValue("AccountID", contractData.AccountID);
                if (contractData.AccountName) setFieldValue("AccountName", contractData.AccountName);
                if (contractData.BranchID) setFieldValue("BranchID", contractData.BranchID);
                if (contractData.BranchName) setFieldValue("BranchName", contractData.BranchName);
                if (contractData.ProductID) setFieldValue("ProductID", contractData.ProductID);
                if (contractData.ProductName) setFieldValue("ProductName", contractData.ProductName);
                if (contractData.BillNo) setFieldValue("BillNo", contractData.BillNo);
                if (contractData.AgreementType) setFieldValue("AgreementType", contractData.AgreementType);

                setToast("Contract data loaded successfully", "success");
            } else {
                const errorMsg = response?.message || "No contract found for this Application ID";
                console.warn("[BillContractMaintenance] Failed to load contract:", errorMsg);
                setToast(errorMsg, "warning");
            }
        } catch (error) {
            console.error("[BillContractMaintenance] Error loading contract data:", error);
            setToast("Error loading contract data: " + (error?.message || "Unknown error"), "danger");
        }
    }

    function getOperatorId() {
        try {
            // Priority 1: AuthService (if loaded)
            const session = global.AuthService?.getSession?.();

            // Priority 2: Direct localStorage check
            const rawSession = session || JSON.parse(localStorage.getItem('nimble_auth_session') || '{}');

            const opId = rawSession?.operatorId ||
                rawSession?.operatorID ||
                rawSession?.OperatorId ||
                rawSession?.OperatorID ||
                rawSession?.UserID ||
                rawSession?.userId ||
                localStorage.getItem("OperatorID");

            return opId;
        } catch (err) {
            console.error("[BillContractMaintenance] Error resolving OperatorID:", err);
            return null;
        }
    }

    function setFieldValue(fieldName, value) {
        const el = form?.querySelector(`[name="${fieldName}"]`);
        if (!el) return;
        el.value = value ?? "";
    }


    // ============================================
    // LOAD CONTRACT DATA
    // ============================================
    async function loadContractDataByApplicationId(applicationId) {
        console.log("[BillContractMaintenance] Loading contract data for ApplicationID:", applicationId);

        try {
            setToast("Loading contract data...", "info");

            // Get form values
            const branchId = form?.querySelector('[name="BranchID"]')?.value || "";
            const accountId = form?.querySelector('[name="AccountID"]')?.value || "";

            // Build API request
            const requestData = {
                OurBranchID: branchId,
                BillID: applicationId, // Using ApplicationID as BillID
                AccountID: accountId,
                OperatorID: "",  // Will be filled by backend
                BankID: ""       // Will be filled by backend
            };

            const apiRequest = {
                RequestID: "dbo.p_GetBillMaintenance",
                FormId: "dbo.p_GetBillMaintenance",
                RequestData: requestData,
                RequestTime: new Date().toLocaleString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                }).replace(',', ''),
                AppName: "PROJECT_KAIRO",
                Checksum: ""
            };

            console.log("[BillContractMaintenance] Sending API request:", apiRequest);

            const CoreApi = global.CoreApi || window.CoreApi;
            if (!CoreApi) {
                throw new Error("CoreApi not available");
            }

            const response = await CoreApi.post("/api/OldAPI", apiRequest);
            console.log("[BillContractMaintenance] API response:", response);

            if (response?.success && response?.data) {
                // Parse and populate the form
                populateFormFromData(response.data);
                setToast("Contract data loaded successfully", "success");
                console.log("[BillContractMaintenance] ✅ Contract data loaded");
            } else {
                throw new Error(response?.message || "Failed to load contract data");
            }

        } catch (error) {
            console.error("[BillContractMaintenance] Error loading contract data:", error);
            setToast("Error loading contract data: " + error.message, "danger");
        }
    }

    // Populate form from API response data
    function populateFormFromData(data) {
        console.log("[BillContractMaintenance] Populating form with data:", data);

        // Extract data - could be in data.Details, data.Details01, or directly in data
        let contractData = data;
        if (data.Details01 && Array.isArray(data.Details01) && data.Details01.length > 0) {
            contractData = data.Details01[0];
        } else if (data.Details && typeof data.Details === 'object') {
            contractData = Array.isArray(data.Details) ? data.Details[0] : data.Details;
        }

        console.log("[BillContractMaintenance] Using contract data:", contractData);

        // Populate all fields using exact column names from stored procedure
        if (contractData.ApplicationID) setFieldValue("ApplicationID", contractData.ApplicationID);
        if (contractData.ClientID) setFieldValue("ClientID", contractData.ClientID);
        if (contractData.ClientName) setFieldValue("ClientName", contractData.ClientName);
        if (contractData.AccountID) setFieldValue("AccountID", contractData.AccountID);
        if (contractData.AccountName) setFieldValue("AccountName", contractData.AccountName);
        if (contractData.BillID) setFieldValue("BillNo", contractData.BillID); // BillID maps to BillNo field
        if (contractData.ProductID) setFieldValue("ProductID", contractData.ProductID);
        if (contractData.ProductName) setFieldValue("ProductName", contractData.ProductName);
        if (contractData.ReferenceNumber) setFieldValue("CADLCRefID", contractData.ReferenceNumber); // LCReferenceNumber
        if (contractData.AgreementTypeID) setFieldValue("AgreementType", contractData.AgreementTypeID);
        if (contractData.LCType) setFieldValue("LCType", contractData.LCType);
        if (contractData.InterestRate) setFieldValue("InterestRate", contractData.InterestRate);
        if (contractData.CurrencyID) setFieldValue("CurrencyID", contractData.CurrencyID);
        if (contractData.CurrencyName) setFieldValue("CurrencyName", contractData.CurrencyName);
        if (contractData.DebitAccountID) setFieldValue("DebitAccount", contractData.DebitAccountID);
        if (contractData.DebitAccountIDName) setFieldValue("DebitAccountName", contractData.DebitAccountIDName);
        if (contractData.DrawerID) setFieldValue("DrawerID", contractData.DrawerID);
        if (contractData.DrawerName) setFieldValue("DrawerName", contractData.DrawerName);
        if (contractData.Amount) setFieldValue("Amount", contractData.Amount);
        if (contractData.BillDate) setFieldValue("BillDate", contractData.BillDate);
        if (contractData.GracePeriod) setFieldValue("GracePeriod", contractData.GracePeriod);
        if (contractData.DueDate) setFieldValue("DueDate", contractData.DueDate);
        if (contractData.MarginTypeID) setFieldValue("MarginTypeID", contractData.MarginTypeID);
        if (contractData.MarginCurrency) setFieldValue("MarginCurrency", contractData.MarginCurrency);
        if (contractData.MarginCurrencyName) setFieldValue("MarginCurrencyName", contractData.MarginCurrencyName);
        if (contractData.MarginValue) setFieldValue("MarginAmount", contractData.MarginValue);
        if (contractData.MarginAccount) setFieldValue("MarginAccount", contractData.MarginAccount);
        if (contractData.UnpaidMargin) setFieldValue("UnpaidMargin", contractData.UnpaidMargin);
        if (contractData.AccountMarginAmount) setFieldValue("AccountMarginAmount", contractData.AccountMarginAmount);
        if (contractData.MarginAccountName) setFieldValue("MarginAccountName", contractData.MarginAccountName);
        if (contractData.CreditAccount) setFieldValue("CreditAccount", contractData.CreditAccount);
        if (contractData.CreditAccountName) setFieldValue("CreditAccountName", contractData.CreditAccountName);
        if (contractData.OverDueAccount) setFieldValue("OverDueAccount", contractData.OverDueAccount);
        if (contractData.OverDueAccountName) setFieldValue("OverDueAccountName", contractData.OverDueAccountName);
        if (contractData.Remarks) setFieldValue("Remarks", contractData.Remarks);
        if (contractData.BDApplStatusID) setFieldValue("ApplicationStatus", contractData.BDApplStatusID);
        if (contractData.SettledAmount) setFieldValue("SettledAmount", contractData.SettledAmount);
        if (contractData.OutStandingAmount) setFieldValue("OutStandingAmount", contractData.OutStandingAmount);
        if (contractData.CancelledAmount) setFieldValue("CancelledAmount", contractData.CancelledAmount);
        if (contractData.LimitAmount) setFieldValue("LimitAmount", contractData.LimitAmount);
        if (contractData.SanctionedLimit) setFieldValue("SanctionedLimit", contractData.SanctionedLimit);
        if (contractData.DrawingPower) setFieldValue("DrawingPower", contractData.DrawingPower);
        if (contractData.LimitExpiryDate) setFieldValue("LimitExpiryDate", contractData.LimitExpiryDate);
        if (contractData.ExchangeRate) setFieldValue("ExchangeRate", contractData.ExchangeRate);
        if (contractData.ContractTypeID) setFieldValue("ContractTypeID", contractData.ContractTypeID);
        if (contractData.SettlementRef) setFieldValue("SettlementRef", contractData.SettlementRef);
        if (contractData.SettlementOption) setFieldValue("SettlementOption", contractData.SettlementOption);
        if (contractData.LoanAmount) setFieldValue("LoanAmount", contractData.LoanAmount);
        if (contractData.LoanAccountID) setFieldValue("LoanAccountID", contractData.LoanAccountID);
        if (contractData.LoanAccountName) setFieldValue("LoanAccountName", contractData.LoanAccountName);

        // Audit fields
        if (contractData.SanctionBy) setFieldValue("SanctionBy", contractData.SanctionBy);
        if (contractData.SanctionOn) setFieldValue("SanctionOn", contractData.SanctionOn);
        if (contractData.ClosedBy) setFieldValue("ClosedBy", contractData.ClosedBy);
        if (contractData.ClosedOn) setFieldValue("ClosedOn", contractData.ClosedOn);
        if (contractData.CreatedBy) setFieldValue("CreatedBy", contractData.CreatedBy);
        if (contractData.CreatedOn) setFieldValue("CreatedOn", contractData.CreatedOn);
        if (contractData.ModifiedBy) setFieldValue("ModifiedBy", contractData.ModifiedBy);
        if (contractData.ModifiedOn) setFieldValue("ModifiedOn", contractData.ModifiedOn);
        if (contractData.SuperVisedBy) setFieldValue("SuperVisedBy", contractData.SuperVisedBy);
        if (contractData.SuperVisedOn) setFieldValue("SuperVisedOn", contractData.SuperVisedOn);

        console.log("[BillContractMaintenance] Form populated with all fields");
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    function init() {
        console.log("[BillContractMaintenance] Initializing...");

        // Title bar button handlers - with debugging
        setupRemarksAutoResize();
        const titleBtns = document.querySelectorAll(".tf-title-btn");
        console.log("[BillContractMaintenance] Found title buttons:", titleBtns.length);

        titleBtns.forEach((btn, index) => {
            const action = btn.dataset.action;
            console.log(`[BillContractMaintenance] Attaching handler for button ${index}: action=${action}`);

            btn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log(`[BillContractMaintenance] Button clicked: action=${action}`);

                if (action === "refresh") {
                    console.log("[BillContractMaintenance] Refresh clicked");
                    const iframe = window.parent?.document?.querySelector(".legacy-modal__iframe");
                    if (iframe) {
                        console.log("[BillContractMaintenance] Reloading iframe");
                        iframe.src = iframe.src;
                    } else {
                        console.warn("[BillContractMaintenance] Could not find iframe to refresh");
                    }
                } else if (action === "minimize") {
                    console.log("[BillContractMaintenance] Minimize clicked");
                    try {
                        window.parent?.postMessage({ type: "window-action", action: "minimize" }, "*");
                    } catch (err) {
                        console.warn("[BillContractMaintenance] Could not minimize:", err);
                    }
                } else if (action === "maximize") {
                    console.log("[BillContractMaintenance] Maximize clicked");
                    try {
                        window.parent?.postMessage({ type: "window-action", action: "maximize" }, "*");
                    } catch (err) {
                        console.warn("[BillContractMaintenance] Could not maximize:", err);
                    }
                } else if (action === "close") {
                    console.log("[BillContractMaintenance] Close clicked");
                    try {
                        if (window.parent && window.parent.document) {
                            const modal = window.parent.document.querySelector("#billContractMaintenanceModal");
                            if (modal) {
                                console.log("[BillContractMaintenance] Found modal, attempting to close");
                                if (window.parent.bootstrap && window.parent.bootstrap.Modal) {
                                    const bootstrapModal = window.parent.bootstrap.Modal.getInstance(modal);
                                    if (bootstrapModal) {
                                        bootstrapModal.hide();
                                        console.log("[BillContractMaintenance] Closed via Bootstrap");
                                        return;
                                    }
                                }
                                modal.style.display = 'none';
                                modal.classList.remove('show');
                                modal.classList.remove('fade');
                                modal.setAttribute('aria-hidden', 'true');
                                const backdrop = window.parent.document.querySelector('.modal-backdrop');
                                if (backdrop) backdrop.remove();
                                console.log("[BillContractMaintenance] Closed via manual method");
                                return;
                            }
                        }
                        if (window.parent && window.parent.document) {
                            const dismissBtn = window.parent.document.querySelector("#billContractMaintenanceModal .btn-close");
                            if (dismissBtn) {
                                dismissBtn.click();
                                console.log("[BillContractMaintenance] Closed via btn-close");
                                return;
                            }
                        }
                        console.warn("[BillContractMaintenance] Could not find modal to close");
                    } catch (err) {
                        console.warn("[BillContractMaintenance] Error closing modal:", err);
                    }
                }
            });
        });

        // Attach search handlers for all lookup buttons
        attachSearchHandler("[data-branch-search]", () => form?.querySelector("[name=BranchID]")?.value, "searchBranches", "Branch", "BranchID", "BranchName");
        attachSearchHandler("[data-application-search]", () => form?.querySelector("[name=ApplicationID]")?.value, "searchApplications", "Application", "ApplicationID", "ApplicationName");
        attachSearchHandler("[data-account-search]", () => form?.querySelector("[name=AccountID]")?.value, "searchAccounts", "Account", "AccountID", "AccountName");
        attachSearchHandler("[data-client-search]", () => form?.querySelector("[name=ClientID]")?.value, "searchClients", "Client", "ClientID", "ClientName");
        attachSearchHandler("[data-product-search]", () => form?.querySelector("[name=ProductID]")?.value, "searchProducts", "Product", "ProductID", "ProductName");
        // Currency Search Handlers using CurrencySearchService
        const currencySearchButtons = form?.querySelectorAll("[data-currency-search]");
        currencySearchButtons?.forEach((button) => {
            button.addEventListener("click", async () => {
                try {
                    if (!window.CurrencySearchService) {
                        console.warn("[BillContract] CurrencySearchService not available");
                        return;
                    }
                    
                    // Determine which currency field this button belongs to
                    const parentControl = button.closest(".kairo-currency-control");
                    const idInput = parentControl?.querySelector(".kairo-currency-control__id");
                    const nameInput = parentControl?.querySelector(".kairo-currency-control__name");
                    
                    await window.CurrencySearchService.openSearchModal((currencyId, currencyName) => {
                        if (idInput) idInput.value = currencyId || "";
                        if (nameInput) nameInput.value = currencyName || "";
                        console.log("[BillContract] Currency selected:", currencyId, currencyName);
                    });
                } catch (error) {
                    console.error("[BillContract] Currency search error:", error);
                }
            });
        });
        
        const marginCurrencySearchButtons = form?.querySelectorAll("[data-margin-currency-search]");
        marginCurrencySearchButtons?.forEach((button) => {
            button.addEventListener("click", async () => {
                try {
                    if (!window.CurrencySearchService) {
                        console.warn("[BillContract] CurrencySearchService not available");
                        return;
                    }
                    
                    // Determine which currency field this button belongs to
                    const parentControl = button.closest(".kairo-currency-control");
                    const idInput = parentControl?.querySelector(".kairo-currency-control__id");
                    const nameInput = parentControl?.querySelector(".kairo-currency-control__name");
                    
                    await window.CurrencySearchService.openSearchModal((currencyId, currencyName) => {
                        if (idInput) idInput.value = currencyId || "";
                        if (nameInput) nameInput.value = currencyName || "";
                        console.log("[BillContract] Margin Currency selected:", currencyId, currencyName);
                    });
                } catch (error) {
                    console.error("[BillContract] Margin currency search error:", error);
                }
            });
        });
        
        attachSearchHandler("[data-debit-account-search]", () => form?.querySelector("[name=DebitAccount]")?.value, "searchAccounts", "Debit Account", "AccountID", "AccountName");
        attachSearchHandler("[data-loan-account-search]", () => form?.querySelector("[name=LoanAccountID]")?.value, "searchAccounts", "Loan Account", "AccountID", "AccountName");
        attachSearchHandler("[data-margin-account-search]", () => form?.querySelector("[name=MarginAccount]")?.value, "searchAccounts", "Margin Account", "AccountID", "AccountName");

        // Auto-load Handlers with Blur, Double-click, and Enter key support
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

        attachIdFieldHandlers("BranchID", "BranchName", resolveBranchName);
        attachIdFieldHandlers("ApplicationID", "ApplicationName", resolveApplicationName);
        attachIdFieldHandlers("AccountID", "AccountName", resolveAccountName);
        attachIdFieldHandlers("ClientID", "ClientName", resolveClientName);
        attachIdFieldHandlers("ProductID", "ProductName", resolveProductName);
        attachIdFieldHandlers("CurrencyID", "CurrencyName", resolveCurrencyName);
        attachIdFieldHandlers("MarginCurrency", "MarginCurrencyName", resolveCurrencyName);
        attachIdFieldHandlers("DebitAccount", "AccountName", resolveAccountName);

        // Auto-load full record data when Application/Branch/Product/Currency/Account IDs are entered and blurred
        // This uses the shared BillDiscountingAutoLoadUtil if available
        if (global.BillDiscountingAutoLoadUtil && dependenciesReady) {
            const BillAccountService = global.BillAccountService;
            const ChargeService = global.ChargeService;

            // ApplicationID: load full application data (would need a dedicated fetch function)
            // For now, this resolves the name field
            const appIdInput = form?.querySelector('[name="ApplicationID"]');
            if (appIdInput) {
                appIdInput.addEventListener("blur", async () => {
                    const appId = (appIdInput.value || '').toString().trim();
                    if (appId) {
                        const name = await resolveApplicationName(appId);
                        if (name) {
                            const nameInput = form?.querySelector('[name="ApplicationName"]');
                            if (nameInput) nameInput.value = name;
                        }
                    }
                });
            }

            // BranchID, ProductID, CurrencyID already have blur handlers above
            // They call updateName which populates the name field
        }

        // Manual ApplicationID entry should auto-load the contract when the user tabs out
        const applicationIdInput = form?.querySelector('[name="ApplicationID"]');
        if (applicationIdInput) {
            const triggerLoad = () => {
                const appId = (applicationIdInput.value || '').toString().trim();
                if (!appId) return;

                // Call the getContractData function to load full application data
                if (global.BillAccountService && dependenciesReady) {
                    loadContractDataByApplicationId(appId);
                }
            };

            applicationIdInput.addEventListener('change', triggerLoad);
            applicationIdInput.addEventListener('blur', triggerLoad);
            applicationIdInput.addEventListener('dblclick', triggerLoad);
            applicationIdInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    triggerLoad();
                }
            });
        }

        // Mode switcher with focus management for Add button
        document.querySelectorAll("[data-shell-mode]").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                const mode = (btn.dataset.shellMode || "").toLowerCase();

                // UX: focus should start in ClientID when adding
                if (mode === "add") {
                    setTimeout(() => {
                        form?.querySelector('[name="ClientID"]')?.focus();
                    }, 50);
                }
            });
        });

        // Auto-load logged-in user's branch on initialization
        autoLoadLoggedInBranch();

        console.log("[BillContractMaintenance] Initialization complete");
    }

    /**
     * Auto-load the logged-in user's branch into the BranchID field
     * Only loads if the field is empty (allows manual override)
     */
    async function autoLoadLoggedInBranch() {
        try {
            const branchIdInput = form?.querySelector('[name="BranchID"]');
            const branchNameInput = form?.querySelector('[name="BranchName"]');

            if (!branchIdInput) {
                console.warn("[BillContractMaintenance] BranchID input not found");
                return;
            }

            // Only auto-load if the field is empty
            const currentValue = (branchIdInput.value || '').trim();
            if (currentValue) {
                console.log("[BillContractMaintenance] BranchID already has value:", currentValue);
                return;
            }

            // Get logged-in user's branch from session
            const session = global.AuthService?.getSession?.();
            const loggedInBranch = session?.branchId || session?.branchID || session?.OurBranchID || "";

            if (!loggedInBranch) {
                console.warn("[BillContractMaintenance] No logged-in branch found in session");
                return;
            }

            console.log("[BillContractMaintenance] Auto-loading logged-in branch:", loggedInBranch);

            // Set the BranchID
            branchIdInput.value = loggedInBranch;

            // Resolve and set the BranchName
            if (branchNameInput) {
                const branchName = await resolveBranchName(loggedInBranch);
                if (branchName) {
                    branchNameInput.value = branchName;
                    console.log("[BillContractMaintenance] Successfully resolved branch name:", branchName);
                } else {
                    console.warn("[BillContractMaintenance] Could not resolve branch name for:", loggedInBranch);
                }
            }

            console.log("[BillContractMaintenance] Successfully auto-loaded branch:", loggedInBranch);
        } catch (error) {
            console.error("[BillContractMaintenance] Error auto-loading branch:", error);
        }
    }

})(window);
