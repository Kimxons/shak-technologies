// State Management
let charges = [];
let selectedChargeIndex = null;
let isEditMode = false;

// Service references
let LookupService = null;

function getLookupService() {
    if (!LookupService) {
        LookupService = window.LookupService || window.parent?.LookupService;
    }
    return LookupService;
}

function showMessage(message, type = 'info') {
    if (window.parent && window.parent.NotificationService) {
        window.parent.NotificationService.showToast(message, type);
    } else {
        alert(message);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    attachEventListeners();
    await loadServices();
    // Wait for services to load then populate dropdowns
    setTimeout(loadDynamicDropdowns, 100);
});

/**
 * Load required services
 */
async function loadServices() {
    try {
        if (window.ServiceLoader) {
            await ServiceLoader.loadCore();
            await ServiceLoader.loadLookupService();
        }
        console.log('[ChargeRatesModal] Services loaded');
    } catch (error) {
        console.error('[ChargeRatesModal] Error loading services:', error);
    }
}

/**
 * Load dynamic dropdowns from database
 */
async function loadDynamicDropdowns() {
    await loadCalculationMethods();
}

/**
 * Load Calculation Methods from database
 */
async function loadCalculationMethods() {
    try {
        console.log('[ChargeRatesModal] Loading calculation methods...');
        
        const service = getLookupService();
        if (!service) {
            console.error('[ChargeRatesModal] LookupService not available');
            // Fall back to static options
            loadStaticCalculationMethods();
            return;
        }

        // Try to load from system codes
        const methods = await service.getSystemCodeOptions('CalculationMethodID');
        console.log('[ChargeRatesModal] Calculation methods loaded:', methods);
        
        const selectElement = document.getElementById('calculationMethod');
        if (!selectElement) return;

        if (methods && methods.length > 0) {
            selectElement.innerHTML = '<option value="">--Select--</option>';
            methods.forEach(method => {
                const option = document.createElement('option');
                option.value = method.value;
                option.textContent = method.label;
                selectElement.appendChild(option);
            });
        } else {
            // Fall back to static options if no data from database
            loadStaticCalculationMethods();
        }

        console.log('[ChargeRatesModal] Calculation method dropdown populated');
    } catch (error) {
        console.error('[ChargeRatesModal] Error loading calculation methods:', error);
        loadStaticCalculationMethods();
    }
}

/**
 * Fallback static calculation methods
 */
function loadStaticCalculationMethods() {
    const selectElement = document.getElementById('calculationMethod');
    if (!selectElement) return;
    
    selectElement.innerHTML = `
        <option value="">--Select--</option>
        <option value="P">Percentage</option>
        <option value="F">Fixed Amount</option>
        <option value="R">Range Based</option>
        <option value="S">Slab Based</option>
    `;
}

function tryCloseModal() {
    if (window.parent && typeof window.parent.closeChargeRatesModal === 'function') {
        window.parent.closeChargeRatesModal();
    } else {
        window.close();
    }
}

function attachEventListeners() {
    const closeBtn = document.getElementById('btnClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', tryCloseModal);
    }
    const resizeBtn = document.getElementById('btnResize');
    if (resizeBtn) {
        resizeBtn.addEventListener('click', () => {
            document.body.classList.toggle('wide-mode');
        });
    }

    // Calculation method change - adjust fields dynamically
    const calculationMethodSelect = document.getElementById('calculationMethod');
    if (calculationMethodSelect) {
        calculationMethodSelect.addEventListener('change', handleCalculationMethodChange);
    }

    // Sidebar Actions
    const viewBtn = document.getElementById('viewBtn');
    if (viewBtn) viewBtn.addEventListener('click', viewCharge);
    
    const addBtn = document.getElementById('addBtn');
    if (addBtn) addBtn.addEventListener('click', enableAdd);
    
    const editBtn = document.getElementById('editBtn');
    if (editBtn) editBtn.addEventListener('click', enableEdit);
    
    const deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn) deleteBtn.addEventListener('click', deleteCharge);
    
    const saveBtnSidebar = document.getElementById('saveBtnSidebar');
    if (saveBtnSidebar) saveBtnSidebar.addEventListener('click', saveCharges);
    
    const cancelBtnSidebar = document.getElementById('cancelBtnSidebar');
    if (cancelBtnSidebar) cancelBtnSidebar.addEventListener('click', cancelOperation);

    // Form Buttons
    const newBtn = document.getElementById('newBtn');
    if (newBtn) newBtn.addEventListener('click', newCharge);
    
    const alterBtn = document.getElementById('alterBtn');
    if (alterBtn) alterBtn.addEventListener('click', alterCharge);
    
    const removeBtn = document.getElementById('removeBtn');
    if (removeBtn) removeBtn.addEventListener('click', removeCharge);
    
    const updateBtn = document.getElementById('updateBtn');
    if (updateBtn) updateBtn.addEventListener('click', updateCharge);
    
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) clearBtn.addEventListener('click', clearForm);

    // Search button
    const searchChargeBtn = document.getElementById('searchChargeBtn');
    if (searchChargeBtn) searchChargeBtn.addEventListener('click', searchCharge);
}

