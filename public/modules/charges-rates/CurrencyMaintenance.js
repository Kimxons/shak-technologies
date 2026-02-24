(async () => {
  const root = document;
  const { ServiceLoader } = window;

  // Load Services
  try {
    if (ServiceLoader) {
      await ServiceLoader.loadCore();
      await ServiceLoader.loadChargesRatesService();
      await ServiceLoader.loadSearchService();
      // await ServiceLoader.loadLookupService(); // Uncomment if needed
    } else {
      console.warn("ServiceLoader not found. Ensure it is included in the HTML.");
    }
  } catch (error) {
    console.error("Failed to load services:", error);
  }

  const navButtons = Array.from(root.querySelectorAll('[data-nav-target]'));
  const screens = Array.from(root.querySelectorAll('[data-screen]'));
  const actionGroups = Array.from(root.querySelectorAll('[data-actions-screen]'));

  const setActiveNav = (target) => {
    navButtons.forEach((btn) => {
      const isActive = btn.getAttribute('data-nav-target') === target;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-current', isActive ? 'page' : 'false');
    });
  };

  const setVisibleScreen = (target) => {
    screens.forEach((el) => {
      const isTarget = el.getAttribute('data-screen') === target;
      el.classList.toggle('is-hidden', !isTarget);
    });

    actionGroups.forEach((group) => {
      const isTarget = group.getAttribute('data-actions-screen') === target;
      group.classList.toggle('is-hidden', !isTarget);
    });
  };

  const showScreen = (target) => {
    setActiveNav(target);
    setVisibleScreen(target);
  };

  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-nav-target');
      if (!target) return;

      if (target === 'denomination') {
        // window.location.href = 'DenominationMaintenance.html';
        // Switching to denomination tab instead of redirecting, if that was the intent.
        // But the previous code redirected. I will keep the redirect if that's what was there, 
        // OR simpler: just show the screen if it exists in this file (which it does, data-screen="denomination").
        // The HTML has a form with data-screen="denomination".
        // The previous code had specific logic to redirect. 
        // "window.location.href = 'DenominationMaintenance.html';"
        // However, there is a Denomination section in THIS HTML file too.
        // Let's stick to the previous logic: if it redirects, it redirects. 
        // But wait, the user wants "Currency Maintenance".
        // If I click Denomination, and it goes to another page, I can't fetch data THERE from HERE.
        // Let's comment out the redirect for now to allow viewing the tab content within this page
        // if the intention was to have a single page app.
        // But looking at the file list, `DenominationMaintenance.html` exists.
        // I will preserve the redirect logic for now to be safe, unless the user asked to fix it.
        // The user asked to fetch data on "Currency Maintenance".

        window.location.href = 'DenominationMaintenance.html';
        return;
      }
      showScreen(target);
    });
  });

  root.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    const actionEl = target.closest('[data-action]');
    if (!actionEl) return;

    const action = actionEl.getAttribute('data-action');
    if (action === 'print') {
      window.print();
      return;
    }

    if (action === 'back') {
      showScreen('view');
    }
  });

  // --- Data Fetching Logic ---

  const getSession = () => {
    try {
      const sessionStr = localStorage.getItem('nimble_auth_session');
      return sessionStr ? JSON.parse(sessionStr) : null;
    } catch (e) {
      console.warn("Error reading session:", e);
      return null;
    }
  };

  const populateForm = (data) => {
    if (!data) return;
    console.log("Populating form with:", data);

    const formElements = Array.from(root.querySelectorAll('input, select, textarea'));

    Object.entries(data).forEach(([key, value]) => {
      // 1. Try exact ID match
      let field = root.getElementById(key);

      // 2. If not found, try case-insensitive match against ID
      // This helps if DB column is "DESCRIPTION" but input id "Description"
      if (!field) {
        const lowerKey = key.toLowerCase();
        field = formElements.find(el => el.id && el.id.toLowerCase() === lowerKey);
      }

      if (field) {
        console.log(`Setting field ${field.id} (found for key ${key}) to:`, value);
        if (field.type === 'checkbox') {
          // Handle various truthy values
          const isChecked = value === true || value === 1 || value === 'true' || value === '1';
          field.checked = isChecked;
        } else {
          // Handle null/undefined explicitly to avoid "null" string
          field.value = (value === null || value === undefined) ? '' : value;
        }
      } else {
        console.warn(`No field found for key: ${key}`);
      }
    });
  };

  // Modified to accept direction override
  const fetchCurrencyData = async (currencyId, directionOverride = 0) => {
    const { ChargesRatesService } = window;
    if (!ChargesRatesService) {
      console.error("ChargesRatesService not loaded");
      return;
    }

    // Get context from session
    const session = getSession();

    if (!session) {
      console.error("No active session found.");
      // alert("Please log in to continue."); 
      return;
    }

    const OurBranchID = session.branchID || session.OurBranchID;
    const OperatorID = session.operatorID || session.OperatorID;

    if (!OurBranchID || !OperatorID) {
      console.error("Missing BranchID or OperatorID in session.");
      return;
    }

    // Use override if provided, otherwise default to 0 (exact match)
    const Direction = directionOverride;

    const requestPayload = {
      OurBranchID: OurBranchID,
      CurrencyID: currencyId ? currencyId.trim() : '', // Handle empty for pure next/prev
      OperatorID: OperatorID,
      Direction: Direction
    };

    console.log("Fetching currency data:", requestPayload);

    try {
      const result = await ChargesRatesService.getCurrencyMaintenanceData(requestPayload);
      console.log("Fetch result:", result);

      if (result.success) {
        let record = null;

        // Helper to find the right record in potential multiple result sets
        const findRelevantRecord = (dataObj) => {
          if (!dataObj) return null;

          // If it's a direct array
          if (Array.isArray(dataObj)) {
            if (dataObj.length > 0 && (dataObj[0].Description !== undefined || dataObj[0].ISOCurrencyCode !== undefined)) {
              return dataObj[0];
            }
          }

          // Iterate over keys like Details, Details01, Details02 to find the data
          const potentialArrays = Object.values(dataObj).filter(val => Array.isArray(val) && val.length > 0);

          for (const arr of potentialArrays) {
            const candidate = arr[0];
            // Check for signature fields of Currency table
            if (candidate && (candidate.Description !== undefined || candidate.ISOCurrencyCode !== undefined || candidate.CurrencyID !== undefined)) {
              // Validate it's not the supervision record (which might have OperatorID/EventID but not Description)
              if (candidate.EventID !== undefined && candidate.Description === undefined) {
                continue; // This is metadata
              }
              return candidate;
            }
          }

          // Fallback: Just take the first array's first item if nothing matched signature
          if (potentialArrays.length > 0) return potentialArrays[0][0];

          return dataObj; // Last resort
        };

        record = findRelevantRecord(result.data);

        if (record && Object.keys(record).length > 0) {
          console.log("Record to populate:", record);
          populateForm(record);
          setFormState('LOADED');
        } else {
          // Only warn if we were looking for an exact match (Direction 0)
          if (Direction === 0) {
            console.warn("No data returned for currency ID:", currencyId);
            alert(`No details found for CurrencyID: ${currencyId}. You can add a new record.`);
            setFormState('NOT_FOUND');
          } else {
            console.log("No next/prev record found.");
            alert("No further records in that direction.");
          }
        }
      } else {
        console.error("Failed to fetch data:", result.message);
        alert(`Error: ${result.message}`);
      }
    } catch (e) {
      console.error("Error fetching currency data", e);
      alert("An error occurred while fetching data.");
    }
  };

  // Search Results Display Logic
  let searchModalInstance = null;
  const showSearchResults = (data) => {
    const tableBody = root.querySelector('#searchResultsTable tbody');
    if (!tableBody) return;

    tableBody.innerHTML = ''; // Clear previous results

    data.forEach(item => {
      const row = root.createElement('tr');
      row.style.cursor = 'pointer';
      row.innerHTML = `
              <td>${item.CurrencyID || ''}</td>
              <td>${item.Description || ''}</td>
          `;

      row.addEventListener('click', () => {
        if (item.CurrencyID) {
          const currencyIdInput = root.getElementById('CurrencyID');
          if (currencyIdInput) {
            currencyIdInput.value = item.CurrencyID;
            // Trigger fetch for details
            fetchCurrencyData(item.CurrencyID);
          }
          // Close modal
          const modalEl = root.getElementById('searchResultModal');
          const instance = bootstrap.Modal.getInstance(modalEl);
          if (instance) {
            instance.hide();
          } else if (searchModalInstance) {
            searchModalInstance.hide();
          }
        }
      });

      tableBody.appendChild(row);
    });

    // Show modal
    const modalEl = root.getElementById('searchResultModal');
    if (modalEl) {
      // Try to get existing instance from DOM
      searchModalInstance = bootstrap.Modal.getInstance(modalEl);
      if (!searchModalInstance) {
        searchModalInstance = new bootstrap.Modal(modalEl);
      }
      searchModalInstance.show();
    }
  };

  const performSearch = async () => {
    const { SearchService } = window;
    if (!SearchService) {
      console.error("SearchService not loaded");
      return;
    }

    // Get context from session
    const session = getSession();

    if (!session) {
      console.error("No active session found.");
      alert("Please log in to continue.");
      return;
    }

    const OurBranchID = session.branchID || session.OurBranchID;
    const OperatorID = session.operatorID || session.OperatorID;

    if (!OurBranchID || !OperatorID) {
      console.error("Missing BranchID or OperatorID in session.");
      alert("Session data is incomplete. Please re-login.");
      return;
    }

    const searchPayload = {
      TableID: "MastCurrencyID",
      AdvFilterString: "",
      WhereStmt: "",
      PrevOrNext: 0,
      RefID: null,
      OperatorID: OperatorID,
      ModuleID: 2100, // This might also need to be dynamic but usually fixed per module
      OurBranchID: OurBranchID,
      SearchKey: null,
      LanguageID: "en"
    };

    try {
      const result = await SearchService.search(searchPayload);
      if (result.success) {
        // Expecting result.data to be structure { Details: [...] } or just [...]
        // User snippet shows: { "Details": [...], "Details01": [] }
        const records = result.data.Details || (Array.isArray(result.data) ? result.data : []);

        if (records.length > 0) {
          showSearchResults(records);
        } else {
          alert("No records found.");
        }
      } else {
        console.error("Search failed:", result.message);
        alert(`Search failed: ${result.message}`);
      }
    } catch (e) {
      console.error("Error performing search:", e);
      alert("An error occurred during search.");
    }
  };

  // Bind Search Button
  const searchBtn = root.querySelector('button[aria-label="Search currency"]');
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      performSearch();
    });
  }

  // Allow Enter key in CurrencyID field to trigger search
  const currencyIdInput = root.getElementById('CurrencyID');
  if (currencyIdInput) {
    currencyIdInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        fetchCurrencyData(currencyIdInput.value);
      }
    });

    // Handle "View" button in the sidebar actions
    const actionsSidebar = root.querySelector('.cm-legacy-actions');
    if (actionsSidebar) {
      const viewBtn = Array.from(actionsSidebar.querySelectorAll('button')).find(btn => btn.textContent.trim() === 'View');
      if (viewBtn) {
        viewBtn.addEventListener('click', () => {
          const id = currencyIdInput.value;
          if (id) {
            fetchCurrencyData(id, 0);
          } else {
            alert('Please enter a Currency ID.');
          }
        });
      }

      // Handle Previous
      const prevBtn = actionsSidebar.querySelector('button[aria-label="Previous"]');
      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          const id = currencyIdInput.value;
          // Fetch previous record relative to current ID
          fetchCurrencyData(id, -1);
        });
      }

      // Handle Next
      const nextBtn = actionsSidebar.querySelector('button[aria-label="Next"]');
      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          const id = currencyIdInput.value;
          // Fetch next record relative to current ID
          fetchCurrencyData(id, 1);
        });
      }
    }
  }

  // Action Buttons References
  const getActionButtons = () => {
    const sidebar = root.querySelector('.cm-legacy-actions');
    if (!sidebar) return {};
    const buttons = Array.from(sidebar.querySelectorAll('button'));
    return {
      view: buttons.find(b => b.textContent.trim() === 'View'),
      add: buttons.find(b => b.textContent.trim() === 'Add'),
      edit: buttons.find(b => b.textContent.trim() === 'Edit'),
      delete: buttons.find(b => b.textContent.trim() === 'Delete'),
      save: buttons.find(b => b.textContent.trim() === 'Save'),
      cancel: buttons.find(b => b.textContent.trim() === 'Cancel')
    };
  };

  const setFormState = (state) => {
    const btns = getActionButtons();

    // Helper to enable/disable
    const set = (btn, enabled) => {
      if (btn) {
        btn.disabled = !enabled;
      }
    };

    // Helper to set primary color (accepts array of buttons)
    const updatePrimaryButtons = (targets) => {
      // Reset all first
      Object.values(btns).forEach(b => {
        if (b) b.classList.remove('cm-btn-primary');
      });
      // Set new ones
      targets.forEach(t => {
        if (t) t.classList.add('cm-btn-primary');
      });
    };

    if (state === 'IDLE') {
      set(btns.view, true);
      set(btns.add, false);
      set(btns.edit, false);
      set(btns.delete, false);
      set(btns.save, false);
      set(btns.cancel, false);

      updatePrimaryButtons([btns.view]);
    } else if (state === 'LOADED') {
      set(btns.view, true);
      set(btns.add, false);
      set(btns.edit, true);
      set(btns.delete, true);
      set(btns.save, false);
      set(btns.cancel, true);

      // User requested Edit, Delete, Cancel to be blue
      updatePrimaryButtons([btns.edit, btns.delete, btns.cancel]);
    } else if (state === 'NOT_FOUND') {
      // Record not found -> Enable Add
      set(btns.view, true);
      set(btns.add, true);
      set(btns.edit, false);
      set(btns.delete, false);
      set(btns.save, false);
      set(btns.cancel, true);

      updatePrimaryButtons([btns.add, btns.cancel]);
    }
  };

  // Cancel Handler
  const bindActionButtons = () => {
    const btns = getActionButtons();
    if (btns.cancel) {
      btns.cancel.addEventListener('click', () => {
        // Clear form
        const form = root.querySelector('form[data-screen="view"]');
        if (form) form.reset();
        const currencyIdInput = root.getElementById('CurrencyID');
        if (currencyIdInput) currencyIdInput.value = '';

        setFormState('IDLE');
      });
    }
  };

  // Bind Cancel button
  bindActionButtons();

  // Initial State
  setFormState('IDLE');

  // Default Screen
  showScreen('view');
})();

