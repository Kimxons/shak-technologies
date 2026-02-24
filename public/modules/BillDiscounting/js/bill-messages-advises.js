(() => {
    if (window.__billMessagesAdvisesLoaded) {
        return;
    }
    window.__billMessagesAdvisesLoaded = true;

    const supportedPages = ["bill-messages-advises"];
    const activePage = document.body?.dataset?.page;
    if (!supportedPages.includes(activePage)) {
        return;
    }

    const form = document.getElementById("messages-advises-form");
    let dependenciesReady = false;

    // Load dependencies
    (async () => {
        const { ServiceLoader } = window;
        if (!ServiceLoader) {
            console.error("[BillMessagesAdvises] ServiceLoader not found!");
            return;
        }

        try {
            await ServiceLoader.loadCore();
            await ServiceLoader.loadAuthService();
            await ServiceLoader.loadLookupService();

            dependenciesReady = true;
            console.log("[BillMessagesAdvises] Dependencies loaded");
            init();
        } catch (error) {
            console.error("[BillMessagesAdvises] Failed to load dependencies:", error);
        }
    })();

    function showSearchResults(label, results, idField, nameField) {
        if (!results || results.length === 0) {
            alert(`No ${label} results found.`);
            return;
        }

        const modalId = `search-results-${Date.now()}`;
        const firstResult = results[0];
        const columnKeys = Object.keys(firstResult || {});
        const displayKeys = columnKeys.filter(k => !['UpdateCount', 'EventID'].includes(k));
        const tableHeaders = displayKeys.slice(0, 5).map(key => `<th>${key}</th>`).join('');

        const modalHTML = `
          <div class="modal fade" id="${modalId}" tabindex="-1">
            <div class="modal-dialog modal-xl">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title">${label} Search Results (${results.length})</h5>
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
            alert(`${label} service is not available.`);
            return;
        }

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
            alert(error?.message || "Search failed");
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

    async function resolveMessageName(messageId) {
        const id = (messageId || "").toString().trim();
        if (!id) return null;
        const LookupService = window.LookupService;
        try {
            const resp = await LookupService.searchMessages(id);
            const rows = resp?.data?.Details01 || (Array.isArray(resp?.data) ? resp.data : []);
            const match = rows.find(r => String(r?.MessageID ?? '').trim() === id) || rows[0];
            return match?.MessageName || match?.Description || null;
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
        console.log("[BillMessagesAdvises] Initializing search handlers...");

        attachSearchHandler("[data-message-search]", () => form?.querySelector("[name=MessageID]")?.value, "searchMessages", "Message", "MessageID", "MessageName");

        // Blur Handlers
        form?.querySelector("[name=MessageID]")?.addEventListener("blur", () => updateName("MessageID", "MessageName", resolveMessageName));

        // Auto-load name resolution for all ID fields on blur (tab out)
        // The blur handlers above automatically populate name fields when user tabs out after entering an ID
        if (global.BillDiscountingAutoLoadUtil && dependenciesReady) {
            // All blur handlers are already wired above
            // This provides universal auto-load capability across all Trade Finance forms
            console.log("[BillMessagesAdvises] Auto-load utilities available");
        }

        console.log("[BillMessagesAdvises] Search handlers initialized");
    }

    // Handle cancel/back buttons
    document.addEventListener("click", (event) => {
        const button = event.target.closest("[data-messages-action]");
        if (!button) return;

        const action = (button.dataset.messagesAction || "").trim().toLowerCase();
        if (action !== "cancel" && action !== "back") return;

        try {
            const parent = window.parent;
            const modalId = "billMessagesModal";
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

