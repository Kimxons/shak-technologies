(function (global) {
  if (global.__CustomerCashTransactionsLoaded) {
    console.warn("customer-management/cash-transactions.js already loaded; skipping duplicate execution.");
    return;
  }
  global.__CustomerCashTransactionsLoaded = true;

  const ready = (fn) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
      return;
    }
    fn();
  };

  ready(() => {
    const root = document.body;
    if (!root || root.dataset.page !== "cash-transactions") return;

    // UI-only replica: no service calls wired yet.
  });
})(window);
