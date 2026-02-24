document.addEventListener('DOMContentLoaded', () => {
  const els = {
    saveBtn: document.getElementById('saveBtn'),
    cancelBtn: document.getElementById('cancelBtn'),
    referenceLookup: document.getElementById('referenceLookup'),
    tabs: Array.from(document.querySelectorAll('.tab-strip .tab')),
    panels: Array.from(document.querySelectorAll('[data-tab-panel]')),
    participantClientLookup: document.getElementById('participantClientLookup'),
    participantCountryLookup: document.getElementById('participantCountryLookup'),
    participantNewBtn: document.getElementById('participantNewBtn'),
    documentIdLookup: document.getElementById('documentIdLookup'),
    receivedByLookup: document.getElementById('receivedByLookup'),
    documentNewBtn: document.getElementById('documentNewBtn')
  };

  const getActivePanel = () => {
    return els.panels.find((p) => !p.hasAttribute('hidden')) || null;
  };

  const switchTab = (tabName) => {
    els.tabs.forEach((tab) => {
      const isTarget = tab.getAttribute('data-tab') === tabName;
      tab.classList.toggle('is-active', isTarget);
      tab.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    });

    els.panels.forEach((panel) => {
      const isTarget = panel.getAttribute('data-tab-panel') === tabName;
      if (isTarget) {
        panel.removeAttribute('hidden');
        panel.classList.add('is-active');
      } else {
        panel.setAttribute('hidden', '');
        panel.classList.remove('is-active');
      }
    });

    // entering a tab always returns to view mode
    setEditable(false);
  };

  const setEditable = (enabled) => {
    const activePanel = getActivePanel();
    const scope = activePanel || document;
    scope.querySelectorAll('[data-editable="true"]').forEach((el) => {
      el.disabled = !enabled;
    });

    if (els.participantNewBtn) {
      // screenshot shows New present; keep disabled until Add mode.
      els.participantNewBtn.disabled = !enabled;
    }

    if (els.documentNewBtn) {
      els.documentNewBtn.disabled = !enabled;
    }

    if (els.saveBtn) els.saveBtn.disabled = !enabled;
    if (els.cancelBtn) els.cancelBtn.disabled = !enabled;
  };

  const resetActiveFields = () => {
    const activePanel = getActivePanel();
    const tabName = activePanel?.getAttribute('data-tab-panel');

    if (tabName === 'participants') {
      const ids = [
        'participantType',
        'participantClientId',
        'participantClientName',
        'participantAddress1',
        'participantAddress2',
        'participantAddress3',
        'participantRefNo',
        'participantCountryId',
        'participantSwiftCode',
        'participantAccountId',
        'participantDate',
        'participantLanguage'
      ];
      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.tagName === 'SELECT') el.value = '';
        else el.value = '';
      });
      return;
    }

    if (tabName === 'documents') {
      const ids = [
        'documentId',
        'documentType',
        'documentLocation',
        'documentImage',
        'documentRemarks',
        'receivedBy',
        'receivedDate'
      ];
      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.tagName === 'SELECT') el.value = '';
        else el.value = '';
      });
      return;
    }

    // transfer default
    try {
      document.getElementById('referenceNo').value = '';
      document.getElementById('transferAmount').value = '';
      document.getElementById('remarks').value = '';
      document.getElementById('expiryDate').value = '';
      document.getElementById('transferDate').value = '';
    } catch {
      // ignore
    }
  };

  document.addEventListener('click', (event) => {
    const tabBtn = event.target.closest('.tab-strip .tab:not([disabled])');
    if (tabBtn) {
      const tabName = tabBtn.getAttribute('data-tab');
      if (tabName) switchTab(tabName);
      return;
    }

    const modeBtn = event.target.closest('[data-mode]');
    if (modeBtn) {
      const mode = (modeBtn.getAttribute('data-mode') || 'view').toLowerCase();
      if (mode === 'view') {
        setEditable(false);
        return;
      }
      if (mode === 'add') {
        setEditable(true);
        return;
      }
    }
  });

  els.saveBtn?.addEventListener('click', () => {
    setEditable(false);
  });

  els.cancelBtn?.addEventListener('click', () => {
    resetActiveFields();
    setEditable(false);
  });

  els.referenceLookup?.addEventListener('click', () => {
    alert('Reference lookup is a placeholder in this prototype.');
  });

  els.participantClientLookup?.addEventListener('click', () => {
    alert('Client lookup is a placeholder in this prototype.');
  });

  els.participantCountryLookup?.addEventListener('click', () => {
    alert('Country lookup is a placeholder in this prototype.');
  });

  els.documentIdLookup?.addEventListener('click', () => {
    alert('Document lookup is a placeholder in this prototype.');
  });

  els.receivedByLookup?.addEventListener('click', () => {
    alert('Received By lookup is a placeholder in this prototype.');
  });

  setEditable(false);
});
