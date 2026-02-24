/**
 * GL Parameters Page Logic
 * Handles UI interactions and data flow for GL Parameters module
 */
(async function() {
    'use strict';

    // Load required services
    await ServiceLoader.loadCore();
    await ServiceLoader.loadGeneralLedgerService();
    await ServiceLoader.loadLookupService();
    // Ensure GeneralLedgerService is available before proceeding
    await ServiceLoader.waitForService('GeneralLedgerService');

    // State management
    let currentMode = 'view'; // 'view', 'add', 'edit'
    let currentParameters = null;
    let isAlterModeActive = false;
    let selectedParameterForEdit = null;

    /**
     * Initialize GL Parameters module
     */
    async function init() {
        console.log('🚀 Initializing GL Parameters module');
        
        // Initialize Branch ID from localStorage or use default
        const branchIdInput = document.getElementById('branchId');
        const branchNameInput = document.getElementById('branchName');
        
        if (branchIdInput && !branchIdInput.value) {
            const storedBranchId = localStorage.getItem('BranchID') || '0101';
            branchIdInput.value = storedBranchId;
            console.log('📍 Set Branch ID to:', storedBranchId);
        }
        
        if (branchNameInput && !branchNameInput.value) {
            const storedBranchName = localStorage.getItem('BranchName') || 'Head Office';
            branchNameInput.value = storedBranchName;
            console.log('📍 Set Branch Name to:', storedBranchName);
        }
        
        initializeEventListeners();
        // Don't load data automatically - wait for View button click
        
        console.log('✅ GL Parameters module initialized');
        console.log('✅ Branch ID:', document.getElementById('branchId')?.value);
    }

    /**
     * Initialize event listeners
     */
    function initializeEventListeners() {
        console.log('🔧 Setting up event listeners...');
        
        // Sidebar action panel buttons
        const btnView = document.getElementById('btnView');
        const btnEdit = document.getElementById('btnEdit');
        const btnSave = document.getElementById('btnSave');
        const btnCancel = document.getElementById('btnCancel');
        
        console.log('🔍 btnView found:', !!btnView);
        console.log('🔍 btnEdit found:', !!btnEdit);
        console.log('🔍 btnSave found:', !!btnSave);
        console.log('🔍 btnCancel found:', !!btnCancel);
        
        if (btnView) btnView.addEventListener('click', handleView);
        if (btnEdit) btnEdit.addEventListener('click', handleEdit);
        if (btnSave) btnSave.addEventListener('click', handleSave);
        if (btnCancel) btnCancel.addEventListener('click', handleCancel);

        // Table row selection
        setupTableInteractions();

        // Alter/Update/Clear buttons
        const buttons = document.querySelectorAll('button');
        buttons.forEach(btn => {
            const text = btn.textContent.trim();
            if (text === 'Alter') btn.addEventListener('click', handleAlter);
            if (text === 'Update') btn.addEventListener('click', handleUpdate);
            if (text === 'Clear') btn.addEventListener('click', clearForm);
        });

        // GL ID search button (lookup) - find button next to glAccountId
        const glAccountIdInput = document.getElementById('glAccountId');
        if (glAccountIdInput) {
            const glIdLookupBtn = glAccountIdInput.nextElementSibling;
            if (glIdLookupBtn && glIdLookupBtn.classList.contains('btn-lookup')) {
                glIdLookupBtn.addEventListener('click', handleGLIdSearch);
                console.log('🔍 GL ID lookup button attached');
            }
        }

        // Branch ID search button (lookup) - find button next to branchName
        const branchNameInput = document.getElementById('branchName');
        if (branchNameInput) {
            const branchLookupBtn = branchNameInput.nextElementSibling;
            if (branchLookupBtn && branchLookupBtn.classList.contains('btn-lookup')) {
                branchLookupBtn.addEventListener('click', handleBranchSearch);
                console.log('🔍 Branch lookup button attached');
            }
        }

        /**
         * Handle Branch ID search button click
         */
        async function handleBranchSearch() {
            console.log('🏢 Branch search clicked');
            
            // Remove any existing modal
            const oldModal = document.getElementById('branchSearchModal');
            if (oldModal) oldModal.remove();
            
            // Create modal overlay
            const modal = document.createElement('div');
            modal.id = 'branchSearchModal';
            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100vw';
            modal.style.height = '100vh';
            modal.style.background = 'rgba(0,0,0,0.4)';
            modal.style.zIndex = '9999';
            modal.style.display = 'flex';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            
            // Modal content
            const content = document.createElement('div');
            content.style.background = '#fff';
            content.style.borderRadius = '8px';
            content.style.minWidth = '600px';
            content.style.maxWidth = '90vw';
            content.style.maxHeight = '80vh';
            content.style.overflow = 'hidden';
            content.style.display = 'flex';
            content.style.flexDirection = 'column';
            
            // Modal header
            const header = document.createElement('div');
            header.style.background = '#517a8e';
            header.style.color = 'white';
            header.style.padding = '12px 20px';
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'center';
            header.style.borderRadius = '8px 8px 0 0';
            
            const headerTitle = document.createElement('h3');
            headerTitle.textContent = 'Branch Search';
            headerTitle.style.margin = '0';
            headerTitle.style.fontSize = '15px';
            headerTitle.style.fontWeight = '600';
            
            const headerButtons = document.createElement('div');
            headerButtons.style.display = 'flex';
            headerButtons.style.gap = '8px';
            
            const minimizeBtn = document.createElement('button');
            minimizeBtn.innerHTML = '−';
            minimizeBtn.style.background = 'rgba(255,255,255,0.1)';
            minimizeBtn.style.border = 'none';
            minimizeBtn.style.color = 'white';
            minimizeBtn.style.width = '32px';
            minimizeBtn.style.height = '32px';
            minimizeBtn.style.borderRadius = '4px';
            minimizeBtn.style.cursor = 'pointer';
            minimizeBtn.style.fontSize = '18px';
            minimizeBtn.onclick = function() {
                body.style.display = body.style.display === 'none' ? 'block' : 'none';
            };
            
            const maximizeBtn = document.createElement('button');
            maximizeBtn.innerHTML = '□';
            maximizeBtn.style.background = 'rgba(255,255,255,0.1)';
            maximizeBtn.style.border = 'none';
            maximizeBtn.style.color = 'white';
            maximizeBtn.style.width = '32px';
            maximizeBtn.style.height = '32px';
            maximizeBtn.style.borderRadius = '4px';
            maximizeBtn.style.cursor = 'pointer';
            maximizeBtn.style.fontSize = '18px';
            let isMaximized = false;
            maximizeBtn.onclick = function() {
                if (!isMaximized) {
                    content.style.minWidth = '95vw';
                    content.style.maxHeight = '95vh';
                    isMaximized = true;
                } else {
                    content.style.minWidth = '600px';
                    content.style.maxHeight = '80vh';
                    isMaximized = false;
                }
            };
            
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '×';
            closeBtn.style.background = 'rgba(255,255,255,0.1)';
            closeBtn.style.border = 'none';
            closeBtn.style.color = 'white';
            closeBtn.style.width = '32px';
            closeBtn.style.height = '32px';
            closeBtn.style.borderRadius = '4px';
            closeBtn.style.cursor = 'pointer';
            closeBtn.style.fontSize = '24px';
            closeBtn.onclick = function() { modal.remove(); };
            
            headerButtons.appendChild(minimizeBtn);
            headerButtons.appendChild(maximizeBtn);
            headerButtons.appendChild(closeBtn);
            header.appendChild(headerTitle);
            header.appendChild(headerButtons);
            content.appendChild(header);
            
            // Modal body
            const body = document.createElement('div');
            body.style.padding = '24px';
            body.style.overflowY = 'auto';
            body.style.flex = '1';
            
            // Filter row
            const filterRow = document.createElement('div');
            filterRow.style.display = 'flex';
            filterRow.style.gap = '8px';
            filterRow.style.marginBottom = '16px';
            filterRow.style.alignItems = 'center';
            
            const idLabel = document.createElement('label');
            idLabel.textContent = 'Branch ID';
            idLabel.style.fontSize = '12px';
            idLabel.style.fontWeight = '500';
            
            const idType = document.createElement('select');
            idType.innerHTML = '<option value="Like">Like</option><option value="Equals">Equals</option>';
            idType.style.height = '32px';
            idType.style.fontSize = '12px';
            idType.style.borderRadius = '4px';
            idType.style.border = '1px solid #d1d5db';
            
            const idInput = document.createElement('input');
            idInput.type = 'text';
            idInput.style.width = '140px';
            idInput.style.height = '32px';
            idInput.style.fontSize = '12px';
            idInput.style.padding = '6px 10px';
            idInput.style.borderRadius = '4px';
            idInput.style.border = '1px solid #d1d5db';
            
            const nameLabel = document.createElement('label');
            nameLabel.textContent = 'Branch Name';
            nameLabel.style.fontSize = '12px';
            nameLabel.style.fontWeight = '500';
            nameLabel.style.marginLeft = '16px';
            
            const nameType = document.createElement('select');
            nameType.innerHTML = '<option value="Like">Like</option><option value="Equals">Equals</option>';
            nameType.style.height = '32px';
            nameType.style.fontSize = '12px';
            nameType.style.borderRadius = '4px';
            nameType.style.border = '1px solid #d1d5db';
            
            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.style.width = '140px';
            nameInput.style.height = '32px';
            nameInput.style.fontSize = '12px';
            nameInput.style.padding = '6px 10px';
            nameInput.style.borderRadius = '4px';
            nameInput.style.border = '1px solid #d1d5db';
            
            const searchBtn = document.createElement('button');
            searchBtn.textContent = 'Search';
            searchBtn.style.marginLeft = '16px';
            searchBtn.style.height = '32px';
            searchBtn.style.padding = '0 16px';
            searchBtn.style.fontSize = '12px';
            searchBtn.style.fontWeight = '500';
            searchBtn.style.background = '#517a8e';
            searchBtn.style.color = 'white';
            searchBtn.style.border = 'none';
            searchBtn.style.borderRadius = '4px';
            searchBtn.style.cursor = 'pointer';
            
            filterRow.appendChild(idLabel);
            filterRow.appendChild(idType);
            filterRow.appendChild(idInput);
            filterRow.appendChild(nameLabel);
            filterRow.appendChild(nameType);
            filterRow.appendChild(nameInput);
            filterRow.appendChild(searchBtn);
            body.appendChild(filterRow);
            
            // Results header
            const resultsHeader = document.createElement('div');
            resultsHeader.textContent = 'Search Results';
            resultsHeader.style.fontSize = '13px';
            resultsHeader.style.fontWeight = '600';
            resultsHeader.style.margin = '16px 0 8px 0';
            resultsHeader.style.paddingBottom = '8px';
            resultsHeader.style.borderBottom = '2px solid #f9b233';
            body.appendChild(resultsHeader);
            
            // Results table
            const table = document.createElement('table');
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.style.fontSize = '12px';
            table.innerHTML = `
                <thead>
                    <tr style="background:#517a8e;color:#fff;">
                        <th style="padding: 8px 12px; text-align: left;">Branch ID</th>
                        <th style="padding: 8px 12px; text-align: left;">Branch Name</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            body.appendChild(table);
            
            // Navigation row
            const navRow = document.createElement('div');
            navRow.style.display = 'flex';
            navRow.style.justifyContent = 'center';
            navRow.style.gap = '16px';
            navRow.style.marginTop = '16px';
            
            const okBtn = document.createElement('button');
            okBtn.textContent = 'OK';
            okBtn.style.height = '32px';
            okBtn.style.padding = '0 24px';
            okBtn.style.fontSize = '12px';
            okBtn.style.fontWeight = '500';
            okBtn.style.background = '#22c55e';
            okBtn.style.color = 'white';
            okBtn.style.border = 'none';
            okBtn.style.borderRadius = '4px';
            okBtn.style.cursor = 'pointer';
            okBtn.onclick = function() {
                const selectedRow = table.querySelector('tbody tr.selected');
                if (selectedRow) {
                    const branchId = selectedRow.cells[0].textContent;
                    const branchName = selectedRow.cells[1].textContent;
                    document.getElementById('branchId').value = branchId;
                    document.getElementById('branchName').value = branchName;
                    modal.remove();
                } else {
                    showNotification('Please select a branch', 'warning');
                }
            };
            
            navRow.appendChild(okBtn);
            body.appendChild(navRow);
            
            content.appendChild(body);
            modal.appendChild(content);
            document.body.appendChild(modal);
            
            // Load branch data
            const tableBody = table.querySelector('tbody');
            tableBody.innerHTML = '<tr><td colspan="2" style="text-align:center;padding:20px;">Loading...</td></tr>';
            
            // Mock branch data (similar to interbranch-gl-parameters)
            const branches = [
                {"OurBranchID":"0101","BranchName":"Head Office"},
                {"OurBranchID":"0102","BranchName":"Head Office IFRS"},
                {"OurBranchID":"0201","BranchName":"Fenoteselam  District"},
                {"OurBranchID":"1201","BranchName":"Bahir Dar"}
            ];
            
            function renderBranches(data) {
                if (!data || data.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="2" style="text-align:center;padding:20px;">No branches found</td></tr>';
                    return;
                }
                tableBody.innerHTML = data.map(branch => `
                    <tr style="cursor:pointer;" data-branch-id="${branch.OurBranchID}" data-branch-name="${branch.BranchName}">
                        <td style="padding: 8px 12px;">${branch.OurBranchID}</td>
                        <td style="padding: 8px 12px;">${branch.BranchName}</td>
                    </tr>
                `).join('');
                
                // Add row selection
                tableBody.querySelectorAll('tr').forEach(row => {
                    row.onclick = function() {
                        tableBody.querySelectorAll('tr').forEach(r => {
                            r.classList.remove('selected');
                            r.style.background = '';
                        });
                        this.classList.add('selected');
                        this.style.background = '#e0e7ff';
                    };
                    row.ondblclick = function() {
                        const branchId = this.getAttribute('data-branch-id');
                        const branchName = this.getAttribute('data-branch-name');
                        document.getElementById('branchId').value = branchId;
                        document.getElementById('branchName').value = branchName;
                        modal.remove();
                    };
                });
            }
            
            renderBranches(branches);
            
            // Search functionality
            searchBtn.onclick = function() {
                const idVal = idInput.value.trim().toUpperCase();
                const nameVal = nameInput.value.trim().toUpperCase();
                let filtered = branches;
                
                if (idVal) {
                    filtered = filtered.filter(b => {
                        const branchId = (b.OurBranchID || '').toUpperCase();
                        return idType.value === 'Like' ? branchId.includes(idVal) : branchId === idVal;
                    });
                }
                if (nameVal) {
                    filtered = filtered.filter(b => {
                        const branchName = (b.BranchName || '').toUpperCase();
                        return nameType.value === 'Like' ? branchName.includes(nameVal) : branchName === nameVal;
                    });
                }
                renderBranches(filtered);
            };
            
            // Close on outside click
            modal.onclick = function(e) {
                if (e.target === modal) modal.remove();
            };
        }

        /**
         * Handle GL ID search button click
         */
        async function handleGLIdSearch() {
            // Modal search UI for GL ID
            const branchId = document.getElementById('branchId')?.value || localStorage.getItem('BranchID') || '';
            const operatorId = localStorage.getItem('OperatorID') || 'SYS';
            // Remove any existing modal
            const oldModal = document.getElementById('glIdModal');
            if (oldModal) oldModal.remove();
            // Create modal
            const modal = document.createElement('div');
            modal.id = 'glIdModal';
            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100vw';
            modal.style.height = '100vh';
            modal.style.background = 'rgba(0,0,0,0.4)';
            modal.style.zIndex = '9999';
            modal.style.display = 'flex';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            // Modal content
            const content = document.createElement('div');
            content.style.background = '#fff';
            content.style.borderRadius = '8px';
            content.style.minWidth = '600px';
            content.style.maxWidth = '90vw';
            content.style.maxHeight = '80vh';
            content.style.overflow = 'hidden';
            content.style.display = 'flex';
            content.style.flexDirection = 'column';

            // Modal header
            const header = document.createElement('div');
            header.style.background = '#517a8e';
            header.style.color = 'white';
            header.style.padding = '12px 20px';
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'center';
            header.style.borderRadius = '8px 8px 0 0';
            header.style.marginBottom = '0';

            const headerTitle = document.createElement('h3');
            headerTitle.textContent = 'GL Branch Active AccountID';
            headerTitle.style.margin = '0';
            headerTitle.style.fontSize = '15px';
            headerTitle.style.fontWeight = '600';

            const headerButtons = document.createElement('div');
            headerButtons.style.display = 'flex';
            headerButtons.style.gap = '8px';

            const minimizeBtn = document.createElement('button');
            minimizeBtn.innerHTML = '−';
            minimizeBtn.style.background = 'rgba(255,255,255,0.1)';
            minimizeBtn.style.border = 'none';
            minimizeBtn.style.color = 'white';
            minimizeBtn.style.width = '32px';
            minimizeBtn.style.height = '32px';
            minimizeBtn.style.borderRadius = '4px';
            minimizeBtn.style.cursor = 'pointer';
            minimizeBtn.style.fontSize = '18px';
            minimizeBtn.onclick = function() {
                content.style.display = content.style.display === 'none' ? 'flex' : 'none';
            };

            const maximizeBtn = document.createElement('button');
            maximizeBtn.innerHTML = '□';
            maximizeBtn.style.background = 'rgba(255,255,255,0.1)';
            maximizeBtn.style.border = 'none';
            maximizeBtn.style.color = 'white';
            maximizeBtn.style.width = '32px';
            maximizeBtn.style.height = '32px';
            maximizeBtn.style.borderRadius = '4px';
            maximizeBtn.style.cursor = 'pointer';
            maximizeBtn.style.fontSize = '18px';
            let isMaximized = false;
            maximizeBtn.onclick = function() {
                if (!isMaximized) {
                    content.style.minWidth = '95vw';
                    content.style.maxHeight = '95vh';
                    isMaximized = true;
                } else {
                    content.style.minWidth = '600px';
                    content.style.maxHeight = '80vh';
                    isMaximized = false;
                }
            };

            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '×';
            closeBtn.style.background = 'rgba(255,255,255,0.1)';
            closeBtn.style.border = 'none';
            closeBtn.style.color = 'white';
            closeBtn.style.width = '32px';
            closeBtn.style.height = '32px';
            closeBtn.style.borderRadius = '4px';
            closeBtn.style.cursor = 'pointer';
            closeBtn.style.fontSize = '24px';
            closeBtn.onclick = function() { modal.remove(); };

            headerButtons.appendChild(minimizeBtn);
            headerButtons.appendChild(maximizeBtn);
            headerButtons.appendChild(closeBtn);
            header.appendChild(headerTitle);
            header.appendChild(headerButtons);
            content.appendChild(header);

            // Modal body
            const body = document.createElement('div');
            body.style.padding = '24px';
            body.style.overflowY = 'auto';
            body.style.flex = '1';
            
            // Filter row
            const filterRow = document.createElement('div');
            filterRow.style.display = 'flex';
            filterRow.style.gap = '8px';
            filterRow.style.marginBottom = '16px';
            filterRow.style.alignItems = 'center';
            
            // Account ID filter
            const accountIdLabel = document.createElement('label');
            accountIdLabel.textContent = 'Account ID';
            accountIdLabel.style.fontSize = '12px';
            accountIdLabel.style.fontWeight = '500';
            
            const accountIdType = document.createElement('select');
            accountIdType.innerHTML = '<option value="Like">Like</option><option value="Equals">Equals</option>';
            accountIdType.style.height = '32px';
            accountIdType.style.fontSize = '12px';
            accountIdType.style.borderRadius = '4px';
            accountIdType.style.border = '1px solid #d1d5db';
            
            const accountIdInput = document.createElement('input');
            accountIdInput.type = 'text';
            accountIdInput.style.width = '140px';
            accountIdInput.style.height = '32px';
            accountIdInput.style.fontSize = '12px';
            accountIdInput.style.padding = '6px 10px';
            accountIdInput.style.borderRadius = '4px';
            accountIdInput.style.border = '1px solid #d1d5db';
            
            // Description filter
            const descLabel = document.createElement('label');
            descLabel.textContent = 'Description';
            descLabel.style.fontSize = '12px';
            descLabel.style.fontWeight = '500';
            descLabel.style.marginLeft = '16px';
            
            const descType = document.createElement('select');
            descType.innerHTML = '<option value="Like">Like</option><option value="Equals">Equals</option>';
            descType.style.height = '32px';
            descType.style.fontSize = '12px';
            descType.style.borderRadius = '4px';
            descType.style.border = '1px solid #d1d5db';
            
            const descInput = document.createElement('input');
            descInput.type = 'text';
            descInput.style.width = '140px';
            descInput.style.height = '32px';
            descInput.style.fontSize = '12px';
            descInput.style.padding = '6px 10px';
            descInput.style.borderRadius = '4px';
            descInput.style.border = '1px solid #d1d5db';
            
            // Search button
            const searchBtn = document.createElement('button');
            searchBtn.textContent = 'Search';
            searchBtn.style.marginLeft = '16px';
            searchBtn.style.height = '32px';
            searchBtn.style.padding = '0 16px';
            searchBtn.style.fontSize = '12px';
            searchBtn.style.fontWeight = '500';
            searchBtn.style.background = '#517a8e';
            searchBtn.style.color = 'white';
            searchBtn.style.border = 'none';
            searchBtn.style.borderRadius = '4px';
            searchBtn.style.cursor = 'pointer';
            
            filterRow.appendChild(accountIdLabel);
            filterRow.appendChild(accountIdType);
            filterRow.appendChild(accountIdInput);
            filterRow.appendChild(descLabel);
            filterRow.appendChild(descType);
            filterRow.appendChild(descInput);
            filterRow.appendChild(searchBtn);
            body.appendChild(filterRow);
            
            // Results header
            const resultsHeader = document.createElement('div');
            resultsHeader.textContent = 'Search Results';
            resultsHeader.style.fontSize = '13px';
            resultsHeader.style.fontWeight = '600';
            resultsHeader.style.margin = '16px 0 8px 0';
            resultsHeader.style.paddingBottom = '8px';
            resultsHeader.style.borderBottom = '2px solid #f9b233';
            body.appendChild(resultsHeader);
            
            // Results table
            const table = document.createElement('table');
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.style.fontSize = '12px';
            table.innerHTML = `
                <thead>
                    <tr style="background:#517a8e;color:#fff;">
                        <th style="padding: 8px 12px; text-align: left;">AccountID</th>
                        <th style="padding: 8px 12px; text-align: left;">Description</th>
                        <th style="padding: 8px 12px; text-align: left;">GLAccountTypeID</th>
                        <th style="padding: 8px 12px; text-align: left;">CurrencyID</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            body.appendChild(table);
            
            // Navigation and OK
            const navRow = document.createElement('div');
            navRow.style.display = 'flex';
            navRow.style.justifyContent = 'center';
            navRow.style.gap = '16px';
            navRow.style.marginTop = '16px';
            
            const leftBtn = document.createElement('button');
            leftBtn.textContent = '←';
            leftBtn.style.width = '40px';
            leftBtn.style.height = '32px';
            leftBtn.style.fontSize = '14px';
            leftBtn.style.background = '#e0e7ff';
            leftBtn.style.color = '#4f46e5';
            leftBtn.style.border = '1px solid #c7d2fe';
            leftBtn.style.borderRadius = '4px';
            leftBtn.style.cursor = 'pointer';
            
            const okBtn = document.createElement('button');
            okBtn.textContent = 'OK';
            okBtn.style.height = '32px';
            okBtn.style.padding = '0 24px';
            okBtn.style.fontSize = '12px';
            okBtn.style.fontWeight = '500';
            okBtn.style.background = '#22c55e';
            okBtn.style.color = 'white';
            okBtn.style.border = 'none';
            okBtn.style.borderRadius = '4px';
            okBtn.style.cursor = 'pointer';
            
            const rightBtn = document.createElement('button');
            rightBtn.textContent = '→';
            rightBtn.style.width = '40px';
            rightBtn.style.height = '32px';
            rightBtn.style.fontSize = '14px';
            rightBtn.style.background = '#e0e7ff';
            rightBtn.style.color = '#4f46e5';
            rightBtn.style.border = '1px solid #c7d2fe';
            rightBtn.style.borderRadius = '4px';
            rightBtn.style.cursor = 'pointer';
            
            navRow.appendChild(leftBtn);
            navRow.appendChild(okBtn);
            navRow.appendChild(rightBtn);
            body.appendChild(navRow);
            
            content.appendChild(body);
            modal.appendChild(content);
            document.body.appendChild(modal);

            // Search logic
            async function doSearch() {
                // Build AdvFilterString from filters
                let advFilter = `CurrencyID = 'ETB' AND OurBranchID ='${branchId}' AND GLAccountTypeID IN ('A') AND GLCategoryID<>'Main'`;
                if (accountIdInput.value) {
                    if (accountIdType.value === 'Like') {
                        advFilter += ` AND AccountID LIKE '%${accountIdInput.value}%'`;
                    } else {
                        advFilter += ` AND AccountID = '${accountIdInput.value}'`;
                    }
                }
                if (descInput.value) {
                    if (descType.value === 'Like') {
                        advFilter += ` AND Description LIKE '%${descInput.value}%'`;
                    } else {
                        advFilter += ` AND Description = '${descInput.value}'`;
                    }
                }
                const requestData = {
                    TableID: 'GLBranchActiveID',
                    AdvFilterString: advFilter,
                    WhereStmt: '',
                    PrevOrNext: 0,
                    RefID: '',
                    OperatorID: operatorId,
                    ModuleID: 8060,
                    OurBranchID: branchId,
                    SearchKey: '',
                    LanguageID: 'en'
                };
                table.querySelector('tbody').innerHTML = '<tr><td colspan="4" style="text-align:center;">Searching...</td></tr>';
                try {
                    const result = await GeneralLedgerService.getSearchResult(requestData);
                    if (result.success && result.data && Array.isArray(result.data.Details) && result.data.Details.length > 0) {
                        table.querySelector('tbody').innerHTML = '';
                        result.data.Details.forEach(item => {
                            const tr = document.createElement('tr');
                            tr.style.cursor = 'pointer';
                            tr.innerHTML = `<td>${item.AccountID || ''}</td><td>${item.Description || ''}</td><td>${item.GLAccountTypeID || ''}</td><td>${item.CurrencyID || ''}</td>`;
                            tr.onclick = function() {
                                document.getElementById('glAccountId').value = item.AccountID || '';
                                modal.remove();
                            };
                            table.querySelector('tbody').appendChild(tr);
                        });
                    } else {
                        table.querySelector('tbody').innerHTML = '<tr><td colspan="4" style="text-align:center;">No results found</td></tr>';
                    }
                } catch (error) {
                    table.querySelector('tbody').innerHTML = `<tr><td colspan="4" style="text-align:center;color:red;">Error: ${error.message}</td></tr>`;
                }
            }
            searchBtn.onclick = doSearch;
            // Initial search
            doSearch();
            // OK button populates selected AccountID (first row)
            okBtn.onclick = function() {
                const firstRow = table.querySelector('tbody tr');
                if (firstRow) {
                    const accountId = firstRow.children[0].textContent;
                    document.getElementById('glAccountId').value = accountId;
                }
                modal.remove();
            };
            // Navigation buttons (dummy, can be wired for paging if needed)
            leftBtn.onclick = function() { /* paging left */ };
            rightBtn.onclick = function() { /* paging right */ };
        }
    }

    /**
     * Load specific GL Parameter by ID
     */
    async function loadGLParameterById(glParameterId) {
        try {
            // Get branch ID from the form field, fallback to localStorage, then default
            const branchIdInput = document.getElementById('branchId');
            const branchId = branchIdInput?.value || localStorage.getItem('BranchID') || '0101';
            
            // NOTE: The stored procedure p_GetGLParameters does NOT accept GLParameterID
            // So we fetch all parameters and filter client-side
            const sessionData = {
                OurBranchID: branchId,
                OperatorID: localStorage.getItem('OperatorID') || 'SYS'
                // NOT sending GLParameterID - the stored procedure doesn't accept it
            };

            console.log('🔧 Fetching all GL Parameters to find ID:', glParameterId);
            console.log('📤 Using Branch ID:', branchId);
            console.log('📤 Sending request to getGLParameters:', sessionData);

            const result = await GeneralLedgerService.getGLParameters(sessionData);

            console.log('🔍 Full API Response for ID:', result);
            console.log('🔍 Response type:', typeof result);
            console.log('🔍 Response success:', result?.success);
            console.log('🔍 Response data:', result?.data);
            console.log('🔍 Response message:', result?.message);
            console.log('🔍 Available keys in result:', result ? Object.keys(result) : 'No result');
            console.log('🔍 Available data keys:', result?.data ? Object.keys(result.data) : 'No data');

            // Handle various response formats
            if (!result) {
                console.error('❌ No response received');
                showNotification('No response from server', 'error');
                return null;
            }

            // Check if result.success is explicitly false
            if (result.success === false) {
                console.error('❌ API Error:', result.message);
                showNotification(result.message || 'Failed to load GL Parameter', 'error');
                return null;
            }

            // Try to extract data from the response
            let parametersData = null;
            const dataSource = result.data || result;

            if (dataSource.Details01 && Array.isArray(dataSource.Details01) && dataSource.Details01.length > 0) {
                parametersData = dataSource.Details01;
                console.log('📦 Found in Details01:', parametersData.length, 'records');
            } else if (dataSource.Details02 && Array.isArray(dataSource.Details02) && dataSource.Details02.length > 0) {
                parametersData = dataSource.Details02;
                console.log('📦 Found in Details02:', parametersData.length, 'records');
            } else if (dataSource.Details && Array.isArray(dataSource.Details) && dataSource.Details.length > 0) {
                parametersData = dataSource.Details;
                console.log('📦 Found in Details:', parametersData.length, 'records');
            } else if (dataSource.Details01 && Array.isArray(dataSource.Details01)) {
                console.warn('⚠️ Details01 exists but is empty array');
            } else {
                console.warn('⚠️ No data arrays found in response');
                console.warn('⚠️ DataSource keys:', dataSource ? Object.keys(dataSource) : 'None');
            }

            if (parametersData && parametersData.length > 0) {
                // Accept either GLParameterID (name) or AccountID (number)
                let param = parametersData.find(p => {
                    return String(p.GLParameterID).toLowerCase() === String(glParameterId).toLowerCase()
                        || String(p.AccountID) === String(glParameterId);
                });

                if (param) {
                    if (String(param.GLParameterID).toLowerCase() === String(glParameterId).toLowerCase()) {
                        console.log('✅ GL Parameter found by GLParameterID:', param);
                    } else {
                        console.log('✅ GL Parameter found by AccountID:', param);
                    }
                    return param;
                } else {
                    console.warn('⚠️ GL Parameter not found for ID:', glParameterId);
                    console.warn('⚠️ Available GL Parameter IDs:', parametersData.map(p => p.GLParameterID));
                    console.warn('⚠️ Available Account IDs:', parametersData.map(p => p.AccountID));
                    showNotification(`GL Parameter '${glParameterId}' not found. Enter Parameter Name (e.g., AGENT_COMMIN) or Account ID (e.g., 10110004)`, 'error');
                    return null;
                }
            } else {
                console.warn('⚠️ No GL Parameters found for branch:', branchId);
                showNotification(`No GL Parameters found for branch '${branchId}'`, 'error');
                return null;
            }
        } catch (error) {
            console.error('❌ Error loading GL Parameter by ID:', error);
            showNotification('Error: ' + error.message, 'error');
            return null;
        }
    }

    /**
     * Load GL Parameters from API
     */
    async function loadGLParameters() {
        try {
            // Get branch ID from the form field, fallback to localStorage, then default
            const branchIdInput = document.getElementById('branchId');
            const branchId = branchIdInput?.value || localStorage.getItem('BranchID') || '0101';
            
            const sessionData = {
                OurBranchID: branchId,
                OperatorID: localStorage.getItem('OperatorID') || 'SYS'
            };

            console.log('� RELOADING GL Parameters...');
            console.log('🔧 Session Data:', sessionData);
            console.log('📤 Sending request to getGLParameters');

            const result = await GeneralLedgerService.getGLParameters(sessionData);

            console.log('🔍 Full API Response:', result);
            console.log('🔍 Response data structure:', result.data);
            console.log('🔍 Response Details01:', result.data?.Details01);

            if (result.success) {
                // Details01 contains the GL Parameters data grid
                let parametersData = null;
                
                if (result.data.Details01 && Array.isArray(result.data.Details01) && result.data.Details01.length > 0) {
                    parametersData = result.data.Details01;
                    console.log('📦 Found data in Details01 (GL Parameters):', parametersData.length, 'records');
                } else if (result.data.Details02 && Array.isArray(result.data.Details02) && result.data.Details02.length > 0) {
                    parametersData = result.data.Details02;
                    console.log('📦 Found data in Details02:', parametersData.length, 'records');
                } else if (result.data.Details && Array.isArray(result.data.Details) && result.data.Details.length > 0) {
                    parametersData = result.data.Details;
                    console.log('📦 Found data in Details:', parametersData.length, 'records');
                } else {
                    console.log('⚠️ Checking all result.data properties:', Object.keys(result.data || {}));
                }

                if (parametersData && parametersData.length > 0) {
                    currentParameters = parametersData;
                    populateParametersTable(parametersData);
                    console.log('✅ GL Parameters loaded successfully:', parametersData.length, 'records');
                } else {
                    console.warn('⚠️ No GL Parameters found for branch:', branchId);
                    showNotification('No GL Parameters found for branch ' + branchId, 'warning');
                }
            } else {
                console.error('❌ API Error:', result.message);
                showNotification(result.message || 'Failed to load GL Parameters', 'error');
            }
        } catch (error) {
            console.error('❌ Error loading GL Parameters:', error);
            showNotification('Error loading GL Parameters: ' + error.message, 'error');
        }
    }

    /**
     * Populate GL Parameters table with Details01 data
     */
    function populateParametersTable(parametersData) {
        const tbody = document.querySelector('#glParametersTable tbody');
        if (!tbody) {
            console.error('❌ Table tbody not found');
            return;
        }

        tbody.innerHTML = '';
        
        console.log(`📋 Populating table with ${parametersData.length} records`);

        parametersData.forEach((param, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${param.GLParameterID || ''}</td>
                <td>${param.GLName || ''}</td>
                <td>${param.AccountID || ''}</td>
            `;
            // Store full parameter data in row dataset
            row.dataset.paramData = JSON.stringify(param);
            row.dataset.index = index;
            // Add click event to select row and populate form
            row.addEventListener('click', function() {
                document.querySelectorAll('#glParametersTable tbody tr').forEach(r => {
                    r.classList.remove('selected');
                    r.style.backgroundColor = '';
                });
                this.classList.add('selected');
                this.style.backgroundColor = '#b0d4e3';
                // Auto-populate form when row is selected
                populateFormFields(param);
            });
            // Add double-click event to view
            row.addEventListener('dblclick', function() {
                handleView();
            });
            tbody.appendChild(row);
        });
        
        console.log(`✅ Table populated with ${parametersData.length} rows`);
    }

    /**
     * Populate form fields with parameter data
     */
    function populateFormFields(param) {
        console.log('📝 Populating form fields with:', param);
        
        // Populate header fields
        const branchIdInput = document.getElementById('branchId');
        const branchNameInput = document.getElementById('branchName');
        const descriptionInput = document.getElementById('glDescription');
        const glIdInput = document.getElementById('glAccountId');
        
        // Only update branch fields if param has valid branch data, otherwise keep existing
        if (branchIdInput && param.OurBranchID) branchIdInput.value = param.OurBranchID;
        if (branchNameInput && param.BranchName) branchNameInput.value = param.BranchName;
        if (descriptionInput) {
            descriptionInput.value = param.GLParameter || param.Remarks || '';
            descriptionInput.removeAttribute('readonly');
        }
        if (glIdInput) {
            glIdInput.value = param.AccountID || param.GLParameterID || '';
            glIdInput.removeAttribute('readonly');
        }

        // Populate audit fields (Behind The Scene)
        const createdBy = document.getElementById('createdBy');
        const modifiedBy = document.getElementById('modifiedBy');
        const supervisedBy = document.getElementById('supervisedBy');
        const createdOn = document.getElementById('createdOn');
        const modifiedOn = document.getElementById('modifiedOn');
        const supervisedOn = document.getElementById('supervisedOn');
        
        if (createdBy) createdBy.value = param.CreatedBy || '';
        if (modifiedBy) modifiedBy.value = param.ModifiedBy || '';
        if (supervisedBy) supervisedBy.value = param.SupervisedBy || '';
        if (createdOn) createdOn.value = formatDate(param.CreatedOn) || '';
        if (modifiedOn) modifiedOn.value = formatDate(param.Modifiedon) || '';
        if (supervisedOn) supervisedOn.value = formatDate(param.SupervisedOn) || '';

        console.log('✅ Form populated with parameter:', param.GLParameter);
    }

    /**
     * Format date for display
     */
    function formatDate(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleString('en-GB', { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dateString;
        }
    }

    /**
     * Handle View button click - Load GL Parameters data
     */
    async function handleView() {
        try {
            console.log('� VIEW BUTTON CLICKED!');
            console.log('📤 View button clicked - Loading GL Parameters...');
            await loadGLParameters();
        } catch (error) {
            console.error('❌ Error in handleView:', error);
            showNotification('Error loading GL Parameters', 'error');
        }
    }

    /**
     * Handle Edit button click - Prepares for alter mode (editing existing)
     */
    function handleEdit() {
        // Check if a row is selected in the table
        const selectedRow = document.querySelector('#glParametersTable tbody tr.selected');
        
        if (selectedRow) {
            // Edit selected parameter from grid
            const paramData = JSON.parse(selectedRow.dataset.paramData);
            selectedParameterForEdit = paramData;
            populateFormFields(paramData);
            currentMode = 'edit';
            showNotification('Edit mode ready. Modify fields and click Save, or click Alter to change GL ID', 'info');
            setMode('edit');
        } else {
            // No row selected - prepare for new entry
            clearForm();
            selectedParameterForEdit = null;
            currentMode = 'add';
            isAlterModeActive = false;
            showNotification('Add mode ready. Enter GL Parameter details and click Save', 'info');
            setMode('edit');
            
            // Enable fields for data entry
            const glIdInput = document.getElementById('glAccountId');
            const descriptionInput = document.getElementById('glDescription');
            if (glIdInput) {
                glIdInput.removeAttribute('readonly');
                glIdInput.disabled = false;
                glIdInput.focus();
            }
            if (descriptionInput) {
                descriptionInput.removeAttribute('readonly');
                descriptionInput.disabled = false;
            }
        }
    }

    /**
     * Handle Save button click - Saves new or edited GL Parameter
     */
    async function handleSave() {
        try {
            const accountId = document.getElementById('glAccountId')?.value?.trim();
            const remarks = document.getElementById('glDescription')?.value?.trim();
            const branchId = document.getElementById('branchId')?.value || localStorage.getItem('BranchID') || '0101';
            const operatorId = localStorage.getItem('OperatorID') || 'SYS';
            
            // Determine if this is a new record or editing existing
            const isNewRecord = !selectedParameterForEdit || currentMode === 'add';
            
            // For editing: GLParameterID stays the same (the key), AccountID is what we're changing
            // For new: Both GLParameterID and AccountID come from the form
            const glParameterId = isNewRecord ? accountId : (selectedParameterForEdit?.GLParameterID || accountId);
            
            // Validation
            if (!glParameterId) {
                showNotification('GL Parameter ID is required', 'warning');
                document.getElementById('glAccountId')?.focus();
                return;
            }
            
            if (!accountId) {
                showNotification('Account ID is required', 'warning');
                return;
            }
            
            // Get current date in MM/DD/YYYY format
            const now = new Date();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const year = now.getFullYear();
            const formattedDate = `${month}/${day}/${year}`;
            
            // Prepare request data according to API structure
            // For NewRecord parameter: Use 1 for new records, UpdateCount for edits (matches Account Maintenance pattern)
            const requestData = {
                OurBranchID: branchId,
                GLParameterID: glParameterId,
                AccountID: accountId,
                Remarks: remarks || '',
                CreatedBy: isNewRecord ? operatorId : (selectedParameterForEdit?.CreatedBy || operatorId),
                CreatedOn: isNewRecord ? formattedDate : (selectedParameterForEdit?.CreatedOn || formattedDate),
                ModifiedBy: operatorId,
                ModifiedOn: formattedDate,
                SupervisedBy: operatorId,
                NewRecord: isNewRecord ? 1 : (selectedParameterForEdit?.UpdateCount || 0)  // Use UpdateCount from loaded record for edits
            };

            console.log('💾 Saving GL Parameter:', requestData);
            console.log('💾 Is New Record:', isNewRecord);
            console.log('💾 Current Mode:', currentMode);
            console.log('💾 Selected Parameter for Edit:', selectedParameterForEdit);
            console.log('💾 UpdateCount from record:', selectedParameterForEdit?.UpdateCount);
            console.log('💾 Description/Remarks being sent:', remarks);
            console.log('💾 GLParameterID being sent:', glParameterId);
            console.log('💾 AccountID being sent:', accountId);

            const result = await GeneralLedgerService.editGLParameters(requestData);
            
            console.log('📥 Save response:', result);
            console.log('📥 Response type:', typeof result);
            console.log('📥 Response success:', result?.success);
            console.log('📥 Response message:', result?.message);
            console.log('📥 Response data:', result?.data);
            console.log('📥 Response data.Status:', result?.data?.Status);
            console.log('📥 Response data.Message:', result?.data?.Message);
            console.log('📥 Response keys:', result ? Object.keys(result) : 'No result');
            
            // Log what we're about to send to the database
            console.log('🔍 Data being saved to DB:');
            console.log('  - GLParameterID:', glParameterId);
            console.log('  - AccountID:', accountId);
            console.log('  - Remarks:', remarks);
            console.log('  - NewRecord (UpdateCount):', isNewRecord ? 1 : (selectedParameterForEdit?.UpdateCount || 0));

            // Handle various response formats
            if (!result) {
                showNotification('No response from server', 'error');
                return;
            }

            // Check for success (true) or explicit failure (false)
            if (result.success === true) {
                showNotification(`GL Parameter ${isNewRecord ? 'created' : 'updated'} successfully! Refreshing grid...`, 'success');
                
                // Reset state
                isAlterModeActive = false;
                selectedParameterForEdit = null;
                currentMode = 'view';
                
                // Clear form first
                clearForm();
                setMode('view');
                
                // Add small delay to ensure database commit, then reload
                setTimeout(async () => {
                    await loadGLParameters();
                }, 500);
            } else if (result.success === false) {
                // Explicit failure - extract actual error message
                const dbError = result.data?.Message || result.data?.message;
                const errorMsg = dbError || result.message || 'Failed to save GL Parameter';
                console.error('❌ API returned error:', errorMsg);
                console.error('❌ Full error data:', result.data);
                
                // Check for concurrency errors - offer to reload and retry
                if (dbError && (dbError.toLowerCase().includes('another user') || 
                                dbError.toLowerCase().includes('already done') ||
                                dbError.toLowerCase().includes('already updated'))) {
                    console.log('⚠️ Concurrency conflict detected');
                    const retry = confirm('This record was modified by another user. Click OK to reload the latest data and try again, or Cancel to abort.');
                    
                    if (retry) {
                        // Reload the latest data
                        await loadGLParameters();
                        showNotification('Data reloaded. Please review and try saving again.', 'info');
                        
                        // If we were editing a specific parameter, reload it
                        if (selectedParameterForEdit && selectedParameterForEdit.GLParameterID) {
                            const fresh = await loadGLParameterById(selectedParameterForEdit.GLParameterID);
                            if (fresh) {
                                selectedParameterForEdit = fresh;
                                populateFormFields(fresh);
                                showNotification('Latest data loaded. Please review and click Save again.', 'info');
                            }
                        }
                    } else {
                        // User cancelled - reset to view mode
                        clearForm();
                        setMode('view');
                    }
                } else {
                    // Show other errors
                    if (dbError) {
                        showNotification(`Database Error: ${dbError}`, 'error');
                    } else {
                        showNotification(errorMsg, 'error');
                    }
                }
            } else {
                // Unexpected response format
                console.error('❌ Unexpected response format:', result);
                showNotification('Unexpected response from server. Check console for details.', 'error');
            }
        } catch (error) {
            console.error('❌ Error saving GL Parameter:', error);
            showNotification('Error saving GL Parameter: ' + error.message, 'error');
        }
    }

    /**
     * Handle Alter button click - Activates alter mode and enables GL ID input
     */
    async function handleAlter() {
        // Activate alter mode
        isAlterModeActive = true;
        
        // Enable GL ID field for input
        const glIdInput = document.getElementById('glAccountId');
        const descriptionInput = document.getElementById('glDescription');
        
        if (glIdInput) {
            glIdInput.value = '';
            glIdInput.removeAttribute('readonly');
            glIdInput.disabled = false;
            glIdInput.focus();
        }
        
        if (descriptionInput) {
            descriptionInput.removeAttribute('readonly');
            descriptionInput.disabled = false;
        }
        
        showNotification('Alter mode activated. Enter GL Parameter ID and click Update', 'info');
    }

    /**
     * Handle Update button click - Captures form values when in alter mode, ready for save
     */
    async function handleUpdate() {
        if (!isAlterModeActive) {
            showNotification('Please click Edit and Alter buttons first', 'warning');
            return;
        }
        
        try {
            const glIdInput = document.getElementById('glAccountId');
            const descriptionInput = document.getElementById('glDescription');
            const glParameterId = glIdInput?.value?.trim();
            const description = descriptionInput?.value?.trim();
            
            if (!glParameterId) {
                showNotification('Please enter GL Account ID', 'warning');
                glIdInput?.focus();
                return;
            }
            
            // In alter mode, we're CHANGING the AccountID, not looking it up
            // Just capture the new values and prepare for save
            console.log('📝 Update: Capturing new Account ID:', glParameterId);
            console.log('📝 Update: Description:', description);
            
            // Update the selectedParameterForEdit with new AccountID but keep other fields
            if (selectedParameterForEdit) {
                // We're updating an existing parameter's AccountID
                selectedParameterForEdit.AccountID = glParameterId;
                selectedParameterForEdit.GLParameter = description;
                console.log('✅ Updated parameter ready for save:', selectedParameterForEdit);
            } else {
                console.warn('⚠️ No parameter selected for edit');
            }
            
            // Enable form fields for any additional edits
            setMode('edit');
            
            showNotification('Account ID updated to ' + glParameterId + '. Click Save to commit changes', 'success');
        } catch (error) {
            console.error('❌ Error updating GL Parameter:', error);
            showNotification('Error updating GL Parameter: ' + error.message, 'error');
        }
    }

    /**
     * Handle Cancel button click
     */
    function handleCancel() {
        // Reset alter mode state
        isAlterModeActive = false;
        selectedParameterForEdit = null;

        // Clear form fields but preserve Branch ID
        clearForm();
        setMode('view');
        showNotification('Operation cancelled.', 'info');
    }

    /**
     * Get form data
     */
    function getFormData() {
        return {
            OurBranchID: document.getElementById('branchId')?.value || '',
            GLParameter: document.getElementById('glDescription')?.value || '',
            AccountID: document.getElementById('glAccountId')?.value || '',
            OperatorID: localStorage.getItem('OperatorID') || 'SYS'
        };
    }

    /**
     * Clear form
     */
    function clearForm() {
        // If editing, prompt for confirmation before discarding
        if (currentMode === 'edit') {
            const confirmClear = window.confirm('Do you want to Abort/ Discard the changes? [No:1100]');
            if (!confirmClear) {
                // User chose No, continue editing
                return;
            }
            // User chose Yes, abort/discard changes, but do NOT clear fields
            isAlterModeActive = false;
            selectedParameterForEdit = null;
            setMode('view');
            console.log('✅ Edit operation aborted, fields retained');
            return;
        }
        // If not editing, clear all fields as before
        document.getElementById('glDescription').value = '';
        document.getElementById('glAccountId').value = '';
        // Clear audit fields
        document.getElementById('createdBy').value = '';
        document.getElementById('modifiedBy').value = '';
        document.getElementById('supervisedBy').value = '';
        document.getElementById('createdOn').value = '';
        document.getElementById('modifiedOn').value = '';
        document.getElementById('supervisedOn').value = '';
        // DON'T clear branch fields - they're needed for View operations
        // const branchIdInput = document.getElementById('branchId');
        // if (branchIdInput) branchIdInput.value = '';
        // const branchNameInput = document.getElementById('branchName');
        // if (branchNameInput) branchNameInput.value = '';
        // Clear table selection
        document.querySelectorAll('#glParametersTable tbody tr').forEach(r => {
            r.classList.remove('selected');
            r.style.backgroundColor = '';
        });
        setMode('view');
        console.log('✅ Form cleared');
    }

    /**
     * Set form mode
     */
    function setMode(mode) {
        currentMode = mode;
        
        const editableInputs = document.querySelectorAll('.form-content input[type="text"]:not(.input-small):not([readonly])');
        
        if (mode === 'view') {
            editableInputs.forEach(input => input.setAttribute('readonly', 'readonly'));
        } else {
            editableInputs.forEach(input => input.removeAttribute('readonly'));
        }

        console.log('🔧 Mode changed to:', mode);
    }

    /**
     * Setup table interactions
     */
    function setupTableInteractions() {
        // Double-click functionality will be added after data is loaded
        // Event listeners are added during table population
        console.log('✅ Table interactions configured');
    }

    /**
     * Show notification
     */
    function showNotification(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        // TODO: Implement actual notification UI
        alert(message);
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
