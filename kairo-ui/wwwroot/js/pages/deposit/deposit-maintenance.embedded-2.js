(function () {
      document.querySelectorAll(".cm-dataentry-toggle[aria-controls]").forEach((toggle) => {
        toggle.addEventListener("click", () => {
          const targetId = toggle.getAttribute("aria-controls");
          if (!targetId) return;

          const list = document.getElementById(targetId);
          if (!list) return;

          const isExpanded = toggle.getAttribute("aria-expanded") === "true";
          toggle.setAttribute("aria-expanded", String(!isExpanded));
          list.classList.toggle("is-collapsed", isExpanded);
        });
      });
    })();
