# Limits & Collateral - Required Fixes

## Summary
The **limit-collaterals** main module is fully functional ✅  
The **client-limit** submodule needs completion ⚠️

---

## Client Limit Module - Required Fixes

### 1. Implement Save Function (HIGH PRIORITY)
**File:** `public/modules/limits-collateral/client-limit/client-limit.js`  
**Lines:** 143-151

**Current Status:** Stubbed with setTimeout  
**Required:** Implement actual API calls

**Implementation:**
```javascript
async function saveRecord() {
    if (currentMode === 'VIEW') return;
    
    // Add validation
    if (!validateForm()) return;
    
    showMessage('Saving record...', 'info');
    
    // Disable button during save
    if (els.btnSave) {
        els.btnSave.disabled = true;
        els.btnSave.innerHTML = '<i class="bi bi-hourglass-split"></i> Saving...';
    }
    
    const data = {
        OurBranchID: els.branchId.value,
        LimitID: els.limitId.value,
        RefNo: els.referenceNo.value,
        ClientID: els.clientId.value,
        CurrencyID: els.currencyId.value,
        LimitLevel: els.limitLevel.value,
        LimitType: els.limitType.value,
        EffectiveDate: els.effectiveDate.value,
        ExpiryDate: els.expiryDate.value,
        SanctionedDate: els.sanctionedDate.value,
        DpDefinition: els.dpDefinition.value,
        Sanctionedlimit: els.sanctionedLimit.value.replace(/,/g, ''),
        DrawingPower: els.drawingPower.value.replace(/,/g, ''),
        Remarks: els.remarks.value,
        OperatorID: window.Environment?.operatorID || "STEVE"
    };
    
    try {
        const apiCall = currentMode === 'ADD' 
            ? LimitsCollateralService.createLimitClient(data)
            : LimitsCollateralService.updateLimitClient(data);
            
        const result = await apiCall;
        
        if (result.success) {
            showMessage('Record saved successfully.', 'success');
            currentData = data;
            switchMode('VIEW');
            // Reload to get server-generated fields
            await loadRecord();
        } else {
            showMessage(result.message || 'Failed to save record', 'error');
        }
    } catch (err) {
        console.error('Error saving record:', err);
        showMessage('Error saving record.', 'error');
    } finally {
        // Re-enable button
        if (els.btnSave) {
            els.btnSave.disabled = false;
            els.btnSave.innerHTML = '<i class="bi bi-save2 me-2"></i>Save';
        }
    }
}
```

---

### 2. Add Form Validation (HIGH PRIORITY)
**File:** `public/modules/limits-collateral/client-limit/client-limit.js`  
**Location:** Add after line 192

**Required:** Create validateForm() function

**Implementation:**
```javascript
function validateForm() {
    const requiredFields = [
        { field: els.branchId, name: 'Branch ID' },
        { field: els.limitId, name: 'Limit ID' },
        { field: els.clientId, name: 'Client ID' },
        { field: els.currencyId, name: 'Currency ID' },
        { field: els.limitLevel, name: 'Limit Level' },
        { field: els.limitType, name: 'Limit Type' },
        { field: els.sanctionedLimit, name: 'Sanctioned Limit' }
    ];

    // Remove previous validation states
    requiredFields.forEach(({ field }) => {
        if (field) {
            field.classList.remove('is-invalid');
            field.classList.remove('is-valid');
        }
    });

    // Validate each field
    let isValid = true;
    let firstInvalidField = null;

    for (const { field, name } of requiredFields) {
        if (!field) continue;
        
        const value = field.value ? field.value.trim() : '';
        
        if (!value || value === '' || value === '--Select--') {
            field.classList.add('is-invalid');
            if (!firstInvalidField) {
                firstInvalidField = field;
                showMessage(`${name} is required`, 'error');
            }
            isValid = false;
        } else {
            field.classList.add('is-valid');
        }
    }

    if (firstInvalidField) {
        firstInvalidField.focus();
    }

    return isValid;
}
```

---

### 3. Implement Withdraw Function (MEDIUM PRIORITY)
**File:** `public/modules/limits-collateral/client-limit/client-limit.js`  
**Lines:** 153-162

**Current Status:** Stubbed with setTimeout  
**Issue:** No `withdrawLimitClient` API method exists

**Options:**
1. If withdraw means delete, use `deleteLimitClient`
2. If withdraw means update status, use `updateLimitClient` with status field
3. If a stored procedure exists, add method to service

