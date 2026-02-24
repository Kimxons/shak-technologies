(function (global) {
  if (global.__ChargeExemptionLoaded) return;
  global.__ChargeExemptionLoaded = true;

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
      console.log('[ChargeExemption] Dependencies loaded');
      
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else {
        init();
      }
    } catch (error) {
      console.error('[ChargeExemption] Failed to load dependencies:', error);
    }
  })();

  function init() {
    if (!dependenciesReady) {
      setTimeout(init, 100);
      return;
    }
    console.log('[ChargeExemption] Page initialized');
  }

})(window);
