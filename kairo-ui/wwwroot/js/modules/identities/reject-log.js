/**
 * Reject Log Controller (MVC Version)
 */
(function () {
    const RejectLogBase = 'Identities/RejectLog';

    // Helper functions for UI lookup
    function getAppCore() {
        return window.AppCore ||
            (window.parent && window.parent !== window && window.parent.AppCore) ||
            (window.top && window.top !== window && window.top.AppCore) ||
            null;
    }

    class RejectLogController {
        constructor() {
            this.rejectList = [];
            this.currentClient = null;
            this.selectedRecordType = "";

            // DOM Elements
            this.elements = {
                recordTypeFilter: document.getElementById("recordTypeFilter"),
                rejectLogTableBody: document.getElementById("rejectLogTableBody"),
                recordCount: document.getElementById("recordCount"),

                // Client Summary Details
                dtlClientID: document.getElementById("dtlClientID"),
                dtlClientType: document.getElementById("dtlClientType"),
                dtlClientName: document.getElementById("dtlClientName"),
                dtlOurBranchID: document.getElementById("dtlOurBranchID"),
                dtlTotalAccounts: document.getElementById("dtlTotalAccounts"),
                dtlAccountID: document.getElementById("dtlAccountID"),
                dtlRejectedBy: document.getElementById("dtlRejectedBy"),
                dtlRejectedOn: document.getElementById("dtlRejectedOn"),
                dtlReason: document.getElementById("dtlReason"),
                dtlTotalAmount: document.getElementById("dtlTotalAmount"),
                dtlRecordStatus: document.getElementById("dtlRecordStatus"),

                // Action Buttons (Action Panel overrides)
                closeClientBtn: document.getElementById("closeClientBtn"),
                resendClientBtn: document.getElementById("resendClientBtn"),

                // Message Panel
                messagePanel: document.getElementById("messagePanel"),
                messageText: document.getElementById("messageText")
            };

            this.initEvents();
            this.initializeLookups();
            this.loadRejectLog();
        }

        initEvents() {
            this.elements.recordTypeFilter?.addEventListener("change", () => {
                this.selectedRecordType = this.elements.recordTypeFilter.value;
                this.loadRejectLog();
            });

            this.elements.rejectLogTableBody?.addEventListener("click", (e) => {
                const row = e.target.closest("tr[data-index]");
                if (row) {
                    this.handleRowSelection(row);
                }
            });

            // Action mappings
            document.querySelectorAll('[data-action]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const action = btn.dataset.action;
                    if (action === 'refresh') this.loadRejectLog();
                    if (action === 'close-client') this.closeClient();
                    if (action === 'resend') this.resendClient();
                    if (action === 'close') {
                        if (window.parent && window.parent !== window && window.parent.postMessage) {
                            window.parent.postMessage({ type: 'closeStandaloneModule', payload: { action: 'close' } }, '*');
                        } else {
                            window.close();
                        }
                    }
                });
            });

            // Handlers for section toggles
            document.querySelectorAll('.section-toggle-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const content = btn.closest('.form-section').querySelector('.section-content');
                    const icon = btn.querySelector('i');
                    const isExpanded = btn.getAttribute('aria-expanded') === 'true';

                    if (isExpanded) {
                        content.style.display = 'none';
                        icon.className = 'bi bi-chevron-down';
                        btn.setAttribute('aria-expanded', 'false');
                    } else {
                        content.style.display = '';
                        icon.className = 'bi bi-chevron-up';
                        btn.setAttribute('aria-expanded', 'true');
                    }
                });
            });
        }

        async initializeLookups() {
            // Ideally call window.LookupService.populateDropdown
            // For now just populated if we have a global cache exposed
            if (window.LookupService && window.LookupService.populateDropdown) {
                try {
                    await window.LookupService.populateDropdown(
                        this.elements.recordTypeFilter, "RECORDTYPE", "--Select--"
                    );
                } catch (e) {
                    console.warn("Could not load Record Types", e);
                }
            } else {
                // If the system API cached endpoint is available for just raw data
                this.elements.recordTypeFilter.innerHTML = `
                    <option value="">--Select--</option>
                    <option value="INDIVIDUAL">INDIVIDUAL</option>
                    <option value="CORPORATE">CORPORATE</option>
                `;
            }
        }

        async loadRejectLog() {
            this.showMessage("Loading rejected clients...", "info");
            this.elements.rejectLogTableBody.innerHTML = '<tr><td colspan="8" class="text-center"><div class="spinner-border spinner-border-sm"></div> Loading...</td></tr>';
            try {
                const appCore = getAppCore();
                let response;
                
                if (appCore && appCore.invokeControllerByMethodAsync) {
                    response = await appCore.invokeControllerByMethodAsync(`${RejectLogBase}/get-reject-clients`, 'POST', {});
                } else {
                    const res = await fetch(`/${RejectLogBase}/get-reject-clients`, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({})
                    });
                    response = await res.json();
                }

                if (!response.Details && !response.data && !response.Success && !response.Data) {
                    this.showMessage("Failed to load rejected clients or unauthorized", "error");
                    this.renderRejectTable([]);
                    return;
                }

                let details = response.Details || response.data?.Details || response.data || [];
                if (details && details.Table) details = details.Table;
                if (!Array.isArray(details)) details = [details];

                if (!details || details.length === 0 || (!details[0] && details.length === 1)) {
                    this.showMessage("No rejected clients found", "info");
                    this.renderRejectTable([]);
                    return;
                }

                this.rejectList = details;

                let filteredList = this.rejectList;
                if (this.selectedRecordType) {
                    filteredList = this.rejectList.filter(client => {
                        const type = this.normalizeClientData(client).ClientType || "";
                        return type.toUpperCase().includes(this.selectedRecordType.toUpperCase());
                    });
                }

                this.renderRejectTable(filteredList);
                this.showMessage(`Loaded ${filteredList.length} rejected client(s)`, "success");

            } catch (err) {
                console.error("[RejectLog] Error loading log:", err);
                this.showMessage("Error loading rejected clients: " + err.message, "error");
                this.renderRejectTable([]);
            }
        }

        renderRejectTable(data) {
            const tbody = this.elements.rejectLogTableBody;

            if (!data || data.length === 0 || (data.length === 1 && !data[0].ClientID)) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center text-muted py-4">
                            <i class="bi bi-inbox fs-2 d-block mb-2"></i>
                            No rejected clients found
                        </td>
                    </tr>
                `;
                this.elements.recordCount.textContent = "0 records";
                return;
            }

            tbody.innerHTML = data.map((client, index) => {
                const normalized = this.normalizeClientData(client);
                return `
                    <tr data-index="${index}" style="cursor: pointer;">
                        <td><input type="radio" name="clientSelection" value="${index}"></td>
                        <td>${this.safeValue(normalized.ClientID)}</td>
                        <td>${this.safeValue(normalized.ClientName)}</td>
                        <td>${this.safeValue(normalized.ClientType)}</td>
                        <td>${this.formatDate(normalized.RejectedOn)}</td>
                        <td>${this.safeValue(normalized.RejectedBy)}</td>
                        <td>${this.safeValue(normalized.Reason)}</td>
                        <td><span class="badge bg-${this.getStatusBadgeClass(normalized.RecordStatus)}">${this.safeValue(normalized.RecordStatus)}</span></td>
                    </tr>
                `;
            }).join("");

            this.elements.recordCount.textContent = `${data.length} records`;
        }

        handleRowSelection(row) {
            const index = parseInt(row.dataset.index);
            const client = this.rejectList[index];

            if (!client) return;

            const radio = row.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;

            this.elements.rejectLogTableBody.querySelectorAll("tr").forEach(tr => {
                tr.classList.remove("table-active");
            });
            row.classList.add("table-active");

            this.currentClient = client;
            this.populateClientSummary(client);

            this.elements.closeClientBtn.disabled = false;
            this.elements.resendClientBtn.disabled = false;
        }

        populateClientSummary(client) {
            const normalized = this.normalizeClientData(client);

            this.elements.dtlClientID.value = this.safeValue(normalized.ClientID);
            this.elements.dtlClientType.value = this.safeValue(normalized.ClientType);
            this.elements.dtlClientName.value = this.safeValue(normalized.ClientName);
            this.elements.dtlOurBranchID.value = this.safeValue(normalized.OurBranchID);
            this.elements.dtlTotalAccounts.value = this.safeValue(normalized.TotalAccounts);
            this.elements.dtlAccountID.value = this.safeValue(normalized.AccountID);
            this.elements.dtlRejectedBy.value = this.safeValue(normalized.RejectedBy);
            this.elements.dtlRejectedOn.value = this.formatDate(normalized.RejectedOn);
            this.elements.dtlReason.value = this.safeValue(normalized.Reason);
            this.elements.dtlTotalAmount.value = this.formatAmount(normalized.TotalAmount);
            this.elements.dtlRecordStatus.value = this.safeValue(normalized.RecordStatus);
        }

        async resendClient() {
            if (!this.currentClient) {
                this.showMessage("Please select a client first", "warning");
                return;
            }

            const normalized = this.normalizeClientData(this.currentClient);
            const clientId = normalized.ClientID;

            if (!confirm(`Are you sure you want to resend client ${clientId} for approval?`)) {
                return;
            }

            this.showMessage("Resending client...", "info");
            try {
                const requestData = {
                    ClientID: clientId,
                    AccountID: normalized.AccountID || ""
                };

                const appCore = getAppCore();
                let response;
                if (appCore && appCore.invokeControllerByMethodAsync) {
                    response = await appCore.invokeControllerByMethodAsync(`${RejectLogBase}/resend-client`, 'POST', requestData);
                } else {
                    response = await (await fetch(`/${RejectLogBase}/resend-client`, {
                        method: 'POST', headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify(requestData)
                    })).json();
                }

                if (!response || !(response.Success || response.success || response.ResponseCode === "00")) {
                    this.showMessage(response.ErrorMessage || response.message || "Failed to resend client", "error");
                    return;
                }

                this.showMessage("Client resent successfully", "success");
                this.clearSelection();
                await this.loadRejectLog();
            } catch (err) {
                this.showMessage("Error resending client: " + err.message, "error");
            }
        }

        async closeClient() {
            if (!this.currentClient) {
                this.showMessage("Please select a client first", "warning");
                return;
            }

            const normalized = this.normalizeClientData(this.currentClient);
            const clientId = normalized.ClientID;

            const reason = prompt(`Enter reason for closing client ${clientId}:`);
            if (!reason || reason.trim() === "") {
                this.showMessage("Close cancelled - reason is required", "warning");
                return;
            }

            if (!confirm(`Are you sure you want to close client ${clientId}?`)) return;

            this.showMessage("Closing client...", "info");
            try {
                const requestData = {
                    ClientID: clientId,
                    RejectReson: reason.trim()
                };

                const appCore = getAppCore();
                let response;
                if (appCore && appCore.invokeControllerByMethodAsync) {
                    response = await appCore.invokeControllerByMethodAsync(`${RejectLogBase}/close-client`, 'POST', requestData);
                } else {
                    response = await (await fetch(`/${RejectLogBase}/close-client`, {
                        method: 'POST', headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify(requestData)
                    })).json();
                }

                if (!response || !(response.Success || response.success || response.ResponseCode === "00")) {
                    this.showMessage(response.ErrorMessage || response.message || "Failed to close client", "error");
                    return;
                }

                this.showMessage("Client closed successfully", "success");
                this.clearSelection();
                await this.loadRejectLog();
            } catch (err) {
                this.showMessage("Error closing client: " + err.message, "error");
            }
        }

        clearSelection() {
            this.currentClient = null;
            this.elements.closeClientBtn.disabled = true;
            this.elements.resendClientBtn.disabled = true;

            const f = this.elements;
            [f.dtlClientID, f.dtlClientType, f.dtlClientName, f.dtlOurBranchID, f.dtlTotalAccounts,
             f.dtlAccountID, f.dtlRejectedBy, f.dtlRejectedOn, f.dtlReason, f.dtlTotalAmount, f.dtlRecordStatus]
                .forEach(el => { if (el) el.value = ''; });

            this.elements.rejectLogTableBody.querySelectorAll("tr").forEach(tr => tr.classList.remove("table-active"));
            this.elements.rejectLogTableBody.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
        }

        normalizeClientData(client) {
            if (!client) return {};
            return {
                ClientID: client.ClientID || client.sClientID || client.ClientNo || "",
                ClientName: client.ClientName || client.sClientName || client.FullName || "",
                ClientType: client.ClientType || client.sClientType || client.Type || "",
                OurBranchID: client.OurBranchID || client.sOurBranchID || client.BranchID || "",
                AccountID: client.AccountID || client.sAccountID || client.AcctID || "",
                TotalAccounts: client.TotalAccounts || client.iTotalAccounts || client.AccountCount || "",
                RejectedOn: client.RejectedOn || client.dRejectedOn || client.RejectionDate || "",
                RejectedBy: client.RejectedBy || client.sRejectedBy || client.RejectedByOperator || "",
                TotalAmount: client.TotalAmount || client.mTotalAmount || client.Amount || "",
                Reason: client.Reason || client.sReason || client.RejectionReason || "",
                RecordStatus: client.RecordStatus || client.sRecordStatus || client.Status || ""
            };
        }

        safeValue(value) { return value !== null && value !== undefined ? value : ""; }

        formatDate(dateValue) {
            if (!dateValue) return "";
            try {
                if (window.GlobalUtils && window.GlobalUtils.formatDate) {
                    return window.GlobalUtils.formatDate(dateValue);
                }
                const date = new Date(dateValue);
                if (isNaN(date.getTime())) return dateValue;
                return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            } catch (e) { return dateValue; }
        }

        formatAmount(amount) {
            if (!amount && amount !== 0) return "";
            const num = parseFloat(amount);
            if (isNaN(num)) return amount;
            return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        getStatusBadgeClass(status) {
            const statusLower = String(status).toLowerCase();
            if (statusLower.includes("reject")) return "danger";
            if (statusLower.includes("pend")) return "warning";
            if (statusLower.includes("close")) return "secondary";
            if (statusLower.includes("resend") || statusLower.includes("resubmit")) return "info";
            return "secondary";
        }

        showMessage(message, type = "info") {
            const panel = this.elements.messagePanel;
            const text = this.elements.messageText;
            if (!panel || !text) return;

            text.textContent = message;
            panel.className = "am-message-panel";
            panel.classList.add(`am-message-panel--${type}`);
            panel.style.display = "flex";

            if (type === "success") {
                setTimeout(() => { panel.style.display = "none"; }, 5000);
            }
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => new RejectLogController());
    } else {
        new RejectLogController();
    }
})();
