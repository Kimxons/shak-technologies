// Sample data for Group Maintenance
const centerData = [];

// ---------------------------------------------------------------------------
// Toast helpers (aligned with modern Account Maintenance system to show
// system-level toasts like "Please close 'X' first" in a consistent style)
// ---------------------------------------------------------------------------

function ensureToastContainer() {
    let el = document.querySelector('[data-kairo-toast-container]');
    if (!el) {
        el = document.getElementById('toastContainer');
    }
    if (el) return el;

    el = document.createElement('div');
    el.className = 'kairo-toast-container';
    el.setAttribute('data-kairo-toast-container', '');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-relevant', 'additions');
    document.body.appendChild(el);
    return el;
}

function showToast(message, { title = 'Validation', variant = 'danger', timeoutMs = 9000 } = {}) {
    const container = ensureToastContainer();

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

function showSystemToast(message, { title = 'Notice', variant = 'info', timeoutMs = 5000 } = {}) {
    const container = ensureToastContainer();
    const existingToasts = container.querySelectorAll('.kairo-toast');
    existingToasts.forEach(t => t.remove());

    showToast(message, { title, variant, timeoutMs });
}

function showSnackbar(message, type = 'info') {
    console.log('[GroupMaintenance] showSnackbar:', type, message);

    let variant = 'info';
    if (type === 'success') variant = 'success';
    else if (type === 'error') variant = 'danger';
    else if (type === 'warning') variant = 'warning';

    showSystemToast(message, { title: 'Notice', variant });
}

async function showConfirmationDialog(title, message, variant) {
    if (typeof window.showConfirmationDialog === 'function') {
        return window.showConfirmationDialog(title, message, variant);
    }

    return Promise.resolve(window.confirm(message || title || 'Are you sure?'));
}

const MICROFINANCE_CONTROLLER_BASE = 'MicroFinance';

function getAppCore() {
    const win = window;
    return win.AppCore ||
        (win.parent && win.parent !== win && win.parent.AppCore) ||
        (win.top && win.top !== win && win.top.AppCore) ||
        null;
}

function invokeMicroFinanceController(action, requestData) {
    return new Promise((resolve, reject) => {
        const appCore = getAppCore();
        if (!appCore || typeof appCore.invokeController !== 'function') {
            reject(new Error('AppCore is not available (AppCore.invokeController not found)'));
            return;
        }

        const endpoint = `${MICROFINANCE_CONTROLLER_BASE}/${action}`;
        appCore.invokeController(endpoint, requestData || {}, (error, response) => {
            if (error) {
                reject(error);
            } else {
                resolve(response);
            }
        });
    });
}

function callMicroFinanceOldApi(formId, requestData) {
    return invokeMicroFinanceController('old-api', {
        formId,
        requestData: requestData || {}
    });
}

function unwrapOldApiRows(response) {
    const payload = response?.data ?? response;
    if (Array.isArray(payload?.Details)) return payload.Details;
    if (Array.isArray(payload?.Details01)) return payload.Details01;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload)) return payload;
    return [];
}

let sharedSearchModal = null;
let resolvedBranchSearchTableId = null;
let isBranchSearchModalUnavailable = false;

function getFieldValue(source, ...keys) {
    if (!source || typeof source !== 'object') return '';
    for (const key of keys) {
        const actual = Object.keys(source).find(k => k.toLowerCase() === String(key).toLowerCase());
        if (actual && source[actual] !== undefined && source[actual] !== null) {
            return source[actual];
        }
    }
    return '';
}

function ensureSharedSearchModal() {
    if (sharedSearchModal && typeof sharedSearchModal.open === 'function') {
        return sharedSearchModal;
    }

    if (typeof window.SearchModal !== 'function') {
        console.error('[GroupMaintenance] SearchModal is not available');
        return null;
    }

    const appCore = getAppCore();
    if (!appCore) {
        console.error('[GroupMaintenance] AppCore is not available for SearchModal');
        return null;
    }

    if (typeof appCore.invokeControllerGetViewAsync !== 'function') {
        appCore.invokeControllerGetViewAsync = async (endpoint, query) => {
            const qs = new URLSearchParams(query || {}).toString();
            const resp = await fetch(`/${endpoint}?${qs}`, { credentials: 'same-origin' });
            if (!resp.ok) throw new Error(`Failed to load view (${resp.status})`);
            return resp.text();
        };
    }

    if (typeof appCore.invokeControllerAsync !== 'function') {
        appCore.invokeControllerAsync = async (endpoint, data) => {
            const resp = await fetch(`/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify(data || {})
            });
            if (!resp.ok) throw new Error(`Request failed (${resp.status})`);
            return resp.json();
        };
    }

    sharedSearchModal = new window.SearchModal(appCore);
    return sharedSearchModal;
}

function openLookupSearch(config, onSelect) {
    const modal = ensureSharedSearchModal();
    if (!modal) {
        showSnackbar('Search modal is not available.', 'error');
        return;
    }

    modal.open({
        tableID: config.tableID,
        moduleID: 5060,
        whereStmt: config.whereStmt || '',
        advFilterString: config.advFilterString || '',
        searchKey: '',
        onSelect: (row) => {
            if (typeof onSelect === 'function') onSelect(row || {});
        }
    }).catch(err => {
        console.error('[GroupMaintenance] SearchModal open failed:', err);
        showSnackbar('Unable to open search dialog.', 'error');
    });
}

let currentCenter = null;
let isEditMode = false;
let isAddMode = false;
let activeOfficerSearchContext = null;

const LOOKUP_HANDLERS = {
    Branch: () => handleBranchSearch(),
    Center: () => handleCenterSearch(),
    CenterProduct: () => handleCenterProductSearch(),
    PrimaryScheme: () => handlePrimarySchemeSearch(),
    CreditOfficer: () => handleCreditOfficerSearch(),
    GroupFormedBy: () => handleGroupFormedBySearch(),
    Ngo: () => handleNgoSearch(),
    GroupLeader1: () => handleGroupLeader1Search(),
    GroupLeader2: () => handleGroupLeader2Search(),
    GroupLeader3: () => handleGroupLeader3Search()
};

function wireLookupButtons() {
    document.querySelectorAll('.btn-lookup[data-lookup]').forEach(btn => {
        if (btn.dataset.lookupWired === 'true') return;

        btn.addEventListener('click', () => {
            const key = btn.getAttribute('data-lookup');
            const handler = LOOKUP_HANDLERS[key];
            if (typeof handler === 'function') {
                handler();
            } else {
                console.warn('[GroupMaintenance] Lookup handler not found:', key);
            }
        });

        btn.dataset.lookupWired = 'true';
    });
}

function canUseSearchDialogs() {
    return isAddMode || isEditMode;
}

function getLocalDateString() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function showCenterCreatedMessage(groupId) {
    const messageContainer = document.getElementById('centerCreatedMessage');
    const messageText = document.getElementById('centerCreatedText');

    if (messageContainer && messageText) {
        messageText.textContent = `Center created successfully, group ID: ${groupId}`;
        messageContainer.hidden = false;
    }
}

function hideCenterCreatedMessage() {
    const messageContainer = document.getElementById('centerCreatedMessage');
    if (messageContainer) {
        messageContainer.hidden = true;
    }
}

function resetFormStateToDefault() {
    isAddMode = false;
    isEditMode = false;
    setEditMode(false);
    clearCenterFields();
    hideCenterCreatedMessage();

    const btnAdd = document.querySelector('.btn-action[onclick*="handleAdd"]');
    const btnEdit = document.querySelector('.btn-action[onclick*="handleEdit"]');
    const btnDelete = document.querySelector('.btn-action[onclick*="handleDelete"]');
    const btnSave = document.querySelector('.btn-action[data-action="save"]');
    const btnPrev = document.querySelector('.btn-action[onclick*="handleNavigatePrevious"]');
    const btnNext = document.querySelector('.btn-action[onclick*="handleNavigateNext"]');

    if (btnAdd) btnAdd.disabled = false;
    if (btnEdit) btnEdit.disabled = true;
    if (btnDelete) btnDelete.disabled = true;
    if (btnSave) btnSave.disabled = true;
    if (btnPrev) btnPrev.disabled = true;
    if (btnNext) btnNext.disabled = true;
}

function clearCenterFields() {
    const fieldsToClear = [
        'centerId', 'centerName', 'centerProductId', 'centerProductName',
        'primarySchemeId', 'primarySchemeName', 'creditOfficer', 'creditOfficerName',
        'registrationNo', 'groupFormedBy', 'groupFormedByName', 'village', 'location', 'centre',
        'ngoId', 'ngoName', 'formationDate', 'firstMeetingDate', 'nextMeetingDate',
        'meetingDay', 'groupClass', 'totalSavingsAcs', 'totalSavingsBalance',
        'totalLoanAcs', 'totalLoanBalance', 'zeroBalance', 'loanCycleType', 'loanCycleNo',
        'savingOsLoan', 'meetingFrequency', 'status', 'statusReason',
        'firstDay', 'nextDay', 'meetingTime', 'meetingPlace',
        'groupLeader1', 'groupLeader1Name', 'groupLeader2', 'groupLeader2Name',
        'groupLeader3', 'groupLeader3Name', 'totalMembers'
    ];

    fieldsToClear.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            element.value = '';
        }
    });

    // Clear audit trail (span elements)
    const auditFields = ['createdBy', 'createdOn', 'modifiedBy', 'modifiedOn', 'supervisedBy', 'supervisedOn'];
    auditFields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            element.textContent = '-';
        }
    });

    // Reset currentCenter
    currentCenter = null;
    window.currentCenter = null;

    // Disable Edit, Delete, Prev, Next buttons when fields are cleared
    const btnEdit = document.querySelector('.btn-action[onclick*="handleEdit"]');
    const btnDelete = document.querySelector('.btn-action[onclick*="handleDelete"]');
    const btnPrev = document.querySelector('.btn-action[onclick*="handleNavigatePrevious"]');
    const btnNext = document.querySelector('.btn-action[onclick*="handleNavigateNext"]');

    if (!isAddMode) {
        if (btnEdit) btnEdit.disabled = true;
        if (btnDelete) btnDelete.disabled = true;
        if (btnPrev) btnPrev.disabled = true;
        if (btnNext) btnNext.disabled = true;
    }

    if (!isAddMode) {
        document.getElementById('centerName')?.setAttribute('readonly', 'readonly');
    }
}

function extractDateForInput(dateString) {
    if (!dateString) return '';

    if (window.GlobalUtils?.parseDateInput) {
        const parsed = window.GlobalUtils.parseDateInput(dateString);
        if (parsed) return parsed;
    }

    try {
        if (dateString.includes('T')) {
            const datePart = dateString.split('T')[0];
            if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
                return datePart;
            }
        }

        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return dateString;
        }

        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        return '';
    } catch (e) {
        return '';
    }
}

function formatDateDisplay(dateString) {
    if (!dateString) return '';

    try {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}`;
        }
        return dateString;
    } catch (e) {
        return dateString;
    }
}

function setDateInputValue(inputEl, dateValue) {
    if (!inputEl || !dateValue) return;

    if (inputEl._flatpickr) {
        try {
            inputEl._flatpickr.setDate(dateValue, true, 'Y-m-d');
        } catch (e) {
            inputEl.value = dateValue;
        }
        return;
    }

    const wasDisabled = inputEl.disabled;
    const wasReadonly = inputEl.readOnly;
    inputEl.disabled = false;
    inputEl.readOnly = false;

    inputEl.value = '';

    if (inputEl.type === 'date') {
        try {
            const [year, month, day] = dateValue.split('-').map(Number);
            const dateObj = new Date(year, month - 1, day);
            inputEl.valueAsDate = dateObj;
            inputEl.value = dateValue;
        } catch (e) {
            inputEl.value = dateValue;
        }
    } else {
        inputEl.value = dateValue;
    }

    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    inputEl.dispatchEvent(new Event('change', { bubbles: true }));

    inputEl.disabled = wasDisabled;
    inputEl.readOnly = wasReadonly;

}

function wireChildFormLinks() {
    document.querySelectorAll('.sidebar-item[data-child-form]').forEach(item => {
        if (item.dataset.childFormWired === 'true') return;

        item.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopImmediatePropagation();

            const centerId = document.getElementById('centerId')?.value?.trim();
            const branchId = document.getElementById('branchId')?.value?.trim();

            if (!centerId || !branchId) {
                showSnackbar('Please load a center first before accessing data entry pages.', 'warning');
                return;
            }

            if (!window.currentCenter) {
                window.currentCenter = { GroupID: centerId, OurBranchID: branchId };
                currentCenter = window.currentCenter;
            }

            const formName = item.dataset.childForm;
            if (typeof window.openChildForm === 'function') {
                window.openChildForm(formName);
            }
        }, true);

        item.dataset.childFormWired = 'true';
    });
}

