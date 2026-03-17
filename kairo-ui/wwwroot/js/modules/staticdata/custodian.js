/**
 * Custodian Module
 * Standardized for KAIRO MVC using AppCore.invokeControllerAsync
 */
(function () {
    'use strict';

    if (window.StaticDataCustodianModule) {
        return;
    }

    // ── Constants ─────────────────────────────────────────────────
    var MODES = {
        VIEW: 'View',
        ADD: 'Add',
        EDIT: 'Edit'
    };

    var API = {
        GET: 'StaticData/api/get-custodian',
        SAVE: 'StaticData/api/add-edit-custodian',
        DELETE: 'StaticData/api/delete-custodian'
    };

    // ── State ─────────────────────────────────────────────────────
    var state = {
        mode: MODES.VIEW,
        hasLoadedRecord: false,
        canAddFromView: false,
        isDirty: false,
        searchKey: null,
        createdBy: null,
        createdOn: null,
        currentUpdateCount: 0
    };

    // ── Helpers ───────────────────────────────────────────────────

    function el(id) {
        return document.getElementById(id);
    }

    function getOperatorId() {
        return (window.AuthService?.getSession?.()?.operatorId
            || window.AuthService?.getSession?.()?.operatorID
            || sessionStorage.getItem('currentOperatorID')
            || localStorage.getItem('OperatorID')
            || 'web_portal');
    }

    function getCsrfToken() {
        return document.querySelector('#custodianFormToken input[name="__RequestVerificationToken"]')?.value || '';
    }

    function pickValue(obj, keys) {
        if (!obj || typeof obj !== 'object') return '';
        // exact match first
        for (var i = 0; i < keys.length; i++) {
            if (obj[keys[i]] !== undefined && obj[keys[i]] !== null) {
                return String(obj[keys[i]]);
            }
        }
        // case-insensitive fallback
        var entries = Object.entries(obj);
        for (var i = 0; i < keys.length; i++) {
            var lk = keys[i].toLowerCase();
            for (var j = 0; j < entries.length; j++) {
                if (entries[j][0].toLowerCase() === lk && entries[j][1] !== undefined && entries[j][1] !== null) {
                    return String(entries[j][1]);
                }
            }
        }
        return '';
    }

    function formatAuditDate(value) {
        if (!value) return '-';
        if (window.GlobalUtils && typeof window.GlobalUtils.formatDateTime === 'function') {
            return window.GlobalUtils.formatDateTime(value);
        }
        var d = new Date(value);
        return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
    }

    // ── Loading overlay ───────────────────────────────────────────

    function showLoading(show) {
        var overlay = el('custodianLoadingOverlay');
        if (overlay) overlay.hidden = !show;
    }

    // ── Messaging ─────────────────────────────────────────────────

    function showMsg(message, type) {
        if (type === 'info' || type === 'success') {
            if (window.AppCore && typeof window.AppCore.showNotification === 'function') {
                window.AppCore.showNotification(message, type);
                return;
            }
        }

        var toast = window.showSystemToast || window.parent?.showSystemToast;
        if (toast) {
            toast(message, {
                variant: type === 'error' ? 'danger' : type === 'warning' ? 'warning' : 'success'
            });
            return;
        }

        var panel = el('custodianMessagePanel');
        var span = panel?.querySelector('span');
        if (panel && span) {
            span.textContent = message;
            panel.className = 'am-message-panel am-message-panel--' + (type || 'info');
            panel.classList.add('show');
            if (type !== 'error') {
                setTimeout(function () { panel.classList.remove('show'); }, 4000);
            }
        }
    }

    // ── Response extraction ───────────────────────────────────────

    function isMetaOnlyObject(obj) {
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
        var keys = Object.keys(obj);
        var metaKeys = ['ResponseCode', 'responseCode', 'ResponseMessage', 'responseMessage',
            'Success', 'success', 'ErrorMessage', 'errorMessage', 'StatusCode', 'statusCode'];
        return keys.length > 0 && keys.every(function (k) { return metaKeys.indexOf(k) >= 0; });
    }

    function extractRow(res) {
        var details = res?.Details || res?.details || res?.data || res?.Data || {};

        if (Array.isArray(details)) {
            var row = details.find(function (d) { return d && typeof d === 'object' && !isMetaOnlyObject(d); });
            return row || null;
        }

        if (details && typeof details === 'object' && !isMetaOnlyObject(details)) {
            var values = Object.values(details);
            for (var i = 0; i < values.length; i++) {
                var value = values[i];
                if (Array.isArray(value) && value.length > 0) {
                    var found = value.find(function (d) { return d && typeof d === 'object' && !isMetaOnlyObject(d); });
                    if (found) return found;
                }
            }
            return details;
        }

        return null;
    }

    function isCustodianRecord(row) {
        if (!row || typeof row !== 'object' || Array.isArray(row)) return false;
        var keys = Object.keys(row).map(function (k) { return k.toLowerCase(); });
        return keys.some(function (k) {
            return k === 'custodianid' || k === 'custodianname' || k === 'name'
                || k === 'department' || k === 'staffid' || k === 'section';
        });
    }

    function isSuccessfulResponse(res) {
        var code = String(res?.ResponseCode || res?.responseCode || res?.data?.ResponseCode || '');
        return !!(res?.success || res?.Success || code === '00');
    }

    function getResponseMessage(res, fallback) {
        return res?.ResponseMessage || res?.responseMessage
            || res?.data?.ResponseMessage || res?.data?.responseMessage
            || res?.ErrorMessage || res?.errorMessage || fallback || '';
    }

    // ── Select helper ─────────────────────────────────────────────

    function setSelectValue(selectEl, value) {
        if (!selectEl) return;
        var v = value == null ? '' : String(value).trim();
        if (!v) { selectEl.value = ''; return; }
        var vLower = v.toLowerCase();
        var match = Array.from(selectEl.options).find(function (o) {
            var ov = String(o.value ?? '').trim().toLowerCase();
            var ot = String(o.textContent ?? '').trim().toLowerCase();
            return ov === vLower || ot === vLower;
        });
        if (match) {
            selectEl.value = match.value;
        } else {
            // Dynamically add option if not found in dropdown
            var opt = document.createElement('option');
            opt.value = v;
            opt.textContent = v;
            selectEl.appendChild(opt);
            selectEl.value = v;
        }
    }

    // ── Form management ───────────────────────────────────────────

    function resetAuditFields() {
        if (el('cusCreatedBy')) el('cusCreatedBy').textContent = '-';
        if (el('cusCreatedOn')) el('cusCreatedOn').textContent = '-';
        if (el('cusModifiedBy')) el('cusModifiedBy').textContent = '-';
        if (el('cusModifiedOn')) el('cusModifiedOn').textContent = '-';
        if (el('cusSupervisedBy')) el('cusSupervisedBy').textContent = '-';
        if (el('cusSupervisedOn')) el('cusSupervisedOn').textContent = '-';
    }

    function clearForm(keepId) {
        var custodianId = keepId ? (el('CustodianID')?.value || '') : '';

        if (el('CustodianID')) el('CustodianID').value = custodianId;
        if (el('CustodianName')) el('CustodianName').value = '';
        if (el('Department')) el('Department').value = '';
        if (el('Section')) el('Section').value = '';
        resetAuditFields();

        state.hasLoadedRecord = false;
        state.searchKey = keepId ? custodianId : null;
        state.createdBy = null;
        state.createdOn = null;
        state.isDirty = false;
        state.currentUpdateCount = 0;
    }

    function applyCustodian(data) {
        if (!data) return;

        // Build normalized key map for resilient field matching
        var keyMap = {};
        Object.keys(data).forEach(function (k) {
            keyMap[k.toLowerCase().replace(/[_\-\s]/g, '')] = { key: k, val: data[k] };
        });

        console.warn('[Custodian] applyCustodian ALL KEYS:', Object.keys(data));
        console.warn('[Custodian] applyCustodian ALL DATA:', JSON.stringify(data, null, 2));

        function findVal(fragments) {
            for (var i = 0; i < fragments.length; i++) {
                var f = fragments[i].toLowerCase().replace(/[_\-\s]/g, '');
                if (keyMap[f] && keyMap[f].val != null && keyMap[f].val !== '') return String(keyMap[f].val);
            }
            return '';
        }

        var idVal = findVal(['CustodianID', 'CustodianId', 'StaffID', 'StaffId', 'ID', 'Id']);
        var nameVal = findVal(['CustodianName', 'Name', 'StaffName', 'FullName', 'Description', 'Custodian_Name']);
        var deptVal = findVal(['Department', 'DepartmentID', 'DepartmentName', 'Dept', 'DeptID']);
        var secVal = findVal(['Section', 'SectionID', 'SectionName']);

        console.warn('[Custodian] Mapped: ID=' + idVal + ', Name=' + nameVal + ', Dept=' + deptVal + ', Section=' + secVal);

        if (el('CustodianID') && idVal) el('CustodianID').value = idVal;
        if (el('CustodianName')) el('CustodianName').value = nameVal;
        setSelectValue(el('Department'), deptVal);
        setSelectValue(el('Section'), secVal);

        // Audit fields
        var createdByVal = findVal(['CreatedBy']);
        var createdOnVal = findVal(['CreatedOn', 'CreatedDate']);
        var modifiedByVal = findVal(['ModifiedBy']);
        var modifiedOnVal = findVal(['ModifiedOn', 'ModifiedDate']);
        var supervisedByVal = findVal(['SupervisedBy']);
        var supervisedOnVal = findVal(['SupervisedOn', 'SupervisedDate']);

        if (el('cusCreatedBy')) el('cusCreatedBy').textContent = createdByVal || '-';
        if (el('cusCreatedOn')) el('cusCreatedOn').textContent = createdOnVal ? formatAuditDate(createdOnVal) : '-';
        if (el('cusModifiedBy')) el('cusModifiedBy').textContent = modifiedByVal || '-';
        if (el('cusModifiedOn')) el('cusModifiedOn').textContent = modifiedOnVal ? formatAuditDate(modifiedOnVal) : '-';
        if (el('cusSupervisedBy')) el('cusSupervisedBy').textContent = supervisedByVal || '-';
        if (el('cusSupervisedOn')) el('cusSupervisedOn').textContent = supervisedOnVal ? formatAuditDate(supervisedOnVal) : '-';

        state.createdBy = createdByVal || null;
        state.createdOn = createdOnVal || null;
        state.currentUpdateCount = data.UpdateCount ?? data.updateCount ?? 0;
    }

    // ── Mode pill ─────────────────────────────────────────────────

    function updateModePill(mode) {
        var pill = document.querySelector('#custodianModule [data-page-function-pill]');
        if (pill) pill.textContent = 'Mode \u00b7 ' + mode;
    }

    // ── Mode management ───────────────────────────────────────────

    function setMode(mode) {
        state.mode = mode;
        var isEditing = mode === MODES.ADD || mode === MODES.EDIT;

        if (!isEditing) state.isDirty = false;

        // Enable/disable form fields
        var editableIds = ['CustodianName', 'Department', 'Section'];
        editableIds.forEach(function (id) {
            var node = el(id);
            if (!node) return;
            node.disabled = !isEditing;
        });

        // CustodianID always stays enabled (data-always-enabled)
        var cusIdInput = el('CustodianID');
        if (cusIdInput) {
            cusIdInput.disabled = (mode === MODES.EDIT);
        }

        // Button states
        var btnView = document.querySelector('[data-custodian-mode="View"]');
        var btnAdd = document.querySelector('[data-custodian-mode="Add"]');
        var btnEdit = document.querySelector('[data-custodian-mode="Edit"]');
        var btnDelete = document.querySelector('[data-custodian-action="delete"]');
        var btnSave = document.querySelector('[data-custodian-action="save"]');
        var btnCancel = document.querySelector('[data-custodian-action="cancel"]');

        var setDisabled = function (button, disabled) {
            if (!button) return;
            button.disabled = !!disabled;
        };

        if (mode === MODES.VIEW) {
            setDisabled(btnView, false);
            setDisabled(btnAdd, !state.canAddFromView);
            setDisabled(btnEdit, !state.hasLoadedRecord);
            setDisabled(btnDelete, !state.hasLoadedRecord);
            setDisabled(btnSave, true);
            setDisabled(btnCancel, !state.hasLoadedRecord && !state.canAddFromView);
        } else {
            setDisabled(btnView, true);
            setDisabled(btnAdd, true);
            setDisabled(btnEdit, true);
            setDisabled(btnDelete, true);
            setDisabled(btnSave, false);
            setDisabled(btnCancel, false);
        }

        updateModePill(mode);

        // Notify parent page to re-sync action panel
        document.dispatchEvent(new CustomEvent('custodian-mode-changed', { detail: { mode: mode } }));
    }

    // ── API invoke ────────────────────────────────────────────────

    async function invoke(endpoint, payload) {
        var headers = {};
        var csrfToken = getCsrfToken();
        if (csrfToken) headers.RequestVerificationToken = csrfToken;
        return AppCore.invokeControllerAsync(endpoint, payload, headers);
    }

    // ── Smart Add: prepare missing-record state ───────────────────

    function prepareMissingRecordState(custodianId) {
        clearForm(false);
        if (el('CustodianID')) el('CustodianID').value = custodianId || '';
        state.searchKey = custodianId || null;
        state.canAddFromView = Boolean(custodianId);
        setMode(MODES.VIEW);
    }

    // ── CRUD operations ───────────────────────────────────────────

    async function loadCustodian(showToast) {
        var id = (el('CustodianID')?.value || '').trim();
        if (!id) {
            showMsg('Enter Custodian ID.', 'warning');
            return;
        }

        showLoading(true);
        try {
            var res = await invoke(API.GET, {
                CustodianID: id,
                Direction: 0,
                OperatorID: getOperatorId()
            });

            var row = extractRow(res);

            console.log('[Custodian] extractRow result:', row);
            console.log('[Custodian] extractRow keys:', row ? Object.keys(row) : 'null');

            if (isSuccessfulResponse(res) && isCustodianRecord(row)) {
                applyCustodian(row);
                state.hasLoadedRecord = true;
                state.canAddFromView = false;
                state.searchKey = id;
                setMode(MODES.VIEW);
                if (showToast) showMsg('Custodian loaded.', 'success');
            } else {
                prepareMissingRecordState(id);
                if (showToast) {
                    showMsg(getResponseMessage(res, 'Custodian not found. Click Add to create it.'), 'warning');
                }
            }
        } catch (err) {
            console.error('[Custodian] loadCustodian error:', err);
            showMsg('Error loading custodian.', 'error');
        } finally {
            showLoading(false);
        }
    }

    async function saveCustodian() {
        if (state.mode !== MODES.ADD && state.mode !== MODES.EDIT) {
            showMsg('Switch to Add or Edit before saving.', 'warning');
            return;
        }

        var custodianId = (el('CustodianID')?.value || '').trim();
        var custodianName = (el('CustodianName')?.value || '').trim();

        if (!custodianId) { showMsg('Enter Custodian ID.', 'warning'); return; }
        if (!custodianName) { showMsg('Enter Custodian Name.', 'warning'); return; }

        var dept = (el('Department')?.value || '').trim();
        if (!dept) { showMsg('Select a Department.', 'warning'); return; }

        var now = new Date().toISOString();
        var payload = {
            CustodianID: custodianId,
            Name: custodianName,
            Department: dept,
            Section: (el('Section')?.value || '').trim(),
            CreatedBy: state.createdBy || getOperatorId(),
            CreatedOn: state.createdOn || now,
            ModifiedBy: getOperatorId(),
            ModifiedOn: now,
            NewRecord: state.mode === MODES.ADD ? 1 : (state.currentUpdateCount || 0),
            OperatorID: getOperatorId()
        };

        showLoading(true);
        try {
            var res = await invoke(API.SAVE, payload);

            if (isSuccessfulResponse(res)) {
                showMsg(getResponseMessage(res, 'Custodian saved successfully.'), 'success');
                state.isDirty = false;
                state.hasLoadedRecord = true;
                state.canAddFromView = false;
                state.searchKey = custodianId;
                setMode(MODES.VIEW);
                await loadCustodian(false);
            } else {
                showMsg(getResponseMessage(res, 'Save failed.'), 'error');
            }
        } catch (err) {
            console.error('[Custodian] saveCustodian error:', err);
            showMsg('Error saving custodian.', 'error');
        } finally {
            showLoading(false);
        }
    }

    async function deleteCustodian() {
        if (!state.hasLoadedRecord) {
            showMsg('Load a record before deleting.', 'warning');
            return;
        }

        var custodianId = (el('CustodianID')?.value || '').trim();
        if (!custodianId) { showMsg('Enter Custodian ID.', 'warning'); return; }

        var confirmed = await AppCore.showConfirmation(
            'Delete Custodian',
            'Are you sure you want to delete custodian ' + custodianId + '?'
        );
        if (!confirmed) return;

        showLoading(true);
        try {
            var res = await invoke(API.DELETE, {
                CustodianID: custodianId,
                OperatorID: getOperatorId()
            });

            if (isSuccessfulResponse(res)) {
                showMsg(getResponseMessage(res, 'Custodian deleted successfully.'), 'success');
                clearForm(false);
                state.canAddFromView = false;
                setMode(MODES.VIEW);
            } else {
                showMsg(getResponseMessage(res, 'Delete failed.'), 'error');
            }
        } catch (err) {
            console.error('[Custodian] deleteCustodian error:', err);
            showMsg('Error deleting custodian.', 'error');
        } finally {
            showLoading(false);
        }
    }

    // ── Wiring ────────────────────────────────────────────────────

    function wireSectionToggles() {
        var container = el('custodianModule');
        if (!container) return;
        container.querySelectorAll('[data-section-toggle]').forEach(function (header) {
            header.addEventListener('click', function () {
                var section = header.closest('.form-section');
                if (!section) return;
                section.classList.toggle('collapsed');
                var button = header.querySelector('.section-toggle-btn');
                if (button) {
                    button.setAttribute('aria-expanded',
                        section.classList.contains('collapsed') ? 'false' : 'true');
                }
            });
        });
    }

    function wireFormChanges() {
        var form = el('custodian-form');
        if (!form) return;
        ['change', 'input'].forEach(function (evt) {
            form.addEventListener(evt, function () {
                if (state.mode !== MODES.VIEW) state.isDirty = true;
            });
        });
    }

    function bindActions() {
        document.querySelector('[data-custodian-mode="View"]')?.addEventListener('click', function () {
            var enteredId = (el('CustodianID')?.value || '').trim();
            if (enteredId) {
                loadCustodian(true);
            } else {
                clearForm(false);
                state.canAddFromView = false;
                setMode(MODES.VIEW);
                showMsg('Enter Custodian ID to view a record.', 'warning');
            }
        });

        document.querySelector('[data-custodian-mode="Add"]')?.addEventListener('click', function () {
            var enteredId = (el('CustodianID')?.value || '').trim();
            if (!enteredId) {
                showMsg('Enter Custodian ID first.', 'warning');
                return;
            }
            clearForm(true);
            state.canAddFromView = false;
            setMode(MODES.ADD);
            showMsg('Add mode — enter custodian details.', 'info');
        });

        document.querySelector('[data-custodian-mode="Edit"]')?.addEventListener('click', function () {
            if (!state.hasLoadedRecord) {
                showMsg('Load a record first.', 'warning');
                return;
            }
            setMode(MODES.EDIT);
            showMsg('Edit mode.', 'info');
        });

        document.querySelector('[data-custodian-action="search"]')?.addEventListener('click', function () {
            loadCustodian(true);
        });

        document.querySelector('[data-custodian-action="save"]')?.addEventListener('click', saveCustodian);

        document.querySelector('[data-custodian-action="delete"]')?.addEventListener('click', deleteCustodian);

        document.querySelector('[data-custodian-action="cancel"]')?.addEventListener('click', function () {
            clearForm(false);
            state.canAddFromView = false;
            setMode(MODES.VIEW);
            showMsg('Cancelled.', 'info');
        });
    }

    // ── Init ──────────────────────────────────────────────────────

    function init() {
        wireSectionToggles();
        wireFormChanges();
        bindActions();
        setMode(MODES.VIEW);
    }

    // ── Public API (used by parent page) ──────────────────────────

    window.StaticDataCustodianModule = {
        init: init,
        view: function () {
            var enteredId = (el('CustodianID')?.value || '').trim();
            if (enteredId) loadCustodian(true);
            else showMsg('Enter Custodian ID to view.', 'warning');
        },
        add: function () {
            var enteredId = (el('CustodianID')?.value || '').trim();
            if (!enteredId) { showMsg('Enter Custodian ID first.', 'warning'); return; }
            clearForm(true);
            state.canAddFromView = false;
            setMode(MODES.ADD);
            showMsg('Add mode — enter custodian details.', 'info');
        },
        edit: function () {
            if (!state.hasLoadedRecord) { showMsg('Load a record first.', 'warning'); return; }
            setMode(MODES.EDIT);
            showMsg('Edit mode.', 'info');
        },
        save: saveCustodian,
        delete: deleteCustodian,
        cancel: function () {
            clearForm(false);
            state.canAddFromView = false;
            setMode(MODES.VIEW);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
