// Unlock System Record Locks - Main JavaScript
(async function() {
  const { ServiceLoader } = window;
  
  // Load dependencies
  await ServiceLoader.loadCore();
  await ServiceLoader.loadUnlockSystemRecordLocksService();
  
  // Get service
  const UnlockService = window.UnlockSystemRecordLocksService;

  // DOM Elements
  const viewBtn = document.getElementById('viewBtn');
  const deleteBtn = document.getElementById('deleteBtn');
  const cancelBtn = document.getElementById('cancelBtn');

  // Form Elements
  const branchId = document.getElementById('branchId');
  const branchName = document.getElementById('branchName');
  const searchBranchBtn = document.getElementById('searchBranchBtn');

  // Table Elements
  const locksTableBody = document.getElementById('locksTableBody');
  const recordCount = document.getElementById('recordCount');

  // Stats Elements
  const statTotal = document.getElementById('statTotal');
  const statOldest = document.getElementById('statOldest');
  const statUnlocked = document.getElementById('statUnlocked');

  // Data Storage
  let lockedRecords = [];
  let stats = {
    total: 0,
    oldest: '--',
    unlockedToday: 0
  };

  // Event Listeners
  viewBtn.addEventListener('click', viewLockedRecords);
  deleteBtn.addEventListener('click', deleteSelectedRecords);
  cancelBtn.addEventListener('click', resetForm);
  searchBranchBtn.addEventListener('click', searchBranch);

  // Branch ID change listener
  branchId.addEventListener('change', () => {
    if (branchId.value.trim()) {
      viewLockedRecords();
    }
  });

  // Initialize
  updateStats();

  async function viewLockedRecords() {
    if (!branchId.value.trim()) {
      showMessage('Please enter or select a Branch ID', 'warning');
      return;
    }

    showMessage('Loading locked records...', 'info');
    
    try {
      // Call the service to get locked records
      const result = await UnlockService.getSystemRecordLocks({
        OurBranchID: branchId.value,
        AccountID: "" // Optional - can be used to filter by specific account
      });

      if (result.success) {
        // Process the response data
        lockedRecords = processLockData(result.data);
        stats.total = lockedRecords.length;
        calculateOldestLock();
        renderTable();
        updateStats();
        showMessage(`Found ${lockedRecords.length} locked record(s)`, 'success');
      } else {
        showMessage(result.message || 'Failed to load locked records', 'error');
        lockedRecords = [];
        renderTable();
        updateStats();
      }
    } catch (error) {
      console.error('Error loading locked records:', error);
      showMessage('Error loading locked records: ' + error.message, 'error');
      lockedRecords = [];
      renderTable();
      updateStats();
    }
  }

  function processLockData(data) {
    // Convert backend data to frontend format
    // Adjust based on actual backend response structure
    if (!data || !Array.isArray(data)) {
      return [];
    }

    return data.map((lock, index) => ({
      id: index + 1,
      branchId: lock.OurBranchID || lock.BranchID || '',
      moduleName: lock.ModuleName || lock.TableName || 'Unknown',
      pkKey: lock.PKKey || lock.RecordID || '',
      operatorId: lock.OperatorID || lock.UserID || '',
      lockedOn: lock.LockedOn || lock.LockTime || new Date().toISOString(),
      selected: false
    }));
  }

  function renderTable() {
    locksTableBody.innerHTML = '';

    if (lockedRecords.length === 0) {
      locksTableBody.innerHTML = `
        <tr class="empty-row">
          <td colspan="7">No records to display.</td>
        </tr>
      `;
      recordCount.textContent = '0';
      return;
    }

    lockedRecords.forEach((record, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <input type="checkbox" class="table-checkbox" 
            ${record.selected ? 'checked' : ''} 
            onchange="toggleSelection(${record.id})">
        </td>
        <td>${record.branchId}</td>
        <td>${record.moduleName}</td>
        <td>${record.pkKey}</td>
        <td>${record.operatorId}</td>
        <td>${formatDateTime(record.lockedOn)}</td>
        <td>
          <button class="table-action-btn btn-unlock-row" onclick="unlockRow(${record.id})">
            <i class="bi bi-unlock"></i> Unlock
          </button>
          <button class="table-action-btn btn-delete-row" onclick="deleteRow(${record.id})">
            <i class="bi bi-trash"></i> Delete
          </button>
        </td>
      `;
      locksTableBody.appendChild(row);
    });

    recordCount.textContent = lockedRecords.length;
  }

  function formatDateTime(dateStr) {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString();
    } catch (e) {
      return dateStr;
    }
  }

  // Make functions globally accessible for onclick handlers
  window.toggleSelection = function(id) {
    const record = lockedRecords.find(r => r.id === id);
    if (record) {
      record.selected = !record.selected;
    }
  };

  window.unlockRow = async function(id) {
    const record = lockedRecords.find(r => r.id === id);
    if (!record) return;

    if (confirm(`Are you sure you want to unlock record:\nModule: ${record.moduleName}\nPK Key: ${record.pkKey}?`)) {
      try {
        const result = await UnlockService.deleteRecordLock({
          OurBranchID: record.branchId,
          ModuleName: record.moduleName,
          PKKey: record.pkKey
        });

        if (result.success) {
          // Remove from locked records
          lockedRecords = lockedRecords.filter(r => r.id !== id);
          stats.total = lockedRecords.length;
          stats.unlockedToday++;
          
          renderTable();
          updateStats();
          showMessage('Record unlocked successfully', 'success');
        } else {
          showMessage(result.message || 'Failed to unlock record', 'error');
        }
      } catch (error) {
        console.error('Error unlocking record:', error);
        showMessage('Error unlocking record: ' + error.message, 'error');
      }
    }
  };

  window.deleteRow = async function(id) {
    const record = lockedRecords.find(r => r.id === id);
    if (!record) return;

    if (confirm(`Are you sure you want to delete lock record:\nModule: ${record.moduleName}\nPK Key: ${record.pkKey}?`)) {
      try {
        const result = await UnlockService.deleteRecordLock({
          OurBranchID: record.branchId,
          ModuleName: record.moduleName,
          PKKey: record.pkKey
        });

        if (result.success) {
          // Remove from locked records
          lockedRecords = lockedRecords.filter(r => r.id !== id);
          stats.total = lockedRecords.length;
          
          renderTable();
          updateStats();
          showMessage('Lock record deleted successfully', 'success');
        } else {
          showMessage(result.message || 'Failed to delete record', 'error');
        }
      } catch (error) {
        console.error('Error deleting record:', error);
        showMessage('Error deleting record: ' + error.message, 'error');
      }
    }
  };

  async function deleteSelectedRecords() {
    const selectedRecords = lockedRecords.filter(r => r.selected);
    
    if (selectedRecords.length === 0) {
      showMessage('Please select at least one record to delete', 'warning');
      return;
    }

    if (confirm(`Are you sure you want to delete ${selectedRecords.length} selected lock record(s)?`)) {
      try {
        // Delete each selected record
        for (const record of selectedRecords) {
          await UnlockService.deleteRecordLock({
            OurBranchID: record.branchId,
            ModuleName: record.moduleName,
            PKKey: record.pkKey
          });
        }

        lockedRecords = lockedRecords.filter(r => !r.selected);
        stats.total = lockedRecords.length;
        
        renderTable();
        updateStats();
        showMessage(`${selectedRecords.length} lock record(s) deleted successfully`, 'success');
      } catch (error) {
        console.error('Error deleting records:', error);
        showMessage('Error deleting records: ' + error.message, 'error');
      }
    }
  }

  function searchBranch() {
    // Branch search functionality - to be implemented with real data
    showMessage('Branch search feature - connect to backend', 'info');
  }

  function resetForm() {
    // Reset to default branch
    branchId.value = '0101';
    branchName.value = 'Head Office';
    
    // Clear locked records
    lockedRecords = [];
    renderTable();
    
    // Reset stats
    stats.total = 0;
    stats.oldest = '--';
    updateStats();
    
    showMessage('Form reset successfully', 'info');
  }

  function updateStats() {
    statTotal.textContent = stats.total;
    statOldest.textContent = stats.oldest;
    statUnlocked.textContent = stats.unlockedToday;
  }

  function calculateOldestLock() {
    if (lockedRecords.length === 0) {
      stats.oldest = '--';
      return;
    }

    // Find the oldest lock date
    const dates = lockedRecords.map(r => new Date(r.lockedOn));
    const oldestDate = new Date(Math.min(...dates));
    const now = new Date();
    const diffMs = now - oldestDate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      stats.oldest = 'Today';
    } else if (diffDays === 1) {
      stats.oldest = '1 day';
    } else {
      stats.oldest = `${diffDays} days`;
    }
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
})();

