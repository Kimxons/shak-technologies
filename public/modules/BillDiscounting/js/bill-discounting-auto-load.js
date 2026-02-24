/**
 * Bill Discounting Auto-Load Utility
 * Provides shared functionality for auto-loading data when ID fields are filled and blurred (tab out)
 * Applies to: ApplicationID, BranchID, AccountID, ProductID, CurrencyID, ClientID, etc.
 */

(function(global) {
  const AutoLoadUtil = {
    /**
     * Attach auto-load listeners to an ID field
     * When user types an ID and presses Tab (blur), automatically loads the complete record
     * @param {string} idFieldName - The ID field name (e.g., "ApplicationID", "BranchID")
     * @param {string} nameFieldName - Optional name field to populate (e.g., "ApplicationName")
     * @param {Function} loadDataFn - Async function that loads data (must accept idValue as param)
     * @param {HTMLFormElement} form - The form element
     * @param {Object} options - Additional options
     *   - skipInAddMode: if true and form has activeMode==="add", skip auto-load
     *   - debounceMs: delay before triggering load (default 0)
     */
    attachAutoLoad: function(idFieldName, nameFieldName, loadDataFn, form, options = {}) {
      if (!form) return;
      
      const idInput = form.querySelector(`[name="${idFieldName}"]`);
      if (!idInput) {
        console.warn(`[AutoLoadUtil] Field not found: ${idFieldName}`);
        return;
      }

      const nameInput = nameFieldName ? form.querySelector(`[name="${nameFieldName}"]`) : null;
      const { skipInAddMode = false, debounceMs = 0, getActiveMode = null } = options;
      let debounceTimer = null;

      const triggerLoad = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        
        debounceTimer = setTimeout(async () => {
          // Check if in ADD mode and should skip
          if (skipInAddMode && getActiveMode && getActiveMode() === 'add') {
            return;
          }

          const idValue = (idInput.value || '').toString().trim();
          if (!idValue) return;

          try {
            console.log(`[AutoLoadUtil] Auto-loading ${idFieldName}: ${idValue}`);
            const result = await loadDataFn(idValue);
            
            if (result && nameInput) {
              // If a name field exists, try to populate it
              const nameValue = result[nameFieldName] || 
                               result[nameFieldName.replace('ID', 'Name')] ||
                               result.name ||
                               result.Name ||
                               '';
              if (nameValue) {
                nameInput.value = nameValue;
              }
            }
          } catch (error) {
            console.error(`[AutoLoadUtil] Error auto-loading ${idFieldName}:`, error);
          }
        }, debounceMs);
      };

      // Listen for blur (Tab key) and change
      idInput.addEventListener('blur', triggerLoad);
      idInput.addEventListener('change', triggerLoad);
      
      // Also listen for Enter key
      idInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          triggerLoad();
        }
      });
    },

    /**
     * Attach auto-load for multiple ID fields at once
     * @param {Array} fieldMappings - Array of {idField, nameField?, loadFn} objects
     * @param {HTMLFormElement} form - The form element
     * @param {Object} options - Options passed to attachAutoLoad
     */
    attachMultipleAutoLoads: function(fieldMappings, form, options = {}) {
      if (!Array.isArray(fieldMappings)) return;
      
      fieldMappings.forEach(({ idField, nameField, loadFn }) => {
        if (idField && loadFn) {
          this.attachAutoLoad(idField, nameField, loadFn, form, options);
        }
      });
    }
  };

  // Expose globally
  global.BillDiscountingAutoLoadUtil = AutoLoadUtil;
  
  // Also attach to window for easier access
  if (typeof window !== 'undefined') {
    window.BillDiscountingAutoLoadUtil = AutoLoadUtil;
  }
})(typeof window !== 'undefined' ? window : global);
