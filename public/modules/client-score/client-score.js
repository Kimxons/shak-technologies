/**
 * Client Score Module - JavaScript
 * Social Performance Monitoring Client Score
 * Following Kairo Banking Application Standards
 */

(async function() {
    'use strict';

    // Load services
    const { ServiceLoader } = window;
    
    try {
        console.log('Loading Client Score services...');
        await ServiceLoader.loadCore();
        await ServiceLoader.loadSPMLoanApplicationService();
        console.log('Client Score services loaded successfully');
    } catch (error) {
        console.error('Error loading services:', error);
        alert('Failed to load required services. Please refresh the page.');
        return;
    }

    // Get services
    const SPMLoanApplicationService = window.SPMLoanApplicationService;

    if (!SPMLoanApplicationService) {
        console.error('SPMLoanApplicationService not found');
        alert('SPM Loan Application Service not available. Please refresh the page.');
        return;
    }

    // State Management Variables
    let isEditMode = false;
    let currentRecord = null;
    let activeSection = 'dataentry';
    let questionnaireData = [];

    // DOM Elements
    const elements = {
        // Form Inputs
        applicationId: document.getElementById('applicationId'),
        clientId: document.getElementById('clientId'),
        productId: document.getElementById('productId'),
        workflowId: document.getElementById('workflowId'),
        wfStageId: document.getElementById('wfStageId'),
        questionnaireId: document.getElementById('questionnaireId'),
        remarks: document.getElementById('remarks'),
        
        // Audit Fields
        createdBy: document.getElementById('createdBy'),
        createdOn: document.getElementById('createdOn'),
        modifiedBy: document.getElementById('modifiedBy'),
        modifiedOn: document.getElementById('modifiedOn'),
        supervisedBy: document.getElementById('supervisedBy'),
        supervisedOn: document.getElementById('supervisedOn'),
        
        // Buttons
        viewBtn: document.querySelector('[data-action="view"]'),
        addBtn: document.querySelector('[data-action="add"]'),
        editBtn: document.querySelector('[data-action="edit"]'),
        deleteBtn: document.querySelector('[data-action="delete"]'),
        saveBtn: document.querySelector('[data-action="save"]'),
        cancelBtn: document.querySelector('[data-action="cancel"]'),
        moveNextBtn: document.querySelector('[data-action="move-next"]'),
        
        // Search Buttons
        searchApplicationBtn: document.getElementById('searchApplicationBtn'),
        searchClientBtn: document.getElementById('searchClientBtn'),
        searchProductBtn: document.getElementById('searchProductBtn'),
        searchWorkflowBtn: document.getElementById('searchWorkflowBtn'),
        searchStageBtn: document.getElementById('searchStageBtn'),
        searchQuestionnaireBtn: document.getElementById('searchQuestionnaireBtn'),
        
        // Other Elements
        questionnaireTable: document.getElementById('questionnaireTable'),
        statusMessage: document.getElementById('statusMessage')
    };

    // Initialize Module
    function init() {
        attachEventListeners();
        disableFormFields();
        loadInitialData();
    }

    // Attach Event Listeners
    function attachEventListeners() {
        // Action Buttons
        if (elements.viewBtn) elements.viewBtn.addEventListener('click', handleView);
        if (elements.addBtn) elements.addBtn.addEventListener('click', handleAdd);
        if (elements.editBtn) elements.editBtn.addEventListener('click', handleEdit);
        if (elements.deleteBtn) elements.deleteBtn.addEventListener('click', handleDelete);
        if (elements.saveBtn) elements.saveBtn.addEventListener('click', handleSave);
        if (elements.cancelBtn) elements.cancelBtn.addEventListener('click', handleCancel);
        if (elements.moveNextBtn) elements.moveNextBtn.addEventListener('click', handleMoveNext);
        
        // Search Buttons
        elements.searchApplicationBtn.addEventListener('click', () => searchRecord('application'));
        elements.searchClientBtn.addEventListener('click', () => searchRecord('client'));
        elements.searchProductBtn.addEventListener('click', () => searchRecord('product'));
        elements.searchWorkflowBtn.addEventListener('click', () => searchRecord('workflow'));
        elements.searchStageBtn.addEventListener('click', () => searchRecord('stage'));
        elements.searchQuestionnaireBtn.addEventListener('click', () => searchRecord('questionnaire'));
        
        // Enter Key Navigation
        document.querySelectorAll('.form-input').forEach(input => {
            input.addEventListener('keydown', handleEnterKey);
        });
    }

    // CRUD Operations

    // View Function
    async function handleView() {
        if (!elements.applicationId.value) {
            showStatusMessage('Please enter an Application ID to view.', 'warning');
            elements.applicationId.focus();
            return;
        }
        
        try {
            const requestData = {
                OurBranchID: Environment.OurBranchID || '0603',
                ApplicationID: elements.applicationId.value.trim()
            };

            console.log('Fetching SPM application data with request:', requestData);
            showStatusMessage('Loading application data...', 'info');

            const response = await SPMLoanApplicationService.getSPMWFLoanApplications(requestData);
            console.log('SPM Application response:', response);

            // Extract the actual data from CoreApi normalized response
            const apiData = response.data || response;
            console.log('Extracted API data:', apiData);

            // Check if we have valid data - apiData can be an array directly or have Details property
            let appData = null;
            
            if (Array.isArray(apiData) && apiData.length > 0) {
                appData = apiData[0];
            } else if (apiData && apiData.Details && apiData.Details.length > 0) {
                appData = apiData.Details[0];
            }

            if (appData) {
                loadRecordData(appData);
                disableFormFields();
                updateButtonStates(true, false, false);
                showStatusMessage('Application data loaded successfully', 'success');
            } else {
                showStatusMessage('No application data found', 'info');
            }
        } catch (error) {
            console.error('Error fetching application data:', error);
            showStatusMessage('Error loading application: ' + (error.message || 'Unknown error'), 'error');
        }
    }

    // Add Function
    function handleAdd() {
        clearForm();
        enableFormFields();
        isEditMode = true;
        updateButtonStates(false, false, true);
        elements.applicationId.focus();
        showStatusMessage('Ready to add new client score record.', 'info');
    }

    // Edit Function
    function handleEdit() {
        if (!currentRecord) {
            showStatusMessage('Please view a record first before editing.', 'warning');
            return;
        }
        
        enableFormFields();
        isEditMode = true;
        updateButtonStates(false, false, true);
        showStatusMessage('Edit mode enabled. Modify fields and click Save.', 'info');
    }

    // Save Function
    function handleSave() {
        if (!validateForm()) {
            return;
        }
        
        const formData = collectFormData();
        
        // TODO: Send data to backend
        console.log('Saving client score data:', formData);
        showStatusMessage('Backend connection required to save data.', 'warning');
        
        // Simulate successful save
        updateAuditTrail();
        disableFormFields();
        isEditMode = false;
        updateButtonStates(true, false, false);
        
        // Uncomment when backend is ready
        // showStatusMessage('Client score record saved successfully!', 'success');
    }

    // Delete Function
    function handleDelete() {
        if (!currentRecord) {
            showStatusMessage('Please view a record first before deleting.', 'warning');
            return;
        }
        
        if (!confirm('Are you sure you want to delete this client score record?')) {
            return;
        }
        
        // TODO: Delete from backend
        showStatusMessage('Backend connection required to delete record.', 'warning');
        
        // Simulate deletion
        clearForm();
        currentRecord = null;
        updateButtonStates(false, false, false);
        
        // Uncomment when backend is ready
        // showStatusMessage('Client score record deleted successfully!', 'success');
    }

    // Cancel Function
    function handleCancel() {
        if (isEditMode) {
            if (!confirm('Discard all changes?')) {
                return;
            }
        }
        
        if (currentRecord) {
            loadRecordData();
            disableFormFields();
            updateButtonStates(true, false, false);
        } else {
            clearForm();
            disableFormFields();
            updateButtonStates(false, false, false);
        }
        
        isEditMode = false;
        showStatusMessage('Changes cancelled.', 'info');
    }

    // Move to Next Stage Function
    function handleMoveNext() {
        if (!currentRecord) {
            showStatusMessage('Please view a record first before moving to next stage.', 'warning');
            return;
        }
        
        showStatusMessage('Backend connection required to move to next stage.', 'info');
        // TODO: Implement move to next stage logic
    }

    // Form Management Functions

    // Enable Form Fields
    function enableFormFields() {
        const fields = [
            elements.applicationId,
            elements.clientId,
            elements.productId,
            elements.workflowId,
            elements.wfStageId,
            elements.questionnaireId,
            elements.remarks
        ];
        
        fields.forEach(field => {
            if (field) {
                field.disabled = false;
                field.readOnly = false;
            }
        });
    }

    // Disable Form Fields
    function disableFormFields() {
        const fields = [
            elements.clientId,
            elements.productId,
            elements.workflowId,
            elements.wfStageId,
            elements.questionnaireId,
            elements.remarks
        ];
        
        fields.forEach(field => {
            if (field) {
                field.disabled = true;
                field.readOnly = true;
            }
        });
        
        // Always keep Application ID enabled for searching
        if (elements.applicationId) {
            elements.applicationId.disabled = false;
            elements.applicationId.readOnly = false;
        }
    }

    // Clear Form
    function clearForm() {
        elements.applicationId.value = '';
        elements.clientId.value = '';
        elements.productId.value = '';
        elements.workflowId.value = '';
        elements.wfStageId.value = '';
        elements.questionnaireId.value = '';
        elements.remarks.value = '';
        
        // Clear audit trail
        elements.createdBy.value = '';
        elements.createdOn.value = '';
        elements.modifiedBy.value = '';
        elements.modifiedOn.value = '';
        elements.supervisedBy.value = '';
        elements.supervisedOn.value = '';
        
        // Clear table
        clearQuestionnaireTable();
    }

    // Load Record Data
    function loadRecordData(data) {
        console.log('Populating form with data:', data);
        
        // Store current record
        currentRecord = data;
        
        // Populate form fields from API response
        elements.applicationId.value = data.ApplicationID || '';
        elements.clientId.value = data.ClientID || '';
        elements.productId.value = data.ProductID || '';
        elements.workflowId.value = data.WFAdvTypeID || '';
        elements.wfStageId.value = data.WFAdvStageID || '';
        elements.questionnaireId.value = data.QuestionairreID || '';
        elements.remarks.value = data.Description || '';
        
        // Populate audit trail
        elements.createdBy.value = data.CreatedBy || '';
        elements.createdOn.value = data.CreatedOn ? formatDate(data.CreatedOn) : '';
        elements.modifiedBy.value = data.ModifiedBy || '';
        elements.modifiedOn.value = data.ModifiedOn ? formatDate(data.ModifiedOn) : '';
        elements.supervisedBy.value = '';
        elements.supervisedOn.value = '';
    }

    // Format Date Helper
    function formatDate(dateString) {
        if (!dateString || dateString === '01/01/1900') return '';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }

    // Collect Form Data
    function collectFormData() {
        return {
            applicationId: elements.applicationId.value,
            clientId: elements.clientId.value,
            productId: elements.productId.value,
            workflowId: elements.workflowId.value,
            wfStageId: elements.wfStageId.value,
            questionnaireId: elements.questionnaireId.value,
            remarks: elements.remarks.value,
            questionnaire: questionnaireData
        };
    }

    // Validation
    function validateForm() {
        const requiredFields = [
            { field: elements.applicationId, name: 'Application ID' },
            { field: elements.clientId, name: 'Client ID' },
            { field: elements.productId, name: 'Product ID' }
        ];
        
        for (const item of requiredFields) {
            if (!item.field.value.trim()) {
                showStatusMessage(`${item.name} is required.`, 'error');
                item.field.focus();
git                 item.field.style.borderColor = 'var(--danger)';
                item.field.classList.add('kairo-invalid');
                setTimeout(() => {
                    item.field.style.borderColor = '';
                }, 3000);
                    item.field.classList.remove('kairo-invalid');
                }, 5000);
                return false;
            }
        }
        
        return true;
    }

    // Update Audit Trail
    function updateAuditTrail() {
        const currentUser = 'Admin'; // TODO: Get from session
        const currentDate = new Date().toLocaleDateString();
        
        if (!elements.createdBy.value) {
            elements.createdBy.value = currentUser;
            elements.createdOn.value = currentDate;
        } else {
            elements.modifiedBy.value = currentUser;
            elements.modifiedOn.value = currentDate;
        }
    }

    // Update Button States
    function updateButtonStates(canEdit, canDelete, inEditMode) {
        elements.editBtn.disabled = !canEdit;
        elements.deleteBtn.disabled = !canDelete;
        elements.saveBtn.disabled = !inEditMode;
        elements.cancelBtn.disabled = !inEditMode;
    }

    // Search Record
    function searchRecord(type) {
        showStatusMessage(`Backend connection required to search ${type}.`, 'info');
        // TODO: Implement search modal or dropdown
        console.log(`Searching for ${type}`);
    }

    // Handle Enter Key
    function handleEnterKey(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            const formElements = Array.from(document.querySelectorAll('.form-input, .form-select, .form-textarea'));
            const currentIndex = formElements.indexOf(event.target);
            const nextElement = formElements[currentIndex + 1];
            
            if (nextElement) {
                nextElement.focus();
            }
        }
    }

    // Table Management
    function clearQuestionnaireTable() {
        elements.questionnaireTable.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No records to display.</td></tr>';
        questionnaireData = [];
    }

    function loadQuestionnaireData(data) {
        if (!data || data.length === 0) {
            clearQuestionnaireTable();
            return;
        }
        
        questionnaireData = data;
        let html = '';
        
        data.forEach((item, index) => {
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${item.question}</td>
                    <td>${item.answer}</td>
                    <td>${item.score}</td>
                </tr>
            `;
        });
        
        elements.questionnaireTable.innerHTML = html;
    }

    // Status Message
    function showStatusMessage(message, type = 'info') {
        elements.statusMessage.textContent = message;
        elements.statusMessage.className = `status-message ${type}`;
        elements.statusMessage.style.display = 'block';
        
        // Auto-hide after 5 seconds for info/success messages
        if (type === 'info' || type === 'success') {
            setTimeout(() => {
                elements.statusMessage.style.display = 'none';
            }, 5000);
        }
    }

    // Load Initial Data
    function loadInitialData() {
        // TODO: Load any initial data from backend
        showStatusMessage('Client Score module loaded. Click Add to create new record or View to load existing.', 'info');
    }

    // Initialize on DOM Load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
