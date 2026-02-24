let currentAttendance = null, isEditMode = false;

// ───────────────────────────────────────────────────────────────────────────
// Toast Helpers (aligned with Center Maintenance system)
// ───────────────────────────────────────────────────────────────────────────

function caEnsureToastContainer() {
  // Prefer a shared Kairo toast container if it already exists
  let el = document.querySelector('[data-kairo-toast-container]');
  if (!el) {
    el = document.getElementById('toastContainer');
  }
  if (el) return el;

  // Otherwise create one (same pattern as modern-account-maintenance.js)
  el = document.createElement('div');
  el.className = 'kairo-toast-container';
  el.setAttribute('data-kairo-toast-container', '');
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-relevant', 'additions');
  document.body.appendChild(el);
  return el;
}

function caShowToast(message, { title = 'Validation', variant = 'danger', timeoutMs = 9000 } = {}) {
  const container = caEnsureToastContainer();

  const toast = document.createElement('div');
  toast.className = `kairo-toast kairo-toast--${variant}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-atomic', 'true');

  const body = document.createElement('div');
  body.className = 'kairo-toast__body';
  body.textContent = String(message || '');

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

  setTimeout(() => toast.classList.add('is-show'), 0);
  if (timeoutMs && timeoutMs > 0) setTimeout(remove, timeoutMs);
}

function caShowSystemToast(message, { title = 'Notice', variant = 'info', timeoutMs = 5000 } = {}) {
  // Limit to one toast at a time for system-level messages
  const container = caEnsureToastContainer();
  const existingToasts = container.querySelectorAll('.kairo-toast');
  existingToasts.forEach(t => t.remove());

  caShowToast(message, { title, variant, timeoutMs });
}

// Backwards-compatible helper used throughout this module
function caShowSnackbar(message, type = 'info') {

  let variant = 'info';
  if (type === 'success') variant = 'success';
  else if (type === 'error') variant = 'danger';
  else if (type === 'warning') variant = 'warning';

  caShowSystemToast(message, { title: 'Notice', variant });
}

// ───────────────────────────────────────────────────────────────────────────
// State Variables
// ───────────────────────────────────────────────────────────────────────────

let caPaymentTypeOptions = null;
let caPaymentTypeOptionsHtml = '';
let caPaymentTypeValueByLabel = null;
let caPaymentTypeOptionsPromise = null;

let caCurrentAttendanceRows = [];

let caCurrentUpdateCount = 0;

let caHasLoadedAttendance = false;
let caIsGridEditable = false;

// Service loading state flags
let caSearchServicesReady = false;
let caSearchServicesPromise = null;
let caLookupServicesReady = false;
let caLookupServicesPromise = null;
let caOfficerServicesReady = false;
let caOfficerServicesPromise = null;

// Modal instance references (for legacy inline modals)
let caMeetingDateLookupModalInstance = null;
let caOfficerLookupModalInstance = null;

// Modal element IDs (for legacy inline modals)
const CA_MEETINGDATE_LOOKUP_MODAL_ID = 'ca-meetingdate-lookup-modal';
const CA_MEETINGDATE_LOOKUP_MODAL_LABEL_ID = 'ca-meetingdate-lookup-modal-label';
const CA_MEETINGDATE_LOOKUP_FORM_ID = 'ca-meetingdate-lookup-form';
const CA_MEETINGDATE_LOOKUP_RESULTS_HEADER_ID = 'ca-meetingdate-lookup-results-header';
const CA_MEETINGDATE_LOOKUP_RESULTS_BODY_ID = 'ca-meetingdate-lookup-results-body';
const CA_MEETINGDATE_LOOKUP_RESULTS_META_ID = 'ca-meetingdate-lookup-results-meta';

const CA_OFFICER_LOOKUP_MODAL_ID = 'ca-officer-lookup-modal';
const CA_OFFICER_LOOKUP_MODAL_LABEL_ID = 'ca-officer-lookup-modal-label';
const CA_OFFICER_LOOKUP_FORM_ID = 'ca-officer-lookup-form';
const CA_OFFICER_LOOKUP_RESULTS_HEADER_ID = 'ca-officer-lookup-results-header';
const CA_OFFICER_LOOKUP_RESULTS_BODY_ID = 'ca-officer-lookup-results-body';
const CA_OFFICER_LOOKUP_RESULTS_META_ID = 'ca-officer-lookup-results-meta';

function caGetActionButton(action) {
  return document.querySelector(`[data-ca-action="${action}"]`);
}

function caSetActionButtonsState(state) {
  const map = {
    view: caGetActionButton('view'),
    edit: caGetActionButton('edit'),
    delete: caGetActionButton('delete'),
    save: caGetActionButton('save'),
    cancel: caGetActionButton('cancel')
  };

  for (const [key, btn] of Object.entries(map)) {
    if (!btn) continue;
    if (state?.[key] === undefined) continue;
    btn.disabled = !state[key];
  }
}

function caDisableAllControlsExceptCancel() {
  // Disable all form fields
  const formEl = document.getElementById('center-attendance-form');
  const scope = formEl || document;

  scope.querySelectorAll('input, textarea, select').forEach((el) => {
    try {
      el.disabled = true;
    } catch {
      // ignore
    }
  });

  // Disable lookup/search buttons
  scope.querySelectorAll('[data-ca-lookup]').forEach((btn) => {
    try {
      btn.disabled = true;
    } catch {
      // ignore
    }
  });

  // Disable action buttons except Cancel
  caSetActionButtonsState({ view: false,  edit: false, delete: false, save: false, cancel: true });

  // Keep internal state consistent
  caSetMeetingFieldsEditable(false);
  caSetGridEditable(false);
  caSetHeaderFieldsForEditMode(false);
}

function caSetMeetingFieldsEditable(editable) {
  const meetingPlaceEl = document.getElementById('MeetingPlace');
  const remarksEl = document.getElementById('Remarks');
  if (meetingPlaceEl) meetingPlaceEl.disabled = !editable;
  if (remarksEl) remarksEl.disabled = !editable;
}

function caSetHeaderFieldsForEditMode(isEditing) {
  const centerIdEl = document.getElementById('CenterId');
  const centerNameEl = document.getElementById('CenterName');
  const meetingDateEl = document.getElementById('MeetingDate');
  const officerIdEl = document.getElementById('OfficerId');
  const officerNameEl = document.getElementById('OfficerName');

  const centerLookupBtn = document.querySelector('[data-ca-lookup="center"]');
  const meetingDateLookupBtn = document.querySelector('[data-ca-lookup="meeting-date"]');
  const officerLookupBtn = document.querySelector('[data-ca-lookup="officer"]');

  // Requirement: on Edit click
  // Enable OfficerID + Officer search; enable MeetingPlace + Remarks
  // Disable Meeting Date + search; disable CenterID + search
  caSetDisabled(centerIdEl, !!isEditing);
  caLockInput(centerIdEl, !!isEditing);
  caSetDisabled(centerNameEl, true); // Always disabled
  caLockInput(centerNameEl, true); // Always disabled
  caSetDisabled(centerLookupBtn, !!isEditing);

  caSetDisabled(meetingDateEl, !!isEditing);
  caLockInput(meetingDateEl, !!isEditing);
  caSetDisabled(meetingDateLookupBtn, !!isEditing);

  caSetDisabled(officerIdEl, !isEditing);
  caLockInput(officerIdEl, !isEditing);
  caSetDisabled(officerNameEl, true); // Always disabled
  caLockInput(officerNameEl, true); // Always disabled
  caSetDisabled(officerLookupBtn, !isEditing);
}

function caSetCenterFieldsLocked(locked) {
  const centerIdEl = document.getElementById('CenterId');
  const centerNameEl = document.getElementById('CenterName');
  const centerLookupBtn = document.querySelector('[data-ca-lookup="center"]');

  caSetDisabled(centerIdEl, !!locked);
  caLockInput(centerIdEl, !!locked);
  caSetDisabled(centerNameEl, true); // Always disabled
  caLockInput(centerNameEl, true); // Always disabled
  caSetDisabled(centerLookupBtn, !!locked);
}

function caSetGridEditable(editable) {
  caIsGridEditable = !!editable;
  const selects = document.querySelectorAll('select[data-attendance-status], select[data-payment-type]');
  selects.forEach((sel) => {
    try {
      sel.disabled = !caIsGridEditable;
    } catch {
      // ignore
    }
  });
}

async function caEnsureSearchServicesLoaded() {
  if (caSearchServicesReady) return;
  if (caSearchServicesPromise) return caSearchServicesPromise;

  caSearchServicesPromise = (async () => {
    if (!window.CoreApi) {
      throw new Error('CoreApi not available (services/shared/coreApi.js not loaded)');
    }

    if (!window.SearchService) {
      const loader = window.ServiceLoader;
      if (loader?.loadCore && loader?.loadScript) {
        await loader.loadCore();
        await loader.loadScript('/assets/js/services/shared/searchService.js');
      } else {
        await caLoadScriptOnce('/assets/js/services/shared/searchService.js');
      }
    }

    caSearchServicesReady = true;
  })();

  return caSearchServicesPromise;
}

async function caEnsureLookupServicesLoaded() {
  if (caLookupServicesReady) return;
  if (caLookupServicesPromise) return caLookupServicesPromise;

  caLookupServicesPromise = (async () => {
    if (!window.CoreApi) {
      throw new Error('CoreApi not available (services/shared/coreApi.js not loaded)');
    }

    if (!window.LookupService) {
      const loader = window.ServiceLoader;
      if (loader?.loadCore && loader?.loadLookupService) {
        await loader.loadCore();
        await loader.loadLookupService();
      } else {
        await caLoadScriptOnce('/assets/js/services/shared/lookupService.js');
      }
    }

    caLookupServicesReady = true;
  })();

  return caLookupServicesPromise;
}

function caBuildOptionsHtml(options, includeBlank = true, blankLabel = 'Select...') {
  const opts = Array.isArray(options) ? options : [];
  const parts = [];
  if (includeBlank) parts.push(`<option value="">${blankLabel}</option>`);
  for (const opt of opts) {
    const value = opt?.value == null ? '' : String(opt.value);
    const label = opt?.label == null ? '' : String(opt.label);
    parts.push(`<option value="${value.replace(/"/g, '&quot;')}">${label}</option>`);
  }
  return parts.join('');
}

