/**
 * API Endpoints Constants for Frontend
 * Mirrors ApiEndpointConstants.cs structure
 * These are the CONTROLLER routes (AccountsMaintenanceController) that channel to backend API
 */

(function (global) {
    'use strict';

    // Base Controller Routes
    const ACCOUNTS_MAINTENANCE_BASE = 'AccountsMaintenance/api';

    /**
     * Account Maintenance Controller Endpoints
     */
    const AccountMaintenanceEndpoints = {
        // Notes
        GET_NOTES: `${ACCOUNTS_MAINTENANCE_BASE}/get-notes`,
        UPDATE_NOTES: `${ACCOUNTS_MAINTENANCE_BASE}/update-notes`,

        // Documents
        GET_ACCOUNT_DOCUMENT: `${ACCOUNTS_MAINTENANCE_BASE}/get-account-document`,
        ADD_ACCOUNT_DOCUMENT: `${ACCOUNTS_MAINTENANCE_BASE}/add-account-document`,
        UPDATE_ACCOUNT_DOCUMENT: `${ACCOUNTS_MAINTENANCE_BASE}/update-account-document`,
        DELETE_ACCOUNT_DOCUMENT: `${ACCOUNTS_MAINTENANCE_BASE}/delete-account-document`,

        // Freeze/Release
        GET_ACCOUNT_FREEZE: `${ACCOUNTS_MAINTENANCE_BASE}/get-account-freeze`,
        ADD_ACCOUNT_FREEZE: `${ACCOUNTS_MAINTENANCE_BASE}/add-account-freeze`,
        RELEASE_ACCOUNT_FREEZE: `${ACCOUNTS_MAINTENANCE_BASE}/release-account-freeze`,

        // Cheque Book
        GET_CHEQUE_BOOKS: `${ACCOUNTS_MAINTENANCE_BASE}/get-cheque-books`,
        GET_CHEQUE_BOOK_REQUESTS: `${ACCOUNTS_MAINTENANCE_BASE}/get-cheque-book-requests`,
        ADD_CHEQUE_BOOK: `${ACCOUNTS_MAINTENANCE_BASE}/add-cheque-book`,

        // Reminders
        GET_ACCOUNT_REMINDERS: `${ACCOUNTS_MAINTENANCE_BASE}/get-account-reminders`,
        ADD_ACCOUNT_REMINDER: `${ACCOUNTS_MAINTENANCE_BASE}/add-account-reminder`,
        UPDATE_ACCOUNT_REMINDER: `${ACCOUNTS_MAINTENANCE_BASE}/update-account-reminder`,
        DELETE_ACCOUNT_REMINDER: `${ACCOUNTS_MAINTENANCE_BASE}/delete-account-reminder`,

        // Core Account
        SEARCH_ACCOUNTS: 'AccountsMaintenance/search-accounts',
        GET_ACCOUNT: 'AccountsMaintenance/get-account',
        UPDATE_ACCOUNT: 'AccountsMaintenance/update-account',
        CREATE_ACCOUNT: 'AccountsMaintenance/create-account'
    };

    /**
     * Shared Search Endpoints
     */
    const SharedEndpoints = {
        GET_SYSTEM_SEARCH: 'api/v1/Shared/GetSystemSearch',
        GET_SYSTEM_SEARCH_RESULT: 'api/v1/Shared/GetSystemSearchResult'
    };

    /**
     * Export to global scope
     */
    global.ApiEndpoints = {
        AccountMaintenance: AccountMaintenanceEndpoints,
        Shared: SharedEndpoints
    };

    console.log('✅ [API-ENDPOINTS] Constants loaded successfully');

})(typeof window !== 'undefined' ? window : global);
