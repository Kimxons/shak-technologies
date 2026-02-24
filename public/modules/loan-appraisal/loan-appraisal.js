// Loan Appraisal - Main JavaScript

(async function() {
    'use strict';

    // Load services
    const { ServiceLoader } = window;
    
    try {
        console.log('Loading Loan Appraisal services...');
        await ServiceLoader.loadCore();
        await ServiceLoader.loadLoanApprovalsService();
        await ServiceLoader.loadSearchService();  // For search modals
        console.log('Loan Appraisal services loaded successfully');
    } catch (error) {
        console.error('Error loading services:', error);
        alert('Failed to load required services. Please refresh the page.');
        return;
    }

    // Get services
    const LoanApprovalsService = window.LoanApprovalsService;
    const SearchService = window.SearchService;
    const BranchSearchService = window.BranchSearchService;

    if (!LoanApprovalsService) {
        console.error('LoanApprovalsService not found');
        alert('Loan Approvals Service not available. Please refresh the page.');
        return;
    }

    // DOM Elements - Buttons
    const viewBtn = document.getElementById('viewBtn');
    const editBtn = document.getElementById('editBtn');
    const rejectBtn = document.getElementById('rejectBtn');
    const approveBtn = document.getElementById('approveBtn');
    const cancelBtn = document.getElementById('cancelBtn');

    // Search Buttons
    const searchBranchBtn = document.getElementById('searchBranchBtn');
    const searchWorkflowTypeBtn = document.getElementById('searchWorkflowTypeBtn');
    const searchApplicationBtn = document.getElementById('searchApplicationBtn');

    // Header Fields
    const branchId = document.getElementById('branchId');
    const branchName = document.getElementById('branchName');
    const workflowTypeId = document.getElementById('workflowTypeId');
    const workflowTypeName = document.getElementById('workflowTypeName');
    const applicationDate = document.getElementById('applicationDate');
    const applicationId = document.getElementById('applicationId');
    const applicationName = document.getElementById('applicationName');

    // Recommendation Details
    const createNewAccount = document.getElementById('createNewAccount');
    const existingAccountId = document.getElementById('existingAccountId');
    const existingAccountName = document.getElementById('existingAccountName');
    const loanAmountApplied = document.getElementById('loanAmountApplied');
    const loanAmountRecommended = document.getElementById('loanAmountRecommended');
    const termApplied = document.getElementById('termApplied');
    const termRecommended = document.getElementById('termRecommended');
    const repaymentFrequencyApplied = document.getElementById('repaymentFrequencyApplied');
    const repaymentFrequencyRecommended = document.getElementById('repaymentFrequencyRecommended');
    const repaymentTermApplied = document.getElementById('repaymentTermApplied');
    const repaymentTermRecommended = document.getElementById('repaymentTermRecommended');
    const markingRateApplied = document.getElementById('markingRateApplied');
    const approvedAmountApplied = document.getElementById('approvedAmountApplied');
    const approvedAmountRecommended = document.getElementById('approvedAmountRecommended');
    const markingRateRecommended = document.getElementById('markingRateRecommended');
    const interestRateApplied = document.getElementById('interestRateApplied');
    const interestRateRecommended = document.getElementById('interestRateRecommended');
    const accountClassApplied = document.getElementById('accountClassApplied');
    const accountClassRecommended = document.getElementById('accountClassRecommended');
    const remarks = document.getElementById('remarks');
    const interestRateType = document.getElementById('interestRateType');
    const baseRate = document.getElementById('baseRate');
    const loanType = document.getElementById('loanType');

    // Behind The Scene
    const clientId = document.getElementById('clientId');
    const clientName = document.getElementById('clientName');
    const mailingAddress = document.getElementById('mailingAddress');
    const city = document.getElementById('city');
    const phone = document.getElementById('phone');
    const productId = document.getElementById('productId');
    const currencyId = document.getElementById('currencyId');
    const collateralValue = document.getElementById('collateralValue');
    const noOfGuarantors = document.getElementById('noOfGuarantors');
    const calculationMethod = document.getElementById('calculationMethod');
    const applicationStatus = document.getElementById('applicationStatus');
    const appraisedBy = document.getElementById('appraisedBy');
    const appraisedOn = document.getElementById('appraisedOn');

    // State
    let isEditMode = false;
    let currentAppraisal = null;

    // Event Listeners
    viewBtn.addEventListener('click', viewAppraisal);
    editBtn.addEventListener('click', enableEdit);
    rejectBtn.addEventListener('click', rejectAppraisal);
    approveBtn.addEventListener('click', approveAppraisal);
    cancelBtn.addEventListener('click', cancelOperation);

    // Search Button Event Listeners
    if (searchBranchBtn) searchBranchBtn.addEventListener('click', searchBranch);
    if (searchWorkflowTypeBtn) searchWorkflowTypeBtn.addEventListener('click', searchWorkflowType);
    if (searchApplicationBtn) searchApplicationBtn.addEventListener('click', searchApplication);

    // Auto-lookup on Branch ID enter/tab
    if (branchId) {
        branchId.addEventListener('blur', function() {
            if (this.value.trim() !== '' && !branchName.value) {
                autoPopulateBranchName(this.value.trim());
            }
        });
        branchId.addEventListener('keydown', function(e) {
            if ((e.key === 'Enter' || e.key === 'Tab') && this.value.trim() !== '') {
                if (e.key === 'Enter') e.preventDefault();
                autoPopulateBranchName(this.value.trim());
            }
        });
    }

    // Auto-lookup on Application ID enter/tab - fetch full data
    if (applicationId) {
        applicationId.addEventListener('blur', function() {
            if (this.value.trim() !== '' && branchId.value.trim() !== '') {
                fetchAppraisalData();
            }
        });
        applicationId.addEventListener('keydown', function(e) {
            if ((e.key === 'Enter' || e.key === 'Tab') && this.value.trim() !== '' && branchId.value.trim() !== '') {
                if (e.key === 'Enter') e.preventDefault();
                fetchAppraisalData();
            }
        });
    }

    // Initialize
    function init() {
        disableEdit();
        console.log('Loan Appraisal initialized');
    }

    // Functions
    async function viewAppraisal() {
        if (!branchId.value || !branchId.value.trim()) {
            showMessage('Please enter a Branch ID', 'warning');
            branchId.focus();
            return;
        }

        if (!applicationId.value || !applicationId.value.trim()) {
            showMessage('Please enter an Application ID', 'warning');
            applicationId.focus();
            return;
        }

        fetchAppraisalData();
    }

    async function fetchAppraisalData() {
        try {
            // Get login branch from session or default to '0101'
            const loginBranch = window.AuthService?.getLoggedInBranch?.() || '0101';
            const operatorId = window.AuthService?.getOperatorId?.() || 'JOHN_KIMANI';
            
            const requestData = {
                OurBranchID: branchId.value.trim(),
                LogInBranchID: loginBranch,
                ApplicationID: applicationId.value.trim(),
                RefNo: '0',
                OperatorID: operatorId,
                Direction: '0'
            };

            console.log('Fetching approval data with request:', requestData);
            showMessage('Loading approval data...', 'info');

            const response = await LoanApprovalsService.getWFLoanApprovals(requestData);
            console.log('Approval response:', response);

            // Extract the actual data from CoreApi normalized response
            const apiData = response.data || response;
            console.log('Extracted API data:', apiData);

            if (apiData) {
                let clientData = null;
                let appData = null;

                // Get client data from Details01
                if (apiData.Details01 && apiData.Details01.length > 0) {
                    clientData = apiData.Details01[0];
                    console.log('Client Data from Details01:', clientData);
                }

                // Get application/appraisal data from Details02
                if (apiData.Details02 && apiData.Details02.length > 0) {
                    appData = apiData.Details02[0];
                    console.log('Application Data from Details02:', appData);
                }

                // Populate form with combined data
                if (clientData || appData) {
                    loadAppraisalData(clientData, appData);
                    currentAppraisal = { ...clientData, ...appData };
                    showMessage('Appraisal data loaded successfully', 'success');
                } else {
                    showMessage('No appraisal data found', 'info');
                }
            } else {
                showMessage('No data returned from server', 'info');
            }
        } catch (error) {
            console.error('Error fetching approval data:', error);
            showMessage('Error loading approval: ' + (error.message || 'Unknown error'), 'error');
        }
    }

    function loadAppraisalData(clientData, appData) {
        console.log('Populating form with data');
        console.log('Client Data:', clientData);
        console.log('Application Data:', appData);

        // Header fields (from Details02)
        if (appData) {
            if (appData.OurBranchID) {
                branchId.value = appData.OurBranchID;
                // Auto-populate branch name if available
                if (appData.BranchName) {
                    branchName.value = appData.BranchName;
                } else {
                    // Attempt to fetch branch name
                    autoPopulateBranchName(appData.OurBranchID);
                }
            }
            if (appData.WFAdvTypeID) workflowTypeId.value = appData.WFAdvTypeID;
            if (appData.WFAdvType) workflowTypeName.value = appData.WFAdvType;
            if (appData.ApplicationID) applicationId.value = appData.ApplicationID;
            
            if (appData.ApplicationDate) {
                const appDate = new Date(appData.ApplicationDate);
                applicationDate.value = appDate.toISOString().split('T')[0];
            }

            // Existing Account Info
            createNewAccount.checked = appData.CreateNewAccount || false;
            if (appData.ExistingAccountID) existingAccountId.value = appData.ExistingAccountID;
            if (appData.ExistingAccountName) existingAccountName.value = appData.ExistingAccountName;

            // Applied values (from Details02)
            if (appData.LoanAmount) loanAmountApplied.value = appData.LoanAmount;
            if (appData.Term) termApplied.value = appData.Term;
            if (appData.LoanPeriod || appData.LoanPeriodID) {
                repaymentFrequencyApplied.value = appData.LoanPeriod || appData.LoanPeriodID || '';
            }
            if (appData.RepaymentTerm || appData.Term) {
                repaymentTermApplied.value = appData.RepaymentTerm || appData.Term || '';
            }
            if (appData.MarkingRate !== undefined) markingRateApplied.value = appData.MarkingRate;
            if (appData.InterestRate) interestRateApplied.value = appData.InterestRate;
            if (appData.AccountClassName || appData.AccountClassID) {
                accountClassApplied.value = appData.AccountClassName || appData.AccountClassID || '';
            }

            // Recommended values - initialize with applied values
            if (appData.LoanAmount) loanAmountRecommended.value = appData.LoanAmount;
            if (appData.Term) termRecommended.value = appData.Term;
            if (appData.MarkingRate !== undefined) markingRateRecommended.value = appData.MarkingRate;
            if (appData.InterestRate) interestRateRecommended.value = appData.InterestRate;
            if (appData.RepaymentTerm || appData.Term) {
                repaymentTermRecommended.value = appData.RepaymentTerm || appData.Term || '';
            }
            if (appData.Remarks || appData.RecommendationRemarks) {
                remarks.value = appData.Remarks || appData.RecommendationRemarks || '';
            }

            // Map frequency ID to dropdown - try multiple field names
            const freqId = appData.RepaymentFrequencyID || appData.LoanPeriodID || appData.LoanPeriod;
            if (freqId) {
                const frequencyMap = {
                    'D': 'daily',
                    'W': 'weekly',
                    'BW': 'bi-weekly',
                    'M': 'monthly',
                    'Monthly': 'monthly',
                    'Q': 'quarterly',
                    'SA': 'semi-annually',
                    'Y': 'yearly'
                };
                repaymentFrequencyRecommended.value = frequencyMap[freqId] || freqId || '';
            }

            // Additional Info - try multiple field name variations
            if (appData.InterestType || appData.InterestRateType) {
                interestRateType.value = appData.InterestType || appData.InterestRateType || '';
            }
            if (appData.BaseRate !== undefined) baseRate.value = appData.BaseRate;
            
            // Appraisal Info
            if (appData.AppraisedBy || appData.RecommendedBy) {
                appraisedBy.value = appData.AppraisedBy || appData.RecommendedBy || '';
            }
            if (appData.AppraisedOn || appData.RecommendedOn) {
                const appraisedDate = new Date(appData.AppraisedOn || appData.RecommendedOn);
                appraisedOn.value = appraisedDate.toLocaleString();
            }
            if (appData.RecordStatus) applicationStatus.value = appData.RecordStatus;
        }

        // Behind The Scene - Try clientData first, then fallback to appData
        // (Sometimes Details01 is empty and client info is in Details02)
        const clientSource = clientData || appData;
        
        if (clientSource) {
            if (clientSource.ClientID) {
                clientId.value = clientSource.ClientID;
                if (clientSource.ClientName && clientName) {
                    clientName.value = clientSource.ClientName;
                }
            }
            if (clientSource.Address1 || clientSource.MailingAddress) {
                mailingAddress.value = clientSource.Address1 || clientSource.MailingAddress || '';
            }
            if (clientSource.City) city.value = clientSource.City;
            if (clientSource.Phone1 || clientSource.Phone) {
                phone.value = clientSource.Phone1 || clientSource.Phone || '';
            }
            if (clientSource.ProductID) productId.value = clientSource.ProductID;
            if (clientSource.CurrencyID) currencyId.value = clientSource.CurrencyID;
            if (clientSource.CollateralValue !== undefined) collateralValue.value = clientSource.CollateralValue;
            if (clientSource.NoOfGuarantors !== undefined) noOfGuarantors.value = clientSource.NoOfGuarantors;
            if (clientSource.CalculationMethod) calculationMethod.value = clientSource.CalculationMethod;
            if (clientSource.LoanType || clientSource.LoanTypeID) {
                loanType.value = clientSource.LoanType || clientSource.LoanTypeID || '';
            }
            if (clientSource.WFAppStatus || clientSource.RecordStatus) {
                applicationStatus.value = clientSource.WFAppStatus || clientSource.RecordStatus || '';
            }

            // Also use client data for applied values if not in appData
            if (!appData || !appData.LoanAmount) {
                if (clientSource.LoanAmount) loanAmountApplied.value = clientSource.LoanAmount;
            }
            if (!appData || !appData.Term) {
                if (clientSource.LoanTerm || clientSource.Term) {
                    termApplied.value = clientSource.LoanTerm || clientSource.Term;
                }
            }
            if (!appData || !appData.InterestRate) {
                if (clientSource.InterestRate) interestRateApplied.value = clientSource.InterestRate;
            }
            if (!appData || !appData.AccountClassName) {
                if (clientSource.AccountClassName) accountClassApplied.value = clientSource.AccountClassName;
            }
        }
        
        // Log all available fields for debugging
        console.log('All available appData fields:', appData ? Object.keys(appData) : 'none');
    }

    function enableEdit() {
        if (!currentAppraisal && !applicationId.value) {
            showMessage('Please load an application first.', 'warning');
            return;
        }

        isEditMode = true;
        enableFormFields();

        viewBtn.disabled = true;
        editBtn.disabled = true;
        rejectBtn.disabled = false;
        approveBtn.disabled = false;
        cancelBtn.disabled = false;

        showMessage('Edit mode enabled', 'info');
    }

    function enableFormFields() {
        // Enable recommended fields only
        loanAmountRecommended.removeAttribute('readonly');
        termRecommended.removeAttribute('readonly');
        repaymentFrequencyRecommended.removeAttribute('disabled');
        repaymentTermRecommended.removeAttribute('readonly');
        markingRateRecommended.removeAttribute('readonly');
        interestRateRecommended.removeAttribute('readonly');
        accountClassRecommended.removeAttribute('disabled');
        remarks.removeAttribute('readonly');
        createNewAccount.disabled = false;
    }

    function disableEdit() {
        isEditMode = false;

        // Disable recommended fields
        loanAmountRecommended.setAttribute('readonly', true);
        termRecommended.setAttribute('readonly', true);
        repaymentFrequencyRecommended.setAttribute('disabled', true);
        repaymentTermRecommended.setAttribute('readonly', true);
        markingRateRecommended.setAttribute('readonly', true);
        interestRateRecommended.setAttribute('readonly', true);
        accountClassRecommended.setAttribute('disabled', true);
        remarks.setAttribute('readonly', true);
        createNewAccount.disabled = true;

        viewBtn.disabled = false;
        editBtn.disabled = false;
        rejectBtn.disabled = true;
        approveBtn.disabled = true;
        cancelBtn.disabled = true;
    }

    function rejectAppraisal() {
        if (!currentAppraisal) {
            showMessage('No appraisal loaded to reject', 'warning');
            return;
        }

        if (confirm('Are you sure you want to reject this appraisal?')) {
            showMessage('Reject appraisal feature - connect to backend', 'info');
            // TODO: Call backend API
            disableEdit();
        }
    }

    async function approveAppraisal() {
        if (!validateForm()) {
            return;
        }

        if (confirm('Are you sure you want to approve this appraisal?')) {
            try {
                // Get current operator and date
                const operatorId = window.AuthService?.getOperatorId?.() || 'JOHN_KIMANI';
                const currentDate = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD

                // Map form data to SP parameters
                const requestData = {
                    OurBranchID: branchId.value.trim(),
                    ApplicationID: applicationId.value.trim(),
                    RefNo: currentAppraisal?.RefNo || 1,
                    CreateNewAccount: createNewAccount.checked ? 1 : 0,
                    ExistingAccountID: existingAccountId.value.trim() || '',
                    LoanAmount: parseFloat(loanAmountRecommended.value) || 0,
                    MarkingRate: parseFloat(markingRateRecommended.value) || 0,
                    MarkingRateSign: '+', // Default to positive, can be enhanced with UI
                    InterestRate: parseFloat(interestRateRecommended.value) || 0,
                    Penalty: currentAppraisal?.Penalty || 0,
                    PenaltySpreadSign: '+',
                    PenaltySpread: currentAppraisal?.PenaltySpread || 0,
                    GracePeriod: currentAppraisal?.GracePeriod || 0,
                    Term: parseInt(termRecommended.value) || 0,
                    RepaymentTerm: parseInt(repaymentTermRecommended.value) || 0,
                    RepaymentFrequencyID: repaymentFrequencyRecommended.value || '',
                    AccountClassID: accountClassRecommended.value || '',
                    Remarks: remarks.value.trim() || '',
                    AppraisedBy: operatorId,
                    AppraisedOn: currentDate,
                    AppraisedAmount: parseFloat(approvedAmountRecommended.value) || parseFloat(loanAmountRecommended.value) || 0
                };

                console.log('Submitting appraisal data:', requestData);
                showMessage('Saving appraisal...', 'info');

                const response = await LoanApprovalsService.editWFLoanAppraisals(requestData);
                console.log('Edit appraisal response:', response);

                // Check response for success
                const apiData = response.data || response;
                if (apiData && apiData.ErrorMessage) {
                    showMessage(`Error: ${apiData.ErrorMessage}`, 'error');
                    return;
                }

                showMessage('Appraisal saved successfully!', 'success');
                disableEdit();
                currentAppraisal = { ...currentAppraisal, ...requestData };

            } catch (error) {
                console.error('Error saving appraisal:', error);
                showMessage(`Failed to save appraisal: ${error.message}`, 'error');
            }
        }
    }

    function cancelOperation() {
        if (isEditMode) {
            if (confirm('Discard changes?')) {
                disableEdit();
                if (currentAppraisal) {
                    loadAppraisalData(currentAppraisal, currentAppraisal);
                } else {
                    clearRecommendedFields();
                }
            }
        }
    }

    function validateForm() {
        if (!applicationId.value.trim()) {
            showMessage('Please select an Application ID', 'error');
            return false;
        }

        if (!loanAmountRecommended.value || parseFloat(loanAmountRecommended.value) <= 0) {
            showMessage('Please enter a valid Recommended Loan Amount', 'error');
            return false;
        }

        if (!termRecommended.value || parseInt(termRecommended.value) <= 0) {
            showMessage('Please enter a valid Recommended Term', 'error');
            return false;
        }

        if (!repaymentFrequencyRecommended.value) {
            showMessage('Please select Recommended Repayment Frequency', 'error');
            return false;
        }

        return true;
    }

    function clearRecommendedFields() {
        loanAmountRecommended.value = '';
        termRecommended.value = '';
        repaymentFrequencyRecommended.value = '';
        repaymentTermRecommended.value = '';
        markingRateRecommended.value = '';
        interestRateRecommended.value = '';
        accountClassRecommended.value = '';
        remarks.value = '';
        createNewAccount.checked = false;
    }

    // =====================================================
    // SEARCH FUNCTIONS
    // =====================================================

    /**
     * Search Branch - opens branch search modal
     */
    async function searchBranch() {
        console.log('[LoanAppraisal] Opening Branch search modal');
        
        if (BranchSearchService && typeof BranchSearchService.openSearchModal === 'function') {
            BranchSearchService.openSearchModal((selectedBranchId, selectedBranchName) => {
                console.log('[LoanAppraisal] Branch selected:', selectedBranchId, selectedBranchName);
                branchId.value = selectedBranchId || '';
                branchName.value = selectedBranchName || '';
                showMessage('Branch selected: ' + selectedBranchName, 'success');
            });
        } else {
            // Fallback - direct lookup if modal not available
            console.warn('[LoanAppraisal] BranchSearchService not available, using fallback');
            if (!branchId.value.trim()) {
                showMessage('Please enter a Branch ID', 'warning');
                return;
            }
            await autoPopulateBranchName(branchId.value.trim());
        }
    }

    /**
     * Auto-populate branch name from branch ID
     */
    async function autoPopulateBranchName(branchIdValue) {
        try {
            console.log('[LoanAppraisal] Auto-populating branch name for:', branchIdValue);
            
            if (BranchSearchService && typeof BranchSearchService.getBranches === 'function') {
                const response = await BranchSearchService.getBranches('00');
                const branches = response?.data || response?.Details || [];
                
                const branch = branches.find(b => 
                    (b.BranchID || b.OurBranchID || b.branchId || '') === branchIdValue
                );
                
                if (branch) {
                    branchName.value = branch.BranchName || branch.Name || branch.branchName || '';
                    console.log('[LoanAppraisal] Branch found:', branchName.value);
                } else {
                    branchName.value = '';
                    console.warn('[LoanAppraisal] Branch not found for ID:', branchIdValue);
                }
            }
        } catch (error) {
            console.error('[LoanAppraisal] Error auto-populating branch name:', error);
            branchName.value = '';
        }
    }

    /**
     * Search Workflow Type - opens workflow type search modal
     * Uses p_GetSearchResult with @TableID='WFAdvTypeID' and @AdvFilterString='ModuleID = ''LN'''
     */
    async function searchWorkflowType() {
        console.log('[LoanAppraisal] Opening Workflow Type search modal');
        
        try {
            // Create modal dynamically if it doesn't exist
            let modal = document.getElementById('workflowTypeSearchModal');
            
            if (!modal) {
                modal = createWorkflowTypeSearchModal();
                document.body.appendChild(modal);
            }
            
            // Show modal
            const bsModal = window.bootstrap?.Modal.getOrCreateInstance(modal, { backdrop: 'static' });
            bsModal?.show();
            
            // Fetch workflow types on modal open
            await fetchWorkflowTypes(modal);
            
        } catch (error) {
            console.error('[LoanAppraisal] Error opening workflow type search:', error);
            showMessage('Error opening workflow type search: ' + error.message, 'error');
        }
    }

    /**
     * Create Workflow Type Search Modal
     */
    function createWorkflowTypeSearchModal() {
        const modal = document.createElement('div');
        modal.id = 'workflowTypeSearchModal';
        modal.className = 'modal fade';
        modal.tabIndex = -1;
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content shadow-lg border-0">
                    <div class="modal-header bg-primary text-white py-3">
                        <h5 class="modal-title fw-bold"><i class="bi bi-search me-2"></i>Workflow Type Search</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div class="card border-0 bg-light mb-4">
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-5">
                                        <label class="form-label fw-semibold mb-2 d-block">Type ID</label>
                                        <input type="text" class="form-control form-control-sm" id="wfTypeIdFilter" placeholder="Filter by ID...">
                                    </div>
                                    <div class="col-md-5">
                                        <label class="form-label fw-semibold mb-2 d-block">Description</label>
                                        <input type="text" class="form-control form-control-sm" id="wfTypeDescFilter" placeholder="Filter by description...">
                                    </div>
                                    <div class="col-md-2 d-flex align-items-end">
                                        <button type="button" class="btn btn-primary w-100 shadow-sm" id="wfTypeSearchBtn">
                                            <i class="bi bi-search me-1"></i> Search
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-primary bg-gradient text-white px-3 py-2 rounded-top d-flex align-items-center">
                            <i class="bi bi-table me-2"></i>
                            <strong>Search Results</strong>
                        </div>
                        <div class="border border-top-0 rounded-bottom">
                            <div class="table-responsive" style="max-height: 300px; overflow-y: auto;">
                                <table class="table table-hover table-striped mb-0" id="wfTypeSearchTable">
                                    <thead class="table-light" style="position: sticky; top: 0; z-index: 10;">
                                        <tr>
                                            <th style="width: 50px;">#</th>
                                            <th style="width: 25%;">Type ID</th>
                                            <th>Description</th>
                                        </tr>
                                    </thead>
                                    <tbody></tbody>
                                </table>
                            </div>
                        </div>
                        <div class="mt-3 p-2 bg-light rounded">
                            <small class="text-muted"><i class="bi bi-info-circle me-1"></i><em>Click a row to select the workflow type.</em></small>
                        </div>
                    </div>
                    <div class="modal-footer bg-light">
                        <button type="button" class="btn btn-secondary px-4" data-bs-dismiss="modal">
                            <i class="bi bi-x-circle me-1"></i> Close
                        </button>
                    </div>
                </div>
            </div>`;
        
        // Add search button event listener
        setTimeout(() => {
            const searchBtn = modal.querySelector('#wfTypeSearchBtn');
            if (searchBtn) {
                searchBtn.addEventListener('click', () => fetchWorkflowTypes(modal));
            }
            
            // Add filter on enter key
            const idFilter = modal.querySelector('#wfTypeIdFilter');
            const descFilter = modal.querySelector('#wfTypeDescFilter');
            [idFilter, descFilter].forEach(input => {
                if (input) {
                    input.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') fetchWorkflowTypes(modal);
                    });
                }
            });
        }, 100);
        
        return modal;
    }

    /**
     * Fetch Workflow Types from database using p_GetSearchResult
     */
    async function fetchWorkflowTypes(modal) {
        const tbody = modal.querySelector('#wfTypeSearchTable tbody');
        tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4"><i class="bi bi-hourglass-split me-2"></i>Loading...</td></tr>';
        
        try {
            // Use SearchService or direct API call
            const env = window.Environment || {};
            const baseUrl = (env.baseUrlCommon || 'http://localhost:5000').replace(/\/+$/, '');
            
            const now = new Date();
            const pad2 = n => String(n).padStart(2, '0');
            const reqTime = `${pad2(now.getMonth() + 1)}/${pad2(now.getDate())}/${now.getFullYear()} ${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
            
            const requestData = {
                TableID: 'WFAdvTypeID',
                AdvFilterString: "ModuleID = 'LN'"
            };
            
            const envelope = {
                RequestID: 'dbo.p_GetSearchResult',
                FormId: 'dbo.p_GetSearchResult',
                RequestData: requestData,
                RequestTime: reqTime,
                AppName: 'PROJECT_KAIRO',
                Checksum: ''
            };
            
            console.log('[LoanAppraisal] Fetching workflow types with:', requestData);
            
            const response = await window.CoreApi.post(`${baseUrl}/api/OldAPI`, envelope);
            console.log('[LoanAppraisal] Workflow types response:', response);
            
            let workflowTypes = response?.data || response?.Details || [];
            
            // Apply filters
            const idFilter = (modal.querySelector('#wfTypeIdFilter')?.value || '').toLowerCase();
            const descFilter = (modal.querySelector('#wfTypeDescFilter')?.value || '').toLowerCase();
            
            if (idFilter) {
                workflowTypes = workflowTypes.filter(wf => 
                    (wf.WFAdvTypeID || '').toLowerCase().includes(idFilter)
                );
            }
            if (descFilter) {
                workflowTypes = workflowTypes.filter(wf => 
                    (wf.Description || '').toLowerCase().includes(descFilter)
                );
            }
            
            tbody.innerHTML = '';
            
            if (!Array.isArray(workflowTypes) || workflowTypes.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-4"><i class="bi bi-inbox me-2"></i>No workflow types found</td></tr>';
                return;
            }
            
            workflowTypes.forEach((wf, idx) => {
                const typeId = wf.WFAdvTypeID || '';
                const description = wf.Description || '';
                
                const tr = document.createElement('tr');
                tr.style.cursor = 'pointer';
                tr.innerHTML = `
                    <td class="text-center fw-semibold">${idx + 1}</td>
                    <td>${typeId}</td>
                    <td>${description}</td>
                `;
                tr.addEventListener('click', () => {
                    workflowTypeId.value = typeId;
                    workflowTypeName.value = description;
                    
                    const bsModal = window.bootstrap?.Modal.getInstance(modal);
                    bsModal?.hide();
                    
                    showMessage('Workflow type selected: ' + typeId + ' - ' + description, 'success');
                });
                tbody.appendChild(tr);
            });
            
        } catch (error) {
            console.error('[LoanAppraisal] Error fetching workflow types:', error);
            tbody.innerHTML = `<tr><td colspan="3" class="text-center text-danger py-4"><i class="bi bi-exclamation-triangle me-2"></i>Error: ${error.message || error}</td></tr>`;
        }
    }

    /**
     * Search Application - opens application search modal
     * Upon selection, fetches full data using p_GetWFLoanAppraisals
     */
    async function searchApplication() {
        console.log('[LoanAppraisal] Opening Application search modal');
        
        if (!branchId.value.trim()) {
            showMessage('Please select a Branch ID first', 'warning');
            branchId.focus();
            return;
        }
        
        if (!workflowTypeId.value.trim()) {
            showMessage('Please select a Workflow Type ID first', 'warning');
            searchWorkflowType();
            return;
        }
        
        try {
            // Create modal dynamically if it doesn't exist
            let modal = document.getElementById('applicationSearchModal');
            
            if (!modal) {
                modal = createApplicationSearchModal();
                document.body.appendChild(modal);
            }
            
            // Show modal
            const bsModal = window.bootstrap?.Modal.getOrCreateInstance(modal, { backdrop: 'static' });
            bsModal?.show();
            
            // Fetch applications on modal open
            await fetchApplications(modal);
            
        } catch (error) {
            console.error('[LoanAppraisal] Error opening application search:', error);
            showMessage('Error opening application search: ' + error.message, 'error');
        }
    }

    /**
     * Create Application Search Modal
     */
    function createApplicationSearchModal() {
        const modal = document.createElement('div');
        modal.id = 'applicationSearchModal';
        modal.className = 'modal fade';
        modal.tabIndex = -1;
        modal.innerHTML = `
            <div class="modal-dialog modal-xl">
                <div class="modal-content shadow-lg border-0">
                    <div class="modal-header bg-primary text-white py-3">
                        <h5 class="modal-title fw-bold"><i class="bi bi-search me-2"></i>Application Search</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div class="card border-0 bg-light mb-4">
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-4">
                                        <label class="form-label fw-semibold mb-2 d-block">Application ID</label>
                                        <input type="text" class="form-control form-control-sm" id="appIdFilter" placeholder="Filter by Application ID...">
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label fw-semibold mb-2 d-block">Client Name</label>
                                        <input type="text" class="form-control form-control-sm" id="appClientFilter" placeholder="Filter by Client name...">
                                    </div>
                                    <div class="col-md-2 d-flex align-items-end">
                                        <button type="button" class="btn btn-primary w-100 shadow-sm" id="appSearchBtn">
                                            <i class="bi bi-search me-1"></i> Search
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-primary bg-gradient text-white px-3 py-2 rounded-top d-flex align-items-center">
                            <i class="bi bi-table me-2"></i>
                            <strong>Search Results</strong>
                        </div>
                        <div class="border border-top-0 rounded-bottom">
                            <div class="table-responsive" style="max-height: 350px; overflow-y: auto;">
                                <table class="table table-hover table-striped mb-0" id="appSearchTable">
                                    <thead class="table-light" style="position: sticky; top: 0; z-index: 10;">
                                        <tr>
                                            <th style="width: 40px;">#</th>
                                            <th style="width: 20%;">Application ID</th>
                                            <th style="width: 20%;">Client ID</th>
                                            <th style="width: 35%;">Client Name</th>
                                            <th style="width: 15%;">Product</th>
                                        </tr>
                                    </thead>
                                    <tbody></tbody>
                                </table>
                            </div>
                        </div>
                        <div class="mt-3 p-2 bg-light rounded">
                            <small class="text-muted"><i class="bi bi-info-circle me-1"></i><em>Click a row to select and load the application details.</em></small>
                        </div>
                    </div>
                    <div class="modal-footer bg-light">
                        <button type="button" class="btn btn-secondary px-4" data-bs-dismiss="modal">
                            <i class="bi bi-x-circle me-1"></i> Close
                        </button>
                    </div>
                </div>
            </div>`;
        
        // Add search button event listener
        setTimeout(() => {
            const searchBtn = modal.querySelector('#appSearchBtn');
            if (searchBtn) {
                searchBtn.addEventListener('click', () => fetchApplications(modal));
            }
            
            // Add filter on enter key
            const idFilter = modal.querySelector('#appIdFilter');
            const clientFilter = modal.querySelector('#appClientFilter');
            [idFilter, clientFilter].forEach(input => {
                if (input) {
                    input.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') fetchApplications(modal);
                    });
                }
            });
        }, 100);
        
        return modal;
    }

    /**
     * Fetch Applications from database using p_GetSearchResult with TableID='WFLoanIndvAppID'
     * Filter: OurBranchID='xxxx' AND WFAppStatusID = 'PEN' AND WFAdvStageID in('30SANC','20APPR')
     */
    async function fetchApplications(modal) {
        const tbody = modal.querySelector('#appSearchTable tbody');
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4"><i class="bi bi-hourglass-split me-2"></i>Loading applications...</td></tr>';
        
        try {
            const env = window.Environment || {};
            const baseUrl = (env.baseUrlCommon || 'http://localhost:5000').replace(/\/+$/, '');
            
            const now = new Date();
            const pad2 = n => String(n).padStart(2, '0');
            const reqTime = `${pad2(now.getMonth() + 1)}/${pad2(now.getDate())}/${now.getFullYear()} ${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
            
            const branchValue = branchId.value.trim();
            
            // Use p_GetSearchResult with TableID='WFLoanIndvAppID' like legacy
            const requestData = {
                TableID: 'WFLoanIndvAppID',
                AdvFilterString: `OurBranchID='${branchValue}' AND WFAppStatusID = 'PEN' AND WFAdvStageID in('30SANC','20APPR')`
            };
            
            const envelope = {
                RequestID: 'dbo.p_GetSearchResult',
                FormId: 'dbo.p_GetSearchResult',
                RequestData: requestData,
                RequestTime: reqTime,
                AppName: 'PROJECT_KAIRO',
                Checksum: ''
            };
            
            console.log('[LoanAppraisal] Fetching applications with:', requestData);
            
            const response = await window.CoreApi.post(`${baseUrl}/api/OldAPI`, envelope);
            console.log('[LoanAppraisal] Applications response:', response);
            
            let applications = response?.data || response?.Details || [];
            
            // Apply filters from modal inputs
            const idFilter = (modal.querySelector('#appIdFilter')?.value || '').toLowerCase();
            const clientFilter = (modal.querySelector('#appClientFilter')?.value || '').toLowerCase();
            
            if (idFilter) {
                applications = applications.filter(app => 
                    (app.ApplicationID || '').toLowerCase().includes(idFilter)
                );
            }
            if (clientFilter) {
                applications = applications.filter(app => 
                    (app.ClientName || '').toLowerCase().includes(clientFilter)
                );
            }
            
            tbody.innerHTML = '';
            
            if (!Array.isArray(applications) || applications.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4"><i class="bi bi-inbox me-2"></i>No applications found</td></tr>';
                return;
            }
            
            applications.forEach((app, idx) => {
                const tr = document.createElement('tr');
                tr.style.cursor = 'pointer';
                tr.innerHTML = `
                    <td class="text-center fw-semibold">${idx + 1}</td>
                    <td>${app.ApplicationID || ''}</td>
                    <td>${app.ClientID || ''}</td>
                    <td>${app.ClientName || ''}</td>
                    <td>${app.ProductID || app.Product || ''}</td>
                `;
                tr.addEventListener('click', () => {
                    applicationId.value = app.ApplicationID || '';
                    
                    const bsModal = window.bootstrap?.Modal.getInstance(modal);
                    bsModal?.hide();
                    
                    // Fetch full application data using p_GetWFLoanAppraisals
                    fetchAppraisalData();
                });
                tbody.appendChild(tr);
            });
            
        } catch (error) {
            console.error('[LoanAppraisal] Error fetching applications:', error);
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4"><i class="bi bi-exclamation-triangle me-2"></i>Error: ${error.message || error}</td></tr>`;
        }
    }

    /**
     * Get status badge class
     */
    function getStatusBadgeClass(status) {
        const statusLower = (status || '').toLowerCase();
        if (statusLower.includes('approved') || statusLower.includes('active')) return 'bg-success';
        if (statusLower.includes('pending') || statusLower.includes('appraisal')) return 'bg-warning text-dark';
        if (statusLower.includes('rejected') || statusLower.includes('declined')) return 'bg-danger';
        return 'bg-secondary';
    }

    // Spinner Controls
    window.incrementMarkingRate = function() {
        const currentValue = parseFloat(markingRateRecommended.value) || 0;
        markingRateRecommended.value = (currentValue + 0.1).toFixed(2);
    };

    window.decrementMarkingRate = function() {
        const currentValue = parseFloat(markingRateRecommended.value) || 0;
        if (currentValue > 0) {
            markingRateRecommended.value = (currentValue - 0.1).toFixed(2);
        }
    };

    function showMessage(message, type) {
        const icon = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };

        console.log(`${icon[type] || ''} ${message}`);
        alert(`${icon[type] || ''} ${message}`);
    }

    // Initialize on load
    init();

})();
