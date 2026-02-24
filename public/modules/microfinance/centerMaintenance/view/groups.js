(function () {
    'use strict';

    let currentCenterData = null;

    // Show loading overlay
    const showLoading = (show) => {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.hidden = !show;
        }
    };

    // ---------------------------------------------------------------------------
    // Toast helpers (aligned with Center Maintenance system)
    // ---------------------------------------------------------------------------

    function ensureToastContainer() {
        // Prefer a shared Kairo toast container if it already exists
        let el = document.querySelector('[data-kairo-toast-container]');
        if (el) return el;

        // Otherwise create one (same pattern as center-maintenance-new.js)
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
        // Limit to one toast at a time for system-level messages
        const container = ensureToastContainer();
        const existingToasts = container.querySelectorAll('.kairo-toast');
        existingToasts.forEach(t => t.remove());

        showToast(message, { title, variant, timeoutMs });
    }

    // Backwards-compatible helper
    function showSnackbar(message, type = 'info') {
        console.log('[Groups] showSnackbar:', type, message);

        let variant = 'info';
        if (type === 'success') variant = 'success';
        else if (type === 'error' || type === 'danger') variant = 'danger';
        else if (type === 'warning') variant = 'warning';

        showSystemToast(message, { title: 'Notice', variant });
    }

    // Get center data from parent window
    const getCenterData = () => {
        try {
            // Try to get center data from parent window's center maintenance
            if (window.parent && window.parent.currentCenter) {
                console.log('[Groups] Got center data from parent:', window.parent.currentCenter);
                return window.parent.currentCenter;
            }
            console.warn('[Groups] No currentCenter found in parent window');
        } catch (e) {
            console.warn('[Groups] Could not access parent window center data:', e);
        }
        return null;
    };

    // Fetch subgroup details for the current center
    const fetchSubGroupDetails = async () => {
        const centerData = getCenterData();
        if (!centerData) {
            console.warn('[Groups] No center data available for fetching subgroups');
            showSnackbar('No center selected. Please select a center first.', 'error');
            clearSubGroupsTable();
            return;
        }

        // Extract the required fields
        const branchId = centerData.OurBranchID || '';
        const groupId = centerData.GroupID || '';

        if (!branchId || !groupId) {
            console.warn('[Groups] Missing required parameters - BranchID:', branchId, 'GroupID:', groupId);
            showSnackbar('Missing center information. Please reload the center.', 'error');
            clearSubGroupsTable();
            return;
        }

        showLoading(true);

        try {
            const requestData = {
                OurBranchID: branchId,
                GroupID: groupId,
                OperatorID: 'CSADM'
            };

            console.log('[Groups] Fetching subgroup details with request:', requestData);

            // Check if parent GroupService is available
            if (!window.parent.GroupService) {
                // Try loading via ServiceLoader
                if (window.parent.ServiceLoader) {
                    await window.parent.ServiceLoader.loadGroupService();
                }
            }

            if (!window.parent.GroupService) {
                console.error('[Groups] GroupService not available in parent window');
                showSnackbar('Service not available. Please refresh the page.', 'error');
                showLoading(false);
                return;
            }

            // Use parent window's GroupService
            const result = await window.parent.GroupService.getSubGroupDetails(requestData);
            console.log('[Groups] Get subgroup details result:', result);

            showLoading(false);

            if (result.success && result.data) {
                populateSubGroupsTable(result.data);
                updateTotalMembers(result.data);
                showSnackbar(`Loaded subgroups for center: ${groupId}`, 'success');
            } else {
                console.warn('[Groups] Failed to fetch subgroup details:', result?.message);
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

    // Populate the subgroups table with data
    const populateSubGroupsTable = (data) => {
        const tbody = document.querySelector('.table tbody');
        if (!tbody) return;

        // Extract subgroups array from different possible locations
        let subgroups = [];
        if (data.data && data.data.Details) {
            subgroups = Array.isArray(data.data.Details) ? data.data.Details : [];
        } else if (data.Details) {
            subgroups = Array.isArray(data.Details) ? data.Details : [];
        } else if (Array.isArray(data)) {
            subgroups = data;
        }

        console.log('[Groups] Extracted subgroups:', subgroups.length);

        if (subgroups.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No subgroups found for this center.</td></tr>';
            return;
        }

        // Build table rows
        let html = '';
        subgroups.forEach((group, index) => {
            html += `
                <tr>
                    <td>${group.SubGroupID || group.GroupID || ''}</td>
                    <td>${group.SubGroupName || group.GroupName || ''}</td>
                    <td>${group.TotalMembersInSubGroup || group.TotalMembers || '0'}</td>
                    <td>${group.IsStaggered || group.Staggered ? 'Yes' : 'No'}</td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
        console.log(`[Groups] Populated ${subgroups.length} subgroups in table`);
    };

    // Update total members count
    const updateTotalMembers = (data) => {
        const totalMembersInput = document.getElementById('TotalMembers');
        if (!totalMembersInput) return;

        let totalMembers = 0;
        
        // Check for TotMembsInGroup in Details01
        if (data.data && data.data.Details01 && Array.isArray(data.data.Details01) && data.data.Details01.length > 0) {
            totalMembers = parseInt(data.data.Details01[0].TotMembsInGroup || 0);
        } else if (data.Details01 && Array.isArray(data.Details01) && data.Details01.length > 0) {
            totalMembers = parseInt(data.Details01[0].TotMembsInGroup || 0);
        } else {
            // Fallback: Try to calculate total from subgroups
            let subgroups = [];
            if (data.data && data.data.Details) {
                subgroups = Array.isArray(data.data.Details) ? data.data.Details : [];
            } else if (data.Details) {
                subgroups = Array.isArray(data.Details) ? data.Details : [];
            }

            // Sum up all members from subgroups
            subgroups.forEach(group => {
                const members = parseInt(group.TotalMembersInSubGroup || group.TotalMembers || 0);
                totalMembers += members;
            });
        }

        totalMembersInput.value = totalMembers;
        console.log(`[Groups] Total members in group: ${totalMembers}`);
    };

    // Clear the subgroups table
    const clearSubGroupsTable = () => {
        const tbody = document.querySelector('.table tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No records to display.</td></tr>';
        }
        
        const totalMembersInput = document.getElementById('TotalMembers');
        if (totalMembersInput) {
            totalMembersInput.value = '0';
        }
    };

    // Handle View button click - refresh data
    const handleView = () => {
        fetchSubGroupDetails();
    };

    // Initialize the groups view
    const initializeGroupsView = () => {
        currentCenterData = getCenterData();
        console.log('[Groups] View initialized with center data:', currentCenterData);

        // Set up View button handler
        const viewBtn = document.querySelector('[data-action="view"]');
        if (viewBtn) {
            viewBtn.addEventListener('click', handleView);
        }

        // Fetch subgroup details when component loads
        if (currentCenterData) {
            fetchSubGroupDetails();
        } else {
            console.warn('[Groups] No center data available to fetch subgroups');
            showSnackbar('Please select a center first to view its groups.', 'info');
            clearSubGroupsTable();
        }
    };

    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', initializeGroupsView);

    // Expose functions for external use if needed
    window.groupsView = {
        fetchSubGroupDetails,
        getCenterData,
        initializeGroupsView,
        handleView
    };

})();
