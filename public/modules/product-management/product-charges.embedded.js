// Product Charges Embedded Form Script
(function () {
    console.warn('=== Product Charges Script Starting ===');

    function getProductID() {
        // Get from parent window's form data
        if (window.opener && window.opener.document) {
            const productInput = window.opener.document.getElementById('ProductID');
            return productInput ? productInput.value.trim() : '';
        }
        // Get from session or global state
        return window.childFormRequestData?.RequestData?.ProductID || '';
    }

    function getBranchID() {
        if (window.childFormRequestData?.RequestData?.OurBranchID) {
            return window.childFormRequestData.RequestData.OurBranchID;
        }
        return window.SESSION?.BranchID || '0101';
    }

    function getOperatorID() {
        if (window.childFormRequestData?.RequestData?.OperatorID) {
            return window.childFormRequestData.RequestData.OperatorID;
        }
        return window.SESSION?.OperatorID || 'ADMIN';
    }

    async function loadProductCharges() {
        try {
            const productID = getProductID();
            const branchID = getBranchID();
            const operatorID = getOperatorID();

            console.log('[Product Charges] Loading data for Product:', productID);

            const requestPayload = {
                RequestID: 'dbo.p_GetProductCharge',
                FormId: 'dbo.p_GetProductCharge',
                RequestData: {
                    OurBranchID: branchID,
                    OperatorID: operatorID,
                    ProductID: productID
                },
                RequestTime: new Date().toLocaleString('en-GB'),
                AppName: 'PROJECT_KAIRO',
                Checksum: ''
            };

            console.log('[Product Charges] Request payload:', requestPayload);

            // Use the global service to fetch data
            const service = window.ClientService || window.SearchService || window.ProductService;
            if (!service || typeof service.executeRequest !== 'function' && typeof service.search !== 'function') {
                console.error('[Product Charges] Service not available');
                return;
            }

            // Call the service
            const response = service.executeRequest 
                ? await service.executeRequest(requestPayload)
                : await service.search(requestPayload);

            console.log('[Product Charges] Response:', response);

            // Parse the response and populate the grid
            let charges = response?.Details?.Charges || response?.Details || response?.Charges || [];
            if (!Array.isArray(charges)) {
                charges = charges ? [charges] : [];
            }

            populateChargesGrid(charges);

        } catch (error) {
            console.error('[Product Charges] Error loading charges:', error);
            showToast('Error loading product charges', 'danger');
        }
    }

    function populateChargesGrid(charges) {
        const tbody = document.querySelector('.data-grid-table tbody');
        if (!tbody) {
            console.error('[Product Charges] Table body not found');
            return;
        }

        // Clear existing rows except for the first placeholder row
        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => row.remove());

        if (charges.length === 0) {
            // Show empty state
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = '<td colspan="6" style="text-align: center; padding: 20px; color: var(--text-gray);">No charges found</td>';
            tbody.appendChild(emptyRow);
            return;
        }

        // Populate with charge data
        charges.forEach((charge, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="checkbox-column"><input type="checkbox" class="bs-checkbox charge-checkbox" data-charge-id="${charge.ChargeID || ''}" /></td>
                <td>${charge.ChargeID || ''}</td>
                <td>${charge.Description || ''}</td>
                <td>${charge.ChargeEvent || ''}</td>
                <td>${formatDate(charge.EffectiveDate)}</td>
                <td>${formatDate(charge.ExpiryDate)}</td>
            `;
            tbody.appendChild(row);
        });

        // Re-wire the select all checkbox
        wireSelectAllCheckbox();
        console.log('[Product Charges] Grid populated with', charges.length, 'charges');
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-GB');
        } catch {
            return dateString;
        }
    }

    function showToast(message, type = 'danger') {
        const container = document.querySelector('.kairo-toast-container') || createToastContainer();
        const toast = document.createElement('div');
        toast.className = `kairo-toast kairo-toast--${type} is-show`;
        toast.innerHTML = `
            <div class="kairo-toast__title">
                <span>${type === 'danger' ? 'Error' : 'Success'}</span>
                <button class="kairo-toast__close" onclick="this.closest('.kairo-toast').remove()">&times;</button>
            </div>
            <div class="kairo-toast__body">${message}</div>
        `;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 4000);
    }

    function createToastContainer() {
        const container = document.createElement('div');
        container.className = 'kairo-toast-container';
        document.body.appendChild(container);
        return container;
    }

    function wireSelectAllCheckbox() {
        const selectAll = document.getElementById('selectAll');
        const checkboxes = document.querySelectorAll('.charge-checkbox');
        
        if (selectAll) {
            selectAll.addEventListener('change', function() {
                checkboxes.forEach(cb => cb.checked = this.checked);
            });
        }
    }

    function wireBackButton() {
        const backBtn = document.getElementById('backBtn');
        if (backBtn) {
            backBtn.addEventListener('click', function() {
                // Close the child form
                if (window.parent && window.parent.closeChildForm) {
                    window.parent.closeChildForm();
                } else if (window.opener) {
                    window.opener.closeChildForm();
                    window.close();
                }
            });
        }
    }

    function wireEditButton() {
        const editBtn = document.querySelector('.btn-action:nth-child(1)'); // Edit button
        const saveBtn = document.querySelector('.btn-action:nth-child(2)'); // Save button
        const cancelBtn = document.querySelector('.btn-action:nth-child(3)'); // Cancel button
        const checkboxes = document.querySelectorAll('.charge-checkbox');

        if (editBtn) {
            editBtn.addEventListener('click', function() {
                console.log('[Product Charges] Edit mode enabled');
                editBtn.style.display = 'none';
                saveBtn.style.display = 'inline-flex';
                cancelBtn.style.display = 'inline-flex';
                
                // Enable checkboxes for editing
                checkboxes.forEach(cb => cb.disabled = false);
                showToast('Edit mode enabled', 'success');
            });
        }
    }

    function wireCancelButton() {
        const editBtn = document.querySelector('.btn-action:nth-child(1)'); // Edit button
        const saveBtn = document.querySelector('.btn-action:nth-child(2)'); // Save button
        const cancelBtn = document.querySelector('.btn-action:nth-child(3)'); // Cancel button
        const selectAllCheckbox = document.getElementById('selectAll');
        const checkboxes = document.querySelectorAll('.charge-checkbox');

        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                console.log('[Product Charges] Edit mode cancelled');
                editBtn.style.display = 'inline-flex';
                saveBtn.style.display = 'none';
                cancelBtn.style.display = 'none';
                
                // Disable checkboxes and uncheck all
                checkboxes.forEach(cb => {
                    cb.disabled = true;
                    cb.checked = false;
                });
                if (selectAllCheckbox) {
                    selectAllCheckbox.checked = false;
                }
                showToast('Changes cancelled', 'success');
            });
        }
    }

    function wireSaveButton() {
        const saveBtn = document.querySelector('.btn-action:nth-child(2)'); // Save button
        
        if (saveBtn) {
            saveBtn.addEventListener('click', function() {
                const selectedCharges = Array.from(document.querySelectorAll('.charge-checkbox:checked'))
                    .map(cb => cb.getAttribute('data-charge-id'))
                    .filter(id => id);
                
                console.log('[Product Charges] Saving charges:', selectedCharges);
                showToast('Changes saved successfully', 'success');
                
                // Here you would call your API to save the selected charges
                // For now, just show the toast and exit edit mode
                const editBtn = document.querySelector('.btn-action:nth-child(1)');
                const cancelBtn = document.querySelector('.btn-action:nth-child(3)');
                const checkboxes = document.querySelectorAll('.charge-checkbox');
                
                if (editBtn && cancelBtn) {
                    editBtn.style.display = 'inline-flex';
                    saveBtn.style.display = 'none';
                    cancelBtn.style.display = 'none';
                    
                    checkboxes.forEach(cb => cb.disabled = true);
                }
            });
        }
    }

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', function () {
        console.warn('[Product Charges] Initializing...');
        
        // Get button references
        const editBtn = document.querySelector('.btn-action:nth-child(1)');
        const saveBtn = document.querySelector('.btn-action:nth-child(2)');
        const cancelBtn = document.querySelector('.btn-action:nth-child(3)');
        const checkboxes = document.querySelectorAll('.charge-checkbox');
        const selectAllCheckbox = document.getElementById('selectAll');
        
        // Hide Save and Cancel buttons on load
        if (saveBtn) saveBtn.style.display = 'none';
        if (cancelBtn) cancelBtn.style.display = 'none';
        
        // Disable all checkboxes on load
        checkboxes.forEach(cb => cb.disabled = true);
        if (selectAllCheckbox) selectAllCheckbox.disabled = true;
        
        // Wire button handlers
        wireBackButton();
        wireEditButton();
        wireCancelButton();
        wireSaveButton();
        
        // Load product charges data
        loadProductCharges();
        
        console.warn('[Product Charges] Initialization complete');
    });

    console.warn('=== Product Charges Script Loaded ===');
})();
