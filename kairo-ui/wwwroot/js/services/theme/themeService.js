/**
 * Theme Service
 * Calls theme configuration API endpoints via ThemeConfigurationController.
 * Uses AppCore.invokeController for generic controller invocation with XSRF token support.
 * Depends on: AppCore for controller communication
 */
(function (global) {
  'use strict';

  /**
   * Resolve AppCore from current window context
   */
  function getAppCore() {
    const win = global;
    return win.AppCore ||
      (win.parent && win.parent !== win && win.parent.AppCore) ||
      (win.top && win.top !== win && win.top.AppCore) ||
      null;
  }

  /**
   * Build controller endpoint path
   * @param {string} action - The controller action/endpoint
   * @returns {string} Full endpoint path
   */
  function buildEndpoint(action) {
    return `ThemeConfiguration/${action}`;
  }

  const ThemeService = {
    /**
     * Get effective theme settings via controller API
     * Uses AppCore.invokeController which automatically handles XSRF tokens
     * @param {Object} requestData - { UserID, BranchID, BankID, ScopeType, ScopeRefID }
     * @returns {Promise} API response with effective theme configuration
     */
    async getEffectiveTheme(requestData) {
      return new Promise((resolve, reject) => {
        const appCore = getAppCore();
        
        if (!appCore || typeof appCore.invokeController !== 'function') {
          const error = new Error('AppCore is not available (AppCore.invokeController not found)');
          console.error('❌ [THEME SERVICE] ' + error.message);
          reject(error);
          return;
        }

        console.log('🎨 [THEME SERVICE] getEffectiveTheme - Using AppCore.invokeController');
        
        const endpoint = buildEndpoint('get-effective-theme');
        
        appCore.invokeController(endpoint, requestData, (error, response, status) => {
          if (error) {
            console.error('❌ [THEME SERVICE] getEffectiveTheme failed:', error);
            reject(error);
          } else {
            console.log('✅ [THEME SERVICE] getEffectiveTheme succeeded:', response);
            resolve(response);
          }
        });
      });
    },

    /**
     * Save theme settings via controller API
     * Uses AppCore.invokeController which automatically handles XSRF tokens
     * @param {Object} requestData - { ScopeType, ScopeRefID, ThemeName, SettingsJson, OperatorID }
     * @returns {Promise} API response with save status
     */
    async saveThemeSettings(requestData) {
      return new Promise((resolve, reject) => {
        const appCore = getAppCore();
        
        if (!appCore || typeof appCore.invokeController !== 'function') {
          const error = new Error('AppCore is not available (AppCore.invokeController not found)');
          console.error('❌ [THEME SERVICE] ' + error.message);
          reject(error);
          return;
        }

        console.log('💾 [THEME SERVICE] saveThemeSettings - Using AppCore.invokeController');
        
        const endpoint = buildEndpoint('save-theme');
        
        appCore.invokeController(endpoint, requestData, (error, response, status) => {
          if (error) {
            console.error('❌ [THEME SERVICE] saveThemeSettings failed:', error);
            reject(error);
          } else {
            console.log('✅ [THEME SERVICE] saveThemeSettings succeeded:', response);
            resolve(response);
          }
        });
      });
    }
  };

  global.ThemeService = ThemeService;
  global.themeService = ThemeService;
})(typeof window !== 'undefined' ? window : global);
