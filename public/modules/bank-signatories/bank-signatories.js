(function() {
    'use strict';

    // Initialize
    document.addEventListener('DOMContentLoaded', function() {
        attachEventListeners();
        initializeForm();
    });

    // Attach Event Listeners
    function attachEventListeners() {
        // Action buttons
        document.getElementById('btnShow')?.addEventListener('click', handleShow);
        document.getElementById('btnView')?.addEventListener('click', handleView);
        document.getElementById('btnAdd')?.addEventListener('click', handleAdd);
        document.getElementById('btnEdit')?.addEventListener('click', handleEdit);
        document.getElementById('btnDelete')?.addEventListener('click', handleDelete);
        document.getElementById('btnSave')?.addEventListener('click', handleSave);
        document.getElementById('btnCancel')?.addEventListener('click', handleCancel);
        document.getElementById('btnBack')?.addEventListener('click', handleBack);

        // Search buttons
        document.querySelectorAll('.search-btn').forEach(btn => {
            btn.addEventListener('click', handleSearch);
        });

        // Browse button
        document.querySelector('.browse-btn')?.addEventListener('click', handleBrowse);
    }

    // Initialize Form
    function initializeForm() {
        setFormState('view');
        updateBehindTheScene();
    }

    // Set Form State
    function setFormState(state) {
        const formInputs = document.querySelectorAll('.field-input, .field-input-full');
        const saveBtn = document.getElementById('btnSave');
        const cancelBtn = document.getElementById('btnCancel');

        switch(state) {
            case 'view':
                formInputs.forEach(input => input.disabled = true);
                saveBtn.disabled = true;
                cancelBtn.disabled = true;
                break;
            case 'add':
            case 'edit':
                formInputs.forEach(input => input.disabled = false);
                saveBtn.disabled = false;
                cancelBtn.disabled = false;
                break;
        }
    }

    // Action Handlers
    function handleShow() {
        console.log('Show clicked');
        // Implement show logic
    }

    function handleView() {
        console.log('View clicked');
        setFormState('view');
    }

    function handleAdd() {
        console.log('Add clicked');
        clearForm();
        setFormState('add');
    }

    function handleEdit() {
        console.log('Edit clicked');
        setFormState('edit');
    }

    function handleDelete() {
        console.log('Delete clicked');
        if (confirm('Are you sure you want to delete this signatory?')) {
            clearForm();
            setFormState('view');
        }
    }

    function handleSave() {
        console.log('Save clicked');
        if (validateForm()) {
            // Implement save logic
            console.log('Form is valid, saving...');
            setFormState('view');
        }
    }

    function handleCancel() {
        console.log('Cancel clicked');
        if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
            clearForm();
            setFormState('view');
        }
    }

    function handleBack() {
        console.log('Back clicked');
        // Close the modal
        if (window.parent && window.parent.bootstrap) {
            const modalElement = window.parent.document.getElementById('bankSignatoriesModal');
            if (modalElement) {
                const modal = window.parent.bootstrap.Modal.getInstance(modalElement);
                if (modal) {
                    modal.hide();
                }
            }
        }
    }

    function handleSearch(event) {
        console.log('Search clicked');
        // Implement search logic
    }

    function handleBrowse() {
        console.log('Browse clicked');
        // Implement file browse logic
    }

    // Clear Form
    function clearForm() {
        document.querySelectorAll('.field-input, .field-input-full').forEach(input => {
            if (input.type === 'checkbox') {
                input.checked = false;
            } else {
                input.value = '';
            }
        });
    }

    // Validate Form
    function validateForm() {
        const signatoryId = document.getElementById('signatoryId').value;
        const signatoryName = document.getElementById('signatoryName').value;

        if (!signatoryId) {
            alert('Please enter Signatory ID');
            return false;
        }
        if (!signatoryName) {
            alert('Please enter Signatory Name');
            return false;
        }

        return true;
    }

    // Update Behind The Scene
    function updateBehindTheScene() {
        const currentDate = new Date().toLocaleString();
        const currentUser = 'System User'; // Replace with actual user

        // Update creation fields if this is a new record
        // Otherwise, only update modification fields
    }

})();
