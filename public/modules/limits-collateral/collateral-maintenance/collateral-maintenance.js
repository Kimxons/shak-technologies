// Collateral Maintenance - Kairo Banking Application

// ========== STATE MANAGEMENT ==========
let isEditMode = false;
let currentRecord = null;
let activeSection = 'dataentry';

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', async function() {
  await initializeServices();
  initializeForm();
  wireStandardUiShell();
  setupEventListeners();
  setupBranchLookup();
  setupOwnerLookup();
  setupAutoGrowTextareas();
  // Form is editable on entry - no disableEdit() call
});

// ========== AUTO-GROW TEXTAREAS (SCOPED) ==========
// Lightweight, plain JS auto-resize. Only applies to textareas explicitly marked with
// the class 'js-autogrow-textarea' to avoid affecting other inputs.
function setupAutoGrowTextareas() {
  const targets = Array.from(document.querySelectorAll('textarea.js-autogrow-textarea'));
  if (targets.length === 0) return;

  // Calculate a one-line pixel height using computed styles (line-height + padding + borders)
  const setOneLineHeight = (el) => {
    const cs = window.getComputedStyle(el);

    // line-height can be 'normal'; approximate if so.
    let lineHeight = parseFloat(cs.lineHeight);
    if (Number.isNaN(lineHeight)) {
      const fontSize = parseFloat(cs.fontSize) || 16;
      lineHeight = fontSize * 1.2;
    }

    const paddingTop = parseFloat(cs.paddingTop) || 0;
    const paddingBottom = parseFloat(cs.paddingBottom) || 0;
    const borderTop = parseFloat(cs.borderTopWidth) || 0;
    const borderBottom = parseFloat(cs.borderBottomWidth) || 0;

    const oneLine = lineHeight + paddingTop + paddingBottom + borderTop + borderBottom;
    el.style.height = oneLine + 'px';
  };

  // Resize textarea to fit content; reset height before measuring to avoid jump issues
  const autoResize = (el) => {
    setOneLineHeight(el);
    el.style.height = el.scrollHeight + 'px';
  };

  // Expose a minimal helper so record loaders can refresh height after programmatic value updates
  window.__kairoAutoGrow = window.__kairoAutoGrow || {};
  window.__kairoAutoGrow.autoResize = autoResize;
  window.__kairoAutoGrow.setOneLineHeight = setOneLineHeight;

  targets.forEach((el) => {
    // One line on load unless prefilled
    if ((el.value || '').trim().length > 0) {
      autoResize(el);
    } else {
      setOneLineHeight(el);
    }

    // Grow/shrink as the user types
    el.addEventListener('input', function () {
      autoResize(el);
    });
  });
}

function setupOwnerLookup() {
  const ownerIdInput = document.getElementById('ownerId');
  const ownerDescInput = document.getElementById('ownerDescription');

  if (!ownerIdInput || !ownerDescInput) return;

  const clearDescriptionIfEmpty = () => {
    if (ownerIdInput.value.trim() === '') {
      ownerDescInput.value = '';
    }
  };

  ownerIdInput.addEventListener('input', clearDescriptionIfEmpty);

  // Auto-fetch description when owner ID is entered
  ownerIdInput.addEventListener('blur', function() {
    const value = this.value.trim();
    if (value) {
      fetchOwnerDescription(value);
    } else {
      ownerDescInput.value = '';
    }
  });

  ownerIdInput.addEventListener('keydown', function(e) {
    const value = this.value.trim();
    if ((e.key === 'Enter' || e.key === 'Tab') && value) {
      if (e.key === 'Enter') e.preventDefault();
      fetchOwnerDescription(value);
    }
  });
}

function escapeSqlLiteral(value) {
  return String(value ?? '').replace(/'/g, "''");
}

async function fetchOwnerDescription(ownerId) {
  const ownerDescInput = document.getElementById('ownerDescription');
  if (!ownerDescInput) return;

  const trimmedOwnerId = String(ownerId ?? '').trim();
  if (!trimmedOwnerId) {
    ownerDescInput.value = '';
    return;
  }

  try {
    const baseUrl = window.Environment?.baseUrlCommon || 'http://172.16.2.31:3306';
    const apiUrl = `${baseUrl}/api/OldAPI`;
    const operatorId = sessionStorage.getItem('operatorId') || sessionStorage.getItem('username') || 'ADMIN';
    const branchId = document.getElementById('branchId')?.value.trim() || window.Environment?.OurBranchID || sessionStorage.getItem('branchId') || '0101';

    const requestBody = {
      RequestID: 'dbo.p_GetSearchResult',
      FormId: 'dbo.p_GetSearchResult',
      RequestData: {
        WhereStmt: `ClientID = '${escapeSqlLiteral(trimmedOwnerId)}'`,
        TableID: 'clientID',
        RefID: null,
        PrevOrNext: '0',
        AdvFilterString: 'CloseDate IS NULL',
        OperatorID: operatorId,
        ModuleID: '5505',
        OurBranchID: branchId,
        SearchKey: null,
        LanguageID: 'en'
      },
      RequestTime: new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).replace(',', ''),
      AppName: 'PROJECT_KAIRO',
      Checksum: ''
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        accept: '*/*'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      ownerDescInput.value = '';
      return;
    }

    const data = await response.json();

    const clients = (Array.isArray(data?.Details) && data.Details) ||
      (Array.isArray(data?.Details01) && data.Details01) ||
      (Array.isArray(data) && data) || [];

    const first = clients[0] || {};
    ownerDescInput.value = first.Name || first.name || '';
  } catch (error) {
    console.warn('Error fetching owner description:', error);
    const ownerDescInput = document.getElementById('ownerDescription');
    if (ownerDescInput) ownerDescInput.value = '';
  }
}

// Expose for other modules (e.g. modals) to trigger refresh
window.fetchOwnerDescription = fetchOwnerDescription;

