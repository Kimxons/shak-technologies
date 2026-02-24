(function () {
  // ============================================================================
  // SIDEBAR SECTION TOGGLE
  // ============================================================================
  function setSectionOpen(sectionEl, isOpen) {
    if (!sectionEl) return;
    const header = sectionEl.querySelector('.nav-header, .nav-header--card');
    const arrow = sectionEl.querySelector('.nav-arrow, .nav-arrow--card');
    const items = sectionEl.querySelector('.nav-items, .nav-items--card');
    if (isOpen) {
      sectionEl.classList.add('is-open');
      if (arrow) arrow.setAttribute('aria-expanded', 'true');
      if (items) items.removeAttribute('hidden');
    } else {
      sectionEl.classList.remove('is-open');
      if (arrow) arrow.setAttribute('aria-expanded', 'false');
      if (items) items.setAttribute('hidden', '');
    }
  }

  function wireNavSections() {
    document.querySelectorAll('[data-nav-section]').forEach(section => {
      const header = section.querySelector('.nav-header, .nav-header--card');
      const arrow = section.querySelector('.nav-arrow, .nav-arrow--card');
      if (!header) return;

      const toggle = () => {
        const isOpen = section.classList.contains('is-open');
        // Close all other sections (accordion behavior)
        document.querySelectorAll('[data-nav-section]').forEach(other => {
          if (other !== section) setSectionOpen(other, false);
        });
        setSectionOpen(section, !isOpen);
      };

      header.style.cursor = 'pointer';
      header.addEventListener('click', e => {
        if (e.target.closest('.nav-arrow, .nav-arrow--card')) return;
        toggle();
      });
      if (arrow) {
        arrow.addEventListener('click', e => {
          e.stopPropagation();
          toggle();
        });
      }
    });
  }

  // ============================================================================
  // SIDEBAR COLLAPSE TOGGLE
  // ============================================================================
  function wireSidebarToggle() {
    const sidebar = document.getElementById('main-sidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    if (!sidebar || !toggleBtn) return;

    toggleBtn.addEventListener('click', () => {
      const isCollapsed = sidebar.classList.toggle('collapsed');
      toggleBtn.setAttribute('aria-expanded', String(!isCollapsed));
      const icon = toggleBtn.querySelector('i');
      if (icon) {
        icon.classList.toggle('bi-list', !isCollapsed);
        icon.classList.toggle('bi-x-lg', isCollapsed);
      }
    });
  }

  // ============================================================================
  // COLLAPSIBLE FORM SECTIONS
  // ============================================================================
  function wireCollapsibleSections() {
    document.querySelectorAll('.form-section[data-section]').forEach(section => {
      const toggle = section.querySelector('[data-section-toggle]');
      const content = section.querySelector('[data-section-content]');
      const btn = section.querySelector('.section-toggle-btn');
      if (!toggle || !content) return;

      const setOpen = (open) => {
        section.classList.toggle('is-collapsed', !open);
        content.hidden = !open;
        if (btn) {
          btn.setAttribute('aria-expanded', String(open));
          const icon = btn.querySelector('i');
          if (icon) {
            icon.classList.toggle('bi-chevron-up', open);
            icon.classList.toggle('bi-chevron-down', !open);
          }
        }
      };

      toggle.style.cursor = 'pointer';
      toggle.addEventListener('click', e => {
        if (e.target.closest('button, input, select, a')) return;
        setOpen(section.classList.contains('is-collapsed'));
      });
      if (btn) {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          setOpen(section.classList.contains('is-collapsed'));
        });
      }
    });
  }

  // ============================================================================
  // SUBMODULE SEARCH
  // ============================================================================
  function wireSubmoduleSearch() {
    const searchInput = document.getElementById('submoduleSearch');
    const clearBtn = document.getElementById('submoduleSearchClear');
    if (!searchInput) return;

    const allItems = Array.from(document.querySelectorAll('.sidebar-item, .sidebar-item--enhanced'));
    const allSections = Array.from(document.querySelectorAll('[data-nav-section]'));

    const performSearch = () => {
      const query = searchInput.value.trim().toLowerCase();
      if (clearBtn) clearBtn.hidden = !query;

      if (!query) {
        // Reset: show all items, collapse all sections
        allItems.forEach(item => item.style.display = '');
        allSections.forEach(section => setSectionOpen(section, false));
        return;
      }

      // Filter items
      allItems.forEach(item => {
        const text = (item.textContent || '').toLowerCase();
        item.style.display = text.includes(query) ? '' : 'none';
      });

      // Expand sections that have visible items
      allSections.forEach(section => {
        const visibleItems = section.querySelectorAll('.sidebar-item:not([style*="display: none"]), .sidebar-item--enhanced:not([style*="display: none"])');
        setSectionOpen(section, visibleItems.length > 0);
      });
    };

    searchInput.addEventListener('input', performSearch);
    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        performSearch();
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        performSearch();
        searchInput.focus();
      });
    }
  }

  // Initialize sidebar functionality
  document.addEventListener('DOMContentLoaded', () => {
    wireNavSections();
    wireSidebarToggle();
    wireCollapsibleSections();
    wireSubmoduleSearch();
  });
})();

