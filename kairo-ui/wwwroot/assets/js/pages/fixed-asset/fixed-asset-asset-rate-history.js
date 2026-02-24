(() => {
  if (window.__kairoFixedAssetAssetRateHistoryLoaded) return;
  window.__kairoFixedAssetAssetRateHistoryLoaded = true;

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  window.addEventListener("load", () => {
    qs('[data-fa-arh-action="back"]')?.addEventListener("click", () => {
      window.location.href = "fixed-asset-type.html";
    });
  });
})();
