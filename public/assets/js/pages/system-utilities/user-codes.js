(() => {
  if (window.__kairoUserCodesLoaded) return;
  window.__kairoUserCodesLoaded = true;

  const MODES = {
    VIEW: "View",
    ADD: "Add",
    UPDATE: "Update",
  };

  const state = {
    mode: MODES.VIEW,
    hasLoadedUserCode: false,
    canAddFromCurrentId: false,
    moduleOptionsPromise: null,
    detailRows: [],
    selectedDetailIndex: -1,
  };

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function setToast(message, variant = "info") {
    const toast = qs("#ucToast");
    if (!toast) return;
    toast.classList.remove("d-none", "alert-success", "alert-danger", "alert-warning", "alert-info");
    toast.classList.add(`alert-${variant}`);
    toast.textContent = message;
    window.setTimeout(() => toast.classList.add("d-none"), 2200);
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

  function getOperatorId() {
    try {
      const session = window.AuthService?.getSession?.();
      return session?.operatorId || session?.operatorID || session?.name || "web_portal";
    } catch {
      return "web_portal";
    }
  }

  function getBranchId() {
    try {
      const session = window.AuthService?.getSession?.();
      return session?.branchId || session?.branchID || session?.ourBranchId || session?.ourBranchID || "";
    } catch {
      return "";
    }
  }

  function setSelectValue(selectEl, value) {
    if (!selectEl) return;
    const v = value == null ? "" : String(value);
    const normalized = v.trim().toLowerCase();
    const match = Array.from(selectEl.options).find((o) => {
      const valueNorm = String(o.value).trim().toLowerCase();
      const labelNorm = String(o.textContent || "").trim().toLowerCase();

      if (valueNorm === normalized || labelNorm === normalized) return true;

      const aliasesRaw = o.getAttribute("data-aliases") || "";
      const aliases = aliasesRaw
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      return aliases.includes(normalized);
    });
    if (match) {
      selectEl.value = match.value;
      return;
    }

    // Do not inject new options at runtime — dropdown values must come from the HTML.
    if (normalized) {
      console.warn(`[UserCodes] ModuleId value '${v}' not found in dropdown options.`);
    }
  }

  function clearGrid() {
    const tbody = qs(".uc-grid tbody");
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="3" class="uc-no-records">No records to display.</td></tr>';
  }

  function normKey(s) {
    return String(s ?? "")
      .trim()
      .toLowerCase()
      .replace(/[_\-\s]+/g, "");
  }

  function isMetaOnlyObject(obj) {
    if (!obj || typeof obj !== "object") return false;
    const keys = Object.keys(obj).map(normKey);
    const hasMetaKeys = keys.some((k) => k === "eventid" || k === "updatecount" || k === "newdata" || k === "operatorid");
    const hasBusinessKeys = keys.some((k) => k.includes("subcode") || k.includes("description") || k.includes("module") || k === "id" || k.includes("usercode"));
    return hasMetaKeys && !hasBusinessKeys;
  }

  function isEmptyDetailRow(obj) {
    if (!obj || typeof obj !== "object") return true;
    const sub = obj.SubCodeID ?? obj.SubCodeId ?? obj.SubCode ?? obj.ID ?? obj.Code ?? "";
    const desc = obj.Description ?? obj.SubDescription ?? obj.Desc ?? "";
    return !String(sub ?? "").trim() && !String(desc ?? "").trim();
  }

  function escapeXml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function buildDetailRecordsXml(rows) {
    const list = (Array.isArray(rows) ? rows : []).filter((r) => !isEmptyDetailRow(r));
    if (!list.length) return "<NewDataSet />";

    const items = list.map((r) => {
      const row = r && typeof r === "object" ? r : {};
      const subCodeId = row.SubCodeID ?? row.SubCodeId ?? row.SubCode ?? row.ID ?? row.Code ?? "";
      const desc = row.Description ?? row.SubDescription ?? row.Desc ?? "";
      const isDefaultRaw = row.IsDefault ?? row.IsDefaultFlag ?? row.DefaultFlag ?? row.Default ?? false;
      const isDefault = isDefaultRaw === true || String(isDefaultRaw).trim().toLowerCase() === "1" || String(isDefaultRaw).trim().toLowerCase() === "true";

      return (
        "<Table1>" +
        `<SubCodeID>${escapeXml(subCodeId)}</SubCodeID>` +
        `<Description>${escapeXml(desc)}</Description>` +
        `<IsDefault>${isDefault ? 1 : 0}</IsDefault>` +
        "</Table1>"
      );
    }).join("");

    return `<NewDataSet>${items}</NewDataSet>`;
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function formatMDY(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    return `${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}/${date.getFullYear()}`;
  }

  function formatMDYHMS(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    return `${formatMDY(date)} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
  }

  function clearDetailEditor() {
    const subId = qs("#SubCodeId");
    const subDesc = qs("#SubDescription");
    const isDefault = qs("#IsDefault");
    if (subId) subId.value = "";
    if (subDesc) subDesc.value = "";
    if (isDefault) isDefault.checked = false;
    state.selectedDetailIndex = -1;
    updateGridToolbarState();
  }

  function coerceDetailRow(raw) {
    const row = raw && typeof raw === "object" ? raw : {};
    const subCodeId = (row.SubCodeID ?? row.SubCodeId ?? row.SubCode ?? row.ID ?? row.Code ?? "").toString();
    const desc = (row.Description ?? row.SubDescription ?? row.Desc ?? "").toString();
    const isDefaultRaw = row.IsDefault ?? row.IsDefaultFlag ?? row.DefaultFlag ?? row.Default ?? false;
    const isDefault = isDefaultRaw === true || String(isDefaultRaw).trim().toLowerCase() === "1" || String(isDefaultRaw).trim().toLowerCase() === "true";
    return { SubCodeID: subCodeId, Description: desc, IsDefault: isDefault };
  }

  function renderGridRows(rows) {
    const tbody = qs(".uc-grid tbody");
    if (!tbody) return;

    const list = (Array.isArray(rows) ? rows : []).filter((r) => !isEmptyDetailRow(r) && !isMetaOnlyObject(r));
    if (!list.length) {
      clearGrid();
      return;
    }

    const html = list.map((r, index) => {
      const row = coerceDetailRow(r);
      const isSelected = index === state.selectedDetailIndex;
      return `
        <tr data-uc-row-index="${index}" style="${isSelected ? "outline: 2px solid rgba(13,110,253,.35);" : ""}">
          <td>${escapeXml(row.SubCodeID)}</td>
          <td>${escapeXml(row.Description)}</td>
          <td>${row.IsDefault ? "true" : "false"}</td>
        </tr>`;
    }).join("");

    tbody.innerHTML = html;
  }

  function applyDataToForm(data) {
    if (!data || typeof data !== "object") return;

    function pickValue(obj, preferredKeys = [], keyFragments = []) {
      if (!obj || typeof obj !== "object") return undefined;

      for (const k of preferredKeys) {
        if (Object.prototype.hasOwnProperty.call(obj, k)) return obj[k];
      }

      const fragments = keyFragments.map(normKey).filter(Boolean);
      if (!fragments.length) return undefined;

      for (const [k, v] of Object.entries(obj)) {
        const nk = normKey(k);
        if (!nk) continue;
        if (fragments.some((f) => nk.includes(f))) return v;
      }
      return undefined;
    }

    // Prefer keys that match element IDs.
    for (const [key, value] of Object.entries(data)) {
      const el = document.getElementById(key);
      if (!el) continue;
      if (el.tagName === "SELECT") {
        setSelectValue(el, value);
        continue;
      }
      if (el.type === "checkbox") {
        const s = String(value ?? "").trim().toLowerCase();
        el.checked = s === "1" || s === "true" || s === "y" || s === "yes";
        continue;
      }
      el.value = value == null ? "" : String(value);
    }

    // Common fallback mappings when keys don't match element IDs (handles spaces / different naming).
    const id = pickValue(
      data,
      ["UserCodeId", "UserCodeID", "UserCode", "ID", "Id", "CodeID", "CodeId"],
      ["usercodeid", "usercode", "codeid", "id"]
    );
    const description = pickValue(
      data,
      ["Description", "UserCodeDesc", "UserCodeDescription", "Desc"],
      ["description", "desc"]
    );
    const remarks = pickValue(
      data,
      ["Remarks", "Remark", "Note"],
      ["remarks", "remark", "note"]
    );
    const moduleId = pickValue(
      data,
      ["ModuleId", "ModuleID", "Module", "ModuleCode", "ModuleName"],
      ["moduleid", "module", "modulename"]
    );

    const createdBy = pickValue(data, ["CreatedBy", "CreatedUser", "Maker"], ["createdby", "maker"]);
    const createdOn = pickValue(data, ["CreatedOn", "CreatedDate", "MakerDate"], ["createdon", "createddate", "makerdate"]);
    const modifiedBy = pickValue(data, ["ModifiedBy", "ModifiedUser", "Checker"], ["modifiedby", "checker"]);
    const modifiedOn = pickValue(data, ["ModifiedOn", "ModifiedDate", "CheckerDate"], ["modifiedon", "modifieddate", "checkerdate"]);
    const supervisedBy = pickValue(data, ["SupervisedBy", "SupervisedUser"], ["supervisedby"]);
    const supervisedOn = pickValue(data, ["SupervisedOn", "SupervisedDate"], ["supervisedon", "superviseddate"]);

    if (id != null) qs("#UserCodeId") && (qs("#UserCodeId").value = String(id));
    if (description != null) qs("#Description") && (qs("#Description").value = String(description));
    if (remarks != null) qs("#Remarks") && (qs("#Remarks").value = String(remarks));
    if (moduleId != null) setSelectValue(qs("#ModuleId"), moduleId);

    if (createdBy != null) qs("#CreatedBy") && (qs("#CreatedBy").value = String(createdBy));
    if (createdOn != null) qs("#CreatedOn") && (qs("#CreatedOn").value = String(createdOn));
    if (modifiedBy != null) qs("#ModifiedBy") && (qs("#ModifiedBy").value = String(modifiedBy));
    if (modifiedOn != null) qs("#ModifiedOn") && (qs("#ModifiedOn").value = String(modifiedOn));
    if (supervisedBy != null) qs("#SupervisedBy") && (qs("#SupervisedBy").value = String(supervisedBy));
    if (supervisedOn != null) qs("#SupervisedOn") && (qs("#SupervisedOn").value = String(supervisedOn));
  }

  function clearFormAll() {
    const form = qs("#uc-form");
    if (!form) return;
    qsa("input, select, textarea", form).forEach((el) => {
      if (el.type === "checkbox") {
        el.checked = false;
        return;
      }
      if (el.tagName === "SELECT") {
        el.value = "";
        return;
      }
      el.value = "";
    });
    clearGrid();
    state.detailRows = [];
    state.selectedDetailIndex = -1;
    state.hasLoadedUserCode = false;
    state.canAddFromCurrentId = false;
  }

  function clearFormForAdd() {
    const form = qs("#uc-form");
    if (!form) return;
    const keepId = qs("#UserCodeId")?.value || "";
    qsa("input, select, textarea", form).forEach((el) => {
      if (el.hasAttribute("data-always-enabled")) {
        if (el.id === "UserCodeId" || el.name === "UserCodeId") el.value = keepId;
        return;
      }
      if (el.type === "checkbox") {
        el.checked = false;
        return;
      }
      if (el.tagName === "SELECT") {
        el.value = "";
        return;
      }
      el.value = "";
    });
    clearGrid();
    state.detailRows = [];
    state.selectedDetailIndex = -1;
    state.hasLoadedUserCode = false;
    state.canAddFromCurrentId = !!keepId;
  }

  function getActionButtons() {
    return {
      view: qs('[data-shell-mode="View"]'),
      add: qs('[data-shell-mode="Add"]'),
      edit: qs('[data-shell-mode="Update"]'),
      save: qs('[data-uc-action="save"]'),
      cancel: qs('[data-uc-action="cancel"]'),
    };
  }

  function setMode(nextMode) {
    state.mode = nextMode;

    const pill = qs("[data-page-function-pill]");
    if (pill) pill.textContent = `Mode · ${nextMode}`;

    const form = qs("#uc-form");
    if (!form) return;

    const isEditable = nextMode === MODES.ADD || nextMode === MODES.UPDATE;

    // Entering Edit should start with no selected detail row.
    if (nextMode === MODES.UPDATE) {
      state.selectedDetailIndex = -1;
      const subId = qs("#SubCodeId");
      const subDesc = qs("#SubDescription");
      const isDefault = qs("#IsDefault");
      if (subId) subId.value = "";
      if (subDesc) subDesc.value = "";
      if (isDefault) isDefault.checked = false;
      renderGridRows(state.detailRows);
    }

    // Inputs: editable only in Add/Edit, except always-enabled fields.
    qsa("input, select, textarea", form).forEach((el) => {
      if (el.hasAttribute("data-always-enabled")) {
        el.disabled = false;
        return;
      }
      el.disabled = !isEditable;
    });

    // Search icon remains enabled.
    qsa("button[data-always-enabled]", form).forEach((btn) => (btn.disabled = false));

    // Action buttons gating.
    const { view, add, edit, save, cancel } = getActionButtons();
    setButtonDisabled(view, false);

    const currentId = qs("#UserCodeId")?.value?.trim() || "";
    // Add becomes available when an ID is present and we're not currently on a loaded record.
    const canAddNow = !!currentId && !state.hasLoadedUserCode;
    setButtonDisabled(add, !(canAddNow || isEditable || nextMode === MODES.ADD));

    setButtonDisabled(edit, !state.hasLoadedUserCode);
    setButtonDisabled(save, !isEditable);

    // Cancel enabled when editing OR after load/not-found to clear.
    const canCancelInView = state.hasLoadedUserCode || state.canAddFromCurrentId;
    setButtonDisabled(cancel, !(isEditable || canCancelInView));

    updateGridToolbarState();
  }

  function updateGridToolbarState() {
    const form = qs("#uc-form");
    if (!form) return;

    const gridNew = form.querySelector('[data-uc-grid="new"]');
    const gridAlter = form.querySelector('[data-uc-grid="alter"]');
    const gridRemove = form.querySelector('[data-uc-grid="remove"]');
    const gridUpdate = form.querySelector('[data-uc-grid="update"]');
    const gridClear = form.querySelector('[data-uc-grid="clear"]');

    const setGridBtn = (btn, enabled) => setButtonDisabled(btn, !enabled);

    const isAddMode = state.mode === MODES.ADD;
    const isEditMode = state.mode === MODES.UPDATE;
    const hasSelection = state.selectedDetailIndex >= 0 && state.selectedDetailIndex < state.detailRows.length;

    // View: all disabled.
    if (!isAddMode && !isEditMode) {
      setGridBtn(gridNew, false);
      setGridBtn(gridAlter, false);
      setGridBtn(gridRemove, false);
      setGridBtn(gridUpdate, false);
      setGridBtn(gridClear, false);
      return;
    }

    // Add: user builds detail rows via Update + Clear.
    if (isAddMode) {
      setGridBtn(gridNew, false);
      setGridBtn(gridAlter, false);
      setGridBtn(gridRemove, false);
      setGridBtn(gridUpdate, true);
      setGridBtn(gridClear, true);
      return;
    }

    // Edit(Update):
    // - When editing starts (no row selected): New/Alter/Remove enabled.
    // - Once a row is selected: Update/Clear enabled.
    if (!hasSelection) {
      setGridBtn(gridNew, true);
      setGridBtn(gridAlter, true);
      setGridBtn(gridRemove, true);
      setGridBtn(gridUpdate, false);
      setGridBtn(gridClear, false);
      return;
    }

    setGridBtn(gridNew, false);
    setGridBtn(gridAlter, false);
    setGridBtn(gridRemove, false);
    setGridBtn(gridUpdate, true);
    setGridBtn(gridClear, true);
  }

  function bindGridRowSelection() {
    const tbody = qs(".uc-grid tbody");
    if (!tbody) return;
    tbody.addEventListener("click", (e) => {
      const tr = e.target?.closest?.("tr[data-uc-row-index]");
      if (!tr) return;
      const index = Number(tr.getAttribute("data-uc-row-index"));
      if (!Number.isFinite(index)) return;
      state.selectedDetailIndex = index;
      const row = state.detailRows[index];
      const coerced = coerceDetailRow(row);
      const subId = qs("#SubCodeId");
      const subDesc = qs("#SubDescription");
      const isDefault = qs("#IsDefault");
      if (subId) subId.value = coerced.SubCodeID;
      if (subDesc) subDesc.value = coerced.Description;
      if (isDefault) isDefault.checked = !!coerced.IsDefault;
      renderGridRows(state.detailRows);
      updateGridToolbarState();
    });
  }

  function bindGridToolbar() {
    const form = qs("#uc-form");
    if (!form) return;

    const getEditorRow = () => {
      const subCodeId = qs("#SubCodeId")?.value?.trim() || "";
      const desc = qs("#SubDescription")?.value?.trim() || "";
      const isDefault = !!qs("#IsDefault")?.checked;
      return { SubCodeID: subCodeId, Description: desc, IsDefault: isDefault };
    };

    form.querySelector('[data-uc-grid="new"]')?.addEventListener("click", () => {
      const row = getEditorRow();
      if (!row.SubCodeID) {
        setToast("Enter Sub Code ID.", "warning");
        return;
      }
      if (row.IsDefault) {
        state.detailRows = state.detailRows.map((r) => ({ ...coerceDetailRow(r), IsDefault: false }));
      }
      state.detailRows = [...state.detailRows, row];
      clearDetailEditor();
      renderGridRows(state.detailRows);
    });

    const updateSelected = () => {
      const row = getEditorRow();
      if (!row.SubCodeID) {
        setToast("Enter Sub Code ID.", "warning");
        return;
      }

      const hasSelection = state.selectedDetailIndex >= 0 && state.selectedDetailIndex < state.detailRows.length;
      const isAddMode = state.mode === MODES.ADD;

      // In Add mode, Update acts like "Add Row" when nothing is selected.
      if (!hasSelection && isAddMode) {
        if (row.IsDefault) {
          state.detailRows = state.detailRows.map((r) => ({ ...coerceDetailRow(r), IsDefault: false }));
        }
        state.detailRows = [...state.detailRows, row];
        clearDetailEditor();
        renderGridRows(state.detailRows);
        setToast("Row added.", "success");
        return;
      }

      if (!hasSelection) {
        setToast("Select a grid row first.", "warning");
        return;
      }

      if (row.IsDefault) {
        state.detailRows = state.detailRows.map((r, i) => ({ ...coerceDetailRow(r), IsDefault: i === state.selectedDetailIndex }));
      }
      state.detailRows[state.selectedDetailIndex] = row;
      renderGridRows(state.detailRows);
      setToast("Row updated.", "success");
    };

    form.querySelector('[data-uc-grid="alter"]')?.addEventListener("click", updateSelected);
    form.querySelector('[data-uc-grid="update"]')?.addEventListener("click", updateSelected);

    form.querySelector('[data-uc-grid="remove"]')?.addEventListener("click", () => {
      if (state.selectedDetailIndex < 0 || state.selectedDetailIndex >= state.detailRows.length) {
        setToast("Select a grid row first.", "warning");
        return;
      }
      state.detailRows.splice(state.selectedDetailIndex, 1);
      clearDetailEditor();
      renderGridRows(state.detailRows);
    });

    form.querySelector('[data-uc-grid="clear"]')?.addEventListener("click", () => {
      clearDetailEditor();
      renderGridRows(state.detailRows);
    });
  }

  async function handleSave() {
    if (state.mode === MODES.VIEW) {
      setToast("Switch to Add/Edit before saving.", "warning");
      return;
    }

    const id = qs("#UserCodeId")?.value?.trim() || "";
    if (!id) {
      setToast("Enter ID.", "warning");
      return;
    }

    const description = qs("#Description")?.value?.trim() || "";
    if (!description) {
      setToast("Enter Description.", "warning");
      return;
    }

    await ensureModuleOptionsLoaded();
    const moduleId = qs("#ModuleId")?.value?.trim() || "";
    if (!moduleId) {
      setToast("Select Module ID.", "warning");
      return;
    }

    const now = new Date();
    const operatorId = getOperatorId();
    const createdByExisting = qs("#CreatedBy")?.value?.trim() || "";
    const createdOnExisting = qs("#CreatedOn")?.value?.trim() || "";
    const supervisedOnExisting = qs("#SupervisedOn")?.value?.trim() || "";

    // Defensive validation: prevent duplicate SubCode IDs and multiple defaults.
    const normalizedRows = (Array.isArray(state.detailRows) ? state.detailRows : []).map(coerceDetailRow).filter((r) => !isEmptyDetailRow(r));
    const seen = new Set();
    for (const r of normalizedRows) {
      const key = String(r.SubCodeID || "").trim().toLowerCase();
      if (!key) continue;
      if (seen.has(key)) {
        setToast(`Duplicate Sub Code ID: ${r.SubCodeID}`, "warning");
        return;
      }
      seen.add(key);
    }
    const defaultCount = normalizedRows.filter((r) => !!r.IsDefault).length;
    if (defaultCount > 1) {
      setToast("Only one Sub Code can be default.", "warning");
      return;
    }

    const requestData = {
      OurBranchID: getBranchId(),
      OperatorID: operatorId,
      ID: id,
      Description: description,
      Remarks: qs("#Remarks")?.value?.trim() || "",
      CreatedBy: state.mode === MODES.ADD ? (createdByExisting || operatorId) : (createdByExisting || operatorId),
      CreatedOn: state.mode === MODES.ADD ? (createdOnExisting || formatMDYHMS(now)) : (createdOnExisting || formatMDYHMS(now)),
      ModifiedBy: operatorId,
      ModifiedOn: formatMDYHMS(now),
      SupervisedBy: qs("#SupervisedBy")?.value?.trim() || "",
      SupervisedOn: supervisedOnExisting,
      NewRecord: state.mode === MODES.ADD ? 1 : 0,
      ModuleID: moduleId,
      DetailRecords: buildDetailRecordsXml(state.detailRows),
    };

    console.groupCollapsed("[UserCodes] dbo.p_AddEditUserCodes");
    console.info("RequestData", requestData);

    try {
      await ensureServiceLoaded();
      const result = await window.SystemUtilitiesService.addEditUserCodes(requestData);
      console.info("Raw result", result);

      if (!result?.success) {
        setToast(result?.message || "Save failed.", "danger");
        console.groupEnd();
        return;
      }

      setToast("Saved.", "success");
      state.hasLoadedUserCode = true;
      state.canAddFromCurrentId = false;
      setMode(MODES.VIEW);
      console.groupEnd();

      // Reload record from DB to reflect server-side changes (audit fields, normalized values).
      try {
        await handleSearchOrView({ quiet: true });
      } catch (reloadErr) {
        console.warn("[UserCodes] Saved but failed to reload", reloadErr);
      }
    } catch (e) {
      console.error(e);
      setToast(e?.message || "Save failed.", "danger");
      console.groupEnd();
    }
  }

  function bindModeButtons() {
    qsa("[data-shell-mode]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const next = btn.getAttribute("data-shell-mode");
        if (!next || !MODES[next.toUpperCase()]) return;

        // Entering Add should clear non-ID fields and preserve ID.
        if (MODES[next.toUpperCase()] === MODES.ADD) {
          const id = qs("#UserCodeId")?.value?.trim() || "";
          if (!id) {
            setToast("Enter an ID first.", "warning");
            return;
          }

          // Only allow Add if the ID does not already exist.
          try {
            await ensureServiceLoaded();
            await ensureModuleOptionsLoaded();
            const requestData = {
              OurBranchID: getBranchId(),
              ID: id,
              OperatorID: getOperatorId(),
            };

            const result = await window.SystemUtilitiesService.getUserCodes(requestData);
            if (result?.success) {
              const { header, rows } = extractHeaderAndRows(result.data);
              const hasAny = !!header || (Array.isArray(rows) && rows.length > 0);
              if (hasAny) {
                if (header) applyDataToForm(header);
                state.detailRows = Array.isArray(rows) ? rows : [];
                renderGridRows(state.detailRows);
                state.hasLoadedUserCode = true;
                state.canAddFromCurrentId = false;
                setMode(MODES.VIEW);
                setToast("This ID already exists. Loaded in View.", "warning");
                return;
              }
            }
          } catch (e) {
            console.warn(e);
            // If the check fails, don't block the user from proceeding.
          }

          clearFormForAdd();
          setMode(MODES.ADD);
          return;
        }

        if (MODES[next.toUpperCase()] === MODES.UPDATE) {
          if (!state.hasLoadedUserCode) {
            setToast("Load a record first (View/Search) before editing.", "warning");
            return;
          }
          setMode(MODES.UPDATE);
          return;
        }

        if (MODES[next.toUpperCase()] === MODES.VIEW) {
          setMode(MODES.VIEW);
          return;
        }
      });
    });
  }

  function bindIdWatcher() {
    const input = qs("#UserCodeId");
    if (!input) return;
    input.addEventListener("input", () => {
      // When ID changes in View mode, clear any stale loaded data.
      if (state.mode !== MODES.VIEW) return;
      clearFormForAdd();
      setMode(MODES.VIEW);
    });
  }

  async function ensureServiceLoaded() {
    if (!window.ServiceLoader) throw new Error("ServiceLoader missing");
    await window.ServiceLoader.loadSystemUtilitiesService();
    if (!window.SystemUtilitiesService?.getUserCodes) {
      throw new Error("SystemUtilitiesService is not available");
    }
  }

  function mapSystemCodeOptions(rows) {
    const list = Array.isArray(rows) ? rows : (rows ? [rows] : []);
    return list
      .map((row) => ({
        value: row?.SubCodeID ?? row?.SubCodeId ?? row?.Value ?? row?.value ?? "",
        label: row?.CodeDescription ?? row?.Description ?? row?.Label ?? row?.label ?? "",
        order: row?.DisplayOrder ?? row?.order ?? 0,
      }))
      .filter((o) => o.value || o.label)
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  }

  async function ensureModuleOptionsLoaded() {
    if (state.moduleOptionsPromise) return state.moduleOptionsPromise;

    state.moduleOptionsPromise = (async () => {
      const selectEl = qs("#ModuleId");
      if (!selectEl) return;

      if (!window.ServiceLoader) throw new Error("ServiceLoader missing");
      await window.ServiceLoader.loadLookupService();
      if (!window.LookupService?.getSystemCode) throw new Error("LookupService is not available");

      const resp = await window.LookupService.getSystemCode({ CodeID: "UserCodeModuleID" });
      if (!resp?.success) {
        console.warn("[UserCodes] Failed to load ModuleId options", resp);
        return;
      }

      const options = mapSystemCodeOptions(resp.data);
      // Rebuild options (keep placeholder)
      const placeholder = Array.from(selectEl.options).find((o) => !String(o.value || "").trim())
        || selectEl.options[0]
        || null;
      selectEl.innerHTML = "";
      if (placeholder) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = placeholder.textContent || "--Select--";
        opt.selected = true;
        selectEl.appendChild(opt);
      } else {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "--Select--";
        opt.selected = true;
        selectEl.appendChild(opt);
      }

      for (const o of options) {
        const opt = document.createElement("option");
        opt.value = String(o.value);
        opt.textContent = String(o.label || o.value);
        selectEl.appendChild(opt);
      }
    })();

    return state.moduleOptionsPromise;
  }

  function extractHeaderAndRows(resultData) {
    if (!resultData) return { header: null, rows: [] };

    function looksLikeGridRow(obj) {
      if (!obj || typeof obj !== "object") return false;
      const keys = Object.keys(obj).map(normKey);
      const hasSub = keys.some((k) => k.includes("subcode"));
      const hasDefault = keys.some((k) => k.includes("isdefault") || k.includes("default"));
      return hasSub || hasDefault;
    }

    function looksLikeHeader(obj) {
      if (!obj || typeof obj !== "object") return false;
      const keys = Object.keys(obj).map(normKey);
      const hasDescription = keys.some((k) => k === "description" || k.endsWith("description") || k === "desc");
      const hasModule = keys.some((k) => k.includes("module"));
      const hasRemarks = keys.some((k) => k.includes("remark"));
      const hasAudit = keys.some((k) => k.includes("created") || k.includes("modified") || k.includes("supervised"));
      const hasId = keys.some((k) => k === "id" || k.includes("usercodeid") || k.includes("codeid"));
      const isGridish = looksLikeGridRow(obj);

      // Exclude metadata-style rows (these commonly appear in Details[0] from OldAPI)
      const isMeta = keys.some((k) => k === "eventid" || k === "updatecount" || k === "newdata" || k === "operatorid");
      if (isMeta && !(hasId || hasModule || hasRemarks || hasDescription)) return false;

      // Require at least one business field (audit-only rows shouldn't qualify).
      const hasBusiness = hasId || hasModule || hasRemarks || hasDescription;
      return hasBusiness && !isGridish && (hasId || hasModule || hasRemarks || hasDescription || hasAudit);
    }

    function pickBestRows(datasets, exclude) {
      const arrays = datasets.filter((d) => Array.isArray(d) && d !== exclude);
      if (!arrays.length) return [];

      const scored = arrays
        .map((arr) => {
          const first = arr[0];
          const gridLike = first && typeof first === "object" ? looksLikeGridRow(first) : false;
          const score = (gridLike ? 1000 : 0) + arr.length;
          return { arr, score };
        })
        .sort((a, b) => b.score - a.score);

      // Prefer grid-like arrays (Details02 in your log), otherwise fall back to longest.
      return scored[0]?.arr || [];
    }

    // If CoreApi returned multi-dataset payload, `resultData` is the full payload.
    if (typeof resultData === "object" && !Array.isArray(resultData)) {
      const details = resultData.Details;
      const details01 = resultData.Details01;
      const details02 = resultData.Details02;
      const details03 = resultData.Details03;

      const datasets = [details, details01, details02, details03].filter((v) => v !== undefined);

      // 1) Prefer explicit header object dataset.
      const objectHeader = datasets.find((d) => d && typeof d === "object" && !Array.isArray(d) && looksLikeHeader(d)) || null;
      if (objectHeader) {
        const firstArray = datasets.find((d) => Array.isArray(d) && (d.length === 0 || looksLikeGridRow(d[0])));
        const rows = firstArray || (Array.isArray(resultData.SubCodes) ? resultData.SubCodes : []);
        return { header: objectHeader, rows: Array.isArray(rows) ? rows : [] };
      }

      // 2) If header is an array with a single object (common legacy pattern).
      for (const d of datasets) {
        if (Array.isArray(d) && d.length === 1 && d[0] && typeof d[0] === "object" && looksLikeHeader(d[0])) {
          const rows = pickBestRows(datasets, d);
          return { header: d[0], rows: Array.isArray(rows) ? rows : [] };
        }
      }

      // 3) Rows-only dataset: use first array as rows; don't guess header from first row.
      const firstArray = datasets.find((d) => Array.isArray(d));
      if (Array.isArray(firstArray)) {
        const cleaned = firstArray.filter((r) => !isMetaOnlyObject(r) && !isEmptyDetailRow(r));
        return { header: null, rows: cleaned };
      }

      // 4) Fallback to Details as header-ish object.
      if (details && typeof details === "object" && !Array.isArray(details)) {
        if (isMetaOnlyObject(details)) {
          const cleaned = Array.isArray(details01) ? details01.filter((r) => !isMetaOnlyObject(r) && !isEmptyDetailRow(r)) : [];
          return { header: null, rows: cleaned };
        }
        const cleaned = Array.isArray(details01) ? details01.filter((r) => !isMetaOnlyObject(r) && !isEmptyDetailRow(r)) : [];
        return { header: details, rows: cleaned };
      }

      return { header: null, rows: [] };
    }

    if (Array.isArray(resultData)) {
      return { header: null, rows: resultData };
    }

    return { header: null, rows: [] };
  }

  async function handleSearchOrView(options = {}) {
    const quiet = !!options.quiet;
    const id = qs("#UserCodeId")?.value?.trim() || "";
    if (!id) {
      if (!quiet) setToast("Enter an ID to search.", "warning");
      return;
    }

    try {
      await ensureServiceLoaded();
      // Ensure dropdown options exist before we apply header values from DB.
      await ensureModuleOptionsLoaded();

      const requestData = {
        OurBranchID: getBranchId(),
        ID: id,
        OperatorID: getOperatorId(),
      };

      console.groupCollapsed("[UserCodes] dbo.p_GetUserCodes");
      console.info("RequestData", requestData);

      const result = await window.SystemUtilitiesService.getUserCodes(requestData);
      console.info("Raw result", result);
      if (!result?.success) {
        console.groupEnd();
        state.hasLoadedUserCode = false;
        state.canAddFromCurrentId = true;
        clearFormForAdd();
        setMode(MODES.VIEW);
        if (!quiet) setToast("Record doesn't exist. Click Add.", "warning");
        return;
      }

      const { header, rows } = extractHeaderAndRows(result.data);
      console.info("Extracted header", header);
      console.info("Extracted rows (count)", Array.isArray(rows) ? rows.length : 0);
      const cleanHeader = header && isMetaOnlyObject(header) ? null : header;
      const cleanRows = (Array.isArray(rows) ? rows : []).filter((r) => !isMetaOnlyObject(r) && !isEmptyDetailRow(r));

      if (cleanHeader) applyDataToForm(cleanHeader);
      state.detailRows = cleanRows;
      renderGridRows(state.detailRows);

      const hasAny = !!cleanHeader || cleanRows.length > 0;
      if (!hasAny) {
        console.groupEnd();
        state.hasLoadedUserCode = false;
        state.canAddFromCurrentId = true;
        clearFormForAdd();
        setMode(MODES.VIEW);
        if (!quiet) setToast("Record doesn't exist. Click Add.", "warning");
        return;
      }

      state.hasLoadedUserCode = true;
      state.canAddFromCurrentId = false;
      setMode(MODES.VIEW);
      if (!quiet) setToast("Loaded.", "success");
      console.groupEnd();
    } catch (e) {
      console.error(e);
      if (!quiet) setToast(e?.message || "Failed to load user codes.", "danger");
      else throw e;
    }
  }

  function bindActions() {
    qs('[data-uc-action="save"]')?.addEventListener("click", () => void handleSave());

    qs('[data-uc-action="cancel"]')?.addEventListener("click", () => {
      clearFormAll();
      setMode(MODES.VIEW);
      setToast("Cleared.", "info");
    });

    qs('[data-uc-action="search-id"]')?.addEventListener("click", handleSearchOrView);
    qs('[data-shell-mode="View"]')?.addEventListener("click", handleSearchOrView);
  }

  window.addEventListener("load", async () => {
    try {
      bindModeButtons();
      bindActions();
      bindGridRowSelection();
      bindGridToolbar();
      bindIdWatcher();
      clearGrid();

      // Load dropdown options from system codes.
      await ensureModuleOptionsLoaded();

      // Initial state: only View enabled.
      state.hasLoadedUserCode = false;
      state.canAddFromCurrentId = false;
      setMode(MODES.VIEW);

      // Preload service quietly (best-effort).
      if (window.ServiceLoader?.loadSystemUtilitiesService) {
        await window.ServiceLoader.loadSystemUtilitiesService();
      }
    } catch (e) {
      console.warn(e);
    }
  });
})();
