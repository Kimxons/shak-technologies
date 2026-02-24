/**
 * Date Formatter Utility for Bill Discounting Forms
 * Formats dates in DD/MMM/YYYY format (e.g., 27/Jan/2026)
 */

(function() {
    'use strict';

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    /**
     * Format a date object to DD/MMM/YYYY format
     * @param {Date|string} date - Date to format
     * @returns {string} Formatted date string in DD/MMM/YYYY format
     */
    function formatDate(date) {
        if (!date) return '';
        
        let dateObj;
        
        // Handle string dates (ISO format YYYY-MM-DD or DD/MM/YYYY)
        if (typeof date === 'string') {
            // Try ISO format first
            if (date.includes('-')) {
                dateObj = new Date(date + 'T00:00:00');
            } else if (date.includes('/')) {
                // Try DD/MM/YYYY format
                const parts = date.split('/');
                if (parts.length === 3) {
                    dateObj = new Date(parts[2], parts[1] - 1, parts[0]);
                }
            } else {
                return date; // Return as-is if can't parse
            }
        } else if (date instanceof Date) {
            dateObj = date;
        } else {
            return '';
        }

        // Check if valid date
        if (isNaN(dateObj.getTime())) {
            return '';
        }

        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = monthNames[dateObj.getMonth()];
        const year = dateObj.getFullYear();

        return `${day}/${month}/${year}`;
    }

    /**
     * Parse DD/MMM/YYYY format back to Date object
     * @param {string} dateStr - Date string in DD/MMM/YYYY format
     * @returns {Date} Date object
     */
    function parseFormattedDate(dateStr) {
        if (!dateStr) return null;

        const parts = dateStr.split('/');
        if (parts.length !== 3) return null;

        const day = parseInt(parts[0], 10);
        const monthStr = parts[1];
        const year = parseInt(parts[2], 10);

        const monthIndex = monthNames.indexOf(monthStr);
        if (monthIndex === -1) return null;

        return new Date(year, monthIndex, day);
    }

    /**
     * Format all date fields on the page
     */
    function formatAllDateFields() {
        const dateFields = document.querySelectorAll('[data-format-date]');
        
        dateFields.forEach(field => {
            if (field.value) {
                field.value = formatDate(field.value);
            }
        });
    }

    /**
     * Initialize date field behavior
     */
    function initializeDateFields() {
        const dateFields = document.querySelectorAll('[data-format-date]');
        
        dateFields.forEach(field => {
            // Format existing values
            if (field.value) {
                field.value = formatDate(field.value);
            }

            // Handle blur events for user input
            field.addEventListener('blur', function() {
                if (this.value && !this.readOnly) {
                    // Attempt to format user input
                    const formatted = formatDate(this.value);
                    if (formatted) {
                        this.value = formatted;
                    }
                }
            });

            // Prevent invalid characters in input (optional)
            field.addEventListener('keypress', function(e) {
                // Allow numbers, forward slash, and letters for month abbreviations
                const char = String.fromCharCode(e.which);
                if (!/[0-9/a-zA-Z]/.test(char) && e.which !== 8 && e.which !== 46) {
                    e.preventDefault();
                }
            });
        });
    }

    /**
     * Get formatted date value from field
     * @param {string} fieldName - Name of the date field
     * @returns {string} Formatted date
     */
    window.getFormattedDate = function(fieldName) {
        const field = document.querySelector(`[name="${fieldName}"][data-format-date]`);
        return field ? field.value : '';
    };

    /**
     * Set date value with formatting
     * @param {string} fieldName - Name of the date field
     * @param {Date|string} value - Date value to set
     */
    window.setFormattedDate = function(fieldName, value) {
        const field = document.querySelector(`[name="${fieldName}"][data-format-date]`);
        if (field) {
            field.value = formatDate(value);
        }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeDateFields);
    } else {
        initializeDateFields();
    }

    // Export functions for external use
    window.dateFormatter = {
        format: formatDate,
        parse: parseFormattedDate,
        formatAll: formatAllDateFields,
        initialize: initializeDateFields
    };
})();
