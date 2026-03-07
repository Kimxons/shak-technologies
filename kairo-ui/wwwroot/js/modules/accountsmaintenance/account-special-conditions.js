/**
 * Account Special Conditions Module
 * Migrated from: public/modules/account-maintenance/DataEntry/account-special-conditions.js
 *
 * Parent wires via updateActionPanelForSubmodule:
 *   ADD → setMode('ADD'), EDIT → setMode('EDIT'), VIEW → setMode('VIEW') (via loadData),
 *   DELETE → deleteData(), SAVE → saveData(), CANCEL → cancelChanges(), CLOSE → closeSubmodule()
 */
window.AccountSpecialConditionsModule = (function () {
    'use strict';

    /* ── State ─────────────────────────────────────────────── */
    const state = {
        editMode: 'NONE',   // NONE | ADD | EDIT | DELETE
        conditions: [],
        originalConditions: [],
        modifiedConditions: new Set(),
        operatorID: null
    };

    /* ── API Routes ─────────────────────────────────────────── */
    /* ── API Routes (Standard MVC Controller Routes) ────────── */
    const API = {
        GET: 'AccountsMaintenance/api/get-account-special-conditions',
        UPDATE: 'AccountsMaintenance/api/update-account-special-condition'
    };

    /* ── Context ────────────────────────────────────────────── */
    function getContext() {
        const ps = window.AccountMaintenanceState;
        return {
            AccountID: ps?.AccountID || sessionStorage.getItem('currentAccountID') || '',
            OurBranchID: ps?.OurBranchID || sessionStorage.getItem('currentBranchID') || '',
            OperatorID: ps?.OperatorID || sessionStorage.getItem('currentOperatorID') || localStorage.getItem('OperatorID') || 'SYSTEM'
        };
    }

    /* ── UI Helpers ──────────────────────────────────────────── */
    function el(id) { return document.getElementById(id); }
    function val(id) { const e = el(id); return e ? e.value : ''; }
    function setVal(id, v) {
        const e = el(id);
        if (!e) return;
        const s = (v == null) ? '' : v;
        if (e.tagName === 'INPUT' || e.tagName === 'TEXTAREA' || e.tagName === 'SELECT') {
            if (e.value !== s) e.value = s;
        } else {
            if (e.textContent !== s) e.textContent = s;
        }
    }

    function showLoading(show) {
        const o = el('loadingOverlay');
        if (o) o.hidden = !show;
    }

    function showMsg(msg, type) {
        if (typeof window.showSystemToast === 'function') {
            window.showSystemToast(msg, { variant: type === 'error' ? 'danger' : type });
        }
        console.log('[SpecialConditions] ' + type + ': ' + msg);
    }

    function isSuccess(r) {
        if (!r) return false;
        return r.Success === true || r.ResponseCode === '00' || r.ResponseCode === 0;
    }

    function showConfirm(message, title, iconClass) {
        if (window.AppCore && window.AppCore.showConfirmation) {
            return window.AppCore.showConfirmation(title || 'Confirm Action', message);
        }
        title = title || 'Confirm Action';
        iconClass = iconClass || 'bi-question-circle';
        return new Promise(function (resolve) {
            var overlay = document.querySelector('.acd-confirm-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'acd-confirm-overlay';
                overlay.innerHTML =
                    '<div class="acd-confirm-card">' +
                    '  <div class="acd-confirm-icon"><i class="bi ' + iconClass + '"></i></div>' +
                    '  <div class="acd-confirm-title">' + title + '</div>' +
                    '  <div class="acd-confirm-msg">' + message + '</div>' +
                    '  <div class="acd-confirm-actions">' +
                    '    <button type="button" class="acd-confirm-btn acd-confirm-btn--cancel">Cancel</button>' +
                    '    <button type="button" class="acd-confirm-btn acd-confirm-btn--confirm">Confirm</button>' +
                    '  </div>' +
                    '</div>';
                document.body.appendChild(overlay);
            } else {
                overlay.querySelector('.acd-confirm-title').textContent = title;
                overlay.querySelector('.acd-confirm-msg').textContent = message;
                overlay.querySelector('.acd-confirm-icon i').className = 'bi ' + iconClass;
            }

            var confirmBtn = overlay.querySelector('.acd-confirm-btn--confirm');
            var cancelBtn = overlay.querySelector('.acd-confirm-btn--cancel');

            var handleResponse = function (result) {
                overlay.classList.remove('is-visible');
                confirmBtn.onclick = null;
                cancelBtn.onclick = null;
                setTimeout(function () { resolve(result); }, 300);
            };

            confirmBtn.onclick = function () { handleResponse(true); };
            cancelBtn.onclick = function () { handleResponse(false); };

            requestAnimationFrame(function () {
                overlay.classList.add('is-visible');
                setTimeout(function () { confirmBtn.focus(); }, 100);
            });
        });
    }

    function fmtDateTime(ds) {
        if (!ds) return '-';
        try { const d = new Date(ds); return isNaN(d.getTime()) ? ds : d.toLocaleString(); } catch (e) { return ds; }
    }

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /* ── Mode Management (button states via parent IDs) ──────── */
    function setMode(mode) {
        state.editMode = mode;
        const isEditing = (mode === 'EDIT');

        // Enable/disable grid editing
        document.querySelectorAll('#conditionsGrid input[type="checkbox"], #conditionsGrid input[type="text"]').forEach(field => {
            if (field) field.disabled = !isEditing;
        });

        // Parent-provided action panel buttons (by ID)
        var viewB = el('submoduleBtnView');
        var addB = el('submoduleBtnAdd');
        var editB = el('submoduleBtnEdit');
        var delB = el('submoduleBtnDelete');
        var saveB = el('submoduleBtnSave');
        var cancelB = el('submoduleBtnCancel');

        if (viewB) viewB.disabled = isEditing;
        if (addB) addB.disabled = true;
        if (editB) editB.disabled = isEditing || state.conditions.length === 0;
        if (delB) delB.disabled = true;
        if (saveB) saveB.disabled = !isEditing;
        if (cancelB) cancelB.disabled = !isEditing;

        if (!isEditing && mode === 'NONE') {
            state.modifiedConditions.clear();
        }

        console.log('[SpecialConditions] Mode →', mode);
    }

    /* ── Collapsible Sections ────────────────────────────────── */
    function wireSectionToggles() {
        document.querySelectorAll('[data-section-toggle]').forEach(function (header) {
            if (header._wiredSpCond) return;
            header._wiredSpCond = true;
            header.addEventListener('click', function (e) {
                if (e.target.closest('button') && !e.target.closest('.section-toggle-btn')) return;
                var section = header.closest('.form-section');
                var content = section ? section.querySelector('[data-section-content]') : null;
                var toggleBtn = section ? section.querySelector('.section-toggle-btn') : null;
                var icon = toggleBtn ? toggleBtn.querySelector('i') : null;
                if (!content) return;
                var isOpen = content.style.display !== 'none';
                content.style.display = isOpen ? 'none' : '';
                if (icon) {
                    icon.classList.toggle('bi-chevron-up', !isOpen);
                    icon.classList.toggle('bi-chevron-down', isOpen);
                }
                if (toggleBtn) toggleBtn.setAttribute('aria-expanded', String(!isOpen));
            });
        });
    }

    /* ── Search Bar ──────────────────────────────────────────── */
    function wireSearch() {
        const searchInput = el('searchInput');
        const clearBtn = el('clearSearch');

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                const term = searchInput.value.toLowerCase().trim();
                filterGrid(term);
                if (clearBtn) clearBtn.classList.toggle('d-none', !term);
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                clearBtn.classList.add('d-none');
                filterGrid('');
            });
        }
    }

    function filterGrid(term) {
        const rows = document.querySelectorAll('#conditionsGrid tbody tr:not(.table__empty)');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = !term || text.includes(term) ? '' : 'none';
        });
    }

    /* ── Render Grid ─────────────────────────────────────────── */
    function renderGrid() {
        const tbody = document.querySelector('#conditionsGrid tbody');
        const countSpan = el('recordCount');
        if (!tbody) return;

        tbody.innerHTML = '';
        if (countSpan) countSpan.textContent = state.conditions.length + ' records';

        if (state.conditions.length === 0) {
            tbody.innerHTML = '<tr class="table__empty"><td colspan="4">No special conditions found.</td></tr>';
            return;
        }

        const isEditing = state.editMode === 'EDIT';

        state.conditions.forEach((condition, index) => {
            const row = document.createElement('tr');
            row.dataset.index = index;
            row.innerHTML = `
                <td class="text-center">
                    <input type="checkbox" class="form-check-input" data-field="Apply" 
                           ${condition.Apply ? 'checked' : ''} ${!isEditing ? 'disabled' : ''}>
                </td>
                <td>${escapeHtml(condition.Description || condition.ConditionDescription || '')}</td>
                <td class="text-center">
                    <input type="checkbox" class="form-check-input" data-field="Set" 
                           ${condition.Set || condition.IsSet ? 'checked' : ''} ${!isEditing ? 'disabled' : ''}>
                </td>
                <td>
                    <input type="text" class="bs-input-text" data-field="Value" 
                           value="${escapeHtml(condition.Value || condition.ConditionValue || '')}" 
                           ${!isEditing ? 'disabled' : ''}>
                </td>
            `;

            row.querySelectorAll('input').forEach(input => {
                input.addEventListener('change', () => {
                    state.modifiedConditions.add(index);
                    const val = input.type === 'checkbox' ? input.checked : input.value;
                    state.conditions[index][input.dataset.field] = val;
                });
            });

            tbody.appendChild(row);
        });

        if (state.conditions.length > 0) bindAudit(state.conditions[0]);
    }

    /* ── Bind Audit Data ─────────────────────────────────────── */
    function bindAudit(doc) {
        setVal('MakerID', doc.CreatedBy || doc.MakerId || doc.MakerID || '');
        setVal('MakerDT', fmtDateTime(doc.CreatedOn || doc.MakerDt || doc.MakerDT));
        setVal('ModifierID', doc.ModifiedBy || doc.ModifierId || doc.ModifierID || '');
        setVal('ModifierDT', fmtDateTime(doc.ModifiedOn || doc.ModifierDt || doc.ModifierDT));
        setVal('CheckerID', doc.CheckedBy || doc.CheckerId || doc.CheckerID || '');
        setVal('CheckerDT', fmtDateTime(doc.CheckedOn || doc.CheckerDt || doc.CheckerDT));
        state.operatorID = doc.OperatorID || doc.OperatorId || '';
    }

    /* ── Load / Navigate ─────────────────────────────────────── */
    async function navigate() {
        const ctx = getContext();
        if (!ctx.AccountID) { showMsg('No Account selected.', 'warning'); return; }

        showLoading(true);
        try {
            const result = await window.AppCore.invokeControllerAsync(API.GET, {
                AccountID: ctx.AccountID,
                OurBranchID: ctx.OurBranchID,
                OperatorID: ctx.OperatorID
            });

            showLoading(false);
            if (isSuccess(result)) {
                let data = [];
                const d = result.Details || result.Data || result;
                if (Array.isArray(d)) data = d;
                else if (d && d.Details01 && Array.isArray(d.Details01)) data = d.Details01;
                else if (d && typeof d === 'object') data = [d];

                state.conditions = data;
                state.originalConditions = JSON.parse(JSON.stringify(state.conditions));
                renderGrid();
                setMode('NONE');
            } else {
                state.conditions = [];
                state.originalConditions = [];
                renderGrid();
                setMode('NONE');
            }
        } catch (err) {
            showLoading(false);
            showMsg('Error loading Account Special Conditions: ' + err.message, 'error');
        }
    }

    /* ── Save ────────────────────────────────────────────────── */
    async function saveData() {
        if (state.modifiedConditions.size === 0) {
            showMsg('No changes to save.', 'warning');
            return;
        }

        const confirmed = await showConfirm(
            'Are you sure you want to save changes to Special Conditions?',
            'Save Confirmation'
        );
        if (!confirmed) return;

        const ctx = getContext();
        const searchKey = `[${ctx.OurBranchID}:${ctx.AccountID}]`;

        showLoading(true);
        let successCount = 0;
        let errorCount = 0;

        try {
            for (const index of state.modifiedConditions) {
                const condition = state.conditions[index];
                const payload = {
                    ...condition,
                    SearchKey: searchKey,
                    AccountID: ctx.AccountID,
                    OurBranchID: ctx.OurBranchID,
                    OperatorID: ctx.OperatorID
                };

                const result = await window.AppCore.invokeControllerAsync(API.UPDATE, payload);
                if (isSuccess(result)) successCount++;
                else errorCount++;
            }

            if (errorCount === 0) {
                showMsg(`${successCount} condition(s) saved successfully.`, 'success');
                setMode('NONE');
                navigate();
            } else {
                showMsg(`Saved ${successCount}, failed ${errorCount}.`, 'warning');
            }
        } catch (error) {
            showMsg('Failed to save conditions: ' + error.message, 'error');
        } finally {
            showLoading(false);
        }
    }

    function deleteData() {
        showMsg('Delete not supported for Special Conditions. Uncheck "Apply" instead.', 'info');
    }

    /* ── Public API ──────────────────────────────────────────── */
    function confirmAdd() { showMsg('Direct addition not allowed. Modify existing defaults.', 'warning'); }
    function confirmEdit() { if (state.conditions.length > 0) setMode('EDIT'); else showMsg('No internal data.', 'warning'); }
    function confirmCancel() { cancelChanges(); }
    function cancelChanges() {
        state.conditions = JSON.parse(JSON.stringify(state.originalConditions));
        state.modifiedConditions.clear();
        renderGrid();
        setMode('NONE');
    }

    function init() {
        wireSectionToggles();
        wireSearch();
        setMode('NONE');
        const ctx = getContext();
        if (ctx.AccountID) navigate();
    }

    return {
        init: init,
        setMode: setMode,
        navigate: navigate,
        saveData: saveData,
        deleteData: deleteData,
        confirmAdd: confirmAdd,
        confirmEdit: confirmEdit,
        confirmCancel: confirmCancel,
        cancelChanges: cancelChanges,
        loadData: navigate
    };
})();


console.log('[SpecialConditions] Module registered');
