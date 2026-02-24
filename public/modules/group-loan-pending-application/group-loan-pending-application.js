// Group Loan Pending Application Module JavaScript

(function() {
    'use strict';

    // DOM Elements
    const form = document.getElementById('groupLoanPendingForm');
    const statusMessage = document.getElementById('statusMessage');
    const applicationTableBody = document.getElementById('applicationTableBody');
    const statusReasonsTableBody = document.getElementById('statusReasonsTableBody');

    // Form fields
    const branchIdField = document.getElementById('branchId');
    const centerIdField = document.getElementById('centerId');
    const groupIdField = document.getElementById('groupId');
    const schemeIdField = document.getElementById('schemeId');

    // Initialize the module
    function init() {
        setupEventListeners();
        loadInitialData();
    }

    // Setup Event Listeners
    function setupEventListeners() {
        // Search buttons
        document.querySelectorAll('[data-action="search-branch"]').forEach(btn => {
            btn.addEventListener('click', () => searchBranch());
        });

        document.querySelectorAll('[data-action="search-center"]').forEach(btn => {
            btn.addEventListener('click', () => searchCenter());
        });

        document.querySelectorAll('[data-action="search-group"]').forEach(btn => {
            btn.addEventListener('click', () => searchGroup());
        });

        document.querySelectorAll('[data-action="search-scheme"]').forEach(btn => {
            btn.addEventListener('click', () => searchScheme());
        });

        // View button
        document.querySelectorAll('[data-action="view"]').forEach(btn => {
            btn.addEventListener('click', () => viewApplications());
        });

        // Status message close button
        const statusClose = statusMessage.querySelector('.status-close');
        if (statusClose) {
            statusClose.addEventListener('click', hideStatus);
        }

        // Field change events
        centerIdField.addEventListener('change', () => loadApplications());
        groupIdField.addEventListener('change', () => loadApplications());
        schemeIdField.addEventListener('change', () => loadApplications());
    }

    // Load initial data
    function loadInitialData() {
        // Set default branch if not already set
        if (!branchIdField.value) {
            branchIdField.value = '0101';
            document.getElementById('branchDescription').value = 'Head Office';
        }
    }

    // Search Functions
    function searchBranch() {
        showStatus('info', 'Branch search functionality to be implemented');
        // TODO: Implement branch search dialog
    }

    function searchCenter() {
        showStatus('info', 'Center search functionality to be implemented');
        // TODO: Implement center search dialog
    }

    function searchGroup() {
        showStatus('info', 'Group search functionality to be implemented');
        // TODO: Implement group search dialog
    }

    function searchScheme() {
        showStatus('info', 'Scheme search functionality to be implemented');
        // TODO: Implement scheme search dialog
    }

    // View Applications
    function viewApplications() {
        const branchId = branchIdField.value;
        const centerId = centerIdField.value;
        const groupId = groupIdField.value;
        const schemeId = schemeIdField.value;

        if (!branchId) {
            showStatus('error', 'Please enter Branch ID');
            return;
        }

        if (!centerId && !groupId && !schemeId) {
            showStatus('warning', 'Please enter at least one search criteria (Center ID, Group ID, or Scheme ID)');
            return;
        }

        loadApplications();
    }

    // Load Applications
    function loadApplications() {
        // Clear existing data
        clearTable(applicationTableBody);
        clearTable(statusReasonsTableBody);

        // TODO: Replace with actual API call
        // Simulating API call
        setTimeout(() => {
            // Demo data - replace with actual API response
            const demoApplications = [];
            const demoStatusReasons = [];

            if (demoApplications.length > 0) {
                populateApplicationsTable(demoApplications);
            } else {
                showEmptyState(applicationTableBody, 8);
            }

            if (demoStatusReasons.length > 0) {
                populateStatusReasonsTable(demoStatusReasons);
            } else {
                showEmptyState(statusReasonsTableBody, 4);
            }

            showStatus('info', 'No pending applications found');
        }, 500);
    }

    // Populate Applications Table
    function populateApplicationsTable(applications) {
        clearTable(applicationTableBody);

        applications.forEach(app => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${escapeHtml(app.clientId)}</td>
                <td>${escapeHtml(app.clientName)}</td>
                <td>${escapeHtml(app.applicationId)}</td>
                <td>${formatDate(app.applicationDate)}</td>
                <td class="text-right">${formatCurrency(app.loanAmount)}</td>
                <td>${escapeHtml(app.loanTerm)}</td>
                <td>${escapeHtml(app.loanPeriod)}</td>
                <td>${escapeHtml(app.applicationStatus)}</td>
            `;
            applicationTableBody.appendChild(row);
        });
    }

    // Populate Status Reasons Table
    function populateStatusReasonsTable(reasons) {
        clearTable(statusReasonsTableBody);

        reasons.forEach(reason => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${escapeHtml(reason.ruleName)}</td>
                <td>${escapeHtml(reason.ruleType)}</td>
                <td>${reason.isPassed ? 'Yes' : 'No'}</td>
                <td>${escapeHtml(reason.remarks)}</td>
            `;
            statusReasonsTableBody.appendChild(row);
        });
    }

    // Clear Table
    function clearTable(tbody) {
        while (tbody.firstChild) {
            tbody.removeChild(tbody.firstChild);
        }
    }

    // Show Empty State
    function showEmptyState(tbody, colspan) {
        const row = document.createElement('tr');
        row.className = 'empty-state';
        row.innerHTML = `<td colspan="${colspan}">No records to display.</td>`;
        tbody.appendChild(row);
    }

    // Status Message Functions
    function showStatus(type, message) {
        const icon = statusMessage.querySelector('.bi');
        const text = statusMessage.querySelector('.status-text');

        // Remove existing type classes
        statusMessage.classList.remove('success', 'error', 'warning', 'info', 'hidden');

        // Set icon based on type
        icon.className = 'bi';
        switch(type) {
            case 'success':
                icon.classList.add('bi-check-circle-fill');
                break;
            case 'error':
                icon.classList.add('bi-exclamation-circle-fill');
                break;
            case 'warning':
                icon.classList.add('bi-exclamation-triangle-fill');
                break;
            case 'info':
                icon.classList.add('bi-info-circle-fill');
                break;
        }

        // Set message and show
        text.textContent = message;
        statusMessage.classList.add(type);

        // Auto-hide after 5 seconds
        setTimeout(hideStatus, 5000);
    }

    function hideStatus() {
        statusMessage.classList.add('hidden');
    }

    // Utility Functions
    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB');
    }

    function formatCurrency(amount) {
        if (amount === null || amount === undefined) return '';
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
