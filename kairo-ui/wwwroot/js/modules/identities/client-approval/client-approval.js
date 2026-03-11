/**
 * Client Approval Controller
 * MVC-style view controller following Kairo UI patterns
 * 
 * Depends on:
 * - app-core.js (AppCore global)
 * - searchModal.js (SearchModal class)
 * - Bootstrap 5
 */

const CLIENT_APPROVAL_CONTROLLER_BASE = 'Identities/ClientApproval';
const MODULE_ID_CLIENT_APPROVAL = 6961;

/**
 * Get AppCore from window hierarchy
 */
function getAppCore() {
    const win = window;
    return win.AppCore ||
        (win.parent && win.parent !== win && win.parent.AppCore) ||
        (win.top && win.top !== win && win.top.AppCore) ||
        null;
}

/**
 * Generic invoker for ClientApproval controller actions
 */
function invokeClientApprovalController(action, requestData, method = 'POST') {
    return new Promise((resolve, reject) => {
        const appCore = getAppCore();
        if (!appCore) {
            reject(new Error('AppCore is not available'));
            return;
        }

        const endpoint = `${CLIENT_APPROVAL_CONTROLLER_BASE}/${action}`;

        if (typeof appCore.invokeControllerByMethodAsync === 'function') {
            appCore.invokeControllerByMethodAsync(endpoint, method, requestData || {}, {
                useQueryString: method.toUpperCase() === 'GET'
            }).then(resolve).catch(reject);
            return;
        }

        if (typeof appCore.invokeController === 'function') {
            appCore.invokeController(endpoint, requestData || {}, (error, response) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(response);
                }
            });
            return;
        }

        reject(new Error('AppCore invocation methods are not available'));
    });
}

/**
 * ClientApprovalService - Handle controller calls
 */
const ClientApprovalService = {
    getPendingApprovals(requestData) {
        return invokeClientApprovalController('get-pending-approvals', requestData);
    },
    getClientApprovalDetails(requestData) {
        return invokeClientApprovalController('get-client-approval-details', requestData);
    },
    getStatusReasons(requestData) {
        return invokeClientApprovalController('get-status-reasons', requestData);
    },
    approveClients(requestData) {
        return invokeClientApprovalController('approve-clients', requestData);
    },
    rejectClients(requestData) {
        return invokeClientApprovalController('reject-clients', requestData);
    },
    addClientSupervisionData(requestData) {
        return invokeClientApprovalController('add-client-supervision-data', requestData);
    }
};

window.ClientApprovalService = ClientApprovalService;

class ClientApprovalController {
        /**
         * Filter Application IDs based on selected Branch and Client Type
         */
        async filterApplicationIds() {
            const branchId = this.elements.filterBranchIdValue.value;
            const clientType = this.elements.filterClientType.value;
            if (!branchId || !clientType) {
                this.clearApplicationSelection();
                return;
            }
            // You may need to implement a backend endpoint for this if not present
            // For now, use the search modal logic to fetch filtered Application IDs
            // Simulate by clearing selection and requiring user to search
            this.clearApplicationSelection();
            // Optionally, you could auto-populate a dropdown if you have the data
        }
    constructor() {
        this.pendingClients = [];
        this.selectedClients = [];
        this.statusReasons = [];
        this.searchModal = null;
        this.rejectionModalInstance = null;
        this.sessionContext = this.resolveSessionContext();
    this.moduleId = (document.getElementById('moduleId')?.value || '6961').toString();

        // DOM Elements
        this.elements = {
            // Filters
            filterBranchId: document.getElementById('txt_branchId'),
            filterBranchIdValue: document.getElementById('txt_branchIdValue'),
            branchName: document.getElementById('spn_branchName'),
            filterClientType: document.getElementById('ddl_clientType'),
            filterApplicationId: document.getElementById('txt_applicationId'),
            filterApplicationIdValue: document.getElementById('txt_applicationIdValue'),
            applicationName: document.getElementById('spn_applicationName'),
            searchBranchBtn: document.getElementById('btn_searchBranch'),
            searchApplicationBtn: document.getElementById('btn_searchApplication'),
            loadApprovalsBtn: document.getElementById('btn_loadApprovals'),

            // Main content
            messageDiv: document.getElementById('dv_messagePanel'),
            messageText: document.getElementById('spn_messageText'),
            messageIcon: document.getElementById('icn_messageIcon'),
            recordCount: document.getElementById('spn_recordCount'),
            approvalTableBody: document.getElementById('tbl_approvalBody'),
            selectAllCheckbox: document.getElementById('chk_selectAll'),

            // Status reasons
            statusReasonsSection: document.getElementById('dv_statusReasonsSection'),
            statusReasonsTableBody: document.getElementById('tbl_statusReasonsBody'),
            selectAllReasons: document.getElementById('chk_selectAllReasons'),

            // Action buttons
            viewBtn: document.getElementById('btn_view'),
            approveBtn: document.getElementById('btn_approve'),
            rejectBtn: document.getElementById('btn_reject'),
            cancelBtn: document.getElementById('btn_cancel'),

            // Rejection modal
            rejectionModal: document.getElementById('mdl_rejection'),
            rejectionCount: document.getElementById('spn_rejectionCount'),
            rejectionRemarks: document.getElementById('txa_rejectionRemarks'),
            rejectionForm: document.getElementById('frm_rejection'),
            confirmRejectBtn: document.getElementById('btn_confirmReject')
        };

        this.initialize();
    }

