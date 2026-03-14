/**
 * Insurance Search Services (Combined)
 * Provides search functionality for:
 * - Insurance Codes (t_InsuranceCode) 
 * - Insurance Companies (t_Insurance)
 * - Insurance Policies (t_InsurancePolicy)
 * 
 * Fetches data via SearchService (p_GetSearchResult)
 */
(function(window) {
  'use strict';

  // =============================================================================
  // SHARED UTILITIES
  // =============================================================================
  
  /**
   * Try multiple TableIDs with SearchService
   */
  async function trySearchWithTableIds(tableIdCandidates, baseRequestData, logPrefix) {
    const prevOrNextCandidates = ['1', '0', '2'];
    let results = [];

    for (const tableId of tableIdCandidates) {
      for (const prevOrNext of prevOrNextCandidates) {
        try {
          const requestData = { ...baseRequestData, TableID: tableId, PrevOrNext: prevOrNext };
          console.log(`[${logPrefix}] Trying TableID: ${tableId}, PrevOrNext: ${prevOrNext}`);
          
          const response = await window.SearchService.searchClients(requestData);
          const payload = response?.data || response?.Details;
          
          if (Array.isArray(payload) && payload.length > 0) {
            results = payload;
            console.log(`[${logPrefix}] Found ${results.length} records with TableID: ${tableId}`);
            return results;
          } else if (payload?.SearchResults && Array.isArray(payload.SearchResults) && payload.SearchResults.length > 0) {
            results = payload.SearchResults;
            console.log(`[${logPrefix}] Found ${results.length} records with TableID: ${tableId}`);
            return results;
          } else if (payload?.Details && Array.isArray(payload.Details) && payload.Details.length > 0) {
            results = payload.Details;
            console.log(`[${logPrefix}] Found ${results.length} records with TableID: ${tableId}`);
            return results;
          }
        } catch (err) {
          console.warn(`[${logPrefix}] Failed with TableID: ${tableId}, PrevOrNext: ${prevOrNext}`, err.message);
          continue;
        }
      }
    }
    return results;
  }

  /**
   * Build base request data for SearchService
   */
  function buildBaseRequestData(whereStmt) {
    return {
      AdvFilterString: '',
      WhereStmt: whereStmt,
      PrevOrNext: '1',
      RefID: '',
      OperatorID: window.Environment?.OperatorID || 'CSADM',
      ModuleID: 1000,
      OurBranchID: window.Environment?.OurBranchID || '0603',
      SearchKey: null,
      LanguageID: 'en'
    };
  }

  // =============================================================================
  // INSURANCE CODE SEARCH SERVICE (t_InsuranceCode)
  // =============================================================================

  const InsuranceCodeSearchService = {
    /**
     * Search for Insurance Codes
     */
    async searchInsuranceCodes(filters = {}) {
      if (!window.SearchService?.searchClients) {
        throw new Error('SearchService is not available');
      }

      // Build WHERE clause
      let whereConditions = [];
      if (filters.code && filters.code.trim()) {
        const codeValue = filters.code.trim().replace(/'/g, "''");
        whereConditions.push(`InsuranceCode like '%${codeValue}%'`);
      }
      if (filters.description && filters.description.trim()) {
        const descValue = filters.description.trim().replace(/'/g, "''");
        whereConditions.push(`Description like '%${descValue}%'`);
      }
      if (filters.status && filters.status !== 'all') {
        whereConditions.push(filters.status === 'active' ? "(Status=1 OR IsActive=1)" : "(Status=0 OR IsActive=0)");
      }

      const whereStmt = whereConditions.length > 0 ? whereConditions.join(' AND ') : "1=1";
      const tableIdCandidates = ['InsuranceCode', 'InsuranceCodeID', 't_InsuranceCode'];
      const baseRequestData = buildBaseRequestData(whereStmt);

      console.log('[InsuranceCodeSearch] Search request (base):', baseRequestData);
      
      let codes = await trySearchWithTableIds(tableIdCandidates, baseRequestData, 'InsuranceCodeSearch');

      const insuranceCodeService = window.InsuranceCodeStaticDataService || window.StaticDataService;
      if (codes.length === 0 && insuranceCodeService?.getInsuranceCode) {
        console.log('[InsuranceCodeSearch] Falling back to InsuranceCodeStaticDataService.getInsuranceCode');
        try {
          const svcResponse = await insuranceCodeService.getInsuranceCode('');
          console.log('[InsuranceCodeSearch] InsuranceCodeStaticDataService response:', svcResponse);
          
          if (svcResponse?.success) {
            const svcPayload = svcResponse?.data || svcResponse?.Details;
            if (Array.isArray(svcPayload)) {
              codes = svcPayload;
            } else if (svcPayload?.Details && Array.isArray(svcPayload.Details)) {
              codes = svcPayload.Details;
            }
            
            // Apply client-side filtering
            if (codes.length > 0 && filters.code && filters.code.trim()) {
              const codeFilter = filters.code.trim().toLowerCase();
              codes = codes.filter(c => (c.InsuranceCode || c.Code || '').toLowerCase().includes(codeFilter));
            }
            if (codes.length > 0 && filters.description && filters.description.trim()) {
              const descFilter = filters.description.trim().toLowerCase();
              codes = codes.filter(c => (c.Description || c.InsuranceDesc || c.Name || '').toLowerCase().includes(descFilter));
            }
            if (codes.length > 0 && filters.status && filters.status !== 'all') {
              codes = codes.filter(c => {
                const isActive = c.Status === 1 || c.Status === '1' || c.IsActive === true || c.Active === 1;
                return filters.status === 'active' ? isActive : !isActive;
              });
            }
          }
        } catch (err) {
          console.warn('[InsuranceCodeSearch] InsuranceCodeStaticDataService fallback failed:', err.message);
        }
      }

      console.log('[InsuranceCodeSearch] Final result count:', codes.length);
      return { success: true, data: codes };
    },

    /**
     * Open Insurance Code search modal
     */
    async openSearchModal(onSelectCallback, options = {}) {
      let modal = document.getElementById('insuranceCodeSearchModal');
      
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'insuranceCodeSearchModal';
        modal.className = 'modal fade';
        modal.tabIndex = -1;
        modal.innerHTML = `
          <div class="modal-dialog modal-xl">
            <div class="modal-content shadow-lg border-0">
              <div class="modal-header bg-primary text-white py-3">
                <h5 class="modal-title fw-bold"><i class="bi bi-search me-2"></i>Insurance Code Search</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body p-4">
                <div class="card border-0 bg-light mb-4">
                  <div class="card-body">
                    <div class="row g-3">
                      <div class="col-md-4">
                        <label class="form-label fw-semibold mb-2 d-block">Insurance Code</label>
                        <input type="text" class="form-control form-control-sm" id="insuranceCodeFilter" placeholder="Enter code...">
                      </div>
                      <div class="col-md-4">
                        <label class="form-label fw-semibold mb-2 d-block">Description</label>
                        <input type="text" class="form-control form-control-sm" id="insuranceCodeDescFilter" placeholder="Enter description...">
                      </div>
                      <div class="col-md-2">
                        <label class="form-label fw-semibold mb-2 d-block">Status</label>
                        <select class="form-select form-select-sm" id="insuranceCodeStatusFilter">
                          <option value="all" selected>All</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                      <div class="col-md-2 d-flex align-items-end">
                        <button type="button" class="btn btn-primary w-100 shadow-sm" id="insuranceCodeSearchBtnModal">
                          <i class="bi bi-search me-1"></i> Search
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="bg-primary bg-gradient text-white px-3 py-2 rounded-top d-flex align-items-center">
                  <i class="bi bi-table me-2"></i><strong>Search Results</strong>
                </div>
                <div class="border border-top-0 rounded-bottom">
                  <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                    <table class="table table-hover table-striped mb-0" id="insuranceCodeSearchTable">
                      <thead class="table-light" style="position: sticky; top: 0; z-index: 10; box-shadow: 0 2px 2px -1px rgba(0,0,0,0.1);">
                        <tr>
                          <th style="width: 60px;" class="text-center">#</th>
                          <th style="width: 30%;">Insurance Code</th>
                          <th>Description</th>
                          <th style="width: 80px;" class="text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody></tbody>
                    </table>
                  </div>
                </div>
                <div class="mt-3 p-2 bg-light rounded">
                  <small class="text-muted"><i class="bi bi-info-circle me-1"></i><em>Tip: Click a row to select the insurance code.</em></small>
                </div>
              </div>
              <div class="modal-footer bg-light">
                <button type="button" class="btn btn-secondary px-4" data-bs-dismiss="modal">
                  <i class="bi bi-x-circle me-1"></i> Close
                </button>
              </div>
            </div>
          </div>`;
        document.body.appendChild(modal);

        const searchBtn = modal.querySelector('#insuranceCodeSearchBtnModal');
        searchBtn.addEventListener('click', async () => {
          await InsuranceCodeSearchService._performSearch(modal, onSelectCallback);
        });

        const codeInput = modal.querySelector('#insuranceCodeFilter');
        const descInput = modal.querySelector('#insuranceCodeDescFilter');
        [codeInput, descInput].forEach(input => {
          input?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchBtn?.click();
          });
        });
      }
      
      try {
        const bsModal = window.bootstrap?.Modal.getOrCreateInstance(modal, { backdrop: 'static' });
        bsModal?.show();
        
        modal.querySelector('#insuranceCodeFilter').value = '';
        modal.querySelector('#insuranceCodeDescFilter').value = '';
        modal.querySelector('#insuranceCodeStatusFilter').value = 'all';
        modal._onSelectCallback = onSelectCallback;
        
        setTimeout(() => modal.querySelector('#insuranceCodeSearchBtnModal')?.click(), 100);
      } catch (error) {
        console.error('[Insurance Code Search] Error opening modal:', error);
        alert(`Error opening insurance code search: ${error.message || error}`);
      }
    },

    async _performSearch(modal, onSelectCallback) {
      const tbody = modal.querySelector('#insuranceCodeSearchTable tbody');
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4"><i class="bi bi-hourglass-split me-2"></i>Searching...</td></tr>';

      try {
        const response = await InsuranceCodeSearchService.searchInsuranceCodes({
          code: modal.querySelector('#insuranceCodeFilter').value,
          description: modal.querySelector('#insuranceCodeDescFilter').value,
          status: modal.querySelector('#insuranceCodeStatusFilter').value
        });

        console.log('[Insurance Code Search] Filtered response:', response);
        
        if (!response?.success) {
          tbody.innerHTML = `<tr><td colspan="4" class="text-center text-warning py-4"><i class="bi bi-exclamation-triangle me-2"></i>${response?.message || 'No results found'}</td></tr>`;
          return;
        }

        const codes = response?.data || [];
        if (!codes.length) {
          tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4"><i class="bi bi-inbox me-2"></i>No results found</td></tr>';
          return;
        }
        
        tbody.innerHTML = '';
        codes.forEach((code, index) => {
          const insuranceCode = code.InsuranceCode || code.Code || '';
          const description = code.Description || code.InsuranceDesc || code.Name || '';
          const isActive = code.Status === 1 || code.Status === '1' || code.IsActive === true || code.Active === 1;
          
          const tr = document.createElement('tr');
          tr.style.cursor = 'pointer';
          tr.innerHTML = `
            <td class="text-center fw-semibold">${index + 1}</td>
            <td>${insuranceCode}</td>
            <td>${description}</td>
            <td class="text-center"><span class="badge ${isActive ? 'bg-success' : 'bg-secondary'}">${isActive ? 'Active' : 'Inactive'}</span></td>
          `;
          tr.addEventListener('click', () => {
            console.log('[Insurance Code Search] Row clicked - code:', insuranceCode, ', description:', description);
            const callback = modal._onSelectCallback || onSelectCallback;
            console.log('[Insurance Code Search] Callback exists:', !!callback);
            if (callback) {
              console.log('[Insurance Code Search] Executing callback with:', insuranceCode, description);
              callback(insuranceCode, description);
            }
            window.bootstrap?.Modal.getOrCreateInstance(modal)?.hide();
          });
          tbody.appendChild(tr);
        });
      } catch (error) {
        console.error('[Insurance Code Search] Error:', error);
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-4"><i class="bi bi-exclamation-triangle me-2"></i>Error: ${error.message || error}</td></tr>`;
      }
    }
  };

  // =============================================================================
  // INSURANCE COMPANY SEARCH SERVICE (t_Insurance)
  // =============================================================================

  const InsuranceSearchService = {
    /**
     * Search for Insurance Companies
     */
    async searchInsuranceCompanies(filters = {}) {
      if (!window.SearchService?.searchClients) {
        throw new Error('SearchService is not available');
      }

      // Build WHERE clause
      let whereConditions = [];
      if (filters.companyId && filters.companyId.trim()) {
        const idValue = filters.companyId.trim().replace(/'/g, "''");
        whereConditions.push(`InsuranceID like '%${idValue}%'`);
      }
      if (filters.companyName && filters.companyName.trim()) {
        const nameValue = filters.companyName.trim().replace(/'/g, "''");
        whereConditions.push(`(Name like '%${nameValue}%' OR InsuranceName like '%${nameValue}%')`);
      }
      if (filters.status && filters.status !== 'all') {
        whereConditions.push(filters.status === 'active' ? "(Status=1 OR IsActive=1)" : "(Status=0 OR IsActive=0)");
      }

      const whereStmt = whereConditions.length > 0 ? whereConditions.join(' AND ') : "1=1";
      const tableIdCandidates = ['Insurance', 'InsuranceID', 't_Insurance', 'InsuranceCompany', 'InsuranceCompanyID', 'Insurances'];
      const baseRequestData = buildBaseRequestData(whereStmt);

      console.log('[InsuranceSearch] Search request (base):', baseRequestData);
      
      let companies = await trySearchWithTableIds(tableIdCandidates, baseRequestData, 'InsuranceSearch');

      // Fallback to direct API call
      if (companies.length === 0 && window.CoreApi) {
        console.log('[InsuranceSearch] Trying direct API call as fallback');
        const endpoint = window.Environment?.apiBase ? 
          `${window.Environment.apiBase}/api/OldAPI` : '/api/OldAPI';
        
        const storedProcs = [
          { proc: 'dbo.P_GetInsurance', params: { InsuranceID: '%' } },
          { proc: 'dbo.P_GetInsurance', params: { InsuranceID: '' } },
          { proc: 'dbo.p_GetInsurances', params: {} },
          { proc: 'dbo.p_GetAllInsurance', params: {} }
        ];
        
        for (const sp of storedProcs) {
          try {
            console.log(`[InsuranceSearch] Direct API: Trying ${sp.proc}`);
            const envelope = window.CoreApi.makeRequestEnvelope(sp.proc, sp.params);
            const resp = await window.CoreApi.post(endpoint, envelope);
            
            if (resp?.success) {
              const payload = resp?.data || resp?.Details || resp;
              if (Array.isArray(payload) && payload.length > 0) {
                companies = payload;
                console.log(`[InsuranceSearch] Direct API: Found ${companies.length} records`);
                break;
              } else if (payload?.Details && Array.isArray(payload.Details) && payload.Details.length > 0) {
                companies = payload.Details;
                break;
              }
            }
          } catch (err) {
            console.warn(`[InsuranceSearch] Direct API failed for ${sp.proc}:`, err.message);
          }
        }
        
        // Apply client-side filtering
        if (companies.length > 0) {
          if (filters.companyId && filters.companyId.trim()) {
            const idFilter = filters.companyId.trim().toLowerCase();
            companies = companies.filter(c => (c.InsuranceID || c.CompanyID || c.ID || '').toString().toLowerCase().includes(idFilter));
          }
          if (filters.companyName && filters.companyName.trim()) {
            const nameFilter = filters.companyName.trim().toLowerCase();
            companies = companies.filter(c => (c.Name || c.InsuranceName || c.CompanyName || c.Description || c.InsuranceDesc || '').toLowerCase().includes(nameFilter));
          }
          if (filters.status && filters.status !== 'all') {
            companies = companies.filter(c => {
              const isActive = c.Status === 1 || c.Status === '1' || c.IsActive === true || c.Active === 1;
              return filters.status === 'active' ? isActive : !isActive;
            });
          }
        }
      }

      console.log('[InsuranceSearch] Final result count:', companies.length);
      return { success: true, data: companies };
    },

    /**
     * Open Insurance Company search modal
     */
    async openSearchModal(onSelectCallback, options = {}) {
      let modal = document.getElementById('insuranceSearchModal');
      
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'insuranceSearchModal';
        modal.className = 'modal fade';
        modal.tabIndex = -1;
        modal.innerHTML = `
          <div class="modal-dialog modal-xl">
            <div class="modal-content shadow-lg border-0">
              <div class="modal-header bg-primary text-white py-3">
                <h5 class="modal-title fw-bold"><i class="bi bi-building me-2"></i>Insurance Company Search</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body p-4">
                <div class="card border-0 bg-light mb-4">
                  <div class="card-body">
                    <div class="row g-3">
                      <div class="col-md-4">
                        <label class="form-label fw-semibold mb-2 d-block">Company ID</label>
                        <input type="text" class="form-control form-control-sm" id="insuranceCompanyIdFilter" placeholder="Enter company ID...">
                      </div>
                      <div class="col-md-4">
                        <label class="form-label fw-semibold mb-2 d-block">Company Name</label>
                        <input type="text" class="form-control form-control-sm" id="insuranceCompanyNameFilter" placeholder="Enter company name...">
                      </div>
                      <div class="col-md-2">
                        <label class="form-label fw-semibold mb-2 d-block">Status</label>
                        <select class="form-select form-select-sm" id="insuranceCompanyStatusFilter">
                          <option value="all" selected>All</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                      <div class="col-md-2 d-flex align-items-end">
                        <button type="button" class="btn btn-primary w-100 shadow-sm" id="insuranceCompanySearchBtnModal">
                          <i class="bi bi-search me-1"></i> Search
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="bg-primary bg-gradient text-white px-3 py-2 rounded-top d-flex align-items-center">
                  <i class="bi bi-table me-2"></i><strong>Search Results</strong>
                </div>
                <div class="border border-top-0 rounded-bottom">
                  <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                    <table class="table table-hover table-striped mb-0" id="insuranceCompanySearchTable">
                      <thead class="table-light" style="position: sticky; top: 0; z-index: 10; box-shadow: 0 2px 2px -1px rgba(0,0,0,0.1);">
                        <tr>
                          <th style="width: 60px;" class="text-center">#</th>
                          <th style="width: 25%;">Company ID</th>
                          <th>Company Name</th>
                          <th style="width: 80px;" class="text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody></tbody>
                    </table>
                  </div>
                </div>
                <div class="mt-3 p-2 bg-light rounded">
                  <small class="text-muted"><i class="bi bi-info-circle me-1"></i><em>Tip: Click a row to select the insurance company.</em></small>
                </div>
              </div>
              <div class="modal-footer bg-light">
                <button type="button" class="btn btn-secondary px-4" data-bs-dismiss="modal">
                  <i class="bi bi-x-circle me-1"></i> Close
                </button>
              </div>
            </div>
          </div>`;
        document.body.appendChild(modal);

        const searchBtn = modal.querySelector('#insuranceCompanySearchBtnModal');
        searchBtn.addEventListener('click', async () => {
          await InsuranceSearchService._performSearch(modal, onSelectCallback);
        });

        const idInput = modal.querySelector('#insuranceCompanyIdFilter');
        const nameInput = modal.querySelector('#insuranceCompanyNameFilter');
        [idInput, nameInput].forEach(input => {
          input?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchBtn?.click();
          });
        });
      }
      
      try {
        const bsModal = window.bootstrap?.Modal.getOrCreateInstance(modal, { backdrop: 'static' });
        bsModal?.show();
        
        modal.querySelector('#insuranceCompanyIdFilter').value = '';
        modal.querySelector('#insuranceCompanyNameFilter').value = '';
        modal.querySelector('#insuranceCompanyStatusFilter').value = 'all';
        modal._onSelectCallback = onSelectCallback;
        
        setTimeout(() => modal.querySelector('#insuranceCompanySearchBtnModal')?.click(), 100);
      } catch (error) {
        console.error('[Insurance Search] Error opening modal:', error);
        alert(`Error opening insurance company search: ${error.message || error}`);
      }
    },

    async _performSearch(modal, onSelectCallback) {
      const tbody = modal.querySelector('#insuranceCompanySearchTable tbody');
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4"><i class="bi bi-hourglass-split me-2"></i>Searching...</td></tr>';

      try {
        const response = await InsuranceSearchService.searchInsuranceCompanies({
          companyId: modal.querySelector('#insuranceCompanyIdFilter').value,
          companyName: modal.querySelector('#insuranceCompanyNameFilter').value,
          status: modal.querySelector('#insuranceCompanyStatusFilter').value
        });

        console.log('[Insurance Search] Filtered response:', response);
        
        if (!response?.success) {
          tbody.innerHTML = `<tr><td colspan="4" class="text-center text-warning py-4"><i class="bi bi-exclamation-triangle me-2"></i>${response?.message || 'No results found'}</td></tr>`;
          return;
        }

        const companies = response?.data || [];
        if (!companies.length) {
          tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4"><i class="bi bi-inbox me-2"></i>No results found</td></tr>';
          return;
        }
        
        // Log first record to see field names
        if (companies.length > 0) {
          console.log('[Insurance Search] Sample record fields:', Object.keys(companies[0]), companies[0]);
        }
        
        tbody.innerHTML = '';
        companies.forEach((company, index) => {
          const companyId = company.InsuranceID || company.CompanyID || company.ID || '';
          // Try many possible field names for company name
          const companyName = company.Name || company.InsuranceName || company.CompanyName || 
                             company.Description || company.InsuranceDesc || company.InsuranceDescription ||
                             company.FullName || company.Title || company.CompanyDesc || '';
          const isActive = company.Status === 1 || company.Status === '1' || company.IsActive === true || company.Active === 1;
          
          const tr = document.createElement('tr');
          tr.style.cursor = 'pointer';
          tr.innerHTML = `
            <td class="text-center fw-semibold">${index + 1}</td>
            <td>${companyId}</td>
            <td>${companyName}</td>
            <td class="text-center"><span class="badge ${isActive ? 'bg-success' : 'bg-secondary'}">${isActive ? 'Active' : 'Inactive'}</span></td>
          `;
          tr.addEventListener('click', () => {
            console.log('[Insurance Search] Row clicked - companyId:', companyId, ', companyName:', companyName);
            const callback = modal._onSelectCallback || onSelectCallback;
            console.log('[Insurance Search] Callback exists:', !!callback);
            if (callback) {
              console.log('[Insurance Search] Executing callback with:', companyId, companyName);
              callback(companyId, companyName, company);
            }
            window.bootstrap?.Modal.getOrCreateInstance(modal)?.hide();
          });
          tbody.appendChild(tr);
        });
      } catch (error) {
        console.error('[Insurance Search] Error:', error);
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-4"><i class="bi bi-exclamation-triangle me-2"></i>Error: ${error.message || error}</td></tr>`;
      }
    }
  };

  // =============================================================================
  // INSURANCE POLICY SEARCH SERVICE (t_InsurancePolicy)
  // =============================================================================

  const InsurancePolicySearchService = {
    /**
     * Search for Insurance Policies
     */
    async searchInsurancePolicies(filters = {}) {
      if (!window.SearchService?.searchClients) {
        throw new Error('SearchService is not available');
      }

      // Build WHERE clause
      let whereConditions = [];
      if (filters.policyNo && filters.policyNo.trim()) {
        const policyValue = filters.policyNo.trim().replace(/'/g, "''");
        whereConditions.push(`PolicyNo like '%${policyValue}%'`);
      }
      if (filters.companyId && filters.companyId.trim()) {
        const companyValue = filters.companyId.trim().replace(/'/g, "''");
        whereConditions.push(`CompanyID like '%${companyValue}%'`);
      }
      if (filters.companyName && filters.companyName.trim()) {
        const nameValue = filters.companyName.trim().replace(/'/g, "''");
        whereConditions.push(`CompanyName like '%${nameValue}%'`);
      }
      if (filters.status && filters.status !== 'all') {
        whereConditions.push(filters.status === 'active' ? "(Status=1 OR IsActive=1)" : "(Status=0 OR IsActive=0)");
      }

      const whereStmt = whereConditions.length > 0 ? whereConditions.join(' AND ') : "1=1";
      const tableIdCandidates = [
        'InsurancePolicy', 
        'InsurancePolicyID', 
        't_InsurancePolicy', 
        'PolicyNo',
        'InsurancePolicies',
        'Policy',
        'Policies',
        'InsurancePolicyNo'
      ];
      const baseRequestData = buildBaseRequestData(whereStmt);

      console.log('[InsurancePolicySearch] Search request (base):', baseRequestData);
      
      let policies = await trySearchWithTableIds(tableIdCandidates, baseRequestData, 'InsurancePolicySearch');

      const insurancePolicyService = window.InsurancePolicyStaticDataService || window.StaticDataService;
      if (policies.length === 0 && insurancePolicyService?.getInsurancePolicy) {
        console.log('[InsurancePolicySearch] Falling back to InsurancePolicyStaticDataService.getInsurancePolicy');
        const policyParams = ['%', '', null, '*'];
        
        for (const param of policyParams) {
          try {
            console.log(`[InsurancePolicySearch] Trying InsurancePolicyStaticDataService with param: "${param}"`);
            const svcResponse = await insurancePolicyService.getInsurancePolicy(param);
            console.log('[InsurancePolicySearch] InsurancePolicyStaticDataService response:', svcResponse);
            
            if (svcResponse?.success) {
              const svcPayload = svcResponse?.data || svcResponse?.Details;
              if (Array.isArray(svcPayload) && svcPayload.length > 0) {
                policies = svcPayload;
                break;
              } else if (svcPayload?.Details && Array.isArray(svcPayload.Details) && svcPayload.Details.length > 0) {
                policies = svcPayload.Details;
                break;
              }
            }
          } catch (err) {
            console.warn(`[InsurancePolicySearch] InsurancePolicyStaticDataService failed with param "${param}":`, err.message);
          }
        }
        
        // Apply client-side filtering
        if (policies.length > 0) {
          if (filters.policyNo && filters.policyNo.trim()) {
            const policyFilter = filters.policyNo.trim().toLowerCase();
            policies = policies.filter(p => (p.PolicyNo || p.PolicyNumber || '').toLowerCase().includes(policyFilter));
          }
          if (filters.companyId && filters.companyId.trim()) {
            const companyFilter = filters.companyId.trim().toLowerCase();
            policies = policies.filter(p => (p.CompanyID || p.InsuranceCompanyId || '').toLowerCase().includes(companyFilter));
          }
          if (filters.companyName && filters.companyName.trim()) {
            const nameFilter = filters.companyName.trim().toLowerCase();
            policies = policies.filter(p => (p.CompanyName || p.InsuranceCompanyName || '').toLowerCase().includes(nameFilter));
          }
          if (filters.status && filters.status !== 'all') {
            policies = policies.filter(p => {
              const isActive = p.Status === 1 || p.Status === '1' || p.IsActive === true || p.Active === 1;
              return filters.status === 'active' ? isActive : !isActive;
            });
          }
        }
      }

      console.log('[InsurancePolicySearch] Final result count:', policies.length);
      return { success: true, data: policies };
    },

    /**
     * Open Insurance Policy search modal
     */
    async openSearchModal(onSelectCallback, options = {}) {
      let modal = document.getElementById('insurancePolicySearchModal');
      
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'insurancePolicySearchModal';
        modal.className = 'modal fade';
        modal.tabIndex = -1;
        modal.innerHTML = `
          <div class="modal-dialog modal-xl">
            <div class="modal-content shadow-lg border-0">
              <div class="modal-header bg-primary text-white py-3">
                <h5 class="modal-title fw-bold"><i class="bi bi-file-earmark-text me-2"></i>Insurance Policy Search</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body p-4">
                <div class="card border-0 bg-light mb-4">
                  <div class="card-body">
                    <div class="row g-3">
                      <div class="col-md-3">
                        <label class="form-label fw-semibold mb-2 d-block">Policy No</label>
                        <input type="text" class="form-control form-control-sm" id="insurancePolicyNoFilter" placeholder="Enter policy no...">
                      </div>
                      <div class="col-md-3">
                        <label class="form-label fw-semibold mb-2 d-block">Company ID</label>
                        <input type="text" class="form-control form-control-sm" id="insurancePolicyCompanyIdFilter" placeholder="Enter company ID...">
                      </div>
                      <div class="col-md-3">
                        <label class="form-label fw-semibold mb-2 d-block">Company Name</label>
                        <input type="text" class="form-control form-control-sm" id="insurancePolicyCompanyNameFilter" placeholder="Enter company name...">
                      </div>
                      <div class="col-md-2">
                        <label class="form-label fw-semibold mb-2 d-block">Status</label>
                        <select class="form-select form-select-sm" id="insurancePolicyStatusFilter">
                          <option value="all" selected>All</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                      <div class="col-md-1 d-flex align-items-end">
                        <button type="button" class="btn btn-primary w-100 shadow-sm" id="insurancePolicySearchBtnModal">
                          <i class="bi bi-search"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="bg-primary bg-gradient text-white px-3 py-2 rounded-top d-flex align-items-center">
                  <i class="bi bi-table me-2"></i><strong>Search Results</strong>
                </div>
                <div class="border border-top-0 rounded-bottom">
                  <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                    <table class="table table-hover table-striped mb-0" id="insurancePolicySearchTable">
                      <thead class="table-light" style="position: sticky; top: 0; z-index: 10; box-shadow: 0 2px 2px -1px rgba(0,0,0,0.1);">
                        <tr>
                          <th style="width: 50px;" class="text-center">#</th>
                          <th style="width: 20%;">Policy No</th>
                          <th style="width: 15%;">Company ID</th>
                          <th>Company Name</th>
                          <th style="width: 80px;" class="text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody></tbody>
                    </table>
                  </div>
                </div>
                <div class="mt-3 p-2 bg-light rounded">
                  <small class="text-muted"><i class="bi bi-info-circle me-1"></i><em>Tip: Click a row to select the insurance policy.</em></small>
                </div>
              </div>
              <div class="modal-footer bg-light">
                <button type="button" class="btn btn-secondary px-4" data-bs-dismiss="modal">
                  <i class="bi bi-x-circle me-1"></i> Close
                </button>
              </div>
            </div>
          </div>`;
        document.body.appendChild(modal);

        const searchBtn = modal.querySelector('#insurancePolicySearchBtnModal');
        searchBtn.addEventListener('click', async () => {
          await InsurancePolicySearchService._performSearch(modal, onSelectCallback);
        });

        const inputs = ['#insurancePolicyNoFilter', '#insurancePolicyCompanyIdFilter', '#insurancePolicyCompanyNameFilter'];
        inputs.forEach(sel => {
          modal.querySelector(sel)?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchBtn?.click();
          });
        });
      }
      
      try {
        const bsModal = window.bootstrap?.Modal.getOrCreateInstance(modal, { backdrop: 'static' });
        bsModal?.show();
        
        modal.querySelector('#insurancePolicyNoFilter').value = '';
        modal.querySelector('#insurancePolicyCompanyIdFilter').value = '';
        modal.querySelector('#insurancePolicyCompanyNameFilter').value = '';
        modal.querySelector('#insurancePolicyStatusFilter').value = 'all';
        modal._onSelectCallback = onSelectCallback;
        
        setTimeout(() => modal.querySelector('#insurancePolicySearchBtnModal')?.click(), 100);
      } catch (error) {
        console.error('[Insurance Policy Search] Error opening modal:', error);
        alert(`Error opening insurance policy search: ${error.message || error}`);
      }
    },

    async _performSearch(modal, onSelectCallback) {
      const tbody = modal.querySelector('#insurancePolicySearchTable tbody');
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4"><i class="bi bi-hourglass-split me-2"></i>Searching...</td></tr>';

      try {
        const response = await InsurancePolicySearchService.searchInsurancePolicies({
          policyNo: modal.querySelector('#insurancePolicyNoFilter').value,
          companyId: modal.querySelector('#insurancePolicyCompanyIdFilter').value,
          companyName: modal.querySelector('#insurancePolicyCompanyNameFilter').value,
          status: modal.querySelector('#insurancePolicyStatusFilter').value
        });

        console.log('[Insurance Policy Search] Filtered response:', response);
        
        if (!response?.success) {
          tbody.innerHTML = `<tr><td colspan="5" class="text-center text-warning py-4"><i class="bi bi-exclamation-triangle me-2"></i>${response?.message || 'No results found'}</td></tr>`;
          return;
        }

        const policies = response?.data || [];
        if (!policies.length) {
          tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4"><i class="bi bi-inbox me-2"></i>No results found</td></tr>';
          return;
        }
        
        tbody.innerHTML = '';
        policies.forEach((policy, index) => {
          const policyNo = policy.PolicyNo || policy.PolicyNumber || '';
          const companyId = policy.CompanyID || policy.InsuranceCompanyId || '';
          const companyName = policy.CompanyName || policy.InsuranceCompanyName || '';
          const isActive = policy.Status === 1 || policy.Status === '1' || policy.IsActive === true || policy.Active === 1;
          
          const tr = document.createElement('tr');
          tr.style.cursor = 'pointer';
          tr.innerHTML = `
            <td class="text-center fw-semibold">${index + 1}</td>
            <td>${policyNo}</td>
            <td>${companyId}</td>
            <td>${companyName}</td>
            <td class="text-center"><span class="badge ${isActive ? 'bg-success' : 'bg-secondary'}">${isActive ? 'Active' : 'Inactive'}</span></td>
          `;
          tr.addEventListener('click', () => {
            const callback = modal._onSelectCallback || onSelectCallback;
            if (callback) callback(policyNo, policy);
            window.bootstrap?.Modal.getOrCreateInstance(modal)?.hide();
          });
          tbody.appendChild(tr);
        });
      } catch (error) {
        console.error('[Insurance Policy Search] Error:', error);
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4"><i class="bi bi-exclamation-triangle me-2"></i>Error: ${error.message || error}</td></tr>`;
      }
    }
  };

  // =============================================================================
  // EXPOSE TO WINDOW
  // =============================================================================
  
  window.InsuranceCodeSearchService = InsuranceCodeSearchService;
  window.InsuranceSearchService = InsuranceSearchService;
  window.InsurancePolicySearchService = InsurancePolicySearchService;
  
  console.log('✅ Insurance Search Services loaded (InsuranceCodeSearchService, InsuranceSearchService, InsurancePolicySearchService)');

})(window);