function setFormSectionCollapsed(section, isCollapsed) {
    if (!section) return;
    const content = section.querySelector('[data-section-content]');
    const toggleBtn = section.querySelector('.section-toggle-btn');
    const icon = toggleBtn?.querySelector('i');

    section.classList.toggle('collapsed', Boolean(isCollapsed));
    if (content) content.hidden = Boolean(isCollapsed);
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
    if (icon) icon.className = isCollapsed ? 'bi bi-chevron-down' : 'bi bi-chevron-up';
}

function wireSectionToggles() {
    document.querySelectorAll('.form-section [data-section-toggle]').forEach(header => {
        if (header.dataset.sectionToggleWired === 'true') return;

        header.addEventListener('click', (event) => {
            if (event.target.closest('button') && !event.target.closest('.section-toggle-btn')) return;

            const section = header.closest('.form-section');
            if (!section) return;
            const shouldCollapse = !section.classList.contains('collapsed');
            setFormSectionCollapsed(section, shouldCollapse);
        });

        header.dataset.sectionToggleWired = 'true';
    });

    document.querySelectorAll('.form-section').forEach(section => {
        const content = section.querySelector('[data-section-content]');
        const toggleBtn = section.querySelector('.section-toggle-btn');
        const isCollapsed = section.classList.contains('collapsed')
            || content?.hidden === true
            || toggleBtn?.getAttribute('aria-expanded') === 'false';
        setFormSectionCollapsed(section, isCollapsed);
    });
}

function setNavSectionOpen(sectionEl, isOpen) {
    if (!sectionEl) return;
    sectionEl.classList.toggle('is-open', Boolean(isOpen));
    sectionEl.classList.toggle('expanded', Boolean(isOpen));

    const toggle = sectionEl.querySelector('.nav-arrow, .nav-arrow--card');
    const items = sectionEl.querySelector('.nav-items, .nav-items--card');

    if (toggle) toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    if (items) {
        items.removeAttribute('hidden');
        const sidebar = document.getElementById('main-sidebar');
        if (sidebar && sidebar.classList.contains('collapsed')) return;

        if (isOpen) {
            items.classList.add('is-visible');
            items.style.pointerEvents = 'auto';
        } else {
            items.classList.remove('is-visible');
            items.style.pointerEvents = 'none';
        }
    }
}

function wireNavSections() {
    const sections = Array.from(document.querySelectorAll('[data-nav-section]'));
    sections.forEach(section => {
        const header = section.querySelector('.nav-header, .nav-header--card');
        const navArrow = section.querySelector('.nav-arrow, .nav-arrow--card');
        if (!header || header.dataset.navSectionWired === 'true') return;

        const toggleSection = (e) => {
            if (e) e.preventDefault();
            if (e && e.target.closest('.nav-badge') && !e.target.closest('.nav-arrow')) return;

            const sidebar = document.getElementById('main-sidebar');
            const mainContainer = document.querySelector('.main-container');
            const toggle = document.getElementById('sidebarToggle');
            const isCollapsed = sidebar && sidebar.classList.contains('collapsed');

            if (isCollapsed) {
                sidebar.classList.remove('collapsed');
                if (mainContainer) mainContainer.classList.remove('sidebar-collapsed');
                if (toggle) toggle.setAttribute('aria-expanded', 'true');
            }

            const willOpen = !section.classList.contains('is-open');
            sections.forEach(s => setNavSectionOpen(s, false));
            setNavSectionOpen(section, willOpen);
        };

        header.addEventListener('click', toggleSection);
        if (navArrow) {
            navArrow.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleSection(e);
            });
        }

        header.dataset.navSectionWired = 'true';
    });

    sections.forEach(section => {
        const initiallyOpen = section.classList.contains('is-open');
        setNavSectionOpen(section, initiallyOpen);
    });
}

function wireSidebarToggle() {
    const sidebar = document.getElementById('main-sidebar');
    const toggle = document.getElementById('sidebarToggle');
    const mainContainer = document.querySelector('.main-container');
    if (!sidebar || !toggle) return;

    toggle.addEventListener('click', function (e) {
        e.stopPropagation();
        e.preventDefault();
        const isCollapsed = sidebar.classList.contains('collapsed');

        if (isCollapsed) {
            sidebar.classList.remove('collapsed');
            if (mainContainer) mainContainer.classList.remove('sidebar-collapsed');
            toggle.setAttribute('aria-expanded', 'true');
            document.querySelectorAll('.nav-section--card').forEach(section => {
                const items = section.querySelector('.nav-items--card');
                if (items) {
                    const isSectionOpen = section.classList.contains('is-open');
                    items.hidden = !isSectionOpen;
                }
            });
        } else {
            sidebar.classList.add('collapsed');
            if (mainContainer) mainContainer.classList.add('sidebar-collapsed');
            toggle.setAttribute('aria-expanded', 'false');
            document.querySelectorAll('.nav-items--card').forEach(items => {
                items.hidden = false;
            });
        }
    });
}

function wireSidebarSearch() {
    const input = document.getElementById('submoduleSearch');
    const clearBtn = document.getElementById('submoduleSearchClear');
    if (!input) return;

    const items = Array.from(document.querySelectorAll('.sidebar-item, .sidebar-item--enhanced'));

    const applyFilter = () => {
        const query = input.value.trim().toLowerCase();
        items.forEach(item => {
            const text = item.textContent ? item.textContent.toLowerCase() : '';
            item.style.display = text.includes(query) ? '' : 'none';
        });
        if (clearBtn) clearBtn.hidden = query.length === 0;
    };

    input.addEventListener('input', applyFilter);

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            input.value = '';
            applyFilter();
            input.focus();
        });
        clearBtn.hidden = true;
    }
}

async function initializeCenterMaintenance() {
    if (window.ServiceLoader?.loadCore) {
        await window.ServiceLoader.loadCore();
    }

    if (!window.LookupService) {
        console.warn('[GroupMaintenance] LookupService not available');
    }

    if (!window.GroupService) {
        console.warn('[GroupMaintenance] GroupService not available');
    }

    await loadGroupClassOptions();

    const branchInput = document.getElementById('branchId');
    const existingBranchId = branchInput?.value?.trim() || '';
    const branchId = existingBranchId || window.Environment?.OurBranchID || window.Environment?.defaultOurBranchId;
    if (branchId && branchInput && !existingBranchId) {
        branchInput.value = branchId;
        await fetchBranchDetails(branchId);
    } else if (existingBranchId) {
        await fetchBranchDetails(existingBranchId);
    }

    setupEventListeners();
    wireLookupButtons();
    wireChildFormLinks();
    wireSectionToggles();
    wireNavSections();
    wireSidebarToggle();
    wireSidebarSearch();

    const maxDate = window.Environment?.workingDate || getLocalDateString();
    const formationDateInput = document.getElementById('formationDate');
    if (formationDateInput) {
        formationDateInput.setAttribute('max', maxDate);
    }
    const firstMeetingDateInput = document.getElementById('firstMeetingDate');
    if (firstMeetingDateInput) {
        firstMeetingDateInput.setAttribute('max', maxDate);
    }
    const nextMeetingDateInput = document.getElementById('nextMeetingDate');
    if (nextMeetingDateInput) {
        nextMeetingDateInput.setAttribute('max', maxDate);
    }
}

async function loadGroupClassOptions() {
    try {
        const requestData = {
            BankID: '00',
            ClasificationType: 'T'
        };

        console.log('[GroupMaintenance] Loading Group Class options...');

        let response = null;
        if (window.GroupService?.getSpConditionClassCombo) {
            response = await window.GroupService.getSpConditionClassCombo(requestData);
        } else {
            response = await callMicroFinanceOldApi('dbo.p_GetSpConditionCalssCombo', requestData);
        }

        const rows = unwrapOldApiRows(response?.data ?? response);
        if (rows.length > 0) {
            populateGroupClassDropdown(rows);
            console.log('[GroupMaintenance] Group Class options loaded');
        } else {
            console.warn('[GroupMaintenance] No Group Class options returned');
        }
    } catch (error) {
        console.error('[GroupMaintenance] Error loading Group Class options:', error);
    }
}

function populateGroupClassDropdown(options) {
    const select = document.getElementById('groupClass');
    if (!select) {
        console.warn('[GroupMaintenance] groupClass select not found');
        return;
    }

    while (select.options.length > 1) {
        select.remove(1);
    }

    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.SubCodeID || opt.subcodeid || opt.ClassID || opt.ID || opt.value || '';
        option.textContent = opt.Description || opt.description || opt.ClassDesc || opt.Name || opt.label || option.value;
        select.appendChild(option);
    });

    console.log('[GroupMaintenance] Group Class dropdown populated with', options.length, 'options');
}