(function () {
  // =========================================================================
  // CHILD FORMS - Account Maintenance Pattern
  // =========================================================================
  const CHILD_FORMS = {
    // Data Entry
    'special-interest-rates': '../data-entry/special-interest-rates.html',
    'interest-payment': '../data-entry/interest-payment.html',
    'receipt-lost-marking': '../data-entry/receipt-lost-marking.html',
    'renew-receipt': '../data-entry/renew-receipt.html',
    'close-receipt': '../data-entry/close-receipt.html',
    'lien-marking': '../data-entry/lien-marking.html',
    // View
    'deposit-portfolio': '../view/deposit-portfolio.html',
    'receipt-statement': '../view/receipt-statement.html'
  };

  // Forms that require a loaded deposit before navigation
  const DEPOSIT_REQUIRED_FORMS = [
    'special-interest-rates', 'interest-payment', 'receipt-lost-marking',
    'renew-receipt', 'close-receipt', 'lien-marking',
    'deposit-portfolio', 'receipt-statement'
  ];

  // Helper to get overlay elements
  function getOverlayEls() {
    return {
      overlay: document.querySelector('[data-child-inline]'),
      iframe: document.querySelector('[data-child-iframe]'),
      mainForm: document.querySelector('[data-main-form]'),
      mainContainer: document.querySelector('.main-container')
    };
  }

  // Toggle child overlay visibility with animations
  function setOverlayOpen(isOpen) {
    const { overlay, mainForm, mainContainer } = getOverlayEls();
    if (!overlay || !mainContainer) return;

    if (isOpen) {
      mainContainer.classList.add('child-opening');
      overlay.hidden = false;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          mainContainer.classList.add('child-open');
          overlay.classList.add('is-visible');
          overlay.classList.remove('is-closing');

          setTimeout(() => {
            mainContainer.classList.remove('child-opening');
          }, 350);
        });
      });
    } else {
      mainContainer.classList.remove('child-opening');
      overlay.classList.add('is-closing');
      overlay.classList.remove('is-visible');

      setTimeout(() => {
        mainContainer.classList.remove('child-open');
        overlay.hidden = true;
        overlay.classList.remove('is-closing');
      }, 350);
    }
  }

  // Open a child form in the inline overlay
  function openChildForm(childKey) {
    const path = CHILD_FORMS[childKey];
    const { iframe } = getOverlayEls();
    if (!path || !iframe) return;

    // Check if this form requires a loaded deposit
    if (DEPOSIT_REQUIRED_FORMS.includes(childKey)) {
      const accountId = document.getElementById('AccountId')?.value?.trim();
      if (!accountId) {
        alert('Please load a deposit account before accessing this feature.');
        return;
      }
    }

    // Show loading state and load the iframe
    iframe.onload = function () {
      // Theme vars can be applied here if needed
    };
    const cacheBust = `v=${Date.now()}`;
    const separator = path.includes('?') ? '&' : '?';
    iframe.src = `${path}${separator}${cacheBust}`;
    setOverlayOpen(true);
  }

  // Close child form
  function closeChildForm() {
    const { iframe } = getOverlayEls();
    if (iframe) iframe.src = 'about:blank';
    setOverlayOpen(false);
  }

  // Expose closeChildForm globally for child forms to call
  window.closeChildForm = closeChildForm;

  // Wire sidebar items with data-child-form (Account Maintenance pattern)
  document.querySelectorAll('.sidebar-item[data-child-form], .sidebar-item--enhanced[data-child-form]').forEach(item => {
    item.addEventListener('click', function (e) {
      e.stopPropagation();

      const sidebar = document.getElementById('main-sidebar');
      const mainContainer = document.querySelector('.main-container');
      const toggle = document.getElementById('sidebarToggle');
      const isCollapsed = sidebar && sidebar.classList.contains('collapsed');

      // If sidebar is collapsed, expand it first
      if (isCollapsed) {
        sidebar.classList.remove('collapsed');
        if (mainContainer) mainContainer.classList.remove('sidebar-collapsed');
        if (toggle) toggle.setAttribute('aria-expanded', 'true');
      }

      // Set active state
      document.querySelectorAll('.sidebar-item[data-child-form], .sidebar-item--enhanced[data-child-form]').forEach(i => i.classList.remove('active'));
      this.classList.add('active');

      const childKey = this.getAttribute('data-child-form');
      if (childKey) openChildForm(childKey);
    });
  });

  // Allow the iframe (child screens) to request close via postMessage
  window.addEventListener('message', (event) => {
    const data = event && event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'depositMaintenanceChildClose') {
      closeChildForm();
    }
  });

  // Close child form on Escape key
  document.addEventListener('keydown', (e) => {
    const { overlay } = getOverlayEls();
    if (e.key === 'Escape' && overlay && !overlay.hidden) {
      closeChildForm();
    }
  });
})();

