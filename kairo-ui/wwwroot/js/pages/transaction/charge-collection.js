(() => {
  if (window.__chargeCollectionLoaded) {
    console.warn("charge-collection.js already loaded; skipping duplicate execution.");
    return;
  }
  window.__chargeCollectionLoaded = true;

  const supportedPages = ["charge-collection"];
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

  const form = document.getElementById("charge-collection-form");
  const resetForm = () => form?.reset();

  document.querySelectorAll(
    "[data-center-lookup],[data-client-lookup],[data-currency-lookup],[data-charge-lookup],[data-contra-branch-lookup],[data-contra-account-lookup]"
  ).forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      console.info("Charge Collection: lookup clicked", button.dataset);
    });
  });

  document.querySelectorAll("[data-charge-action]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      const action = button.dataset.chargeAction;
      if (action === "cancel") {
        resetForm();
      }
      console.info("Charge Collection: action", action);
    });
  });

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    // Wiring for API save can be added when the backend endpoint is confirmed.
    console.info("Charge Collection: Save clicked", Object.fromEntries(new FormData(form).entries()));
  });
})();
