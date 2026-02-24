(function (global) {
  if (global.__TransferTransactionsLoaded) return;
  global.__TransferTransactionsLoaded = true;

  let dependenciesReady = false;

  // Load dependencies
  (async () => {
    const { ServiceLoader } = global;
    if (!ServiceLoader) return;
    
    try {
      await ServiceLoader.loadCore();
      await ServiceLoader.loadClientService();
      await ServiceLoader.loadLookupService();
      
      const basePath = ServiceLoader.getBasePath();
      await ServiceLoader.loadScripts([
        `${basePath}auth/auth.config.js`,
        `${basePath}auth/auth.service.js`,
        `${basePath}app.js`
      ]);
      
      dependenciesReady = true;
      console.log('[TransferTransactions] Dependencies loaded');
      
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else {
        init();
      }
    } catch (error) {
      console.error('[TransferTransactions] Failed to load dependencies:', error);
    }
  })();

  function init() {
    if (!dependenciesReady) {
      setTimeout(init, 100);
      return;
    }
    console.log('[TransferTransactions] Page initialized');
  }

})(window);