function setupEventListeners() {
    document.getElementById('centerId').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (!isAddMode && !isEditMode) {
                handleView();
            }
        }
    });

    document.getElementById('centerId').addEventListener('change', () => {
        const centerId = document.getElementById('centerId').value.trim();
        const branchId = document.getElementById('branchId').value.trim();
        if (centerId && branchId && !isAddMode && !isEditMode) {
            handleView();
        }
    });

    document.getElementById('branchId').addEventListener('change', async () => {
        const centerId = document.getElementById('centerId').value.trim();
        const branchId = document.getElementById('branchId').value.trim();

        if (branchId) {
            await fetchBranchDetails(branchId);
        }

        if (centerId && branchId && !isAddMode && !isEditMode) {
            handleView();
        }
    });

    document.getElementById('meetingTime').addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });

    document.getElementById('branchId').addEventListener('blur', async (e) => {
        const branchId = e.target.value.trim();
        if (branchId) {
            await fetchBranchDetails(branchId);
        }
    });

    document.getElementById('centerProductId').addEventListener('blur', async (e) => {
        const productId = e.target.value.trim();
        if (productId) {
            await fetchGroupProductDetails(productId);
        }
    });

    document.getElementById('primarySchemeId').addEventListener('blur', async (e) => {
        const schemeId = e.target.value.trim();
        if (schemeId && window.LookupService) {
            await fetchSchemeDetails(schemeId);
        }
    });

    document.getElementById('creditOfficer').addEventListener('blur', async (e) => {
        const officerId = e.target.value.trim();
        if (officerId && window.LookupService) {
            await fetchOfficerDetails(officerId, 'creditOfficer');
        }
    });

    document.getElementById('groupFormedBy').addEventListener('blur', async (e) => {
        const officerId = e.target.value.trim();
        if (officerId && window.LookupService) {
            await fetchOfficerDetails(officerId, 'groupFormedBy');
        }
    });

    document.getElementById('ngoId').addEventListener('blur', async (e) => {
        const ngoId = e.target.value.trim();
        if (ngoId && window.LookupService) {
            await fetchNgoDetails(ngoId);
        }
    });

    // Status change handler - enable/disable reason field
    document.getElementById('status').addEventListener('change', handleStatusChange);

    // Meeting frequency change handler
    document.getElementById('meetingFrequency').addEventListener('change', handleMeetingFrequencyChange);

    // Meeting day change handler
    document.getElementById('meetingDay').addEventListener('change', handleMeetingDayChange);

    // First meeting date change handler
    document.getElementById('firstMeetingDate').addEventListener('change', calculateMeetingDates);

    // First day and next day change handlers for bimonthly/monthly calculations
    document.getElementById('firstDay').addEventListener('change', calculateMeetingDates);
    document.getElementById('nextDay').addEventListener('change', calculateMeetingDates);

    // Status reason character limit
    document.getElementById('statusReason')?.addEventListener('keypress', handleReasonLength);
    document.getElementById('statusReason')?.addEventListener('paste', handleReasonLength);

    // Center ID uppercase conversion
    document.getElementById('centerId').addEventListener('keypress', convertToUppercase);

    // Meeting time validation on blur
    document.getElementById('meetingTime').addEventListener('blur', validateMeetingTime);

    // Group Leader blur events (if fields exist)
    const groupLeader1 = document.getElementById('groupLeader1');
    const groupLeader2 = document.getElementById('groupLeader2');
    const groupLeader3 = document.getElementById('groupLeader3');

    if (groupLeader1) {
        groupLeader1.addEventListener('blur', async (e) => {
            const clientId = e.target.value.trim();
            if (clientId && window.LookupService) {
                await fetchGroupLeaderDetails(clientId, 1);
            }
        });
    }

    if (groupLeader2) {
        groupLeader2.addEventListener('blur', async (e) => {
            const clientId = e.target.value.trim();
            if (clientId && window.LookupService) {
                await fetchGroupLeaderDetails(clientId, 2);
            }
        });
    }

    if (groupLeader3) {
        groupLeader3.addEventListener('blur', async (e) => {
            const clientId = e.target.value.trim();
            if (clientId && window.LookupService) {
                await fetchGroupLeaderDetails(clientId, 3);
            }
        });
    }

}

// ---------------------------------------------------------------------------
// BUSINESS LOGIC IMPLEMENTATIONS (from legacy system)
// ---------------------------------------------------------------------------

/**
 * Validates meeting time format (HH.MM where HH: 0-23, MM: 0-59)
 * Legacy: fnTimeZoneDiff
 */
function validateMeetingTime() {
    const meetingTimeInput = document.getElementById('meetingTime');
    if (!meetingTimeInput) return true;

    const timeValue = meetingTimeInput.value.trim();
    if (!timeValue) return true;

    // Parse time in format HHMM or HH.MM
    let hours, minutes;
    
    if (timeValue.includes('.')) {
        const parts = timeValue.split('.');
        hours = parseInt(parts[0], 10);
        minutes = parseInt(parts[1], 10);
    } else if (timeValue.length === 4) {
        hours = parseInt(timeValue.substring(0, 2), 10);
        minutes = parseInt(timeValue.substring(2, 4), 10);
    } else if (timeValue.length === 3) {
        hours = parseInt(timeValue.substring(0, 1), 10);
        minutes = parseInt(timeValue.substring(1, 3), 10);
    } else {
        hours = parseInt(timeValue, 10);
        minutes = 0;
    }

    if (isNaN(hours) || isNaN(minutes)) {
        showSnackbar('Invalid meeting time format. Use HH.MM (e.g., 09.30)', 'error');
        meetingTimeInput.focus();
        return false;
    }

    if (hours < 0 || hours > 23) {
        showSnackbar('Hours must be between 0 and 23', 'error');
        meetingTimeInput.focus();
        return false;
    }

    if (minutes < 0 || minutes > 59) {
        showSnackbar('Minutes must be between 0 and 59', 'error');
        meetingTimeInput.focus();
        return false;
    }

    // Format the time correctly
    const formattedTime = `${String(hours).padStart(2, '0')}.${String(minutes).padStart(2, '0')}`;
    meetingTimeInput.value = formattedTime;

    return true;
}

/**
 * Handles status change - enables/disables reason field
 * Legacy: fnStatusChange
 */
function handleStatusChange() {
    const statusInput = document.getElementById('status');
    const reasonInput = document.getElementById('statusReason');
    
    if (!statusInput || !reasonInput || !currentCenter) return;

    const originalStatus = currentCenter.GroupStatusID || 'A';
    const newStatus = statusInput.value;

    if (originalStatus !== newStatus) {
        // Status changed - enable reason field
        reasonInput.removeAttribute('readonly');
        reasonInput.disabled = false;
        reasonInput.required = true;
    } else {
        // Status unchanged - disable reason field
        reasonInput.setAttribute('readonly', 'readonly');
        reasonInput.disabled = true;
        reasonInput.required = false;
        reasonInput.value = '';
    }
}

/**
 * Limits reason field to 255 characters
 * Legacy: fnChkReasonLength
 */
function handleReasonLength(event) {
    const reasonInput = document.getElementById('statusReason');
    if (!reasonInput) return;

    const currentLength = reasonInput.value.length;
    
    if (event.type === 'keypress') {
        if (currentLength >= 255 && event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            showSnackbar('Reason cannot exceed 255 characters', 'warning');
            return false;
        }
    } else if (event.type === 'paste') {
        setTimeout(() => {
            if (reasonInput.value.length > 255) {
                reasonInput.value = reasonInput.value.substring(0, 255);
                showSnackbar('Reason truncated to 255 characters', 'warning');
            }
        }, 0);
    }
}

/**
 * Converts input to uppercase (for Center ID)
 * Legacy: txtGroupID_KeyPress
 */
function convertToUppercase(event) {
    if (event.key && event.key.length === 1) {
        event.preventDefault();
        const input = event.target;
        const char = event.key.toUpperCase();
        
        // Only allow alphanumeric
        if (/[A-Z0-9]/.test(char)) {
            const start = input.selectionStart;
            const end = input.selectionEnd;
            const currentValue = input.value;
            input.value = currentValue.substring(0, start) + char + currentValue.substring(end);
            input.selectionStart = input.selectionEnd = start + 1;
        }
    }
}

/**
 * Handles meeting frequency change
 * Legacy: fnOnChangeMeeting
 */
function handleMeetingFrequencyChange() {
    const frequencyInput = document.getElementById('meetingFrequency');
    const meetingDayInput = document.getElementById('meetingDay');
    const firstDayInput = document.getElementById('firstDay');
    const nextDayInput = document.getElementById('nextDay');
    
    if (!frequencyInput) return;

    const frequency = frequencyInput.value?.toUpperCase();

    // Enable/disable fields based on frequency
    if (frequency === 'W') {
        // Weekly - only meeting day
        meetingDayInput?.removeAttribute('readonly');
        meetingDayInput?.removeAttribute('disabled');
        firstDayInput?.setAttribute('readonly', 'readonly');
        nextDayInput?.setAttribute('readonly', 'readonly');
        firstDayInput.value = '';
        nextDayInput.value = '';
    } else if (frequency === 'M' || frequency === 'B') {
        // Monthly or Bimonthly - first day and next day
        meetingDayInput?.setAttribute('readonly', 'readonly');
        firstDayInput?.removeAttribute('readonly');
        firstDayInput?.removeAttribute('disabled');
        nextDayInput?.removeAttribute('readonly');
        nextDayInput?.removeAttribute('disabled');
    } else {
        // Enable all
        meetingDayInput?.removeAttribute('readonly');
        meetingDayInput?.removeAttribute('disabled');
        firstDayInput?.removeAttribute('readonly');
        firstDayInput?.removeAttribute('disabled');
        nextDayInput?.removeAttribute('readonly');
        nextDayInput?.removeAttribute('disabled');
    }

    calculateMeetingDates();
}

/**
 * Handles meeting day change
 * Legacy: fnOnChangeMeetingDay
 */
function handleMeetingDayChange() {
    calculateMeetingDates();
}

/**
 * Calculates next meeting date based on frequency and first meeting date
 * Legacy: fnCommon, fnCalNextMeetingDate, fnCalBimonthlyDate
 */
function calculateMeetingDates() {
    const firstMeetingDateInput = document.getElementById('firstMeetingDate');
    const nextMeetingDateInput = document.getElementById('nextMeetingDate');
    const frequencyInput = document.getElementById('meetingFrequency');
    const meetingDayInput = document.getElementById('meetingDay');
    const firstDayInput = document.getElementById('firstDay');
    const nextDayInput = document.getElementById('nextDay');

    if (!firstMeetingDateInput || !nextMeetingDateInput || !frequencyInput) return;

    const firstMeetingDate = firstMeetingDateInput.value;
    if (!firstMeetingDate) return;

    const frequency = frequencyInput.value?.toUpperCase();
    const meetingDay = meetingDayInput?.value;
    const firstDay = parseInt(firstDayInput?.value, 10);
    const nextDay = parseInt(nextDayInput?.value, 10);

    let nextMeetingDate = null;

    try {
        const firstDate = new Date(firstMeetingDate);

        if (frequency === 'W') {
            // Weekly - add 7 days
            nextMeetingDate = new Date(firstDate);
            nextMeetingDate.setDate(firstDate.getDate() + 7);
        } else if (frequency === 'B' || frequency === 'F') {
            // Biweekly/Fortnightly - add 14 days
            nextMeetingDate = new Date(firstDate);
            nextMeetingDate.setDate(firstDate.getDate() + 14);
        } else if (frequency === 'M') {
            // Monthly - calculate based on first day and next day
            if (!isNaN(firstDay) && !isNaN(nextDay)) {
                const currentDay = firstDate.getDate();
                nextMeetingDate = new Date(firstDate);

                if (currentDay === firstDay) {
                    // Next meeting is on nextDay of same month if nextDay > firstDay
                    if (nextDay > firstDay) {
                        nextMeetingDate.setDate(nextDay);
                    } else {
                        // Next meeting is on nextDay of next month
                        nextMeetingDate.setMonth(firstDate.getMonth() + 1);
                        nextMeetingDate.setDate(nextDay);
                    }
                } else if (currentDay === nextDay) {
                    // Next meeting is on firstDay of next month
                    nextMeetingDate.setMonth(firstDate.getMonth() + 1);
                    nextMeetingDate.setDate(firstDay);
                } else {
                    // Find next occurrence
                    if (currentDay < firstDay) {
                        nextMeetingDate.setDate(firstDay);
                    } else if (currentDay < nextDay) {
                        nextMeetingDate.setDate(nextDay);
                    } else {
                        nextMeetingDate.setMonth(firstDate.getMonth() + 1);
                        nextMeetingDate.setDate(firstDay);
                    }
                }
            }
        } else if (frequency === 'BM') {
            // Bimonthly - add 2 months
            if (!isNaN(firstDay) && !isNaN(nextDay)) {
                nextMeetingDate = new Date(firstDate);
                const currentDay = firstDate.getDate();

                if (currentDay === firstDay) {
                    if (nextDay > firstDay) {
                        nextMeetingDate.setDate(nextDay);
                    } else {
                        nextMeetingDate.setMonth(firstDate.getMonth() + 2);
                        nextMeetingDate.setDate(nextDay);
                    }
                } else if (currentDay === nextDay) {
                    nextMeetingDate.setMonth(firstDate.getMonth() + 2);
                    nextMeetingDate.setDate(firstDay);
                } else {
                    nextMeetingDate.setMonth(firstDate.getMonth() + 2);
                    nextMeetingDate.setDate(firstDay);
                }
            }
        } else if (frequency === 'D') {
            // Daily - add 1 day
            nextMeetingDate = new Date(firstDate);
            nextMeetingDate.setDate(firstDate.getDate() + 1);
        }

        // Set the calculated next meeting date
        if (nextMeetingDate) {
            const year = nextMeetingDate.getFullYear();
            const month = String(nextMeetingDate.getMonth() + 1).padStart(2, '0');
            const day = String(nextMeetingDate.getDate()).padStart(2, '0');
            const formattedDate = `${year}-${month}-${day}`;
            
            setDateInputValue(nextMeetingDateInput, formattedDate);
        }
    } catch (error) {
        console.error('[GroupMaintenance] Error calculating next meeting date:', error);
    }
}

