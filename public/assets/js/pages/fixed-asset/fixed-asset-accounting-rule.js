(() => {
  if (window.__kairoFixedAssetAccountingRuleLoaded) return;
  window.__kairoFixedAssetAccountingRuleLoaded = true;

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

  function setToast(message, variant = "info") {
    // Always use kairo-toast which has proper CSS styling
    let container = qs('.kairo-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'kairo-toast-container';
      document.body.appendChild(container);
    }
    
    // Remove any existing toasts - only show one at a time
    container.querySelectorAll('.kairo-toast').forEach(existingToast => {
      existingToast.classList.remove('is-show');
      setTimeout(() => existingToast.remove(), 200);
    });
    
    const variantClass = variant === 'danger' || variant === 'warning' ? 'kairo-toast--danger' 
                       : variant === 'success' ? 'kairo-toast--success' 
                       : '';
    
    const titleText = variant === 'danger' ? 'Error' 
                    : variant === 'warning' ? 'Warning' 
                    : variant === 'success' ? 'Success' 
                    : 'Info';
    
    const toast = document.createElement('div');
    toast.className = `kairo-toast ${variantClass}`;
    toast.innerHTML = `
      <div class="kairo-toast__title">
        <span>${titleText}</span>
        <button class="kairo-toast__close" type="button">&times;</button>
      </div>
      <div class="kairo-toast__body">${message}</div>
    `;
    
    container.appendChild(toast);
    
    // Show animation - use setTimeout to ensure DOM is ready
    setTimeout(() => toast.classList.add('is-show'), 10);
    
    // Close button
    toast.querySelector('.kairo-toast__close')?.addEventListener('click', () => {
      toast.classList.remove('is-show');
      setTimeout(() => toast.remove(), 200);
    });
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      toast.classList.remove('is-show');
      setTimeout(() => toast.remove(), 200);
    }, 5000);
    
    console.log(`[FixedAssetAccountingRule] Toast (${variant}): ${message}`);
  }

  function setMode(nextMode) {
    state.mode = nextMode;

    const pill = qs("[data-page-function-pill]");
    if (pill) pill.textContent = `Mode · ${nextMode}`;

    const form = qs("#fa-ar-form");
    if (!form) return;

    const isEditable = nextMode === MODES.ADD || nextMode === MODES.UPDATE;

    qsa("input, select, textarea", form).forEach((el) => {
      if (el.hasAttribute("data-always-enabled")) {
        el.disabled = false;
        return;
      }
      el.disabled = !isEditable;
    });

    const saveBtn = qs('[data-fa-ar-action="save"]');
    const cancelBtn = qs('[data-fa-ar-action="cancel"]');
    if (saveBtn) saveBtn.disabled = !isEditable;
    if (cancelBtn) cancelBtn.disabled = false;
  }

  function bindModeButtons() {
    qsa("[data-shell-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const next = btn.getAttribute("data-shell-mode");
        if (!next || !MODES[next.toUpperCase()]) return;
        setMode(MODES[next.toUpperCase()]);
      });
    });
  }

  function bindLeftNav() {
    qsa("[data-fa-type-nav]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-fa-type-nav") || "";
        if (target === "gl-interface") {
          window.location.href = "fixed-asset-gl-interface.html";
          return;
        }
        if (target === "accounting-rule") {
          window.location.href = "fixed-asset-accounting-rule.html";
          return;
        }
        if (target === "asset-rate-history") {
          window.location.href = "fixed-asset-asset-rate-history.html";
          return;
        }
        const label = btn.textContent?.trim() || target;
        setToast(`${label} opened (stub).`, "info");
      });
    });
  }

  function bindActions() {
    qs('[data-fa-ar-action="save"]')?.addEventListener("click", () => {
      if (state.mode === MODES.VIEW) {
        setToast("Switch to Add/Edit before saving.", "warning");
        return;
      }
      setToast("Accounting Rule saved.", "success");
      setMode(MODES.VIEW);
    });

    document.addEventListener("click", (e) => {
      const target = e.target.closest('[data-fa-ar-action="cancel"]');
      if (!target) return;

      e.preventDefault();
      const form = document.getElementById("fa-ar-form");
      if (form) {
        form.reset();
        form.querySelectorAll("input, select, textarea").forEach(el => {
          if (el.type === 'checkbox' || el.type === 'radio') el.checked = false;
          else el.value = "";
        });
      }
      setToast("Screen cleared", "success");
      setMode(MODES.VIEW);
    });

    qs('[data-fa-ar-action="delete"]')?.addEventListener("click", () => {
      setToast("Deleted (stub).", "danger");
      setMode(MODES.VIEW);
    });

    qs('[data-fa-ar-action="back"]')?.addEventListener("click", () => {
      window.location.href = "fixed-asset-type.html";
    });

    qsa("[data-fa-ar-grid]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const label = btn.textContent?.trim() || "Action";
        setToast(`${label} (stub).`, "info");
      });
    });
  }

  window.addEventListener("load", () => {
    bindModeButtons();
    bindLeftNav();
    bindActions();
    setMode(MODES.VIEW);
  });
})();