async function initializeServices() {
  // Wait for services to be available
  if (window.ServiceLoader) {
    try {
      console.log('Loading services...');
      await window.ServiceLoader.loadCore();
      
      // Load CustomCodesLookupService
      if (window.ServiceLoader.loadCustomCodesLookupService) {
        await window.ServiceLoader.loadCustomCodesLookupService();
      }
      
      console.log('Services loaded, LookupService:', !!window.LookupService, 'CustomCodesLookupService:', !!window.customCodesLookupService);
      
      // Load collateral types dropdown
      await loadCollateralTypes();
      
      // Load nature of charge dropdown
      await loadNatureOfCharge();
    } catch (error) {
      console.warn('Error loading services:', error);
    }
  } else {
    console.log('ServiceLoader not available, services may already be loaded');
  }
}

async function loadCollateralTypes() {
  const collateralTypeSelect = document.getElementById('collateralType');
  if (!collateralTypeSelect) return;
  
  try {
    if (window.customCodesLookupService) {
      const options = await window.customCodesLookupService.getCustomCodeOptions('CollateralTypeID');
      console.log('Collateral Type options loaded:', options);
      
      // Clear existing options except the first one (--Select--)
      collateralTypeSelect.innerHTML = '<option value="">--Select--</option>';
      
      // Add options from the API
      options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        collateralTypeSelect.appendChild(option);
      });
    } else {
      console.warn('customCodesLookupService not available');
    }
  } catch (error) {
    console.error('Error loading collateral types:', error);
  }
}

async function loadNatureOfCharge() {
  const natureOfChargeSelect = document.getElementById('natureOfCharge');
  if (!natureOfChargeSelect) return;
  
  try {
    if (window.LookupService) {
      const options = await window.LookupService.getSystemCodeOptions('NatureOfChargeID');
      console.log('Nature Of Charge options loaded:', options);
      
      // Clear existing options except the first one (--Select--)
      natureOfChargeSelect.innerHTML = '<option value="">--Select--</option>';
      
      // Add options from the API
      options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        natureOfChargeSelect.appendChild(option);
      });
    } else {
      console.warn('LookupService not available');
    }
  } catch (error) {
    console.error('Error loading nature of charge:', error);
  }
}

function setupBranchLookup() {
  const branchIdInput = document.getElementById('branchId');
  
  if (branchIdInput) {
    // Auto-search when branch ID is entered and user leaves field
    branchIdInput.addEventListener('blur', function() {
      if (this.value.trim() !== '') {
        fetchBranchDetails(this.value.trim());
      }
    });
    
    // Search on Enter or Tab
    branchIdInput.addEventListener('keydown', function(e) {
      if ((e.key === 'Enter' || e.key === 'Tab') && this.value.trim() !== '') {
        if (e.key === 'Enter') {
          e.preventDefault();
        }
        fetchBranchDetails(this.value.trim());
      }
    });
  }
}

function initializeForm() {
  // Set default values
  document.getElementById('status').value = 'Active';
  
  // Set current date as lodged date
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('lodgedDate').value = today;
}

// ========== SIDEBAR TOGGLE ==========
function toggleSubmenu(button) {
  const submenu = button.nextElementSibling;
  
  button.classList.toggle('collapsed');
  submenu.classList.toggle('collapsed');
}

// ========== CARD TOGGLE ==========
function toggleCard(header) {
  header.classList.toggle('collapsed');
  const body = header.nextElementSibling;
  if (body) {
    body.classList.toggle('collapsed');
  }
}

