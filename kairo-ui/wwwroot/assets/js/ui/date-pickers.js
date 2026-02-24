// Standalone date picker support for iframe/embedded module pages.
// Displays dates as "07 Jan 2026" while storing ISO "YYYY-MM-DD".
(function (global) {
  'use strict';

  let flatpickrLoadPromise = null;

  function ensureFlatpickrLoaded(doc) {
    const w = doc.defaultView || global;
    if (w.flatpickr) return Promise.resolve(true);
    if (flatpickrLoadPromise) return flatpickrLoadPromise;

    flatpickrLoadPromise = new Promise((resolve, reject) => {
      try {
        // Inject CSS once
        if (!doc.querySelector('link[data-flatpickr-css="true"]')) {
          const link = doc.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css';
          link.setAttribute('data-flatpickr-css', 'true');
          doc.head?.appendChild(link);
        }

        // Inject JS once
        const existing = doc.querySelector('script[data-flatpickr-js="true"]');
        if (existing) {
          const check = () => {
            if (w.flatpickr) return resolve(true);
            setTimeout(check, 50);
          };
          check();
          return;
        }

        const script = doc.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/flatpickr';
        script.defer = true;
        script.setAttribute('data-flatpickr-js', 'true');
        script.onload = () => resolve(Boolean(w.flatpickr));
        script.onerror = () => reject(new Error('Failed to load flatpickr'));
        doc.head?.appendChild(script);
      } catch (e) {
        reject(e);
      }
    });

    return flatpickrLoadPromise;
  }

  function initDatePickers(doc) {
    // Skip initialization if explicitly disabled on this page
    if (typeof window.DISABLE_FLATPICKR !== 'undefined' && window.DISABLE_FLATPICKR === true) {
      console.log('[DatePickers] Flatpickr initialization disabled on this page');
      return;
    }
    
    // Skip initialization if this is a sub-document with no-flatpickr inputs
    const noFlatpickrInputs = Array.from(doc.querySelectorAll('[data-no-flatpickr]'));
    if (noFlatpickrInputs.length > 0) {
      console.log('[DatePickers] Found inputs with data-no-flatpickr, removing any data-date-picker attributes');
      for (const el of noFlatpickrInputs) {
        el.removeAttribute('data-date-picker');
      }
    }
    
    const isDateFieldName = (value) => /date/i.test(String(value || ''));

    const isAuditDateFieldName = (value) => {
      const v = String(value || '').trim().toLowerCase();
      if (!v) return false;
      return (
        v === 'createdon' ||
        v === 'modifiedon' ||
        v === 'supervisedon' ||
        v === 'approvedon' ||
        v === 'authorizedon' ||
        v === 'authorisedon' ||
        v === 'createddate' ||
        v === 'modifieddate'
      );
    };

    const formatDdMmmYyyy = (dt) => {
      const day = String(dt.getDate()).padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mon = months[dt.getMonth()] || 'Jan';
      return `${day} ${mon} ${dt.getFullYear()}`;
    };

    const parseAnyDate = (value) => {
      const s = String(value || '').trim();
      if (!s) return null;

      const isoDate = /^\d{4}-\d{2}-\d{2}$/;
      if (isoDate.test(s)) {
        const [y, m, d] = s.split('-').map((v) => parseInt(v, 10));
        const dt = new Date(y, m - 1, d);
        return Number.isNaN(dt.getTime()) ? null : dt;
      }

      let dt = new Date(s);
      if (!Number.isNaN(dt.getTime())) return dt;

      const slashed = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/;
      const m1 = s.match(slashed);
      if (m1) {
        const d = parseInt(m1[1], 10);
        const m = parseInt(m1[2], 10);
        let y = parseInt(m1[3], 10);
        if (y < 100) y += 2000;
        dt = new Date(y, m - 1, d);
        return Number.isNaN(dt.getTime()) ? null : dt;
      }

      const ddMmm = /^(\d{1,2})\/[A-Za-z]{3}\/(\d{2}|\d{4})$/;
      if (ddMmm.test(s)) {
        const normalized = s.replace(/\//g, ' ');
        dt = new Date(normalized);
        return Number.isNaN(dt.getTime()) ? null : dt;
      }

      return null;
    };

    const decorateAuditDateFields = () => {
      const valueDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      const originalGet = valueDescriptor?.get;
      const originalSet = valueDescriptor?.set;
      if (!originalGet || !originalSet) return;

      const inputs = Array.from(doc.querySelectorAll('input[type="text"], input:not([type])'));
      for (const el of inputs) {
        const id = el.getAttribute('id') || '';
        const name = el.getAttribute('name') || '';
        if (!isAuditDateFieldName(id) && !isAuditDateFieldName(name)) continue;
        if (el.dataset.kairoAuditDate === 'true') continue;

        el.dataset.kairoAuditDate = 'true';
        const initialRaw = String(originalGet.call(el) || '');

        Object.defineProperty(el, 'value', {
          configurable: true,
          enumerable: true,
          get() {
            return String(this.dataset.kairoRawValue ?? '');
          },
          set(v) {
            const raw = v == null ? '' : String(v);
            this.dataset.kairoRawValue = raw;
            const dt = parseAnyDate(raw);
            const display = dt ? formatDdMmmYyyy(dt) : raw;
            originalSet.call(this, display);
          }
        });

        el.value = initialRaw;
      }
    };

    const isPlaceholderText = (text) => {
      const t = String(text || '').trim().toLowerCase();
      if (!t) return true;
      return t === '--select--' || t === 'select' || t.includes('select');
    };

    const isDateLikeText = (text) => {
      const t = String(text || '').trim();
      if (!t) return false;
      return (
        /^\d{4}-\d{2}-\d{2}$/.test(t) ||
        /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(t) ||
        /^\d{1,2}\/[A-Za-z]{3}\/(\d{2}|\d{4})$/.test(t)
      );
    };

    const upgradeLegacyDateSelects = () => {
      const selects = Array.from(doc.querySelectorAll('select'));
      for (const sel of selects) {
        const id = sel.getAttribute('id') || '';
        const name = sel.getAttribute('name') || '';
        if (!isDateFieldName(id) && !isDateFieldName(name)) continue;
        if (sel.disabled) continue;

        const options = Array.from(sel.options || []);
        if (options.length > 3) continue;

        const optionTexts = options.map((o) => (o.textContent || '').trim());
        const hasNonPlaceholder = optionTexts.some((t) => !isPlaceholderText(t));
        const hasRealList = options.some((o) => (o.value || '').trim() && !isPlaceholderText(o.textContent));
        if (hasRealList) continue;

        if (!hasNonPlaceholder || optionTexts.every((t) => isPlaceholderText(t) || isDateLikeText(t))) {
          const input = doc.createElement('input');
          input.type = 'text';
          if (id) input.id = id;
          if (name) input.name = name;

          input.className = (sel.className || '').replace(/\bform-select\b/g, 'form-control').trim() || 'form-control';
          if (sel.hasAttribute('required')) input.setAttribute('required', '');
          if (sel.getAttribute('aria-label')) input.setAttribute('aria-label', sel.getAttribute('aria-label'));
          if (sel.getAttribute('aria-describedby')) input.setAttribute('aria-describedby', sel.getAttribute('aria-describedby'));

          for (const [k, v] of Object.entries(sel.dataset || {})) {
            input.dataset[k] = v;
          }

          input.setAttribute('data-date-picker', '');
          input.setAttribute('placeholder', 'dd mmm yyyy');

          const dateLike = optionTexts.find((t) => isDateLikeText(t));
          if (dateLike && !isPlaceholderText(dateLike) && dateLike !== '01/Jan/0001') {
            input.value = dateLike;
          }

          sel.replaceWith(input);
        }
      }
    };

    const upgradeNativeDateInputs = () => {
      const dateInputs = Array.from(doc.querySelectorAll('input[type="date"]'));
      for (const input of dateInputs) {
        // Skip inputs marked with data-no-flatpickr
        if (input.hasAttribute('data-no-flatpickr')) continue;
        if (input.hasAttribute('data-date-picker')) continue;
        if (input.hasAttribute('data-native-date')) continue;
        input.type = 'text';
        input.setAttribute('data-date-picker', '');
        if (!input.getAttribute('placeholder')) input.setAttribute('placeholder', 'dd mmm yyyy');
      }
    };

    upgradeLegacyDateSelects();
    upgradeNativeDateInputs();

    // Format audit fields like CreatedOn/ModifiedOn/SupervisedOn while preserving raw values.
    decorateAuditDateFields();

    for (const el of Array.from(doc.querySelectorAll('input[type="text"], input:not([type])'))) {
      const id = el.getAttribute('id') || '';
      const name = el.getAttribute('name') || '';
      if (!isDateFieldName(id) && !isDateFieldName(name)) continue;
      // Skip inputs marked with data-native-date or data-no-flatpickr
      if (el.hasAttribute('data-native-date')) continue;
      if (el.hasAttribute('data-no-flatpickr')) continue;
      if (!el.hasAttribute('data-date-picker')) {
        el.setAttribute('data-date-picker', '');
        if (!el.getAttribute('placeholder')) el.setAttribute('placeholder', 'dd mmm yyyy');
      }
    }

    const inputs = Array.from(doc.querySelectorAll('input[data-date-picker]')).filter(
      el => !el.hasAttribute('data-no-flatpickr')
    );
    if (inputs.length === 0) return;

    ensureFlatpickrLoaded(doc)
      .then((ok) => {
        const w = doc.defaultView || global;
        if (!ok || !w.flatpickr) {
          for (const el of inputs) {
            if (el.type === 'text') el.type = 'date';
          }
          return;
        }

        for (const el of inputs) {
          // Skip inputs marked with data-no-flatpickr
          if (el.hasAttribute('data-no-flatpickr')) continue;
          
          // If another script already initialized flatpickr, enforce the display format.
          if (el._flatpickr) {
            try {
              el._flatpickr.set('altFormat', 'D M Y');
            } catch (_e) {
              // ignore
            }
            continue;
          }

          const parseDate = (dateString) => {
            const s = String(dateString || '').trim();
            if (!s) return null;

            const iso = /^\d{4}-\d{2}-\d{2}$/;
            if (iso.test(s)) {
              const parts = s.split('-').map((v) => parseInt(v, 10));
              const dt = new Date(parts[0], parts[1] - 1, parts[2]);
              return Number.isNaN(dt.getTime()) ? null : dt;
            }

            const slashed = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/;
            const m1 = s.match(slashed);
            if (m1) {
              const d = parseInt(m1[1], 10);
              const m = parseInt(m1[2], 10);
              let y = parseInt(m1[3], 10);
              if (y < 100) y += 2000;
              const dt = new Date(y, m - 1, d);
              return Number.isNaN(dt.getTime()) ? null : dt;
            }

            const ddMmmYyyy = /^(\d{1,2})\/[A-Za-z]{3}\/(\d{2}|\d{4})$/;
            const m2 = s.match(ddMmmYyyy);
            if (m2) {
              const d = parseInt(m2[1], 10);
              let y = parseInt(m2[2], 10);
              if (y < 100) y += 2000;
              const monthStr = s.split('/')[1].toLowerCase();
              const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
              const mi = months.indexOf(monthStr);
              if (mi >= 0) {
                const dt = new Date(y, mi, d);
                return Number.isNaN(dt.getTime()) ? null : dt;
              }
            }

            const dt = new Date(s);
            return Number.isNaN(dt.getTime()) ? null : dt;
          };

          const formatDate = (date, format) => {
            if (!date) return '';
            const d = new Date(date);
            if (Number.isNaN(d.getTime())) return '';

            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');

            // Return ISO format (YYYY-MM-DD) for storage
            return `${year}-${month}-${day}`;
          };
          
          // Custom formatting function for display (DD-MMM-YYYY)
          const formatDateForDisplay = (date) => {
            if (!date) return '';
            const d = new Date(date);
            if (Number.isNaN(d.getTime())) return '';
            
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const day = String(d.getDate()).padStart(2, '0');
            const month = months[d.getMonth()];
            const year = d.getFullYear();
            
            return `${day}-${month}-${year}`;
          };

          w.flatpickr(el, {
            allowInput: !(el.hasAttribute('readonly') || el.disabled),
            dateFormat: 'Y-m-d',
            altInput: true,
            altFormat: 'd-M-Y',
            altInputClass: el.className || 'form-control',
            parseDate,
            formatDate,
            disableMobile: true,
            monthSelectorType: 'dropdown',
            clickOpens: !(el.hasAttribute('readonly') || el.disabled),
            onReady: (_selectedDates, _dateStr, instance) => {
              if (instance?.altInput) {
                instance.altInput.readOnly = el.hasAttribute('readonly');
                instance.altInput.disabled = el.disabled;
                if (el.getAttribute('aria-label')) instance.altInput.setAttribute('aria-label', el.getAttribute('aria-label'));
                if (el.getAttribute('aria-describedby')) instance.altInput.setAttribute('aria-describedby', el.getAttribute('aria-describedby'));
                
                // Format months as uppercase
                instance.config.formatDate = (date, formatStr) => {
                  return formatDateForDisplay(date);
                };
              }
            }
          });
        }
      })
      .catch((err) => {
        console.warn('[DatePicker] Failed to initialize date pickers', err);
      });
  }

  function init() {
    const doc = global.document;
    if (!doc) return;
    initDatePickers(doc);
  }

  global.KairoDatePickers = global.KairoDatePickers || { init };

  if (global.document?.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
