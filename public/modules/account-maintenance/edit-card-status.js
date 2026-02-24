/**
 * Edit Card Status Module
 * Handles viewing and editing card statuses
 */
(function () {
  'use strict';

  // ============================================================
  // CONFIGURATION
  // ============================================================
  const CONFIG = {
    operatorId: 'JOHN_KIMANI',
    formId: '1336',
    appName: 'PROJECT_KAIRO'
  };

  // ============================================================
  // STATE MANAGEMENT
  // ============================================================
  const state = {
    stages: [],
    cards: [],
    selectedCard: null
  };

  // ============================================================
  // DOM ELEMENTS
  // ============================================================
  const elements = {
    stageFilter: document.getElementById('stageFilter'),
    cardStatusGrid: document.getElementById('cardStatusGrid'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    messageBar: document.getElementById('messageBar'),
    // Audit fields
    createdBy: document.getElementById('createdBy'),
    createdOn: document.getElementById('createdOn'),
    approvedBy: document.getElementById('approvedBy'),
    approvedOn: document.getElementById('approvedOn'),
    exportedBy: document.getElementById('exportedBy'),
    exportedOn: document.getElementById('exportedOn'),
    activatedBy: document.getElementById('activatedBy'),
    activatedOn: document.getElementById('activatedOn'),
    disbursedBy: document.getElementById('disbursedBy'),
    disbursedOn: document.getElementById('disbursedOn')
  };

  // ============================================================
  // API HELPER
  // ============================================================
  function getApiUrl() {
    const env = window.Environment || {};
    const baseUrl = (env.baseUrlCommon || env.baseUrlSystemCodes || 'http://172.16.2.31:3306').replace(/\/+$/, '');
    return `${baseUrl}/api/OldAPI`;
  }

  function getRequestTime() {
    const now = new Date();
    const pad2 = n => String(n).padStart(2, '0');
    return `${pad2(now.getMonth() + 1)}/${pad2(now.getDate())}/${now.getFullYear()} ${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
  }

  async function callApi(requestId, requestData) {
    const apiUrl = getApiUrl();
    const envelope = {
      RequestID: requestId,
      FormId: requestId,
      RequestData: requestData,
      RequestTime: getRequestTime(),
      AppName: CONFIG.appName,
      Checksum: ''
    };

    console.log('[API Request]', requestId, envelope);

    try {
      if (window.CoreApi && window.CoreApi.post) {
        const response = await window.CoreApi.post(apiUrl, envelope);
        console.log('[API Response]', requestId, response);
        return response;
      } else {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(envelope)
        });
        const data = await response.json();
        console.log('[API Response]', requestId, data);
        return data;
      }
    } catch (error) {
      console.error('[API Error]', requestId, error);
      throw error;
    }
  }

  // ============================================================
  // UI HELPERS
  // ============================================================
  function showLoading(show = true) {
    if (elements.loadingOverlay) {
      elements.loadingOverlay.hidden = !show;
    }
  }

  function showMessage(message, type = 'info') {
    if (elements.messageBar) {
      elements.messageBar.textContent = message;
      elements.messageBar.className = `de-message-bar de-message-bar--${type}`;
      elements.messageBar.hidden = false;

      setTimeout(() => {
        elements.messageBar.hidden = true;
      }, 3000);
    }
  }

  function updateStatusBar(message) {
    const statusBar = document.querySelector('.de-status-bar');
    if (statusBar) {
      statusBar.textContent = message;
    }
  }

  // ============================================================
  // LOAD STAGES FROM t_SystemCodeDetail (CardStatus)
  // ============================================================
  async function loadStages() {
    showLoading(true);
    try {
      // Use LookupService.getSystemCodeOptions('CardStatus') pattern
      // This calls p_v1_GetSystemCodes with CodeID = 'CardStatus'
      // to get data from t_SystemCodeDetail where ID = 'CardStatus'
      const LookupService = window.LookupService;
      
      if (LookupService && typeof LookupService.getSystemCodeOptions === 'function') {
        const options = await LookupService.getSystemCodeOptions('CardStatus');
        console.log('[EditCardStatus] Loaded stages from LookupService:', options);
        state.stages = options;
        populateStageDropdown(options);
      } else {
        // Fallback: Direct API call using p_v1_GetSystemCodes
        const response = await callApi('p_v1_GetSystemCodes', {
          CodeID: 'CardStatus'
        });

        let stages = [];
        if (response && response.data) {
          stages = Array.isArray(response.data) ? response.data : [];
        } else if (response && response.Details) {
          stages = Array.isArray(response.Details) ? response.Details : [];
        } else if (response && response.Details01) {
          stages = Array.isArray(response.Details01) ? response.Details01 : [];
        }

        // Map to standard format
        const mappedStages = stages.map(row => ({
          value: row.SubCodeID || row.SubCode || row.Value || row.ID || '',
          label: row.CodeDescription || row.Description || row.Label || row.Name || ''
        }));

        console.log('[EditCardStatus] Loaded stages from API:', mappedStages);
        state.stages = mappedStages;
        populateStageDropdown(mappedStages);
      }
    } catch (error) {
      console.error('Error loading stages:', error);
      showMessage('Error loading stages', 'error');
    } finally {
      showLoading(false);
    }
  }

  function populateStageDropdown(stages) {
    if (!elements.stageFilter) return;

    // Clear existing options except default
    elements.stageFilter.innerHTML = '<option value="">-- Select Stage --</option>';

    stages.forEach(stage => {
      const option = document.createElement('option');
      option.value = stage.value || stage.SubCodeID || stage.ID || '';
      option.textContent = stage.label || stage.CodeDescription || stage.Description || '';
      elements.stageFilter.appendChild(option);
    });
  }

  // ============================================================
  // SEARCH CARDS BY STAGE
  // Uses p_GetElectronicCardsStageWise stored procedure
  // ============================================================
  async function searchCardsByStage(stageId) {
    if (!stageId) {
      renderCardGrid([]);
      clearAuditTrail();
      return;
    }

    showLoading(true);
    updateStatusBar('Searching cards...');

    try {
      // Call p_GetElectronicCardsStageWise as per legacy system
      const response = await callApi('dbo.p_GetElectronicCardsStageWise', {
        BankID: '00',
        OurBranchID: '0101',
        StageID: stageId,
        OperatorID: CONFIG.operatorId
      });

      let cards = [];
      if (response && response.data) {
        cards = Array.isArray(response.data) ? response.data : [];
      } else if (response && response.Details) {
        cards = Array.isArray(response.Details) ? response.Details : [];
      } else if (response && response.Details01) {
        cards = Array.isArray(response.Details01) ? response.Details01 : [];
      }

      state.cards = cards;
      renderCardGrid(cards);
      updateStatusBar(cards.length ? `Found ${cards.length} card(s)` : 'No details Found [No:1011]');
    } catch (error) {
      console.error('Error searching cards:', error);
      showMessage('Error searching cards', 'error');
      updateStatusBar('Error searching cards');
    } finally {
      showLoading(false);
    }
  }

  // ============================================================
  // RENDER CARD GRID
  // ============================================================
  function renderCardGrid(cards) {
    if (!elements.cardStatusGrid) return;

    if (!cards || cards.length === 0) {
      elements.cardStatusGrid.innerHTML = `
        <tr>
          <td colspan="11" class="text-center text-muted py-5">
            <span class="text-secondary">No records to display.</span>
          </td>
        </tr>
      `;
      return;
    }

    elements.cardStatusGrid.innerHTML = cards.map((card, index) => `
      <tr data-index="${index}" class="${state.selectedCard === index ? 'table-primary' : ''}">
        <td><input type="checkbox" class="form-check-input card-checkbox" data-index="${index}" /></td>
        <td>${card.TrackingID || card.TrackingId || '-'}</td>
        <td>${card.CardID || card.CardId || '-'}</td>
        <td>${card.CardName || '-'}</td>
        <td>${card.CardProvider || card.Provider || '-'}</td>
        <td>${card.BranchID || card.OurBranchID || '-'}</td>
        <td>${card.AccountID || card.AccountId || '-'}</td>
        <td>${card.CardStatus || card.Status || '-'}</td>
        <td class="text-center">${card.IsApproved === 'Y' || card.IsApproved === true ? '<i class="bi bi-check text-success"></i>' : ''}</td>
        <td class="text-center">${card.IsActive === 'Y' || card.IsActive === true ? '<i class="bi bi-check text-success"></i>' : ''}</td>
        <td class="text-center">${card.Collected === 'Y' || card.Collected === true ? '<i class="bi bi-check text-success"></i>' : ''}</td>
      </tr>
    `).join('');

    // Attach row click listeners
    elements.cardStatusGrid.querySelectorAll('tr[data-index]').forEach(row => {
      row.addEventListener('click', () => {
        const index = parseInt(row.dataset.index);
        selectCard(index);
      });
    });
  }

  function selectCard(index) {
    state.selectedCard = index;
    const card = state.cards[index];

    // Update row selection
    elements.cardStatusGrid.querySelectorAll('tr').forEach(r => r.classList.remove('table-primary'));
    const selectedRow = elements.cardStatusGrid.querySelector(`tr[data-index="${index}"]`);
    if (selectedRow) selectedRow.classList.add('table-primary');

    // Update audit trail
    updateAuditTrail(card);

    // Enable action buttons
    const editBtn = document.querySelector('[data-action="edit"]');
    const issueBtn = document.querySelector('[data-action="issue"]');
    if (editBtn) editBtn.disabled = false;
    if (issueBtn) issueBtn.disabled = false;
  }

  function updateAuditTrail(card) {
    if (elements.createdBy) elements.createdBy.value = card.CreatedBy || '-';
    if (elements.createdOn) elements.createdOn.value = card.CreatedOn || card.CreatedDate || '-';
    if (elements.approvedBy) elements.approvedBy.value = card.ApprovedBy || '-';
    if (elements.approvedOn) elements.approvedOn.value = card.ApprovedOn || card.ApprovedDate || '-';
    if (elements.exportedBy) elements.exportedBy.value = card.ExportedBy || '-';
    if (elements.exportedOn) elements.exportedOn.value = card.ExportedOn || card.ExportedDate || '-';
    if (elements.activatedBy) elements.activatedBy.value = card.ActivatedBy || '-';
    if (elements.activatedOn) elements.activatedOn.value = card.ActivatedOn || card.ActivatedDate || '-';
    if (elements.disbursedBy) elements.disbursedBy.value = card.DisbursedBy || '-';
    if (elements.disbursedOn) elements.disbursedOn.value = card.DisbursedOn || card.DisbursedDate || '-';
  }

  function clearAuditTrail() {
    if (elements.createdBy) elements.createdBy.value = '-';
    if (elements.createdOn) elements.createdOn.value = '-';
    if (elements.approvedBy) elements.approvedBy.value = '-';
    if (elements.approvedOn) elements.approvedOn.value = '-';
    if (elements.exportedBy) elements.exportedBy.value = '-';
    if (elements.exportedOn) elements.exportedOn.value = '-';
    if (elements.activatedBy) elements.activatedBy.value = '-';
    if (elements.activatedOn) elements.activatedOn.value = '-';
    if (elements.disbursedBy) elements.disbursedBy.value = '-';
    if (elements.disbursedOn) elements.disbursedOn.value = '-';
  }

  // ============================================================
  // ACTIONS
  // ============================================================
  function handleView() {
    if (state.selectedCard !== null && state.cards[state.selectedCard]) {
      const card = state.cards[state.selectedCard];
      console.log('View card:', card);
      showMessage(`Viewing card: ${card.CardID || card.CardId}`, 'info');
    } else {
      showMessage('Please select a card first', 'warning');
    }
  }

  function handleEdit() {
    if (state.selectedCard !== null && state.cards[state.selectedCard]) {
      const card = state.cards[state.selectedCard];
      console.log('Edit card:', card);
      showMessage(`Editing card: ${card.CardID || card.CardId}`, 'info');
    } else {
      showMessage('Please select a card first', 'warning');
    }
  }

  function handleIssue() {
    if (state.selectedCard !== null && state.cards[state.selectedCard]) {
      const card = state.cards[state.selectedCard];
      console.log('Issue card:', card);
      showMessage(`Issuing card: ${card.CardID || card.CardId}`, 'info');
    } else {
      showMessage('Please select a card first', 'warning');
    }
  }

  function handleCancel() {
    try {
      window.parent.postMessage({ type: 'accountMaintenanceChildClose' }, '*');
    } catch (_) {
      // ignore
    }
  }

  // ============================================================
  // SECTION TOGGLE
  // ============================================================
  function initSectionToggles() {
    document.querySelectorAll('[data-section-toggle]').forEach(header => {
      header.addEventListener('click', () => {
        const section = header.closest('.form-section');
        const content = section.querySelector('.section-content');
        const icon = header.querySelector('.section-toggle-btn i');

        if (content) {
          const isHidden = content.style.display === 'none';
          content.style.display = isHidden ? 'block' : 'none';
          if (icon) {
            icon.className = isHidden ? 'bi bi-chevron-down' : 'bi bi-chevron-up';
          }
        }
      });
    });
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================
  function init() {
    console.log('[EditCardStatus] Initializing...');

    // Load stages on init
    loadStages();

    // Stage change handler - auto search
    elements.stageFilter?.addEventListener('change', (e) => {
      searchCardsByStage(e.target.value);
    });

    // Action buttons
    document.querySelector('[data-action="view"]')?.addEventListener('click', handleView);
    document.querySelector('[data-action="edit"]')?.addEventListener('click', handleEdit);
    document.querySelector('[data-action="issue"]')?.addEventListener('click', handleIssue);
    document.querySelector('[data-action="cancel"]')?.addEventListener('click', handleCancel);

    // Window controls
    document.querySelectorAll('[data-action="close"]').forEach(btn => {
      btn.addEventListener('click', handleCancel);
    });

    document.querySelectorAll('[data-action="refresh"]').forEach(btn => {
      btn.addEventListener('click', () => {
        loadStages();
        if (elements.stageFilter?.value) {
          searchCardsByStage(elements.stageFilter.value);
        }
      });
    });

    // Init section toggles
    initSectionToggles();

    updateStatusBar('Ready');
    console.log('[EditCardStatus] Initialization complete');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
