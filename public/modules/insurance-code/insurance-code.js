// Insurance Code Form Service

document.addEventListener('DOMContentLoaded', function() {
    // Buttons
    const buttons = document.querySelectorAll('.cm-shell__action');
    const viewBtn = buttons[0];
    const addBtn = buttons[1];
    const editBtn = buttons[2];
    const deleteBtn = buttons[3];
    const saveBtn = buttons[4];
    const cancelBtn = buttons[5];

    // Form Fields
    const form = document.getElementById('insuranceForm');
    const fields = {
        insuranceId: document.getElementById('insuranceId'),
        company: document.getElementById('company'),
        address1: document.getElementById('address1'),
        address2: document.getElementById('address2'),
        city: document.getElementById('city'),
        country: document.getElementById('country'),
        zipCode: document.getElementById('zipCode'),
        emailId: document.getElementById('emailId'),
        phone1: document.getElementById('phone1'),
        phone2: document.getElementById('phone2'),
        mobile: document.getElementById('mobile'),
        faxNo: document.getElementById('faxNo'),
        contactPerson: document.getElementById('contactPerson')
    };

    // State
    let isEditMode = false;

    // Initialize
    function init() {
        // Initial state similar to screenshot (some data populated)
        // Set fields to readonly initially? Screenshot shows "Edit" is underlined/active or it's in View mode (Save is disabled usually in View mode but here Save is enabled in screenshot? Actually Edit is underlined in screenshot description/my HTML).
        // Wait, in my HTML I underlined "Edit".
        // If Edit is underlined, it might mean we are in View Mode and "Edit" is the action to take? Or Edit is selected?
        // Typically: View Mode -> Fields Readonly. Edit -> Fields Editable.

        // Let's assume default is View Mode.
        toggleEdit(false);
    }

    function toggleEdit(editable) {
        isEditMode = editable;
        Object.values(fields).forEach(field => {
            if (field) {
                field.readOnly = !editable;
                if (field.tagName === 'SELECT') {
                    field.disabled = !editable;
                }
            }
        });
    }

    // Event Listeners
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            toggleEdit(true);
            // Highlight Edit button?
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            toggleEdit(false);
            // Reset form or reload data
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            console.log('Saving data...');
            toggleEdit(false);
        });
    }

    if (viewBtn) {
        viewBtn.addEventListener('click', () => {
             console.log('View clicked');
             toggleEdit(false);
        });
    }

    if (addBtn) {
        addBtn.addEventListener('click', () => {
             console.log('Add clicked');
             // clear fields
             // toggleEdit(true);
        });
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
             console.log('Delete clicked');
        });
    }

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('Form submitted');
        });
    }

    init();
});
