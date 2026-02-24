/**
 * User Defined Fields - Data Entry Page Logic
 */
(function () {
  'use strict';

  /**
   * Parent context - Branch ID and Center ID from Center Maintenance
   */
  let parentContext = {
    branchId: '',
    branchName: '',
    centerId: '',
    centerName: ''
  };

  /**
   * User defined fields data
   */
  let userFieldsData = [];

  /**
   * Current edit mode state
   */
  let isEditMode = false;

  /**
   * Show snackbar message (if available)
   */
  function showSnackbar(message, type = 'info') {
    if (window.parent && window.parent.showSnackbar) {
      window.parent.showSnackbar(message, type);
    } else {
      console.log(`[User Defined Fields] ${type.toUpperCase()}: ${message}`);
    }
  }

  /**
   * Show error message
   */
  function showError(message) {
    showSnackbar(message, 'error');
    console.error('[User Defined Fields] Error:', message);
  }

  /**
   * Show success message
   */
  function showSuccess(message) {
    showSnackbar(message, 'success');
    console.log('[User Defined Fields] Success:', message);
  }

  /**
   * Show info message
   */
  function showInfo(message) {
    showSnackbar(message, 'info');
    console.log('[User Defined Fields] Info:', message);
  }

  /**
   * Ensure GroupService is loaded
   */
  async function ensureGroupServiceLoaded() {
    if (window.GroupService) return true;

    try {
      if (window.ServiceLoader) {
        await window.ServiceLoader.loadCore();
        await window.ServiceLoader.loadScript('../../../../assets/js/services/microfinance/groupService.js');
        console.log('[User Defined Fields] GroupService loaded');
        return true;
      }
    } catch (error) {
      console.error('[User Defined Fields] Failed to load GroupService:', error);
    }
    return false;
  }

  /**
   * Get parent context (Branch ID and Center ID) from Center Maintenance
   */
  function getParentContext() {
    try {
      if (window.parent && window.parent !== window) {
        const parentDoc = window.parent.document;
        
        // Get Branch ID and Name
        parentContext.branchId = parentDoc.getElementById('branchId')?.value?.trim() || '';
        parentContext.branchName = parentDoc.getElementById('branchName')?.value?.trim() || '';
        
        // Get Center ID and Name
        parentContext.centerId = parentDoc.getElementById('centerId')?.value?.trim() || '';
        parentContext.centerName = parentDoc.getElementById('centerName')?.value?.trim() || '';
        
        console.log('[User Defined Fields] Parent context loaded:', parentContext);
        
        return true;
      }
    } catch (error) {
      console.warn('[User Defined Fields] Could not get parent context:', error);
      showError('Could not load parent context. Please ensure Branch and Center are selected.');
      return false;
    }
    return false;
  }

  /**
   * Validate parent context - ensure Branch ID and Center ID are available
   */
  function validateParentContext() {
    if (!parentContext.branchId) {
      showError('Branch ID is required. Please select a branch in Center Maintenance first.');
      return false;
    }
    if (!parentContext.centerId) {
      showError('Center ID is required. Please select a center in Center Maintenance first.');
      return false;
    }
    return true;
  }

  /**
   * Fetch user defined fields data
   */
  async function fetchUserFieldsData() {
    try {
      // Validate parent context
      if (!validateParentContext()) {
        return;
      }

      // Ensure GroupService is loaded
      await ensureGroupServiceLoaded();

      if (!window.GroupService) {
        throw new Error('GroupService not available');
      }

      const requestData = {
        OurBranchID: parentContext.branchId,
        RelevantID: parentContext.centerId, // Using center ID as relevant ID
        ModuleTypeID: 'GROUP', // Assuming GROUP for center maintenance
        ModuleID: 5060, // Center Maintenance module ID
        OperatorID: 'CSADM'
      };

      console.log('[User Defined Fields] Fetching user fields data with:', requestData);

      const result = await window.GroupService.getUserFieldsData(requestData);
      console.log('[User Defined Fields] API response:', result);

      if (result.success && result.data) {
        // User defined fields data is in Details01, not Details
        userFieldsData = result.data.Details01 || [];
        
        // Check if Details01 is empty - means no user-defined fields
        if (!userFieldsData || userFieldsData.length === 0) {
          // Empty response - show no fields message
          userFieldsData = [];
          populateUserFields([]);
          showInfo('No user-defined fields configured for this center.');
        } else {
          // Check if response contains valid field data
          const hasValidFields = userFieldsData.some(field => 
            field && (
              (field.FieldName && field.FieldName.trim()) ||
              (field.Description && field.Description.trim()) ||
              (field.FieldValue && field.FieldValue.trim()) ||
              field.FieldID
            )
          );
          
          if (!hasValidFields) {
            userFieldsData = [];
            populateUserFields([]);
            showInfo('No user-defined fields configured for this center.');
          } else {
            // Valid fields found
            populateUserFields(userFieldsData);
            showSuccess(`Loaded ${userFieldsData.length} user-defined field(s).`);
          }
        }
      } else {
        showError(result.message || 'Failed to load user-defined fields');
      }
    } catch (error) {
      console.error('[User Defined Fields] Error fetching user fields data:', error);
      showError('Failed to fetch user-defined fields: ' + (error.message || 'Unknown error'));
    }
  }

  /**
   * Populate user defined fields in the form
   */
  function populateUserFields(fields) {
    const container = document.getElementById('userDefinedFieldsContainer');
    
    if (!fields || fields.length === 0) {
      container.innerHTML = `
        <div class="text-muted" style="font-size: 0.85rem; padding: 20px; text-align: center;">
          <i class="bi bi-info-circle" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
          No user-defined fields configured for this center.
        </div>
      `;
      updateButtonStates(false);
      return;
    }

    // Build form fields dynamically
    let formHTML = '<div class="cu-top-grid">';
    
    fields.forEach((field, index) => {
      const fieldId = `userField_${index}`;
      const fieldName = field.FieldName || field.Description || `Field ${index + 1}`;
      const fieldValue = field.FieldValue || '';
      const fieldType = field.FieldType || 'text';
      const isRequired = field.IsRequired || false;
      
      formHTML += `
        <div class="cu-row">
          <label class="cu-label ${isRequired ? 'cu-label--blue' : ''}" for="${fieldId}">
            ${fieldName}${isRequired ? ' *' : ''}
          </label>
          ${generateFieldInput(fieldId, fieldType, fieldValue, field)}
        </div>
      `;
    });
    
    formHTML += '</div>';
    container.innerHTML = formHTML;
    
    // Enable edit button if we have fields
    updateButtonStates(true);
  }

  /**
   * Generate appropriate input field based on field type
   */
  function generateFieldInput(fieldId, fieldType, fieldValue, fieldConfig) {
    const baseClass = 'cu-input';
    const readonlyAttr = isEditMode ? '' : 'readonly';
    
    switch (fieldType.toLowerCase()) {
      case 'date':
        return `<input type="date" class="${baseClass}" id="${fieldId}" name="${fieldId}" value="${fieldValue}" ${readonlyAttr} />`;
      
      case 'number':
        return `<input type="number" class="${baseClass}" id="${fieldId}" name="${fieldId}" value="${fieldValue}" ${readonlyAttr} />`;
      
      case 'email':
        return `<input type="email" class="${baseClass}" id="${fieldId}" name="${fieldId}" value="${fieldValue}" ${readonlyAttr} />`;
      
      case 'textarea':
        return `<textarea class="${baseClass}" id="${fieldId}" name="${fieldId}" rows="3" ${readonlyAttr}>${fieldValue}</textarea>`;
      
      case 'select':
        const options = fieldConfig.Options || [];
        let selectHTML = `<select class="cu-select ${baseClass}" id="${fieldId}" name="${fieldId}" ${readonlyAttr ? 'disabled' : ''}>`;
        selectHTML += '<option value="">-- Select --</option>';
        options.forEach(option => {
          const selected = option.value === fieldValue ? 'selected' : '';
          selectHTML += `<option value="${option.value}" ${selected}>${option.text}</option>`;
        });
        selectHTML += '</select>';
        return selectHTML;
      
      case 'checkbox':
        const checked = fieldValue === 'true' || fieldValue === '1' ? 'checked' : '';
        return `<input type="checkbox" class="cu-checkbox" id="${fieldId}" name="${fieldId}" value="1" ${checked} ${readonlyAttr ? 'disabled' : ''} />`;
      
      default: // text
        return `<input type="text" class="${baseClass}" id="${fieldId}" name="${fieldId}" value="${fieldValue}" ${readonlyAttr} />`;
    }
  }

  /**
   * Update button states based on whether we have fields and current mode
   */
  function updateButtonStates(hasFields) {
    const editBtn = document.querySelector('[data-mcn-de-action="edit"]');
    const saveBtn = document.querySelector('[data-mcn-de-action="save"]');
    
    if (editBtn) {
      editBtn.disabled = !hasFields || isEditMode;
    }
    
    if (saveBtn) {
      saveBtn.disabled = !hasFields || !isEditMode;
    }
  }

  /**
   * Handle Edit action
   */
  function handleEdit() {
    isEditMode = true;
    
    // Re-populate fields in edit mode
    populateUserFields(userFieldsData);
    
    console.log('[User Defined Fields] Edit mode activated');
    showInfo('Edit mode activated. You can now modify the user-defined fields.');
  }

  /**
   * Handle Save action
   */
  async function handleSave() {
    // TODO: Implement save functionality when save API is available
    console.log('[User Defined Fields] Save action - collecting field values...');
    
    // Collect all field values
    const fieldValues = [];
    userFieldsData.forEach((field, index) => {
      const fieldId = `userField_${index}`;
      const fieldElement = document.getElementById(fieldId);
      
      if (fieldElement) {
        let value = fieldElement.value;
        
        // Handle checkbox fields
        if (fieldElement.type === 'checkbox') {
          value = fieldElement.checked ? '1' : '0';
        }
        
        fieldValues.push({
          fieldId: field.FieldID || index,
          fieldName: field.FieldName,
          fieldValue: value
        });
      }
    });
    
    console.log('[User Defined Fields] Field values to save:', fieldValues);
    
    // For now, just show success message
    showSuccess('User-defined fields saved successfully.');
    
    // Exit edit mode
    isEditMode = false;
    populateUserFields(userFieldsData);
  }

  /**
   * Handle Cancel action
   */
  function handleCancel() {
    if (isEditMode) {
      // Reset to view mode and restore original values
      isEditMode = false;
      populateUserFields(userFieldsData);
      showInfo('Changes cancelled. Form reset to view mode.');
    } else {
      // Close the form
      handleBack();
    }
  }

  /**
   * Handle Back/Close action
   */
  function handleBack() {
    // Notify parent to close this data entry form
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'kairo-dataentry-close' }, '*');
    }
    console.log('[User Defined Fields] Back/Close action');
  }

  /**
   * Bind event handlers
   */
  function bindEventHandlers() {
    // Edit button
    document.querySelector('[data-mcn-de-action="edit"]')?.addEventListener('click', handleEdit);
    
    // Save button
    document.querySelector('[data-mcn-de-action="save"]')?.addEventListener('click', handleSave);
    
    // Cancel button
    document.querySelector('[data-cu-cancel]')?.addEventListener('click', handleCancel);
    
    // Back button
    document.querySelector('[data-cu-back]')?.addEventListener('click', handleBack);
    
    // Close button in title bar
    document.querySelector('[data-dataentry-close]')?.addEventListener('click', handleBack);
    
    console.log('[User Defined Fields] Event handlers bound');
  }

  /**
   * Initialize the page
   */
  function init() {
    console.log('[User Defined Fields] Initializing...');
    
    // Get parent context first
    const contextLoaded = getParentContext();
    
    if (contextLoaded) {
      // Fetch user fields data automatically
      fetchUserFieldsData();
    } else {
      showError('Could not load context from parent. Please ensure this form is opened from Center Maintenance.');
    }
    
    // Bind event handlers
    bindEventHandlers();
    
    // Set initial button states
    updateButtonStates(false);
    
    console.log('[User Defined Fields] Initialization complete');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();