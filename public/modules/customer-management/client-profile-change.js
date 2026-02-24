/**
 * Client Profile Change Management
 * Handles fetching and saving client profile updates
 */

document.addEventListener('DOMContentLoaded', () => {
    initializeClientProfileChange();
});

function initializeClientProfileChange() {
    const editBtn = document.querySelector('.action-edit');
    const saveBtn = document.querySelector('.action-save');
    const cancelBtn = document.querySelector('.action-cancel');
    const closeBtn = document.querySelector('.action-back');

    // Attach Event Listeners
    if (editBtn) {
        editBtn.addEventListener('click', handleEditAction);
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', handleSaveAction);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', handleCancelAction);
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (window.parent) {
                window.parent.postMessage({ type: 'CLOSE_DATAENTRY' }, '*');
            }
        });
    }

    // Initial Fetch
    fetchClientData();
}

async function fetchClientData() {
    // Determine Context
    let branchId = '001'; // Default or from session
    let clientId = '';
    let operatorId = 'ADMIN';

    // 1. Try to get from URL params (iframe context)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('clientId')) clientId = urlParams.get('clientId');
    if (urlParams.has('branchId')) branchId = urlParams.get('branchId');

    // 2. Try to get from Session Storage (SelectedClient object)
    if (!clientId && sessionStorage.getItem('SelectedClient')) {
        try {
            const client = JSON.parse(sessionStorage.getItem('SelectedClient'));
            clientId = client.ClientID || client.ID;
        } catch (e) {
            console.error('Error parsing SelectedClient from session', e);
        }
    }

    // 3. Try to get from Parent Window (if inside iframe in Client Maintenance)
    if (!clientId && window.parent && window.parent.document) {
        const parentClientIdInput = window.parent.document.getElementById('ClientID');
        if (parentClientIdInput && parentClientIdInput.value) {
            clientId = parentClientIdInput.value;
        }
    }

    if (!clientId) {
        console.warn('Client Profile Change: No ClientID found in context (URL, Session, or Parent).');
        return;
    }

    const payload = {
        "RequestData": {
            "OurBranchID": branchId,
            "ClientID": clientId,
            "OperatorID": operatorId
        }
    };

    try {
        if (typeof ClientService !== 'undefined') {
            const response = await ClientService.getClientProfileChange(payload.RequestData);

            console.log('Client Profile Change Response:', response);

            if (response && (response.success || response.code === '00')) {
                // The actual user data seems to be in Details01 based on the log
                let data = response.data || response.Details;

                // If the top level is array [ { Details01: [...] } ]
                if (Array.isArray(data) && data[0] && data[0].Details01) {
                    data = data[0].Details01;
                }

                // If it's still an array, take the first item
                if (Array.isArray(data)) {
                    data = data[0];
                }

                if (data) {
                    mapDataToFields(data.Details01[0]);
                } else {
                    console.warn('Client Profile Change: No data returned from API.', response);
                }
            } else {
                console.error('API Error:', response?.message);
            }
        } else {
            console.error('ClientService is not defined.');
        }
    } catch (error) {
        console.error('Error fetching client data', error);
    }
}