function searchCharge() {
    console.log('Search charge');
    // TODO: Implement charge search
    alert('Search functionality - connect to backend');
}

/**
 * Handle calculation method change - adjust fields dynamically
 */
function handleCalculationMethodChange(event) {
    const method = event.target.value;
    console.log('[ChargeRatesModal] Calculation method changed to:', method);
    
    const valueField = document.getElementById('value');
    const valueLabel = valueField?.previousElementSibling;
    const minChargeField = document.getElementById('minCharge');
    const maxChargeField = document.getElementById('maximumCharge');
    const ceilingAmountField = document.getElementById('ceilingAmount');
    
    // Get parent rows for show/hide
    const minChargeRow = minChargeField?.closest('.col');
    const maxChargeRow = maxChargeField?.closest('.col');
    const ceilingAmountRow = ceilingAmountField?.closest('.col');
    
    // Reset all fields visibility
    if (minChargeRow) minChargeRow.style.display = '';
    if (maxChargeRow) maxChargeRow.style.display = '';
    if (ceilingAmountRow) ceilingAmountRow.style.display = '';
    
    switch (method) {
        case 'P': // Percentage
            if (valueLabel) valueLabel.textContent = 'Percentage (%)';
            if (valueField) {
                valueField.placeholder = 'e.g., 5.00';
                valueField.max = '100';
            }
            // Show min/max charge (percentage might have floor/cap)
            break;
            
        case 'F': // Fixed Amount
            if (valueLabel) valueLabel.textContent = 'Fixed Amount';
            if (valueField) {
                valueField.placeholder = '0.00';
                valueField.removeAttribute('max');
            }
            // Hide min/max charge for fixed amounts
            if (minChargeRow) minChargeRow.style.display = 'none';
            if (maxChargeRow) maxChargeRow.style.display = 'none';
            break;
            
        case 'R': // Range Based
        case 'S': // Slab Based
            if (valueLabel) valueLabel.textContent = 'Value';
            if (valueField) {
                valueField.placeholder = '0.00';
                valueField.removeAttribute('max');
            }
            // All fields visible for range/slab
            break;
            
        default:
            // Default state - show all
            if (valueLabel) valueLabel.textContent = 'Value';
            if (valueField) {
                valueField.placeholder = '0.00';
                valueField.removeAttribute('max');
            }
            break;
    }
}

function viewCharge() {
    console.log('View charge');
    // TODO: Implement view
    alert('View functionality - connect to backend');
}

function enableAdd() {
    isEditMode = true;
    clearForm();
    console.log('Add mode enabled');
}

function enableEdit() {
    if (selectedChargeIndex === null) {
        alert('Please select a charge to edit');
        return;
    }
    isEditMode = true;
    console.log('Edit mode enabled');
}

function deleteCharge() {
    if (selectedChargeIndex === null) {
        alert('Please select a charge to delete');
        return;
    }
    if (confirm('Are you sure you want to delete this charge?')) {
        charges.splice(selectedChargeIndex, 1);
        renderChargesTable();
        clearForm();
        selectedChargeIndex = null;
    }
}

function newCharge() {
    if (!validateForm()) {
        return;
    }

    const charge = collectChargeData();
    charges.push(charge);
    
    renderChargesTable();
    clearForm();
    
    console.log('New charge added:', charge);
}

function alterCharge() {
    if (selectedChargeIndex === null) {
        alert('Please select a charge to alter');
        return;
    }

    if (!validateForm()) {
        return;
    }

    const charge = collectChargeData();
    charges[selectedChargeIndex] = charge;
    
    renderChargesTable();
    clearForm();
    selectedChargeIndex = null;
    
    console.log('Charge altered:', charge);
}

