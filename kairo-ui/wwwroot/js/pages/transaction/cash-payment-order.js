(function (global) {
  if (global.__CashPaymentOrderLoaded) return;
  global.__CashPaymentOrderLoaded = true;

  let dependenciesReady = false;

  // Load dependencies
  (async () => {
    const { ServiceLoader } = global;
    if (!ServiceLoader) return;
    
    try {
      await ServiceLoader.loadCore();
      await ServiceLoader.loadClientService();
      await ServiceLoader.loadLookupService();
      
      dependenciesReady = true;
      console.log('[CashPaymentOrder] Dependencies loaded');
      
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else {
        init();
      }
    } catch (error) {
      console.error('[CashPaymentOrder] Failed to load dependencies:', error);
    }
  })();

  function init() {
    if (!dependenciesReady) {
      setTimeout(init, 100);
      return;
    }
    console.log('[CashPaymentOrder] Page initialized');
    // Your page logic here
  }

})(window);
