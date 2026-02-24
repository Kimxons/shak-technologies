/**
 * Overdraft Disbursement Module
 * Based on Overdraft Application theme
 * Handles disbursement entry, application details, client details, and behind-the-scene operations
 */

class OverdraftDisbursementManager {
    constructor() {
        this.currentMode = 'view';
        this.isDirty = false;
        this.currentData = {};
        this.searchTimeout = null;
        this.currentSection = 'disbursement';
        
        this.init();
    }

    init() {
        this.setupSectionNavigation();
        this.setupEventListeners();
        this.initializeForm();
        this.setupSearchFunctionality();
        this.setupFormValidation();
    }

    setupSectionNavigation() {
        // Sidebar navigation items
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const section = item.getAttribute('data-section');
                this.switchSection(section);
                
                // Update active state
                navItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            });
        });

        // Sidebar toggle functionality
        const navToggle = document.querySelector('.nav-toggle');
        if (navToggle) {
            navToggle.addEventListener('click', () => {
                const navItems = navToggle.closest('.nav-section').querySelector('.nav-items');
                const chevron = navToggle.querySelector('.nav-chevron');
                navItems?.classList.toggle('is-collapsed');
                chevron?.classList.toggle('bi-chevron-down');
                chevron?.classList.toggle('bi-chevron-right');
            });
        }
    }

    switchSection(section) {
        // Hide all sections
        const sections = document.querySelectorAll('.form-section');
        sections.forEach(s => s.classList.remove('active'));

        // Show selected section
        const selectedSection = document.querySelector(`[data-section="${section}"]`);
        if (selectedSection) {
            selectedSection.classList.add('active');
            this.currentSection = section;
        }
    }

    setupEventListeners() {
        // Action button listeners
        document.getElementById('viewBtn')?.addEventListener('click', () => this.handleView());
        document.getElementById('editBtn')?.addEventListener('click', () => this.handleEdit());
        document.getElementById('deleteBtn')?.addEventListener('click', () => this.handleDelete());
        document.getElementById('reverseBtn')?.addEventListener('click', () => this.handleReverse());
        document.getElementById('addBtn')?.addEventListener('click', () => this.handleAdd());
        document.getElementById('disburseBtn')?.addEventListener('click', () => this.handleDisburse());
        document.getElementById('cancelBtn')?.addEventListener('click', () => this.handleCancel());

        // Form change listeners
        this.setupFormChangeListeners();
        
        // Search functionality
        this.setupSearchListeners();

        // Window unload protection
        window.addEventListener('beforeunload', (e) => {
            if (this.isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    setupFormChangeListeners() {
        const formElements = document.querySelectorAll('input, select, textarea');
        formElements.forEach(element => {
            element.addEventListener('change', () => {
                this.setDirty(true);
                this.validateField(element);
                this.calculateAmounts();
            });
            
            element.addEventListener('input', () => {
                if (element.type !== 'search') {
                    this.setDirty(true);
                }
            });
        });
    }

    setupSearchListeners() {
        // Branch ID search
        document.getElementById('branchSearch')?.addEventListener('click', () => {
            this.openLookupModal('branch', 'branchId');
        });

        // Account ID search
        document.getElementById('accountSearch')?.addEventListener('click', () => {
            this.openLookupModal('account', 'accountId');
        });

        // Application ID search
        document.getElementById('applicationSearch')?.addEventListener('click', () => {
            this.openLookupModal('application', 'applicationId');
        });
    }

    initializeForm() {
        // Set default values
        const now = new Date();
        document.getElementById('applicationDate').value = now.toISOString().split('T')[0];
        
        // Set branch ID from session if available
        const currentBranch = this.getCurrentBranch();
        if (currentBranch) {
            document.getElementById('branchId').value = currentBranch;
        }

        this.setMode('view');
    }

    setupSearchFunctionality() {
        // Implement search functionality for lookups
        this.searchHandlers = {
            branch: this.searchBranches.bind(this),
            account: this.searchAccounts.bind(this),
            application: this.searchApplications.bind(this)
        };
    }

    setupFormValidation() {
        this.validationRules = {
            branchId: { required: true, minLength: 4 },
            accountId: { required: true },
            applicationId: { required: true },
            disbursementAmount: { required: true, type: 'number', min: 0 },
            applicationDate: { required: true, type: 'date' }
        };
    }

    // Action handlers
    handleView() {
        this.setMode('view');
        this.loadDisbursementData();
    }

    handleEdit() {
        if (!this.validateRequiredFields(['applicationId'])) {
            this.showError('Please select a disbursement to edit.');
            return;
        }

        this.setMode('edit');
        this.showSuccess('Edit mode enabled. Make changes and save.');
    }

    handleDelete() {
        if (!this.validateRequiredFields(['applicationId'])) {
            this.showError('Please select a disbursement to delete.');
            return;
        }

        if (confirm('Are you sure you want to delete this disbursement record? This action cannot be undone.')) {
            this.deleteDisbursement();
        }
    }

    handleReverse() {
        if (!this.validateRequiredFields(['applicationId'])) {
            this.showError('Please select an application to reverse.');
            return;
        }

        if (confirm('Are you sure you want to reverse this overdraft disbursement?')) {
            this.reverseDisbursement();
        }
    }

    handleAdd() {
        this.setMode('add');
        this.clearForm();
        this.setDefaults();
    }

    handleDisburse() {
        if (!this.validateForm()) {
            return;
        }

        if (confirm('Are you sure you want to disburse this overdraft?')) {
            this.disburseDraft();
        }
    }

    handleCancel() {
        if (this.isDirty) {
            if (!confirm('You have unsaved changes. Do you want to cancel?')) {
                return;
            }
        }

        this.setMode('view');
        this.clearForm();
        this.setDirty(false);
    }

    // Core operations
    async loadDisbursementData() {
        const applicationId = document.getElementById('applicationId').value;
        
        if (!applicationId) {
            this.showError('Please enter an Application ID');
            return;
        }

        try {
            this.showLoader(true);
            
            // Simulate API call
            const response = await this.apiCall('GET', `/api/overdraft-disbursement/${applicationId}`);
            
            if (response.success) {
                this.populateForm(response.data);
                this.showSuccess('Disbursement data loaded successfully');
            } else {
                this.showError(response.message || 'Failed to load disbursement data');
            }
        } catch (error) {
            this.showError('Error loading disbursement data: ' + error.message);
        } finally {
            this.showLoader(false);
        }
    }

    async reverseDisbursement() {
        const applicationId = document.getElementById('applicationId').value;
        
        try {
            this.showLoader(true);
            
            const response = await this.apiCall('POST', '/api/overdraft-disbursement/reverse', {
                applicationId: applicationId,
                reason: prompt('Please enter reason for reversal:') || 'Manual reversal'
            });

            if (response.success) {
                this.showSuccess('Overdraft disbursement reversed successfully');
                this.loadDisbursementData();
            } else {
                this.showError(response.message || 'Failed to reverse disbursement');
            }
        } catch (error) {
            this.showError('Error reversing disbursement: ' + error.message);
        } finally {
            this.showLoader(false);
        }
    }

    async deleteDisbursement() {
        const applicationId = document.getElementById('applicationId').value;
        
        try {
            this.showLoader(true);
            
            const response = await this.apiCall('DELETE', `/api/overdraft-disbursement/${applicationId}`);

            if (response.success) {
                this.showSuccess('Overdraft disbursement deleted successfully');
                this.clearForm();
                this.setMode('view');
                this.setDirty(false);
            } else {
                this.showError(response.message || 'Failed to delete disbursement');
            }
        } catch (error) {
            this.showError('Error deleting disbursement: ' + error.message);
        } finally {
            this.showLoader(false);
        }
    }

    async disburseDraft() {
        const formData = this.collectFormData();
        
        try {
            this.showLoader(true);
            
            const response = await this.apiCall('POST', '/api/overdraft-disbursement/disburse', formData);

            if (response.success) {
                this.showSuccess('Overdraft disbursed successfully');
                this.populateForm(response.data);
                this.setMode('view');
                this.setDirty(false);
            } else {
                this.showError(response.message || 'Failed to disburse overdraft');
            }
        } catch (error) {
            this.showError('Error disbursing overdraft: ' + error.message);
        } finally {
            this.showLoader(false);
        }
    }

    // Form operations
    collectFormData() {
        return {
            branchId: document.getElementById('branchId').value,
            accountId: document.getElementById('accountId').value,
            applicationId: document.getElementById('applicationId').value,
            clientId: document.getElementById('clientId').value,
            product: document.getElementById('product').value,
            creditOfficer: document.getElementById('creditOfficer').value,
            contraBranchId: document.getElementById('contraBranchId').value,
            accountType: document.getElementById('accountType').value,
            contraAccountId: document.getElementById('contraAccountId').value,
            mainRepaymentAccountId: document.getElementById('mainRepaymentAccountId').value,
            disbursementAmount: parseFloat(document.getElementById('disbursementAmount').value) || 0,
            applicationDate: document.getElementById('applicationDate').value,
            reviewDate: document.getElementById('reviewDate').value,
            expiryDate: document.getElementById('expiryDate').value,
            status: document.getElementById('status').value,
            fileId: document.getElementById('fileId').value,
            remarks: document.getElementById('remarks').value,
            limitId: document.getElementById('limitId').value,
            sanctionedAmount: parseFloat(document.getElementById('sanctionedAmount').value) || 0,
            limitExpiryDate: document.getElementById('limitExpiryDate').value,
            limitAmount: parseFloat(document.getElementById('limitAmount').value) || 0,
            totalOdAmount: parseFloat(document.getElementById('totalOdAmount').value) || 0,
            totalTodAmount: parseFloat(document.getElementById('totalTodAmount').value) || 0
        };
    }

    populateForm(data) {
        Object.keys(data).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                element.value = data[key] || '';
            }
        });

        // Set audit fields
        document.getElementById('createdBy').value = data.createdBy || '';
        document.getElementById('modifiedBy').value = data.modifiedBy || '';
        document.getElementById('supervisedBy').value = data.supervisedBy || '';
        document.getElementById('createdOn').value = data.createdOn ? new Date(data.createdOn).toLocaleString() : '';
        document.getElementById('modifiedOn').value = data.modifiedOn ? new Date(data.modifiedOn).toLocaleString() : '';
        document.getElementById('supervisedOn').value = data.supervisedOn ? new Date(data.supervisedOn).toLocaleString() : '';

        this.setDirty(false);
    }

    clearForm() {
        const formElements = document.querySelectorAll('input, select, textarea');
        formElements.forEach(element => {
            if (element.type === 'checkbox') {
                element.checked = false;
            } else {
                element.value = '';
            }
        });
    }

    setDefaults() {
        const now = new Date();
        document.getElementById('applicationDate').value = now.toISOString().split('T')[0];
        document.getElementById('status').value = 'PENDING';
        
        const currentBranch = this.getCurrentBranch();
        if (currentBranch) {
            document.getElementById('branchId').value = currentBranch;
        }
    }

    // Validation
    validateForm() {
        const errors = [];
        
        Object.keys(this.validationRules).forEach(fieldId => {
            const field = document.getElementById(fieldId);
            const rule = this.validationRules[fieldId];
            
            if (!this.validateField(field, rule)) {
                errors.push(`${fieldId} is invalid`);
            }
        });

        if (errors.length > 0) {
            this.showError('Please fix the following errors:\n' + errors.join('\n'));
            return false;
        }

        return true;
    }

    validateField(field, rule = null) {
        if (!field) return true;
        
        const fieldRule = rule || this.validationRules[field.id];
        if (!fieldRule) return true;

        const value = field.value.trim();
        
        // Required validation
        if (fieldRule.required && !value) {
            this.setFieldError(field, 'This field is required');
            return false;
        }

        // Type validation
        if (value && fieldRule.type) {
            if (fieldRule.type === 'number' && isNaN(value)) {
                this.setFieldError(field, 'Must be a valid number');
                return false;
            }
            
            if (fieldRule.type === 'date' && !Date.parse(value)) {
                this.setFieldError(field, 'Must be a valid date');
                return false;
            }
        }

        // Min/Max validation
        if (value && fieldRule.min !== undefined) {
            const numValue = parseFloat(value);
            if (numValue < fieldRule.min) {
                this.setFieldError(field, `Must be at least ${fieldRule.min}`);
                return false;
            }
        }

        // Length validation
        if (value && fieldRule.minLength && value.length < fieldRule.minLength) {
            this.setFieldError(field, `Must be at least ${fieldRule.minLength} characters`);
            return false;
        }

        this.clearFieldError(field);
        return true;
    }

    validateRequiredFields(fieldIds) {
        return fieldIds.every(fieldId => {
            const field = document.getElementById(fieldId);
            return field && field.value.trim();
        });
    }

    setFieldError(field, message) {
        field.classList.add('is-invalid');
        
        // Remove existing error
        const existingError = field.parentNode.querySelector('.invalid-feedback');
        if (existingError) {
            existingError.remove();
        }

        // Add error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'invalid-feedback';
        errorDiv.textContent = message;
        field.parentNode.appendChild(errorDiv);
    }

    clearFieldError(field) {
        field.classList.remove('is-invalid');
        const errorDiv = field.parentNode.querySelector('.invalid-feedback');
        if (errorDiv) {
            errorDiv.remove();
        }
    }

    // Lookup operations
    openLookupModal(type, targetFieldId) {
        // Implementation for lookup modal
        console.log(`Opening ${type} lookup for ${targetFieldId}`);
    }

    async searchBranches(query) {
        // Implementation for branch search
        return [];
    }

    async searchAccounts(query) {
        // Implementation for account search
        return [];
    }

    async searchApplications(query) {
        // Implementation for application search
        return [];
    }

    // Calculations
    calculateAmounts() {
        const sanctionedAmount = parseFloat(document.getElementById('sanctionedAmount').value) || 0;
        const disbursementAmount = parseFloat(document.getElementById('disbursementAmount').value) || 0;
        const limitAmount = parseFloat(document.getElementById('limitAmount').value) || 0;

        // Update calculated fields as needed
        // Add specific business logic for amount calculations
    }

    // Utility methods
    setMode(mode) {
        this.currentMode = mode;
        
        const formElements = document.querySelectorAll('input:not([readonly]), select, textarea');
        const actionButtons = document.querySelectorAll('.action-btn');
        
        switch (mode) {
            case 'view':
                formElements.forEach(el => el.disabled = true);
                this.enableButton('viewBtn');
                this.enableButton('reverseBtn');
                this.enableButton('addBtn');
                this.disableButton('disburseBtn');
                this.disableButton('cancelBtn');
                break;
                
            case 'add':
                formElements.forEach(el => el.disabled = false);
                this.disableButton('viewBtn');
                this.disableButton('reverseBtn');
                this.disableButton('addBtn');
                this.enableButton('disburseBtn');
                this.enableButton('cancelBtn');
                break;
        }
    }

    setDirty(dirty) {
        this.isDirty = dirty;
        
        if (dirty) {
            document.title = '• Overdraft Disbursement';
        } else {
            document.title = 'Overdraft Disbursement';
        }
    }

    enableButton(buttonId) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.disabled = false;
            button.classList.remove('disabled');
        }
    }

    disableButton(buttonId) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.disabled = true;
            button.classList.add('disabled');
        }
    }

    // API operations
    async apiCall(method, url, data = null) {
        // Simulate API calls for now
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    data: data || {},
                    message: 'Operation completed successfully'
                });
            }, 500);
        });
    }

    // UI feedback
    showLoader(show) {
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.display = show ? 'flex' : 'none';
        }
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info') {
        // Simple toast implementation
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem;
            border-radius: 0.375rem;
            color: white;
            z-index: 9999;
            max-width: 300px;
            background: ${type === 'success' ? '#059669' : type === 'error' ? '#dc2626' : '#3b82f6'};
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    getCurrentBranch() {
        // Return current user's branch from session
        return '2305'; // Default for demo
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.disbursementManager = new OverdraftDisbursementManager();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OverdraftDisbursementManager;
}