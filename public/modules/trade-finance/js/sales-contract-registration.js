/* global bootstrap */

(() => {
  const form = document.getElementById('scr-form');
  if (!form) return;

  const toastEl = document.getElementById('scrToast');

  const state = {
    mode: 'view', // view | add | edit
    dirty: false,
    hasData: false,
    docMode: 'view',
    selectedDocFile: null
  };

  function showToast(message, type = 'info') {
    if (!toastEl) return;
    toastEl.classList.remove('d-none', 'alert-info', 'alert-success', 'alert-warning', 'alert-danger');
    toastEl.classList.add(`alert-${type}`);
    toastEl.textContent = message;

    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => {
      toastEl.classList.add('d-none');
    }, 2500);
  }

  function setEditable(enabled) {
    const editable = form.querySelectorAll('[data-editable="true"]');
        editable.forEach((el) => {
          if (el.tagName === 'SELECT' || el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
            el.disabled = false;
            el.readOnly = false;
          }
        });

    const docActions = form.querySelectorAll('[data-scr-doc-action]');
    docActions.forEach((btn) => {
      btn.disabled = !enabled;
    });

    const lookups = form.querySelectorAll('[data-lookup]');
    lookups.forEach((btn) => {
      btn.disabled = !enabled;
    });

    const browse = form.querySelector('[data-scr-browse-image]');
    if (browse) browse.disabled = !enabled;
  }

  function setButtons() {
    const q = (sel) => form.querySelector(sel);

    const btnView = q('[data-scr-action="view"]');
    const btnAdd = q('[data-scr-action="add"]');
    const btnEdit = q('[data-scr-action="edit"]');
    const btnDelete = q('[data-scr-action="delete"]');
    const btnSave = q('[data-scr-action="save"]');
    const btnCancel = q('[data-scr-action="cancel"]');
    const btnShowImage = q('[data-scr-action="show-image"]');

    const approve = q('[data-scr-workflow="approve"]');
    const reject = q('[data-scr-workflow="reject"]');

    const docNew = q('[data-scr-doc-action="new"]');
    const docAlter = q('[data-scr-doc-action="alter"]');
    const docRemove = q('[data-scr-doc-action="remove"]');
    const docUpdate = q('[data-scr-doc-action="update"]');
    const docClear = q('[data-scr-doc-action="clear"]');

    // Disable everything by default (LC-Banks style)
    [
      btnView,
      btnAdd,
      btnEdit,
      btnDelete,
      btnSave,
      btnCancel,
      btnShowImage,
      approve,
      reject,
      docNew,
      docAlter,
      docRemove,
      docUpdate,
      docClear
    ].forEach((btn) => {
      if (btn) btn.disabled = true;
    });

    const editing = state.mode === 'edit' || state.mode === 'add';

    if (state.mode === 'view') {
      // View mode: if data is loaded, enable workflow + edit/delete/cancel; otherwise allow view/add/cancel to start.
      if (state.hasData) {
        if (btnEdit) btnEdit.disabled = false;
        if (btnDelete) btnDelete.disabled = false;
        if (btnCancel) btnCancel.disabled = false;
        if (approve) approve.disabled = false;
        if (reject) reject.disabled = false;
      } else {
        if (btnView) btnView.disabled = false;
        if (btnAdd) btnAdd.disabled = false;
        if (btnCancel) btnCancel.disabled = false;
      }
      return;
    }

    // Add/Edit: lock to Save/Cancel only
    if (btnSave) btnSave.disabled = !editing;
    if (btnCancel) btnCancel.disabled = !editing;

    // Documents toolbar follows LC-Banks mini-state
    setDocButtons(docNew, docAlter, docRemove, docUpdate, docClear, editing);
  }

  function docTableHasRecords() {
    const tbody = form.querySelector('[data-scr-doc-table] tbody');
    if (!tbody) return false;
    const firstRow = tbody.querySelector('tr');
    if (!firstRow) return false;
    const firstCell = firstRow.querySelector('td');
    // If the first row is the placeholder with colspan, treat as no data
    return !(firstCell && firstCell.hasAttribute('colspan'));
  }

  function setDocButtons(docNew, docAlter, docRemove, docUpdate, docClear, editing) {
    const hasRows = docTableHasRecords();
    const mode = state.docMode;

    // Default all disabled
    [docNew, docAlter, docRemove, docUpdate, docClear].forEach((btn) => {
      if (btn) btn.disabled = true;
    });

    if (editing) {
      // While main form is in add/edit, allow new/update/clear similar to LC add mode
      if (docNew) docNew.disabled = false;
      if (docUpdate) docUpdate.disabled = false;
      if (docClear) docClear.disabled = false;
      return;
    }

    if (mode === 'alter') {
      if (docUpdate) docUpdate.disabled = false;
      if (docClear) docClear.disabled = false;
      if (docRemove) docRemove.disabled = false;
      return;
    }

    // View mode: enable based on whether rows exist
    if (hasRows) {
      if (docNew) docNew.disabled = false;
      if (docAlter) docAlter.disabled = false;
      if (docRemove) docRemove.disabled = false;
      if (docClear) docClear.disabled = false;
    } else {
      if (docNew) docNew.disabled = false;
      if (docClear) docClear.disabled = false;
    }
  }

  function setMode(mode) {
    state.mode = mode;
    state.dirty = false;
    if (mode === 'add') state.hasData = false;
      setEditable(true); // Always keep editable
    setButtons();

    if (mode === 'view') showToast('View mode.', 'info');
    if (mode === 'add') showToast('Add mode: enter details then Save.', 'success');
    if (mode === 'edit') showToast('Edit mode: update details then Save.', 'warning');
    if (!form) return;
    // Force all fields editable and all search buttons clickable on load
    setEditable(true);
  }

  function validateRequired() {
    const required = form.querySelectorAll('[required]');
    let ok = true;

    required.forEach((el) => {
      const value = (el.value || '').trim();
      const valid = value.length > 0;

      el.classList.toggle('is-invalid', !valid);
      el.classList.toggle('is-valid', valid);

      if (!valid) ok = false;
    });

    return ok;
  }

  function clearValidation() {
    const fields = form.querySelectorAll('.is-valid, .is-invalid');
    fields.forEach((el) => {
      el.classList.remove('is-valid', 'is-invalid');
    });
  }

  function handleAction(action) {
    switch (action) {
      case 'view': {
        clearValidation();
        setMode('view');
        fetchContractRegistration();
        break;
      }
      case 'add':
        clearValidation();
        setMode('add');
        break;
      case 'edit':
        clearValidation();
        setMode('edit');
        break;
      case 'delete':
        (async () => {
          const branchId = (document.getElementById('BranchID')?.value || '').trim();
          const clientId = (document.getElementById('ClientID')?.value || '').trim();
          const contractNumber = (document.getElementById('ContractNumber')?.value || '').trim();

          if (!branchId || !clientId || !contractNumber) {
            showToast('Branch ID, Client ID, and Contract Number are required to delete.', 'danger');
            return;
          }

          const ok = window.confirm(`Delete contract ${contractNumber}? This will mark it as deleted.`);
          if (!ok) return;

          if (!window.tradeFinanceService?.addContractRegistration) {
            showToast('Service not available. Please check configuration.', 'danger');
            return;
          }

          const operatorId = window.sessionStorage?.getItem?.('operatorId') || 'SYSTEM';
          const registrationDtls = buildRegistrationDtlsJson({ deleted: true });
          const requestData = {
            OurBranchID: branchId,
            ClientID: clientId,
            OperatorID: operatorId,
            RegistrationDtls: registrationDtls
          };

          try {
            showToast('Deleting contract...', 'info');
            const response = await window.tradeFinanceService.addContractRegistration(requestData);

            if (!response) {
              showToast('No response from server.', 'danger');
              return;
            }

            if (response.IsError || response.ErrorMessage) {
              showToast(response.ErrorMessage || 'Failed to delete contract.', 'danger');
              return;
            }

            const status = response?.Details?.Status || response?.data?.Status || response?.Status || null;
            const message = response?.Details?.Message || response?.data?.Message || response?.Message || response?.message || null;
            if (status && status !== '00' && status !== '000') {
              showToast(message || `Failed to delete contract. (${status})`, 'danger');
              return;
            }

            showToast('Contract deleted (status set to D).', 'success');
            state.hasData = false;
            setMode('view');
          } catch (err) {
            console.error('[SCR] Delete error:', err);
            showToast(`Error: ${err.message || 'Failed to delete contract.'}`, 'danger');
          }
        })();
        break;
      case 'save': {
        const ok = validateRequired();
        if (!ok) {
          showToast('Please fill required fields.', 'danger');
          return;
        }
        if (state.mode !== 'add' && state.mode !== 'edit') {
          showToast('Nothing to save in view mode. Use Add/Edit first.', 'warning');
          return;
        }
        saveContractRegistration();
        break;
      }
      case 'cancel':
        clearValidation();
        try {
          form.reset();
        } catch {
          // ignore
        }
        state.hasData = false;
        setMode('view');
        break;
      case 'show-image':
        showToast('No image configured.', 'info');
        break;
      default:
        break;
    }
  }

  function wireDocToolbar() {
    const docNew = form.querySelector('[data-scr-doc-action="new"]');
    const docAlter = form.querySelector('[data-scr-doc-action="alter"]');
    const docRemove = form.querySelector('[data-scr-doc-action="remove"]');
    const docUpdate = form.querySelector('[data-scr-doc-action="update"]');
    const docClear = form.querySelector('[data-scr-doc-action="clear"]');

    const tbody = form.querySelector('[data-scr-doc-table] tbody');

    const docFieldIds = ['DocumentID', 'DocumentName', 'NoOfOriginal', 'NoOfCopy', 'DocumentAmount', 'DocumentCurrencyID', 'DocumentCurrencyName', 'DocumentLocalAmount', 'Remarks', 'RequestedBy', 'RequestedByName', 'RequestedDate', 'DocumentImage', 'Location'];

    const readDocForm = () => {
      const obj = {};
      docFieldIds.forEach((id) => {
        const el = document.getElementById(id);
        obj[id] = el ? (el.value || '').toString().trim() : '';
      });
      return obj;
    };

    const writeDocForm = (obj) => {
      if (!obj) return;
      docFieldIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = (obj[id] ?? '').toString();
      });
    };

    const clearDocForm = () => {
      writeDocForm({});
      if (tbody) tbody.querySelectorAll('tr').forEach((r) => r.classList.remove('table-active'));
      state.docMode = 'view';
      setButtons();
    };

    const removePlaceholderRowIfPresent = () => {
      if (!tbody) return;
      const firstRow = tbody.querySelector('tr');
      const firstCell = firstRow?.querySelector('td');
      if (firstCell && firstCell.hasAttribute('colspan')) {
        firstRow.remove();
      }
    };

    const renderDocRowCells = (rowEl, docObj) => {
      const safe = (v) => (v ?? '').toString();
      const cells = [
        safe(docObj.DocumentID),
        safe(docObj.DocumentName),
        // No explicit DocumentType field exists on the form; show currency name/id as a best-effort “type”.
        safe(docObj.DocumentCurrencyName || docObj.DocumentCurrencyID),
        safe(docObj.Location),
        safe(docObj.Remarks),
        safe(docObj.RequestedByName || docObj.RequestedBy),
        safe(docObj.RequestedDate)
      ];

      rowEl.innerHTML = cells.map((c) => `<td>${c}</td>`).join('');
      rowEl.dataset.scrDoc = JSON.stringify(docObj);
    };

    if (tbody) {
      tbody.addEventListener('click', (e) => {
        const row = e.target?.closest('tr');
        if (!row) return;
        const firstCell = row.querySelector('td');
        if (firstCell && firstCell.hasAttribute('colspan')) return;
        tbody.querySelectorAll('tr').forEach((r) => r.classList.remove('table-active'));
        row.classList.add('table-active');
        state.docMode = 'view';
        try {
          const obj = row.dataset.scrDoc ? JSON.parse(row.dataset.scrDoc) : null;
          if (obj) writeDocForm(obj);
        } catch {
          // ignore
        }
        setButtons();
      });
    }

    if (docNew) {
      docNew.addEventListener('click', () => {
        clearDocForm();
        state.docMode = 'add';
        setButtons();
        showToast('Document: add mode. Enter details then Update.', 'info');
      });
    }

    if (docAlter) {
      docAlter.addEventListener('click', () => {
        const selected = tbody?.querySelector('tr.table-active');
        if (!selected) {
          showToast('Select a document row to alter.', 'warning');
          return;
        }
        state.docMode = 'alter';
        setButtons();
        showToast('Document: alter mode. Edit fields then Update.', 'info');
      });
    }

    if (docRemove) {
      docRemove.addEventListener('click', () => {
        const selected = tbody?.querySelector('tr.table-active');
        if (!selected) {
          showToast('Select a document row to remove.', 'warning');
          return;
        }
        selected.remove();
        state.docMode = 'view';
        setButtons();
        showToast('Document row removed (not yet persisted).', 'info');
      });
    }

    if (docUpdate) {
      docUpdate.addEventListener('click', () => {
        if (!tbody) {
          showToast('Documents grid not found.', 'danger');
          return;
        }

        const docObj = readDocForm();
        if (!docObj.DocumentID) {
          showToast('Document ID is required.', 'danger');
          document.getElementById('DocumentID')?.focus();
          return;
        }

        removePlaceholderRowIfPresent();

        const selected = tbody.querySelector('tr.table-active');
        if (state.docMode === 'alter' && selected) {
          renderDocRowCells(selected, docObj);
          showToast('Document row updated (pending Save).', 'success');
        } else {
          const tr = document.createElement('tr');
          tr.style.cursor = 'pointer';
          renderDocRowCells(tr, docObj);
          tbody.appendChild(tr);
          tbody.querySelectorAll('tr').forEach((r) => r.classList.remove('table-active'));
          tr.classList.add('table-active');
          showToast('Document row added (pending Save).', 'success');
        }

        // Ensure user sees the row immediately (table is directly under action buttons).
        try {
          tbody.closest('.elc-tablewrap')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch {
          // ignore
        }

        state.docMode = 'view';
        setButtons();
      });
    }

    if (docClear) {
      docClear.addEventListener('click', () => {
        clearDocForm();
        showToast('Document form cleared.', 'info');
      });
    }
  }

  function formatDateForDisplay(dateString) {
    if (!dateString) return '';

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const pad2 = (n) => String(n).padStart(2, '0');

    // Already a Date object
    if (dateString instanceof Date && !Number.isNaN(dateString.getTime())) {
      const day = dateString.getDate();
      const month = monthNames[dateString.getMonth()];
      const year = dateString.getFullYear();
      return `${pad2(day)} ${month} ${year}`;
    }

    const s = String(dateString).trim();
    if (!s) return '';

    // Format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      const year = parseInt(m[1]);
      const month = parseInt(m[2]) - 1;
      const day = parseInt(m[3]);
      return `${pad2(day)} ${monthNames[month]} ${year}`;
    }

    // Format: /Date(1706572800000)/ (legacy .NET JSON)
    m = s.match(/^\/Date\((\d+)\)\/?$/);
    if (m) {
      const ms = Number(m[1]);
      if (!Number.isNaN(ms)) {
        const d = new Date(ms);
        if (!Number.isNaN(d.getTime())) {
          return `${pad2(d.getDate())} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
        }
      }
    }

    // Try native Date parse as fallback
    try {
      const date = new Date(s);
      if (!Number.isNaN(date.getTime())) {
        return `${pad2(date.getDate())} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      }
    } catch {
      // ignore
    }

    return '';
  }

  function formatDate(dateString) {
    if (!dateString) return '';

    const pad2 = (n) => String(n).padStart(2, '0');
    const toIso = (yyyy, mm, dd) => {
      if (!yyyy || !mm || !dd) return '';
      return `${String(yyyy).padStart(4, '0')}-${pad2(mm)}-${pad2(dd)}`;
    };

    // Already a Date object
    if (dateString instanceof Date && !Number.isNaN(dateString.getTime())) {
      return toIso(dateString.getFullYear(), dateString.getMonth() + 1, dateString.getDate());
    }

    const s = String(dateString).trim();
    if (!s) return '';

    // Format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      return s.slice(0, 10);
    }

    // Format: /Date(1706572800000)/ (legacy .NET JSON)
    let m = s.match(/^\/Date\((\d+)\)\/?$/);
    if (m) {
      const ms = Number(m[1]);
      if (!Number.isNaN(ms)) {
        const d = new Date(ms);
        if (!Number.isNaN(d.getTime())) {
          return toIso(d.getFullYear(), d.getMonth() + 1, d.getDate());
        }
      }
    }

    // Format: 20260130
    m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (m) {
      const yyyy = Number(m[1]);
      const mm = Number(m[2]);
      const dd = Number(m[3]);
      if (yyyy >= 1900 && mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
        return toIso(yyyy, mm, dd);
      }
    }

    // Format: MM/DD/YYYY or DD/MM/YYYY or DD-MM-YYYY
    m = s.match(/^(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{4})(?:\s|$)/);
    if (m) {
      const a = Number(m[1]);
      const b = Number(m[2]);
      const yyyy = Number(m[3]);
      let mm = a;
      let dd = b;
      // Infer DD/MM vs MM/DD
      if (a > 12 && b <= 12) {
        dd = a;
        mm = b;
      } else if (b > 12 && a <= 12) {
        mm = a;
        dd = b;
      }
      if (yyyy >= 1900 && mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
        return toIso(yyyy, mm, dd);
      }
    }

    // Format: DD-JAN-2026 or DD-JAN-26 or DD JAN 2026
    m = s.match(/^(\d{1,2})[\-\s]+([A-Za-z]{3,})[\-\s]+(\d{2,4})(?:\s|$)/);
    if (m) {
      const dd = Number(m[1]);
      const mon = m[2].slice(0, 3).toLowerCase();
      let yyyy = Number(m[3]);
      if (yyyy < 100) yyyy = yyyy < 50 ? 2000 + yyyy : 1900 + yyyy;
      const months = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
      const mm = months[mon];
      if (mm && yyyy >= 1900 && dd >= 1 && dd <= 31) {
        return toIso(yyyy, mm, dd);
      }
    }

    // Fallback: let native Date parse
    try {
      const date = new Date(s);
      if (!Number.isNaN(date.getTime())) {
        return toIso(date.getFullYear(), date.getMonth() + 1, date.getDate());
      }
    } catch {
      // ignore
    }

    return '';
  }

  function formatLegacyRequestTime(d = new Date()) {
    const pad2 = (n) => String(n).padStart(2, '0');
    const mm = pad2(d.getMonth() + 1);
    const dd = pad2(d.getDate());
    const yyyy = d.getFullYear();
    const hh = pad2(d.getHours());
    const mi = pad2(d.getMinutes());
    const ss = pad2(d.getSeconds());
    return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
  }

  function buildRegistrationDtlsJson({ deleted = false } = {}) {
    // IMPORTANT: dbo.p_AddContractRegistration parses @RegistrationDtls via OPENJSON.
    // Therefore RegistrationDtls must be a JSON string (not XML).
    const getVal = (id) => (document.getElementById(id)?.value || '').toString().trim();
    const toNullableDate = (val) => {
      const s = (val || '').toString().trim();
      if (!s) return null;
      
      // If it's in DD MMM YYYY format, convert to YYYY-MM-DD
      const m = s.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
      if (m) {
        const day = m[1].padStart(2, '0');
        const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const monthIndex = monthNames.indexOf(m[2].toLowerCase());
        if (monthIndex !== -1) {
          const month = String(monthIndex + 1).padStart(2, '0');
          return `${m[3]}-${month}-${day}`;
        }
      }
      
      return s; // Return as-is if already in YYYY-MM-DD or other format
    };

    const operatorId = window.sessionStorage?.getItem?.('operatorId') || 'SYSTEM';

    const dto = {
      // Used for key generation in t_SystemKeyBranch
      ModuleID: 1837,

      ContractNumber: getVal('ContractNumber') || null,
      ContractDate: toNullableDate(getVal('ContractDate')),
      OurBranchID: getVal('BranchID') || null,
      ClientID: getVal('ClientID') || null,

      FXPermitNumber: getVal('FXPermitNumber') || null,
      CurrencyID: getVal('CurrencyID') || null,
      Price: getVal('Price') || null,
      QuantityOfGoods: getVal('QuantityOfGoods') || null,
      ModeOfPayment: getVal('ModeOfPayment') || null,
      GoodsDescription: getVal('GoodsDescription') || null,
      ShipmentDate: toNullableDate(getVal('ShipmentDate')),
      Destination: getVal('Destination') || null,
      ExporterName: getVal('ExporterName') || null,
      ImporterName: getVal('ImporterName') || null,
      Drawer: getVal('Drawer') || null,
      Drawee: getVal('Drawee') || null,

      // Procedure expects these exact names
      CollectingBank: getVal('CollectingBank1') || null,
      CourierNumber: getVal('CourierAWBBLNumber1') || null,

      Status: getVal('Status') || 'A',
      UpdateCount: getVal('UpdateCount') || '1'
    };

    if (deleted) {
      dto.DeletedBy = operatorId;
      dto.DeletedOn = new Date().toISOString();
    }

    return JSON.stringify(dto);
  }

  async function saveContractRegistration() {
    const branchId = (document.getElementById('BranchID')?.value || '').trim();
    const clientId = (document.getElementById('ClientID')?.value || '').trim();
    const operatorId = window.sessionStorage?.getItem?.('operatorId') || 'SYSTEM';

    if (!branchId) {
      showToast('Branch ID is required to save.', 'danger');
      return;
    }

    if (!clientId) {
      showToast('Client ID is required to save.', 'danger');
      return;
    }

    if (!window.tradeFinanceService?.addContractRegistration) {
      showToast('Service not available. Please check configuration.', 'danger');
      return;
    }

    const registrationDtls = buildRegistrationDtlsJson();

    const requestData = {
      OurBranchID: branchId,
      ClientID: clientId,
      OperatorID: operatorId,
      RegistrationDtls: registrationDtls
    };

    try {
      showToast('Saving contract registration...', 'info');

      // Optional debug parity with LC Banks
      try {
        const debug = window.__CORE_API_DEBUG__ === true || window.localStorage?.getItem?.('coreApiDebug') === '1';
        if (debug) {
          const formId = 'dbo.p_AddContractRegistration';
          const now = new Date();
          const envelope = window.CoreApi?.makeRequestEnvelope
            ? window.CoreApi.makeRequestEnvelope(formId, requestData, 'PROJECT_KAIRO')
            : {
                RequestID: formId,
                FormID: formId,
                FormId: formId,
                RequestData: requestData,
                RequestTime: formatLegacyRequestTime(now),
                AppName: 'PROJECT_KAIRO',
                Checksum: ''
              };
          envelope.RequestID = formId;
          envelope.FormID = formId;
          envelope.FormId = formId;
          envelope.RequestTime = formatLegacyRequestTime(now);
          console.log('[SCR] --- FULL SAVE ENVELOPE ---', JSON.stringify(envelope, null, 2));
          console.log('[SCR] --- RegistrationDtls JSON ---', registrationDtls);
        }
      } catch {
        // ignore debug logging errors
      }

      const response = await window.tradeFinanceService.addContractRegistration(requestData);

      if (!response) {
        showToast('No response from server.', 'danger');
        return;
      }

      if (response.IsError || response.ErrorMessage) {
        showToast(response.ErrorMessage || 'Failed to save contract.', 'danger');
        return;
      }

      const status = response?.Details?.Status || response?.data?.Status || response?.Status || null;
      const message = response?.Details?.Message || response?.data?.Message || response?.Message || response?.message || null;
      if (status && status !== '00' && status !== '000') {
        showToast(message || `Failed to save contract. (${status})`, 'danger');
        return;
      }

      const pickContractNo = (obj) => {
        if (!obj) return null;
        if (Array.isArray(obj.Details01) && obj.Details01[0]?.ContractNumber) return obj.Details01[0].ContractNumber;
        if (Array.isArray(obj.Details) && obj.Details[0]?.ContractNumber) return obj.Details[0].ContractNumber;
        if (obj.ContractNumber) return obj.ContractNumber;
        return null;
      };

      const savedContractNumber = pickContractNo(response?.data) || pickContractNo(response);
      if (savedContractNumber) {
        const el = document.getElementById('ContractNumber');
        if (el) el.value = savedContractNumber;
      }

      showToast('Contract saved successfully.', 'success');
      state.hasData = true;
      setMode('view');

      // Refresh from backend to align with canonical values if we have identifiers
      const contractNoNow = (document.getElementById('ContractNumber')?.value || '').trim();
      if (branchId && contractNoNow) {
        setTimeout(() => {
          try {
            fetchContractRegistration();
          } catch {
            // ignore
          }
        }, 300);
      }
    } catch (error) {
      console.error('[SCR] Save error:', error);
      showToast(`Error: ${error.message || 'Failed to save contract.'}`, 'danger');
    }
  }

  function normalizeModeOfPayment(raw) {
    if (!raw) return '';
    const s = String(raw).trim().toUpperCase().replace(/\s+/g, ' ');
    if (!s) return '';

    // Direct code match
    if (s === 'LC' || s === 'L/C') return 'LC';
    if (s === 'TT' || s === 'T/T') return 'TT';
    if (s === 'CAD') return 'CAD';
    if (s === 'CONSIGNMENT') return 'CONSIGNMENT';

    // Description match
    if (s.includes('LETTER') && s.includes('CREDIT')) return 'LC';
    if (s.includes('TELEGRAPHIC') && s.includes('TRANSFER')) return 'TT';
    if (s.includes('CASH') && s.includes('DOCUMENT')) return 'CAD';
    if (s.includes('CONSIGN')) return 'CONSIGNMENT';

    return raw;
  }

  function populateForm(data) {
    if (!data) return;

    console.log('[SCR] populateForm called with data:', data);
    console.log('[SCR] All data keys:', Object.keys(data));
    
    // Show all data for debugging
    console.log('[SCR] Full data dump:');
    Object.keys(data).forEach(key => {
      console.log(`  ${key}:`, data[key]);
    });

    const existingBranchId = (document.getElementById('BranchID')?.value || '').trim();
    const existingBranchName = (document.getElementById('BranchName')?.value || '').trim();
    const existingContractNumber = (document.getElementById('ContractNumber')?.value || '').trim();
    const existingClientId = (document.getElementById('ClientID')?.value || '').trim();
    const existingClientName = (document.getElementById('ClientName')?.value || '').trim();

    const pickedPrice = (data.Price || data.ContractValue || data.ContractAmount || '').toString();

    // Extract ModeOfPayment from various possible keys
    const rawModeOfPayment = data.ModeOfPayment || data.ModeofPayment || data.ModeOfPaymentID || 
                             data.PaymentMode || data.PaymentModeID || data.ModeOfPaymentDesc || '';

    // Extract ShipmentDate from various possible keys
    const rawShipmentDate = data.ShipmentDate || data.ShipmentDt || data.ShipDate || 
                           data.ShippingDate || data.Shipment_Date || data.shipmentdate || '';

    console.log('[SCR] rawModeOfPayment extracted:', rawModeOfPayment);
    console.log('[SCR] rawShipmentDate extracted:', rawShipmentDate);
    console.log('[SCR] normalized ModeOfPayment:', normalizeModeOfPayment(rawModeOfPayment));
    console.log('[SCR] formatted ShipmentDate:', formatDate(rawShipmentDate));

    // Map API response fields to form fields (align with actual form IDs/names).
    const fieldMap = {
      // Avoid wiping identifiers if backend omits them.
      BranchID: (data.OurBranchID || data.BranchID || data.BranchId || existingBranchId || ''),
      BranchName: (data.OurBranchName || data.BranchName || data.BranchDesc || existingBranchName || ''),
      ContractNumber: (data.ContractNumber || data.ContractNo || data.ContractNO || data.Contract_No || existingContractNumber || ''),

      ClientID: (data.ClientID || data.ClientId || existingClientId || ''),
      ClientName: (data.ClientName || data.ClientDescription || data.ClientDesc || data.Name || existingClientName || ''),

      FXPermitNumber: (data.FXPermitNumber || data.PermitNumber || data.PermitNo || ''),

      // Register tab
      Price: pickedPrice,
      ModeOfPayment: normalizeModeOfPayment(rawModeOfPayment),
      CurrencyID: (data.CurrencyID || ''),
      CurrencyName: (data.CurrencyName || data.CurrencyDesc || data.Description || ''),
      QuantityOfGoods: (data.QuantityOfGoods || ''),
      GoodsDescription: (data.GoodsDescription || ''),
      ShipmentDate: formatDateForDisplay(rawShipmentDate),
      Destination: (data.Destination || ''),
      ExporterName: (data.ExporterName || ''),
      ImporterName: (data.ImporterName || ''),
      Drawer: (data.Drawer || ''),
      Drawee: (data.Drawee || ''),
      // p_GetContractRegistration returns CollectingBank + CourierNumber
      CollectingBank1: (data.CollectingBank1 || data.CollectingBank || ''),
      CourierAWBBLNumber1: (data.CourierAWBBLNumber1 || data.CourierNumber || ''),

      // Documents tab
      DocumentID: (data.DocumentID || ''),
      DocumentName: (data.DocumentName || data.DocumentDesc || ''),
      NoOfOriginal: (data.NoOfOriginal || ''),
      NoOfCopy: (data.NoOfCopy || ''),
      DocumentAmount: (data.DocumentAmount || ''),
      DocumentCurrencyID: (data.DocumentCurrencyID || ''),
      DocumentCurrencyName: (data.DocumentCurrencyName || ''),
      Location: (data.Location || ''),
      DocumentLocalAmount: (data.DocumentLocalAmount || ''),
      DocumentImage: (data.DocumentImage || ''),
      Remarks: (data.Remarks || ''),
      RequestedBy: (data.RequestedBy || data.OperatorID || ''),
      RequestedByName: (data.RequestedByName || data.OperatorName || ''),
      RequestedDate: formatDate(data.RequestedDate),

      Status: (data.Status || '')
    };

    // Populate all form fields
    Object.keys(fieldMap).forEach((fieldId) => {
      const el = document.getElementById(fieldId);
      if (el) {
        el.value = fieldMap[fieldId];
        
        // If Flatpickr is initialized on this field, update it too
        if (el._flatpickr && fieldMap[fieldId]) {
          try {
            el._flatpickr.setDate(fieldMap[fieldId], false);
          } catch (e) {
            console.warn(`[SCR] Could not set Flatpickr date for ${fieldId}:`, e);
          }
        }
        
        if (fieldId === 'ShipmentDate' || fieldId === 'ModeOfPayment') {
          console.log(`[SCR] Set ${fieldId}:`, fieldMap[fieldId], '-> el.value:', el.value);
          
          // Check if value persists after 500ms
          setTimeout(() => {
            const currentValue = document.getElementById(fieldId)?.value || '';
            console.log(`[SCR] ${fieldId} after 500ms:`, currentValue);
            if (currentValue !== fieldMap[fieldId]) {
              console.warn(`[SCR] ${fieldId} VALUE CHANGED! Was: "${fieldMap[fieldId]}", Now: "${currentValue}"`);
            }
          }, 500);
        }
      }
    });

    // Generic fallback: for any remaining keys that match element IDs, populate them.
    try {
      Object.keys(data).forEach((k) => {
        if (!k) return;
        if (Object.prototype.hasOwnProperty.call(fieldMap, k)) return;
        const el = document.getElementById(k);
        if (!el) return;
        if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
          const current = (el.value || '').toString();
          if (current && current.trim().length > 0) return;
          const v = data[k];
          if (v === null || v === undefined) return;
          el.value = String(v);
        }
      });
    } catch {
      // ignore
    }
  }

  function extractFirstRowFromResponse(response) {
    const candidates = [];
    const pushArray = (arr) => {
      if (Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'object') candidates.push(arr[0]);
    };

    try {
      pushArray(response?.data?.Details01);
      pushArray(response?.Details01);
      pushArray(response?.data?.Details);
      pushArray(response?.Details);

      // Heuristic: scan response.data for any array-of-objects.
      const dataObj = response?.data;
      if (dataObj && typeof dataObj === 'object') {
        Object.keys(dataObj).forEach((k) => {
          pushArray(dataObj[k]);
        });
      }
    } catch {
      // ignore
    }

    // Prefer objects that look like contract registration.
    const score = (obj) => {
      if (!obj || typeof obj !== 'object') return 0;
      const keys = Object.keys(obj);
      const has = (name) => keys.includes(name);
      let s = 0;
      if (has('ContractNumber') || has('ContractNo')) s += 5;
      if (has('ClientID') || has('ClientId')) s += 3;
      if (has('FXPermitNumber') || has('PermitNo')) s += 2;
      if (has('CurrencyID')) s += 2;
      if (has('Price') || has('ContractValue')) s += 1;
      return s;
    };

    candidates.sort((a, b) => score(b) - score(a));
    return candidates[0] || null;
  }

  function extractDocumentsFromResponse(response) {
    const arrays = [];
    const pushArray = (arr) => {
      if (Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'object') arrays.push(arr);
    };

    try {
      pushArray(response?.data?.Details02);
      pushArray(response?.Details02);
      pushArray(response?.data?.Details2);
      pushArray(response?.Details2);

      const dataObj = response?.data;
      if (dataObj && typeof dataObj === 'object') {
        Object.keys(dataObj).forEach((k) => {
          if (/^Details\d+$/i.test(k)) pushArray(dataObj[k]);
        });
      }
    } catch {
      // ignore
    }

    const looksLikeDocs = (row) => {
      if (!row || typeof row !== 'object') return false;
      return (
        row.DocumentID !== undefined ||
        row.DocumentName !== undefined ||
        row.DocumentTypeID !== undefined ||
        row.ImageID !== undefined ||
        row.MimeType !== undefined
      );
    };

    for (const arr of arrays) {
      if (arr.some(looksLikeDocs)) return arr;
    }
    return [];
  }

  function renderDocumentsGrid(rows) {
    const tbody = form.querySelector('[data-scr-doc-table] tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!Array.isArray(rows) || rows.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="7" class="text-muted">No records to display.</td>';
      tbody.appendChild(tr);
      return;
    }

    const toDocFormShape = (r) => {
      return {
        DocumentID: (r.DocumentID || '').toString(),
        DocumentName: (r.DocumentName || r.DocumentTypeName || '').toString(),
        DocumentCurrencyName: (r.DocumentTypeName || '').toString(),
        DocumentCurrencyID: (r.DocumentTypeID || '').toString(),
        NoOfOriginal: (r.Original ?? '').toString(),
        NoOfCopy: (r.Copy ?? '').toString(),
        Remarks: (r.Remarks || '').toString(),
        Location: (r.Location || r.LocationName || '').toString(),
        RequestedBy: (r.ReceivedBy || '').toString(),
        RequestedByName: '',
        RequestedDate: r.ReceivedDate ? formatDate(r.ReceivedDate) : '',
        DocumentImage: r.ImageID ? String(r.ImageID) : ''
      };
    };

    rows.forEach((r) => {
      const docObj = toDocFormShape(r);
      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';
      tr.dataset.scrDoc = JSON.stringify(docObj);
      tr.innerHTML = [
        docObj.DocumentID,
        docObj.DocumentName,
        (r.DocumentTypeName || r.DocumentTypeID || ''),
        (r.LocationName || r.Location || ''),
        docObj.Remarks,
        (r.ReceivedBy || ''),
        (r.ReceivedDate ? formatDate(r.ReceivedDate) : '')
      ].map((c) => `<td>${(c ?? '').toString()}</td>`).join('');
      tbody.appendChild(tr);
    });
  }

  async function hydrateClientNameIfMissing() {
    const clientId = (document.getElementById('ClientID')?.value || '').trim();
    const clientNameField = document.getElementById('ClientName');
    const existingName = (clientNameField?.value || '').trim();
    if (!clientId || existingName) return;

    if (!window.tradeFinanceService?.search) return;

    const branchId = (document.getElementById('BranchID')?.value || '').trim() || '002';
    const operatorId = window.sessionStorage?.getItem?.('operatorId') || 'web_portal';

    const requestData = {
      TableID: 'Client',
      AdvFilterString: "CloseDate Is NULL AND ClientStatusID='A'",
      WhereStmt: `ClientID='${clientId}'`,
      PrevOrNext: '1',
      RefID: '',
      OperatorID: operatorId,
      ModuleID: 1837,
      OurBranchID: branchId,
      SearchKey: clientId,
      LanguageID: 'en'
    };

    try {
      const response = await window.tradeFinanceService.search(requestData);
      const results = response?.data?.Details || response?.Details || response?.data || [];
      const row = Array.isArray(results) ? results[0] : null;
      const pickedName = row?.ClientName || row?.Name || row?.Description || row?.ClientDesc || row?.ClientDescription || '';
      if (clientNameField && pickedName) {
        clientNameField.value = pickedName;
      }
    } catch {
      // Non-blocking; client name will remain blank if lookup fails
    }
  }

  async function hydrateRequestedByNameIfMissing() {
    const requestedById = (document.getElementById('RequestedBy')?.value || '').trim();
    const requestedByNameField = document.getElementById('RequestedByName');

    if (!requestedById) {
      if (requestedByNameField) {
        requestedByNameField.value = '';
        delete requestedByNameField.dataset.forId;
      }
      return;
    }

    const existingName = (requestedByNameField?.value || '').trim();
    const existingForId = (requestedByNameField?.dataset?.forId || '').trim();
    if (existingName && existingForId === requestedById) return;

    if (!window.tradeFinanceService?.search) return;

    const branchId = (document.getElementById('BranchID')?.value || '').trim() || '002';
    const operatorId = window.sessionStorage?.getItem?.('operatorId') || 'web_portal';

    const requestData = {
      TableID: 'OperatorID',
      AdvFilterString: '',
      WhereStmt: `OperatorID='${requestedById}'`,
      PrevOrNext: '1',
      RefID: '',
      OperatorID: operatorId,
      ModuleID: 1837,
      OurBranchID: branchId,
      SearchKey: requestedById,
      LanguageID: 'en'
    };

    const extractRowsFromSearchResponse = (response) => {
      const candidates = [
        response?.data?.Details,
        response?.Details,
        response?.data,
        response?.data?.data,
        response?.data?.Details01,
        response?.data?.Details02,
        response?.Details01,
        response?.Details02
      ];

      for (const c of candidates) {
        if (Array.isArray(c)) return c;
      }

      const nestedDetails = response?.data?.Details || response?.Details;
      if (Array.isArray(nestedDetails)) {
        for (const item of nestedDetails) {
          if (Array.isArray(item?.Details)) return item.Details;
        }
      }

      return [];
    };

    try {
      const response = await window.tradeFinanceService.search(requestData);
      const results = extractRowsFromSearchResponse(response);
      const row = Array.isArray(results) ? results[0] : null;
      const pickedName =
        row?.OperatorName ||
        row?.FullName ||
        row?.Full_Name ||
        row?.OperatorDesc ||
        row?.ClientName ||
        row?.Name ||
        row?.UserName ||
        row?.Description ||
        '';
      if (requestedByNameField && pickedName) {
        requestedByNameField.value = pickedName;
        requestedByNameField.dataset.forId = requestedById;
      }
    } catch {
      // Non-blocking
    }
  }

  async function hydrateCurrencyNameIfMissing() {
    const currencyIdField = document.getElementById('CurrencyID');
    const currencyNameField = document.getElementById('CurrencyName');
    const currencyId = (currencyIdField?.value || '').trim();

    if (!currencyId) {
      if (currencyNameField) {
        currencyNameField.value = '';
        delete currencyNameField.dataset.forId;
      }
      return;
    }

    const existingName = (currencyNameField?.value || '').trim();
    const existingForId = (currencyNameField?.dataset?.forId || '').trim();
    if (existingName && existingForId === currencyId) return;

    const cached = currencyLookupCache.byId.get(currencyId);
    if (cached) {
      if (currencyNameField) {
        currencyNameField.value = cached;
        currencyNameField.dataset.forId = currencyId;
      }
      return;
    }

    if (!window.tradeFinanceService?.searchCurrencies) return;

    const now = Date.now();
    if (now - currencyLookupCache.fetchedAt > currencyLookupCache.ttlMs) {
      currencyLookupCache.byId.clear();
      currencyLookupCache.fetchedAt = now;
    }

    try {
      const response = await window.tradeFinanceService.searchCurrencies({});

      let rows = [];
      if (response?.data?.Details && Array.isArray(response.data.Details)) {
        rows = response.data.Details;
      } else if (response?.Details && Array.isArray(response.Details)) {
        rows = response.Details;
      } else if (response?.data && Array.isArray(response.data)) {
        rows = response.data;
      }

      rows.forEach((r) => {
        const id = (r?.CurrencyID || r?.CurrencyId || r?.Code || r?.CurrencyCode || '').toString().trim();
        if (!id) return;
        const name = (r?.CurrencyName || r?.CurrencyDesc || r?.Description || r?.Name || '').toString().trim();
        if (name) currencyLookupCache.byId.set(id, name);
      });

      const name = currencyLookupCache.byId.get(currencyId) || '';
      if (currencyNameField) {
        currencyNameField.value = name;
        currencyNameField.dataset.forId = currencyId;
      }

      if (!name) {
        showToast('Currency not found for the given Currency ID.', 'warning');
      }
    } catch (err) {
      console.error('[SCR] Currency lookup error:', err);
    }
  }

  async function hydrateDocumentCurrencyNameIfMissing() {
    const currencyIdField = document.getElementById('DocumentCurrencyID');
    const currencyNameField = document.getElementById('DocumentCurrencyName');
    const currencyId = (currencyIdField?.value || '').trim();

    if (!currencyId) {
      if (currencyNameField) {
        currencyNameField.value = '';
        delete currencyNameField.dataset.forId;
      }
      return;
    }

    const existingName = (currencyNameField?.value || '').trim();
    const existingForId = (currencyNameField?.dataset?.forId || '').trim();
    if (existingName && existingForId === currencyId) return;

    const cached = currencyLookupCache.byId.get(currencyId);
    if (cached) {
      if (currencyNameField) {
        currencyNameField.value = cached;
        currencyNameField.dataset.forId = currencyId;
      }
      return;
    }

    if (!window.tradeFinanceService?.searchCurrencies) return;

    const now = Date.now();
    if (now - currencyLookupCache.fetchedAt > currencyLookupCache.ttlMs) {
      currencyLookupCache.byId.clear();
      currencyLookupCache.fetchedAt = now;
    }

    try {
      const response = await window.tradeFinanceService.searchCurrencies({});

      let rows = [];
      if (response?.data?.Details && Array.isArray(response.data.Details)) {
        rows = response.data.Details;
      } else if (response?.Details && Array.isArray(response.Details)) {
        rows = response.Details;
      } else if (response?.data && Array.isArray(response.data)) {
        rows = response.data;
      }

      rows.forEach((r) => {
        const id = (r?.CurrencyID || r?.CurrencyId || r?.Code || r?.CurrencyCode || '').toString().trim();
        if (!id) return;
        const name = (r?.CurrencyName || r?.CurrencyDesc || r?.Description || r?.Name || '').toString().trim();
        if (name) currencyLookupCache.byId.set(id, name);
      });

      const name = currencyLookupCache.byId.get(currencyId) || '';
      if (currencyNameField) {
        currencyNameField.value = name;
        currencyNameField.dataset.forId = currencyId;
      }

      if (!name) {
        showToast('Currency not found for the given Document Currency ID.', 'warning');
      }
    } catch (err) {
      console.error('[SCR] Document currency lookup error:', err);
    }
  }

  async function fetchContractRegistration() {
    const branchId = (document.getElementById('BranchID')?.value || '').trim();
    const contractNumber = (document.getElementById('ContractNumber')?.value || '').trim();

    if (!branchId) {
      showToast('Branch ID is required to view contract.', 'danger');
      return;
    }

    if (!contractNumber) {
      showToast('Contract Number is required to view contract.', 'danger');
      return;
    }

    const requestData = {
      OurBranchID: branchId,
      ContractNumber: contractNumber
    };

    try {
      showToast('Fetching contract data...', 'info');

      // Reset to "no-data" view state while fetching.
      state.hasData = false;
      setButtons();

      if (!window.tradeFinanceService?.getContractRegistration) {
        showToast('Service not available. Please check configuration.', 'danger');
        return;
      }

      const response = await window.tradeFinanceService.getContractRegistration(requestData);

      if (!response) {
        showToast('No response from server.', 'danger');
        return;
      }

      // Check for error response
      if (response.IsError || response.ErrorMessage) {
        showToast(response.ErrorMessage || 'Failed to fetch contract.', 'danger');
        return;
      }

      const contractData = extractFirstRowFromResponse(response);
      const docRows = extractDocumentsFromResponse(response);

      if (contractData) {
        populateForm(contractData);
        renderDocumentsGrid(docRows);
        await hydrateClientNameIfMissing();
        showToast('Contract loaded successfully.', 'success');

        state.hasData = true;
        setButtons();
      } else {
        showToast('No contract data found.', 'warning');
        state.hasData = false;
        setButtons();
      }
    } catch (error) {
      console.error('Error fetching contract:', error);
      showToast(`Error: ${error.message || 'Failed to fetch contract.'}`, 'danger');
      state.hasData = false;
      setButtons();
    }
  }

  const branchLookupCache = {
    fetchedAt: 0,
    ttlMs: 5 * 60 * 1000,
    byId: new Map()
  };

  const currencyLookupCache = {
    fetchedAt: 0,
    ttlMs: 10 * 60 * 1000,
    byId: new Map()
  };

  const requestedByLookupCache = {
    fetchedAt: 0,
    ttlMs: 3 * 60 * 1000,
    key: '',
    results: []
  };

  function showSearchModalLoading(title, lookupType) {
    const modalEl = document.getElementById('searchResultsModal');
    if (!modalEl) return;

    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    const titleEl = document.getElementById('searchResultsTitle');
    const searchFiltersContainer = document.getElementById('searchFiltersContainer');
    const headerEl = document.getElementById('searchResultsHeader');
    const bodyEl = document.getElementById('searchResultsBody');
    const emptyEl = document.getElementById('searchResultsEmpty');
    const containerEl = document.getElementById('searchResultsContainer');
    const countLabel = document.getElementById('searchResultsCountLabel');

    modalEl._allResults = [];
    modalEl._lookupType = lookupType;
    modalEl._currentFilters = {};
    modalEl._pageIndex = 0;
    modalEl._pageSize = 10;

    if (titleEl) titleEl.textContent = title;
    if (countLabel) countLabel.textContent = 'Search Results (Loading...)';

    try {
      generateSearchFilters(lookupType, searchFiltersContainer);
    } catch {
      // ignore
    }

    if (headerEl) headerEl.innerHTML = '';
    if (bodyEl) bodyEl.innerHTML = '<tr><td class="text-muted" style="padding: 12px;">Loading...</td></tr>';
    if (containerEl) containerEl.style.display = 'block';
    if (emptyEl) emptyEl.style.display = 'none';

    modal.show();
  }

  async function hydrateBranchNameIfMissing() {
    const branchIdField = document.getElementById('BranchID');
    const branchNameField = document.getElementById('BranchName');
    const branchId = (branchIdField?.value || '').trim();
    const existingName = (branchNameField?.value || '').trim();

    if (!branchId) {
      if (branchNameField) branchNameField.value = '';
      return;
    }

    if (existingName) return;
    if (!window.tradeFinanceService?.searchBranches) return;

    const now = Date.now();
    const cached = branchLookupCache.byId.get(branchId);
    if (cached) {
      if (branchNameField) branchNameField.value = cached;
      return;
    }

    // Refresh cache periodically to avoid calling searchBranches too often.
    if (now - branchLookupCache.fetchedAt > branchLookupCache.ttlMs) {
      branchLookupCache.byId.clear();
      branchLookupCache.fetchedAt = now;
    }

    try {
      const response = await window.tradeFinanceService.searchBranches({ BankID: '00' });

      let branches = [];
      if (response?.data?.Details && Array.isArray(response.data.Details)) {
        branches = response.data.Details;
      } else if (response?.Details && Array.isArray(response.Details)) {
        branches = response.Details;
      } else if (response?.data && Array.isArray(response.data)) {
        branches = response.data;
      }

      branches.forEach((b) => {
        const id = (b?.OurBranchID || b?.BranchID || b?.BranchId || '').toString().trim();
        if (!id) return;
        const name = (b?.BranchName || b?.Name || b?.Description || '').toString().trim();
        if (name) branchLookupCache.byId.set(id, name);
      });

      const name = branchLookupCache.byId.get(branchId) || '';
      if (branchNameField) branchNameField.value = name;
      if (!name) {
        showToast('Branch not found for the given Branch ID.', 'warning');
      }
    } catch (err) {
      console.error('[SCR] Branch lookup error:', err);
    }
  }

  function handleLookup(kind) {
    if (kind === 'document') {
      searchDocument();
    } else if (kind === 'currency') {
      searchCurrency();
    } else if (kind === 'documentCurrency') {
      searchDocumentCurrency();
    } else if (kind === 'branch') {
      searchBranch();
    } else if (kind === 'client') {
      searchClient();
    } else if (kind === 'requestedBy') {
      searchRequestedBy();
    } else if (kind === 'fxPermit') {
      searchFXPermit();
    } else if (kind === 'contract') {
      searchContract();
    } else {
      showToast(`Lookup: ${kind} - Please implement search functionality.`, 'info');
    }
  }

  // Add: Document Currency search logic
  async function searchDocumentCurrency() {
    try {
      showToast('Searching for currencies...', 'info');
      if (!window.tradeFinanceService) {
        showToast('Service not available. Please check configuration.', 'danger');
        return;
      }
      const requestData = {};
      const response = await window.tradeFinanceService.searchCurrencies(requestData);
      let results = [];
      if (response?.data?.Details && Array.isArray(response.data.Details)) {
        results = response.data.Details;
      } else if (response?.Details && Array.isArray(response.Details)) {
        results = response.Details;
      } else if (response?.data && Array.isArray(response.data)) {
        results = response.data;
      }
      if (results.length === 0) {
        showToast('No currencies found.', 'warning');
        return;
      }
      showDocumentCurrencySearchResults(results);
    } catch (error) {
      console.error('Error searching currencies:', error);
      showToast(`Error: ${error.message || 'Search failed.'}`, 'danger');
    }
  }

  // Show modal for Document Currency search
  function showDocumentCurrencySearchResults(results) {
    const modalEl = document.getElementById('searchResultsModal');
    if (!modalEl) {
      showToast('Search results modal not found.', 'danger');
      return;
    }
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    const titleEl = document.getElementById('searchResultsTitle');
    const searchFiltersContainer = document.getElementById('searchFiltersContainer');
    const searchButton = document.getElementById('searchButton');
    modalEl._allResults = results;
    modalEl._lookupType = 'documentCurrency';
    modalEl._currentFilters = {};
    modalEl._pageIndex = 0;
    modalEl._pageSize = 10;
    if (titleEl) {
      titleEl.textContent = 'Document Currency';
    }
    generateSearchFilters('currency', searchFiltersContainer);
    renderFilteredResults(results, 'documentCurrency');
    if (searchButton) {
      searchButton.onclick = function () {
        performFilteredSearch(modalEl);
      };
    }
    modal.show();
    modalEl.addEventListener('shown.bs.modal', function () {
      const firstInput = searchFiltersContainer.querySelector('input');
      if (firstInput) firstInput.focus();
    }, { once: true });
  }

  // Select for Document Currency
  function selectDocumentCurrency(data) {
    const currencyIdField = document.getElementById('DocumentCurrencyID');
    const currencyNameField = document.getElementById('DocumentCurrencyName');
    if (currencyIdField && data.CurrencyID) {
      currencyIdField.value = data.CurrencyID;
    }
    if (currencyNameField && data.CurrencyName) {
      currencyNameField.value = data.CurrencyName;
      currencyNameField.dataset.forId = (data.CurrencyID || '').toString();
    } else if (currencyNameField && data.Description) {
      currencyNameField.value = data.Description;
      currencyNameField.dataset.forId = (data.CurrencyID || '').toString();
    } else if (currencyNameField && data.Name) {
      currencyNameField.value = data.Name;
      currencyNameField.dataset.forId = (data.CurrencyID || '').toString();
    }

    try {
      const id = (data.CurrencyID || '').toString().trim();
      const name = (data.CurrencyName || data.Description || data.Name || '').toString().trim();
      if (id && name) currencyLookupCache.byId.set(id, name);
    } catch {
      // ignore
    }
    showToast('Document currency selected.', 'success');
  }

  async function searchCurrency() {
    try {
      showToast('Searching for currencies...', 'info');

      if (!window.tradeFinanceService) {
        showToast('Service not available. Please check configuration.', 'danger');
        return;
      }

      // Empty request data - the service will fetch all currencies
      const requestData = {};

      const response = await window.tradeFinanceService.searchCurrencies(requestData);
      
      let results = [];
      if (response?.data?.Details && Array.isArray(response.data.Details)) {
        results = response.data.Details;
      } else if (response?.Details && Array.isArray(response.Details)) {
        results = response.Details;
      } else if (response?.data && Array.isArray(response.data)) {
        results = response.data;
      }

      if (results.length === 0) {
        showToast('No currencies found.', 'warning');
        return;
      }

      showCurrencySearchResults(results);
    } catch (error) {
      console.error('Error searching currencies:', error);
      showToast(`Error: ${error.message || 'Search failed.'}`, 'danger');
    }
  }

  async function searchBranch() {
    try {
      showToast('Searching for branches...', 'info');

      if (!window.tradeFinanceService) {
        showToast('Service not available. Please check configuration.', 'danger');
        return;
      }

      // Request data with BankID to fetch all branches
      const requestData = {
        BankID: '00'
      };

      const response = await window.tradeFinanceService.searchBranches(requestData);
      
      let results = [];
      if (response?.data?.Details && Array.isArray(response.data.Details)) {
        results = response.data.Details;
      } else if (response?.Details && Array.isArray(response.Details)) {
        results = response.Details;
      } else if (response?.data && Array.isArray(response.data)) {
        results = response.data;
      }

      if (results.length === 0) {
        showToast('No branches found.', 'warning');
        return;
      }

      showBranchSearchResults(results);
    } catch (error) {
      console.error('Error searching branches:', error);
      showToast(`Error: ${error.message || 'Search failed.'}`, 'danger');
    }
  }

  async function searchClient() {
    try {
      showToast('Searching for clients with sales contracts...', 'info');

      if (!window.tradeFinanceService) {
        showToast('Service not available. Please check configuration.', 'danger');
        return;
      }

      const branchId = document.getElementById('BranchID')?.value || '002';
      const operatorId = window.sessionStorage?.getItem?.('operatorId') || 'web_portal';

      // Prefer showing only clients that appear on sales contract search results.
      // This avoids relying on backend subqueries/views that may vary by deployment.
      const contractSearchRequest = {
        TableID: 'ContractNumber',
        AdvFilterString: '',
        WhereStmt: '',
        PrevOrNext: '1',
        RefID: '',
        OperatorID: operatorId,
        ModuleID: 1837,
        OurBranchID: branchId,
        SearchKey: '',
        LanguageID: 'en'
      };

      let contractRows = [];
      try {
        const contractResp = await window.tradeFinanceService.search(contractSearchRequest);
        if (contractResp?.data?.Details && Array.isArray(contractResp.data.Details)) {
          contractRows = contractResp.data.Details;
        } else if (contractResp?.Details && Array.isArray(contractResp.Details)) {
          contractRows = contractResp.Details;
        } else if (contractResp?.data && Array.isArray(contractResp.data)) {
          contractRows = contractResp.data;
        }
      } catch {
        contractRows = [];
      }

      if (Array.isArray(contractRows) && contractRows.length > 0) {
        const seen = new Set();
        const clients = [];
        contractRows.forEach((row) => {
          const id = (row?.ClientID || row?.ClientId || row?.CustomerID || row?.CustomerId || '').toString().trim();
          if (!id || seen.has(id)) return;
          seen.add(id);
          const name = (row?.ClientName || row?.Name || row?.ClientDesc || row?.ClientDescription || row?.CustomerName || '').toString().trim();
          clients.push({ ClientID: id, Name: name });
        });

        if (clients.length > 0) {
          showClientSearchResults(clients);
          return;
        }
      }

      showToast('No contract-linked clients returned; showing all active clients.', 'warning');

      const requestData = {
        TableID: 'Client',
        AdvFilterString: "CloseDate Is NULL AND ClientStatusID='A'",
        WhereStmt: '',
        PrevOrNext: '1',
        RefID: '',
        OperatorID: operatorId,
        ModuleID: 1837,
        OurBranchID: branchId,
        SearchKey: '',
        LanguageID: 'en'
      };

      const response = await window.tradeFinanceService.search(requestData);
      
      let results = [];
      if (response?.data?.Details && Array.isArray(response.data.Details)) {
        results = response.data.Details;
      } else if (response?.Details && Array.isArray(response.Details)) {
        results = response.Details;
      } else if (response?.data && Array.isArray(response.data)) {
        results = response.data;
      }

      if (results.length === 0) {
        showToast('No clients found.', 'warning');
        return;
      }

      showClientSearchResults(results);
    } catch (error) {
      console.error('Error searching clients:', error);
      showToast(`Error: ${error.message || 'Search failed.'}`, 'danger');
    }
  }

  async function searchRequestedBy() {
    try {
      showToast('Searching for operators...', 'info');

      if (!window.tradeFinanceService) {
        showToast('Service not available. Please check configuration.', 'danger');
        return;
      }

      const branchId = document.getElementById('BranchID')?.value || '002';
      const operatorId = window.sessionStorage?.getItem?.('operatorId') || 'web_portal';

      const seed = (document.getElementById('RequestedBy')?.value || '').toString().trim();
      const cacheKey = `${branchId}::${seed.toUpperCase()}`;
      const now = Date.now();
      if (
        requestedByLookupCache.key === cacheKey &&
        now - requestedByLookupCache.fetchedAt <= requestedByLookupCache.ttlMs &&
        Array.isArray(requestedByLookupCache.results) &&
        requestedByLookupCache.results.length
      ) {
        showRequestedBySearchResults(requestedByLookupCache.results);
        return;
      }

      // Show the modal immediately so the user sees feedback without waiting for the API.
      showSearchModalLoading('Requested By', 'requestedBy');

      const escapeSql = (s) => String(s).replace(/'/g, "''");
      const seedEscaped = seed ? escapeSql(seed) : '';

      const requestData = {
        TableID: 'OperatorID',
        AdvFilterString: '',
        WhereStmt: seedEscaped ? `(OperatorID like '%${seedEscaped}%' OR ClientName like '%${seedEscaped}%')` : '',
        PrevOrNext: '1',
        RefID: '',
        OperatorID: operatorId,
        ModuleID: 1837,
        OurBranchID: branchId,
        SearchKey: seedEscaped,
        LanguageID: 'en'
      };

      const response = await window.tradeFinanceService.search(requestData);

      const results = response?.data?.Details || response?.Details || response?.data || [];

      requestedByLookupCache.key = cacheKey;
      requestedByLookupCache.fetchedAt = Date.now();
      requestedByLookupCache.results = Array.isArray(results) ? results : [];

      showRequestedBySearchResults(results);
    } catch (error) {
      console.error('Error searching operators:', error);
      showToast(`Error: ${error.message || 'Failed to search operators.'}`, 'danger');
    }
  }

  async function searchFXPermit() {
    try {
      showToast('Searching for FX permits...', 'info');

      if (!window.tradeFinanceService) {
        showToast('Service not available. Please check configuration.', 'danger');
        return;
      }

      const branchId = document.getElementById('BranchID')?.value || '002';
      const clientId = document.getElementById('ClientID')?.value || '';
      const operatorId = window.sessionStorage?.getItem?.('operatorId') || 'web_portal';

      // Build dynamic AdvFilterString with OurBranchID and ClientID
      const advFilterString = `OurBranchID='${branchId}' AND ClientID='${clientId}'`;

      const requestData = {
        TableID: 'PermitNo',
        AdvFilterString: advFilterString,
        WhereStmt: '',
        PrevOrNext: '1',
        RefID: '',
        OperatorID: operatorId,
        ModuleID: 1837,
        OurBranchID: branchId,
        SearchKey: '',
        LanguageID: 'en'
      };

      const response = await window.tradeFinanceService.search(requestData);
      
      const results = response?.data?.Details || response?.Details || [];
      showFXPermitSearchResults(results);
    } catch (error) {
      console.error('Error searching FX permits:', error);
      showToast(`Error: ${error.message || 'Failed to search FX permits.'}`, 'danger');
    }
  }

  async function searchContract() {
    try {
      showToast('Searching for contracts...', 'info');

      if (!window.tradeFinanceService?.search) {
        showToast('Service not available. Please check configuration.', 'danger');
        return;
      }

      const branchId = document.getElementById('BranchID')?.value || '002';
      const operatorId = window.sessionStorage?.getItem?.('operatorId') || 'web_portal';

      const requestData = {
        TableID: 'ContractNumber',
        AdvFilterString: '',
        WhereStmt: '',
        PrevOrNext: '1',
        RefID: '',
        OperatorID: operatorId,
        ModuleID: 1837,
        OurBranchID: branchId,
        SearchKey: '',
        LanguageID: 'en'
      };

      const response = await window.tradeFinanceService.search(requestData);
      
      let results = [];
      if (response?.data?.Details && Array.isArray(response.data.Details)) {
        results = response.data.Details;
      } else if (response?.Details && Array.isArray(response.Details)) {
        results = response.Details;
      } else if (response?.data && Array.isArray(response.data)) {
        results = response.data;
      }

      if (results.length === 0) {
        showToast('No contracts found.', 'warning');
        return;
      }

      showContractSearchResults(results);
    } catch (error) {
      console.error('Error searching contracts:', error);
      showToast(`Error: ${error.message || 'Failed to search contracts.'}`, 'danger');
    }
  }

  async function searchDocument() {
    try {
      showToast('Searching for documents...', 'info');

      if (!window.tradeFinanceService) {
        showToast('Service not available. Please check configuration.', 'danger');
        return;
      }

      const operatorId = window.sessionStorage?.getItem?.('operatorId') || 'web_portal';
      const branchId = document.getElementById('BranchID')?.value || '002';
      
      const requestData = {
        TableID: 'DocumentID',
        AdvFilterString: "BankID='00'",
        WhereStmt: '',
        PrevOrNext: '1',
        RefID: '',
        OperatorID: operatorId,
        ModuleID: 1837,
        OurBranchID: branchId,
        SearchKey: '',
        LanguageID: 'en'
      };

      const response = await window.tradeFinanceService.search(requestData);
      
      let results = [];
      if (response?.data?.Details && Array.isArray(response.data.Details)) {
        results = response.data.Details;
      } else if (response?.Details && Array.isArray(response.Details)) {
        results = response.Details;
      }

      if (results.length === 0) {
        showToast('No documents found.', 'warning');
        return;
      }

      showDocumentSearchResults(results);
    } catch (error) {
      console.error('Error searching documents:', error);
      showToast(`Error: ${error.message || 'Search failed.'}`, 'danger');
    }
  }

  function showCurrencySearchResults(results) {
    const modalEl = document.getElementById('searchResultsModal');
    if (!modalEl) {
      showToast('Search results modal not found.', 'danger');
      return;
    }

    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    const titleEl = document.getElementById('searchResultsTitle');
    const searchFiltersContainer = document.getElementById('searchFiltersContainer');
    const searchButton = document.getElementById('searchButton');

    // Store all results and config
    modalEl._allResults = results;
    modalEl._lookupType = 'currency';
    modalEl._currentFilters = {};
    modalEl._pageIndex = 0;
    modalEl._pageSize = 10;

    // Set modal title
    if (titleEl) {
      titleEl.textContent = 'Currency';
    }

    // Generate dynamic search filters
    generateSearchFilters('currency', searchFiltersContainer);

    // Render initial results
    renderFilteredResults(results, 'currency');

    // Wire search button
    if (searchButton) {
      searchButton.onclick = function () {
        performFilteredSearch(modalEl);
      };
    }

    modal.show();

    // Focus first filter input when modal is shown
    modalEl.addEventListener('shown.bs.modal', function () {
      const firstInput = searchFiltersContainer.querySelector('input');
      if (firstInput) firstInput.focus();
    }, { once: true });
  }

  function showBranchSearchResults(results) {
    const modalEl = document.getElementById('searchResultsModal');
    if (!modalEl) {
      showToast('Search results modal not found.', 'danger');
      return;
    }

    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    const titleEl = document.getElementById('searchResultsTitle');
    const searchFiltersContainer = document.getElementById('searchFiltersContainer');
    const searchButton = document.getElementById('searchButton');

    // Store all results and config
    modalEl._allResults = results;
    modalEl._lookupType = 'branch';
    modalEl._currentFilters = {};
    modalEl._pageIndex = 0;
    modalEl._pageSize = 10;

    // Set modal title
    if (titleEl) {
      titleEl.textContent = 'Branch';
    }

    // Generate dynamic search filters
    generateSearchFilters('branch', searchFiltersContainer);

    // Render initial results
    renderFilteredResults(results, 'branch');

    // Wire search button
    if (searchButton) {
      searchButton.onclick = function () {
        performFilteredSearch(modalEl);
      };
    }

    modal.show();

    // Focus first filter input when modal is shown
    modalEl.addEventListener('shown.bs.modal', function () {
      const firstInput = searchFiltersContainer.querySelector('input');
      if (firstInput) firstInput.focus();
    }, { once: true });
  }

  function showClientSearchResults(results) {
    const modalEl = document.getElementById('searchResultsModal');
    if (!modalEl) {
      showToast('Search results modal not found.', 'danger');
      return;
    }

    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    const titleEl = document.getElementById('searchResultsTitle');
    const searchFiltersContainer = document.getElementById('searchFiltersContainer');
    const searchButton = document.getElementById('searchButton');

    // Store all results and config
    modalEl._allResults = results;
    modalEl._lookupType = 'client';
    modalEl._currentFilters = {};
    modalEl._pageIndex = 0;
    modalEl._pageSize = 10;

    // Set modal title
    if (titleEl) {
      titleEl.textContent = 'Client';
    }

    // Generate dynamic search filters
    generateSearchFilters('client', searchFiltersContainer);

    // Render initial results
    renderFilteredResults(results, 'client');

    // Wire search button
    if (searchButton) {
      searchButton.onclick = function () {
        performFilteredSearch(modalEl);
      };
    }

    modal.show();

    // Focus first filter input when modal is shown
    modalEl.addEventListener('shown.bs.modal', function () {
      const firstInput = searchFiltersContainer.querySelector('input');
      if (firstInput) firstInput.focus();
    }, { once: true });
  }

  function showRequestedBySearchResults(results) {
    const modalEl = document.getElementById('searchResultsModal');
    if (!modalEl) {
      showToast('Search results modal not found.', 'danger');
      return;
    }

    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    const titleEl = document.getElementById('searchResultsTitle');
    const searchFiltersContainer = document.getElementById('searchFiltersContainer');
    const searchButton = document.getElementById('searchButton');

    // Store all results and config
    modalEl._allResults = results;
    modalEl._lookupType = 'requestedBy';
    modalEl._currentFilters = {};
    modalEl._pageIndex = 0;
    modalEl._pageSize = 10;

    // Set modal title
    if (titleEl) {
      titleEl.textContent = 'Requested By';
    }

    // Generate dynamic search filters
    generateSearchFilters('requestedBy', searchFiltersContainer);

    // Render initial results
    renderFilteredResults(results, 'requestedBy');

    // Wire search button
    if (searchButton) {
      searchButton.onclick = function () {
        performFilteredSearch(modalEl);
      };
    }

    modal.show();

    // Focus first filter input when modal is shown
    modalEl.addEventListener('shown.bs.modal', function () {
      const firstInput = searchFiltersContainer.querySelector('input');
      if (firstInput) firstInput.focus();
    }, { once: true });
  }

  function showFXPermitSearchResults(results) {
    const modalEl = document.getElementById('searchResultsModal');
    if (!modalEl) {
      showToast('Search results modal not found.', 'danger');
      return;
    }

    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    const titleEl = document.getElementById('searchResultsTitle');
    const searchFiltersContainer = document.getElementById('searchFiltersContainer');
    const searchButton = document.getElementById('searchButton');

    // Store all results and config
    modalEl._allResults = results;
    modalEl._lookupType = 'fxPermit';
    modalEl._currentFilters = {};
    modalEl._pageIndex = 0;
    modalEl._pageSize = 10;

    // Set modal title
    if (titleEl) {
      titleEl.textContent = 'FX Permits';
    }

    // Generate dynamic search filters
    generateSearchFilters('fxPermit', searchFiltersContainer);

    // Render initial results
    renderFilteredResults(results, 'fxPermit');

    // Wire search button
    if (searchButton) {
      searchButton.onclick = function () {
        performFilteredSearch(modalEl);
      };
    }

    modal.show();

    // Focus first filter input when modal is shown
    modalEl.addEventListener('shown.bs.modal', function () {
      const firstInput = searchFiltersContainer.querySelector('input');
      if (firstInput) firstInput.focus();
    }, { once: true });
  }

  function showContractSearchResults(results) {
    const modalEl = document.getElementById('searchResultsModal');
    if (!modalEl) {
      showToast('Search results modal not found.', 'danger');
      return;
    }

    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    const titleEl = document.getElementById('searchResultsTitle');
    const searchFiltersContainer = document.getElementById('searchFiltersContainer');
    const searchButton = document.getElementById('searchButton');

    // Store all results and config
    modalEl._allResults = results;
    modalEl._lookupType = 'contract';
    modalEl._currentFilters = {};
    modalEl._pageIndex = 0;
    modalEl._pageSize = 10;

    // Set modal title
    if (titleEl) {
      titleEl.textContent = 'Contracts';
    }

    // Generate dynamic search filters
    generateSearchFilters('contract', searchFiltersContainer);

    // Render initial results
    renderFilteredResults(results, 'contract');

    // Wire search button
    if (searchButton) {
      searchButton.onclick = function () {
        performFilteredSearch(modalEl);
      };
    }

    modal.show();

    // Focus first filter input when modal is shown
    modalEl.addEventListener('shown.bs.modal', function () {
      const firstInput = searchFiltersContainer.querySelector('input');
      if (firstInput) firstInput.focus();
    }, { once: true });
  }

  function showDocumentSearchResults(results) {
    const modalEl = document.getElementById('searchResultsModal');
    if (!modalEl) {
      showToast('Search results modal not found.', 'danger');
      return;
    }

    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    const titleEl = document.getElementById('searchResultsTitle');
    const searchFiltersContainer = document.getElementById('searchFiltersContainer');
    const searchButton = document.getElementById('searchButton');

    // Store all results and config
    modalEl._allResults = results;
    modalEl._lookupType = 'document';
    modalEl._currentFilters = {};
    modalEl._pageIndex = 0;
    modalEl._pageSize = 10;

    // Set modal title
    if (titleEl) {
      titleEl.textContent = 'Document';
    }

    // Generate dynamic search filters
    generateSearchFilters('document', searchFiltersContainer);

    // Render initial results
    renderFilteredResults(results, 'document');

    // Wire search button
    if (searchButton) {
      searchButton.onclick = function () {
        performFilteredSearch(modalEl);
      };
    }

    modal.show();

    // Focus first filter input when modal is shown
    modalEl.addEventListener('shown.bs.modal', function () {
      const firstInput = searchFiltersContainer.querySelector('input');
      if (firstInput) firstInput.focus();
    }, { once: true });
  }

  function generateSearchFilters(lookupType, container) {
    if (!container) return;

    // Define filter fields based on lookup type
    const filterConfigs = {
      document: [
        { label: 'Document ID', field: 'DocumentID', type: 'text' },
        { label: 'Description', field: 'Description', type: 'text' }
      ],
      currency: [
        { label: 'Currency ID', field: 'CurrencyID', type: 'text' },
        { label: 'Currency Name', field: 'CurrencyName', type: 'text' }
      ],
      branch: [
        { label: 'Branch ID', field: 'OurBranchID', type: 'text' },
        { label: 'Branch Name', field: 'BranchName', type: 'text' }      ],
      client: [
        { label: 'Client ID', field: 'ClientID', type: 'text' },
        { label: 'Client Name', field: 'Name', type: 'text' }
      ],
      requestedBy: [
        { label: 'Operator ID', field: 'OperatorID', type: 'text' },
        { label: 'Client Name', field: 'ClientName', type: 'text' }
      ],
      fxPermit: [
        { label: 'Permit Number', field: 'PermitNo', type: 'text' },
        { label: 'Client ID', field: 'ClientID', type: 'text' }
      ],
      contract: [
        { label: 'Contract Number', field: 'ContractNumber', type: 'text' },
        { label: 'Client ID', field: 'ClientID', type: 'text' }
      ]
    };

    const operators = ['Like', 'Equal', 'Starts With', 'Ends With'];
    const fields = filterConfigs[lookupType] || [];

    let filtersHtml = '';
    fields.forEach(fieldConfig => {
      filtersHtml += `
        <div class="row mb-2">
          <div class="col-md-3">
            <label class="form-label small mb-1">${fieldConfig.label}</label>
          </div>
          <div class="col-md-3">
            <select class="form-select form-select-sm" data-filter-operator="${fieldConfig.field}">
              ${operators.map(op => `<option value="${op}">${op}</option>`).join('')}
            </select>
          </div>
          <div class="col-md-6">
            <input type="${fieldConfig.type}" class="form-control form-control-sm" 
                   data-filter-field="${fieldConfig.field}" 
                   placeholder="Enter ${fieldConfig.label.toLowerCase()}">
          </div>
        </div>
      `;
    });

    container.innerHTML = filtersHtml;
  }

  function performFilteredSearch(modalEl) {
    const allResults = modalEl._allResults;
    const searchFiltersContainer = document.getElementById('searchFiltersContainer');

    if (!allResults || !searchFiltersContainer) return;

    // Collect filter values
    const filters = [];
    const filterInputs = searchFiltersContainer.querySelectorAll('[data-filter-field]');

    filterInputs.forEach(input => {
      const field = input.getAttribute('data-filter-field');
      const value = input.value.trim();
      const operatorSelect = searchFiltersContainer.querySelector(`[data-filter-operator="${field}"]`);
      const operator = operatorSelect ? operatorSelect.value : 'Like';

      if (value) {
        filters.push({ field, value, operator });
      }
    });

    // Apply filters
    let filtered = allResults;

    if (filters.length > 0) {
      filtered = allResults.filter(result => {
        return filters.every(filter => {
          const fieldValue = result[filter.field];
          if (fieldValue === null || fieldValue === undefined) return false;

          const resultStr = String(fieldValue).toLowerCase();
          const filterStr = filter.value.toLowerCase();

          switch (filter.operator) {
            case 'Equal':
              return resultStr === filterStr;
            case 'Like':
              return resultStr.includes(filterStr);
            case 'Starts With':
              return resultStr.startsWith(filterStr);
            case 'Ends With':
              return resultStr.endsWith(filterStr);
            default:
              return resultStr.includes(filterStr);
          }
        });
      });
    }

    renderFilteredResults(filtered, modalEl._lookupType);
  }

  function renderFilteredResults(results, lookupType) {
    const modalEl = document.getElementById('searchResultsModal');
    const headerEl = document.getElementById('searchResultsHeader');
    const bodyEl = document.getElementById('searchResultsBody');
    const emptyEl = document.getElementById('searchResultsEmpty');
    const containerEl = document.getElementById('searchResultsContainer');
    const countLabel = document.getElementById('searchResultsCountLabel');
    const totalResults = modalEl._allResults ? modalEl._allResults.length : results.length;

    // Update results count label
    if (countLabel) {
      if (modalEl._allResults && results.length < totalResults) {
        countLabel.textContent = `Search Results (${results.length} of ${totalResults})`;
      } else {
        countLabel.textContent = `Search Results (${results.length})`;
      }
    }

    if (results.length === 0) {
      if (containerEl) containerEl.style.display = 'none';
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }

    if (containerEl) containerEl.style.display = 'block';
    if (emptyEl) emptyEl.style.display = 'none';

    // Paging logic
    const pageSize = modalEl._pageSize || 10;
    const pageIndex = modalEl._pageIndex || 0;
    const totalPages = Math.ceil(results.length / pageSize);
    const pagedResults = results.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

    // Build table header dynamically from first result
    const firstResult = pagedResults[0];
    const columns = firstResult ? Object.keys(firstResult) : [];

    let headerHtml = '<tr>';
    columns.forEach(col => {
      headerHtml += `<th>${col}</th>`;
    });
    headerHtml += '</tr>';
    if (headerEl) headerEl.innerHTML = headerHtml;

    // Build table body with double-click support
    let bodyHtml = '';
    pagedResults.forEach((result, index) => {
      bodyHtml += `<tr style="cursor: pointer;" data-select-index="${index}">`;
      columns.forEach(col => {
        const value = result[col] !== null && result[col] !== undefined ? result[col] : '';
        bodyHtml += `<td>${value}</td>`;
      });
      bodyHtml += '</tr>';
    });
    if (bodyEl) bodyEl.innerHTML = bodyHtml;

    // Store filtered results for selection (paged)
    modalEl._filteredResults = pagedResults;
    modalEl._filteredResultsAll = results;

    // Update next/prev button state
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    if (prevBtn) prevBtn.disabled = pageIndex <= 0;
    if (nextBtn) nextBtn.disabled = pageIndex >= totalPages - 1;

    // Wire up double-click and single-click row selection
    bodyEl.querySelectorAll('tr[data-select-index]').forEach(row => {
      // Single click for highlighting
      row.addEventListener('click', function () {
        bodyEl.querySelectorAll('tr').forEach(r => r.classList.remove('table-active'));
        this.classList.add('table-active');
      });

      // Double click for selection
      row.addEventListener('dblclick', function () {
        const index = parseInt(this.getAttribute('data-select-index'));
        const selected = (modalEl._filteredResults && modalEl._filteredResults[index]) ? modalEl._filteredResults[index] : (pagedResults[index] || results[index]);
        if (lookupType === 'document') {
          selectDocument(selected);
        } else if (lookupType === 'currency') {
          selectCurrency(selected);
        } else if (lookupType === 'documentCurrency') {
          selectDocumentCurrency(selected);
        } else if (lookupType === 'branch') {
          selectBranch(selected);
        } else if (lookupType === 'client') {
          selectClient(selected);
        } else if (lookupType === 'requestedBy') {
          selectRequestedBy(selected);
        } else if (lookupType === 'fxPermit') {
          selectFXPermit(selected);
        } else if (lookupType === 'contract') {
          selectContract(selected);
        }
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        showToast('Record selected.', 'success');
      });
    });
  }

  function wireSearchModalButtons() {
    const modalEl = document.getElementById('searchResultsModal');
    const okBtn = modalEl?.querySelector('.modal-footer button:nth-child(2)'); // OK button
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');

    // Wire OK button to select currently highlighted row
    if (okBtn) {
      okBtn.addEventListener('click', () => {
        const bodyEl = document.getElementById('searchResultsBody');
        const selectedRow = bodyEl?.querySelector('tr.table-active');

        if (selectedRow) {
          const index = parseInt(selectedRow.getAttribute('data-select-index'));
          const results = modalEl._filteredResults || modalEl._allResults || [];
          const lookupType = modalEl._lookupType;

          if (results[index] && lookupType) {
            if (lookupType === 'document') {
              selectDocument(results[index]);
            } else if (lookupType === 'currency') {
              selectCurrency(results[index]);
            } else if (lookupType === 'branch') {
              selectBranch(results[index]);
            } else if (lookupType === 'client') {
              selectClient(results[index]);
            } else if (lookupType === 'requestedBy') {
              selectRequestedBy(results[index]);
            } else if (lookupType === 'fxPermit') {
              selectFXPermit(results[index]);
            } else if (lookupType === 'contract') {
              selectContract(results[index]);
            }
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
            showToast('Record selected.', 'success');
          }
        } else {
          showToast('Please select a row first.', 'warning');
        }
      });
    }

    // Pagination support
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        const modalEl = document.getElementById('searchResultsModal');
        if (modalEl._pageIndex > 0) {
          modalEl._pageIndex--;
          renderFilteredResults(modalEl._filteredResultsAll || modalEl._allResults, modalEl._lookupType);
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const modalEl = document.getElementById('searchResultsModal');
        const totalPages = Math.ceil((modalEl._filteredResultsAll?.length || modalEl._allResults?.length || 0) / (modalEl._pageSize || 10));
        if (modalEl._pageIndex < totalPages - 1) {
          modalEl._pageIndex++;
          renderFilteredResults(modalEl._filteredResultsAll || modalEl._allResults, modalEl._lookupType);
        }
      });
    }
  }

  function selectDocument(data) {
    const documentIdField = document.getElementById('DocumentID');
    const documentNameField = document.getElementById('DocumentName');

    if (documentIdField && data.DocumentID) {
      documentIdField.value = data.DocumentID;
    }

    if (documentNameField && data.DocumentName) {
      documentNameField.value = data.DocumentName;
    } else if (documentNameField && data.Description) {
      documentNameField.value = data.Description;
    } else if (documentNameField && data.Name) {
      documentNameField.value = data.Name;
    }

    showToast('Document selected.', 'success');
  }

  function selectCurrency(data) {
    const currencyIdField = document.getElementById('CurrencyID');
    const currencyNameField = document.getElementById('CurrencyName');

    if (currencyIdField && data.CurrencyID) {
      currencyIdField.value = data.CurrencyID;
    }

    if (currencyNameField && data.CurrencyName) {
      currencyNameField.value = data.CurrencyName;
      currencyNameField.dataset.forId = (data.CurrencyID || '').toString();
    } else if (currencyNameField && data.Description) {
      currencyNameField.value = data.Description;
      currencyNameField.dataset.forId = (data.CurrencyID || '').toString();
    } else if (currencyNameField && data.Name) {
      currencyNameField.value = data.Name;
      currencyNameField.dataset.forId = (data.CurrencyID || '').toString();
    }

    try {
      const id = (data.CurrencyID || '').toString().trim();
      const name = (data.CurrencyName || data.Description || data.Name || '').toString().trim();
      if (id && name) currencyLookupCache.byId.set(id, name);
    } catch {
      // ignore
    }

    showToast('Currency selected.', 'success');
  }

  function selectBranch(data) {
    const branchIdField = document.getElementById('BranchID');
    const branchNameField = document.getElementById('BranchName');

    if (branchIdField && data.OurBranchID) {
      branchIdField.value = data.OurBranchID;
    }

    if (branchNameField && data.BranchName) {
      branchNameField.value = data.BranchName;
    } else if (branchNameField && data.Description) {
      branchNameField.value = data.Description;
    } else if (branchNameField && data.Name) {
      branchNameField.value = data.Name;
    }

    try {
      const id = (branchIdField?.value || '').trim();
      const name = (branchNameField?.value || '').trim();
      if (id && name) branchLookupCache.byId.set(id, name);
    } catch {
      // ignore
    }

    showToast('Branch selected.', 'success');
  }

  function selectClient(data) {
    const clientIdField = document.getElementById('ClientID');
    const clientNameField = document.getElementById('ClientName');

    if (clientIdField && data.ClientID) {
      clientIdField.value = data.ClientID;
    }

    if (clientNameField && data.Name) {
      clientNameField.value = data.Name;
    } else if (clientNameField && data.ClientName) {
      clientNameField.value = data.ClientName;
    } else if (clientNameField && data.Description) {
      clientNameField.value = data.Description;
    }

    showToast('Client selected.', 'success');
  }

  function selectRequestedBy(data) {
    const requestedByField = document.getElementById('RequestedBy');
    const requestedByNameField = document.getElementById('RequestedByName');

    const pickedId = data?.OperatorID || data?.OperatorId || data?.UserID || data?.UserId || data?.ID || data?.Id || '';
    const pickedName = data?.ClientName || data?.OperatorName || data?.FullName || data?.Name || data?.UserName || data?.Description || '';

    if (requestedByField && pickedId) {
      requestedByField.value = pickedId;
    }

    if (requestedByNameField && pickedName) {
      requestedByNameField.value = pickedName;
      requestedByNameField.dataset.forId = (pickedId || '').toString();
    }

    showToast('Operator selected.', 'success');
  }

  function selectFXPermit(data) {
    const fxPermitField = document.getElementById('FXPermitNumber');

    if (fxPermitField && data.PermitNo) {
      fxPermitField.value = data.PermitNo;
    } else if (fxPermitField && data.PermitNumber) {
      fxPermitField.value = data.PermitNumber;
    }

    showToast('FX Permit selected.', 'success');
  }

  function selectContract(data) {
    const contractNumberField = document.getElementById('ContractNumber');

    const pickedContractNumber =
      data?.ContractNumber ||
      data?.ContractNo ||
      data?.ContractNO ||
      data?.Contract_No ||
      data?.Contract ||
      '';

    // If the search result row carries branch identifiers, set it when empty.
    const branchIdField = document.getElementById('BranchID');
    const pickedBranchId = (data?.OurBranchID || data?.BranchID || data?.BranchId || '').toString().trim();
    if (branchIdField && pickedBranchId && !(branchIdField.value || '').trim()) {
      branchIdField.value = pickedBranchId;
    }

    if (contractNumberField && pickedContractNumber) {
      contractNumberField.value = pickedContractNumber;
    } else if (!pickedContractNumber) {
      showToast('Selected contract row missing Contract Number.', 'warning');
    }

    showToast('Contract selected.', 'success');
    
    // Auto-fetch contract data after selection
    setTimeout(() => {
      const branchIdNow = (document.getElementById('BranchID')?.value || '').trim();
      if (!branchIdNow) {
        showToast('Branch ID is required to load the selected contract.', 'danger');
        document.getElementById('BranchID')?.focus();
        return;
      }
      fetchContractRegistration();
    }, 100);
  }

  // Wire actions
  form.addEventListener('click', (e) => {
    const actionBtn = e.target.closest('[data-scr-action]');
    if (actionBtn) {
      e.preventDefault();
      handleAction(actionBtn.getAttribute('data-scr-action'));
      return;
    }

    const wfBtn = e.target.closest('[data-scr-workflow]');
    if (wfBtn) {
      e.preventDefault();
      showToast('Workflow not wired in prototype.', 'warning');
      return;
    }

    const lookupBtn = e.target.closest('[data-lookup]');
    if (lookupBtn && !lookupBtn.disabled) {
      e.preventDefault();
      handleLookup(lookupBtn.getAttribute('data-lookup'));
      return;
    }

    const browseImageBtn = e.target.closest('[data-scr-browse-image]');
    if (browseImageBtn && !browseImageBtn.disabled) {
      e.preventDefault();
      try {
        const modalEl = document.getElementById('scrBrowseImageModal');
        if (modalEl && window.bootstrap?.Modal) {
          const modal = window.bootstrap.Modal.getOrCreateInstance(modalEl);
          modal.show();
          return;
        }
      } catch {
        // ignore
      }

      // Fallback: open native file picker if modal isn't available.
      const fallbackInput = document.createElement('input');
      fallbackInput.type = 'file';
      fallbackInput.accept = '.pdf,.png,.jpg,.jpeg,.tif,.tiff,.doc,.docx,.xls,.xlsx';
      fallbackInput.addEventListener('change', () => {
        const file = fallbackInput.files && fallbackInput.files[0] ? fallbackInput.files[0] : null;
        state.selectedDocFile = file;
        const docImage = document.getElementById('DocumentImage');
        if (docImage) docImage.value = file ? file.name : '';
        if (file) showToast('Document selected.', 'success');
      });
      fallbackInput.click();
    }
  });

  // Wire the Browse Image modal (legacy-style popup but modernized).
  const wireBrowseImageModal = () => {
    const modalEl = document.getElementById('scrBrowseImageModal');
    if (!modalEl) return;

    const fileInput = document.getElementById('scrDocImageFile');
    const fileNameField = document.getElementById('scrDocImageFileName');
    const okBtn = document.getElementById('scrBrowseImageOk');

    const syncName = () => {
      const file = fileInput?.files && fileInput.files[0] ? fileInput.files[0] : null;
      if (fileNameField) fileNameField.value = file ? file.name : '';
    };

    if (fileInput) {
      fileInput.addEventListener('change', () => {
        syncName();
      });
    }

    if (modalEl) {
      modalEl.addEventListener('shown.bs.modal', () => {
        if (fileInput) {
          fileInput.value = '';
          syncName();
          try {
            fileInput.focus();
          } catch {
            // ignore
          }
        }
      });
    }

    if (okBtn) {
      okBtn.addEventListener('click', () => {
        const file = fileInput?.files && fileInput.files[0] ? fileInput.files[0] : null;
        if (!file) {
          showToast('Please choose a file.', 'warning');
          return;
        }
        state.selectedDocFile = file;
        const docImage = document.getElementById('DocumentImage');
        if (docImage) docImage.value = file.name;

        try {
          const modal = window.bootstrap?.Modal?.getInstance(modalEl) || window.bootstrap?.Modal?.getOrCreateInstance(modalEl);
          modal?.hide();
        } catch {
          // ignore
        }

        showToast('Document selected.', 'success');
      });
    }
  };
  wireBrowseImageModal();

  // Auto-fetch contract when user enters Contract Number and presses Tab or leaves field
  const branchIdInput = document.getElementById('BranchID');
  if (branchIdInput) {
    branchIdInput.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' || e.keyCode === 9) {
        setTimeout(() => {
          try {
            hydrateBranchNameIfMissing();
          } catch (err) {
            console.error('Error hydrating branch name on Tab:', err);
          }
        }, 0);
      }
    });

    branchIdInput.addEventListener('blur', () => {
      try {
        hydrateBranchNameIfMissing();
      } catch (err) {
        console.error('Error hydrating branch name on blur:', err);
      }
    });
  }

  const contractNumberInput = document.getElementById('ContractNumber');
  if (contractNumberInput) {
    contractNumberInput.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' || e.keyCode === 9) {
        const mode = state.mode;
        if (mode === 'add') {
          return; // Don't fetch in add mode
        }
        // Defer so the field value is updated after the key event
        setTimeout(() => {
          const val = (contractNumberInput.value || '').trim();
          const branchId = (document.getElementById('BranchID')?.value || '').trim();
          if (val && branchId) {
            try {
              fetchContractRegistration();
            } catch (err) {
              console.error('Error fetching contract on Tab:', err);
            }
          }
        }, 0);
      }
    });

    contractNumberInput.addEventListener('blur', () => {
      const mode = state.mode;
      if (mode === 'add') {
        return; // Don't fetch in add mode
      }
      const val = (contractNumberInput.value || '').trim();
      const branchId = (document.getElementById('BranchID')?.value || '').trim();
      if (val && branchId) {
        try {
          fetchContractRegistration();
        } catch (err) {
          console.error('Error fetching contract on blur:', err);
        }
      }
    });
  }

  // Hydrate RequestedByName when typing an OperatorID.
  const requestedByInput = document.getElementById('RequestedBy');
  if (requestedByInput) {
    requestedByInput.addEventListener('input', () => {
      const nameField = document.getElementById('RequestedByName');
      if (nameField) {
        nameField.value = '';
        delete nameField.dataset.forId;
      }
    });

    requestedByInput.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' || e.keyCode === 9) {
        setTimeout(() => {
          try {
            hydrateRequestedByNameIfMissing();
          } catch {
            // ignore
          }
        }, 0);
      }
    });

    requestedByInput.addEventListener('blur', () => {
      try {
        hydrateRequestedByNameIfMissing();
      } catch {
        // ignore
      }
    });
  }

  // Hydrate CurrencyName when typing a CurrencyID.
  const currencyIdInput = document.getElementById('CurrencyID');
  if (currencyIdInput) {
    currencyIdInput.addEventListener('input', () => {
      const nameField = document.getElementById('CurrencyName');
      if (nameField) {
        nameField.value = '';
        delete nameField.dataset.forId;
      }
    });

    currencyIdInput.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' || e.keyCode === 9) {
        setTimeout(() => {
          try {
            hydrateCurrencyNameIfMissing();
          } catch {
            // ignore
          }
        }, 0);
      }
    });

    currencyIdInput.addEventListener('blur', () => {
      try {
        hydrateCurrencyNameIfMissing();
      } catch {
        // ignore
      }
    });
  }

  // Hydrate DocumentCurrencyName when typing a DocumentCurrencyID.
  const documentCurrencyIdInput = document.getElementById('DocumentCurrencyID');
  if (documentCurrencyIdInput) {
    documentCurrencyIdInput.addEventListener('input', () => {
      const nameField = document.getElementById('DocumentCurrencyName');
      if (nameField) {
        nameField.value = '';
        delete nameField.dataset.forId;
      }
    });

    documentCurrencyIdInput.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' || e.keyCode === 9) {
        setTimeout(() => {
          try {
            hydrateDocumentCurrencyNameIfMissing();
          } catch {
            // ignore
          }
        }, 0);
      }
    });

    documentCurrencyIdInput.addEventListener('blur', () => {
      try {
        hydrateDocumentCurrencyNameIfMissing();
      } catch {
        // ignore
      }
    });
  }

  // Populate simple dropdowns (kept light and safe)
  const mode = document.getElementById('ModeOfPayment');
  if (mode && mode.options.length <= 1) {
    ['CASH', 'TRANSFER', 'LC', 'DA', 'DP'].forEach((v) => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      mode.appendChild(opt);
    });
  }

  const location = document.getElementById('Location');
  if (location && location.options.length <= 1) {
    ['BRANCH', 'CUSTOMER', 'VAULT', 'ARCHIVE'].forEach((v) => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      location.appendChild(opt);
    });
  }

  // Start in view mode; fields non-editable until Add/Edit
  setMode('view');

  // Wire search modal buttons
  wireSearchModalButtons();

  // Wire document toolbar interactions (LC-Banks style mini-state)
  wireDocToolbar();

  // Ensure bootstrap tabs are initialized for older browsers
  const tabTriggers = [].slice.call(document.querySelectorAll('button[data-bs-toggle="tab"]'));
  tabTriggers.forEach((triggerEl) => {
    try {
      bootstrap.Tab.getOrCreateInstance(triggerEl);
    } catch {
      // ignore
    }
  });
})();
