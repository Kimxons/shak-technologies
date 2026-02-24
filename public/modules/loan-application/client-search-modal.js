/**
 * Client Search Modal JavaScript
 * Handles client search functionality for Loan Application
 */

(function(global) {
    'use strict';

    // State management
    let clientSearchData = [];
    let selectedClient = null;
    let currentPage = 1;
    let pageSize = 50;
    let totalPages = 1;
    let selectionCallback = null;  // Store callback properly

    // DOM Elements
    const elements = {
        modal: null,
        searchClientIdFilter: null,
        searchClientNameFilter: null,
        searchClientIdOperator: null,
        searchClientNameOperator: null,
        btnSearchClients: null,
        btnClearClientSearch: null,
        clientSearchResults: null,
        btnSelectClient: null,
        btnPrevClientPage: null,
        btnNextClientPage: null,
        clientPageInfo: null
    };

    // Initialize modal
    function initClientSearchModal() {
        // Load modal HTML first
        loadModalHTML().then(() => {
            setupDOMElements();
            attachEventListeners();
            console.log('Client Search Modal initialized');
        });
    }

    // Setup DOM Elements
    function setupDOMElements() {
        elements.modal = document.getElementById('clientSearchModal');
        elements.searchClientIdFilter = document.getElementById('searchClientIdFilter');
        elements.searchClientNameFilter = document.getElementById('searchClientNameFilter');
        elements.searchClientIdOperator = document.getElementById('searchClientIdOperator');
        elements.searchClientNameOperator = document.getElementById('searchClientNameOperator');
        elements.btnSearchClients = document.getElementById('btnSearchClients');
        elements.btnClearClientSearch = document.getElementById('btnClearClientSearch');
        elements.clientSearchResults = document.getElementById('clientSearchResults');
        elements.btnSelectClient = document.getElementById('btnSelectClient');
        elements.btnPrevClientPage = document.getElementById('btnPrevClientPage');
        elements.btnNextClientPage = document.getElementById('btnNextClientPage');
        elements.clientPageInfo = document.getElementById('clientPageInfo');
    }

    // Attach event listeners
    function attachEventListeners() {
        if (elements.btnSearchClients) {
            elements.btnSearchClients.addEventListener('click', handleClientSearch);
        }

        if (elements.btnClearClientSearch) {
            elements.btnClearClientSearch.addEventListener('click', clearClientSearch);
        }

        if (elements.btnSelectClient) {
            elements.btnSelectClient.addEventListener('click', selectClient);
        }

        if (elements.btnPrevClientPage) {
            elements.btnPrevClientPage.addEventListener('click', () => changePage(-1));
        }

        if (elements.btnNextClientPage) {
            elements.btnNextClientPage.addEventListener('click', () => changePage(1));
        }

        // Enter key to search
        [elements.searchClientIdFilter, elements.searchClientNameFilter].forEach(input => {
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        handleClientSearch();
                    }
                });
            }
        });
    }

    // Load modal HTML dynamically
    async function loadModalHTML() {
        try {
            const response = await fetch('client-search-modal.html');
            const html = await response.text();
            const container = document.getElementById('clientSearchModalContainer');
            if (container) {
                container.innerHTML = html;
            }
        } catch (error) {
            console.error('Error loading client search modal HTML:', error);
        }
    }

    // Open modal
    async function openClientSearchModal(callback) {
        // Make sure modal is initialized
        if (!elements.modal) {
            console.error('Modal not initialized yet, initializing now...');
            await loadModalHTML();
            setupDOMElements();
            attachEventListeners();
        }

        // Reset state first, then set callback (order matters!)
        clearClientSearch();
        selectionCallback = callback;
        console.log('Client search callback stored:', typeof selectionCallback);

        // Show modal
        const modalInstance = new bootstrap.Modal(elements.modal);
        modalInstance.show();
        
        // Ensure service is loaded
        if (!window.ClientSearchService) {
            console.log('Loading ClientSearchService...');
            try {
                await window.ServiceLoader.loadClientSearchService();
            } catch (error) {
                console.error('Failed to load ClientSearchService:', error);
            }
        }
        
        // Automatically load all clients when modal opens
        await performClientSearch();
    }

    // Handle client search button click
    async function handleClientSearch() {
        await performClientSearch();
    }
    
    // Perform client search using API
    async function performClientSearch() {
        try {
            // Show loading state
            elements.clientSearchResults.innerHTML = `
                <tr>
                    <td colspan="3" class="no-results">
                        <i class="bi bi-hourglass-split"></i>
                        Searching clients...
                    </td>
                </tr>
            `;

            // Get search criteria from inputs
            const searchCriteria = {};
            if (elements.searchClientIdFilter && elements.searchClientIdFilter.value.trim()) {
                searchCriteria.clientId = elements.searchClientIdFilter.value.trim();
                searchCriteria.clientIdOperator = elements.searchClientIdOperator?.value || 'like';
            }
            if (elements.searchClientNameFilter && elements.searchClientNameFilter.value.trim()) {
                searchCriteria.clientName = elements.searchClientNameFilter.value.trim();
                searchCriteria.clientNameOperator = elements.searchClientNameOperator?.value || 'like';
            }

            // Call API - returns array directly
            const clients = await window.ClientSearchService.searchClients(searchCriteria);
            
            // Handle response - it's already an array from the service
            if (Array.isArray(clients)) {
                clientSearchData = clients.map(client => ({
                    ClientID: client.ClientID,
                    Name: client.Name
                }));

                currentPage = 1;
                totalPages = Math.ceil(clientSearchData.length / pageSize) || 1;
                selectedClient = null;
                if (elements.btnSelectClient) elements.btnSelectClient.disabled = true;

                displayClientResults();
            } else {
                throw new Error('Unexpected response format from client search');
            }
        } catch (error) {
            console.error('Error searching clients:', error);
            elements.clientSearchResults.innerHTML = `
                <tr>
                    <td colspan="3" class="no-results">
                        <i class="bi bi-exclamation-triangle"></i>
                        Error: ${error.message || 'Failed to search clients'}
                    </td>
                </tr>
            `;
            clientSearchData = [];
            updatePaginationButtons();
        }
    }

    // Display client results
    function displayClientResults() {
        if (!clientSearchData || clientSearchData.length === 0) {
            elements.clientSearchResults.innerHTML = `
                <tr>
                    <td colspan="3" class="text-center text-muted">
                        <i class="bi bi-inbox"></i> No clients found matching your search criteria.
                    </td>
                </tr>
            `;
            updatePaginationButtons();
            return;
        }

        // Calculate pagination
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, clientSearchData.length);
        const pageData = clientSearchData.slice(startIndex, endIndex);

        // Build table rows
        let html = '';
        pageData.forEach((client, index) => {
            const rowNum = startIndex + index + 1;
            html += `
                <tr class="client-row" data-client-id="${client.ClientID}" data-client-name="${client.Name}" style="cursor: pointer;">
                    <td class="text-center">${rowNum}</td>
                    <td>${client.ClientID}</td>
                    <td>${client.Name || ''}</td>
                </tr>
            `;
        });

        elements.clientSearchResults.innerHTML = html;

        // Attach click handlers to rows
        document.querySelectorAll('.client-row').forEach(row => {
            row.addEventListener('click', function() {
                // Remove previous selection
                document.querySelectorAll('.client-row').forEach(r => r.classList.remove('table-active'));
                
                // Highlight selected row
                this.classList.add('table-active');
                
                // Store selected client
                selectedClient = {
                    ClientID: this.dataset.clientId,
                    Name: this.dataset.clientName
                };
                
                // Enable select button
                elements.btnSelectClient.disabled = false;
            });

            // Double-click to select
            row.addEventListener('dblclick', function() {
                selectedClient = {
                    ClientID: this.dataset.clientId,
                    Name: this.dataset.clientName
                };
                selectClient();
            });
        });

        updatePaginationButtons();
    }

    // Update pagination buttons
    function updatePaginationButtons() {
        elements.btnPrevClientPage.disabled = currentPage <= 1;
        elements.btnNextClientPage.disabled = currentPage >= totalPages;
        elements.clientPageInfo.textContent = `Page ${currentPage} of ${totalPages} (${clientSearchData.length} results)`;
    }

    // Change page
    function changePage(direction) {
        currentPage += direction;
        if (currentPage < 1) currentPage = 1;
        if (currentPage > totalPages) currentPage = totalPages;
        displayClientResults();
    }

    // Select client
    function selectClient() {
        console.log('selectClient called');
        console.log('selectedClient:', selectedClient);
        console.log('selectionCallback:', typeof selectionCallback);
        
        if (!selectedClient) {
            showMessage('Please select a client from the list', 'warning');
            return;
        }

        // Call callback if provided
        if (typeof selectionCallback === 'function') {
            console.log('Invoking client callback with:', selectedClient);
            try {
                selectionCallback(selectedClient);
                console.log('Client callback executed successfully');
            } catch (error) {
                console.error('Error calling client callback:', error);
            }
        } else {
            console.warn('No callback function provided');
        }

        // Close modal
        const modalInstance = bootstrap.Modal.getInstance(elements.modal);
        if (modalInstance) {
            modalInstance.hide();
        }
    }

    // Clear search
    function clearClientSearch() {
        elements.searchClientIdFilter.value = '';
        elements.searchClientNameFilter.value = '';
        elements.searchClientIdOperator.value = 'like';
        elements.searchClientNameOperator.value = 'like';
        clientSearchData = [];
        selectedClient = null;
        currentPage = 1;
        totalPages = 1;
        elements.btnSelectClient.disabled = true;
        elements.clientSearchResults.innerHTML = `
            <tr>
                <td colspan="3" class="text-center text-muted">
                    <i class="bi bi-search"></i> No results. Click Search to find clients.
                </td>
            </tr>
        `;
        updatePaginationButtons();
    }

    // Show message
    function showMessage(message, type = 'info') {
        if (window.NotificationService) {
            window.NotificationService.showToast(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
            alert(message);
        }
    }

    // Initialize on DOM load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initClientSearchModal);
    } else {
        initClientSearchModal();
    }

    // Expose public API
    global.ClientSearchModal = {
        open: openClientSearchModal,
        init: initClientSearchModal
    };

})(window);
