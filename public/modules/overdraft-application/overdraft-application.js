(async () => {
    // Load required services
    const { ServiceLoader } = window;
    await ServiceLoader.loadCore();
    await ServiceLoader.loadOverdraftService();
    await ServiceLoader.loadLookupService();
    await ServiceLoader.loadSearchService();

    const OverdraftService = window.OverdraftService;
    const form = document.getElementById('overdraftForm');
    const statusBar = document.getElementById('statusMessage');
    const statusIcon = statusBar.querySelector('.bi');
    const statusText = statusBar.querySelector('.status-text');
    const statusClose = statusBar.querySelector('.status-close');
    const actionButtons = {
        view: document.querySelector('[data-action="view"]'),
        add: document.querySelector('[data-action="add"]'),
        edit: document.querySelector('[data-action="edit"]'),
        delete: document.querySelector('[data-action="delete"]'),
        save: document.querySelector('[data-action="save"]'),
        cancel: document.querySelector('[data-action="cancel"]'),
        back: document.querySelector('[data-action="back"]')
    };
    const tableBody = document.querySelector('#applicationsTable tbody');
    const requiredFields = Array.from(form.querySelectorAll('[data-required="true"]'));
    const editableFields = Array.from(form.querySelectorAll('input, select, textarea')).filter(el => !el.readOnly);

    let isEditMode = false;
    let currentRecord = null;
    let activeSection = 'dataentry';
    let statusTimer;

    const icons = {
        success: 'bi-check-circle',
        error: 'bi-x-circle',
        warning: 'bi-exclamation-triangle',
        info: 'bi-info-circle'
    };

    function showStatus(message, type = 'info') {
        clearTimeout(statusTimer);
        statusBar.classList.remove('hidden', 'success', 'error', 'warning', 'info');
        statusBar.classList.add(type);
        statusIcon.className = `bi ${icons[type] || icons.info}`;
        statusText.textContent = message;
        statusTimer = setTimeout(hideStatus, 5000);
    }

    function hideStatus() {
        statusBar.classList.add('hidden');
    }

    statusClose.addEventListener('click', hideStatus);

    function setFormEnabled(enabled) {
        // Keep search/ID fields always enabled for lookup
        const searchFields = ['applicationId', 'accountId', 'branchId', 'clientId'];
        
        editableFields.forEach(field => {
            // Always keep search fields enabled
            if (searchFields.includes(field.id) || searchFields.includes(field.name)) {
                field.disabled = false;
            } else {
                field.disabled = !enabled;
            }
        });
        isEditMode = enabled;
    }

    function clearInvalid() {
        form.querySelectorAll('.is-invalid').forEach(field => field.classList.remove('is-invalid'));
    }

    function clearForm() {
        form.reset();
        clearInvalid();
        ['createdBy', 'createdOn', 'modifiedBy', 'modifiedOn', 'supervisedBy', 'supervisedOn'].forEach(id => {
            const field = form.elements[id];
            if (field) field.value = '';
        });
    }

    function loadRecord(record) {
        Object.entries(record).forEach(([key, value]) => {
            const field = form.elements[key];
            if (field) {
                field.value = value ?? '';
            }
        });
    }

    function validateForm() {
        clearInvalid();
        let firstInvalid = null;
        requiredFields.forEach(field => {
            if (!String(field.value || '').trim()) {
                field.classList.add('is-invalid');
                if (!firstInvalid) firstInvalid = field;
            }
        });
        if (firstInvalid) {
            firstInvalid.focus();
            showStatus('Please complete all required fields.', 'error');
            return false;
        }
        return true;
    }

    function getUserContext() {
        return window.kairoUser || (window.sessionStorage ? window.sessionStorage.getItem('kairoUser') : null);
    }

    function updateAudit(user) {
        const now = new Date();
        const stamp = now.toLocaleString();
        if (!form.createdBy.value) {
            form.createdBy.value = user;
            form.createdOn.value = stamp;
        }
        form.modifiedBy.value = user;
        form.modifiedOn.value = stamp;
    }

    function collectFormData() {
        const data = {};
        const fd = new FormData(form);
        fd.forEach((value, key) => {
            data[key] = value;
        });
        return data;
    }

    async function fetchOverdraftApplication(applicationId, accountId, branchId) {
        try {
            showStatus('Fetching overdraft application...', 'info');
            
            const result = await OverdraftService.getOverdraftApplication({
                OurBranchID: branchId || '0325',
                AccountID: accountId || '',
                ApplicationID: applicationId || '',
                OperatorID: 'SYS',
                Direction: 1
            });
            
            if (result.success && result.data) {
                // Extract data from Details01 array
                if (result.data.Details01 && result.data.Details01.length > 0) {
                    const appData = result.data.Details01[0];
                    currentRecord = {
                        OurBranchID: appData.OurBranchID,
                        AccountID: appData.AccountID,
                        ApplicationID: appData.ApplicationID,
                        ApplicationDate: appData.ApplicationDate?.split('T')[0],
                        ClientBranch: appData.ClientBranch,
                        ClientID: appData.ClientID,
                        ProductID: appData.ProductID,
                        PurposeCodeID: appData.PurposeCodeID,
                        BusinessLineID: appData.BusinessLineID,
                        CreditOfficerID: appData.CreditOfficerID,
                        Amount: appData.Amount,
                        ExpiryDate: appData.ExpiryDate?.split('T')[0],
                        ReviewDate: appData.ReviewDate?.split('T')[0],
                        Remarks: appData.Remarks,
                        FileNumber: appData.FileNumber,
                        AppStatusID: appData.AppStatusID,
                        CreatedBy: appData.CreatedBy,
                        CreatedOn: appData.CreatedOn,
                        ModifiedBy: appData.ModifiedBy,
                        ModifiedOn: appData.ModifiedOn,
                        SupervisedBy: appData.SupervisedBy,
                        SupervisedOn: appData.SupervisedOn
                    };
                    
                    // Map backend fields to form fields
                    loadRecord({
                        branchId: appData.OurBranchID,
                        accountId: appData.AccountID,
                        applicationId: appData.ApplicationID,
                        applicationDate: appData.ApplicationDate?.split('T')[0],
                        clientId: appData.ClientID,
                        product: appData.ProductID,
                        purpose: appData.PurposeCodeID,
                        lineOfBusiness: appData.BusinessLineID,
                        appliedAmount: appData.Amount,
                        expiryDate: appData.ExpiryDate?.split('T')[0],
                        reviewDate: appData.ReviewDate?.split('T')[0],
                        remarks: appData.Remarks,
                        createdBy: appData.CreatedBy,
                        createdOn: appData.CreatedOn,
                        modifiedBy: appData.ModifiedBy,
                        modifiedOn: appData.ModifiedOn,
                        supervisedBy: appData.SupervisedBy,
                        supervisedOn: appData.SupervisedOn
                    });
                    
                    renderTable();
                    showStatus('Overdraft application loaded successfully', 'success');
                } else {
                    showStatus('No data found for the specified criteria', 'warning');
                    currentRecord = null;
                    renderTable();
                }
            } else {
                showStatus(result.message || 'Failed to fetch overdraft application', 'error');
                currentRecord = null;
                renderTable();
            }
        } catch (error) {
            console.error('Error fetching overdraft application:', error);
            showStatus('Error fetching overdraft application: ' + error.message, 'error');
            currentRecord = null;
            renderTable();
        }
    }

    async function fetchInterestRateData(applicationId, accountId, branchId, trxTypeId, effectiveDate, refNo) {
        try {
            showStatusInModal('Fetching interest rate data...', 'info', 'interestRatesStatusMessage');
            
            const applicationIdValue = applicationId || form.applicationId?.value?.trim();
            const accountIdValue = accountId || form.accountId?.value?.trim();
            const branchIdValue = branchId || form.branchId?.value?.trim();
            
            if (!applicationIdValue && !accountIdValue && !branchIdValue) {
                showStatusInModal('Please enter an Application ID, Account ID, or Branch ID to search.', 'warning', 'interestRatesStatusMessage');
                return;
            }

            const requestData = {
                OurBranchID: branchIdValue || '0325',
                AccountID: accountIdValue || '',
                ApplicationID: applicationIdValue || '',
                TrxTypeID: trxTypeId || '',
                EffectiveDate: effectiveDate || '',
                RefNo: refNo || 0,
                OperatorID: getUserContext() || 'SYS',
                Direction: 1
            };

            const result = await OverdraftService.getODApplicationInterestRate(requestData);

            if (result.success && result.data) {
                const responseData = result.data;

                // Details03 contains the interest rate data
                if (responseData.Details03 && responseData.Details03.length > 0) {
                    const rateData = responseData.Details03[0];
                    
                    // Get the interest rates form
                    const ratesForm = document.getElementById('interestRatesForm');
                    if (ratesForm) {
                        // Populate date fields
                        if (ratesForm.effectiveDate) {
                            const effectiveDateValue = rateData.CreditInterestAppliedDate || rateData.PreviousEffectiveDate;
                            if (effectiveDateValue) {
                                ratesForm.effectiveDate.value = new Date(effectiveDateValue).toISOString().split('T')[0];
                            }
                        }
                        
                        if (ratesForm.expiryDateRate) {
                            const expiryDateValue = rateData.DebitInterestAppliedDate;
                            if (expiryDateValue) {
                                ratesForm.expiryDateRate.value = new Date(expiryDateValue).toISOString().split('T')[0];
                            }
                        }

                        // Populate other fields if available
                        if (ratesForm.rateType && rateData.InterestTypeID) {
                            ratesForm.rateType.value = rateData.InterestTypeID;
                        }
                        
                        if (ratesForm.refId && rateData.Scheme) {
                            ratesForm.refId.value = rateData.Scheme;
                        }
                    }

                    showStatusInModal('Interest rate data loaded successfully!', 'success', 'interestRatesStatusMessage');
                } else {
                    showStatusInModal('No interest rate data found for the given criteria.', 'warning', 'interestRatesStatusMessage');
                }
            } else {
                showStatusInModal(result.message || 'Failed to fetch interest rate data', 'error', 'interestRatesStatusMessage');
            }
        } catch (error) {
            console.error('Error fetching interest rate data:', error);
            showStatusInModal('An error occurred while fetching interest rate data: ' + error.message, 'error', 'interestRatesStatusMessage');
        }
    }

    async function fetchGuarantorData(applicationId, accountId, branchId, guarantorId) {
        try {
            showStatusInModal('Fetching guarantor data...', 'info', 'guarantorStatusMessage');
            
            const applicationIdValue = applicationId || form.applicationId?.value?.trim();
            const accountIdValue = accountId || form.accountId?.value?.trim();
            const branchIdValue = branchId || form.branchId?.value?.trim();
            
            if (!applicationIdValue && !accountIdValue && !branchIdValue) {
                showStatusInModal('Please enter an Application ID, Account ID, or Branch ID to search.', 'warning', 'guarantorStatusMessage');
                return;
            }

            const requestData = {
                ModuleID: 1000,
                OurBranchID: branchIdValue || '0325',
                AccountID: accountIdValue || '',
                ApplicationID: applicationIdValue || '',
                GuarantorID: guarantorId || '',
                OperatorID: getUserContext() || 'SYS',
                Direction: 1
            };

            const result = await OverdraftService.getODApplicationGuarantors(requestData);

            if (result.success && result.data) {
                const responseData = result.data;

                // Details02 contains application-specific guarantor data
                if (responseData.Details02 && responseData.Details02.length > 0) {
                    const guarantorData = responseData.Details02[0];
                    
                    // Get the guarantor form
                    const guarantorForm = document.getElementById('guarantorForm');
                    if (guarantorForm) {
                        // Populate form fields from Details02
                        if (guarantorForm.guarantorIdModal) {
                            guarantorForm.guarantorIdModal.value = guarantorData.GuarantorID || '';
                        }
                        
                        if (guarantorForm.guaranteeAmountModal) {
                            guarantorForm.guaranteeAmountModal.value = guarantorData.GuaranteeAmount || '';
                        }
                        
                        if (guarantorForm.guarantorRemarksModal) {
                            guarantorForm.guarantorRemarksModal.value = guarantorData.Remarks || '';
                        }

                        // Behind the scene fields from Details02
                        if (guarantorForm.guarantorCreatedByModal) {
                            guarantorForm.guarantorCreatedByModal.value = guarantorData.CreatedBy || '';
                        }
                        
                        if (guarantorForm.guarantorCreatedOnModal) {
                            guarantorForm.guarantorCreatedOnModal.value = guarantorData.CreatedOn || '';
                        }
                        
                        if (guarantorForm.guarantorModifiedByModal) {
                            guarantorForm.guarantorModifiedByModal.value = guarantorData.ModifiedBy || '';
                        }
                        
                        if (guarantorForm.guarantorModifiedOnModal) {
                            guarantorForm.guarantorModifiedOnModal.value = guarantorData.ModifiedOn || '';
                        }
                        
                        if (guarantorForm.guarantorSupervisedByModal) {
                            guarantorForm.guarantorSupervisedByModal.value = guarantorData.SupervisedBy || '';
                        }
                        
                        if (guarantorForm.guarantorSupervisedOnModal) {
                            guarantorForm.guarantorSupervisedOnModal.value = guarantorData.SupervisedOn || '';
                        }

                        // Populate additional fields from Details01 if GuarantorID matches
                        if (responseData.Details01 && responseData.Details01.length > 0) {
                            // Find matching guarantor in Details01
                            const masterData = responseData.Details01.find(g => 
                                g.GuarantorRelevantID === guarantorData.GuarantorID
                            ) || responseData.Details01[0];

                            if (guarantorForm.guarantorTypeModal && masterData.GuarantorTypeID) {
                                guarantorForm.guarantorTypeModal.value = masterData.GuarantorTypeID;
                            }
                            
                            if (guarantorForm.signedByModal && masterData.GuaranteeSignedBy) {
                                guarantorForm.signedByModal.value = masterData.GuaranteeSignedBy;
                            }
                            
                            if (guarantorForm.maxGuaranteeAmountModal) {
                                guarantorForm.maxGuaranteeAmountModal.value = masterData.MaxGuaranteeAmount || 0;
                            }
                            
                            if (guarantorForm.loansGuaranteedModal) {
                                guarantorForm.loansGuaranteedModal.value = masterData.NoOfLoansAlreadyGuaranted || 0;
                            }
                            
                            if (guarantorForm.maxLoansNumberModal) {
                                guarantorForm.maxLoansNumberModal.value = masterData.MaxNoOfLoans || 0;
                            }
                            
                            if (guarantorForm.liabilityModal) {
                                guarantorForm.liabilityModal.value = masterData.Liability || 0;
                            }
                            
                            if (guarantorForm.netWorthModal) {
                                guarantorForm.netWorthModal.value = masterData.NetWorth || 0;
                            }
                        }
                    }

                    // Populate the guarantor table with Details01 data
                    populateGuarantorTable(responseData.Details01 || []);

                    showStatusInModal('Guarantor data loaded successfully!', 'success', 'guarantorStatusMessage');
                } else {
                    showStatusInModal('No guarantor data found for the given criteria.', 'warning', 'guarantorStatusMessage');
                    // Still populate the table with Details01 if available
                    if (responseData.Details01 && responseData.Details01.length > 0) {
                        populateGuarantorTable(responseData.Details01);
                    }
                }
            } else {
                showStatusInModal(result.message || 'Failed to fetch guarantor data', 'error', 'guarantorStatusMessage');
            }
        } catch (error) {
            console.error('Error fetching guarantor data:', error);
            showStatusInModal('An error occurred while fetching guarantor data: ' + error.message, 'error', 'guarantorStatusMessage');
        }
    }

    function populateGuarantorTable(guarantorList) {
        const tableBody = document.querySelector('#guarantorTableModal tbody');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        if (!guarantorList || guarantorList.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.className = 'empty-row';
            emptyRow.innerHTML = '<td colspan="5">No guarantor records found.</td>';
            tableBody.appendChild(emptyRow);
            return;
        }

        guarantorList.forEach(guarantor => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${guarantor.GuarantorRelevantID || ''}</td>
                <td>${guarantor.GuarantorTypeID || ''}</td>
                <td>${guarantor.MaxGuaranteeAmount ? guarantor.MaxGuaranteeAmount.toLocaleString() : '0'}</td>
                <td>${guarantor.NoOfLoansAlreadyGuaranted || 0} / ${guarantor.MaxNoOfLoans || 0}</td>
                <td>${guarantor.GuaranteeSignedBy || ''}</td>
            `;
            row.style.cursor = 'pointer';
            row.addEventListener('click', () => {
                // Populate form with selected guarantor data
                const guarantorForm = document.getElementById('guarantorForm');
                if (guarantorForm) {
                    if (guarantorForm.guarantorIdModal) {
                        guarantorForm.guarantorIdModal.value = guarantor.GuarantorRelevantID || '';
                    }
                    if (guarantorForm.guarantorTypeModal) {
                        guarantorForm.guarantorTypeModal.value = guarantor.GuarantorTypeID || '';
                    }
                    if (guarantorForm.signedByModal) {
                        guarantorForm.signedByModal.value = guarantor.GuaranteeSignedBy || '';
                    }
                    if (guarantorForm.maxGuaranteeAmountModal) {
                        guarantorForm.maxGuaranteeAmountModal.value = guarantor.MaxGuaranteeAmount || 0;
                    }
                    if (guarantorForm.loansGuaranteedModal) {
                        guarantorForm.loansGuaranteedModal.value = guarantor.NoOfLoansAlreadyGuaranted || 0;
                    }
                    if (guarantorForm.maxLoansNumberModal) {
                        guarantorForm.maxLoansNumberModal.value = guarantor.MaxNoOfLoans || 0;
                    }
                    if (guarantorForm.liabilityModal) {
                        guarantorForm.liabilityModal.value = guarantor.Liability || 0;
                    }
                    if (guarantorForm.netWorthModal) {
                        guarantorForm.netWorthModal.value = guarantor.NetWorth || 0;
                    }
                }
            });
            tableBody.appendChild(row);
        });
    }

    function renderTable() {
        tableBody.innerHTML = '';
        if (!currentRecord) {
            const row = document.createElement('tr');
            row.className = 'empty-row';
            const cell = document.createElement('td');
            cell.colSpan = 5;
            cell.textContent = 'No records loaded. Use search to find applications.';
            row.appendChild(cell);
            tableBody.appendChild(row);
            return;
        }
        const row = document.createElement('tr');
        const columns = [
            currentRecord.ApplicationID || 'Pending',
            currentRecord.ClientID || 'Pending',
            currentRecord.Amount || '0',
            currentRecord.AppStatusID || 'Draft',
            currentRecord.ApplicationDate || ''
        ];
        columns.forEach(value => {
            const cell = document.createElement('td');
            cell.textContent = value;
            row.appendChild(cell);
        });
        tableBody.appendChild(row);
    }

    function setActiveSection(section) {
        activeSection = section;
        
        // Update nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.section === section);
        });
        
        // Update nav toggle text and icon
        const navToggle = document.querySelector('.nav-toggle');
        const activeItem = document.querySelector(`.nav-item[data-section="${section}"]`);
        if (activeItem && navToggle) {
            const icon = activeItem.querySelector('i').className;
            const text = activeItem.querySelector('span').textContent;
            navToggle.querySelector('i').className = icon;
            navToggle.querySelector('.nav-toggle-label').textContent = text;
            navToggle.dataset.currentSection = section;
        }
        
        // Update form sections
        document.querySelectorAll('.form-section').forEach(sec => {
            sec.classList.toggle('hidden', sec.dataset.section !== section);
        });
    }

    // Modal Helper Functions
    function showStatusInModal(message, type = 'info', messageId = 'statusMessage') {
        const statusElement = document.getElementById(messageId);
        if (!statusElement) return;

        const textElement = statusElement.querySelector('.status-text');
        if (textElement) {
            textElement.textContent = message;
        }
        
        statusElement.className = `status-message ${type}`;
        statusElement.classList.remove('hidden');
        
        // Auto-hide after 3 seconds for non-error messages
        if (type !== 'error') {
            setTimeout(() => {
                statusElement.classList.add('hidden');
            }, 3000);
        }
        
        // Handle close button
        const closeBtn = statusElement.querySelector('.status-close');
        if (closeBtn) {
            closeBtn.onclick = () => statusElement.classList.add('hidden');
        }
    }

    // Documents Modal Functions
    async function openDocumentsModal() {
        try {
            showStatusInModal('Loading documents...', 'info', 'documentsStatusMessage');
            
            // Get values from main form fields
            const branchId = form.branchId?.value?.trim() || '';
            const accountId = form.accountId?.value?.trim() || '';
            const applicationId = form.applicationId?.value?.trim() || '';
            
            console.log('Opening documents modal with:', { branchId, accountId, applicationId });
            
            // Set context in OverdraftState so documents service can use these values
            OverdraftService.setContext({
                OurBranchID: branchId,
                AccountID: accountId,
                ApplicationID: applicationId,
                OperatorID: getUserContext() || 'web_portal'
            });
            
            console.log('Context set, calling openDocumentsModal...');
            
            // Call the service to open the modal and load documents
            const result = await OverdraftService.openDocumentsModal();
            
            console.log('Documents modal result:', result);
            
            if (result.success) {
                showStatusInModal('Documents loaded successfully', 'success', 'documentsStatusMessage');
            } else {
                showStatusInModal(`Error: ${result.message}`, 'error', 'documentsStatusMessage');
            }
        } catch (error) {
            console.error('Error opening documents modal:', error);
            console.error('Error stack:', error.stack);
            showStatusInModal(`Failed to load documents: ${error.message}`, 'error', 'documentsStatusMessage');
            alert(`An error occurred while loading documents data\n\nDetails: ${error.message}`);
        }
    }

    function closeDocumentsModal() {
        const documentsModal = document.getElementById('documentsModal');
        if (documentsModal) {
            documentsModal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }

    function saveDocumentsData() {
        const form = document.getElementById('documentsForm');
        const formData = new FormData(form);
        
        showStatusInModal('Document data saved successfully', 'success', 'documentsStatusMessage');
        console.log('Document data to be saved:', Object.fromEntries(formData));
        
        setTimeout(() => {
            closeDocumentsModal();
        }, 1500);
    }

    // Interest Rates Modal Functions
    function openInterestRatesModal() {
        const interestRatesModal = document.getElementById('interestRatesModal');
        if (interestRatesModal) {
            interestRatesModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            
            const firstInput = interestRatesModal.querySelector('select, input:not([readonly])');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
            
            showStatusInModal('Interest Rates module opened', 'info', 'interestRatesStatusMessage');
        }
    }

    function closeInterestRatesModal() {
        const interestRatesModal = document.getElementById('interestRatesModal');
        if (interestRatesModal) {
            interestRatesModal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }

    function saveInterestRatesData() {
        const form = document.getElementById('interestRatesForm');
        const formData = new FormData(form);
        
        showStatusInModal('Interest rates data saved successfully', 'success', 'interestRatesStatusMessage');
        console.log('Interest rates data to be saved:', Object.fromEntries(formData));
        
        setTimeout(() => {
            closeInterestRatesModal();
        }, 1500);
    }

    // Guarantor Modal Functions
    function openGuarantorModal() {
        const guarantorModal = document.getElementById('guarantorModal');
        if (guarantorModal) {
            guarantorModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            
            const firstInput = guarantorModal.querySelector('select, input:not([readonly])');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
            
            showStatusInModal('Guarantor module opened', 'info', 'guarantorStatusMessage');
        }
    }

    function closeGuarantorModal() {
        const guarantorModal = document.getElementById('guarantorModal');
        if (guarantorModal) {
            guarantorModal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }

    function saveGuarantorData() {
        const form = document.getElementById('guarantorForm');
        const formData = new FormData(form);
        
        const requiredFields = form.querySelectorAll('[data-required="true"]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                field.classList.add('is-invalid');
                isValid = false;
            } else {
                field.classList.remove('is-invalid');
            }
        });
        
        if (!isValid) {
            showStatusInModal('Please fill in all required fields', 'error', 'guarantorStatusMessage');
            return;
        }
        
        showStatusInModal('Guarantor data saved successfully', 'success', 'guarantorStatusMessage');
        console.log('Guarantor data to be saved:', Object.fromEntries(formData));
        
        setTimeout(() => {
            closeGuarantorModal();
        }, 1500);
    }

    // Navigation toggle and dropdown functionality
    const navToggle = document.querySelector('.nav-toggle');
    const navItems = document.querySelector('.nav-items');
    
    // Initialize dropdown as expanded
    if (navToggle && navItems) {
        navToggle.classList.remove('collapsed');
        navItems.classList.remove('collapsed');
    }
    
    if (navToggle) {
        navToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            navToggle.classList.toggle('collapsed');
            navItems.classList.toggle('collapsed');
        });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (navToggle && navItems && !navToggle.contains(e.target) && !navItems.contains(e.target)) {
            // Don't auto-collapse on outside click - keep dropdown visible
            // navToggle.classList.add('collapsed');
            // navItems.classList.add('collapsed');
        }
    });

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            
            if (section === 'guarantor') {
                // Open guarantor modal instead of switching sections
                openGuarantorModal();
            } else if (section === 'interest-rates') {
                // Open interest rates modal instead of switching sections
                openInterestRatesModal();
            } else if (section === 'documents') {
                // Open documents modal instead of switching sections
                openDocumentsModal();
            } else {
                setActiveSection(section);
                
                // Keep dropdown open after selection
                // navToggle.classList.add('collapsed');
                // navItems.classList.add('collapsed');
            }
        });
    });

    document.querySelectorAll('.btn-inline-search').forEach(btn => {
        btn.addEventListener('click', async () => {
            const parentGroup = btn.closest('.form-control-group');
            const input = parentGroup?.querySelector('input');
            
            if (!input) {
                showStatus('Search field not found', 'error');
                return;
            }
            
            // Determine which field was searched
            const inputId = input.id;
            
            if (inputId === 'applicationId') {
                const appId = input.value.trim();
                if (appId) {
                    await fetchOverdraftApplication(appId, '', '');
                } else {
                    showStatus('Please enter an Application ID to search', 'warning');
                }
            } else if (inputId === 'accountId') {
                const accountId = input.value.trim();
                if (accountId) {
                    await fetchOverdraftApplication('', accountId, '');
                } else {
                    showStatus('Please enter an Account ID to search', 'warning');
                }
            } else if (inputId === 'branchId') {
                const branchId = input.value.trim();
                if (branchId) {
                    await fetchOverdraftApplication('', '', branchId);
                } else {
                    showStatus('Please enter a Branch ID to search', 'warning');
                }
            } else {
                showStatus('This lookup requires backend integration.', 'info');
            }
        });
    });

    const browseBtn = document.querySelector('.btn-browse');
    if (browseBtn) {
        browseBtn.addEventListener('click', () => {
            showStatus('File browsing is handled by the host page. Integrate file picker.', 'warning');
        });
    }

    if (actionButtons.view) {
        actionButtons.view.addEventListener('click', async () => {
            // Get the IDs from the form fields
            const applicationIdField = form.elements['applicationId'];
            const accountIdField = form.elements['accountId'];
            const branchIdField = form.elements['branchId'];
            
            const applicationId = applicationIdField?.value?.trim() || '';
            const accountId = accountIdField?.value?.trim() || '';
            const branchId = branchIdField?.value?.trim() || '';
            
            // Check if at least one ID is provided
            if (!applicationId && !accountId && !branchId) {
                showStatus('Please enter an Application ID, Account ID, or Branch ID in the form to view a record.', 'warning');
                return;
            }
            
            // Fetch using the IDs from the form fields
            await fetchOverdraftApplication(applicationId, accountId, branchId);
            setFormEnabled(false);
        });
    }

    if (actionButtons.add) {
        actionButtons.add.addEventListener('click', () => {
            clearForm();
            setFormEnabled(true);
            const firstRequired = requiredFields[0];
            if (firstRequired) firstRequired.focus();
            showStatus('Add mode enabled. Fill required fields.', 'info');
        });
    }

    if (actionButtons.edit) {
        actionButtons.edit.addEventListener('click', () => {
            if (!currentRecord) {
                showStatus('Load a record before editing.', 'warning');
                return;
            }
            setFormEnabled(true);
            showStatus('Edit mode enabled.', 'info');
        });
    }

    if (actionButtons.save) {
        actionButtons.save.addEventListener('click', () => {
            if (!validateForm()) return;
            const user = getUserContext();
            if (!user) {
                showStatus('User context missing. Connect authentication to proceed.', 'error');
                return;
            }
            const data = collectFormData();
            currentRecord = { ...data };
            updateAudit(user);
            renderTable();
            setFormEnabled(false);
            showStatus('Application saved. Connect backend to persist.', 'success');
        });
    }

    if (actionButtons.cancel) {
        actionButtons.cancel.addEventListener('click', () => {
            if (!isEditMode) {
                showStatus('Nothing to cancel.', 'info');
                return;
            }
            const confirmed = window.confirm('Discard unsaved changes?');
            if (!confirmed) return;
            clearInvalid();
            if (currentRecord) {
                loadRecord(currentRecord);
                renderTable();
            } else {
                clearForm();
                renderTable();
            }
            setFormEnabled(false);
            showStatus('Changes discarded.', 'warning');
        });
    }

    if (actionButtons.delete) {
        actionButtons.delete.addEventListener('click', () => {
            if (!currentRecord) {
                showStatus('No record selected for deletion.', 'warning');
                return;
            }
            const confirmed = window.confirm('Confirm deletion of this record?');
            if (!confirmed) return;
            currentRecord = null;
            clearForm();
            renderTable();
            setFormEnabled(false);
            showStatus('Record cleared. Connect backend to delete permanently.', 'info');
        });
    }

    if (actionButtons.back) {
        actionButtons.back.addEventListener('click', () => {
            if (window.history.length > 1) {
                window.history.back();
            }
        });
    }

    form.addEventListener('input', (event) => {
        const target = event.target;
        if (target.classList.contains('is-invalid')) {
            target.classList.remove('is-invalid');
        }
    });

    // Initialize modal event listeners
    const guarantorModal = document.getElementById('guarantorModal');
    const interestRatesModal = document.getElementById('interestRatesModal');
    const documentsModal = document.getElementById('documentsModal');
    
    // Documents Modal Events
    const documentsModalClose = documentsModal?.querySelector('.modal-close');
    const documentsAddBtn = documentsModal?.querySelector('[data-action="add-document"]');
    const documentsEditBtn = documentsModal?.querySelector('[data-action="edit-document"]');
    const documentsViewBtn = documentsModal?.querySelector('[data-action="view-document"]');
    const documentsDeleteBtn = documentsModal?.querySelector('[data-action="delete-document"]');
    const documentsSaveBtn = documentsModal?.querySelector('[data-action="save-document"]');
    const documentsCancelBtn = documentsModal?.querySelector('[data-action="cancel-document"]');
    const documentsBackBtn = documentsModal?.querySelector('[data-action="back-document"]');
    const showImageBtn = documentsModal?.querySelector('[data-action="show-image"]');

    if (documentsModalClose) {
        documentsModalClose.addEventListener('click', closeDocumentsModal);
    }

    if (documentsAddBtn) {
        documentsAddBtn.addEventListener('click', () => {
            showStatusInModal('Add new document record', 'info', 'documentsStatusMessage');
        });
    }

    if (documentsEditBtn) {
        documentsEditBtn.addEventListener('click', () => {
            showStatusInModal('Edit mode enabled', 'info', 'documentsStatusMessage');
        });
    }

    if (documentsViewBtn) {
        documentsViewBtn.addEventListener('click', async () => {
            try {
                showStatusInModal('Loading document details...', 'info', 'documentsStatusMessage');
                
                // Get DocumentID from the form if available
                const documentId = document.getElementById('documentId')?.value || '';
                
                // Call the service to load documents
                const result = await OverdraftService.openDocumentsModal(documentId);
                
                if (result.success) {
                    showStatusInModal('Document details loaded successfully', 'success', 'documentsStatusMessage');
                } else {
                    showStatusInModal(`Error: ${result.message}`, 'error', 'documentsStatusMessage');
                }
            } catch (error) {
                console.error('Error viewing documents:', error);
                showStatusInModal('Failed to load document details', 'error', 'documentsStatusMessage');
            }
        });
    }

    if (documentsDeleteBtn) {
        documentsDeleteBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to delete this document record?')) {
                showStatusInModal('Document record deleted', 'success', 'documentsStatusMessage');
            }
        });
    }

    if (documentsSaveBtn) {
        documentsSaveBtn.addEventListener('click', saveDocumentsData);
    }

    if (documentsCancelBtn) {
        documentsCancelBtn.addEventListener('click', closeDocumentsModal);
    }

    if (documentsBackBtn) {
        documentsBackBtn.addEventListener('click', closeDocumentsModal);
    }

    if (showImageBtn) {
        showImageBtn.addEventListener('click', () => {
            showStatusInModal('Show image functionality requires backend integration', 'info', 'documentsStatusMessage');
        });
    }

    // Close modals when clicking outside
    if (documentsModal) {
        documentsModal.addEventListener('click', (e) => {
            if (e.target === documentsModal) {
                closeDocumentsModal();
            }
        });
    }
    
    // Interest Rates Modal Events
    const interestRatesModalClose = interestRatesModal?.querySelector('.modal-close');
    const interestRatesAddBtn = interestRatesModal?.querySelector('[data-action="add-interest-rate"]');
    const interestRatesEditBtn = interestRatesModal?.querySelector('[data-action="edit-interest-rate"]');
    const interestRatesViewBtn = interestRatesModal?.querySelector('[data-action="view-interest-rate"]');
    const interestRatesDeleteBtn = interestRatesModal?.querySelector('[data-action="delete-interest-rate"]');
    const interestRatesSaveBtn = interestRatesModal?.querySelector('[data-action="save-interest-rate"]');
    const interestRatesCancelBtn = interestRatesModal?.querySelector('[data-action="cancel-interest-rate"]');

    if (interestRatesModalClose) {
        interestRatesModalClose.addEventListener('click', closeInterestRatesModal);
    }

    if (interestRatesAddBtn) {
        interestRatesAddBtn.addEventListener('click', () => {
            showStatusInModal('Add new interest rate record', 'info', 'interestRatesStatusMessage');
        });
    }

    if (interestRatesEditBtn) {
        interestRatesEditBtn.addEventListener('click', () => {
            showStatusInModal('Edit mode enabled', 'info', 'interestRatesStatusMessage');
        });
    }

    if (interestRatesViewBtn) {
        interestRatesViewBtn.addEventListener('click', async () => {
            // Fetch interest rate data using values from main form or modal
            const applicationId = form.applicationId?.value?.trim();
            const accountId = form.accountId?.value?.trim();
            const branchId = form.branchId?.value?.trim();
            
            await fetchInterestRateData(applicationId, accountId, branchId);
        });
    }

    if (interestRatesDeleteBtn) {
        interestRatesDeleteBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to delete this interest rate record?')) {
                showStatusInModal('Interest rate record deleted', 'success', 'interestRatesStatusMessage');
            }
        });
    }

    if (interestRatesSaveBtn) {
        interestRatesSaveBtn.addEventListener('click', saveInterestRatesData);
    }

    if (interestRatesCancelBtn) {
        interestRatesCancelBtn.addEventListener('click', closeInterestRatesModal);
    }

    // Close modals when clicking outside
    if (interestRatesModal) {
        interestRatesModal.addEventListener('click', (e) => {
            if (e.target === interestRatesModal) {
                closeInterestRatesModal();
            }
        });
    }
    
    // Guarantor Modal Events
    const guarantorModalClose = guarantorModal?.querySelector('.modal-close');
    const guarantorAddBtn = guarantorModal?.querySelector('[data-action="add-guarantor"]');
    const guarantorEditBtn = guarantorModal?.querySelector('[data-action="edit-guarantor"]');
    const guarantorViewBtn = guarantorModal?.querySelector('[data-action="view-guarantor"]');
    const guarantorDeleteBtn = guarantorModal?.querySelector('[data-action="delete-guarantor"]');
    const guarantorSaveBtn = guarantorModal?.querySelector('[data-action="save-guarantor"]');
    const guarantorCancelBtn = guarantorModal?.querySelector('[data-action="cancel-guarantor"]');

    if (guarantorModalClose) guarantorModalClose.addEventListener('click', () => closeGuarantorModal());
    if (guarantorSaveBtn) guarantorSaveBtn.addEventListener('click', () => saveGuarantorData());
    if (guarantorCancelBtn) guarantorCancelBtn.addEventListener('click', () => closeGuarantorModal());
    
    if (guarantorAddBtn) {
        guarantorAddBtn.addEventListener('click', () => {
            const form = document.getElementById('guarantorForm');
            form.reset();
            const formElements = form.querySelectorAll('input, select, textarea');
            formElements.forEach(element => {
                element.disabled = false;
                if (element.hasAttribute('readonly') && !element.id.includes('Modal')) {
                    element.removeAttribute('readonly');
                }
            });
            showStatusInModal('Add mode activated - ready to enter new guarantor', 'info', 'guarantorStatusMessage');
        });
    }
    
    if (guarantorEditBtn) {
        guarantorEditBtn.addEventListener('click', () => {
            const form = document.getElementById('guarantorForm');
            const formElements = form.querySelectorAll('input:not([readonly]), select, textarea');
            formElements.forEach(element => element.disabled = false);
            showStatusInModal('Edit mode activated - form is now editable', 'info', 'guarantorStatusMessage');
        });
    }

    if (guarantorViewBtn) {
        guarantorViewBtn.addEventListener('click', async () => {
            // Get values from main form
            const clientId = form.clientId?.value?.trim();
            const branchId = form.branchId?.value?.trim() || '';
            const accountId = form.accountId?.value?.trim() || '';
            const applicationId = form.applicationId?.value?.trim() || '';
            
            if (!clientId) {
                showStatusInModal('Please enter a Client ID in the main form first', 'error', 'guarantorStatusMessage');
                return;
            }
            
            console.log('Opening guarantor modal with:', { clientId, branchId, accountId, applicationId });
            
            try {
                // Set context from main form before opening guarantor modal
                OverdraftService.setContext({
                    OurBranchID: branchId,
                    AccountID: accountId,
                    ApplicationID: applicationId,
                    OperatorID: getUserContext() || 'web_portal'
                });
                
                console.log('Context set for guarantor, calling openGuarantorModal...');
                
                // Use OverdraftService to open guarantor modal with ClientID
                // This will:
                // 1. Fetch guarantor data using ClientID as GuarantorID
                // 2. Populate the modal with the data
                // 3. Open the modal automatically
                await OverdraftService.openGuarantorModal(clientId, 'guarantorModal', (data) => {
                    console.log('Guarantor data loaded:', data);
                    
                    // Set form to read-only after fetching
                    const guarantorForm = document.getElementById('guarantorForm');
                    if (guarantorForm) {
                        const formElements = guarantorForm.querySelectorAll('input, select, textarea');
                        formElements.forEach(element => {
                            element.disabled = true;
                        });
                    }
                });
            } catch (error) {
                console.error('Error loading guarantor:', error);
                showStatusInModal('Failed to load guarantor data: ' + error.message, 'error', 'guarantorStatusMessage');
            }
        });
    }

    if (guarantorDeleteBtn) {
        guarantorDeleteBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to delete this guarantor record?')) {
                const form = document.getElementById('guarantorForm');
                form.reset();
                showStatusInModal('Guarantor record deleted successfully', 'success', 'guarantorStatusMessage');
            }
        });
    }

    if (guarantorModal) {
        guarantorModal.addEventListener('click', (e) => {
            if (e.target === guarantorModal) closeGuarantorModal();
        });
    }

    // Handle Escape key to close any open modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (!guarantorModal?.classList.contains('hidden')) closeGuarantorModal();
            if (!documentsModal?.classList.contains('hidden')) closeDocumentsModal();
            if (!interestRatesModal?.classList.contains('hidden')) closeInterestRatesModal();
        }
    });

    setFormEnabled(false);
    renderTable();
    showStatus('Enter an Application ID, Account ID, or Branch ID, then click View or Search. Click Add to create new.', 'info');
})();
