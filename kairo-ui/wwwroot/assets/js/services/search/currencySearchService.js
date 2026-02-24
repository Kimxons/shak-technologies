/**
 * Currency Search Service
 * Reusable service for currency search functionality across modules
 */
(function(window) {
  'use strict';

  const CurrencySearchService = {
    /**
     * Get currencies from backend
     */
    async getCurrencies() {
      if (!window.CoreApi) throw new Error('CoreApi is not loaded');
      
      const now = new Date();
      const pad2 = n => String(n).padStart(2, '0');
      const reqTime = `${pad2(now.getMonth() + 1)}/${pad2(now.getDate())}/${now.getFullYear()} ${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
      
      const envelope = {
        RequestID: 'dbo.pc_SearchCurrencies',
        FormId: 'dbo.pc_SearchCurrencies',
        RequestData: {},
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
     * Open currency search modal
     * @param {Function} onSelectCallback - Callback function(currencyId, currencyName)
     */
    async openSearchModal(onSelectCallback) {
      let modal = document.getElementById('currencySearchModal');
      
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'currencySearchModal';
        modal.className = 'modal fade';
        modal.tabIndex = -1;
        modal.innerHTML = `
          <div class="modal-dialog modal-lg">
            <div class="modal-content shadow-lg border-0">
              <div class="modal-header bg-primary text-white py-3">
                <h5 class="modal-title fw-bold"><i class="bi bi-currency-exchange me-2"></i>Currency Search</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body p-4">
                <div class="card border-0 bg-light mb-4">
                  <div class="card-body">
                    <div class="row g-3">
                      <div class="col-md-10">
                        <label class="form-label fw-semibold mb-2 d-block">Search</label>
                        <input type="text" class="form-control form-control-sm" id="currencyFilter" placeholder="Search by currency code or name...">
                      </div>
                      <div class="col-md-2 d-flex align-items-end">
                        <button type="button" class="btn btn-primary w-100 shadow-sm" id="currencySearchBtnModal">
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
                    <table class="table table-hover table-striped mb-0" id="currencySearchTable">
                      <thead class="table-light" style="position: sticky; top: 0; z-index: 10; box-shadow: 0 2px 2px -1px rgba(0,0,0,0.1);">
                        <tr>
                          <th style="width: 60px;" class="text-center">#</th>
                          <th style="width: 30%;">Currency Code</th>
                          <th>Currency Name</th>
                        </tr>
                      </thead>
                      <tbody></tbody>
                    </table>
                  </div>
                </div>
                <div class="mt-3 p-2 bg-light rounded">
                  <small class="text-muted"><i class="bi bi-info-circle me-1"></i><em>Tip: Click a row to select the currency.</em></small>
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
        const searchBtn = modal.querySelector('#currencySearchBtnModal');
        searchBtn.addEventListener('click', async () => {
          await CurrencySearchService._performSearch(modal, onSelectCallback);
        });

        // Add filter input event listener
        const filterInput = modal.querySelector('#currencyFilter');
        filterInput.addEventListener('input', () => {
          CurrencySearchService._filterResults(modal);
        });
      }
      
      try {
        // Show modal and trigger initial search
        const bsModal = window.bootstrap?.Modal.getOrCreateInstance(modal, { backdrop: 'static' });
        bsModal?.show();
        
        // Trigger initial search after modal is shown
        setTimeout(() => {
          modal.querySelector('#currencySearchBtnModal')?.click();
        }, 100);
      } catch (error) {
        console.error('[Currency Search] Error opening modal:', error);
        alert(`Error opening currency search: ${error.message || error}`);
      }
    },

    // Store all currencies for filtering
    _allCurrencies: [],

    /**
     * Internal method to perform search
     */
    async _performSearch(modal, onSelectCallback) {
      const tbody = modal.querySelector('#currencySearchTable tbody');
      if (!tbody) return;

      // Check for CoreApi directly (ServiceLoader.loadCore is optional)
      if (!window.CoreApi) {
        // Try to load via ServiceLoader if available
        if (window.ServiceLoader?.loadCore) {
          await window.ServiceLoader.loadCore();
        }
        
        // Check again after potential load
        if (!window.CoreApi) {
          tbody.innerHTML = '<tr><td colspan="3" class="text-center text-danger py-4"><i class="bi bi-exclamation-triangle me-2"></i>CoreApi not available</td></tr>';
          return;
        }
      }

      tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-4"><i class="bi bi-hourglass-split me-2"></i>Searching...</td></tr>';

      try {
        const response = await CurrencySearchService.getCurrencies();
        console.log('[Currency Search] Response:', response);

        if (!response?.success) {
          tbody.innerHTML = '<tr><td colspan="3" class="text-center text-danger py-4"><i class="bi bi-exclamation-triangle me-2"></i>Search failed. Check console for details.</td></tr>';
          return;
        }

        // Extract rows
        let currencies = [];
        if (Array.isArray(response.data)) currencies = response.data;
        else if (Array.isArray(response.Details)) currencies = response.Details;
        else if (Array.isArray(response?.data?.Details)) currencies = response.data.Details;
        else if (Array.isArray(response?.data?.Details01)) currencies = response.data.Details01;

        // Store for filtering
        CurrencySearchService._allCurrencies = currencies;
        
        // Render results
        CurrencySearchService._renderCurrencies(modal, currencies, onSelectCallback);
      } catch (error) {
        console.error('[Currency Search] Error:', error);
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-danger py-4"><i class="bi bi-exclamation-triangle me-2"></i>Error: ${error.message || error}</td></tr>`;
      }
    },

    /**
     * Internal method to filter results based on input
     */
    _filterResults(modal) {
      const filterText = modal.querySelector('#currencyFilter').value.toLowerCase().trim();
      const currencies = CurrencySearchService._allCurrencies;

      if (!filterText) {
        CurrencySearchService._renderCurrencies(modal, currencies);
        return;
      }

      const filtered = currencies.filter((currency) => {
        const searchText = [
          currency.CurrencyID,
          currency.CurrencyId,
          currency.CurrencyCode,
          currency.Code,
          currency.CurrencyName,
          currency.Description,
          currency.Country,
          currency.NumericCode,
          currency.ISOCode
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        
        return searchText.includes(filterText);
      });

      CurrencySearchService._renderCurrencies(modal, filtered);
    },

    /**
     * Internal method to render currency results
     */
    _renderCurrencies(modal, currencies, onSelectCallback) {
      const tbody = modal.querySelector('#currencySearchTable tbody');
      if (!tbody) return;

      tbody.innerHTML = '';

      if (!Array.isArray(currencies) || !currencies.length) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-4"><i class="bi bi-inbox me-2"></i>No results found</td></tr>';
        return;
      }

      currencies.forEach((currency, index) => {
        const currencyId = currency.CurrencyID ?? currency.CurrencyId ?? currency.CurrencyCode ?? currency.Code ?? currency.ID ?? '';
        const currencyName = currency.CurrencyName ?? currency.Description ?? currency.Name ?? '';

        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.innerHTML = `
          <td class="text-center fw-semibold">${index + 1}</td>
          <td>${currencyId ?? ''}</td>
          <td>${currencyName ?? ''}</td>
        `;

        tr.addEventListener('click', () => {
          if (onSelectCallback) {
            onSelectCallback(currencyId, currencyName);
          }
          const bsModal = window.bootstrap?.Modal.getOrCreateInstance(modal);
          bsModal?.hide();
        });

        tbody.appendChild(tr);
      });
    }
  };

  // Expose to window
  window.CurrencySearchService = CurrencySearchService;

})(window);
