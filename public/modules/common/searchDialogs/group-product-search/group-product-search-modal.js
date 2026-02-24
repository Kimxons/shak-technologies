(function (global) {
  // DOM Elements
  const searchBtn = document.getElementById('group-product-search-btn');
  const loadingEl = document.getElementById('group-product-loading');
  const resultsEl = document.getElementById('group-product-results');
  const emptyEl = document.getElementById('group-product-empty');
  const criteriaEl = document.getElementById('group-product-criteria');

  let selectedRow = null;
  let selectedData = null;

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

    // Load all group products on init
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
        conditions.push(`GroupProductID='${searchProductId}'`);
      } else {
        conditions.push(`GroupProductID LIKE '%${searchProductId}%'`);
      }
    }
    if (searchProductName) {
      if (productNameOp === 'Exact') {
        conditions.push(`GroupProductName='${searchProductName}'`);
      } else {
        conditions.push(`GroupProductName LIKE '%${searchProductName}%'`);
      }
    }
    const whereStmt = conditions.length > 0 ? conditions.join(' AND ') : '';

    // Get branch ID from parent window
    let branchId = '';
    try {
      branchId = window.parent.document.getElementById('branchId')?.value || '0603';
    } catch (e) {
      branchId = '0603';
    }

    const payload = {
      TableID: 'GroupProductID',
      WhereStmt: whereStmt,
      RefID: null,
      PrevOrNext: 0,
      AdvFilterString: "BankID='00'",
      OperatorID: 'CSADM',
      ModuleID: 5060,
      OurBranchID: branchId,
      SearchKey: null,
      LanguageID: 'en'
    };

    try {
      const result = await global.LookupService.getSearchResult(payload);

      if (loadingEl) loadingEl.style.display = 'none';

      if (result.success) {
        const products = Array.isArray(result.data) ? result.data : (result.Details || []);
        renderResults(products);
      } else {
        showError(result.message || 'Search failed');
      }
    } catch (err) {
      console.error('Group Product Search Error:', err);
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
      if (emptyEl) emptyEl.style.display = 'block';
      if (resultsEl) resultsEl.style.display = 'none';
      return;
    }

    // Build table HTML
    let html = `
      <table class="results-table">
        <thead>
          <tr>
            <th>Product ID</th>
            <th>Product Name</th>
            <th>Bank ID</th>
          </tr>
        </thead>
        <tbody>
    `;

    rows.forEach((row, idx) => {
      const jsonData = JSON.stringify(row).replace(/"/g, '&quot;');
      html += `
        <tr data-row="${jsonData}" data-idx="${idx}">
          <td>${row.GroupProductID || ''}</td>
          <td>${row.Description || ''}</td>
          <td>${row.BankID || ''}</td>
        </tr>
      `;
    });

    html += '</tbody></table>';

    if (resultsEl) {
      resultsEl.innerHTML = html;
      resultsEl.style.display = 'block';

      // Attach row click handlers
      resultsEl.querySelectorAll('tbody tr').forEach(tr => {
        tr.addEventListener('click', () => selectResult(tr));
        tr.addEventListener('dblclick', () => {
          selectResult(tr);
          setSelected();
        });
      });
    }
  }

  function selectResult(tr) {
    if (selectedRow) selectedRow.classList.remove('selected');
    selectedRow = tr;
    selectedRow.classList.add('selected');
    selectedData = JSON.parse(tr.dataset.row);
  }

  function setSelected() {
    if (!selectedData) return;

    // Send message to parent
    window.parent.postMessage({
      type: 'GROUP_PRODUCT_SELECTED',
      productId: selectedData.GroupProductID || '',
      productName: selectedData.Description || '',
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
      console.warn('Could not close parent modal:', e);
    }
    // Fallback to postMessage
    window.parent?.postMessage?.({ type: 'kairo-dataentry-close' }, '*');
  }

})(window);
