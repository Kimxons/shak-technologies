// Product (FD,RD,SC) JavaScript
(function () {
    const CHILD_FORMS = {
        'product-gl-interface': 'product-gl-interface.html',
        'product-documents': 'product-documents.html',
        'user-defined-fields': 'user-defined-fields.html',
        'product-charges': 'product-charges.html',
        'product-notification': 'product-notification.html'
    };

    function getOverlayEls() {
        return {
            overlay: document.querySelector('[data-child-overlay]'),
            iframe: document.querySelector('[data-child-iframe]')
        };
    }

    function setOverlayOpen(isOpen) {
        const { overlay } = getOverlayEls();
        if (!overlay) return;
        overlay.classList.toggle('is-open', Boolean(isOpen));
        overlay.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    }

    function getProductID() {
        const productInput = document.getElementById('ProductID');
        return productInput ? productInput.value.trim() : '';
    }

    function getBranchID() {
        // Get from session or config if available
        return window.SESSION?.BranchID || '0101';
    }

    function getBankID() {
        // Get from session or config if available
        return window.SESSION?.BankID || '00';
    }

    function getOperatorID() {
        // Get from session or config if available
        return window.SESSION?.OperatorID || 'ADMIN';
    }

    function getModuleID() {
        // Product module ID - adjust as needed
        return 5;
    }

    function buildGLInterfaceRequestData() {
        const productID = getProductID();
        
        console.log('[Product FD/RD/SC] Product ID:', productID);
        
        if (!productID) {
            alert('Please enter or select a Product ID first');
            return null;
        }

        const now = new Date();
        const timestamp = now.toLocaleString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).replace(',', '');

        const requestData = {
            RequestID: 'dbo.p_GetGLInterface',
            FormId: 'dbo.p_GetGLInterface',
            RequestData: {
                OurBranchID: getBranchID(),
                BankID: getBankID(),
                RelevantID: productID,
                ModuleID: getModuleID(),
                OperatorID: getOperatorID()
            },
            RequestTime: timestamp,
            AppName: 'PROJECT_KAIRO',
            Checksum: ''
        };

        console.log('[Product FD/RD/SC] Built request data:', requestData);
        return requestData;
    }

    function openChildForm(childKey) {
        const path = CHILD_FORMS[childKey];
        const { iframe } = getOverlayEls();
        if (!path || !iframe) return;

        console.log('[Product FD/RD/SC] Opening child form:', childKey);

        // Only build request data for Product GL Interface
        if (childKey === 'product-gl-interface') {
            const requestData = buildGLInterfaceRequestData();
            if (!requestData) return;

            // Store request data for child form to access
            window.childFormRequestData = requestData;
            console.log('[Product FD/RD/SC] Stored request data in window.childFormRequestData');

            iframe.src = path;
            setOverlayOpen(true);

            // Send data to iframe once loaded
            iframe.onload = function() {
                console.log('[Product FD/RD/SC] Iframe loaded, sending data to child');
                try {
                    iframe.contentWindow.postMessage({
                        type: 'init',
                        data: requestData
                    }, '*');
                    console.log('[Product FD/RD/SC] postMessage sent successfully');
                } catch (error) {
                    console.error('[Product FD/RD/SC] Error sending data to child form:', error);
                }
            };
        } else {
            // Other forms open normally without request data
            console.log('[Product FD/RD/SC] Opening form without request data');
            iframe.src = path;
            setOverlayOpen(true);
        }
    }

    function closeChildForm() {
        const { iframe } = getOverlayEls();
        if (iframe) iframe.src = '';
        setOverlayOpen(false);
    }

    // Expose closeChildForm globally for iframe communication
    window.closeChildForm = closeChildForm;
    window.closeModalWindow = closeChildForm;

    function setSectionOpen(sectionEl, isOpen) {
        if (!sectionEl) return;
        sectionEl.classList.toggle('is-open', Boolean(isOpen));

        const toggle = sectionEl.querySelector('.nav-arrow');
        const items = sectionEl.querySelector('.nav-items');
        const icon = toggle ? toggle.querySelector('i') : null;

        if (toggle) toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        if (items) items.hidden = !isOpen;
        
        // Toggle chevron icon
        if (icon) {
            if (isOpen) {
                icon.classList.remove('bi-chevron-right');
                icon.classList.add('bi-chevron-down');
            } else {
                icon.classList.remove('bi-chevron-down');
                icon.classList.add('bi-chevron-right');
            }
        }
    }

    function wireNavSections() {
        const sections = Array.from(document.querySelectorAll('[data-nav-section]'));
        if (!sections.length) return;

        sections.forEach(section => {
            const header = section.querySelector('.nav-header');
            if (!header) return;

            // Make entire header clickable
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                const isOpen = section.classList.contains('is-open');
                setSectionOpen(section, !isOpen);
            });
        });

        // Open first section by default (DataEntry)
        if (sections[0]) {
            setSectionOpen(sections[0], true);
        }
    }

    function wireSidebar() {
        document.querySelectorAll('.sidebar-item[data-child-form]').forEach(item => {
            item.addEventListener('click', () => {
                const formKey = item.getAttribute('data-child-form');
                if (formKey) {
                    openChildForm(formKey);
                }
            });
        });
    }

    function wireOverlayClose() {
        const { overlay } = getOverlayEls();
        if (!overlay) return;

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeChildForm();
        });

        window.addEventListener('message', function (event) {
            if (event.data === 'close' || event.data?.type === 'close') {
                closeChildForm();
            }
        });
    }

    function wireActionButtons() {
        const buttons = {
            view: document.getElementById('viewBtn'),
            add: document.getElementById('addBtn'),
            edit: document.getElementById('editBtn'),
            delete: document.getElementById('deleteBtn'),
            save: document.getElementById('saveBtn'),
            cancel: document.getElementById('cancelBtn')
        };

        Object.values(buttons).forEach(btn => {
            if (btn) {
                btn.addEventListener('click', function () {
                    const action = this.id.replace('Btn', '').toLowerCase();
                    handleAction(action);
                });
            }
        });
    }

    function handleAction(action) {
        console.log('Action:', action);
        // Add action handlers here as needed
    }

    function wireCollapsibleSections() {
        document.querySelectorAll('.section-header input[type="checkbox"]').forEach(checkbox => {
            const section = checkbox.closest('div');
            const content = section.nextElementSibling;
            
            if (content && content.classList.contains('section-content')) {
                checkbox.addEventListener('change', () => {
                    content.style.display = checkbox.checked ? 'block' : 'none';
                });
                
                // Set initial state
                content.style.display = checkbox.checked ? 'block' : 'none';
            }
        });
    }

    function initialize() {
        wireNavSections();
        wireSidebar();
        wireOverlayClose();
        wireActionButtons();
        wireCollapsibleSections();
    }

    document.addEventListener('DOMContentLoaded', initialize);
})();