async function caEnsurePaymentTypeOptionsLoaded() {
  if (Array.isArray(caPaymentTypeOptions)) return caPaymentTypeOptions;
  if (caPaymentTypeOptionsPromise) return caPaymentTypeOptionsPromise;

  caPaymentTypeOptionsPromise = (async () => {
    await caEnsureLookupServicesLoaded();
    const options = await window.LookupService.getSystemCodeOptions('PaymentTypeID');
    caPaymentTypeOptions = Array.isArray(options) ? options : [];
    caPaymentTypeOptionsHtml = caBuildOptionsHtml(caPaymentTypeOptions, true, 'Select...');

    caPaymentTypeValueByLabel = new Map();
    for (const opt of caPaymentTypeOptions) {
      const label = String(opt?.label || '').trim().toLowerCase();
      const value = String(opt?.value || '').trim();
      if (label && value && !caPaymentTypeValueByLabel.has(label)) {
        caPaymentTypeValueByLabel.set(label, value);
      }
    }

    return caPaymentTypeOptions;
  })();

  return caPaymentTypeOptionsPromise;
}

function caGetPaymentTypeValueFromRecord(record) {
  const direct =
    record?.PaymentTypeID ??
    record?.PaymentTypeId ??
    record?.PaymentType ??
    record?.PaymentTypeCode ??
    '';

  const directValue = String(direct || '').trim();
  if (directValue) {
    // If backend returns the label in the ID field (e.g., "Paid"), try mapping it.
    const mappedFromDirectLabel = caPaymentTypeValueByLabel?.get?.(directValue.toLowerCase());
    if (mappedFromDirectLabel) return String(mappedFromDirectLabel).trim();
    return directValue;
  }

  const label = String(record?.PaymentTypeDesc || record?.PaymentTypeDescription || record?.PaymentTypeName || record?.PaymentTypeLabel || '').trim();
  if (!label) return '';
  const mapped = caPaymentTypeValueByLabel?.get?.(label.toLowerCase());
  return String(mapped || '').trim();
}

function caNormalizeAttendanceStatusId(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const upper = raw.toUpperCase();
  if (upper === 'P' || upper === 'A' || upper === 'L') return upper;
  const lower = raw.toLowerCase();
  if (lower === 'present' || lower === 'presents') return 'P';
  if (lower === 'absent' || lower === 'absence') return 'A';
  if (lower === 'late' || lower === 'lates') return 'L';
  // Common numeric encodings (best-effort)
  if (raw === '1') return 'P';
  if (raw === '0') return 'A';
  return '';
}

function caNormalizeAttendanceRow(row) {
  if (!row || typeof row !== 'object') return row;

  const statusCandidate =
    row.AttendanceStatusID ??
    row.AttendanceStatusId ??
    row.AttendanceStatus ??
    row.StatusID ??
    row.Status ??
    row.AttendanceStatusDesc ??
    row.AttendanceStatusDescription ??
    row.AttendanceStatusName ??
    '';

  const normalized = caNormalizeAttendanceStatusId(statusCandidate);
  if (normalized) row.AttendanceStatusID = normalized;

  // Normalize payment type hints into expected fields (do not overwrite explicit IDs)
  if (row.PaymentTypeID == null || String(row.PaymentTypeID).trim() === '') {
    const desc =
      row.PaymentTypeDesc ??
      row.PaymentTypeDescription ??
      row.PaymentTypeName ??
      row.PaymentTypeLabel ??
      '';
    if (desc) {
      row.PaymentTypeDesc = desc;
      row.PaymentTypeDescription = desc;
    }
  }

  return row;
}

