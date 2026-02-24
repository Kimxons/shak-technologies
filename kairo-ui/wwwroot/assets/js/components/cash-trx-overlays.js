/**
 * Cash Transaction Overlay Components
 * Account Info Drawer, Signature/Photo Modal, Teller Balance Modal
 * 
 * CSS Classes: .modal-overlay, .drawer-right, .modal-centered
 * @requires CashTransactionService (optional - for API data)
 * @version 2.0.0
 */

const CashTrxOverlays = (function () {
    'use strict';

    // ============================================================================
    // STATE
    // ============================================================================
    let _activeOverlay = null; // Track which overlay is currently open

    // ============================================================================
    // CORE: Toggle Overlay Function
    // ============================================================================

    /**
     * Toggle an overlay's visibility
     * @param {string} elementId - ID of the overlay element
     * @param {boolean} show - true to show, false to hide
     */
    function toggleOverlay(elementId, show) {
        const overlay = document.getElementById(elementId);
        const backdrop = document.getElementById(elementId + 'Backdrop');

        if (!overlay) {
            console.warn(`[CashTrxOverlays] Overlay not found: ${elementId}`);
            return;
        }

        if (show) {
            // Show backdrop
            if (backdrop) {
                backdrop.classList.add('visible');
            }
            // Show overlay
            overlay.classList.add('visible');
            overlay.setAttribute('aria-hidden', 'false');

            // Lock body scroll
            document.body.classList.add('overlay-open');

            // Track active overlay
            _activeOverlay = elementId;

            // Focus first focusable element
            const closeBtn = overlay.querySelector('[data-action="close"]');
            if (closeBtn) closeBtn.focus();

        } else {
            // Hide backdrop
            if (backdrop) {
                backdrop.classList.remove('visible');
            }
            // Hide overlay
            overlay.classList.remove('visible');
            overlay.setAttribute('aria-hidden', 'true');

            // Unlock body scroll
            document.body.classList.remove('overlay-open');

            // Clear active overlay
            _activeOverlay = null;
        }
    }

    /**
     * Close any currently open overlay
     */
    function closeActiveOverlay() {
        if (_activeOverlay) {
            toggleOverlay(_activeOverlay, false);
        }
    }

    // ============================================================================
    // 1. ACCOUNT INFO DRAWER (drawer-right)
    // ============================================================================

    function createAccountDrawer() {
        if (document.getElementById('accountInfoDrawer')) return;

        const drawerHTML = `
            <div class="modal-overlay" id="accountInfoDrawerBackdrop"></div>
            <aside class="drawer-right drawer-right--wide" id="accountInfoDrawer" aria-hidden="true" role="complementary">
                <div class="drawer-right__header">
                    <h3 class="drawer-right__title">
                        <i class="bi bi-person-badge"></i>
                        Account Information
                    </h3>
                    <button type="button" class="drawer-right__close" data-action="close" aria-label="Close drawer">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
                <div class="drawer-right__body">
                    <!-- Signatories Section -->
                    <div class="detail-section">
                        <h4 class="detail-section__title detail-section__title--blue">
                            <i class="bi bi-people"></i> Signatories
                        </h4>
                        <div class="signatory-grid-wrap">
                            <table class="signatory-grid">
                                <thead>
                                    <tr>
                                        <th>Signatory ID</th>
                                        <th>Signatory Name</th>
                                        <th>Signatory Type</th>
                                        <th>Limit</th>
                                    </tr>
                                </thead>
                                <tbody id="drawerSignatoryList">
                                    <tr class="signatory-grid__empty">
                                        <td colspan="4">No signatories found</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Signature & Photo Details Section -->
                    <div class="detail-section">
                        <h4 class="detail-section__title detail-section__title--blue">
                            <i class="bi bi-image"></i> Signature & Photo Details
                        </h4>
                        <div class="media-grid">
                            <div class="media-card">
                                <div class="media-card__label">Signature</div>
                                <div class="media-card__preview" id="drawerSignaturePreview">
                                    <div class="media-card__placeholder">
                                        <i class="bi bi-pen"></i>
                                    </div>
                                </div>
                                <button type="button" class="media-card__zoom" data-action="zoom-signature">
                                    <i class="bi bi-zoom-in"></i> Zoom
                                </button>
                            </div>
                            <div class="media-card">
                                <div class="media-card__label">Photo</div>
                                <div class="media-card__preview" id="drawerPhotoPreview">
                                    <div class="media-card__placeholder">
                                        <i class="bi bi-person-square"></i>
                                    </div>
                                </div>
                                <button type="button" class="media-card__zoom" data-action="zoom-photo">
                                    <i class="bi bi-zoom-in"></i> Zoom
                                </button>
                            </div>
                            <div class="media-card">
                                <div class="media-card__label">Document</div>
                                <div class="media-card__preview" id="drawerDocumentPreview">
                                    <div class="media-card__placeholder">
                                        <i class="bi bi-file-earmark"></i>
                                    </div>
                                </div>
                                <button type="button" class="media-card__zoom" data-action="zoom-document">
                                    <i class="bi bi-zoom-in"></i> Zoom
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Behind The Scene Section -->
                    <div class="detail-section">
                        <h4 class="detail-section__title detail-section__title--blue">
                            <i class="bi bi-eye"></i> Behind The Scene
                        </h4>
                        <div class="balance-grid balance-grid--full">
                            <div class="balance-card">
                                <span class="balance-card__label">Clear Balance</span>
                                <span class="balance-card__value" id="balClear">0.00</span>
                            </div>
                            <div class="balance-card">
                                <span class="balance-card__label">Drawing Power</span>
                                <span class="balance-card__value" id="balDrawing">0.00</span>
                            </div>
                            <div class="balance-card">
                                <span class="balance-card__label">Unclear Balance</span>
                                <span class="balance-card__value" id="balUnclear">0.00</span>
                            </div>
                            <div class="balance-card">
                                <span class="balance-card__label">Freezed Amount</span>
                                <span class="balance-card__value" id="balFrozen">0.00</span>
                            </div>
                            <div class="balance-card">
                                <span class="balance-card__label">UnSupervised Credit</span>
                                <span class="balance-card__value" id="balUnSupCredit">0.00</span>
                            </div>
                            <div class="balance-card">
                                <span class="balance-card__label">Minimum Balance</span>
                                <span class="balance-card__value" id="balMinimum">0.00</span>
                            </div>
                            <div class="balance-card">
                                <span class="balance-card__label">Unsupervised Debit</span>
                                <span class="balance-card__value" id="balUnSupDebit">0.00</span>
                            </div>
                            <div class="balance-card">
                                <span class="balance-card__label">Deposit Balance</span>
                                <span class="balance-card__value" id="balDeposit">0.00</span>
                            </div>
                            <div class="balance-card balance-card--highlight">
                                <span class="balance-card__label">Available Balance</span>
                                <span class="balance-card__value" id="balAvailable">0.00</span>
                            </div>
                            <div class="balance-card balance-card--highlight">
                                <span class="balance-card__label">Total Balance</span>
                                <span class="balance-card__value" id="balTotal">0.00</span>
                            </div>
                        </div>
                    </div>

                    <!-- Account Details Section -->
                    <div class="detail-section">
                        <div class="detail-row">
                            <span class="detail-row__label">Account Currency ID</span>
                            <span class="detail-row__value" id="drawerCurrency">--</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-row__label">Account Product ID</span>
                            <span class="detail-row__value" id="drawerProductId">--</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-row__label">System Date</span>
                            <span class="detail-row__value" id="drawerSystemDate">--</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-row__label">Day Status</span>
                            <span class="detail-row__value" id="drawerDayStatus">--</span>
                        </div>
                    </div>
                </div>
                <div class="drawer-right__footer">
                    <button type="button" class="btn btn-outline-primary btn-sm" data-action="signature-btn">
                        Signature
                    </button>
                    <button type="button" class="btn btn-outline-secondary btn-sm" data-action="refresh">
                        <i class="bi bi-arrow-clockwise"></i> Refresh
                    </button>
                </div>
            </aside>
        `;

        document.body.insertAdjacentHTML('beforeend', drawerHTML);
        wireAccountDrawerEvents();
    }

    function wireAccountDrawerEvents() {
        const drawer = document.getElementById('accountInfoDrawer');
        const backdrop = document.getElementById('accountInfoDrawerBackdrop');

        if (!drawer) return;

        // Close button
        drawer.querySelector('[data-action="close"]')?.addEventListener('click', () => {
            toggleOverlay('accountInfoDrawer', false);
        });

        // Backdrop click
        backdrop?.addEventListener('click', () => {
            toggleOverlay('accountInfoDrawer', false);
        });

        // Zoom buttons for signature/photo/document
        drawer.querySelector('[data-action="zoom-signature"]')?.addEventListener('click', () => {
            zoomMedia('signature');
        });
        drawer.querySelector('[data-action="zoom-photo"]')?.addEventListener('click', () => {
            zoomMedia('photo');
        });
        drawer.querySelector('[data-action="zoom-document"]')?.addEventListener('click', () => {
            zoomMedia('document');
        });

        // Signatory row click
        drawer.querySelector('#drawerSignatoryList')?.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            if (row && !row.classList.contains('signatory-grid__empty')) {
                drawer.querySelectorAll('#drawerSignatoryList tr').forEach(r => r.classList.remove('selected'));
                row.classList.add('selected');
                loadSignatoryMedia(row.dataset.signatoryId);
            }
        });

        // Refresh button
        drawer.querySelector('[data-action="refresh"]')?.addEventListener('click', refreshDrawerData);

        // Signature button - opens Signature & Photo modal (in ADD, VIEW, or EDIT mode)
        drawer.querySelector('[data-action="signature-btn"]')?.addEventListener('click', () => {
            openSignatureModal();
        });
    }

    function zoomMedia(type) {
        // Open image in a larger modal or lightbox
        console.log(`[CashTrxOverlays] Zooming ${type}`);
        // Implement zoom modal if needed
    }

    function loadSignatoryMedia(signatoryId) {
        console.log(`[CashTrxOverlays] Loading media for signatory: ${signatoryId}`);
        // Load signature/photo/document for selected signatory
    }

    function openAccountDrawer() {
        createAccountDrawer();
        populateAccountDrawer();
        toggleOverlay('accountInfoDrawer', true);
    }

    function closeAccountDrawer() {
        toggleOverlay('accountInfoDrawer', false);
    }

    function populateAccountDrawer() {
        // Get cached data from CashTransactionService if available
        if (typeof CashTransactionService !== 'undefined') {
            const accountInfo = CashTransactionService.getAccountInfo();
            const balanceGrid = CashTransactionService.getBalanceGrid();

            if (accountInfo) {
                // Currency and Product
                const currencyEl = document.getElementById('drawerCurrency');
                if (currencyEl) currencyEl.textContent = accountInfo.currencyId || '--';

                const productEl = document.getElementById('drawerProductId');
                if (productEl) productEl.textContent = accountInfo.productId || '--';

                const systemDateEl = document.getElementById('drawerSystemDate');
                if (systemDateEl) systemDateEl.textContent = accountInfo.systemDate || formatDate(new Date());

                const dayStatusEl = document.getElementById('drawerDayStatus');
                if (dayStatusEl) dayStatusEl.textContent = accountInfo.dayStatus || '--';
            }

            if (balanceGrid) {
                setElementText('balClear', formatCurrency(balanceGrid.clear?.value || 0));
                setElementText('balUnclear', formatCurrency(balanceGrid.unclear?.value || 0));
                setElementText('balDrawing', formatCurrency(balanceGrid.drawingPower?.value || 0));
                setElementText('balFrozen', formatCurrency(balanceGrid.frozen?.value || 0));
                setElementText('balMinimum', formatCurrency(balanceGrid.minimum?.value || 0));
                setElementText('balAvailable', formatCurrency(balanceGrid.available?.value || 0));
                setElementText('balUnSupCredit', formatCurrency(balanceGrid.unSupervisedCredits?.value || 0));
                setElementText('balUnSupDebit', formatCurrency(balanceGrid.unSupervisedDebits?.value || 0));
                setElementText('balDeposit', formatCurrency(balanceGrid.deposit?.value || 0));
                setElementText('balTotal', formatCurrency(balanceGrid.total?.value || 0));
            }

            // Populate signatories if available
            if (accountInfo?.signatories) {
                populateSignatories(accountInfo.signatories);
            }
        }
    }

    function setElementText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    function populateSignatories(signatories) {
        const tbody = document.getElementById('drawerSignatoryList');
        if (!tbody) return;

        if (signatories && signatories.length > 0) {
            tbody.innerHTML = signatories.map((sig, index) => `
                <tr data-signatory-id="${sig.signatoryId || sig.SignatoryID || ''}" ${index === 0 ? 'class="selected"' : ''}>
                    <td>${sig.signatoryId || sig.SignatoryID || ''}</td>
                    <td>${sig.signatoryName || sig.SignatoryName || ''}</td>
                    <td>${sig.signatoryType || sig.SignatoryType || ''}</td>
                    <td>${sig.limit || sig.Limit || '0'}</td>
                </tr>
            `).join('');

            // Load first signatory's media
            if (signatories[0]) {
                loadSignatoryMedia(signatories[0].signatoryId || signatories[0].SignatoryID);
            }
        } else {
            tbody.innerHTML = '<tr class="signatory-grid__empty"><td colspan="4">No signatories found</td></tr>';
        }
    }

    /**
     * Set signatories data externally
     */
    function setSignatories(signatories) {
        populateSignatories(signatories);
    }

    function refreshDrawerData() {
        // Re-fetch and populate
        populateAccountDrawer();
    }

    // ============================================================================
    // 2. SIGNATURE & PHOTO MODAL (modal-centered)
    // ============================================================================

    function createSignatureModal() {
        if (document.getElementById('signatureModal')) return;

        const modalHTML = `
            <div class="modal-overlay" id="signatureModalBackdrop"></div>
            <div class="modal-centered modal-centered--signature" id="signatureModal" role="dialog" aria-modal="true" aria-hidden="true">
                <div class="modal-centered__header">
                    <h3 class="modal-centered__title">
                        <i class="bi bi-person-vcard"></i>
                        Signatures & Photos
                    </h3>
                    <button type="button" class="modal-centered__close" data-action="close" aria-label="Close">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
                <div class="modal-tabs">
                    <button type="button" class="modal-tab active" data-tab="signatures">
                        <i class="bi bi-pen"></i> Signatures
                    </button>
                    <button type="button" class="modal-tab" data-tab="photos">
                        <i class="bi bi-image"></i> Photos
                    </button>
                    <button type="button" class="modal-tab" data-tab="audit">
                        <i class="bi bi-clock-history"></i> Audit
                    </button>
                </div>
                <div class="modal-centered__body" style="display:flex;">
                    <div class="signatory-sidebar" id="signatoryList">
                        <div class="signatory-sidebar__empty">No signatories</div>
                    </div>
                    <div style="flex:1; padding:20px;">
                        <div class="modal-panel active" data-panel="signatures">
                            <div class="signature-display" id="signatureDisplay">
                                <div class="placeholder-content">
                                    <i class="bi bi-pen"></i>
                                    <span>No signature on file</span>
                                </div>
                            </div>
                            <div style="margin-top:12px; font-size:12px; color:#64748b; text-align:center;">
                                <span id="sigCaptureDate">--</span>
                            </div>
                        </div>
                        <div class="modal-panel" data-panel="photos">
                            <div class="photo-display" id="photoDisplay">
                                <div class="placeholder-content">
                                    <i class="bi bi-person-square"></i>
                                    <span>No photo on file</span>
                                </div>
                            </div>
                        </div>
                        <div class="modal-panel" data-panel="audit">
                            <div class="detail-row">
                                <span class="detail-row__label">Account Opened</span>
                                <span class="detail-row__value" id="auditOpenedDate">--</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-row__label">Last Transaction</span>
                                <span class="detail-row__value" id="auditLastTrx">--</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-row__label">Last Modified</span>
                                <span class="detail-row__value" id="auditLastModified">--</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-row__label">Update Count</span>
                                <span class="detail-row__value" id="auditUpdateCount">--</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-centered__footer">
                    <button type="button" class="btn btn-secondary" data-action="close">Close</button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        wireSignatureModalEvents();
    }

    function wireSignatureModalEvents() {
        const modal = document.getElementById('signatureModal');
        const backdrop = document.getElementById('signatureModalBackdrop');

        if (!modal) return;

        // Close buttons
        modal.querySelectorAll('[data-action="close"]').forEach(btn => {
            btn.addEventListener('click', () => toggleOverlay('signatureModal', false));
        });

        // Backdrop click
        backdrop?.addEventListener('click', () => toggleOverlay('signatureModal', false));

        // Tab switching
        modal.querySelectorAll('.modal-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;

                // Update tabs
                modal.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Update panels
                modal.querySelectorAll('.modal-panel').forEach(p => p.classList.remove('active'));
                modal.querySelector(`[data-panel="${tabName}"]`)?.classList.add('active');
            });
        });

        // Signatory selection
        modal.querySelector('#signatoryList')?.addEventListener('click', (e) => {
            const item = e.target.closest('.signatory-item');
            if (item) {
                modal.querySelectorAll('.signatory-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                loadSignatoryData(parseInt(item.dataset.signatory, 10));
            }
        });
    }

    function openSignatureModal() {
        createSignatureModal();
        populateSignatureModal();
        toggleOverlay('signatureModal', true);
    }

    function closeSignatureModal() {
        toggleOverlay('signatureModal', false);
    }

    async function loadSignatoryData(index) {
        console.log(`[CashTrxOverlays] Loading signatory ${index} data`);
        const modal = document.getElementById('signatureModal');
        if (!modal) return;

        const signatureDisplay = document.getElementById('signatureDisplay');
        const photoDisplay = document.getElementById('photoDisplay');

        if (signatureDisplay) signatureDisplay.innerHTML = '<div class="loading-spinner"><i class="bi bi-arrow-repeat"></i><span>Loading...</span></div>';

        try {
            if (typeof AccountService === 'undefined') return;

            const accountId = document.getElementById('accountId')?.value;
            if (!accountId) return;

            const signatories = await AccountService.getAccountSignatories(accountId);
            const sig = signatories?.[index];

            if (sig) {
                const sigId = sig.signatoryId || sig.SignatoryID;
                const sigImage = await AccountService.getSignatoryImage(accountId, sigId, 'S'); // S for Signature
                const photoImage = await AccountService.getSignatoryImage(accountId, sigId, 'P'); // P for Photo

                if (signatureDisplay) {
                    signatureDisplay.innerHTML = sigImage ? `<img src="data:image/png;base64,${sigImage}" style="max-width:100%; max-height:100%;" />`
                        : '<div class="placeholder-content"><i class="bi bi-pen"></i><span>No signature on file</span></div>';
                }

                if (photoDisplay) {
                    photoDisplay.innerHTML = photoImage ? `<img src="data:image/png;base64,${photoImage}" style="max-width:100%; max-height:100%;" />`
                        : '<div class="placeholder-content"><i class="bi bi-person-square"></i><span>No photo on file</span></div>';
                }

                const captureDateEl = document.getElementById('sigCaptureDate');
                if (captureDateEl) captureDateEl.textContent = `Captured: ${formatDate(sig.CapturedDate || new Date())}`;
            }
        } catch (err) {
            console.error('[CashTrxOverlays] Failed to load signatory data:', err);
            if (signatureDisplay) signatureDisplay.innerHTML = '<div class="text-danger">Failed to load</div>';
        }
    }

    function populateSignatureModal() {
        if (typeof CashTransactionService !== 'undefined') {
            const accountInfo = CashTransactionService.getAccountInfo();
            if (accountInfo) {
                document.getElementById('auditUpdateCount').textContent = accountInfo.updateCount || '0';
            }
        }
    }

    // ============================================================================
    // 3. TELLER BALANCE MODAL (modal-centered)
    // ============================================================================

    function createTellerModal() {
        if (document.getElementById('tellerBalanceModal')) return;

        const modalHTML = `
            <div class="modal-overlay" id="tellerBalanceModalBackdrop"></div>
            <div class="modal-centered modal-centered--teller" id="tellerBalanceModal" role="dialog" aria-modal="true" aria-hidden="true">
                <div class="modal-centered__header">
                    <h3 class="modal-centered__title">
                        <i class="bi bi-cash-stack"></i>
                        Teller Cash Position
                    </h3>
                    <button type="button" class="modal-centered__close" data-action="close" aria-label="Close">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
                <div class="modal-centered__body">
                    <div class="teller-summary">
                        <div class="teller-card">
                            <span class="teller-card__label">Opening Balance</span>
                            <span class="teller-card__value" id="tellerOpening">0.00</span>
                        </div>
                        <div class="teller-card teller-card--credit">
                            <span class="teller-card__label">Total Receipts</span>
                            <span class="teller-card__value" id="tellerReceipts">0.00</span>
                        </div>
                        <div class="teller-card teller-card--debit">
                            <span class="teller-card__label">Total Payments</span>
                            <span class="teller-card__value" id="tellerPayments">0.00</span>
                        </div>
                        <div class="teller-card teller-card--highlight">
                            <span class="teller-card__label">Current Position</span>
                            <span class="teller-card__value" id="tellerCurrent">0.00</span>
                        </div>
                    </div>
                    <div class="teller-table-wrap">
                        <table class="teller-table">
                            <thead>
                                <tr>
                                    <th>Serial</th>
                                    <th>Time</th>
                                    <th>Account</th>
                                    <th>Type</th>
                                    <th style="text-align:right;">Amount</th>
                                </tr>
                            </thead>
                            <tbody id="tellerTrxList">
                                <tr class="teller-table__empty">
                                    <td colspan="5">No transactions today</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="modal-centered__footer">
                    <button type="button" class="btn btn-outline-primary" data-action="refresh">
                        <i class="bi bi-arrow-clockwise"></i> Refresh
                    </button>
                    <button type="button" class="btn btn-secondary" data-action="close">Close</button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        wireTellerModalEvents();
    }

    function wireTellerModalEvents() {
        const modal = document.getElementById('tellerBalanceModal');
        const backdrop = document.getElementById('tellerBalanceModalBackdrop');

        if (!modal) return;

        // Close buttons
        modal.querySelectorAll('[data-action="close"]').forEach(btn => {
            btn.addEventListener('click', () => toggleOverlay('tellerBalanceModal', false));
        });

        // Backdrop click
        backdrop?.addEventListener('click', () => toggleOverlay('tellerBalanceModal', false));

        // Refresh
        modal.querySelector('[data-action="refresh"]')?.addEventListener('click', populateTellerModal);
    }

    function openTellerModal() {
        createTellerModal();
        populateTellerModal();
        toggleOverlay('tellerBalanceModal', true);
    }

    function closeTellerModal() {
        toggleOverlay('tellerBalanceModal', false);
    }

    async function populateTellerModal() {
        console.log('[CashTrxOverlays] Populating teller modal');
        const tbody = document.getElementById('tellerTrxList');
        if (!tbody) return;

        setStatus('tellerOpening', 'Loading...');

        try {
            if (typeof TillService === 'undefined') return;

            const tillData = await TillService.getTillDetails();

            if (tillData) {
                setElementText('tellerOpening', formatCurrency(tillData.openingBalance || 0));
                setElementText('tellerReceipts', `(${formatCurrency(tillData.totalReceipts || 0)})`);
                setElementText('tellerPayments', formatCurrency(tillData.totalPayments || 0));
                setElementText('tellerCurrent', formatCurrency(tillData.currentPosition || 0));

                if (tillData.transactions && tillData.transactions.length > 0) {
                    tbody.innerHTML = tillData.transactions.map(trx => `
                        <tr>
                            <td>${trx.serialId || '--'}</td>
                            <td>${trx.time || '--'}</td>
                            <td>${trx.accountId || '--'}</td>
                            <td><span class="badge ${trx.type === 'Credit' ? 'bg-danger' : 'bg-success'}">${trx.type}</span></td>
                            <td style="text-align:right; font-weight:600;">${formatCurrency(trx.amount)}</td>
                        </tr>
                    `).join('');
                } else {
                    tbody.innerHTML = '<tr class="teller-table__empty"><td colspan="5">No transactions today</td></tr>';
                }
            }
        } catch (err) {
            console.error('[CashTrxOverlays] Failed to populate teller modal:', err);
            setElementText('tellerOpening', 'Error');
        }
    }

    // ============================================================================
    // 4. VIEW ALL TRANSACTIONS MODAL (modal-centered--wide)
    // ============================================================================

    function createViewAllModal() {
        if (document.getElementById('viewAllTrxModal')) return;

        const modalHTML = `
            <div class="modal-overlay" id="viewAllTrxModalBackdrop"></div>
            <div class="modal-centered modal-centered--wide" id="viewAllTrxModal" role="dialog" aria-modal="true" aria-hidden="true">
                <div class="modal-centered__header">
                    <h3 class="modal-centered__title">
                        <i class="bi bi-list-ul"></i>
                        Transaction Information
                    </h3>
                    <button type="button" class="modal-centered__close" data-action="close" aria-label="Close">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
                <div class="modal-centered__body">
                    <div class="trx-grid-wrap">
                        <table class="trx-grid-table">
                            <thead>
                                <tr>
                                    <th>TrxBatchID</th>
                                    <th>Serial ID</th>
                                    <th>Branch ID</th>
                                    <th>AcctID</th>
                                    <th>AcctTypeI</th>
                                    <th>Account Name</th>
                                    <th>TrxTypeI</th>
                                    <th>Value Date</th>
                                    <th>CurrID</th>
                                    <th>Amount</th>
                                    <th>Local Amount</th>
                                    <th>Ex Rate</th>
                                    <th>Cheque</th>
                                    <th>ChequeDate</th>
                                    <th>TrxDescription</th>
                                    <th>Trx FlagID</th>
                                    <th>Operator ID</th>
                                    <th>Supervisor ID</th>
                                </tr>
                            </thead>
                            <tbody id="viewAllTrxBody">
                                <tr class="trx-grid-table__empty">
                                    <td colspan="18">No transactions found</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="modal-centered__footer">
                    <div class="trx-grid-status">
                        <span id="viewAllTrxCount">0 records</span>
                    </div>
                    <button type="button" class="btn btn-outline-primary" data-action="refresh">
                        <i class="bi bi-arrow-clockwise"></i> Refresh
                    </button>
                    <button type="button" class="btn btn-secondary" data-action="close">Close</button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        wireViewAllModalEvents();
    }

    function wireViewAllModalEvents() {
        const modal = document.getElementById('viewAllTrxModal');
        const backdrop = document.getElementById('viewAllTrxModalBackdrop');

        if (!modal) return;

        // Close buttons
        modal.querySelectorAll('[data-action="close"]').forEach(btn => {
            btn.addEventListener('click', () => toggleOverlay('viewAllTrxModal', false));
        });

        // Backdrop click
        backdrop?.addEventListener('click', () => toggleOverlay('viewAllTrxModal', false));

        // Refresh
        modal.querySelector('[data-action="refresh"]')?.addEventListener('click', populateViewAllModal);

        // Row click for selection
        modal.querySelector('#viewAllTrxBody')?.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            if (row && !row.classList.contains('trx-grid-table__empty')) {
                // Remove previous selection
                modal.querySelectorAll('.trx-grid-table tbody tr').forEach(r => r.classList.remove('selected'));
                // Add selection to clicked row
                row.classList.add('selected');

                // Emit event with transaction data
                const serialId = row.dataset.serialId;
                document.dispatchEvent(new CustomEvent('cashtrx:rowSelected', {
                    detail: { serialId, row }
                }));
            }
        });

        // Double-click to load transaction
        modal.querySelector('#viewAllTrxBody')?.addEventListener('dblclick', (e) => {
            const row = e.target.closest('tr');
            if (row && !row.classList.contains('trx-grid-table__empty')) {
                const serialId = row.dataset.serialId;
                document.dispatchEvent(new CustomEvent('cashtrx:loadTransaction', {
                    detail: { serialId }
                }));
                toggleOverlay('viewAllTrxModal', false);
            }
        });
    }

    function openViewAllModal() {
        createViewAllModal();
        populateViewAllModal();
        toggleOverlay('viewAllTrxModal', true);
    }

    function closeViewAllModal() {
        toggleOverlay('viewAllTrxModal', false);
    }

    function populateViewAllModal() {
        console.log('[CashTrxOverlays] Populating view all modal');
        const tbody = document.getElementById('viewAllTrxBody');
        const countEl = document.getElementById('viewAllTrxCount');

        if (!tbody) return;

        // Get cached transaction details from CashTransactionService if available
        if (typeof CashTransactionService !== 'undefined') {
            const transactions = CashTransactionService.getTransactionDetails();

            if (transactions && transactions.length > 0) {
                tbody.innerHTML = transactions.map(trx => `
                    <tr data-serial-id="${trx.serialId || trx.SerialID || ''}">
                        <td>${trx.trxBatchId || trx.TrxBatchID || ''}</td>
                        <td>${trx.serialId || trx.SerialID || ''}</td>
                        <td>${trx.branchId || trx.BranchID || ''}</td>
                        <td>${trx.acctId || trx.AcctID || ''}</td>
                        <td>${trx.acctTypeId || trx.AcctTypeID || ''}</td>
                        <td>${trx.accountName || trx.AccountName || ''}</td>
                        <td>${trx.trxTypeId || trx.TrxTypeID || ''}</td>
                        <td>${formatDate(trx.valueDate || trx.ValueDate)}</td>
                        <td>${trx.currencyId || trx.CurrencyID || ''}</td>
                        <td class="text-end">${formatCurrency(trx.amount || trx.Amount)}</td>
                        <td class="text-end">${formatCurrency(trx.localAmount || trx.LocalAmount)}</td>
                        <td class="text-end">${trx.exRate || trx.ExRate || ''}</td>
                        <td>${trx.cheque || trx.Cheque || ''}</td>
                        <td>${formatDate(trx.chequeDate || trx.ChequeDate)}</td>
                        <td>${trx.trxDescription || trx.TrxDescription || ''}</td>
                        <td>${trx.trxFlagId || trx.TrxFlagID || ''}</td>
                        <td>${trx.operatorId || trx.OperatorID || ''}</td>
                        <td>${trx.supervisorId || trx.SupervisorID || ''}</td>
                    </tr>
                `).join('');

                if (countEl) countEl.textContent = `${transactions.length} record(s)`;
            } else {
                tbody.innerHTML = '<tr class="trx-grid-table__empty"><td colspan="18">No transactions found</td></tr>';
                if (countEl) countEl.textContent = '0 records';
            }
        }
    }

    /**
     * Load transactions into the View All modal from external data
     * @param {Array} transactions - Array of transaction objects
     */
    function setViewAllData(transactions) {
        createViewAllModal();
        const tbody = document.getElementById('viewAllTrxBody');
        const countEl = document.getElementById('viewAllTrxCount');

        if (!tbody) return;

        if (transactions && transactions.length > 0) {
            tbody.innerHTML = transactions.map(trx => `
                <tr data-serial-id="${trx.serialId || trx.SerialID || ''}">
                    <td>${trx.trxBatchId || trx.TrxBatchID || ''}</td>
                    <td>${trx.serialId || trx.SerialID || ''}</td>
                    <td>${trx.branchId || trx.BranchID || ''}</td>
                    <td>${trx.acctId || trx.AcctID || ''}</td>
                    <td>${trx.acctTypeId || trx.AcctTypeID || ''}</td>
                    <td>${trx.accountName || trx.AccountName || ''}</td>
                    <td>${trx.trxTypeId || trx.TrxTypeID || ''}</td>
                    <td>${formatDate(trx.valueDate || trx.ValueDate)}</td>
                    <td>${trx.currencyId || trx.CurrencyID || ''}</td>
                    <td class="text-end">${formatCurrency(trx.amount || trx.Amount)}</td>
                    <td class="text-end">${formatCurrency(trx.localAmount || trx.LocalAmount)}</td>
                    <td class="text-end">${trx.exRate || trx.ExRate || ''}</td>
                    <td>${trx.cheque || trx.Cheque || ''}</td>
                    <td>${formatDate(trx.chequeDate || trx.ChequeDate)}</td>
                    <td>${trx.trxDescription || trx.TrxDescription || ''}</td>
                    <td>${trx.trxFlagId || trx.TrxFlagID || ''}</td>
                    <td>${trx.operatorId || trx.OperatorID || ''}</td>
                    <td>${trx.supervisorId || trx.SupervisorID || ''}</td>
                </tr>
            `).join('');

            if (countEl) countEl.textContent = `${transactions.length} record(s)`;
        } else {
            tbody.innerHTML = '<tr class="trx-grid-table__empty"><td colspan="18">No transactions found</td></tr>';
            if (countEl) countEl.textContent = '0 records';
        }
    }

    // ============================================================================
    // 5. DENOMINATION MODAL (Cash Breakdown Entry)
    // ============================================================================

    function createDenominationModal() {
        if (document.getElementById('denominationModal')) return;

        const modalHTML = `
            <div class="modal-overlay" id="denominationModalBackdrop"></div>
            <div class="modal-centered modal-centered--denomination" id="denominationModal" role="dialog" aria-modal="true" aria-hidden="true">
                <div class="modal-centered__header">
                    <h3 class="modal-centered__title">
                        <i class="bi bi-cash-coin"></i>
                        Cash Denomination
                    </h3>
                    <button type="button" class="modal-centered__close" data-action="close" aria-label="Close">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
                <div class="modal-centered__body">
                    <div class="denomination-grid">
                        <table class="denomination-table">
                            <thead>
                                <tr>
                                    <th>Denomination</th>
                                    <th>Count</th>
                                    <th style="text-align:right;">Amount</th>
                                </tr>
                            </thead>
                            <tbody id="denominationBody">
                                <tr data-denom="1000">
                                    <td>1,000</td>
                                    <td><input type="number" class="denom-count" min="0" value="0" /></td>
                                    <td class="text-end denom-amount">0.00</td>
                                </tr>
                                <tr data-denom="500">
                                    <td>500</td>
                                    <td><input type="number" class="denom-count" min="0" value="0" /></td>
                                    <td class="text-end denom-amount">0.00</td>
                                </tr>
                                <tr data-denom="200">
                                    <td>200</td>
                                    <td><input type="number" class="denom-count" min="0" value="0" /></td>
                                    <td class="text-end denom-amount">0.00</td>
                                </tr>
                                <tr data-denom="100">
                                    <td>100</td>
                                    <td><input type="number" class="denom-count" min="0" value="0" /></td>
                                    <td class="text-end denom-amount">0.00</td>
                                </tr>
                                <tr data-denom="50">
                                    <td>50</td>
                                    <td><input type="number" class="denom-count" min="0" value="0" /></td>
                                    <td class="text-end denom-amount">0.00</td>
                                </tr>
                                <tr data-denom="10">
                                    <td>10</td>
                                    <td><input type="number" class="denom-count" min="0" value="0" /></td>
                                    <td class="text-end denom-amount">0.00</td>
                                </tr>
                                <tr data-denom="5">
                                    <td>5</td>
                                    <td><input type="number" class="denom-count" min="0" value="0" /></td>
                                    <td class="text-end denom-amount">0.00</td>
                                </tr>
                                <tr data-denom="1">
                                    <td>1</td>
                                    <td><input type="number" class="denom-count" min="0" value="0" /></td>
                                    <td class="text-end denom-amount">0.00</td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr class="denomination-total">
                                    <td colspan="2"><strong>Total</strong></td>
                                    <td class="text-end"><strong id="denominationTotal">0.00</strong></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
                <div class="modal-centered__footer">
                    <button type="button" class="btn btn-outline-secondary" data-action="clear">
                        <i class="bi bi-eraser"></i> Clear
                    </button>
                    <button type="button" class="btn btn-primary" data-action="apply">
                        <i class="bi bi-check2"></i> Apply to Transaction
                    </button>
                    <button type="button" class="btn btn-secondary" data-action="close">Close</button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        wireDenominationModalEvents();
    }

    function wireDenominationModalEvents() {
        const modal = document.getElementById('denominationModal');
        const backdrop = document.getElementById('denominationModalBackdrop');

        if (!modal) return;

        // Close buttons
        modal.querySelectorAll('[data-action="close"]').forEach(btn => {
            btn.addEventListener('click', () => toggleOverlay('denominationModal', false));
        });

        // Backdrop click
        backdrop?.addEventListener('click', () => toggleOverlay('denominationModal', false));

        // Count input changes - calculate amounts
        modal.querySelectorAll('.denom-count').forEach(input => {
            input.addEventListener('input', () => calculateDenominations());
        });

        // Clear button
        modal.querySelector('[data-action="clear"]')?.addEventListener('click', () => {
            modal.querySelectorAll('.denom-count').forEach(input => input.value = 0);
            calculateDenominations();
        });

        // Apply button
        modal.querySelector('[data-action="apply"]')?.addEventListener('click', () => {
            const total = parseFloat(document.getElementById('denominationTotal')?.textContent.replace(/,/g, '')) || 0;

            // Dispatch event with denomination data
            document.dispatchEvent(new CustomEvent('cashtrx:denominationApplied', {
                detail: { total, breakdown: getDenominationBreakdown() }
            }));

            // Optionally set the transaction amount field
            const amountField = document.getElementById('transactionAmount');
            if (amountField && total > 0) {
                amountField.value = formatCurrency(total);
            }

            toggleOverlay('denominationModal', false);
        });
    }

    function calculateDenominations() {
        const modal = document.getElementById('denominationModal');
        if (!modal) return;

        let total = 0;
        modal.querySelectorAll('#denominationBody tr').forEach(row => {
            const denom = parseInt(row.dataset.denom, 10);
            const countInput = row.querySelector('.denom-count');
            const amountCell = row.querySelector('.denom-amount');

            const count = parseInt(countInput?.value, 10) || 0;
            const amount = denom * count;

            if (amountCell) amountCell.textContent = formatCurrency(amount);
            total += amount;
        });

        const totalEl = document.getElementById('denominationTotal');
        if (totalEl) totalEl.textContent = formatCurrency(total);
    }

    function getDenominationBreakdown() {
        const modal = document.getElementById('denominationModal');
        if (!modal) return [];

        const breakdown = [];
        modal.querySelectorAll('#denominationBody tr').forEach(row => {
            const denom = parseInt(row.dataset.denom, 10);
            const count = parseInt(row.querySelector('.denom-count')?.value, 10) || 0;
            if (count > 0) {
                breakdown.push({ denomination: denom, count, amount: denom * count });
            }
        });
        return breakdown;
    }

    function openDenominationModal() {
        createDenominationModal();
        toggleOverlay('denominationModal', true);
    }

    function closeDenominationModal() {
        toggleOverlay('denominationModal', false);
    }

    // ============================================================================
    // 6. PRINT PREVIEW (Transaction Receipt)
    // ============================================================================

    function createPrintPreviewModal() {
        if (document.getElementById('printPreviewModal')) return;

        const modalHTML = `
            <div class="modal-overlay" id="printPreviewModalBackdrop"></div>
            <div class="modal-centered modal-centered--print" id="printPreviewModal" role="dialog" aria-modal="true" aria-hidden="true">
                <div class="modal-centered__header">
                    <h3 class="modal-centered__title">
                        <i class="bi bi-printer"></i>
                        Print Preview
                    </h3>
                    <button type="button" class="modal-centered__close" data-action="close" aria-label="Close">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
                <div class="modal-centered__body print-preview-body">
                    <div class="print-content" id="printContent">
                        <div class="receipt-header">
                            <h2>BR.Net Banking System</h2>
                            <p>Transaction Receipt</p>
                        </div>
                        <div class="receipt-details">
                            <div class="receipt-row">
                                <span class="receipt-label">Transaction ID:</span>
                                <span class="receipt-value" id="printTrxId">--</span>
                            </div>
                            <div class="receipt-row">
                                <span class="receipt-label">Serial No:</span>
                                <span class="receipt-value" id="printSerialId">--</span>
                            </div>
                            <div class="receipt-row">
                                <span class="receipt-label">Date:</span>
                                <span class="receipt-value" id="printDate">--</span>
                            </div>
                            <div class="receipt-row">
                                <span class="receipt-label">Branch:</span>
                                <span class="receipt-value" id="printBranch">--</span>
                            </div>
                            <hr />
                            <div class="receipt-row">
                                <span class="receipt-label">Account:</span>
                                <span class="receipt-value" id="printAccountId">--</span>
                            </div>
                            <div class="receipt-row">
                                <span class="receipt-label">Account Name:</span>
                                <span class="receipt-value" id="printAccountName">--</span>
                            </div>
                            <div class="receipt-row">
                                <span class="receipt-label">Transaction Type:</span>
                                <span class="receipt-value" id="printTrxType">--</span>
                            </div>
                            <hr />
                            <div class="receipt-row receipt-amount">
                                <span class="receipt-label">Amount:</span>
                                <span class="receipt-value" id="printAmount">--</span>
                            </div>
                            <div class="receipt-row">
                                <span class="receipt-label">Currency:</span>
                                <span class="receipt-value" id="printCurrency">--</span>
                            </div>
                            <hr />
                            <div class="receipt-row">
                                <span class="receipt-label">Description:</span>
                                <span class="receipt-value" id="printNarration">--</span>
                            </div>
                            <div class="receipt-row">
                                <span class="receipt-label">Reference:</span>
                                <span class="receipt-value" id="printReference">--</span>
                            </div>
                        </div>
                        <div class="receipt-footer">
                            <p>Operator: <span id="printOperator">--</span></p>
                            <p>Printed: <span id="printTimestamp">--</span></p>
                        </div>
                    </div>
                </div>
                <div class="modal-centered__footer">
                    <button type="button" class="btn btn-primary" data-action="print">
                        <i class="bi bi-printer"></i> Print
                    </button>
                    <button type="button" class="btn btn-secondary" data-action="close">Close</button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        wirePrintPreviewEvents();
    }

    function wirePrintPreviewEvents() {
        const modal = document.getElementById('printPreviewModal');
        const backdrop = document.getElementById('printPreviewModalBackdrop');

        if (!modal) return;

        // Close buttons
        modal.querySelectorAll('[data-action="close"]').forEach(btn => {
            btn.addEventListener('click', () => toggleOverlay('printPreviewModal', false));
        });

        // Backdrop click
        backdrop?.addEventListener('click', () => toggleOverlay('printPreviewModal', false));

        // Print button
        modal.querySelector('[data-action="print"]')?.addEventListener('click', () => {
            const printContent = document.getElementById('printContent')?.innerHTML;
            const printWindow = window.open('', '_blank', 'width=400,height=600');

            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Transaction Receipt</title>
                    <style>
                        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; max-width: 400px; margin: 0 auto; }
                        .receipt-header { text-align: center; margin-bottom: 20px; }
                        .receipt-header h2 { margin: 0; font-size: 18px; }
                        .receipt-header p { margin: 4px 0 0; color: #666; font-size: 14px; }
                        .receipt-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
                        .receipt-label { color: #666; }
                        .receipt-value { font-weight: 500; }
                        .receipt-amount .receipt-value { font-size: 16px; font-weight: 700; }
                        hr { border: none; border-top: 1px dashed #ccc; margin: 10px 0; }
                        .receipt-footer { text-align: center; margin-top: 20px; font-size: 11px; color: #999; }
                        .receipt-footer p { margin: 2px 0; }
                        @media print { body { padding: 0; } }
                    </style>
                </head>
                <body>${printContent}</body>
                </html>
            `);

            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
        });
    }

    function populatePrintPreview() {
        // Populate from form fields
        setElementText('printTrxId', document.getElementById('transactionId')?.value || '--');
        setElementText('printSerialId', document.getElementById('serialId')?.value || '--');
        setElementText('printDate', document.getElementById('systemDate')?.value || '--');
        setElementText('printBranch', `${document.getElementById('branchNo')?.value || ''} - ${document.getElementById('branchName')?.value || ''}`);
        setElementText('printAccountId', document.getElementById('accountId')?.value || '--');
        setElementText('printAccountName', document.getElementById('accountName')?.value || '--');
        setElementText('printTrxType', document.getElementById('transactionType')?.value || '--');
        setElementText('printAmount', document.getElementById('transactionAmount')?.value || '--');
        setElementText('printCurrency', document.getElementById('transactionCurrencyId')?.value || 'ETB');
        setElementText('printNarration', document.getElementById('narration')?.value || '--');
        setElementText('printReference', document.getElementById('referenceNo')?.value || '--');
        setElementText('printOperator', window.OPERATOR_ID || localStorage.getItem('operatorId') || 'SYSTEM');
        setElementText('printTimestamp', new Date().toLocaleString());
    }

    function openPrintPreview() {
        createPrintPreviewModal();
        populatePrintPreview();
        toggleOverlay('printPreviewModal', true);
    }

    function closePrintPreview() {
        toggleOverlay('printPreviewModal', false);
    }

    // Helper to set text content safely
    function setElementText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value || '--';
    }

    // ============================================================================
    // GLOBAL ESC KEY HANDLER
    // ============================================================================
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeActiveOverlay();
        }
    });

    // ============================================================================
    // UTILITY: Currency Formatter
    // ============================================================================
    function formatCurrency(value) {
        if (value === null || value === undefined || value === '') return '--';
        const num = parseFloat(value);
        if (isNaN(num)) return '--';
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function formatDate(value) {
        if (!value) return '--';
        try {
            const date = new Date(value);
            if (isNaN(date.getTime())) return value;
            return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch {
            return value;
        }
    }

    // ============================================================================
    // INITIALIZATION
    // ============================================================================
    function init(options = {}) {
        console.log('[CashTrxOverlays] Initialized');

        // Auto-wire buttons if selectors provided
        if (options.buttons) {
            if (options.buttons.accountInfoBtn) {
                document.querySelector(options.buttons.accountInfoBtn)?.addEventListener('click', openAccountDrawer);
            }
            if (options.buttons.signatureBtn) {
                document.querySelector(options.buttons.signatureBtn)?.addEventListener('click', openSignatureModal);
            }
            if (options.buttons.tellerBtn) {
                document.querySelector(options.buttons.tellerBtn)?.addEventListener('click', openTellerModal);
            }
            if (options.buttons.viewAllBtn) {
                document.querySelector(options.buttons.viewAllBtn)?.addEventListener('click', openViewAllModal);
            }
        }
    }

    // ============================================================================
    // PUBLIC API
    // ============================================================================
    return {
        init,

        // Core toggle function
        toggleOverlay,
        closeActiveOverlay,

        // Account Drawer
        openAccountDrawer,
        closeAccountDrawer,
        populateAccountDrawer,

        // Signature Modal
        openSignatureModal,
        closeSignatureModal,

        // Teller Modal
        openTellerModal,
        closeTellerModal,

        // View All Transactions Modal
        openViewAllModal,
        closeViewAllModal,
        setViewAllData,

        // Denomination Modal
        openDenominationModal,
        closeDenominationModal,

        // Print Preview
        openPrintPreview,
        closePrintPreview
    };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CashTrxOverlays;
}
