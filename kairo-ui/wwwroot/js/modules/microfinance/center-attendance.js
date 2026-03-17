/**
 * Center Attendance Module
 * Migrated from legacy implementation to KAIRO MVC architecture
 */
(function () {
    'use strict';

    console.log('🚀 Center Attendance module loading...');

    // ═══════════════════════════════════════════════════════════════════
    // STATE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════

    const state = {
        currentAttendance: null,
        branchId: null,
        operatorId: null,
        currentMode: 'VIEW',
        isDirty: false,
        moduleId: null,
        updateCount: 0,
        attendanceRows: [],
        isGridEditable: false,
        editSnapshot: null
    };

    // PaymentType options loaded from server-rendered JSON
    let paymentTypeOptions = [];
    let paymentTypeOptionsHtml = '';
    let paymentTypeValueByLabel = null;

    // AttendanceStatus options loaded from server-rendered JSON
    let attendanceStatusOptions = [];
    let attendanceStatusOptionsHtml = '';
    let attendanceStatusValueByLabel = null;
    let attendanceStatusValueByValue = null;
    let defaultAttendanceStatusValue = '';

    function getAppCore() {
        const win = window;
        return win.AppCore || (win.parent && win.parent !== win && win.parent.AppCore) || (win.top && win.top !== win && win.top.AppCore) || null;
    }

    // ═══════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════

    function init() {
        console.log('🚀 Initializing Center Attendance module...');

        loadContext();
        loadAttendanceStatusOptions();
        loadPaymentTypeOptions();
        wireLookupButtons();
        wireFormEvents();
        wireActionButtons();
        wireGridChangeEvents();
        wireFieldValidation();
        wireValidationSummary();

        // Default state
        setHeaderFieldsForEditMode(false);
        setMeetingFieldsEditable(false);
        setGridEditable(false);
        // On initial load, only View button enabled (all others disabled)
        setActionButtonsState({ canView: true, canEdit: false, canDelete: false, canSave: false, canCancel: false });

        console.log('✅ Center Attendance module initialized', state);
    }

    function wireValidationSummary() {
        const summary = document.getElementById('ca_validationSummary');
        if (!summary) return;
        const closeBtn = summary.querySelector('.validation-summary__close');
        closeBtn?.addEventListener('click', () => hideValidationSummary());
    }

    // ═══════════════════════════════════════════════════════════════════
    // CONTEXT LOADING
    // ═══════════════════════════════════════════════════════════════════

    function loadContext() {
        state.moduleId = document.getElementById('moduleId_centerAttendance')?.value || '5080';
        state.branchId = sessionStorage.getItem('branch_code') || sessionStorage.getItem('OurBranchID') || '0603';
        state.operatorId = sessionStorage.getItem('user_name') || sessionStorage.getItem('OperatorID') || 'CSADM';
        console.log('📦 Context loaded:', state);
    }

    function loadPaymentTypeOptions() {
        try {
            const scriptEl = document.getElementById('paymentTypeOptionsData');
            if (scriptEl) {
                paymentTypeOptions = JSON.parse(scriptEl.textContent || '[]');
            }
        } catch (e) {
            console.error('[CenterAttendance] Failed to parse PaymentType options:', e);
            paymentTypeOptions = [];
        }

        // Build HTML options and value-by-label map
        const parts = ['<option value="">Select...</option>'];
        paymentTypeValueByLabel = new Map();

        for (const opt of paymentTypeOptions) {
            const value = String(opt?.value ?? '');
            const label = String(opt?.label ?? '');
            parts.push(`<option value="${value.replace(/"/g, '&quot;')}">${label}</option>`);
            const key = label.trim().toLowerCase();
            if (key && value && !paymentTypeValueByLabel.has(key)) {
                paymentTypeValueByLabel.set(key, value);
            }
        }
        paymentTypeOptionsHtml = parts.join('');
    }

    function loadAttendanceStatusOptions() {
        try {
            const scriptEl = document.getElementById('attendanceStatusOptionsData');
            if (scriptEl) {
                attendanceStatusOptions = JSON.parse(scriptEl.textContent || '[]');
            }
        } catch (e) {
            console.error('[CenterAttendance] Failed to parse AttendanceStatus options:', e);
            attendanceStatusOptions = [];
        }

        const parts = ['<option value="">Select...</option>'];
        attendanceStatusValueByLabel = new Map();
        attendanceStatusValueByValue = new Map();

        for (const opt of attendanceStatusOptions) {
            const value = String(opt?.value ?? '').trim();
            const label = String(opt?.label ?? '').trim();
            if (!value) continue;

            parts.push(`<option value="${value.replace(/"/g, '&quot;')}">${label}</option>`);

            const labelKey = label.toLowerCase();
            if (labelKey && !attendanceStatusValueByLabel.has(labelKey)) {
                attendanceStatusValueByLabel.set(labelKey, value);
            }

            const valueKey = value.toLowerCase();
            if (valueKey && !attendanceStatusValueByValue.has(valueKey)) {
                attendanceStatusValueByValue.set(valueKey, value);
            }
        }

        defaultAttendanceStatusValue = attendanceStatusOptions[0]?.value
            ? String(attendanceStatusOptions[0].value).trim()
            : '';
        attendanceStatusOptionsHtml = parts.join('');
    }

    // ═══════════════════════════════════════════════════════════════════
    // SEARCH DIALOG MANAGEMENT (uses shared SearchModal via AppCore)
    // ═══════════════════════════════════════════════════════════════════

    const searchDialogConfig = {
        'center': {
            title: 'Center Search',
            tableID: 'GroupID',
            getAdvFilterString: () => {
                const safeBranch = String(state.branchId || '').replace(/'/g, "''");
                return `OurBranchID='${safeBranch}' AND GroupStatusID='A'`;
            }
        },
        'meeting-date': {
            title: 'Meeting Date Search',
            tableID: 'GroupNextMeeting',
            whereStmtOnOpen: '1=1',
            getAdvFilterString: () => {
                const safeBranch = String(state.branchId || '').replace(/'/g, "''");
                const centerId = document.getElementById('txt_centerId')?.value?.trim();
                let filter = `OurBranchID='${safeBranch}' AND GroupStatusID='A'`;
                if (centerId) {
                    filter += ` AND GroupID='${centerId.replace(/'/g, "''")}'`;
                }
                return filter;
            }
        },
        'officer': {
            title: 'Officer Search',
            tableID: 'ActiveOfficerID',
            // Keep base WHERE safe; we'll build robust criteria dynamically.
            whereStmtOnOpen: '1=1',
            // Avoid AdvFilterString='OurBranchID=...' which can break Officer searches.
            getAdvFilterString: () => ''
        }
    };

    function ensureSearchModal() {
        const appCore = getAppCore();
        if (!appCore) {
            showError('AppCore not available for search dialog.');
            return null;
        }
        if (typeof window.SearchModal !== 'function') {
            showError('Search dialog script not loaded.');
            return null;
        }
        return new window.SearchModal(appCore);
    }

    function patchSearchModalForGroupNextMeeting(modal) {
        if (!modal || modal.__caExecuteSearchPatched) return;

        const originalExecuteSearch = typeof modal.executeSearch === 'function'
            ? modal.executeSearch.bind(modal)
            : null;

        if (!originalExecuteSearch) return;

        modal.executeSearch = async function () {
            await originalExecuteSearch();

            try {
                if (this.currentConfig?.tableID !== 'GroupNextMeeting') return;
                if (!Array.isArray(this.currentResults) || this.currentResults.length === 0) return;

                const original = this.currentResults;

                const nonEmpty = original.filter(r => r && typeof r === 'object' && Object.keys(r).length > 0);
                const needsFormatting = nonEmpty.some(r => {
                    const v = r?.NextMeetingDate;
                    return typeof v === 'string' && /T\d{2}:\d{2}:\d{2}/.test(v);
                });

                const formattedRows = needsFormatting
                    ? nonEmpty.map(r => {
                        const nextMeetingRaw = r?.NextMeetingDate;
                        const formatted = nextMeetingRaw ? formatToDdMmmYyyy(nextMeetingRaw) : '';
                        return formatted ? { ...r, NextMeetingDate: formatted } : r;
                    })
                    : nonEmpty;

                const changed = formattedRows.length !== original.length || needsFormatting;
                if (!changed) return;

                this.currentResults = formattedRows;

                if (formattedRows.length > 0) {
                    this.renderResults(formattedRows);
                    this.showState('results');
                } else {
                    this.showState('empty');
                }
            } catch (err) {
                console.warn('[CenterAttendance] SearchModal GroupNextMeeting patch failed:', err);
            }
        };

        modal.__caExecuteSearchPatched = true;
    }

    function patchSearchModalForActiveOfficer(modal) {
        if (!modal || modal.__caOfficerPatched) return;

        const originalExecuteSearch = typeof modal.executeSearch === 'function'
            ? modal.executeSearch.bind(modal)
            : null;

        if (!originalExecuteSearch) return;

        const escapeSql = (v) => String(v ?? '').replace(/'/g, "''");

        const safeCssEscape = (value) => {
            try {
                return (window.CSS && typeof window.CSS.escape === 'function')
                    ? window.CSS.escape(String(value))
                    : String(value).replace(/"/g, '\\"');
            } catch {
                return String(value).replace(/"/g, '\\"');
            }
        };

        const buildWhereFromCriteria = (baseWhere) => {
            const form = document.getElementById('search-modal-form');
            if (!form) return baseWhere || '';

            const inputs = Array.from(form.querySelectorAll('input[data-field]'));
            const rawTerms = [];

            for (const input of inputs) {
                const field = input.getAttribute('data-field');
                if (!field) continue;

                const val = String(input.value ?? '').trim();
                if (!val) continue;

                const select = form.querySelector(`select[data-field="${safeCssEscape(field)}"]`);
                const mode = String(select?.value || 'like').toLowerCase();
                rawTerms.push({ field, value: val, mode });
            }

            if (rawTerms.length === 0) return baseWhere || '';

            // Robustness rule: if user entered a numeric-looking ID, force it onto OfficerID with equals.
            const numeric = rawTerms.find(t => /^\d{6,}$/.test(t.value));
            const hasOfficerId = rawTerms.some(t => String(t.field).toLowerCase() === 'officerid');
            const terms = (!hasOfficerId && numeric)
                ? [{ field: 'OfficerID', value: numeric.value, mode: 'equals' }]
                : rawTerms.map(t => {
                    const isOfficerId = String(t.field).toLowerCase() === 'officerid';
                    const isNumericId = isOfficerId && /^\d{6,}$/.test(t.value);
                    return isNumericId ? { ...t, mode: 'equals' } : t;
                });

            const clauses = terms.map(t => {
                const field = t.field;
                const v = escapeSql(t.value);
                switch (t.mode) {
                    case 'equals':
                        return `${field} = '${v}'`;
                    case 'startswith':
                        return `${field} LIKE '${v}%'`;
                    case 'endswith':
                        return `${field} LIKE '%${v}'`;
                    case 'like':
                    default:
                        return `${field} LIKE '%${v}%'`;
                }
            });

            const base = String(baseWhere || '').trim();
            const expr = clauses.join(' AND ');
            return base ? `${base} AND ${expr}` : expr;
        };

        modal.executeSearch = async function () {
            try {
                if (this.currentConfig?.tableID === 'ActiveOfficerID') {
                    const baseWhere = this.currentConfig?.whereStmt || '';
                    const whereStmt = buildWhereFromCriteria(baseWhere);
                    const whereEl = document.getElementById('search-where-stmt');
                    if (whereEl) whereEl.value = whereStmt;

                    // Ensure AdvFilterString doesn't inject invalid columns
                    const advEl = document.getElementById('search-adv-filter');
                    if (advEl) advEl.value = '';

                    // Keep SearchKey empty for this TableID to avoid backend parsing issues.
                    this.currentConfig.searchKey = '';
                }
            } catch (e) {
                console.warn('[CenterAttendance] Officer search pre-hook failed:', e);
            }

            await originalExecuteSearch();
        };

        modal.__caOfficerPatched = true;
    }

    function mapSelectedData(lookupType, data) {
        if (!data) return;

        if (lookupType === 'center') {
            const groupId = data.GroupID || data.GroupId || data.ID || '';
            const groupName = data.GroupName || data.Description || data.Name || '';
            document.getElementById('txt_centerId').value = groupId;
            document.getElementById('txt_centerName').value = groupName;
            showSuccess(`Center selected: ${groupId}`);
        } else if (lookupType === 'meeting-date') {
            const meetingDate = data.NextMeetingDate || data.MeetingDate || data.Date || '';
            const groupId = data.GroupID || data.GroupId || '';
            const groupName = data.GroupName || data.Description || '';

            const meetingDateInput = document.getElementById('txt_meetingDate');
            const meetingDateIso = normalizeToYyyyMmDd(meetingDate);
            const meetingDateDisplay = formatToDdMmmYyyy(meetingDate) || meetingDate;

            if (meetingDateInput && meetingDateInput._flatpickr && meetingDateIso) {
                // Flatpickr stores ISO in the original input and shows DD-MMM-YYYY in altInput
                meetingDateInput._flatpickr.setDate(meetingDateIso, true, 'Y-m-d');
            } else if (meetingDateInput) {
                meetingDateInput.value = meetingDateDisplay;
            }
            if (groupId) document.getElementById('txt_centerId').value = groupId;
            if (groupName) document.getElementById('txt_centerName').value = groupName;
            showSuccess(`Meeting Date selected: ${meetingDateDisplay}`);
        } else if (lookupType === 'officer') {
            const officerId = data.OfficerID || data.OfficerId || data.ID || '';
            const officerName = data.OfficerName || data.Name || data.Description || '';
            document.getElementById('txt_officerId').value = officerId;
            document.getElementById('txt_officerName').value = officerName;
            showSuccess(`Officer selected: ${officerId}`);
        }
    }

    function openSearchDialog(lookupType) {
        const config = searchDialogConfig[lookupType];
        if (!config) {
            console.error('[CenterAttendance] Unknown lookup type:', lookupType);
            return;
        }

        const modal = ensureSearchModal();
        if (!modal || !config.tableID) {
            showError('Search dialog is not available.');
            return;
        }

        patchSearchModalForGroupNextMeeting(modal);
        patchSearchModalForActiveOfficer(modal);

        const advFilterString = typeof config.getAdvFilterString === 'function'
            ? config.getAdvFilterString()
            : (config.advFilterString || '');

        modal.open({
            title: config.title,
            tableID: config.tableID,
            moduleID: state.moduleId || '5080',
            whereStmt: (typeof config.whereStmtOnOpen === 'function' ? config.whereStmtOnOpen() : (config.whereStmtOnOpen || '')),
            advFilterString,
            searchKey: '',
            ourbranchId: state.branchId,
            onSelect: (record) => mapSelectedData(lookupType, record)
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // LOOKUP BUTTONS
    // ═══════════════════════════════════════════════════════════════════

    function wireLookupButtons() {
        document.addEventListener('click', (e) => {
            const target = e.target instanceof Element ? e.target : e.target?.parentElement;
            const lookupBtn = target?.closest?.('[data-ca-lookup]');
            if (!lookupBtn || lookupBtn.disabled) return;

            const lookupType = lookupBtn.getAttribute('data-ca-lookup');
            if (!lookupType) return;

            e.preventDefault();
            e.stopPropagation();
            openSearchDialog(lookupType);
        }, true);
    }

    // ═══════════════════════════════════════════════════════════════════
    // FORM EVENTS
    // ═══════════════════════════════════════════════════════════════════

    function wireFormEvents() {
        const form = document.getElementById('frm_centerAttendance');
        form?.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach(field => {
            field.addEventListener('change', () => {
                if (state.currentMode !== 'VIEW') {
                    state.isDirty = true;
                }
            });
        });
    }

    function wireActionButtons() {
        document.querySelector('[data-action="view"]')?.addEventListener('click', handleView);
        document.querySelector('[data-action="edit"]')?.addEventListener('click', handleEdit);
        document.querySelector('[data-action="delete"]')?.addEventListener('click', handleDelete);
        document.querySelector('[data-action="save"]')?.addEventListener('click', handleSave);
        document.querySelector('[data-action="cancel"]')?.addEventListener('click', handleCancel);
    }

    function wireGridChangeEvents() {
        document.addEventListener('change', (e) => {
            const target = e.target;
            if (!(target instanceof HTMLSelectElement)) return;

            const clientId = String(target.getAttribute('data-client-id') || '').trim();
            if (!clientId) return;

            const row = state.attendanceRows.find(r => String(r?.ClientID || '').trim() === clientId);
            if (!row) return;

            if (target.matches('select[data-attendance-status]')) {
                row.AttendanceStatusID = String(target.value || '').trim();
                state.isDirty = true;
            } else if (target.matches('select[data-payment-type]')) {
                row.PaymentTypeID = String(target.value || '').trim();
                const selectedLabel = target.selectedOptions?.[0]?.textContent || '';
                row.PaymentTypeDesc = selectedLabel;
                state.isDirty = true;
            }
        });
    }

    function wireFieldValidation() {
        const centerIdInput = document.getElementById('txt_centerId');
        if (centerIdInput) {
            centerIdInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    validateCenterId();
                }
            });
            centerIdInput.addEventListener('blur', validateCenterId);
        }

        const officerIdInput = document.getElementById('txt_officerId');
        if (officerIdInput) {
            officerIdInput.addEventListener('blur', validateOfficerId);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // FIELD VALIDATION (via controller → OldApiService)
    // ═══════════════════════════════════════════════════════════════════

    async function validateCenterId() {
        const appCore = getAppCore();
        if (!appCore) return;

        const centerId = document.getElementById('txt_centerId')?.value?.trim();
        if (!centerId) {
            document.getElementById('txt_centerName').value = '';
            return;
        }

        try {
            const response = await appCore.invokeControllerAsync('GroupAttendance/validate', {
                OurBranchID: state.branchId,
                ControlTypeID: 'GroupID',
                ID: centerId,
                BankID: '00',
                TypeID: '',
                AdvanceFilter: '',
                LanguageID: 'en'
            });

            const details = extractDetailsArray(response);
            if (details.length) {
                const centerName = details[0]?.GroupName || details[0]?.Name || details[0]?.Description || '';
                if (centerName) {
                    document.getElementById('txt_centerName').value = centerName;
                    return;
                }
            }
            document.getElementById('txt_centerId').value = '';
            document.getElementById('txt_centerName').value = '';
            showError('Invalid Center ID');
        } catch (err) {
            document.getElementById('txt_centerId').value = '';
            document.getElementById('txt_centerName').value = '';
            showError('Center validation failed: ' + (err.message || 'Unknown error'));
        }
    }

    async function validateOfficerId() {
        const appCore = getAppCore();
        if (!appCore) return;

        const officerId = document.getElementById('txt_officerId')?.value?.trim();
        if (!officerId) {
            document.getElementById('txt_officerName').value = '';
            return;
        }

        try {
            const response = await appCore.invokeControllerAsync('GroupAttendance/validate', {
                OurBranchID: state.branchId,
                ControlTypeID: 'ActiveOfficerID',
                ID: officerId,
                BankID: '00',
                TypeID: officerId,
                AdvanceFilter: '',
                LanguageID: 'en'
            });

            const details = extractDetailsArray(response);
            if (details.length) {
                const officerName = details[0]?.Name || details[0]?.OfficerName || details[0]?.Description || '';
                if (officerName) {
                    document.getElementById('txt_officerName').value = officerName;
                    return;
                }
            }
            document.getElementById('txt_officerId').value = '';
            document.getElementById('txt_officerName').value = '';
            showError('Invalid Officer ID');
        } catch (err) {
            document.getElementById('txt_officerId').value = '';
            document.getElementById('txt_officerName').value = '';
            showError('Officer validation failed: ' + (err.message || 'Unknown error'));
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // CRUD OPERATIONS - ALL USE invokeControllerAsync (POST)
    // ═══════════════════════════════════════════════════════════════════

    async function handleView() {
        const appCore = getAppCore();
        if (!appCore) {
            showError('AppCore not available');
            return;
        }

        const centerId = document.getElementById('txt_centerId')?.value?.trim();
        const meetingDateRaw = document.getElementById('txt_meetingDate')?.value?.trim();

        if (!centerId) {
            showWarning('Please enter Center ID');
            document.getElementById('txt_centerId')?.focus();
            return;
        }
        if (!meetingDateRaw) {
            showWarning('Please enter Meeting Date');
            document.getElementById('txt_meetingDate')?.focus();
            return;
        }

        const meetingDate = formatToDdMmmYyyy(meetingDateRaw) || meetingDateRaw;
        showLoading(true);

        try {
            const response = await appCore.invokeControllerAsync('GroupAttendance/get', {
                OurBranchID: state.branchId,
                GroupID: centerId,
                MeetingDate: meetingDate,
                OperatorID: state.operatorId
            });

            console.log('[View] Response:', response);

            // Extract header data (response shapes vary; don't assume Details01)
            let recordData = pickHeaderRecordFromResponse(response);

            // Pick attendance list rows
            const attendanceList = pickAttendanceListFromResponse(response);

            if (!recordData && !attendanceList.length) {
                showError('No attendance data found');
                setActionButtonsState({ canView: true, canEdit: false, canDelete: false, canSave: false, canCancel: true });
                return;
            }

            // If header record isn't returned, synthesize one from the current form so Edit/Save can work.
            if (!recordData) {
                recordData = {
                    GroupID: centerId,
                    GroupName: document.getElementById('txt_centerName')?.value?.trim() || '',
                    MeetingDate: meetingDate,
                    OfficerID: document.getElementById('txt_officerId')?.value?.trim() || '',
                    OfficerName: document.getElementById('txt_officerName')?.value?.trim() || '',
                    MeetingPlace: document.getElementById('txt_meetingPlace')?.value?.trim() || '',
                    Remarks: document.getElementById('txt_remarks')?.value?.trim() || ''
                };
            }

            // Some backends return header pieces in a different Details* block than the header row.
            // Hydrate missing Officer/MeetingPlace/Remarks/Names from anywhere in the response.
            recordData = hydrateHeaderFromResponse(recordData, response);

            // Populate header fields
            document.getElementById('txt_centerId').value = recordData.GroupID || centerId || '';
            // Only clear Center Name if API returns a value, otherwise preserve existing
            const centerNameInput = document.getElementById('txt_centerName');
            const apiCenterName = recordData.GroupName || recordData.Description || recordData.Name || '';
            if (apiCenterName) {
                centerNameInput.value = apiCenterName;
            } // else leave as-is

            if (recordData.MeetingDate) setMeetingDateInput(recordData.MeetingDate);

            document.getElementById('txt_officerId').value = recordData.OfficerID || recordData.OfficerId || '';
            // Only clear Officer Name if API returns a value, otherwise preserve existing
            const officerNameInput = document.getElementById('txt_officerName');
            const apiOfficerName = recordData.OfficerName || recordData.Name || recordData.Description || '';
            if (apiOfficerName) {
                officerNameInput.value = apiOfficerName;
            } // else leave as-is

            document.getElementById('txt_meetingPlace').value = (recordData.MeetingPlace ?? recordData.PlaceOfMeeting ?? recordData.MeetingVenue ?? '') || '';
            document.getElementById('txt_remarks').value = (recordData.Remarks ?? recordData.Remark ?? recordData.Comments ?? recordData.Comment ?? '') || '';

            // If we have header data but no member rows, keep the grid empty and show feedback.
            // (Example: Details01 has the meeting header, but Details02 is empty.)
            if (!attendanceList.length) {
                state.attendanceRows = [];
                state.updateCount = pickUpdateCount(recordData, []);
                document.getElementById('hdn_updateCount').value = state.updateCount;

                renderAttendanceTable([]);

                state.currentAttendance = recordData;
                state.currentMode = 'VIEW';
                state.editSnapshot = null;

                // Revert to initial state: only View enabled.
                // Keep the populated header visible, but do not allow edit/delete/save/cancel.
                setCenterFieldsLocked(false);
                setHeaderFieldsForEditMode(false);
                setMeetingFieldsEditable(false);
                setGridEditable(false);
                setActionButtonsState({ canView: true, canEdit: false, canDelete: false, canSave: false, canCancel: false });
                showWarning('There are no Members Defined for the Group');
                return;
            }

            // Normalize and store attendance rows
            for (const row of attendanceList) {
                normalizeAttendanceRow(row);
            }
            // Default missing status to first AttendanceStatus option
            for (const row of attendanceList) {
                if (!String(row?.AttendanceStatusID ?? '').trim()) row.AttendanceStatusID = defaultAttendanceStatusValue;
            }

            state.attendanceRows = attendanceList;
            state.updateCount = pickUpdateCount(recordData, attendanceList);
            document.getElementById('hdn_updateCount').value = state.updateCount;

            // Render grid
            renderAttendanceTable(attendanceList);

            state.currentAttendance = recordData;
            state.currentMode = 'VIEW';
            state.editSnapshot = null;

            // Lock center fields after view
            setCenterFieldsLocked(true);
            setHeaderFieldsForEditMode(false);
            setMeetingFieldsEditable(false);
            setGridEditable(false);
            setActionButtonsState({ canView: false, canEdit: true, canDelete: true, canSave: false, canCancel: true });

            showSuccess(`Attendance loaded - ${attendanceList.length} record(s)`);
        } catch (error) {
            console.error('[View] Error:', error);
            showError('Error loading attendance: ' + error.message);
            setActionButtonsState({ canView: true, canEdit: false, canDelete: false, canSave: false, canCancel: true });
        } finally {
            showLoading(false);
        }
    }

    function handleEdit() {
        if (!state.currentAttendance) {
            showWarning('Please load attendance data first (View)');
            return;
        }

        // Validate meeting date is not ahead of working date (future-dated)
        const meetingDateRaw = document.getElementById('txt_meetingDate')?.value?.trim();
        const meetingDate = formatToDdMmmYyyy(meetingDateRaw) || meetingDateRaw;
        const meetingDateObj = parseDdMmmYyyyToDate(meetingDate);
        const workingDate = getWorkingDate();

        if (meetingDateObj && workingDate) {
            const md = new Date(meetingDateObj.getFullYear(), meetingDateObj.getMonth(), meetingDateObj.getDate());
            const wd = new Date(workingDate.getFullYear(), workingDate.getMonth(), workingDate.getDate());
            if (md > wd) {
                showError(`Cannot edit: Meeting Date (${meetingDate}) is ahead of System Working Date`);
                return;
            }
        }

        // Snapshot current viewed record so Cancel can revert (instead of clearing)
        state.editSnapshot = snapshotCurrentView();

        state.currentMode = 'EDIT';

        // Lock center and meeting date; enable officer and editable fields
        setCenterFieldsLocked(true);
        setDisabled(document.getElementById('txt_meetingDate'), true);
        setDisabled(document.querySelector('[data-ca-lookup="meeting-date"]'), true);
        setHeaderFieldsForEditMode(true);
        setMeetingFieldsEditable(true);
        setGridEditable(true);

        setActionButtonsState({ canView: false, canEdit: false, canDelete: false, canSave: true, canCancel: true });
        showInfo('Edit mode enabled');
    }

    async function handleDelete() {
        const appCore = getAppCore();
        if (!appCore) return;

        if (!state.currentAttendance) {
            showWarning('Please load attendance data first (View)');
            return;
        }

        const centerId = document.getElementById('txt_centerId')?.value?.trim();
        const meetingDateRaw = document.getElementById('txt_meetingDate')?.value?.trim();
        const meetingDate = formatToDdMmmYyyy(meetingDateRaw) || meetingDateRaw;

        if (!centerId || !meetingDate) {
            showError('Center ID and Meeting Date are required');
            return;
        }

        if (!confirm(`Delete attendance for Center ${centerId} on ${meetingDate}?`)) {
            return;
        }

        showLoading(true);

        try {
            const response = await appCore.invokeControllerAsync('GroupAttendance/delete', {
                OurBranchID: state.branchId,
                GroupID: centerId,
                MeetingDate: meetingDate,
                UpdateCount: String(state.updateCount || 0)
            });

            console.log('[Delete] Response:', response);

            // Check for failure
            if (response?.Status === '091' || response?.status === '091') {
                showError(response?.Message || response?.message || 'Deletion failed');
                return;
            }

            showSuccess('Attendance deleted successfully');
            clearForm();
            state.currentAttendance = null;
            state.updateCount = 0;
            state.attendanceRows = [];

            setCenterFieldsLocked(false);
            setHeaderFieldsForEditMode(false);
            setMeetingFieldsEditable(false);
            setGridEditable(false);
            setActionButtonsState({ canView: true, canEdit: false, canDelete: false, canSave: false, canCancel: true });
        } catch (error) {
            console.error('[Delete] Error:', error);
            showError('Delete failed: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    async function handleSave() {
        const appCore = getAppCore();
        if (!appCore) return;

        if (!state.currentAttendance) {
            showError('No attendance data loaded');
            return;
        }

        // Validate required fields
        const centerId = document.getElementById('txt_centerId')?.value?.trim();
        const meetingDateRaw = document.getElementById('txt_meetingDate')?.value?.trim();
        const meetingDate = formatToDdMmmYyyy(meetingDateRaw) || meetingDateRaw;
        const officerId = document.getElementById('txt_officerId')?.value?.trim();
        const officerName = document.getElementById('txt_officerName')?.value?.trim();
        const meetingPlace = document.getElementById('txt_meetingPlace')?.value?.trim();
        const remarks = document.getElementById('txt_remarks')?.value?.trim();

        // Validate meeting date not ahead of working date
        const meetingDateObj = parseDdMmmYyyyToDate(meetingDate);
        const workingDate = getWorkingDate();
        if (meetingDateObj && workingDate) {
            const md = new Date(meetingDateObj.getFullYear(), meetingDateObj.getMonth(), meetingDateObj.getDate());
            const wd = new Date(workingDate.getFullYear(), workingDate.getMonth(), workingDate.getDate());
            if (md > wd) {
                showError(`Meeting Date (${meetingDate}) cannot be ahead of System Working Date`);
                return;
            }
        }

        if (!officerId) { showError('Officer ID is required'); return; }
        if (!officerName) { showError('Officer Name is required'); return; }
        if (!meetingPlace) { showError('Meeting Place is required'); return; }

        const rows = state.attendanceRows;
        if (!rows.length) { showError('No attendance rows to save'); return; }

        // Validate each row has status and payment type
        for (const row of rows) {
            const clientDisplay = row?.ClientID || row?.ClientName || 'a row';
            if (!String(row?.AttendanceStatusID ?? '').trim()) {
                showError(`Attendance Status is required for ${clientDisplay}`);
                return;
            }
            if (!String(row?.PaymentTypeID ?? '').trim()) {
                showError(`Payment Type is required for ${clientDisplay}`);
                return;
            }
        }

        showLoading(true);

        try {
            // Validate officer via controller
            showInfo('Validating Officer...');
            const officerResp = await appCore.invokeControllerAsync('GroupAttendance/validate', {
                OurBranchID: state.branchId,
                ControlTypeID: 'ActiveOfficerID',
                ID: officerId,
                BankID: '00',
                TypeID: officerId,
                AdvanceFilter: '',
                LanguageID: 'en'
            });

            const officerDetails = extractDetailsArray(officerResp);
            if (!officerDetails.length) {
                showError('Invalid Officer ID');
                showLoading(false);
                return;
            }

            const validatedName = officerDetails[0]?.Name || officerDetails[0]?.OfficerName || officerDetails[0]?.Description || '';
            if (!validatedName) {
                showError(`Invalid Officer ID '${officerId}' (no name returned)`);
                showLoading(false);
                return;
            }
            document.getElementById('txt_officerName').value = validatedName;

            // Build attendance details XML
            const attendanceDetailsXml = buildAttendanceDetailsXml(rows);
            if (!attendanceDetailsXml) {
                showError('Attendance details are empty');
                showLoading(false);
                return;
            }

            showInfo('Saving attendance...');

            const saveResponse = await appCore.invokeControllerAsync('GroupAttendance/save', {
                OurBranchID: state.branchId,
                GroupID: centerId,
                MeetingDate: meetingDate,
                OfficerID: officerId,
                MeetingPlace: meetingPlace,
                Remarks: remarks,
                AttendanceDetails: attendanceDetailsXml,
                OperatedBy: state.operatorId,
                UpdateCount: state.updateCount || 0
            });

            console.log('[Save] Response:', saveResponse);

            const explicitFail = saveResponse?.Status !== undefined && !(saveResponse.Status === '00' || saveResponse.Status === '0' || saveResponse.Status === 0);
            if (explicitFail) {
                showError(saveResponse?.Message || 'Save failed');
                return;
            }

            // Update state
            const newUpdateCount = saveResponse?.Details01?.[0]?.UpdateCount ?? saveResponse?.UpdateCount ?? (state.updateCount + 1);
            state.updateCount = newUpdateCount;
            document.getElementById('hdn_updateCount').value = newUpdateCount;

            state.currentAttendance.MeetingPlace = meetingPlace;
            state.currentAttendance.Remarks = remarks;
            state.currentAttendance.OfficerID = officerId;
            state.currentAttendance.OfficerName = validatedName;

            // Disable all controls after save
            state.currentMode = 'VIEW';
            state.isDirty = false;
            state.editSnapshot = null;

            // After successful save, reset form to initial load state
            showSuccess('Attendance saved successfully');
            clearForm();
            state.currentAttendance = null;
            state.updateCount = 0;
            state.attendanceRows = [];
            state.currentMode = 'VIEW';
            state.isDirty = false;

            setCenterFieldsLocked(false);
            setHeaderFieldsForEditMode(false);
            setMeetingFieldsEditable(false);
            setGridEditable(false);
            setActionButtonsState({ canView: true, canEdit: false, canDelete: false, canSave: false, canCancel: false });
        } catch (error) {
            console.error('[Save] Error:', error);
            showError('Save failed: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    function handleCancel() {
        // If cancelling while editing, revert to last viewed snapshot.
        if (state.currentMode === 'EDIT' && state.editSnapshot) {
            restoreSnapshot(state.editSnapshot);
            state.currentMode = 'VIEW';
            state.isDirty = false;
            state.editSnapshot = null;

            setCenterFieldsLocked(true);
            setHeaderFieldsForEditMode(false);
            setMeetingFieldsEditable(false);
            setGridEditable(false);
            setActionButtonsState({ canView: false, canEdit: true, canDelete: true, canSave: false, canCancel: true });
            showInfo('Edit cancelled');
            return;
        }

        // Otherwise, Cancel acts as Clear.
        clearForm();
        state.currentAttendance = null;
        state.attendanceRows = [];
        state.updateCount = 0;
        state.isDirty = false;
        state.currentMode = 'VIEW';
        state.editSnapshot = null;

        setCenterFieldsLocked(false);
        setHeaderFieldsForEditMode(false);
        setMeetingFieldsEditable(false);
        setGridEditable(false);
        setActionButtonsState({ canView: true, canEdit: false, canDelete: false, canSave: false, canCancel: true });
        showInfo('Cancelled');
    }

    function snapshotCurrentView() {
        const formValues = {
            CenterID: document.getElementById('txt_centerId')?.value ?? '',
            CenterName: document.getElementById('txt_centerName')?.value ?? '',
            MeetingDate: document.getElementById('txt_meetingDate')?.value ?? '',
            OfficerID: document.getElementById('txt_officerId')?.value ?? '',
            OfficerName: document.getElementById('txt_officerName')?.value ?? '',
            MeetingPlace: document.getElementById('txt_meetingPlace')?.value ?? '',
            Remarks: document.getElementById('txt_remarks')?.value ?? ''
        };

        // Deep copy plain data objects (safe for our rows)
        const safeCopy = (obj) => {
            try { return obj ? JSON.parse(JSON.stringify(obj)) : obj; } catch { return obj; }
        };

        return {
            formValues,
            currentAttendance: safeCopy(state.currentAttendance),
            attendanceRows: safeCopy(state.attendanceRows) || [],
            updateCount: Number(state.updateCount || 0)
        };
    }

    function restoreSnapshot(snapshot) {
        if (!snapshot) return;

        const v = snapshot.formValues || {};
        if (document.getElementById('txt_centerId')) document.getElementById('txt_centerId').value = v.CenterID ?? '';
        if (document.getElementById('txt_centerName')) document.getElementById('txt_centerName').value = v.CenterName ?? '';
        setMeetingDateInput(v.MeetingDate ?? '');
        if (document.getElementById('txt_officerId')) document.getElementById('txt_officerId').value = v.OfficerID ?? '';
        if (document.getElementById('txt_officerName')) document.getElementById('txt_officerName').value = v.OfficerName ?? '';
        if (document.getElementById('txt_meetingPlace')) document.getElementById('txt_meetingPlace').value = v.MeetingPlace ?? '';
        if (document.getElementById('txt_remarks')) document.getElementById('txt_remarks').value = v.Remarks ?? '';

        state.currentAttendance = snapshot.currentAttendance || null;
        state.attendanceRows = Array.isArray(snapshot.attendanceRows) ? snapshot.attendanceRows : [];
        state.updateCount = Number(snapshot.updateCount || 0);
        document.getElementById('hdn_updateCount').value = String(state.updateCount || 0);

        renderAttendanceTable(state.attendanceRows);
    }

    function setMeetingDateInput(rawValue) {
        const meetingDateInput = document.getElementById('txt_meetingDate');
        if (!meetingDateInput) return;

        const meetingDateIso = normalizeToYyyyMmDd(rawValue);
        const meetingDateDisplay = formatToDdMmmYyyy(rawValue) || String(rawValue || '');

        if (meetingDateInput._flatpickr && meetingDateIso) {
            meetingDateInput._flatpickr.setDate(meetingDateIso, true, 'Y-m-d');
        } else {
            meetingDateInput.value = meetingDateDisplay;
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // FORM DATA OPERATIONS
    // ═══════════════════════════════════════════════════════════════════

    function clearForm() {
        const fieldIds = ['txt_centerId', 'txt_centerName', 'txt_officerId', 'txt_officerName', 'txt_meetingPlace', 'txt_remarks'];
        fieldIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

        // Clear Flatpickr-controlled meeting date field
        const meetingDateEl = document.getElementById('txt_meetingDate');
        if (meetingDateEl?._flatpickr) {
            meetingDateEl._flatpickr.clear();
        } else if (meetingDateEl) {
            meetingDateEl.value = '';
        }

        document.getElementById('hdn_updateCount').value = '0';

        const tbody = document.getElementById('attendanceTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No records to display</td></tr>';
        }
    }

    function renderAttendanceTable(attendance) {
        const tbody = document.getElementById('attendanceTableBody');
        if (!tbody) return;

        if (!attendance || !attendance.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No records to display</td></tr>';
            return;
        }

        tbody.innerHTML = attendance.map(record => {
            const clientId = escapeHtml(record.ClientID || '');
            const clientName = escapeHtml(record.ClientName || '');
            const statusId = String(record.AttendanceStatusID || defaultAttendanceStatusValue || '');
            const paymentValue = getPaymentTypeValueFromRecord(record);

            // Build payment type select with server-rendered options
            let paymentHtml = paymentTypeOptionsHtml;
            if (paymentValue) {
                paymentHtml = paymentHtml.replace(
                    `value="${paymentValue.replace(/"/g, '&quot;')}"`,
                    `value="${paymentValue.replace(/"/g, '&quot;')}" selected`
                );
            }

            let statusHtml = attendanceStatusOptionsHtml;
            if (statusId) {
                statusHtml = statusHtml.replace(
                    `value="${statusId.replace(/"/g, '&quot;')}"`,
                    `value="${statusId.replace(/"/g, '&quot;')}" selected`
                );
            }

            return `<tr>
                <td>${clientId}</td>
                <td>${clientName}</td>
                <td>
                    <select class="bs-select" data-client-id="${clientId}" data-attendance-status>${statusHtml}</select>
                </td>
                <td>
                    <select class="bs-select" data-client-id="${clientId}" data-payment-type>${paymentHtml}</select>
                </td>
            </tr>`;
        }).join('');

        // Store resolved payment values back
        for (const row of attendance) {
            const resolved = getPaymentTypeValueFromRecord(row);
            if (resolved) row.PaymentTypeID = resolved;
        }

        setGridEditable(state.isGridEditable);
    }

    // ═══════════════════════════════════════════════════════════════════
    // FIELD STATE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════

    function setDisabled(el, disabled) {
        if (!el) return;
        el.disabled = !!disabled;
        if (disabled) {
            el.setAttribute('aria-disabled', 'true');
        } else {
            el.removeAttribute('aria-disabled');
        }
    }

    function setCenterFieldsLocked(locked) {
        setDisabled(document.getElementById('txt_centerId'), !!locked);
        setDisabled(document.getElementById('txt_centerName'), true); // Always disabled
        setDisabled(document.querySelector('[data-ca-lookup="center"]'), !!locked);
    }

    function setHeaderFieldsForEditMode(isEditing) {
        // Center: always locked in edit
        setDisabled(document.getElementById('txt_centerId'), !!isEditing);
        setDisabled(document.getElementById('txt_centerName'), true);
        setDisabled(document.querySelector('[data-ca-lookup="center"]'), !!isEditing);

        // Meeting date: locked in edit
        setDisabled(document.getElementById('txt_meetingDate'), !!isEditing);
        setDisabled(document.querySelector('[data-ca-lookup="meeting-date"]'), !!isEditing);

        // Officer: enabled in edit
        setDisabled(document.getElementById('txt_officerId'), !isEditing);
        setDisabled(document.getElementById('txt_officerName'), true); // Always readonly
        // Allow lookup in both view & edit (selection still populates programmatically)
        setDisabled(document.querySelector('[data-ca-lookup="officer"]'), false);
    }

    function setMeetingFieldsEditable(editable) {
        setDisabled(document.getElementById('txt_meetingPlace'), !editable);
        setDisabled(document.getElementById('txt_remarks'), !editable);
    }

    function setGridEditable(editable) {
        state.isGridEditable = !!editable;
        document.querySelectorAll('select[data-attendance-status], select[data-payment-type]').forEach(sel => {
            sel.disabled = !state.isGridEditable;
        });
    }

    function disableAllControlsExceptCancel() {
        const form = document.getElementById('frm_centerAttendance');
        form?.querySelectorAll('input, textarea, select').forEach(el => { el.disabled = true; });
        form?.querySelectorAll('[data-ca-lookup]').forEach(btn => { btn.disabled = true; });
        setGridEditable(false);
        setActionButtonsState({ canView: false, canEdit: false, canDelete: false, canSave: false, canCancel: true });
    }

    function setActionButtonsState({ canView = true, canEdit = false, canDelete = false, canSave = false, canCancel = false } = {}) {
        const set = (action, enabled) => {
            const btn = document.querySelector(`[data-action="${action}"]`);
            if (btn) btn.disabled = !enabled;
        };
        set('view', canView);
        set('edit', canEdit);
        set('delete', canDelete);
        set('save', canSave);
        set('cancel', canCancel);
    }

    // ═══════════════════════════════════════════════════════════════════
    // DATA HELPERS
    // ═══════════════════════════════════════════════════════════════════

    function extractDetailsArray(resp) {
        if (!resp) return [];
        if (Array.isArray(resp.Details)) return resp.Details;
        if (Array.isArray(resp.data?.Details)) return resp.data.Details;
        if (Array.isArray(resp.data)) return resp.data;
        return [];
    }

    function pickAttendanceListFromResponse(data) {
        if (!data || typeof data !== 'object') return [];

        const detailsKeys = Object.keys(data).filter(k => /^Details(\d+)?$/i.test(k));
        const scored = [];

        for (const key of detailsKeys) {
            const arr = Array.isArray(data[key]) ? data[key] : null;
            if (!arr || !arr.length) continue;

            let hasClientId = 0;
            let hasStatusOrPayment = 0;
            for (const r of arr) {
                if (String(r?.ClientID ?? r?.ClientId ?? '').trim()) hasClientId++;
                const status = String(r?.AttendanceStatusID ?? r?.AttendanceStatus ?? r?.Status ?? '').trim();
                const payment = String(r?.PaymentTypeID ?? r?.PaymentTypeDesc ?? '').trim();
                if (status || payment) hasStatusOrPayment++;
            }

            // Only consider arrays that look like member rows.
            // (Header/metadata arrays can be non-empty but have no ClientID.)
            if (hasClientId > 0 || hasStatusOrPayment > 0) {
                scored.push({ key, arr, score: hasClientId * 10 + hasStatusOrPayment * 5 });
            }
        }

        scored.sort((a, b) => b.score - a.score);
        return scored.length > 0 ? (scored[0]?.arr || []) : [];
    }

    function pickHeaderRecordFromResponse(data) {
        if (!data || typeof data !== 'object') return null;

        // Search through any Details-like arrays and choose the row that looks most like a header.
        const detailsKeys = Object.keys(data).filter(k => /^Details(\d+)?$/i.test(k));
        const candidates = [];

        const scoreHeaderRow = (row) => {
            if (!row || typeof row !== 'object') return 0;
            let score = 0;
            if (String(row.GroupID ?? row.GroupId ?? '').trim()) score += 50;
            if (String(row.GroupName ?? row.Name ?? row.Description ?? '').trim()) score += 20;
            if (String(row.MeetingDate ?? '').trim()) score += 20;
            if (String(row.OfficerID ?? row.OfficerId ?? '').trim()) score += 10;
            if (String(row.MeetingPlace ?? '').trim()) score += 5;
            if (row.Remarks != null) score += 2;
            return score;
        };

        for (const key of detailsKeys) {
            const arr = Array.isArray(data[key]) ? data[key] : null;
            if (!arr || !arr.length) continue;
            for (const row of arr) {
                const s = scoreHeaderRow(row);
                if (s > 0) candidates.push({ row, score: s });
            }
        }

        candidates.sort((a, b) => b.score - a.score);
        return candidates[0]?.row || null;
    }

    function hydrateHeaderFromResponse(header, response) {
        const h = (header && typeof header === 'object') ? { ...header } : {};

        const ensure = (prop, value) => {
            const cur = h[prop];
            if (cur !== undefined && cur !== null && String(cur).trim() !== '') return;
            if (value === undefined || value === null) return;
            const s = String(value).trim();
            if (!s) return;
            h[prop] = value;
        };

        // Helper: find the first non-empty value for any key in any Details* array.
        const findAny = (keys) => {
            if (!response || typeof response !== 'object') return undefined;
            const detailsKeys = Object.keys(response).filter(k => /^Details(\d+)?$/i.test(k));
            for (const dk of detailsKeys) {
                const arr = Array.isArray(response[dk]) ? response[dk] : null;
                if (!arr) continue;
                for (const row of arr) {
                    if (!row || typeof row !== 'object') continue;
                    for (const key of keys) {
                        const v = row[key];
                        if (v !== undefined && v !== null && String(v).trim() !== '') return v;
                    }
                }
            }
            return undefined;
        };

        // Officer ID / Name
        ensure('OfficerID', h.OfficerID ?? h.OfficerId ?? findAny(['OfficerID', 'OfficerId', 'ActiveOfficerID', 'AOID']));
        ensure('OfficerName', h.OfficerName ?? findAny(['OfficerName', 'Officer', 'Name', 'Description']));

        // Meeting place / remarks
        ensure('MeetingPlace', h.MeetingPlace ?? findAny(['MeetingPlace', 'PlaceOfMeeting', 'MeetingVenue', 'Venue']));
        ensure('Remarks', h.Remarks ?? findAny(['Remarks', 'Remark', 'Comments', 'Comment']));

        // Group name can also be elsewhere
        ensure('GroupName', h.GroupName ?? findAny(['GroupName', 'Name', 'Description']));

        return h;
    }

    function normalizeAttendanceRow(row) {
        if (!row || typeof row !== 'object') return row;

        const statusCandidate = row.AttendanceStatusID ?? row.AttendanceStatusId ?? row.AttendanceStatus ?? row.StatusID ?? row.Status ?? '';
        const normalized = normalizeAttendanceStatusId(statusCandidate);
        if (normalized) row.AttendanceStatusID = normalized;

        if (row.PaymentTypeID == null || String(row.PaymentTypeID).trim() === '') {
            const desc = row.PaymentTypeDesc ?? row.PaymentTypeDescription ?? row.PaymentTypeName ?? '';
            if (desc) {
                row.PaymentTypeDesc = desc;
            }
        }
        return row;
    }

    function normalizeAttendanceStatusId(value) {
        const raw = String(value ?? '').trim();
        if (!raw) return '';

        const valueMatch = attendanceStatusValueByValue?.get?.(raw.toLowerCase());
        if (valueMatch) return String(valueMatch).trim();

        const labelMatch = attendanceStatusValueByLabel?.get?.(raw.toLowerCase());
        if (labelMatch) return String(labelMatch).trim();

        return raw;
    }

    function getPaymentTypeValueFromRecord(record) {
        const direct = record?.PaymentTypeID ?? record?.PaymentTypeId ?? record?.PaymentType ?? '';
        const directValue = String(direct || '').trim();
        if (directValue) {
            const mapped = paymentTypeValueByLabel?.get?.(directValue.toLowerCase());
            if (mapped) return String(mapped).trim();
            return directValue;
        }

        const label = String(record?.PaymentTypeDesc ?? record?.PaymentTypeDescription ?? '').trim();
        if (!label) return '';
        const mapped = paymentTypeValueByLabel?.get?.(label.toLowerCase());
        return String(mapped || '').trim();
    }

    function pickUpdateCount(headerRecord, rows) {
        const candidates = [
            headerRecord?.UpdateCount, headerRecord?.Updatecount,
            rows?.[0]?.UpdateCount, rows?.[0]?.Updatecount
        ];
        for (const c of candidates) {
            if (c == null) continue;
            const n = Number(String(c).trim());
            if (!Number.isNaN(n)) return n;
        }
        return 0;
    }

    function buildAttendanceDetailsXml(rows) {
        return (rows || []).map(r => {
            const clientId = escapeXml(r?.ClientID ?? r?.ClientId ?? '');
            const statusId = escapeXml(r?.AttendanceStatusID ?? r?.AttendanceStatusId ?? '');
            const paymentId = escapeXml(r?.PaymentTypeID ?? r?.PaymentTypeId ?? '');
            return '<dt_GroupAttendance>' +
                `<ClientID>${clientId}</ClientID>` +
                `<AttendanceStatusID>${statusId}</AttendanceStatusID>` +
                `<PaymentTypeID>${paymentId}</PaymentTypeID>` +
                '</dt_GroupAttendance>';
        }).join('');
    }

    // ═══════════════════════════════════════════════════════════════════
    // DATE UTILITIES
    // ═══════════════════════════════════════════════════════════════════

    function normalizeToYyyyMmDd(value) {
        const s = String(value || '').trim();
        if (!s) return '';
        if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

        const dmyMatch = s.match(/^(\d{1,2})\s*[-/]\s*([A-Za-z]{3,})\s*[-/]\s*(\d{4})/);
        if (dmyMatch) {
            const day = Number(dmyMatch[1]);
            const monText = String(dmyMatch[2]).slice(0, 3).toLowerCase();
            const year = Number(dmyMatch[3]);
            const monthMap = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
            const monthIndex = monthMap[monText];
            if (Number.isInteger(day) && Number.isInteger(year) && Number.isInteger(monthIndex)) {
                const d = new Date(Date.UTC(year, monthIndex, day));
                if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
            }
        }

        const d = new Date(s);
        if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
        return '';
    }

    function formatToDdMmmYyyy(value) {
        const iso = normalizeToYyyyMmDd(value);
        if (!iso) return '';
        const [yyyy, mm, dd] = iso.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const mon = monthNames[Number(mm) - 1] || '';
        return mon ? `${dd}-${mon}-${yyyy}` : '';
    }

    function parseDdMmmYyyyToDate(dateStr) {
        if (!dateStr) return null;
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const match = String(dateStr).match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
        if (!match) return null;
        const day = parseInt(match[1], 10);
        const monthIndex = monthNames.findIndex(m => m.toLowerCase() === match[2].toLowerCase());
        const year = parseInt(match[3], 10);
        if (monthIndex === -1) return null;
        const date = new Date(year, monthIndex, day);
        return isNaN(date.getTime()) ? null : date;
    }

    function getWorkingDate() {
        const env = window.Environment || {};
        const raw = env.workingDate || env.WorkingDate || env.systemDate || env.SystemDate;
        if (raw) {
            const d = new Date(raw);
            if (!isNaN(d.getTime())) return d;
        }
        return new Date();
    }

    // ═══════════════════════════════════════════════════════════════════
    // UI HELPERS
    // ═══════════════════════════════════════════════════════════════════

    function showLoading(show) {
        const overlay = document.getElementById('pageLoadingOverlay');
        if (overlay) overlay.style.display = show ? 'flex' : 'none';
    }

    function showSuccess(message) {
        const appCore = getAppCore();
        showValidationSummary(message, 'success');
        appCore?.showToastMessage?.(message, 'success') || console.log('✅', message);
    }

    function showError(message) {
        const appCore = getAppCore();
        showValidationSummary(message, 'error');
        appCore?.showToastMessage?.(message, 'error') || console.error('❌', message);
    }

    function showWarning(message) {
        const appCore = getAppCore();
        showValidationSummary(message, 'warning');
        appCore?.showToastMessage?.(message, 'warning') || console.warn('⚠️', message);
    }

    function showInfo(message) {
        const appCore = getAppCore();
        showValidationSummary(message, 'info');
        appCore?.showToastMessage?.(message, 'info') || console.log('ℹ️', message);
    }

    function showValidationSummary(message, variant) {
        const summary = document.getElementById('ca_validationSummary');
        if (!summary) return;

        const textEl = summary.querySelector('.validation-summary__text');
        const iconEl = summary.querySelector('.validation-summary__icon');

        if (textEl) textEl.textContent = String(message || '');

        summary.classList.remove('validation-summary--success');
        // Styles only define default (error-like) and success; map others to default.
        const isSuccess = String(variant || '').toLowerCase() === 'success';
        if (isSuccess) summary.classList.add('validation-summary--success');

        if (iconEl) {
            iconEl.className = isSuccess
                ? 'bi bi-check-circle validation-summary__icon'
                : 'bi bi-exclamation-octagon validation-summary__icon';
        }

        summary.classList.add('is-visible');
    }

    function hideValidationSummary() {
        const summary = document.getElementById('ca_validationSummary');
        if (!summary) return;
        summary.classList.remove('is-visible', 'validation-summary--success');
        const textEl = summary.querySelector('.validation-summary__text');
        if (textEl) textEl.textContent = '';
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = String(str || '');
        return div.innerHTML;
    }

    function escapeXml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    // ═══════════════════════════════════════════════════════════════════
    // EXPOSE PUBLIC API
    // ═══════════════════════════════════════════════════════════════════

    window.CenterAttendanceModule = {
        init,
        handleView,
        handleEdit,
        handleDelete,
        handleSave,
        handleCancel,
        getState: () => ({ ...state })
    };

    // Auto-initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('✅ Center Attendance module loaded');
})();