// ========== MODAL FUNCTIONS ==========
function openCollateralPropertiesDetailsModal(event) {
  if (event) event.preventDefault();

  const collateralId = (document.getElementById('collateralId')?.value ?? '').trim();
  if (!collateralId) {
    showStatusMessage('You are required to Enter collateral Data', 'error');
    document.getElementById('collateralId')?.focus();
    return;
  }

  const branchId = (document.getElementById('branchId')?.value ?? '').trim();

  const modalEl = document.getElementById('collateralPropertiesDetailsModal');
  if (!modalEl || !window.bootstrap?.Modal) return;

  const iframe = modalEl.querySelector('iframe.legacy-modal__iframe') || modalEl.querySelector('iframe');
  if (!iframe) {
    console.warn('More Details iframe not found inside modal');
    return;
  }

  // Category -> form routing. Easy to extend.
  const MORE_DETAILS_FORMS = Object.freeze({
    VEH: {
      src: 'Data entry/collateral-vehicles-details.html',
      title: 'Collateral Vehicles Details',
      loader: 'loadCollateralVehiclesDetails'
    },
    PRO: {
      src: 'Data entry/collateral-properties-details.html',
      title: 'Collateral Properties Details',
      loader: 'loadCollateralProperties'
    },
    DEFAULT: {
      src: 'Data entry/collateral-more-detail.html',
      title: 'Collateral More Details',
      loader: 'loadCollateralProperties'
    }
  });

  const normalizeCategoryId = (value) => String(value ?? '').trim().toUpperCase();
  const isMoreDetailsRoutingDebugEnabled = () => {
    // Off by default. Enable for UAT via:
    // 1) DevTools: localStorage.setItem('kairo.debug.moreDetailsRouting', '1')
    // 2) Or set: window.__kairoDebugMoreDetailsRouting = true
    try {
      if (window.__kairoDebugMoreDetailsRouting === true) return true;
      return window.localStorage?.getItem('kairo.debug.moreDetailsRouting') === '1';
    } catch {
      return false;
    }
  };
  const resolveFormConfig = (categoryId) => {
    const key = normalizeCategoryId(categoryId);
    return MORE_DETAILS_FORMS[key] || MORE_DETAILS_FORMS.DEFAULT;
  };

  const getCategoryIdFromCurrentRecord = () => {
    const details01 = currentRecord?._details01;
    return details01?.CollateralCategoryID;
  };

  const ensureCurrentRecordForCategory = async () => {
    // If currentRecord is missing or doesn't match the current input, fetch fresh.
    if (!branchId) return;
    const currentCollateralId = String(currentRecord?.collateralId ?? '').trim();
    if (!currentRecord || currentCollateralId !== collateralId) {
      try {
        const collateralData = await fetchCollateralDetails(branchId, collateralId);
        if (collateralData) {
          currentRecord = collateralData;
        }
      } catch (e) {
        console.warn('Unable to refresh collateral data for category routing:', e);
      }
    }
  };

  const callIframeLoader = (config) => {
    const loaderName = config?.loader;
    const fn = loaderName ? iframe.contentWindow?.[loaderName] : null;
    if (typeof fn === 'function') {
      fn(branchId, collateralId);
      return;
    }

    // Small retry to allow iframe scripts to initialize.
    setTimeout(() => {
      const retryFn = loaderName ? iframe.contentWindow?.[loaderName] : null;
      if (typeof retryFn === 'function') {
        retryFn(branchId, collateralId);
      }
    }, 300);
  };

  const cacheBustUrl = (src) => {
    const url = String(src || '').trim();
    if (!url) return url;

    const parts = url.split('#');
    const base = parts[0];
    const hash = parts.length > 1 ? `#${parts.slice(1).join('#')}` : '';

    const cacheBust = `__r=${Date.now()}`;
    let nextBase;
    if (/[?&]__r=\d+/.test(base)) {
      nextBase = base.replace(/([?&])__r=\d+/, `$1${cacheBust}`);
    } else {
      nextBase = `${base}${base.includes('?') ? '&' : '?'}${cacheBust}`;
    }

    return `${nextBase}${hash}`;
  };

  const openModalWithConfig = (config) => {
    iframe.onload = () => callIframeLoader(config);

    // Always reload the iframe when opening, so any unsaved typed values
    // from a previous session are cleared.
    iframe.setAttribute('src', cacheBustUrl(config.src));
    iframe.setAttribute('title', config.title);

    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  };

  (async () => {
    await ensureCurrentRecordForCategory();
    const categoryId = getCategoryIdFromCurrentRecord();
    const config = resolveFormConfig(categoryId);

    if (isMoreDetailsRoutingDebugEnabled()) {
      console.log('[MoreDetailsRouting]', {
        branchId,
        collateralId,
        CollateralCategoryID: normalizeCategoryId(categoryId) || '(missing)',
        targetSrc: config.src,
        targetTitle: config.title,
        loader: config.loader
      });
    }

    openModalWithConfig(config);
  })();
}

function closeModal(modalId) {
  const modalEl = document.getElementById(modalId);
  if (!modalEl || !window.bootstrap?.Modal) return;

  const iframe = modalEl.querySelector('iframe.legacy-modal__iframe') || modalEl.querySelector('iframe');

  // Clear iframe content on close so reopening starts clean.
  // (We reload with a cache-bust on open anyway, but this prevents
  // any perceived persistence while the modal is hidden.)
  const clearIframe = () => {
    if (iframe) {
      iframe.onload = null;
      iframe.setAttribute('src', 'about:blank');
    }
  };

  // Only run after the modal is fully hidden.
  modalEl.addEventListener('hidden.bs.modal', clearIframe, { once: true });

  const modal = bootstrap.Modal.getInstance(modalEl) || bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.hide();
}

// Make closeModal globally available for iframe communication
window.closeModal = closeModal;

// ========== STANDARD UI SHELL (header/sidebar/sections) ==========
function wireStandardUiShell() {
  wireHeaderWindowControls();
  wireSidebarToggle();
  wireNavSectionToggles();
  wireSubmoduleSearch();
  wireCollapsibleSections();
  wireSidebarKeyboardActivation();
}

function wireSidebarKeyboardActivation() {
  const sidebar = document.getElementById('main-sidebar');
  if (!sidebar) return;

  sidebar.addEventListener('keydown', function(e) {
    const key = e.key;
    if (key !== 'Enter' && key !== ' ') return;
    const target = e.target?.closest('[role="button"]');
    if (!target) return;

    e.preventDefault();
    target.click();
  });
}

function wireHeaderWindowControls() {
  const header = document.querySelector('.am-header');
  if (!header) return;

  header.addEventListener('click', function(e) {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    const windowEl = document.querySelector('.window');

    switch (action) {
      case 'refresh':
        window.location.reload();
        break;
      case 'maximize':
        if (windowEl) windowEl.classList.toggle('maximized');
        break;
      case 'minimize':
        // Best-effort: notify parent container (if embedded)
        try {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({ action: 'minimizeChild', source: 'collateral-maintenance' }, '*');
          }
        } catch (err) {
          console.warn('Minimize not available:', err);
        }
        break;
      case 'close':
        try {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({ action: 'submoduleClosed', source: 'collateral-maintenance' }, '*');
          } else {
            window.close();
          }
        } catch (err) {
          console.warn('Close not available:', err);
        }
        break;
    }
  });
}

function wireSidebarToggle() {
  const toggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('main-sidebar');
  const mainContainer = document.querySelector('.main-container');
  if (!toggle || !sidebar) return;

  toggle.addEventListener('click', function() {
    const isCollapsed = sidebar.classList.toggle('collapsed');
    if (mainContainer) {
      mainContainer.classList.toggle('sidebar-collapsed', isCollapsed);
    }
    toggle.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');

    // When collapsed, ensure nav items are visible for icon-only display
    document.querySelectorAll('.nav-items--card').forEach(items => {
      if (!items) return;
      if (isCollapsed) items.hidden = false;
    });
  });
}

