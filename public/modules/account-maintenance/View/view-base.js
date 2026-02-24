/**
 * DataEntry Base Module
 * Shared functionality for all DataEntry screens
 * Version: 1.0.0 - January 2026
 */

const DataEntryBase = (function() {
  'use strict';

  /* ==========================================================================
     CONFIGURATION
     ========================================================================== */
  const CACHE_VERSION = '20250129';
  
  /* ==========================================================================
     LOADER / LOADING OVERLAY
     ========================================================================== */
  
  /**
   * Show the loading overlay
   * @param {string} message - Optional message to display
   */
  function showLoader(message = 'Loading...') {
    const overlay = document.querySelector('.de-loading-overlay');
    if (overlay) {
      const textEl = overlay.querySelector('.de-loading-spinner span');
      if (textEl && message) {
        textEl.textContent = message;
      }
      overlay.hidden = false;
    }
  }

  /**
   * Hide the loading overlay
   */
  function hideLoader() {
    const overlay = document.querySelector('.de-loading-overlay');
    if (overlay) {
      overlay.hidden = true;
    }
  }

  /**
   * Show loader during an async operation
   * @param {Function} asyncFn - Async function to execute
   * @param {string} message - Optional loading message
   * @returns {Promise} - Result of the async function
   */
  async function withLoader(asyncFn, message = 'Loading...') {
    try {
      showLoader(message);
      return await asyncFn();
    } finally {
      hideLoader();
    }
  }

  /* ==========================================================================
     MESSAGE BAR / TOAST
     ========================================================================== */
  
  let messageTimeout = null;

  /**
   * Show a message in the message bar
   * @param {string} text - Message text
   * @param {string} type - Message type: 'success', 'error', 'warning', 'info'
   * @param {number} duration - Auto-hide duration in ms (0 = no auto-hide)
   */
  function showMessage(text, type = 'info', duration = 5000) {
    const bar = document.querySelector('.de-message-bar');
    if (!bar) return;

    // Clear any existing timeout
    if (messageTimeout) {
      clearTimeout(messageTimeout);
      messageTimeout = null;
    }

    // Ensure close button exists so message is always closable
    let closeBtn = bar.querySelector('.de-message-bar__close');
    if (!closeBtn) {
      closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'de-message-bar__close';
      closeBtn.setAttribute('aria-label', 'Close message');
      closeBtn.innerHTML = '<i class="bi bi-x"></i>';
      closeBtn.addEventListener('click', hideMessage);
      bar.appendChild(closeBtn);
    }

    // Set icon based on type
    const icons = {
      success: 'bi-check-circle-fill',
      error: 'bi-exclamation-circle-fill',
      warning: 'bi-exclamation-triangle-fill',
      info: 'bi-info-circle-fill'
    };

    const icon = bar.querySelector('i:not(.bi-x)');
    const span = bar.querySelector('span');

    if (icon) {
      icon.className = `bi ${icons[type] || icons.info}`;
    }
    if (span) {
      span.textContent = text;
    }

    // Apply type class
    bar.className = 'de-message-bar show ' + type;

    // Auto-hide
    if (duration > 0) {
      messageTimeout = setTimeout(() => hideMessage(), duration);
    }
  }

  /**
   * Hide the message bar
   */
  function hideMessage() {
    const bar = document.querySelector('.de-message-bar');
    if (bar) {
      bar.classList.remove('show');
    }
    if (messageTimeout) {
      clearTimeout(messageTimeout);
      messageTimeout = null;
    }
  }

  /* ==========================================================================
     STATUS BAR
     ========================================================================== */
  
  /**
   * Update the status bar text
   * @param {string} text - Status text
   */
  function setStatus(text) {
    const statusBar = document.querySelector('.de-status-bar');
    if (statusBar) {
      statusBar.textContent = text || 'Ready';
    }
  }

  /* ==========================================================================
     BTS SECTION TOGGLE
     ========================================================================== */
  
  /**
   * Initialize BTS section collapse functionality
   */
  function initBtsToggle() {
    const toggleBtn = document.querySelector('.de-bts-toggle');
    const btsCard = document.querySelector('.de-card--bts');

    if (toggleBtn && btsCard) {
      toggleBtn.addEventListener('click', () => {
        btsCard.classList.toggle('collapsed');
      });
    }
  }

  /* ==========================================================================
     WINDOW CONTROLS
     ========================================================================== */
  
  /**
   * Close the child form by notifying parent
   */
  function closeChildForm() {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'accountMaintenanceChildClose' }, '*');
    } else {
      window.close();
    }
  }

  /**
   * Initialize window control buttons (refresh, maximize, close)
   */
  function initWindowControls() {
    const deWindow = document.querySelector('.de-window');
    
    // Wire all title bar buttons by data-action attribute
    document.querySelectorAll('.de-title-btn[data-action], .am-btn[data-action]').forEach(btn => {
      const action = btn.getAttribute('data-action');
      
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        handleWindowAction(action, btn, deWindow);
      });
    });

    // Wire all action panel close buttons
    document.querySelectorAll('.de-action-btn[data-action="close"]').forEach(btn => {
      btn.addEventListener('click', () => {
        closeChildForm();
      });
    });
  }

  /**
   * Handle window control actions
   * @param {string} action - The action to perform
   * @param {HTMLElement} btn - The button element
   * @param {HTMLElement} deWindow - The window container
   */
  function handleWindowAction(action, btn, deWindow) {
    switch (action) {
      case 'refresh':
        // Trigger a custom refresh event that individual screens can listen to
        document.dispatchEvent(new CustomEvent('dataentry:refresh'));
        showMessage('Data refreshed', 'info', 2000);
        break;
        
      case 'maximize':
        if (deWindow) {
          const isMaximized = deWindow.classList.toggle('de-window--maximized');
          // Toggle icon between square and restore
          const icon = btn.querySelector('i');
          if (icon) {
            icon.className = isMaximized ? 'bi bi-fullscreen-exit' : 'bi bi-square';
          }
          btn.title = isMaximized ? 'Restore' : 'Maximize';
          btn.setAttribute('aria-label', isMaximized ? 'Restore window' : 'Maximize window');
        }
        break;
        
      case 'close':
        closeChildForm();
        break;
        
      default:
        console.warn('Unknown window action:', action);
    }
  }

  /* ==========================================================================
     FORM UTILITIES
     ========================================================================== */
  
  /**
   * Reset all form fields within a container
   * @param {HTMLElement|string} container - Container element or selector
   */
  function resetForm(container) {
    const el = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    if (!el) return;

    // Reset text inputs, textareas, selects
    el.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]), textarea, select').forEach(input => {
      if (!input.readOnly && !input.disabled) {
        input.value = '';
      }
    });

    // Reset checkboxes
    el.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.checked = false;
    });

    // Reset radio buttons
    el.querySelectorAll('input[type="radio"]').forEach(radio => {
      radio.checked = false;
    });
  }

  /**
   * Populate form fields from a data object
   * @param {HTMLElement|string} container - Container element or selector
   * @param {Object} data - Data object with field values
   * @param {Object} fieldMap - Optional field name mapping { formFieldName: dataFieldName }
   */
  function populateForm(container, data, fieldMap = {}) {
    const el = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    if (!el || !data) return;

    Object.entries(data).forEach(([key, value]) => {
      const fieldName = fieldMap[key] || key;
      const input = el.querySelector(`[name="${fieldName}"], [id="${fieldName}"]`);
      
      if (!input) return;

      if (input.type === 'checkbox') {
        input.checked = value === true || value === 'Y' || value === 1 || value === '1';
      } else if (input.type === 'radio') {
        const radio = el.querySelector(`[name="${fieldName}"][value="${value}"]`);
        if (radio) radio.checked = true;
      } else {
        input.value = value ?? '';
      }
    });
  }

  /**
   * Collect form data into an object
   * @param {HTMLElement|string} container - Container element or selector
   * @param {Object} fieldMap - Optional field name mapping { formFieldName: apiFieldName }
   * @returns {Object} - Form data object
   */
  function collectFormData(container, fieldMap = {}) {
    const el = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    if (!el) return {};

    const data = {};

    // Text inputs, textareas, selects
    el.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]), textarea, select').forEach(input => {
      const name = input.name || input.id;
      if (name) {
        const apiName = fieldMap[name] || name;
        data[apiName] = input.value;
      }
    });

    // Checkboxes
    el.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      const name = cb.name || cb.id;
      if (name) {
        const apiName = fieldMap[name] || name;
        data[apiName] = cb.checked ? 'Y' : 'N';
      }
    });

    return data;
  }

  /**
   * Enable/disable form fields
   * @param {HTMLElement|string} container - Container element or selector
   * @param {boolean} disabled - Whether to disable
   * @param {Array<string>} exclude - Field names to exclude
   */
  function setFormDisabled(container, disabled, exclude = []) {
    const el = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    if (!el) return;

    el.querySelectorAll('input, textarea, select, button').forEach(field => {
      const name = field.name || field.id;
      if (!exclude.includes(name)) {
        field.disabled = disabled;
      }
    });
  }

  /* ==========================================================================
     GRID UTILITIES
     ========================================================================== */
  
  /**
   * Render a data grid in a table
   * @param {string} tableSelector - Selector for the table element
   * @param {Array} data - Array of row data objects
   * @param {Array} columns - Column definitions: [{ key, label, width?, format?, align? }]
   * @param {Object} options - Additional options
   */
  function renderGrid(tableSelector, data, columns, options = {}) {
    const table = document.querySelector(tableSelector);
    if (!table) return;

    const thead = table.querySelector('thead') || table.createTHead();
    const tbody = table.querySelector('tbody') || table.createTBody();

    // Render header
    thead.innerHTML = '';
    const headerRow = thead.insertRow();
    headerRow.className = '';
    
    columns.forEach(col => {
      const th = document.createElement('th');
      th.textContent = col.label || col.key;
      if (col.width) th.style.width = col.width;
      if (col.align) th.style.textAlign = col.align;
      if (col.className) th.className = col.className;
      headerRow.appendChild(th);
    });

    // Add actions column if needed
    if (options.showActions !== false) {
      const th = document.createElement('th');
      th.textContent = 'Actions';
      th.className = 'de-table__col-actions';
      headerRow.appendChild(th);
    }

    // Render body
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
      const emptyRow = tbody.insertRow();
      emptyRow.className = 'de-table__empty';
      const td = document.createElement('td');
      td.colSpan = columns.length + (options.showActions !== false ? 1 : 0);
      td.innerHTML = `
        <div class="de-empty-state">
          <i class="bi bi-inbox"></i>
          <span>${options.emptyText || 'No records found'}</span>
        </div>
      `;
      emptyRow.appendChild(td);
      return;
    }

    data.forEach((row, index) => {
      const tr = tbody.insertRow();
      tr.className = 'de-table__row';
      tr.tabIndex = 0;
      tr.dataset.index = index;

      // Set row ID if available
      if (row.id !== undefined) tr.dataset.id = row.id;
      if (row.ID !== undefined) tr.dataset.id = row.ID;

      // Render cells
      columns.forEach(col => {
        const td = document.createElement('td');
        let value = row[col.key];

        // Try alternate key names
        if (value === undefined && col.altKeys) {
          for (const altKey of col.altKeys) {
            if (row[altKey] !== undefined) {
              value = row[altKey];
              break;
            }
          }
        }

        // Format value
        if (col.format) {
          value = col.format(value, row);
        } else if (typeof value === 'boolean' || value === 'Y' || value === 'N' || value === true || value === false) {
          const isYes = value === true || value === 'Y' || value === 1 || value === '1';
          value = isYes 
            ? '<i class="bi bi-check-circle-fill de-icon--yes"></i>' 
            : '<i class="bi bi-x-circle de-icon--no"></i>';
          td.innerHTML = value;
        } else {
          td.textContent = value ?? '-';
        }

        if (col.align) td.style.textAlign = col.align;
        if (!col.format && typeof value !== 'boolean' && value !== 'Y' && value !== 'N') {
          // Already set via textContent above
        } else if (col.format) {
          if (typeof value === 'string' && value.includes('<')) {
            td.innerHTML = value;
          } else {
            td.textContent = value ?? '-';
          }
        }
        
        tr.appendChild(td);
      });

      // Add action buttons
      if (options.showActions !== false) {
        const actionTd = document.createElement('td');
        actionTd.className = 'de-table__col-actions';
        actionTd.innerHTML = `
          <div class="de-row-actions">
            <button type="button" class="de-row-btn de-row-btn--edit" title="Edit" data-action="edit">
              <i class="bi bi-pencil"></i>
            </button>
            <button type="button" class="de-row-btn de-row-btn--danger de-row-btn--delete" title="Delete" data-action="delete">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        `;
        tr.appendChild(actionTd);
      }

      // Row click handler
      if (options.onRowClick) {
        tr.addEventListener('click', (e) => {
          if (!e.target.closest('.de-row-btn')) {
            options.onRowClick(row, index, tr);
          }
        });
      }

      // Row double-click handler
      if (options.onRowDblClick) {
        tr.addEventListener('dblclick', (e) => {
          if (!e.target.closest('.de-row-btn')) {
            options.onRowDblClick(row, index, tr);
          }
        });
      }
    });

    // Wire action buttons
    if (options.showActions !== false) {
      tbody.querySelectorAll('.de-row-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const row = btn.closest('tr');
          const index = parseInt(row.dataset.index, 10);
          const action = btn.dataset.action;

          if (action === 'edit' && options.onEdit) {
            options.onEdit(data[index], index, row);
          } else if (action === 'delete' && options.onDelete) {
            options.onDelete(data[index], index, row);
          }
        });
      });
    }
  }

  /**
   * Get selected row from grid
   * @param {string} tableSelector - Selector for the table
   * @returns {Object|null} - Selected row data or null
   */
  function getSelectedRow(tableSelector) {
    const table = document.querySelector(tableSelector);
    if (!table) return null;

    const selectedRow = table.querySelector('tbody tr.selected');
    if (!selectedRow) return null;

    return {
      index: parseInt(selectedRow.dataset.index, 10),
      id: selectedRow.dataset.id,
      element: selectedRow
    };
  }

  /* ==========================================================================
     AUDIT FIELDS
     ========================================================================== */
  
  /**
   * Populate audit fields
   * @param {Object} data - Data object with audit fields
   */
  function populateAuditFields(data) {
    if (!data) return;

    const auditMap = {
      'MakerID': ['MakerID', 'CreatedBy', 'AddedBy', 'makerID', 'createdBy'],
      'MakerDT': ['MakerDT', 'CreatedDate', 'AddedDate', 'makerDT', 'createdDate'],
      'CheckerID': ['CheckerID', 'ApprovedBy', 'CheckedBy', 'checkerID', 'approvedBy'],
      'CheckerDT': ['CheckerDT', 'ApprovedDate', 'CheckedDate', 'checkerDT', 'approvedDate'],
      'ModifierID': ['ModifierID', 'ModifiedBy', 'UpdatedBy', 'modifierID', 'modifiedBy'],
      'ModifierDT': ['ModifierDT', 'ModifiedDate', 'UpdatedDate', 'modifierDT', 'modifiedDate']
    };

    Object.entries(auditMap).forEach(([targetId, sourceKeys]) => {
      const element = document.getElementById(targetId);
      if (!element) return;

      let value = null;
      for (const key of sourceKeys) {
        if (data[key] !== undefined && data[key] !== null) {
          value = data[key];
          break;
        }
      }

      element.textContent = value || '-';
    });
  }

  /* ==========================================================================
     VALIDATION
     ========================================================================== */
  
  /**
   * Validate required fields
   * @param {HTMLElement|string} container - Container element or selector
   * @param {Array<string>} requiredFields - Array of required field names
   * @returns {Object} - { valid: boolean, errors: string[] }
   */
  function validateRequired(container, requiredFields) {
    const el = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    if (!el) return { valid: false, errors: ['Container not found'] };

    const errors = [];

    requiredFields.forEach(fieldName => {
      const field = el.querySelector(`[name="${fieldName}"], [id="${fieldName}"]`);
      if (!field) {
        errors.push(`Field ${fieldName} not found`);
        return;
      }

      const value = field.type === 'checkbox' ? field.checked : field.value;
      if (value === '' || value === null || value === undefined) {
        const label = el.querySelector(`label[for="${fieldName}"]`);
        const fieldLabel = label ? label.textContent.replace('*', '').trim() : fieldName;
        errors.push(`${fieldLabel} is required`);
        field.classList.add('de-field--error');
      } else {
        field.classList.remove('de-field--error');
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /* ==========================================================================
     KEYBOARD NAVIGATION
     ========================================================================== */
  
  /**
   * Initialize keyboard navigation for grid
   * @param {string} tableSelector - Selector for the table
   * @param {Object} options - Options: { onEnter, onDelete }
   */
  function initGridKeyboard(tableSelector, options = {}) {
    const table = document.querySelector(tableSelector);
    if (!table) return;

    table.addEventListener('keydown', (e) => {
      const currentRow = document.activeElement.closest('tr');
      if (!currentRow) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          const nextRow = currentRow.nextElementSibling;
          if (nextRow && !nextRow.classList.contains('de-table__empty')) {
            nextRow.focus();
            currentRow.classList.remove('selected');
            nextRow.classList.add('selected');
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          const prevRow = currentRow.previousElementSibling;
          if (prevRow) {
            prevRow.focus();
            currentRow.classList.remove('selected');
            prevRow.classList.add('selected');
          }
          break;

        case 'Enter':
          e.preventDefault();
          if (options.onEnter) {
            const index = parseInt(currentRow.dataset.index, 10);
            options.onEnter(index, currentRow);
          }
          break;

        case 'Delete':
          e.preventDefault();
          if (options.onDelete) {
            const index = parseInt(currentRow.dataset.index, 10);
            options.onDelete(index, currentRow);
          }
          break;
      }
    });
  }

  /* ==========================================================================
     INITIALIZATION
     ========================================================================== */
  
  /**
   * Initialize default button behavior
   * - View button receives initial focus
   * - Enter key triggers View action (not Save)
   * - Tab order places View before Save
   */
  function initDefaultButton() {
    const viewBtn = document.querySelector('.de-action-btn[data-action="view"]');
    const saveBtn = document.querySelector('.de-action-btn[data-action="save"]');
    
    // Set tabindex to ensure View comes before Save in tab order
    if (viewBtn) {
      viewBtn.setAttribute('tabindex', '1');
    }
    if (saveBtn) {
      saveBtn.setAttribute('tabindex', '2');
    }
    
    // Focus on View button after a short delay to allow DOM to settle
    setTimeout(() => {
      if (viewBtn) {
        viewBtn.focus();
      }
    }, 100);
    
    // Handle Enter key to trigger View action (not Save)
    document.addEventListener('keydown', (e) => {
      // Only handle Enter key
      if (e.key !== 'Enter') return;
      
      // Don't intercept Enter in textareas (allow line breaks)
      if (e.target.tagName === 'TEXTAREA') return;
      
      // Don't intercept if user explicitly focuses a button
      if (e.target.classList.contains('de-action-btn') || 
          e.target.classList.contains('de-btn') ||
          e.target.classList.contains('de-btn-lookup')) return;
      
      // Don't intercept if in a grid/table row (allow row selection)
      if (e.target.closest('tr[data-index]')) return;
      
      // Don't intercept if a modal is open
      if (document.querySelector('.modal.show')) return;
      
      // Trigger View button if it exists and is enabled
      if (viewBtn && !viewBtn.disabled) {
        e.preventDefault();
        viewBtn.click();
      }
    });
  }

  /**
   * Initialize all common DataEntry functionality
   */
  function init() {
    initBtsToggle();
    initWindowControls();
    initDefaultButton();
    hideLoader();
    setStatus('Ready');
  }

  /* ==========================================================================
     PUBLIC API
     ========================================================================== */
  return {
    // Loader
    showLoader,
    hideLoader,
    withLoader,

    // Messages
    showMessage,
    hideMessage,
    setStatus,

    // Form utilities
    resetForm,
    populateForm,
    collectFormData,
    setFormDisabled,
    validateRequired,

    // Grid utilities
    renderGrid,
    getSelectedRow,
    initGridKeyboard,

    // Audit
    populateAuditFields,

    // BTS
    initBtsToggle,

    // Window controls
    initWindowControls,

    // Default button behavior
    initDefaultButton,

    // Init
    init,

    // Version
    VERSION: CACHE_VERSION
  };
})();

// Auto-init when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  DataEntryBase.init();
});

// Export for ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataEntryBase;
}