    /**
     * Initialize controller
     */
    initialize() {
        this.initializeEventListeners();
        this.applyDefaultBranch();
        this.initializeLookups();
        this.initializeSearchModal();
        this.initializeSectionToggles();
        this.initializeRejectionModal();
        this.loadStatusReasons(this.elements.filterClientType?.value || 'C');
        if (this.elements.searchApplicationBtn) {
            this.elements.searchApplicationBtn.disabled = !this.elements.filterClientType?.value;
        }
    }

    resolveSessionContext() {
        const appCore = getAppCore();
        const authSession = typeof window.getAuthSession === 'function' ? (window.getAuthSession() || {}) : {};

        const firstOf = (...values) => values.find(v => typeof v === 'string' ? v.trim() !== '' : v !== undefined && v !== null && `${v}`.trim() !== '');

        const serverBranchId = document.getElementById('hdn_defaultBranchId')?.value;
        const serverBranchName = document.getElementById('hdn_defaultBranchName')?.value;

        const branchId = firstOf(
            serverBranchId,
            authSession.OurBranchID,
            authSession.branchId,
            authSession.BranchID,
            authSession.branch_code,
            authSession.branch_id,
            appCore?.user?.OurBranchID,
            appCore?.user?.branchId,
            appCore?.session?.OurBranchID,
            appCore?.session?.branch_code,
            appCore?.session?.branch_id,
            appCore?.getUser?.()?.OurBranchID,
            sessionStorage.getItem('currentBranchID'),
            sessionStorage.getItem('OurBranchID'),
            sessionStorage.getItem('BranchID'),
            sessionStorage.getItem('branch_code'),
            sessionStorage.getItem('branch_id'),
            localStorage.getItem('OurBranchID'),
            localStorage.getItem('BranchID'),
            localStorage.getItem('branch_code'),
            localStorage.getItem('branch_id')
        );

        const branchName = firstOf(
            serverBranchName,
            authSession.BranchName,
            authSession.branchName,
            appCore?.user?.BranchName,
            appCore?.user?.branchName,
            appCore?.session?.BranchName,
            appCore?.getUser?.()?.BranchName,
            sessionStorage.getItem('currentBranchName'),
            sessionStorage.getItem('BranchName'),
            localStorage.getItem('BranchName')
        );

        return {
            branchId: branchId ? String(branchId) : '',
            branchName: branchName ? String(branchName) : ''
        };
    }

