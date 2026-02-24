(function (global) {
  // DOM Elements
  const searchBtn = document.getElementById('meeting-date-search-btn');
  const loadingEl = document.getElementById('meeting-date-loading');
  const resultsEl = document.getElementById('meeting-date-results');
  const emptyEl = document.getElementById('meeting-date-empty');
  const criteriaEl = document.getElementById('meeting-date-criteria');

  let selectedRow = null;
  let selectedData = null;

  // Get branch ID from URL parameters or parent window
  const urlParams = new URLSearchParams(window.location.search);
  let branchId = urlParams.get('branch') || '';

  // Load dependencies using ServiceLoader
  (async () => {
    const { ServiceLoader } = global;
    if (!ServiceLoader) return;
    try {
      await ServiceLoader.loadCore();
      await ServiceLoader.loadScript('../../../../assets/js/services/shared/lookupService.js');
      init();
    } catch (err) {
      console.error('Error loading services:', err);
    }
  })();

  function init() {
    // Search button click
    if (searchBtn) {
      searchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        executeSearch();
      });
    }

    // Enter key to search
    if (criteriaEl) {
      criteriaEl.querySelectorAll('input').forEach(input => {
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            executeSearch();
          }
        });
      });
    }

    // Load all meeting dates on init
    executeSearch();
  }

  // Normalize date to YYYY-MM-DD format
  function normalizeToYyyyMmDd(value) {
    const s = String(value || '').trim();
    if (!s) return '';
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

    // OldAPI/UIs commonly return: DD-MMM-YYYY (e.g. 12-Jan-2026)
    const dmyTextMatch = s.match(/^(\d{1,2})\s*[-/]\s*([A-Za-z]{3,})\s*[-/]\s*(\d{4})/);
    if (dmyTextMatch) {
      const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const day = dmyTextMatch[1].padStart(2, '0');
      const monthStr = dmyTextMatch[2].toLowerCase().slice(0, 3);
      const year = dmyTextMatch[3];
      const monthIndex = monthNames.indexOf(monthStr);
      if (monthIndex === -1) return '';
      const month = String(monthIndex + 1).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    return '';
  }

  // Format date to DD-MMM-YYYY for display
  function formatToDdMmmYyyy(value) {
    const iso = normalizeToYyyyMmDd(value);
    if (!iso) return value || '';
    const [yyyy, mm, dd] = iso.split('-');
    const monthIndex = Number(mm) - 1;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mon = monthNames[monthIndex] || '';
    if (!yyyy || !dd || !mon) return value || '';
    return `${dd}-${mon}-${yyyy}`;
  }

  async function executeSearch() {
    // Show loading state
    if (loadingEl) loadingEl.style.display = 'block';
    if (resultsEl) resultsEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'none';

    // Get search values from inputs
    const meetingDateInput = criteriaEl?.querySelector('[data-search-field="meetingDate"]');
    const groupNameInput = criteriaEl?.querySelector('[data-search-field="groupName"]');
    const meetingDateMode = criteriaEl?.querySelector('[data-search-mode="meetingDate"]');
    const groupNameMode = criteriaEl?.querySelector('[data-search-mode="groupName"]');

    const searchMeetingDate = meetingDateInput?.value.trim() || '';
    const searchGroupName = groupNameInput?.value.trim() || '';
    const meetingDateOp = meetingDateMode?.value || 'Like';
    const groupNameOp = groupNameMode?.value || 'Like';

    // Build WhereStmt based on search conditions
    const conditions = [];
    if (searchMeetingDate) {
      const normalized = normalizeToYyyyMmDd(searchMeetingDate);
      if (normalized) {
        conditions.push(`NextMeetingDate='${normalized}'`);
      }
    }
    if (searchGroupName) {
      if (groupNameOp === 'Exact') {
        conditions.push(`GroupName='${searchGroupName}'`);
      } else {
        conditions.push(`GroupName LIKE '%${searchGroupName}%'`);
      }
    }
    const whereStmt = conditions.length > 0 ? conditions.join(' AND ') : '';

    // Get branch ID from parent window if not provided in URL
    let currentBranchId = branchId;
    if (!currentBranchId) {
      try {
        const parentDoc = window.parent.document;
        currentBranchId = parentDoc.getElementById('branchId')?.value 
                || parentDoc.getElementById('BranchId')?.value 
                || parentDoc.getElementById('OurBranchID')?.value
                || '0603';
      } catch (e) {
        currentBranchId = '0603';
      }
    }

    const payload = {
      TableID: 'GroupNextMeeting',
      WhereStmt: whereStmt,
      RefID: null,
      PrevOrNext: 0,
      AdvFilterString: `OurBranchID='${currentBranchId}' AND GroupStatusID='A'`,
      OperatorID: 'CSADM',
      ModuleID: 5080,
      OurBranchID: currentBranchId,
      SearchKey: null,
      LanguageID: 'en'
    };

    try {
      const result = await global.LookupService.getSearchResult(payload);

      if (loadingEl) loadingEl.style.display = 'none';

      if (result.success) {
        // Extract data from response - check multiple possible locations
        let meetings = [];
        if (result.data && result.data.Details) {
          meetings = result.data.Details;
        } else if (result.Details) {
          meetings = result.Details;
        } else if (Array.isArray(result.data)) {
          meetings = result.data;
        }
        renderResults(meetings);
      } else {
        if (emptyEl) {
          emptyEl.textContent = result.message || 'Search failed';
          emptyEl.style.display = 'block';
        }
      }
    } catch (err) {
      console.error('Meeting Date Search Error:', err);
      if (loadingEl) loadingEl.style.display = 'none';
      if (emptyEl) {
        emptyEl.textContent = 'Error occurred during search';
        emptyEl.style.display = 'block';
      }
    }
  }

  function renderResults(data) {
    const rows = Array.isArray(data) ? data : [];

    if (rows.length === 0) {
      if (emptyEl) emptyEl.style.display = 'block';
      if (resultsEl) resultsEl.style.display = 'none';
      return;
    }

    // Build table HTML
    let html = `
      <table class="results-table">
        <thead>
          <tr>
            <th>Center ID</th>
            <th>Center Name</th>
            <th>Meeting Date</th>
            <th>Meeting Time</th>
          </tr>
        </thead>
        <tbody>
    `;

    rows.forEach((row, idx) => {
      const jsonData = JSON.stringify(row).replace(/"/g, '&quot;');
      const displayDate = formatToDdMmmYyyy(row.NextMeetingDate);
      html += `
        <tr data-row="${jsonData}" data-idx="${idx}">
          <td>${row.GroupID || ''}</td>
          <td>${row.GroupName || ''}</td>
          <td>${displayDate}</td>
          <td>${row.MeetingTime || row.NextMeetingTime || ''}</td>
        </tr>
      `;
    });

    html += '</tbody></table>';

    if (resultsEl) {
      resultsEl.innerHTML = html;
      resultsEl.style.display = 'block';

      // Attach row click handlers
      resultsEl.querySelectorAll('tbody tr').forEach(tr => {
        tr.addEventListener('click', () => selectResult(tr));
        tr.addEventListener('dblclick', () => {
          selectResult(tr);
          setSelected();
        });
      });
    }
  }

  function selectResult(tr) {
    if (selectedRow) selectedRow.classList.remove('selected');
    selectedRow = tr;
    selectedRow.classList.add('selected');
    selectedData = JSON.parse(tr.dataset.row);
  }

  function setSelected() {
    if (!selectedData) return;

    const displayDate = formatToDdMmmYyyy(selectedData.NextMeetingDate);

    // Send message to parent - only pass meeting date
    window.parent.postMessage({
      type: 'MEETING_DATE_SELECTED',
      meetingDate: displayDate,
      meetingDateRaw: selectedData.NextMeetingDate || '',
      meetingTime: selectedData.MeetingTime || selectedData.NextMeetingTime || ''
    }, '*');

    // Close the modal
    close();
  }

  function close() {
    try {
      // Try to close the Bootstrap modal in the parent
      const parentModal = window.parent.document.getElementById('searchModal');
      if (parentModal) {
        const bsModal = window.parent.bootstrap?.Modal?.getInstance(parentModal);
        if (bsModal) {
          bsModal.hide();
          return;
        }
        // Fallback: click close button
        const closeBtn = parentModal.querySelector('[data-bs-dismiss="modal"]');
        if (closeBtn) {
          closeBtn.click();
          return;
        }
      }
    } catch (e) {
      console.warn('Could not close parent modal:', e);
    }
    // Fallback to postMessage
    window.parent?.postMessage?.({ type: 'kairo-dataentry-close' }, '*');
  }

})(window);
