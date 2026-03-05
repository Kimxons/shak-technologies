(function () {
  var state = {
    rows: [],
    original: [],
    editing: false,
    filteredRows: [],
    searchTerm: '',
    currentPage: 1,
    itemsPerPage: 10,
    loadedData: null // Store full response data for audit fields
  };

  function postClose() {
    try {
      // Send message to parent to close this submodule
      window.parent.postMessage({ 
        type: 'accountMaintenanceChildClose',
        source: 'AccountSpecialConditions' // Optional: identify the form
      }, '*');
      
      // Also try to close the window directly
      setTimeout(() => {
        try {
          window.close();
        } catch(e) {
          console.log('[SpecialConditions] Could not close window:', e.message);
        }
      }, 100);
    } catch (_) {
      // ignore
    }
  }

  function setMinimized(isMinimized) {
    var root = document.querySelector('[data-sc-window]');
    if (!root) return;
    root.classList.toggle('sc-window--minimized', Boolean(isMinimized));
  }

  function doRefresh() {
    loadConditions();
  }

  // Use validation summary (same as account-reminders.js) - inline message at top of form
  function showValidationSummary(message, type) {
    type = type || 'error';
    // Find the first form section content or form card
    var targetSection = document.querySelector('.form-card .section-content') || 
                        document.querySelector('.form-card');
    if (!targetSection) return;
    
    // Look for existing summary or create one
    var summary = targetSection.querySelector('.validation-summary');
    if (!summary) {
      summary = document.createElement('div');
      summary.className = 'validation-summary';
      summary.setAttribute('role', 'alert');
      summary.setAttribute('aria-live', 'polite');
      
      // Create icon
      var icon = document.createElement('i');
      icon.className = 'bi bi-exclamation-circle validation-summary__icon';
      
      // Create text
      var text = document.createElement('span');
      text.className = 'validation-summary__text';
      
      // Create close button
      var closeBtn = document.createElement('button');
      closeBtn.className = 'validation-summary__close';
      closeBtn.setAttribute('type', 'button');
      closeBtn.setAttribute('aria-label', 'Close notification');
      closeBtn.innerHTML = '<i class="bi bi-x"></i>';
      closeBtn.addEventListener('click', function() {
        hideValidationSummary();
      });
      
      summary.appendChild(icon);
      summary.appendChild(text);
      summary.appendChild(closeBtn);
      
      // Insert at the top of the section
      var content = targetSection.querySelector('.section-content');
      if (content) {
        content.insertBefore(summary, content.firstChild);
      } else {
        targetSection.insertBefore(summary, targetSection.firstChild);
      }
    } else {
      // Ensure close button exists and is functional when reusing existing summary
      var closeBtn = summary.querySelector('.validation-summary__close');
      if (!closeBtn) {
        closeBtn = document.createElement('button');
        closeBtn.className = 'validation-summary__close';
        closeBtn.setAttribute('type', 'button');
        closeBtn.setAttribute('aria-label', 'Close notification');
        closeBtn.innerHTML = '<i class="bi bi-x"></i>';
        closeBtn.addEventListener('click', function() { hideValidationSummary(); });
        summary.appendChild(closeBtn);
      } else {
        var newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.replaceWith(newCloseBtn);
        newCloseBtn.addEventListener('click', function() { hideValidationSummary(); });
      }
    }
    
    // Apply type styling
    if (type === 'success') {
      summary.classList.add('validation-summary--success');
      var iconEl = summary.querySelector('.validation-summary__icon');
      if (iconEl) iconEl.className = 'bi bi-check-circle validation-summary__icon';
    } else if (type === 'error') {
      summary.classList.remove('validation-summary--success');
      var iconEl = summary.querySelector('.validation-summary__icon');
      if (iconEl) iconEl.className = 'bi bi-exclamation-circle validation-summary__icon';
    } else {
      summary.classList.remove('validation-summary--success');
      var iconEl = summary.querySelector('.validation-summary__icon');
      if (iconEl) iconEl.className = 'bi bi-info-circle validation-summary__icon';
    }
    
    // Update message and show
    var textEl = summary.querySelector('.validation-summary__text');
    if (textEl) textEl.textContent = message;
    summary.classList.add('is-visible');
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
      setTimeout(function() {
        hideValidationSummary();
      }, 5000);
    }
  }
  
  function hideValidationSummary() {
    var summaries = document.querySelectorAll('.validation-summary');
    summaries.forEach(function(s) {
      s.classList.remove('is-visible');
      setTimeout(function() {
        s.remove();
      }, 250);
    });
  }

  function showMessage(message, type) {
    type = type || 'info';
    if (type === 'error') {
      showValidationSummary(message, 'error');
    } else if (type === 'success') {
      showValidationSummary(message, 'success');
    } else {
      showValidationSummary(message, 'info');
    }
  }

  function showLoader(show) {
    var overlay = document.getElementById('loadingOverlay');
    if (!overlay) return;
    overlay.hidden = !show;
  }

  function getParentFieldValue(fieldId) {
    try {
      var parentForm = window.parent.document;
      var field = parentForm.getElementById(fieldId);
      return field ? field.value : null;
    } catch (_) {
      return null;
    }
  }

  function getOperatorId() {
    return localStorage.getItem('OperatorID') || 'SYSTEM';
  }

  function formatDateTimeForAPI(date) {
    if (!date) return null;
    
    var d;
    if (date instanceof Date) {
      d = date;
    } else if (typeof date === 'string') {
      // Try parsing various date formats
      d = new Date(date);
      if (isNaN(d.getTime())) {
        // Try parsing MM/DD/YYYY format
        var parts = date.split(/[\/\s-]/);
        if (parts.length >= 3) {
          d = new Date(parts[2], parts[0] - 1, parts[1]);
        }
      }
    } else {
      d = new Date(date);
    }
    
    if (isNaN(d.getTime())) return null;
    
    // Format as MM/DD/YYYY HH:MM:SS
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    var year = d.getFullYear();
    var hours = String(d.getHours()).padStart(2, '0');
    var minutes = String(d.getMinutes()).padStart(2, '0');
    var seconds = String(d.getSeconds()).padStart(2, '0');
    
    return month + '/' + day + '/' + year + ' ' + hours + ':' + minutes + ':' + seconds;
  }

  function escapeXml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function isRowChanged(row) {
    // Find the original row with the same ID
    var originalRow = state.original.find(function(orig) {
      return String(orig.id) === String(row.id);
    });
    
    if (!originalRow) {
      // If no original found, consider it changed (new row)
      return true;
    }
    
    // Compare apply (checkbox) state
    var applyChanged = !!row.apply !== !!originalRow.apply;
    
    // Compare value (trimmed strings for comparison)
    var valueChanged = String(row.value || '').trim() !== String(originalRow.value || '').trim();
    
    // Row is changed if either apply or value changed
    return applyChanged || valueChanged;
  }

  function captureCurrentInputValues() {
    // Read values directly from input fields in the DOM to ensure we get what user typed
    // This captures values from the current visible page only
    var inputs = document.querySelectorAll('#conditionsGrid tbody input[type="text"]');
    console.log('[SpecialConditions] captureCurrentInputValues: Found', inputs.length, 'input fields');
    
    if (inputs.length === 0) {
      console.warn('[SpecialConditions] No input fields found in grid');
      return;
    }
    
    var capturedCount = 0;
    inputs.forEach(function(input) {
      var rowId = input.getAttribute('data-row-id');
      var inputValue = (input.value || '').trim();
      
      // CRITICAL: Never save Set types as values - these should only be in setLabel
      var commonSetTypes = ['Days', 'Day', 'Percentage', 'Percent', 'Amount', 'Number', 'Count', 'Rate'];
      var isSetType = commonSetTypes.some(function(type) {
        return inputValue.toLowerCase() === type.toLowerCase();
      });
      
      if (isSetType) {
        console.warn('[SpecialConditions] Input value is a Set type, ignoring:', inputValue);
        inputValue = ''; // Clear it - Set types should not be saved as values
      }
      
      console.log('[SpecialConditions] Input found - rowId:', rowId, 'value:', inputValue);
      
      if (rowId) {
        // Find the row in state.rows by ID (search all rows, not just visible ones)
        var row = state.rows.find(function(r) {
          return String(r.id) === String(rowId);
        });
        
        if (row) {
          // Save whatever the user typed - this is the actual value from the textbox
          // Only save if it's not a Set type
          row.value = inputValue;
          capturedCount++;
          console.log('[SpecialConditions] Updated row.value for row', rowId, ':', inputValue);
        } else {
          console.warn('[SpecialConditions] Row not found in state.rows for id:', rowId, 'Available IDs:', state.rows.map(function(r) { return r.id; }).slice(0, 5));
        }
      } else {
        console.warn('[SpecialConditions] Input field missing data-row-id attribute, value:', inputValue);
      }
    });
    
    console.log('[SpecialConditions] captureCurrentInputValues: Captured', capturedCount, 'values');
  }

  function buildDetailRecordsXML() {
    if (!state.rows || state.rows.length === 0) {
      console.log('[SpecialConditions] No records to build XML for');
      return '';
    }

    // First, capture current values from all visible input fields in the DOM
    // This ensures we get the latest values the user typed
    captureCurrentInputValues();

    var ctx = getContext();
    var operatorId = ctx.OperatorID || getOperatorId();
    
    var xml = '';
    var changedCount = 0;
    var skippedCount = 0;
    
    console.log('[SpecialConditions] buildDetailRecordsXML: Processing', state.rows.length, 'rows');
    
    state.rows.forEach(function(row) {
      // Only include rows that have been changed
      var hasChanged = isRowChanged(row);
      
      if (hasChanged) {
        changedCount++;
        
        // Get the actual value typed by the user (should be from input field now)
        var userTypedValue = String(row.value || '').trim();
        
        // CRITICAL: Ensure we're not saving Set types as user-typed values
        // Set types like "Days", "Percentage" should NEVER be in the user-typed value
        var commonSetTypes = ['Days', 'Day', 'Percentage', 'Percent', 'Amount', 'Number', 'Count', 'Rate'];
        var isSetType = commonSetTypes.some(function(type) {
          return userTypedValue.toLowerCase() === type.toLowerCase();
        });
        
        if (isSetType) {
          console.warn('[SpecialConditions] User-typed value appears to be a Set type, clearing it:', userTypedValue);
          userTypedValue = ''; // Clear it - Set types should not be saved as user-typed values
        }
        
        // Get the Set value (like "Days", "Percentage")
        var setValue = (row.setLabel && row.setLabel.trim()) ? row.setLabel : '';
        
        console.log('[SpecialConditions] Building XML for changed row:', {
          id: row.id,
          setValue: setValue,
          userTypedValue: userTypedValue,
          isSetType: isSetType
        });
        
        xml += '<dt_AccountSpecialConditionInfo>';
        xml += '<OurBranchID>' + escapeXml(ctx.OurBranchID || '') + '</OurBranchID>';
        xml += '<AccountID>' + escapeXml(ctx.AccountID || '') + '</AccountID>';
        xml += '<SpecialConditionID>' + escapeXml(row.id || '0') + '</SpecialConditionID>';
        // Value: pass the Set value (e.g., "Days", "Percentage")
        xml += '<Value>' + escapeXml(setValue) + '</Value>';
        xml += '<ModifiedBy>' + escapeXml(operatorId) + '</ModifiedBy>';
        xml += '<ButtonMark>N</ButtonMark>'; // 'N' only for changed rows
        // DetailValues: pass the actual value typed by the user (e.g., "30", "50.5")
        xml += '<DetailValues>' + escapeXml(userTypedValue) + '</DetailValues>';
        xml += '</dt_AccountSpecialConditionInfo>';
      } else {
        skippedCount++;
      }
    });
    
    console.log('[SpecialConditions] Built DetailRecords XML:', changedCount, 'changed rows,', skippedCount, 'unchanged, out of', state.rows.length, 'total');
    if (changedCount === 0) {
      console.warn('[SpecialConditions] No changed rows to save!');
    }
    console.log('[SpecialConditions] XML:', xml);
    return xml;
  }

  function getContext() {
    // Try to get from parent form fields first (like account-activation.js)
    var branchId = getParentFieldValue('branchId') || getParentFieldValue('BranchID');
    var accountId = getParentFieldValue('accountId') || getParentFieldValue('AccountID');
    
    // Fallback to parent state if fields not found
    if (!branchId || !accountId) {
      var parentState = (window.parent && window.parent.AccountMaintenanceState) || {};
      branchId = branchId || (parentState.OurBranchID || '').trim();
      accountId = accountId || (parentState.AccountID || '').trim();
    }
    
    return {
      AccountID: (accountId || '').trim(),
      OurBranchID: (branchId || '').trim(),
      OperatorID: getOperatorId()
    };
  }

  function parseResponse(resp) {
    console.log('[SpecialConditions] parseResponse called with:', resp);
    
    if (!resp) {
      console.log('[SpecialConditions] parseResponse: resp is null/undefined');
      return [];
    }
    
    if (typeof resp !== 'object') {
      console.log('[SpecialConditions] parseResponse: resp is not an object, type:', typeof resp);
      return [];
    }
    
    // If it's already an array, use it directly
    if (Array.isArray(resp)) {
      console.log('[SpecialConditions] parseResponse: resp is already an array, length:', resp.length);
      return resp;
    }
    
    // Priority 1: Check resp.data.Details01 (most common structure based on API response)
    if (resp.data && resp.data.Details01 && Array.isArray(resp.data.Details01)) {
      console.log('[SpecialConditions] parseResponse: Found resp.data.Details01 with', resp.data.Details01.length, 'items');
      return resp.data.Details01;
    }
    
    // Priority 2: Check resp.data.Details
    if (resp.data && resp.data.Details && Array.isArray(resp.data.Details)) {
      console.log('[SpecialConditions] parseResponse: Found resp.data.Details with', resp.data.Details.length, 'items');
      return resp.data.Details;
    }
    
    // Priority 3: Check resp.Data (capital D) for backwards compatibility
    if (resp.Data) {
      console.log('[SpecialConditions] parseResponse: Found resp.Data');
      if (Array.isArray(resp.Data)) {
        return resp.Data;
      }
      // Check resp.Data.Details01
      if (resp.Data.Details01 && Array.isArray(resp.Data.Details01)) {
        console.log('[SpecialConditions] parseResponse: Found resp.Data.Details01 with', resp.Data.Details01.length, 'items');
        return resp.Data.Details01;
      }
      // Check resp.Data.Details
      if (resp.Data.Details && Array.isArray(resp.Data.Details)) {
        console.log('[SpecialConditions] parseResponse: Found resp.Data.Details with', resp.Data.Details.length, 'items');
        return resp.Data.Details;
      }
    }
    
    // Priority 4: Check top-level Details01
    if (resp.Details01 && Array.isArray(resp.Details01)) {
      console.log('[SpecialConditions] parseResponse: Found resp.Details01 with', resp.Details01.length, 'items');
      return resp.Details01;
    }
    
    // Priority 5: Check other common property names
    var propertyKeys = ['Details', 'Conditions', 'Table', 'Result', 'rows', 'Rows', 'Table1', 'Details1'];
    for (var i = 0; i < propertyKeys.length; i++) {
      var key = propertyKeys[i];
      if (resp[key] && Array.isArray(resp[key]) && resp[key].length > 0) {
        console.log('[SpecialConditions] parseResponse: Found resp.' + key + ' with', resp[key].length, 'items');
        return resp[key];
      }
      if (resp.data && resp.data[key] && Array.isArray(resp.data[key]) && resp.data[key].length > 0) {
        console.log('[SpecialConditions] parseResponse: Found resp.data.' + key + ' with', resp.data[key].length, 'items');
        return resp.data[key];
      }
    }
    
    console.log('[SpecialConditions] parseResponse: No valid array found, returning empty array');
    return [];
  }

  function normalizeRows(raw) {
    if (!raw || !Array.isArray(raw)) {
      console.log('[SpecialConditions] normalizeRows: raw is not an array');
      return [];
    }
    
    console.log('[SpecialConditions] normalizeRows: Processing', raw.length, 'rows');
    if (raw.length > 0) {
      console.log('[SpecialConditions] normalizeRows: First row sample:', raw[0]);
      console.log('[SpecialConditions] normalizeRows: First row keys:', Object.keys(raw[0]));
    }
    
    var normalized = raw.map(function (row, idx) {
      // Try multiple field name variations for Apply
      var applyVal = row.Apply || row.apply || row.IsApplied || row.Flag || row.IsSet || row.IsActive || row.Active;
      
      // Try multiple field name variations for ConditionID
      var conditionId = row.ConditionID || row.ConditionId || row.SpecialConditionID || row.SpecialConditionId || 
                        row.ID || row.Id || row.id || idx;
      
      // Try multiple field name variations for Description
      var description = row.Description || row.Desc || row.ConditionDescription || row.Condition || 
                        row.Title || row.Name || row.ConditionName || '';
      
      // IMPORTANT: When loading/viewing data from API:
      // - Value field from API contains the Set type (e.g., "Days", "Percentage") → bind to Set column
      // - DetailValues field from API contains the user-typed value (e.g., "30", "50.5") → bind to textbox
      
      // Set Label: Get from Value field first (this is the Set type from API)
      // Then fallback to other Set type fields if Value is not available
      var setLabel = row.Value || row.Set || row.SetLabel || row.SetType || row.Type || row.Unit || 
                     row.Label || row.Code || row.SetCode || row.ConditionSet || 
                     row.SetName || row.ValueType || '';
      var setLabelStr = String(setLabel || '').trim();
      
      // User-typed Value: Get from DetailValues field first (this is the user-typed value from API)
      // Then fallback to other value fields if DetailValues is not available
      var value = '';
      if (row.DetailValues !== null && row.DetailValues !== undefined && row.DetailValues !== '') {
        // DetailValues contains the user-typed value
        value = String(row.DetailValues).trim();
      } else {
        // Fallback to other value fields if DetailValues is not available
        var possibleValueFields = [
          row.InputValue, row.Input, row.Amount, row.Rate,
          row.NumericValue, row.StringValue, row.ConditionValue,
          row.NumberValue, row.TextValue, row.DataValue
        ];
        
        // Find the first field that contains a value
        for (var i = 0; i < possibleValueFields.length; i++) {
          var fieldValue = possibleValueFields[i];
          if (fieldValue !== null && fieldValue !== undefined && fieldValue !== '') {
            var strValue = String(fieldValue).trim();
            // Check if this value is NOT a Set type (Set types should be in Value/SetLabel, not here)
            var commonSetTypes = ['Days', 'Day', 'Percentage', 'Percent', 'Amount', 'Number', 'Count', 'Rate'];
            var isSetType = commonSetTypes.some(function(type) {
              return strValue.toLowerCase() === type.toLowerCase();
            });
            if (!isSetType && strValue) {
              // Found a valid value (not a Set type) - use it
              value = strValue;
              break;
            }
          }
        }
      }
      
      // Log for debugging
      if (idx === 0) {
        console.log('[SpecialConditions] normalizeRows: Field mapping (on load/view) -');
        console.log('  row.Value (API) → setLabel (Set column) =', row.Value, '→', setLabel);
        console.log('  row.DetailValues (API) → value (textbox) =', row.DetailValues, '→', value);
        console.log('  row.InputValue =', row.InputValue);
        console.log('  Final setLabel =', setLabel);
        console.log('  Final value =', value);
        console.log('  All row keys:', Object.keys(row));
      }
      
      var normalizedRow = {
        id: conditionId,
        apply: applyVal === true || applyVal === 'Y' || applyVal === 1 || applyVal === '1' || String(applyVal).toUpperCase() === 'TRUE',
        description: String(description || ''),
        setLabel: String(setLabel || ''),
        value: String(value || '')
      };
      
      if (idx === 0) {
        console.log('[SpecialConditions] normalizeRows: Raw first row:', row);
        console.log('[SpecialConditions] normalizeRows: Raw row keys:', Object.keys(row));
        console.log('[SpecialConditions] normalizeRows: Raw row.Value =', row.Value);
        console.log('[SpecialConditions] normalizeRows: Raw row.InputValue =', row.InputValue);
        console.log('[SpecialConditions] normalizeRows: Raw row.DetailValues =', row.DetailValues);
        console.log('[SpecialConditions] normalizeRows: Normalized first row:', normalizedRow);
        console.log('[SpecialConditions] normalizeRows: setLabel =', setLabel, ', value =', value);
      }
      
      return normalizedRow;
    });
    
    console.log('[SpecialConditions] normalizeRows: Normalized', normalized.length, 'rows');
    return normalized;
  }

  function filterRows(resetPage) {
    var searchTerm = state.searchTerm.toLowerCase().trim();
    
    if (!searchTerm) {
      state.filteredRows = state.rows.slice();
    } else {
      state.filteredRows = state.rows.filter(function(row) {
        var description = (row.description || '').toLowerCase();
        var setLabel = (row.setLabel || '').toLowerCase();
        var value = (row.value || '').toLowerCase();
        return description.includes(searchTerm) || 
               setLabel.includes(searchTerm) || 
               value.includes(searchTerm);
      });
    }
    
    // Reset to first page only when filtering (search term changed), not when paginating
    if (resetPage !== false) {
      state.currentPage = 1;
    }
    console.log('[SpecialConditions] Filtered rows:', state.filteredRows.length, 'out of', state.rows.length, 'resetPage:', resetPage !== false);
  }

  function renderRows() {
    console.log('[SpecialConditions] renderRows called, state.rows.length:', state.rows.length, 'currentPage:', state.currentPage);
    var tbody = document.querySelector('#conditionsGrid tbody');
    if (!tbody) {
      console.error('[SpecialConditions] renderRows: tbody not found!');
      return;
    }
    
    // Filter rows based on search term (don't reset page when called from pagination)
    filterRows(false);
    
    console.log('[SpecialConditions] renderRows: Clearing tbody');
    tbody.innerHTML = '';

    if (!state.filteredRows.length) {
      console.log('[SpecialConditions] renderRows: No rows to display');
      var empty = document.createElement('tr');
      empty.className = 'de-table__empty';
      var message = state.searchTerm ? 'No records match your search.' : 'No records to display.';
      empty.innerHTML = '<td colspan="4">' + message + '</td>';
      tbody.appendChild(empty);
      var recordCountEl = document.getElementById('recordCount');
      if (recordCountEl) {
        recordCountEl.textContent = state.searchTerm ? '0 records (filtered)' : '0 records';
      }
      updatePaginationControls();
      return;
    }

    // Calculate pagination
    var totalRows = state.filteredRows.length;
    var totalPages = Math.ceil(totalRows / state.itemsPerPage);
    var startIdx = (state.currentPage - 1) * state.itemsPerPage;
    var endIdx = Math.min(startIdx + state.itemsPerPage, totalRows);
    var pageRows = state.filteredRows.slice(startIdx, endIdx);
    
    // Store totalPages for use in console.log at the end
    var currentTotalPages = totalPages;

    console.log('[SpecialConditions] renderRows: Rendering page', state.currentPage, 'of', currentTotalPages, '(', pageRows.length, 'rows out of', totalRows, 'total)');

    pageRows.forEach(function (row, idx) {
      if (idx === 0) {
        console.log('[SpecialConditions] renderRows: Rendering first row:', row);
      }
      var tr = document.createElement('tr');

      var tdApply = document.createElement('td');
      tdApply.style.textAlign = 'center';
      tdApply.style.width = '60px';
      tdApply.style.paddingLeft = '12px';
      tdApply.style.paddingRight = '12px';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!row.apply;
      cb.disabled = !state.editing;
      cb.className = 'am-checkbox';
      // Update both filtered row and actual row in state.rows
      (function(rowId) {
        cb.addEventListener('change', function () {
          var checked = this.checked;
          // Update the actual row in state.rows
          var actualRow = state.rows.find(function(r) {
            return String(r.id) === String(rowId);
          });
          if (actualRow) {
            actualRow.apply = checked;
            // Also update filtered row for display consistency
            row.apply = checked;
            console.log('[SpecialConditions] Checkbox changed for row', rowId, ':', checked);
          }
        });
      })(row.id);
      tdApply.appendChild(cb);
      tr.appendChild(tdApply);

      var tdDesc = document.createElement('td');
      tdDesc.textContent = row.description || '';
      tdDesc.style.paddingLeft = '12px';
      tdDesc.style.paddingRight = '12px';
      tr.appendChild(tdDesc);

      var tdSet = document.createElement('td');
      tdSet.textContent = row.setLabel || '';
      tdSet.style.whiteSpace = 'nowrap';
      tdSet.style.paddingLeft = '12px';
      tdSet.style.paddingRight = '12px';
      tr.appendChild(tdSet);

      var tdValue = document.createElement('td');
      var hasSetValue = (row.setLabel || '').trim().length > 0;
      // Show textbox if Set column has a value (always, not just when editing)
      if (hasSetValue) {
        var input = document.createElement('input');
        input.type = 'text';
        // Get the actual value from row.value - bind whatever is there
        // IMPORTANT: Display the value as-is, but filter out Set types if they somehow got through
        var inputValue = '';
        if (row.value !== null && row.value !== undefined) {
          var valueStr = String(row.value).trim();
          // Only filter out exact Set type matches - allow all other values (numbers, strings, etc.)
          var commonSetTypes = ['Days', 'Day', 'Percentage', 'Percent', 'Amount', 'Number', 'Count', 'Rate'];
          var isSetType = commonSetTypes.some(function(type) {
            return valueStr.toLowerCase() === type.toLowerCase();
          });
          // Display the value unless it's an exact Set type match
          // This allows numeric values like "30", "50.5", or strings like "Class" to display
          if (!isSetType) {
            inputValue = valueStr;
          } else {
            console.warn('[SpecialConditions] renderRows: Filtered out Set type from value field:', valueStr);
          }
        }
        input.value = inputValue;
        // Debug logging for value binding
        if (idx === 0) {
          console.log('[SpecialConditions] renderRows: Binding value to input -');
          console.log('  row.value =', row.value);
          console.log('  inputValue =', inputValue);
          console.log('  row.setLabel =', row.setLabel);
        }
        input.className = 'de-input am-input';
        input.disabled = !state.editing; // Disable when not in edit mode
        input.style.width = '100%';
        input.style.minWidth = '120px';
        // Store row ID on input for easy lookup when saving
        input.setAttribute('data-row-id', String(row.id));
        // Create a closure to capture the row ID and update the actual row in state.rows
        (function(rowId) {
          // Update row.value in state.rows whenever user types
          input.addEventListener('input', function () {
            var typedValue = this.value || '';
            // Find and update the actual row in state.rows (not the filtered copy)
            var actualRow = state.rows.find(function(r) {
              return String(r.id) === String(rowId);
            });
            if (actualRow) {
              actualRow.value = typedValue;
              // Also update the filtered row for display consistency
              row.value = typedValue;
              console.log('[SpecialConditions] Input changed for row', rowId, ':', typedValue);
            } else {
              console.warn('[SpecialConditions] Row not found in state.rows for id:', rowId);
            }
          });
          // Also update on blur to ensure value is captured
          input.addEventListener('blur', function () {
            var typedValue = this.value || '';
            // Find and update the actual row in state.rows
            var actualRow = state.rows.find(function(r) {
              return String(r.id) === String(rowId);
            });
            if (actualRow) {
              actualRow.value = typedValue;
              // Also update the filtered row for display consistency
              row.value = typedValue;
              console.log('[SpecialConditions] Input blurred for row', rowId, ':', typedValue);
            }
          });
        })(row.id);
        tdValue.appendChild(input);
        
        // Debug logging for first row
        if (idx === 0) {
          console.log('[SpecialConditions] renderRows: Value input created for first row');
          console.log('[SpecialConditions] renderRows: row.id =', row.id);
          console.log('[SpecialConditions] renderRows: row.setLabel =', row.setLabel);
          console.log('[SpecialConditions] renderRows: row.value =', row.value);
          console.log('[SpecialConditions] renderRows: inputValue =', inputValue);
          console.log('[SpecialConditions] renderRows: input.value =', input.value);
        }
      } else {
        // Show plain text when Set column is empty
        var displayValue = row.value !== null && row.value !== undefined ? String(row.value) : '';
        tdValue.textContent = displayValue;
        tdValue.style.paddingLeft = '12px';
      }
      tr.appendChild(tdValue);

      tbody.appendChild(tr);
    });

    // Update record count
    var recordCountEl = document.getElementById('recordCount');
    if (recordCountEl) {
      var totalCount = state.filteredRows.length;
      var displayText = totalCount + ' record' + (totalCount === 1 ? '' : 's');
      if (state.searchTerm && totalCount < state.rows.length) {
        displayText += ' (filtered from ' + state.rows.length + ')';
      }
      recordCountEl.textContent = displayText;
    }
    
    // Update pagination controls
    updatePaginationControls();
    
    console.log('[SpecialConditions] renderRows: Completed rendering page', state.currentPage, 'of', currentTotalPages, '(', pageRows.length, 'rows displayed)');
  }

  function updatePaginationControls() {
    var paginationControls = document.getElementById('paginationControls');
    var paginationInfo = document.getElementById('paginationInfo');
    var currentPageEl = document.getElementById('currentPage');
    var totalPagesEl = document.getElementById('totalPages');
    var prevBtn = document.getElementById('prevPageBtn');
    var nextBtn = document.getElementById('nextPageBtn');
    
    if (!paginationControls) {
      console.warn('[SpecialConditions] Pagination controls element not found');
      return;
    }
    
    var totalRows = state.filteredRows.length;
    var totalPages = Math.ceil(totalRows / state.itemsPerPage);
    
    console.log('[SpecialConditions] updatePaginationControls: totalRows', totalRows, 'totalPages', totalPages, 'currentPage', state.currentPage);
    
    // Hide pagination if no records or only one page
    if (!totalRows || totalPages <= 1) {
      paginationControls.style.display = 'none';
      console.log('[SpecialConditions] updatePaginationControls: Hiding pagination (no records or single page)');
      return;
    }
    
    // Show pagination controls - use !important to override any inline styles
    paginationControls.style.setProperty('display', 'flex', 'important');
    
    var startIdx = (state.currentPage - 1) * state.itemsPerPage;
    var endIdx = Math.min(startIdx + state.itemsPerPage, totalRows);
    
    // Update pagination info
    if (paginationInfo) {
      paginationInfo.textContent = (startIdx + 1) + ' - ' + endIdx + ' of ' + totalRows;
    }
    
    // Update page numbers
    if (currentPageEl) currentPageEl.textContent = state.currentPage;
    if (totalPagesEl) totalPagesEl.textContent = totalPages;
    
    // Update button states
    if (prevBtn) {
      prevBtn.disabled = state.currentPage <= 1;
      console.log('[SpecialConditions] Previous button disabled:', prevBtn.disabled);
    }
    if (nextBtn) {
      nextBtn.disabled = state.currentPage >= totalPages;
      console.log('[SpecialConditions] Next button disabled:', nextBtn.disabled);
    }
    
    console.log('[SpecialConditions] updatePaginationControls: Pagination updated - Page', state.currentPage, 'of', totalPages);
  }

  function goToPage(page) {
    var totalPages = Math.ceil(state.filteredRows.length / state.itemsPerPage);
    console.log('[SpecialConditions] goToPage called: page', page, 'totalPages', totalPages, 'filteredRows', state.filteredRows.length);
    if (page >= 1 && page <= totalPages) {
      state.currentPage = page;
      console.log('[SpecialConditions] goToPage: Updated currentPage to', state.currentPage);
      renderRows();
      // Scroll to top of grid
      var grid = document.querySelector('#conditionsGrid');
      if (grid) {
        grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      console.warn('[SpecialConditions] goToPage: Invalid page', page, '(valid range: 1 to', totalPages, ')');
    }
  }

  function setEditing(on) {
    state.editing = on;
    var btnEdit = document.querySelector('[data-action="edit"]');
    var btnSave = document.querySelector('[data-action="save"]');
    var btnCancel = document.querySelector('[data-action="cancel"]');
    if (btnEdit) btnEdit.disabled = on;
    if (btnSave) btnSave.disabled = !on;
    if (btnCancel) btnCancel.disabled = !on;
    renderRows();
  }

  function buildSavePayload() {
    var ctx = getContext();
    var operatorId = ctx.OperatorID || getOperatorId();
    var currentDate = new Date();
    
    // Get audit fields from loaded data or use defaults
    var createdBy = (state.loadedData && state.loadedData.CreatedBy) || 
                    (state.loadedData && state.loadedData.MakerID) || 
                    operatorId;
    var createdOn = (state.loadedData && state.loadedData.CreatedOn) || 
                    (state.loadedData && state.loadedData.MakerDT) || 
                    formatDateTimeForAPI(currentDate);
    var modifiedBy = operatorId;
    var modifiedOn = formatDateTimeForAPI(currentDate);
    var supervisedBy = (state.loadedData && state.loadedData.SupervisedBy) || 
                       operatorId;
    var supervisedOn = (state.loadedData && state.loadedData.SupervisedOn) || 
                        formatDateTimeForAPI(currentDate);
    var updateCount = (state.loadedData && state.loadedData.UpdateCount) || 0;
    
    // Build XML for DetailRecords
    var detailRecordsXML = buildDetailRecordsXML();

    var payload = {
      OurBranchID: ctx.OurBranchID,
      AccountID: ctx.AccountID,
      CreatedBy: createdBy,
      CreatedOn: createdOn,
      ModifiedBy: modifiedBy,
      ModifiedOn: modifiedOn,
      SupervisedBy: supervisedBy,
      SupervisedOn: supervisedOn,
      UpdateCount: updateCount,
      DetailRecords: detailRecordsXML
    };

    console.log('[SpecialConditions] Built save payload:', payload);
    return payload;
  }

  // Track if title bar is already wired to prevent duplicate event listeners
  var titleBarWired = false;
  var titleBarRetryCount = 0;
  var MAX_TITLEBAR_RETRIES = 20; // Maximum retries (2 seconds total)

  function wireTitleBar() {
    // Prevent duplicate wiring
    if (titleBarWired) {
      console.log('[SpecialConditions] Title bar already wired, skipping');
      return;
    }

    // Find the title bar container or the actual title bar element
    var titleBarContainer = document.querySelector('[data-kairo-titlebar]');
    var titleBarElement = document.querySelector('.ktb-title-bar');
    
    // If container exists but title bar element doesn't, try to initialize manually
    if (titleBarContainer && !titleBarElement) {
      console.log('[SpecialConditions] Container found but title bar element missing, attempting manual init...');
      if (typeof KairoTitleBar !== 'undefined' && KairoTitleBar && typeof KairoTitleBar.init === 'function') {
        var title = titleBarContainer.getAttribute('data-title') || 'Account Special Conditions';
        var icon = titleBarContainer.getAttribute('data-icon') || 'bi-list-check';
        try {
          KairoTitleBar.init({
            container: titleBarContainer,
            title: title,
            icon: icon
          });
          console.log('[SpecialConditions] Manual initialization successful');
          // Wait a bit for DOM to update, then re-query
          setTimeout(function() {
            titleBarElement = document.querySelector('.ktb-title-bar');
            if (titleBarElement) {
              wireTitleBarEvents();
            }
          }, 50);
          return;
        } catch (err) {
          console.error('[SpecialConditions] Manual initialization failed:', err);
        }
      } else {
        console.warn('[SpecialConditions] KairoTitleBar component not available');
      }
    }
    
    if (!titleBarContainer && !titleBarElement) {
      titleBarRetryCount++;
      if (titleBarRetryCount < MAX_TITLEBAR_RETRIES) {
        console.log('[SpecialConditions] Title bar not found, retrying... (' + titleBarRetryCount + '/' + MAX_TITLEBAR_RETRIES + ')');
        setTimeout(wireTitleBar, 100);
        return;
      } else {
        console.error('[SpecialConditions] Title bar not found after maximum retries');
        return;
      }
    }

    // Wire up events
    wireTitleBarEvents();
  }

  function wireTitleBarEvents() {
    if (titleBarWired) {
      return; // Already wired
    }

    // Find the title bar element (prefer actual element over container)
    var titleBarElement = document.querySelector('.ktb-title-bar');
    var titleBarContainer = document.querySelector('[data-kairo-titlebar]');
    var targetElement = titleBarElement || titleBarContainer;

    if (!targetElement) {
      console.warn('[SpecialConditions] Cannot wire events - no target element found');
      return;
    }

    // Verify the component found the window element
    var windowEl = document.querySelector('.window.de-window');
    if (!windowEl) {
      console.warn('[SpecialConditions] Window element not found with expected classes');
    }

    // Listen for refresh event from KairoTitleBar component (events bubble)
    targetElement.addEventListener('kairo:titlebar:refresh', function(e) {
      console.log('[SpecialConditions] Refresh event received from title bar');
      doRefresh();
    });

    // Listen for maximize event from KairoTitleBar component
    targetElement.addEventListener('kairo:titlebar:maximize', function(e) {
      var isMaximized = e.detail && e.detail.maximized;
      console.log('[SpecialConditions] Maximize event received from title bar, maximized:', isMaximized);
      
      // The component already handles the CSS class toggle, but we need to ensure
      // the window element also gets the 'maximized' class for backward compatibility
      var windowEl = document.querySelector('.window');
      if (windowEl) {
        if (isMaximized) {
          windowEl.classList.add('maximized');
        } else {
          windowEl.classList.remove('maximized');
        }
      }
      
      // Toggle sidebar if parent supports it
      // When maximized (true): close/collapse the sidebar drawer
      // When restored (false): open/expand the sidebar drawer
      if (window.parent && window.parent.postMessage) {
        window.parent.postMessage({ 
          action: 'toggleSidebarForMaximize',
          maximize: isMaximized 
        }, '*');
        console.log('[SpecialConditions] Sent maximize message to parent, maximize:', isMaximized);
      }
    });

    // Listen for close event from KairoTitleBar component
    targetElement.addEventListener('kairo:titlebar:close', function(e) {
      console.log('[SpecialConditions] Close event received from title bar');
      postClose();
    });

    // Also listen for the default dataentry:refresh event for backward compatibility
    document.addEventListener('dataentry:refresh', function(e) {
      console.log('[SpecialConditions] dataentry:refresh event received');
      doRefresh();
    });
    
    titleBarWired = true;
    titleBarRetryCount = 0; // Reset retry count on success
    console.log('[SpecialConditions] Title bar wired up successfully');
  }

  function wireButtons() {
    var btnEdit = document.querySelector('[data-action="edit"]');
    if (btnEdit) btnEdit.addEventListener('click', function () { setEditing(true); });

    var btnCancel = document.querySelector('[data-action="cancel"]');
    if (btnCancel) btnCancel.addEventListener('click', function () {
      state.rows = state.original.map(function (r) { return Object.assign({}, r); });
      setEditing(false);
      renderRows();
    });

    var btnSave = document.querySelector('[data-action="save"]');
    if (btnSave) btnSave.addEventListener('click', saveConditions);
  }

  function wireSearchAndPagination() {
    // Search input
    var searchInput = document.getElementById('searchInput');
    var clearSearchBtn = document.getElementById('clearSearch');
    
    if (searchInput) {
      // Handle input event for real-time search
      searchInput.addEventListener('input', function(e) {
        state.searchTerm = e.target.value;
        var hasSearch = state.searchTerm.trim().length > 0;
        
        // Show/hide clear button
        if (clearSearchBtn) {
          clearSearchBtn.style.display = hasSearch ? 'block' : 'none';
        }
        
        // Filter and render (reset page when searching)
        filterRows(true);
        renderRows();
      });
      
      // Handle Enter key
      searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          filterRows(true); // Reset page when searching
          renderRows();
        }
      });
    }
    
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', function() {
        if (searchInput) {
          searchInput.value = '';
          state.searchTerm = '';
          clearSearchBtn.style.display = 'none';
          filterRows(true); // Reset page when clearing search
          renderRows();
        }
      });
    }
    
    // Pagination buttons
    var prevBtn = document.getElementById('prevPageBtn');
    var nextBtn = document.getElementById('nextPageBtn');
    
    if (prevBtn) {
      prevBtn.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('[SpecialConditions] Previous button clicked, current page:', state.currentPage);
        goToPage(state.currentPage - 1);
      });
      console.log('[SpecialConditions] Previous button wired up');
    } else {
      console.warn('[SpecialConditions] Previous button not found');
    }
    
    if (nextBtn) {
      nextBtn.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('[SpecialConditions] Next button clicked, current page:', state.currentPage);
        goToPage(state.currentPage + 1);
      });
      console.log('[SpecialConditions] Next button wired up');
    } else {
      console.warn('[SpecialConditions] Next button not found');
    }
  }

  async function loadConditions() {
    var ctx = getContext();
    console.log('[SpecialConditions] loadConditions called, context:', ctx);
    
    if (!ctx.AccountID || !ctx.OurBranchID) {
      console.warn('[SpecialConditions] Context not available - AccountID:', ctx.AccountID, 'OurBranchID:', ctx.OurBranchID);
      // Try to show a helpful message
      var tbody = document.querySelector('#conditionsGrid tbody');
      if (tbody) {
        tbody.innerHTML = '<tr class="de-table__empty"><td colspan="4">Please load an account first.</td></tr>';
      }
      return;
    }

    // Verify accountservice is available
    if (typeof accountservice === 'undefined') {
      console.error('[SpecialConditions] accountservice is not defined');
      showMessage('Account service is not loaded. Please refresh the page.', 'error');
      return;
    }

    if (typeof accountservice.getAccountSpecialConditions !== 'function') {
      console.error('[SpecialConditions] getAccountSpecialConditions method not found');
      console.log('[SpecialConditions] accountservice:', accountservice);
      console.log('[SpecialConditions] Available methods:', Object.keys(accountservice || {}));
      showMessage('Account service method not available.', 'error');
      return;
    }

    showLoader(true);
    var timeoutMs = 12000;
    var timeoutPromise = new Promise(function (_, reject) {
      setTimeout(function () { reject(new Error('timeout')); }, timeoutMs);
    });

    try {
      var payload = {
        OurBranchID: ctx.OurBranchID,
        AccountID: ctx.AccountID,
        OperatorID: ctx.OperatorID || getOperatorId()
      };

      console.log('[SpecialConditions] Calling accountservice.getAccountSpecialConditions with payload:', JSON.stringify(payload, null, 2));

      var resp = await Promise.race([
        accountservice.getAccountSpecialConditions(payload),
        timeoutPromise
      ]);

      console.log('[SpecialConditions] Full response received:', resp);
      console.log('[SpecialConditions] Response type:', typeof resp);
      console.log('[SpecialConditions] Response is array:', Array.isArray(resp));

      var raw = parseResponse(resp);
      console.log('[SpecialConditions] Parsed rows:', raw);
      console.log('[SpecialConditions] Number of rows:', raw.length);
      
      state.rows = normalizeRows(raw);
      console.log('[SpecialConditions] Normalized rows:', state.rows.length);
      // Deep copy original rows to track changes
      state.original = state.rows.map(function (r) { 
        return {
          id: r.id,
          apply: r.apply,
          description: r.description,
          setLabel: r.setLabel,
          value: String(r.value || '') // Ensure value is preserved as string
        };
      });
      
      // Log first original row for debugging
      if (state.original.length > 0) {
        console.log('[SpecialConditions] First original row:', state.original[0]);
      }
      
      // Store full response data for audit fields
      state.loadedData = resp;
      
      // Reset search and pagination when loading new data
      state.searchTerm = '';
      state.currentPage = 1;
      var searchInput = document.getElementById('searchInput');
      var clearSearchBtn = document.getElementById('clearSearch');
      if (searchInput) searchInput.value = '';
      if (clearSearchBtn) clearSearchBtn.style.display = 'none';
      
      setEditing(false);
      renderRows();
      // Reset buttons to default state after load
      initializeButtons();

      // Update audit fields if available
      if (resp && resp.MakerID) {
        var makerEl = document.getElementById('MakerID');
        if (makerEl) makerEl.textContent = resp.MakerID;
      }
      if (resp && resp.MakerDT) {
        var makerDtEl = document.getElementById('MakerDT');
        if (makerDtEl) makerDtEl.textContent = resp.MakerDT;
      }
      if (resp && resp.ModifierID) {
        var modifierEl = document.getElementById('ModifierID');
        if (modifierEl) modifierEl.textContent = resp.ModifierID;
      }
      if (resp && resp.ModifierDT) {
        var modifierDtEl = document.getElementById('ModifierDT');
        if (modifierDtEl) modifierDtEl.textContent = resp.ModifierDT;
      }
    } catch (err) {
      console.error('[SpecialConditions] load failed', err);
      console.error('[SpecialConditions] Error details:', err.message, err.stack);
      showMessage(err && err.message === 'timeout' ? 'Request timed out. Please try again.' : ('Unable to load special conditions: ' + (err.message || 'Unknown error')), 'error');
      
      // Show empty state on error
      var tbody = document.querySelector('#conditionsGrid tbody');
      if (tbody) {
        tbody.innerHTML = '<tr class="de-table__empty"><td colspan="4">Error loading data. Please try again.</td></tr>';
      }
    } finally {
      showLoader(false);
    }
  }

  async function saveConditions() {
    var ctx = getContext();
    if (!ctx.AccountID || !ctx.OurBranchID) {
      showMessage('Load an account before saving.', 'info');
      return;
    }

    // Verify accountservice is available
    if (typeof accountservice === 'undefined') {
      console.error('[SpecialConditions] accountservice is not defined');
      showMessage('Account service is not loaded. Please refresh the page.', 'error');
      return;
    }

    if (typeof accountservice.editAccountSpecialConditions !== 'function') {
      console.error('[SpecialConditions] editAccountSpecialConditions method not found');
      showMessage('Account service method not available.', 'error');
      return;
    }

    var payload = buildSavePayload();
    showLoader(true);
    try {
      console.log('[SpecialConditions] Calling accountservice.editAccountSpecialConditions with payload:', JSON.stringify(payload, null, 2));
      await accountservice.editAccountSpecialConditions(payload);
      showMessage('Special conditions saved successfully.', 'success');
      state.original = state.rows.map(function (r) { return Object.assign({}, r); });
      setEditing(false);
      // Reload data after save to get updated audit fields
      await loadConditions();
    } catch (err) {
      console.error('[SpecialConditions] save failed', err);
      showMessage('Save failed: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      showLoader(false);
    }
  }

  function initializeButtons() {
    // Set default state: Edit enabled, Save and Cancel disabled
    var btnEdit = document.querySelector('[data-action="edit"]');
    var btnSave = document.querySelector('[data-action="save"]');
    var btnCancel = document.querySelector('[data-action="cancel"]');
    
    if (btnEdit) btnEdit.disabled = false;
    if (btnSave) btnSave.disabled = true;
    if (btnCancel) btnCancel.disabled = true;
  }

  // Function to initialize and load data when context is available
  function initializeForm() {
    console.log('[SpecialConditions] Initializing form...');
    
    // Reset wiring state on form initialization
    titleBarWired = false;
    titleBarRetryCount = 0;
    
    // Ensure KairoTitleBar component is initialized (in case auto-init didn't run)
    if (typeof KairoTitleBar !== 'undefined' && KairoTitleBar && typeof KairoTitleBar.initAll === 'function') {
      // Check if title bar already exists, if not, initialize it
      var existingTitleBar = document.querySelector('.ktb-title-bar');
      if (!existingTitleBar) {
        console.log('[SpecialConditions] Title bar not found, manually initializing...');
        try {
          KairoTitleBar.initAll();
          // Wait a moment for DOM to update
          setTimeout(function() {
            wireTitleBar();
          }, 150);
        } catch (err) {
          console.error('[SpecialConditions] Failed to initialize title bar:', err);
          // Still try to wire after delay
          setTimeout(function() {
            wireTitleBar();
          }, 200);
        }
      } else {
        // Title bar exists, wire it up after a short delay
        setTimeout(function() {
          wireTitleBar();
        }, 100);
      }
    } else {
      // Component not available yet, wait and retry
      setTimeout(function() {
        wireTitleBar();
      }, 200);
    }
    
    wireButtons();
    wireSearchAndPagination();
    initializeButtons();
    
    // Try to load conditions with retry logic
    var retryCount = 0;
    var maxRetries = 10;
    var retryDelay = 500; // 500ms between retries
    
    function tryLoadConditions() {
      var ctx = getContext();
      console.log('[SpecialConditions] Attempting to load conditions, retry:', retryCount, 'context:', ctx);
      
      if (ctx.AccountID && ctx.OurBranchID) {
        console.log('[SpecialConditions] Context available, loading conditions');
        loadConditions();
      } else if (retryCount < maxRetries) {
        retryCount++;
        console.log('[SpecialConditions] Context not ready, retrying in', retryDelay, 'ms (attempt', retryCount, 'of', maxRetries, ')');
        setTimeout(tryLoadConditions, retryDelay);
      } else {
        console.warn('[SpecialConditions] Max retries reached, context still not available');
        var tbody = document.querySelector('#conditionsGrid tbody');
        if (tbody) {
          tbody.innerHTML = '<tr class="de-table__empty"><td colspan="4">Please load an account to view special conditions.</td></tr>';
        }
      }
    }
    
    // Start trying to load
    tryLoadConditions();
    
    // Also listen for parent form updates (if account is loaded/changed)
    if (window.parent && window.parent.addEventListener) {
      window.parent.addEventListener('message', function(event) {
        console.log('[SpecialConditions] Received message from parent:', event.data);
        if (event.data && (event.data.type === 'accountLoaded' || event.data.type === 'accountChanged')) {
          console.log('[SpecialConditions] Account loaded/changed, reloading conditions');
          loadConditions();
        }
      });
    }
    
    // Also listen for window focus (in case account was loaded while form was in background)
    window.addEventListener('focus', function() {
      console.log('[SpecialConditions] Window focused, checking if we should reload');
      var ctx = getContext();
      if (ctx.AccountID && ctx.OurBranchID && state.rows.length === 0) {
        console.log('[SpecialConditions] Context available but no data loaded, loading now');
        loadConditions();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    console.log('[SpecialConditions] DOMContentLoaded fired');
    // Wait a bit for parent context and scripts to be available
    setTimeout(function() {
      console.log('[SpecialConditions] Starting initialization');
      initializeForm();
    }, 200);
  });
})();
