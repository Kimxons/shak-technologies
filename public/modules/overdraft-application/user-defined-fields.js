/**
 * User Defined Fields - Overdraft Application
 * Manages custom field configuration and data entry
 */

(function() {
    'use strict';

    // State management
    const state = {
        fields: [],
        currentField: null,
        isEditing: false
    };

    // DOM Elements
    let elements = {};

    /**
     * Initialize the application
     */
    function init() {
        cacheDOM();
        bindEvents();
        loadSampleData();
    }

    /**
     * Cache DOM elements
     */
    function cacheDOM() {
        elements = {
            form: document.getElementById('userDefinedFieldsForm'),
            statusMessage: document.getElementById('statusMessage'),
            statusText: document.querySelector('.status-text'),
            statusClose: document.querySelector('.status-close'),
            udfFieldsContainer: document.getElementById('udfFieldsContainer'),
            emptyState: document.querySelector('.empty-state'),
            
            // Action buttons
            viewBtn: document.querySelector('[data-action="view-udf"]'),
            addBtn: document.querySelector('[data-action="add-udf"]'),
            editBtn: document.querySelector('[data-action="edit-udf"]'),
            deleteBtn: document.querySelector('[data-action="delete-udf"]'),
            saveBtn: document.querySelector('[data-action="save-udf"]'),
            cancelBtn: document.querySelector('[data-action="cancel-udf"]'),

            // Navigation
            navItems: document.querySelectorAll('.nav-item'),

            // Window controls
            minimizeBtn: document.querySelector('.window-control-btn.minimize'),
            closeBtn: document.querySelector('.window-control-btn.close')
        };
    }

    /**
     * Bind event listeners
     */
    function bindEvents() {
        // Action buttons
        if (elements.viewBtn) elements.viewBtn.addEventListener('click', handleView);
        if (elements.addBtn) elements.addBtn.addEventListener('click', handleAdd);
        if (elements.editBtn) elements.editBtn.addEventListener('click', handleEdit);
        if (elements.deleteBtn) elements.deleteBtn.addEventListener('click', handleDelete);
        if (elements.saveBtn) elements.saveBtn.addEventListener('click', handleSave);
        if (elements.cancelBtn) elements.cancelBtn.addEventListener('click', handleCancel);

        // Window controls
        if (elements.minimizeBtn) elements.minimizeBtn.addEventListener('click', handleMinimize);
        if (elements.closeBtn) elements.closeBtn.addEventListener('click', handleClose);

        // Status message close
        if (elements.statusClose) {
            elements.statusClose.addEventListener('click', hideStatusMessage);
        }

        // Navigation items
        elements.navItems.forEach(item => {
            item.addEventListener('click', handleNavigation);
        });

        // Form submission
        if (elements.form) {
            elements.form.addEventListener('submit', (e) => {
                e.preventDefault();
                handleSave();
            });
        }
    }

    /**
     * Handle navigation between sections
     */
    function handleNavigation(e) {
        const section = e.currentTarget.dataset.section;
        
        // Update active state
        elements.navItems.forEach(item => item.classList.remove('active'));
        e.currentTarget.classList.add('active');

        // Navigate to section (in a full implementation)
        console.log(`Navigating to: ${section}`);
        
        // For demo purposes, show message
        if (section !== 'user-defined-fields') {
            showStatusMessage(`Navigation to ${section} would occur in full implementation`, 'info');
        }
    }

    /**
     * Handle window minimize
     */
    function handleMinimize() {
        showStatusMessage('Window minimize functionality', 'info');
        console.log('Minimize window');
    }

    /**
     * Handle window close
     */
    function handleClose() {
        if (state.isEditing && confirm('You have unsaved changes. Close anyway?')) {
            console.log('Close window');
            showStatusMessage('Window close functionality', 'info');
        } else if (!state.isEditing) {
            console.log('Close window');
            showStatusMessage('Window close functionality', 'info');
        }
    }

    /**
     * Handle View action
     */
    function handleView() {
        if (state.fields.length === 0) {
            showStatusMessage('No fields available to view', 'info');
            return;
        }

        state.isEditing = false;
        setFormReadonly(true);
        showStatusMessage('Viewing user defined fields in read-only mode', 'info');
    }

    /**
     * Handle Add action
     */
    function handleAdd() {
        state.isEditing = true;
        state.currentField = null;
        
        // Show the fields container and hide empty state
        if (elements.emptyState) elements.emptyState.style.display = 'none';
        if (elements.udfFieldsContainer) {
            elements.udfFieldsContainer.classList.remove('hidden');
        }

        // Clear form
        clearForm();
        setFormReadonly(false);
        
        // Add sample fields for demonstration
        renderSampleFields();
        
        showStatusMessage('Add mode enabled. Fill in the fields and click Save', 'success');
    }

    /**
     * Handle Edit action
     */
    function handleEdit() {
        if (state.fields.length === 0) {
            showStatusMessage('No fields available to edit. Click Add to create fields', 'info');
            return;
        }

        state.isEditing = true;
        setFormReadonly(false);
        showStatusMessage('Edit mode enabled. Modify fields and click Save', 'success');
    }

    /**
     * Handle Delete action
     */
    function handleDelete() {
        if (state.fields.length === 0) {
            showStatusMessage('No fields available to delete', 'info');
            return;
        }

        if (confirm('Are you sure you want to delete all user defined fields?')) {
            state.fields = [];
            state.currentField = null;
            
            // Show empty state
            if (elements.emptyState) elements.emptyState.style.display = 'block';
            if (elements.udfFieldsContainer) {
                elements.udfFieldsContainer.classList.add('hidden');
                elements.udfFieldsContainer.innerHTML = '';
            }
            
            showStatusMessage('User defined fields deleted successfully', 'success');
        }
    }

    /**
     * Handle Save action
     */
    function handleSave() {
        if (!state.isEditing) {
            showStatusMessage('Click Add or Edit to make changes', 'info');
            return;
        }

        // Validate form
        if (!validateForm()) {
            showStatusMessage('Please fill in all required fields', 'error');
            return;
        }

        // Collect form data
        const formData = collectFormData();
        
        // Save to state
        if (state.currentField) {
            // Update existing field
            const index = state.fields.findIndex(f => f.id === state.currentField.id);
            if (index !== -1) {
                state.fields[index] = { ...state.currentField, ...formData };
            }
        } else {
            // Add new field
            state.fields.push({
                id: Date.now(),
                ...formData,
                status: 'Active'
            });
        }

        // Update UI
        setFormReadonly(true);
        state.isEditing = false;
        
        showStatusMessage('User defined fields saved successfully', 'success');
    }

    /**
     * Handle Cancel action
     */
    function handleCancel() {
        if (state.isEditing && confirm('Discard unsaved changes?')) {
            state.isEditing = false;
            state.currentField = null;
            
            if (state.fields.length === 0) {
                if (elements.emptyState) elements.emptyState.style.display = 'block';
                if (elements.udfFieldsContainer) {
                    elements.udfFieldsContainer.classList.add('hidden');
                    elements.udfFieldsContainer.innerHTML = '';
                }
            } else {
                setFormReadonly(true);
            }
            
            showStatusMessage('Changes cancelled', 'info');
        } else if (!state.isEditing) {
            showStatusMessage('No changes to cancel', 'info');
        }
    }

    /**
     * Render sample user defined fields
     */
    function renderSampleFields() {
        const fieldsHTML = `
            <div class="form-grid two-col">
                <div class="form-control-group">
                    <label for="udfField1" class="form-label">
                        <i class="bi bi-input-cursor-text" aria-hidden="true"></i>
                        <span>Reference Number</span>
                    </label>
                    <input type="text" id="udfField1" name="referenceNumber" class="form-control" placeholder="Enter reference number" data-required="true">
                </div>
                
                <div class="form-control-group">
                    <label for="udfField2" class="form-label">
                        <i class="bi bi-calendar3" aria-hidden="true"></i>
                        <span>Effective Date</span>
                    </label>
                    <input type="date" id="udfField2" name="effectiveDate" class="form-control">
                </div>

                <div class="form-control-group">
                    <label for="udfField3" class="form-label">
                        <i class="bi bi-list-ul" aria-hidden="true"></i>
                        <span>Category</span>
                    </label>
                    <select id="udfField3" name="category" class="form-control">
                        <option value="">Select category</option>
                        <option value="type1">Type 1</option>
                        <option value="type2">Type 2</option>
                        <option value="type3">Type 3</option>
                    </select>
                </div>

                <div class="form-control-group">
                    <label for="udfField4" class="form-label">
                        <i class="bi bi-cash" aria-hidden="true"></i>
                        <span>Custom Amount</span>
                    </label>
                    <input type="number" id="udfField4" name="customAmount" class="form-control" placeholder="0.00" step="0.01">
                </div>

                <div class="form-control-group">
                    <label for="udfField5" class="form-label">
                        <i class="bi bi-toggles" aria-hidden="true"></i>
                        <span>Status Flag</span>
                    </label>
                    <select id="udfField5" name="statusFlag" class="form-control">
                        <option value="">Select status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="pending">Pending</option>
                    </select>
                </div>

                <div class="form-control-group">
                    <label for="udfField6" class="form-label">
                        <i class="bi bi-check-circle" aria-hidden="true"></i>
                        <span>Verified</span>
                    </label>
                    <select id="udfField6" name="verified" class="form-control">
                        <option value="">Select option</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                    </select>
                </div>

                <div class="form-control-group full-row">
                    <label for="udfField7" class="form-label">
                        <i class="bi bi-chat-left-text" aria-hidden="true"></i>
                        <span>Additional Notes</span>
                    </label>
                    <textarea id="udfField7" name="additionalNotes" class="form-control" placeholder="Enter any additional notes or comments" rows="3"></textarea>
                </div>
            </div>
        `;
        
        if (elements.udfFieldsContainer) {
            elements.udfFieldsContainer.innerHTML = fieldsHTML;
        }
    }

    /**
     * Validate form data
     */
    function validateForm() {
        const requiredFields = elements.form.querySelectorAll('[data-required="true"]');
        let isValid = true;

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                field.classList.add('is-invalid');
                isValid = false;
            } else {
                field.classList.remove('is-invalid');
            }
        });

        return isValid;
    }

    /**
     * Collect form data
     */
    function collectFormData() {
        const formData = {};
        const inputs = elements.form.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            if (input.name) {
                formData[input.name] = input.value;
            }
        });

        return formData;
    }

    /**
     * Clear form fields
     */
    function clearForm() {
        if (elements.form) {
            elements.form.reset();
            
            // Remove validation classes
            const inputs = elements.form.querySelectorAll('.is-invalid');
            inputs.forEach(input => input.classList.remove('is-invalid'));
        }
    }

    /**
     * Set form readonly state
     */
    function setFormReadonly(readonly) {
        const inputs = elements.form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (readonly) {
                input.setAttribute('readonly', 'readonly');
                if (input.tagName === 'SELECT') {
                    input.setAttribute('disabled', 'disabled');
                }
            } else {
                input.removeAttribute('readonly');
                input.removeAttribute('disabled');
            }
        });
    }

    /**
     * Show status message
     */
    function showStatusMessage(message, type = 'info') {
        if (elements.statusMessage && elements.statusText) {
            elements.statusText.textContent = message;
            elements.statusMessage.className = `status ${type}`;
            elements.statusMessage.classList.remove('hidden');

            // Auto-hide after 5 seconds
            setTimeout(hideStatusMessage, 5000);
        }
    }

    /**
     * Hide status message
     */
    function hideStatusMessage() {
        if (elements.statusMessage) {
            elements.statusMessage.classList.add('hidden');
        }
    }

    /**
     * Load sample data (for demonstration)
     */
    function loadSampleData() {
        // Initially show empty state
        console.log('User Defined Fields module loaded');
        showStatusMessage('User Defined Fields module ready', 'info');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
