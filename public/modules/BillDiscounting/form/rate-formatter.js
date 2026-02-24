/**
 * Rate Formatter Utility
 * Formats interest rates and exchange rates with international standards:
 * - Right alignment
 * - Comma separation (thousands)
 * - Four decimal places
 * - Negative values in brackets and red color
 */

(function() {
  'use strict';

  /**
   * Format a number as rate with comma separators and 4 decimal places
   * @param {number|string} value - The value to format
   * @returns {string} - Formatted rate string
   */
  function formatRate(value) {
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
    
    // Format with 4 decimal places and thousand separators
    const formatted = num.toLocaleString('en-US', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4
    });

    // Return with brackets if negative
    return isNegative ? `(${formatted})` : formatted;
  }

  /**
   * Parse formatted rate back to number
   * Handles comma-separated values and bracketed negatives
   * @param {string} value - The formatted string
   * @returns {number|null} - Parsed number or null if invalid
   */
  function parseRate(value) {
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
   * Apply rate formatting to an input element
   * @param {HTMLInputElement} input - The input element to format
   */
  function applyRateFormatting(input) {
    if (!input) return;

    // Ensure text-end class for right alignment
    if (!input.classList.contains('text-end')) {
      input.classList.add('text-end');
    }

    // Store the raw value as data attribute
    const rawValue = input.value;
    if (rawValue && rawValue !== '') {
      const parsed = parseRate(rawValue);
      if (parsed !== null) {
        input.dataset.rawValue = parsed.toString();
        input.value = formatRate(parsed);
        
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
   * Setup rate field with formatting on blur and focus events
   * @param {HTMLInputElement} input - The input element
   */
  function setupRateField(input) {
    if (!input) return;

    // Format on blur (when user leaves field)
    input.addEventListener('blur', function() {
      const value = this.value;
      if (value && value !== '') {
        const parsed = parseRate(value);
        if (parsed !== null) {
          this.dataset.rawValue = parsed.toString();
          this.value = formatRate(parsed);
          
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
    applyRateFormatting(input);
  }

  /**
   * Initialize all rate fields on the page
   */
  function initializeRateFields() {
    // Find all inputs with data-format-rate attribute
    const rateFields = document.querySelectorAll('input[data-format-rate]');
    
    rateFields.forEach(function(input) {
      setupRateField(input);
    });
  }

  /**
   * Get the formatted value for a rate field
   * @param {string|number} value - The value to format
   * @returns {string} - Formatted rate
   */
  function getFormattedRate(value) {
    return formatRate(value);
  }

  /**
   * Set a formatted rate in an input field
   * @param {HTMLInputElement} input - The input element
   * @param {number|string} value - The value to set
   */
  function setFormattedRate(input, value) {
    if (!input) return;
    
    const parsed = parseRate(value.toString());
    if (parsed !== null) {
      input.dataset.rawValue = parsed.toString();
      input.value = formatRate(parsed);
      
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
  function getRawRate(input) {
    if (!input) return null;
    
    if (input.dataset.rawValue) {
      return parseFloat(input.dataset.rawValue);
    }
    
    return parseRate(input.value);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeRateFields);
  } else {
    initializeRateFields();
  }

  // Export functions to global scope for external use
  window.rateFormatter = {
    format: formatRate,
    parse: parseRate,
    initialize: initializeRateFields,
    setup: setupRateField,
    getFormatted: getFormattedRate,
    setFormatted: setFormattedRate,
    getRaw: getRawRate
  };

})();
