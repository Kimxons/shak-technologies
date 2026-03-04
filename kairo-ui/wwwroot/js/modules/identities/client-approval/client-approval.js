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
    }
};

window.ClientApprovalService = ClientApprovalService;

// ============================================================================
// CLIENT APPROVAL CONTROLLER
// ============================================================================

class ClientApprovalController {
    constructor() {
        this.pendingClients = [];
        this.selectedClients = [];
        this.statusReasons = [];
        this.searchModal = null;
        this.rejectionModalInstance = null;
    this.moduleId = (document.getElementById('moduleId')?.value || '6961').toString();

        // DOM Elements
        this.elements = {
            // Filters
            filterBranchId: document.getElementById('txt_branchId'),
            filterBranchIdValue: document.getElementById('txt_branchIdValue'),
            filterClientType: document.getElementById('ddl_clientType'),
            filterApplicationId: document.getElementById('txt_applicationId'),
            filterApplicationIdValue: document.getElementById('txt_applicationIdValue'),
            searchBranchBtn: document.getElementById('btn_searchBranch'),
            searchApplicationBtn: document.getElementById('btn_searchApplication'),
            loadApprovalsBtn: document.getElementById('btn_loadApprovals'),

            // Main content
            messageDiv: document.getElementById('dv_messagePanel'),
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
        console.log('[ClientApproval] Initializing...');

        this.initializeEventListeners();
        this.initializeLookups();
        this.initializeSearchModal();
        this.initializeSectionToggles();
        this.initializeRejectionModal();

        console.log('[ClientApproval] Initialization complete');
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
            if (!hasType) {
                this.elements.filterApplicationId.value = '';
                this.elements.filterApplicationIdValue.value = '';
            }
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
    }

    /**
     * Initialize section toggle functionality
     */
    initializeSectionToggles() {
        document.querySelectorAll('.ca-section-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const section = btn.closest('.ca-section');
                if (section) {
                    section.classList.toggle('collapsed');
                    const icon = btn.querySelector('i');
                    if (icon) {
                        icon.style.transform = section.classList.contains('collapsed') ? 'rotate(180deg)' : 'none';
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
            if (!hasServerOptions) {
                console.warn('[ClientApproval] Client Type options were not preloaded from Index action');
            }
        } catch (error) {
            console.error('[ClientApproval] Error initializing lookups:', error);
        }
    }

    /**
     * Initialize SearchModal
     */
    async initializeSearchModal() {
        try {
            const appCore = getAppCore();
            if (!appCore) {
                console.warn('[ClientApproval] AppCore not available for SearchModal');
                return;
            }

            this.searchModal = new SearchModal(appCore);
            console.log('[ClientApproval] SearchModal initialized');
        } catch (error) {
            console.error('[ClientApproval] Error initializing SearchModal:', error);
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
                    this.showMessage('Branch selected successfully', 'success');
                }
            });
        } catch (error) {
            console.error('[ClientApproval] Error opening branch search:', error);
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

                    // Load full client details
                    await this.loadClientDetails(record.ClientID);

                    // Load status reasons
                    await this.loadStatusReasons(clientType);

                    this.showMessage('Application selected successfully', 'success');
                }
            });
        } catch (error) {
            console.error('[ClientApproval] Error opening application search:', error);
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

            if (result.Success && result.Details) {
                const clients = Array.isArray(result.Details) ? result.Details : [result.Details];
                this.populateApprovalTable(clients);
                this.pendingClients = clients;
            } else {
                this.populateApprovalTable([]);
            }
        } catch (error) {
            console.error('[ClientApproval] Error loading client details:', error);
            this.showMessage('Error loading client details', 'danger');
        }
    }

    /**
     * Load pending approvals
     */
    async loadApprovals() {
        // Validate filters
        const branchId = this.elements.filterBranchIdValue.value?.trim();
        const clientType = this.elements.filterClientType.value?.trim();
        const applicationId = this.elements.filterApplicationIdValue.value?.trim();

        if (!branchId) {
            this.showMessage('Please select a Branch ID', 'warning');
            return;
        }

        if (!clientType) {
            this.showMessage('Please select a Client Type', 'warning');
            return;
        }

        if (!applicationId) {
            this.showMessage('Please select an Application ID', 'warning');
            return;
        }

        try {
            this.showMessage('Loading pending approvals...', 'info');

            const result = await ClientApprovalService.getPendingApprovals({
                OurBranchID: branchId,
                LogInBranchID: branchId,
                GroupID: '',
                ClientTypeID: clientType,
                ClientID: applicationId
            });

            if (result.Success && result.Details) {
                const clients = Array.isArray(result.Details) ? result.Details : [result.Details];
                this.populateApprovalTable(clients);
                this.pendingClients = clients;
                this.showMessage(`Found ${clients.length} pending approval(s)`, 'success');
            } else {
                this.populateApprovalTable([]);
                this.showMessage(result.Message || 'No pending approvals found', 'warning');
            }
        } catch (error) {
            console.error('[ClientApproval] Error loading approvals:', error);
            this.showMessage('Error loading pending approvals', 'danger');
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

            const reasons = result.Details01 || result.Details || [];
            this.renderStatusReasons(reasons);
            this.statusReasons = reasons;

            if (reasons.length > 0) {
                this.elements.statusReasonsSection.style.display = 'block';
            }
        } catch (error) {
            console.error('[ClientApproval] Error loading status reasons:', error);
            // Don't show error message for this optional section
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

            if (response.Success) {
                this.showMessage(response.Message || 'Clients approved successfully!', 'success');
                await this.loadApprovals();
                this.selectedClients = [];
                this.elements.selectAllCheckbox.checked = false;
                this.updateActionButtons();
            } else {
                this.showMessage(response.Message || 'Failed to approve clients', 'danger');
            }
        } catch (error) {
            console.error('[ClientApproval] Error approving clients:', error);
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

            if (response.Success) {
                this.showMessage(response.Message || 'Clients rejected successfully!', 'success');
                await this.loadApprovals();
                this.selectedClients = [];
                this.elements.selectAllCheckbox.checked = false;
                this.updateActionButtons();
            } else {
                this.showMessage(response.Message || 'Failed to reject clients', 'danger');
            }
        } catch (error) {
            console.error('[ClientApproval] Error rejecting clients:', error);
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
            // Try to close the window
            setTimeout(() => {
                try {
                    window.close();
                } catch (e) {
                    console.log('[ClientApproval] Could not close window:', e.message);
                }
            }, 100);
        } catch (error) {
            console.error('[ClientApproval] Error closing window:', error);
        }
    }

    /**
     * Show message to user
     */
    showMessage(message, type = 'info') {
        const div = this.elements.messageDiv;
        div.textContent = message;
        div.className = `ca-message ca-message-${type}`;
        div.style.display = 'block';

        setTimeout(() => {
            div.style.display = 'none';
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

// ============================================================================
// INITIALIZE ON DOM READY
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('[ClientApproval] DOM loaded, initializing...');
    new ClientApprovalController();
});
