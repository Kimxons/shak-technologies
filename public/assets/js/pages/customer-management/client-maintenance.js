(function (global) {

  if (global.__ClientMaintenanceLoaded) {
    console.warn("client-maintenance.js already loaded; skipping duplicate execution.");
    return;
  }
  global.__ClientMaintenanceLoaded = true;

  // Track if dependencies are loaded
  let dependenciesReady = false;

  // Load dependencies before initializing
  (async () => {
    const { ServiceLoader } = global;
    if (!ServiceLoader) {
      console.error('[ClientMaintenance] ServiceLoader not available');
      return;
    }

    try {
      await ServiceLoader.loadCore();
      await ServiceLoader.loadCommonServices();
      await ServiceLoader.loadUIComponents(['lookupField']);
      await ServiceLoader.loadFileService();
      await ServiceLoader.loadImageDetectionService();
      await ServiceLoader.loadRecentActivityService();
      await ServiceLoader.loadClientDocumentService();
      await ServiceLoader.loadTempImageService();
      await ServiceLoader.loadClientApprovalService();

      const basePath = ServiceLoader.getBasePath();
      await ServiceLoader.loadScripts([
        `${basePath}data/countries.js`,
        `${basePath}models/customer-management/clientFormModel.js`,
        `${basePath}auth/auth.config.js`,
        `${basePath}auth/auth.service.js`,
        `${basePath}app.js`
      ]);

      dependenciesReady = true;

      // Initialize if DOM is already ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initClientMaintenancePage);
      } else {
        initClientMaintenancePage();
      }
    } catch (error) {
    }
  })();

  const CLIENT_SCOPE = {
    INDIVIDUAL: "individual",
    CORPORATE: "corporate"
  };

  const CLIENT_TYPE_SCOPE_MAP = {
    B: [CLIENT_SCOPE.CORPORATE, "bank"],
    C: [CLIENT_SCOPE.CORPORATE],
    E: [CLIENT_SCOPE.INDIVIDUAL, "employee"],
    I: [CLIENT_SCOPE.INDIVIDUAL],
    M: [CLIENT_SCOPE.INDIVIDUAL, "minor"],
    N: [CLIENT_SCOPE.INDIVIDUAL, "nonresident"],
    G: ["group"],
    NC: [CLIENT_SCOPE.INDIVIDUAL, "nonclient"],
    default: [CLIENT_SCOPE.INDIVIDUAL]
  };

  const MIME_EXTENSION_MAP = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  };

  const STEP_SCOPE_ATTR = "stepScope";

  const coerceBool = (value) => {
    if (value === true || value === false) return value;
    if (value === 1 || value === "1") return true;
    if (value === 0 || value === "0") return false;
    if (typeof value === "string") {
      const v = value.trim().toLowerCase();
      if (v === "true" || v === "yes" || v === "y") return true;
      if (v === "false" || v === "no" || v === "n") return false;
    }
    return Boolean(value);
  };

  const boolToInt = (value) => (coerceBool(value) ? 1 : 0);

  // Helper to read checkbox value correctly - use .checked for checkboxes
  const getCheckboxValue = (element) => {
    if (!element) return false;
    // If it's a checkbox, use .checked property
    if (element.type === 'checkbox') {
      return element.checked;
    }
    // Otherwise fall back to coerceBool of value
    return coerceBool(element.value);
  };

  const extractOldApiInnerDetails = (response) => {
    const wrapper = response?.data?.[0] ?? response?.Details?.[0] ?? response?.[0];
    return wrapper?.Details ?? null;
  };

  const extractOldApiResponseCode = (response) => {
    const code =
      response?.code ??
      response?.ResponseCode ??
      response?.data?.[0]?.ResponseCode ??
      response?.Details?.[0]?.ResponseCode ??
      response?.Details01?.[0]?.ResponseCode ??
      response?.Details02?.[0]?.ResponseCode ??
      response?.Details03?.[0]?.ResponseCode ??
      null;
    return code === null || code === undefined ? null : String(code);
  };

  const isOldApiFailure = (response) => {
    if (!response) return true;
    if (response?.success === false) return true;
    const code = extractOldApiResponseCode(response);
    return code !== null && code !== "00";
  };

  const showBlockingError = async (title, responseOrMessage) => {
    const code = responseOrMessage?.code || responseOrMessage?.ResponseCode || responseOrMessage?.Details?.[0]?.ResponseCode || "";
    const message =
      responseOrMessage?.message ||
      responseOrMessage?.ResponseMessage ||
      responseOrMessage?.Details?.[0]?.ResponseMessage ||
      (typeof responseOrMessage === "string" ? responseOrMessage : "Unable to save.");

    const full = code && code !== "00" ? `${code}: ${message}` : message;
    if (global.Swal && typeof global.Swal.fire === "function") {
      await global.Swal.fire({
        icon: "error",
        title: title || "Save failed",
        text: full,
        confirmButtonText: "OK"
      });
      return;
    }

    // Fallbacks if SweetAlert2 is not loaded
    try {
      global.alert(full);
    } catch (e) {
      console.error(e);
    }
  };

  // Format date for display using GlobalUtils if available, otherwise ISO format
  const toDateInputValue = (value) => {
    if (!value) return "";
    // Skip "null" dates like 1900-01-01
    if (typeof value === "string" && value.startsWith("1900-01-01")) return "";
    // Use GlobalUtils.formatDate if available (returns "D MMM YYYY" format)
    if (window.GlobalUtils?.formatDate) {
      return window.GlobalUtils.formatDate(value);
    }
    // Fallback to ISO format for native date inputs
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
  };

  const setRadioGroupValue = (form, name, targetValue) => {
    if (!form || !name) return;
    const radios = form.querySelectorAll(`input[type="radio"][name='${name}']`);
    if (!radios.length) return;
    radios.forEach((radio) => {
      radio.checked = String(radio.value) === String(targetValue);
    });
  };

  // Helper to set a date field value (handles flatpickr hidden inputs)
  const setDateFieldValue = (el, value) => {
    if (!el) return;
    const formatted = toDateInputValue(value);

    // Check if flatpickr is attached
    const fpInstance = el._flatpickr;

    if (fpInstance) {
      // Use flatpickr API - this handles display formatting via altInput
      fpInstance.setDate(value, true);
    } else if (el.type === "hidden" && el.classList?.contains("flatpickr-input")) {
      // Flatpickr made this hidden and created an altInput sibling
      el.value = value; // Hidden stores original format
      const altInput = el.nextElementSibling;
      if (altInput && altInput.classList.contains('flatpickr-input')) {
        altInput.value = formatted;
      }
    } else {
      // Regular text input or flatpickr not yet initialized
      el.value = formatted;
    }
  };

  const setFormFieldValue = (form, name, value) => {
    if (!form || !name) return;
    let field = form.elements?.[name];

    // If field is hidden (e.g., flatpickr converts input to hidden with altInput)
    if (field?.type === "hidden" && field.classList?.contains("flatpickr-input")) {
      const formatted = toDateInputValue(value);
      if (field._flatpickr) {
        // Use flatpickr API - this updates both hidden and altInput
        field._flatpickr.setDate(value, true);
      } else {
        // Flatpickr not initialized yet - set hidden and find altInput (next sibling)
        field.value = value; // Hidden stores original/ISO format
        const altInput = field.nextElementSibling;
        if (altInput && altInput.classList.contains('flatpickr-input')) {
          altInput.value = formatted;
        }
      }
      return;
    }

    // Handle non-flatpickr hidden fields
    if (field?.type === "hidden") {
      // Try to find visible input with same name
      const visibleField = form.querySelector(`input[name="${name}"]:not([type="hidden"])`);
      if (visibleField) {
        field = visibleField;
      }
    }

    if (!field) {
      return;
    }

    if (field.type === "checkbox") {
      field.checked = coerceBool(value);
      return;
    }
    // For date fields (text or date type), use formatted date
    if (field.type === "date" || field.classList?.contains("bs-input-date")) {
      const formatted = toDateInputValue(value);
      field.value = formatted;
      return;
    }
    field.value = value ?? "";
  };

  const normalizeTokens = (tokens) => {
    if (!tokens) return [];
    if (tokens instanceof Set) {
      return Array.from(tokens).map((token) => token.toLowerCase());
    }
    if (Array.isArray(tokens)) {
      return tokens.filter(Boolean).map((token) => token.toLowerCase());
    }
    return [tokens].filter(Boolean).map((token) => token.toLowerCase());
  };

  const deriveScopeTokens = (clientType) => {
    const key = (clientType || "").trim().toUpperCase();
    const tokens = CLIENT_TYPE_SCOPE_MAP[key] || CLIENT_TYPE_SCOPE_MAP.default;
    return [...new Set(normalizeTokens(tokens))];
  };

  const formatScopeToken = (token = "") =>
    token
      .split(/[\s_-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

  const describeScopeTokens = (tokens) => {
    const normalized = normalizeTokens(tokens).filter((value) => value && value !== "all");
    if (!normalized.length) {
      return formatScopeToken(CLIENT_SCOPE.INDIVIDUAL);
    }
    return normalized.map(formatScopeToken).join(" / ");
  };

  const formatDate = (value, includeTime = false) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return includeTime ? date.toLocaleString() : date.toLocaleDateString();
  };

  const toISODate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString();
  };

  const generateRandomId = () => Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

  const generateClientId = () => `CL${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const readNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  };

  const inferMimeFromName = (fileName) => {
    if (!fileName || !fileName.includes(".")) return "application/octet-stream";
    const ext = fileName.split(".").pop().toLowerCase();
    return MIME_EXTENSION_MAP[ext] || "application/octet-stream";
  };

  const resolveMimeType = (file) => {
    if (!file) return "application/octet-stream";
    if (file.type) return file.type;
    return inferMimeFromName(file.name);
  };

  const supportsScope = (node, scopeTokens, attr = STEP_SCOPE_ATTR) => {
    const raw = (node.dataset[attr] || "")
      .split(",")
      .map((token) => token.trim().toLowerCase())
      .filter(Boolean);
    if (!raw.length || raw.includes("all")) return true;
    const activeTokens = normalizeTokens(scopeTokens);
    if (!activeTokens.length) return false;
    return raw.some((token) => activeTokens.includes(token));
  };

  const disableFieldsInNode = (node, shouldDisable) => {
    const selectors = node.matches?.("input, select, textarea") ? [node] : Array.from(node.querySelectorAll("input, select, textarea"));
    selectors.forEach((field) => {
      // Skip fields that are part of collection forms (address, relations, documents)
      // These are managed separately by setXFormEnabled methods
      if (field.dataset.addressField || field.dataset.relationField || field.dataset.documentField) {
        return;
      }
      if (shouldDisable) {
        if (!field.disabled) {
          field.dataset.prevDisabled = "true";
          field.disabled = true;
        }
      } else if (field.dataset.prevDisabled) {
        field.disabled = false;
        delete field.dataset.prevDisabled;
      }
    });
  };

  const setText = (node, value) => {
    if (!node) return;
    node.textContent = value;
  };

  // ============================================================================
  // VALIDATION UTILITIES
  // ============================================================================

  /**
   * Check if value contains only alphabetic characters (letters and spaces)
   */
  const isAlphabetic = (value) => {
    if (!value || typeof value !== 'string') return true; // Empty is valid (use required for mandatory)
    return /^[A-Za-z\s]+$/.test(value.trim());
  };

  /**
   * Check if value is alphanumeric (letters, numbers, spaces, common punctuation)
   */
  const isAlphanumeric = (value) => {
    if (!value || typeof value !== 'string') return true;
    return /^[A-Za-z0-9\s\-\/.,]+$/.test(value.trim());
  };

  /**
   * Check if value is numeric only (digits)
   */
  const isNumericOnly = (value) => {
    if (!value || typeof value !== 'string') return true;
    return /^\d+$/.test(value.trim());
  };

  /**
   * Check if value is a valid email format
   */
  const isValidEmail = (value) => {
    if (!value || typeof value !== 'string') return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value.trim());
  };

  /**
   * Check if value is a valid phone number (digits, max length)
   */
  const isValidPhone = (value, maxLength = 15) => {
    if (!value || typeof value !== 'string') return true;
    const cleaned = value.replace(/[\s\-()]/g, '');
    return /^\d*$/.test(cleaned) && cleaned.length <= maxLength;
  };

  /**
   * Check if value is a valid website URL
   */
  const isValidWebsite = (value) => {
    if (!value || typeof value !== 'string') return true;
    const urlRegex = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/;
    return urlRegex.test(value.trim());
  };

  /**
   * Check if value is a valid year (4 digits, reasonable range)
   */
  const isValidYear = (value) => {
    if (!value) return true;
    const year = parseInt(value, 10);
    if (isNaN(year)) return false;
    const currentYear = new Date().getFullYear();
    return year >= 1800 && year <= currentYear + 10;
  };

  /**
   * Parse a date value to Date object (handles various formats)
   */
  const parseDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return value;
    
    // Handle "DD MMM YYYY" format from GlobalUtils
    if (typeof value === 'string' && /^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}$/.test(value.trim())) {
      const parts = value.trim().split(/\s+/);
      const months = { 'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5, 'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11 };
      const day = parseInt(parts[0], 10);
      const month = months[parts[1].toLowerCase()];
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && month !== undefined && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
    
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  };

  /**
   * Check if date is not in the future
   */
  const isNotFutureDate = (value) => {
    if (!value) return true;
    const date = parseDate(value);
    if (!date) return true;
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return date <= today;
  };

  /**
   * Check if date is not in the past
   */
  const isNotPastDate = (value) => {
    if (!value) return true;
    const date = parseDate(value);
    if (!date) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  };

  /**
   * Check if date1 is before date2
   */
  const isDateBefore = (date1Value, date2Value) => {
    if (!date1Value || !date2Value) return true;
    const date1 = parseDate(date1Value);
    const date2 = parseDate(date2Value);
    if (!date1 || !date2) return true;
    return date1 < date2;
  };

  /**
   * Calculate age from date of birth
   */
  const calculateAge = (dob) => {
    if (!dob) return null;
    const birthDate = parseDate(dob);
    if (!birthDate) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  /**
   * Check if number is within range
   */
  const isWithinRange = (value, min, max) => {
    if (value === '' || value === null || value === undefined) return true;
    const num = parseFloat(value);
    if (isNaN(num)) return false;
    return num >= min && num <= max;
  };

  /**
   * Format number as accounting format (right-aligned with commas)
   */
  const formatAccounting = (value) => {
    if (!value && value !== 0) return '';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  /**
   * Apply real-time input restriction for alphabetic only
   */
  const restrictAlphabetic = (input) => {
    if (!input) return;
    input.addEventListener('input', (e) => {
      const original = e.target.value;
      const cleaned = original.replace(/[^A-Za-z\s]/g, '');
      if (cleaned !== original) {
        e.target.value = cleaned;
      }
    });
  };

  /**
   * Apply real-time input restriction for alphanumeric only
   */
  const restrictAlphanumeric = (input) => {
    if (!input) return;
    input.addEventListener('input', (e) => {
      const original = e.target.value;
      const cleaned = original.replace(/[^A-Za-z0-9\s\-\/.,]/g, '');
      if (cleaned !== original) {
        e.target.value = cleaned;
      }
    });
  };

  /**
   * Apply real-time input restriction for numeric only
   */
  const restrictNumeric = (input) => {
    if (!input) return;
    input.addEventListener('input', (e) => {
      const original = e.target.value;
      const cleaned = original.replace(/[^\d]/g, '');
      if (cleaned !== original) {
        e.target.value = cleaned;
      }
    });
  };

  /**
   * Apply real-time input restriction for phone numbers (digits only, max length)
   */
  const restrictPhone = (input, maxLength = 15) => {
    if (!input) return;
    input.setAttribute('maxlength', maxLength);
    input.addEventListener('input', (e) => {
      const original = e.target.value;
      const cleaned = original.replace(/[^\d]/g, '').substring(0, maxLength);
      if (cleaned !== original) {
        e.target.value = cleaned;
      }
    });
  };

  /**
   * Apply real-time input restriction for max numeric value
   */
  const restrictMaxValue = (input, maxValue) => {
    if (!input) return;
    input.addEventListener('input', (e) => {
      const value = parseInt(e.target.value, 10);
      if (!isNaN(value) && value > maxValue) {
        e.target.value = maxValue;
      }
    });
    input.addEventListener('blur', (e) => {
      const value = parseInt(e.target.value, 10);
      if (!isNaN(value) && value > maxValue) {
        e.target.value = maxValue;
      }
    });
  };

  /**
   * Apply accounting format on blur (right-aligned)
   * Fixes: Prevents clearing other fields, properly formats with commas
   */
  const applyAccountingFormat = (input) => {
    if (!input || input.dataset.accountingApplied) return;
    input.dataset.accountingApplied = 'true';
    input.classList.add('text-end');
    input.type = 'text'; // Change from number to text for comma formatting
    
    input.addEventListener('blur', (e) => {
      const value = e.target.value.replace(/,/g, '');
      if (value === '' || value === '-') return;
      const num = parseFloat(value);
      if (!isNaN(num)) {
        e.target.value = formatAccounting(num);
      }
    });
    
    input.addEventListener('focus', (e) => {
      const value = e.target.value.replace(/,/g, '');
      if (value !== '') {
        e.target.value = value;
      }
    });
    
    // Allow only numeric input with decimal
    input.addEventListener('keydown', (e) => {
      const allowed = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End', '.', '-'];
      if (allowed.includes(e.key) || /^\d$/.test(e.key) || (e.ctrlKey && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase()))) {
        return;
      }
      e.preventDefault();
    });
  };

  /**
   * Setup date field with proper constraints and T key shortcut
   * Works with Flatpickr date pickers - configures maxDate/minDate on Flatpickr instance
   */
  const setupDateField = (input, options = {}) => {
    if (!input) {
      console.warn('[setupDateField] No input provided');
      return;
    }
    
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayISO = `${year}-${month}-${day}`;
    
    
    let maxDate = null;
    let minDate = null;
    
    // Calculate max/min dates
    if (options.notFuture) {
      maxDate = todayISO;
    }
    
    if (options.notPast) {
      minDate = todayISO;
    }
    
    // For DOB with minimum age - can be dynamic based on client type
    if (options.minAge) {
      // If minAge is a function, call it to get the actual age requirement
      const actualMinAge = typeof options.minAge === 'function' ? options.minAge() : options.minAge;
      
      if (actualMinAge > 0) {
        const maxDateObj = new Date(today);
        maxDateObj.setFullYear(maxDateObj.getFullYear() - actualMinAge);
        const maxYear = maxDateObj.getFullYear();
        const maxMonth = String(maxDateObj.getMonth() + 1).padStart(2, '0');
        const maxDay = String(maxDateObj.getDate()).padStart(2, '0');
        maxDate = `${maxYear}-${maxMonth}-${maxDay}`;
      } else {
        // No age restriction (e.g., for minors)
        maxDate = todayISO;
      }
    }
    
    // Skip if already setup
    if (input.dataset.dateSetup) {
      return;
    }
    input.dataset.dateSetup = 'true';
    
    // Function to configure Flatpickr instance
    const configureFlatpickr = () => {
      if (!input._flatpickr) {
        console.warn('[setupDateField] Flatpickr not yet initialized on', input.id);
        return false;
      }
      
      const fp = input._flatpickr;
      
      try {
        // Set max/min date constraints on Flatpickr
        if (maxDate) {
          fp.set('maxDate', maxDate);
        }
        
        if (minDate) {
          fp.set('minDate', minDate);
        }
        
        // Enable keyboard shortcut: T for today
        const altInput = fp.altInput;
        if (altInput && !altInput.dataset.dateHandlersAttached) {
          altInput.dataset.dateHandlersAttached = 'true';
          
          // T key for today
          altInput.addEventListener('keypress', (e) => {
            if (e.key.toLowerCase() === 't') {
              e.preventDefault();
              e.stopPropagation();
              
              // Check if today is valid
              let canSetToday = true;
              if (maxDate && todayISO > maxDate) canSetToday = false;
              if (minDate && todayISO < minDate) canSetToday = false;
              
              if (canSetToday) {
                fp.setDate(todayISO, true);
              } else {
                alert(`Today is not valid for ${input.id || 'this field'}`);
              }
              return false;
            }
          });
          
          // Validate year input to prevent invalid values like 22222222
          altInput.addEventListener('input', (e) => {
            const value = e.target.value;
            // Match year patterns (4 digits)
            const yearMatch = value.match(/(\d{5,})/g);
            if (yearMatch) {
              // Found 5+ digit year - invalid!
              console.warn('[setupDateField] Invalid year detected:', value);
              // Clear the Flatpickr date
              fp.clear();
              e.target.value = '';
              setTimeout(() => {
                alert('Invalid year. Please enter a valid date.');
              }, 100);
            }
          });
          
          // Additional validation on blur
          altInput.addEventListener('blur', (e) => {
            const value = e.target.value;
            if (!value) return;
            
            // Check if year is reasonable (1800-2200)
            const yearMatch = value.match(/\b(\d{4})\b/);
            if (yearMatch) {
              const year = parseInt(yearMatch[1], 10);
              if (year < 1800 || year > 2200) {
                console.warn('[setupDateField] Year out of range:', year);
                fp.clear();
                alert(`Year must be between 1800 and 2200`);
              }
            }
          });
          
        }
        
        // Add validation on change
        fp.config.onChange.push((selectedDates, dateStr) => {
          if (!dateStr) return;
          
          // Flatpickr will handle validation with maxDate/minDate
          // Just log it for debugging
          if (maxDate && dateStr > maxDate) {
          } else if (minDate && dateStr < minDate) {
          } else {
          }
        });
        
        return true;
      } catch (e) {
        console.error('[setupDateField] Error configuring Flatpickr:', e);
        return false;
      }
    };
    
    // Try to configure immediately if Flatpickr is already initialized
    if (input._flatpickr) {
      configureFlatpickr();
    } else {
      // Wait for Flatpickr to be initialized
      const checkInterval = setInterval(() => {
        if (input._flatpickr) {
          clearInterval(checkInterval);
            // Recalculate max/min dates in case they're dynamic
            if (typeof options.minAge === 'function') {
              const actualMinAge = options.minAge();
              if (actualMinAge > 0) {
                const maxDateObj = new Date(today);
                maxDateObj.setFullYear(maxDateObj.getFullYear() - actualMinAge);
                const maxYear = maxDateObj.getFullYear();
                const maxMonth = String(maxDateObj.getMonth() + 1).padStart(2, '0');
                const maxDay = String(maxDateObj.getDate()).padStart(2, '0');
                maxDate = `${maxYear}-${maxMonth}-${maxDay}`;
              } else {
                maxDate = todayISO;
              }
            }
        }
      }, 5000);
    }
    
  };

  class Stepper {
    constructor(root) {
      this.root = root;
      this.triggers = [];
      this.panels = [];
      if (!root) return;
      this.triggers = Array.from(root.querySelectorAll("[data-step-id]"));
      this.panels = Array.from(root.querySelectorAll("[data-step-panel]"));
      const defaultTrigger = this.triggers.find((btn) => btn.hasAttribute("data-step-default")) || this.triggers[0];
      this.activeStep = defaultTrigger?.dataset.stepId || null;
      this.scopeTokens = [CLIENT_SCOPE.INDIVIDUAL];
      this.applyOrdering();
      this.bindTriggers();
      this.sync();
    }

    resolveOrder(trigger) {
      if (!trigger) return Number(trigger?.dataset?.stepIndex) || 99;
      const attr = trigger.dataset.stepOrder;
      if (attr && this.scopeTokens) {
        const mappings = attr
          .split(";")
          .map((entry) => entry.split(":").map((part) => part.trim().toLowerCase()))
          .filter((parts) => parts.length === 2 && parts[0]);
        for (const token of this.scopeTokens) {
          const pair = mappings.find((item) => item[0] === token);
          if (pair) {
            const value = Number(pair[1]);
            if (!Number.isNaN(value)) return value;
          }
        }
        const fallback = mappings.find((item) => item[0] === "all");
        if (fallback) {
          const fallbackValue = Number(fallback[1]);
          if (!Number.isNaN(fallbackValue)) return fallbackValue;
        }
      }
      const fallbackIndex = Number(trigger.dataset.stepIndex);
      return Number.isNaN(fallbackIndex) ? 99 : fallbackIndex;
    }

    applyOrdering() {
      this.triggers.forEach((trigger) => {
        trigger.style.order = this.resolveOrder(trigger);
      });
    }

    bindTriggers() {
      this.triggers.forEach((trigger) => {
        trigger.addEventListener("click", () => {
          if (trigger.hidden) return;
          this.goTo(trigger.dataset.stepId);
        });
      });
    }

    goTo(stepId) {
      if (!stepId) return;
      if (!this.isStepVisible(stepId)) return;
      this.activeStep = stepId;
      this.sync();
    }

    next() {
      const order = this.getVisibleOrder();
      const index = order.indexOf(this.activeStep);
      if (index === -1 || index === order.length - 1) return;
      this.goTo(order[index + 1]);
    }

    prev() {
      const order = this.getVisibleOrder();
      const index = order.indexOf(this.activeStep);
      if (index <= 0) return;
      this.goTo(order[index - 1]);
    }

    getVisibleOrder() {
      return this.triggers
        .filter((btn) => !btn.hidden)
        .sort((a, b) => this.resolveOrder(a) - this.resolveOrder(b))
        .map((btn) => btn.dataset.stepId);
    }

    isStepVisible(stepId) {
      const trigger = this.triggers.find((btn) => btn.dataset.stepId === stepId);
      return trigger ? !trigger.hidden : false;
    }

    setScope(scopeTokens) {
      this.scopeTokens = normalizeTokens(scopeTokens);
      if (!this.scopeTokens.length) {
        this.scopeTokens = [CLIENT_SCOPE.INDIVIDUAL];
      }
      let fallbackStep = null;
      this.triggers.forEach((trigger) => {
        const shouldShow = supportsScope(trigger, this.scopeTokens);
        trigger.hidden = !shouldShow;
        trigger.classList.toggle("is-active", shouldShow && trigger.dataset.stepId === this.activeStep);
        if (!fallbackStep && shouldShow) {
          fallbackStep = trigger.dataset.stepId;
        }
      });

      this.panels.forEach((panel) => {
        const shouldShow = supportsScope(panel, this.scopeTokens);
        panel.hidden = !shouldShow;
        if (!shouldShow) {
          panel.classList.remove("is-active");
        }
      });

      this.applyOrdering();

      if (this.activeStep && !this.isStepVisible(this.activeStep)) {
        this.goTo(fallbackStep);
      } else {
        this.sync();
      }
    }

    sync() {
      this.triggers.forEach((trigger) => {
        trigger.classList.toggle("is-active", trigger.dataset.stepId === this.activeStep && !trigger.hidden);
      });

      this.panels.forEach((panel) => {
        const isActive = panel.dataset.stepPanel === this.activeStep && !panel.hidden;
        panel.classList.toggle("is-active", isActive);
      });

      this.root?.dispatchEvent(
        new CustomEvent("stepchange", {
          detail: { step: this.activeStep }
        })
      );
    }
  }

  class ClientLookupModal {
    constructor({ clientService, session, onSelect }) {
      this.clientService = clientService;
      this.session = session;
      this.onSelect = onSelect;
      this.modalElement = document.getElementById("clientLookupModal");
      this.bootstrapModal = null;
      this.form = this.modalElement?.querySelector("[data-lookup-form]");
      this.resultsBody = this.modalElement?.querySelector("[data-lookup-results]");
      this.emptyState = this.modalElement?.querySelector("[data-lookup-empty]");
      this.loadingState = this.modalElement?.querySelector("[data-lookup-loading]");
      this.searchButton = this.modalElement?.querySelector("[data-lookup-submit]");
      this.resetButton = this.modalElement?.querySelector("[data-lookup-reset]");
      this.refreshButton = this.modalElement?.querySelector("[data-lookup-refresh]");
      this.results = [];
      this.prefillValue = "";
      this.autoSelectExact = false;
      this.bindEvents();
    }

    ensureModalInstance() {
      if (!this.modalElement) return null;
      if (this.bootstrapModal) return this.bootstrapModal;
      const ModalCtor = window.bootstrap?.Modal;
      if (!ModalCtor) return null;
      this.bootstrapModal = typeof ModalCtor.getOrCreateInstance === "function"
        ? ModalCtor.getOrCreateInstance(this.modalElement)
        : new ModalCtor(this.modalElement);
      return this.bootstrapModal;
    }

    isReady() {
      return Boolean(this.ensureModalInstance());
    }

    bindEvents() {
      this.form?.addEventListener("submit", (event) => {
        event.preventDefault();
        this.performSearch();
      });
      this.searchButton?.addEventListener("click", (event) => {
        event.preventDefault();
        this.performSearch();
      });
      this.resetButton?.addEventListener("click", (event) => {
        event.preventDefault();
        this.resetCriteria();
      });
      this.refreshButton?.addEventListener("click", (event) => {
        event.preventDefault();
        this.performSearch();
      });
      this.resultsBody?.addEventListener("click", (event) => {
        const button = event.target.closest("[data-lookup-select]");
        if (!button) return;
        const row = button.closest("tr[data-result-index]");
        if (!row) return;
        this.selectResult(Number(row.dataset.resultIndex));
      });
      this.resultsBody?.addEventListener("dblclick", (event) => {
        const row = event.target.closest("tr[data-result-index]");
        if (!row) return;
        this.selectResult(Number(row.dataset.resultIndex));
      });
    }

    open(prefillValue = "") {
      const modalInstance = this.ensureModalInstance();
      if (!modalInstance) return;
      this.prefillValue = prefillValue?.trim() || "";
      this.autoSelectExact = Boolean(this.prefillValue);
      if (this.form) {
        const idField = this.form.querySelector("[data-lookup-field='clientId']");
        if (idField) idField.value = this.prefillValue;
      }
      modalInstance.show();
      if (this.prefillValue) {
        this.performSearch();
      } else {
        this.showEmptyState("Enter at least one filter above and click Search to query Core Banking clients.");
      }
    }

    close() {
      this.ensureModalInstance()?.hide();
    }

    resetCriteria() {
      this.form?.querySelectorAll("[data-lookup-field]").forEach((field) => {
        field.value = "";
      });
      this.prefillValue = "";
      this.autoSelectExact = false;
      this.renderResults([]);
    }

    collectCriteria() {
      if (!this.form) return [];
      const fields = Array.from(this.form.querySelectorAll("[data-lookup-field]"));
      return fields
        .map((field) => ({
          column: field.dataset.lookupField,
          value: field.value?.trim() || "",
          mode: this.form.querySelector(`[data-lookup-mode='${field.dataset.lookupField}']`)?.value || "Like"
        }))
        .filter((entry) => entry.value);
    }

    buildClause(column, mode, value) {
      if (!column || !value) return null;
      const sanitized = value.replace(/'/g, "''");
      if (mode === "Exact") {
        return `${column} = '${sanitized}'`;
      }
      return `${column} like '%${sanitized}%'`;
    }

    buildSearchPayload() {
      const criteria = this.collectCriteria();
      const clauses = criteria.map((entry) => this.buildClause(entry.column, entry.mode, entry.value)).filter(Boolean);
      const whereStmt = clauses.length ? clauses.join(" AND ") : "";

      const envBranchId = window.Environment?.OurBranchID || window.Environment?.ourBranchId || "";
      const ourBranchId = this.session?.branchID || this.session?.branchId || this.session?.BranchID || envBranchId || "0101";
      return {
        TableID: "clientId",
        AdvFilterString: "",
        WhereStmt: whereStmt,
        //OrderBy: "order by clientId asc",
        PrevOrNext: "1",
        RefID: "",
        OperatorID: this.session?.operatorId || this.session?.name || "web_portal",
        ModuleID: 1000,
        OurBranchID: ourBranchId
      };
    }

    normalizeResults(response) {
      let results = response?.Details?.SearchResults || response?.Details || response?.SearchResults || [];
      if (!Array.isArray(results)) {
        results = results ? [results] : [];
      }
      return results.map((item) => ({
        ClientID: item.ClientID || item.clientId || "",
        Name: item.Name || item.fullName || "",
        IDNumber: item.IDNumber || item.nationalId || "",
        MobileNo: item.MobileNo || item.mobileNo || "",
        LegacyAccountID: item.LegacyAccountID || item.legacyAccountID || ""
      }));
    }

    async performSearch() {
      if (!this.clientService) {
        this.showEmptyState("ClientService not available.");
        return;
      }
      const payload = this.buildSearchPayload();
      this.setLoading(true);
      try {
        const response = await this.clientService.searchClients(payload);
        const results = this.normalizeResults(response);
        this.renderResults(results);
        if (this.autoSelectExact && this.prefillValue) {
          const match = results.find((record) => record.ClientID?.toUpperCase() === this.prefillValue.toUpperCase());
          if (match) {
            this.handleSelect(match);
            return;
          }
        }
      } catch (error) {
        console.error(error);
        this.showEmptyState(error.message || "Unable to fetch clients.");
      } finally {
        this.setLoading(false);
        this.autoSelectExact = false;
      }
    }

    renderResults(results) {
      if (!this.resultsBody) return;
      this.results = results;
      this.resultsBody.innerHTML = "";
      if (!results.length) {
        this.showEmptyState("No clients matched the supplied filters.");
        return;
      }
      this.hideEmptyState();
      results.forEach((record, index) => {
        const row = document.createElement("tr");
        row.dataset.resultIndex = String(index);
        row.innerHTML = `
        <td>${record.ClientID || "-"}</td>
        <td>${record.Name || "-"}</td>
        <td>${record.IDNumber || "-"}</td>
        <td>${record.MobileNo || "-"}</td>
        <td>${record.LegacyAccountID || "-"}</td>
        <td class="text-end">
          <button type="button" class="btn btn-sm btn-outline-primary" data-lookup-select>Select</button>
        </td>
      `;
        this.resultsBody.appendChild(row);
      });
    }

    setLoading(isLoading) {
      if (!this.loadingState) return;
      this.loadingState.classList.toggle("d-none", !isLoading);
      if (isLoading) {
        this.resultsBody && (this.resultsBody.innerHTML = "");
        this.hideEmptyState();
      }
    }

    showEmptyState(message) {
      if (this.emptyState) {
        this.emptyState.textContent = message;
        this.emptyState.classList.remove("d-none");
      }
      this.resultsBody && (this.resultsBody.innerHTML = "");
    }

    hideEmptyState() {
      this.emptyState?.classList.add("d-none");
    }

    selectResult(index) {
      this.applySelection(this.results[index]);
    }

    handleSelect(record) {
      this.applySelection(record);
    }

    applySelection(record) {
      if (!record) return;
      this.onSelect?.(record);
      this.close();
    }
  }

  /**
   * Application Lookup Modal
   * Searches for pipeline applications using WFClientID TableID
   */
  class ApplicationLookupModal {
    constructor({ clientService, session, onSelect }) {
      this.clientService = clientService;
      this.session = session;
      this.onSelect = onSelect;
      this.modalElement = document.getElementById("applicationLookupModal");
      this.bootstrapModal = null;
      this.form = this.modalElement?.querySelector("[data-app-lookup-form]");
      this.resultsBody = this.modalElement?.querySelector("[data-app-lookup-results]");
      this.emptyState = this.modalElement?.querySelector("[data-app-lookup-empty]");
      this.loadingState = this.modalElement?.querySelector("[data-app-lookup-loading]");
      this.searchButton = this.modalElement?.querySelector("[data-app-lookup-submit]");
      this.resetButton = this.modalElement?.querySelector("[data-app-lookup-reset]");
      this.refreshButton = this.modalElement?.querySelector("[data-app-lookup-refresh]");
      this.results = [];
      this.bindEvents();
    }

    ensureModalInstance() {
      if (!this.modalElement) return null;
      if (this.bootstrapModal) return this.bootstrapModal;
      const ModalCtor = window.bootstrap?.Modal;
      if (!ModalCtor) return null;
      this.bootstrapModal = typeof ModalCtor.getOrCreateInstance === "function"
        ? ModalCtor.getOrCreateInstance(this.modalElement)
        : new ModalCtor(this.modalElement);
      return this.bootstrapModal;
    }

    isReady() {
      return Boolean(this.ensureModalInstance());
    }

    bindEvents() {
      this.form?.addEventListener("submit", (event) => {
        event.preventDefault();
        this.performSearch();
      });
      this.searchButton?.addEventListener("click", (event) => {
        event.preventDefault();
        this.performSearch();
      });
      this.resetButton?.addEventListener("click", (event) => {
        event.preventDefault();
        this.resetCriteria();
      });
      this.refreshButton?.addEventListener("click", (event) => {
        event.preventDefault();
        this.performSearch();
      });
      // Single click on row to select
      this.resultsBody?.addEventListener("click", (event) => {
        const row = event.target.closest("tr[data-result-index]");
        if (!row) return;
        this.selectResult(Number(row.dataset.resultIndex));
      });
    }

    open(prefillValue = "") {
      const modalInstance = this.ensureModalInstance();
      if (!modalInstance) return;
      if (this.form) {
        const idField = this.form.querySelector("[data-app-lookup-field='ClientID']");
        if (idField) idField.value = prefillValue?.trim() || "";
      }
      modalInstance.show();
      // Auto-search on open
      this.performSearch();
    }

    close() {
      this.ensureModalInstance()?.hide();
    }

    resetCriteria() {
      this.form?.querySelectorAll("[data-app-lookup-field]").forEach((field) => {
        field.value = "";
      });
      this.renderResults([]);
    }

    collectCriteria() {
      if (!this.form) return [];
      const fields = Array.from(this.form.querySelectorAll("[data-app-lookup-field]"));
      return fields
        .map((field) => ({
          column: field.dataset.appLookupField,
          value: field.value?.trim() || "",
          mode: this.form.querySelector(`[data-app-lookup-mode='${field.dataset.appLookupField}']`)?.value || "Like"
        }))
        .filter((entry) => entry.value);
    }

    buildClause(column, mode, value) {
      if (!column || !value) return null;
      const sanitized = value.replace(/'/g, "''");
      if (mode === "Exact") {
        return `${column} = '${sanitized}'`;
      }
      return `${column} like '%${sanitized}%'`;
    }

    buildSearchPayload() {
      const criteria = this.collectCriteria();
      const clauses = criteria.map((entry) => this.buildClause(entry.column, entry.mode, entry.value)).filter(Boolean);
      const whereStmt = clauses.length ? clauses.join(" AND ") : "";

      const envBranchId = window.Environment?.OurBranchID || window.Environment?.ourBranchId || "";
      const ourBranchId = this.session?.branchID || this.session?.branchId || this.session?.BranchID || envBranchId || "0603";
      return {
        TableID: "WFClientID",
        AdvFilterString: "",
        WhereStmt: whereStmt,
        PrevOrNext: "1",
        RefID: "",
        OperatorID: this.session?.operatorId || this.session?.name || "web_portal",
        ModuleID: 1000,
        OurBranchID: ourBranchId
      };
    }

    normalizeResults(response) {
      let results = response?.Details || response?.data?.Details || [];
      if (!Array.isArray(results)) {
        results = results ? [results] : [];
      }
      return results.map((item) => ({
        ClientID: item.ClientID || "",
        Name: item.Name || "",
        ClientTypeID: item.ClientTypeID || "",
        WFClientStatusID: item.WFClientStatusID || "",
        CreatedBy: item.CreatedBy || "",
        CreatedOn: item.CreatedOn || ""
      }));
    }

    async performSearch() {
      if (!this.clientService) {
        this.showEmptyState("ClientService not available.");
        return;
      }
      const payload = this.buildSearchPayload();
      this.setLoading(true);
      try {
        const response = await this.clientService.searchClients(payload);
        const results = this.normalizeResults(response);
        this.renderResults(results);
      } catch (error) {
        console.error("[ApplicationLookup] Search error:", error);
        this.showEmptyState(error.message || "Unable to fetch applications.");
      } finally {
        this.setLoading(false);
      }
    }

    renderResults(results) {
      if (!this.resultsBody) return;
      this.results = results;
      this.resultsBody.innerHTML = "";
      if (!results.length) {
        this.showEmptyState("No pipeline applications matched the supplied filters.");
        return;
      }
      this.hideEmptyState();
      results.forEach((record, index) => {
        const typeLabel = record.ClientTypeID === "I" ? "Individual" :
          record.ClientTypeID === "C" ? "Corporate" :
            record.ClientTypeID || "-";
        const createdOn = record.CreatedOn ? new Date(record.CreatedOn).toLocaleString() : "-";

        const row = document.createElement("tr");
        row.dataset.resultIndex = String(index);
        row.innerHTML = `
          <td>${record.ClientID || "-"}</td>
          <td>${record.Name || "-"}</td>
          <td>${typeLabel}</td>
          <td>${record.CreatedBy || "-"}</td>
          <td>${createdOn}</td>
        `;
        this.resultsBody.appendChild(row);
      });
    }

    setLoading(isLoading) {
      if (!this.loadingState) return;
      this.loadingState.classList.toggle("d-none", !isLoading);
      if (isLoading) {
        this.resultsBody && (this.resultsBody.innerHTML = "");
        this.hideEmptyState();
      }
    }

    showEmptyState(message) {
      if (this.emptyState) {
        this.emptyState.textContent = message;
        this.emptyState.classList.remove("d-none");
      }
      this.resultsBody && (this.resultsBody.innerHTML = "");
    }

    hideEmptyState() {
      this.emptyState?.classList.add("d-none");
    }

    selectResult(index) {
      this.applySelection(this.results[index]);
    }

    applySelection(record) {
      if (!record) return;
      this.onSelect?.(record);
      this.close();
    }
  }

  /**
   * GL Account Lookup Modal
   * Searches for General Ledger accounts using GeneralLedgerID TableID
   */
  class GLAccountLookupModal {
    constructor({ searchService, session, onSelect }) {
      this.searchService = searchService;
      this.session = session;
      this.onSelect = onSelect;
      this.modalElement = document.getElementById("glAccountLookupModal");
      this.bootstrapModal = null;
      this.form = this.modalElement?.querySelector("[data-gl-lookup-form]");
      this.resultsBody = this.modalElement?.querySelector("[data-gl-lookup-results]");
      this.emptyState = this.modalElement?.querySelector("[data-gl-lookup-empty]");
      this.loadingState = this.modalElement?.querySelector("[data-gl-lookup-loading]");
      this.searchButton = this.modalElement?.querySelector("[data-gl-lookup-submit]");
      this.resetButton = this.modalElement?.querySelector("[data-gl-lookup-reset]");
      this.refreshButton = this.modalElement?.querySelector("[data-gl-lookup-refresh]");
      this.results = [];
      this.bindEvents();
    }

    ensureModalInstance() {
      if (!this.modalElement) return null;
      if (this.bootstrapModal) return this.bootstrapModal;
      const ModalCtor = window.bootstrap?.Modal;
      if (!ModalCtor) return null;
      this.bootstrapModal = typeof ModalCtor.getOrCreateInstance === "function"
        ? ModalCtor.getOrCreateInstance(this.modalElement)
        : new ModalCtor(this.modalElement);
      return this.bootstrapModal;
    }

    isReady() {
      return Boolean(this.ensureModalInstance());
    }

    bindEvents() {
      this.form?.addEventListener("submit", (event) => {
        event.preventDefault();
        this.performSearch();
      });
      this.searchButton?.addEventListener("click", (event) => {
        event.preventDefault();
        this.performSearch();
      });
      this.resetButton?.addEventListener("click", (event) => {
        event.preventDefault();
        this.resetCriteria();
      });
      this.refreshButton?.addEventListener("click", (event) => {
        event.preventDefault();
        this.performSearch();
      });
      // Single click on row to select
      this.resultsBody?.addEventListener("click", (event) => {
        const row = event.target.closest("tr[data-result-index]");
        if (!row) return;
        this.selectResult(Number(row.dataset.resultIndex));
      });
    }

    open(prefillValue = "") {
      const modalInstance = this.ensureModalInstance();
      if (!modalInstance) return;
      if (this.form) {
        const idField = this.form.querySelector("[data-gl-lookup-field='AccountID']");
        if (idField) idField.value = prefillValue?.trim() || "";
      }
      modalInstance.show();
      // Auto-search on open
      this.performSearch();
    }

    close() {
      this.ensureModalInstance()?.hide();
    }

    resetCriteria() {
      this.form?.querySelectorAll("[data-gl-lookup-field]").forEach((field) => {
        field.value = "";
      });
      this.renderResults([]);
    }

    collectCriteria() {
      if (!this.form) return [];
      const fields = Array.from(this.form.querySelectorAll("[data-gl-lookup-field]"));
      return fields
        .map((field) => ({
          column: field.dataset.glLookupField,
          value: field.value?.trim() || "",
          mode: this.form.querySelector(`[data-gl-lookup-mode='${field.dataset.glLookupField}']`)?.value || "Like"
        }))
        .filter((entry) => entry.value);
    }

    buildClause(column, mode, value) {
      if (!column || !value) return null;
      const sanitized = value.replace(/'/g, "''");
      if (mode === "Exact") {
        return `${column} = '${sanitized}'`;
      }
      return `${column} like '%${sanitized}%'`;
    }

    buildSearchPayload() {
      const criteria = this.collectCriteria();
      const clauses = criteria.map((entry) => this.buildClause(entry.column, entry.mode, entry.value)).filter(Boolean);
      const whereStmt = clauses.length ? clauses.join(" AND ") : "";

      const envBranchId = window.Environment?.OurBranchID || window.Environment?.ourBranchId || "";
      const ourBranchId = this.session?.branchID || this.session?.branchId || this.session?.BranchID || envBranchId || "0603";
      return {
        TableID: "GeneralLedgerID",
        AdvFilterString: "",
        WhereStmt: whereStmt,
        PrevOrNext: "1",
        RefID: "",
        OperatorID: this.session?.operatorId || this.session?.name || "web_portal",
        ModuleID: 1000,
        OurBranchID: ourBranchId
      };
    }

    normalizeResults(response) {
      let results = response?.Details || response?.data?.Details || [];
      if (!Array.isArray(results)) {
        results = results ? [results] : [];
      }
      return results.map((item) => ({
        AccountID: item.AccountID || "",
        Description: item.Description || "",
        ShortName: item.ShortName || "",
        GLAccountTypeID: item.GLAccountTypeID || ""
      }));
    }

    async performSearch() {
      const searchSvc = this.searchService || window.SearchService;
      if (!searchSvc?.search) {
        this.showEmptyState("SearchService not available.");
        return;
      }
      const payload = this.buildSearchPayload();
      this.setLoading(true);
      try {
        const response = await searchSvc.search(payload);
        const results = this.normalizeResults(response);
        this.renderResults(results);
      } catch (error) {
        console.error("[GLAccountLookup] Search error:", error);
        this.showEmptyState(error.message || "Unable to fetch GL accounts.");
      } finally {
        this.setLoading(false);
      }
    }

    renderResults(results) {
      if (!this.resultsBody) return;
      this.results = results;
      this.resultsBody.innerHTML = "";
      if (!results.length) {
        this.showEmptyState("No GL accounts matched the supplied filters.");
        return;
      }
      this.hideEmptyState();
      results.forEach((record, index) => {
        const typeLabel = this.getGLAccountTypeLabel(record.GLAccountTypeID);

        const row = document.createElement("tr");
        row.dataset.resultIndex = String(index);
        row.innerHTML = `
          <td>${record.AccountID || "-"}</td>
          <td>${record.Description || "-"}</td>
          <td>${record.ShortName || "-"}</td>
          <td>${typeLabel}</td>
        `;
        this.resultsBody.appendChild(row);
      });
    }

    getGLAccountTypeLabel(typeId) {
      const types = {
        "A": "Asset",
        "L": "Liability",
        "E": "Expense",
        "I": "Income",
        "S": "Shareholders' Equity"
      };
      return types[typeId] || typeId || "-";
    }

    setLoading(isLoading) {
      if (!this.loadingState) return;
      this.loadingState.classList.toggle("d-none", !isLoading);
      if (isLoading) {
        this.resultsBody && (this.resultsBody.innerHTML = "");
        this.hideEmptyState();
      }
    }

    showEmptyState(message) {
      if (this.emptyState) {
        this.emptyState.textContent = message;
        this.emptyState.classList.remove("d-none");
      }
      this.resultsBody && (this.resultsBody.innerHTML = "");
    }

    hideEmptyState() {
      this.emptyState?.classList.add("d-none");
    }

    selectResult(index) {
      this.applySelection(this.results[index]);
    }

    applySelection(record) {
      if (!record) return;
      this.onSelect?.(record);
      this.close();
    }
  }

  class ClientMaintenancePage {
    constructor() {
      this.form = document.getElementById("client-form");
      if (!this.form) {
        console.error('[ClientMaintenance] Form not found! Aborting.');
        return;
      }
     this.stepper = new Stepper(this.form.querySelector("[data-stepper]"));
      this.nameField = this.form.querySelector("#ClientNameDisplay");
      this.addressContainer = this.form.querySelector("[data-collection='addresses']");
      this.toast = document.getElementById("formToast");
      this.summaryTargets = {
        headline: document.querySelector("[data-client-name]"),
        status: document.querySelector("[data-client-status]"),
        statusPill: document.querySelector("[data-client-status-pill]"),
        segment: document.querySelector("[data-client-segment]"),
        opened: document.querySelector("[data-client-opened]"),
        openedPill: document.querySelector("[data-client-opened-pill]"),
        modified: document.querySelector("[data-client-modified]"),
        modifiedPill: document.querySelector("[data-client-modified-pill]"),
        createdPill: document.querySelector("[data-client-created-pill]"),
        workflow: document.querySelector("[data-client-workflow]"),
        rm: document.querySelector("[data-client-rm]"),
        summary: document.querySelector("[data-client-summary]")
      };
      this.summaryBadges = {
        mode: this.form.querySelector("[data-summary='mode']"),
        clientId: this.form.querySelector("[data-summary='clientId']"),
        clientType: this.form.querySelector("[data-summary='clientType']"),
        relationshipManager: this.form.querySelector("[data-summary='relationshipManager']"),
        pageFunction: document.querySelector("[data-page-function-pill]")
      };
      this.windowBadges = {
        mode: this.form.querySelector("[data-window-mode]"),
        scope: this.form.querySelector("[data-window-scope]")
      };

      this.products = [];
      this.services = [];
      this._productsServicesCatalogLoaded = false;
      this.productsBody = this.form.querySelector("[data-products-body]");
      this.servicesBody = this.form.querySelector("[data-services-body]");
      this.selectAllServicesCheckbox = this.form.querySelector("[data-services-select-all]");
      this.productsClientTypeBadge = this.form.querySelector("[data-products-client-type]");

      this.pagination = {
        products: { page: 1, pageSize: 10 },
        services: { page: 1, pageSize: 10 }
      };
      this.pagerEls = { products: null, services: null };

      this.session = window.getAuthSession?.() || null;
      this.lookupService = window.LookupService || null;
      this.relationsById = new Map();
      this.model = window.ClientFormModel ? new window.ClientFormModel() : null;
      this.state = {
        scope: CLIENT_SCOPE.INDIVIDUAL,
        scopeTokens: deriveScopeTokens(),
        posting: false,
        editing: { addresses: null, relations: null, employment: null, documents: null },
        formEnabled: { addresses: false, relations: false, documents: false, photoSignatures: false },
        selectedAddressIndex: null,
        selectedRelationIndex: null,
        selectedDocumentIndex: null,
        currentDocumentData: null,
        pageFunction: "View", // Default to View mode on first page load
        requestCode: "",
        prefillClientId: "",
        stepperRequestId: "",
        // Track if client data has been loaded (enables Edit button)
        clientDataLoaded: false,
        // The currently loaded ClientID (for record navigation)
        loadedClientId: "",
        // Flag to track if we're continuing a pipeline application (no real ClientID yet)
        isPipelineApplication: false,
        // Track if client type has been selected (required before populating fields in Add mode)
        clientTypeSelected: false,
        // Track which steps have existing data (for pipeline applications - use UPDATE instead of CREATE)
        existingStepData: {
          basicDetails: false,
          individual: false,
          corporate: false,
          address: false,
          employment: false,
          relations: false,
          documents: false,
          photoSignatures: false,
          specialOffers: false,
          otherDetails: false,
          productsServices: false
        },
        // Photo and Signature state
        photoSignature: {
          selectedFile: null,
          tempImageId: null,
          cameraStream: null,
          isCapturing: false
        },
        // Track completed steps
        completedSteps: new Set()
      };

      this.collections = {
        addresses: [],
        relations: [],
        employment: [],
        documents: [],
        photoSignatures: []
      };

      this.collapsibles = new Map();
      this.menus = new Map();
      this.boundMenuOutsideHandler = null;
      this.boundMenuKeyHandler = null;

      this.query = new URLSearchParams(window.location.search);
      this.clientService = window.ClientService;
      this.searchService = window.SearchService || this.clientService;
      this.lookupModal = new ClientLookupModal({
        clientService: this.searchService,
        session: this.session,
        onSelect: (record) => this.applyLookupSelection(record)
      });
      this.applicationLookupModal = new ApplicationLookupModal({
        clientService: this.searchService,
        session: this.session,
        onSelect: (record) => this.applyApplicationSelection(record)
      });
      this.glAccountLookupModal = new GLAccountLookupModal({
        searchService: this.searchService,
        session: this.session,
        onSelect: (record) => this.applyGLAccountSelection(record)
      });

      this.init();
    }

    bindShellChromeEvents() {
      const navLinks = this.form.querySelectorAll("[data-shell-nav-link]");
      navLinks.forEach((link) => {
        link.addEventListener("click", () => {
          const target = link.dataset.stepperTarget;
          if (!target) return;
          this.stepper?.goTo(target);
          this.syncPanelFieldState();
        });
      });

      const stepperRoot = this.form.querySelector("[data-stepper]");
      stepperRoot?.addEventListener("stepchange", (event) => this.syncShellNav(event.detail?.step));

      // Mode switch buttons (View, New, Edit)
      const modeButtons = document.querySelectorAll("[data-shell-mode]");
      modeButtons.forEach((button) => {
        button.addEventListener("click", () => {
          const mode = button.dataset.shellMode;

          // View button: If ClientID is entered, do a lookup
          if (mode === "View") {
            const clientIdField = this.form.elements.ClientID;
            const typedClientId = clientIdField?.value?.trim();
            if (typedClientId) {
              this.handleClientLookup();
            } else {
              // No ClientID entered, open the lookup modal
              if (this.lookupModal?.isReady?.()) {
                this.lookupModal.open("");
              } else {
                this.showToast("Enter a Client ID or use the search button to find a client.", "info");
              }
            }
            return;
          }

          // New button: Switch to Add mode and reset form
          if (mode === "Add") {
            this.resetForm();
            this.setPageFunction("Add");
            return;
          }

          // Edit button: Only works if data is loaded
          if (mode === "Update") {
            if (!this.state.clientDataLoaded) {
              this.showToast("Load a client first before editing.", "warning");
              return;
            }
            this.setPageFunction("Update");
            return;
          }

          this.setPageFunction(mode);
        });
      });

      // Record navigation buttons (Previous Record, Next Record)
      const recordNavButtons = document.querySelectorAll("[data-record-nav]");
      recordNavButtons.forEach((button) => {
        button.addEventListener("click", () => {
          const direction = button.dataset.recordNav;
          this.navigateClientRecord(direction);
        });
      });

      this.syncShellNav(this.stepper?.activeStep);
    }

    /**
     * Navigate to previous or next client record using Direction parameter
     * @param {string} direction - "prev" or "next"
     */
    async navigateClientRecord(direction) {
      const clientId = this.state.loadedClientId || this.form.elements.ClientID?.value?.trim();
      if (!clientId) {
        this.showToast("No client loaded for navigation.", "warning");
        return;
      }

      if (!this.clientService?.getClientBasicDetails) {
        this.showToast("Client service not available for navigation.", "danger");
        return;
      }

      const directionValue = direction === "next" ? 1 : direction === "prev" ? -1 : 0;

      try {
        this.showToast(`Loading ${direction === "next" ? "next" : "previous"} client...`, "info");

        const response = await this.clientService.getClientBasicDetails({
          ClientID: clientId,
          RequestID: "",
          Direction: directionValue
        });

        // Extract the client data from response
        const details = extractOldApiInnerDetails(response);
        const newClientId = details?.ClientID;

        if (newClientId && newClientId !== clientId) {
          // Update the ClientID field and load the new client
          this.form.elements.ClientID.value = newClientId;
          await this.loadClient(newClientId);
        } else {
          this.showToast(`No ${direction === "next" ? "next" : "previous"} client record found.`, "info");
        }
      } catch (error) {
        console.error("[ClientMaintenance] Record navigation error:", error);
        this.showToast("Failed to navigate to record.", "danger");
      }
    }

    initKycBehaviour() {
      if (this._kycBehaviourBound) {
        this._syncKyc?.();
        return;
      }

      const pepRadios = this.form.querySelectorAll("input[name='IsPEP']");
      const usRadios = this.form.querySelectorAll("input[name='IsUSPerson']");
      const dataCleansedRadios = this.form.querySelectorAll("input[name='IsDataCleansed']");

      const pepDetails = this.form.querySelectorAll("[data-kyc-section='pep-details']");
      const usDetails = this.form.querySelectorAll("[data-kyc-section='us-details']");

      const toggleSection = (nodes, visible) => {
        nodes.forEach((node) => {
          node.classList.toggle("d-none", !visible);
          disableFieldsInNode(node, !visible);
        });
      };

      const syncPep = () => {
        const value = this.form.querySelector("input[name='IsPEP']:checked")?.value;
        const isPep = value === "Y";
        toggleSection(pepDetails, isPep);
      };

      const syncUs = () => {
        const value = this.form.querySelector("input[name='IsUSPerson']:checked")?.value;
        const isUs = value === "Y";
        toggleSection(usDetails, isUs);
      };

      pepRadios.forEach((radio) => {
        radio.addEventListener("change", syncPep);
      });
      usRadios.forEach((radio) => {
        radio.addEventListener("change", syncUs);
      });
      dataCleansedRadios.forEach((radio) => {
        radio.addEventListener("change", () => {
          // Data Cleansed currently does not drive UI toggles; placeholder for future hooks.
        });
      });

      this._syncKyc = () => {
        syncPep();
        syncUs();
      };
      this._kycBehaviourBound = true;

      // Initialise visibility on load
      toggleSection(pepDetails, false);
      toggleSection(usDetails, false);
      this._syncKyc();
    }

    initEmploymentBehaviour() {
      const salariedRadio = this.form.querySelector("#incomeSalaried");
      const selfRadio = this.form.querySelector("#incomeSelf");
      const salariedBlocks = this.form.querySelectorAll("[data-employment-for='salaried']");
      const selfBlocks = this.form.querySelectorAll("[data-employment-for='self-employed']");

      const toggleBlocks = () => {
        const isSalaried = this.form.querySelector("input[name='IsSalaried']:checked")?.value !== "false";
        const showSalaried = isSalaried;
        const showSelf = !isSalaried;

        salariedBlocks.forEach((node) => {
          node.classList.toggle("d-none", !showSalaried);
          disableFieldsInNode(node, !showSalaried);
        });

        selfBlocks.forEach((node) => {
          node.classList.toggle("d-none", !showSelf);
          disableFieldsInNode(node, !showSelf);
        });
      };

      const ensureDefaultSelection = () => {
        if (!this.form.querySelector("input[name='IsSalaried']:checked")) {
          if (salariedRadio) {
            salariedRadio.checked = true;
          }
        }
      };

      salariedRadio?.addEventListener("change", toggleBlocks);
      selfRadio?.addEventListener("change", toggleBlocks);
      const parseAmount = (name) => {
        const field = this.form.elements[name];
        if (!field) return 0;
        // Handle comma-formatted values
        const rawValue = String(field.value || '').replace(/,/g, '');
        const value = parseFloat(rawValue);
        return Number.isNaN(value) ? 0 : value;
      };

      const setAmount = (name, value) => {
        const field = this.form.elements[name];
        if (!field) return;
        if (!value && value !== 0) {
          field.value = "";
          return;
        }
        // Use accounting format with commas
        const num = Number(value.toFixed ? value.toFixed(2) : value);
        field.value = formatAccounting(num);
      };

      const recalcEmploymentFigures = () => {
        const monthlyIncome = parseAmount("MonthlyIncome");
        const otherIncome = parseAmount("OtherIncome");
        const rent = parseAmount("RentExpenses");
        const otherExp = parseAmount("OtherExpenses");

        const avgAnnual = monthlyIncome * 12;
        const totalExpenses = rent + otherExp;
        const totalIncome = avgAnnual + otherIncome;
        const netSavings = totalIncome - totalExpenses;

        setAmount("AverageAnnualIncome", avgAnnual);
        setAmount("TotalExpenses", totalExpenses);
        setAmount("TotalIncome", totalIncome);
        setAmount("NetSavings", netSavings);
      };

      ["MonthlyIncome", "OtherIncome", "RentExpenses", "OtherExpenses"].forEach((name) => {
        const field = this.form.elements[name];
        if (!field) return;
        field.addEventListener("input", recalcEmploymentFigures);
        field.addEventListener("change", recalcEmploymentFigures);
      });

      ensureDefaultSelection();
      toggleBlocks();
      recalcEmploymentFigures();
    }

    getCurrentClientType() {
      const raw = this.form.elements.ClientTypeID?.value || "";
      return raw.trim().toUpperCase();
    }

    resetProductsAndServices() {
      this.refreshProductsForClientType();
      this.renderProducts();
      this.renderServices();
    }

    getPagedData(type, items) {
      const list = Array.isArray(items) ? items : [];
      const pager = this.pagination?.[type] || { page: 1, pageSize: 10 };
      const pageSize = Math.max(1, Number(pager.pageSize) || 10);
      const totalItems = list.length;
      const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
      const page = Math.min(Math.max(1, Number(pager.page) || 1), totalPages);
      pager.page = page;
      pager.pageSize = pageSize;
      const startIndex = (page - 1) * pageSize;
      const endIndex = Math.min(startIndex + pageSize, totalItems);
      return {
        page,
        pageSize,
        totalItems,
        totalPages,
        startIndex,
        endIndex,
        items: list.slice(startIndex, endIndex)
      };
    }

    ensurePager(type) {
      if (!this.form) return null;
      if (this.pagerEls?.[type]) return this.pagerEls[type];

      // Find the static pager element by data attribute
      const pagerEl = this.form.querySelector(`[data-pager='${type}']`);
      if (!pagerEl) return null;

      // Check if event listeners are already bound
      if (!pagerEl.__pagerBound) {
        pagerEl.__pagerBound = true;

        pagerEl.addEventListener("click", (event) => {
          const prev = event.target.closest("[data-pager-prev]");
          const next = event.target.closest("[data-pager-next]");
          if (!prev && !next) return;
          event.preventDefault();

          const pager = this.pagination?.[type];
          if (!pager) return;
          if (prev) pager.page = Math.max(1, (pager.page || 1) - 1);
          if (next) pager.page = (pager.page || 1) + 1;
          if (type === "products") this.renderProducts();
          else this.renderServices();
        });

        pagerEl.addEventListener("change", (event) => {
          const select = event.target.closest("[data-pager-size]");
          if (!select) return;
          const pager = this.pagination?.[type];
          if (!pager) return;
          pager.pageSize = Number(select.value) || 10;
          pager.page = 1;
          if (type === "products") this.renderProducts();
          else this.renderServices();
        });
      }

      this.pagerEls[type] = pagerEl;
      return pagerEl;
    }

    syncPager(type, pageData) {
      const pagerEl = this.ensurePager(type);
      if (!pagerEl) return;
      const info = pagerEl.querySelector("[data-pager-info]");
      const prevBtn = pagerEl.querySelector("[data-pager-prev]");
      const nextBtn = pagerEl.querySelector("[data-pager-next]");
      const sizeSelect = pagerEl.querySelector("[data-pager-size]");
      if (sizeSelect && String(sizeSelect.value) !== String(pageData.pageSize)) {
        sizeSelect.value = String(pageData.pageSize);
      }

      const total = pageData.totalItems;
      const start = total ? pageData.startIndex + 1 : 0;
      const end = total ? pageData.endIndex : 0;
      if (info) {
        info.textContent = total ? `Showing ${start}-${end} of ${total} (Page ${pageData.page} of ${pageData.totalPages})` : "No items";
      }
      if (prevBtn) prevBtn.disabled = pageData.page <= 1;
      if (nextBtn) nextBtn.disabled = pageData.page >= pageData.totalPages;
    }

    refreshProductsForClientType() {
      if (!this.productsBody) return;
      const clientTypeId = this.getCurrentClientType();
      if (this.productsClientTypeBadge) {
        const label = clientTypeId || "--";
        this.productsClientTypeBadge.textContent = `Client Type · ${label}`;
      }
    }

    refreshServices() {
      this.renderServices();
    }

    renderProducts() {
      if (!this.productsBody) return;
      this.productsBody.innerHTML = "";
      const pageData = this.getPagedData("products", this.products);
      this.syncPager("products", pageData);
      if (!pageData.items.length) {
        const empty = document.createElement("tr");
        empty.innerHTML = '<td colspan="5" class="text-center text-muted">No eligible products for the selected client type.</td>';
        this.productsBody.appendChild(empty);
        return;
      }

      // Determine if checkboxes should be disabled (View/Supervise mode or Add mode without client type)
      const lockModes = ["View", "Supervise"];
      const shouldLock = lockModes.includes(this.state.pageFunction);
      const isAddModeWithoutType = this.state.pageFunction === "Add" && !this.state.clientTypeSelected;
      const disableCheckboxes = shouldLock || isAddModeWithoutType;

      pageData.items.forEach((product) => {
        const key = `${product.productTypeId || ""}::${product.id || ""}`;
        const row = document.createElement("tr");
        row.innerHTML = `
        <td>${product.serialNo}</td>
        <td class="text-center">
          <input type="checkbox" class="bs-checkbox" data-product-checkbox data-product-key="${key}" ${product.isSelected ? "checked" : ""} ${disableCheckboxes ? "disabled" : ""} />
        </td>
        <td>${product.description}</td>
        <td>${product.productTypeLabel || product.productTypeId || "-"}</td>
        <td>${product.isDefault ? '<span class="badge text-bg-primary">Default</span>' : ""}</td>
      `;
        this.productsBody.appendChild(row);
      });
    }

    renderServices() {
      if (!this.servicesBody) return;
      this.servicesBody.innerHTML = "";
      const pageData = this.getPagedData("services", this.services);
      this.syncPager("services", pageData);
      if (!pageData.items.length) {
        const empty = document.createElement("tr");
        empty.innerHTML = '<td colspan="3" class="text-center text-muted">No services configured.</td>';
        this.servicesBody.appendChild(empty);
        this.syncSelectAllServices();
        return;
      }

      // Determine if checkboxes should be disabled (View/Supervise mode or Add mode without client type)
      const lockModes = ["View", "Supervise"];
      const shouldLock = lockModes.includes(this.state.pageFunction);
      const isAddModeWithoutType = this.state.pageFunction === "Add" && !this.state.clientTypeSelected;
      const disableCheckboxes = shouldLock || isAddModeWithoutType;

      pageData.items.forEach((service, index) => {
        const serviceLabel = service?.code || service?.SubCodeID || service?.id || "-";
        const categoryLabel = service?.description || service?.Description || service?.category || service?.typeId || "-";
        const row = document.createElement("tr");
        row.dataset.index = String(index);
        row.innerHTML = `
        <td class="text-center">
          <input type="checkbox" class="bs-checkbox" data-service-checkbox data-service-id="${service.id}" ${service.status ? "checked" : ""} ${disableCheckboxes ? "disabled" : ""} />
        </td>
        <td>${serviceLabel}</td>
        <td>${categoryLabel}</td>
      `;
        this.servicesBody.appendChild(row);
      });

      this.syncSelectAllServices();
    }

    syncSelectAllServices() {
      if (!this.selectAllServicesCheckbox) return;
      if (!this.services || !this.services.length) {
        this.selectAllServicesCheckbox.checked = false;
        this.selectAllServicesCheckbox.indeterminate = false;
        return;
      }

      const allSelected = this.services.every((service) => !!service.status);
      const anySelected = this.services.some((service) => !!service.status);
      this.selectAllServicesCheckbox.checked = allSelected;
      this.selectAllServicesCheckbox.indeterminate = !allSelected && anySelected;
    }

    bindProductsServicesEvents() {
      if (this.productsServicesEventsBound) return;
      this.productsServicesEventsBound = true;
      if (this.selectAllServicesCheckbox) {
        this.selectAllServicesCheckbox.addEventListener("change", () => {
          const checked = this.selectAllServicesCheckbox.checked;
          this.services = (this.services || []).map((service) => ({ ...service, status: checked }));
          if (this.servicesBody) {
            this.servicesBody.querySelectorAll("[data-service-checkbox]").forEach((checkbox) => {
              checkbox.checked = checked;
            });
          }
          this.syncSelectAllServices();
        });
      }

      if (this.servicesBody) {
        this.servicesBody.addEventListener("click", (event) => {
          // Find the checkbox - either clicked directly or find it in the row
          let checkbox = null;
          if (event.target.matches('[data-service-checkbox]')) {
            checkbox = event.target;
          } else if (event.target.type === 'checkbox' && event.target.hasAttribute('data-service-checkbox')) {
            checkbox = event.target;
          } else {
            const row = event.target.closest('tr');
            if (row) {
              checkbox = row.querySelector('[data-service-checkbox]');
              // If clicking on row (not checkbox), toggle the checkbox only if not disabled
              if (checkbox && event.target !== checkbox && !checkbox.disabled) {
                checkbox.checked = !checkbox.checked;
              }
            }
          }
          if (!checkbox || checkbox.disabled) return;
          const serviceId = checkbox.dataset.serviceId;
          const isChecked = checkbox.checked;
          const target = (this.services || []).find((service) => service.id === serviceId);
          if (target) {
            target.status = isChecked;
          }
          this.syncSelectAllServices();
        });
      }

      if (this.productsBody) {
        this.productsBody.addEventListener("click", (event) => {
          // Find the checkbox - either clicked directly or find it in the row
          let checkbox = null;
          if (event.target.matches('[data-product-checkbox]')) {
            checkbox = event.target;
          } else if (event.target.type === 'checkbox' && event.target.hasAttribute('data-product-checkbox')) {
            checkbox = event.target;
          } else {
            const row = event.target.closest('tr');
            if (row) {
              checkbox = row.querySelector('[data-product-checkbox]');
              // If clicking on row (not checkbox), toggle the checkbox only if not disabled
              if (checkbox && event.target !== checkbox && !checkbox.disabled) {
                checkbox.checked = !checkbox.checked;
              }
            }
          }
          if (!checkbox || checkbox.disabled) return;
          const key = checkbox.dataset.productKey || "";
          const target = (this.products || []).find((product) => `${product.productTypeId || ""}::${product.id || ""}` === key);
          if (target) {
            target.isSelected = checkbox.checked;
          }
        });
      }
    }

    initWindowMenus() {
      if (!this.form) return;
      this.menus.clear();
      const toggles = this.form.querySelectorAll("[data-menu-toggle]");
      if (!toggles.length) return;
      toggles.forEach((toggle) => {
        const targetId = toggle.dataset.menuToggle || toggle.getAttribute("aria-controls");
        if (!targetId) return;
        const panel = this.form.querySelector(`[data-menu-panel='${targetId}']`) || document.getElementById(targetId);
        if (!panel) return;
        const entry = { id: targetId, toggle, panel };
        this.menus.set(targetId, entry);
        panel.hidden = true;
        toggle.setAttribute("aria-expanded", "false");
        toggle.addEventListener("click", (event) => {
          event.preventDefault();
          const isOpen = panel.hidden === false;
          this.setMenuState(entry, !isOpen);
        });
        panel.addEventListener("click", (event) => {
          if (event.target.closest(".cm-window-menu__item")) {
            this.setMenuState(entry, false);
          }
        });
      });

      if (!this.boundMenuOutsideHandler) {
        this.boundMenuOutsideHandler = (event) => {
          this.menus.forEach((entry) => {
            if (entry.panel.hidden) return;
            const clickedInside = entry.panel.contains(event.target) || entry.toggle.contains(event.target);
            if (!clickedInside) {
              this.setMenuState(entry, false);
            }
          });
        };
        document.addEventListener("click", this.boundMenuOutsideHandler);
      }

      if (!this.boundMenuKeyHandler) {
        this.boundMenuKeyHandler = (event) => {
          if (event.key === "Escape") {
            this.menus.forEach((entry) => this.setMenuState(entry, false));
          }
        };
        document.addEventListener("keydown", this.boundMenuKeyHandler);
      }
    }

    setMenuState(entryOrId, open) {
      const entry = typeof entryOrId === "string" ? this.menus.get(entryOrId) : entryOrId;
      if (!entry) return;
      const shouldOpen = Boolean(open);
      if (shouldOpen) {
        this.menus.forEach((other) => {
          if (other === entry) return;
          other.panel.hidden = true;
          other.toggle.setAttribute("aria-expanded", "false");
        });
      }
      entry.panel.hidden = !shouldOpen;
      entry.toggle.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
    }

    initCollapsiblePanels() {
      if (!this.form) return;
      const toggles = this.form.querySelectorAll("[data-collapse-toggle]");
      toggles.forEach((toggle) => {
        const targetId = toggle.dataset.collapseToggle || toggle.getAttribute("aria-controls");
        const host = toggle.closest("[data-collapsible]");
        if (!targetId || !host) return;
        const panel = this.form.querySelector(`[data-collapse-panel='${targetId}']`) || document.getElementById(targetId);
        if (!panel) return;
        const label = toggle.querySelector("[data-collapse-label]");
        const entry = {
          id: targetId,
          host,
          panel,
          toggle,
          label,
          expandText: label?.dataset.labelExpand || label?.textContent?.trim() || "Expand",
          collapseText: label?.dataset.labelCollapse || "Collapse"
        };
        this.collapsibles.set(targetId, entry);
        const defaultCollapsed = host.dataset.collapseDefault === "collapsed" || host.dataset.collapsed === "true";
        this.setCollapsibleState(entry, defaultCollapsed);
        toggle.addEventListener("click", () => {
          const isCollapsed = host.dataset.collapsed === "true";
          this.setCollapsibleState(entry, !isCollapsed);
        });
      });
    }

    setCollapsibleState(entryOrId, collapsed) {
      const entry = typeof entryOrId === "string" ? this.collapsibles.get(entryOrId) : entryOrId;
      if (!entry) return;
      const { host, panel, toggle, label, expandText, collapseText } = entry;
      const isCollapsed = Boolean(collapsed);
      host.dataset.collapsed = isCollapsed ? "true" : "false";
      if (panel) {
        panel.hidden = isCollapsed;
      }
      if (toggle) {
        toggle.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
      }
      if (label) {
        label.textContent = isCollapsed ? expandText : collapseText || expandText;
      }
    }

    ensureCollapsibleVisibleFor(node) {
      if (!node) return;
      const host = node.closest?.("[data-collapsible]");
      if (!host) return;
      for (const entry of this.collapsibles.values()) {
        if (entry.host === host && host.dataset.collapsed === "true") {
          this.setCollapsibleState(entry, false);
          break;
        }
      }
    }

    setPageFunction(mode) {
      if (!mode) return;
      const normalized = mode === "Edit" ? "Update" : mode;
      if (this.state.pageFunction === normalized) return;
      this.state.pageFunction = normalized;
      this.syncActionButtons();
      this.updateWindowBadges();
      // Reset collection forms to disabled state when mode changes
      this.resetAllCollectionForms();
    }

    resetAllCollectionForms() {
      // Disable all collection form fields when page mode changes
      // User must click New or Alter to enable
      if (typeof this.setAddressFormEnabled === 'function') {
            this.setAddressFormEnabled(false);
      }
      if (typeof this.setRelationsFormEnabled === 'function') {
        this.setRelationsFormEnabled(false);
      }
      if (typeof this.setDocumentsFormEnabled === 'function') {
        this.setDocumentsFormEnabled(false);
      }
      // Reset editing states
      if (this.state.editing) {
        this.state.editing.addresses = null;
        this.state.editing.relations = null;
        this.state.editing.documents = null;
      }
      // Clear selections
      this.state.selectedAddressIndex = null;
      this.state.selectedRelationIndex = null;
      this.state.selectedDocumentIndex = null;
      // Reset form enabled states
      if (this.state.formEnabled) {
        this.state.formEnabled.addresses = false;
        this.state.formEnabled.relations = false;
        this.state.formEnabled.documents = false;
      }
    }

    toggleShellNavVisibility() {
      const navItems = this.form.querySelectorAll("[data-shell-scope]");
      if (!navItems.length) return;
      const tokens = new Set(["all", ...(this.state.scopeTokens || [])]);
      navItems.forEach((item) => {
        const scopes = (item.dataset.shellScope || "all")
          .split(",")
          .map((token) => token.trim().toLowerCase())
          .filter(Boolean);
        const shouldShow = !scopes.length || scopes.includes("all") || scopes.some((token) => tokens.has(token));
        item.hidden = !shouldShow;
        item.setAttribute("aria-hidden", shouldShow ? "false" : "true");
        if ("tabIndex" in item) {
          item.tabIndex = shouldShow ? 0 : -1;
        }
        if (!shouldShow) {
          item.classList.remove("is-active");
        }
      });
    }

    syncShellNav(activeStep) {
      const navLinks = this.form.querySelectorAll("[data-shell-nav-link]");
      navLinks.forEach((link) => {
        const isActive = Boolean(activeStep) && link.dataset.stepperTarget === activeStep;
        link.classList.toggle("is-active", isActive);
      });
    }

    updateWindowBadges() {
      if (this.windowBadges.mode) {
        this.windowBadges.mode.textContent = `Mode · ${this.state.pageFunction}`;
      }
      if (this.windowBadges.scope) {
        this.windowBadges.scope.textContent = `Scope · ${describeScopeTokens(this.state.scopeTokens)}`;
      }
    }

    async init() {
      await window.initLookupFields?.(this.form);
      await this.loadAuxLookups();
      this.parseQueryParams();
      this.bindEvents();
      this.initKycBehaviour();
      this.initEmploymentBehaviour();
      this.initWindowMenus();
      this.initCollapsiblePanels();
      this.bootstrapAddresses();
      this.initFieldRestrictions(); // Apply input restrictions and formatting
      await this.loadProductsAndServicesCatalog();
      this.refreshProductsForClientType();
      this.renderProducts();
      this.renderServices();
      this.setMetaDefaults();
      this.updateScope();
      this.updateClientName();
      this.updateSummaryMeta();
      if (this.state.prefillClientId) {
        this.form.elements.ClientID.value = this.state.prefillClientId;
      }
      if (this.state.requestCode) {
        this.loadClient(this.state.requestCode);
      }
      
      // Load recent activities to populate sidebar
      this.loadRecentActivities();
    }

    /**
     * Initialize field restrictions (input masks, maxlength, patterns)
     * This applies real-time restrictions on user input
     */
    initFieldRestrictions() {
           
      // Personal step - Name fields (alphabetic only)
      const nameFieldIds = ['firstName', 'middleName', 'lastName', 'motherName'];
      nameFieldIds.forEach(id => {
        const field = this.form.querySelector(`#${id}`);
        if (field) restrictAlphabetic(field);
      });

      // Personal step - ID Number (alphanumeric)
      const idNumber = this.form.querySelector('#idNumber');
      if (idNumber) restrictAlphanumeric(idNumber);

      // Personal step - Household counts (max 65000)
      const householdFields = ['houseMembers', 'children', 'dependents'];
      householdFields.forEach(id => {
        const field = this.form.querySelector(`#${id}`);
        if (field) restrictMaxValue(field, 65000);
      });

      // Corporate step - Alphanumeric fields
      const corpAlphanumericFields = ['corpRegistrationNumber', 'corpTinNumber', 'corpVatRegNo'];
      corpAlphanumericFields.forEach(id => {
        const field = this.form.querySelector(`#${id}`);
        if (field) restrictAlphanumeric(field);
      });

      // Corporate step - Year Started (numeric, 4 digits)
      const yearStarted = this.form.querySelector('#corpYearStarted');
      if (yearStarted) {
        yearStarted.setAttribute('maxlength', '4');
        restrictNumeric(yearStarted);
      }

      // Corporate step - No. Employees (numeric)
      const numEmployees = this.form.querySelector('#corpEmployees');
      if (numEmployees) restrictNumeric(numEmployees);

      // Address step - Alphanumeric address fields
      const addressAlphanumericFields = ['address1', 'address2'];
      addressAlphanumericFields.forEach(id => {
        const field = this.form.querySelector(`#${id}`);
        if (field) restrictAlphanumeric(field);
      });

      // Address step - Phone fields (max 15 digits)
      const phoneFieldIds = ['addressPhoneWork', 'addressPhoneHome', 'addressMobile'];
      phoneFieldIds.forEach(id => {
        const field = this.form.querySelector(`#${id}`);
        if (field) restrictPhone(field, 15);
      });

      // Relations step - Mobile (max 15 digits)
      const relationMobile = this.form.querySelector('#relationMobile');
      if (relationMobile) restrictPhone(relationMobile, 15);

      // Employment step - Apply accounting format (right-aligned with commas)
      const incomeExpenseFields = [
        'MonthlyIncome', 'AverageAnnualIncome', 'OtherIncome', 'TotalIncome',
        'RentExpenses', 'OtherExpenses', 'TotalExpenses', 'NetSavings'
      ];
      incomeExpenseFields.forEach(id => {
        const field = this.form.querySelector(`#${id}`);
        if (field) applyAccountingFormat(field);
      });

      // Other Details (KYC) step - NBE accounts (numeric only)
      const nbeAccountFields = ['nbeImportAccount', 'nbeExportAccount'];
      nbeAccountFields.forEach(id => {
        const field = this.form.querySelector(`#${id}`);
        if (field) restrictNumeric(field);
      });

      // Make lookup fields read-only (search results, not user-typed)
      const readOnlyLookupFields = [
        'relationRelatedClientId', 'relationFirstName', 'relationMiddleName',
        'relationLastName', 'relationGender'
      ];
      readOnlyLookupFields.forEach(id => {
        const field = this.form.querySelector(`#${id}`);
        if (field) field.readOnly = true;
      });

      // ========================================
      // DATE FIELD SETUP WITH CONSTRAINTS AND T KEY
      // ========================================
      
      // Personal step - Date of Birth (dynamic constraint based on client type)
      const dobField = this.form.querySelector('#dob');
      if (dobField) {
        // Function to dynamically determine minimum age based on client type
        const getMinAge = () => {
          const clientTypeField = this.form.querySelector('#memberType');
          const clientType = clientTypeField?.value || '';
          const isMinor = clientType === 'M';
          // Return 0 for minors (no age restriction), 18 for others
          return isMinor ? 0 : 18;
        };
        
        // Function to update DOB maxDate constraint
        const updateDOBConstraint = () => {
          if (!dobField._flatpickr) {
            console.warn('[ClientMaintenance] Flatpickr not initialized on DOB yet');
            return;
          }
          
          const minAge = getMinAge();
          const today = new Date();
          let maxDate;
          
          if (minAge > 0) {
            const maxDateObj = new Date(today);
            maxDateObj.setFullYear(maxDateObj.getFullYear() - minAge);
            const year = maxDateObj.getFullYear();
            const month = String(maxDateObj.getMonth() + 1).padStart(2, '0');
            const day = String(maxDateObj.getDate()).padStart(2, '0');
            maxDate = `${year}-${month}-${day}`;
          } else {
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            maxDate = `${year}-${month}-${day}`;
          }
          
          // Update Flatpickr maxDate
          dobField._flatpickr.set('maxDate', maxDate);
        };
        
        setupDateField(dobField, { minAge: getMinAge });
        
        // Re-configure when client type changes
        const clientTypeField = this.form.querySelector('#memberType');
        if (clientTypeField) {
          // Check if listener already attached
          if (!clientTypeField.dataset.dobListenerAttached) {
            clientTypeField.dataset.dobListenerAttached = 'true';
            clientTypeField.addEventListener('change', () => {
              updateDOBConstraint();
            });
          }
        }
      } else {
        console.warn('[ClientMaintenance] DOB field NOT FOUND');
      }
      
      // Personal step - Issue Date (cannot be future)
      const issueDate = this.form.querySelector('#issueDate');
      if (issueDate) {
        setupDateField(issueDate, { notFuture: true });
      } else {
        console.warn('[ClientMaintenance] Issue Date field NOT FOUND');
      }
      
      // Personal step - Expiry Date (cannot be past)
      const expiryDate = this.form.querySelector('#expiryDate');
      if (expiryDate) {
        setupDateField(expiryDate, { notPast: true });
      } else {
        console.warn('[ClientMaintenance] Expiry Date field NOT FOUND');
      }
      
      // Corporate step - Registration Date (cannot be future)
      const corpRegDate = this.form.querySelector('#corpRegistrationDate');
      if (corpRegDate) {
        setupDateField(corpRegDate, { notFuture: true });
      }
      
      // Corporate step - ID Issue Date (cannot be future)
      const corpIssueDate = this.form.querySelector('#corpIssueDate');
      if (corpIssueDate) {
        setupDateField(corpIssueDate, { notFuture: true });
      }
      
      // Corporate step - ID Expiry Date (cannot be past)
      const corpExpiryDate = this.form.querySelector('#corpExpiryDate');
      if (corpExpiryDate) {
        setupDateField(corpExpiryDate, { notPast: true });
      }
      
      // Corporate step - VAT Reg Date (cannot be future / must be past)
      const vatRegDate = this.form.querySelector('#corpVatRegDate');
      if (vatRegDate) {
        setupDateField(vatRegDate, { notFuture: true });
      }
      
      // Employment step - Working Since (cannot be future)
      const workingSince = this.form.querySelector('#WorkingSince');
      if (workingSince) {
        setupDateField(workingSince, { notFuture: true });
      }
      
      // Documents step - Received Date (cannot be future)
      const docReceivedDate = this.form.querySelector('#documentReceivedDate');
      if (docReceivedDate) {
        setupDateField(docReceivedDate, { notFuture: true });
      }
      
      // Corporate step - Year Started validation (realistic year range 1800-current)
      const yearStartedField = this.form.querySelector('#corpYearStarted');
      if (yearStartedField) {
        const currentYear = new Date().getFullYear();
        
        // Restrict to digits only
        yearStartedField.addEventListener('input', (e) => {
          e.target.value = e.target.value.replace(/[^\d]/g, '').substring(0, 4);
        });
        
        // Validate on blur
        yearStartedField.addEventListener('blur', (e) => {
          const value = e.target.value.trim();
          if (!value) return;
          const year = parseInt(value, 10);
          if (isNaN(year) || year < 1800 || year > currentYear) {
            e.target.value = '';
            alert(`Year must be between 1800 and ${currentYear}`);
          }
        });
      }
      
      // Corporate step - Website validation (real-time)
      const websiteField = this.form.querySelector('#corpWebsite');
      if (websiteField) {
        websiteField.addEventListener('blur', (e) => {
          const value = e.target.value.trim();
          if (!value) return;
          if (!isValidWebsite(value)) {
            e.target.style.borderColor = 'red';
            setTimeout(() => {
              e.target.style.borderColor = '';
            }, 2000);
            alert('Please enter a valid website URL (e.g., https://example.com)');
          }
        });
      }
      
      // Address step - Email validation (real-time)
      const emailField = this.form.querySelector('#addressEmail');
      if (emailField) {
        emailField.addEventListener('blur', (e) => {
          const value = e.target.value.trim();
          if (!value) return;
          if (!isValidEmail(value)) {
            e.target.style.borderColor = 'red';
            setTimeout(() => {
              e.target.style.borderColor = '';
            }, 2000);
            alert('Please enter a valid email address (e.g., user@example.com)');
          }
        });
      }
    }

    async loadAuxLookups() {
      if (!this.lookupService?.getRelations) return;
      try {
        const options = await this.lookupService.getRelations();
        this.relationsById = new Map((options || []).map((o) => [String(o.value), o.label]));

        if (typeof this.lookupService.getRelationTypes === "function") {
          const relTypes = await this.lookupService.getRelationTypes();
          this.relationTypesById = new Map((relTypes || []).map((o) => [String(o.value), o.label]));
        } else {
          this.relationTypesById = new Map();
        }
      } catch (error) {
        console.warn("[ClientMaintenance] Failed to load relation lookups", error);
      }
    }

    resolveRelationLabel(relationId) {
      const key = relationId == null ? "" : String(relationId);
      return this.relationsById.get(key) || key || "-";
    }

    resolveRelationTypeLabel(relationType) {
      const key = relationType == null ? "" : String(relationType);
      return this.relationTypesById?.get?.(key) || key || "-";
    }

    parseQueryParams() {
      // Default to View mode unless query params specify otherwise
      const action = this.query.get("action") || this.query.get("pageFunction");
      if (action) {
        this.state.pageFunction = action;
      }
      // If pageFunction is View (default) and no explicit action, keep it as View

      this.state.requestCode = this.query.get("requestCode") || "";
      this.state.prefillClientId = this.query.get("prefillClientId") || "";
      const clientTypeParam = this.query.get("ClientTypeID");
      if (clientTypeParam) {
        this.form.elements.ClientTypeID.value = clientTypeParam;
      }
      if (!this.state.requestCode && this.state.prefillClientId) {
        this.state.requestCode = this.state.prefillClientId;
      }
      this.syncActionButtons();
      this.updateWindowBadges();
    }

    syncActionButtons() {
      const saveButtons = Array.from(document.querySelectorAll('[data-submit-action="save"]'));
      const approveButtons = Array.from(document.querySelectorAll('[data-submit-action="approve"]'));
      const clearButtons = Array.from(document.querySelectorAll('[data-submit-action="clear"]'));
      const cancelButtons = Array.from(document.querySelectorAll('[data-submit-action="cancel"]'));

      const setHidden = (buttons, hidden) => {
        buttons.forEach((button) => {
          button.hidden = hidden;
        });
      };

      // Mode switch buttons
      const viewBtn = document.querySelector('[data-action-btn="view"]');
      const newBtn = document.querySelector('[data-action-btn="new"]');
      const editBtn = document.querySelector('[data-action-btn="edit"]');
      const supervisionBtn = document.querySelector('[data-action-btn="supervise"]');

      // Record navigation buttons
      const prevRecordBtn = document.querySelector('[data-record-nav="prev"]');
      const nextRecordBtn = document.querySelector('[data-record-nav="next"]');

      // Workflow buttons based on page function
      if (this.state.pageFunction === "Supervise") {
        setHidden(approveButtons, false);
        setHidden(saveButtons, true);
        setHidden(clearButtons, true);
      } else if (this.state.pageFunction === "View") {
        setHidden(approveButtons, true);
        setHidden(saveButtons, true);
        setHidden(clearButtons, true);
      } else {
        setHidden(approveButtons, true);
        setHidden(saveButtons, false);
        setHidden(clearButtons, this.state.pageFunction !== "Add");
      }

      const cancelLabel = this.state.pageFunction === "View" ? "Close" : "Cancel";
      cancelButtons.forEach((button) => {
        const label = button.querySelector('[data-action-label]');
        if (label) {
          label.textContent = cancelLabel;
        } else {
          button.textContent = cancelLabel;
        }
      });

      // Mode switch button states
      // View button: disabled in Add mode (to prevent leaving unsaved new record)
      if (viewBtn) viewBtn.disabled = this.state.pageFunction === "Add";

      // New button: disabled when client data is loaded, or when in Update mode
      // (once you load a client or are editing, you can't start a fresh one without clearing first)
      if (newBtn) newBtn.disabled = this.state.clientDataLoaded || this.state.pageFunction === "Update";

      // Edit button: enabled only when client data is loaded and in View mode
      if (editBtn) editBtn.disabled = !this.state.clientDataLoaded || this.state.pageFunction !== "View";

      // Supervision button: enabled only when client data is loaded and in View mode
      // Disable for pipeline applications (they need final save first)
      // Also disable if client is already approved (check status from form data)
      if (supervisionBtn) {
        const isPendingApproval = this.state.clientDataLoaded && 
                                   !this.state.isPipelineApplication &&
                                   this.state.pageFunction === "View";
        // TODO: Add additional check for client approval status if available in loaded data
        supervisionBtn.disabled = !isPendingApproval;
      }

      // Client ID input and lookup buttons: disabled in Add mode
      const clientIdInput = this.form.elements.ClientID;
      const clientLookupBtn = document.querySelector('[data-client-search]');
      const appLookupBtn = document.querySelector('[data-application-search]');
      const isAddMode = this.state.pageFunction === "Add";
      if (clientIdInput) clientIdInput.disabled = isAddMode;
      if (clientLookupBtn) clientLookupBtn.disabled = isAddMode;
      if (appLookupBtn) appLookupBtn.disabled = isAddMode;

      // Record navigation buttons: enabled only when client data is loaded AND not a pipeline application
      // (pipeline apps don't have a real ClientID for navigation)
      const canNavigateRecords = this.state.clientDataLoaded &&
        !this.state.isPipelineApplication &&
        !!this.state.loadedClientId;
      if (prevRecordBtn) prevRecordBtn.disabled = !canNavigateRecords;
      if (nextRecordBtn) nextRecordBtn.disabled = !canNavigateRecords;

      // Highlight the active mode button
      [viewBtn, newBtn, editBtn].forEach((btn) => {
        if (!btn) return;
        const btnMode = btn.dataset.shellMode;
        const isActive = btnMode === this.state.pageFunction ||
          (btnMode === "Update" && this.state.pageFunction === "Update");
        btn.classList.toggle("is-active", isActive);
      });

      if (this.summaryBadges.pageFunction) {
        this.summaryBadges.pageFunction.textContent = `Mode · ${this.state.pageFunction}`;
      }

      this.toggleReadOnlyMode();
    }

    toggleReadOnlyMode() {
      const lockModes = ["View", "Supervise"];
      const shouldLock = lockModes.includes(this.state.pageFunction);

      // In Add mode, also lock fields if client type hasn't been selected yet
      const isAddModeWithoutType = this.state.pageFunction === "Add" && !this.state.clientTypeSelected;

      // ClientTypeID should always be editable to allow switching client types
      // ClientGroupID should also remain editable in Add mode
      const exemptFields = new Set(["ClientID", "ClientTypeID", "ClientGroupID"]);

      // Only toggle input, select, textarea - NOT buttons (so search buttons remain active)
      this.form.querySelectorAll("input:not([type='button']), select, textarea").forEach((field) => {
        if (exemptFields.has(field.name)) return;

        // Skip collection form fields (Address, Relations, Documents have their own enable/disable logic)
        if (field.hasAttribute('data-address-field') ||
          field.hasAttribute('data-relation-field') ||
          field.hasAttribute('data-document-field')) {
          return;
        }

        const key = "prevDisabledMode";
        const shouldDisable = shouldLock || isAddModeWithoutType;

        if (shouldDisable) {
          if (!field.disabled) {
            field.dataset[key] = "true";
            field.disabled = true;
          }
        } else if (field.dataset[key]) {
          if (!field.dataset.prevDisabled) {
            field.disabled = false;
          }
          delete field.dataset[key];
        }
      });
    }

    bindEvents() {
      this.form.addEventListener("input", (event) => {
        if (["FirstName", "MiddleName", "LastName", "CompanyName"].includes(event.target.name)) {
          this.updateClientName();
        }
        if (event.target.name === "DateOfBirth") {
          this.updateAge();
        }
      });

      this.form.elements.DateOfBirth?.addEventListener("change", () => this.updateAge());

      const clientTypeField = this.form.elements.ClientTypeID;
      clientTypeField?.addEventListener("change", () => {
        const hasValue = !!clientTypeField.value;
        if (hasValue && !this.state.clientTypeSelected) {
          this.state.clientTypeSelected = true;
        }
        this.updateScope();
        this.resetProductsAndServices();
        // Re-sync form state in case we're in Add mode and type was just selected
        this.syncActionButtons();
      });

      // RelationshipManager may have multiple elements (Personal and Corporate steppers)
      // Use querySelectorAll to bind to all of them
      const rmFields = this.form.querySelectorAll('[name="RelationshipManager"]');
      rmFields.forEach(field => {
        field.addEventListener("change", () => this.updateSummaryMeta());
      });

      const searchButton = this.form.querySelector("[data-client-search]");
        searchButton?.addEventListener("click", (event) => {
        event.preventDefault();
        const typedClientId = this.form.elements.ClientID?.value?.trim();
        const forceLookupModal = event.shiftKey || event.altKey;
        const shouldOpenModal = forceLookupModal || !typedClientId;
        if (!shouldOpenModal && typedClientId) {
          this.handleClientLookup();
          return;
        }
        if (this.lookupModal?.isReady?.()) {
          this.lookupModal.open(forceLookupModal ? typedClientId : "");
        } else if (typedClientId && !forceLookupModal) {
          this.handleClientLookup();
        } else {
          this.showToast("Provide a Client ID before searching or hold Shift to open the lookup.", "danger");
        }
      });

      // Application ID lookup button
      const appSearchButton = document.querySelector('[data-application-search], [data-open-search="application"], [onclick*="applicationLookup"], .lookup-group .btn-lookup[onclick*="applicationLookup"]');
      if (appSearchButton) {
        appSearchButton.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (this.applicationLookupModal?.isReady?.()) {
            this.applicationLookupModal.open("");
          } else {
            console.warn('[ClientMaintenance] Application lookup modal not ready or not found');
            this.showToast("Application lookup is not available at the moment.", "warning");
          }
        });
      }

      // GL Account lookup button (for Corporate stepper)
      const glSearchButton = this.form.querySelector("[data-gl-search]");
      glSearchButton?.addEventListener("click", (event) => {
        event.preventDefault();
        if (this.glAccountLookupModal?.isReady?.()) {
          this.glAccountLookupModal.open("");
        } else {
          this.showToast("GL Account lookup is not available.", "warning");
        }
      });

      this.form.querySelector("[data-client-reset]")?.addEventListener("click", () => this.resetForm());

      this.form.querySelectorAll("[data-stepper-action]").forEach((button) => {
        button.addEventListener("click", async () => {
          const action = button.dataset.stepperAction;
          if (action === "next") {
            if (!this.validateActiveStepPanel()) {
              this.showToast("Complete required fields before continuing.", "warning");
              return;
            }
            // Save the current step before advancing
            const activeStep = this.stepper?.activeStep;
            console.log('[Next Button] ===== SAVING STEP:', activeStep, '=====');
            const saveResult = await this.saveStepDraft(activeStep);
            console.log('[Next Button] Raw save result:', JSON.stringify(saveResult, null, 2));
            console.log('[Next Button] saveResult.success:', saveResult?.success);
            console.log('[Next Button] saveResult.code:', saveResult?.code);
            console.log('[Next Button] Calling isOldApiFailure...');
            const isFailed = isOldApiFailure(saveResult);
            console.log('[Next Button] isOldApiFailure returned:', isFailed);
            if (isFailed) {
              const msg = saveResult?.message || saveResult?.ResponseMessage || "Failed to save step.";
              console.log('[Next Button] ❌ Save failed, showing error toast:', msg);
              this.showToast(msg, "danger");
              return;
            }
            // Show success toast for step save
            const activeTrigger = this.stepper?.triggers?.find((t) => t.dataset.stepId === activeStep);
            const stepLabel = activeTrigger?.querySelector(".cm-stepper__label")?.textContent?.trim() || activeStep || "Step";
            console.log(`[Next Button] ✅ Save succeeded! Showing success toast for: "${stepLabel}"`);
            this.showToast(`${stepLabel} saved successfully.`, "success");
            
            // Mark step as completed
            this.markStepAsCompleted(activeStep);
            
            this.stepper?.next();
          } else {
            this.stepper?.prev();
          }
          this.syncPanelFieldState();
        });
      });

      this.bindShellChromeEvents();

      document.querySelectorAll("[data-submit-action]").forEach((button) => {
        button.addEventListener("click", () => this.handlePrimaryAction(button.dataset.submitAction));
      });

      // Bind supervision button
      const supervisionBtn = document.querySelector('[data-action-btn="supervise"]');
      if (supervisionBtn) {
        supervisionBtn.addEventListener("click", () => this.handleSupervision());
      }

      // Bind reject modal confirm button
      const confirmRejectBtn = document.getElementById('confirmRejectBtn');
      if (confirmRejectBtn) {
        confirmRejectBtn.addEventListener("click", () => {
          const form = document.getElementById('clientRejectionForm');
          if (!form.checkValidity()) {
            form.reportValidity();
            return;
          }
          
          const params = {
            ClientID: document.getElementById('rejectClientID').value,
            RequestID: document.getElementById('rejectRequestID').value,
            WFStageID: document.getElementById('rejectWFStageID').value,
            RejectRemarks: document.getElementById('rejectRemarks').value
          };
          
          this.rejectClient(params);
        });
      }

      this.form.querySelector("[data-collection-add='addresses']")?.addEventListener("click", () => this.addAddressCard());

      this.addressContainer?.addEventListener("click", (event) => {
        const removeBtn = event.target.closest("[data-remove-address]");
        if (removeBtn) {
          const card = removeBtn.closest("[data-collection-item]");
          if (!card) return;
          if (this.addressContainer.children.length === 1) {
            this.showToast("At least one address is required.", "warning");
            return;
          }
          card.remove();
          this.renumberAddressCards();
        }
      });

      // Bind DataEntry nav links (Address, Introducer, etc.)
      const navButtons = document.querySelectorAll("[data-dataentry-link]");
      navButtons.forEach((button) => {
        const handler = (event) => {
          event.preventDefault();
          event.stopPropagation();
          const link = button.dataset.dataentryLink;
          if (link === "address") {
            this.loadAddressPanel();
          } else if (link === "introducer") {
            this.loadIntroducerPanel();
          } else if (link === "bank-accounts") {
            this.loadBankAccountsPanel();
            this.loadBankAccountsPanel();
          } else if (link === "relation") {
            this.loadRelationPanel();
          } else if (link === "client-profile") {
            this.loadClientProfileChangePanel();
          } else if (link === "demise") {
             this.loadDemiseDetailsPanel();
          } else if (link === "udf1") {
            this.loadUDF1Panel();
          } else if (link === "udf2") {
            this.loadUDF2Panel();
            this.loadUDF2Panel();
          } else if (link === "udf3") {
            this.loadUDF3Panel();
          } else if (link === "identity") {
            this.loadClientIdentityTypesPanel();
          }
        };
        // Use click only to avoid duplicate/blocked events on first interaction
        button.addEventListener("click", handler, { once: false });
      });

      // Bind View nav links (Signature and Photograph, etc.)
      const viewButtons = document.querySelectorAll("[data-view-link]");
      viewButtons.forEach((button) => {
        const handler = (event) => {
          event.preventDefault();
          event.stopPropagation();
          const link = button.dataset.viewLink;
          if (link === "signature-photo") {
            this.loadSignaturePhotoPanel();
          }
        };
        button.addEventListener("click", handler, { once: false });
      });

      this.bindAddressEvents();
      this.bindRelationsEvents();
      this.bindEmploymentEvents();
      this.bindDocumentEvents();
      this.bindPhotoSignatureEvents();
      this.bindProductsServicesEvents();
    }

    applyLookupSelection(record) {
      if (!record?.ClientID) return;

      // This is a finalized client with a real ClientID, not a pipeline application
      this.state.isPipelineApplication = false;

      if (this.form.elements.ClientID) {
        this.form.elements.ClientID.value = record.ClientID;
      }
      this.updateSummaryMeta();
      this.loadClient(record.ClientID);
    }

    /**
     * Handle selection from the GL Account Lookup Modal
     * Populates the Reporting GL AccountID field in the Corporate stepper.
     */
    applyGLAccountSelection(record) {
      if (!record?.AccountID) return;

      // Set the GL Account ID field
      const glIdField = document.getElementById("corpReportingGLAccountID");
      if (glIdField) {
        glIdField.value = record.AccountID;
      }

      // Also set hidden description field if we want to track that
      const glDescField = document.getElementById("corpReportingGLDescription");
      if (glDescField) {
        glDescField.value = record.Description || "";
      }

      this.showToast(`GL Account ${record.AccountID} selected.`, "success");
    }

    /**
     * Handle selection from the Application Lookup Modal (WFClientID)
     * Populates form fields with pipeline application data.
     * 
     * IMPORTANT: The "ClientID" returned from WFClientID table is actually the RequestID
     * used when the application was created. Pipeline applications don't have a real ClientID
     * until final save. We use this RequestID to:
     * 1. Set the stepperRequestId for loading/saving temp table data
     * 2. Set the ApplicationID field for reference
     * 3. Load the application data from temp tables
     * The ClientID field remains empty until final save generates a real ClientID.
     */
    applyApplicationSelection(record) {
      // The "ClientID" from WFClientID is actually the RequestID
      const pipelineRequestId = record?.ClientID;
      if (!pipelineRequestId) return;


      // IMPORTANT: Mark this as a pipeline application FIRST
      // This flag prevents other methods from setting ClientID
      this.state.isPipelineApplication = true;

      // Set the stepperRequestId to the pipeline's RequestID
      // This ensures all subsequent stepper saves use the same RequestID
      this.state.stepperRequestId = pipelineRequestId;

      // Clear requestCode state since this is a pipeline application without a ClientID
      this.state.requestCode = "";

      // DO NOT set ClientID - pipeline applications don't have a real ClientID yet
      // The ClientID will be generated on final save
      // Clear ClientID field
      if (this.form.elements.ClientID) {
        this.form.elements.ClientID.value = "";
      }

      // Set the Application ID field (this IS the RequestID, for display/tracking)
      // Use getElementById for more reliable element selection
      const applicationIdField = document.getElementById("ApplicationID") || this.form.elements.ApplicationID;
      if (applicationIdField) {
        applicationIdField.value = pipelineRequestId;
      } else {
        console.warn("[ApplicationLookup] ApplicationID field not found");
      }

      // Set Client Type based on the application
      if (record.ClientTypeID && this.form.elements.ClientTypeID) {
        this.form.elements.ClientTypeID.value = record.ClientTypeID;
        // Trigger scope update
        this.updateScope();
      }

      // Set Client Name if available
      if (record.Name && this.form.elements.ClientName) {
        this.form.elements.ClientName.value = record.Name;
      }

      // Update summary display
      this.updateSummaryMeta();

      // Load the pipeline application data using the RequestID
      // This will fetch from temp tables using the stepperRequestId
      this.loadPipelineApplication(pipelineRequestId);

      this.showToast(`Pipeline application ${pipelineRequestId} selected. Continue editing to complete.`, "success");
    }

    /**
     * Load a pipeline application using its RequestID.
     * Pipeline applications are stored in temp tables, keyed by RequestID.
     * Unlike loadClient() which loads finalized clients, this loads in-progress applications.
     * 
     * IMPORTANT: This method tracks which steps have existing data via state.existingStepData
     * This is used by saveStepDraft to determine whether to call CREATE or UPDATE procedures.
     */
    async loadPipelineApplication(requestId) {
      const svc = this.clientService;
      if (!svc?.getClientBasicDetails) {
        console.warn("[loadPipelineApplication] ClientService.getClientBasicDetails not available");
        return;
      }

      try {
        this.showToast(`Loading pipeline application ${requestId}...`, "info");

        // Reset existing step data tracking
        this.state.existingStepData = {
          basicDetails: false,
          individual: false,
          corporate: false,
          address: false,
          employment: false,
          relations: false,
          documents: false,
          photoSignatures: false,
          specialOffers: false,
          otherDetails: false,
          productsServices: false
        };

        // For pipeline applications, we pass the RequestID as both ClientID and RequestID
        // because the temp tables are keyed by RequestID
        const baseReq = { ClientID: requestId, RequestID: requestId };

        // 1) Basic details
        const basicResp = await svc.getClientBasicDetails(baseReq);
        const basic = extractOldApiInnerDetails(basicResp);
        if (basic && !Array.isArray(basic) && typeof basic === "object") {
          this.applyBasicDetailsStepper(basic);
          this.state.existingStepData.basicDetails = true;
        } else {
          console.warn("[loadPipelineApplication] No basic details found for RequestID:", requestId);
        }

        const clientTypeId = (basic?.ClientTypeID || this.form.elements.ClientTypeID?.value || "").trim().toUpperCase();
        const isCorporate = clientTypeId === "B" || clientTypeId === "C";

        const tasks = [];

        // 2) Individual / Corporate
        if (isCorporate && svc.getClientCorporate) {
          tasks.push(
            svc.getClientCorporate(baseReq).then((resp) => {
              const rows = extractOldApiInnerDetails(resp);
              const row = Array.isArray(rows) ? rows[0] : rows;
              if (row && Object.keys(row).length > 0) {
                // Merge basic details into corporate row for shared fields
                this.applyCorporateStepper(row, basic);
                this.state.existingStepData.corporate = true;
              }
            }).catch(e => console.warn("[loadPipelineApplication] Corporate details error:", e))
          );
        } else if (!isCorporate && svc.getClientIndividual) {
          tasks.push(
            svc.getClientIndividual(baseReq).then((resp) => {
              const rows = extractOldApiInnerDetails(resp);
              const row = Array.isArray(rows) ? rows[0] : rows;
              if (row && Object.keys(row).length > 0) {
                this.applyIndividualStepper(row);
                this.state.existingStepData.individual = true;
              }
            }).catch(e => console.warn("[loadPipelineApplication] Individual details error:", e))
          );
        }

        // 3) Address
        if (svc.getClientAddress) {
          tasks.push(
            svc.getClientAddress(baseReq).then((resp) => {
              const rows = extractOldApiInnerDetails(resp);
              if (Array.isArray(rows) && rows.length > 0) {
                const mapped = rows.map((r) => ({
                  ...r,
                  // Map API field names to form field names
                  Region: r.Region ?? r.RegionID ?? "",
                  SubCityZone: r.SubCityZone ?? r.SubCityID ?? "",
                  HouseNumber: r.HouseNumber ?? r.HouseNo ?? "",
                  PhoneWork: r.PhoneWork ?? r.Phone1 ?? "",
                  PhoneHome: r.PhoneHome ?? r.Phone2 ?? "",
                  FaxNo: r.FaxNo ?? r.Fax ?? "",
                  ZipCode: r.ZipCode ?? r.ZIPCode ?? ""
                }));
                this.bootstrapAddresses(mapped);
                this.state.existingStepData.address = true;
              }
            }).catch(e => console.warn("[loadPipelineApplication] Address error:", e))
          );
        }

        // 4) Employment
        if (svc.getClientEmployment) {
          tasks.push(
            svc.getClientEmployment(baseReq).then((resp) => {
              const rows = extractOldApiInnerDetails(resp);
              const row = Array.isArray(rows) ? rows[0] : rows;
              if (row && Object.keys(row).length > 0) {
                this.applyEmploymentStepper(row);
                this.state.existingStepData.employment = true;
              }
            }).catch(e => console.warn("[loadPipelineApplication] Employment error:", e))
          );
        }

        // 5) Relations
        if (svc.getClientRelation) {
          tasks.push(
            svc.getClientRelation(baseReq).then((resp) => {
              const rows = extractOldApiInnerDetails(resp);
              if (Array.isArray(rows) && rows.length > 0) {
                this.collections.relations = rows.map((r) => ({
                  ID: r.ID ?? null,
                  ClientToRelationID: r.ID ?? null,
                  RelatedClientID: r.RelatedClientID || "",
                  RelationID: r.RelationID || "",
                  RelationTypeID: r.RelationTypeID ?? r.RelationType ?? "",
                  IdentificationTypeID: r.IdentificationTypeID || "",
                  IdentificationNo: r.IdentificationNo || r.IdentificationNumber || "",
                  RelationRefNo: r.RelationRefNo ?? 1,
                  SharePercent: readNumber(r.SharePercent, 0),
                  Name: r.Name || "",
                  TitleID: r.TitleID || "",
                  GenderID: r.GenderID || "",
                  CreatedBy: r.CreatedBy || "",
                  CreatedOn: r.CreatedOn || ""
                }));
                this.renderRelationsTable();
                this.state.existingStepData.relations = true;
              }
            }).catch(e => console.warn("[loadPipelineApplication] Relations error:", e))
          );
        }

        // 6) Documents
        if (svc.getClientDocuments) {
          tasks.push(
            svc.getClientDocuments(baseReq).then((resp) => {
              const rows = extractOldApiInnerDetails(resp);
              if (Array.isArray(rows) && rows.length > 0) {
                // Helper to look up label from dropdown by value
                const getLabelFromDropdown = (selector, value) => {
                  if (!value) return "";
                  const dropdown = this.form.querySelector(selector);
                  if (!dropdown) return value;
                  const option = dropdown.querySelector(`option[value="${value}"]`);
                  return option ? option.textContent.trim() : value;
                };

                // Map API format to internal format expected by renderDocumentsTable
                this.collections.documents = rows.map(doc => ({
                  ...doc,
                  // Store codes
                  DocumentID: doc.DocumentID || "",
                  DocumentTypeID: doc.DocumentTypeID || "",
                  LocationID: doc.LocationID || "",
                  // Look up labels from dropdowns
                  DocumentIDLabel: getLabelFromDropdown('[data-document-field="DocumentID"]', doc.DocumentID) || doc.Description || doc.DocumentID || "",
                  DocumentTypeLabel: getLabelFromDropdown('[data-document-field="DocumentTypeID"]', doc.DocumentTypeID) || doc.DocumentTypeID || "",
                  LocationLabel: getLabelFromDropdown('[data-document-field="LocationID"]', doc.LocationID) || doc.LocationID || "",
                  // Map FilePath to filePath for download/preview
                  filePath: doc.FilePath || doc.filePath || "",
                  // Mark as saved (came from server)
                  __saved: true,
                  imageID: doc.ImageID || doc.imageID || null
                }));
                this.renderDocumentsTable();
                this.state.existingStepData.documents = true;
              }
            }).catch(e => console.warn("[loadPipelineApplication] Documents error:", e))
          );
        }

        // 7) Photos/Signatures
        if (svc.getClientPhotoSignatures || svc.getPhotoSignature) {
          tasks.push(
            (svc.getClientPhotoSignatures || svc.getPhotoSignature)(baseReq).then((resp) => {
              const rows = extractOldApiInnerDetails(resp);
              if (Array.isArray(rows) && rows.length > 0) {
                this.collections.photoSignatures = rows;
                this.refreshPhotoSignatureTable();
                this.state.existingStepData.photoSignatures = true;
              }
            }).catch(e => console.warn("[loadPipelineApplication] Photo/Signatures error:", e))
          );
        }

        // 8) Special Offers
        if (svc.getSpecialOffers) {
          tasks.push(
            svc.getSpecialOffers(baseReq).then((resp) => {
              const offers = extractOldApiInnerDetails(resp);
              if (offers && !Array.isArray(offers) && typeof offers === "object" && Object.keys(offers).length > 0) {
                this.applySpecialOffersStepper(offers);
                this.state.existingStepData.specialOffers = true;
              }
            }).catch(e => console.warn("[loadPipelineApplication] Special Offers error:", e))
          );
        }

        // 9) Other Details / KYC
        if (svc.getOtherDetails) {
          tasks.push(
            svc.getOtherDetails(baseReq).then((resp) => {
              const other = extractOldApiInnerDetails(resp);
              if (other && !Array.isArray(other) && typeof other === "object" && Object.keys(other).length > 0) {
                this.applyOtherDetailsStepper(other);
                this.state.existingStepData.otherDetails = true;
              }
            }).catch(e => console.warn("[loadPipelineApplication] Other Details error:", e))
          );
        }

        // 10) Products and Services
        if (svc.getProductAndServices) {
          tasks.push(
            svc.getProductAndServices(baseReq).then((resp) => {
              const data = extractOldApiInnerDetails(resp);
              if (data && !Array.isArray(data) && typeof data === "object") {
                const rawProducts = data.Products ? (typeof data.Products === "string" ? JSON.parse(data.Products) : data.Products) : [];
                const rawServices = data.Services ? (typeof data.Services === "string" ? JSON.parse(data.Services) : data.Services) : [];

                if (rawProducts.length > 0) {
                  // Map API format to internal format expected by renderProducts
                  this.products = rawProducts.map((item, index) => ({
                    serialNo: Number(item.SerialNo) || index + 1,
                    id: item.ProductID || "",
                    productTypeId: item.ProductTypeID || "",
                    productTypeLabel: item.ProductTypeID || "",
                    description: item.Description || "",
                    isSelected: coerceBool(item.IsSelected),
                    isDefault: coerceBool(item.IsDefault)
                  }));
                }

                if (rawServices.length > 0) {
                  // Map API format to internal format expected by renderServices
                  this.services = rawServices.map((svc, index) => ({
                    id: svc.SubCodeID || svc.ServiceID || String(index + 1),
                    code: svc.SubCodeID || svc.ServiceID || "",
                    description: svc.Description || "",
                    typeId: svc.ID || "TypeOfServiceID",
                    serialNo: Number(svc.SerialNo) || index + 1,
                    status: Number(svc.StatusID) === 1 || coerceBool(svc.StatusID)
                  }));
                }

                if (rawProducts.length > 0 || rawServices.length > 0) {
                  this.state.existingStepData.productsServices = true;
                  this.renderProducts();
                  this.renderServices();
                }
              }
            }).catch(e => console.warn("[loadPipelineApplication] Products/Services error:", e))
          );
        }

        await Promise.all(tasks);

        // After loading all data, ensure the Application ID field still shows the RequestID
        // (in case applyBasicDetailsStepper cleared or overwrote it)
        const applicationIdField = document.getElementById("ApplicationID") || this.form.elements.ApplicationID;
        if (applicationIdField && this.state.isPipelineApplication) {
          applicationIdField.value = requestId;
        }

        // Also ensure ClientID is still empty for pipeline applications
        if (this.form.elements.ClientID && this.state.isPipelineApplication) {
          this.form.elements.ClientID.value = "";
        }

        // Mark that data has been loaded (enables Edit button, record navigation)
        this.state.clientDataLoaded = true;
        this.state.clientTypeSelected = true; // Client type is known from loaded data
        this.state.loadedClientId = ""; // Pipeline apps don't have a ClientID yet
        this.syncActionButtons();

        // Log which steps have existing data

        this.showToast(`Pipeline application ${requestId} loaded. Continue editing.`, "success");
        
        // Track recent activity for pipeline application
        this.trackRecentActivity(requestId, true);

      } catch (error) {
        console.error("[loadPipelineApplication] Error loading pipeline application:", error);
        this.state.clientDataLoaded = false;
        this.state.loadedClientId = "";
        this.syncActionButtons();
        this.showToast(`Error loading pipeline application: ${error.message}`, "danger");
      }
    }

    // =========================================================================
    // ADDRESS FORM + TABLE HANDLERS
    // =========================================================================
    bindAddressEvents() {
      if (this.addressEventsBound) return;
      const root = this.form.querySelector("[data-address-form]");
      if (!root) return;

      this.addressEventsBound = true;

      // Forms always start disabled - user must click New or Alter to enable
      this.setAddressFormEnabled(false);

      root.querySelector("[data-address-action='new']")?.addEventListener("click", () => {
        this.state.selectedAddressIndex = null;
        this.resetAddressForm();
        this.state.editing.addresses = null;
        this.setAddressFormEnabled(true);
      });
      root.querySelector("[data-address-action='clear']")?.addEventListener("click", () => {
        this.state.selectedAddressIndex = null;
        this.resetAddressForm();
        this.state.editing.addresses = null;
        this.setAddressFormEnabled(false);
      });
      root.querySelector("[data-address-action='alter']")?.addEventListener("click", () => {
        this.alterSelectedAddress();
      });
      root.querySelector("[data-address-action='remove']")?.addEventListener("click", () => {
        this.removeSelectedAddress();
      });
      root.querySelector("[data-address-action='update']")?.addEventListener("click", () => {
        this.saveAddressFromForm();
      });

      const table = this.form.querySelector('[data-table="addresses"]');
      table?.addEventListener("click", (event) => {
        const row = event.target.closest("tr[data-index]");
        if (!row) return;
        this.setSelectedAddressIndex(Number(row.dataset.index));
        this.patchAddressFormFromSelection();
        // Form stays disabled until Alter is clicked
        this.setAddressFormEnabled(false);
      });

      table?.addEventListener("dblclick", (event) => {
        const row = event.target.closest("tr[data-index]");
        if (!row) return;
        this.setSelectedAddressIndex(Number(row.dataset.index));
        this.alterSelectedAddress();
      });
    }

    setAddressFormEnabled(enabled) {
      this.state.formEnabled.addresses = enabled;
      const root = this.form.querySelector("[data-address-form]");
      if (!root) return;
      root.querySelectorAll("[data-address-field]").forEach((field) => {
        field.disabled = !enabled;
      });
    }

    patchAddressFormFromSelection() {
      const index = this.state.selectedAddressIndex;
      if (index === null || index === undefined || index < 0) return;
      const entry = this.collections.addresses[index];
      if (!entry) return;

      const root = this.form.querySelector("[data-address-form]");
      if (!root) return;

      const setField = (fieldName, value) => {
        const el = root.querySelector(`[data-address-field="${fieldName}"]`);
        if (!el) return;
        if (el.type === "checkbox") {
          el.checked = !!value;
        } else {
          el.value = value || "";
        }
      };

      setField("AddressTypeID", entry.AddressTypeID);
      setField("IsMailingAddress", entry.IsMailingAddress);
      setField("Address1", entry.Address1);
      setField("Address2", entry.Address2);
      setField("CityID", entry.CityID);
      setField("CountryID", entry.CountryID);
      setField("Region", entry.Region);
      setField("SubCityZone", entry.SubCityZone);
      setField("Wereda", entry.Wereda);
      setField("Kebele", entry.Kebele);
      setField("HouseNumber", entry.HouseNumber);
      setField("ZipCode", entry.ZipCode);
      setField("Language", entry.Language);
      setField("LandMark", entry.LandMark);
      setField("PhoneWork", entry.PhoneWork);
      setField("PhoneHome", entry.PhoneHome);
      setField("Mobile", entry.Mobile);
      setField("Email", entry.Email);
      // NOTE: This function only patches data, does NOT change enabled state
      // Caller is responsible for enabling/disabling form
    }

    setSelectedAddressIndex(index) {
      if (Number.isNaN(index)) return;
      this.state.selectedAddressIndex = index;
      const tbody = this.form.querySelector('[data-table="addresses"] tbody');
      if (!tbody) return;
      Array.from(tbody.querySelectorAll("tr[data-index]")).forEach((tr) => {
        tr.classList.toggle("is-selected", tr.dataset.index === String(index));
      });
    }

    resetAddressForm() {
      const root = this.form.querySelector("[data-address-form]");
      if (!root) return;
      root.querySelectorAll("[data-address-field]").forEach((field) => {
        if (field.type === "checkbox") {
          field.checked = false;
        } else {
          field.value = "";
        }
      });
      this.state.editing.addresses = null;
    }

    alterSelectedAddress() {
      const index = this.state.selectedAddressIndex;
      if (index === null || index === undefined || index < 0) {
        this.showToast("Select an address row to alter.", "warning");
        return;
      }
      const entry = this.collections.addresses[index];
      if (!entry) return;

      // Patch form from selection if not already done
      this.patchAddressFormFromSelection();

      // Enable form for editing and set editing index
      this.state.editing.addresses = index;
      this.state.formEnabled.addresses = true; // Explicitly set state
      this.setAddressFormEnabled(true);
    }

    removeSelectedAddress() {
      const index = this.state.selectedAddressIndex;
      if (index === null || index === undefined || index < 0) {
        this.showToast("Select an address row to remove.", "warning");
        return;
      }
      const entry = this.collections.addresses[index];
      if (!entry) return;

      if (this.state.pageFunction === "Update" && entry.ID) {
        entry.__deleted = true;
      } else {
        this.collections.addresses.splice(index, 1);
      }

      this.state.selectedAddressIndex = null;
      this.state.editing.addresses = null;
      this.resetAddressForm();
      this.renderAddressTable();
    }

    saveAddressFromForm() {
      // Form must be enabled (user clicked New or Alter)
      if (!this.state.formEnabled.addresses) {
        this.showToast("Click 'New' to add or select a row and click 'Alter' to edit.", "warning");
        return;
      }

      const root = this.form.querySelector("[data-address-form]");
      if (!root) return;

      const getField = (fieldName) => {
        const el = root.querySelector(`[data-address-field="${fieldName}"]`);
        if (!el) return "";
        if (el.type === "checkbox") return el.checked;
        return el.value?.trim() || "";
      };

      const addressTypeId = getField("AddressTypeID");
      const address1 = getField("Address1");

      if (!addressTypeId || !address1) {
        this.showToast("Address Type and Address 1 are required.", "danger");
        return;
      }

      const previous = this.state.editing.addresses !== null ? this.collections.addresses[this.state.editing.addresses] : null;

      const addressTypeSelect = root.querySelector('[data-address-field="AddressTypeID"]');
      const citySelect = root.querySelector('[data-address-field="CityID"]');
      const countrySelect = root.querySelector('[data-address-field="CountryID"]');
      const regionSelect = root.querySelector('[data-address-field="Region"]');

      const entry = {
        ID: previous?.ID ?? null,
        AddressTypeID: addressTypeId,
        AddressTypeLabel: addressTypeSelect?.selectedOptions?.[0]?.textContent?.trim() || "",
        IsMailingAddress: getField("IsMailingAddress"),
        Address1: address1,
        Address2: getField("Address2"),
        CityID: getField("CityID"),
        CityLabel: citySelect?.selectedOptions?.[0]?.textContent?.trim() || "",
        CountryID: getField("CountryID"),
        CountryLabel: countrySelect?.selectedOptions?.[0]?.textContent?.trim() || "",
        Region: getField("Region"),
        RegionLabel: regionSelect?.selectedOptions?.[0]?.textContent?.trim() || "",
        SubCityZone: getField("SubCityZone"),
        Wereda: getField("Wereda"),
        Kebele: getField("Kebele"),
        HouseNumber: getField("HouseNumber"),
        ZipCode: getField("ZipCode"),
        Language: getField("Language"),
        LandMark: getField("LandMark"),
        PhoneWork: getField("PhoneWork"),
        PhoneHome: getField("PhoneHome"),
        Mobile: getField("Mobile"),
        Email: getField("Email"),
        UpdateCount: previous?.UpdateCount ?? null
      };

      const editingIndex = this.state.editing.addresses;
      const isEditing = editingIndex !== null && editingIndex !== undefined && editingIndex >= 0;

      if (isEditing && editingIndex < this.collections.addresses.length) {
        entry.__rowId = this.collections.addresses[editingIndex].__rowId;
        this.collections.addresses[editingIndex] = entry;
      } else {
        entry.__rowId = `addr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.collections.addresses.push(entry);
      }

      this.resetAddressForm();
      this.setAddressFormEnabled(false);
      this.renderAddressTable();
      this.showToast("Address saved.", "success");
    }

    renderAddressTable() {
      const tbody = this.form.querySelector('[data-table="addresses"] tbody');
      if (!tbody) {
        console.warn("[renderAddressTable] tbody not found for addresses table");
        return;
      }
      tbody.innerHTML = "";

      const rows = this.collections.addresses || [];

      rows.forEach((entry, index) => {
        if (entry.__deleted) return; // Skip deleted rows in display
        const tr = document.createElement("tr");
        tr.dataset.index = String(index);
        tr.classList.toggle("is-selected", this.state.selectedAddressIndex === index);

        const addressDisplay = [entry.Address1, entry.Address2].filter(Boolean).join(", ");

        tr.innerHTML = `
          <td class="ps-2">${entry.AddressTypeLabel || entry.AddressTypeID || ""}</td>
          <td>${addressDisplay}</td>
          <td>${entry.CityLabel || entry.CityID || ""}</td>
          <td>${entry.RegionLabel || entry.Region || ""}</td>
          <td>${entry.Mobile || ""}</td>
          <td class="text-center">${entry.IsMailingAddress ? '<i class="bi bi-check-circle-fill text-success"></i>' : ""}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    bindRelationsEvents() {
      if (this.relationsEventsBound) return;
      const root = this.form.querySelector("[data-relations-form]");
      if (!root) return;

      this.relationsEventsBound = true;

      // Forms always start disabled - user must click New or Alter to enable
      this.setRelationsFormEnabled(false);

      root.querySelector("[data-relation-action='lookup']")?.addEventListener("click", (event) => {
        event.preventDefault();
        if (!this.state.formEnabled.relations) {
          this.showToast("Click 'New' first to add a new relation.", "warning");
          return;
        }
        const prefill = root.querySelector('[data-relation-field="RelatedClientID"]')?.value || "";
        this.openLookupForRelatedClient(prefill);
      });

      root.querySelector("[data-relation-action='new']")?.addEventListener("click", () => {
        this.state.selectedRelationIndex = null;
        this.resetRelationsForm(true);
        this.state.editing.relations = null;
        this.setRelationsFormEnabled(true);
      });
      root.querySelector("[data-relation-action='clear']")?.addEventListener("click", () => {
        this.state.selectedRelationIndex = null;
        this.resetRelationsForm(true);
        this.state.editing.relations = null;
        this.setRelationsFormEnabled(false);
      });
      root.querySelector("[data-relation-action='alter']")?.addEventListener("click", () => {
        this.alterSelectedRelation();
      });
      root.querySelector("[data-relation-action='remove']")?.addEventListener("click", () => {
        this.removeSelectedRelation();
      });
      root.querySelector("[data-relation-action='update']")?.addEventListener("click", () => {
        this.saveRelationFromForm();
      });

      const relatedIdField = root.querySelector('[data-relation-field="RelatedClientID"]');
      relatedIdField?.addEventListener("blur", () => {
        if (!this.state.formEnabled.relations) return;
        const value = relatedIdField.value?.trim();
        if (value) this.hydrateRelationFormFromRelatedClientId(value);
      });

      const table = this.form.querySelector('[data-table="relations"]');
      table?.addEventListener("click", (event) => {
        const row = event.target.closest("tr[data-index]");
        if (!row) return;
        this.setSelectedRelationIndex(Number(row.dataset.index));
        this.patchRelationsFormFromSelection();
        // Form stays disabled until Alter is clicked
        this.setRelationsFormEnabled(false);
      });

      table?.addEventListener("dblclick", (event) => {
        const row = event.target.closest("tr[data-index]");
        if (!row) return;
        this.setSelectedRelationIndex(Number(row.dataset.index));
        this.alterSelectedRelation();
      });
    }

    setRelationsFormEnabled(enabled) {
      this.state.formEnabled.relations = enabled;
      const root = this.form.querySelector("[data-relations-form]");
      if (!root) {
        console.warn("[setRelationsFormEnabled] Relations form root not found");
        return;
      }
      const fields = root.querySelectorAll("[data-relation-field]");
      fields.forEach((field) => {
        field.disabled = !enabled;
      });
      // Also handle the lookup button
      const lookupBtn = root.querySelector("[data-relation-action='lookup']");
      if (lookupBtn) lookupBtn.disabled = !enabled;
      
      // Add real-time share percentage validation when form is enabled
      if (enabled) {
        const shareField = root.querySelector('[data-relation-field="SharePercent"]');
        if (shareField && !shareField.dataset.validationAdded) {
          shareField.dataset.validationAdded = 'true';
          console.log('[Share Validation] Adding input restrictions to share field');
          
          // Prevent typing over 100
          shareField.addEventListener('input', (e) => {
            let value = e.target.value.replace(/[^\d.]/g, ''); // Only digits and decimal
            const num = parseFloat(value);
            if (!isNaN(num) && num > 100) {
              e.target.value = '100';
              e.target.style.borderColor = 'red';
              this.showToast('Share percentage cannot exceed 100%', 'warning');
              setTimeout(() => {
                e.target.style.borderColor = '';
              }, 1000);
            }
          });
          
          shareField.addEventListener('blur', (e) => {
            const value = parseFloat(e.target.value);
            if (!isNaN(value) && (value < 0 || value > 100)) {
              e.target.value = '';
              this.showToast('Share percentage must be between 0 and 100', 'danger');
            }
          });
        }
      }
    }

    patchRelationsFormFromSelection() {
      const index = this.state.selectedRelationIndex;
      if (index === null || index === undefined || index < 0) return;
      const entry = this.collections.relations[index];
      if (!entry) return;

      const root = this.form.querySelector("[data-relations-form]");
      if (!root) return;

      // Helper to safely set field value
      const setField = (fieldName, value) => {
        const el = root.querySelector(`[data-relation-field="${fieldName}"]`);
        if (el) el.value = value ?? "";
      };

      setField("RelatedClientID", entry.RelatedClientID);
      setField("TitleID", entry.TitleID);
      setField("FirstName", entry.FirstName);
      setField("MiddleName", entry.MiddleName);
      setField("LastName", entry.LastName);
      setField("Email", entry.Email);
      setField("GenderID", entry.GenderID);
      setField("Mobile", entry.Mobile);
      setField("RelationTypeID", entry.RelationTypeID ?? entry.RelationType);
      setField("RelationID", entry.RelationID);
      setField("IdentificationTypeID", entry.IdentificationTypeID);
      setField("IdentificationNo", entry.IdentificationNo);
      setField("SharePercent", entry.SharePercent);
      setField("Remarks", entry.Remarks);
      // NOTE: This function only patches data, does NOT change enabled state
      // Caller is responsible for enabling/disabling form
    }

    openLookupForRelatedClient(prefill = "") {
      if (!this.lookupModal?.isReady?.()) {
        this.showToast("Client lookup is not available.", "danger");
        return;
      }

      const previousHandler = this.lookupModal.onSelect;
      this.lookupModal.onSelect = (record) => {
        const root = this.form.querySelector("[data-relations-form]");
        const related = record?.ClientID ? String(record.ClientID).trim() : "";
        if (root && related) {
          const relatedField = root.querySelector('[data-relation-field="RelatedClientID"]');
          if (relatedField) relatedField.value = related;
          this.hydrateRelationFormFromRelatedClientId(related);
        }
        this.lookupModal.onSelect = previousHandler;
      };

      this.lookupModal.open(prefill);
    }

    setSelectedRelationIndex(index) {
      if (Number.isNaN(index)) return;
      this.state.selectedRelationIndex = index;
      const tbody = this.form.querySelector('[data-table="relations"] tbody');
      if (!tbody) return;
      Array.from(tbody.querySelectorAll("tr[data-index]")).forEach((tr) => {
        tr.classList.toggle("is-selected", tr.dataset.index === String(index));
      });
    }

    resetRelationsForm(resetRelatedClient = false) {
      const root = this.form.querySelector("[data-relations-form]");
      if (!root) return;
      root.querySelectorAll("[data-relation-field]").forEach((field) => {
        if (resetRelatedClient || field.dataset.relationField !== "RelatedClientID") {
          field.value = "";
        }
      });
      this.state.editing.relations = null;
    }

    alterSelectedRelation() {
      const index = this.state.selectedRelationIndex;
      if (index === null || index === undefined || index < 0) {
        this.showToast("Select a relation row to alter.", "warning");
        return;
      }
      const entry = this.collections.relations[index];
      if (!entry) {
        console.warn("[alterSelectedRelation] No entry found at index:", index);
        return;
      }

      // Patch form from selection if not already done
      this.patchRelationsFormFromSelection();

      // Enable form for editing and set editing index
      this.state.editing.relations = index;
      this.state.formEnabled.relations = true; // Explicitly set state
      this.setRelationsFormEnabled(true);
    }

    removeSelectedRelation() {
      const index = this.state.selectedRelationIndex;
      if (index === null || index === undefined || index < 0) {
        this.showToast("Select a relation row to remove.", "warning");
        return;
      }
      const entry = this.collections.relations[index];
      if (!entry) return;

      if (this.state.pageFunction === "Update" && (entry.ID ?? entry.ClientToRelationID)) {
        entry.__deleted = true;
        entry.SharePercent = 0;
        entry.Remarks = entry.Remarks || "Removed";
      } else {
        this.collections.relations.splice(index, 1);
      }

      this.state.selectedRelationIndex = null;
      this.state.editing.relations = null;
      this.resetRelationsForm(false);
      this.renderRelationsTable();
    }

    async hydrateRelationFormFromRelatedClientId(relatedClientId) {
      const svc = this.clientService;
      if (!svc?.getClientIndividual) return;
      const root = this.form.querySelector("[data-relations-form]");
      if (!root) return;

      const requestId = this.getOrCreateStepperRequestId?.() || "";
      try {
        const resp = await svc.getClientIndividual({ ClientID: relatedClientId, RequestID: requestId });
        const rows = extractOldApiInnerDetails(resp);
        const individual = Array.isArray(rows) ? rows[0] : rows;
        if (!individual || typeof individual !== "object") return;
        root.querySelector('[data-relation-field="TitleID"]').value = individual.TitleID || "";
        root.querySelector('[data-relation-field="FirstName"]').value = individual.FirstName || "";
        root.querySelector('[data-relation-field="MiddleName"]').value = individual.MiddleName || "";
        root.querySelector('[data-relation-field="LastName"]').value = individual.LastName || "";
        root.querySelector('[data-relation-field="GenderID"]').value = individual.GenderID || "";
      } catch (error) {
        console.warn("[ClientMaintenance] Unable to hydrate related client details", error);
      }
    }

    saveRelationFromForm() {
      if (this.isSavingRelation) {
        return;
      }
      this.isSavingRelation = true;

      try {
        // Form must be enabled (user clicked New or Alter)
        if (!this.state.formEnabled.relations) {
          this.isSavingRelation = false;
          this.showToast("Click 'New' to add or select a row and click 'Alter' to edit.", "warning");
          return;
        }

        const root = this.form.querySelector("[data-relations-form]");
        if (!root) {
          console.warn("[ClientMaintenance] Relations form root not found");
          return;
        }

        const previous = this.state.editing.relations !== null ? this.collections.relations[this.state.editing.relations] : null;

        const relatedClientIdEl = root.querySelector('[data-relation-field="RelatedClientID"]');
        const relationIdEl = root.querySelector('[data-relation-field="RelationID"]');

        const relatedClientId = relatedClientIdEl?.value?.trim() || "";
        const relationId = relationIdEl?.value || "";

        if (!relatedClientId || !relationId) {
          this.isSavingRelation = false;
          this.showToast("Client Relation and Relation are required.", "danger");
          return;
        }

        const nextRefNo = () => {
          const max = this.collections.relations.reduce((acc, r) => Math.max(acc, Number(r.RelationRefNo) || 0), 0);
          return max + 1;
        };

        const titleSelect = root.querySelector('[data-relation-field="TitleID"]');
        const genderSelect = root.querySelector('[data-relation-field="GenderID"]');
        const idTypeSelect = root.querySelector('[data-relation-field="IdentificationTypeID"]');
        const titleLabel = titleSelect?.selectedOptions?.[0]?.textContent?.trim() || "";
        const genderLabel = genderSelect?.selectedOptions?.[0]?.textContent?.trim() || "";
        const idTypeLabel = idTypeSelect?.selectedOptions?.[0]?.textContent?.trim() || "";

        const entry = {
          ID: previous?.ID ?? previous?.ClientToRelationID ?? null,
          ClientToRelationID: previous?.ClientToRelationID ?? previous?.ID ?? null,
          RelatedClientID: relatedClientId,
          RelationTypeID: root.querySelector('[data-relation-field="RelationTypeID"]')?.value || "",
          RelationID: relationId,
          IdentificationTypeID: root.querySelector('[data-relation-field="IdentificationTypeID"]')?.value || "",
          IdentificationTypeLabel: idTypeLabel,
          IdentificationNo: root.querySelector('[data-relation-field="IdentificationNo"]')?.value?.trim() || "",
          RelationRefNo: previous?.RelationRefNo ?? nextRefNo(),
          SharePercent: readNumber(root.querySelector('[data-relation-field="SharePercent"]')?.value, 0),
          Remarks: root.querySelector('[data-relation-field="Remarks"]')?.value?.trim() || "",
          UpdateCount: previous?.UpdateCount ?? null,

          TitleID: root.querySelector('[data-relation-field="TitleID"]')?.value || "",
          TitleLabel: titleLabel,
          FirstName: root.querySelector('[data-relation-field="FirstName"]')?.value?.trim() || "",
          MiddleName: root.querySelector('[data-relation-field="MiddleName"]')?.value?.trim() || "",
          LastName: root.querySelector('[data-relation-field="LastName"]')?.value?.trim() || "",
          GenderID: root.querySelector('[data-relation-field="GenderID"]')?.value || "",
          GenderLabel: genderLabel,
          Email: root.querySelector('[data-relation-field="Email"]')?.value?.trim() || "",
          Mobile: root.querySelector('[data-relation-field="Mobile"]')?.value?.trim() || ""
        };

        if (entry.SharePercent < 0 || entry.SharePercent > 100) {
          this.isSavingRelation = false;
          this.showToast("Share percentage must be between 0 and 100.", "danger");
          return;
        }

        // Check for duplicate relation (same client cannot be added twice)
        const editingIndex = this.state.editing.relations;
        const isEditing = editingIndex !== null && editingIndex !== undefined && editingIndex >= 0;
        
        const duplicateIndex = this.collections.relations.findIndex((rel, idx) => {
          // Skip the current entry if we're editing
          if (isEditing && idx === editingIndex) return false;
          const existingClientId = (rel.RelatedClientID || rel.relatedClientId || '').toString().trim().toLowerCase();
          const newClientId = entry.RelatedClientID.toString().trim().toLowerCase();
          console.log(`[Duplicate Check] Comparing existing: "${existingClientId}" with new: "${newClientId}"`);
          return existingClientId === newClientId;
        });
        
        if (duplicateIndex >= 0) {
          this.isSavingRelation = false;
          console.log(`[Duplicate Detected] Client "${entry.RelatedClientID}" already exists at index ${duplicateIndex}`);
          this.showToast("⚠️ This client is already added as a relation. Duplicate entries are not allowed.", "danger");
          return;
        }
        
        // Check if adding this relation would exceed 100% total shares
        const currentTotal = this.collections.relations.reduce((sum, r, idx) => {
          // Skip the entry being edited
          if (isEditing && idx === editingIndex) return sum;
          const share = parseFloat(r.SharePercent || r.sharePercent || 0);
          return sum + (isNaN(share) ? 0 : share);
        }, 0);
        
        const newTotal = currentTotal + entry.SharePercent;
        console.log(`[Share Validation] Current total: ${currentTotal}%, Adding: ${entry.SharePercent}%, New total: ${newTotal}%`);
        
        if (newTotal > 100) {
          this.isSavingRelation = false;
          this.showToast(`⚠️ Cannot add this relation. Total shares would be ${newTotal}% (maximum allowed is 100%).`, "danger");
          return;
        }


        if (isEditing && editingIndex < this.collections.relations.length) {
          entry.__rowId = this.collections.relations[editingIndex].__rowId;
          this.collections.relations[editingIndex] = entry;
        } else {
          entry.__rowId = `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          // Prevent accidental duplicate if user spam clicks and method guard failed? 
          // (Guard is active so this shouldn't happen)
          this.collections.relations.push(entry);
        }

        this.resetRelationsForm(true);
        this.setRelationsFormEnabled(false);
        this.renderRelationsTable();
      } catch (err) {
        console.error("[saveRelationFromForm] Error:", err);
      } finally {
        // Unlock after a short delay to prevent bounce
        setTimeout(() => {
          this.isSavingRelation = false;
        }, 500);
      }
    }

    renderRelationsTable() {
      const tbody = this.form.querySelector('[data-table="relations"] tbody');
      if (!tbody) return;
      tbody.innerHTML = "";

      const rows = this.collections.relations || [];
      rows.forEach((entry, index) => {
        const tr = document.createElement("tr");
        tr.dataset.index = String(index);
        tr.classList.toggle("is-selected", this.state.selectedRelationIndex === index);
        if (entry.__deleted) {
          tr.style.opacity = "0.6";
        }

        // Construct Name (Title First Middle Last)
        const nameParts = [
          entry.TitleLabel || entry.TitleID,
          entry.FirstName,
          entry.MiddleName,
          entry.LastName
        ].filter(p => !!p).join(" ");

        // Construct ID Info (Type No)
        const idInfo = [
          entry.IdentificationTypeLabel || entry.IdentificationTypeID,
          entry.IdentificationNo
        ].filter(p => !!p).join(" ");

        tr.innerHTML = `
          <td class="ps-2">${nameParts || "-"}</td>
          <td>${this.resolveRelationLabel(entry.RelationID) || "-"}</td>
          <td>${idInfo || "-"}</td>
          <td>${readNumber(entry.SharePercent, 0)}%</td>
          <td>${entry.Mobile || "-"}</td>
        `;

        if (entry.__deleted) {
          // Optional: Strike through or red text
          tr.classList.add('text-danger');
        }

        tbody.appendChild(tr);
      });

      if (!rows.length) {
        const empty = document.createElement("tr");
        empty.innerHTML = `<td colspan="5" class="text-center text-muted">No records to display.</td>`;
        tbody.appendChild(empty);
      }
    }

    bindKinEvents() {
      const kinForm = this.form.querySelector("[data-kin-form]");
      kinForm?.querySelector("[data-kin-action='save']")?.addEventListener("click", () => this.saveKin());
      kinForm?.querySelector("[data-kin-action='cancel']")?.addEventListener("click", () => this.resetKinForm());
      const kinTable = this.form.querySelector('[data-table="kin"]');
      kinTable?.addEventListener("click", (event) => {
        const row = event.target.closest("tr[data-index]");
        if (!row) return;
        const index = Number(row.dataset.index);
        if (event.target.closest("[data-action='edit']")) {
          this.editKin(index);
        } else if (event.target.closest("[data-action='delete']")) {
          this.deleteKin(index);
        }
      });
    }

    bindEmploymentEvents() {
      if (this.employmentEventsBound) return;
      const employmentForm = this.form.querySelector("[data-employment-form]");
      this.employmentEventsBound = true;
      employmentForm?.querySelector("[data-employment-action='save']")?.addEventListener("click", () => this.saveEmployment());
      employmentForm?.querySelector("[data-employment-action='cancel']")?.addEventListener("click", () => this.resetEmploymentForm());
      const employmentTable = this.form.querySelector('[data-table="employment"]');
      employmentTable?.addEventListener("click", (event) => {
        const row = event.target.closest("tr[data-index]");
        if (!row) return;
        const index = Number(row.dataset.index);
        if (event.target.closest("[data-action='edit']")) {
          this.editEmployment(index);
        } else if (event.target.closest("[data-action='delete']")) {
          this.deleteEmployment(index);
        }
      });
    }

    bindDirectorEvents() {
      const directorForm = this.form.querySelector("[data-collection='directors']");
      if (!directorForm) return;
      directorForm.querySelector("[data-director-action='save']")?.addEventListener("click", () => this.saveDirector());
      directorForm.querySelector("[data-director-action='cancel']")?.addEventListener("click", () => this.resetDirectorForm());
      const directorsTable = this.form.querySelector('[data-table="directors"]');
      directorsTable?.addEventListener("click", (event) => {
        const row = event.target.closest("tr[data-index]");
        if (!row) return;
        const index = Number(row.dataset.index);
        if (event.target.closest("[data-action='edit']")) {
          this.editDirector(index);
        } else if (event.target.closest("[data-action='delete']")) {
          this.deleteDirector(index);
        }
      });
    }

    bindDocumentEvents() {
      if (this.documentEventsBound) return;
      const root = this.form.querySelector("[data-documents-form]");
      if (!root) return;

      this.documentEventsBound = true;

      // Forms always start disabled - user must click New or Alter to enable
      this.setDocumentsFormEnabled(false);

      // Initialize lookups for the document form
      window.initLookupFields?.(root);

      root.querySelector("[data-document-action='lookup-document']")?.addEventListener("click", (event) => {
        event.preventDefault();
        if (!this.state.formEnabled.documents) {
          this.showToast("Click 'New' first to add a new document.", "warning");
          return;
        }
        // TODO: Implement document lookup if needed
        this.showToast("Document lookup not yet implemented.", "info");
      });

      root.querySelector("[data-document-action='lookup-receiver']")?.addEventListener("click", (event) => {
        event.preventDefault();
        if (!this.state.formEnabled.documents) {
          this.showToast("Click 'New' first to add a new document.", "warning");
          return;
        }
        // Open client lookup for Received By field
        const prefill = root.querySelector('[data-document-field="ReceivedBy"]')?.value || "";
        this.openLookupForDocumentReceiver(prefill);
      });

      root.querySelector("[data-document-action='new']")?.addEventListener("click", () => {
        this.state.selectedDocumentIndex = null;
        this.resetDocumentsForm(true);
        this.state.editing.documents = null;
        this.setDocumentsFormEnabled(true);
      });
      root.querySelector("[data-document-action='clear']")?.addEventListener("click", () => {
        this.state.selectedDocumentIndex = null;
        this.resetDocumentsForm(true);
        this.state.editing.documents = null;
        this.setDocumentsFormEnabled(false);
      });
      root.querySelector("[data-document-action='alter']")?.addEventListener("click", () => this.alterSelectedDocument());
      root.querySelector("[data-document-action='remove']")?.addEventListener("click", () => this.removeSelectedDocument());
      root.querySelector("[data-document-action='update']")?.addEventListener("click", () => this.saveDocumentFromForm());

      // Preview and Download buttons for current document being edited
      root.querySelector("[data-document-action='preview']")?.addEventListener("click", () => this.previewCurrentDocument());
      root.querySelector("[data-document-action='download']")?.addEventListener("click", () => this.downloadCurrentDocument());

      // Handle file input change
      const fileInput = root.querySelector('[data-document-field="Image"]');
      fileInput?.addEventListener("change", (event) => this.handleDocumentFileUpload(event.target.files));

      const table = this.form.querySelector('[data-table="documents"]');
      table?.addEventListener("click", (event) => {
        const row = event.target.closest("tr[data-index]");
        if (!row) return;

        // Handle action button clicks
        const index = Number(row.dataset.index);
        if (event.target.closest("[data-action='preview']")) {
          this.previewDocumentAtIndex(index);
          return;
        }
        if (event.target.closest("[data-action='download']")) {
          this.downloadDocumentAtIndex(index);
          return;
        }
        if (event.target.closest("[data-action='delete']")) {
          this.setSelectedDocumentIndex(index);
          this.removeSelectedDocument();
          return;
        }

        this.setSelectedDocumentIndex(index);
        this.patchDocumentsFormFromSelection();
        // Form stays disabled until Alter is clicked
        this.setDocumentsFormEnabled(false);
      });

      table?.addEventListener("dblclick", (event) => {
        const row = event.target.closest("tr[data-index]");
        if (!row) return;
        this.setSelectedDocumentIndex(Number(row.dataset.index));
        this.alterSelectedDocument();
      });
    }

    // ========================================================================
    // PHOTO AND SIGNATURE METHODS
    // ========================================================================

    bindPhotoSignatureEvents() {
      if (this.photoSignatureEventsBound) return;
      const root = this.form.querySelector("[data-photo-signature-form]");
      if (!root) return;

      this.photoSignatureEventsBound = true;

      // Initialize ImageType lookup from system codes
      this.initPhotoSignatureLookups();

      // Initialize upload button as disabled (until image is validated)
      const uploadBtn = root.querySelector("[data-photo-action='upload']");
      if (uploadBtn) uploadBtn.disabled = true;

      const fileInput = root.querySelector("#photoFileInput");
      const previewImg = root.querySelector("#photoPreview");
      const video = root.querySelector("#photoCameraVideo");
      const canvas = root.querySelector("#photoCameraCanvas");
      const placeholder = root.querySelector("[data-photo-placeholder]");

      // File button - trigger hidden file input
      root.querySelector("[data-photo-action='file']")?.addEventListener("click", () => {
        // Block in View/Supervise mode
        const lockModes = ["View", "Supervise"];
        if (lockModes.includes(this.state.pageFunction)) {
          this.showToast("Cannot select files in View mode.", "warning");
          return;
        }
        // Require image type selection first
        const imageTypeSelect = root.querySelector("#imageType");
        if (!imageTypeSelect?.value) {
          this.showToast("Please select an image type first.", "warning");
          return;
        }
        fileInput?.click();
      });

      // Handle file selection
      fileInput?.addEventListener("change", (event) => {
        const file = event.target.files?.[0];
        if (file) {
          this.handlePhotoFileSelect(file);
        }
      });

      // Re-validate when image type changes
      const imageTypeSelect = root.querySelector("#imageType");
      imageTypeSelect?.addEventListener("change", () => {
        if (this.state.photoSignature.selectedFile) {
          this.validatePhotoSignature();
        }
      });

      // Capture button - start camera
      root.querySelector("[data-photo-action='capture']")?.addEventListener("click", () => {
        // Block in View/Supervise mode
        const lockModes = ["View", "Supervise"];
        if (lockModes.includes(this.state.pageFunction)) {
          this.showToast("Cannot capture images in View mode.", "warning");
          return;
        }
        // Require image type selection first
        const imageTypeSelect = root.querySelector("#imageType");
        if (!imageTypeSelect?.value) {
          this.showToast("Please select an image type first.", "warning");
          return;
        }
        this.startCamera();
      });

      // Snapshot button - take photo from camera
      root.querySelector("[data-photo-action='snapshot']")?.addEventListener("click", () => {
        this.takeSnapshot();
      });

      // Cancel snapshot - stop camera
      root.querySelector("[data-photo-action='cancel-snapshot']")?.addEventListener("click", () => {
        this.stopCamera();
      });

      // Upload button
      root.querySelector("[data-photo-action='upload']")?.addEventListener("click", () => {
        // Block in View/Supervise mode
        const lockModes = ["View", "Supervise"];
        if (lockModes.includes(this.state.pageFunction)) {
          this.showToast("Cannot upload images in View mode.", "warning");
          return;
        }
        this.uploadPhotoSignature();
      });

      // Clear button
      root.querySelector("[data-photo-action='clear']")?.addEventListener("click", () => {
        // Block in View/Supervise mode
        const lockModes = ["View", "Supervise"];
        if (lockModes.includes(this.state.pageFunction)) {
          return;
        }
        this.clearPhotoSignatureForm();
      });

      // Table actions
      const table = this.form.querySelector('[data-table="photo-signature"]');
      table?.addEventListener("click", (event) => {
        const row = event.target.closest("tr[data-index]");
        if (!row) return;
        const index = Number(row.dataset.index);

        // Handle action buttons
        if (event.target.closest("[data-action='view']")) {
          this.viewPhotoSignature(index);
          return;
        }
        if (event.target.closest("[data-action='download']")) {
          this.downloadPhotoSignature(index);
          return;
        }
        if (event.target.closest("[data-action='delete']")) {
          // Block delete in View/Supervise mode
          const lockModes = ["View", "Supervise"];
          if (lockModes.includes(this.state.pageFunction)) {
            this.showToast("Cannot delete images in View mode.", "warning");
            return;
          }
          this.deletePhotoSignature(index);
          return;
        }
        
        // If clicking on the row itself (not a button), display image in preview area
        if (!event.target.closest("button")) {
          this.displayPhotoSignatureInPreview(index);
        }
      });
    }

    async handlePhotoFileSelect(file) {
      if (!file) return;

      const FileService = window.FileService;

      // Validate file type using FileService
      if (FileService) {
        const validation = FileService.validateFileType(file, ["image/*"]);
        if (!validation.valid) {
          this.showToast(validation.message, "warning");
          return;
        }
      } else if (!file.type.startsWith("image/")) {
        this.showToast("Please select an image file.", "warning");
        return;
      }

      // Store selected file
      this.state.photoSignature.selectedFile = file;
      this.state.photoSignature.isValidated = false; // Reset validation flag

      // Show preview using FileService
      const root = this.form.querySelector("[data-photo-signature-form]");
      const previewImg = root?.querySelector("#photoPreview");
      const placeholder = root?.querySelector("[data-photo-placeholder]");
      const video = root?.querySelector("#photoCameraVideo");
      const uploadBtn = root?.querySelector("[data-photo-action='upload']");

      if (previewImg) {
        try {
          const dataUrl = FileService
            ? await FileService.fileToDataUrl(file)
            : await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target.result);
              reader.readAsDataURL(file);
            });

          previewImg.src = dataUrl;
          previewImg.style.display = "block";
          if (placeholder) placeholder.style.display = "none";
          if (video) video.style.display = "none";

          // Validate image immediately after preview
          await this.validatePhotoSignature();
        } catch (err) {
          console.error("[PhotoSignature] Error reading file:", err);
        }
      }

    }

    async startCamera() {
      const root = this.form.querySelector("[data-photo-signature-form]");
      const video = root?.querySelector("#photoCameraVideo");
      const previewImg = root?.querySelector("#photoPreview");
      const placeholder = root?.querySelector("[data-photo-placeholder]");
      const snapshotBtn = root?.querySelector("[data-photo-action='snapshot']");
      const cancelBtn = root?.querySelector("[data-photo-action='cancel-snapshot']");

      if (!video) return;

      // Check if MediaDevices API is available (requires HTTPS except on localhost)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const isSecure = window.location.protocol === 'https:';
        
        let errorMessage = "Camera access is not available. ";
        if (!isSecure && !isLocalhost) {
          errorMessage += "This application must be accessed via HTTPS to use the camera feature. Please contact your system administrator to enable HTTPS.";
        } else {
          errorMessage += "Your browser may not support camera access or it may be disabled.";
        }
        
        console.error("[PhotoSignature] MediaDevices API not available", {
          isLocalhost,
          isSecure,
          protocol: window.location.protocol,
          hostname: window.location.hostname
        });
        
        this.showToast(errorMessage, "danger");
        
        // Show helpful suggestion
        setTimeout(() => {
          this.showToast("You can still upload images using the 'Upload from File' button.", "info");
        }, 3000);
        
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }
        });

        this.state.photoSignature.cameraStream = stream;
        this.state.photoSignature.isCapturing = true;

        video.srcObject = stream;
        video.style.display = "block";
        if (previewImg) previewImg.style.display = "none";
        if (placeholder) placeholder.style.display = "none";

        // Enable snapshot buttons
        if (snapshotBtn) snapshotBtn.disabled = false;
        if (cancelBtn) cancelBtn.disabled = false;

      } catch (error) {
        console.error("[PhotoSignature] Camera access error:", error);
        
        let errorMessage = "Unable to access camera. ";
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorMessage += "Camera permission was denied. Please allow camera access in your browser settings.";
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          errorMessage += "No camera device found on this system.";
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          errorMessage += "Camera is already in use by another application.";
        } else {
          errorMessage += "Please check camera permissions and try again.";
        }
        
        this.showToast(errorMessage, "danger");
        
        // Suggest file upload as alternative
        setTimeout(() => {
          this.showToast("Tip: Use 'Upload from File' to upload existing photos.", "info");
        }, 2500);
      }
    }

    takeSnapshot() {
      const root = this.form.querySelector("[data-photo-signature-form]");
      const video = root?.querySelector("#photoCameraVideo");
      const canvas = root?.querySelector("#photoCameraCanvas");
      const previewImg = root?.querySelector("#photoPreview");

      if (!video || !canvas) return;

      // Draw video frame to canvas
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);

      // Convert to blob and create file
      canvas.toBlob(async (blob) => {
        if (blob) {
          const filename = `snapshot_${Date.now()}.png`;
          const file = new File([blob], filename, { type: "image/png" });
          this.state.photoSignature.selectedFile = file;
          this.state.photoSignature.isValidated = false; // Reset validation flag

          // Show preview
          previewImg.src = canvas.toDataURL("image/png");
          previewImg.style.display = "block";

          // Validate captured image immediately
          await this.validatePhotoSignature();
        }
      }, "image/png");

      // Stop camera after snapshot
      this.stopCamera();
    }

    stopCamera() {
      const root = this.form.querySelector("[data-photo-signature-form]");
      const video = root?.querySelector("#photoCameraVideo");
      const snapshotBtn = root?.querySelector("[data-photo-action='snapshot']");
      const cancelBtn = root?.querySelector("[data-photo-action='cancel-snapshot']");

      // Stop all tracks
      if (this.state.photoSignature.cameraStream) {
        this.state.photoSignature.cameraStream.getTracks().forEach(track => track.stop());
        this.state.photoSignature.cameraStream = null;
      }

      this.state.photoSignature.isCapturing = false;

      if (video) {
        video.srcObject = null;
        video.style.display = "none";
      }

      // Disable snapshot buttons
      if (snapshotBtn) snapshotBtn.disabled = true;
      if (cancelBtn) cancelBtn.disabled = true;

    }

    async validatePhotoSignature() {
      const root = this.form.querySelector("[data-photo-signature-form]");
      const imageTypeSelect = root?.querySelector("#imageType");
      const imageType = imageTypeSelect?.value;
      const uploadBtn = root?.querySelector("[data-photo-action='upload']");

      if (!imageType) {
        this.showToast("Please select an image type (Photo or Signature) first.", "warning");
        if (uploadBtn) uploadBtn.disabled = true;
        return;
      }

      if (!this.state.photoSignature.selectedFile) {
        if (uploadBtn) uploadBtn.disabled = true;
        return;
      }

      // ============================================================
      // VALIDATE IMAGE USING AI DETECTION SERVICE
      // ============================================================
      const ImageDetectionService = window.ImageDetectionService;
      if (!ImageDetectionService) {
        console.warn("[PhotoSignature] ImageDetectionService not loaded. Skipping validation.");
        this.state.photoSignature.isValidated = true;
        if (uploadBtn) uploadBtn.disabled = false;
        return;
      }

      // Show validation overlay with spinner
      this.showValidationSpinner();
      
      try {
        const validationResult = await ImageDetectionService.validateImage(
          this.state.photoSignature.selectedFile,
          imageType
        );

        console.log("[PhotoSignature] Validation result:", validationResult);

        if (!validationResult.success) {
          // Service error (network, etc.)
          this.hideValidationOverlay();
          this.showToast(validationResult.message || "Validation service unavailable. Upload disabled.", "warning");
          this.state.photoSignature.isValidated = false;
          if (uploadBtn) uploadBtn.disabled = true;
          return;
        }

        // Check validation result based on image type
        let successMessage = "";
        let isValid = false;
        
        if (imageType === "P") {
          // Photo should contain a face
          if (!validationResult.data?.has_face) {
            this.hideValidationOverlay();
            this.showToast("❌ No face detected. Please capture a clear photo showing a face. Upload disabled.", "danger");
            this.state.photoSignature.isValidated = false;
            if (uploadBtn) uploadBtn.disabled = true;
            return;
          }
          successMessage = `Face Detected (${validationResult.data.count} face${validationResult.data.count > 1 ? 's' : ''})`;
          isValid = true;
        } else if (imageType === "S") {
          // Signature should contain signature patterns
          if (!validationResult.data?.has_signature) {
            this.hideValidationOverlay();
            this.showToast("❌ No signature detected. Please capture a clear signature. Upload disabled.", "danger");
            this.state.photoSignature.isValidated = false;
            if (uploadBtn) uploadBtn.disabled = true;
            return;
          }
          successMessage = "Signature Detected";
          isValid = true;
        }

        if (isValid) {
          // Show success tick with message
          this.showValidationSuccess(successMessage);
          this.state.photoSignature.isValidated = true;
          if (uploadBtn) uploadBtn.disabled = false;
          
          // Hide overlay after 2 seconds
          setTimeout(() => {
            this.hideValidationOverlay();
          }, 2000);
        }

      } catch (error) {
        console.error("[PhotoSignature] Validation error:", error);
        this.hideValidationOverlay();
        this.showToast("Validation service unavailable. Upload disabled.", "warning");
        this.state.photoSignature.isValidated = false;
        if (uploadBtn) uploadBtn.disabled = true;
      }
    }

    showValidationSpinner() {
      const overlay = document.getElementById("validationOverlay");
      const spinner = document.getElementById("validationSpinner");
      const success = document.getElementById("validationSuccess");
      
      if (overlay && spinner) {
        success.style.display = "none";
        spinner.style.display = "block";
        overlay.style.display = "flex";
        overlay.style.animation = "fadeIn 0.3s ease-in";
      }
    }

    showValidationSuccess(message) {
      const spinner = document.getElementById("validationSpinner");
      const success = document.getElementById("validationSuccess");
      const messageEl = document.getElementById("validationSuccessMessage");
      
      if (spinner && success && messageEl) {
        spinner.style.display = "none";
        messageEl.textContent = message;
        success.style.display = "block";
      }
    }

    hideValidationOverlay() {
      const overlay = document.getElementById("validationOverlay");
      if (overlay) {
        overlay.style.display = "none";
      }
    }

    markStepAsCompleted(stepId) {
      if (!stepId) return;
      
      // Add to completed steps set
      this.state.completedSteps.add(stepId);
      
      // Find the step trigger button and add completed class
      const trigger = this.stepper?.triggers?.find((t) => t.dataset.stepId === stepId);
      if (trigger) {
        trigger.classList.add("is-completed");
      }
      
      console.log(`[Stepper] Step "${stepId}" marked as completed. Total completed: ${this.state.completedSteps.size}`);
    }

    markLoadedStepsAsCompleted() {
      // Only mark steps as completed in View mode when data exists
      if (this.state.pageFunction !== "View") return;

      const clientTypeId = (this.form.elements.ClientTypeID?.value || "").trim().toUpperCase();
      const isCorporate = clientTypeId === "B" || clientTypeId === "C";

      // Check and mark each step based on data presence
      
      // Personal step - for individual clients
      if (!isCorporate && this.form.querySelector("#FirstName")?.value) {
        this.markStepAsCompleted("personal");
      }

      // Corporate step - for corporate clients
      if (isCorporate && this.form.querySelector("#CompanyName")?.value) {
        this.markStepAsCompleted("corporate");
      }

      // Address step - if addresses exist
      if (this.collections.addresses?.length > 0) {
        this.markStepAsCompleted("address");
      }

      // Relations step - if relations exist
      if (this.collections.relations?.length > 0) {
        this.markStepAsCompleted("relations");
      }

      // Employment step - if employment data exists
      if (this.form.querySelector("#EmployerName")?.value || this.form.querySelector("#OccupationID")?.value) {
        this.markStepAsCompleted("employment");
      }

      // Special Offers step - if any offer data exists
      if (this.form.querySelector("#IntroducerID")?.value || this.form.querySelector("#CampaignID")?.value) {
        this.markStepAsCompleted("offers");
      }

      // KYC/Other Details step - if any KYC data exists
      if (this.form.querySelector('input[name="IsPEP"]:checked') || this.form.querySelector('input[name="IsUSPerson"]:checked')) {
        this.markStepAsCompleted("kyc");
      }

      // Products & Services step - check if any products or services are selected
      const hasProducts = this.form.querySelectorAll('[data-table="products"] input[type="checkbox"]:checked').length > 0;
      const hasServices = this.form.querySelectorAll('[data-table="services"] input[type="checkbox"]:checked').length > 0;
      if (hasProducts || hasServices) {
        this.markStepAsCompleted("products");
      }

      // Photo & Signature step - if any images exist
      if (this.collections.photoSignatures?.length > 0) {
        this.markStepAsCompleted("photo-signature");
      }

      // Documents step - if any documents exist
      if (this.collections.documents?.length > 0) {
        this.markStepAsCompleted("documents");
      }

      console.log("[Stepper] Marked loaded steps as completed in View mode");
    }

    async uploadPhotoSignature() {
      const root = this.form.querySelector("[data-photo-signature-form]");
      const imageTypeSelect = root?.querySelector("#imageType");
      const imageType = imageTypeSelect?.value;

      if (!imageType) {
        this.showToast("Please select an image type (Photo or Signature).", "warning");
        return;
      }

      if (!this.state.photoSignature.selectedFile) {
        this.showToast("Please select or capture an image first.", "warning");
        return;
      }

      // Check if image was validated
      if (!this.state.photoSignature.isValidated) {
        this.showToast("Image has not been validated. Please select/capture a valid image.", "danger");
        return;
      }

      // ============================================================
      // PROCEED WITH UPLOAD (validation already passed)
      // ============================================================
      const TempImageService = window.TempImageService;
      if (!TempImageService) {
        this.showToast("Image service not available.", "danger");
        return;
      }

      const clientId = this.form.elements.ClientID?.value?.trim() || "";
      const file = this.state.photoSignature.selectedFile;
      const createdBy = window.Environment?.UserID || window.Environment?.UserId || "";
      const requestId = this.getOrCreateStepperRequestId();

      // For existing clients: pass ClientID, no TempClientID
      // For pipeline clients (no ClientID): pass TempClientID = RequestID
      const isExistingClient = !!clientId;
      const tempClientId = isExistingClient ? "" : requestId;

      try {
        this.showToast("Uploading image...", "info");

        const result = await TempImageService.uploadTempImage({
          RequestID: requestId,
          ImageTypeID: imageType,
          File: file,
          Description: file.name,
          ClientID: clientId,
          TempClientID: tempClientId,
          ModuleID: "1000",
          OurBranchID: window.Environment?.OurBranchID || "",
          CreatedBy: createdBy
        });

        if (result.success) {

          // Add to collection with correct field mapping
          this.collections.photoSignatures.push({
            tempImageId: result.data.TempImageID || result.data.tempImageID,
            imageTypeId: result.data.ImageTypeID || imageType,
            description: result.data.Description || file.name,
            createdOn: result.data.CreatedOn || result.data.createdOn,
            imageTypeDescription: result.data.ImageTypeDescription,
            moduleID: result.data.ModuleID,
            clientID: result.data.ClientID,
            ...result.data
          });

          this.renderPhotoSignatureTable();
          this.clearPhotoSignatureForm();
          this.showToast("Image uploaded successfully!", "success");
        } else {
          console.error("[PhotoSignature] Upload failed:", result.message);
          this.showToast(result.message || "Failed to upload image.", "danger");
        }
      } catch (error) {
        console.error("[PhotoSignature] Upload error:", error);
        this.showToast("Error uploading image: " + error.message, "danger");
      }
    }

    /**
     * Initialize ImageType dropdown from system codes
     */
    async initPhotoSignatureLookups() {
      const LookupService = window.LookupService;
      if (!LookupService?.getSystemCodeOptions) {
        console.warn("[PhotoSignature] LookupService not available for ImageType lookup");
        return;
      }

      const imageTypeSelect = this.form.querySelector("#imageType");
      if (!imageTypeSelect) return;

      try {
        const options = await LookupService.getSystemCodeOptions("ImageTypeID");

        // Clear existing options except the first placeholder
        imageTypeSelect.innerHTML = '<option value="">--Select--</option>';

        // Add options from system codes
        if (Array.isArray(options) && options.length > 0) {
          options.forEach(opt => {
            const option = document.createElement("option");
            option.value = opt.value;
            option.textContent = opt.label;
            imageTypeSelect.appendChild(option);
          });
        } else {
          // Fallback to hardcoded if no system codes found
          console.warn("[PhotoSignature] No ImageTypeID codes found, using fallback");
          imageTypeSelect.innerHTML = `
            <option value="">--Select--</option>
            <option value="P">Photo</option>
            <option value="S">Signature</option>
          `;
        }
      } catch (error) {
        console.error("[PhotoSignature] Failed to load ImageType options:", error);
        // Keep fallback options
      }
    }

    /**
     * Save all staged photo/signatures when stepping away
     * This uploads any pending images that haven't been uploaded yet
     */
    async savePhotoSignatures() {
      const TempImageService = window.TempImageService;
      if (!TempImageService) {
        console.warn("[PhotoSignature] TempImageService not available");
        return { success: true, code: "00", message: "No service", data: null };
      }

      // Check if there's a pending file that hasn't been uploaded
      if (this.state.photoSignature.selectedFile) {
        const root = this.form.querySelector("[data-photo-signature-form]");
        const imageTypeSelect = root?.querySelector("#imageType");
        const imageType = imageTypeSelect?.value;

        if (!imageType) {
          this.showToast("Please select an image type before proceeding.", "warning");
          return { success: false, code: "VALIDATION", message: "Image type required", data: null };
        }

        // Auto-upload the pending file
        const clientId = this.form.elements.ClientID?.value?.trim() || "";
        const file = this.state.photoSignature.selectedFile;

        try {
          this.showToast("Uploading pending image...", "info");

          const result = await TempImageService.uploadTempImage({
            ImageTypeID: imageType,
            File: file,
            Description: file.name,
            ClientID: clientId,
            TempClientID: clientId || "",
            ModuleID: "1000",
            OurBranchID: window.Environment?.OurBranchID || ""
          });

          if (result.success) {

            // Add to collection
            this.collections.photoSignatures.push({
              tempImageId: result.data.tempImageID,
              imageTypeId: imageType,
              description: result.data.description || file.name,
              createdOn: result.data.createdOn,
              ...result.data
            });

            this.renderPhotoSignatureTable();
            this.clearPhotoSignatureForm();
            this.showToast("Image uploaded successfully!", "success");

            return { success: true, code: "00", message: "Photo/Signature saved", data: result.data };
          } else {
            console.error("[PhotoSignature] Auto-upload failed:", result.message);
            this.showToast(result.message || "Failed to upload image.", "danger");
            return { success: false, code: result.code || "ERROR", message: result.message, data: null };
          }
        } catch (error) {
          console.error("[PhotoSignature] Auto-upload error:", error);
          this.showToast("Error uploading image: " + error.message, "danger");
          return { success: false, code: "EXCEPTION", message: error.message, data: null };
        }
      }

      // No pending file, check if we have any staged images
      if (this.collections.photoSignatures.length > 0) {
        return { success: true, code: "00", message: "Photo/Signatures already uploaded", data: this.collections.photoSignatures };
      }

      // Nothing to save
      return { success: true, code: "00", message: "No images to save", data: null };
    }

    clearPhotoSignatureForm() {
      const root = this.form.querySelector("[data-photo-signature-form]");
      if (!root) return;

      // Clear file input
      const fileInput = root.querySelector("#photoFileInput");
      if (fileInput) fileInput.value = "";

      // Reset image type
      const imageTypeSelect = root.querySelector("#imageType");
      if (imageTypeSelect) imageTypeSelect.value = "";

      // Hide preview, show placeholder
      const previewImg = root.querySelector("#photoPreview");
      const placeholder = root.querySelector("[data-photo-placeholder]");
      if (previewImg) {
        previewImg.src = "";
        previewImg.style.display = "none";
      }
      if (placeholder) placeholder.style.display = "block";

      // Stop camera if running
      this.stopCamera();

      // Clear state
      this.state.photoSignature.selectedFile = null;
      this.state.photoSignature.tempImageId = null;
    }

    renderPhotoSignatureTable() {
      const tbody = this.form.querySelector('[data-photo-signature-body]');
      if (!tbody) return;

      if (this.collections.photoSignatures.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-3">No images uploaded yet.</td></tr>`;
        return;
      }

      tbody.innerHTML = this.collections.photoSignatures.map((item, index) => {
        // Handle both possible field name variations
        const imageTypeId = item.ImageTypeID || item.imageTypeId || "";
        const typeLabel = item.ImageTypeDescription || item.imageTypeDescription || 
                         (imageTypeId === "P" ? "Photo" : imageTypeId === "S" ? "Signature" : imageTypeId);
        
        const description = item.Description || item.description || "-";
        const createdOn = item.CreatedOn || item.createdOn;
        const createdDate = createdOn ? new Date(createdOn).toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : "-";

        return `
          <tr data-index="${index}">
            <td>${typeLabel}</td>
            <td>${description}</td>
            <td>${createdDate}</td>
            <td class="text-end text-nowrap">
              <div class="btn-group btn-group-sm">
                <button type="button" class="btn btn-primary" data-action="view" title="View">
                  <i class="bi bi-eye"></i>
                </button>
                <button type="button" class="btn btn-success" data-action="download" title="Download">
                  <i class="bi bi-download"></i>
                </button>
                <button type="button" class="btn btn-danger" data-action="delete" title="Delete">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join("");
    }

    async viewPhotoSignature(index) {
      const item = this.collections.photoSignatures[index];
      const tempImageId = item?.TempImageID || item?.tempImageId;
      if (!tempImageId) {
        this.showToast("Image ID not found", "warning");
        return;
      }

      const TempImageService = window.TempImageService;
      const FileService = window.FileService;
      if (!TempImageService) {
        this.showToast("Image service not available", "danger");
        return;
      }

      try {
        this.showToast("Loading image...", "info");
        const result = await TempImageService.getTempImage(tempImageId);
        
        console.log("[PhotoSignature] getTempImage result:", result);
        
        if (result.success && result.data) {
          // Handle both possible field names for base64 data
          let imageData = result.data.Image || result.data.image || result.data.sImage;
          
          console.log("[PhotoSignature] imageData length:", imageData?.length);
          console.log("[PhotoSignature] imageData preview:", imageData?.substring(0, 100));
          
          if (imageData) {
            // Remove any data URL prefix if present
            if (imageData.startsWith("data:")) {
              imageData = imageData.split(",")[1];
            }
            
            const mimeType = result.data.MimeType || result.data.mimeType || "image/png";
            console.log("[PhotoSignature] Using mimeType:", mimeType);
            
            // Create proper data URL
            const dataUrl = `data:${mimeType};base64,${imageData}`;
            
            // Open in new window
            const win = window.open("", "_blank");
            if (win) {
              win.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                  <title>${item.Description || item.description || 'Image'}</title>
                  <style>
                    body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f0f0f0; }
                    img { max-width: 100%; max-height: 100vh; object-fit: contain; }
                  </style>
                </head>
                <body>
                  <img src="${dataUrl}" alt="Image" />
                </body>
                </html>
              `);
              win.document.close();
            } else {
              this.showToast("Popup blocked. Please allow popups.", "warning");
            }
          } else {
            console.error("[PhotoSignature] No image data in response");
            this.showToast("No image data found", "warning");
          }
        } else {
          console.error("[PhotoSignature] Failed result:", result);
          this.showToast(result.message || "Unable to load image", "warning");
        }
      } catch (error) {
        console.error("[PhotoSignature] View error:", error);
        this.showToast("Error viewing image", "danger");
      }
    }

    async downloadPhotoSignature(index) {
      const item = this.collections.photoSignatures[index];
      const tempImageId = item?.TempImageID || item?.tempImageId;
      if (!tempImageId) {
        this.showToast("Image ID not found", "warning");
        return;
      }

      const TempImageService = window.TempImageService;
      const FileService = window.FileService;
      if (!TempImageService) {
        this.showToast("Image service not available", "danger");
        return;
      }

      try {
        this.showToast("Downloading image...", "info");
        const blob = await TempImageService.downloadTempImage(tempImageId);
        const filename = item.Description || item.description || `image_${tempImageId}`;

        // Use FileService if available
        if (FileService) {
          FileService.downloadBlob(blob, filename);
        } else {
          // Fallback download
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
        
        this.showToast("Download started", "success");
      } catch (error) {
        console.error("[PhotoSignature] Download error:", error);
        this.showToast("Error downloading image", "danger");
      }
    }

    async displayPhotoSignatureInPreview(index) {
      const item = this.collections.photoSignatures[index];
      const tempImageId = item?.TempImageID || item?.tempImageId;
      if (!tempImageId) return;

      const TempImageService = window.TempImageService;
      if (!TempImageService) return;

      const previewImg = this.form.querySelector("#photoPreview");
      const placeholder = this.form.querySelector("[data-photo-placeholder]");
      if (!previewImg) return;

      try {
        // Show loading state
        if (placeholder) placeholder.style.display = "none";
        previewImg.style.display = "block";
        previewImg.src = "";
        previewImg.alt = "Loading...";

        const result = await TempImageService.getTempImage(tempImageId);
        
        if (result.success && result.data) {
          let imageData = result.data.Image || result.data.image || result.data.sImage;
          
          if (imageData) {
            // Remove any data URL prefix if present
            if (imageData.startsWith("data:")) {
              imageData = imageData.split(",")[1];
            }
            
            const mimeType = result.data.MimeType || result.data.mimeType || "image/png";
            const dataUrl = `data:${mimeType};base64,${imageData}`;
            
            previewImg.src = dataUrl;
            previewImg.alt = item.Description || item.description || "Image";
            this.showToast("Image loaded in preview", "success");
          } else {
            // Show placeholder if no data
            previewImg.style.display = "none";
            if (placeholder) placeholder.style.display = "block";
            this.showToast("No image data found", "warning");
          }
        } else {
          // Show placeholder on error
          previewImg.style.display = "none";
          if (placeholder) placeholder.style.display = "block";
          this.showToast(result.message || "Unable to load image", "warning");
        }
      } catch (error) {
        console.error("[PhotoSignature] Display preview error:", error);
        previewImg.style.display = "none";
        if (placeholder) placeholder.style.display = "block";
        this.showToast("Error loading image", "danger");
      }
    }

    async deletePhotoSignature(index) {
      const item = this.collections.photoSignatures[index];
      if (!item?.tempImageId) return;

      if (!confirm("Are you sure you want to delete this image?")) return;

      const TempImageService = window.TempImageService;
      if (!TempImageService) return;

      try {
        const result = await TempImageService.deleteTempImage(item.tempImageId);
        if (result.success) {
          this.collections.photoSignatures.splice(index, 1);
          this.renderPhotoSignatureTable();
          this.showToast("Image deleted successfully.", "success");
        } else {
          this.showToast(result.message || "Failed to delete image.", "danger");
        }
      } catch (error) {
        console.error("[PhotoSignature] Delete error:", error);
        this.showToast("Error deleting image.", "danger");
      }
    }

    async loadClientPhotoSignatures(clientId) {
      if (!clientId) return;

      const TempImageService = window.TempImageService;
      if (!TempImageService) return;

      try {
        const result = await TempImageService.getClientImages(clientId);
        if (result.success && Array.isArray(result.data)) {
          this.collections.photoSignatures = result.data.map(item => ({
            tempImageId: item.tempImageID || item.tempImageId,
            imageTypeId: item.imageTypeID || item.imageTypeId,
            description: item.description,
            createdOn: item.createdOn,
            ...item
          }));
          this.renderPhotoSignatureTable();
        }
      } catch (error) {
        console.error("[PhotoSignature] Load error:", error);
      }
    }

    // ========================================================================
    // END PHOTO AND SIGNATURE METHODS
    // ========================================================================

    openLookupForDocumentReceiver(prefill = "") {
      if (!this.lookupModal?.isReady?.()) {
        this.showToast("Client lookup is not available.", "danger");
        return;
      }

      const previousHandler = this.lookupModal.onSelect;
      this.lookupModal.onSelect = (record) => {
        const root = this.form.querySelector("[data-documents-form]");
        const receiverId = record?.ClientID ? String(record.ClientID).trim() : "";
        if (root && receiverId) {
          const receiverField = root.querySelector('[data-document-field="ReceivedBy"]');
          if (receiverField) receiverField.value = receiverId;
        }
        this.lookupModal.onSelect = previousHandler;
      };

      this.lookupModal.open(prefill);
    }

    setSelectedDocumentIndex(index) {
      if (Number.isNaN(index)) return;
      this.state.selectedDocumentIndex = index;
      const tbody = this.form.querySelector('[data-table="documents"] tbody');
      if (!tbody) return;
      Array.from(tbody.querySelectorAll("tr[data-index]")).forEach((tr) => {
        tr.classList.toggle("is-selected", tr.dataset.index === String(index));
      });
    }

    setDocumentsFormEnabled(enabled) {
      this.state.formEnabled.documents = enabled;
      const root = this.form.querySelector("[data-documents-form]");
      if (!root) return;
      root.querySelectorAll("[data-document-field]").forEach((field) => {
        field.disabled = !enabled;
      });
      // Also handle lookup buttons
      root.querySelector("[data-document-action='lookup-document']")?.toggleAttribute('disabled', !enabled);
      root.querySelector("[data-document-action='lookup-receiver']")?.toggleAttribute('disabled', !enabled);
    }

    patchDocumentsFormFromSelection() {
      const index = this.state.selectedDocumentIndex;
      if (index === null || index === undefined || index < 0) return;
      const entry = this.collections.documents[index];
      if (!entry) return;

      const root = this.form.querySelector("[data-documents-form]");
      if (!root) return;

      const setField = (fieldName, value) => {
        const el = root.querySelector(`[data-document-field="${fieldName}"]`);
        if (el) el.value = value ?? "";
      };

      setField("DocumentID", entry.DocumentID);
      setField("DocumentTypeID", entry.DocumentTypeID);
      setField("LocationID", entry.LocationID);
      setField("Remarks", entry.Remarks);
      setField("ReceivedBy", entry.ReceivedBy);
      setDateFieldValue(root.querySelector('[data-document-field="ReceivedDate"]'), entry.ReceivedDate);

      this.state.currentDocumentData = { ...entry };
      this.updateDocumentFileActionsVisibility();
    }

    resetDocumentsForm(resetAll = false) {
      const root = this.form.querySelector("[data-documents-form]");
      if (!root) return;
      root.querySelectorAll("[data-document-field]").forEach((field) => {
        if (field.type === "file") {
          field.value = "";
        } else {
          field.value = "";
        }
      });
      this.state.editing.documents = null;
      this.state.currentDocumentData = null;
      this.updateDocumentFileActionsVisibility();
    }

    alterSelectedDocument() {
      const index = this.state.selectedDocumentIndex;
      if (index === null || index === undefined || index < 0) {
        this.showToast("Select a document row to alter.", "warning");
        return;
      }
      const entry = this.collections.documents[index];
      if (!entry) return;

      // Patch form from selection
      this.patchDocumentsFormFromSelection();

      // Enable form for editing and set editing index
      this.state.editing.documents = index;
      this.setDocumentsFormEnabled(true);
    }

    removeSelectedDocument() {
      const index = this.state.selectedDocumentIndex;
      if (index === null || index === undefined || index < 0) {
        this.showToast("Select a document row to remove.", "warning");
        return;
      }
      const entry = this.collections.documents[index];
      if (!entry) return;

      if (this.state.pageFunction === "Update" && (entry.ID ?? entry.DocumentRecordID)) {
        entry.__deleted = true;
      } else {
        this.collections.documents.splice(index, 1);
      }

      this.state.selectedDocumentIndex = null;
      this.state.editing.documents = null;
      this.resetDocumentsForm(false);
      this.renderDocumentsTable();
    }

    async handleDocumentFileUpload(files) {
      const file = files?.[0];
      if (!file) return;
      try {
        const mimeType = resolveMimeType(file);
        const base64 = await this.readFileAsBase64(file);
        this.state.currentDocumentData = {
          ...(this.state.currentDocumentData || {}),
          sImage: base64,
          MimeType: mimeType,
          fileName: file.name,
          CreatedOn: this.state.currentDocumentData?.CreatedOn || new Date().toISOString(),
          CreatedBy: this.state.currentDocumentData?.CreatedBy || this.session?.name || "System"
        };
        this.updateDocumentFileActionsVisibility();
      } catch (error) {
        console.error(error);
        this.showToast("Unable to read the selected document.", "danger");
      }
    }

    saveDocumentFromForm() {
      // Form must be enabled (user clicked New or Alter)
      if (!this.state.formEnabled.documents) {
        this.showToast("Click 'New' to add or select a row and click 'Alter' to edit.", "warning");
        return;
      }

      const root = this.form.querySelector("[data-documents-form]");
      if (!root) return;

      const previous = this.state.editing.documents !== null ? this.collections.documents[this.state.editing.documents] : null;

      // Get all field values
      const docIdSelect = root.querySelector('[data-document-field="DocumentID"]');
      const docTypeSelect = root.querySelector('[data-document-field="DocumentTypeID"]');
      const locationSelect = root.querySelector('[data-document-field="LocationID"]');
      const receivedByInput = root.querySelector('[data-document-field="ReceivedBy"]');
      const receivedDateInput = root.querySelector('[data-document-field="ReceivedDate"]');

      const documentId = docIdSelect?.value || "";
      const documentTypeId = docTypeSelect?.value || "";
      const locationId = locationSelect?.value || "";
      const receivedBy = receivedByInput?.value?.trim() || "";
      const receivedDate = receivedDateInput?.value || "";

      // Check if we have file data (either new upload or existing)
      const hasFileData = !!(this.state.currentDocumentData?.sImage || previous?.sImage);

      // Validate all mandatory fields
      const errors = [];
      if (!documentId) errors.push("Document ID");
      if (!documentTypeId) errors.push("Document Type");
      if (!locationId) errors.push("Location");
      if (!hasFileData) errors.push("Document Image");
      if (!receivedBy) errors.push("Received By");
      if (!receivedDate) errors.push("Received Date");

      if (errors.length > 0) {
        this.showToast(`Please fill in required fields: ${errors.join(", ")}`, "danger");
        return;
      }

      // Get labels for display
      const docIdLabel = docIdSelect?.selectedOptions?.[0]?.textContent?.trim() || "";
      const docTypeLabel = docTypeSelect?.selectedOptions?.[0]?.textContent?.trim() || "";
      const locationLabel = locationSelect?.selectedOptions?.[0]?.textContent?.trim() || "";

      const entry = {
        ID: previous?.ID ?? previous?.DocumentRecordID ?? null,
        DocumentRecordID: previous?.DocumentRecordID ?? previous?.ID ?? null,
        DocumentID: documentId,
        DocumentIDLabel: docIdLabel,
        DocumentTypeID: documentTypeId,
        DocumentTypeLabel: docTypeLabel,
        LocationID: locationId,
        LocationLabel: locationLabel,
        Remarks: root.querySelector('[data-document-field="Remarks"]').value.trim(),
        ReceivedBy: receivedBy,
        ReceivedDate: receivedDate,
        UpdateCount: previous?.UpdateCount ?? null,
        // File data
        sImage: this.state.currentDocumentData?.sImage || previous?.sImage || "",
        MimeType: this.state.currentDocumentData?.MimeType || previous?.MimeType || "",
        fileName: this.state.currentDocumentData?.fileName || previous?.fileName || "",
        CreatedOn: previous?.CreatedOn || new Date().toISOString(),
        CreatedBy: previous?.CreatedBy || this.session?.name || "System"
      };

      if (this.state.editing.documents !== null) {
        this.collections.documents[this.state.editing.documents] = entry;
      } else {
        this.collections.documents.push(entry);
      }

      this.resetDocumentsForm(true);
      this.setDocumentsFormEnabled(false);
      this.renderDocumentsTable();
    }

    renderDocumentsTable() {
      const tbody = this.form.querySelector('[data-table="documents"] tbody');
      if (!tbody) return;

      const rows = this.collections.documents || [];
      const visibleRows = rows.filter(r => !r.__deleted);

      if (visibleRows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-3">No documents uploaded yet.</td></tr>`;
        return;
      }

      tbody.innerHTML = visibleRows.map((entry, displayIndex) => {
        const actualIndex = rows.indexOf(entry);
        
        // Handle both API response fields and local collection fields
        const documentLabel = entry.DocumentDescription || entry.DocumentIDLabel || entry.DocumentID || "-";
        const typeLabel = entry.DocumentTypeDescription || entry.DocumentTypeLabel || entry.DocumentTypeID || "-";
        const locationLabel = entry.LocationDescription || entry.LocationLabel || entry.LocationID || "-";
        const receivedBy = entry.ReceivedBy || "-";
        
        // Format date nicely
        const receivedDate = entry.ReceivedDate;
        const formattedDate = receivedDate ? new Date(receivedDate).toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }) : "-";
        
        // Check if file is available (ImageID, FilePath, or sImage)
        const hasFile = !!(entry.ImageID || entry.imageID || entry.FilePath || entry.filePath || entry.sImage);
        const isSelected = this.state.selectedDocumentIndex === actualIndex;

        return `
          <tr data-index="${actualIndex}" class="${isSelected ? 'is-selected' : ''}" style="cursor: pointer;">
            <td>${documentLabel}</td>
            <td>${typeLabel}</td>
            <td>${locationLabel}</td>
            <td>${receivedBy}</td>
            <td>${formattedDate}</td>
            <td class="text-end text-nowrap">
              <div class="btn-group btn-group-sm">
                <button type="button" class="btn btn-primary" data-action="preview" title="Preview" ${hasFile ? '' : 'disabled'}>
                  <i class="bi bi-eye"></i>
                </button>
                <button type="button" class="btn btn-success" data-action="download" title="Download" ${hasFile ? '' : 'disabled'}>
                  <i class="bi bi-download"></i>
                </button>
                <button type="button" class="btn btn-danger" data-action="delete" title="Delete">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join("");

      if (!visibleRows.length) {
        const empty = document.createElement("tr");
        empty.innerHTML = `<td colspan="7" class="text-center text-muted">No records to display.</td>`;
        tbody.appendChild(empty);
      }
    }

    // Preview/Download for current document being edited
    previewCurrentDocument() {
      const doc = this.state.currentDocumentData;
      if (!doc?.sImage && !doc?.filePath) {
        // Check if we're editing an existing document
        if (this.state.editing.documents !== null) {
          const existing = this.collections.documents[this.state.editing.documents];
          if (existing?.sImage || existing?.filePath) {
            this.previewDocument(existing);
            return;
          }
        }
        this.showToast("No document to preview.", "warning");
        return;
      }
      this.previewDocument(doc);
    }

    downloadCurrentDocument() {
      const doc = this.state.currentDocumentData;
      if (!doc?.sImage && !doc?.filePath) {
        // Check if we're editing an existing document
        if (this.state.editing.documents !== null) {
          const existing = this.collections.documents[this.state.editing.documents];
          if (existing?.sImage || existing?.filePath) {
            this.downloadDocument(existing);
            return;
          }
        }
        this.showToast("No document to download.", "warning");
        return;
      }
      this.downloadDocument(doc);
    }

    // Preview/Download by table row index
    previewDocumentAtIndex(index) {
      const doc = this.collections.documents[index];
      const hasFile = !!(doc?.ImageID || doc?.imageID || doc?.FilePath || doc?.filePath || doc?.sImage);
      if (!hasFile) {
        this.showToast("No document file available to preview.", "warning");
        return;
      }
      this.previewDocument(doc);
    }

    downloadDocumentAtIndex(index) {
      const doc = this.collections.documents[index];
      const hasFile = !!(doc?.ImageID || doc?.imageID || doc?.FilePath || doc?.filePath || doc?.sImage);
      if (!hasFile) {
        this.showToast("No document file available to download.", "warning");
        return;
      }
      this.downloadDocument(doc);
    }

    // Update file action buttons visibility
    updateDocumentFileActionsVisibility() {
      const root = this.form.querySelector("[data-documents-form]");
      if (!root) return;
      const actionsContainer = root.querySelector("[data-document-file-actions]");
      if (!actionsContainer) return;

      const hasFile = !!(this.state.currentDocumentData?.sImage ||
        this.state.currentDocumentData?.filePath ||
        (this.state.editing.documents !== null && (this.collections.documents[this.state.editing.documents]?.sImage || this.collections.documents[this.state.editing.documents]?.filePath)));

      actionsContainer.style.display = hasFile ? "flex" : "none";
    }

    clearDocumentsTable() {
      const tbody = this.form.querySelector('[data-table="documents"] tbody');
      if (tbody) tbody.innerHTML = "";
      this.collections.documents = [];
      this.state.selectedDocumentIndex = null;
      this.state.editing.documents = null;
      this.resetDocumentsForm(true);
    }

    bootstrapAddresses(addresses = null) {
      // If addresses data is provided, load it into the collection
      if (addresses && Array.isArray(addresses) && addresses.length) {
        this.collections.addresses = addresses.map((addr, idx) => ({
          ...addr,
          __rowId: `addr_${Date.now()}_${idx}`
        }));
        this.state.selectedAddressIndex = null;
        this.state.editing.addresses = null;
      } else if (!this.collections.addresses || this.collections.addresses.length === 0) {
        // Only clear if no data was passed AND collection is empty
        // This prevents clearing data that was previously loaded
        this.collections.addresses = [];
        this.state.selectedAddressIndex = null;
        this.state.editing.addresses = null;
      } else {
      }

      this.renderAddressTable();
      this.resetAddressForm();
    }

    // Legacy method kept for compatibility - now reads from collections
    getAddresses() {
      return this.collections.addresses.filter(a => !a.__deleted).map((addr) => ({
        AddressTypeID: addr.AddressTypeID || "M",
        Address1: addr.Address1 || "",
        Address2: addr.Address2 || "",
        ZipCode: addr.ZipCode || "",
        CityID: addr.CityID || "",
        CountryID: addr.CountryID || "",
        Region: addr.Region || "",
        SubCityZone: addr.SubCityZone || "",
        Wereda: addr.Wereda || "",
        Kebele: addr.Kebele || "",
        HouseNumber: addr.HouseNumber || "",
        Language: addr.Language || "",
        PhoneWork: addr.PhoneWork || "",
        PhoneHome: addr.PhoneHome || "",
        Mobile: addr.Mobile || "",
        Email: addr.Email || "",
        FaxNo: addr.FaxNo || "",
        TINNumber: addr.TINNumber || "",
        LandMark: addr.LandMark || "",
        IsMailingAddress: addr.IsMailingAddress || false
      }));
    }

    saveKin() {
      const form = this.form.querySelector("[data-kin-form]");
      if (!form) return;
      const previous = this.state.editing.kin !== null ? this.collections.kin[this.state.editing.kin] : null;
      const entry = {
        ID: previous?.ID ?? null,
        RelatedClientID: form.querySelector('[data-kin-field="RelatedClientID"]').value.trim(),
        RelationID: form.querySelector('[data-kin-field="RelationID"]').value,
        RelationRefNo: readNumber(form.querySelector('[data-kin-field="RelationRefNo"]').value, 1),
        SharePercent: readNumber(form.querySelector('[data-kin-field="SharePercent"]').value, 0),
        Remarks: form.querySelector('[data-kin-field="Remarks"]').value.trim(),
        UpdateCount: previous?.UpdateCount ?? null
      };

      if (!entry.RelatedClientID || !entry.RelationID || !entry.Remarks) {
        this.showToast("Fill in all required next of kin fields.", "danger");
        return;
      }

      if (entry.SharePercent <= 0 || entry.SharePercent > 100) {
        this.showToast("Share percent must be between 1 and 100.", "danger");
        return;
      }

      if (this.state.editing.kin !== null) {
        this.collections.kin[this.state.editing.kin] = entry;
      } else {
        this.collections.kin.push(entry);
      }

      this.resetKinForm();
      this.renderKinTable();
    }

    editKin(index) {
      const data = this.collections.kin[index];
      if (!data) return;
      const form = this.form.querySelector("[data-kin-form]");
      if (!form) return;
      form.querySelector('[data-kin-field="RelatedClientID"]').value = data.RelatedClientID;
      form.querySelector('[data-kin-field="RelationID"]').value = data.RelationID;
      form.querySelector('[data-kin-field="RelationRefNo"]').value = data.RelationRefNo;
      form.querySelector('[data-kin-field="SharePercent"]').value = data.SharePercent;
      form.querySelector('[data-kin-field="Remarks"]').value = data.Remarks;
      this.state.editing.kin = index;
    }

    deleteKin(index) {
      this.collections.kin.splice(index, 1);
      this.renderKinTable();
    }

    resetKinForm() {
      const form = this.form.querySelector("[data-kin-form]");
      if (!form) return;
      form.reset();
      this.state.editing.kin = null;
      this.updateKinSummary();
    }

    renderKinTable() {
      const table = this.form.querySelector('[data-table="kin"] tbody');
      if (!table) return;
      table.innerHTML = "";
      this.collections.kin.forEach((entry, index) => {
        const row = document.createElement("tr");
        row.dataset.index = String(index);
        const relationLabel = this.resolveRelationLabel(entry.RelationID);
        row.innerHTML = `
        <td>${entry.RelatedClientID}</td>
        <td>${relationLabel}</td>
        <td>${entry.Remarks}</td>
        <td>${entry.SharePercent}%</td>
        <td class="text-end">
          <button type="button" class="btn btn-link" data-action="edit">Edit</button>
          <button type="button" class="btn btn-link text-danger" data-action="delete">Delete</button>
        </td>
      `;
        table.appendChild(row);
      });
      if (!this.collections.kin.length) {
        const empty = document.createElement("tr");
        empty.innerHTML = `<td colspan="5" class="text-center text-muted">No next of kin captured.</td>`;
        table.appendChild(empty);
      }
      this.updateKinSummary();
    }

    updateKinSummary() {
      const allocated = this.collections.kin.reduce((sum, entry) => sum + readNumber(entry.SharePercent), 0);
      const summaryRoot = this.form.querySelector("[data-kin-summary]");
      if (!summaryRoot) return;
      summaryRoot.querySelector('[data-kin-total="records"]').textContent = this.collections.kin.length;
      summaryRoot.querySelector('[data-kin-total="allocated"]').textContent = `${allocated.toFixed(2)}%`;
      summaryRoot.querySelector('[data-kin-total="remaining"]').textContent = `${(100 - allocated).toFixed(2)}%`;
    }

    saveEmployment() {
      const form = this.form.querySelector("[data-employment-form]");
      if (!form) return;
      const entry = {
        companyName: form.querySelector('[data-employment-field="companyName"]').value.trim(),
        workPosition: form.querySelector('[data-employment-field="workPosition"]').value.trim(),
        startDate: form.querySelector('[data-employment-field="startDate"]').value,
        endDate: form.querySelector('[data-employment-field="endDate"]').value
      };

      if (!entry.companyName || !entry.workPosition || !entry.startDate || !entry.endDate) {
        this.showToast("Employment history requires company, position, start, and end dates.", "danger");
        return;
      }

      const start = new Date(entry.startDate);
      const end = new Date(entry.endDate);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start > end) {
        this.showToast("Employment end date cannot be earlier than the start date.", "danger");
        return;
      }

      if (this.state.editing.employment !== null) {
        this.collections.employment[this.state.editing.employment] = entry;
      } else {
        this.collections.employment.push(entry);
      }

      this.resetEmploymentForm();
      this.renderEmploymentTable();
    }

    editEmployment(index) {
      const data = this.collections.employment[index];
      if (!data) return;
      const form = this.form.querySelector("[data-employment-form]");
      if (!form) return;
      form.querySelector('[data-employment-field="companyName"]').value = data.companyName;
      form.querySelector('[data-employment-field="workPosition"]').value = data.workPosition;
      form.querySelector('[data-employment-field="startDate"]').value = data.startDate;
      form.querySelector('[data-employment-field="endDate"]').value = data.endDate;
      this.state.editing.employment = index;
    }

    deleteEmployment(index) {
      this.collections.employment.splice(index, 1);
      this.renderEmploymentTable();
    }

    resetEmploymentForm() {
      const form = this.form.querySelector("[data-employment-form]");
      if (!form) return;
      form.reset();
      this.state.editing.employment = null;
    }

    renderEmploymentTable() {
      const table = this.form.querySelector('[data-table="employment"] tbody');
      if (!table) return;
      table.innerHTML = "";
      this.collections.employment.forEach((entry, index) => {
        const row = document.createElement("tr");
        row.dataset.index = String(index);
        row.innerHTML = `
        <td>${index + 1}</td>
        <td>${entry.companyName}</td>
        <td>${entry.workPosition}</td>
        <td>${entry.startDate || "-"}</td>
        <td>${entry.endDate || "-"}</td>
        <td class="text-end">
          <button type="button" class="btn btn-link" data-action="edit">Edit</button>
          <button type="button" class="btn btn-link text-danger" data-action="delete">Delete</button>
        </td>
      `;
        table.appendChild(row);
      });
      if (!this.collections.employment.length) {
        const empty = document.createElement("tr");
        empty.innerHTML = `<td colspan="6" class="text-center text-muted">No employment history captured.</td>`;
        table.appendChild(empty);
      }
    }

    saveDirector() {
      const root = this.form.querySelector("[data-collection='directors']");
      if (!root) return;
      const entry = {
        clientName: root.querySelector('[data-director-field="clientName"]').value.trim(),
        relation: root.querySelector('[data-director-field="relation"]').value.trim(),
        share: readNumber(root.querySelector('[data-director-field="share"]').value, 0)
      };

      if (!entry.clientName || !entry.relation) {
        this.showToast("Director name and relation are required.", "danger");
        return;
      }

      if (entry.share < 0 || entry.share > 100) {
        this.showToast("Director share must be between 0 and 100.", "danger");
        return;
      }

      if (this.willExceedDirectorShare(entry.share, this.state.editing.directors)) {
        this.showToast("Director share allocation cannot exceed 100%.", "danger");
        return;
      }

      if (this.state.editing.directors !== null) {
        this.collections.directors[this.state.editing.directors] = entry;
      } else {
        this.collections.directors.push(entry);
      }

      this.resetDirectorForm();
      this.renderDirectorsTable();
    }

    editDirector(index) {
      const data = this.collections.directors[index];
      if (!data) return;
      const root = this.form.querySelector("[data-collection='directors']");
      if (!root) return;
      root.querySelector('[data-director-field="clientName"]').value = data.clientName;
      root.querySelector('[data-director-field="relation"]').value = data.relation;
      root.querySelector('[data-director-field="share"]').value = data.share;
      this.state.editing.directors = index;
    }

    deleteDirector(index) {
      this.collections.directors.splice(index, 1);
      this.renderDirectorsTable();
    }

    resetDirectorForm() {
      const root = this.form.querySelector("[data-collection='directors']");
      if (!root) return;
      root.querySelectorAll("[data-director-field]").forEach((field) => (field.value = ""));
      this.state.editing.directors = null;
    }

    renderDirectorsTable() {
      const table = this.form.querySelector('[data-table="directors"] tbody');
      if (!table) return;
      table.innerHTML = "";
      this.collections.directors.forEach((entry, index) => {
        const row = document.createElement("tr");
        row.dataset.index = String(index);
        row.innerHTML = `
        <td>${index + 1}</td>
        <td>${entry.clientName}</td>
        <td>${entry.relation}</td>
        <td>${entry.share}%</td>
        <td class="text-end">
          <button type="button" class="btn btn-link" data-action="edit">Edit</button>
          <button type="button" class="btn btn-link text-danger" data-action="delete">Delete</button>
        </td>
      `;
        table.appendChild(row);
      });
      if (!this.collections.directors.length) {
        const empty = document.createElement("tr");
        empty.innerHTML = `<td colspan="5" class="text-center text-muted">No directors captured.</td>`;
        table.appendChild(empty);
      }
    }

    totalDirectorShare(excludeIndex = null) {
      return this.collections.directors.reduce((sum, entry, index) => {
        if (excludeIndex !== null && index === excludeIndex) {
          return sum;
        }
        return sum + readNumber(entry.share);
      }, 0);
    }

    willExceedDirectorShare(nextShare, editingIndex = null) {
      return this.totalDirectorShare(editingIndex) + readNumber(nextShare) > 100;
    }

    readFileAsBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result?.toString() || "";
          const base64 = result.split(",")[1] || result;
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    async previewDocument(doc) {
      const ClientDocSvc = global.ClientDocumentService;
      const imageId = doc.ImageID || doc.imageID;
      const filePath = doc.FilePath || doc.filePath;
      
      console.log("[Documents] Preview document:", { imageId, filePath, doc });

      // Priority 1: Use ImageID if available
      if (imageId && ClientDocSvc?.getImageDownloadUrl) {
        try {
          const fileUrl = ClientDocSvc.getImageDownloadUrl(imageId);
          console.log("[Documents] Opening image URL:", fileUrl);
          
          // For images, create a proper viewer window
          const win = window.open("", "_blank");
          if (win) {
            const docName = doc.DocumentDescription || doc.Description || doc.fileName || "Document";
            win.document.write(`
              <!DOCTYPE html>
              <html>
              <head>
                <title>${docName}</title>
                <style>
                  body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f0f0f0; }
                  img, iframe { max-width: 100%; max-height: 100vh; object-fit: contain; border: none; }
                </style>
              </head>
              <body>
                <img src="${fileUrl}" alt="${docName}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
                <iframe src="${fileUrl}" style="width:100%;height:100vh;display:none;"></iframe>
              </body>
              </html>
            `);
            win.document.close();
          } else {
            this.showToast("Popup blocked. Please allow popups.", "warning");
          }
          return;
        } catch (error) {
          console.error("[Documents] Error opening ImageID:", error);
        }
      }

      // Priority 2: Use FilePath if available
      if (filePath && ClientDocSvc?.getDocumentFileUrl) {
        try {
          const fileUrl = ClientDocSvc.getDocumentFileUrl(filePath);
          console.log("[Documents] Opening file path URL:", fileUrl);
          window.open(fileUrl, "_blank");
          return;
        } catch (error) {
          console.error("[Documents] Error opening FilePath:", error);
        }
      }

      // Priority 3: Use base64 data if available
      if (doc.sImage) {
        const mimeType = doc.MimeType || "application/pdf";
        const win = window.open("", "_blank");
        if (win) {
          const docName = doc.DocumentDescription || doc.Description || doc.fileName || "Document";
          win.document.title = docName;
          win.document.write(`<iframe src="data:${mimeType};base64,${doc.sImage}" style="width:100%;height:100%" frameborder="0"></iframe>`);
          win.document.close();
        }
        return;
      }

      console.error("[Documents] No preview method available:", doc);
      this.showToast("No document data available to preview.", "warning");
    }

    async downloadDocument(doc) {
      const ClientDocSvc = global.ClientDocumentService;
      const imageId = doc.ImageID || doc.imageID;
      const filePath = doc.FilePath || doc.filePath;
      const fileName = doc.DocumentDescription || doc.Description || doc.fileName || `document-${Date.now()}`;
      
      console.log("[Documents] Download document:", { imageId, filePath, fileName });
      this.showToast("Downloading document...", "info");

      // Priority 1: Use ImageID if available
      if (imageId && ClientDocSvc?.getImageDownloadUrl) {
        try {
          const fileUrl = ClientDocSvc.getImageDownloadUrl(imageId);
          console.log("[Documents] Downloading from ImageID:", fileUrl);
          
          const link = document.createElement("a");
          link.href = fileUrl;
          link.download = fileName;
          link.target = "_blank";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          this.showToast("Download started", "success");
          return;
        } catch (error) {
          console.error("[Documents] Error downloading ImageID:", error);
        }
      }

      // Priority 2: Use FilePath if available
      if (filePath && ClientDocSvc?.getDocumentFileUrl) {
        try {
          const fileUrl = ClientDocSvc.getDocumentFileUrl(filePath);
          console.log("[Documents] Downloading from FilePath:", fileUrl);
          
          const link = document.createElement("a");
          link.href = fileUrl;
          link.download = fileName;
          link.target = "_blank";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          this.showToast("Download started", "success");
          return;
        } catch (error) {
          console.error("[Documents] Error downloading FilePath:", error);
        }
      }

      // Priority 3: Use base64 data if available
      if (doc.sImage) {
        const mimeType = doc.MimeType || "application/pdf";
        const link = document.createElement("a");
        link.href = `data:${mimeType};base64,${doc.sImage}`;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showToast("Download started", "success");
        return;
      }

      console.error("[Documents] No download method available:", doc);
      this.showToast("No document data available to download.", "warning");
    }

    handleClientLookup() {
      const clientIdField = this.form.elements.ClientID;
      if (!clientIdField) {
        this.showToast("Client ID field is missing on the form.", "danger");
        return;
      }
      const clientId = clientIdField.value.trim();
      if (!clientId) {
        this.showToast("Provide a Client ID before searching.", "danger");
        return;
      }
      if (!this.clientService) {
        this.showToast("ClientService not available.", "danger");
        return;
      }
      this.loadClient(clientId);
    }

    async loadClient(clientId) {
      try {
        // Use page loader instead of toast for loading state
        const overlay = document.getElementById("pageLoadingOverlay");
        if (overlay) {
          overlay.hidden = false;
          const text = document.getElementById("pageLoadingText");
          if (text) text.textContent = `Loading ${clientId}...`;
        }

        // Clear previous messages
        this.hideInlineMessage();

        const loaded = await this.loadClientViaSteppers(clientId);

        if (overlay) overlay.hidden = true;

        if (!loaded) {
          // Client not found
          this.state.clientDataLoaded = false;
          this.state.loadedClientId = "";
          this.syncActionButtons();
          throw new Error("Client not found or failed to load. Please check the Client ID.");
        }

        // Client loaded successfully
        this.state.clientDataLoaded = true;
        this.state.clientTypeSelected = true; // Client type is known from loaded data
        this.state.loadedClientId = clientId;
        this.syncActionButtons();
        this.showInlineMessage(`Client ${clientId} loaded successfully.`, "success");
        
        // Track recent activity
        this.trackRecentActivity(clientId, false);
      } catch (error) {
        console.error(error);
        const overlay = document.getElementById("pageLoadingOverlay");
        if (overlay) overlay.hidden = true;

        this.state.clientDataLoaded = false;
        this.state.loadedClientId = "";
        this.syncActionButtons();
        this.showToast(error.message || "Unable to load client", "danger");
      }
    }

    showInlineMessage(message, type = "success") {
      const section = this.form.querySelector('[data-section="client-search"] .section-content');
      if (!section) return;

      let summary = section.querySelector(".validation-summary");
      if (!summary) {
        summary = document.createElement("div");
        summary.setAttribute("role", "status");
        summary.setAttribute("aria-live", "polite");
        section.insertBefore(summary, section.firstChild);
      }

      // Reset style and visibility
      summary.className = "validation-summary is-visible";

      let iconClass = "bi-info-circle";
      if (type === "success") {
        summary.classList.add("validation-summary--success");
        iconClass = "bi-check-circle";
      } else if (type === "error" || type === "danger") {
        // Assuming validation-summary--error exists or default is sufficient, 
        // usually maincss handles success specifically. 
        // Let's use generic style if no error class, but typically --error might exist?
        // Checked maincss: .validation-summary--success exists. Didn't see --error in grep.
        // But for success case match account-maintenance is priority.
      }

      summary.innerHTML = `
        <i class="bi ${iconClass} validation-summary__icon"></i>
        <span class="validation-summary__text">${message}</span>
        <button type="button" class="validation-summary__close" aria-label="Close notification">
          <i class="bi bi-x"></i>
        </button>
      `;

      summary.querySelector(".validation-summary__close").addEventListener("click", () => {
        this.hideInlineMessage();
      });
    }

    hideInlineMessage() {
      const summary = this.form.querySelector('[data-section="client-search"] .section-content .validation-summary');
      if (summary) {
        summary.classList.remove("is-visible");
        // Optional: remove from DOM after transition or immediately
        setTimeout(() => summary.remove(), 200);
      }
    }

    validateActiveStepPanel() {
      const activePanel = this.stepper?.activePanel || this.form.querySelector(".cm-stepper__panel.is-active");
      if (!activePanel) return true;

      const stepName = activePanel.dataset?.stepPanel;
      const errors = [];

      // Step-specific business rule validations
      switch (stepName) {
        case 'personal':
          this.validatePersonalStep(activePanel, errors);
          break;
        case 'corporate':
          this.validateCorporateStep(activePanel, errors);
          break;
        case 'address':
          this.validateAddressStep(activePanel, errors);
          break;
        case 'relations':
          this.validateRelationsStep(activePanel, errors);
          break;
        case 'employment':
          this.validateEmploymentStep(activePanel, errors);
          break;
        case 'kyc':
          this.validateOtherDetailsStep(activePanel, errors);
          break;
        case 'documents':
          this.validateDocumentsStep(activePanel, errors);
          break;
        case 'photo-signature':
          // If photos are already staged in the table, form fields don't need to be validated
          const hasPhotos = this.collections?.photoSignatures?.length > 0;
          const hasSelectedFile = !!this.state.photoSignature?.selectedFile;
          if (hasPhotos || !hasSelectedFile) {
            return true;
          }
          break;
      }

      // If business rule errors found, show first error and return false
      if (errors.length > 0) {
        this.showToast(errors[0], 'warning');
        return false;
      }

      // Check if this is the documents step - if documents are staged, skip form validation
      if (stepName === "documents") {
        const hasDocuments = this.collections?.documents?.length > 0;
        if (hasDocuments) {
          return true;
        }
      }

      // Only validate visible/enabled fields for HTML5 validation
      const fields = Array.from(activePanel.querySelectorAll("input, select, textarea"))
        .filter((field) => !field.disabled)
        .filter((field) => field.offsetParent !== null);

      for (const field of fields) {
        if (typeof field.checkValidity !== "function") continue;
        if (!field.checkValidity()) {
          this.ensureCollapsibleVisibleFor?.(field);
          field.focus?.();
          field.reportValidity?.();
          return false;
        }
      }
      return true;
    }

    /**
     * Validate Personal stepper panel
     */
    validatePersonalStep(panel, errors) {
      const clientTypeId = (this.form.elements.ClientTypeID?.value || "").trim().toUpperCase();
      const isMinor = clientTypeId === "M";

      // 1. Age check - clients should be over 18 unless Minor type
      const dobField = panel.querySelector('#dob');
      if (dobField?.value) {
        const age = calculateAge(dobField.value);
        if (age !== null && age < 18 && !isMinor) {
          errors.push("Client must be at least 18 years old (except for Minor client type).");
        }
      }

      // 2. House Members, Children, Dependents - max 65000, no negative
      const houseMembersField = panel.querySelector('#houseMembers');
      const childrenField = panel.querySelector('#children');
      const dependentsField = panel.querySelector('#dependents');

      [
        { field: houseMembersField, name: 'No. Of House Members' },
        { field: childrenField, name: 'No. Of Children' },
        { field: dependentsField, name: 'No. Of Dependents' }
      ].forEach(({ field, name }) => {
        if (field?.value) {
          const val = parseInt(field.value, 10);
          if (isNaN(val) || val < 0 || val > 65000) {
            errors.push(`${name} must be a number between 0 and 65,000.`);
          }
        }
      });

      // 3. Issue Date should be before Expiry Date
      const issueDate = panel.querySelector('#issueDate');
      const expiryDate = panel.querySelector('#expiryDate');
      if (issueDate?.value && expiryDate?.value) {
        if (!isDateBefore(issueDate.value, expiryDate.value)) {
          errors.push("Issue Date must be before Expiry Date.");
        }
      }
      // Issue Date should not be a future date
      if (issueDate?.value && !isNotFutureDate(issueDate.value)) {
        errors.push("Issue Date cannot be a future date.");
      }
      // Expiry Date should not be a past date
      if (expiryDate?.value && !isNotPastDate(expiryDate.value)) {
        errors.push("Expiry Date cannot be a past date.");
      }

      // 4. First Name, Middle Name, Last Name, Mother Name - alphabetic only
      const nameFields = [
        { id: 'firstName', name: 'First Name' },
        { id: 'middleName', name: 'Middle Name' },
        { id: 'lastName', name: 'Last Name' },
        { id: 'motherName', name: 'Mother Name' }
      ];
      nameFields.forEach(({ id, name }) => {
        const field = panel.querySelector(`#${id}`);
        if (field?.value && !isAlphabetic(field.value)) {
          errors.push(`${name} should only contain letters.`);
        }
      });

      // 5. Identification No - alphanumeric
      const idNumberField = panel.querySelector('#idNumber');
      if (idNumberField?.value && !isAlphanumeric(idNumberField.value)) {
        errors.push("Identification No should be alphanumeric.");
      }
    }

    /**
     * Validate Corporate stepper panel
     */
    validateCorporateStep(panel, errors) {
      // Reg. Date cannot be a future date
      const regDate = panel.querySelector('#corpRegistrationDate');
      if (regDate?.value && !isNotFutureDate(regDate.value)) {
        errors.push("Registration Date cannot be a future date.");
      }

      // Reg. No. - Alphanumeric
      const regNo = panel.querySelector('#corpRegistrationNumber');
      if (regNo?.value && !isAlphanumeric(regNo.value)) {
        errors.push("Registration No. should be alphanumeric.");
      }

      // TIN Number - Alpha numeric
      const tinNumber = panel.querySelector('#corpTinNumber');
      if (tinNumber?.value && !isAlphanumeric(tinNumber.value)) {
        errors.push("TIN Number should be alphanumeric.");
      }

      // Year Started - valid year (not random numbers)
      const yearStarted = panel.querySelector('#corpYearStarted');
      if (yearStarted?.value && !isValidYear(yearStarted.value)) {
        errors.push("Year Started must be a valid year (e.g., 1990-2030).");
      }

      // No. Employees - numeric (handled by input type="number", but let's validate)
      const numEmployees = panel.querySelector('#corpEmployees');
      if (numEmployees?.value) {
        const val = parseInt(numEmployees.value, 10);
        if (isNaN(val) || val < 0) {
          errors.push("No. Employees must be a positive number.");
        }
      }

      // ID Issue Date - cannot be a future date
      const corpIssueDate = panel.querySelector('#corpIssueDate');
      if (corpIssueDate?.value && !isNotFutureDate(corpIssueDate.value)) {
        errors.push("ID Issue Date cannot be a future date.");
      }

      // ID Expiry Date - cannot be a past date
      const corpExpiryDate = panel.querySelector('#corpExpiryDate');
      if (corpExpiryDate?.value && !isNotPastDate(corpExpiryDate.value)) {
        errors.push("ID Expiry Date cannot be a past date.");
      }

      // ID Issue Date should be before ID Expiry Date
      if (corpIssueDate?.value && corpExpiryDate?.value) {
        if (!isDateBefore(corpIssueDate.value, corpExpiryDate.value)) {
          errors.push("ID Issue Date must be before ID Expiry Date.");
        }
      }

      // VAT Reg. No - alphanumeric
      const vatRegNo = panel.querySelector('#corpVatRegNo');
      if (vatRegNo?.value && !isAlphanumeric(vatRegNo.value)) {
        errors.push("VAT Reg. No should be alphanumeric.");
      }

      // VAT Reg. Date - must be a past date
      const vatRegDate = panel.querySelector('#corpVatRegDate');
      if (vatRegDate?.value && !isNotFutureDate(vatRegDate.value)) {
        errors.push("VAT Reg. Date must be a past date.");
      }

      // Website - valid URL format
      const website = panel.querySelector('#corpWebsite');
      if (website?.value && !isValidWebsite(website.value)) {
        errors.push("⚠️ WEBSITE VALIDATION FAILED: Please enter a valid website URL (e.g., https://example.com or www.example.com)");
      }
    }

    /**
     * Validate Address stepper panel
     */
    validateAddressStep(panel, errors) {
      // Address 1, Address 2 - alphanumeric
      const address1 = panel.querySelector('#address1');
      const address2 = panel.querySelector('#address2');
      if (address1?.value && !isAlphanumeric(address1.value)) {
        errors.push("Address 1 should be alphanumeric.");
      }
      if (address2?.value && !isAlphanumeric(address2.value)) {
        errors.push("Address 2 should be alphanumeric.");
      }

      // Phone (Work), Phone (Home), Mobile - max 15 digits
      const phoneFields = [
        { id: 'addressPhoneWork', name: 'Phone (Work)' },
        { id: 'addressPhoneHome', name: 'Phone (Home)' },
        { id: 'addressMobile', name: 'Mobile' }
      ];
      phoneFields.forEach(({ id, name }) => {
        const field = panel.querySelector(`#${id}`);
        if (field?.value && !isValidPhone(field.value, 15)) {
          errors.push(`${name} should be numeric and max 15 digits.`);
        }
      });

      // Email - valid format
      const email = panel.querySelector('#addressEmail');
      if (email?.value && !isValidEmail(email.value)) {
        errors.push("⚠️ EMAIL VALIDATION FAILED: Please enter a valid email address (e.g., user@example.com)");
      }
    }

    /**
     * Validate Client Relations stepper panel
     */
    validateRelationsStep(panel, errors) {
      // 1. Check if relation shares add up to exactly 100%
      const totalShare = this.collections?.relations?.reduce((sum, r) => {
        const share = parseFloat(r.sharePercent || r.SharePercent || r.share || r.Share || 0);
        return sum + (isNaN(share) ? 0 : share);
      }, 0) || 0;
      
      // Only validate share total if there are relations entered
      if (this.collections?.relations?.length > 0) {
        if (Math.abs(totalShare - 100) > 0.01) {
          errors.push(`⚠️ SHARES VALIDATION FAILED: Total shares must equal exactly 100%. Current total is ${totalShare.toFixed(2)}%. Please adjust the share percentages in the relations table before proceeding.`);
        }
      }

      // 2. Check for duplicate relations (same client with same relation)
      if (this.collections?.relations?.length > 1) {
        const seen = new Set();
        for (const rel of this.collections.relations) {
          // Check both RelatedClientID and RelationID for duplicates
          const clientId = rel.relatedClientId || rel.RelatedClientID || '';
          const relationId = rel.relationId || rel.RelationID || rel.relation || rel.Relation || '';
          const key = `${clientId}-${relationId}`.toLowerCase();
          if (clientId && relationId && seen.has(key)) {
            errors.push("⚠️ DUPLICATE RELATION DETECTED: The same client cannot be added multiple times with the same relation type. Please remove the duplicate entry from the relations table before proceeding.");
            break;
          }
          if (clientId && relationId) {
            seen.add(key);
          }
        }
      }

      // 3. Mobile number validation (15 digits max)
      const mobileField = panel.querySelector('#relationMobile');
      if (mobileField?.value && !isValidPhone(mobileField.value, 15)) {
        errors.push("Relation Mobile should be numeric and max 15 digits.");
      }
    }

    /**
     * Validate Employment stepper panel
     */
    validateEmploymentStep(panel, errors) {
      // Income/expense fields should be valid numbers
      // The accounting format and right-alignment is applied during init
      // Here we just validate they are valid numbers
      const numericFields = [
        'MonthlyIncome', 'AverageAnnualIncome', 'OtherIncome', 'TotalIncome',
        'RentExpenses', 'OtherExpenses', 'TotalExpenses', 'NetSavings'
      ];
      numericFields.forEach(id => {
        const field = panel.querySelector(`#${id}`);
        if (field?.value) {
          const cleaned = field.value.replace(/,/g, '');
          if (isNaN(parseFloat(cleaned))) {
            errors.push(`${id.replace(/([A-Z])/g, ' $1').trim()} must be a valid number.`);
          }
        }
      });
      
      // Working Since - cannot be a future date
      const workingSince = panel.querySelector('#WorkingSince');
      if (workingSince?.value && !isNotFutureDate(workingSince.value)) {
        errors.push("Working Since date cannot be a future date.");
      }
    }

    /**
     * Validate Other Details (KYC) stepper panel
     */
    validateOtherDetailsStep(panel, errors) {
      // NBE Import AccountID, NBE Export AccountID - numeric values only
      const nbeImport = panel.querySelector('#nbeImportAccount');
      const nbeExport = panel.querySelector('#nbeExportAccount');

      if (nbeImport?.value && !isNumericOnly(nbeImport.value)) {
        errors.push("NBE Import Account ID must be numeric.");
      }
      if (nbeExport?.value && !isNumericOnly(nbeExport.value)) {
        errors.push("NBE Export Account ID must be numeric.");
      }
    }

    /**
     * Validate Documents stepper panel
     */
    validateDocumentsStep(panel, errors) {
      // Received Date cannot be a future date
      const receivedDate = panel.querySelector('#documentReceivedDate');
      if (receivedDate?.value && !isNotFutureDate(receivedDate.value)) {
        errors.push("Received Date cannot be a future date.");
      }
    }

    async saveActiveStepDraft() {
      const activeStep = this.stepper?.activeStep || this.stepper?.activePanel?.dataset?.stepPanel;
      return this.saveStepDraft(activeStep);
    }

    async saveStepDraft(activeStep) {
      const svc = this.clientService;
      if (!svc) {
        return { success: true, code: "00", message: "No service", data: null };
      }

      const lockModes = ["View", "Supervise"];
      if (lockModes.includes(this.state.pageFunction)) {
        return { success: true, code: "00", message: "Read-only mode", data: null };
        return { success: true, code: "00", message: "Read-only mode", data: null };
      }

      const requestId = this.getOrCreateStepperRequestId();

      const ensureClientId = () => {
        // For pipeline applications (continuing a workflow), use the RequestID as the ClientID
        // because temp tables are keyed by RequestID. The real ClientID will be generated on final save.
        if (this.state.isPipelineApplication) {
          return requestId;
        }

        // For NEW applications (Add mode), we do NOT have a ClientID yet.
        // The real ClientID will be generated on final save/approval.
        // Send empty string - the backend uses RequestID from the payload for temp table keying.
        if (this.state.pageFunction === "Add") {
          return "";
        }

        // For Update mode (editing existing finalized client)
        const field = this.form.elements.ClientID;
        const current = field?.value?.trim() || this.state.requestCode || "";
        if (current) {
          if (field && field.value !== current) field.value = current;
          this.state.requestCode = current;
          return current;
        }
        // This shouldn't happen in Update mode - client should already have an ID
        console.warn("[ensureClientId] Update mode but no ClientID found");
        return requestId;
      };

      const clientId = ensureClientId();
      const isUpdate = this.state.pageFunction === "Update";

      // Determine if this is a corporate client
      const clientTypeId = (this.form.elements.ClientTypeID?.value || "").trim().toUpperCase();
      const isCorporate = clientTypeId === "B" || clientTypeId === "C";

      // Helper to determine if a step should use UPDATE (vs CREATE) for pipeline applications
      // For pipeline apps, we check if the step already has data loaded from temp tables
      const shouldUseUpdateForStep = (stepKey) => {
        if (isUpdate) return true; // Normal update mode
        if (this.state.isPipelineApplication && this.state.existingStepData[stepKey]) {
          return true;
        }
        return false;
      };

      const userCode = this.session?.operatorId || this.session?.operatorID || this.session?.name || "web_portal";
      const nowIso = () => new Date().toISOString();

      const maybeSyncClientIdFromResponse = (response) => {
        // Don't sync ClientID for pipeline applications - they don't have a real ClientID yet
        if (this.state.isPipelineApplication) {
          return;
        }

        const inner = extractOldApiInnerDetails(response);
        if (!inner) return;
        const picked = Array.isArray(inner) ? inner[0] : inner;
        const upstreamId = picked?.ClientID;
        if (upstreamId && String(upstreamId).trim()) {
          this.form.elements.ClientID.value = String(upstreamId).trim();
          this.state.requestCode = String(upstreamId).trim();
        }
      };

      const saveBasicDetails = async () => {
        const useUpdate = shouldUseUpdateForStep('basicDetails');
        const openedBy = this.form.elements.OpenedBy?.value || userCode;
        const openedDate = this.form.elements.OpenedDate?.value || "";
        const createdBy = this.form.elements.CreatedBy?.value || userCode;
        const createdOn = this.form.elements.CreatedOn?.value || nowIso();
        const envBranchId = window.Environment?.OurBranchID || window.Environment?.ourBranchId || "";
        const ourBranchId =
          this.form.elements.OurBranchID?.value || this.session?.branchID || this.session?.branchId || this.session?.BranchID || envBranchId || "0101";

        const data = useUpdate
          ? {
            RequestID: requestId,
            ClientID: clientId,
            ClientTypeID: this.form.elements.ClientTypeID?.value || "",
            Name: this.nameField?.value || "",
            TitleID: this.form.elements.TitleID?.value || "",
            OpenedBy: openedBy,
            OpenedDate: openedDate,
            ClientStatusID: this.form.elements.ClientStatusID?.value || "",
            CreatedBy: createdBy,
            CreatedOn: createdOn,
            ModifiedBy: this.form.elements.ModifiedBy?.value || userCode,
            ModifiedOn: this.form.elements.ModifiedOn?.value || nowIso(),
            ApprovedBy: this.form.elements.ApprovedBy?.value || "",
            ApprovedOn: this.form.elements.ApprovedOn?.value || "",
            UpdateCount: this.form.elements.UpdateCount?.value || "0",
            WorkFlowID: this.form.elements.WorkFlowID?.value || "",
            WFStageID: this.form.elements.WFStageID?.value || "",
            PhotoID: this.form.elements.PhotoID?.value || "",
            SignID: this.form.elements.SignID?.value || "",
            LanguageID: this.form.elements.LanguageID?.value || "",
            RecommendedBy: this.form.elements.RecommendedBy?.value || "",
            KnowFrom: this.form.elements.KnowFrom?.value || "",
            RelationshipManagerID: (isCorporate ? this.form.querySelector('#corpRelationshipManager')?.value : this.form.querySelector('#relationshipManager')?.value) || "",
            IdentificationTypeID: this.form.querySelector('#idType')?.value || "",
            AMLStatusID: this.form.elements.AMLStatusID?.value || ""
          }
          : {
            RequestID: requestId,
            OurBranchID: ourBranchId,
            ClientID: clientId,
            ClientTypeID: this.form.elements.ClientTypeID?.value || "",
            Name: this.nameField?.value || "",
            ApplicationID: this.form.elements.ApplicationID?.value || clientId,
            OpenedBy: openedBy,
            OpenedDate: openedDate,
            CreatedBy: createdBy,
            CreatedOn: createdOn,
            UpdateCount: this.form.elements.UpdateCount?.value || 0
          };

        const resp = useUpdate && svc.updateClientBasicDetails ? await svc.updateClientBasicDetails(data) : await svc.createClientBasicDetails(data);
        // After first save, mark this step as having existing data
        if (!useUpdate) this.state.existingStepData.basicDetails = true;
        maybeSyncClientIdFromResponse(resp);
        return resp;
      };

      const saveIndividual = async () => {
        const useUpdate = shouldUseUpdateForStep('individual');
        const dob = this.form.elements.DateOfBirth?.value || "";
        const isSalaried = (() => {
          const selected = this.form.querySelector("input[type='radio'][name='IsSalaried']:checked")?.value;
          return coerceBool(selected);
        })();

        // Debug logging for IdentificationTypeID
        const idTypeSelect = this.form.querySelector('#idType');
        const data = useUpdate
          ? {
            RequestID: requestId,
            ClientID: clientId,
            BankID: "",
            Name: this.nameField?.value || "",
            ClientTypeID: this.form.elements.ClientTypeID?.value || "",
            TitleID: this.form.elements.TitleID?.value || "",
            FirstName: this.form.elements.FirstName?.value || "",
            LastName: this.form.elements.LastName?.value || "",
            MiddleName: this.form.elements.MiddleName?.value || "",
            GenderID: this.form.elements.GenderID?.value || "",
            NationalityID: this.form.elements.NationalityID?.value || "",
            IsDOBGiven: dob ? "1" : "0",
            DateOfBirth: dob,
            Age: String(readNumber((this.form.elements.Age?.value || "").toString().replace(/\D+/g, ""), 0)),
            AgeAsOn: "",
            BloodGroupID: "",
            CanDonateBlood: boolToInt(this.form.elements.CanDonateBlood?.checked),
            ResidentID: this.form.elements.ResidentID?.value || "",
            LiteracyLevelID: this.form.elements.LiteracyLevel?.value || "",
            PassportNo: this.form.elements.NationalId?.value || "",
            PassportIssuedCityID: "",
            PassportExpiryDate: this.form.elements.IDExpiryDate?.value || "",
            MaritalStatusID: this.form.elements.MaritalStatus?.value || "",
            MotherName: this.form.elements.MotherName?.value || "",
            SpouseID: "",
            NextOfKinID: "",
            NumberOfHouseMembers: String(readNumber(this.form.elements.NumberOfHouseMembers?.value, 0)),
            NumberOfChildren: String(readNumber(this.form.elements.NumberOfChildren?.value, 0)),
            NumberOfDependents: String(readNumber(this.form.elements.NumberOfDependents?.value, 0)),
            IsSalaried: isSalaried ? "1" : "0",
            OccupationID: this.form.querySelector('#Occupation')?.value || "",
            DesignationID: this.form.querySelector('#Designation')?.value || "",
            CompanyTypeID: this.form.querySelector('#CompanyType')?.value || "",
            EmployerName: this.form.querySelector('#EmploymentCompanyName')?.value || "",
            EmployerCode: this.form.querySelector('#EmploymentCompanyCode')?.value || "",
            WorkingSince: this.form.elements.WorkingSince?.value || "",
            Salary: String(readNumber(this.form.elements.MonthlyIncome?.value, 0)),
            FamilyIncome: String(readNumber(this.form.elements.FamilyIncome?.value, 0)),
            OtherIncome: String(readNumber(this.form.elements.OtherIncome?.value, 0)),
            RentExpense: String(readNumber(this.form.elements.RentExpenses?.value, 0)),
            OtherExpenses: String(readNumber(this.form.elements.OtherExpenses?.value, 0)),
            WorkPermitNo: this.form.elements.WorkPermitNo?.value || "",
            IdentificationTypeID: this.form.querySelector('#idType')?.value || "",
            AddressTypeID: "",
            Address1: "",
            Address2: "",
            CityID: "",
            CountryID: "",
            Zipcode: "",
            Phone1: "",
            Phone2: "",
            Mobile: "",
            Fax: "",
            Email: "",
            CanSendGreetings: "",
            CanSendOurSpecialOffers: "",
            CanSendAssociateSpecialOffer: "",
            eStatementRequired: "",
            MobileAlertRequired: "",
            NoOfEmployee: "",
            BusinessLineID: this.form.elements.BusinessLine?.value || "",
            BusinessOwnershipID: this.form.elements.BusinessOwnership?.value || "",
            BusinessStartedYear: "",
            OpenedBy: this.form.elements.OpenedBy?.value || userCode,
            OpenedDate: this.form.elements.OpenedDate?.value || "",
            ClientStatusID: "",
            Comments: "",
            CreatedBy: this.form.elements.CreatedBy?.value || userCode,
            CreatedOn: this.form.elements.CreatedOn?.value || nowIso(),
            SupervisedBy: this.form.elements.SupervisedBy?.value || "",
            SupervisedOn: this.form.elements.SupervisedOn?.value || "",
            ID1: "",
            ID2: "",
            TotalLimit: "",
            IsExpired: "",
            UpdateCount: this.form.elements.UpdateCount?.value || "0",
            ClientClassID: "",
            BaseID: "",
            RelationshipManagerID: (isCorporate ? this.form.querySelector('#corpRelationshipManager')?.value : this.form.querySelector('#relationshipManager')?.value) || "",
            Region: "",
            Street: "",
            KRAPin: "",
            NextOfKinName: "",
            NextOfKinRelationship: "",
            NextOfKinMobile: "",
            NextOfKinEmail: "",
            ParentClientID: "",
            CountryIssued: "",
            Email2: "",
            PhysicalAddress: "",
            NationalId: this.form.elements.NationalId?.value || ""
          }
          : {
            RequestID: requestId,
            ClientID: clientId,
            ClientTypeID: this.form.elements.ClientTypeID?.value || "",
            TitleID: this.form.elements.TitleID?.value || "",
            FirstName: this.form.elements.FirstName?.value || "",
            LastName: this.form.elements.LastName?.value || "",
            MiddleName: this.form.elements.MiddleName?.value || "",
            GenderID: this.form.elements.GenderID?.value || "",
            NationalityID: this.form.elements.NationalityID?.value || "",
            IsDOBGiven: dob ? "1" : "0",
            DateOfBirth: dob,
            Age: String(readNumber((this.form.elements.Age?.value || "").toString().replace(/\D+/g, ""), 0)),
            AgeAsOn: "",
            BloodGroupID: "",
            CanDonateBlood: boolToInt(this.form.elements.CanDonateBlood?.checked),
            ResidentID: this.form.elements.ResidentID?.value || "",
            LiteracyLevelID: this.form.elements.LiteracyLevel?.value || "",
            PassportNo: this.form.elements.NationalId?.value || "",
            PassportIssuedCityID: "",
            PassportExpiryDate: this.form.elements.IDExpiryDate?.value || "",
            MaritalStatusID: this.form.elements.MaritalStatus?.value || "",
            MotherName: this.form.elements.MotherName?.value || "",
            SpouseID: "",
            NextOfKinID: "",
            NumberOfHouseMembers: String(readNumber(this.form.elements.NumberOfHouseMembers?.value, 0)),
            NumberOfChildren: String(readNumber(this.form.elements.NumberOfChildren?.value, 0)),
            NumberOfDependents: String(readNumber(this.form.elements.NumberOfDependents?.value, 0)),
            IsSalaried: isSalaried ? "1" : "0",
            OccupationID: this.form.querySelector('#Occupation')?.value || "",
            DesignationID: this.form.querySelector('#Designation')?.value || "",
            CompanyTypeID: this.form.querySelector('#CompanyType')?.value || "",
            EmployerName: this.form.querySelector('#EmploymentCompanyName')?.value || "",
            EmployerCode: this.form.querySelector('#EmploymentCompanyCode')?.value || "",
            WorkingSince: this.form.elements.WorkingSince?.value || "",
            Salary: String(readNumber(this.form.elements.MonthlyIncome?.value, 0)),
            FamilyIncome: String(readNumber(this.form.elements.FamilyIncome?.value, 0)),
            OtherIncome: String(readNumber(this.form.elements.OtherIncome?.value, 0)),
            RentExpense: String(readNumber(this.form.elements.RentExpenses?.value, 0)),
            OtherExpenses: String(readNumber(this.form.elements.OtherExpenses?.value, 0)),
            WorkPermitNo: this.form.elements.WorkPermitNo?.value || "",
            IdentificationTypeID: this.form.querySelector('#idType')?.value || "",
            NationalId: this.form.elements.NationalId?.value || ""
          };
        const resp = useUpdate && svc.updateClientIndividual ? await svc.updateClientIndividual(data) : await svc.createClientIndividual(data);
        // After first save, mark this step as having existing data
        if (!useUpdate) this.state.existingStepData.individual = true;
        maybeSyncClientIdFromResponse(resp);
        return resp;
      };

      const saveCorporate = async () => {
        const useUpdate = shouldUseUpdateForStep('corporate');
        const envBranchId = window.Environment?.OurBranchID || window.Environment?.ourBranchId || "";
        const ourBranchId =
          this.form.elements.OurBranchID?.value || this.session?.branchID || this.session?.branchId || this.session?.BranchID || envBranchId || "0101";

        // Use getElementById directly to avoid issues with duplicate field names across steppers
        const getVal = (id) => document.getElementById(id)?.value || "";

        // Get the selected text from Line Of Business dropdown for buisnesslinedescription
        const businessLineSelect = document.getElementById("corpLineOfBusiness");
        const businessLineDescription = businessLineSelect?.selectedOptions?.[0]?.text || "";

        const base = {
          RequestID: requestId,
          OurBranchID: ourBranchId,
          ClientTypeID: this.form.elements.ClientTypeID?.value || "",
          CompanyName: getVal("corpCompanyName"),
          RegistrationDate: getVal("corpRegistrationDate"),
          RegistrationNumber: getVal("corpRegistrationNumber"),
          RegistratedAt: getVal("corpRegisteredAt"),
          RegisteredOffice: getVal("corpRegisteredOffice"),
          BusinessDescription: getVal("corpDescription"),
          Website: getVal("corpWebsite"),
          IdentificationTypeID: getVal("corpIdentificationType"),
          CorporateIssueBy: getVal("corpIssuedBy"),
          CorporateIssueDate: getVal("corpIssueDate"),
          CorporateExpireDate: getVal("corpExpiryDate"),
          buisnesslinedescription: businessLineDescription,  // Backend expects this typo - it's the description text
          Countryofincorporation: getVal("corpCountryOfIncorporation"),
          corporateTinnumber: getVal("corpTinNumber"),
          BusinessLineID: getVal("corpLineOfBusiness"),
          BusinessOwnershipID: getVal("corpConstitution"),
          VATRegNumber: getVal("corpVatRegNo"),
          VATRegDate: getVal("corpVatRegDate"),
          ReportingGLID: getVal("corpReportingGLAccountID"),
          BusinessStartedYear: getVal("corpBusinessStartedYear"),
          NoOfEmployees: getVal("corpNoOfEmployees"),
          Comments: getVal("corpComments"),
          OpenedBy: getVal("corpOpenedBy") || userCode,
          OpenedOn: getVal("corpOpenedOn") || nowIso(),
        };

        // Debug log to verify values are being captured

        const data = useUpdate ? { ...base, ClientID: clientId } : base;
        const resp = useUpdate && svc.updateClientCorporate ? await svc.updateClientCorporate(data) : await svc.createClientCorporate(data);
        // After first save, mark this step as having existing data
        if (!useUpdate) this.state.existingStepData.corporate = true;
        maybeSyncClientIdFromResponse(resp);
        return resp;
      };

      const saveAddress = async () => {
        const useUpdate = shouldUseUpdateForStep('address');
        const addresses = this.getAddresses?.() || [];
        if (!addresses.length) return { success: true, code: "00", message: "No addresses", data: null };

        let lastResp = null;
        for (const address of addresses) {
          const base = {
            RequestID: requestId,
            AddressTypeID: address.AddressTypeID || "",
            Address1: address.Address1 || "",
            Address2: address.Address2 || "",
            LandMark: address.LandMark || "",
            CityID: address.CityID || "",
            CountryID: address.CountryID || "",
            ZipCode: address.ZipCode || "",
            Phone1: address.PhoneWork || "",
            Phone2: address.PhoneHome || "",
            Mobile: address.Mobile || "",
            Fax: address.FaxNo || "",
            Email: address.Email || "",
            IsMailingAddress: boolToInt(address.IsMailingAddress),
            // Additional fields required by backend
            SubCityID: address.SubCityZone || address.SubCityID || "",
            RegionID: address.Region || address.RegionID || "",
            Wereda: address.Wereda || "",
            Kebele: address.Kebele || "",
            HouseNo: address.HouseNumber || address.HouseNo || "",
            Subcitydescription: address.Subcitydescription || "",
            citydescription: address.citydescription || ""
          };

          const payload = useUpdate
            ? {
              ...base,
              ClientID: clientId,
              CreatedBy: this.form.elements.CreatedBy?.value || userCode,
              CreatedOn: this.form.elements.CreatedOn?.value || nowIso(),
              ModifiedBy: this.form.elements.ModifiedBy?.value || userCode,
              ModifiedOn: this.form.elements.ModifiedOn?.value || nowIso(),
              SupervisedBy: this.form.elements.SupervisedBy?.value || "",
              SupervisedOn: this.form.elements.SupervisedOn?.value || "",
              UpdateCount: this.form.elements.UpdateCount?.value || 0
            }
            : {
              ...base,
              CreatedBy: this.form.elements.CreatedBy?.value || userCode,
              CreatedOn: this.form.elements.CreatedOn?.value || nowIso(),
              SupervisedBy: this.form.elements.SupervisedBy?.value || "",
              SupervisedOn: this.form.elements.SupervisedOn?.value || "",
              UpdateCount: this.form.elements.UpdateCount?.value || 0
            };

          lastResp = useUpdate && svc.updateClientAddress ? await svc.updateClientAddress(payload) : await svc.createClientAddress(payload);
          if (!lastResp?.success) return lastResp;
          maybeSyncClientIdFromResponse(lastResp);
        }

        // After first save, mark this step as having existing data
        if (!useUpdate) this.state.existingStepData.address = true;
        return lastResp;
      };

      const saveRelations = async () => {
        const useUpdate = shouldUseUpdateForStep('relations');
        const rows = this.collections.relations || [];
        if (!rows.length) return { success: true, code: "00", message: "No relations", data: null };

        const createdBy = this.form.elements.CreatedBy?.value || userCode;
        const createdOn = this.form.elements.CreatedOn?.value || nowIso();
        const supervisedBy = this.form.elements.SupervisedBy?.value || "";
        const supervisedOn = this.form.elements.SupervisedOn?.value || "";
        const fallbackUpdateCount = this.form.elements.UpdateCount?.value || 0;

        const relations = rows.map((k) => ({
          RelatedClientID: k.RelatedClientID || "",
          RelationID: k.RelationID || "",
          ClientToRelationID: k.ClientToRelationID ?? k.ID ?? "",
          RelationRefNo: k.RelationRefNo ?? "",
          Remarks: k.Remarks || "",
          SharePercent: String(readNumber(k.SharePercent, 0)),
          RelationTypeID: k.RelationTypeID ?? k.RelationType ?? "",
          IdentificationTypeID: k.IdentificationTypeID || "",
          IdentificationNo: k.IdentificationNo || "",

          CreatedBy: k.CreatedBy || createdBy,
          CreatedOn: k.CreatedOn || createdOn,
          SupervisedBy: k.SupervisedBy || supervisedBy,
          SupervisedOn: k.SupervisedOn || supervisedOn,
          UpdateCount: (k.UpdateCount ?? fallbackUpdateCount) || 0
        }));

        const payload = {
          RequestID: requestId,
          ClientID: clientId,
          Relations: JSON.stringify(relations)
        };

        const resp = useUpdate && svc.updateClientRelation ? await svc.updateClientRelation(payload) : await svc.createClientRelation(payload);
        if (!resp?.success) return resp;
        // After first save, mark this step as having existing data
        if (!useUpdate) this.state.existingStepData.relations = true;
        maybeSyncClientIdFromResponse(resp);
        return resp;
      };

      const saveEmployment = async () => {
        const useUpdate = shouldUseUpdateForStep('employment');
        const createdBy = this.form.elements.CreatedBy?.value || userCode;
        const createdOn = this.form.elements.CreatedOn?.value || nowIso();
        const modifiedBy = this.form.elements.ModifiedBy?.value || userCode;
        const modifiedOn = this.form.elements.ModifiedOn?.value || nowIso();

        const monthlyIncome = readNumber(this.form.elements.MonthlyIncome?.value, 0);
        const annualIncome = readNumber(this.form.elements.AverageAnnualIncome?.value, monthlyIncome * 12);

        // Get IsSalaried from radio button
        const isSalariedRadio = this.form.querySelector("input[type='radio'][name='IsSalaried']:checked");
        const isSalaried = isSalariedRadio ? coerceBool(isSalariedRadio.value) : true;

        const data = {
          RequestID: requestId,
          ClientID: clientId,
          IsSalaried: isSalaried ? "1" : "0",
          EmployerID: "",
          DepartmentCodeID: "",
          WorkingSince: this.form.elements.WorkingSince?.value || "",
          Salary: monthlyIncome,
          FamilyIncome: readNumber(this.form.elements.FamilyIncome?.value, 0),
          OtherIncome: readNumber(this.form.elements.OtherIncome?.value, 0),
          RentExpense: readNumber(this.form.elements.RentExpenses?.value, 0),
          OtherExpenses: readNumber(this.form.elements.OtherExpenses?.value, 0),
          WorkPermitNo: this.form.elements.WorkPermitNo?.value || "",
          EmployerCode: this.form.querySelector('#EmploymentCompanyCode')?.value || "",
          AverageMonthlyIncome: monthlyIncome,
          AverageAnnualIncome: annualIncome,
          Occupationdescription: "",
          DesignationDescription: "",
          CompanytypeDescription: "",
          OccupationID: this.form.querySelector('#Occupation')?.value || "",
          DesignationID: this.form.querySelector('#Designation')?.value || "",
          CompanyTypeID: this.form.querySelector('#CompanyType')?.value || "",
          CreatedBy: createdBy,
          CreatedOn: createdOn,
          ModifiedBy: modifiedBy,
          ModifiedOn: modifiedOn,
          SupervisedBy: this.form.elements.SupervisedBy?.value || "",
          SupervisedOn: this.form.elements.SupervisedOn?.value || "",
          UpdateCount: this.form.elements.UpdateCount?.value || 0
        };
        const resp = useUpdate && svc.updateClientEmployment ? await svc.updateClientEmployment(data) : await svc.createClientEmployment(data);
        // After first save, mark this step as having existing data
        if (!useUpdate) this.state.existingStepData.employment = true;
        maybeSyncClientIdFromResponse(resp);
        return resp;
      };

      const saveSpecialOffers = async () => {
        const useUpdate = shouldUseUpdateForStep('specialOffers');
        const data = {
          ClientID: clientId,
          CanSendAssociateSpecialOffer: getCheckboxValue(this.form.elements.CanSendAssociateSpecialOffer),
          CanSendGreetings: getCheckboxValue(this.form.elements.CanSendGreetings),
          CanSendOurSpecialOffers: getCheckboxValue(this.form.elements.CanSendOurSpecialOffers),
          eStatementRequired: getCheckboxValue(this.form.elements.eStatementRequired),
          MobileAlertRequired: getCheckboxValue(this.form.elements.MobileAlertRequired),
          RequestID: requestId
        };
        const resp = useUpdate && svc.updateSpecialOffers ? await svc.updateSpecialOffers(data) : await svc.createSpecialOffers(data);
        // After first save, mark this step as having existing data
        if (!useUpdate) this.state.existingStepData.specialOffers = true;
        maybeSyncClientIdFromResponse(resp);
        return resp;
      };

      const saveOtherDetails = async () => {
        const useUpdate = shouldUseUpdateForStep('otherDetails');
        const pep = this.form.querySelector("input[type='radio'][name='IsPEP']:checked")?.value;
        const us = this.form.querySelector("input[type='radio'][name='IsUSPerson']:checked")?.value;
        const cleansed = this.form.querySelector("input[type='radio'][name='IsDataCleansed']:checked")?.value;
        const isPep = pep === "Y";
        const isUs = us === "Y";
        const existing = this.state?.otherDetailsExtra && typeof this.state.otherDetailsExtra === "object" ? this.state.otherDetailsExtra : {};

        const updates = {
          ClientArea: this.form.elements.ClientArea?.value || "",
          CNFSO: this.form.elements.CNFSO?.value || "",
          PersonalStatus: this.form.elements.PersonalStatus?.value || "",
          Closelawsuit: this.form.elements.CloseLawSuit?.value || "",
          NBENoImport: this.form.elements.NBEImportAccountID?.value || "",
          NBENBENoExport: this.form.elements.NBEExportAccountID?.value || "",
          TradeLicenseNo: this.form.elements.TradeLicenseNo?.value || "",
          BlackList: getCheckboxValue(this.form.elements.BlackList),
          Lawsuit: getCheckboxValue(this.form.elements.UnderLawSuit),
          ispoliticallyexposed: pep ? (pep === "Y" ? "1" : "0") : existing.ispoliticallyexposed,
          isuscitizen: us ? (us === "Y" ? "1" : "0") : existing.isuscitizen,
          isdatacleansed: cleansed ? (cleansed === "Y" ? "1" : "0") : existing.isdatacleansed,

          // Conditional blocks (match legacy ExtraDetails keys)
          txtpeporganizationname: isPep ? this.form.elements.PEPOrganization?.value || "" : "",
          txtpepposition: isPep ? this.form.elements.PEPPosition?.value || "" : "",
          txtSpouse: isPep ? this.form.elements.PEPSpouseName?.value || "" : "",
          txtchildname: isPep ? this.form.elements.PEPChildName?.value || "" : "",
          txtssnno: isUs ? this.form.elements.SSN?.value || "" : "",
          txteidno: isUs ? this.form.elements.EID?.value || "" : "",
          txtustin: isUs ? this.form.elements.USTIN?.value || "" : ""
        };

        const mergedExtra = { ...existing, ...updates };
        const detailsString = JSON.stringify(mergedExtra);
        const base = {
          RequestID: requestId,
          ClientID: clientId,
          ExtraDetails: detailsString
        };
        const data = useUpdate
          ? {
            ...base,
            ModifiedBy: this.form.elements.ModifiedBy?.value || userCode,
            ModifiedOn: this.form.elements.ModifiedOn?.value || nowIso()
          }
          : {
            ...base,
            CreatedBy: this.form.elements.CreatedBy?.value || userCode,
            CreatedOn: this.form.elements.CreatedOn?.value || nowIso()
          };

        const resp = useUpdate && svc.updateOtherDetails ? await svc.updateOtherDetails(data) : await svc.createOtherDetails(data);
        // After first save, mark this step as having existing data
        if (!useUpdate) this.state.existingStepData.otherDetails = true;
        maybeSyncClientIdFromResponse(resp);
        return resp;
      };

      const saveProducts = async () => {

        const useUpdate = shouldUseUpdateForStep('productsServices');

        const now = nowIso();
        const products = (this.products || []).map((p, index) => ({
          RequestID: requestId,
          ClientID: clientId,
          SerialNo: p.serialNo || index + 1,
          ProductTypeID: p.productTypeId || "",
          ProductID: p.id || "",
          Description: p.description || "",
          IsSelected: boolToInt(p.isSelected),
          IsDefault: p.isDefault === null || p.isDefault === undefined ? null : boolToInt(p.isDefault),
          CreatedBy: userCode,
          CreatedOn: null,
          ModifiedBy: userCode,
          ModifiedOn: null,
          SupervisedBy: null,
          SupervisedOn: null
        }));

        const services = (this.services || []).map((s, index) => ({
          RequestID: requestId,
          ClientID: clientId,
          SerialNo: s.serialNo || index + 1,
          ID: s.typeId || s.category || "TypeOfServiceID",
          SubCodeID: s.code || s.id || "",
          CreatedBy: userCode,
          ModifiedOn: null,
          ModifiedBy: userCode,
          StatusID: boolToInt(s.status),
          SupervisedBy: null,
          SupervisedOn: null,
          CreatedOn: null
        }));

        const base = {
          RequestID: requestId,
          ClientID: clientId,
          Products: JSON.stringify(products),
          Services: JSON.stringify(services)
        };

        const payload = useUpdate
          ? {
            ...base,
            ModifiedBy: this.form.elements.ModifiedBy?.value || userCode,
            ModifiedOn: this.form.elements.ModifiedOn?.value || now
          }
          : {
            ...base,
            CreatedBy: this.form.elements.CreatedBy?.value || userCode,
            CreatedOn: this.form.elements.CreatedOn?.value || now
          };


        const resp = useUpdate && svc.updateProductAndServices ? await svc.updateProductAndServices(payload) : await svc.createProductAndServices(payload);
        // After first save, mark this step as having existing data
        if (!useUpdate) this.state.existingStepData.productsServices = true;
        maybeSyncClientIdFromResponse(resp);
        return resp;
      };

      const saveDocuments = async () => {
        // Use the new ClientDocumentService for multipart/form-data uploads
        const ClientDocSvc = global.ClientDocumentService;
        if (!ClientDocSvc) {
          console.warn("[ClientMaintenance] ClientDocumentService not loaded, falling back to old API");
          return await saveDocumentsLegacy();
        }

        const docs = this.collections.documents || [];


        // Filter only new documents (not already saved to server, no imageID from server)
        const newDocs = docs.filter(d => !d.__deleted && !d.__saved && d.sImage);
        if (!newDocs.length) {
          return { success: true, code: "00", message: "No new documents to save", data: null };
        }

        let lastResp = null;
        for (const d of newDocs) {
          // Convert base64 sImage back to File if we have it
          let fileToUpload = null;
          if (d.File instanceof File) {
            fileToUpload = d.File;
          } else if (d.sImage && d.MimeType && d.fileName) {
            try {
              const base64Data = d.sImage.includes(",") ? d.sImage.split(",")[1] : d.sImage;
              const byteCharacters = atob(base64Data);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: d.MimeType });
              fileToUpload = new File([blob], d.fileName, { type: d.MimeType });
            } catch (e) {
              console.warn("[ClientMaintenance] Failed to convert base64 to file:", e);
            }
          }

          const payload = {
            ClientID: clientId || requestId,  // Use RequestID as ClientID for pipeline applications
            DocumentID: d.DocumentID || "",
            DocumentTypeID: d.DocumentTypeID || "",
            LocationID: d.LocationID || "",
            ReceivedBy: d.ReceivedBy || userCode,
            ReceivedDate: d.ReceivedDate || nowIso(),
            Remarks: d.Remarks || "",
            CreatedBy: d.CreatedBy || userCode,
            CreatedOn: d.CreatedOn || nowIso(),
            RequestID: requestId,
            File: fileToUpload,
            // Pass base64 data as fallback
            sImage: d.sImage || "",
            MimeType: d.MimeType || "",
            fileName: d.fileName || ""
          };

          lastResp = await ClientDocSvc.createDocument(payload);
          if (!lastResp?.success) {
            console.error("[ClientMaintenance] Document save failed:", lastResp);
            return lastResp;
          }
          // Mark as saved to prevent re-upload
          d.__saved = true;
          d.imageID = lastResp.data?.RowID || lastResp.data?.rowID;
        }

        return lastResp || { success: true, code: "00", message: "Documents saved", data: null };
      };

      // Legacy fallback using old OldAPI
      const saveDocumentsLegacy = async () => {
        const useUpdate = shouldUseUpdateForStep('documents');
        const docs = this.getDocumentPayload?.() || [];
        if (!docs.length) return { success: true, code: "00", message: "No documents", data: null };

        let lastResp = null;
        for (const d of docs) {
          const base = {
            RequestID: requestId,
            DocumentID: d.DocumentID || "",
            DocumentTypeID: d.DocumentTypeID || "",
            Remarks: d.Remarks || "",
            CreatedBy: d.CreatedBy || this.form.elements.CreatedBy?.value || userCode,
            CreatedOn: d.CreatedOn || this.form.elements.CreatedOn?.value || nowIso(),
            ModifiedBy: this.form.elements.ModifiedBy?.value || userCode,
            ModifiedOn: this.form.elements.ModifiedOn?.value || nowIso(),
            UpdateCount: this.form.elements.UpdateCount?.value || 0,
            ImageID: d.ImageID || 0,
            sImage: d.sImage || "",
            MimeType: d.MimeType || "",
            Description: d.Description || ""
          };

          const payload = useUpdate
            ? {
              ...base,
              ClientID: clientId || requestId,  // Use RequestID as ClientID for pipeline applications
              ReceivedBy: "",
              ReceivedDate: "",
              LocationID: "",
              DeletedOn: "",
              DeletedBy: "",
              DocumentReferenceNo: "",
              DocumentDate: "",
              SendingBank: ""
            }
            : base;

          lastResp = useUpdate && svc.updateClientDocuments ? await svc.updateClientDocuments(payload) : await svc.createClientDocuments(payload);
          if (!lastResp?.success) return lastResp;
          maybeSyncClientIdFromResponse(lastResp);
        }

        // After first save, mark this step as having existing data
        if (!useUpdate) this.state.existingStepData.documents = true;
        return lastResp;
      };

      try {
        switch (activeStep) {
          case "personal": {
            const basicResp = await saveBasicDetails();
            if (basicResp?.success === false) return basicResp;
            const indResp = await saveIndividual();
            if (indResp?.success === false) return indResp;
            return indResp || basicResp || { success: true, code: "00", message: "Saved", data: null };
          }
          case "corporate": {
            const basicResp = await saveBasicDetails();
            if (basicResp?.success === false) return basicResp;
            const corpResp = await saveCorporate();
            if (corpResp?.success === false) return corpResp;
            return corpResp || basicResp || { success: true, code: "00", message: "Saved", data: null };
          }
          case "address": {
            const resp = await saveAddress();
            return resp || { success: true, code: "00", message: "Saved", data: null };
          }
          case "relations": {
            const resp = await saveRelations();
            return resp || { success: true, code: "00", message: "Saved", data: null };
          }
          case "employment": {
            const resp = await saveEmployment();
            return resp || { success: true, code: "00", message: "Saved", data: null };
          }
          case "offers": {
            const resp = await saveSpecialOffers();
            return resp || { success: true, code: "00", message: "Saved", data: null };
          }
          case "kyc": {
            const resp = await saveOtherDetails();
            return resp || { success: true, code: "00", message: "Saved", data: null };
          }
          case "products": {
            const resp = await saveProducts();
            return resp || { success: true, code: "00", message: "Saved", data: null };
          }
          case "documents": {
            const resp = await saveDocuments();
            return resp || { success: true, code: "00", message: "Saved", data: null };
          }
          case "photo-signature": {
            const resp = await this.savePhotoSignatures();
            return resp || { success: true, code: "00", message: "Saved", data: null };
          }
          // Steps without known save procs yet.
          case "groupDetail":
          case "submit":
          default:
            return { success: true, code: "00", message: "No save required", data: null };
        }
      } catch (error) {
        console.error("[ClientMaintenance] Step save failed", { step: activeStep, error });
        return { success: false, code: "EXCEPTION", message: error?.message || "Step save failed", data: null };
      }
    }

    async saveAllVisibleStepsDraft() {
      const stepIds = this.stepper?.getVisibleOrder?.() || [];
      if (!stepIds.length) return true;
      for (const stepId of stepIds) {
        const saved = await this.saveStepDraft(stepId);
        if (isOldApiFailure(saved)) {
          this.stepper?.goTo?.(stepId);
          this.syncPanelFieldState();
          return false;
        }
      }
      return true;
    }

    getOrCreateStepperRequestId() {
      if (!this.state.stepperRequestId) {
        this.state.stepperRequestId = generateRandomId();
      }
      return this.state.stepperRequestId;
    }

    async loadProductsAndServicesCatalog(force = false) {
      if (!this.clientService?.getProductAndServices) return;
      if (this._productsServicesCatalogLoaded && !force) return;

      try {
        const response = await this.clientService.getProductAndServices({
          RequestID: this.getOrCreateStepperRequestId(),
          ClientID: ""
        });
        const details = extractOldApiInnerDetails(response);
        if (!details || typeof details !== "object") return;
        this.applyProductAndServicesItems(details);
        this._productsServicesCatalogLoaded = true;
      } catch (error) {
        console.warn("[ClientMaintenance] Unable to load Products & Services catalog", error);
      }
    }

    async loadProductsAndServicesStep(clientId) {
      if (!this.clientService?.getProductAndServices) return;
      try {
        await this.loadProductsAndServicesCatalog();
        this.refreshProductsForClientType();

        const normalizedClientId = (clientId || "").trim();
        if (!normalizedClientId) {
          this.renderProducts();
          this.renderServices();
          return;
        }

        const response = await this.clientService.getProductAndServices({
          ClientID: normalizedClientId,
          RequestID: this.getOrCreateStepperRequestId()
        });
        const details = extractOldApiInnerDetails(response);
        if (!details || typeof details !== "object") return;

        const productRows = Array.isArray(details?.Products) ? details.Products : [];
        const serviceRows = Array.isArray(details?.Services) ? details.Services : [];

        // If backend returns a full list with flags, prefer it.
        if (productRows.length && productRows.length >= (this.products || []).length) {
          this.applyProductAndServicesItems(details);
          return;
        }

        const selectedProductKeys = new Set(
          productRows
            .filter((p) => Number(p?.IsSelected) === 1 || coerceBool(p?.IsSelected))
            .map((p) => `${String(p?.ProductTypeID || "")}::${String(p?.ProductID || "")}`)
        );

        const selectedServiceKeys = new Set(
          serviceRows
            .filter((s) => Number(s?.StatusID) === 1 || coerceBool(s?.StatusID))
            .map((s) => `${String(s?.ID || "TypeOfServiceID")}::${String(s?.SubCodeID || s?.ServiceID || "")}`)
        );

        this.products = (this.products || []).map((p) => ({
          ...p,
          isSelected: selectedProductKeys.has(`${p.productTypeId || ""}::${p.id || ""}`)
        }));

        this.services = (this.services || []).map((s) => {
          const idKey = `${s.typeId || s.category || "TypeOfServiceID"}::${s.id || ""}`;
          const fallbackKey = `TypeOfServiceID::${s.id || ""}`;
          return {
            ...s,
            status: selectedServiceKeys.has(idKey) || selectedServiceKeys.has(fallbackKey)
          };
        });

        this.renderProducts();
        this.renderServices();
      } catch (error) {
        console.warn("[ClientMaintenance] Unable to load Products & Services step", error);
      }
    }

    async loadClientViaSteppers(clientId) {
      const svc = this.clientService;
      if (!svc?.getClientBasicDetails) return false;

      const requestId = this.getOrCreateStepperRequestId();
      const baseReq = { ClientID: clientId, RequestID: requestId };

      // 1) Basic details drives scope + top identifiers.
      const basicResp = await svc.getClientBasicDetails(baseReq);
      const basic = extractOldApiInnerDetails(basicResp);
      if (!basic || Array.isArray(basic) || typeof basic !== "object") {
        return false;
      }
      this.applyBasicDetailsStepper(basic);

      const clientTypeId = (basic.ClientTypeID || this.form.elements.ClientTypeID?.value || "").trim().toUpperCase();
      const isCorporate = clientTypeId === "B" || clientTypeId === "C";

      const tasks = [];

      // 2) Individual / Corporate
      if (isCorporate && svc.getClientCorporate) {
        tasks.push(
          svc.getClientCorporate(baseReq).then((resp) => {
            const rows = extractOldApiInnerDetails(resp);
            const row = Array.isArray(rows) ? rows[0] : rows;
            if (row) this.applyCorporateStepper(row);
          })
        );
      } else if (!isCorporate && svc.getClientIndividual) {
        tasks.push(
          svc.getClientIndividual(baseReq).then((resp) => {
            const rows = extractOldApiInnerDetails(resp);
            const row = Array.isArray(rows) ? rows[0] : rows;
            if (row) this.applyIndividualStepper(row);
          })
        );
      }

      // 3) Address
      if (svc.getClientAddress) {
        tasks.push(
          svc.getClientAddress(baseReq).then((resp) => {
            const rows = extractOldApiInnerDetails(resp);
            if (!Array.isArray(rows)) return;
            const mapped = rows.map((r) => ({
              ...r,
              // Map API field names to form field names
              Region: r.Region ?? r.RegionID ?? "",
              SubCityZone: r.SubCityZone ?? r.SubCityID ?? "",
              HouseNumber: r.HouseNumber ?? r.HouseNo ?? "",
              PhoneWork: r.PhoneWork ?? r.Phone1 ?? "",
              PhoneHome: r.PhoneHome ?? r.Phone2 ?? "",
              FaxNo: r.FaxNo ?? r.Fax ?? "",
              ZipCode: r.ZipCode ?? r.ZIPCode ?? ""
            }));
            this.bootstrapAddresses(mapped);
          })
        );
      }

      // 4) Employment
      if (svc.getClientEmployment) {
        tasks.push(
          svc.getClientEmployment(baseReq).then((resp) => {
            const rows = extractOldApiInnerDetails(resp);
            const row = Array.isArray(rows) ? rows[0] : rows;
            if (!row) return;
            this.applyEmploymentStepper(row);
          })
        );
      }

      // 5) Next of Kin / Relations
      if (svc.getClientRelation) {
        tasks.push(
          svc.getClientRelation(baseReq).then((resp) => {
            const rows = extractOldApiInnerDetails(resp);
            if (!Array.isArray(rows)) return;
            this.collections.relations = rows.map((r) => ({
              ID: r.ID ?? null,
              ClientToRelationID: r.ID ?? null,
              RelatedClientID: r.RelatedClientID || "",
              RelationID: r.RelationID || "",
              RelationTypeID: r.RelationTypeID ?? r.RelationType ?? "",
              IdentificationTypeID: r.IdentificationTypeID || "",
              IdentificationNo: r.IdentificationNo || r.IdentificationNumber || "",
              RelationRefNo: r.RelationRefNo ?? 1,
              SharePercent: readNumber(r.SharePercent, 0),
              Remarks: r.Remarks || "",
              UpdateCount: r.UpdateCount ?? null,

              // Display-only fields (best-effort if backend returns them)
              TitleID: r.TitleID || "",
              FirstName: r.FirstName || "",
              MiddleName: r.MiddleName || "",
              LastName: r.LastName || "",
              GenderID: r.GenderID || "",
              Email: r.Email || "",
              Mobile: r.Mobile || "",
              IdentificationTypeLabel: r.IdentificationTypeLabel || r.IdentificationTypeName || ""
            }));
            this.renderRelationsTable();
          })
        );
      }

      // 6) Special offers
      if (svc.getSpecialOffers) {
        tasks.push(
          svc.getSpecialOffers(baseReq).then((resp) => {
            const offers = extractOldApiInnerDetails(resp);
            if (!offers || Array.isArray(offers) || typeof offers !== "object") return;
            this.applySpecialOffersStepper(offers);
          })
        );
      }

      // 7) Other details / KYC extra
      if (svc.getOtherDetails) {
        tasks.push(
          svc.getOtherDetails(baseReq).then((resp) => {
            const other = extractOldApiInnerDetails(resp);
            if (!other || Array.isArray(other) || typeof other !== "object") return;
            this.applyOtherDetailsStepper(other);
          })
        );
      }

      // 8) Documents - use new ClientDocumentService if available
      const ClientDocSvc = global.ClientDocumentService;
      if (ClientDocSvc) {
        tasks.push(
          ClientDocSvc.getDocumentsByClientId(clientId).then((resp) => {
            if (!resp.success || !Array.isArray(resp.data)) return;
            // Map server response to our document model
            this.collections.documents = resp.data.map((doc) => ({
              ID: doc.rowID || doc.RowID || null,
              DocumentRecordID: doc.rowID || doc.RowID || null,
              DocumentID: doc.documentID || doc.DocumentID || "",
              DocumentDescription: doc.documentDescription || doc.DocumentDescription || "",
              DocumentIDLabel: doc.documentDescription || doc.DocumentDescription || "",
              DocumentTypeID: doc.documentTypeID || doc.DocumentTypeID || "",
              DocumentTypeDescription: doc.documentTypeDescription || doc.DocumentTypeDescription || "",
              DocumentTypeLabel: doc.documentTypeDescription || doc.DocumentTypeDescription || "",
              LocationID: doc.locationID || doc.LocationID || "",
              LocationDescription: doc.locationDescription || doc.LocationDescription || "",
              LocationLabel: doc.locationDescription || doc.LocationDescription || "",
              ReceivedBy: doc.receivedBy || doc.ReceivedBy || "",
              ReceivedDate: doc.receivedDate || doc.ReceivedDate || "",
              Remarks: doc.remarks || doc.Remarks || "",
              Description: doc.description || doc.Description || "",
              CreatedBy: doc.createdBy || doc.CreatedBy || "",
              CreatedOn: doc.createdOn || doc.CreatedOn || "",
              ModifiedBy: doc.modifiedBy || doc.ModifiedBy || "",
              ModifiedOn: doc.modifiedOn || doc.ModifiedOn || "",
              UpdateCount: doc.updateCount || doc.UpdateCount || 0,
              ImageID: doc.imageID || doc.ImageID || null,
              imageID: doc.imageID || doc.ImageID || null,
              FilePath: doc.filePath || doc.FilePath || "",
              filePath: doc.filePath || doc.FilePath || "",
              RequestID: doc.requestID || doc.RequestID || "",
              sImage: null, // Will be fetched on demand for preview
              MimeType: doc.mimeType || doc.MimeType || "", // Store if provided
              fileName: doc.filePath || doc.FilePath ? (doc.filePath || doc.FilePath).split("/").pop() : "",
              __saved: true // Mark as already saved
            }));
            this.renderDocumentsTable();
          }).catch((err) => {
            console.warn("[ClientMaintenance] Failed to load documents:", err);
          })
        );
      } else if (svc.getClientDocuments) {
        // Fallback to old API
        tasks.push(
          svc.getClientDocuments(baseReq).then((resp) => {
            const rows = extractOldApiInnerDetails(resp);
            if (!Array.isArray(rows)) return;
            this.collections.documents = rows;
            this.renderDocumentsTable();
          })
        );
      }

      // 9) Products & Services (products only in provided response)
      tasks.push(this.loadProductsAndServicesStep(clientId));

      // 10) Photo and Signature (TempImages for the client)
      const TempImageSvc = global.TempImageService;
      if (TempImageSvc) {
        tasks.push(
          TempImageSvc.getClientImages(clientId).then((resp) => {
            if (!resp.success) return;
            const images = Array.isArray(resp.data) ? resp.data : (resp.data?.details ? [resp.data.details] : []);
            this.collections.photoSignatures = images.map((img) => ({
              tempImageId: img.tempImageID || img.tempImageId,
              imageTypeId: img.imageTypeID || img.imageTypeId,
              description: img.description,
              createdOn: img.createdOn,
              ...img
            }));
            this.renderPhotoSignatureTable();
          }).catch((err) => {
            console.warn("[ClientMaintenance] Failed to load photo/signatures:", err);
          })
        );
      }

      await Promise.allSettled(tasks);

      // Ensure scope + summary are aligned with the now-loaded stepper fields.
      this.updateScope();
      this.updateClientName();
      this.state.requestCode = clientId;
      this.updateSummaryMeta();
      
      // Mark steps with existing data as completed (for view mode)
      this.markLoadedStepsAsCompleted();
      
      return true;
    }

    applyBasicDetailsStepper(details) {
      // For pipeline applications, DO NOT set ClientID - they don't have a real one yet
      // The ClientID in temp tables is the RequestID, not a real ClientID
      if (!this.state.isPipelineApplication) {
        setFormFieldValue(this.form, "ClientID", details.ClientID);
      }
      setFormFieldValue(this.form, "ClientTypeID", details.ClientTypeID);
      setFormFieldValue(this.form, "OurBranchID", details.OurBranchID);
      setFormFieldValue(this.form, "ApplicationID", details.ApplicationID);
      setFormFieldValue(this.form, "OpenedBy", details.OpenedBy);
      setFormFieldValue(this.form, "OpenedDate", details.OpenedDate);
      setFormFieldValue(this.form, "IdentificationTypeID", details.IdentificationTypeID);

      // Capture the RequestID from the response for approval/rejection workflow
      if (details.RequestID) {
        this.state.stepperRequestId = details.RequestID;
      }

      if (this.nameField) {
        this.nameField.value = details.Name || this.nameField.value || "";
      }
      this.populateClientSummary(details, details.ClientID);

      // Populate Behind The Scene audit fields
      this.populateAuditFields(details);
    }

    /**
     * Populate Behind The Scene audit fields from ClientBasicDetails response
     * @param {Object} details - ClientBasicDetails response object
     */
    populateAuditFields(details) {
      if (!details) return;

      // Helper to format date for display
      const formatAuditDate = (dateStr) => {
        if (!dateStr) return '';
        try {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return dateStr;
          return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        } catch {
          return dateStr;
        }
      };

      // Helper to set audit panel value (works with both input and span elements)
      const setAuditValue = (elementId, value) => {
        const el = document.getElementById(elementId);
        if (!el) return;
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.value = value;
        } else {
          el.textContent = value;
        }
      };

      // Status
      setAuditValue('auditStatus', details.ClientStatusDescription || details.ClientStatusID || '');

      // Open Date
      setAuditValue('auditOpenDate', formatAuditDate(details.OpenedDate));

      // Closed Date
      setAuditValue('auditClosedDate', formatAuditDate(details.CloseDate));

      // Created By
      setAuditValue('auditCreatedBy', details.CreatedBy || '');

      // Modified By
      setAuditValue('auditModifiedBy', details.ModifiedBy || '');

      // Supervised By
      setAuditValue('auditSupervisedBy', details.SupervisedBy || '');

      // Created On
      setAuditValue('auditCreatedOn', formatAuditDate(details.CreatedOn));

      // Modified On
      setAuditValue('auditModifiedOn', formatAuditDate(details.ModifiedOn));

      // Supervised On
      setAuditValue('auditSupervisedOn', formatAuditDate(details.SupervisedOn));
    }

    applyIndividualStepper(row) {
      // Direct name matches
      [
        "TitleID",
        "FirstName",
        "MiddleName",
        "LastName",
        "GenderID",
        "NationalityID",
        "ResidentID",
        "NumberOfHouseMembers",
        "NumberOfChildren",
        "NumberOfDependents",
        "CanDonateBlood",
        "IsDOBGiven",
        "Age",
        "MotherName"
      ].forEach((key) => setFormFieldValue(this.form, key, row[key]));

      setFormFieldValue(this.form, "DateOfBirth", row.DateOfBirth);

      // Form uses these names (without the trailing "ID")
      setFormFieldValue(this.form, "LiteracyLevel", row.LiteracyLevelID);
      setFormFieldValue(this.form, "MaritalStatus", row.MaritalStatusID);
      setFormFieldValue(this.form, "Occupation", row.OccupationID);
      setFormFieldValue(this.form, "Designation", row.DesignationID);
      setFormFieldValue(this.form, "CompanyType", row.CompanyTypeID);

      // Identification dates/number fallbacks
      if (this.form.elements.NationalId && !this.form.elements.NationalId.value) {
        setFormFieldValue(this.form, "NationalId", row.PassportNo);
      }
      if (this.form.elements.IDIssueDate && !this.form.elements.IDIssueDate.value) {
        setFormFieldValue(this.form, "IDIssueDate", row.PassportIssueDate);
      }
      if (this.form.elements.IDExpiryDate && !this.form.elements.IDExpiryDate.value) {
        setFormFieldValue(this.form, "IDExpiryDate", row.PassportExpiryDate);
      }

      // Employment/company name present here too.
      setFormFieldValue(this.form, "EmploymentCompanyName", row.EmployerName);

      // Income type
      if (row.IsSalaried !== undefined) {
        setRadioGroupValue(this.form, "IsSalaried", String(coerceBool(row.IsSalaried)));
      }
    }

    applyCorporateStepper(row, basicDetails = null) {
      if (!row) return; // Guard against undefined/null row

      // Merge basic details for shared fields that aren't in corporate response
      const basic = basicDetails || {};

      // Helper to set value by element ID - handles date formatting for date inputs
      const setById = (id, value) => {
        const el = document.getElementById(id);
        if (!el) {
          return;
        }
        if (value === undefined || value === null || value === '') {
          return;
        }

        const valueStr = String(value);

        // Detect if this is a date field
        const isDateInput = el.type === 'date' || el.classList.contains('bs-input-date');
        const looksLikeDateTime = valueStr.includes('T') && valueStr.includes(':');

        if (isDateInput || looksLikeDateTime) {
          // Use toDateInputValue for consistent "D MMM YYYY" formatting
          const formatted = toDateInputValue(value);

          // Check if flatpickr is attached - could be on el directly or el might be the hidden input
          const fpInstance = el._flatpickr;

          if (fpInstance) {
            // Use flatpickr API - this handles display formatting via altInput
            fpInstance.setDate(value, true);
          } else if (el.type === 'hidden' && el.classList.contains('flatpickr-input')) {
            // Flatpickr made this hidden and created an altInput sibling
            el.value = value; // Hidden stores original format
            // The altInput (visible) is the next sibling
            const altInput = el.nextElementSibling;
            if (altInput && altInput.classList.contains('flatpickr-input')) {
              altInput.value = formatted;
            }
          } else {
            // Regular text input or flatpickr not yet initialized
            // Set formatted value - flatpickr will pick it up when it initializes
            el.value = formatted;
          }
        } else if (el.tagName === 'SELECT') {
          el.value = valueStr;
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          el.value = value;
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      };

      // Row 1: Company Name, Constitution, Line Of Business, Description
      setById("corpCompanyName", row.CompanyName);
      setById("corpConstitution", row.BusinessOwnershipID);
      setById("corpLineOfBusiness", row.BusinessLineID);
      setById("corpDescription", row.BusinessDescription);

      // Row 2: Identification Type, Date Of Registration, Identification No, Registered Office
      setById("corpIdentificationType", row.IdentificationTypeID);
      setById("corpRegistrationDate", row.RegistrationDate);
      setById("corpRegistrationNumber", row.RegistrationNumber);
      setById("corpRegisteredOffice", row.RegisteredOffice);

      // Row 3: Registered At, TIN Number, Business Started Year, No Of Employees
      setById("corpRegisteredAt", row.RegistratedAt);
      setById("corpTinNumber", row.corporateTinnumber);
      setById("corpBusinessStartedYear", row.BusinessStartedYear);
      setById("corpNoOfEmployees", row.NoOfEmployees);

      // Row 4: ID Issue Date, Issued By, ID Expiry Date, Country Of Incorporation
      setById("corpIssueDate", row.CorporateIssueDate);
      setById("corpIssuedBy", row.CorporateIssueBy);
      setById("corpExpiryDate", row.CorporateExpireDate);
      setById("corpCountryOfIncorporation", row.Countryofincorporation);

      // Row 5: VAT Reg.No, VAT Reg. Date, Reporting GL AccountID
      setById("corpVatRegNo", row.VATRegNumber);
      setById("corpVatRegDate", row.VATRegDate);
      setById("corpReportingGLAccountID", row.ReportingGLID);

      // Row 6: Comments, WebSite
      setById("corpComments", row.Comments);
      setById("corpWebsite", row.Website);

      // Row 7: Opened By, Relationship Manager, Opened On
      // These fields come from Basic Details, not Corporate Details
      setById("corpOpenedBy", row.OpenedBy || basic.OpenedBy);

      // For Relationship Manager: The corporate stepper select may not have options populated.
      // Copy options from personal stepper if needed, then set value
      const corpRM = document.getElementById("corpRelationshipManager");
      const personalRM = document.getElementById("relationshipManager");
      const rmValue = row.RelationshipManager || basic.RelationshipManagerID;
      if (corpRM && rmValue) {
        // If corporate RM has no options (or just the placeholder), copy from personal
        if (corpRM.options.length <= 1 && personalRM && personalRM.options.length > 1) {
          Array.from(personalRM.options).forEach((opt, idx) => {
            if (idx === 0) return; // Skip placeholder
            corpRM.add(new Option(opt.text, opt.value));
          });
        }
        corpRM.value = String(rmValue);
        corpRM.dispatchEvent(new Event('change', { bubbles: true }));
      }

      setById("corpOpenedOn", row.OpenedOn || basic.OpenedDate);


    }

    applyEmploymentStepper(row) {
      setFormFieldValue(this.form, "EmploymentCompanyCode", row.EmployerCode);
      setFormFieldValue(this.form, "WorkPermitNo", row.WorkPermitNo);
      setFormFieldValue(this.form, "WorkingSince", row.WorkingSince);

      // Monthly figures
      setFormFieldValue(this.form, "MonthlyIncome", row.AverageMonthlyIncome ?? row.Salary);
      setFormFieldValue(this.form, "OtherIncome", row.OtherIncome);
      setFormFieldValue(this.form, "RentExpenses", row.RentExpense);
      setFormFieldValue(this.form, "OtherExpenses", row.OtherExpenses);
      setFormFieldValue(this.form, "AverageAnnualIncome", row.AverageAnnualIncome);

      // Dropdown IDs for Occupation, Position (Designation), Company Type
      setFormFieldValue(this.form, "Occupation", row.OccupationID);
      setFormFieldValue(this.form, "Designation", row.DesignationID);
      setFormFieldValue(this.form, "CompanyType", row.CompanyTypeID);
    }

    applySpecialOffersStepper(details) {
      setFormFieldValue(this.form, "CanSendAssociateSpecialOffer", details.CanSendAssociateSpecialOffer);
      setFormFieldValue(this.form, "CanSendGreetings", details.CanSendGreetings);
      setFormFieldValue(this.form, "CanSendOurSpecialOffers", details.CanSendOurSpecialOffers);
      setFormFieldValue(this.form, "eStatementRequired", details.eStatementRequired);
      setFormFieldValue(this.form, "MobileAlertRequired", details.MobileAlertRequired);
    }

    applyOtherDetailsStepper(details) {
      let extra = details.ExtraDetails;
      if (typeof extra === "string") {
        try {
          extra = JSON.parse(extra);
        } catch {
          // If parsing fails, fall back to empty details.
          extra = null;
        }
      }
      extra = extra || {};

      // Keep original payload so we don't drop backend keys not exposed in the modern UI.
      this.state.otherDetailsExtra = extra;

      // KYC radio groups
      if (extra.ispoliticallyexposed !== undefined) {
        setRadioGroupValue(this.form, "IsPEP", coerceBool(extra.ispoliticallyexposed) ? "Y" : "N");
      }
      if (extra.isuscitizen !== undefined) {
        setRadioGroupValue(this.form, "IsUSPerson", coerceBool(extra.isuscitizen) ? "Y" : "N");
      }
      if (extra.isdatacleansed !== undefined) {
        setRadioGroupValue(this.form, "IsDataCleansed", coerceBool(extra.isdatacleansed) ? "Y" : "N");
      }

      // Conditional field values
      setFormFieldValue(this.form, "PEPOrganization", extra.txtpeporganizationname);
      setFormFieldValue(this.form, "PEPPosition", extra.txtpepposition);
      setFormFieldValue(this.form, "PEPSpouseName", extra.txtSpouse);
      setFormFieldValue(this.form, "PEPChildName", extra.txtchildname);
      setFormFieldValue(this.form, "SSN", extra.txtssnno);
      setFormFieldValue(this.form, "EID", extra.txteidno);
      setFormFieldValue(this.form, "USTIN", extra.txtustin);

      // Other details
      setFormFieldValue(this.form, "ClientArea", extra.ClientArea);
      setFormFieldValue(this.form, "CNFSO", extra.CNFSO);
      setFormFieldValue(this.form, "PersonalStatus", extra.PersonalStatus);
      setFormFieldValue(this.form, "BlackList", extra.BlackList);
      setFormFieldValue(this.form, "UnderLawSuit", extra.Lawsuit);
      setFormFieldValue(this.form, "CloseLawSuit", extra.Closelawsuit);

      setFormFieldValue(this.form, "NBEImportAccountID", extra.NBENoImport);
      setFormFieldValue(this.form, "NBEExportAccountID", extra.NBENBENoExport);
      setFormFieldValue(this.form, "TradeLicenseNo", extra.TradeLicenseNo);

      // Ensure conditional blocks match the now-applied radio values
      this._syncKyc?.();
    }

    applyProductAndServicesItems(itemsOrDetails) {
      const details = Array.isArray(itemsOrDetails)
        ? { Products: itemsOrDetails, Services: [] }
        : itemsOrDetails;

      const products = Array.isArray(details?.Products) ? details.Products : [];
      const services = Array.isArray(details?.Services) ? details.Services : [];

      if (products.length) {
        this.products = products.map((item, index) => ({
          serialNo: Number(item.SerialNo) || index + 1,
          id: item.ProductID || "",
          productTypeId: item.ProductTypeID || "",
          productTypeLabel: item.ProductTypeID || "",
          description: item.Description || "",
          isSelected: coerceBool(item.IsSelected),
          isDefault: coerceBool(item.IsDefault)
        }));
      }

      if (services.length) {
        // Render services from the API response if provided.
        this.services = services.map((svc, index) => ({
          id: svc.SubCodeID || svc.ServiceID || String(index + 1),
          code: svc.SubCodeID || svc.ServiceID || "",
          description: svc.Description || "",
          typeId: svc.ID || "TypeOfServiceID",
          serialNo: Number(svc.SerialNo) || index + 1,
          status: Number(svc.StatusID) === 1 || coerceBool(svc.StatusID)
        }));
      }

      if (this.pagination?.products) this.pagination.products.page = 1;
      if (this.pagination?.services) this.pagination.services.page = 1;

      this.renderProducts();
      this.renderServices();
    }

    applyPayload(payload) {
      Object.entries(payload).forEach(([key, value]) => {
        const field = this.form.elements[key];
        if (!field) return;
        if (field.type === "checkbox") {
          field.checked = Boolean(value);
        } else {
          field.value = value ?? "";
        }
      });

      this.bootstrapAddresses(payload.Addresses);
      this.collections.relations = payload.ClientRelations || payload.Relations || payload.NextOfKin || [];
      this.collections.employment = payload.EmploymentDetails || [];
      this.collections.documents = payload.Documents || [];
      this.renderRelationsTable();
      this.renderEmploymentTable();
      this.renderDocumentsTable();

      // Restore products and services into the Products & Services step
      if (Array.isArray(payload?.Products) || Array.isArray(payload?.Services)) {
        this.applyProductAndServicesItems({
          Products: Array.isArray(payload?.Products) ? payload.Products : [],
          Services: Array.isArray(payload?.Services) ? payload.Services : []
        });
      }
      this.refreshProductsForClientType();
      this.renderProducts();
      this.renderServices();

      this.updateScope();
      this.updateClientName();
      this.populateClientSummary(payload, payload.ClientID);
      this.state.requestCode = payload.ClientID || this.state.requestCode;
      this.updateSummaryMeta();
    }

    populateClientSummary(payload, fallbackId) {
      const status = payload?.WFClientStatusID || "Draft";
      // RelationshipManager may be a collection if multiple fields have the same name
      const rmFields = this.form.elements.RelationshipManager;
      const rmField = rmFields?.length ? rmFields[0] : rmFields; // Get first element if collection
      const rmValue = payload?.RelationshipManager ?? "";
      let rm = rmValue || "Unassigned";
      if (rmField?.options) {
        const match = Array.from(rmField.options).find((option) => option.value === String(rmValue));
        if (match?.textContent) {
          rm = match.textContent.trim();
        }
      }
      const opened = payload?.OpenedOn || payload?.OpenedDate || new Date().toISOString();
      const modified = payload?.ModifiedOn || new Date().toISOString();
      const name = payload?.Name || payload?.ClientName || fallbackId || "Choose a client to begin";

      setText(this.summaryTargets.status, status);
      setText(this.summaryTargets.statusPill, status);
      setText(this.summaryTargets.opened, formatDate(opened));
      setText(this.summaryTargets.openedPill, formatDate(opened));
      setText(this.summaryTargets.modified, formatDate(modified, true));
      setText(this.summaryTargets.modifiedPill, formatDate(modified, true));
      setText(this.summaryTargets.createdPill, formatDate(payload?.CreatedOn || opened));
      setText(this.summaryTargets.rm, rm);
      setText(
        this.summaryTargets.summary,
        payload ? `Pulled from core at ${new Date().toLocaleTimeString()}` : "No upstream profile found. Capture the essentials to initiate."
      );
      setText(this.summaryTargets.workflow, payload?.WorkflowStatus || status);
      setText(this.summaryTargets.headline, name);
      if (this.nameField && !this.nameField.value) {
        this.nameField.value = name;
      }
      if (this.summaryTargets.segment) {
        const type = this.form.elements.ClientTypeID.value || payload?.ClientTypeID || "—";
        const segmentLabel = `Segment · ${type}`;
        this.summaryTargets.segment.textContent = segmentLabel;
      }
    }

    setMetaDefaults() {
      const createdBy = this.session?.name || "System";
      const userCode = this.session?.operatorId || createdBy;
      const now = new Date().toISOString();
      if (this.form.elements.CreatedBy) this.form.elements.CreatedBy.value = createdBy;
      if (this.form.elements.OpenedBy && !this.form.elements.OpenedBy.value) this.form.elements.OpenedBy.value = userCode;
      if (this.form.elements.CreatedOn) this.form.elements.CreatedOn.value = now;
      if (this.form.elements.ModifiedOn) this.form.elements.ModifiedOn.value = now;
      if (this.form.elements.OpenedDate && !this.form.elements.OpenedDate.value) {
        this.form.elements.OpenedDate.value = new Date().toISOString().slice(0, 10);
      }
    }

    updateScope() {
      const clientTypeField = this.form.elements.ClientTypeID;
      const clientType = clientTypeField ? clientTypeField.value : "";
      this.state.scopeTokens = deriveScopeTokens(clientType);
      this.state.scope = this.state.scopeTokens.includes(CLIENT_SCOPE.CORPORATE) ? CLIENT_SCOPE.CORPORATE : CLIENT_SCOPE.INDIVIDUAL;
      this.stepper?.setScope(this.state.scopeTokens);
      this.syncPanelFieldState();
      this.toggleScopedFields();
      this.toggleShellNavVisibility();
      this.syncShellNav(this.stepper?.activeStep);
      this.updateWindowBadges();
      this.updateSummaryMeta();
      this.updateDobConstraints(); // Update DOB constraints based on client type
    }

    /**
     * Update DOB field constraints based on client type
     * Minor clients don't have the 18+ age restriction
     */
    updateDobConstraints() {
      const dobField = this.form.querySelector('#dob');
      if (!dobField) return;
      
      const clientType = (this.form.elements.ClientTypeID?.value || '').trim().toUpperCase();
      const isMinor = clientType === 'M';
      
      const today = new Date();
      const todayISO = today.toISOString().split('T')[0];
      
      if (isMinor) {
        // For minors, DOB can be any date up to today
        dobField.max = todayISO;
      } else {
        // For non-minors, DOB must be at least 18 years ago
        const maxDate = new Date(today);
        maxDate.setFullYear(maxDate.getFullYear() - 18);
        dobField.max = maxDate.toISOString().split('T')[0];
      }
    }

    syncPanelFieldState() {
      this.stepper?.panels.forEach((panel) => disableFieldsInNode(panel, panel.hidden));
    }

    toggleScopedFields() {
      const activeTokens = new Set(["all", ...this.state.scopeTokens]);
      this.form.querySelectorAll("[data-client-scope]").forEach((node) => {
        const attr = (node.dataset.clientScope || "all").split(",").map((token) => token.trim().toLowerCase()).filter(Boolean);
        let shouldShow = false;
        if (!attr.length || attr.includes("all")) {
          shouldShow = true;
        } else {
          shouldShow = attr.some((token) => activeTokens.has(token));
        }
        node.classList.toggle("d-none", !shouldShow);
        disableFieldsInNode(node, !shouldShow);
      });
    }

    updateClientName() {
      const first = this.form.elements.FirstName?.value?.trim() || "";
      const middle = this.form.elements.MiddleName?.value?.trim() || "";
      const last = this.form.elements.LastName?.value?.trim() || "";
      const company = this.form.elements.CompanyName?.value?.trim() || "";
      const name = this.state.scope === CLIENT_SCOPE.CORPORATE ? company : [first, middle, last].filter(Boolean).join(" ");
      if (this.nameField) {
        this.nameField.value = name || "Waiting for inputs";
      }
      setText(this.summaryTargets.headline, name || "Choose a client to begin");
    }

    updateAge() {
      const dobValue = this.form.elements.DateOfBirth?.value;
      const ageField = this.form.elements.Age;
      const ageAsOnField = this.form.elements.AgeAsOn;
      if (!dobValue || !ageField) return;
      const dob = new Date(dobValue);
      if (Number.isNaN(dob.getTime())) return;
      const diff = Date.now() - dob.getTime();
      const age = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
      ageField.value = `${age} yrs`;
      if (ageAsOnField) {
        // Use GlobalUtils.formatDate for consistent formatting (DD-Mon-YYYY)
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayISO = `${year}-${month}-${day}`;
        ageAsOnField.value = window.GlobalUtils?.formatDate(todayISO) || todayISO;
      }
    }

    updateSummaryMeta() {
      // RelationshipManager may be a collection if multiple fields have the same name
      const rmFields = this.form.elements.RelationshipManager;
      const rmField = rmFields?.length ? rmFields[0] : rmFields; // Get first element if collection
      const clientIdField = this.form.elements.ClientID;
      const clientTypeField = this.form.elements.ClientTypeID;
      if (this.summaryBadges.mode) {
        this.summaryBadges.mode.textContent = this.state.pageFunction;
      }
      if (this.summaryBadges.clientId) {
        this.summaryBadges.clientId.textContent = clientIdField?.value || "—";
      }
      if (this.summaryBadges.clientType) {
        this.summaryBadges.clientType.textContent = clientTypeField?.value || "—";
      }
      const inlineSegment = `Segment · ${clientTypeField?.value || "—"}`;
      setText(this.summaryTargets.segment, inlineSegment);
      if (this.summaryBadges.relationshipManager) {
        let label = "—";
        if (rmField?.options && rmField.selectedIndex > -1) {
          label = rmField.options[rmField.selectedIndex]?.textContent?.trim() || rmField.value || "—";
        }
        this.summaryBadges.relationshipManager.textContent = label;
      }
    }

    collectBaseFields() {
      const data = {};
      Array.from(this.form.elements).forEach((field) => {
        if (!field.name || field.disabled) return;
        if (field.closest("[data-collection-item]") || field.closest("[data-document-row]")) return;
        if (field.type === "checkbox") {
          data[field.name] = field.checked;
        } else if (field.type === "radio") {
          if (field.checked) {
            data[field.name] = field.value;
          }
        } else {
          data[field.name] = field.value;
        }
      });
      return data;
    }

    buildPayload() {
      const base = this.collectBaseFields();
      base.ClientID = base.ClientID || this.state.requestCode || generateClientId();
      base.ClientTypeID = this.form.elements.ClientTypeID.value || base.ClientTypeID || "";
      base.OpenedBy = base.OpenedBy || this.session?.operatorId || this.session?.name || "System";
      base.CreatedBy = base.CreatedBy || this.session?.name || "System";
      base.CreatedOn = toISODate(base.CreatedOn) || new Date().toISOString();
      base.OpenedDate = toISODate(base.OpenedDate) || new Date().toISOString();
      base.ModifiedOn = new Date().toISOString();
      base.WFClientStatusID = base.WFClientStatusID || "A";
      base.IsDOBGiven = Boolean(base.DateOfBirth);
      base.Name = this.nameField?.value && this.nameField.value !== "Waiting for inputs" ? this.nameField.value : base.ClientID;
      base.Addresses = this.getAddresses();
      base.ClientRelations = [...(this.collections.relations || [])];
      base.NextOfKin = [...(this.collections.relations || [])];
      base.EmploymentDetails = [...this.collections.employment];
      base.Documents = this.getDocumentPayload();
      const products = this.products || [];
      const anyExplicitSelection = products.some((product) => product.isSelected !== undefined);
      const selectedProducts = anyExplicitSelection ? products.filter((product) => !!product.isSelected) : products;
      base.Products = selectedProducts.map((product) => ({
        ProductID: product.id,
        ProductTypeID: product.productTypeId,
        Description: product.description,
        ProductTypeLabel: product.productTypeLabel || product.productTypeId || "",
        IsDefault: Boolean(product.isDefault),
        IsSelected: anyExplicitSelection ? Boolean(product.isSelected) : true,
        SerialNo: product.serialNo || 0
      }));
      base.Services = (this.services || [])
        .filter((service) => !!service.status)
        .map((service, index) => ({
          ServiceID: service.id,
          Name: service.name,
          Category: service.category || "",
          IsSelected: true,
          SerialNo: index + 1
        }));
      return base;
    }

    getDocumentPayload() {
      return Array.from(this.form.querySelectorAll('[data-document-row]')).map((row) => ({
        DocumentID: row.querySelector("[name='DocumentID']")?.value || "",
        DocumentTypeID: row.querySelector("[name='DocumentTypeID']")?.value || "",
        Description: row.querySelector("[name='Description']")?.value || row.__docData?.Description || "",
        Remarks: row.querySelector("[name='Remarks']")?.value || row.__docData?.Remarks || "",
        MimeType: row.__docData?.MimeType || "",
        sImage: row.__docData?.sImage || "",
        CreatedOn: row.__docData?.CreatedOn || new Date().toISOString(),
        CreatedBy: row.__docData?.CreatedBy || this.session?.name || "System",
        fileName: row.__docData?.fileName || row.__docData?.Description || ""
      }));
    }

    validateBeforeSubmit(payload, action) {
      let normalizedPayload = payload;
      if (this.state.scope === CLIENT_SCOPE.INDIVIDUAL && (this.collections.relations || []).length) {
        const allocation = (this.collections.relations || []).reduce((sum, entry) => sum + readNumber(entry.SharePercent), 0);
        if (Math.abs(allocation - 100) > 0.01) {
          throw new Error("Next of kin percentages must sum to 100%.");
        }
      }

      if (!payload.Addresses.length || !payload.Addresses[0].Address1) {
        throw new Error("At least one mailing address is required.");
      }

      const invalidAddress = payload.Addresses.some((address) => !address.Address1 || !address.CityID || !address.CountryID);
      if (invalidAddress) {
        throw new Error("Provide address line, city, and country for every address card.");
      }

      // Basic document validations (mirrors legacy document upload checks)
      const documents = Array.isArray(payload.Documents) ? payload.Documents : [];
      if (documents.length) {
        const invalidDocument = documents.some((doc) => !doc.DocumentID || !doc.DocumentTypeID || !doc.sImage);
        if (invalidDocument) {
          throw new Error("Each document row must have a document, type, and uploaded file.");
        }
      }

      if (this.state.scope === CLIENT_SCOPE.CORPORATE && this.totalDirectorShare() > 100) {
        throw new Error("Director share allocation cannot exceed 100%.");
      }

      const invalidEmployment = payload.EmploymentDetails.some((job) => {
        const hasAnyValue = Boolean(job.companyName || job.workPosition || job.startDate || job.endDate);
        if (!hasAnyValue) return false;
        return !job.companyName || !job.workPosition || !job.startDate || !job.endDate;
      });
      if (invalidEmployment) {
        throw new Error("Employment rows must include company, position, start, and end dates.");
      }

      if (window.ClientFormModel) {
        const model = new window.ClientFormModel(payload);
        const validation = model.validate();
        if (!validation.valid) {
          throw new Error(validation.errors.join(" | "));
        }
        normalizedPayload = model.toRequestPayload();
      }

      if (action === "approve") {
        normalizedPayload.WFClientStatusID = "APPROVED";
      }

      return normalizedPayload;
    }

    async handleSubmit(action = "save") {
      if (this.state.posting) return;
      try {
        this.state.posting = true;

        const requestId = this.getOrCreateStepperRequestId();
        if (!requestId) {
          throw new Error("RequestID is required before finalizing.");
        }

        // For Add mode or pipeline apps, we don't have a ClientID yet - the backend will generate one
        // For Update mode (editing existing finalized client), we use the existing ClientID
        const clientId = this.form?.elements?.ClientID?.value?.trim() || "";
        const isAddMode = this.state.pageFunction === "Add";
        const isPipelineApp = this.state.isPipelineApplication;
        const isNewClient = isAddMode || isPipelineApp || !clientId;


        // Only require ClientID for Update mode on finalized clients (not pipeline apps)
        if (this.state.pageFunction === "Update" && !isPipelineApp && !clientId) {
          throw new Error("ClientID is required for updating existing clients.");
        }

        if (!window.CoreApi || typeof window.CoreApi.post !== "function") {
          throw new Error("CoreApi not available (window.CoreApi.post missing).");
        }

        const envelope = {
          RequestID: "p_v1_FinalizeClient",
          FormId: "p_v1_FinalizeClient",
          RequestData: {
            RequestID: requestId,
            // For new clients (Add mode or pipeline apps), send empty ClientID
            // The backend uses RequestID to find temp table data and generate the real ClientID
            ClientID: isNewClient ? "" : clientId
          },
          RequestTime: new Date().toISOString(),
          AppName: "PROJECT_KAIRO",
          Checksum: ""
        };


        this.showToast("Finalizing client...", "info");
        const clientApiUrl = `${(window.Environment?.baseUrlClient || "").replace(/\/+$/, "")}/api/OldAPI`;
        const response = await window.CoreApi.post(clientApiUrl, envelope);
        const isSuccess = String(response?.ResponseCode || response?.code || "") === "00";

        // Extract the new ClientID from the response if this was a new client
        const responseClientId = response?.Details?.ClientID || response?.details?.ClientID || response?.Details?.clientID || clientId;

        this.showToast(
          response?.ResponseMessage || response?.message || (isSuccess ? "Client finalized." : "Finalize returned non-success."),
          isSuccess ? "success" : "warning"
        );
        if (isSuccess) {
          // Update with the real ClientID from the response (for Add mode)
          if (responseClientId && isAddMode) {
            this.form.elements.ClientID.value = responseClientId;
            this.state.requestCode = responseClientId;
          } else {
            this.state.requestCode = clientId || requestId;
          }

          if (isAddMode) {
            this.state.pageFunction = "Update";
            this.state.clientDataLoaded = true;
            this.state.clientTypeSelected = true;
            this.syncActionButtons();
          }
          this.updateSummaryMeta();
        }
      } catch (error) {
        console.error(error);
        this.showToast(error.message || "Unable to submit request.", "danger");
      } finally {
        this.state.posting = false;
      }
    }

    resolveServiceCall(action) {
      if (!this.clientService) return null;
      if (this.state.pageFunction === "Add") {
        return this.clientService.createClient.bind(this.clientService);
      }
      if (action === "approve" || this.state.pageFunction === "Supervise" || this.state.pageFunction === "Update") {
        return this.clientService.updateClient.bind(this.clientService);
      }
      return this.clientService.createClient.bind(this.clientService);
    }

    async handlePrimaryAction(action) {
      if (action === "save") {
        await this.handleSubmit("save");
      } else if (action === "approve") {
        await this.handleSubmit("approve");
      } else if (action === "cancel") {
        window.history.length > 1 ? window.history.back() : this.resetForm();
      } else if (action === "clear") {
        this.resetForm();
      }
    }

    openDataEntryModal(title, url) {
      const modalEl = document.getElementById("dataEntryModal");
      if (!modalEl) {
        console.warn("DataEntryModal not found in DOM");
        return;
      }
      const titleEl = modalEl.querySelector(".modal-title");
      const iframe = document.getElementById("dataEntryFrame");

      if (titleEl) titleEl.textContent = title;
      if (iframe) iframe.src = url;

      // Use bootstrap from global scope if available, or try window.bootstrap
      const bs = window.bootstrap || global.bootstrap;
      if (bs && bs.Modal) {
        const modal = new bs.Modal(modalEl);
        modal.show();

        // Handle close message from iframe
        const messageHandler = (event) => {
          if (event.data && event.data.type === 'CLOSE_DATAENTRY') {
            modal.hide();
            window.removeEventListener('message', messageHandler);
          }
        };
        window.addEventListener('message', messageHandler);

        modalEl.addEventListener('hidden.bs.modal', () => {
          if (iframe) iframe.src = "";
          window.removeEventListener('message', messageHandler);
        }, { once: true });
      } else {
        console.warn("Bootstrap not loaded, cannot show modal");
      }
    }

    loadAddressPanel() {
      this.openDataEntryModal("Address", "/modules/customer-management/DataEntry/client-address.html");
    }

    loadIntroducerPanel() {
      this.openDataEntryModal("Introducer Details", "/modules/customer-management/DataEntry/introducer.html");
    }

    loadBankAccountsPanel() {
      this.openDataEntryModal("Bank Accounts", "/modules/customer-management/bank-accounts.html");
    }

    loadRelationPanel() {
      this.openDataEntryModal("Relation", "/modules/customer-management/relation.html");
    }

    loadClientProfileChangePanel() {
      this.openDataEntryModal("Client Profile Change", "/modules/customer-management/client-profile-change.html");
    }

    loadDemiseDetailsPanel() {
      this.openDataEntryModal("Demise Details", "/modules/customer-management/demise-details.html");
    }

    loadUDF1Panel() {
      this.openDataEntryModal("User Defined Fields 1", "/modules/customer-management/udf1.html");
    }

    loadUDF2Panel() {
      this.openDataEntryModal("User Defined Fields 2", "/modules/customer-management/udf2.html");
    }

    loadUDF3Panel() {
      this.openDataEntryModal("User Defined Fields 3", "/modules/customer-management/udf3.html");
    }

    loadClientIdentityTypesPanel() {
      this.openDataEntryModal("Client Identity Types", "/modules/customer-management/client-identity-types.html");
    }

    loadSignaturePhotoPanel() {
      this.openDataEntryModal("Signature and Photograph", "/modules/customer-management/signature-photo.html");
    }



    resetForm() {
      this.form.reset();

      // Reset all select elements to their placeholder (first option with empty value)
      // form.reset() doesn't properly handle selects with disabled placeholder options
      this.form.querySelectorAll("select[data-lookup]").forEach((select) => {
        const placeholder = select.querySelector('option[value=""]');
        if (placeholder) {
          select.value = "";
          placeholder.selected = true;
        } else if (select.options.length > 0) {
          // Fallback: select first option
          select.selectedIndex = 0;
        }
      });

      this.state.editing = { relations: null, employment: null };
      this.state.selectedRelationIndex = null;
      this.collections = { relations: [], employment: [], documents: [], photoSignatures: [] };

      // Reset pipeline application state
      this.state.isPipelineApplication = false;
      this.state.stepperRequestId = "";

      // Reset client data loaded state
      this.state.clientDataLoaded = false;
      this.state.loadedClientId = "";

      // Reset client type selection state (user must select type again in Add mode)
      this.state.clientTypeSelected = false;

      // Reset existing step data tracking
      this.state.existingStepData = {
        basicDetails: false,
        individual: false,
        corporate: false,
        address: false,
        employment: false,
        relations: false,
        documents: false,
        photoSignatures: false,
        specialOffers: false,
        otherDetails: false,
        productsServices: false
      };

      if (this.state.pageFunction === "Add") {
        this.state.requestCode = "";
      }
      this.bootstrapAddresses();
      this.renderRelationsTable();
      this.renderEmploymentTable();
      this.clearDocumentsTable();
      this.updateScope();
      this.updateClientName();
      this.updateSummaryMeta();
      this.setMetaDefaults();
      const order = this.stepper?.getVisibleOrder?.() || [];
      if (order.length) {
        this.stepper.goTo(order[0]);
      }
      this.syncActionButtons();
      this.showToast("Form cleared.", "info");
    }

    showToast(message, variant = "info") {
      console.log(`[ClientMaintenance] showToast called: "${message}" (${variant})`);
      
      // Map variant names to consistent types
      const typeMap = { success: "success", danger: "error", warning: "warning", info: "info", error: "error" };
      const type = typeMap[variant] || "info";

      // Use NotificationService if available (same as account-maintenance)
      if (window.NotificationService && typeof window.NotificationService.showToast === 'function') {
        console.log('[ClientMaintenance] Using NotificationService');
        window.NotificationService.showToast(message, type, 5000);
        return;
      }
      
      console.log('[ClientMaintenance] Using fallback toast');

      // Fallback to CSS-based toast implementation
      const container = document.getElementById("toastContainer");
      if (!container) {
        console.error('[ClientMaintenance] Toast container not found in DOM!');
        return;
      }

      // Ensure container is properly positioned and visible
      if (!container.style.position || container.style.position === 'absolute') {
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.zIndex = '9999';
        container.style.pointerEvents = 'none';
        console.log('[ClientMaintenance] Applied positioning to toast container');
      }

      // Create toast element
      const toast = document.createElement("div");
      toast.className = `toast toast-${type}`;
      toast.style.cssText = `
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#17a2b8'};
        color: white;
        padding: 16px 20px;
        margin-bottom: 10px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 300px;
        max-width: 500px;
        pointer-events: auto;
        animation: slideInRight 0.3s ease-out;
        font-size: 14px;
        font-weight: 500;
      `;

      // Icon mapping
      const icons = {
        success: "bi-check-circle-fill",
        error: "bi-exclamation-circle-fill",
        warning: "bi-exclamation-triangle-fill",
        info: "bi-info-circle-fill"
      };
      const icon = icons[type] || icons.info;

      toast.innerHTML = `
        <i class="bi ${icon}" style="font-size: 20px;"></i>
        <div style="flex: 1;">${message}</div>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0; line-height: 1;">&times;</button>
      `;

      container.appendChild(toast);
      console.log('[ClientMaintenance] Toast element added to container with inline styles');

      // Auto-remove after 5 seconds
      setTimeout(() => {
        toast.classList.add("hiding");
        setTimeout(() => toast.remove(), 200);
      }, 5000);

      // Close button
      toast.querySelector(".toast-close")?.addEventListener("click", () => {
        toast.classList.add("hiding");
        setTimeout(() => toast.remove(), 200);
      });
    }

    /**
     * Track recent activity for a loaded client or application
     * @param {string} recordId - ClientID or ApplicationID (RequestID)
     * @param {boolean} isPipelineApp - Whether this is a pipeline application
     */
    async trackRecentActivity(recordId, isPipelineApp = false) {
      const RecentActivityService = global.RecentActivityService;
      if (!RecentActivityService) {
        console.warn("[ClientMaintenance] RecentActivityService not available");
        return;
      }

      if (!recordId) {
        console.warn("[ClientMaintenance] No record ID provided for activity tracking");
        return;
      }

      try {
        // Get session data
        const session = this.session || global.getAuthSession?.() || {};
        const branchId = session.branchId || session.OurBranchID || "002";
        const operatorId = session.operatorId || session.OperatorID || "web_portal";

        // Format AccessedFields as key:value (e.g., "ClientID:C00001" or "ApplicationID:REQ123")
        const fieldKey = isPipelineApp ? "ApplicationID" : "ClientID";
        const accessedFields = `${fieldKey}:${recordId}`;

        const result = await RecentActivityService.addRecentActivity({
          OurBranchID: branchId,
          LoggedInOperator: operatorId,
          ModuleID: "1000", // Client Management module
          AccessedFields: accessedFields
        });

        if (result.success) {
          console.log(`[ClientMaintenance] Recent activity tracked: ${accessedFields}`);
          // Refresh the recent activities list
          this.loadRecentActivities();
        } else {
          console.warn("[ClientMaintenance] Failed to track recent activity:", result.message);
        }
      } catch (error) {
        console.error("[ClientMaintenance] Error tracking recent activity:", error);
      }
    }

    /**
     * Load and display recent activities in the sidebar
     */
    async loadRecentActivities() {
      const RecentActivityService = global.RecentActivityService;
      if (!RecentActivityService) {
        console.warn("[ClientMaintenance] RecentActivityService not available");
        return;
      }

      try {
        // Get session data
        const session = this.session || global.getAuthSession?.() || {};
        const branchId = session.branchId || session.OurBranchID || "002";
        const operatorId = session.operatorId || session.OperatorID || "web_portal";

        const result = await RecentActivityService.getRecentActivities({
          OurBranchID: branchId,
          OperatorID: operatorId,
          ModuleID: "1000" // Client Management module
        });

        if (result.success && result.data) {
          console.log(`[ClientMaintenance] Retrieved ${Array.isArray(result.data) ? result.data.length : 0} recent activities`);
          this.displayRecentActivities(result.data);
        } else {
          console.warn("[ClientMaintenance] Failed to load recent activities:", result.message);
        }
      } catch (error) {
        console.error("[ClientMaintenance] Error loading recent activities:", error);
      }
    }

    /**
     * Display recent activities in the sidebar
     * @param {Array} activities - Array of recent activity records
     */
    displayRecentActivities(activities) {
      const container = document.querySelector('[data-recent-activities-container]');
      
      if (!container) {
        console.warn("[ClientMaintenance] Recent activities container not found");
        return;
      }

      if (!Array.isArray(activities) || activities.length === 0) {
        container.innerHTML = `
          <div class="sidebar-item sidebar-item--static sidebar-item--enhanced">
            <div class="sidebar-item__content">
              <i class="bi bi-clock sidebar-item__icon"></i>
              <div class="sidebar-item__text">
                <div class="sidebar-item__title">No recent activities</div>
                <div class="sidebar-item__description">Access records to see them here</div>
              </div>
            </div>
          </div>
        `;
        console.log("[ClientMaintenance] No recent activities to display");
        return;
      }

      // Build HTML for all activities
      const activitiesHtml = activities.map(activity => {
        // Parse AccessedFields (format: "ClientID:C00001" or "ApplicationID:REQ123")
        const accessedFields = activity.AccessedFields || activity.accessedFields || "";
        const [fieldKey, fieldValue] = accessedFields.split(":");
        const narration = activity.Narration || activity.narration || "";

        if (!fieldKey || !fieldValue) {
          return ''; // Skip invalid entries
        }

        // Determine icon based on type
        const icon = fieldKey === "ClientID" ? "person-vcard" : "file-earmark-text";
        const label = fieldKey === "ClientID" ? "Client" : "Application";

        return `
          <div class="sidebar-item sidebar-item--static sidebar-item--enhanced" 
               data-activity-key="${fieldKey}" 
               data-activity-value="${fieldValue}"
               style="cursor: pointer;">
            <div class="sidebar-item__content">
              <i class="bi bi-${icon} sidebar-item__icon"></i>
              <div class="sidebar-item__text">
                <div class="sidebar-item__title">${fieldValue}</div>
                <div class="sidebar-item__description">${narration || label}</div>
              </div>
            </div>
          </div>
        `;
      }).filter(html => html).join('');

      container.innerHTML = activitiesHtml;

      // Add click handlers to all activity items
      container.querySelectorAll('[data-activity-key]').forEach(item => {
        const fieldKey = item.dataset.activityKey;
        const fieldValue = item.dataset.activityValue;
        item.addEventListener('click', () => this.loadRecentRecord(fieldKey, fieldValue));
      });

      console.log(`[ClientMaintenance] Displayed ${activities.length} recent activities`);
    }

    /**
     * Load a record from recent activities
     * @param {string} fieldKey - "ClientID" or "ApplicationID"
     * @param {string} fieldValue - The ID value
     */
    async loadRecentRecord(fieldKey, fieldValue) {
      console.log(`[ClientMaintenance] Loading recent record: ${fieldKey}:${fieldValue}`);

      try {
        // Set page to View mode
        this.state.pageFunction = "View";
        this.syncActionButtons();

        if (fieldKey === "ClientID") {
          // Load as client
          await this.loadClient(fieldValue);
        } else if (fieldKey === "ApplicationID") {
          // Load as pipeline application - set up state properly
          this.state.isPipelineApplication = true;
          this.state.stepperRequestId = fieldValue;
          this.state.requestCode = "";

          // Clear ClientID field and set ApplicationID field
          if (this.form.elements.ClientID) {
            this.form.elements.ClientID.value = "";
          }
          
          const applicationIdField = document.getElementById("ApplicationID") || this.form.elements.ApplicationID;
          if (applicationIdField) {
            applicationIdField.value = fieldValue;
          }

          // Update summary display
          this.updateSummaryMeta();

          // Load the pipeline application data
          await this.loadPipelineApplication(fieldValue);
        }
      } catch (error) {
        console.error("[ClientMaintenance] Error loading recent record:", error);
        this.showToast(`Failed to load ${fieldKey}: ${fieldValue}`, "danger");
      }
    }

    /**
     * Handle supervision button click (Approve/Reject workflow)
     */
    async handleSupervision() {
      const ClientApprovalService = global.ClientApprovalService;
      if (!ClientApprovalService) {
        this.showToast("Approval service not available", "danger");
        return;
      }

      const clientId = this.form.elements.ClientID?.value?.trim();
      if (!clientId) {
        this.showToast("No client loaded for supervision", "warning");
        return;
      }

      // Show approve/reject options using SweetAlert2
      const result = await Swal.fire({
        title: 'Client Supervision',
        html: `
          <p>What action would you like to perform on <strong>${clientId}</strong>?</p>
        `,
        icon: 'question',
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: '<i class="bi bi-check-circle"></i> Approve',
        denyButtonText: '<i class="bi bi-x-circle"></i> Reject',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#28a745',
        denyButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d'
      });

      if (result.isConfirmed) {
        await this.approveClient(clientId);
      } else if (result.isDenied) {
        // Longer delay to ensure SweetAlert2 is fully closed and backdrop removed
        setTimeout(() => {
          this.showRejectModal(clientId);
        }, 200);
      }
    }

    /**
     * Approve a client
     * @param {string} clientId - Display client ID (for toast messages)
     */
    async approveClient(clientId) {
      const ClientApprovalService = global.ClientApprovalService;
      const session = this.session || global.getAuthSession?.() || {};
      const operatorId = session.operatorId || session.OperatorID || "web_portal";

      // Both RequestID and ClientID use the workflow request ID per API requirement
      const requestId = this.state.stepperRequestId;

      try {
        this.showToast("Approving client...", "info");

        const response = await ClientApprovalService.approveClient({
          RequestID: requestId,  // Workflow request ID (e.g., "p7c2ohttrml7z4irw")
          ClientID: requestId,   // Same as RequestID per API requirement
          ApprovedBy: operatorId
        });

        if (response.success) {
          this.showToast(`Client ${clientId} approved successfully!`, "success");
          // Reload the client to reflect new status
          await this.loadClient(clientId);
        } else {
          this.showToast(response.message || "Failed to approve client", "danger");
        }
      } catch (error) {
        console.error("[ClientMaintenance] Error approving client:", error);
        this.showToast("Error approving client", "danger");
      }
    }

    /**
     * Show reject modal to collect rejection remarks
     * @param {string} clientId - Display client ID (for toast messages)
     */
    showRejectModal(clientId) {
      const modal = document.getElementById('clientRejectionModal');
      if (!modal) {
        console.error("[ClientMaintenance] Rejection modal not found");
        return;
      }

      // Both RequestID and ClientID use the workflow request ID per API requirement
      const requestId = this.state.stepperRequestId;

      // Populate hidden fields - both use workflow request ID
      document.getElementById('rejectClientID').value = requestId;   // Same as RequestID (e.g., "p7c2ohttrml7z4irw")
      document.getElementById('rejectRequestID').value = requestId;  // Workflow request ID
      document.getElementById('rejectWFStageID').value = ""; // Set if you have workflow stage

      // Clear previous remarks
      document.getElementById('rejectRemarks').value = "";

      // Aggressive cleanup - remove all backdrops and reset body multiple times
      const forceCleanup = () => {
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
        document.querySelectorAll('.swal2-container').forEach(container => container.remove());
        document.body.classList.remove('modal-open', 'swal2-shown', 'swal2-height-auto');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      };

      forceCleanup();
      // Force cleanup again after a brief moment
      setTimeout(forceCleanup, 50);

      // Show modal with proper backdrop management
      const bootstrapModal = bootstrap.Modal.getOrCreateInstance(modal, {
        backdrop: 'static',
        keyboard: false
      });

      // Add event listener for when modal is hidden
      const handleHidden = () => {
        // Ensure cleanup of backdrop and body classes
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        modal.removeEventListener('hidden.bs.modal', handleHidden);
      };

      modal.addEventListener('hidden.bs.modal', handleHidden);

      bootstrapModal.show();
    }

    /**
     * Reject a client with remarks
     * @param {object} params - Rejection parameters
     */
    async rejectClient(params) {
      const ClientApprovalService = global.ClientApprovalService;
      const session = this.session || global.getAuthSession?.() || {};
      const operatorId = session.operatorId || session.OperatorID || "web_portal";

      // Get the display ClientID from form for reload purposes
      const displayClientId = this.form.elements.ClientID?.value?.trim();

      try {
        this.showToast("Rejecting client...", "info");

        const response = await ClientApprovalService.rejectClient({
          RequestID: params.RequestID || "",  // Workflow request ID (e.g., "p7c2ohttrml7z4irw")
          ClientID: params.ClientID,          // Same as RequestID per API requirement
          WFStageID: params.WFStageID || "",
          RejectRemarks: params.RejectRemarks,
          RejectedBy: operatorId
        });

        if (response.success) {
          this.showToast(`Client rejected successfully!`, "success");
          // Close modal properly
          const modalEl = document.getElementById('clientRejectionModal');
          const modal = bootstrap.Modal.getInstance(modalEl);
          if (modal) {
            modal.hide();
          }
          // Ensure cleanup
          setTimeout(() => {
            document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
          }, 300);
          // Reload the client to reflect new status using display ClientID
          if (displayClientId) {
            await this.loadClient(displayClientId);
          }
        } else {
          this.showToast(response.message || "Failed to reject client", "danger");
          // Close modal on failure
          const modalEl = document.getElementById('clientRejectionModal');
          const modal = bootstrap.Modal.getInstance(modalEl);
          if (modal) {
            modal.hide();
          }
          setTimeout(() => {
            document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
          }, 300);
        }
      } catch (error) {
        console.error("[ClientMaintenance] Error rejecting client:", error);
        this.showToast("Error rejecting client", "danger");
        // Close modal on error
        const modalEl = document.getElementById('clientRejectionModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) {
          modal.hide();
        }
        setTimeout(() => {
          document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
          document.body.classList.remove('modal-open');
          document.body.style.overflow = '';
          document.body.style.paddingRight = '';
        }, 300);
      }
    }
  }

  function initClientMaintenancePage() {
    if (!dependenciesReady) {
      console.warn('[ClientMaintenance] Dependencies not ready yet, waiting...');
      setTimeout(initClientMaintenancePage, 100);
      return;
    }

    const pageId = document.body.dataset.page;
    const supportedPages = ["client", "client-maintenance"];
    if (!supportedPages.includes(pageId)) return;

    new ClientMaintenancePage();
  }

})(window);

// ===================================
// MODERN UI SUBMODULE COMPATIBILITY
// ===================================
(function () {

  const CHILD_FORMS = {
    'address': 'DataEntry/client-address.html',
    'introducer': 'DataEntry/introducer.html',
    'bank-accounts': 'bank-accounts.html',
    'relation': 'relation.html',
    'client-profile': 'client-profile-change.html',
    'demise': 'demise-details.html',
    'udf1': 'udf1.html',
    'udf2': 'udf2.html',
    'udf3': 'udf3.html',
    'identity': 'client-identity-types.html',
    'signature-photo': 'signature-photo.html',
    'client-portfolio': 'client-portfolio.html',
    'recent-activities': 'recent-activities.html'
  };

  function getOverlayEls() {
    return {
      overlay: document.querySelector('[data-child-inline]'),
      iframe: document.querySelector('[data-child-iframe]'),
      mainForm: document.getElementById('client-form'),
      mainContainer: document.querySelector('.main-container')
    };
  }

  function setOverlayOpen(isOpen) {
    const { overlay, mainForm, mainContainer } = getOverlayEls();
    if (!overlay || !mainContainer) return;

    if (isOpen) {
      mainContainer.classList.add('child-opening');
      overlay.hidden = false;
      overlay.removeAttribute('hidden');

      setTimeout(() => {
        mainContainer.classList.add('child-open');
        overlay.classList.add('is-visible');
        overlay.classList.remove('is-closing');

        setTimeout(() => {
          mainContainer.classList.remove('child-opening');
          if (mainForm) mainForm.hidden = true;
        }, 350);
      }, 50);
    } else {
      mainContainer.classList.add('child-closing');
      mainContainer.classList.remove('child-expanded');
      overlay.classList.add('is-closing');
      overlay.classList.remove('is-visible');

      if (mainForm) mainForm.hidden = false;

      setTimeout(() => {
        overlay.hidden = true;
        overlay.setAttribute('hidden', '');
        mainContainer.classList.remove('child-open', 'child-closing');
      }, 350);
    }
  }

  function openChildForm(childKey) {
    let path = CHILD_FORMS[childKey];
    if (!path) {
      path = childKey + '.html';
      console.warn('[ClientMaintenance] Key not found, trying fallback:', path);
    }

    const { iframe } = getOverlayEls();
    if (!iframe) return;

    iframe.src = path + '?v=' + Date.now();
    setOverlayOpen(true);
  }

  function closeChildForm() {
    const { iframe } = getOverlayEls();
    if (iframe) iframe.src = 'about:blank';
    setOverlayOpen(false);
  }

  function toggleChildExpand() {
    const mainContainer = document.querySelector('.main-container');
    if (mainContainer) {
      mainContainer.classList.toggle('child-expanded');
    }
  }

  function setSectionOpen(sectionEl, isOpen) {
    if (!sectionEl) return;

    sectionEl.classList.toggle('is-open', Boolean(isOpen));
    sectionEl.classList.toggle('expanded', Boolean(isOpen));

    const toggle = sectionEl.querySelector('.nav-arrow, .nav-arrow--card');
    const items = sectionEl.querySelector('.nav-items, .nav-items--card');
    const icon = toggle?.querySelector('i');

    if (toggle) {
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }

    if (items) {
      items.removeAttribute('hidden');
      if (isOpen) {
        items.classList.add('is-visible');
        items.style.pointerEvents = 'auto';
      } else {
        items.classList.remove('is-visible');
        items.style.pointerEvents = 'none';
        setTimeout(() => {
          if (!sectionEl.classList.contains('is-open')) {
            items.setAttribute('hidden', '');
          }
        }, 400);
      }
    }

    if (icon) {
      icon.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
    }
  }

  function wireNavSections() {
    const sections = Array.from(document.querySelectorAll('[data-nav-section]'));
    if (!sections.length) return;

    sections.forEach(section => {
      const header = section.querySelector('.nav-header, .nav-header--card');
      if (!header) return;

      header.addEventListener('click', function (e) {
        if (e.target.closest('.nav-badge') && !e.target.closest('.nav-arrow')) return;

        const sidebar = document.getElementById('main-sidebar');
        const mainContainer = document.querySelector('.main-container');
        const toggle = document.getElementById('sidebarToggle');
        const isCollapsed = sidebar && sidebar.classList.contains('collapsed');

        if (isCollapsed) {
          sidebar.classList.remove('collapsed');
          if (mainContainer) mainContainer.classList.remove('sidebar-collapsed');
          if (toggle) toggle.setAttribute('aria-expanded', 'true');

          sections.forEach(s => setSectionOpen(s, false));
          setSectionOpen(section, true);
          return;
        }

        const willOpen = !section.classList.contains('is-open');
        sections.forEach(s => {
          if (s !== section) setSectionOpen(s, false);
        });
        setSectionOpen(section, willOpen);
      });
    });

    sections.forEach(section => {
      setSectionOpen(section, section.classList.contains('is-open'));
    });
  }

  function wireSidebarToggle() {
    const sidebar = document.getElementById('main-sidebar');
    const toggle = document.getElementById('sidebarToggle');
    const mainContainer = document.querySelector('.main-container');
    if (!sidebar || !toggle) return;

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      e.preventDefault();
      const isCollapsed = sidebar.classList.contains('collapsed');

      if (isCollapsed) {
        sidebar.classList.remove('collapsed');
        if (mainContainer) mainContainer.classList.remove('sidebar-collapsed');
        toggle.setAttribute('aria-expanded', 'true');

        document.querySelectorAll('.nav-section--card').forEach(section => {
          const items = section.querySelector('.nav-items--card');
          if (items && section.classList.contains('is-open')) {
            items.removeAttribute('hidden');
            items.classList.add('is-visible');
          }
        });
      } else {
        sidebar.classList.add('collapsed');
        if (mainContainer) mainContainer.classList.add('sidebar-collapsed');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function wireSidebar() {
    const items = document.querySelectorAll('.sidebar-item[data-child-form], .sidebar-item--enhanced[data-child-form]');
    items.forEach(item => {
      item.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        const sidebar = document.getElementById('main-sidebar');
        const mainContainer = document.querySelector('.main-container');
        const toggle = document.getElementById('sidebarToggle');
        const isCollapsed = sidebar && sidebar.classList.contains('collapsed');

        if (isCollapsed) {
          sidebar.classList.remove('collapsed');
          if (mainContainer) mainContainer.classList.remove('sidebar-collapsed');
          if (toggle) toggle.setAttribute('aria-expanded', 'true');

          const parentSection = this.closest('.nav-section--card');
          if (parentSection) {
            document.querySelectorAll('.nav-section--card').forEach(s => setSectionOpen(s, false));
            setSectionOpen(parentSection, true);
          }
        }

        items.forEach(i => i.classList.remove('active'));
        this.classList.add('active');

        const childKey = this.getAttribute('data-child-form');
        if (childKey) openChildForm(childKey);
      });
    });
  }

  function wireOverlayControls() {
    const closeBtn = document.getElementById('closeChildBtn');
    const maximizeBtn = document.getElementById('maximizeChildBtn');

    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeChildForm();
      });
    }

    if (maximizeBtn) {
      maximizeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleChildExpand();
        const icon = maximizeBtn.querySelector('i');
        if (icon) {
          const isExpanded = document.querySelector('.main-container').classList.contains('child-expanded');
          icon.className = isExpanded ? 'bi bi-fullscreen-exit' : 'bi bi-arrows-fullscreen';
        }
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const overlay = document.querySelector('[data-child-inline]');
        if (overlay && !overlay.hidden) {
          closeChildForm();
        }
      }
    });
  }

  function wireCollapsibleSections() {
    document.querySelectorAll('.form-section[data-section]').forEach(section => {
      const header = section.querySelector('[data-section-toggle]');
      const content = section.querySelector('[data-section-content]');
      const toggleBtn = section.querySelector('.section-toggle-btn');

      if (!header || !content) return;

      header.addEventListener('click', function (e) {
        // Don't toggle if clicking on a button (except the toggle button itself)
        if (e.target.closest('button') && !e.target.closest('.section-toggle-btn')) return;

        const isCollapsed = section.classList.contains('collapsed');

        if (isCollapsed) {
          // Expand
          section.classList.remove('collapsed');
          if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
        } else {
          // Collapse
          section.classList.add('collapsed');
          if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
        }
      });
    });
  }

  function wireSubmoduleSearch() {
    const input = document.getElementById('submoduleSearch');
    const clearBtn = document.getElementById('submoduleSearchClear');
    if (!input) return;

    input.addEventListener('input', function () {
      const query = this.value.toLowerCase().trim();
      if (clearBtn) clearBtn.hidden = !query;

      document.querySelectorAll('.sidebar-item').forEach(item => {
        const text = item.textContent.toLowerCase();
        const matches = text.includes(query);
        item.classList.toggle('hidden', !matches);
      });
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        input.value = '';
        input.dispatchEvent(new Event('input'));
      });
    }
  }

  function wireMessageListener() {
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'CLOSE_DATAENTRY') {
        closeChildForm();
      }
    });
  }

  // Initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      wireSidebar();
      wireNavSections();
      wireSidebarToggle();
      wireOverlayControls();
      wireCollapsibleSections();
      wireSubmoduleSearch();
      wireMessageListener();
    });
  } else {
    wireSidebar();
    wireNavSections();
    wireSidebarToggle();
    wireOverlayControls();
    wireCollapsibleSections();
    wireSubmoduleSearch();
    wireMessageListener();
  }
})();