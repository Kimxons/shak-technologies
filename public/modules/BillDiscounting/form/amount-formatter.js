/**
 * Amount Formatter Utility
 * Formats monetary amounts with:
 * - Right alignment
 * - Comma separation (thousands)
 * - Two decimal places
 * - Negative values in brackets and red color
 */

(function() {
  'use strict';

  /**
   * Format a number as currency with comma separators and 2 decimal places
   * @param {number|string} value - The value to format
   * @returns {string} - Formatted amount string
   */
  function formatAmount(value) {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    // Convert to number
    let num = parseFloat(value);
    
    if (isNaN(num)) {
      return '';
    }

    // Store if negative
    const isNegative = num < 0;
    
    // Work with absolute value
    num = Math.abs(num);
    
    // Format with 2 decimal places and thousand separators
    const formatted = num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    // Return with brackets if negative
    return isNegative ? `(${formatted})` : formatted;
  }

  /**
   * Parse formatted amount back to number
   * Handles comma-separated values and bracketed negatives
   * @param {string} value - The formatted string
   * @returns {number|null} - Parsed number or null if invalid
   */
  function parseAmount(value) {
    if (!value || typeof value !== 'string') {
      return null;
    }

    // Remove spaces
    value = value.trim();
    
    if (value === '') {
      return null;
    }

    // Check if negative (in brackets)
    const isNegative = value.startsWith('(') && value.endsWith(')');
    
    // Remove brackets and commas
    value = value.replace(/[(),]/g, '');
    
    // Parse as float
    const num = parseFloat(value);
    
    if (isNaN(num)) {
      return null;
    }

    return isNegative ? -num : num;
  }

  /**
   * Apply amount formatting to an input element
   * @param {HTMLInputElement} input - The input element to format
   */
  function applyAmountFormatting(input) {
    if (!input) return;

    // Ensure text-end class for right alignment
    if (!input.classList.contains('text-end')) {
      input.classList.add('text-end');
    }

    // Store the raw value as data attribute
    const rawValue = input.value;
    if (rawValue && rawValue !== '') {
      const parsed = parseAmount(rawValue);
      if (parsed !== null) {
        input.dataset.rawValue = parsed.toString();
        input.value = formatAmount(parsed);
        
        // Apply red color if negative
        if (parsed < 0) {
          input.style.color = '#dc3545'; // Bootstrap danger color
        } else {
          input.style.color = '';
        }
      }
    }
  }

  /**
   * Setup amount field with formatting on blur and focus events
   * @param {HTMLInputElement} input - The input element
   */
  function setupAmountField(input) {
    if (!input) return;

    // Format on blur (when user leaves field)
    input.addEventListener('blur', function() {
      const value = this.value;
      if (value && value !== '') {
        const parsed = parseAmount(value);
        if (parsed !== null) {
          this.dataset.rawValue = parsed.toString();
          this.value = formatAmount(parsed);
          
          // Apply red color if negative
          if (parsed < 0) {
            this.style.color = '#dc3545';
          } else {
            this.style.color = '';
          }
        }
      }
    });

    // Remove formatting on focus (for easier editing)
    input.addEventListener('focus', function() {
      if (this.dataset.rawValue) {
        this.value = this.dataset.rawValue;
        this.style.color = '';
      }
    });

    // Initial formatting if field has value
    applyAmountFormatting(input);
  }

  /**
   * Initialize all amount fields on the page
   */
  function initializeAmountFields() {
    // Find all inputs with data-format-amount attribute
    const amountFields = document.querySelectorAll('input[data-format-amount]');
    
    amountFields.forEach(function(input) {
      setupAmountField(input);
    });

    // Also handle inputs with specific names containing "Amount", "Limit", "Rate" (case insensitive)
    // But exclude already processed fields and exclude Rate fields (they need different formatting)
    const allInputs = document.querySelectorAll('input[type="text"], input[type="number"]');
    allInputs.forEach(function(input) {
      const name = input.getAttribute('name');
      if (name && !input.hasAttribute('data-format-amount')) {
        const nameLower = name.toLowerCase();
        if ((nameLower.includes('amount') || nameLower.includes('limit')) && 
            !nameLower.includes('rate')) {
          // Add the attribute so it gets picked up
          input.setAttribute('data-format-amount', '');
          setupAmountField(input);
        }
      }
    });
  }

  /**
   * Get the formatted value for an amount field
   * @param {string|number} value - The value to format
   * @returns {string} - Formatted amount
   */
  function getFormattedAmount(value) {
    return formatAmount(value);
  }

  /**
   * Set a formatted amount in an input field
   * @param {HTMLInputElement} input - The input element
   * @param {number|string} value - The value to set
   */
  function setFormattedAmount(input, value) {
    if (!input) return;
    
    const parsed = parseAmount(value.toString());
    if (parsed !== null) {
      input.dataset.rawValue = parsed.toString();
      input.value = formatAmount(parsed);
      
      // Apply red color if negative
      if (parsed < 0) {
        input.style.color = '#dc3545';
      } else {
        input.style.color = '';
      }
    }
  }

  /**
   * Get the raw numeric value from a formatted input
   * @param {HTMLInputElement} input - The input element
   * @returns {number|null} - The raw numeric value
   */
  function getRawAmount(input) {
    if (!input) return null;
    
    if (input.dataset.rawValue) {
      return parseFloat(input.dataset.rawValue);
    }
    
    return parseAmount(input.value);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAmountFields);
  } else {
    initializeAmountFields();
  }

  // Export functions to global scope for external use
  const api = {
    format: formatAmount,
    parse: parseAmount,
    initialize: initializeAmountFields,
    setup: setupAmountField,
    getFormatted: getFormattedAmount,
    setFormatted: setFormattedAmount,
    getRaw: getRawAmount
  };

  // Export under both camelCase and PascalCase for caller convenience
  window.amountFormatter = api;
  window.AmountFormatter = api;

})();
