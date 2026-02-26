/* Accounts Maintenance View - JavaScript Controller */

const ACCOUNTS_MAINTENANCE_CONTROLLER_BASE = 'AccountsMaintenance';

/**
 * Get AppCore reference (works in parent and iframe contexts)
 */
function getAppCore() {
    const win = window;
    return win.AppCore ||
        (win.parent && win.parent !== win && win.parent.AppCore) ||
        (win.top && win.top !== win && win.top.AppCore) ||
        null;
}

/**
 * Generic controller invoker for Accounts Maintenance
 */
function invokeAccountsMaintenanceController(action, requestData) {
    return new Promise((resolve, reject) => {
        const appCore = getAppCore();
        if (!appCore || typeof appCore.invokeController !== 'function') {
            reject(new Error('AppCore is not available (AppCore.invokeController not found)'));
            return;
        }

        const endpoint = `${ACCOUNTS_MAINTENANCE_CONTROLLER_BASE}/${action}`;
        appCore.invokeController(endpoint, requestData || {}, (error, response) => {
            if (error) {
                reject(error);
            } else {
                resolve(response);
            }
        });
    });
}

/**
 * Service object with all Accounts Maintenance operations
 */
const AccountsMaintenanceService = {
    searchAccounts(requestData) {
        return invokeAccountsMaintenanceController('search-accounts', requestData);
    },
    
    getAccount(requestData) {
        return invokeAccountsMaintenanceController('get-account', requestData);
    },
    
    updateAccount(requestData) {
        return invokeAccountsMaintenanceController('update-account', requestData);
    },
    
    createAccount(requestData) {
        return invokeAccountsMaintenanceController('create-account', requestData);
    }
};

// Export to window for global access
window.AccountsMaintenanceService = AccountsMaintenanceService;

// ============================================================================
// DOM Interaction Logic
// ============================================================================

/**
 * Show a message to the user
 */
function showMessage(message, type = 'info') {
    // Try to use global message panel if available
    const messagePanel = document.querySelector('.am-message-panel');
    if (messagePanel) {
        const textElement = messagePanel.querySelector('span');
        if (textElement) {
            textElement.textContent = message;
            messagePanel.className = `am-message-panel am-message-panel--${type}`;
            messagePanel.style.display = 'flex';
            
            setTimeout(() => {
                messagePanel.style.display = 'none';
            }, 5000);
            return;
        }
    }
    
    // Fallback to alert
    alert(message);
}

/**
 * Populate search results table
 */
function populateSearchResults(accounts) {
    const resultsCard = document.getElementById('searchResultsCard');
    const tableBody = document.getElementById('accountsTableBody');
    
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (!accounts || accounts.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">No accounts found</td>
            </tr>
        `;
        resultsCard.style.display = 'block';
        return;
    }
    
    accounts.forEach(account => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${account.AccountNumber || 'N/A'}</td>
            <td>${account.AccountName || 'N/A'}</td>
            <td>${account.ProductCode || 'N/A'}</td>
            <td>${account.CurrencyCode || 'N/A'}</td>
            <td>
                <span class="badge bg-${account.Status === 'ACTIVE' ? 'success' : 'secondary'}">
                    ${account.Status || 'N/A'}
                </span>
            </td>
            <td>${account.Balance || '0.00'}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewAccountDetails('${account.AccountID || account.AccountNumber}')">
                    <i class="bi bi-eye"></i> View
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    resultsCard.style.display = 'block';
}

/**
 * View account details
 */
window.viewAccountDetails = async function(accountID) {
    try {
        const response = await AccountsMaintenanceService.getAccount({ AccountID: accountID });
        
        if (response.Success && response.Data) {
            const account = response.Data;
            
            // Populate form
            document.getElementById('detailAccountID').value = account.AccountID || '';
            document.getElementById('detailAccountNumber').value = account.AccountNumber || '';
            document.getElementById('detailAccountName').value = account.AccountName || '';
            document.getElementById('detailProductCode').value = account.ProductCode || '';
            document.getElementById('detailCurrency').value = account.CurrencyCode || '';
            document.getElementById('detailStatus').value = account.Status || 'ACTIVE';
            
            // Show the details card
            document.getElementById('accountDetailsCard').style.display = 'block';
            
            // Scroll to the form
            document.getElementById('accountDetailsCard').scrollIntoView({ behavior: 'smooth' });
        } else {
            showMessage(response.ErrorMessage || 'Failed to load account details', 'error');
        }
    } catch (error) {
        console.error('Error loading account details:', error);
        showMessage('Error loading account details: ' + error.message, 'error');
    }
};

/**
 * Hide account details form
 */
window.hideAccountDetails = function() {
    document.getElementById('accountDetailsCard').style.display = 'none';
};

/**
 * Initialize the module when DOM is ready
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Accounts Maintenance module initialized');
    
    // Wire up search form
    const searchForm = document.getElementById('accountSearchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(searchForm);
            const searchData = Object.fromEntries(formData.entries());
            
            // Remove empty fields
            Object.keys(searchData).forEach(key => {
                if (!searchData[key]) delete searchData[key];
            });
            
            try {
                console.log('Searching accounts with:', searchData);
                const response = await AccountsMaintenanceService.searchAccounts(searchData);
                
                if (response.Success) {
                    populateSearchResults(response.Data || response.Accounts || []);
                    showMessage(`Found ${response.Data?.length || 0} account(s)`, 'success');
                } else {
                    showMessage(response.ErrorMessage || 'Search failed', 'error');
                    populateSearchResults([]);
                }
            } catch (error) {
                console.error('Search error:', error);
                showMessage('Error searching accounts: ' + error.message, 'error');
            }
        });
    }
    
    // Wire up account details form
    const detailsForm = document.getElementById('accountDetailsForm');
    if (detailsForm) {
        detailsForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(detailsForm);
            const updateData = Object.fromEntries(formData.entries());
            
            try {
                console.log('Updating account with:', updateData);
                const response = await AccountsMaintenanceService.updateAccount(updateData);
                
                if (response.Success) {
                    showMessage('Account updated successfully', 'success');
                    
                    // Optionally refresh search results
                    const searchForm = document.getElementById('accountSearchForm');
                    if (searchForm) {
                        searchForm.dispatchEvent(new Event('submit'));
                    }
                    
                    // Hide details form after a delay
                    setTimeout(() => {
                        hideAccountDetails();
                    }, 1500);
                } else {
                    showMessage(response.ErrorMessage || 'Failed to update account', 'error');
                }
            } catch (error) {
                console.error('Update error:', error);
                showMessage('Error updating account: ' + error.message, 'error');
            }
        });
    }
});
