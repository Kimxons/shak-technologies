(function () {
    'use strict';

    // Helper functions
    const byId = (id) => document.getElementById(id);
    const qs = (sel, root = document) => root.querySelector(sel);

    // Dynamic fields getter - ensures DOM elements are found when accessed
    const getFields = () => ({
        assetType: byId('assetType'),
        assetSubType: byId('assetSubType'),
        description: byId('description'),
        createdBy: byId('createdBy'),
        createdOn: byId('createdOn'),
        modifiedBy: byId('modifiedBy'),
        modifiedOn: byId('modifiedOn'),
        supervisedBy: byId('supervisedBy'),
        supervisedOn: byId('supervisedOn')
    });

    // State management
    const MODES = { VIEW: 'view', ADD: 'add', EDIT: 'edit' };
    let mode = MODES.VIEW;
    let currentRecord = null;
    let currentUpdateCount = 0;

    // Service reference - will be loaded async
    let FixedAssetsService = null;

    // =====================
    // Utility Functions
    // =====================

    const setValue = (el, value) => {
        if (!el) return;
        const val = value == null ? '' : String(value);
        // Handle span elements (audit fields) vs input/select elements
        if (el.tagName === 'SPAN') {
            el.textContent = val;
        } else {
            el.value = val;
        }
    };

    function setToast(message, variant = "info") {
        // Always use kairo-toast which has proper CSS styling in styles.css
        let container = qs('.kairo-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'kairo-toast-container';
            document.body.appendChild(container);
        }
        
        // Remove any existing toasts - only show one at a time
        container.querySelectorAll('.kairo-toast').forEach(existingToast => {
            existingToast.classList.remove('is-show');
            setTimeout(() => existingToast.remove(), 200);
        });
        
        const variantClass = variant === 'danger' || variant === 'warning' ? 'kairo-toast--danger' 
                           : variant === 'success' ? 'kairo-toast--success' 
                           : '';
        
        const titleText = variant === 'danger' ? 'Error' 
                        : variant === 'warning' ? 'Warning' 
                        : variant === 'success' ? 'Success' 
                        : 'Info';
        
        const toast = document.createElement('div');
        toast.className = `kairo-toast ${variantClass}`;
        toast.innerHTML = `
            <div class="kairo-toast__title">
                <span>${titleText}</span>
                <button class="kairo-toast__close" type="button">&times;</button>
            </div>
            <div class="kairo-toast__body">${message}</div>
        `;
        
        container.appendChild(toast);
        
        // Show animation - use setTimeout to ensure DOM is ready
        setTimeout(() => toast.classList.add('is-show'), 10);
        
        // Close button
        toast.querySelector('.kairo-toast__close')?.addEventListener('click', () => {
            toast.classList.remove('is-show');
            setTimeout(() => toast.remove(), 200);
        });
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            toast.classList.remove('is-show');
            setTimeout(() => toast.remove(), 200);
        }, 5000);
        
        console.log(`[FixedAssetSubType] Toast (${variant}): ${message}`);
    }

    const setButtonDisabled = (btn, disabled) => {
        if (!btn) return;
        btn.disabled = Boolean(disabled);
    };

    const isActionButton = (target) => {
        const btn = target?.closest('[data-action]');
        if (!btn) return null;
        const action = btn.getAttribute('data-action');
        return { btn, text: action };
    };

    // Format datetime for API requests using GlobalUtils
    const formatDateTime = (date) => {
        if (window.GlobalUtils?.getCurrentDateTime) {
            // For current date, use GlobalUtils
            if (!date || date instanceof Date) {
                return window.GlobalUtils.getCurrentDateTime();
            }
        }
        // Fallback for API format MM/DD/YYYY HH:MM:SS
        const d = date || new Date();
        const pad = n => n.toString().padStart(2, '0');
        return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };

    // Format datetime for display using GlobalUtils
    const formatDateTimeForDisplay = (dateString) => {
        if (!dateString) return '';
        if (window.GlobalUtils?.formatDateTime) {
            return window.GlobalUtils.formatDateTime(dateString);
        }
        // Fallback if GlobalUtils not available
        return dateString;
    };

    const getOperatorId = () => {
        try {
            const session = window.AuthService?.getSession?.();
            return session?.operatorId || session?.operatorID || 'CSADM';
        } catch {
            return 'CSADM';
        }
    };

    // Extract records from API response (handles different response structures)
    const extractRecordsFromResponse = (responseData) => {
        if (!responseData) return [];
        
        // Check for Details01 array (primary data container)
        if (Array.isArray(responseData.Details01) && responseData.Details01.length > 0) {
            return responseData.Details01;
        }
        
        // Fallback to Details array
        if (Array.isArray(responseData.Details) && responseData.Details.length > 0) {
            return responseData.Details;
        }
        
        // If responseData itself is an array
        if (Array.isArray(responseData)) {
            return responseData;
        }
        
        return [];
    };

    // =====================
    // Form Functions
    // =====================

    const setFormDisabled = (disabled, { keepAssetTypeEnabled = true } = {}) => {
        const currentFields = getFields();
        const editableEls = [
            currentFields.assetType,
            currentFields.assetSubType,
            currentFields.description
        ].filter(Boolean);

        for (const el of editableEls) {
            if (!el) continue;
            if (keepAssetTypeEnabled && (el === currentFields.assetType || el === currentFields.assetSubType)) {
                el.disabled = false;
            } else {
                el.disabled = Boolean(disabled);
            }
        }
    };

    const updateActionState = () => {
        const hasRecord = Boolean(currentRecord);
        const currentFields = getFields();

        const viewBtn = document.querySelector('[data-action="view"]');
        const addBtn = document.querySelector('[data-action="add"]');
        const editBtn = document.querySelector('[data-action="edit"]');
        const deleteBtn = document.querySelector('[data-action="delete"]');
        const saveBtn = document.querySelector('[data-action="save"]');
        const cancelBtn = document.querySelector('[data-action="cancel"]');

        if (mode === MODES.ADD) {
            // In ADD mode: assetType and assetSubType are disabled (locked), only description is editable
            if (currentFields.assetType) currentFields.assetType.disabled = true;
            if (currentFields.assetSubType) currentFields.assetSubType.disabled = true;
            if (currentFields.description) currentFields.description.disabled = false;
            
            setButtonDisabled(viewBtn, false);
            setButtonDisabled(addBtn, true); // Disable Add since we're already in Add mode
            setButtonDisabled(editBtn, true);
            setButtonDisabled(deleteBtn, true);
            setButtonDisabled(saveBtn, false);
            setButtonDisabled(cancelBtn, false);
            return;
        }

        if (mode === MODES.EDIT) {
            setFormDisabled(false, { keepAssetTypeEnabled: false });
            if (currentFields.assetType) currentFields.assetType.disabled = true;
            if (currentFields.assetSubType) currentFields.assetSubType.disabled = true;
            setButtonDisabled(viewBtn, false);
            setButtonDisabled(addBtn, false);
            setButtonDisabled(editBtn, false);
            setButtonDisabled(deleteBtn, false);
            setButtonDisabled(saveBtn, false);
            setButtonDisabled(cancelBtn, false);
            return;
        }

        // View Mode
        setFormDisabled(true, { keepAssetTypeEnabled: true });
        setButtonDisabled(cancelBtn, false);
        setButtonDisabled(saveBtn, true);

        if (hasRecord) {
            setButtonDisabled(viewBtn, false);
            setButtonDisabled(addBtn, false);
            setButtonDisabled(editBtn, false);
            setButtonDisabled(deleteBtn, false);
        } else {
            setButtonDisabled(viewBtn, false);
            setButtonDisabled(addBtn, false);
            setButtonDisabled(editBtn, true);
            setButtonDisabled(deleteBtn, true);
        }
    };

    const clearForm = () => {
        const currentFields = getFields();
        Object.values(currentFields).forEach(field => {
            if (!field) return;
            // Handle span elements (audit fields) vs input/select elements
            if (field.tagName === 'SPAN') {
                field.textContent = '';
            } else if (field.tagName === 'SELECT') {
                field.selectedIndex = 0;
            } else {
                field.value = '';
            }
        });
    };

    const populateForm = (record) => {
        if (!record) return;

        currentRecord = record;
        currentUpdateCount = record.UpdateCount ?? 0;
        console.log('[FixedAssetSubType] Populating form with record:', record);
        console.log('[FixedAssetSubType] UpdateCount:', currentUpdateCount);

        const currentFields = getFields();

        // Field to record property mapping
        const fieldMapping = {
            assetType: 'FixedAssetTypeID',
            assetSubType: 'FixedAssetSubTypeID',
            description: 'Description',
            createdBy: 'CreatedBy',
            createdOn: 'CreatedOn',
            modifiedBy: 'ModifiedBy',
            modifiedOn: 'ModifiedOn',
            supervisedBy: 'SupervisedBy',
            supervisedOn: 'SupervisedOn'
        };

        // Bind each field to its corresponding record property
        Object.entries(fieldMapping).forEach(([fieldKey, recordKey]) => {
            const element = currentFields[fieldKey];
            let value = record[recordKey];
            
            // Format datetime values for display
            if (value && recordKey.endsWith('On') && typeof value === 'string') {
                value = formatDateTimeForDisplay(value);
            }
            
            setValue(element, value);
        });
    };

    // =====================
    // Dropdown Loading
    // =====================

    const loadAssetTypes = async () => {
        if (!window.CustomCodesLookupService) {
            console.warn('[FixedAssetSubType] CustomCodesLookupService not loaded');
            return;
        }

        try {
            const response = await window.CustomCodesLookupService.getCustomCodeOptions('FixedAssetTypeID');
            const selectEl = byId('assetType');
            
            if (!selectEl) {
                console.error('[FixedAssetSubType] assetType select element not found');
                return;
            }
            
            selectEl.innerHTML = '<option value="">--Select--</option>';

            const items = Array.isArray(response) ? response : (response && response.Details) || [];

            if (items && items.length > 0) {
                items.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item.SubCodeID || item.value;
                    option.textContent = item.CodeDescription || item.label;
                    selectEl.appendChild(option);
                });
            }
        } catch (e) {
            console.error('[FixedAssetSubType] Failed to load Asset Types:', e);
        }
    };

    // =====================
    // Action Handlers
    // =====================

    const handleView = async () => {
        console.log('[FixedAssetSubType] View clicked');

        const assetTypeID = byId('assetType')?.value || '';
        const assetSubTypeID = byId('assetSubType')?.value || '';

        if (!assetTypeID && !assetSubTypeID) {
            setToast('Please select at least one field to search.', 'warning');
            return;
        }

        if (!assetTypeID && assetSubTypeID) {
            setToast('Please select a Fixed Asset Type when searching by Sub Type.', 'warning');
            return;
        }

        if (!FixedAssetsService) {
            setToast('Service not available.', 'danger');
            return;
        }

        setToast('Loading...', 'info');

        const requestData = {
            BankID: window.Environment?.bankId || '00',
            OurBranchID: window.Environment?.branchId || '0101',
            FixedAssetTypeID: assetTypeID,
            FixedAssetSubTypeID: assetSubTypeID,
            OperatorID: getOperatorId()
        };

        console.log('[FixedAssetSubType] Request data:', requestData);

        try {
            let response = await FixedAssetsService.getFASubTypes(requestData);
            console.log('[FixedAssetSubType] Full response:', response);

            let records = extractRecordsFromResponse(response?.data);
            console.log('[FixedAssetSubType] Extracted records:', records);
            
            // If searching with specific subtype, filter to exact match
            let matchingRecord = null;
            if (assetSubTypeID && records.length > 0) {
                matchingRecord = records.find(r => 
                    String(r.FixedAssetSubTypeID).trim() === String(assetSubTypeID).trim()
                );
                console.log('[FixedAssetSubType] Matching record for SubTypeID', assetSubTypeID, ':', matchingRecord);
            } else if (records.length > 0) {
                matchingRecord = records[0];
            }

            if (response && response.success) {
                if (matchingRecord) {
                    populateForm(matchingRecord);
                    mode = MODES.VIEW;
                    updateActionState();
                    setToast('Record loaded successfully.', 'success');
                } else {
                    // Record not found - prepare for Add
                    currentRecord = null;
                    currentUpdateCount = 0;
                    
                    // Clear only non-key fields, preserve assetType and assetSubType
                    const currentFields = getFields();
                    if (currentFields.description) setValue(currentFields.description, '');
                    if (currentFields.createdBy) setValue(currentFields.createdBy, '');
                    if (currentFields.createdOn) setValue(currentFields.createdOn, '');
                    if (currentFields.modifiedBy) setValue(currentFields.modifiedBy, '');
                    if (currentFields.modifiedOn) setValue(currentFields.modifiedOn, '');
                    if (currentFields.supervisedBy) setValue(currentFields.supervisedBy, '');
                    if (currentFields.supervisedOn) setValue(currentFields.supervisedOn, '');
                    
                    // Enable Add button and show message
                    mode = MODES.VIEW;
                    updateActionState();
                    setToast('No record found, proceed to add.', 'info');
                }
            } else {
                setToast(response?.message || 'Error fetching data', 'danger');
            }
        } catch (err) {
            console.error('[FixedAssetSubType] Error:', err);
            setToast('An unexpected error occurred.', 'danger');
        }
    };

    const handleAdd = () => {
        console.log('[FixedAssetSubType] Add clicked');

        const currentFields = getFields();
        const preservedAssetType = currentFields.assetType?.value || '';
        const preservedAssetSubType = currentFields.assetSubType?.value || '';

        // Validate required search fields before allowing Add
        if (!preservedAssetType) {
            setToast('Please select a Fixed Asset Type first.', 'warning');
            return;
        }
        if (!preservedAssetSubType) {
            setToast('Please enter a Fixed Asset Sub Type first.', 'warning');
            return;
        }

        mode = MODES.ADD;
        currentRecord = null;
        currentUpdateCount = 0;

        // Clear only description, preserve assetType and assetSubType
        if (currentFields.description) currentFields.description.value = '';
        
        // Clear audit fields
        if (currentFields.createdBy) setValue(currentFields.createdBy, '');
        if (currentFields.createdOn) setValue(currentFields.createdOn, '');
        if (currentFields.modifiedBy) setValue(currentFields.modifiedBy, '');
        if (currentFields.modifiedOn) setValue(currentFields.modifiedOn, '');
        if (currentFields.supervisedBy) setValue(currentFields.supervisedBy, '');
        if (currentFields.supervisedOn) setValue(currentFields.supervisedOn, '');

        updateActionState();
        setToast('Add mode active. Enter description and save.', 'info');
    };

    const handleEdit = () => {
        console.log('[FixedAssetSubType] Edit clicked');

        if (!currentRecord) {
            setToast('Load a record first (click View), then Edit.', 'warning');
            return;
        }

        mode = MODES.EDIT;
        updateActionState();
        setToast('Edit mode active', 'info');
    };

    const handleSave = async () => {
        console.log('[FixedAssetSubType] Save clicked');

        if (mode === MODES.VIEW) {
            setToast('Switch to Add/Edit before saving.', 'warning');
            return;
        }

        if (!FixedAssetsService) {
            setToast('Service not available.', 'danger');
            return;
        }

        const currentFields = getFields();
        const assetTypeID = currentFields.assetType?.value?.trim() || '';
        const assetSubTypeID = currentFields.assetSubType?.value?.trim() || '';

        if (!assetTypeID) {
            setToast('Fixed Asset Type is required.', 'warning');
            return;
        }
        if (!assetSubTypeID) {
            setToast('Fixed Asset Sub Type is required.', 'warning');
            return;
        }

        setToast('Saving...', 'info');

        const now = new Date();
        const isAddMode = mode === MODES.ADD;
        const operatorId = getOperatorId();

        const requestData = {
            BankID: window.Environment?.bankId || '00',
            FixedAssetTypeID: assetTypeID,
            FixedAssetSubTypeID: assetSubTypeID,
            Description: currentFields.description?.value?.trim() || '',
            CreatedBy: isAddMode ? operatorId : (currentRecord?.CreatedBy || operatorId),
            CreatedOn: isAddMode ? formatDateTime(now) : (currentRecord?.CreatedOn || formatDateTime(now)),
            ModifiedBy: isAddMode ? '' : operatorId,
            ModifiedOn: isAddMode ? null : formatDateTime(now),
            SupervisedBy: '',
            NewRecord: isAddMode ? 1 : currentUpdateCount
        };

        console.log('[FixedAssetSubType] Save request data:', requestData);

        try {
            const response = await FixedAssetsService.addEditFASubTypes(requestData);
            console.log('[FixedAssetSubType] Save response:', response);

            if (response && response.success) {
                setToast('Record saved successfully.', 'success');
                clearForm();
                currentRecord = null;
                currentUpdateCount = 0;
                mode = MODES.VIEW;
                updateActionState();
            } else {
                if (response?.Status === '091' && response?.Message?.includes('Edit already done')) {
                    setToast('Edit failed: record was updated by another user. Please reload.', 'danger');
                } else {
                    setToast(response?.message || response?.Message || 'Failed to save record.', 'danger');
                }
            }
        } catch (err) {
            console.error('[FixedAssetSubType] Save error:', err);
            setToast('Error saving record.', 'danger');
        }
    };

    const handleDelete = async () => {
        console.log('[FixedAssetSubType] Delete clicked');

        if (!currentRecord) {
            setToast('No record loaded to delete.', 'warning');
            return;
        }

        if (!FixedAssetsService) {
            setToast('Service not available.', 'danger');
            return;
        }

        const currentFields = getFields();
        const assetTypeID = currentFields.assetType?.value?.trim() || '';
        const assetSubTypeID = currentFields.assetSubType?.value?.trim() || '';

        if (!assetTypeID || !assetSubTypeID) {
            setToast('No record selected to delete.', 'warning');
            return;
        }

        if (!confirm(`Are you sure you want to delete Sub Type: ${assetSubTypeID}?`)) {
            return;
        }

        setToast('Deleting...', 'info');

        const requestData = {
            BankID: window.Environment?.bankId || '00',
            FixedAssetTypeID: assetTypeID,
            FixedAssetSubTypeID: assetSubTypeID,
            NewRecord: currentUpdateCount
        };

        console.log('[FixedAssetSubType] Delete request data:', requestData);

        try {
            const response = await FixedAssetsService.deleteFASubTypes(requestData);
            console.log('[FixedAssetSubType] Delete response:', response);

            if (response && response.success) {
                setToast('Record deleted successfully.', 'success');
                clearForm();
                currentRecord = null;
                currentUpdateCount = 0;
                mode = MODES.VIEW;
                updateActionState();
            } else {
                setToast(response?.message || response?.Message || 'Failed to delete record.', 'danger');
            }
        } catch (err) {
            console.error('[FixedAssetSubType] Delete error:', err);
            setToast('Error deleting record.', 'danger');
        }
    };

    const handleCancel = () => {
        console.log('[FixedAssetSubType] Cancel clicked');

        if (mode === MODES.EDIT && currentRecord) {
            populateForm(currentRecord);
            mode = MODES.VIEW;
            setToast('Edit cancelled. Record restored.', 'info');
            updateActionState();
            return;
        }

        clearForm();
        currentRecord = null;
        currentUpdateCount = 0;
        mode = MODES.VIEW;
        setToast('Screen cleared.', 'success');
        updateActionState();
    };

    // =====================
    // Search Modal
    // =====================

    function ensureSearchService() {
        if (window.SearchService) return window.SearchService;
        if (window.ServiceLoader?.loadSearchService) {
            window.ServiceLoader.loadSearchService();
            return window.SearchService;
        }
        return null;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function ensureSubTypeSearchModal() {
        const existing = qs('#faSubTypeSearchModal');
        if (existing) return existing;

        // Create popup container (not Bootstrap modal)
        const popup = document.createElement('div');
        popup.id = 'faSubTypeSearchModal';
        popup.style.cssText = `
            display: none;
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10500;
            width: 650px;
            max-width: 90vw;
            box-shadow: 0 4px 20px rgba(0,0,0,0.4);
            border: 1px solid #2a6496;
        `;

        popup.innerHTML = `
            <!-- Header - Dark Blue -->
            <div style="background: #337ab7; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #fff; font-weight: 500; font-size: 14px;">Fixed Asset Sub Type - <span data-asset-type-label></span></span>
                <button type="button" data-dismiss-modal style="background: transparent; border: none; color: #fff; font-size: 18px; cursor: pointer; padding: 0; line-height: 1;">&times;</button>
            </div>
            
            <!-- Body -->
            <div style="background: #fff; padding: 16px 20px;">
                <!-- Filter Form -->
                <form data-lookup-form>
                    <!-- Filter Row - Two columns -->
                    <div style="display: flex; gap: 20px; margin-bottom: 12px;">
                        <!-- Sub Type ID Filter -->
                        <div style="flex: 1;">
                            <label style="display: block; font-size: 12px; color: #333; margin-bottom: 4px; font-weight: 500;">FixedAssetSubTypeID</label>
                            <div style="display: flex; gap: 6px;">
                                <select data-lookup-mode="FixedAssetSubTypeID" style="width: 70px; height: 28px; padding: 2px 6px; font-size: 12px; border: 1px solid #ccc;">
                                    <option value="Like" selected>Like</option>
                                    <option value="Exact">Exact</option>
                                </select>
                                <input type="text" data-lookup-field="FixedAssetSubTypeID" style="flex: 1; height: 28px; padding: 2px 8px; font-size: 12px; border: 1px solid #ccc;" />
                            </div>
                        </div>
                        <!-- Description Filter -->
                        <div style="flex: 1;">
                            <label style="display: block; font-size: 12px; color: #333; margin-bottom: 4px; font-weight: 500;">Description</label>
                            <div style="display: flex; gap: 6px;">
                                <select data-lookup-mode="Description" style="width: 70px; height: 28px; padding: 2px 6px; font-size: 12px; border: 1px solid #ccc;">
                                    <option value="Like" selected>Like</option>
                                    <option value="Exact">Exact</option>
                                </select>
                                <input type="text" data-lookup-field="Description" style="flex: 1; height: 28px; padding: 2px 8px; font-size: 12px; border: 1px solid #ccc;" />
                            </div>
                        </div>
                    </div>
                    
                    <!-- Search Button - Centered -->
                    <div style="text-align: center; margin-bottom: 12px;">
                        <button type="submit" data-lookup-submit style="background-color: #5a6268; border: 1px solid #4a5258; color: #fff; min-width: 80px; font-size: 12px; padding: 5px 16px; cursor: pointer;">
                            Search
                        </button>
                    </div>
                </form>
                
                <!-- Results Table -->
                <div style="border: 1px solid #ddd; max-height: 200px; overflow-y: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                        <thead>
                            <tr style="background: #337ab7; position: sticky; top: 0;">
                                <th style="width: 35px; padding: 8px 10px; font-weight: 600; color: #fff; border: none; text-align: left;">#</th>
                                <th style="padding: 8px 10px; font-weight: 600; color: #fff; border: none; text-align: left;">Sub Type ID</th>
                                <th style="padding: 8px 10px; font-weight: 600; color: #fff; border: none; text-align: left;">Description</th>
                            </tr>
                        </thead>
                        <tbody data-lookup-results></tbody>
                    </table>
                    
                    <!-- Empty State -->
                    <div data-lookup-empty style="font-size: 12px; padding: 12px; text-align: center; color: #666;">
                        Enter at least one filter above and click Search.
                    </div>
                    
                    <!-- Loading State -->
                    <div data-lookup-loading style="display: none; font-size: 12px; padding: 12px; text-align: center; color: #666;">
                        Loading...
                    </div>
                </div>
                
                <!-- Results count -->
                <div data-lookup-status style="font-size: 11px; color: #666; margin-top: 6px;"></div>
            </div>
            
            <!-- Footer - Dark Blue with OK button -->
            <div style="background: #337ab7; padding: 10px 16px; text-align: center;">
                <button type="button" data-lookup-ok style="background-color: #6c757d; border: 1px solid #5a6268; color: #fff; min-width: 70px; font-size: 12px; padding: 5px 16px; cursor: pointer;" disabled>OK</button>
            </div>
        `;

        // Add custom styles for row selection and hover
        const style = document.createElement('style');
        style.textContent = `
            #faSubTypeSearchModal [data-lookup-results] tr { cursor: pointer; transition: background-color 0.1s; }
            #faSubTypeSearchModal [data-lookup-results] tr:nth-child(odd) { background-color: #fff; }
            #faSubTypeSearchModal [data-lookup-results] tr:nth-child(even) { background-color: #f5f5f5; }
            #faSubTypeSearchModal [data-lookup-results] tr:hover { background-color: #d9edf7 !important; }
            #faSubTypeSearchModal [data-lookup-results] tr.selected { background-color: #337ab7 !important; color: #fff; }
        `;
        popup.appendChild(style);

        document.body.appendChild(popup);
        return popup;
    }

    let selectedSearchRow = null;

    function showSearchModal() {
        const popup = ensureSubTypeSearchModal();
        
        // Get selected asset type for filtering
        const assetTypeSelect = byId('assetType');
        const assetTypeID = assetTypeSelect?.value || '';
        if (!assetTypeID) {
            setToast('Please select a Fixed Asset Type first.', 'warning');
            return;
        }
        
        // Get selected Asset Type description for header
        const assetTypeText = assetTypeSelect?.options[assetTypeSelect.selectedIndex]?.text || assetTypeID;
        const assetTypeLabel = popup.querySelector('[data-asset-type-label]');
        if (assetTypeLabel) assetTypeLabel.textContent = assetTypeText;
        
        // Clear previous results
        const resultsBody = popup.querySelector('[data-lookup-results]');
        const emptyState = popup.querySelector('[data-lookup-empty]');
        const statusDiv = popup.querySelector('[data-lookup-status]');
        const okBtn = popup.querySelector('[data-lookup-ok]');
        
        if (resultsBody) resultsBody.innerHTML = '';
        if (emptyState) {
            emptyState.textContent = 'Loading...';
            emptyState.style.display = 'block';
        }
        if (statusDiv) statusDiv.textContent = '';
        if (okBtn) okBtn.disabled = true;
        selectedSearchRow = null;
        
        // Clear form fields
        popup.querySelectorAll('[data-lookup-field]').forEach(input => input.value = '');
        
        // Show popup
        popup.style.display = 'block';
        
        // Setup event handlers
        setupSearchModalEvents(popup, assetTypeID);
        
        // Auto-load subtypes for the selected asset type
        loadSubTypesForAssetType(popup, assetTypeID);
    }
    
    async function loadSubTypesForAssetType(popup, assetTypeID) {
        const resultsBody = popup.querySelector('[data-lookup-results]');
        const emptyState = popup.querySelector('[data-lookup-empty]');
        const loadingState = popup.querySelector('[data-lookup-loading]');
        const statusDiv = popup.querySelector('[data-lookup-status]');
        const okBtn = popup.querySelector('[data-lookup-ok]');
        
        // Show loading
        if (loadingState) loadingState.style.display = 'block';
        if (emptyState) emptyState.style.display = 'none';
        if (resultsBody) resultsBody.innerHTML = '';
        
        try {
            const SearchService = ensureSearchService();
            if (!SearchService) {
                throw new Error('SearchService not available');
            }
            
            // Filter by the selected Asset Type
            const advFilter = `FixedAssetTypeID = '${assetTypeID}'`;
            
            const requestData = {
                TableID: 'FixedAssetSubTypeID',
                AdvFilterString: advFilter,
                WhereStmt: '',
                PrevOrNext: 0,
                RefID: null,
                OperatorID: getOperatorId(),
                ModuleID: 8410,
                OurBranchID: window.Environment?.branchId || '0101',
                SearchKey: '',
                LanguageID: 'en'
            };
            
            console.log('[FixedAssetSubType] Auto-load request:', requestData);
            
            const response = await SearchService.search(requestData);
            console.log('[FixedAssetSubType] Auto-load response:', response);
            
            if (loadingState) loadingState.style.display = 'none';
            
            if (response && response.success && response.data) {
                const rows = response.data.Details || response.data.Details01 || [];
                
                if (rows.length === 0) {
                    if (emptyState) {
                        emptyState.textContent = 'No sub types found for this asset type.';
                        emptyState.style.display = 'block';
                    }
                    if (statusDiv) statusDiv.textContent = '0 records found';
                } else {
                    if (emptyState) emptyState.style.display = 'none';
                    
                    // Render results
                    let html = '';
                    rows.forEach((row, idx) => {
                        html += `<tr data-row-idx="${idx}" data-subtype-id="${escapeHtml(row.FixedAssetSubTypeID || '')}" data-description="${escapeHtml(row.Description || '')}" style="cursor: pointer;">
                            <td style="padding: 6px 10px; border-bottom: 1px solid #ddd;">${idx + 1}</td>
                            <td style="padding: 6px 10px; border-bottom: 1px solid #ddd;">${escapeHtml(row.FixedAssetSubTypeID || '')}</td>
                            <td style="padding: 6px 10px; border-bottom: 1px solid #ddd;">${escapeHtml(row.Description || '')}</td>
                        </tr>`;
                    });
                    
                    if (resultsBody) resultsBody.innerHTML = html;
                    if (statusDiv) statusDiv.textContent = `${rows.length} record(s) found`;
                    
                    // Attach row click handlers
                    attachRowClickHandlers(popup, okBtn);
                }
            } else {
                if (emptyState) {
                    emptyState.textContent = response?.message || 'Error fetching results.';
                    emptyState.style.display = 'block';
                }
            }
        } catch (err) {
            console.error('[FixedAssetSubType] Auto-load error:', err);
            if (loadingState) loadingState.style.display = 'none';
            if (emptyState) {
                emptyState.textContent = 'Error: ' + err.message;
                emptyState.style.display = 'block';
            }
        }
    }
    
    function attachRowClickHandlers(popup, okBtn) {
        popup.querySelectorAll('[data-lookup-results] tr').forEach(tr => {
            tr.addEventListener('click', () => {
                // Remove previous selection
                popup.querySelectorAll('[data-lookup-results] tr').forEach(r => r.classList.remove('selected'));
                tr.classList.add('selected');
                tr.style.backgroundColor = '#337ab7';
                tr.style.color = '#fff';
                
                // Reset others
                popup.querySelectorAll('[data-lookup-results] tr').forEach(r => {
                    if (!r.classList.contains('selected')) {
                        r.style.backgroundColor = '';
                        r.style.color = '';
                    }
                });
                
                selectedSearchRow = tr;
                if (okBtn) okBtn.disabled = false;
            });
        });
    }

    function hideSearchModal() {
        const popup = qs('#faSubTypeSearchModal');
        if (popup) {
            popup.style.display = 'none';
        }
    }

    function setupSearchModalEvents(popup, assetTypeID) {
        const form = popup.querySelector('[data-lookup-form]');
        const resultsBody = popup.querySelector('[data-lookup-results]');
        const emptyState = popup.querySelector('[data-lookup-empty]');
        const loadingState = popup.querySelector('[data-lookup-loading]');
        const statusDiv = popup.querySelector('[data-lookup-status]');
        const okBtn = popup.querySelector('[data-lookup-ok]');
        const closeBtn = popup.querySelector('[data-dismiss-modal]');
        
        // Remove old handlers by cloning
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);
        
        const newOkBtn = okBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOkBtn, okBtn);
        
        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        
        // Close button handler
        newCloseBtn.addEventListener('click', () => hideSearchModal());
        
        // Form submit handler
        newForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const subTypeIDInput = popup.querySelector('[data-lookup-field="FixedAssetSubTypeID"]');
            const descInput = popup.querySelector('[data-lookup-field="Description"]');
            const subTypeIDMode = popup.querySelector('[data-lookup-mode="FixedAssetSubTypeID"]');
            const descMode = popup.querySelector('[data-lookup-mode="Description"]');
            
            const subTypeID = subTypeIDInput?.value?.trim() || '';
            const description = descInput?.value?.trim() || '';
            
            // Build AdvFilterString - always filter by selected AssetType
            let advFilter = `FixedAssetTypeID = '${assetTypeID}'`;
            
            if (subTypeID) {
                const mode = subTypeIDMode?.value || 'Like';
                if (mode === 'Like') {
                    advFilter += ` AND FixedAssetSubTypeID LIKE '%${subTypeID}%'`;
                } else {
                    advFilter += ` AND FixedAssetSubTypeID = '${subTypeID}'`;
                }
            }
            
            if (description) {
                const mode = descMode?.value || 'Like';
                if (mode === 'Like') {
                    advFilter += ` AND Description LIKE '%${description}%'`;
                } else {
                    advFilter += ` AND Description = '${description}'`;
                }
            }
            
            // Show loading
            if (loadingState) loadingState.style.display = 'block';
            if (emptyState) emptyState.style.display = 'none';
            if (resultsBody) resultsBody.innerHTML = '';
            if (statusDiv) statusDiv.textContent = '';
            
            try {
                const SearchService = ensureSearchService();
                if (!SearchService) {
                    throw new Error('SearchService not available');
                }
                
                const requestData = {
                    TableID: 'FixedAssetSubTypeID',
                    AdvFilterString: advFilter,
                    WhereStmt: '',
                    PrevOrNext: 0,
                    RefID: null,
                    OperatorID: getOperatorId(),
                    ModuleID: 8410,
                    OurBranchID: window.Environment?.branchId || '0101',
                    SearchKey: '',
                    LanguageID: 'en'
                };
                
                console.log('[FixedAssetSubType] Search request:', requestData);
                
                const response = await SearchService.search(requestData);
                console.log('[FixedAssetSubType] Search response:', response);
                
                if (loadingState) loadingState.style.display = 'none';
                
                if (response && response.success && response.data) {
                    const rows = response.data.Details || response.data.Details01 || [];
                    
                    if (rows.length === 0) {
                        if (emptyState) {
                            emptyState.textContent = 'No records found.';
                            emptyState.style.display = 'block';
                        }
                        if (statusDiv) statusDiv.textContent = '0 records found';
                    } else {
                        if (emptyState) emptyState.style.display = 'none';
                        
                        // Render results
                        let html = '';
                        rows.forEach((row, idx) => {
                            html += `<tr data-row-idx="${idx}" data-subtype-id="${escapeHtml(row.FixedAssetSubTypeID || '')}" data-description="${escapeHtml(row.Description || '')}" style="cursor: pointer;">
                                <td style="padding: 6px 10px; border-bottom: 1px solid #ddd;">${idx + 1}</td>
                                <td style="padding: 6px 10px; border-bottom: 1px solid #ddd;">${escapeHtml(row.FixedAssetSubTypeID || '')}</td>
                                <td style="padding: 6px 10px; border-bottom: 1px solid #ddd;">${escapeHtml(row.Description || '')}</td>
                            </tr>`;
                        });
                        
                        if (resultsBody) resultsBody.innerHTML = html;
                        if (statusDiv) statusDiv.textContent = `${rows.length} record(s) found`;
                        
                        // Attach row click handlers
                        attachRowClickHandlers(popup, newOkBtn);
                    }
                } else {
                    if (emptyState) {
                        emptyState.textContent = response?.message || 'Error fetching results.';
                        emptyState.style.display = 'block';
                    }
                }
            } catch (err) {
                console.error('[FixedAssetSubType] Search error:', err);
                if (loadingState) loadingState.style.display = 'none';
                if (emptyState) {
                    emptyState.textContent = 'Error: ' + err.message;
                    emptyState.style.display = 'block';
                }
            }
        });
        
        // OK button handler
        newOkBtn.addEventListener('click', () => {
            if (!selectedSearchRow) return;
            
            const subTypeID = selectedSearchRow.getAttribute('data-subtype-id') || '';
            const description = selectedSearchRow.getAttribute('data-description') || '';
            
            // Populate form fields
            const subTypeInput = byId('assetSubType');
            const descInput = byId('description');
            
            if (subTypeInput) subTypeInput.value = subTypeID;
            if (descInput) setValue(descInput, description);
            
            hideSearchModal();
            
            // Trigger view to load the full record
            handleView();
        });
    }

    // =====================
    // Initialization
    // =====================

    async function loadFixedAssetsService() {
        if (window.FixedAssetsService) return window.FixedAssetsService;
        if (window.ServiceLoader?.loadFixedAssetsService) {
            await window.ServiceLoader.loadFixedAssetsService();
            return window.FixedAssetsService;
        }
        return null;
    }

    async function init() {
        console.log('[FixedAssetSubType] Initializing...');

        // Load service
        FixedAssetsService = await loadFixedAssetsService();
        if (!FixedAssetsService) {
            console.error('[FixedAssetSubType] FixedAssetsService not loaded');
            setToast('Failed to load service', 'danger');
            return;
        }

        console.log('[FixedAssetSubType] Service loaded successfully');

        // Load dropdowns
        await loadAssetTypes();

        // Wire up search button
        const searchBtn = qs('.btn-lookup');
        if (searchBtn) {
            searchBtn.addEventListener('click', (e) => {
                e.preventDefault();
                showSearchModal();
            });
        }

        // Centralized Click Handler
        document.addEventListener('click', async (e) => {
            const action = isActionButton(e.target);
            if (!action) return;
            if (action.btn.disabled) return;
            e.preventDefault();

            switch (action.text) {
                case 'view':
                    handleView();
                    break;
                case 'add':
                    handleAdd();
                    break;
                case 'edit':
                case 'update':
                    handleEdit();
                    break;
                case 'save':
                    handleSave();
                    break;
                case 'cancel':
                    handleCancel();
                    break;
                case 'delete':
                    handleDelete();
                    break;
            }
        });

        // Set initial state
        updateActionState();
        console.log('[FixedAssetSubType] Initialization complete');
    }

    // Start initialization
    init();

})();
