/**
 * Bill Contract Maintenance/Liquidation/Cancellation
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Load required services
    if (window.ServiceLoader) {
        try {
            await window.ServiceLoader.loadBillAccountService();
            console.log('BillAccountService loaded');
        } catch (error) {
            console.error('Failed to load BillAccountService:', error);
        }
    }
    // Handle "View" toggle
    document.querySelectorAll('.cm-nav-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const container = btn.closest('.cm-nav-section');
            const items = container.querySelector('.cm-nav-items');
            if (items) {
                items.hidden = !items.hidden;
                const icon = btn.querySelector('.bi');
                if (items.hidden) {
                    icon?.classList.replace('bi-chevron-down', 'bi-chevron-right');
                } else {
                    icon?.classList.replace('bi-chevron-right', 'bi-chevron-down');
                }
            }
        });
    });

    // Handle "DataEntry" sidebar buttons to open parent modals
    document.querySelectorAll('[data-open-parent-modal]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const modalId = btn.getAttribute('data-open-parent-modal');
            console.log('Opening modal:', modalId);

            // Check if we are inside an iframe and have access to parent
            if (window.parent && window.parent.bootstrap && window.parent.bootstrap.Modal) {
                const modalEl = window.parent.document.getElementById(modalId);
                if (modalEl) {
                    const modalInstance = window.parent.bootstrap.Modal.getOrCreateInstance(modalEl);
                    modalInstance.show();
                } else {
                    console.error('Modal element not found in parent document:', modalId);
                }
            } else {
                console.warn('Cannot access parent window or Bootstrap modal instance.');
            }
        });
    });

    // --- Application ID Search & Autofill ---
    const appIdInput = document.querySelector('input[name="ApplicationID"]');
    const searchBtn = appIdInput?.parentElement.querySelector('.btn-inline-search');

    // Create results container
    let resultsContainer = document.createElement('div');
    resultsContainer.className = 'search-results-dropdown list-group position-absolute shadow-sm';
    resultsContainer.style.zIndex = '1000';
    resultsContainer.style.maxHeight = '200px';
    resultsContainer.style.overflowY = 'auto';
    resultsContainer.style.display = 'none';

    if (appIdInput) {
        appIdInput.parentElement.style.position = 'relative';
        appIdInput.parentElement.appendChild(resultsContainer);
    }

    const closeResults = () => {
        resultsContainer.style.display = 'none';
        resultsContainer.innerHTML = '';
    };

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (appIdInput && !appIdInput.parentElement.contains(e.target)) {
            closeResults();
        }
    });

    if (searchBtn && appIdInput) {
        searchBtn.addEventListener('click', async () => {
            const searchTerm = appIdInput.value.trim();
            console.log('Searching for ApplicationID:', searchTerm);

            try {
                // Determine search term: if empty, maybe fetch recent or all? 
                // The service handles empty/null as 'all' or specific logic.
                // Ensuring we pass '%' if empty to match service logic if needed, 
                // but service likely handles null/empty.
                const query = searchTerm || '%';

                resultsContainer.innerHTML = '<div class="list-group-item">Searching...</div>';
                resultsContainer.style.display = 'block';

                if (window.BillAccountService) {
                    // Note: Service expects 'row' format or specific array. Adjust based on actual response.
                    const response = await window.BillAccountService.searchApplications(query);
                    console.log('Search response:', response);

                    resultsContainer.innerHTML = '';

                    // Assuming response is the data array or response.data
                    // Adjust based on actual API response structure (likely response.data or just response)
                    const data = response.data || response;

                    if (Array.isArray(data) && data.length > 0) {
                        data.forEach(item => {
                            // Item structure depends on p_GetSearchResult. 
                            // Usually returns Code/Description or similar.
                            // Assuming 'Code' is the ID. Be robust.
                            const id = item.Code || item.ApplicationID || item.ID;
                            const text = item.Description || item.Name || '';

                            const itemEl = document.createElement('button');
                            itemEl.type = 'button';
                            itemEl.className = 'list-group-item list-group-item-action';
                            itemEl.textContent = `${id} ${text ? '- ' + text : ''}`;

                            itemEl.addEventListener('click', () => {
                                selectApplication(id);
                            });

                            resultsContainer.appendChild(itemEl);
                        });
                    } else {
                        resultsContainer.innerHTML = '<div class="list-group-item text-muted">No results found</div>';
                    }
                } else {
                    console.error('BillAccountService not found');
                    resultsContainer.innerHTML = '<div class="list-group-item text-danger">Service unavailable</div>';
                }

            } catch (error) {
                console.error('Search failed:', error);
                resultsContainer.innerHTML = `<div class="list-group-item text-danger">Error: ${error.message}</div>`;
            }
        });
    }

    async function selectApplication(appId) {
        console.log('Selected ApplicationID:', appId);
        appIdInput.value = appId;
        closeResults();

        // Autofill form
        try {
            if (window.BillAccountService) {
                // Show loading state if needed?

                // Construct request data for p_GetAccountApplication
                // Need to verify what arguments p_GetAccountApplication needs. 
                // Service assumes { ApplicationID, AccountID, OperatorID... }
                const requestData = {
                    ApplicationID: appId,
                    OurBranchID: '0101', // Should ideally come from session/context
                    // Other fields might be needed?
                };

                const response = await window.BillAccountService.getAccountApplication(requestData);
                console.log('Autofill response:', response);

                if (response && response.data && response.data.length > 0) {
                    const record = response.data[0];
                    populateForm(record);
                }
            }
        } catch (error) {
            console.error('Autofill failed:', error);
        }
    }

    function populateForm(data) {
        const form = document.getElementById('bill-contract-form');
        if (!form) return;

        // Map data fields to form inputs
        // This mapping depends on the exact column names returned by p_GetAccountApplication
        // We'll try to match by name attribute (case-insensitive usually good but we do exact match first)

        Object.keys(data).forEach(key => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) {
                input.value = data[key];
            }
        });

        // Handle specific fields that might need formatting or transformation
        // e.g., checkboxes (IsMarginRequired) or dates
        if (data.IsMarginRequired !== undefined) {
            const chk = form.querySelector('[name="IsMarginRequired"]');
            if (chk) chk.checked = data.IsMarginRequired === 1 || data.IsMarginRequired === true || data.IsMarginRequired === 'true';
        }
    }
});
