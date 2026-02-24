(function (global) {
  // DOM Elements
  const searchBtn = document.getElementById('bankbranch-search-btn');
  const loadingEl = document.getElementById('bankbranch-loading');
  const resultsEl = document.getElementById('bankbranch-results');
  const emptyEl = document.getElementById('bankbranch-empty');
  const criteriaEl = document.getElementById('bankbranch-criteria');

  let selectedRow = null;
  let selectedData = null;

  // Get bank ID from URL parameters or parent window
  const urlParams = new URLSearchParams(window.location.search);
  let bankId = urlParams.get('bankId') || '';

  // Load dependencies using ServiceLoader
  (async () => {
    const { ServiceLoader } = global;
    if (!ServiceLoader) return;
    try {
      await ServiceLoader.loadCore();
      await ServiceLoader.loadScript('../../../../assets/js/services/microfinance/groupService.js');
      init();
    } catch (err) {
      console.error('Error loading services:', err);
    }
  })();

  function init() {
    // Get bankId from parent if not in URL
    getBankIdFromParent();

    // Search button click
    if (searchBtn) {
      searchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        executeSearch();
      });
    }

    // Enter key to search
    if (criteriaEl) {
      criteriaEl.querySelectorAll('input:not([readonly])').forEach(input => {
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            executeSearch();
          }
        });
      });
    }

    // Load all branches on init if we have a bankId
    if (bankId) {
      executeSearch();
    }
  }

  function getBankIdFromParent() {
    if (bankId) return; // Already have it from URL
    
    try {
      if (window.parent && window.parent !== window) {
        const parentDoc = window.parent.document;
        const bankIdInput = parentDoc.getElementById('BankId') || parentDoc.getElementById('bankId');
        if (bankIdInput && bankIdInput.value) {
          bankId = bankIdInput.value.trim();
          // Display in the readonly field
          const bankIdField = criteriaEl?.querySelector('[data-search-field="bankId"]');
          if (bankIdField) {
            bankIdField.value = bankId;
          }
        }
      }
    } catch (error) {
      console.warn('[Bank Branch Search] Could not get bank ID from parent:', error);
    }
  }

  async function executeSearch() {
    if (!bankId) {
      if (emptyEl) {
        emptyEl.textContent = 'Bank ID is required. Please select a bank first.';
        emptyEl.style.display = 'block';
      }
      return;
    }

    // Show loading state
    if (loadingEl) loadingEl.style.display = 'block';
    if (resultsEl) resultsEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'none';

    // Get search values from inputs
    const branchIdInput = criteriaEl?.querySelector('[data-search-field="branchId"]');
    const branchNameInput = criteriaEl?.querySelector('[data-search-field="branchName"]');
    const branchIdMode = criteriaEl?.querySelector('[data-search-mode="branchId"]');
    const branchNameMode = criteriaEl?.querySelector('[data-search-mode="branchName"]');

    const searchBranchId = branchIdInput?.value.trim() || '';
    const searchBranchName = branchNameInput?.value.trim() || '';
    const branchIdOp = branchIdMode?.value || 'Like';
    const branchNameOp = branchNameMode?.value || 'Like';

    const payload = {
      BankID: bankId
    };

    try {
      const result = await global.GroupService.getBankBranches(payload);

      if (loadingEl) loadingEl.style.display = 'none';

      if (result.success) {
        // Extract branches from response
        let branches = Array.isArray(result.data) ? result.data : (result.Details || []);

        // Filter results by branch ID if provided
        if (searchBranchId) {
          const lowerSearchId = searchBranchId.toLowerCase();
          if (branchIdOp === 'Exact') {
            branches = branches.filter(b => (b.BranchID || '').toLowerCase() === lowerSearchId);
          } else {
            branches = branches.filter(b => (b.BranchID || '').toLowerCase().includes(lowerSearchId));
          }
        }

        // Filter results by branch name if provided
        if (searchBranchName) {
          const lowerSearchName = searchBranchName.toLowerCase();
          if (branchNameOp === 'Exact') {
            branches = branches.filter(b => (b.BranchName || '').toLowerCase() === lowerSearchName);
          } else {
            branches = branches.filter(b => (b.BranchName || '').toLowerCase().includes(lowerSearchName));
          }
        }

        renderResults(branches);
      } else {
        if (emptyEl) {
          emptyEl.textContent = result.message || 'Search failed';
          emptyEl.style.display = 'block';
        }
      }
    } catch (err) {
      console.error('Bank Branch Search Error:', err);
      if (loadingEl) loadingEl.style.display = 'none';
      if (emptyEl) {
        emptyEl.textContent = 'Error occurred during search';
        emptyEl.style.display = 'block';
      }
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
            <th>Branch ID</th>
            <th>Branch Name</th>
            <th>Swift Code</th>
            <th>Address</th>
          </tr>
        </thead>
        <tbody>
    `;

    rows.forEach((row, idx) => {
      const jsonData = JSON.stringify(row).replace(/"/g, '&quot;');
      html += `
        <tr data-row="${jsonData}" data-idx="${idx}">
          <td>${row.BranchID || ''}</td>
          <td>${row.BranchName || ''}</td>
          <td>${row.SwiftCode || ''}</td>
          <td>${row.Address || ''}</td>
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
      type: 'BANK_BRANCH_SELECTED',
      branchId: selectedData.BranchID || '',
      branchName: selectedData.BranchName || '',
      swiftCode: selectedData.SwiftCode || '',
      address: selectedData.Address || '',
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
