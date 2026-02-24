/**
 * Client Search Service
 * Reusable service for client search functionality across modules
 */
(function(window) {
  'use strict';

  const ClientSearchService = {
    /**
     * Search clients from backend
     */
    async searchClients(searchKey = '') {
      if (!window.CoreApi) throw new Error('CoreApi is not loaded');
      
      const now = new Date();
      const pad2 = n => String(n).padStart(2, '0');
      const reqTime = `${pad2(now.getMonth() + 1)}/${pad2(now.getDate())}/${now.getFullYear()} ${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
      
      const session = window.AuthService?.getSession?.() || {};
      const operatorId = session?.operatorID || session?.OperatorID || session?.operatorId || 'JOY_WANJA';
      const branchId = document.getElementById('BranchId')?.value || '001';
      
      const envelope = {
        RequestID: 'dbo.p_GetSearchResult',
        FormId: 'dbo.p_GetSearchResult',
        RequestData: {
          TableID: 'ClientID',
          AdvFilterString: '',
          WhereStmt: '',
          PrevOrNext: 0,
          RefID: null,
          OperatorID: operatorId,
          ModuleID: 0,
          OurBranchID: branchId,
          SearchKey: searchKey,
          LanguageID: 'en'
        },
        RequestTime: reqTime,
        AppName: 'PROJECT_KAIRO',
        Checksum: ''
      };
      
      // Use environment variable for API base URL - construct dynamically at call time
      const env = window.Environment || {};
      const baseUrl = (env.baseUrlCommon || env.baseUrlSystemCodes || env.baseUrlClient || 'http://172.16.2.31:3306').replace(/\/+$/, '');
      const apiUrl = `${baseUrl}/api/OldAPI`;
      
      return await window.CoreApi.post(apiUrl, envelope);
    },

    /**
     * Open client search modal
     * @param {Function} onSelectCallback - Callback function(clientId, clientName)
     */
    async openSearchModal(onSelectCallback) {
      let modal = document.getElementById('clientSearchModal');
      
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'clientSearchModal';
        modal.className = 'modal fade';
        modal.tabIndex = -1;
        modal.innerHTML = `
          <div class="modal-dialog modal-xl">
            <div class="modal-content shadow-lg border-0">
              <div class="modal-header bg-primary text-white py-3">
                <h5 class="modal-title fw-bold"><i class="bi bi-people me-2"></i>Client Search</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body p-4">
                <div class="card border-0 bg-light mb-4">
                  <div class="card-body">
                    <div class="row g-3">
                      <div class="col-md-5">
                        <label class="form-label fw-semibold mb-2 d-block">Client ID</label>
                        <div class="input-group">
                          <select class="form-select form-select-sm" id="clientIdOperator" style="max-width: 90px; border-right: 0;">
                            <option value="Like">Like</option>
                            <option value="=">Exactly</option>
                          </select>
                          <input type="text" class="form-control form-control-sm" id="clientIdFilter" placeholder="Enter client ID...">
                        </div>
                      </div>
                      <div class="col-md-5">
                        <label class="form-label fw-semibold mb-2 d-block">Client Name</label>
                        <div class="input-group">
                          <select class="form-select form-select-sm" id="clientNameOperator" style="max-width: 90px; border-right: 0;">
                            <option value="Like">Like</option>
                            <option value="=">Exactly</option>
                          </select>
                          <input type="text" class="form-control form-control-sm" id="clientNameFilter" placeholder="Enter client name...">
                        </div>
                      </div>
                      <div class="col-md-2 d-flex align-items-end">
                        <button type="button" class="btn btn-primary w-100 shadow-sm" id="clientSearchBtnModal">
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
                    <table class="table table-hover table-striped mb-0" id="clientSearchTable">
                      <thead class="table-light" style="position: sticky; top: 0; z-index: 10; box-shadow: 0 2px 2px -1px rgba(0,0,0,0.1);">
                        <tr>
                          <th style="width: 60px;" class="text-center">#</th>
                          <th style="width: 30%;">Client ID</th>
                          <th>Client Name</th>
                        </tr>
                      </thead>
                      <tbody></tbody>
                    </table>
                  </div>
                </div>
                <div class="mt-3 p-2 bg-light rounded">
                  <small class="text-muted"><i class="bi bi-info-circle me-1"></i><em>Tip: Click a row to select the client.</em></small>
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
        const searchBtn = modal.querySelector('#clientSearchBtnModal');
        searchBtn.addEventListener('click', async () => {
          await ClientSearchService._performSearch(modal, onSelectCallback);
        });
      }
      
      try {
        // Show modal and trigger initial search
        const bsModal = window.bootstrap?.Modal.getOrCreateInstance(modal, { backdrop: 'static' });
        bsModal?.show();
        
        // Trigger initial search after modal is shown
        setTimeout(() => {
          modal.querySelector('#clientSearchBtnModal')?.click();
        }, 100);
      } catch (error) {
        console.error('[Client Search] Error opening modal:', error);
        alert(`Error opening client search: ${error.message || error}`);
      }
    },

    /**
     * Internal method to perform search
     */
    async _performSearch(modal, onSelectCallback) {
      try {
        const clientIdFilter = modal.querySelector('#clientIdFilter').value;
        const response = await ClientSearchService.searchClients(clientIdFilter);
        console.log('[Client Search] Response:', response);
        let clients = response?.data || response?.Details || [];
        
        // Apply additional filters
        const clientNameFilter = modal.querySelector('#clientNameFilter').value.toLowerCase();
        const clientIdOp = modal.querySelector('#clientIdOperator').value;
        const clientNameOp = modal.querySelector('#clientNameOperator').value;
        
        if (clientIdFilter && clientIdOp === '=') {
          clients = clients.filter(c => {
            const id = (c.ClientID || c.ID || '').toString().toLowerCase();
            return id === clientIdFilter.toLowerCase();
          });
        }
        if (clientNameFilter) {
          clients = clients.filter(c => {
            const name = (c.ClientName || c.Name || '').toLowerCase();
            return clientNameOp === 'Like' ? name.includes(clientNameFilter) : name === clientNameFilter;
          });
        }
        
        const tbody = modal.querySelector('#clientSearchTable tbody');
        tbody.innerHTML = '';
        
        if (!Array.isArray(clients) || !clients.length) {
          tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-4"><i class="bi bi-inbox me-2"></i>No results found</td></tr>';
          return;
        }
        
        clients.forEach((client, index) => {
          const clientId = client.ClientID || client.ID || '';
          const clientName = client.ClientName || client.Name || '';
          const tr = document.createElement('tr');
          tr.style.cursor = 'pointer';
          tr.innerHTML = `<td class="text-center fw-semibold">${index + 1}</td><td>${clientId}</td><td>${clientName}</td>`;
          tr.addEventListener('click', () => {
            if (onSelectCallback) {
              onSelectCallback(clientId, clientName);
            }
            const bsModal = window.bootstrap?.Modal.getOrCreateInstance(modal);
            bsModal?.hide();
          });
          tbody.appendChild(tr);
        });
      } catch (error) {
        const tbody = modal.querySelector('#clientSearchTable tbody');
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-danger py-4"><i class="bi bi-exclamation-triangle me-2"></i>Error: ${error.message || error}</td></tr>`;
      }
    }
  };

  // Expose to window
  window.ClientSearchService = ClientSearchService;

})(window);
