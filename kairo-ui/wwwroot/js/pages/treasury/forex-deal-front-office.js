document.addEventListener("DOMContentLoaded", () => {
    // Utility: Show FX Action Result Modal
    function showFxActionResultModal(message, title = 'Action Result') {
      const modalEl = document.getElementById('fxActionResultModal');
      const modalTitle = document.getElementById('fxActionResultModalLabel');
      const modalBody = document.getElementById('fxActionResultModalBody');
      if (!modalEl || !window.bootstrap?.Modal) {
        alert(message);
        return;
      }
      if (modalTitle) modalTitle.textContent = title;
      if (modalBody) modalBody.textContent = message;
      const modal = window.bootstrap.Modal.getOrCreateInstance(modalEl, { backdrop: 'static' });
      modal.show();
    }

    // Utility: Show Delete Confirmation Modal
    function showDeleteConfirmationModal(dealNo, onConfirm) {
      let modal = document.getElementById('fxDeleteConfirmModal');
      
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'fxDeleteConfirmModal';
        modal.className = 'modal fade';
        modal.tabIndex = -1;
        modal.innerHTML = `
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header bg-primary text-white">
                <h5 class="modal-title">
                  <i class="bi bi-info-circle me-2"></i>Confirm Delete
                </h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body p-4">
                <p class="mb-0">Are you sure you want to delete deal <strong id="deleteDealNumber"></strong>?</p>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" id="confirmDeleteBtn">Delete</button>
              </div>
            </div>
          </div>`;
        document.body.appendChild(modal);
      }
      
      // Update deal number
      const dealNumberSpan = modal.querySelector('#deleteDealNumber');
      if (dealNumberSpan) dealNumberSpan.textContent = dealNo;
      
      // Set up confirm button
      const confirmBtn = modal.querySelector('#confirmDeleteBtn');
      const newConfirmBtn = confirmBtn.cloneNode(true);
      confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
      
      newConfirmBtn.addEventListener('click', () => {
        const bsModal = window.bootstrap.Modal.getOrCreateInstance(modal);
        bsModal.hide();
        if (onConfirm) onConfirm();
      });
      
      // Show modal
      const bsModal = window.bootstrap.Modal.getOrCreateInstance(modal, { backdrop: 'static' });
      bsModal.show();
    }

  const form = document.getElementById("fx-front-office-form");
  // Button selectors
  const viewBtn = document.querySelector('[data-fx-action="view"]');
  const addBtn = document.querySelector('[data-fx-action="add"]');
  const editBtn = document.querySelector('[data-fx-action="edit"]');
  const deleteBtn = document.querySelector('[data-fx-action="delete"]');
  const saveBtn = document.querySelector('[data-fx-action="save"]');
  const cancelBtn = document.querySelector('[data-fx-action="cancel"]');
  const searchBtn = document.querySelector('[data-fx-action="search"]');
  const branchSearchBtn = document.querySelector('#BranchId').nextElementSibling.nextElementSibling;
  const branchIdInput = document.getElementById('BranchId');
  const branchNameInput = document.getElementById('BranchName');

  branchSearchBtn.addEventListener('click', async () => {
    if (!window.BranchSearchService) {
      console.error('[Forex Deal FO] BranchSearchService not loaded');
      alert('Branch search service not available. Please ensure branchSearchService.js is loaded.');
      return;
    }
    
    await window.BranchSearchService.openSearchModal((branchId, branchName) => {
      branchIdInput.value = branchId;
      branchNameInput.value = branchName;
    });
  });

  const clientSearchBtn = document.querySelector('#ClientId').nextElementSibling;
  const clientIdInput = document.getElementById('ClientId');
  const clientNameInput = document.getElementById('ClientName');

  // ===== Client Search Button Handler =====
  clientSearchBtn.addEventListener('click', async () => {
    if (!window.ClientSearchService) {
      console.error('[Forex Deal FO] ClientSearchService not loaded');
      alert('Client search service not available. Please ensure clientSearchService.js is loaded.');
      return;
    }
    
    await window.ClientSearchService.openSearchModal((clientId, clientName) => {
      if (clientIdInput) clientIdInput.value = clientId;
      if (clientNameInput) clientNameInput.value = clientName;
    });
  });

  if (!form || !viewBtn || !addBtn || !editBtn || !deleteBtn || !saveBtn || !cancelBtn || !searchBtn || !branchSearchBtn || !clientSearchBtn) return;

  // State tracking
  let currentRecord = null;      // Holds the currently loaded record data
  let isEditMode = false;        // Tracks if in Add or Edit mode
  let recordNotFound = false;    // Tracks if last search returned no data
  let mode = 'default';          // 'default' | 'notFound' | 'found' | 'add' | 'edit'

  // ===== Button State Logic =====
  function setButtonState(btn, active) {
    if (!btn) return;
    btn.style.opacity = active ? '1' : '0.5';
    btn.disabled = !active;
  }

  function updateButtonStates() {
    switch (mode) {
      case 'default':
        setButtonState(viewBtn, true);
        setButtonState(addBtn, false);
        setButtonState(editBtn, false);
        setButtonState(deleteBtn, false);
        setButtonState(saveBtn, false);
        setButtonState(cancelBtn, true);
        break;

      case 'notFound':
        setButtonState(viewBtn, true);
        setButtonState(addBtn, true);
        setButtonState(editBtn, false);
        setButtonState(deleteBtn, false);
        setButtonState(saveBtn, false);
        setButtonState(cancelBtn, true);
        break;

      case 'found':
        // Ensure edit and delete are active when viewing a record
        setButtonState(viewBtn, true);
        setButtonState(addBtn, false);
        setButtonState(editBtn, true);
        setButtonState(deleteBtn, true);
        setButtonState(saveBtn, false);
        setButtonState(cancelBtn, true);
        break;

      case 'add':
        setButtonState(viewBtn, false);
        setButtonState(addBtn, false);
        setButtonState(editBtn, false);
        setButtonState(deleteBtn, false);
        setButtonState(saveBtn, true);
        setButtonState(cancelBtn, true);
        break;

      case 'edit':
        setButtonState(viewBtn, false);
        setButtonState(addBtn, false);
        setButtonState(editBtn, false);
        setButtonState(deleteBtn, false);
        setButtonState(saveBtn, true);
        setButtonState(cancelBtn, true);
        break;
    }

    isEditMode = (mode === 'add' || mode === 'edit');
    recordNotFound = (mode === 'notFound');
  }

  // ===== Form Field Enable/Disable =====
  const setFormFieldsReadonly = (readonly) => {
    // Select all input, select, textarea elements (not just those without readonly)
    const fields = form.querySelectorAll('input, select, textarea');
    fields.forEach(field => {
      // Skip DealNo and Behind The Scene fields
      if (field.id === 'DealNo' || 
          field.id === 'Status' || field.id === 'CreatedBy' || field.id === 'CreatedOn' ||
          field.id === 'ModifiedBy' || field.id === 'ModifiedOn' ||
          field.id === 'SupervisedBy' || field.id === 'SupervisedOn') {
        return;
      }
      if (readonly) {
        field.setAttribute('readonly', 'readonly');
        if (field.tagName === 'SELECT') {
          field.disabled = true;
        }
      } else {
        field.removeAttribute('readonly');
        if (field.tagName === 'SELECT') {
          field.disabled = false;
        }
      }
    });
  };

  // ===== Clear Form Fields =====
  function clearFormFields(preserveDealNo = false) {
    Array.from(form.elements).forEach((el) => {
      if (el.tagName === 'BUTTON') return;
      if (preserveDealNo && (el.id === 'DealNo' || el.name === 'DealNo')) return;
      if (el.type === 'checkbox') el.checked = false;
      else el.value = '';
    });
  }

  // ===== Cancel Handler =====
  function handleCancel() {
    if (mode === 'edit') {
      // Revert to last loaded record
      if (currentRecord) {
        bindRecordToForm(form, currentRecord, {});
        mode = 'found';
        setFormFieldsReadonly(true);
      }
    } else {
      // Clear form and return to default state
      clearFormFields(false);
      currentRecord = null;
      mode = 'default';
      setFormFieldsReadonly(true);
    }
    updateButtonStates();
    console.info('[Forex Deal FO] Cancelled, returned to:', mode);
  }

  // ===== Add Handler =====
  function handleAdd() {
    currentRecord = null;
    mode = 'add';
    clearFormFields(true); // Preserve DealNo when coming from notFound state
    setFormFieldsReadonly(false);
    updateButtonStates();
    console.info('[Forex Deal FO] Add mode activated.');
  }

  // ===== Edit Handler =====
  function handleEdit() {
    if (!currentRecord) {
      showFxActionResultModal('No record loaded to edit.', 'Edit');
      return;
    }
    mode = 'edit';
    setFormFieldsReadonly(false);
    updateButtonStates();
    console.info('[Forex Deal FO] Edit mode activated.');
  }

  // ===== Delete Handler =====
  async function handleDelete() {
    if (!currentRecord) {
      showFxActionResultModal('No record loaded to delete.', 'Delete');
      return;
    }

    const dealNo = document.getElementById('DealNo')?.value || 'this deal';
    
    // Show confirmation modal
    showDeleteConfirmationModal(dealNo, async () => {
      if (!window.ServiceLoader?.loadTreasuryService) {
        showFxActionResultModal('Service not loaded', 'Delete');
        return;
      }
      await window.ServiceLoader.loadTreasuryService();
      if (!window.TreasuryService?.deleteFxDealFrontOfficeCustom) {
        showFxActionResultModal('Delete service not available', 'Delete');
        return;
      }

      // Build requestData as per sample
      const requestData = {
        OurBranchID: currentRecord.OurBranchID || '0325',
        DealNumber: dealNo,
        UpdateCount: currentRecord.UpdateCount || 1
      };

      try {
        const response = await window.TreasuryService.deleteFxDealFrontOfficeCustom(requestData);
        console.log('[Forex Deal FO] DeleteFxDealFrontOfficeCustom response:', response);

        const status = response?.Details?.Status || response?.data?.Status || response?.code;
        const apiMessage = response?.Details?.Message || response?.data?.Message || response?.message;

        const isSuccess = response?.success === true || 
                         response?.success === 'true' ||
                         response?.code === '00' ||
                         response?.code === 0 ||
                         status === '00' ||
                         status === '0' ||
                         status === 0;

        if (!isSuccess) {
          console.error('[Forex Deal FO] DeleteFxDealFrontOfficeCustom failed:', response);
          const errorMsg = apiMessage || response?.message || response?.Message || response?.error || 'Unknown error';
          showFxActionResultModal(`Failed to delete deal: ${errorMsg}`, 'Delete');
          return;
        }

        showFxActionResultModal(`Deal ${dealNo} deleted successfully!`, 'Delete');
        console.info('[Forex Deal FO] Deal deleted successfully.');

        // Clear form and return to default state
        clearFormFields(false);
        currentRecord = null;
        mode = 'default';
        setFormFieldsReadonly(true);
        updateButtonStates();
      } catch (error) {
        console.error('[Forex Deal FO] Delete error:', error);
        showFxActionResultModal(`Error deleting deal: ${error.message || error}`, 'Delete Error');
      }
    });
  }

  // ===== Save Handler =====
  function parseDateForAPI(displayDate) {
    if (!displayDate) return '';
    const text = String(displayDate).trim();
    // Already in ISO format
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
      return text.substring(0, 10);
    }
    // Parse dd/MMM/yyyy format
    const match = text.match(/^(\d{1,2})\/(\w{3})\/(\d{4})/);
    if (!match) return '';
    const [, day, monthName, year] = match;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthIdx = months.findIndex(m => m.toLowerCase() === monthName.toLowerCase());
    if (monthIdx === -1) return '';
    const mm = String(monthIdx + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  }

  function getCurrentDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  async function handleSave() {
    // Follow security maintenance logic for save
    if (!window.ServiceLoader?.loadTreasuryService) {
      showFxActionResultModal('Service not loaded', 'Save');
      return;
    }
    await window.ServiceLoader.loadTreasuryService();
    if (!window.TreasuryService?.addEditFxDealFrontOfficeCustom) {
      showFxActionResultModal('Save service not available', 'Save');
      return;
    }

    // Get session/operator
    const session = window.AuthService?.getSession?.() || {};
    const operatorId = session?.operatorID || session?.OperatorID || session?.operatorId || 'JOY_WANJA';

    // Map form fields to API fields
    const getField = (id) => {
      const el = document.getElementById(id);
      return el ? el.value?.trim() : '';
    };

    const currentDateTime = getCurrentDateTime();
    const requestData = {
      DealNumber: getField('DealNo'),
      DealDate: parseDateForAPI(getField('DealDate')),
      OurBranchID: getField('BranchId'),
      ClientID: getField('ClientId'),
      TradeTypeID: getField('DealType'),
      TrxModeID: getField('TrxMode'),
      DealTypeID: getField('DealType'),
      ValueDate: parseDateForAPI(getField('ValueDate')),
      BaseCurrency: getField('BaseCurrencyId'),
      CounterCurrency: getField('CounterCurrencyId'),
      BaseAmount: getField('BaseAmount') ? parseFloat(getField('BaseAmount')) : 0,
      CounterAmount: getField('CounterAmount') ? parseFloat(getField('CounterAmount')) : 0,
      ExchangeRate: getField('ExchangeRate') ? parseFloat(getField('ExchangeRate')) : 0,
      MeanRate: getField('MeanRate') ? parseFloat(getField('MeanRate')) : 0,
      Profit: getField('ProfitLoss') ? parseFloat(getField('ProfitLoss')) : 0,
      Status: getField('Status'),
      CreatedBy: operatorId,
      CreatedOn: currentDateTime,
      ModifiedBy: operatorId,
      ModifiedOn: currentDateTime,
      SupervisedBy: '',
      SupervisedOn: '',
      UpdateCount: currentRecord?.UpdateCount || 1,
      DetailRecord: ''
    };

    try {
      const response = await window.TreasuryService.addEditFxDealFrontOfficeCustom(requestData);
      console.log('[Forex Deal FO] AddEditFxDealFrontOfficeCustom response:', response);

      // Log the full Details and data to see what the API actually returned
      if (response?.Details) {
        console.log('[Forex Deal FO] Details:', JSON.stringify(response.Details, null, 2));
      }
      if (response?.data) {
        console.log('[Forex Deal FO] data:', JSON.stringify(response.data, null, 2));
      }

      const status = response?.Details?.Status || response?.data?.Status || response?.code;
      let apiMessage = response?.Details?.Message || response?.data?.Message || response?.message;

      const isSuccess = response?.success === true || 
                       response?.success === 'true' ||
                       response?.code === '00' ||
                       response?.code === 0 ||
                       status === '00' ||
                       status === '0' ||
                       status === 0;

      if (!isSuccess) {
        console.error('[Forex Deal FO] AddEditFxDealFrontOfficeCustom failed:', response);
        let errorMsg = apiMessage || response?.message || response?.Message || response?.error || 'Unknown error';
        if (typeof errorMsg === 'string' && errorMsg.trim().toLowerCase() === 'not found') {
          errorMsg = 'Record could not be created. Please check that all required fields are filled and valid.';
        }
        showFxActionResultModal(`Failed to ${mode === 'add' ? 'create' : 'update'} deal: ${errorMsg}`, 'Save');
        return;
      }

      showFxActionResultModal(`Deal ${mode === 'add' ? 'created' : 'updated'} successfully!`, 'Save');
      console.info(`[Forex Deal FO] Deal ${mode === 'add' ? 'created' : 'updated'} successfully.`);

      currentRecord = requestData;
      mode = 'found';
      setFormFieldsReadonly(true);
      updateButtonStates();
    } catch (error) {
      console.error('[Forex Deal FO] Save error:', error);
      alert(`Error saving deal: ${error.message || error}`);
    }
  }

  // ===== Add Event Listeners =====
  addBtn.addEventListener('click', handleAdd);
  editBtn.addEventListener('click', handleEdit);
  deleteBtn.addEventListener('click', handleDelete);
  saveBtn.addEventListener('click', handleSave);
  cancelBtn.addEventListener('click', handleCancel);

  // ===== Initial State =====
  setFormFieldsReadonly(true);
  updateButtonStates();

  // ===== Helper Functions =====

  // Normalize keys for case-insensitive matching
  const normalizeKey = (value) => {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  };

  // Build index for fast lookup
  const buildRecordIndex = (record) => {
    const index = new Map();
    if (!record || typeof record !== "object") return index;
    Object.keys(record).forEach((key) => index.set(normalizeKey(key), key));
    return index;
  };

  // Convert various formats to boolean
  const coerceBoolean = (value) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    const text = String(value ?? "").trim().toLowerCase();
    return text === "y" || text === "yes" || text === "true" || text === "1";
  };

  // Extract ISO date from various formats
  const formatDateISO = (value) => {
    if (!value) return "";
    const text = String(value);
    const match = text.match(/^\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : text;
  };

  // Format date for display (dd/MMM/yyyy)
  const formatDateDisplay = (value) => {
    const iso = formatDateISO(value);
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
    const [yyyy, mm, dd] = iso.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthIdx = Math.max(0, Math.min(11, Number(mm) - 1));
    return `${dd}/${months[monthIdx]}/${yyyy}`;
  };

  // Add option to select if it doesn't exist
  const addSelectOptionIfMissing = (selectEl, value) => {
    if (!selectEl || selectEl.tagName !== "SELECT") return;
    const v = value == null ? "" : String(value);
    if (v === "") return;
    const exists = Array.from(selectEl.options).some((o) => o.value === v);
    if (exists) return;
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = /^\d{4}-\d{2}-\d{2}/.test(v) ? formatDateDisplay(v) : v;
    selectEl.appendChild(opt);
  };

  // Get array of key candidates from keyMap
  const getMappedKeyCandidates = (keyMapValue) => {
    if (!keyMapValue) return [];
    if (Array.isArray(keyMapValue)) return keyMapValue;
    return [keyMapValue];
  };

  // Extract main record from response
  const extractMergedRecord = (response) => {
    // For responses with Details01 as main dataset
    if (Array.isArray(response?.data?.Details01) && response.data.Details01.length) {
      return response.data.Details01[0];
    }

    // For responses with data as main dataset
    if (Array.isArray(response?.data) && response.data.length) return response.data[0];
    
    // For responses with Details as main dataset
    if (Array.isArray(response?.Details) && response.Details.length) return response.Details[0];

    // Fallback: merge multiple Details datasets
    const payload = response?.data && typeof response.data === "object" ? response.data : response;
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
        if (!isNonEmpty(merged[k]) && isNonEmpty(v)) merged[k] = v;
        if (merged[k] === undefined) merged[k] = v;
      }
    };

    for (const key of detailKeys) {
      const value = payload[key];
      if (Array.isArray(value)) value.forEach((row) => mergeRecord(row));
      else mergeRecord(value);
    }

    if (!Object.keys(merged).length && payload && typeof payload === "object") {
      Object.assign(merged, payload);
    }

    return Object.keys(merged).length ? merged : null;
  };

  // Bind record data to form fields
  const bindRecordToForm = (formEl, record, keyMap = {}) => {
    if (!formEl || !record || typeof record !== "object") return;

    const recordIndex = buildRecordIndex(record);
    const fields = Array.from(formEl.querySelectorAll("input, select, textarea"));

    fields.forEach((field) => {
      const rawKey = field.id || field.name;
      if (!rawKey) return;

      const mapped = keyMap[rawKey] || keyMap[field.id] || keyMap[field.name] || null;
      let recordKey = null;

      // Try mapped candidates first
      for (const candidate of getMappedKeyCandidates(mapped)) {
        const k = recordIndex.get(normalizeKey(candidate));
        if (k) {
          recordKey = k;
          break;
        }
      }

      // Fallback to direct match
      if (!recordKey) recordKey = recordIndex.get(normalizeKey(rawKey)) || null;
      if (!recordKey) return;

      const value = record[recordKey];
      
      // Handle checkbox
      if (field.type === "checkbox") {
        field.checked = coerceBoolean(value);
        return;
      }
      
      // Handle select
      if (field.tagName === "SELECT") {
        const nextValue = value == null ? "" : String(value);
        addSelectOptionIfMissing(field, nextValue);
        field.value = nextValue;
        return;
      }

      // Handle text/number/date inputs
      const stringValue = value == null ? "" : String(value);
      const shouldFormatDate =
        /^\d{4}-\d{2}-\d{2}/.test(stringValue) && 
        /(date|from|to|upto|tender|maturity|value)/i.test(rawKey);
      field.value = shouldFormatDate ? formatDateDisplay(stringValue) : stringValue;
    });
  };

  // ===== Populate Lookup Dropdowns =====
  const populateLookupDropdowns = async () => {
    if (!window.ServiceLoader?.loadLookupService) {
      console.warn("[Forex Deal FO] ServiceLoader.loadLookupService not available.");
      return;
    }

    await window.ServiceLoader.loadLookupService();
    if (!window.LookupService) {
      console.warn("[Forex Deal FO] LookupService not available.");
      return;
    }

    const lookupFields = form.querySelectorAll("[data-lookup]");
    const lookupPromises = [];

    lookupFields.forEach((field) => {
      const lookupKey = field.getAttribute("data-lookup");
      if (!lookupKey) return;

      // Convert lookupKey to method name (e.g., "buySellTypes" -> "getBuySellTypes")
      const methodName = `get${lookupKey.charAt(0).toUpperCase()}${lookupKey.slice(1)}`;
      const lookupMethod = window.LookupService[methodName];

      if (typeof lookupMethod !== "function") {
        console.warn(`[Forex Deal FO] LookupService.${methodName} not found for ${lookupKey}`);
        return;
      }

      const promise = lookupMethod.call(window.LookupService).then((options) => {
        if (!Array.isArray(options)) return;
        options.forEach((opt) => {
          const option = document.createElement("option");
          option.value = opt.value;
          option.textContent = opt.label;
          field.appendChild(option);
        });
      }).catch((err) => {
        console.error(`[Forex Deal FO] Failed to load ${lookupKey}:`, err);
      });

      lookupPromises.push(promise);
    });

    await Promise.all(lookupPromises);
    console.info("[Forex Deal FO] Lookup dropdowns populated.");
  };

  // Call on page load
  populateLookupDropdowns();

  // ===== View Button Handler =====
  const getSession = () => window.AuthService?.getSession?.() || null;

  viewBtn.addEventListener("click", async () => {
    // Load service
    if (!window.ServiceLoader?.loadTreasuryService) {
      console.error("[Forex Deal FO] ServiceLoader.loadTreasuryService is not available.");
      return;
    }

    await window.ServiceLoader.loadTreasuryService();
    if (!window.TreasuryService?.getFxDealFrontOfficeCustom) {
      console.error("[Forex Deal FO] TreasuryService.getFxDealFrontOfficeCustom is not available.");
      return;
    }

    // Get session data
    const session = getSession();
    const operatorId = session?.operatorID || session?.OperatorID || session?.operatorId || "";
    const ourBranchId =
      session?.ourBranchID ||
      session?.OurBranchID ||
      session?.branchID ||
      session?.BranchID ||
      window.Environment?.OurBranchID ||
      window.Environment?.ourBranchID ||
      "";

    // Get search criteria from form
    const dealNumber = String(document.getElementById("DealNo")?.value || "").trim();

    if (!dealNumber) {
      console.warn("[Forex Deal FO] Enter Deal Number first.");
      alert("Please enter a Deal Number to view.");
      return;
    }

    // Build request data based on sample request
    const requestData = {
      OurBranchID: '0325',
      DealNumber: dealNumber,
      OperatorID: 'JOY_WANJA',
      Direction: 0 // smallint - assuming 1 for view/forward direction
    };

    // Store for debugging
    window.__fxFrontOfficeLastRequestData = requestData;
    console.log("[Forex Deal FO] Request:", requestData);

    // Call service
    const response = await window.TreasuryService.getFxDealFrontOfficeCustom(requestData);
    window.__fxFrontOfficeLastResponse = response;
    console.log("[Forex Deal FO] Response:", response);

    if (!response?.success) {
      console.error("[Forex Deal FO] Request failed:", response);
      alert("Failed to load deal. Check console for details.");
      return;
    }

    // Extract and bind
    const record = extractMergedRecord(response);
    window.__fxFrontOfficeLastRecord = record;
    
    // Check if record has meaningful data (API returns empty object for non-existing records)
    const hasData = record && (
      record.DealNumber || 
      record.DealDate || 
      record.ClientID ||
      record.CreatedBy
    );
    
    if (!record || !hasData) {
      console.warn("[Forex Deal FO] No record returned or record is empty.");
      // UX: Not found state - clear form, preserve DealNo, enable Add
      clearFormFields(true); // preserve DealNo
      mode = 'notFound';
      currentRecord = null;
      updateButtonStates();
      showFxActionResultModal("Deal not found. You can click Add to create a new deal with this Deal Number.", "View");
      // Optionally, focus Add button
      addBtn?.focus();
      return;
    }

    // Record found successfully
    currentRecord = record;
    mode = 'found';
    setFormFieldsReadonly(true);
    updateButtonStates(); // Ensure edit/delete are enabled after view

    // Create keyMap for field mapping
    // Map form field IDs to potential backend field names
    const keyMap = {
      DealNo: ["DealNumber", "DealNo", "Deal_Number"],
      DealDate: ["DealDate", "Deal_Date"],
      BranchId: ["BranchID", "OurBranchID", "Branch_ID"],
      BranchName: ["BranchName", "Branch_Name"],
      ClientId: ["ClientID", "Client_ID"],
      BuySell: ["BuySell", "Buy_Sell", "BuySellID"],
      TrxMode: ["TrxMode", "TransactionMode", "TrxModeID"],
      DealType: ["DealType", "DealTypeID", "Deal_Type"],
      ValueDate: ["ValueDate", "Value_Date"],
      BaseCurrencyId: ["BaseCurrencyID", "Base_Currency_ID", "BaseCurrency"],
      CounterCurrencyId: ["CounterCurrencyID", "Counter_Currency_ID", "CounterCurrency"],
      BaseAmount: ["BaseAmount", "Base_Amount"],
      MeanRate: ["MeanRate", "Mean_Rate"],
      ExchangeRate: ["ExchangeRate", "Exchange_Rate"],
      ProfitLoss: ["ProfitLoss", "Profit_Loss", "PL"],
      CounterAmount: ["CounterAmount", "Counter_Amount"]
    };

    bindRecordToForm(form, record, keyMap);
    console.info("[Forex Deal FO] Record loaded.");
  });

  // ===== FX Deal No Search (Modal) =====
  // Open modal on search icon click
  searchBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    
    if (!window.DealSearchService) {
      console.error('[Forex Deal FO] DealSearchService not loaded');
      alert('Deal search service not available. Please ensure dealSearchService.js is loaded.');
      return;
    }
    
    await window.DealSearchService.openSearchModal({
      tableId: 'FXDealNo',
      moduleId: 6500,
      module: 'BOOK',
      title: 'FX Deal No',
      onSelectCallback: (dealNumber, record) => {
        const dealNoField = document.getElementById('DealNo');
        if (dealNoField) dealNoField.value = dealNumber;
        
        // Auto-load the record
        viewBtn?.click();
      }
    });
  });

  // ===== Branch Search Button Handler =====
  // branchSearchBtn.addEventListener('click', () => {
  //   const modalUrl = 'modules/treasury/common/branch-search-modal.html';
  //   const modal = window.open(modalUrl, 'branchSearch', 'width=800,height=600,scrollbars=yes,resizable=yes');
  //   if (modal) {
  //     modal.focus();
  //   }
  // });

  // ===== Client Search Button Handler =====
  // clientSearchBtn.addEventListener('click', () => {
  //   const modalUrl = 'modules/system-security/common/client-search.html';
  //   const modal = window.open(modalUrl, 'clientSearch', 'width=800,height=600,scrollbars=yes,resizable=yes');
  //   if (modal) {
  //     modal.focus();
  //   }
  // });

  // Listen for messages from the modals
  window.addEventListener('message', (event) => {
    if (event.data.type === 'DEAL_SELECTED') {
      const dealNoField = document.getElementById('DealNo');
      if (dealNoField) {
        dealNoField.value = event.data.dealNo;
      }
      // Optionally, trigger view or something
    } else if (event.data.type === 'CLIENT_SELECTED') {
      const clientIdField = document.getElementById('ClientId');
      if (clientIdField) {
        clientIdField.value = event.data.clientId;
      }
    } else if (event.data.type === 'BRANCH_SELECTED') {
      const branchIdField = document.getElementById('BranchId');
      const branchNameField = document.getElementById('BranchName');
      if (branchIdField) {
        branchIdField.value = event.data.branchId;
      }
      if (branchNameField) {
        branchNameField.value = event.data.branchName;
      }
    }
  });
});

