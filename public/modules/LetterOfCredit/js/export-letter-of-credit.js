(function () {
  'use strict';

  const MODE = {
    VIEW: 'View',
    ADD: 'Add',
    UPDATE: 'Update'
  };

  const state = {
    mode: MODE.VIEW,
    activeStep: 'details'
  };

  const showToast = (message, variant = 'success') => {
    const toast = document.getElementById('formToast');
    if (!toast) return;

    toast.classList.remove('d-none', 'alert-success', 'alert-danger', 'alert-warning', 'alert-info');
    toast.classList.add(`alert-${variant}`);
    toast.textContent = message;

    window.setTimeout(() => {
      toast.classList.add('d-none');
    }, 2000);
  };

  const getStepperRoot = () => document.querySelector('[data-stepper]');

  const getStepperTriggers = () => {
    const root = getStepperRoot();
    if (!root) return [];
    return Array.from(root.querySelectorAll('[data-step-id]'));
  };

  const getStepperPanels = () => {
    const root = getStepperRoot();
    if (!root) return [];
    return Array.from(root.querySelectorAll('[data-step-panel]'));
  };

  const getStepOrder = () => {
    return getStepperTriggers()
      .map((trigger) => ({
        stepId: trigger.dataset.stepId,
        index: Number(trigger.dataset.stepIndex) || 99
      }))
      .filter((entry) => !!entry.stepId)
      .sort((a, b) => a.index - b.index)
      .map((entry) => entry.stepId);
  };

  const setActiveStep = (stepId) => {
    if (!stepId) return;

    state.activeStep = stepId;

    getStepperTriggers().forEach((trigger) => {
      const isActive = trigger.dataset.stepId === stepId;
      trigger.classList.toggle('is-active', isActive);
    });

    getStepperPanels().forEach((panel) => {
      const isActive = panel.dataset.stepPanel === stepId;
      panel.classList.toggle('is-active', isActive);
      panel.hidden = !isActive;
    });
  };

  const setMode = (mode) => {
    const normalized = Object.values(MODE).includes(mode) ? mode : MODE.VIEW;
    state.mode = normalized;

    document.querySelectorAll('[data-shell-mode]')
      .forEach((btn) => btn.classList.toggle('is-active', btn.dataset.shellMode === normalized));

    const disablePanels = normalized === MODE.VIEW;
    document.querySelectorAll('[data-panel-field]')
      .forEach((field) => {
        field.disabled = disablePanels;
      });

    showToast(`Mode: ${normalized}`, 'info');
  };

  const stepPrev = () => {
    const order = getStepOrder();
    const index = order.indexOf(state.activeStep);
    if (index <= 0) return;
    setActiveStep(order[index - 1]);
  };

  const stepNext = () => {
    const order = getStepOrder();
    const index = order.indexOf(state.activeStep);
    if (index === -1 || index >= order.length - 1) return;
    setActiveStep(order[index + 1]);
  };

  document.addEventListener('click', (event) => {
    const panelAction = event.target.closest('[data-panel-action]');
    if (panelAction) {
      event.preventDefault();
      const action = panelAction.getAttribute('data-panel-action');
      showToast(`Lookup '${action}' is a prototype.`, 'info');
      return;
    }

    const browseButton = event.target.closest('[data-doc-browse]');
    if (browseButton) {
      event.preventDefault();
      const fileInput = document.getElementById('DocDocumentImageFile');
      if (fileInput) fileInput.click();
      return;
    }

    const stepTrigger = event.target.closest('[data-step-id]');
    if (stepTrigger) {
      event.preventDefault();
      setActiveStep(stepTrigger.dataset.stepId);
      return;
    }

    const dataEntryLink = event.target.closest('[data-dataentry-link]');
    if (dataEntryLink) {
      event.preventDefault();
      setActiveStep(dataEntryLink.dataset.dataentryLink);
      return;
    }

    const stepperAction = event.target.closest('[data-stepper-action]');
    if (stepperAction) {
      event.preventDefault();
      const action = stepperAction.dataset.stepperAction;
      if (action === 'prev') stepPrev();
      if (action === 'next') stepNext();
      return;
    }

    const modeButton = event.target.closest('[data-shell-mode]');
    if (modeButton) {
      event.preventDefault();
      setMode(modeButton.dataset.shellMode);
      return;
    }

    const actionButton = event.target.closest('[data-export-lc-action]');
    if (!actionButton) return;

    const action = actionButton.getAttribute('data-export-lc-action');
    if (!action) return;

    if (action === 'approve' || action === 'reject') {
      showToast(`'${action}' is a prototype (no backend).`, action === 'approve' ? 'success' : 'danger');
      return;
    }

    if (action === 'cancel') {
      showToast('Cancelled (prototype).', 'warning');
      return;
    }

    showToast(`Action '${action}' is a prototype (no backend).`);
  });

  document.addEventListener('change', (event) => {
    const fileInput = event.target.closest('#DocDocumentImageFile');
    if (!fileInput) return;

    const textInput = document.getElementById('DocDocumentImage');
    if (!textInput) return;

    const fileName = fileInput.files && fileInput.files.length ? fileInput.files[0].name : '';
    textInput.value = fileName;
  });

  // Init.
  (function init() {
    // Hide all non-active panels on load.
    const defaultStep = getStepperTriggers().find((t) => t.hasAttribute('data-step-default'))?.dataset.stepId || 'details';
    setActiveStep(defaultStep);
    setMode(MODE.VIEW);
  })();
})();
