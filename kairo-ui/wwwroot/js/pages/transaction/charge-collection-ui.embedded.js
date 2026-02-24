// Vanilla JS only (UI wiring placeholders). No API calls.
    (() => {
      const scrollToSection = (sectionId) => {
        const target = document.getElementById(sectionId);
        if (!target) return;
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      };

      document.querySelectorAll("[data-dataentry-link]").forEach((button) => {
        button.addEventListener("click", (event) => {
          event.preventDefault();
          const sectionId = button.dataset.dataentryLink;
          if (sectionId) scrollToSection(sectionId);
        });
      });

      const form = document.getElementById("charge-collection-form");
      const resetForm = () => form?.reset();

      document
        .querySelectorAll(
          "[data-center-lookup],[data-client-lookup],[data-currency-lookup],[data-charge-lookup],[data-contra-branch-lookup],[data-contra-account-lookup]"
        )
        .forEach((button) => {
          button.addEventListener("click", (event) => {
            event.preventDefault();
            console.info("Charge Collection UI: lookup clicked", {
              lookup: button.dataset.lookup,
              targetField: button.dataset.targetField,
            });
          });
        });

      document.querySelectorAll("[data-charge-action]").forEach((button) => {
        button.addEventListener("click", (event) => {
          event.preventDefault();
          const action = button.dataset.chargeAction;
          if (action === "cancel") resetForm();
          console.info("Charge Collection UI: action", action);
        });
      });

      form?.addEventListener("submit", (event) => {
        event.preventDefault();
        console.info("Charge Collection UI: submit", Object.fromEntries(new FormData(form).entries()));
      });
    })();
