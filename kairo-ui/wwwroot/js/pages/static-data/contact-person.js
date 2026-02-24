(() => {
  if (window.__kairoContactPersonLoaded) return;
  window.__kairoContactPersonLoaded = true;

  const MODES = {
    VIEW: "View",
    ADD: "Add",
    UPDATE: "Update",
  };

  const state = {
    mode: MODES.VIEW,
    hasLoaded: false,
    recordNotFound: false,
    isBusy: false,
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

  function setToast(message, variant = "info") {
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

  async function confirmDialog({ title, text, confirmText = "OK", cancelText = "Cancel", icon = "warning" }) {
    if (window.Swal) {
      const res = await window.Swal.fire({
        title,
        text,
        icon,
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        reverseButtons: true,
      });
      return !!res.isConfirmed;
    }
    return window.confirm(text || title || "Are you sure?");
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

  function coerceBool(v) {
    if (v === true) return true;
    if (v === false) return false;
    const s = String(v ?? "").trim().toLowerCase();
    return s === "1" || s === "true" || s === "yes" || s === "y";
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
    const hasBusinessKeys = keys.some((k) => k.includes("contactperson") || k === "name" || k.includes("title") || k.includes("email") || k.includes("phone") || k.includes("isactive") || k.includes("active"));
    return hasMetaKeys && !hasBusinessKeys;
  }

  function setSelectValue(selectEl, value) {
    if (!selectEl) return;
    const v = value == null ? "" : String(value);
    const normalized = v.trim().toLowerCase().replace(/[\s_]+/g, "-");
    if (!normalized) {
      selectEl.value = "";
      return;
    }

    const match = Array.from(selectEl.options).find((o) => {
      const ov = String(o.value ?? "").trim().toLowerCase().replace(/[\s_]+/g, "-");
      const ot = String(o.textContent ?? "").trim().toLowerCase().replace(/[\s_]+/g, "-");
      return ov === normalized || ot === normalized;
    });
    if (match) selectEl.value = match.value;
  }

  function pickValue(obj, preferredKeys = [], keyFragments = []) {
    if (!obj || typeof obj !== "object") return undefined;

    for (const k of preferredKeys) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) return obj[k];
    }

    if (!keyFragments.length) return undefined;
    const entries = Object.entries(obj);
    for (const [k, v] of entries) {
      const nk = normKey(k);
      if (keyFragments.some((frag) => nk.includes(frag))) return v;
    }
    return undefined;
  }

  function applyDataToForm(data) {
    if (!data || typeof data !== "object") return;

    const id = pickValue(data, ["ContactPersonID", "ContactPersonId", "ID"], ["contactpersonid"]);
    const titleRaw = pickValue(data, ["Title"], ["title"]);
    const name = pickValue(data, ["Name", "FullName"], ["name", "fullname"]);
    const phone = pickValue(data, ["Phone", "PhoneNo", "Mobile", "MobileNo"], ["phone", "mobile"]);
    const email = pickValue(data, ["Email", "EmailAddress"], ["email"]);
    const isActive = pickValue(data, ["IsActive", "Active"], ["isactive", "active"]);

    const createdBy = pickValue(data, ["CreatedBy"], ["createdby"]);
    const createdOn = pickValue(data, ["CreatedOn", "CreatedDate"], ["createdon", "createddate"]);
    const modifiedBy = pickValue(data, ["ModifiedBy"], ["modifiedby"]);
    const modifiedOn = pickValue(data, ["ModifiedOn", "ModifiedDate"], ["modifiedon", "modifieddate"]);

    const normalizeTitle = (t) => {
      const s = String(t ?? "").trim();
      if (!s) return "";
      const n = s
        .toLowerCase()
        .replace(/[\.]/g, "")
        .replace(/[\s_]+/g, "-");
      if (n === "dr" || n === "doctor") return "Doctor";
      if (n === "mr") return "Mr";
      if (n === "ms") return "Ms";
      if (n === "mrs") return "Mrs";
      if (n === "not-specified" || n === "notspecified") return "Not-Specified";
      if (n === "prof" || n === "professor") return "Professor";
      if (n === "amb" || n === "ambassador") return "Ambassador";
      if (n === "priest") return "Priest";
      // Fallback: return original value as-is.
      return s;
    };

    const title = normalizeTitle(titleRaw);

    if (id != null && qs("#ContactPersonID")) qs("#ContactPersonID").value = String(id);
    if (titleRaw != null) setSelectValue(qs("#Title"), title);
    // Populate ContactPersonDesc (name next to ID)
    if (name != null && qs("#ContactPersonDesc")) qs("#ContactPersonDesc").value = String(name);
    if (phone != null) qs("#Phone") && (qs("#Phone").value = String(phone));
    if (email != null) qs("#Email") && (qs("#Email").value = String(email));
    if (isActive != null) qs("#IsActive") && (qs("#IsActive").checked = coerceBool(isActive));

    // Populate audit fields (Behind the Scene section)
    // Use .textContent for audit spans, fallback to .value for legacy input fields
    if (createdBy != null && qs("#CreatedBy")) {
      if ("textContent" in qs("#CreatedBy")) qs("#CreatedBy").textContent = String(createdBy);
      if ("value" in qs("#CreatedBy")) qs("#CreatedBy").value = String(createdBy);
    }
    if (createdOn != null && qs("#CreatedOn")) {
      if ("textContent" in qs("#CreatedOn")) qs("#CreatedOn").textContent = String(createdOn);
      if ("value" in qs("#CreatedOn")) qs("#CreatedOn").value = String(createdOn);
    }
    if (modifiedBy != null && qs("#ModifiedBy")) {
      if ("textContent" in qs("#ModifiedBy")) qs("#ModifiedBy").textContent = String(modifiedBy);
      if ("value" in qs("#ModifiedBy")) qs("#ModifiedBy").value = String(modifiedBy);
    }
    if (modifiedOn != null && qs("#ModifiedOn")) {
      if ("textContent" in qs("#ModifiedOn")) qs("#ModifiedOn").textContent = String(modifiedOn);
      if ("value" in qs("#ModifiedOn")) qs("#ModifiedOn").value = String(modifiedOn);
    }
    // Also support SupervisedBy and SupervisedOn if present
    const supervisedBy = pickValue(data, ["SupervisedBy"], ["supervisedby"]);
    const supervisedOn = pickValue(data, ["SupervisedOn"], ["supervisedon"]);
    if (supervisedBy != null && qs("#SupervisedBy")) {
      if ("textContent" in qs("#SupervisedBy")) qs("#SupervisedBy").textContent = String(supervisedBy);
      if ("value" in qs("#SupervisedBy")) qs("#SupervisedBy").value = String(supervisedBy);
    }
    if (supervisedOn != null && qs("#SupervisedOn")) {
      if ("textContent" in qs("#SupervisedOn")) qs("#SupervisedOn").textContent = String(supervisedOn);
      if ("value" in qs("#SupervisedOn")) qs("#SupervisedOn").value = String(supervisedOn);
    }
  }

  function clearFormAll() {
    const form = qs("#contact-person-form");
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
    state.hasLoaded = false;
    state.recordNotFound = false;
  }

  function clearForm({ keepId = true } = {}) {
    const form = qs("#contact-person-form");
    if (!form) return;
    const id = qs("#ContactPersonID")?.value ?? "";
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

    if (keepId && qs("#ContactPersonID")) qs("#ContactPersonID").value = id;
    state.hasLoaded = false;
  }

  function getActionButtons() {
    return {
      view: qs('[data-shell-mode="View"]'),
      add: qs('[data-shell-mode="Add"]'),
      edit: qs('[data-shell-mode="Update"]'),
      del: qs('[data-contact-action="delete"]'),
      save: qs('[data-contact-action="save"]'),
      cancel: qs('[data-contact-action="cancel"]'),
    };
  }

  function updateActionButtons() {
    const { view, add, edit, del, save, cancel } = getActionButtons();
    const isEditable = state.mode === MODES.ADD || state.mode === MODES.UPDATE;

    // Requested UX: once a record exists (after View), disable View.
    setButtonDisabled(view, isEditable || (state.mode === MODES.VIEW && state.hasLoaded));
    setButtonDisabled(add, !state.recordNotFound);
    setButtonDisabled(edit, !state.hasLoaded || state.mode === MODES.UPDATE);
    setButtonDisabled(save, !isEditable);
    setButtonDisabled(cancel, !(isEditable || state.hasLoaded || state.recordNotFound));
    setButtonDisabled(del, !state.hasLoaded);
  }

  function setMode(nextMode, { initial = false } = {}) {
    state.mode = nextMode;
    const pill = qs("[data-page-function-pill]");
    if (pill) pill.textContent = `Mode · ${nextMode}`;

    const form = qs("#contact-person-form");
    if (!form) return;

    const isEditable = nextMode === MODES.ADD || nextMode === MODES.UPDATE;

    // Disable/enable inputs.
    qsa("input, select, textarea", form).forEach((el) => {
      // Always enabled: ID and search button.
      if (el.hasAttribute("data-always-enabled")) {
        el.disabled = false;
        return;
      }

      // Audit fields are always read-only.
      if (["CreatedBy", "CreatedOn", "ModifiedBy", "ModifiedOn"].includes(el.id)) {
        el.disabled = true;
        return;
      }

      el.disabled = !isEditable;
    });

    qsa("button[data-always-enabled]", form).forEach((btn) => (btn.disabled = false));

    if (initial) {
      // Initial load: only View enabled.
      state.hasLoaded = false;
      state.recordNotFound = false;
      const { view, add, edit, del, save, cancel } = getActionButtons();
      setButtonDisabled(view, false);
      setButtonDisabled(add, true);
      setButtonDisabled(edit, true);
      setButtonDisabled(del, true);
      setButtonDisabled(save, true);
      setButtonDisabled(cancel, true);
      return;
    }

    updateActionButtons();
  }

  async function ensureServicesLoaded() {
    if (!window.ServiceLoader) throw new Error("ServiceLoader missing");
    await window.ServiceLoader.loadCore();
    await window.ServiceLoader.loadStaticDataService();
    if (!window.StaticDataService?.getContactPerson) {
      throw new Error("StaticDataService.getContactPerson is not available");
    }
    if (!window.StaticDataService?.addEditContactPerson) {
      throw new Error("StaticDataService.addEditContactPerson is not available");
    }
    if (!window.StaticDataService?.deleteContactPerson) {
      throw new Error("StaticDataService.deleteContactPerson is not available");
    }
  }

  function extractRow(payload) {
    if (!payload) return null;
    // CoreApi may return `data` as array, object, or multi-dataset object.
    if (Array.isArray(payload)) return payload[0] || null;
    if (typeof payload === "object" && payload !== null) {
      // OldAPI sometimes returns multiple datasets: Details (meta), Details01/Details02 (business).
      // Search across any array-like dataset keys and pick the first non-meta business row.
      const datasetArrays = [];
      for (const [k, v] of Object.entries(payload)) {
        if (!Array.isArray(v) || !v.length) continue;
        const nk = normKey(k);
        // Prefer known dataset naming first.
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

  async function handleSearchOrView(options = {}) {
    if (state.isBusy) return;
    const quiet = !!options.quiet;
    const id = qs("#ContactPersonID")?.value?.trim() || "";
    if (!id) {
      if (!quiet) setToast("Enter Contact Person ID.", "warning");
      return;
    }

    try {
      state.isBusy = true;
      if (!quiet) setToast("Searching...", "info");
      await ensureServicesLoaded();
      const result = await window.StaticDataService.getContactPerson(id, 0);
      console.info("[ContactPerson] dbo.p_GetContactPerson", result);

      if (!result?.success) {
        clearForm({ keepId: true });
        state.hasLoaded = false;
        state.recordNotFound = true;
        setMode(MODES.VIEW);
        if (!quiet) setToast("Record doesn't exist. Click Add.", "warning");
        return;
      }

      const row = extractRow(result.data);
      if (!row || typeof row !== "object") {
        clearForm({ keepId: true });
        state.hasLoaded = false;
        state.recordNotFound = true;
        setMode(MODES.VIEW);
        if (!quiet) setToast("Record doesn't exist. Click Add.", "warning");
        return;
      }

      applyDataToForm(row);
      state.hasLoaded = true;
      state.recordNotFound = false;
      setMode(MODES.VIEW);
      if (!quiet) setToast("Loaded.", "success");
    } catch (e) {
      console.error(e);
      if (!quiet) setToast(e?.message || "Failed to load contact person.", "danger");
      else throw e;
    } finally {
      state.isBusy = false;
      updateActionButtons();
    }
  }

  async function handleSave() {
    if (state.mode === MODES.VIEW) {
      setToast("Switch to Add/Edit before saving.", "warning");
      return;
    }

    const form = qs("#contact-person-form");
    if (form && typeof form.reportValidity === "function") {
      const ok = form.reportValidity();
      if (!ok) {
        setToast("Please fill the required fields.", "warning");
        return;
      }
    }

    const id = qs("#ContactPersonID")?.value?.trim() || "";
    if (!id) {
      setToast("Enter Contact Person ID.", "warning");
      return;
    }

    const name = qs("#ContactPersonDesc")?.value?.trim() || "";
    if (!name) {
      setToast("Enter Name.", "warning");
      return;
    }

    const now = new Date();
    const operatorId = getOperatorId();
    const createdByExisting = qs("#CreatedBy")?.value?.trim() || "";
    const createdOnExisting = qs("#CreatedOn")?.value?.trim() || "";

    const requestData = {
      ContactPersonID: id,
      Name: name,
      Title: qs("#Title")?.value?.trim() || "",
      Email: qs("#Email")?.value?.trim() || "",
      Phone: qs("#Phone")?.value?.trim() || "",
      IsActive: !!qs("#IsActive")?.checked,
      CreatedBy: createdByExisting || operatorId,
      CreatedOn: createdOnExisting || formatMDYHMS(now),
      ModifiedBy: operatorId,
      ModifiedOn: formatMDYHMS(now),
      NewRecord: state.mode === MODES.ADD ? 1 : 0,
    };

    console.groupCollapsed("[ContactPerson] dbo.P_AddEditContactPerson");
    console.info("RequestData", requestData);

    try {
      const { save, cancel, add, edit, del, view } = getActionButtons();
      // Prevent double-submit while request is in-flight.
      setButtonDisabled(save, true);
      setButtonDisabled(cancel, true);
      setButtonDisabled(add, true);
      setButtonDisabled(edit, true);
      setButtonDisabled(del, true);
      setButtonDisabled(view, true);
      setToast("Saving...", "info");

      await ensureServicesLoaded();
      const result = await window.StaticDataService.addEditContactPerson(requestData);
      console.info("Raw result", result);

      if (!result?.success) {
        setToast(result?.message || "Save failed.", "danger");
        console.groupEnd();
        return;
      }

      setToast("Saved.", "success");

      // Match Insurance Code behavior: clear all fields after save.
      clearForm({ keepId: false });
      state.hasLoaded = false;
      state.recordNotFound = false;
      setMode(MODES.VIEW);
      updateActionButtons();
      console.groupEnd();
    } catch (e) {
      console.error(e);
      setToast(e?.message || "Save failed.", "danger");
      console.groupEnd();
    } finally {
      // Restore button state for current mode.
      setMode(state.mode);
    }
  }

  async function handleDelete() {
    if (!state.hasLoaded) {
      setToast("Load a record before deleting.", "warning");
      return;
    }

    const id = qs("#ContactPersonID")?.value?.trim() || "";
    if (!id) {
      setToast("Enter Contact Person ID to delete.", "warning");
      return;
    }

    const ok = await confirmDialog({
      title: "Delete Contact Person",
      text: `Delete Contact Person '${id}'?`,
      confirmText: "Yes, delete",
      cancelText: "Cancel",
      icon: "warning",
    });
    if (!ok) return;

    console.groupCollapsed("[ContactPerson] dbo.P_DeleteContactPerson");
    console.info("ContactPersonID", id);

    try {
      setToast("Deleting...", "info");
      await ensureServicesLoaded();
      const result = await window.StaticDataService.deleteContactPerson(id);
      console.info("Raw result", result);
      if (!result?.success) {
        setToast(result?.message || "Delete failed.", "danger");
        console.groupEnd();
        return;
      }

      setToast("Deleted.", "success");
      clearForm({ keepId: false });
      state.hasLoaded = false;
      state.recordNotFound = false;
      setMode(MODES.VIEW);
      updateActionButtons();
      console.groupEnd();
    } catch (e) {
      console.error(e);
      setToast(e?.message || "Delete failed.", "danger");
      console.groupEnd();
    }
  }

  function bindActions() {
    qs('[data-contact-action="search"]')?.addEventListener("click", () => void handleSearchOrView());
    // Note: View button is handled by qsa("[data-shell-mode]") below - don't add duplicate listener

    qsa("[data-shell-mode]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const next = btn.getAttribute("data-shell-mode");
        if (!next || !MODES[next.toUpperCase()]) return;

        const nextMode = MODES[next.toUpperCase()];

        if (nextMode === MODES.ADD) {
          if (!state.recordNotFound) {
            setToast("Click View first. Add is enabled only when record doesn't exist.", "warning");
            return;
          }

          clearForm({ keepId: true });
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
          return;
        }

        if (nextMode === MODES.VIEW) {
          await handleSearchOrView();
          return;
        }
      });
    });

    qs('[data-contact-action="cancel"]')?.addEventListener("click", () => {
      // Match Insurance Code behavior
      if (state.hasLoaded) {
        clearForm({ keepId: false });
      } else {
        clearForm({ keepId: true });
      }
      state.hasLoaded = false;
      state.recordNotFound = false;
      setMode(MODES.VIEW);
      setToast("Changes canceled.", "info");
    });

    qs('[data-contact-action="save"]')?.addEventListener("click", () => void handleSave());

    qs('[data-contact-action="delete"]')?.addEventListener("click", () => void handleDelete());
  }

  document.addEventListener("DOMContentLoaded", () => {
    bindActions();
    // Populate Title dropdown from LookupService (t_UserCodeDetail where ID = 'TitleID')
    (async () => {
      try {
        if (window.LookupService && typeof window.LookupService.getTitles === 'function') {
          const options = await window.LookupService.getTitles();
          const titleSelect = qs('#Title');
          if (titleSelect && Array.isArray(options)) {
            // Remove all except the first option ("--Select--")
            while (titleSelect.options.length > 1) titleSelect.remove(1);
            options.forEach(opt => {
              const o = document.createElement('option');
              o.value = opt.value;
              o.textContent = opt.label || opt.value;
              titleSelect.appendChild(o);
            });
          }
        }
      } catch (e) {
        console.warn('Failed to load Title options:', e);
      }
    })();

    // Initial state: only View enabled.
    state.hasLoaded = false;
    state.canAddFromId = false;
    setMode(MODES.VIEW, { initial: true });

    // Best-effort preload (don't block UI wiring).
    void (async () => {
      try {
        await ensureServicesLoaded();
      } catch (e) {
        console.warn(e);
      }
    })();
  });
})();
