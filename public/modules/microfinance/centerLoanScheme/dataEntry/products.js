/**
 * Products - Data Entry Controller
 * Handles products listing, selection, and CRUD operations for Center Loan Scheme
 */

(function() {
    'use strict';

    // =========================================================================
    // State Management
    // =========================================================================
    let parentSchemeData = null;  // Data received from parent (center-loan-scheme)
    let productsData = [];         // Products fetched from API
    let isEditMode = false;
    let originalSelections = [];   // Store original selections for cancel

    // =========================================================================
    // Environment Helper
    // =========================================================================
    function getEnv() {
        const e = window.Environment || {};
        const bankID = e.defaultBankId || e.defaultBankID || e.bankID || e.bankId || 
                       sessionStorage.getItem('BankID') || localStorage.getItem('BankID') || '00';
        const ourBranchID = e.branchID || e.branchId || 
                            sessionStorage.getItem('BranchID') || localStorage.getItem('BranchID') || '0325';
        const operatorID = e.operatorID || e.operatorId || 
                           sessionStorage.getItem('OperatorID') || localStorage.getItem('OperatorID') || 'CSADM';
        return { bankID, ourBranchID, operatorID };
    }

    // =========================================================================
    // Toast Notifications
    // =========================================================================
    function ensureToastContainer() {
        let el = document.querySelector('[data-kairo-toast-container]');
        if (!el) {
            el = document.getElementById('toastContainer');
        }
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

        // Remove existing toasts
        container.querySelectorAll('.kairo-toast').forEach(t => t.remove());

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
            setTimeout(() => {
                try { toast.remove(); } catch {}
            }, 300);
        };

        setTimeout(() => toast.classList.add('is-show'), 0);
        if (timeoutMs && timeoutMs > 0) setTimeout(remove, timeoutMs);
    }

    function showSuccess(message) {
        showToast(message, { variant: 'success' });
    }

    function showError(message) {
        showToast(message, { variant: 'danger' });
    }

    function showWarning(message) {
        showToast(message, { variant: 'warning' });
    }

    function showInfo(message) {
        showToast(message, { variant: 'info' });
    }

    // =========================================================================
    // Parent Communication
    // =========================================================================
    
    /**
     * Get scheme data from parent window (center-loan-scheme)
     */
    function getParentSchemeData() {
        try {
            if (window.parent && window.parent !== window) {
                // Try to access parent's currentScheme or CenterLoanScheme object
                if (window.parent.CenterLoanScheme && window.parent.CenterLoanScheme.getCurrentScheme) {
                    return window.parent.CenterLoanScheme.getCurrentScheme();
                }
                // Fallback: try accessing directly via window
                if (window.parent.currentScheme) {
                    return window.parent.currentScheme;
                }
            }
        } catch (error) {
            console.warn('Could not access parent scheme data:', error);
        }
        return null;
    }

    /**
     * Request scheme data from parent via postMessage
     */
    function requestParentData() {
        try {
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ 
                    action: 'requestSchemeData',
                    source: 'Products'
                }, '*');
            }
        } catch (error) {
            console.error('Error requesting parent data:', error);
        }
    }

    /**
     * Send message to parent when form opens
     */
    function notifyParentFormOpened() {
        try {
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ 
                    action: 'submoduleOpened',
                    source: 'Products'
                }, '*');
            }
        } catch (error) {
            console.error('Error notifying parent of form open:', error);
        }
    }

    /**
     * Close the child form by notifying parent
     */
    function closeChildForm() {
        try {
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ 
                    action: 'submoduleClosed',
                    source: 'Products'
                }, '*');
            } else {
                window.close();
            }
        } catch (error) {
            console.error('Error closing form:', error);
        }
    }

    /**
     * Listen for messages from parent
     */
    function setupParentMessageListener() {
        window.addEventListener('message', function(event) {
            if (event.data && event.data.action === 'schemeData') {
                parentSchemeData = event.data.data;
                console.log('Received scheme data from parent:', parentSchemeData);
                // Load products with the received data
                loadProducts();
            }
        });
    }

    // =========================================================================
    // Products API
    // =========================================================================

    /**
     * Load products from API using scheme data
     */
    async function loadProducts() {
        const { bankID, operatorID } = getEnv();
        
        // Get scheme data - either from parent or use defaults
        let schemeId = '';

        // Try to get from parent scheme data
        if (parentSchemeData) {
            schemeId = parentSchemeData.LoanSchemeID || parentSchemeData.SchemeId || '';
        }

        // If no parent data, try to get from parent window directly
        if (!schemeId) {
            const parentData = getParentSchemeData();
            if (parentData) {
                schemeId = parentData.LoanSchemeID || parentData.SchemeId || '';
                parentSchemeData = parentData;
            }
        }

        if (!schemeId) {
            showWarning('No scheme selected. Please load a scheme first.');
            renderEmptyTable();
            return;
        }

        const requestData = {
            BankID: bankID,
            LoanSchemeID: schemeId,
            OperatorID: operatorID
        };

        console.log('Fetching products with request:', requestData);

        try {
            if (!window.GroupService) {
                throw new Error('GroupService not available');
            }

            showInfo('Loading products...');
            const result = await window.GroupService.getGroupLoanSchemeProducts(requestData);

            console.log('Products API response:', result);

            if (result.success && result.data) {
                // Products are in Details02 array
                const details02 = result.data.Details02 || result.data.details02 || [];
                productsData = Array.isArray(details02) ? details02 : [details02];
                renderProductsTable(productsData);
                
                // Populate audit fields from the first selected product
                const selectedProduct = productsData.find(p => p.IsSelected === true);
                if (selectedProduct) {
                    populateAuditFields(selectedProduct);
                }
                
                showSuccess(`Loaded ${productsData.length} product(s)`);
            } else {
                productsData = [];
                renderEmptyTable();
                showWarning(result.message || 'No products found for this scheme');
            }
        } catch (error) {
            console.error('Error loading products:', error);
            productsData = [];
            renderEmptyTable();
            showError('Failed to load products: ' + error.message);
        }
    }

    /**
     * Render the products table with data
     */
    function renderProductsTable(products) {
        const tbody = document.getElementById('productsTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!products || products.length === 0) {
            renderEmptyTable();
            return;
        }

        products.forEach((product, index) => {
            const row = document.createElement('tr');
            row.dataset.index = index;
            row.dataset.productId = product.ProductID || '';
            
            // Handle both boolean and string values from API
            const isSelected = product.IsSelected === true || product.IsSelected === 'true' || product.IsSelected === 1;
            const isDefault = product.IsDefault === true || product.IsDefault === 'true' || product.IsDefault === 1;
            const allowEdit = product.AllowEdit === true || product.AllowEdit === 'true' || product.AllowEdit === 1;
            
            row.dataset.allowEdit = allowEdit ? 'true' : 'false';

            // Add visual classes based on state
            row.classList.add('product-row');
            if (isSelected) {
                row.classList.add('product-row--selected');
            }
            if (isDefault) {
                row.classList.add('product-row--default');
            }
            if (allowEdit) {
                row.classList.add('product-row--editable');
            } else {
                row.classList.add('product-row--locked');
            }

            row.innerHTML = `
                <td class="text-center">
                    <input class="form-check-input" type="checkbox" 
                           aria-label="Select row" 
                           ${isSelected ? 'checked' : ''} 
                           disabled 
                           data-allow-edit="${allowEdit}" />
                </td>
                <td>${escapeHtml(product.ProductTypeID || '')}</td>
                <td>${escapeHtml(product.ProductID || '')}</td>
                <td>${escapeHtml(product.ProductDescription || '')}</td>
                <td>${isDefault ? 'true' : 'false'}</td>
            `;

            tbody.appendChild(row);
        });

        // Store original selections for cancel functionality
        storeOriginalSelections();
    }

    /**
     * Render empty table state
     */
    function renderEmptyTable() {
        const tbody = document.getElementById('productsTableBody');
        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-4">
                    <i class="bi bi-inbox fs-2 d-block mb-2"></i>
                    No products available for this scheme
                </td>
            </tr>
        `;
    }

    /**
     * Store original checkbox selections for cancel functionality
     */
    function storeOriginalSelections() {
        originalSelections = [];
        document.querySelectorAll('#productsTableBody input[type="checkbox"]').forEach((checkbox, index) => {
            originalSelections[index] = checkbox.checked;
        });
    }

    /**
     * Restore original checkbox selections on cancel
     */
    function restoreOriginalSelections() {
        document.querySelectorAll('#productsTableBody input[type="checkbox"]').forEach((checkbox, index) => {
            if (originalSelections[index] !== undefined) {
                checkbox.checked = originalSelections[index];
            }
        });
    }

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // =========================================================================
    // Audit Fields
    // =========================================================================

    /**
     * Populate audit fields from product data
     */
    function populateAuditFields(data) {
        if (!data) return;

        // Get the first product's audit info or use scheme-level audit
        const auditData = Array.isArray(data) && data.length > 0 ? data[0] : data;

        setFieldValue('ClpCreatedBy', auditData.CreatedBy || '');
        setFieldValue('ClpCreatedOn', formatDateTime(auditData.CreatedOn) || '');
        setFieldValue('ClpSupervisedBy', auditData.SupervisedBy || '');
        setFieldValue('ClpSupervisedOn', formatDateTime(auditData.SupervisedOn) || '');
    }

    /**
     * Set field value helper
     */
    function setFieldValue(fieldId, value) {
        const el = document.getElementById(fieldId);
        if (el) el.value = value ?? '';
    }

    /**
     * Format date/time for display using GlobalUtils
     */
    function formatDateTime(dateStr) {
        if (!dateStr) return '';
        if (window.GlobalUtils && window.GlobalUtils.formatDateTime) {
            return window.GlobalUtils.formatDateTime(dateStr);
        }
        // Fallback if GlobalUtils not available
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            return date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateStr;
        }
    }

    // =========================================================================
    // Form Actions
    // =========================================================================

    /**
     * Handle window control actions
     */
    function handleWindowAction(action, btn) {
        switch (action) {
            case 'refresh':
                document.querySelectorAll('[class*="invalid"]').forEach(el => {
                    el.classList.remove(...Array.from(el.classList).filter(c => c.includes('invalid')));
                });
                loadProducts();
                break;

            case 'close':
                closeChildForm();
                break;

            case 'cancel':
                handleCancel();
                break;

            case 'edit':
                handleEdit();
                break;

            case 'save':
                handleSave();
                break;
        }
    }

    /**
     * Handle Edit action
     */
    function handleEdit() {
        if (productsData.length === 0) {
            showWarning('No products to edit. Please load products first.');
            return;
        }
        
        isEditMode = true;
        
        // Store original selections before editing
        storeOriginalSelections();
        
        // Add edit mode class to table for styling
        const table = document.querySelector('[data-section="products"] table');
        if (table) {
            table.classList.add('products-edit-mode');
        }
        
        // Enable all checkboxes for editing (including already selected ones)
        document.querySelectorAll('#productsTableBody input[type="checkbox"]').forEach(checkbox => {
            checkbox.disabled = false;
            
            // Add change listener to update row styling
            checkbox.addEventListener('change', handleCheckboxChange);
        });
        
        // Enable save button
        const btnSave = document.getElementById('btnSave');
        if (btnSave) btnSave.disabled = false;

        // Disable edit button
        const btnEdit = document.getElementById('btnEdit');
        if (btnEdit) btnEdit.disabled = true;

        showInfo('Edit mode enabled. Select products and click Save.');
    }
    
    /**
     * Handle checkbox change to update row styling
     */
    function handleCheckboxChange(event) {
        const checkbox = event.target;
        const row = checkbox.closest('tr');
        if (row) {
            if (checkbox.checked) {
                row.classList.add('product-row--selected');
            } else {
                row.classList.remove('product-row--selected');
            }
        }
    }

    /**
     * Handle Cancel action
     */
    function handleCancel() {
        if (isEditMode) {
            // Restore original selections
            restoreOriginalSelections();
            
            // Update row styling based on restored selections
            updateRowStylingFromCheckboxes();
            
            // Remove edit mode class from table
            const table = document.querySelector('[data-section="products"] table');
            if (table) {
                table.classList.remove('products-edit-mode');
            }
            
            // Disable all checkboxes and remove change listeners (back to read-only mode)
            document.querySelectorAll('#productsTableBody input[type="checkbox"]').forEach(checkbox => {
                checkbox.disabled = true;
                checkbox.removeEventListener('change', handleCheckboxChange);
            });
            
            // Reset buttons
            const btnSave = document.getElementById('btnSave');
            if (btnSave) btnSave.disabled = true;
            
            const btnEdit = document.getElementById('btnEdit');
            if (btnEdit) btnEdit.disabled = false;
            
            isEditMode = false;
            showInfo('Changes cancelled');
        } else {
            closeChildForm();
        }
    }
    
    /**
     * Update row styling based on current checkbox states
     */
    function updateRowStylingFromCheckboxes() {
        document.querySelectorAll('#productsTableBody tr').forEach(row => {
            const checkbox = row.querySelector('input[type="checkbox"]');
            if (checkbox) {
                if (checkbox.checked) {
                    row.classList.add('product-row--selected');
                } else {
                    row.classList.remove('product-row--selected');
                }
            }
        });
    }

    /**
     * Handle Save action
     */
    async function handleSave() {
        if (!isEditMode) {
            showWarning('Please enter Edit mode first');
            return;
        }

        const { bankID, operatorID } = getEnv();
        
        // Get scheme ID - try multiple sources
        let schemeId = '';
        
        // Try from parentSchemeData
        if (parentSchemeData) {
            schemeId = parentSchemeData.LoanSchemeID || parentSchemeData.SchemeId || parentSchemeData.schemeId || '';
        }
        
        // If still no scheme ID, try to get from parent window directly
        if (!schemeId) {
            const parentData = getParentSchemeData();
            if (parentData) {
                schemeId = parentData.LoanSchemeID || parentData.SchemeId || parentData.schemeId || '';
                parentSchemeData = parentData; // Update for future use
            }
        }
        
        // Try from the first product's data
        if (!schemeId && productsData.length > 0) {
            schemeId = productsData[0].LoanSchemeID || productsData[0].SchemeId || '';
        }
        if (!schemeId) {
            showError('No scheme ID available. Cannot save.');
            return;
        }
        
        console.log('Using scheme ID for save:', schemeId);
        
        // Collect ALL products with their current selection state (Selected = checkbox state)
        const allProducts = [];
        document.querySelectorAll('#productsTableBody tr').forEach((row, index) => {
            const checkbox = row.querySelector('input[type="checkbox"]');
            if (checkbox) {
                const originalProduct = productsData[index];
                if (originalProduct) {
                    const isChecked = checkbox.checked;
                    allProducts.push({
                        IsSelected: originalProduct.IsSelected === true || originalProduct.IsSelected === 'true' || originalProduct.IsSelected === 1 ? 'true' : 'false',
                        LoanSchemeID: schemeId,
                        ProductID: originalProduct.ProductID || '',
                        ProductDescription: originalProduct.ProductDescription || '',
                        ProductTypeID: originalProduct.ProductTypeID || '',
                        IsDefault: originalProduct.IsDefault === true || originalProduct.IsDefault === 'true' || originalProduct.IsDefault === 1 ? 'true' : 'false',
                        AllowEdit: originalProduct.AllowEdit === true || originalProduct.AllowEdit === 'true' || originalProduct.AllowEdit === 1 ? 'true' : 'false',
                        UpdateCount: originalProduct.UpdateCount || '',
                        Selected: isChecked ? 'true' : 'false'
                    });
                }
            }
        });

        if (allProducts.length === 0) {
            showWarning('No products available to save.');
            return;
        }
        
        // Check if at least one product is selected
        const hasSelection = allProducts.some(p => p.Selected === 'true');
        if (!hasSelection) {
            showWarning('Please select at least one product.');
            return;
        }

        // Build XML for DetailRecord
        const detailRecordXml = buildDetailRecordXml(allProducts, schemeId);

        const now = new Date();
        const formattedDate = formatDateForApi(now);

        const requestData = {
            BankID: bankID,
            LoanSchemeID: schemeId,
            CreatedBy: operatorID,
            CreatedOn: formattedDate,
            SupervisedBy: operatorID,
            DetailRecord: detailRecordXml
        };

        console.log('Save request data:', requestData);

        try {
            showInfo('Saving products...');
            const result = await window.GroupService.addEditGroupLoanSchemeProducts(requestData);

            console.log('Save API response:', result);

            if (result.success) {
                // Notify parent of saved products
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage({ 
                        action: 'productsSaved', 
                        source: 'Products',
                        data: allProducts.filter(p => p.Selected === 'true')
                    }, '*');
                }
                
                showSuccess('Products saved successfully');
                
                // Reset edit mode
                isEditMode = false;
                
                // Remove edit mode class from table
                const table = document.querySelector('[data-section="products"] table');
                if (table) {
                    table.classList.remove('products-edit-mode');
                }
                
                // Disable all checkboxes, remove listeners, and update buttons
                document.querySelectorAll('#productsTableBody input[type="checkbox"]').forEach(checkbox => {
                    checkbox.disabled = true;
                    checkbox.removeEventListener('change', handleCheckboxChange);
                });
                
                const btnSave = document.getElementById('btnSave');
                if (btnSave) btnSave.disabled = true;
                
                const btnEdit = document.getElementById('btnEdit');
                if (btnEdit) btnEdit.disabled = false;
                
                // Update original selections to reflect saved state
                storeOriginalSelections();
                
                // Refresh products to get updated data
                await loadProducts();
            } else {
                showError(result.message || 'Failed to save products');
            }
        } catch (error) {
            console.error('Error saving products:', error);
            showError('Failed to save products: ' + error.message);
        }
    }

    /**
     * Build XML string for DetailRecord
     * Format: <dt_GroupLoanSchemeProducts>...</dt_GroupLoanSchemeProducts> for each product
     */
    function buildDetailRecordXml(products, schemeId) {
        let xml = '';
        products.forEach(product => {
            xml += '<dt_GroupLoanSchemeProducts>';
            xml += `<IsSelected>${product.IsSelected}</IsSelected>`;
            if (product.LoanSchemeID) {
                xml += `<LoanSchemeID>${escapeXml(product.LoanSchemeID)}</LoanSchemeID>`;
            }
            xml += `<ProductID>${escapeXml(product.ProductID)}</ProductID>`;
            if (product.ProductDescription) {
                xml += `<ProductDescription>${escapeXml(product.ProductDescription)}</ProductDescription>`;
            }
            xml += `<ProductTypeID>${escapeXml(product.ProductTypeID)}</ProductTypeID>`;
            xml += `<IsDefault>${product.IsDefault}</IsDefault>`;
            xml += `<AllowEdit>${product.AllowEdit}</AllowEdit>`;
            if (product.UpdateCount) {
                xml += `<UpdateCount>${product.UpdateCount}</UpdateCount>`;
            }
            xml += `<Selected>${product.Selected}</Selected>`;
            xml += '</dt_GroupLoanSchemeProducts>';
        });
        return xml;
    }

    /**
     * Escape special characters for XML
     */
    function escapeXml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    /**
     * Format date for API using GlobalUtils
     * Returns ISO format (YYYY-MM-DDTHH:MM:SS) or null for current datetime
     */
    function formatDateForApi(date) {
        if (window.GlobalUtils && window.GlobalUtils.getCurrentDateTime) {
            return window.GlobalUtils.getCurrentDateTime();
        }
        // Fallback if GlobalUtils not available
        const pad = (n) => n.toString().padStart(2, '0');
        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());
        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());
        const seconds = pad(date.getSeconds());
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    }

    // =========================================================================
    // Initialization
    // =========================================================================

    /**
     * Initialize window control buttons
     */
    function initWindowControls() {
        // Header buttons
        document.querySelectorAll('.am-btn[data-action]').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const action = btn.getAttribute('data-action');
                handleWindowAction(action, btn);
            });
        });

        // Action panel buttons
        document.querySelectorAll('.action-panel .btn-action[data-clp-action]').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const action = btn.getAttribute('data-clp-action');
                handleWindowAction(action, btn);
            });
        });
    }

    /**
     * Initialize section toggle functionality
     */
    function initSectionToggles() {
        document.querySelectorAll('[data-section-toggle]').forEach(header => {
            header.addEventListener('click', function() {
                const section = this.closest('.form-section');
                const content = section.querySelector('[data-section-content]');
                const btn = this.querySelector('.section-toggle-btn');
                const icon = btn.querySelector('i');
                const isExpanded = btn.getAttribute('aria-expanded') === 'true';
                
                btn.setAttribute('aria-expanded', !isExpanded);
                section.classList.toggle('collapsed');
                icon.className = isExpanded ? 'bi bi-chevron-down' : 'bi bi-chevron-up';
            });
        });
    }

    /**
     * Main initialization function
     */
    async function initialize() {
        console.log('Initializing Products page...');

        // Load services
        if (window.ServiceLoader) {
            try {
                await window.ServiceLoader.loadCore();
                await window.ServiceLoader.loadGroupService();
                console.log('Services loaded successfully');
            } catch (error) {
                console.error('Error loading services:', error);
            }
        }

        // Setup message listener for parent communication
        setupParentMessageListener();

        // Initialize UI components
        initWindowControls();
        initSectionToggles();

        // Notify parent that form is opened
        notifyParentFormOpened();

        // Try to get parent data and load products
        parentSchemeData = getParentSchemeData();
        
        if (parentSchemeData) {
            console.log('Got parent scheme data:', parentSchemeData);
            await loadProducts();
        } else {
            // Request data from parent via postMessage
            console.log('Requesting scheme data from parent...');
            requestParentData();
            
            // Set a timeout to try loading anyway after a short delay
            setTimeout(async () => {
                if (!parentSchemeData) {
                    parentSchemeData = getParentSchemeData();
                    if (parentSchemeData) {
                        await loadProducts();
                    } else {
                        showWarning('Unable to get scheme data. Please ensure a scheme is loaded.');
                    }
                }
            }, 500);
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    // Expose functions for external use
    window.Products = {
        loadProducts,
        handleEdit,
        handleSave,
        handleCancel,
        closeChildForm,
        showToast,
        showSuccess,
        showError,
        showWarning,
        showInfo
    };

})();
