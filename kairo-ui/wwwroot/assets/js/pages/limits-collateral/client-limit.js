(function (global) {
  if (global.__ClientLimitLoaded) return;
  global.__ClientLimitLoaded = true;

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
      console.log('[ClientLimit] Dependencies loaded');
      
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else {
        init();
      }
    } catch (error) {
      console.error('[ClientLimit] Failed to load dependencies:', error);
    }
  })();

  function init() {
    if (!dependenciesReady) {
      setTimeout(init, 100);
      return;
    }
    console.log('[ClientLimit] Page initialized');
  }

})(window);
