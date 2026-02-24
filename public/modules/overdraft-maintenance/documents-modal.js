// Documents Modal - Main JavaScript

// DOM Elements - Buttons
const viewBtn = document.getElementById('viewBtn');
const addBtn = document.getElementById('addBtn');
const editBtn = document.getElementById('editBtn');
const deleteBtn = document.getElementById('deleteBtn');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const backBtn = document.getElementById('backBtn');
const showImageBtn = document.getElementById('showImageBtn');
const searchDocumentBtn = document.getElementById('searchDocumentBtn');
const browseBtn = document.getElementById('browseBtn');
const closeImagePreview = document.getElementById('closeImagePreview');

// Form Elements
const documentId = document.getElementById('documentId');
const documentType = document.getElementById('documentType');
const documentClass = document.getElementById('documentClass');
const receivedBy = document.getElementById('receivedBy');
const receivedDate = document.getElementById('receivedDate');
const location = document.getElementById('location');
const documentImage = document.getElementById('documentImage');
const documentImageFile = document.getElementById('documentImageFile');
const remarks = document.getElementById('remarks');

// Audit Fields
const createdBy = document.getElementById('createdBy');
const modifiedBy = document.getElementById('modifiedBy');
const supervisedBy = document.getElementById('supervisedBy');
const createdOn = document.getElementById('createdOn');
const modifiedOn = document.getElementById('modifiedOn');
const supervisedOn = document.getElementById('supervisedOn');

// Modals
const imagePreviewModal = document.getElementById('imagePreviewModal');
const previewImage = document.getElementById('previewImage');

const statusMessage = document.getElementById('statusMessage');

// State
let isEditMode = false;
let currentDocument = null;
let selectedImageData = null;

// Event Listeners
viewBtn.addEventListener('click', viewDocument);
addBtn.addEventListener('click', addDocument);
editBtn.addEventListener('click', enableEdit);
deleteBtn.addEventListener('click', deleteDocument);
saveBtn.addEventListener('click', saveDocument);
cancelBtn.addEventListener('click', cancelOperation);
backBtn.addEventListener('click', closeModal);
showImageBtn.addEventListener('click', showImage);
searchDocumentBtn.addEventListener('click', searchDocument);
browseBtn.addEventListener('click', () => documentImageFile.click());
closeImagePreview.addEventListener('click', closeImagePreviewModal);

// File input change handler
documentImageFile.addEventListener('change', handleFileSelect);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    disableEdit();
});

function viewDocument() {
    if (!currentDocument) {
        showStatusMessage('No document to view', 'info');
        return;
    }

    loadDocumentData(currentDocument);
    disableEdit();
}

function addDocument() {
    isEditMode = true;
    currentDocument = null;
    
    // Clear form
    clearForm();
    
    // Enable form
    enableFormFields();
    
    // Update button states
    addBtn.disabled = true;
    editBtn.disabled = true;
    deleteBtn.disabled = true;
    viewBtn.disabled = true;
    saveBtn.disabled = false;
    
    hideStatusMessage();
    documentId.focus();
}

function enableEdit() {
    if (!currentDocument) {
        showStatusMessage('No document to edit. Click Add to create new document.', 'warning');
        return;
    }

    isEditMode = true;
    enableFormFields();
    
    addBtn.disabled = true;
    editBtn.disabled = true;
    deleteBtn.disabled = true;
    viewBtn.disabled = true;
    saveBtn.disabled = false;
}

function deleteDocument() {
    if (!currentDocument) {
        showStatusMessage('No document to delete', 'warning');
        return;
    }

    if (confirm('Are you sure you want to delete this document?')) {
        currentDocument = null;
        selectedImageData = null;
        clearForm();
        showStatusMessage('Document deleted successfully', 'success');
    }
}

function disableEdit() {
    isEditMode = false;
    
    // Disable all inputs
    documentId.disabled = true;
    documentType.disabled = true;
    documentClass.disabled = true;
    receivedBy.disabled = true;
    receivedDate.disabled = true;
    location.disabled = true;
    documentImage.disabled = true;
    remarks.disabled = true;
    browseBtn.disabled = true;
    
    addBtn.disabled = false;
    editBtn.disabled = false;
    deleteBtn.disabled = false;
    viewBtn.disabled = false;
    saveBtn.disabled = true;
}

