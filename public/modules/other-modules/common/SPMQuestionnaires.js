/**
 * SPM Questionnaires Page
 * Handles all page interactions including CRUD operations
 */
(function () {
  if (window.__SPMQuestionnairesLoaded) {
    console.warn('[SPMQuestionnaires] Script already loaded; skipping duplicate execution.');
    return;
  }
  window.__SPMQuestionnairesLoaded = true;

  console.log('[SPMQuestionnaires] Script loaded');

  (async function initSPMQuestionnaires() {
    const { ServiceLoader } = window;

    // Ensure dependencies are loaded
    const ensureDependencies = async () => {
      if (!ServiceLoader) {
        console.error('[SPMQuestionnaires] ServiceLoader is not available.');
        return;
      }

      try {
        await ServiceLoader.loadCore();
        if (ServiceLoader.loadLookupService) {
          await ServiceLoader.loadLookupService();
        }
        // Load SPMQuestionnairesService
        if (ServiceLoader.loadSPMQuestionnairesService) {
          await ServiceLoader.loadSPMQuestionnairesService();
        }
      } catch (error) {
        console.error('[SPMQuestionnaires] ServiceLoader failed to load dependencies', error);
      }
    };

    await ensureDependencies();

    const SPMQuestionnairesService = window.SPMQuestionnairesService;
    console.log('[SPMQuestionnaires] SPMQuestionnairesService loaded:', !!SPMQuestionnairesService);

    const byId = (id) => document.getElementById(id);

    // Helper to escape XML special characters
    const escapeXml = (str) => {
      if (str == null) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    // Get auth session
    function getAuthSession() {
      try {
        const storageKey = window.CoreBankingConfig?.auth?.storageKey || 'nimble_auth_session';
        const raw = window.localStorage?.getItem?.(storageKey);
        return raw ? JSON.parse(raw) : null;
      } catch (_) {
        return null;
      }
    }

    function getOperatorId() {
      const auth = getAuthSession();
      return (
        auth?.operatorID ||
        auth?.OperatorID ||
        auth?.operatorId ||
        auth?.operator ||
        sessionStorage.getItem('operatorId') ||
        localStorage.getItem('OperatorID') ||
        localStorage.getItem('currentUser') ||
        window.Config?.OperatorID ||
        'web_portal'
      );
    }

    // Get action button by label text
    function getActionButton(label) {
      const desired = String(label || '').trim().toLowerCase();
      return Array.from(document.querySelectorAll('.cm-legacy-actions__group .cm-shell__action')).find(
        (btn) => (btn.textContent || '').trim().toLowerCase() === desired
      );
    }

    // Form field references
    const fields = {
      questionnaireId: byId('questionnaireId'),
      questionnaireDepartmentName: byId('questionnaireDepartmentName'),
      questionTypeId: byId('questionTypeId'),
      productId: byId('productId'),
      productDepartmentName: byId('productDepartmentName'),
      workflowId: byId('workflowId'),
      wfStageId: byId('wfStageId'),
      rescoringPeriod: byId('rescoringPeriod'),
      formula: byId('formula'),
      riskAcceptanceLevel: byId('riskAcceptanceLevel'),
      riskAcceptanceDepartmentName: byId('riskAcceptanceDepartmentName'),
      
      createdBy: byId('createdBy'),
      createdOn: byId('createdOn'),
      modifiedBy: byId('modifiedBy'),
      modifiedOn: byId('modifiedOn'),
      supervisedBy: byId('supervisedBy'),
      supervisedOn: byId('supervisedOn')
    };

    const viewBtn = getActionButton('View');
    const addBtn = getActionButton('Add');
    const editBtn = getActionButton('Edit');
    const deleteBtn = getActionButton('Delete');
    const saveBtn = getActionButton('Save');
    const cancelBtn = getActionButton('Cancel');

    // Navigation buttons
    const prevBtn = document.querySelector('.spmq__arrow-btn[aria-label="Previous record"]');
    const nextBtn = document.querySelector('.spmq__arrow-btn[aria-label="Next record"]');

    // Grid table body
    const gridBody = document.querySelector('.spmq__grid tbody');

    // State management
    let mode = 'view'; // 'view' | 'add' | 'edit'
    let currentQuestionnaire = null;
    let questionsList = []; // List of questions for current questionnaire
    let rows = [];
    let rowIndex = 0;

    const setButtonDisabled = (btn, disabled) => {
      if (!btn) return;
      btn.disabled = Boolean(disabled);
    };

    const setFormDisabled = (disabled, { keepQuestionnaireIdEnabled = false } = {}) => {
      const editableEls = [
        fields.questionnaireId,
        fields.questionnaireDepartmentName,
        fields.questionTypeId,
        fields.productId,
        fields.productDepartmentName,
        fields.workflowId,
        fields.wfStageId,
        fields.rescoringPeriod,
        fields.formula,
        fields.riskAcceptanceLevel,
        fields.riskAcceptanceDepartmentName
      ].filter(Boolean);

      for (const el of editableEls) {
        if (keepQuestionnaireIdEnabled && el === fields.questionnaireId) {
          el.disabled = false;
          continue;
        }
        el.disabled = Boolean(disabled);
      }
    };

    const updateActionState = () => {
      const hasRecord = Boolean(currentQuestionnaire);

      if (mode === 'view') {
        setFormDisabled(true, { keepQuestionnaireIdEnabled: true });
        setButtonDisabled(addBtn, false);
        setButtonDisabled(editBtn, !hasRecord);
        setButtonDisabled(deleteBtn, !hasRecord);
        setButtonDisabled(saveBtn, true);
        setButtonDisabled(cancelBtn, true);
        return;
      }

      // Add/Edit mode
      setFormDisabled(false);
      if (fields.questionnaireId) {
        fields.questionnaireId.disabled = mode === 'edit';
      }
      
      setButtonDisabled(addBtn, true);
      setButtonDisabled(editBtn, true);
      setButtonDisabled(deleteBtn, true);
      setButtonDisabled(saveBtn, false);
      setButtonDisabled(cancelBtn, false);
    };

    const setValue = (el, value) => {
      if (!el) return;
      if (value === undefined || value === null) return;
      el.value = String(value);
    };

    const clearForm = () => {
      console.log('[SPMQuestionnaires] Clearing form...');
      
      const inputFields = [
        fields.questionnaireId, fields.questionnaireDepartmentName, fields.productId, 
        fields.productDepartmentName, fields.workflowId, fields.wfStageId, fields.rescoringPeriod,
        fields.formula, fields.riskAcceptanceLevel, fields.riskAcceptanceDepartmentName,
        fields.createdBy, fields.createdOn, fields.modifiedBy, fields.modifiedOn,
        fields.supervisedBy, fields.supervisedOn
      ];
      
      inputFields.forEach(field => {
        if (field) field.value = '';
      });
      
      const selectFields = [fields.questionTypeId];
      selectFields.forEach(select => {
        if (select && select.tagName === 'SELECT' && select.options.length > 0) {
          select.selectedIndex = 0;
        }
      });
      
      clearQuestionGrid();
      currentQuestionnaire = null;
      console.log('[SPMQuestionnaires] Form cleared');
    };

    const clearQuestionGrid = () => {
      if (!gridBody) return;
      gridBody.innerHTML = '<tr><td colspan="3" class="text-muted">No records to display.</td></tr>';
      questionsList = [];
    };

    const renderQuestionGrid = (questions = []) => {
      if (!gridBody) return;
      
      questionsList = Array.isArray(questions) ? questions : [];
      
      if (questionsList.length === 0) {
        clearQuestionGrid();
        return;
      }

      gridBody.innerHTML = questionsList.map((q, idx) => `
        <tr data-index="${idx}">
          <td class="text-center">
            <input type="checkbox" class="form-check-input" data-question-id="${q.QuestionID || ''}" ${q.Selected ? 'checked' : ''} />
          </td>
          <td>${q.QuestionID || ''}</td>
          <td>${q.QuestionDescription || q.Question || ''}</td>
        </tr>
      `).join('');
    };

    const updateNavDisabled = () => {
      if (prevBtn) prevBtn.disabled = rows.length <= 1 || rowIndex <= 0;
      if (nextBtn) nextBtn.disabled = rows.length <= 1 || rowIndex >= rows.length - 1;
    };

    const clampIndex = () => {
      if (!rows.length) {
        rowIndex = 0;
        return;
      }
      if (rowIndex < 0) rowIndex = 0;
      if (rowIndex >= rows.length) rowIndex = rows.length - 1;
    };

    // Bind API response to form fields and question grid
    function bindResponseToForm(response) {
      if (!response || !response.Details || response.Details.length === 0) {
        clearForm();
        return;
      }
      
      const main = Array.isArray(response.Details) ? response.Details[0] : response.Details;
      
      setValue(fields.questionnaireId, main.QuestionnaireID || '');
      setValue(fields.questionnaireDepartmentName, main.QuestionnaireName || main.Description || '');
      setValue(fields.questionTypeId, main.QuestionTypeID || '');
      setValue(fields.productId, main.ProductID || '');
      setValue(fields.productDepartmentName, main.ProductName || '');
      setValue(fields.workflowId, main.WorkflowID || '');
      setValue(fields.wfStageId, main.WFStageID || '');
      setValue(fields.rescoringPeriod, main.RescoringPeriod || '');
      setValue(fields.formula, main.Formula || '');
      setValue(fields.riskAcceptanceLevel, main.RiskAcceptanceLevel || main.RAID || '');
      setValue(fields.riskAcceptanceDepartmentName, main.RADescription || '');
      
      // Audit fields
      setValue(fields.createdBy, main.CreatedBy || '');
      setValue(fields.createdOn, main.CreatedOn || '');
      setValue(fields.modifiedBy, main.ModifiedBy || '');
      setValue(fields.modifiedOn, main.ModifiedOn || '');
      setValue(fields.supervisedBy, main.SupervisedBy || '');
      setValue(fields.supervisedOn, main.SupervisedOn || '');
      
      // Questions grid
      if (main.Questions && Array.isArray(main.Questions)) {
        renderQuestionGrid(main.Questions);
      }
      
      currentQuestionnaire = main;
      rows = [main];
      rowIndex = 0;
      updateActionState();
      updateNavDisabled();
    }

    // Navigation handlers
    prevBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      if (rows.length > 0 && rowIndex > 0) {
        rowIndex -= 1;
        clampIndex();
        bindResponseToForm({ Details: [rows[rowIndex]] });
        updateNavDisabled();
      }
    });

    nextBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      if (rows.length > 0 && rowIndex < rows.length - 1) {
        rowIndex += 1;
        clampIndex();
        bindResponseToForm({ Details: [rows[rowIndex]] });
        updateNavDisabled();
      }
    });

    const isActionButton = (target) => {
      const btn = target?.closest?.('.cm-legacy-actions__group .cm-shell__action');
      if (!btn) return null;
      const text = (btn.textContent || '').trim().toLowerCase();
      return { btn, text };
    };

    // Main event delegation
    document.addEventListener('click', async (e) => {
      const action = isActionButton(e.target);
      if (action) {
        if (action.btn.disabled) return;
        e.preventDefault();

        if (action.text === 'view') {
          const questionnaireId = fields.questionnaireId?.value?.trim();
          
          if (!questionnaireId) {
            alert('Please enter a Questionnaire ID to view.');
            fields.questionnaireId?.focus();
            return;
          }

          try {
            if (!SPMQuestionnairesService) {
              alert('Service not available. Please refresh the page.');
              return;
            }

            const response = await SPMQuestionnairesService.getQuestionnaires({
              QuestionnaireID: questionnaireId,
              ProductID: fields.productId?.value || '',
              WorkFlowID: fields.workflowId?.value || '',
              StageID: fields.wfStageId?.value || '',
              QuestionaireTypeID: fields.questionTypeId?.value || '',
              Direction: 0
            });

            console.log('[SPMQuestionnaires] View response:', response);

            if (response.success && response.data) {
              // Handle normalized response - data contains the actual payload
              const data = response.data.Details ? response.data : { Details: Array.isArray(response.data) ? response.data : [response.data] };
              bindResponseToForm(data);
              mode = 'view';
              updateActionState();
              console.log('[SPMQuestionnaires] Record loaded successfully');
            } else {
              alert(response.message || 'No record found for the given Questionnaire ID.');
            }
          } catch (err) {
            console.error('[SPMQuestionnaires] View error:', err);
            alert('Error loading record. Please try again.');
          }
        }

        if (action.text === 'add') {
          clearForm();
          mode = 'add';
          updateActionState();
          fields.questionnaireId?.focus();
          console.log('[SPMQuestionnaires] Add mode enabled');
        }

        if (action.text === 'edit') {
          if (!currentQuestionnaire) {
            alert('Please view a record first before editing.');
            return;
          }
          mode = 'edit';
          updateActionState();
          fields.questionnaireDepartmentName?.focus();
          console.log('[SPMQuestionnaires] Edit mode enabled');
        }

        if (action.text === 'delete') {
          const questionnaireId = fields.questionnaireId?.value?.trim();
          
          if (!questionnaireId || !currentQuestionnaire) {
            alert('Please view a record first before deleting.');
            return;
          }

          const confirmed = confirm(`Are you sure you want to delete Questionnaire "${questionnaireId}"?\n\nThis action cannot be undone.`);
          if (!confirmed) return;

          try {
            if (!SPMQuestionnairesService) {
              alert('Service not available. Please refresh the page.');
              return;
            }

            const response = await SPMQuestionnairesService.deleteQuestionnaires({
              QuestionnaireID: questionnaireId,
              OperatorID: getOperatorId()
            });

            console.log('[SPMQuestionnaires] Delete response:', response);

            if (response.success) {
              alert('Record deleted successfully!');
              clearForm();
              mode = 'view';
              updateActionState();
            } else {
              alert(response.message || 'Failed to delete record.');
            }
          } catch (err) {
            console.error('[SPMQuestionnaires] Delete error:', err);
            alert('Error deleting record. Please try again.');
          }
        }

        if (action.text === 'save') {
          const questionnaireId = fields.questionnaireId?.value?.trim();
          const questionnaireName = fields.questionnaireDepartmentName?.value?.trim();

          if (!questionnaireId) {
            alert('Questionnaire ID is required.');
            fields.questionnaireId?.focus();
            return;
          }

          // Collect selected questions from grid
          const selectedQuestions = [];
          gridBody?.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
            const qId = cb.dataset.questionId;
            if (qId) selectedQuestions.push(qId);
          });

          // Build DetailRecords XML for questions
          let detailRecordsXml = '';
          if (selectedQuestions.length > 0) {
            const questionRows = selectedQuestions.map(qId => 
              `<row QuestionID="${escapeXml(qId)}" />`
            ).join('');
            detailRecordsXml = `<rows>${questionRows}</rows>`;
          }

          try {
            if (!SPMQuestionnairesService) {
              alert('Service not available. Please refresh the page.');
              return;
            }

            const response = await SPMQuestionnairesService.saveQuestionnaires({
              ModuleID: questionnaireId,
              DetailRecords: detailRecordsXml,
              ProductID: fields.productId?.value || '',
              WorkFlowID: fields.workflowId?.value || '',
              StageID: fields.wfStageId?.value || '',
              Formula: fields.formula?.value || '',
              RiskAcceptanceID: fields.riskAcceptanceLevel?.value || '',
              QuestionaireTypeID: fields.questionTypeId?.value || ''
            });

            console.log('[SPMQuestionnaires] Save response:', response);

            if (response.success) {
              alert(mode === 'add' ? 'Record created successfully!' : 'Record updated successfully!');
              mode = 'view';
              updateActionState();
            } else {
              alert(response.message || 'Failed to save record.');
            }
          } catch (err) {
            console.error('[SPMQuestionnaires] Save error:', err);
            alert('Error saving record. Please try again.');
          }
        }

        if (action.text === 'cancel') {
          if (currentQuestionnaire) {
            bindResponseToForm({ Details: [currentQuestionnaire] });
          } else {
            clearForm();
          }
          mode = 'view';
          updateActionState();
          console.log('[SPMQuestionnaires] Cancelled');
        }
      }
    });

    // Load question types dropdown
    async function loadQuestionTypes() {
      try {
        if (!SPMQuestionnairesService?.getQuestionTypes) return;
        
        const response = await SPMQuestionnairesService.getQuestionTypes();
        
        if (response.success && response.data?.Details && Array.isArray(response.data.Details)) {
          const select = fields.questionTypeId;
          if (!select) return;
          
          // Keep first option
          const firstOption = select.options[0];
          select.innerHTML = '';
          select.appendChild(firstOption);
          
          response.data.Details.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.QuestionTypeID || item.ID || '';
            opt.textContent = item.Description || item.QuestionType || item.QuestionTypeID || '';
            select.appendChild(opt);
          });
        }
      } catch (err) {
        console.warn('[SPMQuestionnaires] Failed to load question types:', err);
      }
    }

    // Initialize
    updateNavDisabled();
    updateActionState();
    loadQuestionTypes();
    console.log('[SPMQuestionnaires] Initialized');
  })();
})();
