(function () {
    'use strict';

    let currentCenterData = null;

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

    function showSystemToast(message, { title = 'Notice', variant = 'info', timeoutMs = 5000 } = {}) {
        const container = ensureToastContainer();
        const existingToasts = container.querySelectorAll('.kairo-toast');
        existingToasts.forEach(t => t.remove());

        showToast(message, { title, variant, timeoutMs });
    }

    function showSnackbar(message, type = 'info') {
        let variant = 'info';
        if (type === 'success') variant = 'success';
        else if (type === 'error' || type === 'danger') variant = 'danger';
        else if (type === 'warning') variant = 'warning';

        showSystemToast(message, { title: 'Notice', variant });
    }

    const showLoading = (show) => {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.hidden = !show;
        }
    };

    const getCenterData = () => {
        try {
            if (window.parent && window.parent.currentCenter) {
                return window.parent.currentCenter;
            }
        } catch (e) {
            console.warn('[GroupMembers] Could not access parent center data:', e);
        }
        return null;
    };

    const fetchSchemes = async () => {
        const centerData = getCenterData();
        if (!centerData) {
            showSnackbar('No center selected. Please select a center first.', 'error');
            return;
        }

        const schemeSelect = document.getElementById('schemeSelect');
        if (!schemeSelect) return;

        showLoading(true);

        try {
            schemeSelect.innerHTML = '<option value="">Select a scheme...</option>';

            const requestData = {
                OurBranchID: centerData.OurBranchID || centerData.OurBranchId || '0603',
                GroupID: centerData.GroupID || centerData.ID
            };

            if (!window.parent?.GroupService) {
                schemeSelect.innerHTML = '<option value="">Service not loaded</option>';
                showSnackbar('Service not available. Please refresh the page.', 'error');
                showLoading(false);
                return;
            }

            const result = await window.parent.GroupService.getGroupLoanSchemeCombo(requestData);
            showLoading(false);

            if (result?.success && result?.data) {
                const schemes = Array.isArray(result.data) ? result.data : (result.Details || []);

                if (!schemes.length) {
                    schemeSelect.innerHTML = '<option value="">No schemes available</option>';
                    showSnackbar('No schemes available for this center.', 'info');
                    return;
                }

                schemes.forEach(scheme => {
                    const option = document.createElement('option');
                    const schemeId = scheme.LoanSchemeID || scheme.SchemeID || '';
                    option.value = schemeId;
                    option.textContent = `${schemeId} - ${scheme.Description || scheme.SchemeName || ''}`;
                    schemeSelect.appendChild(option);
                });

                if (centerData.DefaultLoanSchemeID) {
                    schemeSelect.value = centerData.DefaultLoanSchemeID;
                }

                showSnackbar(`Loaded ${schemes.length} schemes.`, 'success');
            } else {
                schemeSelect.innerHTML = '<option value="">Failed to load schemes</option>';
                showSnackbar(result?.message || 'Failed to load schemes.', 'error');
            }
        } catch (error) {
            console.error('[GroupMembers] Error fetching schemes:', error);
            schemeSelect.innerHTML = '<option value="">Error loading schemes</option>';
            showLoading(false);
            showSnackbar('Error loading schemes: ' + error.message, 'error');
        }
    };

    const handleSchemeChange = (e) => {
        const selectedSchemeId = e.target.value;

        const event = new CustomEvent('schemeChanged', {
            detail: { schemeId: selectedSchemeId, centerData: currentCenterData }
        });
        window.dispatchEvent(event);

        clearMembersTable();
        setButtonStates(false);
    };

    const fetchGroupMembers = async (schemeId) => {
        const centerData = getCenterData();
        if (!centerData) {
            showSnackbar('No center selected. Please select a center first.', 'error');
            return;
        }

        showLoading(true);

        try {
            const requestData = {
                OurBranchID: centerData.OurBranchID || centerData.OurBranchId || '0603',
                GroupID: centerData.GroupID || centerData.ID,
                LoanSchemeID: schemeId,
                OperatorID: window.parent?.Environment?.OperatorID || 'CSADM'
            };

            if (!window.parent?.GroupService) {
                showSnackbar('Service not available. Please refresh the page.', 'error');
                showLoading(false);
                return;
            }

            const result = await window.parent.GroupService.viewGroupMembers(requestData);
            showLoading(false);

            if (result?.success && result?.data) {
                const count = populateMembersTable(result.data);
                showSnackbar(`Loaded ${count} members.`, 'success');
            } else {
                showSnackbar(result?.message || 'No members found.', 'info');
                clearMembersTable();
            }
        } catch (error) {
            console.error('[GroupMembers] Error fetching members:', error);
            showLoading(false);
            showSnackbar('Error loading members: ' + error.message, 'error');
            clearMembersTable();
        }
    };

    const populateMembersTable = (data) => {
        const tbody = document.getElementById('membersTableBody');
        if (!tbody) return 0;

        let members = [];
        if (Array.isArray(data)) {
            members = data;
        } else if (data.Details) {
            members = Array.isArray(data.Details) ? data.Details : [];
        } else if (data.Details01) {
            members = Array.isArray(data.Details01) ? data.Details01 : [];
        }

        if (members.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="text-start">No records to display.</td></tr>';
            return 0;
        }

        tbody.innerHTML = members.map(member => `
            <tr>
                <td>${member.ClientID || ''}</td>
                <td>${member.ClientName || member.Name || ''}</td>
                <td>${member.GroupID || ''}</td>
                <td>${member.GroupName || ''}</td>
                <td>${member.JoinDate ? (window.GlobalUtils?.formatDate ? window.GlobalUtils.formatDate(member.JoinDate) : new Date(member.JoinDate).toLocaleDateString()) : ''}</td>
                <td>${member.LoanAccountID || member.LoanAcID || ''}</td>
                <td>${member.LoanBalance || member.LoanOSBalance || '0'}</td>
                <td>${member.SavingsAccountID || member.SavingsAcID || ''}</td>
                <td>${member.TotalSavingsBalance || member.SavingsBalance || '0'}</td>
                <td>${member.CenterLeader || (member.IsLeader ? 'Yes' : 'No')}</td>
            </tr>
        `).join('');

        return members.length;
    };

    const clearMembersTable = () => {
        const tbody = document.getElementById('membersTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="10" class="text-start">No records to display.</td></tr>';
        }
    };

    const closeSubmodule = () => {
        try {
            const parent = window.parent;

            if (typeof parent.closeChildForm === 'function') {
                parent.closeChildForm();
                return;
            }

            if (typeof parent.closeFrame === 'function') {
                parent.closeFrame();
                return;
            }

            if (parent !== window && parent.document) {
                const iframe = parent.document.querySelector('iframe[data-child-iframe], iframe[src*="GroupMembers"]');
                if (iframe) {
                    iframe.src = 'about:blank';
                    return;
                }
            }

            parent?.postMessage?.({ type: 'kairo-dataentry-close' }, '*');
        } catch (error) {
            console.error('[Group Members View] Error closing submodule:', error);
        }
    };

    const setButtonStates = (isViewing) => {
        const viewBtn = document.querySelector('[data-cu-view]');
        const cancelBtn = document.querySelector('[data-cu-cancel]');
        const schemeSelect = document.getElementById('schemeSelect');

        if (viewBtn) viewBtn.disabled = isViewing;
        if (cancelBtn) cancelBtn.disabled = !isViewing;
        if (schemeSelect) schemeSelect.disabled = isViewing;
    };

    const handleViewClick = async () => {
        const schemeSelect = document.getElementById('schemeSelect');
        const selectedSchemeId = schemeSelect?.value;

        if (!selectedSchemeId) {
            showSnackbar('Please select a scheme first.', 'warning');
            return;
        }

        await fetchGroupMembers(selectedSchemeId);
        setButtonStates(true);
    };

    const handleCancelClick = () => {
        clearMembersTable();
        setButtonStates(false);
    };

    const initializeSchemeDropdown = () => {
        currentCenterData = getCenterData();

        fetchSchemes().then(() => {
            const schemeSelect = document.getElementById('schemeSelect');
            if (schemeSelect && schemeSelect.value) {
                fetchGroupMembers(schemeSelect.value);
                setButtonStates(true);
            } else {
                setButtonStates(false);
            }
        });

        const schemeSelect = document.getElementById('schemeSelect');
        if (schemeSelect) {
            schemeSelect.addEventListener('change', handleSchemeChange);
        }

        const viewBtn = document.querySelector('[data-cu-view]');
        const cancelBtn = document.querySelector('[data-cu-cancel]');

        if (viewBtn) {
            viewBtn.addEventListener('click', handleViewClick);
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', handleCancelClick);
        }

        document.getElementById('btnClose')?.addEventListener('click', closeSubmodule);
        document.getElementById('btnRefresh')?.addEventListener('click', () => window.location.reload());

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

        setButtonStates(false);
    };

    document.addEventListener('DOMContentLoaded', initializeSchemeDropdown);

    window.groupMembersView = {
        fetchSchemes,
        getCenterData,
        initializeSchemeDropdown,
        fetchGroupMembers
    };
})();
