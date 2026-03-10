/**
 * Signature / Photo Module - View Submodule
 * Displays account signatories with signature and photo images
 * Migrated from: signature-photo.js (original project)
 */
window.SignaturePhotoModule = (function () {
    'use strict';

    const state = {
        signatories: [],
        selectedSignatory: null,
        recordCount: 0
    };

    const API = {
        GET_SIGNATORIES: 'AccountsMaintenance/api/get-account-signatories',
        GET_CLIENT_IMAGES: 'AccountsMaintenance/api/get-client-images' // ClientDocumentApi endpoint
    };

    /**
     * Get context from global state or storage
     */
    function getContext() {
        const ps = window.AccountMaintenanceState;
        return {
            AccountID: ps?.AccountID || sessionStorage.getItem('currentAccountID') || '',
            OurBranchID: ps?.OurBranchID || sessionStorage.getItem('currentBranchID') || '',
            ClientID: ps?.ClientID || sessionStorage.getItem('currentClientID') || '',
            OperatorID: ps?.OperatorID || sessionStorage.getItem('currentOperatorID') || localStorage.getItem('OperatorID') || 'web_portal',
            OperatingMode: ps?.OperatingMode || '',
            OperatingInstruction: ps?.OperatingInstruction || ''
        };
    }

    // ── UI Helpers ─────────────────────────────────────────────
    const el = (id) => document.getElementById(id);
    const setTxt = (id, v) => { const e = el(id); if (e) e.textContent = (v == null) ? '-' : v; };
    const setVal = (id, v) => { const e = el(id); if (e) e.value = (v == null) ? '' : v; };

    function showLoading(show) {
        const overlay = el('div_loadingOverlay');
        if (overlay) overlay.style.display = show ? 'flex' : 'none';
    }

    function showMessage(msg, type = 'info') {
        const panel = el('div_messagePanel');
        if (panel) {
            panel.className = `message-panel alert alert-${type === 'error' ? 'danger' : type}`;
            panel.textContent = msg;
            panel.style.display = 'block';
            setTimeout(() => panel.style.display = 'none', 5000);
        }
        console.log(`[SignaturePhoto] ${type}: ${msg}`);
    }

    function formatCurrency(value) {
        const num = parseFloat(value) || 0;
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // ── Wire Event Handlers ────────────────────────────────────
    function wireEvents() {
        // Section toggles
        document.querySelectorAll('.section-toggle-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const section = this.closest('.form-section');
                const content = section?.querySelector('.section-content, [data-section-content]');
                const icon = this.querySelector('i');
                const isExpanded = this.getAttribute('aria-expanded') === 'true';

                if (content) content.hidden = isExpanded;
                this.setAttribute('aria-expanded', !isExpanded);
                if (icon) {
                    icon.classList.toggle('bi-chevron-up');
                    icon.classList.toggle('bi-chevron-down');
                }
            });
        });

        // Zoom buttons
        const zoomSigBtn = document.querySelector('[data-action="zoom-sig"]');
        if (zoomSigBtn) {
            zoomSigBtn.addEventListener('click', () => zoomImage('signature'));
        }

        const zoomPhotoBtn = document.querySelector('[data-action="zoom-photo"]');
        if (zoomPhotoBtn) {
            zoomPhotoBtn.addEventListener('click', () => zoomImage('photo'));
        }

        // Download buttons
        const downloadSigBtn = document.querySelector('[data-action="download-sig"]');
        if (downloadSigBtn) {
            downloadSigBtn.addEventListener('click', () => downloadImage('signature'));
        }

        const downloadPhotoBtn = document.querySelector('[data-action="download-photo"]');
        if (downloadPhotoBtn) {
            downloadPhotoBtn.addEventListener('click', () => downloadImage('photo'));
        }
    }

    // ── Sync Operating Mode from Parent ────────────────────────
    function syncOperatingMode() {
        const ctx = getContext();
        const operatingMode = el('ddl_operatingMode');
        const operatingInstruction = el('txt_operatingInstruction');

        if (operatingMode) {
            operatingMode.disabled = true;
            if (ctx.OperatingMode) {
                // Check if option exists
                const optionExists = Array.from(operatingMode.options).some(opt => opt.value === ctx.OperatingMode);
                if (!optionExists) {
                    const newOpt = document.createElement('option');
                    newOpt.value = ctx.OperatingMode;
                    newOpt.textContent = ctx.OperatingMode;
                    operatingMode.appendChild(newOpt);
                }
                operatingMode.value = ctx.OperatingMode;
            }
        }

        if (operatingInstruction && ctx.OperatingInstruction) {
            operatingInstruction.value = ctx.OperatingInstruction;
        }
    }

    // ── Load Signatories ───────────────────────────────────────
    async function loadSignatories() {
        console.log('[SignaturePhoto] Loading signatories...');
        showLoading(true);

        const ctx = getContext();

        if (!ctx.AccountID || !ctx.OurBranchID) {
            showMessage('No account selected. Please select an account first.', 'warning');
            showLoading(false);
            return;
        }

        try {
            const payload = {
                OurBranchID: ctx.OurBranchID,
                AccountID: ctx.AccountID,
                OperatorID: ctx.OperatorID
            };

            console.log('[SignaturePhoto] Request payload:', payload);

            const result = await AppCore.invokeControllerAsync(API.GET_SIGNATORIES, payload);
            console.log('[SignaturePhoto] API Response:', result);

            // Check for explicit error responses
            if (result?.success === false || result?.Status === '091') {
                const errorMsg = result?.Message || result?.message || result?.ResponseMessage || 'Failed to load signatories';
                showMessage(errorMsg, 'error');
                populateGrid([]);
                return;
            }

            // Extract data from various possible response structures
            // Response format: { Details: { AccountOperators: [...], Metadata: {...} }, ResponseCode, ResponseMessage }
            let signatories = [];
            if (result?.Details?.AccountOperators && Array.isArray(result.Details.AccountOperators)) {
                signatories = result.Details.AccountOperators;
            } else if (Array.isArray(result?.Details)) {
                signatories = result.Details;
            } else if (Array.isArray(result?.Data)) {
                signatories = result.Data;
            } else if (Array.isArray(result?.data)) {
                signatories = result.data;
            } else if (Array.isArray(result)) {
                signatories = result;
            }
            
            state.signatories = signatories;
            state.recordCount = signatories.length;
            
            populateGrid(signatories);
            setTxt('spn_signatoriesRecordCount', `(${signatories.length} records)`);

            // Select first signatory if available
            if (signatories.length > 0) {
                selectSignatory(signatories[0], 0);
            } else {
                clearImages();
                clearAuditFields();
            }

            // Sync operating mode
            syncOperatingMode();

        } catch (error) {
            console.error('[SignaturePhoto] Error loading signatories:', error);
            showMessage('Error loading signatories: ' + error.message, 'error');
            populateGrid([]);
        } finally {
            showLoading(false);
        }
    }

    // ── Populate Grid ──────────────────────────────────────────
    function populateGrid(rows) {
        const tbody = document.querySelector('#tbl_signatoriesGrid tbody');
        if (!tbody) {
            console.error('[SignaturePhoto] Grid tbody not found');
            return;
        }

        tbody.innerHTML = '';

        if (!rows || rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">No signatories found.</td></tr>';
            return;
        }

        rows.forEach((row, index) => {
            const tr = document.createElement('tr');
            const limit = parseFloat(row.Limit || row.SignatoryLimit || 0);

            tr.innerHTML = `
                <td>${row.SignatoryID || row.ClientID || '-'}</td>
                <td>${row.SignatoryName || row.Name || '-'}</td>
                <td>${row.SignatoryType || row.Type || '-'}</td>
                <td class="text-end">${formatCurrency(limit)}</td>
            `;
            
            tr.style.cursor = 'pointer';
            tr.addEventListener('click', () => {
                tbody.querySelectorAll('tr').forEach(r => r.classList.remove('table-active'));
                tr.classList.add('table-active');
                selectSignatory(row, index);
            });
            
            tbody.appendChild(tr);
        });

        console.log('[SignaturePhoto] Grid populated with', rows.length, 'rows');
    }

    // ── Select Signatory ───────────────────────────────────────
    async function selectSignatory(signatory, index) {
        console.log('[SignaturePhoto] Selecting signatory:', signatory);
        state.selectedSignatory = signatory;

        // Get the ClientID from the signatory
        const clientId = signatory.SignatoryID || signatory.ClientID;
        
        if (!clientId) {
            console.warn('[SignaturePhoto] No ClientID found for signatory');
            clearImages();
            updateAuditFields(signatory);
            return;
        }

        // Load images from ClientDocumentApi
        await loadClientImages(clientId);

        // Update audit fields
        updateAuditFields(signatory);
    }

    // ── Load Client Images from ClientDocumentApi ──────────────
    async function loadClientImages(clientId) {
        const sigContainer = el('div_signatureImage');
        const photoContainer = el('div_photoImage');
        
        if (sigContainer) sigContainer.innerHTML = '<span class="text-muted">Loading...</span>';
        if (photoContainer) photoContainer.innerHTML = '<span class="text-muted">Loading...</span>';

        try {
            const endpoint = `${API.GET_CLIENT_IMAGES}/${clientId}`;
            console.log('[SignaturePhoto] Fetching images from:', endpoint);

            // Use fetch directly for GET request since invokeControllerAsync is POST-only
            const baseUrl = window.location.origin;
            const fullUrl = `${baseUrl}/${endpoint}`;
            
            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('[SignaturePhoto] Client images response:', result);

            // Check for errors
            if (result?.success === false || result?.errorMessage) {
                console.warn('[SignaturePhoto] Error fetching images:', result?.errorMessage);
                clearImages();
                return;
            }

            // Process the image list - expecting array of image objects
            const images = Array.isArray(result) ? result : (result?.data || result?.Data || []);
            
            let signatureFound = false;
            let photoFound = false;

            for (const img of images) {
                const imageType = (img.ImageType || img.imageType || img.Type || '').toUpperCase();
                const imageData = img.ImageData || img.imageData || img.Data || img.data || img.Base64Data;
                const imageUrl = img.ImageUrl || img.imageUrl || img.Url || img.url;

                if (imageType === 'S' || imageType === 'SIGNATURE') {
                    signatureFound = true;
                    displayImage(sigContainer, imageData, imageUrl, 'Signature');
                } else if (imageType === 'P' || imageType === 'PHOTO' || imageType === 'PHOTOGRAPH') {
                    photoFound = true;
                    displayImage(photoContainer, imageData, imageUrl, 'Photo');
                }
            }

            if (!signatureFound && sigContainer) {
                sigContainer.innerHTML = '<span class="text-muted">No signature available</span>';
            }
            if (!photoFound && photoContainer) {
                photoContainer.innerHTML = '<span class="text-muted">No photo available</span>';
            }

        } catch (error) {
            console.error('[SignaturePhoto] Error loading client images:', error);
            clearImages();
        }
    }

    // ── Display Image Helper ───────────────────────────────────
    function displayImage(container, imageData, imageUrl, altText) {
        if (!container) return;

        const img = document.createElement('img');
        
        if (imageData) {
            // Check if it's already a data URL or just base64
            img.src = imageData.startsWith('data:') ? imageData : `data:image/png;base64,${imageData}`;
        } else if (imageUrl) {
            img.src = imageUrl;
        } else {
            container.innerHTML = `<span class="text-muted">No ${altText.toLowerCase()} available</span>`;
            return;
        }

        img.alt = altText;
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        img.onerror = () => {
            container.innerHTML = `<span class="text-muted">Failed to load ${altText.toLowerCase()}</span>`;
        };
        
        container.innerHTML = '';
        container.appendChild(img);
    }

    // ── Clear Images ───────────────────────────────────────────
    function clearImages() {
        const sigContainer = el('div_signatureImage');
        const photoContainer = el('div_photoImage');
        
        if (sigContainer) sigContainer.innerHTML = '<span class="text-muted">No signature available</span>';
        if (photoContainer) photoContainer.innerHTML = '<span class="text-muted">No photo available</span>';
    }

    // ── Zoom Image ─────────────────────────────────────────────
    function zoomImage(type) {
        const containerId = type === 'signature' ? 'div_signatureImage' : 'div_photoImage';
        const container = el(containerId);
        const img = container?.querySelector('img');
        
        if (!img) {
            showMessage('No image to zoom', 'info');
            return;
        }

        // Open image in new window/modal
        const win = window.open('', '_blank', 'width=800,height=600');
        if (win) {
            win.document.write(`
                <html>
                <head><title>${type === 'signature' ? 'Signature' : 'Photo'}</title></head>
                <body style="margin:0; display:flex; justify-content:center; align-items:center; background:#000;">
                    <img src="${img.src}" style="max-width:100%; max-height:100vh;">
                </body>
                </html>
            `);
        }
    }

    // ── Download Image ─────────────────────────────────────────
    function downloadImage(type) {
        const containerId = type === 'signature' ? 'div_signatureImage' : 'div_photoImage';
        const container = el(containerId);
        const img = container?.querySelector('img');
        
        if (!img) {
            showMessage('No image to download', 'info');
            return;
        }

        const a = document.createElement('a');
        a.href = img.src;
        a.download = `${state.selectedSignatory?.SignatoryID || 'unknown'}_${type}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    // ── Update Audit Fields ────────────────────────────────────
    function updateAuditFields(data) {
        setTxt('spn_createdBy', data?.CreatedBy || data?.AddedBy || '-');
        setTxt('spn_modifiedBy', data?.ModifiedBy || data?.EditedBy || '-');
        setTxt('spn_supervisedBy', data?.SupervisedBy || data?.ApprovedBy || '-');
        setTxt('spn_createdOn', data?.CreatedDate || data?.AddedDate || '-');
        setTxt('spn_modifiedOn', data?.ModifiedDate || data?.EditedDate || '-');
        setTxt('spn_supervisedOn', data?.SupervisedDate || data?.ApprovedDate || '-');
    }

    function clearAuditFields() {
        ['spn_createdBy', 'spn_modifiedBy', 'spn_supervisedBy', 
         'spn_createdOn', 'spn_modifiedOn', 'spn_supervisedOn'].forEach(id => setTxt(id, '-'));
    }

    // ── Action Handlers (called by parent) ─────────────────────
    function refresh() {
        loadSignatories();
    }

    function print() {
        window.print();
    }

    function exportData() {
        if (state.signatories.length === 0) {
            showMessage('No data to export', 'warning');
            return;
        }
        console.log('[SignaturePhoto] Export requested');
        showMessage('Export feature will be implemented', 'info');
    }

    // ── Initialize ─────────────────────────────────────────────
    function init() {
        console.log('[SignaturePhoto] Initializing module...');
        wireEvents();
        loadSignatories();
    }

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Public API
    return {
        init,
        refresh,
        print,
        exportData,
        loadSignatories
    };
})();