(function () {
  document.querySelectorAll(".cm-dataentry-toggle[aria-controls]").forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const targetId = toggle.getAttribute("aria-controls");
      if (!targetId) return;

      const list = document.getElementById(targetId);
      if (!list) return;

      const isExpanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!isExpanded));
      list.classList.toggle("is-collapsed", isExpanded);
    });
  });
})();

(function (global) {
  const normalizeKey = (value) => {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  };

  const buildRecordIndex = (record) => {
    const index = new Map();
    if (!record || typeof record !== "object") return index;
    Object.keys(record).forEach((key) => {
      index.set(normalizeKey(key), key);
    });
    return index;
  };

  const coerceBoolean = (value) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    const text = String(value ?? "").trim().toLowerCase();
    return text === "y" || text === "yes" || text === "true" || text === "1";
  };

  const formatDateISO = (value) => {
    if (!value) return "";
    const text = String(value);
    const match = text.match(/^\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : text;
  };

  const formatDateDisplay = (value) => {
    const iso = formatDateISO(value);
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
    const [yyyy, mm, dd] = iso.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthIdx = Math.max(0, Math.min(11, Number(mm) - 1));
    return `${dd}/${months[monthIdx]}/${yyyy}`;
  };

  const addSelectOptionIfMissing = (selectEl, value) => {
    if (!selectEl || selectEl.tagName !== "SELECT") return;
    const v = value == null ? "" : String(value);
    if (v === "") return;
    const exists = Array.from(selectEl.options).some((o) => o.value === v);
    if (exists) return;
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = /^\d{4}-\d{2}-\d{2}/.test(v) ? formatDateDisplay(v) : v;
    selectEl.appendChild(opt);
  };

  const getMappedKeyCandidates = (keyMapValue) => {
    if (!keyMapValue) return [];
    if (Array.isArray(keyMapValue)) return keyMapValue;
    return [keyMapValue];
  };

  const extractMergedRecord = (response) => {
    // Primary: Look for data.Details01 (the main deposit data)
    const payload = response?.data && typeof response.data === "object" ? response.data : response;
    
    if (payload && typeof payload === "object") {
      // Prefer Details01 which contains the actual deposit record
      if (Array.isArray(payload.Details01) && payload.Details01.length) {
        return payload.Details01[0];
      }
      
      // Find other DetailsXX keys (Details02, Details03, etc.), sort numerically
      const detailKeys = Object.keys(payload).filter(k => /^Details\d+$/i.test(k));
      detailKeys.sort((a, b) => Number(a.replace(/\D/g, "")) - Number(b.replace(/\D/g, "")));
      for (const key of detailKeys) {
        const arr = payload[key];
        if (Array.isArray(arr) && arr.length && arr[0].AccountID) return arr[0];
      }
      
      // Fallback to Details only if it has meaningful data (not just event tracking)
      if (Array.isArray(payload.Details) && payload.Details.length) {
        const detail = payload.Details[0];
        if (detail && detail.AccountID) return detail;
      }
    }
    
    // Fallback to response.Details if it has meaningful data
    if (Array.isArray(response?.Details) && response.Details.length) {
      const detail = response.Details[0];
      if (detail && detail.AccountID) return detail;
    }
    
    // Fallback to response.data as array
    if (Array.isArray(response?.data) && response.data.length) return response.data[0];
    
    return null;
  };

  const bindRecordToForm = (form, record, keyMap = {}) => {
    if (!form || !record || typeof record !== "object") return;

    const recordIndex = buildRecordIndex(record);
    const fields = Array.from(form.querySelectorAll("input, select, textarea"));

    fields.forEach((field) => {
      const rawKey = field.id || field.name;
      if (!rawKey) return;

      const mapped = keyMap[rawKey] || keyMap[field.id] || keyMap[field.name] || null;
      let recordKey = null;

      for (const candidate of getMappedKeyCandidates(mapped)) {
        const k = recordIndex.get(normalizeKey(candidate));
        if (k) {
          recordKey = k;
          break;
        }
      }

      if (!recordKey) recordKey = recordIndex.get(normalizeKey(rawKey)) || null;
      if (!recordKey) return;

      const value = record[recordKey];
      if (field.type === "checkbox") {
        field.checked = coerceBoolean(value);
        return;
      }
      if (field.tagName === "SELECT") {
        const nextValue = value == null ? "" : String(value);
        addSelectOptionIfMissing(field, nextValue);
        field.value = nextValue;
        return;
      }

      const stringValue = value == null ? "" : String(value);
      const shouldFormatDate =
        /^\d{4}-\d{2}-\d{2}/.test(stringValue) && /(date|from|to|upto|accru)/i.test(rawKey);
      field.value = shouldFormatDate ? formatDateDisplay(stringValue) : stringValue;
    });
  };

  const initViewBinding = () => {
    const form = document.getElementById("deposit-maintenance-form");
    if (!form) return;

    const viewBtn = document.querySelector('[data-dm-action="view"]');
    if (!viewBtn) return;

    viewBtn.addEventListener("click", async () => {
      const branchId = String(document.getElementById("BranchId")?.value || "").trim();
      const accountId = String(document.getElementById("AccountId")?.value || "").trim();

      if (!branchId || !accountId) {
        console.warn("[DepositMaintenance] Enter Branch ID and Account ID first.");
        return;
      }

      if (!global.ServiceLoader?.loadDepositService) {
        console.error("[DepositMaintenance] ServiceLoader.loadDepositService is not available.");
        return;
      }

      await global.ServiceLoader.loadDepositService();
      if (!global.DepositService?.getDepositAccountDetails) {
        console.error("[DepositMaintenance] DepositService.getDepositAccountDetails is not available.");
        return;
      }

      const session = global.AuthService?.getSession?.() || null;
      const operatorId = session?.operatorID || session?.OperatorID || session?.operatorId || "";
      const bankId = session?.bankID || session?.BankID || global.Environment?.BankID || global.Environment?.bankID || "00";

      const requestData = {
        BankID: bankId,
        OurBranchID: branchId,
        AccountID: accountId,
        OperatorID: operatorId
      };

      const response = await global.DepositService.getDepositAccountDetails(requestData);
      global.__dmLastGetDepositAccountDetailsResponse = response;
      console.log("[DepositMaintenance] GetDepositAccountDetails response:", response);

      if (!response?.success) {
        console.error("[DepositMaintenance] GetDepositAccountDetails failed:", response);
        return;
      }

      const record1 = extractMergedRecord(response);
      global.__dmLastDepositAccountRecord = record1;
      if (!record1) {
        console.warn("[DepositMaintenance] No record returned from first SP.");
        return;
      }

      // Now call the second SP for additional data
      if (!global.DepositService?.getFDAccountDetails) {
        console.error("[DepositMaintenance] DepositService.getFDAccountDetails is not available.");
        return;
      }

      const requestData2 = {
        BankID: '00',
        OurBranchID: '1201',
        ClientID: record1.ClientID || record1.ClientId || "",
        AccountID: accountId,
        ReceiptID: record1.ReceiptID || record1.ReceiptId || "",
        SerialID: 0, // Assuming default value; adjust if needed
        Direction: 0, // Assuming default; adjust if needed
        DirectionType: "S", // Assuming default; adjust if needed
        OperatorID: 'JOY_WANJA'
      };

      const response2 = await global.DepositService.getFDAccountDetails(requestData2);
      global.__dmLastGetFDAccountDetailsResponse = response2;
      console.log("[DepositMaintenance] GetFDAccountDetails response:", response2);

      let mergedRecord = record1;
      if (response2?.success) {
        const record2 = extractMergedRecord(response2);
        global.__dmLastFDAccountRecord = record2;
        mergedRecord = { ...record1, ...(record2 || {}) };
        global.__dmLastMergedDepositRecord = mergedRecord;
      } else {
        // If the second SP fails, show a warning and use only the first record
        global.__dmLastFDAccountRecord = null;
        global.__dmLastMergedDepositRecord = record1;
        if (response2?.message) {
          alert("Warning: Additional details could not be loaded.\n" + response2.message);
        } else {
          alert("Warning: Additional details could not be loaded due to a timeout or error.");
        }
      }

      const keyMap = {
        // Receipt Details Tab - Main Fields
        BranchId: ["OperationalACBranchID", "OurBranchID", "BranchID", "BranchId"],
        BranchName: ["OperationalACBranchName", "BranchName", "OurBranchName", "OurBranchDesc"],
        ClientId: ["ClientID", "ClientId", "CustomerID"],
        ClientName: ["Name", "ClientName", "CustomerName"],
        ProductId: ["ProductID", "ProductId"],
        ProductName: ["ProductName", "ProductDesc"],
        AccountId: ["AccountID", "AccountId"],
        AccountName: ["AccountName", "AccountTitle", "AcctName"],
        OperationalAcBranch: ["OperationalACBranchID", "OurBranchID"],
        OperationalAcId: ["OperationalAccountID", "OperationalACID"],
        ReceiptId: ["ReceiptID", "ReceiptId"],
        Series: ["SerialID", "Series"],
        ValueDate: ["StartDate", "ValueDate", "ValueDt"],
        ReceiptDate: ["StartDate", "ReceiptDate", "RcptDate"],
        ReceiptAmount: ["Amount", "ReceiptAmount", "RcptAmount"],
        CurrencyId: ["CurrencyID", "CurrencyId", "CurrencyCode"],
        Term: ["Term", "TermDays"],
        InterestRate: ["InterestRate", "IntRate", "Rate"],
        FundPoolId: ["FundPoolID", "FundPoolId"],
        Remarks: ["Remarks", "Notes", "Comment"],
        MaturityDate: ["MatureDate", "MaturityDate", "EndDate", "MaturityDt"],
        CalculationMethod: ["CalculationMethodID", "CalculationMethod"],
        MaturityAmount: ["MaturityAmount", "MaturityAmt"],
        CompoundingFrequency: ["CompFrequencyID", "CompoundingFrequency", "CompFrequency"],
        Tax: ["TaxAmount", "Tax"],
        DayCountBasis: ["DayCountBasisID", "DayCountBasis"],

        // Instruction Tab
        InterestCreditInstruction: ["InterestCreditInstruction", "IntCreditInstruction"],
        RenewalInstruction: ["RenewalInstruction", "RenewInstruction"],
        Frequency: ["InterestFrequency", "Frequency", "IntFrequency"],
        RenewalMode: ["RenewalMode", "RenewMode"],
        RenewalReceiptAmount: ["RenewalAmount", "RenewalReceiptAmount", "RenewAmount"],
        RenewalTerm: ["RenewalTerm", "RenewTerm"],
        NoOfRenewals: ["NoRenewals", "NoOfRenewals", "NumberOfRenewals"],
        RenewalsRateType: ["RenewalRateTyPe", "RenewalsRateType", "RenewalRateType"],

        // Behind The Scene
        Status: ["StatusID", "RecStatus", "Status"],
        BtsProductId: ["ProductID", "ProductId"],
        AccruedInterest: ["InterestAccrued", "AccruedInterest", "AccruedInt"],
        AccruedUpto: ["AccruedUpto", "AccruedUpTo", "AccruedDate"],
        AccruedTax: ["AccruedTax", "TaxAccrued"],
        ReceiptDays: ["ReceiptDays", "RcptDays", "Days"],
        TotalInterestPaid: ["InterestPaid", "TotalInterestPaid", "IntPaid"],
        TaxCollected: ["TaxCollected", "TotalTaxCollected"],
        InterestPaidUpto: ["InterestPaidUpto", "IntPaidUpto", "InterestPaidUpTo"],
        NextInterestPaymentDate: ["NextInstPayment", "NextInterestPaymentDate", "NextIntPayment"],
        ClearBalance: ["ClearBalance", "ClearBal", "AvailableBalance"],
        TotalLien: ["TotalLien", "LienTotal", "LienAmount"],
        ClosedDate: ["ClosedDate", "CloseDate", "ClosingDate"],
        AnnualizedInterestRate: ["AnnualInterestRate", "AnnualizedInterestRate", "AnnualRate"],
        CreatedBy: ["CreatedBy", "CreatedByID"],
        CreatedOn: ["CreatedOn", "CreatedDate", "CreateDate"],
        ModifiedBy: ["ModifiedBy", "ModifiedByID"],
        ModifiedOn: ["ModifiedOn", "ModifiedDate", "ModifyDate"],
        SupervisedBy: ["SupervisedBy", "SupervisedByID"],
        SupervisedOn: ["SupervisedOn", "SupervisedDate"]
      };

      bindRecordToForm(form, mergedRecord, keyMap);
      console.info("[DepositMaintenance] Deposit account details loaded (merged from both SPs).");
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initViewBinding);
  } else {
    initViewBinding();
  }
})(window);
