(() => {
  if (window.__kairoLocationPageLoaded) return;
  window.__kairoLocationPageLoaded = true;

  const MODES = {
    VIEW: "View",
    ADD: "Add",
    UPDATE: "Update",
  };

  const state = {
    mode: MODES.VIEW,
    hasLoaded: false,
    canAddFromId: false,
  };

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
    const hasBusinessKeys = keys.some((k) => k.includes("location") || k === "building" || k === "roomoffice" || k === "store");
    return hasMetaKeys && !hasBusinessKeys;
  }

  function pickValue(obj, preferredKeys = [], keyFragments = []) {
    if (!obj || typeof obj !== "object") return undefined;

    for (const k of preferredKeys) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) return obj[k];
    }

    if (!keyFragments.length) return undefined;
    for (const [k, v] of Object.entries(obj)) {
      const nk = normKey(k);
      if (keyFragments.some((frag) => nk.includes(frag))) return v;
    }
    return undefined;
  }

  function coerceBool(v) {
    if (v === true) return true;
    if (v === false) return false;
    const s = String(v ?? "").trim().toLowerCase();
    return s === "1" || s === "true" || s === "yes" || s === "y";
  }

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  /* ─────────────────────────────────────────────────────────────
     Toast notification helpers (maintain-banks pattern)
  ───────────────────────────────────────────────────────────── */
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

  function showToast(message, { title = 'Notification', variant = 'info', timeoutMs = 5000 } = {}) {
    const container = ensureToastContainer();
    const toast = document.createElement('div');
    toast.className = `kairo-toast kairo-toast--${variant}`;
    toast.setAttribute('role', 'status');
    toast.innerHTML = `
      <span class="kairo-toast__title">${title}</span>
      <span class="kairo-toast__body">${message}</span>
      <button type="button" class="kairo-toast__close" aria-label="Close">&times;</button>
    `;
    container.appendChild(toast);

    const closeBtn = toast.querySelector('.kairo-toast__close');
    const dismiss = () => {
      toast.classList.add('removing');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
      setTimeout(() => toast.remove(), 350);
    };
    closeBtn?.addEventListener('click', dismiss);
    setTimeout(dismiss, timeoutMs);
  }

  function setToast(message, variant = "success") {
    const text = String(message ?? "").trim();
    if (!text) return;
    const titleMap = {
      success: 'Success',
      danger: 'Error',
      warning: 'Warning',
      info: 'Info'
    };
    showToast(text, { title: titleMap[variant] || 'Notification', variant });
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
      del: qs('[data-location-action="delete"]'),
      save: qs('[data-location-action="save"]'),
      cancel: qs('[data-location-action="cancel"]'),
    };
  }

  function clearFormAll() {
    const form = qs("#location-form");
    if (!form) return;
    qsa("input, select, textarea", form).forEach((el) => {
      if (el.type === "checkbox") {
        el.checked = false;
        return;
      }
      el.value = "";
    });
    state.hasLoaded = false;
    state.canAddFromId = false;
  }

  function clearFormForAdd() {
    const form = qs("#location-form");
    if (!form) return;
    const keepId = qs("#LocationID")?.value || "";
    qsa("input, select, textarea", form).forEach((el) => {
      if (el.hasAttribute("data-always-enabled")) {
        if (el.id === "LocationID" || el.name === "LocationID") el.value = keepId;
        return;
      }
      if (el.type === "checkbox") {
        el.checked = false;
        return;
      }
      el.value = "";
    });
    state.hasLoaded = false;
    state.canAddFromId = !!keepId;
  }

  function extractRow(payload) {
    if (!payload) return null;
    if (Array.isArray(payload)) return payload[0] || null;
    if (typeof payload === "object" && payload !== null) {
      const datasetArrays = [];
      for (const [k, v] of Object.entries(payload)) {
        if (!Array.isArray(v) || !v.length) continue;
        const nk = normKey(k);
        const weight = nk === "details" || nk === "detail" ? 10 : nk.startsWith("details") ? 1 : 5;
        datasetArrays.push({ key: k, value: v, weight });
      }
      datasetArrays.sort((a, b) => a.weight - b.weight);
      for (const ds of datasetArrays) {
        const firstBusiness = ds.value.find((r) => r && typeof r === "object" && !isMetaOnlyObject(r));
        if (firstBusiness) return firstBusiness;
      }

      const details = payload.Details || payload.details;
      if (Array.isArray(details)) {
        const firstBusiness = details.find((r) => r && typeof r === "object" && !isMetaOnlyObject(r));
        return firstBusiness || null;
      }
      if (details && typeof details === "object" && !Array.isArray(details)) {
        return isMetaOnlyObject(details) ? null : details;
      }
      return isMetaOnlyObject(payload) ? null : payload;
    }
    return null;
  }

  function applyDataToForm(data) {
    if (!data || typeof data !== "object") return;

    const id = pickValue(data, ["LocationID", "LocationId", "ID"], ["locationid"]);
    const name = pickValue(data, ["LocationName", "Name"], ["locationname", "name"]);
    const building = pickValue(data, ["Building"], ["building"]);
    const roomOffice = pickValue(data, ["RoomOffice", "Room", "Office"], ["roomoffice", "room", "office"]);
    const store = pickValue(data, ["Store"], ["store"]);

    const createdBy = pickValue(data, ["CreatedBy"], ["createdby"]);
    const createdOn = pickValue(data, ["CreatedOn", "CreatedDate"], ["createdon", "createddate"]);
    const modifiedBy = pickValue(data, ["ModifiedBy"], ["modifiedby"]);
    const modifiedOn = pickValue(data, ["ModifiedOn", "ModifiedDate"], ["modifiedon", "modifieddate"]);

    if (id != null) qs("#LocationID") && (qs("#LocationID").value = String(id));
    if (name != null) qs("#LocationName") && (qs("#LocationName").value = String(name));
    if (building != null) qs("#Building") && (qs("#Building").value = String(building));
    if (roomOffice != null) qs("#RoomOffice") && (qs("#RoomOffice").value = String(roomOffice));
    if (store != null) qs("#Store") && (qs("#Store").checked = coerceBool(store));

    if (createdBy != null) qs("#CreatedBy") && (qs("#CreatedBy").value = String(createdBy));
    if (createdOn != null) qs("#CreatedOn") && (qs("#CreatedOn").value = String(createdOn));
    if (modifiedBy != null) qs("#ModifiedBy") && (qs("#ModifiedBy").value = String(modifiedBy));
    if (modifiedOn != null) qs("#ModifiedOn") && (qs("#ModifiedOn").value = String(modifiedOn));
  }

  async function ensureServicesLoaded() {
    if (!window.ServiceLoader) throw new Error("ServiceLoader missing");
    await window.ServiceLoader.loadCore();
    await window.ServiceLoader.loadStaticDataService();
    if (!window.StaticDataService?.getLocation) {
      throw new Error("StaticDataService.getLocation is not available");
    }
    if (!window.StaticDataService?.addEditLocation) {
      throw new Error("StaticDataService.addEditLocation is not available");
    }
    if (!window.StaticDataService?.deleteLocation) {
      throw new Error("StaticDataService.deleteLocation is not available");
    }
  }

  function setMode(nextMode, { initial = false } = {}) {
    state.mode = nextMode;

    const pill = qs("[data-page-function-pill]");
    if (pill) pill.textContent = `Mode · ${nextMode}`;

    const form = qs("#location-form");
    if (!form) return;

    const fields = qsa("input, select, textarea", form);
    const isFormEditable = nextMode === MODES.ADD || nextMode === MODES.UPDATE;

    for (const el of fields) {
      if (el.hasAttribute("data-always-enabled")) {
        el.disabled = false;
        continue;
      }
      el.disabled = !isFormEditable;
    }

    // Keep search button enabled (it isn't a form field)
    qsa("button[data-always-enabled]", form).forEach((b) => (b.disabled = false));

    const { view, add, edit, del, save, cancel } = getActionButtons();
    // Default: disable everything, then selectively enable.
    setButtonDisabled(view, true);
    setButtonDisabled(add, true);
    setButtonDisabled(edit, true);
    setButtonDisabled(del, true);
    setButtonDisabled(save, true);
    setButtonDisabled(cancel, true);

    if (initial) {
      // Initial state: only View enabled.
      setButtonDisabled(view, false);
      return;
    }

    // Requested behavior:
    // - In View mode (with a loaded record), only Cancel + Edit + Delete are active.
    // - Save is only active in Add/Edit modes.
    if (nextMode === MODES.VIEW) {
      const canCancelInView = state.hasLoaded || state.canAddFromId;
      setButtonDisabled(cancel, !canCancelInView);
      // If a lookup showed the record doesn't exist, allow Add.
      setButtonDisabled(add, !state.canAddFromId);
      setButtonDisabled(edit, !state.hasLoaded);
      setButtonDisabled(del, !state.hasLoaded);
      // Keep View disabled in this state; search is available via the magnifier button.
      return;
    }

    if (nextMode === MODES.ADD || nextMode === MODES.UPDATE) {
      setButtonDisabled(save, false);
      setButtonDisabled(cancel, false);
      setButtonDisabled(del, !(state.hasLoaded && nextMode === MODES.UPDATE));
    }
  }

  function bindModeButtons() {
    qsa("[data-shell-mode]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const next = btn.getAttribute("data-shell-mode");
        if (!next || !MODES[next.toUpperCase()]) return;

        const nextMode = MODES[next.toUpperCase()];

        if (nextMode === MODES.VIEW) {
          await handleSearchOrView();
          return;
        }

        if (nextMode === MODES.ADD) {
          const id = qs("#LocationID")?.value?.trim() || "";
          if (!id) {
            setToast("Enter Location ID first.", "warning");
            return;
          }

          // Only allow Add if the ID does not already exist.
          try {
            await ensureServicesLoaded();
            const check = await window.StaticDataService.getLocation(id, 0);
            if (check?.success) {
              const row = extractRow(check.data);
              if (row) {
                applyDataToForm(row);
                state.hasLoaded = true;
                state.canAddFromId = false;
                setMode(MODES.VIEW);
                setToast("This ID already exists. Loaded in View.", "warning");
                return;
              }
            }
          } catch (e) {
            console.warn(e);
          }

          clearFormForAdd();
          setMode(MODES.ADD);
          setToast("Add mode.", "info");
          return;
        }

        if (nextMode === MODES.UPDATE) {
          if (!state.hasLoaded) {
            setToast("Load a record first (View/Search) before editing.", "warning");
            return;
          }
          setMode(MODES.UPDATE);
          setToast("Edit mode.", "info");
        }
      });
    });
  }

  async function handleSearchOrView(options = {}) {
    const quiet = !!options.quiet;
    const id = qs("#LocationID")?.value?.trim() || "";
    if (!id) {
      if (!quiet) setToast("Enter Location ID.", "warning");
      return;
    }

    try {
      await ensureServicesLoaded();
      const result = await window.StaticDataService.getLocation(id, 0);
      console.info("[Location] dbo.P_GetLocation", result);

      if (!result?.success) {
        state.hasLoaded = false;
        state.canAddFromId = true;
        clearFormForAdd();
        setMode(MODES.VIEW);
        if (!quiet) setToast("Record doesn't exist.", "warning");
        return;
      }

      const row = extractRow(result.data);
      if (!row || typeof row !== "object") {
        state.hasLoaded = false;
        state.canAddFromId = true;
        clearFormForAdd();
        setMode(MODES.VIEW);
        if (!quiet) setToast("Record doesn't exist.", "warning");
        return;
      }

      applyDataToForm(row);
      state.hasLoaded = true;
      state.canAddFromId = false;
      setMode(MODES.VIEW);
      if (!quiet) setToast("Loaded.", "success");
    } catch (e) {
      console.error(e);
      if (!quiet) setToast(e?.message || "Failed to load location.", "danger");
      else throw e;
    }
  }

  async function handleSave() {
    if (state.mode === MODES.VIEW) {
      setToast("Switch to Add/Edit before saving.", "warning");
      return;
    }

    const form = qs("#location-form");
    if (form && typeof form.reportValidity === "function") {
      const ok = form.reportValidity();
      if (!ok) {
        setToast("Please fill the required fields.", "warning");
        return;
      }
    }

    const id = qs("#LocationID")?.value?.trim() || "";
    if (!id) {
      setToast("Enter Location ID.", "warning");
      return;
    }

    const name = qs("#LocationName")?.value?.trim() || "";
    if (!name) {
      setToast("Enter Location Name.", "warning");
      return;
    }

    const now = new Date();
    const operatorId = getOperatorId();
    const createdByExisting = qs("#CreatedBy")?.value?.trim() || "";
    const createdOnExisting = qs("#CreatedOn")?.value?.trim() || "";

    const requestData = {
      LocationID: id,
      LocationName: name,
      Building: qs("#Building")?.value?.trim() || "",
      RoomOffice: qs("#RoomOffice")?.value?.trim() || "",
      Store: !!qs("#Store")?.checked,
      CreatedBy: createdByExisting || operatorId,
      CreatedOn: createdOnExisting || formatMDYHMS(now),
      ModifiedBy: operatorId,
      ModifiedOn: formatMDYHMS(now),
      NewRecord: state.mode === MODES.ADD ? 1 : 0,
    };

    console.groupCollapsed("[Location] dbo.P_AddEditLocation");
    console.info("RequestData", requestData);

    try {
      const { save, cancel, add, edit, del, view } = getActionButtons();
      setButtonDisabled(save, true);
      setButtonDisabled(cancel, true);
      setButtonDisabled(add, true);
      setButtonDisabled(edit, true);
      setButtonDisabled(del, true);
      setButtonDisabled(view, true);
      setToast("Saving...", "info");

      await ensureServicesLoaded();
      const result = await window.StaticDataService.addEditLocation(requestData);
      console.info("Raw result", result);

      if (!result?.success) {
        setToast(result?.message || "Save failed.", "danger");
        console.groupEnd();
        return;
      }

      setToast("Saved.", "success");
      // Per requirement: after saving, clear all fields.
      clearFormAll();
      setMode(MODES.VIEW, { initial: true });
      console.groupEnd();
    } catch (e) {
      console.error(e);
      setToast(e?.message || "Save failed.", "danger");
      console.groupEnd();
    } finally {
      // Restore buttons/field enablement for the current state.
      const isInitialView = state.mode === MODES.VIEW && !state.hasLoaded && !state.canAddFromId;
      setMode(state.mode, { initial: isInitialView });
    }
  }

  async function handleDelete() {
    if (!state.hasLoaded) {
      setToast("Load a record before deleting.", "warning");
      return;
    }

    const id = qs("#LocationID")?.value?.trim() || "";
    if (!id) {
      setToast("Enter Location ID to delete.", "warning");
      return;
    }

    const result = await window.Swal.fire({
      title: 'Delete Record?',
      text: `Are you sure you want to delete Location '${id}'? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      confirmButtonColor: '#dc3545',
      cancelButtonText: 'Cancel',
      cancelButtonColor: '#6c757d'
    });

    if (!result.isConfirmed) return;

    console.groupCollapsed("[Location] dbo.P_DeleteLocation");
    console.info("LocationID", id);

    try {
      const { save, cancel, add, edit, del, view } = getActionButtons();
      setButtonDisabled(save, true);
      setButtonDisabled(cancel, true);
      setButtonDisabled(add, true);
      setButtonDisabled(edit, true);
      setButtonDisabled(del, true);
      setButtonDisabled(view, true);
      setToast("Deleting...", "info");

      await ensureServicesLoaded();
      const apiResult = await window.StaticDataService.deleteLocation(id);
      console.info("Raw result", apiResult);

      if (!apiResult?.success) {
        const errorMsg = apiResult?.message || apiResult?.Message || apiResult?.ResponseMessage || "Delete failed.";
        setToast(errorMsg, "danger");
        console.groupEnd();
        return;
      }

      setToast("Location deleted successfully.", "success");
      clearFormAll();
      setMode(MODES.VIEW, { initial: true });
      console.groupEnd();
    } catch (e) {
      console.error(e);
      const errorMsg = e?.message || e?.Message || "Delete failed.";
      setToast(errorMsg, "danger");
      console.groupEnd();
    } finally {
      setMode(state.mode);
    }
  }

  function bindActions() {
    qs('[data-location-action="search"]')?.addEventListener("click", () => void handleSearchOrView());
    // Note: View button is handled by bindModeButtons() - don't add duplicate listener

    qs('[data-location-action="cancel"]')?.addEventListener("click", () => {
      clearFormAll();
      setMode(MODES.VIEW, { initial: true });
      setToast("Cleared.", "info");
    });

    qs('[data-location-action="save"]')?.addEventListener("click", () => void handleSave());
    qs('[data-location-action="delete"]')?.addEventListener("click", () => void handleDelete());
  }

  function bindSectionToggles() {
    // Make section headers collapsible
    qsa('.section-header').forEach((header) => {
      header.addEventListener('click', (e) => {
        // Don't toggle if clicking on the button itself (it will bubble up anyway)
        const section = header.closest('.form-section');
        if (section) {
          section.classList.toggle('collapsed');
          const btn = header.querySelector('.section-toggle-btn');
          if (btn) {
            const isExpanded = !section.classList.contains('collapsed');
            btn.setAttribute('aria-expanded', isExpanded);
          }
        }
      });
    });
  }

  window.addEventListener("load", async () => {
    bindModeButtons();
    bindActions();
    bindSectionToggles();
    state.hasLoaded = false;
    state.canAddFromId = false;
    setMode(MODES.VIEW, { initial: true });

    // Best-effort preload.
    try {
      await ensureServicesLoaded();
    } catch (e) {
      console.warn(e);
    }
  });
})();
