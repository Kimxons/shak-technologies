(function () {
  let UserService;

  async function loadServices() {
    try {
      const { ServiceLoader } = window;
      if (!ServiceLoader) {
        console.error('❌ Terminal Restrictions: ServiceLoader not available');
        return;
      }
      
      await ServiceLoader.loadCore();
      await ServiceLoader.loadUserService();
      UserService = window.UserService;
      console.log('✅ Terminal Restrictions: Services loaded successfully');
    } catch (error) {
      console.error('❌ Terminal Restrictions: Error loading services:', error);
    }
  }

  async function fetchUserTerminals() {
    if (!UserService || !window.parent.currentUser) return;

    const user = window.parent.currentUser;
    const requestData = {
      OurBranchID: user.OurBranchID || user.BranchID || "0603",
      OperatorID: user.OperatorID || "CSADM",
      LoginOperatorID: user.OperatorID || "CSADM"
    };

    try {
      const response = await UserService.getUserTerminals(requestData);
      console.log('User Terminals Response:', response);
      if (response.success && response.data) {
        populateTerminals(response.data);
      } else {
        showStatusMessage('Failed to load terminal restrictions', 'error');
      }
    } catch (error) {
      console.error('Error fetching user terminals:', error);
      showStatusMessage('Error loading terminal restrictions', 'error');
    }
  }

  function populateTerminals(data) {
    // Check if data is empty (Details01 is empty array and Details has empty OperatorID)
    const isEmpty = (!data.Details01 || data.Details01.length === 0) && 
                    (!data.Details || data.Details.length === 0 || !data.Details[0]?.OperatorID);
    
    const noDataMessage = document.querySelector('[data-ter-no-data]');
    
    if (isEmpty) {
      showStatusMessage('No terminal restrictions found for this user', 'info');
      clearTerminalFields();
      if (noDataMessage) noDataMessage.style.display = 'block';
      return;
    }
    
    // Hide the no data message if data exists
    if (noDataMessage) noDataMessage.style.display = 'none';

    // Populate IP addresses from Details01 array
    if (data.Details01 && Array.isArray(data.Details01) && data.Details01.length > 0) {
      // Clear all IP fields first
      for (let i = 1; i <= 5; i++) {
        const input = document.querySelector(`[data-ter-ip="${i}"]`);
        if (input) input.value = '';
      }
      
      // Populate IP addresses (up to 5)
      data.Details01.forEach((terminal, index) => {
        if (index < 5 && terminal.IPAddress) {
          const input = document.querySelector(`[data-ter-ip="${index + 1}"]`);
          if (input) {
            input.value = terminal.IPAddress;
          }
        }
      });
      
      // Populate audit fields from first record
      const auditData = data.Details01[0];
      const createdByInput = document.querySelector('[data-ter-created-by]');
      const supervisedByInput = document.querySelector('[data-ter-supervised-by]');
      const createdOnInput = document.querySelector('[data-ter-created-on]');
      const supervisedOnInput = document.querySelector('[data-ter-supervised-on]');

      if (createdByInput && auditData.CreatedBy) createdByInput.value = auditData.CreatedBy;
      if (supervisedByInput && auditData.SupervisedBy) supervisedByInput.value = auditData.SupervisedBy;
      if (createdOnInput && auditData.CreatedOn) createdOnInput.value = auditData.CreatedOn;
      if (supervisedOnInput && auditData.SupervisedOn) supervisedOnInput.value = auditData.SupervisedOn;
      
      showStatusMessage('Terminal restrictions loaded successfully', 'success');
    } else {
      showStatusMessage('No IP addresses configured for this user', 'info');
    }
  }

  function clearTerminalFields() {
    // Clear all IP address inputs
    for (let i = 1; i <= 5; i++) {
      const input = document.querySelector(`[data-ter-ip="${i}"]`);
      if (input) input.value = '';
    }

    // Clear audit fields
    const fields = ['[data-ter-created-by]', '[data-ter-supervised-by]', '[data-ter-created-on]', '[data-ter-supervised-on]'];
    fields.forEach(selector => {
      const input = document.querySelector(selector);
      if (input) input.value = '';
    });
    
    // Clear Modified By and Modified On fields as well
    const modifiedByInput = document.getElementById('modifiedBy');
    const modifiedOnInput = document.getElementById('modifiedOn');
    if (modifiedByInput) modifiedByInput.value = '';
    if (modifiedOnInput) modifiedOnInput.value = '';
  }

  function showStatusMessage(message, type = 'info') {
    const statusBar = document.querySelector('.ter-message');
    if (!statusBar) return;

    statusBar.textContent = message;
    statusBar.style.color = type === 'error' ? '#dc3545' : 
                           type === 'success' ? '#28a745' : 
                           type === 'warning' ? '#ffc107' : '#17a2b8';
    
    // Clear message after 5 seconds
    setTimeout(() => {
      statusBar.textContent = '';
    }, 5000);
  }

  function postClose() {
    try {
      window.parent.postMessage({ type: 'kairo-dataentry-close' }, '*');
    } catch (_) {
      // ignore
    }
  }

  function setMinimized(isMinimized) {
    var root = document.querySelector('[data-ter-window]');
    if (!root) return;
    root.classList.toggle('ter-window--minimized', Boolean(isMinimized));
  }

  function doRefresh() {
    try {
      window.location.reload();
    } catch (_) {
      // ignore
    }
  }

  function wireTitleBar() {
    var btnClose = document.querySelector('[data-ter-close]');
    var btnMin = document.querySelector('[data-ter-minimize]');
    var btnRefresh = document.querySelector('[data-ter-refresh]');

    if (btnClose) btnClose.addEventListener('click', postClose);

    if (btnMin) {
      btnMin.addEventListener('click', function () {
        var root = document.querySelector('[data-ter-window]');
        var minimized = root && root.classList.contains('ter-window--minimized');
        setMinimized(!minimized);
      });
    }

    if (btnRefresh) btnRefresh.addEventListener('click', doRefresh);
  }

  function wireActionButtons() {
    var btnBack = document.querySelector('[data-ter-back]');
    if (btnBack) btnBack.addEventListener('click', postClose);

    // Wire other action buttons (no-op for now)
    var noopSelectors = [
      '[data-ter-edit]',
      '[data-ter-save]',
      '[data-ter-cancel]'
    ];

    noopSelectors.forEach(function (selector) {
      var btn = document.querySelector(selector);
      if (btn) {
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          // Placeholder for future functionality
        });
      }
    });
  }

  async function init() {
    try {
      console.log('🔄 Terminal Restrictions: Initializing...');
      
      await loadServices();
      wireTitleBar();
      wireActionButtons();
      
      // Only fetch data if services loaded successfully
      if (UserService) {
        await fetchUserTerminals();
      }
      
      console.log('✅ Terminal Restrictions: Initialization complete');
    } catch (error) {
      console.error('❌ Terminal Restrictions: Initialization error:', error);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();