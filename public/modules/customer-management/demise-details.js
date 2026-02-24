/**
 * Demise Details Management
 * Handles fetching and managing client demise details
 */

let currentUpdateCount = 0; // GLOBAL STATE to track UpdateCount for Edit/Concurrency

document.addEventListener('DOMContentLoaded', () => {
    initializeDemiseDetails();
});

function initializeDemiseDetails() {
    console.log("Demise Details Initialized");

    // Attach Event Listeners
    const addBtn = document.querySelector('.action-add');
    const editBtn = document.querySelector('.action-edit');
    const deleteBtn = document.querySelector('.action-delete');
    const saveBtn = document.querySelector('.action-save');
    const cancelBtn = document.querySelector('.action-cancel');
    const closeBtn = document.querySelector('.action-back');

    if (addBtn) addBtn.addEventListener('click', handleAddAction);
    if (editBtn) editBtn.addEventListener('click', handleEditAction);
    if (deleteBtn) deleteBtn.addEventListener('click', handleDeleteAction);
    if (saveBtn) saveBtn.addEventListener('click', handleSaveAction);
    if (cancelBtn) cancelBtn.addEventListener('click', handleCancelAction);

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (window.parent) {
                window.parent.postMessage({ type: 'CLOSE_DATAENTRY' }, '*');
            }
        });
    }

    // Initial fetch
    fetchDemiseDetails();
}

async function fetchDemiseDetails() {
    console.log("Fetching Demise Details...");
    // Determine Context
    let branchId = '001';
    let clientId = '';
    let operatorId = 'ADMIN';

    // 1. Try to get from URL params (iframe context)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('clientId')) clientId = urlParams.get('clientId');
    if (urlParams.has('branchId')) branchId = urlParams.get('branchId');

    // 2. Fallback to Session Storage
    if (!clientId && sessionStorage.getItem('SelectedClient')) {
        try {
            const client = JSON.parse(sessionStorage.getItem('SelectedClient'));
            clientId = client.ClientID || client.ID;
        } catch (e) {
            console.error(e);
        }
    }

    // 3. Fallback to Parent Window
    if (!clientId && window.parent && window.parent.document) {
        const parentClientIdInput = window.parent.document.getElementById('ClientID');
        if (parentClientIdInput && parentClientIdInput.value) {
            clientId = parentClientIdInput.value;
        }
    }

    if (!clientId) {
        console.warn('Demise Details: No ClientID found.');
        handleNoRecords();
        return;
    }

    const payload = {
        "RequestData": {
            "ClientID": clientId,
            "OurBranchID": branchId,
            "OperatorID": operatorId
        }
    };

    try {
        if (typeof ClientService !== 'undefined') {
            const response = await ClientService.getDemiseDetails(payload.RequestData);
            console.log('Demise Details Response:', response);

            if (response && (response.success || response.code === '00')) {
                let data = response.data || response.Details;

                // 1. Direct Object having Details01
                if (data && data.Details01) {
                    if (Array.isArray(data.Details01)) {
                        if (data.Details01.length === 0) {
                            console.log('Details01 is empty array -> No Records');
                            handleNoRecords();
                            return;
                        }
                        data = data.Details01;
                    }
                }
                // 2. Array wrapper [ { Details01: ... } ]
                else if (Array.isArray(data) && data.length > 0) {
                    if (data[0].Details01) {
                        // Check if nested Details01 is empty
                        if (Array.isArray(data[0].Details01) && data[0].Details01.length === 0) {
                            console.log('Nested Details01 is empty array -> No Records');
                            handleNoRecords();
                            return;
                        }
                        data = data[0].Details01;
                    }
                }

                // Unwind array to getting first item if it is an array
                if (Array.isArray(data)) {
                    if (data.length === 0) {
                        handleNoRecords();
                        return;
                    }
                    data = data[0];
                }

                if (data) {
                    mapDataToFields(data);
                    setViewState('view');
                } else {
                    handleNoRecords();
                }
            } else {
                console.error('API Error:', response?.message);
                handleNoRecords();
            }
        } else {
            console.error('ClientService is not defined.');
        }
    } catch (error) {
        console.error('Error fetching demise details', error);
        handleNoRecords();
    }
}

