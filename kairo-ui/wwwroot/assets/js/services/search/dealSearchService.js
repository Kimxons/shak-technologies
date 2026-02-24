/**
 * Deal Search Service
 * Reusable service for deal/transaction number search functionality across modules
 */
(function(window) {
  'use strict';

  const DealSearchService = {
    /**
     * Search deals from backend
     */
    async searchDeals(requestData) {
      if (!window.SearchService?.searchDeals) {
        throw new Error('SearchService not available');
      }
      return await window.SearchService.searchDeals(requestData);
    },

    /**
     * Open deal search modal
     * @param {Object} config - Configuration object
     * @param {string} config.tableId - Table ID for search (e.g., 'FXDealNo')
     * @param {number} config.moduleId - Module ID
     * @param {string} config.module - Module name (e.g., 'BOOK')
     * @param {string} config.title - Modal title
     * @param {Function} config.onSelectCallback - Callback function(dealNumber, record)
     */
    async openSearchModal(config) {
      const {
        tableId = 'FXDealNo',
        moduleId = 6500,
        module = 'BOOK',
        title = 'Deal Search',
        onSelectCallback
      } = config;

      let modal = document.getElementById('dealSearchModal');
      
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'dealSearchModal';
        modal.className = 'modal fade';
        modal.tabIndex = -1;
        modal.innerHTML = `
          <div class="modal-dialog modal-xl">
            <div class="modal-content shadow-lg border-0">
              <div class="modal-header bg-primary text-white py-3">
                <h5 class="modal-title fw-bold"><i class="bi bi-search me-2"></i>${title}</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body p-4">
                <div class="card border-0 bg-light mb-4">
                  <div class="card-body">
                    <div class="row g-3">
                      <div class="col-md-3">
                        <label class="form-label fw-semibold mb-2 d-block">Deal Number</label>
                        <div class="input-group">
                          <select class="form-select form-select-sm" id="dealSearchDealNumberOp" style="max-width: 90px; border-right: 0;">
                            <option value="LIKE">Like</option>
                            <option value="=">Exactly</option>
                          </select>
                          <input type="text" class="form-control form-control-sm" id="dealSearchDealNumber" placeholder="Enter deal number...">
                        </div>
                      </div>
                      <div class="col-md-3">
                        <label class="form-label fw-semibold mb-2 d-block">Value Date</label>
                        <div class="input-group">
                          <select class="form-select form-select-sm" id="dealSearchValueDateOp" style="max-width: 90px; border-right: 0;">
                            <option value="LIKE">Like</option>
                            <option value="=">Exactly</option>
                          </select>
                          <input type="text" class="form-control form-control-sm" id="dealSearchValueDate" placeholder="YYYY-MM-DD">
                        </div>
                      </div>
                      <div class="col-md-4">
                        <label class="form-label fw-semibold mb-2 d-block">Branch ID</label>
                        <div class="input-group">
                          <select class="form-select form-select-sm" id="dealSearchOurBranchIdOp" style="max-width: 90px; border-right: 0;">
                            <option value="=">Exactly</option>
                            <option value="LIKE">Like</option>
                          </select>
                          <input type="text" class="form-control form-control-sm" id="dealSearchOurBranchId" placeholder="Enter branch ID...">
                        </div>
                      </div>
                      <div class="col-md-2 d-flex align-items-end">
                        <button type="button" class="btn btn-primary w-100 shadow-sm" id="dealSearchBtnModal">
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
                  <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                    <table class="table table-hover table-striped mb-0" id="dealSearchTable">
                      <thead class="table-light" style="position: sticky; top: 0; z-index: 10; box-shadow: 0 2px 2px -1px rgba(0,0,0,0.1);">
                        <tr>
                          <th style="width: 60px;" class="text-center">#</th>
                          <th style="width: 20%;">Deal Number</th>
                          <th style="width: 25%;">Value Date</th>
                          <th style="width: 25%;">Branch ID</th>
                          <th style="width: 20%;">Module</th>
                        </tr>
                      </thead>
                      <tbody></tbody>
                    </table>
                  </div>
                </div>
                <div class="mt-3 p-2 bg-light rounded">
                  <small class="text-muted"><i class="bi bi-info-circle me-1"></i><em>Tip: Click a row to select the deal.</em></small>
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
        
        // Add search button event listener
        const searchBtn = modal.querySelector('#dealSearchBtnModal');
        searchBtn.addEventListener('click', async () => {
          await DealSearchService._performSearch(modal, tableId, moduleId, module, onSelectCallback);
        });
      } else {
        // Update modal title if reusing
        const modalTitle = modal.querySelector('.modal-title');
        if (modalTitle) {
          modalTitle.innerHTML = `<i class="bi bi-search me-2"></i>${title}`;
        }
      }
      
      // Prefill branch from session/form
      const branchInput = modal.querySelector('#dealSearchOurBranchId');
      if (branchInput && !branchInput.value.trim()) {
        const session = window.AuthService?.getSession?.() || {};
        const branchId = session?.ourBranchID || session?.OurBranchID || '0325';
        branchInput.value = branchId;
      }
      
      try {
        // Show modal
        const bsModal = window.bootstrap?.Modal.getOrCreateInstance(modal, { backdrop: 'static' });
        bsModal?.show();
        
        // Auto-run first search
        setTimeout(() => {
          modal.querySelector('#dealSearchBtnModal')?.click();
        }, 100);
      } catch (error) {
        console.error('[Deal Search] Error opening modal:', error);
        alert(`Error opening deal search: ${error.message || error}`);
      }
    },

    /**
     * Internal method to perform search
     */
    async _performSearch(modal, tableId, moduleId, module, onSelectCallback) {
      const tbody = modal.querySelector('#dealSearchTable tbody');
      
      if (!tbody) return;
      
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Searching...</td></tr>';
      
      if (!window.ServiceLoader?.loadSearchService) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">ServiceLoader not available</td></tr>';
        return;
      }
      
      await window.ServiceLoader.loadSearchService();
      
      if (!window.SearchService?.searchDeals) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Search service unavailable</td></tr>';
        return;
      }
      
      const session = window.AuthService?.getSession?.() || {};
      const operatorId = session?.operatorID || session?.OperatorID || session?.operatorId || 'JOY_WANJA';
      const ourBranchId = modal.querySelector('#dealSearchOurBranchId')?.value.trim() || '0325';
      
      // Build where statement
      const dealOp = modal.querySelector('#dealSearchDealNumberOp')?.value || 'LIKE';
      const dealVal = modal.querySelector('#dealSearchDealNumber')?.value.trim() || '';
      const dateOp = modal.querySelector('#dealSearchValueDateOp')?.value || 'LIKE';
      const dateVal = modal.querySelector('#dealSearchValueDate')?.value.trim() || '';
      const brOp = modal.querySelector('#dealSearchOurBranchIdOp')?.value || '=';
      const brVal = modal.querySelector('#dealSearchOurBranchId')?.value.trim() || '';
      
      const sqlEscape = (value) => String(value ?? '').replace(/'/g, "''");
      const clauses = [];
      
      if (dealVal) {
        const escaped = sqlEscape(dealVal);
        clauses.push(dealOp === 'LIKE' ? `DealNumber LIKE '%${escaped}%'` : `DealNumber = '${escaped}'`);
      }
      if (dateVal) {
        const escaped = sqlEscape(dateVal);
        clauses.push(dateOp === 'LIKE' ? `ValueDate LIKE '%${escaped}%'` : `ValueDate = '${escaped}'`);
      }
      if (brVal) {
        const escaped = sqlEscape(brVal);
        clauses.push(brOp === 'LIKE' ? `OurBranchID LIKE '%${escaped}%'` : `OurBranchID = '${escaped}'`);
      }
      
      const whereStmt = clauses.join(' AND ');
      
      const requestData = {
        WhereStmt: whereStmt || '',
        TableID: tableId,
        RefID: null,
        PrevOrNext: 0,
        AdvFilterString: `OurBranchID='${sqlEscape(ourBranchId)}' AND Module='${sqlEscape(module)}'`,
        OperatorID: operatorId,
        ModuleID: moduleId,
        OurBranchID: ourBranchId,
        SearchKey: null,
        LanguageID: 'en'
      };
      
      try {
        const response = await window.SearchService.searchDeals(requestData);
        console.log('[Deal Search] Response:', response);
        
        if (!response?.success) {
          tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Search failed. Check console.</td></tr>';
          return;
        }
        
        const extractRows = (response) => {
          if (!response) return [];
          if (Array.isArray(response.data)) return response.data;
          if (Array.isArray(response.Details)) return response.Details;
          if (Array.isArray(response?.data?.Details)) return response.data.Details;
          if (Array.isArray(response?.data?.Details01)) return response.data.Details01;
          if (Array.isArray(response?.Details01)) return response.Details01;
          return [];
        };
        
        const rows = extractRows(response);
        tbody.innerHTML = '';
        
        if (!Array.isArray(rows) || rows.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4"><i class="bi bi-inbox me-2"></i>No results found</td></tr>';
          return;
        }
        
        rows.forEach((row, idx) => {
          const dealNumber = row.DealNumber ?? row.FXDealNo ?? row.DealNo ?? row.Code ?? row.ID ?? '';
          const valueDate = row.ValueDate ?? row.DealDate ?? row.Value_Date ?? '';
          const branchId = row.OurBranchID ?? row.OurBranchId ?? row.BranchID ?? '';
          const moduleVal = row.Module ?? row.ModuleID ?? '';
          
          const tr = document.createElement('tr');
          tr.style.cursor = 'pointer';
          tr.innerHTML = `
            <td class="text-center fw-semibold">${idx + 1}</td>
            <td>${dealNumber ?? ''}</td>
            <td>${valueDate ?? ''}</td>
            <td>${branchId ?? ''}</td>
            <td>${moduleVal ?? ''}</td>
          `;
          
          tr.addEventListener('click', () => {
            if (onSelectCallback) {
              onSelectCallback(dealNumber, row);
            }
            const bsModal = window.bootstrap?.Modal.getOrCreateInstance(modal);
            bsModal?.hide();
          });
          
          tbody.appendChild(tr);
        });
      } catch (error) {
        console.error('[Deal Search] Search failed:', error);
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4"><i class="bi bi-exclamation-triangle me-2"></i>Error: ${error.message || error}</td></tr>`;
      }
    }
  };

  // Expose to window
  window.DealSearchService = DealSearchService;

})(window);
