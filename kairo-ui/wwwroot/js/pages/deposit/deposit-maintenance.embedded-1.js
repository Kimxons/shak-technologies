(function () {
      const pages = {
        "special-interest-rates": {
          title: "Special Interest Rates",
          src: "../data-entry/special-interest-rates.html",
        },
        "interest-payment": {
          title: "Interest Payment",
          src: "../data-entry/interest-payment.html",
        },
        "receipt-lost-marking": {
          title: "Receipt Lost Marking",
          src: "../data-entry/receipt-lost-marking.html",
        },
        "renew-receipt": {
          title: "Renew Receipt",
          src: "../data-entry/renew-receipt.html",
        },
        "close-receipt": {
          title: "Close Receipt",
          src: "../data-entry/close-receipt.html",
        },
        "lien-marking": {
          title: "Lien Marking",
          src: "../data-entry/lien-marking.html",
        },
      };

      const viewPages = {
        "deposit-portfolio": {
          title: "Deposit Portfolio",
          src: "../view/deposit-portfolio.html",
        },
        "receipt-statement": {
          title: "Receipt Statement",
          src: "../view/receipt-statement.html",
        },
      };

      const modalEl = document.getElementById("depositDataEntryModal");
      const titleEl = document.getElementById("depositDataEntryModalTitle");
      const iframeEl = document.getElementById("depositDataEntryIframe");
      if (!modalEl || !iframeEl) return;

      const bsModal = new bootstrap.Modal(modalEl);
      modalEl.addEventListener("hidden.bs.modal", () => {
        iframeEl.src = "about:blank";
      });

      document.querySelectorAll("[data-deposit-dataentry]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const key = btn.getAttribute("data-deposit-dataentry");
          const page = pages[key];
          if (!page) return;

          document
            .querySelectorAll("[data-deposit-dataentry].cm-legacy-nav__item")
            .forEach((el) => el.classList.remove("is-active"));
          btn.classList.add("is-active");

          if (titleEl) titleEl.textContent = page.title;
          iframeEl.title = page.title;
          iframeEl.src = page.src;
          bsModal.show();
        });
      });

      document.querySelectorAll("[data-deposit-view]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const key = btn.getAttribute("data-deposit-view");
          const page = viewPages[key];
          if (!page) return;

          document
            .querySelectorAll(".cm-legacy-nav__item.is-active")
            .forEach((el) => el.classList.remove("is-active"));
          btn.classList.add("is-active");

          if (titleEl) titleEl.textContent = page.title;
          iframeEl.title = page.title;
          iframeEl.src = page.src;
          bsModal.show();
        });
      });
    })();
