(() => {
  if (window.__accountMaintenanceLoaded) {
    console.warn("account-maintenance.js already loaded; skipping duplicate execution.");
    return;
  }
  window.__accountMaintenanceLoaded = true;

  const supportedPages = ["account-maintenance"];
  const activePage = document.body?.dataset?.page;
  if (!supportedPages.includes(activePage)) {
    return;
  }

  const scrollToSection = (sectionId) => {
    const target = document.getElementById(sectionId);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  document.querySelectorAll("[data-dataentry-link]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      const sectionId = button.dataset.dataentryLink;
      if (sectionId) {
        scrollToSection(sectionId);
      }
    });
  });

  const resultsContainer = document.getElementById("account-search-results");
  const lookupService = window.LookupService;
  const MIN_SEARCH_TERM_LENGTH = 3;

  const normalizeResults = (payload) => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (typeof payload === "object") return [payload];
    return [];
  };

  const formatResultRow = (row = {}) => {
    const primary = row.AccountID || row.ClientID || row.AccountName || row.ClientName || row.Name || "Result";
    const secondaryParts = [row.AccountName, row.ClientName, row.DisplayName, row.ProductID]
      .filter((value) => value && value !== primary);
    return {
      primary,
      secondary: secondaryParts.join(" · ")
    };
  };

  const renderSearchFeedback = (message, variant = "info", body = "") => {
    if (!resultsContainer) return;
    const htmlBody = body || `<div>${message}</div>`;
    resultsContainer.innerHTML = `
      <div class="alert alert-${variant} py-2" role="status">
        ${message}
      </div>
      ${htmlBody}
    `;
  };

  const renderSearchResults = (label, rows) => {
    const normalized = normalizeResults(rows);
    if (!normalized.length) {
      renderSearchFeedback(`No ${label.toLowerCase()} data found.`, "warning");
      return;
    }
    const listItems = normalized.slice(0, 5).map((row) => {
      const { primary, secondary } = formatResultRow(row);
      return `
        <li class="list-group-item py-1 border-0 ps-0">
          <strong>${primary}</strong>
          ${secondary ? `<br/><small class="text-muted">${secondary}</small>` : ""}
        </li>
      `;
    }).join("");
    const listMarkup = `
      <ul class="list-group list-group-flush">
        ${listItems}
      </ul>
    `;
    renderSearchFeedback(`${normalized.length} ${label.toLowerCase()} result(s) found.`, "success", listMarkup);
  };

  const performModuleSearch = async ({ term, label, searchFnName }) => {
    if (!term) {
      renderSearchFeedback(`Type at least ${MIN_SEARCH_TERM_LENGTH} characters to search for ${label.toLowerCase()}.`, "warning");
      return;
    }
    if (term.length < MIN_SEARCH_TERM_LENGTH) {
      renderSearchFeedback(`Provide ${MIN_SEARCH_TERM_LENGTH} or more characters.`, "warning");
      return;
    }
    if (!lookupService || typeof lookupService[searchFnName] !== "function") {
      renderSearchFeedback("LookupService is not ready yet.", "danger");
      return;
    }

    renderSearchFeedback(`Searching for ${label.toLowerCase()} "${term}"...`, "info");
    try {
      const results = await lookupService[searchFnName](term);
      renderSearchResults(label, results);
    } catch (error) {
      console.error(`${label} search failed`, error);
      renderSearchFeedback(error.message || "Search failed", "danger");
    }
  };

  const attachSearchHandler = (selector, searchFnName, label) => {
    const button = document.querySelector(selector);
    button?.addEventListener("click", (event) => {
      event.preventDefault();
      const input = document.querySelector(selector === "[data-client-search]" ? "[name=ClientID]" : "[name=AccountID]");
      const term = input?.value?.trim();
      performModuleSearch({ term, label, searchFnName });
    });
  };

  attachSearchHandler("[data-client-search]", "searchClients", "Client");
  attachSearchHandler("[data-account-search]", "searchAccounts", "Account");

  const form = document.getElementById("account-form");
  const clearBtn = document.querySelector("[data-account-clear]");

  clearBtn?.addEventListener("click", () => {
    form?.reset();
  });

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    // Wiring for API save can be added when the backend endpoint is confirmed.
    console.info("Account Maintenance: Save clicked", Object.fromEntries(new FormData(form).entries()));
  });

})();