function caPickAttendanceListFromResponse(data) {
  if (!data || typeof data !== 'object') return [];

  const detailsKeys = Object.keys(data).filter((k) => /^Details(\d+)?$/i.test(k));
  const readArr = (k) => (Array.isArray(data[k]) ? data[k] : null);

  const scored = [];
  for (const key of detailsKeys) {
    const arr = readArr(key);
    if (!arr || !arr.length) continue;

    let hasClientId = 0;
    let hasStatusOrPayment = 0;
    for (const r of arr) {
      const clientId = String(r?.ClientID ?? r?.ClientId ?? '').trim();
      if (clientId) hasClientId++;
      const status = String(r?.AttendanceStatusID ?? r?.AttendanceStatus ?? r?.Status ?? '').trim();
      const payment = String(r?.PaymentTypeID ?? r?.PaymentTypeDesc ?? r?.PaymentTypeDescription ?? '').trim();
      if (status || payment) hasStatusOrPayment++;
    }

    // Prefer datasets that look like detail rows (ClientID + status/payment fields)
    const score = hasClientId * 10 + hasStatusOrPayment * 5;
    scored.push({ key, arr, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.arr || [];
}

function caEscapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function caExtractDetailsArray(resp) {
  if (!resp) return [];
  if (Array.isArray(resp.Details)) return resp.Details;
  if (Array.isArray(resp.data?.Details)) return resp.data.Details;
  if (Array.isArray(resp.data)) return resp.data;
  return [];
}

function caPickUpdateCount(headerRecord, rows) {
  const candidates = [
    headerRecord?.UpdateCount,
    headerRecord?.Updatecount,
    headerRecord?.UpdateCOUNT,
    rows?.[0]?.UpdateCount,
    rows?.[0]?.Updatecount,
    rows?.[0]?.UpdateCOUNT
  ];
  for (const c of candidates) {
    if (c === null || c === undefined) continue;
    const s = String(c).trim();
    if (!s) continue;
    const n = Number(s);
    if (!Number.isNaN(n)) return n;
  }
  return 0;
}

function caBuildAttendanceDetailsXml(rows) {
  const safeRows = Array.isArray(rows) ? rows : [];
  return safeRows
    .map((r) => {
      const clientId = String(r?.ClientID ?? r?.ClientId ?? r?.clientId ?? '').trim();
      const attendanceStatusId = String(r?.AttendanceStatusID ?? r?.AttendanceStatusId ?? r?.AttendanceStatus ?? '').trim();
      const paymentTypeId = String(r?.PaymentTypeID ?? r?.PaymentTypeId ?? r?.PaymentType ?? '').trim();

      return (
        '<dt_GroupAttendance>' +
        `<ClientID>${caEscapeXml(clientId)}</ClientID>` +
        `<AttendanceStatusID>${caEscapeXml(attendanceStatusId)}</AttendanceStatusID>` +
        `<PaymentTypeID>${caEscapeXml(paymentTypeId)}</PaymentTypeID>` +
        '</dt_GroupAttendance>'
      );
    })
    .join('');
}

function caApplyPaymentTypeDropdownsToGrid() {
  const selects = Array.from(document.querySelectorAll('select[data-payment-type]'));
  if (!selects.length) return;
  if (!caPaymentTypeOptionsHtml) return;

  // Map current record values by client id to set the correct selected option.
  const recordByClientId = new Map();
  for (const row of caCurrentAttendanceRows || []) {
    const key = String(row?.ClientID ?? row?.ClientId ?? row?.clientId ?? '').trim();
    if (key) recordByClientId.set(key, row);
  }

  for (const sel of selects) {
    if (!sel) continue;

    // Only populate once per select to avoid wiping user's selection mid-edit.
    if (sel.dataset.caOptionsPopulated === 'true') continue;
    sel.innerHTML = caPaymentTypeOptionsHtml;
    sel.dataset.caOptionsPopulated = 'true';

    const clientId = String(sel.getAttribute('data-client-id') || '').trim();
    const row = recordByClientId.get(clientId);
    const desiredValue = caGetPaymentTypeValueFromRecord(row);
    if (desiredValue) {
      sel.value = desiredValue;
      if (row) {
        row.PaymentTypeID = String(desiredValue).trim();
        const selectedLabel = sel.selectedOptions?.[0]?.textContent || '';
        row.PaymentTypeDesc = selectedLabel;
        row.PaymentTypeDescription = selectedLabel;
      }
    }

    // Enforce current grid editability state
    try {
      sel.disabled = !caIsGridEditable;
    } catch {
      // ignore
    }
  }
}

function caGetEnv() {
  return window.Environment || {};
}

function caGetSession() {
  return window.getAuthSession?.() || {};
}

function caGetOperatorId() {
  const env = caGetEnv();
  const session = caGetSession();
  return String(env.operatorId || session.operatorId || session.name || 'CSADM').trim();
}

function caGetBranchId() {
  const env = caGetEnv();
  const session = caGetSession();
  return String(env.OurBranchID || session.branchId || '0603').trim();
}

function caGetWorkingDate() {
  const env = caGetEnv();
  const workingDateStr = env.workingDate || env.WorkingDate || env.systemDate || env.SystemDate;
  if (workingDateStr) {
    const d = new Date(workingDateStr);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

function caSetDisabled(el, disabled = true) {
  if (!el) return;
  try {
    el.disabled = !!disabled;
    if (disabled) {
      try { el.setAttribute('disabled', ''); } catch { /* ignore */ }
      el.setAttribute('aria-disabled', 'true');
    } else {
      try { el.removeAttribute('disabled'); } catch { /* ignore */ }
      el.removeAttribute('aria-disabled');
    }
  } catch {
    // ignore
  }
}

function caLockInput(el, locked) {
  if (!el) return;
  try {
    // For some UI/css setups, readOnly is more reliable than disabled.
    if (typeof el.readOnly === 'boolean') el.readOnly = !!locked;
    if (locked) {
      el.setAttribute('aria-readonly', 'true');
      el.tabIndex = -1;
    } else {
      el.removeAttribute('aria-readonly');
      el.removeAttribute('tabindex');
    }
  } catch {
    // ignore
  }
}

function caEscapeSqlLikeTerm(term) {
  return String(term || '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "''")
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}

function caExtractSearchRows(searchResult) {
  const candidates = [searchResult?.data, searchResult?.Details, searchResult].filter(Boolean);
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;

    const nested =
      candidate?.Details?.SearchResults ||
      candidate?.Details ||
      candidate?.SearchResults ||
      candidate?.Details?.Details ||
      candidate;

    if (Array.isArray(nested)) return nested;
    if (Array.isArray(nested?.SearchResults)) return nested.SearchResults;
    if (Array.isArray(nested?.Details)) return nested.Details;
  }
  return [];
}

async function caLoadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    const existing = Array.from(document.scripts || []).find((s) => s?.src && s.src.includes(src));
    if (existing) return resolve();

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

async function caEnsureGroupServiceLoaded() {
  if (window.GroupService) return;

  // Prefer ServiceLoader when present, otherwise load directly.
  const loader = window.ServiceLoader;
  if (loader?.loadCore && loader?.loadScript) {
    await loader.loadCore();
    await loader.loadScript('/assets/js/services/microfinance/groupService.js');
    return;
  }

  await caLoadScriptOnce('/assets/js/services/microfinance/groupService.js');
}

function caExtractFirstRowFromDetails(result, key = 'Details02') {
  const data = result?.data || result;
  const arr = data?.[key];
  if (Array.isArray(arr) && arr.length) return arr[0];
  return null;
}

async function caLoadOfficerFromCenterDetails({ branchId, groupId, operatorId }) {
  if (!groupId) return null;

  try {
    await caEnsureGroupServiceLoaded();
    if (!window.GroupService?.getGroupDetails) return null;

    const res = await window.GroupService.getGroupDetails({
      OurBranchID: branchId,
      GroupID: groupId,
      OperatorID: operatorId,
      Direction: 0
    });

    // Center maintenance uses Details02[0] as the main center/group row.
    const centerRow = caExtractFirstRowFromDetails(res, 'Details02') || caExtractFirstRowFromDetails(res, 'Details') || null;
    if (!centerRow) return null;

    const officerId =
      centerRow.CreditOfficerID ||
      centerRow.OfficerID ||
      centerRow.OfficerId ||
      centerRow.LoanOfficerID ||
      '';

    const officerName =
      centerRow.CreditOfficerName ||
      centerRow.OfficerName ||
      centerRow.Name ||
      '';

    if (!officerId && !officerName) return null;
    return { officerId: String(officerId || '').trim(), officerName: String(officerName || '').trim() };
  } catch (e) {
    return null;
  }
}

async function caEnsureOfficerServicesLoaded() {
  if (caOfficerServicesReady) return;
  if (caOfficerServicesPromise) return caOfficerServicesPromise;

  caOfficerServicesPromise = (async () => {
    await caEnsureSearchServicesLoaded();
    caOfficerServicesReady = true;
  })();

  return caOfficerServicesPromise;
}

// ───────────────────────────────────────────────────────────────────────────
// Date Utility Functions
// ───────────────────────────────────────────────────────────────────────────

function caNormalizeToYyyyMmDd(value) {
  const s = String(value || '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  // OldAPI/UIs commonly return: DD-MMM-YYYY (e.g. 12-Jan-2026)
  const dmyTextMatch = s.match(/^(\d{1,2})\s*[-/]\s*([A-Za-z]{3,})\s*[-/]\s*(\d{4})/);
  if (dmyTextMatch) {
    const day = Number(dmyTextMatch[1]);
    const monText = String(dmyTextMatch[2]).slice(0, 3).toLowerCase();
    const year = Number(dmyTextMatch[3]);
    const monthMap = {
      jan: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      aug: 7,
      sep: 8,
      oct: 9,
      nov: 10,
      dec: 11
    };
    const monthIndex = monthMap[monText];
    if (Number.isInteger(day) && Number.isInteger(year) && Number.isInteger(monthIndex)) {
      const d = new Date(Date.UTC(year, monthIndex, day));
      if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
  }

  // Numeric formats: MM/DD/YYYY or DD/MM/YYYY or DD-MM-YYYY
  const dmyNumericMatch = s.match(/^(\d{1,2})\s*[-/]\s*(\d{1,2})\s*[-/]\s*(\d{4})/);
  if (dmyNumericMatch) {
    const a = Number(dmyNumericMatch[1]);
    const b = Number(dmyNumericMatch[2]);
    const year = Number(dmyNumericMatch[3]);

    let month = a;
    let day = b;
    if (a > 12 && b <= 12) {
      day = a;
      month = b;
    } else if (b > 12 && a <= 12) {
      day = b;
      month = a;
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const d = new Date(Date.UTC(year, month - 1, day));
      if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
  }

  // Last resort: let the browser parse it (handles many ISO variants)
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return '';
}

function caFormatToDdMmmYyyy(value) {
  const iso = caNormalizeToYyyyMmDd(value);
  if (!iso) return '';
  const [yyyy, mm, dd] = iso.split('-');
  const monthIndex = Number(mm) - 1;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mon = monthNames[monthIndex] || '';
  if (!yyyy || !dd || !mon) return '';
  return `${dd}-${mon}-${yyyy}`;
}

function caParseDdMmmYyyyToDate(dateStr) {
  if (!dateStr) return null;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Match dd-Mmm-yyyy format (e.g., "15-Jan-2026")
  const match = String(dateStr).match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (!match) return null;
  
  const day = parseInt(match[1], 10);
  const monthStr = match[2];
  const year = parseInt(match[3], 10);
  
  const monthIndex = monthNames.findIndex(m => m.toLowerCase() === monthStr.toLowerCase());
  if (monthIndex === -1) return null;
  
  const date = new Date(year, monthIndex, day);
  if (isNaN(date.getTime())) return null;
  
  return date;
}

function caEnsureMeetingDateLookupModal() {
  let modalEl = document.getElementById(CA_MEETINGDATE_LOOKUP_MODAL_ID);
  if (!modalEl) {
    modalEl = document.createElement('div');
    modalEl.className = 'modal fade';
    modalEl.id = CA_MEETINGDATE_LOOKUP_MODAL_ID;
    modalEl.tabIndex = -1;
    modalEl.setAttribute('aria-labelledby', CA_MEETINGDATE_LOOKUP_MODAL_LABEL_ID);
    modalEl.setAttribute('aria-hidden', 'true');

    modalEl.innerHTML = `
      <div class="modal-dialog modal-dialog-centered modal-xl">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="${CA_MEETINGDATE_LOOKUP_MODAL_LABEL_ID}">Meeting Date Lookup</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form id="${CA_MEETINGDATE_LOOKUP_FORM_ID}" class="row g-2 align-items-end">
              <div class="col-12 col-lg-6">
                <label class="form-label mb-1">Next Meeting Date</label>
                <input type="date" class="form-control" data-ca-meetingdate-field="NextMeetingDate" />
              </div>
              <div class="col-12 col-lg-6 d-flex gap-2">
                <button type="submit" class="btn btn-primary flex-fill" data-ca-meetingdate-action="search">Search</button>
                <button type="button" class="btn btn-outline-secondary" data-ca-meetingdate-action="clear">Clear</button>
              </div>
            </form>

            <hr class="my-3" />

            <div class="table-responsive">
              <table class="table table-sm table-hover align-middle">
                <thead><tr id="${CA_MEETINGDATE_LOOKUP_RESULTS_HEADER_ID}"></tr></thead>
                <tbody id="${CA_MEETINGDATE_LOOKUP_RESULTS_BODY_ID}"></tbody>
              </table>
            </div>
            <div class="text-muted small" id="${CA_MEETINGDATE_LOOKUP_RESULTS_META_ID}"></div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modalEl);
  }

  if (!caMeetingDateLookupModalInstance && window.bootstrap?.Modal) {
    caMeetingDateLookupModalInstance = window.bootstrap.Modal.getOrCreateInstance(modalEl, { backdrop: 'static' });
  }

  return modalEl;
}

function caMeetingDateSetMeta(text) {
  const metaEl = document.getElementById(CA_MEETINGDATE_LOOKUP_RESULTS_META_ID);
  if (metaEl) metaEl.textContent = text || '';
}

function caMeetingDateClearResults() {
  const headerEl = document.getElementById(CA_MEETINGDATE_LOOKUP_RESULTS_HEADER_ID);
  const bodyEl = document.getElementById(CA_MEETINGDATE_LOOKUP_RESULTS_BODY_ID);
  if (headerEl) headerEl.innerHTML = '';
  if (bodyEl) bodyEl.innerHTML = '';
  caMeetingDateSetMeta('');
}

function caMeetingDateRenderResults(rows, columns, onSelectRow) {
  const headerEl = document.getElementById(CA_MEETINGDATE_LOOKUP_RESULTS_HEADER_ID);
  const bodyEl = document.getElementById(CA_MEETINGDATE_LOOKUP_RESULTS_BODY_ID);
  if (!headerEl || !bodyEl) return;

  headerEl.innerHTML = '';
  bodyEl.innerHTML = '';

  const headerCells = ['Select', ...columns];
  headerCells.forEach((col) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = col;
    headerEl.appendChild(th);
  });

  rows.forEach((row) => {
    const tr = document.createElement('tr');

    const selectTd = document.createElement('td');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-sm btn-success';
    btn.textContent = 'Select';
    btn.addEventListener('click', () => {
      try {
        onSelectRow?.(row);
      } finally {
        caMeetingDateLookupModalInstance?.hide?.();
      }
    });
    selectTd.appendChild(btn);
    tr.appendChild(selectTd);

    columns.forEach((col) => {
      const td = document.createElement('td');
      const val = row?.[col];
      td.textContent = val === null || val === undefined ? '' : String(val);
      tr.appendChild(td);
    });

    bodyEl.appendChild(tr);
  });
}

async function caMeetingDateDoSearch() {
  caEnsureMeetingDateLookupModal();
  await caEnsureSearchServicesLoaded();

  const form = document.getElementById(CA_MEETINGDATE_LOOKUP_FORM_ID);
  const dateRaw = String(form?.querySelector?.('[data-ca-meetingdate-field="NextMeetingDate"]')?.value || '').trim();
  const normalized = caNormalizeToYyyyMmDd(dateRaw);

  const whereStmt = normalized ? `NextMeetingDate='${caEscapeSqlLikeTerm(normalized)}'` : '';
  const branchId = caGetBranchId();
  const operatorId = caGetOperatorId();

  const payload = {
    TableID: 'GroupNextMeeting',
    AdvFilterString: `OurBranchID='${branchId}' AND GroupStatusID= 'A'`,
    WhereStmt: whereStmt,
    PrevOrNext: '0',
    RefID: '',
    OperatorID: operatorId,
    ModuleID: '5080',
    OurBranchID: branchId,
    SearchKey: '',
    LanguageID: 'en'
  };

  caMeetingDateClearResults();
  caMeetingDateSetMeta('Searching...');

  try {
    const result = await window.SearchService.search(payload);
    const rows = caExtractSearchRows(result);

    if (!rows.length) {
      caMeetingDateSetMeta('No results');
      return;
    }

    const limited = rows.slice(0, 500);
    const columns = ['NextMeetingDate'];

    caMeetingDateRenderResults(limited, columns, (selected) => {
      const meetingDateEl = document.getElementById('MeetingDate');
      const selectedValue =
        selected?.NextMeetingDate ||
        selected?.MeetingDate ||
        selected?.NextMeeting ||
        selected?.Date ||
        '';
      const ddMmmYyyy = caFormatToDdMmmYyyy(selectedValue);
      if (meetingDateEl) {
        meetingDateEl.value = ddMmmYyyy;
      }
      meetingDateEl?.dispatchEvent?.(new Event('change', { bubbles: true }));
    });

    caMeetingDateSetMeta(`${limited.length} result(s)`);
  } catch (err) {
    caMeetingDateSetMeta('Search failed');
    showStatus('Meeting date search failed: ' + (err?.message || 'Unknown error'), 'error');
  }
}

function caOpenMeetingDateLookup() {
  const modalEl = caEnsureMeetingDateLookupModal();
  caMeetingDateClearResults();
  caMeetingDateSetMeta('');

  // Prefill from current MeetingDate
  const form = document.getElementById(CA_MEETINGDATE_LOOKUP_FORM_ID);
  const dateField = form?.querySelector?.('[data-ca-meetingdate-field="NextMeetingDate"]');
  if (dateField) {
    const currentText = String(document.getElementById('MeetingDate')?.value || '').trim();
    dateField.value = caNormalizeToYyyyMmDd(currentText);
  }

  caMeetingDateLookupModalInstance = window.bootstrap?.Modal?.getOrCreateInstance?.(modalEl, { backdrop: 'static' }) || caMeetingDateLookupModalInstance;
  caMeetingDateLookupModalInstance?.show?.();

  caMeetingDateDoSearch();
}

function caWireMeetingDateLookupModalEventsOnce() {
  const modalEl = caEnsureMeetingDateLookupModal();
  if (modalEl.dataset.caMeetingDateLookupWired === 'true') return;
  modalEl.dataset.caMeetingDateLookupWired = 'true';

  const form = document.getElementById(CA_MEETINGDATE_LOOKUP_FORM_ID);
  const clearBtn = form?.querySelector?.('[data-ca-meetingdate-action="clear"]');

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    e.stopPropagation();
    caMeetingDateDoSearch();
  });

  form?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      caMeetingDateDoSearch();
    }
  });

  clearBtn?.addEventListener('click', () => {
    form?.querySelectorAll?.('[data-ca-meetingdate-field]')?.forEach?.((field) => {
      field.value = '';
    });
    caMeetingDateClearResults();
    caMeetingDateSetMeta('');
  });

  modalEl.addEventListener('shown.bs.modal', () => {
    setTimeout(() => {
      form?.querySelector?.('[data-ca-meetingdate-field="NextMeetingDate"]')?.focus?.();
    }, 0);
  });
}

function caEnsureOfficerLookupModal() {
  let modalEl = document.getElementById(CA_OFFICER_LOOKUP_MODAL_ID);
  if (!modalEl) {
    modalEl = document.createElement('div');
    modalEl.className = 'modal fade';
    modalEl.id = CA_OFFICER_LOOKUP_MODAL_ID;
    modalEl.tabIndex = -1;
    modalEl.setAttribute('aria-labelledby', CA_OFFICER_LOOKUP_MODAL_LABEL_ID);
    modalEl.setAttribute('aria-hidden', 'true');

    modalEl.innerHTML = `
      <div class="modal-dialog modal-dialog-centered modal-xl">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="${CA_OFFICER_LOOKUP_MODAL_LABEL_ID}">Officer Lookup</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form id="${CA_OFFICER_LOOKUP_FORM_ID}" class="row g-2 align-items-end">
              <div class="col-12 col-lg-4">
                <label class="form-label mb-1">Officer ID</label>
                <input class="form-control" data-ca-officer-field="OfficerID" placeholder="Officer ID" />
                <select class="form-select form-select-sm mt-1" data-ca-officer-mode="OfficerID">
                  <option value="Like" selected>Like</option>
                  <option value="Exact">Exact</option>
                </select>
              </div>
              <div class="col-12 col-lg-5">
                <label class="form-label mb-1">Officer Name</label>
                <input class="form-control" data-ca-officer-field="OfficerName" placeholder="Officer Name" />
                <select class="form-select form-select-sm mt-1" data-ca-officer-mode="OfficerName">
                  <option value="Like" selected>Like</option>
                  <option value="Exact">Exact</option>
                </select>
              </div>
              <div class="col-12 col-lg-3 d-flex gap-2">
                <button type="submit" class="btn btn-primary flex-fill" data-ca-officer-action="search">Search</button>
                <button type="button" class="btn btn-outline-secondary" data-ca-officer-action="clear">Clear</button>
              </div>
            </form>

            <hr class="my-3" />

            <div class="table-responsive">
              <table class="table table-sm table-hover align-middle">
                <thead><tr id="${CA_OFFICER_LOOKUP_RESULTS_HEADER_ID}"></tr></thead>
                <tbody id="${CA_OFFICER_LOOKUP_RESULTS_BODY_ID}"></tbody>
              </table>
            </div>
            <div class="text-muted small" id="${CA_OFFICER_LOOKUP_RESULTS_META_ID}"></div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modalEl);
  }

  if (!caOfficerLookupModalInstance && window.bootstrap?.Modal) {
    caOfficerLookupModalInstance = window.bootstrap.Modal.getOrCreateInstance(modalEl, { backdrop: 'static' });
  }

  return modalEl;
}

function caOfficerSetMeta(text) {
  const metaEl = document.getElementById(CA_OFFICER_LOOKUP_RESULTS_META_ID);
  if (metaEl) metaEl.textContent = text || '';
}

function caOfficerClearResults() {
  const headerEl = document.getElementById(CA_OFFICER_LOOKUP_RESULTS_HEADER_ID);
  const bodyEl = document.getElementById(CA_OFFICER_LOOKUP_RESULTS_BODY_ID);
  if (headerEl) headerEl.innerHTML = '';
  if (bodyEl) bodyEl.innerHTML = '';
  caOfficerSetMeta('');
}

function caOfficerRenderResults(rows, columns, onSelectRow) {
  const headerEl = document.getElementById(CA_OFFICER_LOOKUP_RESULTS_HEADER_ID);
  const bodyEl = document.getElementById(CA_OFFICER_LOOKUP_RESULTS_BODY_ID);
  if (!headerEl || !bodyEl) return;

  headerEl.innerHTML = '';
  bodyEl.innerHTML = '';

  const headerCells = ['Select', ...columns];
  headerCells.forEach((col) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = col;
    headerEl.appendChild(th);
  });

  rows.forEach((row) => {
    const tr = document.createElement('tr');

    const selectTd = document.createElement('td');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-sm btn-success';
    btn.textContent = 'Select';
    btn.addEventListener('click', () => {
      try {
        onSelectRow?.(row);
      } finally {
        caOfficerLookupModalInstance?.hide?.();
      }
    });
    selectTd.appendChild(btn);
    tr.appendChild(selectTd);

    columns.forEach((col) => {
      const td = document.createElement('td');
      const val = row?.[col];
      td.textContent = val === null || val === undefined ? '' : String(val);
      tr.appendChild(td);
    });

    bodyEl.appendChild(tr);
  });
}

async function caOfficerDoSearch() {
  caEnsureOfficerLookupModal();
  await caEnsureOfficerServicesLoaded();

  const form = document.getElementById(CA_OFFICER_LOOKUP_FORM_ID);
  const getField = (name) => form?.querySelector?.(`[data-ca-officer-field="${name}"]`);
  const getMode = (name) => form?.querySelector?.(`[data-ca-officer-mode="${name}"]`);

  const officerIdRaw = String(getField('OfficerID')?.value || '').trim();
  const officerNameRaw = String(getField('OfficerName')?.value || '').trim();
  const officerIdMode = String(getMode('OfficerID')?.value || 'Like');
  const officerNameMode = String(getMode('OfficerName')?.value || 'Like');

  const clauses = [];
  if (officerIdRaw) {
    const sanitized = caEscapeSqlLikeTerm(officerIdRaw);
    clauses.push(officerIdMode === 'Exact' ? `OfficerID='${sanitized}'` : `OfficerID LIKE '%${sanitized}%'`);
  }
  if (officerNameRaw) {
    const sanitized = caEscapeSqlLikeTerm(officerNameRaw);
    // Active officer search dialog uses OfficerName in WhereStmt, but response exposes Name.
    clauses.push(officerNameMode === 'Exact' ? `OfficerName='${sanitized}'` : `OfficerName LIKE '%${sanitized}%'`);
  }

  const whereStmt = clauses.join(' AND ');
  const branchId = caGetBranchId();
  const operatorId = caGetOperatorId();

  const payload = {
    TableID: 'ActiveOfficerID',
    AdvFilterString: `BankID='00' AND OfficerTypeID in ('CO','AO') AND ReportingBranchID='${branchId}'`,
    WhereStmt: whereStmt,
    PrevOrNext: '0',
    RefID: '',
    OperatorID: operatorId,
    ModuleID: '5060',
    OurBranchID: branchId,
    SearchKey: '',
    LanguageID: 'en'
  };

  caOfficerClearResults();
  caOfficerSetMeta('Searching...');

  try {
    const result = await window.SearchService.search(payload);
    const rows = caExtractSearchRows(result);

    if (!rows.length) {
      caOfficerSetMeta('No results');
      return;
    }

    const limited = rows.slice(0, 500);
    const columns = ['OfficerID', 'Name', 'ReportingBranchID'];

    caOfficerRenderResults(limited, columns, (selected) => {
      const officerIdEl = document.getElementById('OfficerId');
      const officerNameEl = document.getElementById('OfficerName');

      if (officerIdEl) officerIdEl.value = selected?.OfficerID || '';
      if (officerNameEl) officerNameEl.value = selected?.Name || '';

      officerIdEl?.dispatchEvent?.(new Event('change', { bubbles: true }));
    });

    caOfficerSetMeta(`${limited.length} result(s)`);
  } catch (err) {
    caOfficerSetMeta('Search failed');
    showStatus('Officer search failed: ' + (err?.message || 'Unknown error'), 'error');
  }
}

function caOpenOfficerLookup() {
  const modalEl = caEnsureOfficerLookupModal();
  caOfficerClearResults();
  caOfficerSetMeta('');

  // Prefill OfficerID from the form if present
  const form = document.getElementById(CA_OFFICER_LOOKUP_FORM_ID);
  const officerIdField = form?.querySelector?.('[data-ca-officer-field="OfficerID"]');
  if (officerIdField) officerIdField.value = String(document.getElementById('OfficerId')?.value || '').trim();

  caOfficerLookupModalInstance = window.bootstrap?.Modal?.getOrCreateInstance?.(modalEl, { backdrop: 'static' }) || caOfficerLookupModalInstance;
  caOfficerLookupModalInstance?.show?.();

  // Auto-search on open (same UX as other lookups)
  caOfficerDoSearch();
}

function caWireOfficerLookupModalEventsOnce() {
  const modalEl = caEnsureOfficerLookupModal();
  if (modalEl.dataset.caOfficerLookupWired === 'true') return;
  modalEl.dataset.caOfficerLookupWired = 'true';

  const form = document.getElementById(CA_OFFICER_LOOKUP_FORM_ID);
  const clearBtn = form?.querySelector?.('[data-ca-officer-action="clear"]');

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    e.stopPropagation();
    caOfficerDoSearch();
  });

  form?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      caOfficerDoSearch();
    }
  });

  clearBtn?.addEventListener('click', () => {
    form?.querySelectorAll?.('[data-ca-officer-field]')?.forEach?.((field) => {
      field.value = '';
    });
    caOfficerClearResults();
    caOfficerSetMeta('');
  });

  modalEl.addEventListener('shown.bs.modal', () => {
    setTimeout(() => {
      form?.querySelector?.('[data-ca-officer-field="OfficerID"]')?.focus?.();
    }, 0);
  });
}
function initializeAttendance() {

  // On form load: disable controls in the red box
  const officerIdInput = document.getElementById('OfficerId');
  const officerNameInput = document.getElementById('OfficerName');
  const meetingPlaceInput = document.getElementById('MeetingPlace');
  const remarksInput = document.getElementById('Remarks');
  const officerLookupBtn = document.querySelector('[data-ca-lookup="officer"]');

  if (officerIdInput) officerIdInput.disabled = true;
  if (officerNameInput) officerNameInput.disabled = true;
  if (officerLookupBtn) officerLookupBtn.disabled = true;
  if (meetingPlaceInput) meetingPlaceInput.disabled = true;
  if (remarksInput) remarksInput.disabled = true;

  // Ensure header fields start in non-edit mode.
  caSetHeaderFieldsForEditMode(false);

  const centerIdInput = document.getElementById('CenterId');
  if (centerIdInput) {
    centerIdInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleCenterSearch();
    });
  } else {
  }

  // Wire delegated click for lookup buttons (capture phase to avoid legacy/stub handlers)
  document.addEventListener(
    'click',
    (e) => {
      const target = e.target instanceof Element ? e.target : e.target?.parentElement;
      const lookupBtn = target?.closest?.('[data-ca-lookup]');
      if (!lookupBtn) return;
      if (lookupBtn.disabled) return;

      const lookupType = String(lookupBtn.getAttribute('data-ca-lookup') || '').trim();
      if (!lookupType) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      if (lookupType === 'officer') {
        caOpenOfficerSearch();
        return false;
      }

      if (lookupType === 'center') {
        caOpenCenterSearch();
        return false;
      }

      if (lookupType === 'meeting-date') {
        caOpenMeetingDateSearch();
        return false;
      }
    },
    true
  );

  // Keep grid model in sync when dropdowns change
  document.addEventListener('change', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLSelectElement)) return;

    const clientId = String(target.getAttribute('data-client-id') || '').trim();
    if (!clientId) return;

    const row = (caCurrentAttendanceRows || []).find((r) => String(r?.ClientID || '').trim() === clientId);
    if (!row) return;

    if (target.matches('select[data-attendance-status]')) {
      row.AttendanceStatusID = String(target.value || '').trim();
      return;
    }

    if (target.matches('select[data-payment-type]')) {
      row.PaymentTypeID = String(target.value || '').trim();
      const selectedLabel = target.selectedOptions?.[0]?.textContent || '';
      // Keep description fields aligned for UI/backward compatibility
      row.PaymentTypeDesc = selectedLabel;
      row.PaymentTypeDescription = selectedLabel;
      return;
    }
  });

  // Wire CenterID validation on change/blur
  const centerIdInputForValidation = document.getElementById('CenterId');
  if (centerIdInputForValidation) {
    centerIdInputForValidation.addEventListener('change', caValidateCenterIdOnChange);
    centerIdInputForValidation.addEventListener('blur', caValidateCenterIdOnChange);
  }

  // Wire OfficerID validation on change/blur
  const officerIdInputForValidation = document.getElementById('OfficerId');
  if (officerIdInputForValidation) {
    officerIdInputForValidation.addEventListener('change', caValidateOfficerIdOnChange);
    officerIdInputForValidation.addEventListener('blur', caValidateOfficerIdOnChange);
  }
}

