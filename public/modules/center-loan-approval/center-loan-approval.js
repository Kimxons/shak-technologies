// Center Loan Approval - Main JavaScript
(() => {
    const form = document.getElementById('centerLoanApprovalForm');
    const statusBar = document.getElementById('statusMessage');
    const statusIcon = statusBar?.querySelector('.bi');
    const statusText = statusBar?.querySelector('.status-text');
    const statusClose = statusBar?.querySelector('.status-close');

    const actionButtons = {
        approvalHistory: document.querySelector('[data-action="approval-history"]'),
        image: document.querySelector('[data-action="image"]'),
        groupDetail: document.querySelector('[data-action="group-detail"]'),
        view: document.querySelector('[data-action="view"]'),
        edit: document.querySelector('[data-action="edit"]'),
        reject: document.querySelector('[data-action="reject"]'),
        approve: document.querySelector('[data-action="approve"]'),
        cancel: document.querySelector('[data-action="cancel"]'),
        update: document.querySelector('[data-action="update"]'),
        clear: document.querySelector('[data-action="clear"]')
    };

    // Form fields
    const branchId = document.getElementById('branchId');
    const branchDescription = document.getElementById('branchDescription');
    const centerId = document.getElementById('centerId');
    const centerDescription = document.getElementById('centerDescription');
    const schemeId = document.getElementById('schemeId');
    const schemeDescription = document.getElementById('schemeDescription');
    const loanAmount = document.getElementById('loanAmount');
    const repaymentFrequency = document.getElementById('repaymentFrequency');
    const term = document.getElementById('term');
    const interestRate = document.getElementById('interestRate');
    const gracePeriod = document.getElementById('gracePeriod');
    const repaymentTerm = document.getElementById('repaymentTerm');
    const approvedAmount = document.getElementById('approvedAmount');
    const remarks = document.getElementById('remarks');
    const productId = document.getElementById('productId');
    const calculationMethod = document.getElementById('calculationMethod');
    const currencyId = document.getElementById('currencyId');
    const applicationStatus = document.getElementById('applicationStatus');
    const selectAllCheckbox = document.getElementById('selectAll');
    const tableBody = document.querySelector('#applicationDetailsTable tbody');

    const requiredFields = Array.from(form.querySelectorAll('[data-required="true"]'));
    let isEditMode = false;
    let currentRecord = null;
    let statusTimer;

    // Initialize
    function init() {
        initializeEventListeners();
        setFormEnabled(false);
    }

    // Event listeners
    function initializeEventListeners() {
        // Action buttons
        actionButtons.view?.addEventListener('click', () => handleAction('view'));
        actionButtons.edit?.addEventListener('click', () => handleAction('edit'));
        actionButtons.approve?.addEventListener('click', () => handleAction('approve'));
        actionButtons.reject?.addEventListener('click', () => handleAction('reject'));
        actionButtons.cancel?.addEventListener('click', () => handleAction('cancel'));
        actionButtons.approvalHistory?.addEventListener('click', () => handleAction('approval-history'));
        actionButtons.image?.addEventListener('click', () => handleAction('image'));
        actionButtons.groupDetail?.addEventListener('click', () => handleAction('group-detail'));
        actionButtons.update?.addEventListener('click', () => handleAction('update'));
        actionButtons.clear?.addEventListener('click', () => handleAction('clear'));

        // Status close
        statusClose?.addEventListener('click', hideStatus);

        // Search buttons
        document.querySelector('[data-action="search-branch"]')?.addEventListener('click', searchBranch);
        document.querySelector('[data-action="search-center"]')?.addEventListener('click', searchCenter);
        document.querySelector('[data-action="search-scheme"]')?.addEventListener('click', searchScheme);

        // Select all checkbox
        selectAllCheckbox?.addEventListener('change', handleSelectAll);

        // Form validation on input
        requiredFields.forEach(field => {
            field.addEventListener('input', () => {
                field.classList.remove('is-invalid');
            });
        });
    }

    // Handle actions
    function handleAction(action) {
        switch (action) {
            case 'view':
                viewApproval();
                break;
            case 'edit':
                editApproval();
                break;
            case 'approve':
                approveApplication();
                break;
            case 'reject':
                rejectApplication();
                break;
            case 'cancel':
                cancelOperation();
                break;
            case 'approval-history':
                showApprovalHistory();
                break;
            case 'image':
                showImage();
                break;
            case 'group-detail':
                showGroupDetail();
                break;
            case 'update':
                updateRecommendation();
                break;
            case 'clear':
                clearRecommendation();
                break;
        }
    }

    // Status management
    const icons = {
        success: 'bi-check-circle',
        error: 'bi-x-circle',
        warning: 'bi-exclamation-triangle',
        info: 'bi-info-circle'
    };

    function showStatus(message, type = 'info') {
        clearTimeout(statusTimer);

        statusIcon.className = `bi ${icons[type]}`;
        statusText.textContent = message;
        statusBar.className = `status ${type}`;

        if (type !== 'error') {
            statusTimer = setTimeout(hideStatus, 4000);
        }
    }

    function hideStatus() {
        statusBar.classList.add('hidden');
    }

    // Form management
    function setFormEnabled(enabled) {
        const editableFields = form.querySelectorAll('input:not([readonly]), select, textarea');
        editableFields.forEach(field => {
            if (enabled) {
                field.removeAttribute('disabled');
            } else {
                field.setAttribute('disabled', 'disabled');
            }
        });
    }

    function clearForm() {
        centerId.value = '';
        centerDescription.value = '';
        schemeId.value = '';
        schemeDescription.value = '';
        clearRecommendation();
        clearTable();
        productId.value = '';
        calculationMethod.value = '';
        currencyId.value = '';
        applicationStatus.value = '';
    }

    function clearRecommendation() {
        loanAmount.value = '';
        repaymentFrequency.value = '';
        term.value = '';
        interestRate.value = '';
        gracePeriod.value = '';
        repaymentTerm.value = '';
        approvedAmount.value = '';
        remarks.value = '';
    }

    function clearInvalid() {
        requiredFields.forEach(field => field.classList.remove('is-invalid'));
    }

    function validateForm() {
        let isValid = true;
        clearInvalid();

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                field.classList.add('is-invalid');
                isValid = false;
            }
        });

        if (!isValid) {
            showStatus('Please fill in all required fields', 'error');
        }

        return isValid;
    }

    // Table management
    function clearTable() {
        tableBody.innerHTML = '<tr class="empty-row"><td colspan="11">No records to display.</td></tr>';
    }

    function handleSelectAll(e) {
        const checkboxes = tableBody.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = e.target.checked);
    }

    // Action handlers
    function viewApproval() {
        if (!validateForm()) {
            return;
        }

        showStatus('Loading center loan applications...', 'info');
        // In production, fetch from backend
        setTimeout(() => {
            showStatus('Center loan applications loaded', 'success');
            loadSampleData();
        }, 500);
    }

    function editApproval() {
        const selectedRows = tableBody.querySelectorAll('input[type="checkbox"]:checked');
        
        if (selectedRows.length === 0) {
            showStatus('Please select at least one application to edit', 'warning');
            return;
        }

        isEditMode = true;
        setFormEnabled(true);
        showStatus('Edit mode enabled', 'info');
    }

    function approveApplication() {
        const selectedRows = tableBody.querySelectorAll('input[type="checkbox"]:checked');
        
        if (selectedRows.length === 0) {
            showStatus('Please select at least one application to approve', 'warning');
            return;
        }

        if (confirm(`Are you sure you want to approve ${selectedRows.length} application(s)?`)) {
            showStatus(`${selectedRows.length} application(s) approved successfully`, 'success');
            applicationStatus.value = 'Approved';
            setFormEnabled(false);
            isEditMode = false;
        }
    }

    function rejectApplication() {
        const selectedRows = tableBody.querySelectorAll('input[type="checkbox"]:checked');
        
        if (selectedRows.length === 0) {
            showStatus('Please select at least one application to reject', 'warning');
            return;
        }

        const reason = prompt('Enter rejection reason:');
        if (reason) {
            showStatus(`${selectedRows.length} application(s) rejected`, 'success');
            applicationStatus.value = 'Rejected';
            if (remarks.value) {
                remarks.value += '\nRejection Reason: ' + reason;
            } else {
                remarks.value = 'Rejection Reason: ' + reason;
            }
        }
    }

    function cancelOperation() {
        if (isEditMode) {
            if (confirm('Discard changes?')) {
                setFormEnabled(false);
                isEditMode = false;
                if (currentRecord) {
                    loadRecord(currentRecord);
                } else {
                    clearRecommendation();
                }
                showStatus('Changes discarded', 'info');
            }
        } else {
            if (confirm('Clear form?')) {
                clearForm();
                showStatus('Form cleared', 'info');
            }
        }
    }

    function showApprovalHistory() {
        showStatus('Opening approval history...', 'info');
        // In production, open approval history modal
    }

    function showImage() {
        showStatus('Opening image viewer...', 'info');
        // In production, open image viewer modal
    }

    function showGroupDetail() {
        showStatus('Opening group details...', 'info');
        // In production, open group details modal
    }

    function updateRecommendation() {
        if (!loanAmount.value && !approvedAmount.value) {
            showStatus('Please enter loan amount or approved amount', 'warning');
            return;
        }

        showStatus('Recommendation updated successfully', 'success');
    }

    function loadRecord(record) {
        currentRecord = record;
        // Load record data into form
    }

    function loadSampleData() {
        // Sample data for demonstration
        const sampleRows = `
            <tr>
                <td><input type="checkbox"></td>
                <td>CL001</td>
                <td>John Doe</td>
                <td>50,000.00</td>
                <td>45,000.00</td>
                <td>APP001</td>
                <td>2026-01-10</td>
                <td>45,000.00</td>
                <td>12</td>
                <td>Pending</td>
                <td>Business Loan</td>
            </tr>
            <tr>
                <td><input type="checkbox"></td>
                <td>CL002</td>
                <td>Jane Smith</td>
                <td>30,000.00</td>
                <td>30,000.00</td>
                <td>APP002</td>
                <td>2026-01-12</td>
                <td>30,000.00</td>
                <td>6</td>
                <td>Pending</td>
                <td>Personal Loan</td>
            </tr>
        `;
        tableBody.innerHTML = sampleRows;

        // Set sample data in behind the scene fields
        productId.value = 'PROD001';
        calculationMethod.value = 'Flat Rate';
        currencyId.value = 'USD';
        applicationStatus.value = 'Pending Approval';
    }

    // Search functions
    function searchBranch() {
        showStatus('Branch search - connect to backend', 'info');
        // Simulate search result
        branchDescription.value = 'Head Office';
    }

    function searchCenter() {
        showStatus('Center search - connect to backend', 'info');
        // Simulate search result
        centerDescription.value = 'Community Center A';
    }

    function searchScheme() {
        showStatus('Scheme search - connect to backend', 'info');
        // Simulate search result
        schemeDescription.value = 'Microfinance Scheme';
    }

    // Initialize on load
    init();
})();