/**
 * Fetch Group Product details and populate related fields
 * Legacy: GroupProductClass_CallBack
 */
async function fetchGroupProductDetails(productId) {
    try {
        if (!window.LookupService) {
            console.warn('[GroupMaintenance] LookupService not available');
            return;
        }

        console.log('[GroupMaintenance] Fetching product details for:', productId);
        
        // Call the lookup service to get product details
        const requestData = {
            BankID: '00',
            GroupProductID: productId
        };

        let response = null;
        if (window.LookupService.getGroupProductDetails) {
            response = await window.LookupService.getGroupProductDetails(requestData);
        } else {
            response = await callMicroFinanceOldApi('dbo.p_GetGroupProductDetails', requestData);
        }

        const rows = unwrapOldApiRows(response?.data ?? response);
        
        if (rows.length > 0) {
            const product = rows[0];
            document.getElementById('centerProductName').value = product.GroupProductName 
                || product.ProductName 
                || product.Description 
                || '';

            // Populate primary scheme if available
            if (product.DefaultLoanSchemeID) {
                document.getElementById('primarySchemeId').value = product.DefaultLoanSchemeID;
                document.getElementById('primarySchemeName').value = product.DefaultLoanScheme 
                    || product.DefaultSchemeName 
                    || '';
            }
        } else {
            document.getElementById('centerProductName').value = '';
            showSnackbar('Product not found', 'warning');
        }
    } catch (error) {
        console.error('[GroupMaintenance] Error fetching product details:', error);
        document.getElementById('centerProductName').value = '';
        showSnackbar('Error fetching product details', 'error');
    }
}

/**
 * Fetch Scheme details
 */
async function fetchSchemeDetails(schemeId) {
    try {
        if (!window.LookupService) {
            console.warn('[GroupMaintenance] LookupService not available');
            return;
        }

        console.log('[GroupMaintenance] Fetching scheme details for:', schemeId);
        
        const requestData = {
            BankID: '00',
            LoanSchemeID: schemeId
        };

        let response = null;
        if (window.LookupService.getSchemeDetails) {
            response = await window.LookupService.getSchemeDetails(requestData);
        } else {
            response = await callMicroFinanceOldApi('dbo.p_GetSchemeDetails', requestData);
        }

        const rows = unwrapOldApiRows(response?.data ?? response);
        
        if (rows.length > 0) {
            const scheme = rows[0];
            document.getElementById('primarySchemeName').value = scheme.Description 
                || scheme.LoanSchemeName 
                || scheme.Name 
                || '';
        } else {
            document.getElementById('primarySchemeName').value = '';
            showSnackbar('Scheme not found', 'warning');
        }
    } catch (error) {
        console.error('[GroupMaintenance] Error fetching scheme details:', error);
        document.getElementById('primarySchemeName').value = '';
        showSnackbar('Error fetching scheme details', 'error');
    }
}

/**
 * Fetch Officer details (Credit Officer or Group Formed By)
 */
async function fetchOfficerDetails(officerId, fieldType) {
    try {
        if (!window.LookupService) {
            console.warn('[GroupMaintenance] LookupService not available');
            return;
        }

        console.log('[GroupMaintenance] Fetching officer details for:', officerId, fieldType);
        
        const branchId = document.getElementById('branchId')?.value?.trim() || '';
        const requestData = {
            BankID: '00',
            OfficerID: officerId,
            BranchID: branchId
        };

        let response = null;
        if (window.LookupService.getOfficerDetails) {
            response = await window.LookupService.getOfficerDetails(requestData);
        } else {
            response = await callMicroFinanceOldApi('dbo.p_GetOfficerDetails', requestData);
        }

        const rows = unwrapOldApiRows(response?.data ?? response);
        
        if (rows.length > 0) {
            const officer = rows[0];
            const officerName = officer.Name || officer.OfficerName || officer.Description || '';
            
            if (fieldType === 'creditOfficer') {
                document.getElementById('creditOfficerName').value = officerName;
            } else if (fieldType === 'groupFormedBy') {
                document.getElementById('groupFormedByName').value = officerName;
            }
        } else {
            if (fieldType === 'creditOfficer') {
                document.getElementById('creditOfficerName').value = '';
            } else if (fieldType === 'groupFormedBy') {
                document.getElementById('groupFormedByName').value = '';
            }
            showSnackbar('Officer not found', 'warning');
        }
    } catch (error) {
        console.error('[GroupMaintenance] Error fetching officer details:', error);
        if (fieldType === 'creditOfficer') {
            document.getElementById('creditOfficerName').value = '';
        } else if (fieldType === 'groupFormedBy') {
            document.getElementById('groupFormedByName').value = '';
        }
        showSnackbar('Error fetching officer details', 'error');
    }
}

/**
 * Fetch NGO details
 */
async function fetchNgoDetails(ngoId) {
    try {
        if (!window.LookupService) {
            console.warn('[GroupMaintenance] LookupService not available');
            return;
        }

        console.log('[GroupMaintenance] Fetching NGO details for:', ngoId);
        
        const branchId = document.getElementById('branchId')?.value?.trim() || '';
        const requestData = {
            BankID: '00',
            NGOID: ngoId,
            BranchID: branchId
        };

        let response = null;
        if (window.LookupService.getNgoDetails) {
            response = await window.LookupService.getNgoDetails(requestData);
        } else {
            response = await callMicroFinanceOldApi('dbo.p_GetNGODetails', requestData);
        }

        const rows = unwrapOldApiRows(response?.data ?? response);
        
        if (rows.length > 0) {
            const ngo = rows[0];
            document.getElementById('ngoName').value = ngo.NGOName || ngo.Name || ngo.Description || '';
        } else {
            document.getElementById('ngoName').value = '';
            showSnackbar('NGO not found', 'warning');
        }
    } catch (error) {
        console.error('[GroupMaintenance] Error fetching NGO details:', error);
        document.getElementById('ngoName').value = '';
        showSnackbar('Error fetching NGO details', 'error');
    }
}

/**
 * Enhanced validation before save
 * Legacy: fnIsValid
 */
function validateBeforeSave() {
    const branchId = document.getElementById('branchId')?.value?.trim();
    const centerName = document.getElementById('centerName')?.value?.trim();
    const centerProductId = document.getElementById('centerProductId')?.value?.trim();
    const primarySchemeId = document.getElementById('primarySchemeId')?.value?.trim();
    const creditOfficer = document.getElementById('creditOfficer')?.value?.trim();
    const groupFormedBy = document.getElementById('groupFormedBy')?.value?.trim();
    const formationDate = document.getElementById('formationDate')?.value;
    const firstMeetingDate = document.getElementById('firstMeetingDate')?.value;
    const groupClass = document.getElementById('groupClass')?.value;
    const meetingDay = document.getElementById('meetingDay')?.value;
    const meetingTime = document.getElementById('meetingTime')?.value?.trim();
    const frequencyInput = document.getElementById('meetingFrequency');
    const nextMeetingDate = document.getElementById('nextMeetingDate')?.value;
    const firstDay = document.getElementById('firstDay')?.value?.trim();
    const nextDay = document.getElementById('nextDay')?.value?.trim();

    // Basic required field validations
    if (!branchId) {
        showSnackbar('Branch ID is required', 'error');
        document.getElementById('branchId')?.focus();
        return false;
    }

    if (!centerName) {
        showSnackbar('Center Name is required', 'error');
        document.getElementById('centerName')?.focus();
        return false;
    }

    if (!centerProductId) {
        showSnackbar('Center Product is required', 'error');
        document.getElementById('centerProductId')?.focus();
        return false;
    }

    if (!primarySchemeId) {
        showSnackbar('Primary Scheme is required', 'error');
        document.getElementById('primarySchemeId')?.focus();
        return false;
    }

    if (!creditOfficer) {
        showSnackbar('Credit Officer is required', 'error');
        document.getElementById('creditOfficer')?.focus();
        return false;
    }

    if (!groupFormedBy) {
        showSnackbar('Group Formed By is required', 'error');
        document.getElementById('groupFormedBy')?.focus();
        return false;
    }

    if (!formationDate) {
        showSnackbar('Formation Date is required', 'error');
        document.getElementById('formationDate')?.focus();
        return false;
    }

    // Validate formation date is not in future
    const formDate = new Date(formationDate);
    const workingDate = new Date(window.Environment?.workingDate || getLocalDateString());
    if (formDate > workingDate) {
        showSnackbar('Formation Date cannot be in the future', 'error');
        document.getElementById('formationDate')?.focus();
        return false;
    }

    if (!firstMeetingDate) {
        showSnackbar('First Meeting Date is required', 'error');
        document.getElementById('firstMeetingDate')?.focus();
        return false;
    }

    // Validate first meeting date is after or equal to formation date
    const firstMeetDate = new Date(firstMeetingDate);
    if (firstMeetDate < formDate) {
        showSnackbar('First Meeting Date cannot be before Formation Date', 'error');
        document.getElementById('firstMeetingDate')?.focus();
        return false;
    }

    if (!groupClass) {
        showSnackbar('Group Class is required', 'error');
        document.getElementById('groupClass')?.focus();
        return false;
    }

    if (!meetingTime) {
        showSnackbar('Meeting Time is required', 'error');
        document.getElementById('meetingTime')?.focus();
        return false;
    }

    // Validate meeting time format
    if (!validateMeetingTime()) {
        return false;
    }

    // Frequency-specific validations
    const frequency = frequencyInput?.value?.toUpperCase();
    
    if (frequency === 'W') {
        // Weekly - meeting day required
        if (!meetingDay) {
            showSnackbar('Meeting Day is required for weekly frequency', 'error');
            document.getElementById('meetingDay')?.focus();
            return false;
        }
    } else if (frequency === 'M' || frequency === 'BM') {
        // Monthly/Bimonthly - first day and next day required
        if (!firstDay) {
            showSnackbar('First Day is required for monthly/bimonthly frequency', 'error');
            document.getElementById('firstDay')?.focus();
            return false;
        }

        if (!nextDay) {
            showSnackbar('Next Day is required for monthly/bimonthly frequency', 'error');
            document.getElementById('nextDay')?.focus();
            return false;
        }

        const firstDayNum = parseInt(firstDay, 10);
        const nextDayNum = parseInt(nextDay, 10);

        if (firstDayNum < 1 || firstDayNum > 31) {
            showSnackbar('First Day must be between 1 and 31', 'error');
            document.getElementById('firstDay')?.focus();
            return false;
        }

        if (nextDayNum < 1 || nextDayNum > 31) {
            showSnackbar('Next Day must be between 1 and 31', 'error');
            document.getElementById('nextDay')?.focus();
            return false;
        }

        if (firstDayNum === nextDayNum) {
            showSnackbar('First Day and Next Day cannot be the same', 'error');
            document.getElementById('nextDay')?.focus();
            return false;
        }
    }

    // Validate next meeting date
    if (nextMeetingDate) {
        const nextMeetDate = new Date(nextMeetingDate);
        if (nextMeetDate <= firstMeetDate) {
            showSnackbar('Next Meeting Date must be after First Meeting Date', 'error');
            document.getElementById('nextMeetingDate')?.focus();
            return false;
        }
    }

    // Status change reason validation
    if (currentCenter && !isAddMode) {
        const originalStatus = currentCenter.GroupStatusID || 'A';
        const newStatus = document.getElementById('status')?.value;
        const reason = document.getElementById('statusReason')?.value?.trim();

        if (originalStatus !== newStatus && !reason) {
            showSnackbar('Reason is required when changing status', 'error');
            document.getElementById('statusReason')?.focus();
            return false;
        }
    }

    // Validate group leaders
    if (!validateGroupLeaders()) {
        return false;
    }

    return true;
}

