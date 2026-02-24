
/**
 * Client Approval Page Controller
 * Handles batch approval/rejection of clients pending approval
 * @module pages/customer-management/client-approval
 */
(async function() {
  const { ServiceLoader } = window;

  // ============================================================
  // 1. LOAD DEPENDENCIES
  // ============================================================
  let dependenciesReady = false;
  
  try {
    await ServiceLoader.loadCore();
    await ServiceLoader.loadClientService();
    await ServiceLoader.loadLookupService();
    await ServiceLoader.loadSearchService();
    dependenciesReady = true;
    console.log("[ClientApproval] All dependencies loaded");
  } catch (error) {
    console.error("[ClientApproval] Failed to load dependencies:", error);
    alert("Failed to load required services. Please refresh the page.");
    return;
  }

  // ============================================================
  // 2. INITIALIZE SERVICES
  // ============================================================
  const ClientService = window.ClientService;
  const LookupService = window.LookupService;
  const SearchService = window.SearchService;
  const Environment = window.Environment || {};
  
  // Get session information
  const session = window.getAuthSession?.() || {};
  const operatorId = session.operatorId || session.OperatorID || "admin";
  const branchId = session.branchId || session.OurBranchID || "";

  // ============================================================
  // 3. CLASS DEFINITION
  // ============================================================
  class ClientApprovalController {
    constructor() {
      this.pendingClients = [];
      this.selectedClients = [];
      this.currentClientDetails = null;
      
      // DOM Elements
      this.elements = {
        // Filters
        branchIdFilter: document.getElementById("branchIdFilter"),
        branchIdValue: document.getElementById("branchIdValue"),
        branchNameDisplay: document.getElementById("branchNameDisplay"),
        clientTypeFilter: document.getElementById("clientTypeFilter"),
        applicationIdFilter: document.getElementById("applicationIdFilter"),
        applicationIdValue: document.getElementById("applicationIdValue"),
        applicationNameDisplay: document.getElementById("applicationNameDisplay"),
        applicationSearchBtn: document.getElementById("applicationSearchBtn"),
        applyFiltersBtn: document.getElementById("applyFiltersBtn"),
        
        // Table
        approvalTable: document.getElementById("approvalTable"),
        approvalTableBody: document.getElementById("approvalTableBody"),
        selectAll: document.getElementById("selectAll"),
        recordCount: document.getElementById("recordCount"),
        
        // Action buttons
        viewBtn: document.getElementById("viewBtn"),
        approveBtn: document.getElementById("approveBtn"),
        rejectBtn: document.getElementById("rejectBtn"),
        cancelBtn: document.getElementById("cancelBtn"),
        
        // Modal
        rejectionModal: document.getElementById("rejectionModal"),
        rejectionRemarks: document.getElementById("rejectionRemarks"),
        rejectionCount: document.getElementById("rejectionCount"),
        confirmRejectBtn: document.getElementById("confirmRejectBtn"),
        rejectionForm: document.getElementById("rejectionForm"),
        
        // Status Reasons
        statusReasonsSection: document.getElementById("statusReasonsSection"),
        statusReasonsTableBody: document.getElementById("statusReasonsTableBody"),
        selectAllReasons: document.getElementById("selectAllReasons"),
        
        // Message panel
        messagePanel: document.getElementById("messagePanel"),
        messageText: document.getElementById("messageText")
      };
      
      // Modal instances
      this.rejectionModalInstance = null;
      this.branchSearchModal = null;
      this.applicationSearchModal = null;
      
      this.initializeEventListeners();
      this.initializeLookups();
      this.initializeSearchModals();
      this.initializeSectionToggles();
    }

    /**
     * Initialize section toggle functionality
     */
    initializeSectionToggles() {
      document.querySelectorAll('[data-section-toggle]').forEach(header => {
        header.addEventListener('click', () => {
          const section = header.closest('.form-section');
          const toggleBtn = header.querySelector('.section-toggle-btn');
          const isCollapsed = section.classList.toggle('collapsed');
          if (toggleBtn) {
            toggleBtn.setAttribute('aria-expanded', !isCollapsed);
            const icon = toggleBtn.querySelector('i');
            if (icon) {
              icon.className = isCollapsed ? 'bi bi-chevron-down' : 'bi bi-chevron-up';
            }
          }
        });
      });
    }

    /**
     * Initialize all event listeners
     */
    initializeEventListeners() {
      // Filter button
      this.elements.applyFiltersBtn.addEventListener("click", () => this.loadPendingApprovals());
      
      // Search buttons
      document.querySelectorAll('[data-open-search="branch"]').forEach(btn => {
        btn.addEventListener("click", () => this.openBranchSearch());
      });
      
      document.querySelectorAll('[data-open-search="application"]').forEach(btn => {
        btn.addEventListener("click", () => this.openApplicationSearch());
      });
      
      // Client Type change - enable/disable application search
      this.elements.clientTypeFilter.addEventListener("change", () => {
        const hasClientType = this.elements.clientTypeFilter.value !== "";
        this.elements.applicationSearchBtn.disabled = !hasClientType;
        if (!hasClientType) {
          this.elements.applicationIdFilter.value = "";
          this.elements.applicationIdValue.value = "";
          this.elements.applicationNameDisplay.textContent = "";
        }
      });
      
      // Select all checkbox
      this.elements.selectAll.addEventListener("change", (e) => this.handleSelectAll(e.target.checked));
      
      // Action buttons
      this.elements.viewBtn.addEventListener("click", () => {
        // View functionality is in Client Supervision screen
        this.showToast("Use Client Supervision screen to view client details", "info");
      });
      this.elements.approveBtn.addEventListener("click", () => this.handleApprove());
      this.elements.rejectBtn.addEventListener("click", () => this.showRejectModal());
      this.elements.cancelBtn.addEventListener("click", () => this.postClose());
      
      // Rejection modal confirm
      this.elements.confirmRejectBtn.addEventListener("click", () => this.handleReject());
      
      // Initialize rejection modal instance
      this.rejectionModalInstance = new bootstrap.Modal(this.elements.rejectionModal);
    }

    /**
     * Post close action
     */
    postClose() {
      try {
        // Send message to parent to close this submodule
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ 
            type: 'accountMaintenanceChildClose',
            source: 'ClientApproval'
          }, '*');
        }
        
        // Also try to close the window directly
        setTimeout(() => {
          try {
            window.close();
          } catch(e) {
            console.log('[ClientApproval] Could not close window:', e.message);
          }
        }, 100);
      } catch (error) {
        console.error("[ClientApproval] Error closing window:", error);
      }
    }

    /**
     * Initialize lookups
     */
    async initializeLookups() {
      try {
        // Load Client Type dropdown
        const clientTypeOptions = await LookupService.getSystemCodeOptions("ClientTypeID");
        this.elements.clientTypeFilter.innerHTML = '<option value="">Select Type</option>';
        clientTypeOptions.forEach(option => {
          const opt = document.createElement("option");
          opt.value = option.value;
          opt.textContent = option.label;
          this.elements.clientTypeFilter.appendChild(opt);
        });
        
        console.log("[ClientApproval] Lookups loaded successfully");
      } catch (error) {
        console.error("[ClientApproval] Error loading lookups:", error);
      }
    }

    /**
     * Initialize search modals using shared SearchModal component
     */
    initializeSearchModals() {
      // Wait for SearchModal to be available
      const waitForSearchModal = (callback, maxWaitMs = 5000, intervalMs = 100) => {
        const start = Date.now();
        (function poll() {
          if (window.SearchModal) {
            callback();
          } else if (Date.now() - start < maxWaitMs) {
            setTimeout(poll, intervalMs);
          } else {
            console.warn('[ClientApproval] SearchModal not available after timeout');
          }
        })();
      };

      waitForSearchModal(() => {
        const moduleID = 6961;
        const getOperatorId = () => operatorId;
        const getOurBranchId = () => branchId;

        // Create Branch search modal instance
        this.branchSearchModal = new window.SearchModal({
          prefix: 'ca-branch-search',
          moduleID,
          getOperatorId,
          getOurBranchId
        });

        // Create Application search modal instance
        this.applicationSearchModal = new window.SearchModal({
          prefix: 'ca-application-search',
          moduleID,
          getOperatorId,
          getOurBranchId
        });

        console.log('[ClientApproval] Search modals initialized');
      });
    }

    /**
     * Open Branch Search Modal using shared SearchModal
     */
    openBranchSearch() {
      if (!this.branchSearchModal) {
        this.showToast("Search modal not ready, please try again", "warning");
        return;
      }

      const currentBranchId = this.elements.branchIdValue.value;
      
      this.branchSearchModal.open({
        title: 'Search Results',
        tableID: 'BranchID',
        searchFields: [
          { name: 'BranchID', label: 'Branch ID', column: 'OurBranchID', value: currentBranchId },
          { name: 'BranchName', label: 'Branch Name', column: 'BranchName' }
        ],
        autoSearch: true,
        onSelect: (record) => {
          this.elements.branchIdValue.value = record.OurBranchID || '';
          this.elements.branchIdFilter.value = record.OurBranchID || '';
          this.elements.branchNameDisplay.textContent = record.BranchName || '';
          this.showToast("Branch selected successfully", "success");
        }
      });
    }

    /**
     * Open Application Search Modal using shared SearchModal
     */
    openApplicationSearch() {
      const branchId = this.elements.branchIdValue.value;
      if (!branchId) {
        this.showToast("Please select Branch ID first", "warning");
        return;
      }

      const clientType = this.elements.clientTypeFilter.value;
      if (!clientType) {
        this.showToast("Please select Client Type first", "warning");
        return;
      }

      if (!this.applicationSearchModal) {
        this.showToast("Search modal not ready, please try again", "warning");
        return;
      }

      // Determine TableID based on Client Type
      let tableID;
      if (clientType === "G") {
        tableID = "WFGroupClientID";
      } else if (clientType === "C" || clientType === "CNC") {
        tableID = "WFCorporateClientID";
      } else {
        tableID = "WFClientID";
      }

      const currentApplicationId = this.elements.applicationIdValue.value;
      
      // Build WhereStmt with ClientTypeID filter
      const whereStmt = `WFClientStatusID = 'P' AND WFStageID = '40CA' AND ClientTypeID='${clientType}'`;
      
      this.applicationSearchModal.open({
        title: 'Find Application',
        tableID: tableID,
        whereStmt: whereStmt,
        searchFields: [
          { name: 'ClientID', label: 'Client ID', column: 'ClientID', value: currentApplicationId },
          { name: 'Name', label: 'Client Name', column: 'Name' }
        ],
        autoSearch: true,
        onSelect: async (record) => {
          // Store selected client for later use
          this.selectedClient = record;
          
          this.elements.applicationIdValue.value = record.ClientID || '';
          this.elements.applicationIdFilter.value = record.ClientID || '';
          this.elements.applicationNameDisplay.textContent = record.Name || '';
          
          // Now call p_GetGroupClientApproval to get full client details for the grid
          await this.loadClientApprovalDetails(record.ClientID);
          
          // Load Status Reasons for this client
          this.loadStatusReasons(record.ClientTypeID || clientType);
          
          this.showToast("Application selected successfully", "success");
        }
      });
    }

    /**
     * Load full client details using p_GetGroupClientApproval
     */
    async loadClientApprovalDetails(clientId) {
      try {
        const branchId = this.elements.branchIdValue.value;
        const clientType = this.elements.clientTypeFilter.value;
        
        const result = await ClientService.getGroupClientApproval({
          OurBranchID: branchId,
          LogInBranchID: "",
          GroupID: "",
          OperatorID: operatorId,
          ClientTypeID: clientType,
          ClientID: clientId
        });
        
        console.log("[ClientApproval] p_GetGroupClientApproval response:", result);
        
        if (result.success && result.data) {
          // Extract Details array from response
          const details = result.data.Details || result.data || [];
          const clients = Array.isArray(details) ? details : [details];
          
          if (clients.length > 0) {
            this.populateApprovalGrid(clients);
            this.pendingClients = clients;
          } else {
            this.populateApprovalGrid([]);
          }
        } else {
          console.warn("[ClientApproval] No data returned from p_GetGroupClientApproval");
          this.populateApprovalGrid([]);
        }
      } catch (error) {
        console.error("[ClientApproval] Error loading client approval details:", error);
        this.showToast("Error loading client details", "warning");
      }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text || "";
      return div.innerHTML;
    }

    /**
     * Populate the approval grid with selected client(s)
     */
    populateApprovalGrid(clients) {
      const tbody = this.elements.approvalTableBody;
      tbody.innerHTML = "";
      
      if (!clients || clients.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="11" class="text-muted py-2">
              No records to display.
            </td>
          </tr>
        `;
        this.elements.recordCount.textContent = "0 records";
        return;
      }
      
      clients.forEach((client, index) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>
            <input type="checkbox" class="form-check-input client-select" data-index="${index}">
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
        
        // Store client data on the row for later use
        tr.dataset.clientData = JSON.stringify(client);
        
        // Add click handler to select row
        tr.addEventListener("click", (e) => {
          if (e.target.type !== "checkbox") {
            const checkbox = tr.querySelector('.client-select');
            if (checkbox) {
              checkbox.checked = !checkbox.checked;
              this.handleCheckboxChange();
            }
          }
        });
        
        // Add checkbox change event
        const checkbox = tr.querySelector(".client-select");
        if (checkbox) {
          checkbox.addEventListener("change", (e) => {
            e.stopPropagation();
            this.handleCheckboxChange();
          });
        }
        
        tbody.appendChild(tr);
      });
      
      this.elements.recordCount.textContent = `${clients.length} record(s)`;
      
      // Store clients for approval actions
      this.pendingClients = clients;
      
      // Enable action buttons
      this.updateActionButtons();
    }

    /**
     * Load Status Reasons (WFDataCheckFields) for approval checklist
     */
    async loadStatusReasons(clientTypeID) {
      try {
        // Map ClientTypeID to WorkflowID
        // I (Individual) -> C, B (Business) -> B, G (Group) -> G
        let workflowID = "C"; // Default to Client
        if (clientTypeID === "B") {
          workflowID = "B";
        } else if (clientTypeID === "G") {
          workflowID = "G";
        }
        
        const branchId = this.elements.branchIdValue.value;
        
        const requestPayload = {
          RequestID: "",
          FormId: "dbo.p_GetWFDataCheckFields",
          RequestData: {
            BankID: "00",
            WorkflowID: workflowID,
            OurBranchID: branchId,
            OperatorID: operatorId
          },
          RequestTime: new Date().toLocaleString("en-US", {
            month: "2-digit",
            day: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
          }).replace(",", ""),
          AppName: "PROJECT_KAIRO",
          Checksum: ""
        };
        
        console.log("[ClientApproval] Fetching Status Reasons:", requestPayload);
        
        // Use the correct OldAPI endpoint
        const Environment = window.Environment || {};
        const baseUrl = (Environment.baseUrlSystemCodes || "http://172.16.2.31:3306").replace(/\/+$/, "");
        
        const response = await fetch(`${baseUrl}/api/OldAPI`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "skipToken": "true" },
          body: JSON.stringify(requestPayload)
        });
        
        const result = await response.json();
        console.log("[ClientApproval] Status Reasons response:", result);
        
        // The response has Details01 with the checklist items
        const statusReasons = result.Details01 || [];
        this.renderStatusReasons(statusReasons);
        
        // Show the status reasons section
        if (this.elements.statusReasonsSection) {
          this.elements.statusReasonsSection.style.display = "block";
        }
        
      } catch (error) {
        console.error("[ClientApproval] Error loading status reasons:", error);
        this.showToast("Error loading status reasons", "warning");
      }
    }

    /**
     * Render status reasons checklist
     */
    renderStatusReasons(reasons) {
      const tbody = this.elements.statusReasonsTableBody;
      tbody.innerHTML = "";
      
      if (!reasons || reasons.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="2" class="text-muted py-2">
              No records to display.
            </td>
          </tr>
        `;
        return;
      }
      
      reasons.forEach((reason, index) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>
            <input type="checkbox" class="form-check-input reason-select" 
                   data-index="${index}" 
                   data-field-id="${this.escapeHtml(reason.CrossCheckFieldID)}"
                   ${reason.IsSelected ? 'checked' : ''}>
          </td>
          <td>${this.escapeHtml(reason.Description)}</td>
        `;
        tbody.appendChild(tr);
      });
      
      // Store reasons for later use in approval
      this.statusReasons = reasons;
      
      // Setup select all handler
      if (this.elements.selectAllReasons) {
        this.elements.selectAllReasons.onchange = (e) => {
          const checkboxes = tbody.querySelectorAll('.reason-select');
          checkboxes.forEach(cb => cb.checked = e.target.checked);
        };
      }
    }

    /**
     * Show message to user
     */
    showMessage(message, type = "info") {
      this.elements.messageText.textContent = message;
      this.elements.messagePanel.className = `am-message-panel am-message-panel--${type}`;
      this.elements.messagePanel.style.display = "block";
      setTimeout(() => {
        this.elements.messagePanel.style.display = "none";
      }, 5000);
    }

    /**
     * Show toast notification
     */
    showToast(message, type = "info") {
      const Toast = Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
      
      Toast.fire({
        icon: type === "danger" ? "error" : type,
        title: message
      });
    }

    /**
     * Load pending approvals from API
     */
    async loadPendingApprovals() {
      // Validate mandatory fields
      const branchId = this.elements.branchIdValue.value.trim();
      const clientType = this.elements.clientTypeFilter.value.trim();
      const applicationId = this.elements.applicationIdValue.value.trim();
      
      if (!branchId) {
        this.showToast("Please select a Branch", "warning");
        return;
      }
      
      if (!clientType) {
        this.showToast("Please select a Client Type", "warning");
        return;
      }
      
      if (!applicationId) {
        this.showToast("Please select an Application", "warning");
        return;
      }
      
      try {
        this.showMessage("Loading pending approvals...", "info");
        
        const params = {
          OurBranchID: branchId,
          LogInBranchID: branchId,
          GroupID: "",
          OperatorID: operatorId,
          ClientTypeID: clientType,
          ClientID: applicationId
        };
        
        const result = await ClientService.getGroupClientApproval(params);
        
        if (result.success && result.data) {
          this.pendingClients = Array.isArray(result.data) ? result.data : [result.data];
          this.renderApprovalTable();
          this.showMessage(`Found ${this.pendingClients.length} pending approval(s)`, "success");
        } else {
          this.pendingClients = [];
          this.renderApprovalTable();
          this.showMessage(result.message || "No pending approvals found", "warning");
        }
      } catch (error) {
        console.error("[ClientApproval] Error loading pending approvals:", error);
        this.showToast("Error loading pending approvals", "danger");
        this.pendingClients = [];
        this.renderApprovalTable();
      }
    }

    /**
     * Render the approval table with pending clients
     */
    renderApprovalTable() {
      const tbody = this.elements.approvalTableBody;
      tbody.innerHTML = "";
      
      this.elements.recordCount.textContent = `${this.pendingClients.length} records`;
      
      if (this.pendingClients.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="11" class="text-muted py-2">
              No records to display.
            </td>
          </tr>
        `;
        this.updateActionButtons();
        return;
      }
      
      this.pendingClients.forEach((client, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>
            <input type="checkbox" class="form-check-input client-checkbox" data-index="${index}" data-client-id="${client.ClientID}">
          </td>
          <td>${client.GenderID || client.Gender || "-"}</td>
          <td>${client.DateOfBirth || "-"}</td>
          <td>${client.NationalityID || client.Nationality || "-"}</td>
          <td>${client.IdentificationNo || client.IDNo || "-"}</td>
          <td>${client.MaritalStatusID || client.MaritalStatus || "-"}</td>
          <td>${client.Address || "-"}</td>
          <td>${client.MobileNo || client.Mobile || "-"}</td>
          <td>${client.CenterID || "-"}</td>
          <td>${client.GroupID || "-"}</td>
          <td>${client.CreatedBy || "-"}</td>
        `;
        
        // Store client data on row
        row.dataset.clientData = JSON.stringify(client);
        
        // Add click event to toggle selection
        row.style.cursor = "pointer";
        row.addEventListener("click", (e) => {
          if (e.target.type !== "checkbox") {
            const checkbox = row.querySelector('.client-checkbox');
            if (checkbox) {
              checkbox.checked = !checkbox.checked;
              this.handleCheckboxChange();
            }
          }
        });
        
        // Add checkbox change event
        const checkbox = row.querySelector(".client-checkbox");
        checkbox.addEventListener("change", (e) => {
          e.stopPropagation();
          this.handleCheckboxChange();
        });
        
        tbody.appendChild(row);
      });
      
      this.updateActionButtons();
    }

    /**
     * Handle select all checkbox
     */
    handleSelectAll(checked) {
      // Handle both class names used in different render methods
      const checkboxes = document.querySelectorAll(".client-checkbox, .client-select");
      checkboxes.forEach(cb => cb.checked = checked);
      this.handleCheckboxChange();
    }

    /**
     * Handle checkbox changes and update selected clients
     */
    handleCheckboxChange() {
      // Handle both class names used in different render methods
      const checkboxes = document.querySelectorAll(".client-checkbox:checked, .client-select:checked");
      this.selectedClients = Array.from(checkboxes).map(cb => {
        const row = cb.closest("tr");
        const clientData = row?.dataset.clientData ? JSON.parse(row.dataset.clientData) : {};
        return {
          ClientID: cb.getAttribute("data-client-id") || clientData.ClientID,
          index: parseInt(cb.getAttribute("data-index"))
        };
      });
      
      this.updateActionButtons();
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
     * Build XML for selected clients
     */
    buildClientXML() {
      let xml = "";
      this.selectedClients.forEach(selected => {
        const clientId = selected.ClientID;
        xml += `<dt_WFClientIndv><ClientID>${clientId}</ClientID></dt_WFClientIndv>`;
      });
      return xml;
    }

    /**
     * Handle approve button click
     */
    async handleApprove() {
      if (this.selectedClients.length === 0) return;
      
      const result = await Swal.fire({
        title: "Approve Clients",
        html: `Are you sure you want to approve <strong>${this.selectedClients.length}</strong> client(s)?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: '<i class="bi bi-check-circle"></i> Yes, Approve',
        cancelButtonText: "Cancel",
        confirmButtonColor: "#28a745",
        cancelButtonColor: "#6c757d"
      });
      
      if (!result.isConfirmed) return;
      
      try {
        this.showToast("Approving clients...", "info");
        
        const xml = this.buildClientXML();
        
        // Format date as MM/DD/YYYY HH:MM:SS (no comma - SQL Server smalldatetime requirement)
        const now = new Date();
        const approvedOn = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        
        const approvalResponse = await ClientService.approveClients({
          OurBranchID: this.elements.branchIdValue.value,
          ApprovedBy: operatorId,
          ApprovedOn: approvedOn,
          DetailRecords: xml
        });
        
        if (approvalResponse.success) {
          this.showToast(approvalResponse.message || "Clients approved successfully!", "success");
          
          // Extract the generated ClientID(s) from the approval response
          // The response should contain the actual assigned ClientID after approval
          let approvedClientIds = [];
          try {
            const approvalData = approvalResponse.data?.Details || approvalResponse.data?.data?.Details || approvalResponse.data;
            if (approvalData) {
              const dataArray = Array.isArray(approvalData) ? approvalData : [approvalData];
              approvedClientIds = dataArray.map(item => item.ClientID || item.NewClientID || item.GeneratedClientID).filter(Boolean);
              console.log("[ClientApproval] Approved ClientIDs from response:", approvedClientIds);
            }
          } catch (e) {
            console.warn("[ClientApproval] Could not extract ClientIDs from approval response:", e);
          }
          
          // Push to supervision for each approved client using the NEW ClientID from response
          try {
            const supervisionPromises = this.selectedClients.map(async (selected, index) => {
              // Use the ClientID from approval response if available, otherwise fall back to original
              const actualClientId = approvedClientIds[index] || approvedClientIds[0] || selected.ClientID;
              console.log("[ClientApproval] Using ClientID for supervision:", actualClientId, "(original:", selected.ClientID, ")");
              
              // Get client details for NewData/OldData using the ACTUAL generated ClientID
              let clientDetailsData = "";
              try {
                const clientDetailsResult = await ClientService.getClientDetails({
                  ClientID: actualClientId
                });
                if (clientDetailsResult.success && clientDetailsResult.data) {
                  clientDetailsData = JSON.stringify(clientDetailsResult.data);
                }
              } catch (e) {
                console.warn("[ClientApproval] Could not get client details:", e);
              }
              
              // Build keys using the actual ClientID
              const searchKey = `[OperatorID:${operatorId}][ClientID:${actualClientId}]`;
              const lockKey = `[OperatorID:${operatorId}][ClientID:${actualClientId}]`;
              
              return ClientService.addClientSupervisionData({
                OurBranchID: this.elements.branchIdValue.value,
                ModuleID: 6961,
                LockModuleID: 6961,
                OperatorID: operatorId,
                Searchkey: searchKey,
                LockKey: lockKey,
                EventID: 1,
                NewData: clientDetailsData,
                OldData: "",
                Remarks: "Client approved",
                NewRecord: 1,
                IPAddress: ""
              });
            });
            
            await Promise.all(supervisionPromises);
            console.log("[ClientApproval] Clients added to supervision queue");
          } catch (supervisionError) {
            console.error("[ClientApproval] Error adding to supervision:", supervisionError);
            // Continue even if supervision fails
          }
          
          // Reload the list
          await this.loadPendingApprovals();
          
          // Clear selection
          this.selectedClients = [];
          this.elements.selectAll.checked = false;
          this.updateActionButtons();
        } else {
          this.showToast(approvalResponse.message || "Failed to approve clients", "danger");
        }
      } catch (error) {
        console.error("[ClientApproval] Error during approval:", error);
        this.showToast("Error approving clients", "danger");
      }
    }

    /**
     * Show rejection modal
     */
    showRejectModal() {
      if (this.selectedClients.length === 0) return;
      
      this.elements.rejectionCount.textContent = this.selectedClients.length;
      this.elements.rejectionRemarks.value = "";
      this.elements.rejectionForm.classList.remove("was-validated");
      
      this.rejectionModalInstance.show();
    }

    /**
     * Handle reject button click
     */
    async handleReject() {
      // Validate form
      if (!this.elements.rejectionForm.checkValidity()) {
        this.elements.rejectionForm.classList.add("was-validated");
        return;
      }
      
      const remarks = this.elements.rejectionRemarks.value.trim();
      if (remarks.length < 10) {
        this.showToast("Rejection remarks must be at least 10 characters", "warning");
        return;
      }
      
      try {
        this.showToast("Rejecting clients...", "info");
        this.rejectionModalInstance.hide();
        
        const xml = this.buildClientXML();
        const rejectionResponse = await ClientService.rejectClients({
          OurBranchID: this.elements.branchIdValue.value,
          RejectedReason: remarks,
          RejectedBy: operatorId,
          DetailRecords: xml
        });
        
        if (rejectionResponse.success) {
          this.showToast(rejectionResponse.message || "Clients rejected successfully!", "success");
          
          // Reload the list
          await this.loadPendingApprovals();
          
          // Clear selection
          this.selectedClients = [];
          this.elements.selectAll.checked = false;
          this.updateActionButtons();
        } else {
          this.showToast(rejectionResponse.message || "Failed to reject clients", "danger");
        }
      } catch (error) {
        console.error("[ClientApproval] Error during rejection:", error);
        this.showToast("Error rejecting clients", "danger");
      }
    }
  }

  // ============================================================
  // 4. INITIALIZE PAGE
  // ============================================================
  function initializeController() {
    console.log("[ClientApproval] Initializing controller...");
    new ClientApprovalController();
  }

  // Wait for DOM to be ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeController);
  } else {
    initializeController();
  }

})();