function mapDataToFields(data) {
    if (!data) return;

    console.log("Mapping Demise Details:", data);

    // Save UpdateCount for later use in Edit functionality
    currentUpdateCount = data.UpdateCount || 0;
    console.log("Current Update Count Set To:", currentUpdateCount);

    // Map Fields
    // Use DemiseDate or DeathDate based on API response
    setVal('demiseDate', formatDateForInput(data.DemiseDate || data.DeathDate));

    // Reason ID Mapping (Natural Death, Accident)
    setVal('reasonId', data.ReasonID || data.Reason || data.DemiseReasonID);

    // Document Proof Mapping
    // Handle "Doctor Certificate" -> "DC" mapping if necessary
    let docProof = data.DocumentProofID || data.DocumentProof;
    if (docProof === 'Doctor Certificate') docProof = 'DC';
    setVal('documentProofId', docProof);

    setVal('reason', data.ReasonDescription || data.Reason);
    setVal('notificationDate', formatDateForInput(data.NotificationDate));
    setVal('documentImage', data.DocumentImage);
    setVal('remarks', data.Remarks);

    // Audit Fields
    setText('CreatedBy', data.CreatedBy);
    setText('CreatedOn', formatDate(data.CreatedOn));
    setText('ModifiedBy', data.ModifiedBy);
    setText('ModifiedOn', formatDate(data.ModifiedOn));
    setText('SupervisedBy', data.SupervisedBy);
    setText('SupervisedOn', formatDate(data.SupervisedOn));
}

function handleNoRecords() {
    console.log("No records found, setting empty state.");
    currentUpdateCount = 0; // Reset

    // Show popup/toast
    if (typeof Toast !== 'undefined') {
        Toast.show('No records found. Click Add to create new demise details.', 'info');
    } else {
        alert('No records found. Click Add to create new demise details.');
    }

    // Clear fields
    clearFields();

    // Set state to 'empty'
    setViewState('empty');
}

function setViewState(state) {
    const addBtn = document.querySelector('.action-add');
    const editBtn = document.querySelector('.action-edit');
    const deleteBtn = document.querySelector('.action-delete');
    const saveBtn = document.querySelector('.action-save');
    const cancelBtn = document.querySelector('.action-cancel');
    const closeBtn = document.querySelector('.action-back'); // Back/Close

    // 1. Default: Disable modification buttons
    if (addBtn) addBtn.disabled = true;
    if (editBtn) editBtn.disabled = true;
    if (deleteBtn) deleteBtn.disabled = true;
    if (saveBtn) saveBtn.disabled = true;
    if (cancelBtn) cancelBtn.disabled = true;

    // 2. Back/Close always enabled
    if (closeBtn) closeBtn.disabled = false;

    // 3. Handle specific states
    switch (state) {
        case 'empty': // No records found
            if (addBtn) addBtn.disabled = false;
            // Edit, Delete, Save, Cancel remain disabled
            toggleFormState(false); // Inputs locked
            break;

        case 'view': // Records exist, view mode
            if (editBtn) editBtn.disabled = false;
            if (deleteBtn) deleteBtn.disabled = false;
            if (addBtn) addBtn.disabled = false;
            toggleFormState(false); // Inputs locked
            break;

        case 'add': // User clicked Add
        case 'edit': // User clicked Edit
            if (saveBtn) saveBtn.disabled = false;
            if (cancelBtn) cancelBtn.disabled = false;
            // Disable Add/Edit/Delete while modifying
            if (addBtn) addBtn.disabled = true;
            if (editBtn) editBtn.disabled = true;
            if (deleteBtn) deleteBtn.disabled = true;

            toggleFormState(true); // Inputs unlocked
            break;
    }
}

function handleAddAction() {
    clearFields();
    setViewState('add');
    // Focus first field
    document.getElementById('demiseDate')?.focus();
}

function handleEditAction() {
    setViewState('edit');
}

function handleDeleteAction() {
    if (confirm('Are you sure you want to delete this record?')) {
        // Call API
        alert('Delete functionality to be implemented');
    }
}

