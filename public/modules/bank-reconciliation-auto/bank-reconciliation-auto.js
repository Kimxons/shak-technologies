(function() {
  'use strict';

  const bankReconciliationAuto = {
    init: async function() {
      await this.loadServices();
      this.cacheElements();
      this.bindEvents();
      console.log('[BankReconciliationAuto] Module initialized successfully');
    },

    loadServices: async function() {
      try {
        console.log('[BankReconciliationAuto] Loading services...');
        
        if (!window.CoreApi) {
          throw new Error('CoreApi not loaded. Please ensure coreApi.js is included.');
        }
        console.log('[BankReconciliationAuto] CoreApi available');

        if (!window.OtherModuleService) {
          throw new Error('OtherModuleService not loaded. Please ensure otherModuleService.js is included.');
        }
        console.log('[BankReconciliationAuto] OtherModuleService available');

        if (!window.GLAccountSearchService) {
          throw new Error('GLAccountSearchService not loaded. Please ensure glAccountSearchService.js is included.');
        }
        console.log('[BankReconciliationAuto] GLAccountSearchService available');

        if (!window.BatchSearchService) {
          throw new Error('BatchSearchService not loaded. Please ensure batchSearchService.js is included.');
        }
        console.log('[BankReconciliationAuto] BatchSearchService available');

        console.log('[BankReconciliationAuto] Services loaded successfully');
      } catch (error) {
        console.error('[BankReconciliationAuto] Error loading services:', error);
        alert('Failed to load required services: ' + error.message);
        throw error;
      }
    },

    cacheElements: function() {
      // Table Action Buttons
      this.alterBtn = document.querySelector('.bra-table-actions .btn:nth-child(1)');
      this.updateBtn = document.querySelector('.bra-table-actions .btn:nth-child(2)');
      this.clearBtn = document.querySelector('.bra-table-actions .btn:nth-child(3)');

      // Right Panel Buttons
      this.viewBtn = document.querySelector('[data-action="view"]');
      this.editBtn = document.querySelector('[data-action="edit"]');
      this.saveBtn = document.querySelector('[data-action="save"]');
      this.reconcileBtn = document.querySelector('[data-action="reconcile"]');
      this.cancelBtn = document.querySelector('[data-action="cancel"]');

      // Form Fields
      this.branchIdInput = document.querySelector('[data-field="branchId"]');
      this.branchNameInput = document.querySelector('.kairo-branch-control__name');
      this.glAccountIdInput = document.querySelector('[data-field="glAccountId"]');
      this.batchNoInput = document.querySelector('[data-field="batchNo"]');
      
      // Behind The Scene Fields
      this.stmtFromDateInput = document.getElementById('stmtFromDate');
      this.stmtToDateInput = document.getElementById('stmtToDate');
      this.bankClosingBalanceInput = document.getElementById('bankClosingBalance');
      this.glClosingBalanceInput = document.getElementById('glClosingBalance');
      
      // Table
      this.resultsTable = document.querySelector('.bra-results-table tbody');
      
      // Select All Checkbox
      this.selectAllCheckbox = document.getElementById('selectAllCheckbox');
      
      // Search Buttons
      this.searchGLAccountBtn = document.querySelector('[data-action="searchGLAccount"]');
      this.searchBatchBtn = document.querySelector('[data-action="searchBatch"]');
    },

    bindEvents: function() {
      if (this.alterBtn) this.alterBtn.addEventListener('click', () => this.handleAlter());
      if (this.updateBtn) this.updateBtn.addEventListener('click', () => this.handleUpdate());
      if (this.clearBtn) this.clearBtn.addEventListener('click', () => this.handleClear());

      if (this.viewBtn) this.viewBtn.addEventListener('click', () => this.handleView());
      if (this.editBtn) this.editBtn.addEventListener('click', () => this.handleEdit());
      if (this.saveBtn) this.saveBtn.addEventListener('click', () => this.handleSave());
      if (this.reconcileBtn) this.reconcileBtn.addEventListener('click', () => this.handleReconcile());
      if (this.cancelBtn) this.cancelBtn.addEventListener('click', () => this.handleCancel());
      
      // Select all checkbox
      if (this.selectAllCheckbox) {
        this.selectAllCheckbox.addEventListener('change', (e) => this.handleSelectAll(e));
      }
      
      // Search buttons
      if (this.searchGLAccountBtn) {
        this.searchGLAccountBtn.addEventListener('click', () => this.handleSearchGLAccount());
        console.log('[BankReconciliationAuto] GL Account search button event bound');
      }
      
      if (this.searchBatchBtn) {
        this.searchBatchBtn.addEventListener('click', () => this.handleSearchBatch());
        console.log('[BankReconciliationAuto] Batch search button event bound');
      }
    },

    handleSelectAll: function(e) {
      const checkboxes = this.resultsTable.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(checkbox => {
        checkbox.checked = e.target.checked;
      });
      console.log('[BankReconciliationAuto] Select all:', e.target.checked);
    },

    handleSelectAll: function(e) {
      const checkboxes = this.resultsTable.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(checkbox => {
        checkbox.checked = e.target.checked;
      });
      console.log('[BankReconciliationAuto] Select all:', e.target.checked);
    },

    handleAlter: function() {
      console.log('[BankReconciliationAuto] Alter button clicked');
      
      // Ensure select-all checkbox remains visible and enabled
      if (this.selectAllCheckbox) {
        this.selectAllCheckbox.disabled = false;
        this.selectAllCheckbox.style.cursor = 'pointer';
      }
      
      // Enable row checkboxes in Alter mode
      const allCheckboxes = this.resultsTable.querySelectorAll('input[type="checkbox"]');
      allCheckboxes.forEach(checkbox => {
        checkbox.disabled = false;
        checkbox.style.cursor = 'pointer';
      });
      
      // Activate Update, Clear, Cancel buttons
      if (this.updateBtn) {
        this.updateBtn.disabled = false;
        this.updateBtn.style.opacity = '1';
        this.updateBtn.style.cursor = 'pointer';
      }
      if (this.clearBtn) {
        this.clearBtn.disabled = false;
        this.clearBtn.style.opacity = '1';
        this.clearBtn.style.cursor = 'pointer';
      }
      if (this.cancelBtn) {
        this.cancelBtn.disabled = false;
        this.cancelBtn.style.opacity = '1';
        this.cancelBtn.style.cursor = 'pointer';
      }
      
      // Deactivate all other buttons
      if (this.alterBtn) {
        this.alterBtn.disabled = true;
        this.alterBtn.style.opacity = '0.5';
        this.alterBtn.style.cursor = 'not-allowed';
      }
      if (this.viewBtn) {
        this.viewBtn.disabled = true;
        this.viewBtn.style.opacity = '0.5';
        this.viewBtn.style.cursor = 'not-allowed';
      }
      if (this.editBtn) {
        this.editBtn.disabled = true;
        this.editBtn.style.opacity = '0.5';
        this.editBtn.style.cursor = 'not-allowed';
      }
      if (this.saveBtn) {
        this.saveBtn.disabled = true;
        this.saveBtn.style.opacity = '0.5';
        this.saveBtn.style.cursor = 'not-allowed';
      }
      if (this.reconcileBtn) {
        this.reconcileBtn.disabled = true;
        this.reconcileBtn.style.opacity = '0.5';
        this.reconcileBtn.style.cursor = 'not-allowed';
      }
      
      // Enable only main form fields for editing (Behind The Scene fields remain readonly)
      const fieldsToEnable = [
        this.branchIdInput,
        this.glAccountIdInput,
        this.batchNoInput
      ];
      
      fieldsToEnable.forEach(field => {
        if (field) {
          field.removeAttribute('readonly');
          field.removeAttribute('disabled');
          field.style.border = '2px solid #3b82f6'; // Blue border
          field.style.cursor = 'text';
          console.log('[BankReconciliationAuto] Enabled field:', field.id, '- Current value:', field.value);
        }
      });
      
      console.log('[BankReconciliationAuto] Alter mode enabled - Update button enabled');
    },

    handleUpdate: async function() {
      console.log('[BankReconciliationAuto] Update button clicked');
      
      // Check if either select-all checkbox or any row checkbox is selected
      const selectAllChecked = this.selectAllCheckbox?.checked || false;
      const rowCheckboxes = this.resultsTable.querySelectorAll('input[type="checkbox"]:checked');
      
      if (!selectAllChecked && rowCheckboxes.length === 0) {
        alert('Please select a checkbox to update');
        return;
      }
      
      const branchId = this.branchIdInput?.value?.trim();
      const glAccountId = this.glAccountIdInput?.value?.trim();
      const batchNo = this.batchNoInput?.value?.trim();
      const stmtFromDate = this.stmtFromDateInput?.value?.trim();
      const stmtToDate = this.stmtToDateInput?.value?.trim();
      const bankClosingBalance = this.bankClosingBalanceInput?.value?.trim();
      const glClosingBalance = this.glClosingBalanceInput?.value?.trim();

      if (!branchId || !glAccountId) {
        alert('Please enter Branch ID and GL Account ID');
        return;
      }

      console.log('[BankReconciliationAuto] Collected form values:', {
        branchId, glAccountId, batchNo, stmtFromDate, stmtToDate, bankClosingBalance, glClosingBalance,
        selectedRows: rowCheckboxes.length
      });

      try {
        // Build batch detail XML from form data
        const batchDetail = `<BatchDetail>
          <Batch>
            <BatchNo>${batchNo || ''}</BatchNo>
            <StatementFromDate>${stmtFromDate || ''}</StatementFromDate>
            <StatementToDate>${stmtToDate || ''}</StatementToDate>
            <ClosingBalance>${bankClosingBalance || ''}</ClosingBalance>
            <GLClosingBalance>${glClosingBalance || ''}</GLClosingBalance>
          </Batch>
        </BatchDetail>`;

        const requestData = {
          OurBranchID: branchId,
          AccountID: glAccountId,
          BatchDetail: batchDetail
        };

        console.log('[BankReconciliationAuto] Update request data:', requestData);

        const result = await OtherModuleService.editAutoReconciliation(requestData);

        console.log('[BankReconciliationAuto] Update response:', result);

        if (result && result.success) {
          // Enable Save button (in addition to Update, Clear, Cancel)
          if (this.saveBtn) {
            this.saveBtn.disabled = false;
            this.saveBtn.style.opacity = '1';
            this.saveBtn.style.cursor = 'pointer';
          }
          
          // Refresh data from server to show updated values
          this._suppressDataLoadAlert = true;
          await this.handleView();
          this._suppressDataLoadAlert = false;
          console.log('[BankReconciliationAuto] Data refreshed - changes should now be visible');
          
          // Show success alert after data refresh is complete
          setTimeout(() => {
            this._showSuccessAlert('Update successful. You can now click Save.');
          }, 150);
        } else {
          const errorMsg = result?.message || 'Update failed';
          console.error('[BankReconciliationAuto] Update failed:', errorMsg);
          alert('Update failed: ' + errorMsg);
        }
      } catch (error) {
        console.error('[BankReconciliationAuto] Error updating:', error);
        alert('Failed to update: ' + error.message);
      }
    },

    handleClear: function() {
      console.log('Clear button clicked');

      // Clear only Batch No field
      if (this.batchNoInput) this.batchNoInput.value = '';

      // Keep select-all checkbox state as is (don't modify it)

      // Set row checkboxes to checked and disabled (cannot be unchecked)
      const checkboxes = this.resultsTable.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(checkbox => {
        checkbox.checked = true;
        checkbox.disabled = true;
        checkbox.style.cursor = 'not-allowed';
      });

      // Activate Save, Reconcile, Cancel, and Alter buttons
      if (this.saveBtn) {
        this.saveBtn.disabled = false;
        this.saveBtn.style.opacity = '1';
        this.saveBtn.style.cursor = 'pointer';
      }
      if (this.reconcileBtn) {
        this.reconcileBtn.disabled = false;
        this.reconcileBtn.style.opacity = '1';
        this.reconcileBtn.style.cursor = 'pointer';
      }
      if (this.cancelBtn) {
        this.cancelBtn.disabled = false;
        this.cancelBtn.style.opacity = '1';
        this.cancelBtn.style.cursor = 'pointer';
      }
      if (this.alterBtn) {
        this.alterBtn.disabled = false;
        this.alterBtn.style.opacity = '1';
        this.alterBtn.style.cursor = 'pointer';
      }

      // Deactivate View, Edit, Update, Clear buttons
      if (this.viewBtn) {
        this.viewBtn.disabled = true;
        this.viewBtn.style.opacity = '0.5';
        this.viewBtn.style.cursor = 'not-allowed';
      }
      if (this.editBtn) {
        this.editBtn.disabled = true;
        this.editBtn.style.opacity = '0.5';
        this.editBtn.style.cursor = 'not-allowed';
      }
      if (this.updateBtn) {
        this.updateBtn.disabled = true;
        this.updateBtn.style.opacity = '0.5';
        this.updateBtn.style.cursor = 'not-allowed';
      }
      if (this.clearBtn) {
        this.clearBtn.disabled = true;
        this.clearBtn.style.opacity = '0.5';
        this.clearBtn.style.cursor = 'not-allowed';
      }

      console.log('Form cleared');
    },

    handleView: async function() {
      console.log('[BankReconciliationAuto] View button clicked');

      const branchId = this.branchIdInput?.value?.trim();
      const glAccountId = this.glAccountIdInput?.value?.trim();
      const batchNo = this.batchNoInput?.value?.trim();

      if (!branchId) {
        console.warn('[BankReconciliationAuto] Branch ID required');
        return;
      }

      try {
        const requestData = {
          BankID: '00',
          OurBranchID: branchId,
          AccountID: glAccountId || '',
          BatchNo: batchNo || '',
          OperatorID: 'CSADM'
        };

        console.log('[BankReconciliationAuto] Request data:', requestData);

        const result = await OtherModuleService.getAutoReconciliation(requestData);

        console.log('[BankReconciliationAuto] API Response:', result);

        if (result && result.success) {
          const data = result.data;
          console.log('[BankReconciliationAuto] Response data:', data);
          // Check if we have data
          if (!data || (Array.isArray(data.Details) && data.Details.length === 0)) {
            console.warn('[BankReconciliationAuto] No data found');
            return;
          }
          this.populateData(data);
          // Show alert after data is fully displayed
          this._showDataLoadedAlert();
        } else {
          const errorMessage = result?.message || 'No data found';
          console.warn('[BankReconciliationAuto] API returned non-success:', errorMessage);
        }
      } catch (error) {
        console.error('[BankReconciliationAuto] Error loading data:', error);
      }
    },

    populateData: function(data) {
      console.log('[BankReconciliationAuto] Populating data:', data);
      
      // If data is an array, use first item, otherwise use data directly
      const record = Array.isArray(data) ? data[0] : (data.Details && data.Details[0]) || data;
      
      console.log('[BankReconciliationAuto] Record to populate:', record);
      console.log('[BankReconciliationAuto] Record keys:', Object.keys(record));
      
      // Populate Behind The Scene fields
      if (this.stmtFromDateInput && record.StatementFromDate) {
        this.stmtFromDateInput.value = String(record.StatementFromDate).split('T')[0];
      }
      if (this.stmtToDateInput && record.StatementToDate) {
        this.stmtToDateInput.value = String(record.StatementToDate).split('T')[0];
      }
      if (this.bankClosingBalanceInput && record.ClosingBalance !== undefined) {
        this.bankClosingBalanceInput.value = record.ClosingBalance;
      }
      if (this.glClosingBalanceInput && record.GLClosingBalance !== undefined) {
        this.glClosingBalanceInput.value = record.GLClosingBalance;
      }
      
      // Populate table with batch records
      this.populateTable(data.Details || [data]);
    },

    populateTable: function(batches) {
      if (!this.resultsTable) {
        console.error('[BankReconciliationAuto] Results table not found');
        return;
      }

      if (!batches || batches.length === 0) {
        this.resultsTable.innerHTML = '<tr><td colspan="7" class="text-muted text-center py-4">No records to display.</td></tr>';
        return;
      }

      console.log('[BankReconciliationAuto] Populating table with', batches.length, 'records');
      console.log('[BankReconciliationAuto] First batch record:', batches[0]);
      console.log('[BankReconciliationAuto] Batch record keys:', Object.keys(batches[0]));

      this.resultsTable.innerHTML = batches.map((batch, index) => {
        const batchNo = batch.BatchNo || '';
        const accountID = batch.AccountID || '';
        const glName = batch.GLName || '';
        const stmtFromDate = batch.StatementFromDate ? String(batch.StatementFromDate).split('T')[0] : '';
        const stmtToDate = batch.StatementToDate ? String(batch.StatementToDate).split('T')[0] : '';
        const closingBalance = batch.ClosingBalance || 0;
        
        if (index === 0) {
          console.log('[BankReconciliationAuto] Sample batch - BatchNo:', batchNo, 'AccountID:', accountID, 'GLName:', glName, 'ClosingBalance:', closingBalance);
        }
        
        return `
          <tr>
            <td><input type="checkbox" class="row-checkbox" data-batch-no="${batchNo}" data-account-id="${accountID}" /></td>
            <td>${batchNo}</td>
            <td>${accountID}</td>
            <td>${glName}</td>
            <td>${stmtFromDate}</td>
            <td>${stmtToDate}</td>
            <td>${closingBalance}</td>
          </tr>
        `;
      }).join('');
      
      console.log('[BankReconciliationAuto] Table populated successfully');
    },

    _showDataLoadedAlert: function() {
      // Only show alert if not suppressed and GL Account ID is provided
      const glAccountId = this.glAccountIdInput?.value?.trim();
      if (!this._suppressDataLoadAlert && glAccountId) {
        // Use setTimeout to ensure DOM has updated with the table data
        setTimeout(() => {
          this._showSuccessAlert('Bank Reconciliation Auto data loaded and displayed successfully!');
        }, 100);
      }
    },

    _showSuccessAlert: function(message) {
      // Remove any existing alert
      const existingAlert = document.querySelector('.bra-success-alert');
      if (existingAlert) {
        existingAlert.remove();
      }

      // Create success alert element
      const alertDiv = document.createElement('div');
      alertDiv.className = 'bra-success-alert';
      alertDiv.innerHTML = `
        <div class="bra-success-alert-content">
          <i class="bi bi-check-circle-fill"></i>
          <span>${message}</span>
        </div>
      `;

      // Add to body
      document.body.appendChild(alertDiv);

      // Show alert with animation
      setTimeout(() => {
        alertDiv.classList.add('show');
      }, 10);

      // Auto-hide after 3 seconds
      setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => {
          alertDiv.remove();
        }, 300);
      }, 3000);
    },

    handleEdit: function() {
      console.log('[BankReconciliationAuto] Edit button clicked');
      
      // Enable select-all checkbox
      if (this.selectAllCheckbox) {
        this.selectAllCheckbox.style.cursor = 'pointer';
        this.selectAllCheckbox.disabled = false;
      }
      
      // Show row checkboxes but disable them (only enabled after Alter)
      const checkboxes = this.resultsTable.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(checkbox => {
        checkbox.style.cursor = 'not-allowed';
        checkbox.disabled = true;
        checkbox.checked = true; // Check all by default
      });
      
      // Activate Alter, Save, and Cancel buttons
      if (this.alterBtn) {
        this.alterBtn.disabled = false;
        this.alterBtn.style.opacity = '1';
        this.alterBtn.style.cursor = 'pointer';
      }
      if (this.saveBtn) {
        this.saveBtn.disabled = false;
        this.saveBtn.style.opacity = '1';
        this.saveBtn.style.cursor = 'pointer';
      }
      if (this.cancelBtn) {
        this.cancelBtn.disabled = false;
        this.cancelBtn.style.opacity = '1';
        this.cancelBtn.style.cursor = 'pointer';
      }
      
      // Deactivate Update, Clear, View, Edit, Reconcile buttons
      if (this.updateBtn) {
        this.updateBtn.disabled = true;
        this.updateBtn.style.opacity = '0.5';
        this.updateBtn.style.cursor = 'not-allowed';
      }
      if (this.clearBtn) {
        this.clearBtn.disabled = true;
        this.clearBtn.style.opacity = '0.5';
        this.clearBtn.style.cursor = 'not-allowed';
      }
      if (this.viewBtn) {
        this.viewBtn.disabled = true;
        this.viewBtn.style.opacity = '0.5';
        this.viewBtn.style.cursor = 'not-allowed';
      }
      if (this.editBtn) {
        this.editBtn.disabled = true;
        this.editBtn.style.opacity = '0.5';
        this.editBtn.style.cursor = 'not-allowed';
      }
      if (this.reconcileBtn) {
        this.reconcileBtn.disabled = true;
        this.reconcileBtn.style.opacity = '0.5';
        this.reconcileBtn.style.cursor = 'not-allowed';
      }
      
      // Enable only main form fields for editing (Behind The Scene fields remain readonly)
      const fieldsToEnable = [
        this.branchIdInput,
        this.glAccountIdInput,
        this.batchNoInput
      ];
      
      fieldsToEnable.forEach(field => {
        if (field) {
          field.removeAttribute('readonly');
          field.removeAttribute('disabled');
          field.style.border = '2px solid #3b82f6'; // Blue border
          field.style.cursor = 'text';
          console.log('[BankReconciliationAuto] Enabled field:', field.id, '- Current value:', field.value);
        }
      });
      
      console.log('[BankReconciliationAuto] Edit mode enabled - Checkboxes visible, Alter button enabled, Update/Save disabled');
    },

    handleSave: async function() {
      console.log('[BankReconciliationAuto] Save button clicked');

      const branchId = this.branchIdInput?.value?.trim();
      const glAccountId = this.glAccountIdInput?.value?.trim();
      const batchNo = this.batchNoInput?.value?.trim();
      const stmtFromDate = this.stmtFromDateInput?.value?.trim();
      const stmtToDate = this.stmtToDateInput?.value?.trim();
      const bankClosingBalance = this.bankClosingBalanceInput?.value?.trim();
      const glClosingBalance = this.glClosingBalanceInput?.value?.trim();

      if (!branchId || !glAccountId) {
        alert('Please enter Branch ID and GL Account ID');
        return;
      }

      console.log('[BankReconciliationAuto] Collected form values:', {
        branchId, glAccountId, batchNo, stmtFromDate, stmtToDate, bankClosingBalance, glClosingBalance
      });

      try {
        // Build batch detail XML from form data
        const batchDetail = `<BatchDetail>
          <Batch>
            <BatchNo>${batchNo || ''}</BatchNo>
            <StatementFromDate>${stmtFromDate || ''}</StatementFromDate>
            <StatementToDate>${stmtToDate || ''}</StatementToDate>
            <ClosingBalance>${bankClosingBalance || ''}</ClosingBalance>
            <GLClosingBalance>${glClosingBalance || ''}</GLClosingBalance>
          </Batch>
        </BatchDetail>`;

        const requestData = {
          OurBranchID: branchId,
          AccountID: glAccountId,
          BatchDetail: batchDetail
        };

        console.log('[BankReconciliationAuto] Save request data:', requestData);

        const result = await OtherModuleService.editAutoReconciliation(requestData);

        console.log('[BankReconciliationAuto] Save response:', result);

        if (result && result.success) {
            this.setFieldsReadonly();
            // Prevent data loaded alert after save
            this._suppressDataLoadAlert = true;
            await this.handleView();
            this._suppressDataLoadAlert = false;
            console.log('[BankReconciliationAuto] Data refreshed - changes should now be visible');
            alert('Saved successfully');
        } else {
          console.error('[BankReconciliationAuto] Save failed:', result?.message);
        }
      } catch (error) {
        console.error('[BankReconciliationAuto] Error saving:', error);
        alert('Failed to save: ' + error.message);
      }
    },

    handleReconcile: async function() {
      console.log('[BankReconciliationAuto] Reconcile button clicked');

      const branchId = this.branchIdInput?.value?.trim();
      const glAccountId = this.glAccountIdInput?.value?.trim();
      const batchNo = this.batchNoInput?.value?.trim();

      if (!branchId || !glAccountId || !batchNo) {
        alert('Please enter Branch ID, GL Account ID, and Batch No.');
        return;
      }

      try {
        // Show print preview dialog
        this.showPrintPreview();
        
        console.log('[BankReconciliationAuto] Reconciliation process started');
        
        // Clear the table after reconciliation
        if (this.resultsTable) {
          this.resultsTable.innerHTML = '<tr><td colspan="7" class="text-muted text-center py-4">No records to display.</td></tr>';
        }
        
        console.log('[BankReconciliationAuto] Table cleared after reconciliation');
      } catch (error) {
        console.error('[BankReconciliationAuto] Error during reconciliation:', error);
        alert('Reconciliation failed: ' + error.message);
      }
    },

    showPrintPreview: function() {
      // Create modal overlay
      const overlay = document.createElement('div');
      overlay.className = 'brm-modal-overlay';
      overlay.style.zIndex = '10000';
      
      // Create modal content
      const modal = document.createElement('div');
      modal.className = 'brm-modal-content';
      modal.style.maxWidth = '900px';
      modal.style.maxHeight = '80vh';
      
      // Create header
      const header = document.createElement('div');
      header.className = 'brm-modal-header';
      header.innerHTML = '<h5 class="brm-modal-title">Print Preview - Bank Reconciliation</h5><button class="brm-modal-close" aria-label="Close">&times;</button>';
      
      // Create body
      const body = document.createElement('div');
      body.className = 'brm-modal-body';
      body.style.padding = '20px';
      body.style.overflowY = 'auto';
      
      // Generate print content
      const printContent = this.generatePrintContent();
      body.innerHTML = printContent;
      
      // Create footer
      const footer = document.createElement('div');
      footer.className = 'brm-modal-footer';
      footer.innerHTML = `
        <button class="btn btn-primary" id="printBtn" style="background: #4a90e2; border: none; padding: 8px 20px; border-radius: 4px; color: white; cursor: pointer; font-size: 14px; font-weight: 600;">
          <i class="bi bi-printer"></i> Print
        </button>
        <button class="btn btn-secondary" id="closePreviewBtn" style="background: #6c757d; border: none; padding: 8px 20px; border-radius: 4px; color: white; cursor: pointer; font-size: 14px; font-weight: 600;">
          Close
        </button>
      `;
      
      // Assemble modal
      modal.appendChild(header);
      modal.appendChild(body);
      modal.appendChild(footer);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      
      // Event listeners
      const closeBtn = header.querySelector('.brm-modal-close');
      const closePreviewBtn = footer.querySelector('#closePreviewBtn');
      const printBtn = footer.querySelector('#printBtn');
      
      const closeModal = () => {
        if (document.body.contains(overlay)) {
          document.body.removeChild(overlay);
        }
      };
      
      if (closeBtn) closeBtn.addEventListener('click', closeModal);
      if (closePreviewBtn) closePreviewBtn.addEventListener('click', closeModal);
      
      if (printBtn) {
        printBtn.addEventListener('click', () => {
          // Create print window
          const printWindow = window.open('', '_blank');
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Bank Reconciliation - Print</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #4a90e2; color: white; }
                .header { text-align: center; margin-bottom: 20px; }
                .info-row { display: flex; justify-content: space-between; margin: 5px 0; }
              </style>
            </head>
            <body>
              ${printContent}
            </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.print();
        });
      }
      
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
      });
    },

    generatePrintContent: function() {
      const branchId = this.branchIdInput?.value || '';
      const branchName = this.branchNameInput?.value || '';
      const glAccountId = this.glAccountIdInput?.value || '';
      const batchNo = this.batchNoInput?.value || '';
      const stmtFromDate = this.stmtFromDateInput?.value || '';
      const stmtToDate = this.stmtToDateInput?.value || '';
      const bankClosingBalance = this.bankClosingBalanceInput?.value || '';
      const glClosingBalance = this.glClosingBalanceInput?.value || '';
      
      // Get table data
      const tableRows = this.resultsTable?.querySelectorAll('tr') || [];
      let tableContent = '';
      
      if (tableRows.length > 0 && !tableRows[0].querySelector('td[colspan]')) {
        tableContent = '<table><thead><tr><th>Batch No.</th><th>Account ID</th><th>GL Name</th><th>Statement From</th><th>Statement To</th><th>Closing Balance</th></tr></thead><tbody>';
        tableRows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length > 1) {
            tableContent += '<tr>';
            // Skip checkbox column (index 0)
            for (let i = 1; i < cells.length; i++) {
              tableContent += `<td>${cells[i].textContent}</td>`;
            }
            tableContent += '</tr>';
          }
        });
        tableContent += '</tbody></table>';
      } else {
        tableContent = '<p style="text-align: center; color: #999;">No transaction data available</p>';
      }
      
      return `
        <div class="header">
          <h2>Bank Reconciliation - Auto</h2>
          <p>Reconciliation Report</p>
        </div>
        <div style="margin-bottom: 20px;">
          <div class="info-row"><strong>Branch ID:</strong> <span>${branchId} - ${branchName}</span></div>
          <div class="info-row"><strong>GL Account ID:</strong> <span>${glAccountId}</span></div>
          <div class="info-row"><strong>Batch No:</strong> <span>${batchNo}</span></div>
          <div class="info-row"><strong>Statement Period:</strong> <span>${stmtFromDate} to ${stmtToDate}</span></div>
          <div class="info-row"><strong>Bank Closing Balance:</strong> <span>${bankClosingBalance}</span></div>
          <div class="info-row"><strong>GL Closing Balance:</strong> <span>${glClosingBalance}</span></div>
        </div>
        <h3>Transaction Details</h3>
        ${tableContent}
      `;
    },

    handleCancel: function() {
      console.log('[BankReconciliationAuto] Cancel button clicked');
      
      // Clear all form fields
      if (this.branchIdInput) this.branchIdInput.value = '';
      if (this.branchNameInput) this.branchNameInput.value = '';
      if (this.glAccountIdInput) this.glAccountIdInput.value = '';
      if (this.batchNoInput) this.batchNoInput.value = '';
      if (this.stmtFromDateInput) this.stmtFromDateInput.value = '';
      if (this.stmtToDateInput) this.stmtToDateInput.value = '';
      if (this.bankClosingBalanceInput) this.bankClosingBalanceInput.value = '';
      if (this.glClosingBalanceInput) this.glClosingBalanceInput.value = '';
      
      // Clear table
      if (this.resultsTable) {
        this.resultsTable.innerHTML = '<tr><td colspan="6" class="text-muted text-center py-4">No records to display.</td></tr>';
      }
      
      // Set fields back to readonly
      this.setFieldsReadonly();
      
      console.log('[BankReconciliationAuto] Form cleared and reset to readonly mode');
    },

    setFieldsReadonly: function() {
      const fieldsToDisable = [
        this.stmtFromDateInput,
        this.stmtToDateInput,
        this.bankClosingBalanceInput,
        this.glClosingBalanceInput
      ];
      
      fieldsToDisable.forEach(field => {
        if (field) {
          field.setAttribute('readonly', 'readonly');
          field.style.backgroundColor = '';
          field.style.border = '';
          field.style.cursor = '';
          console.log('[BankReconciliationAuto] Set field to readonly:', field.id);
        }
      });
    },

    // ===========================
    // GL Account Search Functions
    // ===========================
    
    handleSearchGLAccount: async function() {
      console.log('[BankReconciliationAuto] GL Account search button clicked');
      
      // Show loading indicator
      const loadingMessage = document.createElement('div');
      loadingMessage.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 20px 40px; border-radius: 8px; z-index: 10000; font-size: 16px;';
      loadingMessage.textContent = 'Loading GL Accounts...';
      document.body.appendChild(loadingMessage);
      
      try {
        // Get the branch ID for the filter
        const branchId = this.branchIdInput ? this.branchIdInput.value.trim() : '0101';
        
        // Call search service with params object
        const result = await window.GLAccountSearchService.searchGLAccounts({ branchId: branchId });
        
        // Remove loading indicator
        document.body.removeChild(loadingMessage);
        
        console.log('[BankReconciliationAuto] Search result:', result);
        
        if (result.success && result.data && result.data.length > 0) {
          // Show modal with results
          this.showGLAccountModal(result.data);
        } else {
          console.log('[BankReconciliationAuto] No GL accounts found');
          alert('No GL accounts found for the selected branch.');
        }
      } catch (error) {
        // Remove loading indicator
        if (document.body.contains(loadingMessage)) {
          document.body.removeChild(loadingMessage);
        }
        console.error('[BankReconciliationAuto] Error searching GL accounts:', error);
        alert('Error searching GL accounts: ' + error.message);
      }
    },

    showGLAccountModal: function(accounts) {
      console.log('[BankReconciliationAuto] Showing GL Account modal with', accounts.length, 'accounts');
      
      // Create modal overlay
      const overlay = document.createElement('div');
      overlay.className = 'brm-modal-overlay';
      
      // Create modal content
      const modal = document.createElement('div');
      modal.className = 'brm-modal-content';
      
      // Create header
      const header = document.createElement('div');
      header.className = 'brm-modal-header';
      header.innerHTML = '<h5 class="brm-modal-title">Select GL Account</h5><button class="brm-modal-close" aria-label="Close">&times;</button>';
      
      // Create body
      const body = document.createElement('div');
      body.className = 'brm-modal-body';
      
      // Create search input
      const searchDiv = document.createElement('div');
      searchDiv.className = 'brm-modal-search';
      searchDiv.innerHTML = '<input type="text" id="glAccountSearchInput" class="form-control" placeholder="Search accounts..." />';
      
      // Create table
      const tableContainer = document.createElement('div');
      tableContainer.className = 'brm-modal-table-container';
      const table = document.createElement('table');
      table.className = 'brm-modal-table';
      table.innerHTML = `
        <thead>
          <tr>
            <th>Account ID</th>
            <th>Account Name</th>
            <th>Short Name</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody id="glAccountTableBody"></tbody>
      `;
      
      tableContainer.appendChild(table);
      body.appendChild(searchDiv);
      body.appendChild(tableContainer);
      
      // Create footer
      const footer = document.createElement('div');
      footer.className = 'brm-modal-footer';
      footer.innerHTML = '<button class="btn btn-secondary brm-modal-cancel">Cancel</button>';
      
      // Assemble modal
      modal.appendChild(header);
      modal.appendChild(body);
      modal.appendChild(footer);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      
      // Populate table
      const tbody = document.getElementById('glAccountTableBody');
      const renderTable = (filteredAccounts) => {
        tbody.innerHTML = '';
        if (filteredAccounts.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">No accounts found</td></tr>';
          return;
        }
        filteredAccounts.forEach(account => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${account.AccountID || ''}</td>
            <td>${account.AccountName || ''}</td>
            <td>${account.ShortName || ''}</td>
            <td><button type="button" class="btn btn-sm btn-primary brm-select-btn" data-account-id="${account.AccountID}" style="cursor: pointer;">Select</button></td>
          `;
          tbody.appendChild(row);
        });
        
        console.log('[BankReconciliationAuto] Rendered', filteredAccounts.length, 'accounts in table');
      };
      
      renderTable(accounts);
      
      // Search functionality
      const searchInput = document.getElementById('glAccountSearchInput');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          const searchTerm = e.target.value.toLowerCase();
          const filtered = accounts.filter(acc => 
            (acc.AccountID && acc.AccountID.toLowerCase().includes(searchTerm)) ||
            (acc.AccountName && acc.AccountName.toLowerCase().includes(searchTerm)) ||
            (acc.ShortName && acc.ShortName.toLowerCase().includes(searchTerm))
          );
          renderTable(filtered);
        });
      } else {
        console.error('[BankReconciliationAuto] glAccountSearchInput not found!');
      }
      
      // Close button
      const closeBtn = header.querySelector('.brm-modal-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          document.body.removeChild(overlay);
        });
      } else {
        console.error('[BankReconciliationAuto] brm-modal-close button not found!');
      }
      
      // Cancel button
      modal.addEventListener('click', (e) => {
        if (e.target && e.target.classList.contains('brm-select-btn')) {
          e.preventDefault();
          e.stopPropagation();
          
          const accountId = e.target.getAttribute('data-account-id');
          console.log('[BankReconciliationAuto] Select button clicked for account:', accountId);
          console.log('[BankReconciliationAuto] glAccountIdInput element:', this.glAccountIdInput);
          
          const selectedAccount = accounts.find(acc => acc.AccountID === accountId);
          console.log('[BankReconciliationAuto] Found account:', selectedAccount);
          
          if (selectedAccount) {
            if (this.glAccountIdInput) {
              this.glAccountIdInput.value = selectedAccount.AccountID || '';
              console.log('[BankReconciliationAuto] GL Account ID set to:', this.glAccountIdInput.value);
            } else {
              console.error('[BankReconciliationAuto] glAccountIdInput element not found!');
              // Try alternative selector
              const inputField = document.querySelector('[data-field="glAccountId"]');
              if (inputField) {
                inputField.value = selectedAccount.AccountID || '';
                console.log('[BankReconciliationAuto] GL Account ID set via alternative selector');
              }
            }
            
            // Close modal
            if (document.body.contains(overlay)) {
              document.body.removeChild(overlay);
              console.log('[BankReconciliationAuto] Modal closed');
            }
          } else {
            console.error('[BankReconciliationAuto] Account not found for ID:', accountId);
          }
        }
      });
      
      // Close on overlay click
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          document.body.removeChild(overlay);
        }
      });
    },

    // ===========================
    // Batch Search Functions
    // ===========================
    
    handleSearchBatch: async function() {
      console.log('[BankReconciliationAuto] Batch search button clicked');
      
      try {
        // Get the branch ID and GL Account ID for the filter
        const branchId = this.branchIdInput ? this.branchIdInput.value.trim() : '0101';
        const accountId = this.glAccountIdInput ? this.glAccountIdInput.value.trim() : '';
        
        if (!accountId) {
          alert('Please enter a GL Account ID first');
          return;
        }
        
        // Call search service
        const result = await window.BatchSearchService.searchBatches({
          branchId: branchId,
          accountId: accountId
        });
        
        console.log('[BankReconciliationAuto] Batch search result:', result);
        
        if (result.success && result.data && result.data.length > 0) {
          // Show modal with results
          this.showBatchModal(result.data);
        } else {
          console.log('[BankReconciliationAuto] No batches found');
          alert('No batches found for the selected GL Account.');
        }
      } catch (error) {
        console.error('[BankReconciliationAuto] Error searching batches:', error);
        alert('Error searching batches: ' + error.message);
      }
    },

    showBatchModal: function(batches) {
      console.log('[BankReconciliationAuto] Showing Batch modal with', batches.length, 'batches');
      
      // Create modal overlay
      const overlay = document.createElement('div');
      overlay.className = 'brm-modal-overlay';
      
      // Create modal content
      const modal = document.createElement('div');
      modal.className = 'brm-modal-content';
      
      // Create header
      const header = document.createElement('div');
      header.className = 'brm-modal-header';
      header.innerHTML = '<h5 class="brm-modal-title">Select Batch</h5><button class="brm-modal-close" aria-label="Close">&times;</button>';
      
      // Create body
      const body = document.createElement('div');
      body.className = 'brm-modal-body';
      
      // Create search input
      const searchDiv = document.createElement('div');
      searchDiv.className = 'brm-modal-search';
      searchDiv.innerHTML = '<input type="text" class="form-control" placeholder="Search by Batch Number or Description..." id="batchSearchInput">';
      
      // Create table
      const tableContainer = document.createElement('div');
      tableContainer.className = 'brm-modal-table-container';
      const table = document.createElement('table');
      table.className = 'brm-modal-table';
      table.innerHTML = `
        <thead>
          <tr>
            <th>Batch No.</th>
            <th>Description</th>
            <th>Statement From Date</th>
            <th>Statement To Date</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody id="batchTableBody"></tbody>
      `;
      
      tableContainer.appendChild(table);
      body.appendChild(searchDiv);
      body.appendChild(tableContainer);
      
      // Create footer
      const footer = document.createElement('div');
      footer.className = 'brm-modal-footer';
      footer.innerHTML = '<button class="btn btn-secondary brm-modal-cancel">Cancel</button>';
      
      // Assemble modal
      modal.appendChild(header);
      modal.appendChild(body);
      modal.appendChild(footer);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      
      // Populate table
      const tbody = document.getElementById('batchTableBody');
      const renderTable = (filteredBatches) => {
        tbody.innerHTML = '';
        filteredBatches.forEach(batch => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${batch.BatchNo || batch.BatchNumber || ''}</td>
            <td>${batch.Description || batch.GLName || 'N/A'}</td>
            <td>${batch.StatementFromDate || ''}</td>
            <td>${batch.StatementToDate || ''}</td>
            <td><button class="btn btn-sm btn-primary brm-select-btn" data-batch-no="${batch.BatchNo || batch.BatchNumber}">Select</button></td>
          `;
          tbody.appendChild(row);
        });
      };
      
      renderTable(batches);
      
      // Search functionality
      const searchInput = document.getElementById('batchSearchInput');
      searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filtered = batches.filter(batch => 
          (batch.BatchNo && batch.BatchNo.toLowerCase().includes(searchTerm)) ||
          (batch.BatchNumber && batch.BatchNumber.toLowerCase().includes(searchTerm)) ||
          (batch.Description && batch.Description.toLowerCase().includes(searchTerm)) ||
          (batch.GLName && batch.GLName.toLowerCase().includes(searchTerm))
        );
        renderTable(filtered);
      });
      
      // Close button
      const closeBtn = header.querySelector('.brm-modal-close');
      closeBtn.addEventListener('click', () => {
        document.body.removeChild(overlay);
      });
      
      // Cancel button
      const cancelBtn = footer.querySelector('.brm-modal-cancel');
      cancelBtn.addEventListener('click', () => {
        document.body.removeChild(overlay);
      });
      
      // Select buttons - use event delegation on modal
      modal.addEventListener('click', (e) => {
        if (e.target.classList.contains('brm-select-btn')) {
          const batchNo = e.target.getAttribute('data-batch-no');
          console.log('[BankReconciliationAuto] Select button clicked for batch:', batchNo);
          console.log('[BankReconciliationAuto] batchNoInput element:', this.batchNoInput);
          
          const selectedBatch = batches.find(b => (b.BatchNo || b.BatchNumber) === batchNo);
          console.log('[BankReconciliationAuto] Found batch:', selectedBatch);
          
          if (selectedBatch) {
            if (this.batchNoInput) {
              this.batchNoInput.value = selectedBatch.BatchNo || selectedBatch.BatchNumber || '';
              console.log('[BankReconciliationAuto] Batch No set to:', this.batchNoInput.value);
            } else {
              console.error('[BankReconciliationAuto] batchNoInput element not found!');
              // Try alternative selector
              const inputField = document.querySelector('[data-field="batchNo"]');
              if (inputField) {
                inputField.value = selectedBatch.BatchNo || selectedBatch.BatchNumber || '';
                console.log('[BankReconciliationAuto] Batch No set via alternative selector');
              }
            }
            
            // Close modal
            if (document.body.contains(overlay)) {
              document.body.removeChild(overlay);
              console.log('[BankReconciliationAuto] Modal closed');
            }
          } else {
            console.error('[BankReconciliationAuto] Batch not found for No:', batchNo);
          }
        }
      });
      
      // Close on overlay click
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          document.body.removeChild(overlay);
        }
      });
    }
  };

  // Initialize on document ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      bankReconciliationAuto.init();
    });
  } else {
    bankReconciliationAuto.init();
  }

  // Expose to global scope if needed
  window.BankReconciliationAuto = bankReconciliationAuto;
})();
