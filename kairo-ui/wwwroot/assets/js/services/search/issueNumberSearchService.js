/**
 * Issue Number Search Service
 * Reusable service for security issue number search functionality across modules
 */
(function(window) {
  'use strict';

  const IssueNumberSearchService = {
    /**
     * Search issue numbers from backend
     */
    async searchIssueNumbers(requestData) {
      if (!window.SearchService?.searchDeals) {
        throw new Error('SearchService not available');
      }
      return await window.SearchService.searchDeals(requestData);
    },

    /**
     * Open issue number search modal
     * @param {Object} config - Configuration object
     * @param {string} config.defaultBranchId - Default branch ID (e.g., '1201')
     * @param {string} config.title - Modal title (default: 'Issue Number Search')
     * @param {Function} config.onSelectCallback - Callback function(issueNumber, record)
     */
    async openSearchModal(config) {
      const {
        defaultBranchId = '1201',
        title = 'Issue Number Search',
        onSelectCallback
      } = config;

      let modal = document.getElementById('issueNumberSearchModal');
      
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'issueNumberSearchModal';
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
                      <div class="col-md-4">
                        <label class="form-label fw-semibold mb-2 d-block">Issue Number</label>
                        <div class="input-group">
                          <select class="form-select form-select-sm" id="issueNumberOp" style="max-width: 90px; border-right: 0;">
                            <option value="LIKE">Like</option>
                            <option value="=">Exactly</option>
                          </select>
                          <input type="text" class="form-control form-control-sm" id="issueNumberFilter" placeholder="Enter issue number...">
                        </div>
                      </div>
                      <div class="col-md-4">
                        <label class="form-label fw-semibold mb-2 d-block">Branch ID</label>
                        <div class="input-group">
                          <select class="form-select form-select-sm" id="issueBranchOp" style="max-width: 90px; border-right: 0;">
                            <option value="=">Exactly</option>
                            <option value="LIKE">Like</option>
                          </select>
                          <input type="text" class="form-control form-control-sm" id="issueBranchFilter" placeholder="Enter branch ID...">
                        </div>
                      </div>
                      <div class="col-md-4 d-flex align-items-end">
                        <button type="button" class="btn btn-primary w-100 shadow-sm" id="issueSearchBtnModal">
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
                    <table class="table table-hover table-striped mb-0" id="issueSearchTable">
                      <thead class="table-light" style="position: sticky; top: 0; z-index: 10; box-shadow: 0 2px 2px -1px rgba(0,0,0,0.1);">
                        <tr>
                          <th style="width: 60px;" class="text-center">#</th>
                          <th style="width: 20%;">Branch ID</th>
                          <th style="width: 25%;">Issue Number</th>
                          <th style="width: 25%;">Tender Date</th>
                          <th style="width: 20%;">Security Type</th>
                        </tr>
                      </thead>
                      <tbody></tbody>
                    </table>
                  </div>
                </div>
                <div class="mt-3 p-2 bg-light rounded">
                  <small class="text-muted"><i class="bi bi-info-circle me-1"></i><em>Tip: Click a row to select the issue.</em></small>
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
        const searchBtn = modal.querySelector('#issueSearchBtnModal');
        searchBtn.addEventListener('click', async () => {
          await IssueNumberSearchService._performSearch(modal, defaultBranchId, onSelectCallback);
        });
      }
      
      // Prefill branch from config
      const branchInput = modal.querySelector('#issueBranchFilter');
      if (branchInput && !branchInput.value.trim()) {
        branchInput.value = defaultBranchId;
      }
      
      try {
        // Show modal
        const bsModal = window.bootstrap?.Modal.getOrCreateInstance(modal, { backdrop: 'static' });
        bsModal?.show();
        
        // Auto-run first search
        setTimeout(() => {
          modal.querySelector('#issueSearchBtnModal')?.click();
        }, 100);
      } catch (error) {
        console.error('[Issue Number Search] Error opening modal:', error);
        alert(`Error opening issue number search: ${error.message || error}`);
      }
    },

    /**
     * Internal method to perform search
     */
    async _performSearch(modal, defaultBranchId, onSelectCallback) {
      const tbody = modal.querySelector('#issueSearchTable tbody');
      if (!tbody) return;

      if (!window.ServiceLoader?.loadSearchService) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-4"><i class="bi bi-exclamation-triangle me-2"></i>ServiceLoader.loadSearchService not available</td></tr>';
        return;
      }

      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4"><i class="bi bi-hourglass-split me-2"></i>Searching...</td></tr>';
      
      await window.ServiceLoader.loadSearchService();

      if (!window.SearchService?.searchDeals) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-4"><i class="bi bi-exclamation-triangle me-2"></i>Search service unavailable</td></tr>';
        return;
      }

      // Get filter values
      const issueNumberOp = modal.querySelector('#issueNumberOp').value;
      const issueNumberFilter = modal.querySelector('#issueNumberFilter').value.trim();
      const branchOp = modal.querySelector('#issueBranchOp').value;
      const branchFilter = modal.querySelector('#issueBranchFilter').value.trim() || defaultBranchId;

      // Build WHERE statement
      const sqlEscape = (value) => String(value ?? '').replace(/'/g, "''");
      const clauses = [];

      if (issueNumberFilter) {
        const escaped = sqlEscape(issueNumberFilter);
        clauses.push(issueNumberOp === 'LIKE' ? `IssueNumber LIKE '%${escaped}%'` : `IssueNumber = '${escaped}'`);
      }

      if (branchFilter) {
        const escaped = sqlEscape(branchFilter);
        clauses.push(branchOp === 'LIKE' ? `OurBranchID LIKE '%${escaped}%'` : `OurBranchID = '${escaped}'`);
      }

      const whereStmt = clauses.join(' AND ');

      // Get session data
      const session = window.AuthService?.getSession?.() || {};
      const operatorId = session?.operatorID || session?.OperatorID || session?.operatorId || 'JOY_WANJA';

      const requestData = {
        TableID: 'SecurityNo',
        AdvFilterString: `OurBranchID='${sqlEscape(branchFilter)}'`,
        WhereStmt: whereStmt || '',
        PrevOrNext: 0,
        RefID: null,
        OperatorID: operatorId,
        ModuleID: 9909,
        OurBranchID: branchFilter,
        SearchKey: null,
        LanguageID: 'en'
      };

      try {
        const response = await IssueNumberSearchService.searchIssueNumbers(requestData);
        console.log('[Issue Number Search] Response:', response);

        if (!response?.success) {
          tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-4"><i class="bi bi-exclamation-triangle me-2"></i>Search failed. Check console for details.</td></tr>';
          return;
        }

        // Extract rows
        let rows = [];
        if (Array.isArray(response.data)) rows = response.data;
        else if (Array.isArray(response.Details)) rows = response.Details;
        else if (Array.isArray(response?.data?.Details)) rows = response.data.Details;
        else if (Array.isArray(response?.data?.Details01)) rows = response.data.Details01;
        else if (Array.isArray(response?.Details01)) rows = response.Details01;

        tbody.innerHTML = '';

        if (!Array.isArray(rows) || !rows.length) {
          tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4"><i class="bi bi-inbox me-2"></i>No results found</td></tr>';
          return;
        }

        rows.forEach((row, index) => {
          const issueNumber = row.IssueNumber ?? row.SecurityNo ?? row.SecurityNumber ?? row.Code ?? row.ID ?? '';
          const tenderDate = row.TenderDate ?? row.ValueDate ?? row.DealDate ?? '';
          const ourBranchId = row.OurBranchID ?? row.OurBranchId ?? row.BranchID ?? '';
          const securityType = row.SecurityType ?? row.SecurityTypeName ?? row.SecurityCategory ?? row.Module ?? row.ModuleID ?? '';

          const tr = document.createElement('tr');
          tr.style.cursor = 'pointer';
          tr.innerHTML = `
            <td class="text-center fw-semibold">${index + 1}</td>
            <td>${ourBranchId ?? ''}</td>
            <td>${issueNumber ?? ''}</td>
            <td>${tenderDate ?? ''}</td>
            <td>${securityType ?? ''}</td>
          `;

          tr.addEventListener('click', () => {
            if (onSelectCallback) {
              onSelectCallback(issueNumber, row);
            }
            const bsModal = window.bootstrap?.Modal.getOrCreateInstance(modal);
            bsModal?.hide();
          });

          tbody.appendChild(tr);
        });
      } catch (error) {
        console.error('[Issue Number Search] Error:', error);
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4"><i class="bi bi-exclamation-triangle me-2"></i>Error: ${error.message || error}</td></tr>`;
      }
    }
  };

  // Expose to window
  window.IssueNumberSearchService = IssueNumberSearchService;

})(window);