async function caValidateCenterIdOnChange(e) {
  const centerId = String(e.target.value || '').trim();
  
  // If empty, just clear CenterName
  if (!centerId) {
    const centerNameEl = document.getElementById('CenterName');
    if (centerNameEl) centerNameEl.value = '';
    return;
  }

  // Validate Center ID with server
  const branchId = caGetBranchId();
  const bankId = String(caGetEnv()?.defaultBankId || '00').trim();

  const validationRequest = {
    OurBranchID: branchId,
    ControlTypeID: 'GroupID',
    ID: centerId,
    BankID: bankId,
    TypeID: '',
    AdvanceFilter: '',
    LanguageID: 'en'
  };

  try {
    const validationResp = await window.MicrofinanceService.validateCenter(validationRequest);

    if (!validationResp?.success) {
      const msg = validationResp?.message || validationResp?.data?.Message || 'Invalid Center ID';
      showStatus(msg, 'error');
      document.getElementById('CenterId').value = '';
      document.getElementById('CenterName').value = '';
      return;
    }

    const details = caExtractDetailsArray(validationResp);
    if (!details.length) {
      // No details - invalid center
      document.getElementById('CenterId').value = '';
      document.getElementById('CenterName').value = '';
      showStatus('Invalid Center ID (no details found)', 'error');
      return;
    }

    const centerDetail = details[0] || {};
    const centerName = String(
      centerDetail.GroupName ||
      centerDetail.Name ||
      centerDetail.Description ||
      ''
    ).trim();

    // If GroupName is blank: Clear both CenterID and CenterName
    if (!centerName) {
      document.getElementById('CenterId').value = '';
      document.getElementById('CenterName').value = '';
      showStatus('Invalid Center ID (no name returned)', 'error');
      return;
    }

    // Valid: Populate CenterName
    document.getElementById('CenterName').value = centerName;

  } catch (err) {
    document.getElementById('CenterId').value = '';
    document.getElementById('CenterName').value = '';
    showStatus(`Center validation failed: ${err.message || 'Unknown error'}`, 'error');
  }
}

