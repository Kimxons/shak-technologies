(function () {
    'use strict';

    let currentCenterData = null;

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
        console.log('[CenterMembers] showSnackbar:', type, message);

        let variant = 'info';
        if (type === 'success') variant = 'success';
        else if (type === 'error' || type === 'danger') variant = 'danger';
        else if (type === 'warning') variant = 'warning';

        showSystemToast(message, { title: 'Notice', variant });
    }

    // Show loading overlay
    const showLoading = (show) => {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.hidden = !show;
        }
    };

    // Get center data from parent window
    const getCenterData = () => {
        try {
            // Try to get center data from parent window's center maintenance
            if (window.parent && window.parent.currentCenter) {
                return window.parent.currentCenter;
            }
        } catch (e) {
            console.warn('Could not access parent window center data:', e);
        }
        return null;
    };

    // Fetch schemes for the current center
    const fetchSchemes = async () => {
        const centerData = getCenterData();
        if (!centerData) {
            console.warn('No center data available for scheme dropdown');
            showSnackbar('No center selected. Please select a center first.', 'error');
            return;
        }

        const schemeSelect = document.getElementById('schemeSelect');
        if (!schemeSelect) {
            console.warn('Scheme select element not found');
            return;
        }

        showLoading(true);

        try {
            // Clear existing options except the first one
            schemeSelect.innerHTML = '<option value="">Select a scheme...</option>';

            // Use GroupService to fetch group loan schemes
            const requestData = {
                OurBranchID: centerData.OurBranchID || '0603',
                GroupID: centerData.GroupID || centerData.ID
            };

            console.log('Fetching group loan schemes with request data:', requestData);

            // Check if parent GroupService is available
            if (!window.parent.GroupService) {
                console.error('GroupService not available in parent window');
                schemeSelect.innerHTML = '<option value="">GroupService not loaded</option>';
                showSnackbar('Service not available. Please refresh the page.', 'error');
                showLoading(false);
                return;
            }

            // Use parent window's GroupService
            const result = await window.parent.GroupService.getGroupLoanSchemeCombo(requestData);
            console.log('Group loan scheme combo result:', result);

            showLoading(false);

            if (result.success && result.data) {
                let schemes = Array.isArray(result.data) ? result.data : (result.Details || []);

                if (schemes.length === 0) {
                    schemeSelect.innerHTML = '<option value="">No schemes available</option>';
                    console.log(`No schemes found for group ${requestData.GroupID}`);
                    showSnackbar('No schemes available for this center.', 'info');
                    return;
                }

                // Add schemes to dropdown
                schemes.forEach(scheme => {
                    const option = document.createElement('option');
                    option.value = scheme.LoanSchemeID || scheme.SchemeID || '';
                    option.textContent = `${scheme.LoanSchemeID || scheme.SchemeID || ''} - ${scheme.Description || scheme.SchemeName || ''}`;
                    schemeSelect.appendChild(option);
                });

                // Set default value if available
                if (centerData.DefaultLoanSchemeID) {
                    schemeSelect.value = centerData.DefaultLoanSchemeID;
                }

                console.log(`Loaded ${schemes.length} schemes for group ${requestData.GroupID}`);
                showSnackbar(`Loaded ${schemes.length} schemes.`, 'success');
            } else {
                schemeSelect.innerHTML = '<option value="">Failed to load schemes</option>';
                console.warn('Failed to fetch group loan schemes:', result?.message);
                showSnackbar(result?.message || 'Failed to load schemes.', 'error');
            }
        } catch (error) {
            console.error('Error fetching group loan schemes for dropdown:', error);
            schemeSelect.innerHTML = '<option value="">Error loading schemes</option>';
            showLoading(false);
            showSnackbar('Error loading schemes: ' + error.message, 'error');
        }
    };

    // Handle scheme selection change
    const handleSchemeChange = async (e) => {
        const selectedSchemeId = e.target.value;
        console.log('Scheme selected in dropdown:', selectedSchemeId);

        // Dispatch custom event for other components to listen to
        const event = new CustomEvent('schemeChanged', {
            detail: { schemeId: selectedSchemeId, centerData: currentCenterData }
        });
        window.dispatchEvent(event);

        // Reset view state when scheme changes
        clearMembersTable();
        setButtonStates(false);
    };

    // Fetch group members based on selected scheme
    const fetchGroupMembers = async (schemeId) => {
        const centerData = getCenterData();
        if (!centerData) {
            console.warn('No center data available for fetching members');
            showSnackbar('No center selected. Please select a center first.', 'error');
            return;
        }

        showLoading(true);

        try {
            const requestData = {
                OurBranchID: centerData.OurBranchID || '0603',
                GroupID: centerData.GroupID || centerData.ID,
                LoanSchemeID: schemeId,
                OperatorID: 'CSADM'
            };

            console.log('Fetching group members with request data:', requestData);

            // Check if parent GroupService is available
            if (!window.parent.GroupService) {
                console.error('GroupService not available in parent window');
                showSnackbar('Service not available. Please refresh the page.', 'error');
                showLoading(false);
                return;
            }

            // Use parent window's GroupService
            const result = await window.parent.GroupService.viewGroupMembers(requestData);
            console.log('View group members result:', result);

            showLoading(false);

            if (result.success && result.data) {
                const count = populateMembersTable(result.data);
                showSnackbar(`Loaded ${count} members.`, 'success');
            } else {
                console.warn('Failed to fetch group members:', result?.message);
                showSnackbar(result?.message || 'No members found.', 'info');
                clearMembersTable();
            }
        } catch (error) {
            console.error('Error fetching group members:', error);
            showLoading(false);
            showSnackbar('Error loading members: ' + error.message, 'error');
            clearMembersTable();
        }
    };

    // Populate the members table with data
    const populateMembersTable = (data) => {
        const tbody = document.querySelector('.table tbody');
        if (!tbody) return 0;

        // Extract members array from different possible locations
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

        // Build table rows
        let html = '';
        members.forEach(member => {
            html += `
                <tr>
                    <td>${member.ClientID || ''}</td>
                    <td>${member.ClientName || member.Name || ''}</td>
                    <td>${member.GroupID || ''}</td>
                    <td>${member.GroupName || ''}</td>
                    <td>${member.JoinDate ? new Date(member.JoinDate).toLocaleDateString() : ''}</td>
                    <td>${member.LoanAccountID || member.LoanAcID || ''}</td>
                    <td>${member.LoanBalance || member.LoanOSBalance || '0'}</td>
                    <td>${member.SavingsAccountID || member.SavingsAcID || ''}</td>
                    <td>${member.TotalSavingsBalance || member.SavingsBalance || '0'}</td>
                    <td>${member.CenterLeader || (member.IsLeader ? 'Yes' : 'No')}</td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
        console.log(`Populated ${members.length} members in table`);
        return members.length;
    };

    // Clear the members table
    const clearMembersTable = () => {
        const tbody = document.querySelector('.table tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="10" class="text-start">No records to display.</td></tr>';
        }
    };

    // Set button states
    const setButtonStates = (isViewing) => {
        const viewBtn = document.querySelector('[data-cu-view]');
        const cancelBtn = document.querySelector('[data-cu-cancel]');
        const schemeSelect = document.getElementById('schemeSelect');

        if (viewBtn) viewBtn.disabled = isViewing;
        if (cancelBtn) cancelBtn.disabled = !isViewing;
        if (schemeSelect) schemeSelect.disabled = isViewing;
    };

    // Handle View button click
    const handleViewClick = async () => {
        const schemeSelect = document.getElementById('schemeSelect');
        const selectedSchemeId = schemeSelect?.value;

        if (!selectedSchemeId) {
            console.warn('Please select a scheme first');
            showSnackbar('Please select a scheme first.', 'warning');
            return;
        }

        await fetchGroupMembers(selectedSchemeId);
        setButtonStates(true);
    };

    // Handle Cancel button click
    const handleCancelClick = () => {
        clearMembersTable();
        setButtonStates(false);
    };

    // Initialize the scheme dropdown
    const initializeSchemeDropdown = () => {
        currentCenterData = getCenterData();
        console.log('Scheme dropdown initialized with center data:', currentCenterData);

        // Fetch schemes when component loads
        fetchSchemes().then(() => {
            // Auto-fetch members if default scheme is set
            const schemeSelect = document.getElementById('schemeSelect');
            if (schemeSelect && schemeSelect.value) {
                fetchGroupMembers(schemeSelect.value);
                setButtonStates(true);
            } else {
                setButtonStates(false);
            }
        });

        // Add change event listener
        const schemeSelect = document.getElementById('schemeSelect');
        if (schemeSelect) {
            schemeSelect.addEventListener('change', handleSchemeChange);
        }

        // Add button event listeners
        const viewBtn = document.querySelector('[data-cu-view]');
        const cancelBtn = document.querySelector('[data-cu-cancel]');

        if (viewBtn) {
            viewBtn.addEventListener('click', handleViewClick);
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', handleCancelClick);
        }

        // Initialize button states
        setButtonStates(false);
    };

    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', initializeSchemeDropdown);

    // Expose functions for external use if needed
    window.centerMembersSchemeDropdown = {
        fetchSchemes,
        getCenterData,
        initializeSchemeDropdown,
        fetchGroupMembers
    };

})();