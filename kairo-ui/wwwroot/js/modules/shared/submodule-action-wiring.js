/**
 * Submodule Action Button Wiring & Context Bridge
 * 
 * This is the Account Maintenance equivalent of Client Maintenance's pattern:
 *   standalone-submodule-context.js + per-module init wiring
 * 
 * Responsibilities:
 * 1. Resolve parent context (AccountMaintenanceState) via multiple sources
 *    - Direct window.parent access (same-origin iframe)
 *    - postMessage from parent SidebarManager
 *    - sessionStorage fallback
 * 2. Auto-wire action panel buttons to the correct module methods
 * 3. Call module init() after context is available
 * 4. Wire search/lookup buttons
 */
(function () {
    'use strict';

    var contextResolved = false;

    // ── Resolve context from parent window (same-origin) ─────
    // Mirror of Client Maintenance's standalone-submodule-context.js pattern
    function resolveContextFromParent() {
        if (contextResolved) return true;

        // 1. Try direct parent window access (same-origin iframe)
        try {
            var parentWin = window.parent && window.parent !== window ? window.parent : null;
            if (parentWin) {
                // Try AccountMaintenanceState on parent
                var parentState = parentWin.AccountMaintenanceState;
                if (parentState && (parentState.AccountID || parentState.OurBranchID)) {
                    setAccountContext(parentState);
                    console.log('[SubmoduleWiring] Resolved context from parent.AccountMaintenanceState');
                    return true;
                }

                // Try SidebarManager.getParentContext on parent
                if (parentWin.SidebarManager && typeof parentWin.SidebarManager.getParentContext === 'function') {
                    var ctx = parentWin.SidebarManager.getParentContext();
                    if (ctx && (ctx.AccountID || ctx.OurBranchID || ctx.primaryRecordId)) {
                        setAccountContext(ctx);
                        console.log('[SubmoduleWiring] Resolved context from parent.SidebarManager');
                        return true;
                    }
                }
            }
        } catch (e) {
            // Cross-origin — fall through to postMessage
        }

        // 2. Try top window as well 
        try {
            var topWin = window.top && window.top !== window ? window.top : null;
            if (topWin && topWin !== window.parent) {
                var topState = topWin.AccountMaintenanceState;
                if (topState && (topState.AccountID || topState.OurBranchID)) {
                    setAccountContext(topState);
                    console.log('[SubmoduleWiring] Resolved context from top.AccountMaintenanceState');
                    return true;
                }
            }
        } catch (e) {
            // Cross-origin — normal
        }

        // 3. Check sessionStorage as last resort
        try {
            var accId = sessionStorage.getItem('currentAccountID');
            if (accId) {
                window.AccountMaintenanceState = {
                    AccountID: accId,
                    OurBranchID: sessionStorage.getItem('currentBranchID') || '',
                    ProductID: sessionStorage.getItem('currentProductID') || '',
                    ClientID: sessionStorage.getItem('currentClientID') || '',
                    OperatorID: sessionStorage.getItem('currentOperatorID') || localStorage.getItem('OperatorID') || 'SYSTEM',
                    ModuleID: '1300',
                    isAccountLoaded: true
                };
                contextResolved = true;
                console.log('[SubmoduleWiring] Resolved context from sessionStorage');
                return true;
            }
        } catch (e) { /* ignore */ }

        return false;
    }

    function setAccountContext(source) {
        window.AccountMaintenanceState = {
            AccountID: source.AccountID || source.primaryRecordId || '',
            OurBranchID: source.OurBranchID || '',
            ProductID: source.ProductID || '',
            ClientID: source.ClientID || '',
            OperatorID: source.OperatorID || localStorage.getItem('OperatorID') || 'SYSTEM',
            ModuleID: source.ModuleID || '1300',
            isAccountLoaded: source.isAccountLoaded || source.isMainRecordLoaded || true
        };
        contextResolved = true;

        // Also persist to sessionStorage as fallback
        try {
            sessionStorage.setItem('currentAccountID', window.AccountMaintenanceState.AccountID);
            sessionStorage.setItem('currentBranchID', window.AccountMaintenanceState.OurBranchID);
            sessionStorage.setItem('currentProductID', window.AccountMaintenanceState.ProductID);
            sessionStorage.setItem('currentClientID', window.AccountMaintenanceState.ClientID);
            sessionStorage.setItem('currentOperatorID', window.AccountMaintenanceState.OperatorID);
        } catch (e) { /* ignore */ }
    }

    // ── Listen for parent context via postMessage ──────────────
    // Fallback if direct parent access fails (cross-origin)
    window.addEventListener('message', function (event) {
        var data = event && event.data;
        if (!data || typeof data !== 'object') return;
        
        if (data.type === 'parentContext' || data.action === 'parentContextLoaded') {
            var ctx = data.data;
            if (ctx && (ctx.AccountID || ctx.OurBranchID || ctx.primaryRecordId)) {
                setAccountContext(ctx);
                console.log('[SubmoduleWiring] Received parent context via postMessage:', ctx);
                
                // Context just arrived — trigger init if buttons are wired but init wasn't called yet
                if (document._submoduleButtonsWired && !document._submoduleInitCalled) {
                    callModuleInit();
                }
            }
        }
    });

    // ── Module Init (separate from button wiring) ────────────
    // Called after context is resolved to initialize the module
    function callModuleInit() {
        if (document._submoduleInitCalled) return;
        document._submoduleInitCalled = true;

        function safeInit(mod, name) {
            if (mod && typeof mod.init === 'function') {
                try {
                    console.log('[SubmoduleWiring] Calling ' + name + '.init()');
                    mod.init();
                } catch (e) {
                    console.warn('[SubmoduleWiring] ' + name + '.init() error:', e);
                }
            }
        }

        // View-only modules auto-init; only call init on form modules
        if (window.AccountDocumentsModule) safeInit(window.AccountDocumentsModule, 'AccountDocumentsModule');
        else if (window.AccountSignatoriesModule) safeInit(window.AccountSignatoriesModule, 'AccountSignatoriesModule');
        else if (window.AccountSweepingModule) safeInit(window.AccountSweepingModule, 'AccountSweepingModule');
        else if (window.AccountNominationModule) safeInit(window.AccountNominationModule, 'AccountNominationModule');
        else if (window.AccountClosingModule) safeInit(window.AccountClosingModule, 'AccountClosingModule');
        else if (window.AccountChargeRatesModule) safeInit(window.AccountChargeRatesModule, 'AccountChargeRatesModule');
        else if (window.AccountBlockingModule) safeInit(window.AccountBlockingModule, 'AccountBlockingModule');
        else if (window.UserDefinedFieldsModule) safeInit(window.UserDefinedFieldsModule, 'UserDefinedFieldsModule');
        else if (window.AccountClassificationModule) safeInit(window.AccountClassificationModule, 'AccountClassificationModule');
        else if (window.AccountNotificationModule) safeInit(window.AccountNotificationModule, 'AccountNotificationModule');
        else if (window.AccountSpecialConditionsModule) safeInit(window.AccountSpecialConditionsModule, 'AccountSpecialConditionsModule');
        else if (window.AccountInterestRatesModule) safeInit(window.AccountInterestRatesModule, 'AccountInterestRatesModule');
        else if (window.CardMaintenanceModule) safeInit(window.CardMaintenanceModule, 'CardMaintenanceModule');
        else if (window.AccountFreezeReleaseModule) safeInit(window.AccountFreezeReleaseModule, 'AccountFreezeReleaseModule');
        // AccountNotesModule auto-inits, skip
        else if (window.AccountActivationModule) safeInit(window.AccountActivationModule, 'AccountActivationModule');
        else if (window.AccountRemindersModule) safeInit(window.AccountRemindersModule, 'AccountRemindersModule');
        else if (window.CancelStopPaymentModule) safeInit(window.CancelStopPaymentModule, 'CancelStopPaymentModule');
        else if (window.StopPaymentVoidModule) safeInit(window.StopPaymentVoidModule, 'StopPaymentVoidModule');
        else if (window.AccountChequeBookModule) safeInit(window.AccountChequeBookModule, 'AccountChequeBookModule');
        else if (window.ActivateDormantModule) safeInit(window.ActivateDormantModule, 'ActivateDormantModule');
        else if (window.AccountTransferModule) safeInit(window.AccountTransferModule, 'AccountTransferModule');
        // View-only modules (ClientPortfolio, SignaturePhoto, LoanRepaymentDetails, worksheets) auto-init
    }

    function wireButtons(attempt) {
        if (document._submoduleButtonsWired) return;

        // Check if ANY known module is available
        var knownModules = [
            'AccountDocumentsModule', 'AccountSignatoriesModule', 'AccountSweepingModule',
            'AccountNominationModule', 'AccountClosingModule', 'AccountChargeRatesModule',
            'AccountBlockingModule', 'UserDefinedFieldsModule', 'AccountClassificationModule',
            'AccountNotificationModule', 'AccountSpecialConditionsModule', 'AccountInterestRatesModule',
            'CardMaintenanceModule', 'AccountFreezeReleaseModule', 'AccountNotesModule',
            'AccountActivationModule', 'AccountRemindersModule', 'CancelStopPaymentModule',
            'StopPaymentVoidModule', 'AccountChequeBookModule', 'ActivateDormantModule',
            'AccountTransferModule', 'ClientPortfolioModule', 'SignaturePhotoModule',
            'LoanRepaymentDetailsModule', 'DebitInterestWorksheetModule', 'CreditInterestWorksheetModule'
        ];
        var found = knownModules.some(function (name) { return !!window[name]; });
        if (!found) return; // Module not loaded yet, retry later
        
        document._submoduleButtonsWired = true;
        console.log('[SubmoduleWiring] Module found, wiring buttons...');

        // Common button references
        var viewBtn = document.getElementById('submoduleBtnView');
        var addBtn = document.getElementById('submoduleBtnAdd');
        var editBtn = document.getElementById('submoduleBtnEdit');
        var deleteBtn = document.getElementById('submoduleBtnDelete');
        var saveBtn = document.getElementById('submoduleBtnSave');
        var cancelBtn = document.getElementById('submoduleBtnCancel');
        var closeBtn = document.getElementById('submoduleBtnClose');
        var historyBtn = document.getElementById('submoduleBtnHistory');
        var releaseBtn = document.getElementById('submoduleBtnRelease');
        var activateBtn = document.getElementById('submoduleBtnActivate');
        var approveBtn = document.getElementById('submoduleBtnApprove');
        var dispatchBtn = document.getElementById('submoduleBtnDispatch');
        var prevBtn = document.getElementById('submoduleBtnPrev');
        var nextBtn = document.getElementById('submoduleBtnNext');
        var showImgBtn = document.getElementById('submoduleBtnShowImage');
        var clearBtn = document.getElementById('submoduleBtnClear');
        var printBtn = document.getElementById('submoduleBtnPrint');
        var exportBtn = document.getElementById('submoduleBtnExport');
        var refreshBtn = document.getElementById('submoduleBtnRefresh');

        // Close button → notify parent (mirrors CM's closeRelationsView pattern)
        if (closeBtn) {
            closeBtn.addEventListener('click', function () {
                var parentWin = window.parent && window.parent !== window ? window.parent : null;
                if (!parentWin) return;
                var handled = false;

                // Primary: SidebarManager.closeChildForm() directly
                try {
                    if (parentWin.SidebarManager && typeof parentWin.SidebarManager.closeChildForm === 'function') {
                        parentWin.SidebarManager.closeChildForm();
                        handled = true;
                    }
                } catch (e) { /* cross-origin, fall through */ }

                // Fallback: postMessage (same types CM sends)
                if (!handled) {
                    try { parentWin.postMessage({ type: 'submoduleClose' }, '*'); handled = true; } catch (e) { }
                }
                try { parentWin.postMessage({ action: 'submoduleClosed' }, '*'); } catch (e) { }
                try { parentWin.postMessage({ type: 'CLOSE_DATAENTRY' }, '*'); } catch (e) { }

                // Last resort: navigate back or close
                if (!handled) {
                    if (window.history.length > 1) { window.history.back(); }
                    else { window.close(); }
                }
            });
        }

        // ── Documents ─────────────────────────────────────────
        if (window.AccountDocumentsModule) {
            var mod = window.AccountDocumentsModule;
            if (prevBtn) prevBtn.addEventListener('click', function () { mod.navigate(-1); });
            if (nextBtn) nextBtn.addEventListener('click', function () { mod.navigate(1); });
            if (showImgBtn) showImgBtn.addEventListener('click', function () { mod.showImage(); });
            if (viewBtn) viewBtn.addEventListener('click', function () { mod.navigate(0); });
            if (addBtn) addBtn.addEventListener('click', function () { mod.confirmAdd(); });
            if (editBtn) editBtn.addEventListener('click', function () { mod.confirmEdit(); });
            if (deleteBtn) deleteBtn.addEventListener('click', function () { mod.deleteData(); });
            if (saveBtn) saveBtn.addEventListener('click', function () { mod.saveData(); });
            if (cancelBtn) cancelBtn.addEventListener('click', function () { mod.confirmCancel(); });
            if (clearBtn) clearBtn.addEventListener('click', function () { mod.clearForm(); });
            return;
        }

        // ── Signatories ───────────────────────────────────────
        if (window.AccountSignatoriesModule) { return; }

        // ── Account Sweeping ──────────────────────────────────
        if (window.AccountSweepingModule) {
            var mod = window.AccountSweepingModule;
            if (viewBtn) viewBtn.addEventListener('click', function () { mod.view(); });
            if (addBtn) addBtn.addEventListener('click', function () { mod.add(); });
            if (editBtn) editBtn.addEventListener('click', function () { mod.edit(); });
            if (saveBtn) saveBtn.addEventListener('click', function () { mod.save(); });
            if (deleteBtn) deleteBtn.addEventListener('click', function () { mod.delete(); });
            if (cancelBtn) cancelBtn.addEventListener('click', function () { mod.cancel(); });
            return;
        }

        // ── Nomination ────────────────────────────────────────
        if (window.AccountNominationModule) {
            var mod = window.AccountNominationModule;
            if (viewBtn) viewBtn.addEventListener('click', function () { mod.view(); });
            if (addBtn) addBtn.addEventListener('click', function () { mod.add(); });
            if (editBtn) editBtn.addEventListener('click', function () { mod.edit(); });
            if (saveBtn) saveBtn.addEventListener('click', function () { mod.save(); });
            if (deleteBtn) deleteBtn.addEventListener('click', function () { mod.delete(); });
            if (cancelBtn) cancelBtn.addEventListener('click', function () { mod.cancel(); });
            return;
        }

        // ── Closing ───────────────────────────────────────────
        if (window.AccountClosingModule) {
            var mod = window.AccountClosingModule;
            if (viewBtn) viewBtn.addEventListener('click', function () { mod.view(); });
            if (addBtn) addBtn.addEventListener('click', function () { mod.add(); });
            if (editBtn) editBtn.addEventListener('click', function () { mod.edit(); });
            if (saveBtn) saveBtn.addEventListener('click', function () { mod.save(); });
            if (cancelBtn) cancelBtn.addEventListener('click', function () { mod.cancel(); });
            return;
        }

        // ── Charge Rates ──────────────────────────────────────
        if (window.AccountChargeRatesModule) {
            var mod = window.AccountChargeRatesModule;
            if (viewBtn) viewBtn.addEventListener('click', function () { mod.view(); });
            if (addBtn) addBtn.addEventListener('click', function () { mod.add(); });
            if (editBtn) editBtn.addEventListener('click', function () { mod.edit(); });
            if (saveBtn) saveBtn.addEventListener('click', function () { mod.save(); });
            if (deleteBtn) deleteBtn.addEventListener('click', function () { mod.delete(); });
            if (cancelBtn) cancelBtn.addEventListener('click', function () { mod.cancel(); });
            return;
        }

        // ── Blocking ──────────────────────────────────────────
        if (window.AccountBlockingModule) {
            var mod = window.AccountBlockingModule;
            if (viewBtn) viewBtn.addEventListener('click', function () { mod.view(); });
            if (editBtn) editBtn.addEventListener('click', function () { mod.edit(); });
            if (saveBtn) saveBtn.addEventListener('click', function () { mod.save(); });
            if (cancelBtn) cancelBtn.addEventListener('click', function () { mod.cancel(); });
            if (historyBtn) historyBtn.addEventListener('click', function () { mod.showHistory(); });
            return;
        }

        // ── User Defined Fields ───────────────────────────────
        if (window.UserDefinedFieldsModule) {
            var mod = window.UserDefinedFieldsModule;
            if (viewBtn) viewBtn.addEventListener('click', function () { mod.navigate(); });
            if (addBtn) addBtn.addEventListener('click', function () { mod.confirmAdd(); });
            if (editBtn) editBtn.addEventListener('click', function () { mod.confirmEdit(); });
            if (deleteBtn) deleteBtn.addEventListener('click', function () { mod.deleteData(); });
            if (saveBtn) saveBtn.addEventListener('click', function () { mod.saveData(); });
            if (cancelBtn) cancelBtn.addEventListener('click', function () { mod.confirmCancel(); });
            return;
        }

        // ── Account Classification ────────────────────────────
        if (window.AccountClassificationModule) {
            var mod = window.AccountClassificationModule;
            if (viewBtn) viewBtn.addEventListener('click', function () { mod.navigate(); });
            if (addBtn) addBtn.addEventListener('click', function () { mod.confirmAdd(); });
            if (editBtn) editBtn.addEventListener('click', function () { mod.confirmEdit(); });
            if (deleteBtn) deleteBtn.addEventListener('click', function () { mod.deleteData(); });
            if (saveBtn) saveBtn.addEventListener('click', function () { mod.saveData(); });
            if (cancelBtn) cancelBtn.addEventListener('click', function () { mod.confirmCancel(); });
            return;
        }

        // ── Account Notification ──────────────────────────────
        if (window.AccountNotificationModule) {
            var mod = window.AccountNotificationModule;
            if (viewBtn) viewBtn.addEventListener('click', function () { mod.navigate(); });
            if (editBtn) editBtn.addEventListener('click', function () { mod.confirmEdit(); });
            if (saveBtn) saveBtn.addEventListener('click', function () { mod.saveData(); });
            if (cancelBtn) cancelBtn.addEventListener('click', function () { mod.confirmCancel(); });
            return;
        }

        // ── Special Conditions ────────────────────────────────
        if (window.AccountSpecialConditionsModule) {
            var mod = window.AccountSpecialConditionsModule;
            if (viewBtn) viewBtn.addEventListener('click', function () { mod.navigateData(); });
            if (editBtn) editBtn.addEventListener('click', function () { mod.confirmEdit(); });
            if (saveBtn) saveBtn.addEventListener('click', function () { mod.saveData(); });
            if (cancelBtn) cancelBtn.addEventListener('click', function () { mod.confirmCancel(); });
            return;
        }

        // ── Interest Rates ────────────────────────────────────
        if (window.AccountInterestRatesModule) {
            var mod = window.AccountInterestRatesModule;
            if (viewBtn) viewBtn.addEventListener('click', function () { mod.navigate(); });
            if (addBtn) addBtn.addEventListener('click', function () { mod.confirmAdd(); });
            if (editBtn) editBtn.addEventListener('click', function () { mod.confirmEdit(); });
            if (deleteBtn) deleteBtn.addEventListener('click', function () { mod.deleteData(); });
            if (saveBtn) saveBtn.addEventListener('click', function () { mod.saveData(); });
            if (cancelBtn) cancelBtn.addEventListener('click', function () { mod.confirmCancel(); });
            return;
        }

        // ── Card Maintenance ──────────────────────────────────
        if (window.CardMaintenanceModule) {
            var mod = window.CardMaintenanceModule;
            if (viewBtn) viewBtn.addEventListener('click', function () { mod.navigate(); });
            if (addBtn) addBtn.addEventListener('click', function () { mod.confirmAdd(); });
            if (editBtn) editBtn.addEventListener('click', function () { mod.confirmEdit(); });
            if (deleteBtn) deleteBtn.addEventListener('click', function () { mod.deleteData(); });
            if (saveBtn) saveBtn.addEventListener('click', function () { mod.saveData(); });
            if (cancelBtn) cancelBtn.addEventListener('click', function () { mod.confirmCancel(); });
            return;
        }

        // ── Freeze Release ────────────────────────────────────
        if (window.AccountFreezeReleaseModule) {
            var mod = window.AccountFreezeReleaseModule;
            if (historyBtn) historyBtn.addEventListener('click', function () { mod.showHistory(); });
            if (releaseBtn) releaseBtn.addEventListener('click', function () { mod.showReleaseModal(); });
            if (viewBtn) viewBtn.addEventListener('click', function () { mod.navigate(); });
            if (addBtn) addBtn.addEventListener('click', function () { mod.confirmAdd(); });
            if (saveBtn) saveBtn.addEventListener('click', function () { mod.saveData(); });
            if (cancelBtn) cancelBtn.addEventListener('click', function () { mod.confirmCancel(); });
            return;
        }

        // ── Account Notes ─────────────────────────────────────
        if (window.AccountNotesModule) {
            var mod = window.AccountNotesModule;
            if (viewBtn) viewBtn.addEventListener('click', function () { mod.loadNotes(); });
            if (editBtn) editBtn.addEventListener('click', function () { mod.setMode('EDIT'); });
            if (saveBtn) saveBtn.addEventListener('click', function () { mod.saveNotes(); });
            if (cancelBtn) cancelBtn.addEventListener('click', function () { mod.cancelChanges(); });
            return;
        }

        // ── Account Activation ────────────────────────────────
        if (window.AccountActivationModule) {
            var mod = window.AccountActivationModule;
            if (viewBtn) viewBtn.addEventListener('click', function () { if (mod.init) mod.init(); });
            if (editBtn) editBtn.addEventListener('click', function () { mod.edit(); });
            if (saveBtn) saveBtn.addEventListener('click', function () { mod.save(); });
            if (cancelBtn) cancelBtn.addEventListener('click', function () { mod.cancel(); });
            return;
        }

        // ── Reminders ─────────────────────────────────────────
        if (window.AccountRemindersModule) {
            var mod = window.AccountRemindersModule;
            if (viewBtn) viewBtn.addEventListener('click', function () { (mod.viewData ? mod.viewData() : mod.loadData()); });
            if (addBtn) addBtn.addEventListener('click', function () { (mod.beginAdd ? mod.beginAdd() : mod.setMode('ADD')); });
            if (editBtn) editBtn.addEventListener('click', function () { mod.setMode('EDIT'); });
            if (deleteBtn) deleteBtn.addEventListener('click', function () { mod.deleteData(); });
            if (saveBtn) saveBtn.addEventListener('click', function () { mod.saveData(); });
            if (cancelBtn) cancelBtn.addEventListener('click', function () { mod.cancelChanges(); });
            return;
        }

        // ── Cancel Stop Payment ───────────────────────────────
        if (window.CancelStopPaymentModule) {
            var mod = window.CancelStopPaymentModule;
            if (viewBtn) viewBtn.addEventListener('click', function () { mod.navigate(); });
            if (addBtn) addBtn.addEventListener('click', function () { mod.confirmAdd(); });
            if (editBtn) editBtn.addEventListener('click', function () { mod.confirmEdit(); });
            if (deleteBtn) deleteBtn.addEventListener('click', function () { mod.deleteData(); });
            if (saveBtn) saveBtn.addEventListener('click', function () { mod.saveData(); });
            if (cancelBtn) cancelBtn.addEventListener('click', function () { mod.confirmCancel(); });
            return;
        }

        // ── Stop Payment Void ─────────────────────────────────
        if (window.StopPaymentVoidModule) {
            var mod = window.StopPaymentVoidModule;
            if (viewBtn) viewBtn.addEventListener('click', function () { mod.navigate(); });
            if (addBtn) addBtn.addEventListener('click', function () { mod.confirmAdd(); });
            if (editBtn) editBtn.addEventListener('click', function () { mod.confirmEdit(); });
            if (deleteBtn) deleteBtn.addEventListener('click', function () { mod.deleteData(); });
            if (saveBtn) saveBtn.addEventListener('click', function () { mod.saveData(); });
            if (cancelBtn) cancelBtn.addEventListener('click', function () { mod.confirmCancel(); });
            return;
        }

        // ── Cheque Book ───────────────────────────────────────
        if (window.AccountChequeBookModule) {
            var mod = window.AccountChequeBookModule;
            if (viewBtn) viewBtn.addEventListener('click', function () { mod.view(); });
            if (addBtn) addBtn.addEventListener('click', function () { mod.add(); });
            if (editBtn) editBtn.addEventListener('click', function () { mod.edit(); });
            if (deleteBtn) deleteBtn.addEventListener('click', function () { mod.delete(); });
            if (saveBtn) saveBtn.addEventListener('click', function () { mod.save(); });
            if (cancelBtn) cancelBtn.addEventListener('click', function () { mod.cancel(); });
            if (approveBtn) approveBtn.addEventListener('click', function () { mod.approve(); });
            if (dispatchBtn) dispatchBtn.addEventListener('click', function () { mod.dispatch(); });
            return;
        }

        // ── Activate Dormant ──────────────────────────────────
        if (window.ActivateDormantModule) {
            var mod = window.ActivateDormantModule;
            if (viewBtn) viewBtn.addEventListener('click', function () { mod.navigate(); });
            if (editBtn) editBtn.addEventListener('click', function () { mod.confirmEdit(); });
            if (saveBtn) saveBtn.addEventListener('click', function () { mod.saveData(); });
            if (cancelBtn) cancelBtn.addEventListener('click', function () { mod.confirmCancel(); });
            if (activateBtn) activateBtn.addEventListener('click', function () { mod.activateAccount(); });
            return;
        }

        // ── Account Transfer ──────────────────────────────────
        if (window.AccountTransferModule) {
            var mod = window.AccountTransferModule;
            if (viewBtn) viewBtn.addEventListener('click', function () { mod.view(); });
            if (addBtn) addBtn.addEventListener('click', function () { mod.add(); });
            if (saveBtn) saveBtn.addEventListener('click', function () { mod.save(); });
            if (cancelBtn) cancelBtn.addEventListener('click', function () { mod.cancel(); });
            return;
        }

        // ── Client Portfolio (view-only, auto-inits) ──────────
        if (window.ClientPortfolioModule) {
            var mod = window.ClientPortfolioModule;
            if (printBtn) printBtn.addEventListener('click', function () { mod.print(); });
            if (exportBtn) exportBtn.addEventListener('click', function () { mod.exportData(); });
            if (refreshBtn) refreshBtn.addEventListener('click', function () { mod.refresh(); });
            return;
        }

        // ── Signature Photo (view-only, auto-inits) ───────────
        if (window.SignaturePhotoModule) {
            var mod = window.SignaturePhotoModule;
            if (printBtn) printBtn.addEventListener('click', function () { mod.print(); });
            if (exportBtn) exportBtn.addEventListener('click', function () { mod.exportData(); });
            if (refreshBtn) refreshBtn.addEventListener('click', function () { mod.refresh(); });
            return;
        }

        // ── Loan Repayment Details (view-only, auto-inits) ────
        if (window.LoanRepaymentDetailsModule) {
            var mod = window.LoanRepaymentDetailsModule;
            if (printBtn) printBtn.addEventListener('click', function () { mod.print(); });
            if (exportBtn) exportBtn.addEventListener('click', function () { mod.exportData(); });
            if (refreshBtn) refreshBtn.addEventListener('click', function () { mod.refresh(); });
            return;
        }

        // ── Debit Interest Worksheet (view-only, auto-inits) ──
        if (window.DebitInterestWorksheetModule) {
            var mod = window.DebitInterestWorksheetModule;
            if (viewBtn) viewBtn.addEventListener('click', function () { mod.view(); });
            if (printBtn) printBtn.addEventListener('click', function () { mod.print(); });
            if (exportBtn) exportBtn.addEventListener('click', function () { mod.exportData(); });
            if (refreshBtn) refreshBtn.addEventListener('click', function () { mod.refresh(); });
            return;
        }

        // ── Credit Interest Worksheet (view-only, auto-inits) ─
        if (window.CreditInterestWorksheetModule) {
            var mod = window.CreditInterestWorksheetModule;
            if (viewBtn) viewBtn.addEventListener('click', function () { mod.view(); });
            if (printBtn) printBtn.addEventListener('click', function () { mod.print(); });
            if (exportBtn) exportBtn.addEventListener('click', function () { mod.exportData(); });
            if (refreshBtn) refreshBtn.addEventListener('click', function () { mod.refresh(); });
            return;
        }

        console.warn('[SubmoduleWiring] No matching module found for button wiring, attempt:', attempt);
    }

    // ── Lookup / Search Modal Wiring ──────────────────────────────
    // Replicates the parent's wireLookups() for btn-lookup buttons inside the iframe
    var LOOKUP_CONFIG = {
        'BranchID': { tableID: 'BranchID', keyField: 'BranchID', nameField: 'BranchName' },
        'ClientID': { tableID: 'ClientID', keyField: 'ClientID', nameField: 'ClientName' },
        'ProductID': { tableID: 'ProductID', keyField: 'ProductID', nameField: 'ProductName' },
        'AccountID': { tableID: 'AccountID', keyField: 'AccountID', nameField: 'AccountName' },
        'ChargeID': { tableID: 'ChargeID', keyField: 'ChargeID', nameField: 'ChargeName' },
        'LiquidationAccountID': { tableID: 'AccountID', keyField: 'AccountID', nameField: 'AccountName' },
        'SalesOfficerID': { tableID: 'OfficerID', keyField: 'OfficerID', nameField: 'OfficerName' },
        'PassbookSerialID': { tableID: 'PassbookSerialID', keyField: 'SerialID', nameField: 'SerialName' },
        'branchId': { tableID: 'BranchID', keyField: 'BranchID', nameField: 'BranchName' },
        'accountId': { tableID: 'AccountID', keyField: 'AccountID', nameField: 'AccountName' },
        'clientId': { tableID: 'ClientID', keyField: 'ClientID', nameField: 'ClientName' },
        'productId': { tableID: 'ProductID', keyField: 'ProductID', nameField: 'ProductName' },
        'nomineeId': { tableID: 'ClientID', keyField: 'ClientID', nameField: 'ClientName' },
        'signatoryId': { tableID: 'ClientID', keyField: 'ClientID', nameField: 'ClientName' },
        'groupId': { tableID: 'GroupID', keyField: 'GroupID', nameField: 'GroupName' },
        'chargeId': { tableID: 'ChargeID', keyField: 'ChargeID', nameField: 'ChargeName' },
        'referenceId': { tableID: 'FreezeID', keyField: 'ReferenceID', nameField: 'Description' },
        'reminderId': { tableID: 'AccountReminderID', keyField: 'ReminderID', nameField: 'Description' },
        'transactionId': { tableID: 'TransactionID', keyField: 'TransactionID', nameField: 'Description' },
        'accountTransferId': { tableID: 'AccountID', keyField: 'AccountID', nameField: 'AccountName' },
        'txnAccountId': { tableID: 'AccountID', keyField: 'AccountID', nameField: 'AccountName' },
        'payableAt': { tableID: 'BranchID', keyField: 'BranchID', nameField: 'BranchName' },
        'documentId': { tableID: 'DocumentID', keyField: 'DocumentID', nameField: 'Description' },
        'Charge': { tableID: 'ChargeID', keyField: 'ChargeID', nameField: 'ChargeName' },
        'Branch': { tableID: 'BranchID', keyField: 'BranchID', nameField: 'BranchName' },
        'Account': { tableID: 'AccountID', keyField: 'AccountID', nameField: 'AccountName' }
    };

    function wireLookups() {
        var lookupBtns = document.querySelectorAll('.btn-lookup');
        if (lookupBtns.length === 0) return;

        if (typeof window.SearchModal === 'undefined' || typeof window.AppCore === 'undefined') {
            console.warn('[SubmoduleWiring] SearchModal or AppCore not loaded. Lookups disabled.');
            return;
        }

        lookupBtns.forEach(function (btn) {
            // Skip buttons explicitly owned by the module (it handles its own wiring)
            if (btn.dataset.lookupOwner === 'module') return;
            // Avoid double wiring
            if (btn.dataset.wired) return;
            btn.dataset.wired = 'true';

            var targetInputId = btn.dataset.targetInput || btn.dataset.lookup;

            // Wire F2 key on the corresponding input field
            if (targetInputId) {
                var inputEl = document.getElementById(targetInputId);
                if (inputEl && !inputEl.dataset.f2Wired) {
                    inputEl.dataset.f2Wired = 'true';
                    inputEl.addEventListener('keydown', function (event) {
                        if (event.key === 'F2') {
                            event.preventDefault();
                            btn.click();
                        }
                    });
                }
            }

            btn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();

                var tid = this.dataset.targetInput || this.dataset.lookup;
                if (!tid) return;

                var baseConfig = LOOKUP_CONFIG[tid] || {
                    tableID: tid.replace(/Id$/i, '').replace(/ID$/i, ''),
                    keyField: tid,
                    nameField: tid.replace(/Id$/i, 'Name').replace(/ID$/i, 'Name')
                };
                var config = {};
                for (var k in baseConfig) config[k] = baseConfig[k];

                // Dynamic Account lookup filtering
                if (config.tableID === 'AccountID') {
                    var branchId = (document.getElementById('BranchID') || document.getElementById('branchId') || {}).value || '';
                    var clientId = (document.getElementById('ClientID') || document.getElementById('clientId') || {}).value || '';
                    var whereParts = [];
                    if (branchId) whereParts.push("OurBranchID = '" + branchId + "'");
                    if (clientId) whereParts.push("ClientID = '" + clientId + "'");
                    // ActivateDormant submodule filtering
                    if (window.ActivateDormantModule) {
                        whereParts.push("AccountStatusID = 'AD'");
                        whereParts.push('IsDormant = 1');
                    }
                    if (whereParts.length > 0) config.whereStmt = whereParts.join(' AND ');
                }

                console.log('[SubmoduleWiring] Opening lookup for ' + tid, config);

                var searchModal = new window.SearchModal(window.AppCore);
                searchModal.open({
                    tableID: config.tableID,
                    whereStmt: config.whereStmt,
                    onSelect: function (selectedRow) {
                        if (!selectedRow) return;
                        console.log('[SubmoduleWiring] Lookup selected:', selectedRow);

                        var getVal = function (row, key) {
                            if (!row || !key) return null;
                            var keys = Object.keys(row);
                            for (var i = 0; i < keys.length; i++) {
                                if (keys[i].toLowerCase() === key.toLowerCase()) return row[keys[i]];
                            }
                            return null;
                        };

                        var idInput = document.getElementById(tid);
                        var nameInputId = tid.replace(/Id$/i, 'Name').replace(/ID$/, 'Name');
                        var nameInput = document.getElementById(nameInputId) ||
                            (idInput && idInput.closest('[data-kairo-branch-control], [data-kairo-account-control], [data-kairo-client-control], [data-kairo-product-control], [data-kairo-user-control], [data-kairo-control]') &&
                             idInput.closest('[data-kairo-branch-control], [data-kairo-account-control], [data-kairo-client-control], [data-kairo-product-control], [data-kairo-user-control], [data-kairo-control]').querySelector('[class*="__name"]'));

                        if (idInput) {
                            var val = getVal(selectedRow, config.keyField) || getVal(selectedRow, 'ID');
                            if (val !== null) {
                                idInput.value = val;
                                idInput.dispatchEvent(new Event('change', { bubbles: true }));
                                idInput.dispatchEvent(new Event('blur', { bubbles: true }));
                            }
                        }

                        if (nameInput) {
                            var nval = getVal(selectedRow, config.nameField) || getVal(selectedRow, 'Name') || getVal(selectedRow, 'Description');
                            if (nval !== null) {
                                nameInput.value = nval;
                                nameInput.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        }

                        // Dispatch kairo:lookup-selected event for modules listening
                        document.dispatchEvent(new CustomEvent('kairo:lookup-selected', {
                            detail: { targetInputId: tid, selectedRow: selectedRow }
                        }));
                    }
                });
            });
        });

        console.log('[SubmoduleWiring] Wired ' + lookupBtns.length + ' lookup buttons');
    }

    // ── Orchestration ───────────────────────────────────────────
    // Flow: resolve context → wire buttons → wire lookups → call init()
    // Retries until all steps complete (modules may load async)
    var maxAttempts = 15;
    var attemptCount = 0;

    function tryWire() {
        attemptCount++;

        // Step 1: Resolve context from parent (immediate, same-origin)
        resolveContextFromParent();

        // Step 2: Wire action panel buttons (needs module JS loaded)
        wireButtons(attemptCount);

        // Step 3: Wire search/lookup buttons (needs SearchModal + AppCore)
        if (!document._submoduleLookupWired && typeof window.SearchModal !== 'undefined' && typeof window.AppCore !== 'undefined') {
            wireLookups();
            document._submoduleLookupWired = true;
        }

        // Step 4: Call module init() (needs buttons wired + context resolved)
        if (document._submoduleButtonsWired && contextResolved && !document._submoduleInitCalled) {
            callModuleInit();
        }

        // Continue retrying if not all steps are complete
        var allDone = document._submoduleButtonsWired && document._submoduleLookupWired && document._submoduleInitCalled;
        if (attemptCount < maxAttempts && !allDone) {
            setTimeout(tryWire, 200);
        } else if (!allDone) {
            // Last resort: if context never arrived but buttons are wired, init anyway
            if (document._submoduleButtonsWired && !document._submoduleInitCalled) {
                console.warn('[SubmoduleWiring] Context not resolved after max attempts, initializing anyway');
                callModuleInit();
            }
        }
    }

    // Wire after DOM is ready and module scripts have loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            setTimeout(tryWire, 50);
        });
    } else {
        setTimeout(tryWire, 50);
    }
})();
