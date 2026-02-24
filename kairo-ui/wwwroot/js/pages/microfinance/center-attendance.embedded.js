/**
 * Center Attendance Module
 * Handles center attendance recording and management
 */
(function () {
  const CenterAttendance = {
    // Form elements
    form: null,
    centerIdInput: null,
    centerNameInput: null,
    meetingDateInput: null,
    officerIdInput: null,
    officerNameInput: null,
    meetingPlaceInput: null,
    remarksInput: null,
    tableBody: null,
    
    // State
    currentMode: 'view', // 'view', 'edit', 'create'
    attendanceData: [],

    // Lookup state (CenterID -> TableID: GroupID)
    _lookupModalInstance: null,
    _lookupActiveType: null,
    _lookupServicesReady: false,
    _lookupServicesPromise: null,

    // Lookup element IDs (scoped to Center Attendance)
    _LOOKUP_MODAL_ID: 'caLookupModal',
    _LOOKUP_MODAL_LABEL_ID: 'caLookupModalLabel',
    _LOOKUP_SEARCH_INPUT_ID: 'caLookupSearchInput',
    _LOOKUP_SEARCH_BTN_ID: 'caLookupSearchBtn',
    _LOOKUP_CLEAR_BTN_ID: 'caLookupClearBtn',
    _LOOKUP_RESULTS_HEADER_ID: 'caLookupResultsHeader',
    _LOOKUP_RESULTS_BODY_ID: 'caLookupResultsBody',
    _LOOKUP_RESULTS_META_ID: 'caLookupResultsMeta',
    _LOOKUP_SIMPLE_CONTAINER_ID: 'caLookupSimpleSearch',
    _LOOKUP_ADVANCED_CONTAINER_ID: 'caLookupAdvancedSearch',
    _LOOKUP_ADVANCED_FORM_ID: 'caLookupAdvancedForm',
    _LOOKUP_ADVANCED_SEARCH_BTN_ID: 'caLookupAdvancedSearchBtn',
    _LOOKUP_ADVANCED_CLEAR_BTN_ID: 'caLookupAdvancedClearBtn',
    
    init() {
      console.log('[CenterAttendance] Initializing...');
      
      this.form = document.getElementById('center-attendance-form');
      if (!this.form) {
        console.error('[CenterAttendance] Form not found');
        return;
      }
      
      // Cache form elements
      this.centerIdInput = document.getElementById('CenterId');
      this.centerNameInput = document.getElementById('CenterName');
      this.meetingDateInput = document.getElementById('MeetingDate');
      this.officerIdInput = document.getElementById('OfficerId');
      this.officerNameInput = document.getElementById('OfficerName');
      this.meetingPlaceInput = document.getElementById('MeetingPlace');
      this.remarksInput = document.getElementById('Remarks');
      this.tableBody = document.querySelector('.data-table tbody');
      
      // Initialize event handlers
      this.initLookupButtons();
      this.initActionButtons();
      
      // Set initial state
      this.setFieldsReadonly();
      
      console.log('[CenterAttendance] Initialized successfully');
    },
    
    initLookupButtons() {
      // Delegated handler so it works even if lookup buttons are outside the form
      // or injected later (common for embedded/iframe layouts).
      if (this.form) {
        this.form.querySelectorAll('[data-ca-lookup]').forEach((btn) => {
          btn.addEventListener('click', (e) => e.preventDefault());
        });
      }

      if (document.body?.dataset?.caLookupWired === 'true') return;
      if (document.body) document.body.dataset.caLookupWired = 'true';

      document.addEventListener(
        'click',
        (e) => {
          const target = e.target instanceof Element ? e.target : e.target?.parentElement;
          if (!target) return;
          const btn = target.closest('[data-ca-lookup]');
          if (!btn) return;

          e.preventDefault();
          e.stopPropagation();

          const which = btn.getAttribute('data-ca-lookup');
          console.log('[CenterAttendance] Lookup clicked:', which);

          switch (which) {
            case 'center':
              this.handleCenterLookup();
              break;
            case 'meeting-date':
              this.handleMeetingDateLookup();
              break;
            case 'officer':
              this.handleOfficerLookup();
              break;
            default:
              alert('Lookup (' + which + ') not yet implemented');
          }
        },
        true
      );
    },

    // ───────────────────────────────────────────────────────────────────────
    // Lookup modal (CenterID search) - patterned after Center Member Maintenance
    // ───────────────────────────────────────────────────────────────────────
    _getLookupHost() {
      // In embedded screens, Bootstrap is often loaded on the parent window.
      // Host the modal in the window that actually has bootstrap.
      const parent = window.parent && window.parent !== window ? window.parent : null;
      const grandParent = parent?.parent && parent.parent !== parent ? parent.parent : null;

      const pickBootstrap = (win) => {
        const bs = win?.bootstrapLib || win?.bootstrap;
        return bs?.Modal ? bs : null;
      };

      const parentBs = pickBootstrap(parent);
      const grandParentBs = pickBootstrap(grandParent);
      const selfBs = pickBootstrap(window);

      const hostWin = parentBs ? parent : grandParentBs ? grandParent : window;
      const hostDoc = hostWin.document;
      const hostBootstrap = parentBs || grandParentBs || selfBs;

      return { hostWin, hostDoc, hostBootstrap };
    },

    _getOperatorId() {
      const env = window.Environment || {};
      const session = window.getAuthSession?.() || {};
      return String(
        window.AuthService?.getOperatorId?.() ||
          env.operatorId ||
          session.operatorId ||
          session.name ||
          '001'
      ).trim();
    },

    _getBranchId() {
      const env = window.Environment || {};
      const session = window.getAuthSession?.() || {};
      return String(window.AuthService?.getBranchId?.() || env.OurBranchID || session.branchId || '').trim();
    },

    async _ensureLookupServicesLoaded() {
      if (this._lookupServicesReady) return;
      if (this._lookupServicesPromise) return this._lookupServicesPromise;

      this._lookupServicesPromise = (async () => {
        const loader = window.ServiceLoader;
        // Best effort: some pages preload services; only load if loader exists.
        if (loader?.loadCore) {
          await loader.loadCore();
        }

        if (!window.SearchService && loader?.loadScript) {
          await loader.loadScript('/assets/js/services/shared/searchService.js');
        }

        if (!window.GroupMemberMaintenanceService && loader?.loadScript) {
          await loader.loadScript('/assets/js/services/microfinance/groupMemberMaintenanceService.js');
        }

        this._lookupServicesReady = true;
      })();

      return this._lookupServicesPromise;
    },

    _ensureLookupModal() {
      const { hostDoc, hostBootstrap } = this._getLookupHost();
      const {
        _LOOKUP_MODAL_ID: LOOKUP_MODAL_ID,
        _LOOKUP_MODAL_LABEL_ID: LOOKUP_MODAL_LABEL_ID,
        _LOOKUP_SEARCH_INPUT_ID: LOOKUP_SEARCH_INPUT_ID,
        _LOOKUP_SEARCH_BTN_ID: LOOKUP_SEARCH_BTN_ID,
        _LOOKUP_CLEAR_BTN_ID: LOOKUP_CLEAR_BTN_ID,
        _LOOKUP_RESULTS_HEADER_ID: LOOKUP_RESULTS_HEADER_ID,
        _LOOKUP_RESULTS_BODY_ID: LOOKUP_RESULTS_BODY_ID,
        _LOOKUP_RESULTS_META_ID: LOOKUP_RESULTS_META_ID,
        _LOOKUP_SIMPLE_CONTAINER_ID: LOOKUP_SIMPLE_CONTAINER_ID,
        _LOOKUP_ADVANCED_CONTAINER_ID: LOOKUP_ADVANCED_CONTAINER_ID,
        _LOOKUP_ADVANCED_FORM_ID: LOOKUP_ADVANCED_FORM_ID,
        _LOOKUP_ADVANCED_SEARCH_BTN_ID: LOOKUP_ADVANCED_SEARCH_BTN_ID,
        _LOOKUP_ADVANCED_CLEAR_BTN_ID: LOOKUP_ADVANCED_CLEAR_BTN_ID
      } = this;

      let modalEl = hostDoc.getElementById(LOOKUP_MODAL_ID);
      if (!modalEl) {
        modalEl = hostDoc.createElement('div');
        modalEl.className = 'modal fade';
        modalEl.id = LOOKUP_MODAL_ID;
        modalEl.tabIndex = -1;
        modalEl.setAttribute('aria-labelledby', LOOKUP_MODAL_LABEL_ID);
        modalEl.setAttribute('aria-hidden', 'true');

        // Match the modal layout used in center-member-maintenance.
        modalEl.innerHTML = `
          <div class="modal-dialog modal-dialog-centered modal-xl">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title" id="${LOOKUP_MODAL_LABEL_ID}">Lookup</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                <div class="row g-2 align-items-end" id="${LOOKUP_SIMPLE_CONTAINER_ID}">
                  <div class="col-12 col-lg-8">
                    <label for="${LOOKUP_SEARCH_INPUT_ID}" class="form-label mb-1">Search</label>
                    <input type="text" class="form-control" id="${LOOKUP_SEARCH_INPUT_ID}" placeholder="Type to search..." />
                  </div>
                  <div class="col-12 col-lg-4 d-flex gap-2">
                    <button type="button" class="btn btn-primary flex-fill" id="${LOOKUP_SEARCH_BTN_ID}">Search</button>
                    <button type="button" class="btn btn-outline-secondary" id="${LOOKUP_CLEAR_BTN_ID}">Clear</button>
                  </div>
                </div>

                <div class="mt-2" id="${LOOKUP_ADVANCED_CONTAINER_ID}">
                  <form class="row g-2 align-items-end" id="${LOOKUP_ADVANCED_FORM_ID}" data-lookup-form>
                    <div class="row g-2 align-items-end" data-lookup-scope="center">
                      <div class="col-12 col-lg-3">
                        <label class="form-label mb-1">Group ID</label>
                        <input class="form-control" data-lookup-field="GroupID" placeholder="GroupID" />
                        <select class="form-select form-select-sm mt-1" data-lookup-mode="GroupID">
                          <option value="Like" selected>Like</option>
                          <option value="Exact">Exact</option>
                        </select>
                      </div>
                      <div class="col-12 col-lg-5">
                        <label class="form-label mb-1">Group Name</label>
                        <input class="form-control" data-lookup-field="GroupName" placeholder="GroupName" />
                        <select class="form-select form-select-sm mt-1" data-lookup-mode="GroupName">
                          <option value="Like" selected>Like</option>
                          <option value="Exact">Exact</option>
                        </select>
                      </div>
                      <div class="col-12 col-lg-4">
                        <label class="form-label mb-1">Next Meeting Date</label>
                        <input class="form-control" data-lookup-field="NextMeetingDate" placeholder="YYYY-MM-DD" />
                        <select class="form-select form-select-sm mt-1" data-lookup-mode="NextMeetingDate">
                          <option value="Like" selected>Like</option>
                          <option value="Exact">Exact</option>
                        </select>
                      </div>
                    </div>

                    <div class="col-12 d-flex gap-2 justify-content-end mt-2">
                      <button type="button" class="btn btn-primary" id="${LOOKUP_ADVANCED_SEARCH_BTN_ID}">Search</button>
                      <button type="button" class="btn btn-outline-secondary" id="${LOOKUP_ADVANCED_CLEAR_BTN_ID}">Clear</button>
                    </div>
                  </form>
                </div>

                <hr class="my-3" />

                <div class="table-responsive">
                  <table class="table table-sm table-hover align-middle">
                    <thead><tr id="${LOOKUP_RESULTS_HEADER_ID}"></tr></thead>
                    <tbody id="${LOOKUP_RESULTS_BODY_ID}"></tbody>
                  </table>
                </div>
                <div class="text-muted small" id="${LOOKUP_RESULTS_META_ID}"></div>
              </div>
            </div>
          </div>
        `;

        hostDoc.body.appendChild(modalEl);
      }

      if (!this._lookupModalInstance && hostBootstrap?.Modal) {
        this._lookupModalInstance = hostBootstrap.Modal.getOrCreateInstance(modalEl, { backdrop: 'static' });
      }

      return modalEl;
    },

    _showLookupModalFallback(modalEl) {
      // If Bootstrap Modal API isn't available, do a minimal fallback show.
      // This avoids the silent no-op when bootstrap is not wired in the iframe/parent.
      if (!modalEl) return;
      if (this._lookupModalInstance?.show) {
        this._lookupModalInstance.show();
        return;
      }
      modalEl.classList.add('show');
      modalEl.style.display = 'block';
      modalEl.removeAttribute('aria-hidden');
      modalEl.setAttribute('aria-modal', 'true');
      // Backdrop (simple)
      const { hostDoc } = this._getLookupHost();
      if (!hostDoc.getElementById('caLookupBackdrop')) {
        const backdrop = hostDoc.createElement('div');
        backdrop.id = 'caLookupBackdrop';
        backdrop.className = 'modal-backdrop fade show';
        hostDoc.body.appendChild(backdrop);
        backdrop.addEventListener('click', () => this._hideLookupModalFallback(modalEl));
      }
    },

    _hideLookupModalFallback(modalEl) {
      if (!modalEl) return;
      if (this._lookupModalInstance?.hide) {
        this._lookupModalInstance.hide();
        return;
      }
      modalEl.classList.remove('show');
      modalEl.style.display = 'none';
      modalEl.setAttribute('aria-hidden', 'true');
      const { hostDoc } = this._getLookupHost();
      hostDoc.getElementById('caLookupBackdrop')?.remove?.();
    },

    _setLookupMeta(text) {
      const { hostDoc } = this._getLookupHost();
      const el = hostDoc.getElementById(this._LOOKUP_RESULTS_META_ID);
      if (el) el.textContent = text || '';
    },

    _clearLookupResults() {
      const { hostDoc } = this._getLookupHost();
      const headerEl = hostDoc.getElementById(this._LOOKUP_RESULTS_HEADER_ID);
      const bodyEl = hostDoc.getElementById(this._LOOKUP_RESULTS_BODY_ID);
      if (headerEl) headerEl.innerHTML = '';
      if (bodyEl) bodyEl.innerHTML = '';
      this._setLookupMeta('');
    },

    _renderLookupResults(rows, columns, onSelectRow) {
      const { hostDoc } = this._getLookupHost();
      const headerEl = hostDoc.getElementById(this._LOOKUP_RESULTS_HEADER_ID);
      const bodyEl = hostDoc.getElementById(this._LOOKUP_RESULTS_BODY_ID);
      if (!headerEl || !bodyEl) return;

      headerEl.innerHTML = '';
      bodyEl.innerHTML = '';

      const headerCells = ['Select', ...columns];
      headerCells.forEach((col) => {
        const th = document.createElement('th');
        th.scope = 'col';
        th.textContent = col;
        headerEl.appendChild(th);
      });

      rows.forEach((row) => {
        const tr = document.createElement('tr');

        const selectTd = document.createElement('td');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-sm btn-success';
        btn.textContent = 'Select';
        btn.addEventListener('click', () => {
          try {
            onSelectRow?.(row);
          } finally {
            const modalEl = this._ensureLookupModal();
            this._hideLookupModalFallback(modalEl);
          }
        });
        selectTd.appendChild(btn);
        tr.appendChild(selectTd);

        columns.forEach((col) => {
          const td = document.createElement('td');
          const val = row?.[col];
          td.textContent = val === null || val === undefined ? '' : String(val);
          tr.appendChild(td);
        });

        bodyEl.appendChild(tr);
      });
    },

    _wireLookupModalEventsOnce() {
      const modalEl = this._ensureLookupModal();
      const { hostDoc } = this._getLookupHost();
      const inputEl = hostDoc.getElementById(this._LOOKUP_SEARCH_INPUT_ID);
      const searchBtn = hostDoc.getElementById(this._LOOKUP_SEARCH_BTN_ID);
      const clearBtn = hostDoc.getElementById(this._LOOKUP_CLEAR_BTN_ID);

      const advancedForm = hostDoc.getElementById(this._LOOKUP_ADVANCED_FORM_ID);
      const advancedSearchBtn = hostDoc.getElementById(this._LOOKUP_ADVANCED_SEARCH_BTN_ID);
      const advancedClearBtn = hostDoc.getElementById(this._LOOKUP_ADVANCED_CLEAR_BTN_ID);

      if (modalEl.dataset.lookupWired === 'true') return;
      modalEl.dataset.lookupWired = 'true';

      inputEl?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          this._doLookupSearch();
        }
      });

      searchBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._doLookupSearch();
      });

      clearBtn?.addEventListener('click', () => {
        if (inputEl) {
          inputEl.value = '';
          inputEl.focus();
        }
        this._clearLookupResults();
        this._setLookupMeta('');
      });

      advancedForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._doLookupSearch();
      });

      advancedForm?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          this._doLookupSearch();
        }
      });

      advancedSearchBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._doLookupSearch();
      });

      advancedClearBtn?.addEventListener('click', () => {
        advancedForm?.querySelectorAll?.('[data-lookup-field]')?.forEach?.((field) => {
          field.value = '';
        });
        this._clearLookupResults();
        this._setLookupMeta('');
      });

      modalEl.addEventListener('shown.bs.modal', () => {
        setTimeout(() => {
          const firstAdvanced = advancedForm?.querySelector?.('[data-lookup-field]');
          if (firstAdvanced) {
            firstAdvanced.focus?.();
            return;
          }
          inputEl?.focus?.();
        }, 0);
      });
    },

    async _openCenterLookup() {
      const modalEl = this._ensureLookupModal();
      this._wireLookupModalEventsOnce();
      this._lookupActiveType = 'center';

      const { hostDoc } = this._getLookupHost();
      const titleEl = hostDoc.getElementById(this._LOOKUP_MODAL_LABEL_ID);
      if (titleEl) titleEl.textContent = 'Center Lookup';

      // Show center-related filters; hide meeting-date filter.
      const advancedForm = hostDoc.getElementById(this._LOOKUP_ADVANCED_FORM_ID);
      const groupIdFieldWrap = advancedForm?.querySelector?.('[data-lookup-field="GroupID"]')?.closest?.('.col-12');
      const groupNameFieldWrap = advancedForm?.querySelector?.('[data-lookup-field="GroupName"]')?.closest?.('.col-12');
      const nextMeetingFieldWrap = advancedForm?.querySelector?.('[data-lookup-field="NextMeetingDate"]')?.closest?.('.col-12');
      groupIdFieldWrap?.classList?.remove?.('d-none');
      groupNameFieldWrap?.classList?.remove?.('d-none');
      nextMeetingFieldWrap?.classList?.add?.('d-none');

      // Prefill filters from current CenterId.
      const groupIdFilter = advancedForm?.querySelector?.('[data-lookup-field="GroupID"]');
      if (groupIdFilter && !String(groupIdFilter.value || '').trim()) {
        groupIdFilter.value = String(this.centerIdInput?.value || '').trim();
      }

      const inputEl = hostDoc.getElementById(this._LOOKUP_SEARCH_INPUT_ID);
      if (inputEl && !String(inputEl.value || '').trim()) {
        inputEl.value = String(this.centerIdInput?.value || '').trim();
      }

      this._clearLookupResults();
      this._showLookupModalFallback(modalEl);

      await this._doLookupSearch();
    },

    _extractSearchRows(searchResult) {
      const candidates = [searchResult?.data, searchResult?.Details, searchResult].filter(Boolean);
      for (const candidate of candidates) {
        if (Array.isArray(candidate)) return candidate;

        const nested =
          candidate?.Details?.SearchResults ||
          candidate?.Details ||
          candidate?.SearchResults ||
          candidate?.Details?.Details ||
          candidate;

        if (Array.isArray(nested)) return nested;
        if (Array.isArray(nested?.SearchResults)) return nested.SearchResults;
        if (Array.isArray(nested?.Details)) return nested.Details;
      }
      return [];
    },

    async _openMeetingDateLookup() {
      const modalEl = this._ensureLookupModal();
      this._wireLookupModalEventsOnce();
      this._lookupActiveType = 'meeting-date';

      const { hostDoc } = this._getLookupHost();
      const titleEl = hostDoc.getElementById(this._LOOKUP_MODAL_LABEL_ID);
      if (titleEl) titleEl.textContent = 'Meeting Date Lookup';

      // Show only meeting-date filter; hide center fields.
      const advancedForm = hostDoc.getElementById(this._LOOKUP_ADVANCED_FORM_ID);
      const groupIdFieldWrap = advancedForm?.querySelector?.('[data-lookup-field="GroupID"]')?.closest?.('.col-12');
      const groupNameFieldWrap = advancedForm?.querySelector?.('[data-lookup-field="GroupName"]')?.closest?.('.col-12');
      const nextMeetingFieldWrap = advancedForm?.querySelector?.('[data-lookup-field="NextMeetingDate"]')?.closest?.('.col-12');
      groupIdFieldWrap?.classList?.add?.('d-none');
      groupNameFieldWrap?.classList?.add?.('d-none');
      nextMeetingFieldWrap?.classList?.remove?.('d-none');

      const nextMeetingFilter = advancedForm?.querySelector?.('[data-lookup-field="NextMeetingDate"]');
      if (nextMeetingFilter && !String(nextMeetingFilter.value || '').trim()) {
        nextMeetingFilter.value = String(this.meetingDateInput?.value || '').trim();
      }

      const inputEl = hostDoc.getElementById(this._LOOKUP_SEARCH_INPUT_ID);
      if (inputEl) {
        inputEl.value = String(this.meetingDateInput?.value || '').trim();
        inputEl.placeholder = 'Type Meeting Date to search...';
      }

      this._clearLookupResults();
      this._showLookupModalFallback(modalEl);
      await this._doLookupSearch();
    },

    async _doLookupSearch() {
      this._ensureLookupModal();
      await this._ensureLookupServicesLoaded();

      const operatorId = this._getOperatorId();
      const branchId = this._getBranchId();

      const { hostDoc } = this._getLookupHost();

      const inputEl = hostDoc.getElementById(this._LOOKUP_SEARCH_INPUT_ID);
      const advancedForm = hostDoc.getElementById(this._LOOKUP_ADVANCED_FORM_ID);

      this._clearLookupResults();
      this._setLookupMeta('Searching...');

      try {
        if (this._lookupActiveType === 'meeting-date') {
          const searchSvc = window.SearchService;
          if (!searchSvc?.search) {
            this._setLookupMeta('Search service not available');
            this.showStatus('Search service not available', 'error');
            return;
          }

          // Requirement: TableID GroupNextMeeting; AdvFilterString: OurBranchID='branch' AND GroupStatusID='A'
          const advFilterString = `OurBranchID='${branchId}' AND GroupStatusID= 'A'`;

          // Optional WhereStmt built from NextMeetingDate filter or quick search input.
          // Keep safe + minimal: only filter if user provides a value.
          const nextMeetingField = advancedForm?.querySelector?.('[data-lookup-field="NextMeetingDate"]');
          const raw = String(nextMeetingField?.value || inputEl?.value || '').trim();
          const whereStmt = raw ? `NextMeetingDate like '%${String(raw).replace(/\\/g, '\\\\').replace(/'/g, "''").replace(/%/g, '\\%').replace(/_/g, '\\_')}%'` : '';

          const payload = {
            TableID: 'GroupNextMeeting',
            AdvFilterString: advFilterString,
            WhereStmt: whereStmt,
            PrevOrNext: '0',
            RefID: '',
            OperatorID: operatorId,
            ModuleID: '5080',
            OurBranchID: branchId,
            SearchKey: '',
            LanguageID: 'en'
          };

          const result = await searchSvc.search(payload);
          const rows = this._extractSearchRows(result);

          if (!rows.length) {
            this._setLookupMeta('No results');
            return;
          }

          const limited = rows.slice(0, 500);
          const columns = ['NextMeetingDate'];

          this._renderLookupResults(limited, columns, (selected) => {
            const dateVal = selected?.NextMeetingDate;
            if (!dateVal || !this.meetingDateInput) return;

            // MeetingDate is often a <select>; ensure the option exists.
            const meetingEl = this.meetingDateInput;
            const hasOption = Array.from(meetingEl.options || []).some((o) => String(o.value) === String(dateVal));
            if (!hasOption && meetingEl.tagName === 'SELECT') {
              const opt = document.createElement('option');
              opt.value = String(dateVal);
              opt.textContent = String(dateVal);
              meetingEl.appendChild(opt);
            }

            meetingEl.value = String(dateVal);
          });

          this._setLookupMeta(`${limited.length} result(s)`);
          return;
        }

        // Default: Center lookup (GroupID)
        const svc = window.GroupMemberMaintenanceService;
        if (!svc?.searchGroupID) {
          this._setLookupMeta('GroupMemberMaintenanceService not available');
          this.showStatus('GroupMemberMaintenanceService not available', 'error');
          return;
        }

        const groupIdField = advancedForm?.querySelector?.('[data-lookup-field="GroupID"]');
        const centerIdVal = String(groupIdField?.value || inputEl?.value || this.centerIdInput?.value || '').trim();

        const rows = await svc.searchGroupID({ branchId, operatorId, centerId: centerIdVal });
        const list = Array.isArray(rows) ? rows : [];

        if (!list.length) {
          this._setLookupMeta('No results');
          return;
        }

        const limited = list.slice(0, 500);
        const columns = ['GroupID', 'GroupName'];

        this._renderLookupResults(limited, columns, (selected) => {
          if (!selected) return;
          if (this.centerIdInput) this.centerIdInput.value = selected.GroupID || '';
          if (this.centerNameInput) this.centerNameInput.value = selected.GroupName || '';
        });

        this._setLookupMeta(`${limited.length} result(s)`);
      } catch (err) {
        console.error('[CenterAttendance] Lookup search failed:', err);
        this._setLookupMeta('Search failed');
        this.showStatus('Search failed: ' + (err?.message || 'Unknown error'), 'error');
      }
    },
    
    initActionButtons() {
      this.form.querySelectorAll('[data-ca-action]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const type = btn.getAttribute('data-ca-action');
          console.log('[CenterAttendance] Action clicked:', type);
          
          switch(type) {
            case 'view':
              this.handleView();
              break;
            case 'edit':
              this.handleEdit();
              break;
            case 'delete':
              this.handleDelete();
              break;
            case 'save':
              this.handleSave();
              break;
            case 'cancel':
              this.handleCancel();
              break;
          }
        });
      });
    },
    
    async handleView() {
      console.log('[CenterAttendance] View clicked');
      
      // Validate required fields
      const centerId = this.centerIdInput?.value?.trim();
      const meetingDate = this.meetingDateInput?.value?.trim();
      
      if (!centerId || centerId === '' || meetingDate === '--Select--') {
        this.showStatus('Please enter Center ID and select Meeting Date', 'error');
        return;
      }
      
      try {
        // Get operator and branch from auth
        const operatorId = window.AuthService?.getOperatorId?.() || '001';
        const branchId = window.AuthService?.getBranchId?.() || '0603';
        
        console.log('[CenterAttendance] Fetching attendance data...', {
          centerId,
          meetingDate,
          operatorId,
          branchId
        });
        
        // Call the API
        const result = await window.MicrofinanceService.getGroupAttendance({
          OurBranchID: branchId,
          GroupID: centerId,
          MeetingDate: meetingDate,
          OperatorID: operatorId
        });
        
        console.log('[CenterAttendance] API Response:', result);
        
        if (result.success && result.data) {
          this.populateFormData(result.data);
          this.showStatus('Attendance data loaded successfully', 'success');
          
          // Enable Edit button
          this.enableButton('edit');
        } else {
          this.showStatus(result.message || 'No data found', 'error');
        }
      } catch (error) {
        console.error('[CenterAttendance] Error fetching data:', error);
        this.showStatus('Error loading attendance data: ' + error.message, 'error');
      }
    },
    
    handleEdit() {
      console.log('[CenterAttendance] Edit clicked');
      this.currentMode = 'edit';
      
      // Enable form fields
      this.setFieldsEditable();
      
      // Update button states
      this.disableButton('view');
      this.disableButton('edit');
      this.enableButton('save');
      this.enableButton('delete');
      
      this.showStatus('Edit mode enabled', 'info');
    },
    
    async handleSave() {
      console.log('[CenterAttendance] Save clicked');
      
      // Validate form
      if (!this.validateForm()) {
        return;
      }
      
      try {
        const operatorId = window.AuthService?.getOperatorId?.() || '001';
        const branchId = window.AuthService?.getBranchId?.() || '0101';
        
        // Collect attendance data from table
        const attendanceList = this.collectAttendanceData();
        
        const requestData = {
          OurBranchID: branchId,
          GroupID: this.centerIdInput.value.trim(),
          MeetingDate: this.meetingDateInput.value,
          OfficerID: this.officerIdInput.value.trim(),
          MeetingPlace: this.meetingPlaceInput.value.trim(),
          Remarks: this.remarksInput.value.trim(),
          AttendanceList: attendanceList,
          OperatorID: operatorId
        };
        
        console.log('[CenterAttendance] Saving data...', requestData);
        
        // TODO: Add save API call when available
        // const result = await window.MicrofinanceService.saveGroupAttendance(requestData);
        
        this.showStatus('Attendance data saved successfully', 'success');
        
        // Reset to view mode
        this.handleCancel();
        
      } catch (error) {
        console.error('[CenterAttendance] Error saving data:', error);
        this.showStatus('Error saving attendance data: ' + error.message, 'error');
      }
    },
    
    handleDelete() {
      console.log('[CenterAttendance] Delete clicked');
      
      if (!confirm('Are you sure you want to delete this attendance record?')) {
        return;
      }
      
      // TODO: Implement delete functionality
      this.showStatus('Delete functionality not yet implemented', 'info');
    },
    
    handleCancel() {
      console.log('[CenterAttendance] Cancel clicked');
      
      // Check if in iframe modal
      const modalEl = window.frameElement?.closest?.('.modal');
      if (modalEl) {
        const modal = window.parent.bootstrap?.Modal.getOrCreateInstance(modalEl);
        modal?.hide?.();
        return;
      }
      
      // Reset form
      this.form.reset();
      this.clearTable();
      this.setFieldsReadonly();
      this.currentMode = 'view';
      
      // Reset button states
      this.enableButton('view');
      this.disableButton('edit');
      this.disableButton('save');
      this.disableButton('delete');
      
      this.showStatus('Form reset', 'info');
    },
    
    handleCenterLookup() {
      this._openCenterLookup();
    },
    
    handleMeetingDateLookup() {
      this._openMeetingDateLookup();
    },
    
    handleOfficerLookup() {
      // TODO: Implement officer lookup modal
      alert('Officer lookup not yet implemented');
    },
    
    populateFormData(data) {
      console.log('[CenterAttendance] Populating form with data:', data);
      
      // Handle both single object and array responses
      const recordData = Array.isArray(data) ? data[0] : data;
      
      if (!recordData) {
        console.warn('[CenterAttendance] No record data to populate');
        return;
      }
      
      // Populate header fields
      if (recordData.CenterID || recordData.GroupID) {
        this.centerIdInput.value = recordData.CenterID || recordData.GroupID;
      }
      if (recordData.CenterName || recordData.GroupName) {
        this.centerNameInput.value = recordData.CenterName || recordData.GroupName;
      }
      if (recordData.MeetingDate) {
        this.meetingDateInput.value = recordData.MeetingDate;
      }
      if (recordData.OfficerID) {
        this.officerIdInput.value = recordData.OfficerID;
      }
      if (recordData.OfficerName) {
        this.officerNameInput.value = recordData.OfficerName;
      }
      if (recordData.MeetingPlace) {
        this.meetingPlaceInput.value = recordData.MeetingPlace;
      }
      if (recordData.Remarks) {
        this.remarksInput.value = recordData.Remarks;
      }
      
      // Populate attendance list table
      if (Array.isArray(data) && data.length > 0) {
        this.populateAttendanceTable(data);
      } else if (recordData.AttendanceList) {
        this.populateAttendanceTable(recordData.AttendanceList);
      }
    },
    
    populateAttendanceTable(attendanceList) {
      console.log('[CenterAttendance] Populating table with', attendanceList.length, 'records');
      
      this.attendanceData = attendanceList;
      
      if (!this.tableBody) {
        console.error('[CenterAttendance] Table body not found');
        return;
      }
      
      this.tableBody.innerHTML = '';
      
      if (!attendanceList || attendanceList.length === 0) {
        this.tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-gray);">No records to display</td></tr>';
        return;
      }
      
      attendanceList.forEach((record, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${record.ClientID || ''}</td>
          <td>${record.ClientName || record.Name || ''}</td>
          <td>
            <select class="form-control" data-attendance-status data-index="${index}">
              <option value="P" ${record.AttendanceStatus === 'P' ? 'selected' : ''}>Present</option>
              <option value="A" ${record.AttendanceStatus === 'A' ? 'selected' : ''}>Absent</option>
              <option value="L" ${record.AttendanceStatus === 'L' ? 'selected' : ''}>Late</option>
            </select>
          </td>
          <td>${record.PaymentTypeDescription || record.PaymentType || ''}</td>
        `;
        this.tableBody.appendChild(row);
      });
    },
    
    collectAttendanceData() {
      const attendanceList = [];
      const rows = this.tableBody.querySelectorAll('tr');
      
      rows.forEach((row, index) => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 4) return; // Skip empty rows
        
        const statusSelect = row.querySelector('[data-attendance-status]');
        
        attendanceList.push({
          ClientID: cells[0].textContent.trim(),
          ClientName: cells[1].textContent.trim(),
          AttendanceStatus: statusSelect ? statusSelect.value : 'P',
          PaymentTypeDescription: cells[3].textContent.trim()
        });
      });
      
      return attendanceList;
    },
    
    validateForm() {
      const centerId = this.centerIdInput?.value?.trim();
      const meetingDate = this.meetingDateInput?.value;
      const officerId = this.officerIdInput?.value?.trim();
      
      if (!centerId) {
        this.showStatus('Center ID is required', 'error');
        this.centerIdInput?.focus();
        return false;
      }
      
      if (!meetingDate || meetingDate === '--Select--') {
        this.showStatus('Meeting Date is required', 'error');
        this.meetingDateInput?.focus();
        return false;
      }
      
      if (!officerId) {
        this.showStatus('Officer ID is required', 'error');
        this.officerIdInput?.focus();
        return false;
      }
      
      return true;
    },
    
    setFieldsReadonly() {
      const fields = [
        this.centerIdInput,
        this.centerNameInput,
        this.officerIdInput,
        this.officerNameInput,
        this.meetingPlaceInput,
        this.remarksInput
      ];
      
      fields.forEach(field => {
        if (field) {
          field.setAttribute('readonly', 'readonly');
        }
      });
      
      // Disable meeting date dropdown
      if (this.meetingDateInput) {
        this.meetingDateInput.setAttribute('disabled', 'disabled');
      }
      
      // Disable attendance status dropdowns
      document.querySelectorAll('[data-attendance-status]').forEach(select => {
        select.setAttribute('disabled', 'disabled');
      });
    },
    
    setFieldsEditable() {
      const fields = [
        this.meetingPlaceInput,
        this.remarksInput
      ];
      
      fields.forEach(field => {
        if (field) {
          field.removeAttribute('readonly');
        }
      });
      
      // Enable attendance status dropdowns
      document.querySelectorAll('[data-attendance-status]').forEach(select => {
        select.removeAttribute('disabled');
      });
    },
    
    clearTable() {
      if (this.tableBody) {
        this.tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-gray);">No records to display</td></tr>';
      }
      this.attendanceData = [];
    },
    
    enableButton(action) {
      const btn = this.form.querySelector(`[data-ca-action="${action}"]`);
      if (btn) {
        btn.removeAttribute('disabled');
      }
    },
    
    disableButton(action) {
      const btn = this.form.querySelector(`[data-ca-action="${action}"]`);
      if (btn) {
        btn.setAttribute('disabled', 'disabled');
      }
    },
    
    showStatus(message, type = 'info') {
      console.log(`[CenterAttendance] Status (${type}):`, message);
      
      const statusEl = document.getElementById('statusMessage');
      if (!statusEl) return;
      
      const statusText = statusEl.querySelector('.status-text');
      if (statusText) {
        statusText.textContent = message;
      }
      
      // Remove previous type classes
      statusEl.classList.remove('status--success', 'status--error', 'status--warning', 'status--info');
      
      // Add new type class
      if (type === 'success') {
        statusEl.classList.add('status--success');
      } else if (type === 'error') {
        statusEl.classList.add('status--error');
      } else if (type === 'warning') {
        statusEl.classList.add('status--warning');
      } else {
        statusEl.classList.add('status--info');
      }
      
      // Show status
      statusEl.classList.remove('hidden');
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        statusEl.classList.add('hidden');
      }, 5000);
    }
  };
  
  // Initialize on document ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      CenterAttendance.init();
    });
  } else {
    CenterAttendance.init();
  }
  
  // Expose to global scope
  window.CenterAttendance = CenterAttendance;
})();