function removeCharge() {
    if (selectedChargeIndex === null) {
        alert('Please select a charge to remove');
        return;
    }

    if (confirm('Are you sure you want to remove this charge?')) {
        charges.splice(selectedChargeIndex, 1);
        renderChargesTable();
        clearForm();
        selectedChargeIndex = null;
    }
}

function updateCharge() {
    if (selectedChargeIndex === null) {
        alert('Please select a charge to update');
        return;
    }

    if (!validateForm()) {
        return;
    }

    const charge = collectChargeData();
    charges[selectedChargeIndex] = charge;
    
    renderChargesTable();
    clearForm();
    selectedChargeIndex = null;
    
    console.log('Charge updated:', charge);
}

function cancelOperation() {
    if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
        clearForm();
        selectedChargeIndex = null;
        isEditMode = false;
    }
}

function validateForm() {
    const ceilingAmount = document.getElementById('ceilingAmount').value;
    const calculationMethod = document.getElementById('calculationMethod').value;
    const value = parseFloat(document.getElementById('value').value);

    if (!ceilingAmount) {
        alert('Please select a Ceiling Amount');
        return false;
    }

    if (!calculationMethod) {
        alert('Please select a Calculation Method');
        return false;
    }

    if (!value || value <= 0) {
        alert('Please enter a valid Value');
        return false;
    }

    return true;
}

function collectChargeData() {
    return {
        chargeId: document.getElementById('chargeId').value,
        effectiveDate: document.getElementById('effectiveDate').value,
        expiryDate: document.getElementById('expiryDate').value,
        ceilingAmount: document.getElementById('ceilingAmount').value,
        ceilingAmountText: document.getElementById('ceilingAmount').options[document.getElementById('ceilingAmount').selectedIndex].text,
        calculationMethod: document.getElementById('calculationMethod').value,
        calculationMethodText: document.getElementById('calculationMethod').options[document.getElementById('calculationMethod').selectedIndex].text,
        minCharge: parseFloat(document.getElementById('minCharge').value) || 0,
        maximumCharge: parseFloat(document.getElementById('maximumCharge').value) || 0,
        value: parseFloat(document.getElementById('value').value) || 0
    };
}

function renderChargesTable() {
    const tbody = document.getElementById('chargesTableBody');
    tbody.innerHTML = '';

    if (charges.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="6" class="text-center">No records to display.</td>
            </tr>
        `;
        return;
    }

    charges.forEach((charge, index) => {
        const row = document.createElement('tr');
        if (index === selectedChargeIndex) {
            row.classList.add('selected');
        }

        row.innerHTML = `
            <td>${charge.ceilingAmountText}</td>
            <td>${charge.minCharge.toFixed(2)}</td>
            <td>${charge.maximumCharge.toFixed(2)}</td>
            <td>${charge.calculationMethodText}</td>
            <td>${charge.value.toFixed(2)}</td>
            <td>${charge.value.toFixed(2)}</td>
        `;

        row.addEventListener('click', () => {
            selectCharge(index);
        });

        tbody.appendChild(row);
    });
}

function selectCharge(index) {
    selectedChargeIndex = index;
    renderChargesTable();
    
    const charge = charges[index];
    document.getElementById('chargeId').value = charge.chargeId || '';
    document.getElementById('effectiveDate').value = charge.effectiveDate || '';
    document.getElementById('expiryDate').value = charge.expiryDate || '';
    document.getElementById('ceilingAmount').value = charge.ceilingAmount || '';
    document.getElementById('calculationMethod').value = charge.calculationMethod || '';
    document.getElementById('minCharge').value = charge.minCharge || '';
    document.getElementById('maximumCharge').value = charge.maximumCharge || '';
    document.getElementById('value').value = charge.value || '';
}

function clearForm() {
    document.getElementById('chargeId').value = '';
    document.getElementById('effectiveDate').value = '';
    document.getElementById('expiryDate').value = '';
    document.getElementById('ceilingAmount').value = '';
    document.getElementById('calculationMethod').value = '';
    document.getElementById('minCharge').value = '';
    document.getElementById('maximumCharge').value = '';
    document.getElementById('value').value = '';
    
    selectedChargeIndex = null;
    renderChargesTable();
}

function saveCharges() {
    console.log('Saving charges:', charges);
    // TODO: Connect to backend to save charges
    alert(`Charges saved successfully!\n\nTotal Charges: ${charges.length}`);
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
}

