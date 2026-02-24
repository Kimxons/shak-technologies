/**
 * Branch Search Service
 * Reusable service for branch search functionality across modules
 */
(function(window) {
  'use strict';

  const BranchSearchService = {
    /**
     * Get branches from backend
     */
    async getBranches(bankId = '00') {
      if (!window.CoreApi) throw new Error('CoreApi is not loaded');
      
      const now = new Date();
      const pad2 = n => String(n).padStart(2, '0');
      const reqTime = `${pad2(now.getMonth() + 1)}/${pad2(now.getDate())}/${now.getFullYear()} ${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
      
      const envelope = {
        RequestID: 'dbo.pc_SearchSystemBranches',
        FormId: 'dbo.pc_SearchSystemBranches',
        RequestData: { BankID: bankId },
        RequestTime: reqTime,
        AppName: 'PROJECT_KAIRO',
        Checksum: ''
      };
      
      // Use environment variable for API base URL
      const env = window.Environment || {};
      let apiUrl = '/api/OldAPI';
      if (env.baseUrlCommon) {
        apiUrl = `${env.baseUrlCommon.replace(/\/+$/, '')}/api/OldAPI`;
      }
      
      return await window.CoreApi.post(apiUrl, envelope);
    },

    /**
     * Open branch search modal
     * @param {Function} onSelectCallback - Callback function(branchId, branchName)
     */
    async openSearchModal(onSelectCallback) {
      let modal = document.getElementById('branchSearchModal');
      
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'branchSearchModal';
        modal.className = 'modal fade';
        modal.tabIndex = -1;
        modal.innerHTML = `
          <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content" style="border-radius: 8px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.15);">
              <!-- Header matching am-header style -->
              <div class="modal-header py-2 px-3" style="background: linear-gradient(135deg, #1e7cc4 0%, #1565a0 100%); border: none;">
                <div class="d-flex align-items-center gap-2">
                  <i class="bi bi-search text-white"></i>
                  <span class="text-white fw-semibold" style="font-size: 14px;">Branch Search</span>
                </div>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close" style="font-size: 10px;"></button>
              </div>
              
              <!-- Search Criteria Section -->
              <div class="modal-body p-3" style="background: #f8f9fa;">
                <div class="mb-3">
                  <div class="row g-2">
                    <div class="col-5">
                      <label class="label-blue am-label mb-1" style="font-size: 11px;">Branch ID</label>
                      <div class="d-flex gap-1">
                        <select class="form-select form-select-sm" id="branchIdOperator" style="width: 70px; font-size: 11px; padding: 4px 6px;">
                          <option value="Like">Like</option>
                          <option value="=">Exact</option>
                        </select>
                        <input type="text" class="form-control form-control-sm" id="branchIdFilter" placeholder="Enter ID..." style="font-size: 11px;">
                      </div>
                    </div>
                    <div class="col-5">
                      <label class="label-blue am-label mb-1" style="font-size: 11px;">Branch Name</label>
                      <div class="d-flex gap-1">
                        <select class="form-select form-select-sm" id="branchNameOperator" style="width: 70px; font-size: 11px; padding: 4px 6px;">
                          <option value="Like">Like</option>
                          <option value="=">Exact</option>
                        </select>
                        <input type="text" class="form-control form-control-sm" id="branchNameFilter" placeholder="Enter name..." style="font-size: 11px;">
                      </div>
                    </div>
                    <div class="col-2 d-flex align-items-end">
                      <button type="button" class="btn btn-sm w-100" id="branchSearchBtnModal" style="background: linear-gradient(135deg, #1e7cc4 0%, #1565a0 100%); color: white; font-size: 11px; padding: 6px;">
                        <i class="bi bi-search"></i> Search
                      </button>
                    </div>
                  </div>
                </div>
                
                <!-- Results Table -->
                <div style="border: 1px solid #dee2e6; border-radius: 4px; overflow: hidden;">
                  <div class="px-2 py-1" style="background: linear-gradient(135deg, #1e7cc4 0%, #1565a0 100%);">
                    <span class="text-white" style="font-size: 11px; font-weight: 600;"><i class="bi bi-table me-1"></i>Search Results</span>
                  </div>
                  <div style="max-height: 300px; overflow-y: auto;">
                    <table class="table table-hover table-sm mb-0" id="branchSearchTable" style="font-size: 11px;">
                      <thead style="position: sticky; top: 0; background: #e9ecef; z-index: 10;">
                        <tr>
                          <th style="width: 50px; padding: 6px 8px;" class="text-center">#</th>
                          <th style="width: 30%; padding: 6px 8px;">Branch ID</th>
                          <th style="padding: 6px 8px;">Branch Name</th>
                        </tr>
                      </thead>
                      <tbody></tbody>
                    </table>
                  </div>
                </div>
                
                <div class="mt-2 text-muted" style="font-size: 10px;">
                  <i class="bi bi-info-circle me-1"></i><em>Click a row to select the branch</em>
                </div>
              </div>
              
              <!-- Footer -->
              <div class="modal-footer py-2 px-3" style="background: linear-gradient(135deg, #1e7cc4 0%, #1565a0 100%); border: none;">
                <button type="button" class="btn btn-sm btn-light px-3" data-bs-dismiss="modal" style="font-size: 11px;">
                  <i class="bi bi-x-circle me-1"></i>Close
                </button>
              </div>
            </div>
          </div>`;
        document.body.appendChild(modal);
        
        // Add search button event listener
        const searchBtn = modal.querySelector('#branchSearchBtnModal');
        searchBtn.addEventListener('click', async () => {
          await BranchSearchService._performSearch(modal, onSelectCallback);
        });
      }
      
      try {
        // Show modal and trigger initial search
        const bsModal = window.bootstrap?.Modal.getOrCreateInstance(modal, { backdrop: 'static' });
        bsModal?.show();
        
        // Trigger initial search after modal is shown
        setTimeout(() => {
          modal.querySelector('#branchSearchBtnModal')?.click();
        }, 100);
      } catch (error) {
        console.error('[Branch Search] Error opening modal:', error);
        alert(`Error opening branch search: ${error.message || error}`);
      }
    },

    /**
     * Internal method to perform search
     */
    async _performSearch(modal, onSelectCallback) {
      try {
        const response = await BranchSearchService.getBranches('00');
        console.log('[Branch Search] Response:', response);
        let branches = response?.data || response?.Details || [];
        
        // Apply filters
        const branchIdFilter = modal.querySelector('#branchIdFilter').value.toLowerCase();
        const branchNameFilter = modal.querySelector('#branchNameFilter').value.toLowerCase();
        const branchIdOp = modal.querySelector('#branchIdOperator').value;
        const branchNameOp = modal.querySelector('#branchNameOperator').value;
        
        if (branchIdFilter) {
          branches = branches.filter(b => {
            const id = (b.BranchID || b.OurBranchID || b.branchId || '').toString().toLowerCase();
            return branchIdOp === 'Like' ? id.includes(branchIdFilter) : id === branchIdFilter;
          });
        }
        if (branchNameFilter) {
          branches = branches.filter(b => {
            const name = (b.BranchName || b.Name || b.branchName || '').toLowerCase();
            return branchNameOp === 'Like' ? name.includes(branchNameFilter) : name === branchNameFilter;
          });
        }
        
        const tbody = modal.querySelector('#branchSearchTable tbody');
        tbody.innerHTML = '';
        
        if (!Array.isArray(branches) || !branches.length) {
          tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-3" style="font-size: 11px;"><i class="bi bi-inbox me-1"></i>No results found</td></tr>';
          return;
        }
        
        // Sort by BranchID ascending
        branches.sort((a, b) => {
          const idA = a.BranchID || a.OurBranchID || a.branchId || '';
          const idB = b.BranchID || b.OurBranchID || b.branchId || '';
          return String(idA).localeCompare(String(idB), undefined, { numeric: true });
        });
        
        branches.forEach((branch, index) => {
          const branchId = branch.BranchID || branch.OurBranchID || branch.branchId || '';
          const branchName = branch.BranchName || branch.Name || branch.branchName || '';
          const tr = document.createElement('tr');
          tr.style.cursor = 'pointer';
          tr.innerHTML = `<td class="text-center" style="padding: 6px 8px;">${index + 1}</td><td style="padding: 6px 8px;">${branchId}</td><td style="padding: 6px 8px;">${branchName}</td>`;
          tr.addEventListener('click', () => {
            if (onSelectCallback) {
              onSelectCallback(branchId, branchName);
            }
            const bsModal = window.bootstrap?.Modal.getOrCreateInstance(modal);
            bsModal?.hide();
          });
          tr.addEventListener('mouseenter', () => tr.style.background = '#e3f2fd');
          tr.addEventListener('mouseleave', () => tr.style.background = '');
          tbody.appendChild(tr);
        });
      } catch (error) {
        const tbody = modal.querySelector('#branchSearchTable tbody');
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-danger py-3" style="font-size: 11px;"><i class="bi bi-exclamation-triangle me-1"></i>Error: ${error.message || error}</td></tr>`;
      }
    }
  };

  // Expose to window
  window.BranchSearchService = BranchSearchService;

})(window);
