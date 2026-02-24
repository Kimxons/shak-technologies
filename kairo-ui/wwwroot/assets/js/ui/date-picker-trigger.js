(() => {
  if (window.__kairoDatePickerTriggerLoaded) return;
  window.__kairoDatePickerTriggerLoaded = true;

  function findDateInputFromTrigger(triggerEl) {
    const group = triggerEl.closest('.input-group');
    if (group) {
      const input = group.querySelector('input[data-date-picker], input[type="date"]');
      if (input) return input;
    }

    const label = triggerEl.closest('label');
    if (label && label.htmlFor) {
      const input = document.getElementById(label.htmlFor);
      if (input && input.matches && input.matches('input[data-date-picker], input[type="date"]')) return input;
    }

    const container = triggerEl.closest('.rd-field, .rd-bottom-row, .cbs-field, .cop-row');
    if (container) {
      const input = container.querySelector('input[data-date-picker], input[type="date"]');
      if (input) return input;
    }

    return null;
  }

  function openPicker(input) {
    if (!input) return;

    // Flatpickr (preferred)
    if (input._flatpickr && typeof input._flatpickr.open === 'function') {
      try {
        input._flatpickr.open();
        return;
      } catch {
        // fall through
      }
    }

    // Focus is the most compatible way.
    input.focus();

    // Chromium supports showPicker() for date inputs.
    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker();
        return;
      } catch {
        // fall through
      }
    }

    // Fallback: clicking sometimes opens the picker.
    try {
      input.click();
    } catch {
      // no-op
    }
  }

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-date-trigger]');
    if (!trigger) return;

    const input = findDateInputFromTrigger(trigger);
    openPicker(input);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;

    const trigger = e.target.closest?.('[data-date-trigger]');
    if (!trigger) return;

    e.preventDefault();
    const input = findDateInputFromTrigger(trigger);
    openPicker(input);
  });
})();
