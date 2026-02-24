/**
 * GL-Cancel Stop Payment Module
 * Handles cancellation of stop payment requests for GL Branch Details
 */

(function () {
    'use strict';

    // DOM Elements
    let elements = {};

    // State Management
    const state = {
        currentRecord: null,
        isEditMode: false,
        cancelStopPaymentData: [],
        branches: [
            { id: '0101', name: 'Head Office' },
            { id: '0102', name: 'Branch 1' },
            { id: '0103', name: 'Branch 2' }
        ],
        reasons: [
            { id: 'R001', name: 'Customer Request' },
            { id: 'R002', name: 'Duplicate Entry' },
            { id: 'R003', name: 'Error Correction' },
            { id: 'R004', name: 'Authorization Reversal' },
            { id: 'R005', name: 'Other' }
        ]
    };

    /**
     * Initialize the module
     */
    function init() {
        cacheElements();
        bindEvents();
        populateDropdowns();
        renderGrid();
    }

    /**
     * Cache DOM elements for better performance
     */
    function cacheElements() {
        elements = {
            // Form Fields
            branchId: document.getElementById('branchId'),
            accountId: document.getElementById('accountId'),
            requestRefNo: document.getElementById('requestRefNo'),
            chequeNoStart: document.getElementById('chequeNoStart'),
            chequeNoEnd: document.getElementById('chequeNoEnd'),
            chequeDate: document.getElementById('chequeDate'),
            chequeAmount: document.getElementById('chequeAmount'),
            reasonId: document.getElementById('reasonId'),
            reason: document.getElementById('reason'),
            cancellationDate: document.getElementById('cancellationDate'),
            instructionGivenBy: document.getElementById('instructionGivenBy'),
            currencyId: document.getElementById('currencyId'),

            // Search Buttons
            branchSearch: document.getElementById('branchSearch'),
            accountSearch: document.getElementById('accountSearch'),
            requestRefSearch: document.getElementById('requestRefSearch'),

            // Grid
            gridBody: document.getElementById('cancelStopPaymentGridBody'),

            // Action Buttons
            btnView: document.getElementById('btnView'),
            btnAdd: document.getElementById('btnAdd'),
            btnEdit: document.getElementById('btnEdit'),
            btnDelete: document.getElementById('btnDelete')
        };
    }

    /**
     * Bind event listeners
     */
    function bindEvents() {
        // Search Buttons
        elements.branchSearch.addEventListener('click', handleBranchSearch);
        elements.accountSearch.addEventListener('click', handleAccountSearch);
        elements.requestRefSearch.addEventListener('click', handleRequestRefSearch);

        // Dropdown Changes
        elements.reasonId.addEventListener('change', handleReasonChange);

        // Action Buttons
        elements.btnView.addEventListener('click', handleView);
        elements.btnAdd.addEventListener('click', handleAdd);
        elements.btnEdit.addEventListener('click', handleEdit);
        elements.btnDelete.addEventListener('click', handleDelete);

        // Input Validation
        elements.chequeNoStart.addEventListener('input', validateNumericInput);
        elements.chequeNoEnd.addEventListener('input', validateNumericInput);
        elements.chequeAmount.addEventListener('input', validateNumericInput);

        // Grid Row Selection
        elements.gridBody.addEventListener('click', handleGridRowClick);
    }

    /**
     * Populate dropdown options
     */
    function populateDropdowns() {
        // Populate Reason ID dropdown
        elements.reasonId.innerHTML = '<option value="">--Select--</option>';
        state.reasons.forEach(reason => {
            const option = document.createElement('option');
            option.value = reason.id;
            option.textContent = reason.id;
            elements.reasonId.appendChild(option);
        });

        // Populate Cheque Date dropdown (example dates)
        elements.chequeDate.innerHTML = '<option value="">--Select--</option>';
        const today = new Date();
        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const option = document.createElement('option');
            option.value = dateStr;
            option.textContent = dateStr;
            elements.chequeDate.appendChild(option);
        }
    }

    /**
     * Handle branch search
     */
    function handleBranchSearch() {
        const branchId = prompt('Enter Branch ID:');
        if (branchId) {
            const branch = state.branches.find(b => b.id === branchId);
            if (branch) {
                elements.branchId.value = branch.id;
                document.querySelector('.branch-name').textContent = branch.name;
            } else {
                alert('Branch not found');
            }
        }
    }

    /**
     * Handle account search
     */
    function handleAccountSearch() {
        const accountId = prompt('Enter Account ID:');
        if (accountId) {
            elements.accountId.value = accountId;
            // Simulate loading account data
            loadAccountData(accountId);
        }
    }

    /**
     * Handle request reference search
     */
    function handleRequestRefSearch() {
        const refNo = prompt('Enter Request Reference Number:');
        if (refNo) {
            elements.requestRefNo.value = refNo;
            // Simulate loading request data
            loadRequestData(refNo);
        }
    }

    /**
     * Load account data (simulated)
     */
    function loadAccountData(accountId) {
        console.log('Loading account data for:', accountId);
        // Simulate API call
        // This would typically fetch account details from the server
    }

    /**
     * Load request data (simulated)
     */
    function loadRequestData(refNo) {
        console.log('Loading request data for:', refNo);
        // Simulate API call
        // This would typically fetch request details from the server
    }

    /**
     * Handle reason change
     */
    function handleReasonChange() {
        const reasonId = elements.reasonId.value;
        if (reasonId) {
            const reason = state.reasons.find(r => r.id === reasonId);
            if (reason) {
                elements.reason.value = reason.name;
            }
        } else {
            elements.reason.value = '';
        }
    }

    /**
     * Validate numeric input
     */
    function validateNumericInput(e) {
        const value = e.target.value;
        e.target.value = value.replace(/[^0-9.]/g, '');
    }

    /**
     * Handle View button click
     */
    function handleView() {
        if (state.currentRecord) {
            alert('Viewing record:\n' + JSON.stringify(state.currentRecord, null, 2));
        } else {
            alert('Please select a record from the grid to view.');
        }
    }

    /**
     * Handle Add button click
     */
    function handleAdd() {
        if (!validateForm()) {
            return;
        }

        const newRecord = {
            prefix: '',
            start: elements.chequeNoStart.value,
            end: elements.chequeNoEnd.value,
            chequeDate: elements.chequeDate.value,
            reason: elements.reason.value,
            cancelDate: elements.cancellationDate.value,
            amount: elements.chequeAmount.value,
            instructionGivenBy: elements.instructionGivenBy.value
        };

        if (state.isEditMode && state.currentRecord) {
            // Update existing record
            const index = state.cancelStopPaymentData.indexOf(state.currentRecord);
            if (index > -1) {
                state.cancelStopPaymentData[index] = newRecord;
                renderGrid();
                clearForm();
                alert('Record updated successfully!');
            }
        } else {
            // Add new record
            state.cancelStopPaymentData.push(newRecord);
            renderGrid();
            clearForm();
            alert('Record added successfully!');
        }
    }

    /**
     * Handle Edit button click
     */
    function handleEdit() {
        if (!state.currentRecord) {
            alert('Please select a record from the grid to edit.');
            return;
        }

        state.isEditMode = true;
        populateFormWithRecord(state.currentRecord);
        alert('Record loaded for editing. Modify the fields and click Add to save changes.');
    }

    /**
     * Handle Delete button click
     */
    function handleDelete() {
        if (!state.currentRecord) {
            alert('Please select a record from the grid to delete.');
            return;
        }

        if (confirm('Are you sure you want to delete this record?')) {
            const index = state.cancelStopPaymentData.indexOf(state.currentRecord);
            if (index > -1) {
                state.cancelStopPaymentData.splice(index, 1);
                renderGrid();
                clearForm();
                alert('Record deleted successfully!');
            }
        }
    }

    /**
     * Validate form fields
     */
    function validateForm() {
        const requiredFields = [
            { field: elements.chequeNoStart, name: 'Cheque No Start' },
            { field: elements.cancellationDate, name: 'Cancellation Date' }
        ];

        for (const item of requiredFields) {
            if (!item.field.value.trim()) {
                alert(`Please enter ${item.name}`);
                item.field.focus();
                return false;
            }
        }

        return true;
    }

    /**
     * Populate form with selected record
     */
    function populateFormWithRecord(record) {
        elements.chequeNoStart.value = record.start;
        elements.chequeNoEnd.value = record.end;
        elements.chequeDate.value = record.chequeDate;
        elements.reason.value = record.reason;
        elements.cancellationDate.value = record.cancelDate;
        elements.chequeAmount.value = record.amount;
        elements.instructionGivenBy.value = record.instructionGivenBy;
    }

    /**
     * Clear form fields
     */
    function clearForm() {
        elements.chequeNoStart.value = '';
        elements.chequeNoEnd.value = '';
        elements.chequeDate.value = '';
        elements.chequeAmount.value = '';
        elements.reasonId.value = '';
        elements.reason.value = '';
        elements.cancellationDate.value = '';
        elements.instructionGivenBy.value = '';
        state.isEditMode = false;
        state.currentRecord = null;
    }

    /**
     * Render data grid
     */
    function renderGrid() {
        if (state.cancelStopPaymentData.length === 0) {
            elements.gridBody.innerHTML = `
                <tr class="no-records">
                    <td colspan="8">No records to display.</td>
                </tr>
            `;
            return;
        }

        let html = '';
        state.cancelStopPaymentData.forEach((record, index) => {
            html += `
                <tr data-index="${index}">
                    <td>${record.prefix || ''}</td>
                    <td>${record.start || ''}</td>
                    <td>${record.end || ''}</td>
                    <td>${record.chequeDate || ''}</td>
                    <td>${record.reason || ''}</td>
                    <td>${record.cancelDate || ''}</td>
                    <td>${record.amount || ''}</td>
                    <td>${record.instructionGivenBy || ''}</td>
                </tr>
            `;
        });

        elements.gridBody.innerHTML = html;
    }

    /**
     * Handle grid row click
     */
    function handleGridRowClick(e) {
        const row = e.target.closest('tr[data-index]');
        if (!row) return;

        // Remove previous selection
        document.querySelectorAll('.data-grid tbody tr').forEach(r => {
            r.classList.remove('selected');
        });

        // Add selection to clicked row
        row.classList.add('selected');

        // Store selected record
        const index = parseInt(row.dataset.index);
        state.currentRecord = state.cancelStopPaymentData[index];
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
