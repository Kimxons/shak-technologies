/* Sanction Client Limit - Refined Modern Logic */
(async function () {
    console.log('🚀 Initializing Sanction Client Limit page...');

    try {
        const { ServiceLoader } = window;

        if (!ServiceLoader) {
            console.error('❌ ServiceLoader not found!');
            alert('Critical Error: ServiceLoader not available. Please refresh the page.');
            return;
        }

        // Load dependencies
        console.log('📦 Loading Core services...');
        await ServiceLoader.loadCore();
        console.log('✅ Core services loaded');

        console.log('📦 Loading LimitsCollateralService...');
        await ServiceLoader.loadLimitsCollateralService();
        console.log('✅ LimitsCollateralService loaded');

        console.log('📦 Loading SearchService...');
        await ServiceLoader.loadSearchService();
        console.log('✅ SearchService loaded');

        console.log('📦 Loading LookupService...');
        await ServiceLoader.loadLookupService();
        console.log('✅ LookupService loaded');

        const LimitsCollateralService = window.LimitsCollateralService;

        if (!LimitsCollateralService) {
            console.error('❌ LimitsCollateralService is not available after loading!');
            alert('Critical Error: LimitsCollateralService failed to load. Please refresh the page.');
            return;
        }

        console.log('✅ LimitsCollateralService confirmed available:', LimitsCollateralService);

        // Form State
        let currentMode = 'VIEW';
        let currentData = null;
        let snapshotBeforeEditOrAdd = null;

        // Ensure SearchModal is available (it's not part of ServiceLoader)
        async function ensureSearchModalLoaded() {
            if (window.SearchModal) return;

            await new Promise((resolve, reject) => {
                const src = '/assets/js/shared/search-modal.js';
                const already = document.querySelector(`script[src="${src}"]`);
                if (already) {
                    already.addEventListener('load', resolve);
                    already.addEventListener('error', reject);
                    // If script already loaded, resolve immediately.
                    if (window.SearchModal) resolve();
                    return;
                }

                const script = document.createElement('script');
                script.src = src;
                script.onload = resolve;
                script.onerror = () => reject(new Error('Failed to load SearchModal script'));
                document.head.appendChild(script);
            });
        }

        function setupDatePickers() {
            // flatpickr is loaded via CDN in HTML
            if (window.flatpickr) {
                const inputs = document.querySelectorAll('[data-date-picker]');
                inputs.forEach(el => {
                    const fp = flatpickr(el, {
                        dateFormat: 'd/m/Y',
                        allowInput: true,
                        disableMobile: true
                    });

                    // Wire up sibling calendar button if present
                    const wrapper = el.parentElement;
                    if (wrapper && wrapper.classList.contains('kairo-control')) {
                        const btn = wrapper.querySelector('.btn-calendar');
                        if (btn) {
                            btn.addEventListener('click', () => {
                                fp.open();
                            });
                        }
                    }
                });
            }
        }

        // DOM References - will be initialized in DOMContentLoaded
        let els;

        // --- Logic ---

        function switchMode(mode) {
            currentMode = mode.toUpperCase();
            console.log(`📋 Mode switched to: ${currentMode}`);

            const isView = currentMode === 'VIEW';
            const isAdd = currentMode === 'ADD';
            const isEdit = currentMode === 'EDIT';

            const hasRecord = !!currentData;

            // Buttons
            if (els.btnView) els.btnView.disabled = false; // Always enabled to allow Refresh/Load
            if (els.btnAdd) els.btnAdd.disabled = isAdd || isEdit;
            if (els.btnEdit) els.btnEdit.disabled = !isView || !hasRecord;
            if (els.btnSave) els.btnSave.disabled = isView;
            // Reject == Delete equivalent: only enabled in VIEW mode when a record is loaded.
            if (els.btnReject) els.btnReject.disabled = !isView || !hasRecord;
            if (els.btnCancel) els.btnCancel.disabled = isView;

            // Prev/Next (navigation is VIEW-only and requires a loaded record)
            if (els.btnPrevious) els.btnPrevious.disabled = !isView || !hasRecord;
            if (els.btnNext) els.btnNext.disabled = !isView || !hasRecord;

            // Form Fields
            const viewOnlyFields = [
                els.branchName, els.chargeAccountName, els.chargeName,
                els.clientName, els.drawingPower, els.netCollateral,
                els.status, els.createdBy, els.modifiedBy, els.supervisedBy,
                els.createdOn, els.modifiedOn, els.supervisedOn,
                els.withdrawnDate, els.withdrawnReason
            ];

            const editableFields = [
                els.branchId, els.limitId, els.collateralId, els.referenceNo, els.sanctionedDate,
                els.sanctionedLimit, els.chargeAccountId, els.chargeId,
                els.totalCharge, els.chargeAmount, els.taxAmount,
                els.clientId, els.dpDefinition, els.effectiveDate,
                els.expiryDate, els.limitType, els.remarks
            ];

            viewOnlyFields.forEach(f => { if (f) f.setAttribute('readonly', 'true'); });

            editableFields.forEach(f => {
                if (!f) return;
                // Find associated lookup button if any
                const lookupBtn = f.parentElement?.querySelector('.btn-lookup');

                if (isView) {
                    // In View mode, primary keys should remain editable to allow searching another record
                    if (f === els.limitId || f === els.branchId) {
                        f.removeAttribute('readonly');
                        if (lookupBtn) lookupBtn.disabled = false;
                    } else {
                        f.setAttribute('readonly', 'true');
                        if (f.tagName === 'SELECT') f.disabled = true;
                        if (lookupBtn) lookupBtn.disabled = true;
                    }
                } else {
                    f.removeAttribute('readonly');
                    if (f.tagName === 'SELECT') f.disabled = false;
                    if (lookupBtn) lookupBtn.disabled = false;

                    // Primary Key protection for Edit
                    if (isEdit && (f === els.branchId || f === els.limitId)) {
                        f.setAttribute('readonly', 'true');
                        if (lookupBtn) lookupBtn.disabled = true;
                    }
                }
            });

            if (isAdd) {
                clearForm();
                // Focusing Limit ID as a better default start
                if (els.limitId) {
                    setTimeout(() => els.limitId.focus(), 100);
                }

                // Explicitly ensure Client ID lookup is enabled
                if (els.clientId) {
                    const btn = els.clientId.parentElement?.querySelector('.btn-lookup');
                    if (btn) {
                        console.log('[SanctionClientLimit] Explicitly enabling ClientID lookup');
                        btn.disabled = false;
                    }
                }
            }
        }

        // ... (clearForm, takeSnapshot, etc.) ...

        // Corrected Search Configs based on SP analysis
        const searchConfigs = {
            branch: {
                title: 'Branch',
                tableID: 'BranchID', // Common pattern in other modules
                allBranches: true,
                whereStmt: '',
                searchFields: [
                    { name: 'branchId', label: 'Branch ID', column: 'OurBranchID' },
                    { name: 'branchName', label: 'Branch Name', column: 'BranchName' }
                ],
                displayFields: [
                    { key: 'OurBranchID', label: 'Branch ID' },
                    { key: 'BranchName', label: 'Branch Name' }
                ],
                onSelect: (record) => {
                    const branchId = record.OurBranchID || record.ourbranchid || record.BranchID || record.branchid || '';
                    const branchName = record.BranchName || record.branchname || '';
                    if (els.branchId) els.branchId.value = branchId;
                    if (els.branchName) els.branchName.value = branchName;
                    showMessage('Branch selected', 'success');
                }
            },

            limit: {
                title: 'Limit',
                tableID: 'ApplicationClientLimitID', // Matches the legacy SQL config ID
                uniqueBy: 'LimitID',
                allBranches: true,
                whereStmt: '',
                searchFields: [
                    { name: 'limitId', label: 'Limit ID', column: 'LimitID' },
                    { name: 'clientId', label: 'Client ID', column: 'ClientID' }
                ],
                displayFields: [
                    { key: 'LimitID', label: 'Limit ID' },
                    { key: 'ClientID', label: 'Client ID' },
                    { key: 'EffectiveDate', label: 'Effective Date' }
                ],
                onSelect: (record) => {
                    const limitId = record.LimitID || record.limitid || '';
                    if (els.limitId) els.limitId.value = limitId;

                    // Update Branch ID if available (Critical for cross-branch View)
                    const branchId = record.OurBranchID || record.ourbranchid || record.BranchID || record.branchid || '';
                    if (branchId && els.branchId) els.branchId.value = branchId;

                    // Optional fill-ins when available
                    const clientId = record.ClientID || record.clientid || '';
                    const clientName = record.Name || record.name || record.ClientName || record.clientname || '';
                    if (clientId && els.clientId) els.clientId.value = clientId;
                    if (clientName && els.clientName) els.clientName.value = clientName;
                    showMessage('Limit selected', 'success');
                    void loadData();
                }
            },

            client: {
                title: 'Client',
                tableID: 'Client', // Confirmed working
                uniqueBy: 'ClientID',
                allBranches: true,
                whereStmt: '',
                searchFields: [
                    { name: 'clientId', label: 'Client ID', column: 'ClientID' },
                    { name: 'clientName', label: 'Client Name', column: 'Name' }
                ],
                displayFields: [
                    { key: 'ClientID', label: 'Client ID' },
                    { key: 'Name', label: 'Client Name' }
                ],
                onSelect: (record) => {
                    const clientId = record.ClientID || record.clientId || record.clientid || '';
                    const clientName = record.Name || record.name || record.ClientName || record.clientname || record.fullName || '';
                    if (els.clientId) els.clientId.value = clientId;
                    if (els.clientName) els.clientName.value = clientName;
                    showMessage('Client selected', 'success');
                }
            },

            chargeAccount: {
                title: 'Charge Account',
                tableID: 'AccountID',
                uniqueBy: 'AccountID',
                allBranches: true,
                whereStmt: '',
                searchFields: [
                    { name: 'accountId', label: 'Account ID', column: 'AccountID' },
                    { name: 'accountDescription', label: 'Account Name', column: 'Description' }
                ],
                displayFields: [
                    { key: 'AccountID', label: 'Account ID' },
                    { key: 'Name', label: 'Account Name' }
                ],
                onSelect: (record) => {
                    const accountId = record.AccountID || record.accountid || '';
                    const accountName = record.Description || record.description || record.AccountName || record.accountname || record.Name || record.name || '';
                    if (els.chargeAccountId) els.chargeAccountId.value = accountId;
                    if (els.chargeAccountName) els.chargeAccountName.value = accountName;
                    showMessage('Charge account selected', 'success');
                }
            },

            charge: {
                title: 'Charge Search',
                tableID: 'ChargeID',
                uniqueBy: 'ChargeID',
                allBranches: true,
                whereStmt: '',
                searchFields: [
                    { name: 'chargeId', label: 'Charge ID', column: 'ChargeID' },
                    { name: 'description', label: 'Description', column: 'Description' }
                ],
                displayFields: [
                    { key: 'ChargeID', label: 'Charge ID' },
                    { key: 'Description', label: 'Description' }
                ],
                onSelect: (record) => {
                    const chargeId = record.ChargeID || record.chargeid || '';
                    const chargeName = record.Description || record.description || '';
                    if (els.chargeId) els.chargeId.value = chargeId;
                    if (els.chargeName) els.chargeName.value = chargeName;
                    showMessage('Charge selected', 'success');
                }
            },

            collateral: {
                title: 'Collateral Search',
                tableID: 'CollateralID',
                uniqueBy: 'CollateralID',
                allBranches: true,
                whereStmt: '',
                searchFields: [
                    { name: 'collateralId', label: 'Collateral ID', column: 'CollateralID' },
                    { name: 'description', label: 'Description', column: 'Description' }
                ],
                displayFields: [
                    { key: 'CollateralID', label: 'Collateral ID' },
                    { key: 'Description', label: 'Description' },
                    { key: 'OwnerClientID', label: 'Owner ID' }
                ],
                onSelect: (record) => {
                    const collateralId = record.CollateralID || record.collateralid || '';
                    if (els.collateralId) els.collateralId.value = collateralId;
                    showMessage('Collateral selected', 'success');
                    // Optional: loadData if this implies a limit? 
                    // But usually, one limit has many collaterals.
                }
            }
        };

        function clearForm() {
            // Clear ALL inputs and selects regardless of state
            document.querySelectorAll('.form-content input, .form-content select').forEach(el => {
                el.value = '';
            });

            // Clear behind-scene span values
            document.querySelectorAll('.behind-scene-value, .audit-value').forEach(el => {
                el.textContent = '-';
            });

            if (els.collateralBody) {
                els.collateralBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No records to display.</td></tr>';
            }
            currentData = null;
        }

        function takeSnapshot() {
            snapshotBeforeEditOrAdd = currentData ? JSON.parse(JSON.stringify(currentData)) : null;
        }

        function restoreSnapshotOrClear() {
            if (snapshotBeforeEditOrAdd) {
                currentData = snapshotBeforeEditOrAdd;
                populateForm(snapshotBeforeEditOrAdd);
            } else {
                clearForm();
            }
            snapshotBeforeEditOrAdd = null;
        }

        async function loadData() {
            const limitId = els.limitId.value.trim();
            if (!limitId) {
                showMessage('Please enter a Limit ID', 'warning');
                return;
            }

            showMessage('Fetching limit and collateral details...', 'info');

            try {
                const ourBranchID = els.branchId.value || '0325';
                const operatorID = getOperatorId();

                // Request 1: Limit & Client Details
                const clientRequest = {
                    OurBranchID: ourBranchID,
                    LimitID: limitId,
                    RefNo: '0',
                    ClientID: 'NULL',
                    OperatorID: operatorID,
                    Direction: '0'
                };

                // Request 2: Collateral List
                const collateralRequest = {
                    OurBranchID: ourBranchID,
                    LimitID: limitId,
                    CollateralID: 'N', // Fetch all
                    RefNo: '1',        // As per sample for collaterals
                    OperatorID: operatorID,
                    Direction: '0'
                };

                console.log('🔍 Fetching Merged Data:', { clientRequest, collateralRequest });

                const [clientResult, collateralResult] = await Promise.all([
                    LimitsCollateralService.getLimitClients(clientRequest),
                    LimitsCollateralService.getLimitCollaterals(collateralRequest)
                ]);

                console.log('📥 Responses:', { clientResult, collateralResult });

                if (clientResult.success || collateralResult.success) {
                    // Check if we actually have main data
                    const clientMain = clientResult.success && clientResult.data?.Details02;
                    const collateralMain = collateralResult.success && collateralResult.data?.Details02;

                    if ((!clientMain || clientMain.length === 0) && (!collateralMain || collateralMain.length === 0)) {
                        showMessage(`Limit ID ${limitId} not found in Branch ${ourBranchID}.`, 'error');
                        return;
                    }

                    // Construct Merged Data Object
                    const mergedData = {
                        Details: [],
                        Details01: [] // For Table
                    };

                    // 1. Form Header Data (Prioritize Client Result)
                    if (clientMain && clientMain.length > 0) {
                        mergedData.Details = [clientMain[0]];
                    } else if (collateralMain && collateralMain.length > 0) {
                        mergedData.Details = [collateralMain[0]];
                    }

                    // Append/Merge BTS fields (Status, NetCollateralValue) from Details01
                    if (mergedData.Details.length > 0) {
                        let d = mergedData.Details[0];
                        if (clientResult.data?.Details01?.[0]) {
                            d = { ...d, ...clientResult.data.Details01[0] };
                        }
                        mergedData.Details[0] = d;
                    }

                    // 2. Collateral Table Data
                    if (collateralMain) {
                        mergedData.Details01 = collateralMain;
                    } else if (collateralResult.success && collateralResult.data?.Details01) {
                        mergedData.Details01 = collateralResult.data.Details01;
                    } else if (clientResult.success && clientResult.data?.Details02?.length > 1) {
                        mergedData.Details01 = clientResult.data.Details02;
                    }

                    currentData = mergedData;
                    populateForm(mergedData);
                    switchMode('VIEW');
                    showMessage('Data loaded successfully.', 'success');
                } else {
                    showMessage('Failed to fetch data.', 'error');
                }
            } catch (err) {
                console.error(err);
                showMessage('Error: ' + err.message, 'error');
            }
        }

        function populateForm(data) {
            if (!data.Details || data.Details.length === 0) return;
            const d = data.Details[0];
            console.log('📝 Populating Form with data:', d);

            if (els.branchId) els.branchId.value = d.OurBranchID || '';
            if (els.branchName) els.branchName.value = d.BranchName || '';
            if (els.limitId) els.limitId.value = d.LimitID || '';
            if (els.referenceNo) els.referenceNo.value = d.RefNo || 1;

            if (els.sanctionedDate) els.sanctionedDate.value = formatDateFriendly(d.SanctionedDate);
            if (els.sanctionedLimit) els.sanctionedLimit.value = formatM(d.SanctionedLimit || d.Sanctionedlimit);

            // Charges (if available)
            if (els.chargeAccountId) els.chargeAccountId.value = d.ChargeAccountID || '';
            if (els.chargeAccountName) els.chargeAccountName.value = d.ChargeAccountName || '';
            if (els.chargeId) els.chargeId.value = d.ChargeID || '';
            if (els.chargeName) els.chargeName.value = d.ChargeName || '';
            if (els.totalCharge) els.totalCharge.value = formatM(d.TotalCharge || d.TotalChargeAmount);
            if (els.chargeAmount) els.chargeAmount.value = formatM(d.ChargeAmount);
            if (els.taxAmount) els.taxAmount.value = formatM(d.TaxAmount || d.TaxChargeAmount);

            // Client & DP
            if (els.clientId) els.clientId.value = d.ClientID || '';
            
            // Try to get client name from response, otherwise fetch it
            const clientNameFromData = d.ClientName || d.Name || d.clientname || d.name || '';
            if (els.clientName) {
                if (clientNameFromData) {
                    els.clientName.value = clientNameFromData;
                } else if (d.ClientID) {
                    // Fetch client name using search if not in response
                    fetchClientName(d.ClientID);
                }
            }
            
            setFieldValue(els.drawingPower, formatM(d.DrawingPower || d.AppliedLimit));
            if (els.dpDefinition) els.dpDefinition.value = d.DPDefinition || d.DPDefinitionID || '';
            setFieldValue(els.netCollateral, formatM(d.NetCollateralValue));
            setFieldValue(els.totalApportioned, formatM(d.TotalApportionedValue || d.TotalApportioned));
            if (els.effectiveDate) els.effectiveDate.value = formatDateFriendly(d.EffectiveDate);
            if (els.expiryDate) els.expiryDate.value = formatDateFriendly(d.ExpiryDate);
            if (els.limitType) els.limitType.value = d.LimitType || d.LimitTypeID || '';
            setFieldValue(els.status, d.Status || d.LimitStatusID || '-');
            if (els.remarks) els.remarks.value = d.Remarks || '';

            // BTS Audit (read-only spans)
            setFieldValue(els.createdBy, d.CreatedBy || '-');
            setFieldValue(els.createdOn, formatDT(d.CreatedOn));
            setFieldValue(els.modifiedBy, d.ModifiedBy || '-');
            setFieldValue(els.modifiedOn, formatDT(d.ModifiedOn));
            setFieldValue(els.supervisedBy, d.SupervisedBy || '-');
            setFieldValue(els.supervisedOn, formatDT(d.SupervisedOn));
            setFieldValue(els.withdrawnDate, formatD(d.WithdrawnDate));
            setFieldValue(els.withdrawnReason, d.WithdrawnReason || '-');

            if (data.Details01 && els.collateralBody) {
                populateTable(data.Details01);
            }
        }

        function populateTable(list) {
            els.collateralBody.innerHTML = '';
            if (list.length === 0) {
                els.collateralBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No records to display.</td></tr>';
                return;
            }

            list.forEach(c => {
                const row = document.createElement('tr');
                row.innerHTML = `
                <td>${c.CollateralID || ''}</td>
                <td>${c.RefNo || ''}</td>
                <td>${c.ApportionedRatio || ''}</td>
                <td class="text-end">${formatM(c.ApportionedValue)}</td>
                <td>${c.Margin || ''}</td>
                <td class="text-end">${formatM(c.NetCollateralValue)}</td>
                <td>${c.Status || ''}</td>
            `;
                els.collateralBody.appendChild(row);
            });
        }

        function formatD(dateStr) {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            if (Number.isNaN(d.getTime())) return '';
            // Return in YYYY-MM-DD for consistency
            return d.toISOString().split('T')[0];
        }

        function formatDateFriendly(dateStr) {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            if (Number.isNaN(d.getTime())) return '';
            // dd/mm/yyyy (standard format matching flatpickr)
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}/${month}/${year}`;
        }

        function formatDT(s) {
            if (!s) return '';
            const d = new Date(s);
            return isNaN(d.getTime()) ? s : d.toLocaleString();
        }

        function formatD(s) {
            if (!s) return '-';
            const d = new Date(s);
            return isNaN(d.getTime()) ? s : formatDateFriendly(s);
        }

        function formatM(v) {
            if (!v || isNaN(v)) return '0.00';
            return parseFloat(v).toLocaleString('en-US', { minimumFractionDigits: 2 });
        }

        // Fetch client name using SearchService
        async function fetchClientName(clientId) {
            if (!clientId || !window.SearchService) return;
            
            try {
                const searchRequest = {
                    TableID: 'Client',
                    WhereStmt: `ClientID = '${clientId}'`,
                    PrevOrNext: '1',
                    RefID: '',
                    OperatorID: getOperatorId(),
                    ModuleID: '1000',
                    OurBranchID: els.branchId?.value || '0325'
                };
                
                const result = await window.SearchService.search(searchRequest);
                
                if (result && result.success && result.data) {
                    let clients = result.data;
                    if (!Array.isArray(clients)) {
                        clients = result.data.Details || result.data.SearchResults || [result.data];
                    }
                    
                    if (clients && clients.length > 0) {
                        const client = clients[0];
                        const clientName = client.Name || client.ClientName || client.name || client.clientname || client.FullName || '';
                        if (clientName && els.clientName) {
                            els.clientName.value = clientName;
                            console.log('✅ Client name fetched:', clientName);
                        }
                    }
                }
            } catch (err) {
                console.warn('Could not fetch client name:', err);
            }
        }

        // Helper to set value on input or text on span/div elements
        function setFieldValue(el, value) {
            if (!el) return;
            if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
                el.value = value;
            } else {
                el.textContent = value || '-';
            }
        }

        let messageTimer = null;
        function showMessage(msg, type = 'info') {
            const messagePanel = document.getElementById('messagePanel');
            const messageText = document.getElementById('messageText');

            if (!messagePanel || !messageText) return;

            if (messageTimer) {
                clearTimeout(messageTimer);
                messageTimer = null;
            }

            // Update icon based on type
            const iconEl = messagePanel.querySelector('i');
            let icon = 'bi-info-circle';
            if (type === 'success') icon = 'bi-check-circle';
            if (type === 'error') icon = 'bi-x-circle';
            if (type === 'warning') icon = 'bi-exclamation-triangle';

            if (iconEl) {
                iconEl.className = `bi ${icon}`;
            }

            messageText.textContent = msg;
            messagePanel.className = `am-message-panel show ${type}`;
            messagePanel.setAttribute('role', 'alert');
            messagePanel.setAttribute('aria-live', 'assertive');

            messageTimer = setTimeout(() => {
                messagePanel.classList.remove('show');
            }, 4000);
        }

        function handleCancel() {
            if (currentMode === 'VIEW') {
                showMessage('Nothing to cancel in View mode', 'warning');
                return;
            }

            clearForm();
            switchMode('VIEW');
            showMessage('Operation cancelled. Form cleared.', 'info');
            notifyParent('cancel');
        }

        function notifyParent(action, data = {}) {
            window.parent.postMessage({
                type: 'kairo-button-action',
                action: action,
                module: 'SanctionClientLimit',
                data: data
            }, '*');
        }

        // ═══════════════════════════════════════════════════════════════
        // VALIDATION (NO API MAPPING HERE)
        // ═══════════════════════════════════════════════════════════════

        const lastFieldError = new Map(); // fieldId -> last message shown

        function setFieldError(el, message, { showToast = false } = {}) {
            if (!el) return;
            el.classList.add('field-error');
            el.setAttribute('aria-invalid', 'true');
            el.dataset.errorMessage = message;
            el.title = message;

            if (showToast) {
                const key = el.id || el.name || '';
                const last = lastFieldError.get(key);
                if (last !== message) {
                    lastFieldError.set(key, message);
                    showMessage(message, 'error');
                }
            }
        }

        function clearFieldError(el) {
            if (!el) return;
            el.classList.remove('field-error');
            el.removeAttribute('aria-invalid');
            el.removeAttribute('title');
            delete el.dataset.errorMessage;
            const key = el.id || el.name || '';
            if (key) lastFieldError.delete(key);
        }

        function focusField(el) {
            try {
                el?.focus?.();
                if (el?.select) el.select();
            } catch {
                // ignore
            }
        }

        function getTrimmed(el) {
            return String(el?.value || '').trim();
        }

        function parseMoney(text) {
            const raw = String(text || '').trim();
            if (!raw) return NaN;
            const cleaned = raw.replace(/,/g, '');
            const num = Number(cleaned);
            return Number.isFinite(num) ? num : NaN;
        }

        function parseDateValue(value) {
            if (!value) return null;
            // Flatpickr uses YYYY-MM-DD internally for value, but displays friendly format.
            // So, for parsing, we can rely on the value attribute.
            const d = new Date(value);
            return Number.isNaN(d.getTime()) ? null : d;
        }

        function validateRequired(el, label, { showToast = false } = {}) {
            const v = getTrimmed(el);
            if (!v) {
                setFieldError(el, `${label} is required.`, { showToast });
                return false;
            }
            clearFieldError(el);
            return true;
        }

        function validateAmount(el, label, { min = 0, strictGreater = false, showToast = false } = {}) {
            const v = getTrimmed(el);
            if (!v) {
                setFieldError(el, `${label} is required.`, { showToast });
                return false;
            }
            const n = parseMoney(v);
            if (!Number.isFinite(n)) {
                setFieldError(el, `${label} must be a valid amount.`, { showToast });
                return false;
            }
            const ok = strictGreater ? n > min : n >= min;
            if (!ok) {
                setFieldError(
                    el,
                    strictGreater ? `${label} must be greater than ${min}.` : `${label} must be ${min} or more.`,
                    { showToast }
                );
                return false;
            }
            clearFieldError(el);
            return true;
        }

        function validateEffectiveExpiry({ showToast = false } = {}) {
            // Rule: both selected or neither; if both, Effective < Expiry
            const effVal = getTrimmed(els.effectiveDate);
            const expVal = getTrimmed(els.expiryDate);

            if (!effVal && !expVal) {
                clearFieldError(els.effectiveDate);
                clearFieldError(els.expiryDate);
                return true;
            }

            if (effVal && !expVal) {
                setFieldError(els.expiryDate, 'Expiry Date is required when Effective Date is provided.', { showToast });
                clearFieldError(els.effectiveDate);
                return false;
            }

            if (!effVal && expVal) {
                setFieldError(els.effectiveDate, 'Effective Date is required when Expiry Date is provided.', { showToast });
                clearFieldError(els.expiryDate);
                return false;
            }

            const eff = parseDateValue(effVal);
            const exp = parseDateValue(expVal);
            if (!eff) {
                setFieldError(els.effectiveDate, 'Effective Date must be a valid date.', { showToast });
                return false;
            }
            if (!exp) {
                setFieldError(els.expiryDate, 'Expiry Date must be a valid date.', { showToast });
                return false;
            }
            if (eff.getTime() >= exp.getTime()) {
                setFieldError(els.expiryDate, 'Expiry Date must be later than Effective Date.', { showToast });
                setFieldError(els.effectiveDate, 'Effective Date must be earlier than Expiry Date.', { showToast: false });
                return false;
            }

            clearFieldError(els.effectiveDate);
            clearFieldError(els.expiryDate);
            return true;
        }

        function validateChargeDependencies({ showToast = false } = {}) {
            // Rule: Charge ID and Charge AccountID must be provided together
            const hasChargeId = !!getTrimmed(els.chargeId);
            const hasChargeAcc = !!getTrimmed(els.chargeAccountId);

            if (hasChargeId && !hasChargeAcc) {
                setFieldError(els.chargeAccountId, 'Charge AccountID is required when Charge ID is provided.', { showToast });
                return false;
            }
            if (!hasChargeId && hasChargeAcc) {
                setFieldError(els.chargeId, 'Charge ID is required when Charge AccountID is provided.', { showToast });
                return false;
            }

            if (hasChargeAcc) clearFieldError(els.chargeAccountId);
            if (hasChargeId) clearFieldError(els.chargeId);
            return true;
        }

        function validateChargeBreakdown({ showToast = false } = {}) {
            // Rule: Charge Amount + Tax Amount should equal Total Charge (when all are present)
            const totalRaw = getTrimmed(els.totalCharge);
            const chargeRaw = getTrimmed(els.chargeAmount);
            const taxRaw = getTrimmed(els.taxAmount);

            const anyFilled = !!(totalRaw || chargeRaw || taxRaw);
            if (!anyFilled) {
                clearFieldError(els.totalCharge);
                clearFieldError(els.chargeAmount);
                clearFieldError(els.taxAmount);
                return true;
            }

            const okTotal = validateAmount(els.totalCharge, 'Total Charge', { min: 0, strictGreater: true, showToast });
            const okCharge = validateAmount(els.chargeAmount, 'Charge Amount', { min: 0, strictGreater: false, showToast });
            const okTax = validateAmount(els.taxAmount, 'Tax Amount', { min: 0, strictGreater: false, showToast });
            if (!(okTotal && okCharge && okTax)) return false;

            const total = parseMoney(totalRaw);
            const charge = parseMoney(chargeRaw);
            const tax = parseMoney(taxRaw);
            const diff = Math.abs(total - (charge + tax));
            if (diff > 0.01) {
                setFieldError(els.totalCharge, 'Total Charge must equal Charge Amount + Tax Amount.', { showToast });
                setFieldError(els.chargeAmount, 'Charge Amount must add up to Total Charge (with Tax Amount).', { showToast: false });
                setFieldError(els.taxAmount, 'Tax Amount must add up to Total Charge (with Charge Amount).', { showToast: false });
                return false;
            }

            clearFieldError(els.totalCharge);
            clearFieldError(els.chargeAmount);
            clearFieldError(els.taxAmount);
            return true;
        }

        function validateForm({ showToast = true } = {}) {
            if (currentMode === 'VIEW') return true;

            // Mandatory checks
            const requiredChecks = [
                { el: els.branchId, label: 'Branch ID' },
                { el: els.limitId, label: 'Limit ID' },
                { el: els.sanctionedDate, label: 'Sanctioned Date' },
                { el: els.sanctionedLimit, label: 'Sanctioned Limit' }
            ];

            for (const c of requiredChecks) {
                if (!validateRequired(c.el, c.label, { showToast })) {
                    focusField(c.el);
                    return false;
                }
            }

            // Amount rules
            if (!validateAmount(els.sanctionedLimit, 'Sanctioned Limit', { min: 0, strictGreater: true, showToast })) {
                focusField(els.sanctionedLimit);
                return false;
            }

            // Charge dependencies (ID pairing)
            // Only validate pairing if either field is filled
            if (!validateChargeDependencies({ showToast })) {
                focusField(getTrimmed(els.chargeAccountId) ? els.chargeId : els.chargeAccountId);
                return false;
            }

            // Collateral / charges amounts
            // Only validate charge breakdown if any charge field is filled
            if (!validateChargeBreakdown({ showToast })) {
                focusField(els.totalCharge);
                return false;
            }

            // Date logic
            if (!validateEffectiveExpiry({ showToast })) {
                focusField(els.effectiveDate);
                return false;
            }

            return true;
        }

        function wireValidationTriggers() {
            const onBlurRequired = [
                { el: els.branchId, label: 'Branch ID' },
                { el: els.limitId, label: 'Limit ID' }
            ];
            onBlurRequired.forEach(({ el, label }) => {
                el?.addEventListener('blur', () => {
                    if (currentMode === 'VIEW') return;
                    validateRequired(el, label, { showToast: false });
                });
                el?.addEventListener('input', () => clearFieldError(el));
            });

            // Amounts
            els.sanctionedLimit?.addEventListener('blur', () => {
                if (currentMode === 'VIEW') return;
                validateAmount(els.sanctionedLimit, 'Sanctioned Limit', { min: 0, strictGreater: true, showToast: false });
            });
            els.sanctionedLimit?.addEventListener('input', () => clearFieldError(els.sanctionedLimit));

            [els.totalCharge, els.chargeAmount, els.taxAmount].forEach((el) => {
                el?.addEventListener('blur', () => {
                    if (currentMode === 'VIEW') return;
                    void validateChargeBreakdown({ showToast: false });
                });
                el?.addEventListener('input', () => clearFieldError(el));
            });

            // Select/date logic
            [els.effectiveDate, els.expiryDate].forEach((el) => {
                el?.addEventListener('change', () => {
                    if (currentMode === 'VIEW') return;
                    void validateEffectiveExpiry({ showToast: false });
                });
            });

            els.sanctionedDate?.addEventListener('change', () => {
                if (currentMode === 'VIEW') return;
                validateRequired(els.sanctionedDate, 'Sanctioned Date', { showToast: false });
            });

            // Cross-field pairing of charge id/account
            els.chargeAccountId?.addEventListener('blur', () => {
                if (currentMode === 'VIEW') return;
                void validateChargeDependencies({ showToast: false });
            });
            els.chargeId?.addEventListener('blur', () => {
                if (currentMode === 'VIEW') return;
                void validateChargeDependencies({ showToast: false });
            });
        }

        // ═══════════════════════════════════════════════════════════════
        // LOOKUP / SEARCH MODALS
        // ═══════════════════════════════════════════════════════════════

        let searchModal = null;

        function getOperatorId() {
            return window.sessionStorage?.getItem?.('operatorId') || 'WEB_PORTAL';
        }

        function getOurBranchIdForSearch() {
            const config = searchModal?.currentConfig;
            if (config && config.allBranches) return '';
            return els.branchId?.value || '';
        }

        async function initializeSearchModal() {
            await ensureSearchModalLoaded();
            if (!window.SearchModal) {
                console.warn('[SanctionClientLimit] SearchModal class not available');
                return;
            }

            searchModal = new window.SearchModal({
                prefix: 'sanction-client-limit',
                moduleID: '1000',
                getOperatorId,
                getOurBranchId: getOurBranchIdForSearch,
                onError: (err) => showMessage(String(err), 'error')
            });

            console.log('[SanctionClientLimit] SearchModal initialized');
        }



        function wireLookupButtons() {
            if (!searchModal) {
                console.warn('[SanctionClientLimit] SearchModal not ready during wiring');
                return;
            }

            console.log('[SanctionClientLimit] Wiring lookup buttons...');

            const configMap = [
                { el: els.branchId, config: searchConfigs.branch },
                { el: els.limitId, config: searchConfigs.limit },
                { el: els.clientId, config: searchConfigs.client },
                { el: els.collateralId, config: searchConfigs.collateral },
                { el: els.chargeAccountId, config: searchConfigs.chargeAccount },
                { el: els.chargeId, config: searchConfigs.charge }
            ];

            configMap.forEach(({ el, config }) => {
                if (!el) return;
                const btn = el.parentElement?.querySelector('.btn-lookup');
                if (btn) {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        console.log(`[SanctionClientLimit] Clicked lookup for: ${config.title}`);
                        if (!searchModal) {
                            console.error('[SanctionClientLimit] SearchModal is null!');
                            showMessage('Search modal not initialized', 'error');
                            return;
                        }
                        try {
                            searchModal.open(config);
                        } catch (err) {
                            console.error('[SanctionClientLimit] Failed to open search modal:', err);
                            showMessage('Failed to open search', 'error');
                        }
                    });
                }
            });
        }

        // --- Actions ---


        async function handleSave() {
            console.log('Save button clicked');
            if (currentMode === 'VIEW') {
                showMessage('Warning: Click Add/Edit before Save.', 'warning');
                return;
            }

            if (!validateForm({ showToast: true })) {
                return;
            }

            // Simulate normal flow: Save returns to VIEW
            switchMode('VIEW');
            showMessage('Saved (wiring only, no API).', 'info');
        }


        async function handleReject() {
            console.log('Reject button clicked');
            if (currentMode !== 'VIEW') {
                showMessage('Reject is only available in View mode.', 'warning');
                return;
            }
            if (!currentData) {
                showMessage('Load a record before Reject.', 'warning');
                return;
            }
            if (!confirm('Are you sure you want to reject this record?')) return;
            clearForm();
            switchMode('VIEW');
            showMessage('Rejected (wiring only, no API).', 'info');
        }

        // --- Init ---

        function initializeUI() {
            console.log('📋 DOM Content Loaded - Initializing UI...');

            // Initialize DOM References NOW that DOM is ready
            els = {
                branchId: document.getElementById('BranchId'),
                branchName: document.getElementById('BranchName'),
                limitId: document.getElementById('LimitId'),
                referenceNo: document.getElementById('ReferenceNo'),
                sanctionedDate: document.getElementById('SanctionedDate'),
                sanctionedLimit: document.getElementById('SanctionedLimit'),

                // Collateral Details
                chargeAccountId: document.getElementById('ChargeAccountId'),
                chargeAccountName: document.getElementById('ChargeAccountName'),
                chargeId: document.getElementById('ChargeId'),
                chargeName: document.getElementById('ChargeName'),
                collateralId: document.getElementById('CollateralId'),
                totalCharge: document.getElementById('TotalCharge'),
                chargeAmount: document.getElementById('ChargeAmount'),
                taxAmount: document.getElementById('TaxAmount'),
                collateralBody: document.getElementById('collateralTableBody'),

                // BTS
                clientId: document.getElementById('ClientId'),
                clientName: document.getElementById('ClientName'),
                drawingPower: document.getElementById('DrawingPower'),
                dpDefinition: document.getElementById('DpDefinition'),
                netCollateral: document.getElementById('NetCollateralValue'),
                totalApportioned: document.getElementById('TotalApportionedValue'),
                effectiveDate: document.getElementById('EffectiveDate'),
                expiryDate: document.getElementById('ExpiryDate'),
                limitType: document.getElementById('LimitType'),
                status: document.getElementById('Status'),
                remarks: document.getElementById('Remarks'),
                createdBy: document.getElementById('CreatedBy'),
                modifiedBy: document.getElementById('ModifiedBy'),
                supervisedBy: document.getElementById('SupervisedBy'),
                createdOn: document.getElementById('CreatedOn'),
                modifiedOn: document.getElementById('ModifiedOn'),
                supervisedOn: document.getElementById('SupervisedOn'),
                withdrawnDate: document.getElementById('WithdrawnDate'),
                withdrawnReason: document.getElementById('WithdrawnReason'),

                // Actions
                btnView: document.getElementById('btnView'),
                btnAdd: document.getElementById('btnAdd'),
                btnEdit: document.getElementById('btnEdit'),
                btnSave: document.getElementById('btnSave'),
                btnReject: document.getElementById('btnReject'),
                btnCancel: document.getElementById('btnCancel'),
                btnPrevious: document.getElementById('btnPrevious'),
                btnNext: document.getElementById('btnNext'),
                btnRefresh: document.getElementById('btnRefresh'),
                btnClose: document.getElementById('btnClose'),
                btnMinimize: document.getElementById('btnMinimize'),
                btnMaximize: document.getElementById('btnMaximize')
            };

            console.log('🔍 Element check:', {
                limitId: els.limitId,
                btnView: els.btnView,
                branchId: els.branchId
            });

            if (!els.limitId) {
                console.error('❌ Critical: LimitId element not found!');
                alert('Error: Form elements not found. Please check the HTML structure.');
                return;
            }

            console.log('✅ All critical elements found - attaching event listeners...');
            if (els.btnView) els.btnView.addEventListener('click', loadData);
            if (els.btnAdd) els.btnAdd.addEventListener('click', () => switchMode('ADD'));
            if (els.btnEdit) els.btnEdit.addEventListener('click', () => {
                if (!currentData) {
                    showMessage('Load a record before Edit.', 'warning');
                    return;
                }
                switchMode('EDIT');
            });
            if (els.btnSave) els.btnSave.addEventListener('click', handleSave);
            if (els.btnReject) els.btnReject.addEventListener('click', handleReject);
            if (els.btnCancel) els.btnCancel.addEventListener('click', handleCancel);
            if (els.btnRefresh) {
                els.btnRefresh.addEventListener('click', () => {
                    const id = els.limitId ? els.limitId.value.trim() : '';
                    if (id) {
                        void loadData();
                    } else {
                        handleCancel();
                    }
                    showMessage('Refreshed successfully', 'success');
                });
            }

            // Listen for messages from parent frame (for global sidebar buttons)
            window.addEventListener('message', function (event) {
                if (!event.data || event.data.type !== 'kairo-button-action') return;

                const action = event.data.action;
                console.log('[SanctionLimit] Received action from parent:', action);

                switch (action) {
                    case 'cancel':
                        handleCancel();
                        break;
                    case 'view':
                        void loadData();
                        break;
                    case 'add':
                        switchMode('ADD');
                        break;
                    case 'edit':
                        if (!currentData) {
                            showMessage('Please load a record first', 'warning');
                        } else {
                            switchMode('EDIT');
                        }
                        break;
                    case 'save':
                        void handleSave();
                        break;
                    case 'reject':
                        void handleReject();
                        break;
                }
            });

            if (els.btnPrevious) {
                els.btnPrevious.addEventListener('click', () => {
                    if (currentMode !== 'VIEW') {
                        showMessage('Previous is available only in View mode.', 'warning');
                        return;
                    }
                    showMessage('Previous/Next navigation not wired yet.', 'warning');
                });
            }
            if (els.btnNext) {
                els.btnNext.addEventListener('click', () => {
                    if (currentMode !== 'VIEW') {
                        showMessage('Next is available only in View mode.', 'warning');
                        return;
                    }
                    showMessage('Previous/Next navigation not wired yet.', 'warning');
                });
            }

            // Refresh button injection
            const injectRefresh = () => {
                window.parent.postMessage({
                    type: 'kairo-header-controls',
                    controls: [
                        { id: 'btnRefresh', label: 'Refresh', icon: 'bi-arrow-clockwise', action: 'view' }
                    ]
                }, '*');
            };
            injectRefresh();

            // Handle record load on Enter
            els.limitId?.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') void loadData();
            });

            els.branchId.value = "0325";
            wireCollapseButtons();
            void loadSystemDropdowns();
            switchMode('VIEW');
        }

        async function loadSystemDropdowns() {
            const ls = window.LookupService;
            if (!ls) {
                console.warn('[SanctionClientLimit] LookupService not found. Using fallbacks.');
                populateDPFallbacks();
                populateLimitTypeFallbacks();
                return;
            }

            try {
                console.log('🔄 Fetching system dropdowns...');

                // DP Definition
                const dpPromise = ls.getSystemCodeOptions("DPDefinitionID").catch(() => []);
                const limitPromise = ls.getSystemCodeOptions("LimitTypeID").catch(() => []);

                const [dpOptions, limitOptions] = await Promise.all([dpPromise, limitPromise]);

                if (dpOptions && dpOptions.length > 0) {
                    populateSelect(els.dpDefinition, dpOptions);
                } else {
                    populateDPFallbacks();
                }

                if (limitOptions && limitOptions.length > 0) {
                    populateSelect(els.limitType, limitOptions);
                } else {
                    populateLimitTypeFallbacks();
                }
            } catch (err) {
                console.error("[SanctionClientLimit] Error loading dynamic dropdowns:", err);
                populateDPFallbacks();
                populateLimitTypeFallbacks();
            }
        }

        function populateSelect(selectEl, options) {
            if (!selectEl) return;
            const currentVal = selectEl.value;
            selectEl.innerHTML = '<option value="">--Select--</option>';
            options.forEach(opt => {
                const o = document.createElement('option');
                o.value = opt.value;
                o.textContent = opt.label;
                selectEl.appendChild(o);
            });
            if (currentVal) selectEl.value = currentVal;
        }

        function populateDPFallbacks() {
            if (!els.dpDefinition) return;
            // Common DP Definitions in banking systems
            const fallbacks = [
                { value: '1', label: 'Drawing Power' },
                { value: '2', label: 'Transaction Amount' },
                { value: '3', label: 'Fixed Amount' },
                { value: 'D', label: 'Drawing Power' },
                { value: 'T', label: 'Transaction Amount' }
            ];
            populateSelect(els.dpDefinition, fallbacks);
        }

        function populateLimitTypeFallbacks() {
            if (!els.limitType) return;
            const fallbacks = [
                { value: 'Revolving', label: 'Revolving' },
                { value: 'Non Revolving', label: 'Non Revolving' },
                { value: 'R', label: 'Revolving' },
                { value: 'N', label: 'Non Revolving' }
            ];
            populateSelect(els.limitType, fallbacks);
        }

        function wireCollapseButtons() {
            console.log('🔗 Wiring section collapse buttons...');

            // Section header toggle (matches Account Maintenance pattern)
            document.querySelectorAll('[data-section-toggle]').forEach(header => {
                header.addEventListener('click', function (e) {
                    // Don't toggle if clicking on an input/button inside the header
                    if (e.target.closest('input, button, select')) return;

                    const section = this.closest('.form-section');
                    if (section) {
                        section.classList.toggle('collapsed');
                        const toggleBtn = section.querySelector('.section-toggle-btn');
                        const icon = toggleBtn?.querySelector('i');
                        const isCollapsed = section.classList.contains('collapsed');
                        
                        if (toggleBtn) {
                            toggleBtn.setAttribute('aria-expanded', !isCollapsed);
                        }
                        if (icon) {
                            icon.className = isCollapsed ? 'bi bi-chevron-down' : 'bi bi-chevron-up';
                        }
                    }
                });
            });

            // Toggle button click (stop propagation to avoid double toggle)
            document.querySelectorAll('.section-toggle-btn').forEach(btn => {
                btn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    const section = this.closest('.form-section');
                    if (section) {
                        section.classList.toggle('collapsed');
                        const isCollapsed = section.classList.contains('collapsed');
                        const icon = this.querySelector('i');
                        
                        this.setAttribute('aria-expanded', !isCollapsed);
                        if (icon) {
                            icon.className = isCollapsed ? 'bi bi-chevron-down' : 'bi bi-chevron-up';
                        }
                    }
                });
            });
        }

        function wireWindowControls() {
            // Window control buttons (Account Maintenance pattern)
            if (els.btnClose) {
                els.btnClose.addEventListener('click', () => {
                    if (window.parent !== window) {
                        window.parent.postMessage({ type: 'kairo-close-module', module: 'SanctionClientLimit' }, '*');
                    } else {
                        window.close();
                    }
                });
            }
            if (els.btnMinimize) {
                els.btnMinimize.addEventListener('click', () => {
                    window.parent.postMessage({ type: 'kairo-minimize-module', module: 'SanctionClientLimit' }, '*');
                });
            }
            if (els.btnMaximize) {
                els.btnMaximize.addEventListener('click', () => {
                    window.parent.postMessage({ type: 'kairo-maximize-module', module: 'SanctionClientLimit' }, '*');
                });
            }
        }

        // Initialize shared search modal + wire lookup buttons
        setTimeout(async () => {
            try {
                await initializeSearchModal();
                wireLookupButtons();
                setupDatePickers();
                wireWindowControls();
            } catch (e) {
                console.warn('[SanctionClientLimit] Failed to init search modal:', e);
            }
        }, 80);
        // Call initializeUI when DOM is ready
        if (document.readyState === 'loading') {
            console.log('⏳ DOM still loading, waiting for DOMContentLoaded...');
            document.addEventListener('DOMContentLoaded', initializeUI);
        } else {
            console.log('✅ DOM already loaded, initializing immediately...');
            initializeUI();
        }

    } catch (error) {
        console.error('❌ Fatal error during Sanction Client Limit initialization:', error);
        alert('Critical Error: Failed to initialize the page. Please check the console and refresh.\n\nError: ' + error.message);
    }
})();
