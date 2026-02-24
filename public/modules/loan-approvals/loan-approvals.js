// Loan Approvals Module JavaScript
// Integrated with LoanApprovalsService - uses p_GetWFLoanApprovals, p_EditWFLoanApprovals, p_RejectWFLoanApprovals

(async function() {
    'use strict';

    // Load required services
    const { ServiceLoader } = window;
    
    try {
        await ServiceLoader.loadCore();
        await ServiceLoader.loadLoanApprovalsService();
        await ServiceLoader.loadSearchService();
        console.log('✅ All services loaded successfully');
    } catch (error) {
        console.error('❌ Failed to load services:', error);
        alert('Failed to load required services. Please refresh the page.');
        return;
    }

    // Get service references
    const LoanApprovalsService = window.LoanApprovalsService;
    const BranchSearchService = window.BranchSearchService;
    const CoreApi = window.CoreApi;

    // State
    let currentApproval = null;
    let currentRefNo = 1;
    let isEditMode = false;
    let workflowTypesCache = [];
    let applicationsCache = [];

    // DOM Elements - Buttons
    const viewBtn = document.getElementById('viewBtn');
    const editBtn = document.getElementById('editBtn');
    const rejectBtn = document.getElementById('rejectBtn');
    const approveBtn = document.getElementById('approveBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const navPrevBtn = document.getElementById('navPrevBtn');
    const navNextBtn = document.getElementById('navNextBtn');

    // Search Buttons
    const searchBranchBtn = document.getElementById('searchBranchBtn');
    const searchWorkflowBtn = document.getElementById('searchWorkflowBtn');
    const searchApplicationBtn = document.getElementById('searchApplicationBtn');

    // Form fields
    const branchIdField = document.getElementById('branchId');
    const branchDescriptionField = document.getElementById('branchDescription');
    const referenceNoField = document.getElementById('referenceNo');
    const workflowTypeIdField = document.getElementById('workflowTypeId');
    const workflowTypeNameField = document.getElementById('workflowTypeName');
    const applicationIdField = document.getElementById('applicationId');
    const applicationNameField = document.getElementById('applicationName');
    const applicationDateField = document.getElementById('applicationDate');
    const approvalDetailsTableBody = document.getElementById('approvalDetailsTableBody');

    // Initialize module
    function init() {
        attachEventListeners();
        initializeSectionToggles();
        console.log('✅ Loan Approvals module initialized');
    }

    // Initialize section toggle functionality
    function initializeSectionToggles() {
        document.querySelectorAll('[data-section-toggle]').forEach(header => {
            header.addEventListener('click', () => {
                const section = header.closest('[data-section]');
                const content = section.querySelector('[data-section-content]');
                const icon = header.querySelector('.section-toggle-btn i');
                const btn = header.querySelector('.section-toggle-btn');
                
                if (content.style.display === 'none') {
                    content.style.display = 'block';
                    icon.className = 'bi bi-chevron-up';
                    btn.setAttribute('aria-expanded', 'true');
                } else {
                    content.style.display = 'none';
                    icon.className = 'bi bi-chevron-down';
                    btn.setAttribute('aria-expanded', 'false');
                }
            });
        });
    }

    // Attach event listeners
    function attachEventListeners() {
        // Search buttons
        if (searchBranchBtn) searchBranchBtn.addEventListener('click', searchBranch);
        if (searchWorkflowBtn) searchWorkflowBtn.addEventListener('click', searchWorkflowType);
        if (searchApplicationBtn) searchApplicationBtn.addEventListener('click', searchApplication);

        // Action buttons
        if (viewBtn) viewBtn.addEventListener('click', handleView);
        if (editBtn) editBtn.addEventListener('click', handleEdit);
        if (rejectBtn) rejectBtn.addEventListener('click', handleReject);
        if (approveBtn) approveBtn.addEventListener('click', handleApprove);
        if (cancelBtn) cancelBtn.addEventListener('click', handleCancel);

        // Navigation buttons - these change Application ID and repopulate everything
        if (navPrevBtn) navPrevBtn.addEventListener('click', () => navigateRecord(-1));
        if (navNextBtn) navNextBtn.addEventListener('click', () => navigateRecord(1));

        // Auto-lookup on Branch ID blur
        if (branchIdField) {
            branchIdField.addEventListener('blur', handleBranchIdBlur);
            branchIdField.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleBranchIdBlur();
                }
            });
        }

        // Auto-load on Application ID change
        if (applicationIdField) {
            applicationIdField.addEventListener('blur', handleApplicationIdBlur);
            applicationIdField.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    loadApplicationData(0);
                }
            });
        }

        // Workflow Type ID blur event to auto-populate
        if (workflowTypeIdField) {
            workflowTypeIdField.addEventListener('blur', handleWorkflowTypeIdBlur);
            workflowTypeIdField.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleWorkflowTypeIdBlur();
                }
            });
        }
    }

    /**
     * Search Branch - opens branch search modal using BranchSearchService
     */
    async function searchBranch(e) {
        if (e) e.preventDefault();
        console.log('[LoanApprovals] Opening Branch search modal');
        
        if (BranchSearchService && typeof BranchSearchService.openSearchModal === 'function') {
            BranchSearchService.openSearchModal((selectedBranchId, selectedBranchName) => {
                console.log('[LoanApprovals] Branch selected:', selectedBranchId, selectedBranchName);
                branchIdField.value = selectedBranchId || '';
                branchDescriptionField.value = selectedBranchName || '';
                showMessage('Branch selected: ' + selectedBranchName, 'success');
            });
        } else {
            // Fallback - direct lookup if modal not available
            console.warn('[LoanApprovals] BranchSearchService not available, using fallback');
            showMessage('Branch search service not available', 'warning');
        }
    }

    /**
     * Search Workflow Type - opens workflow type search modal
     * Uses p_GetSearchResult with @TableID='WFAdvTypeID' and @AdvFilterString='ModuleID = ''LN'''
     */
    async function searchWorkflowType(e) {
        if (e) e.preventDefault();
        console.log('[LoanApprovals] Opening Workflow Type search modal');
        
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
            console.error('[LoanApprovals] Error opening workflow type search:', error);
            showMessage('Error opening workflow type search: ' + error.message, 'error');
        }
    }

    /**
     * Create Workflow Type Search Modal - matches loan-appraisal styling
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
        
        // Add event listeners after appending to DOM
        setTimeout(() => {
            const searchBtn = modal.querySelector('#wfTypeSearchBtn');
            if (searchBtn) {
                searchBtn.addEventListener('click', () => fetchWorkflowTypes(modal));
            }
            
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
     * Fetch Workflow Types from API - matches loan-appraisal implementation
     */
    async function fetchWorkflowTypes(modal) {
        const tbody = modal.querySelector('#wfTypeSearchTable tbody');
        tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4"><i class="bi bi-hourglass-split me-2"></i>Loading...</td></tr>';
        
        try {
            const branchId = branchIdField?.value.trim() || '0101';
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
            
            console.log('[LoanApprovals] Fetching workflow types with:', requestData);
            
            const response = await CoreApi.post(`${baseUrl}/api/OldAPI`, envelope);
            console.log('[LoanApprovals] Workflow types response:', response);
            
            let workflowTypes = response?.data || response?.Details || [];
            workflowTypesCache = workflowTypes;
            
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
                    workflowTypeIdField.value = typeId;
                    workflowTypeNameField.value = description;
                    
                    const bsModal = window.bootstrap?.Modal.getInstance(modal);
                    bsModal?.hide();
                    
                    showMessage('Workflow type selected: ' + typeId + ' - ' + description, 'success');
                });
                tbody.appendChild(tr);
            });
            
        } catch (error) {
            console.error('[LoanApprovals] Error fetching workflow types:', error);
            tbody.innerHTML = `<tr><td colspan="3" class="text-center text-danger py-4"><i class="bi bi-exclamation-triangle me-2"></i>Error: ${error.message || error}</td></tr>`;
        }
    }

    /**
     * Search Application - opens application search modal
     * Uses p_GetSearchResult with @TableID='WFLoanIndvAppID'
     */
    async function searchApplication(e) {
        if (e) e.preventDefault();
        console.log('[LoanApprovals] Opening Application search modal');
        
        try {
            let modal = document.getElementById('applicationSearchModal');
            
            if (!modal) {
                modal = createApplicationSearchModal();
                document.body.appendChild(modal);
            }
            
            const bsModal = window.bootstrap?.Modal.getOrCreateInstance(modal, { backdrop: 'static' });
            bsModal?.show();
            
            await fetchApplications(modal);
            
        } catch (error) {
            console.error('[LoanApprovals] Error opening application search:', error);
            showMessage('Error opening application search: ' + error.message, 'error');
        }
    }

    /**
     * Create Application Search Modal - matches loan-appraisal styling
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
                                    <div class="col-md-3">
                                        <label class="form-label fw-semibold mb-2 d-block">Application ID</label>
                                        <input type="text" class="form-control form-control-sm" id="appIdFilter" placeholder="Filter by ID...">
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label fw-semibold mb-2 d-block">Client Name</label>
                                        <input type="text" class="form-control form-control-sm" id="appClientFilter" placeholder="Filter by client...">
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label fw-semibold mb-2 d-block">Status</label>
                                        <select class="form-select form-select-sm" id="appStatusFilter">
                                            <option value="">All Pending</option>
                                            <option value="PEN" selected>Pending</option>
                                            <option value="APP">Approved</option>
                                        </select>
                                    </div>
                                    <div class="col-md-3 d-flex align-items-end">
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
                                            <th>Application ID</th>
                                            <th>Client Name</th>
                                            <th>Loan Amount</th>
                                            <th>Status</th>
                                            <th>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody></tbody>
                                </table>
                            </div>
                        </div>
                        <div class="mt-3 p-2 bg-light rounded">
                            <small class="text-muted"><i class="bi bi-info-circle me-1"></i><em>Click a row to select the application and load details.</em></small>
                        </div>
                    </div>
                    <div class="modal-footer bg-light">
                        <button type="button" class="btn btn-secondary px-4" data-bs-dismiss="modal">
                            <i class="bi bi-x-circle me-1"></i> Close
                        </button>
                    </div>
                </div>
            </div>`;
        
        setTimeout(() => {
            const searchBtn = modal.querySelector('#appSearchBtn');
            if (searchBtn) {
                searchBtn.addEventListener('click', () => fetchApplications(modal));
            }
            
            ['#appIdFilter', '#appClientFilter'].forEach(sel => {
                const input = modal.querySelector(sel);
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
     * Fetch Applications from API
     */
    async function fetchApplications(modal) {
        const tbody = modal.querySelector('#appSearchTable tbody');
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-3"><div class="spinner-border spinner-border-sm text-primary" role="status"></div> Loading...</td></tr>';
        
        try {
            const branchId = branchIdField?.value.trim() || '0101';
            const statusFilter = modal.querySelector('#appStatusFilter').value || 'PEN';
            
            // Build filter string for pending applications in approval stages
            let advFilter = `OurBranchID='${branchId}'`;
            if (statusFilter) {
                advFilter += ` AND WFAppStatusID = '${statusFilter}'`;
            }
            advFilter += ` AND WFAdvStageID IN ('30SANC', '20APPR', '10INIT')`;
            
            const requestData = {
                TableID: 'WFLoanIndvAppID',
                Abbreviation: '',
                OurBranchID: branchId,
                AdvFilterString: advFilter
            };
            
            const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetSearchResult", requestData);
            const result = await CoreApi.post(`${window.Environment?.baseUrlCommon || 'http://localhost:5000'}/api/OldAPI`, envelope);
            
            let applications = result?.data?.Details || result?.Details || [];
            applicationsCache = applications;
            
            // Apply local filters
            const idFilter = modal.querySelector('#appIdFilter').value.toLowerCase();
            const clientFilter = modal.querySelector('#appClientFilter').value.toLowerCase();
            
            if (idFilter) {
                applications = applications.filter(app => 
                    (app.ApplicationID || '').toLowerCase().includes(idFilter)
                );
            }
            if (clientFilter) {
                applications = applications.filter(app => 
                    (app.ClientName || app.Name || '').toLowerCase().includes(clientFilter)
                );
            }
            
            if (!applications.length) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3"><i class="bi bi-inbox me-1"></i>No applications found for approval</td></tr>';
                return;
            }
            
            tbody.innerHTML = applications.map((app, idx) => `
                <tr data-index="${idx}" style="cursor: pointer;">
                    <td class="text-center" style="padding: 6px 8px;">${idx + 1}</td>
                    <td style="padding: 6px 8px;">${app.ApplicationID || ''}</td>
                    <td style="padding: 6px 8px;">${app.ClientName || app.Name || ''}</td>
                    <td style="padding: 6px 8px;">${formatNumber(app.LoanAmount || app.Amount || 0)}</td>
                    <td style="padding: 6px 8px;">${app.WFAppStatus || app.Status || app.WFAppStatusID || ''}</td>
                    <td style="padding: 6px 8px;">${app.ApplicationDate ? formatDate(app.ApplicationDate) : ''}</td>
                </tr>
            `).join('');
            
            // Add click handlers - selecting an application should populate the form
            tbody.querySelectorAll('tr').forEach((tr, idx) => {
                tr.addEventListener('click', () => {
                    const selected = applications[idx];
                    applicationIdField.value = selected.ApplicationID || '';
                    applicationNameField.value = selected.ClientName || selected.Name || '';
                    
                    const bsModal = window.bootstrap?.Modal.getInstance(modal);
                    bsModal?.hide();
                    
                    // Load full application data
                    loadApplicationData(0);
                    showMessage('Application selected: ' + selected.ApplicationID, 'success');
                });
                tr.addEventListener('mouseenter', () => tr.style.background = '#e3f2fd');
                tr.addEventListener('mouseleave', () => tr.style.background = '');
            });
            
        } catch (error) {
            console.error('[LoanApprovals] Error fetching applications:', error);
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-3"><i class="bi bi-exclamation-triangle me-1"></i>Error: ${error.message}</td></tr>`;
        }
    }

    // Handle branch ID blur - auto-populate branch name
    async function handleBranchIdBlur() {
        const branchId = branchIdField?.value.trim();
        if (branchId && !branchDescriptionField.value) {
            try {
                if (BranchSearchService && typeof BranchSearchService.getBranches === 'function') {
                    const response = await BranchSearchService.getBranches('00');
                    const branches = response?.data || response?.Details || [];
                    
                    const branch = branches.find(b => 
                        (b.BranchID || b.OurBranchID || b.branchId || '') === branchId
                    );
                    
                    if (branch) {
                        branchDescriptionField.value = branch.BranchName || branch.Name || branch.branchName || '';
                    }
                }
            } catch (error) {
                console.log('[LoanApprovals] Branch lookup error:', error);
            }
        }
    }

    // Handle workflow type ID blur - auto-populate name
    async function handleWorkflowTypeIdBlur() {
        const wfTypeId = workflowTypeIdField?.value.trim();
        if (wfTypeId && !workflowTypeNameField.value) {
            // Try cache first
            const cached = workflowTypesCache.find(wf => wf.WFAdvTypeID === wfTypeId);
            if (cached) {
                workflowTypeNameField.value = cached.WFAdvType || cached.Description || '';
                return;
            }
            
            // Fetch from API if not in cache
            try {
                const branchId = branchIdField?.value.trim() || '0101';
                const requestData = {
                    TableID: 'WFAdvTypeID',
                    Abbreviation: wfTypeId,
                    OurBranchID: branchId,
                    AdvFilterString: `ModuleID = 'LN' AND WFAdvTypeID = '${wfTypeId}'`
                };
                
                const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetSearchResult", requestData);
                const result = await CoreApi.post(`${window.Environment?.baseUrlCommon || 'http://localhost:5000'}/api/OldAPI`, envelope);
                
                const wfType = result?.data?.Details?.[0] || result?.Details?.[0];
                if (wfType) {
                    workflowTypeNameField.value = wfType.WFAdvType || wfType.Description || '';
                }
            } catch (error) {
                console.log('[LoanApprovals] Workflow type lookup error:', error);
            }
        }
    }

    // Handle application ID blur - auto-load data
    function handleApplicationIdBlur() {
        const applicationId = applicationIdField?.value.trim();
        const branchId = branchIdField?.value.trim();
        
        if (applicationId && branchId) {
            loadApplicationData(0);
        }
    }

    /**
     * Load Application Data from API using p_GetWFLoanApprovals
     * Direction: -1 for previous, 0 for current/specific, 1 for next
     * This populates ALL form fields when Application ID changes
     */
    async function loadApplicationData(direction = 0) {
        try {
            showMessage('Loading approval data...', 'info');
            setFormLoading(true);

            const branchId = branchIdField?.value.trim();
            const applicationId = applicationIdField?.value.trim();
            const loginBranch = window.AuthService?.getLoggedInBranch?.() || sessionStorage.getItem('branchId') || branchId || '0101';
            const operatorId = window.AuthService?.getOperatorId?.() || sessionStorage.getItem('operatorId') || 'web_portal';

            if (!branchId) {
                showMessage('Please enter a Branch ID', 'warning');
                branchIdField?.focus();
                setFormLoading(false);
                return;
            }

            // When navigating (direction != 0), we can have empty applicationId
            // The SP will return prev/next based on direction
            if (!applicationId && direction === 0) {
                showMessage('Please enter an Application ID or use navigation arrows', 'warning');
                applicationIdField?.focus();
                setFormLoading(false);
                return;
            }

            // Prepare request data for p_GetWFLoanApprovals
            const requestData = {
                OurBranchID: branchId,
                LogInBranchID: loginBranch,
                ApplicationID: direction !== 0 ? (applicationId || '') : applicationId,
                RefNo: currentRefNo || 1,
                OperatorID: operatorId,
                Direction: direction
            };

            console.log('📤 Fetching loan approval data:', requestData);

            // Call the service
            const result = await LoanApprovalsService.getWFLoanApprovalsData(requestData);
            console.log('📥 Response:', result);

            const apiData = result.data || result;
            
            if (apiData) {
                // Extract data from response
                const details01 = apiData.Details01?.[0] || null;
                const details02 = apiData.Details02?.[0] || null;
                const details03 = apiData.Details03 || [];
                
                if (details02) {
                    currentApproval = { ...details01, ...details02 };
                    
                    // Update Application ID field with the loaded record
                    // This is important when navigating - the new Application ID is populated
                    if (details02.ApplicationID) {
                        applicationIdField.value = details02.ApplicationID;
                    }
                    
                    // Populate header fields
                    if (details02.RefNo) {
                        currentRefNo = details02.RefNo;
                        referenceNoField.value = details02.RefNo;
                    }
                    if (details02.WFAdvTypeID) workflowTypeIdField.value = details02.WFAdvTypeID;
                    if (details02.WFAdvType) workflowTypeNameField.value = details02.WFAdvType;
                    if (details02.ApplicationDate) {
                        applicationDateField.value = formatDate(details02.ApplicationDate);
                    }
                    
                    // Application Name (Client Name)
                    const clientSource = details01 || details02;
                    applicationNameField.value = clientSource?.ClientName || '';
                    
                    // Populate recommendation details - Applied
                    setFieldValue('loanAmountApplied', formatNumber(details02.LoanAmount || details01?.LoanAmount || 0));
                    setFieldValue('termApplied', details02.LoanTerm || details01?.LoanTerm || '');
                    setFieldValue('repaymentFrequencyApplied', details02.RepaymentFrequencyID || '');
                    setFieldValue('repaymentTermApplied', details02.RepaymentTerm || '');
                    setFieldValue('approvedAmountApplied', formatNumber(details02.ApprovedAmount || 0));
                    setFieldValue('markingRateApplied', details02.MarkingRate || '0.00');
                    setFieldValue('interestRateApplied', details02.InterestRate || details01?.InterestRate || '');
                    setFieldValue('accountClassApplied', details02.AccountClass || details02.AccountClassID || '');
                    
                    // Populate recommendation details - Recommended (editable)
                    setFieldValue('loanAmountRecommended', formatNumber(details02.LoanAmount || 0));
                    setFieldValue('termRecommended', details02.Term || details02.LoanTerm || '');
                    setFieldValue('repaymentTermRecommended', details02.RepaymentTerm || '');
                    setFieldValue('approvedAmountRecommended', formatNumber(details02.AppraisedAmount || details02.ApprovedAmount || 0));
                    setFieldValue('markingRateRecommended', details02.MarkingRate || '0.00');
                    setFieldValue('interestRateRecommended', details02.InterestRate || '');
                    
                    // Set repayment frequency dropdown
                    const freqSelect = document.getElementById('repaymentFrequencyRecommended');
                    if (freqSelect && details02.RepaymentFrequencyID) {
                        freqSelect.value = details02.RepaymentFrequencyID.toLowerCase();
                    }
                    
                    // Set marking rate sign
                    const signSelect = document.getElementById('markingRateSign');
                    if (signSelect && details02.MarkingRateSign) {
                        signSelect.value = details02.MarkingRateSign;
                    }
                    
                    // Extra fields
                    setFieldValue('interestRateType', details02.InterestType || details02.InterestRateType || '');
                    setFieldValue('baseRate', details02.BaseRate || '');
                    setFieldValue('loanType', details02.LoanType || details01?.LoanType || '');
                    setFieldValue('remarks', details02.Remarks || '');
                    
                    // Behind the Scene fields
                    setFieldValue('clientId', clientSource?.ClientID || '');
                    const clientNameField = document.getElementById('clientName');
                    if (clientNameField) clientNameField.value = clientSource?.ClientName || '';
                    setFieldValue('mailingAddress', clientSource?.Address1 || clientSource?.MailingAddress || '');
                    setFieldValue('city', clientSource?.City || '');
                    setFieldValue('phone', clientSource?.Phone1 || clientSource?.Phone || '');
                    setFieldValue('productId', details02?.ProductID || details01?.ProductID || '');
                    setFieldValue('currencyId', details02?.CurrencyID || details01?.CurrencyID || '');
                    setFieldValue('collateralValue', formatNumber(details02?.CollateralValue || details01?.CollateralValue || 0));
                    setFieldValue('noOfGuarantors', details02?.NoOfGuarantors || details01?.NoOfGuarantors || '0');
                    setFieldValue('calculationMethod', details02?.CalculationMethod || details01?.CalculationMethod || '');
                    setFieldValue('applicationStatus', details02?.WFAppStatus || details02?.WFAppStatusID || '');
                    
                    // Populate account class dropdown if data available
                    if (details02.AccountClassID) {
                        const accClassSelect = document.getElementById('accountClassRecommended');
                        if (accClassSelect) {
                            accClassSelect.value = details02.AccountClassID;
                        }
                    }
                    
                    // Populate approval details table
                    if (details03.length > 0) {
                        populateApprovalDetailsTable(details03);
                    } else {
                        approvalDetailsTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No records to display.</td></tr>';
                    }
                    
                    showMessage(`Approval data loaded successfully (App: ${details02.ApplicationID})`, 'success');
                } else {
                    // No more records in the direction navigated
                    if (direction !== 0) {
                        showMessage(direction === 1 ? 'No more records (at last record)' : 'No more records (at first record)', 'info');
                    } else {
                        showMessage('No approval data found for the specified Application ID', 'warning');
                        clearFormFields();
                    }
                }
            } else {
                showMessage('No data returned from server', 'warning');
            }
        } catch (error) {
            console.error('❌ Error loading approval data:', error);
            showMessage(`Failed to load approval data: ${error.message}`, 'error');
        } finally {
            setFormLoading(false);
        }
    }

    /**
     * Set form loading state
     */
    function setFormLoading(isLoading) {
        const form = document.getElementById('loanApprovalsForm');
        if (form) {
            if (isLoading) {
                form.classList.add('loading');
                form.style.opacity = '0.7';
                form.style.pointerEvents = 'none';
            } else {
                form.classList.remove('loading');
                form.style.opacity = '1';
                form.style.pointerEvents = 'auto';
            }
        }
        
        // Disable/enable nav buttons during loading
        if (navPrevBtn) navPrevBtn.disabled = isLoading;
        if (navNextBtn) navNextBtn.disabled = isLoading;
    }

    /**
     * Clear form fields
     */
    function clearFormFields() {
        // Header fields
        referenceNoField.value = '';
        applicationDateField.value = '';
        applicationNameField.value = '';
        
        // Recommendation details
        const fieldsToClear = [
            'loanAmountApplied', 'loanAmountRecommended',
            'termApplied', 'termRecommended',
            'repaymentFrequencyApplied', 'repaymentTermApplied', 'repaymentTermRecommended',
            'approvedAmountApplied', 'approvedAmountRecommended',
            'markingRateApplied', 'markingRateRecommended',
            'interestRateApplied', 'interestRateRecommended',
            'accountClassApplied', 'interestRateType', 'baseRate', 'loanType', 'remarks',
            'clientId', 'mailingAddress', 'city', 'phone',
            'productId', 'currencyId', 'collateralValue', 'noOfGuarantors',
            'calculationMethod', 'applicationStatus'
        ];
        
        fieldsToClear.forEach(id => setFieldValue(id, ''));
        
        const clientNameField = document.getElementById('clientName');
        if (clientNameField) clientNameField.value = '';
        
        // Reset dropdowns
        const freqSelect = document.getElementById('repaymentFrequencyRecommended');
        if (freqSelect) freqSelect.selectedIndex = 0;
        
        const accClassSelect = document.getElementById('accountClassRecommended');
        if (accClassSelect) accClassSelect.selectedIndex = 0;
        
        // Clear table
        approvalDetailsTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No records to display.</td></tr>';
        
        currentApproval = null;
    }

    // Helper to set field value
    function setFieldValue(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (field) field.value = value ?? '';
    }

    // Format number with commas
    function formatNumber(num) {
        if (!num || num === 0) return '0.00';
        return parseFloat(num).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    // Format date
    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        const day = date.getDate().toString().padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
    }

    // Populate approval details table
    function populateApprovalDetailsTable(data) {
        if (!approvalDetailsTableBody || !data || data.length === 0) {
            approvalDetailsTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No records to display.</td></tr>';
            return;
        }

        approvalDetailsTableBody.innerHTML = data.map(item => `
            <tr>
                <td>${item.RoleID || item.ruleId || ''}</td>
                <td>${formatNumber(item.UpperLimit || item.upperLimit || 0)}</td>
                <td>${item.AppraisedBy || item.appraisedBy || ''}</td>
                <td>${item.AppraisedOn ? formatDate(item.AppraisedOn) : (item.appraisedOn || '')}</td>
                <td>${formatNumber(item.AppraisedAmount || item.appraisedAmount || 0)}</td>
                <td>${item.Remarks || item.remarks || ''}</td>
            </tr>
        `).join('');
    }

    /**
     * Navigate records using Direction parameter
     * Direction: -1 for previous Application, 1 for next Application
     * This changes the Application ID and repopulates everything
     */
    function navigateRecord(direction) {
        const branchId = branchIdField?.value.trim();
        
        if (!branchId) {
            showMessage('Please enter a Branch ID first', 'warning');
            branchIdField?.focus();
            return;
        }
        
        console.log(`[LoanApprovals] Navigating ${direction === 1 ? 'NEXT' : 'PREVIOUS'} record`);
        
        // Load data with direction - this will change Application ID and populate everything
        loadApplicationData(direction);
    }

    // Action handlers
    async function handleView(e) {
        e.preventDefault();
        loadApplicationData();
    }

    function handleEdit(e) {
        e.preventDefault();
        
        if (!applicationIdField?.value.trim()) {
            showMessage('Please load an application first', 'warning');
            return;
        }

        isEditMode = true;
        
        // Enable editable fields
        const editableFields = [
            'loanAmountRecommended', 'termRecommended', 'repaymentFrequencyRecommended',
            'repaymentTermRecommended', 'approvedAmountRecommended', 'markingRateRecommended',
            'markingRateSign', 'interestRateRecommended', 'accountClassRecommended', 'remarks'
        ];
        
        editableFields.forEach(id => {
            const field = document.getElementById(id);
            if (field) {
                field.disabled = false;
                field.readOnly = false;
            }
        });

        showMessage('Form is now editable. Make changes and click Approve to save.', 'info');
    }

    async function handleReject(e) {
        e.preventDefault();
        
        const applicationId = applicationIdField?.value.trim();
        const branchId = branchIdField?.value.trim();
        
        if (!applicationId || !branchId) {
            showMessage('Please load an application first', 'warning');
            return;
        }

        const remarks = document.getElementById('remarks')?.value || '';
        
        if (confirm('Are you sure you want to reject this loan application?')) {
            try {
                const operatorId = window.AuthService?.getOperatorId?.() || 'JOHN_KIMANI';
                const currentDate = new Date().toISOString().split('T')[0];
                
                const requestData = {
                    OurBranchID: branchId,
                    ApplicationID: applicationId,
                    ModifiedBy: operatorId,
                    Remarks: remarks,
                    RejectedOn: currentDate,
                    IsIndividual: 1,
                    TypeOfApplication: 'I',
                    IsReverseFee: 0
                };

                console.log('📤 Rejecting loan approval:', requestData);
                showMessage('Rejecting application...', 'info');

                const result = await LoanApprovalsService.rejectWFLoanApprovals(requestData);
                console.log('📥 Reject response:', result);

                const apiData = result.data || result;
                if (apiData?.ErrorMessage) {
                    showMessage(`Error: ${apiData.ErrorMessage}`, 'error');
                    return;
                }

                showMessage('Application rejected successfully', 'success');
                setFieldValue('applicationStatus', 'Rejected');
                
            } catch (error) {
                console.error('❌ Error rejecting application:', error);
                showMessage(`Failed to reject: ${error.message}`, 'error');
            }
        }
    }

    async function handleApprove(e) {
        e.preventDefault();
        
        const applicationId = applicationIdField?.value.trim();
        const branchId = branchIdField?.value.trim();
        
        if (!applicationId || !branchId) {
            showMessage('Please load an application first', 'warning');
            return;
        }

        // Validate required fields
        const loanAmount = parseFloat(document.getElementById('loanAmountRecommended')?.value.replace(/,/g, '') || 0);
        const term = parseInt(document.getElementById('termRecommended')?.value || 0);
        const interestRate = parseFloat(document.getElementById('interestRateRecommended')?.value || 0);
        
        if (loanAmount <= 0) {
            showMessage('Please enter a valid Loan Amount', 'error');
            return;
        }
        if (term <= 0) {
            showMessage('Please enter a valid Term', 'error');
            return;
        }

        if (confirm('Are you sure you want to approve this loan application?')) {
            try {
                const operatorId = window.AuthService?.getOperatorId?.() || 'JOHN_KIMANI';
                const currentDate = new Date().toISOString().split('T')[0];
                
                const requestData = {
                    OurBranchID: branchId,
                    ApplicationID: applicationId,
                    RefNo: currentRefNo || 1,
                    CreateNewAccount: currentApproval?.CreateNewAccount || 0,
                    ExistingAccountID: document.getElementById('existingAccountId')?.value || '',
                    LoanAmount: loanAmount,
                    MarkingRate: parseFloat(document.getElementById('markingRateRecommended')?.value || 0),
                    MarkingRateSign: document.getElementById('markingRateSign')?.value || '+',
                    InterestRate: interestRate,
                    Penalty: currentApproval?.Penalty || 0,
                    PenaltySpreadSign: '+',
                    PenaltySpread: currentApproval?.PenaltySpread || 0,
                    GracePeriod: currentApproval?.GracePeriod || 0,
                    Term: term,
                    RepaymentTerm: parseInt(document.getElementById('repaymentTermRecommended')?.value || term),
                    RepaymentFrequencyID: document.getElementById('repaymentFrequencyRecommended')?.value || '',
                    AccountClassID: document.getElementById('accountClassRecommended')?.value || '',
                    Remarks: document.getElementById('remarks')?.value || '',
                    AppraisedBy: operatorId,
                    AppraisedOn: currentDate,
                    AppraisedAmount: parseFloat(document.getElementById('approvedAmountRecommended')?.value.replace(/,/g, '') || loanAmount)
                };

                console.log('📤 Approving loan:', requestData);
                showMessage('Saving approval...', 'info');

                const result = await LoanApprovalsService.editWFLoanApprovals(requestData);
                console.log('📥 Approval response:', result);

                const apiData = result.data || result;
                if (apiData?.ErrorMessage) {
                    showMessage(`Error: ${apiData.ErrorMessage}`, 'error');
                    return;
                }

                showMessage('Loan approved successfully!', 'success');
                setFieldValue('applicationStatus', 'Approved');
                isEditMode = false;
                
            } catch (error) {
                console.error('❌ Error approving loan:', error);
                showMessage(`Failed to approve: ${error.message}`, 'error');
            }
        }
    }

    function handleCancel(e) {
        e.preventDefault();
        
        if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
            // Reset form
            document.getElementById('loanApprovalsForm')?.reset();
            currentApproval = null;
            currentRefNo = 1;
            isEditMode = false;
            approvalDetailsTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No records to display.</td></tr>';
            showMessage('Form reset', 'info');
        }
    }

    // Show message
    function showMessage(message, type = 'info') {
        // Create or update toast notification
        let toast = document.getElementById('loanApprovalToast');
        if (!toast) {
            const toastHtml = `
                <div id="loanApprovalToast" class="position-fixed bottom-0 end-0 p-3" style="z-index: 9999;">
                    <div class="toast show" role="alert">
                        <div class="toast-header">
                            <i class="bi bi-info-circle me-2"></i>
                            <strong class="me-auto">Loan Approvals</strong>
                            <button type="button" class="btn-close" onclick="this.closest('.toast').style.display='none'"></button>
                        </div>
                        <div class="toast-body"></div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', toastHtml);
            toast = document.getElementById('loanApprovalToast');
        }
        
        const toastBody = toast.querySelector('.toast-body');
        const icon = toast.querySelector('.toast-header i');
        
        toastBody.textContent = message;
        toast.querySelector('.toast').style.display = 'block';
        
        // Update icon based on type
        const iconClasses = {
            success: 'bi-check-circle-fill text-success',
            error: 'bi-exclamation-circle-fill text-danger',
            warning: 'bi-exclamation-triangle-fill text-warning',
            info: 'bi-info-circle-fill text-info'
        };
        icon.className = `bi ${iconClasses[type] || iconClasses.info} me-2`;
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            toast.querySelector('.toast').style.display = 'none';
        }, 5000);
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
