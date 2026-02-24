document.addEventListener('DOMContentLoaded', function() {
      const navigateToParent = function() {
        try {
          // Try to close via iframe parent communication
          if (window.parent && window.parent !== window) {
            // Send close message to parent
            window.parent.postMessage('close', '*');
            
            // Also try direct methods
            if (window.parent.closeChildForm) {
              window.parent.closeChildForm();
            } else if (window.parent.closeModalWindow) {
              window.parent.closeModalWindow();
            }
          }
        } catch (err) {
          console.error('Error navigating to parent:', err);
        }
      };

      // Get action buttons using data-action attributes
      const buttons = {
        edit: document.querySelector('[data-action="edit"]'),
        save: document.querySelector('[data-action="save"]'),
        cancel: document.querySelector('[data-action="cancel"]'),
        back: document.getElementById('backBtn')
      };

      console.log('[Product Charges] Buttons found:', {
        edit: !!buttons.edit,
        save: !!buttons.save,
        cancel: !!buttons.cancel,
        back: !!buttons.back
      });

      // Handle Back button
      if (buttons.back) {
        buttons.back.addEventListener('click', navigateToParent);
      }

      // Load product charges on page load
      loadProductCharges();

      async function loadProductCharges() {
        try {
          // Get ProductID from parent window's form field
          let productID = '';
          try {
            const parentProductInput = window.parent.document.getElementById('ProductID');
            productID = parentProductInput ? parentProductInput.value.trim() : '';
          } catch (e) {
            console.warn('Could not access parent ProductID field:', e);
          }
          
          if (!productID) {
            console.warn('Product ID not found. Skipping data load.');
            return;
          }

          // Get session values
          const branchID = sessionStorage.getItem('OurBranchID') || sessionStorage.getItem('BranchID') || localStorage.getItem('BranchID') || '0101';
          const operatorID = sessionStorage.getItem('OperatorID') || localStorage.getItem('OperatorID') || 'CSADM';
          
          // Format current date/time
          const formatLegacyDateTime = (date = new Date()) => {
            const pad2 = (n) => String(n).padStart(2, '0');
            const mm = pad2(date.getMonth() + 1);
            const dd = pad2(date.getDate());
            const yyyy = date.getFullYear();
            const hh = pad2(date.getHours());
            const mi = pad2(date.getMinutes());
            const ss = pad2(date.getSeconds());
            return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
          };

          const currentDateTime = formatLegacyDateTime();

          const requestPayload = {
            RequestID: 'dbo.p_GetProductCharge',
            FormId: 'dbo.p_GetProductCharge',
            RequestData: {
              OurBranchID: branchID,
              OperatorID: operatorID,
              ProductID: productID
            },
            RequestTime: currentDateTime,
            AppName: 'PROJECT_KAIRO',
            Checksum: ''
          };

          console.log('[Product Charges] Loading data:', requestPayload);

          // Get API URL
          const Environment = window.Environment || {};
          const BASE_URL = (Environment.baseUrlProduct || Environment.baseUrlCommon || 'http://172.16.2.31:3306').replace(/\/+$/, '');
          const apiUrl = `${BASE_URL}/api/OldAPI`;

          // Make API call
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestPayload)
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();
          console.log('[Product Charges] Load response:', result);

          // Populate table with data
          if (result.data && Array.isArray(result.data)) {
            populateTable(result.data);
          } else if (result.Data && Array.isArray(result.Data)) {
            populateTable(result.Data);
          } else {
            console.warn('No data returned from API');
          }

        } catch (error) {
          console.error('[Product Charges] Load error:', error);
        }
      }

      function populateTable(data) {
        const tbody = document.querySelector('#chargesTable tbody');
        if (!tbody) return;

        // Clear existing rows
        tbody.innerHTML = '';

        // Add new rows
        data.forEach(charge => {
          // Check both IsSelected and IsEditable (can be 1, "1", or true)
          const isSelected = charge.IsSelected === 1 || charge.IsSelected === "1" || charge.IsSelected === true;
          const isEditable = charge.IsEditable === 1 || charge.IsEditable === "1" || charge.IsEditable === true;
          const shouldBeChecked = isSelected && isEditable;
          
          console.log(`[Product Charges] Row ${charge.ChargeID}: IsSelected=${charge.IsSelected}, IsEditable=${charge.IsEditable}, shouldBeChecked=${shouldBeChecked}`);
          
          const row = document.createElement('tr');
          row.innerHTML = `
            <td class="checkbox-column">
              <input type="checkbox" class="charge-checkbox" 
                     ${shouldBeChecked ? 'checked' : ''} 
                     data-charge-id="${charge.ChargeID || ''}"
                     data-effective-date-id="${charge.EffectiveDateID || ''}"
                     style="width: 16px; height: 16px; cursor: pointer;" />
            </td>
            <td>${charge.ChargeID || ''}</td>
            <td>${charge.Description || charge.ChargeDescription || ''}</td>
            <td>${charge.ChargeEvent || ''}</td>
            <td>${charge.EffectiveDate || ''}</td>
            <td>${charge.ExpiryDate || ''}</td>
          `;
          tbody.appendChild(row);
        });

        console.log(`[Product Charges] Populated ${data.length} rows`);
      }

      // Handle Save button
      if (buttons.save) {
        buttons.save.addEventListener('click', async function() {
          console.log('Save button clicked');
          
          try {
            // Get ProductID from parent window's form field
            let productID = '';
            try {
              const parentProductInput = window.parent.document.getElementById('ProductID');
              productID = parentProductInput ? parentProductInput.value.trim() : '';
            } catch (e) {
              console.warn('Could not access parent ProductID field:', e);
            }
            
            if (!productID) {
              alert('Product ID not found. Please select a product first.');
              return;
            }

            // Get session values
            const bankID = sessionStorage.getItem('BankID') || localStorage.getItem('BankID') || '00';
            const operatorID = sessionStorage.getItem('OperatorID') || localStorage.getItem('OperatorID') || 'CSADM';
            
            // Build XML data from checked charges
            const chargesData = [];
            const checkboxes = document.querySelectorAll('.charge-checkbox:checked');
            
            if (checkboxes.length === 0) {
              alert('Please select at least one charge to save.');
              return;
            }

            checkboxes.forEach(checkbox => {
              const row = checkbox.closest('tr');
              const cells = row.querySelectorAll('td');
              
              // Extract data from table cells and checkbox data attributes
              const chargeID = cells[1]?.textContent.trim() || '';
              const effectiveDateID = checkbox.getAttribute('data-effective-date-id') || '0';
              
              chargesData.push({
                BankID: bankID,
                ProductID: productID,
                ChargeID: chargeID,
                EffectiveDateID: effectiveDateID,
                IsSelected: 'true',
                IsEditable: 'true',
                ButtonMark: 'A'
              });
            });

            // Build XML string
            let xmlData = '';
            chargesData.forEach(charge => {
              xmlData += `<dt_ProductCharge>`;
              xmlData += `<BankID>${charge.BankID}</BankID>`;
              xmlData += `<ProductID>${charge.ProductID}</ProductID>`;
              xmlData += `<ChargeID>${charge.ChargeID}</ChargeID>`;
              xmlData += `<EffectiveDateID>${charge.EffectiveDateID}</EffectiveDateID>`;
              xmlData += `<IsSelected>${charge.IsSelected}</IsSelected>`;
              xmlData += `<IsEditable>${charge.IsEditable}</IsEditable>`;
              xmlData += `<ButtonMark>${charge.ButtonMark}</ButtonMark>`;
              xmlData += `</dt_ProductCharge>`;
            });

            // Format current date/time
            const formatLegacyDateTime = (date = new Date()) => {
              const pad2 = (n) => String(n).padStart(2, '0');
              const mm = pad2(date.getMonth() + 1);
              const dd = pad2(date.getDate());
              const yyyy = date.getFullYear();
              const hh = pad2(date.getHours());
              const mi = pad2(date.getMinutes());
              const ss = pad2(date.getSeconds());
              return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
            };

            const currentDateTime = formatLegacyDateTime();

            const requestPayload = {
              RequestID: 'dbo.p_EditProductCharge',
              FormId: 'dbo.p_EditProductCharge',
              RequestData: {
                XMLData: xmlData,
                OperatorID: operatorID
              },
              RequestTime: currentDateTime,
              AppName: 'PROJECT_KAIRO',
              Checksum: ''
            };

            console.log('[Product Charges] Saving data:', requestPayload);

            // Get API URL
            const Environment = window.Environment || {};
            const BASE_URL = (Environment.baseUrlProduct || Environment.baseUrlCommon || 'http://172.16.2.31:3306').replace(/\/+$/, '');
            const apiUrl = `${BASE_URL}/api/OldAPI`;

            // Show loading state
            const saveBtn = buttons.save;
            const originalText = saveBtn.innerHTML;
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Saving...';

            // Make API call
            const response = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestPayload)
            });

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('[Product Charges] Save response:', result);

            // Restore button
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;

            // Check if save was successful
            if (result.success !== false && result.isSuccess !== false) {
              // Show success toast
              showSuccessToast('Product Charges saved successfully!');
            } else {
              const errorMsg = result.message || result.Message || 'Failed to save product charges';
              alert(`Error: ${errorMsg}`);
            }

          } catch (error) {
            console.error('[Product Charges] Save error:', error);
            alert('Error saving product charges: ' + error.message);
            
            // Restore button
            if (buttons.save) {
              buttons.save.disabled = false;
              buttons.save.innerHTML = '<i class="bi bi-floppy me-1"></i>Save';
            }
          }
        });
      }

      // Show success toast notification
      function showSuccessToast(message) {
        // Remove existing toast if any
        const existingToast = document.querySelector('.charges-toast');
        if (existingToast) existingToast.remove();

        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'charges-toast';
        toast.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #28a745;
          color: white;
          padding: 15px 20px;
          border-radius: 4px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          z-index: 10000;
          font-size: 14px;
          font-weight: 500;
          animation: slideIn 0.3s ease-out;
        `;
        toast.textContent = message;

        // Add animation
        const style = document.createElement('style');
        style.textContent = `
          @keyframes slideIn {
            from {
              transform: translateX(400px);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `;
        document.head.appendChild(style);

        document.body.appendChild(toast);

        // Auto remove after 3 seconds
        setTimeout(() => {
          toast.style.animation = 'slideIn 0.3s ease-out reverse';
          setTimeout(() => toast.remove(), 300);
        }, 3000);
      }
    });
