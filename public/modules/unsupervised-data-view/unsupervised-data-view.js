// Unsupervised Data View - Main JavaScript
(async function() {
  const { ServiceLoader } = window;
  
  // Load dependencies
  await ServiceLoader.loadCore();
  await ServiceLoader.loadUnsupervisedDataViewService();
  
  // Get service
  const UnsupervisedService = window.UnsupervisedDataViewService;

  // DOM Elements
  const rejectBtn = document.getElementById('rejectBtn');
  const dataTableBody = document.getElementById('dataTableBody');
  const statusMessage = document.getElementById('statusMessage');
  const messageText = document.getElementById('messageText');
  const messageCode = document.getElementById('messageCode');

  // Data Storage
  let unsupervisedData = [];
  let selectedRow = null;

  // Event Listeners
  rejectBtn.addEventListener('click', rejectSelectedData);

  // Initialize - Load data on startup
  await loadUnsupervisedData();
  updateRejectButton();

  async function loadUnsupervisedData() {
    try {
      // Call the service to get supervision data
      // You may need to get these values from session storage or login context
      const result = await UnsupervisedService.getSupervisionDataPerUser({
        OurBranchID: "0101", // Get from logged-in user context
        OperatorID: "web_portal" // Get from logged-in user context
      });

      if (result.success) {
        // Process the response data
        unsupervisedData = processSupervisionData(result.data);
        renderTable();
        updateStatusMessage();
        updateRejectButton();
      } else {
        unsupervisedData = [];
        renderTable();
        updateStatusMessage();
        updateRejectButton();
        
        // Show error message if it's not just "no data"
        if (result.code !== '235608') {
          showMessage(result.message || 'Failed to load supervision data', 'error');
        }
      }
    } catch (error) {
      console.error('Error loading supervision data:', error);
      showMessage('Error loading supervision data: ' + error.message, 'error');
      unsupervisedData = [];
      renderTable();
      updateStatusMessage();
      updateRejectButton();
    }
  }

  function processSupervisionData(data) {
    // Convert backend data to frontend format
    // Adjust based on actual backend response structure
    if (!data || !Array.isArray(data)) {
      return [];
    }

    return data.map((item, index) => ({
      id: index + 1,
      moduleName: item.ModuleName || item.TableName || 'Unknown',
      operatorId: item.OperatorID || item.UserID || '',
      eventId: item.EventID || item.TransactionID || '',
      remarks: item.Remarks || item.Description || ''
    }));
  }

  function renderTable() {
    dataTableBody.innerHTML = '';

    if (unsupervisedData.length === 0) {
      dataTableBody.innerHTML = `
        <tr class="empty-row">
          <td colspan="4">No records to display.</td>
        </tr>
      `;
      return;
    }

    unsupervisedData.forEach((data, index) => {
      const row = document.createElement('tr');
      row.className = 'clickable';
      row.dataset.index = index;
      
      if (selectedRow === index) {
        row.style.backgroundColor = 'rgba(74, 144, 226, 0.1)';
      }
      
      row.innerHTML = `
        <td>${data.moduleName}</td>
        <td>${data.operatorId}</td>
        <td>${data.eventId}</td>
        <td>${data.remarks}</td>
      `;
      
      row.addEventListener('click', () => selectRow(index));
      dataTableBody.appendChild(row);
    });
  }

  function selectRow(index) {
    selectedRow = index;
    renderTable();
    updateRejectButton();
  }

  async function rejectSelectedData() {
    if (selectedRow === null) {
      showMessage('Please select a record to reject', 'warning');
      return;
    }

    const data = unsupervisedData[selectedRow];
    
    if (confirm(`Are you sure you want to reject this record?\n\nModule: ${data.moduleName}\nOperator: ${data.operatorId}\nEvent: ${data.eventId}`)) {
      try {
        const result = await UnsupervisedService.rejectSupervisionData({
          EventID: data.eventId,
          OurBranchID: "0101", // Get from logged-in user context
          OperatorID: data.operatorId,
          ModuleName: data.moduleName
        });

        if (result.success) {
          unsupervisedData.splice(selectedRow, 1);
          selectedRow = null;
          
          renderTable();
          updateStatusMessage();
          updateRejectButton();
          showMessage('Record rejected successfully', 'success');
        } else {
          showMessage(result.message || 'Failed to reject record', 'error');
        }
      } catch (error) {
        console.error('Error rejecting record:', error);
        showMessage('Error rejecting record: ' + error.message, 'error');
      }
    }
  }

  function updateStatusMessage() {
    if (unsupervisedData.length === 0) {
      statusMessage.className = 'status-message error';
      messageText.textContent = 'There is no data to supervise';
      messageCode.textContent = '[No:235608]';
    } else {
      statusMessage.className = 'status-message info';
      messageText.textContent = `${unsupervisedData.length} record(s) pending supervision`;
      messageCode.textContent = '';
    }
  }

  function updateRejectButton() {
    rejectBtn.disabled = selectedRow === null;
  }

  function showMessage(message, type) {
    // Simple alert for now - can be replaced with toast notifications
    const icon = {
      success: '✓',
      error: '✗',
      warning: '⚠',
      info: 'ℹ'
    };

    alert(`${icon[type] || ''} ${message}`);
  }

  // Auto-refresh data periodically (every 30 seconds)
  setInterval(async () => {
    await loadUnsupervisedData();
  }, 30000);
})();

