(() => {
  const TOAST_ID = "elcToast";

  const branchLookupCache = {
    byId: new Map(),
    list: null,
    fetchedAt: 0,
    ttlMs: 5 * 60 * 1000
  };

  function normalizeId(value) {
    return String(value || "").trim();
  }

  function chooseLabelIcon(forId) {
    const id = normalizeId(forId);
    const upper = id.toUpperCase();

    if (!id) return "bi-tag";
    if (upper.endsWith("ID") || upper.includes("_ID")) return "bi-hash";
    if (upper.includes("DATE") || upper.includes("ON")) return "bi-calendar-event";
    if (upper.includes("AMOUNT") || upper.includes("LIMIT") || upper.includes("RATE") || upper.includes("CHARGE")) return "bi-cash-stack";
    if (upper.includes("CURRENCY") || upper.includes("FX")) return "bi-currency-exchange";
    if (upper.includes("ACCOUNT")) return "bi-credit-card-2-front";
    if (upper.includes("CLIENT") || upper.includes("CUSTOMER") || upper.includes("CONSIGNEE") || upper.includes("PARTICIPANT")) return "bi-person-badge";
    if (upper.includes("SWIFT") || upper.includes("MESSAGE")) return "bi-envelope";
    if (upper.includes("COUNTRY") || upper.includes("PORT") || upper.includes("PLACE") || upper.includes("LOCATION") || upper.includes("FROM") || upper.includes("TO")) return "bi-geo-alt";
    if (upper.includes("SHIP") || upper.includes("TRANSPORT")) return "bi-truck";
    if (upper.includes("REMARK") || upper.includes("DESCRIPTION") || upper.includes("DETAIL")) return "bi-journal-text";

    return "bi-tag";
  }

  function decorateDataEntryLabelsWithIcons() {
    const root = document.querySelector(".elc-surface");
    if (!root) return;

    // DataEntry only (exclude Behind The Scene)
    const selector = ".elc-header-block label.elc-label, .elc-tabcontent label.elc-label";
    root.querySelectorAll(selector).forEach((label) => {
      if (!(label instanceof HTMLLabelElement)) return;
      if (label.closest(".elc-bts")) return;
      if (label.querySelector("i.bi")) return;

      const text = String(label.textContent || "").trim();
      if (!text) return;

      const icon = document.createElement("i");
      icon.className = `bi ${chooseLabelIcon(label.getAttribute("for"))}`;
      icon.setAttribute("aria-hidden", "true");

      const span = document.createElement("span");
      span.textContent = text;

      label.textContent = "";
      label.append(icon, span);
    });
  }

  function wrapLabelControlPairs(container) {
    if (!container) return;

    // Header has been remodeled to LCPO markup (form-control-group/input-segmented).
    // Avoid applying legacy re-wrapping logic there.
    if (container.closest && container.closest('.elc-header-block')) return;

    const children = Array.from(container.children);
    if (!children.length) return;

    const rebuilt = [];
    for (let i = 0; i < children.length; i++) {
      const el = children[i];

      // Drop empty placeholders created for legacy alignment.
      if (
        el.tagName === "DIV" &&
        !el.classList.length &&
        String(el.textContent || "").trim() === "" &&
        el.children.length === 0
      ) {
        continue;
      }

      if (el.tagName === "LABEL") {
        const label = el;
        const control = children[i + 1];
        if (!control) {
          rebuilt.push(el);
          continue;
        }

        const field = document.createElement("div");
        field.className = "elc-field";
        if (control.classList?.contains("elc-control--span-all")) {
          field.classList.add("elc-field--span-all");
        }

        field.append(label, control);
        rebuilt.push(field);
        i++; // skip the control
        continue;
      }

      rebuilt.push(el);
    }

    container.replaceChildren(...rebuilt);
  }

  function remodelToLabelsOnTop() {
    const surface = document.querySelector(".elc-surface");
    if (!surface) return;

    // Main grids (tabs + behind the scene)
    surface.querySelectorAll(".elc-form-grid.elc-form-grid--two").forEach((grid) => wrapLabelControlPairs(grid));
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function showToast(message, tone = "info") {
    const el = byId(TOAST_ID);
    if (!el) return;

    el.classList.remove("d-none", "alert-info", "alert-warning", "alert-danger", "alert-success");

    const cls = {
      info: "alert-info",
      warning: "alert-warning",
      danger: "alert-danger",
      success: "alert-success"
    }[tone] || "alert-info";

    el.classList.add(cls);
    el.textContent = message;

    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => {
      el.classList.add("d-none");
    }, 2400);
  }

  function openModal(modalId) {
    const el = byId(modalId);
    if (!el) return;

    if (window.bootstrap && window.bootstrap.Modal) {
      const modal = window.bootstrap.Modal.getOrCreateInstance(el, {
        backdrop: "static",
        keyboard: true
      });
      modal.show();
      return;
    }

    // Fallback: basic visibility if Bootstrap isn't available.
    el.classList.add("show");
    el.style.display = "block";
    el.removeAttribute("aria-hidden");
  }

  function getBranchesArray(response) {
    if (!response) return [];

    // Normalized response format (coreApi normalizeResponse)
    if (response.data) {
      if (Array.isArray(response.data.Details)) return response.data.Details;
      if (Array.isArray(response.data.Details01)) return response.data.Details01;
      if (Array.isArray(response.data)) return response.data;
    }

    // Non-normalized fallbacks
    if (Array.isArray(response.Details)) return response.Details;
    if (Array.isArray(response.Details01)) return response.Details01;
    if (Array.isArray(response.ResponseData)) return response.ResponseData;

    return [];
  }

  function getSearchRows(response) {
    if (!response) return [];

    if (response.data) {
      if (Array.isArray(response.data.Details)) return response.data.Details;
      if (Array.isArray(response.data.Details01)) return response.data.Details01;
      if (Array.isArray(response.data)) return response.data;
    }

    if (Array.isArray(response.Details)) return response.Details;
    if (Array.isArray(response.Details01)) return response.Details01;
    if (Array.isArray(response.ResponseData)) return response.ResponseData;

    return [];
  }

  function pickField(row, candidates) {
    const obj = row && typeof row === 'object' ? row : {};
    for (const key of candidates) {
      if (obj[key] !== undefined && obj[key] !== null && String(obj[key]).trim() !== '') return obj[key];
    }
    return '';
  }

  function normalizeBranchRow(row) {
    const obj = row && typeof row === 'object' ? row : {};
    const id = normalizeId(obj.OurBranchID || obj.BranchID || obj.BranchId || obj.ID || obj.Id);
    const name = String(obj.BranchName || obj.OurBranchName || obj.Name || '').trim();
    return { id, name, raw: obj };
  }

  async function ensureBranchesCached() {
    if (!window.tradeFinanceService?.searchBranches) return [];

    const now = Date.now();
    const expired = now - branchLookupCache.fetchedAt > branchLookupCache.ttlMs;

    if (branchLookupCache.list && !expired) return branchLookupCache.list;

    if (expired) {
      branchLookupCache.byId.clear();
      branchLookupCache.list = null;
      branchLookupCache.fetchedAt = now;
    }

    try {
      const bankId = (window.Environment && window.Environment.defaultBankId) || '00';
      const response = await window.tradeFinanceService.searchBranches({ BankID: bankId });
      const rows = getBranchesArray(response);
      const normalized = rows.map(normalizeBranchRow).filter((b) => b.id || b.name);

      normalized.forEach((b) => {
        if (b.id && b.name) branchLookupCache.byId.set(b.id, b.name);
      });

      branchLookupCache.list = normalized;
      branchLookupCache.fetchedAt = now;
      return normalized;
    } catch (err) {
      console.error('[LCPO Amend/Extend] Branch cache load failed:', err);
      return [];
    }
  }

  async function hydrateBranchNameIfMissing(branchIdFieldId, branchNameFieldId) {
    const branchIdField = byId(branchIdFieldId);
    const branchNameField = byId(branchNameFieldId);
    const branchId = (branchIdField?.value || '').trim();
    const existingName = (branchNameField?.value || '').trim();

    if (!branchId) {
      if (branchNameField) branchNameField.value = '';
      return;
    }

    if (existingName) return;
    if (!window.tradeFinanceService?.searchBranches) return;

    // If name is cached, use it immediately.
    const cached = branchLookupCache.byId.get(branchId);
    if (cached) {
      if (branchNameField) branchNameField.value = cached;
      return;
    }

    await ensureBranchesCached();
    const name = branchLookupCache.byId.get(branchId) || '';
    if (branchNameField) branchNameField.value = name;
    if (!name) {
      showToast('Branch not found for the given Branch ID.', 'warning');
    }
  }

  function escapeHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function openBootstrapModal(id) {
    const el = byId(id);
    if (!el) return null;
    if (window.bootstrap && window.bootstrap.Modal) {
      const modal = window.bootstrap.Modal.getOrCreateInstance(el, { backdrop: 'static', keyboard: true });
      modal.show();
      return modal;
    }
    // Fallback to simple open
    openModal(id);
    return null;
  }

  function hideBootstrapModal(id) {
    const el = byId(id);
    if (!el) return;
    if (window.bootstrap && window.bootstrap.Modal) {
      const modal = window.bootstrap.Modal.getInstance(el);
      if (modal) {
        modal.hide();
        return;
      }
    }
    // Fallback
    el.classList.remove('show');
    el.style.display = 'none';
    el.setAttribute('aria-hidden', 'true');
  }

  function wireBranchSearchLookup() {
    const modalId = 'branchSearchModal';
    const searchBtn = byId('branchSearchButton');
    const resultsBody = byId('branchSearchResultsBody');
    const emptyEl = byId('branchSearchEmpty');

    const branchIdOpEl = byId('branchFilterIdOp');
    const branchIdValEl = byId('branchFilterIdValue');
    const branchNameOpEl = byId('branchFilterNameOp');
    const branchNameValEl = byId('branchFilterNameValue');

    if (!searchBtn || !resultsBody || !emptyEl || !branchIdOpEl || !branchIdValEl || !branchNameOpEl || !branchNameValEl) return;

    const branchLookupTargets = {
      branch: { id: 'BranchID', name: 'BranchName' },
      'lcw-branch': { id: 'LCW_BranchID', name: 'LCW_BranchName' },
      'aeh-branch': { id: 'AEH_BranchID', name: 'AEH_BranchName' }
    };

    let activeTarget = branchLookupTargets.branch;

    const matches = (value, op, term) => {
      const v = String(value || '').toLowerCase();
      const t = String(term || '').trim().toLowerCase();
      if (!t) return true;

      switch (String(op || 'like')) {
        case 'equals':
          return v === t;
        case 'startsWith':
          return v.startsWith(t);
        case 'endsWith':
          return v.endsWith(t);
        case 'like':
        default:
          return v.includes(t);
      }
    };

    const render = (branches) => {
      const idOp = branchIdOpEl.value;
      const idTerm = branchIdValEl.value;
      const nameOp = branchNameOpEl.value;
      const nameTerm = branchNameValEl.value;

      const filtered = branches.filter((b) => {
        return (
          matches(b.id, idOp, idTerm) &&
          matches(b.name, nameOp, nameTerm)
        );
      });

      resultsBody.innerHTML = '';

      if (!filtered.length) {
        emptyEl.style.display = 'block';
        return;
      }

      emptyEl.style.display = 'none';

      filtered.forEach((b, idx) => {
        const tr = document.createElement('tr');
        tr.tabIndex = 0;
        tr.dataset.index = String(idx);
        tr.innerHTML = `
          <td>${escapeHtml(b.id)}</td>
          <td>${escapeHtml(b.name)}</td>
        `.trim();

        const pick = () => {
          const idEl = byId(activeTarget.id);
          const nameEl = byId(activeTarget.name);
          if (idEl) idEl.value = b.id;
          if (nameEl) nameEl.value = b.name;
          hideBootstrapModal(modalId);
        };

        tr.addEventListener('click', pick);
        tr.addEventListener('dblclick', pick);
        tr.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') pick();
        });

        resultsBody.appendChild(tr);
      });
    };

    async function ensureBranchesLoaded() {
      if (!window.tradeFinanceService || typeof window.tradeFinanceService.searchBranches !== 'function') {
        showToast('Branches API service not available (tradeFinanceService.searchBranches).', 'danger');
        return [];
      }

      try {
        showToast('Loading branches...', 'info');
        return await ensureBranchesCached();
      } catch (err) {
        console.error('[LCPO Amend/Extend] Branch search failed:', err);
        showToast(`Branch search failed: ${err?.message || String(err)}`, 'danger');
        return [];
      }
    }

    async function openFor(lookupType) {
      activeTarget = branchLookupTargets[lookupType] || branchLookupTargets.branch;

      openBootstrapModal(modalId);

      const branches = await ensureBranchesLoaded();
      render(branches);

      // Focus first input for faster typing
      window.setTimeout(() => branchIdValEl.focus(), 50);
    }

    // Wire the lookup buttons
    document.querySelectorAll('[data-lookup="branch"], [data-lookup="lcw-branch"], [data-lookup="aeh-branch"]').forEach((btn) => {
      btn.addEventListener('click', () => openFor(btn.dataset.lookup || 'branch'));
    });

    // Modal search interactions
    searchBtn.addEventListener('click', async () => {
      const branches = await ensureBranchesLoaded();
      render(branches);
    });

    const onEnter = async (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const branches = await ensureBranchesLoaded();
      render(branches);
    };

    branchIdValEl.addEventListener('keydown', onEnter);
    branchNameValEl.addEventListener('keydown', onEnter);

    // When modal opens, refresh view (in case something changed)
    const modalEl = byId(modalId);
    if (modalEl) {
      modalEl.addEventListener('shown.bs.modal', async () => {
        const branches = await ensureBranchesLoaded();
        render(branches);
        branchIdValEl.focus();
      });
    }
  }

  function wireAmendmentSearchLookup() {
    const modalId = 'amendmentSearchModal';
    const searchBtn = byId('amendmentSearchButton');
    const clientIdEl = byId('amendmentFilterClientId');
    const applicationNoEl = byId('amendmentFilterApplicationNo');
    const resultsBody = byId('amendmentSearchResultsBody');
    const emptyEl = byId('amendmentSearchEmpty');

    if (!searchBtn || !clientIdEl || !applicationNoEl || !resultsBody || !emptyEl) return;

    const buildAdvFilterString = (clientId, applicationNo) => {
      const parts = ["OurBranchID=''"];
      const client = String(clientId || '').trim();
      const app = String(applicationNo || '').trim();

      if (client) {
        const safeClient = client.replace(/'/g, "''");
        // LCAmendment result set includes AccountID (not ClientID).
        // In this screen, the "ClientID" filter is treated as AccountID.
        parts.push(`AccountID like '%${safeClient}%'`);
      }

      if (app) {
        const safeApp = app.replace(/'/g, "''");
        parts.push(`ApplicationID like '%${safeApp}%'`);
      }

      return parts.join(' AND ');
    };

    const normalizeStatus = (v) => String(v ?? '').trim();

    const render = (rows) => {
      resultsBody.innerHTML = '';

      if (!rows.length) {
        emptyEl.style.display = 'block';
        return;
      }

      emptyEl.style.display = 'none';

      rows.forEach((row) => {
        const amendmentNumber = normalizeId(pickField(row, ['AmendmentNumber', 'RowID', 'RowId', 'RowNo', 'RowNo_', 'ID', 'Id']));
        const amendmentId = normalizeId(pickField(row, ['AmendmentID', 'AmendmentId', 'LCAmendmentID', 'LCAmendmentId', 'RowID', 'RowId', 'ID', 'Id']));
        const clientId = normalizeId(pickField(row, ['AccountID', 'AccountId']));
        const applicationNo = String(pickField(row, ['ApplicationID', 'ApplicationId']) ?? '').trim();
        const status = normalizeStatus(pickField(row, ['Status', 'StatusName', 'AmendmentStatus', 'AmendmentStatusName']));

        if (!amendmentNumber && !amendmentId) return;

        const tr = document.createElement('tr');
        tr.tabIndex = 0;
        tr.innerHTML = `
          <td>${escapeHtml(amendmentNumber || amendmentId)}</td>
          <td>${escapeHtml(clientId)}</td>
          <td>${escapeHtml(applicationNo)}</td>
          <td>${escapeHtml(status)}</td>
        `.trim();

        const pick = () => {
          const amendmentEl = byId('AmendmentID');
          if (amendmentEl) amendmentEl.value = amendmentNumber || amendmentId;
          hideBootstrapModal(modalId);
        };

        tr.addEventListener('click', pick);
        tr.addEventListener('dblclick', pick);
        tr.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') pick();
        });

        resultsBody.appendChild(tr);
      });
    };

    async function runSearch() {
      if (!window.tradeFinanceService || typeof window.tradeFinanceService.search !== 'function') {
        showToast('Search API service not available (tradeFinanceService.search).', 'danger');
        return;
      }

      const operatorId = window.sessionStorage?.getItem?.('operatorId') || 'web_portal';
      const clientId = clientIdEl.value;
      const applicationNo = applicationNoEl.value;

      if (!String(clientId || '').trim() && !String(applicationNo || '').trim()) {
        showToast('Enter Client ID or Application Number to search.', 'warning');
        render([]);
        return;
      }

      try {
        showToast('Searching amendments...', 'info');

        const advFilterString = buildAdvFilterString(clientId, applicationNo);

        const requestData = {
          TableID: 'LCAmendment',
          RefID: null,
          PrevOrNext: 0,
          AdvFilterString: advFilterString,
          ModuleID: 6812,
          WhereStmt: '',
          OperatorID: operatorId,
          OurBranchID: '',
          SearchKey: String(applicationNo || clientId || '').trim(),
          LanguageID: 'en'
        };

        const response = await window.tradeFinanceService.search(requestData);
        const rows = getSearchRows(response);
        render(rows);
      } catch (err) {
        console.error('[LCPO Amend/Extend] Amendment search failed:', err);
        showToast(`Amendment search failed: ${err?.message || String(err)}`, 'danger');
        render([]);
      }
    }

    function open() {
      openBootstrapModal(modalId);
      const existingClientId = byId('ClientID')?.value || '';
      const existingAppNo = byId('ApplicationID')?.value || '';

      if (!String(clientIdEl.value || '').trim() && String(existingClientId || '').trim()) {
        clientIdEl.value = String(existingClientId).trim();
      }

      if (!String(applicationNoEl.value || '').trim() && String(existingAppNo || '').trim()) {
        applicationNoEl.value = String(existingAppNo).trim();
      }

      window.setTimeout(() => clientIdEl.focus(), 50);
    }

    // Wire button in the header
    document.querySelectorAll('[data-lookup="amendment"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        open();
      });
    });

    searchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      runSearch();
    });

    const onEnter = (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      runSearch();
    };

    clientIdEl.addEventListener('keydown', onEnter);
    applicationNoEl.addEventListener('keydown', onEnter);

    const modalEl = byId(modalId);
    if (modalEl) {
      modalEl.addEventListener('shown.bs.modal', () => {
        clientIdEl.focus();
      });
    }
  }

  function wireApplicationSearchLookup() {
    const modalId = 'applicationSearchModal';
    const searchBtn = byId('applicationSearchButton');
    const searchValueEl = byId('applicationSearchValue');
    const resultsBody = byId('applicationSearchResultsBody');
    const emptyEl = byId('applicationSearchEmpty');

    if (!searchBtn || !searchValueEl || !resultsBody || !emptyEl) return;

    const buildWhereStmt = (term) => {
      const q = String(term || '').trim();
      if (!q) return '';
      const safe = q.replace(/'/g, "''");
      return `ApplicationID like '%${safe}%'`;
    };

    const buildAdvFilterString = (branchId) => {
      // User-provided base filter: OurBranchID='...' AND LCApplicationStatusID='S'
      const safeBranch = String(branchId || '').trim().replace(/'/g, "''");
      const ourBranch = `OurBranchID='${safeBranch}'`;
      return `${ourBranch} AND LCApplicationStatusID='S'`;
    };

    const normalizeStatus = (v) => String(v ?? '').trim();

    const render = (rows) => {
      resultsBody.innerHTML = '';

      if (!rows.length) {
        emptyEl.style.display = 'block';
        return;
      }

      emptyEl.style.display = 'none';

      rows.forEach((row) => {
        const applicationId = normalizeId(pickField(row, ['ApplicationID', 'ApplicationId', 'LCApplicationID', 'LcApplicationID', 'ID', 'Id']));
        const ourBranchId = normalizeId(pickField(row, ['OurBranchID', 'OurBranchId', 'BranchID', 'BranchId']));
        const accountId = normalizeId(pickField(row, ['AccountID', 'AccountId']));
        const status = normalizeStatus(pickField(row, ['LCApplicationStatusID', 'Status', 'StatusName', 'LCStatusID']));

        if (!applicationId) return;

        const tr = document.createElement('tr');
        tr.tabIndex = 0;
        tr.innerHTML = `
          <td>${escapeHtml(applicationId)}</td>
          <td>${escapeHtml(ourBranchId)}</td>
          <td>${escapeHtml(accountId)}</td>
          <td>${escapeHtml(status)}</td>
        `.trim();

        const pick = () => {
          const applicationEl = byId('ApplicationID');
          if (applicationEl) applicationEl.value = applicationId;
          hideBootstrapModal(modalId);
        };

        tr.addEventListener('click', pick);
        tr.addEventListener('dblclick', pick);
        tr.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') pick();
        });

        resultsBody.appendChild(tr);
      });
    };

    async function runSearch() {
      if (!window.tradeFinanceService || typeof window.tradeFinanceService.search !== 'function') {
        showToast('Search API service not available (tradeFinanceService.search).', 'danger');
        return;
      }

      const operatorId = window.sessionStorage?.getItem?.('operatorId') || 'web_portal';
      const term = String(searchValueEl.value || '').trim();
      const branchId = String(byId('BranchID')?.value || '').trim();

      if (!branchId) {
        showToast('Enter Branch ID first.', 'warning');
        render([]);
        return;
      }

      try {
        showToast('Searching applications...', 'info');

        const advFilterString = buildAdvFilterString(branchId);
        const requestData = {
          TableID: 'LCFacilityAmendment',
          RefID: null,
          PrevOrNext: 0,
          AdvFilterString: advFilterString,
          ModuleID: 6812,
          WhereStmt: buildWhereStmt(term),
          OperatorID: operatorId,
          OurBranchID: '',
          SearchKey: term,
          LanguageID: 'en'
        };

        const response = await window.tradeFinanceService.search(requestData);
        const rows = getSearchRows(response);
        render(rows);
      } catch (err) {
        console.error('[LCPO Amend/Extend] Application search failed:', err);
        showToast(`Application search failed: ${err?.message || String(err)}`, 'danger');
        render([]);
      }
    }

    function open() {
      openBootstrapModal(modalId);
      const current = byId('ApplicationID')?.value || '';
      if (!String(searchValueEl.value || '').trim() && String(current).trim()) {
        searchValueEl.value = String(current).trim();
      }
      // Auto-fetch on open (like legacy lookup), using BranchID scoping.
      window.setTimeout(() => {
        searchValueEl.focus();
        runSearch();
      }, 50);
    }

    document.querySelectorAll('[data-lookup="application"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        open();
      });
    });

    searchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      runSearch();
    });

    searchValueEl.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      runSearch();
    });

    const modalEl = byId(modalId);
    if (modalEl) {
      modalEl.addEventListener('shown.bs.modal', () => {
        searchValueEl.focus();
      });
    }
  }

  function setEditable(enabled) {
    document.querySelectorAll("[data-editable='true']").forEach((control) => {
      if (control.id === "BranchID" || control.id === "branchId" || control.id === "OurBranchID") {
        control.disabled = false;
        control.readOnly = false;
        return;
      }

      if (control.matches("select")) {
        control.disabled = !enabled;
        return;
      }

      if (control.matches("input[type='checkbox']")) {
        control.disabled = !enabled;
        return;
      }

      control.readOnly = !enabled;
    });

    document.querySelectorAll("[data-lookup], [data-elc-browse-image]").forEach((btn) => {
      if (btn.getAttribute("data-lookup") === "branch") {
        btn.disabled = false;
        return;
      }

      btn.disabled = !enabled;
    });
  }

  function validateRequired() {
    const form = byId("lcpo-amend-form");
    if (!form) return true;

    const required = Array.from(form.querySelectorAll("[required]"));
    const invalid = required.filter((el) => {
      if (el.disabled) return false;
      if (el.matches("select")) return !String(el.value || "").trim();
      return !String(el.value || "").trim();
    });

    if (!invalid.length) return true;

    invalid[0].focus();
    showToast("Please fill all required fields.", "warning");
    return false;
  }

  function setMode(mode) {
    const buttons = Array.from(document.querySelectorAll("[data-elc-action]"));
    const get = (action) => buttons.find((b) => b.dataset.elcAction === action);

    const viewBtn = get("view");
    const addBtn = get("add");
    const editBtn = get("edit");
    const deleteBtn = get("delete");
    const saveBtn = get("save");
    const cancelBtn = get("cancel");

    if (mode === "view") {
      setEditable(false);
      if (viewBtn) viewBtn.disabled = false;
      if (addBtn) addBtn.disabled = false;
      if (editBtn) editBtn.disabled = false;
      if (deleteBtn) deleteBtn.disabled = false;
      if (saveBtn) saveBtn.disabled = true;
      if (cancelBtn) cancelBtn.disabled = true;
      return;
    }

    if (mode === "add" || mode === "edit") {
      setEditable(true);
      if (viewBtn) viewBtn.disabled = false;
      if (addBtn) addBtn.disabled = true;
      if (editBtn) editBtn.disabled = true;
      if (deleteBtn) deleteBtn.disabled = true;
      if (saveBtn) saveBtn.disabled = false;
      if (cancelBtn) cancelBtn.disabled = false;
      return;
    }
  }

  function wireTabs() {
    const tabButtons = Array.from(
      document.querySelectorAll(".elc-tablist [data-bs-toggle='tab']")
    );
    const panes = Array.from(
      document.querySelectorAll(".elc-tabcontent .tab-pane")
    );

    if (!tabButtons.length || !panes.length) return;

    tabButtons.forEach((tabBtn) => {
      tabBtn.addEventListener("click", (ev) => {
        ev.preventDefault();

        const targetSelector = tabBtn.getAttribute("data-bs-target");
        if (!targetSelector) return;

        const targetPane = document.querySelector(targetSelector);
        if (!targetPane) return;

        tabButtons.forEach((btn) => btn.classList.remove("active"));
        panes.forEach((pane) => pane.classList.remove("show", "active"));

        tabBtn.classList.add("active");
        targetPane.classList.add("show", "active");
      });
    });
  }

  function wireLookups() {
    // Real wiring: branch lookups.
    wireBranchSearchLookup();

    // Wire AmendmentID search via p_GetSearchResult (LCAmendment)
    wireAmendmentSearchLookup();

    // Wire ApplicationID search via p_GetSearchResult (LCFacilityAmendment)
    wireApplicationSearchLookup();

    // Auto-hydrate branch names when user types IDs.
    const wireHydrate = (idFieldId, nameFieldId) => {
      const idField = byId(idFieldId);
      if (!idField) return;

      idField.addEventListener('keydown', (e) => {
        if (e.key === 'Tab' || e.keyCode === 9) {
          setTimeout(() => {
            hydrateBranchNameIfMissing(idFieldId, nameFieldId).catch((err) => {
              console.error('Error hydrating branch name on Tab:', err);
            });
          }, 0);
        }
      });

      idField.addEventListener('blur', () => {
        hydrateBranchNameIfMissing(idFieldId, nameFieldId).catch((err) => {
          console.error('Error hydrating branch name on blur:', err);
        });
      });
    };

    // Main header Branch ID
    wireHydrate('BranchID', 'BranchName');
    // Popouts that also have BranchID/BranchName pairs
    wireHydrate('LCW_BranchID', 'LCW_BranchName');
    wireHydrate('AEH_BranchID', 'AEH_BranchName');

    // Keep other lookups as placeholders for now.
    document.querySelectorAll("[data-lookup]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const type = btn.dataset.lookup;
        if (type === 'branch' || type === 'lcw-branch' || type === 'aeh-branch' || type === 'amendment' || type === 'application') return;
        showToast(`Lookup: ${type} (not wired yet).`, 'info');
      });
    });

    const browse = document.querySelector("[data-elc-browse-image]");
    if (browse) {
      browse.addEventListener("click", () => {
        showToast("Browse document image (demo).", "info");
      });
    }
  }

  function wireActions() {
    document.querySelectorAll("[data-elc-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.elcAction;

        if (action === "swift-message") {
          const swiftTab = document.getElementById("elc-tab-swift");
          if (swiftTab) {
            swiftTab.click();
            showToast("Swift Free Format Text.");
            return;
          }

          showToast("Swift tab not found.", "warning");
          return;
        }

        if (action === "view") {
          setMode("view");
          showToast("View mode.");
          return;
        }

        if (action === "add") {
          setMode("add");
          showToast("Add mode.");
          return;
        }

        if (action === "edit") {
          setMode("edit");
          showToast("Edit mode.");
          return;
        }

        if (action === "save") {
          if (!validateRequired()) return;
          setMode("view");
          showToast("Saved (demo).", "success");
          return;
        }

        if (action === "cancel") {
          setMode("view");
          showToast("Cancelled.");
          return;
        }

        showToast("Action not wired yet.", "warning");
      });
    });
  }

  function wireHeaderSelectors() {
    const dataEntryBtn = document.querySelector("[data-lcpo-role='dataentry-mode']");
    const viewModeBtn = document.querySelector("[data-lcpo-role='view-mode']");

    function setCurrent(btn) {
      const all = document.querySelectorAll(".lcpo-nav-item");
      all.forEach((el) => el.removeAttribute("aria-current"));
      if (btn) {
        btn.setAttribute("aria-current", "true");
      }
    }

    if (dataEntryBtn) {
      dataEntryBtn.addEventListener("click", () => {
        setCurrent(dataEntryBtn);
        openModal("lcChargeWaiverModal");
      });
    }

    if (viewModeBtn) {
      viewModeBtn.addEventListener("click", () => {
        setCurrent(viewModeBtn);
        openModal("amendExtendHistoryModal");
      });
    }
  }

  function init() {
    remodelToLabelsOnTop();
    decorateDataEntryLabelsWithIcons();
    setMode("add");
    wireTabs();
    wireLookups();
    wireActions();
    wireHeaderSelectors();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
