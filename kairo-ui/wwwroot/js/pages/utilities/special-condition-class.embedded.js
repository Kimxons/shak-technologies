document.addEventListener('DOMContentLoaded', () => {
      const form = document.getElementById('special-condition-class-form');
      const btnView = document.getElementById('btnView');
      const btnAdd = document.getElementById('btnAdd');
      const btnEdit = document.getElementById('btnEdit');
      const btnDelete = document.getElementById('btnDelete');
      const btnSave = document.getElementById('btnSave');
      const btnCancel = document.getElementById('btnCancel');
      const searchBtn = document.querySelector('.btn-search');
      const searchModal = new bootstrap.Modal(document.getElementById('searchModal'));
      const searchResults = document.getElementById('searchResults');

      let isEditMode = false;
      let selectedRow = null;

      // Set form fields readonly state
      function setFormReadonly(readonly) {
        const inputs = form.querySelectorAll('input:not([readonly]), select');
        inputs.forEach(input => {
          if (input.type === 'checkbox') {
            input.disabled = readonly;
          } else {
            input.disabled = readonly;
          }
        });
        btnSave.disabled = readonly;
        isEditMode = !readonly;
      }

      // Initialize form as readonly
      setFormReadonly(true);

      // View button
      btnView.addEventListener('click', () => {
        searchModal.show();
      });

      // Add button
      btnAdd.addEventListener('click', () => {
        // Clear form for new entry
        document.getElementById('classId').value = '';
        document.getElementById('description').value = '';
        document.getElementById('classType').value = '';
        document.getElementById('productTypes').value = '';
        document.getElementById('systemClass').checked = false;
        document.getElementById('createdBy').value = '';
        document.getElementById('createdOn').value = '';
        document.getElementById('modifiedBy').value = '';
        document.getElementById('modifiedOn').value = '';
        document.getElementById('supervisedBy').value = '';
        document.getElementById('supervisedOn').value = '';
        setFormReadonly(false);
      });

      // Edit button
      btnEdit.addEventListener('click', () => {
        setFormReadonly(false);
      });

      // Delete button
      btnDelete.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete this Special Condition Class?')) {
          // In a real app, this would call an API
          alert('Record deleted successfully.');
          // Clear form
          document.getElementById('classId').value = '';
          document.getElementById('description').value = '';
        }
      });

      // Save button
      btnSave.addEventListener('click', () => {
        const classId = document.getElementById('classId').value;
        const description = document.getElementById('description').value;
        const classType = document.getElementById('classType').value;

        if (!classId || !description || !classType) {
          alert('Please fill in all required fields.');
          return;
        }

        // In a real app, this would call an API
        alert('Record saved successfully.');
        setFormReadonly(true);

        // Update modified fields
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '/');
        document.getElementById('modifiedOn').value = dateStr;
        document.getElementById('modifiedBy').value = 'CSADM';
      });

      // Cancel button
      btnCancel.addEventListener('click', () => {
        setFormReadonly(true);
        // Optionally reload original data
      });

      // Search button
      searchBtn.addEventListener('click', () => {
        searchModal.show();
      });

      // Search results row click
      searchResults.addEventListener('click', (e) => {
        const row = e.target.closest('tr');
        if (row) {
          // Remove selection from other rows
          searchResults.querySelectorAll('tr').forEach(r => r.classList.remove('table-primary'));
          // Select this row
          row.classList.add('table-primary');
          selectedRow = row;
        }
      });

      // Select button in modal
      document.getElementById('btnSelectClass').addEventListener('click', () => {
        if (selectedRow) {
          const cells = selectedRow.cells;
          document.getElementById('classId').value = cells[0].textContent;
          document.getElementById('description').value = cells[1].textContent;

          // Set class type
          const classTypeText = cells[2].textContent.toLowerCase();
          document.getElementById('classType').value = classTypeText;

          // Set product type
          const productTypeText = cells[3].textContent;
          const productSelect = document.getElementById('productTypes');
          for (let option of productSelect.options) {
            if (option.text === productTypeText) {
              productSelect.value = option.value;
              break;
            }
          }

          searchModal.hide();
          selectedRow = null;
        } else {
          alert('Please select a record first.');
        }
      });

      // Search input filtering
      document.getElementById('searchInput').addEventListener('input', (e) => {
        const filter = e.target.value.toLowerCase();
        const rows = searchResults.querySelectorAll('tr');
        rows.forEach(row => {
          const text = row.textContent.toLowerCase();
          row.style.display = text.includes(filter) ? '' : 'none';
        });
      });

      // Details Modal Interaction
      const detailsModal = new bootstrap.Modal(document.getElementById('detailsModal'));
      const btnDetailsEdit = document.getElementById('btnDetailsEdit');
      const btnDetailsSave = document.getElementById('btnDetailsSave');
      const btnDetailsCancel = document.getElementById('btnDetailsCancel');
      const detailsInputs = document.querySelectorAll('#detailsModal input');

      document.getElementById('nav-details').addEventListener('click', () => {
        detailsModal.show();
      });

      btnDetailsEdit.addEventListener('click', () => {
        detailsInputs.forEach(input => input.disabled = false);
        btnDetailsEdit.disabled = true;
        btnDetailsSave.disabled = false;
        btnDetailsCancel.disabled = false;
      });

      btnDetailsSave.addEventListener('click', () => {
         // Save logic here
         alert('Details saved successfully.');
         detailsInputs.forEach(input => input.disabled = true);
         btnDetailsEdit.disabled = false;
         btnDetailsSave.disabled = true;
         btnDetailsCancel.disabled = true;
      });

      btnDetailsCancel.addEventListener('click', () => {
         // Reset to initial state
         detailsInputs.forEach(input => input.disabled = true);
         // Restore original values (simulation)
         // ...
         btnDetailsEdit.disabled = false;
         btnDetailsSave.disabled = true;
         btnDetailsCancel.disabled = true;
      });
    });