async function handleSaveAction() {
    const saveBtn = document.querySelector('.action-save');
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';

    // 1. Context
    let branchId = '001';
    let clientId = '';
    let operatorId = 'ADMIN';

    // Try to get from URL params first
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('clientId')) clientId = urlParams.get('clientId');
    if (urlParams.has('branchId')) branchId = urlParams.get('branchId');

    // Fallback to Session Storage
    if (!clientId && sessionStorage.getItem('SelectedClient')) {
        try {
            const client = JSON.parse(sessionStorage.getItem('SelectedClient'));
            clientId = client.ClientID || client.ID;
        } catch (e) {
            console.error(e);
        }
    }

    // Fallback to Parent
    if (!clientId && window.parent && window.parent.document) {
        const parentClientIdInput = window.parent.document.getElementById('ClientID');
        if (parentClientIdInput && parentClientIdInput.value) {
            clientId = parentClientIdInput.value;
        }
    }

    if (!clientId) {
        if (typeof Toast !== 'undefined') Toast.error('Error: Client ID context missing.');
        else alert('Error: Client ID context missing.');

        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
        return;
    }

    // 2. Gather Data
    const getVal = (id) => document.getElementById(id)?.value || '';

    // Determine if New Record?
    // User Spec: Case Edit: NewRecord = UpdateCount (fetched on load). Case Add: NewRecord = 1.

    // We check if it's visually "Add" state (CreatedBy is empty/-)
    const isAddMode = document.getElementById('CreatedBy')?.textContent === '-';

    // If Add mode, NewRecord is 1. If Edit mode, NewRecord is the fetched UpdateCount.
    const newRecordVal = isAddMode ? 1 : (currentUpdateCount || 0);

    const payloadDetails = {
        "ClientID": clientId,
        "DeathDate": getVal('demiseDate') || null, // smalldatetime
        "NotificationDate": getVal('notificationDate') || null, // smalldatetime
        "DemiseReasonID": getVal('reasonId'), // UserSubID (Natural Death, Accident)
        "Reason": getVal('reason'),
        "DocumentProofID": getVal('documentProofId'), // UserSubID
        "ImageID": 0, // bigint 
        "Remarks": getVal('remarks'),

        "CreatedBy": operatorId,
        "CreatedOn": new Date().toISOString(),
        "ModifiedBy": operatorId,
        "ModifiedOn": new Date().toISOString(),
        "SupervisedBy": operatorId,

        "NewRecord": newRecordVal
    };

    const payload = {
        "RequestData": payloadDetails
    };

    console.log('Sending Save Request:', payload);

    try {
        if (typeof ClientService === 'undefined') {
            throw new Error("ClientService not available");
        }

        const response = await ClientService.saveDemiseDetails(payload.RequestData);
        console.log('Save Response:', response);

        if (response && (response.success || response.code === '00')) {
            // Success
            if (typeof Toast !== 'undefined') {
                Toast.success('Demise details saved successfully.');
            } else {
                alert('Demise details saved successfully.');
            }

            // Re-fetch to show latest data and lock form
            await fetchDemiseDetails();

        } else {
            // Failure
            const msg = response?.message || 'Unknown error occurred.';
            if (typeof Toast !== 'undefined') {
                Toast.error('Save failed: ' + msg);
            } else {
                alert('Save failed: ' + msg);
            }
        }

    } catch (error) {
        console.error('Error saving demise details', error);
        if (typeof Toast !== 'undefined') {
            Toast.error('An error occurred while saving.');
        } else {
            alert('An error occurred while saving.');
        }
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    }
}

function handleCancelAction() {
    // Revert to view state
    fetchDemiseDetails();
}

// --- Helpers ---

function toggleFormState(enabled) {
    const inputs = document.querySelectorAll('.de-form-shell input, .de-form-shell select, .de-form-shell textarea');
    inputs.forEach(input => {
        // Skip read-only intended fields if necessary
        if (input.id === 'documentImage') return;

        input.disabled = !enabled;
    });
}

function clearFields() {
    const inputs = document.querySelectorAll('.de-form-shell input, .de-form-shell select, .de-form-shell textarea');
    inputs.forEach(input => {
        input.value = '';
    });

    const audits = document.querySelectorAll('.de-audit-value');
    audits.forEach(span => span.textContent = '-');
}

function setVal(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value || '';
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text || '-';
}

function formatDateForInput(dateString) {
    if (!dateString) return '';
    try {
        return new Date(dateString).toISOString().split('T')[0];
    } catch {
        return '';
    }
}

function formatDate(dateString) {
    if (!dateString) return '-';
    if (dateString.startsWith('1900') || dateString.startsWith('0001')) return '-';
    try {
        return new Date(dateString).toLocaleString();
    } catch {
        return dateString;
    }
}