function enableFormFields() {
    documentId.disabled = false;
    documentType.disabled = false;
    documentClass.disabled = false;
    receivedBy.disabled = false;
    receivedDate.disabled = false;
    location.disabled = false;
    documentImage.disabled = false;
    remarks.disabled = false;
    browseBtn.disabled = false;
}

function saveDocument() {
    // Validate
    if (!documentId.value.trim()) {
        showStatusMessage('Please enter Document ID', 'error');
        documentId.focus();
        return;
    }

    if (!documentType.value) {
        showStatusMessage('Please select Document Type', 'error');
        documentType.focus();
        return;
    }

    if (!documentClass.value) {
        showStatusMessage('Please select Document Class', 'error');
        documentClass.focus();
        return;
    }

    const documentData = {
        id: documentId.value,
        type: documentType.value,
        class: documentClass.value,
        receivedBy: receivedBy.value,
        receivedDate: receivedDate.value,
        location: location.value,
        imagePath: documentImage.value,
        imageData: selectedImageData,
        remarks: remarks.value
    };

    currentDocument = documentData;
    
    // Update audit fields (simulated)
    if (!createdBy.value) {
        createdBy.value = 'Admin';
        createdOn.value = new Date().toLocaleString();
    }
    modifiedBy.value = 'Admin';
    modifiedOn.value = new Date().toLocaleString();

    showStatusMessage('Document saved successfully', 'success');
    disableEdit();
}

function cancelOperation() {
    if (isEditMode) {
        if (confirm('Discard changes?')) {
            disableEdit();
            hideStatusMessage();
            if (currentDocument) {
                loadDocumentData(currentDocument);
            } else {
                clearForm();
            }
        }
    }
}

function closeModal() {
    // Notify parent window to close modal
    if (window.parent && window.parent.closeDocumentsModal) {
        window.parent.closeDocumentsModal();
    }
}

function showImage() {
    if (!selectedImageData && !documentImage.value) {
        showStatusMessage('No image to display', 'warning');
        return;
    }

    if (selectedImageData) {
        previewImage.src = selectedImageData;
        imagePreviewModal.classList.add('active');
    } else {
        showStatusMessage('Image preview - connect to backend to load image', 'info');
    }
}

function closeImagePreviewModal() {
    imagePreviewModal.classList.remove('active');
    previewImage.src = '';
}

function searchDocument() {
    if (!documentId.value.trim()) {
        showStatusMessage('Please enter Document ID', 'warning');
        return;
    }
    
    showStatusMessage('Document search feature - connect to backend', 'info');
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showStatusMessage('File size must be less than 5MB', 'error');
            documentImageFile.value = '';
            return;
        }

        // Check file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            showStatusMessage('Only image files (JPEG, PNG, GIF) and PDF are allowed', 'error');
            documentImageFile.value = '';
            return;
        }

        documentImage.value = file.name;

        // Read file as data URL for preview
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                selectedImageData = e.target.result;
                showStatusMessage('Image loaded successfully. Click ShowImage to preview.', 'success');
            };
            reader.readAsDataURL(file);
        } else {
            selectedImageData = null;
            showStatusMessage('PDF file selected. Preview not available.', 'info');
        }
    }
}

function loadDocumentData(doc) {
    documentId.value = doc.id;
    documentType.value = doc.type;
    documentClass.value = doc.class;
    receivedBy.value = doc.receivedBy;
    receivedDate.value = doc.receivedDate;
    location.value = doc.location;
    documentImage.value = doc.imagePath;
    remarks.value = doc.remarks;
    selectedImageData = doc.imageData;
}

function clearForm() {
    documentId.value = '';
    documentType.value = '';
    documentClass.value = '';
    receivedBy.value = '';
    receivedDate.value = '';
    location.value = '';
    documentImage.value = '';
    remarks.value = '';
    documentImageFile.value = '';
    selectedImageData = null;
    
    createdBy.value = '';
    modifiedBy.value = '';
    supervisedBy.value = '';
    createdOn.value = '';
    modifiedOn.value = '';
    supervisedOn.value = '';
    
    currentDocument = null;
    hideStatusMessage();
}

function showStatusMessage(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
}

function hideStatusMessage() {
    statusMessage.className = 'status-message hidden';
}

// Close image preview when clicking outside
imagePreviewModal.addEventListener('click', (e) => {
    if (e.target === imagePreviewModal) {
        closeImagePreviewModal();
    }
});
