(function () {
    'use strict';

    let currentMode = 'view';
    let currentGroupData = null;

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

    function formatDateTime(dateString) {
        if (!dateString) return '';
        if (window.GlobalUtils?.formatDateTime) {
            return window.GlobalUtils.formatDateTime(dateString);
        }
        try {
            const date = new Date(dateString);
            return date.toLocaleString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        } catch {
            return dateString;
        }
    }

    function populateGroupData(data, details01 = {}) {
        currentGroupData = data;
        document.getElementById('SubGroupId').value = data.SubGroupID || '';
        document.getElementById('GroupDescription').value = data.SubGroupName || '';

        document.getElementById('NoOfMembers').textContent = details01.NoOfMembers || '-';
        document.getElementById('LoanCycleRequired').textContent = details01.IsStaggered ? 'Yes' : 'No';
        document.getElementById('CreatedBy').textContent = data.CreatedBy || '-';
        document.getElementById('ModifiedBy').textContent = data.ModifiedBy || '-';
        document.getElementById('SupervisedBy').textContent = data.SupervisedBy || '-';
        document.getElementById('CreatedOn').textContent = data.CreatedOn ? formatDateTime(data.CreatedOn) : '-';
        document.getElementById('ModifiedOn').textContent = data.ModifiedOn ? formatDateTime(data.ModifiedOn) : '-';
        document.getElementById('SupervisedOn').textContent = data.SupervisedOn ? formatDateTime(data.SupervisedOn) : '-';
    }

    function clearForm() {
        document.getElementById('SubGroupId').value = '';
        document.getElementById('GroupDescription').value = '';
        document.getElementById('NoOfMembers').textContent = '-';
        document.getElementById('LoanCycleRequired').textContent = '-';
        document.getElementById('CreatedBy').textContent = '-';
        document.getElementById('ModifiedBy').textContent = '-';
        document.getElementById('SupervisedBy').textContent = '-';
        document.getElementById('CreatedOn').textContent = '-';
        document.getElementById('ModifiedOn').textContent = '-';
        document.getElementById('SupervisedOn').textContent = '-';
        currentGroupData = null;
    }

    function updateButtonStates() {
        const editBtn = document.querySelector('[data-action="edit"]');
        const deleteBtn = document.querySelector('[data-action="delete"]');
        const saveBtn = document.querySelector('[data-action="save"]');

        if (editBtn) editBtn.disabled = !currentGroupData || currentMode !== 'view';
        if (deleteBtn) deleteBtn.disabled = !currentGroupData || currentMode !== 'view';
        if (saveBtn) saveBtn.disabled = currentMode === 'view';
    }

    async function fetchSubGroupDetails(subGroupId) {
        try {
            showLoading(true);
            const response = await window.GroupService.getSubGroup({
                OurBranchID: parentContext.branchId,
                GroupID: parentContext.centerId,
                SubGroupID: subGroupId,
                OperatorID: window.parent?.Environment?.OperatorID || 'CSADM',
                Direction: 0
            });

            const details02 = response?.data?.Details02?.[0];
            const details01 = response?.data?.Details01?.[0] || {};

            if (details02) {
                populateGroupData(details02, details01);
                showSnackbar('Sub Group loaded successfully', 'success');
                currentMode = 'view';
                updateButtonStates();
            } else {
                showSnackbar('Sub Group selected (details not found)', 'warning');
                currentGroupData = {
                    SubGroupID: subGroupId,
                    SubGroupName: document.getElementById('GroupDescription').value,
                    UpdateCount: 1
                };
                updateButtonStates();
            }
        } catch (error) {
            console.error('[Group Details] Error loading subgroup:', error);
            showSnackbar('Failed to load subgroup details', 'error');
        } finally {
            showLoading(false);
        }
    }

    function openSubGroupSearch() {
        resolveParentContext();
        if (!validateParentContext()) return;

        if (!searchModal) {
            showSnackbar('Search modal is not available.', 'error');
            return;
        }

        searchModal.open({
            tableID: 'SubGroupID',
            moduleID: 5060,
            whereStmt: '',
            advFilterString: parentContext.centerId ? `GroupID='${parentContext.centerId}'` : '',
            searchKey: '',
            onSelect: (row) => {
                const subGroupId = row?.SubGroupID || row?.subGroupId || '';
                const name = row?.SubGroupName || row?.Description || '';
                if (subGroupId) {
                    document.getElementById('SubGroupId').value = subGroupId;
                    document.getElementById('GroupDescription').value = name;
                    fetchSubGroupDetails(subGroupId);
                }
            }
        }).catch(err => {
            console.error('[Group Details] Search modal open failed:', err);
            showSnackbar('Unable to open search dialog.', 'error');
        });
    }

    function getFormData() {
        return {
            subGroupId: document.getElementById('SubGroupId').value.trim(),
            groupDescription: document.getElementById('GroupDescription').value.trim()
        };
    }

    function validateFormData(formData) {
        if (!formData.groupDescription) {
            showSnackbar('Group description is required', 'warning');
            return false;
        }
        return true;
    }

    function viewGroup() {
        resolveParentContext();
        if (!validateParentContext()) return;
        currentMode = 'view';
        updateButtonStates();
        showSnackbar('View mode - search for a sub group', 'info');
    }

    function addNewGroup() {
        resolveParentContext();
        if (!validateParentContext()) return;
        currentMode = 'add';
        clearForm();
        updateButtonStates();
        showSnackbar('Add mode - enter sub group details', 'info');
    }

    function editGroup() {
        if (!currentGroupData) {
            showSnackbar('Please select a group first', 'warning');
            return;
        }
        currentMode = 'edit';
        updateButtonStates();
        showSnackbar('Edit mode - modify sub group details', 'info');
    }

    async function deleteGroup() {
        if (!currentGroupData) {
            showSnackbar('Please select a group first', 'warning');
            return;
        }
        resolveParentContext();
        if (!validateParentContext()) return;

        try {
            showLoading(true);
            const requestData = {
                OurBranchID: parentContext.branchId,
                GroupID: parentContext.centerId,
                SubGroupID: currentGroupData.SubGroupID,
                UpdateCount: currentGroupData.UpdateCount || 1
            };

            const response = await window.GroupService.deleteSubGroup(requestData);
            if (response?.success) {
                showSnackbar('Group deleted successfully', 'success');
                clearForm();
                currentMode = 'view';
                updateButtonStates();
            } else {
                showSnackbar('Failed to delete group', 'error');
            }
        } catch (error) {
            console.error('[Group Details] Error deleting group:', error);
            showSnackbar('Failed to delete group', 'error');
        } finally {
            showLoading(false);
        }
    }

    async function saveGroup() {
        if (currentMode !== 'add' && currentMode !== 'edit') {
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
                SubGroupID: formData.subGroupId || '',
                SubGroupName: formData.groupDescription,
                CreatedBy: window.parent?.Environment?.OperatorID || 'CSADM',
                CreatedOn: currentMode === 'add' ? new Date().toISOString() : (currentGroupData?.CreatedOn || new Date().toISOString()),
                ModifiedBy: currentMode === 'edit' ? (window.parent?.Environment?.OperatorID || 'CSADM') : '',
                ModifiedOn: currentMode === 'edit' ? new Date().toISOString() : '',
                SupervisedBy: currentGroupData?.SupervisedBy || '',
                UpdateCount: currentMode === 'add' ? 1 : (currentGroupData?.UpdateCount || 1)
            };

            const response = await window.GroupService.addEditSubGroup(requestData);
            if (response?.success) {
                showSnackbar('Group saved successfully', 'success');
                currentMode = 'view';
                updateButtonStates();
            } else {
                showSnackbar('Failed to save group', 'error');
            }
        } catch (error) {
            console.error('[Group Details] Error saving group:', error);
            showSnackbar('Failed to save group', 'error');
        } finally {
            showLoading(false);
        }
    }

    function handleCancel() {
        clearForm();
        currentMode = 'view';
        updateButtonStates();
    }

    function closeSubmodule() {
        try {
            const parent = window.parent;
            
            // Primary method: Parent has closeChildForm function (MVC standard)
            if (typeof parent.closeChildForm === 'function') {
                console.log('[GroupDetails] Calling parent.closeChildForm()');
                parent.closeChildForm();
                return;
            }
            
            // Fallback 1: Parent has closeFrame function
            if (typeof parent.closeFrame === 'function') {
                console.log('[GroupDetails] Calling parent.closeFrame()');
                parent.closeFrame();
                return;
            }
            
            // Fallback 2: Set iframe src to about:blank
            if (parent !== window && parent.document) {
                const iframe = parent.document.querySelector('iframe[data-child-iframe], iframe[src*="GroupDetails"]');
                if (iframe) {
                    console.log('[GroupDetails] Setting iframe src to about:blank');
                    iframe.src = 'about:blank';
                    return;
                }
            }
            
            console.warn('[GroupDetails] No close method found in parent');
        } catch (error) {
            console.error('[GroupDetails] Error closing submodule:', error);
        }
    }

    function wireEvents() {
        document.getElementById('btnClose')?.addEventListener('click', () => {
            closeSubmodule();
        });
        document.getElementById('btnRefresh')?.addEventListener('click', () => window.location.reload());

        document.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (event) => {
                const action = event.currentTarget?.dataset?.action;
                if (!action) return;

                switch (action) {
                    case 'view':
                        viewGroup();
                        break;
                    case 'add':
                        addNewGroup();
                        break;
                    case 'edit':
                        editGroup();
                        break;
                    case 'delete':
                        deleteGroup();
                        break;
                    case 'save':
                        saveGroup();
                        break;
                    case 'cancel':
                        handleCancel();
                        break;
                }
            });
        });

        document.querySelectorAll('[data-lookup="SubGroup"]').forEach(btn => {
            btn.addEventListener('click', openSubGroupSearch);
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
        updateButtonStates();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
