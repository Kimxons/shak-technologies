(() => {
  if (window.__kairoInsuranceCodePageLoaded) return;
  window.__kairoInsuranceCodePageLoaded = true;

  // Ensure StaticDataService and SweetAlert2 are loaded before anything else
  async function ensureDependenciesLoaded() {
    // Load SweetAlert2
    if (!window.Swal) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/assets/js/sweetalert2.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    // Load StaticDataService
    if (!window.StaticDataService) {
      if (window.loadStaticDataService) {
        await window.loadStaticDataService();
      } else if (window.serviceLoader && window.serviceLoader.loadStaticDataService) {
        await window.serviceLoader.loadStaticDataService();
      } else {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = '/assets/js/services/static-data/staticDataService.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
    }
  }

  const MODES = {
    VIEW: "View",
    ADD: "Add",
    UPDATE: "Update",
  };

  const state = {
    mode: MODES.VIEW,
    hasLoaded: false,
    isBusy: false,
    recordNotFound: false,

    // Lookup modal (Insurance Code) search state
    lastSearchTableId: "",
    insuranceCodeSearchFirstRefId: "",
    insuranceCodeSearchLastRefId: "",
    insuranceCodeSearchLastDirection: "first",
  };

  let inlineAlertAutoHideTimer = null;

  function normalizeInsuranceCodeRow(row = {}) {
    const code = row.InsuranceCode || row.insurancecode || row.Code || row.code || "";
    const description = row.Description || row.description || "";
    const statusRaw = row.Status ?? row.status ?? row.IsActive ?? row.isactive;
    const isActive = statusRaw === true || statusRaw === 1 || statusRaw === "1" || String(statusRaw || "").toLowerCase() === "true";
    return {
      raw: row,
      code: String(code || "").trim(),
      description: String(description || ""),
      isActive,
    };
  }

  function getSearchBaseUrl() {
    const env = window.Environment || {};
    return (env.baseUrlSystemCodes || env.baseUrlCommon || "http://localhost:5059").replace(/\/+$/g, "");
  }

  async function postSearchOldApi(requestData) {
    if (!window.CoreApi) throw new Error("CoreApi missing");
    const envelope = window.CoreApi.makeRequestEnvelope("p_GetSearchResult", requestData);
    return window.CoreApi.post(`${getSearchBaseUrl()}/api/OldAPI`, envelope);
  }

  function pickRefId(row) {
    if (!row || typeof row !== "object") return "";
    const direct = row.RefID ?? row.RefId ?? row.refId ?? row.refID;
    if (direct != null && String(direct).trim()) return String(direct).trim();
    const keys = Object.keys(row);
    const match = keys.find((k) => k.toLowerCase() === "refid" || k.toLowerCase() === "ref_id");
    if (match && row[match] != null && String(row[match]).trim()) return String(row[match]).trim();
    return "";
  }

  function getInsuranceCodeLookupElements() {
    return {
      modal: qs("#insuranceCodeLookupModal"),
      form: qs("#insuranceCodeLookupForm"),
      results: qs("#insuranceCodeSearchResults"),
      empty: qs("#insuranceCodeSearchEmpty"),
      loading: qs("#insuranceCodeSearchLoading"),
      code: qs("#insuranceCodeSearchCode"),
      desc: qs("#insuranceCodeSearchDesc"),
      status: qs("#insuranceCodeSearchStatus"),
      reset: qs("#insuranceCodeSearchReset"),
      refresh: qs("#insuranceCodeSearchRefresh"),
      prev: qs("#insuranceCodeSearchPrev"),
      next: qs("#insuranceCodeSearchNext"),
      pageInfo: qs("#insuranceCodeSearchPageInfo"),
    };
  }

  function openInsuranceCodeSearchPanel() {
    const { modal, code } = getInsuranceCodeLookupElements();
    if (!modal) {
      setToast("Search dialog not found.", "danger");
      return;
    }
    const ModalCtor = window.bootstrap?.Modal;
    if (!ModalCtor) {
      setToast("Bootstrap Modal not available.", "danger");
      return;
    }
    const modalInstance = ModalCtor.getOrCreateInstance(modal);
    modalInstance.show();
    resetInsuranceCodeSearchPanel();
    if (code) setTimeout(() => code.focus(), 250);

    // Default behavior: list all records on open.
    void performInsuranceCodeSearch({ direction: "first" });
  }

  function closeInsuranceCodeSearchPanel() {
    const { modal } = getInsuranceCodeLookupElements();
    if (!modal) return;
    const ModalCtor = window.bootstrap?.Modal;
    if (!ModalCtor) return;
    const modalInstance = ModalCtor.getInstance(modal);
    if (modalInstance) modalInstance.hide();
  }

  function resetInsuranceCodeSearchPanel() {
    const { form, results, empty, loading } = getInsuranceCodeLookupElements();
    if (form) form.reset();
    if (results) results.innerHTML = "";
    if (empty) {
      empty.style.display = "block";
      empty.textContent = "No insurance codes found.";
    }
    if (loading) loading.classList.add("d-none");

    state.insuranceCodeSearchFirstRefId = "";
    state.insuranceCodeSearchLastRefId = "";
    state.insuranceCodeSearchLastDirection = "first";
    updateInsuranceCodePagerButtons();
  }

  function updateInsuranceCodePagerButtons() {
    const { prev, next, pageInfo } = getInsuranceCodeLookupElements();
    if (prev) prev.disabled = !state.insuranceCodeSearchFirstRefId;
    if (next) next.disabled = !state.insuranceCodeSearchLastRefId;
    if (pageInfo) pageInfo.textContent = "";
  }

  async function performInsuranceCodeSearch(eventOrOptions) {
    let direction = "first";
    if (eventOrOptions && typeof eventOrOptions === "object") {
      if (typeof eventOrOptions.preventDefault === "function") {
        eventOrOptions.preventDefault();
      } else {
        direction = eventOrOptions.direction || "first";
      }
    }

    const { results, empty, loading, code, desc, status } = getInsuranceCodeLookupElements();
    if (results) results.innerHTML = "";
    if (empty) empty.style.display = "none";
    if (loading) loading.classList.remove("d-none");

    const codeVal = (code?.value || "").trim();
    const descVal = (desc?.value || "").trim();
    const statusVal = (status?.value || "all").toLowerCase();

    const clauses = [];
    const buildClause = (col, mode, val) => {
      if (!val) return null;
      const safe = String(val).replace(/'/g, "''");
      return mode === "Exact" ? `${col} = '${safe}'` : `${col} like '%${safe}%'`;
    };

    // Insurance code/description filtering
    const codeClause = buildClause("InsuranceCode", "Like", codeVal) || buildClause("Code", "Like", codeVal);
    const descClause = buildClause("Description", "Like", descVal);
    if (codeClause) clauses.push(codeClause);
    if (descClause) clauses.push(descClause);

    // Status can be stored as Status=1/0 or IsActive=1/0 depending on env.
    if (statusVal === "active") clauses.push("(Status = 1 OR IsActive = 1)");
    if (statusVal === "inactive") clauses.push("(Status = 0 OR IsActive = 0)");

    const whereStmt = clauses.length ? clauses.join(" AND ") : "1=1";

    const candidateTableIds = [
      state.lastSearchTableId,
      "InsuranceCode",
      "InsuranceCodeID",
    ].filter(Boolean);

    const basePayload = {
      TableID: "",
      WhereStmt: whereStmt,
      AdvFilterString: "",
      PrevOrNext: "1",
      RefID: "",
      OperatorID: getOperatorId(),
      ModuleID: 1000,
      OurBranchID: (sessionStorage.getItem("branchId") || window.Environment?.OurBranchID || ""),
    };

    const pagingCandidates =
      direction === "next"
        ? ["2", "3"]
        : direction === "prev"
          ? ["0", "-1"]
          : ["1"];

    if (direction === "next" && !state.insuranceCodeSearchLastRefId) {
      setToast("Next page is not available.", "warning");
      if (loading) loading.classList.add("d-none");
      return;
    }
    if (direction === "prev" && !state.insuranceCodeSearchFirstRefId) {
      setToast("Previous page is not available.", "warning");
      if (loading) loading.classList.add("d-none");
      return;
    }

    if (direction === "next") basePayload.RefID = state.insuranceCodeSearchLastRefId;
    if (direction === "prev") basePayload.RefID = state.insuranceCodeSearchFirstRefId;

    try {
      let response = null;
      let usedTableId = null;

      for (const tableId of candidateTableIds) {
        for (const prevOrNext of pagingCandidates) {
          try {
            const payload = { ...basePayload, TableID: tableId, PrevOrNext: prevOrNext };
            response = await postSearchOldApi(payload);
            usedTableId = tableId;

            if (response && typeof response.success === "boolean" && !response.success) {
              const msg = String(response.message || "").toLowerCase();
              if (msg.includes("table") || msg.includes("invalid") || msg.includes("not found")) continue;
            }
            break;
          } catch {
            continue;
          }
        }
        if (response) break;
      }

      let rows = response?.Details?.SearchResults || response?.Details || response?.SearchResults || response?.data || [];
      if (!Array.isArray(rows)) rows = rows ? [rows] : [];

      if (!rows.length) {
        if (empty) {
          empty.textContent = clauses.length ? "No insurance codes matched the filters." : "No insurance codes found.";
          empty.style.display = "block";
        }
        if (direction === "next") state.insuranceCodeSearchLastRefId = "";
        if (direction === "prev") state.insuranceCodeSearchFirstRefId = "";
        updateInsuranceCodePagerButtons();
        return;
      }

      if (usedTableId) state.lastSearchTableId = usedTableId;

      const firstRef = pickRefId(rows[0]);
      const lastRef = pickRefId(rows[rows.length - 1]);
      const details = response?.Details || {};
      const prevRefFromResponse = details.PrevRefID ?? details.PrevRefId ?? details.prevRefId ?? response?.PrevRefID ?? response?.PrevRefId;
      const nextRefFromResponse = details.NextRefID ?? details.NextRefId ?? details.nextRefId ?? response?.NextRefID ?? response?.NextRefId;
      const refFromResponse = details.RefID ?? details.RefId ?? details.refId ?? response?.RefID ?? response?.RefId;

      state.insuranceCodeSearchFirstRefId = (firstRef || prevRefFromResponse || "").toString().trim();
      state.insuranceCodeSearchLastRefId = (lastRef || nextRefFromResponse || refFromResponse || "").toString().trim();
      updateInsuranceCodePagerButtons();

      const normalized = rows.map(normalizeInsuranceCodeRow).filter((r) => r.code);

      if (results) {
        results.innerHTML = normalized
          .map((r, idx) => {
            const activeText = r.isActive ? "Yes" : "No";
            return `<tr data-result-index="${idx}" style="cursor: pointer;">
              <td>${r.code}</td>
              <td>${r.description || ""}</td>
              <td>${activeText}</td>
              <td class="text-end"><button type="button" class="btn btn-sm btn-primary" data-result-index="${idx}">Select</button></td>
            </tr>`;
          })
          .join("");

        results.querySelectorAll("button[data-result-index]").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const idx = Number(btn.getAttribute("data-result-index"));
            const row = normalized[idx];
            if (!row) return;
            if (qs("#InsuranceCode")) qs("#InsuranceCode").value = String(row.code);
            closeInsuranceCodeSearchPanel();
            await handleSearchOrView();
          });
        });

        results.querySelectorAll("tr[data-result-index]").forEach((tr) => {
          tr.addEventListener("dblclick", async () => {
            const idx = Number(tr.getAttribute("data-result-index"));
            const row = normalized[idx];
            if (!row) return;
            if (qs("#InsuranceCode")) qs("#InsuranceCode").value = String(row.code);
            closeInsuranceCodeSearchPanel();
            await handleSearchOrView();
          });
        });
      }
    } catch (err) {
      console.error("[InsuranceCodePage] Search failed:", err);
      if (empty) {
        empty.textContent = err?.message || "Search failed.";
        empty.style.display = "block";
      }
    } finally {
      if (loading) loading.classList.add("d-none");
    }
  }

  function wireInsuranceCodeSearchPanel() {
    const { form, reset, refresh, prev, next, code, desc, status } = getInsuranceCodeLookupElements();

    form?.addEventListener("submit", performInsuranceCodeSearch);

    // Live filtering: debounce server-side search
    let t = null;
    const debounceSearch = () => {
      if (t) window.clearTimeout(t);
      t = window.setTimeout(() => void performInsuranceCodeSearch({ direction: "first" }), 250);
    };
    code?.addEventListener("input", debounceSearch);
    desc?.addEventListener("input", debounceSearch);
    status?.addEventListener("change", debounceSearch);

    reset?.addEventListener("click", (e) => {
      e.preventDefault();
      resetInsuranceCodeSearchPanel();
      void performInsuranceCodeSearch({ direction: "first" });
    });

    refresh?.addEventListener("click", (e) => {
      e.preventDefault();
      resetInsuranceCodeSearchPanel();
      void performInsuranceCodeSearch({ direction: "first" });
    });

    prev?.addEventListener("click", (e) => {
      e.preventDefault();
      void performInsuranceCodeSearch({ direction: "prev" });
    });

    next?.addEventListener("click", (e) => {
      e.preventDefault();
      void performInsuranceCodeSearch({ direction: "next" });
    });

    document.addEventListener("keydown", (e) => {
      const { modal } = getInsuranceCodeLookupElements();
      if (!modal) return;
      const isVisible = modal.classList.contains("show");
      if (e.key === "Escape" && isVisible) closeInsuranceCodeSearchPanel();
    });
  }

  function getOperatorId() {
    try {
      const session = window.AuthService?.getSession?.();
      return session?.operatorId || session?.operatorID || session?.name || "web_portal";
    } catch {
      return "web_portal";
    }
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function formatMDYHMS(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    return `${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}/${date.getFullYear()} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
  }

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function initSectionToggles() {
    const headers = qsa('[data-section-toggle]');

    function setCollapsed(section, collapsed) {
      if (!section) return;
      const content = qs('[data-section-content]', section);
      if (!content) return;

      if (collapsed) content.setAttribute('hidden', '');
      else content.removeAttribute('hidden');

      const header = qs('[data-section-toggle]', section);
      const toggleBtn = header ? qs('.section-toggle-btn', header) : null;
      if (toggleBtn) toggleBtn.setAttribute('aria-expanded', String(!collapsed));

      const icon = toggleBtn ? qs('i.bi', toggleBtn) : null;
      if (icon) {
        icon.classList.toggle('bi-chevron-up', !collapsed);
        icon.classList.toggle('bi-chevron-down', collapsed);
      }
    }

    headers.forEach((header) => {
      if (header.dataset.kairoSectionToggleBound === '1') return;
      header.dataset.kairoSectionToggleBound = '1';

      const section = header.closest('.form-section');
      if (!section) return;

      const content = qs('[data-section-content]', section);
      setCollapsed(section, !!content?.hasAttribute('hidden'));

      const toggle = (e) => {
        e?.preventDefault?.();
        const isCollapsed = !!qs('[data-section-content]', section)?.hasAttribute('hidden');
        setCollapsed(section, !isCollapsed);
      };

      header.addEventListener('click', toggle);

      const toggleBtn = qs('.section-toggle-btn', header);
      if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          toggle(e);
        });
      }
    });
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

  function showToast(message, { title = 'Message', variant = 'info', timeoutMs = 4500 } = {}) {
    const container = ensureToastContainer();

    const toast = document.createElement('div');
    toast.className = `kairo-toast${variant ? ` kairo-toast--${variant}` : ''}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-atomic', 'true');

    const header = document.createElement('div');
    header.className = 'kairo-toast__title';

    const titleEl = document.createElement('div');
    titleEl.textContent = title;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'kairo-toast__close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '×';

    const body = document.createElement('div');
    body.className = 'kairo-toast__body';
    body.textContent = String(message || '');

    header.appendChild(titleEl);
    header.appendChild(closeBtn);
    toast.appendChild(header);
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

    closeBtn.addEventListener('click', remove);
    setTimeout(() => toast.classList.add('is-show'), 0);
    if (timeoutMs && timeoutMs > 0) setTimeout(remove, timeoutMs);
  }

  function setToast(message, variant = 'success') {
    const inline = qs('[data-insurance-code-alert]');
    const inlineText = qs('[data-insurance-code-alert-text]', inline || undefined);
    const inlineClose = qs('[data-insurance-code-alert-close]', inline || undefined);

    const msg = String(message ?? '').trim();

    const normalized = String(variant || '').toLowerCase();
    const alertClass =
      normalized === 'success'
        ? 'alert-success'
        : normalized === 'warning'
          ? 'alert-warning'
          : normalized === 'info'
            ? 'alert-info'
            : 'alert-danger';

    // Prefer the inline banner inside the section (matches Account Maintenance style)
    if (inline && inlineText) {
      if (!msg) {
        if (inlineAlertAutoHideTimer) {
          clearTimeout(inlineAlertAutoHideTimer);
          inlineAlertAutoHideTimer = null;
        }
        inline.classList.add('d-none');
        inline.setAttribute('hidden', '');
        return;
      }

      inline.classList.remove('alert-success', 'alert-danger', 'alert-warning', 'alert-info');
      inline.classList.add(alertClass);
      inlineText.textContent = msg;
      inline.classList.remove('d-none');
      inline.removeAttribute('hidden');

      if (inlineAlertAutoHideTimer) {
        clearTimeout(inlineAlertAutoHideTimer);
        inlineAlertAutoHideTimer = null;
      }
      inlineAlertAutoHideTimer = setTimeout(() => {
        try {
          inline.classList.add('d-none');
          inline.setAttribute('hidden', '');
        } finally {
          inlineAlertAutoHideTimer = null;
        }
      }, 6000);

      if (inlineClose && inlineClose.dataset.bound !== '1') {
        inlineClose.dataset.bound = '1';
        inlineClose.addEventListener('click', () => {
          if (inlineAlertAutoHideTimer) {
            clearTimeout(inlineAlertAutoHideTimer);
            inlineAlertAutoHideTimer = null;
          }
          inline.classList.add('d-none');
          inline.setAttribute('hidden', '');
        });
      }

      return;
    }

    // Fallback to Kairo toast
    if (!msg) return;

    const title =
      normalized === 'success'
        ? 'Success'
        : normalized === 'warning'
          ? 'Warning'
          : normalized === 'info'
            ? 'Info'
            : 'Error';

    showToast(msg, {
      title,
      // styles.css defines only success/danger variants; leave others unstyled.
      variant: normalized === 'success' ? 'success' : normalized === 'danger' ? 'danger' : '',
      timeoutMs: normalized === 'danger' ? 6000 : 4500,
    });
  }

  function clearForm({ keepId = true } = {}) {
    const form = qs("#insurance-code-form");
    if (!form) return;
    const id = qs("#InsuranceCode")?.value ?? "";
    qsa("input, select, textarea", form).forEach((el) => {
      if (el.hasAttribute("data-always-enabled")) {
        if (!keepId) el.value = "";
        return;
      }
      if (el.type === "checkbox" || el.type === "radio") {
        el.checked = false;
        return;
      }
      el.value = "";
    });

    if (keepId && qs("#InsuranceCode")) qs("#InsuranceCode").value = id;
    state.hasLoaded = false;
    state.recordNotFound = false;
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
      save: qs('[data-insurance-code-action="save"]'),
      cancel: qs('[data-insurance-code-action="cancel"]'),
      del: qs('[data-insurance-code-action="delete"]'),
      search: qs('[data-insurance-code-action="search"]'),
    };
  }

  function updateActionButtons() {
    const { view, add, edit, save, cancel, del } = getActionButtons();
    const isEditable = state.mode === MODES.ADD || state.mode === MODES.UPDATE;

    setButtonDisabled(view, isEditable);
    setButtonDisabled(add, !state.recordNotFound);
    setButtonDisabled(edit, !state.hasLoaded || state.mode === MODES.UPDATE);
    setButtonDisabled(save, !isEditable);
    // Enable cancel if editing or if a record is loaded (so user can clear after view)
    setButtonDisabled(cancel, !(isEditable || state.hasLoaded || state.recordNotFound));
    setButtonDisabled(del, !state.hasLoaded);
  }

  function setMode(nextMode) {
    state.mode = nextMode;

    const pill = qs("[data-page-function-pill]");
    if (pill) pill.textContent = `Mode · ${nextMode}`;

    const form = qs("#insurance-code-form");
    if (!form) return;

    const fields = qsa("input, select, textarea", form);
    const isEditable = nextMode === MODES.ADD || nextMode === MODES.UPDATE;

    for (const el of fields) {
      if (el.hasAttribute("data-always-enabled")) {
        el.disabled = false;
        continue;
      }
      el.disabled = !isEditable;
    }

    const buttons = qsa("button", form);
    for (const b of buttons) {
      if (b.hasAttribute("data-always-enabled")) b.disabled = false;
    }

    updateActionButtons();
  }

  function bindModeButtons() {
    qsa("[data-shell-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const next = btn.getAttribute("data-shell-mode");
        if (!next || !MODES[next.toUpperCase()]) return;
        const nextMode = MODES[next.toUpperCase()];

        if (nextMode === MODES.ADD) {
          clearForm({ keepId: true });
          setMode(MODES.ADD);
          setToast("Add mode.", "info");
          return;
        }

        if (nextMode === MODES.UPDATE) {
          if (!state.hasLoaded) {
            setToast("Load a record first (Search/View) before editing.", "warning");
            return;
          }
          setMode(MODES.UPDATE);
          setToast("Edit mode.", "info");
          return;
        }

        setMode(nextMode);
      });
    });
  }

  // Fix: ensureStaticDataServiceLoaded should point to ensureDependenciesLoaded
  async function handleSearchOrView() {
    if (state.isBusy) return;
    const id = qs("#InsuranceCode")?.value?.trim() || "";
    if (!id) {
      setToast("Enter Insurance Code.", "warning");
      return;
    }
    state.isBusy = true;
    setToast("Searching...", "info");
    try {
      await ensureDependenciesLoaded();
      const svc = window.StaticDataService;
      if (!svc?.getInsuranceCode) {
        console.error('[InsuranceCodePage] StaticDataService.getInsuranceCode is not available', svc);
        setToast("Service not available.", "danger");
        return;
      }
      console.log('[InsuranceCodePage] Calling getInsuranceCode with:', id);
      const resp = await svc.getInsuranceCode(id);
      console.log('[InsuranceCodePage] getInsuranceCode response:', resp);
      if (resp && resp.data && resp.data.length > 0) {
        const data = resp.data[0];
            // Populate main fields (existing logic)
            if (qs("#InsuranceCode")) qs("#InsuranceCode").value = data.InsuranceCode || data.insurancecode || data.Code || id;
            if (qs("#Description")) qs("#Description").value = data.Description || data.description || "";
            if (qs("#IsActive")) qs("#IsActive").checked = !!(data.Status || data.status || data.IsActive || data.isactive);

            // --- Populate Behind the Scene audit fields ---
            // Accept multiple possible field names for each audit field
            const createdBy = data.CreatedBy || data.createdBy || data.OperatedBy || data.operatedBy || '';
            const createdOn = data.CreatedOn || data.createdOn || data.OperatedOn || data.operatedOn || '';
            const modifiedBy = data.ModifiedBy || data.modifiedBy || '';
            const modifiedOn = data.ModifiedOn || data.modifiedOn || '';
            const supervisedBy = data.SupervisedBy || data.supervisedBy || data.ApprovedBy || data.approvedBy || '';
            const supervisedOn = data.SupervisedOn || data.supervisedOn || data.ApprovedOn || data.approvedOn || '';

            if (qs("#CreatedBy")) qs("#CreatedBy").textContent = createdBy || '-';
            if (qs("#CreatedOn")) qs("#CreatedOn").textContent = createdOn || '-';
            if (qs("#ModifiedBy")) qs("#ModifiedBy").textContent = modifiedBy || '-';
            if (qs("#ModifiedOn")) qs("#ModifiedOn").textContent = modifiedOn || '-';
            if (qs("#SupervisedBy")) qs("#SupervisedBy").textContent = supervisedBy || '-';
            if (qs("#SupervisedOn")) qs("#SupervisedOn").textContent = supervisedOn || '-';

        console.log('Form populated, CreatedBy:', qs("#CreatedBy").value);
        setToast("Insurance Code loaded.", "success");
        state.hasLoaded = true;
        state.recordNotFound = false;
      } else {
        console.warn('[InsuranceCodePage] No data found for InsuranceCode:', id, resp);
        setToast("Record doesn't exist.", "warning");
        clearForm({ keepId: true });
        state.hasLoaded = false;
        state.recordNotFound = true;
      }
      setMode(MODES.VIEW);
    } catch (err) {
      console.error('[InsuranceCodePage] Error searching Insurance Code:', err);
      setToast("Error searching Insurance Code.", "danger");
      clearForm({ keepId: true });
      state.hasLoaded = false;
      state.recordNotFound = false;
      setMode(MODES.VIEW);
    } finally {
      state.isBusy = false;
      updateActionButtons();
    }
  }

  function bindActions() {
    const { save, cancel, del, search, view } = getActionButtons();

    // Search icon should open the popup search window.
    search?.addEventListener("click", () => openInsuranceCodeSearchPanel());
    view?.addEventListener("click", () => void handleSearchOrView());

    qs("#InsuranceCode")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSearchOrView();
      }
    });

    save?.addEventListener("click", async () => {
      if (state.mode === MODES.VIEW) {
        setToast("Switch to Add/Edit before saving.", "warning");
        return;
      }
      setButtonDisabled(save, true); // Disable immediately on click

      try {
        await ensureDependenciesLoaded();
      } catch (err) {
        console.error("[InsuranceCodePage] Dependencies failed to load:", err);
        setToast("Required services failed to load.", "danger");
        setButtonDisabled(save, false);
        return;
      }

      const now = new Date();
      const operatorId = getOperatorId();

      const InsuranceCode = qs("#InsuranceCode")?.value?.trim() || "";
      const Description = qs("#Description")?.value?.trim() || "";
      const IsActive = qs("#IsActive")?.checked ? 1 : 0;

      // Audit fields: mimic Location behavior
      const createdByExisting = qs("#CreatedBy")?.value?.trim() || "";
      const createdOnExisting = qs("#CreatedOn")?.value?.trim() || "";

      const CreatedBy = createdByExisting || operatorId;
      const CreatedOn = createdOnExisting || formatMDYHMS(now);
      const ModifiedBy = operatorId;
      const ModifiedOn = formatMDYHMS(now);
      const NewRecord = state.mode === MODES.ADD ? 1 : 0;

      // Reflect audit values into the UI so the user sees what will be saved.
      if (qs("#CreatedBy")) qs("#CreatedBy").value = CreatedBy;
      if (qs("#CreatedOn")) qs("#CreatedOn").value = CreatedOn;
      if (qs("#ModifiedBy")) qs("#ModifiedBy").value = ModifiedBy;
      if (qs("#ModifiedOn")) qs("#ModifiedOn").value = ModifiedOn;

      if (!InsuranceCode) {
        setToast("Insurance Code is required.", "warning");
        setButtonDisabled(save, false);
        return;
      }

      const payload = {
        InsuranceCode,
        Description,
        Status: IsActive,
        CreatedBy,
        CreatedOn,
        ModifiedBy,
        ModifiedOn,
        NewRecord
      };

      setToast("Saving...", "info");
      try {
        const svc = window.StaticDataService;
        if (!svc?.addEditInsuranceCode) {
          setToast("Service not available.", "danger");
          setButtonDisabled(save, false);
          return;
        }
        const resp = await svc.addEditInsuranceCode(payload);
        if (resp?.success) {
          setToast("Saved successfully.", "success");
        } else {
          setToast(resp?.message || "Error saving record.", "danger");
        }
        clearForm({ keepId: false }); // Always clear all fields after save
        state.hasLoaded = false;
        state.recordNotFound = false;
        setMode(MODES.VIEW);
        updateActionButtons();
      } catch (err) {
        setToast("Error saving record.", "danger");
        setButtonDisabled(save, false);
      }
    });

    cancel?.addEventListener("click", () => {
      // If a record is loaded (after view/search), clear all fields including InsuranceCode
      if (state.hasLoaded) {
        clearForm({ keepId: false });
      } else {
        clearForm({ keepId: true });
      }
      setMode(MODES.VIEW);
      setToast("Changes canceled.", "info");
    });

    del?.addEventListener("click", async () => {
      if (state.mode === MODES.ADD) {
        setToast("Cannot delete in Add mode.", "warning");
        return;
      }
      const id = qs("#InsuranceCode")?.value?.trim() || "";
      if (!id) {
        setToast("Load a record first (Search/View) before deleting.", "warning");
        return;
      }
      if (!confirm("Are you sure you want to delete this record?")) {
        return;
      }

      setToast("Deleting...", "info");
      try {
        await ensureDependenciesLoaded();
        const svc = window.StaticDataService;
        if (!svc?.deleteInsuranceCode) {
          setToast("Service not available.", "danger");
          return;
        }
        const resp = await svc.deleteInsuranceCode(id);
        if (resp?.success) {
          setToast("Deleted successfully.", "success");
          clearForm({ keepId: false }); // Clear all fields after delete
          state.hasLoaded = false;
          state.recordNotFound = false;
          setMode(MODES.VIEW);
          updateActionButtons();
          setButtonDisabled(del, true); // Disable only after successful delete
        } else {
          setToast(resp?.message || "Error deleting record.", "danger");
        }
      } catch (err) {
        setToast("Error deleting record.", "danger");
      }
    });
  }

  // Main entry point: wait for dependencies, then bind everything
  window.addEventListener("DOMContentLoaded", () => {
    // Bind UI immediately so the search popup opens even if services are still loading.
    initSectionToggles();
    bindModeButtons();
    bindActions();
    wireInsuranceCodeSearchPanel();
    setMode(MODES.VIEW);
    updateActionButtons();

    // Load dependencies in the background; actions that need them also await explicitly.
    ensureDependenciesLoaded().catch((err) => {
      console.error("[InsuranceCodePage] Failed to load dependencies:", err);
      setToast("Some services failed to load. Search/Save may not work.", "warning");
    });
  });
})();
