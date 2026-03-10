/**
 * Shared validation utilities for Client Maintenance forms
 * Provides real-time input restrictions and validation functions
 */

(function (global) {
    'use strict';

    const FIELD_CONTAINER_SELECTOR = '.kairo-branch-control, .kairo-client-control, .kairo-product-control, .kairo-account-control, .kairo-user-control, .kairo-document-control, .kairo-file-control, .kairo-control';

    function findFieldContainer(input) {
        if (!input || typeof input.closest !== 'function') return null;
        return input.closest(FIELD_CONTAINER_SELECTOR);
    }

    function findErrorHost(input) {
        if (!input || typeof input.closest !== 'function') return input?.parentElement || null;
        return input.closest('.field-wrapper') || input.closest('.col') || input.parentElement || null;
    }

    const ValidationUtils = {
        /**
         * Check if value contains only alphabetic characters (letters and spaces)
         */
        isAlphabetic(value) {
            if (!value || typeof value !== 'string') return true;
            return /^[A-Za-z\s]+$/.test(value.trim());
        },

        /**
         * Check if value is alphanumeric (letters, numbers, spaces, common punctuation)
         */
        isAlphanumeric(value) {
            if (!value || typeof value !== 'string') return true;
            return /^[A-Za-z0-9\s\-\/.,]+$/.test(value.trim());
        },

        /**
         * Check if value is numeric only (digits)
         */
        isNumericOnly(value) {
            if (!value || typeof value !== 'string') return true;
            return /^\d+$/.test(value.trim());
        },

        /**
         * Check if value is a valid email format
         */
        isValidEmail(value) {
            if (!value || typeof value !== 'string') return true;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(value.trim());
        },

        /**
         * Check if value is a valid phone number (digits, max length)
         */
        isValidPhone(value, maxLength = 15) {
            if (!value || typeof value !== 'string') return true;
            const cleaned = value.replace(/[\s\-()]/g, '');
            return /^\d*$/.test(cleaned) && cleaned.length <= maxLength;
        },

        /**
         * Check if value is a valid website URL
         */
        isValidWebsite(value) {
            if (!value || typeof value !== 'string') return true;
            const urlRegex = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/;
            return urlRegex.test(value.trim());
        },

        /**
         * Check if value is a valid year (4 digits, reasonable range)
         */
        isValidYear(value) {
            if (!value) return true;
            const year = parseInt(value, 10);
            if (isNaN(year)) return false;
            const currentYear = new Date().getFullYear();
            return year >= 1800 && year <= currentYear + 10;
        },

        /**
         * Parse a date value to Date object
         */
        parseDate(value) {
            if (!value) return null;
            if (value instanceof Date) return value;
            
            // Handle "DD MMM YYYY" format from GlobalUtils
            if (typeof value === 'string' && /^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}$/.test(value.trim())) {
                const parts = value.trim().split(/\s+/);
                const monthMap = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
                const month = monthMap[parts[1]];
                if (month !== undefined) {
                    const date = new Date(parseInt(parts[2]), month, parseInt(parts[0]));
                    return isNaN(date.getTime()) ? null : date;
                }
            }
            
            const date = new Date(value);
            return isNaN(date.getTime()) ? null : date;
        },

        /**
         * Check if date is not in the future
         */
        isNotFutureDate(value) {
            if (!value) return true;
            const date = this.parseDate(value);
            if (!date) return false;
            const today = new Date();
            today.setHours(23, 59, 59, 999);
            return date <= today;
        },

        /**
         * Check if date is not in the past
         */
        isNotPastDate(value) {
            if (!value) return true;
            const date = this.parseDate(value);
            if (!date) return false;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return date >= today;
        },

        /**
         * Calculate age from date of birth
         */
        calculateAge(dob) {
            if (!dob) return 0;
            const birthDate = this.parseDate(dob);
            if (!birthDate) return 0;
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            return age;
        },

        /**
         * Check if number is within range
         */
        isWithinRange(value, min, max) {
            if (value === '' || value === null || value === undefined) return true;
            const num = parseFloat(value);
            if (isNaN(num)) return false;
            return num >= min && num <= max;
        },

        /**
         * Format number as accounting format (right-aligned with commas)
         */
        formatAccounting(value) {
            if (!value && value !== 0) return '';
            const num = parseFloat(value);
            if (isNaN(num)) return '';
            return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        },

        /**
         * Apply real-time input restriction for alphabetic only
         */
        restrictAlphabetic(input) {
            if (!input) return;
            input.addEventListener('input', (e) => {
                const cursorPos = e.target.selectionStart;
                const oldValue = e.target.value;
                const newValue = oldValue.replace(/[^A-Za-z\s]/g, '');
                if (oldValue !== newValue) {
                    e.target.value = newValue;
                    e.target.setSelectionRange(cursorPos - 1, cursorPos - 1);
                }
            });
        },

        /**
         * Apply real-time input restriction for alphanumeric only
         */
        restrictAlphanumeric(input) {
            if (!input) return;
            input.addEventListener('input', (e) => {
                const cursorPos = e.target.selectionStart;
                const oldValue = e.target.value;
                const newValue = oldValue.replace(/[^A-Za-z0-9\s\-\/.,]/g, '');
                if (oldValue !== newValue) {
                    e.target.value = newValue;
                    e.target.setSelectionRange(cursorPos - 1, cursorPos - 1);
                }
            });
        },

        /**
         * Apply real-time input restriction for numeric only
         */
        restrictNumeric(input) {
            if (!input) return;
            input.addEventListener('input', (e) => {
                const cursorPos = e.target.selectionStart;
                const oldValue = e.target.value;
                const newValue = oldValue.replace(/[^0-9]/g, '');
                if (oldValue !== newValue) {
                    e.target.value = newValue;
                    e.target.setSelectionRange(cursorPos - 1, cursorPos - 1);
                }
            });
        },

        /**
         * Apply real-time input restriction for phone numbers
         */
        restrictPhone(input, maxLength = 15) {
            if (!input) return;
            input.setAttribute('maxlength', maxLength);
            input.addEventListener('input', (e) => {
                const cursorPos = e.target.selectionStart;
                const oldValue = e.target.value;
                const newValue = oldValue.replace(/[^0-9\s\-()]/g, '');
                if (oldValue !== newValue) {
                    e.target.value = newValue;
                    e.target.setSelectionRange(cursorPos - 1, cursorPos - 1);
                }
            });
        },

        /**
         * Apply accounting format on blur (right-aligned with commas)
         */
        applyAccountingFormat(input) {
            if (!input || input.dataset.accountingApplied) return;
            input.dataset.accountingApplied = 'true';
            input.classList.add('text-end');
            input.type = 'text';
            
            input.addEventListener('blur', (e) => {
                const value = e.target.value.replace(/,/g, '');
                if (value && !isNaN(value)) {
                    e.target.value = this.formatAccounting(value);
                }
            });
            
            input.addEventListener('focus', (e) => {
                const value = e.target.value.replace(/,/g, '');
                e.target.value = value;
            });
            
            input.addEventListener('keydown', (e) => {
                const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
                if (allowedKeys.includes(e.key) || (e.key === '.' && !e.target.value.includes('.')) || /^[0-9]$/.test(e.key)) {
                    return;
                }
                e.preventDefault();
            });
        },

        /**
         * Setup date field with proper constraints
         */
        setupDateField(input, options = {}) {
            if (!input || input.dataset.dateSetup) return;
            input.dataset.dateSetup = 'true';
            
            const today = new Date();
            const todayISO = today.toISOString().slice(0, 10);
            
            if (options.notFuture) {
                input.setAttribute('max', todayISO);
            }
            
            if (options.notPast) {
                input.setAttribute('min', todayISO);
            }
            
            if (options.minAge) {
                const maxDate = new Date(today);
                maxDate.setFullYear(maxDate.getFullYear() - options.minAge);
                input.setAttribute('max', maxDate.toISOString().slice(0, 10));
            }
            
            // T key shortcut for today's date
            input.addEventListener('keydown', (e) => {
                if (e.key.toLowerCase() === 't' && !e.ctrlKey && !e.altKey) {
                    e.preventDefault();
                    input.value = todayISO;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
        },

        /**
         * Show validation error on field
         */
        showError(input, message) {
            if (!input) return;
            const fieldContainer = findFieldContainer(input);
            const errorHost = findErrorHost(input);

            if (fieldContainer) {
                fieldContainer.classList.add('field-invalid');
                fieldContainer.classList.remove('is-invalid');
            }

            input.classList.add('field-invalid');
            input.classList.remove('is-invalid');

            if (errorHost) {
                errorHost.classList.add('field-wrapper', 'has-error');
                let errorDiv = errorHost.querySelector('.field-error-message');
                if (!errorDiv) {
                    errorDiv = document.createElement('div');
                    errorDiv.className = 'field-error-message';
                    errorHost.appendChild(errorDiv);
                }
                errorDiv.textContent = message;

                const legacyError = errorHost.querySelector('.invalid-feedback');
                if (legacyError) {
                    legacyError.remove();
                }
            }
        },

        /**
         * Clear validation error from field
         */
        clearError(input) {
            if (!input) return;
            const fieldContainer = findFieldContainer(input);
            const errorHost = findErrorHost(input);

            if (fieldContainer) {
                fieldContainer.classList.remove('field-invalid', 'is-invalid');
            }

            input.classList.remove('field-invalid', 'is-invalid');

            if (errorHost) {
                errorHost.classList.remove('has-error');
                const errorDiv = errorHost.querySelector('.field-error-message');
                if (errorDiv) {
                    errorDiv.remove();
                }
                const legacyError = errorHost.querySelector('.invalid-feedback');
                if (legacyError) {
                    legacyError.remove();
                }
            }
        }
    };

    // Export to global scope
    global.ValidationUtils = ValidationUtils;

})(window);
