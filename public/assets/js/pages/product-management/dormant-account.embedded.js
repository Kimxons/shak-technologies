document.addEventListener('DOMContentLoaded', function() {
      let currentMode = 'view'; // 'view', 'add', 'edit'
      let currentData = null;

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

      // Get form fields
      const fields = {
        dormantDays: document.getElementById('dormantDays'),
        balanceFrom: document.getElementById('balanceFrom'),
        balanceTo: document.getElementById('balanceTo'),
        allowCredit: document.getElementById('allowCredit'),
        changeProductID: document.getElementById('changeProductID'),
        dormantProductID: document.getElementById('dormantProductID'),
        closeAccount: document.getElementById('closeAccount'),
        creditBalanceGL: document.getElementById('creditBalanceGL'),
        debitBalanceGL: document.getElementById('debitBalanceGL'),
        closeDormantDays: document.getElementById('closeDormantDays')
      };

      // Get action buttons
      const buttons = {
        add: document.querySelector('.btn-action:has(.bi-plus-lg)'),
        edit: document.querySelector('.btn-action:has(.bi-pencil)'),
        delete: document.querySelector('.btn-action:has(.bi-trash)'),
        save: document.querySelector('.btn-action:has(.bi-floppy)'),
        cancel: document.querySelector('.btn-action:has(.bi-x-circle)'),
        back: document.getElementById('backBtn')
      };

      // Enable/disable form fields
      function setFieldsEnabled(enabled) {
        Object.values(fields).forEach(field => {
          if (field) field.disabled = !enabled;
        });
      }

      // Clear form
      function clearForm() {
        Object.values(fields).forEach(field => {
          if (field) {
            if (field.type === 'checkbox') {
              field.checked = false;
            } else {
              field.value = '';
            }
          }
        });
      }

      // Set button states based on mode
      function setButtonStates(mode) {
        if (mode === 'view') {
          // On page load, only Add button is enabled
          if (buttons.add) buttons.add.disabled = false;
          if (buttons.edit) buttons.edit.disabled = true;
          if (buttons.delete) buttons.delete.disabled = true;
          if (buttons.save) buttons.save.disabled = true;
          if (buttons.cancel) buttons.cancel.disabled = true;
          setFieldsEnabled(false);
        } else if (mode === 'add' || mode === 'edit') {
          if (buttons.add) buttons.add.disabled = true;
          if (buttons.edit) buttons.edit.disabled = true;
          if (buttons.delete) buttons.delete.disabled = true;
          if (buttons.save) buttons.save.disabled = false;
          if (buttons.cancel) buttons.cancel.disabled = false;
          setFieldsEnabled(true);
        }
      }

      // Handle Add button
      if (buttons.add) {
        buttons.add.addEventListener('click', function() {
          console.log('Add button clicked');
          currentMode = 'add';
          clearForm();
          setButtonStates('add');
          if (fields.dormantDays) fields.dormantDays.focus();
        });
      }

      // Handle Edit button
      if (buttons.edit) {
        buttons.edit.addEventListener('click', function() {
          console.log('Edit button clicked');
          currentMode = 'edit';
          setButtonStates('edit');
          if (fields.dormantDays) fields.dormantDays.focus();
        });
      }

      // Handle Save button
      if (buttons.save) {
        buttons.save.addEventListener('click', async function() {
          console.log('Save button clicked - Mode:', currentMode);
          
          // Validate required fields
          if (!fields.dormantDays || !fields.dormantDays.value) {
            alert('Please enter Dormant Days');
            return;
          }

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
            
            // Format current date/time for legacy system
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

            // Build request data
            const requestData = {
              BankID: bankID,
              ProductID: productID,
              AllowCreditTrx: fields.allowCredit?.checked ? 1 : 0,
              DormantDays: parseInt(fields.dormantDays.value) || 0,
              IsChangeProduct: fields.changeProductID?.checked ? 1 : 0,
              DormantProductID: fields.dormantProductID?.value || null,
              DormantBalanceFrom: parseFloat(fields.balanceFrom?.value) || 0,
              DormantBalanceTo: parseFloat(fields.balanceTo?.value) || 0,
              DormantMoveBalance: fields.closeAccount?.checked ? 1 : 0,
              DormantMoveBalanceDaysFrom: 0, // Not in form, defaulting to 0
              DormantMoveBalanceDaysTo: parseInt(fields.closeDormantDays?.value) || 0,
              DormantMoveBalanceTo: fields.closeAccount?.checked ? 1 : 0,
              DormantMoveCreditBalanceGL: fields.creditBalanceGL?.value || null,
              DormantMoveDebitBalanceGL: fields.debitBalanceGL?.value || null,
              DormantCloseAccount: fields.closeAccount?.checked ? 1 : 0,
              CreatedBy: operatorID,
              CreatedOn: currentMode === 'add' ? currentDateTime : null,
              ModifiedBy: currentMode === 'edit' ? operatorID : null,
              ModifiedOn: currentMode === 'edit' ? currentDateTime : null,
              SupervisedBy: null,
              NewRecord: currentMode === 'add' ? 1 : 0
            };

            const requestPayload = {
              RequestID: 'dbo.p_AddEditProductDormants',
              FormId: 'dbo.p_AddEditProductDormants',
              RequestData: requestData,
              RequestTime: currentDateTime,
              AppName: 'PROJECT_KAIRO',
              Checksum: ''
            };

            console.log('[Dormant Account] Saving data:', requestPayload);

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
            console.log('[Dormant Account] Save response:', result);

            // Restore button
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;

            // Check if save was successful
            if (result.success !== false && result.isSuccess !== false) {
              // Show success toast
              showSuccessToast('Dormant Account Settings saved successfully!');
              
              currentMode = 'view';
              setButtonStates('view');
              // Enable Cancel button after save
              if (buttons.cancel) buttons.cancel.disabled = false;
            } else {
              const errorMsg = result.message || result.Message || 'Failed to save dormant account settings';
              alert(`Error: ${errorMsg}`);
              saveBtn.disabled = false;
            }

          } catch (error) {
            console.error('[Dormant Account] Save error:', error);
            alert('Error saving dormant account settings: ' + error.message);
            
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
        const existingToast = document.querySelector('.dormant-toast');
        if (existingToast) existingToast.remove();
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'dormant-toast';
        toast.innerHTML = `<i class="bi bi-check-circle me-2"></i>${message}`;
        toast.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #10b981;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          font-size: 14px;
          font-weight: 500;
          z-index: 10000;
          animation: slideInRight 0.3s ease;
          display: flex;
          align-items: center;
        `;
        
        // Add animation
        const style = document.createElement('style');
        style.textContent = `
          @keyframes slideInRight {
            from {
              opacity: 0;
              transform: translateX(100px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(toast);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
          toast.style.animation = 'slideInRight 0.3s ease reverse';
          setTimeout(() => toast.remove(), 300);
        }, 3000);
      }

      // Handle Cancel button
      if (buttons.cancel) {
        buttons.cancel.addEventListener('click', function() {
          console.log('Cancel button clicked');
          if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
            currentMode = 'view';
            clearForm();
            setButtonStates('view');
          }
        });
      }

      // Handle Back button
      if (buttons.back) {
        buttons.back.addEventListener('click', navigateToParent);
      }

      // ===== Product Search Modal =====
      let selectedProductRow = null;

      function openProductSearchModal() {
        const modalElement = document.getElementById('productLookupModal');
        if (!modalElement) {
          console.warn('[Dormant Account] Product lookup modal not found');
          return;
        }

        const ModalCtor = window.bootstrap?.Modal;
        if (!ModalCtor) {
          console.error('[Dormant Account] Bootstrap Modal not available');
          return;
        }

        const modalInstance = ModalCtor.getOrCreateInstance(modalElement);
        modalInstance.show();

        resetProductSearchPanel();
        
        // Automatically perform search to show all products
        setTimeout(() => {
          performProductSearch();
          const idInput = document.getElementById('productSearchId');
          if (idInput) idInput.focus();
        }, 100);
      }

      function closeProductSearchModal() {
        const modalElement = document.getElementById('productLookupModal');
        if (!modalElement) return;

        const ModalCtor = window.bootstrap?.Modal;
        if (ModalCtor) {
          const modalInstance = ModalCtor.getInstance(modalElement);
          if (modalInstance) modalInstance.hide();
        }
      }

      function resetProductSearchPanel() {
        const form = document.getElementById('productLookupForm');
        const results = document.getElementById('productSearchResults');
        const loading = document.getElementById('productSearchLoading');
        const selectBtn = document.getElementById('productSelectBtn');
        
        if (form) form.reset();
        if (results) {
          results.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-4">No results. Click "Search" to find products.</td></tr>`;
        }
        if (loading) loading.classList.add('d-none');
        if (selectBtn) selectBtn.disabled = true;
        selectedProductRow = null;
      }

      async function performProductSearch(event) {
        if (event) event.preventDefault();

        const productIdMode = document.getElementById('productSearchModeId')?.value || 'Like';
        const productId = document.getElementById('productSearchId')?.value?.trim() || '';
        const productNameMode = document.getElementById('productSearchModeName')?.value || 'Like';
        const productName = document.getElementById('productSearchName')?.value?.trim() || '';

        const results = document.getElementById('productSearchResults');
        const loading = document.getElementById('productSearchLoading');
        const selectBtn = document.getElementById('productSelectBtn');

        if (loading) loading.classList.remove('d-none');
        if (results) results.innerHTML = '';
        if (selectBtn) selectBtn.disabled = true;
        selectedProductRow = null;

        try {
          const SearchService = window.SearchService;
          if (!SearchService) {
            throw new Error('SearchService not loaded');
          }

          // Build WHERE clause
          const clauses = [];
          const buildClause = (col, mode, val) => {
            if (!val) return null;
            const safe = val.replace(/'/g, "''");
            return mode === 'Exact' ? `${col} = '${safe}'` : `${col} like '%${safe}%'`;
          };
          
          const idClause = buildClause('ProductID', productIdMode, productId);
          const nameClause = buildClause('Description', productNameMode, productName);
          [idClause, nameClause].forEach(c => c && clauses.push(c));

          const whereStmt = clauses.join(' AND ') || '1=1';

          const payload = {
            TableID: 'ProductID',
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
              results.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-4">No products found matching your search criteria.</td></tr>';
            }
            return;
          }

          if (results) {
            results.innerHTML = rows.map((r, idx) => {
              const pid = r.ProductID || r.productId || '';
              const desc = r.Description || r.description || r.Name || '';
              return `<tr data-result-index="${idx}" data-product-id="${pid}" data-product-name="${desc}" style="cursor: pointer;">
                <td class="text-center">${idx + 1}</td>
                <td>${pid}</td>
                <td>${desc}</td>
              </tr>`;
            }).join('');

            // Add click handlers for rows
            results.querySelectorAll('tr[data-result-index]').forEach(tr => {
              tr.addEventListener('click', () => {
                // Remove previous selection
                results.querySelectorAll('tr').forEach(row => row.classList.remove('table-active'));
                
                // Add selection to clicked row
                tr.classList.add('table-active');
                selectedProductRow = {
                  productId: tr.getAttribute('data-product-id'),
                  productName: tr.getAttribute('data-product-name')
                };
                
                // Enable OK button
                if (selectBtn) selectBtn.disabled = false;
              });

              // Double-click to select and close
              tr.addEventListener('dblclick', () => {
                const pid = tr.getAttribute('data-product-id');
                
                const productField = document.getElementById('dormantProductID');
                
                if (productField) productField.value = pid;
                
                closeProductSearchModal();
              });
            });
          }
        } catch (error) {
          console.error('[Dormant Account] Product search error:', error);
          if (loading) loading.classList.add('d-none');
          if (results) {
            results.innerHTML = '<tr><td colspan="3" class="text-center text-danger py-4">Error performing search. Please try again.</td></tr>';
          }
        }
      }

      function wireProductSearchModal() {
        const form = document.getElementById('productLookupForm');
        const submitBtn = document.getElementById('productSearchSubmit');
        const selectBtn = document.getElementById('productSelectBtn');
        const productLookupBtn = document.querySelector('.btn-lookup[aria-label="Lookup Product"]');

        if (form) form.addEventListener('submit', performProductSearch);
        if (submitBtn) submitBtn.addEventListener('click', performProductSearch);
        
        if (selectBtn) {
          selectBtn.addEventListener('click', () => {
            if (selectedProductRow) {
              const productField = document.getElementById('dormantProductID');
              
              if (productField) productField.value = selectedProductRow.productId;
              
              closeProductSearchModal();
            }
          });
        }

        if (productLookupBtn) {
          productLookupBtn.addEventListener('click', function() {
            console.log('[Dormant Account] Product lookup button clicked');
            openProductSearchModal();
          });
        }

        document.addEventListener('keydown', (e) => {
          const modalElement = document.getElementById('productLookupModal');
          if (!modalElement) return;
          const isVisible = modalElement.classList.contains('show');
          if (e.key === 'Escape' && isVisible) closeProductSearchModal();
        });
        
        // F2 key on Dormant Product ID field
        const dormantProductIDField = document.getElementById('dormantProductID');
        if (dormantProductIDField) {
          dormantProductIDField.addEventListener('keydown', function(e) {
            if (e.key === 'F2') {
              e.preventDefault();
              openProductSearchModal();
            }
          });
        }
      }

      // Initialize product search modal
      wireProductSearchModal();

      // Initialize
      setButtonStates('view');
    });
