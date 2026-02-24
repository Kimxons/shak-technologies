document.addEventListener('DOMContentLoaded', function() {
      // Get button references
      const editBtn = document.getElementById('editBtn');
      const saveBtn = document.getElementById('saveBtn');
      const cancelBtn = document.getElementById('cancelBtn');
      const backBtn = document.getElementById('backBtn');
      
      // Set initial button states - only Edit and Cancel enabled
      function setInitialButtonStates() {
        if (editBtn) editBtn.disabled = false;
        if (saveBtn) saveBtn.disabled = true;
        if (cancelBtn) cancelBtn.disabled = false;
        if (backBtn) backBtn.disabled = false;
        
        // Disable all checkboxes
        disableAllCheckboxes();
        
        console.log('[Product Documents] Initial button states set - Only Edit and Cancel enabled');
      }
      
      // Enable/disable all checkboxes
      function disableAllCheckboxes() {
        document.querySelectorAll('#documentsTable .bs-checkbox').forEach(checkbox => {
          checkbox.disabled = true;
        });
      }
      
      function enableAllCheckboxes() {
        document.querySelectorAll('#documentsTable .bs-checkbox').forEach(checkbox => {
          checkbox.disabled = false;
        });
      }
      
      // Handle Edit button click
      if (editBtn) {
        editBtn.addEventListener('click', function() {
          console.log('[Product Documents] Edit button clicked');
          
          // Enable Save button, disable Edit
          if (saveBtn) saveBtn.disabled = false;
          if (editBtn) editBtn.disabled = true;
          
          // Enable all checkboxes
          enableAllCheckboxes();
          
          console.log('[Product Documents] Edit mode activated - Save enabled, checkboxes enabled');
        });
      }
      
      // Handle Cancel button click
      if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
          console.log('[Product Documents] Cancel button clicked');
          
          // Reset button states
          setInitialButtonStates();
          
          // Reload data to reset checkboxes
          initializeDocuments();
          
          console.log('[Product Documents] Cancelled - reset to initial state');
        });
      }
      
      // Handle Save button click
      if (saveBtn) {
        saveBtn.addEventListener('click', async function() {
          console.log('[Product Documents] Save button clicked');
          
          try {
            // Collect data from grid rows
            const gridRows = document.querySelectorAll('#documentsTable tbody tr');
            const detailRecords = [];
            
            gridRows.forEach(row => {
              const documentClassID = row.dataset.documentId;
              const isApplicableCheckbox = row.querySelector('[data-field="isApplicable"]');
              const isMandatoryCheckbox = row.querySelector('[data-field="isMandatory"]');
              
              if (documentClassID && (isApplicableCheckbox || isMandatoryCheckbox)) {
                detailRecords.push({
                  DocumentClassID: documentClassID,
                  IsApplicable: isApplicableCheckbox ? isApplicableCheckbox.checked : false,
                  IsMandatory: isMandatoryCheckbox ? isMandatoryCheckbox.checked : false
                });
              }
            });
            
            // Build XML from detail records
            let xmlString = '';
            detailRecords.forEach(record => {
              xmlString += '<dt_ProductDocuments>';
              xmlString += `<DocumentClassID>${record.DocumentClassID}</DocumentClassID>`;
              xmlString += `<IsApplicable>${record.IsApplicable}</IsApplicable>`;
              xmlString += `<IsMandatory>${record.IsMandatory}</IsMandatory>`;
              xmlString += '</dt_ProductDocuments>';
            });
            
            console.log('[Product Documents] Generated XML:', xmlString);
            
            // Get current user and product ID
            const currentUser = window.parent?.currentUser || window.currentUser || window.UserName || 'SYSTEM';
            const productID = window.parent?.currentProductID || sessionStorage.getItem('currentProductID') || '';
            
            // Build request payload
            const requestPayload = {
              RequestID: 'dbo.p_EditProductDocuments',
              FormId: 'dbo.p_EditProductDocuments',
              RequestData: {
                BankID: '00',
                ProductID: productID,
                OperatedBy: currentUser,
                OperatedOn: null,
                SupervisedBy: null,
                UpdateCount: 0,
                DetailRecords: xmlString
              },
              RequestTime: new Date().toLocaleString('en-US', { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit', 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit',
                hour12: false 
              }).replace(/(\d+)\/(\d+)\/(\d+),/, '$1/$2/$3'),
              AppName: 'PROJECT_KAIRO',
              Checksum: ''
            };
            
            console.log('[Product Documents] Save request payload:', requestPayload);
            
            // Send to API
            const Environment = window.Environment || {};
            const BASE_URL = (Environment.baseUrlCommon || "http://172.16.2.31:3306").replace(/\/+$/, "");
            const apiUrl = `${BASE_URL}/api/OldAPI`;
            
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
            console.log('[Product Documents] Save response:', result);
            console.log('[Product Documents] Response type:', typeof result);
            console.log('[Product Documents] Response keys:', Object.keys(result));
            
            // Check if save was successful
            const isSuccess = result.Status === 'Success' || 
                            result.status === 'success' ||
                            result.ErrorCode === 0 || 
                            result.errorCode === 0 ||
                            result.success === true ||
                            (result.Details && result.Details.length >= 0);
            
            if (isSuccess) {
              // Show green toast notification
              showToast('Product Documents saved successfully!', 'success');
              
              // Reset to initial state
              setInitialButtonStates();
              
              console.log('[Product Documents] Save successful');
            } else {
              const errorMessage = result.ErrorDesc || result.errorDesc || result.message || result.Message || 'Save failed';
              console.error('[Product Documents] Save failed with response:', result);
              throw new Error(errorMessage);
            }
            
          } catch (error) {
            console.error('[Product Documents] Error saving data:', error);
            showToast('Error saving Product Documents: ' + error.message, 'error');
          }
        });
      }
      
      // Toast notification function
      function showToast(message, type = 'success') {
        // Remove existing toast if any
        const existingToast = document.querySelector('.doc-toast');
        if (existingToast) existingToast.remove();
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'doc-toast';
        toast.textContent = message;
        toast.style.cssText = `
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: ${type === 'success' ? '#10b981' : '#ef4444'};
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          font-size: 14px;
          font-weight: 500;
          z-index: 10000;
          animation: slideDown 0.3s ease;
        `;
        
        // Add animation
        const style = document.createElement('style');
        style.textContent = `
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateX(-50%) translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateX(-50%) translateY(0);
            }
          }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(toast);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
          toast.style.animation = 'slideDown 0.3s ease reverse';
          setTimeout(() => toast.remove(), 300);
        }, 3000);
      }
      
      // Function to populate grid with documents data
      function populateDocumentsGrid(data) {
        const tableBody = document.querySelector('#documentsTable tbody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        console.log('[Product Documents] Populating grid with data:', data);
        
        if (data && Array.isArray(data) && data.length > 0) {
          data.forEach((doc, index) => {
            console.log(`[Product Documents] Row ${index}:`, doc);
            
            const row = document.createElement('tr');
            
            const descriptionCell = document.createElement('td');
            descriptionCell.textContent = doc.Description || doc.description || doc.DocumentDescription || '';
            
            const isApplicableCell = document.createElement('td');
            isApplicableCell.style.textAlign = 'center';
            const applicableCheckbox = document.createElement('input');
            applicableCheckbox.type = 'checkbox';
            applicableCheckbox.className = 'bs-checkbox';
            applicableCheckbox.disabled = true; // Initially disabled
            applicableCheckbox.checked = doc.IsApplicable === true || 
                                         doc.isApplicable === true || 
                                         doc.IsApplicable === 1 || 
                                         doc.IsApplicable === '1' ||
                                         doc.isApplicable === 1;
            applicableCheckbox.dataset.field = 'isApplicable';
            isApplicableCell.appendChild(applicableCheckbox);
            
            const isMandatoryCell = document.createElement('td');
            isMandatoryCell.style.textAlign = 'center';
            const mandatoryCheckbox = document.createElement('input');
            mandatoryCheckbox.type = 'checkbox';
            mandatoryCheckbox.className = 'bs-checkbox';
            mandatoryCheckbox.disabled = true; // Initially disabled
            mandatoryCheckbox.checked = doc.IsMandatory === true || 
                                        doc.isMandatory === true || 
                                        doc.IsMandatory === 1 || 
                                        doc.IsMandatory === '1' ||
                                        doc.isMandatory === 1;
            mandatoryCheckbox.dataset.field = 'isMandatory';
            isMandatoryCell.appendChild(mandatoryCheckbox);
            
            row.appendChild(descriptionCell);
            row.appendChild(isApplicableCell);
            row.appendChild(isMandatoryCell);
            
            // Store document data on row for later use
            row.dataset.documentId = doc.DocumentID || doc.documentID || doc.DocumentClassID || '';
            row.dataset.description = doc.Description || doc.description || '';
            row.dataset.bankId = doc.BankID || '';
            row.dataset.productId = doc.ProductID || '';
            
            tableBody.appendChild(row);
          });
          
          console.log(`[Product Documents] Populated grid with ${data.length} documents`);
        } else {
          const emptyRow = document.createElement('tr');
          emptyRow.innerHTML = '<td colspan="3" style="text-align: center; color: var(--text-gray); padding: 20px;">No documents found</td>';
          tableBody.appendChild(emptyRow);
          console.log('[Product Documents] No documents to display');
        }
      }
      
      // Function to fetch product documents
      async function fetchProductDocuments(requestData) {
        try {
          console.log('[Product Documents] Fetching data with request:', requestData);
          
          const Environment = window.Environment || {};
          const BASE_URL = (Environment.baseUrlCommon || "http://172.16.2.31:3306").replace(/\/+$/, "");
          const apiUrl = `${BASE_URL}/api/OldAPI`;
          
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const result = await response.json();
          console.log('[Product Documents] API Response:', result);
          
          // Process the response - use Details01 first (that's where the actual data is)
          const documents = result.Details01 || result.Details || result.details || [];
          console.log('[Product Documents] Documents to populate:', documents);
          populateDocumentsGrid(documents);
          
          // Set initial button states after loading data
          setInitialButtonStates();
          
        } catch (error) {
          console.error('[Product Documents] Error fetching data:', error);
          alert('Error loading Product Documents: ' + error.message);
        }
      }
      
      // Auto-load documents when form opens
      function initializeDocuments() {
        const currentUser = window.parent?.currentUser || window.currentUser || window.UserName || 'SYSTEM';
        const branchID = window.parent?.currentBranchID || sessionStorage.getItem('currentBranchID') || '001';
        const productID = window.parent?.currentProductID || sessionStorage.getItem('currentProductID') || '';
        
        const requestPayload = {
          RequestID: 'dbo.p_GetProductDocuments',
          FormId: 'dbo.p_GetProductDocuments',
          RequestData: {
            BankID: '00',
            OurBranchID: branchID,
            ProductID: productID,
            OperatorID: currentUser
          },
          RequestTime: new Date().toLocaleString('en-US', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: false 
          }).replace(/(\d+)\/(\d+)\/(\d+),/, '$1/$2/$3'),
          AppName: 'PROJECT_KAIRO',
          Checksum: ''
        };
        
        console.log('[Product Documents] Initializing with payload:', requestPayload);
        fetchProductDocuments(requestPayload);
      }
      
      // Listen for messages from parent
      window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'init' && event.data.data) {
          console.log('[Product Documents] Received init message from parent:', event.data.data);
          fetchProductDocuments(event.data.data);
        }
      });
      
      // Auto-initialize on load
      setTimeout(initializeDocuments, 100);
      
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

      // Handle Back button
      if (backBtn) {
        backBtn.addEventListener('click', navigateToParent);
      }
    });

