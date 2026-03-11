/**
 * Disbursement Schedule Module
 * Manages loan disbursement schedule CRUD operations
 * Migrated from legacy implementation to KAIRO MVC architecture
 */
(function () {
    'use strict';

    console.log('[DisbursementSchedule] Module loaded');

    // ═══════════════════════════════════════════════════════════════════
    // STATE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════

    const state = {
        dtLoanDisbSchedules: [],         // Original data from API
        dtLoanDisbSchedulesLocal: [],    // Working copy
        dtLoanDisbSchedulesMain: [],     // Backup copy
        localMode: 'NONE',               // NEW, ALTER, NONE
        Mode: 'NONE',                    // ADD, EDIT, NONE
        SelectedIndex: 0,
        Flag: true,
        isDirty: false
    };

    // ═══════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════

    function init() {
        console.log('[DisbursementSchedule] Initializing module...');

        try {
            wireSectionToggles();
            attachButtonEvents();
            loadInitialData();

            // Listen for messages from parent window
            window.addEventListener('message', handleParentMessage);

            console.log('[DisbursementSchedule] Initialization complete');
        } catch (error) {
            console.error('[DisbursementSchedule] Initialization error:', error);
            showMessage('Error initializing module: ' + error.message, 'error');
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // PARENT WINDOW COMMUNICATION
    // ═══════════════════════════════════════════════════════════════════

    function handleParentMessage(event) {
        console.log('[DisbursementSchedule] Received message from parent:', event.data);

        if (event.data.action === 'populateFromParent' && event.data.data) {
            console.log('[DisbursementSchedule] Populating from parent data');
            populateFormFromParent(event.data.data);
        }
    }

    function populateFormFromParent(data) {
        try {
            console.log('[DisbursementSchedule] Populating form with parent data:', data);

            // Set hidden fields
            setValue('hdnBranchID', data.branchId || '');
            setValue('hdnApplicationID', data.applicationId || '');
            setValue('hdnAccountID', data.accountId || '');
            setValue('hdnLoanSeries', data.loanSeries || '');
            setValue('hdnBookingAmount', data.sanctionAmount || data.approvedAmount || '');
            setValue('hdnDisbursementNo', data.noOfDisbursements || '');
            setValue('hdnDisbursementMode', data.modeOfDisbursementName || '');
            setValue('hdnDisbursementDate', data.firstDisbursementDate || '');
            setValue('hdnProductID', data.productId || '');
            setValue('hdnCurrencyID', data.currencyId || '');
            setValue('hdnTerm', data.term || data.repaymentTerm || '');
            setValue('hdnApplicationStatus', data.applicationStatus || '');

            // Populate Behind The Scene section
            updateBehindTheScene();

            // Load schedules from API
            const branchId = getValue('hdnBranchID');
            const applicationId = getValue('hdnApplicationID');

            if (branchId && applicationId) {
                loadDisbursementSchedules(branchId, applicationId);
            } else {
                showMessage('Branch ID and Application ID are required', 'warning');
                enableButtons(['btnBack']);
                disableButtons(['btnAdd', 'btnEdit', 'btnSave', 'btnCancel', 'btnNew', 'btnAlter', 'btnRemove', 'btnUpdate', 'btnClear']);
            }
        } catch (error) {
            console.error('[DisbursementSchedule] Error populating from parent:', error);
            showMessage('Error loading data: ' + error.message, 'error');
        }
    }

    function updateBehindTheScene() {
        const bookingAmount = cleanAmountValue(getValue('hdnBookingAmount'));
        setValue('txtBookedAmount', formatMoney(bookingAmount));
        setValue('txtNoOfDisbursement', getValue('hdnDisbursementNo'));
        setValue('txtModeOfDisbursement', getValue('hdnDisbursementMode'));
        setValue('txtFirstDisbursementDate', formatDate(getValue('hdnDisbursementDate')));
        setValue('txtProductID', getValue('hdnProductID'));
        setValue('txtCurrencyID', getValue('hdnCurrencyID'));
        setValue('txtTerm', getValue('hdnTerm'));
        setValue('txtApplicationStatus', getValue('hdnApplicationStatus'));
    }

    // ═══════════════════════════════════════════════════════════════════
    // DATA LOADING - API CALLS
    // ═══════════════════════════════════════════════════════════════════

    function loadInitialData() {
        try {
            const branchId = getValue('hdnBranchID');
            const applicationId = getValue('hdnApplicationID');

            if (branchId && applicationId) {
                loadDisbursementSchedules(branchId, applicationId);
            } else {
                // Initialize empty grid
                bindGrid(state.dtLoanDisbSchedulesLocal);
                showMessage('Please load application data first', 'info');
                enableButtons(['btnBack']);
                disableButtons(['btnAdd', 'btnEdit', 'btnSave', 'btnCancel', 'btnNew', 'btnAlter', 'btnRemove', 'btnUpdate', 'btnClear']);
            }
        } catch (error) {
            console.error('[DisbursementSchedule] Error in loadInitialData:', error);
        }
    }

    async function loadDisbursementSchedules(branchId, applicationId) {
        try {
            console.log('[DisbursementSchedule] Loading schedules for Branch:', branchId, 'Application:', applicationId);
            showMessage('Loading disbursement schedules...', 'info');
            showLoading(true);

            const response = await AppCore.invokeControllerAsync('WorkFlowLoan/LoanSanction/DisbursementSchedule/GetSchedules', {
                OurBranchID: branchId,
                ApplicationID: applicationId,
                OperatorID: getValue('hdnOperatorID') || 'SYSTEM',
                ModuleID: 7065
            });

            console.log('[DisbursementSchedule] Load response:', response);

            if (!response.success) {
                showMessage(response.message || 'Failed to load schedules', 'error');
                enableButtons(['btnAdd', 'btnBack']);
                disableButtons(['btnEdit', 'btnSave', 'btnCancel']);
                bindGrid([]);
                return false;
            }

            // Parse response data (handle nested Details structure)
            const schedules = parseScheduleData(response.data);

            state.dtLoanDisbSchedules = schedules;
            state.dtLoanDisbSchedulesLocal = JSON.parse(JSON.stringify(schedules));
            state.dtLoanDisbSchedulesMain = JSON.parse(JSON.stringify(schedules));

            // Bind grid and calculate total
            bindGrid(state.dtLoanDisbSchedulesLocal);
            calculateTotalAmount();

            if (state.dtLoanDisbSchedulesLocal.length > 0) {
                enableButtons(['btnEdit', 'btnBack']);
                disableButtons(['btnAdd', 'btnSave', 'btnCancel', 'btnNew', 'btnAlter', 'btnRemove', 'btnUpdate', 'btnClear']);
                showMessage('Disbursement schedule loaded successfully', 'success');
            } else {
                enableButtons(['btnAdd', 'btnBack']);
                disableButtons(['btnEdit', 'btnSave', 'btnCancel', 'btnNew', 'btnAlter', 'btnRemove', 'btnUpdate', 'btnClear']);
                showMessage('No disbursement schedule found. Click Add to create.', 'info');
            }

            return true;
        } catch (error) {
            console.error('[DisbursementSchedule] Error loading schedules:', error);
            showMessage('Error loading schedules: ' + error.message, 'error');
            return false;
        } finally {
            showLoading(false);
        }
    }

    function parseScheduleData(responseData) {
        try {
            // Handle nested Details structure from ResponseDetail<object>
            let data = responseData;
            
            if (responseData.Details) {
                data = responseData.Details;
            }

            if (Array.isArray(data)) {
                return data;
            } else if (data && Array.isArray(data.Details)) {
                return data.Details;
            }

            return [];
        } catch (error) {
            console.error('[DisbursementSchedule] Error parsing schedule data:', error);
            return [];
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // GRID BINDING
    // ═══════════════════════════════════════════════════════════════════

    function bindGrid(schedules) {
        const tbody = document.getElementById('scheduleGridBody');
        const emptyMessage = document.querySelector('[data-dse-empty]');

        if (!tbody) return;

        tbody.innerHTML = '';

        if (!schedules || schedules.length === 0) {
            if (emptyMessage) emptyMessage.classList.remove('d-none');
            return;
        }

        if (emptyMessage) emptyMessage.classList.add('d-none');

        schedules.forEach((schedule, index) => {
            const row = tbody.insertRow();
            row.dataset.index = index;
            row.style.cursor = 'pointer';

            // Add click handler
            row.addEventListener('click', () => handleRowClick(index));

            // SL No
            const cell1 = row.insertCell(0);
            cell1.textContent = schedule.SLNo || (index + 1);

            // Disbursement Date
            const cell2 = row.insertCell(1);
            cell2.textContent = formatDate(schedule.DisbursementDate);

            // Disbursement Amount
            const cell3 = row.insertCell(2);
            cell3.className = 'text-end';
            cell3.textContent = formatMoney(schedule.DisbursementAmount);

            // Mark edited rows
            if (schedule.ButtonMark === 'N' || schedule.ButtonMark === 'A') {
                row.classList.add('table-warning');
            }
        });
    }

    function handleRowClick(index) {
        console.log('[DisbursementSchedule] Row clicked:', index);
        state.SelectedIndex = index;

        // Highlight selected row
        const tbody = document.getElementById('scheduleGridBody');
        if (tbody) {
            tbody.querySelectorAll('tr').forEach((row, i) => {
                if (i === index) {
                    row.classList.add('table-active');
                } else {
                    row.classList.remove('table-active');
                }
            });
        }

        // Enable row action buttons if in edit mode
        if (state.Mode === 'EDIT') {
            enableButtons(['btnAlter', 'btnRemove']);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // BUTTON EVENT HANDLERS
    // ═══════════════════════════════════════════════════════════════════

    function attachButtonEvents() {
        attachEvent('btnAdd', handleAdd);
        attachEvent('btnEdit', handleEdit);
        attachEvent('btnSave', handleSave);
        attachEvent('btnCancel', handleCancel);
        attachEvent('btnBack', handleBack);
        attachEvent('btnNew', handleNew);
        attachEvent('btnAlter', handleAlter);
        attachEvent('btnRemove', handleRemove);
        attachEvent('btnUpdate', handleUpdate);
        attachEvent('btnClear', handleClear);
    }

    function handleAdd() {
        console.log('[DisbursementSchedule] Add clicked');
        state.Mode = 'ADD';
        state.localMode = 'NONE';
        
        enableButtons(['btnSave', 'btnCancel', 'btnNew']);
        disableButtons(['btnAdd', 'btnEdit', 'btnBack', 'btnAlter', 'btnRemove', 'btnUpdate', 'btnClear']);
        
        showMessage('Enter schedule details and click New to add rows', 'info');
    }

    function handleEdit() {
        console.log('[DisbursementSchedule] Edit clicked');
        state.Mode = 'EDIT';
        
        enableButtons(['btnSave', 'btnCancel']);
        disableButtons(['btnAdd', 'btnEdit', 'btnBack', 'btnNew', 'btnAlter', 'btnRemove', 'btnUpdate', 'btnClear']);
        
        showMessage('Select a row and click Alter or Remove to modify', 'info');
    }

    function handleNew() {
        console.log('[DisbursementSchedule] New clicked');
        
        const date = getValue('txtDisbursementDate');
        const amount = cleanAmountValue(getValue('txtDisbursementAmount'));

        if (!date) {
            showMessage('Disbursement Date is required', 'error');
            document.getElementById('txtDisbursementDate')?.focus();
            return;
        }

        if (!amount || parseFloat(amount) <= 0) {
            showMessage('Disbursement Amount must be greater than zero', 'error');
            document.getElementById('txtDisbursementAmount')?.focus();
            return;
        }

        // Add new record
        const newRecord = {
            SLNo: state.dtLoanDisbSchedulesLocal.length + 1,
            DisbursementDate: date,
            DisbursementAmount: parseFloat(amount).toFixed(2),
            IsDisbursed: false,
            ButtonMark: 'N',
            OurBranchID: getValue('hdnBranchID'),
            AccountID: getValue('hdnAccountID'),
            LoanSeries: getValue('hdnLoanSeries'),
            ApplicationID: getValue('hdnApplicationID')
        };

        state.dtLoanDisbSchedulesLocal.push(newRecord);
        bindGrid(state.dtLoanDisbSchedulesLocal);
        calculateTotalAmount();

        // Clear input fields
        setValue('txtDisbursementDate', '');
        setValue('txtDisbursementAmount', '');
        
        enableButtons(['btnNew', 'btnClear']);
        state.isDirty = true;

        showMessage('Record added. Click Save to commit changes.', 'success');
    }

    function handleAlter() {
        console.log('[DisbursementSchedule] Alter clicked');
        
        if (state.SelectedIndex < 0 || state.SelectedIndex >= state.dtLoanDisbSchedulesLocal.length) {
            showMessage('Please select a row first', 'error');
            return;
        }

        const selected = state.dtLoanDisbSchedulesLocal[state.SelectedIndex];
        
        // Populate form fields
        setValue('txtDisbursementDate', formatDateForInput(selected.DisbursementDate));
        setValue('txtDisbursementAmount', selected.DisbursementAmount);
        
        // Enable form and Update button
        document.getElementById('txtDisbursementDate').disabled = false;
        document.getElementById('txtDisbursementAmount').disabled = false;
        
        enableButtons(['btnUpdate', 'btnClear']);
        disableButtons(['btnAlter', 'btnRemove']);
        
        state.localMode = 'ALTER';
        
        showMessage('Modify the values and click Update', 'info');
    }

    function handleRemove() {
        console.log('[DisbursementSchedule] Remove clicked');
        
        if (state.SelectedIndex < 0 || state.SelectedIndex >= state.dtLoanDisbSchedulesLocal.length) {
            showMessage('Please select a row first', 'error');
            return;
        }

        if (!confirm('Are you sure you want to remove this disbursement schedule entry?')) {
            return;
        }

        // Remove the record
        state.dtLoanDisbSchedulesLocal.splice(state.SelectedIndex, 1);
        
        // Renumber SLNo
        state.dtLoanDisbSchedulesLocal.forEach((record, index) => {
            record.SLNo = index + 1;
            if (!record.ButtonMark) record.ButtonMark = 'A';
        });

        bindGrid(state.dtLoanDisbSchedulesLocal);
        calculateTotalAmount();
        state.SelectedIndex = -1;
        state.isDirty = true;

        showMessage('Record removed. Click Save to commit changes.', 'warning');
    }

    function handleUpdate() {
        console.log('[DisbursementSchedule] Update clicked');
        
        const date = getValue('txtDisbursementDate');
        const amount = cleanAmountValue(getValue('txtDisbursementAmount'));

        if (!date) {
            showMessage('Disbursement Date is required', 'error');
            return;
        }

        if (!amount || parseFloat(amount) <= 0) {
            showMessage('Disbursement Amount must be greater than zero', 'error');
            return;
        }

        // Update the record
        const record = state.dtLoanDisbSchedulesLocal[state.SelectedIndex];
        record.DisbursementDate = date;
        record.DisbursementAmount = parseFloat(amount).toFixed(2);
        record.ButtonMark = 'A';

        bindGrid(state.dtLoanDisbSchedulesLocal);
        calculateTotalAmount();

        // Clear and disable form
        setValue('txtDisbursementDate', '');
        setValue('txtDisbursementAmount', '');
        document.getElementById('txtDisbursementDate').disabled = true;
        document.getElementById('txtDisbursementAmount').disabled = true;

        enableButtons(['btnAlter', 'btnRemove']);
        disableButtons(['btnUpdate', 'btnClear']);
        
        state.localMode = 'NONE';
        state.isDirty = true;

        showMessage('Record updated. Click Save to commit changes.', 'success');
    }

    function handleClear() {
        console.log('[DisbursementSchedule] Clear clicked');
        
        setValue('txtDisbursementDate', '');
        setValue('txtDisbursementAmount', '');
        
        document.getElementById('txtDisbursementDate').disabled = state.Mode !== 'ADD';
        document.getElementById('txtDisbursementAmount').disabled = state.Mode !== 'ADD';

        if (state.localMode === 'ALTER') {
            enableButtons(['btnAlter', 'btnRemove']);
            disableButtons(['btnUpdate', 'btnClear']);
            state.localMode = 'NONE';
        }
    }

    async function handleSave() {
        console.log('[DisbursementSchedule] Save clicked');
        
        // Validate changes exist
        const hasChanges = state.dtLoanDisbSchedulesLocal.some(schedule => 
            schedule.ButtonMark === 'N' || schedule.ButtonMark === 'A'
        );

        if (!hasChanges) {
            showMessage('No changes to save', 'error');
            return;
        }

        // Validate disbursement count
        const expectedCount = parseInt(getValue('hdnDisbursementNo')) || 0;
        if (expectedCount > 0 && state.dtLoanDisbSchedulesLocal.length !== expectedCount) {
            showMessage(`Number of disbursements must be ${expectedCount}`, 'error');
            return;
        }

        // Validate total amount
        const bookingAmount = parseFloat(cleanAmountValue(getValue('hdnBookingAmount'))) || 0;
        const totalDisbursement = state.dtLoanDisbSchedulesLocal.reduce((sum, s) => 
            sum + (parseFloat(s.DisbursementAmount) || 0), 0
        );

        if (Math.abs(totalDisbursement - bookingAmount) > 0.01) {
            showMessage(`Total disbursement amount (${formatMoney(totalDisbursement)}) must equal loan amount (${formatMoney(bookingAmount)})`, 'error');
            return;
        }

        try {
            showMessage('Saving disbursement schedule...', 'info');
            showLoading(true);
            disableButtons(['btnSave', 'btnCancel']);

            // Convert schedules to XML format
            const detailRecordsXml = convertSchedulesToXml(state.dtLoanDisbSchedulesLocal);

            const response = await AppCore.invokeControllerAsync('WorkFlowLoan/LoanSanction/DisbursementSchedule/SaveSchedules', {
                OurBranchID: getValue('hdnBranchID'),
                AccountID: getValue('hdnAccountID'),
                LoanSeries: getValue('hdnLoanSeries'),
                ApplicationID: getValue('hdnApplicationID'),
                CreatedBy: getValue('hdnOperatorID') || 'SYSTEM',
                CreatedOn: '',
                SupervisedBy: '',
                UpdateCount: getValue('hdnUpdateCount') || '',
                DetailRecords: detailRecordsXml
            });

            console.log('[DisbursementSchedule] Save response:', response);

            if (!response.success) {
                showMessage(response.message || 'Failed to save schedules', 'error');
                enableButtons(['btnSave', 'btnCancel']);
                return;
            }

            showMessage('Disbursement schedule saved successfully', 'success');
            
            // Reset state
            state.Mode = 'NONE';
            state.localMode = 'NONE';
            state.isDirty = false;

            // Reload data
            await loadDisbursementSchedules(getValue('hdnBranchID'), getValue('hdnApplicationID'));

        } catch (error) {
            console.error('[DisbursementSchedule] Error saving:', error);
            showMessage('Error saving schedules: ' + error.message, 'error');
            enableButtons(['btnSave', 'btnCancel']);
        } finally {
            showLoading(false);
        }
    }

    function handleCancel() {
        console.log('[DisbursementSchedule] Cancel clicked');
        
        if (state.isDirty) {
            if (!confirm('You have unsaved changes. Are you sure you want to cancel?')) {
                return;
            }
        }

        // Restore from backup
        state.dtLoanDisbSchedulesLocal = JSON.parse(JSON.stringify(state.dtLoanDisbSchedulesMain));
        bindGrid(state.dtLoanDisbSchedulesLocal);
        calculateTotalAmount();

        // Reset state and fields
        setValue('txtDisbursementDate', '');
        setValue('txtDisbursementAmount', '');
        document.getElementById('txtDisbursementDate').disabled = true;
        document.getElementById('txtDisbursementAmount').disabled = true;

        state.Mode = 'NONE';
        state.localMode = 'NONE';
        state.isDirty = false;

        if (state.dtLoanDisbSchedulesLocal.length > 0) {
            enableButtons(['btnEdit', 'btnBack']);
            disableButtons(['btnAdd', 'btnSave', 'btnCancel', 'btnNew', 'btnAlter', 'btnRemove', 'btnUpdate', 'btnClear']);
        } else {
            enableButtons(['btnAdd', 'btnBack']);
            disableButtons(['btnEdit', 'btnSave', 'btnCancel', 'btnNew', 'btnAlter', 'btnRemove', 'btnUpdate', 'btnClear']);
        }

        showMessage('Changes cancelled', 'info');
    }

    function handleBack() {
        console.log('[DisbursementSchedule] Back clicked');
        
        if (state.isDirty) {
            if (!confirm('You have unsaved changes. Are you sure you want to go back?')) {
                return;
            }
        }

        // Close the submodule (notify parent)
        if (window.parent && window.parent.closeLoanSanctionChildForm) {
            window.parent.closeLoanSanctionChildForm();
        } else {
            window.history.back();
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // XML CONVERSION
    // ═══════════════════════════════════════════════════════════════════

    function convertSchedulesToXml(schedules) {
        let xml = '';

        schedules.forEach((schedule, index) => {
            xml += '<dt_LoanDisbSchedules>';
            xml += `<SLNo>${escapeXml(schedule.SLNo || index + 1)}</SLNo>`;
            xml += `<DisbursementDate>${formatDateForXml(schedule.DisbursementDate)}</DisbursementDate>`;
            xml += `<DisbursementAmount>${parseFloat(schedule.DisbursementAmount || 0).toFixed(2)}</DisbursementAmount>`;
            xml += `<IsDisbursed>${schedule.IsDisbursed ? 'true' : 'false'}</IsDisbursed>`;
            xml += `<ButtonMark>${escapeXml(schedule.ButtonMark || 'N')}</ButtonMark>`;

            if (schedule.OurBranchID) xml += `<OurBranchID>${escapeXml(schedule.OurBranchID)}</OurBranchID>`;
            if (schedule.AccountID) xml += `<AccountID>${escapeXml(schedule.AccountID)}</AccountID>`;
            if (schedule.LoanSeries) xml += `<LoanSeries>${escapeXml(schedule.LoanSeries)}</LoanSeries>`;
            if (schedule.ApplicationID) xml += `<ApplicationID>${escapeXml(schedule.ApplicationID)}</ApplicationID>`;
            
            xml += '</dt_LoanDisbSchedules>';
        });

        console.log('[DisbursementSchedule] Generated XML:', xml);
        return xml;
    }

    function escapeXml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    function formatDateForXml(dateValue) {
        if (!dateValue) return '';
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return '';
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    }

    // ═══════════════════════════════════════════════════════════════════
    // UTILITY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    function calculateTotalAmount() {
        const total = state.dtLoanDisbSchedulesLocal.reduce((sum, schedule) => 
            sum + (parseFloat(schedule.DisbursementAmount) || 0), 0
        );
        setValue('txtTotalDisbursedAmount', formatMoney(total));
    }

    function cleanAmountValue(val) {
        if (!val) return '0';
        if (typeof val === 'number') return val.toFixed(2);
        const cleaned = val.toString().replace(/,/g, '').trim();
        const numValue = parseFloat(cleaned) || 0;
        return numValue.toString();
    }

    function formatMoney(value) {
        const num = parseFloat(cleanAmountValue(value));
        if (num === 0 || isNaN(num)) return '0.00';
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function formatDate(dateValue) {
        if (!dateValue) return '';
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return dateValue;
        
        const options = { year: 'numeric', month: 'short', day: '2-digit' };
        return date.toLocaleDateString('en-US', options);
    }

    function formatDateForInput(dateValue) {
        if (!dateValue) return '';
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return '';
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    }

    function getValue(id) {
        const el = document.getElementById(id);
        return el ? el.value : '';
    }

    function setValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value || '';
    }

    function attachEvent(id, handler) {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('click', handler);
        }
    }

    function enableButtons(ids) {
        ids.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.disabled = false;
        });
    }

    function disableButtons(ids) {
        ids.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.disabled = true;
        });
    }

    function wireSectionToggles() {
        document.querySelectorAll('[data-section-toggle]').forEach(header => {
            header.addEventListener('click', () => {
                const content = header.nextElementSibling;
                const icon = header.querySelector('.section-toggle-btn i');
                
                if (content) {
                    const isVisible = content.style.display !== 'none';
                    content.style.display = isVisible ? 'none' : 'block';
                    if (icon) {
                        icon.className = isVisible ? 'bi bi-chevron-down' : 'bi bi-chevron-up';
                    }
                    header.querySelector('.section-toggle-btn')?.setAttribute('aria-expanded', !isVisible);
                }
            });
        });
    }

    function showLoading(show) {
        const overlay = document.getElementById('pageLoadingOverlay');
        if (overlay) overlay.style.display = show ? 'flex' : 'none';
    }

    function showMessage(message, type = 'info') {
        const container = document.getElementById('messageContainer');
        if (!container) {
            console.log(`[DisbursementSchedule] ${type.toUpperCase()}: ${message}`);
            return;
        }

        const alertClass = {
            'success': 'alert-success',
            'error': 'alert-danger',
            'warning': 'alert-warning',
            'info': 'alert-info'
        }[type] || 'alert-info';

        const icon = {
            'success': 'bi-check-circle-fill',
            'error': 'bi-exclamation-triangle-fill',
            'warning': 'bi-exclamation-circle-fill',
            'info': 'bi-info-circle-fill'
        }[type] || 'bi-info-circle-fill';

        const alert = document.createElement('div');
        alert.className = `alert ${alertClass} alert-dismissible fade show`;
        alert.setAttribute('role', 'alert');
        alert.innerHTML = `
            <i class="bi ${icon} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;

        container.innerHTML = '';
        container.appendChild(alert);

        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                alert.remove();
            }, 5000);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // EXPOSE PUBLIC API
    // ═══════════════════════════════════════════════════════════════════

    window.DisbursementScheduleModule = {
        init,
        populateFormFromParent,
        loadDisbursementSchedules,
        getState: () => ({ ...state })
    };

    // Auto-initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 0);
    }

    console.log('[DisbursementSchedule] Module ready for initialization');
})();
