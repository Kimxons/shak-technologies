// --- Fallback demo for getCities if not present ---
if (!window.GeneralLedgerService.getCities) {
  window.GeneralLedgerService.getCities = async function() {
    // Demo response as per user sample
    return {
      Details: [
        { SubCodeID: "01", CodeDescription: "Bahir Dar" },
        { SubCodeID: "03", CodeDescription: "Woldia Zuria" },
        { SubCodeID: "04", CodeDescription: "Mukono" },
        { SubCodeID: "05", CodeDescription: "Seeta" },
        { SubCodeID: "07", CodeDescription: "Jinja" },
        { SubCodeID: "08", CodeDescription: "Mbarara" },
        { SubCodeID: "09", CodeDescription: "Robit" },
        { SubCodeID: "10", CodeDescription: "Estayesh" }
        // ... add more as needed
      ]
    };
  };
}
// --- BANKS array for Bank ID Search Modal ---
const BANKS = [
  ["00","Tsedeay Bank S.C"],["01","Commercial Bank of Ethiopia"],["03","Development Bank of Ethiopia"],["04","Awash International Bank S.C"],["05","Dashen Bank S.C"],["06","Bank of Abyssinia S.C"],["07","United Bank S.C"],["08","Wegagen Bank S.C"],["09","NIB International Bank S.C"],["10","Cooperative Bank of Oromia S.C"],["11","Lion International Bank S.C"],["12","Zemen Bank S.C"],["13","Oromia International Bank S.C"],["14","Bunna International Bank S.C"],["15","Abay Bank S.C"],["16","Addis International Bank S.C"],["17","Berhan International Bank S.C"],["18","Debub Global Bank S.C"],["19","Enat Bank S.C"],["20","Goh Betoch Bank S.C"],["21","Hijra Bank S.C"],["22","Shabelle Bank S.C"],["23","Siinqee Bank S.C"],["24","Amhara Bank S.C"],["25","Gadaa Bank S.C"],["26","Ahadu Bank S.C"],["27","Ramiz Bank S.C"],["28","Tsedey Bank S.C"],["29","Rammis Bank S.C"]
];

// --- Sample Account Data for Account Search Modal ---
const SAMPLE_ACCOUNTS = [
  { AccountID: "11121001", Description: "CAC International Bank -USD", CurrencyID: "USD", GLAccountT: "A", CreatedBy: "ADMIN", CreatedOn: "01/15/2026", SupervisedBy: "SUPERVISOR1", SupervisedOn: "01/15/2026" },
  { AccountID: "11121002", Description: "Beirut (UK) LTD London UK-USD", CurrencyID: "USD", GLAccountT: "A", CreatedBy: "ADMIN", CreatedOn: "01/14/2026", SupervisedBy: "SUPERVISOR1", SupervisedOn: "01/14/2026" },
  { AccountID: "11121003", Description: "Africa Bank Djibouti -USD", CurrencyID: "USD", GLAccountT: "A", CreatedBy: "OPERATOR2", CreatedOn: "01/13/2026", SupervisedBy: "SUPERVISOR2", SupervisedOn: "01/13/2026" },
  { AccountID: "11121004", Description: "AKTIF YATIRIM BANKASI A S ISTANBUL TURKY USD", CurrencyID: "USD", GLAccountT: "A", CreatedBy: "ADMIN", CreatedOn: "01/12/2026", SupervisedBy: "SUPERVISOR1", SupervisedOn: "01/12/2026" },
  { AccountID: "11121005", Description: "EXIM BANK DJIBOUTI -USD", CurrencyID: "USD", GLAccountT: "A", CreatedBy: "OPERATOR1", CreatedOn: "01/11/2026", SupervisedBy: "SUPERVISOR2", SupervisedOn: "01/11/2026" },
  { AccountID: "11121006", Description: "AFREKIMBAMK Cairo Egypt", CurrencyID: "USD", GLAccountT: "A", CreatedBy: "ADMIN", CreatedOn: "01/10/2026", SupervisedBy: "SUPERVISOR1", SupervisedOn: "01/10/2026" },
  { AccountID: "11121101", Description: "Beirut (UK) LTD London UK-GBP", CurrencyID: "GBP", GLAccountT: "A", CreatedBy: "OPERATOR2", CreatedOn: "01/09/2026", SupervisedBy: "SUPERVISOR2", SupervisedOn: "01/09/2026" },
  { AccountID: "11121201", Description: "Beirut (UK) LTD London UK-EUR", CurrencyID: "EUR", GLAccountT: "A", CreatedBy: "ADMIN", CreatedOn: "01/08/2026", SupervisedBy: "SUPERVISOR1", SupervisedOn: "01/08/2026" },
  { AccountID: "11121301", Description: "Standard Chartered Bank Kenya-KES", CurrencyID: "KES", GLAccountT: "A", CreatedBy: "OPERATOR1", CreatedOn: "01/07/2026", SupervisedBy: "SUPERVISOR2", SupervisedOn: "01/07/2026" },
  { AccountID: "11121401", Description: "HSBC Bank Middle East-AED", CurrencyID: "AED", GLAccountT: "A", CreatedBy: "ADMIN", CreatedOn: "01/06/2026", SupervisedBy: "SUPERVISOR1", SupervisedOn: "01/06/2026" },
  { AccountID: "11121501", Description: "Citibank N.A. New York-USD", CurrencyID: "USD", GLAccountT: "A", CreatedBy: "OPERATOR2", CreatedOn: "01/05/2026", SupervisedBy: "SUPERVISOR2", SupervisedOn: "01/05/2026" },
  { AccountID: "11121601", Description: "Deutsche Bank AG Frankfurt-EUR", CurrencyID: "EUR", GLAccountT: "A", CreatedBy: "ADMIN", CreatedOn: "01/04/2026", SupervisedBy: "SUPERVISOR1", SupervisedOn: "01/04/2026" }
];

// --- Fallback demo for getCountries if not present ---
if (!window.GeneralLedgerService.getCountries) {
  window.GeneralLedgerService.getCountries = async function() {
    // Demo response as per user sample
    return {
      Details: [
        { SubCodeID: "AC", CodeDescription: "Australia" },
        { SubCodeID: "AD", CodeDescription: "Andorra" },
        { SubCodeID: "AE", CodeDescription: "United Arab Emirates" },
        { SubCodeID: "AI", CodeDescription: "Åland Islands" },
        { SubCodeID: "AS", CodeDescription: "American Samoa" },
        { SubCodeID: "AU", CodeDescription: "Austria" },
        { SubCodeID: "BI", CodeDescription: "British Indian Ocean Territory" },
        { SubCodeID: "BM", CodeDescription: "Belgium" },
        { SubCodeID: "BO", CodeDescription: "Bouvet Island" },
        { SubCodeID: "BX", CodeDescription: "British Virgin Islands" }
        // ... add more as needed
      ]
    };
  };
}

