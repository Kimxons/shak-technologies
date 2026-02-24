(function () {
    console.log('LCApplication.js script executing');

    const setRuntimeStatus = (message) => {
        const el = document.getElementById('lcRuntimeStatus');
        if (!el) return;
        el.textContent = message;
    };

    const setDiagnosticsText = (payload) => {
        const el = document.getElementById('lcDiagnosticsText');
        if (!el) return;
        el.value = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
    };

    const getLcEndpointGuess = () => {
        try {
            const env = window.Environment || {};
            const base = (env.baseUrlLCApplication || env.baseUrlCommon || '').toString().replace(/\/+$/, '');
            return base ? `${base}/api/OldAPI` : '';
        } catch {
            return '';
        }
    };

    const normalizeToken = (value) => String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

    const toPascalCase = (labelText) => {
        const words = String(labelText || '')
            .trim()
            .split(/[^a-zA-Z0-9]+/)
            .filter(Boolean);
        return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
    };

    const ensureAutoIdsForFields = () => {
        // LCApplication.html has very few explicit ids; we auto-assign predictable ids from labels
        // so the API record can bind without needing to edit hundreds of inputs.
        const allControls = Array.from(document.querySelectorAll('input, select, textarea'));
        const used = new Set(allControls.map((el) => el.id).filter(Boolean));

        const fields = Array.from(document.querySelectorAll('.cbs-field'));
        fields.forEach((field) => {
            const label = field.querySelector('.cbs-label');
            if (!label) return;
            const baseId = toPascalCase(label.textContent);
            if (!baseId) return;

            const control = field.querySelector('input, select, textarea');
            if (!control) return;

            // Skip hidden/system controls.
            if (control instanceof HTMLInputElement && control.type === 'hidden') return;

            if (control.id) return;

            let candidate = baseId;
            let i = 2;
            while (used.has(candidate)) {
                candidate = `${baseId}_${i++}`;
            }

            control.id = candidate;
            if (!control.name) control.name = candidate;
            used.add(candidate);
        });
    };

    const getActionButtonByText = (label) => {
        const buttons = Array.from(document.querySelectorAll('.cm-legacy-actions .cm-shell__action'));
        const target = label.trim().toLowerCase();
        return buttons.find(b => (b.textContent || '').trim().toLowerCase() === target) || null;
    };

    const getLookupModal = () => {
        const el = document.getElementById('lcLookupModal');
        if (!el) return null;
        return bootstrap.Modal.getOrCreateInstance(el);
    };

    const setLookupStatus = (message) => {
        const el = document.getElementById('lcLookupStatus');
        if (el) el.textContent = message || '';
    };

    const extractRows = (normalizedResult) => {
        const payload = normalizedResult?.data ?? normalizedResult?.Details ?? null;
        if (Array.isArray(payload)) return payload;
        if (!payload || typeof payload !== 'object') return [];

        // If multiple datasets exist, use the first array we can find.
        for (const key of Object.keys(payload)) {
            if (Array.isArray(payload[key])) return payload[key];
        }

        return [];
    };

    const findFieldValue = (row, candidates) => {
        if (!row || typeof row !== 'object') return null;
        for (const c of candidates) {
            if (row[c] !== undefined && row[c] !== null && String(row[c]).trim() !== '') return row[c];
        }
        // Case-insensitive fallback
        const keys = Object.keys(row);
        for (const c of candidates) {
            const match = keys.find(k => k.toLowerCase() === String(c).toLowerCase());
            if (match && row[match] !== undefined && row[match] !== null && String(row[match]).trim() !== '') return row[match];
        }
        return null;
    };

    const renderLookupTable = (rows, onPick) => {
        const table = document.getElementById('lcLookupTable');
        if (!table) return;
        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');
        if (!thead || !tbody) return;

        thead.innerHTML = '';
        tbody.innerHTML = '';

        if (!rows.length) {
            setLookupStatus('No results.');
            return;
        }

        const columns = Object.keys(rows[0]).slice(0, 6);
        const headerRow = document.createElement('tr');
        for (const col of columns) {
            const th = document.createElement('th');
            th.scope = 'col';
            th.textContent = col;
            headerRow.appendChild(th);
        }
        thead.appendChild(headerRow);

        rows.slice(0, 50).forEach((row) => {
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';
            tr.addEventListener('click', () => onPick(row));
            for (const col of columns) {
                const td = document.createElement('td');
                const v = row[col];
                td.textContent = v === null || v === undefined ? '' : String(v);
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        });

        setLookupStatus(`Showing ${Math.min(rows.length, 50)} of ${rows.length} result(s). Click a row to select.`);
    };

    const getBestRecord = (normalizedResult) => {
        const candidate = normalizedResult?.data ?? normalizedResult?.Details ?? null;

        if (Array.isArray(candidate)) {
            return candidate[0] || null;
        }

        if (candidate && typeof candidate === 'object') {
            // Some responses return multiple datasets as Details01/Details02/...; try to find the first array dataset.
            for (const key of Object.keys(candidate)) {
                if (Array.isArray(candidate[key])) {
                    return candidate[key][0] || null;
                }
            }
            return candidate;
        }

        return null;
    };

    const bindRecordToInputs = (record) => {
        if (!record || typeof record !== 'object') return;

        // Build a case/format-insensitive lookup: "Goods Description" -> "goodsdescription".
        const normalizedMap = new Map();
        for (const [key, value] of Object.entries(record)) {
            normalizedMap.set(normalizeToken(key), value);
        }

        const controls = Array.from(document.querySelectorAll('input, select, textarea'));
        const bound = new Set();

        controls.forEach((el) => {
            // Prefer explicit ids/names; fall back to label-derived ids.
            const idKey = el.id ? normalizeToken(el.id) : '';
            const nameKey = el.name ? normalizeToken(el.name) : '';
            const matchKey = (idKey && normalizedMap.has(idKey)) ? idKey : (nameKey && normalizedMap.has(nameKey) ? nameKey : null);
            if (!matchKey) return;

            const value = normalizedMap.get(matchKey);
            if (el instanceof HTMLInputElement) {
                if (el.type === 'checkbox') {
                    el.checked = value === true || value === 1 || String(value).toLowerCase() === 'true' || String(value) === '1';
                    return;
                }
                el.value = value ?? '';
                bound.add(el);
                return;
            }

            if (el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
                el.value = value ?? '';
                bound.add(el);
                return;
            }
        });

        // Fallback: match by label text (useful when ids are auto-generated from labels).
        const fields = Array.from(document.querySelectorAll('.cbs-field'));
        fields.forEach((field) => {
            const label = field.querySelector('.cbs-label');
            const control = field.querySelector('input, select, textarea');
            if (!label || !control) return;
            if (bound.has(control)) return;
            if (control instanceof HTMLInputElement && control.type === 'hidden') return;

            const labelKey = normalizeToken(label.textContent);
            if (!labelKey || !normalizedMap.has(labelKey)) return;

            const value = normalizedMap.get(labelKey);
            if (control instanceof HTMLInputElement) {
                if (control.type === 'checkbox') {
                    control.checked = value === true || value === 1 || String(value).toLowerCase() === 'true' || String(value) === '1';
                    return;
                }
                control.value = value ?? '';
                return;
            }

            if (control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement) {
                control.value = value ?? '';
            }
        });
    };

    const showApiResponse = (payload) => {
        const panel = document.getElementById('lcApplicationResponsePanel');
        const textarea = document.getElementById('lcApplicationApiResponse');
        if (!panel || !textarea) return;
        panel.style.display = '';
        textarea.value = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
    };

    const safeShow = (payload) => {
        try {
            showApiResponse(payload);
        } catch (e) {
            console.error('Failed to render API response panel:', e);
        }
    };

    const LC_FORM_MODES = {
        VIEW: 'view',
        ADD: 'add'
    };

    let currentFormMode = LC_FORM_MODES.ADD;

    const setFormMode = (mode) => {
        currentFormMode = mode;

        const form = document.querySelector('form.cm-shell-form');
        if (!form) return;

        const isEditable = mode === LC_FORM_MODES.ADD;

        const controls = Array.from(form.querySelectorAll('input, select, textarea, button'));
        controls.forEach((el) => {
            // Keep navigation + action bars always usable.
            if (el.closest('.cm-legacy-nav') || el.closest('.cm-legacy-actions')) {
                el.disabled = false;
                return;
            }

            // Allow explicit opt-outs.
            if (el.hasAttribute('data-always-enabled')) {
                el.disabled = false;
                return;
            }

            // Don’t override intrinsic readonly fields.
            if (el instanceof HTMLInputElement && el.readOnly) {
                el.disabled = false;
                return;
            }

            // Only enable/disable editable fields.
            el.disabled = !isEditable;
        });

        // Action button hints (best-effort; don't block if elements not present)
        const btnView = document.getElementById('lcBtnView') || getActionButtonByText('View');
        const btnAdd = document.getElementById('lcBtnAdd') || getActionButtonByText('Add');
        const btnEdit = document.getElementById('lcBtnEdit') || getActionButtonByText('Edit');
        const btnDelete = document.getElementById('lcBtnDelete') || getActionButtonByText('Delete');
        const btnSave = document.getElementById('lcBtnSave') || getActionButtonByText('Save');
        const btnCancel = document.getElementById('lcBtnCancel') || getActionButtonByText('Cancel');

        if (btnView) btnView.disabled = false;
        if (mode === LC_FORM_MODES.ADD) {
            if (btnAdd) btnAdd.disabled = true;
            if (btnEdit) btnEdit.disabled = true;
            if (btnDelete) btnDelete.disabled = false;
            if (btnSave) btnSave.disabled = false;
            if (btnCancel) btnCancel.disabled = false;
        } else {
            if (btnAdd) btnAdd.disabled = false;
            if (btnEdit) btnEdit.disabled = false;
            if (btnDelete) btnDelete.disabled = false;
            if (btnSave) btnSave.disabled = true;
            if (btnCancel) btnCancel.disabled = true;
        }
    };

    const forceEnableFormControls = () => {
        const form = document.querySelector('form.cm-shell-form');
        if (!form) return { enabled: 0, total: 0 };

        let enabled = 0;
        const controls = Array.from(form.querySelectorAll('input, select, textarea'));
        controls.forEach((el) => {
            if (el.closest('.cm-legacy-nav') || el.closest('.cm-legacy-actions')) return;
            if (el instanceof HTMLInputElement && el.type === 'hidden') return;

            // Remove hard blocks.
            try { el.disabled = false; } catch { /* ignore */ }
            try {
                if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
                    // Some pages ship with readonly flags; allow typing.
                    el.readOnly = false;
                }
            } catch { /* ignore */ }
            enabled++;
        });

        return { enabled, total: controls.length };
    };

    const getFormInteractivitySnapshot = () => {
        const form = document.querySelector('form.cm-shell-form');
        if (!form) return { present: false };
        const controls = Array.from(form.querySelectorAll('input, select, textarea'))
            .filter((el) => !(el instanceof HTMLInputElement && el.type === 'hidden'));
        const disabled = controls.filter((el) => !!el.disabled);
        const readOnly = controls.filter((el) => (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) && !!el.readOnly);
        return {
            present: true,
            total: controls.length,
            disabled: disabled.length,
            readOnly: readOnly.length,
            sampleDisabled: disabled.slice(0, 8).map((el) => el.id || el.name || el.tagName),
            sampleReadOnly: readOnly.slice(0, 8).map((el) => el.id || el.name || el.tagName)
        };
    };

    const snapshotIdentifierFields = () => {
        const getVal = (id) => (document.getElementById(id)?.value ?? '').toString();
        const getText = (id) => (document.getElementById(id)?.textContent ?? '').toString();
        return {
            OurBranchID: getVal('OurBranchID'),
            OurBranchName: getText('OurBranchName'),
            ApplicationID: getVal('ApplicationID'),
            ClientID: getVal('ClientID'),
            AccountID: getVal('AccountID')
        };
    };

    const restoreIdentifierFields = (snap) => {
        if (!snap) return;
        const setVal = (id, v) => {
            const el = document.getElementById(id);
            if (el) el.value = (v ?? '').toString();
        };
        const setText = (id, v) => {
            const el = document.getElementById(id);
            if (el) el.textContent = (v ?? '').toString();
        };

        setVal('OurBranchID', snap.OurBranchID);
        setText('OurBranchName', snap.OurBranchName);
        setVal('ApplicationID', snap.ApplicationID);
        setVal('ClientID', snap.ClientID);
        setVal('AccountID', snap.AccountID);
    };

    const applyAddLikeUiState = () => {
        // Primary behavior: explicitly enable the form like Add mode.
        setFormMode(LC_FORM_MODES.ADD);

        // Secondary behavior: if host page has additional "Add" click side-effects, trigger them too.
        const addBtn = document.getElementById('lcBtnAdd') || getActionButtonByText('Add');
        if (!addBtn) return true;

        const snap = snapshotIdentifierFields();
        try {
            addBtn.click();
        } finally {
            restoreIdentifierFields(snap);
        }

        return true;
    };

    const handleView = async () => {

        console.log('LCApplication.js: handleView invoked');    
        try {
            const current = document.getElementById('lcRuntimeStatus')?.textContent || '';
            setRuntimeStatus((current ? current + ' • ' : '') + `View clicked @ ${new Date().toLocaleTimeString()}`);
        } catch {
            // ignore
        }

        // Get form field values
        const ourBranchId = (document.getElementById('OurBranchID')?.value || '').trim();
        const applicationId = (document.getElementById('ApplicationID')?.value || '').trim();
        const operatorId = (document.getElementById('OperatorID')?.value || '').trim() || '1';

        // Validate required fields
        if (!ourBranchId) {
            window.alert('Please enter Branch ID');
            document.getElementById('OurBranchID')?.focus();
            return;
        }

        if (!applicationId) {
            window.alert('Please enter Application ID');
            document.getElementById('ApplicationID')?.focus();
            return;
        }

        try {
            // Load service
            if (!window.ServiceLoader) {
                throw new Error('ServiceLoader not available. Ensure serviceLoader.js is loaded.');
            }
            await window.ServiceLoader.loadLCApplicationService();
            if (!window.LCApplicationService?.getLCApplication) {
                throw new Error('LCApplicationService not available after loading.');
            }

            console.log('Calling getLCApplication with:', {
                ApplicationID: applicationId,
                OurBranchID: ourBranchId,
                OperatorID: operatorId,
                Direction: 0,
                BankID: ""
            });

            // Call service with form data
            const result = await window.LCApplicationService.getLCApplication({
                ApplicationID: applicationId,
                OurBranchID: ourBranchId,
                OperatorID: operatorId,
                Direction: 0,
                BankID: ""
            });

            console.log('getLCApplication result:', result);
            safeShow(result);

            if (!result?.success) {
                throw new Error(result?.message || 'Failed to fetch LC Application');
            }

            const record = getBestRecord(result);
            if (!record) {
                window.alert('No record returned for that Branch/Application ID.');
                return;
            }

            // Bind result data to form inputs
            bindRecordToInputs(record);

            // Update branch name if available
            const branchNameEl = document.getElementById('OurBranchName');
            const branchName = record?.OurBranchName ?? record?.BranchName ?? record?.Branch ?? null;
            if (branchNameEl && branchName) branchNameEl.textContent = branchName;

            setRuntimeStatus('View successful');
        } catch (err) {
            console.error('View failed:', err);
            safeShow({ error: String(err?.message || err), details: err });
            window.alert('Error: ' + (err?.message || String(err)));
        }
    };

    const init = () => {
        console.log('LCApplication.js initializing logic...');

        // Expose for manual testing in DevTools: window.LCApplicationPage.handleView()
        globalThis.LCApplicationPage = {
            handleView
        };

        setRuntimeStatus('LCApplication.js: loaded');

        // All fields are enabled by default - no mode forcing needed

        // Diagnostics panel wiring
        const diagPanel = document.getElementById('lcDiagnosticsPanel');
        const btnDiag = document.getElementById('lcBtnToggleDiagnostics');
        const btnTest = document.getElementById('lcBtnTestOldApi');
        const btnTestBranches = document.getElementById('lcBtnTestOldApiBranches');
        if (btnDiag && diagPanel) {
            btnDiag.addEventListener('click', (e) => {
                e.preventDefault();
                const isHidden = diagPanel.style.display === 'none' || diagPanel.style.display === '';
                diagPanel.style.display = isHidden ? '' : 'none';
            });
        }

        const writeDiagnostics = () => {
            const env = window.Environment || null;
            setDiagnosticsText({
                time: new Date().toISOString(),
                location: {
                    href: window.location?.href,
                    protocol: window.location?.protocol,
                    host: window.location?.host
                },
                Environment: env,
                ServiceLoader: {
                    present: !!window.ServiceLoader,
                    assetsRoot: window.ServiceLoader?.getAssetsRoot ? window.ServiceLoader.getAssetsRoot() : null
                },
                CoreApi: {
                    present: !!window.CoreApi
                },
                LCApplicationService: {
                    present: !!window.LCApplicationService,
                    endpointGuess: getLcEndpointGuess()
                }
            });
        };

        // writeDiagnostics();

        if (btnTest) {
            btnTest.addEventListener('click', async (e) => {
                e.preventDefault();
                writeDiagnostics();
                try {
                    // Force a visible API call (must appear in Network) if the host is reachable.
                    window.__CORE_API_DEBUG__ = true;

                    const branchId = (document.getElementById('OurBranchID')?.value || '').trim() || window.prompt('Branch ID for test call');
                    if (!branchId) return;
                    const appId = (document.getElementById('ApplicationID')?.value || '').trim() || window.prompt('Application ID for test call');
                    if (!appId) return;

                    if (!window.ServiceLoader) throw new Error('ServiceLoader not available');
                    await window.ServiceLoader.loadLCApplicationService();
                    if (!window.LCApplicationService?.getLCApplication) throw new Error('LCApplicationService not available');

                    const result = await window.LCApplicationService.getLCApplication({
                        ApplicationID: appId,
                        OurBranchID: branchId,
                        OperatorID: (document.getElementById('OperatorID')?.value || '1').trim(),
                        Direction: 0,
                        BankID: ""
                    });

                    safeShow({ test: true, result });
                    writeDiagnostics();
                } catch (err) {
                    safeShow({ test: true, error: String(err?.message || err) });
                    setRuntimeStatus((document.getElementById('lcRuntimeStatus')?.textContent || '') + ' • Test failed');
                }
            });
        }

        if (btnTestBranches) {
            btnTestBranches.addEventListener('click', async (e) => {
                e.preventDefault();
                writeDiagnostics();
                try {
                    window.__CORE_API_DEBUG__ = true;

                    if (!window.ServiceLoader) throw new Error('ServiceLoader not available');
                    await window.ServiceLoader.loadBranchesService();
                    if (!window.BranchesService?.getBranches) throw new Error('BranchesService not available');

                    const branchId = (document.getElementById('OurBranchID')?.value || '').trim() || window.prompt('Branch ID for branches test call');
                    if (!branchId) return;
                    const result = await window.BranchesService.getBranches({
                        OurBranchID: branchId,
                        BranchID: branchId,
                        OperatorID: (document.getElementById('OperatorID')?.value || '1').trim()
                    });

                    safeShow({ test: 'branches', result });
                    writeDiagnostics();
                } catch (err) {
                    safeShow({ test: 'branches', error: String(err?.message || err) });
                    setRuntimeStatus((document.getElementById('lcRuntimeStatus')?.textContent || '') + ' • Branches test failed');
                }
            });
        }

        const runtimeStatusEl = document.getElementById('lcRuntimeStatus');
        try {
            const protocol = window.location?.protocol || 'unknown';
            const assetsRoot = window.ServiceLoader?.getAssetsRoot ? window.ServiceLoader.getAssetsRoot() : '(ServiceLoader not loaded)';
            if (runtimeStatusEl) {
                runtimeStatusEl.textContent = `Runtime: ${protocol} • Assets: ${assetsRoot}`;
            }
        } catch {
            // ignore
        }

        // If anything crashes (e.g., CDN not available), surface it on the page.
        window.addEventListener('error', (e) => {
            safeShow({
                error: 'Unhandled error',
                message: e?.message || String(e),
                source: e?.filename || null,
                line: e?.lineno || null,
                col: e?.colno || null
            });
        });
        window.addEventListener('unhandledrejection', (e) => {
            const reason = e?.reason;
            safeShow({
                error: 'Unhandled promise rejection',
                message: reason?.message || String(reason),
                reason
            });
        });

        // Ensure inputs have ids (derived from labels) before we try to bind API results.
        // ensureAutoIdsForFields();

        // --- Stepper Navigation ---
        const stepperTriggers = document.querySelectorAll('.cm-stepper__trigger');
        const stepperPanels = document.querySelectorAll('.cm-stepper__panel');

        console.log(`Initialized: Found ${stepperTriggers.length} triggers and ${stepperPanels.length} panels.`);

        function switchStep(trigger) {
            const stepId = trigger.getAttribute('data-step-id');
            console.log(`LCApplication.js: Attempting switch to: ${stepId}`);

            if (!stepId) {
                console.error("Trigger missing data-step-id attribute.");
                return;
            }

            // 1. Visually update triggers
            stepperTriggers.forEach(t => t.classList.remove('is-active'));
            trigger.classList.add('is-active');

            // 2. Hide all panels
            stepperPanels.forEach(panel => panel.classList.remove('is-active'));

            // 3. Find and show target panel
            // Using quotes in selector to handle spaces/special chars safely
            const targetPanel = document.querySelector(`.cm-stepper__panel[data-step-panel="${stepId}"]`);

            if (targetPanel) {
                targetPanel.classList.add('is-active');
                console.log(`LCApplication.js: Success - Switched to step ${stepId}`);
            } else {
                console.error(`Error: Target panel not found for stepId: '${stepId}'`);
                // Debug aid: list available panels
                stepperPanels.forEach(p => console.log(`Available panel ID: '${p.getAttribute('data-step-panel')}'`));
            }
        }

        stepperTriggers.forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                switchStep(trigger);
            });
            
        });

        // --- Left Sidebar Navigation ---
        const navItems = document.querySelectorAll('.cm-nav-toggle');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                navItems.forEach(n => n.classList.remove('is-active'));
                item.classList.add('is-active');
                console.log(`Sidebar nav clicked: ${item.dataset.navTarget || 'unknown'}`);
            });
        });

        

        // --- Actions: wire View button to API ---
        const viewBtn = document.getElementById('lcBtnView') || getActionButtonByText('View');
        if (viewBtn) {
            // setRuntimeStatus((document.getElementById('lcRuntimeStatus')?.textContent || '') + ' • View button: wired');
            viewBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('LCApplication.js: View button clicked');
                handleView();
            });
        } else {
            console.warn('LCApplication.js: View button not found.');
            setRuntimeStatus((document.getElementById('lcRuntimeStatus')?.textContent || '') + ' • View button: NOT found');
        }

        // --- Lookups ---
        const lookupModal = getLookupModal();
        const lookupTitle = document.getElementById('lcLookupModalTitle');
        const lookupQuery = document.getElementById('lcLookupQuery');
        const lookupSearchBtn = document.getElementById('lcLookupSearchBtn');

        const lookupState = {
            kind: null,
            tableId: null,
            targetId: null,
            targetNameId: null
        };

        async function runLookupSearch() {
            if (!lookupState.tableId) return;
            const query = String(lookupQuery?.value || '').trim();
            if (!query) {
                setLookupStatus('Type something to search.');
                return;
            }

            setLookupStatus('Searching...');

            try {
                if (!window.ServiceLoader) throw new Error('ServiceLoader not available.');
                const operatorId = (document.getElementById('OperatorID')?.value || 'web_portal').trim();

                // Branch lookup is special: it uses dbo.p_GetBranches (not p_GetSearchResult).
                if (lookupState.kind === 'branch') {
                    await window.ServiceLoader.loadBranchesService();
                    const bankId = (document.getElementById('BankID')?.value || '').trim();
                    const direction = (document.getElementById('Direction')?.value || '1').trim();

                    const result = await window.BranchesService.getBranches({
                        OurBranchID: query,
                        BankID: bankId,
                        BranchID: query,
                        OperatorID: operatorId,
                        Direction: direction
                    });

                    if (!result?.success) throw new Error(result?.message || 'Branch lookup failed');
                    const rows = extractRows(result);

                    renderLookupTable(rows, (row) => {
                        const idEl = lookupState.targetId ? document.getElementById(lookupState.targetId) : null;
                        const nameEl = lookupState.targetNameId ? document.getElementById(lookupState.targetNameId) : null;

                        const pickedId = findFieldValue(row, ['BranchID', 'BranchId', 'branchId', 'OurBranchID', 'ID', 'Id']);
                        const pickedName = findFieldValue(row, ['BranchName', 'branchName', 'Name', 'name', 'Description', 'Desc']);

                        if (idEl && pickedId !== null) idEl.value = String(pickedId);
                        if (nameEl && pickedName !== null) nameEl.textContent = String(pickedName);

                        lookupModal?.hide();
                    });

                    return;
                }

                // All other lookups use p_GetSearchResult and must be scoped to the selected branch.
                await window.ServiceLoader.loadSearchService();

                let ourBranchId = (document.getElementById('OurBranchID')?.value || '').trim();
                if (!ourBranchId) {
                    setLookupStatus('Select/enter Branch ID first.');
                    return;
                }

                const where = `${lookupState.tableId} like '%${query.replace(/'/g, "''")}%'`;

                const result = await window.SearchService.search({
                    TableID: lookupState.tableId,
                    AdvFilterString: '',
                    WhereStmt: where,
                    PrevOrNext: '1',
                    RefID: '',
                    OperatorID: operatorId,
                    ModuleID: 1000,
                    OurBranchID: ourBranchId
                });

                if (!result?.success) {
                    throw new Error(result?.message || 'Lookup failed');
                }

                const rows = extractRows(result);
                renderLookupTable(rows, (row) => {
                    const idEl = lookupState.targetId ? document.getElementById(lookupState.targetId) : null;
                    const nameEl = lookupState.targetNameId ? document.getElementById(lookupState.targetNameId) : null;

                    const pickedId = findFieldValue(row, [
                        lookupState.targetId,
                        'OurBranchID', 'BranchID', 'branchId',
                        'ApplicationID', 'applicationId',
                        'ClientID', 'clientId',
                        'AccountID', 'accountId',
                        'ID', 'Id'
                    ]);

                    const pickedName = findFieldValue(row, [
                        'BranchName', 'branchName', 'Name', 'name',
                        'ClientName', 'clientName',
                        'AccountName', 'accountName'
                    ]);

                    if (idEl && pickedId !== null) idEl.value = String(pickedId);
                    if (nameEl && pickedName !== null) nameEl.textContent = String(pickedName);

                    lookupModal?.hide();

                    // If user selected an application, immediately pull details.
                    if (lookupState.kind === 'application') {
                        const vBtn = getActionButtonByText('View');
                        if (vBtn && !vBtn.disabled) vBtn.click();
                    }
                });
            } catch (err) {
                console.error('Lookup search failed:', err);
                setLookupStatus(err?.message || String(err));
            }
        }

        if (lookupSearchBtn) {
            lookupSearchBtn.addEventListener('click', (e) => {
                e.preventDefault();
                runLookupSearch();
            });
        }

        if (lookupQuery) {
            lookupQuery.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    runLookupSearch();
                }
            });
        }

        document.querySelectorAll('[data-lookup]').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (!lookupModal) {
                    window.alert('Lookup modal is not available on this page.');
                    return;
                }

                lookupState.kind = btn.getAttribute('data-lookup');
                lookupState.tableId = btn.getAttribute('data-table-id');
                lookupState.targetId = btn.getAttribute('data-target-id');
                lookupState.targetNameId = btn.getAttribute('data-target-name-id');

                if (lookupTitle) lookupTitle.textContent = `Lookup: ${lookupState.kind}`;
                if (lookupQuery) lookupQuery.value = '';
                setLookupStatus(lookupState.tableId ? `Ready. TableID: ${lookupState.tableId}` : 'Missing data-table-id on lookup button.');
                renderLookupTable([], () => {});
                lookupModal.show();
                window.setTimeout(() => lookupQuery?.focus(), 50);
            });
        });

        console.log('LCApplication.js: Listeners attached.');
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