function setNavSectionOpen(section, open) {
  if (!section) return;
  section.classList.toggle('is-open', !!open);
  section.classList.toggle('expanded', !!open);

  const items = section.querySelector('.nav-items--card');
  if (items) items.hidden = !open;

  const arrow = section.querySelector('.nav-arrow');
  if (arrow) arrow.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function wireNavSectionToggles() {
  document.querySelectorAll('[data-nav-section]').forEach(section => {
    const arrow = section.querySelector('.nav-arrow');
    const header = section.querySelector('.nav-header');
    const items = section.querySelector('.nav-items--card');

    // Default open if not explicitly hidden
    const defaultOpen = items ? !items.hidden : true;
    setNavSectionOpen(section, defaultOpen);

    const toggleFn = () => {
      const isOpen = section.classList.contains('is-open') || section.classList.contains('expanded');
      setNavSectionOpen(section, !isOpen);
    };

    if (arrow) {
      arrow.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleFn();
      });
    } else if (header) {
      header.addEventListener('click', function() {
        toggleFn();
      });
    }
  });
}

function wireSubmoduleSearch() {
  const searchInput = document.getElementById('submoduleSearch');
  const clearBtn = document.getElementById('submoduleSearchClear');
  if (!searchInput) return;

  const allItems = Array.from(document.querySelectorAll('.sidebar-item, .sidebar-item--enhanced'));
  const allSections = Array.from(document.querySelectorAll('[data-nav-section]'));

  const performSearch = () => {
    const query = (searchInput.value || '').trim().toLowerCase();
    if (clearBtn) clearBtn.hidden = !query;

    if (!query) {
      allItems.forEach(item => (item.style.display = ''));
      // Reset sections to open by default
      allSections.forEach(section => setNavSectionOpen(section, true));
      return;
    }

    allItems.forEach(item => {
      const text = (item.textContent || '').toLowerCase();
      item.style.display = text.includes(query) ? '' : 'none';
    });

    allSections.forEach(section => {
      const visibleItems = section.querySelectorAll(
        '.sidebar-item:not([style*="display: none"]), .sidebar-item--enhanced:not([style*="display: none"])'
      );
      setNavSectionOpen(section, visibleItems.length > 0);
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
}

function wireCollapsibleSections() {
  document.querySelectorAll('.form-section[data-section]').forEach(section => {
    const header = section.querySelector('[data-section-toggle]');
    const content = section.querySelector('[data-section-content]');
    const toggleBtn = section.querySelector('.section-toggle-btn');
    if (!header || !content) return;

    header.addEventListener('click', function(e) {
      // Don't toggle if clicking on a button (except the toggle button itself)
      if (e.target.closest('button') && !e.target.closest('.section-toggle-btn')) return;
      // Don't toggle if clicking on a checkbox or its label
      if (e.target.closest('input[type="checkbox"]') || e.target.closest('label[for]')) return;

      const isCollapsed = section.classList.contains('collapsed');
      section.classList.toggle('collapsed', !isCollapsed);
      if (toggleBtn) toggleBtn.setAttribute('aria-expanded', isCollapsed ? 'true' : 'false');
    });
  });
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
  // Form submit prevention
  document.getElementById('collateralForm').addEventListener('submit', function(e) {
    e.preventDefault();
  });

  // Insured checkbox dependency
  document.getElementById('insured').addEventListener('change', function() {
    if (this.checked) {
      showStatusMessage('Remember to update insurance details in Collateral Insurance section', 'info');
    }
  });

  // Collateral Age auto-calculation on buying date change
  document.getElementById('buyingDate').addEventListener('change', function() {
    calculateCollateralAge();
  });
}

// ========== UTILITY FUNCTIONS ==========
function calculateCollateralAge() {
  const buyingDate = document.getElementById('buyingDate').value;
  if (buyingDate) {
    const today = new Date();
    const buying = new Date(buyingDate);
    const ageInYears = Math.floor((today - buying) / (365.25 * 24 * 60 * 60 * 1000));
    document.getElementById('collateralAge').value = ageInYears;
  }
}

// ========== SEARCH FUNCTIONS ==========
function searchCollateral() {
  // Check if Branch ID is entered first
  const branchId = document.getElementById('branchId')?.value.trim();
  if (!branchId) {
    showStatusMessage('Please enter Branch ID first before searching collaterals.', 'warning');
    document.getElementById('branchId')?.focus();
    return;
  }
  
  // Open the collateral search modal - it will auto-load all collaterals for this branch
  const modalElement = document.getElementById('collateralSearchModal');
  if (modalElement) {
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
  } else {
    showStatusMessage('Collateral search modal not loaded yet. Please try again.', 'warning');
  }
}

async function searchBranch() {
  const branchId = document.getElementById('branchId').value.trim();
  if (branchId) {
    await fetchBranchDetails(branchId);
  } else {
    showStatusMessage('Please enter a Branch ID first', 'warning');
  }
}

async function fetchBranchDetails(branchId) {
  try {
    const branchNameInput = document.getElementById('branchName');
    
    // Check if LookupService is available
    if (!window.LookupService) {
      console.warn('LookupService not available');
      showStatusMessage('Branch lookup service not available', 'warning');
      return;
    }
    
    const requestData = {
      BankID: '00'
    };
    
    const result = await window.LookupService.getBranches(requestData);
    console.log('GetBranches Result:', result);
    
    if (result.success && result.data) {
      // Extract branches array
      let branches = Array.isArray(result.data) ? result.data : (result.Details || []);
      
      // Find exact match or partial match
      const exactMatch = branches.find(b => b.OurBranchID === branchId);
      
      if (exactMatch) {
        // Exact match found - populate
        branchNameInput.value = exactMatch.BranchName || '';
        console.log('Branch found:', exactMatch.BranchName);
        showStatusMessage('Branch found: ' + exactMatch.BranchName, 'success');
      } else {
        // Try partial match
        const lowerBranchId = branchId.toLowerCase();
        const partialMatches = branches.filter(b => 
          (b.OurBranchID || '').toLowerCase().includes(lowerBranchId)
        );
        
        if (partialMatches.length === 1) {
          // Single partial match
          const branch = partialMatches[0];
          document.getElementById('branchId').value = branch.OurBranchID;
          branchNameInput.value = branch.BranchName || '';
          console.log('Branch found:', branch.BranchName);
          showStatusMessage('Branch found: ' + branch.BranchName, 'success');
        } else if (partialMatches.length > 1) {
          branchNameInput.value = '';
          showStatusMessage('Multiple branches match, please be more specific', 'warning');
        } else {
          branchNameInput.value = '';
          showStatusMessage('Branch not found', 'warning');
        }
      }
    } else {
      branchNameInput.value = '';
      showStatusMessage('Branch not found', 'warning');
    }
  } catch (error) {
    console.error('Error fetching branch details:', error);
    document.getElementById('branchName').value = '';
    showStatusMessage('Error fetching branch details', 'error');
  }
}

function searchOwner() {
  // Open the owner search modal
  const modalElement = document.getElementById('ownerSearchModal');
  if (modalElement) {
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
  } else {
    showStatusMessage('Owner search modal not loaded yet. Please try again.', 'warning');
  }
}

// ========== CRUD OPERATIONS ==========
async function handleView() {
  const branchId = document.getElementById('branchId').value.trim();
  const collateralId = document.getElementById('collateralId').value.trim();
  
  if (!branchId) {
    showStatusMessage('Please enter Branch ID', 'warning');
    document.getElementById('branchId').focus();
    return;
  }
  
  if (!collateralId) {
    showStatusMessage('Please enter Collateral ID', 'warning');
    document.getElementById('collateralId').focus();
    return;
  }
  
  try {
    showStatusMessage('Fetching collateral details...', 'info');
    
    // Call the GET stored procedure
    const collateralData = await fetchCollateralDetails(branchId, collateralId);
    
    if (collateralData) {
      currentRecord = collateralData;
      loadRecordData(currentRecord);
      disableEdit();
      showStatusMessage('Collateral details loaded successfully', 'success');
    } else {
      showStatusMessage('Collateral not found', 'warning');
    }
  } catch (error) {
    console.error('Error fetching collateral:', error);
    showStatusMessage('Error fetching collateral details', 'error');
  }
}

async function fetchCollateralDetails(branchId, collateralId) {
  const apiUrl = 'http://172.16.2.31:3306/api/OldAPI';
  const operatorId = sessionStorage.getItem('operatorId') || sessionStorage.getItem('username') || 'ADMIN';
  
  const requestBody = {
    RequestID: "dbo.p_GetCollaterals",
    FormId: "dbo.p_GetCollaterals",
    RequestData: {
      OurBranchID: branchId,
      CollateralID: collateralId,
      OperatorID: operatorId,
      Direction: "0"
    },
    RequestTime: new Date().toLocaleString('en-US', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false 
    }).replace(',', ''),
    AppName: "PROJECT_KAIRO",
    Checksum: ""
  };
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'accept': '*/*'
    },
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    throw new Error('API request failed');
  }
  
  const data = await response.json();
  console.log('p_GetCollaterals Response:', data);
  
  // The API returns data in Details02 array
  if (data.Details02 && Array.isArray(data.Details02) && data.Details02.length > 0) {
    const item = data.Details02[0];
    return {
      branchId: branchId,
      collateralId: item.CollateralID,
      description: item.Description,
      collateralTypeId: item.CollateralTypeID,
      ownerId: item.OwnerClientID,
      lodgedDate: item.LodgedDate,
      chargeNature: item.ChargeNature || item.NatureOfCharge,
      marketValue: item.MarketValue,
      forcedSaleValue: item.ForcedSaleValue,
      valuationDate: item.ValuationDate,
      expiryDate: item.ExpiryDate,
      securityLocationId: item.SecurityLocationID,
      securityDepotId: item.SecurityDepotID,
      _rawData: item,
      _details01: data.Details01 && data.Details01[0]
    };
  }
  
  return null;
}

