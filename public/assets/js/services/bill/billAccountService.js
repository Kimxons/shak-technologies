(function (global) {
    const CoreApi = global.CoreApi;
    const Environment = global.Environment || {};

    if (!CoreApi) {
        console.error("CoreApi is not loaded. Ensure services/shared/coreApi.js is included before billAccountService.js.");
        return;
    }

    // Using baseUrlCommon as default fallback if specific bill url isn't defined, or localhost
    const BASE_URL = (Environment.baseUrlCommon || "http://localhost:3306").replace(/\/+$/, "");

    const OLD_API_ENDPOINT = `${BASE_URL}/api/OldAPI`;

    const formatLegacyRequestTime = () => {
        const d = new Date();
        const pad2 = (n) => String(n).padStart(2, "0");
        const mm = pad2(d.getMonth() + 1);
        const dd = pad2(d.getDate());
        const yyyy = d.getFullYear();
        const hh = pad2(d.getHours());
        const mi = pad2(d.getMinutes());
        const ss = pad2(d.getSeconds());
        return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
    };

    const BillAccountService = {
        /**
         * Get Bill Account Application details
         * @param {object} requestData - { ApplicationID, AccountID, OperatorID, Direction, OurBranchID, BankID }
         * @returns {Promise} Normalized response
         */
        getAccountApplication(requestData) {
            // FormID matches the stored procedure name as per user request
            console.log("[BillAccountService] getAccountApplication called with:", requestData);
            const envelope = CoreApi.makeRequestEnvelope("p_GetAccountApplication", requestData);
            console.log("[BillAccountService] Request envelope:", envelope);
            console.log("[BillAccountService] Posting to:", OLD_API_ENDPOINT);

            const promise = CoreApi.post(OLD_API_ENDPOINT, envelope);
            promise.then(response => {
                console.log("[BillAccountService] getAccountApplication response:", response);
            }).catch(error => {
                console.error("[BillAccountService] getAccountApplication error:", error);
            });

            return promise;
        },

        /**
         * Get Bill Application details using p_GetBillApplication stored procedure
         * @param {object} requestData - { ApplicationID, OperatorID, Direction, OurBranchID, BankID }
         * @returns {Promise} Normalized response
         */
        getBillApplication(requestData = {}) {
            // Build a legacy-compliant envelope and coerce actual values
            const formId = "dbo.p_GetBillApplication";
            console.log("[BillAccountService] getBillApplication called with:", requestData);

            // Helper to pull from DOM if missing
            const getFormValue = (name) => {
                try { return document?.querySelector?.(`[name="${name}"]`)?.value?.toString()?.trim() || null; } catch { return null; }
            };

            const applicationId = (requestData.ApplicationID ?? getFormValue('HeaderApplicationID') ?? getFormValue('ApplicationID') ?? '').toString().trim();
            const operatorId = (requestData.OperatorID ?? this.getOperatorId() ?? '').toString().trim();
            const ourBranchId = (requestData.OurBranchID ?? getFormValue('HeaderBranchID') ?? getFormValue('BranchID') ?? this.getBranchId() ?? '').toString().trim();
            const bankId = (requestData.BankID ?? '00').toString().trim();
            const direction = Number(requestData.Direction ?? 0) || 0;

            const payload = {
                ApplicationID: applicationId,
                OperatorID: operatorId,
                Direction: direction,
                OurBranchID: ourBranchId,
                BankID: bankId
            };

            console.log("[BillAccountService] getBillApplication payload:", payload);

            const envelope = CoreApi.makeRequestEnvelope(formId, payload, "PROJECT_KAIRO");
            // Align with legacy fields exactly
            envelope.RequestID = formId;
            envelope.FormId = formId;
            envelope.FormID = formId;
            envelope.RequestTime = formatLegacyRequestTime();
            envelope.AppName = "PROJECT_KAIRO";
            envelope.Checksum = envelope.Checksum || "";

            console.log("[BillAccountService] getBillApplication envelope:", JSON.stringify(envelope, null, 2));
            console.log("[BillAccountService] Posting to:", OLD_API_ENDPOINT);

            const promise = CoreApi.post(OLD_API_ENDPOINT, envelope);
            promise.then(response => {
                console.log("[BillAccountService] getBillApplication response:", response);
            }).catch(error => {
                console.error("[BillAccountService] getBillApplication error:", error);
            });

            return promise;
        },

        /**
         * Add/Edit Bill Account Application (save)
         * Expected by backend: dbo.p_AddEditAccountApplication
         * @param {object} requestData - stored procedure params
         * @returns {Promise} Normalized response
         */
        addEditAccountApplication(requestData) {
            const formId = "dbo.p_AddEditAccountApplication";
            console.log("[BillAccountService] addEditAccountApplication called with:", requestData);

            const envelope = CoreApi.makeRequestEnvelope(formId, requestData, "PROJECT_KAIRO");

            // Align with sample request format used across this codebase.
            envelope.RequestID = formId;
            envelope.FormId = formId;
            envelope.FormID = formId;
            envelope.RequestTime = formatLegacyRequestTime();
            envelope.AppName = "PROJECT_KAIRO";
            envelope.Checksum = envelope.Checksum || "";

            console.log("[BillAccountService] addEditAccountApplication envelope:", envelope);
            return CoreApi.post(OLD_API_ENDPOINT, envelope);
        },

        /**
         * Delete Bill Account Application
         * Expected by backend: dbo.p_DeleteAccountApplication
         * @param {object} requestData - { ApplicationID, OurBranchID, AccountID }
         * @returns {Promise} Normalized response
         */
        deleteAccountApplication(requestData) {
            const formId = "dbo.p_DeleteAccountApplication";
            console.log("[BillAccountService] deleteAccountApplication called with:", requestData);

            const envelope = CoreApi.makeRequestEnvelope(formId, requestData, "PROJECT_KAIRO");

            envelope.RequestID = formId;
            envelope.FormId = formId;
            envelope.FormID = formId;
            envelope.RequestTime = formatLegacyRequestTime();
            envelope.AppName = "PROJECT_KAIRO";
            envelope.Checksum = envelope.Checksum || "";

            console.log("[BillAccountService] deleteAccountApplication envelope:", envelope);
            return CoreApi.post(OLD_API_ENDPOINT, envelope);
        },

        /**
         * Builds the correct search request envelope using p_GetSearchResult procedure
         * @param {string} tableId - Table identifier (ApplicationID, ClientID, BranchID, ProductID, AccountID)
         * @param {string} searchTerm - Search term to use in WHERE clause (empty for all)
         * @param {string} appName - Application name for search
         * @returns {object} Search request envelope
         */
        buildSearchEnvelope(tableId, searchTerm, appName, prevOrNext = 0) {
            const operatorId = this.getOperatorId();
            const branchId = this.getBranchId();

            // Normalize tableId to expected column names used by the stored procedure
            const columnMap = {
                'branchid': 'BranchID',
                'branchId': 'BranchID',
                'branch': 'BranchID',
                'clientid': 'ClientID',
                'clientId': 'ClientID',
                'approvedclientid': 'ClientID',
                'productid': 'ProductID',
                'accountid': 'AccountID',
                // Support BillAccountID
                'billaccountid': 'AccountID',
                'applicationid': 'ApplicationID',
                'application': 'ApplicationID',
                // Ensure BDApplicationID table searches on ApplicationID column
                'bdapplicationid': 'ApplicationID'
            };

            const normalizedKey = (tableId || '').toString();
            const lookupKey = normalizedKey.toLowerCase();
            const columnName = columnMap[lookupKey] || tableId;

            // Build WHERE clause
            let whereStmt = "";
            // Only add WHERE clause if searchTerm is not empty/null/undefined and not "%"
            if (searchTerm && searchTerm.trim() !== "" && searchTerm !== "%") {
                whereStmt = `${columnName} like '%${searchTerm}%'`;
            } else {
                whereStmt = ""; // As per user snippet @WhereStmt=N''
            }

            // AdvFilterString: For BDApplicationID and ApprovedClientID, scope by OurBranchID
            // For BillAccountID, scope by ClientID passed in extraArgs or handled within method
            const lowerTableId = (tableId || '').toString().toLowerCase();
            const isBranchScoped = ['bdapplicationid', 'approvedclientid'].includes(lowerTableId);

            let advFilterString = "";
            if (isBranchScoped) {
                advFilterString = `OurBranchID='${branchId}'`;
            }

            const requestData = {
                TableID: tableId,
                AdvFilterString: advFilterString,
                WhereStmt: whereStmt,
                PrevOrNext: prevOrNext,
                RefID: null,
                SearchKey: null,
                OperatorID: operatorId,
                ModuleID: (isBranchScoped || lowerTableId === 'billaccountid') ? 9917 : 8437,
                OurBranchID: branchId,
                LanguageID: "en"
            };

            console.log("[BillAccountService] built requestData:", JSON.stringify(requestData, null, 2));

            const envelope = CoreApi.makeRequestEnvelope("p_GetSearchResult", requestData, appName);
            // Log the actual envelope to verify against user snippet (though envelope structure depends on CoreApi)
            console.log("[BillAccountService] Search envelope generated");
            return envelope;
        },

        getOperatorId() {
            try {
                const session = global.AuthService?.getSession?.();
                const rawSession = session || JSON.parse(localStorage.getItem('nimble_auth_session') || '{}');

                const opId = rawSession?.operatorId ||
                    rawSession?.operatorID ||
                    rawSession?.OperatorId ||
                    rawSession?.OperatorID ||
                    rawSession?.UserID ||
                    rawSession?.userId ||
                    localStorage.getItem("OperatorID");

                if (!opId) {
                    console.warn("[BillAccountService] Warning: No OperatorID found in session ('nimble_auth_session').");
                }
                return opId;
            } catch (err) {
                console.error("[BillAccountService] Error getting OperatorID:", err);
                return null;
            }
        },

        getBranchId() {
            try {
                // Prefer current form's BranchID/ HeaderBranchID if present
                const formBranch = document?.querySelector?.('[name="HeaderBranchID"]')?.value
                    || document?.querySelector?.('[name="BranchID"]')?.value;
                if (formBranch && formBranch.trim() !== "") {
                    return formBranch.trim();
                }

                const session = global.AuthService?.getSession?.();
                return session?.branchId || session?.branchID || "0101";
            } catch {
                return "0101";
            }
        },

        async searchBranches(searchTerm, prevOrNext = 0) {
            console.log("[BillAccountService] searchBranches called with:", searchTerm, "prevOrNext:", prevOrNext);

            // Build envelope using pc_SearchSystemBranches format
            const envelope = {
                RequestID: "dbo.pc_SearchSystemBranches",
                FormId: "dbo.pc_SearchSystemBranches",
                RequestData: {
                    BankID: "00"
                },
                RequestTime: new Date().toLocaleString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                }).replace(/(\d+)\/(\d+)\/(\d+),/, '$1/$2/$3'),
                AppName: "PROJECT_KAIRO",
                Checksum: ""
            };

            console.log("[BillAccountService] searchBranches envelope:", JSON.stringify(envelope, null, 2));

            try {
                const response = await CoreApi.post(OLD_API_ENDPOINT, envelope);
                console.log("[BillAccountService] searchBranches response:", JSON.stringify(response, null, 2));
                return response;
            } catch (err) {
                console.error("[BillAccountService] searchBranches error:", err);
                throw err;
            }
        },

        async searchClients(searchTerm, prevOrNext = 0) {
            console.log("[BillAccountService] searchClients called with:", searchTerm, "prevOrNext:", prevOrNext);

            const operatorId = this.getOperatorId();
            const branchId = this.getBranchId();

            let whereStmt = "";
            const term = (searchTerm || "").trim();

            // Try different possible column names
            const possibleColumns = ['ClientID', 'ApprovedClientID', 'ClientCode', 'Client_ID', 'ID'];

            for (const columnName of possibleColumns) {
                try {
                    if (term && term !== "%") {
                        whereStmt = `${columnName} like '%${term}%'`;
                    } else {
                        whereStmt = "";
                    }

                    // First attempt: Search with branch filter
                    // Use branch-scoped module for ApprovedClientID searches (matches legacy behavior)
                    let requestData = {
                        TableID: "ApprovedClientID",
                        AdvFilterString: `OurBranchID='${branchId}'`,
                        WhereStmt: whereStmt,
                        PrevOrNext: prevOrNext,
                        RefID: null,
                        SearchKey: null,
                        OperatorID: operatorId,
                        ModuleID: 9917,
                        OurBranchID: branchId,
                        LanguageID: "en"
                    };

                    console.log(`[BillAccountService] searchClients trying column: ${columnName} WITH branch filter, requestData:`, JSON.stringify(requestData, null, 2));
                    let envelope = CoreApi.makeRequestEnvelope("p_GetSearchResult", requestData);

                    let response = await CoreApi.post(OLD_API_ENDPOINT, envelope);
                    console.log(`[BillAccountService] searchClients response (${columnName} with branch):`, JSON.stringify(response, null, 2));

                    // Check if response is successful
                    if (response?.success) {
                        // Check if we got actual results
                        const hasResults = (response.data?.Details01 && response.data.Details01.length > 0) ||
                            (response.data?.Details && response.data.Details.length > 0) ||
                            (response.Details && response.Details.length > 0);

                        if (hasResults) {
                            console.log(`[BillAccountService] searchClients succeeded with column: ${columnName} (with branch filter)`);
                            return response;
                        }

                        // If no results with branch filter, try without branch filter (cross-branch search)
                        console.log(`[BillAccountService] No results with branch filter, trying WITHOUT branch filter for column: ${columnName}`);
                        // If no results with branch filter, try without branch filter but keep module aligned
                        requestData = {
                            TableID: "ApprovedClientID",
                            AdvFilterString: "", // Remove branch filter
                            WhereStmt: whereStmt,
                            PrevOrNext: prevOrNext,
                            RefID: null,
                            SearchKey: null,
                            OperatorID: operatorId,
                            ModuleID: 9917,
                            OurBranchID: branchId,
                            LanguageID: "en"
                        };

                        console.log(`[BillAccountService] searchClients trying column: ${columnName} WITHOUT branch filter`);
                        envelope = CoreApi.makeRequestEnvelope("p_GetSearchResult", requestData);
                        response = await CoreApi.post(OLD_API_ENDPOINT, envelope);
                        console.log(`[BillAccountService] searchClients response (${columnName} without branch):`, JSON.stringify(response, null, 2));

                        if (response?.success) {
                            console.log(`[BillAccountService] searchClients succeeded with column: ${columnName} (without branch filter)`);
                            return response;
                        }
                    }

                    // If error is not about invalid column, don't retry
                    if (response?.message && !/Invalid column name/i.test(response.message)) {
                        console.log(`[BillAccountService] searchClients failed with non-column error: ${response.message}`);
                        return response;
                    }

                    console.warn(`[BillAccountService] Column '${columnName}' not found, trying next...`);
                } catch (err) {
                    console.error(`[BillAccountService] searchClients error with column '${columnName}':`, err);
                    // Continue to next column
                }
            }

            // If all columns fail, return error
            console.error("[BillAccountService] searchClients failed with all column attempts");
            return {
                success: false,
                message: "Unable to search clients. Column name mismatch.",
                code: "091"
            };
        },

        async searchBillAccounts(searchTerm, clientId, prevOrNext = 0) {
            console.log("[BillAccountService] searchBillAccounts called with:", searchTerm, "Client:", clientId);
            const envelope = this.buildSearchEnvelope("BillAccountID", searchTerm, "ACCOUNT_DATA", prevOrNext);

            // Override AdvFilterString for BillAccountID to use ClientID
            if (clientId) {
                envelope.RequestData.AdvFilterString = `ClientID='${clientId}'`;
            }

            console.log("[BillAccountService] searchBillAccounts envelope:", JSON.stringify(envelope, null, 2));
            try {
                const response = await CoreApi.post(OLD_API_ENDPOINT, envelope);
                return response;
            } catch (err) {
                console.error("[BillAccountService] searchBillAccounts error:", err);
                throw err;
            }
        },

        async searchProducts(searchTerm, prevOrNext = 0) {
            console.log("[BillAccountService] searchProducts called with:", searchTerm, "prevOrNext:", prevOrNext);
            const envelope = this.buildSearchEnvelope("productId", searchTerm, "PRODUCT_DATA", prevOrNext);
            console.log("[BillAccountService] searchProducts envelope:", JSON.stringify(envelope, null, 2));
            try {
                let response = await CoreApi.post(OLD_API_ENDPOINT, envelope);
                console.log("[BillAccountService] searchProducts response:", JSON.stringify(response, null, 2));
                if (!response?.success && /Invalid column name/i.test(response?.message || '')) {
                    console.warn('[BillAccountService] searchProducts: server reported invalid column; attempting fallback columns');
                    const candidates = ['ProductID', 'ProductCode', 'Code', 'ProductName'];
                    for (const col of candidates) {
                        const retryEnv = JSON.parse(JSON.stringify(envelope));
                        retryEnv.RequestData.WhereStmt = `${col} like '%${searchTerm}%'`;
                        console.log(`[BillAccountService] searchProducts retry with column: ${col}`);
                        response = await CoreApi.post(OLD_API_ENDPOINT, retryEnv);
                        console.log('[BillAccountService] retry response:', JSON.stringify(response, null, 2));
                        if (response?.success) return response;
                    }
                }
                return response;
            } catch (err) {
                console.error("[BillAccountService] searchProducts error:", err);
                throw err;
            }
        },

        async searchAccounts(searchTerm, prevOrNext = 0) {
            console.log("[BillAccountService] searchAccounts called with:", searchTerm, "prevOrNext:", prevOrNext);
            const envelope = this.buildSearchEnvelope("accountId", searchTerm, "ACCOUNT_DATA", prevOrNext);
            console.log("[BillAccountService] searchAccounts envelope:", JSON.stringify(envelope, null, 2));
            try {
                let response = await CoreApi.post(OLD_API_ENDPOINT, envelope);
                console.log("[BillAccountService] searchAccounts response:", JSON.stringify(response, null, 2));
                if (!response?.success && /Invalid column name/i.test(response?.message || '')) {
                    console.warn('[BillAccountService] searchAccounts: server reported invalid column; attempting fallback columns');
                    const candidates = ['AccountID', 'AcctID', 'AccountNo', 'AccountNumber'];
                    for (const col of candidates) {
                        const retryEnv = JSON.parse(JSON.stringify(envelope));
                        retryEnv.RequestData.WhereStmt = `${col} like '%${searchTerm}%'`;
                        console.log(`[BillAccountService] searchAccounts retry with column: ${col}`);
                        response = await CoreApi.post(OLD_API_ENDPOINT, retryEnv);
                        console.log('[BillAccountService] retry response:', JSON.stringify(response, null, 2));
                        if (response?.success) return response;
                    }
                }
                return response;
            } catch (err) {
                console.error("[BillAccountService] searchAccounts error:", err);
                throw err;
            }
        },

        async getAccountCustomers(requestData = {}) {
            console.log("[BillAccountService] getAccountCustomers called with:", requestData);
            const formId = "dbo.p_GetAccountCustomers";

            // Default mapping
            const payload = {
                OurBranchID: requestData.OurBranchID || this.getBranchId(),
                AccountID: requestData.AccountID || "",
                ClientID: requestData.ClientID || "",
                OperatorID: requestData.OperatorID || this.getOperatorId(),
                DirectionType: requestData.DirectionType || "0",
                Direction: requestData.Direction || 0,
                PassbookID: requestData.PassbookID || "" // payload snippet shows PassbookID
            };

            const envelope = CoreApi.makeRequestEnvelope(formId, payload, "PROJECT_KAIRO");
            // Standard Legacy Fields
            envelope.RequestID = formId;
            envelope.FormId = formId;

            console.log("[BillAccountService] getAccountCustomers envelope:", JSON.stringify(envelope, null, 2));
            try {
                const response = await CoreApi.post(OLD_API_ENDPOINT, envelope);
                console.log("[BillAccountService] getAccountCustomers response:", JSON.stringify(response, null, 2));
                return response;
            } catch (err) {
                console.error("[BillAccountService] getAccountCustomers error:", err);
                throw err;
            }
        },

        async searchApplications(searchTerm, prevOrNext = 0) {
            console.log("[BillAccountService] searchApplications called with:", searchTerm, "prevOrNext:", prevOrNext);

            // Determine TableID based on current form context
            // Default: "ApplicationID" for Bill Account Application
            let tableId = "ApplicationID";
            let appName = "ApplicationID"; // Dynamic appName to match tableId

            // Check data-page attribute for reliable form detection
            const dataPage = document.body?.getAttribute('data-page') || '';
            const currentUrl = (window.parent.location.href || window.location.href || "").toLowerCase();

            console.log("[BillAccountService] Detecting form context - data-page:", dataPage, "URL:", currentUrl);

            // For Bill Inward/Outward Documentary Application AND Bill Contract Maintenance, use "BDApplicationID"
            if (dataPage === 'bill-inward-outward-documentary-application' ||
                dataPage === 'bill-contract-maintenance' ||
                currentUrl.includes("bill-inward-outward") ||
                currentUrl.includes("documentary-application") ||
                currentUrl.includes("bill-contract-maintenance")) {
                tableId = "BDApplicationID";
                appName = "BDApplicationID"; // Match the tableId
                console.log("[BillAccountService] Context: Bill Inward/Outward or Bill Contract Maintenance. Using TableID:", tableId, "AppName:", appName);
            } else {
                console.log("[BillAccountService] Context: Bill Account Application (or default). Using TableID:", tableId, "AppName:", appName);
            }

            // The user specifically asked for this dynamic parameter call
            const envelope = this.buildSearchEnvelope(tableId, searchTerm, appName, prevOrNext);

            console.log("[BillAccountService] searchApplications envelope generated with TableID:", tableId, "AppName:", appName);
            try {
                let response = await CoreApi.post(OLD_API_ENDPOINT, envelope);
                console.log("[BillAccountService] searchApplications response:", JSON.stringify(response, null, 2));

                // Server validation for fallback
                if (!response?.success && /Invalid column name/i.test(response?.message || '')) {
                    console.warn('[BillAccountService] searchApplications: server reported invalid column; attempting fallback columns');
                    const candidates = ['ApplicationID', 'SerialID', 'AppID'];
                    for (const col of candidates) {
                        const retryEnv = JSON.parse(JSON.stringify(envelope));
                        retryEnv.RequestData.WhereStmt = `${col} like '%${searchTerm}%'`;
                        console.log(`[BillAccountService] searchApplications retry with column: ${col}`);
                        response = await CoreApi.post(OLD_API_ENDPOINT, retryEnv);
                        if (response?.success) return response;
                    }
                }
                return response;
            } catch (err) {
                console.error("[BillAccountService] searchApplications error:", err);
                throw err;
            }
        }
    };

    global.BillAccountService = BillAccountService;
})(window);
