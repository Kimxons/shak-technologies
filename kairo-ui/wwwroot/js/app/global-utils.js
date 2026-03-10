/**
 * Global Utility Functions
 * Shared utility functions used across the application
 * Version: 1.0.0 - February 2026
 */

(function (window) {
  'use strict';

    // Create global utilities namespace
    window.GlobalUtils = window.GlobalUtils || {};

    /**
     * Format date to display format (DD-MMM-YYYY)
     * @param {string|Date} value - Date value to format
     * @returns {string} Formatted date string or original value if invalid
     * 
     * @example
     * GlobalUtils.formatDate('2026-02-01') // Returns: "01-Feb-2026"
     * GlobalUtils.formatDate('01/02/2026') // Returns: "01-Feb-2026"
     */
    window.GlobalUtils.formatDate = function (value) {
        if (!value || value === '') return '';

        // Try to parse the date - handle various formats
        let date;

        // Handle ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
        if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
            date = new Date(value);
        }
        // Handle slash format (DD/MM/YYYY or MM/DD/YYYY)
        else if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(value)) {
            const parts = value.split('/');
            // Assume DD/MM/YYYY format (common in banking)
            date = new Date(parts[2], parts[1] - 1, parts[0]);
        }
        // Handle other formats
        else {
            date = new Date(value);
        }

        if (isNaN(date.getTime())) return value;

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const day = String(date.getDate()).padStart(2, '0');
        const month = months[date.getMonth()];
        const year = date.getFullYear();

        return `${day}-${month}-${year}`;
    };

    /**
     * Parse date input and return in ISO format (YYYY-MM-DD)
     * @param {string} value - Date value to parse
     * @returns {string} ISO formatted date string or empty string if invalid
     * 
     * @example
     * GlobalUtils.parseDateInput('01/02/2026') // Returns: "2026-02-01"
     * GlobalUtils.parseDateInput('1 Feb 2026') // Returns: "2026-02-01"
     */
    window.GlobalUtils.parseDateInput = function (value) {
        if (!value || value === '') return '';

        let date;

        // Handle ISO format (YYYY-MM-DD)
        if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
            return value.substring(0, 10);
        }
        // Handle slash format (DD/MM/YYYY)
        else if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(value)) {
            const parts = value.split('/');
            date = new Date(parts[2], parts[1] - 1, parts[0]);
        }
        // Handle other formats
        else {
            date = new Date(value);
        }

        if (isNaN(date.getTime())) return '';

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    };

    /**
     * Format date and time to display format (DD-MMM-YYYY HH:MM:SS)
     * @param {string|Date} value - Date/time value to format
     * @returns {string} Formatted date-time string or original value if invalid
     * 
     * @example
     * GlobalUtils.formatDateTime('2026-02-01T14:30:00') // Returns: "01-Feb-2026 14:30:00"
     */
    window.GlobalUtils.formatDateTime = function (value) {
        if (!value || value === '') return '';

        let date = new Date(value);

        if (isNaN(date.getTime())) return value;

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const day = String(date.getDate()).padStart(2, '0');
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
    };

    /**
     * Get current date in ISO format (YYYY-MM-DD)
     * @returns {string} Current date in ISO format
     * 
     * @example
     * GlobalUtils.getCurrentDate() // Returns: "2026-02-02"
     */
    window.GlobalUtils.getCurrentDate = function () {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    /**
     * Get current date and time in ISO format (YYYY-MM-DDTHH:MM:SS)
     * @returns {string} Current date-time in ISO format
     * 
     * @example
     * GlobalUtils.getCurrentDateTime() // Returns: "2026-02-02T14:30:00"
     */
    window.GlobalUtils.getCurrentDateTime = function () {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    };

  console.log('[GlobalUtils] Date utility functions loaded');

})(window);