async function handleAdd() {
  const branchIdInput = document.getElementById('branchId');
  const collateralIdInput = document.getElementById('collateralId');
  
  // Check if branch ID is entered
  if (!branchIdInput.value.trim()) {
    showStatusMessage('Please enter Branch ID first', 'warning');
    branchIdInput.focus();
    return;
  }
  
  isEditMode = true;
  currentRecord = null;
  
  clearForm();
  
  // Restore branch ID and fetch branch name
  const savedBranchId = branchIdInput.value.trim();
  branchIdInput.value = savedBranchId;
  await fetchBranchDetails(savedBranchId);
  
  enableFormFields();
  
  // Set Collateral ID as auto-generated
  collateralIdInput.setAttribute('readonly', true);
  collateralIdInput.disabled = true;
  collateralIdInput.value = '';
  collateralIdInput.placeholder = 'Auto-generated';
  
  // Focus on description field
  document.getElementById('description').focus();
  
  // Enable save button
  document.getElementById('saveBtn').disabled = false;
  
  showStatusMessage('Add new collateral - fill in required fields. Collateral ID will be auto-generated.', 'info');
}

function handleEdit() {
  if (!currentRecord) {
    showStatusMessage('Please select a record to edit', 'warning');
    return;
  }

  isEditMode = true;
  enableFormFields();
  
  // Collateral ID and Branch ID should remain readonly when editing
  document.getElementById('collateralId').readOnly = true;
  document.getElementById('branchId').readOnly = true;
  
  // Enable save button
  document.getElementById('saveBtn').disabled = false;
  
  showStatusMessage('Edit mode enabled - modify fields and save', 'info');
}

