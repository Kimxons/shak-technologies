/**
 * Client Identity Types Management
 * Handles fetching and managing client identity documents
 */

document.addEventListener('DOMContentLoaded', () => {
    initializeIdentityTypes();
});

function initializeIdentityTypes() {
    console.log("Client Identity Types Initialized");

    // Close Button Handling
    const closeBtn = document.querySelector('.action-back');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (window.parent) {
                window.parent.postMessage({ type: 'CLOSE_DATAENTRY' }, '*');
            }
        });
    }

    // Initial fetch
    fetchIdentityTypes();
}

async function fetchIdentityTypes() {
    console.log("Fetching Identity Types...");

    // Determine Context
    let clientId = '';
    let operatorId = 'ADMIN';

    // 1. Try to get from URL params
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('clientId')) clientId = urlParams.get('clientId');

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
        console.warn('Identity Types: No ClientID found.');
        renderGrid([]); // Render empty state
        return;
    }

    // Construct Payload
    // dbo.p_GetClientIdentityType
    const payload = {
        "RequestData": {
            "ClientID": clientId,
            "OperatorID": operatorId,
            "IdentityTypeID": "ALL" // Fetching all by default, or empty string
        }
    };

    try {
        if (typeof ClientService !== 'undefined') {
            const response = await ClientService.getClientIdentityTypes(payload.RequestData);
            console.log('Identity Types Response:', response);

            if (response && (response.success || response.code === '00')) {
                let data = response.data || response.Details;

                // Handle nested arrays commonly returned by this API structure
                if (data && data.Details01) {
                    data = data.Details01;
                } else if (Array.isArray(data) && data.length > 0 && data[0].Details01) {
                    data = data[0].Details01;
                }

                // If it's a single object, wrap it
                if (data && !Array.isArray(data)) {
                    data = [data];
                }

                renderGrid(data || []);
            } else {
                console.error('API Error:', response?.message);
                renderGrid([]);
            }
        } else {
            console.error('ClientService is not defined.');
        }
    } catch (error) {
        console.error('Error fetching identity types', error);
        renderGrid([]);
    }
}

function renderGrid(data) {
    const tbody = document.getElementById('identityGridBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" style="padding: 24px; text-align: center; color: #9ca3af;">No records to display.</td>
            </tr>
        `;
        return;
    }

    data.forEach(item => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #f1f5f9';

        // Identification Type - displaying Description as it is more readable
        const tdType = document.createElement('td');
        tdType.style.padding = '8px 12px';
        tdType.textContent = item.Description || item.IdentityTypeID || '-';

        // Identification No
        const tdNo = document.createElement('td');
        tdNo.style.padding = '8px 12px';
        tdNo.textContent = item.IdentificationNo || item.IdentityNo || '-';

        // Format
        const tdFormat = document.createElement('td');
        tdFormat.style.padding = '8px 12px';
        tdFormat.textContent = item.Format || item.IDFormat || '-';

        tr.appendChild(tdType);
        tr.appendChild(tdNo);
        tr.appendChild(tdFormat);

        // Selection Logic
        tr.addEventListener('click', () => {
            // Highlight row
            Array.from(tbody.children).forEach(row => row.style.background = 'transparent');
            tr.style.background = '#e0e7ff';

            // Populate Form Fields
            populateForm(item);
        });

        tbody.appendChild(tr);
    });
}

function populateForm(data) {
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    };

    setVal('identificationType', data.IdentityTypeID || data.Description); // Value usually ID, but using fallback
    setVal('identificationNumber', data.IdentificationNo);
    setVal('identificationFormat', data.Format);

    // Fields not in provided sample, keeping generic accessors or empty defaults
    setVal('identificationSerialNo', data.SerialNo);
    setVal('placeOfIssue', data.PlaceOfIssue);
    setVal('issueDate', formatDateForInput(data.IssueDate));
    setVal('location', data.Location);
    // setVal('documentImage', ...);

    // Audit Fields
    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text || '-';
    };

    setText('CreatedBy', data.CreatedBy);
    setText('CreatedOn', formatDate(data.CreatedOn));
    setText('ModifiedBy', data.ModifiedBy);
    setText('ModifiedOn', formatDate(data.ModifiedOn));
    setText('SupervisedBy', data.SupervisedBy);
    setText('SupervisedOn', formatDate(data.SupervisedOn));
}


// --- Helpers ---

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
