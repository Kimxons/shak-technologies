document.addEventListener("DOMContentLoaded", () => {
  // ===== Nicer popups (replace alert/confirm) =====
  const smMsgModalEl = document.getElementById('smMessageModal');
  const smMsgTitleEl = document.getElementById('smMessageModalLabel');
  const smMsgBodyEl = document.getElementById('smMessageModalBody');
  const smMsgOkBtn = smMsgModalEl?.querySelector('[data-sm-message-ok]');
  const smMsgCancelBtn = smMsgModalEl?.querySelector('[data-sm-message-cancel]');

  const toUiText = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (value instanceof Error) return value.message || String(value);
    if (typeof value === 'object') {
      const preferred =
        value.message ||
        value.Message ||
        value.error ||
        value.Error ||
        value.details ||
        value.Details;
      if (typeof preferred === 'string') return preferred;
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    }
    return String(value);
  };

  const normalizeUiOptions = (titleOrOptions, defaults) => {
    if (typeof titleOrOptions === 'string') return { ...defaults, title: titleOrOptions };
    if (titleOrOptions && typeof titleOrOptions === 'object') return { ...defaults, ...titleOrOptions };
    return { ...defaults };
  };

  const applyOkButtonVariant = () => {
    // Keep buttons aligned to the page theme (primary blue).
    if (!smMsgOkBtn) return;
    const variants = ['btn-primary', 'btn-success', 'btn-warning', 'btn-danger', 'btn-info'];
    variants.forEach((v) => smMsgOkBtn.classList.remove(v));
    smMsgOkBtn.classList.add('btn-primary');
  };

  const showMessageModal = ({ title, message, confirmMode, okText, cancelText, variant }) => {
    const safeTitle = toUiText(title) || (confirmMode ? 'Confirm' : 'Message');
    const safeMessage = toUiText(message);
    const safeOkText = toUiText(okText) || (confirmMode ? 'Yes' : 'OK');
    const safeCancelText = toUiText(cancelText) || 'Cancel';
    const safeVariant = variant || (confirmMode ? 'warning' : 'info');

    // Fallback if Bootstrap/modal markup isn't available.
    if (!smMsgModalEl || !window.bootstrap?.Modal) {
      if (confirmMode) return Promise.resolve(window.confirm(safeMessage));
      window.alert(safeMessage);
      return Promise.resolve(true);
    }

    smMsgModalEl.setAttribute('data-sm-variant', safeVariant);
    applyOkButtonVariant();

    if (smMsgTitleEl) smMsgTitleEl.textContent = safeTitle;
    if (smMsgBodyEl) smMsgBodyEl.textContent = safeMessage;
    if (smMsgCancelBtn) {
      smMsgCancelBtn.hidden = !confirmMode;
      smMsgCancelBtn.textContent = safeCancelText;
    }
    if (smMsgOkBtn) smMsgOkBtn.textContent = safeOkText;

    const modal = window.bootstrap.Modal.getOrCreateInstance(smMsgModalEl, { backdrop: 'static', keyboard: true });

    return new Promise((resolve) => {
      let resolved = false;

      const cleanup = () => {
        smMsgOkBtn?.removeEventListener('click', onOk);
        smMsgCancelBtn?.removeEventListener('click', onCancel);
        smMsgModalEl.removeEventListener('hidden.bs.modal', onHidden);
      };

      const finish = (value) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve(value);
      };

      const onOk = () => {
        modal.hide();
        finish(true);
      };
      const onCancel = () => {
        modal.hide();
        finish(false);
      };
      const onHidden = () => {
        // If user closes via X/ESC, treat as cancel for confirm, ok for alert.
        finish(confirmMode ? false : true);
      };

      smMsgOkBtn?.addEventListener('click', onOk);
      smMsgCancelBtn?.addEventListener('click', onCancel);
      smMsgModalEl.addEventListener('hidden.bs.modal', onHidden);
      modal.show();
    });
  };

  const uiAlert = (message, titleOrOptions) => {
    const opts = normalizeUiOptions(titleOrOptions, { title: 'Message', okText: 'OK', variant: 'info' });
    return showMessageModal({
      title: opts.title,
      message,
      confirmMode: false,
      okText: opts.okText,
      variant: opts.variant
    });
  };

  const uiConfirm = (message, titleOrOptions) => {
    const opts = normalizeUiOptions(titleOrOptions, {
      title: 'Confirm',
      okText: 'Yes',
      cancelText: 'No',
      variant: 'warning'
    });
    return showMessageModal({
      title: opts.title,
      message,
      confirmMode: true,
      okText: opts.okText,
      cancelText: opts.cancelText,
      variant: opts.variant
    });
  };

  // =========================================================================
  // CHILD FORMS - Account Maintenance Pattern
  // =========================================================================
  const CHILD_FORMS = {
    'coupon-schedule': '../data-entry/security-maintenance-coupon-schedule.html'
  };

  // Forms that require a loaded security before navigation
  const SECURITY_REQUIRED_FORMS = ['coupon-schedule'];

  // Helper to get overlay elements
  function getOverlayEls() {
    return {
      overlay: document.querySelector('[data-child-inline]'),
      iframe: document.querySelector('[data-child-iframe]'),
      mainForm: document.querySelector('[data-main-form]'),
      mainContainer: document.querySelector('.main-container')
    };
  }

  // Toggle child overlay visibility with animations
  function setOverlayOpen(isOpen) {
    const { overlay, mainForm, mainContainer } = getOverlayEls();
    if (!overlay || !mainContainer) return;

    if (isOpen) {
      mainContainer.classList.add('child-opening');
      overlay.hidden = false;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          mainContainer.classList.add('child-open');
          overlay.classList.add('is-visible');
          overlay.classList.remove('is-closing');

          setTimeout(() => {
            mainContainer.classList.remove('child-opening');
          }, 350);
        });
      });
    } else {
      mainContainer.classList.remove('child-opening');
      overlay.classList.add('is-closing');
      overlay.classList.remove('is-visible');

      setTimeout(() => {
        mainContainer.classList.remove('child-open');
        overlay.hidden = true;
        overlay.classList.remove('is-closing');
      }, 350);
    }
  }

  // Open a child form in the inline overlay
  function openChildForm(childKey) {
    const path = CHILD_FORMS[childKey];
    const { iframe } = getOverlayEls();
    if (!path || !iframe) return;

    // Check if this form requires a loaded security
    if (SECURITY_REQUIRED_FORMS.includes(childKey)) {
      const issueNo = document.getElementById('IssueNo')?.value?.trim();
      if (!issueNo) {
        uiAlert('Please load a security before accessing this feature.', {
          title: 'Security Required',
          variant: 'warning'
        });
        return;
      }
    }

    // Show loading state and load the iframe
    iframe.onload = function () {
      // Theme vars can be applied here if needed
    };
    const cacheBust = `v=${Date.now()}`;
    const separator = path.includes('?') ? '&' : '?';
    iframe.src = `${path}${separator}${cacheBust}`;
    setOverlayOpen(true);
  }

  // Close child form
  function closeChildForm() {
    const { iframe } = getOverlayEls();
    if (iframe) iframe.src = 'about:blank';
    setOverlayOpen(false);
  }

  // Expose closeChildForm globally for child forms to call
  window.closeChildForm = closeChildForm;

  // =========================================================================
  // SIDEBAR NAV SECTIONS (accordion behavior)
  // =========================================================================
  const setSectionOpen = (section, open) => {
    if (!section) return;
    const items = section.querySelector('.nav-items, .nav-items--card');
    const arrow = section.querySelector('.nav-arrow, .nav-arrow--card');
    const arrowIcon = arrow?.querySelector('i');

    if (open) {
      section.classList.add('is-open');
      if (items) items.hidden = false;
      if (arrow) arrow.setAttribute('aria-expanded', 'true');
      if (arrowIcon) {
        arrowIcon.classList.remove('bi-chevron-down');
        arrowIcon.classList.add('bi-chevron-up');
      }
    } else {
      section.classList.remove('is-open');
      if (items) items.hidden = true;
      if (arrow) arrow.setAttribute('aria-expanded', 'false');
      if (arrowIcon) {
        arrowIcon.classList.remove('bi-chevron-up');
        arrowIcon.classList.add('bi-chevron-down');
      }
    }
  };

  const wireNavSections = () => {
    const sections = Array.from(document.querySelectorAll('[data-nav-section]'));
    if (!sections.length) return;

    sections.forEach(section => {
      const header = section.querySelector('.nav-header, .nav-header--card');
      if (!header) return;

      header.addEventListener('click', function (e) {
        // Don't toggle if clicking on the badge number
        if (e.target.closest('.nav-badge')) return;

        const sidebar = document.getElementById('main-sidebar');
        const mainContainer = document.querySelector('.main-container');
        const toggle = document.getElementById('sidebarToggle');
        const isCollapsed = sidebar && sidebar.classList.contains('collapsed');

        // If sidebar is collapsed, expand it first and open this section
        if (isCollapsed) {
          sidebar.classList.remove('collapsed');
          if (mainContainer) mainContainer.classList.remove('sidebar-collapsed');
          if (toggle) toggle.setAttribute('aria-expanded', 'true');

          // Close all sections first, then open the clicked one
          sections.forEach(s => setSectionOpen(s, false));
          setSectionOpen(section, true);
          section.classList.add('expanded');
          return;
        }

        const willOpen = !section.classList.contains('is-open');

        // behave like a dropdown: opening one closes the other
        sections.forEach(s => setSectionOpen(s, false));
        setSectionOpen(section, willOpen);

        // Add expanded class for CSS styling
        if (willOpen) {
          section.classList.add('expanded');
        } else {
          section.classList.remove('expanded');
        }
      });
    });

    // ensure initial state is consistent with markup
    sections.forEach(section => {
      const initiallyOpen = section.classList.contains('is-open');
      setSectionOpen(section, initiallyOpen);
    });
  };

  // =========================================================================
  // SIDEBAR TOGGLE (expand/collapse sidebar)
  // =========================================================================
  const wireSidebarToggle = () => {
    const sidebar = document.getElementById('main-sidebar');
    const toggle = document.getElementById('sidebarToggle');
    const mainContainer = document.querySelector('.main-container');
    if (!sidebar || !toggle) return;

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      e.preventDefault();
      const isCollapsed = sidebar.classList.contains('collapsed');

      if (isCollapsed) {
        // Expanding
        sidebar.classList.remove('collapsed');
        if (mainContainer) mainContainer.classList.remove('sidebar-collapsed');
        toggle.setAttribute('aria-expanded', 'true');
        // Restore nav-items visibility based on section state
        document.querySelectorAll('.nav-section--card').forEach(section => {
          const items = section.querySelector('.nav-items--card');
          if (items) {
            const isSectionOpen = section.classList.contains('is-open');
            items.hidden = !isSectionOpen;
          }
        });
      } else {
        // Collapsing
        sidebar.classList.add('collapsed');
        if (mainContainer) mainContainer.classList.add('sidebar-collapsed');
        toggle.setAttribute('aria-expanded', 'false');
        // Show all nav-items when collapsed (for icon display)
        document.querySelectorAll('.nav-items--card').forEach(items => {
          items.hidden = false;
        });
      }
    });
  };

  // =========================================================================
  // COLLAPSIBLE FORM SECTIONS
  // =========================================================================
  const wireCollapsibleSections = () => {
    document.querySelectorAll('.form-section[data-section]').forEach(section => {
      const header = section.querySelector('[data-section-toggle]');
      const content = section.querySelector('[data-section-content]');
      const toggleBtn = section.querySelector('.section-toggle-btn');

      if (!header || !content) return;

      header.addEventListener('click', function (e) {
        // Don't toggle if clicking on a button (except the toggle button itself)
        if (e.target.closest('button') && !e.target.closest('.section-toggle-btn')) return;
        // Don't toggle if clicking on a checkbox or its label
        if (e.target.closest('input[type="checkbox"]') || e.target.closest('label[for]')) return;

        const isCollapsed = section.classList.contains('collapsed');

        if (isCollapsed) {
          // Expand
          section.classList.remove('collapsed');
          if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
        } else {
          // Collapse
          section.classList.add('collapsed');
          if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
        }
      });
    });
  };

  // =========================================================================
  // SUBMODULE SEARCH
  // =========================================================================
  const wireSubmoduleSearch = () => {
    const searchInput = document.getElementById('submoduleSearch');
    const clearBtn = document.getElementById('submoduleSearchClear');
    if (!searchInput) return;

    const allItems = Array.from(document.querySelectorAll('.sidebar-item, .sidebar-item--enhanced'));
    const allSections = Array.from(document.querySelectorAll('[data-nav-section]'));

    const performSearch = () => {
      const query = searchInput.value.trim().toLowerCase();
      if (clearBtn) clearBtn.hidden = !query;

      if (!query) {
        // Reset: show all items, collapse all sections
        allItems.forEach(item => item.style.display = '');
        allSections.forEach(section => setSectionOpen(section, false));
        return;
      }

      // Filter items
      allItems.forEach(item => {
        const text = (item.textContent || '').toLowerCase();
        item.style.display = text.includes(query) ? '' : 'none';
      });

      // Expand sections that have visible items
      allSections.forEach(section => {
        const visibleItems = section.querySelectorAll('.sidebar-item:not([style*="display: none"]), .sidebar-item--enhanced:not([style*="display: none"])');
        setSectionOpen(section, visibleItems.length > 0);
      });
    };

    searchInput.addEventListener('input', performSearch);
    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        performSearch();
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        performSearch();
        searchInput.focus();
      });
    }
  };

  // Wire up sidebar and collapsible sections
  wireNavSections();
  wireSidebarToggle();
  wireCollapsibleSections();
  wireSubmoduleSearch();

  // Wire sidebar items with data-child-form (Account Maintenance pattern)
  document.querySelectorAll('.sidebar-item[data-child-form], .sidebar-item--enhanced[data-child-form]').forEach(item => {
    item.addEventListener('click', function (e) {
      e.stopPropagation();

      const sidebar = document.getElementById('main-sidebar');
      const mainContainer = document.querySelector('.main-container');
      const toggle = document.getElementById('sidebarToggle');
      const isCollapsed = sidebar && sidebar.classList.contains('collapsed');

      // If sidebar is collapsed, expand it first
      if (isCollapsed) {
        sidebar.classList.remove('collapsed');
        if (mainContainer) mainContainer.classList.remove('sidebar-collapsed');
        if (toggle) toggle.setAttribute('aria-expanded', 'true');
      }

      // Set active state
      document.querySelectorAll('.sidebar-item[data-child-form], .sidebar-item--enhanced[data-child-form]').forEach(i => i.classList.remove('active'));
      this.classList.add('active');

      const childKey = this.getAttribute('data-child-form');
      if (childKey) openChildForm(childKey);
    });
  });

  // Allow the iframe (child screens) to request close via postMessage
  window.addEventListener('message', (event) => {
    const data = event && event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'securityMaintenanceChildClose') {
      closeChildForm();
    }
  });

  // Close child form on Escape key
  document.addEventListener('keydown', (e) => {
    const { overlay } = getOverlayEls();
    if (e.key === 'Escape' && overlay && !overlay.hidden) {
      closeChildForm();
    }
  });

  // View binding (Security Master Custom)
  const form = document.getElementById("security-maintenance-form");
  const viewBtn = document.querySelector('[data-sm-action="view"]');
  const addBtn = document.querySelector('[data-sm-action="add"]');
  const editBtn = document.querySelector('[data-sm-action="edit"]');
  const deleteBtn = document.querySelector('[data-sm-action="delete"]');
  const saveBtn = document.querySelector('[data-sm-action="save"]');
  const cancelBtn = document.querySelector('[data-sm-action="cancel"]');
  const issueSearchBtn = document.querySelector('[data-sm-action="searchIssue"]');
  const currencySearchBtn = document.querySelector('[data-sm-action="searchCurrency"]');
  
  if (!form || !viewBtn) return;

  // ===== IssueNo Search (Modal) =====
  const sqlEscape = (value) => String(value ?? '').replace(/'/g, "''");

  const extractSearchRows = (response) => {
    if (!response) return [];
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.Details)) return response.Details;
    if (Array.isArray(response?.data?.Details)) return response.data.Details;
    if (Array.isArray(response?.data?.Details01)) return response.data.Details01;
    if (Array.isArray(response?.Details01)) return response.Details01;
    return [];
  };

  const resolveOperatorId = () => {
    const session = getSession();
    return session?.operatorID || session?.OperatorID || session?.operatorId || 'JOY_WANJA';
  };

  const resolveOurBranchIdForSearch = () => {
    // Match user-provided exec defaults.
    const fromModal = String(document.getElementById('smSearchOurBranchId')?.value || '').trim();
    return fromModal || '1201';
  };

  const buildIssueWhereStmt = () => {
    const issueOp = document.getElementById('smSearchIssueNumberOp')?.value || 'LIKE';
    const issueVal = String(document.getElementById('smSearchIssueNumber')?.value || '').trim();

    const brOp = document.getElementById('smSearchOurBranchIdOp')?.value || '=';
    const brVal = String(document.getElementById('smSearchOurBranchId')?.value || '').trim();

    const clauses = [];

    if (issueVal) {
      const escaped = sqlEscape(issueVal);
      clauses.push(issueOp === 'LIKE' ? `IssueNumber LIKE '%${escaped}%'` : `IssueNumber = '${escaped}'`);
    }

    if (brVal) {
      const escaped = sqlEscape(brVal);
      clauses.push(brOp === 'LIKE' ? `OurBranchID LIKE '%${escaped}%'` : `OurBranchID = '${escaped}'`);
    }

    return clauses.join(' AND ');
  };

  const renderIssueSearchRows = (rows) => {
    const table = document.getElementById('smIssueSearchTable');
    const tbody = table?.querySelector('tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (!Array.isArray(rows) || rows.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="4" class="text-muted">No results found.</td>';
      tbody.appendChild(tr);
      return;
    }

    rows.forEach((row, idx) => {
      const issueNumber = row.IssueNumber ?? row.SecurityNo ?? row.SecurityNumber ?? row.Code ?? row.ID ?? '';
      const tenderDate = row.TenderDate ?? row.ValueDate ?? row.DealDate ?? '';
      const ourBranchId = row.OurBranchID ?? row.OurBranchId ?? row.BranchID ?? '';
      const securityType = row.SecurityType ?? row.SecurityTypeName ?? row.SecurityCategory ?? row.Module ?? row.ModuleID ?? '';

      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';
      tr.innerHTML = `
        <td>${ourBranchId ?? ''}</td>
        <td>${issueNumber ?? ''}</td>
        <td>${tenderDate ?? ''}</td>
        <td>${securityType ?? ''}</td>
      `;

      tr.addEventListener('click', () => {
        const issueNoField = document.getElementById('IssueNo');
        if (issueNoField) issueNoField.value = String(issueNumber ?? '').trim();

        const modalEl = document.getElementById('smIssueSearchModal');
        const modal = modalEl ? window.bootstrap?.Modal.getInstance(modalEl) : null;
        modal?.hide();

        // Auto-load the record
        viewBtn?.click();
      });

      tbody.appendChild(tr);
    });
  };

  const runIssueSearch = async () => {
    const table = document.getElementById('smIssueSearchTable');
    const tbody = table?.querySelector('tbody');
    if (!tbody) return;

    if (!window.ServiceLoader?.loadSearchService) {
      console.error('[SecurityMaintenance] ServiceLoader.loadSearchService is not available.');
      return;
    }

    tbody.innerHTML = '<tr><td colspan="4" class="text-muted">Searching...</td></tr>';
    await window.ServiceLoader.loadSearchService();

    if (!window.SearchService?.searchDeals) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-danger">Search service unavailable</td></tr>';
      return;
    }

    const operatorId = resolveOperatorId();
    const ourBranchId = resolveOurBranchIdForSearch();
    const whereStmt = buildIssueWhereStmt();

    // Match the user-provided exec:
    // exec p_GetSearchResult @WhereStmt=N'', @TableID=N'SecurityNo', @RefID=NULL, @PrevOrNext=0,
    // @AdvFilterString=N'OurBranchID=''1201''', @ModuleID=9909, @OurBranchID=N'1201', @SearchKey=NULL, @LanguageID='en'
    const requestData = {
      TableID: 'SecurityNo',
      AdvFilterString: `OurBranchID='${sqlEscape(ourBranchId)}'`,
      WhereStmt: whereStmt || '',
      PrevOrNext: 0,
      RefID: null,
      OperatorID: operatorId,
      ModuleID: 9909,
      OurBranchID: ourBranchId,
      SearchKey: null,
      LanguageID: 'en'
    };

    try {
      const response = await window.SearchService.searchDeals(requestData);
      console.log('[SecurityMaintenance] SecurityNo search response:', response);

      if (!response?.success) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-danger">Search failed. Check console.</td></tr>';
        return;
      }

      const rows = extractSearchRows(response);
      renderIssueSearchRows(rows);
    } catch (error) {
      console.error('[SecurityMaintenance] SecurityNo search failed:', error);
      tbody.innerHTML = `<tr><td colspan="4" class="text-danger">Error: ${error.message || error}</td></tr>`;
    }
  };

  const openIssueSearchModal = async () => {
    const modalEl = document.getElementById('smIssueSearchModal');
    if (!modalEl || !window.bootstrap?.Modal) {
      console.warn('[SecurityMaintenance] smIssueSearchModal/bootstrap not available.');
      return;
    }

    const issueInput = document.getElementById('smSearchIssueNumber');
    const mainIssueNo = String(document.getElementById('IssueNo')?.value || '').trim();
    if (issueInput && mainIssueNo && !String(issueInput.value || '').trim()) {
      issueInput.value = mainIssueNo;
    }

    const branchInput = document.getElementById('smSearchOurBranchId');
    if (branchInput && !String(branchInput.value || '').trim()) {
      branchInput.value = '1201';
    }

    const modal = window.bootstrap.Modal.getOrCreateInstance(modalEl, { backdrop: 'static' });
    modal.show();

    // Auto-search on open
    await runIssueSearch();
  };

  issueSearchBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    openIssueSearchModal();
  });

  document.getElementById('smIssueSearchRun')?.addEventListener('click', (e) => {
    e.preventDefault();
    runIssueSearch();
  });

  // ===== Currency Search (Modal) =====
  const pad2 = (n) => String(n).padStart(2, '0');
  const getRequestTimeMmdd = () => {
    const d = new Date();
    const mm = pad2(d.getMonth() + 1);
    const dd = pad2(d.getDate());
    const yyyy = d.getFullYear();
    const HH = pad2(d.getHours());
    const MM = pad2(d.getMinutes());
    const SS = pad2(d.getSeconds());
    return `${mm}/${dd}/${yyyy} ${HH}:${MM}:${SS}`;
  };

  const makeEnvelope = (formId, requestData = {}) => {
    const CONFIG = window.CoreBankingConfig || {};
    const Environment = window.Environment || {};
    return {
      RequestID: formId,
      FormId: formId,
      FormID: formId,
      RequestData: requestData,
      RequestTime: getRequestTimeMmdd(),
      AppName: Environment.appName || CONFIG.appName || 'PROJECT_KAIRO',
      Checksum: ''
    };
  };

  const getOldApiEndpoint = () => {
    const Environment = window.Environment || {};
    const base = (Environment.baseUrlCommon || Environment.baseUrlSystemCodes || 'http://localhost:5059').replace(/\/+$/, '');
    return `${base}/api/OldAPI`;
  };

  const normalizeCurrencyRows = (response) => {
    if (!response) return [];
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.Details)) return response.Details;
    if (Array.isArray(response?.data?.Details)) return response.data.Details;
    if (Array.isArray(response?.data?.Details01)) return response.data.Details01;
    return [];
  };

  let smAllCurrencies = [];

  const renderCurrencies = (rows) => {
    const table = document.getElementById('smCurrencySearchTable');
    const tbody = table?.querySelector('tbody');
    if (!tbody) return;

    const filterText = String(document.getElementById('smCurrencyFilter')?.value || '').trim().toLowerCase();
    const filtered = !filterText
      ? rows
      : rows.filter((r) => {
          const hay = [
            r.CurrencyID,
            r.CurrencyId,
            r.CurrencyCode,
            r.Code,
            r.CurrencyName,
            r.Description,
            r.Country,
            r.NumericCode,
            r.ISOCode
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return hay.includes(filterText);
        });

    tbody.innerHTML = '';
    if (!Array.isArray(filtered) || filtered.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="2" class="text-muted">No results found.</td>';
      tbody.appendChild(tr);
      return;
    }

    filtered.forEach((row, idx) => {
      const currencyId = row.CurrencyID ?? row.CurrencyId ?? row.CurrencyCode ?? row.Code ?? row.ID ?? '';
      const currencyName = row.CurrencyName ?? row.Description ?? row.Name ?? '';

      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';
      tr.innerHTML = `
        <td>${currencyId ?? ''}</td>
        <td>${currencyName ?? ''}</td>
      `;

      tr.addEventListener('click', () => {
        const currencyField = document.getElementById('CurrencyId');
        if (currencyField) currencyField.value = String(currencyId ?? '').trim();

        const currencyNameField = document.getElementById('CurrencyName');
        if (currencyNameField) currencyNameField.value = String(currencyName ?? '').trim();

        const modalEl = document.getElementById('smCurrencySearchModal');
        const modal = modalEl ? window.bootstrap?.Modal.getInstance(modalEl) : null;
        modal?.hide();
      });

      tbody.appendChild(tr);
    });
  };

  const runCurrencySearch = async () => {
    const table = document.getElementById('smCurrencySearchTable');
    const tbody = table?.querySelector('tbody');
    if (!tbody) return;

    if (!window.ServiceLoader?.loadCore) {
      console.error('[SecurityMaintenance] ServiceLoader.loadCore is not available.');
      return;
    }

    tbody.innerHTML = '<tr><td colspan="2" class="text-muted">Searching...</td></tr>';
    await window.ServiceLoader.loadCore();

    if (!window.CoreApi) {
      tbody.innerHTML = '<tr><td colspan="2" class="text-danger">CoreApi not available</td></tr>';
      return;
    }

    const envelope = makeEnvelope('dbo.pc_SearchCurrencies', {});
    const endpoint = getOldApiEndpoint();

    try {
      const response = await window.CoreApi.post(endpoint, envelope);
      console.log('[SecurityMaintenance] pc_SearchCurrencies response:', response);

      if (!response?.success) {
        tbody.innerHTML = '<tr><td colspan="2" class="text-danger">Search failed. Check console.</td></tr>';
        return;
      }

      smAllCurrencies = normalizeCurrencyRows(response);
      renderCurrencies(smAllCurrencies);
    } catch (error) {
      console.error('[SecurityMaintenance] pc_SearchCurrencies failed:', error);
      tbody.innerHTML = `<tr><td colspan="2" class="text-danger">Error: ${error.message || error}</td></tr>`;
    }
  };

  const openCurrencyModal = async () => {
    const modalEl = document.getElementById('smCurrencySearchModal');
    if (!modalEl || !window.bootstrap?.Modal) {
      console.warn('[SecurityMaintenance] smCurrencySearchModal/bootstrap not available.');
      return;
    }

    // Prefill filter from CurrencyId
    const currencyId = String(document.getElementById('CurrencyId')?.value || '').trim();
    const filterEl = document.getElementById('smCurrencyFilter');
    if (filterEl && currencyId && !String(filterEl.value || '').trim()) {
      filterEl.value = currencyId;
    }

    const modal = window.bootstrap.Modal.getOrCreateInstance(modalEl, { backdrop: 'static' });
    modal.show();

    await runCurrencySearch();
  };

  currencySearchBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    openCurrencyModal();
  });

  document.getElementById('smCurrencySearchRun')?.addEventListener('click', (e) => {
    e.preventDefault();
    runCurrencySearch();
  });

  document.getElementById('smCurrencyFilter')?.addEventListener('input', () => {
    renderCurrencies(smAllCurrencies);
  });

  // State tracking
  let currentRecord = null;      // Holds the currently loaded record data
  let isEditMode = false;        // Tracks if in Add or Edit mode
  let recordNotFound = false;    // Tracks if last search returned no data
  let mode = 'default';          // 'default' | 'notFound' | 'found' | 'add' | 'edit'

  // ===== Inline Coupon Schedule (UI) =====
  const couponDateEl = document.getElementById('RedemptionDate');
  const couponPctEl = document.getElementById('RedemptionPercentage');
  const couponFinalEl = document.getElementById('IsFinalRedemption');
  const couponTableEl = document.getElementById('smCouponInlineTable');
  const couponActionEls = document.querySelectorAll('[data-sm-coupon-action]');
  const redemptionTypeEl = document.getElementById('RedemptionType');

  let smCouponRows = [];
  let smCouponSelectedIndex = -1;
  let smCouponMode = 'add'; // 'add' | 'edit'

  const normalizePct = (value) => {
    const text = String(value ?? '').trim();
    if (!text) return null;
    const numeric = Number(text.replace(/,/g, ''));
    if (!Number.isFinite(numeric)) return null;
    return numeric;
  };

  const escapeXml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  const safeDisplayDate = (value) => {
    const text = String(value ?? '').trim();
    if (!text) return '';

    // ISO yyyy-mm-dd -> dd/Mon/yyyy
    const iso = text.match(/^\d{4}-\d{2}-\d{2}/);
    if (iso) {
      const [yyyy, mm, dd] = iso[0].split('-');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const idx = Math.max(0, Math.min(11, Number(mm) - 1));
      return `${dd}/${months[idx]}/${yyyy}`;
    }

    return text;
  };

  const buildCouponDetailRecordXml = (rows) => {
    const list = Array.isArray(rows) ? rows : [];
    if (!list.length) return '<NewDataSet />';

    const items = list.map((row, idx) => {
      const dateText = String(row?.redemptionDate ?? '').trim();
      const pct = row?.redemptionPercentage;
      const isFinal = row?.isFinalRedemption ? 1 : 0;
      const instNo = idx + 1;

      return (
        '<Table1>' +
        `<InstNo>${escapeXml(instNo)}</InstNo>` +
        `<RedemptionDate>${escapeXml(dateText)}</RedemptionDate>` +
        `<RedemptionPercentage>${escapeXml(pct == null ? '' : pct)}</RedemptionPercentage>` +
        `<IsFinalRedemption>${escapeXml(isFinal)}</IsFinalRedemption>` +
        '</Table1>'
      );
    }).join('');

    return `<NewDataSet>${items}</NewDataSet>`;
  };

  const extractCouponRowsFromDetailsArray = (rows) => {
    const list = Array.isArray(rows) ? rows : [];
    if (!list.length) return [];

    const getFirst = (obj, keys) => {
      for (const k of keys) {
        if (obj && obj[k] != null && String(obj[k]).trim() !== '') return obj[k];
      }
      return null;
    };

    return list
      .map((r) => {
        const dateRaw = getFirst(r, ['RedemptionDate', 'RedeemptionDate', 'CouponDate', 'CouponDt', 'RedemptionDt']);
        const pctRaw = getFirst(r, ['RedemptionPercentage', 'RedeemptionPercentage', 'Percentage', 'Percent', 'Pct']);
        const finalRaw = getFirst(r, ['IsFinalRedemption', 'IsFinal', 'Final']);

        const redemptionDate = safeDisplayDate(dateRaw);
        const redemptionPercentage = normalizePct(pctRaw);
        const isFinalRedemption =
          finalRaw === true ||
          String(finalRaw ?? '').trim().toLowerCase() === '1' ||
          String(finalRaw ?? '').trim().toLowerCase() === 'true' ||
          String(finalRaw ?? '').trim().toLowerCase() === 'y' ||
          String(finalRaw ?? '').trim().toLowerCase() === 'yes';

        if (!redemptionDate && redemptionPercentage == null) return null;
        return { redemptionDate, redemptionPercentage, isFinalRedemption };
      })
      .filter(Boolean);
  };

  const parseCouponRowsFromDetailRecordXml = (xmlText) => {
    const text = String(xmlText ?? '').trim();
    if (!text) return [];
    if (typeof window.DOMParser !== 'function') return [];

    try {
      const doc = new window.DOMParser().parseFromString(text, 'text/xml');
      const parseError = doc.getElementsByTagName('parsererror');
      if (parseError && parseError.length) return [];

      const tableNodes = Array.from(doc.getElementsByTagName('Table1'));
      if (!tableNodes.length) return [];

      const getNodeText = (parent, tag) => {
        const el = parent.getElementsByTagName(tag)[0];
        return el ? String(el.textContent ?? '').trim() : '';
      };

      return tableNodes
        .map((node) => {
          const dateRaw = getNodeText(node, 'RedemptionDate') || getNodeText(node, 'CouponDate');
          const pctRaw = getNodeText(node, 'RedemptionPercentage') || getNodeText(node, 'Percentage');
          const finalRaw = getNodeText(node, 'IsFinalRedemption') || getNodeText(node, 'IsFinal');

          const redemptionDate = safeDisplayDate(dateRaw);
          const redemptionPercentage = normalizePct(pctRaw);
          const isFinalRedemption =
            finalRaw === '1' ||
            finalRaw.trim().toLowerCase() === 'true' ||
            finalRaw.trim().toLowerCase() === 'y' ||
            finalRaw.trim().toLowerCase() === 'yes';

          if (!redemptionDate && redemptionPercentage == null) return null;
          return { redemptionDate, redemptionPercentage, isFinalRedemption };
        })
        .filter(Boolean);
    } catch {
      return [];
    }
  };

  const loadCouponRowsFromViewResponse = (response, record) => {
    if (!ensureCouponReady()) return;
    if (!isMultipleRedemptionType()) {
      resetCouponInline();
      return;
    }

    const payload = response?.data && typeof response.data === 'object' ? response.data : response;

    const looksLikeCouponArray = (arr) => {
      if (!Array.isArray(arr) || !arr.length) return false;
      const first = arr[0];
      if (!first || typeof first !== 'object') return false;
      const keyBlob = Object.keys(first).join(' ').toLowerCase();
      return /(redeem|redemp|coupon|percentage|inst)/i.test(keyBlob);
    };

    const findFirstCouponArrayDeep = (root) => {
      const seen = new Set();
      const queue = [{ value: root, depth: 0 }];
      while (queue.length) {
        const { value, depth } = queue.shift();
        if (depth > 6) continue;
        if (!value || typeof value !== 'object') continue;
        if (seen.has(value)) continue;
        seen.add(value);

        if (Array.isArray(value)) {
          if (looksLikeCouponArray(value)) return value;
          // arrays of objects: keep scanning
          value.forEach((v) => queue.push({ value: v, depth: depth + 1 }));
          continue;
        }

        for (const v of Object.values(value)) {
          if (v && typeof v === 'object') queue.push({ value: v, depth: depth + 1 });
        }
      }
      return null;
    };

    const findFirstDetailRecordXmlDeep = (root) => {
      const seen = new Set();
      const queue = [{ value: root, depth: 0 }];
      while (queue.length) {
        const { value, depth } = queue.shift();
        if (depth > 8) continue;
        if (!value || typeof value !== 'object') continue;
        if (seen.has(value)) continue;
        seen.add(value);

        if (Array.isArray(value)) {
          value.forEach((v) => queue.push({ value: v, depth: depth + 1 }));
          continue;
        }

        for (const [k, v] of Object.entries(value)) {
          if (typeof v === 'string') {
            const key = String(k).toLowerCase();
            const text = v.trim();
            if ((key.includes('detailrecord') || key.includes('detailrecords')) && text.startsWith('<') && text.includes('<Table')) {
              return text;
            }
          }
          if (v && typeof v === 'object') queue.push({ value: v, depth: depth + 1 });
        }
      }
      return '';
    };

    let loadedRows = [];

    // 1) Preferred: find any Details array with redemption fields anywhere in the response
    const couponArr = findFirstCouponArrayDeep(payload);
    if (couponArr) loadedRows = extractCouponRowsFromDetailsArray(couponArr);

    // 2) Fallback: parse DetailRecord XML (from record first, then anywhere in payload)
    if (!loadedRows.length) {
      const detailRecordXml = record?.DetailRecord || record?.DetailRecords || record?.DetailRecordsXml || '';
      loadedRows = parseCouponRowsFromDetailRecordXml(detailRecordXml);
    }
    if (!loadedRows.length) {
      const xmlDeep = findFirstDetailRecordXmlDeep(payload);
      loadedRows = parseCouponRowsFromDetailRecordXml(xmlDeep);
    }

    smCouponRows = Array.isArray(loadedRows) ? loadedRows : [];
    smCouponSelectedIndex = -1;
    smCouponMode = 'add';
    clearCouponFormValue();
    renderCouponTable();
    window.__smCouponInlineRows = smCouponRows;
  };

  const getCouponFormValue = () => {
    const dateText = String(couponDateEl?.value ?? '').trim();
    const pct = normalizePct(couponPctEl?.value);
    const isFinal = Boolean(couponFinalEl?.checked);
    return { redemptionDate: dateText, redemptionPercentage: pct, isFinalRedemption: isFinal };
  };

  const setCouponFormValue = (row) => {
    if (couponDateEl) couponDateEl.value = String(row?.redemptionDate ?? '');
    if (couponPctEl) couponPctEl.value = row?.redemptionPercentage == null ? '' : String(row.redemptionPercentage);
    if (couponFinalEl) couponFinalEl.checked = Boolean(row?.isFinalRedemption);
  };

  const clearCouponFormValue = () => {
    if (couponDateEl) couponDateEl.value = '';
    if (couponPctEl) couponPctEl.value = '';
    if (couponFinalEl) couponFinalEl.checked = false;
  };

  const renderCouponTable = () => {
    const tbody = couponTableEl?.querySelector('tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (!Array.isArray(smCouponRows) || smCouponRows.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 2;
      td.className = 'text-muted';
      td.textContent = 'No records to display.';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    smCouponRows.forEach((row, idx) => {
      const tr = document.createElement('tr');
      if (idx === smCouponSelectedIndex) tr.classList.add('is-selected');

      const tdPct = document.createElement('td');
      tdPct.textContent = row?.redemptionPercentage == null ? '' : String(row.redemptionPercentage);
      const tdDate = document.createElement('td');
      tdDate.textContent = String(row?.redemptionDate ?? '');

      tr.appendChild(tdPct);
      tr.appendChild(tdDate);

      tr.addEventListener('click', () => {
        smCouponSelectedIndex = idx;
        renderCouponTable();
      });

      tbody.appendChild(tr);
    });
  };

  const resetCouponInline = () => {
    smCouponRows = [];
    smCouponSelectedIndex = -1;
    smCouponMode = 'add';
    clearCouponFormValue();
    renderCouponTable();
    window.__smCouponInlineRows = smCouponRows;
  };

  const ensureCouponReady = () => {
    // If the inline coupon UI isn't present on this page/version, do nothing.
    return Boolean(couponTableEl && couponActionEls && couponActionEls.length);
  };

  const isMultipleRedemptionType = () => {
    if (!redemptionTypeEl) return false;
    const value = String(redemptionTypeEl.value ?? '').trim().toLowerCase();
    const selectedText = String(
      redemptionTypeEl.options?.[redemptionTypeEl.selectedIndex]?.textContent ?? ''
    ).trim().toLowerCase();

    const token = `${value} ${selectedText}`;
    // Some legacy screens spell it as "Mutiple".
    return token.includes('multiple') || token.includes('mutiple') || token === 'm' || token === 'multi';
  };

  const syncCouponActionsEnabled = () => {
    if (!ensureCouponReady()) return;
    const enabled = (mode === 'add' || mode === 'edit') && isMultipleRedemptionType();
    couponActionEls.forEach((btn) => {
      btn.disabled = !enabled;
      btn.setAttribute('aria-disabled', enabled ? 'false' : 'true');
    });
  };

  const handleCouponNew = () => {
    smCouponMode = 'add';
    smCouponSelectedIndex = -1;
    clearCouponFormValue();
    renderCouponTable();
  };

  const handleCouponAlter = () => {
    if (smCouponSelectedIndex < 0 || smCouponSelectedIndex >= smCouponRows.length) {
      uiAlert('Select a coupon schedule row to alter.', 'Coupon Schedule');
      return;
    }
    smCouponMode = 'edit';
    setCouponFormValue(smCouponRows[smCouponSelectedIndex]);
  };

  const handleCouponRemove = () => {
    if (smCouponSelectedIndex < 0 || smCouponSelectedIndex >= smCouponRows.length) {
      uiAlert('Select a coupon schedule row to remove.', 'Coupon Schedule');
      return;
    }

    uiConfirm('Remove selected coupon schedule row?', 'Coupon Schedule').then((confirmed) => {
      if (!confirmed) return;

      smCouponRows.splice(smCouponSelectedIndex, 1);
      smCouponSelectedIndex = -1;
      smCouponMode = 'add';
      clearCouponFormValue();
      renderCouponTable();
      window.__smCouponInlineRows = smCouponRows;
    });
  };

  const handleCouponUpdate = () => {
    const { redemptionDate, redemptionPercentage, isFinalRedemption } = getCouponFormValue();

    if (!redemptionDate) {
      uiAlert('Please enter a Redemption Date.', 'Coupon Schedule');
      return;
    }
    if (redemptionPercentage == null) {
      uiAlert('Please enter a valid Percentage.', 'Coupon Schedule');
      return;
    }

    const row = { redemptionDate, redemptionPercentage, isFinalRedemption };

    if (smCouponMode === 'edit') {
      if (smCouponSelectedIndex < 0 || smCouponSelectedIndex >= smCouponRows.length) {
        uiAlert('Select a row to update (Alter first).', 'Coupon Schedule');
        return;
      }
      smCouponRows[smCouponSelectedIndex] = row;
    } else {
      smCouponRows.push(row);
    }

    smCouponMode = 'add';
    smCouponSelectedIndex = -1;
    clearCouponFormValue();
    renderCouponTable();
    window.__smCouponInlineRows = smCouponRows;
  };

  const handleCouponClear = () => {
    smCouponMode = 'add';
    smCouponSelectedIndex = -1;
    clearCouponFormValue();
    renderCouponTable();
  };

  if (ensureCouponReady()) {
    couponActionEls.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        // If actions are disabled by RedemptionType/mode, ignore clicks.
        if (btn.disabled) return;
        const action = btn.getAttribute('data-sm-coupon-action');
        if (!action) return;
        switch (action) {
          case 'new':
            handleCouponNew();
            break;
          case 'alter':
            handleCouponAlter();
            break;
          case 'remove':
            handleCouponRemove();
            break;
          case 'update':
            handleCouponUpdate();
            break;
          case 'clear':
            handleCouponClear();
            break;
        }
      });
    });

    // Initial render
    renderCouponTable();
    window.__smCouponInlineRows = smCouponRows;

    // Enable/disable based on RedemptionType and mode
    redemptionTypeEl?.addEventListener('change', syncCouponActionsEnabled);
    syncCouponActionsEnabled();
  }

  const normalizeKey = (value) => {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  };

  const buildRecordIndex = (record) => {
    const index = new Map();
    if (!record || typeof record !== "object") return index;
    Object.keys(record).forEach((key) => index.set(normalizeKey(key), key));
    return index;
  };

  const coerceBoolean = (value) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    const text = String(value ?? "").trim().toLowerCase();
    return text === "y" || text === "yes" || text === "true" || text === "1";
  };

  const formatDateISO = (value) => {
    if (!value) return "";
    const text = String(value);
    const match = text.match(/^\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : text;
  };

  const formatDateDisplay = (value) => {
    const iso = formatDateISO(value);
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
    const [yyyy, mm, dd] = iso.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthIdx = Math.max(0, Math.min(11, Number(mm) - 1));
    return `${dd}/${months[monthIdx]}/${yyyy}`;
  };

  const addSelectOptionIfMissing = (selectEl, value) => {
    if (!selectEl || selectEl.tagName !== "SELECT") return;
    const v = value == null ? "" : String(value);
    if (v === "") return;
    const exists = Array.from(selectEl.options).some((o) => o.value === v);
    if (exists) return;
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = /^\d{4}-\d{2}-\d{2}/.test(v) ? formatDateDisplay(v) : v;
    selectEl.appendChild(opt);
  };

  const getMappedKeyCandidates = (keyMapValue) => {
    if (!keyMapValue) return [];
    if (Array.isArray(keyMapValue)) return keyMapValue;
    return [keyMapValue];
  };

  const extractMergedRecord = (response) => {
    // For dbo.p_getSecurityMasterCustom: response.data.Details01 contains the security master record
    if (Array.isArray(response?.data?.Details01) && response.data.Details01.length) {
      return response.data.Details01[0];
    }

    if (Array.isArray(response?.data) && response.data.length) return response.data[0];
    if (Array.isArray(response?.Details) && response.Details.length) return response.Details[0];

    const payload = response?.data && typeof response.data === "object" ? response.data : response;
    const merged = {};
    const detailKeys = Object.keys(payload || {}).filter((k) => /^Details\d*$/i.test(k));
    detailKeys.sort((a, b) => {
      const an = a.toLowerCase() === "details" ? 0 : Number(a.replace(/\D/g, "") || "0");
      const bn = b.toLowerCase() === "details" ? 0 : Number(b.replace(/\D/g, "") || "0");
      return an - bn;
    });

    const isNonEmpty = (v) => {
      if (v == null) return false;
      if (typeof v === "string") return v.trim() !== "";
      return true;
    };

    const mergeRecord = (record) => {
      if (!record || typeof record !== "object") return;
      for (const [k, v] of Object.entries(record)) {
        if (!k) continue;
        if (!isNonEmpty(merged[k]) && isNonEmpty(v)) merged[k] = v;
        if (merged[k] === undefined) merged[k] = v;
      }
    };

    for (const key of detailKeys) {
      const value = payload[key];
      if (Array.isArray(value)) value.forEach((row) => mergeRecord(row));
      else mergeRecord(value);
    }

    if (!Object.keys(merged).length && payload && typeof payload === "object") {
      Object.assign(merged, payload);
    }

    return Object.keys(merged).length ? merged : null;
  };

  const bindRecordToForm = (formEl, record, keyMap = {}) => {
    if (!formEl || !record || typeof record !== "object") return;

    const recordIndex = buildRecordIndex(record);
    const fields = Array.from(formEl.querySelectorAll("input, select, textarea"));

    fields.forEach((field) => {
      const rawKey = field.id || field.name;
      if (!rawKey) return;

      const mapped = keyMap[rawKey] || keyMap[field.id] || keyMap[field.name] || null;
      let recordKey = null;

      for (const candidate of getMappedKeyCandidates(mapped)) {
        const k = recordIndex.get(normalizeKey(candidate));
        if (k) {
          recordKey = k;
          break;
        }
      }

      if (!recordKey) recordKey = recordIndex.get(normalizeKey(rawKey)) || null;
      if (!recordKey) return;

      const value = record[recordKey];
      if (field.type === "checkbox") {
        field.checked = coerceBoolean(value);
        return;
      }
      if (field.tagName === "SELECT") {
        const nextValue = value == null ? "" : String(value);
        addSelectOptionIfMissing(field, nextValue);
        field.value = nextValue;
        return;
      }

      const stringValue = value == null ? "" : String(value);
      const shouldFormatDate =
        /^\d{4}-\d{2}-\d{2}/.test(stringValue) && /(date|from|to|upto|tender|maturity|value)/i.test(rawKey);
      field.value = shouldFormatDate ? formatDateDisplay(stringValue) : stringValue;
    });
  };

  const getSession = () => window.AuthService?.getSession?.() || null;

  // Populate lookup dropdowns on page load
  const populateLookupDropdowns = async () => {
    if (!window.ServiceLoader?.loadLookupService) {
      console.warn("[SecurityMaintenance] ServiceLoader.loadLookupService not available.");
      return;
    }

    await window.ServiceLoader.loadLookupService();
    if (!window.LookupService) {
      console.warn("[SecurityMaintenance] LookupService not available.");
      return;
    }

    const lookupFields = form.querySelectorAll("[data-lookup]");
    const lookupPromises = [];

    lookupFields.forEach((field) => {
      const lookupKey = field.getAttribute("data-lookup");
      if (!lookupKey) return;

      const methodName = `get${lookupKey.charAt(0).toUpperCase()}${lookupKey.slice(1)}`;
      const lookupMethod = window.LookupService[methodName];

      if (typeof lookupMethod !== "function") {
        console.warn(`[SecurityMaintenance] LookupService.${methodName} not found for ${lookupKey}`);
        return;
      }

      const promise = lookupMethod.call(window.LookupService).then((options) => {
        if (!Array.isArray(options)) return;
        options.forEach((opt) => {
          const option = document.createElement("option");
          option.value = opt.value;
          option.textContent = opt.label;
          field.appendChild(option);
        });
      }).catch((err) => {
        console.error(`[SecurityMaintenance] Failed to load ${lookupKey}:`, err);
      });

      lookupPromises.push(promise);
    });

    await Promise.all(lookupPromises);
    console.info("[SecurityMaintenance] Lookup dropdowns populated.");
  };

  // Populate dropdowns on page load
  populateLookupDropdowns();

  // Button state management
  const setButtonState = (button, enabled) => {
    if (!button) return;
    button.style.opacity = enabled ? '1' : '0.5';
    button.disabled = !enabled;
  };

  const updateButtonStates = () => {
    switch (mode) {
      case 'default':
        // Default State (Page Load): View ✅, Cancel ✅
        setButtonState(viewBtn, true);
        setButtonState(addBtn, false);
        setButtonState(editBtn, false);
        setButtonState(deleteBtn, false);
        setButtonState(saveBtn, false);
        setButtonState(cancelBtn, true);
        break;

      case 'notFound':
        // Record Not Found State: View ✅, Add ✅, Cancel ✅
        setButtonState(viewBtn, true);
        setButtonState(addBtn, true);
        setButtonState(editBtn, false);
        setButtonState(deleteBtn, false);
        setButtonState(saveBtn, false);
        setButtonState(cancelBtn, true);
        break;

      case 'found':
        // Record Found State: View ✅, Edit ✅, Delete ✅, Cancel ✅
        setButtonState(viewBtn, true);
        setButtonState(addBtn, false);
        setButtonState(editBtn, true);
        setButtonState(deleteBtn, true);
        setButtonState(saveBtn, false);
        setButtonState(cancelBtn, true);
        break;

      case 'add':
        // Add Mode State: Save ✅, Cancel ✅
        setButtonState(viewBtn, false);
        setButtonState(addBtn, false);
        setButtonState(editBtn, false);
        setButtonState(deleteBtn, false);
        setButtonState(saveBtn, true);
        setButtonState(cancelBtn, true);
        break;

      case 'edit':
        // Edit Mode State: Save ✅, Cancel ✅
        setButtonState(viewBtn, false);
        setButtonState(addBtn, false);
        setButtonState(editBtn, false);
        setButtonState(deleteBtn, false);
        setButtonState(saveBtn, true);
        setButtonState(cancelBtn, true);
        break;
    }

    isEditMode = (mode === 'add' || mode === 'edit');
    recordNotFound = (mode === 'notFound');

    // Coupon inline actions depend on mode + RedemptionType
    if (typeof syncCouponActionsEnabled === 'function') {
      syncCouponActionsEnabled();
    }
  };

  const setFormFieldsReadonly = (readonly) => {
    // Select all input, select, textarea elements (not just those without readonly)
    const fields = form.querySelectorAll('input, select, textarea');
    fields.forEach(field => {
      // Skip the IssueNo field and Behind The Scene fields
      if (field.id === 'IssueNo' || 
          field.id === 'CreatedBy' || field.id === 'CreatedOn' ||
          field.id === 'ModifiedBy' || field.id === 'ModifiedOn' ||
          field.id === 'SupervisedBy' || field.id === 'SupervisedOn') {
        return;
      }
      if (readonly) {
        field.setAttribute('readonly', 'readonly');
        if (field.tagName === 'SELECT') {
          field.disabled = true;
        }
      } else {
        field.removeAttribute('readonly');
        if (field.tagName === 'SELECT') {
          field.disabled = false;
        }
      }
    });
  };

  const clearFormFields = (preserveIssueNo = false) => {
    const issueNoValue = preserveIssueNo ? document.getElementById('IssueNo')?.value : '';

    const fields = form.querySelectorAll('input, select, textarea');
    fields.forEach((field) => {
      // Preserve IssueNo when requested (typically after a Not Found search)
      if (preserveIssueNo && field.id === 'IssueNo') return;

      if (field.type === 'checkbox') {
        field.checked = false;
        return;
      }

      if (field.tagName === 'SELECT') {
        field.selectedIndex = 0;
        return;
      }

      // Clear even readonly fields (Cancel should reset the screen)
      field.value = '';
    });

    if (preserveIssueNo && issueNoValue) {
      const issueEl = document.getElementById('IssueNo');
      if (issueEl) issueEl.value = issueNoValue;
    }
  };

  // Initialize to default state
  updateButtonStates();

  viewBtn.addEventListener("click", async () => {
    if (!window.ServiceLoader?.loadTreasuryService) {
      console.error("[SecurityMaintenance] ServiceLoader.loadTreasuryService is not available.");
      return;
    }

    await window.ServiceLoader.loadTreasuryService();
    if (!window.TreasuryService?.getSecurityMasterCustom) {
      console.error("[SecurityMaintenance] TreasuryService.getSecurityMasterCustom is not available.");
      return;
    }

    const session = getSession();
    const operatorId = session?.operatorID || session?.OperatorID || session?.operatorId || "";
    const bankId = session?.bankID || session?.BankID || window.Environment?.BankID || window.Environment?.bankID || "00";
    const ourBranchId =
      session?.ourBranchID ||
      session?.OurBranchID ||
      session?.branchID ||
      session?.BranchID ||
      window.Environment?.OurBranchID ||
      window.Environment?.ourBranchID ||
      "";

    const issueNumber = String(document.getElementById("IssueNo")?.value || "").trim();

    if (!issueNumber) {
      console.warn("[SecurityMaintenance] Enter Issue No. first.");
      return;
    }

    if (!ourBranchId) {
      console.warn(
        "[SecurityMaintenance] OurBranchID is empty. Set it in environment/session; the SP may return no data without it."
      );
    }

    if (!operatorId) {
      console.warn(
        "[SecurityMaintenance] OperatorID is empty (Auth session missing). The SP may return no data without it."
      );
    }

    const numericSerialId = /^\d+$/.test(issueNumber) ? Number(issueNumber) : 0;

    const requestData = {
      BankID: '00',
      OurBranchID: '1201',
      IssueNumber: issueNumber,
      OperatorID: 'JOY_WANJA',
      Direction: 0
    };

    window.__smLastGetSecurityMasterCustomRequestData = requestData;
    console.log("[SecurityMaintenance] GetSecurityMasterCustom requestData:", requestData);

    const response = await window.TreasuryService.getSecurityMasterCustom(requestData);
    window.__smLastGetSecurityMasterCustomResponse = response;
    console.log("[SecurityMaintenance] GetSecurityMasterCustom response:", response);

    if (!response?.success) {
      console.error("[SecurityMaintenance] GetSecurityMasterCustom failed:", response);
      return;
    }

    const record = extractMergedRecord(response);
    window.__smLastSecurityMasterCustomRecord = record;
    
    // Check if record has meaningful data (API returns empty object for non-existing records)
    const hasData = record && (
      record.IssueNumber || 
      record.Name || 
      record.SecurityType || 
      record.TenderDate ||
      record.CreatedBy
    );
    
    if (!record || !hasData) {
      console.warn("[SecurityMaintenance] No record found or record is empty.");
      currentRecord = null;
      mode = 'notFound';
      clearFormFields(true); // Preserve Issue Number
      updateButtonStates();
      await uiAlert('Security not found. You can click Add to create a new security with this Issue Number.', {
        title: 'Not Found',
        variant: 'warning'
      });

      return;
    }

    // Record found successfully
    currentRecord = record;
    mode = 'found';
    setFormFieldsReadonly(true);

    const keyMap = {
      IssueNo: ["IssueNumber", "IssueNo", "IssueNo.", "IssueNo", "Issue"],
      TenderDate: ["TenderDate", "TenderDt"],
      SecurityType: ["SecurityType", "SecurityTypeID", "SecType", "SecTypeID"],
      ValueDate: ["ValueDate", "ValueDt"],
      SecurityCategory: ["SecurityCategory", "SecurityCategoryID", "SecCategory", "SecCategoryID"],
      TenorDays: ["TenorDays", "Tenor", "TenorDay"],
      Name: ["Name", "SecurityName", "SecurityDesc", "SecurityDescription"],
      CurrencyId: ["CurrencyID", "CurrencyId", "CurrencyCode"],
      MinAmount: ["MinAmount", "MinimumAmount", "MinAmt"],
      Rate: ["Rate", "InterestRate", "IntRate"],
      MaxAmount: ["MaxAmount", "MaximumAmount", "MaxAmt"],
      TaxRate: ["TaxRate", "Tax", "WithholdingTaxRate"],
      IsSuspended: ["IsSuspended", "Suspended", "IsSuspend"],
      MaturityDate: ["MaturityDate", "MaturityDt"],
      Remarks: ["Remarks", "Remark"],
      RedemptionType: ["ReedemptionType", "RedeemptionType", "RedemptionType", "RedemptionMode"],
      CreatedBy: ["CreatedBy", "CreatedByID"],
      CreatedOn: ["CreatedOn", "CreatedDate"],
      ModifiedBy: ["ModifiedBy", "ModifiedByID"],
      ModifiedOn: ["ModifiedOn", "ModifiedDate"],
      SupervisedBy: ["SupervisedBy", "SupervisedByID"],
      SupervisedOn: ["SupervisedOn", "SupervisedDate"]
    };

    bindRecordToForm(form, record, keyMap);
    loadCouponRowsFromViewResponse(response, record);
    updateButtonStates();
    console.info("[SecurityMaintenance] Security master details loaded.");
  });

  // Add button handler
  addBtn?.addEventListener('click', () => {
    currentRecord = null;
    mode = 'add';
    clearFormFields(true); // Preserve IssueNo when coming from notFound state
    resetCouponInline();
    setFormFieldsReadonly(false);
    updateButtonStates();
    console.info('[SecurityMaintenance] Add mode activated.');
  });

  // Edit button handler
  editBtn?.addEventListener('click', async () => {
    if (!currentRecord) {
      await uiAlert('No record loaded to edit.', { title: 'Edit' });
      return;
    }
    mode = 'edit';
    setFormFieldsReadonly(false);
    updateButtonStates();
    console.info('[SecurityMaintenance] Edit mode activated.');
  });

  // Delete button handler
  deleteBtn?.addEventListener('click', async () => {
    if (!currentRecord) {
      await uiAlert('No record loaded to delete.', { title: 'Delete' });
      return;
    }
    
    const issueNo = document.getElementById('IssueNo')?.value || 'this security';
    const confirmed = await uiConfirm(`Are you sure you want to delete security ${issueNo}?`, {
      title: 'Confirm Delete',
      okText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger'
    });
    
    if (!confirmed) return;

    if (!window.ServiceLoader?.loadTreasuryService) {
      console.error("[SecurityMaintenance] ServiceLoader.loadTreasuryService is not available.");
      return;
    }

    await window.ServiceLoader.loadTreasuryService();
    if (!window.TreasuryService?.deleteSecurityMasterCustom) {
      console.error("[SecurityMaintenance] TreasuryService.deleteSecurityMasterCustom is not available.");
      return;
    }

    const session = getSession();
    const bankId = window.Environment?.BankID || window.Environment?.bankID || "00";
    const ourBranchId =
      session?.ourBranchID ||
      session?.OurBranchID ||
      session?.branchID ||
      session?.BranchID ||
      window.Environment?.OurBranchID ||
      window.Environment?.ourBranchID ||
      "";

    const requestData = {
      BankID: '00',
      OurBranchID: '1201',
      IssueNumber: issueNo,
      UpdateCount: currentRecord?.UpdateCount || 0
    };

    console.log('[SecurityMaintenance] DeleteSecurityMasterCustom requestData:', requestData);

    try {
      const response = await window.TreasuryService.deleteSecurityMasterCustom(requestData);
      console.log('[SecurityMaintenance] DeleteSecurityMasterCustom response:', response);

      if (response?.Details) {
        console.log('[SecurityMaintenance] Delete Details:', JSON.stringify(response.Details, null, 2));
      }
      if (response?.data) {
        console.log('[SecurityMaintenance] Delete data:', JSON.stringify(response.data, null, 2));
      }

      const status = response?.Details?.Status || response?.data?.Status || response?.code;
      const apiMessage = response?.Details?.Message || response?.data?.Message || response?.message;
      
      const isSuccess = response?.success === true || 
                       response?.success === 'true' ||
                       response?.code === '00' ||
                       response?.code === 0 ||
                       status === '00' ||
                       status === '0' ||
                       status === 0;

      if (!isSuccess) {
        console.error('[SecurityMaintenance] DeleteSecurityMasterCustom failed:', response);
        const errorMsg = toUiText(apiMessage || response?.message || response?.Message || response?.error) || 'Unknown error';
        await uiAlert(`Failed to delete security: ${errorMsg}`, { title: 'Delete Failed', variant: 'danger' });
        return;
      }

      await uiAlert(`Security ${issueNo} deleted successfully!`, { title: 'Deleted', variant: 'success' });
      console.info('[SecurityMaintenance] Security deleted successfully.');

      // Clear form and return to default state
      clearFormFields(false);
      resetCouponInline();
      currentRecord = null;
      mode = 'default';
      setFormFieldsReadonly(true);
      updateButtonStates();
    } catch (error) {
      console.error('[SecurityMaintenance] Delete error:', error);
      await uiAlert(`Error deleting security: ${toUiText(error)}`, { title: 'Delete Error', variant: 'danger' });
    }
  });

  // Helper to parse display date to API format (yyyy-MM-dd)
  const parseDateForAPI = (displayDate) => {
    if (!displayDate) return '';
    const text = String(displayDate).trim();
    
    // Already in ISO format
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
      return text.substring(0, 10);
    }
    
    // Parse dd/MMM/yyyy format
    const match = text.match(/^(\d{1,2})\/(\w{3})\/(\d{4})/);
    if (!match) return '';
    
    const [, day, monthName, year] = match;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthIdx = months.findIndex(m => m.toLowerCase() === monthName.toLowerCase());
    
    if (monthIdx === -1) return '';
    
    const mm = String(monthIdx + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  // Helper to get current datetime for SQL Server
  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  // Save button handler
  saveBtn?.addEventListener('click', async () => {
    if (mode !== 'add' && mode !== 'edit') return;

    const issueNo = document.getElementById('IssueNo')?.value?.trim();
    if (!issueNo) {
      await uiAlert('Please enter an Issue Number.', { title: 'Validation' });
      return;
    }

    if (!window.ServiceLoader?.loadTreasuryService) {
      console.error("[SecurityMaintenance] ServiceLoader.loadTreasuryService is not available.");
      return;
    }

    await window.ServiceLoader.loadTreasuryService();
    if (!window.TreasuryService?.addEditSecurityMasterCustom) {
      console.error("[SecurityMaintenance] TreasuryService.addEditSecurityMasterCustom is not available.");
      return;
    }

    const session = getSession();
    const operatorId = session?.operatorID || session?.OperatorID || session?.operatorId || "";
    const ourBranchId =
      session?.ourBranchID ||
      session?.OurBranchID ||
      session?.branchID ||
      session?.BranchID ||
      window.Environment?.OurBranchID ||
      window.Environment?.ourBranchID ||
      "";

    const getFieldValue = (id) => {
      const field = document.getElementById(id);
      if (!field) return null;
      
      if (field.type === 'checkbox') {
        return field.checked ? 1 : 0;
      }
      
      const value = field.value?.trim();
      return value || null;
    };

    

    const currentDateTime = getCurrentDateTime();
    const requestData = {
      OurBranchID: '1201',
      IssueNumber: getFieldValue('IssueNo') || '',
      TenderDate: parseDateForAPI(getFieldValue('TenderDateTime')),
      SecurityType: getFieldValue('SecurityType') || '',
      SecurityCategory: getFieldValue('SecurityCategory') || '',
      Name: getFieldValue('Name') || '',
      ReedemptionType: getFieldValue('RedemptionType') || '',
      ValueDate: parseDateForAPI(getFieldValue('ValueDate')),
      Tenor: getFieldValue('TenorDays') ? parseInt(getFieldValue('TenorDays'), 10) : 0,
      MaturityDate: parseDateForAPI(getFieldValue('MaturityDateTime')),
      Rate: getFieldValue('Rate') ? parseFloat(getFieldValue('Rate')) : 0,
      CurrencyID: getFieldValue('CurrencyId') || '',
      MaxAmount: getFieldValue('MaxAmount') ? parseFloat(getFieldValue('MaxAmount')) : 0,
      MinAmount: getFieldValue('MinAmount') ? parseFloat(getFieldValue('MinAmount')) : 0,
      TaxRate: getFieldValue('TaxRate') ? parseFloat(getFieldValue('TaxRate')) : 0,
      IsSuspended: getFieldValue('IsSuspended'),
      Remarks: getFieldValue('Remarks') || '',
      CreatedBy:'JOY_WANJA',
      CreatedOn: mode === 'add' ? currentDateTime : (currentRecord?.CreatedOn || currentDateTime),
      ModifiedBy: 'JOY_WANJA',
      ModifiedOn: currentDateTime,
      SupervisedBy: currentRecord?.SupervisedBy || '',
      SupervisedOn: currentRecord?.SupervisedOn || '',
      UpdateCount: currentRecord?.UpdateCount || 1,
      DetailRecord: isMultipleRedemptionType() ? buildCouponDetailRecordXml(smCouponRows) : ''
    };

    console.log(`[SecurityMaintenance] Mode: ${mode}`);
    console.log(`[SecurityMaintenance] CurrentRecord:`, currentRecord);
    console.log(`[SecurityMaintenance] AddEditSecurityMasterCustom requestData (${mode} mode):`, requestData);

    try {
      const response = await window.TreasuryService.addEditSecurityMasterCustom(requestData);
      console.log('[SecurityMaintenance] AddEditSecurityMasterCustom response:', response);
      
      // Log the full Details and data to see what the API actually returned
      if (response?.Details) {
        console.log('[SecurityMaintenance] Details:', JSON.stringify(response.Details, null, 2));
      }
      if (response?.data) {
        console.log('[SecurityMaintenance] data:', JSON.stringify(response.data, null, 2));
      }

      const status = response?.Details?.Status || response?.data?.Status || response?.code;
      const apiMessage = response?.Details?.Message || response?.data?.Message || response?.message;
      
      const isSuccess = response?.success === true || 
                       response?.success === 'true' ||
                       response?.code === '00' ||
                       response?.code === 0 ||
                       status === '00' ||
                       status === '0' ||
                       status === 0;

      if (!isSuccess) {
        console.error('[SecurityMaintenance] AddEditSecurityMasterCustom failed:', response);
        const errorMsg = toUiText(apiMessage || response?.message || response?.Message || response?.error) || 'Unknown error';
        await uiAlert(`Failed to ${mode === 'add' ? 'create' : 'update'} security: ${errorMsg}`,
          { title: 'Save Failed' }
        );
        return;
      }

      await uiAlert(`Security ${mode === 'add' ? 'created' : 'updated'} successfully!`, { title: 'Saved', variant: 'success' });
      console.info(`[SecurityMaintenance] Security ${mode === 'add' ? 'created' : 'updated'} successfully.`);

      // Auto-refresh the screen after saving: clear fields and return to default state.
      clearFormFields(false);
      resetCouponInline();
      currentRecord = null;
      mode = 'default';
      setFormFieldsReadonly(true);
      updateButtonStates();
    } catch (error) {
      console.error('[SecurityMaintenance] Save error:', error);
      await uiAlert(`Error saving security: ${toUiText(error)}`, { title: 'Save Error', variant: 'danger' });
    }
  });

  // Cancel button handler
  cancelBtn?.addEventListener('click', async () => {
    const isDirtyMode = mode === 'add' || mode === 'edit';
    const message = isDirtyMode
      ? 'Are you sure you want to cancel? Your unsaved changes will be lost.'
      : 'Are you sure you want to cancel and clear the current form?';

    const confirmed = await uiConfirm(message, {
      title: 'Confirm Cancel',
      okText: 'Yes',
      cancelText: 'No',
      variant: 'warning'
    });
    if (!confirmed) {
      console.info('[SecurityMaintenance] Cancel aborted by user.');
      return;
    }

    if (mode === 'edit') {
      // Revert to last loaded record
      if (currentRecord) {
        const keyMap = {
          IssueNo: ["IssueNumber", "IssueNo", "IssueNo.", "IssueNo", "Issue"],
          TenderDate: ["TenderDate", "TenderDt"],
          SecurityType: ["SecurityType", "SecurityTypeID", "SecType", "SecTypeID"],
          ValueDate: ["ValueDate", "ValueDt"],
          SecurityCategory: ["SecurityCategory", "SecurityCategoryID", "SecCategory", "SecCategoryID"],
          TenorDays: ["TenorDays", "Tenor", "TenorDay"],
          Name: ["Name", "SecurityName", "SecurityDesc", "SecurityDescription"],
          CurrencyId: ["CurrencyID", "CurrencyId", "CurrencyCode"],
          MinAmount: ["MinAmount", "MinimumAmount", "MinAmt"],
          Rate: ["Rate", "InterestRate", "IntRate"],
          MaxAmount: ["MaxAmount", "MaximumAmount", "MaxAmt"],
          TaxRate: ["TaxRate", "Tax", "WithholdingTaxRate"],
          IsSuspended: ["IsSuspended", "Suspended", "IsSuspend"],
          MaturityDate: ["MaturityDate", "MaturityDt"],
          Remarks: ["Remarks", "Remark"],
          RedemptionType: ["ReedemptionType", "RedeemptionType", "RedemptionType", "RedemptionMode"],
          CreatedBy: ["CreatedBy", "CreatedByID"],
          CreatedOn: ["CreatedOn", "CreatedDate"],
          ModifiedBy: ["ModifiedBy", "ModifiedByID"],
          ModifiedOn: ["ModifiedOn", "ModifiedDate"],
          SupervisedBy: ["SupervisedBy", "SupervisedByID"],
          SupervisedOn: ["SupervisedOn", "SupervisedDate"]
        };
        bindRecordToForm(form, currentRecord, keyMap);
        mode = 'found';
        setFormFieldsReadonly(true);
      }
    } else {
      // Clear form and return to default state
      clearFormFields(false);
      resetCouponInline();
      currentRecord = null;
      mode = 'default';
      setFormFieldsReadonly(true);
    }
    updateButtonStates();
    console.info('[SecurityMaintenance] Cancelled, returned to:', mode);
  });
});