    applyDefaultBranch() {
        const branchId = this.sessionContext.branchId;
        if (!branchId) return;

        this.elements.filterBranchId.value = branchId;
        this.elements.filterBranchIdValue.value = branchId;
        if (this.elements.branchName) {
            this.elements.branchName.textContent = this.sessionContext.branchName || '';
        }
    }

    clearApplicationSelection() {
        this.elements.filterApplicationId.value = '';
        this.elements.filterApplicationIdValue.value = '';
        if (this.elements.applicationName) {
            this.elements.applicationName.textContent = '';
        }
    }

    async autoLoadSelectedApplication() {
        const branchId = this.elements.filterBranchIdValue.value?.trim();
        const clientType = this.elements.filterClientType.value?.trim();
        const applicationId = this.elements.filterApplicationIdValue.value?.trim();

        if (branchId && clientType && applicationId) {
            await this.loadApprovals(true);
        }
    }

    /**
     * Initialize event listeners
     */
    initializeEventListeners() {
        // Filter interactions
        this.elements.loadApprovalsBtn.addEventListener('click', () => this.loadApprovals());

        this.elements.searchBranchBtn.addEventListener('click', () => this.openBranchSearch());
        this.elements.searchApplicationBtn.addEventListener('click', () => this.openApplicationSearch());

        // Client Type change - enable/disable application search
        this.elements.filterClientType.addEventListener('change', () => {
            const hasType = this.elements.filterClientType.value !== '';
            this.elements.searchApplicationBtn.disabled = !hasType;
            this.loadStatusReasons(this.elements.filterClientType.value || 'C');
            if (!hasType) {
                this.clearApplicationSelection();
            }
            this.filterApplicationIds();
        });

        // Select all checkbox
        this.elements.selectAllCheckbox.addEventListener('change', (e) => this.handleSelectAllCheckboxes(e.target.checked));

        // Reason select all
        if (this.elements.selectAllReasons) {
            this.elements.selectAllReasons.addEventListener('change', (e) => {
                this.statusReasonsTableBody.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                    cb.checked = e.target.checked;
                });
            });
        }

        // Action buttons
        this.elements.viewBtn.addEventListener('click', () => this.handleView());
        this.elements.approveBtn.addEventListener('click', () => this.handleApprove());
        this.elements.rejectBtn.addEventListener('click', () => this.showRejectionModal());
        this.elements.cancelBtn.addEventListener('click', () => this.handleClose());

        // Rejection confirmation
        this.elements.confirmRejectBtn.addEventListener('click', () => this.handleReject());

        // Branch change should also filter Application IDs
        this.elements.filterBranchId.addEventListener('change', () => {
            this.filterApplicationIds();
        });

        // Auto-load supervisions when Application ID is selected (if all filters are set)
        this.elements.filterApplicationId.addEventListener('change', () => {
            this.autoLoadSelectedApplication();
        });
    }

    /**
     * Initialize section toggle functionality
     */
    initializeSectionToggles() {
        document.querySelectorAll('[data-section-toggle]').forEach(toggle => {
            const btn = toggle.querySelector('.section-toggle-btn') || toggle;
            btn.addEventListener('click', () => {
                const section = btn.closest('.form-section');
                if (section) {
                    const content = section.querySelector('[data-section-content]');
                    const isCollapsed = section.classList.toggle('collapsed');
                    if (content) {
                        content.style.display = isCollapsed ? 'none' : '';
                    }
                    btn.setAttribute('aria-expanded', (!isCollapsed).toString());
                    const icon = btn.querySelector('i');
                    if (icon) {
                        icon.classList.toggle('bi-chevron-up', !isCollapsed);
                        icon.classList.toggle('bi-chevron-down', isCollapsed);
                    }
                }
            });
        });
    }

    /**
     * Initialize rejection modal
     */
    initializeRejectionModal() {
        this.rejectionModalInstance = new bootstrap.Modal(this.elements.rejectionModal);
    }

    /**
     * Validate server-populated lookup options (Index action ViewData)
     */
    async initializeLookups() {
        try {
            const hasServerOptions = this.elements.filterClientType?.options?.length > 1;
        } catch (error) {
            // Silent fail for initialization
        }
    }

    /**
     * Initialize SearchModal
     */
    async initializeSearchModal() {
        try {
            const appCore = getAppCore();
            if (!appCore) return;

            this.searchModal = new SearchModal(appCore);
        } catch (error) {
            // Silent fail for SearchModal initialization
        }
    }

    /**
     * Open Branch Search Modal
     */
    async openBranchSearch() {
        if (!this.searchModal) {
            this.showMessage('Search not available, please refresh the page', 'warning');
            return;
        }

        try {
            const currentBranchId = this.elements.filterBranchIdValue.value;

            await this.searchModal.open({
                tableID: 'BranchID',
                                moduleID: this.moduleId,
                whereStmt: '',
                searchFields: [
                    { name: 'BranchID', label: 'Branch ID', column: 'OurBranchID', value: currentBranchId },
                    { name: 'BranchName', label: 'Branch Name', column: 'BranchName' }
                ],
                autoSearch: false,
                onSelect: (record) => {
                    this.elements.filterBranchId.value = record.OurBranchID || '';
                    this.elements.filterBranchIdValue.value = record.OurBranchID || '';
                    if (this.elements.branchName) {
                        this.elements.branchName.textContent = record.BranchName || '';
                    }
                    this.clearApplicationSelection();
                    this.showMessage('Branch selected successfully', 'success');
                }
            });
        } catch (error) {
            this.showMessage('Error opening search modal', 'danger');
        }
    }

    /**
     * Open Application Search Modal
     */
    async openApplicationSearch() {
        if (!this.searchModal) {
            this.showMessage('Search not available, please refresh the page', 'warning');
            return;
        }

        const branchId = this.elements.filterBranchIdValue.value;
        const clientType = this.elements.filterClientType.value;

        if (!branchId) {
            this.showMessage('Please select Branch ID first', 'warning');
            return;
        }

        if (!clientType) {
            this.showMessage('Please select Client Type first', 'warning');
            return;
        }

        try {
            // Determine TableID based on Client Type
            let tableID = 'WFClientID';
            if (clientType === 'G') {
                tableID = 'WFGroupClientID';
            } else if (clientType === 'C' || clientType === 'CNC') {
                tableID = 'WFCorporateClientID';
            }

            const currentApplicationId = this.elements.filterApplicationIdValue.value;
            const whereStmt = `WFClientStatusID = 'P' AND WFStageID = '40CA' AND ClientTypeID='${clientType}'`;

            await this.searchModal.open({
                tableID: tableID,
                                moduleID: this.moduleId,
                whereStmt: whereStmt,
                searchFields: [
                    { name: 'ClientID', label: 'Client ID', column: 'ClientID', value: currentApplicationId },
                    { name: 'Name', label: 'Client Name', column: 'Name' }
                ],
                autoSearch: false,
                onSelect: async (record) => {
                    this.elements.filterApplicationId.value = record.ClientID || '';
                    this.elements.filterApplicationIdValue.value = record.ClientID || '';
                    if (this.elements.applicationName) {
                        this.elements.applicationName.textContent = record.Name || '';
                    }

                    await this.autoLoadSelectedApplication();

                    if (!this.pendingClients?.length) {
                        await this.loadClientDetails(record.ClientID);
                    }

                    await this.loadStatusReasons(clientType);

                    this.showMessage('Application selected successfully', 'success');
                }
            });
        } catch (error) {
            this.showMessage('Error opening search modal', 'danger');
        }
    }

    /**
     * Load client approval details
     */
    async loadClientDetails(clientId) {
        try {
            const branchId = this.elements.filterBranchIdValue.value;
            const clientType = this.elements.filterClientType.value;

            const result = await ClientApprovalService.getClientApprovalDetails({
                OurBranchID: branchId,
                LogInBranchID: '',
                GroupID: '',
                ClientTypeID: clientType,
                ClientID: clientId
            });

            // Handle both camelCase and PascalCase
            const success = result.Success ?? result.success;
            const details = result.data ?? result.Details ?? result.details;

            if (success && details) {
                const clients = Array.isArray(details) ? details : [details];
                this.populateApprovalTable(clients);
                this.pendingClients = clients;
            } else {
                this.populateApprovalTable([]);
            }
        } catch (error) {
            this.showMessage('Error loading client details', 'danger');
        }
    }

    /**
     * Load pending approvals
     * @param {boolean} silent 
     */
    async loadApprovals(silent = false) {
        // Validate filters
        const branchId = this.elements.filterBranchIdValue.value?.trim();
        const clientType = this.elements.filterClientType.value?.trim();
        const applicationId = this.elements.filterApplicationIdValue.value?.trim();

        if (!branchId) {
            if (!silent) this.showMessage('Please select a Branch ID', 'warning');
            return;
        }

        if (!clientType) {
            if (!silent) this.showMessage('Please select a Client Type', 'warning');
            return;
        }

        if (!applicationId) {
            if (!silent) this.showMessage('Please select an Application ID', 'warning');
            return;
        }

        try {
            if (!silent) this.showMessage('Loading pending approvals...', 'info');

            const result = await ClientApprovalService.getPendingApprovals({
                OurBranchID: branchId,
                LogInBranchID: branchId,
                GroupID: '',
                ClientTypeID: clientType,
                ClientID: applicationId
            });

            // Handle both camelCase and PascalCase response properties
            const success = result.Success ?? result.success;
            const details = result.data ?? result.Details ?? result.details;
            const message = result.Message ?? result.message;

            if (success && details) {
                const clients = Array.isArray(details) ? details : [details];
                this.populateApprovalTable(clients);
                this.pendingClients = clients;
                if (!silent) this.showMessage(`Found ${clients.length} pending approval(s)`, 'success');
            } else {
                this.populateApprovalTable([]);
                if (!silent) this.showMessage(message || 'No pending approvals found', 'warning');
            }
        } catch (error) {
            if (!silent) this.showMessage('Error loading pending approvals', 'danger');
        }
    }

    /**
     * Populate approval table with clients
     */
    populateApprovalTable(clients) {
        const tbody = this.elements.approvalTableBody;
        tbody.innerHTML = '';

        if (!clients || clients.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" class="text-center text-muted py-3">No records to display.</td></tr>';
            this.elements.recordCount.textContent = '0 records';
            this.elements.selectAllCheckbox.checked = false;
            this.updateActionButtons();
            return;
        }

        clients.forEach((client, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <input type="checkbox" class="form-check-input ca-client-checkbox" data-index="${index}">
                </td>
                <td>${this.escapeHtml(client.GenderID || client.Gender || '-')}</td>
                <td>${this.escapeHtml(client.DateOfBirth || client.DOB || '-')}</td>
                <td>${this.escapeHtml(client.Nationality || client.NationalityID || '-')}</td>
                <td>${this.escapeHtml(client.PassportNo || client.IdentificationNo || client.IDNo || '-')}</td>
                <td>${this.escapeHtml(client.MaritalStatus || client.MaritalStatusID || '-')}</td>
                <td>${this.escapeHtml(client.Address || '-')}</td>
                <td>${this.escapeHtml(client.Mobile || client.MobileNo || '-')}</td>
                <td>${this.escapeHtml(client.CenterID || '-')}</td>
                <td>${this.escapeHtml(client.GroupID || '-')}</td>
                <td>${this.escapeHtml(client.CreatedBy || '-')}</td>
            `;

            // Add data attribute and click handler
            tr.dataset.clientData = JSON.stringify(client);
            tr.style.cursor = 'pointer';
            tr.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox') {
                    const checkbox = tr.querySelector('.ca-client-checkbox');
                    if (checkbox) {
                        checkbox.checked = !checkbox.checked;
                        this.handleCheckboxChange();
                    }
                }
            });

            // Add checkbox change event
            const checkbox = tr.querySelector('.ca-client-checkbox');
            checkbox.addEventListener('change', () => {
                this.handleCheckboxChange();
            });

            tbody.appendChild(tr);
        });

        this.elements.recordCount.textContent = `${clients.length} record(s)`;
        this.elements.selectAllCheckbox.checked = false;
        this.updateActionButtons();
    }

    /**
     * Load status reasons/checklist
     */
    async loadStatusReasons(clientTypeID) {
        try {
            let workflowID = 'C';
            if (clientTypeID === 'B') {
                workflowID = 'B';
            } else if (clientTypeID === 'G') {
                workflowID = 'G';
            }

            const branchId = this.elements.filterBranchIdValue.value;

            const result = await ClientApprovalService.getStatusReasons({
                BankID: '00',
                WorkflowID: workflowID,
                OurBranchID: branchId
            });

            // Handle both camelCase, PascalCase, and new 'data' response properties
            const reasons = result.data01 || result.Details01 || result.details01 || result.data || result.Details || result.details || [];
            this.renderStatusReasons(reasons);
            this.statusReasons = reasons;
            this.elements.statusReasonsSection.classList.remove('d-none');
        } catch (error) {
            // Silent fail for optional status reasons section
            this.elements.statusReasonsSection.classList.remove('d-none');
            this.renderStatusReasons([]);
        }
    }

    /**
     * Render status reasons table
     */
    renderStatusReasons(reasons) {
        const tbody = this.elements.statusReasonsTableBody;
        tbody.innerHTML = '';

        if (!reasons || reasons.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted py-3">No records to display.</td></tr>';
            return;
        }

        reasons.forEach((reason, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <input type="checkbox" class="form-check-input ca-reason-checkbox" 
                           data-index="${index}" 
                           data-field-id="${this.escapeHtml(reason.CrossCheckFieldID || '')}"
                           ${reason.IsSelected ? 'checked' : ''}>
                </td>
                <td>${this.escapeHtml(reason.Description || '')}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    /**
     * Handle checkbox changes
     */
    handleCheckboxChange() {
        const checkboxes = this.elements.approvalTableBody.querySelectorAll('.ca-client-checkbox:checked');
        this.selectedClients = Array.from(checkboxes).map(cb => {
            const row = cb.closest('tr');
            const clientData = row?.dataset.clientData ? JSON.parse(row.dataset.clientData) : {};
            return {
                ClientID: clientData.ClientID,
                index: parseInt(cb.getAttribute('data-index'))
            };
        });

        // Update select all checkbox state
        const allCheckboxes = this.elements.approvalTableBody.querySelectorAll('.ca-client-checkbox');
        this.elements.selectAllCheckbox.checked = allCheckboxes.length > 0 && checkboxes.length === allCheckboxes.length;

        this.updateActionButtons();
    }

    /**
     * Handle select all checkbox
     */
    handleSelectAllCheckboxes(checked) {
        this.elements.approvalTableBody.querySelectorAll('.ca-client-checkbox').forEach(cb => {
            cb.checked = checked;
        });
        this.handleCheckboxChange();
    }

    /**
     * Update action button states
     */
    updateActionButtons() {
        const hasSelection = this.selectedClients.length > 0;
        const hasSingleSelection = this.selectedClients.length === 1;

        this.elements.viewBtn.disabled = !hasSingleSelection;
        this.elements.approveBtn.disabled = !hasSelection;
        this.elements.rejectBtn.disabled = !hasSelection;
    }

    /**
     * Handle View button click
     */
    handleView() {
        if (this.selectedClients.length !== 1) return;
        this.showMessage('Use Client 360 view to see detailed information', 'info');
    }

    /**
     * Handle Approve button click
     */
    async handleApprove() {
        if (this.selectedClients.length === 0) return;

        const result = await Swal.fire({
            title: 'Approve Clients',
            html: `Are you sure you want to approve <strong>${this.selectedClients.length}</strong> client(s)?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: '<i class="bi bi-check-circle"></i> Yes, Approve',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#6c757d'
        });

        if (!result.isConfirmed) return;

        try {
            this.showMessage('Approving clients...', 'info');

            const xml = this.buildClientXML();
            const now = new Date();
            const approvedOn = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

            const response = await ClientApprovalService.approveClients({
                OurBranchID: this.elements.filterBranchIdValue.value,
                ApprovedBy: 'web_portal',
                ApprovedOn: approvedOn,
                DetailRecords: xml
            });

            // Handle both camelCase and PascalCase
            const success = response.Success ?? response.success;
            const message = response.Message ?? response.message;

            if (success) {
                // Extract ClientIDs from approval response
                let approvedClientIds = [];
                try {
                    const approvalData = response.data?.Details || response.data || response.Data || response.details;
                    if (approvalData) {
                        const dataArray = Array.isArray(approvalData) ? approvalData : [approvalData];
                        approvedClientIds = dataArray.map(item => item.ClientID || item.NewClientID || item.GeneratedClientID).filter(Boolean);
                        console.log('[ClientApproval] Approved ClientIDs from response:', approvedClientIds);
                    }
                } catch (e) {
                    console.warn('[ClientApproval] Could not extract ClientIDs from approval response:', e);
                }

            // Add approved clients to supervision queue
                        try {
                            const branchId = this.elements.filterBranchIdValue.value;
                            const appCore = getAppCore();
                            const operatorId = appCore?.user?.OperatorID 
                                || appCore?.user?.operatorId 
                                || appCore?.session?.OperatorID 
                                || appCore?.getUser?.()?.OperatorID
                                || appCore?.currentUser?.OperatorID
                                || 'web_portal';

                            const supervisionPromises = this.selectedClients.map(async (selected) => {
                                // Get full client data from pendingClients using stored index
                                const fullClient = this.pendingClients[selected.index] || {};
                                const clientId = selected.ClientID 
                                    || fullClient.ClientID 
                                    || fullClient.WFClientID 
                                    || fullClient.AppClientID;

                                console.log('[ClientApproval] Using ClientID for supervision:', clientId);

                                if (!clientId) {
                                    console.warn('[ClientApproval] No ClientID found for supervision insert');
                                    return;
                                }

                                const searchKey = `[OperatorID:${operatorId}][ClientID:${clientId}]`;

                                // Match expected NewData format: {"Details":[{...client fields...}]}
                                const newData = JSON.stringify({
                                    Details: [{
                                        Name:          fullClient.Name          || fullClient.ClientName   || '',
                                        TitleID:       fullClient.TitleID        || '',
                                        Address:       fullClient.Address        || '',
                                        GenderID:      fullClient.GenderID       || fullClient.Gender      || '',
                                        NationalityID: fullClient.NationalityID  || fullClient.Nationality || '',
                                        CityID:        fullClient.CityID         || '',
                                        CountryID:     fullClient.CountryID      || '',
                                        Mobile:        fullClient.Mobile         || fullClient.MobileNo    || '',
                                        DateOfBirth:   fullClient.DateOfBirth    || fullClient.DOB         || '',
                                        Phone1:        fullClient.Phone1         || '',
                                        Email:         fullClient.Email          || '',
                                        ID1:           fullClient.ID1            || fullClient.PassportNo  || '',
                                        ID2:           fullClient.ID2            || '',
                                        UpdateCount:   fullClient.UpdateCount    || 0
                                    }]
                                });

                                return ClientApprovalService.addClientSupervisionData({
                                    OurBranchID:  branchId,
                                    ClientID:     clientId,
                                    ModuleID:     6961,
                                    LockModuleID: 6961,
                                    OperatorID:   operatorId,
                                    Searchkey:    searchKey,
                                    LockKey:      searchKey,
                                    EventID:      1,
                                    NewData:      newData,
                                    OldData:      '',
                                    Remarks:      'Client approved',
                                    NewRecord:    0,
                                    IPAddress:    ''
                                });
                            });

                            await Promise.all(supervisionPromises);
                            console.log('[ClientApproval] Supervision records inserted successfully');
                        } catch (supervisionError) {
                            console.error('[ClientApproval] Error adding to supervision queue:', supervisionError);
                            this.showMessage('Client approved but supervision record failed — contact support', 'warning');
                        }

                        this.showMessage((message && message.trim() !== '' ? message : 'Clients approved successfully!'), 'success');
                        // Clear the table - approved client no longer pending
                        this.populateApprovalTable([]);
                        this.pendingClients = [];
                        this.selectedClients = [];
                        this.elements.selectAllCheckbox.checked = false;
                                                this.clearApplicationSelection();
                        this.updateActionButtons();
                      } else {
                this.showMessage(message || 'Failed to approve clients', 'danger');
            }
        } catch (error) {
            this.showMessage('Error approving clients', 'danger');
        }
    }  
    /**
     * Show rejection modal
     */
    showRejectionModal() {
        if (this.selectedClients.length === 0) return;

        this.elements.rejectionCount.textContent = this.selectedClients.length;
        this.elements.rejectionRemarks.value = '';
        this.elements.rejectionForm.classList.remove('was-validated');
        this.rejectionModalInstance.show();
    }

    /**
     * Handle Reject button click
     */
    async handleReject() {
        // Validate form
        if (!this.elements.rejectionForm.checkValidity()) {
            this.elements.rejectionForm.classList.add('was-validated');
            return;
        }

        const remarks = this.elements.rejectionRemarks.value.trim();

        try {
            this.showMessage('Rejecting clients...', 'info');
            this.rejectionModalInstance.hide();

            const xml = this.buildClientXML();

            const response = await ClientApprovalService.rejectClients({
                OurBranchID: this.elements.filterBranchIdValue.value,
                RejectedReason: remarks,
                RejectedBy: 'web_portal',
                DetailRecords: xml
            });

            // Handle both camelCase and PascalCase
            const success = response.Success ?? response.success;
            const message = response.Message ?? response.message;

            if (success) {
                this.showMessage(message || 'Clients rejected successfully!', 'success');
                // Clear the table - rejected client no longer pending
                this.populateApprovalTable([]);
                this.pendingClients = [];
                this.clearApplicationSelection();
                this.selectedClients = [];
                this.elements.selectAllCheckbox.checked = false;
                this.updateActionButtons();
            } else {
                this.showMessage(message || 'Failed to reject clients', 'danger');
            }
        } catch (error) {
            this.showMessage('Error rejecting clients', 'danger');
        }
    }

    /**
     * Build XML for selected clients
     */
    buildClientXML() {
        let xml = '';
        this.selectedClients.forEach(selected => {
            const clientId = selected.ClientID;
            xml += `<dt_WFClientIndv><ClientID>${this.escapeXml(clientId)}</ClientID></dt_WFClientIndv>`;
        });
        return xml;
    }

    /**
     * Handle Close button click
     */
    handleClose() {
        try {
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({
                    type: 'accountMaintenanceChildClose',
                    source: 'ClientApproval'
                }, '*');
            }
            setTimeout(() => {
                try {
                    window.close();
                } catch (e) {
                    // Silent fail
                }
            }, 100);
        } catch (error) {
            // Silent fail
        }
    }

    /**
     * Show message to user
     */
    showMessage(message, type = 'info') {
        const div = this.elements.messageDiv;
        const textElement = this.elements.messageText;
        const iconElement = this.elements.messageIcon;

        const mappedType = type === 'danger' ? 'error' : type;
        div.className = `am-message-panel am-message-panel--${mappedType}`;
        if (textElement) {
            textElement.textContent = message;
        } else {
            div.textContent = message;
        }

        if (iconElement) {
            iconElement.className = 'bi bi-info-circle';
            if (mappedType === 'success') iconElement.className = 'bi bi-check-circle';
            if (mappedType === 'warning') iconElement.className = 'bi bi-exclamation-triangle';
            if (mappedType === 'error') iconElement.className = 'bi bi-x-circle';
        }

        div.classList.remove('d-none');

        setTimeout(() => {
            div.classList.add('d-none');
        }, 5000);
    }

    /**
     * Escape HTML entities
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    /**
     * Escape XML entities
     */
    escapeXml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ClientApprovalController();
});