async function caValidateOfficerIdOnChange(e) {
  const officerId = String(e.target.value || '').trim();
  
  // If empty, just clear OfficerName
  if (!officerId) {
    const officerNameEl = document.getElementById('OfficerName');
    if (officerNameEl) officerNameEl.value = '';
    return;
  }

  // Validate Officer ID with server
  const branchId = caGetBranchId();
  const bankId = String(caGetEnv()?.defaultBankId || '00').trim();

  const validationRequest = {
    OurBranchID: branchId,
    ControlTypeID: 'ActiveOfficerID',
    ID: officerId,
    BankID: bankId,
    TypeID: officerId,
    AdvanceFilter: '',
    LanguageID: 'en'
  };

  try {
    const validationResp = await window.MicrofinanceService.validateOfficerID(validationRequest);

    if (!validationResp?.success) {
      const msg = validationResp?.message || validationResp?.data?.Message || 'Invalid Officer ID';
      showStatus(msg, 'error');
      document.getElementById('OfficerId').value = '';
      document.getElementById('OfficerName').value = '';
      return;
    }

    const details = caExtractDetailsArray(validationResp);
    if (!details.length) {
      // No details - invalid officer
      document.getElementById('OfficerId').value = '';
      document.getElementById('OfficerName').value = '';
      showStatus('Invalid Officer ID (no details found)', 'error');
      return;
    }

    const officerDetail = details[0] || {};
    const officerName = String(
      officerDetail.Name ||
      officerDetail.Description ||
      officerDetail.OfficerName ||
      officerDetail.EmployeeName ||
      ''
    ).trim();

    // If Name is blank: Clear both OfficerID and OfficerName
    if (!officerName) {
      document.getElementById('OfficerId').value = '';
      document.getElementById('OfficerName').value = '';
      showStatus('Invalid Officer ID (no name returned)', 'error');
      return;
    }

    // Valid: Populate OfficerName
    document.getElementById('OfficerName').value = officerName;

  } catch (err) {
    document.getElementById('OfficerId').value = '';
    document.getElementById('OfficerName').value = '';
    showStatus(`Officer validation failed: ${err.message || 'Unknown error'}`, 'error');
  }
}