// --- Populate Country dropdown using GeneralLedgerService (API response) ---
async function populateCountryDropdown() {
  const countrySelect = document.getElementById('countryId');
  if (!countrySelect || !window.GeneralLedgerService || !GeneralLedgerService.getCountries) return;
  try {
    const response = await GeneralLedgerService.getCountries();
    if (response && response.Details && Array.isArray(response.Details)) {
      countrySelect.innerHTML = '<option value="">--Select--</option>' +
        response.Details.map(country => `<option value="${country.SubCodeID}">${country.CodeDescription}</option>`).join('');
    } else {
      countrySelect.innerHTML = '<option value="">--Select--</option>';
    }
  } catch (e) {
    countrySelect.innerHTML = '<option value="">--Select--</option>';
    console.error('Failed to load countries', e);
  }
}

// --- Populate City dropdown using GeneralLedgerService (API response) ---
async function populateCityDropdown() {
  const citySelect = document.getElementById('cityId');
  if (!citySelect || !window.GeneralLedgerService || !GeneralLedgerService.getCities) return;
  try {
    // Replace with correct API call for city codes
    const response = await GeneralLedgerService.getCities();
    if (response && response.Details && Array.isArray(response.Details)) {
      citySelect.innerHTML = '<option value="">--Select--</option>' +
        response.Details.map(city => `<option value="${city.SubCodeID}">${city.CodeDescription}</option>`).join('');
    } else {
      citySelect.innerHTML = '<option value="">--Select--</option>';
    }
  } catch (e) {
    citySelect.innerHTML = '<option value="">--Select--</option>';
    console.error('Failed to load cities', e);
  }
}

// Call on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  populateCountryDropdown();
  populateCityDropdown();
  // Add manual trigger for testing
  const citySelect = document.getElementById('cityId');
  if (citySelect) {
    citySelect.addEventListener('focus', () => {
      if (citySelect.options.length <= 1) {
        populateCityDropdown();
      }
    });
  }
});
  // --- Lookup and Data Binding for Nostro Account Maintenance ---
  (async function loadLookups() {
    // Populate Country dropdown
    const countrySelect = document.getElementById('countryId');
    if (countrySelect && window.LookupService && LookupService.getCountries) {
      try {
        const countries = await LookupService.getCountries();
        countrySelect.innerHTML = '<option value="">--Select--</option>' +
          countries.map(c => `<option value="${c.CountryID}">${c.CountryName}</option>`).join('');
      } catch (e) {
        countrySelect.innerHTML = '<option value="">--Select--</option>';
      }
    }
    // Populate City dropdown
    const citySelect = document.getElementById('cityId');
    if (citySelect && window.LookupService && LookupService.getCities) {
      try {
        const cities = await LookupService.getCities();
        citySelect.innerHTML = '<option value="">--Select--</option>' +
          cities.map(c => `<option value="${c.CityID}">${c.CityName}</option>`).join('');
      } catch (e) {
        citySelect.innerHTML = '<option value="">--Select--</option>';
      }
    }
  })();

  // --- Bind Nostro Account Data to Form ---
  async function bindNostroAccountData(response) {
    if (!response || !response.Details || !Array.isArray(response.Details) || response.Details.length === 0) return;
    const data = response.Details[0];
    // Set input values
    document.getElementById('branchId').value = data.OurBranchID || '';
    document.getElementById('accountId').value = data.AccountID || '';
    document.getElementById('bankId').value = data.SwiftCodeBankID || '';
    document.getElementById('swiftBranchId').value = data.SwiftCodeBranchID || '';
    document.getElementById('swiftCode').value = data.SwiftCode || '';
    document.getElementById('description').value = data.Description || '';
    document.getElementById('currencyId').value = data.CurrencyID || '';
    document.getElementById('createdBy').value = data.CreatedBy || '';
    document.getElementById('createdOn').value = data.CreatedOn || '';
    document.getElementById('supervisedBy').value = data.SupervisedBy || '';
    document.getElementById('supervisedOn').value = data.SupervisedOn || '';
    // Set dropdowns
    const citySelect = document.getElementById('cityId');
    if (citySelect) citySelect.value = (data.CityID || '').trim();
    const countrySelect = document.getElementById('countryId');
    if (countrySelect) countrySelect.value = (data.CountryID || '').trim();
  }


  // --- Wire View Button to Fetch and Bind Data ---
  document.addEventListener('DOMContentLoaded', function() {
    const viewBtn = document.getElementById('viewBtn');
    if (viewBtn) {
      viewBtn.addEventListener('click', async function() {
        try {
          // Get values from form for query
          const OurBranchID = document.getElementById('branchId').value || '';
          const AccountID = document.getElementById('accountId').value || '';
          const OperatorID = localStorage.getItem('OperatorID') || 'SYS';
          if (!OurBranchID || !AccountID) {
            alert('Please enter Branch ID and Account ID to view.');
            return;
          }
          // Fetch data
          if (!window.GeneralLedgerService || !GeneralLedgerService.getNostroAccount) {
            alert('GeneralLedgerService not loaded.');
            return;
          }
          const response = await GeneralLedgerService.getNostroAccount({ OurBranchID, AccountID, OperatorID });
          await bindNostroAccountData(response);
        } catch (e) {
          alert('Failed to fetch Nostro Account: ' + (e.message || e));
        }
      });
    }
  });



