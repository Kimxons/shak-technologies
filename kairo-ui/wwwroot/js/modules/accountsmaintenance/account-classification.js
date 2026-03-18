/**
 * Account Classification Module
 * Migrated from: public/modules/account-maintenance/DataEntry/account-classification.js
 *
 * Parent wires via updateActionPanelForSubmodule:
 *   ADD → setMode('ADD'), EDIT → setMode('EDIT'), VIEW → setMode('VIEW') (via loadData),
 *   DELETE → deleteData(), SAVE → saveData(), CANCEL → cancelChanges(), CLOSE → closeSubmodule()
 */
window.AccountClassificationModule = (function () {
    'use strict';

    const CATEGORY = 'A';

    /* ── State ─────────────────────────────────────────────── */
    const state = {
        editMode: 'NONE',   // NONE | ADD | EDIT | DELETE
        classifications: [],
        selectedIndex: -1,
        initialized: false,
        operatorID: null,
        isLoading: false,
        isSaving: false,
        isDeleting: false,
        loadingSubCodes: false,
        filters: {
            search: '',
            classCode: ''
        }
    };

    /* ── API Routes ─────────────────────────────────────────── */
    /* ── API Routes (Standard MVC Controller Routes) ────────── */
    const API = {
        GET: 'AccountsMaintenance/api/get-account-classification',
        ADD: 'AccountsMaintenance/api/add-account-classification',
        UPDATE: 'AccountsMaintenance/api/update-account-classification',
        DELETE: 'AccountsMaintenance/api/delete-account-classification',
        GET_CODES: 'AccountsMaintenance/api/get-account-classification-codes',
        GET_SUBCODES: 'AccountsMaintenance/api/get-account-classification-subcodes'
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

    function setSelectValueEnsureOption(id, value, label) {
        var select = el(id);
        if (!select) return;

        var v = String(value || '').trim();
        if (!v) {
            select.value = '';
            return;
        }

        var exists = Array.prototype.some.call(select.options || [], function (opt) {
            return String(opt.value || '') === v;
        });

        if (!exists) {
            var option = document.createElement('option');
            option.value = v;
            option.text = label ? (v + ' - ' + label) : v;
            select.appendChild(option);
        }

        select.value = v;
    }

    function debounce(fn, delayMs) {
        var timer = null;
        return function () {
            var ctx = this;
            var args = arguments;
            clearTimeout(timer);
            timer = setTimeout(function () { fn.apply(ctx, args); }, delayMs);
        };
    }

    function showLoading(show) {
        const o = el('loadingOverlay');
        if (o) o.hidden = !show;
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    async function showAlertDialog(title, message) {
        if (window.AppCore?.showAlert) {
            await window.AppCore.showAlert(title || 'Alert', message || '');
            return;
        }

        window.alert(message || '');
    }

    function showMsg(msg, type) {
        if ((type === 'error' || type === 'warning') && window.AppCore?.showAlert) {
            showAlertDialog(type === 'error' ? 'Error' : 'Warning', msg);
        } else if (window.AppCore?.showNotification) {
            window.AppCore.showNotification(msg, type === 'error' ? 'danger' : type);
        } else if (typeof window.showSystemToast === 'function') {
            window.showSystemToast(msg, { variant: type === 'error' ? 'danger' : type });
        }
        console.log('[AccountClassification] ' + type + ': ' + msg);
    }

    function isSuccess(r) {
        if (!r) return false;
        return r.Success === true || r.ResponseCode === '00' || r.ResponseCode === 0;
    }

    function getEnvelope(r) {
        return (r && r.data && typeof r.data === 'object') ? r.data : r;
    }

    function isResultFailure(r) {
        if (!r) return true;
        const envelope = getEnvelope(r);
        const successFlag = envelope?.success ?? envelope?.Success ?? r?.success ?? r?.Success;
        if (successFlag === false || String(successFlag).toLowerCase() === 'false') {
            return true;
        }

        const responseCode = String(
            envelope?.ResponseCode ?? envelope?.responseCode ?? r?.ResponseCode ?? r?.responseCode ?? ''
        ).trim();

        return !!(responseCode && !['00', '0', '000'].includes(responseCode));
    }

    function getResultMessage(r, fallback) {
        const envelope = getEnvelope(r);
        return (
            envelope?.ResponseMessage ||
            envelope?.message ||
            envelope?.Message ||
            envelope?.ErrorMessage ||
            envelope?.error ||
            envelope?.Details?.error ||
            r?.message ||
            r?.Message ||
            fallback
        );
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
        if (window.GlobalUtils?.formatDateTime) {
            return window.GlobalUtils.formatDateTime(ds);
        }
        try { const d = new Date(ds); return isNaN(d.getTime()) ? ds : d.toLocaleString(); } catch (e) { return ds; }
    }

    function getCurrentTimestamp() {
        return new Date().toISOString();
    }

    /* ── Editable fields ─────────────────────────────────────── */
    const EDITABLE = ['classificationCode', 'classificationSubCode'];
    const AUDIT = ['MakerID', 'MakerDT', 'ModifierID', 'ModifierDT', 'CheckerID', 'CheckerDT'];

    function setFieldsEditable(editable) {
        EDITABLE.forEach(function (id) {
            var e = el(id);
            if (e) e.disabled = !editable;
        });
    }

    /* ── Mode Management (button states via parent IDs) ──────── */
    function setMode(mode) {
        if (mode === 'VIEW') {
            navigate();
            return;
        }

        state.editMode = mode;
        var editing = (mode === 'ADD' || mode === 'EDIT' || mode === 'DELETE');
        setFieldsEditable(editing);

        // Parent-provided action panel buttons (by ID)
        var viewB = el('submoduleBtnView');
        var addB = el('submoduleBtnAdd');
        var editB = el('submoduleBtnEdit');
        var delB = el('submoduleBtnDelete');
        var saveB = el('submoduleBtnSave');
        var cancelB = el('submoduleBtnCancel');

        if (viewB) viewB.disabled = editing;
        if (addB) addB.disabled = editing;
        if (editB) editB.disabled = editing || state.classifications.length === 0 || state.selectedIndex === -1;
        if (delB) delB.disabled = editing || state.classifications.length === 0 || state.selectedIndex === -1;
        if (saveB) saveB.disabled = !editing;
        if (cancelB) cancelB.disabled = !editing;

        if (mode === 'ADD') {
            clearForm();
            loadClassificationCodes();
            el('classificationCode')?.focus();
        } else if (mode === 'NONE' && state.selectedIndex >= 0 && state.classifications[state.selectedIndex]) {
            bindForm(state.classifications[state.selectedIndex]);
        }

        console.log('[AccountClassification] Mode →', mode);
    }

    /* ── Collapsible Sections ────────────────────────────────── */
    function wireSectionToggles() {
        document.querySelectorAll('[data-section-toggle]').forEach(function (header) {
            if (header._wiredActClass) return;
            header._wiredActClass = true;
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

    /* ── Bind form data ──────────────────────────────────────── */
    function bindForm(doc) {
        var classCode = doc.ClassificationCode || doc.ClassificationCodeID || doc.ClassReq || doc.Code || '';
        var subClassCode = doc.ClassificationSubCode || doc.ClassificationSubCodeID || doc.SubClassReq || doc.SubCode || '';

        setSelectValueEnsureOption('classificationCode', classCode, doc.ClassDescription || '');
        loadClassificationSubCodes(classCode, subClassCode, doc.SubClassDescription || '');

        // Audit
        setVal('MakerID', doc.CreatedBy || doc.MakerId || doc.MakerID || '');
        setVal('MakerDT', fmtDateTime(doc.CreatedOn || doc.MakerDt || doc.MakerDT));
        setVal('ModifierID', doc.ModifiedBy || doc.ModifierId || doc.ModifierID || '');
        setVal('ModifierDT', fmtDateTime(doc.ModifiedOn || doc.ModifierDt || doc.ModifierDT));
        setVal('CheckerID', doc.CheckedBy || doc.CheckerId || doc.CheckerID || '');
        setVal('CheckerDT', fmtDateTime(doc.CheckedOn || doc.CheckerDt || doc.CheckerDT));

        // Metadata
        state.operatorID = doc.OperatorID || doc.OperatorId || '';
    }

    /* ── Render Grid ─────────────────────────────────────────── */
    function renderGrid() {
        const tbody = document.querySelector('#classificationGrid tbody');
        const countSpan = el('recordCount');
        if (!tbody) return;

        tbody.innerHTML = '';
        const filteredRows = getFilteredClassifications();
        if (countSpan) {
            countSpan.textContent = filteredRows.length === state.classifications.length
                ? state.classifications.length + ' records'
                : filteredRows.length + ' of ' + state.classifications.length + ' records';
        }

        if (state.classifications.length === 0) {
            tbody.innerHTML = '<tr class="table__empty"><td colspan="2">No classifications found.</td></tr>';
            return;
        }

        if (filteredRows.length === 0) {
            tbody.innerHTML = '<tr class="table__empty"><td colspan="2">No classifications match the current filters.</td></tr>';
            return;
        }

        filteredRows.forEach(function (entry) {
            var item = entry.item;
            var index = entry.index;
            const row = document.createElement('tr');
            row.style.cursor = 'pointer';
            row.className = index === state.selectedIndex ? 'table-active' : '';

            var classCode = getClassificationCode(item) || '-';
            var subClassCode = getClassificationSubCode(item) || '-';
            var classLabel = item.ClassDescription ? (classCode + ' - ' + item.ClassDescription) : classCode;
            var subClassLabel = item.SubClassDescription ? (subClassCode + ' - ' + item.SubClassDescription) : subClassCode;

            row.innerHTML = `
                <td>${classLabel}</td>
                <td>${subClassLabel}</td>
            `;

            row.addEventListener('click', () => {
                if (state.editMode !== 'NONE') return;
                state.selectedIndex = index;
                renderGrid();
                bindForm(item);
                setMode('NONE');
            });
            tbody.appendChild(row);
        });
    }

    function normalizeCode(val) {
        return String(val || '').trim();
    }

    function getClassificationCode(item) {
        return normalizeCode(item.ClassificationCode || item.ClassificationCodeID || item.ClassReq || item.Code || '');
    }

    function getClassificationSubCode(item) {
        return normalizeCode(item.ClassificationSubCode || item.ClassificationSubCodeID || item.SubClassReq || item.SubCode || '');
    }

    function buildSearchText(item) {
        return (
            getClassificationCode(item) + ' ' +
            getClassificationSubCode(item) + ' ' +
            normalizeCode(item.ClassDescription) + ' ' +
            normalizeCode(item.SubClassDescription)
        ).toLowerCase();
    }

    function getFilteredClassifications() {
        var q = String(state.filters.search || '').trim().toLowerCase();
        var codeFilter = String(state.filters.classCode || '').trim().toLowerCase();

        return state.classifications
            .map(function (item, index) { return { item: item, index: index }; })
            .filter(function (entry) {
                var code = getClassificationCode(entry.item).toLowerCase();
                if (codeFilter && code !== codeFilter) return false;
                if (q && buildSearchText(entry.item).indexOf(q) === -1) return false;
                return true;
            });
    }

    function syncSearchClearButton() {
        var input = el('classificationGridSearch');
        var clearBtn = el('clearClassificationGridSearch');
        if (!clearBtn) return;
        var hasValue = !!(input && String(input.value || '').trim());
        clearBtn.classList.toggle('d-none', !hasValue);
    }

    function populateClassCodeFilter() {
        var select = el('classificationCodeFilter');
        if (!select) return;

        var current = String(state.filters.classCode || '');
        var seen = {};
        var codes = [];

        state.classifications.forEach(function (item) {
            var code = getClassificationCode(item);
            if (!code || seen[code]) return;
            seen[code] = true;
            codes.push(code);
        });

        codes.sort();
        select.innerHTML = '<option value="">All class codes</option>' +
            codes.map(function (code) {
                return '<option value="' + code.replace(/"/g, '&quot;') + '">' + code + '</option>';
            }).join('');

        if (current && seen[current]) {
            select.value = current;
        } else {
            state.filters.classCode = '';
            select.value = '';
        }
    }

    function wireGridFilters() {
        var searchInput = el('classificationGridSearch');
        var clearBtn = el('clearClassificationGridSearch');
        var codeFilter = el('classificationCodeFilter');

        if (searchInput && !searchInput.dataset.wired) {
            var onInput = debounce(function () {
                state.filters.search = searchInput.value || '';
                syncSearchClearButton();
                renderGrid();
            }, 180);
            searchInput.addEventListener('input', onInput);
            searchInput.dataset.wired = 'true';
        }

        if (clearBtn && !clearBtn.dataset.wired) {
            clearBtn.addEventListener('click', function () {
                if (searchInput) searchInput.value = '';
                state.filters.search = '';
                syncSearchClearButton();
                renderGrid();
            });
            clearBtn.dataset.wired = 'true';
        }

        if (codeFilter && !codeFilter.dataset.wired) {
            codeFilter.addEventListener('change', function () {
                state.filters.classCode = codeFilter.value || '';
                renderGrid();
            });
            codeFilter.dataset.wired = 'true';
        }

        syncSearchClearButton();
    }

    function normalizeClassificationRows(result) {
        const envelope = getEnvelope(result) || {};
        const details = envelope.Details ?? envelope.Data ?? envelope.data ?? envelope;

        if (Array.isArray(details)) return details;
        if (Array.isArray(details?.Details01)) return details.Details01;
        if (Array.isArray(envelope?.Details01)) return envelope.Details01;
        if (details && typeof details === 'object') return [details];
        return [];
    }

    function normalizeClassificationItem(item) {
        if (!item || typeof item !== 'object') return item;

        return {
            ...item,
            ClassificationCode: item.ClassificationCode || item.ClassificationCodeID || item.ClassReq || item.Code || '',
            ClassificationSubCode: item.ClassificationSubCode || item.ClassificationSubCodeID || item.SubClassReq || item.SubCode || '',
            ClassDescription: item.ClassDescription || item.ClassificationDescription || '',
            SubClassDescription: item.SubClassDescription || item.ClassificationSubDescription || '',
            ReferenceID: item.ReferenceID || item.ID || 0
        };
    }

    function normalizeLookupRows(result) {
        const envelope = getEnvelope(result) || {};
        const details = envelope.Details ?? envelope.details ?? envelope.Data ?? envelope.data ?? envelope;

        if (Array.isArray(details)) return details;

        if (details && typeof details === 'object') {
            const arrays = Object.keys(details)
                .map(function (key) { return details[key]; })
                .filter(Array.isArray);

            if (arrays.length > 0) {
                return arrays[0];
            }
        }

        if (Array.isArray(envelope?.Details01)) return envelope.Details01;
        if (Array.isArray(envelope?.details01)) return envelope.details01;
        return [];
    }

    function mapLookupOption(item) {
        if (!item || typeof item !== 'object') return null;

        var value = String(
            item.SubCodeID || item.subCodeID ||
            item.CodeID || item.codeID ||
            item.ID || item.id ||
            item.Value || item.value ||
            ''
        ).trim();
        if (!value) return null;

        var description = String(
            item.CodeDescription || item.codeDescription ||
            item.Description || item.description ||
            item.Name || item.name ||
            item.Text || item.text ||
            ''
        ).trim();
        return {
            value: value,
            text: description ? (value + ' - ' + description) : value,
            description: description
        };
    }

    function populateSelectOptions(id, options, selectedValue, placeholder) {
        var select = el(id);
        if (!select) return;

        var safePlaceholder = escapeHtml(placeholder || '-- Select --');
        var selected = String(selectedValue || '').trim();
        var html = ['<option value="">' + safePlaceholder + '</option>'];

        (options || []).forEach(function (option) {
            if (!option || !option.value) return;

            html.push(
                '<option value="' + escapeHtml(option.value) + '">' + escapeHtml(option.text || option.value) + '</option>'
            );
        });

        select.innerHTML = html.join('');
        select.value = selected;

        if (selected && select.value !== selected) {
            setSelectValueEnsureOption(id, selected);
        }
    }

    function setSubCodeState(enabled, placeholder) {
        var subCode = el('classificationSubCode');
        if (!subCode) return;

        populateSelectOptions('classificationSubCode', [], '', placeholder || '-- Select Classification Sub Code --');
        subCode.disabled = !enabled || !(state.editMode === 'ADD' || state.editMode === 'EDIT' || state.editMode === 'DELETE');
    }

    async function loadClassificationCodes(selectedValue) {
        try {
            const result = await window.AppCore.invokeControllerAsync(API.GET_CODES, {});
            const options = normalizeLookupRows(result)
                .map(mapLookupOption)
                .filter(Boolean);

            populateSelectOptions('classificationCode', options, selectedValue, '-- Select Classification Code --');

            if (selectedValue) {
                await loadClassificationSubCodes(selectedValue, val('classificationSubCode'));
            } else {
                setSubCodeState(false, '-- Select Classification Code First --');
            }
        } catch (err) {
            console.error('[AccountClassification] Failed to load classification codes', err);
            showMsg('Unable to load classification codes.', 'error');
        }
    }

    async function loadClassificationSubCodes(classificationCode, selectedValue, selectedLabel) {
        var code = String(classificationCode || '').trim();
        if (!code) {
            setSubCodeState(false, '-- Select Classification Code First --');
            return;
        }

        var ctx = getContext();
        state.loadingSubCodes = true;
        setSubCodeState(false, 'Loading classification sub codes...');

        try {
            const result = await window.AppCore.invokeControllerAsync(API.GET_SUBCODES, {
                ID: code,
                OperatorID: ctx.OperatorID,
                OurBranchID: ctx.OurBranchID
            });

            const options = normalizeLookupRows(result)
                .map(mapLookupOption)
                .filter(Boolean);

            populateSelectOptions('classificationSubCode', options, selectedValue, '-- Select Classification Sub Code --');
            var subCodeSelect = el('classificationSubCode');
            if (subCodeSelect) subCodeSelect.disabled = false;

            if (selectedValue) {
                setSelectValueEnsureOption('classificationSubCode', selectedValue, selectedLabel || '');
            }
        } catch (err) {
            console.error('[AccountClassification] Failed to load classification sub codes', err);
            setSubCodeState(false, '-- No Classification Sub Codes Found --');
            if (selectedValue) {
                setSelectValueEnsureOption('classificationSubCode', selectedValue, selectedLabel || '');
            }
        } finally {
            state.loadingSubCodes = false;
        }
    }

    function wireClassificationDropdowns() {
        var classificationCode = el('classificationCode');
        if (!classificationCode || classificationCode.dataset.wired) return;

        classificationCode.addEventListener('change', function () {
            if (state.loadingSubCodes) return;
            loadClassificationSubCodes(classificationCode.value || '', '');
        });

        classificationCode.dataset.wired = 'true';
    }

    /* ── Load / Navigate ─────────────────────────────────────── */
    async function navigate() {
        const ctx = getContext();
        if (!ctx.AccountID) { showMsg('No Account selected.', 'warning'); return; }
        if (state.isLoading) return;

        state.isLoading = true;
        showLoading(true);
        try {
            const result = await window.AppCore.invokeControllerAsync(API.GET, {
                AccountID: ctx.AccountID,
                AccountNumber: ctx.AccountID,
                OurBranchID: ctx.OurBranchID,
                OperatorID: ctx.OperatorID
            });

            showLoading(false);
            if (!isResultFailure(result) || isSuccess(result)) {
                state.classifications = normalizeClassificationRows(result).map(normalizeClassificationItem);
                populateClassCodeFilter();
                if (state.classifications.length > 0) {
                    state.selectedIndex = 0;
                    bindForm(state.classifications[0]);
                } else {
                    state.selectedIndex = -1;
                    clearForm();
                }
                renderGrid();
                setMode('NONE');
            } else {
                state.classifications = [];
                state.selectedIndex = -1;
                populateClassCodeFilter();
                renderGrid();
                clearForm();
                setMode('NONE');
                showMsg(getResultMessage(result, 'No account classifications found.'), 'info');
            }
        } catch (err) {
            showLoading(false);
            showMsg('Error loading Account Classification: ' + err.message, 'error');
        } finally {
            state.isLoading = false;
        }
    }

    /* ── Save ────────────────────────────────────────────────── */
    async function saveData() {
        if (state.isSaving) return;
        if (state.editMode !== 'ADD' && state.editMode !== 'EDIT') {
            showMsg('Choose Add or Edit before saving.', 'warning');
            return;
        }

        const isAdd = state.editMode === 'ADD';
        const classCode = val('classificationCode').trim();
        const subClassCode = val('classificationSubCode').trim();
        if (!classCode) {
            showMsg('Please select a Classification Code.', 'warning');
            el('classificationCode')?.focus();
            return;
        }

        if (!subClassCode) {
            showMsg('Please select a Classification Sub Code.', 'warning');
            el('classificationSubCode')?.focus();
            return;
        }

        const confirmed = await showConfirm(
            `Are you sure you want to ${isAdd ? 'create' : 'update'} this classification?`,
            'Save Confirmation'
        );
        if (!confirmed) return;

        const ctx = getContext();
        const selected = state.selectedIndex > -1 ? state.classifications[state.selectedIndex] : null;
        const now = getCurrentTimestamp();
        const createdBy = selected?.CreatedBy || selected?.MakerID || ctx.OperatorID;
        const createdOn = selected?.CreatedOn || selected?.MakerDT || now;
        const payload = {
            OurBranchID: ctx.OurBranchID,
            AccountID: ctx.AccountID,
            AccountNumber: ctx.AccountID,
            Category: selected?.Category || CATEGORY,
            CreatedBy: createdBy,
            CreatedOn: createdOn,
            OperatorID: ctx.OperatorID,
            SearchKey: `[${ctx.OurBranchID}:${ctx.AccountID}]`,
            ClassificationCode: classCode,
            ClassificationSubCode: subClassCode,
            ClassificationCodeID: classCode,
            ClassificationSubCodeID: subClassCode,
            ClassReq: classCode,
            SubClassReq: subClassCode,
            ModifiedBy: ctx.OperatorID,
            ModifiedOn: now,
            SupervisedBy: selected?.SupervisedBy || ctx.OperatorID,
            SupervisedOn: selected?.SupervisedOn || now,
            UpdateCount: Number(selected?.UpdateCount || 0),
            NewRecord: isAdd ? 1 : 0,
            ReferenceID: selected?.ReferenceID || selected?.ID || 0
        };

        state.isSaving = true;
        showLoading(true);
        try {
            const result = await window.AppCore.invokeControllerAsync(isAdd ? API.ADD : API.UPDATE, payload);
            showLoading(false);
            if (!isResultFailure(result) || isSuccess(result)) {
                showMsg(getResultMessage(result, 'Changes saved successfully.'), 'success');
                setMode('NONE');
                navigate();
            } else {
                showMsg(getResultMessage(result, 'Save failed.'), 'error');
            }
        } catch (err) {
            showLoading(false);
            showMsg('Save error: ' + err.message, 'error');
        } finally {
            state.isSaving = false;
        }
    }

    /* ── Delete ──────────────────────────────────────────────── */
    async function deleteData() {
        if (state.isDeleting) return;
        if (state.editMode === 'ADD') {
            showMsg('Cancel Add mode before deleting an existing classification.', 'warning');
            return;
        }
        if (state.selectedIndex === -1 || !state.classifications[state.selectedIndex]) return;

        const confirmed = await showConfirm(
            'Are you sure you want to delete this classification?',
            'Delete Confirmation'
        );
        if (!confirmed) return;

        const ctx = getContext();
        const item = state.classifications[state.selectedIndex];
        state.isDeleting = true;
        showLoading(true);
        try {
            const result = await window.AppCore.invokeControllerAsync(API.DELETE, {
                AccountID: ctx.AccountID,
                AccountNumber: ctx.AccountID,
                OurBranchID: ctx.OurBranchID,
                OperatorID: ctx.OperatorID,
                SearchKey: `[${ctx.OurBranchID}:${ctx.AccountID}]`,
                ClassificationCode: item.ClassificationCode || item.ClassReq || item.Code || '',
                ClassificationSubCode: item.ClassificationSubCode || item.SubClassReq || item.SubCode || '',
                ClassificationCodeID: item.ClassificationCode || item.ClassificationCodeID || item.ClassReq || item.Code || '',
                ClassificationSubCodeID: item.ClassificationSubCode || item.ClassificationSubCodeID || item.SubClassReq || item.SubCode || '',
                ClassReq: item.ClassificationCode || item.ClassReq || item.Code || '',
                SubClassReq: item.ClassificationSubCode || item.SubClassReq || item.SubCode || '',
                UpdateCount: Number(item.UpdateCount || 0),
                ReferenceID: item.ReferenceID || item.ID || 0
            });
            showLoading(false);
            if (!isResultFailure(result) || isSuccess(result)) {
                showMsg(getResultMessage(result, 'Deleted successfully.'), 'success');
                state.selectedIndex = -1;
                clearForm();
                setMode('NONE');
                navigate();
            } else {
                showMsg(getResultMessage(result, 'Delete failed.'), 'error');
            }
        } catch (err) {
            showLoading(false);
            showMsg('Delete error: ' + err.message, 'error');
        } finally {
            state.isDeleting = false;
        }
    }

    /* ── Public API ──────────────────────────────────────────── */
    function confirmView() { navigate(); }
    function confirmAdd() {
        if (state.isSaving || state.isDeleting) return;
        setMode('ADD');
    }
    function confirmEdit() {
        if (state.isSaving || state.isDeleting) return;
        if (state.selectedIndex !== -1) setMode('EDIT');
        else showMsg('No record selected.', 'warning');
    }
    async function confirmCancel() {
        if (state.editMode !== 'ADD' && state.editMode !== 'EDIT' && state.editMode !== 'DELETE') {
            cancelChanges();
            return;
        }

        const confirmed = await showConfirm(
            'Are you sure you want to cancel your changes?',
            'Cancel'
        );
        if (!confirmed) return;

        cancelChanges();
        showMsg('Changes canceled.', 'info');
    }

    function cancelChanges() {
        if (state.selectedIndex >= 0 && state.classifications[state.selectedIndex]) bindForm(state.classifications[state.selectedIndex]);
        else clearForm();
        setMode('NONE');
    }
    function clearForm() {
        EDITABLE.forEach(id => setVal(id, ''));
        AUDIT.forEach(id => setVal(id, '-'));
        setSubCodeState(false, '-- Select Classification Code First --');
    }

    function init() {
        if (state.initialized) {
            const ctx = getContext();
            if (ctx.AccountID) navigate();
            return;
        }

        state.initialized = true;
        wireSectionToggles();
        wireGridFilters();
        wireClassificationDropdowns();
        setMode('NONE');
        const ctx = getContext();
        if (ctx.AccountID) navigate();
    }

    return {
        init: init,
        setMode: setMode,
        view: confirmView,
        add: confirmAdd,
        edit: confirmEdit,
        navigate: navigate,
        saveData: saveData,
        save: saveData,
        deleteData: deleteData,
        delete: deleteData,
        confirmView: confirmView,
        confirmAdd: confirmAdd,
        confirmEdit: confirmEdit,
        confirmCancel: confirmCancel,
        cancelChanges: cancelChanges,
        loadData: navigate
    };
})();


console.log('[AccountClassification] Module registered');
