(function (global) {
  // DOM Elements
  const searchBtn = document.getElementById('product-search-btn');
  const loadingEl = document.getElementById('product-loading');
  const resultsEl = document.getElementById('product-results');
  const emptyEl = document.getElementById('product-empty');
  const criteriaEl = document.getElementById('product-criteria');

  let selectedRow = null;
  let selectedData = null;
  
  // Get URL parameters for dynamic filtering
  // This allows different modules to pass different AdvFilterStrings
  const urlParams = new URLSearchParams(window.location.search);
  const advFilterParam = urlParams.get('advFilter') || '';
  const moduleIdParam = urlParams.get('moduleId') || '5010';

  // Load dependencies using ServiceLoader
  (async () => {
    const { ServiceLoader } = global;
    if (!ServiceLoader) return;
    try {
      await ServiceLoader.loadCore();
      await ServiceLoader.loadScript('../../../../assets/js/services/shared/lookupService.js');
      init();
    } catch (err) {
      console.error('Error loading services:', err);
    }
  })();

  function init() {
    // Search button click
    if (searchBtn) {
      searchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        executeSearch();
      });
    }

    // Enter key to search
    if (criteriaEl) {
      criteriaEl.querySelectorAll('input').forEach(input => {
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            executeSearch();
          }
        });
      });
    }

    // Load all products on init
    executeSearch();
  }

  async function executeSearch() {
    // Show loading state
    if (loadingEl) loadingEl.style.display = 'block';
    if (resultsEl) resultsEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'none';

    // Get search values from inputs
    const productIdInput = criteriaEl?.querySelector('[data-search-field="productId"]');
    const productNameInput = criteriaEl?.querySelector('[data-search-field="productName"]');
    const productIdMode = criteriaEl?.querySelector('[data-search-mode="productId"]');
    const productNameMode = criteriaEl?.querySelector('[data-search-mode="productName"]');

    const searchProductId = productIdInput?.value.trim() || '';
    const searchProductName = productNameInput?.value.trim() || '';
    const productIdOp = productIdMode?.value || 'Like';
    const productNameOp = productNameMode?.value || 'Like';

    // Build WhereStmt based on search conditions
    const conditions = [];
    if (searchProductId) {
      if (productIdOp === 'Exact') {
        conditions.push(`ProductID='${searchProductId}'`);
      } else {
        conditions.push(`ProductID LIKE '%${searchProductId}%'`);
      }
    }
    if (searchProductName) {
      if (productNameOp === 'Exact') {
        conditions.push(`Description='${searchProductName}'`);
      } else {
        conditions.push(`Description LIKE '%${searchProductName}%'`);
      }
    }
    const whereStmt = conditions.length > 0 ? conditions.join(' AND ') : '';

    // Get branch ID from parent window or use default
    let branchId = '0603';
    try {
      branchId = window.parent.document.getElementById('branchId')?.value || 
                 window.parent.Environment?.branchID || 
                 window.parent.sessionStorage?.getItem('BranchID') || '0603';
    } catch (e) {
      branchId = '0603';
    }

    // Use the advFilter from URL parameter or default
    // This allows different modules to pass different ProductTypeIDs
    const advFilterString = advFilterParam || "ProductTypeID='SB'";

    // Payload based on the stored procedure:
    // exec p_GetSearchResult @WhereStmt=N'',@TableID=N'ProductID',@RefID=NULL,@PrevOrNext=0,
    // @AdvFilterString=N'ProductTypeID=''SB''',@OperatorID=N'CSADM',
    // @ModuleID=5010,@OurBranchID=N'0603',@SearchKey=NULL,@LanguageID='en'
    const payload = {
      TableID: 'ProductID',
      WhereStmt: whereStmt,
      RefID: null,
      PrevOrNext: 0,
      AdvFilterString: advFilterString,
      OperatorID: 'CSADM',
      ModuleID: parseInt(moduleIdParam) || 5010,
      OurBranchID: branchId,
      SearchKey: null,
      LanguageID: 'en'
    };

    console.log('[ProductSearch] Payload:', payload);

    try {
      const result = await global.LookupService.getSearchResult(payload);

      console.log('[ProductSearch] Result:', result);

      if (loadingEl) loadingEl.style.display = 'none';

      if (result.success) {
        const products = Array.isArray(result.data) ? result.data : (result.Details || []);
        renderResults(products);
      } else {
        showError(result.message || 'Search failed');
      }
    } catch (err) {
      console.error('[ProductSearch] Error:', err);
      showError('Error occurred during search');
    }
  }

  function showError(msg) {
    if (loadingEl) loadingEl.style.display = 'none';
    if (resultsEl) resultsEl.style.display = 'none';
    if (emptyEl) {
      emptyEl.textContent = msg;
      emptyEl.style.display = 'block';
    }
  }

  function renderResults(data) {
    const rows = Array.isArray(data) ? data : [];

    if (rows.length === 0) {
      if (emptyEl) {
        emptyEl.textContent = 'No products found matching the criteria.';
        emptyEl.style.display = 'block';
      }
      if (resultsEl) resultsEl.style.display = 'none';
      return;
    }

    // Build table HTML
    let html = `
      <table class="results-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Product ID</th>
            <th>Product Name</th>
            <th>Product Type</th>
            <th>Currency</th>
          </tr>
        </thead>
        <tbody>
    `;

    rows.forEach((row, idx) => {
      const jsonData = JSON.stringify(row).replace(/"/g, '&quot;');
      const rowColor = idx % 2 === 0 ? '#ffffff' : '#e8f4ff';
      html += `
        <tr data-row="${jsonData}" data-idx="${idx}" style="background: ${rowColor}; cursor: pointer;">
          <td class="num-col">${idx + 1}</td>
          <td>${row.ProductID || ''}</td>
          <td>${row.Description || row.ProductName || ''}</td>
          <td>${row.ProductTypeID || ''}</td>
          <td>${row.CurrencyID || ''}</td>
        </tr>
      `;
    });

    html += '</tbody></table>';

    if (resultsEl) {
      resultsEl.innerHTML = html;
      resultsEl.style.display = 'block';

      // Attach row click handlers
      resultsEl.querySelectorAll('tbody tr').forEach(tr => {
        const baseBg = tr.style.background;
        tr.dataset.baseBg = baseBg;

        tr.addEventListener('mouseover', () => {
          if (!tr.classList.contains('selected')) {
            tr.style.background = '#d0e8ff';
          }
        });

        tr.addEventListener('mouseout', () => {
          if (!tr.classList.contains('selected')) {
            tr.style.background = tr.dataset.baseBg;
          }
        });

        tr.addEventListener('click', () => selectResult(tr));
        tr.addEventListener('dblclick', () => {
          selectResult(tr);
          setSelected();
        });
      });
    }
  }

  function selectResult(tr) {
    // Remove selection from previous row
    if (selectedRow) {
      selectedRow.classList.remove('selected');
      selectedRow.style.background = selectedRow.dataset.baseBg;
    }
    
    selectedRow = tr;
    selectedRow.classList.add('selected');
    selectedRow.style.background = '#bfe0ff';
    selectedData = JSON.parse(tr.dataset.row);
  }

  function setSelected() {
    if (!selectedData) return;

    // Send message to parent with product data
    window.parent.postMessage({
      type: 'PRODUCT_SELECTED',
      productId: selectedData.ProductID || '',
      productName: selectedData.Description || selectedData.ProductName || '',
      productTypeId: selectedData.ProductTypeID || '',
      currencyId: selectedData.CurrencyID || '',
      bankId: selectedData.BankID || '',
      data: selectedData
    }, '*');

    // Close the modal
    close();
  }

  function close() {
    try {
      // Try to close the Bootstrap modal in the parent
      const parentModal = window.parent.document.getElementById('searchModal');
      if (parentModal) {
        const bsModal = window.parent.bootstrap?.Modal?.getInstance(parentModal);
        if (bsModal) {
          bsModal.hide();
          return;
        }
        // Fallback: click close button
        const closeBtn = parentModal.querySelector('[data-bs-dismiss="modal"]');
        if (closeBtn) {
          closeBtn.click();
          return;
        }
      }
    } catch (e) {
      console.warn('[ProductSearch] Could not close parent modal:', e);
    }
    // Fallback to postMessage
    window.parent?.postMessage?.({ type: 'kairo-dataentry-close' }, '*');
  }

})(window);