function handleCenterSearch() {
  caOpenCenterSearch();
}
function handleMeetingDateSearch() { caOpenMeetingDateSearch(); }
function handleOfficerSearch() { caOpenOfficerSearch(); }

// ───────────────────────────────────────────────────────────────────────────
// Common Search Dialogs Integration
// ───────────────────────────────────────────────────────────────────────────

function caOpenSearchDialog(url, title) {
  const modal = document.getElementById('searchModal');
  const iframe = document.getElementById('searchModalFrame');
  const modalTitle = document.getElementById('searchModalTitle');

  if (!modal || !iframe || !modalTitle) {
    return;
  }

  modalTitle.textContent = title;
  // Append noheader=1 to hide iframe's internal header (parent modal provides header)
  const separator = url.includes('?') ? '&' : '?';
  iframe.src = url + separator + 'noheader=1';

  // Use Bootstrap modal
  const bsModal = new bootstrap.Modal(modal);
  bsModal.show();
}

function caOpenCenterSearch() {
  const branchId = caGetBranchId();
  let url = '../../common/searchDialogs/group-search/group-search.html';
  if (branchId) {
    url += `?branch=${encodeURIComponent(branchId)}&context=group`;
  }
  caOpenSearchDialog(url, 'Center Search');
}

function caOpenMeetingDateSearch() {
  const branchId = caGetBranchId();
  let url = '../../common/searchDialogs/meeting-date-search/meeting-date-search.html';
  if (branchId) {
    url += `?branch=${encodeURIComponent(branchId)}`;
  }
  caOpenSearchDialog(url, 'Meeting Date Search');
}

function caOpenOfficerSearch() {
  const branchId = caGetBranchId();
  let url = '../../common/searchDialogs/active-officer-search/active-officer-search.html';
  if (branchId) {
    url += `?branch=${encodeURIComponent(branchId)}`;
  }
  caOpenSearchDialog(url, 'Officer Search');
}

// Wire message event listener for search dialog selections
window.addEventListener('message', (event) => {
  if (!event?.data?.type) return;

  const { type } = event.data;

  if (type === 'kairo-dataentry-close') {
    // Close the search modal
    const modal = document.getElementById('searchModal');
    if (modal) {
      const bsModal = bootstrap.Modal.getInstance(modal);
      if (bsModal) bsModal.hide();
    }
  } else if (type === 'GROUP_SELECTED') {
    // Handle Center (Group) selection from search dialog
    const { groupId, groupName } = event.data;
    document.getElementById('CenterId').value = groupId || '';
    document.getElementById('CenterName').value = groupName || '';
    showStatus(`Center selected: ${groupId} - ${groupName}`, 'success');
  } else if (type === 'MEETING_DATE_SELECTED') {
    // Handle Meeting Date selection from search dialog - only set meeting date
    const { meetingDate } = event.data;
    document.getElementById('MeetingDate').value = meetingDate || '';
    showStatus(`Meeting Date selected: ${meetingDate}`, 'success');
  } else if (type === 'ACTIVE_OFFICER_SELECTED') {
    // Handle Officer selection from search dialog
    const { officerId, officerName } = event.data;
    document.getElementById('OfficerId').value = officerId || '';
    document.getElementById('OfficerName').value = officerName || '';
    showStatus(`Officer selected: ${officerId} - ${officerName}`, 'success');
  }
});

function populateForm(att) {
  // Support both camelCase (legacy) and PascalCase (API) field names
  const fields = {
    CenterId: att.GroupID || att.centerId || '',
    CenterName: att.GroupName || att.centerName || '',
    MeetingDate: att.MeetingDate || att.NextMeetingDate || att.meetingDate || '',
    OfficerId: att.OfficerID || att.officerId || '',
    OfficerName: att.OfficerName || att.officerName || '',
    MeetingPlace: att.MeetingPlace || att.meetingPlace || '',
    Remarks: att.Remarks || att.remarks || ''
  };
  
  // Format meeting date to DD-MMM-YYYY
  if (fields.MeetingDate) {
    fields.MeetingDate = caFormatToDdMmmYyyy(fields.MeetingDate) || fields.MeetingDate;
  }
  
  Object.keys(fields).forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.value = fields[id] || '';
    }
  });
}
function loadAttendanceTable(attendance) {
  const tbody = document.getElementById('attendanceTableBody');
  if (!tbody) {
    return;
  }
  if (!attendance || !Array.isArray(attendance) || attendance.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No records to display</td></tr>';
    return;
  }

  caCurrentAttendanceRows = attendance;

  // Normalize rows from backend into expected field names/codes.
  for (const row of caCurrentAttendanceRows || []) {
    caNormalizeAttendanceRow(row);
  }

  // Ensure model has a default AttendanceStatusID (UI defaults to Present) only if still blank.
  for (const row of caCurrentAttendanceRows || []) {
    const current = String(row?.AttendanceStatusID ?? '').trim();
    if (!current) row.AttendanceStatusID = 'P';
  }
  
  // Render attendance records with dropdown for status
  tbody.innerHTML = attendance.map(record => `
    <tr>
      <td>${record.ClientID || ''}</td>
      <td>${record.ClientName || ''}</td>
      <td>
        <select class="form-control" data-client-id="${record.ClientID}" data-attendance-status>
          <option value="P" ${record.AttendanceStatusID === 'P' ? 'selected' : ''}>Present</option>
          <option value="A" ${record.AttendanceStatusID === 'A' ? 'selected' : ''}>Absent</option>
          <option value="L" ${record.AttendanceStatusID === 'L' ? 'selected' : ''}>Late</option>
        </select>
      </td>
      <td>
        <select class="form-control" data-client-id="${record.ClientID}" data-payment-type>
          <option value="">Loading...</option>
        </select>
      </td>
    </tr>
  `).join('');

  // Apply current grid editability state immediately after render
  caSetGridEditable(caIsGridEditable);

  // Populate PaymentType dropdown options for all rows once system codes are loaded.
  caEnsurePaymentTypeOptionsLoaded()
    .then(() => caApplyPaymentTypeDropdownsToGrid())
    .catch((e) => {
      // Keep the table usable even if dropdown options fail.
    });
}
function clearForm() {
  const fieldIds = ['CenterId', 'CenterName', 'MeetingDate', 'OfficerId', 'OfficerName', 'MeetingPlace', 'Remarks'];
  fieldIds.forEach(id => {
    const element = document.getElementById(id);
    if (element) element.value = '';
  });

  // Clear grid UI
  const tbody = document.getElementById('attendanceTableBody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No records to display</td></tr>';
  }

  currentAttendance = null;
  caCurrentAttendanceRows = [];
  caHasLoadedAttendance = false;
  caIsGridEditable = false;

  // Restore initial header state (CenterID should be enabled on fresh screen)
  caSetCenterFieldsLocked(false);
  caSetHeaderFieldsForEditMode(false);

  // Reset button states to initial screen
  caSetMeetingFieldsEditable(false);
  caSetGridEditable(false);
  caSetActionButtonsState({ view: true, edit: false, delete: false, save: false, cancel: true });
  setEditMode(false);
}
async function handleView() {
  
  // Check if MicrofinanceService is available
  if (!window.MicrofinanceService) {
    showStatus('MicrofinanceService not available. Please refresh the page.', 'error');
    return;
  }
  
  if (!window.MicrofinanceService.getGroupAttendance) {
    showStatus('getGroupAttendance method not available in MicrofinanceService', 'error');
    return;
  }
  
  // Validate required fields
  const centerId = document.getElementById('CenterId')?.value?.trim();
  const meetingDateRaw = document.getElementById('MeetingDate')?.value?.trim();
  
  if (!centerId || centerId === '') {
    showStatus('Please enter Center ID', 'error');
    return;
  }
  
  if (!meetingDateRaw || meetingDateRaw === '') {
    showStatus('Please select Meeting Date', 'error');
    return;
  }

  // API/UI expects dd-Mmm-yyyy in this module.
  const meetingDate = caFormatToDdMmmYyyy(meetingDateRaw) || meetingDateRaw;
  
  // Show loading indicator
  showStatus('Loading attendance data...', 'info');
  
  try {
    // Get operator and branch from auth
    // const operatorId = window.AuthService?.getOperatorId?.() || '001';
    const operatorId =  'CSADM';
    // const branchId = window.AuthService?.getBranchId?.() || '0603';
    const branchId =  '0603';
    
    console.log('Fetching attendance for CenterID:', {
      OurBranchID: branchId,
      GroupID: centerId,
      MeetingDate: meetingDate,
      OperatorID: operatorId
    });
    // Call the API
    const result = await window.MicrofinanceService.getGroupAttendance({
      OurBranchID: branchId,
      GroupID: centerId,
      MeetingDate: meetingDate,
      OperatorID: operatorId
    });
    console.log('getGroupAttendance result:', result);
    
    if (result.success && result.data) {
      // Handle both single object and array responses
      let attendanceList = [];
      let recordData = result.data;
      
      
      // p_GetTrxGroupMinDetail returns members in Details or Details01, no NewData parsing needed
      // First, get header data from Details01[0] if available (contains meeting info)
      if (result.data && result.data.Details01 && Array.isArray(result.data.Details01) && result.data.Details01.length > 0) {
        recordData = result.data.Details01[0];
      } else if (result.data && result.data.Details && Array.isArray(result.data.Details) && result.data.Details.length > 0) {
        recordData = result.data.Details[0];
      }

      // Pick the dataset that most likely contains member rows with saved status/payment values.
      attendanceList = caPickAttendanceListFromResponse(result.data);
      if (attendanceList.length > 0) {
      } else if (Array.isArray(result.data) && result.data.length > 0) {
        attendanceList = result.data;
      } 

      // Normalize row fields so UI binds correctly (Absent/Not Paid, etc.).
      for (const row of attendanceList || []) {
        caNormalizeAttendanceRow(row);
      }
      
      // Populate form fields from Details01 (header data)
      if (recordData.GroupID) {
        document.getElementById('CenterId').value = recordData.GroupID;
      }
      if (recordData.GroupName) {
        document.getElementById('CenterName').value = recordData.GroupName;
      }
      if (recordData.MeetingDate) {
        document.getElementById('MeetingDate').value = caFormatToDdMmmYyyy(recordData.MeetingDate) || String(recordData.MeetingDate);
      }
      // Officer should load from Center (Group) Details (master), not from attendance header.
      // Fallback to attendance header only if center details are unavailable.
      try {
        const groupIdForOfficer = String(recordData.GroupID || centerId || '').trim();
        const officerFromCenter = await caLoadOfficerFromCenterDetails({
          branchId,
          groupId: groupIdForOfficer,
          operatorId
        });

        if (officerFromCenter?.officerId || officerFromCenter?.officerName) {
          document.getElementById('OfficerId').value = officerFromCenter.officerId || '';
          document.getElementById('OfficerName').value = officerFromCenter.officerName || '';
        } else {
          if (recordData.OfficerID || recordData.OfficerId) {
            document.getElementById('OfficerId').value = recordData.OfficerID || recordData.OfficerId;
          }
          if (recordData.OfficerName) {
            document.getElementById('OfficerName').value = recordData.OfficerName;
          }
        }
      } catch (e) {
      }
      if (recordData.MeetingPlace) {
        document.getElementById('MeetingPlace').value = recordData.MeetingPlace;
      }
      if (recordData.Remarks) {
        document.getElementById('Remarks').value = recordData.Remarks;
      }

      // Capture UpdateCount for later Save.
      caCurrentUpdateCount = caPickUpdateCount(recordData, attendanceList);
      
      // Always use loadAttendanceTable to render
      loadAttendanceTable(attendanceList);
      if (attendanceList.length > 0) {
        showStatus('Attendance data loaded successfully - ' + attendanceList.length + ' records', 'success');
      } else {
        showStatus('No attendance records found. Check console for data structure.', 'warning');
      }
      
      currentAttendance = recordData;
      caHasLoadedAttendance = true;
      showStatus('Attendance data loaded successfully', 'success');

      // Requirement: after View loads data, CenterID should be disabled.
      caSetCenterFieldsLocked(true);

      // Requirement: when View loads successfully
      // Disable View + Save; enable Edit + Delete + Cancel
      caSetMeetingFieldsEditable(false);
      caSetGridEditable(false);
      caSetActionButtonsState({ view: false, edit: true, delete: true, save: false, cancel: true });
      setEditMode(false);
    } else {
      showStatus(result.message || 'No data found', 'error');
    }
  } catch (error) {
    showStatus('Error loading attendance data: ' + error.message, 'error');
  }
}

