/**
 * GL Cheque/CPO Management
 * Form state management and grid operations
 */

document.addEventListener('DOMContentLoaded', function() {
    // Form Elements
    const debitAccountType = document.getElementById('debitAccountType');
    const debitBranchId = document.getElementById('debitBranchId');
    const debitAccountId = document.getElementById('debitAccountId');
    const requestRefNo = document.getElementById('requestRefNo');
    
    const creditAccountType = document.getElementById('creditAccountType');
    const creditBranchId = document.getElementById('creditBranchId');
    const creditAccountId = document.getElementById('creditAccountId');
    
    const bookType = document.getElementById('bookType');
    const noOfBooks = document.getElementById('noOfBooks');
    const seriesFrom = document.getElementById('seriesFrom');
    const seriesTo = document.getElementById('seriesTo');
    
    const currencyId = document.getElementById('currencyId');
    const status = document.getElementById('status');
    const createdBy = document.getElementById('createdBy');
    const supervisedBy = document.getElementById('supervisedBy');
    const createdOn = document.getElementById('createdOn');
    const supervisedOn = document.getElementById('supervisedOn');
    
    const tableBody = document.querySelector('#chequeTable tbody');
    
    // Action Buttons
    const dispatchBtn = document.querySelector('.action-btn-dispatch');
    const viewBtn = document.querySelector('.action-btn-view');
    const addBtn = document.querySelector('.action-btn-add');
    const editBtn = document.querySelector('.action-btn-edit');
    const deleteBtn = document.querySelector('.action-btn-delete');
    const saveBtn = document.querySelector('.action-btn-save');
    const cancelBtn = document.querySelector('.action-btn-cancel');
    
    // State Management
    let formMode = 'view'; // 'view', 'add', 'edit'
    let selectedRowIndex = -1;
    let gridData = [];
    
    // Event Listeners
    dispatchBtn.addEventListener('click', handleDispatch);
    viewBtn.addEventListener('click', handleView);
    addBtn.addEventListener('click', handleAdd);
    editBtn.addEventListener('click', handleEdit);
    deleteBtn.addEventListener('click', handleDelete);
    saveBtn.addEventListener('click', handleSave);
    cancelBtn.addEventListener('click', handleCancel);
    
    // Search button handlers
    document.querySelectorAll('.search-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            handleSearch(this);
        });
    });
    
    // Initialize form
    initializeForm();
    
    function initializeForm() {
        setFormMode('view');
        updateBehindTheScene();
    }
    
    function setFormMode(mode) {
        formMode = mode;
        const isEditing = mode === 'add' || mode === 'edit';
        
        // Enable/disable form fields based on mode
        debitAccountType.disabled = !isEditing;
        debitBranchId.readOnly = !isEditing;
        debitAccountId.readOnly = !isEditing;
        requestRefNo.readOnly = !isEditing;
        
        creditAccountType.disabled = !isEditing;
        creditBranchId.readOnly = !isEditing;
        creditAccountId.readOnly = !isEditing;
        
        bookType.disabled = !isEditing;
        noOfBooks.readOnly = !isEditing;
        seriesFrom.readOnly = !isEditing;
        seriesTo.readOnly = !isEditing;
        
        // Update button states
        saveBtn.disabled = !isEditing;
        addBtn.disabled = isEditing;
        editBtn.disabled = isEditing || selectedRowIndex === -1;
        deleteBtn.disabled = isEditing || selectedRowIndex === -1;
        dispatchBtn.disabled = isEditing;
        viewBtn.disabled = selectedRowIndex === -1;
    }
    
    function handleDispatch() {
        if (gridData.length === 0) {
            alert('No records to dispatch. Please add records first.');
            return;
        }
        
        if (confirm('Are you sure you want to dispatch the selected cheque/CPO records?')) {
            console.log('Dispatching records:', gridData);
            alert('Records dispatched successfully!');
            clearForm();
            gridData = [];
            updateGridDisplay();
        }
    }
    
    function handleView() {
        if (selectedRowIndex === -1) {
            alert('Please select a record to view.');
            return;
        }
        
        const record = gridData[selectedRowIndex];
        populateFormWithRecord(record);
        setFormMode('view');
    }
    
    function handleAdd() {
        clearForm();
        setFormMode('add');
        debitAccountType.focus();
    }
    
    function handleEdit() {
        if (selectedRowIndex === -1) {
            alert('Please select a record to edit.');
            return;
        }
        
        const record = gridData[selectedRowIndex];
        populateFormWithRecord(record);
        setFormMode('edit');
    }
    
    function handleDelete() {
        if (selectedRowIndex === -1) {
            alert('Please select a record to delete.');
            return;
        }
        
        if (confirm('Are you sure you want to delete this record?')) {
            gridData.splice(selectedRowIndex, 1);
            selectedRowIndex = -1;
            updateGridDisplay();
            clearForm();
            setFormMode('view');
            alert('Record deleted successfully!');
        }
    }
    
    function handleSave() {
        if (!validateForm()) {
            return;
        }
        
        const record = {
            toBranch: creditBranchId.value,
            accountId: creditAccountId.value,
            bookType: bookType.options[bookType.selectedIndex].text,
            noOfBooks: noOfBooks.value,
            seriesFrom: seriesFrom.value,
            seriesTo: seriesTo.value,
            createdBy: 'ADMIN',
            createdOn: new Date().toLocaleDateString(),
            approvedBy: '',
            approvedOn: ''
        };
        
        if (formMode === 'add') {
            gridData.push(record);
            alert('Record added successfully!');
        } else if (formMode === 'edit') {
            gridData[selectedRowIndex] = record;
            alert('Record updated successfully!');
        }
        
        updateGridDisplay();
        clearForm();
        setFormMode('view');
    }
    
    function handleCancel() {
        if (formMode !== 'view') {
            if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
                clearForm();
                selectedRowIndex = -1;
                setFormMode('view');
            }
        }
    }
    
    function validateForm() {
        if (!debitBranchId.value.trim()) {
            alert('Please enter Debit Branch ID.');
            debitBranchId.focus();
            return false;
        }
        
        if (!debitAccountId.value.trim()) {
            alert('Please enter Debit Account ID.');
            debitAccountId.focus();
            return false;
        }
        
        if (!creditBranchId.value.trim()) {
            alert('Please enter Credit Branch ID.');
            creditBranchId.focus();
            return false;
        }
        
        if (!creditAccountId.value.trim()) {
            alert('Please enter Credit Account ID.');
            creditAccountId.focus();
            return false;
        }
        
        if (!noOfBooks.value.trim() || isNaN(noOfBooks.value) || parseInt(noOfBooks.value) <= 0) {
            alert('Please enter a valid number of books.');
            noOfBooks.focus();
            return false;
        }
        
        if (!seriesFrom.value.trim()) {
            alert('Please enter Series From.');
            seriesFrom.focus();
            return false;
        }
        
        if (!seriesTo.value.trim()) {
            alert('Please enter Series To.');
            seriesTo.focus();
            return false;
        }
        
        return true;
    }
    
    function clearForm() {
        debitAccountType.value = 'general-ledger';
        debitBranchId.value = '0101';
        debitAccountId.value = '';
        requestRefNo.value = '';
        
        creditAccountType.value = 'customer';
        creditBranchId.value = '';
        creditAccountId.value = '';
        
        bookType.value = '25-leafs';
        noOfBooks.value = '';
        seriesFrom.value = '';
        seriesTo.value = '';
        
        updateBehindTheScene();
    }
    
    function populateFormWithRecord(record) {
        creditBranchId.value = record.toBranch;
        creditAccountId.value = record.accountId;
        noOfBooks.value = record.noOfBooks;
        seriesFrom.value = record.seriesFrom;
        seriesTo.value = record.seriesTo;
        
        // Find and select the book type
        for (let i = 0; i < bookType.options.length; i++) {
            if (bookType.options[i].text === record.bookType) {
                bookType.selectedIndex = i;
                break;
            }
        }
        
        updateBehindTheScene(record);
    }
    
    function updateBehindTheScene(record = null) {
        if (record) {
            createdBy.value = record.createdBy;
            createdOn.value = record.createdOn;
            supervisedBy.value = record.approvedBy;
            supervisedOn.value = record.approvedOn;
            status.value = record.approvedBy ? 'Approved' : 'Pending';
        } else {
            currencyId.value = '';
            status.value = formMode === 'view' ? '' : 'Draft';
            createdBy.value = formMode === 'view' ? '' : 'ADMIN';
            supervisedBy.value = '';
            createdOn.value = formMode === 'view' ? '' : new Date().toLocaleDateString();
            supervisedOn.value = '';
        }
    }
    
    function updateGridDisplay() {
        if (gridData.length === 0) {
            tableBody.innerHTML = '<tr class="no-data"><td colspan="10">No records to display.</td></tr>';
        } else {
            let html = '';
            gridData.forEach((record, index) => {
                html += `
                    <tr onclick="selectRow(${index})" ${index === selectedRowIndex ? 'style="background-color: #E3F2FD;"' : ''}>
                        <td>${record.toBranch}</td>
                        <td>${record.accountId}</td>
                        <td>${record.bookType}</td>
                        <td>${record.noOfBooks}</td>
                        <td>${record.seriesFrom}</td>
                        <td>${record.seriesTo}</td>
                        <td>${record.createdBy}</td>
                        <td>${record.createdOn}</td>
                        <td>${record.approvedBy}</td>
                        <td>${record.approvedOn}</td>
                    </tr>
                `;
            });
            tableBody.innerHTML = html;
        }
    }
    
    // Global function for row selection
    window.selectRow = function(index) {
        selectedRowIndex = index;
        updateGridDisplay();
        setFormMode('view');
        editBtn.disabled = false;
        deleteBtn.disabled = false;
        viewBtn.disabled = false;
    };
    
    function handleSearch(button) {
        // Placeholder for search functionality
        const inputField = button.previousElementSibling;
        if (inputField.classList && inputField.classList.contains('branch-label')) {
            inputField = button.previousElementSibling.previousElementSibling;
        }
        
        console.log('Search clicked for:', inputField.id);
        alert('Search functionality would open a lookup dialog here.');
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            if (!saveBtn.disabled) {
                handleSave();
            }
        } else if (e.key === 'Escape') {
            handleCancel();
        } else if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            if (!addBtn.disabled) {
                handleAdd();
            }
        }
    });
});
