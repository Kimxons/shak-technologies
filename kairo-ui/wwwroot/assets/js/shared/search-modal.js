(function (global) {
  class SearchModal {
    constructor(options = {}) {
      this.prefix = options.prefix || 'search';
      this.moduleID = options.moduleID || '';
      this.getOperatorId = options.getOperatorId || (() => 'web_portal');
      this.getOurBranchId = options.getOurBranchId || (() => '');
      this.searchFn = typeof options.searchFn === 'function' ? options.searchFn : null;
      this.onError = options.onError || ((msg) => console.error(msg));
      this.modalEl = null;
      this.currentConfig = null;
      this.filteredResults = [];
      this.selectedIndex = null;
      this.modalReady = this.createModal(); // Store the promise
    }

    async createModal() {
      const existing = document.getElementById(`${this.prefix}-search-modal`);
      if (existing) {
        this.modalEl = existing;
        console.log(`[SearchModal] Found existing modal: ${this.prefix}-search-modal`);
        return;
      }

      console.log(`[SearchModal] Creating new modal with prefix: ${this.prefix}`);

      try {
        this.injectThemeStyles();
        // Use inline template directly - more reliable than fetch in iframe contexts
        const html = this.getInlineTemplate().replace(/{{prefix}}/g, this.prefix);

        document.body.insertAdjacentHTML('beforeend', html);
        this.modalEl = document.getElementById(`${this.prefix}-search-modal`);

        // Apply styling class based on prefix
        if (this.modalEl && this.prefix) {
          this.modalEl.classList.add(`${this.prefix}-modal`);
        }

        if (!this.modalEl) {
          console.error(`[SearchModal] Modal element not found after insertion: ${this.prefix}-search-modal`);
          console.error(`[SearchModal] document.body innerHTML length: ${document.body.innerHTML.length}`);
          return;
        }

        const closeBtn = document.getElementById(`${this.prefix}-close`);
        const okBtn = document.getElementById(`${this.prefix}-ok`);
        const searchBtn = document.getElementById(`${this.prefix}-search-btn`);

        console.log(`[SearchModal] Wiring buttons - close: ${!!closeBtn}, ok: ${!!okBtn}, search: ${!!searchBtn}`);

        if (closeBtn) closeBtn.addEventListener('click', () => this.close());
        if (okBtn) okBtn.addEventListener('click', () => {
          if (this.selectedIndex !== null && this.selectedIndex !== undefined) {
            this.selectResult(this.selectedIndex);
            return;
          }
          this.close();
        });
        if (searchBtn) searchBtn.addEventListener('click', () => this.executeSearch());

        this.modalEl.addEventListener('click', (e) => {
          if (e.target === this.modalEl) this.close();
        });

        console.log(`[SearchModal] Modal created successfully with prefix: ${this.prefix}`);
      } catch (error) {
        console.error('[SearchModal] Failed to create modal:', error);
      }
    }

    getInlineTemplate() {
      return `<div id="{{prefix}}-search-modal" class="search-modal-themed" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; z-index: 9999; justify-content: center; align-items: center;">
  <div class="search-modal-themed__panel">
    <div class="search-modal-themed__header">
      <h5 id="{{prefix}}-title" class="search-modal-themed__title">Search Results</h5>
      <button type="button" id="{{prefix}}-close" class="search-modal-themed__close" aria-label="Close">&times;</button>
    </div>
    <div class="search-modal-themed__criteria-wrap">
      <div id="{{prefix}}-criteria" class="search-modal-themed__criteria"></div>
      <div class="search-modal-themed__actions">
        <button type="button" id="{{prefix}}-search-btn" class="search-modal-themed__btn search-modal-themed__btn--secondary">Search</button>
      </div>
    </div>
    <div class="search-modal-themed__body">
      <div id="{{prefix}}-loading" class="search-modal-themed__loading" style="display:none;">Loading...</div>
      <div id="{{prefix}}-results" class="search-modal-themed__results" style="display:none;"></div>
      <div id="{{prefix}}-empty" class="search-modal-themed__empty" style="display:none;">No records found</div>
    </div>
    <div class="search-modal-themed__footer">
      <button type="button" id="{{prefix}}-ok" class="search-modal-themed__btn search-modal-themed__btn--secondary">OK</button>
    </div>
  </div>
</div>`;
    }

    injectThemeStyles() {
      if (document.getElementById('search-modal-themed-styles')) return;
      const style = document.createElement('style');
      style.id = 'search-modal-themed-styles';
      style.textContent = `
.search-modal-themed{display:none!important;position:fixed!important;top:0!important;left:0!important;right:0!important;bottom:0!important;background:rgba(0,0,0,0.45)!important;z-index:9999!important;justify-content:center!important;align-items:center!important;}
.search-modal-themed[style*="flex"]{display:flex!important;}
.search-modal-themed__panel{background:var(--color-bg-panel,var(--color-bg-section,#fff))!important;border-radius:6px!important;box-shadow:0 4px 12px rgba(0,0,0,0.15)!important;max-width:900px!important;width:90%!important;max-height:80vh!important;display:flex!important;flex-direction:column!important;border:1px solid var(--color-border,var(--color-border-default,#e0e0e0))!important;}
.search-modal-themed__header{display:flex!important;justify-content:space-between!important;align-items:center!important;padding:12px 20px!important;border-bottom:1px solid var(--color-border-strong,var(--color-border,rgba(255,255,255,0.2)))!important;background:var(--color-header,var(--color-primary,#1e7cc4))!important;color:#fff!important;}
.search-modal-themed__title{margin:0!important;font-size:var(--label-font-size,16px)!important;font-weight:var(--label-font-weight,600)!important;font-family:var(--label-font-family,inherit)!important;color:#fff!important;}
.search-modal-themed__close{background:none!important;border:none!important;font-size:22px!important;cursor:pointer!important;color:#fff!important;padding:0!important;}
.search-modal-themed__close:hover{opacity:0.9;}
.search-modal-themed__criteria-wrap{padding:12px 20px!important;border-bottom:1px solid var(--color-border,var(--color-border-default,#e0e0e0))!important;background:var(--color-bg-section,var(--color-bg-panel,#fafafa))!important;}
.search-modal-themed__criteria{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))!important;gap:12px!important;}
.search-modal-themed__actions{text-align:center!important;margin-top:10px!important;}
.search-modal-themed__field{display:flex!important;flex-direction:column!important;gap:4px!important;}
.search-modal-themed__label{font-size:var(--label-font-size,12px)!important;font-weight:var(--label-font-weight,500)!important;font-family:var(--label-font-family,inherit)!important;color:var(--color-label-default,var(--color-text-secondary,#555))!important;}
.search-modal-themed__input-row{display:flex!important;gap:8px!important;}
.search-modal-themed__select,.search-modal-themed__input{padding:4px 8px!important;border:1px solid var(--color-border,var(--color-border-default,#ccc))!important;border-radius:3px!important;font-size:var(--label-font-size,13px)!important;font-family:var(--label-font-family,inherit)!important;background:var(--color-bg-input,#fff)!important;color:var(--color-text,var(--color-text-primary,#1e293b))!important;}
.search-modal-themed__select{flex:0 0 80px!important;}
.search-modal-themed__input{flex:1!important;}
.search-modal-themed__input::placeholder{color:var(--color-text-muted,#94a3b8)!important;}
.search-modal-themed__input:focus,.search-modal-themed__select:focus{outline:none!important;border-color:var(--color-primary,#1e7cc4)!important;box-shadow:0 0 0 2px rgba(30,124,196,0.2)!important;}
.search-modal-themed__btn{padding:6px 24px!important;border-radius:3px!important;cursor:pointer!important;font-size:var(--label-font-size,13px)!important;font-weight:var(--label-font-weight,500)!important;font-family:var(--label-font-family,inherit)!important;}
.search-modal-themed__btn--secondary{background:var(--color-bg-elevated,#e8ecf0)!important;border:1px solid var(--color-border-strong,var(--color-border,#999))!important;color:var(--color-text,var(--color-text-primary,#1e293b))!important;}
.search-modal-themed__btn--secondary:hover{background:var(--color-primary)!important;color:#fff!important;border-color:var(--color-primary)!important;}
.search-modal-themed__body{flex:1!important;overflow-y:auto!important;padding:12px 20px!important;background:var(--color-bg-panel,var(--color-bg-section,#fff))!important;}
.search-modal-themed__loading,.search-modal-themed__empty{text-align:center!important;padding:24px!important;color:var(--color-text-muted,var(--color-text-secondary,#666))!important;font-size:var(--label-font-size,13px)!important;font-family:var(--label-font-family,inherit)!important;}
.search-modal-themed__footer{padding:10px 16px!important;border-top:1px solid var(--color-border,var(--color-border-default,#e0e0e0))!important;background:var(--color-header,var(--color-primary,#1e7cc4))!important;display:flex!important;justify-content:center!important;}
.search-modal-themed__table{width:100%!important;border-collapse:collapse!important;font-size:var(--label-font-size,13px)!important;font-family:var(--label-font-family,inherit)!important;}
.search-modal-themed__th{padding:8px!important;text-align:left!important;border:1px solid var(--color-border-strong,var(--color-border,#2868ab))!important;font-weight:var(--label-font-weight,600)!important;background:var(--color-header,var(--color-primary,#357abd))!important;color:#fff!important;}
.search-modal-themed__th--num{text-align:center!important;width:40px!important;}
.search-modal-themed__tr{background:var(--color-bg-panel,#fff)!important;color:var(--color-text,var(--color-text-primary,#1e293b))!important;}
.search-modal-themed__tr--odd{background:var(--color-bg-section,#f1f5f9)!important;}
.search-modal-themed__tr:hover{background:var(--color-bg-elevated,#e2e8f0)!important;}
.search-modal-themed__tr--selected{background:var(--color-primary)!important;color:#fff!important;}
.search-modal-themed__tr--selected .search-modal-themed__td{color:#fff!important;border-color:var(--color-border-strong,rgba(255,255,255,0.3))!important;}
.search-modal-themed__td{padding:6px 8px!important;border:1px solid var(--color-border,var(--color-border-default,#e2e8f0))!important;color:var(--color-text,var(--color-text-primary,#1e293b))!important;}
.search-modal-themed__td--num{text-align:center!important;}
body.dark-theme .search-modal-themed__panel,html body.dark-theme .search-modal-themed__panel{background:var(--color-bg-panel,#1F1F1F)!important;border-color:var(--color-border-default,rgba(255,255,255,0.10))!important;}
body.dark-theme .search-modal-themed__criteria-wrap,body.dark-theme .search-modal-themed__body{background:var(--color-bg-section,#1B1B1B)!important;}
body.dark-theme .search-modal-themed__select,body.dark-theme .search-modal-themed__input{background:var(--color-bg-input,#2A2A2A)!important;color:var(--color-text-primary,rgba(255,255,255,0.87))!important;border-color:var(--color-border-default,rgba(255,255,255,0.10))!important;}
body.dark-theme .search-modal-themed__tr{background:var(--color-bg-panel,#1F1F1F)!important;color:var(--color-text-primary,rgba(255,255,255,0.87))!important;}
body.dark-theme .search-modal-themed__tr--odd{background:var(--color-bg-section,#1B1B1B)!important;}
body.dark-theme .search-modal-themed__tr:hover{background:var(--color-bg-elevated,#252525)!important;}
body.dark-theme .search-modal-themed__td{border-color:var(--color-border-subtle,rgba(255,255,255,0.06))!important;color:var(--color-text-primary,rgba(255,255,255,0.87))!important;}
body.dark-theme .search-modal-themed__label,body.dark-theme .search-modal-themed__loading,body.dark-theme .search-modal-themed__empty{color:var(--color-text-secondary,rgba(255,255,255,0.60))!important;}
body.dark-theme .search-modal-themed__btn--secondary{background:var(--color-bg-elevated,#2A2A2A)!important;border-color:var(--color-border-default,rgba(255,255,255,0.10))!important;color:var(--color-text-primary,rgba(255,255,255,0.87))!important;}
`;
      const target = document.head || document.body;
      if (target) target.appendChild(style);
    }

    async open(config) {
      console.log('[SearchModal] open() called with config:', config?.tableID);

      // Wait for modal to be ready before opening
      await this.modalReady;

      if (!this.modalEl) {
        console.error('[SearchModal] Modal element not available after waiting');
        this.onError('Search modal failed to initialize');
        return;
      }

      console.log('[SearchModal] Modal element ready:', this.modalEl.id);

      this.currentConfig = config;
      // Set modal title if provided in config
      const titleEl = document.getElementById(`${this.prefix}-title`);
      if (titleEl && config.title) {
        titleEl.textContent = config.title;
      }
      this.renderCriteria(config.searchFields || []);
      this.show();

      // Always execute search when modal opens
      // This shows all records if fields are blank, or filtered records if fields have values
      setTimeout(() => this.executeSearch(), 80);
    }

    show() {
      console.log('[SearchModal] show() called, modalEl:', !!this.modalEl);
      if (this.modalEl) {
        this.modalEl.style.display = 'flex';
        console.log('[SearchModal] Modal display set to flex, current display:', this.modalEl.style.display);
        
        // Focus management - trap focus within modal
        setTimeout(() => {
          const firstInput = this.modalEl.querySelector('input[data-search-field], button');
          if (firstInput) {
            firstInput.focus();
          }
        }, 100);
        
        // Add keyboard focus trapping (Tab cycles within modal only)
        if (!this.modalEl.dataset.focusTrapAttached) {
          this.modalEl.dataset.focusTrapAttached = 'true';
          this.modalEl.addEventListener('keydown', (e) => {
            if (e.key !== 'Tab') return;
            
            const focusableElements = this.modalEl.querySelectorAll(
              'input, button, select, textarea, [tabindex]:not([tabindex=\"-1\"])'
            );
            if (focusableElements.length === 0) return;
            
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            
            if (e.shiftKey) {
              if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
              }
            } else {
              if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
              }
            }
          });
        }
      }
    }

    close() {
      if (this.modalEl) {
        this.modalEl.style.display = 'none';
        // Clear the configuration to prevent stale config from persisting
        this.currentConfig = null;
        this.filteredResults = [];
        this.selectedIndex = null;
        // Clear search input fields - scope to this modal only
        const criteriaContainer = document.getElementById(`${this.prefix}-criteria`);
        if (criteriaContainer) {
          const criteriaInputs = criteriaContainer.querySelectorAll(`[data-search-field]`);
          criteriaInputs.forEach(input => {
            if (input) input.value = '';
          });
        }
        // Clear results display
        const resultsDiv = document.getElementById(`${this.prefix}-results`);
        const emptyDiv = document.getElementById(`${this.prefix}-empty`);
        const loadingDiv = document.getElementById(`${this.prefix}-loading`);
        if (resultsDiv) resultsDiv.innerHTML = '';
        if (emptyDiv) emptyDiv.style.display = 'none';
        if (loadingDiv) loadingDiv.style.display = 'none';
      }
    }

    setSelected(index) {
      this.selectedIndex = index;
      const tbody = document.querySelector(`#${this.prefix}-results table tbody`);
      if (!tbody) return;

      const rows = Array.from(tbody.querySelectorAll('tr'));
      rows.forEach((tr, idx) => {
        tr.classList.remove('search-modal-themed__tr--selected');
        if (idx === index) {
          tr.classList.add('search-modal-themed__tr--selected');
        }
      });
    }

    renderCriteria(fields) {
      const container = document.getElementById(`${this.prefix}-criteria`);
      if (!container) return;
      container.innerHTML = fields.map(field => `
        <div class="search-modal-themed__field">
          <label class="search-modal-themed__label">${field.label}</label>
          <div class="search-modal-themed__input-row">
            <select class="search-modal-themed__select" data-search-mode="${field.name}">
              <option value="Like">Like</option>
              <option value="Exact">Exact</option>
            </select>
            <input type="text" class="search-modal-themed__input" data-search-field="${field.name}" data-search-column="${field.column}" placeholder="Enter ${field.label}" value="${field.value || ''}" />
          </div>
        </div>
      `).join('');
    }

    buildWhereStmt(baseWhere) {
      // Scope to this modal only to avoid leaking criteria across multiple SearchModal instances
      const criteriaContainer = document.getElementById(`${this.prefix}-criteria`);
      const criteriaInputs = criteriaContainer
        ? criteriaContainer.querySelectorAll(`[data-search-field]`)
        : [];

      const filters = [];
      criteriaInputs.forEach(input => {
        const value = input.value?.trim();
        if (value) {
          const column = input.dataset.searchColumn;
          const fieldName = input.dataset.searchField;
          const modeEl = criteriaContainer?.querySelector(`[data-search-mode="${fieldName}"]`);
          const mode = modeEl?.value || 'Like';
          const sanitized = value.replace(/'/g, "''");
          filters.push(mode === 'Exact' ? `${column} = '${sanitized}'` : `${column} LIKE '%${sanitized}%'`);
        }
      });
      let whereStmt = baseWhere || '';
      if (filters.length > 0) {
        const userFilter = filters.join(' AND ');
        whereStmt = whereStmt ? `${whereStmt} AND ${userFilter}` : userFilter;
      }
      return whereStmt;
    }

    normalizeResults(response) {
      if (!response) return [];
      let results = response?.Details?.SearchResults
        || response?.Details
        || response?.data?.SearchResults
        || response?.data
        || response?.SearchResults
        || response?.result?.ResultSets?.[0]
        || response?.result
        || response?.Data?.RecordSet
        || [];
      if (!Array.isArray(results)) {
        results = results ? [results] : [];
      }
      return results;
    }

    async executeSearch() {
      if (!this.currentConfig) return;
      const loadingDiv = document.getElementById(`${this.prefix}-loading`);
      const emptyDiv = document.getElementById(`${this.prefix}-empty`);
      const resultsDiv = document.getElementById(`${this.prefix}-results`);
      if (loadingDiv) loadingDiv.style.display = 'block';
      if (emptyDiv) emptyDiv.style.display = 'none';
      if (resultsDiv) resultsDiv.style.display = 'none';

      const whereStmt = this.buildWhereStmt(this.currentConfig.whereStmt);

      // Legacy p_GetSearchResult signature expects these fields.
      // Keep defaults compatible but allow config-level overrides.
      const escapeSqlLiteral = (value) => String(value ?? '').replace(/'/g, "''");

      const operatorId = this.getOperatorId();
      const ourBranchId = this.getOurBranchId();
      const moduleId = this.currentConfig.moduleIDOverride ?? this.moduleID;

      const prevOrNext = this.currentConfig.prevOrNext ?? '1';
      const refId = Object.prototype.hasOwnProperty.call(this.currentConfig, 'refId')
        ? this.currentConfig.refId
        : '';
      const searchKey = Object.prototype.hasOwnProperty.call(this.currentConfig, 'searchKey')
        ? this.currentConfig.searchKey
        : '';
      const languageId = this.currentConfig.languageId ?? 'en';

      let advFilterString = '';
      if (typeof this.currentConfig.advFilterString === 'function') {
        advFilterString = this.currentConfig.advFilterString({
          tableID: this.currentConfig.tableID,
          whereStmt,
          operatorId,
          moduleId,
          ourBranchId
        }) || '';
      } else {
        advFilterString = this.currentConfig.advFilterString || '';
      }

      // Convenience: if searching CollateralID and caller didn't provide AdvFilterString,
      // scope to branch in the legacy format: OurBranchID = '####'
      if (!advFilterString && String(this.currentConfig.tableID || '').toLowerCase() === 'collateralid' && ourBranchId) {
        advFilterString = `OurBranchID = '${escapeSqlLiteral(ourBranchId)}'`;
      }

      const payload = {
        TableID: this.currentConfig.tableID,
        WhereStmt: whereStmt,
        PrevOrNext: prevOrNext,
        RefID: refId,
        OperatorID: operatorId,
        ModuleID: moduleId,
        OurBranchID: ourBranchId,
        AdvFilterString: advFilterString,
        SearchKey: searchKey,
        LanguageID: languageId
      };

      try {
        const resp = this.searchFn
          ? await this.searchFn(payload, this.currentConfig)
          : await global.SearchService.search(payload);
        let results = this.normalizeResults(resp);
        console.log('[SearchModal] Raw results normalized:', results);

        // Deduplicate if requested in config
        if (this.currentConfig.uniqueBy && results.length > 0) {
          const uniqueKeys = Array.isArray(this.currentConfig.uniqueBy)
            ? this.currentConfig.uniqueBy
            : [this.currentConfig.uniqueBy];

          const seen = new Set();
          results = results.filter(row => {
            const rowKeys = Object.keys(row);
            // Create a composite key based on the specified unique fields
            const compositeKey = uniqueKeys.map(k => {
              const targetK = k.toLowerCase();
              const actualK = rowKeys.find(rk => rk.toLowerCase() === targetK);
              const val = actualK ? row[actualK] : '';
              return String(val).trim();
            }).join('|');

            if (seen.has(compositeKey)) return false;
            seen.add(compositeKey);
            return true;
          });
          console.log(`[SearchModal] Deduplicated ${results.length} unique records`);
        }

        // Sort results if sortBy is configured
        if (this.currentConfig.sortBy && results.length > 0) {
          const sortConfig = typeof this.currentConfig.sortBy === 'string'
            ? { column: this.currentConfig.sortBy, direction: 'asc' }
            : this.currentConfig.sortBy;
          const { column, direction = 'asc' } = sortConfig;
          const rowKeys = Object.keys(results[0]);
          const actualCol = rowKeys.find(k => k.toLowerCase() === column.toLowerCase()) || column;
          
          results.sort((a, b) => {
            const valA = a[actualCol] ?? '';
            const valB = b[actualCol] ?? '';
            let cmp = 0;
            if (typeof valA === 'number' && typeof valB === 'number') {
              cmp = valA - valB;
            } else {
              cmp = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
            }
            return direction === 'desc' ? -cmp : cmp;
          });
          console.log(`[SearchModal] Sorted by ${actualCol} ${direction}`);
        }

        this.renderResults(results);
      } catch (err) {
        this.onError(err);
        if (emptyDiv) emptyDiv.style.display = 'block';
      } finally {
        if (loadingDiv) loadingDiv.style.display = 'none';
      }
    }

    renderResults(results) {
      const resultsDiv = document.getElementById(`${this.prefix}-results`);
      const emptyDiv = document.getElementById(`${this.prefix}-empty`);
      if (!resultsDiv || !emptyDiv) return;

      if (!results || results.length === 0) {
        resultsDiv.innerHTML = '';
        emptyDiv.style.display = 'block';
        return;
      }

      emptyDiv.style.display = 'none';
      this.filteredResults = results;

      // Determine columns to display: use config.displayFields or all keys from first result
      let columns = [];
      if (this.currentConfig && this.currentConfig.displayFields) {
        columns = this.currentConfig.displayFields;
      } else {
        columns = Object.keys(results[0]).map(key => ({ key, label: key }));
      }

      const table = document.createElement('table');
      table.className = 'search-modal-themed__table';

      const thead = document.createElement('thead');
      const headRow = document.createElement('tr');
      const numTh = document.createElement('th');
      numTh.textContent = '#';
      numTh.className = 'search-modal-themed__th search-modal-themed__th--num';
      headRow.appendChild(numTh);

      columns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col.label;
        th.className = 'search-modal-themed__th';
        headRow.appendChild(th);
      });
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      const autoCloseOnRowClick = this.currentConfig?.autoCloseOnRowClick !== false;

      results.forEach((row, idx) => {
        const tr = document.createElement('tr');
        tr.className = 'search-modal-themed__tr' + (idx % 2 === 1 ? ' search-modal-themed__tr--odd' : '');
        tr.style.cursor = 'pointer';
        tr.onclick = () => {
          if (autoCloseOnRowClick) {
            this.selectResult(idx);
            return;
          }
          this.setSelected(idx);
        };

        const numTd = document.createElement('td');
        numTd.textContent = idx + 1;
        numTd.className = 'search-modal-themed__td search-modal-themed__td--num';
        tbody.appendChild(tr);
        tr.appendChild(numTd);

        columns.forEach(col => {
          const td = document.createElement('td');
          td.className = 'search-modal-themed__td';

          // Case-insensitive key lookup
          const rowKeys = Object.keys(row);
          const targetKey = col.key.toLowerCase();
          const actualKey = rowKeys.find(k => k.toLowerCase() === targetKey);

          let val = actualKey ? row[actualKey] : '';

          // Special fallback for Name/ClientName common mismatch
          if (!val && targetKey === 'name') {
            const nameKey = rowKeys.find(k => k.toLowerCase() === 'clientname');
            if (nameKey) val = row[nameKey];
          }
          if (!val && targetKey === 'clientname') {
            const nameKey = rowKeys.find(k => k.toLowerCase() === 'name');
            if (nameKey) val = row[nameKey];
          }

          td.textContent = val || '';
          tr.appendChild(td);
        });
      });
      table.appendChild(tbody);

      resultsDiv.innerHTML = '';
      resultsDiv.appendChild(table);
      resultsDiv.style.display = 'block';
    }

    selectResult(index) {
      if (!this.filteredResults || !this.filteredResults[index]) return;
      const record = this.filteredResults[index];
      if (typeof this.currentConfig?.onSelect === 'function') {
        this.currentConfig.onSelect(record);
      }
      this.close();
    }
  }

  global.SearchModal = SearchModal;
})(window);
