(() => {
  if (window.__kairoProductGlInterfaceLoaded) return;
  window.__kairoProductGlInterfaceLoaded = true;

  console.log("[ProductGLInterface] script loaded");

  const MODES = {
    VIEW: "View",
    ADD: "Add",
    UPDATE: "Update",
  };

  const state = {
    mode: MODES.VIEW,
    currentRecord: null,
    hasLoadedRecord: false,
    glTags: [],
    glMappings: [],
    tagLookup: null,
  };

  const RECENT_KEY = "kairo.product.glInterface.recent";
  const RECENT_LIMIT = 6;

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function setToast(message, variant = "info") {
    const toast = qs("#pgiToast");
    if (!toast) return;
    toast.classList.remove("d-none", "alert-success", "alert-danger", "alert-warning", "alert-info");
    toast.classList.add(`alert-${variant}`);
    toast.textContent = message;
    window.setTimeout(() => toast.classList.add("d-none"), 2200);
  }

  function getFieldValue(fieldId) {
    const field = qs(`#${fieldId}`);
    if (!field) return "";
    if (field.type === "checkbox") return field.checked;
    return (field.value || "").trim();
  }

  function extractId(raw) {
    const text = String(raw || "").trim();
    if (!text) return "";
    const first = text.split(/\s+-\s+|\s+\|\s+|\s+/)[0];
    return String(first || "").trim();
  }

  async function uiAlert(message, titleOrOptions) {
    const title = typeof titleOrOptions === "string" ? titleOrOptions : titleOrOptions?.title || "Message";
    const variant = titleOrOptions?.variant || "info";
    
    // Try to use parent page modal if available
      const parentUi = window.parent?.ProductLgLcUi || window.parent;
      if (parentUi && typeof parentUi.uiAlert === "function") {
        return parentUi.uiAlert(message, titleOrOptions);
    }
    
    // Fallback to browser alert
    window.alert(`${title}\n\n${message}`);
    return Promise.resolve(true);
  }

  async function uiConfirm(message, titleOrOptions) {
    const title = typeof titleOrOptions === "string" ? titleOrOptions : titleOrOptions?.title || "Confirm";
    const variant = titleOrOptions?.variant || "warning";

      const parentUi = window.parent?.ProductLgLcUi || window.parent;
      if (parentUi && typeof parentUi.uiConfirm === "function") {
        return parentUi.uiConfirm(message, titleOrOptions);
    }

    const result = window.confirm(`${title}\n\n${message}`);
    return Promise.resolve(result);
  }

  function clearFormFields(form) {
    if (!form) return;
    const fields = qsa("input, select, textarea", form);
    fields.forEach((field) => {
      if (field.closest("[data-always-enabled]")) return;
      if (field.type === "checkbox") {
        field.checked = false;
        return;
      }
      if (field.tagName === "SELECT") {
        field.value = "";
        return;
      }
      field.value = "";
    });
  }

  function bindRecordToForm(record) {
    if (!record || typeof record !== "object") return;
    
    Object.keys(record).forEach((key) => {
      const field = qs(`#${key}`);
      if (!field) return;
      
      const value = record[key];
      
      if (field.type === "checkbox") {
        field.checked = value === true || value === 1 || value === "1" || value === "Y";
        return;
      }
      
      if (field.tagName === "SELECT") {
        field.value = value == null ? "" : String(value);
        return;
      }
      
      field.value = value == null ? "" : String(value);
    });
  }

  function buildTagLookup(tags) {
    const map = new Map();
    (tags || []).forEach((row) => {
      if (row?.SubCodeID) {
        map.set(String(row.SubCodeID), row);
      }
    });
    return map;
  }

  function populateGlTagDropdown(tags) {
    const select = qs("#GlAccountTag");
    if (!select) return;

    const firstPlaceholder = select.querySelector('option[value=""]');
    const current = select.value;

    select.innerHTML = "";
    if (firstPlaceholder) {
      select.appendChild(firstPlaceholder);
    } else {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "--Select--";
      select.appendChild(opt);
    }

    (tags || []).forEach((row) => {
      if (!row?.SubCodeID) return;
      const opt = document.createElement("option");
      opt.value = String(row.SubCodeID);
      opt.textContent = row.Description || row.SubCodeID;
      select.appendChild(opt);
    });

    if (current && Array.from(select.options).some((o) => o.value === current)) {
      select.value = current;
    }
  }

  function renderGlMappingsTable(mappings, tagLookup) {
    const tbody = document.querySelector('table[aria-label="GL interface mappings"] tbody');
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!Array.isArray(mappings) || mappings.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 3;
      cell.className = "py-2";
      cell.textContent = "No records to display.";
      row.appendChild(cell);
      tbody.appendChild(row);
      return;
    }

    const glTagSelect = qs("#GlAccountTag");
    const glAccountIdInput = qs("#GlAccountId");

    mappings.forEach((rowData) => {
      const tr = document.createElement("tr");
      const tagMeta = tagLookup?.get(rowData.AccountTagID) || null;
      const tagLabel = tagMeta?.Description || rowData.Description || rowData.AccountTagID || "";

      const tagCell = document.createElement("td");
      tagCell.textContent = tagLabel;

      const idCell = document.createElement("td");
      idCell.textContent = rowData.AccountID || "";

      const nameCell = document.createElement("td");
      nameCell.textContent = rowData.AccountName || "";

      tr.appendChild(tagCell);
      tr.appendChild(idCell);
      tr.appendChild(nameCell);

      // Allow user to click a row to select/edit it
      tr.style.cursor = "pointer";
      tr.addEventListener("click", () => {
        // Highlight selected row
        Array.from(tbody.querySelectorAll("tr")).forEach((r) => r.classList.remove("table-active"));
        tr.classList.add("table-active");

        const tagId = rowData.AccountTagID ? String(rowData.AccountTagID) : "";
        if (glTagSelect && tagId) {
          glTagSelect.value = tagId;
        }
        if (glAccountIdInput) {
          glAccountIdInput.value = rowData.AccountID || "";
        }

        applyAuditFields(rowData);

        // Remember which tag is selected for Alter/Update/Remove
        state.selectedTagId = tagId;
      });

      tbody.appendChild(tr);
    });
  }

  function applyAuditFields(mappingRow) {
    const createdBy = qs("#GlCreatedBy");
    const createdOn = qs("#GlCreatedOn");
    const modifiedBy = qs("#GlModifiedBy");
    const modifiedOn = qs("#GlModifiedOn");
    const supervisedBy = qs("#GlSupervisedBy");
    const supervisedOn = qs("#GlSupervisedOn");

    if (createdBy) createdBy.value = mappingRow?.CreatedBy || "";
    if (createdOn) createdOn.value = mappingRow?.CreatedOn || "";
    if (modifiedBy) modifiedBy.value = mappingRow?.ModifiedBy || "";
    if (modifiedOn) modifiedOn.value = mappingRow?.ModifiedOn || "";
    if (supervisedBy) supervisedBy.value = mappingRow?.SupervisedBy || "";
    if (supervisedOn) supervisedOn.value = mappingRow?.SupervisedOn || "";
  }

  function loadRecent() {
    try {
      const raw = window.sessionStorage.getItem(RECENT_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveRecent(items) {
    try {
      window.sessionStorage.setItem(RECENT_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }

  function renderRecent() {
    const host = qs("[data-pgi-recent-list]");
    if (!host) return;
    const items = loadRecent();
    host.innerHTML = "";
    items.forEach((text) => {
      const div = document.createElement("div");
      div.className = "pgi-recent__item";
      div.textContent = text;
      host.appendChild(div);
    });
  }

  function pushRecentAccount() {
    const accountId = (qs("#AccountId")?.value || "").trim();
    const tagSelect = qs("#AccountTag");
    const tagText = (tagSelect?.selectedOptions?.[0]?.textContent || "").trim();
    const tagValue = (tagSelect?.value || "").trim();
    const tag = (tagValue || tagText || "").replace(/^--Select--$/i, "").trim();

    const label = tag && accountId ? `${tag} · ${accountId}` : (accountId || tag);
    if (!label) return;

    const items = loadRecent().filter((x) => x && x !== label);
    items.unshift(label);
    saveRecent(items.slice(0, RECENT_LIMIT));
    renderRecent();
  }

  function escapeXml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function formatLegacyDateTime(d = new Date()) {
    const pad2 = (n) => String(n).padStart(2, "0");
    const mm = pad2(d.getMonth() + 1);
    const dd = pad2(d.getDate());
    const yyyy = d.getFullYear();
    const hh = pad2(d.getHours());
    const mi = pad2(d.getMinutes());
    const ss = pad2(d.getSeconds());
    return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
  }

  function setMode(nextMode) {
    state.mode = nextMode;

    const pill = qs("[data-page-function-pill]");
    if (pill) pill.textContent = `Mode · ${nextMode}`;

    // On the standalone Product GL page we have #pgi-form; on the
    // data-entry iframe we don't, so fall back to the whole document.
    const form = qs("#pgi-form") || document;

    const isEditable = nextMode === MODES.ADD || nextMode === MODES.UPDATE;

    qsa("input, select, textarea, button", form).forEach((el) => {
      if (el.hasAttribute("data-always-enabled")) {
        el.disabled = false;
        return;
      }

      if (el.closest(".cm-legacy-nav") || el.closest(".cm-legacy-actions") || el.closest(".action-panel")) {
        el.disabled = false;
        return;
      }

      if (el.tagName === "BUTTON") {
        el.disabled = !isEditable;
        return;
      }

      el.disabled = !isEditable;
    });

    const saveBtn = qs('[data-pgi-action="save"]');
    const cancelBtn = qs('[data-pgi-action="cancel"]');
    if (saveBtn) saveBtn.disabled = !isEditable;
    if (cancelBtn) cancelBtn.disabled = !isEditable;

    qsa('[data-pgi-action="alter"], [data-pgi-action="remove"], [data-pgi-action="update-row"], [data-pgi-action="clear"]', form).forEach((btn) => {
      btn.disabled = !isEditable;
    });

    // In Edit/Update mode, enable Alter/Remove/Clear, keep Update disabled until Alter is clicked.
    if (isEditable) {
      const alterBtn = qs('[data-pgi-action="alter"]', form);
      const removeBtn = qs('[data-pgi-action="remove"]', form);
      const updateRowBtn = qs('[data-pgi-action="update-row"]', form);
      const clearBtn = qs('[data-pgi-action="clear"]', form);

      if (alterBtn) alterBtn.disabled = false;
      if (removeBtn) removeBtn.disabled = false;
      if (clearBtn) clearBtn.disabled = false;
      if (updateRowBtn) updateRowBtn.disabled = true;
    }
  }

  function bindModeButtons() {
    qsa("[data-shell-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const next = btn.getAttribute("data-shell-mode");
        if (!next || !MODES[next.toUpperCase()]) return;
        setMode(MODES[next.toUpperCase()]);
      });
    });
  }

  function bindLeftNav() {
    qsa("[data-pgi-left-nav]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-pgi-left-nav") || "";
        if (target === "product-gl-interface") return;
        if (target === "product-documents") {
          window.location.href = "product-documents.html";
          return;
        }
        if (target === "user-defined-fields") {
          window.location.href = "user-defined-fields.html";
          return;
        }
        if (target === "product-charges") {
          window.location.href = "product-charges.html";
          return;
        }
        const label = btn.textContent?.trim() || target;
        setToast(`${label} opened (stub).`, "info");
      });
    });
  }

  async function fetchGLInterface() {
    if (!window.parent?.ServiceLoader?.loadProductLgLcService) {
      await uiAlert("Service loader is not available.", { title: "Error", variant: "danger" });
      return;
    }

    // Get ProductID from parent page's form
    const parentProductField = window.parent.document?.getElementById("Product");
    const productId = parentProductField ? extractId(parentProductField.value) : "";
    
    if (!productId) {
      await uiAlert("No product selected in parent page. Please view a product first.", { title: "No Product", variant: "warning" });
      setToast("No product selected.", "warning");
      return;
    }

    setToast("Loading GL Interface data...", "info");

    await window.parent.ServiceLoader.loadProductLgLcService();

    if (!window.parent.ProductLgLcService?.getGLInterface) {
      await uiAlert("ProductLgLcService.getGLInterface is not available.", { title: "Error", variant: "danger" });
      return;
    }

    const session = window.parent.AuthService?.getSession?.() || null;
    const bankId = session?.bankID || session?.BankID || window.parent.Environment?.BankID || "00";
    const branchId = session?.branchID || session?.BranchID || window.parent.Environment?.BranchID || "1201";
    const operatorId = session?.operatorID || session?.OperatorID || "JOY_WANJA";

    const requestData = {
      OurBranchID: branchId,
      BankID: '00',
      RelevantID: productId,
      ModuleID: "2507",
      OperatorID: 'JOY_WANJA'
    };

    console.log("ProductLgLcService.getGLInterface request", requestData);

    try {
      const response = await window.parent.ProductLgLcService.getGLInterface(requestData);
      console.log("ProductLgLcService.getGLInterface response", response);

      if (!response?.success) {
        state.hasLoadedRecord = false;
        state.currentRecord = null;
        const message = response?.message || "GL Interface data not found.";
        await uiAlert(message, { title: "Not Found", variant: "warning" });
        setToast(message, "warning");
        return;
      }

      // Parse response data based on expected structure:
      // Details01 -> list of possible Account Tags (SubCodeID, Description)
      // Details02 -> existing mappings (AccountTagID, AccountID, AccountName, audit fields)
      const payload = response?.data || {};
      const tags = Array.isArray(payload.Details01) ? payload.Details01 : [];
      const mappings = Array.isArray(payload.Details02) ? payload.Details02 : [];

      state.glTags = tags;
      state.glMappings = mappings;
      state.tagLookup = buildTagLookup(tags);

      populateGlTagDropdown(tags);
      renderGlMappingsTable(mappings, state.tagLookup);

      const glTagSelect = qs("#GlAccountTag");
      const glAccountIdInput = qs("#GlAccountId");

      const firstMapping = mappings[0];
      if (firstMapping) {
        if (glTagSelect) glTagSelect.value = firstMapping.AccountTagID || "";
        if (glAccountIdInput) glAccountIdInput.value = firstMapping.AccountID || "";
        applyAuditFields(firstMapping);
      } else {
        if (glTagSelect) glTagSelect.value = "";
        if (glAccountIdInput) glAccountIdInput.value = "";
        applyAuditFields({});
      }

      state.hasLoadedRecord = true;
      setToast("GL Interface data loaded.", "success");
      setMode(MODES.VIEW);
    } catch (err) {
      console.error("[ProductGLInterface] Fetch failed:", err);
      await uiAlert(`Error loading GL Interface data: ${err.message || err}`, { title: "Error", variant: "danger" });
      setToast("Failed to load data.", "danger");
    }
  }

  function bindActions() {
    qs('[data-pgi-action="save"]')?.addEventListener("click", async () => {
      console.log("[ProductGLInterface] Save button clicked", { mode: state.mode });
      if (state.mode === MODES.VIEW) {
        setToast("Switch to Edit before saving.", "warning");
        return;
      }

      if (!window.parent || window.parent === window) {
        console.warn("[ProductGLInterface] No parent window detected; save is only supported from within Product Maintenance iframe.");
        await uiAlert("Save is only available when opened from Product Maintenance.", {
          title: "Save Unavailable",
          variant: "danger",
        });
        return;
      }

      const glTagSelect = qs("#GlAccountTag");
      const glAccountIdInput = qs("#GlAccountId");
      const tagId = (glTagSelect?.value || "").trim();
      const accountId = (glAccountIdInput?.value || "").trim();

      if (!tagId) {
        await uiAlert("Select an Account Tag before saving.", { title: "Missing Tag", variant: "warning" });
        return;
      }
      if (!accountId) {
        await uiAlert("Enter an Account ID before saving.", { title: "Missing Account", variant: "warning" });
        return;
      }

      const parentProductField = window.parent.document?.getElementById("Product");
      const productId = parentProductField ? extractId(parentProductField.value) : "";
      if (!productId) {
        console.warn("[ProductGLInterface] No ProductID found on parent page; aborting save.");
        await uiAlert("No product selected in parent page. Please view a product first.", {
          title: "No Product",
          variant: "warning",
        });
        setToast("No product selected.", "warning");
        return;
      }

      if (!window.parent.ServiceLoader?.loadProductLgLcService) {
        console.error("[ProductGLInterface] ServiceLoader.loadProductLgLcService not available on parent.");
        await uiAlert("Service loader is not available.", { title: "Error", variant: "danger" });
        return;
      }

      setToast("Saving GL Interface...", "info");

      await window.parent.ServiceLoader.loadProductLgLcService();
      if (!window.parent.ProductLgLcService?.addEditGLInterface) {
        console.error("[ProductGLInterface] ProductLgLcService.addEditGLInterface is not available on parent.");
        await uiAlert("ProductLgLcService.addEditGLInterface is not available.", {
          title: "Error",
          variant: "danger",
        });
        return;
      }

      const session = window.parent.AuthService?.getSession?.() || null;
      const bankId =
        session?.bankID ||
        session?.BankID ||
        window.parent.Environment?.BankID ||
        window.parent.Environment?.bankID ||
        "00";
      const branchId =
        session?.branchID ||
        session?.BranchID ||
        window.parent.Environment?.BranchID ||
        window.parent.Environment?.branchID ||
        "1201";
      const operatorId =
        session?.operatorID ||
        session?.OperatorID ||
        window.parent.Environment?.OperatorID ||
        "JOY_WANJA";

      const currentMapping = (state.glMappings || []).find((row) => String(row.AccountTagID) === tagId) || {};
      
      // Compute UpdateCount from ALL loaded mappings (max value)
      const updateCounts = (state.glMappings || [])
        .map((row) => {
          const uc = row?.UpdateCount;
          return uc != null && !Number.isNaN(Number(uc)) ? Number(uc) : 0;
        })
        .filter((n) => n > 0);
      
      const updateCount = updateCounts.length > 0 ? Math.max(...updateCounts) : 0;

      // DetailRecords XML: send ALL current mappings in dt_Accounts format
      // Format: <dt_Accounts><AccountTagID>...</AccountTagID><AccountID>...</AccountID><ButtonMark>N</ButtonMark><TempID>0</TempID></dt_Accounts>
      // ButtonMark: 'N' = Normal/Existing with AccountID, 'R' = Remove (no AccountID)
      const rows = Array.isArray(state.glMappings) && state.glMappings.length
        ? state.glMappings
        : [{ AccountTagID: tagId, AccountID: accountId }];

      const detailXmlRows = rows
        .map((row, index) => {
          const rTag = row?.AccountTagID != null ? String(row.AccountTagID) : "";
          const rAcc = row?.AccountID != null ? String(row.AccountID).trim() : "";
          if (!rTag) return "";
          
          const parts = [`<AccountTagID>${escapeXml(rTag)}</AccountTagID>`];
          
          // Only include records that have an AccountID
          if (!rAcc) {
            return ""; // Skip records without AccountID
          }
          
          parts.push(`<AccountID>${escapeXml(rAcc)}</AccountID>`);
          parts.push(`<ButtonMark>N</ButtonMark>`);
          parts.push(`<TempID>${index}</TempID>`);
          
          return `<dt_Accounts>${parts.join('')}</dt_Accounts>`;
        })
        .filter(Boolean)
        .join("");

      const detailRecords = detailXmlRows;

      const requestData = {
        BankID: bankId,
        RelevantID: productId,
        ModuleID: 2507,
        OperatedBy: 'JOY_WANJA',
        // UpdateCount: updateCount || null,
        UpdateCount: 0,
        OperatedOn: updateCount ? formatLegacyDateTime() : null,
        SupervisedBy: null,
        DetailRecords: detailRecords,
      };

      console.log("[ProductGLInterface] addEditGLInterface RequestData", requestData, "DetailRecords XML:", detailRecords);

      try {
        const response = await window.parent.ProductLgLcService.addEditGLInterface(requestData);
        console.log("[ProductGLInterface] addEditGLInterface response", response);

        if (!response?.success) {
          const message = response?.message || "Failed to save GL Interface.";
          await uiAlert(message, { title: "Save Failed", variant: "danger" });
          setToast("Save failed.", "danger");
          return;
        }

        setToast("GL Interface saved.", "success");
        pushRecentAccount();

        // Refresh from server to pick up updated mappings and audit fields
        await fetchGLInterface();
        setMode(MODES.VIEW);
      } catch (err) {
        console.error("[ProductGLInterface] Save failed:", err);
        await uiAlert(`Error saving GL Interface: ${err.message || err}`, {
          title: "Error",
          variant: "danger",
        });
        setToast("Save failed.", "danger");
      }
    });

    qs('[data-pgi-action="cancel"]')?.addEventListener("click", () => {
      setToast("Cancelled.", "info");
      setMode(MODES.VIEW);
    });

    qs('[data-pgi-action="delete"]')?.addEventListener("click", async () => {
      console.log("[ProductGLInterface] Delete button clicked", { mode: state.mode });

      if (!window.parent || window.parent === window) {
        console.warn("[ProductGLInterface] No parent window detected; delete is only supported from within Product Maintenance iframe.");
        await uiAlert("Delete is only available when opened from Product Maintenance.", {
          title: "Delete Unavailable",
          variant: "danger",
        });
        return;
      }

      const confirmed = await uiConfirm(
        "Are you sure you want to delete all GL Interface mappings for this product?",
        { title: "Confirm Delete", variant: "danger" }
      );
      if (!confirmed) return;

      const parentProductField = window.parent.document?.getElementById("Product");
      const productId = parentProductField ? extractId(parentProductField.value) : "";
      if (!productId) {
        console.warn("[ProductGLInterface] No ProductID found on parent page; aborting delete.");
        await uiAlert("No product selected in parent page. Please view a product first.", {
          title: "No Product",
          variant: "warning",
        });
        setToast("No product selected.", "warning");
        return;
      }

      if (!window.parent.ServiceLoader?.loadProductLgLcService) {
        console.error("[ProductGLInterface] ServiceLoader.loadProductLgLcService not available on parent.");
        await uiAlert("Service loader is not available.", { title: "Error", variant: "danger" });
        return;
      }

      setToast("Deleting GL Interface...", "danger");

      await window.parent.ServiceLoader.loadProductLgLcService();
      if (!window.parent.ProductLgLcService?.deleteGLInterface) {
        console.error("[ProductGLInterface] ProductLgLcService.deleteGLInterface is not available on parent.");
        await uiAlert("ProductLgLcService.deleteGLInterface is not available.", {
          title: "Error",
          variant: "danger",
        });
        return;
      }

      const session = window.parent.AuthService?.getSession?.() || null;
      const bankId =
        session?.bankID ||
        session?.BankID ||
        window.parent.Environment?.BankID ||
        window.parent.Environment?.bankID ||
        "00";

      const firstMapping =
        Array.isArray(state.glMappings) && state.glMappings.length ? state.glMappings[0] : null;
      const updateCountRaw = firstMapping?.UpdateCount;
      const updateCount =
        updateCountRaw != null && !Number.isNaN(Number(updateCountRaw)) ? Number(updateCountRaw) : 0;

      const requestData = {
        BankID: '00',
        RelevantID: productId,
        ModuleID: 2507,
        UpdateCount: '1',
      };

      console.log("[ProductGLInterface] deleteGLInterface RequestData", requestData);

      try {
        const response = await window.parent.ProductLgLcService.deleteGLInterface(requestData);
        console.log("[ProductGLInterface] deleteGLInterface response", response);

        if (!response?.success) {
          const message = response?.message || "Failed to delete GL Interface.";
          await uiAlert(message, { title: "Delete Failed", variant: "danger" });
          setToast("Delete failed.", "danger");
          return;
        }

        setToast("GL Interface deleted.", "success");

        // Clear local state and UI after successful delete
        state.glMappings = [];
        renderGlMappingsTable(state.glMappings, state.tagLookup);

        const glTagSelect = qs("#GlAccountTag");
        const glAccountIdInput = qs("#GlAccountId");
        if (glTagSelect) glTagSelect.value = "";
        if (glAccountIdInput) glAccountIdInput.value = "";
        applyAuditFields({});

        setMode(MODES.VIEW);
      } catch (err) {
        console.error("[ProductGLInterface] Delete failed:", err);
        await uiAlert(`Error deleting GL Interface: ${err.message || err}` , {
          title: "Error",
          variant: "danger",
        });
        setToast("Delete failed.", "danger");
      }
    });

    const alterBtn = qs('[data-pgi-action="alter"]');
    const removeBtn = qs('[data-pgi-action="remove"]');
    const updateRowBtn = qs('[data-pgi-action="update-row"]');
    const clearBtn = qs('[data-pgi-action="clear"]');

    alterBtn?.addEventListener("click", () => {
      console.log("[ProductGLInterface] Alter clicked", { mode: state.mode, selectedTagId: state.selectedTagId });
      if (state.mode === MODES.VIEW) {
        setToast("Click Edit first before altering.", "warning");
        return;
      }

      const glTagSelect = qs("#GlAccountTag");
      // Prefer a row the user clicked; fall back to current dropdown selection
      const tagId = (state.selectedTagId || glTagSelect?.value || "").trim();
      if (!tagId) {
        setToast("Select an Account Tag to alter.", "warning");
        return;
      }

      const mapping = (state.glMappings || []).find((row) => String(row.AccountTagID) === tagId) || null;
      const glAccountIdInput = qs("#GlAccountId");

      if (mapping) {
        if (glAccountIdInput) glAccountIdInput.value = mapping.AccountID || "";
        applyAuditFields(mapping);
      } else if (glAccountIdInput) {
        glAccountIdInput.value = "";
        applyAuditFields({});
      }

      state.editingTagId = tagId;

      if (updateRowBtn) {
        updateRowBtn.disabled = false;
        updateRowBtn.classList.add("btn-primary");
      }
      if (alterBtn) alterBtn.classList.remove("btn-primary");
      setToast("Update the Account ID then click Update.", "info");
    });

    updateRowBtn?.addEventListener("click", () => {
      console.log("[ProductGLInterface] Update-row clicked", { mode: state.mode, editingTagId: state.editingTagId });
      if (state.mode === MODES.VIEW) {
        setToast("Click Edit first before updating.", "warning");
        return;
      }

      const editingTagId = state.editingTagId || (qs("#GlAccountTag")?.value || "").trim();
      if (!editingTagId) {
        setToast("Click Alter on a tag before updating.", "warning");
        return;
      }

      const glAccountIdInput = qs("#GlAccountId");
      const accountId = (glAccountIdInput?.value || "").trim();
      if (!accountId) {
        setToast("Enter an Account ID before updating.", "warning");
        return;
      }

      const mappings = Array.isArray(state.glMappings) ? [...state.glMappings] : [];
      const idx = mappings.findIndex((row) => String(row.AccountTagID) === editingTagId);
      if (idx >= 0) {
        mappings[idx] = { ...mappings[idx], AccountID: accountId };
      } else {
        mappings.push({ AccountTagID: editingTagId, AccountID: accountId });
      }

      state.glMappings = mappings;
      renderGlMappingsTable(state.glMappings, state.tagLookup);

      // After updating a row, go back to idle row-edit state
      state.editingTagId = undefined;
      if (updateRowBtn) {
        updateRowBtn.disabled = true;
        updateRowBtn.classList.remove("btn-primary");
      }
      if (alterBtn) alterBtn.classList.add("btn-primary");

      setToast("Row updated. Click Save to commit.", "success");
    });

    removeBtn?.addEventListener("click", () => {
      if (state.mode === MODES.VIEW) {
        setToast("Click Edit first before removing.", "warning");
        return;
      }

      const glTagSelect = qs("#GlAccountTag");
      const tagId = (glTagSelect?.value || "").trim();
      if (!tagId) {
        setToast("Select an Account Tag to remove.", "warning");
        return;
      }

      const mappings = Array.isArray(state.glMappings) ? [...state.glMappings] : [];
      const idx = mappings.findIndex((row) => String(row.AccountTagID) === tagId);
      if (idx >= 0) {
        mappings.splice(idx, 1);
        state.glMappings = mappings;
        renderGlMappingsTable(state.glMappings, state.tagLookup);
        setToast("Row removed (pending Save).", "info");
      } else {
        setToast("No row found for selected tag.", "warning");
      }
    });

    clearBtn?.addEventListener("click", () => {
      const glAccountIdInput = qs("#GlAccountId");
      if (glAccountIdInput) glAccountIdInput.value = "";
      applyAuditFields({});
      state.editingTagId = undefined;
      setToast("Editor cleared.", "info");
    });

    // Wire up GL Account search button
    qsa('[data-pgi-search="account"]').forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!window.GLAccountSearchService) {
          console.error('[ProductGLInterface] GLAccountSearchService not loaded');
          await uiAlert('GL Account search service not available. Please ensure glAccountSearchService.js is loaded.', { 
            title: 'Error', 
            variant: 'danger' 
          });
          return;
        }

        const glTagSelect = qs("#GlAccountTag");
        const glAccountIdInput = qs("#GlAccountId");
        const selectedTag = glTagSelect?.selectedOptions?.[0]?.textContent?.trim() || '';

        await window.GLAccountSearchService.openSearchModal((accountId, accountName) => {
          if (glAccountIdInput) {
            glAccountIdInput.value = accountId;
          }
          setToast(`Selected: ${accountId}`, "success");
        }, { accountTag: selectedTag });
      });
    });

    qs('[data-pgi-action="search-account"]')?.addEventListener("click", () => {
      setToast("Account search opened (stub).", "info");
      pushRecentAccount();
    });
    qs('[data-pgi-action="account-tools"]')?.addEventListener("click", () => setToast("Account tools opened (stub).", "info"));

    qs('[data-pgi-action="back"]')?.addEventListener("click", () => {
      window.location.href = "product-maintenance-treasury.html";
    });

    const glTagSelect = qs("#GlAccountTag");
    if (glTagSelect) {
      glTagSelect.addEventListener("change", () => {
        const tagId = glTagSelect.value;
        const mapping = (state.glMappings || []).find((row) => String(row.AccountTagID) === tagId);
        const glAccountIdInput = qs("#GlAccountId");

        if (mapping) {
          if (glAccountIdInput) glAccountIdInput.value = mapping.AccountID || "";
          applyAuditFields(mapping);
        } else {
          if (glAccountIdInput) glAccountIdInput.value = "";
          applyAuditFields({});
        }
      });
    }

    const accountIdField = qs("#AccountId");
    const accountTagField = qs("#AccountTag");
    [accountIdField, accountTagField].filter(Boolean).forEach((el) => {
      el.addEventListener("blur", pushRecentAccount);
      el.addEventListener("change", pushRecentAccount);
    });
  }

  window.addEventListener("load", () => {
    bindModeButtons();
    bindLeftNav();
    bindActions();
    renderRecent();
    setMode(MODES.VIEW);
    
    // Auto-load GL Interface data from parent page's Product ID
    if (window.parent && window.parent !== window) {
      fetchGLInterface();
    }
  });
})();
