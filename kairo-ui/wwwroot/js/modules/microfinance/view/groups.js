(function () {
    'use strict';

    let currentCenterData = null;

    const showLoading = (show) => {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.hidden = !show;
        }
    };

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

    const getCenterData = () => {
        try {
            if (window.parent && window.parent.currentCenter) {
                return window.parent.currentCenter;
            }
        } catch (e) {
            console.warn('[Groups] Could not access parent window center data:', e);
        }
        return null;
    };

    const fetchSubGroupDetails = async () => {
        const centerData = getCenterData();
        if (!centerData) {
            showSnackbar('No center selected. Please select a center first.', 'error');
            clearSubGroupsTable();
            return;
        }

        const branchId = centerData.OurBranchID || '';
        const groupId = centerData.GroupID || '';

        if (!branchId || !groupId) {
            showSnackbar('Missing center information. Please reload the center.', 'error');
            clearSubGroupsTable();
            return;
        }

        showLoading(true);

        try {
            const requestData = {
                OurBranchID: branchId,
                GroupID: groupId,
                OperatorID: window.parent?.Environment?.OperatorID || 'CSADM'
            };

            if (!window.parent?.GroupService && window.parent?.ServiceLoader?.loadGroupService) {
                await window.parent.ServiceLoader.loadGroupService();
            }

            if (!window.parent?.GroupService) {
                showSnackbar('Service not available. Please refresh the page.', 'error');
                showLoading(false);
                return;
            }

            const result = await window.parent.GroupService.getSubGroupDetails(requestData);
            showLoading(false);

            if (result?.success && result?.data) {
                populateSubGroupsTable(result.data);
                updateTotalMembers(result.data);
                showSnackbar(`Loaded subgroups for center: ${groupId}`, 'success');
            } else {
                showSnackbar(result?.message || 'No subgroups found.', 'info');
                clearSubGroupsTable();
            }
        } catch (error) {
            console.error('[Groups] Error fetching subgroup details:', error);
            showLoading(false);
            showSnackbar('Error loading subgroups: ' + error.message, 'error');
            clearSubGroupsTable();
        }
    };

    const populateSubGroupsTable = (data) => {
        const tbody = document.getElementById('groupsTableBody');
        if (!tbody) return;

        let subgroups = [];
        if (data?.data?.Details) {
            subgroups = Array.isArray(data.data.Details) ? data.data.Details : [];
        } else if (data?.Details) {
            subgroups = Array.isArray(data.Details) ? data.Details : [];
        } else if (Array.isArray(data)) {
            subgroups = data;
        }

        if (subgroups.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No subgroups found for this center.</td></tr>';
            return;
        }

        tbody.innerHTML = subgroups.map(group => {
            const isStaggered = (group.IsStaggered === 'Yes' || group.IsStaggered === true || group.Staggered === true) ? 'Yes' : 'No';
            return `
                <tr>
                    <td>${group.SubGroupID || group.GroupID || ''}</td>
                    <td>${group.SubGroupName || group.GroupName || ''}</td>
                    <td>${group.TotalMembersInSubGroup || group.TotalMembers || '0'}</td>
                    <td>${isStaggered}</td>
                </tr>
            `;
        }).join('');
    };

    const updateTotalMembers = (data) => {
        const totalMembersInput = document.getElementById('TotalMembers');
        if (!totalMembersInput) return;

        let totalMembers = 0;
        if (data?.data?.Details01?.length) {
            totalMembers = parseInt(data.data.Details01[0].TotMembsInGroup || 0, 10);
        } else if (data?.Details01?.length) {
            totalMembers = parseInt(data.Details01[0].TotMembsInGroup || 0, 10);
        } else {
            let subgroups = [];
            if (data?.data?.Details) {
                subgroups = Array.isArray(data.data.Details) ? data.data.Details : [];
            } else if (data?.Details) {
                subgroups = Array.isArray(data.Details) ? data.Details : [];
            }

            subgroups.forEach(group => {
                const members = parseInt(group.TotalMembersInSubGroup || group.TotalMembers || 0, 10);
                totalMembers += members;
            });
        }

        totalMembersInput.value = totalMembers;
    };

    const clearSubGroupsTable = () => {
        const tbody = document.getElementById('groupsTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No records to display.</td></tr>';
        }

        const totalMembersInput = document.getElementById('TotalMembers');
        if (totalMembersInput) {
            totalMembersInput.value = '0';
        }
    };

    const handleView = () => {
        fetchSubGroupDetails();
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
                const iframe = parent.document.querySelector('iframe[data-child-iframe], iframe[src*="Groups"]');
                if (iframe) {
                    iframe.src = 'about:blank';
                    return;
                }
            }

            parent?.postMessage?.({ type: 'kairo-dataentry-close' }, '*');
        } catch (error) {
            console.error('[Groups View] Error closing submodule:', error);
        }
    };

    const initializeGroupsView = () => {
        currentCenterData = getCenterData();

        const viewBtn = document.querySelector('[data-action="view"]');
        if (viewBtn) {
            viewBtn.addEventListener('click', handleView);
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

        if (currentCenterData) {
            fetchSubGroupDetails();
        } else {
            showSnackbar('Please select a center first to view its groups.', 'info');
            clearSubGroupsTable();
        }
    };

    document.addEventListener('DOMContentLoaded', initializeGroupsView);

    window.groupsView = {
        fetchSubGroupDetails,
        getCenterData,
        initializeGroupsView,
        handleView
    };
})();
