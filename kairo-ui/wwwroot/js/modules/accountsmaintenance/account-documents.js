/**
 * Account Documents Module
 * Migrated from: public/modules/account-maintenance/DataEntry/account-documents.js
 *
 * Parent wires via updateActionPanelForSubmodule:
 *   PREV → navigate(-1), NEXT → navigate(1), VIEW → navigate(0),
 *   ADD → setMode('ADD'), EDIT → setMode('EDIT'),
 *   DELETE → deleteData(), SAVE → saveData(), CANCEL → cancelChanges(),
 *   CLEAR → clearForm(), SHOW IMAGE → showImage(), CLOSE → closeSubmodule()
 */
window.AccountDocumentsModule = (function () {
    'use strict';

    /* ── State ─────────────────────────────────────────────── */
    const state = {
        editMode: 'NONE',   // NONE | ADD | EDIT | DELETE
        direction: 0,
        documentData: null,
        documentClassData: [],
        imageID: 0,
        updateCount: 0,
        eventID: null,
        operatorID: null
    };

    /* ── API Routes ─────────────────────────────────────────── */
    const API = {
        GET:    '/AccountsMaintenance/api/get-account-document',
        ADD:    '/AccountsMaintenance/api/add-account-document',
        UPDATE: '/AccountsMaintenance/api/update-account-document',
        DELETE: '/AccountsMaintenance/api/delete-account-document'
    };

    /* ── Context ────────────────────────────────────────────── */
    function getContext() {
        const ps = window.AccountMaintenanceState;
        return {
            AccountID:   ps?.AccountID   || sessionStorage.getItem('currentAccountID')   || '',
            OurBranchID: ps?.OurBranchID || sessionStorage.getItem('currentBranchID')    || '',
            OperatorID:  ps?.OperatorID  || sessionStorage.getItem('currentOperatorID')  || localStorage.getItem('OperatorID') || 'SYSTEM'
        };
    }

    /* ── UI Helpers ──────────────────────────────────────────── */
    function el(id)       { return document.getElementById(id); }
    function val(id)      { const e = el(id); return e ? e.value : ''; }
    function setVal(id,v) { const e = el(id); if (!e) return; const s = (v == null) ? '' : v; if (e.tagName==='INPUT'||e.tagName==='TEXTAREA'||e.tagName==='SELECT') e.value = s; else e.textContent = s; }

    function showLoading(show) {
        const o = el('loadingOverlay');
        if (o) o.hidden = !show;
    }

    function showMsg(msg, type) {
        if (typeof window.showSystemToast === 'function') {
            window.showSystemToast(msg, { variant: type === 'error' ? 'danger' : type });
        }
        console.log('[AccountDocuments] ' + type + ': ' + msg);
    }

    function isSuccess(r) { return r && (r.ResponseCode === '00' || r.ResponseCode === 0); }

    /* ── Custom 3D Confirmation Dialog (matches original) ───── */
    function showConfirm(message, title, iconClass) {
        title     = title     || 'Confirm Action';
        iconClass = iconClass || 'bi-question-circle';
        return new Promise(function(resolve) {
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
                overlay.querySelector('.acd-confirm-msg').textContent   = message;
                overlay.querySelector('.acd-confirm-icon i').className  = 'bi ' + iconClass;
            }

            var confirmBtn = overlay.querySelector('.acd-confirm-btn--confirm');
            var cancelBtn  = overlay.querySelector('.acd-confirm-btn--cancel');

            var handleResponse = function(result) {
                overlay.classList.remove('is-visible');
                confirmBtn.onclick = null;
                cancelBtn.onclick  = null;
                setTimeout(function() { resolve(result); }, 300);
            };

            confirmBtn.onclick = function() { handleResponse(true);  };
            cancelBtn.onclick  = function() { handleResponse(false); };
            overlay.onclick    = function(e) { if (e.target === overlay) handleResponse(false); };

            requestAnimationFrame(function() {
                overlay.classList.add('is-visible');
                setTimeout(function() { confirmBtn.focus(); }, 100);
            });
        });
    }

    function fmtDate(ds) {
        if (!ds) return '';
        try {
            const d = new Date(ds);
            if (isNaN(d.getTime())) return ds;
            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            return String(d.getDate()).padStart(2,'0') + '/' + months[d.getMonth()] + '/' + d.getFullYear();
        } catch(e) { return ds; }
    }

    function fmtDateTime(ds) {
        if (!ds) return '-';
        try { const d = new Date(ds); return isNaN(d.getTime()) ? ds : d.toLocaleString(); } catch(e) { return ds; }
    }

    /* ── Editable fields ─────────────────────────────────────── */
    const EDITABLE = ['documentId','documentType','documentClass','receivedBy','receivedDate','location','remarks'];
    const AUDIT    = ['createdBy','createdOn','modifiedBy','modifiedOn','supervisedBy','supervisedOn'];

    function setFieldsEditable(editable) {
        EDITABLE.forEach(function(id) {
            var e = el(id);
            if (e) e.disabled = !editable;
        });
        // File input
        var fileIn = el('documentImage_file'); if (fileIn) fileIn.disabled = !editable;
        var dateB  = el('receivedDate_btn'); if (dateB) dateB.disabled = !editable;

        // Multiselect component
        var ms = el('documentClassMultiselect');
        if (ms) {
            if (editable) ms.classList.remove('disabled'); else ms.classList.add('disabled');
            ms.querySelectorAll('input[type="checkbox"]').forEach(function(cb) { cb.disabled = !editable; });
        }
    }

    /* ── Snapshot / Restore ──────────────────────────────────── */
    const snapshot = {};

    function snapshotValues() {
        EDITABLE.forEach(function(id) { snapshot[id] = val(id); });
    }

    function restoreValues() {
        EDITABLE.forEach(function(id) { if (snapshot[id] !== undefined) setVal(id, snapshot[id]); });
    }

    /* ── Mode Management (button states via parent IDs) ──────── */
    function setMode(mode) {
        state.editMode = mode;
        var editing = (mode === 'ADD' || mode === 'EDIT' || mode === 'DELETE');
        setFieldsEditable(editing);

        // Parent-provided action panel buttons (by ID)
        var viewB    = el('submoduleBtnView');
        var addB     = el('submoduleBtnAdd');
        var editB    = el('submoduleBtnEdit');
        var delB     = el('submoduleBtnDelete');
        var saveB    = el('submoduleBtnSave');
        var cancelB  = el('submoduleBtnCancel');
        var clearB   = el('submoduleBtnClear');
        var showImgB = el('submoduleBtnShowImage');
        var prevB    = el('submoduleBtnPrev');
        var nextB    = el('submoduleBtnNext');

        if (viewB)    viewB.disabled    = editing;
        if (addB)     addB.disabled     = editing;
        if (editB)    editB.disabled    = editing || !state.documentData;
        if (delB)     delB.disabled     = editing || !state.documentData;
        if (saveB)    saveB.disabled    = !editing;
        if (cancelB)  cancelB.disabled  = !editing;
        if (clearB)   clearB.style.display = (mode === 'ADD') ? '' : 'none';
        if (showImgB) showImgB.disabled = editing || !state.imageID;
        if (prevB)    prevB.disabled    = editing;
        if (nextB)    nextB.disabled    = editing;

        // Keep documentId active for lookup/search
        var docIdEl = el('documentId');
        if (docIdEl) docIdEl.disabled = false;

        if (mode === 'ADD') {
            var currentId   = val('documentId');
            var currentDesc = val('documentDesc_lookup');
            clearForm();
            if (currentId)   setVal('documentId', currentId);
            if (currentDesc) setVal('documentDesc_lookup', currentDesc);
            el('documentType')?.focus();
        }

        console.log('[AccountDocuments] Mode →', mode);
    }

    /* ── Collapsible Sections ────────────────────────────────── */
    function wireSectionToggles() {
        document.querySelectorAll('[data-section-toggle]').forEach(function(header) {
            if (header._wiredDoc) return;
            header._wiredDoc = true;
            header.addEventListener('click', function(e) {
                if (e.target.closest('button') && !e.target.closest('.section-toggle-btn')) return;
                var section   = header.closest('.form-section');
                var content   = section ? section.querySelector('[data-section-content]') : null;
                var toggleBtn = section ? section.querySelector('.section-toggle-btn') : null;
                var icon      = toggleBtn ? toggleBtn.querySelector('i') : null;
                if (!content) return;
                var isOpen = content.style.display !== 'none';
                content.style.display = isOpen ? 'none' : '';
                if (icon) {
                    icon.classList.toggle('bi-chevron-up',   !isOpen);
                    icon.classList.toggle('bi-chevron-down',  isOpen);
                }
                if (toggleBtn) toggleBtn.setAttribute('aria-expanded', String(!isOpen));
            });
        });
    }

    /* ── Internal Controls Wiring ────────────────────────────── */
    function wireInternalControls() {
        // Enter on documentId → view
        var docIdEl = el('documentId');
        if (docIdEl && !docIdEl._wiredDoc) {
            docIdEl._wiredDoc = true;
            docIdEl.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); navigate(0); } });
        }

        // Date picker
        var dateBtn = el('receivedDate_btn');
        var picker  = el('receivedDate_picker');
        var dateIn  = el('receivedDate');
        if (dateBtn && picker && dateIn && !dateBtn._wiredDoc) {
            dateBtn._wiredDoc = true;
            var openPicker = function() {
                if (dateIn.disabled) return;
                try { picker.showPicker ? picker.showPicker() : picker.click(); } catch(e) { picker.focus(); }
            };
            dateBtn.addEventListener('click', openPicker);
            dateIn.addEventListener('click', openPicker);
            picker.addEventListener('change', function() {
                if (picker.value) setVal('receivedDate', fmtDate(picker.value + 'T00:00:00'));
            });
        }

        // File input — standard visible input, browser handles everything natively.
        // No JS wiring needed for file selection.

        // Document Class multiselect toggle
        var ms = el('documentClassMultiselect');
        var msDisplay = el('documentClassDisplay');
        if (ms && msDisplay && !msDisplay._wiredDoc) {
            msDisplay._wiredDoc = true;
            msDisplay.addEventListener('click', function(e) {
                if (state.editMode === 'NONE') return;
                e.stopPropagation();
                ms.classList.toggle('active');
            });
            document.addEventListener('click', function(e) {
                if (!ms.contains(e.target)) ms.classList.remove('active');
            });
        }

        // Real-time validation clearing
        ['documentId','documentType'].forEach(function(id) {
            var field = el(id);
            if (field && !field._wiredValidation) {
                field._wiredValidation = true;
                var handler = function() {
                    field.classList.remove('acd-field-invalid');
                    var err = field.parentElement ? field.parentElement.querySelector('.acd-field-error') : null;
                    if (err) err.remove();
                };
                field.addEventListener('input', handler);
                field.addEventListener('change', handler);
            }
        });
    }

    /* ── Render Document Classes in multiselect ──────────────── */
    function renderDocumentClasses(classes) {
        var container = document.querySelector('#documentClassMultiselect .kairo-multiselect__dropdown');
        if (!container) return;
        if (!classes || classes.length === 0) {
            container.innerHTML = '<div class="p-2 text-muted small">No classes available</div>';
            return;
        }
        container.innerHTML = classes.map(function(cls) {
            var id   = cls.ID || cls.DocumentClassID || '';
            var desc = cls.Description || cls.DocumentClassDesc || cls.Name || id || 'Unknown';
            var label = (desc && String(desc) !== 'undefined') ? desc : ('Class ' + id);
            return '<div class="kairo-multiselect__item">' +
                '<input type="checkbox" id="class_' + id + '" value="' + id + '" data-label="' + label + '">' +
                '<label for="class_' + id + '">' + label + '</label></div>';
        }).join('');

        // Wire checkbox change → update hidden field + display
        container.querySelectorAll('input[type="checkbox"]').forEach(function(cb) {
            cb.addEventListener('change', updateMultiselectDisplay);
        });
    }

    function updateMultiselectDisplay() {
        var ms       = el('documentClassMultiselect');
        var display  = el('documentClassDisplay');
        var hidden   = el('documentClass');
        if (!ms) return;
        var checked  = Array.from(ms.querySelectorAll('input[type="checkbox"]:checked'));
        var vals     = checked.map(function(c){ return c.value; });
        var labels   = checked.map(function(c){ return c.dataset.label || c.value; });
        if (display) display.textContent = labels.length > 0 ? labels.join(', ') : '--Select--';
        if (hidden)  hidden.value = vals.join(',');
    }

    /* ── Bind form data ──────────────────────────────────────── */
    function bindForm(doc) {
        setVal('documentId',          doc.DocumentID || doc.DocumentId || '');
        setVal('documentDesc_lookup', doc.DocumentDescription || doc.DocumentName || doc.DocumentDesc || '');
        setVal('documentType',        doc.DocumentTypeID || doc.DocumentType || '');
        setVal('receivedBy',          doc.ReceivedBy || '');
        setVal('receivedDate',        fmtDate(doc.ReceivedDate));
        setVal('location',            doc.LocationID || doc.Location || '');
        setVal('remarks',             doc.Remarks || '');
        // File input cleared (file upload is separate from existing data)
        var fileIn = el('documentImage_file'); if (fileIn) fileIn.value = '';

        // Multiselect: set checkboxes + display
        var classVal = doc.DocumentClassID || doc.DocumentClass || '';
        setVal('documentClass', classVal);
        var display = el('documentClassDisplay');
        if (display) display.textContent = classVal || '--Select--';
        var ms = el('documentClassMultiselect');
        if (ms) {
            var codes = classVal ? classVal.split(',').map(function(s){return s.trim();}) : [];
            var labels = [];
            ms.querySelectorAll('input[type="checkbox"]').forEach(function(cb) {
                var match = codes.indexOf(cb.value) >= 0;
                cb.checked = match;
                if (match) labels.push(cb.dataset.label || cb.value);
            });
            if (display && labels.length > 0) display.textContent = labels.join(', ');
        }

        // Audit
        setVal('createdBy',    doc.CreatedBy || doc.MakerID || '');
        setVal('createdOn',    fmtDateTime(doc.CreatedOn || doc.MakerDT));
        setVal('modifiedBy',   doc.ModifiedBy || doc.ModifierID || '');
        setVal('modifiedOn',   fmtDateTime(doc.ModifiedOn || doc.ModifierDT));
        setVal('supervisedBy', doc.SupervisedBy || '');
        setVal('supervisedOn', fmtDateTime(doc.SupervisedOn));

        // Metadata
        state.imageID     = parseInt(doc.ImageID || doc.ImageId || 0) || 0;
        state.updateCount = parseInt(doc.UpdateCount || 0) || 0;
        state.eventID     = parseInt(doc.EventID || doc.EventId || 0) || 0;
        state.operatorID  = doc.OperatorID || doc.OperatorId || '';
    }

    /* ── Get Document Classes XML ────────────────────────────── */
    function getDocumentClassesXml() {
        var ms = el('documentClassMultiselect');
        var selected = [];
        if (ms) {
            ms.querySelectorAll('input[type="checkbox"]:checked').forEach(function(cb){ selected.push(cb.value); });
        }
        if (selected.length === 0) {
            var raw = val('documentClass').trim();
            if (raw) raw.split(',').forEach(function(s){ if (s.trim()) selected.push(s.trim()); });
        }
        if (selected.length === 0) return '';
        return '<dt_DocumentClasses>' + selected.map(function(c){ return '<DocumentClassID>' + c + '</DocumentClassID>'; }).join('') + '</dt_DocumentClasses>';
    }

    /* ── Navigate / View ─────────────────────────────────────── */
    function navigate(direction) {
        state.direction = direction;
        var ctx   = getContext();
        var docId = val('documentId').trim();

        showLoading(true);

        fetch(API.GET, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                AccountID:   ctx.AccountID,
                DocumentID:  docId,
                Direction:   direction,
                OurBranchID: ctx.OurBranchID,
                OperatorID:  ctx.OperatorID
            })
        })
        .then(function(r){ return r.json(); })
        .then(function(result) {
            showLoading(false);

            // Always try to extract document class list from any response
            var d = result && result.Details ? result.Details : null;
            if (d && d.Details && Array.isArray(d.Details)) {
                renderDocumentClasses(d.Details);
            }

            if (isSuccess(result)) {
                var doc = null;

                // Format A: Details.Documents[] + Details.DocumentClasses[]
                if (d && d.Documents && Array.isArray(d.Documents) && d.Documents.length > 0) {
                    doc = d.Documents[0];
                    // Attach selected document classes
                    if (d.DocumentClasses && Array.isArray(d.DocumentClasses)) {
                        var classIds = d.DocumentClasses
                            .map(function(x){ return x.DocumentClassID; })
                            .filter(Boolean);
                        if (classIds.length > 0) doc.DocumentClassID = classIds.join(',');
                    }
                }

                // Format B: Details01 (Set 1) — primary document row
                if (!doc && d && d.Details01 && Array.isArray(d.Details01) && d.Details01.length > 0) {
                    var c = d.Details01[0];
                    if (c.DocumentID || c.DocumentId) doc = c;
                    else {
                        state.operatorID  = c.OperatorID;
                        state.eventID     = c.EventID;
                        state.updateCount = c.UpdateCount || 0;
                    }
                }

                // Format B: Details02 (Set 2) — selection / metadata
                if (d && d.Details02 && Array.isArray(d.Details02) && d.Details02.length > 0) {
                    var c2 = d.Details02[0];
                    if (!doc && (c2.DocumentID || c2.DocumentId)) doc = c2;
                    if (c2.OperatorID !== undefined && c2.EventID !== undefined) {
                        state.operatorID  = c2.OperatorID;
                        state.eventID     = c2.EventID;
                        state.updateCount = c2.UpdateCount || 0;
                    }
                    // Selected classes
                    var selIds = d.Details02
                        .filter(function(x){ return x.IsSelected === 1 || x.IsSelected === '1'; })
                        .map(function(x){ return x.DocumentClassID; })
                        .filter(Boolean);
                    if (selIds.length > 0 && doc) doc.DocumentClassID = selIds.join(',');
                }

                // Fallback: top-level Details as array
                if (!doc && Array.isArray(d) && d.length > 0) doc = d[0];
                if (!doc && d && typeof d === 'object' && !Array.isArray(d) && (d.DocumentID || d.DocumentId)) doc = d;

                if (doc) {
                    state.documentData = doc;
                    bindForm(doc);
                    snapshotValues();
                    setMode('NONE');
                    showMsg('Record loaded successfully.', 'success');
                } else {
                    showMsg('No document found.', 'warning');
                    // Only clear form if in NONE mode (don't wipe during ADD/EDIT)
                    if (direction === 0 && state.editMode === 'NONE') {
                        clearForm();
                        state.documentData = null;
                    }
                }
            } else {
                // Not success — but don't clobber ADD/EDIT mode
                if (state.editMode === 'NONE') {
                    showMsg(result.ResponseMessage || 'No document found.', 'warning');
                    if (direction === 0) {
                        clearForm();
                        state.documentData = null;
                    }
                }
            }
        })
        .catch(function(err) {
            showLoading(false);
            showMsg('Error loading document: ' + err.message, 'error');
        });
    }

    /* ── Save ────────────────────────────────────────────────── */
    function saveData() {
        // Validation
        var docId   = val('documentId').trim();
        var docType = val('documentType').trim();
        if (!docId)   { showMsg('Document ID is required.', 'warning'); el('documentId')?.focus(); return; }
        if (!docType) { showMsg('Document Type is required.', 'warning'); el('documentType')?.focus(); return; }

        var actionLabel = state.editMode === 'ADD' ? 'create' : 'update';
        showConfirm(
            'Are you sure you want to ' + actionLabel + ' this document record?',
            'Save Document',
            'bi-save'
        ).then(function(confirmed) {
            if (!confirmed) { showMsg('Save cancelled.', 'info'); return; }

            var ctx   = getContext();
            var isAdd = state.editMode === 'ADD';

            var payload = {
                OurBranchID:    ctx.OurBranchID,
                AccountID:      ctx.AccountID,
                CreatedBy:      ctx.OperatorID,
                DocumentID:     docId,
                DocumentTypeID:  docType,
                ReceivedBy:     val('receivedBy').trim(),
                ReceivedDate:   el('receivedDate_picker')?.value || val('receivedDate').trim() || '',
                ExpiryDate:     '',
                ImageID:        String(state.imageID || 0),
                LocationID:     val('location').trim(),
                Remarks:        val('remarks').trim(),
                DocumentClasses: getDocumentClassesXml(),
                NewRecord:      isAdd ? 1 : (state.updateCount || 0)
            };

            showLoading(true);

            fetch(isAdd ? API.ADD : API.UPDATE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(function(r){ return r.json(); })
            .then(function(result) {
                showLoading(false);
                if (isSuccess(result)) {
                    showMsg(result.ResponseMessage || (isAdd ? 'Document added.' : 'Document updated.'), 'success');
                    setMode('NONE');
                    setTimeout(function(){ navigate(0); }, 100);
                } else {
                    showMsg(result.ResponseMessage || 'Save failed.', 'error');
                }
            })
            .catch(function(err) {
                showLoading(false);
                showMsg('Save error: ' + err.message, 'error');
            });
        });
    }

    /* ── Delete ──────────────────────────────────────────────── */
    function deleteData() {
        if (!state.documentData) { showMsg('No document selected.', 'warning'); return; }

        showConfirm(
            'Are you sure you want to delete this document? This action cannot be undone.',
            'Delete Document',
            'bi-trash'
        ).then(function(confirmed) {
            if (!confirmed) return;

            snapshotValues();
            setMode('DELETE');

            var ctx = getContext();
            showLoading(true);

            var payload = {
                AccountID:   ctx.AccountID,
                DocumentID:  val('documentId').trim(),
                OurBranchID: ctx.OurBranchID,
                OperatorID:  ctx.OperatorID
            };

            fetch(API.DELETE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(function(r){ return r.json(); })
            .then(function(result) {
                showLoading(false);
                if (isSuccess(result)) {
                    showMsg(result.ResponseMessage || 'Document deleted.', 'success');
                    state.documentData = null;
                    clearForm();
                    setMode('NONE');
                } else {
                    showMsg(result.ResponseMessage || 'Delete failed.', 'error');
                }
            })
            .catch(function(err) {
                showLoading(false);
                showMsg('Delete error: ' + err.message, 'error');
            });
        });
    }

    /* ── Confirmed Action Wrappers (matching original behavior) ─ */
    function confirmAdd() {
        showConfirm(
            'Clear form and prepare to add a new document for this account?',
            'Add Document',
            'bi-plus-circle'
        ).then(function(confirmed) {
            if (!confirmed) return;
            var currentId   = val('documentId');
            var currentDesc = val('documentDesc_lookup');
            snapshotValues();
            clearForm();
            if (currentId)   setVal('documentId', currentId);
            if (currentDesc) setVal('documentDesc_lookup', currentDesc);
            setMode('ADD');
            el('documentType')?.focus();
        });
    }

    function confirmEdit() {
        if (!state.documentData) { showMsg('Load a record before editing.', 'warning'); return; }
        showConfirm(
            'Enable editing for this document record? You will be able to modify document details.',
            'Edit Document',
            'bi-pencil-square'
        ).then(function(confirmed) {
            if (!confirmed) return;
            snapshotValues();
            setMode('EDIT');
            el('documentType')?.focus();
        });
    }

    function confirmCancel() {
        showConfirm(
            'Discard unsaved changes and return to view mode?',
            'Discard Changes',
            'bi-arrow-left-circle'
        ).then(function(confirmed) {
            if (!confirmed) return;
            restoreValues();
            setMode('NONE');
        });
    }

    /* ── Cancel / Clear / Show Image ─────────────────────────── */
    function cancelChanges() {
        if (state.documentData) {
            bindForm(state.documentData);
        }
        setMode('NONE');
    }

    function clearForm() {
        EDITABLE.concat(['documentDesc_lookup']).forEach(function(id) { setVal(id, ''); });
        AUDIT.forEach(function(id) { setVal(id, ''); });
        // Clear file input
        var fileIn = el('documentImage_file'); if (fileIn) fileIn.value = '';
        var display = el('documentClassDisplay');
        if (display) display.textContent = '--Select--';
        var ms = el('documentClassMultiselect');
        if (ms) ms.querySelectorAll('input[type="checkbox"]').forEach(function(cb){ cb.checked = false; });
        state.imageID     = 0;
        state.updateCount = 0;
        state.eventID     = null;
    }

    function showImage() {
        if (!state.imageID) { showMsg('No image available for this document.', 'warning'); return; }
        showMsg('Image viewer not yet implemented.', 'info');
    }

    /* ── Init ────────────────────────────────────────────────── */
    function init() {
        console.log('[AccountDocuments] Initializing');
        wireSectionToggles();
        wireInternalControls();

        // Initialize multiselect as disabled
        var ms = el('documentClassMultiselect');
        if (ms) ms.classList.add('disabled');

        // Load document class options from server-rendered data
        if (window.__documentClassOptions && window.__documentClassOptions.length > 0) {
            renderDocumentClasses(window.__documentClassOptions);
        }

        setMode('NONE');

        // Auto-load first record + document class list
        var ctx = getContext();
        if (ctx.AccountID) {
            setTimeout(function(){ navigate(1); }, 300);
        }
    }

    /* ── Public API ──────────────────────────────────────────── */
    return {
        init:          init,
        setMode:       setMode,
        navigate:      navigate,
        saveData:      saveData,
        deleteData:    deleteData,
        confirmAdd:    confirmAdd,
        confirmEdit:   confirmEdit,
        confirmCancel: confirmCancel,
        cancelChanges: cancelChanges,
        clearForm:     clearForm,
        showImage:     showImage,
        loadData:      function() { navigate(0); }
    };
})();

console.log('[AccountDocuments] Module registered');
