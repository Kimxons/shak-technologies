/**
 * Account Classification Example Page
 * Demonstrates how to use the Account Classification Service
 */
(async function() {
  const { ServiceLoader } = window;
  
  // ========================================
  // 1. Load Dependencies
  // ========================================
  await ServiceLoader.loadCore();
  await ServiceLoader.loadAccountClassificationService();
  await ServiceLoader.loadLookupService(); // For dropdowns (if needed)
  await ServiceLoader.loadSearchService();  // For search functionality
  
  // ========================================
  // 2. Get Service References
  // ========================================
  const AccountClassificationService = window.AccountClassificationService;
  const LookupService = window.LookupService;
  const SearchService = window.SearchService;
  
  console.log('Account Classification Service loaded:', !!AccountClassificationService);
  
  // ========================================
  // 3. Page State
  // ========================================
  const state = {
    currentClassification: null,
    classifications: [],
    isEditMode: false
  };
  
  // ========================================
  // 4. Initialize Page
  // ========================================
  function initPage() {
    console.log('Initializing Account Classification page...');
    
    // Bind event listeners
    bindEventListeners();
    
    // Load initial data
    loadClassifications();
    
    console.log('Account Classification page initialized');
  }
  
  // ========================================
  // 5. Event Listeners
  // ========================================
  function bindEventListeners() {
    // Search button
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
      searchBtn.addEventListener('click', handleSearch);
    }
    
    // Add button
    const addBtn = document.getElementById('addBtn');
    if (addBtn) {
      addBtn.addEventListener('click', handleAdd);
    }
    
    // Edit button
    const editBtn = document.getElementById('editBtn');
    if (editBtn) {
      editBtn.addEventListener('click', handleEdit);
    }
    
    // Delete button
    const deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', handleDelete);
    }
    
    // Save button
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', handleSave);
    }
  }
  
  // ========================================
  // 6. Load Classifications
  // ========================================
  async function loadClassifications() {
    try {
      console.log('Loading classifications...');
      
      const result = await AccountClassificationService.getAccountClassification({
        BankID: '001',
        OurBranchID: '0101',
        ClassificationID: '', // Empty for all
        OperatorID: 'SYSTEM',
        Direction: 'N'
      });
      
      if (result.success) {
        state.classifications = result.data.Details || result.data || [];
        console.log('Classifications loaded:', state.classifications.length);
        renderClassificationsGrid(state.classifications);
      } else {
        console.error('Failed to load classifications:', result.message);
        alert('Failed to load classifications: ' + result.message);
      }
    } catch (error) {
      console.error('Error loading classifications:', error);
      alert('Error loading classifications: ' + error.message);
    }
  }
  
  // ========================================
  // 7. Search Handler
  // ========================================
  async function handleSearch() {
    try {
      const searchTerm = document.getElementById('searchInput')?.value || '';
      
      if (!searchTerm) {
        alert('Please enter a search term');
        return;
      }
      
      console.log('Searching for:', searchTerm);
      
      const result = await AccountClassificationService.searchAccountClassifications({
        BankID: '001',
        OurBranchID: '0101',
        SearchTerm: searchTerm,
        OperatorID: 'SYSTEM'
      });
      
      if (result.success) {
        const results = result.data.Details || result.data || [];
        console.log('Search results:', results.length);
        renderClassificationsGrid(results);
      } else {
        console.error('Search failed:', result.message);
        alert('Search failed: ' + result.message);
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('Search error: ' + error.message);
    }
  }
  
  // ========================================
  // 8. Add Handler
  // ========================================
  function handleAdd() {
    console.log('Add new classification');
    
    // Clear form
    clearForm();
    
    // Set mode
    state.isEditMode = false;
    state.currentClassification = null;
    
    // Enable form fields
    enableFormFields(true);
    
    alert('Add mode - Enter new classification details and click Save');
  }
  
  // ========================================
  // 9. Edit Handler
  // ========================================
  function handleEdit() {
    if (!state.currentClassification) {
      alert('Please select a classification to edit');
      return;
    }
    
    console.log('Edit classification:', state.currentClassification);
    
    // Populate form
    populateForm(state.currentClassification);
    
    // Set mode
    state.isEditMode = true;
    
    // Enable form fields
    enableFormFields(true);
    
    alert('Edit mode - Modify fields and click Save');
  }
  
  // ========================================
  // 10. Delete Handler
  // ========================================
  async function handleDelete() {
    if (!state.currentClassification) {
      alert('Please select a classification to delete');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this classification?')) {
      return;
    }
    
    try {
      console.log('Deleting classification:', state.currentClassification);
      
      const result = await AccountClassificationService.deleteAccountClassification({
        BankID: '001',
        OurBranchID: '0101',
        ClassificationID: state.currentClassification.ClassificationID,
        OperatorID: 'SYSTEM'
      });
      
      if (result.success) {
        alert('Classification deleted successfully!');
        clearForm();
        state.currentClassification = null;
        loadClassifications(); // Reload grid
      } else {
        alert('Delete failed: ' + result.message);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Delete error: ' + error.message);
    }
  }
  
  // ========================================
  // 11. Save Handler
  // ========================================
  async function handleSave() {
    try {
      // Get form data
      const formData = getFormData();
      
      // Validate
      if (!validateForm(formData)) {
        return;
      }
      
      console.log('Saving classification:', formData);
      
      let result;
      
      if (state.isEditMode) {
        // Update existing
        result = await AccountClassificationService.editAccountClassification({
          ...formData,
          BankID: '001',
          OurBranchID: '0101',
          ModifiedBy: 'SYSTEM',
          ModifiedOn: new Date().toLocaleDateString('en-US'),
          SupervisedBy: 'SYSTEM',
          NewRecord: 0
        });
      } else {
        // Create new
        result = await AccountClassificationService.saveAccountClassification({
          ...formData,
          BankID: '001',
          OurBranchID: '0101',
          CreatedBy: 'SYSTEM',
          CreatedOn: new Date().toLocaleDateString('en-US'),
          OperatorID: 'SYSTEM',
          NewRecord: 1
        });
      }
      
      if (result.success) {
        alert('Classification saved successfully!');
        clearForm();
        state.currentClassification = null;
        state.isEditMode = false;
        enableFormFields(false);
        loadClassifications(); // Reload grid
      } else {
        alert('Save failed: ' + result.message);
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Save error: ' + error.message);
    }
  }
  
  // ========================================
  // 12. Helper Functions
  // ========================================
  
  function renderClassificationsGrid(classifications) {
    const gridBody = document.getElementById('classificationsGridBody');
    if (!gridBody) return;
    
    if (classifications.length === 0) {
      gridBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #999;">No classifications found</td></tr>';
      return;
    }
    
    gridBody.innerHTML = classifications.map((item, index) => `
      <tr onclick="window.selectClassification(${index})" style="cursor: pointer;">
        <td>${item.ClassificationID || ''}</td>
        <td>${item.ClassificationName || ''}</td>
        <td>${item.Description || ''}</td>
        <td>${item.CreatedBy || ''}</td>
      </tr>
    `).join('');
  }
  
  window.selectClassification = function(index) {
    state.currentClassification = state.classifications[index];
    console.log('Selected classification:', state.currentClassification);
    
    // Highlight row
    const rows = document.querySelectorAll('#classificationsGridBody tr');
    rows.forEach((row, i) => {
      row.classList.toggle('selected', i === index);
    });
  };
  
  function clearForm() {
    const fields = ['classificationId', 'classificationName', 'description'];
    fields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) field.value = '';
    });
  }
  
  function populateForm(classification) {
    const mapping = {
      classificationId: 'ClassificationID',
      classificationName: 'ClassificationName',
      description: 'Description'
    };
    
    Object.keys(mapping).forEach(fieldId => {
      const field = document.getElementById(fieldId);
      const value = classification[mapping[fieldId]];
      if (field) field.value = value || '';
    });
  }
  
  function getFormData() {
    return {
      ClassificationID: document.getElementById('classificationId')?.value || '',
      ClassificationName: document.getElementById('classificationName')?.value || '',
      Description: document.getElementById('description')?.value || ''
    };
  }
  
  function validateForm(data) {
    if (!data.ClassificationID) {
      alert('Classification ID is required');
      return false;
    }
    
    if (!data.ClassificationName) {
      alert('Classification Name is required');
      return false;
    }
    
    return true;
  }
  
  function enableFormFields(enabled) {
    const fields = ['classificationId', 'classificationName', 'description'];
    fields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) field.disabled = !enabled;
    });
  }
  
  // ========================================
  // 13. Initialize on Load
  // ========================================
  initPage();
  
})();
