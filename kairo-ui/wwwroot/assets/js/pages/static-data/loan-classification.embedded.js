/**
 * Loan Classification Module - Account Maintenance Style
 * Handles CRUD operations for Loan Classifications
 */
(function () {
    'use strict';

    // ========================================================================
    // STATE MANAGEMENT
    // ========================================================================
    let currentMode = 'view'; // view | add | edit
    let currentClassification = null;
    let classifications = [];
    let currentIndex = -1;

    // ========================================================================
    // DOM REFERENCES - initialized in init()
    // ========================================================================
    let elements = {};

    // ========================================================================
    // INITIALIZATION
    // ========================================================================
    function init() {
        // Initialize DOM references after DOM is ready
        elements = {
            // Form fields
            classId: document.getElementById('classId'),
            className: document.getElementById('className'),

            // Audit fields
            createdBy: document.getElementById('createdBy'),
            createdOn: document.getElementById('createdOn'),
            modifiedBy: document.getElementById('modifiedBy'),
            modifiedOn: document.getElementById('modifiedOn'),
            supervisedBy: document.getElementById('supervisedBy'),
            supervisedOn: document.getElementById('supervisedOn'),

            // Action buttons
            btnView: document.querySelector('[data-action="view"]'),
            btnAdd: document.querySelector('[data-action="add"]'),
            btnEdit: document.querySelector('[data-action="edit"]'),
            btnSave: document.querySelector('[data-action="save"]'),
            btnCancel: document.querySelector('[data-action="cancel"]'),
            btnDelete: document.querySelector('[data-action="delete"]'),
            btnPrev: document.getElementById('btnPrev'),
            btnNext: document.getElementById('btnNext'),
            recordInfo: document.getElementById('recordInfo'),

            // Window controls
            btnRefresh: document.getElementById('btnRefresh'),

            // Lookup modal
            lookupModal: document.getElementById('classIdLookupModal'),
            lookupSearch: document.getElementById('lookupSearch'),
            lookupTableBody: document.getElementById('lookupTableBody'),
            btnCloseLookup: document.getElementById('btnCloseLookup'),
            btnCancelLookup: document.getElementById('btnCancelLookup'),
            btnSelectLookup: document.getElementById('btnSelectLookup'),
            btnLookup: document.getElementById('btnClassIdLookup'),

            // New lookup filter elements
            classIdOperator: document.getElementById('classIdOperator'),
            searchClassId: document.getElementById('searchClassId'),
            classNameOperator: document.getElementById('classNameOperator'),
            searchClassName: document.getElementById('searchClassName'),
            btnSearchLookup: document.getElementById('btnSearchLookup'),
            btnLookupPrev: document.getElementById('btnLookupPrev'),
            btnLookupNext: document.getElementById('btnLookupNext')
        };
        
        console.log('[LoanClassification] Elements initialized:', {
            btnLookup: elements.btnLookup,
            lookupModal: elements.lookupModal
        });

        setupEventListeners();
        setupSectionToggles();
        
        // Auto-collapse sidebar and nav sections on form load (like loan-application)
        collapseSidebarOnLoad();
        collapseAllNavSections();
        
        loadClassifications();
        setMode('view');
    }

    // ========================================================================
    // AUTO-COLLAPSE ON FORM LOAD
    // ========================================================================
    
    /**
     * Collapse sidebar on form load
     */
    function collapseSidebarOnLoad() {
        const sidebar = document.getElementById('main-sidebar');
        const sidebarToggle = document.getElementById('sidebarToggle');
        
        if (sidebar) {
            sidebar.classList.add('collapsed');
            
            if (sidebarToggle) {
                sidebarToggle.setAttribute('aria-expanded', 'false');
                const icon = sidebarToggle.querySelector('i');
                if (icon) {
                    icon.classList.remove('bi-x-lg');
                    icon.classList.add('bi-list');
                }
            }
            
            console.log('[LoanClassification] Sidebar auto-collapsed on load');
        }
    }

    /**
     * Collapse all nav sections on form load
     */
    function collapseAllNavSections() {
        const navSections = document.querySelectorAll('.nav-section--card');
        
        navSections.forEach(section => {
            section.classList.remove('expanded');
            
            const navItems = section.querySelector('.nav-items--card');
            if (navItems) {
                navItems.classList.remove('is-visible');
            }
            
            const arrow = section.querySelector('.nav-arrow--card');
            if (arrow) {
                arrow.setAttribute('aria-expanded', 'false');
                const icon = arrow.querySelector('i');
                if (icon) {
                    icon.classList.remove('bi-chevron-up');
                    icon.classList.add('bi-chevron-down');
                }
            }
        });
        
        console.log('[LoanClassification] Nav sections auto-collapsed on load');
    }

    // ========================================================================
    // AUDIT FIELD VALIDATION
    // ========================================================================
    
    /**
     * Validate that audit fields are populated before opening sub-modal
     * @returns {boolean} True if validation passes
     */
    function validateAuditFields() {
        const createdBy = elements.createdBy ? elements.createdBy.textContent.trim() : '';
        const createdOn = elements.createdOn ? elements.createdOn.textContent.trim() : '';
        
        // Check if at least Created By and Created On are populated (not empty or just '-')
        const hasCreatedBy = createdBy && createdBy !== '-' && createdBy !== '';
        const hasCreatedOn = createdOn && createdOn !== '-' && createdOn !== '';
        
        console.log('[LoanClassification] Validating audit fields:', {
            createdBy: createdBy,
            createdOn: createdOn,
            hasCreatedBy: hasCreatedBy,
            hasCreatedOn: hasCreatedOn
        });
        
        return hasCreatedBy && hasCreatedOn;
    }

    /**
     * Show toast notification
     * @param {string} message - Message to display
     * @param {string} type - Toast type: success, warning, error, info
     */
    function showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            alert(message);
            return;
        }
        
        const bgClass = {
            'success': 'bg-success',
            'warning': 'bg-warning',
            'error': 'bg-danger',
            'info': 'bg-info'
        }[type] || 'bg-info';
        
        const toastHTML = `
            <div class="toast align-items-center text-white ${bgClass} border-0" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body">${message}</div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        `;
        
        toastContainer.insertAdjacentHTML('beforeend', toastHTML);
        const toastEl = toastContainer.lastElementChild;
        const toast = new bootstrap.Toast(toastEl, { delay: 5000 });
        toast.show();
        
        toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
    }

    // ========================================================================
    // EVENT LISTENERS
    // ========================================================================
    function setupEventListeners() {
        // Action buttons
        if (elements.btnView) elements.btnView.addEventListener('click', handleView);
        if (elements.btnAdd) elements.btnAdd.addEventListener('click', handleAdd);
        if (elements.btnEdit) elements.btnEdit.addEventListener('click', handleEdit);
        if (elements.btnSave) {
            elements.btnSave.addEventListener('click', function() {
                console.log('[LoanClassification] Save button clicked, mode:', currentMode);
                handleSave();
            });
        }
        if (elements.btnCancel) {
            elements.btnCancel.addEventListener('click', function() {
                console.log('[LoanClassification] Cancel button clicked, mode:', currentMode);
                handleCancel();
            });
        }
        if (elements.btnDelete) elements.btnDelete.addEventListener('click', handleDelete);

        // Navigation
        if (elements.btnPrev) elements.btnPrev.addEventListener('click', navigatePrev);
        if (elements.btnNext) elements.btnNext.addEventListener('click', navigateNext);

        // Window controls
        if (elements.btnRefresh) elements.btnRefresh.addEventListener('click', handleRefresh);

        // Lookup modal
        if (elements.btnLookup) {
            elements.btnLookup.addEventListener('click', handleClassIdSearch);
        }
        if (elements.btnCloseLookup) {
            elements.btnCloseLookup.addEventListener('click', closeLookupModal);
        }
        if (elements.btnCancelLookup) {
            elements.btnCancelLookup.addEventListener('click', closeLookupModal);
        }
        if (elements.btnSelectLookup) {
            elements.btnSelectLookup.addEventListener('click', selectFromLookup);
        }
        if (elements.lookupSearch) {
            elements.lookupSearch.addEventListener('input', filterLookupTable);
        }

        // New lookup filter events
        if (elements.btnSearchLookup) {
            elements.btnSearchLookup.addEventListener('click', searchClassifications);
        }
        if (elements.btnLookupPrev) {
            elements.btnLookupPrev.addEventListener('click', lookupNavigatePrev);
        }
        if (elements.btnLookupNext) {
            elements.btnLookupNext.addEventListener('click', lookupNavigateNext);
        }

        // Enter key on search inputs
        if (elements.searchClassId) {
            elements.searchClassId.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') searchClassifications();
            });
        }
        if (elements.searchClassName) {
            elements.searchClassName.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') searchClassifications();
            });
        }

        // Close modal on backdrop click
        if (elements.lookupModal) {
            elements.lookupModal.addEventListener('click', function (e) {
                if (e.target === elements.lookupModal) {
                    closeLookupModal();
                }
            });
        }

        // Sidebar toggle (collapse/expand)
        const sidebarToggle = document.getElementById('sidebarToggle');
        const sidebar = document.getElementById('main-sidebar');
        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                
                sidebar.classList.toggle('collapsed');
                const isCollapsed = sidebar.classList.contains('collapsed');
                
                // Update aria-expanded
                sidebarToggle.setAttribute('aria-expanded', !isCollapsed);
                
                // Update toggle icon
                const icon = sidebarToggle.querySelector('i');
                if (icon) {
                    icon.classList.remove('bi-list', 'bi-x-lg');
                    icon.classList.add(isCollapsed ? 'bi-list' : 'bi-x-lg');
                }
                
                console.log('[LoanClassification] Sidebar toggled:', isCollapsed ? 'collapsed' : 'expanded');
            });
        }

        // Sidebar navigation - validate audit fields before opening sub-modal
        const sidebarItems = document.querySelectorAll('.sidebar-item--enhanced');
        sidebarItems.forEach(item => {
            item.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Check if this item opens the detail modal
                const targetModalId = this.getAttribute('data-modal-target');
                
                if (targetModalId === 'detailModal') {
                    // Validate that audit fields are populated
                    if (!validateAuditFields()) {
                        showToast('Please ensure a classification record is loaded with audit data (Created By, Modified By, etc.) before accessing Loan Class Detail.', 'warning');
                        return; // Stop here - don't open modal
                    }
                    
                    // Validation passed - open modal programmatically
                    const modal = document.getElementById(targetModalId);
                    if (modal) {
                        // Pass ClassID to the iframe
                        const iframe = modal.querySelector('iframe');
                        if (iframe) {
                            const classId = elements.classId ? elements.classId.value : '';
                            // Update iframe src with ClassID parameter or use postMessage
                            iframe.contentWindow.postMessage({
                                type: 'setClassId',
                                classId: classId
                            }, '*');
                            console.log('[LoanClassification] Sent ClassID to detail modal:', classId);
                        }
                        
                        const bsModal = new bootstrap.Modal(modal);
                        bsModal.show();
                        console.log('[LoanClassification] Detail modal opened after validation');
                    }
                }
                
                sidebarItems.forEach(i => i.classList.remove('active'));
                this.classList.add('active');
                console.log('[LoanClassification] Sidebar item clicked:', this.dataset.section || targetModalId);
            });
        });

        // Nav section toggle (Data Entry expand/collapse)
        const navHeaders = document.querySelectorAll('.nav-header--card');
        navHeaders.forEach(header => {
            header.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                
                const section = this.closest('.nav-section--card');
                if (section) {
                    section.classList.toggle('expanded');
                    const isExpanded = section.classList.contains('expanded');
                    
                    // Toggle nav items visibility
                    const items = section.querySelector('.nav-items--card');
                    if (items) {
                        items.classList.toggle('is-visible', isExpanded);
                    }
                    
                    // Update arrow icon
                    const arrow = header.querySelector('.nav-arrow--card');
                    if (arrow) {
                        arrow.setAttribute('aria-expanded', isExpanded);
                        const icon = arrow.querySelector('i');
                        if (icon) {
                            icon.classList.remove('bi-chevron-down', 'bi-chevron-up');
                            icon.classList.add(isExpanded ? 'bi-chevron-up' : 'bi-chevron-down');
                        }
                    }
                    
                    console.log('[LoanClassification] Nav section toggled:', isExpanded ? 'expanded' : 'collapsed');
                }
            });
        });
        
        // Handle message events from sub-modal iframes
        window.addEventListener('message', function(event) {
            if (!event.data || typeof event.data !== 'object') return;
            
            const { type, modalId, maximize } = event.data;
            
            switch (type) {
                case 'submoduleClosed':
                    const modalToClose = document.getElementById(modalId);
                    if (modalToClose) {
                        const bsModal = bootstrap.Modal.getInstance(modalToClose);
                        if (bsModal) {
                            bsModal.hide();
                        }
                    }
                    break;
                    
                case 'toggleSidebarForMaximize':
                    if (sidebar) {
                        if (maximize) {
                            sidebar.classList.add('collapsed');
                        }
                    }
                    break;
                    
                case 'submoduleOpened':
                    console.log('[LoanClassification] Sub-module opened:', modalId);
                    break;
            }
        });
    }

    // ========================================================================
    // SECTION TOGGLES (Form sections like Classification Details, Behind the Scene)
    // ========================================================================
    function setupSectionToggles() {
        const sectionHeaders = document.querySelectorAll('[data-section-toggle]');
        sectionHeaders.forEach(header => {
            header.addEventListener('click', function (e) {
                e.preventDefault();
                
                const section = this.closest('.form-section');
                if (section) {
                    section.classList.toggle('collapsed');
                    const isCollapsed = section.classList.contains('collapsed');
                    
                    // Update toggle button icon
                    const toggleBtn = this.querySelector('.section-toggle-btn');
                    const icon = this.querySelector('.section-toggle-btn i');
                    
                    if (toggleBtn) {
                        toggleBtn.setAttribute('aria-expanded', !isCollapsed);
                    }
                    
                    if (icon) {
                        icon.classList.remove('bi-chevron-up', 'bi-chevron-down');
                        icon.classList.add(isCollapsed ? 'bi-chevron-down' : 'bi-chevron-up');
                    }
                    
                    console.log('[LoanClassification] Form section toggled:', section.dataset.section, isCollapsed ? 'collapsed' : 'expanded');
                }
            });
        });
    }

    // ========================================================================
    // DATA LOADING
    // ========================================================================
    async function loadClassifications() {
        try {
            // Try to load from API first
            if (typeof LookupService !== 'undefined' && LookupService.getLoanClassifications) {
                const response = await LookupService.getLoanClassifications();
                if (response && response.data) {
                    classifications = response.data;
                    if (classifications.length > 0) {
                        currentIndex = 0;
                        displayClassification(classifications[currentIndex]);
                    }
                    updateRecordInfo();
                    return;
                }
            }
        } catch (error) {
            console.warn('API call failed, using fallback data:', error);
        }

        // Fallback sample data
        classifications = getSampleData();
        if (classifications.length > 0) {
            currentIndex = 0;
            displayClassification(classifications[currentIndex]);
        }
        updateRecordInfo();
    }

    function getSampleData() {
        // No mock data - return empty array
        // Classifications will be loaded from API
        return [];
    }

    // ========================================================================
    // DISPLAY FUNCTIONS
    // ========================================================================
    function displayClassification(classification) {
        if (!classification) {
            clearForm();
            return;
        }

        currentClassification = classification;

        // Form fields
        if (elements.classId) elements.classId.value = classification.classId || '';
        if (elements.className) elements.className.value = classification.className || '';

        // Audit fields
        if (elements.createdBy) elements.createdBy.textContent = classification.createdBy || '-';
        if (elements.createdOn) elements.createdOn.textContent = formatDateTime(classification.createdOn) || '-';
        if (elements.modifiedBy) elements.modifiedBy.textContent = classification.modifiedBy || '-';
        if (elements.modifiedOn) elements.modifiedOn.textContent = formatDateTime(classification.modifiedOn) || '-';
        if (elements.supervisedBy) elements.supervisedBy.textContent = classification.supervisedBy || '-';
        if (elements.supervisedOn) elements.supervisedOn.textContent = formatDateTime(classification.supervisedOn) || '-';

        updateRecordInfo();
    }

    function clearForm() {
        // Form fields
        if (elements.classId) elements.classId.value = '';
        if (elements.className) elements.className.value = '';

        // Audit fields
        if (elements.createdBy) elements.createdBy.textContent = '-';
        if (elements.createdOn) elements.createdOn.textContent = '-';
        if (elements.modifiedBy) elements.modifiedBy.textContent = '-';
        if (elements.modifiedOn) elements.modifiedOn.textContent = '-';
        if (elements.supervisedBy) elements.supervisedBy.textContent = '-';
        if (elements.supervisedOn) elements.supervisedOn.textContent = '-';

        currentClassification = null;
    }

    function updateRecordInfo() {
        if (elements.recordInfo) {
            if (classifications.length === 0) {
                elements.recordInfo.textContent = '0 / 0';
            } else {
                elements.recordInfo.textContent = `${currentIndex + 1} / ${classifications.length}`;
            }
        }
    }

    function formatDateTime(dateStr) {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateStr;
        }
    }

    // ========================================================================
    // MODE MANAGEMENT
    // ========================================================================
    function setMode(mode) {
        currentMode = mode;
        const isEditing = mode === 'add' || mode === 'edit';
        
        console.log('[LoanClassification] Setting mode to:', mode, 'isEditing:', isEditing);

        // Toggle field editability
        const editableFields = [elements.className];
        editableFields.forEach(field => {
            if (field) field.disabled = !isEditing;
        });

        // Class ID is only editable in Add mode
        if (elements.classId) {
            elements.classId.disabled = mode !== 'add';
        }

        // Update button visibility using CSS class
        // View mode buttons: View, Add, Edit, Delete
        // Edit mode buttons: Save, Cancel
        if (elements.btnView) {
            elements.btnView.classList.toggle('btn-hidden', isEditing);
        }
        if (elements.btnAdd) {
            elements.btnAdd.classList.toggle('btn-hidden', isEditing);
        }
        if (elements.btnEdit) {
            elements.btnEdit.classList.toggle('btn-hidden', isEditing);
        }
        if (elements.btnDelete) {
            elements.btnDelete.classList.toggle('btn-hidden', isEditing);
        }
        if (elements.btnSave) {
            elements.btnSave.classList.toggle('btn-hidden', !isEditing);
        }
        if (elements.btnCancel) {
            elements.btnCancel.classList.toggle('btn-hidden', !isEditing);
        }

        // Lookup button - always enabled
        if (elements.btnLookup) {
            elements.btnLookup.disabled = false;
        }

        // Navigation disabled during edit
        if (elements.btnPrev) elements.btnPrev.disabled = isEditing;
        if (elements.btnNext) elements.btnNext.disabled = isEditing;
        
        console.log('[LoanClassification] Mode set complete. Save button hidden:', elements.btnSave?.classList.contains('btn-hidden'));
    }

    // ========================================================================
    // ACTION HANDLERS
    // ========================================================================
    async function handleView() {
        const classId = elements.classId?.value?.trim();
        
        if (!classId) {
            showToast('Please enter a Class ID to view', 'warning');
            if (elements.classId) elements.classId.focus();
            return;
        }
        
        // Call P_GetLoanClasses to load the details
        await loadClassificationDetails(classId);
    }

    function handleAdd() {
        clearForm();
        setMode('add');
        if (elements.classId) elements.classId.focus();
        showToast('Adding new classification', 'info');
    }

    function handleEdit() {
        if (!currentClassification) {
            showToast('No classification selected to edit', 'warning');
            return;
        }
        setMode('edit');
        if (elements.className) elements.className.focus();
        showToast('Editing classification', 'info');
    }

    async function handleSave() {
        // Validate
        const classId = elements.classId?.value?.trim();
        const className = elements.className?.value?.trim();

        if (!classId) {
            showToast('Class ID is required', 'error');
            if (elements.classId) elements.classId.focus();
            return;
        }

        if (!className) {
            showToast('Class Name is required', 'error');
            if (elements.className) elements.className.focus();
            return;
        }

        try {
            // Check if CoreApi is available
            if (typeof CoreApi === 'undefined' || !CoreApi.post || !CoreApi.makeRequestEnvelope) {
                showToast('CoreApi service not available', 'error');
                return;
            }

            const Environment = window.Environment || {};
            const baseUrl = (Environment.baseUrl || Environment.baseUrlCommon || Environment.baseUrlSystemCodes || 'http://172.16.2.31:3306').replace(/\/+$/, '');
            const endpoint = `${baseUrl}/api/OldAPI`;

            const now = new Date();
            const formattedDate = formatDateForAPI(now);
            const operatorId = getOperatorId();

            // Prepare request data for p_AddEditLoanClasses
            // NewRecord: 1 = Add, 0 = Edit
            const isNewRecord = currentMode === 'add' ? 1 : 0;

            const requestData = {
                BankID: getBankId(),
                ClassID: classId,
                ClassName: className,
                CreatedBy: isNewRecord ? operatorId : (currentClassification?.createdBy || operatorId),
                CreatedOn: isNewRecord ? formattedDate : (currentClassification?.createdOn || formattedDate),
                ModifiedBy: operatorId,
                ModifiedOn: formattedDate,
                SupervisedBy: '',
                NewRecord: isNewRecord
            };

            console.log('[LoanClassification] Saving with p_AddEditLoanClasses:', requestData);

            const envelope = CoreApi.makeRequestEnvelope('dbo.p_AddEditLoanClasses', requestData);
            console.log('[LoanClassification] Save envelope:', envelope);
            
            const response = await CoreApi.post(endpoint, envelope);
            console.log('[LoanClassification] Save response:', response);

            if (response && response.success && response.code === '00') {
                if (currentMode === 'add') {
                    showToast('Classification added successfully', 'success');
                } else {
                    showToast('Classification updated successfully', 'success');
                }

                // Reload the classification details to show updated data
                await loadClassificationDetails(classId);
                setMode('view');
            } else {
                const errorMsg = response?.message || 'Failed to save classification';
                showToast(errorMsg, 'error');
                console.error('[LoanClassification] Save failed:', response);
            }
        } catch (error) {
            console.error('[LoanClassification] Error saving classification:', error);
            showToast('Error saving classification: ' + error.message, 'error');
        }
    }

    // Helper function to format date for API
    function formatDateForAPI(date) {
        if (!date) return '';
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    }

    function handleCancel() {
        if (currentMode === 'add') {
            if (classifications.length > 0) {
                displayClassification(classifications[currentIndex]);
            } else {
                clearForm();
            }
        } else if (currentMode === 'edit') {
            displayClassification(currentClassification);
        }
        setMode('view');
        showToast('Changes cancelled', 'info');
    }

    async function handleDelete() {
        const classId = elements.classId?.value?.trim();
        
        if (!classId) {
            showToast('No classification selected to delete', 'warning');
            return;
        }

        if (!confirm(`Are you sure you want to delete classification "${classId}"?`)) {
            return;
        }

        try {
            // Check if CoreApi is available
            if (typeof CoreApi === 'undefined' || !CoreApi.post || !CoreApi.makeRequestEnvelope) {
                showToast('CoreApi service not available', 'error');
                return;
            }

            const Environment = window.Environment || {};
            const baseUrl = (Environment.baseUrl || Environment.baseUrlCommon || Environment.baseUrlSystemCodes || 'http://172.16.2.31:3306').replace(/\/+$/, '');
            const endpoint = `${baseUrl}/api/OldAPI`;

            // Prepare request data for p_DeleteLoanClasses
            const requestData = {
                BankID: getBankId(),
                ClassID: classId,
                NewRecord: 0 // 0 for delete
            };

            console.log('[LoanClassification] Deleting with p_DeleteLoanClasses:', requestData);

            const envelope = CoreApi.makeRequestEnvelope('dbo.p_DeleteLoanClasses', requestData);
            console.log('[LoanClassification] Delete envelope:', envelope);
            
            const response = await CoreApi.post(endpoint, envelope);
            console.log('[LoanClassification] Delete response:', response);

            if (response && response.success && response.code === '00') {
                showToast('Classification deleted successfully', 'success');
                
                // Clear the form after successful delete
                clearForm();
                currentClassification = null;
                
                // Reload classifications list
                loadClassifications();
            } else {
                const errorMsg = response?.message || 'Failed to delete classification';
                showToast(errorMsg, 'error');
                console.error('[LoanClassification] Delete failed:', response);
            }
        } catch (error) {
            console.error('[LoanClassification] Error deleting classification:', error);
            showToast('Error deleting classification: ' + error.message, 'error');
        }
    }

    // ========================================================================
    // NAVIGATION
    // ========================================================================
    function navigatePrev() {
        if (currentIndex > 0) {
            currentIndex--;
            displayClassification(classifications[currentIndex]);
        } else {
            showToast('Already at first record', 'warning');
        }
    }

    function navigateNext() {
        if (currentIndex < classifications.length - 1) {
            currentIndex++;
            displayClassification(classifications[currentIndex]);
        } else {
            showToast('Already at last record', 'warning');
        }
    }

    // ========================================================================
    // REFRESH FUNCTION
    // ========================================================================
    function handleRefresh() {
        showToast('Refreshing data...', 'info');
        loadClassifications();
    }

    // ========================================================================
    // LOOKUP MODAL
    // ========================================================================
    let lookupResults = [];
    let lookupCurrentPage = 0;
    const lookupPageSize = 50;

    async function handleClassIdSearch() {
        console.log('[LoanClassification] Search button clicked, opening modal...');
        // Always open the lookup modal when clicking the search icon
        openLookupModal();
    }

    function openLookupModal() {
        console.log('[LoanClassification] openLookupModal called, modal element:', elements.lookupModal);
        if (!elements.lookupModal) {
            console.error('[LoanClassification] Lookup modal element not found!');
            return;
        }

        // Clear filter inputs
        if (elements.searchClassId) elements.searchClassId.value = '';
        if (elements.searchClassName) elements.searchClassName.value = '';
        if (elements.classIdOperator) elements.classIdOperator.value = 'Like';
        if (elements.classNameOperator) elements.classNameOperator.value = 'Like';

        lookupResults = [];
        lookupCurrentPage = 0;
        clearLookupTable();

        elements.lookupModal.classList.add('active');
        console.log('[LoanClassification] Modal classes after adding active:', elements.lookupModal.classList.toString());

        if (elements.searchClassId) {
            elements.searchClassId.focus();
        }
        
        // Auto-search to populate the modal with results
        setTimeout(() => {
            searchClassifications();
        }, 100);
    }

    function clearLookupTable() {
        if (!elements.lookupTableBody) return;
        elements.lookupTableBody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; padding: 20px; color: #64748b;">
                    Enter search criteria and click Search
                </td>
            </tr>`;
    }

    async function searchClassifications() {
        const classIdOp = elements.classIdOperator?.value || 'Like';
        const classIdVal = elements.searchClassId?.value?.trim() || '';
        const classNameOp = elements.classNameOperator?.value || 'Like';
        const classNameVal = elements.searchClassName?.value?.trim() || '';

        // Build WHERE statement based on operators and values
        let whereConditions = [];

        if (classIdVal) {
            whereConditions.push(buildWhereCondition('LoanClassID', classIdOp, classIdVal));
        }
        if (classNameVal) {
            whereConditions.push(buildWhereCondition('ClassName', classNameOp, classNameVal));
        }

        const whereStmt = whereConditions.join(' AND ');

        // Prepare API parameters matching the stored procedure
        const params = {
            WhereStmt: whereStmt,
            TableID: 'LoanClassID',
            RefID: null,
            PrevOrNext: 0,
            AdvFilterString: "BankID='00'",
            OperatorID: 'JOHN_KIMANI', // Should come from session
            ModuleID: 2085,
            OurBranchID: '0101',
            SearchKey: null,
            LanguageID: 'en'
        };

        try {
            showToast('Searching...', 'info');

            // Call the API
            const response = await callSearchAPI(params);

            if (response && response.data && Array.isArray(response.data)) {
                lookupResults = response.data;
                lookupCurrentPage = 0;
                populateLookupTableWithResults(lookupResults);
                showToast(`Found ${lookupResults.length} result(s)`, 'success');
            } else {
                lookupResults = [];
                clearLookupTable();
                showToast('No results found', 'warning');
            }
        } catch (error) {
            console.error('Search error:', error);
            showToast('Search failed: ' + error.message, 'error');
        }
    }

    function buildWhereCondition(field, operator, value) {
        switch (operator) {
            case 'Equals':
                return `${field} = '${escapeSql(value)}'`;
            case 'StartsWith':
                return `${field} LIKE '${escapeSql(value)}%'`;
            case 'EndsWith':
                return `${field} LIKE '%${escapeSql(value)}'`;
            case 'Like':
            default:
                return `${field} LIKE '%${escapeSql(value)}%'`;
        }
    }

    function escapeSql(value) {
        return value.replace(/'/g, "''");
    }

    /**
     * Get BankID from environment
     */
    function getBankId() {
        if (window.Environment) {
            return window.Environment.defaultBankId || window.Environment.BankID || '00';
        }
        return '00';
    }

    /**
     * Get BranchID from session or environment
     */
    function getBranchId() {
        if (sessionStorage.getItem('branchId')) {
            return sessionStorage.getItem('branchId');
        }
        if (window.Environment) {
            return window.Environment.OurBranchID || window.Environment.BranchID || '0101';
        }
        return '0101';
    }

    /**
     * Get OperatorID from session
     */
    function getOperatorId() {
        try {
            const session = window.AuthService?.getSession?.();
            return session?.operatorId || session?.operatorID || session?.name || 'web_portal';
        } catch {
            return 'web_portal';
        }
    }

    /**
     * Load full classification details using P_GetLoanClasses
     * @param {string} classId - The loan class ID to load
     */
    async function loadClassificationDetails(classId) {
        if (!classId) {
            showToast('Class ID is required', 'warning');
            return;
        }

        try {
            showToast('Loading classification details...', 'info');

            // Check if LookupService or CoreApi is available
            if (typeof CoreApi === 'undefined' || !CoreApi.post || !CoreApi.makeRequestEnvelope) {
                showToast('CoreApi service not available', 'error');
                return;
            }

            const Environment = window.Environment || {};
            const baseUrl = (Environment.baseUrl || Environment.baseUrlCommon || Environment.baseUrlSystemCodes || 'http://172.16.2.31:3306').replace(/\/+$/, '');
            const endpoint = `${baseUrl}/api/OldAPI`;

            console.log('[LoanClassification] Loading details from:', endpoint);

            // Prepare request data for P_GetLoanClasses
            const requestData = {
                BankID: getBankId(),
                OurBranchID: getBranchId(),
                ClassID: classId,
                OperatorID: getOperatorId(),
                Direction: 0 // 0 = exact match
            };

            const envelope = CoreApi.makeRequestEnvelope('dbo.P_GetLoanClasses', requestData);
            console.log('[LoanClassification] P_GetLoanClasses envelope:', envelope);
            const response = await CoreApi.post(endpoint, envelope);

            console.log('[LoanClassification] P_GetLoanClasses response:', response);

            if (response && response.success) {
                // Extract data - check Details01 FIRST (P_GetLoanClasses returns data in Details01)
                // Then fall back to other structures
                let data = [];
                if (response.Details01 && Array.isArray(response.Details01)) {
                    // Details01 at root level - this is where P_GetLoanClasses puts the data
                    data = response.Details01;
                } else if (response.Details && Array.isArray(response.Details) && response.Details.length > 0 && response.Details[0].ClassID) {
                    // Details at root level with actual classification data
                    data = response.Details;
                } else if (response.data && response.data.Details01 && Array.isArray(response.data.Details01)) {
                    data = response.data.Details01;
                } else if (response.data && response.data.Details && Array.isArray(response.data.Details)) {
                    data = response.data.Details;
                } else if (Array.isArray(response.data)) {
                    data = response.data;
                }
                
                console.log('[LoanClassification] Extracted classification data:', data);
                
                if (data.length > 0) {
                    const classification = data[0];
                    console.log('[LoanClassification] Classification record:', classification);
                    console.log('[LoanClassification] Form elements:', {
                        classId: elements.classId,
                        className: elements.className
                    });

                    // Populate form with full details
                    const classIdValue = classification.ClassID || classification.LoanClassID || classId;
                    const classNameValue = classification.ClassName || classification.className || '';
                    
                    console.log('[LoanClassification] Setting values - ClassID:', classIdValue, 'ClassName:', classNameValue);
                    
                    if (elements.classId) {
                        elements.classId.value = classIdValue;
                        console.log('[LoanClassification] Set classId to:', elements.classId.value);
                    }
                    if (elements.className) {
                        elements.className.value = classNameValue;
                        console.log('[LoanClassification] Set className to:', elements.className.value);
                    }

                    // Audit fields
                    if (elements.createdBy) elements.createdBy.textContent = classification.CreatedBy || classification.MakerID || '-';
                    if (elements.createdOn) elements.createdOn.textContent = formatDateTime(classification.CreatedOn || classification.MakerTime) || '-';
                    if (elements.modifiedBy) elements.modifiedBy.textContent = classification.ModifiedBy || classification.ModifierID || '-';
                    if (elements.modifiedOn) elements.modifiedOn.textContent = formatDateTime(classification.ModifiedOn || classification.ModifierTime) || '-';
                    if (elements.supervisedBy) elements.supervisedBy.textContent = classification.SupervisedBy || classification.CheckerID || '-';
                    if (elements.supervisedOn) elements.supervisedOn.textContent = formatDateTime(classification.SupervisedOn || classification.CheckerTime) || '-';

                    // Update current classification
                    currentClassification = {
                        classId: classification.ClassID || classification.LoanClassID || classId,
                        className: classification.ClassName || '',
                        createdBy: classification.CreatedBy || classification.MakerID || '',
                        createdOn: classification.CreatedOn || classification.MakerTime || '',
                        modifiedBy: classification.ModifiedBy || classification.ModifierID || '',
                        modifiedOn: classification.ModifiedOn || classification.ModifierTime || '',
                        supervisedBy: classification.SupervisedBy || classification.CheckerID || '',
                        supervisedOn: classification.SupervisedOn || classification.CheckerTime || ''
                    };

                    showToast('Classification loaded successfully', 'success');
                } else {
                    showToast('Classification not found', 'warning');
                }
            } else {
                console.warn('[LoanClassification] P_GetLoanClasses returned:', response);
                showToast('Failed to load classification details', 'error');
            }
        } catch (error) {
            console.error('[LoanClassification] Error loading classification details:', error);
            showToast('Error loading classification: ' + error.message, 'error');
        }
    }

    async function callSearchAPI(params) {
        // Get the proper base URL from environment
        const Environment = window.Environment || {};
        const baseUrl = (Environment.baseUrl || Environment.baseUrlCommon || Environment.baseUrlSystemCodes || 'http://172.16.2.31:3306').replace(/\/+$/, '');
        const endpoint = `${baseUrl}/api/OldAPI`;

        console.log('[LoanClassification] Using endpoint:', endpoint);
        console.log('[LoanClassification] Search params:', params);

        // Try using LookupService if available (preferred method)
        if (typeof LookupService !== 'undefined' && LookupService.getSearchResult) {
            try {
                const response = await LookupService.getSearchResult(params);
                console.log('[LoanClassification] LookupService response:', response);
                if (response && response.success) {
                    // Extract the data - could be in response.data.Details or response.Details or response.data
                    let dataArray = [];
                    if (response.data && response.data.Details && Array.isArray(response.data.Details)) {
                        dataArray = response.data.Details;
                    } else if (response.Details && Array.isArray(response.Details)) {
                        dataArray = response.Details;
                    } else if (Array.isArray(response.data)) {
                        dataArray = response.data;
                    }
                    console.log('[LoanClassification] Extracted data array:', dataArray);
                    return { data: dataArray };
                } else {
                    console.warn('[LoanClassification] LookupService search returned:', response);
                    return { data: [] };
                }
            } catch (error) {
                console.error('[LoanClassification] LookupService.getSearchResult error:', error);
                // Don't return yet, try CoreApi fallback
            }
        }

        // Try using CoreApi directly if LookupService failed or is not available
        if (typeof CoreApi !== 'undefined' && CoreApi.post && CoreApi.makeRequestEnvelope) {
            try {
                const envelope = CoreApi.makeRequestEnvelope('p_GetSearchResult', params);
                console.log('[LoanClassification] CoreApi envelope:', envelope);
                const response = await CoreApi.post(endpoint, envelope);
                console.log('[LoanClassification] CoreApi response:', response);
                if (response && response.success) {
                    return { data: response.data || response.Details || [] };
                } else {
                    console.warn('[LoanClassification] CoreApi search returned:', response);
                    return { data: [] };
                }
            } catch (error) {
                console.error('[LoanClassification] CoreApi error:', error);
                return { data: [] };
            }
        }

        // Fallback: return empty data to avoid errors
        console.warn('[LoanClassification] No API service available for search. LookupService and CoreApi not found.');
        return { data: [] };
    }

    function populateLookupTableWithResults(data) {
        if (!elements.lookupTableBody) return;

        elements.lookupTableBody.innerHTML = '';

        if (!data || data.length === 0) {
            elements.lookupTableBody.innerHTML = `
                <tr>
                    <td colspan="3" style="text-align: center; padding: 20px; color: #64748b;">
                        No classifications found
                    </td>
                </tr>`;
            updateLookupNavButtons();
            return;
        }

        data.forEach((item, index) => {
            const row = document.createElement('tr');
            row.dataset.index = index;
            row.innerHTML = `
                <td style="width: 40px; text-align: center;">${index + 1}</td>
                <td>${escapeHtml(item.ClassID || item.LoanClassID || item.classId || '')}</td>
                <td>${escapeHtml(item.ClassName || item.className || '')}</td>
            `;
            row.addEventListener('click', function () {
                elements.lookupTableBody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
                this.classList.add('selected');
            });
            row.addEventListener('dblclick', async function () {
                const classId = item.ClassID || item.LoanClassID || item.classId || '';
                const className = item.ClassName || item.className || '';
                console.log('[LoanClassification] Double-click on row, classId:', classId, 'className:', className, 'item:', item);
                
                // Populate form directly with lookup data
                if (elements.classId) elements.classId.value = classId;
                if (elements.className) elements.className.value = className;
                
                // Update current classification state
                currentClassification = {
                    classId: classId,
                    className: className,
                    createdBy: item.CreatedBy || item.MakerID || '-',
                    createdOn: item.CreatedOn || item.MakerTime || '',
                    modifiedBy: item.ModifiedBy || item.ModifierID || '-',
                    modifiedOn: item.ModifiedOn || item.ModifierTime || '',
                    supervisedBy: item.SupervisedBy || item.CheckerID || '-',
                    supervisedOn: item.SupervisedOn || item.CheckerTime || ''
                };
                
                // Update audit fields if available
                if (elements.createdBy) elements.createdBy.textContent = currentClassification.createdBy;
                if (elements.createdOn) elements.createdOn.textContent = formatDateTime(currentClassification.createdOn) || '-';
                if (elements.modifiedBy) elements.modifiedBy.textContent = currentClassification.modifiedBy;
                if (elements.modifiedOn) elements.modifiedOn.textContent = formatDateTime(currentClassification.modifiedOn) || '-';
                if (elements.supervisedBy) elements.supervisedBy.textContent = currentClassification.supervisedBy;
                if (elements.supervisedOn) elements.supervisedOn.textContent = formatDateTime(currentClassification.supervisedOn) || '-';
                
                closeLookupModal();
                showToast('Classification loaded', 'success');
            });
            elements.lookupTableBody.appendChild(row);
        });

        updateLookupNavButtons();
    }

    function selectLookupResult(index) {
        if (index >= 0 && index < lookupResults.length) {
            const item = lookupResults[index];

            // Set form values - handle both ClassID and LoanClassID field names
            const classId = item.ClassID || item.LoanClassID || item.classId || '';
            const className = item.ClassName || item.className || '';

            if (elements.classId) elements.classId.value = classId;
            if (elements.className) elements.className.value = className;

            // Update the main classifications array if this is a new selection
            const existingIndex = classifications.findIndex(c =>
                (c.classId || c.ClassID || c.LoanClassID) === classId
            );

            if (existingIndex >= 0) {
                currentIndex = existingIndex;
                displayClassification(classifications[currentIndex]);
            } else {
                // Add to local cache
                currentClassification = {
                    classId: classId,
                    className: className,
                    createdBy: item.CreatedBy || '-',
                    createdOn: item.CreatedOn || null,
                    modifiedBy: item.ModifiedBy || '-',
                    modifiedOn: item.ModifiedOn || null,
                    supervisedBy: item.SupervisedBy || '-',
                    supervisedOn: item.SupervisedOn || null
                };
            }
        }
    }

    function updateLookupNavButtons() {
        // Enable/disable navigation based on results
        if (elements.btnLookupPrev) {
            elements.btnLookupPrev.disabled = lookupResults.length === 0;
        }
        if (elements.btnLookupNext) {
            elements.btnLookupNext.disabled = lookupResults.length === 0;
        }
    }

    function lookupNavigatePrev() {
        // Navigate to previous record in lookup results
        const selectedRow = elements.lookupTableBody?.querySelector('tr.selected');
        if (selectedRow) {
            const index = parseInt(selectedRow.dataset.index, 10);
            if (index > 0) {
                const prevRow = elements.lookupTableBody.querySelector(`tr[data-index="${index - 1}"]`);
                if (prevRow) {
                    elements.lookupTableBody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
                    prevRow.classList.add('selected');
                    prevRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
        } else if (lookupResults.length > 0) {
            const firstRow = elements.lookupTableBody.querySelector('tr[data-index="0"]');
            if (firstRow) firstRow.classList.add('selected');
        }
    }

    function lookupNavigateNext() {
        // Navigate to next record in lookup results
        const selectedRow = elements.lookupTableBody?.querySelector('tr.selected');
        if (selectedRow) {
            const index = parseInt(selectedRow.dataset.index, 10);
            if (index < lookupResults.length - 1) {
                const nextRow = elements.lookupTableBody.querySelector(`tr[data-index="${index + 1}"]`);
                if (nextRow) {
                    elements.lookupTableBody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
                    nextRow.classList.add('selected');
                    nextRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
        } else if (lookupResults.length > 0) {
            const firstRow = elements.lookupTableBody.querySelector('tr[data-index="0"]');
            if (firstRow) firstRow.classList.add('selected');
        }
    }

    function closeLookupModal() {
        if (elements.lookupModal) {
            elements.lookupModal.classList.remove('active');
        }
    }

    function populateLookupTable(data) {
        if (!elements.lookupTableBody) return;

        elements.lookupTableBody.innerHTML = '';

        if (!data || data.length === 0) {
            elements.lookupTableBody.innerHTML = `
                <tr>
                    <td colspan="2" style="text-align: center; padding: 20px; color: #64748b;">
                        No classifications found
                    </td>
                </tr>`;
            return;
        }

        data.forEach((item, index) => {
            const row = document.createElement('tr');
            row.dataset.index = index;
            row.innerHTML = `
                <td>${escapeHtml(item.classId)}</td>
                <td>${escapeHtml(item.className)}</td>
            `;
            row.addEventListener('click', function () {
                // Remove selection from other rows
                elements.lookupTableBody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
                this.classList.add('selected');
            });
            row.addEventListener('dblclick', function () {
                selectClassification(index);
                closeLookupModal();
            });
            elements.lookupTableBody.appendChild(row);
        });
    }

    function filterLookupTable() {
        const searchTerm = (elements.lookupSearch?.value || '').toLowerCase();

        const filtered = classifications.filter(item =>
            item.classId.toLowerCase().includes(searchTerm) ||
            item.className.toLowerCase().includes(searchTerm)
        );

        populateLookupTable(filtered);
    }

    function selectFromLookup() {
        const selectedRow = elements.lookupTableBody?.querySelector('tr.selected');
        if (!selectedRow) {
            showToast('Please select a classification', 'warning');
            return;
        }

        const index = parseInt(selectedRow.dataset.index, 10);

        // Use lookupResults if available, otherwise fall back to classifications
        if (lookupResults && lookupResults.length > 0) {
            selectLookupResult(index);
        } else {
            selectClassification(index);
        }
        closeLookupModal();
    }

    function selectClassification(index) {
        if (index >= 0 && index < classifications.length) {
            currentIndex = index;
            displayClassification(classifications[currentIndex]);
        }
    }

    // ========================================================================
    // UTILITY FUNCTIONS
    // ========================================================================
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showToast(message, type = 'info') {
        console.log('[LoanClassification] Toast:', type, message);
        
        // Remove existing toasts
        const existingContainers = document.querySelectorAll('.lc-toast-container');
        existingContainers.forEach(c => c.remove());

        // Create container with unique class to avoid conflicts
        const container = document.createElement('div');
        container.className = 'lc-toast-container';
        container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 999999; pointer-events: none;';

        // Create toast
        const toast = document.createElement('div');
        toast.className = `lc-toast lc-toast-${type}`;
        
        // Use Bootstrap Icons instead of Font Awesome
        let icon = 'bi-info-circle-fill';
        let bgColor = '#f0f9ff';
        let borderColor = '#4a7c95';
        if (type === 'success') {
            icon = 'bi-check-circle-fill';
            bgColor = '#f0fdf4';
            borderColor = '#22c55e';
        } else if (type === 'error') {
            icon = 'bi-x-circle-fill';
            bgColor = '#fef2f2';
            borderColor = '#ef4444';
        } else if (type === 'warning') {
            icon = 'bi-exclamation-triangle-fill';
            bgColor = '#fffbeb';
            borderColor = '#f59e0b';
        }

        toast.style.cssText = `
            background: ${bgColor};
            border-left: 4px solid ${borderColor};
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            padding: 12px 16px;
            min-width: 280px;
            max-width: 400px;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: lc-toast-slide-in 0.3s ease-out;
            pointer-events: auto;
        `;
        
        toast.innerHTML = `
            <i class="bi ${icon}" style="color: ${borderColor}; font-size: 18px;"></i>
            <span style="font-size: 13px; color: #1e293b; font-weight: 500;">${escapeHtml(message)}</span>
        `;

        container.appendChild(toast);
        document.body.appendChild(container);
        
        // Add animation style if not already present
        if (!document.getElementById('lc-toast-style')) {
            const style = document.createElement('style');
            style.id = 'lc-toast-style';
            style.textContent = `
                @keyframes lc-toast-slide-in {
                    from { transform: translateX(100px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        // Auto-remove after delay
        setTimeout(() => {
            container.remove();
        }, 4000);
    }

    function getToastColor(type) {
        switch (type) {
            case 'success': return '#5a9a7a';
            case 'error': return '#a86b65';
            case 'warning': return '#b8965a';
            default: return '#4a7c95';
        }
    }

    // ========================================================================
    // START
    // ========================================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
