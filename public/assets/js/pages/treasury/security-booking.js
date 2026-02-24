document.addEventListener('DOMContentLoaded', () => {
  const tabsEl = document.getElementById('securityBookingTabs');
  const behindTheSceneEl = document.getElementById('sbBehindTheScene');

  // =========================================================================
  // CHILD FORMS - Account Maintenance Pattern
  // =========================================================================
  const CHILD_FORMS = {
    'amortization': '../data-entry/security-booking-amortization.html'
  };

  // Forms that require a loaded booking before navigation
  const BOOKING_REQUIRED_FORMS = ['amortization'];

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

    // Check if this form requires a loaded booking
    if (BOOKING_REQUIRED_FORMS.includes(childKey)) {
      const serialId = document.getElementById('SerialId')?.value?.trim();
      if (!serialId) {
        alert('Please load a security booking before accessing this feature.');
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

    const allItems = Array.from(document.querySelectorAll('.sidebar-item--enhanced'));

    const filterItems = () => {
      const query = searchInput.value.trim().toLowerCase();
      clearBtn?.classList.toggle('d-none', !query);

      if (!query) {
        // Show all items, restore normal state
        allItems.forEach(item => item.style.display = '');
        document.querySelectorAll('.nav-section--card').forEach(section => {
          section.style.display = '';
        });
        return;
      }

      // Filter items
      allItems.forEach(item => {
        const title = item.querySelector('.sidebar-item__title')?.textContent?.toLowerCase() || '';
        const matches = title.includes(query);
        item.style.display = matches ? '' : 'none';
      });

      // Show/hide sections based on visible items
      document.querySelectorAll('.nav-section--card').forEach(section => {
        const visibleItems = section.querySelectorAll('.sidebar-item--enhanced:not([style*="display: none"])');
        section.style.display = visibleItems.length ? '' : 'none';
        // Expand sections with matches
        if (visibleItems.length) {
          setSectionOpen(section, true);
        }
      });
    };

    searchInput.addEventListener('input', filterItems);
    searchInput.addEventListener('keyup', filterItems);

    clearBtn?.addEventListener('click', () => {
      searchInput.value = '';
      filterItems();
      searchInput.focus();
    });
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
    if (data.type === 'securityBookingChildClose') {
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

  if (!tabsEl || !behindTheSceneEl) return;

  const syncBehindTheSceneVisibility = (targetSelector) => {
    const shouldHide = targetSelector === '#sb-revaluation';
    behindTheSceneEl.classList.toggle('d-none', shouldHide);
  };

  const activeTab = tabsEl.querySelector('.nav-link.active[data-bs-target]');
  if (activeTab) syncBehindTheSceneVisibility(activeTab.getAttribute('data-bs-target'));

  tabsEl.addEventListener('shown.bs.tab', (event) => {
    syncBehindTheSceneVisibility(event.target.getAttribute('data-bs-target'));
  });
});
