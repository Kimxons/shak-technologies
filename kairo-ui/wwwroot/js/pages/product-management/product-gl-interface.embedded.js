document.addEventListener('DOMContentLoaded', function () {
      // Toast notification function
      function showToast(message, type = 'success') {
        // Remove existing toast if any
        const existingToast = document.querySelector('.gl-toast');
        if (existingToast) existingToast.remove();
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'gl-toast';
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
      
      // Initialize button states on page load
      let buttons = {
        add: document.getElementById('addBtn'),
        edit: document.getElementById('editBtn'),
        delete: document.getElementById('deleteBtn'),
        save: document.getElementById('saveBtn'),
        cancel: document.getElementById('cancelBtn'),
        back: document.getElementById('backBtn'),
        close: document.getElementById('closeBtn'),
        // Grid toolbar buttons - using data-action selector
        alter: document.querySelector('[data-action="alter"]'),
        remove: document.querySelector('[data-action="remove"]'),
        update: document.querySelector('[data-action="update"]'),
        clear: document.querySelector('[data-action="clear"]')
      };

      console.log('[GL Interface] Button References:', {
        alter: buttons.alter,
        remove: buttons.remove,
        update: buttons.update,
        clear: buttons.clear
      });

      // On page load, only Edit button should be enabled
      if (buttons.add) buttons.add.disabled = true;
      if (buttons.edit) buttons.edit.disabled = false;
      if (buttons.delete) buttons.delete.disabled = true;
      if (buttons.save) buttons.save.disabled = true;
      if (buttons.cancel) buttons.cancel.disabled = true;
      if (buttons.back) buttons.back.disabled = false;
      if (buttons.close) buttons.close.disabled = false;
      
      // Disable grid toolbar buttons on page load
      if (buttons.alter) {
        buttons.alter.disabled = true;
        console.log('[GL Interface] Alter button disabled:', buttons.alter.disabled);
      }
      if (buttons.remove) {
        buttons.remove.disabled = true;
        console.log('[GL Interface] Remove button disabled:', buttons.remove.disabled);
      }
      if (buttons.update) {
        buttons.update.disabled = true;
        console.log('[GL Interface] Update button disabled:', buttons.update.disabled);
      }
      if (buttons.clear) {
        buttons.clear.disabled = true;
        console.log('[GL Interface] Clear button disabled:', buttons.clear.disabled);
      }

      console.log('[GL Interface] Initial button states set - Alter, Remove, Update, Clear disabled. Only Edit enabled');

      // If buttons not found on first try, retry after a short delay
      if (!buttons.alter || !buttons.remove || !buttons.update || !buttons.clear) {
        console.warn('[GL Interface] Grid buttons not found on first attempt, retrying in 300ms...');
        setTimeout(() => {
          buttons.alter = buttons.alter || document.querySelector('[data-action="alter"]');
          buttons.remove = buttons.remove || document.querySelector('[data-action="remove"]');
          buttons.update = buttons.update || document.querySelector('[data-action="update"]');
          buttons.clear = buttons.clear || document.querySelector('[data-action="clear"]');
          
          if (buttons.alter) buttons.alter.disabled = true;
          if (buttons.remove) buttons.remove.disabled = true;
          if (buttons.update) buttons.update.disabled = true;
          if (buttons.clear) buttons.clear.disabled = true;
          
          console.log('[GL Interface] Retry complete - Grid buttons disabled');
        }, 300);
      }

      // Handle Edit button click
      if (buttons.edit) {
        buttons.edit.addEventListener('click', function() {
          console.log('[GL Interface] Edit button clicked');
          
          // Enable Alter and Remove buttons only
          if (buttons.alter) buttons.alter.disabled = false;
          if (buttons.remove) buttons.remove.disabled = false;
          
          // Keep Update and Clear disabled until Alter is clicked
          if (buttons.update) buttons.update.disabled = true;
          if (buttons.clear) buttons.clear.disabled = true;
          
          // Enable Cancel, disable Edit, keep Save disabled
          if (buttons.cancel) buttons.cancel.disabled = false;
          if (buttons.edit) buttons.edit.disabled = true;
          if (buttons.save) buttons.save.disabled = true;
          
          console.log('[GL Interface] Edit mode activated - Alter and Remove buttons enabled');
        });
      }

      // Handle Alter button click
      if (buttons.alter) {
        buttons.alter.addEventListener('click', function() {
          console.log('[GL Interface] Alter button clicked');
          
          // Enable Account ID field for editing
          const accountIDInput = document.getElementById('accountID');
          if (accountIDInput) {
            accountIDInput.disabled = false;
            accountIDInput.readOnly = false;
            accountIDInput.focus();
          }
          
          // Enable Update and Clear buttons
          if (buttons.update) buttons.update.disabled = false;
          if (buttons.clear) buttons.clear.disabled = false;
          
          // Keep Save disabled until Update is clicked
          if (buttons.save) buttons.save.disabled = true;
          
          console.log('[GL Interface] Alter mode activated - Account ID enabled, Update and Clear buttons enabled');
        });
      }

      // Handle Update button click
      if (buttons.update) {
        buttons.update.addEventListener('click', function() {
          console.log('[GL Interface] Update button clicked');
          
          // Enable Save and Cancel buttons
          if (buttons.save) buttons.save.disabled = false;
          if (buttons.cancel) buttons.cancel.disabled = false;
          
          console.log('[GL Interface] Update mode activated - Save button enabled');
        });
      }

      // Handle Save button click
      if (buttons.save) {
        buttons.save.addEventListener('click', async function() {
          console.log('[GL Interface] Save button clicked');
          
          // Validate Account ID field
          const accountIDInput = document.getElementById('accountID');
          const accountIDValue = accountIDInput?.value?.trim();
          
          if (!accountIDValue) {
            showToast('Please add Account ID before saving', 'error');
            console.warn('[GL Interface] Save cancelled - Account ID is missing');
            accountIDInput?.focus();
            return;
          }
          
          try {
            // Collect data from grid
            const gridRows = document.querySelectorAll('.data-grid-table tbody tr');
            const detailRecords = [];
            
            gridRows.forEach((row, index) => {
              const accountTag = row.dataset.accountTag || row.cells[0]?.textContent.trim() || '';
              const accountID = row.dataset.accountId || row.cells[1]?.textContent.trim() || '';
              const buttonMark = row.dataset.buttonMark || 'R'; // R or N
              
              if (accountTag) {
                detailRecords.push({
                  AccountTagID: accountTag,
                  AccountID: accountID,
                  ButtonMark: buttonMark,
                  TempID: index
                });
              }
            });
            
            // Build XML from detail records
            let xmlString = '';
            detailRecords.forEach(record => {
              xmlString += '<dt_Accounts>';
              xmlString += `<AccountTagID>${record.AccountTagID}</AccountTagID>`;
              if (record.AccountID) {
                xmlString += `<AccountID>${record.AccountID}</AccountID>`;
              }
              xmlString += `<ButtonMark>${record.ButtonMark}</ButtonMark>`;
              xmlString += `<TempID>${record.TempID}</TempID>`;
              xmlString += '</dt_Accounts>';
            });
            
            console.log('[GL Interface] Generated XML:', xmlString);
            
            // Get current user (from session or global)
            const currentUser = window.currentUser || window.UserName || 'SYSTEM';
            
            // Get RelevantID from parent or current context
            const relevantID = window.parent?.currentProductID || 
                              sessionStorage.getItem('currentProductID') || 
                              '3021';
            
            // Build request payload
            const requestPayload = {
              RequestID: 'dbo.p_AddEditGLInterface',
              FormId: 'dbo.p_AddEditGLInterface',
              RequestData: {
                BankID: '00',
                RelevantID: relevantID,
                ModuleID: 2525,
                OperatedBy: currentUser,
                UpdateCount: 0,
                OperatedOn: null,
                SupervisedBy: null,
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
            
            console.log('[GL Interface] Save request payload:', requestPayload);
            
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
            console.log('[GL Interface] Save response:', result);
            console.log('[GL Interface] Response type:', typeof result);
            console.log('[GL Interface] Response keys:', Object.keys(result));
            
            // Check if save was successful - handle multiple response formats
            const isSuccess = result.Status === 'Success' || 
                            result.status === 'success' ||
                            result.ErrorCode === 0 || 
                            result.errorCode === 0 ||
                            result.success === true ||
                            (result.Details && result.Details.length >= 0);
            
            if (isSuccess) {
              // Show green toast notification
              showToast('GL Interface data saved successfully!', 'success');
              
              // Disable save button, enable edit
              if (buttons.save) buttons.save.disabled = true;
              if (buttons.edit) buttons.edit.disabled = false;
              if (buttons.delete) buttons.delete.disabled = false;
              if (buttons.alter) buttons.alter.disabled = true;
              if (buttons.remove) buttons.remove.disabled = true;
              if (buttons.update) buttons.update.disabled = true;
              if (buttons.clear) buttons.clear.disabled = true;
            } else {
              const errorMessage = result.ErrorDesc || result.errorDesc || result.message || result.Message || 'Save failed';
              console.error('[GL Interface] Save failed with response:', result);
              throw new Error(errorMessage);
            }
            
          } catch (error) {
            console.error('[GL Interface] Error saving data:', error);
            alert('Error saving GL Interface data: ' + error.message);
          }
        });
      }

      // Handle Cancel button click
      if (buttons.cancel) {
        buttons.cancel.addEventListener('click', function() {
          console.log('[GL Interface] Cancel button clicked');
          
          // Clear form fields
          const accountTagSelect = document.getElementById('accountTag');
          const accountIDInput = document.getElementById('accountID');
          
          if (accountTagSelect) accountTagSelect.selectedIndex = 0;
          if (accountIDInput) accountIDInput.value = '';
          
          // Clear row selection
          document.querySelectorAll('.data-grid-table tbody tr').forEach(r => {
            r.style.backgroundColor = '';
          });
          
          console.log('[GL Interface] Form fields cleared');
        });
      }

      // Handle Clear button click
      if (buttons.clear) {
        buttons.clear.addEventListener('click', function() {
          console.log('[GL Interface] Clear button clicked');
          
          // Clear form fields
          const accountTagSelect = document.getElementById('accountTag');
          const accountIDInput = document.getElementById('accountID');
          
          if (accountTagSelect) accountTagSelect.selectedIndex = 0;
          if (accountIDInput) accountIDInput.value = '';
          
          // Clear row selection
          document.querySelectorAll('.data-grid-table tbody tr').forEach(r => {
            r.style.backgroundColor = '';
          });
          
          console.log('[GL Interface] Form fields cleared');
        });
      }

      const navigateToParent = function () {
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
      const backBtn = document.getElementById('backBtn');
      if (backBtn) {
        backBtn.addEventListener('click', navigateToParent);
      }

      // Handle Close button
      const closeBtn = document.getElementById('closeBtn');
      if (closeBtn) {
        closeBtn.addEventListener('click', navigateToParent);
      }

      // Function to open account search modal
      function openAccountSearchModal() {
        console.log('[GL Interface] Opening account search modal');
        
        // Create modal overlay and iframe
        const overlay = document.createElement('div');
        overlay.className = 'account-search-modal-overlay';
        overlay.style.cssText = `
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(4px);
          z-index: 9999; display: flex; align-items: center; justify-content: center;
          padding: 20px;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
          width: 900px; height: 600px; background: white;
          border-radius: 16px; overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          display: flex; flex-direction: column;
        `;

        const iframe = document.createElement('iframe');
        iframe.src = '../common/account-search.html';
        iframe.style.cssText = 'flex: 1; width: 100%; border: none;';

        const header = document.createElement('div');
        header.style.cssText = `
          padding: 10px 20px; border-bottom: 1px solid #eee; 
          display: flex; justify-content: space-between; align-items: center;
          background: #0a6ba5; color: white; flex-shrink: 0;
        `;
        header.innerHTML = `
          <div>
            <div style="font-size: 11px; opacity: 0.9;">Account Maintenance</div>
            <div style="font-weight:600; font-size: 16px;">Find an Existing Account</div>
          </div>
          <button class="close-btn" style="
            border: 2px solid white; 
            background: transparent; 
            font-size: 32px; 
            cursor: pointer; 
            color: white; 
            padding: 0; 
            width: 40px; 
            height: 40px; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            border-radius: 50%; 
            line-height: 1; 
            font-weight: bold;
            font-family: Arial, sans-serif;
          ">&times;</button>
        `;
        
        const closeBtn = header.querySelector('.close-btn');
        closeBtn.addEventListener('mouseenter', function() {
          this.style.background = 'rgba(255,255,255,0.2)';
        });
        closeBtn.addEventListener('mouseleave', function() {
          this.style.background = 'transparent';
        });

        closeBtn.addEventListener('click', () => {
          overlay.remove();
          messageHandler.remove();
        });

        modal.appendChild(header);
        modal.appendChild(iframe);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) {
            overlay.remove();
            messageHandler.remove();
          }
        });

        // Listen for account selection from modal
        const messageHandler = {
          handler: (event) => {
            if (event.data && event.data.type === 'accountSelected') {
              console.log('[GL Interface] Account selected from modal:', event.data.account);
              const accountIDInput = document.getElementById('accountID');
              if (accountIDInput && event.data.account) {
                accountIDInput.value = event.data.account.AccountID || event.data.account.accountID || '';
              }
              overlay.remove();
              messageHandler.remove();
            } else if (event.data && event.data.type === 'closeAccountSearch') {
              console.log('[GL Interface] Close button clicked in modal');
              overlay.remove();
              messageHandler.remove();
            }
          },
          remove: () => {
            window.removeEventListener('message', messageHandler.handler);
          }
        };

        window.addEventListener('message', messageHandler.handler);
      }

      // Handle Account ID search button click
      const accountSearchBtn = document.querySelector('.btn-lookup');
      console.log('[GL Interface] Account search button found:', accountSearchBtn);
      
      if (accountSearchBtn) {
        console.log('[GL Interface] Attaching click handler to account search button');
        accountSearchBtn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          console.log('[GL Interface] Account search button clicked');
          openAccountSearchModal();
        });
      } else {
        console.error('[GL Interface] Account search button not found with selector .btn-lookup');
      }

      // Add F2 key handler to Account ID field
      const accountIDInput = document.getElementById('accountID');
      if (accountIDInput) {
        accountIDInput.addEventListener('keydown', function(e) {
          if (e.key === 'F2') {
            e.preventDefault();
            console.log('[GL Interface] F2 pressed on Account ID field');
            openAccountSearchModal();
          }
        });
        console.log('[GL Interface] F2 key handler attached to Account ID field');
      } else {
        console.warn('[GL Interface] Account ID input field not found');
      }

      // Function to populate Account Tag dropdown
      function populateAccountTagDropdown(data) {
        const accountTagSelect = document.getElementById('accountTag');
        console.log('[GL Interface] populateAccountTagDropdown called');
        console.log('[GL Interface] Account Tag select element:', accountTagSelect);
        console.log('[GL Interface] Data received:', data);
        
        if (!accountTagSelect) {
          console.error('[GL Interface] Account Tag dropdown not found! Element #accountTag does not exist.');
          return;
        }

        // Clear existing options except the first one
        accountTagSelect.innerHTML = '<option value="">--Select--</option>';

        if (data && Array.isArray(data)) {
          console.log(`[GL Interface] Processing ${data.length} account tag items`);
          console.log('[GL Interface] First item structure:', data[0]);
          
          data.forEach((item, index) => {
            const option = document.createElement('option');
            // Map to actual field names from Details01
            option.value = item.SubCodeID || item.AccountTagID || item.ID || item.Value || '';
            option.textContent = item.Description || item.AccountTagName || item.Name || item.Text || item.Value || '';
            accountTagSelect.appendChild(option);
            
            if (index < 3) {
              console.log(`[GL Interface] Added option ${index}:`, {
                value: option.value,
                text: option.textContent
              });
            }
          });
          console.log(`[GL Interface] Successfully populated ${data.length} account tags`);
        } else {
          console.warn('[GL Interface] No data or invalid data format:', data);
        }
      }

      // Function to populate the grid
      function populateGrid(data) {
        const tableBody = document.querySelector('.data-grid-table tbody');
        if (!tableBody) {
          console.error('Grid table body not found');
          return;
        }

        // Only clear existing rows if we have data to populate
        // This preserves the static HTML data until API data arrives
        if (data && Array.isArray(data) && data.length > 0) {
          tableBody.innerHTML = '';
          console.log('[GL Interface] Grid data sample:', data[0]);
          data.forEach(item => {
            const row = document.createElement('tr');
            // Store data in the row for later use
            row.dataset.accountTag = item.Description || item.AccountTag || item.Tag || '';
            row.dataset.accountId = item.AccountID || item.GLAccountNumber || item.AccountNumber || '';
            row.dataset.accountName = item.AccountName || item.GLAccountName || item.Name || '';
            
            // Map to actual field names from Details02
            row.innerHTML = `
              <td>${item.Description || item.AccountTag || item.Tag || ''}</td>
              <td>${item.AccountID || item.GLAccountNumber || item.AccountNumber || ''}</td>
              <td>${item.AccountName || item.GLAccountName || item.Name || ''}</td>
            `;
            
            // Add click event to bind data to form fields
            row.style.cursor = 'pointer';
            row.addEventListener('click', function() {
              // Remove previous selection highlighting
              document.querySelectorAll('.data-grid-table tbody tr').forEach(r => {
                r.style.backgroundColor = '';
              });
              
              // Highlight selected row
              this.style.backgroundColor = '#e3f2fd';
              
              // Bind data to form fields
              const accountTagSelect = document.getElementById('accountTag');
              const accountIDInput = document.getElementById('accountID');
              
              if (accountTagSelect && this.dataset.accountTag) {
                // Try to find and select the matching option
                const options = accountTagSelect.options;
                for (let i = 0; i < options.length; i++) {
                  if (options[i].textContent === this.dataset.accountTag) {
                    accountTagSelect.selectedIndex = i;
                    break;
                  }
                }
              }
              
              if (accountIDInput) {
                accountIDInput.value = this.dataset.accountId || '';
              }
              
              console.log('[GL Interface] Row clicked - Data bound to form:', {
                accountTag: this.dataset.accountTag,
                accountId: this.dataset.accountId
              });
            });
            
            tableBody.appendChild(row);
          });
          console.log(`[GL Interface] Populated grid with ${data.length} rows`);
        } else if (data && Array.isArray(data) && data.length === 0) {
          // Only show empty state if we explicitly received empty array
          tableBody.innerHTML = '';
          const emptyRow = document.createElement('tr');
          emptyRow.innerHTML = '<td colspan="3" style="text-align: center; color: var(--text-gray); padding: 20px;">No data available</td>';
          tableBody.appendChild(emptyRow);
          console.log('[GL Interface] No data to display in grid');
        } else {
          // Keep existing static data from HTML
          console.log('[GL Interface] No data provided, keeping static HTML data');
        }
      }

      // Function to call the API
      async function fetchGLInterfaceData(requestData) {
        try {
          console.log('[GL Interface] Fetching data with request:', requestData);

          const Environment = window.Environment || {};
          const BASE_URL = (Environment.baseUrlCommon || "http://172.16.2.31:3306").replace(/\/+$/, "");
          const apiUrl = `${BASE_URL}/api/OldAPI`;
          
          console.log('[GL Interface] API URL:', apiUrl);
          
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
          console.log('[GL Interface] API Response:', result);

          // Process the response - use Details01 and Details02 from the result
          if (result.Details01) {
            console.log('[GL Interface] Populating Account Tag dropdown with Details01:', result.Details01);
            populateAccountTagDropdown(result.Details01);
          }

          if (result.Details02) {
            console.log('[GL Interface] Populating grid with Details02:', result.Details02);
            populateGrid(result.Details02);
          }

        } catch (error) {
          console.error('[GL Interface] Error fetching data:', error);
          alert('Error loading GL Interface data: ' + error.message);
        }
      }

      // Listen for messages from parent
      window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'init' && event.data.data) {
          console.log('[GL Interface] Received init message from parent:', event.data.data);
          fetchGLInterfaceData(event.data.data);
        }
      });

      // Also check if data was passed via parent window
      if (window.parent && window.parent.childFormRequestData) {
        console.log('[GL Interface] Found request data in parent:', window.parent.childFormRequestData);
        fetchGLInterfaceData(window.parent.childFormRequestData);
      }
      
      // Auto-load GL Interface data on page load
      async function autoLoadGLInterface() {
        try {
          console.log('[GL Interface] Auto-load function started');
          
          // Check if accountTag element exists
          const accountTagSelect = document.getElementById('accountTag');
          console.log('[GL Interface] Account Tag element check:', accountTagSelect);
          
          // Get ProductID from parent window's form field - try multiple possible field names
          let productID = '';
          try {
            // Try different possible field IDs/names
            const possibleFields = ['ProductID', 'Product', 'productId', 'product'];
            let parentProductInput = null;
            
            for (const fieldName of possibleFields) {
              parentProductInput = window.parent.document.getElementById(fieldName);
              if (parentProductInput) {
                console.log(`[GL Interface] Found parent field with id: ${fieldName}`);
                break;
              }
            }
            
            // If still not found, try by name attribute
            if (!parentProductInput) {
              for (const fieldName of possibleFields) {
                parentProductInput = window.parent.document.querySelector(`[name="${fieldName}"]`);
                if (parentProductInput) {
                  console.log(`[GL Interface] Found parent field with name: ${fieldName}`);
                  break;
                }
              }
            }
            
            console.log('[GL Interface] Parent Product element:', parentProductInput);
            productID = parentProductInput ? parentProductInput.value.trim() : '';
            console.log('[GL Interface] ProductID extracted:', productID);
          } catch (e) {
            console.error('[GL Interface] Error accessing parent Product field:', e);
          }
          
          if (!productID) {
            console.warn('[GL Interface] Product ID not found. Skipping auto-load.');
            return;
          }

          // Get session values
          const bankID = sessionStorage.getItem('BankID') || localStorage.getItem('BankID') || '00';
          const branchID = sessionStorage.getItem('OurBranchID') || sessionStorage.getItem('BranchID') || localStorage.getItem('BranchID') || '0101';
          const operatorID = sessionStorage.getItem('OperatorID') || localStorage.getItem('OperatorID') || 'CSADM';
          
          console.log('[GL Interface] Session values:', { bankID, branchID, operatorID });
          
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
            RequestID: 'dbo.p_GetGLInterface',
            FormId: 'dbo.p_GetGLInterface',
            RequestData: {
              OurBranchID: branchID,
              BankID: bankID,
              RelevantID: productID,
              ModuleID: '2507',
              OperatorID: operatorID
            },
            RequestTime: currentDateTime,
            AppName: 'PROJECT_KAIRO',
            Checksum: ''
          };

          console.log('[GL Interface] Auto-loading data with payload:', requestPayload);
          await fetchGLInterfaceData(requestPayload);
          
        } catch (error) {
          console.error('[GL Interface] Auto-load error:', error);
        }
      }
      
      // Trigger auto-load after a short delay to ensure parent is ready
      setTimeout(autoLoadGLInterface, 500);
      
      // ===== Account ID Search Modal =====
      let selectedAccountRow = null;

      function openAccountSearchModal() {
        const modalElement = document.getElementById('accountLookupModal');
        if (!modalElement) {
          console.warn('[GL Interface] Account lookup modal not found');
          return;
        }

        const ModalCtor = window.bootstrap?.Modal;
        if (!ModalCtor) {
          console.error('[GL Interface] Bootstrap Modal not available');
          return;
        }

        const modalInstance = ModalCtor.getOrCreateInstance(modalElement);
        modalInstance.show();

        resetAccountSearchPanel();
        
        // Automatically perform search to show all accounts
        setTimeout(() => {
          performAccountSearch();
          const idInput = document.getElementById('accountSearchId');
          if (idInput) idInput.focus();
        }, 100);
      }

      function closeAccountSearchModal() {
        const modalElement = document.getElementById('accountLookupModal');
        if (!modalElement) return;

        const ModalCtor = window.bootstrap?.Modal;
        if (ModalCtor) {
          const modalInstance = ModalCtor.getInstance(modalElement);
          if (modalInstance) modalInstance.hide();
        }
      }

      function resetAccountSearchPanel() {
        const form = document.getElementById('accountLookupForm');
        const results = document.getElementById('accountSearchResults');
        const loading = document.getElementById('accountSearchLoading');
        const selectBtn = document.getElementById('accountSelectBtn');
        
        if (form) form.reset();
        if (results) {
          results.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-4">No results. Click "Search" to find accounts.</td></tr>`;
        }
        if (loading) loading.classList.add('d-none');
        if (selectBtn) selectBtn.disabled = true;
        selectedAccountRow = null;
      }

      async function performAccountSearch(event) {
        if (event) event.preventDefault();

        const accountIdMode = document.getElementById('accountSearchModeId')?.value || 'Like';
        const accountId = document.getElementById('accountSearchId')?.value?.trim() || '';
        const accountNameMode = document.getElementById('accountSearchModeName')?.value || 'Like';
        const accountName = document.getElementById('accountSearchName')?.value?.trim() || '';

        const results = document.getElementById('accountSearchResults');
        const loading = document.getElementById('accountSearchLoading');
        const selectBtn = document.getElementById('accountSelectBtn');

        if (loading) loading.classList.remove('d-none');
        if (results) results.innerHTML = '';
        if (selectBtn) selectBtn.disabled = true;
        selectedAccountRow = null;

        try {
          const SearchService = window.SearchService;
          if (!SearchService) {
            throw new Error('SearchService not loaded');
          }

          // Build WHERE clause for GL accounts
          const clauses = [];
          const buildClause = (col, mode, val) => {
            if (!val) return null;
            const safe = val.replace(/'/g, "''");
            return mode === 'Exact' ? `${col} = '${safe}'` : `${col} like '%${safe}%'`;
          };
          
          const idClause = buildClause('GLID', accountIdMode, accountId);
          const nameClause = buildClause('GLTitle', accountNameMode, accountName);
          [idClause, nameClause].forEach(c => c && clauses.push(c));

          const whereStmt = clauses.join(' AND ') || '1=1';

          const payload = {
            TableID: 'GLActiveID',
            WhereStmt: whereStmt,
            AdvFilterString: '',
            PrevOrNext: '1',
            RefID: '',
            OperatorID: sessionStorage.getItem('OperatorID') || 'web_portal',
            ModuleID: 1000,
            OurBranchID: sessionStorage.getItem('OurBranchID') || ''
          };

          const service = window.ClientService || window.SearchService;
          if (!service || (typeof service.searchClients !== 'function' && typeof service.search !== 'function')) {
            throw new Error('Search service not available');
          }
          
          const response = service.searchClients ? await service.searchClients(payload) : await service.search(payload);
          let rows = response?.Details?.SearchResults || response?.Details || response?.SearchResults || [];
          if (!Array.isArray(rows)) rows = rows ? [rows] : [];

          if (loading) loading.classList.add('d-none');

          if (!rows.length) {
            if (results) {
              results.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-4">No accounts found matching your search criteria.</td></tr>';
            }
            return;
          }

          if (results) {
            results.innerHTML = rows.map((r, idx) => {
              const glId = r.GLID || r.glId || r.AccountID || r.accountId || '';
              const glName = r.GLTitle || r.glTitle || r.AccountTitle || r.accountTitle || r.Description || '';
              return `<tr data-result-index="${idx}" data-account-id="${glId}" data-account-name="${glName}" style="cursor: pointer;">
                <td class="text-center">${idx + 1}</td>
                <td>${glId}</td>
                <td>${glName}</td>
              </tr>`;
            }).join('');

            // Add click handlers for rows
            results.querySelectorAll('tr[data-result-index]').forEach(tr => {
              tr.addEventListener('click', () => {
                // Remove previous selection
                results.querySelectorAll('tr').forEach(row => row.classList.remove('table-active'));
                
                // Add selection to clicked row
                tr.classList.add('table-active');
                selectedAccountRow = {
                  accountId: tr.getAttribute('data-account-id'),
                  accountName: tr.getAttribute('data-account-name')
                };
                
                // Enable OK button
                if (selectBtn) selectBtn.disabled = false;
              });

              // Double-click to select and close
              tr.addEventListener('dblclick', () => {
                const accId = tr.getAttribute('data-account-id');
                const accName = tr.getAttribute('data-account-name');
                
                const accountField = document.getElementById('accountID');
                
                if (accountField) accountField.value = accId;
                
                closeAccountSearchModal();
              });
            });
          }
        } catch (error) {
          console.error('[GL Interface] Account search error:', error);
          if (loading) loading.classList.add('d-none');
          if (results) {
            results.innerHTML = '<tr><td colspan="3" class="text-center text-danger py-4">Error performing search. Please try again.</td></tr>';
          }
        }
      }

      function wireAccountSearchModal() {
        const form = document.getElementById('accountLookupForm');
        const submitBtn = document.getElementById('accountSearchSubmit');
        const selectBtn = document.getElementById('accountSelectBtn');
        const accountLookupBtn = document.querySelector('.gl-interface-header .btn-lookup');

        if (form) form.addEventListener('submit', performAccountSearch);
        if (submitBtn) submitBtn.addEventListener('click', performAccountSearch);
        
        if (selectBtn) {
          selectBtn.addEventListener('click', () => {
            if (selectedAccountRow) {
              const accountField = document.getElementById('accountID');
              
              if (accountField) accountField.value = selectedAccountRow.accountId;
              
              closeAccountSearchModal();
            }
          });
        }

        if (accountLookupBtn) {
          accountLookupBtn.addEventListener('click', function() {
            console.log('[GL Interface] Account lookup button clicked');
            openAccountSearchModal();
          });
        }

        document.addEventListener('keydown', (e) => {
          const modalElement = document.getElementById('accountLookupModal');
          if (!modalElement) return;
          const isVisible = modalElement.classList.contains('show');
          if (e.key === 'Escape' && isVisible) closeAccountSearchModal();
        });
        
        // F2 key on Account ID field
        const accountIDField = document.getElementById('accountID');
        if (accountIDField) {
          accountIDField.addEventListener('keydown', function(e) {
            if (e.key === 'F2') {
              e.preventDefault();
              openAccountSearchModal();
            }
          });
        }
      }

      // Initialize account search modal
      wireAccountSearchModal();
    });