async function handleSave() {
  if (!validateForm()) {
    return;
  }

  const formData = collectFormData();
  const isNewRecord = !currentRecord;
  
  try {
    showStatusMessage(isNewRecord ? 'Creating new collateral...' : 'Updating collateral...', 'info');
    
    const result = await saveCollateral(formData, isNewRecord);
    
    if (result.success) {
      // Extract the Collateral ID from response
      let collateralId = null;
      
      if (result.Details && result.Details.length > 0) {
        collateralId = result.Details[0].CollateralID || result.Details[0].Value;
      } else if (result.data?.CollateralID) {
        collateralId = result.data.CollateralID;
      } else if (formData.collateralId) {
        collateralId = formData.collateralId;
      }
      
      console.log('Saved Collateral ID:', collateralId);
      
      if (isNewRecord && collateralId) {
        // Update the form with the new Collateral ID
        document.getElementById('collateralId').value = collateralId;
        formData.collateralId = collateralId;
        currentRecord = formData;
        
        showStatusMessage(`Collateral created successfully. ID: ${collateralId}`, 'success');
      } else if (!isNewRecord) {
        currentRecord = formData;
        showStatusMessage('Collateral updated successfully', 'success');
      } else {
        showStatusMessage('Collateral saved successfully', 'success');
      }
      
      disableEdit();
      document.getElementById('saveBtn').disabled = true;
      
    } else {
      showStatusMessage(result.message || 'Error saving collateral', 'error');
    }
  } catch (error) {
    console.error('Error saving collateral:', error);
    showStatusMessage('Error saving collateral. Please try again.', 'error');
  }
}

async function saveCollateral(formData, isNewRecord) {
  const apiUrl = 'http://172.16.2.31:3306/api/OldAPI';
  const operatorId = sessionStorage.getItem('operatorId') || sessionStorage.getItem('username') || 'ADMIN';
  
  // Helper to format date for SQL (YYYY-MM-DD HH:MM:SS)
  const getSqlDate = (dateVal) => {
    if (!dateVal) return null;
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 19).replace('T', ' ');
  };
  
  const requestBody = {
    RequestID: "dbo.p_AddEditCollaterals",
    FormId: "dbo.p_AddEditCollaterals",
    RequestData: {
      CollateralID: formData.collateralId || '',
      Description: formData.description || '',
      OurBranchID: formData.branchId || '',
      CollateralTypeID: formData.collateralType || '',
      OwnerClientID: formData.ownerId || '',
      LodgedDate: getSqlDate(formData.lodgedDate) || getSqlDate(new Date()),
      IsInsured: formData.insured ? '1' : '0',
      NatureOfChargeID: formData.natureOfCharge || '',
      Remarks: formData.remarks || '',
      CreatedBy: operatorId,
      CreatedOn: getSqlDate(new Date()),
      ModifiedBy: operatorId,
      ModifiedOn: getSqlDate(new Date()),
      SupervisedBy: operatorId,
      NewRecord: isNewRecord ? '1' : '0'
    },
    RequestTime: new Date().toLocaleString('en-US', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false 
    }).replace(',', ''),
    AppName: "PROJECT_KAIRO",
    Checksum: ""
  };
  
  console.log('Saving collateral with payload:', requestBody);
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'accept': '*/*'
    },
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    throw new Error('API request failed');
  }
  
  const data = await response.json();
  console.log('Save collateral response:', data);
  
  return {
    success: true,
    data: data,
    Details: data.Details,
    message: 'Collateral saved successfully'
  };
}

function handleDelete() {
  if (!currentRecord) {
    showStatusMessage('Please select a record to delete', 'warning');
    return;
  }

  if (confirm('Are you sure you want to delete this collateral? This action cannot be undone.')) {
    deleteRecord(currentRecord);
  }
}

function handleCancel() {
  if (isEditMode) {
    if (confirm('Discard all changes?')) {
      isEditMode = false;
      
      if (currentRecord) {
        loadRecordData(currentRecord);
      } else {
        clearForm();
      }
      
      disableEdit();
      showStatusMessage('Changes discarded', 'info');
    }
  } else {
    clearForm();
    currentRecord = null;
    showStatusMessage('Form cleared', 'info');
  }
}

function handleWithdraw() {
  if (!currentRecord) {
    showStatusMessage('Please select a collateral to withdraw', 'warning');
    return;
  }

  const reason = prompt('Enter withdrawal reason:');
  if (reason) {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('withdrawnDate').value = today;
    document.getElementById('withdrawnReason').value = reason;
    document.getElementById('status').value = 'Withdrawn';
    
    showStatusMessage('Collateral marked as withdrawn', 'success');
  }
}

function handlePrevious() {
  showStatusMessage('Navigate to previous record - feature to be implemented', 'info');
}

function handleNext() {
  showStatusMessage('Navigate to next record - feature to be implemented', 'info');
}

// ========== FORM MANAGEMENT ==========
function enableFormFields() {
  const form = document.getElementById('collateralForm');
  const inputs = form.querySelectorAll('input:not([readonly]), select, textarea');
  
  inputs.forEach(input => {
    // Don't enable Behind The Scene fields
    if (!input.closest('.kairo-card:nth-child(2)') || 
        input.id === 'collateralValue' || 
        input.id === 'currencyId' || 
        input.id === 'usedCollateralValue') {
      if (!input.id.startsWith('created') && 
          !input.id.startsWith('modified') && 
          !input.id.startsWith('supervised') &&
          !input.id.startsWith('withdrawn') &&
          input.id !== 'status' &&
          input.id !== 'valueType') {
        input.disabled = false;
      }
    }
  });
  
  document.getElementById('saveBtn').disabled = false;
  document.getElementById('cancelBtn').disabled = false;
}

function disableEdit() {
  const form = document.getElementById('collateralForm');
  const inputs = form.querySelectorAll('input, select, textarea');
  
  inputs.forEach(input => {
    input.disabled = true;
  });
  
  document.getElementById('saveBtn').disabled = true;
  document.getElementById('cancelBtn').disabled = true;
  
  isEditMode = false;
}