(function(){
  const byId = (x)=>document.getElementById(x);
  const log = (m)=>console.log('[Nostro]', m);

  // Branch ID Search Modal logic
  const branchIdSearchBtn = document.getElementById('branchIdSearchBtn');
  if (branchIdSearchBtn) {
    const modalEl = document.getElementById('branchIdSearchModal');
    const modal = modalEl ? new bootstrap.Modal(modalEl) : null;
    const tableBody = document.querySelector('#branchIdSearchTable tbody');
    const selectBtn = document.getElementById('branchIdSearchSelectBtn');
    const searchDoBtn = document.getElementById('branchIdSearchDoBtn');
    
    // Minimize/Maximize button handlers
    const minimizeBtn = document.getElementById('branchIdModalMinimizeBtn');
    const maximizeBtn = document.getElementById('branchIdModalMaximizeBtn');
    const modalBody = document.getElementById('branchIdModalBody');
    let isMinimized = false;
    let isMaximized = false;

    minimizeBtn?.addEventListener('click', () => {
      if (modalBody) {
        isMinimized = !isMinimized;
        if (isMinimized) {
          modalBody.style.display = 'none';
          modalEl.querySelector('.modal-footer').style.display = 'none';
        } else {
          modalBody.style.display = 'block';
          modalEl.querySelector('.modal-footer').style.display = 'flex';
        }
      }
    });

    maximizeBtn?.addEventListener('click', () => {
      if (modalEl) {
        const modalDialog = modalEl.querySelector('.modal-dialog');
        isMaximized = !isMaximized;
        if (isMaximized) {
          modalDialog.classList.remove('modal-lg', 'modal-dialog-centered');
          modalDialog.style.maxWidth = '95vw';
          modalDialog.style.width = '95vw';
          modalDialog.style.height = '95vh';
          modalDialog.querySelector('.modal-content').style.height = '100%';
          maximizeBtn.innerHTML = '<i class="bi bi-fullscreen-exit" style="font-size: 0.75rem;"></i>';
        } else {
          modalDialog.classList.add('modal-lg', 'modal-dialog-centered');
          modalDialog.style.maxWidth = '';
          modalDialog.style.width = '';
          modalDialog.style.height = '';
          modalDialog.querySelector('.modal-content').style.height = '';
          maximizeBtn.innerHTML = '<i class="bi bi-square" style="font-size: 0.75rem;"></i>';
        }
      }
    });

    // Reset minimize/maximize state when modal is closed
    modalEl?.addEventListener('hidden.bs.modal', () => {
      if (isMinimized) {
        modalBody.style.display = 'block';
        modalEl.querySelector('.modal-footer').style.display = 'flex';
        isMinimized = false;
      }
      if (isMaximized) {
        const modalDialog = modalEl.querySelector('.modal-dialog');
        modalDialog.classList.add('modal-lg', 'modal-dialog-centered');
        modalDialog.style.maxWidth = '';
        modalDialog.style.width = '';
        modalDialog.style.height = '';
        modalDialog.querySelector('.modal-content').style.height = '';
        maximizeBtn.innerHTML = '<i class="bi bi-square" style="font-size: 0.75rem;"></i>';
        isMaximized = false;
      }
    });

    let searchResults = [];
    let selectedRowIdx = null;

    function renderTable(data) {
      tableBody.innerHTML = '';
      data.forEach((row, idx) => {
        const tr = document.createElement('tr');
        tr.tabIndex = 0;
        tr.style.cursor = 'pointer';
        tr.innerHTML = `
          <td style="padding: 0.4rem 0.5rem;">${row.OurBranchID || row[0] || ''}</td>
          <td style="padding: 0.4rem 0.5rem;">${row.BranchName || row[1] || ''}</td>
        `;
        tr.addEventListener('click', () => selectRow(idx));
        tr.addEventListener('dblclick', () => {
          selectRow(idx);
          if (selectBtn && !selectBtn.disabled) {
            selectBtn.click();
          }
        });
        tr.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            selectRow(idx);
            if (selectBtn && !selectBtn.disabled) {
              selectBtn.click();
            }
          }
        });
        // Zebra striping
        if (idx % 2 === 0) {
          tr.style.backgroundColor = '#f9f9f9';
        }
        tableBody.appendChild(tr);
      });
    }

    function selectRow(idx) {
      Array.from(tableBody.children).forEach((tr, i) => {
        if (i === idx) {
          tr.classList.add('table-primary');
          tr.style.backgroundColor = '#b8daff';
        } else {
          tr.classList.remove('table-primary');
          tr.style.backgroundColor = i % 2 === 0 ? '#f9f9f9' : 'white';
        }
      });
      selectedRowIdx = idx;
      selectBtn.disabled = false;
    }

    selectBtn?.addEventListener('click', () => {
      if (selectedRowIdx == null) return;
      const row = searchResults[selectedRowIdx];
      const branchId = row.OurBranchID || row[0] || '';
      const branchName = row.BranchName || row[1] || '';
      byId('branchId').value = branchId;
      byId('branchName').value = branchName;
      
      // Ensure modal is properly hidden
      if (modal) {
        modal.hide();
      }
      
      // Force remove any lingering backdrops
      setTimeout(() => {
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      }, 100);
    });

    // Search button handler
    searchDoBtn?.addEventListener('click', () => {
      log('Searching Branch ID...');
      
      const branchIdValue = document.getElementById('branchIdSearchInput')?.value.trim() || '';
      const branchIdType = document.getElementById('branchIdSearchType')?.value || 'like';
      const branchNameValue = document.getElementById('branchNameSearchInput')?.value.trim() || '';
      const branchNameType = document.getElementById('branchNameSearchType')?.value || 'like';
      
      // Sample branch data
      const sampleBranches = [
        { OurBranchID: '0101', BranchName: 'Head Office' },
        { OurBranchID: '0102', BranchName: 'Addis Ababa Branch' },
        { OurBranchID: '0103', BranchName: 'Bahir Dar Branch' },
        { OurBranchID: '0104', BranchName: 'Dire Dawa Branch' },
        { OurBranchID: '0105', BranchName: 'Hawassa Branch' },
        { OurBranchID: '0106', BranchName: 'Mekelle Branch' },
        { OurBranchID: '0107', BranchName: 'Adama Branch' },
        { OurBranchID: '0108', BranchName: 'Jimma Branch' }
      ];
      
      // Filter results
      let filteredResults = sampleBranches.filter(row => {
        let matches = true;
        
        if (branchIdValue) {
          const rowVal = (row.OurBranchID || '').toLowerCase();
          const searchVal = branchIdValue.toLowerCase();
          matches = matches && (branchIdType === 'like' ? rowVal.includes(searchVal) : rowVal === searchVal);
        }
        
        if (branchNameValue) {
          const rowVal = (row.BranchName || '').toLowerCase();
          const searchVal = branchNameValue.toLowerCase();
          matches = matches && (branchNameType === 'like' ? rowVal.includes(searchVal) : rowVal === searchVal);
        }
        
        return matches;
      });
      
      searchResults = filteredResults;
      renderTable(searchResults);
      selectedRowIdx = null;
      selectBtn.disabled = true;
      
      if (filteredResults.length === 0) {
        log('No branches found matching criteria');
      } else {
        log('Found ' + filteredResults.length + ' branch(es)');
      }
    });

    branchIdSearchBtn.addEventListener('click', () => {
      log('Opening Branch ID Search Modal...');
      // Clear search form
      document.getElementById('branchIdSearchInput').value = '';
      document.getElementById('branchNameSearchInput').value = '';
      
      // Load all sample branches on open
      const sampleBranches = [
        { OurBranchID: '0101', BranchName: 'Head Office' },
        { OurBranchID: '0102', BranchName: 'Addis Ababa Branch' },
        { OurBranchID: '0103', BranchName: 'Bahir Dar Branch' },
        { OurBranchID: '0104', BranchName: 'Dire Dawa Branch' },
        { OurBranchID: '0105', BranchName: 'Hawassa Branch' },
        { OurBranchID: '0106', BranchName: 'Mekelle Branch' },
        { OurBranchID: '0107', BranchName: 'Adama Branch' },
        { OurBranchID: '0108', BranchName: 'Jimma Branch' }
      ];
      
      searchResults = sampleBranches;
      renderTable(searchResults);
      selectedRowIdx = null;
      selectBtn.disabled = true;
      
      modal?.show();
    });
  }

  // Bank ID Search Modal logic
  const bankIdSearchBtn = document.querySelector('button[aria-label="Lookup Bank"]');
  if (bankIdSearchBtn) {
    const modalEl = document.getElementById('bankIdSearchModal');
    const modal = modalEl ? new bootstrap.Modal(modalEl) : null;
    const tableBody = document.querySelector('#bankIdSearchTable tbody');
    const selectBtn = document.getElementById('bankIdSearchSelectBtn');
    const searchDoBtn = document.getElementById('bankIdSearchDoBtn');
    
    // Minimize/Maximize button handlers
    const minimizeBtn = document.getElementById('bankIdModalMinimizeBtn');
    const maximizeBtn = document.getElementById('bankIdModalMaximizeBtn');
    const modalBody = document.getElementById('bankIdModalBody');
    let isMinimized = false;
    let isMaximized = false;

    minimizeBtn?.addEventListener('click', () => {
      if (modalBody) {
        isMinimized = !isMinimized;
        if (isMinimized) {
          modalBody.style.display = 'none';
          modalEl.querySelector('.modal-footer').style.display = 'none';
        } else {
          modalBody.style.display = 'block';
          modalEl.querySelector('.modal-footer').style.display = 'flex';
        }
      }
    });

    maximizeBtn?.addEventListener('click', () => {
      if (modalEl) {
        const modalDialog = modalEl.querySelector('.modal-dialog');
        isMaximized = !isMaximized;
        if (isMaximized) {
          modalDialog.classList.remove('modal-lg', 'modal-dialog-centered');
          modalDialog.style.maxWidth = '95vw';
          modalDialog.style.width = '95vw';
          modalDialog.style.height = '95vh';
          modalDialog.querySelector('.modal-content').style.height = '100%';
          maximizeBtn.innerHTML = '<i class="bi bi-fullscreen-exit" style="font-size: 0.75rem;"></i>';
        } else {
          modalDialog.classList.add('modal-lg', 'modal-dialog-centered');
          modalDialog.style.maxWidth = '';
          modalDialog.style.width = '';
          modalDialog.style.height = '';
          modalDialog.querySelector('.modal-content').style.height = '';
          maximizeBtn.innerHTML = '<i class="bi bi-square" style="font-size: 0.75rem;"></i>';
        }
      }
    });

    // Reset minimize/maximize state when modal is closed
    modalEl?.addEventListener('hidden.bs.modal', () => {
      if (isMinimized) {
        modalBody.style.display = 'block';
        modalEl.querySelector('.modal-footer').style.display = 'flex';
        isMinimized = false;
      }
      if (isMaximized) {
        const modalDialog = modalEl.querySelector('.modal-dialog');
        modalDialog.classList.add('modal-lg', 'modal-dialog-centered');
        modalDialog.style.maxWidth = '';
        modalDialog.style.width = '';
        modalDialog.style.height = '';
        modalDialog.querySelector('.modal-content').style.height = '';
        maximizeBtn.innerHTML = '<i class="bi bi-square" style="font-size: 0.75rem;"></i>';
        isMaximized = false;
      }
    });

    let searchResults = [];
    let selectedRowIdx = null;

    function renderTable(data) {
      tableBody.innerHTML = '';
      data.forEach((item, idx) => {
        const tr = document.createElement('tr');
        tr.tabIndex = 0;
        tr.style.cursor = 'pointer';
        const code = item[0] || item.BankID || '';
        const name = item[1] || item.BankName || '';
        tr.innerHTML = `
          <td style="padding: 0.4rem 0.5rem;">${code}</td>
          <td style="padding: 0.4rem 0.5rem;">${name}</td>
        `;
        tr.addEventListener('click', () => selectRow(idx));
        tr.addEventListener('dblclick', () => {
          selectRow(idx);
          if (selectBtn && !selectBtn.disabled) {
            selectBtn.click();
          }
        });
        tr.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            selectRow(idx);
            if (selectBtn && !selectBtn.disabled) {
              selectBtn.click();
            }
          }
        });
        // Zebra striping
        if (idx % 2 === 0) {
          tr.style.backgroundColor = '#f9f9f9';
        }
        tableBody.appendChild(tr);
      });
    }

    function selectRow(idx) {
      Array.from(tableBody.children).forEach((tr, i) => {
        if (i === idx) {
          tr.classList.add('table-primary');
          tr.style.backgroundColor = '#b8daff';
        } else {
          tr.classList.remove('table-primary');
          tr.style.backgroundColor = i % 2 === 0 ? '#f9f9f9' : 'white';
        }
      });
      selectedRowIdx = idx;
      selectBtn.disabled = false;
    }

    selectBtn?.addEventListener('click', () => {
      if (selectedRowIdx == null) return;
      const item = searchResults[selectedRowIdx];
      const code = item[0] || item.BankID || '';
      byId('bankId').value = code;
      
      // Ensure modal is properly hidden
      if (modal) {
        modal.hide();
      }
      
      // Force remove any lingering backdrops
      setTimeout(() => {
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      }, 100);
    });

    // Search button handler
    searchDoBtn?.addEventListener('click', () => {
      log('Searching Bank ID...');
      
      const bankIdValue = document.getElementById('bankIdSearchInput')?.value.trim() || '';
      const bankIdType = document.getElementById('bankIdSearchType')?.value || 'like';
      const bankNameValue = document.getElementById('bankNameSearchInput')?.value.trim() || '';
      const bankNameType = document.getElementById('bankNameSearchType')?.value || 'like';
      
      // Filter results
      let filteredResults = BANKS.filter(item => {
        let matches = true;
        const code = item[0] || '';
        const name = item[1] || '';
        
        if (bankIdValue) {
          const rowVal = code.toLowerCase();
          const searchVal = bankIdValue.toLowerCase();
          matches = matches && (bankIdType === 'like' ? rowVal.includes(searchVal) : rowVal === searchVal);
        }
        
        if (bankNameValue) {
          const rowVal = name.toLowerCase();
          const searchVal = bankNameValue.toLowerCase();
          matches = matches && (bankNameType === 'like' ? rowVal.includes(searchVal) : rowVal === searchVal);
        }
        
        return matches;
      });
      
      searchResults = filteredResults;
      renderTable(searchResults);
      selectedRowIdx = null;
      selectBtn.disabled = true;
      
      if (filteredResults.length === 0) {
        log('No banks found matching criteria');
      } else {
        log('Found ' + filteredResults.length + ' bank(s)');
      }
    });

    bankIdSearchBtn?.addEventListener('click', () => {
      log('Opening Bank ID Search Modal...');
      // Clear search form
      document.getElementById('bankIdSearchInput').value = '';
      document.getElementById('bankNameSearchInput').value = '';
      
      // Load all banks on open
      searchResults = BANKS;
      renderTable(searchResults);
      selectedRowIdx = null;
      selectBtn.disabled = true;
      
      modal?.show();
    });
  }

  // Swift Branch ID Search Modal logic
  const swiftBranchIdSearchBtn = document.getElementById('swiftBranchIdSearchBtn');
  if (swiftBranchIdSearchBtn) {
    const modalEl = document.getElementById('swiftBranchIdSearchModal');
    const modal = modalEl ? new bootstrap.Modal(modalEl) : null;
    const tableBody = document.getElementById('swiftBranchIdSearchResults');
    const selectBtn = document.getElementById('swiftBranchIdSearchSelectBtn');
    const searchBtn = document.getElementById('swiftBranchIdSearchBtn_modal');
    
    // Minimize/Maximize button handlers
    const minimizeBtn = document.getElementById('swiftBranchIdModalMinimize');
    const maximizeBtn = document.getElementById('swiftBranchIdModalMaximize');
    let isMinimized = false;
    let isMaximized = false;

    minimizeBtn?.addEventListener('click', () => {
      if (modalEl) {
        const modalBody = modalEl.querySelector('.modal-body');
        const modalFooter = modalEl.querySelector('.modal-footer');
        isMinimized = !isMinimized;
        if (isMinimized) {
          modalBody.style.display = 'none';
          modalFooter.style.display = 'none';
        } else {
          modalBody.style.display = 'block';
          modalFooter.style.display = 'flex';
        }
      }
    });

    maximizeBtn?.addEventListener('click', () => {
      if (modalEl) {
        const modalDialog = modalEl.querySelector('.modal-dialog');
        isMaximized = !isMaximized;
        if (isMaximized) {
          modalDialog.style.maxWidth = '95vw';
          modalDialog.style.margin = '1.75rem auto';
          modalEl.querySelector('.modal-body .table-responsive').style.maxHeight = 'calc(95vh - 200px)';
        } else {
          modalDialog.style.maxWidth = '';
          modalDialog.style.margin = '';
          modalEl.querySelector('.modal-body .table-responsive').style.maxHeight = '300px';
        }
      }
    });

    // Reset minimize/maximize state when modal is closed
    modalEl?.addEventListener('hidden.bs.modal', () => {
      if (isMinimized) {
        const modalBody = modalEl.querySelector('.modal-body');
        const modalFooter = modalEl.querySelector('.modal-footer');
        modalBody.style.display = 'block';
        modalFooter.style.display = 'flex';
        isMinimized = false;
      }
      if (isMaximized) {
        const modalDialog = modalEl.querySelector('.modal-dialog');
        modalDialog.style.maxWidth = '';
        modalDialog.style.margin = '';
        modalEl.querySelector('.modal-body .table-responsive').style.maxHeight = '300px';
        isMaximized = false;
      }
    });

    let searchResults = [];
    let selectedRowIdx = null;

    // Sample branch data - same as Branch ID search
    const sampleBranches = [
      { OurBranchID: '0101', BranchName: 'Head Office' },
      { OurBranchID: '0102', BranchName: 'Addis Ababa Branch' },
      { OurBranchID: '0103', BranchName: 'Bahir Dar Branch' },
      { OurBranchID: '0104', BranchName: 'Dire Dawa Branch' },
      { OurBranchID: '0105', BranchName: 'Hawassa Branch' },
      { OurBranchID: '0106', BranchName: 'Mekelle Branch' },
      { OurBranchID: '0107', BranchName: 'Adama Branch' },
      { OurBranchID: '0108', BranchName: 'Jimma Branch' }
    ];

    function renderTable(data) {
      tableBody.innerHTML = '';
      data.forEach((row, idx) => {
        const tr = document.createElement('tr');
        tr.tabIndex = 0;
        tr.style.cursor = 'pointer';
        tr.innerHTML = `
          <td style="padding: 0.4rem 0.5rem;">${row.OurBranchID || ''}</td>
          <td style="padding: 0.4rem 0.5rem;">${row.BranchName || ''}</td>
        `;
        tr.addEventListener('click', () => selectRow(idx));
        tr.addEventListener('dblclick', () => {
          selectRow(idx);
          if (selectBtn && !selectBtn.disabled) {
            selectBtn.click();
          }
        });
        tr.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            selectRow(idx);
            if (selectBtn && !selectBtn.disabled) {
              selectBtn.click();
            }
          }
        });
        // Zebra striping
        if (idx % 2 === 0) {
          tr.style.backgroundColor = '#f9f9f9';
        }
        tableBody.appendChild(tr);
      });
    }

    function selectRow(idx) {
      Array.from(tableBody.children).forEach((tr, i) => {
        if (i === idx) {
          tr.classList.add('table-primary');
          tr.style.backgroundColor = '#b8daff';
        } else {
          tr.classList.remove('table-primary');
          tr.style.backgroundColor = i % 2 === 0 ? '#f9f9f9' : 'white';
        }
      });
      selectedRowIdx = idx;
      selectBtn.disabled = false;
    }

    // Select button handler
    selectBtn?.addEventListener('click', () => {
      if (selectedRowIdx == null) return;
      const row = searchResults[selectedRowIdx];
      const branchId = row.OurBranchID || '';
      byId('swiftBranchId').value = branchId;
      
      // Ensure modal is properly hidden
      if (modal) {
        modal.hide();
      }
      
      // Force remove any lingering backdrops
      setTimeout(() => {
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      }, 100);
    });

    // Search button handler
    searchBtn?.addEventListener('click', () => {
      log('Searching Swift Branch ID...');
      
      const filterType = document.getElementById('swiftBranchIdFilterType')?.value || 'like';
      const branchIdValue = document.getElementById('swiftBranchIdFilterId')?.value.trim() || '';
      const branchNameValue = document.getElementById('swiftBranchIdFilterName')?.value.trim() || '';
      
      // Filter results
      let filteredResults = sampleBranches.filter(row => {
        let matches = true;
        
        if (branchIdValue) {
          const rowVal = (row.OurBranchID || '').toLowerCase();
          const searchVal = branchIdValue.toLowerCase();
          matches = matches && (filterType === 'like' ? rowVal.includes(searchVal) : rowVal === searchVal);
        }
        
        if (branchNameValue) {
          const rowVal = (row.BranchName || '').toLowerCase();
          const searchVal = branchNameValue.toLowerCase();
          matches = matches && (filterType === 'like' ? rowVal.includes(searchVal) : rowVal === searchVal);
        }
        
        return matches;
      });
      
      searchResults = filteredResults;
      renderTable(searchResults);
      selectedRowIdx = null;
      selectBtn.disabled = true;
      
      if (filteredResults.length === 0) {
        log('No branches found matching criteria');
      } else {
        log('Found ' + filteredResults.length + ' branch(es)');
      }
    });

    // Open modal button handler
    swiftBranchIdSearchBtn.addEventListener('click', () => {
      log('Opening Swift Branch ID Search Modal...');
      // Clear search form
      document.getElementById('swiftBranchIdFilterId').value = '';
      document.getElementById('swiftBranchIdFilterName').value = '';
      document.getElementById('swiftBranchIdFilterType').value = 'like';
      
      // Load all sample branches on open
      searchResults = sampleBranches;
      renderTable(searchResults);
      selectedRowIdx = null;
      selectBtn.disabled = true;
      
      modal?.show();
    });
  }

  // Wire up Account ID search button
  const accountSearchBtn = document.querySelector('button[aria-label="Lookup Account"]');
  if (accountSearchBtn) {
    const modalEl = document.getElementById('accountSearchModal');
    const modal = modalEl ? new bootstrap.Modal(modalEl) : null;
    const tableBody = document.querySelector('#accountSearchTable tbody');
    const selectBtn = document.getElementById('accountSearchSelectBtn');
    const searchDoBtn = document.getElementById('accountSearchDoBtn');
    
    // Minimize/Maximize button handlers
    const minimizeBtn = document.getElementById('accountSearchModalMinimizeBtn');
    const maximizeBtn = document.getElementById('accountSearchModalMaximizeBtn');
    const modalBody = document.getElementById('accountSearchModalBody');
    let isMinimized = false;
    let isMaximized = false;

    minimizeBtn?.addEventListener('click', () => {
      if (modalBody) {
        isMinimized = !isMinimized;
        if (isMinimized) {
          modalBody.style.display = 'none';
          modalEl.querySelector('.modal-footer').style.display = 'none';
        } else {
          modalBody.style.display = 'block';
          modalEl.querySelector('.modal-footer').style.display = 'flex';
        }
      }
    });

    maximizeBtn?.addEventListener('click', () => {
      if (modalEl) {
        const modalDialog = modalEl.querySelector('.modal-dialog');
        isMaximized = !isMaximized;
        if (isMaximized) {
          modalDialog.classList.remove('modal-lg', 'modal-dialog-centered');
          modalDialog.style.maxWidth = '95vw';
          modalDialog.style.width = '95vw';
          modalDialog.style.height = '95vh';
          modalDialog.querySelector('.modal-content').style.height = '100%';
          maximizeBtn.innerHTML = '<i class="bi bi-fullscreen-exit" style="font-size: 0.75rem;"></i>';
        } else {
          modalDialog.classList.add('modal-lg', 'modal-dialog-centered');
          modalDialog.style.maxWidth = '';
          modalDialog.style.width = '';
          modalDialog.style.height = '';
          modalDialog.querySelector('.modal-content').style.height = '';
          maximizeBtn.innerHTML = '<i class="bi bi-square" style="font-size: 0.75rem;"></i>';
        }
      }
    });

    // Reset minimize/maximize state when modal is closed
    modalEl?.addEventListener('hidden.bs.modal', () => {
      if (isMinimized) {
        modalBody.style.display = 'block';
        modalEl.querySelector('.modal-footer').style.display = 'flex';
        isMinimized = false;
      }
      if (isMaximized) {
        const modalDialog = modalEl.querySelector('.modal-dialog');
        modalDialog.classList.add('modal-lg', 'modal-dialog-centered');
        modalDialog.style.maxWidth = '';
        modalDialog.style.width = '';
        modalDialog.style.height = '';
        modalDialog.querySelector('.modal-content').style.height = '';
        maximizeBtn.innerHTML = '<i class="bi bi-square" style="font-size: 0.75rem;"></i>';
        isMaximized = false;
      }
    });

    let searchResults = [];
    let selectedRowIdx = null;

    function renderTable(data) {
      tableBody.innerHTML = '';
      data.forEach((row, idx) => {
        const tr = document.createElement('tr');
        tr.tabIndex = 0;
        tr.style.cursor = 'pointer';
        tr.innerHTML = `
          <td style="padding: 0.4rem 0.5rem;">${row.AccountID || ''}</td>
          <td style="padding: 0.4rem 0.5rem;">${row.Description || ''}</td>
          <td style="padding: 0.4rem 0.5rem;">${row.CurrencyID || ''}</td>
          <td style="padding: 0.4rem 0.5rem;">${row.GLAccountT || row.GLAccount || ''}</td>
        `;
        tr.addEventListener('click', () => selectRow(idx));
        tr.addEventListener('dblclick', () => {
          selectRow(idx);
          if (selectBtn && !selectBtn.disabled) {
            selectBtn.click();
          }
        });
        tr.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            selectRow(idx);
            if (selectBtn && !selectBtn.disabled) {
              selectBtn.click();
            }
          }
        });
        // Zebra striping
        if (idx % 2 === 0) {
          tr.style.backgroundColor = '#f9f9f9';
        }
        tableBody.appendChild(tr);
      });
    }

    function selectRow(idx) {
      Array.from(tableBody.children).forEach((tr, i) => {
        if (i === idx) {
          tr.classList.add('table-primary');
          tr.style.backgroundColor = '#b8daff';
        } else {
          tr.classList.remove('table-primary');
          tr.style.backgroundColor = i % 2 === 0 ? '#f9f9f9' : 'white';
        }
      });
      selectedRowIdx = idx;
      selectBtn.disabled = false;
    }

    selectBtn?.addEventListener('click', () => {
      if (selectedRowIdx == null) return;
      const row = searchResults[selectedRowIdx];
      byId('accountId').value = row.AccountID || '';
      
      // Populate Behind The Scene fields
      byId('currencyId').value = row.CurrencyID || '';
      byId('createdBy').value = row.CreatedBy || '';
      byId('createdOn').value = row.CreatedOn || '';
      byId('supervisedBy').value = row.SupervisedBy || '';
      byId('supervisedOn').value = row.SupervisedOn || '';
      
      // Ensure modal is properly hidden
      if (modal) {
        modal.hide();
      }
      
      // Force remove any lingering backdrops
      setTimeout(() => {
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      }, 100);
    });

    // Search button handler
    searchDoBtn?.addEventListener('click', async () => {
      log('Searching Account ID...');
      
      // Get search criteria from form
      const accountIdValue = document.getElementById('accountIdSearchInput')?.value.trim() || '';
      const accountIdType = document.getElementById('accountIdSearchType')?.value || 'like';
      const descriptionValue = document.getElementById('descriptionSearchInput')?.value.trim() || '';
      const descriptionType = document.getElementById('descriptionSearchType')?.value || 'like';
      const currencyIdValue = document.getElementById('currencyIdSearchInput')?.value.trim() || '';
      const currencyIdType = document.getElementById('currencyIdSearchType')?.value || 'like';
      const accountTypeValue = document.getElementById('accountTypeSearchInput')?.value.trim() || '';
      const accountTypeType = document.getElementById('accountTypeSearchType')?.value || 'like';
      
      // Try to fetch from API first
      let dataFromAPI = [];
      if (window.GeneralLedgerService && window.CoreApi) {
        try {
          const OperatorID = localStorage.getItem('OperatorID') || 'SYS';
          const BranchID = byId('branchId')?.value || '';
          
          const now = new Date();
          const pad = n => n.toString().padStart(2, '0');
          const reqTime = `${pad(now.getMonth()+1)}/${pad(now.getDate())}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
          const envelope = {
            RequestID: 'dbo.p_GetSearchResult',
            FormId: 'dbo.p_GetSearchResult',
            RequestData: {
              TableID: 'GLCrTrxAllowID',
              AdvFilterString: '',
              WhereStmt: '',
              PrevOrNext: 0,
              RefID: '',
              OperatorID,
              ModuleID: 8056,
              OurBranchID: BranchID,
              SearchKey: accountIdValue,
              LanguageID: 'en'
            },
            RequestTime: reqTime,
            AppName: 'PROJECT_KAIRO',
            Checksum: ''
          };
          
          const baseUrl = (window.Environment.baseUrlGeneralLedger || window.Environment.baseUrlCommon || "http://localhost:5000").replace(/\/+$/, "");
          const result = await window.CoreApi.post(baseUrl + '/api/OldAPI', envelope);
          
          if (result.success && result.data && Array.isArray(result.data) && result.data.length > 0) {
            dataFromAPI = result.data;
            log('Loaded ' + dataFromAPI.length + ' accounts from API');
          }
        } catch (err) {
          log('API error, using sample data:', err);
        }
      }
      
      // Use sample data if API fails or returns no data
      let allData = dataFromAPI.length > 0 ? dataFromAPI : SAMPLE_ACCOUNTS;
      
      // Filter results based on search criteria
      let filteredResults = allData.filter(row => {
        let matches = true;
        
        if (accountIdValue) {
          const rowVal = (row.AccountID || '').toLowerCase();
          const searchVal = accountIdValue.toLowerCase();
          matches = matches && (accountIdType === 'like' ? rowVal.includes(searchVal) : rowVal === searchVal);
        }
        
        if (descriptionValue) {
          const rowVal = (row.Description || '').toLowerCase();
          const searchVal = descriptionValue.toLowerCase();
          matches = matches && (descriptionType === 'like' ? rowVal.includes(searchVal) : rowVal === searchVal);
        }
        
        if (currencyIdValue) {
          const rowVal = (row.CurrencyID || '').toLowerCase();
          const searchVal = currencyIdValue.toLowerCase();
          matches = matches && (currencyIdType === 'like' ? rowVal.includes(searchVal) : rowVal === searchVal);
        }
        
        if (accountTypeValue) {
          const rowVal = (row.GLAccountT || row.GLAccount || '').toLowerCase();
          const searchVal = accountTypeValue.toLowerCase();
          matches = matches && (accountTypeType === 'like' ? rowVal.includes(searchVal) : rowVal === searchVal);
        }
        
        return matches;
      });
      
      searchResults = filteredResults;
      renderTable(searchResults);
      selectedRowIdx = null;
      selectBtn.disabled = true;
      
      if (filteredResults.length === 0) {
        log('No accounts found matching criteria');
      } else {
        log('Found ' + filteredResults.length + ' account(s)');
      }
    });

    accountSearchBtn.addEventListener('click', async () => {
      log('Opening Account Search Modal...');
      // Clear search form
      document.getElementById('accountIdSearchInput').value = '';
      document.getElementById('descriptionSearchInput').value = '';
      document.getElementById('currencyIdSearchInput').value = '';
      document.getElementById('accountTypeSearchInput').value = '';
      
      // Load all data on open
      searchResults = SAMPLE_ACCOUNTS;
      renderTable(searchResults);
      selectedRowIdx = null;
      selectBtn.disabled = true;
      
      modal?.show();
    });
  }

  byId('viewBtn')?.addEventListener('click', async ()=>{
    log('Fetching Nostro Account...');
    if (!window.GeneralLedgerService) {
      log('GeneralLedgerService not loaded');
      alert('Service not loaded. Please refresh the page.');
      return;
    }
    const OperatorID = localStorage.getItem('OperatorID') || 'SYS';
    const OurBranchID = byId('branchId')?.value || '';
    const AccountID = byId('accountId')?.value || '';
    if (!OurBranchID || !AccountID) {
      log('Branch ID and Account ID are required');
      alert('Please enter Branch ID and Account ID to view.');
      return;
    }
    const request = { OurBranchID, AccountID, OperatorID };
    console.log('Request parameters:', request);
    
    try {
      const result = await window.GeneralLedgerService.getNostroAccount(request);
      console.log('Full API Response:', JSON.stringify(result, null, 2));
      log('Nostro Account result:', result);
      
      // Handle multiple possible response structures
      let details = null;
      
      // Check for direct Details array
      if (result && result.Details && Array.isArray(result.Details) && result.Details.length > 0) {
        details = result.Details[0];
        console.log('Found details in result.Details[0]');
      } 
      // Check for data.Details array
      else if (result && result.data && result.data.Details && Array.isArray(result.data.Details) && result.data.Details.length > 0) {
        details = result.data.Details[0];
        console.log('Found details in result.data.Details[0]');
      }
      // Check for data.Details01 array (alternative details structure)
      else if (result && result.data && result.data.Details01 && Array.isArray(result.data.Details01) && result.data.Details01.length > 0) {
        const det01 = result.data.Details01[0];
        // Check if Details01 has actual data (not just audit fields with empty values)
        if (det01.NewData || det01.OperatorID) {
          details = det01;
          console.log('Found details in result.data.Details01[0]');
        }
      }
      // Check for nested data array structure
      else if (result && result.data && Array.isArray(result.data) && result.data.length > 0) {
        if (result.data[0].Details && Array.isArray(result.data[0].Details) && result.data[0].Details.length > 0) {
          details = result.data[0].Details[0];
          console.log('Found details in result.data[0].Details[0]');
        } else {
          details = result.data[0];
          console.log('Found details in result.data[0]');
        }
      }
      // Check if result itself is the data object
      else if (result && result.AccountID) {
        details = result;
        console.log('Found details in result itself');
      }
      
      console.log('Extracted details:', details);
      
      if (details) {
        byId('accountId').value = details.AccountID || '';
        byId('bankId').value = (details.SwiftCodeBankID || details.BankID || '').trim();
        byId('swiftBranchId').value = (details.SwiftCodeBranchID || details.SwiftBranchID || '').trim();
        byId('swiftCode').value = (details.SwiftCode || '').trim();
        byId('cityId').value = (details.CityID || '').trim();
        byId('countryId').value = (details.CountryID || '').trim();
        byId('description').value = (details.Description || '').trim();
        byId('currencyId').value = (details.CurrencyID || '').trim();
        byId('createdBy').value = (details.CreatedBy || '').trim();
        byId('createdOn').value = (details.CreatedOn || '').trim();
        byId('supervisedBy').value = (details.SupervisedBy || '').trim();
        byId('supervisedOn').value = (details.SupervisedOn || '').trim();
        byId('addBtn').disabled = true;
        log('Nostro Account data loaded successfully');
      } else {
        log('No Nostro Account found - details object is null/undefined');
        console.error('Could not extract details from response. Full response:', result);
        console.error('Searched for: Branch ID =', OurBranchID, ', Account ID =', AccountID);
        console.warn('Response indicates success but Details arrays are empty. Please verify:');
        console.warn('1. The Account ID exists in the database');
        console.warn('2. The Account ID is associated with Branch ID', OurBranchID);
        console.warn('3. The stored procedure dbo.p_GetNostroAccount is returning data correctly');
        byId('addBtn').disabled = false;
        alert(`Record not found.\n\nBranch ID: ${OurBranchID}\nAccount ID: ${AccountID}\n\nThe record may not exist in the database or may be associated with a different branch. Click Add to create a new record.`);
      }
    } catch (err) {
      log('Error fetching Nostro Account:', err);
      console.error('API Error:', err);
      alert('Error loading record: ' + (err.message || 'Unknown error'));
    }
  });
  byId('addBtn')?.addEventListener('click', () => {
    // Clear all fields for new entry and enable editing
    [
      'accountId','bankId','swiftBranchId','swiftCode','cityId','countryId','description',
      'currencyId','createdBy','createdOn','supervisedBy','supervisedOn'
    ].forEach(id => {
      const el = byId(id);
      if (el) {
        if (el.tagName === 'SELECT') el.selectedIndex = 0;
        else el.value = '';
        el.removeAttribute('readonly');
        el.disabled = false;
      }
    });
    byId('addBtn').disabled = true;
    byId('saveBtn').disabled = false;
    byId('editBtn').disabled = true;
    log('Ready for new record');
  });

  byId('editBtn')?.addEventListener('click', () => {
    // Enable editing of Nostro Account Details fields
    const editableFields = [
      'accountId','bankId','swiftBranchId','swiftCode','cityId','countryId','description',
      'currencyId','createdBy','createdOn','supervisedBy','supervisedOn'
    ];
    editableFields.forEach(id => {
      const el = byId(id);
      if (el) {
        el.removeAttribute('readonly');
        el.disabled = false;
      }
    });
    byId('saveBtn').disabled = false;
    log('Edit mode: fields are now editable');
  });

  byId('deleteBtn')?.addEventListener('click', () => {
    // Implement delete logic if required
    log('Delete record');
  });

  byId('saveBtn')?.addEventListener('click', async () => {
    log('Save record');
    if (!window.GeneralLedgerService || !window.GeneralLedgerService.getNostroAccount) {
      log('GeneralLedgerService not loaded');
      return;
    }
    // Gather all form data
    const OurBranchID = byId('branchId')?.value || '';
    const AccountID = byId('accountId')?.value || '';
    const BankID = byId('bankId')?.value || '';
    const SwiftBranchID = byId('swiftBranchId')?.value || '';
    const SwiftCode = byId('swiftCode')?.value || '';
    const CityID = byId('cityId')?.value || '';
    const CountryID = byId('countryId')?.value || '';
    const Description = byId('description')?.value || '';
    const CurrencyID = byId('currencyId')?.value || '';
    const CreatedBy = byId('createdBy')?.value || '';
    const CreatedOn = byId('createdOn')?.value || '';
    const SupervisedBy = byId('supervisedBy')?.value || '';
    const SupervisedOn = byId('supervisedOn')?.value || '';
    const OperatorID = localStorage.getItem('OperatorID') || 'SYS';

    // Build DetailRecords XML string as per sample
    const detailXml =
      `<NostroAccount>` +
      `<OurBranchID>${OurBranchID}</OurBranchID>` +
      `<AccountID>${AccountID}</AccountID>` +
      `<SwiftCodeBankID>${BankID}</SwiftCodeBankID>` +
      `<SwiftCodeBranchID>${SwiftBranchID}</SwiftCodeBranchID>` +
      `<SwiftCode>${SwiftCode}</SwiftCode>` +
      `<CityID>${CityID}</CityID>` +
      `<CountryID>${CountryID}</CountryID>` +
      `<Description>${Description}</Description>` +
      `<CurrencyID>${CurrencyID}</CurrencyID>` +
      `<CreatedBy>${CreatedBy}</CreatedBy>` +
      `<CreatedOn>${CreatedOn}</CreatedOn>` +
      `<SupervisedBy>${SupervisedBy}</SupervisedBy>` +
      `<SupervisedOn>${SupervisedOn}</SupervisedOn>` +
      `</NostroAccount>`;

    // Build envelope for dbo.p_AddEditNostroAccount
    const now = new Date();
    const pad = n => n.toString().padStart(2, '0');
    const reqTime = `${pad(now.getMonth()+1)}/${pad(now.getDate())}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const envelope = {
      RequestID: 'dbo.p_AddEditNostroAccount',
      FormId: 'dbo.p_AddEditNostroAccount',
      RequestData: {
        OperatorID,
        DetailRecords: detailXml
      },
      RequestTime: reqTime,
      AppName: 'PROJECT_KAIRO',
      Checksum: ''
    };
    try {
      const baseUrl = (window.Environment.baseUrlGeneralLedger || window.Environment.baseUrlCommon || "http://localhost:5000").replace(/\/+$/, "");
      const result = await window.CoreApi.post(baseUrl + '/api/OldAPI', envelope);
      log('Save result:', result);
      if (result.success) {
        alert('Record saved successfully!');
        
        // Clear all form fields
        [
          'accountId','bankId','swiftBranchId','swiftCode','description',
          'currencyId','createdBy','createdOn','supervisedBy','supervisedOn'
        ].forEach(id => {
          const el = byId(id);
          if (el) el.value = '';
        });
        
        // Reset dropdowns
        const citySelect = byId('cityId');
        const countrySelect = byId('countryId');
        if (citySelect) citySelect.selectedIndex = 0;
        if (countrySelect) countrySelect.selectedIndex = 0;
        
        // Disable save button and enable add/edit buttons
        byId('saveBtn').disabled = true;
        byId('addBtn').disabled = false;
        byId('editBtn').disabled = false;
        
        log('Form cleared after successful save');
      } else {
        alert('Save failed: ' + (result.message || 'Unknown error'));
      }
    } catch (err) {
      log('Save error:', err);
      alert('Save error: ' + err);
    }
  });

  byId('cancelBtn')?.addEventListener('click', ()=>log('Cancel'));
})();