**Recommended Implementation (Option 2 - Update Status):**
```javascript
async function withdrawRecord() {
    if (!currentData) {
        showMessage('No record loaded to withdraw', 'warning');
        return;
    }
    
    if (!confirm('Are you sure you want to withdraw this limit?')) return;
    
    showMessage('Withdrawing limit...', 'info');
    
    // Disable button
    if (els.btnWithdraw) {
        els.btnWithdraw.disabled = true;
        els.btnWithdraw.innerHTML = '<i class="bi bi-hourglass-split"></i> Withdrawing...';
    }
    
    try {
        const data = {
            OurBranchID: els.branchId.value,
            LimitID: els.limitId.value,
            Status: 'WITHDRAWN', // or appropriate status value
            WithdrawnDate: new Date().toISOString().split('T')[0],
            WithdrawnReason: prompt('Enter reason for withdrawal:') || 'Withdrawn',
            OperatorID: window.Environment?.operatorID || "STEVE"
        };
        
        const result = await LimitsCollateralService.updateLimitClient(data);
        
        if (result.success) {
            showMessage('Limit withdrawn successfully.', 'success');
            await loadRecord();
        } else {
            showMessage(result.message || 'Failed to withdraw limit', 'error');
        }
    } catch (err) {
        console.error('Error withdrawing limit:', err);
        showMessage('Error withdrawing limit.', 'error');
    } finally {
        // Re-enable button
        if (els.btnWithdraw) {
            els.btnWithdraw.disabled = false;
            els.btnWithdraw.innerHTML = '<i class="bi bi-arrow-down-circle me-2"></i>Withdraw';
        }
    }
}
```

---

### 4. Implement Navigation (LOW PRIORITY)
**File:** `public/modules/limits-collateral/client-limit/client-limit.js`  
**Lines:** 204-205

**Current Status:** Empty placeholder comments

**Implementation:**
```javascript
// Replace lines 204-205 with:
if (els.btnPrevious) els.btnPrevious.addEventListener('click', navigatePrevious);
if (els.btnNext) els.btnNext.addEventListener('click', navigateNext);

// Add these functions after withdrawRecord():
async function navigatePrevious() {
    if (!els.limitId.value.trim()) {
        showMessage('No limit ID selected', 'warning');
        return;
    }
    
    showMessage('Loading previous record...', 'info');
    
    try {
        const resp = await LimitsCollateralService.getLimitClients({
            OurBranchID: els.branchId.value,
            LimitID: els.limitId.value,
            Direction: "0" // 0 for previous
        });
        
        if (resp.success && resp.data?.Details02?.[0]) {
            const data = resp.data.Details02[0];
            els.limitId.value = data.LimitID || els.limitId.value;
            await loadRecord();
        } else {
            showMessage('No previous record found', 'info');
        }
    } catch (err) {
        console.error('Error navigating to previous record:', err);
        showMessage('Error loading previous record', 'error');
    }
}

async function navigateNext() {
    if (!els.limitId.value.trim()) {
        showMessage('No limit ID selected', 'warning');
        return;
    }
    
    showMessage('Loading next record...', 'info');
    
    try {
        const resp = await LimitsCollateralService.getLimitClients({
            OurBranchID: els.branchId.value,
            LimitID: els.limitId.value,
            Direction: "1" // 1 for next
        });
        
        if (resp.success && resp.data?.Details02?.[0]) {
            const data = resp.data.Details02[0];
            els.limitId.value = data.LimitID || els.limitId.value;
            await loadRecord();
        } else {
            showMessage('No next record found', 'info');
        }
    } catch (err) {
        console.error('Error navigating to next record:', err);
        showMessage('Error loading next record', 'error');
    }
}
```

---

## Optional Enhancements (Both Modules)

### 5. Add Loading States to Limit Collaterals (OPTIONAL)
**File:** `public/modules/limits-collateral/limit-collaterals.js`

Add button disabling and loading indicators to:
- `saveLimitCollateral()` (line 244)
- `deleteLimitCollateral()` (line 288)
- `navigatePrevious()` (line 343)
- `navigateNext()` (line 386)

**Example Pattern:**
```javascript
// Before API call
btnSave.disabled = true;
const originalText = btnSave.innerHTML;
btnSave.innerHTML = '<i class="spinner"></i> Saving...';

try {
    // ... API call ...
} finally {
    btnSave.disabled = false;
    btnSave.innerHTML = originalText;
}
```

---

## Testing Checklist

After implementing fixes, test:

### Client Limit Module
- [ ] Load existing limit (enter Limit ID and press Enter)
- [ ] Add new limit (click Add, fill form, click Save)
- [ ] Edit existing limit (load limit, click Edit, modify, click Save)
- [ ] Withdraw limit (load limit, click Withdraw)
- [ ] Navigate Previous (load limit, click Previous)
- [ ] Navigate Next (load limit, click Next)
- [ ] Form validation (try to save with empty required fields)
- [ ] Cancel operation (make changes, click Cancel)

### Limit Collaterals Module
- [ ] Load existing collateral
- [ ] Add new collateral
- [ ] Edit existing collateral
- [ ] Delete collateral
- [ ] Navigate Previous/Next
- [ ] Search for Limit
- [ ] Search for Collateral
- [ ] Form validation

---

## Priority Order

1. **CRITICAL:** Implement save function in client-limit
2. **CRITICAL:** Add form validation in client-limit
3. **HIGH:** Implement withdraw function in client-limit
4. **MEDIUM:** Implement navigation in client-limit
5. **LOW:** Add loading states to both modules