function handleEdit() {
  if (!currentAttendance) {
    showStatus('Please select center first', 'error');
    return;
  }

  // Validate Meeting Date is not before System Working Date
  const meetingDateRaw = String(document.getElementById('MeetingDate')?.value || '').trim();
  const meetingDate = caFormatToDdMmmYyyy(meetingDateRaw) || meetingDateRaw;
  const meetingDateObj = caParseDdMmmYyyyToDate(meetingDate);
  const workingDate = caGetWorkingDate();
  
  if (meetingDateObj && workingDate) {
    // Compare dates (ignoring time)
    const meetingDateOnly = new Date(meetingDateObj.getFullYear(), meetingDateObj.getMonth(), meetingDateObj.getDate());
    const workingDateOnly = new Date(workingDate.getFullYear(), workingDate.getMonth(), workingDate.getDate());
    
    if (meetingDateOnly < workingDateOnly) {
      showStatus(`Cannot edit: Meeting Date (${meetingDate}) is before System Working Date`, 'error');
      return;
    }
  }

  // Disable CenterID, Center Search, Meeting Date, Meeting Date Search
  const centerIdEl = document.getElementById('CenterId');
  const centerNameEl = document.getElementById('CenterName');
  const meetingDateEl = document.getElementById('MeetingDate');
  const centerLookupBtn = document.querySelector('[data-ca-lookup="center"]');
  const meetingDateLookupBtn = document.querySelector('[data-ca-lookup="meeting-date"]');
  
  caSetDisabled(centerIdEl, true);
  caLockInput(centerIdEl, true);
  caSetDisabled(centerNameEl, true);
  caLockInput(centerNameEl, true);
  caSetDisabled(centerLookupBtn, true);
  
  caSetDisabled(meetingDateEl, true);
  caLockInput(meetingDateEl, true);
  caSetDisabled(meetingDateLookupBtn, true);

  // Enable OfficerID, Officer Search, Meeting Place, Remarks
  const officerIdEl = document.getElementById('OfficerId');
  const officerNameEl = document.getElementById('OfficerName');
  const officerLookupBtn = document.querySelector('[data-ca-lookup="officer"]');
  
  caSetDisabled(officerIdEl, false);
  caLockInput(officerIdEl, false);
  caSetDisabled(officerNameEl, true); // Always disabled
  caLockInput(officerNameEl, true); // Always disabled
  caSetDisabled(officerLookupBtn, false);
  
  caSetMeetingFieldsEditable(true);
  
  // Enable Grid Dropdowns
  caSetGridEditable(true);
  
  // Disable Edit, Delete, Add buttons; Enable Save and Cancel
  caSetActionButtonsState({ view: false, edit: false, delete: false, save: true, cancel: true });
  
  setEditMode(true);
  showStatus('Editing attendance', 'warning');
}

function handleDelete() {
  handleDeleteAsync();
}

async function handleDeleteAsync() {
  if (!currentAttendance) {
    showStatus('Please select center first', 'error');
    return;
  }

  if (!window.MicrofinanceService?.removeCenterMeeting) {
    showStatus('removeCenterMeeting not available in MicrofinanceService', 'error');
    return;
  }

  const branchId = caGetBranchId();
  const centerId = String(document.getElementById('CenterId')?.value || '').trim();
  const meetingDateRaw = String(document.getElementById('MeetingDate')?.value || '').trim();
  const meetingDate = caFormatToDdMmmYyyy(meetingDateRaw) || meetingDateRaw;

  if (!centerId || !meetingDate) {
    showStatus('Center ID and Meeting Date are required', 'error');
    return;
  }

  // Show Bootstrap confirmation modal instead of native confirm
  const confirmed = await caShowConfirmationModal(
    'Confirm Deletion',
    `Delete attendance record for Center ${centerId} on ${meetingDate}?`
  );
  
  if (!confirmed) {
    return;
  }

  const deleteRequest = {
    OurBranchID: branchId,
    GroupID: centerId,
    MeetingDate: meetingDate,
    UpdateCount: String(caCurrentUpdateCount || 0)
  };

  showStatus('Deleting attendance record...', 'info');

  try {
    const deleteResp = await window.MicrofinanceService.removeCenterMeeting(deleteRequest);

    // Check for failure (Status: 091)
    if (deleteResp?.data?.Status === '091' || deleteResp?.data?.status === '091') {
      const errorMsg = deleteResp?.data?.Message || deleteResp?.data?.message || 'Deletion failed';
      showStatus(errorMsg, 'error');
      return;
    }

    // Success case: Details array (empty or present)
    if (deleteResp?.success || deleteResp?.data?.Details !== undefined) {
      showStatus('Attendance record deleted successfully', 'success');
      
      // Clear the form and grid
      clearForm();
      
      // Reset state
      currentAttendance = null;
      caCurrentUpdateCount = 0;
      caHasLoadedAttendance = false;
      caCurrentAttendanceRows = [];
      
      // Enable CenterID, Center Search, Meeting Date
      const centerIdEl = document.getElementById('CenterId');
      const centerNameEl = document.getElementById('CenterName');
      const meetingDateEl = document.getElementById('MeetingDate');
      const centerLookupBtn = document.querySelector('[data-ca-lookup="center"]');
      const meetingDateLookupBtn = document.querySelector('[data-ca-lookup="meeting-date"]');
      
      caSetDisabled(centerIdEl, false);
      caLockInput(centerIdEl, false);
      caSetDisabled(centerNameEl, true); // Always disabled
      caLockInput(centerNameEl, true); // Always disabled
      caSetDisabled(centerLookupBtn, false);
      
      caSetDisabled(meetingDateEl, false);
      caLockInput(meetingDateEl, false);
      caSetDisabled(meetingDateLookupBtn, false);
      
      // Disable Edit, Save, Delete buttons; Enable View
      caSetActionButtonsState({ view: true, edit: false, delete: false, save: false, cancel: true });
      
      return;
    }

    // Fallback: unexpected response
    showStatus('Unexpected response from delete operation', 'warning');
    
  } catch (err) {
    showStatus(`Delete failed: ${err.message || 'Unknown error'}`, 'error');
  }
}

function handleSave() {
  handleSaveAsync();
}

