// Product Parameters Form JavaScript
(function () {
  const editBtn = document.getElementById('editBtn');
  const saveBtn = document.getElementById('saveBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const backBtn = document.getElementById('backBtn');
  const selectAllCheckbox = document.getElementById('selectAll');
  const parameterCheckboxes = document.querySelectorAll('.parameter-checkbox');

  let isEditMode = false;

  // Edit/Save/Cancel Mode Toggle
  if (editBtn) {
    editBtn.addEventListener('click', function() {
      isEditMode = true;
      editBtn.disabled = true;
      saveBtn.disabled = false;
      cancelBtn.disabled = false;
      
      // Enable all checkboxes
      enableCheckboxes(true);
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', function() {
      isEditMode = false;
      editBtn.disabled = false;
      saveBtn.disabled = true;
      cancelBtn.disabled = true;
      
      // Disable all checkboxes and uncheck them
      enableCheckboxes(false);
      uncheckAllCheckboxes();
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', async function() {
      // Save the selected parameters
      await saveProductParameters();
    });
  }

  // Back Navigation - Close the child form overlay
  if (backBtn) {
    backBtn.addEventListener('click', function() {
      try {
        if (window.parent && window.parent.closeChildForm) {
          window.parent.closeChildForm();
        } else {
          // Fallback: send message to parent
          window.parent.postMessage('close', '*');
        }
      } catch (err) {
        console.error('Error closing form:', err);
      }
    });
  }

  // Helper function to enable/disable checkboxes
  function enableCheckboxes(enabled) {
    const allCheckboxes = document.querySelectorAll('.data-table input[type="checkbox"]');
    allCheckboxes.forEach(checkbox => {
      checkbox.disabled = !enabled;
    });
  }

  // Helper function to uncheck all checkboxes
  function uncheckAllCheckboxes() {
    const allCheckboxes = document.querySelectorAll('.data-table input[type="checkbox"]');
    allCheckboxes.forEach(checkbox => {
      checkbox.checked = false;
    });
  }

  // Handle select all checkbox
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', function() {
      if (isEditMode) {
        const checkboxes = document.querySelectorAll('.parameter-checkbox');
        checkboxes.forEach(checkbox => {
          checkbox.checked = this.checked;
        });
      }
    });
  }

  // Note: Individual checkbox handlers will be attached dynamically after grid population

  // Load product parameters on page load
  async function loadProductParameters() {
    try {
      // Wait for CoreApi to be available
      await waitForCoreApi();

      const CoreApi = window.CoreApi;
      if (!CoreApi) {
        console.error('❌ CoreApi not available');
        return;
      }

      const ProductID = window.parent?.document?.getElementById('ProductID')?.value || 'ProductID';
      const BankID = sessionStorage.getItem('BankID') || '00';
      const BranchID = sessionStorage.getItem('OurBranchID') || 'BranchID';
      const OperatorID = sessionStorage.getItem('OperatorID') || 'OperatorID';

      console.log('📥 Loading Product Parameters for ProductID:', ProductID);

      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetSystemParameters", {
        SysParamType: "char",
        ProductID: ProductID,
        BankID: BankID,
        OurBranchID: BranchID,
        OperatorID: OperatorID
      });

      const BASE_URL = (window.Environment?.baseUrlProducts || window.Environment?.baseUrlCommon || "http://localhost:5000").replace(/\/+$/, "");
      const result = await CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);

      console.log('✓ Product Parameters loaded:', result);

      if (result.success && result.data) {
        populateParametersGrid(result.data);
      } else {
        console.warn('⚠ No data returned from p_GetSystemParameters');
        const tbody = document.getElementById('parametersTableBody');
        if (tbody) {
          tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #999;">No parameters found</td></tr>';
        }
      }
    } catch (error) {
      console.error('❌ Error loading Product Parameters:', error);
      const tbody = document.getElementById('parametersTableBody');
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #dc3545;">Error loading parameters. Please try again.</td></tr>';
      }
    }
  }

  // Wait for CoreApi to be available
  function waitForCoreApi() {
    return new Promise((resolve) => {
      if (window.CoreApi) {
        resolve();
        return;
      }
      
      const checkInterval = setInterval(() => {
        if (window.CoreApi) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 5000);
    });
  }

  // Save product parameters
  async function saveProductParameters() {
    try {
      await waitForCoreApi();

      const CoreApi = window.CoreApi;
      if (!CoreApi) {
        console.error('❌ CoreApi not available');
        alert('System error: CoreApi not available');
        return;
      }

      // Get checked rows
      const checkedRows = [];
      const tbody = document.getElementById('parametersTableBody');
      if (!tbody) return;

      const rows = tbody.querySelectorAll('tr');
      rows.forEach(row => {
        const checkbox = row.querySelector('input[type="checkbox"]');
        if (checkbox && checkbox.checked) {
          checkedRows.push({
            SysParamID: row.dataset.sysParamId,
            ParamValue: row.dataset.paramValue,
            Description: row.dataset.description,
            Narration: row.dataset.narration
          });
        }
      });

      if (checkedRows.length === 0) {
        alert('Please select at least one parameter to save.');
        return;
      }

      console.log('📤 Saving checked parameters:', checkedRows);

      const ProductID = window.parent?.document?.getElementById('ProductID')?.value || 'ProductID';
      const BankID = sessionStorage.getItem('BankID') || '00';
      const BranchID = sessionStorage.getItem('OurBranchID') || 'BranchID';
      const OperatorID = sessionStorage.getItem('OperatorID') || 'OperatorID';
      const currentDateTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

      // Call API for each checked row
      const savePromises = checkedRows.map(row => {
        // Convert ParamValue to proper bit value (0 or 1)
        const paramValueBit = row.ParamValue === '1' || row.ParamValue === 1 || row.ParamValue === true ? 1 : 0;
        
        const envelope = CoreApi.makeRequestEnvelope("dbo.p_EditSystemParameters", {
          SysParamType: "char",
          BankID: BankID,
          ProductID: ProductID,
          OurBranchID: BranchID,
          SysParamID: row.SysParamID,
          ParamValue: paramValueBit,
          DetailValues: row.Description,
          ModifiedBy: OperatorID,
          ModifiedOn: currentDateTime,
          SupervisedBy: OperatorID,
          NewRecord: 0
        });

        const BASE_URL = (window.Environment?.baseUrlProducts || window.Environment?.baseUrlCommon || "http://localhost:5000").replace(/\/+$/, "");
        return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
      });

      const results = await Promise.all(savePromises);
      
      console.log('📊 Save results:', results);
      
      // Check if all saves were successful
      const allSuccess = results.every(result => result.success);
      const failedResults = results.filter(result => !result.success);
      
      if (allSuccess) {
        console.log('✓ All parameters saved successfully');
        alert('Parameters saved successfully!');
        
        // Reset to view mode
        isEditMode = false;
        editBtn.disabled = false;
        saveBtn.disabled = true;
        cancelBtn.disabled = true;
        
        // Disable and uncheck all checkboxes
        enableCheckboxes(false);
        uncheckAllCheckboxes();
        
        // Optionally close the form
        // if (window.parent && window.parent.closeChildForm) {
        //   window.parent.closeChildForm();
        // }
      } else {
        console.error('❌ Some parameters failed to save:', failedResults);
        const errorMessages = failedResults.map(r => r.message || r.error || 'Unknown error').join(', ');
        alert('Error: Some parameters failed to save.\n' + errorMessages);
      }
    } catch (error) {
      console.error('❌ Error saving Product Parameters:', error);
      alert('Error saving parameters: ' + error.message);
    }
  }

  // Populate the parameters grid with data
  function populateParametersGrid(data) {
    const tbody = document.getElementById('parametersTableBody');
    if (!tbody) {
      console.error('❌ parametersTableBody not found');
      return;
    }

    tbody.innerHTML = '';

    // Use Details01 from the response
    const rows = data.Details01 || data.Details || data;
    
    if (!Array.isArray(rows) || rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #999;">No parameters found</td></tr>';
      return;
    }

    rows.forEach((row, index) => {
      const tr = document.createElement('tr');
      
      // Store row data as data attributes
      // ParamValue should be the bit value (0 or 1), not the display value
      const paramValue = row.ParamValue !== undefined ? row.ParamValue : (row.Value !== undefined ? row.Value : '0');
      tr.dataset.sysParamId = row.SysParamID || '';
      tr.dataset.paramValue = String(paramValue); // Ensure it's stored as string "0" or "1"
      tr.dataset.description = row.Description || '';
      tr.dataset.narration = row.Narration || '';
      
      // Checkbox column
      const tdCheckbox = document.createElement('td');
      tdCheckbox.style.textAlign = 'center';
      tdCheckbox.innerHTML = `<input type="checkbox" class="parameter-checkbox" data-index="${index}" disabled />`;
      
      // Grouping column
      const tdGrouping = document.createElement('td');
      tdGrouping.textContent = row.SysParamGrp || row.Grouping || '';
      
      // Description column
      const tdDescription = document.createElement('td');
      tdDescription.innerHTML = `<input type="text" value="${escapeHtml(row.Description || '')}" readonly />`;
      
      // Narration column
      const tdNarration = document.createElement('td');
      tdNarration.innerHTML = `<input type="text" value="${escapeHtml(row.Narration || '')}" readonly />`;
      
      // Value column - display the text value from DetailValues or ValueText
      const displayValue = row.DetailValues || row.ValueText || row.Value || paramValue;
      const tdValue = document.createElement('td');
      tdValue.innerHTML = `<input type="text" value="${escapeHtml(displayValue)}" readonly />`;
      
      tr.appendChild(tdCheckbox);
      tr.appendChild(tdGrouping);
      tr.appendChild(tdDescription);
      tr.appendChild(tdNarration);
      tr.appendChild(tdValue);
      
      tbody.appendChild(tr);
    });

    // Attach checkbox event listeners
    const checkboxes = document.querySelectorAll('.parameter-checkbox');
    const selectAll = document.getElementById('selectAll');
    
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', function() {
        if (!this.checked && selectAll) {
          selectAll.checked = false;
        } else if (Array.from(checkboxes).every(cb => cb.checked) && selectAll) {
          selectAll.checked = true;
        }
      });
    });

    // Disable select all checkbox initially
    if (selectAll) {
      selectAll.disabled = true;
    }

    console.log(`✓ Populated ${rows.length} parameter rows`);
  }

  // Helper function to escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', function() {
    // Form is read-only by default
    loadProductParameters();
  });
})();