/**
 * Group Leader Search Handlers
 * Legacy: txtGroupLeader1_KeyDown, txtGroupLeader2_KeyDown, txtGroupLeader3_KeyDown
 */
function handleGroupLeader1Search() {
    const centerId = document.getElementById('centerId')?.value?.trim();
    const branchId = document.getElementById('branchId')?.value?.trim();

    if (!centerId || !branchId) {
        showSnackbar('Please load a center first before selecting group leaders', 'warning');
        return;
    }

    runLookupSearch({
        requireEditMode: true,
        editModeMessage: 'Group Leader search is only available in Add or Edit mode.',
        requireBranch: true,
        buildConfig: (brId) => ({
            tableID: 'GroupClientID',
            advFilterString: `OurBranchID='${brId}' AND GroupID='${centerId}' AND ClientStatusID='A'`
        }),
        onSelect: (row) => {
            const clientId = String(getFieldValue(row, 'ClientID', 'ID')).trim();
            const clientName = String(getFieldValue(row, 'ClientName', 'Name', 'Description')).trim();
            if (!clientId) return;

            // Check if already selected as another leader
            const leader2 = document.getElementById('groupLeader2')?.value?.trim();
            const leader3 = document.getElementById('groupLeader3')?.value?.trim();

            if (clientId === leader2 || clientId === leader3) {
                showSnackbar('This client is already selected as another group leader', 'error');
                return;
            }

            document.getElementById('groupLeader1').value = clientId;
            document.getElementById('groupLeader1Name').value = clientName;
        }
    });
}

function handleGroupLeader2Search() {
    const centerId = document.getElementById('centerId')?.value?.trim();
    const branchId = document.getElementById('branchId')?.value?.trim();

    if (!centerId || !branchId) {
        showSnackbar('Please load a center first before selecting group leaders', 'warning');
        return;
    }

    runLookupSearch({
        requireEditMode: true,
        editModeMessage: 'Group Leader search is only available in Add or Edit mode.',
        requireBranch: true,
        buildConfig: (brId) => ({
            tableID: 'GroupClientID',
            advFilterString: `OurBranchID='${brId}' AND GroupID='${centerId}' AND ClientStatusID='A'`
        }),
        onSelect: (row) => {
            const clientId = String(getFieldValue(row, 'ClientID', 'ID')).trim();
            const clientName = String(getFieldValue(row, 'ClientName', 'Name', 'Description')).trim();
            if (!clientId) return;

            // Check if already selected as another leader
            const leader1 = document.getElementById('groupLeader1')?.value?.trim();
            const leader3 = document.getElementById('groupLeader3')?.value?.trim();

            if (clientId === leader1 || clientId === leader3) {
                showSnackbar('This client is already selected as another group leader', 'error');
                return;
            }

            document.getElementById('groupLeader2').value = clientId;
            document.getElementById('groupLeader2Name').value = clientName;
        }
    });
}

function handleGroupLeader3Search() {
    const centerId = document.getElementById('centerId')?.value?.trim();
    const branchId = document.getElementById('branchId')?.value?.trim();

    if (!centerId || !branchId) {
        showSnackbar('Please load a center first before selecting group leaders', 'warning');
        return;
    }

    runLookupSearch({
        requireEditMode: true,
        editModeMessage: 'Group Leader search is only available in Add or Edit mode.',
        requireBranch: true,
        buildConfig: (brId) => ({
            tableID: 'GroupClientID',
            advFilterString: `OurBranchID='${brId}' AND GroupID='${centerId}' AND ClientStatusID='A'`
        }),
        onSelect: (row) => {
            const clientId = String(getFieldValue(row, 'ClientID', 'ID')).trim();
            const clientName = String(getFieldValue(row, 'ClientName', 'Name', 'Description')).trim();
            if (!clientId) return;

            // Check if already selected as another leader
            const leader1 = document.getElementById('groupLeader1')?.value?.trim();
            const leader2 = document.getElementById('groupLeader2')?.value?.trim();

            if (clientId === leader1 || clientId === leader2) {
                showSnackbar('This client is already selected as another group leader', 'error');
                return;
            }

            document.getElementById('groupLeader3').value = clientId;
            document.getElementById('groupLeader3Name').value = clientName;
        }
    });
}

/**
 * Fetch Group Leader details by Client ID
 * Legacy: txtGroupLeader1_GetDescription, txtGroupLeader2_GetDescription, txtGroupLeader3_GetDescription
 */
async function fetchGroupLeaderDetails(clientId, leaderNumber) {
    try {
        if (!clientId) return;

        const centerId = document.getElementById('centerId')?.value?.trim();
        const branchId = document.getElementById('branchId')?.value?.trim();

        if (!centerId || !branchId) {
            return;
        }

        if (!window.LookupService) {
            console.warn('[GroupMaintenance] LookupService not available');
            return;
        }

        console.log('[GroupMaintenance] Fetching group leader details for:', clientId);
        
        const requestData = {
            BankID: '00',
            ClientID: clientId,
            GroupID: centerId,
            OurBranchID: branchId
        };

        let response = null;
        if (window.LookupService.getGroupClientDetails) {
            response = await window.LookupService.getGroupClientDetails(requestData);
        } else {
            response = await callMicroFinanceOldApi('dbo.p_GetGroupClientDetails', requestData);
        }

        const rows = unwrapOldApiRows(response?.data ?? response);
        
        if (rows.length > 0) {
            const client = rows[0];
            const clientName = client.ClientName || client.Name || client.Description || '';
            
            // Check if client status is active
            const clientStatus = client.ClientStatusID || client.StatusID || '';
            if (clientStatus !== 'A') {
                showSnackbar('Selected client is not active', 'warning');
                document.getElementById(`groupLeader${leaderNumber}`).value = '';
                document.getElementById(`groupLeader${leaderNumber}Name`).value = '';
                return;
            }

            // Check if already selected as another leader
            const otherLeaders = [1, 2, 3]
                .filter(n => n !== leaderNumber)
                .map(n => document.getElementById(`groupLeader${n}`)?.value?.trim())
                .filter(Boolean);

            if (otherLeaders.includes(clientId)) {
                showSnackbar('This client is already selected as another group leader', 'error');
                document.getElementById(`groupLeader${leaderNumber}`).value = '';
                document.getElementById(`groupLeader${leaderNumber}Name`).value = '';
                return;
            }

            document.getElementById(`groupLeader${leaderNumber}Name`).value = clientName;
        } else {
            document.getElementById(`groupLeader${leaderNumber}Name`).value = '';
            showSnackbar('Group member not found', 'warning');
        }
    } catch (error) {
        console.error('[GroupMaintenance] Error fetching group leader details:', error);
        document.getElementById(`groupLeader${leaderNumber}Name`).value = '';
        showSnackbar('Error fetching group leader details', 'error');
    }
}

/**
 * Enhanced validation for group leaders before save
 */
function validateGroupLeaders() {
    const leader1 = document.getElementById('groupLeader1')?.value?.trim();
    const leader2 = document.getElementById('groupLeader2')?.value?.trim();
    const leader3 = document.getElementById('groupLeader3')?.value?.trim();

    const leaders = [leader1, leader2, leader3].filter(Boolean);
    
    // Check for duplicates
    const uniqueLeaders = [...new Set(leaders)];
    if (leaders.length !== uniqueLeaders.length) {
        showSnackbar('Group leaders must be unique', 'error');
        return false;
    }

    return true;
}

async function handleBranchSearch() {
    const applyBranchSelection = async (rowLike) => {
        const branchId = String(getFieldValue(rowLike, 'OurBranchID', 'BranchID', 'ID', 'branchId')).trim();
        const branchName = String(getFieldValue(rowLike, 'BranchName', 'Name', 'Description', 'branchName')).trim();
        if (!branchId) return;

        document.getElementById('branchId').value = branchId;
        document.getElementById('branchName').value = branchName;

        const wasInAddMode = isAddMode;
        clearCenterFields();
        if (wasInAddMode) {
            isAddMode = true;
            setEditMode(true);
        }

        if (!branchName) {
            await fetchBranchDetails(branchId);
        }
    };

    const fallbackBranchSearch = () => {
        if (window.BranchSearchService && typeof window.BranchSearchService.openSearchModal === 'function') {
            window.BranchSearchService.openSearchModal((branchId, branchName) => {
                applyBranchSelection({ branchId, branchName });
            });
            return true;
        }
        return false;
    };

    const appCore = getAppCore();
    if (!window.SearchModal || !appCore) {
        if (!fallbackBranchSearch()) {
            showSnackbar('Search modal is not available.', 'error');
        }
        return;
    }

    const currentBranchId = document.getElementById('branchId')?.value?.trim() || '';
    const currentBranchName = document.getElementById('branchName')?.value?.trim() || '';

    let initialSearchKey = '';
    if (currentBranchId) {
        initialSearchKey += `OurBranchID LIKE '%${currentBranchId}%'`;
    }
    if (currentBranchName) {
        if (initialSearchKey) initialSearchKey += ' AND ';
        initialSearchKey += `BranchName LIKE '%${currentBranchName}%'`;
    }

    const candidateTableIds = resolvedBranchSearchTableId
        ? [resolvedBranchSearchTableId]
        : ['t_SystemBranchSetting', 'OurBranchID', 'BranchID'];

    for (const tableID of candidateTableIds) {
        try {
            const searchModal = new window.SearchModal(appCore);
            await searchModal.open({
                tableID,
                moduleID: 5060,
                whereStmt: '',
                advFilterString: "BankID='00'",
                searchKey: initialSearchKey,
                onSelect: (row) => applyBranchSelection(row)
            });

            resolvedBranchSearchTableId = tableID;
            return;
        } catch (err) {
            const msg = String(err?.message || '').toLowerCase();
            if (!msg.includes('not found')) {
                console.error('[GroupMaintenance] Branch search modal error:', err);
                break;
            }
        }
    }

    if (!fallbackBranchSearch()) {
        showSnackbar('Branch search configuration was not found.', 'error');
    }
}

function runLookupSearch(options) {
    if (!options) return;

    if (options.requireEditMode && !canUseSearchDialogs()) {
        showSnackbar(options.editModeMessage || 'Search is only available in Add or Edit mode.', 'warning');
        return;
    }

    const branchId = document.getElementById('branchId')?.value?.trim() || '';
    if (options.requireBranch && !branchId) {
        showSnackbar('Please select a branch first', 'warning');
        return;
    }

    const config = options.buildConfig(branchId);
    openLookupSearch(config, options.onSelect);
}

