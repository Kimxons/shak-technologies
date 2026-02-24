/**
 * Date Formatter Utility
 * Formats dates for Bill Discounting forms
 */
(function (global) {
    'use strict';

    const DateFormatter = {
        /**
         * Format date to MM/DD/YYYY format
         * @param {string|Date} dateValue - Date to format
         * @returns {string} Formatted date string
         */
        formatDate(dateValue) {
            if (!dateValue) return '';

            try {
                const date = new Date(dateValue);
                if (isNaN(date.getTime())) return '';

                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const year = date.getFullYear();

                return `${month}/${day}/${year}`;
            } catch (err) {
                console.error('[DateFormatter] Error formatting date:', err);
                return '';
            }
        },

        /**
         * Format date to YYYY-MM-DD format (for input[type="date"])
         * @param {string|Date} dateValue - Date to format
         * @returns {string} Formatted date string
         */
        formatDateForInput(dateValue) {
            if (!dateValue) return '';

            try {
                const date = new Date(dateValue);
                if (isNaN(date.getTime())) return '';

                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');

                return `${year}-${month}-${day}`;
            } catch (err) {
                console.error('[DateFormatter] Error formatting date for input:', err);
                return '';
            }
        },

        /**
         * Parse date from various formats
         * @param {string} dateString - Date string to parse
         * @returns {Date|null} Parsed date or null
         */
        parseDate(dateString) {
            if (!dateString) return null;

            try {
                const date = new Date(dateString);
                return isNaN(date.getTime()) ? null : date;
            } catch (err) {
                console.error('[DateFormatter] Error parsing date:', err);
                return null;
            }
        }
    };

    // Expose to global scope
    global.DateFormatter = DateFormatter;
    console.log('[DateFormatter] Loaded successfully');

})(window);
