/* Collateral Types - Refined Modern Logic */
(async function () {
    console.log('🚀 Initializing Collateral Types page...');

    const { ServiceLoader } = window;

    if (!ServiceLoader) {
        console.error('❌ ServiceLoader not found!');
        return;
    }

    // Load necessary services
    await ServiceLoader.loadCore();
    await ServiceLoader.loadLimitsCollateralService();
    await ServiceLoader.loadLookupService();
    await ServiceLoader.loadSearchService();

    const LimitsCollateralService = window.LimitsCollateralService;
    const LookupService = window.LookupService;
    const SearchService = window.SearchService;

    // Form State
    let currentMode = 'VIEW';
    let currentData = null;
    let searchModal = null;

    // DOM References
    const els = {
        typeId: document.getElementById('TypeId'),
        description: document.getElementById('Description'),
        category: document.getElementById('Category'),
        valueType: document.getElementById('ValueType'),
        revaluationType: document.getElementById('RevaluationType'),
        revaluationRate: document.getElementById('RevaluationRate'),
        insuranceRequired: document.getElementById('InsuranceRequired'),
        margin: document.getElementById('Margin'),
        currencyIdCode: document.getElementById('CurrencyIdCode'),
        currencyIdName: document.getElementById('CurrencyIdName'),

        // BTS
        createdBy: document.getElementById('CreatedBy'),
        modifiedBy: document.getElementById('ModifiedBy'),
        supervisedBy: document.getElementById('SupervisedBy'),
        createdOn: document.getElementById('CreatedOn'),
        modifiedOn: document.getElementById('ModifiedOn'),
        supervisedOn: document.getElementById('SupervisedOn'),

        // Actions
        btnView: document.getElementById('btnView'),
        btnAdd: document.getElementById('btnAdd'),
        btnEdit: document.getElementById('btnEdit'),
        btnDelete: document.getElementById('btnDelete'),
        btnSave: document.getElementById('btnSave'),
        btnCancel: document.getElementById('btnCancel'),
        btnPrevious: document.getElementById('btnPrevious'),
        btnNext: document.getElementById('btnNext'),

        // Lookups
        btnSearchType: document.getElementById('btnSearchType'),
        btnSearchCurrency: document.getElementById('btnSearchCurrency')
    };

    // ============================================================================
    // COLLAPSIBLE SECTION FUNCTIONALITY
    // ============================================================================
    function initCollapsibleSections() {
        const sectionToggles = document.querySelectorAll('[data-section-toggle]');
        
        sectionToggles.forEach(toggle => {
            toggle.addEventListener('click', function(e) {
                // Prevent toggle if clicking on input elements inside header
                if (e.target.closest('input, select, button:not(.section-toggle-btn)')) {
                    return;
                }
                
                const section = this.closest('.form-section');
                const content = section.querySelector('[data-section-content]');
                const toggleBtn = this.querySelector('.section-toggle-btn');
                const icon = toggleBtn?.querySelector('i');
                
                if (!content) return;
                
                const isExpanded = toggleBtn?.getAttribute('aria-expanded') === 'true';
                
                if (isExpanded) {
                    // Collapse
                    content.style.maxHeight = content.scrollHeight + 'px';
                    content.offsetHeight; // Force reflow
                    content.style.maxHeight = '0';
                    content.style.opacity = '0';
                    content.style.overflow = 'hidden';
                    toggleBtn?.setAttribute('aria-expanded', 'false');
                    if (icon) icon.className = 'bi bi-chevron-down';
                } else {
                    // Expand
                    content.style.maxHeight = content.scrollHeight + 'px';
                    content.style.opacity = '1';
                    toggleBtn?.setAttribute('aria-expanded', 'true');
                    if (icon) icon.className = 'bi bi-chevron-up';
                    
                    // Remove max-height after transition to allow dynamic content
                    setTimeout(() => {
                        content.style.maxHeight = '';
                        content.style.overflow = '';
                    }, 300);
                }
            });
        });
        
        // Initialize all sections as expanded
        document.querySelectorAll('[data-section-content]').forEach(content => {
            content.style.transition = 'max-height 0.3s ease, opacity 0.3s ease';
        });
    }

    function getEnv() {
        const e = window.Environment || {};
        const bankID = e.defaultBankId || e.defaultBankID || e.bankID || e.bankId || '00';
        const ourBranchID = e.branchID || e.branchId || '0325';
        const operatorID = e.operatorID || e.operatorId || 'ADMIN';
        const moduleID = e.moduleID || e.moduleId || 1000;
        return { bankID, ourBranchID, operatorID, moduleID };
    }

    async function ensureSearchModal() {
        if (searchModal) return searchModal;
        if (!window.SearchModal) {
            showMessage('Search modal not available.', 'error');
            return null;
        }

        const { moduleID, operatorID, ourBranchID } = getEnv();
        searchModal = new window.SearchModal({
            prefix: 'ct',
            moduleID,
            getOperatorId: () => operatorID,
            getOurBranchId: () => {
                const cfg = searchModal?.currentConfig;
                if (cfg && cfg.allBranches) return '';
                return ourBranchID;
            },
            onError: (err) => {
                const msg = err?.message || String(err || 'Search error');
                showMessage(msg, 'error');
            }
        });

        return searchModal;
    }

    // --- Logic ---

    function switchMode(mode) {
        currentMode = mode.toUpperCase();
        console.log(`📋 Mode switched to: ${currentMode}`);

        const isView = currentMode === 'VIEW';
        const isAdd = currentMode === 'ADD';
        const isEdit = currentMode === 'EDIT';

        const hasRecord = !!currentData;

        // Buttons
        // View is a load action; keep it enabled in VIEW mode.
        // Disable it during Add/Edit to avoid losing unsaved changes.
        if (els.btnView) els.btnView.disabled = (isAdd || isEdit);
        if (els.btnAdd) els.btnAdd.disabled = isAdd;
        if (els.btnEdit) els.btnEdit.disabled = isEdit || isAdd || !hasRecord;
        if (els.btnDelete) els.btnDelete.disabled = isView || isAdd || !hasRecord;
        if (els.btnSave) els.btnSave.disabled = isView;
        if (els.btnCancel) els.btnCancel.disabled = false;

        if (els.btnPrevious) els.btnPrevious.disabled = !isView || !hasRecord;
        if (els.btnNext) els.btnNext.disabled = !isView || !hasRecord;

        // Form Fields
        const fields = [
            els.typeId, els.description, els.category, els.valueType,
            els.revaluationType, els.revaluationRate, els.margin,
            els.insuranceRequired, els.currencyIdCode
        ];

        fields.forEach(f => {
            if (!f) return;

            // In VIEW mode allow entering Type ID for quick view/search
            const allowEditInView = (f === els.typeId);

            if (isView) {
                if (allowEditInView) {
                    f.removeAttribute('readonly');
                    if (f.tagName === 'SELECT' || f.type === 'checkbox') f.disabled = false;
                } else {
                    f.setAttribute('readonly', 'true');
                    if (f.tagName === 'SELECT' || f.type === 'checkbox') f.disabled = true;
                }
                return;
            }

            f.removeAttribute('readonly');
            if (f.tagName === 'SELECT' || f.type === 'checkbox') f.disabled = false;

            // Primary Key protection
            if (isEdit && f === els.typeId) f.setAttribute('readonly', 'true');
        });

        if (isAdd) clearForm();
    }



    async function loadData(direction) {
        const id = els.typeId.value.trim();
        if (!id) {
            showMessage('Please enter a Type ID', 'warning');
            return;
        }

        showMessage('Loading...', 'info');

        try {
            const { bankID, ourBranchID, operatorID, moduleID } = getEnv();

            const requestData = {
                BankID: bankID,
                CollateralTypeID: els.typeId.value.trim(),
                OurBranchID: ourBranchID,
                OperatorID: operatorID
            };

            // Only send direction if explicitly navigating (Next/Prev)
            if (direction === '0' || direction === '1') {
                requestData.Direction = direction;
            }

            const result = await LimitsCollateralService.getCollateralTypes(requestData);

            // CoreApi normalizes many shapes. Collateral Types responses in some envs come back as
            // { Details: [...] } instead of { Details01: [...] }. Also can be just an array.

            // Should find the Array of records first
            // Aggregate all potential arrays to find the real record.
            // "Details" might be metadata, while "Details01" has the data.
            let allRecords = [];
            const addIfArray = (arr) => {
                if (Array.isArray(arr)) allRecords = allRecords.concat(arr);
            };

            const src = result?.data || result;
            if (src) {
                addIfArray(src); // if src itself is array
                addIfArray(src.Details);
                addIfArray(src.Details01);
                addIfArray(src.Details02);
                addIfArray(src.data);
            }

            let rawData = null;
            if (allRecords.length > 0) {
                // Find the first record that looks like a valid Collateral Type
                rawData = allRecords.find(item =>
                    item && typeof item === 'object' &&
                    (item.CollateralTypeID || item.BankID || item.Description)
                );

                // Fallback 1: excludes known metadata fields
                if (!rawData) {
                    rawData = allRecords.find(item => item && typeof item === 'object' && !item.EventID && !item.UpdateCount);
                }

                // Fallback 2: If we still have nothing but have records, just take the first object that has keys
                if (!rawData && allRecords.length > 0) {
                    rawData = allRecords.find(item => item && typeof item === 'object' && Object.keys(item).length > 2);
                }

                if (!rawData) {
                    console.warn('[CollateralTypes] Found records but none matched valid data criteria:', allRecords);
                }
            } else if (result?.data && !Array.isArray(result.data) && result.data.CollateralTypeID) {
                rawData = result.data;
            }

            if (result.success && rawData && typeof rawData === 'object') {
                currentData = rawData;
                console.log('[CollateralTypes] Loaded record:', rawData);
                mapToUI(rawData);
                switchMode('VIEW');
                showMessage('Data loaded.', 'success');
            } else {
                console.warn('[CollateralTypes] No record found. Raw result:', result);
                showMessage(result?.message || 'No data found.', 'warning');
                // Optional: clear form if we thought we were loading into view but failed
                // but usually better to leave the ID typed so user can correct it
            }
        } catch (err) {
            showMessage('Error: ' + err.message, 'error');
        }
    }

    function collectFromUI() {
        const { bankID, ourBranchID, operatorID, moduleID } = getEnv();

        const parseNum = (v) => {
            if (!v) return 0;
            const n = parseFloat(String(v).replace(/,/g, ''));
            return isFinite(n) ? n : 0;
        };

        return {
            BankID: bankID,
            CollateralTypeID: (els.typeId?.value || '').trim(),
            Description: (els.description?.value || '').trim(),
            CollateralCategoryID: (els.category?.value || '').trim(),
            CollateralValueTypeID: (els.valueType?.value || '').trim(),
            RevaluationTypeID: (els.revaluationType?.value || '').trim(),
            RevaluationRate: parseNum(els.revaluationRate?.value),
            InsuranceRequired: els.insuranceRequired?.checked ? 1 : 0,

            Margin: parseNum(els.margin?.value),
            CurrencyID: (els.currencyIdCode?.value || '').trim(),
            ValuationRequired: 0,
            RevaluationFrequencyID: '', // SP handles empty string in INSERT, updated in logic
            CreatedBy: operatorID,
            ModifiedBy: operatorID,
            SupervisedBy: '', // SP expects this parameter
            NewRecord: currentMode === 'ADD' ? 1 : 2 // 1=Insert, 2=Update (based on UpdateCount logic in SP)
        };
    }

    function validateBeforeSave(payload) {
        const required = [
            { key: 'CollateralTypeID', label: 'Type ID' },
            { key: 'Description', label: 'Description' },
            { key: 'CollateralCategoryID', label: 'Category' },
            { key: 'CollateralValueTypeID', label: 'Value Type' },
            { key: 'RevaluationTypeID', label: 'Revaluation Type' },
            { key: 'CurrencyID', label: 'Currency ID' }
        ];

        for (const r of required) {
            if (!payload[r.key]) {
                showMessage(`${r.label} is required.`, 'warning');
                return false;
            }
        }

        const numericFields = [
            { key: 'RevaluationRate', label: 'Revaluation Rate' },
            { key: 'Margin', label: 'Margin' }
        ];

        for (const n of numericFields) {
            const v = payload[n.key];
            if (!v) continue;
            const asNum = Number(String(v).replace(/,/g, ''));
            if (!Number.isFinite(asNum)) {
                showMessage(`${n.label} must be numeric.`, 'warning');
                return false;
            }
        }

        return true;
    }

    function mapToUI(d) {
        const ensureSelectValue = (selectEl, value, label) => {
            if (!selectEl || !value) return;
            const v = String(value);
            const has = Array.from(selectEl.options || []).some(o => o.value === v);
            if (!has) {
                const opt = document.createElement('option');
                opt.value = v;
                opt.textContent = label || v;
                selectEl.appendChild(opt);
            }
            selectEl.value = v;
        };

        if (els.typeId) els.typeId.value = d.CollateralTypeID || '';
        if (els.description) els.description.value = d.Description || '';
        ensureSelectValue(els.category, d.CollateralCategoryID || '', d.CollateralCategory || d.CollateralCategoryName || '');
        ensureSelectValue(els.valueType, d.CollateralValueTypeID || '', d.CollateralValueType || d.CollateralValueTypeName || '');
        ensureSelectValue(els.revaluationType, d.RevaluationTypeID || '', d.RevaluationType || d.RevaluationTypeName || '');
        if (els.revaluationRate) els.revaluationRate.value = d.RevaluationRate || '';
        if (els.insuranceRequired) els.insuranceRequired.checked = (d.InsuranceRequired === 'Y' || d.InsuranceRequired === true);
        if (els.margin) els.margin.value = d.Margin || '';

        if (els.currencyIdCode) els.currencyIdCode.value = d.CurrencyID || '';
        if (els.currencyIdName) els.currencyIdName.value = d.CurrencyName || d.Currency || '';

        // BTS
        if (els.createdBy) els.createdBy.value = d.CreatedBy || '';
        if (els.createdOn) els.createdOn.value = formatDT(d.CreatedOn);
        if (els.modifiedBy) els.modifiedBy.value = d.ModifiedBy || '';
        if (els.modifiedOn) els.modifiedOn.value = formatDT(d.ModifiedOn);
        if (els.supervisedBy) els.supervisedBy.value = d.SupervisedBy || '';
        if (els.supervisedOn) els.supervisedOn.value = formatDT(d.SupervisedOn);
    }

    function formatDT(s) {
        if (!s) return '';
        // Use GlobalUtils.formatDate if available for consistent date formatting
        if (window.GlobalUtils && window.GlobalUtils.formatDate) {
            return window.GlobalUtils.formatDate(s);
        }
        const d = new Date(s);
        return isNaN(d.getTime()) ? s : d.toLocaleString();
    }

    // ============================================================================
    // TOAST NOTIFICATION SYSTEM - Matching Client Limit pattern
    // ============================================================================
    let toastTimer = null;
    let toastEl = null;

    function ensureToastElement() {
        if (toastEl) return toastEl;
        toastEl = document.getElementById('formToast');
        if (toastEl) return toastEl;
        
        // Create toast element if not exists
        toastEl = document.createElement('div');
        toastEl.id = 'formToast';
        toastEl.className = 'am-message-panel hidden';
        document.body.appendChild(toastEl);
        return toastEl;
    }

    function showMessage(msg, type = 'info') {
        const toast = ensureToastElement();
        if (!toast) return;

        if (toastTimer) {
            clearTimeout(toastTimer);
            toastTimer = null;
        }

        // Add icon based on type
        let icon = 'bi-info-circle';
        if (type === 'success') icon = 'bi-check-circle';
        if (type === 'error') icon = 'bi-x-circle';
        if (type === 'warning') icon = 'bi-exclamation-triangle';

        toast.innerHTML = `<i class="bi ${icon}"></i><span class="message-text">${msg}</span>`;
        toast.className = `am-message-panel ${type} show`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');

        // Click-to-dismiss
        toast.onclick = () => {
            toast.classList.remove('show');
            toastTimer = setTimeout(() => {
                toast.classList.add('hidden');
            }, 300);
        };

        // Ensure visible even if previously hidden
        toast.classList.remove('hidden');
        void toast.offsetWidth; // Force reflow

        toastTimer = setTimeout(() => {
            toast.classList.remove('show');
            toastTimer = setTimeout(() => {
                toast.classList.add('hidden');
            }, 300);
        }, 4000);
    }

    // --- Actions ---

    async function handleSave() {
        if (!LimitsCollateralService) {
            showMessage('LimitsCollateralService not available.', 'error');
            return;
        }

        if (currentMode === 'VIEW') {
            showMessage('Switch to Add/Edit before saving.', 'warning');
            return;
        }

        const payload = collectFromUI();
        if (!validateBeforeSave(payload)) return;

        showMessage('Saving...', 'info');

        try {
            const isAdd = currentMode === 'ADD';
            // 1. Call the main data SP
            const resp = isAdd
                ? await LimitsCollateralService.createCollateralType(payload)
                : await LimitsCollateralService.updateCollateralType(payload);

            if (resp && resp.success) {
                // 2. Call the supervision SP
                // Re-fetch environment variables needed for supervision that were excluded from main payload
                const { bankID, ourBranchID, moduleID, operatorID } = getEnv();

                try {
                    const supervisionPayload = {
                        BankID: bankID,
                        OurBranchID: ourBranchID,
                        ModuleID: moduleID,
                        OperatorID: operatorID,
                        // For Collateral Types, the ID is likely the ref
                        RefID: payload.CollateralTypeID,
                        TableID: 'CollateralType', // Assuming TableID, or it might be inferred by ModuleID
                        Action: isAdd ? 'ADD' : 'EDIT'
                    };

                    console.log('Calling supervision with:', supervisionPayload);
                    const supResp = await LimitsCollateralService.addSupervisionData(supervisionPayload);

                    if (!supResp || !supResp.success) {
                        console.warn('Supervision call failed:', supResp);
                        // We decide whether this is fatal. Usually, if data saved but supervision failed, it's a warning.
                        showMessage('Data saved, but supervision trigger failed: ' + (supResp?.message || 'Unknown'), 'warning');
                    } else {
                        showMessage('Saved and sent for supervision successfully.', 'success');
                    }
                } catch (supErr) {
                    console.error('Supervision error:', supErr);
                    showMessage('Saved, but supervision error: ' + supErr.message, 'warning');
                }

                await loadData();
            } else {
                showMessage(resp?.message || 'Save failed.', 'error');
            }
        } catch (err) {
            showMessage('Save error: ' + err.message, 'error');
        }
    }

    async function handleDelete() {
        if (!confirm('Are you sure you want to delete this record?')) return;
        if (!LimitsCollateralService) {
            showMessage('LimitsCollateralService not available.', 'error');
            return;
        }

        const { bankID, ourBranchID, operatorID } = getEnv();
        const id = (els.typeId?.value || '').trim();
        if (!id) {
            showMessage('Type ID is required.', 'warning');
            return;
        }

        showMessage('Deleting...', 'info');

        try {
            const requestData = {
                BankID: bankID,
                OurBranchID: ourBranchID,
                CollateralTypeID: id,
                OperatorID: operatorID
            };

            const resp = await LimitsCollateralService.deleteCollateralType(requestData);
            if (resp && resp.success) {
                // Call Supervision
                try {
                    const { moduleID } = getEnv();
                    const supervisionPayload = {
                        BankID: bankID,
                        OurBranchID: ourBranchID,
                        ModuleID: moduleID,
                        OperatorID: operatorID,
                        RefID: id,
                        TableID: 'CollateralType',
                        Action: 'DELETE'
                    };
                    await LimitsCollateralService.addSupervisionData(supervisionPayload);
                } catch (supErr) {
                    console.warn('Supervision delete trigger failed/ignored:', supErr);
                }

                showMessage('Deleted successfully.', 'success');
                clearForm();
                switchMode('VIEW');
            } else {
                showMessage(resp?.message || 'Delete failed.', 'error');
            }
        } catch (err) {
            showMessage('Delete error: ' + err.message, 'error');
        }
    }

    async function handleCurrencyLookup() {
        const modal = await ensureSearchModal();
        if (!modal) return;

        modal.open({
            title: 'Search Currency',
            tableID: 'MastCurrencyID',
            // Use both potential keys for uniqueness to avoid collapsing all rows if one missing
            uniqueBy: ['CurrencyID', 'CurrencyCode'],
            allBranches: true,
            searchFields: [
                { name: 'currencyId', label: 'Currency ID', column: 'CurrencyID' },
                // 'Description' is safer than 'CurrencyName' for reference tables
                { name: 'currencyName', label: 'Currency Name', column: 'Description' }
            ],
            displayFields: [
                { key: 'CurrencyID', label: 'Currency ID' },
                { key: 'Description', label: 'Currency Name' },
                { key: 'CurrencyCode', label: 'Code' }
            ],
            onSelect: (row) => {
                const keys = Object.keys(row || {});
                const pick = (k) => {
                    const found = keys.find(x => x.toLowerCase() === k.toLowerCase());
                    return found ? row[found] : '';
                };
                // Broader fallback for ID
                const id = pick('CurrencyID') || pick('CurrencyId') || pick('CodeID') || pick('CurrencyCode') || pick('Code');
                const name = pick('CurrencyName') || pick('Description') || pick('CodeDescription') || pick('Currency');

                if (els.currencyIdCode) els.currencyIdCode.value = id || '';
                if (els.currencyIdName) els.currencyIdName.value = name || '';
            }
        });
    }

    async function populateDropdowns() {
        if (!LookupService) {
            showMessage('LookupService not available (dropdowns cannot load).', 'error');
            return;
        }

        try {
            // Always reset to a known state
            if (els.category) els.category.innerHTML = '<option value="">--Select--</option>';
            if (els.valueType) els.valueType.innerHTML = '<option value="">--Select--</option>';
            if (els.revaluationType) els.revaluationType.innerHTML = '<option value="">--Select--</option>';

            // Revaluation Type (system codes)
            if (els.revaluationType) {
                const revalOptions = await LookupService.getRevaluationTypes();
                if (!revalOptions || revalOptions.length === 0) {
                    showMessage('Revaluation Type codes not found.', 'warning');
                } else {
                    revalOptions.forEach(opt => {
                        const option = document.createElement('option');
                        option.value = opt.value;
                        option.textContent = opt.label;
                        els.revaluationType.appendChild(option);
                    });
                }
            }

            // Collateral Category (system codes)
            if (els.category) {
                const catOptions = await LookupService.getSystemCodeOptions('CollateralCategoryID');
                if (!catOptions || catOptions.length === 0) {
                    showMessage('Collateral Category codes not found.', 'warning');
                } else {
                    catOptions.forEach(opt => {
                        const option = document.createElement('option');
                        option.value = opt.value;
                        option.textContent = opt.label;
                        els.category.appendChild(option);
                    });
                }
            }

            // Collateral Value Type (system codes)
            if (els.valueType) {
                const vtOptions = await LookupService.getSystemCodeOptions('CollateralValueTypeID');
                if (!vtOptions || vtOptions.length === 0) {
                    showMessage('Collateral Value Type codes not found.', 'warning');
                } else {
                    vtOptions.forEach(opt => {
                        const option = document.createElement('option');
                        option.value = opt.value;
                        option.textContent = opt.label;
                        els.valueType.appendChild(option);
                    });
                }
            }
        } catch (err) {
            console.warn('[CollateralTypes] Dropdown population failed:', err);
            showMessage('Failed to load dropdown codes.', 'error');
        }
    }

    function clearForm() {
        // Remove :not([readonly]) to ensure ALL fields are cleared
        document.querySelectorAll('.form-content input, .form-content select').forEach(el => {
            if (el.type === 'checkbox') {
                el.checked = false;
            } else {
                el.value = '';
            }
        });

        // Explicitly clear specific UI helper fields if missed by general selector
        [els.currencyIdName, els.createdBy, els.modifiedBy, els.supervisedBy, els.createdOn, els.modifiedOn, els.supervisedOn].forEach(f => {
            if (f) f.value = '';
        });
        currentData = null;
    }

    function handleCancel() {
        // User requested immediate clear of all fields on cancel
        clearForm();
        switchMode('VIEW');
    }

    async function handleTypeLookup() {
        const modal = await ensureSearchModal();
        if (!modal) return;

        // NOTE: tableID must match backend search configuration.
        // Based on existing module patterns, Collateral Types search is typically keyed by 'CollateralTypeID'.
        modal.open({
            title: 'Search Collateral Types',
            tableID: 'CollateralTypeID',
            uniqueBy: 'CollateralTypeID',
            allBranches: true,
            searchFields: [
                { name: 'typeId', label: 'Type ID', column: 'CollateralTypeID' },
                { name: 'description', label: 'Description', column: 'Description' }
            ],
            displayFields: [
                { key: 'CollateralTypeID', label: 'Type ID' },
                { key: 'Description', label: 'Description' }
            ],
            onSelect: (row) => {
                const keys = Object.keys(row || {});
                const pick = (k) => {
                    const found = keys.find(x => x.toLowerCase() === k.toLowerCase());
                    return found ? row[found] : '';
                };
                const id = pick('CollateralTypeID') || pick('TypeID') || pick('TypeId');
                if (!id) {
                    showMessage('Selected row has no Type ID.', 'warning');
                    return;
                }
                if (els.typeId) els.typeId.value = id;
                loadData();
            }
        });
    }

    // --- Init ---

    async function init() {
        // Initialize collapsible sections
        initCollapsibleSections();
        
        await populateDropdowns();

        if (els.btnView) els.btnView.addEventListener('click', () => loadData());
        if (els.btnAdd) els.btnAdd.addEventListener('click', () => switchMode('ADD'));
        if (els.btnEdit) els.btnEdit.addEventListener('click', () => switchMode('EDIT'));
        if (els.btnDelete) els.btnDelete.addEventListener('click', handleDelete);
        if (els.btnSave) els.btnSave.addEventListener('click', handleSave);
        if (els.btnCancel) els.btnCancel.addEventListener('click', handleCancel);

        if (els.btnSearchType) els.btnSearchType.addEventListener('click', handleTypeLookup);
        if (els.btnSearchCurrency) els.btnSearchCurrency.addEventListener('click', handleCurrencyLookup);

        if (els.btnPrevious) els.btnPrevious.addEventListener('click', () => loadData('0'));
        if (els.btnNext) els.btnNext.addEventListener('click', () => loadData('1'));

        if (els.typeId) {
            els.typeId.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') loadData();
            });
        }

        switchMode('VIEW');
    }

    // Script is loaded at end of body in this module, so DOM is already available.
    // Avoid relying on DOMContentLoaded (can be missed if service loading took time).
    init();

})();
