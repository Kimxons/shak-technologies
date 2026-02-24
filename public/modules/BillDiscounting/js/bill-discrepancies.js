(() => {
    if (window.__billDiscrepanciesLoaded) {
        return;
    }
    window.__billDiscrepanciesLoaded = true;

    const supportedPages = ["bill-discrepancies"];
    const activePage = document.body?.dataset?.page;
    if (!supportedPages.includes(activePage)) {
        return;
    }

    const form = document.getElementById("discrepancies-form");
    const toastEl = document.getElementById("billContractToast");
    let dependenciesReady = false;

    // Load dependencies
    (async () => {
        const { ServiceLoader } = window;
        if (!ServiceLoader) {
            console.error("[BillDiscrepancies] ServiceLoader not found!");
            return;
        }

        try {
            await ServiceLoader.loadCore();
            await ServiceLoader.loadAuthService();
            await ServiceLoader.loadLookupService();

            dependenciesReady = true;
            console.log("[BillDiscrepancies] Dependencies loaded");
            init();
        } catch (error) {
            console.error("[BillDiscrepancies] Failed to load dependencies:", error);
        }
    })();

    function setToast(message, variant = "success") {
        if (!toastEl) return;
        toastEl.classList.remove("d-none", "alert-success", "alert-info", "alert-warning", "alert-danger");
        toastEl.classList.add(`alert-${variant}`);
        toastEl.textContent = message;
    }

    function hideToast() {
        toastEl?.classList.add("d-none");
    }

    function showSearchResults(label, results, idField, nameField) {
        if (!results || results.length === 0) {
            setToast(`No ${label} results found.`, "warning");
            return;
        }

        const modalId = `search-results-${Date.now()}`;
        const firstResult = results[0];
        const columnKeys = Object.keys(firstResult || {});
        const displayKeys = columnKeys.filter(k => !['UpdateCount', 'EventID', 'NewData'].includes(k));
        const tableHeaders = displayKeys.slice(0, 5).map(key => `<th>${key}</th>`).join('');

        const modalHTML = `
                    <div class="modal fade" id="${modalId}" tabindex="-1">
                        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable" style="--bs-modal-width: 50vw;">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title">${label} Search Results (${results.length} found)</h5>
                  <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                  <div class="table-responsive">
                    <table class="table table-hover table-sm">
                      <thead class="table-dark">
                        <tr>${tableHeaders}<th>Action</th></tr>
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

        modalEl.querySelectorAll('.select-result').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                const result = results[idx];
                modal.hide();

                if (result[idField]) {
                    const idInput = form?.querySelector(`[name="${idField}"]`);
                    if (idInput) idInput.value = result[idField];

                    if (nameField && result[nameField]) {
                        const nameInput = form?.querySelector(`[name="${nameField}"]`);
                        if (nameInput) nameInput.value = result[nameField];
                    }

                    setToast(`${label} selected: ${result[idField]}`, "success");
                }

                setTimeout(() => modalEl.remove(), 500);
            });
        });

        modal.show();
    }

    async function performLookupSearch({ term, label, searchFnName, idField, nameField }) {
        const searchTerm = (term || "").trim() || "%";
        const LookupService = window.LookupService;

        const serviceFunc = searchFnName && LookupService && typeof LookupService[searchFnName] === "function"
            ? LookupService[searchFnName].bind(LookupService)
            : null;

        if (!serviceFunc) {
            setToast(`${label} service is not available.`, "danger");
            return;
        }

        setToast(`Searching ${label}...`, "info");

        try {
            const response = await serviceFunc(searchTerm, 0);
            let results = [];

            if (response?.success) {
                if (Array.isArray(response.data)) {
                    results = response.data;
                } else if (response.data?.Details01) {
                    results = response.data.Details01;
                }
            }

            showSearchResults(label, results, idField, nameField);
        } catch (error) {
            setToast(error?.message || "Search failed", "danger");
        }
    }

    function attachSearchHandler(selector, getTerm, searchFnName, label, idField, nameField) {
        const button = document.querySelector(selector);
        button?.addEventListener("click", async (event) => {
            event.preventDefault();
            hideToast();
            await performLookupSearch({ term: getTerm?.() || "", label, searchFnName, idField, nameField });
        });
    }

    function setFieldValue(fieldName, value) {
        const el = form?.querySelector(`[name="${fieldName}"]`);
        if (!el) return;
        el.value = value ?? "";
    }

    async function resolveDiscrepancyName(discrepancyId) {
        const id = (discrepancyId || "").toString().trim();
        if (!id) return null;
        const LookupService = window.LookupService;
        try {
            const resp = await LookupService.searchDiscrepancies(id);
            const rows = resp?.data?.Details01 || (Array.isArray(resp?.data) ? resp.data : []);
            const match = rows.find(r => String(r?.DiscrepancyID ?? '').trim() === id) || rows[0];
            return match?.DiscrepancyName || match?.Description || null;
        } catch { return null; }
    }

    async function resolveDocumentName(documentId) {
        const id = (documentId || "").toString().trim();
        if (!id) return null;
        const LookupService = window.LookupService;
        try {
            const resp = await LookupService.searchDocuments(id);
            const rows = resp?.data?.Details01 || (Array.isArray(resp?.data) ? resp.data : []);
            const match = rows.find(r => String(r?.DocumentID ?? '').trim() === id) || rows[0];
            return match?.DocumentName || match?.Description || null;
        } catch { return null; }
    }

    async function updateName(idFieldName, nameFieldName, resolveFn) {
        const input = form?.querySelector(`[name="${idFieldName}"]`);
        const id = (input?.value || '').trim();
        if (!id) {
            setFieldValue(nameFieldName, '');
            return;
        }
        setFieldValue(nameFieldName, 'Resolving...');
        const name = await resolveFn(id);
        setFieldValue(nameFieldName, name || '');
    }

    function init() {
        console.log("[BillDiscrepancies] Initializing search handlers...");

        attachSearchHandler("[data-discrepancy-search]", () => form?.querySelector("[name=DiscrepancyID]")?.value, "searchDiscrepancies", "Discrepancy", "DiscrepancyID", "DiscrepancyName");
        attachSearchHandler("[data-document-search]", () => form?.querySelector("[name=DocumentID]")?.value, "searchDocuments", "Document", "DocumentID", "DocumentName");

        // Blur Handlers
        form?.querySelector("[name=DiscrepancyID]")?.addEventListener("blur", () => updateName("DiscrepancyID", "DiscrepancyName", resolveDiscrepancyName));
        form?.querySelector("[name=DocumentID]")?.addEventListener("blur", () => updateName("DocumentID", "DocumentName", resolveDocumentName));

        // Auto-load name resolution for all ID fields on blur (tab out)
        // The blur handlers above automatically populate name fields when user tabs out after entering an ID
        if (global.BillDiscountingAutoLoadUtil && dependenciesReady) {
            // All blur handlers are already wired above
            // This provides universal auto-load capability across all Trade Finance forms
            console.log("[BillDiscrepancies] Auto-load utilities available");
        }

        console.log("[BillDiscrepancies] Search handlers initialized");
    }

    // Handle cancel/back buttons
    document.addEventListener("click", (event) => {
        const button = event.target.closest("[data-discrepancies-action]");
        if (!button) return;

        const action = (button.dataset.discrepanciesAction || "").trim().toLowerCase();
        if (action !== "cancel" && action !== "back") return;

        try {
            const parent = window.parent;
            const modalId = "billDiscrepanciesModal";
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

