(function (global) {
  const controls = document.querySelectorAll('[data-window-action]');

  function closeParentModal() {
    try {
      if (window.parent && window.parent !== window) {
        const modalEl = window.parent.document.querySelector('.modal.show');
        if (modalEl && window.parent.bootstrap && window.parent.bootstrap.Modal) {
          const instance =
            window.parent.bootstrap.Modal.getInstance(modalEl) || new window.parent.bootstrap.Modal(modalEl);
          instance.hide();
          return;
        }
      }
    } catch (e) {
      // noop
    }

    try {
      window.close();
    } catch (e) {
      // noop
    }
  }

  function minimize() {
    document.body.classList.add('cm-window-minimized');
  }

  function restore() {
    document.body.classList.remove('cm-window-minimized');
  }

  controls.forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-window-action');
      if (action === 'close') closeParentModal();
      if (action === 'minimize') minimize();
      if (action === 'restore') restore();
    });
  });

  // Form interactions
  const actionButtons = document.querySelectorAll('.btn[data-action]');
  actionButtons.forEach((btn) => {
    btn.addEventListener('click', function () {
      const action = this.dataset.action;
      console.log(`Action triggered: ${action}`);
      // Add your action logic here
    });
  });

  // Add Event button functionality
  const addEventBtn = document.querySelector('[data-add-event]');
  addEventBtn?.addEventListener('click', function () {
    // Add logic to show add event modal or form
    console.log('Add Event clicked');
  });

  // Mode and button logic (mirrors Static Data · Location behavior)
  const MODES = {
    VIEW: 'View',
    ADD: 'Add',
    UPDATE: 'Update'
  };

  const arState = {
    mode: MODES.VIEW,
    hasLoaded: false,
    updateCount: 0,
    productTypesLoaded: false,
    canAddFromId: false,
    selectedEvents: [] // Store events during ADD mode
  };

  function setToast(message, variant = 'success') {
    // Prefer SweetAlert2 toast if available
    if (global.Swal) {
      const icon =
        variant === 'success'
          ? 'success'
          : variant === 'danger'
            ? 'error'
            : variant === 'warning'
              ? 'warning'
              : 'info';

      global.Swal.fire({
        icon,
        title: message,
        timer: 2500,
        showConfirmButton: false,
        position: 'top-end',
        toast: true,
        timerProgressBar: true
      });
      return;
    }

    // Fallback to Bootstrap-style toast in-page
    const toast = qs('#formToast');
    if (!toast) return;

    toast.classList.remove('d-none', 'text-bg-success', 'text-bg-danger', 'text-bg-warning', 'text-bg-info');
    const bg =
      variant === 'success'
        ? 'text-bg-success'
        : variant === 'danger'
          ? 'text-bg-danger'
          : variant === 'warning'
            ? 'text-bg-warning'
            : 'text-bg-info';
    toast.classList.add(bg);

    const body = qs('#formToastBody', toast) || toast.querySelector('.toast-body') || toast;
    body.textContent = message;

    toast.classList.add('show');
    global.setTimeout(() => {
      toast.classList.remove('show');
      toast.classList.add('d-none');
    }, 2500);
  }

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function isApiSuccess(response) {
    if (!response) return false;
    const status = response?.Details?.Status || response?.data?.Status || response?.code;
    return (
      response?.success === true ||
      response?.success === 'true' ||
      response?.code === '00' ||
      response?.code === 0 ||
      status === '00' ||
      status === '0' ||
      status === 0
    );
  }

  function setButtonDisabled(buttonEl, disabled) {
    if (!buttonEl) return;
    const isDisabled = !!disabled;
    buttonEl.disabled = isDisabled;
    if (isDisabled) {
      buttonEl.setAttribute('disabled', '');
      buttonEl.setAttribute('aria-disabled', 'true');
    } else {
      buttonEl.removeAttribute('disabled');
      buttonEl.setAttribute('aria-disabled', 'false');
    }
  }

  function getArActionButtons() {
    return {
      view: qs('[data-shell-mode="View"]'),
      add: qs('[data-shell-mode="Add"]'),
      edit: qs('[data-shell-mode="Update"]'),
      del: qs('[data-ar-action="delete"]'),
      save: qs('[data-ar-action="save"]'),
      cancel: qs('[data-ar-action="cancel"]'),
      search: qs('[data-ar-action="search"]')
    };
  }

  function clearAccountingRuleForm() {
    const root = qs('.cm-window-content') || document;
    const fields = qsa('input, select, textarea', root);
    fields.forEach((field) => {
      if (field.id === 'AccountingRuleId') return;
      if (field.type === 'checkbox') {
        field.checked = false;
        return;
      }
      field.value = '';
    });

    // Clear events grid as well
    renderApplicableEventsGrid([]);

    arState.hasLoaded = false;
    arState.updateCount = 0;
    arState.selectedEvents = [];
  }

  function setArMode(nextMode, { initial = false } = {}) {
    arState.mode = nextMode;

    const root = qs('.cm-window-content') || document;

    qsa('input, select, textarea', root).forEach((field) => {
      if (field.hasAttribute('readonly')) {
        field.disabled = true;
        return;
      }
      // In UPDATE mode, only Description field is editable
      if (nextMode === MODES.UPDATE) {
        field.disabled = field.id !== 'Description';
        return;
      }
      // AccountingRuleId is editable in VIEW and ADD modes (for searching/entering new ID)
      if (field.id === 'AccountingRuleId') {
        field.disabled = false;
        return;
      }
      // In ADD mode, all fields are editable except readonly ones
      if (nextMode === MODES.ADD) {
        field.disabled = false;
        return;
      }
      // In VIEW mode, all fields are disabled
      field.disabled = true;
    });

    updateArActionButtons();
  }

  function areRequiredFieldsFilledInAddMode() {
    if (arState.mode !== MODES.ADD) return true; // Not in ADD mode, don't block

    const descEl = document.getElementById('Description');
    const productTypesEl = document.getElementById('ProductTypes');

    const description = (descEl?.value || '').trim();
    const productTypeId = (productTypesEl?.value || '').trim();

    // Both Description and Product Type must be filled
    return description !== '' && productTypeId !== '';
  }

  function updateArActionButtons() {
    const { view, add, edit, del, save, cancel } = getArActionButtons();

    const isEditable = arState.mode === MODES.ADD || arState.mode === MODES.UPDATE;
    const canCancelInView = arState.hasLoaded || arState.canAddFromId;
    const requiredFieldsFilled = areRequiredFieldsFilledInAddMode();

    // View button: disabled in VIEW mode when a record is loaded (already viewing)
    setButtonDisabled(view, arState.mode === MODES.VIEW && arState.hasLoaded);

    // Add button: enabled in VIEW mode only when record not found (canAddFromId)
    setButtonDisabled(add, !(arState.mode === MODES.VIEW && arState.canAddFromId));

    // Edit button: enabled in VIEW mode when a record is loaded
    setButtonDisabled(edit, !(arState.mode === MODES.VIEW && arState.hasLoaded));

    // Delete button: enabled in VIEW mode when a record is loaded
    setButtonDisabled(del, !(arState.mode === MODES.VIEW && arState.hasLoaded));

    // Save button: enabled in ADD/UPDATE mode, and in ADD mode only if required fields are filled
    setButtonDisabled(save, !isEditable || (arState.mode === MODES.ADD && !requiredFieldsFilled));

    // Cancel button: enabled in ADD/UPDATE mode, or in VIEW mode when a record is loaded or ready to add
    setButtonDisabled(cancel, !(isEditable || (arState.mode === MODES.VIEW && canCancelInView)));
  }

  function extractAccountingRuleRecord(response) {
    const payload = response?.data && typeof response.data === 'object' ? response.data : response;

    if (!payload) return null;

    // 1) Explicitly prefer Details01 as the main record (matches product pages)
    if (Array.isArray(payload.Details01)) {
      if (payload.Details01.length) {
        return payload.Details01[0];
      }
    } else if (payload.Details01 && typeof payload.Details01 === 'object') {
      return payload.Details01;
    }

    // 2) As a very limited fallback, allow a plain array where
    //    at least one element looks like an Accounting Rule record
    if (Array.isArray(payload)) {
      const candidate = payload.find((row) =>
        row && typeof row === 'object' && (row.AcRuleID || row.AccountingRuleID || row.ACRuleID)
      );
      return candidate || null;
    }

    // If there's no Details01 and no plausible accounting-rule row, treat as not found
    return null;
  }

  function formatApiDate(value) {
    if (!value) return '';
    // Use GlobalUtils.formatDate for consistent date formatting (DD MMM YYYY)
    if (window.GlobalUtils && window.GlobalUtils.formatDate) {
      return window.GlobalUtils.formatDate(value);
    }
    // Fallback if GlobalUtils not available
    const text = String(value);
    const match = text.match(/^\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : text;
  }

  function ensureSelectOption(selectEl, value, label) {
    if (!selectEl || selectEl.tagName !== 'SELECT') return;
    const v = value == null ? '' : String(value);
    if (!v) return;
    const exists = Array.from(selectEl.options).some((o) => o.value === v);
    if (exists) return;
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = label && String(label).trim() !== '' ? String(label) : v;
    selectEl.appendChild(opt);
  }

  async function loadProductTypes() {
    if (arState.productTypesLoaded) {
      console.log('[AR] Product types already loaded');
      return;
    }

    const productTypesEl = document.getElementById('ProductTypes');
    if (!productTypesEl) return;

    if (!global.ServiceLoader?.loadProductLgLcService) {
      console.warn('[AR] ServiceLoader not available for loading product types');
      return;
    }

    try {
      await global.ServiceLoader.loadProductLgLcService();

      if (!global.ProductLgLcService?.getProductTypes) {
        console.error('[AR] ProductLgLcService.getProductTypes is not available.');
        return;
      }

      const requestData = { CodeID: 'ProductTypeID' };
      console.log('[AR] Fetching product types with request:', requestData);

      const response = await global.ProductLgLcService.getProductTypes(requestData);
      console.log('[AR] Product types response:', response);

      if (!response?.success) {
        console.error('[AR] Product types fetch failed:', response);
        return;
      }

      // Extract product type options from response
      let productTypes = [];
      const payload = response?.data && typeof response.data === 'object' ? response.data : response;

      // Check for Details array (primary structure)
      if (Array.isArray(payload?.Details)) {
        productTypes = payload.Details;
      } else if (Array.isArray(payload?.Details01)) {
        productTypes = payload.Details01;
      } else if (Array.isArray(payload?.Details02)) {
        productTypes = payload.Details02;
      } else if (Array.isArray(payload)) {
        productTypes = payload;
      }

      console.log('[AR] Extracted product types:', productTypes);

      // Map to { value, label, order } and sort by order
      const options = productTypes
        .map((pt) => ({
          value: pt.SubCodeID || pt.Value || pt.CodeID || pt.ProductTypeID || pt.ID || '',
          label: pt.CodeDescription || pt.Description || pt.Label || pt.ProductTypeName || pt.Name || '',
          order: Number(pt.DisplayOrder ?? pt.Order ?? pt.Sequence ?? 999)
        }))
        .filter((opt) => opt.value && opt.label)
        .sort((a, b) => a.order - b.order);

      console.log('[AR] Mapped and sorted options:', options);

      // Clear existing options (keep --Select--)
      while (productTypesEl.options.length > 1) {
        productTypesEl.remove(1);
      }

      // Add options
      options.forEach((opt) => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        productTypesEl.appendChild(option);
      });

      arState.productTypesLoaded = true;
      console.log('[AR] Product types loaded successfully with', options.length, 'options');

      // Bind ProductTypes change listener for ADD mode (only once)
      if (!productTypesEl._changeListenerAdded) {
        productTypesEl.addEventListener('change', () => {
          if (arState.mode === MODES.ADD) {
            const selectedProductTypeId = (productTypesEl?.value || '').trim();
            if (selectedProductTypeId) {
              fetchApplicableEventsByProductType(selectedProductTypeId);
            } else {
              arState.selectedEvents = [];
            }
          }
          // Update button states when product type changes
          updateArActionButtons();
        });
        productTypesEl._changeListenerAdded = true;
      }
    } catch (err) {
      console.error('[AR] Error loading product types:', err);
    }
  }

  async function fetchApplicableEventsByProductType(productTypeId) {
    if (!global.ServiceLoader?.loadProductAcRuleService) {
      console.log('[AR] ProductAcRule service not available for events fetch');
      return;
    }

    try {
      await global.ServiceLoader.loadProductLgLcService();

      if (!global.ProductLgLcService?.getProductAcRule) {
        console.error('[AR] ProductLgLcService not available for events fetch');
        return;
      }

      const session = global.AuthService?.getSession?.() || null;
      const bankId =
        session?.bankID || session?.BankID || global.Environment?.BankID || global.Environment?.bankID || '00';
      const branchId =
        session?.branchID || session?.BranchID || global.Environment?.BranchID || global.Environment?.branchID ||
        '1201';
      const operatorId = session?.operatorID || session?.OperatorID || session?.operatorId || 'JOY_WANJA';

      const requestData = {
        BankID: bankId,
        OurBranchID: branchId,
        ProductTypeID: productTypeId,
        OperatorID: operatorId
      };

      console.log('[AR] Fetching events for ProductType:', requestData);

      const response = await global.ProductLgLcService.getProductAcRule(requestData);

      if (!response?.success) {
        console.warn('[AR] Failed to fetch events for product type:', productTypeId);
        arState.selectedEvents = [];
        return;
      }

      const events = extractApplicableEvents(response);
      arState.selectedEvents = events;
      console.log('[AR] Events fetched for ProductType:', events);
      // Note: Not displaying in grid during ADD mode - events are stored but not rendered
    } catch (err) {
      console.error('[AR] Error fetching events for product type:', err);
      arState.selectedEvents = [];
    }
  }

  function bindAccountingRuleForm(record) {
    if (!record || typeof record !== 'object') return;

    const acRuleIdEl = document.getElementById('AccountingRuleId');
    const descEl = document.getElementById('Description');
    const productTypesEl = document.getElementById('ProductTypes');

    const createdByEl = document.getElementById('CreatedBy');
    const modifiedByEl = document.getElementById('ModifiedBy');
    const supervisedByEl = document.getElementById('SupervisedBy');
    const createdOnEl = document.getElementById('CreatedOn');
    const modifiedOnEl = document.getElementById('ModifiedOn');
    const supervisedOnEl = document.getElementById('SupervisedOn');

    const acRuleId = record.AcRuleID ?? record.AccountingRuleID ?? record.ACRuleID ?? '';
    if (acRuleIdEl) acRuleIdEl.value = acRuleId;

    const description = record.Description ?? record.RuleDescription ?? '';
    if (descEl) descEl.value = description;

    const productTypeId = record.ProductTypeID ?? record.ProductType ?? '';
    const productTypeName = record.ProductTypeName || record.ProductTypeDescription || productTypeId;
    if (productTypesEl) {
      if (productTypeId) {
        // If it's a SELECT element (dropdown), set the value to the ID
        // The dropdown will display the label automatically
        if (productTypesEl.tagName === 'SELECT') {
          ensureSelectOption(
            productTypesEl,
            productTypeId,
            productTypeName
          );
          productTypesEl.value = String(productTypeId);
          console.log('[AR] Set ProductTypes select to ID:', productTypeId, '(label:', productTypeName, ')');
        }
        // If it's an INPUT element (text field), set it to show the name instead of ID
        else {
          productTypesEl.value = productTypeName;
          console.log('[AR] Set ProductTypes input to name:', productTypeName);
        }
      } else {
        productTypesEl.value = '';
      }
    }

    if (createdByEl) createdByEl.value = record.CreatedBy == null ? '' : String(record.CreatedBy);
    if (modifiedByEl) modifiedByEl.value = record.ModifiedBy == null ? '' : String(record.ModifiedBy);
    if (supervisedByEl) supervisedByEl.value = record.SupervisedBy == null ? '' : String(record.SupervisedBy);

    if (createdOnEl) createdOnEl.value = formatApiDate(record.CreatedOn);
    if (modifiedOnEl) modifiedOnEl.value = formatApiDate(record.ModifiedOn);
    if (supervisedOnEl) supervisedOnEl.value = formatApiDate(record.SupervisedOn);

    const updateCount = Number(record.UpdateCount ?? record.updateCount ?? 0) || 0;
    arState.updateCount = updateCount;
    arState.canAddFromId = false; // Disable Add button since record was found
  }

  function extractApplicableEvents(response) {
    const payload = response?.data && typeof response.data === 'object' ? response.data : response;
    if (!payload) return [];

    console.log('[AR] Extracting events from payload:', payload);

    // Check for Details02 first (primary location for events in new response format)
    if (Array.isArray(payload.Details02)) {
      const filtered = payload.Details02.filter((e) => e && e.EventID && e.EventID !== 0);
      if (filtered.length > 0) {
        console.log('[AR] Found events in Details02:', filtered);
        return filtered;
      }
      // Return Details02 even if all have EventID === 0 or empty (in case API structure changed)
      if (payload.Details02.length > 0) {
        console.log('[AR] Details02 array exists, returning all items:', payload.Details02);
        return payload.Details02;
      }
    }

    // Fallback: Check for Details property (older format)
    if (Array.isArray(payload.Details)) {
      const filtered = payload.Details.filter((e) => e && e.EventID && e.EventID !== 0);
      if (filtered.length) {
        console.log('[AR] Found events in Details:', filtered);
        return filtered;
      }
      if (payload.Details.length > 0) {
        console.log('[AR] Details array exists but no valid EventID, returning as-is:', payload.Details);
        return payload.Details;
      }
    }

    // Check for ApplicableEvents property
    if (Array.isArray(payload.ApplicableEvents)) {
      const filtered = payload.ApplicableEvents.filter((e) => e && e.EventID && e.EventID !== 0);
      if (filtered.length) {
        console.log('[AR] Found events in ApplicableEvents:', filtered);
        return filtered;
      }
    }

    // Check for Events property
    if (Array.isArray(payload.Events)) {
      const filtered = payload.Events.filter((e) => e && e.EventID && e.EventID !== 0);
      if (filtered.length) {
        console.log('[AR] Found events in Events:', filtered);
        return filtered;
      }
    }

    // Check if response.data.Details02 exists (nested path)
    if (response?.data?.Details02 && Array.isArray(response.data.Details02)) {
      const filtered = response.data.Details02.filter((e) => e && e.EventID && e.EventID !== 0);
      if (filtered.length) {
        console.log('[AR] Found events in response.data.Details02:', filtered);
        return filtered;
      }
    }

    // Check if payload itself is an array of events
    if (Array.isArray(payload)) {
      const filtered = payload.filter((e) => e && e.EventID && e.EventID !== 0);
      if (filtered.length) {
        console.log('[AR] Found events in payload array:', filtered);
        return filtered;
      }
    }

    console.log('[AR] extractApplicableEvents - no valid events found in response');
    return [];
  }

  function renderApplicableEventsGrid(events) {
    const tbody = document.getElementById('ApplicableEventsBody');
    if (!tbody) return;

    // Clear current rows
    while (tbody.firstChild) {
      tbody.removeChild(tbody.firstChild);
    }

    const rows = Array.isArray(events) ? events : [];
    if (!rows.length) {
      const tr = document.createElement('tr');
      tr.setAttribute('data-empty-row', '');
      const td = document.createElement('td');
      td.colSpan = 3;
      td.className = 'text-center py-4 text-muted';
      td.innerHTML =
        '<i class="bi bi-inbox display-6 d-block mb-2"></i>' +
        'No records to display.';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    rows.forEach((row) => {
      const tr = document.createElement('tr');

      const eventIdTd = document.createElement('td');
      eventIdTd.textContent = row.EventID ?? '';
      tr.appendChild(eventIdTd);

      const descTd = document.createElement('td');
      // Try multiple field names for description
      const description = row.EventDescription ?? row.Description ?? row.Event ?? '';
      descTd.textContent = description;
      tr.appendChild(descTd);

      const actionsTd = document.createElement('td');
      actionsTd.style.width = '15%';
      actionsTd.className = 'text-nowrap';

      const edited = Number(row.Edited ?? row.Configured ?? 0) === 1;
      const badge = document.createElement('span');
      badge.className = edited ? 'badge bg-success-subtle text-success' : 'badge bg-secondary-subtle text-muted';
      badge.textContent = edited ? 'Configured' : 'Default';
      actionsTd.appendChild(badge);

      tr.appendChild(actionsTd);
      tbody.appendChild(tr);
    });
  }

  function handleAccountingRuleNotFound(acRuleId) {
    // Clear form but keep the AccountingRuleId so user can proceed via buttons.
    clearAccountingRuleForm();

    const idText = acRuleId ? `Accounting Rule '${acRuleId}'` : 'Record';
    const message = `${idText} does not exist. Use Add to create it.`;

    arState.hasLoaded = false;
    arState.canAddFromId = true; // Enable Add button since record not found
    setArMode(MODES.VIEW);
    setToast(message, 'warning');
  }

  async function fetchAccountingRule() {
    if (!global.ServiceLoader?.loadProductLgLcService) {
      console.warn('ServiceLoader.loadProductLgLcService is not available on this page.');
      setToast('Service not available on this page.', 'danger');
      return;
    }

    const acRuleIdInput = document.getElementById('AccountingRuleId');
    const acRuleId = (acRuleIdInput?.value || '').trim();

    if (!acRuleId) {
      setToast('Enter an Accounting Rule ID first.', 'warning');
      return;
    }

    try {
      await global.ServiceLoader.loadProductLgLcService();

      if (!global.ProductLgLcService?.getProductAcRule) {
        console.error('ProductLgLcService.getProductAcRule is not available.');
        setToast('Accounting Rule service is not available.', 'danger');
        return;
      }

      const session = global.AuthService?.getSession?.() || null;
      const bankId =
        session?.bankID || session?.BankID || global.Environment?.BankID || global.Environment?.bankID || '00';
      const branchId =
        session?.branchID || session?.BranchID || global.Environment?.BranchID || global.Environment?.branchID ||
        '1201';
      const operatorId = session?.operatorID || session?.OperatorID || session?.operatorId || 'JOY_WANJA';

      const requestData = {
        BankID: bankId,
        OurBranchID: branchId,
        AcRuleID: acRuleId,
        OperatorID: operatorId
      };

      console.log('ProductLgLcService.getProductAcRule request', requestData);

      const response = await global.ProductLgLcService.getProductAcRule(requestData);
      global.__acRuleLastGetResponse = response;

      if (!response?.success) {
        console.error('getProductAcRule failed:', response);
        handleAccountingRuleNotFound(acRuleId);
        return;
      }

      console.log('ProductLgLcService.getProductAcRule response', response.data);

      const record = extractAccountingRuleRecord(response);
      if (!record || typeof record !== 'object' || Array.isArray(record)) {
        console.warn('No Accounting Rule record found in response payload.');
        handleAccountingRuleNotFound(acRuleId);
        return;
      }

      bindAccountingRuleForm(record);
      const events = extractApplicableEvents(response);
      renderApplicableEventsGrid(events);
      arState.hasLoaded = true;
      setArMode(MODES.VIEW);
      setToast('Accounting Rule loaded.', 'success');
    } catch (err) {
      console.error('Error calling getProductAcRule:', err);
      setToast('Error loading Accounting Rule. Check console for details.', 'danger');
    }
  }
  function bindArModeButtons() {
    qsa('[data-shell-mode]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const next = btn.getAttribute('data-shell-mode');
        if (!next || !MODES[next.toUpperCase()]) return;

        const nextMode = MODES[next.toUpperCase()];

        if (nextMode === MODES.VIEW) {
          const acRuleId = (qs('#AccountingRuleId')?.value || '').trim();
          if (acRuleId) {
            await fetchAccountingRule();
          } else {
            setArMode(MODES.VIEW);
          }
          return;
        }

        if (nextMode === MODES.ADD) {
          clearAccountingRuleForm();
          setArMode(MODES.ADD);
          loadProductTypes();
          setToast('Enter Accounting Rule details and click Save to create the record.', 'info');
          return;
        }

        if (nextMode === MODES.UPDATE) {
          if (!arState.hasLoaded) {
            setToast('Load an Accounting Rule in View mode before editing.', 'warning');
            return;
          }
          setArMode(MODES.UPDATE);
          return;
        }

        setArMode(nextMode);
      });
    });
  }

  async function ensureSearchServiceLoaded() {
    if (global.SearchService) {
      return true;
    }

    console.log('[AR] SearchService not found, attempting to load it...');

    try {
      // Try to load SearchService dynamically
      const script = document.createElement('script');
      script.src = '/assets/js/services/shared/searchService.js';
      script.async = false;

      return new Promise((resolve) => {
        script.onload = () => {
          console.log('[AR] SearchService loaded successfully');
          resolve(!!global.SearchService);
        };
        script.onerror = () => {
          console.error('[AR] Failed to load SearchService script');
          resolve(false);
        };
        document.head.appendChild(script);
      });
    } catch (err) {
      console.error('[AR] Error loading SearchService:', err);
      return false;
    }
  }

  async function performAccountingRuleSearch() {
    const acRuleIdInput = document.getElementById('AccountingRuleId');
    const descInput = document.getElementById('Description');
    const productTypesEl = document.getElementById('ProductTypes');

    const acRuleId = (acRuleIdInput?.value || '').trim();
    const description = (descInput?.value || '').trim();
    const productTypeId = (productTypesEl?.value || '').trim();

    // Build WHERE clause based on provided search criteria
    let whereClause = "BankID='00'";
    if (acRuleId) {
      whereClause += ` AND AcRuleID LIKE '%${acRuleId}%'`;
    }
    if (description) {
      whereClause += ` AND Description LIKE '%${description}%'`;
    }
    if (productTypeId) {
      whereClause += ` AND ProductTypeID='${productTypeId}'`;
    }

    // Ensure SearchService is available
    const searchServiceAvailable = await ensureSearchServiceLoaded();
    if (!searchServiceAvailable || !global.SearchService) {
      console.error('[AR] SearchService is not available');
      setToast('Search service is not available.', 'danger');
      return;
    }

    setToast('Searching Accounting Rules...', 'info');

    try {
      const requestData = {
        TableID: 'ProductAcRuleID',
        ModuleID: 2515,
        AdvFilterString: whereClause,
        WhereStmt: whereClause
      };

      console.log('[AR] Search request:', requestData);

      const response = await global.SearchService.searchClients(requestData);
      console.log('[AR] Search response:', response);

      if (!response?.success) {
        console.warn('[AR] Search returned no success:', response);
        setToast('No results found.', 'warning');
        return;
      }

      // Extract search results
      const results = extractSearchResults(response);
      console.log('[AR] Extracted results:', results);

      if (!results || results.length === 0) {
        setToast('No Accounting Rules found matching your criteria.', 'warning');
        return;
      }

      // Display results in a grid/modal
      displaySearchResults(results);
      setToast(`Found ${results.length} Accounting Rule(s).`, 'success');
    } catch (err) {
      console.error('[AR] Error performing search:', err);
      setToast('Error searching Accounting Rules. Check console for details.', 'danger');
    }
  }

  function extractSearchResults(response) {
    const payload = response?.data && typeof response.data === 'object' ? response.data : response;
    if (!payload) return [];

    console.log('[AR] Extracting search results from payload:', payload);

    // Check for Details array (primary structure)
    if (Array.isArray(payload.Details)) {
      return payload.Details;
    }

    // Check if payload itself is an array
    if (Array.isArray(payload)) {
      return payload;
    }

    // Check for nested Details01
    if (Array.isArray(payload.Details01)) {
      return payload.Details01;
    }

    // Check for nested Details02
    if (Array.isArray(payload.Details02)) {
      return payload.Details02;
    }

    return [];
  }

  function displaySearchResults(results) {
    const tbody = document.getElementById('SearchResultsBody');

    // If no results body exists, create a modal with filters
    if (!tbody) {
      // Create a simple modal to display results with filters
      const resultsHtml = results
        .map((row) => `<tr data-ac-rule-id="${row.AcRuleID || ''}"><td>${row.AcRuleID || ''}</td><td>${row.Description || ''}</td><td>${row.ProductTypeID || ''}</td></tr>`)
        .join('');

      const modal = document.createElement('div');
      modal.className = 'modal fade';
      modal.id = 'searchResultsModal';
      modal.tabIndex = -1;
      modal.innerHTML = `
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Search Results</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="row mb-3">
                <div class="col-md-4">
                  <label class="form-label">Rule ID</label>
                  <div class="input-group">
                    <select class="form-select form-select-sm filter-operator" data-field="AcRuleID" style="max-width: 70px;">
                      <option value="like">Like</option>
                      <option value="equals">Exactly</option>
                    </select>
                    <input type="text" class="form-control form-control-sm filter-input" data-field="AcRuleID" placeholder="Filter...">
                  </div>
                </div>
                <div class="col-md-4">
                  <label class="form-label">Description</label>
                  <div class="input-group">
                    <select class="form-select form-select-sm filter-operator" data-field="Description" style="max-width: 70px;">
                      <option value="like">Like</option>
                      <option value="equals">Exactly</option>
                    </select>
                    <input type="text" class="form-control form-control-sm filter-input" data-field="Description" placeholder="Filter...">
                  </div>
                </div>
                <div class="col-md-4">
                  <label class="form-label">Product Type</label>
                  <div class="input-group">
                    <select class="form-select form-select-sm filter-operator" data-field="ProductTypeID" style="max-width: 70px;">
                      <option value="like">Like</option>
                      <option value="equals">Exactly</option>
                    </select>
                    <input type="text" class="form-control form-control-sm filter-input" data-field="ProductTypeID" placeholder="Filter...">
                  </div>
                </div>
              </div>
              <div class="mb-2 d-flex justify-content-between align-items-center">
                <small class="text-muted">
                  Showing <span id="resultStart">1</span>-<span id="resultEnd">10</span> of <span id="resultTotal">0</span>
                </small>
                <button type="button" class="btn btn-sm btn-outline-secondary" id="clearFiltersBtn">
                  <i class="bi bi-arrow-clockwise"></i> Clear/Refresh
                </button>
              </div>
              <table class="table table-striped table-hover">
                <thead>
                  <tr>
                    <th>Rule ID</th>
                    <th>Description</th>
                    <th>Product Type</th>
                  </tr>
                </thead>
                <tbody id="searchResultsTableBody">
                  ${resultsHtml}
                </tbody>
              </table>
              <nav aria-label="Search results pagination" class="mt-3">
                <ul class="pagination justify-content-center mb-0">
                  <li class="page-item">
                    <button type="button" class="page-link" id="prevPageBtn">
                      <i class="bi bi-chevron-left"></i> Previous
                    </button>
                  </li>
                  <li class="page-item disabled">
                    <span class="page-link">
                      Page <span id="currentPage">1</span> of <span id="totalPages">1</span>
                    </span>
                  </li>
                  <li class="page-item">
                    <button type="button" class="page-link" id="nextPageBtn">
                      Next <i class="bi bi-chevron-right"></i>
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      // Show modal
      const bsModal = new window.bootstrap.Modal(modal);
      bsModal.show();

      // Remove modal from DOM when hidden
      modal.addEventListener('hidden.bs.modal', () => {
        modal.remove();
      });

      // Pagination setup
      const itemsPerPage = 10;
      let currentPage = 1;
      let filteredResults = [...results];

      // Filter functionality
      const filterInputs = modal.querySelectorAll('.filter-input');
      const filterOperators = modal.querySelectorAll('.filter-operator');
      const tableBody = modal.querySelector('#searchResultsTableBody');
      const clearBtn = modal.querySelector('#clearFiltersBtn');

      function updatePagination() {
        const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
        const startIdx = (currentPage - 1) * itemsPerPage;
        const endIdx = Math.min(startIdx + itemsPerPage, filteredResults.length);

        // Clear and populate table with current page
        tableBody.innerHTML = '';
        for (let i = startIdx; i < endIdx; i++) {
          const row = filteredResults[i];
          const tr = document.createElement('tr');
          tr.style.cursor = 'pointer';
          tr.innerHTML = `<td>${row.AcRuleID || ''}</td><td>${row.Description || ''}</td><td>${row.ProductTypeID || ''}</td>`;

          tr.addEventListener('click', () => {
            const selectedAcRuleId = row.AcRuleID || '';
            if (selectedAcRuleId) {
              document.getElementById('AccountingRuleId').value = selectedAcRuleId;
              bsModal.hide();
              fetchAccountingRule();
            }
          });

          tr.addEventListener('mouseenter', () => {
            tr.classList.add('table-active');
          });
          tr.addEventListener('mouseleave', () => {
            tr.classList.remove('table-active');
          });

          tableBody.appendChild(tr);
        }

        // Update pagination info
        modal.querySelector('#resultStart').textContent = filteredResults.length === 0 ? 0 : startIdx + 1;
        modal.querySelector('#resultEnd').textContent = endIdx;
        modal.querySelector('#resultTotal').textContent = filteredResults.length;
        modal.querySelector('#currentPage').textContent = filteredResults.length === 0 ? 0 : currentPage;
        modal.querySelector('#totalPages').textContent = totalPages === 0 ? 1 : totalPages;

        // Update pagination buttons
        const prevBtn = modal.querySelector('#prevPageBtn');
        const nextBtn = modal.querySelector('#nextPageBtn');

        prevBtn.disabled = currentPage <= 1;
        nextBtn.disabled = currentPage >= totalPages;
      }

      function applyFilters() {
        const filters = {};
        filterInputs.forEach((input) => {
          const field = input.getAttribute('data-field');
          const operator = modal.querySelector(`.filter-operator[data-field="${field}"]`).value;
          filters[field] = {
            value: input.value.toLowerCase().trim(),
            operator: operator
          };
        });

        filteredResults = results.filter((row) => {
          for (const field in filters) {
            const filterData = filters[field];
            if (!filterData.value) continue;

            const cellValue = (row[field] || '').toString().toLowerCase().trim();

            let matches = false;
            if (filterData.operator === 'equals') {
              matches = cellValue === filterData.value;
            } else {
              matches = cellValue.includes(filterData.value);
            }

            if (!matches) {
              return false;
            }
          }
          return true;
        });

        currentPage = 1; // Reset to first page when filtering
        updatePagination();
        console.log(`[AR] Filtered results: ${filteredResults.length} matching rows`);
      }

      // Add event listeners for filtering
      filterInputs.forEach((input) => {
        input.addEventListener('keyup', applyFilters);
      });

      filterOperators.forEach((operator) => {
        operator.addEventListener('change', applyFilters);
      });

      // Clear/Refresh button
      clearBtn.addEventListener('click', () => {
        filterInputs.forEach((input) => {
          input.value = '';
        });
        filterOperators.forEach((operator) => {
          operator.value = 'like';
        });
        currentPage = 1;
        filteredResults = [...results];
        updatePagination();
        console.log('[AR] Filters cleared, showing all results');
      });

      // Pagination buttons
      const prevBtn = modal.querySelector('#prevPageBtn');
      const nextBtn = modal.querySelector('#nextPageBtn');

      prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          updatePagination();
        }
      });

      nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
        if (currentPage < totalPages) {
          currentPage++;
          updatePagination();
        }
      });

      // Initial pagination setup
      updatePagination();
      return;
    }

    // Clear existing rows
    while (tbody.firstChild) {
      tbody.removeChild(tbody.firstChild);
    }

    // Add result rows
    results.forEach((row) => {
      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';

      const acRuleIdTd = document.createElement('td');
      acRuleIdTd.textContent = row.AcRuleID ?? '';
      tr.appendChild(acRuleIdTd);

      const descTd = document.createElement('td');
      descTd.textContent = row.Description ?? '';
      tr.appendChild(descTd);

      const productTypeTd = document.createElement('td');
      productTypeTd.textContent = row.ProductTypeID ?? '';
      tr.appendChild(productTypeTd);

      // Add click handler to select this result
      tr.addEventListener('click', () => {
        const acRuleId = (row.AcRuleID || '').trim();
        if (acRuleId) {
          document.getElementById('AccountingRuleId').value = acRuleId;
          // Load the selected rule
          fetchAccountingRule();
        }
      });

      tbody.appendChild(tr);
    });
  }

  function bindArActions() {
    const { search, save, del, cancel } = getArActionButtons();

    search?.addEventListener('click', () => {
      performAccountingRuleSearch();
    });

    save?.addEventListener('click', async () => {
      if (arState.mode === MODES.VIEW) {
        setToast('Switch to Add or Edit before saving.', 'warning');
        return;
      }
      await handleArSave();
    });

    del?.addEventListener('click', async () => {
      if (!arState.hasLoaded) {
        setToast('Load an Accounting Rule before deleting.', 'warning');
        return;
      }

      const acRuleIdEl = document.getElementById('AccountingRuleId');
      const acRuleId = (acRuleIdEl?.value || '').trim();

      if (confirm(`Delete Accounting Rule '${acRuleId}'? This action cannot be undone.`)) {
        await handleArDelete();
      }
    });

    cancel?.addEventListener('click', () => {
      // Clear all fields including AccountingRuleId
      const root = qs('.cm-window-content') || document;
      const fields = qsa('input, select, textarea', root);
      fields.forEach((field) => {
        if (field.type === 'checkbox') {
          field.checked = false;
          return;
        }
        field.value = '';
      });
      renderApplicableEventsGrid([]);
      arState.hasLoaded = false;
      arState.canAddFromId = false;
      arState.updateCount = 0;
      arState.selectedEvents = [];
      setArMode(MODES.VIEW);
      setToast('Cleared.', 'info');
    });

    // Add field change listeners for mandatory fields in ADD mode
    const descEl = document.getElementById('Description');
    const productTypesEl = document.getElementById('ProductTypes');

    if (descEl) {
      descEl.addEventListener('input', () => {
        if (arState.mode === MODES.ADD) {
          updateArActionButtons();
        }
      });
    }

    if (productTypesEl) {
      productTypesEl.addEventListener('change', () => {
        if (arState.mode === MODES.ADD) {
          updateArActionButtons();
        }
      });
    }
  }

  async function handleArSave() {
    const acRuleIdEl = document.getElementById('AccountingRuleId');
    const descEl = document.getElementById('Description');
    const productTypesEl = document.getElementById('ProductTypes');

    const acRuleId = (acRuleIdEl?.value || '').trim();
    const description = (descEl?.value || '').trim();
    const productTypeId = (productTypesEl?.value || '').trim();

    if (!acRuleId) {
      setToast('Accounting Rule ID is required.', 'warning');
      return;
    }
    if (!description) {
      setToast('Description is required.', 'warning');
      return;
    }
    if (!productTypeId) {
      setToast('Product Type is required.', 'warning');
      return;
    }

    if (!global.ServiceLoader?.loadProductLgLcService) {
      console.warn('ServiceLoader.loadProductLgLcService is not available on this page.');
      setToast('Service not available on this page.', 'danger');
      return;
    }

    setToast('Saving Accounting Rule...', 'info');

    try {
      await global.ServiceLoader.loadProductLgLcService();
      if (!global.ProductLgLcService?.addEditProductAcRule) {
        console.error('ProductLgLcService.addEditProductAcRule is not available.');
        setToast('Accounting Rule save service is not available.', 'danger');
        return;
      }

      const session = global.AuthService?.getSession?.() || null;
      const bankId =
        session?.bankID || session?.BankID || global.Environment?.BankID || global.Environment?.bankID || '00';

      const createdByEl = document.getElementById('CreatedBy');
      const createdOnEl = document.getElementById('CreatedOn');
      const modifiedByEl = document.getElementById('ModifiedBy');
      const modifiedOnEl = document.getElementById('ModifiedOn');
      const supervisedByEl = document.getElementById('SupervisedBy');

      const operatorId = session?.operatorID || session?.OperatorID || session?.operatorId || '';

      const createdBy = (createdByEl?.value || operatorId || '').trim();
      const createdOn = (createdOnEl?.value || '').trim();
      const modifiedBy = (modifiedByEl?.value || operatorId || '').trim();
      const modifiedOn = (modifiedOnEl?.value || '').trim();
      const supervisedBy = (supervisedByEl?.value || '').trim();

      const updateCount = arState.mode === MODES.ADD ? 1 : arState.updateCount || 0;

      const requestData = {
        BankID: bankId,
        AcRuleID: acRuleId,
        Description: description,
        ProductTypeID: productTypeId,
        CreatedBy: createdBy,
        CreatedOn: createdOn,
        ModifiedBy: modifiedBy,
        ModifiedOn: modifiedOn,
        SupervisedBy: supervisedBy,
        UpdateCount: updateCount
      };

      global.__acRuleLastSaveRequest = requestData;

      const response = await global.ProductLgLcService.addEditProductAcRule(requestData);
      global.__acRuleLastSaveResponse = response;

      if (!isApiSuccess(response)) {
        const msg =
          response?.Details?.Message || response?.data?.Message || response?.message || 'Save failed.';
        setToast(msg, 'danger');
        return;
      }

      setToast('Accounting Rule saved successfully.', 'success');
      arState.updateCount = 0;
      arState.canAddFromId = false;
      setArMode(MODES.VIEW);
      await fetchAccountingRule();
    } catch (err) {
      console.error('Error saving Accounting Rule:', err);
      setToast('Error saving Accounting Rule. Check console for details.', 'danger');
    }
  }

  async function handleArDelete() {
    const acRuleIdEl = document.getElementById('AccountingRuleId');
    const acRuleId = (acRuleIdEl?.value || '').trim();

    if (!acRuleId) return;

    setToast('Deleting Accounting Rule...', 'info');

    try {
      if (!global.ServiceLoader?.loadProductLgLcService) {
        console.warn('[AR] ServiceLoader not available for delete');
        setToast('Service not available on this page.', 'danger');
        return;
      }

      await global.ServiceLoader.loadProductLgLcService();

      if (!global.ProductLgLcService?.deleteProductAcRule) {
        console.error('[AR] ProductLgLcService.deleteProductAcRule is not available.');
        setToast('Delete service is not available.', 'danger');
        return;
      }

      const session = global.AuthService?.getSession?.() || null;
      const bankId =
        session?.bankID || session?.BankID || global.Environment?.BankID || global.Environment?.bankID || '00';

      const requestData = {
        BankID: bankId,
        AcRuleID: acRuleId,
        UpdateCount: arState.updateCount || 0
      };

      console.log('[AR] Deleting Accounting Rule with request:', requestData);

      const response = await global.ProductLgLcService.deleteProductAcRule(requestData);
      console.log('[AR] Delete response:', response);

      if (!isApiSuccess(response)) {
        const msg =
          response?.Details?.Message || response?.data?.Message || response?.message || 'Delete failed.';
        setToast(msg, 'danger');
        return;
      }

      setToast(`Accounting Rule '${acRuleId}' deleted successfully.`, 'success');
      // Clear form completely, including AccountingRuleId
      const root = qs('.cm-window-content') || document;
      const fields = qsa('input, select, textarea', root);
      fields.forEach((field) => {
        if (field.type === 'checkbox') {
          field.checked = false;
          return;
        }
        field.value = '';
      });
      renderApplicableEventsGrid([]);
      arState.hasLoaded = false;
      arState.canAddFromId = false;
      arState.updateCount = 0;
      arState.selectedEvents = [];
      setArMode(MODES.VIEW);
    } catch (err) {
      console.error('[AR] Error deleting Accounting Rule:', err);
      setToast('Error deleting Accounting Rule. Check console for details.', 'danger');
    }
  }

  window.addEventListener('load', () => {
    setArMode(MODES.VIEW);
    bindArModeButtons();
    bindArActions();
    loadProductTypes();
    updateArActionButtons();

    // ========== Section Toggle Functionality ==========
    document.querySelectorAll('.form-section [data-section-toggle]').forEach(header => {
      header.addEventListener('click', function (e) {
        e.preventDefault();

        const section = this.closest('.form-section');
        if (!section) return;

        const content = section.querySelector('[data-section-content]');
        const icon = this.querySelector('.section-toggle-btn i');
        const toggleBtn = this.querySelector('.section-toggle-btn');

        if (content && icon) {
          const isHidden = content.hidden;
          content.hidden = !isHidden;

          // Toggle icon
          icon.classList.remove('bi-chevron-up', 'bi-chevron-down');
          icon.classList.add(isHidden ? 'bi-chevron-up' : 'bi-chevron-down');

          // Update aria-expanded
          if (toggleBtn) {
            toggleBtn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
          }
        }
      });
    });

    // ========== Sidebar Nav Item Toggle (Data Entry submenu) ==========
    document.querySelectorAll('.nav-item[data-nav-toggle]').forEach(navItem => {
      navItem.addEventListener('click', function (e) {
        e.stopPropagation();

        const navToggle = this.getAttribute('data-nav-toggle');
        const submenu = document.querySelector(`[data-submenu="${navToggle}"]`);
        const arrow = this.querySelector('.nav-arrow');

        if (submenu) {
          submenu.classList.toggle('show');
          if (arrow) {
            arrow.classList.remove('bi-chevron-down', 'bi-chevron-up');
            arrow.classList.add(submenu.classList.contains('show') ? 'bi-chevron-up' : 'bi-chevron-down');
          }
        }

        // Set active state
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        this.classList.add('active');
      });
    });

    // ========== Hamburger Menu Toggle for Sidebar Collapse ==========
    const sidebarMenuBtn = document.querySelector('.sidebar-menu-btn');
    const sidebarLeft = document.querySelector('.sidebar-left');

    if (sidebarMenuBtn && sidebarLeft) {
      sidebarMenuBtn.addEventListener('click', function () {
        sidebarLeft.classList.toggle('collapsed');
        this.classList.toggle('active');

        // Toggle icon
        const icon = this.querySelector('i');
        if (icon) {
          icon.classList.toggle('bi-list');
          icon.classList.toggle('bi-x-lg');
        }
      });
    }

    // ========== Rule Details Inline Opening & Message Handling ==========
    document.addEventListener('click', (event) => {
      const link = event.target.closest('[data-open-rule-details]');
      if (!link) return;

      event.preventDefault();
      console.log('[AR] Rule Details link clicked');

      const childInlineContainer = document.querySelector('[data-child-inline]');
      const childIframe = document.querySelector('[data-child-iframe]');
      const mainContent = document.querySelector('.main-content');
      const ruleDetailsModalEl = document.getElementById('ruleDetailsModal');

      if (!childInlineContainer || !childIframe) {
        console.warn('[AR] Inline elements not found, falling back to modal selection');
      }

      const acRuleIdEl = document.getElementById('AccountingRuleId');
      const productTypesEl = document.getElementById('ProductTypes');
      const acRuleId = (acRuleIdEl?.value || '').trim();
      const productTypeId = (productTypesEl?.value || '').trim();

      // Resolve the URL correctly relative to the current document
      const baseUrl = '../data-entry/rule-details.html';
      const url = new URL(baseUrl, window.location.href);
      url.searchParams.set('v', String(Date.now()));

      if (acRuleId) url.searchParams.set('acRuleId', acRuleId);
      if (productTypeId) url.searchParams.set('productTypeId', productTypeId);

      const finalUrl = url.href; // Use full absolute URL for iframe src
      console.log('[AR] Opening Rule Details with URL:', finalUrl);

      if (childInlineContainer && childIframe) {
        console.log('[AR] Opening inline container');
        childIframe.setAttribute('src', finalUrl);
        childInlineContainer.removeAttribute('hidden');
        childInlineContainer.hidden = false;

        // Ensure parent mainContent is marked as open
        if (mainContent) {
          mainContent.classList.add('child-open');
        } else {
          console.warn('[AR] main-content not found for child-open class');
        }
      }
      else if (ruleDetailsModalEl && window.bootstrap?.Modal) {
        console.log('[AR] Opening in modal (fallback)');
        const frameInModal = document.getElementById('ruleDetailsFrame') || ruleDetailsModalEl.querySelector('iframe');
        if (frameInModal) frameInModal.setAttribute('src', finalUrl);
        const instance = window.bootstrap.Modal.getOrCreateInstance(ruleDetailsModalEl);
        instance.show();
      } else {
        console.error('[AR] Selection failure: could not open Rule Details submodule.');
      }
    });

    window.addEventListener('message', (event) => {
      if (!event?.data || typeof event.data !== 'object') return;
      if (event.data.type !== 'close-rule-details') return;

      console.log('[AR] Received close-rule-details message');

      const childInlineContainer = document.querySelector('[data-child-inline]');
      const childIframe = document.querySelector('[data-child-iframe]');
      const mainContent = document.querySelector('.main-content');

      if (childInlineContainer) {
        childInlineContainer.hidden = true;
        childInlineContainer.setAttribute('hidden', '');
        mainContent?.classList.remove('child-open');
        if (childIframe) childIframe.src = '';
      }

      const ruleDetailsModalEl = document.getElementById('ruleDetailsModal');
      if (ruleDetailsModalEl && window.bootstrap?.Modal) {
        const instance = window.bootstrap.Modal.getInstance(ruleDetailsModalEl);
        instance?.hide();
      }
    });

    // Rule Details inlined logic removed - consolidated at top level with parameter support.

    // Global functions removed - consolidated at top level.
  });
})(window);
