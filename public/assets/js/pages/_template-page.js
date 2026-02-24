/**
 * Page JavaScript Template
 * 
 * This template shows the correct pattern for creating page-specific JavaScript files
 * that load their own service dependencies.
 * 
 * Usage:
 * 1. Copy this template to your page JS file
 * 2. Update MODULE_NAME and load required services
 * 3. Implement your page logic in the init() function
 * 4. HTML only needs to load: serviceLoader.js and this page JS file
 */

(function (global) {
  // Prevent duplicate loading
  if (global.__YourPageNameLoaded) {
    console.warn("your-page-name.js already loaded; skipping duplicate execution.");
    return;
  }
  global.__YourPageNameLoaded = true;

  const MODULE_NAME = "YourModuleName";

  let dependenciesReady = false;

  /**
   * Load all required services for this page
   * @returns {Promise} Resolves when all services are loaded
   */
  async function loadDependencies() {
    const ServiceLoader = global.ServiceLoader;
    
    if (!ServiceLoader) {
      throw new Error("ServiceLoader not available. Ensure serviceLoader.js is loaded in HTML.");
    }

    try {
      // Load core dependencies (Environment, Config, CoreApi)
      await ServiceLoader.loadCore();
      
      // Load required services for this page
      // Choose the services you need:
      
      // Option 1: Load all common services (Client, Lookup, Search)
      await ServiceLoader.loadCommonServices();
      
      // Option 2: Load specific services only
      // await ServiceLoader.loadClientService();
      // await ServiceLoader.loadLookupService();
      // await ServiceLoader.loadSearchService();
      
      // Load UI components if needed
      // await ServiceLoader.loadUIComponents(['lookupField', 'dataTable']);
      
      // Load additional utilities/libraries
      // await ServiceLoader.loadScript(ServiceLoader.getBasePath() + 'utils/validation.js');
      
      dependenciesReady = true;
      console.log(`[${MODULE_NAME}] All dependencies loaded successfully`);
    } catch (error) {
      console.error(`[${MODULE_NAME}] Failed to load dependencies:`, error);
      throw error;
    }
  }

  /**
   * Initialize the page
   * This runs after all dependencies are loaded
   */
  async function init() {
    if (!dependenciesReady) {
      console.warn(`[${MODULE_NAME}] Dependencies not ready, waiting...`);
      setTimeout(init, 100);
      return;
    }

    console.log(`[${MODULE_NAME}] Initializing...`);

    // Services are now available
    const ClientService = global.ClientService;
    const LookupService = global.LookupService;
    
    // Your page initialization logic here
    // Example: Load lookup data
    try {
      const clientTypes = await LookupService.getClientTypes();
      console.log('Client types loaded:', clientTypes);
      
      // Populate dropdowns, bind events, etc.
      setupEventHandlers();
      loadInitialData();
      
    } catch (error) {
      console.error(`[${MODULE_NAME}] Initialization failed:`, error);
      showError('Failed to initialize page. Please refresh.');
    }
  }

  /**
   * Setup event handlers
   */
  function setupEventHandlers() {
    // Example: Form submission
    const form = document.getElementById('yourForm');
    if (form) {
      form.addEventListener('submit', handleFormSubmit);
    }
    
    // Example: Button clicks
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', handleSave);
    }
  }

  /**
   * Load initial data
   */
  async function loadInitialData() {
    // Load data needed for the page
    // Example:
    // const response = await ClientService.getClient({ ClientID: '12345' });
    // if (response.success) {
    //   populateForm(response.data);
    // }
  }

  /**
   * Handle form submission
   */
  async function handleFormSubmit(event) {
    event.preventDefault();
    
    const formData = getFormData();
    
    try {
      const response = await ClientService.createClient(formData);
      
      if (response.success) {
        showSuccess('Record saved successfully');
        // Reset form or navigate
      } else {
        showError(response.message);
      }
    } catch (error) {
      console.error('Save failed:', error);
      showError('Failed to save record');
    }
  }

  /**
   * Handle save button click
   */
  async function handleSave() {
    // Your save logic
  }

  /**
   * Get form data
   */
  function getFormData() {
    // Collect and return form data
    return {
      // Your form fields
    };
  }

  /**
   * Show success message
   */
  function showSuccess(message) {
    // Your success notification logic
    console.log('Success:', message);
  }

  /**
   * Show error message
   */
  function showError(message) {
    // Your error notification logic
    console.error('Error:', message);
  }

  /**
   * Start the application
   */
  async function start() {
    try {
      await loadDependencies();
      
      // Wait for DOM and then initialize
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else {
        init();
      }
    } catch (error) {
      console.error(`[${MODULE_NAME}] Failed to start:`, error);
      showError('Failed to load page. Please refresh.');
    }
  }

  // Start the application
  start();

})(window);