function clearForm() {
  const form = document.getElementById('collateralForm');
  
  // Clear all text inputs except branch fields
  form.querySelectorAll('input[type="text"], input[type="date"], input[type="number"]').forEach(input => {
    if (!input.readOnly && input.id !== 'branchId' && input.id !== 'branchName') {
      input.value = '';
    }
  });
  
  // Clear textareas
  form.querySelectorAll('textarea').forEach(textarea => {
    textarea.value = '';
  });
  
  // Reset selects to first option
  form.querySelectorAll('select').forEach(select => {
    select.selectedIndex = 0;
  });
  
  // Uncheck all checkboxes
  form.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.checked = false;
  });
  
  // Clear audit fields
  document.getElementById('createdBy').value = '';
  document.getElementById('createdOn').value = '';
  document.getElementById('modifiedBy').value = '';
  document.getElementById('modifiedOn').value = '';
  document.getElementById('supervisedBy').value = '';
  document.getElementById('supervisedOn').value = '';
  
  // Clear Behind The Scene fields
  document.getElementById('collateralValue').value = '';
  document.getElementById('currencyId').value = '';
  document.getElementById('usedCollateralValue').value = '';
  document.getElementById('valueType').value = '';
  document.getElementById('withdrawnDate').value = '';
  document.getElementById('status').value = 'Active';
  document.getElementById('withdrawnReason').value = '';

  // Clear Owner Description (readonly field)
  const ownerDesc = document.getElementById('ownerDescription');
  if (ownerDesc) ownerDesc.value = '';

  // Reset auto-grow textarea back to one line
  const remarksEl = document.getElementById('remarks');
  if (remarksEl && window.__kairoAutoGrow?.setOneLineHeight) {
    window.__kairoAutoGrow.setOneLineHeight(remarksEl);
  }

  const withdrawnReasonEl = document.getElementById('withdrawnReason');
  if (withdrawnReasonEl && window.__kairoAutoGrow?.setOneLineHeight) {
    window.__kairoAutoGrow.setOneLineHeight(withdrawnReasonEl);
  }
  
  // Restore defaults
  initializeForm();
}

function loadRecordData(record) {
  console.log('Loading record:', record);
  
  if (!record) return;
  
  // Use raw data from Details02 for main form fields
  const rawData = record._rawData || record;
  // Use Details01 for "Behind The Scene" section fields
  const details01 = record._details01 || {};
  
  // Collateral Details section (from Details02)
  document.getElementById('branchId').value = record.branchId || rawData.OurBranchID || '';
  document.getElementById('collateralId').value = record.collateralId || rawData.CollateralID || '';
  document.getElementById('description').value = record.description || rawData.Description || '';
  document.getElementById('collateralType').value = record.collateralTypeId || rawData.CollateralTypeID || '';
  document.getElementById('ownerId').value = record.ownerId || rawData.OwnerClientID || '';
  fetchOwnerDescription(record.ownerId || rawData.OwnerClientID || '');
  document.getElementById('lodgedDate').value = formatDateForInput(record.lodgedDate || rawData.LodgedDate);
  document.getElementById('buyingDate').value = formatDateForInput(rawData.BuyingDate);
  document.getElementById('insured').checked = rawData.IsInsured === true || rawData.IsInsured === 'Y' || rawData.IsInsured === 1;
  document.getElementById('collateralAge').value = rawData.CollateralAge || '';
  document.getElementById('natureOfCharge').value = rawData.NatureOfChargeID || record.chargeNature || rawData.NatureOfCharge || rawData.ChargeNature || '';
  document.getElementById('remarks').value = rawData.Remarks || '';

  // Refresh auto-grow height after programmatic value set
  const remarksEl = document.getElementById('remarks');
  if (remarksEl && window.__kairoAutoGrow?.autoResize) {
    window.__kairoAutoGrow.autoResize(remarksEl);
  }
  
  // Behind The Scene section (from Details01)
  document.getElementById('collateralValue').value = details01.CollateralValue ?? rawData.CollateralValue ?? rawData.MarketValue ?? '';
  document.getElementById('currencyId').value = details01.CurrencyID ?? rawData.CurrencyID ?? '';
  document.getElementById('usedCollateralValue').value = details01.CollateralValueUsed ?? rawData.UsedCollateralValue ?? '';
  document.getElementById('valueType').value = details01.CollateralValueTypeID ?? rawData.ValueType ?? '';
  document.getElementById('withdrawnDate').value = formatDateForInput(details01.WithdrawnDate ?? rawData.WithdrawnDate);
  document.getElementById('status').value = details01.CollateralStatus ?? rawData.Status ?? '';
  document.getElementById('withdrawnReason').value = details01.WithdrawnReason ?? rawData.WithdrawnReason ?? '';

  // Refresh auto-grow heights after programmatic value set
  const withdrawnReasonEl = document.getElementById('withdrawnReason');
  if (withdrawnReasonEl && window.__kairoAutoGrow?.autoResize) {
    window.__kairoAutoGrow.autoResize(withdrawnReasonEl);
  }
  
  // Audit fields (from Details02)
  document.getElementById('createdBy').value = rawData.CreatedBy || rawData.AddedOperatorID || '';
  document.getElementById('modifiedBy').value = rawData.ModifiedBy || rawData.UpdatedOperatorID || '';
  document.getElementById('supervisedBy').value = rawData.SupervisedBy || rawData.ApprovalOperatorID || '';
  document.getElementById('createdOn').value = formatDateForDisplay(rawData.CreatedOn || rawData.AddedDate);
  document.getElementById('modifiedOn').value = formatDateForDisplay(rawData.ModifiedOn || rawData.UpdatedDate);
  document.getElementById('supervisedOn').value = formatDateForDisplay(rawData.SupervisedOn || rawData.ApprovalDate);
  
  // Fetch branch name if we have branch ID
  if (record.branchId || rawData.OurBranchID) {
    fetchBranchDetails(record.branchId || rawData.OurBranchID);
  }
}