function handleCenterSearch() {
    if (isAddMode) {
        showSnackbar('Center ID is auto-generated during Add mode.', 'info');
        return;
    }

    runLookupSearch({
        requireEditMode: false,
        requireBranch: true,
        buildConfig: (branchId) => ({
            tableID: 'GroupID',
            advFilterString: branchId ? `OurBranchID='${branchId}'` : ''
        }),
        onSelect: (row) => {
            const groupId = String(getFieldValue(row, 'GroupID', 'ID')).trim();
            const groupName = String(getFieldValue(row, 'GroupName', 'Name', 'Description')).trim();
            if (!groupId) return;

            document.getElementById('centerId').value = groupId;
            document.getElementById('centerName').value = groupName;
            handleView();
        }
    });
}

function handleCenterProductSearch() {
    runLookupSearch({
        requireEditMode: true,
        editModeMessage: 'Center Product search is only available in Add or Edit mode.',
        requireBranch: false,
        buildConfig: () => ({
            tableID: 'GroupProductID',
            advFilterString: "BankID='00'"
        }),
        onSelect: (row) => {
            const productId = String(getFieldValue(row, 'GroupProductID', 'ProductID', 'ID')).trim();
            const productName = String(getFieldValue(row, 'GroupProductName', 'Description', 'Name')).trim();
            if (!productId) return;

            document.getElementById('centerProductId').value = productId;
            document.getElementById('centerProductName').value = productName;
        }
    });
}

function handlePrimarySchemeSearch() {
    const productId = document.getElementById('centerProductId')?.value?.trim();
    if (!productId) {
        showSnackbar('Please select a product first', 'warning');
        return;
    }

    runLookupSearch({
        requireEditMode: true,
        editModeMessage: 'Scheme search is only available in Add or Edit mode.',
        requireBranch: false,
        buildConfig: () => ({
            tableID: 'GroupDefaultSchemeID',
            advFilterString: `GroupProductID='${productId}' AND SchemeTypeID='P'`
        }),
        onSelect: (row) => {
            const schemeId = String(getFieldValue(row, 'LoanSchemeID', 'SchemeID', 'ID')).trim();
            const schemeName = String(getFieldValue(row, 'Description', 'LoanSchemeName', 'Name')).trim();
            if (!schemeId) return;

            document.getElementById('primarySchemeId').value = schemeId;
            document.getElementById('primarySchemeName').value = schemeName;
        }
    });
}

function handleCreditOfficerSearch() {
    runLookupSearch({
        requireEditMode: true,
        editModeMessage: 'Officer search is only available in Add or Edit mode.',
        requireBranch: true,
        buildConfig: (branchId) => ({
            tableID: 'ActiveOfficerID',
            advFilterString: `BankID='00' AND OfficerTypeID in ('CO','AO') AND ReportingBranchID='${branchId}'`
        }),
        onSelect: (row) => {
            const officerId = String(getFieldValue(row, 'OfficerID', 'ID')).trim();
            const officerName = String(getFieldValue(row, 'Name', 'OfficerName', 'Description')).trim();
            if (!officerId) return;

            document.getElementById('creditOfficer').value = officerId;
            document.getElementById('creditOfficerName').value = officerName;
        }
    });
}

function handleGroupFormedBySearch() {
    runLookupSearch({
        requireEditMode: true,
        editModeMessage: 'Officer search is only available in Add or Edit mode.',
        requireBranch: true,
        buildConfig: (branchId) => ({
            tableID: 'ActiveOfficerID',
            advFilterString: `BankID='00' AND OfficerTypeID in ('CO','AO') AND ReportingBranchID='${branchId}'`
        }),
        onSelect: (row) => {
            const officerId = String(getFieldValue(row, 'OfficerID', 'ID')).trim();
            const officerName = String(getFieldValue(row, 'Name', 'OfficerName', 'Description')).trim();
            if (!officerId) return;

            document.getElementById('groupFormedBy').value = officerId;
            document.getElementById('groupFormedByName').value = officerName;
        }
    });
}

function handleNgoSearch() {
    runLookupSearch({
        requireEditMode: true,
        editModeMessage: 'NGO search is only available in Add or Edit mode.',
        requireBranch: true,
        buildConfig: (branchId) => ({
            tableID: 'NGOBranchID',
            advFilterString: branchId ? `BranchID='${branchId}'` : ''
        }),
        onSelect: (row) => {
            const ngoId = String(getFieldValue(row, 'NGOID', 'NGOBranchID', 'ID')).trim();
            const ngoName = String(getFieldValue(row, 'NGOName', 'Name', 'Description')).trim();
            if (!ngoId) return;

            document.getElementById('ngoId').value = ngoId;
            document.getElementById('ngoName').value = ngoName;
        }
    });
}

async function fetchBranchDetails(branchId) {
    try {
        const requestData = {
            BankID: '00'
        };

        if (!window.LookupService || typeof window.LookupService.getBranches !== 'function') {
            document.getElementById('branchName').value = '';
            showSnackbar('Lookup service is not available', 'error');
            return;
        }

        const result = await window.LookupService.getBranches(requestData);

        let branches = [];
        if (Array.isArray(result?.data)) {
            branches = result.data;
        } else if (Array.isArray(result?.Details)) {
            branches = result.Details;
        } else if (Array.isArray(result?.data?.Details)) {
            branches = result.data.Details;
        } else if (Array.isArray(result?.data?.Details01)) {
            branches = result.data.Details01;
        }

        const lowerBranchId = String(branchId || '').toLowerCase();
        const filteredBranches = branches.filter(b =>
            String(b?.OurBranchID || b?.BranchID || '').toLowerCase().includes(lowerBranchId)
        );

        if (filteredBranches.length === 1) {
            const branch = filteredBranches[0];
            document.getElementById('branchName').value = branch.BranchName || branch.Name || '';
        } else if (filteredBranches.length === 0) {
            document.getElementById('branchName').value = '';
            showSnackbar('Branch not found', 'warning');
        } else {
            document.getElementById('branchName').value = '';
            showSnackbar('Multiple branches match, please use search dialog', 'warning');
        }
    } catch (error) {
        document.getElementById('branchName').value = '';
        showSnackbar('Error fetching branch details', 'error');
    }
}

function mapMeetingDay(meetingDayId) {
    const dayMap = {
        '1': 'Monday',
        '2': 'Tuesday',
        '3': 'Wednesday',
        '4': 'Thursday',
        '5': 'Friday',
        '6': 'Saturday',
        '7': 'Sunday'
    };
    if (!meetingDayId) return '';
    return dayMap[String(meetingDayId).trim()] || '';
}

function getMeetingDayId(meetingDayName) {
    const nameMap = {
        'monday': '1',
        'tuesday': '2',
        'wednesday': '3',
        'thursday': '4',
        'friday': '5',
        'saturday': '6',
        'sunday': '7'
    };
    if (!meetingDayName) return '';
    const key = String(meetingDayName).trim().toLowerCase();
    return nameMap[key] || '';
}

function applyGroupDetails(details01, details02) {
    if (details02) {
        document.getElementById('branchId').value = details02.OurBranchID || document.getElementById('branchId')?.value || '';
        document.getElementById('branchName').value = details02.BranchName || '';
        document.getElementById('centerId').value = details02.GroupID || '';
        document.getElementById('centerName').value = details02.GroupName || '';
        document.getElementById('centerProductId').value = details02.GroupProductID || '';
        document.getElementById('centerProductName').value = details02.GroupProductName || '';
        document.getElementById('primarySchemeId').value = details02.DefaultLoanSchemeID || '';
        document.getElementById('primarySchemeName').value = details02.DefaultLoanScheme || '';
        document.getElementById('creditOfficer').value = details02.CreditOfficerID || '';
        document.getElementById('creditOfficerName').value = details02.CreditOfficerName || '';
        document.getElementById('groupFormedBy').value = details02.GroupFormedBy || '';
        document.getElementById('groupFormedByName').value = details02.GroupFormedByName || '';
        document.getElementById('ngoId').value = details02.NGOID || '';
        document.getElementById('ngoName').value = details02.NGOName || '';
        document.getElementById('registrationNo').value = details02.RegistrationNo || '';
        document.getElementById('groupClass').value = details02.GroupClassID || '';
        document.getElementById('meetingDay').value = mapMeetingDay(details02.MeetingDayID) || '';
        document.getElementById('meetingTime').value = details02.MeetingTime !== undefined && details02.MeetingTime !== null
            ? String(details02.MeetingTime)
            : '';
        document.getElementById('meetingPlace').value = details02.MeetingPlace || '';
        document.getElementById('status').value = details02.GroupStatusID || 'A';
        document.getElementById('firstDay').value = details02.FirstDay || '';
        document.getElementById('nextDay').value = details02.NextDay || '';
        document.getElementById('village').value = details02.VillageID || '';
        document.getElementById('location').value = details02.CityID || '';
        document.getElementById('centre').value = details02.CenterID || '';
        document.getElementById('meetingFrequency').value = details02.MeetingFrequencyID || details02.MeetingFrequency || '';

        setDateInputValue(document.getElementById('formationDate'), extractDateForInput(details02.FormationDate));
        setDateInputValue(document.getElementById('firstMeetingDate'), extractDateForInput(details02.FirstMeetingDate));
        setDateInputValue(document.getElementById('nextMeetingDate'), extractDateForInput(details02.NextMeetingDate));

        // Group Leaders (if fields exist)
        const groupLeader1El = document.getElementById('groupLeader1');
        const groupLeader2El = document.getElementById('groupLeader2');
        const groupLeader3El = document.getElementById('groupLeader3');
        const groupLeader1NameEl = document.getElementById('groupLeader1Name');
        const groupLeader2NameEl = document.getElementById('groupLeader2Name');
        const groupLeader3NameEl = document.getElementById('groupLeader3Name');

        if (groupLeader1El) groupLeader1El.value = details02.GroupLead1 || '';
        if (groupLeader2El) groupLeader2El.value = details02.GroupLead2 || '';
        if (groupLeader3El) groupLeader3El.value = details02.GroupLead3 || '';
        if (groupLeader1NameEl) groupLeader1NameEl.value = details02.GroupLeadName1 || '';
        if (groupLeader2NameEl) groupLeader2NameEl.value = details02.GroupLeadName2 || '';
        if (groupLeader3NameEl) groupLeader3NameEl.value = details02.GroupLeadName3 || '';

        // Update audit trail (using textContent for span elements)
        const createdByEl = document.getElementById('createdBy');
        const modifiedByEl = document.getElementById('modifiedBy');
        const supervisedByEl = document.getElementById('supervisedBy');
        const createdOnEl = document.getElementById('createdOn');
        const modifiedOnEl = document.getElementById('modifiedOn');
        const supervisedOnEl = document.getElementById('supervisedOn');

        if (createdByEl) createdByEl.textContent = details02.CreatedBy || '-';
        if (createdOnEl) createdOnEl.textContent = formatDateDisplay(details02.CreatedOn) || '-';
        if (modifiedByEl) modifiedByEl.textContent = details02.ModifiedBy || '-';
        if (modifiedOnEl) modifiedOnEl.textContent = formatDateDisplay(details02.ModifiedOn) || '-';
        if (supervisedByEl) supervisedByEl.textContent = details02.SupervisedBy || '-';
        if (supervisedOnEl) supervisedOnEl.textContent = formatDateDisplay(details02.SupervisedOn) || '-';

        currentCenter = {
            ...details02,
            UpdateCount: details02.UpdateCount ?? details02.updateCount ?? details02.UPDATECOUNT ?? null
        };
        window.currentCenter = currentCenter;
    }

    if (details01) {
        document.getElementById('totalMembers').value = details01.TotalMembers ?? '';
        document.getElementById('totalSavingsAcs').value = details01.TotalSavingACs ?? '';
        document.getElementById('totalSavingsBalance').value = details01.TotalSavingsBalance ?? '';
        document.getElementById('totalLoanAcs').value = details01.TotalLoanACs ?? '';
        document.getElementById('totalLoanBalance').value = details01.TotalLoanBalance ?? '';
        document.getElementById('zeroBalance').value = details01.TotalZeroSavingACs ?? '';
        document.getElementById('meetingFrequency').value = details01.MeetingFrequency || details01.MeetingFrequencyID || '';
        document.getElementById('loanCycleType').value = details01.LoanCycleType || details01.LoanCycleTypeID || '';
        document.getElementById('loanCycleNo').value = details01.LoanCycleNo ?? '';
        document.getElementById('savingOsLoan').value = details01.SavingsTOOSLoan ?? '';
    }
}

