(function (global) {
  if (global.__ProductBranchDetailsLoaded) {
    console.warn("product-branch-details.js already loaded; skipping duplicate execution.");
    return;
  }
  global.__ProductBranchDetailsLoaded = true;

  const MODES = {
    VIEW: "view",
    ADD: "add",
    EDIT: "edit"
  };

  const setFeedback = (message, variant = "info") => {
    const node = document.getElementById("pbdFeedback");
    if (!node) return;
    if (!message) {
      node.className = "alert d-none mb-2";
      node.textContent = "";
      return;
    }
    node.className = `alert alert-${variant} mb-2`;
    node.textContent = message;
  };

  const toUiText = (value) => {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    if (value instanceof Error) return value.message || String(value);
    if (typeof value === "object") {
      const preferred =
        value.message ||
        value.Message ||
        value.error ||
        value.Error ||
        value.details ||
        value.Details;
      if (typeof preferred === "string") return preferred;
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    }
    return String(value);
  };

  const normalizeUiOptions = (titleOrOptions, defaults) => {
    if (typeof titleOrOptions === "string") return { ...defaults, title: titleOrOptions };
    if (titleOrOptions && typeof titleOrOptions === "object") return { ...defaults, ...titleOrOptions };
    return { ...defaults };
  };

  const showMessageModal = ({ title, message, confirmMode, okText, cancelText, variant }) => {
    const modalEl = document.getElementById("pbdMessageModal");
    const titleEl = document.getElementById("pbdMessageModalLabel");
    const bodyEl = document.getElementById("pbdMessageModalBody");
    const okBtn = modalEl?.querySelector("[data-pbd-message-ok]");
    const cancelBtn = modalEl?.querySelector("[data-pbd-message-cancel]");

    const safeTitle = toUiText(title) || (confirmMode ? "Confirm" : "Message");
    const safeMessage = toUiText(message);
    const safeOkText = toUiText(okText) || (confirmMode ? "Yes" : "OK");
    const safeCancelText = toUiText(cancelText) || "Cancel";
    const safeVariant = variant || (confirmMode ? "warning" : "info");

    // Fallback if Bootstrap/modal markup isn't available.
    if (!modalEl || !window.bootstrap?.Modal) {
      if (confirmMode) return Promise.resolve(window.confirm(safeMessage));
      window.alert(safeMessage);
      return Promise.resolve(true);
    }

    modalEl.setAttribute("data-pbd-variant", safeVariant);

    if (titleEl) titleEl.textContent = safeTitle;
    if (bodyEl) bodyEl.textContent = safeMessage;
    if (cancelBtn) {
      cancelBtn.hidden = !confirmMode;
      cancelBtn.textContent = safeCancelText;
    }
    if (okBtn) okBtn.textContent = safeOkText;

    const modal = window.bootstrap.Modal.getOrCreateInstance(modalEl, { backdrop: "static", keyboard: true });

    return new Promise((resolve) => {
      let resolved = false;

      const cleanup = () => {
        okBtn?.removeEventListener("click", onOk);
        cancelBtn?.removeEventListener("click", onCancel);
        modalEl.removeEventListener("hidden.bs.modal", onHidden);
      };

      const finish = (value) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve(value);
      };

      const onOk = () => {
        modal.hide();
        finish(true);
      };
      const onCancel = () => {
        modal.hide();
        finish(false);
      };
      const onHidden = () => {
        // If user closes via X/ESC, treat as cancel for confirm, ok for alert.
        finish(confirmMode ? false : true);
      };

      okBtn?.addEventListener("click", onOk);
      cancelBtn?.addEventListener("click", onCancel);
      modalEl.addEventListener("hidden.bs.modal", onHidden);
      modal.show();
    });
  };

  const uiAlert = (message, titleOrOptions) => {
    const opts = normalizeUiOptions(titleOrOptions, { title: "Message", okText: "OK", variant: "info" });
    return showMessageModal({
      title: opts.title,
      message,
      confirmMode: false,
      okText: opts.okText,
      variant: opts.variant
    });
  };

  const uiConfirm = (message, titleOrOptions) => {
    const opts = normalizeUiOptions(titleOrOptions, {
      title: "Confirm",
      okText: "Yes",
      cancelText: "No",
      variant: "warning"
    });
    return showMessageModal({
      title: opts.title,
      message,
      confirmMode: true,
      okText: opts.okText,
      cancelText: opts.cancelText,
      variant: opts.variant
    });
  };

  const setModeLabel = (mode) => {
    const label = document.querySelector("[data-pbd-mode-label]");
    if (!label) return;
    const text = mode === MODES.ADD ? "Add" : mode === MODES.EDIT ? "Edit" : "View";
    label.textContent = text;
  };

  const toggleFormEnabled = (form, enabled) => {
    if (!form) return;
    const fields = Array.from(form.querySelectorAll("input, select, textarea"));
    fields.forEach((field) => {
      if (field.readOnly) return;
      if (field.closest("[data-always-enabled]")) return;
      field.disabled = !enabled;
    });
  };

  const normalizeKey = (value) => {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  };

  const buildRecordIndex = (record) => {
    const index = new Map();
    if (!record || typeof record !== "object") return index;
    Object.keys(record).forEach((key) => {
      index.set(normalizeKey(key), key);
    });
    return index;
  };

  const coerceBoolean = (value) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    const text = String(value ?? "").trim().toLowerCase();
    return text === "y" || text === "yes" || text === "true" || text === "1";
  };

  const formatDateISO = (value) => {
    if (!value) return "";
    const text = String(value);
    const match = text.match(/^\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : text;
  };

  const formatDateDisplay = (value) => {
    const iso = formatDateISO(value);
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
    const [yyyy, mm, dd] = iso.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthIdx = Math.max(0, Math.min(11, Number(mm) - 1));
    return `${dd}/${months[monthIdx]}/${yyyy}`;
  };

  const extractId = (value) => {
    const text = String(value ?? "").trim();
    if (!text) return "";
    // Common patterns: "AL" or "AL - Something" or "AL|Something"
    const match = text.match(/^([^\s\-|]+)\s*(?:-|\|)\s*.+$/);
    return match ? match[1].trim() : text;
  };

  const addSelectOptionIfMissing = (selectEl, value) => {
    if (!selectEl || selectEl.tagName !== "SELECT") return;
    const v = value == null ? "" : String(value);
    if (v === "") return;
    const exists = Array.from(selectEl.options).some((o) => o.value === v);
    if (exists) return;
    const opt = document.createElement("option");
    opt.value = v;
    // If it looks like a date/time, show a friendly label.
    opt.textContent = /^\d{4}-\d{2}-\d{2}/.test(v) ? formatDateDisplay(v) : v;
    selectEl.appendChild(opt);
  };

  const getMappedKeyCandidates = (keyMapValue) => {
    if (!keyMapValue) return [];
    if (Array.isArray(keyMapValue)) return keyMapValue;
    return [keyMapValue];
  };

  const findBestFuzzyKey = (recordIndex, normalizedFieldKey) => {
    // recordIndex: Map<normalizedKey, originalKey>
    const keys = Array.from(recordIndex.keys());
    const candidates = [];

    for (const normKey of keys) {
      if (!normKey) continue;
      if (normalizedFieldKey === normKey) continue;
      const containsEither = normalizedFieldKey.includes(normKey) || normKey.includes(normalizedFieldKey);
      if (!containsEither) continue;
      const score = Math.min(normKey.length, normalizedFieldKey.length);
      candidates.push({ normKey, score });
    }

    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    const second = candidates[1];

    // Guardrails: avoid accidental matches
    if (!best || best.score < 6) return null;
    if (second && second.score === best.score) return null;

    return recordIndex.get(best.normKey) || null;
  };

  const getUnprefixedKey = (rawKey) => {
    const text = String(rawKey || "");
    if (/^(Cr|Dr)[A-Z]/.test(text)) return text.slice(2);
    return "";
  };

  const bindRecordToForm = (form, record, keyMap = {}) => {
    if (!form || !record || typeof record !== "object") return;
    const recordIndex = buildRecordIndex(record);
    const fields = Array.from(form.querySelectorAll("input, select, textarea"));

    fields.forEach((field) => {
      const rawKey = field.id || field.name;
      if (!rawKey) return;

      const mapped = keyMap[rawKey] || keyMap[field.id] || keyMap[field.name] || null;
      const normalizedFieldKey = normalizeKey(rawKey);
      let recordKey = null;

      // 1) explicit mapping (can be multiple candidates)
      for (const candidate of getMappedKeyCandidates(mapped)) {
        const k = recordIndex.get(normalizeKey(candidate));
        if (k) {
          recordKey = k;
          break;
        }
      }

      // 2) direct match by field key
      if (!recordKey) {
        recordKey = recordIndex.get(normalizeKey(rawKey)) || null;
      }

      // 2b) if UI uses Cr*/Dr* prefix but backend doesn't (common for interest fields)
      if (!recordKey) {
        const unprefixed = getUnprefixedKey(rawKey);
        if (unprefixed) {
          recordKey = recordIndex.get(normalizeKey(unprefixed)) || null;
        }
      }

      // 3) fuzzy match as last resort
      if (!recordKey) {
        recordKey = findBestFuzzyKey(recordIndex, normalizedFieldKey);
      }
      if (!recordKey) return;

      const value = record[recordKey];
      if (field.type === "checkbox") {
        field.checked = coerceBoolean(value);
        return;
      }
      if (field.dataset?.pbdDate != null || field.classList?.contains("pbd-date")) {
        const iso = formatDateISO(value);
        if (field._flatpickr) {
          field._flatpickr.setDate(iso || null, false, "Y-m-d");
        } else {
          field.value = iso;
        }
        return;
      }
      if (field.type === "date") {
        // Native date inputs require yyyy-mm-dd
        field.value = formatDateISO(value);
        return;
      }
      if (field.tagName === "SELECT") {
        const nextValue = value == null ? "" : String(value);
        addSelectOptionIfMissing(field, nextValue);
        field.value = nextValue;
        return;
      }

      const stringValue = value == null ? "" : String(value);
      const shouldFormatDate =
        /^\d{4}-\d{2}-\d{2}/.test(stringValue) &&
        /(date|from|to|createdon|modifiedon|supervisedon|accrual|accrued|applyon|applied|startdate|upto|up to)/i.test(
          rawKey
        );
      field.value = shouldFormatDate ? formatDateDisplay(stringValue) : stringValue;
    });
  };

  const setFieldFromRecord = (form, record, fieldId, candidates = []) => {
    const field = form?.querySelector?.(`#${CSS.escape(fieldId)}`);
    if (!field || !record || typeof record !== "object") return false;

    const recordIndex = buildRecordIndex(record);
    const attemptKeys = [fieldId, getUnprefixedKey(fieldId), ...candidates].filter(Boolean);
    let recordKey = null;

    for (const key of attemptKeys) {
      const k = recordIndex.get(normalizeKey(key));
      if (k) {
        recordKey = k;
        break;
      }
    }

    // As a last resort, scan for keys containing the important token
    if (!recordKey) {
      const token = normalizeKey(fieldId).replace(/^cr|^dr/, "");
      for (const normKey of recordIndex.keys()) {
        if (normKey && token && normKey.includes(token)) {
          recordKey = recordIndex.get(normKey);
          break;
        }
      }
    }

    if (!recordKey) return false;
    const value = record[recordKey];

    if (field.type === "checkbox") {
      field.checked = coerceBoolean(value);
      return true;
    }
    if (field.dataset?.pbdDate != null || field.classList?.contains("pbd-date")) {
      const iso = formatDateISO(value);
      if (field._flatpickr) {
        field._flatpickr.setDate(iso || null, false, "Y-m-d");
      } else {
        field.value = iso;
      }
      return true;
    }
    if (field.type === "date") {
      field.value = formatDateISO(value);
      return true;
    }
    if (field.tagName === "SELECT") {
      const nextValue = value == null ? "" : String(value);
      addSelectOptionIfMissing(field, nextValue);
      field.value = nextValue;
      return true;
    }

    const stringValue = value == null ? "" : String(value);
    const formatted = /^\d{4}-\d{2}-\d{2}/.test(stringValue) ? formatDateDisplay(stringValue) : stringValue;
    field.value = formatted;
    return true;
  };

  const buildBindReport = (form, record, keyMap = {}) => {
    const report = {
      matched: [],
      unmatched: [],
      availableKeys: record && typeof record === "object" ? Object.keys(record) : []
    };
    if (!form || !record || typeof record !== "object") return report;

    const recordIndex = buildRecordIndex(record);
    const fields = Array.from(form.querySelectorAll("input, select, textarea"));

    fields.forEach((field) => {
      const rawKey = field.id || field.name;
      if (!rawKey) return;

      const mapped = keyMap[rawKey] || keyMap[field.id] || keyMap[field.name] || null;
      const normalizedFieldKey = normalizeKey(rawKey);
      let recordKey = null;

      for (const candidate of getMappedKeyCandidates(mapped)) {
        const k = recordIndex.get(normalizeKey(candidate));
        if (k) {
          recordKey = k;
          break;
        }
      }

      if (!recordKey) recordKey = recordIndex.get(normalizeKey(rawKey)) || null;

      if (!recordKey) {
        const unprefixed = getUnprefixedKey(rawKey);
        if (unprefixed) {
          recordKey = recordIndex.get(normalizeKey(unprefixed)) || null;
        }
      }

      if (!recordKey) recordKey = findBestFuzzyKey(recordIndex, normalizedFieldKey);

      if (recordKey) report.matched.push({ field: rawKey, recordKey });
      else report.unmatched.push({ field: rawKey });
    });

    return report;
  };

  const extractMergedRecord = (response) => {
    const payload = response?.data && typeof response.data === "object" ? response.data : response;

    if (!payload || typeof payload !== "object") return null;

    // Prefer explicit handling for the legacy shape:
    //   data.Details     -> audit/meta row
    //   data.Details01   -> product-level data
    //   data.Details02   -> branch-level data (BankID, OurBranchID, ProductID, limits, dates...)
    // We want all three, but branch-level (Details02) should override product/audit values.
    const hasLegacyDetailsShape =
      (Array.isArray(payload.Details01) && payload.Details01.length > 0) ||
      (Array.isArray(payload.Details02) && payload.Details02.length > 0);

    if (hasLegacyDetailsShape) {
      const base = {};
      const d0 = Array.isArray(payload.Details) ? payload.Details[0] : payload.Details;
      const d01 = Array.isArray(payload.Details01) ? payload.Details01[0] : payload.Details01;
      const d02 = Array.isArray(payload.Details02) ? payload.Details02[0] : payload.Details02;

      if (d0 && typeof d0 === "object") Object.assign(base, d0);
      if (d01 && typeof d01 === "object") Object.assign(base, d01);
      if (d02 && typeof d02 === "object") Object.assign(base, d02);

      return Object.keys(base).length ? base : null;
    }

    // Generic fallback: merge Details, Details01, Details02... into one record.
    const merged = {};
    const detailKeys = Object.keys(payload || {}).filter((k) => /^Details\d*$/i.test(k));
    detailKeys.sort((a, b) => {
      const an = a.toLowerCase() === "details" ? 0 : Number(a.replace(/\D/g, "") || "0");
      const bn = b.toLowerCase() === "details" ? 0 : Number(b.replace(/\D/g, "") || "0");
      return an - bn;
    });

    const isNonEmpty = (v) => {
      if (v == null) return false;
      if (typeof v === "string") return v.trim() !== "";
      return true;
    };

    const mergeRecord = (record) => {
      if (!record || typeof record !== "object") return;
      for (const [k, v] of Object.entries(record)) {
        if (!k) continue;
        if (!isNonEmpty(merged[k]) && isNonEmpty(v)) {
          merged[k] = v;
        }
        if (merged[k] === undefined) merged[k] = v;
      }
    };

    for (const key of detailKeys) {
      const value = payload[key];
      if (Array.isArray(value)) {
        value.forEach((row) => mergeRecord(row));
      } else {
        mergeRecord(value);
      }
    }

    if (!Object.keys(merged).length && payload && typeof payload === "object") {
      Object.assign(merged, payload);
    }

    return Object.keys(merged).length ? merged : null;
  };

  const isNonEmptyValue = (value) => {
    if (value == null) return false;
    if (typeof value === "string") return value.trim() !== "";
    return true;
  };

  const setActionState = ({ canEdit, canDelete, canSave, canCancel }) => {
    const editBtn = document.querySelector("[data-pbd-action='edit']");
    const deleteBtn = document.querySelector("[data-pbd-action='delete']");
    const saveBtn = document.querySelector("[data-pbd-action='save']");
    const cancelBtn = document.querySelector("[data-pbd-action='cancel']");

    if (editBtn) editBtn.disabled = !canEdit;
    if (deleteBtn) deleteBtn.disabled = !canDelete;
    if (saveBtn) saveBtn.disabled = !canSave;
    if (cancelBtn) cancelBtn.disabled = !canCancel;
  };

  const isApiSuccess = (response) => {
    if (!response) return false;
    const status = response?.Details?.Status || response?.data?.Status || response?.code;
    return (
      response?.success === true ||
      response?.success === "true" ||
      response?.code === "00" ||
      response?.code === 0 ||
      status === "00" ||
      status === "0" ||
      status === 0
    );
  };

  const setButtonState = (button, enabled) => {
    if (!button) return;
    button.style.opacity = enabled ? "1" : "0.5";
    button.disabled = !enabled;
  };

  const parseNumberLike = (value) => {
    const text = String(value ?? "").trim();
    if (!text) return "";
    const cleaned = text.replace(/,/g, "");
    return cleaned;
  };

  const displayToIsoDate = (value) => {
    const text = String(value ?? "").trim();
    if (!text) return "";
    // Already ISO or ISO-ish
    const iso = formatDateISO(text);
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;

    // dd/Mon/yyyy -> yyyy-mm-dd
    const m = text.match(/^(\d{2})\/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\/(\d{4})$/i);
    if (m) {
      const dd = m[1];
      const mon = m[2].toLowerCase();
      const yyyy = m[3];
      const months = {
        jan: "01",
        feb: "02",
        mar: "03",
        apr: "04",
        may: "05",
        jun: "06",
        jul: "07",
        aug: "08",
        sep: "09",
        oct: "10",
        nov: "11",
        dec: "12"
      };
      const mm = months[mon];
      if (mm) return `${yyyy}-${mm}-${dd}`;
    }

    return text;
  };

  const clearFormFields = (form, { preserveKeys } = { preserveKeys: true }) => {
    if (!form) return;
    const preserved = {
      BranchId: preserveKeys ? String(document.getElementById("BranchId")?.value || "") : "",
      BranchName: preserveKeys ? String(document.getElementById("BranchName")?.value || "") : "",
      ProductId: preserveKeys ? String(document.getElementById("ProductId")?.value || "") : ""
    };

    const fields = form.querySelectorAll("input, select, textarea");
    fields.forEach((field) => {
      if (field.type === "checkbox") {
        field.checked = false;
        return;
      }
      if (field.tagName === "SELECT") {
        field.selectedIndex = 0;
        return;
      }
      if (!field.readOnly) {
        field.value = "";
      }
    });

    if (preserveKeys) {
      const b = document.getElementById("BranchId");
      const bn = document.getElementById("BranchName");
      const p = document.getElementById("ProductId");
      if (b) b.value = preserved.BranchId;
      if (bn) bn.value = preserved.BranchName;
      if (p) p.value = preserved.ProductId;
    }
  };

  const getFieldValue = (id) => String(document.getElementById(id)?.value ?? "").trim();
  const getCheckboxBit = (id) => (document.getElementById(id)?.checked ? 1 : 0);

  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const init = () => {
    const form = document.getElementById("product-branch-details-form");
    if (!form) return;

    const initDatePickers = () => {
      const fp = global.flatpickr;
      if (typeof fp !== "function") {
        console.warn("[PBD] flatpickr is not available; date dropdowns will not initialize.");
        return;
      }

      form.querySelectorAll("input[data-pbd-date], input.pbd-date").forEach((el) => {
        if (el._flatpickr) return;
        fp(el, {
          dateFormat: "Y-m-d", // value posted/saved
          altInput: true,
          altFormat: "d M Y", // friendly display
          allowInput: true
        });
      });
    };

    initDatePickers();

    const STATES = {
      DEFAULT: "default",
      NOT_FOUND: "notFound",
      FOUND: "found",
      ADD: "add",
      EDIT: "edit"
    };

    let state = STATES.DEFAULT;
    let currentRecord = null;

    const viewBtn = document.querySelector("[data-pbd-action='view']");
    const addBtn = document.querySelector("[data-pbd-action='add']");
    const editBtn = document.querySelector("[data-pbd-action='edit']");
    const deleteBtn = document.querySelector("[data-pbd-action='delete']");
    const saveBtn = document.querySelector("[data-pbd-action='save']");
    const cancelBtn = document.querySelector("[data-pbd-action='cancel']");

    const applyState = (nextState) => {
      state = nextState;

      // Mode label + form enablement
      if (state === STATES.ADD) {
        form.dataset.pbdMode = MODES.ADD;
        setModeLabel(MODES.ADD);
        toggleFormEnabled(form, true);
      } else if (state === STATES.EDIT) {
        form.dataset.pbdMode = MODES.EDIT;
        setModeLabel(MODES.EDIT);
        toggleFormEnabled(form, true);
      } else {
        form.dataset.pbdMode = MODES.VIEW;
        setModeLabel(MODES.VIEW);
        toggleFormEnabled(form, false);
      }

      // Button states (match Security Maintenance flow)
      switch (state) {
        case STATES.DEFAULT:
          setButtonState(viewBtn, true);
          setButtonState(addBtn, false);
          setButtonState(editBtn, false);
          setButtonState(deleteBtn, false);
          setButtonState(saveBtn, false);
          setButtonState(cancelBtn, true);
          break;
        case STATES.NOT_FOUND:
          setButtonState(viewBtn, true);
          setButtonState(addBtn, true);
          setButtonState(editBtn, false);
          setButtonState(deleteBtn, false);
          setButtonState(saveBtn, false);
          setButtonState(cancelBtn, true);
          break;
        case STATES.FOUND: {
          const canDelete =
            typeof global?.ProductLgLcService?.deleteProductBranchDetail === "function" ||
            typeof global?.ProductLgLcService?.deleteProductBranchDetails === "function";
          setButtonState(viewBtn, true);
          setButtonState(addBtn, false);
          setButtonState(editBtn, true);
          setButtonState(deleteBtn, Boolean(canDelete));
          setButtonState(saveBtn, false);
          setButtonState(cancelBtn, true);
          break;
        }
        case STATES.ADD:
        case STATES.EDIT:
          setButtonState(viewBtn, false);
          setButtonState(addBtn, false);
          setButtonState(editBtn, false);
          setButtonState(deleteBtn, false);
          setButtonState(saveBtn, true);
          setButtonState(cancelBtn, true);
          break;
      }
    };

    const fetchBranchDetail = async () => {
      if (!global.ServiceLoader?.loadProductLgLcService) {
        setFeedback("Service loader is not available on this page.", "warning");
        return;
      }

      const ourBranchId = String(document.getElementById("BranchId")?.value || "").trim();
      const productId = extractId(document.getElementById("ProductId")?.value);

      if (!ourBranchId || !productId) {
        setFeedback("Enter Branch ID and Product ID first.", "warning");
        return;
      }

      setFeedback("Loading branch details...", "info");

      await global.ServiceLoader.loadProductLgLcService();
      if (!global.ProductLgLcService?.getProductBranchDetail) {
        setFeedback("ProductLgLcService.getProductBranchDetail is not available.", "danger");
        return;
      }

      const session = global.AuthService?.getSession?.() || null;
      const operatorId = session?.operatorID || session?.OperatorID || session?.operatorId || "";

      const requestData = {
        OurBranchID: ourBranchId,
        ProductID: productId,
        OperatorID: operatorId || "JOY_WANJA",
        Direction: 0
      };

      const response = await global.ProductLgLcService.getProductBranchDetail(requestData);
      console.log("Product Branch Detail Response:", response);
      global.__pbdLastGetBranchDetailResponse = response;

      if (!response?.success) {
        currentRecord = null;
        setFeedback(response?.message || "Failed to load branch details.", "danger");
        applyState(STATES.DEFAULT);
        return;
      }

      // Look at raw payload shape to distinguish cases:
      //  - Product not maintained at all      => no Details01 row
      //  - Product maintained, no branch row  => Details01 present, Details02 missing/empty
      //  - Product + branch details present   => Details01 + Details02 row
      const dataPayload = response?.data && typeof response.data === "object" ? response.data : null;
      const details01 = dataPayload && dataPayload.Details01;
      const details02 = dataPayload && dataPayload.Details02;
      const hasProductRow = Array.isArray(details01) ? details01.length > 0 : !!details01;
      const hasBranchRow = Array.isArray(details02) ? details02.length > 0 : !!details02;

      // If the product itself is not maintained in its main module,
      // you are NOT allowed to add branch details here.
      if (!hasProductRow) {
        currentRecord = null;
        clearFormFields(form, { preserveKeys: true });
        setFeedback("Cannot add, Product is not maintained.", "warning");
        applyState(STATES.DEFAULT); // keeps Add disabled
        await uiAlert(
          "Cannot add, Product is not maintained for this Product ID. Maintain the product first in its main module.",
          { title: "Product Not Maintained", variant: "warning" }
        );
        return;
      }

      const record = extractMergedRecord(response);

      // Treat as "no record" unless the response clearly matches the requested
      // Branch + Product AND the SP returned a branch-detail row (Details02).
      const recordBranchId = String(record?.OurBranchID || record?.BranchID || "").trim();
      const recordProductRaw = record?.ProductID || record?.ProductId || record?.Product || "";
      const recordProductId = extractId(recordProductRaw);

      const branchMatches =
        !recordBranchId || String(recordBranchId).trim().toUpperCase() === String(ourBranchId).trim().toUpperCase();
      const productMatches =
        !recordProductId || String(recordProductId).trim().toUpperCase() === String(productId).trim().toUpperCase();

      const hasData = !!record && branchMatches && productMatches && hasBranchRow;

      if (!hasData) {
        currentRecord = null;
        clearFormFields(form, { preserveKeys: true });
        setFeedback("No record found. You can click Add to create it.", "warning");
        applyState(STATES.NOT_FOUND);
        await uiAlert(
          "Product Branch Detail not found. Click Add to create a new record for this Branch and Product.",
          { title: "Record Not Found", variant: "warning" }
        );
        return;
      }

      // Map request keys into existing fields if backend returns canonical names
      const keyMap = {
        BranchId: ["OurBranchID", "BranchID", "BranchId"],
        BranchName: ["BranchName", "OurBranchName", "BranchDesc", "BranchDescription"],
        ProductId: ["ProductID", "ProductId"],

        // Common checkbox name differences
        IsBlocked: ["IsBlocked", "BranchBlocked", "Blocked"],
        PrintPassbook: ["PrintPassbook", "PrintPassBook", "IsPrintPassbook"],

        // Common date name differences
        ValidFrom: ["ValidFrom", "ValidFromDate"],
        ValidTo: ["ValidTo", "ValidToDate"],

        // Limits / balances (prefer branch-level MaxAccountPerClient over product-level MaxClientAccounts)
        MaxActiveAccounts: ["MaxAccountPerClient", "MaxActiveAccounts", "MaxClientAccounts"],

        // Common LC/branch/product naming differences
        ProductTypes: ["ProductTypeID", "ProductType", "ProductTypes"],
        Currency: ["CurrencyID", "Currency", "CurrencyCode"],
        AccountPrefix: ["AccountPrefix", "AccountPrefixID", "Prefix"],

        // Credit interest fields sometimes come without Cr/Dr prefixes
        CrMinInterestPayable: ["CrMinInterestPayable", "MinInterestPayable", "MinCreditInterest"],
        CrMinInterestBearingBalance: ["CrMinInterestBearingBalance", "MinInterestBearingBalance", "MinIntBearingBalance"],
        CrNextInterestApplyOn: ["CrNextInterestApplyOn", "NextInterestApplyOn", "NextCrIntApplyDate"],
        CrInterestStartDate: ["CrInterestStartDate", "InterestStartDate", "CreditIntStartDate"],
        CrNextAccrualOn: ["CrNextAccrualOn", "NextAccrualOn", "NextCrIntAccrualDate"],

        CrInterestAppliedUpto: [
          "CrInterestAppliedUpto",
          "CrInterestAppliedUpTo",
          "InterestAppliedUpto",
          "InterestAppliedUptoCr",
          "InterestAppliedUptoCredit",
          "CrIntAppliedUpto",
          "CreditInterestAppliedUpto",
          "CreditInterestAppliedUpTo"
        ],
        CrInterestAccruedUpto: [
          "CrInterestAccruedUpto",
          "CrInterestAccruedUpTo",
          "InterestAccruedUpto",
          "InterestAccruedUptoCr",
          "InterestAccruedUptoCredit",
          "CrIntAccruedUpto",
          "CreditInterestAccruedUpto",
          "CreditInterestAccruedUpTo"
        ],

        DrMinInterestChargeable: ["DrMinInterestChargeable", "MinInterestChargeable", "MinDbInterest"],
        DrMinPenalInterest: ["DrMinPenalInterest", "MinPenalInterest", "MinPenaltyInterest"],
        DrNextInterestApplyOn: ["DrNextInterestApplyOn", "NextInterestApplyOn", "NextDbIntApplyDate"],
        DrInterestStartDate: ["DrInterestStartDate", "InterestStartDate", "DebitIntStartDate"],
        DrNextAccrualOn: ["DrNextAccrualOn", "NextAccrualOn", "NextDbAccrualDate"],
        DrNextLossProvisionOn: ["DrNextLossProvisionOn", "NextLossProvisionOn", "NextLossProvisionDate"],
        DrNextPenaltyApplyOn: ["DrNextPenaltyApplyOn", "NextPenaltyApplyOn", "NextPenaltyApplyDate"],

        DrEmiAccruedUpto: ["DrEmiAccruedUpto", "DrEMIAccruedUpto", "EmiAccruedUpto", "EMIAccruedUpto", "DbEMIAccruedDate"],
        DrInterestAppliedUpto: ["DrInterestAppliedUpto", "InterestAppliedUptoDr", "InterestAppliedUptoDebit"],
        DrLossProvisionUpto: ["DrLossProvisionUpto", "LossProvisionUpto", "LossProvisionUpTo", "DebitLossProvisionUpto"],
        DrInterestAccruedUpto: [
          "DrInterestAccruedUpto",
          "InterestAccruedUptoDr",
          "InterestAccruedUptoDebit",
          "DebitInterestAccruedUpto",
          "DebitInterestAccruedUpTo"
        ],
        DrPenaltyAppliedUpto: ["DrPenaltyAppliedUpto", "PenaltyAppliedUpto", "PenaltyAppliedUpTo"],

        // Audit fields
        CreatedBy: ["CreatedBy", "CreatedByID"],
        CreatedOn: ["CreatedOn", "CreatedDate"],
        ModifiedBy: ["ModifiedBy", "ModifiedByID"],
        ModifiedOn: ["ModifiedOn", "ModifiedDate"],
        SupervisedBy: ["SupervisedBy", "SupervisedByID"],
        SupervisedOn: ["SupervisedOn", "SupervisedDate"]
      };

      bindRecordToForm(form, record, keyMap);

      // Ensure accrued/applied date fields populate even when backend uses generic key names.
      const crAccruedOk = setFieldFromRecord(form, record, "CrInterestAccruedUpto", [
        "InterestAccruedUpto",
        "InterestAccruedUpTo",
        "InterestAccruedUptoDate",
        "CrInterestAccruedUptoDate",
        "CrIntAccruedUpto",
        "CrIntAccruedUpTo",
        "CrIntAccruedDate"
      ]);

      const drAccruedOk = setFieldFromRecord(form, record, "DrInterestAccruedUpto", [
        "InterestAccruedUpto",
        "InterestAccruedUpTo",
        "InterestAccruedUptoDate",
        "DrInterestAccruedUptoDate",
        "DrIntAccruedUpto",
        "DrIntAccruedUpTo",
        "DbIntAccruedDate"
      ]);

      setFieldFromRecord(form, record, "CrInterestAppliedUpto", [
        "InterestAppliedUpto",
        "InterestAppliedUpTo",
        "CrIntAppliedDate"
      ]);

      setFieldFromRecord(form, record, "DrInterestAppliedUpto", [
        "InterestAppliedUpto",
        "InterestAppliedUpTo",
        "DbIntAppliedDate"
      ]);

      setFieldFromRecord(form, record, "DrPenaltyAppliedUpto", ["PenaltyAppliedDate"]);
      setFieldFromRecord(form, record, "DrLossProvisionUpto", ["LossProvisionDate"]);

      if (!crAccruedOk) {
        console.warn("[PBD] Could not bind CrInterestAccruedUpto; check __pbdLastMergedRecord keys.");
      }
      if (!drAccruedOk) {
        console.warn("[PBD] Could not bind DrInterestAccruedUpto; check __pbdLastMergedRecord keys.");
      }
      const bindReport = buildBindReport(form, record, keyMap);
      global.__pbdLastMergedRecord = record;
      global.__pbdLastBindReport = bindReport;

      if (bindReport.unmatched.length) {
        console.groupCollapsed(`[PBD] Unmatched fields (${bindReport.unmatched.length})`);
        console.table(bindReport.unmatched);
        console.info("[PBD] Available record keys:", bindReport.availableKeys);
        console.groupEnd();
      }
      currentRecord = record;
      setFeedback("Branch details loaded.", "success");
      applyState(STATES.FOUND);
    };

    viewBtn?.addEventListener("click", async () => {
      applyState(STATES.DEFAULT);
      await fetchBranchDetail();
    });

    addBtn?.addEventListener("click", () => {
      // Business rule: you can't create a new product here.
      // Add is only valid after View has confirmed that the
      // selected Product already exists and has no branch details
      // for this BranchID/ProductID (state = NOT_FOUND).
      if (state !== STATES.NOT_FOUND) {
        setFeedback("Use View first. Add is only allowed when no branch details exist for this Product.", "warning");
        return;
      }

      currentRecord = null;
      clearFormFields(form, { preserveKeys: true });
      setFeedback("Add mode: enter branch details then Save.", "info");
      applyState(STATES.ADD);
    });

    editBtn?.addEventListener("click", async () => {
      if (!currentRecord) {
        await uiAlert("No record loaded to edit.", { title: "Edit", variant: "warning" });
        return;
      }
      setFeedback("Edit mode: update details then Save.", "info");
      applyState(STATES.EDIT);
    });

    deleteBtn?.addEventListener("click", async () => {
      if (!currentRecord) {
        await uiAlert("No record loaded to delete.", { title: "Delete", variant: "warning" });
        return;
      }

      const confirmed = await uiConfirm("Are you sure you want to delete this Product Branch Detail?", {
        title: "Confirm Delete",
        variant: "danger"
      });
      if (!confirmed) return;

      if (!global.ServiceLoader?.loadProductLgLcService) {
        setFeedback("Service loader is not available on this page.", "warning");
        return;
      }
      await global.ServiceLoader.loadProductLgLcService();

      const deleteFn =
        global.ProductLgLcService?.deleteProductBranchDetail || global.ProductLgLcService?.deleteProductBranchDetails;
      if (typeof deleteFn !== "function") {
        setFeedback(
          "Delete is not available yet (missing delete SP/service method).",
          "warning"
        );
        return;
      }

      try {
        setFeedback("Deleting...", "info");
        const session = global.AuthService?.getSession?.() || null;
        const operatorId = session?.operatorID || session?.OperatorID || session?.operatorId || "";
        const bankId =
          session?.bankID || session?.BankID || global.Environment?.BankID || global.Environment?.bankID || "00";
        const ourBranchId = getFieldValue("BranchId");
        const productId = extractId(getFieldValue("ProductId"));

        const requestData = {
          BankID: bankId,
          OurBranchID: ourBranchId,
          ProductID: productId,
          OperatorID: operatorId,
          UpdateCount: currentRecord?.UpdateCount || 0
        };

        const response = await deleteFn.call(global.ProductLgLcService, requestData);
        global.__pbdLastDeleteResponse = response;

        if (!isApiSuccess(response)) {
          const msg = response?.Details?.Message || response?.data?.Message || response?.message || "Delete failed.";
          setFeedback(msg, "danger");
          return;
        }

        clearFormFields(form, { preserveKeys: true });
        currentRecord = null;
        setFeedback("Deleted successfully.", "success");
        applyState(STATES.DEFAULT);
      } catch (err) {
        console.error("[PBD] Delete failed:", err);
        setFeedback("Delete failed. Check console for details.", "danger");
      }
    });

    saveBtn?.addEventListener("click", async () => {
      const ourBranchId = getFieldValue("BranchId");
      const productId = extractId(getFieldValue("ProductId"));
      if (!ourBranchId || !productId) {
        setFeedback("Branch ID and Product ID are required.", "warning");
        return;
      }

      if (!global.ServiceLoader?.loadProductLgLcService) {
        setFeedback("Service loader is not available on this page.", "warning");
        return;
      }

      setFeedback("Saving...", "info");

      await global.ServiceLoader.loadProductLgLcService();
      if (!global.ProductLgLcService?.addEditProductBranchDetail) {
        setFeedback("ProductLgLcService.addEditProductBranchDetail is not available.", "danger");
        return;
      }

      const session = global.AuthService?.getSession?.() || null;
      const operatorId = session?.operatorID || session?.OperatorID || session?.operatorId || "";
      const bankId =
        session?.bankID || session?.BankID || global.Environment?.BankID || global.Environment?.bankID || "00";

      const currentDateTime = getCurrentDateTime();
      
      // Helper to handle null date fields (return null instead of empty string)
      const getDateOrNull = (fieldId) => {
        const val = displayToIsoDate(getFieldValue(fieldId));
        return val || null;
      };
      
      const requestData = {
        BankID: bankId,
        OurBranchID: ourBranchId,
        ProductID: productId,
        ValidFrom: getDateOrNull("ValidFrom"),
        ValidTo: getDateOrNull("ValidTo"),
        MaxAccountPerClient: parseNumberLike(getFieldValue("MaxActiveAccounts")) || 1,
        MinimumBalance: parseNumberLike(getFieldValue("MinimumBalance")) || 0,
        PrintPassbook: getCheckboxBit("PrintPassbook"),
        

        // Credit
        MinIntBearingBalance: parseNumberLike(getFieldValue("CrMinInterestBearingBalance")) || 0,
        MinCreditInterest: parseNumberLike(getFieldValue("CrMinInterestPayable")) || 0,
        CreditIntStartDate: getDateOrNull("CrInterestStartDate") ||'',
        NextCrIntApplyDate: getDateOrNull("CrNextInterestApplyOn") ||'',
        NextCrIntAccrualDate: getDateOrNull("CrNextAccrualOn") ||'',

        // Debit
        MinDbInterest: parseNumberLike(getFieldValue("DrMinInterestChargeable")) || 0,
        MinPenaltyInterest: parseNumberLike(getFieldValue("DrMinPenalInterest")) || 0,
        DebitIntStartDate: getDateOrNull("DrInterestStartDate") ||'',
        NextDbIntApplyDate: getDateOrNull("DrNextInterestApplyOn") ||'',
        NextDbAccrualDate: getDateOrNull("DrNextAccrualOn") ||'',
        NextPenaltyApplyDate: getDateOrNull("DrNextPenaltyApplyOn") ||'',
        NextLossProvisionDate: getDateOrNull("DrNextLossProvisionOn") ||'',
        CreatedBy: state === STATES.ADD ? operatorId : (getFieldValue("CreatedBy") || operatorId),
        CreatedOn: state === STATES.ADD ? currentDateTime : (getDateOrNull("CreatedOn") || currentDateTime),
        ModifiedBy: operatorId,
        ModifiedOn: state === STATES.EDIT ? currentDateTime : null,
        SupervisedBy: getFieldValue("SupervisedBy") || null,
        UpdateCount: state === STATES.EDIT ? (currentRecord?.UpdateCount || 0) : 0,

        ActivateAll: getCheckboxBit("ActivateAll") || '0',
        ReportingTo: getFieldValue("ReportingTo") || null
      };
        console.log("Product Branch Detail Save Request Data:", JSON.stringify(requestData, null, 2));
      global.__pbdLastSaveRequestData = requestData;

      try {
        const response = await global.ProductLgLcService.addEditProductBranchDetail(requestData);
        global.__pbdLastSaveResponse = response;

        if (!isApiSuccess(response)) {
          const msg = response?.Details?.Message || response?.data?.Message || response?.message || "Save failed.";
          setFeedback(msg, "danger");
          return;
        }

        setFeedback("Saved successfully.", "success");
        // Refresh from backend to get latest UpdateCount + computed fields
        await fetchBranchDetail();
      } catch (err) {
        console.error("[PBD] Save failed:", err);
        setFeedback("Save failed. Check console for details.", "danger");
      }
    });

    cancelBtn?.addEventListener("click", () => {
      if (state === STATES.ADD) {
        clearFormFields(form, { preserveKeys: true });
        setFeedback("Cancelled.", "info");
        applyState(STATES.DEFAULT);
        return;
      }
      if (state === STATES.EDIT) {
        if (currentRecord) {
          // Re-bind original record
          bindRecordToForm(form, currentRecord, {});
        }
        setFeedback("Cancelled.", "info");
        applyState(currentRecord ? STATES.FOUND : STATES.DEFAULT);
        return;
      }
      // Default / NotFound / Found
      setFeedback(null);
      applyState(currentRecord ? STATES.FOUND : STATES.DEFAULT);
    });

    // Branch search (reuses shared BranchSearchService pattern from Forex Deal Front Office)
    const branchSearchBtn = document.querySelector('[data-pbd-search="branch"]');
    if (branchSearchBtn) {
      branchSearchBtn.addEventListener("click", async () => {
        if (!global.BranchSearchService || typeof global.BranchSearchService.openSearchModal !== "function") {
          console.error("[PBD] BranchSearchService not loaded or invalid.");
          setFeedback(
            "Branch search service is not available. Please ensure branchSearchService.js is loaded.",
            "danger"
          );
          return;
        }

        const branchIdInput = document.getElementById("BranchId");
        const branchNameInput = document.getElementById("BranchName");

        try {
          await global.BranchSearchService.openSearchModal((branchId, branchName) => {
            if (branchIdInput) branchIdInput.value = branchId;
            if (branchNameInput) branchNameInput.value = branchName;
            setFeedback("Branch selected. Click View to load details.", "info");
          });
        } catch (err) {
          console.error("[PBD] Branch search failed:", err);
          setFeedback("Branch search failed. Check console for details.", "danger");
        }
      });
    }

    // Product search (uses shared ProductSearchService over dbo.p_GetSearchResult)
    const productSearchBtn = document.querySelector('[data-pbd-search="product"]');
    if (productSearchBtn) {
      productSearchBtn.addEventListener("click", async () => {
        if (!global.ProductSearchService || typeof global.ProductSearchService.openSearchModal !== "function") {
          console.error("[PBD] ProductSearchService not loaded or invalid.");
          setFeedback(
            "Product search service is not available. Please ensure productSearchService.js is loaded.",
            "danger"
          );
          return;
        }

        const productIdInput = document.getElementById("ProductId");

        try {
          const session = global.AuthService?.getSession?.() || null;
          const bankId =
            session?.bankID || session?.BankID || global.Environment?.BankID || global.Environment?.bankID || "00";
          const advFilterString = `BankID='${bankId}'`;

          await global.ProductSearchService.openSearchModal(
            (productId) => {
              if (productIdInput) productIdInput.value = productId;
              setFeedback("Product selected. Click View to load details.", "info");
            },
            {
              moduleId: 2505,
              advFilterString,
              prevOrNext: 0,
              refId: null,
              searchKey: null,
              tableId: "ProductID",
              languageId: "en"
            }
          );
        } catch (err) {
          console.error("[PBD] Product search failed:", err);
          setFeedback("Product search failed. Check console for details.", "danger");
        }
      });
    }

    // Placeholder for any future search buttons
    document
      .querySelectorAll(
        '[data-pbd-search]:not([data-pbd-search="branch"]):not([data-pbd-search="product"])'
      )
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          setFeedback("Search is not wired yet (UI only).", "warning");
        });
      });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
    });

    applyState(STATES.DEFAULT);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
