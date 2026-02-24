/**
 * GL-Stop Payment/Void Module
 * Handles stop payment and void operations for GL Branch Details
 */

(function () {
    'use strict';

    // DOM Elements
    let elements = {};

    // State Management
    const state = {
        currentRecord: null,
        isEditMode: false,
        stopPaymentData: [],
        branches: [
            { id: '0101', name: 'Head Office' },
            { id: '0102', name: 'Branch 1' },
            { id: '0103', name: 'Branch 2' }
        ],
        reasons: [
            { id: 'R001', name: 'Lost Cheque' },
            { id: 'R002', name: 'Stolen Cheque' },
            { id: 'R003', name: 'Damaged Cheque' },
            { id: 'R004', name: 'Cancelled Transaction' },
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
            branchName: document.getElementById('branchName'),
            accountId: document.getElementById('accountId'),
            accountDescription: document.getElementById('accountDescription'),
            requestRefNo: document.getElementById('requestRefNo'),
            paymentType: document.getElementById('paymentType'),
            chequeStart: document.getElementById('chequeStart'),
            chequeEnd: document.getElementById('chequeEnd'),
            chequeDate: document.getElementById('chequeDate'),
            chequeAmount: document.getElementById('chequeAmount'),
            reasonId: document.getElementById('reasonId'),
            reason: document.getElementById('reason'),
            stopPaymentDate: document.getElementById('stopPaymentDate'),
            instructionGivenBy: document.getElementById('instructionGivenBy'),

            // Search Buttons
            branchSearch: document.getElementById('branchSearch'),
            accountSearch: document.getElementById('accountSearch'),
            requestRefSearch: document.getElementById('requestRefSearch'),

            // Grid
            gridBody: document.getElementById('stopPaymentGridBody'),

            // Action Buttons
            btnView: document.getElementById('btnView'),
            btnAdd: document.getElementById('btnAdd'),
            btnEdit: document.getElementById('btnEdit'),
            btnDelete: document.getElementById('btnDelete'),
            btnSave: document.getElementById('btnSave')
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
        elements.paymentType.addEventListener('change', handlePaymentTypeChange);
        elements.reasonId.addEventListener('change', handleReasonChange);

        // Action Buttons
        elements.btnView.addEventListener('click', handleView);
        elements.btnAdd.addEventListener('click', handleAdd);
        elements.btnEdit.addEventListener('click', handleEdit);
        elements.btnDelete.addEventListener('click', handleDelete);
        elements.btnSave.addEventListener('click', handleSave);

        // Input Validation
        elements.chequeStart.addEventListener('input', validateNumericInput);
        elements.chequeEnd.addEventListener('input', validateNumericInput);
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
     * Handle branch search - Show branch search modal
     */
    async function handleBranchSearch() {
        await showBranchSearchModal();
    }

    /**
     * Handle account search - Show account search modal
     */
    async function handleAccountSearch() {
        await showAccountSearchModal();
    }

    /**
     * Handle request reference search - Show request reference search modal
     */
    async function handleRequestRefSearch() {
        await showRequestRefSearchModal();
    }

    /**
     * Show Branch Search Modal
     */
    async function showBranchSearchModal() {
        // Remove existing modal if present
        const existingModal = document.getElementById('branchSearchModal');
        if (existingModal) existingModal.remove();
        
        // Create modal overlay
        const modal = document.createElement('div');
        modal.id = 'branchSearchModal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';
        
        // Create modal content
        const content = document.createElement('div');
        content.style.cssText = 'background: white; border-radius: 8px; width: 600px; max-height: 80vh; display: flex; flex-direction: column; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
        
        // Modal header
        const header = document.createElement('div');
        header.style.cssText = 'background: #517a8e; color: white; padding: 12px 20px; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: center;';
        
        const headerTitle = document.createElement('h3');
        headerTitle.textContent = 'Branch Search';
        headerTitle.style.cssText = 'margin: 0; font-size: 15px; font-weight: 600;';
        
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = 'background: rgba(255,255,255,0.1); border: none; color: white; width: 32px; height: 32px; border-radius: 4px; cursor: pointer; font-size: 24px;';
        closeBtn.onclick = () => modal.remove();
        
        header.appendChild(headerTitle);
        header.appendChild(closeBtn);
        content.appendChild(header);
        
        // Modal body
        const body = document.createElement('div');
        body.style.cssText = 'padding: 24px; overflow-y: auto; flex: 1;';
        
        // Search inputs
        const searchRow = document.createElement('div');
        searchRow.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;';
        
        const idGroup = document.createElement('div');
        idGroup.innerHTML = `
            <label style="display: block; margin-bottom: 6px; font-weight: 500; font-size: 13px;">Branch ID</label>
            <input type="text" id="branchSearchId" class="form-control" placeholder="Enter Branch ID">
        `;
        
        const nameGroup = document.createElement('div');
        nameGroup.innerHTML = `
            <label style="display: block; margin-bottom: 6px; font-weight: 500; font-size: 13px;">Branch Name</label>
            <input type="text" id="branchSearchName" class="form-control" placeholder="Enter Branch Name">
        `;
        
        searchRow.appendChild(idGroup);
        searchRow.appendChild(nameGroup);
        body.appendChild(searchRow);
        
        // Search button
        const searchBtn = document.createElement('button');
        searchBtn.textContent = 'Search';
        searchBtn.className = 'btn btn-primary';
        searchBtn.style.cssText = 'margin-bottom: 16px;';
        searchBtn.onclick = performBranchSearch;
        body.appendChild(searchBtn);
        
        // Results table
        const tableContainer = document.createElement('div');
        tableContainer.style.cssText = 'max-height: 300px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px;';
        tableContainer.innerHTML = `
            <table class="table table-hover table-sm" style="margin: 0;">
                <thead style="position: sticky; top: 0; background: #f8f9fa; z-index: 1;">
                    <tr>
                        <th>Branch ID</th>
                        <th>Branch Name</th>
                    </tr>
                </thead>
                <tbody id="branchSearchResults">
                    <tr><td colspan="2" style="text-align: center; padding: 20px; color: #999;">Enter search criteria and click Search</td></tr>
                </tbody>
            </table>
        `;
        body.appendChild(tableContainer);
        
        content.appendChild(body);
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        // Load initial branches
        performBranchSearch();
    }

    /**
     * Perform branch search
     */
    async function performBranchSearch() {
        const resultsBody = document.getElementById('branchSearchResults');
        const searchId = document.getElementById('branchSearchId')?.value || '';
        const searchName = document.getElementById('branchSearchName')?.value || '';
        
        resultsBody.innerHTML = '<tr><td colspan="2" style="text-align: center; padding: 20px;"><i class="bi bi-hourglass-split"></i> Searching...</td></tr>';
        
        try {
            const LookupService = window.LookupService || window.parent.LookupService;
            if (!LookupService) {
                throw new Error('LookupService not available');
            }
            
            const response = await LookupService.getBranches({});
            
            if (response.success && response.data) {
                let branches = response.data.Details || response.data || [];
                
                // Filter based on search criteria
                if (searchId || searchName) {
                    branches = branches.filter(b => {
                        const matchId = !searchId || (b.OurBranchID && b.OurBranchID.toLowerCase().includes(searchId.toLowerCase()));
                        const matchName = !searchName || (b.BranchName && b.BranchName.toLowerCase().includes(searchName.toLowerCase()));
                        return matchId && matchName;
                    });
                }
                
                if (branches.length === 0) {
                    resultsBody.innerHTML = '<tr><td colspan="2" style="text-align: center; padding: 20px; color: #999;">No branches found</td></tr>';
                    return;
                }
                
                resultsBody.innerHTML = branches.map(branch => `
                    <tr style="cursor: pointer;" onclick="document.getElementById('branchId').value='${branch.OurBranchID || ''}'; document.getElementById('branchName').value='${(branch.BranchName || '').replace(/'/g, "\\'")}'; document.getElementById('branchSearchModal').remove();">
                        <td>${branch.OurBranchID || ''}</td>
                        <td>${branch.BranchName || ''}</td>
                    </tr>
                `).join('');
            } else {
                resultsBody.innerHTML = '<tr><td colspan="2" style="text-align: center; padding: 20px; color: #dc3545;">Failed to load branches</td></tr>';
            }
        } catch (error) {
            console.error('Branch search error:', error);
            resultsBody.innerHTML = '<tr><td colspan="2" style="text-align: center; padding: 20px; color: #dc3545;">Error loading branches</td></tr>';
        }
    }

    /**
     * Show Account Search Modal
     */
    async function showAccountSearchModal() {
        // Remove existing modal if present
        const existingModal = document.getElementById('accountSearchModal');
        if (existingModal) existingModal.remove();
        
        // Create modal overlay
        const modal = document.createElement('div');
        modal.id = 'accountSearchModal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';
        
        // Create modal content
        const content = document.createElement('div');
        content.style.cssText = 'background: white; border-radius: 8px; width: 800px; max-height: 80vh; display: flex; flex-direction: column; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
        
        // Modal header
        const header = document.createElement('div');
        header.style.cssText = 'background: #517a8e; color: white; padding: 12px 20px; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: center;';
        
        const headerTitle = document.createElement('h3');
        headerTitle.textContent = 'Account Search';
        headerTitle.style.cssText = 'margin: 0; font-size: 15px; font-weight: 600;';
        
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = 'background: rgba(255,255,255,0.1); border: none; color: white; width: 32px; height: 32px; border-radius: 4px; cursor: pointer; font-size: 24px;';
        closeBtn.onclick = () => modal.remove();
        
        header.appendChild(headerTitle);
        header.appendChild(closeBtn);
        content.appendChild(header);
        
        // Modal body
        const body = document.createElement('div');
        body.style.cssText = 'padding: 24px; overflow-y: auto; flex: 1;';
        
        // Search inputs
        const searchRow = document.createElement('div');
        searchRow.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;';
        
        const accountGroup = document.createElement('div');
        accountGroup.innerHTML = `
            <label style="display: block; margin-bottom: 6px; font-weight: 500; font-size: 13px;">Account ID</label>
            <input type="text" id="accountSearchId" class="form-control" placeholder="Enter Account ID">
        `;
        
        const descGroup = document.createElement('div');
        descGroup.innerHTML = `
            <label style="display: block; margin-bottom: 6px; font-weight: 500; font-size: 13px;">Description</label>
            <input type="text" id="accountSearchDesc" class="form-control" placeholder="Enter Description">
        `;
        
        searchRow.appendChild(accountGroup);
        searchRow.appendChild(descGroup);
        body.appendChild(searchRow);
        
        // Search button
        const searchBtn = document.createElement('button');
        searchBtn.textContent = 'Search';
        searchBtn.className = 'btn btn-primary';
        searchBtn.style.cssText = 'margin-bottom: 16px;';
        searchBtn.onclick = performAccountSearch;
        body.appendChild(searchBtn);
        
        // Results table
        const tableContainer = document.createElement('div');
        tableContainer.style.cssText = 'max-height: 300px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px;';
        tableContainer.innerHTML = `
            <table class="table table-hover table-sm" style="margin: 0;">
                <thead style="position: sticky; top: 0; background: #f8f9fa; z-index: 1;">
                    <tr>
                        <th>Account ID</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody id="accountSearchResults">
                    <tr><td colspan="2" style="text-align: center; padding: 20px; color: #999;">Enter search criteria and click Search</td></tr>
                </tbody>
            </table>
        `;
        body.appendChild(tableContainer);
        
        content.appendChild(body);
        modal.appendChild(content);
        document.body.appendChild(modal);
    }

    /**
     * Perform account search
     */
    async function performAccountSearch() {
        const resultsBody = document.getElementById('accountSearchResults');
        const searchId = document.getElementById('accountSearchId')?.value || '';
        const searchDesc = document.getElementById('accountSearchDesc')?.value || '';
        
        if (!searchId && !searchDesc) {
            alert('Please enter at least one search criteria');
            return;
        }
        
        resultsBody.innerHTML = '<tr><td colspan="2" style="text-align: center; padding: 20px;"><i class="bi bi-hourglass-split"></i> Searching...</td></tr>';
        
        try {
            const GeneralLedgerService = window.GeneralLedgerService || window.parent.GeneralLedgerService;
            if (!GeneralLedgerService) {
                throw new Error('GeneralLedgerService not available');
            }
            
            const branchId = elements.branchId.value || '0101';
            const response = await GeneralLedgerService.getGL({
                BankID: '001',
                OurBranchID: branchId,
                AccountID: searchId,
                OperatorID: 'SYSTEM',
                Direction: 'N'
            });
            
            if (response.success && response.data) {
                let accounts = response.data.Details || response.data || [];
                
                // Filter by description if provided
                if (searchDesc) {
                    accounts = accounts.filter(acc => 
                        acc.AccountDescription && acc.AccountDescription.toLowerCase().includes(searchDesc.toLowerCase())
                    );
                }
                
                if (accounts.length === 0) {
                    resultsBody.innerHTML = '<tr><td colspan="2" style="text-align: center; padding: 20px; color: #999;">No accounts found</td></tr>';
                    return;
                }
                
                resultsBody.innerHTML = accounts.map(acc => `
                    <tr style="cursor: pointer;" onclick="document.getElementById('accountId').value='${acc.AccountID || ''}'; document.getElementById('accountDescription').value='${(acc.AccountDescription || '').replace(/'/g, "\\'")}'; document.getElementById('accountSearchModal').remove();">
                        <td>${acc.AccountID || ''}</td>
                        <td>${acc.AccountDescription || ''}</td>
                    </tr>
                `).join('');
            } else {
                resultsBody.innerHTML = '<tr><td colspan="2" style="text-align: center; padding: 20px; color: #dc3545;">Failed to load accounts</td></tr>';
            }
        } catch (error) {
            console.error('Account search error:', error);
            resultsBody.innerHTML = '<tr><td colspan="2" style="text-align: center; padding: 20px; color: #dc3545;">Error loading accounts</td></tr>';
        }
    }

    /**
     * Show Request Reference Search Modal
     */
    async function showRequestRefSearchModal() {
        // Remove existing modal if present
        const existingModal = document.getElementById('requestRefSearchModal');
        if (existingModal) existingModal.remove();
        
        // Create modal overlay
        const modal = document.createElement('div');
        modal.id = 'requestRefSearchModal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';
        
        // Create modal content
        const content = document.createElement('div');
        content.style.cssText = 'background: white; border-radius: 8px; width: 900px; max-height: 80vh; display: flex; flex-direction: column; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
        
        // Modal header
        const header = document.createElement('div');
        header.style.cssText = 'background: #517a8e; color: white; padding: 12px 20px; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: center;';
        
        const headerTitle = document.createElement('h3');
        headerTitle.textContent = 'Cheque Book Request Search';
        headerTitle.style.cssText = 'margin: 0; font-size: 15px; font-weight: 600;';
        
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = 'background: rgba(255,255,255,0.1); border: none; color: white; width: 32px; height: 32px; border-radius: 4px; cursor: pointer; font-size: 24px;';
        closeBtn.onclick = () => modal.remove();
        
        header.appendChild(headerTitle);
        header.appendChild(closeBtn);
        content.appendChild(header);
        
        // Modal body
        const body = document.createElement('div');
        body.style.cssText = 'padding: 24px; overflow-y: auto; flex: 1;';
        
        // Search inputs
        const searchRow = document.createElement('div');
        searchRow.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;';
        
        const refGroup = document.createElement('div');
        refGroup.innerHTML = `
            <label style="display: block; margin-bottom: 6px; font-weight: 500; font-size: 13px;">Request Reference No</label>
            <input type="text" id="requestRefSearchNo" class="form-control" placeholder="Enter Reference Number">
        `;
        
        const accountGroup = document.createElement('div');
        accountGroup.innerHTML = `
            <label style="display: block; margin-bottom: 6px; font-weight: 500; font-size: 13px;">Account ID</label>
            <input type="text" id="requestRefSearchAccount" class="form-control" placeholder="Enter Account ID">
        `;
        
        searchRow.appendChild(refGroup);
        searchRow.appendChild(accountGroup);
        body.appendChild(searchRow);
        
        // Search button
        const searchBtn = document.createElement('button');
        searchBtn.textContent = 'Search';
        searchBtn.className = 'btn btn-primary';
        searchBtn.style.cssText = 'margin-bottom: 16px;';
        searchBtn.onclick = performRequestRefSearch;
        body.appendChild(searchBtn);
        
        // Results table
        const tableContainer = document.createElement('div');
        tableContainer.style.cssText = 'max-height: 300px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px;';
        tableContainer.innerHTML = `
            <table class="table table-hover table-sm" style="margin: 0;">
                <thead style="position: sticky; top: 0; background: #f8f9fa; z-index: 1;">
                    <tr>
                        <th>Request Ref No</th>
                        <th>Account ID</th>
                        <th>Cheque Start</th>
                        <th>Cheque End</th>
                        <th>No of Leaves</th>
                    </tr>
                </thead>
                <tbody id="requestRefSearchResults">
                    <tr><td colspan="5" style="text-align: center; padding: 20px; color: #999;">Enter search criteria and click Search</td></tr>
                </tbody>
            </table>
        `;
        body.appendChild(tableContainer);
        
        content.appendChild(body);
        modal.appendChild(content);
        document.body.appendChild(modal);
    }

    /**
     * Perform request reference search
     */
    async function performRequestRefSearch() {
        const resultsBody = document.getElementById('requestRefSearchResults');
        const searchRefNo = document.getElementById('requestRefSearchNo')?.value || '';
        const searchAccount = document.getElementById('requestRefSearchAccount')?.value || '';
        
        resultsBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;"><i class="bi bi-hourglass-split"></i> Searching...</td></tr>';
        
        try {
            const GeneralLedgerService = window.GeneralLedgerService || window.parent.GeneralLedgerService;
            if (!GeneralLedgerService) {
                throw new Error('GeneralLedgerService not available');
            }
            
            const branchId = elements.branchId.value || '0101';
            const accountId = searchAccount || elements.accountId.value || '';
            
            const response = await GeneralLedgerService.getChequeBooks({
                OurBranchID: branchId,
                AccountTypeID: 'GL',
                AccountID: accountId,
                RequestReferenceNo: searchRefNo,
                OperatorID: 'SYSTEM',
                Direction: 'N'
            });
            
            if (response.success && response.data) {
                let requests = response.data.Details || response.data || [];
                
                if (requests.length === 0) {
                    resultsBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #999;">No cheque book requests found</td></tr>';
                    return;
                }
                
                resultsBody.innerHTML = requests.map(req => `
                    <tr style="cursor: pointer;" onclick="
                        document.getElementById('requestRefNo').value='${req.RequestReferenceNo || req.ChequeRequestsID || ''}';
                        document.getElementById('accountId').value='${req.AccountID || ''}';
                        document.getElementById('chequeStart').value='${req.ChequeStart || ''}';
                        document.getElementById('chequeEnd').value='${req.ChequeEnd || ''}';
                        document.getElementById('requestRefSearchModal').remove();
                    ">
                        <td>${req.RequestReferenceNo || req.ChequeRequestsID || ''}</td>
                        <td>${req.AccountID || ''}</td>
                        <td>${req.ChequeStart || ''}</td>
                        <td>${req.ChequeEnd || ''}</td>
                        <td>${req.NoOfLeaves || ''}</td>
                    </tr>
                `).join('');
            } else {
                resultsBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #dc3545;">Failed to load requests</td></tr>';
            }
        } catch (error) {
            console.error('Request reference search error:', error);
            resultsBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #dc3545;">Error loading requests</td></tr>';
        }
    }

    /**
     * Handle payment type change
     */
    function handlePaymentTypeChange() {
        const paymentType = elements.paymentType.value;
        console.log('Payment type changed to:', paymentType);
        // Adjust form behavior based on payment type
        if (paymentType === 'VOID') {
            // Enable/disable relevant fields for VOID
        } else if (paymentType === 'STOP') {
            // Enable/disable relevant fields for STOP
        }
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
            prefix: elements.paymentType.value,
            start: elements.chequeStart.value,
            end: elements.chequeEnd.value,
            chequeDate: elements.chequeDate.value,
            reason: elements.reason.value,
            stopDate: elements.stopPaymentDate.value,
            amount: elements.chequeAmount.value,
            instructionGivenBy: elements.instructionGivenBy.value
        };

        state.stopPaymentData.push(newRecord);
        renderGrid();
        clearForm();
        alert('Record added successfully!');
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
        alert('Record loaded for editing. Modify the fields and click Save to save changes.');
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
            const index = state.stopPaymentData.indexOf(state.currentRecord);
            if (index > -1) {
                state.stopPaymentData.splice(index, 1);
                renderGrid();
                clearForm();
                alert('Record deleted successfully!');
            }
        }
    }

    /**
     * Handle Save button click
     */
    function handleSave() {
        if (!validateForm()) {
            return;
        }

        if (state.isEditMode && state.currentRecord) {
            // Update existing record
            const index = state.stopPaymentData.indexOf(state.currentRecord);
            if (index > -1) {
                state.stopPaymentData[index] = {
                    prefix: elements.paymentType.value,
                    start: elements.chequeStart.value,
                    end: elements.chequeEnd.value,
                    chequeDate: elements.chequeDate.value,
                    reason: elements.reason.value,
                    stopDate: elements.stopPaymentDate.value,
                    amount: elements.chequeAmount.value,
                    instructionGivenBy: elements.instructionGivenBy.value
                };
                renderGrid();
                clearForm();
                alert('Record updated successfully!');
            }
        } else {
            // Add new record
            const newRecord = {
                prefix: elements.paymentType.value,
                start: elements.chequeStart.value,
                end: elements.chequeEnd.value,
                chequeDate: elements.chequeDate.value,
                reason: elements.reason.value,
                stopDate: elements.stopPaymentDate.value,
                amount: elements.chequeAmount.value,
                instructionGivenBy: elements.instructionGivenBy.value
            };

            state.stopPaymentData.push(newRecord);
            renderGrid();
            clearForm();
            alert('Record saved successfully!');
        }
    }

    /**
     * Validate form fields
     */
    function validateForm() {
        const requiredFields = [
            { field: elements.paymentType, name: 'Payment Type' },
            { field: elements.chequeStart, name: 'Cheque Start' }
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
        elements.paymentType.value = record.prefix;
        elements.chequeStart.value = record.start;
        elements.chequeEnd.value = record.end;
        elements.chequeDate.value = record.chequeDate;
        elements.reason.value = record.reason;
        elements.stopPaymentDate.value = record.stopDate;
        elements.chequeAmount.value = record.amount;
        elements.instructionGivenBy.value = record.instructionGivenBy;
    }

    /**
     * Clear form fields
     */
    function clearForm() {
        elements.paymentType.value = 'VOID';
        elements.chequeStart.value = '';
        elements.chequeEnd.value = '';
        elements.chequeDate.value = '';
        elements.chequeAmount.value = '';
        elements.reasonId.value = '';
        elements.reason.value = '';
        elements.stopPaymentDate.value = '';
        elements.instructionGivenBy.value = '';
        state.isEditMode = false;
        state.currentRecord = null;
    }

    /**
     * Render data grid
     */
    function renderGrid() {
        if (state.stopPaymentData.length === 0) {
            elements.gridBody.innerHTML = `
                <tr class="no-records">
                    <td colspan="8">No records to display.</td>
                </tr>
            `;
            return;
        }

        let html = '';
        state.stopPaymentData.forEach((record, index) => {
            html += `
                <tr data-index="${index}">
                    <td>${record.prefix || ''}</td>
                    <td>${record.start || ''}</td>
                    <td>${record.end || ''}</td>
                    <td>${record.chequeDate || ''}</td>
                    <td>${record.reason || ''}</td>
                    <td>${record.stopDate || ''}</td>
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
        state.currentRecord = state.stopPaymentData[index];
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose function to receive Account ID from parent window
    window.setAccountId = function(accountId, branchId) {
        console.log('setAccountId called with:', accountId, branchId);
        
        if (accountId && elements.accountId) {
            elements.accountId.value = accountId;
            // Disable the account field since it comes from parent
            elements.accountId.readOnly = true;
            console.log('Account ID set to:', accountId);
        }
        if (branchId && elements.branchId) {
            elements.branchId.value = branchId;
            // Disable the branch field since it comes from parent
            elements.branchId.readOnly = true;
            console.log('Branch ID set to:', branchId);
            
            // Update branch name display
            const branch = state.branches.find(b => b.id === branchId);
            if (branch && elements.branchName) {
                elements.branchName.value = branch.name;
            }
        }
    };

})();