function setEditMode(enabled) {
    const editableFields = [
        'centerProductId', 'centerProductName',
        'primarySchemeId', 'primarySchemeName', 'creditOfficer', 'creditOfficerName',
        'registrationNo', 'groupFormedBy', 'groupFormedByName', 'village', 'location', 'centre',
        'ngoId', 'ngoName', 'formationDate', 'firstMeetingDate', 'nextMeetingDate',
        'meetingDay', 'groupClass', 'firstDay', 'nextDay', 'meetingTime', 'meetingPlace',
        'meetingFrequency'
    ];

    // Legacy: In Edit mode, status field handling depends on whether status changed
    const statusField = document.getElementById('status');
    const statusReasonField = document.getElementById('statusReason');

    // Group Leader fields - only enabled in Add/Edit modes if a group is loaded
    const groupLeaderFields = ['groupLeader1', 'groupLeader1Name', 'groupLeader2', 'groupLeader2Name', 'groupLeader3', 'groupLeader3Name'];

    editableFields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            if (enabled) {
                element.removeAttribute('readonly');
                element.disabled = false;
            } else {
                if (element.type === 'text' || element.type === 'date' || element.tagName === 'TEXTAREA') {
                    element.setAttribute('readonly', 'readonly');
                } else if (element.tagName === 'SELECT') {
                    element.disabled = true;
                } else {
                    element.disabled = true;
                }
            }
        }
    });

    // Handle Group Leader fields
    groupLeaderFields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            if (enabled && !isAddMode) {
                // In Edit mode, leaders can be changed
                element.removeAttribute('readonly');
                element.disabled = false;
            } else if (enabled && isAddMode) {
                // In Add mode, leaders are disabled until group is created
                element.setAttribute('readonly', 'readonly');
                element.disabled = true;
            } else {
                // View mode - disabled
                element.setAttribute('readonly', 'readonly');
                element.disabled = true;
            }
        }
    });

    // Group Leader lookup buttons - disabled in Add mode, enabled in Edit mode
    const leaderLookupButtons = [
        document.querySelector('.btn-lookup[data-lookup="GroupLeader1"]'),
        document.querySelector('.btn-lookup[data-lookup="GroupLeader2"]'),
        document.querySelector('.btn-lookup[data-lookup="GroupLeader3"]')
    ];

    leaderLookupButtons.forEach(btn => {
        if (btn) {
            if (enabled && !isAddMode) {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            } else {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            }
        }
    });

    // Status and Status Reason handling
    if (statusField) {
        if (enabled && !isAddMode) {
            // In Edit mode, status can be changed
            statusField.disabled = false;
        } else if (isAddMode) {
            // In Add mode, status is always 'A' (Active) - disabled
            statusField.disabled = true;
            statusField.value = 'A';
        } else {
            // View mode
            statusField.disabled = true;
        }
    }

    // Status reason is handled by handleStatusChange() function

    // Special handling for Center ID and Center Name
    const centerIdElement = document.getElementById('centerId');
    const centerNameElement = document.getElementById('centerName');
    const centerLookupBtn = document.querySelector('.btn-lookup[data-lookup="Center"]');

    if (isAddMode) {
        // In Add Mode: Center ID is auto-generated (readonly/disabled), Center Name is editable
        if (centerIdElement) {
            centerIdElement.setAttribute('readonly', 'readonly');
            centerIdElement.disabled = true;
        }
        if (centerNameElement) {
            centerNameElement.removeAttribute('readonly');
            centerNameElement.disabled = false;
        }
        if (centerLookupBtn) {
            centerLookupBtn.disabled = true;
            centerLookupBtn.style.opacity = '0.5';
            centerLookupBtn.style.cursor = 'not-allowed';
        }
    } else if (enabled) {
        // In Edit Mode: Center ID is readonly (key field), but Center Name is editable
        if (centerIdElement) {
            centerIdElement.setAttribute('readonly', 'readonly');
            centerIdElement.disabled = true;
        }
        if (centerNameElement) {
            // In Edit mode, Group Name can be changed (per legacy system behavior)
            centerNameElement.removeAttribute('readonly');
            centerNameElement.disabled = false;
        }
        if (centerLookupBtn) {
            centerLookupBtn.disabled = true;
            centerLookupBtn.style.opacity = '0.5';
            centerLookupBtn.style.cursor = 'not-allowed';
        }
    } else {
        // In View Mode: Center ID is searchable, Center Name is display-only
        if (centerIdElement) {
            centerIdElement.removeAttribute('readonly');
            centerIdElement.disabled = false;
        }
        if (centerNameElement) {
            centerNameElement.setAttribute('readonly', 'readonly');
            centerNameElement.disabled = false;
        }
        if (centerLookupBtn) {
            centerLookupBtn.disabled = false;
            centerLookupBtn.style.opacity = '1';
            centerLookupBtn.style.cursor = 'pointer';
        }
    }

    // Button states
    const btnAdd = document.querySelector('.btn-action[onclick*="handleAdd"]');
    const btnEdit = document.querySelector('.btn-action[onclick*="handleEdit"]');
    const btnDelete = document.querySelector('.btn-action[onclick*="handleDelete"]');
    const btnSave = document.querySelector('.btn-action[data-action="save"]');
    const btnCancel = document.querySelector('.btn-action[data-action="cancel"]');
    const btnPrev = document.querySelector('.btn-action[onclick*="handleNavigatePrevious"]');
    const btnNext = document.querySelector('.btn-action[onclick*="handleNavigateNext"]');
    const btnView = document.querySelector('.btn-action[onclick*="handleView"]');

    if (enabled) {
        // In Add/Edit mode
        if (btnAdd) btnAdd.disabled = true;
        if (btnEdit) btnEdit.disabled = true;
        if (btnDelete) btnDelete.disabled = true;
        if (btnSave) btnSave.disabled = false;
        if (btnCancel) btnCancel.disabled = false;
        if (btnPrev) btnPrev.disabled = true;
        if (btnNext) btnNext.disabled = true;
        if (btnView) btnView.disabled = true;
    } else {
        // In View mode
        const hasLoadedCenter = document.getElementById('centerId')?.value?.trim();
        
        if (btnAdd) btnAdd.disabled = false;
        if (btnEdit) btnEdit.disabled = !hasLoadedCenter;
        if (btnDelete) btnDelete.disabled = !hasLoadedCenter;
        if (btnSave) btnSave.disabled = true;
        if (btnCancel) btnCancel.disabled = false;
        if (btnPrev) btnPrev.disabled = !hasLoadedCenter;
        if (btnNext) btnNext.disabled = !hasLoadedCenter;
        if (btnView) btnView.disabled = false;
    }

    // Disable/Enable Branch ID field
    const branchIdElement = document.getElementById('branchId');
    const branchLookupBtn = document.querySelector('.btn-lookup[data-lookup="Branch"]');
    
    if (enabled) {
        // During Add/Edit, branch cannot be changed
        if (branchIdElement) {
            branchIdElement.setAttribute('readonly', 'readonly');
            branchIdElement.disabled = true;
        }
        if (branchLookupBtn) {
            branchLookupBtn.disabled = true;
            branchLookupBtn.style.opacity = '0.5';
            branchLookupBtn.style.cursor = 'not-allowed';
        }
    } else {
        // In View mode, branch can be changed
        if (branchIdElement) {
            branchIdElement.removeAttribute('readonly');
            branchIdElement.disabled = false;
        }
        if (branchLookupBtn) {
            branchLookupBtn.disabled = false;
            branchLookupBtn.style.opacity = '1';
            branchLookupBtn.style.cursor = 'pointer';
        }
    }
}

function handleAdd() {
    const branchId = document.getElementById('branchId')?.value?.trim();
    if (!branchId) {
        showSnackbar('Please select a branch first', 'warning');
        return;
    }

    isAddMode = true;
    isEditMode = true;
    clearCenterFields();
    
    // Set default values for Add mode
    const statusField = document.getElementById('status');
    if (statusField) {
        statusField.value = 'A'; // Active status by default
    }
    
    setEditMode(true);
    hideCenterCreatedMessage();
    
    const btnAdd = document.querySelector('.btn-action[onclick*="handleAdd"]');
    if (btnAdd) btnAdd.disabled = true;
    
    showSnackbar('Add mode enabled. Enter center details and click Save.', 'info');
    
    // Focus on center name field (first editable field)
    const centerNameField = document.getElementById('centerName');
    if (centerNameField) {
        setTimeout(() => centerNameField.focus(), 100);
    }
}

function handleEdit() {
    const centerId = document.getElementById('centerId')?.value?.trim();
    if (!centerId) {
        showSnackbar('Please load a center first', 'warning');
        return;
    }

    isEditMode = true;
    isAddMode = false;
    setEditMode(true);
    hideCenterCreatedMessage();
    
    const btnEdit = document.querySelector('.btn-action[onclick*="handleEdit"]');
    if (btnEdit) btnEdit.disabled = true;
    
    showSnackbar('Edit mode enabled. Make changes and click Save.', 'info');
}