function mapDataToFields(data) {
    if (!data) return;

    console.log("Mapping Data:", data);

    // Field Mapping
    // Use 'Name' from API or fall back to constructing it
    setVal('clientName', data.Name || data.ClientName || (data.FirstName + ' ' + data.LastName));

    // Dropdowns Mapping

    // Title Mapping
    const titleMap = {
        'MR': 'Mr.', 'MRS': 'Mrs.', 'MS': 'Ms.', 'DR': 'Dr.',
        'PROF': 'Prof.', 'REV': 'Rev.', 'HON': 'Hon.'
    };
    const titleKey = (data.TitleID || data.Title || '').toUpperCase().replace('.', '');
    setVal('title', titleMap[titleKey] || data.Title);

    setVal('firstName', data.FirstName);
    setVal('middleName', data.MiddleName);
    setVal('lastName', data.LastName);

    // Gender Mapping
    const genderMap = {
        'M': 'Male', 'F': 'Female', 'O': 'Other'
    };
    const genderKey = (data.GenderID || data.Gender || '').toUpperCase();
    setVal('gender', genderMap[genderKey] || data.Gender);

    // Client Type Mapping
    const clientTypeMap = {
        'I': 'Individual Client', 'C': 'Corporate Client'
    };
    const typeKey = (data.ClientTypeID || data.ClientType || '').toUpperCase();
    setVal('clientType', clientTypeMap[typeKey] || data.ClientType);

    if (data.DateOfBirth) {
        // Handle "2000-01-01T00:00:00" format and format to "29-Jan-2025, 12:21 PM"
        setVal('dob', formatDateTime(data.DateOfBirth));

        // Use API provided age or calculate
        if (data.Age) {
            setVal('age', data.Age);
        } else {
            // For calculation, we need the standard date object or ISO string
            calculateAge(data.DateOfBirth.split('T')[0]);
        }
    }

    // Audit Fields
    setText('createdBy', data.CreatedBy);
    // Format date if present
    setText('createdOn', formatDate(data.CreatedOn));
    setText('modifiedBy', data.ModifiedBy);
    setText('modifiedOn', formatDate(data.ModifiedOn));
    setText('supervisedBy', data.SupervisedBy);
    setText('supervisedOn', formatDate(data.SupervisedOn));

    // Initial State: Locked
    toggleFormState(false);
}

function formatDateTime(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;

        const day = String(date.getDate()).padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[date.getMonth()];
        const year = date.getFullYear();

        let hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'

        return `${day}-${month}-${year}, ${hours}:${minutes} ${ampm}`;
    } catch {
        return dateString;
    }
}

function formatDate(dateString) {
    if (!dateString) return '-';
    // Simple verification content is a date
    if (dateString.startsWith('1900') || dateString.startsWith('0001')) return '-';
    try {
        return new Date(dateString).toLocaleString();
    } catch {
        return dateString;
    }
}

