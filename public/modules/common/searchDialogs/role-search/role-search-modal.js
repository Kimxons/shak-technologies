(function (global) {
  // DOM Elements
  const searchBtn = document.getElementById('role-search-btn');
  const loadingEl = document.getElementById('role-loading');
  const resultsEl = document.getElementById('role-results');
  const emptyEl = document.getElementById('role-empty');
  const criteriaEl = document.getElementById('role-criteria');

  let selectedRow = null;
  let selectedData = null;

  // Load dependencies using ServiceLoader
  (async () => {
    const { ServiceLoader } = global;
    if (!ServiceLoader) return;
    try {
      await ServiceLoader.loadCore();
      await ServiceLoader.loadCommonServices(); // Loads SearchService
      await ServiceLoader.loadScript('../../../../assets/js/auth/auth.service.js');
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

    // Load all roles on init
    executeSearch();
  }

  async function executeSearch() {
    // Show loading state
    if (loadingEl) loadingEl.style.display = 'block';
    if (resultsEl) resultsEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'none';

    // Get search values from inputs
    const roleIdInput = criteriaEl?.querySelector('[data-search-field="roleId"]');
    const roleNameInput = criteriaEl?.querySelector('[data-search-field="roleName"]');
    const roleIdMode = criteriaEl?.querySelector('[data-search-mode="roleId"]');
    const roleNameMode = criteriaEl?.querySelector('[data-search-mode="roleName"]');

    const searchRoleId = roleIdInput?.value.trim() || '';
    const searchRoleName = roleNameInput?.value.trim() || '';
    const roleIdOp = roleIdMode?.value || 'Like';
    const roleNameOp = roleNameMode?.value || 'Like';

    // Build WhereStmt based on search conditions
    const conditions = [];
    if (searchRoleId) {
      if (roleIdOp === 'Exact') {
        conditions.push(`RoleID='${searchRoleId}'`);
      } else {
        conditions.push(`RoleID LIKE '%${searchRoleId}%'`);
      }
    }
    if (searchRoleName) {
      if (roleNameOp === 'Exact') {
        conditions.push(`RoleName='${searchRoleName}'`);
      } else {
        conditions.push(`RoleName LIKE '%${searchRoleName}%'`);
      }
    }
    const whereStmt = conditions.length > 0 ? conditions.join(' AND ') : '';

    // Get Session
    let operatorId = 'CSADM';
    let branchId = '0101';
    try {
      const session = global.AuthService?.getSession?.();
      if (session) {
        operatorId = session.operatorId || operatorId;
        branchId = session.branchId || branchId;
      }
    } catch (e) { }

    const payload = {
      TableID: 'Role',
      AdvFilterString: '',
      WhereStmt: whereStmt,
      PrevOrNext: false,
      RefID: '',
      OperatorID: operatorId,
      ModuleID: 0,
      OurBranchID: branchId,
      SearchKey: '',
      LanguageID: 'ENG'
    };

    try {
      const result = await global.SearchService.searchRoles(payload);

      if (loadingEl) loadingEl.style.display = 'none';

      if (result.success) {
        renderResults(result.data);
      } else {
        showError(result.message || 'Search failed');
      }
    } catch (err) {
      console.error('Role Search Error:', err);
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

  function getAccessLevelText(accessLevel) {
    if (accessLevel >= 200) return 'High';
    if (accessLevel >= 100) return 'Medium';
    if (accessLevel > 0) return 'Low';
    return 'Unknown';
  }

  function renderResults(data) {
    const rows = Array.isArray(data) ? data : (data.Details || []);

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
            <th>Role ID</th>
            <th>Role Name</th>
            <th>Access Level</th>
          </tr>
        </thead>
        <tbody>
    `;

    rows.forEach((row, idx) => {
      const jsonData = JSON.stringify(row).replace(/"/g, '&quot;');
      html += `
        <tr data-row="${jsonData}" data-idx="${idx}">
          <td>${row.RoleID || row.RoleId || ''}</td>
          <td>${row.RoleName || row.Name || ''}</td>
          <td>${getAccessLevelText(row.AccessLevel || 0)}</td>
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
      type: 'ROLE_SELECTED',
      roleId: selectedData.RoleID || selectedData.RoleId,
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