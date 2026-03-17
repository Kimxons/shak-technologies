/**
 * Contact Person Module
 * Standardized for KAIRO MVC using AppCore.invokeControllerAsync
 */
(function () {
    'use strict';

    if (window.StaticDataContactPersonModule) {
        return;
    }

    // ── Constants ─────────────────────────────────────────────────
    const MODES = {
        VIEW: 'View',
        ADD: 'Add',
        EDIT: 'Edit'
    };

    const API = {
        GET: 'StaticData/ContactPerson/get',
        SAVE: 'StaticData/ContactPerson/save',
        DELETE: 'StaticData/ContactPerson/delete'
    };

    // ── State ─────────────────────────────────────────────────────
    const state = {
        mode: MODES.VIEW,
        hasLoadedRecord: false,
        canAddFromView: false,
        isDirty: false,
        searchKey: null,
        createdBy: null,
        createdOn: null
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
        return document.querySelector('#contactPersonFormToken input[name="__RequestVerificationToken"]')?.value || '';
    }

    function pickValue(obj, keys) {
        if (!obj || typeof obj !== 'object') return '';
        for (const key of keys) {
            if (obj[key] !== undefined && obj[key] !== null) {
                return String(obj[key]);
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
        var overlay = el('contactPersonLoadingOverlay');
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

        var panel = el('contactPersonMessagePanel');
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

    function isContactPersonRecord(row) {
        if (!row || typeof row !== 'object' || Array.isArray(row)) return false;
        return Boolean(row.ContactPersonID || row.ContactPersonId || row.ContactPersonDesc || row.Name);
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

    // ── Form management ───────────────────────────────────────────

    function resetAuditFields() {
        if (el('cpCreatedBy')) el('cpCreatedBy').textContent = '-';
        if (el('cpCreatedOn')) el('cpCreatedOn').textContent = '-';
        if (el('cpModifiedBy')) el('cpModifiedBy').textContent = '-';
        if (el('cpModifiedOn')) el('cpModifiedOn').textContent = '-';
    }

    function clearForm(keepId) {
        var contactPersonId = keepId ? (el('ContactPersonID')?.value || '') : '';

        if (el('ContactPersonID')) el('ContactPersonID').value = contactPersonId;
        if (el('ContactPersonDesc')) el('ContactPersonDesc').value = '';
        if (el('Title')) el('Title').value = '';
        if (el('Phone')) el('Phone').value = '';
        if (el('Email')) el('Email').value = '';
        if (el('IsActive')) el('IsActive').checked = false;
        resetAuditFields();

        state.hasLoadedRecord = false;
        state.searchKey = keepId ? contactPersonId : null;
        state.createdBy = null;
        state.createdOn = null;
        state.isDirty = false;
    }

    function applyContactPerson(data) {
        if (!data) return;

        if (el('ContactPersonID')) el('ContactPersonID').value = pickValue(data, ['ContactPersonID', 'ContactPersonId', 'ID']);
        if (el('ContactPersonDesc')) el('ContactPersonDesc').value = pickValue(data, ['ContactPersonDesc', 'Name', 'ContactPersonName']);

        // Title normalization
        var titleRaw = pickValue(data, ['Title', 'title']);
        if (el('Title')) {
            var titleSelect = el('Title');
            var matched = false;
            for (var i = 0; i < titleSelect.options.length; i++) {
                if (titleSelect.options[i].value.toLowerCase() === titleRaw.toLowerCase()) {
                    titleSelect.selectedIndex = i;
                    matched = true;
                    break;
                }
            }
            if (!matched) titleSelect.value = titleRaw;
        }

        if (el('Phone')) el('Phone').value = pickValue(data, ['Phone', 'PhoneNumber', 'Telephone']);
        if (el('Email')) el('Email').value = pickValue(data, ['Email', 'EmailAddress']);

        var isActiveRaw = pickValue(data, ['IsActive', 'Active']);
        if (el('IsActive')) {
            var normalized = String(isActiveRaw || '').toLowerCase();
            el('IsActive').checked = normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'y';
        }

        // Audit fields
        if (el('cpCreatedBy')) el('cpCreatedBy').textContent = pickValue(data, ['CreatedBy']) || '-';
        if (el('cpCreatedOn')) el('cpCreatedOn').textContent = formatAuditDate(pickValue(data, ['CreatedOn', 'CreatedDate']));
        if (el('cpModifiedBy')) el('cpModifiedBy').textContent = pickValue(data, ['ModifiedBy']) || '-';
        if (el('cpModifiedOn')) el('cpModifiedOn').textContent = formatAuditDate(pickValue(data, ['ModifiedOn', 'ModifiedDate']));

        state.createdBy = pickValue(data, ['CreatedBy']) || null;
        state.createdOn = pickValue(data, ['CreatedOn', 'CreatedDate']) || null;
    }

    // ── Mode pill ─────────────────────────────────────────────────

    function updateModePill(mode) {
        var pill = document.querySelector('#contactPersonModule [data-page-function-pill]');
        if (pill) pill.textContent = 'Mode \u00b7 ' + mode;
    }

    // ── Mode management ───────────────────────────────────────────

    function setMode(mode) {
        state.mode = mode;
        var isEditing = mode === MODES.ADD || mode === MODES.EDIT;

        if (!isEditing) state.isDirty = false;

        // Enable/disable form fields
        var editableIds = ['ContactPersonDesc', 'Title', 'Phone', 'Email', 'IsActive'];
        editableIds.forEach(function (id) {
            var node = el(id);
            if (!node) return;
            node.disabled = !isEditing;
            if (id === 'ContactPersonDesc') {
                if (isEditing) node.removeAttribute('readonly');
                else node.setAttribute('readonly', 'readonly');
            }
        });

        // ContactPersonID always stays enabled (data-always-enabled)
        var cpIdInput = el('ContactPersonID');
        if (cpIdInput) {
            cpIdInput.disabled = (mode === MODES.EDIT);
        }

        // Button states
        var btnView = document.querySelector('[data-contactperson-mode="View"]');
        var btnAdd = document.querySelector('[data-contactperson-mode="Add"]');
        var btnEdit = document.querySelector('[data-contactperson-mode="Edit"]');
        var btnDelete = document.querySelector('[data-contactperson-action="delete"]');
        var btnSave = document.querySelector('[data-contactperson-action="save"]');
        var btnCancel = document.querySelector('[data-contactperson-action="cancel"]');

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
            // ADD or EDIT
            setDisabled(btnView, true);
            setDisabled(btnAdd, true);
            setDisabled(btnEdit, true);
            setDisabled(btnDelete, true);
            setDisabled(btnSave, false);
            setDisabled(btnCancel, false);
        }

        updateModePill(mode);

        // Notify parent page to re-sync action panel
        document.dispatchEvent(new CustomEvent('contactperson-mode-changed', { detail: { mode: mode } }));
    }

    // ── API invoke ────────────────────────────────────────────────

    async function invoke(endpoint, payload) {
        var headers = {};
        var csrfToken = getCsrfToken();
        if (csrfToken) headers.RequestVerificationToken = csrfToken;
        return AppCore.invokeControllerAsync(endpoint, payload, headers);
    }

    // ── Smart Add: prepare missing-record state ───────────────────

    function prepareMissingRecordState(contactPersonId) {
        clearForm(false);
        if (el('ContactPersonID')) el('ContactPersonID').value = contactPersonId || '';
        state.searchKey = contactPersonId || null;
        state.canAddFromView = Boolean(contactPersonId);
        setMode(MODES.VIEW);
    }

    // ── CRUD operations ───────────────────────────────────────────

    async function loadContactPerson(showToast) {
        var id = (el('ContactPersonID')?.value || '').trim();
        if (!id) {
            showMsg('Enter Contact Person ID.', 'warning');
            return;
        }

        showLoading(true);
        try {
            var res = await invoke(API.GET, {
                ContactPersonID: id,
                Direction: 0,
                OperatorID: getOperatorId()
            });

            var row = extractRow(res);

            if (isSuccessfulResponse(res) && isContactPersonRecord(row)) {
                applyContactPerson(row);
                state.hasLoadedRecord = true;
                state.canAddFromView = false;
                state.searchKey = id;
                setMode(MODES.VIEW);
                if (showToast) showMsg('Contact person loaded.', 'success');
            } else {
                // Record not found — enable Add
                prepareMissingRecordState(id);
                if (showToast) {
                    showMsg(getResponseMessage(res, 'Contact person not found. Click Add to create it.'), 'warning');
                }
            }
        } catch (err) {
            console.error('[ContactPerson] loadContactPerson error:', err);
            showMsg('Error loading contact person.', 'error');
        } finally {
            showLoading(false);
        }
    }

    async function saveContactPerson() {
        if (state.mode !== MODES.ADD && state.mode !== MODES.EDIT) {
            showMsg('Switch to Add or Edit before saving.', 'warning');
            return;
        }

        var contactPersonId = (el('ContactPersonID')?.value || '').trim();
        var contactPersonDesc = (el('ContactPersonDesc')?.value || '').trim();

        if (!contactPersonId) { showMsg('Enter Contact Person ID.', 'warning'); return; }
        if (!contactPersonDesc) { showMsg('Enter Contact Person Name.', 'warning'); return; }

        var now = new Date().toISOString();
        var payload = {
            ContactPersonID: contactPersonId,
            ContactPersonDesc: contactPersonDesc,
            Title: (el('Title')?.value || '').trim(),
            Phone: (el('Phone')?.value || '').trim(),
            Email: (el('Email')?.value || '').trim(),
            IsActive: !!el('IsActive')?.checked,
            CreatedBy: state.createdBy || getOperatorId(),
            CreatedOn: state.createdOn || now,
            ModifiedBy: getOperatorId(),
            ModifiedOn: now,
            NewRecord: state.mode === MODES.ADD ? 1 : 0,
            OperatorID: getOperatorId()
        };

        showLoading(true);
        try {
            var res = await invoke(API.SAVE, payload);

            if (isSuccessfulResponse(res)) {
                showMsg(getResponseMessage(res, 'Contact person saved successfully.'), 'success');
                state.isDirty = false;
                state.hasLoadedRecord = true;
                state.canAddFromView = false;
                state.searchKey = contactPersonId;
                setMode(MODES.VIEW);
                await loadContactPerson(false);
            } else {
                showMsg(getResponseMessage(res, 'Save failed.'), 'error');
            }
        } catch (err) {
            console.error('[ContactPerson] saveContactPerson error:', err);
            showMsg('Error saving contact person.', 'error');
        } finally {
            showLoading(false);
        }
    }

    async function deleteContactPerson() {
        if (!state.hasLoadedRecord) {
            showMsg('Load a record before deleting.', 'warning');
            return;
        }

        var contactPersonId = (el('ContactPersonID')?.value || '').trim();
        if (!contactPersonId) { showMsg('Enter Contact Person ID.', 'warning'); return; }

        var confirmed = await AppCore.showConfirmation(
            'Delete Contact Person',
            'Are you sure you want to delete contact person ' + contactPersonId + '?'
        );
        if (!confirmed) return;

        showLoading(true);
        try {
            var res = await invoke(API.DELETE, {
                ContactPersonID: contactPersonId,
                OperatorID: getOperatorId()
            });

            if (isSuccessfulResponse(res)) {
                showMsg(getResponseMessage(res, 'Contact person deleted successfully.'), 'success');
                clearForm(false);
                state.canAddFromView = false;
                setMode(MODES.VIEW);
            } else {
                showMsg(getResponseMessage(res, 'Delete failed.'), 'error');
            }
        } catch (err) {
            console.error('[ContactPerson] deleteContactPerson error:', err);
            showMsg('Error deleting contact person.', 'error');
        } finally {
            showLoading(false);
        }
    }

    // ── Wiring ────────────────────────────────────────────────────

    function wireSectionToggles() {
        var container = el('contactPersonModule');
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
        var form = el('contact-person-form');
        if (!form) return;
        ['change', 'input'].forEach(function (evt) {
            form.addEventListener(evt, function () {
                if (state.mode !== MODES.VIEW) state.isDirty = true;
            });
        });
    }

    function bindActions() {
        // View button → search / load
        document.querySelector('[data-contactperson-mode="View"]')?.addEventListener('click', function () {
            var enteredId = (el('ContactPersonID')?.value || '').trim();
            if (enteredId) {
                loadContactPerson(true);
            } else {
                clearForm(false);
                state.canAddFromView = false;
                setMode(MODES.VIEW);
                showMsg('Enter Contact Person ID to view a record.', 'warning');
            }
        });

        // Add button → smart add (only when canAddFromView is true)
        document.querySelector('[data-contactperson-mode="Add"]')?.addEventListener('click', function () {
            var enteredId = (el('ContactPersonID')?.value || '').trim();
            if (!enteredId) {
                showMsg('Enter Contact Person ID first.', 'warning');
                return;
            }
            clearForm(true);
            state.canAddFromView = false;
            setMode(MODES.ADD);
            showMsg('Add mode — enter contact person details.', 'info');
        });

        // Edit button
        document.querySelector('[data-contactperson-mode="Edit"]')?.addEventListener('click', function () {
            if (!state.hasLoadedRecord) {
                showMsg('Load a record first.', 'warning');
                return;
            }
            setMode(MODES.EDIT);
            showMsg('Edit mode.', 'info');
        });

        // Search (magnifier) button
        document.querySelector('[data-contactperson-action="search"]')?.addEventListener('click', function () {
            loadContactPerson(true);
        });

        // Save
        document.querySelector('[data-contactperson-action="save"]')?.addEventListener('click', saveContactPerson);

        // Delete
        document.querySelector('[data-contactperson-action="delete"]')?.addEventListener('click', deleteContactPerson);

        // Cancel
        document.querySelector('[data-contactperson-action="cancel"]')?.addEventListener('click', function () {
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

    // ── Public API (used by parent StaticData page) ───────────────

    window.StaticDataContactPersonModule = {
        init: init,
        view: function () {
            var enteredId = (el('ContactPersonID')?.value || '').trim();
            if (enteredId) loadContactPerson(true);
            else showMsg('Enter Contact Person ID to view.', 'warning');
        },
        add: function () {
            var enteredId = (el('ContactPersonID')?.value || '').trim();
            if (!enteredId) { showMsg('Enter Contact Person ID first.', 'warning'); return; }
            clearForm(true);
            state.canAddFromView = false;
            setMode(MODES.ADD);
            showMsg('Add mode — enter contact person details.', 'info');
        },
        edit: function () {
            if (!state.hasLoadedRecord) { showMsg('Load a record first.', 'warning'); return; }
            setMode(MODES.EDIT);
            showMsg('Edit mode.', 'info');
        },
        save: saveContactPerson,
        delete: deleteContactPerson,
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
