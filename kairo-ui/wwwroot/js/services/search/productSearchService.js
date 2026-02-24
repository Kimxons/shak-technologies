/**
 * Product Search Service
 * Reusable service for product search functionality across modules
 */
(function(window) {
  'use strict';

  const ProductSearchService = {
    /**
     * Search products from backend
     */
    async searchProducts(filters = {}, overrides = {}) {
      // Check for ProductLgLcService directly first
      if (!window.ProductLgLcService?.getSearchResult) {
        // Try to load via ServiceLoader if available
        if (window.ServiceLoader?.loadProductLgLcService) {
          await window.ServiceLoader.loadProductLgLcService();
        }
        
        // Check again after potential load
        if (!window.ProductLgLcService?.getSearchResult) {
          throw new Error('ProductLgLcService.getSearchResult is not available');
        }
      }

      const session = window.AuthService?.getSession?.() || null;
      const bankId =
        session?.bankID || session?.BankID || window.Environment?.BankID || window.Environment?.bankID || "00";
      const branchId =
        document.getElementById("BranchId")?.value ||
        session?.branchID ||
        session?.BranchID ||
        window.Environment?.BranchID ||
        window.Environment?.branchID ||
        "00";
      const operatorId = session?.operatorID || session?.OperatorID || window.Environment?.OperatorID || "JOY_WANJA";

      // Build WHERE clause from filters
      let whereConditions = [];
      if (filters.productId && filters.productId.trim()) {
        const productIdOp = filters.productIdOperator || 'Like';
        const productIdValue = filters.productId.trim().replace(/'/g, "''");
        if (productIdOp === 'Like') {
          whereConditions.push(`ProductID like '%${productIdValue}%'`);
        } else {
          whereConditions.push(`ProductID='${productIdValue}'`);
        }
      }
      if (filters.productDescription && filters.productDescription.trim()) {
        const descOp = filters.productDescriptionOperator || 'Like';
        const descValue = filters.productDescription.trim().replace(/'/g, "''");
        if (descOp === 'Like') {
          whereConditions.push(`Description like '%${descValue}%'`);
        } else {
          whereConditions.push(`Description='${descValue}'`);
        }
      }

      const whereStmt = whereConditions.length > 0 ? whereConditions.join(" AND ") : "";
      // Allow caller to override search scope; default to LG/LC/AP/CD
      const advFilterString = overrides.advFilterString || `BankID='${bankId}' AND ProductTypeID IN ('LG','LC','AP','CD')`;

      const requestData = {
        TableID: overrides.tableId || "ProductID",
        AdvFilterString: advFilterString,
        WhereStmt: whereStmt,
        PrevOrNext: overrides.prevOrNext ?? 0,
        RefID: overrides.refId ?? null,
        OperatorID: operatorId,
        ModuleID: overrides.moduleId || 2512,
        OurBranchID: branchId,
        SearchKey: overrides.searchKey ?? null,
        LanguageID: overrides.languageId || "en"
      };

      console.log("[ProductSearch] Search request:", requestData);
      return await window.ProductLgLcService.getSearchResult(requestData);
    },

    /**
     * Open product search modal
     * @param {Function} onSelectCallback - Callback function(productId, productDescription)
     */
    async openSearchModal(onSelectCallback, overrides = {}) {
      let modal = document.getElementById('productSearchModal');
      
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'productSearchModal';
        modal.className = 'modal fade';
        modal.tabIndex = -1;
        modal.innerHTML = `
          <div class="modal-dialog modal-xl">
            <div class="modal-content shadow-lg border-0">
              <div class="modal-header bg-primary text-white py-3">
                <h5 class="modal-title fw-bold"><i class="bi bi-search me-2"></i>Product Search</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body p-4">
                <div class="card border-0 bg-light mb-4">
                  <div class="card-body">
                    <div class="row g-3">
                      <div class="col-md-5">
                        <label class="form-label fw-semibold mb-2 d-block">Product ID</label>
                        <div class="input-group">
                          <select class="form-select form-select-sm" id="productIdOperator" style="max-width: 90px; border-right: 0;">
                            <option value="Like">Like</option>
                            <option value="=">Exactly</option>
                          </select>
                          <input type="text" class="form-control form-control-sm" id="productIdFilter" placeholder="Enter product ID...">
                        </div>
                      </div>
                      <div class="col-md-5">
                        <label class="form-label fw-semibold mb-2 d-block">Product Description</label>
                        <div class="input-group">
                          <select class="form-select form-select-sm" id="productDescriptionOperator" style="max-width: 90px; border-right: 0;">
                            <option value="Like">Like</option>
                            <option value="=">Exactly</option>
                          </select>
                          <input type="text" class="form-control form-control-sm" id="productDescriptionFilter" placeholder="Enter product description...">
                        </div>
                      </div>
                      <div class="col-md-2 d-flex align-items-end">
                        <button type="button" class="btn btn-primary w-100 shadow-sm" id="productSearchBtnModal">
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
                    <table class="table table-hover table-striped mb-0" id="productSearchTable">
                      <thead class="table-light" style="position: sticky; top: 0; z-index: 10; box-shadow: 0 2px 2px -1px rgba(0,0,0,0.1);">
                        <tr>
                          <th style="width: 50px;" class="text-center">#</th>
                          <th style="width: 20%;">Product ID</th>
                          <th style="width: 30%;">Product Description</th>
                          <th style="width: 20%;">Product Type</th>
                          <th style="width: 15%;">Currency</th>
                        </tr>
                      </thead>
                      <tbody></tbody>
                    </table>
                  </div>
                </div>
                <div class="mt-3 p-2 bg-light rounded">
                  <small class="text-muted"><i class="bi bi-info-circle me-1"></i><em>Tip: Click a row to select the product.</em></small>
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
        
        // Add enter key support for search inputs
        const productIdInput = modal.querySelector('#productIdFilter');
        const productDescInput = modal.querySelector('#productDescriptionFilter');
        [productIdInput, productDescInput].forEach(input => {
          input?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
              searchBtn?.click();
            }
          });
        });
      }

      // Always bind the latest overrides to the search button
      const searchBtn = modal.querySelector('#productSearchBtnModal');
      if (searchBtn) {
        searchBtn.onclick = async () => {
          await ProductSearchService._performSearch(modal, onSelectCallback, overrides);
        };
      }
      
      try {
        // Show modal and trigger initial search
        const bsModal = window.bootstrap?.Modal.getOrCreateInstance(modal, { backdrop: 'static' });
        bsModal?.show();
        
        // Pre-fill search if Product field has value
        const productField = document.getElementById('Product');
        if (productField?.value?.trim()) {
          const productIdInput = modal.querySelector('#productIdFilter');
          if (productIdInput) {
            productIdInput.value = productField.value.trim();
          }
        }
        
        // Trigger initial search after modal is shown
        setTimeout(() => {
          modal.querySelector('#productSearchBtnModal')?.click();
        }, 100);
      } catch (error) {
        console.error('[Product Search] Error opening modal:', error);
        alert(`Error opening product search: ${error.message || error}`);
      }
    },

    /**
     * Internal method to perform search
     */
    async _performSearch(modal, onSelectCallback, overrides = {}) {
      const tbody = modal.querySelector('#productSearchTable tbody');
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4"><i class="bi bi-hourglass-split me-2"></i>Searching...</td></tr>';

      try {
        const productIdFilter = modal.querySelector('#productIdFilter').value;
        const productDescriptionFilter = modal.querySelector('#productDescriptionFilter').value;
        const productIdOp = modal.querySelector('#productIdOperator').value;
        const productDescriptionOp = modal.querySelector('#productDescriptionOperator').value;

        const response = await ProductSearchService.searchProducts(
          {
            productId: productIdFilter,
            productDescription: productDescriptionFilter,
            productIdOperator: productIdOp,
            productDescriptionOperator: productDescriptionOp
          },
          overrides
        );

        console.log('[Product Search] Response:', response);
        
        if (!response?.success) {
          tbody.innerHTML = `<tr><td colspan="5" class="text-center text-warning py-4"><i class="bi bi-exclamation-triangle me-2"></i>${response?.message || 'No results found'}</td></tr>`;
          return;
        }

        const payload = response?.data || {};
        let products = [];

        if (Array.isArray(payload.SearchResults)) {
          products = payload.SearchResults;
        } else if (Array.isArray(payload.Details)) {
          products = payload.Details;
        } else if (Array.isArray(payload)) {
          products = payload;
        }
        
        if (!products.length) {
          tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4"><i class="bi bi-inbox me-2"></i>No results found</td></tr>';
          return;
        }
        
        tbody.innerHTML = '';
        products.forEach((product, index) => {
          const productId = product.ProductID || product.productID || '';
          const description = product.Description || product.description || product.ProductDescription || '';
          const productType = product.ProductTypeID || product.productTypeID || '';
          const currency = product.CurrencyID || product.currencyID || '';
          const tr = document.createElement('tr');
          tr.style.cursor = 'pointer';
          tr.innerHTML = `<td class="text-center fw-semibold">${index + 1}</td><td>${productId}</td><td>${description}</td><td>${productType}</td><td>${currency}</td>`;
          tr.addEventListener('click', () => {
            if (onSelectCallback) {
              onSelectCallback(productId, description);
            }
            const bsModal = window.bootstrap?.Modal.getOrCreateInstance(modal);
            bsModal?.hide();
          });
          tbody.appendChild(tr);
        });
      } catch (error) {
        console.error('[Product Search] Error:', error);
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4"><i class="bi bi-exclamation-triangle me-2"></i>Error: ${error.message || error}</td></tr>`;
      }
    }
  };

  // Expose to window
  window.ProductSearchService = ProductSearchService;

})(window);
