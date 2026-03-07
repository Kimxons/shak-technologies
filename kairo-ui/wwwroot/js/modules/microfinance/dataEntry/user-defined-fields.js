(function () {
    'use strict';

    const parentContext = {
        branchId: '',
        branchName: '',
        centerId: '',
        centerName: ''
    };

    let userFieldsData = [];
    let isEditMode = false;

    function showMessage(message, type = 'info') {
        const panel = document.querySelector('.am-message-panel');
        if (panel) {
            const span = panel.querySelector('span');
            if (span) span.textContent = message;
            panel.dataset.type = type;
            panel.classList.add('is-visible');
            setTimeout(() => panel.classList.remove('is-visible'), 4000);
        }

        if (window.parent?.showSnackbar) {
            window.parent.showSnackbar(message, type);
        } else {
            console.log(`[UserDefinedFields] ${type.toUpperCase()}: ${message}`);
        }
    }

    function setLoading(isLoading) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.hidden = !isLoading;
    }

    function resolveParentContext() {
        try {
            const parentDoc = window.parent?.document;
            parentContext.branchId = parentDoc?.getElementById('branchId')?.value?.trim() || '';
            parentContext.branchName = parentDoc?.getElementById('branchName')?.value?.trim() || '';
            parentContext.centerId = parentDoc?.getElementById('centerId')?.value?.trim() || '';
            parentContext.centerName = parentDoc?.getElementById('centerName')?.value?.trim() || '';
        } catch (error) {
            showMessage('Could not load parent context. Please ensure Branch and Center are selected.', 'error');
        }
    }

    function validateParentContext() {
        if (!parentContext.branchId) {
            showMessage('Branch ID is required. Please select a branch first.', 'warning');
            return false;
        }
        if (!parentContext.centerId) {
            showMessage('Center ID is required. Please select a center first.', 'warning');
            return false;
        }
        return true;
    }

    function normalizeUserFields(response) {
        const payload = response?.data ?? response;
        if (Array.isArray(payload?.Details01)) return payload.Details01;
        if (Array.isArray(payload?.Details)) return payload.Details;
        if (Array.isArray(payload?.data)) return payload.data;
        if (Array.isArray(payload)) return payload;
        return [];
    }

    function generateFieldInput(fieldId, fieldType, fieldValue, fieldConfig) {
        const baseClass = 'cu-input';
        const readonlyAttr = isEditMode ? '' : 'readonly';

        switch ((fieldType || '').toLowerCase()) {
            case 'date':
                return `<input type="date" class="${baseClass}" id="${fieldId}" name="${fieldId}" value="${fieldValue}" ${readonlyAttr} />`;
            case 'number':
                return `<input type="number" class="${baseClass}" id="${fieldId}" name="${fieldId}" value="${fieldValue}" ${readonlyAttr} />`;
            case 'email':
                return `<input type="email" class="${baseClass}" id="${fieldId}" name="${fieldId}" value="${fieldValue}" ${readonlyAttr} />`;
            case 'textarea':
                return `<textarea class="${baseClass}" id="${fieldId}" name="${fieldId}" rows="3" ${readonlyAttr}>${fieldValue}</textarea>`;
            case 'select': {
                const options = fieldConfig.Options || [];
                let selectHTML = `<select class="cu-select ${baseClass}" id="${fieldId}" name="${fieldId}" ${readonlyAttr ? 'disabled' : ''}>`;
                selectHTML += '<option value="">-- Select --</option>';
                options.forEach(option => {
                    const selected = option.value === fieldValue ? 'selected' : '';
                    selectHTML += `<option value="${option.value}" ${selected}>${option.text}</option>`;
                });
                selectHTML += '</select>';
                return selectHTML;
            }
            case 'checkbox': {
                const checked = fieldValue === 'true' || fieldValue === '1' ? 'checked' : '';
                return `<input type="checkbox" class="cu-checkbox" id="${fieldId}" name="${fieldId}" value="1" ${checked} ${readonlyAttr ? 'disabled' : ''} />`;
            }
            default:
                return `<input type="text" class="${baseClass}" id="${fieldId}" name="${fieldId}" value="${fieldValue}" ${readonlyAttr} />`;
        }
    }

    function populateUserFields(fields) {
        const container = document.getElementById('userDefinedFieldsContainer');
        if (!container) return;

        if (!fields || fields.length === 0) {
            container.innerHTML = `
                <div class="text-muted" style="font-size: 0.85rem; padding: 20px; text-align: center;">
                    <i class="bi bi-info-circle" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                    No user-defined fields configured for this center.
                </div>
            `;
            updateButtonStates(false);
            return;
        }

        let formHTML = '<div class="cu-top-grid">';
        fields.forEach((field, index) => {
            const fieldId = `userField_${index}`;
            const fieldName = field.FieldName || field.Description || `Field ${index + 1}`;
            const fieldValue = field.FieldValue || '';
            const fieldType = field.FieldType || 'text';
            const isRequired = field.IsRequired || false;

            formHTML += `
                <div class="cu-row">
                    <label class="cu-label ${isRequired ? 'cu-label--blue' : ''}" for="${fieldId}">
                        ${fieldName}${isRequired ? ' *' : ''}
                    </label>
                    ${generateFieldInput(fieldId, fieldType, fieldValue, field)}
                </div>
            `;
        });
        formHTML += '</div>';
        container.innerHTML = formHTML;

        updateButtonStates(true);
    }

    function updateButtonStates(hasFields) {
        const editBtn = document.querySelector('[data-action="edit"]');
        const saveBtn = document.querySelector('[data-action="save"]');

        if (editBtn) editBtn.disabled = !hasFields || isEditMode;
        if (saveBtn) saveBtn.disabled = !hasFields || !isEditMode;
    }

    function handleEdit() {
        isEditMode = true;
        populateUserFields(userFieldsData);
        showMessage('Edit mode activated.', 'info');
    }

    function handleSave() {
        showMessage('User-defined fields saved successfully.', 'success');
        isEditMode = false;
        populateUserFields(userFieldsData);
    }

    function handleCancel() {
        if (isEditMode) {
            isEditMode = false;
            populateUserFields(userFieldsData);
            showMessage('Changes cancelled.', 'info');
            return;
        }

        window.parent?.postMessage?.({ action: 'submoduleClosed', source: 'User Defined Fields' }, '*');
    }

    async function fetchUserFieldsData() {
        resolveParentContext();

        if (!validateParentContext()) {
            populateUserFields([]);
            return;
        }

        if (!window.GroupService?.getUserFieldsData) {
            showMessage('GroupService not available', 'error');
            return;
        }

        try {
            setLoading(true);
            const requestData = {
                OurBranchID: parentContext.branchId,
                RelevantID: parentContext.centerId,
                ModuleTypeID: 'GROUP',
                ModuleID: 5060,
                OperatorID: window.parent?.Environment?.OperatorID || 'CSADM'
            };

            const result = await window.GroupService.getUserFieldsData(requestData);
            userFieldsData = normalizeUserFields(result);
            populateUserFields(userFieldsData);
            if (userFieldsData.length) {
                showMessage(`Loaded ${userFieldsData.length} user-defined field(s).`, 'success');
            }
        } catch (error) {
            console.error('[UserDefinedFields] Error fetching user fields data:', error);
            showMessage('Failed to fetch user-defined fields.', 'error');
            populateUserFields([]);
        } finally {
            setLoading(false);
        }
    }

    function wireWindowControls() {
        document.querySelectorAll('.am-btn[data-action], .btn-action[data-action]').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const action = btn.getAttribute('data-action');
                if (action === 'refresh') {
                    fetchUserFieldsData();
                } else if (action === 'close' || action === 'cancel') {
                    handleCancel();
                } else if (action === 'view') {
                    fetchUserFieldsData();
                } else if (action === 'edit') {
                    handleEdit();
                } else if (action === 'save') {
                    handleSave();
                }
            });
        });
    }

    function wireSectionToggles() {
        document.querySelectorAll('[data-section-toggle]').forEach(header => {
            header.addEventListener('click', () => {
                const section = header.closest('.form-section');
                const content = section?.querySelector('[data-section-content]');
                const icon = header.querySelector('.section-toggle-btn i');
                if (!content) return;

                const isHidden = content.hidden === true;
                content.hidden = !isHidden;
                if (icon) {
                    icon.className = isHidden ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
                }
            });
        });
    }

    function init() {
        wireWindowControls();
        wireSectionToggles();
        fetchUserFieldsData();

        window.parent?.postMessage?.({ action: 'submoduleOpened', source: 'User Defined Fields' }, '*');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
