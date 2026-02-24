
/**
 * Client Supervision Page Controller
 * Handles supervision of approved clients with full client details via tabs
 * Uses same logic as client-maintenance for populating tabs
 * @module pages/customer-management/client-supervision
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
    await ServiceLoader.loadTempImageService();
    dependenciesReady = true;
    console.log("[ClientSupervision] All dependencies loaded");
  } catch (error) {
    console.error("[ClientSupervision] Failed to load dependencies:", error);
    alert("Failed to load required services. Please refresh the page.");
    return;
  }

  // ============================================================
  // 2. INITIALIZE SERVICES
  // ============================================================
  const ClientService = window.ClientService;
  const LookupService = window.LookupService;
  const TempImageService = window.TempImageService;
  const Environment = window.Environment || {};
  
  // Get session information
  const session = window.getAuthSession?.() || {};
  const operatorId = session.operatorId || session.OperatorID || "CSADM";
  const defaultBranchId = session.branchId || session.OurBranchID || "0603";

  // Helper function to extract inner details from OldAPI response
  function extractOldApiInnerDetails(response) {
    if (!response || !response.data) return null;
    const data = response.data;
    if (Array.isArray(data) && data.length > 0 && data[0].Details) {
      return data[0].Details;
    }
    if (data.Details) {
      return data.Details;
    }
    return data;
  }

  // ============================================================
  // 3. CLASS DEFINITION
  // ============================================================
  class ClientSupervisionController {
    constructor() {
      this.supervisionList = [];
      this.currentClient = null;
      this.currentClientData = {};
      this.clientImages = [];
      this.currentImageIndex = 0;
      
      // DOM Elements
      this.elements = {
        // Search / Filter
        branchFilter: document.getElementById("branchFilter"),
        clientIdSearch: document.getElementById("clientIdSearch"),
        searchClientBtn: document.getElementById("searchClientBtn"),
        
        // Table
        supervisionTable: document.getElementById("supervisionTable"),
        supervisionTableBody: document.getElementById("supervisionTableBody"),
        recordCount: document.getElementById("recordCount"),
        
        // Client Details Section
        clientDetailsSection: document.getElementById("clientDetailsSection"),
        
        // Personal Tab
        dtlClientID: document.getElementById("dtlClientID"),
        dtlClientType: document.getElementById("dtlClientType"),
        dtlTitle: document.getElementById("dtlTitle"),
        dtlFirstName: document.getElementById("dtlFirstName"),
        dtlMiddleName: document.getElementById("dtlMiddleName"),
        dtlLastName: document.getElementById("dtlLastName"),
        dtlDOB: document.getElementById("dtlDOB"),
        dtlGender: document.getElementById("dtlGender"),
        dtlResident: document.getElementById("dtlResident"),
        dtlNationality: document.getElementById("dtlNationality"),
        dtlLiteracyLevel: document.getElementById("dtlLiteracyLevel"),
        dtlIssuedBy: document.getElementById("dtlIssuedBy"),
        dtlIdType: document.getElementById("dtlIdType"),
        dtlIdNo: document.getElementById("dtlIdNo"),
        dtlIdIssueDate: document.getElementById("dtlIdIssueDate"),
        dtlIdExpiryDate: document.getElementById("dtlIdExpiryDate"),
        dtlMaritalStatus: document.getElementById("dtlMaritalStatus"),
        dtlMotherName: document.getElementById("dtlMotherName"),
        
        // Corporate Tab
        dtlCorpClientID: document.getElementById("dtlCorpClientID"),
        dtlCorpClientType: document.getElementById("dtlCorpClientType"),
        dtlCorpClientName: document.getElementById("dtlCorpClientName"),
        dtlCorpCompanyName: document.getElementById("dtlCorpCompanyName"),
        dtlCorpConstitution: document.getElementById("dtlCorpConstitution"),
        dtlCorpLineOfBusiness: document.getElementById("dtlCorpLineOfBusiness"),
        dtlCorpIdType: document.getElementById("dtlCorpIdType"),
        dtlCorpIdNo: document.getElementById("dtlCorpIdNo"),
        dtlCorpRegDate: document.getElementById("dtlCorpRegDate"),
        dtlCorpIssuedBy: document.getElementById("dtlCorpIssuedBy"),
        dtlCorpIdIssueDate: document.getElementById("dtlCorpIdIssueDate"),
        dtlCorpIdExpiryDate: document.getElementById("dtlCorpIdExpiryDate"),
        dtlCorpTIN: document.getElementById("dtlCorpTIN"),
        dtlCorpCountry: document.getElementById("dtlCorpCountry"),
        
        // Address Tab
        dtlAddrType: document.getElementById("dtlAddrType"),
        dtlAddress1: document.getElementById("dtlAddress1"),
        dtlAddrCountry: document.getElementById("dtlAddrCountry"),
        dtlAddrRegion: document.getElementById("dtlAddrRegion"),
        dtlAddrCity: document.getElementById("dtlAddrCity"),
        dtlAddrSubCity: document.getElementById("dtlAddrSubCity"),
        dtlAddrWereda: document.getElementById("dtlAddrWereda"),
        dtlAddrKebele: document.getElementById("dtlAddrKebele"),
        dtlAddrHouseNo: document.getElementById("dtlAddrHouseNo"),
        dtlAddrMobile: document.getElementById("dtlAddrMobile"),
        
        // Employment Tab
        dtlEmpStatus: document.getElementById("dtlEmpStatus"),
        dtlEmpCompanyType: document.getElementById("dtlEmpCompanyType"),
        dtlEmpOccupation: document.getElementById("dtlEmpOccupation"),
        dtlEmpPosition: document.getElementById("dtlEmpPosition"),
        dtlEmpMonthlyIncome: document.getElementById("dtlEmpMonthlyIncome"),
        dtlEmpAnnualIncome: document.getElementById("dtlEmpAnnualIncome"),
        
        // Other Details Tab
        dtlPEP: document.getElementById("dtlPEP"),
        dtlUSPerson: document.getElementById("dtlUSPerson"),
        dtlDataCleansed: document.getElementById("dtlDataCleansed"),
        
        // Images Tab
        photoPreviewImg: document.getElementById("photoPreviewImg"),
        noPhotoText: document.getElementById("noPhotoText"),
        signaturePreviewImg: document.getElementById("signaturePreviewImg"),
        noSignatureText: document.getElementById("noSignatureText"),
        photoSignatureTable: document.getElementById("photoSignatureTable"),
        photoSignatureTableBody: document.getElementById("photoSignatureTableBody"),
        noImagesRow: document.getElementById("noImagesRow"),
        
        // Action buttons
        viewBtn: document.getElementById("viewBtn"),
        approveBtn: document.getElementById("approveBtn"),
        rejectBtn: document.getElementById("rejectBtn"),
        closeBtn: document.getElementById("closeBtn"),
        
        // Modal
        supervisionRejectModal: document.getElementById("supervisionRejectModal"),
        supervisionRejectRemarks: document.getElementById("supervisionRejectRemarks"),
        confirmSupervisionRejectBtn: document.getElementById("confirmSupervisionRejectBtn"),
        supervisionRejectForm: document.getElementById("supervisionRejectForm"),
        
        // Message panel
        messagePanel: document.getElementById("messagePanel"),
        messageText: document.getElementById("messageText")
      };
      
      this.rejectModalInstance = null;
      this.clientSearchModal = null;  // SearchModal instance for client search
      this.photoSignatures = [];      // Photo/signature collection
      this.lookupCache = {};          // Cache for lookup values
      
      this.initializeEventListeners();
      this.initializeSearchModals();
      this.loadAllLookups();          // Load dropdown values
      this.loadBranches();
      this.loadSupervisionList();
    }

    /**
     * Initialize SearchModal for client lookup
     */
    initializeSearchModals() {
      const self = this;
      
      // Helper function to wait for SearchModal to be available
      const waitForSearchModal = (callback, maxWaitMs = 5000, intervalMs = 100) => {
        const start = Date.now();
        (function poll() {
          if (window.SearchModal) {
            callback();
          } else if (Date.now() - start < maxWaitMs) {
            setTimeout(poll, intervalMs);
          } else {
            console.warn("[ClientSupervision] SearchModal not available after waiting");
          }
        })();
      };
      
      waitForSearchModal(() => {
        console.log("[ClientSupervision] Initializing SearchModal for client lookup");
        
        // Create SearchModal with custom searchFn that uses p_getclientsupervisionpending
        this.clientSearchModal = new window.SearchModal({
          prefix: 'cs-client-search',
          moduleID: 6961,
          getOperatorId: () => operatorId,
          getOurBranchId: () => self.elements.branchFilter?.value || defaultBranchId,
          searchFn: async (payload, config) => {
            // Use our supervision pending API instead of default search
            const selectedBranch = self.elements.branchFilter?.value || defaultBranchId;
            const params = {
              OurBranchID: defaultBranchId,  // Logged-in branch (maker)
              OperatorID: operatorId,
              MainModuleID: "",              // Empty as per API requirement
              BranchList: selectedBranch     // Selected branch to supervise (checker)
            };
            
            const result = await ClientService.getClientSupervisionPending(params);
            
            if (result.success && result.data) {
              const data = result.data.Details || result.data;
              let items = Array.isArray(data) ? data : [data];
              // Filter out empty/invalid entries (handle case variations: clientid vs ClientID, SearchKey vs Searchkey)
              items = items.filter(item => item && (item.ClientID || item.clientid || item.SearchKey || item.Searchkey));
              
              // Normalize field names to handle API case variations
              items = items.map(item => ({
                ...item,
                ClientID: item.ClientID || item.clientid || '',
                Name: item.Name || item.ClientName || item.name || '',
                Status: item.Status || item.status || '',
                SearchKey: item.SearchKey || item.Searchkey || ''
              }));
              
              // Apply client-side filtering based on search criteria from modal
              const criteriaContainer = document.getElementById('cs-client-search-criteria');
              if (criteriaContainer) {
                const clientIdInput = criteriaContainer.querySelector('[data-search-field="ClientID"]');
                const clientNameInput = criteriaContainer.querySelector('[data-search-field="Name"]');
                
                const clientIdFilter = clientIdInput?.value?.trim().toLowerCase();
                const clientNameFilter = clientNameInput?.value?.trim().toLowerCase();
                
                if (clientIdFilter) {
                  items = items.filter(item => {
                    const clientId = (item.ClientID || '').toLowerCase();
                    return clientId.includes(clientIdFilter);
                  });
                }
                
                if (clientNameFilter) {
                  items = items.filter(item => {
                    const name = (item.Name || '').toLowerCase();
                    return name.includes(clientNameFilter);
                  });
                }
              }
              
              return { Details: items };
            }
            
            return { Details: [] };
          },
          onError: (msg) => {
            console.error("[ClientSupervision] SearchModal error:", msg);
            self.showToast("Search error occurred", "error");
          }
        });
        
        console.log("[ClientSupervision] SearchModal initialized successfully");
      });
    }

    /**
     * Initialize all event listeners
     */
    initializeEventListeners() {
      // Search button - always open the lookup modal
      this.elements.searchClientBtn?.addEventListener("click", () => this.openClientSearch());
      
      // Enter key in search field - search if text entered, otherwise open modal
      this.elements.clientIdSearch?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") this.searchClient();
      });
      
      // Branch filter change - reload list
      this.elements.branchFilter?.addEventListener("change", () => this.loadSupervisionList());
      
      // Close button
      this.elements.closeBtn?.addEventListener("click", () => window.close());
      
      // Action buttons
      this.elements.viewBtn?.addEventListener("click", () => this.handleView());
      this.elements.approveBtn?.addEventListener("click", () => this.handleApprove());
      this.elements.rejectBtn?.addEventListener("click", () => this.showRejectModal());
      
      // Rejection modal confirm
      this.elements.confirmSupervisionRejectBtn?.addEventListener("click", () => this.handleReject());
      
      // Image navigation
      this.elements.prevImageBtn?.addEventListener("click", () => this.navigateImage(-1));
      this.elements.nextImageBtn?.addEventListener("click", () => this.navigateImage(1));
      
      // Initialize rejection modal instance
      if (this.elements.supervisionRejectModal) {
        this.rejectModalInstance = new bootstrap.Modal(this.elements.supervisionRejectModal);
      }
      
      // Section toggle functionality
      document.querySelectorAll('[data-section-toggle]').forEach(header => {
        header.addEventListener('click', (e) => {
          // Don't toggle if clicking on an interactive element
          if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON') {
            return;
          }
          const section = header.closest('.form-section');
          const toggleBtn = header.querySelector('.section-toggle-btn');
          const content = section.querySelector('.section-content, [data-section-content]');
          const isCollapsed = section.classList.toggle('collapsed');
          if (toggleBtn) {
            toggleBtn.setAttribute('aria-expanded', !isCollapsed);
            const icon = toggleBtn.querySelector('i');
            if (icon) {
              icon.className = isCollapsed ? 'bi bi-chevron-down' : 'bi bi-chevron-up';
            }
          }
          if (content) {
            content.style.display = isCollapsed ? 'none' : '';
          }
        });
      });
    }

    /**
     * Load branch list from API
     */
    async loadBranches() {
      try {
        const result = await ClientService.getBranchList({
          OperatorID: operatorId
        });
        
        console.log("[ClientSupervision] Branch list response:", result);
        
        if (result.success && result.data) {
          const branches = Array.isArray(result.data) ? result.data : 
                          (result.data.Details ? result.data.Details : [result.data]);
          
          this.elements.branchFilter.innerHTML = '<option value="">--Select--</option>';
          
          branches.forEach(branch => {
            const branchId = branch.SubCodeID || branch.BranchID || branch.OurBranchID || branch.BranchCode;
            const branchName = branch.Description || branch.BranchName || branchId;
            const option = document.createElement("option");
            option.value = branchId;
            option.textContent = `${branchId} - ${branchName}`;
            if (branchId === defaultBranchId) option.selected = true;
            this.elements.branchFilter.appendChild(option);
          });
        } else {
          // Fallback to default branch
          this.elements.branchFilter.innerHTML = `
            <option value="">--Select--</option>
            <option value="${defaultBranchId}" selected>${defaultBranchId}</option>
          `;
        }
      } catch (error) {
        console.error("[ClientSupervision] Error loading branches:", error);
        this.elements.branchFilter.innerHTML = `
          <option value="">--Select--</option>
          <option value="${defaultBranchId}" selected>${defaultBranchId}</option>
        `;
      }
    }

    /**
     * Load all lookup values for dropdown fields
     */
    async loadAllLookups() {
      if (!LookupService?.getSystemCodeOptions) {
        console.warn("[ClientSupervision] LookupService not available");
        return;
      }

      try {
        console.log("[ClientSupervision] Loading lookup values...");
        
        // Define lookup mappings: element ID -> system code key
        const lookupMappings = [
          // Personal Tab
          { elementId: 'dtlClientType', codeKey: 'ClientTypeID' },
          { elementId: 'dtlTitle', codeKey: 'TitleID' },
          { elementId: 'dtlGender', codeKey: 'GenderID' },
          { elementId: 'dtlResident', codeKey: 'ResidentID' },
          { elementId: 'dtlNationality', codeKey: 'NationalityID' },
          { elementId: 'dtlLiteracyLevel', codeKey: 'LiteracyLevelID' },
          { elementId: 'dtlIdType', codeKey: 'IdentificationTypeID' },
          { elementId: 'dtlMaritalStatus', codeKey: 'MaritalStatusID' },
          // Corporate Tab
          { elementId: 'dtlCorpClientType', codeKey: 'ClientTypeID' },
          { elementId: 'dtlCorpConstitution', codeKey: 'ConstitutionID' },
          { elementId: 'dtlCorpLineOfBusiness', codeKey: 'LineOfBusinessID' },
          { elementId: 'dtlCorpIdType', codeKey: 'IdentificationTypeID' },
          // Address Tab
          { elementId: 'dtlAddrType', codeKey: 'AddressTypeID' },
          { elementId: 'dtlAddrCountry', codeKey: 'CountryID' },
          { elementId: 'dtlAddrRegion', codeKey: 'RegionID' },
          // Employment Tab
          { elementId: 'dtlEmpStatus', codeKey: 'EmploymentStatusID' },
          { elementId: 'dtlEmpCompanyType', codeKey: 'CompanyTypeID' },
          { elementId: 'dtlEmpOccupation', codeKey: 'OccupationID' }
        ];

        // Load each lookup and populate dropdown
        for (const mapping of lookupMappings) {
          try {
            const options = await LookupService.getSystemCodeOptions(mapping.codeKey);
            this.lookupCache[mapping.codeKey] = options || [];
            this.populateDropdown(mapping.elementId, options);
          } catch (err) {
            console.warn(`[ClientSupervision] Failed to load ${mapping.codeKey}:`, err);
          }
        }

        // Populate Yes/No dropdowns manually (PEP, USPerson, DataCleansed)
        const yesNoOptions = [
          { value: '', label: '--Select--' },
          { value: 'Y', label: 'Yes' },
          { value: 'N', label: 'No' }
        ];
        
        ['dtlPEP', 'dtlUSPerson', 'dtlDataCleansed'].forEach(elementId => {
          this.populateDropdown(elementId, yesNoOptions, false);
        });

        console.log("[ClientSupervision] Lookup values loaded");
      } catch (error) {
        console.error("[ClientSupervision] Error loading lookups:", error);
      }
    }

    /**
     * Populate a dropdown element with options
     */
    populateDropdown(elementId, options, addPlaceholder = true) {
      const element = this.elements[elementId] || document.getElementById(elementId);
      if (!element || element.tagName !== 'SELECT') return;

      element.innerHTML = addPlaceholder ? '<option value="">--Select--</option>' : '';
      
      if (Array.isArray(options)) {
        options.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt.value || opt.SubCodeID || opt.code || '';
          option.textContent = opt.label || opt.Description || opt.description || opt.value || '';
          element.appendChild(option);
        });
      }
    }

    /**
     * Get description from lookup cache by code
     */
    getLookupDescription(codeKey, value) {
      if (!value) return '';
      const options = this.lookupCache[codeKey] || [];
      const found = options.find(opt => 
        (opt.value || opt.SubCodeID || opt.code) === value
      );
      return found ? (found.label || found.Description || found.description || value) : value;
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
     * Load supervision list from API
     */
    async loadSupervisionList() {
      try {
        this.showToast("Loading supervision list...", "info");
        
        const selectedBranch = this.elements.branchFilter?.value || defaultBranchId;
        
        const params = {
          OurBranchID: defaultBranchId,  // Logged-in branch (maker)
          OperatorID: operatorId,
          MainModuleID: "",              // Empty as per API requirement
          BranchList: selectedBranch     // Selected branch to supervise (checker)
        };
        
        console.log("[ClientSupervision] Loading pending supervisions with:", params);
        
        const result = await ClientService.getClientSupervisionPending(params);
        
        console.log("[ClientSupervision] Supervision list response:", result);
        
        if (result.success && result.data) {
          const data = result.data.Details || result.data;
          this.supervisionList = Array.isArray(data) ? data : [data];
          // Filter out empty/invalid entries
          this.supervisionList = this.supervisionList.filter(item => item && (item.ClientID || item.Searchkey));
          this.renderSupervisionTable();
          this.showToast(`Found ${this.supervisionList.length} pending supervision(s)`, "success");
        } else {
          this.supervisionList = [];
          this.renderSupervisionTable();
          this.showToast(result.message || "No pending supervisions found", "warning");
        }
      } catch (error) {
        console.error("[ClientSupervision] Error loading supervision list:", error);
        this.showToast("Error loading supervision list", "error");
        this.supervisionList = [];
        this.renderSupervisionTable();
      }
    }

    /**
     * Open client search modal to find pending supervision clients
     */
    openClientSearch() {
      const branchId = this.elements.branchFilter?.value;
      if (!branchId) {
        this.showToast("Please select a Branch first", "warning");
        return;
      }

      if (!this.clientSearchModal) {
        this.showToast("Search modal not ready, please try again", "warning");
        return;
      }

      const currentClientId = this.elements.clientIdSearch?.value || '';

      this.clientSearchModal.open({
        title: 'Find Client - Pending Supervision',
        tableID: 'ClientSupervision',  // Not used but required by SearchModal
        searchFields: [
          { name: 'ClientID', label: 'Client ID', column: 'ClientID', value: currentClientId },
          { name: 'Name', label: 'Client Name', column: 'Name' }
        ],
        displayFields: [
          { key: 'ClientID', label: 'Client ID' },
          { key: 'Name', label: 'Client Name' },
          { key: 'ModuleID', label: 'Module' },
          { key: 'NewData', label: 'Status' }
        ],
        autoSearch: true,
        onSelect: async (record) => {
          const clientId = record.ClientID || record.Searchkey || '';
          const clientName = record.Name || record.ClientName || record.NewData || '';
          
          // Set the client ID in the search field
          this.elements.clientIdSearch.value = clientId;
          
          // Store selected client
          this.currentClient = record;
          this.updateActionButtons();
          
          // Load client details
          if (clientId) {
            await this.loadClientDetails(clientId);
          }
          
          this.showToast(`Selected: ${clientId} - ${clientName}`, "success");
        }
      });
    }

    /**
     * Search for specific client (typed search in field)
     */
    async searchClient() {
      const searchTerm = this.elements.clientIdSearch?.value?.trim();
      
      // If no search term, open the lookup modal
      if (!searchTerm) {
        this.openClientSearch();
        return;
      }
      
      // Filter locally first from supervision list
      const filtered = this.supervisionList.filter(item => {
        const clientId = item.ClientID || item.Searchkey || "";
        return clientId.toLowerCase().includes(searchTerm.toLowerCase());
      });
      
      if (filtered.length > 0) {
        // If found in current list, select it
        const item = filtered[0];
        this.currentClient = item;
        this.updateActionButtons();
        const clientId = item.ClientID || item.Searchkey;
        if (clientId) {
          await this.loadClientDetails(clientId);
        }
        this.showToast(`Found client: ${clientId}`, "success");
      } else {
        // Try direct search by loading client details
        try {
          await this.loadClientDetails(searchTerm);
          this.showToast(`Loaded client: ${searchTerm}`, "success");
        } catch (error) {
          this.showToast("Client not found in pending supervisions", "warning");
        }
      }
    }

    /**
     * Render the supervision table
     */
    renderSupervisionTable() {
      const tbody = this.elements.supervisionTableBody;
      tbody.innerHTML = "";
      
      this.elements.recordCount.textContent = `${this.supervisionList.length} records`;
      
      if (this.supervisionList.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" class="text-center text-muted">
              <i class="bi bi-inbox"></i> No pending supervisions found
            </td>
          </tr>
        `;
        this.updateActionButtons();
        return;
      }
      
      this.supervisionList.forEach((item, index) => {
        const clientId = item.ClientID || item.Searchkey || "";
        const clientName = item.Name || item.ClientName || item.NewData || "";
        const moduleId = item.ModuleID || "6961";
        
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>
            <input type="radio" class="form-check-input supervision-radio" name="supervisionRadio" data-index="${index}" data-client-id="${clientId}">
          </td>
          <td>${this.escapeHtml(clientId)}</td>
          <td>${this.escapeHtml(clientName)}</td>
          <td>Module ${moduleId}</td>
          <td><span class="badge bg-warning">Pending</span></td>
        `;
        
        // Add click event to load details
        row.style.cursor = "pointer";
        row.addEventListener("click", async (e) => {
          if (e.target.type !== "radio") {
            const radio = row.querySelector(".supervision-radio");
            radio.checked = true;
            this.currentClient = item;
            this.updateActionButtons();
            if (clientId) {
              await this.loadClientDetails(clientId);
            }
          }
        });
        
        // Add radio change event
        const radio = row.querySelector(".supervision-radio");
        radio.addEventListener("change", async (e) => {
          e.stopPropagation();
          this.currentClient = item;
          this.updateActionButtons();
          if (clientId) {
            await this.loadClientDetails(clientId);
          }
        });
        
        tbody.appendChild(row);
      });
      
      this.updateActionButtons();
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
     * Update action button states
     */
    updateActionButtons() {
      const hasSelection = !!this.currentClient;
      
      if (this.elements.viewBtn) this.elements.viewBtn.disabled = !hasSelection;
      if (this.elements.approveBtn) this.elements.approveBtn.disabled = !hasSelection;
      if (this.elements.rejectBtn) this.elements.rejectBtn.disabled = !hasSelection;
    }

    /**
     * Load client details via tabs (same logic as client-maintenance)
     */
    async loadClientDetails(clientId) {
      if (!clientId) return;
      
      try {
        this.showToast("Loading client details...", "info");
        
        const requestId = `supervision_${Date.now()}`;
        const baseReq = { ClientID: clientId, RequestID: requestId };
        
        // Clear all fields first
        this.clearAllFields();
        
        // 1. Load Basic Details
        const basicResp = await ClientService.getClientBasicDetails(baseReq);
        const basic = extractOldApiInnerDetails(basicResp);
        
        console.log("[ClientSupervision] Basic details:", basic);
        
        if (!basic) {
          this.showToast("Failed to load client details", "error");
          return;
        }
        
        const basicData = Array.isArray(basic) ? basic[0] : basic;
        this.currentClientData.basic = basicData;
        this.populateBasicDetails(basicData);
        
        // 2. Load Individual or Corporate details based on ClientTypeID
        const clientTypeId = (basicData.ClientTypeID || "").trim().toUpperCase();
        const isCorporate = clientTypeId === "B" || clientTypeId === "C";
        
        if (isCorporate) {
          const corpResp = await ClientService.getClientCorporate(baseReq);
          const corp = extractOldApiInnerDetails(corpResp);
          console.log("[ClientSupervision] Corporate details:", corp);
          if (corp) {
            const corpData = Array.isArray(corp) ? corp[0] : corp;
            this.currentClientData.corporate = corpData;
            this.populateCorporateDetails(corpData, basicData);
          }
          // Activate Corporate tab
          document.querySelector('#corporate-tab')?.click();
        } else {
          const indvResp = await ClientService.getClientIndividual(baseReq);
          const indv = extractOldApiInnerDetails(indvResp);
          console.log("[ClientSupervision] Individual details:", indv);
          if (indv) {
            const indvData = Array.isArray(indv) ? indv[0] : indv;
            this.currentClientData.individual = indvData;
            this.populateIndividualDetails(indvData, basicData);
          }
          // Activate Personal tab
          document.querySelector('#personal-tab')?.click();
        }
        
        // 3. Load Address
        const addrResp = await ClientService.getClientAddress(baseReq);
        const addresses = extractOldApiInnerDetails(addrResp);
        console.log("[ClientSupervision] Address details:", addresses);
        if (addresses) {
          const addrList = Array.isArray(addresses) ? addresses : [addresses];
          this.currentClientData.addresses = addrList;
          if (addrList.length > 0) {
            this.populateAddressDetails(addrList[0]); // Show first address
          }
        }
        
        // 4. Load Employment
        const empResp = await ClientService.getClientEmployment(baseReq);
        const employment = extractOldApiInnerDetails(empResp);
        console.log("[ClientSupervision] Employment details:", employment);
        if (employment) {
          const empData = Array.isArray(employment) ? employment[0] : employment;
          this.currentClientData.employment = empData;
          this.populateEmploymentDetails(empData);
        }
        
        // 5. Load Other Details / KYC
        const otherResp = await ClientService.getClientOther?.(baseReq) || null;
        if (otherResp) {
          const other = extractOldApiInnerDetails(otherResp);
          console.log("[ClientSupervision] Other details:", other);
          if (other) {
            const otherData = Array.isArray(other) ? other[0] : other;
            this.currentClientData.other = otherData;
            this.populateOtherDetails(otherData);
          }
        }
        
        // 6. Load Images using TempImageService
        try {
          const imgClientId = basicData.ClientID || this.currentClient.ClientID;
          if (TempImageService && imgClientId) {
            const imagesResp = await TempImageService.getClientImages(imgClientId);
            console.log("[ClientSupervision] Images response for client:", imgClientId, imagesResp);
            
            if (imagesResp.success && imagesResp.data) {
              const images = Array.isArray(imagesResp.data) ? imagesResp.data : 
                            (imagesResp.data.Details || [imagesResp.data]);
              // Normalize property names for consistent access
              this.photoSignatures = images
                .filter(img => img && (img.TempImageID || img.tempImageId))
                .map(img => ({
                  TempImageID: img.TempImageID || img.tempImageId || img.tempImageID,
                  ImageTypeID: img.ImageTypeID || img.imageTypeId || img.imageTypeID,
                  Description: img.Description || img.description,
                  CreatedDate: img.CreatedDate || img.createdOn || img.CreatedOn || img.UploadedOn,
                  ...img
                }));
              console.log("[ClientSupervision] Photo signatures loaded:", this.photoSignatures.length, this.photoSignatures);
            } else {
              this.photoSignatures = [];
            }
          } else {
            this.photoSignatures = [];
          }
          this.renderPhotoSignatureTable();
        } catch (imgError) {
          console.warn("[ClientSupervision] Could not load images:", imgError);
          this.photoSignatures = [];
          this.renderPhotoSignatureTable();
        }
        
        // Show the details section
        if (this.elements.clientDetailsSection) {
          this.elements.clientDetailsSection.style.display = "block";
          this.elements.clientDetailsSection.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        
        this.showToast("Client details loaded successfully", "success");
      } catch (error) {
        console.error("[ClientSupervision] Error loading client details:", error);
        this.showToast("Error loading client details", "error");
      }
    }

    /**
     * Clear all form fields
     */
    clearAllFields() {
      // Clear Personal
      const personalFields = ['dtlClientID', 'dtlClientType', 'dtlTitle', 'dtlFirstName', 'dtlMiddleName', 
        'dtlLastName', 'dtlDOB', 'dtlGender', 'dtlResident', 'dtlNationality', 'dtlLiteracyLevel',
        'dtlIssuedBy', 'dtlIdType', 'dtlIdNo', 'dtlIdIssueDate', 'dtlIdExpiryDate', 'dtlMaritalStatus', 'dtlMotherName'];
      
      // Clear Corporate
      const corpFields = ['dtlCorpClientID', 'dtlCorpClientType', 'dtlCorpClientName', 'dtlCorpCompanyName',
        'dtlCorpConstitution', 'dtlCorpLineOfBusiness', 'dtlCorpIdType', 'dtlCorpIdNo', 'dtlCorpRegDate',
        'dtlCorpIssuedBy', 'dtlCorpIdIssueDate', 'dtlCorpIdExpiryDate', 'dtlCorpTIN', 'dtlCorpCountry'];
      
      // Clear Address
      const addrFields = ['dtlAddrType', 'dtlAddress1', 'dtlAddrCountry', 'dtlAddrRegion', 'dtlAddrCity',
        'dtlAddrSubCity', 'dtlAddrWereda', 'dtlAddrKebele', 'dtlAddrHouseNo', 'dtlAddrMobile'];
      
      // Clear Employment
      const empFields = ['dtlEmpStatus', 'dtlEmpCompanyType', 'dtlEmpOccupation', 'dtlEmpPosition',
        'dtlEmpMonthlyIncome', 'dtlEmpAnnualIncome'];
      
      // Clear Other
      const otherFields = ['dtlPEP', 'dtlUSPerson', 'dtlDataCleansed'];
      
      [...personalFields, ...corpFields, ...addrFields, ...empFields, ...otherFields].forEach(id => {
        const el = this.elements[id];
        if (el) el.value = '';
      });
      
      // Clear images
      this.photoSignatures = [];
      this.renderPhotoSignatureTable();
    }

    /**
     * Populate basic details (shared between Personal/Corporate)
     */
    populateBasicDetails(data) {
      if (this.elements.dtlClientID) this.elements.dtlClientID.value = data.ClientID || "";
      if (this.elements.dtlClientType) this.elements.dtlClientType.value = data.ClientTypeID || "";
      if (this.elements.dtlCorpClientID) this.elements.dtlCorpClientID.value = data.ClientID || "";
      if (this.elements.dtlCorpClientType) this.elements.dtlCorpClientType.value = data.ClientTypeID || "";
    }

    /**
     * Populate individual details (Personal tab)
     */
    populateIndividualDetails(data, basic = {}) {
      if (this.elements.dtlTitle) this.elements.dtlTitle.value = data.TitleID || data.Title || "";
      if (this.elements.dtlFirstName) this.elements.dtlFirstName.value = data.FirstName || "";
      if (this.elements.dtlMiddleName) this.elements.dtlMiddleName.value = data.MiddleName || "";
      if (this.elements.dtlLastName) this.elements.dtlLastName.value = data.LastName || "";
      if (this.elements.dtlDOB) this.elements.dtlDOB.value = data.DateOfBirth || data.DOB || "";
      if (this.elements.dtlGender) this.elements.dtlGender.value = data.GenderID || data.Gender || "";
      if (this.elements.dtlResident) this.elements.dtlResident.value = data.ResidentID || data.Resident || "";
      if (this.elements.dtlNationality) this.elements.dtlNationality.value = data.NationalityID || data.Nationality || "";
      if (this.elements.dtlLiteracyLevel) this.elements.dtlLiteracyLevel.value = data.LiteracyLevelID || data.LiteracyLevel || "";
      if (this.elements.dtlIssuedBy) this.elements.dtlIssuedBy.value = data.IssuedBy || "";
      if (this.elements.dtlIdType) this.elements.dtlIdType.value = data.IdentificationTypeID || basic.IdentificationTypeID || "";
      if (this.elements.dtlIdNo) this.elements.dtlIdNo.value = data.IdentificationNo || basic.IdentificationNo || "";
      if (this.elements.dtlIdIssueDate) this.elements.dtlIdIssueDate.value = data.IdentificationIssueDate || "";
      if (this.elements.dtlIdExpiryDate) this.elements.dtlIdExpiryDate.value = data.IdentificationExpiryDate || "";
      if (this.elements.dtlMaritalStatus) this.elements.dtlMaritalStatus.value = data.MaritalStatusID || data.MaritalStatus || "";
      if (this.elements.dtlMotherName) this.elements.dtlMotherName.value = data.MotherName || data.MothersName || "";
    }

    /**
     * Populate corporate details (Corporate tab)
     */
    populateCorporateDetails(data, basic = {}) {
      if (this.elements.dtlCorpClientName) this.elements.dtlCorpClientName.value = data.ClientName || basic.Name || "";
      if (this.elements.dtlCorpCompanyName) this.elements.dtlCorpCompanyName.value = data.CompanyName || data.TradingName || "";
      if (this.elements.dtlCorpConstitution) this.elements.dtlCorpConstitution.value = data.ConstitutionID || data.Constitution || "";
      if (this.elements.dtlCorpLineOfBusiness) this.elements.dtlCorpLineOfBusiness.value = data.LineOfBusinessID || data.LineOfBusiness || "";
      if (this.elements.dtlCorpIdType) this.elements.dtlCorpIdType.value = data.IdentificationTypeID || basic.IdentificationTypeID || "";
      if (this.elements.dtlCorpIdNo) this.elements.dtlCorpIdNo.value = data.IdentificationNo || basic.IdentificationNo || "";
      if (this.elements.dtlCorpRegDate) this.elements.dtlCorpRegDate.value = data.DateOfRegistration || data.RegistrationDate || "";
      if (this.elements.dtlCorpIssuedBy) this.elements.dtlCorpIssuedBy.value = data.IssuedBy || "";
      if (this.elements.dtlCorpIdIssueDate) this.elements.dtlCorpIdIssueDate.value = data.IdentificationIssueDate || "";
      if (this.elements.dtlCorpIdExpiryDate) this.elements.dtlCorpIdExpiryDate.value = data.IdentificationExpiryDate || "";
      if (this.elements.dtlCorpTIN) this.elements.dtlCorpTIN.value = data.TINNumber || data.TIN || "";
      if (this.elements.dtlCorpCountry) this.elements.dtlCorpCountry.value = data.CountryOfIncorporationID || data.CountryOfIncorporation || "";
    }

    /**
     * Populate address details (Address tab)
     */
    populateAddressDetails(data) {
      if (this.elements.dtlAddrType) this.elements.dtlAddrType.value = data.AddressTypeID || data.AddressType || "";
      if (this.elements.dtlAddress1) this.elements.dtlAddress1.value = data.Address1 || data.Address || "";
      if (this.elements.dtlAddrCountry) this.elements.dtlAddrCountry.value = data.CountryID || data.Country || "";
      if (this.elements.dtlAddrRegion) this.elements.dtlAddrRegion.value = data.RegionID || data.Region || "";
      if (this.elements.dtlAddrCity) this.elements.dtlAddrCity.value = data.City || "";
      if (this.elements.dtlAddrSubCity) this.elements.dtlAddrSubCity.value = data.SubCityID || data.SubCity || data.Zone || "";
      if (this.elements.dtlAddrWereda) this.elements.dtlAddrWereda.value = data.WeredaID || data.Wereda || "";
      if (this.elements.dtlAddrKebele) this.elements.dtlAddrKebele.value = data.KebeleID || data.Kebele || "";
      if (this.elements.dtlAddrHouseNo) this.elements.dtlAddrHouseNo.value = data.HouseNumber || data.HouseNo || "";
      if (this.elements.dtlAddrMobile) this.elements.dtlAddrMobile.value = data.Mobile || data.MobileNo || "";
    }

    /**
     * Populate employment details (Employment tab)
     */
    populateEmploymentDetails(data) {
      if (this.elements.dtlEmpStatus) this.elements.dtlEmpStatus.value = data.EmploymentStatusID || data.EmploymentStatus || "";
      if (this.elements.dtlEmpCompanyType) this.elements.dtlEmpCompanyType.value = data.CompanyTypeID || data.CompanyType || "";
      if (this.elements.dtlEmpOccupation) this.elements.dtlEmpOccupation.value = data.OccupationID || data.Occupation || "";
      if (this.elements.dtlEmpPosition) this.elements.dtlEmpPosition.value = data.Position || data.PositionID || "";
      if (this.elements.dtlEmpMonthlyIncome) this.elements.dtlEmpMonthlyIncome.value = data.MonthlyIncome || data.AverageMonthlyIncome || "";
      if (this.elements.dtlEmpAnnualIncome) this.elements.dtlEmpAnnualIncome.value = data.AnnualIncome || data.AverageAnnualIncome || "";
    }

    /**
     * Populate other details (Other Details tab)
     */
    populateOtherDetails(data) {
      if (this.elements.dtlPEP) this.elements.dtlPEP.value = data.PoliticallyExposedPerson || data.IsPEP || "";
      if (this.elements.dtlUSPerson) this.elements.dtlUSPerson.value = data.USPerson || data.IsUSPerson || "";
      if (this.elements.dtlDataCleansed) this.elements.dtlDataCleansed.value = data.DataCleansed || data.IsDataCleansed || "";
    }

    /**
     * Render photo/signature table and preview images
     */
    renderPhotoSignatureTable() {
      const tbody = this.elements.photoSignatureTableBody;
      const noImagesRow = this.elements.noImagesRow;
      
      if (!tbody) return;

      // Clear table
      tbody.innerHTML = '';

      if (this.photoSignatures.length === 0) {
        // Show no images row
        tbody.innerHTML = `
          <tr id="noImagesRow">
            <td colspan="5" class="text-center text-muted py-3">
              <i class="bi bi-image"></i> No images found
            </td>
          </tr>
        `;
        // Clear preview images
        this.clearImagePreviews();
        return;
      }

      // Render table rows
      this.photoSignatures.forEach((item, index) => {
        const imageType = item.ImageTypeID || item.imageType || item.Type || '';
        const description = item.Description || item.description || this.getImageTypeLabel(imageType);
        const uploadedOn = item.CreatedDate || item.UploadedOn || item.uploadedOn || '';
        const tempImageId = item.TempImageID || item.tempImageId || '';

        const tr = document.createElement('tr');
        tr.dataset.index = index;
        tr.innerHTML = `
          <td class="ps-2">${index + 1}</td>
          <td>${this.getImageTypeLabel(imageType)}</td>
          <td>${description}</td>
          <td>${uploadedOn}</td>
          <td class="text-center">
            <div class="btn-group btn-group-sm">
              <button type="button" class="btn btn-outline-primary btn-sm" data-action="view" title="View">
                <i class="bi bi-eye"></i>
              </button>
              <button type="button" class="btn btn-outline-secondary btn-sm" data-action="download" title="Download">
                <i class="bi bi-download"></i>
              </button>
            </div>
          </td>
        `;
        
        // Add click handlers
        tr.querySelector('[data-action="view"]')?.addEventListener('click', () => this.viewImage(index));
        tr.querySelector('[data-action="download"]')?.addEventListener('click', () => this.downloadImage(index));
        
        tbody.appendChild(tr);
      });

      // Display photo and signature previews
      this.displayImagePreviews();
    }

    /**
     * Get human-readable label for image type
     */
    getImageTypeLabel(typeCode) {
      const typeLabels = {
        'P': 'Photo',
        'S': 'Signature',
        'Photo': 'Photo',
        'Signature': 'Signature'
      };
      return typeLabels[typeCode] || typeCode || 'Unknown';
    }

    /**
     * Clear image previews
     */
    clearImagePreviews() {
      // Photo preview
      if (this.elements.photoPreviewImg) {
        this.elements.photoPreviewImg.classList.add('d-none');
        this.elements.photoPreviewImg.src = '';
      }
      if (this.elements.noPhotoText) {
        this.elements.noPhotoText.classList.remove('d-none');
      }
      
      // Signature preview
      if (this.elements.signaturePreviewImg) {
        this.elements.signaturePreviewImg.classList.add('d-none');
        this.elements.signaturePreviewImg.src = '';
      }
      if (this.elements.noSignatureText) {
        this.elements.noSignatureText.classList.remove('d-none');
      }
    }

    /**
     * Display photo and signature previews from the loaded images
     */
    async displayImagePreviews() {
      // Find photo (P) and signature (S) images - check all possible property names
      const photoItem = this.photoSignatures.find(item => {
        const type = (item.ImageTypeID || item.imageTypeId || item.imageTypeID || item.imageType || item.Type || '').toUpperCase();
        return type === 'P' || type === 'PHOTO';
      });
      
      const signatureItem = this.photoSignatures.find(item => {
        const type = (item.ImageTypeID || item.imageTypeId || item.imageTypeID || item.imageType || item.Type || '').toUpperCase();
        return type === 'S' || type === 'SIGNATURE';
      });

      // Load and display photo
      if (photoItem) {
        await this.loadAndDisplayImage(photoItem, 'photo');
      } else {
        if (this.elements.photoPreviewImg) this.elements.photoPreviewImg.classList.add('d-none');
        if (this.elements.noPhotoText) this.elements.noPhotoText.classList.remove('d-none');
      }

      // Load and display signature  
      if (signatureItem) {
        await this.loadAndDisplayImage(signatureItem, 'signature');
      } else {
        if (this.elements.signaturePreviewImg) this.elements.signaturePreviewImg.classList.add('d-none');
        if (this.elements.noSignatureText) this.elements.noSignatureText.classList.remove('d-none');
      }
    }

    /**
     * Load and display a single image in preview area
     */
    async loadAndDisplayImage(item, type) {
      const tempImageId = item.TempImageID || item.tempImageId;
      if (!tempImageId || !TempImageService) return;

      const imgElement = type === 'photo' ? this.elements.photoPreviewImg : this.elements.signaturePreviewImg;
      const noTextElement = type === 'photo' ? this.elements.noPhotoText : this.elements.noSignatureText;

      try {
        const result = await TempImageService.getTempImage(tempImageId);
        
        if (result.success && result.data) {
          let imageData = result.data.Image || result.data.image || result.data.sImage;
          
          if (imageData) {
            // Remove any data URL prefix if present
            if (imageData.startsWith("data:")) {
              imageData = imageData.split(",")[1];
            }
            
            const mimeType = result.data.MimeType || result.data.mimeType || "image/png";
            const dataUrl = `data:${mimeType};base64,${imageData}`;
            
            if (imgElement) {
              imgElement.src = dataUrl;
              imgElement.classList.remove('d-none');
            }
            if (noTextElement) {
              noTextElement.classList.add('d-none');
            }
          }
        }
      } catch (error) {
        console.warn(`[ClientSupervision] Failed to load ${type} preview:`, error);
      }
    }

    /**
     * View image in new window
     */
    async viewImage(index) {
      const item = this.photoSignatures[index];
      const tempImageId = item?.TempImageID || item?.tempImageId;
      
      if (!tempImageId || !TempImageService) {
        this.showToast("Image not available", "warning");
        return;
      }

      try {
        this.showToast("Loading image...", "info");
        const result = await TempImageService.getTempImage(tempImageId);
        
        if (result.success && result.data) {
          let imageData = result.data.Image || result.data.image || result.data.sImage;
          
          if (imageData) {
            if (imageData.startsWith("data:")) {
              imageData = imageData.split(",")[1];
            }
            
            const mimeType = result.data.MimeType || result.data.mimeType || "image/png";
            const dataUrl = `data:${mimeType};base64,${imageData}`;
            const description = item.Description || item.description || this.getImageTypeLabel(item.ImageTypeID || item.imageType);
            
            const win = window.open("", "_blank");
            if (win) {
              win.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                  <title>${description}</title>
                  <style>
                    body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f0f0f0; }
                    img { max-width: 100%; max-height: 100vh; object-fit: contain; }
                  </style>
                </head>
                <body>
                  <img src="${dataUrl}" alt="${description}" />
                </body>
                </html>
              `);
              win.document.close();
            } else {
              this.showToast("Popup blocked. Please allow popups.", "warning");
            }
          } else {
            this.showToast("No image data found", "warning");
          }
        } else {
          this.showToast(result.message || "Unable to load image", "warning");
        }
      } catch (error) {
        console.error("[ClientSupervision] View image error:", error);
        this.showToast("Error viewing image", "error");
      }
    }

    /**
     * Download image
     */
    async downloadImage(index) {
      const item = this.photoSignatures[index];
      const tempImageId = item?.TempImageID || item?.tempImageId;
      
      if (!tempImageId || !TempImageService) {
        this.showToast("Image not available", "warning");
        return;
      }

      try {
        this.showToast("Downloading image...", "info");
        const blob = await TempImageService.downloadTempImage(tempImageId);
        const filename = item.Description || item.description || `image_${tempImageId}`;

        // Download blob
        const FileService = window.FileService;
        if (FileService) {
          FileService.downloadBlob(blob, filename);
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
        
        this.showToast("Download started", "success");
      } catch (error) {
        console.error("[ClientSupervision] Download error:", error);
        this.showToast("Error downloading image", "error");
      }
    }

    /**
     * Handle view button click
     */
    handleView() {
      if (!this.currentClient) return;
      
      const clientId = this.currentClient.ClientID || this.currentClient.Searchkey;
      if (clientId) {
        this.loadClientDetails(clientId);
      }
    }

    /**
     * Handle approve button click
     */
    async handleApprove() {
      if (!this.currentClient) return;
      
      const clientId = this.currentClient.ClientID || this.currentClient.clientid;
      // SearchKey format from p_getclientsupervisionpending: [OperatorID:<operatorid>][ClientID:<clientid>]
      const strSearchKey = this.currentClient.SearchKey || this.currentClient.Searchkey || 
                           `[OperatorID:${operatorId}][ClientID:${clientId}]`;
      
      const result = await Swal.fire({
        title: "Approve Supervision",
        html: `Are you sure you want to approve supervision for <strong>${clientId}</strong>?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: '<i class="bi bi-check-circle"></i> Yes, Approve',
        cancelButtonText: "Cancel",
        confirmButtonColor: "#28a745",
        cancelButtonColor: "#6c757d"
      });
      
      if (!result.isConfirmed) return;
      
      try {
        this.showToast("Approving supervision...", "info");
        
        const selectedBranch = this.elements.branchFilter?.value || defaultBranchId;
        
        const approvalResponse = await ClientService.approveClientSupervision({
          OurBranchID: selectedBranch,
          ClientID: clientId,
          ApprovedBy: operatorId,
          strSearchKey: strSearchKey
        });
        
        console.log("[ClientSupervision] Approval response:", approvalResponse);
        
        if (approvalResponse.success) {
          this.showToast(approvalResponse.message || "Supervision approved successfully!", "success");
          
          // Reload the list
          await this.loadSupervisionList();
          
          // Clear selection
          this.currentClient = null;
          this.clearAllFields();
          this.updateActionButtons();
        } else {
          this.showToast(approvalResponse.message || "Failed to approve supervision", "error");
        }
      } catch (error) {
        console.error("[ClientSupervision] Error during approval:", error);
        this.showToast("Error approving supervision", "error");
      }
    }

    /**
     * Show rejection modal
     */
    showRejectModal() {
      if (!this.currentClient) return;
      
      if (this.elements.supervisionRejectRemarks) {
        this.elements.supervisionRejectRemarks.value = "";
      }
      if (this.elements.supervisionRejectForm) {
        this.elements.supervisionRejectForm.classList.remove("was-validated");
      }
      
      this.rejectModalInstance?.show();
    }

    /**
     * Handle reject button click
     */
    async handleReject() {
      // Validate form
      if (this.elements.supervisionRejectForm && !this.elements.supervisionRejectForm.checkValidity()) {
        this.elements.supervisionRejectForm.classList.add("was-validated");
        return;
      }
      
      const remarks = this.elements.supervisionRejectRemarks?.value?.trim() || "";
      if (remarks.length < 10) {
        this.showToast("Rejection remarks must be at least 10 characters", "warning");
        return;
      }
      
      if (!this.currentClient) return;
      
      const clientId = this.currentClient.ClientID || this.currentClient.Searchkey;
      const searchKey = this.currentClient.Searchkey || this.currentClient.strSearchkey || clientId;
      
      try {
        this.showToast("Rejecting supervision...", "info");
        this.rejectModalInstance?.hide();
        
        const selectedBranch = this.elements.branchFilter?.value || defaultBranchId;
        
        const rejectionResponse = await ClientService.rejectClientSupervision({
          OurBranchID: selectedBranch,
          ClientID: clientId,
          OperatorID: operatorId,
          strSearchkey: searchKey,
          RejectReson: remarks  // Note: API uses "RejectReson" (typo in original spec)
        });
        
        console.log("[ClientSupervision] Rejection response:", rejectionResponse);
        
        if (rejectionResponse.success) {
          this.showToast(rejectionResponse.message || "Supervision rejected successfully!", "success");
          
          // Reload the list
          await this.loadSupervisionList();
          
          // Clear selection
          this.currentClient = null;
          this.clearAllFields();
          this.updateActionButtons();
        } else {
          this.showToast(rejectionResponse.message || "Failed to reject supervision", "error");
        }
      } catch (error) {
        console.error("[ClientSupervision] Error during rejection:", error);
        this.showToast("Error rejecting supervision", "error");
      }
    }
  }

  // ============================================================
  // 4. INITIALIZE PAGE
  // ============================================================
  function initializeController() {
    if (!dependenciesReady) {
      setTimeout(initializeController, 100);
      return;
    }

    console.log("[ClientSupervision] Initializing controller...");
    new ClientSupervisionController();
  }

  // Wait for DOM
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeController);
  } else {
    initializeController();
  }

})();
