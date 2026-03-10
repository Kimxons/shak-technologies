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
        centerName: ''
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
        if (window.GlobalUtils?.parseDateInput) {
            const parsed = window.GlobalUtils.parseDateInput(isoDate);
            if (parsed) return parsed;
        }
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

        document.getElementById('SchemeId').value = getFieldValue(details02, 'LoanSchemeID', 'SchemeID');
        document.getElementById('SchemeName').value = getFieldValue(details02, 'LoanSchemeName', 'SchemeName', 'Description');
        document.getElementById('LoanCycleNo').value = getFieldValue(details02, 'LoanCycleNo');
        document.getElementById('ReferenceNo').value = getFieldValue(details02, 'RefNo', 'ReferenceNo');
        document.getElementById('GroupDisbursementDate').value = formatDateForInput(getFieldValue(details02, 'GroupDisbursementDate'));
        document.getElementById('ValueDate').value = formatDateForInput(getFieldValue(details02, 'ValueDate'));
        document.getElementById('InstallmentStartDate').value = formatDateForInput(getFieldValue(details02, 'InstallmentStartDate'));
        document.getElementById('GroupDisbursementTime').value = getFieldValue(details02, 'GroupDisbursementTime');
        document.getElementById('GrtExpiryDate').value = formatDateForInput(getFieldValue(details02, 'GrtExpiryDate'));
        document.getElementById('GrtDate').value = formatDateForInput(getFieldValue(details02, 'GrtDate'));
        document.getElementById('MinLoanAmount').value = getFieldValue(details02, 'MinLoanAmount');
        document.getElementById('MaxLoanAmount').value = getFieldValue(details02, 'MaxLoanAmount');
        document.getElementById('LoanAmount').value = getFieldValue(details02, 'LoanAmount');
        document.getElementById('LoanTerm').value = getFieldValue(details02, 'LoanTerm');
        document.getElementById('InstallmentGracePeriod').value = getFieldValue(details02, 'InstallmentGracePeriod');
        document.getElementById('Remarks').value = getFieldValue(details02, 'Remarks');
        document.getElementById('GrtStatus').value = getFieldValue(details01, 'GrtStatus', 'Status');

        document.getElementById('CreatedBy').textContent = getFieldValue(details02, 'CreatedBy') || '-';
        document.getElementById('CreatedOn').textContent = getFieldValue(details02, 'CreatedOn') || '-';
        document.getElementById('ModifiedBy').textContent = getFieldValue(details02, 'ModifiedBy') || '-';
        document.getElementById('ModifiedOn').textContent = getFieldValue(details02, 'ModifiedOn') || '-';
        document.getElementById('SupervisedBy').textContent = getFieldValue(details02, 'SupervisedBy') || '-';
        document.getElementById('SupervisedOn').textContent = getFieldValue(details02, 'SupervisedOn') || '-';

        fetchedUpdateCount = getFieldValue(details02, 'UpdateCount') || 0;
    }

    function clearForm() {
        document.querySelectorAll('.form-section input, .form-section textarea').forEach(input => {
            if (input.type === 'date') input.value = '';
            else input.value = '';
        });
        document.getElementById('GrtStatus').value = '';
        document.getElementById('CreatedBy').textContent = '-';
        document.getElementById('CreatedOn').textContent = '-';
        document.getElementById('ModifiedBy').textContent = '-';
        document.getElementById('ModifiedOn').textContent = '-';
        document.getElementById('SupervisedBy').textContent = '-';
        document.getElementById('SupervisedOn').textContent = '-';
        fetchedUpdateCount = 0;
    }

    async function fetchGrtDetails() {
        resolveParentContext();
        if (!validateParentContext()) return;

        const schemeId = document.getElementById('SchemeId').value.trim();
        const loanCycleNo = document.getElementById('LoanCycleNo').value.trim();
        const refNo = document.getElementById('ReferenceNo')?.value?.trim() || '';

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
                OperatorID: window.parent?.Environment?.OperatorID || 'CSADM',
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
                showSnackbar(result?.message || 'No GRT details found', 'warning');
            }
        } catch (error) {
            console.error('[GRT Details] Error fetching GRT details:', error);
            showSnackbar('Failed to fetch GRT details', 'error');
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
                RefNo: formData.referenceNo || '',
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
                showSnackbar('Failed to delete GRT details', 'error');
            }
        } catch (error) {
            console.error('[GRT Details] Error deleting GRT details:', error);
            showSnackbar('Failed to delete GRT details', 'error');
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
            const requestData = {
                OurBranchID: parentContext.branchId,
                GroupID: parentContext.centerId,
                LoanSchemeID: formData.schemeId,
                LoanCycleNo: parseInt(formData.loanCycleNo) || 0,
                RefNo: formData.referenceNo || '',
                GroupDisbursementDate: formData.groupDisbursementDate,
                ValueDate: formData.valueDate,
                InstallmentStartDate: formData.installmentStartDate,
                GroupDisbursementTime: formData.groupDisbursementTime,
                GrtExpiryDate: formData.grtExpiryDate,
                GrtDate: formData.grtDate,
                MinLoanAmount: formData.minLoanAmount,
                MaxLoanAmount: formData.maxLoanAmount,
                LoanAmount: formData.loanAmount,
                LoanTerm: formData.loanTerm,
                InstallmentGracePeriod: formData.installmentGracePeriod,
                Remarks: formData.remarks,
                CreatedBy: window.parent?.Environment?.OperatorID || 'CSADM',
                CreatedOn: new Date().toISOString(),
                ModifiedBy: currentState === ActionState.EDIT ? (window.parent?.Environment?.OperatorID || 'CSADM') : '',
                ModifiedOn: currentState === ActionState.EDIT ? new Date().toISOString() : '',
                UpdateCount: currentState === ActionState.ADD ? 1 : (fetchedUpdateCount || 1)
            };

            const response = await window.GroupService.addEditGRTDetails(requestData);
            if (response?.success) {
                showSnackbar('GRT details saved successfully', 'success');
                currentState = ActionState.VIEW;
                updateButtonStates();
                setFieldsReadonly(true, false, false);
            } else {
                showSnackbar('Failed to save GRT details', 'error');
            }
        } catch (error) {
            console.error('[GRT Details] Error saving GRT details:', error);
            showSnackbar('Failed to save GRT details', 'error');
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

    function wireEvents() {
        document.getElementById('btnClose')?.addEventListener('click', () => {
            window.parent?.postMessage?.({ type: 'kairo-dataentry-close' }, '*');
        });
        document.getElementById('btnRefresh')?.addEventListener('click', () => window.location.reload());

        document.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', () => handleAction(btn.dataset.action));
        });

        document.querySelectorAll('[data-lookup="Scheme"]').forEach(btn => {
            btn.addEventListener('click', openSchemeSearch);
        });

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
