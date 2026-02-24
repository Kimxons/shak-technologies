/**
 * Signature / Photo - Modern Professional Module
 * Version: 2.0.0 - January 2026
 * Uses dbo.p_GetAccountSignatories API via accountservice
 */
(function () {
  'use strict';

  console.log('[SignaturePhoto] Initializing...');

  // PARENT STATE ACCESS
  function getParentState() {
    if (window.parent && window.parent !== window && window.parent.AccountMaintenanceState) {
      return window.parent.AccountMaintenanceState;
    }
    if (window.AccountMaintenanceState) {
      return window.AccountMaintenanceState;
    }
    return { OurBranchID: '', AccountID: '', OperatorID: '', ClientID: '' };
  }

  // TOAST NOTIFICATION
  function showToast(message, type) {
    removeToast();
    var container = document.createElement('div');
    container.className = 'de-toast-container de-toast-' + (type || 'info');
    container.innerHTML = '<span>' + message + '</span><button type="button" class="de-toast-close">&times;</button>';
    document.body.appendChild(container);
    container.querySelector('.de-toast-close').addEventListener('click', function() {
      container.remove();
    });
    setTimeout(function() {
      if (container.parentNode) container.remove();
    }, 5000);
  }

  function removeToast() {
    var existing = document.querySelector('.de-toast-container');
    if (existing) existing.remove();
  }

  // UI HELPERS
  function showLoader(message) {
    var overlay = document.getElementById('loadingOverlay');
    var textEl = overlay ? overlay.querySelector('span') : null;
    if (textEl) textEl.textContent = message || 'Loading...';
    if (overlay) overlay.hidden = false;
  }

  function hideLoader() {
    var overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.hidden = true;
  }

  function setStatus(text) {
    var statusBar = document.querySelector('.de-status-bar');
    if (statusBar) statusBar.textContent = text;
  }

  function formatCurrency(value) {
    var num = parseFloat(value);
    if (isNaN(num)) return '0.00';
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // SYNC OPERATING MODE FROM PARENT
  function syncOperatingMode() {
    var state = getParentState();
    var operatingModeEl = document.getElementById('operatingMode');
    var operatingInstructionEl = document.getElementById('operatingInstruction');

    if (operatingModeEl) {
      operatingModeEl.disabled = true;
      operatingModeEl.classList.add('de-select--disabled');
      if (state.OperatingMode) {
        var optionExists = Array.from(operatingModeEl.options).some(function(opt) {
          return opt.value === state.OperatingMode;
        });
        if (!optionExists) {
          var newOpt = document.createElement('option');
          newOpt.value = state.OperatingMode;
          newOpt.textContent = state.OperatingMode;
          operatingModeEl.appendChild(newOpt);
        }
        operatingModeEl.value = state.OperatingMode;
      }
    }

    if (operatingInstructionEl && state.OperatingInstruction) {
      operatingInstructionEl.value = state.OperatingInstruction;
    }
  }

  // FETCH ACCOUNT SIGNATORIES
  function fetchAccountSignatories() {
    console.log('[SignaturePhoto] fetchAccountSignatories called');
    var state = getParentState();
    console.log('[SignaturePhoto] Parent state:', state);

    if (!state.OurBranchID || !state.AccountID) {
      console.warn('[SignaturePhoto] Missing OurBranchID or AccountID');
      setStatus('Missing account information');
      return;
    }

    var requestData = {
      OurBranchID: state.OurBranchID,
      AccountID: state.AccountID,
      OperatorID: state.OperatorID || ''
    };

    console.log('[SignaturePhoto] Request Data:', requestData);
    showLoader('Fetching signatories...');
    setStatus('Loading...');

    if (window.accountservice && typeof window.accountservice.getAccountSignatories === 'function') {
      console.log('[SignaturePhoto] Using accountservice.getAccountSignatories');
      window.accountservice.getAccountSignatories(requestData)
        .then(function(response) {
          console.log('[SignaturePhoto] API Response:', response);
          if (response && response.success === false) {
            setStatus(response.message || 'No data found');
            populateGrid([]);
            return;
          }
          var rows = [];
          if (response && Array.isArray(response.Details)) {
            rows = response.Details;
          } else if (response && response.data && Array.isArray(response.data.Details)) {
            rows = response.data.Details;
          } else if (response && Array.isArray(response.data)) {
            rows = response.data;
          } else if (Array.isArray(response)) {
            rows = response;
          }
          console.log('[SignaturePhoto] Rows to display:', rows.length);
          populateGrid(rows);
          setStatus('Loaded ' + rows.length + ' signatory record(s)');
          syncOperatingMode();
        })
        .catch(function(err) {
          console.error('[SignaturePhoto] API Error:', err);
          setStatus('Error loading signatories');
          showToast('Failed to load signatories. Please try again.', 'error');
          populateGrid([]);
        })
        .finally(function() {
          hideLoader();
        });
    } else {
      console.error('[SignaturePhoto] accountservice not available');
      setStatus('Service unavailable');
      hideLoader();
      showToast('accountservice is not loaded. Please refresh the page.', 'error');
    }
  }

  // POPULATE GRID
  function populateGrid(rows) {
    var tbody = document.querySelector('#signatoriesGrid tbody');
    var recordCount = document.getElementById('recordCount');
    if (!tbody) {
      console.error('[SignaturePhoto] tbody not found');
      return;
    }
    tbody.innerHTML = '';
    if (!rows || rows.length === 0) {
      tbody.innerHTML = '<tr class="de-table__empty"><td colspan="4">No signatory records found for this account.</td></tr>';
      if (recordCount) recordCount.textContent = '0 records';
      return;
    }
    rows.forEach(function(row, index) {
      var tr = document.createElement('tr');
      tr.className = 'sp-grid-row';
      tr.setAttribute('data-index', index);
      var signatoryId = row.SignatoryID || row.signatoryId || row.ID || '';
      var signatoryName = row.SignatoryName || row.signatoryName || row.Name || '';
      var signatoryType = row.SignatoryType || row.signatoryType || row.Type || '';
      var limit = row.Limit || row.limit || row.SignLimit || 0;
      tr.innerHTML =
        '<td class="sp-col-id">' + escapeHtml(signatoryId) + '</td>' +
        '<td class="sp-col-name">' + escapeHtml(signatoryName) + '</td>' +
        '<td class="sp-col-type">' + escapeHtml(signatoryType) + '</td>' +
        '<td class="sp-col-limit">' + formatCurrency(limit) + '</td>';
      tr.addEventListener('click', function() { selectRow(tr, row); });
      tbody.appendChild(tr);
    });
    if (recordCount) recordCount.textContent = rows.length + ' record' + (rows.length !== 1 ? 's' : '');
    console.log('[SignaturePhoto] Grid populated with', rows.length, 'rows');
    if (rows.length > 0) {
      var firstRow = tbody.querySelector('tr');
      if (firstRow) selectRow(firstRow, rows[0]);
    }
  }

  function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function selectRow(tr, rowData) {
    document.querySelectorAll('#signatoriesGrid tbody tr').forEach(function(row) {
      row.classList.remove('sp-grid-row--selected');
    });
    tr.classList.add('sp-grid-row--selected');

    // Fetch signatory images from API
    fetchSignatoryImage(rowData);
  }

  // Fetch signatory image using API
  function fetchSignatoryImage(rowData) {
    console.log('[SignaturePhoto] fetchSignatoryImage called for:', rowData);

    // Get IDs from the signatory row data
    var requestData = {
      SignID: rowData.SignID || rowData.SignatoryID || rowData.signatoryId || 0,
      PhotoID: rowData.PhotoID || rowData.photoId || 0,
      DocumentID: rowData.DocumentID || rowData.documentId || 0
    };

    console.log('[SignaturePhoto] Image request data:', requestData);

    // Show loading state
    var signatureImage = document.getElementById('signatureImage');
    var photoImage = document.getElementById('photoImage');
    if (signatureImage) signatureImage.innerHTML = '<span class="sp-loading">Loading signature...</span>';
    if (photoImage) photoImage.innerHTML = '<span class="sp-loading">Loading photo...</span>';

    if (window.accountservice && typeof window.accountservice.getSignatoryImage === 'function') {
      window.accountservice.getSignatoryImage(requestData)
        .then(function(response) {
          console.log('[SignaturePhoto] Image API Response:', response);
          console.log('[SignaturePhoto] Image API Response (stringified):', JSON.stringify(response, null, 2));

          // Extract image records array from response
          var imageRecords = [];
          if (response && response.Details && Array.isArray(response.Details)) {
            imageRecords = response.Details;
          } else if (response && response.data && response.data.Details && Array.isArray(response.data.Details)) {
            imageRecords = response.data.Details;
          } else if (response && Array.isArray(response.data)) {
            imageRecords = response.data;
          } else if (Array.isArray(response)) {
            imageRecords = response;
          } else if (response && typeof response === 'object') {
            // If response is a single object, wrap it in an array
            imageRecords = [response];
          }

          console.log('[SignaturePhoto] Image records count:', imageRecords.length);
          if (imageRecords.length > 0) {
            console.log('[SignaturePhoto] First image record keys:', Object.keys(imageRecords[0]));
            console.log('[SignaturePhoto] First image record:', imageRecords[0]);
          }

          // Process each image record based on Type field
          // Type 'P' = Photo, Type 'S' = Signature
          var signatureData = null;
          var photoData = null;

          imageRecords.forEach(function(record, idx) {
            // ImageTypeID is the field from the SP
            var imgType = record.ImageTypeID || record.sType || record.stype || record.Type || record.type || record.ImageType || record.DocType || record.DocumentType || '';
            console.log('[SignaturePhoto] Record ' + idx + ' ImageTypeID:', imgType, 'Keys:', Object.keys(record));
            console.log('[SignaturePhoto] Record ' + idx + ' has sImage:', !!record.sImage, 'Length:', record.sImage ? record.sImage.length : 0);
            
            var typeUpper = String(imgType).toUpperCase().trim();
            if (typeUpper === 'S' || typeUpper === 'SIGNATURE') {
              signatureData = record;
            } else if (typeUpper === 'P' || typeUpper === 'PHOTO') {
              photoData = record;
            }
          });

          console.log('[SignaturePhoto] Signature data found:', !!signatureData);
          console.log('[SignaturePhoto] Photo data found:', !!photoData);

          // Update panels with the appropriate data
          updateSignaturePanelFromRecord(signatureData, rowData);
          updatePhotoPanelFromRecord(photoData, rowData);
          
          // Update the audit info card with combined data
          updateAuditCard(signatureData || photoData || (imageRecords.length > 0 ? imageRecords[0] : null));
        })
        .catch(function(err) {
          console.error('[SignaturePhoto] Image API Error:', err);
          showToast('Failed to load signatory images.', 'error');
          // Fall back to row data
          updateSignaturePanel(rowData);
          updatePhotoPanel(rowData);
        });
    } else {
      console.warn('[SignaturePhoto] accountservice.getSignatoryImage not available, using row data');
      updateSignaturePanel(rowData);
      updatePhotoPanel(rowData);
    }
  }

  // Helper function to render base64 image
  function renderBase64Image(base64Data, altText, className) {
    if (!base64Data) return null;
    
    // Remove any data URI prefix if already present
    var cleanBase64 = base64Data;
    if (base64Data.indexOf('data:') === 0) {
      // Already has data URI, use as is
      return '<img src="' + base64Data + '" alt="' + altText + '" class="' + className + '" />';
    }
    
    // Detect image type from base64 header
    var mimeType = 'image/png'; // default
    if (cleanBase64.charAt(0) === '/') {
      mimeType = 'image/jpeg'; // JPEG starts with /9j/
    } else if (cleanBase64.charAt(0) === 'i') {
      mimeType = 'image/png'; // PNG starts with iVBOR
    } else if (cleanBase64.charAt(0) === 'R') {
      mimeType = 'image/gif'; // GIF starts with R0lGO
    } else if (cleanBase64.charAt(0) === 'U') {
      mimeType = 'image/webp'; // WebP starts with UklGR
    }
    
    return '<img src="data:' + mimeType + ';base64,' + cleanBase64 + '" alt="' + altText + '" class="' + className + '" />';
  }

  // Update signature panel from typed image record
  function updateSignaturePanelFromRecord(record, rowData) {
    var signatureImage = document.getElementById('signatureImage');
    var sigScannedBy = document.getElementById('sigScannedBy');
    var sigScannedOn = document.getElementById('sigScannedOn');
    var sigSupervisedBy = document.getElementById('sigSupervisedBy');
    var sigSupervisedOn = document.getElementById('sigSupervisedOn');

    if (record) {
      console.log('[SignaturePhoto] Rendering signature from record:', Object.keys(record));
      // Get base64 image data - sImage is the exact field name from the stored procedure
      var imgData = record.sImage || record.simage || record.SImage || record.Image || record.ImageData || record.Base64 || record.Data || 
                    record.SignatureImage || record.Signature || record.ImageBase64 || 
                    record.Picture || record.Photo || record.Document || '';
      
      console.log('[SignaturePhoto] Signature imgData found:', !!imgData, 'Length:', imgData ? imgData.length : 0);
      
      if (imgData && signatureImage) {
        var imgHtml = renderBase64Image(imgData, 'Signature', 'sp-image');
        if (imgHtml) {
          signatureImage.innerHTML = imgHtml;
          console.log('[SignaturePhoto] Signature image rendered');
        } else {
          signatureImage.innerHTML = '<span class="sp-no-image">No signature available</span>';
        }
      } else if (signatureImage) {
        signatureImage.innerHTML = '<span class="sp-no-image">No signature available</span>';
      }
      // Update audit fields
      if (sigScannedBy) sigScannedBy.value = record.ScannedBy || record.SigScannedBy || '';
      if (sigScannedOn) sigScannedOn.value = record.ScannedOn || record.SigScannedOn || '';
      if (sigSupervisedBy) sigSupervisedBy.value = record.SupervisedBy || record.SigSupervisedBy || '';
      if (sigSupervisedOn) sigSupervisedOn.value = record.SupervisedOn || record.SigSupervisedOn || '';
    } else {
      // No signature record found, use fallback
      updateSignaturePanel(rowData);
    }
  }

  // Update photo panel from typed image record
  function updatePhotoPanelFromRecord(record, rowData) {
    var photoImage = document.getElementById('photoImage');
    var photoScannedBy = document.getElementById('photoScannedBy');
    var photoScannedOn = document.getElementById('photoScannedOn');
    var photoSupervisedBy = document.getElementById('photoSupervisedBy');
    var photoSupervisedOn = document.getElementById('photoSupervisedOn');

    if (record) {
      console.log('[SignaturePhoto] Rendering photo from record:', Object.keys(record));
      // Get base64 image data - sImage is the exact field name from the stored procedure
      var imgData = record.sImage || record.simage || record.SImage || record.Image || record.ImageData || record.Base64 || record.Data || 
                    record.PhotoImage || record.Photo || record.ImageBase64 || 
                    record.Picture || record.Signature || record.Document || '';
      
      console.log('[SignaturePhoto] Photo imgData found:', !!imgData, 'Length:', imgData ? imgData.length : 0);
      
      if (imgData && photoImage) {
        var imgHtml = renderBase64Image(imgData, 'Photo', 'sp-image');
        if (imgHtml) {
          photoImage.innerHTML = imgHtml;
          console.log('[SignaturePhoto] Photo image rendered');
        } else {
          photoImage.innerHTML = '<span class="sp-no-image">No photo available</span>';
        }
      } else if (photoImage) {
        photoImage.innerHTML = '<span class="sp-no-image">No photo available</span>';
      }
      // Update audit fields
      if (photoScannedBy) photoScannedBy.value = record.ScannedBy || record.PhotoScannedBy || '';
      if (photoScannedOn) photoScannedOn.value = record.ScannedOn || record.PhotoScannedOn || '';
      if (photoSupervisedBy) photoSupervisedBy.value = record.SupervisedBy || record.PhotoSupervisedBy || '';
      if (photoSupervisedOn) photoSupervisedOn.value = record.SupervisedOn || record.PhotoSupervisedOn || '';
    } else {
      // No photo record found, use fallback
      updatePhotoPanel(rowData);
    }
  }

  function updateSignaturePanel(rowData) {
    var signatureImage = document.getElementById('signatureImage');
    var sigScannedBy = document.getElementById('sigScannedBy');
    var sigScannedOn = document.getElementById('sigScannedOn');
    var sigSupervisedBy = document.getElementById('sigSupervisedBy');
    var sigSupervisedOn = document.getElementById('sigSupervisedOn');
    
    var imgData = rowData.sImage || rowData.simage || rowData.SImage || rowData.SignatureImage || rowData.Signature || rowData.Image || rowData.Photo || '';
    console.log('[SignaturePhoto] Fallback signature imgData:', !!imgData, 'Length:', imgData ? imgData.length : 0);
    
    if (imgData && signatureImage) {
      var imgHtml = renderBase64Image(imgData, 'Signature', 'sp-image');
      if (imgHtml) {
        signatureImage.innerHTML = imgHtml;
      } else {
        signatureImage.innerHTML = '<span class="sp-no-image">No signature available</span>';
      }
    } else if (signatureImage) {
      signatureImage.innerHTML = '<span class="sp-no-image">No signature available</span>';
    }
    if (sigScannedBy) sigScannedBy.value = rowData.SigScannedBy || rowData.SignatureScannedBy || '';
    if (sigScannedOn) sigScannedOn.value = rowData.SigScannedOn || rowData.SignatureScannedOn || '';
    if (sigSupervisedBy) sigSupervisedBy.value = rowData.SigSupervisedBy || rowData.SignatureSupervisedBy || '';
    if (sigSupervisedOn) sigSupervisedOn.value = rowData.SigSupervisedOn || rowData.SignatureSupervisedOn || '';
  }

  function updatePhotoPanel(rowData) {
    var photoImage = document.getElementById('photoImage');
    var photoScannedBy = document.getElementById('photoScannedBy');
    var photoScannedOn = document.getElementById('photoScannedOn');
    var photoSupervisedBy = document.getElementById('photoSupervisedBy');
    var photoSupervisedOn = document.getElementById('photoSupervisedOn');
    
    var imgData = rowData.simage || rowData.SImage || rowData.PhotoImage || rowData.Photo || rowData.Image || rowData.Picture || '';
    console.log('[SignaturePhoto] Fallback photo imgData:', !!imgData, 'Length:', imgData ? imgData.length : 0);
    
    if (imgData && photoImage) {
      var imgHtml = renderBase64Image(imgData, 'Photo', 'sp-image');
      if (imgHtml) {
        photoImage.innerHTML = imgHtml;
      } else {
        photoImage.innerHTML = '<span class="sp-no-image">No photo available</span>';
      }
    } else if (photoImage) {
      photoImage.innerHTML = '<span class="sp-no-image">No photo available</span>';
    }
    if (photoScannedBy) photoScannedBy.value = rowData.PhotoScannedBy || '';
    if (photoScannedOn) photoScannedOn.value = rowData.PhotoScannedOn || '';
    if (photoSupervisedBy) photoSupervisedBy.value = rowData.PhotoSupervisedBy || '';
    if (photoSupervisedOn) photoSupervisedOn.value = rowData.PhotoSupervisedOn || '';
  }

  // Update the audit info card
  function updateAuditCard(record) {
    var createdBy = document.getElementById('createdBy');
    var createdOn = document.getElementById('createdOn');
    var modifiedBy = document.getElementById('modifiedBy');
    var modifiedOn = document.getElementById('modifiedOn');
    var supervisedBy = document.getElementById('supervisedBy');
    var supervisedOn = document.getElementById('supervisedOn');

    if (record) {
      console.log('[SignaturePhoto] Updating audit card with record:', Object.keys(record));
      
      // Created By/On
      if (createdBy) createdBy.textContent = record.CreatedBy || record.ScannedBy || record.AddedBy || '-';
      if (createdOn) createdOn.textContent = formatAuditDate(record.CreatedOn || record.ScannedOn || record.AddedOn || '');
      
      // Modified By/On
      if (modifiedBy) modifiedBy.textContent = record.ModifiedBy || record.UpdatedBy || record.ChangedBy || '-';
      if (modifiedOn) modifiedOn.textContent = formatAuditDate(record.ModifiedOn || record.UpdatedOn || record.ChangedOn || '');
      
      // Supervised By/On
      if (supervisedBy) supervisedBy.textContent = record.SupervisedBy || record.ApprovedBy || '-';
      if (supervisedOn) supervisedOn.textContent = formatAuditDate(record.SupervisedOn || record.ApprovedOn || '');
    } else {
      // Clear all fields
      if (createdBy) createdBy.textContent = '-';
      if (createdOn) createdOn.textContent = '-';
      if (modifiedBy) modifiedBy.textContent = '-';
      if (modifiedOn) modifiedOn.textContent = '-';
      if (supervisedBy) supervisedBy.textContent = '-';
      if (supervisedOn) supervisedOn.textContent = '-';
    }
  }

  // Format audit date for display
  function formatAuditDate(dateVal) {
    if (!dateVal) return '-';
    try {
      var d = new Date(dateVal);
      if (!isNaN(d.getTime())) {
        var day = String(d.getDate()).padStart(2, '0');
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        var month = months[d.getMonth()];
        var year = d.getFullYear();
        var hours = d.getHours();
        var minutes = String(d.getMinutes()).padStart(2, '0');
        var ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return day + '-' + month + '-' + year + ', ' + hours + ':' + minutes + ' ' + ampm;
      }
    } catch(e) {
      console.warn('[SignaturePhoto] Could not format date:', dateVal);
    }
    return String(dateVal);
  }

  function printSignatories() {
    var tbody = document.querySelector('#signatoriesGrid tbody');
    var rows = tbody ? tbody.querySelectorAll('tr:not(.de-table__empty)') : [];
    if (!rows || rows.length === 0) {
      showToast('No signatory data to print. Please load data first.', 'warning');
      return;
    }
    var state = getParentState();
    var rowsHtml = '';
    for (var i = 0; i < rows.length; i++) {
      var cells = rows[i].querySelectorAll('td');
      rowsHtml += '<tr><td>' + (cells[0] ? cells[0].textContent : '') + '</td><td>' + (cells[1] ? cells[1].textContent : '') + '</td><td>' + (cells[2] ? cells[2].textContent : '') + '</td><td class="right">' + (cells[3] ? cells[3].textContent : '') + '</td></tr>';
    }
    var printHtml = '<!DOCTYPE html><html><head><title>Account Signatories</title><style>body{font-family:Segoe UI,sans-serif;font-size:11px;padding:20px}.header{text-align:center;margin-bottom:20px;border-bottom:2px solid #4a7c95;padding-bottom:15px}.header h1{font-size:18px;color:#4a7c95;margin-bottom:5px}.info{display:flex;justify-content:space-between;margin-bottom:15px;background:#f8fafc;padding:10px}table{width:100%;border-collapse:collapse;margin-bottom:20px}th{background:#4a7c95;color:#fff;padding:8px;text-align:left;font-size:10px;text-transform:uppercase}th.right{text-align:right}td{padding:6px 8px;border-bottom:1px solid #e2e8f0}td.right{text-align:right}tr:nth-child(even){background:#f8fafc}.footer{margin-top:20px;text-align:center;font-size:10px;color:#64748b}@media print{th{background:#4a7c95!important;-webkit-print-color-adjust:exact}}</style></head><body><div class="header"><h1>ACCOUNT SIGNATORIES</h1><div>' + new Date().toLocaleDateString() + '</div></div><div class="info"><span><strong>Branch:</strong> ' + (state.OurBranchID || '-') + '</span><span><strong>Account:</strong> ' + (state.AccountID || '-') + '</span></div><table><thead><tr><th>Signatory ID</th><th>Signatory Name</th><th>Signatory Type</th><th class="right">Limit</th></tr></thead><tbody>' + rowsHtml + '</tbody></table><div class="footer">Computer generated signatory list</div></body></html>';
    var printWindow = window.open('', '_blank', 'width=900,height=700');
    if (printWindow) {
      printWindow.document.write(printHtml);
      printWindow.document.close();
      printWindow.onload = function() { printWindow.focus(); printWindow.print(); };
    }
  }

  function exportSignatories() {
    var tbody = document.querySelector('#signatoriesGrid tbody');
    var rows = tbody ? tbody.querySelectorAll('tr:not(.de-table__empty)') : [];
    if (!rows || rows.length === 0) {
      showToast('No signatory data to export. Please load data first.', 'warning');
      return;
    }
    var csv = 'Signatory ID,Signatory Name,Signatory Type,Limit\n';
    for (var i = 0; i < rows.length; i++) {
      var cells = rows[i].querySelectorAll('td');
      csv += '"' + (cells[0] ? cells[0].textContent : '') + '","' + (cells[1] ? cells[1].textContent : '') + '","' + (cells[2] ? cells[2].textContent : '') + '","' + (cells[3] ? cells[3].textContent : '') + '"\n';
    }
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'account_signatories_' + new Date().toISOString().slice(0, 10) + '.csv';
    link.click();
  }

  function closeView() {
    try { window.parent.postMessage({ type: 'accountMaintenanceChildClose' }, '*'); } catch (_) {}
  }

  // TITLE BAR
  function wireTitleBar() {
    var titleBarContainer = document.querySelector('[data-kairo-titlebar]');
    var titleBarElement = document.querySelector('.ktb-title-bar');
    var targetElement = titleBarElement || titleBarContainer;
    if (!targetElement) return;

    targetElement.addEventListener('kairo:titlebar:refresh', function() {
      fetchAccountSignatories();
    });
    targetElement.addEventListener('kairo:titlebar:maximize', function(e) {
      var isMaximized = e.detail && e.detail.maximized;
      if (typeof window.toggleMaximize === 'function') {
        window.toggleMaximize(isMaximized);
      }
    });
    targetElement.addEventListener('kairo:titlebar:close', function() {
      closeView();
    });
  }

  function zoomImage(type) {
    var imageEl = type === 'sig' ? document.getElementById('signatureImage') : document.getElementById('photoImage');
    var img = imageEl ? imageEl.querySelector('img') : null;
    if (!img) {
      showToast('No ' + (type === 'sig' ? 'signature' : 'photo') + ' to zoom.', 'info');
      return;
    }

    var existing = document.querySelector('.sp-zoom-modal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.className = 'sp-zoom-modal';
    modal.innerHTML = '<div class="sp-zoom-content"><img src="' + img.src + '" alt="Zoomed" /><button class="sp-zoom-close">&times;</button></div>';
    document.body.appendChild(modal);

    function removeModal() {
      try { modal.remove(); } catch (_) {}
      document.removeEventListener('keydown', onKeyDown, true);
    }

    function onKeyDown(e) {
      var key = e && (e.key || e.code);
      if (key === 'Escape' || key === 'Esc') {
        e.preventDefault();
        removeModal();
      }
    }

    var closeBtn = modal.querySelector('.sp-zoom-close');
    if (closeBtn) closeBtn.addEventListener('click', function(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      removeModal();
    });

    // Requirement: click the popout to close (image/backdrop/etc.)
    modal.addEventListener('click', function() {
      removeModal();
    });

    document.addEventListener('keydown', onKeyDown, true);
  }

  function wireImageZoomOnClick() {
    var sigWrap = document.getElementById('signatureImage');
    var photoWrap = document.getElementById('photoImage');

    function attach(el, type) {
      if (!el) return;
      el.style.cursor = 'zoom-in';
      el.addEventListener('click', function(e) {
        // Only zoom if an image exists in the container
        var img = el.querySelector('img');
        if (!img) return;
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        zoomImage(type);
      });
    }

    attach(sigWrap, 'sig');
    attach(photoWrap, 'photo');
  }

  function downloadImage(type) {
    var imageEl = type === 'sig' ? document.getElementById('signatureImage') : document.getElementById('photoImage');
    var img = imageEl ? imageEl.querySelector('img') : null;
    if (!img) {
      showToast('No ' + (type === 'sig' ? 'signature' : 'photo') + ' to download.', 'info');
      return;
    }
    var link = document.createElement('a');
    link.href = img.src;
    link.download = (type === 'sig' ? 'signature' : 'photo') + '_' + new Date().toISOString().slice(0, 10) + '.png';
    link.click();
  }

  function wireActionButtons() {
    document.querySelectorAll('[data-action]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var action = btn.getAttribute('data-action');
        switch (action) {
          case 'refresh': fetchAccountSignatories(); break;
          case 'print': printSignatories(); break;
          case 'export': exportSignatories(); break;
          case 'close': closeView(); break;
          case 'minimize': var root = document.querySelector('.de-window'); if (root) root.classList.toggle('de-window--minimized'); break;
          case 'zoom-sig': zoomImage('sig'); break;
          case 'zoom-photo': zoomImage('photo'); break;
          case 'download-sig': downloadImage('sig'); break;
          case 'download-photo': downloadImage('photo'); break;
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function() {
    console.log('[SignaturePhoto] DOM ready');
    wireTitleBar();
    wireActionButtons();
    wireImageZoomOnClick();
    syncOperatingMode();
    try { window.parent.postMessage({ action: 'submoduleOpened' }, '*'); } catch (_) {}
    setTimeout(function() { fetchAccountSignatories(); }, 100);
  });
})();