// Helper function to format date for input[type="date"]
function formatDateForInput(dateValue) {
  if (!dateValue) return '';
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  } catch (e) {
    return '';
  }
}

// Helper function to format date for display
function formatDateForDisplay(dateValue) {
  if (!dateValue) return '';
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return '';
  }
}

function collectFormData() {
  const form = document.getElementById('collateralForm');
  const formData = {};
  
  // Collect all form fields
  form.querySelectorAll('input, select, textarea').forEach(field => {
    if (field.type === 'checkbox') {
      formData[field.id] = field.checked;
    } else {
      formData[field.id] = field.value;
    }
  });
  
  return formData;
}

// ========== VALIDATION ==========
function validateForm() {
  const isNewRecord = !currentRecord;
  
  const requiredFields = [
    { id: 'branchId', label: 'Branch ID' },
    { id: 'description', label: 'Description' },
    { id: 'collateralType', label: 'Collateral Type' },
    { id: 'ownerId', label: 'Owner ID' },
    { id: 'lodgedDate', label: 'Lodged Date' },
    { id: 'natureOfCharge', label: 'Nature Of Charge' }
  ];
  
  // Only validate Collateral ID if editing (not for new records - it's auto-generated)
  if (!isNewRecord) {
    requiredFields.unshift({ id: 'collateralId', label: 'Collateral ID' });
  }
  
  for (const field of requiredFields) {
    const input = document.getElementById(field.id);
    
    if (!input.value.trim()) {
      showStatusMessage(`${field.label} is required`, 'error');
      input.focus();
      input.style.borderColor = '#E74C3C';
      
      setTimeout(() => {
        input.style.borderColor = '';
      }, 3000);
      
      return false;
    }
  }
  
  // Validate date range
  const lodgedDate = document.getElementById('lodgedDate').value;
  const buyingDate = document.getElementById('buyingDate').value;
  
  if (buyingDate && lodgedDate && new Date(lodgedDate) < new Date(buyingDate)) {
    showStatusMessage('Lodged Date must be after or equal to Buying Date', 'error');
    document.getElementById('lodgedDate').focus();
    return false;
  }
  
  return true;
}

// ========== DATA OPERATIONS (Backend Integration Required) ==========
function createRecord(formData) {
  // Backend API call required
  console.log('Creating record:', formData);
  
  // Simulate success
  const currentUser = 'System User';
  const currentDateTime = new Date().toLocaleString();
  
  document.getElementById('createdBy').value = currentUser;
  document.getElementById('createdOn').value = currentDateTime;
  document.getElementById('status').value = 'Active';
  
  currentRecord = { ...formData, id: Date.now() };
  isEditMode = false;
  disableEdit();
  
  showStatusMessage('Collateral created successfully', 'success');
}

function updateRecord(formData) {
  // Backend API call required
  console.log('Updating record:', formData);
  
  // Simulate success
  const currentUser = 'System User';
  const currentDateTime = new Date().toLocaleString();
  
  document.getElementById('modifiedBy').value = currentUser;
  document.getElementById('modifiedOn').value = currentDateTime;
  
  currentRecord = { ...currentRecord, ...formData };
  isEditMode = false;
  disableEdit();
  
  showStatusMessage('Collateral updated successfully', 'success');
}

function deleteRecord(record) {
  // Backend API call required
  console.log('Deleting record:', record);
  
  // Simulate success
  currentRecord = null;
  clearForm();
  disableEdit();
  
  showStatusMessage('Collateral deleted successfully', 'success');
}

// ========== STATUS MESSAGING ==========
function showStatusMessage(message, type = 'info') {
  const t = type || 'info';

  // Preferred: shared message panel
  const bar = document.querySelector('.am-message-panel');
  if (bar) {
    bar.className = `am-message-panel show ${t}`;
    const span = bar.querySelector('span');
    if (span) span.textContent = message;

    const iconEl = bar.querySelector('i');
    if (iconEl) {
      let iconClass = 'bi-info-circle';
      switch (t) {
        case 'success':
          iconClass = 'bi-check-circle';
          break;
        case 'error':
          iconClass = 'bi-exclamation-triangle';
          break;
        case 'warning':
          iconClass = 'bi-exclamation-circle';
          break;
        default:
          iconClass = 'bi-info-circle';
          break;
      }
      iconEl.className = `bi ${iconClass}`;
    }

    setTimeout(() => {
      bar.classList.remove('show');
    }, 5000);
    return;
  }

  // Backwards-compatible fallback
  const statusDiv = document.getElementById('statusMessage');
  if (!statusDiv) return;

  let icon = '';
  switch (t) {
    case 'success':
      icon = '<i class="bi bi-check-circle"></i>';
      break;
    case 'error':
      icon = '<i class="bi bi-exclamation-triangle"></i>';
      break;
    case 'warning':
      icon = '<i class="bi bi-exclamation-circle"></i>';
      break;
    case 'info':
    default:
      icon = '<i class="bi bi-info-circle"></i>';
      break;
  }

  statusDiv.innerHTML = `${icon} <span>${message}</span>`;
  statusDiv.className = `status-message ${t} show`;
  setTimeout(() => statusDiv.classList.remove('show'), 5000);
}

// ========== KEYBOARD NAVIGATION ==========
document.addEventListener('keydown', function(e) {
  // Ctrl+S to save
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    if (isEditMode) {
      handleSave();
    }
  }
  
  // Escape to cancel
  if (e.key === 'Escape') {
    if (isEditMode) {
      handleCancel();
    }
  }
});
