(function (global) {
    // Global services
    let ClientService;
    let LookupService;
    let currentNewRecordValue = 0;

    const initClientAddressPage = async function () {
        const { ServiceLoader } = global;

        function getHostContext() {
            const parentWindow = global.parent;
            const parentState = parentWindow?.Client360State || parentWindow?.ClientMaintenanceState || null;

            const sourceFromState = parentState?.Source || parentState?.source || '';

            const clientIdFromState = parentState?.ClientID || parentState?.clientId || '';
            const branchFromState = parentState?.OurBranchID || parentState?.ourBranchId || '';
            const operatorFromState = parentState?.OperatorID || parentState?.operatorId || '';

            // Fallback to legacy Client Maintenance hosting contract
            let clientIdFromDom = '';
            try {
                clientIdFromDom = parentWindow?.document?.getElementById?.('ClientID')?.value?.trim() || '';
            } catch (_) { /* ignore */ }

            // Also allow query-string (useful when embedded)
            let clientIdFromQuery = '';
            let sourceFromQuery = '';
            try {
                const u = new URL(String(global.location?.href || ''), global.location?.origin || undefined);
                clientIdFromQuery = u.searchParams.get('ClientID') || '';
                sourceFromQuery = u.searchParams.get('Source') || '';
            } catch (_) { /* ignore */ }

            const session = parentWindow?.getAuthSession?.() || parentWindow?.AuthService?.getSession?.() || {};
            const parentEnv = parentWindow?.Environment || {};

            const envBranchId = parentEnv.OurBranchID || parentEnv.ourBranchId || '';
            const branchId = branchFromState || session.branchID || session.branchId || session.BranchID || envBranchId || '0101';
            const operatorId = operatorFromState || session.operatorId || session.operatorID || session.name || parentEnv.OperatorID || 'SYSTEM';

            return {
                Source: String(sourceFromState || sourceFromQuery || '').trim(),
                ClientID: String(clientIdFromState || clientIdFromDom || clientIdFromQuery || '').trim(),
                OurBranchID: String(branchId || '').trim(),
                OperatorID: String(operatorId || '').trim()
            };
        }

        function isReadOnlyFromClient360() {
            const ctx = getHostContext();
            return String(ctx?.Source || '').toLowerCase() === 'client360';
        }

        function enforceReadOnlyUi() {
            if (!isReadOnlyFromClient360()) return;

            const addBtn = document.querySelector('.btn-action.action-add');
            const editBtn = document.querySelector('.btn-action.action-edit');
            const deleteBtn = document.querySelector('.btn-action.action-delete');
            const saveBtn = document.querySelector('.btn-action.action-save');

            if (addBtn) addBtn.disabled = true;
            if (editBtn) editBtn.disabled = true;
            if (deleteBtn) deleteBtn.disabled = true;
            if (saveBtn) saveBtn.disabled = true;

            // Always keep inputs locked in Client 360 mode
            try { toggleFields(true); } catch (_) { /* ignore */ }
        }

        // Load services using ServiceLoader
        if (ServiceLoader) {
            const basePath = '../../../assets/js/';
            try {
                await ServiceLoader.loadScripts([
                    `${basePath}services/shared/lookupService.js`,
                    `${basePath}services/client/clientService.js`
                ]);
                ClientService = global.ClientService;
                LookupService = global.LookupService;
                console.log('[ClientAddress] Services loaded successfully');

                // Populate Address Types if lookup available
                // if (LookupService) {
                //     const types = await LookupService.getAddressTypes();
                //     const select = document.getElementById('addressType');
                //     if (types && types.length > 0) {
                //         select.innerHTML = '';
                //         types.forEach(t => {
                //             const opt = document.createElement('option');
                //             opt.value = t.value;
                //             opt.textContent = t.label;
                //             select.appendChild(opt);
                //         });
                //     }
                // }
            } catch (error) {
                console.error('[ClientAddress] Failed to load services:', error);
            }
        }

        // Wire up lookup buttons
        document.querySelectorAll('.btn-lookup').forEach(button => {
            button.addEventListener('click', function () {
                const inputField = this.parentElement.querySelector('input');
                console.log('[ClientAddress] Lookup clicked for:', inputField.id);
            });
        });

        // Listen for messages from parent window (for refresh/close commands from parent modal)
        window.addEventListener('message', function (event) {
            if (event.data && event.data.action === 'refreshDataEntry') {
                console.log('[ClientAddress] Refresh command received from parent');
                resetFormToInitialState();
            }
        });

        // Wire up action buttons
        document.querySelectorAll('.btn-action').forEach(button => {
            button.addEventListener('click', function () {
                const action = this.textContent.trim().toLowerCase();
                console.log('[ClientAddress] Action clicked:', action);

                // Client 360: read-only (no data entry)
                if (isReadOnlyFromClient360()) {
                    const blocked = action.includes('add') || action.includes('edit') || action.includes('delete') || action.includes('save');
                    if (blocked) {
                        showToast('Address is read-only when opened from Client 360.', 'info');
                        enforceReadOnlyUi();
                        return;
                    }
                }

                if (action.includes('view')) {
                    onView();
                } else if (action.includes('edit')) {
                    toggleFields(false);
                    setEditState();
                    enforceReadOnlyUi();
                } else if (action.includes('add')) {
                    toggleFields(false);
                    clearAllFields();
                    setAddState();
                    currentNewRecordValue = 0; // Reset for new record
                    enforceReadOnlyUi();
                } else if (action.includes('save')) {
                    onSave();
                } else if (action.includes('delete')) {
                    setDeleteState();
                    // Slight delay to allow UI to update before confirm dialog (browser specific but good practice)
                    setTimeout(() => onDelete(), 50);
                } else if (action.includes('cancel')) {
                    clearAllFields();
                    toggleFields(true);
                    // Explicitly enable Address Type so user can select a different one
                    const addrType = document.getElementById('addressType');
                    if (addrType) addrType.disabled = false;
                    setInitialState();
                    enforceReadOnlyUi();
                } else if (action.includes('back') || action.includes('close')) {
                    try { global.parent?.postMessage({ type: 'CLOSE_DATAENTRY' }, '*'); } catch (_) {}
                    try { global.parent?.postMessage({ action: 'submoduleClosed' }, '*'); } catch (_) {}
                    try { global.parent?.postMessage({ type: 'accountMaintenanceChildClose' }, '*'); } catch (_) {}
                }
            });
        });

        function clearAllFields() {
            const container = document.querySelector('.section-body-bordered');
            if (!container) return;

            const controls = container.querySelectorAll('input, select');
            controls.forEach(ctrl => {
                // Skip the addressType dropdown
                if (ctrl.id === 'addressType') {
                    return;
                }
                if (ctrl.type === 'text' || ctrl.type === 'email' || ctrl.type === 'tel' || ctrl.tagName === 'SELECT') {
                    ctrl.value = '';
                }
            });
        }

        function resetFormToInitialState() {
            // Clear all input fields
            clearAllFields();

            // Reset Address Type to default (first option)
            const addressType = document.getElementById('addressType');
            if (addressType) {
                addressType.selectedIndex = 0;
            }

            // Clear Behind The Scene fields
            document.getElementById('createdBy').textContent = '-';
            document.getElementById('createdOn').textContent = '-';
            document.getElementById('modifiedBy').textContent = '-';
            document.getElementById('modifiedOn').textContent = '-';
            document.getElementById('supervisedBy').textContent = '-';
            document.getElementById('supervisedOn').textContent = '-';

            // Reset to initial button state
            setInitialState();

            // Disable all fields except Address Type
            toggleFields(true);

            // Reset the currentNewRecordValue
            currentNewRecordValue = 0;

            console.log('[ClientAddress] Form reset to initial state');
        }

        function setInitialState() {
            const viewBtn = document.querySelector('.btn-action.action-view');
            const addBtn = document.querySelector('.btn-action.action-add');
            const editBtn = document.querySelector('.btn-action.action-edit');
            const deleteBtn = document.querySelector('.btn-action.action-delete');
            const saveBtn = document.querySelector('.btn-action.action-save');
            const cancelBtn = document.querySelector('.btn-action.action-cancel');
            const backBtn = document.querySelector('.btn-action.action-back');

            viewBtn.disabled = false;
            addBtn.disabled = true;
            editBtn.disabled = true;
            deleteBtn.disabled = true;
            saveBtn.disabled = true;
            cancelBtn.disabled = true;
            backBtn.disabled = false;

            enforceReadOnlyUi();
        }

        function setEditState() {
            const viewBtn = document.querySelector('.btn-action.action-view');
            const addBtn = document.querySelector('.btn-action.action-add');
            const editBtn = document.querySelector('.btn-action.action-edit');
            const deleteBtn = document.querySelector('.btn-action.action-delete');
            const saveBtn = document.querySelector('.btn-action.action-save');
            const cancelBtn = document.querySelector('.btn-action.action-cancel');
            const backBtn = document.querySelector('.btn-action.action-back');

            viewBtn.disabled = true;
            addBtn.disabled = true;
            editBtn.disabled = true;
            deleteBtn.disabled = true;
            saveBtn.disabled = false;
            cancelBtn.disabled = false;
            backBtn.disabled = true;

            enforceReadOnlyUi();
        }

        function setViewState() {
            const viewBtn = document.querySelector('.btn-action.action-view');
            const addBtn = document.querySelector('.btn-action.action-add');
            const editBtn = document.querySelector('.btn-action.action-edit');
            const deleteBtn = document.querySelector('.btn-action.action-delete');
            const saveBtn = document.querySelector('.btn-action.action-save');
            const cancelBtn = document.querySelector('.btn-action.action-cancel');
            const backBtn = document.querySelector('.btn-action.action-back');

            viewBtn.disabled = true; // Disabled as per user request (only Edit, Delete, Cancel, Back enabled)
            addBtn.disabled = true;
            editBtn.disabled = false;
            deleteBtn.disabled = false;
            saveBtn.disabled = true;
            cancelBtn.disabled = false;
            backBtn.disabled = false;

            enforceReadOnlyUi();
        }

        function setAddState() {
            const viewBtn = document.querySelector('.btn-action.action-view');
            const addBtn = document.querySelector('.btn-action.action-add');
            const editBtn = document.querySelector('.btn-action.action-edit');
            const deleteBtn = document.querySelector('.btn-action.action-delete');
            const saveBtn = document.querySelector('.btn-action.action-save');
            const cancelBtn = document.querySelector('.btn-action.action-cancel');
            const backBtn = document.querySelector('.btn-action.action-back');

            viewBtn.disabled = true;
            addBtn.disabled = true;
            editBtn.disabled = true;
            deleteBtn.disabled = true;
            saveBtn.disabled = false;
            cancelBtn.disabled = false;
            backBtn.disabled = true;

            enforceReadOnlyUi();
        }

        function setNoDataState() {
            const viewBtn = document.querySelector('.btn-action.action-view');
            const addBtn = document.querySelector('.btn-action.action-add');
            const editBtn = document.querySelector('.btn-action.action-edit');
            const deleteBtn = document.querySelector('.btn-action.action-delete');
            const saveBtn = document.querySelector('.btn-action.action-save');
            const cancelBtn = document.querySelector('.btn-action.action-cancel');
            const backBtn = document.querySelector('.btn-action.action-back');

            viewBtn.disabled = false; // Keep View enabled to try again or view other types
            addBtn.disabled = false;
            editBtn.disabled = true;
            deleteBtn.disabled = true;
            saveBtn.disabled = true;
            cancelBtn.disabled = false;
            backBtn.disabled = false;

            enforceReadOnlyUi();
        }

        function setPostSaveState() {
            const viewBtn = document.querySelector('.btn-action.action-view');
            const addBtn = document.querySelector('.btn-action.action-add');
            const editBtn = document.querySelector('.btn-action.action-edit');
            const deleteBtn = document.querySelector('.btn-action.action-delete');
            const saveBtn = document.querySelector('.btn-action.action-save');
            const cancelBtn = document.querySelector('.btn-action.action-cancel');
            const backBtn = document.querySelector('.btn-action.action-back');

            viewBtn.disabled = false;
            addBtn.disabled = true;
            editBtn.disabled = true;
            deleteBtn.disabled = true;
            saveBtn.disabled = true;
            cancelBtn.disabled = false;
            backBtn.disabled = true;

            enforceReadOnlyUi();
        }

        function setDeleteState() {
            const viewBtn = document.querySelector('.btn-action.action-view');
            const addBtn = document.querySelector('.btn-action.action-add');
            const editBtn = document.querySelector('.btn-action.action-edit');
            const deleteBtn = document.querySelector('.btn-action.action-delete');
            const saveBtn = document.querySelector('.btn-action.action-save');
            const cancelBtn = document.querySelector('.btn-action.action-cancel');
            const backBtn = document.querySelector('.btn-action.action-back');

            viewBtn.disabled = true;
            addBtn.disabled = true;
            editBtn.disabled = true;
            deleteBtn.disabled = true;
            saveBtn.disabled = true;
            cancelBtn.disabled = false;
            backBtn.disabled = false;

            enforceReadOnlyUi();
        }

        function toggleFields(disabled) {
            const container = document.querySelector('.section-body-bordered');
            if (!container) return;

            const controls = container.querySelectorAll('input, select');
            const buttons = container.querySelectorAll('.btn-lookup');

            controls.forEach(ctrl => {
                // Always keep Address Type enabled so users can select it on page load
                if (ctrl.id === 'addressType') {
                    ctrl.disabled = false;
                    return;
                }
                ctrl.disabled = disabled;
            });

            buttons.forEach(btn => {
                btn.disabled = disabled;
                btn.style.opacity = disabled ? '0.5' : '1';
                btn.style.pointerEvents = disabled ? 'none' : 'auto';
            });
        }

        // Wire up navigation arrows
        document.querySelectorAll('.btn-nav').forEach(button => {
            button.addEventListener('click', function () {
                const label = this.getAttribute('aria-label');
                const direction = label.toLowerCase().includes('next') ? 1 : -1;
                onView(direction);
            });
        });

        async function onView(direction = 0) {
            if (!ClientService) {
                alert('Client Service not loaded');
                return;
            }

            const ctx = getHostContext();
            const clientId = ctx.ClientID;

            if (!clientId) {
                alert('Please load or select a Client in the main Maintenance form first.');
                return;
            }

            const branchId = ctx.OurBranchID;
            const operatorId = ctx.OperatorID;

            const selectedType = document.getElementById('addressType').value;
            let apiAddressType = 'O';

            const lowerType = selectedType.toLowerCase();
            if (lowerType.includes('residential') || selectedType === 'R') {
                apiAddressType = 'R';
            } else if (lowerType.includes('business') || selectedType === 'B') {
                apiAddressType = 'B';
            } else {
                apiAddressType = 'O';
            }

            const payload = {
                ClientID: clientId,
                OurBranchID: branchId,
                AddressTypeID: apiAddressType,
                OperatorID: operatorId,
                Direction: direction
            };

            console.log('[ClientAddress] Fetching address with payload:', payload);

            try {
                const response = await ClientService.getClientAddressDetails(payload);
                console.log('[ClientAddress] API Response:', response);
                if (response.success) {
                    const data = response.data.Details01;
                    if (Array.isArray(data) && data.length > 0) {
                        console.log('[ClientAddress] Mapping data from dataset:', data);
                        populateFields(data);
                        toggleFields(true); // Disable fields after loading
                        setViewState(); // Enable Edit/Delete etc.
                    } else {
                        console.warn('[ClientAddress] No address data found for this type.');
                        showToast('No record found.', 'info'); // "popup"
                        clearAllFields();
                        setNoDataState();
                    }
                } else {
                    console.error('[ClientAddress] API Error:', response.message);
                }
            } catch (error) {
                console.error('[ClientAddress] Request failed:', error);
            }
        }

        async function onSave() {
            if (!ClientService) {
                alert('Client Service not loaded');
                return;
            }

            const ctx = getHostContext();
            const clientId = ctx.ClientID;

            if (!clientId) {
                alert('Client ID is missing.');
                return;
            }

            const operatorId = ctx.OperatorID || 'SYSTEM';
            const timestamp = formatDateForRequest(new Date());

            const addressType = document.getElementById('addressType').value;
            let apiAddressType = 'O';
            const lowerType = addressType.toLowerCase();
            if (lowerType.includes('residential') || addressType === 'R') apiAddressType = 'R';
            else if (lowerType.includes('business') || addressType === 'B') apiAddressType = 'B';

            const requestData = {
                ClientID: clientId,
                AddressTypeID: apiAddressType,
                Address1: document.getElementById('address1').value,
                Address2: document.getElementById('address2').value,
                LandMark: document.getElementById('landMark').value,
                CityID: document.getElementById('city').value,
                CountryID: document.getElementById('country').value,
                ZIPCode: document.getElementById('zipCode').value,
                Phone1: document.getElementById('phoneHome').value,
                phone2: document.getElementById('phoneWork').value,
                Mobile: document.getElementById('mobile').value,
                Fax: document.getElementById('faxNo').value,
                Email: document.getElementById('emailId').value,
                IsMailingAddress: apiAddressType === 'O' ? 1 : 0, // Logic: default 1 if 'Other/Mailing'
                IsMailingAddress: apiAddressType === 'O' ? 1 : 0, // Logic: default 1 if 'Other/Mailing'
                CreatedBy: document.getElementById('createdBy').value || operatorId,
                CreatedOn: tryFormatDate(document.getElementById('createdOn').value) || timestamp,
                ModifiedBy: operatorId,
                ModifiedOn: timestamp,
                SupervisedBy: document.getElementById('supervisedBy').value || operatorId,
                NewRecord: currentNewRecordValue ? currentNewRecordValue : 1,
                SubCityID: document.getElementById('subCityZone').value,
                RegionID: document.getElementById('region').value,
                Wereda: document.getElementById('wereda').value,
                Kebele: document.getElementById('kebele').value,
                HouseNo: document.getElementById('houseNumber').value,
                TINNumber: document.getElementById('tinNumber').value
            };

            console.log('[ClientAddress] Saving data:', requestData);

            const saveBtn = document.querySelector('.btn-action.action-save');
            if (saveBtn) saveBtn.disabled = true; // Immediate disable

            try {
                const response = await ClientService.addEditClientAddress(requestData);
                if (response.success) {
                    showToast('Address saved successfully!', 'success');
                    clearAllFields(); // Clear inputs but keep Address Type
                    // Refresh data from server to confirm save and get updated metadata
                    await onView();
                    toggleFields(true); // Disable fields
                    setViewState(); // Use View State (Edit enabled, View enabled) instead of PostSave locked state
                } else {
                    showToast('Failed to save: ' + response.message, 'error');
                    if (saveBtn) saveBtn.disabled = false; // Re-enable on failure
                }
            } catch (error) {
                console.error('[ClientAddress] Save error:', error);
                showToast('An error occurred while saving.', 'error');
                if (saveBtn) saveBtn.disabled = false; // Re-enable on failure
            }
        }

        async function onDelete() {
            if (!confirm('Are you sure you want to delete this record?')) {
                // If user cancels, restore previous state (View State)
                setViewState();
                return;
            }

            if (!ClientService) {
                alert('Client Service not loaded');
                return;
            }

            const ctx = getHostContext();
            const clientId = ctx.ClientID;
            const branchId = ctx.OurBranchID;

            const selectedType = document.getElementById('addressType').value;
            let apiAddressType = 'O';
            const lowerType = selectedType.toLowerCase();
            if (lowerType.includes('residential') || selectedType === 'R') apiAddressType = 'R';
            else if (lowerType.includes('business') || selectedType === 'B') apiAddressType = 'B';


            const requestData = {
                OurBranchID: branchId,
                ClientID: clientId,
                AddressTypeID: apiAddressType,
                UpdateCount: currentNewRecordValue || 0
            };

            console.log('[ClientAddress] Deleting with payload:', requestData);

            try {
                const response = await ClientService.deleteClientAddress(requestData);
                if (response.success) {
                    showToast('Address deleted successfully!', 'success');
                    clearAllFields(); // Clear all except Address Type
                    toggleFields(true); // Ensure enabled (or disabled logic as per request?)
                    // "clear input fields apart from address type... then do not fetch anymore data"
                    // Usually implying a reset state.
                    setInitialState(); // Reset buttons to initial state (only View/Back enabled)
                } else {
                    showToast('Failed to delete: ' + response.message, 'error');
                    setViewState(); // Restore if failed
                }
            } catch (error) {
                console.error('[ClientAddress] Delete error:', error);
                showToast('An error occurred while deleting.', 'error');
                setViewState(); // Restore if failed
            }
        }

        function showToast(message, type = 'success') {
            if (window.Toast && window.Toast.show) {
                window.Toast.show(message, type);
            } else {
                console.warn('Toast service not loaded, falling back to alert');
                alert(message);
            }
        }

        function formatDateForRequest(date) {
            const pad = (n) => n.toString().padStart(2, '0');
            const mm = pad(date.getMonth() + 1);
            const dd = pad(date.getDate());
            const yyyy = date.getFullYear();
            const hh = pad(date.getHours());
            const min = pad(date.getMinutes());
            const ss = pad(date.getSeconds());
            return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}`;
        }

        function tryFormatDate(dateStr) {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr; // Return original if parse fails
            return formatDateForRequest(d);
        }

        function formatDateForDisplay(dateStr) {
            if (!dateStr || dateStr === '-') return '-';
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;

            const day = date.getDate();
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const month = monthNames[date.getMonth()];
            const year = date.getFullYear();

            let hours = date.getHours();
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;

            return `${day}-${month}-${year}, ${hours}:${minutes} ${ampm}`;
        }

        function populateFields(data) {
            if (!Array.isArray(data) || data.length === 0) return;

            const record = data[0];
            if (!record) return;

            document.getElementById('address1').value = record.Address1 || '';
            document.getElementById('address2').value = record.Address2 || '';
            document.getElementById('landMark').value = record.LandMark || '';
            document.getElementById('country').value = record.CountryID || '';
            document.getElementById('city').value = record.CityID || '';
            document.getElementById('phoneHome').value = record.PhoneHome || '';
            document.getElementById('phoneWork').value = record.PhoneWork || '';
            document.getElementById('mobile').value = record.Mobile || '';
            document.getElementById('faxNo').value = record.FaxNo || '';
            document.getElementById('emailId').value = record.Email || '';
            document.getElementById('zipCode').value = record.ZipCode || '';
            document.getElementById('wereda').value = record.Wereda || '';
            document.getElementById('kebele').value = record.Kebele || '';
            document.getElementById('houseNumber').value = record.HouseNumber || record.HouseNo || '';
            document.getElementById('tinNumber').value = record.TINNumber || '';
            document.getElementById('communicationAddress').value = record.CommunicationAddress || '';

            // Map SubCity and Region if they are returned by onView SP
            if (document.getElementById('subCityZone')) {
                document.getElementById('subCityZone').value = record.SubCityID || record.SubCityZone || '';
            }
            if (document.getElementById('region')) {
                document.getElementById('region').value = record.RegionID || record.Region || '';
            }

            document.getElementById('createdBy').textContent = record.CreatedBy || '-';
            document.getElementById('createdOn').textContent = formatDateForDisplay(record.CreatedOn);
            document.getElementById('modifiedBy').textContent = record.ModifiedBy || '-';
            document.getElementById('modifiedOn').textContent = formatDateForDisplay(record.ModifiedOn);
            document.getElementById('supervisedBy').textContent = record.ApprovedBy || '-';
            document.getElementById('supervisedOn').textContent = formatDateForDisplay(record.ApprovedOn);

            // Store NewRecord value for next Save
            currentNewRecordValue = parseInt(record.UpdateCount || 0, 10);
            console.log('[ClientAddress] Current NewRecord value stored:', currentNewRecordValue);
        }

        // Populate initial metadata
        const now = new Date();
        const operator = 'SYSTEM';

        document.getElementById('createdBy').textContent = operator;
        document.getElementById('createdOn').textContent = formatDateForDisplay(now);
        document.getElementById('modifiedBy').textContent = operator;
        document.getElementById('modifiedOn').textContent = formatDateForDisplay(now);

        // Initialize button states
        setInitialState();

        // Disable all input fields except Address Type on page load
        toggleFields(true);

        // If this page is opened from Client 360 overlay and a ClientID is available,
        // auto-load the address so the user can Edit/Delete (when data exists) or Add (when none).
        try {
            const ctx = getHostContext();
            if (ctx && ctx.ClientID) {
                setTimeout(function () {
                    onView(0);
                }, 80);
            }
        } catch (e) {
            console.warn('[ClientAddress] Auto-load skipped:', e);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initClientAddressPage);
    } else {
        initClientAddressPage();
    }
})(window);
