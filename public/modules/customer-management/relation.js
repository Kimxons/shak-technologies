(function (global) {
    // Global services
    let ClientService;
    let LookupService;
    let selectedRelation = null; // currently selected row data
    let relationsList = []; // list of all loaded relations

    function escapeXml(unsafe) {
        return (unsafe || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;");
    }

    const initRelationPage = async function () {
        const { ServiceLoader } = global;

        // Load services
        if (ServiceLoader) {
            const basePath = '../../assets/js/';
            try {
                await ServiceLoader.loadScripts([
                    `${basePath}services/shared/coreApi.js`,
                    `${basePath}services/shared/lookupService.js`,
                    `${basePath}services/client/clientService.js`
                ]);
                ClientService = global.ClientService;
                LookupService = global.LookupService;
                console.log('[Relation] Services loaded successfully');

                // Load Dropdowns
                loadDropdowns();
            } catch (error) {
                console.error('[Relation] Failed to load services:', error);
            }
        }

        // Wire up Lookups
        setupLookups();

        // Wire up Actions (Right Panel)
        setupGlobalActions();

        // Wire up Local Actions (Form Buttons)
        setupLocalActions();

        // Initialize State
        setInitialState();
    };

    function setupLookups() {
        // Client ID Lookup
        const btnLookup = document.querySelector('.de-btn-lookup');
        if (btnLookup) {
            btnLookup.addEventListener('click', () => {
                openClientSearchModal();
            });
        }
    }

    async function loadDropdowns() {
        if (!LookupService) return;

        try {
            // Populate Relation Types
            const relTypes = await LookupService.getRelationTypes();
            populateSelect('relationType', relTypes);

            // Populate Relations
            const relations = await LookupService.getRelations();
            populateSelect('relation', relations);
        } catch (e) {
            console.error('[Relation] Failed to load dropdowns', e);
        }
    }

    function populateSelect(id, options) {
        const select = document.getElementById(id);
        if (!select || !options) return;

        // Keep the first option (placeholder)
        while (select.options.length > 1) {
            select.remove(1);
        }

        options.forEach(opt => {
            const el = document.createElement('option');
            el.value = opt.value || opt.Value || opt.Code;
            el.textContent = opt.label || opt.Text || opt.Description;
            select.appendChild(el);
        });
    }

    function setupGlobalActions() {
        document.querySelectorAll('.de-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = btn.textContent.trim().toLowerCase();

                if (action.includes('view')) {
                    loadRelations();
                } else if (action.includes('add')) {
                    prepareNewRelation();
                } else if (action.includes('edit')) {
                    prepareEditRelation();
                } else if (action.includes('delete') || action.includes('remove')) {
                    deleteRelation();
                } else if (action.includes('save')) {
                    saveRelation();
                } else if (action.includes('cancel')) {
                    clearForm();
                    setInitialState();
                } else if (action.includes('close') || action.includes('back')) {
                    global.parent?.postMessage({ type: 'CLOSE_DATAENTRY' }, '*');
                }
            });
        });
    }

    function setupLocalActions() {
        document.getElementById('btnLocalNew')?.addEventListener('click', prepareNewRelation);
        document.getElementById('btnLocalAlter')?.addEventListener('click', () => {
            if (selectedRelation) {
                toggleForm(true);
                document.getElementById('clientId').readOnly = true; // Cannot change person on alter
                setFormState('edit');
            } else {
                Toast.show('Please select a relation from the table first.', 'warning');
            }
        });
        document.getElementById('btnLocalRemove')?.addEventListener('click', deleteRelation);
        document.getElementById('btnLocalUpdate')?.addEventListener('click', saveRelation);
        document.getElementById('btnLocalClear')?.addEventListener('click', () => {
            clearForm();
            setFormState('initial');
        });
    }

    function prepareNewRelation() {
        clearForm();
        toggleForm(true);
        document.getElementById('clientId').readOnly = false;
        selectedRelation = null;
        setFormState('new');
    }

    function prepareEditRelation() {
        if (!selectedRelation) {
            Toast.show('Please select a relation to edit.', 'warning');
            return;
        }
        toggleForm(true);
        document.getElementById('clientId').readOnly = true;
        setFormState('edit');
    }

    function clearForm() {
        document.getElementById('clientId').value = '';
        document.getElementById('clientName').value = '';
        document.getElementById('relationType').value = '';
        document.getElementById('relation').value = '';
        document.getElementById('sharePercentage').value = '';
        document.getElementById('remarks').value = '';
        selectedRelation = null;

        // Clear Audit (BTS)
        ['createdBy', 'createdOn', 'modifiedBy', 'modifiedOn', 'supervisedBy', 'supervisedOn'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '-';
        });
    }

    function toggleForm(enable) {
        const fields = ['clientId', 'relationType', 'relation', 'sharePercentage', 'remarks'];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = !enable;
        });
    }

    function setFormState(state) {
        // State: 'initial', 'view', 'new', 'edit'

        // Right panel buttons
        const actionView = document.querySelector('.action-view');
        const actionAdd = document.querySelector('.action-add');
        const actionEdit = document.querySelector('.action-edit');
        const actionDelete = document.querySelector('.action-delete');
        const actionSave = document.querySelector('.action-save');
        const actionCancel = document.querySelector('.action-cancel');
        const actionBack = document.querySelector('.action-back');

        if (state === 'view') {
            if (actionAdd) actionAdd.disabled = false;
            if (actionEdit) actionEdit.disabled = false;
            if (actionDelete) actionDelete.disabled = false;
            if (actionSave) actionSave.disabled = true;
            if (actionCancel) actionCancel.disabled = true;

            toggleForm(false);
        } else if (state === 'new' || state === 'edit') {
            if (actionAdd) actionAdd.disabled = true;
            if (actionEdit) actionEdit.disabled = true;
            if (actionDelete) actionDelete.disabled = true;
            if (actionSave) actionSave.disabled = false;
            if (actionCancel) actionCancel.disabled = false;
        } else {
            // Initial
            if (actionAdd) actionAdd.disabled = false;
            if (actionEdit) actionEdit.disabled = true;
            if (actionDelete) actionDelete.disabled = true;
            if (actionSave) actionSave.disabled = true;
            if (actionCancel) actionCancel.disabled = true;

            toggleForm(false);

            // Re-check grid state to set enabled/disabled buttons correctly if just entering initial state
            const hasRecords = relationsList && relationsList.length > 0;
            updateActionsBasedOnGrid(hasRecords);
        }
    }

    function setInitialState() {
        setFormState('initial');
        // Robust auto-load: Retry a few times if ClientID is missing initially (parent loading)
        let attempts = 0;
        const maxAttempts = 5;

        const tryLoad = () => {
            const parentDoc = global.parent?.document;
            const mainClientId = parentDoc?.getElementById('ClientID')?.value?.trim();

            if (mainClientId) {
                loadRelations();
            } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(tryLoad, 500);
            }
        };

        tryLoad();
    }

    function updateActionsBasedOnGrid(hasRecords) {
        const actionView = document.querySelector('.action-view');
        const actionAdd = document.querySelector('.action-add');
        const actionEdit = document.querySelector('.action-edit');
        const actionDelete = document.querySelector('.action-delete');
        const actionSave = document.querySelector('.action-save');
        const actionCancel = document.querySelector('.action-cancel');
        const actionBack = document.querySelector('.action-back');

        if (hasRecords) {
            // Records exist: Add, Edit, Delete, Back enabled. Save, Cancel disabled.
            if (actionAdd) actionAdd.disabled = false;
            if (actionEdit) actionEdit.disabled = false;
            if (actionDelete) actionDelete.disabled = false;
            if (actionSave) actionSave.disabled = true;
            if (actionCancel) actionCancel.disabled = true;
            if (actionBack) actionBack.disabled = false;
        } else {
            // No records: Add, Back enabled. Edit, Delete, Save, Cancel disabled.
            if (actionAdd) actionAdd.disabled = false;
            if (actionEdit) actionEdit.disabled = true;
            if (actionDelete) actionDelete.disabled = true;
            if (actionSave) actionSave.disabled = true;
            if (actionCancel) actionCancel.disabled = true;
            if (actionBack) actionBack.disabled = false;
        }
    }

    async function loadRelations() {
        if (!ClientService) return;

        const parentDoc = global.parent?.document;
        const mainClientId = parentDoc?.getElementById('ClientID')?.value?.trim();

        if (!mainClientId) {
            return;
        }

        try {
            // Get session info
            const parentWindow = global.parent;
            const session = parentWindow.getAuthSession?.() || {};
            const branchId = session.branchID || session.branchId || "0101";
            const operatorId = session.operatorId || session.operatorID || "SYSTEM";

            const payload = {
                ClientID: mainClientId,
                OurBranchID: branchId,
                OperatorID: operatorId
            };

            const response = await ClientService.getClientMaintenanceRelation(payload);
            console.log('[Relation] Fetched relations:', response);

            if (response.success) {
                // Robust dataset check (Details01 preferred, else Details)
                const d1 = response.data?.Details || [];
                const d2 = response.data?.Details01 || [];
                const d3 = response.data?.Table1 || []; // Some endpoints use Table1 in NewDataSet

                if (Array.isArray(d2) && d2.length > 0) {
                    relationsList = d2;
                } else if (Array.isArray(d1) && d1.length > 0) {
                    relationsList = d1;
                } else if (Array.isArray(d3) && d3.length > 0) {
                    relationsList = d3;
                } else {
                    relationsList = [];
                }

                renderTable(relationsList);
            } else {
                Toast.show('Error loading relations: ' + response.message, 'error');
                renderTable([]);
            }

        } catch (e) {
            console.error('[Relation] Error loading relations', e);
            Toast.show('Connection error while loading relations.', 'error');
        }
    }

    function renderTable(list) {
        const tbody = document.getElementById('relationTableBody');
        tbody.innerHTML = '';

        if (!list || list.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="3" class="de-table__empty-cell" style="text-align: center; padding: 40px; color: #94a3b8;">
                        <div class="de-empty-state">
                            <i class="bi bi-inbox" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>
                            <span>No records found. Click 'New' to add details.</span>
                        </div>
                    </td>
                </tr>`;
            updateActionsBasedOnGrid(false); // No records logic
            return;
        }

        updateActionsBasedOnGrid(true); // Records exist logic

        list.forEach((item, index) => {
            const tr = document.createElement('tr');

            // Map exact fields from DB as requested:
            // ClientID	RelatedClientID	RelatedClientName	RelationID	Relation	ClientToRelationID	RelationRefNo	Remarks	SharePercent	CreatedBy ...
            const clientName = item.RelatedClientName || item.relatedClientName || item.RelatedClientID || item.relatedClientID;
            const relationDesc = item.Relation || item.relation || item.RelationID || item.relationID;
            const share = item.SharePercent || item.sharePercent || 0;

            tr.innerHTML = `
                <td>${clientName}</td>
                <td>${relationDesc}</td>
                <td>${parseFloat(share).toFixed(2)}%</td>
            `;
            tr.style.cursor = 'pointer';
            tr.addEventListener('click', () => selectRow(item, tr));
            tbody.appendChild(tr);
        });
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

    function selectRow(item, tr) {
        selectedRelation = item;

        // Highlight row
        document.querySelectorAll('#relationTableBody tr').forEach(r => {
            r.classList.remove('selected-row');
            r.style.backgroundColor = '';
            r.style.fontWeight = 'normal';
        });
        tr.classList.add('selected-row');
        tr.style.backgroundColor = '#e2e8f0';
        tr.style.fontWeight = 'bold';

        // Populate form
        document.getElementById('clientId').value = item.RelatedClientID || '';
        document.getElementById('clientName').value = item.RelatedClientName || '';

        // relationType - Data not explicitly in DB snippet, try best effort or leave existing
        // If RelationID is the "Relation" dropdown value:
        setValue('relation', item.RelationID); // 'M'

        // Try to infer or set Relation Type if available, else leave blank
        if (item.RelationTypeID) {
            setValue('relationType', item.RelationTypeID);
        }

        document.getElementById('sharePercentage').value = item.SharePercent || '';
        document.getElementById('remarks').value = item.Remarks || '';

        // Populate Audit (BTS)
        if (document.getElementById('createdBy')) document.getElementById('createdBy').textContent = item.CreatedBy || '-';
        if (document.getElementById('createdOn')) document.getElementById('createdOn').textContent = formatDateForDisplay(item.CreatedOn);
        if (document.getElementById('modifiedBy')) document.getElementById('modifiedBy').textContent = item.ModifiedBy || '-';
        if (document.getElementById('modifiedOn')) document.getElementById('modifiedOn').textContent = formatDateForDisplay(item.ModifiedOn);
        if (document.getElementById('supervisedBy')) document.getElementById('supervisedBy').textContent = item.SupervisedBy || '-';
        if (document.getElementById('supervisedOn')) document.getElementById('supervisedOn').textContent = formatDateForDisplay(item.SupervisedOn);

        setFormState('view');
    }

    function setValue(id, val) {
        const el = document.getElementById(id);
        if (el && val) el.value = val;
    }

    function escapeXml(unsafe) {
        return unsafe.replace(/[<>&'"]/g, function (c) {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
            }
        });
    }

    async function saveRelation() {
        if (!ClientService) return;

        const parentDoc = global.parent?.document;
        const mainClientId = parentDoc?.getElementById('ClientID')?.value?.trim();

        if (!mainClientId) {
            Toast.show('Main Client ID is missing. Cannot save.', 'error');
            return;
        }

        const relatedClientId = document.getElementById('clientId').value.trim();
        if (!relatedClientId) {
            Toast.show('Please select a Related Client.', 'warning');
            return;
        }

        if (relatedClientId === mainClientId) {
            Toast.show('Cannot create relation with self.', 'warning');
            return;
        }

        const relationType = document.getElementById('relationType').value;
        const relationId = document.getElementById('relation').value;

        if (!relationId) {
            Toast.show('Please select a Relation.', 'warning');
            return;
        }

        // DUPLICATE CHECK: Prevent adding the same Related Client again
        const isEdit = !!selectedRelation;
        const exists = relationsList.some(r => {
            const rId = r.RelatedClientID || r.relatedClientID || r.RelatedClientId || r.ClientID;
            const targetId = String(relatedClientId).trim();
            const currentRecordId = String(rId).trim();

            // If editing, exclude self from check (though ID is usually readonly)
            if (isEdit && selectedRelation) {
                const currentId = selectedRelation.RelatedClientID || selectedRelation.relatedClientID;
                if (currentRecordId === String(currentId).trim()) return false;
            }
            return currentRecordId === targetId;
        });

        if (exists) {
            Toast.show('This client is already added as a relation.', 'error');
            return;
        }

        const parentWindow = global.parent;
        const session = parentWindow.getAuthSession?.() || {};
        const branchId = session.branchID || session.branchId || "0101";
        const operatorId = session.operatorId || session.operatorID || "SYSTEM";

        // Build DetailRecords XML
        // Assuming <NewDataSet><Table1>... structure based on similar modules
        // Determine ButtonMark (N = New, A = Modify) and ID
        const buttonMark = isEdit ? 'A' : 'N';
        const clientToRelationID = isEdit ? (selectedRelation.ClientToRelationID || 0) : 0;
        const relationRefNo = isEdit ? (selectedRelation.RelationRefNo || 1) : 1;
        const relatedClientName = document.getElementById('clientName').value || "";

        // Build XML in the format expected by p_AddEditClientRelations (dt_ClientRelations)
        const safe = escapeXml;
        const sharePercent = document.getElementById('sharePercentage').value || 0;
        const remarks = document.getElementById('remarks').value || "";

        const detailXml = `
            <dt_ClientRelations>
                <RelationID>${safe(relationId)}</RelationID>
                <RelationTypeID>${safe(relationType)}</RelationTypeID>
                <CreatedBy>${safe(operatorId)}</CreatedBy>
                <RelatedClientID>${safe(relatedClientId)}</RelatedClientID>
                <RelatedClientName>${safe(relatedClientName)}</RelatedClientName>
                <ButtonMark>${buttonMark}</ButtonMark>
                <RelationRefNo>${relationRefNo}</RelationRefNo>
                <SharePercent>${sharePercent}</SharePercent>
                <ClientToRelationID>${clientToRelationID}</ClientToRelationID>
                <Remarks>${safe(remarks)}</Remarks>
            </dt_ClientRelations>
         `.trim().replace(/\s+/g, ' ');

        function getCurrentDateFormatted() {
            const date = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
        }

        const currentDate = getCurrentDateFormatted();
        // Custom UpdateCount Logic as requested:
        // if UpdateCount is 1 -> 2
        // else -> keep as is
        // Default to 1 if new (isEdit false)
        let updateCount = 1;
        if (isEdit && selectedRelation) {
            let currentCount = parseInt(selectedRelation.UpdateCount) || 1;
            if (currentCount === 1) {
                updateCount = 2;
            } else {
                updateCount = currentCount;
            }
        }

        const payload = {
            OurBranchID: branchId,
            ClientID: mainClientId,
            CreatedBy: isEdit ? (selectedRelation.CreatedBy || operatorId) : operatorId,
            CreatedOn: isEdit ? (selectedRelation.CreatedOn || currentDate) : currentDate,
            ModifiedBy: operatorId,
            ModifiedOn: currentDate,
            SupervisedBy: isEdit ? (selectedRelation.SupervisedBy || "") : "",
            UpdateCount: updateCount,
            DetailRecords: detailXml
        };

        console.log('[Relation] Saving payload:', payload);

        try {
            // using the newly mapped method (which links to dbo.p_GetClientRelations?? No, we need add/edit)
            // clientService.js maps: addEditClientRelation -> dbo.p_AddEditClientRelation (singular in file, user wants plural in logic?)
            // User requested payload RequestID: "dbo.p_AddEditClientRelations"
            // Start by assuming clientService handles the envelope ID if we configured it.
            // But we need to update clientService to use the PLURAL form if it's not already.

            // Wait, previous step updated getClientMaintenanceRelation to "p_GetClientRelations" (Plural).
            // But addEditClientRelation is still "p_AddEditClientRelation" (Singular) in clientService.js?
            // I should check clientService.js again, but assuming "addEditClientRelation" is the method.

            const response = await ClientService.addEditClientRelation(payload);
            if (response.success) {
                Toast.show('Relation saved successfully.', 'success');
                loadRelations(); // Refresh table
                clearForm();
                setFormState('initial');
            } else {
                let msg = response.message || "Unknown error";
                if (msg.includes('duplicate key') && msg.includes('UX_t_ClientRelationRequestIDRelatedClient')) {
                    Toast.show('Next of Kin / Relation already exists for this client.', 'warning');
                } else {
                    Toast.show('Error: ' + msg, 'error');
                }
            }
        } catch (e) {
            console.error(e);
            let msg = e.message || "Unknown error";
            if (msg.includes('duplicate key') && msg.includes('UX_t_ClientRelationRequestIDRelatedClient')) {
                Toast.show('Next of Kin / Relation already exists for this client.', 'warning');
            } else {
                Toast.show('Save failed: ' + msg, 'error');
            }
        }
    }

    async function deleteRelation() {
        if (!selectedRelation) {
            Toast.show('Please select a relation to delete.', 'warning');
            return;
        }

        showConfirmModal('Are you sure you want to delete this relation?', async () => {

            const parentDoc = global.parent?.document;
            const mainClientId = parentDoc?.getElementById('ClientID')?.value?.trim();

            const session = global.parent?.getAuthSession?.() || {};
            const branchId = session.branchID || session.branchId || "0101";

            // Minimal payload as requested
            const payload = {
                ClientID: mainClientId,
                OurBranchID: branchId
            };

            // Payload simplified per user request (only ClientID and BranchID sent)

            try {
                const response = await ClientService.deleteClientRelation(payload);
                if (response.success) {
                    Toast.show('Relation deleted successfully.', 'success');
                    loadRelations();
                    clearForm();
                    setFormState('initial');
                } else {
                    Toast.show('Error: ' + response.message, 'error');
                }
            } catch (e) {
                Toast.show('Delete failed: ' + e.message, 'error');
            }
        });
    }

    function showConfirmModal(message, onConfirm) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); z-index: 10000;
            display: flex; align-items: center; justify-content: center;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white; padding: 20px; border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
            width: 320px; max-width: 90%; text-align: center;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        `;

        const msgEl = document.createElement('p');
        msgEl.textContent = message;
        msgEl.style.cssText = 'margin: 0 0 20px 0; color: #374151; font-size: 16px; font-weight: 500;';

        const btnContainer = document.createElement('div');
        btnContainer.style.cssText = 'display: flex; justify-content: center; gap: 12px;';

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.cssText = `
            padding: 8px 16px; border: 1px solid #d1d5db; background: white;
            color: #374151; border-radius: 6px; cursor: pointer;
            font-size: 14px; font-weight: 500; transition: background 0.2s;
        `;
        cancelBtn.onmouseover = () => cancelBtn.style.background = '#f3f4f6';
        cancelBtn.onmouseout = () => cancelBtn.style.background = 'white';
        cancelBtn.onclick = () => overlay.remove();

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'Delete';
        confirmBtn.style.cssText = `
            padding: 8px 16px; border: none; background: #ef4444;
            color: white; border-radius: 6px; cursor: pointer;
            font-size: 14px; font-weight: 500; transition: background 0.2s;
        `;
        confirmBtn.onmouseover = () => confirmBtn.style.background = '#dc2626';
        confirmBtn.onmouseout = () => confirmBtn.style.background = '#ef4444';
        confirmBtn.onclick = () => {
            overlay.remove();
            onConfirm();
        };

        btnContainer.appendChild(cancelBtn);
        btnContainer.appendChild(confirmBtn);
        modal.appendChild(msgEl);
        modal.appendChild(btnContainer);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Close on outside click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
    }

    function openClientSearchModal() {
        const overlay = document.createElement('div');
        overlay.className = 'relation-search-modal-overlay';
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
        // Search for ANY client to link as related
        const searchUrl = `client-search.html`;
        iframe.src = searchUrl;
        iframe.style.cssText = 'flex: 1; width: 100%; border: none;';

        const header = document.createElement('div');
        header.style.cssText = `
            padding: 10px 20px; border-bottom: 1px solid #eee; 
            display: flex; justify-content: space-between; align-items: center;
            background: #f8fafc;
        `;
        header.innerHTML = `
            <span style="font-weight:600">Search Related Client</span>
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

    // Message listener for Search Modal
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'CLIENT_SELECTED') {
            const { clientId, data } = event.data;
            document.querySelector('.relation-search-modal-overlay')?.remove();

            // Only update if the field is active (not disabled). 
            // We allow update even if readOnly, because the lookup tool is an explicit action.
            const idField = document.getElementById('clientId');
            if (idField && !idField.disabled) {
                idField.value = clientId;

                // Try multiple properties for the name
                const cName = data.ClientName || data.Name || data.Description || data.AccountName || data.ShortName || '';
                const nameField = document.getElementById('clientName');
                if (nameField) {
                    nameField.value = cName;
                }
            }
        }
    });


    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initRelationPage);
    } else {
        initRelationPage();
    }

})(window);
