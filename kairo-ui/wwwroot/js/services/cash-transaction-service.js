/**
 * Cash Transaction Service
 * Handles API communication with BR.Net legacy system via /api/OldAPI bridge
 * Provides data caching, CRUD operations, and overlay component state management
 * 
 * @version 1.0.0
 * @date February 2026
 */

const CashTransactionService = (function () {
    'use strict';

    // ============================================================================
    // CONFIGURATION
    // ============================================================================
    const API_ENDPOINT = '/api/OldAPI';
    const MODULE_ID = 3000; // Cash Transaction Module

    // ============================================================================
    // STATE MANAGEMENT - Cached data from last fetch
    // ============================================================================
    let _cachedAccountInfo = null;
    let _cachedTransactionDetails = null;
    let _cachedSignatories = [];
    let _lastFetchParams = null;

    // ============================================================================
    // API WRAPPER - Core function for all SP calls
    // ============================================================================

    async function callOldAPI(spName, params) {
        try {
            if (typeof CoreApi === 'undefined') {
                throw new Error('CoreApi not loaded');
            }

            // Determine full URL using Environment if available to avoid 502 proxy issues
            let fullUrl = API_ENDPOINT;
            if (window.Environment && window.Environment.baseUrlCommon) {
                const baseUrl = window.Environment.baseUrlCommon.replace(/\/+$/, "");
                fullUrl = `${baseUrl}${API_ENDPOINT}`;
            }

            // Use CoreApi to handle request envelope and normalization
            const envelope = CoreApi.makeRequestEnvelope(spName, params);
            const response = await CoreApi.post(fullUrl, envelope);

            if (!response.success) {
                // Handle specific BR.Net error codes returned in message
                if (response.message && response.message.startsWith('BREXDB')) {
                    throw new Error(translateErrorCode(response.message));
                }
                throw new Error(response.message || 'API request failed');
            }

            return { success: true, data: response.data };
        } catch (error) {
            console.error(`[CashTransactionService] callOldAPI(${spName}) failed:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Translate BR.Net error codes to user-friendly messages
     */
    function translateErrorCode(code) {
        const errorMap = {
            'BREXDB300001': 'Invalid Transaction - Transaction not found',
            'BREXDB300014': 'Transaction has been deleted',
            'BREXDB051022': 'Access denied - Insufficient privileges',
            'BREXDB300002': 'Credit transactions not allowed for this account class',
            'BREXDB300004': 'Debit transactions not allowed for this account class',
            'BREXDB300008': 'Insufficient balance for this transaction',
            'BREXDB300033': 'Insufficient available balance',
            'BREXDB300039': 'Cannot delete supervised transaction',
            'BREXDB300051': 'Amount exceeds approved limit',
            'BREXDB005305': 'Record has been modified by another user',
            'BREXDB005310': 'Record not found or already deleted',
            'BREXDB005339': 'Amount below minimum withdrawal limit',
            'BREXDB222024': 'Daily withdrawal limit exceeded',
            'BREXDB301003': 'Branch date mismatch - Cannot process transaction',
            'BREXDB313005': 'Pending till transaction exists',
            'BREXDB600006': 'Unsupervised transactions from previous date exist',
            'BREXDB817051': 'Inter-branch GL configuration missing'
        };
        return errorMap[code] || `System Error: ${code}`;
    }

    // ============================================================================
    // DATA FETCHING - p_GetCashTrx
    // ============================================================================

    /**
     * Fetch cash transaction data and cache it
     * @param {Object} params - { TrxBranchID, SerialID, OperatorID, ModuleID }
     * @returns {Promise<Object>} - { accountInfo, transactionDetails }
     */
    async function fetchCashTransaction(params) {
        const spParams = {
            TrxBranchID: params.TrxBranchID || params.trxBranchId,
            OurBranchID: params.OurBranchID || params.ourBranchId || null,
            SerialID: parseInt(params.SerialID || params.serialId, 10),
            OperatorID: params.OperatorID || params.operatorId || getCurrentOperatorID(),
            ModuleID: params.ModuleID || params.moduleId || MODULE_ID
        };

        const result = await callOldAPI('p_GetCashTrx', spParams);

        if (result.success && result.data) {
            // SP returns two result sets - parse accordingly
            _cachedAccountInfo = parseAccountInfo(result.data);
            _cachedTransactionDetails = parseTransactionDetails(result.data);
            _lastFetchParams = spParams;

            // Dispatch event for UI components
            document.dispatchEvent(new CustomEvent('cashtrx:dataLoaded', {
                detail: {
                    accountInfo: _cachedAccountInfo,
                    transactionDetails: _cachedTransactionDetails
                }
            }));

            return {
                success: true,
                accountInfo: _cachedAccountInfo,
                transactionDetails: _cachedTransactionDetails
            };
        }

        return result;
    }

    /**
     * Helper for case-insensitive field lookup
     */
    function getField(obj, key) {
        if (!obj) return null;
        if (obj[key] !== undefined) return obj[key];
        const lowerKey = key.toLowerCase();
        const actualKey = Object.keys(obj).find(k => k.toLowerCase() === lowerKey);
        return actualKey ? obj[actualKey] : null;
    }

    /**
     * Parse account info from SP response (first result set)
     */
    function parseAccountInfo(data) {
        if (!data) return null;

        let record = null;
        let root = data;

        // Peel array if it's a wrapper
        if (Array.isArray(data) && data.length > 0) {
            root = data[0];
            if (root && (root.Details01 || root.details01)) {
                record = Array.isArray(root.Details01 || root.details01) ? (root.Details01 || root.details01)[0] : (root.Details01 || root.details01);
            } else {
                record = root;
            }
        } else {
            if (data.Details01 || data.details01) {
                record = Array.isArray(data.Details01 || data.details01) ? (data.Details01 || data.details01)[0] : (data.Details01 || data.details01);
            } else {
                record = data.AccountInfo || data;
            }
        }

        if (!record || typeof record !== 'object') return null;

        // Use case-insensitive helper for all fields
        return {
            ourBranchId: getField(record, 'OurBranchID') || getField(record, 'BranchID'),
            branchName: getField(record, 'BranchName'),
            accountName: getField(record, 'AccountName'),
            accountId: getField(record, 'AccountID'),
            clearBalance: parseFloat(getField(record, 'ClearBalance')) || 0,
            unclearBalance: parseFloat(getField(record, 'UnclearBalance')) || 0,
            drawingPower: parseFloat(getField(record, 'DrawingPower')) || 0,
            freezedAmount: parseFloat(getField(record, 'FreezedAmount')) || 0,
            minimumBalance: parseFloat(getField(record, 'MinimumBalance')) || 0,
            availableBalance: parseFloat(getField(record, 'AvailableBalance')) || 0,
            depositBalance: parseFloat(getField(record, 'DepositBalance')) || 0,
            totalBalance: parseFloat(getField(record, 'TotalBalance')) || 0,
            productId: getField(record, 'ProductID'),
            productName: getField(record, 'ProductName'),
            productTypeId: getField(record, 'ProductTypeID'),
            accountClassId: getField(record, 'AccountClassID'),
            currencyId: getField(record, 'CurrencyID'),
            unSupervisedCredits: parseFloat(getField(record, 'UnSupervisedCredits')) || 0,
            unSupervisedDebits: parseFloat(getField(record, 'UnSupervisedDebits')) || 0,
            dayStatus: getField(record, 'DayStatus'),
            systemDate: getField(record, 'SystemDate'),
            updateCount: getField(record, 'UpdateCount')
        };
    }

    /**
     * Parse transaction details from SP response (second result set)
     */
    function parseTransactionDetails(data) {
        if (!data) return [];

        let records = [];
        let root = data;

        if (Array.isArray(data) && data.length > 0) {
            root = data[0];
            if (root && (root.Details02 || root.details02)) {
                records = root.Details02 || root.details02;
            } else if (data.length > 1) {
                records = data[1];
            } else {
                records = data;
            }
        } else {
            if (data.Details02 || data.details02) {
                records = data.Details02 || data.details02;
            } else {
                records = data.TransactionDetails || data.Transactions || data;
            }
        }

        if (!Array.isArray(records)) records = records ? [records] : [];

        return records.map(rec => ({
            trxRowId: getField(rec, 'TrxRowID'),
            trxBatchId: getField(rec, 'TrxBatchID'),
            trxTypeId: getField(rec, 'TrxTypeID'),
            basicTrxTypeId: getField(rec, 'BasicTrxTypeID'),
            accountTypeId: getField(rec, 'AccountTypeID'),
            accountId: getField(rec, 'AccountID'),
            instrumentTypeId: getField(rec, 'InstrumentTypeID'),
            chequeId: getField(rec, 'ChequeID') || getField(rec, 'InstrumentID'),
            chequeDate: getField(rec, 'ChequeDate') || getField(rec, 'InstrumentDate'),
            referenceNo: getField(rec, 'ReferenceNo'),
            remarks: getField(rec, 'Remarks'),
            trxDescriptionId: getField(rec, 'TrxDescriptionID'),
            trxDescription: getField(rec, 'TrxDescription'),
            amount: parseFloat(getField(rec, 'Amount')) || 0,
            exchangeRate: parseFloat(getField(rec, 'ExchangeRate')) || 1,
            profit: parseFloat(getField(rec, 'Profit')) || 0,
            localAmount: parseFloat(getField(rec, 'LocalAmount')) || 0,
            trxCurrencyId: getField(rec, 'TrxCurrencyID') || getField(rec, 'CurrencyID'),
            currencyName: getField(rec, 'CurrencyName'),
            trxAmount: parseFloat(getField(rec, 'TrxAmount')) || getField(rec, 'Amount'),
            trxPrinted: getField(rec, 'TrxPrinted'),
            trxFlagId: getField(rec, 'TrxFlagID'),
            createdBy: getField(rec, 'CreatedBy'),
            createdOn: getField(rec, 'CreatedOn'),
            modifiedBy: getField(rec, 'ModifiedBy'),
            modifiedOn: getField(rec, 'ModifiedOn'),
            supervisedBy: getField(rec, 'SupervisedBy'),
            supervisedOn: getField(rec, 'SupervisedOn'),
            costCenterId: getField(rec, 'CostCenterID')
        }));
    }

    // ============================================================================
    // CRUD OPERATIONS
    // ============================================================================

    /**
     * Add a new cash transaction
     * @param {Object} trxData - Transaction data
     * @returns {Promise<Object>} - { success, serialId, trxBatchId }
     */
    async function addTransaction(trxData) {
        const params = {
            TrxBranchID: trxData.trxBranchId,
            OurBranchID: trxData.ourBranchId,
            AccountTypeID: trxData.accountTypeId || 'C',
            AccountID: trxData.accountId,
            ProductID: trxData.productId,
            ModuleID: trxData.moduleId || MODULE_ID,
            TrxTypeID: trxData.trxTypeId, // 'CC' = Cash Credit, 'CD' = Cash Debit
            TrxDate: trxData.trxDate || formatDateForAPI(new Date()),
            ValueDate: trxData.valueDate || trxData.trxDate,
            Amount: trxData.amount,
            LocalAmount: trxData.localAmount || trxData.amount,
            TrxCurrencyID: trxData.currencyId,
            TrxAmount: trxData.trxAmount || trxData.amount,
            ExchangeRate: trxData.exchangeRate || 1,
            MeanRate: trxData.meanRate || trxData.exchangeRate || 1,
            Profit: trxData.profit || 0,
            InstrumentTypeID: trxData.instrumentTypeId || 'V', // V=Voucher, C=Cheque, K=Counter
            ChequeID: trxData.chequeId || 0,
            ChequeDate: trxData.chequeDate || null,
            ReferenceNo: trxData.referenceNo || null,
            Remarks: trxData.remarks || null,
            TrxDescriptionID: trxData.trxDescriptionId,
            TrxDescription: trxData.trxDescription,
            MainGLID: trxData.mainGlId,
            ContraGLID: trxData.contraGlId || null,
            TrxFlagID: trxData.trxFlagId || '',
            ImageID: trxData.imageId || null,
            TrxPrinted: trxData.trxPrinted || 0,
            CreatedBy: trxData.createdBy || getCurrentOperatorID(),
            NewRecord: 1,
            CostCenterID: trxData.costCenterId || null
        };

        // Use appropriate SP based on whether it's inter-branch
        const spName = trxData.isInterBranch ? 'p_AddInterBranchTrx' : 'p_AddTrx';
        const result = await callOldAPI(spName, params);

        if (result.success) {
            // Dispatch success event
            document.dispatchEvent(new CustomEvent('cashtrx:transactionAdded', {
                detail: result.data
            }));
        }

        return result;
    }

    /**
     * Edit an existing transaction
     * @param {Object} trxData - { trxRowId, trxBranchId, trxDescription, referenceNo, remarks }
     */
    async function editTransaction(trxData) {
        const params = {
            TrxRowID: trxData.trxRowId,
            TrxBranchID: trxData.trxBranchId,
            TrxDescription: trxData.trxDescription,
            ReferenceNo: trxData.referenceNo,
            Remarks: trxData.remarks,
            OperatorID: trxData.operatorId || getCurrentOperatorID(),
            ModuleID: trxData.moduleId || MODULE_ID
        };

        const result = await callOldAPI('p_EditTrx', params);

        if (result.success) {
            document.dispatchEvent(new CustomEvent('cashtrx:transactionEdited', {
                detail: { trxRowId: trxData.trxRowId }
            }));
        }

        return result;
    }

    /**
     * Delete a transaction
     * @param {Object} trxData - { trxBranchId, trxBatchId, trxDate, deletedReason }
     */
    async function deleteTransaction(trxData) {
        const params = {
            TrxBranchID: trxData.trxBranchId,
            TrxBatchID: trxData.trxBatchId,
            TrxDate: trxData.trxDate || formatDateForAPI(new Date()),
            TrxFlagID: trxData.trxFlagId || 'C',
            DeletedReason: trxData.deletedReason || 'User requested deletion',
            DeletedBy: trxData.deletedBy || getCurrentOperatorID(),
            NewRecord: 2
        };

        const result = await callOldAPI('p_DeleteTrx', params);

        if (result.success) {
            document.dispatchEvent(new CustomEvent('cashtrx:transactionDeleted', {
                detail: { trxBatchId: trxData.trxBatchId }
            }));
        }

        return result;
    }

    // ============================================================================
    // CACHED DATA ACCESSORS
    // ============================================================================

    function getAccountInfo() {
        return _cachedAccountInfo;
    }

    function getTransactionDetails() {
        return _cachedTransactionDetails;
    }

    function getBalanceGrid() {
        if (!_cachedAccountInfo) return null;
        const info = _cachedAccountInfo;
        return {
            clear: { label: 'Clear Balance', value: info.clearBalance, currency: info.currencyId },
            unclear: { label: 'Unclear Balance', value: info.unclearBalance, currency: info.currencyId },
            drawingPower: { label: 'Drawing Power', value: info.drawingPower, currency: info.currencyId },
            frozen: { label: 'Frozen Amount', value: info.freezedAmount, currency: info.currencyId },
            minimum: { label: 'Minimum Balance', value: info.minimumBalance, currency: info.currencyId },
            available: { label: 'Available Balance', value: info.availableBalance, currency: info.currencyId },
            deposit: { label: 'Deposit Balance', value: info.depositBalance, currency: info.currencyId },
            total: { label: 'Total Balance', value: info.totalBalance, currency: info.currencyId }
        };
    }

    function clearCache() {
        _cachedAccountInfo = null;
        _cachedTransactionDetails = null;
        _cachedSignatories = [];
        _lastFetchParams = null;
    }

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================

    function getCurrentOperatorID() {
        // Try to get from session/localStorage or global variable
        return window.OPERATOR_ID || localStorage.getItem('operatorId') || 'SYSTEM';
    }

    function formatDateForAPI(date) {
        if (!date) return null;
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    }

    function formatCurrency(amount, currencyId = 'ETB') {
        const num = parseFloat(amount) || 0;
        return new Intl.NumberFormat('en-US', {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num);
    }

    // ============================================================================
    // PUBLIC API
    // ============================================================================
    return {
        // Core API wrapper
        callOldAPI,

        // Data fetching
        fetchCashTransaction,

        // CRUD operations
        addTransaction,
        editTransaction,
        deleteTransaction,

        // Cached data accessors
        getAccountInfo,
        getTransactionDetails,
        getBalanceGrid,
        clearCache,

        // Utilities
        formatCurrency,
        formatDateForAPI,
        getCurrentOperatorID,
        translateErrorCode,

        // Constants
        MODULE_ID
    };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CashTransactionService;
}
