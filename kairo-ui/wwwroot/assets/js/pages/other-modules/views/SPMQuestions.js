(function () {
  if (window.__SPMQuestionsLoaded) {
    console.warn('[SPMQuestions] Script already loaded; skipping duplicate execution.');
    return;
  }
  window.__SPMQuestionsLoaded = true;

  console.log('[SPMQuestions] Script loaded');

  (async function initSPMQuestions() {
    const { ServiceLoader } = window;

    // Ensure dependencies are loaded
    const ensureDependencies = async () => {
      if (!ServiceLoader) {
        console.error('[SPMQuestions] ServiceLoader is not available.');
        return;
      }

      try {
        await ServiceLoader.loadCore();
        if (ServiceLoader.loadLookupService) {
          await ServiceLoader.loadLookupService();
        }
        // Load SPMQuestionsService
        if (ServiceLoader.loadSPMQuestionsService) {
          await ServiceLoader.loadSPMQuestionsService();
        }
      } catch (error) {
        console.error('[SPMQuestions] ServiceLoader failed to load dependencies', error);
      }
    };

    await ensureDependencies();

    const SPMQuestionsService = window.SPMQuestionsService;
    console.log('[SPMQuestions] SPMQuestionsService loaded:', !!SPMQuestionsService);

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

    // Get action button by label text
    function getActionButton(label) {
      const desired = String(label || '').trim().toLowerCase();
      return Array.from(document.querySelectorAll('.cm-legacy-actions__group .cm-shell__action')).find(
        (btn) => (btn.textContent || '').trim().toLowerCase() === desired
      );
    }

    // Form field references
    const fields = {
      questionId: byId('questionId'),
      questionDescription: byId('questionDescription'),
      sourceOfInformation: byId('sourceOfInformation'),
      questionTypeId: byId('questionTypeId'),
      functionName: byId('functionName'),
      answer: byId('answer'),
      weight: byId('weight'),
      
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

    // Get toolbar buttons
    const getToolbarButton = (label) => {
      const desired = String(label || '').trim().toLowerCase();
      return Array.from(document.querySelectorAll('.spmq__toolbar-btn')).find(
        (btn) => (btn.textContent || '').trim().toLowerCase() === desired
      );
    };

    const newBtn = getToolbarButton('New');
    const alterBtn = getToolbarButton('Alter');
    const removeBtn = getToolbarButton('Remove');
    const updateBtn = getToolbarButton('Update');
    const clearBtn = getToolbarButton('Clear');

    // Navigation buttons
    const prevBtn = document.querySelector('.spmq__arrow-btn[aria-label="Previous record"]');
    const nextBtn = document.querySelector('.spmq__arrow-btn[aria-label="Next record"]');

    // Grid table body
    const gridBody = document.querySelector('.spmq__grid tbody');

    // State management
    let mode = 'view'; // 'view' | 'add' | 'edit'
    let currentQuestion = null;
    let answersList = []; // List of answers for current question
    let rows = [];
    let rowIndex = 0;
    let selectedRowIndex = -1; // Selected row in answer grid (-1 = none)
    let viewAttempted = false; // Tracks if View has been clicked (for initial button state)
    let lastViewFoundData = false; // Tracks if last View found data
    let allQuestions = []; // Store all loaded questions for filtering (lookup cache)

    const setButtonDisabled = (btn, disabled) => {
      if (!btn) return;
      btn.disabled = Boolean(disabled);
    };

    const setFormDisabled = (disabled, { keepQuestionIdEnabled = false } = {}) => {
      const editableEls = [
        fields.questionId,
        fields.questionDescription,
        fields.sourceOfInformation,
        fields.questionTypeId,
        fields.functionName,
        fields.answer,
        fields.weight
      ].filter(Boolean);

      for (const el of editableEls) {
        if (keepQuestionIdEnabled && el === fields.questionId) {
          el.disabled = false;
          continue;
        }
        el.disabled = Boolean(disabled);
      }
    };

    const updateActionState = () => {
      const hasRecord = Boolean(currentQuestion);

      if (mode === 'view') {
        setFormDisabled(true, { keepQuestionIdEnabled: true });
        // Keep questionDescription readonly in view mode
        if (fields.questionDescription) {
          fields.questionDescription.readOnly = true;
        }
        
        // Enable lookup button in view mode
        const lookupBtn = document.querySelector('[data-open-search="question"]');
        if (lookupBtn) lookupBtn.disabled = false;
        
        // NEW WORKFLOW: Initial state vs post-View state
        if (!viewAttempted) {
          // Initial state: only View is enabled
          setButtonDisabled(viewBtn, false);
          setButtonDisabled(addBtn, true);
          setButtonDisabled(editBtn, true);
          setButtonDisabled(deleteBtn, true);
          setButtonDisabled(saveBtn, true);
          setButtonDisabled(cancelBtn, true);
        } else if (!lastViewFoundData) {
          // View clicked but no data found: enable Add and Cancel, disable View
          setButtonDisabled(viewBtn, true);
          setButtonDisabled(addBtn, false);
          setButtonDisabled(editBtn, true);
          setButtonDisabled(deleteBtn, true);
          setButtonDisabled(saveBtn, true);
          setButtonDisabled(cancelBtn, false);
        } else {
          // View clicked and data found: disable View, enable Edit, Delete, Cancel
          setButtonDisabled(viewBtn, true);
          setButtonDisabled(addBtn, true);
          setButtonDisabled(editBtn, true);
          setButtonDisabled(deleteBtn, true);
          setButtonDisabled(saveBtn, true);
          setButtonDisabled(cancelBtn, false);
          if (hasRecord) {
            setButtonDisabled(editBtn, false);
            setButtonDisabled(deleteBtn, false);
          }
        }
        
        // Toolbar buttons - disabled in view mode
        setButtonDisabled(newBtn, true);
        setButtonDisabled(alterBtn, true);
        setButtonDisabled(removeBtn, true);
        setButtonDisabled(updateBtn, true);
        setButtonDisabled(clearBtn, true);
        return;
      }

      // Add/Edit mode
      setFormDisabled(false);
      if (fields.questionId) {
        fields.questionId.disabled = mode === 'edit';
      }
      // Make questionDescription editable in add/edit mode
      if (fields.questionDescription) {
        fields.questionDescription.readOnly = false;
      }
      
      // Disable lookup button in Add/Edit mode
      const lookupBtn = document.querySelector('[data-open-search="question"]');
      if (lookupBtn) lookupBtn.disabled = true;
      
      setButtonDisabled(viewBtn, true);
      setButtonDisabled(addBtn, true);
      setButtonDisabled(editBtn, true);
      setButtonDisabled(deleteBtn, true);
      setButtonDisabled(saveBtn, true);  // Save disabled until data is entered
      setButtonDisabled(cancelBtn, false);
      
      // Toolbar buttons in add/edit mode - start with all disabled, only New enabled
      setButtonDisabled(newBtn, false);  // Only New is enabled when Add is clicked
      setButtonDisabled(alterBtn, true);
      setButtonDisabled(removeBtn, true);
      setButtonDisabled(updateBtn, true);
      setButtonDisabled(clearBtn, true);
    };

    const setValue = (el, value) => {
      if (!el) return;
      if (value === undefined || value === null) return;
      el.value = String(value);
    };

    const clearForm = (options = {}) => {
      const { preserveQuestionId = false } = options;
      console.log('[SPMQuestions] Clearing form...', preserveQuestionId ? '(preserving Question ID)' : '');
      
      // Save question ID if we need to preserve it
      const savedQuestionId = preserveQuestionId && fields.questionId ? fields.questionId.value : null;
      
      const inputFields = [
        fields.questionId, fields.questionDescription, fields.functionName, fields.answer, fields.weight,
        fields.createdBy, fields.createdOn, fields.modifiedBy, fields.modifiedOn,
        fields.supervisedBy, fields.supervisedOn
      ];
      
      inputFields.forEach(field => {
        if (field) field.value = '';
      });
      
      // Restore question ID if preserved
      if (preserveQuestionId && savedQuestionId && fields.questionId) {
        fields.questionId.value = savedQuestionId;
      }
      
      const selectFields = [fields.sourceOfInformation, fields.questionTypeId];
      selectFields.forEach(select => {
        if (select && select.tagName === 'SELECT' && select.options.length > 0) {
          select.selectedIndex = 0;
        }
      });
      
      clearAnswerGrid();
      console.log('[SPMQuestions] Form cleared');
    };

    const clearAnswerGrid = () => {
      if (!gridBody) return;
      gridBody.innerHTML = '<tr><td colspan="2" class="text-muted">No records to display.</td></tr>';
      answersList = [];
      selectedRowIndex = -1;
    };

    // Select a row in the answer grid and populate Answer/Weight fields
    const selectAnswerRow = (idx) => {
      if (idx < 0 || idx >= answersList.length) {
        selectedRowIndex = -1;
        return;
      }
      selectedRowIndex = idx;
      const ans = answersList[idx];
      
      // Populate Answer and Weight fields
      if (fields.answer) fields.answer.value = ans.Answer || ans.answer || '';
      if (fields.weight) fields.weight.value = ans.Weight || ans.weight || '';
      
      // Update row highlighting
      gridBody.querySelectorAll('tr[data-index]').forEach(row => {
        const rowIdx = parseInt(row.dataset.index, 10);
        row.classList.toggle('table-active', rowIdx === selectedRowIndex);
      });
      
      console.log('[SPMQuestions] Selected row:', idx, ans);
    };

    const renderAnswerGrid = (answers = []) => {
      if (!gridBody) return;
      
      answersList = Array.isArray(answers) ? answers : [];
      
      if (answersList.length === 0) {
        clearAnswerGrid();
        return;
      }

      gridBody.innerHTML = answersList.map((ans, idx) => `
        <tr data-index="${idx}" class="${idx === selectedRowIndex ? 'table-active' : ''}" style="cursor: pointer;">
          <td>${ans.Answer || ans.answer || ''}</td>
          <td>${ans.Weight || ans.weight || ''}</td>
        </tr>
      `).join('');

      // Add row click handlers
      gridBody.querySelectorAll('tr[data-index]').forEach(row => {
        row.addEventListener('click', () => {
          const idx = parseInt(row.dataset.index, 10);
          selectAnswerRow(idx);
        });
      });
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


    // Bind API response to form fields and answer grid
    function bindResponseToForm(response) {
      if (!response || !Array.isArray(response.Details) || response.Details.length === 0) {
        clearForm();
        return;
      }
      // Use the first item for main question fields
      const main = response.Details[0];
      setValue(fields.questionId, main.QuestionID || '');
      setValue(fields.questionDescription, main.QuestionDescription || '');
      setValue(fields.functionName, main.FuncName || '');
      setValue(fields.sourceOfInformation, main.SrcOfInfo || '');
      setValue(fields.questionTypeId, main.QuestionTypeID || '');
      setValue(fields.createdBy, main.CreatedBy || '');
      setValue(fields.createdOn, main.CreatedOn || '');
      setValue(fields.modifiedBy, main.ModifiedBy || '');
      setValue(fields.modifiedOn, main.ModifiedOn || '');
      
      // Populate Answer and Weight fields with first row data
      setValue(fields.answer, main.Answer || '');
      setValue(fields.weight, main.Weight || '');
      
      // Answers: all items in Details
      renderAnswerGrid(response.Details.map(d => ({
        Answer: d.Answer,
        Weight: d.Weight
      })));
      // Optionally set currentQuestion and rows for navigation
      currentQuestion = main;
      rows = [main];
      rowIndex = 0;
      updateActionState();
      updateNavDisabled();
    }

    // Example usage: bind the provided response (for demo/testing)
    // Remove or comment this block in production
    if (window.location.hash === '#demo-spm') {
      const demoResponse = {
        "Details": [
          {
            "QuestionID": "QUESTION3",
            "QuestionDescription": "Do you have a bussines?",
            "SrcOfInfo": "",
            "FuncName": "",
            "IsActive": true,
            "CreatedOn": "2015-04-13T09:50:00",
            "CreatedBy": "JBBADMIN",
            "ModifiedOn": null,
            "ModifiedBy": null,
            "QuestionTypeID": "",
            "EventID": "A",
            "Answer": "yes",
            "Weight": "10"
          },
          {
            "QuestionID": "QUESTION3",
            "QuestionDescription": "Do you have a bussines?",
            "SrcOfInfo": "",
            "FuncName": "",
            "IsActive": true,
            "CreatedOn": "2015-04-13T09:50:00",
            "CreatedBy": "JBBADMIN",
            "ModifiedOn": null,
            "ModifiedBy": null,
            "QuestionTypeID": "",
            "EventID": "A",
            "Answer": "starting one soon",
            "Weight": "5"
          },
          {
            "QuestionID": "QUESTION3",
            "QuestionDescription": "Do you have a bussines?",
            "SrcOfInfo": "",
            "FuncName": "",
            "IsActive": true,
            "CreatedOn": "2015-04-13T09:50:00",
            "CreatedBy": "JBBADMIN",
            "ModifiedOn": null,
            "ModifiedBy": null,
            "QuestionTypeID": "",
            "EventID": "A",
            "Answer": "no",
            "Weight": "2"
          }
        ]
      };
      bindResponseToForm(demoResponse);
    }

    // Navigation handlers
    prevBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      if (rows.length > 0 && rowIndex > 0) {
        rowIndex -= 1;
        clampIndex();
        renderQuestion(rows[rowIndex]);
        updateNavDisabled();
      }
    });

    nextBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      if (rows.length > 0 && rowIndex < rows.length - 1) {
        rowIndex += 1;
        clampIndex();
        renderQuestion(rows[rowIndex]);
        updateNavDisabled();
      }
    });

    const renderQuestion = (question) => {
      if (!question) return;
      
      currentQuestion = question;
      
      setValue(fields.questionId, question.QuestionID || question.questionId);
      setValue(fields.functionName, question.FunctionName || question.functionName);
      
      if (fields.sourceOfInformation && (question.SourceOfInformation || question.sourceOfInformation)) {
        fields.sourceOfInformation.value = question.SourceOfInformation || question.sourceOfInformation;
      }
      
      if (fields.questionTypeId && (question.QuestionTypeID || question.questionTypeId)) {
        fields.questionTypeId.value = question.QuestionTypeID || question.questionTypeId;
      }
      
      setValue(fields.createdBy, question.CreatedBy || question.createdBy);
      setValue(fields.createdOn, question.CreatedOn || question.createdOn);
      setValue(fields.modifiedBy, question.ModifiedBy || question.modifiedBy);
      setValue(fields.modifiedOn, question.ModifiedOn || question.modifiedOn);
      setValue(fields.supervisedBy, question.SupervisedBy || question.supervisedBy);
      setValue(fields.supervisedOn, question.SupervisedOn || question.supervisedOn);
      
      // Render answers if available
      const answers = question.Answers || question.answers || [];
      renderAnswerGrid(answers);
      
      updateActionState();
    };

    const isActionButton = (target) => {
      const btn = target?.closest?.('.cm-legacy-actions__group .cm-shell__action');
      if (!btn) return null;
      const text = (btn.textContent || '').trim().toLowerCase();
      return { btn, text };
    };

    const isToolbarButton = (target) => {
      const btn = target?.closest?.('.spmq__toolbar-btn');
      if (!btn) return null;
      const text = (btn.textContent || '').trim().toLowerCase();
      return { btn, text };
    };

    // Main event delegation
    document.addEventListener('click', async (e) => {
      // Handle action buttons
      const action = isActionButton(e.target);
      if (action) {
        if (action.btn.disabled) return;
        e.preventDefault();

        if (action.text === 'view') {
          console.log('[SPMQuestions] View clicked');
          const questionId = (fields.questionId?.value || '').trim();
          if (!questionId) {
            alert('Please enter a Question ID to view.');
            return;
          }
          // Get QuestionType - use empty string if default to match all types
          let questionType = fields.questionTypeId?.value || '';
          if (questionType === 'Credit Score') {
            questionType = ''; // Empty to match all QuestionTypes in the SP
          }
          const payload = {
            QuestionID: questionId,
            Direction: 0,
            QuestionType: questionType
          };
          console.log('[SPMQuestions] View payload:', payload);
          if (window && window.localStorage) {
            localStorage.setItem('spmquestions_last_payload', JSON.stringify(payload));
          }
          setButtonDisabled(viewBtn, true);
          try {
            // Use window.SPMQuestionsService directly
            const svc = window.SPMQuestionsService;
            if (!svc?.getQuestions) {
              alert('SPMQuestionsService.getQuestions is not available. Please refresh the page.');
              return;
            }
            const resp = await svc.getQuestions(payload);
            console.log('[SPMQuestions] Raw API response:', resp);
            console.log('[SPMQuestions] Response type:', typeof resp);
            console.log('[SPMQuestions] Response keys:', resp ? Object.keys(resp) : 'null');
            if (window && window.localStorage) {
              localStorage.setItem('spmquestions_last_response', JSON.stringify(resp));
            }
            if (!resp || resp.success === false) {
              alert(resp?.message || 'Failed to fetch question data.');
              // Preserve the Question ID when no data found
              clearForm({ preserveQuestionId: true });
              currentQuestion = null;
              rows = [];
              rowIndex = 0;
              viewAttempted = true;
              lastViewFoundData = false;
              updateActionState();
              updateNavDisabled();
              return;
            }
            let data = resp.data;
            console.log('[SPMQuestions] Data extracted:', data);
            console.log('[SPMQuestions] Data type:', typeof data);
            console.log('[SPMQuestions] Data keys:', data ? Object.keys(data) : 'null');
            console.log('[SPMQuestions] Is array:', Array.isArray(data));
            console.log('[SPMQuestions] resp.Details:', resp.Details);
            
            // Check if Details is at root level instead of inside data
            if ((!data || (Array.isArray(data) && data.length === 0)) && resp.Details) {
              data = resp.Details;
              console.log('[SPMQuestions] Using resp.Details instead:', data);
            }
            
            if (!data || (Array.isArray(data) && data.length === 0)) {
              alert('No records found for Question ID: ' + questionId);
              // Preserve the Question ID when no data found
              clearForm({ preserveQuestionId: true });
              currentQuestion = null;
              rows = [];
              rowIndex = 0;
              viewAttempted = true;
              lastViewFoundData = false;
              updateActionState();
              updateNavDisabled();
              return;
            }
            // Use the same logic as the demo/test: bindResponseToForm
            viewAttempted = true;
            if (Array.isArray(data) && data.length > 0 && data[0].QuestionID) {
              // Flat array of answers (Details)
              lastViewFoundData = true;
              bindResponseToForm({ Details: data });
            } else if (Array.isArray(data.Details)) {
              lastViewFoundData = true;
              bindResponseToForm({ Details: data.Details });
            } else if (Array.isArray(data.Details01)) {
              lastViewFoundData = true;
              bindResponseToForm({ Details: data.Details01 });
            } else if (typeof data === 'object' && data.QuestionID) {
              lastViewFoundData = true;
              bindResponseToForm({ Details: [data] });
            } else {
              alert('No records found for this Question ID.');
              // Preserve the Question ID when no data found
              clearForm({ preserveQuestionId: true });
              currentQuestion = null;
              rowIndex = 0;
              viewAttempted = true;
              lastViewFoundData = false;
              updateActionState();
              updateNavDisabled();
              return;
            }
          } catch (err) {
            alert('Error fetching question data.');
            console.error('[SPMQuestions] Error in View:', err);
            // Preserve the Question ID on error
            clearForm({ preserveQuestionId: true });
            currentQuestion = null;
            rows = [];
            rowIndex = 0;
            viewAttempted = true;
            lastViewFoundData = false;
            updateActionState();
            updateNavDisabled();
          }
          return;
        }

        if (action.text === 'add') {
          console.log('[SPMQuestions] Add clicked');
          mode = 'add';
          currentQuestion = null;
          clearForm({ preserveQuestionId: true }); // Keep the Question ID
          updateActionState();
          // Keep all fields disabled until New is clicked
          setFormDisabled(true, { keepQuestionIdEnabled: true });
          return;
        }

        if (action.text === 'edit') {
          console.log('[SPMQuestions] Edit clicked');
          if (!currentQuestion) {
            alert('Load a question first (click View), then Edit.');
            return;
          }
          mode = 'edit';
          
          // Enable form fields
          setFormDisabled(false);
          // Keep Question ID disabled in edit mode
          if (fields.questionId) {
            fields.questionId.disabled = true;
          }
          
          // Disable all right action controls except Cancel
          setButtonDisabled(viewBtn, true);
          setButtonDisabled(addBtn, true);
          setButtonDisabled(editBtn, true);
          setButtonDisabled(deleteBtn, true);
          setButtonDisabled(saveBtn, true);
          setButtonDisabled(cancelBtn, false);
          
          // Enable centered buttons: New, Alter, Remove
          setButtonDisabled(newBtn, false);
          setButtonDisabled(alterBtn, false);
          setButtonDisabled(removeBtn, false);
          setButtonDisabled(updateBtn, true);
          setButtonDisabled(clearBtn, true);
          
          return;
        }

        if (action.text === 'delete') {
          console.log('[SPMQuestions] Delete clicked');
          if (!currentQuestion) {
            alert('No question loaded to delete.');
            return;
          }
          
          const questionId = (fields.questionId?.value || '').trim();
          if (!questionId) {
            alert('No Question ID specified.');
            return;
          }

          const confirmed = confirm(`Are you sure you want to delete Question ID: ${questionId}?`);
          if (!confirmed) return;

          setButtonDisabled(deleteBtn, true);
          try {
            const svc = window.SPMQuestionsService;
            if (!svc?.deleteQuestions) {
              alert('SPMQuestionsService.deleteQuestions is not available.');
              return;
            }

            const resp = await svc.deleteQuestions({ QuestionID: questionId });
            console.log('[SPMQuestions] Delete response:', resp);
            console.log('[SPMQuestions] Delete response success:', resp?.success);
            console.log('[SPMQuestions] Delete response code:', resp?.code);
            console.log('[SPMQuestions] Delete response message:', resp?.message);
            console.log('[SPMQuestions] Delete response data:', resp?.data);

            if (!resp || resp.success === false) {
              alert(resp?.message || 'Failed to delete question.');
              return;
            }

            alert('Question deleted successfully!');
            
            // Clear form and reset state back to initial
            clearForm();
            currentQuestion = null;
            rows = [];
            rowIndex = 0;
            mode = 'view';
            viewAttempted = false; // Reset to initial state
            lastViewFoundData = false;
            
            // Clear the lookup cache so deleted question won't appear
            allQuestions = [];
            
            updateActionState();
            updateNavDisabled();
          } catch (err) {
            alert('Error deleting question.');
            console.error('[SPMQuestions] Error in Delete:', err);
          } finally {
            setButtonDisabled(deleteBtn, false);
          }
          return;
        }

        if (action.text === 'save') {
          console.log('[SPMQuestions] Save clicked');
          
          const questionId = (fields.questionId?.value || '').trim();
          if (!questionId) {
            alert('Question ID is required.');
            return;
          }
          
          // Validate Question ID format: alphanumeric only, no spaces or special characters
          const questionIdPattern = /^[A-Za-z0-9]+$/;
          if (!questionIdPattern.test(questionId)) {
            alert('Question ID must contain only letters and numbers (no spaces or special characters).');
            fields.questionId?.focus();
            return;
          }
          
          // Validate Question ID length
          if (questionId.length > 50) {
            alert('Question ID must not exceed 50 characters.');
            fields.questionId?.focus();
            return;
          }
          
          // Check for duplicate Question ID on Add mode
          if (mode === 'add' && allQuestions.length > 0) {
            const isDuplicateId = allQuestions.some(q => 
              (q.QuestionID || '').toLowerCase() === questionId.toLowerCase()
            );
            if (isDuplicateId) {
              alert('Question ID already exists. Please use a different ID.');
              fields.questionId?.focus();
              return;
            }
          }

          const questionDescription = (fields.questionDescription?.value || '').trim();
          if (!questionDescription) {
            alert('Question Description is required.');
            return;
          }
          
          // Validate Question Description length
          if (questionDescription.length > 200) {
            alert('Question Description must not exceed 200 characters.');
            fields.questionDescription?.focus();
            return;
          }
          
          // Check for whitespace-only value
          if (fields.questionDescription?.value && !fields.questionDescription.value.trim()) {
            alert('Question Description cannot contain only whitespace.');
            fields.questionDescription?.focus();
            return;
          }
          
          // Validate Source of Information selection
          const sourceOfInfo = (fields.sourceOfInformation?.value || '').trim();
          if (!sourceOfInfo) {
            alert('Source of Information is required.');
            fields.sourceOfInformation?.focus();
            return;
          }
          
          // Validate QuestionType ID selection
          const questionType = (fields.questionTypeId?.value || '').trim();
          if (!questionType) {
            alert('QuestionType ID is required.');
            fields.questionTypeId?.focus();
            return;
          }
          
          // Validate Function Name (optional but if provided, check format)
          const funcName = (fields.functionName?.value || '').trim();
          if (funcName) {
            // Function name: alphanumeric and underscores only
            const funcNamePattern = /^[A-Za-z0-9_]+$/;
            if (!funcNamePattern.test(funcName)) {
              alert('Function Name must contain only letters, numbers, and underscores.');
              fields.functionName?.focus();
              return;
            }
          }

          if (answersList.length === 0) {
            alert('Please add at least one answer.');
            return;
          }

          // Get current user from session
          let operatorId = '';
          try {
            const session = JSON.parse(localStorage.getItem('nimble_auth_session') || '{}');
            operatorId = session.userId || session.operatorId || session.username || 'SYSTEM';
          } catch (_) {
            operatorId = 'SYSTEM';
          }

          // Determine EventID: N for new (add mode), A for alter (edit mode)
          const eventId = mode === 'add' ? 'N' : 'A';

          // Build XML - each answer gets its own dt_Questions node
          const xmlNodes = answersList.map(ans => {
            const answer = ans.Answer || ans.answer || '';
            const weight = ans.Weight || ans.weight || '';
            return `<dt_Questions>
  <QuestionID>${escapeXml(questionId)}</QuestionID>
  <Description>${escapeXml(questionDescription)}</Description>
  <SrcOfInfo>${escapeXml(fields.sourceOfInformation?.value || '')}</SrcOfInfo>
  <FuncName>${escapeXml(fields.functionName?.value || '')}</FuncName>
  <IsActive>1</IsActive>
  <CreatedBy>${escapeXml(operatorId)}</CreatedBy>
  <QuestionTypeID>${escapeXml(fields.questionTypeId?.value || '')}</QuestionTypeID>
  <EventID>${eventId}</EventID>
  <Answer>${escapeXml(answer)}</Answer>
  <Weight>${escapeXml(String(weight))}</Weight>
</dt_Questions>`;
          }).join('');

          const detailRecordsXml = xmlNodes;
          console.log('[SPMQuestions] Save XML:', detailRecordsXml);

          setButtonDisabled(saveBtn, true);
          try {
            const svc = window.SPMQuestionsService;
            if (!svc?.saveQuestions) {
              alert('SPMQuestionsService.saveQuestions is not available.');
              return;
            }

            const resp = await svc.saveQuestions({ DetailRecords: detailRecordsXml });
            console.log('[SPMQuestions] Save response:', resp);

            if (!resp || resp.success === false) {
              alert(resp?.message || 'Failed to save question.');
              return;
            }

            alert('Question saved successfully!');
            
            // Clear form and reset to initial state
            clearForm();
            currentQuestion = null;
            rows = [];
            rowIndex = 0;
            mode = 'view';
            viewAttempted = false;  // Reset to initial state
            lastViewFoundData = false;
            
            updateActionState();
            updateNavDisabled();
            
            // Focus on Question ID field
            if (fields.questionId) {
              fields.questionId.focus();
            }
          } catch (err) {
            alert('Error saving question.');
            console.error('[SPMQuestions] Error in Save:', err);
          } finally {
            setButtonDisabled(saveBtn, false);
          }
          return;
        }

        if (action.text === 'cancel') {
          console.log('[SPMQuestions] Cancel clicked');
          clearForm();
          currentQuestion = null;
          rows = [];
          rowIndex = 0;
          mode = 'view';
          viewAttempted = false; // Reset to initial state
          lastViewFoundData = false;
          updateActionState();
          updateNavDisabled();
          return;
        }
      }

      // Handle toolbar buttons
      const toolbar = isToolbarButton(e.target);
      if (toolbar) {
        if (toolbar.btn.disabled) return;
        e.preventDefault();

        if (toolbar.text === 'new') {
          console.log('[SPMQuestions] New answer clicked');
          
          if (mode === 'edit') {
            // Edit mode: only enable Answer and Weight fields
            setFormDisabled(true);
            if (fields.answer) {
              fields.answer.value = '';  // Clear for new entry
              fields.answer.disabled = false;
              fields.answer.focus();
            }
            if (fields.weight) {
              fields.weight.value = '';  // Clear for new entry
              fields.weight.disabled = false;
            }
            // Reset row selection
            selectedRowIndex = -1;
          } else {
            // Add mode: enable all form fields
            setFormDisabled(false);
            // Keep Question ID disabled in add mode (already filled)
            if (fields.questionId) {
              fields.questionId.disabled = true;
            }
            
            // Make questionDescription editable
            if (fields.questionDescription) {
              fields.questionDescription.readOnly = false;
              fields.questionDescription.focus();
            }
          }
          
          // Disable all centered buttons except Update and Clear
          setButtonDisabled(newBtn, true);
          setButtonDisabled(alterBtn, true);
          setButtonDisabled(removeBtn, true);
          setButtonDisabled(updateBtn, false);
          setButtonDisabled(clearBtn, false);
          
          // Disable Save button
          setButtonDisabled(saveBtn, true);
          
          return;
        }

        if (toolbar.text === 'alter') {
          console.log('[SPMQuestions] Alter answer clicked');
          if (selectedRowIndex < 0) {
            alert('Please Select any record from the Grid');
            return;
          }
          
          // Row is selected - enable Answer and Weight fields for editing
          if (fields.answer) {
            fields.answer.disabled = false;
            fields.answer.focus();
          }
          if (fields.weight) {
            fields.weight.disabled = false;
          }
          
          // Disable all centered buttons except Update and Clear
          setButtonDisabled(newBtn, true);
          setButtonDisabled(alterBtn, true);
          setButtonDisabled(removeBtn, true);
          setButtonDisabled(updateBtn, false);
          setButtonDisabled(clearBtn, false);
          
          return;
        }

        if (toolbar.text === 'remove') {
          console.log('[SPMQuestions] Remove answer clicked');
          if (selectedRowIndex < 0) {
            alert('Please Select any record from the Grid');
            return;
          }
          const confirmed = confirm('Are you sure you want to remove this answer?');
          if (!confirmed) return;
          
          // Remove the selected answer from the list
          answersList.splice(selectedRowIndex, 1);
          selectedRowIndex = -1;
          
          // Clear Answer/Weight fields
          if (fields.answer) fields.answer.value = '';
          if (fields.weight) fields.weight.value = '';
          
          // Re-render the grid
          renderAnswerGrid(answersList);
          
          // Enable Save button since there's a change
          setButtonDisabled(saveBtn, false);
          
          console.log('[SPMQuestions] Answer removed, remaining:', answersList.length);
          return;
        }

        if (toolbar.text === 'update') {
          console.log('[SPMQuestions] Update answer clicked');
          
          const answer = (fields.answer?.value || '').trim();
          const weight = (fields.weight?.value || '').trim();
          
          if (!answer || !weight) {
            alert('Please enter both Answer and Weight.');
            return;
          }
          
          // Validate Answer: prevent whitespace-only and max length
          if (fields.answer?.value && !fields.answer.value.trim()) {
            alert('Answer cannot contain only whitespace.');
            fields.answer?.focus();
            return;
          }
          if (answer.length > 200) {
            alert('Answer must not exceed 200 characters.');
            fields.answer?.focus();
            return;
          }
          
          // Validate Weight: numeric, positive, 0-100 range
          const weightNum = parseFloat(weight);
          if (isNaN(weightNum)) {
            alert('Weight must be a valid number.');
            fields.weight?.focus();
            return;
          }
          if (weightNum < 0) {
            alert('Weight must be a positive number.');
            fields.weight?.focus();
            return;
          }
          if (weightNum > 100) {
            alert('Weight must not exceed 100.');
            fields.weight?.focus();
            return;
          }
          
          if (selectedRowIndex < 0) {
            // No row selected - add new row to the table
            // Check for duplicate entry (same Answer and Weight)
            const isDuplicate = answersList.some(item => 
              (item.Answer || item.answer || '').toLowerCase() === answer.toLowerCase() &&
              (item.Weight || item.weight || '') === weight
            );
            
            if (isDuplicate) {
              alert('This Answer and Weight combination already exists.');
              return;
            }
            
            answersList.push({ Answer: answer, Weight: weight, answer, weight });
            console.log('[SPMQuestions] Answer added, total:', answersList.length);
          } else {
            // Update the selected answer in the list
            answersList[selectedRowIndex] = { Answer: answer, Weight: weight, answer, weight };
            console.log('[SPMQuestions] Answer updated at index:', selectedRowIndex);
          }
          
          // Re-render the grid
          renderAnswerGrid(answersList);
          
          // Clear Answer/Weight fields for next entry
          if (fields.answer) fields.answer.value = '';
          if (fields.weight) fields.weight.value = '';
          selectedRowIndex = -1;
          
          // Enable Save button after data is added to the table
          setButtonDisabled(saveBtn, false);
          
          // Re-enable New button to allow adding more rows
          setButtonDisabled(newBtn, false);
          
          return;
        }

        if (toolbar.text === 'clear') {
          console.log('[SPMQuestions] Clear clicked');
          if (fields.answer) fields.answer.value = '';
          if (fields.weight) fields.weight.value = '';
          return;
        }
      }
    });

    // ===== QUESTION LOOKUP MODAL =====
    const questionLookupModalEl = document.getElementById('questionLookupModal');
    const questionLookupModal = questionLookupModalEl ? new bootstrap.Modal(questionLookupModalEl) : null;
    const questionLookupResults = document.querySelector('[data-question-lookup-results]');
    const questionLookupEmpty = document.querySelector('[data-question-lookup-empty]');
    const questionLookupLoading = document.querySelector('[data-question-lookup-loading]');
    const questionCountEl = document.querySelector('[data-question-count]');
    const questionFilterId = document.querySelector('[data-question-filter="QuestionID"]');
    const questionFilterDesc = document.querySelector('[data-question-filter="Description"]');

    // Open modal when search button clicked - auto-load questions
    document.querySelectorAll('[data-open-search="question"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!questionLookupModal) {
          console.error('[SPMQuestions] Question lookup modal not found');
          return;
        }
        // Clear filters
        if (questionFilterId) questionFilterId.value = '';
        if (questionFilterDesc) questionFilterDesc.value = '';
        
        questionLookupModal.show();
        
        // Auto-load questions on modal open
        await loadAllQuestions();
      });
    });

    // Filter inputs - filter client-side as user types
    questionFilterId?.addEventListener('input', filterQuestions);
    questionFilterDesc?.addEventListener('input', filterQuestions);

    // Reset button
    document.querySelector('[data-question-reset]')?.addEventListener('click', () => {
      if (questionFilterId) questionFilterId.value = '';
      if (questionFilterDesc) questionFilterDesc.value = '';
      renderQuestionLookupResults(allQuestions);
    });

    async function loadAllQuestions() {
      showQuestionLookupLoading(true);
      hideQuestionLookupEmpty();
      clearQuestionLookupResults();
      if (questionCountEl) questionCountEl.textContent = 'Loading questions...';

      try {
        const svc = window.SPMQuestionsService;
        if (!svc?.getQuestions) {
          alert('SPMQuestionsService is not available.');
          return;
        }

        // Load all questions by passing empty QuestionID
        const resp = await svc.getQuestions({
          QuestionID: '',
          Direction: 0,
          QuestionType: ''
        });

        console.log('[SPMQuestions] Lookup response:', resp);

        // Extract results - handle different response structures
        let results = [];
        if (resp?.Details && Array.isArray(resp.Details)) {
          results = resp.Details;
        } else if (resp?.data && Array.isArray(resp.data)) {
          results = resp.data;
        } else if (Array.isArray(resp)) {
          results = resp;
        }

        // Group by QuestionID to get unique questions
        const uniqueQuestions = new Map();
        results.forEach(item => {
          const qid = item.QuestionID;
          if (qid && !uniqueQuestions.has(qid)) {
            uniqueQuestions.set(qid, {
              QuestionID: qid,
              QuestionDescription: item.QuestionDescription || item.Description || '',
              QuestionTypeID: item.QuestionTypeID || '',
              FuncName: item.FuncName || '',
              SrcOfInfo: item.SrcOfInfo || ''
            });
          }
        });

        allQuestions = Array.from(uniqueQuestions.values());

        if (allQuestions.length > 0) {
          renderQuestionLookupResults(allQuestions);
          if (questionCountEl) questionCountEl.textContent = `${allQuestions.length} question(s) found`;
        } else {
          showQuestionLookupEmpty();
          if (questionCountEl) questionCountEl.textContent = 'No questions found';
        }

      } catch (err) {
        console.error('[SPMQuestions] Load questions error:', err);
        showQuestionLookupEmpty();
        if (questionCountEl) questionCountEl.textContent = 'Error loading questions';
      } finally {
        showQuestionLookupLoading(false);
      }
    }

    function filterQuestions() {
      const idFilter = (questionFilterId?.value || '').trim().toLowerCase();
      const descFilter = (questionFilterDesc?.value || '').trim().toLowerCase();

      let filtered = allQuestions;

      if (idFilter) {
        filtered = filtered.filter(q => 
          (q.QuestionID || '').toLowerCase().includes(idFilter)
        );
      }

      if (descFilter) {
        filtered = filtered.filter(q => 
          (q.QuestionDescription || '').toLowerCase().includes(descFilter)
        );
      }

      if (filtered.length > 0) {
        renderQuestionLookupResults(filtered);
        hideQuestionLookupEmpty();
        if (questionCountEl) questionCountEl.textContent = `${filtered.length} of ${allQuestions.length} question(s)`;
      } else {
        clearQuestionLookupResults();
        showQuestionLookupEmpty();
        if (questionCountEl) questionCountEl.textContent = `0 of ${allQuestions.length} question(s)`;
      }
    }

    function renderQuestionLookupResults(questions) {
      if (!questionLookupResults) return;
      questionLookupResults.innerHTML = '';
      hideQuestionLookupEmpty();

      questions.forEach(item => {
        const row = document.createElement('tr');
        row.style.cursor = 'pointer';
        row.innerHTML = `
          <td>${escapeHtmlLookup(item.QuestionID || '')}</td>
          <td>${escapeHtmlLookup(item.QuestionDescription || '')}</td>
          <td class="text-end">
            <button type="button" class="btn btn-sm btn-primary" data-select-question='${escapeHtmlLookup(JSON.stringify(item))}'>
              Select
            </button>
          </td>
        `;
        
        // Allow clicking entire row to select
        row.addEventListener('dblclick', () => selectQuestion(item));
        
        questionLookupResults.appendChild(row);
      });

      // Attach select handlers to buttons
      questionLookupResults.querySelectorAll('[data-select-question]').forEach(btn => {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          const item = JSON.parse(this.getAttribute('data-select-question'));
          selectQuestion(item);
        });
      });
    }

    function selectQuestion(item) {
      // Populate form fields with selected question
      if (fields.questionId) fields.questionId.value = item.QuestionID || '';
      if (fields.questionDescription) fields.questionDescription.value = item.QuestionDescription || '';
      if (fields.functionName) fields.functionName.value = item.FuncName || '';
      if (fields.sourceOfInformation) fields.sourceOfInformation.value = item.SrcOfInfo || '';
      if (fields.questionTypeId) fields.questionTypeId.value = item.QuestionTypeID || '';

      // Close modal
      questionLookupModal?.hide();

      console.log('[SPMQuestions] Question selected:', item.QuestionID);
      
      // Auto-trigger View to load complete data with answers
      setTimeout(() => viewBtn?.click(), 100);
    }

    function escapeHtmlLookup(text) {
      if (text == null) return '';
      const div = document.createElement('div');
      div.textContent = String(text);
      return div.innerHTML;
    }

    function showQuestionLookupLoading(show) {
      if (!questionLookupLoading) return;
      questionLookupLoading.classList.toggle('d-none', !show);
    }

    function hideQuestionLookupEmpty() {
      if (questionLookupEmpty) questionLookupEmpty.classList.add('d-none');
    }

    function showQuestionLookupEmpty() {
      if (questionLookupEmpty) questionLookupEmpty.classList.remove('d-none');
    }

    function clearQuestionLookupResults() {
      if (questionLookupResults) questionLookupResults.innerHTML = '';
    }

    // Real-time validation: strip invalid characters from Question ID as user types
    fields.questionId?.addEventListener('input', (e) => {
      const input = e.target;
      const cleaned = input.value.replace(/[^A-Za-z0-9]/g, '');
      if (input.value !== cleaned) {
        input.value = cleaned;
      }
    });

    // Initialize
    updateNavDisabled();
    updateActionState();
    console.log('[SPMQuestions] Initialized');
  })();
})();