async function handleSave() {
    // Run comprehensive validation
    if (!validateBeforeSave()) {
        return;
    }

    const branchId = document.getElementById('branchId')?.value?.trim();
    const centerName = document.getElementById('centerName')?.value?.trim();

    if (!window.GroupService) {
        showSnackbar('GroupService not available. Please refresh the page.', 'error');
        console.error('[GroupMaintenance] GroupService is not available');
        return;
    }

    try {
        const groupClass = document.getElementById('groupClass')?.value || '';
        const formationDate = document.getElementById('formationDate')?.value || '';
        const meetingDay = document.getElementById('meetingDay')?.value || '';
        const firstMeetingDate = document.getElementById('firstMeetingDate')?.value || '';
        const meetingTimeRaw = document.getElementById('meetingTime')?.value || '';
        const nextMeetingDate = document.getElementById('nextMeetingDate')?.value || '';
        const meetingDayId = getMeetingDayId(meetingDay);
        const operatorId = window.Environment?.OperatorID || window.Environment?.operatorId || 'CSADM';
        const workingDate = window.Environment?.workingDate || getLocalDateString();

        // Parse meeting time to Numeric(5,2) format
        let meetingTime = '';
        if (meetingTimeRaw) {
            const timeParts = meetingTimeRaw.includes('.') ? meetingTimeRaw.split('.') : [meetingTimeRaw.substring(0, 2), meetingTimeRaw.substring(2, 4)];
            const hours = parseInt(timeParts[0], 10) || 0;
            const minutes = parseInt(timeParts[1], 10) || 0;
            meetingTime = `${hours}.${minutes}`; // e.g., "9.30" or "14.45"
        }

        // Parse FirstDay and NextDay to tinyint (numbers or empty string)
        const firstDayRaw = document.getElementById('firstDay')?.value?.trim();
        const nextDayRaw = document.getElementById('nextDay')?.value?.trim();
        const firstDay = firstDayRaw ? parseInt(firstDayRaw, 10) : '';
        const nextDay = nextDayRaw ? parseInt(nextDayRaw, 10) : '';

        // Handle optional fields - send null or empty string for empty values
        const cityId = document.getElementById('location')?.value?.trim() || null;
        const centerId = document.getElementById('centre')?.value?.trim() || null;
        const villageId = document.getElementById('village')?.value?.trim() || null;
        const ngoId = document.getElementById('ngoId')?.value?.trim() || null;

        // Build request data matching stored procedure parameters exactly
        const requestData = {
            OurBranchID: branchId,
            GroupID: isAddMode ? null : (document.getElementById('centerId')?.value || null),
            GroupName: centerName,
            GroupProductID: document.getElementById('centerProductId')?.value || '',
            DefaultLoanSchemeID: document.getElementById('primarySchemeId')?.value || '',
            FormationDate: formationDate,
            OpenDate: workingDate,
            GroupClassID: groupClass,
            CreditOfficerID: document.getElementById('creditOfficer')?.value || '',
            GroupFormedBy: document.getElementById('groupFormedBy')?.value || '',
            CityID: cityId,
            CenterID: centerId,
            VillageID: villageId,
            NGOID: ngoId,
            MeetingFrequencyID: document.getElementById('meetingFrequency')?.value || '',
            FirstMeetingDate: firstMeetingDate,
            FirstDay: firstDay,
            NextDay: nextDay,
            MeetingDayID: meetingDayId || meetingDay || '',
            MeetingPlace: document.getElementById('meetingPlace')?.value || '',
            MeetingTime: meetingTime,
            NextMeetingDate: nextMeetingDate,
            RegistrationNo: document.getElementById('registrationNo')?.value || '',
            GroupLead1: document.getElementById('groupLeader1')?.value?.trim() || '',
            GroupLead2: document.getElementById('groupLeader2')?.value?.trim() || '',
            GroupLead3: document.getElementById('groupLeader3')?.value?.trim() || '',
            GroupStatusID: document.getElementById('status')?.value || 'A',
            CreatedBy: operatorId,
            CreatedOn: isAddMode ? workingDate : (currentCenter?.CreatedOn || workingDate),
            ModifiedBy: isAddMode ? null : operatorId,
            ModifiedOn: isAddMode ? null : workingDate,
            SupervisedBy: null,
            NewRecord: isAddMode ? 1 : (currentCenter?.UpdateCount ?? 0)
        };

        console.log('[GroupMaintenance] Saving group with data:', requestData);
        const result = await window.GroupService.addEditGroup(requestData);

        const dbErrorMessage = result?.ResponseMessage
            || result?.data?.ResponseMessage
            || result?.Message
            || result?.data?.Message
            || result?.message
            || result?.data?.message
            || result?.error
            || result?.data?.error;

        const isFailure = result?.success === false
            || result?.data?.success === false
            || result?.error
            || result?.data?.error;

        if (!isFailure) {
            const savedGroupId = result?.Details?.[0]?.GroupID
                || result?.data?.Details?.[0]?.GroupID
                || result?.data?.GroupID
                || document.getElementById('centerId')?.value
                || '';
            
            showSnackbar(`Center ${isAddMode ? 'created' : 'updated'} successfully. Group ID: ${savedGroupId}`, 'success');
            
            if (isAddMode) {
                showCenterCreatedMessage(savedGroupId);
                // After Add, update the center ID field with the newly created ID
                if (savedGroupId) {
                    document.getElementById('centerId').value = savedGroupId;
                }
            }
            
            // Reset mode flags
            const wasAddMode = isAddMode;
            isAddMode = false;
            isEditMode = false;
            
            // If we just added a center, load its details to show in view mode
            if (wasAddMode && savedGroupId) {
                // Set the modes to false before calling handleView
                await handleView(0);
            } else {
                // For edit, just switch to view mode
                setEditMode(false);
                
                // Enable navigation buttons
                const btnEdit = document.querySelector('.btn-action[onclick*="handleEdit"]');
                const btnDelete = document.querySelector('.btn-action[onclick*="handleDelete"]');
                const btnPrev = document.querySelector('.btn-action[onclick*="handleNavigatePrevious"]');
                const btnNext = document.querySelector('.btn-action[onclick*="handleNavigateNext"]');
                
                if (btnEdit) btnEdit.disabled = false;
                if (btnDelete) btnDelete.disabled = false;
                if (btnPrev) btnPrev.disabled = false;
                if (btnNext) btnNext.disabled = false;
            }
            
            // Enable Add button
            const btnAdd = document.querySelector('.btn-action[onclick*="handleAdd"]');
            if (btnAdd) btnAdd.disabled = false;
        } else {
            if (dbErrorMessage) {
                console.error('[GroupMaintenance] DB error:', dbErrorMessage);
            }
            showSnackbar(dbErrorMessage || 'Failed to save center details', 'error');
        }
    } catch (error) {
        console.error('[GroupMaintenance] Save error:', error);
        showSnackbar('Error saving center details: ' + (error?.message || 'Unknown error'), 'error');
    }
}

function handleCancel() {
    if (!isEditMode && !isAddMode) {
        showSnackbar('No changes to cancel', 'info');
        return;
    }

    const wasAddMode = isAddMode;
    const centerId = document.getElementById('centerId')?.value?.trim();
    const branchId = document.getElementById('branchId')?.value?.trim();
    
    isEditMode = false;
    isAddMode = false;
    
    setEditMode(false);
    hideCenterCreatedMessage();

    if (wasAddMode) {
        // After canceling Add mode, clear all fields
        clearCenterFields();
        showSnackbar('Add mode cancelled', 'info');
    } else {
        // After canceling Edit mode, reload the data to restore original values
        if (centerId && branchId) {
            handleView();
            showSnackbar('Changes cancelled, data restored', 'info');
        } else {
            clearCenterFields();
            showSnackbar('Edit mode cancelled', 'info');
        }
    }
    
    const btnAdd = document.querySelector('.btn-action[onclick*="handleAdd"]');
    if (btnAdd) btnAdd.disabled = false;
}

function handleDelete() {
    const centerId = document.getElementById('centerId')?.value?.trim();
    if (!centerId) {
        showSnackbar('Please load a center first', 'warning');
        return;
    }

    if (!window.GroupService) {
        showSnackbar('GroupService not available. Please refresh the page.', 'error');
        console.error('[GroupMaintenance] GroupService is not available');
        return;
    }

    showConfirmationDialog(
        'Delete Center',
        `Are you sure you want to delete center ${centerId}? This action cannot be undone.`,
        'danger'
    ).then(async (confirmed) => {
        if (!confirmed) return;

        try {
            const branchId = document.getElementById('branchId')?.value?.trim();
            const requestData = {
                OurBranchID: branchId,
                GroupID: centerId,
                OperatorID: window.Environment?.OperatorID || window.Environment?.operatorId || 'CSADM'
            };

            console.log('[GroupMaintenance] Deleting group with data:', requestData);
            const result = await window.GroupService.deleteGroupDetails(requestData);

            if (result?.success || result?.data?.success || !result?.error) {
                showSnackbar('Center deleted successfully', 'success');
                clearCenterFields();
                document.getElementById('branchId').focus();
            } else {
                showSnackbar(result?.message || 'Failed to delete center', 'error');
            }
        } catch (error) {
            console.error('[GroupMaintenance] Delete error:', error);
            showSnackbar('Error deleting center: ' + (error?.message || 'Unknown error'), 'error');
        }
    });
}

async function handleView(direction = 0) {
    console.log('[GroupMaintenance] handleView called with direction:', direction);
    const centerId = document.getElementById('centerId')?.value?.trim();
    const branchId = document.getElementById('branchId')?.value?.trim();

    if (!centerId || !branchId) {
        showSnackbar('Please provide Center ID and Branch ID', 'warning');
        return;
    }

    if (!window.GroupService?.getGroupDetails) {
        showSnackbar('GroupService not loaded', 'error');
        return;
    }

    try {
        const requestData = {
            OurBranchID: branchId,
            GroupID: centerId,
            OperatorID: window.Environment?.OperatorID || window.Environment?.operatorId || 'CSADM',
            Direction: direction
        };

        console.log('[GroupMaintenance] Calling GroupService.getGroupDetails with:', requestData);
        const result = await window.GroupService.getGroupDetails(requestData);
        console.log('[GroupMaintenance] GroupService.getGroupDetails result:', result);
        const details01 = result?.data?.Details01?.[0]
            || result?.Details01?.[0]
            || null;
        const details02 = result?.data?.Details02?.[0]
            || result?.Details02?.[0]
            || null;

        if (!details01 && !details02) {
            showSnackbar(result?.message || 'No group details found', 'warning');
            return;
        }

        applyGroupDetails(details01, details02);

        isEditMode = false;
        isAddMode = false;
        setEditMode(false);

        // Enable Edit, Delete, Prev, Next buttons after successfully loading a center
        const btnEdit = document.querySelector('.btn-action[onclick*="handleEdit"]');
        const btnDelete = document.querySelector('.btn-action[onclick*="handleDelete"]');
        const btnPrev = document.querySelector('.btn-action[onclick*="handleNavigatePrevious"]');
        const btnNext = document.querySelector('.btn-action[onclick*="handleNavigateNext"]');

        if (btnEdit) btnEdit.disabled = false;
        if (btnDelete) btnDelete.disabled = false;
        if (btnPrev) btnPrev.disabled = false;
        if (btnNext) btnNext.disabled = false;

        showSnackbar('Center details loaded successfully', 'success');
    } catch (error) {
        showSnackbar('Error loading group details', 'error');
    }
}

function handleNavigatePrevious() {
    console.log('[GroupMaintenance] handleNavigatePrevious called');
    const centerId = document.getElementById('centerId')?.value?.trim();
    const branchId = document.getElementById('branchId')?.value?.trim();

    if (!centerId || !branchId) {
        showSnackbar('Please load a center first before navigating', 'warning');
        return;
    }

    if (isEditMode || isAddMode) {
        showSnackbar('Please save or cancel changes before navigating', 'warning');
        return;
    }

    console.log('[GroupMaintenance] Calling handleView(-1)');
    handleView(-1);
}

function handleNavigateNext() {
    console.log('[GroupMaintenance] handleNavigateNext called');
    const centerId = document.getElementById('centerId')?.value?.trim();
    const branchId = document.getElementById('branchId')?.value?.trim();

    if (!centerId || !branchId) {
        showSnackbar('Please load a center first before navigating', 'warning');
        return;
    }

    if (isEditMode || isAddMode) {
        showSnackbar('Please save or cancel changes before navigating', 'warning');
        return;
    }

    console.log('[GroupMaintenance] Calling handleView(1)');
    handleView(1);
}

window.handleBranchSearch = handleBranchSearch;
window.handleCenterSearch = handleCenterSearch;
window.handleCenterProductSearch = handleCenterProductSearch;
window.handlePrimarySchemeSearch = handlePrimarySchemeSearch;
window.handleCreditOfficerSearch = handleCreditOfficerSearch;
window.handleGroupFormedBySearch = handleGroupFormedBySearch;
window.handleNgoSearch = handleNgoSearch;
window.handleGroupLeader1Search = handleGroupLeader1Search;
window.handleGroupLeader2Search = handleGroupLeader2Search;
window.handleGroupLeader3Search = handleGroupLeader3Search;
window.handleView = handleView;
window.handleViewButton = () => handleView(0); // Explicit View button handler
window.handleAdd = handleAdd;
window.handleEdit = handleEdit;
window.handleSave = handleSave;
window.handleCancel = handleCancel;
window.handleDelete = handleDelete;
window.handleNavigatePrevious = handleNavigatePrevious;
window.handleNavigateNext = handleNavigateNext;
window.setEditMode = setEditMode;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeCenterMaintenance();
    });
} else {
    initializeCenterMaintenance();
}
