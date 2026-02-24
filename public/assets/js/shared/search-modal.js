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
      return `<div id="{{prefix}}-search-modal" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.45); z-index: 9999; justify-content: center; align-items: center;">
  <div style="background:#fff; border-radius:6px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); max-width:900px; width:90%; max-height:80vh; display:flex; flex-direction:column;">
    <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 20px; border-bottom:1px solid #e0e0e0; background: linear-gradient(90deg, #1e7cc4 0%, #1a6ba3 100%);">
      <h5 id="{{prefix}}-title" style="margin:0; font-size:16px; font-weight:600; color:#ffffff;">Search Results</h5>
      <button type="button" id="{{prefix}}-close" style="background:none; border:none; font-size:22px; cursor:pointer; color:#ffffff;">&times;</button>
    </div>
    <div style="padding:12px 20px; border-bottom:1px solid #e0e0e0;">
      <div id="{{prefix}}-criteria" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:12px;"></div>
      <div style="text-align:center; margin-top:10px;">
        <button type="button" id="{{prefix}}-search-btn" style="padding:6px 28px; background:#e0e0e0; border:1px solid #999; border-radius:3px; cursor:pointer; font-size:13px; font-weight:500;">Search</button>
      </div>
    </div>
    <div style="flex:1; overflow-y:auto; padding:12px 20px;">
      <div id="{{prefix}}-loading" style="text-align:center; padding:24px; color:#666; display:none;">Loading...</div>
      <div id="{{prefix}}-results" style="display:none;"></div>
      <div id="{{prefix}}-empty" style="display:none; text-align:center; padding:24px; color:#999;">No records found</div>
    </div>
    <div style="padding:10px 16px; border-top:1px solid #e0e0e0; background: linear-gradient(90deg, #1e7cc4 0%, #1a6ba3 100%); display:flex; justify-content:center;">
      <button type="button" id="{{prefix}}-ok" style="padding:6px 24px; background:#e0e0e0; border:1px solid #999; border-radius:3px; cursor:pointer; font-size:13px; font-weight:500;">OK</button>
    </div>
  </div>
</div>`;
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
        const base = tr.dataset.baseBg || (idx % 2 === 0 ? '#ffffff' : '#e8f4ff');
        if (idx === index) {
          tr.style.background = '#bfe0ff';
        } else {
          tr.style.background = base;
        }
      });
    }

    renderCriteria(fields) {
      const container = document.getElementById(`${this.prefix}-criteria`);
      if (!container) return;
      container.innerHTML = fields.map(field => `
        <div style="display:flex; flex-direction:column; gap:4px;">
          <label style="font-size:12px; font-weight:500; color:#555;">${field.label}</label>
          <div style="display:flex; gap:8px;">
            <select data-search-mode="${field.name}" style="padding:4px 8px; border:1px solid #ccc; border-radius:3px; font-size:13px; flex:0 0 80px;">
              <option value="Like">Like</option>
              <option value="Exact">Exact</option>
            </select>
            <input type="text" data-search-field="${field.name}" data-search-column="${field.column}" placeholder="Enter ${field.label}" value="${field.value || ''}" style="flex:1; padding:4px 8px; border:1px solid #ccc; border-radius:3px; font-size:13px;" />
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
      const payload = {
        TableID: this.currentConfig.tableID,
        WhereStmt: whereStmt,
        PrevOrNext: '1',
        RefID: '',
        OperatorID: this.getOperatorId(),
        ModuleID: this.moduleID,
        OurBranchID: this.getOurBranchId(),
        AdvFilterString: this.currentConfig.advFilterString || '',
        SearchKey: this.currentConfig.searchKey || ''
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
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      table.style.fontSize = '13px';

      const thead = document.createElement('thead');
      const headRow = document.createElement('tr');
      headRow.style.background = 'linear-gradient(to bottom, #4a90e2, #357abd)';
      headRow.style.color = 'white';

      const numTh = document.createElement('th');
      numTh.textContent = '#';
      numTh.style.padding = '8px';
      numTh.style.textAlign = 'center';
      numTh.style.border = '1px solid #2868ab';
      numTh.style.fontWeight = '600';
      numTh.style.width = '40px';
      headRow.appendChild(numTh);

      columns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col.label;
        th.style.padding = '8px';
        th.style.textAlign = 'left';
        th.style.border = '1px solid #2868ab';
        th.style.fontWeight = '600';
        headRow.appendChild(th);
      });
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      const autoCloseOnRowClick = this.currentConfig?.autoCloseOnRowClick !== false;

      results.forEach((row, idx) => {
        const tr = document.createElement('tr');
        const rowColor = idx % 2 === 0 ? '#ffffff' : '#e8f4ff';
        tr.dataset.baseBg = rowColor;
        tr.style.background = rowColor;
        tr.style.cursor = 'pointer';
        tr.onmouseover = () => {
          if (this.selectedIndex === idx && !autoCloseOnRowClick) return;
          tr.style.background = '#d0e8ff';
        };
        tr.onmouseout = () => {
          if (this.selectedIndex === idx && !autoCloseOnRowClick) {
            tr.style.background = '#bfe0ff';
            return;
          }
          tr.style.background = rowColor;
        };
        tr.onclick = () => {
          if (autoCloseOnRowClick) {
            this.selectResult(idx);
            return;
          }
          this.setSelected(idx);
        };

        const numTd = document.createElement('td');
        numTd.textContent = idx + 1;
        numTd.style.padding = '6px 8px';
        numTd.style.textAlign = 'center';
        numTd.style.border = '1px solid #ddd';
        tbody.appendChild(tr);
        tr.appendChild(numTd);

        columns.forEach(col => {
          const td = document.createElement('td');

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
          td.style.padding = '6px 8px';
          td.style.border = '1px solid #ddd';
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
