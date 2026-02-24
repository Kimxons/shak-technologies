(function (global) {
  if (global.__MoneyTransferLoaded) return;
  global.__MoneyTransferLoaded = true;

  let dependenciesReady = false;

  // Load dependencies
  (async () => {
    const { ServiceLoader } = global;
    if (!ServiceLoader) return;
    
    try {
      await ServiceLoader.loadCore();
      await ServiceLoader.loadLookupService();
      await ServiceLoader.loadSearchService();
      
      const basePath = ServiceLoader.getBasePath();
      await ServiceLoader.loadScripts([
        `${basePath}data/countries.js`,
        `${basePath}auth/auth.config.js`,
        `${basePath}auth/auth.service.js`,
        `${basePath}app.js`
      ]);
      
      dependenciesReady = true;
      console.log('[MoneyTransfer] Dependencies loaded');
      
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else {
        init();
      }
    } catch (error) {
      console.error('[MoneyTransfer] Failed to load dependencies:', error);
    }
  })();

  function init() {
    if (!dependenciesReady) {
      setTimeout(init, 100);
      return;
    }
    console.log('[MoneyTransfer] Page initialized');
  }

})(window);
