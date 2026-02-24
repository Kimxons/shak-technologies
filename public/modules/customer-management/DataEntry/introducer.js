(function (global) {
    // Global services
    let ClientService;
    let LookupService;
    let updateCount = 1; // Database tracking for NewRecord field
    let isAddMode = false; // Flag for UI mode (Local vs Global search)

    const initIntroducerPage = async function () {
        const { ServiceLoader } = global;

        // Load services using ServiceLoader
        if (ServiceLoader) {
            const basePath = '../../../assets/js/';
            try {
                await ServiceLoader.loadScripts([
                    `${basePath}services/shared/coreApi.js`,
                    `${basePath}services/shared/lookupService.js`,
                    `${basePath}services/client/clientService.js`
                ]);
                ClientService = global.ClientService;
                LookupService = global.LookupService;
                console.log('[Introducer] Services loaded successfully');
            } catch (error) {
                console.error('[Introducer] Failed to load services:', error);
            }
        }

        // Wire up lookup buttons
        document.querySelectorAll('.btn-lookup').forEach(button => {
            button.addEventListener('click', function (e) {
                e.preventDefault();
                openSearchModal();
            });
        });

        // Wire up action buttons
        document.querySelectorAll('.btn-action').forEach(button => {
            button.addEventListener('click', function () {
                const action = this.textContent.trim().toLowerCase();
                console.log('[Introducer] Action clicked:', action);

                if (action.includes('view')) {
                    onView();
                } else if (action.includes('add')) {
                    clearAllFields(true); // Clear everything including search
                    toggleFields(false);
                    updateCount = 1; // Reset to 1 for new records
                    isAddMode = true; // Switch to global search pool
                    console.log('[Introducer] Switched to ADD mode (Global Search Enabled)');
                    setAddState(); // Disable all buttons except Save and Cancel
                } else if (action.includes('edit')) {
                    toggleFields(false);
                    setEditState();
                } else if (action.includes('delete')) {
                    onDelete();
                } else if (action.includes('save')) {
                    onSave();
                } else if (action.includes('cancel')) {
                    clearAllFields();
                    toggleFields(true);
                    updateCount = 1; // Default back to 1
                    isAddMode = false; // Back to local search mode
                    setInitialState();
                } else if (action.includes('back') || action.includes('close')) {
                    global.parent?.postMessage({ type: 'CLOSE_DATAENTRY' }, '*');
                }
            });
        });

        function clearAllFields(clearSearch = false) {
            const container = document.querySelector('.form-content');
            if (!container) return;

            const controls = container.querySelectorAll('input, select, textarea');
            controls.forEach(ctrl => {
                // Skip readonly fields and audit section
                if (ctrl.hasAttribute('readonly') || ctrl.closest('.audit-section')) {
                    // But if it's the search name and clearSearch is on, clear it
                    if (clearSearch && ctrl.id === 'introducerClientName') {
                        ctrl.value = '';
                    }
                    return;
                }

                // Normal fields
                if (ctrl.id === 'introducerClientId' && !clearSearch) {
                    return; // Keep search ID unless explicit clearSearch
                }

                if (ctrl.type === 'text' || ctrl.type === 'email' || ctrl.type === 'tel' || ctrl.type === 'number' || ctrl.tagName === 'SELECT' || ctrl.tagName === 'TEXTAREA') {
                    ctrl.value = '';
                }
            });
        }

        function setInitialState() {
            const viewBtn = document.querySelector('.btn-action.action-view');
            const addBtn = document.querySelector('.btn-action.action-add');
            const editBtn = document.querySelector('.btn-action.action-edit');
            const deleteBtn = document.querySelector('.btn-action.action-delete');
            const saveBtn = document.querySelector('.btn-action.action-save');
            const cancelBtn = document.querySelector('.btn-action.action-cancel');
            const backBtn = document.querySelector('.btn-action.action-back');

            // On load: View, Add, Back active. Edit, Save, Cancel, Delete disabled.
            if (viewBtn) viewBtn.disabled = false;
            if (addBtn) addBtn.disabled = false;
            if (editBtn) editBtn.disabled = true;
            if (deleteBtn) deleteBtn.disabled = true;
            if (saveBtn) saveBtn.disabled = true;
            if (cancelBtn) cancelBtn.disabled = true;
            if (backBtn) backBtn.disabled = false;
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
        }

        function setAddState() {
            const viewBtn = document.querySelector('.btn-action.action-view');
            const addBtn = document.querySelector('.btn-action.action-add');
            const editBtn = document.querySelector('.btn-action.action-edit');
            const deleteBtn = document.querySelector('.btn-action.action-delete');
            const saveBtn = document.querySelector('.btn-action.action-save');
            const cancelBtn = document.querySelector('.btn-action.action-cancel');
            const backBtn = document.querySelector('.btn-action.action-back');

            if (viewBtn) viewBtn.disabled = true;
            if (addBtn) addBtn.disabled = true;
            if (editBtn) editBtn.disabled = true;
            if (deleteBtn) deleteBtn.disabled = true;
            if (saveBtn) saveBtn.disabled = false;
            if (cancelBtn) cancelBtn.disabled = false;
            if (backBtn) backBtn.disabled = true;
        }

        function toggleFields(disabled) {
            const container = document.querySelector('.form-content');
            if (!container) return;

            const controls = container.querySelectorAll('input, select, textarea');
            const buttons = container.querySelectorAll('.btn-lookup');

            controls.forEach(ctrl => {
                // Keep search field always enabled for identification
                if (ctrl.id === 'introducerClientId') {
                    ctrl.disabled = false;
                    return;
                }

                // Never enable audit section fields
                if (ctrl.closest('.audit-section')) {
                    ctrl.disabled = true;
                    return;
                }

                // Deactivate Behind The Scene section in Add mode
                if (isAddMode && ctrl.closest('.behind-the-scene-section')) {
                    ctrl.disabled = true;
                    return;
                }

                // Never enable the name display field (it is readonly in HTML)
                if (ctrl.id === 'introducerClientName' || ctrl.hasAttribute('readonly')) {
                    return;
                }

                ctrl.disabled = disabled;
            });

            buttons.forEach(btn => {
                // Keep the lookup/search button always enabled so users can always identify a client
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.pointerEvents = 'auto';
            });
        }

        async function onView(direction = 0) {
            if (!ClientService) {
                alert('Client Service not loaded');
                return;
            }

            // Check if introducer client ID is entered
            const introducerIdInput = document.getElementById('introducerClientId');
            const introducerClientId = introducerIdInput?.value?.trim();

            if (!introducerClientId) {
                Toast.show('Please enter or select an Introducer Client ID first.', 'error');
                introducerIdInput?.focus();
                return;
            }

            // Get Client ID directly from parent maintenance form
            const parentWindow = global.parent;
            const parentDoc = parentWindow.document;
            const clientId = parentDoc.getElementById('ClientID')?.value?.trim();

            if (!clientId) {
                Toast.show('Please load or select a Client in the main Maintenance form first.', 'error');
                return;
            }

            // Get session info from parent
            const session = parentWindow.getAuthSession?.() || {};
            const parentEnv = parentWindow.Environment || {};

            const envBranchId = parentEnv.OurBranchID || parentEnv.ourBranchId || "";
            const branchId = session.branchID || session.branchId || session.BranchID || envBranchId || "0101";
            const operatorId = session.operatorId || session.operatorID || session.name || parentEnv.OperatorID || 'SYSTEM';

            const payload = {
                OurBranchID: branchId,
                IntroducerClientID: introducerClientId,
                ClientID: clientId,
                OperatorID: operatorId,
                Direction: direction
            };

            console.log('[Introducer] Fetching introducer with payload:', payload);

            try {
                const response = await ClientService.getClientIntroducer(payload);
                console.log('[Introducer] API Response:', response);

                if (response.success) {
                    const details01 = response.data?.Details01;
                    const details02 = response.data?.Details02;

                    if (Array.isArray(details01) && details01.length > 0) {
                        console.log('[Introducer] Mapping data from Details01 and Details02');
                        populateFields(details01, details02);

                        // Extract UpdateCount from Details02 if available
                        if (Array.isArray(details02) && details02.length > 0) {
                            updateCount = details02[0].UpdateCount || 0;
                            console.log('[Introducer] Captured UpdateCount from DB:', updateCount);
                        } else {
                            updateCount = 0;
                        }

                        isAddMode = false; // We are now in view/edit mode for an existing link
                        toggleFields(true); // Disable fields after loading
                        setViewState(); // Enable Edit, Cancel, Back buttons
                    } else {
                        console.warn('[Introducer] No introducer data found for this client.');
                        Toast.show('No introducer data found for this client.', 'info');
                    }
                } else {
                    console.error('[Introducer] API Error:', response.message);
                    Toast.show('Error fetching data: ' + response.message, 'error');
                }
            } catch (error) {
                console.error('[Introducer] Request failed:', error);
                // alert('Failed to fetch introducer data: ' + error.message);
            }
        }

        function setViewState() {
            const viewBtn = document.querySelector('.btn-action.action-view');
            const addBtn = document.querySelector('.btn-action.action-add');
            const editBtn = document.querySelector('.btn-action.action-edit');
            const deleteBtn = document.querySelector('.btn-action.action-delete');
            const saveBtn = document.querySelector('.btn-action.action-save');
            const cancelBtn = document.querySelector('.btn-action.action-cancel');
            const backBtn = document.querySelector('.btn-action.action-back');

            viewBtn.disabled = true;
            addBtn.disabled = true;
            editBtn.disabled = false;
            deleteBtn.disabled = false;
            saveBtn.disabled = true;
            cancelBtn.disabled = false;
            backBtn.disabled = false;
        }

        function populateFields(details01, details02 = []) {
            if (!details01) return;

            // Handle both array and object formats for main profile
            const record = Array.isArray(details01) ? details01[0] : details01;
            if (!record) return;

            // Handle relation/audit data from Details02
            const relation = Array.isArray(details02) && details02.length > 0 ? details02[0] : {};

            console.log('[Introducer] Populating profile from Details01:', record);
            console.log('[Introducer] Populating relation from Details02:', relation);

            // Main Section - Introduced By (Prioritize Details02 for logical linkage)
            document.getElementById('introducerClientId').value = relation.IntroducerClientID || record.IntroducerClientID || record.ClientID || record.ClientId || '';
            document.getElementById('introducerClientName').value = record.IntroducerClientName || record.ClientName || record.Name || '';
            document.getElementById('knownSince').value = relation.KnownSince || record.KnownSince || '';
            document.getElementById('remarks').value = relation.Remarks || record.Remarks || '';

            // Behind The Scene Section
            document.getElementById('baseBranchId').value = record.BaseBranchID || record.BranchID || record.OurBranchID || '';
            document.getElementById('address1').value = record.Address1 || '';
            document.getElementById('address2').value = record.Address2 || '';
            document.getElementById('city').value = record.CityName || record.City || '';
            document.getElementById('country').value = record.CountryName || record.Country || '';
            document.getElementById('phone').value = record.Phone1 || record.Phone || '';
            document.getElementById('faxNo').value = record.Fax || record.FaxNo || '';
            document.getElementById('mobile').value = record.Mobile || '';
            document.getElementById('emailId').value = record.Email || record.EmailID || '';
            document.getElementById('gender').value = record.Gender || '';
            document.getElementById('relation').value = record.Relation || record.Relationship || '';

            // Audit Section - Always from relation data (Details02)
            if (document.getElementById('createdBy')) document.getElementById('createdBy').textContent = relation.CreatedBy || '-';
            if (document.getElementById('modifiedBy')) document.getElementById('modifiedBy').textContent = relation.ModifiedBy || '-';
            if (document.getElementById('supervisedBy')) document.getElementById('supervisedBy').textContent = relation.SupervisedBy || relation.ApprovedBy || '-';
            if (document.getElementById('createdOn')) document.getElementById('createdOn').textContent = relation.CreatedOn || '-';
            if (document.getElementById('modifiedOn')) document.getElementById('modifiedOn').textContent = relation.ModifiedOn || '-';
            if (document.getElementById('supervisedOn')) document.getElementById('supervisedOn').textContent = relation.SupervisedOn || relation.ApprovedOn || '-';
        }

        async function onSave() {
            if (!ClientService) {
                alert('Client Service not loaded');
                return;
            }

            const parentWindow = global.parent;
            const parentDoc = parentWindow.document;
            const clientId = parentDoc.getElementById('ClientID')?.value?.trim();

            if (!clientId) {
                Toast.show('Please load or select a Client in the main Maintenance form first.', 'error');
                return;
            }

            const introducerIdInput = document.getElementById('introducerClientId');
            const introducerClientId = introducerIdInput?.value?.trim();

            if (!introducerClientId) {
                Toast.show('Please enter or select an Introducer Client ID.', 'error');
                introducerIdInput?.focus();
                return;
            }

            // Get session info from parent
            const session = parentWindow.getAuthSession?.() || {};
            const parentEnv = parentWindow.Environment || {};
            const branchId = session.branchID || session.branchId || session.BranchID || parentEnv.OurBranchID || "0101";
            const operatorId = session.operatorId || session.operatorID || session.name || parentEnv.OperatorID || 'SYSTEM';

            const payload = {
                ClientID: clientId,
                IntroducerClientID: introducerClientId,
                KnownSince: parseInt(document.getElementById('knownSince')?.value || '0'),
                Remarks: document.getElementById('remarks')?.value || '',
                CreatedBy: document.getElementById('createdBy')?.value || operatorId,
                CreatedOn: document.getElementById('createdOn')?.value || '',
                ModifiedBy: operatorId,
                ModifiedOn: new Date().toISOString().slice(0, 19).replace('T', ' '),
                SupervisedBy: document.getElementById('supervisedBy')?.value || '',
                NewRecord: isAddMode ? 1 : updateCount
            };

            console.log('[Introducer] Saving data:', payload);

            try {
                const response = await ClientService.addEditClientIntroducer(payload);
                if (response.success) {
                    Toast.show('Introducer details saved successfully.', 'success');
                    toggleFields(true);
                    onView(); // Refresh and return to view state
                } else {
                    Toast.show('Error saving data: ' + (response.message || 'Unknown error'), 'error');
                }
            } catch (error) {
                console.error('[Introducer] Save failed:', error);
                Toast.show('Failed to save data: ' + error.message, 'error');
            }
        }

        async function onDelete() {
            if (!confirm('Are you sure you want to delete this introducer record?')) return;
            if (!ClientService) return;

            const parentWindow = global.parent;
            const parentDoc = parentWindow.document;
            const clientId = parentDoc.getElementById('ClientID')?.value?.trim();
            const introducerClientId = document.getElementById('introducerClientId')?.value?.trim();

            if (!clientId || !introducerClientId) {
                alert('Required identifiers (Client ID and Introducer ID) are missing.');
                return;
            }

            const session = parentWindow.getAuthSession?.() || {};
            const parentEnv = parentWindow.Environment || {};
            const branchId = session.branchID || session.branchId || session.BranchID || parentEnv.OurBranchID || "0101";
            const operatorId = session.operatorId || session.operatorID || session.name || parentEnv.OperatorID || 'SYSTEM';

            const payload = {
                OurBranchID: branchId,
                ClientID: clientId,
                IntroducerClientID: introducerClientId,
                OperatorID: operatorId
            };

            console.log('[Introducer] Deleting record:', payload);

            try {
                const response = await ClientService.deleteClientIntroducer(payload);
                if (response.success) {
                    Toast.show('Introducer record deleted.', 'success');
                    clearAllFields(true);
                    toggleFields(true);
                    setInitialState();
                } else {
                    Toast.show('Error deleting record: ' + (response.message || 'Unknown error'), 'error');
                }
            } catch (error) {
                console.error('[Introducer] Delete failed:', error);
                Toast.show('Failed to delete record: ' + error.message, 'error');
            }
        }

        function openSearchModal() {
            // Get Client ID from parent maintenance form
            const parentDoc = global.parent?.document;
            const clientId = parentDoc?.getElementById('ClientID')?.value?.trim();

            if (!clientId) {
                Toast.show('Please load or select a Client in the main Maintenance form first.', 'error');
                return;
            }

            // Determine tableId based on UI mode
            // isAddMode === true means we are adding a NEW link, so we search globally
            const tableId = isAddMode ? 'ClientID' : 'ClientIntroducerID';

            // Build AdvFilterString
            // For ClientIntroducerID, we must restrict to the current client's introducers
            // For ClientID (Global Search), we do NOT restrict by ClientID
            const advFilter = (tableId === 'ClientIntroducerID') ? `ClientID='${clientId}'` : '';

            console.log(`[Introducer] Opening Search Modal: isAddMode=${isAddMode}, tableId=${tableId}, advFilter=${advFilter}`);

            const overlay = document.createElement('div');
            overlay.className = 'introducer-search-modal-overlay';
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(4px);
                z-index: 9999; display: flex; align-items: center; justify-content: center;
                padding: 20px;
            `;

            const modal = document.createElement('div');
            modal.style.cssText = `
                width: 900px; height: 600px; background: white;
                border-radius: 16px; overflow: hidden;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                display: flex; flex-direction: column;
            `;

            const iframe = document.createElement('iframe');

            // Pass both values as URL parameters
            const searchUrl = `../client-search.html?tableId=${tableId}&advFilter=${encodeURIComponent(advFilter)}`;
            console.log(`[Introducer] Modal Source: ${searchUrl}`);

            iframe.src = searchUrl;
            iframe.style.cssText = 'flex: 1; width: 100%; border: none;';

            const header = document.createElement('div');
            header.style.cssText = `
                padding: 10px 20px; border-bottom: 1px solid #eee; 
                display: flex; justify-content: space-between; align-items: center;
                background: #f8fafc;
            `;
            header.innerHTML = `
                <span style="font-weight:600">Introducer Search (Mode: ${tableId === 'ClientID' ? 'Global Search' : 'Existing Introducers'})</span>
                <button class="close-btn" style="border:none;background:none;font-size:18px;cursor:pointer">&times;</button>
            `;

            header.querySelector('.close-btn').addEventListener('click', () => overlay.remove());

            modal.appendChild(header);
            modal.appendChild(iframe);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) overlay.remove();
            });
        }

        // Listener for messages from Search Modal
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'CLIENT_SELECTED') {
                const { clientId, data } = event.data;

                // Close modal
                const overlay = document.querySelector('.introducer-search-modal-overlay');
                if (overlay) overlay.remove();

                // Populate Client ID and Name using the IDs we added to the HTML
                const idInput = document.getElementById('introducerClientId');
                const nameInput = document.getElementById('introducerClientName');

                // Extract the correct fields - prioritize IntroducerClientID/Name for introducer search
                const introducerId = data?.IntroducerClientID || clientId;
                const introducerName = data?.IntroducerClientName || data?.ClientName || data?.Name || '';

                if (idInput) idInput.value = introducerId;
                if (nameInput) nameInput.value = introducerName;

                // Populate other fields from selected client data
                populateFields(data);

                console.log('[Introducer] Client selected from search:', introducerId, introducerName);
            }
        });

        // Initialize button states and disable fields
        toggleFields(true); // Disable all fields on initial load
        setInitialState();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initIntroducerPage);
    } else {
        initIntroducerPage();
    }
})(window);
