/**
 * Location Module
 * Standardized for KAIRO MVC using AppCore.invokeControllerAsync
 */
(function () {
    'use strict';

    if (window.StaticDataLocationModule) {
        return;
    }

    // ── Constants ─────────────────────────────────────────────────
    const MODES = {
        VIEW: 'View',
        ADD: 'Add',
        EDIT: 'Edit'
    };

    const API = {
        GET: 'StaticData/api/get-location',
        SAVE: 'StaticData/api/add-edit-location',
        DELETE: 'StaticData/api/delete-location'
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
        return document.querySelector('#locationFormToken input[name="__RequestVerificationToken"]')?.value || '';
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
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
    }

    // ── Loading overlay ───────────────────────────────────────────

    function showLoading(show) {
        const overlay = el('locationLoadingOverlay');
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

        const toast = window.showSystemToast || window.parent?.showSystemToast;
        if (toast) {
            toast(message, {
                variant: type === 'error' ? 'danger' : type === 'warning' ? 'warning' : 'success'
            });
            return;
        }

        const panel = el('locationMessagePanel');
        const span = panel?.querySelector('span');
        if (panel && span) {
            span.textContent = message;
            panel.className = 'am-message-panel am-message-panel--' + (type || 'info');
            panel.classList.add('show');
            if (type !== 'error') {
                setTimeout(() => panel.classList.remove('show'), 4000);
            }
        }
    }

    // ── Response extraction ───────────────────────────────────────

    function isMetaOnlyObject(obj) {
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
        const keys = Object.keys(obj);
        const metaKeys = ['ResponseCode', 'responseCode', 'ResponseMessage', 'responseMessage',
            'Success', 'success', 'ErrorMessage', 'errorMessage', 'StatusCode', 'statusCode'];
        return keys.length > 0 && keys.every(k => metaKeys.includes(k));
    }

    function extractRow(res) {
        const details = res?.Details || res?.details || res?.data || res?.Data || {};

        if (Array.isArray(details)) {
            const row = details.find(d => d && typeof d === 'object' && !isMetaOnlyObject(d));
            return row || null;
        }

        if (details && typeof details === 'object' && !isMetaOnlyObject(details)) {
            for (const value of Object.values(details)) {
                if (Array.isArray(value) && value.length > 0) {
                    const row = value.find(d => d && typeof d === 'object' && !isMetaOnlyObject(d));
                    if (row) return row;
                }
            }
            return details;
        }

        return null;
    }

    function isLocationRecord(row) {
        if (!row || typeof row !== 'object' || Array.isArray(row)) return false;
        return Boolean(row.LocationID || row.LocationId || row.LocationName || row.LocationDesc);
    }

    function isSuccessfulResponse(res) {
        const code = String(res?.ResponseCode || res?.responseCode || res?.data?.ResponseCode || '');
        return !!(res?.success || res?.Success || code === '00');
    }

    function getResponseMessage(res, fallback) {
        return res?.ResponseMessage || res?.responseMessage
            || res?.data?.ResponseMessage || res?.data?.responseMessage
            || res?.ErrorMessage || res?.errorMessage || fallback || '';
    }

    // ── Form management ───────────────────────────────────────────

    function resetAuditFields() {
        if (el('CreatedBy')) el('CreatedBy').textContent = '-';
        if (el('CreatedOn')) el('CreatedOn').textContent = '-';
        if (el('ModifiedBy')) el('ModifiedBy').textContent = '-';
        if (el('ModifiedOn')) el('ModifiedOn').textContent = '-';
    }

    function clearForm(keepId) {
        const locationId = keepId ? (el('LocationID')?.value || '') : '';

        if (el('LocationID')) el('LocationID').value = locationId;
        if (el('LocationDesc')) el('LocationDesc').value = '';
        if (el('Building')) el('Building').value = '';
        if (el('RoomOffice')) el('RoomOffice').value = '';
        if (el('Store')) el('Store').checked = false;
        resetAuditFields();

        state.hasLoadedRecord = false;
        state.searchKey = keepId ? locationId : null;
        state.createdBy = null;
        state.createdOn = null;
        state.isDirty = false;
    }

    function applyLocation(data) {
        if (!data) return;

        if (el('LocationID')) el('LocationID').value = pickValue(data, ['LocationID', 'LocationId', 'ID']);
        if (el('LocationDesc')) el('LocationDesc').value = pickValue(data, ['LocationName', 'LocationDesc', 'Name']);
        if (el('Building')) el('Building').value = pickValue(data, ['Building']);
        if (el('RoomOffice')) el('RoomOffice').value = pickValue(data, ['RoomOffice', 'Room', 'Office']);

        const storeRaw = pickValue(data, ['Store']);
        if (el('Store')) {
            const normalized = String(storeRaw || '').toLowerCase();
            el('Store').checked = normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'y';
        }

        // Audit fields
        if (el('CreatedBy')) el('CreatedBy').textContent = pickValue(data, ['CreatedBy']) || '-';
        if (el('CreatedOn')) el('CreatedOn').textContent = formatAuditDate(pickValue(data, ['CreatedOn', 'CreatedDate']));
        if (el('ModifiedBy')) el('ModifiedBy').textContent = pickValue(data, ['ModifiedBy']) || '-';
        if (el('ModifiedOn')) el('ModifiedOn').textContent = formatAuditDate(pickValue(data, ['ModifiedOn', 'ModifiedDate']));

        state.createdBy = pickValue(data, ['CreatedBy']) || null;
        state.createdOn = pickValue(data, ['CreatedOn', 'CreatedDate']) || null;
    }

    // ── Mode pill ─────────────────────────────────────────────────

    function updateModePill(mode) {
        const pill = document.querySelector('[data-page-function-pill]');
        if (pill) pill.textContent = 'Mode \u00b7 ' + mode;
    }

    // ── Mode management ───────────────────────────────────────────

    function setMode(mode, initial) {
        state.mode = mode;
        const isEditing = mode === MODES.ADD || mode === MODES.EDIT;

        if (!isEditing) state.isDirty = false;

        // Enable/disable form fields
        const editableIds = ['LocationDesc', 'Building', 'RoomOffice', 'Store'];
        editableIds.forEach((id) => {
            const node = el(id);
            if (!node) return;
            node.disabled = !isEditing;
            if (id === 'LocationDesc') {
                if (isEditing) node.removeAttribute('readonly');
                else node.setAttribute('readonly', 'readonly');
            }
        });

        // LocationID always stays enabled (data-always-enabled)
        const locIdInput = el('LocationID');
        if (locIdInput) {
            locIdInput.disabled = (mode === MODES.EDIT);
        }

        // Button states
        const btnView = document.querySelector('[data-location-mode="View"]');
        const btnAdd = document.querySelector('[data-location-mode="Add"]');
        const btnEdit = document.querySelector('[data-location-mode="Edit"]');
        const btnDelete = document.querySelector('[data-location-action="delete"]');
        const btnSave = document.querySelector('[data-location-action="save"]');
        const btnCancel = document.querySelector('[data-location-action="cancel"]');

        const setDisabled = (button, disabled) => {
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
        document.dispatchEvent(new CustomEvent('location-mode-changed', { detail: { mode } }));
    }

    // ── API invoke ────────────────────────────────────────────────

    async function invoke(endpoint, payload) {
        const headers = {};
        const csrfToken = getCsrfToken();
        if (csrfToken) headers.RequestVerificationToken = csrfToken;
        return AppCore.invokeControllerAsync(endpoint, payload, headers);
    }

    // ── Smart Add: prepare missing-record state ───────────────────

    function prepareMissingRecordState(locationId) {
        clearForm(false);
        if (el('LocationID')) el('LocationID').value = locationId || '';
        state.searchKey = locationId || null;
        state.canAddFromView = Boolean(locationId);
        setMode(MODES.VIEW, false);
    }

    // ── CRUD operations ───────────────────────────────────────────

    async function loadLocation(showToast) {
        const id = (el('LocationID')?.value || '').trim();
        if (!id) {
            showMsg('Enter Location ID.', 'warning');
            return;
        }

        showLoading(true);
        try {
            const res = await invoke(API.GET, {
                LocationID: id,
                Direction: 0,
                OperatorID: getOperatorId()
            });

            const row = extractRow(res);

            if (isSuccessfulResponse(res) && isLocationRecord(row)) {
                applyLocation(row);
                state.hasLoadedRecord = true;
                state.canAddFromView = false;
                state.searchKey = id;
                setMode(MODES.VIEW, false);
                if (showToast) showMsg('Location loaded.', 'success');
            } else {
                // Record not found — enable Add
                prepareMissingRecordState(id);
                if (showToast) {
                    showMsg(getResponseMessage(res, 'Location not found. Click Add to create it.'), 'warning');
                }
            }
        } catch (err) {
            console.error('[Location] loadLocation error:', err);
            showMsg('Error loading location.', 'error');
        } finally {
            showLoading(false);
        }
    }

    async function saveLocation() {
        if (state.mode !== MODES.ADD && state.mode !== MODES.EDIT) {
            showMsg('Switch to Add or Edit before saving.', 'warning');
            return;
        }

        const locationId = (el('LocationID')?.value || '').trim();
        const locationName = (el('LocationDesc')?.value || '').trim();

        if (!locationId) { showMsg('Enter Location ID.', 'warning'); return; }
        if (!locationName) { showMsg('Enter Location Name.', 'warning'); return; }

        const now = new Date().toISOString();
        const payload = {
            LocationID: locationId,
            LocationName: locationName,
            Building: (el('Building')?.value || '').trim(),
            RoomOffice: (el('RoomOffice')?.value || '').trim(),
            Store: !!el('Store')?.checked,
            CreatedBy: state.createdBy || getOperatorId(),
            CreatedOn: state.createdOn || now,
            ModifiedBy: getOperatorId(),
            ModifiedOn: now,
            NewRecord: state.mode === MODES.ADD ? 1 : 0,
            OperatorID: getOperatorId()
        };

        showLoading(true);
        try {
            const res = await invoke(API.SAVE, payload);

            if (isSuccessfulResponse(res)) {
                showMsg(getResponseMessage(res, 'Location saved successfully.'), 'success');
                state.isDirty = false;
                state.hasLoadedRecord = true;
                state.canAddFromView = false;
                state.searchKey = locationId;
                setMode(MODES.VIEW, false);
                await loadLocation(false);
            } else {
                showMsg(getResponseMessage(res, 'Save failed.'), 'error');
            }
        } catch (err) {
            console.error('[Location] saveLocation error:', err);
            showMsg('Error saving location.', 'error');
        } finally {
            showLoading(false);
        }
    }

    async function deleteLocation() {
        if (!state.hasLoadedRecord) {
            showMsg('Load a record before deleting.', 'warning');
            return;
        }

        const locationId = (el('LocationID')?.value || '').trim();
        if (!locationId) { showMsg('Enter Location ID.', 'warning'); return; }

        const confirmed = await AppCore.showConfirmation(
            'Delete Location',
            'Are you sure you want to delete location ' + locationId + '?'
        );
        if (!confirmed) return;

        showLoading(true);
        try {
            const res = await invoke(API.DELETE, {
                LocationID: locationId,
                OperatorID: getOperatorId()
            });

            if (isSuccessfulResponse(res)) {
                showMsg(getResponseMessage(res, 'Location deleted successfully.'), 'success');
                clearForm(false);
                state.canAddFromView = false;
                setMode(MODES.VIEW, true);
            } else {
                showMsg(getResponseMessage(res, 'Delete failed.'), 'error');
            }
        } catch (err) {
            console.error('[Location] deleteLocation error:', err);
            showMsg('Error deleting location.', 'error');
        } finally {
            showLoading(false);
        }
    }

    // ── Wiring ────────────────────────────────────────────────────

    function wireSectionToggles() {
        document.querySelectorAll('[data-section-toggle]').forEach((header) => {
            header.addEventListener('click', () => {
                const section = header.closest('.form-section');
                if (!section) return;
                section.classList.toggle('collapsed');
                const button = header.querySelector('.section-toggle-btn');
                if (button) {
                    button.setAttribute('aria-expanded',
                        section.classList.contains('collapsed') ? 'false' : 'true');
                }
            });
        });
    }

    function wireFormChanges() {
        const form = el('location-form');
        if (!form) return;
        ['change', 'input'].forEach(evt => {
            form.addEventListener(evt, () => {
                if (state.mode !== MODES.VIEW) state.isDirty = true;
            });
        });
    }

    function bindActions() {
        // View button → search / load
        document.querySelector('[data-location-mode="View"]')?.addEventListener('click', () => {
            const enteredId = (el('LocationID')?.value || '').trim();
            if (enteredId) {
                loadLocation(true);
            } else {
                clearForm(false);
                state.canAddFromView = false;
                setMode(MODES.VIEW, true);
                showMsg('Enter Location ID to view a record.', 'warning');
            }
        });

        // Add button → smart add (only when canAddFromView is true)
        document.querySelector('[data-location-mode="Add"]')?.addEventListener('click', () => {
            const enteredId = (el('LocationID')?.value || '').trim();
            if (!enteredId) {
                showMsg('Enter Location ID first.', 'warning');
                return;
            }
            // Keep the ID, clear the rest, switch to ADD
            clearForm(true);
            state.canAddFromView = false;
            setMode(MODES.ADD, false);
            showMsg('Add mode — enter location details.', 'info');
        });

        // Edit button
        document.querySelector('[data-location-mode="Edit"]')?.addEventListener('click', () => {
            if (!state.hasLoadedRecord) {
                showMsg('Load a record first.', 'warning');
                return;
            }
            setMode(MODES.EDIT, false);
            showMsg('Edit mode.', 'info');
        });

        // Search (magnifier) button
        document.querySelector('[data-location-action="search"]')?.addEventListener('click', () => loadLocation(true));

        // Save
        document.querySelector('[data-location-action="save"]')?.addEventListener('click', saveLocation);

        // Delete
        document.querySelector('[data-location-action="delete"]')?.addEventListener('click', deleteLocation);

        // Cancel
        document.querySelector('[data-location-action="cancel"]')?.addEventListener('click', () => {
            clearForm(false);
            state.canAddFromView = false;
            setMode(MODES.VIEW, true);
            showMsg('Cancelled.', 'info');
        });
    }

    // ── Init ──────────────────────────────────────────────────────

    function init() {
        wireSectionToggles();
        wireFormChanges();
        bindActions();
        setMode(MODES.VIEW, true);
    }

    // ── Public API (used by parent StaticData page) ───────────────

    window.StaticDataLocationModule = {
        init,
        view: () => {
            const enteredId = (el('LocationID')?.value || '').trim();
            if (enteredId) loadLocation(true);
            else showMsg('Enter Location ID to view.', 'warning');
        },
        add: () => {
            const enteredId = (el('LocationID')?.value || '').trim();
            if (!enteredId) { showMsg('Enter Location ID first.', 'warning'); return; }
            clearForm(true);
            state.canAddFromView = false;
            setMode(MODES.ADD, false);
            showMsg('Add mode — enter location details.', 'info');
        },
        edit: () => {
            if (!state.hasLoadedRecord) { showMsg('Load a record first.', 'warning'); return; }
            setMode(MODES.EDIT, false);
            showMsg('Edit mode.', 'info');
        },
        save: saveLocation,
        delete: deleteLocation,
        cancel: () => {
            clearForm(false);
            state.canAddFromView = false;
            setMode(MODES.VIEW, true);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
