(() => {
  if (window.__kairoChannelsTransactionSettingsLoaded) return;
  window.__kairoChannelsTransactionSettingsLoaded = true;

  const MODES = {
    VIEW: "View",
    ADD: "Add",
    UPDATE: "Update",
  };

  const state = {
    mode: MODES.VIEW,
  };

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  // =========================================================================
  // TOAST NOTIFICATION SYSTEM - Account Maintenance Pattern
  // =========================================================================
  
  function ensureToastContainer() {
    let el = document.querySelector('[data-kairo-toast-container]');
    if (el) return el;
    el = document.createElement('div');
    el.className = 'kairo-toast-container';
    el.setAttribute('data-kairo-toast-container', '');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-relevant', 'additions');
    document.body.appendChild(el);
    return el;
  }

  function showToast(message, { title = 'Notification', variant = 'info', timeoutMs = 5000 } = {}) {
    const container = ensureToastContainer();

    const toast = document.createElement('div');
    toast.className = `kairo-toast kairo-toast--${variant}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-atomic', 'true');

    const header = document.createElement('div');
    header.className = 'kairo-toast__title';

    const titleEl = document.createElement('div');
    titleEl.textContent = title;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'kairo-toast__close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '×';

    const body = document.createElement('div');
    body.className = 'kairo-toast__body';
    body.textContent = String(message || '');

    header.appendChild(titleEl);
    header.appendChild(closeBtn);
    toast.appendChild(header);
    toast.appendChild(body);
    container.appendChild(toast);

    const remove = () => {
      try {
        toast.classList.remove('is-show');
        setTimeout(() => { if (toast.parentElement) toast.parentElement.removeChild(toast); }, 300);
      } catch { /* ignore */ }
    };

    closeBtn.addEventListener('click', remove);
    setTimeout(() => toast.classList.add('is-show'), 0);
    if (timeoutMs && timeoutMs > 0) setTimeout(remove, timeoutMs);
  }

  function setMode(nextMode) {
    state.mode = nextMode;

    // Update active button state
    qsa("[data-shell-mode]").forEach((btn) => {
      btn.classList.remove("active");
      if (btn.getAttribute("data-shell-mode") === nextMode) {
        btn.classList.add("active");
      }
    });

    const form = qs("#channels-transaction-settings-form");
    if (!form) return;

    const fields = qsa("input, select, textarea", form);
    const isEditable = nextMode === MODES.ADD || nextMode === MODES.UPDATE;

    for (const el of fields) {
      if (el.hasAttribute("data-always-enabled")) {
        el.disabled = false;
        continue;
      }
      // Keep behind-the-scene fields always disabled
      if (el.closest('[data-section="behind-scene"]')) {
        el.disabled = true;
        continue;
      }
      el.disabled = !isEditable;
    }

    // Grid toolbar buttons mimic legacy disabled state unless editing.
    qsa("[data-cts-grid-action]", form).forEach((btn) => {
      btn.disabled = !isEditable;
    });

    const saveBtn = qs('[data-cts-action="save"]');
    if (saveBtn) saveBtn.disabled = !isEditable;
  }

  function bindModeButtons() {
    qsa("[data-shell-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const next = btn.getAttribute("data-shell-mode");
        if (!next || !MODES[next.toUpperCase()]) return;
        setMode(MODES[next.toUpperCase()]);
        showToast(`Switched to ${next} mode`, { title: 'Mode Change', variant: 'info', timeoutMs: 3000 });
      });
    });
  }

  function bindSectionToggles() {
    qsa('.form-section').forEach((section) => {
      const header = section.querySelector('.section-header');
      const toggleBtn = section.querySelector('.section-toggle-btn');
      
      if (header && toggleBtn) {
        header.addEventListener('click', (e) => {
          // Don't toggle if clicking inside the toggle button itself (it handles it)
          if (e.target.closest('.section-toggle-btn')) return;
          section.classList.toggle('collapsed');
          const isExpanded = !section.classList.contains('collapsed');
          toggleBtn.setAttribute('aria-expanded', isExpanded);
        });
        
        toggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          section.classList.toggle('collapsed');
          const isExpanded = !section.classList.contains('collapsed');
          toggleBtn.setAttribute('aria-expanded', isExpanded);
        });
      }
    });
  }

  function bindActions() {
    const saveBtn = qs('[data-cts-action="save"]');
    const cancelBtn = qs('[data-cts-action="cancel"]');

    saveBtn?.addEventListener("click", () => {
      if (state.mode === MODES.VIEW) return;
      showToast('Settings saved successfully', { title: 'Success', variant: 'success', timeoutMs: 4000 });
      setMode(MODES.VIEW);
    });

    cancelBtn?.addEventListener("click", () => {
      showToast('Operation cancelled', { title: 'Cancelled', variant: 'warning', timeoutMs: 3000 });
      setMode(MODES.VIEW);
    });

    qsa("[data-cts-grid-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.getAttribute("data-cts-grid-action") || "";
        showToast(`${action.charAt(0).toUpperCase() + action.slice(1)} action triggered`, { title: 'Grid Action', variant: 'info', timeoutMs: 3000 });
      });
    });
  }

  window.addEventListener("load", () => {
    bindModeButtons();
    bindActions();
    bindSectionToggles();
    setMode(MODES.VIEW);
  });
})();
