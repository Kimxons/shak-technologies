(function () {
  // Note: Dependencies loaded by loan-maintenance.js
  
  function initBehindTheSceneTabs() {
    const tabButtons = Array.from(document.querySelectorAll("[data-lm-tab]"));
    const panels = Array.from(document.querySelectorAll("[data-lm-tabpanel]"));
    if (tabButtons.length === 0 || panels.length === 0) return;

    const panelsContainer = document.querySelector(".lm-bts-panels");

    function computeStablePanelHeight() {
      if (!panelsContainer) return;

      // Temporarily show all panels to measure their natural heights.
      const prior = panels.map((p) => ({
        panel: p,
        hidden: p.hasAttribute("hidden"),
        style: p.getAttribute("style")
      }));

      panels.forEach((p) => p.removeAttribute("hidden"));

      // Force reflow before measuring.
      // eslint-disable-next-line no-unused-expressions
      panelsContainer.offsetHeight;

      const heights = panels.map((p) => p.scrollHeight);
      const maxHeight = Math.max(0, ...heights);

      if (maxHeight > 0) {
        panelsContainer.style.minHeight = `${maxHeight}px`;
      }

      // Restore original hidden states/styles.
      prior.forEach(({ panel, hidden, style }) => {
        if (hidden) panel.setAttribute("hidden", "");
        else panel.removeAttribute("hidden");

        if (style == null) panel.removeAttribute("style");
        else panel.setAttribute("style", style);
      });
    }

    function showTab(key) {
      panels.forEach((panel) => {
        const isTarget = panel.getAttribute("data-lm-tabpanel") === key;
        panel.toggleAttribute("hidden", !isTarget);
      });

      tabButtons.forEach((button) => {
        const isActive = button.getAttribute("data-lm-tab") === key;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-selected", isActive ? "true" : "false");
      });
    }

    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const key = button.getAttribute("data-lm-tab");
        if (!key) return;
        showTab(key);
      });
    });

    const active = tabButtons.find((b) => b.classList.contains("active"));
    computeStablePanelHeight();
    showTab(active?.getAttribute("data-lm-tab") || "current-status");
  }

  function formatSingleMoneyField(field) {
    const value = field.value.trim();
    if (!value) {
      field.style.color = "inherit";
      return;
    }

    // Remove all non-digit characters except minus and decimal point
    const cleanValue = value.replace(/[^\d\-\.]/g, "");
    const numValue = parseFloat(cleanValue);

    if (!isNaN(numValue)) {
      // Get absolute value for formatting
      const absValue = Math.abs(numValue);
      
      // Format with thousands separator and 2 decimal places
      const formatted = absValue.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });

      // If negative, wrap in brackets instead of using minus sign
      if (numValue < 0) {
        field.value = `(${formatted})`;
        field.style.color = "#dc3545"; // Bootstrap danger red
      } else {
        field.value = formatted;
        field.style.color = "inherit";
      }
    }
  }

  function formatMoneyFields() {
    const moneyFields = document.querySelectorAll("[data-money-format]");

    moneyFields.forEach((field) => {
      // Format on input/change events
      field.addEventListener("change", () => {
        formatSingleMoneyField(field);
      });

      field.addEventListener("input", () => {
        // Just update color on input without reformatting
        const value = field.value.trim();
        const cleanValue = value.replace(/[^\d\-\.]/g, "");
        const numValue = parseFloat(cleanValue);

        if (!isNaN(numValue) && numValue < 0) {
          field.style.color = "#dc3545";
        } else {
          field.style.color = "inherit";
        }
      });

      // Format existing value on load
      formatSingleMoneyField(field);
    });
  }

  function watchMoneyFieldsForUpdates() {
    // Just use periodic checks to catch programmatically set values
    setInterval(() => {
      const moneyFields = document.querySelectorAll("[data-money-format]");
      moneyFields.forEach((field) => {
        // Only format if value exists and is not empty
        if (field.value && field.value.trim()) {
          const currentValue = field.value.trim();
          // Check if already formatted (has commas)
          if (!currentValue.includes(",")) {
            formatSingleMoneyField(field);
          }
        }
      });
    }, 300);
  }

  function init() {
    initBehindTheSceneTabs();
    formatMoneyFields();
    watchMoneyFieldsForUpdates();
    
    // Also check periodically in case fields are populated after load
    setTimeout(() => {
      const moneyFields = document.querySelectorAll("[data-money-format]");
      moneyFields.forEach(formatSingleMoneyField);
    }, 500);
    
    setTimeout(() => {
      const moneyFields = document.querySelectorAll("[data-money-format]");
      moneyFields.forEach(formatSingleMoneyField);
    }, 1500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