async function handleSaveAsync() {
  if (!currentAttendance) {
    showStatus('Please select center first', 'error');
    return;
  }

  const operatorId = caGetOperatorId();
  const branchId = caGetBranchId();
  const bankId = String(caGetEnv()?.defaultBankId || '00').trim();

  const centerId = String(document.getElementById('CenterId')?.value || '').trim();
  const meetingDateRaw = String(document.getElementById('MeetingDate')?.value || '').trim();
  const meetingDate = caFormatToDdMmmYyyy(meetingDateRaw) || meetingDateRaw;

  const officerId = String(document.getElementById('OfficerId')?.value || '').trim();
  const officerName = String(document.getElementById('OfficerName')?.value || '').trim();
  const meetingPlace = String(document.getElementById('MeetingPlace')?.value || '').trim();
  const remarks = String(document.getElementById('Remarks')?.value || '').trim();

  // Validate Meeting Date is not ahead of System Working Date
  const meetingDateObj = caParseDdMmmYyyyToDate(meetingDate);
  const workingDate = caGetWorkingDate();
  
  if (meetingDateObj && workingDate) {
    // Compare dates (ignoring time)
    const meetingDateOnly = new Date(meetingDateObj.getFullYear(), meetingDateObj.getMonth(), meetingDateObj.getDate());
    const workingDateOnly = new Date(workingDate.getFullYear(), workingDate.getMonth(), workingDate.getDate());
    
    if (meetingDateOnly > workingDateOnly) {
      showStatus(`Meeting Date (${meetingDate}) cannot be ahead of System Working Date`, 'error');
      return;
    }
  }

  if (!officerId) {
    showStatus('Officer ID is required', 'error');
    return;
  }
  if (!officerName) {
    showStatus('Officer Name is required', 'error');
    return;
  }
  if (!meetingPlace) {
    showStatus('Meeting Place is required', 'error');
    return;
  }

  const rows = Array.isArray(caCurrentAttendanceRows) ? caCurrentAttendanceRows : [];
  if (!rows.length) {
    showStatus('No attendance rows to save', 'error');
    return;
  }

  for (const row of rows) {
    const clientId = String(row?.ClientID ?? '').trim();
    const clientName = String(row?.ClientName ?? '').trim();
    const attendanceStatusId = String(row?.AttendanceStatusID ?? '').trim();
    const paymentTypeId = String(row?.PaymentTypeID ?? '').trim();

    if (!attendanceStatusId) {
      showStatus(`Attendance Status is required for ${clientId || clientName || 'a row'}`, 'error');
      return;
    }
    if (!paymentTypeId) {
      showStatus(`Payment Type is required for ${clientId || clientName || 'a row'}`, 'error');
      return;
    }
  }

  if (!window.MicrofinanceService?.validateOfficerID) {
    showStatus('validateOfficerID not available in MicrofinanceService', 'error');
    return;
  }
  if (!window.MicrofinanceService?.saveGroupMemberAttendance) {
    showStatus('saveGroupMemberAttendance not available in MicrofinanceService', 'error');
    return;
  }

  showStatus('Validating Officer...', 'info');

  const officerValidationRequest = {
    OurBranchID: branchId,
    ControlTypeID: 'ActiveOfficerID',
    ID: officerId,
    BankID: bankId,
    TypeID: officerId,
    AdvanceFilter: '',
    LanguageID: 'en'
  };

  const officerValidationResp = await window.MicrofinanceService.validateOfficerID(officerValidationRequest);

  if (!officerValidationResp?.success) {
    const msg = officerValidationResp?.message || officerValidationResp?.data?.Message || 'Invalid Officer ID';
    showStatus(msg, 'error');
    return;
  }

  const officerDetails = caExtractDetailsArray(officerValidationResp);
  if (!officerDetails.length) {
    showStatus('Invalid Officer ID', 'error');
    return;
  }

  const firstOfficer = officerDetails[0] || {};
  const validatedOfficerName = String(
    firstOfficer?.OfficerName ??
    firstOfficer?.Name ??
    firstOfficer?.Description ??
    firstOfficer?.EmployeeName ??
    firstOfficer?.UserName ??
    ''
  ).trim();

  // Critical requirement: do NOT save if backend doesn't return a valid name.
  if (!validatedOfficerName) {
    showStatus(`Invalid Officer ID '${officerId}' (no name returned)`, 'error');
    return;
  }

  // Always trust backend name over typed value.
  const officerNameEl = document.getElementById('OfficerName');
  if (officerNameEl) officerNameEl.value = validatedOfficerName;

  const attendanceDetailsXml = caBuildAttendanceDetailsXml(rows);
  if (!attendanceDetailsXml) {
    showStatus('Attendance details XML is empty', 'error');
    return;
  }

  showStatus('Saving attendance...', 'info');

  const saveRequest = {
    OurBranchID: branchId,
    GroupID: centerId,
    MeetingDate: meetingDate,
    OfficerID: officerId,
    MeetingPlace: meetingPlace,
    Remarks: remarks,
    AttendanceDetails: attendanceDetailsXml,
    OperatedBy: operatorId,
    UpdateCount: caCurrentUpdateCount || 0

  };

  const saveResp = await window.MicrofinanceService.saveGroupMemberAttendance(saveRequest);

  const statusObj = saveResp?.data;
  const explicitFail = statusObj?.Status !== undefined && !(statusObj.Status === '00' || statusObj.Status === '0' || statusObj.Status === 0);
  if (!saveResp?.success || explicitFail) {
    const msg = statusObj?.Message || saveResp?.message || 'Save failed';
    showStatus(msg, 'error');
    return;
  }

  // Update the UpdateCount after successful save
  // Check if save response contains a new UpdateCount, otherwise increment the current one
  const newUpdateCount = saveResp?.data?.Details01?.[0]?.UpdateCount ??
                         saveResp?.data?.UpdateCount ??
                         (caCurrentUpdateCount + 1);
  caCurrentUpdateCount = newUpdateCount;

  currentAttendance.MeetingPlace = meetingPlace;
  currentAttendance.Remarks = remarks;
  currentAttendance.OfficerID = officerId;
  currentAttendance.OfficerName = validatedOfficerName;
  currentAttendance.UpdateCount = caCurrentUpdateCount;

  // Requirement: after successful Save, disable all controls except Cancel.
  caDisableAllControlsExceptCancel();
  setEditMode(false);
  showStatus('Attendance saved successfully', 'success');
}

function handleCancel() {
  clearForm();
  showStatus('Cancelled', 'info');
}
function setEditMode(enabled) {
  isEditMode = enabled;
  // Field/button state is managed by handleView/handleEdit/handleSave/handleCancel.
}

function caShowConfirmationModal(title, message) {
  return new Promise((resolve) => {
    // Create modal if it doesn't exist
    let modalEl = document.getElementById('caConfirmationModal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.className = 'modal fade';
      modalEl.id = 'caConfirmationModal';
      modalEl.tabIndex = -1;
      modalEl.setAttribute('aria-labelledby', 'caConfirmationModalLabel');
      modalEl.setAttribute('aria-hidden', 'true');
      
      modalEl.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="caConfirmationModalLabel"></h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body" id="caConfirmationModalBody"></div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" id="caConfirmNo">No</button>
              <button type="button" class="btn btn-primary" id="caConfirmYes">Yes</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modalEl);
    }

    // Update modal content
    const titleEl = modalEl.querySelector('#caConfirmationModalLabel');
    const bodyEl = modalEl.querySelector('#caConfirmationModalBody');
    const yesBtn = modalEl.querySelector('#caConfirmYes');
    const noBtn = modalEl.querySelector('#caConfirmNo');

    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.textContent = message;

    // Set up button handlers
    yesBtn.onclick = () => {
      modalInstance.hide();
      resolve(true);
    };
    noBtn.onclick = () => {
      modalInstance.hide();
      resolve(false);
    };

    // Handle backdrop dismiss
    modalEl.addEventListener('hidden.bs.modal', () => {
      resolve(false);
    }, { once: true });

    // Show modal
    const modalInstance = window.bootstrap?.Modal?.getOrCreateInstance(modalEl, { backdrop: 'static', keyboard: false });
    modalInstance.show();
  });
}

function showStatus(msg, type = 'info') {
  
  // Use toast system for displaying messages (same as Center Maintenance)
  caShowSnackbar(msg, type);
}
document.addEventListener('DOMContentLoaded', function() {
  
  if (!window.Environment) {
  }
  
  if (!window.CoreApi) {
  }
  
  if (window.MicrofinanceService) {
  } else {
  }
  
  initializeAttendance();
});
const style = document.createElement('style');
style.textContent = `.input-group-icon { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; margin-left: -35px; color: var(--text-gray); cursor: pointer; }`;
document.head.appendChild(style);

// Menu toggle functionality
document.addEventListener('DOMContentLoaded', function() {
    // Menu arrow toggle
    document.querySelectorAll('.menu-arrow').forEach((arrow) => {
        arrow.addEventListener('click', (e) => {
            const menuSection = e.target.closest('.menu-section');
            const menuItems = menuSection.querySelector('.menu-items');
            const isExpanded = e.target.getAttribute('aria-expanded') === 'true';
            
            if (isExpanded) {
                menuItems.setAttribute('hidden', '');
                e.target.setAttribute('aria-expanded', 'false');
                e.target.querySelector('i').className = 'bi bi-chevron-down';
            } else {
                menuItems.removeAttribute('hidden');
                e.target.setAttribute('aria-expanded', 'true');
                e.target.querySelector('i').className = 'bi bi-chevron-up';
            }
        });
    });

    // Menu item click handlers
    document.querySelectorAll('.menu-item').forEach((item) => {
        item.addEventListener('click', (e) => {
            // Handle menu item clicks here
        });
    });

    // Action button handlers
    document.querySelectorAll('[data-ca-action]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const action = e.target.closest('[data-ca-action]').getAttribute('data-ca-action');
            switch(action) {
                case 'view': handleView(); break;
                case 'edit': handleEdit(); break;
                case 'delete': handleDelete(); break;
                case 'save': handleSave(); break;
                case 'cancel': handleCancel(); break;
            }
        });
    });
});
