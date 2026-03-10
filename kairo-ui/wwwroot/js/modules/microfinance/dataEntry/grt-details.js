(function () {
    'use strict';

    const ActionState = {
        INITIAL: 'initial',
        VIEW: 'view',
        ADD: 'add',
        EDIT: 'edit'
    };

    let currentState = ActionState.INITIAL;
    let fetchedUpdateCount = 0;

    const parentContext = {
        branchId: '',
        branchName: '',
        centerId: '',
        centerName: '',
        operatorId: ''
    };

    let searchModal = null;

    function ensureToastContainer() {
        let el = document.querySelector('[data-kairo-toast-container]');
        if (el) return el;

        el = document.createElement('div');
        el.className = 'kairo-toast-container';
        el.setAttribute('data-kairo-toast-container', '');
        el.setAttribute('aria-live', 'polite');
        el.setAttribute('aria-relevant', 'additions');
        document.body.appendChild(el);
        return el;
    }

    function showToast(message, { title = 'Notice', variant = 'info', timeoutMs = 5000 } = {}) {
        const container = ensureToastContainer();
        const toast = document.createElement('div');
        toast.className = `kairo-toast kairo-toast--${variant}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-atomic', 'true');

        const body = document.createElement('div');
        body.className = 'kairo-toast__body';
        body.textContent = String(message || '');

        toast.appendChild(body);
        container.appendChild(toast);

        const remove = () => {
            toast.classList.remove('is-show');
            toast.addEventListener('transitionend', () => toast.remove(), { once: true });
            setTimeout(() => toast.remove(), 300);
        };

        setTimeout(() => toast.classList.add('is-show'), 0);
        if (timeoutMs && timeoutMs > 0) setTimeout(remove, timeoutMs);
    }

    function showSnackbar(message, type = 'info') {
        let variant = 'info';
        if (type === 'success') variant = 'success';
        else if (type === 'error' || type === 'danger') variant = 'danger';
        else if (type === 'warning') variant = 'warning';
        showToast(message, { title: 'Notice', variant });
    }

    function showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.hidden = !show;
    }

    function resolveParentContext() {
        const parentDoc = window.parent?.document;
        parentContext.branchId = parentDoc?.getElementById('branchId')?.value?.trim() || '';
        parentContext.branchName = parentDoc?.getElementById('branchName')?.value?.trim() || '';
        parentContext.centerId = parentDoc?.getElementById('centerId')?.value?.trim() || '';
        parentContext.centerName = parentDoc?.getElementById('centerName')?.value?.trim() || '';
        const appCore = window.parent?.AppCore || window.AppCore;
        const parentSession = window.parent?.sessionStorage;
        parentContext.operatorId = appCore?.getCurrentUserId?.()
            || parentSession?.getItem('UserId')
            || parentSession?.getItem('UserID')
            || parentSession?.getItem('OperatorID')
            || sessionStorage.getItem('UserId')
            || sessionStorage.getItem('UserID')
            || sessionStorage.getItem('OperatorID')
            || '';
    }

    function validateParentContext() {
        if (!parentContext.branchId) {
            showSnackbar('Branch ID is required. Please select a branch first.', 'error');
            return false;
        }
        if (!parentContext.centerId) {
            showSnackbar('Center ID is required. Please select a center first.', 'error');
            return false;
        }
        return true;
    }

    function extractBackendErrorMessage(response) {
        if (!response) return 'An unexpected error occurred.';
        if (typeof response === 'string') return response;
        if (response.message) return response.message;
        if (response.Message) return response.Message;
        if (response.error?.message) return response.error.message;
        if (Array.isArray(response.Details) && response.Details.length > 0) {
            return response.Details[0].Message || response.Details[0];
        }
        if (Array.isArray(response.Details01) && response.Details01.length > 0) {
            return response.Details01[0].Message || response.Details01[0];
        }
        return 'An unexpected error occurred. Please try again.';
    }

    const buttonStates = {
        [ActionState.INITIAL]: { view: true, add: false, edit: false, delete: false, save: false, cancel: false },
        [ActionState.VIEW]: { view: false, add: false, edit: true, delete: true, save: false, cancel: true },
        [ActionState.ADD]: { view: false, add: false, edit: false, delete: false, save: true, cancel: true },
        [ActionState.EDIT]: { view: false, add: false, edit: false, delete: false, save: true, cancel: true }
    };

    function updateButtonStates() {
        const states = buttonStates[currentState];
        if (!states) return;

        document.querySelectorAll('.btn-action').forEach(btn => btn.classList.remove('active'));

        Object.entries(states).forEach(([action, enabled]) => {
            const btn = document.querySelector(`[data-action="${action}"]`);
            if (btn) btn.disabled = !enabled;
        });

        const activeBtn = document.querySelector(`[data-action="${currentState}"]`);
        if (activeBtn) activeBtn.classList.add('active');
    }

    const keyLookupFields = ['SchemeId', 'LoanCycleNo'];
    const editableInEditMode = [
        'GroupDisbursementDate',
        'ValueDate',
        'InstallmentStartDate',
        'GroupDisbursementTime',
        'GrtExpiryDate',
        'Remarks'
    ];

    function setFieldsReadonly(readonly, isInitialState = false, isEditState = false) {
        const inputs = document.querySelectorAll('.form-section input, .form-section select, .form-section textarea');
        inputs.forEach(input => {
            const isKeyField = keyLookupFields.includes(input.id);
            const isEditableInEdit = editableInEditMode.includes(input.id);

            if (isInitialState && isKeyField) {
                input.readOnly = false;
                input.disabled = false;
                return;
            }

            if (isEditState) {
                const canEdit = isEditableInEdit || isKeyField;
                input.readOnly = !canEdit;
                input.disabled = !canEdit;
                return;
            }

            input.readOnly = readonly;
            input.disabled = readonly;
        });
    }

    function formatDateForInput(isoDate) {
        if (!isoDate) return '';
        try {
            if (isoDate.includes('T')) {
                const datePart = isoDate.split('T')[0];
                if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart;
            }
            if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
            const date = new Date(isoDate);
            if (isNaN(date.getTime())) return '';
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch {
            return '';
        }
    }

    function getFieldValue(source, ...keys) {
        if (!source || typeof source !== 'object') return '';
        for (const key of keys) {
            const actual = Object.keys(source).find(k => k.toLowerCase() === String(key).toLowerCase());
            if (actual && source[actual] !== undefined && source[actual] !== null) return source[actual];
        }
        return '';
    }

    function populateForm(responseData) {
        const details02 = responseData?.Details02?.[0] || {};
        const details01 = responseData?.Details01?.[0] || {};

        const setInputValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value || '';
        };

        const setTextContent = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value || '-';
        };

        setInputValue('SchemeId', getFieldValue(details02, 'LoanSchemeID', 'SchemeID'));
        setInputValue('SchemeName', getFieldValue(details02, 'LoanSchemeName', 'SchemeName', 'Description'));
        setInputValue('LoanCycleNo', getFieldValue(details02, 'LoanCycleNo'));
        setInputValue('ReferenceNo', getFieldValue(details02, 'RefNo', 'ReferenceNo'));
        setInputValue('GroupDisbursementDate', formatDateForInput(getFieldValue(details02, 'GroupDisbursementDate')));
        setInputValue('ValueDate', formatDateForInput(getFieldValue(details02, 'ValueDate')));
        setInputValue('InstallmentStartDate', formatDateForInput(getFieldValue(details02, 'InstallmentStartDate')));
        setInputValue('GroupDisbursementTime', getFieldValue(details02, 'GroupDisbursementTime'));
        setInputValue('GrtExpiryDate', formatDateForInput(getFieldValue(details02, 'GrtExpiryDate')));
        setInputValue('GrtDate', formatDateForInput(getFieldValue(details02, 'GrtDate')));
        setInputValue('MinLoanAmount', getFieldValue(details02, 'MinLoanAmount'));
        setInputValue('MaxLoanAmount', getFieldValue(details02, 'MaxLoanAmount'));
        setInputValue('LoanAmount', getFieldValue(details02, 'LoanAmount'));
        setInputValue('LoanTerm', getFieldValue(details02, 'LoanTerm'));
        setInputValue('InstallmentGracePeriod', getFieldValue(details02, 'InstallmentGracePeriod'));
        setInputValue('Remarks', getFieldValue(details02, 'Remarks'));

        setTextContent('CreatedBy', getFieldValue(details02, 'CreatedBy'));
        setTextContent('CreatedOn', getFieldValue(details02, 'CreatedOn'));
        setTextContent('ModifiedBy', getFieldValue(details02, 'ModifiedBy'));
        setTextContent('ModifiedOn', getFieldValue(details02, 'ModifiedOn'));
        setTextContent('SupervisedBy', getFieldValue(details02, 'SupervisedBy'));
        setTextContent('SupervisedOn', getFieldValue(details02, 'SupervisedOn'));

        fetchedUpdateCount = getFieldValue(details02, 'UpdateCount') || 0;
    }

    function clearForm() {
        document.querySelectorAll('.form-section input, .form-section textarea').forEach(input => {
            if (input.type === 'date') input.value = '';
            else input.value = '';
        });
        
        const setTextContent = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        setTextContent('CreatedBy', '-');
        setTextContent('CreatedOn', '-');
        setTextContent('ModifiedBy', '-');
        setTextContent('ModifiedOn', '-');
        setTextContent('SupervisedBy', '-');
        setTextContent('SupervisedOn', '-');
        fetchedUpdateCount = 0;
    }

    async function fetchGrtDetails() {
        resolveParentContext();
        if (!validateParentContext()) return;

        const schemeId = document.getElementById('SchemeId').value.trim();
        const loanCycleNo = document.getElementById('LoanCycleNo').value.trim();
        const refNo = document.getElementById('ReferenceNo')?.value?.trim() || null;

        if (!schemeId) {
            showSnackbar('Scheme ID is required.', 'warning');
            return;
        }

        try {
            showLoading(true);
            const requestData = {
                OurBranchID: parentContext.branchId,
                GroupID: parentContext.centerId,
                LoanSchemeID: schemeId,
                LoanCycleNo: parseInt(loanCycleNo) || 0,
                RefNo: refNo,
                OperatorID: parentContext.operatorId,
                Direction: 0,
                DirectionType: ''
            };

            const result = await window.GroupService.getGRTDetails(requestData);
            if (result?.success && result?.data) {
                const details02 = result.data.Details02?.[0];
                if (!details02 || !details02.CreatedOn) {
                    currentState = ActionState.INITIAL;
                    updateButtonStates();
                    const addBtn = document.querySelector('[data-action="add"]');
                    const viewBtn = document.querySelector('[data-action="view"]');
                    if (addBtn) addBtn.disabled = false;
                    if (viewBtn) viewBtn.disabled = true;
                    showSnackbar('No GRT details found. You can add a new record.', 'info');
                } else {
                    populateForm(result.data);
                    currentState = ActionState.VIEW;
                    updateButtonStates();
                    setFieldsReadonly(true);
                    showSnackbar('GRT details loaded successfully', 'success');
                }
            } else {
                const errorMsg = extractBackendErrorMessage(result);
                showSnackbar(errorMsg, 'warning');
            }
        } catch (error) {
            console.error('[GRT Details] Error fetching GRT details:', error);
            const errorMsg = extractBackendErrorMessage(error);
            showSnackbar(errorMsg, 'error');
        } finally {
            showLoading(false);
        }
    }

    function getFormData() {
        return {
            schemeId: document.getElementById('SchemeId').value.trim(),
            schemeName: document.getElementById('SchemeName').value.trim(),
            loanCycleNo: document.getElementById('LoanCycleNo').value.trim(),
            referenceNo: document.getElementById('ReferenceNo').value.trim(),
            groupDisbursementDate: document.getElementById('GroupDisbursementDate').value,
            valueDate: document.getElementById('ValueDate').value,
            installmentStartDate: document.getElementById('InstallmentStartDate').value,
            groupDisbursementTime: document.getElementById('GroupDisbursementTime').value.trim(),
            grtExpiryDate: document.getElementById('GrtExpiryDate').value,
            grtDate: document.getElementById('GrtDate').value,
            minLoanAmount: document.getElementById('MinLoanAmount').value.trim(),
            maxLoanAmount: document.getElementById('MaxLoanAmount').value.trim(),
            loanAmount: document.getElementById('LoanAmount').value.trim(),
            loanTerm: document.getElementById('LoanTerm').value.trim(),
            installmentGracePeriod: document.getElementById('InstallmentGracePeriod').value.trim(),
            remarks: document.getElementById('Remarks').value.trim()
        };
    }

    function validateFormData(formData) {
        if (!formData.schemeId) {
            showSnackbar('Scheme ID is required', 'warning');
            return false;
        }
        if (!formData.loanCycleNo) {
            showSnackbar('Loan Cycle No. is required', 'warning');
            return false;
        }
        
        // Remarks length validation (max 255 characters)
        if (formData.remarks && formData.remarks.length > 255) {
            showSnackbar('Remarks cannot exceed 255 characters. Current length: ' + formData.remarks.length, 'warning');
            return false;
        }
        
        // Date validations
        if (formData.groupDisbursementDate && !formData.valueDate) {
            showSnackbar('Value Date is required when Disbursement Date is set', 'warning');
            return false;
        }
        
        if (formData.groupDisbursementDate && formData.grtExpiryDate) {
            const disbDate = new Date(formData.groupDisbursementDate);
            const expiryDate = new Date(formData.grtExpiryDate);
            if (disbDate >= expiryDate) {
                showSnackbar('GRT Expiry Date must be after Disbursement Date', 'warning');
                return false;
            }
        }
        
        if (formData.groupDisbursementDate && formData.installmentStartDate) {
            const disbDate = new Date(formData.groupDisbursementDate);
            const startDate = new Date(formData.installmentStartDate);
            if (disbDate >= startDate) {
                showSnackbar('Installment Start Date must be after Disbursement Date', 'warning');
                return false;
            }
        }
        
        if (formData.valueDate && formData.installmentStartDate) {
            const valueDate = new Date(formData.valueDate);
            const startDate = new Date(formData.installmentStartDate);
            if (valueDate >= startDate) {
                showSnackbar('Value Date must be before Installment Start Date', 'warning');
                return false;
            }
        }
        
        return true;
    }

    function openSchemeSearch() {
        resolveParentContext();
        if (!validateParentContext()) return;

        if (!searchModal) {
            showSnackbar('Search modal is not available.', 'error');
            return;
        }

        const groupProductId = window.parent?.document?.getElementById('centerProductId')?.value?.trim() || '';
        if (!groupProductId) {
            showSnackbar('Center Product ID is required to search schemes.', 'warning');
            return;
        }

        searchModal.open({
            tableID: 'GroupDefaultSchemeID',
            moduleID: 5060,
            whereStmt: '',
            advFilterString: `GroupProductID='${groupProductId}' AND SchemeTypeID='P'`,
            searchKey: '',
            ourbranchId: parentContext.branchId,
            onSelect: (row) => {
                const schemeId = row?.LoanSchemeID || row?.SchemeID || '';
                const schemeName = row?.LoanSchemeName || row?.Description || '';
                document.getElementById('SchemeId').value = schemeId;
                document.getElementById('SchemeName').value = schemeName;
            }
        }).catch(err => {
            console.error('[GRT Details] Search modal open failed:', err);
            showSnackbar('Unable to open search dialog.', 'error');
        });
    }

    function viewMode() {
        currentState = ActionState.VIEW;
        updateButtonStates();
        setFieldsReadonly(true, false, false);
        showSnackbar('View mode', 'info');
    }

    function addMode() {
        currentState = ActionState.ADD;
        clearForm();
        updateButtonStates();
        setFieldsReadonly(false, false, false);
        showSnackbar('Add mode', 'info');
    }

    function editMode() {
        currentState = ActionState.EDIT;
        updateButtonStates();
        setFieldsReadonly(false, false, true);
        showSnackbar('Edit mode', 'info');
    }

    async function deleteRecord() {
        resolveParentContext();
        if (!validateParentContext()) return;

        const formData = getFormData();
        if (!formData.schemeId || !formData.loanCycleNo) {
            showSnackbar('Scheme ID and Loan Cycle No. are required to delete', 'warning');
            return;
        }

        try {
            showLoading(true);
            const requestData = {
                OurBranchID: parentContext.branchId,
                GroupID: parentContext.centerId,
                LoanSchemeID: formData.schemeId,
                LoanCycleNo: parseInt(formData.loanCycleNo) || 0,
                RefNo: formData.referenceNo || null,
                UpdateCount: fetchedUpdateCount || 1
            };

            const response = await window.GroupService.deleteGRTDetails(requestData);
            if (response?.success) {
                showSnackbar('GRT details deleted successfully', 'success');
                clearForm();
                currentState = ActionState.INITIAL;
                updateButtonStates();
                setFieldsReadonly(true, true, false);
            } else {
                const errorMsg = extractBackendErrorMessage(response?.data || response);
                showSnackbar(errorMsg, 'error');
            }
        } catch (error) {
            console.error('[GRT Details] Error deleting GRT details:', error);
            const errorMsg = extractBackendErrorMessage(error);
            showSnackbar(errorMsg, 'error');
        } finally {
            showLoading(false);
        }
    }

    async function saveRecord() {
        if (currentState !== ActionState.ADD && currentState !== ActionState.EDIT) {
            showSnackbar('No changes to save', 'warning');
            return;
        }

        resolveParentContext();
        if (!validateParentContext()) return;

        const formData = getFormData();
        if (!validateFormData(formData)) return;

        try {
            showLoading(true);
            const operatorId = parentContext.operatorId || 'CSADM';
            const isAddMode = currentState === ActionState.ADD;
            const toNumberOrDefault = (value, defaultValue = 0) => {
                if (value === undefined || value === null || value === '') return defaultValue;
                const num = parseFloat(value);
                return Number.isFinite(num) ? num : defaultValue;
            };
            const toIntOrDefault = (value, defaultValue = 0) => {
                if (value === undefined || value === null || value === '') return defaultValue;
                const num = parseInt(value, 10);
                return Number.isFinite(num) ? num : defaultValue;
            };
            const normalizeDisbursementTime = (value) => {
                if (!value) return 0;
                const trimmed = String(value).trim();
                if (!trimmed) return 0;
                if (trimmed.includes(':')) {
                    const parts = trimmed.split(':');
                    const hours = parseInt(parts[0], 10);
                    const minutes = parseInt(parts[1] || '0', 10);
                    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
                    const decimal = hours + (minutes / 60);
                    return Number.isFinite(decimal) ? parseFloat(decimal.toFixed(2)) : 0;
                }
                const num = parseFloat(trimmed);
                return Number.isFinite(num) ? num : 0;
            };
            const requestData = {
                OurBranchID: parentContext.branchId,
                GroupID: parentContext.centerId,
                LoanSchemeID: formData.schemeId,
                LoanCycleNo: parseInt(formData.loanCycleNo) || 0,
                RefNo: formData.referenceNo || null,
                DisbursementDate: formData.groupDisbursementDate || '',
                DisbursementTime: normalizeDisbursementTime(formData.groupDisbursementTime),
                ValueDate: formData.valueDate || '',
                InstallmentStartDate: formData.installmentStartDate || '',
                GRTExpiryDate: formData.grtExpiryDate || '',
                MinLoanAmount: toNumberOrDefault(formData.minLoanAmount, 0),
                MaxLoanAmount: toNumberOrDefault(formData.maxLoanAmount, 0),
                DefaultLoanAmount: toNumberOrDefault(formData.loanAmount, 0),
                DefaultTerm: toIntOrDefault(formData.loanTerm, 0),
                InstallmentGracePeriod: toIntOrDefault(formData.installmentGracePeriod, 0),
                Remarks: formData.remarks || '',
                CreatedOn: isAddMode ? new Date().toISOString() : '',
                CreatedBy: isAddMode ? operatorId : '',
                ModifiedOn: !isAddMode ? new Date().toISOString() : '',
                ModifiedBy: !isAddMode ? operatorId : '',
                SupervisedBy: '',
                UpdateCount: isAddMode ? 0 : Math.max(0, Math.min(255, parseInt(fetchedUpdateCount) || 0))
            };

            const response = await window.GroupService.addEditGRTDetails(requestData);
            if (response?.success || response?.data?.success) {
                showSnackbar('GRT details saved successfully', 'success');
                currentState = ActionState.VIEW;
                updateButtonStates();
                setFieldsReadonly(true, false, false);
            } else {
                const errorMsg = extractBackendErrorMessage(response?.data || response);
                showSnackbar(errorMsg, 'error');
            }
        } catch (error) {
            console.error('[GRT Details] Error saving GRT details:', error);
            const errorMsg = extractBackendErrorMessage(error);
            showSnackbar(errorMsg, 'error');
        } finally {
            showLoading(false);
        }
    }

    function handleAction(action) {
        switch (action) {
            case 'view':
                fetchGrtDetails();
                break;
            case 'add':
                addMode();
                break;
            case 'edit':
                editMode();
                break;
            case 'delete':
                deleteRecord();
                break;
            case 'save':
                saveRecord();
                break;
            case 'cancel':
                clearForm();
                currentState = ActionState.INITIAL;
                updateButtonStates();
                setFieldsReadonly(true, true, false);
                break;
        }
    }

    function closeSubmodule() {
        try {
            const parent = window.parent;
            
            // Primary method: Parent has closeChildForm function (MVC standard)
            if (typeof parent.closeChildForm === 'function') {
                console.log('[GRTDetails] Calling parent.closeChildForm()');
                parent.closeChildForm();
                return;
            }
            
            // Fallback 1: Parent has closeFrame function
            if (typeof parent.closeFrame === 'function') {
                console.log('[GRTDetails] Calling parent.closeFrame()');
                parent.closeFrame();
                return;
            }
            
            // Fallback 2: Set iframe src to about:blank
            if (parent !== window && parent.document) {
                const iframe = parent.document.querySelector('iframe[data-child-iframe], iframe[src*="GRTDetails"]');
                if (iframe) {
                    console.log('[GRTDetails] Setting iframe src to about:blank');
                    iframe.src = 'about:blank';
                    return;
                }
            }
            
            console.warn('[GRTDetails] No close method found in parent');
        } catch (error) {
            console.error('[GRTDetails] Error closing submodule:', error);
        }
    }

    function handleCycleNavigation(direction) {
        resolveParentContext();
        if (!validateParentContext()) return;

        const schemeId = document.getElementById('SchemeId').value.trim();
        const loanCycleNo = document.getElementById('LoanCycleNo').value.trim();
        const refNo = document.getElementById('ReferenceNo')?.value?.trim() || null;

        if (!schemeId || !loanCycleNo) {
            showSnackbar('Scheme ID and Loan Cycle No. are required to navigate', 'warning');
            return;
        }

        try {
            showLoading(true);
            const requestData = {
                OurBranchID: parentContext.branchId,
                GroupID: parentContext.centerId,
                LoanSchemeID: schemeId,
                LoanCycleNo: parseInt(loanCycleNo) || 0,
                RefNo: refNo,
                OperatorID: parentContext.operatorId,
                Direction: direction,
                DirectionType: 'C' // Cycle
            };

            window.GroupService.getGRTDetails(requestData).then(result => {
                if (result?.success && result?.data?.Details02?.[0]) {
                    populateForm(result.data);
                    showSnackbar('Navigated to cycle ' + result.data.Details02[0].LoanCycleNo, 'success');
                    currentState = ActionState.VIEW;
                    updateButtonStates();
                    setFieldsReadonly(true);
                } else {
                    showSnackbar('Unable to navigate to next cycle', 'warning');
                }
            }).catch(error => {
                console.error('[GRT Details] Cycle navigation error:', error);
                showSnackbar(extractBackendErrorMessage(error), 'error');
            }).finally(() => showLoading(false));
        } catch (error) {
            console.error('[GRT Details] Cycle navigation error:', error);
            showLoading(false);
        }
    }

    function handleReferenceNavigation(direction) {
        resolveParentContext();
        if (!validateParentContext()) return;

        const schemeId = document.getElementById('SchemeId').value.trim();
        const loanCycleNo = document.getElementById('LoanCycleNo').value.trim();
        const refNo = document.getElementById('ReferenceNo')?.value?.trim() || null;

        if (!schemeId || !loanCycleNo) {
            showSnackbar('Scheme ID and Loan Cycle No. are required to navigate', 'warning');
            return;
        }

        try {
            showLoading(true);
            const requestData = {
                OurBranchID: parentContext.branchId,
                GroupID: parentContext.centerId,
                LoanSchemeID: schemeId,
                LoanCycleNo: parseInt(loanCycleNo) || 0,
                RefNo: refNo,
                OperatorID: parentContext.operatorId,
                Direction: direction,
                DirectionType: 'R' // Reference
            };

            window.GroupService.getGRTDetails(requestData).then(result => {
                if (result?.success && result?.data?.Details02?.[0]) {
                    populateForm(result.data);
                    showSnackbar('Navigated to reference ' + result.data.Details02[0].RefNo, 'success');
                    currentState = ActionState.VIEW;
                    updateButtonStates();
                    setFieldsReadonly(true);
                } else {
                    showSnackbar('Unable to navigate to next reference', 'warning');
                }
            }).catch(error => {
                console.error('[GRT Details] Reference navigation error:', error);
                showSnackbar(extractBackendErrorMessage(error), 'error');
            }).finally(() => showLoading(false));
        } catch (error) {
            console.error('[GRT Details] Reference navigation error:', error);
            showLoading(false);
        }
    }

    function validateTimeZone(timeStr) {
        if (!timeStr) return true;
        // Format: HH:MM or HH:MM:SS
        const timeRegex = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
        return timeRegex.test(timeStr.trim());
    }

    function wireEvents() {
        document.getElementById('btnClose')?.addEventListener('click', () => {
            closeSubmodule();
        });
        document.getElementById('btnRefresh')?.addEventListener('click', () => window.location.reload());

        // Auto-populate Value Date when Group Disbursement Date changes (from legacy system)
        const disbursementDateField = document.getElementById('GroupDisbursementDate');
        if (disbursementDateField) {
            disbursementDateField.addEventListener('change', (e) => {
                const valueDateField = document.getElementById('ValueDate');
                if (e.target.value && valueDateField && !valueDateField.value) {
                    valueDateField.value = e.target.value;
                    showSnackbar('Value Date auto-populated from Disbursement Date', 'info');
                }
            });
        }

        // Timezone validation for disbursement time
        const timeField = document.getElementById('GroupDisbursementTime');
        if (timeField) {
            timeField.addEventListener('blur', (e) => {
                if (e.target.value && !validateTimeZone(e.target.value)) {
                    showSnackbar('Invalid time format. Please use HH:MM or HH:MM:SS (example: 14:30 or 14:30:45)', 'warning');
                    e.target.focus();
                }
            });
        }

        // Prevent negative numbers and decimal points in numeric fields
        const numericFields = [
            'LoanCycleNo', 'ReferenceNo', 'MinLoanAmount', 'MaxLoanAmount',
            'LoanAmount', 'LoanTerm', 'InstallmentGracePeriod'
        ];
        
        numericFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('keypress', (e) => {
                    const char = String.fromCharCode(e.which);
                    // Prevent negative sign and minus operator
                    if (char === '-' || char === '+') {
                        e.preventDefault();
                    }
                });
            }
        });

        document.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', () => handleAction(btn.dataset.action));
        });

        document.querySelectorAll('[data-lookup="Scheme"]').forEach(btn => {
            btn.addEventListener('click', openSchemeSearch);
        });

        // Cycle navigation buttons
        document.querySelector('[data-nav="cycle-prev"]')?.addEventListener('click', () => handleCycleNavigation(-1));
        document.querySelector('[data-nav="cycle-next"]')?.addEventListener('click', () => handleCycleNavigation(1));

        // Reference navigation buttons
        document.querySelector('[data-nav="ref-prev"]')?.addEventListener('click', () => handleReferenceNavigation(-1));
        document.querySelector('[data-nav="ref-next"]')?.addEventListener('click', () => handleReferenceNavigation(1));

        // Remarks field max length validation on input
        const remarksField = document.getElementById('Remarks');
        if (remarksField) {
            remarksField.addEventListener('input', (e) => {
                if (e.target.value.length > 255) {
                    e.target.value = e.target.value.substring(0, 255);
                    showSnackbar('Remarks cannot exceed 255 characters', 'warning');
                }
            });
        }

        document.querySelectorAll('[data-section-toggle]').forEach(header => {
            header.addEventListener('click', () => {
                const section = header.closest('.form-section');
                const content = section?.querySelector('[data-section-content]');
                const icon = header.querySelector('.section-toggle-btn i');
                if (!content) return;
                const isHidden = content.hidden === true;
                content.hidden = !isHidden;
                if (icon) icon.className = isHidden ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
            });
        });
    }

    function init() {
        const appCore = window.AppCore || window.parent?.AppCore || window.top?.AppCore;
        if (appCore && window.SearchModal) {
            searchModal = new window.SearchModal(appCore);
        }

        wireEvents();
        resolveParentContext();
        setFieldsReadonly(true, true, false);
        updateButtonStates();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