function handleEditAction() {
    toggleFormState(true); // Unlock inputs

    // Toggle Button States
    const saveBtn = document.querySelector('.action-save');
    const cancelBtn = document.querySelector('.action-cancel');
    const editBtn = document.querySelector('.action-edit');

    if (saveBtn) {
        saveBtn.disabled = false;
        // saveBtn.classList.remove('de-btn--disabled'); // If using specific class, but attribute handles opacity
    }
    if (cancelBtn) {
        cancelBtn.disabled = false;
    }
    if (editBtn) {
        editBtn.disabled = true;
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
        alert('Error: Client ID context missing. Cannot save.');
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
        return;
    }

    // 2. Gather Data from Form
    const getVal = (id) => document.getElementById(id)?.value || '';

    // Reverse Mapping for Dropdowns (Value -> Key)
    const reverseTitleMap = {
        'Mr.': 'MR', 'Mrs.': 'MRS', 'Ms.': 'MS', 'Dr.': 'DR',
        'Prof.': 'PROF', 'Rev.': 'REV', 'Hon.': 'HON'
    };
    const titleVal = getVal('title');
    const titleID = reverseTitleMap[titleVal] || titleVal; // Fallback to sending raw if no map

    const reverseGenderMap = {
        'Male': 'M', 'Female': 'F', 'Other': 'O'
    };
    const genderVal = getVal('gender');
    const genderID = reverseGenderMap[genderVal] || genderVal;

    const reverseClientTypeMap = {
        'Individual Client': 'I', 'Corporate Client': 'C'
    };
    const clientTypeVal = getVal('clientType');
    const clientTypeID = reverseClientTypeMap[clientTypeVal] || 'I'; // Default to Individual

    // Parse specific fields
    const dobDisplay = getVal('dob');
    // The input is text, so we rely on the backend possibly handling string, or we convert?
    // User requested spec says DateOfBirth: "smalldatetime". 
    // Usually APIs want ISO YYYY-MM-DD or MM/DD/YYYY.
    // Let's try to parse the custom format back to a standard string if possible, or send as is if backend handles it.
    // Given the previous formatDateTime logic: "29-Jan-2025, 12:21 PM"
    let dobPayload = dobDisplay;
    try {
        if (dobDisplay && dobDisplay.includes(',')) {
            dobPayload = new Date(dobDisplay).toISOString();
        }
    } catch (e) {
        // keep original if parse fails
    }


    const payloadDetails = {
        "OurBranchID": branchId,
        "ClientID": clientId,
        "ClientTypeID": clientTypeID, // SystemSubID
        "Name": getVal('clientName'),
        "TitleID": titleID, // UserSubID
        "FirstName": getVal('firstName'),
        "LastName": getVal('lastName'),
        "MiddleName": getVal('middleName'),
        "GenderID": genderID, // SystemSubID
        "IsDOBGiven": dobPayload ? 1 : 0, // bit
        "DateOfBirth": dobPayload || null, // smalldatetime

        "Age": parseInt(getVal('age')) || 0, // tinyint
        "AgeAsOn": getVal('ageAsOn') || new Date().toISOString(), // smalldatetime

        "DocReceived": getVal('documentsReceived'),
        "ReceivedOn": getVal('receivedOn') || new Date().toISOString(), // smalldatetime
        "ChangedReasonID": getVal('changedReason'), // UserSubID. Note: might need mapping if dropdown has text
        "Remarks": getVal('remarks'),

        "CreatedBy": operatorId,
        "CreatedOn": new Date().toISOString(),
        "SupervisedBy": null, // As per UI

        // Defaults/Placeholders as per request spec
        "RegionID": "",
        "SubCityID": "",
        "Wereda": "",
        "Email": "",
        "Address1": "",
        "Phone1": "",
        "ID1": ""
    };

    const payload = {
        "RequestData": payloadDetails
    };

    console.log('Sending Save Request:', payload);

    try {
        if (typeof ClientService === 'undefined') {
            throw new Error("ClientService not available");
        }

        const response = await ClientService.updateClientProfileChange(payload.RequestData);
        console.log('Save Response:', response);

        if (response && (response.success || response.code === '00')) {
            // Success
            if (typeof Toast !== 'undefined') {
                Toast.success('Client profile updated successfully.');
            } else {
                alert('Client profile updated successfully.');
            }

            // Re-fetch to show latest data and lock form
            fetchClientData();

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
        console.error('Error saving client data', error);
        if (typeof Toast !== 'undefined') {
            Toast.error('An error occurred while saving.');
        } else {
            alert('An error occurred while saving.');
        }
    } finally {
        saveBtn.disabled = false; // Will be handled by fetchClientData locking invalid state, but safety first
        saveBtn.innerHTML = originalText;
    }
}

function handleCancelAction() {
    toggleFormState(false); // Lock inputs

    // Toggle Button States
    const saveBtn = document.querySelector('.action-save');
    const cancelBtn = document.querySelector('.action-cancel');
    const editBtn = document.querySelector('.action-edit');

    if (saveBtn) saveBtn.disabled = true;
    if (cancelBtn) cancelBtn.disabled = true;
    if (editBtn) editBtn.disabled = false;

    // Reset fields to original data? 
    fetchClientData(); // Simplest way to reset is re-fetch
}

function toggleFormState(enabled) {
    const inputs = document.querySelectorAll('.de-form-shell input, .de-form-shell select, .de-form-shell textarea');
    inputs.forEach(input => {
        // Skip explicitly readonly fields like ClientName which might be computed
        if (input.readOnly && !enabled) return;

        // Specific fields to keep readonly even in edit mode?
        // e.g. Age is usually calculated.
        if (input.id === 'age') return;

        input.disabled = !enabled;
    });
}


// --- Helper Utilities --- 

function setVal(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value || '';
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text || '-';
}

function calculateAge(dobStr) {
    if (!dobStr) return;
    const dob = new Date(dobStr);
    const diff_ms = Date.now() - dob.getTime();
    const age_dt = new Date(diff_ms);
    const age = Math.abs(age_dt.getUTCFullYear() - 1970);
    setVal('age', age);
}
