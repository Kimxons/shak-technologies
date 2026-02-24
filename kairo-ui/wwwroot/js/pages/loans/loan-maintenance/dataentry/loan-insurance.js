(function (global) {
  if (global.__LoanInsuranceLoaded) {
    console.warn("loan-insurance.js already loaded; skipping duplicate execution.");
    return;
  }
  global.__LoanInsuranceLoaded = true;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const InsuranceService = global.InsuranceService;

  if (!InsuranceService) {
    console.error("[LoanInsurance] InsuranceService not loaded");
    return;
  }

  const service = new InsuranceService();

  function requestClose() {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ action: 'close-child-form' }, '*');
    }
  }

  function showMessage(msg, color = "Red") {
    // Show validation and error messages as a popup if color is Red
    if (color === "Red") {
      alert(msg);
    }
    // Optionally, show other colors as alerts or just log
    else {
      // For now, just log non-error messages
      console.log(`[LoanInsurance] Message (${color}): ${msg}`);
    }
  }

  function clearMessage() {
    // Message display element has been removed from HTML
    // This function is kept for backward compatibility but does nothing
    console.log("[LoanInsurance] Message cleared");
  }

  // --- SearchModal singleton ---
  let insuranceSearchModal = null;
  function getInsuranceSearchModal() {
    if (!insuranceSearchModal) {
      insuranceSearchModal = new window.SearchModal({
        prefix: 'insurance',
        moduleID: '4305',
        getOperatorId: () => service.getOperatorId(),
        getOurBranchId: () => service.getOurBranchId(),
        onError: (msg) => showMessage(msg, 'Red')
      });
    }
    return insuranceSearchModal;
  }

  function init() {
    const root = document;
    const panel = $(".lins-shell", root);
    if (!panel) return;

    const actionBtns = {
      view: $("[data-action='view']", root),
      add: $("[data-action='add']", root),
      edit: $("[data-action='edit']", root),
      del: $("[data-action='delete']", root),
      save: $("[data-action='save']", root),
      cancel: $("[data-action='cancel']", root),
      back: $("[data-action='back']", root),
      prev: $("[data-action='prev']", root),
      next: $("[data-action='next']", root)
    };

    const lookupBtns = $$('[data-lookup]', root);

    const inputs = $$('input, select, textarea', root).filter((el) => {
      // Exclude readonly and hidden fields
      if (el.hasAttribute('readonly') || el.type === 'hidden') return false;
      return true;
    });

    const btsFields = $$('[data-bts]', root);

    const state = {
      mode: 'view',
      hasRecord: false,
      currentPolicy: null,
      directionNav: 0,
      updateCount: 0,
      isSupervised: false,
      editOperator: null,
      createdBy: null,
      currentOperator: service.getOperatorId(),
      accountStatus: 'A'
    };

    // Premium Frequency calculation helper
    const calculateNextPremiumDate = (lastPremiumDate, frequency) => {
      if (!lastPremiumDate || !frequency) return null;
      const date = new Date(lastPremiumDate);
      const nextDate = new Date(date);
      
      switch (frequency.toUpperCase()) {
        case 'D': // Daily
          nextDate.setDate(nextDate.getDate() + 1);
          break;
        case 'W': // Weekly
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case 'M': // Monthly
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
        case 'Q': // Quarterly
          nextDate.setMonth(nextDate.getMonth() + 3);
          break;
        case 'H': // Half-yearly
          nextDate.setMonth(nextDate.getMonth() + 6);
          break;
        case 'Y': // Yearly
          nextDate.setFullYear(nextDate.getFullYear() + 1);
          break;
        default:
          return null;
      }
      
      return nextDate.toISOString().split('T')[0];
    };

    const setMode = (mode) => {
      state.mode = mode;
      const isView = mode === 'view';

      // In view mode, only enable PolicyNo and search button
      if (isView && !state.hasRecord) {
        // No record loaded - enable only PolicyNo search
        inputs.forEach((el) => {
          el.disabled = true;
        });
        
        // Enable PolicyNo field and search button for looking up records
        const policyNoField = $("#PolicyNo", root);
        const policySearchBtn = $('[data-lookup="policy"]', root);
        if (policyNoField) policyNoField.disabled = false;
        if (policySearchBtn) policySearchBtn.disabled = false;

        // Disable all action buttons except View and Back
        if (actionBtns.view) actionBtns.view.disabled = false;
        if (actionBtns.add) actionBtns.add.disabled = true;
        if (actionBtns.edit) actionBtns.edit.disabled = true;
        if (actionBtns.del) actionBtns.del.disabled = true;
        if (actionBtns.save) actionBtns.save.disabled = true;
        if (actionBtns.cancel) actionBtns.cancel.disabled = true;
        if (actionBtns.prev) actionBtns.prev.disabled = true;
        if (actionBtns.next) actionBtns.next.disabled = true;
        if (actionBtns.back) actionBtns.back.disabled = false;

        return;
      }

      // Record is loaded - normal view mode
      if (isView && state.hasRecord) {
        inputs.forEach((el) => {
          el.disabled = true;
        });

        // Disable search buttons when viewing a record
        lookupBtns.forEach((btn) => {
          btn.disabled = true;
        });

        if (actionBtns.view) actionBtns.view.classList.add('lins-action-btn--primary');
        if (actionBtns.add) actionBtns.add.disabled = true;
        if (actionBtns.edit) actionBtns.edit.disabled = false;
        if (actionBtns.del) actionBtns.del.disabled = false;
        if (actionBtns.save) actionBtns.save.disabled = true;
        if (actionBtns.cancel) actionBtns.cancel.disabled = true;
        if (actionBtns.prev) actionBtns.prev.disabled = false;
        if (actionBtns.next) actionBtns.next.disabled = false;

        return;
      }

      // Edit or Add mode - enable input fields
      inputs.forEach((el) => {
        el.disabled = false;
      });

      // Enable PremiumFrequency field in add/edit mode
      const premiumFreqSelect = $("#PremiumFrequency", root);
      if (premiumFreqSelect) premiumFreqSelect.disabled = false;

      // Manage lookup buttons - disabled for PolicyNo, enabled for Company
      lookupBtns.forEach((btn) => {
        if (btn.dataset.lookup === 'policy') {
          btn.disabled = true; // Can't search while in edit/add mode
        } else {
          btn.disabled = false; // Can search for company
        }
      });

      if (actionBtns.view) {
        actionBtns.view.classList.remove('lins-action-btn--primary');
        actionBtns.view.disabled = true; // Disable View button in add/edit mode
      }
      if (actionBtns.add) actionBtns.add.disabled = true;
      if (actionBtns.edit) actionBtns.edit.disabled = true;
      if (actionBtns.del) actionBtns.del.disabled = true;
      if (actionBtns.save) actionBtns.save.disabled = false;
      if (actionBtns.cancel) actionBtns.cancel.disabled = false;
      if (actionBtns.prev) actionBtns.prev.disabled = true;
      if (actionBtns.next) actionBtns.next.disabled = true;

      // Disable PolicyNo field in edit/add mode
      const policyNoField = $("#PolicyNo", root);
      if (policyNoField) policyNoField.disabled = mode === 'edit';

      console.log(`[LoanInsurance] Mode changed to: ${mode}`);
    };

    const clearForm = (keepPolicyNo = false) => {
      inputs.forEach((el) => {
        // Keep PolicyNo if specified, or if in view mode without record
        if (keepPolicyNo && el.id === 'PolicyNo') {
          return;
        }
        // Don't clear BTS fields
        if (el.hasAttribute('readonly')) {
          return;
        }
        el.value = '';
      });
      // Clear nominee rows
      $$('.nominee-row', root).forEach((row) => {
        row.querySelectorAll('input, select').forEach((field) => {
          field.value = '';
        });
      });
      clearMessage();
    };

    const loadDropdowns = async () => {
      try {
        console.log("[LoanInsurance] Loading dropdowns...");

        // Load Insurance Types (System Code: LifeInsuranceTypeID)
        // LookupService returns: {value, label, order}
        let insuranceTypes = await service.fetchDropdownData('InsuranceType');
        console.log('[LoanInsurance] InsuranceType response:', insuranceTypes);
        let insuranceTypeSelect = $("#InsuranceType", root);
        if (insuranceTypeSelect) {
          insuranceTypeSelect.innerHTML = '<option value="">--Select--</option>';
          if (insuranceTypes && insuranceTypes.length > 0) {
            insuranceTypes.forEach((item) => {
              const option = document.createElement('option');
              option.value = item.value || '';
              option.textContent = item.label || '';
              insuranceTypeSelect.appendChild(option);
            });
          }
          console.log('[LoanInsurance] InsuranceType dropdown populated with', insuranceTypeSelect.options.length - 1, 'options');
        }

        // Load Premium Types (Static options in HTML)
        // PremiumType has hardcoded options (One Time=O, Recurring=R)
        let premiumTypeSelect = $("#PremiumType", root);
        // Keeping static options as per HTML

        // Load Premium Frequencies (System Code: FrequencyID)
        // LookupService returns: {value, label, order}
        let frequencies = await service.fetchDropdownData('PremiumFrequency');
        console.log('[LoanInsurance] PremiumFrequency response:', frequencies);
        let frequencySelect = $("#PremiumFrequency", root);
        if (frequencySelect) {
          frequencySelect.innerHTML = '<option value="">--Select--</option>';
          if (frequencies && frequencies.length > 0) {
            frequencies.forEach((item) => {
              const option = document.createElement('option');
              option.value = item.value || '';
              option.textContent = item.label || '';
              frequencySelect.appendChild(option);
            });
          }
          console.log('[LoanInsurance] PremiumFrequency dropdown populated with', frequencySelect.options.length - 1, 'options');
        }

        // Load Relations for nominees (System Code: RelationID)
        // LookupService returns: {value, label, order}
        let relations = await service.fetchDropdownData('NomineeRelation');
        console.log('[LoanInsurance] NomineeRelation response:', relations);
        $$('select[data-nominee-relation]', root).forEach((relationSelect) => {
          relationSelect.innerHTML = '<option value="">--Select--</option>';
          if (relations && relations.length > 0) {
            relations.forEach((item) => {
              const option = document.createElement('option');
              option.value = item.value || '';
              option.textContent = item.label || '';
              relationSelect.appendChild(option);
            });
          }
        });
      } catch (error) {
        console.error("[LoanInsurance] Error loading dropdowns:", error);
      }
    };

    const populateParentData = () => {
      try {
        // Get parent context from window.parent
        const parentDoc = global.parent?.document;
        if (!parentDoc) return;

        const branchId = parentDoc.querySelector('[data-lm-branch-id]')?.value ||
                         parentDoc.getElementById('BranchID')?.value || '';
        const accountId = parentDoc.querySelector('[data-lm-account-id]')?.value ||
                          parentDoc.getElementById('AccountID')?.value || '';
        const loanSeries = parentDoc.querySelector('[data-lm-loan-series]')?.value ||
                           parentDoc.getElementById('LoanSeries')?.value || '';
        const accountStatus = parentDoc.querySelector('[data-lm-account-status]')?.value ||
                             parentDoc.getElementById('AccountStatusID')?.value || 'A';

        service.setDynamicValue('BranchID', branchId);
        service.setDynamicValue('AccountID', accountId);
        service.setDynamicValue('LoanSeries', loanSeries);
        state.accountStatus = accountStatus;

        // Set Behind The Scene fields
        const loanAmountEl = $("#LoanAmount", root);
        if (loanAmountEl) {
          const loanAmount = parentDoc.getElementById('DisbursedAmount')?.value || '';
          loanAmountEl.value = loanAmount;
        }

        console.log("[LoanInsurance] Parent data populated:", {
          branchId, accountId, loanSeries, accountStatus
        });
      } catch (error) {
        console.error("[LoanInsurance] Error populating parent data:", error);
      }
    };

    /**
     * Setup nominee field dynamic behavior
     * Relation and Share fields only enabled when nominee name is entered
     */
    const setupNomineeFieldBehavior = () => {
      try {
        for (let i = 1; i <= 3; i++) {
          const nameField = $(`#Nominee${i}Name`, root);
          const relationField = $(`#Nominee${i}Relation`, root);
          const shareField = $(`#Nominee${i}Share`, root);

          if (nameField) {
            nameField.on('input change', function() {
              const hasName = $(this).val() && $(this).val().trim() !== '';
              
              if (relationField) {
                relationField.prop('disabled', !hasName);
              }
              if (shareField) {
                shareField.prop('disabled', !hasName);
              }
            });

            // Initial state - disable if name is empty
            const hasName = nameField.val() && nameField.val().trim() !== '';
            if (relationField) {
              relationField.prop('disabled', !hasName);
            }
            if (shareField) {
              shareField.prop('disabled', !hasName);
            }
          }
        }
        console.log("[LoanInsurance] Nominee field behavior setup complete");
      } catch (error) {
        console.error("[LoanInsurance] Error setting up nominee field behavior:", error);
      }
    };

    /**
     * Check if account is eligible for operations
     */
    const checkAccountEligibility = () => {
      if (state.accountStatus && state.accountStatus !== 'A') {
        return {
          eligible: false,
          message: `Account is not Active (Status: ${state.accountStatus}). Operations are disabled.`
        };
      }
      return { eligible: true };
    };

    /**
     * Apply account status restrictions
     */
    const applyAccountStatusRestrictions = () => {
      try {
        const eligibility = checkAccountEligibility();
        const editBtn = $("#btnEdit", root);
        const addBtn = $("#btnAdd", root);
        const deleteBtn = $("#btnDelete", root);

        if (!eligibility.eligible) {
          if (editBtn) editBtn.prop('disabled', true).attr('title', eligibility.message);
          if (addBtn) addBtn.prop('disabled', true).attr('title', eligibility.message);
          if (deleteBtn) deleteBtn.prop('disabled', true).attr('title', eligibility.message);
          
          console.warn("[LoanInsurance] Account status restriction applied:", eligibility.message);
        }
      } catch (error) {
        console.error("[LoanInsurance] Error applying account status restrictions:", error);
      }
    };

    const validateInsuranceRecord = () => {
      const policyNo = $("#PolicyNo", root)?.value || '';
      const policyDate = $("#PolicyDate", root)?.value || '';
      const insuranceType = $("#InsuranceType", root)?.value || '';
      const companyId = $("#CompanyID", root)?.value || '';
      const maturityDate = $("#MaturityDate", root)?.value || '';
      const policyAmount = $("#PolicyAmount", root)?.value || '';
      const premiumType = $("#PremiumType", root)?.value || '';
      const premiumAmount = $("#PremiumAmount", root)?.value || '';
      const lastPremiumDate = $("#LastPremiumPaidDate", root)?.value || '';

      let errors = [];

      if (!policyNo) errors.push("Policy No is required");
      if (!policyDate) errors.push("Policy Date is required");
      if (!insuranceType) errors.push("Insurance Type is required");
      if (!companyId) errors.push("Company ID is required");
      if (!maturityDate) errors.push("Maturity Date is required");
      if (!policyAmount) errors.push("Policy Amount is required");
      if (!premiumType) errors.push("Premium Type is required");
      if (!premiumAmount) errors.push("Premium Amount is required");
      if (!lastPremiumDate && premiumType === 'R') errors.push("Last Premium Paid Date is required for recurring premiums");

      // Numeric validations
      const policyAmountNum = parseFloat(policyAmount) || 0;
      const premiumAmountNum = parseFloat(premiumAmount) || 0;

      if (policyAmountNum === 0) errors.push("Policy Amount must be greater than 0");
      if (premiumAmountNum === 0) errors.push("Premium Amount must be greater than 0");
      if (premiumAmountNum >= policyAmountNum) errors.push("Premium Amount must be less than Policy Amount");

      // Validate nominees if present
      let nomineeCount = 0;
      let totalShare = 0;
      $$('.nominee-row', root).forEach((row) => {
        const nomName = row.querySelector('[data-nominee-name]')?.value || '';
        const relation = row.querySelector('[data-nominee-relation]')?.value || '';
        const share = row.querySelector('[data-nominee-share]')?.value || '';

        if (nomName) {
          nomineeCount++;
          if (!relation) errors.push("Relation is required for all nominees");
          if (!share) errors.push("Share is required for all nominees");
          totalShare += parseFloat(share) || 0;
        }
      });

      if (nomineeCount > 0 && totalShare > 100) {
        errors.push("Total nominee share cannot exceed 100%");
      }

      if (errors.length > 0) {
        showMessage(errors.join("; "), "Red");
        return false;
      }

      return true;
    };

    // ===== EVENT LISTENERS =====

    /**
     * View button - search for a policy by Policy No
     * If found, load the record for viewing/editing
     * If not found, allow Add option
     */
    actionBtns.view?.addEventListener('click', () => {
      clearMessage();
      
      const policyNo = ($("#PolicyNo", root)?.value || '').trim();
      
      if (!policyNo) {
        showMessage('Please enter a Policy No to search', 'Orange');
        $("#PolicyNo", root)?.focus();
        return;
      }

      (async () => {
        try {
          console.log("[LoanInsurance] View clicked - searching for policy:", policyNo);
          
          const accountId = service.getDynamicValue('AccountID');
          const branchId = service.getDynamicValue('BranchID');
          const loanSeries = service.getDynamicValue('LoanSeries');

          if (!accountId) {
            showMessage('Account ID not found. Please go back and try again.', 'Red');
            return;
          }

          // Fetch policy using p_GetAccountInsurances
          const result = await service.fetchInsuranceByPolicyNo({ 
            branchId: branchId,
            accountId: accountId,
            loanSeries: loanSeries,
            policyNo: policyNo,
            direction: 0
          });

          console.log('[LoanInsurance] Fetch result:', result);

          if (result.success && result.record) {

            // Policy found - load it
            const record = result.record;
            state.currentPolicy = record.PolicyNo;
            state.updateCount = record.UpdateCount || 0;
            state.editOperator = record.CreatedBy || service.getOperatorId();
            state.createdBy = record.CreatedBy || service.getOperatorId();
            state.hasRecord = true;

            // Helper to format date (YYYY-MM-DD from ISO or blank)
            const formatDate = (val) => {
              if (!val) return '';
              if (typeof val === 'string' && val.length >= 10) return val.substring(0, 10);
              return val;
            };

            // Main fields
            $("#PolicyNo", root).value = record.PolicyNo || '';
            $("#PolicyDate", root).value = formatDate(record.PolicyDate);
            $("#CompanyID", root).value = record.InsuranceID || '';
            $("#CompanyName", root).value = record.CompanyName || '';
            $("#InsuranceType", root).value = record.LifeInsuranceTypeID || '';
            $("#PolicyAmount", root).value = record.PolicyAmount != null ? record.PolicyAmount : '';
            $("#PremiumAmount", root).value = record.PremiumAmount != null ? record.PremiumAmount : '';
            $("#MaturityDate", root).value = formatDate(record.PolicyMaturityDate);
            $("#PremiumType", root).value = record.PremiumTypeID || '';
            $("#PremiumFrequency", root).value = record.PremiumFrequencyID || '';
            $("#LastPremiumPaidDate", root).value = formatDate(record.LastPremiumPaidDate);
            $("#NextPremiumDate", root).value = formatDate(record.NextPremiumDueDate);
            $("#InsuranceRemarks", root).value = record.Remarks || '';

            // Behind The Scene fields
            $("#LoanAmount", root).value = record.SanctionedAmount != null ? record.SanctionedAmount : '';
            $("#TotalPolicyAmount", root).value = record.TotalPolicyAmount != null ? record.TotalPolicyAmount : '';

            // Audit fields
            $("#CreatedBy", root).value = record.CreatedBy || '';
            $("#CreatedOn", root).value = formatDate(record.CreatedOn);
            $("#ModifiedBy", root).value = record.ModifiedBy || '';
            $("#ModifiedOn", root).value = formatDate(record.ModifiedOn);
            $("#SupervisedBy", root).value = record.SupervisedBy || '';
            $("#SupervisedOn", root).value = formatDate(record.SupervisedOn);

            // Populate nominees
            if (result.nominees && result.nominees.length > 0) {
              const nomineeRows = $$('.nominee-row', root);
              result.nominees.forEach((nominee, index) => {
                if (nomineeRows[index]) {
                  const nameField = nomineeRows[index].querySelector('[data-nominee-name]');
                  const relationField = nomineeRows[index].querySelector('[data-nominee-relation]');
                  const shareField = nomineeRows[index].querySelector('[data-nominee-share]');
                  if (nameField) nameField.value = nominee.name || '';
                  if (relationField) relationField.value = nominee.relation || '';
                  if (shareField) shareField.value = nominee.share != null ? nominee.share : '';
                }
              });
            }

            clearMessage();
            setMode('view');
          } else {
            // Policy not found - enable Add button without showing dialog
            state.hasRecord = false;
            state.currentPolicy = null;
            clearMessage();
            
            // Enable Add button so user can add new policy
            if (actionBtns.add) actionBtns.add.disabled = false;
          }
        } catch (error) {
          console.error("[LoanInsurance] View search error:", error);
          showMessage('Search failed: ' + error.message, 'Red');
        }
      })();
    });

    actionBtns.add?.addEventListener('click', () => {
      clearMessage();
      
      const policyNo = ($("#PolicyNo", root)?.value || '').trim();
      
      if (!policyNo) {
        showMessage('Please enter a Policy No for the new record', 'Orange');
        $("#PolicyNo", root)?.focus();
        return;
      }

      clearForm(true); // Keep PolicyNo
      
      state.hasRecord = false;
      state.currentPolicy = null;
      state.mode = 'add';
      state.updateCount = 0;
      
      setMode('add');
      $("#PolicyDate", root)?.focus();
      showMessage('Creating new insurance policy', 'Green');
    });

    actionBtns.edit?.addEventListener('click', () => {
      clearMessage();
      if (!state.hasRecord) {
        showMessage('No record loaded to edit', 'Red');
        return;
      }
      
      // Check if current operator is allowed to edit
      if (state.editOperator && state.currentOperator && state.editOperator !== state.currentOperator) {
        showMessage(`Record was created by another operator (${state.editOperator}). Cannot edit.`, 'Red');
        return;
      }
      
      state.mode = 'edit';
      setMode('edit');
      $("#PolicyDate", root)?.focus();
    });

    actionBtns.del?.addEventListener('click', () => {
      clearMessage();
      if (!state.hasRecord) {
        showMessage('No record to delete', 'Red');
        return;
      }
      
      // Check if current operator is allowed to delete
      if (state.editOperator && state.currentOperator && state.editOperator !== state.currentOperator) {
        showMessage(`Record was created by another operator (${state.editOperator}). Cannot delete.`, 'Red');
        return;
      }
      if (!confirm('Delete this insurance record?')) return;

      (async () => {
        try {
          // Prepare delete context - uses p_DeleteAccountInsurances with NewRecord=UpdateCount
          const context = {
            branchId: service.getDynamicValue('BranchID'),
            accountId: service.getDynamicValue('AccountID'),
            loanSeries: service.getDynamicValue('LoanSeries'),
            policyNo: state.currentPolicy,
            updateCount: state.updateCount || 0
          };

          const result = await service.deleteInsuranceRecord(context);
          if (result.success) {
            showMessage('Record deleted successfully', 'Green');
            state.hasRecord = false;
            state.currentPolicy = null;
            state.updateCount = 0;
            clearForm();
            setMode('view');
          } else {
            showMessage(result.error || 'Delete failed', 'Red');
          }
        } catch (error) {
          console.error("[LoanInsurance] Delete error:", error);
          showMessage('Delete failed: ' + error.message, 'Red');
        }
      })();
    });

    actionBtns.save?.addEventListener('click', () => {
      clearMessage();
      if (!validateInsuranceRecord()) {
        return;
      }

      (async () => {
        try {
          // Helper to sanitize empty strings to null for null parameters in SQL
          const sanitizeForSql = (value) => {
            if (value === '' || value === undefined || value === null) {
              return '';
            }
            return value;
          };

          // Check if supervision is required
          let supervisionRemarks = '';
          if (state.isSupervised) {
            // Show supervision dialog - for now we'll use a simple prompt
            // In production, this would be a proper BRDialog with remarks field
            const remarks = prompt('This record requires supervision.\nPlease provide approval remarks:');
            if (remarks === null) {
              showMessage('Save cancelled - supervision remarks required', 'Orange');
              return;
            }
            supervisionRemarks = remarks;
          }

          // Build payload matching p_AddEditAccountInsurances parameters
          // All NULL/empty fields should pass empty string, not null
          const payload = {
            OurBranchID: sanitizeForSql(service.getDynamicValue('BranchID')),
            AccountID: sanitizeForSql(service.getDynamicValue('AccountID')),
            LoanSeries: sanitizeForSql(service.getDynamicValue('LoanSeries')) || 0,
            PolicyNo: sanitizeForSql($("#PolicyNo", root)?.value),
            PolicyDate: sanitizeForSql($("#PolicyDate", root)?.value),
            InsuranceID: sanitizeForSql($("#CompanyID", root)?.value),
            LifeInsuranceTypeID: sanitizeForSql($("#InsuranceType", root)?.value),
            PolicyAmount: parseFloat($("#PolicyAmount", root)?.value) || 0,
            PremiumAmount: parseFloat($("#PremiumAmount", root)?.value) || 0,
            PolicyMaturityDate: sanitizeForSql($("#MaturityDate", root)?.value),
            PremiumTypeID: sanitizeForSql($("#PremiumType", root)?.value),
            PremiumFrequencyID: sanitizeForSql($("#PremiumFrequency", root)?.value),
            LastPremiumPaidDate: sanitizeForSql($("#LastPremiumPaidDate", root)?.value),
            NextPremiumDueDate: sanitizeForSql($("#NextPremiumDate", root)?.value),
            Remarks: sanitizeForSql(supervisionRemarks || $("#InsuranceRemarks", root)?.value),
            CreatedBy: sanitizeForSql(service.getOperatorId()),
            CreatedOn: sanitizeForSql($("#CreatedOn", root)?.value),
            ModifiedBy: sanitizeForSql(service.getOperatorId()),
            ModifiedOn: new Date().toISOString().slice(0, 19).replace('T', ' '),
            SupervisedBY: '',
            // NewRecord: 1 for add, otherwise UpdateCount as-is for edit
            NewRecord: state.mode === 'add' ? 1 : (typeof state.updateCount === 'number' ? state.updateCount : 0)
          };

          // Collect nominees with proper parameter names
          // Nominee fields with empty names should pass empty strings (not null)
          $$('.nominee-row', root).forEach((row, index) => {
            const nomineeNum = index + 1;
            const nomName = sanitizeForSql(row.querySelector('[data-nominee-name]')?.value);
            const relation = sanitizeForSql(row.querySelector('[data-nominee-relation]')?.value);
            const share = row.querySelector('[data-nominee-share]')?.value;
            
            payload[`Nominee${nomineeNum}`] = nomName;
            payload[`RelationID${nomineeNum}`] = relation;
            payload[`Share${nomineeNum}`] = share ? parseFloat(share) : '';
          });

          const result = await service.saveInsuranceRecord(payload);
          console.log('[LoanInsurance] Save response:', result);
          
          if (result.success) {
            alert('Data Saved Successfully');
            
            // Clear all fields after successful save
            clearForm();
            
            // Reset state to initial view mode
            state.hasRecord = false;
            state.currentPolicy = null;
            state.updateCount = 0;
            state.editOperator = null;
            state.createdBy = null;
            state.mode = 'view';
            
            console.log('[LoanInsurance] Form cleared after successful save');
            
            // Set mode to view (only PolicyNo and View button enabled)
            setMode('view');
          } else {
            // On error, don't clear fields so user can correct the data
            alert(result.error || 'Save failed');
            console.error('[LoanInsurance] Save failed:', result.error);
          }
        } catch (error) {
          console.error("[LoanInsurance] Save error:", error);
          showMessage('Save failed: ' + error.message, 'Red');
        }
      })();
    });

    actionBtns.cancel?.addEventListener('click', () => {
      clearMessage();
      if (!confirm('Cancel changes?')) return;
      
      // If no record was loaded (user was in Add mode), reset to view mode with default state
      if (!state.hasRecord) {
        clearForm();
        state.mode = 'view';
        state.hasRecord = false;
        state.currentPolicy = null;
        state.updateCount = 0;
        
        // Re-enable View button for next search
        if (actionBtns.view) actionBtns.view.disabled = false;
        if (actionBtns.add) actionBtns.add.disabled = true;
        
        $("#PolicyNo", root)?.focus();
      } else {
        // Record exists, just exit edit/add mode
        setMode('view');
      }
    });

    actionBtns.back?.addEventListener('click', () => {
      requestClose();
    });

    /**
     * Navigate to previous/next insurance record for same account
     */
    const navigateInsuranceRecord = async (direction) => {
      try {
        if (!state.hasRecord || !state.currentPolicy) {
          showMessage('No record loaded to navigate from', 'Red');
          return;
        }

        const searchContext = {
          AccountID: service.getDynamicValue('AccountID'),
          CurrentPolicyNo: state.currentPolicy,
          Direction: direction // -1 for previous, 1 for next
        };

        console.log("[LoanInsurance] Navigating insurance record:", searchContext);
        const results = await service.searchPolicies(searchContext);
        
        if (results && results.length > 0) {
          const nextRecord = results[0];
          state.currentPolicy = nextRecord.PolicyNo;
          state.updateCount = nextRecord.UpdateCount || 0;
          state.editOperator = nextRecord.CreatedBy || service.getOperatorId();
          state.createdBy = nextRecord.CreatedBy || service.getOperatorId();
          
          // Populate form with next record data
          $("#PolicyNo", root).value = nextRecord.PolicyNo || '';
          $("#PolicyDate", root).value = nextRecord.PolicyDate || '';
          $("#CompanyID", root).value = nextRecord.InsuranceID || '';
          $("#CompanyName", root).value = nextRecord.CompanyName || '';
          $("#InsuranceType", root).value = nextRecord.LifeInsuranceTypeID || '';
          $("#PolicyAmount", root).value = nextRecord.PolicyAmount || 0;
          $("#PremiumAmount", root).value = nextRecord.PremiumAmount || 0;
          $("#MaturityDate", root).value = nextRecord.PolicyMaturityDate || '';
          $("#PremiumType", root).value = nextRecord.PremiumTypeID || '';
          $("#PremiumFrequency", root).value = nextRecord.PremiumFrequencyID || '';
          $("#LastPremiumPaidDate", root).value = nextRecord.LastPremiumPaidDate || '';
          $("#NextPremiumDate", root).value = nextRecord.NextPremiumDueDate || '';
          $("#InsuranceRemarks", root).value = nextRecord.Remarks || '';

          setMode('view');
          showMessage(`Loaded record: ${nextRecord.PolicyNo}`, 'Green');
        } else {
          const directionText = direction === -1 ? 'previous' : 'next';
          showMessage(`No ${directionText} record found`, 'Orange');
          actionBtns.prev.disabled = direction === -1;
          actionBtns.next.disabled = direction === 1;
        }
      } catch (error) {
        console.error("[LoanInsurance] Navigation error:", error);
        showMessage('Error navigating records', 'Red');
      }
    };

    actionBtns.prev?.addEventListener('click', () => {
      clearMessage();
      state.directionNav = -1;
      navigateInsuranceRecord(-1);
    });

    actionBtns.next?.addEventListener('click', () => {
      clearMessage();
      state.directionNav = 1;
      navigateInsuranceRecord(1);
    });

    // Policy No search/lookup
    const policySearchBtn = $('[data-lookup="policy"]', root);
    policySearchBtn?.addEventListener('click', async () => {
      clearMessage();
      try {
        console.log("[LoanInsurance] Policy search button clicked");
        const accountId = service.getDynamicValue('AccountID');
        if (!accountId) {
          showMessage('Account ID not found. Please go back and try again.', 'Red');
          return;
        }
        
        const modal = service.displayPolicySearchModal({ 
          accountId: accountId,
          branchId: service.getOurBranchId(),
          onSelect: (record) => {
            console.log('[LoanInsurance] Policy selected from search:', record);
            // Populate PolicyNo and trigger View
            $("#PolicyNo", root).value = record.PolicyNo || '';
            modal.close?.();
            showMessage('Policy selected. Click View to load it.', 'Green');
            // Auto-trigger View after selection
            setTimeout(() => {
              actionBtns.view?.click();
            }, 500);
          }
        });
      } catch (error) {
        console.error("[LoanInsurance] Policy search error:", error);
        showMessage('Policy search failed: ' + error.message, 'Red');
      }
    });

    // Company search/lookup
    const companySearchBtn = $('[data-lookup="company"]', root);
    companySearchBtn?.addEventListener('click', async () => {
      clearMessage();
      try {
        console.log("[LoanInsurance] Company search button clicked");
        
        const modal = service.displayCompanySearchModal({ 
          branchId: service.getOurBranchId(),
          onSelect: (record) => {
            console.log('[LoanInsurance] Company selected from search:', record);
            $("#CompanyID", root).value = record.InsuranceID || '';
            $("#CompanyName", root).value = record.name || '';
            modal.close?.();
            clearMessage();
          }
        });
      } catch (error) {
        console.error("[LoanInsurance] Company search error:", error);
        showMessage('Company search failed: ' + error.message, 'Red');
      }
    });

    // Premium Type change event - enable/disable frequency fields and auto-calculate next premium date
    const premiumTypeSelect = $("#PremiumType", root);
    const lastPremiumSelect = $("#LastPremiumPaidDate", root);
    const premiumFreqSelect = $("#PremiumFrequency", root);
    const nextPremiumSelect = $("#NextPremiumDueDate", root);

    const updateNextPremiumDate = () => {
      if (!lastPremiumSelect || !premiumFreqSelect || !nextPremiumSelect) return;
      
      const lastPremiumDate = lastPremiumSelect.value;
      const frequency = premiumFreqSelect.value;
      
      if (lastPremiumDate && frequency) {
        const nextDate = calculateNextPremiumDate(lastPremiumDate, frequency);
        nextPremiumSelect.value = nextDate;
        console.log("[LoanInsurance] NextPremiumDueDate auto-calculated:", nextDate);
      }
    };

    premiumTypeSelect?.addEventListener('change', () => {
      const isPremiumRecurring = premiumTypeSelect.value === 'R';
      
      if (premiumFreqSelect) premiumFreqSelect.disabled = !isPremiumRecurring;
      if (lastPremiumSelect) lastPremiumSelect.disabled = !isPremiumRecurring;
      
      // Clear next premium date if switching from recurring to non-recurring
      if (!isPremiumRecurring && nextPremiumSelect) {
        nextPremiumSelect.value = '';
      }
    });

    // Listen to last premium date and frequency changes to auto-calculate next premium date
    if (lastPremiumSelect) {
      lastPremiumSelect.addEventListener('change', updateNextPremiumDate);
    }
    if (premiumFreqSelect) {
      premiumFreqSelect.addEventListener('change', updateNextPremiumDate);
    }

    // Initialize
    console.log("[LoanInsurance] Initializing Insurance screen");
    populateParentData();
    applyAccountStatusRestrictions();
    loadDropdowns();
    setupNomineeFieldBehavior();
    
    // Initial state: Only PolicyNo field and search enabled
    state.hasRecord = false;
    state.mode = 'view';
    setMode('view');
    
    // Set focus to PolicyNo field
    const policyNoField = $("#PolicyNo", root);
    if (policyNoField) {
      policyNoField.focus();
      policyNoField.value = '';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
