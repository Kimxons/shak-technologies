/**
 * Graphical Client Portfolio Module
 * Displays portfolio analysis through interactive Highcharts visualizations
 * Migrated from legacy frmGraphicalClientPortifolio.js
 */

(function () {
  'use strict';

  // ==================== CONFIGURATION ====================
  const Environment = window.Environment || {};
  const BASE_URL = (Environment.baseUrlClient || Environment.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "");
  const ENDPOINT = `${BASE_URL}/api/OldAPI`;
  
  console.log('[GraphicalClientPortfolio] Using endpoint:', ENDPOINT);

  // ==================== STATE ====================
  let portfolioState = {
    clientID: null,
    branchID: null,
    ourBranchID: null,
    operatorID: null,
    workingDate: null,
    selectedPortfolioType: null,
    selectedProductTypeID: null,
    fromDate: null,
    toDate: null,
    chartData: null,
    productTypes: [],
    statistics: {
      totalAccounts: 0,
      totalBalance: 0,
      averageBalance: 0,
      highestBalance: 0
    }
  };


  // ==================== INITIALIZATION ====================

  // ==================== CONTEXT RETRIEVAL (MATCHING OTHER SUBMODULES) ====================
  /**
   * Retrieves customer query context from multiple sources with fallbacks
   * Priority: CustomerQueryState → selectedAccount → direct field access → hidden fields
   */
  function getCustomerQueryContext() {
    // 1. Try CustomerQueryState from parent window
    try {
      if (window.parent && window.parent.CustomerQueryState) {
        const state = window.parent.CustomerQueryState;
        if (state && state.selectedAccount) {
          return state.selectedAccount;
        }
      }
    } catch (e) {}

    // 2. Try selectedAccount from parent window
    try {
      if (window.parent && window.parent.selectedAccount) {
        return window.parent.selectedAccount;
      }
    } catch (e) {}

    // 3. Try direct field access from parent document
    try {
      if (window.parent && window.parent.document) {
        const doc = window.parent.document;
        const clientID = doc.getElementById('txtClientId')?.value || '';
        const clientName = doc.getElementById('txtClientDescription')?.value || '';
        const branchID = doc.getElementById('txtBranchId')?.value || '';
        if (clientID) {
          return {
            ClientID: clientID,
            ClientName: clientName,
            OurBranchID: branchID
          };
        }
      }
    } catch (e) {}

    // 4. Try hidden fields in this document
    try {
      const clientID = document.getElementById('clientID')?.value || '';
      const clientName = document.getElementById('clientName')?.value || '';
      const branchID = document.getElementById('branchID')?.value || '';
      if (clientID) {
        return {
          ClientID: clientID,
          ClientName: clientName,
          OurBranchID: branchID
        };
      }
    } catch (e) {}

    return null;
  }

  document.addEventListener('DOMContentLoaded', function () {
    console.log('[GraphicalClientPortfolio] Module initializing...');
    initializeEventListeners();
    loadPortfolioDefaults();
  });

  function initializeEventListeners() {
    console.log('[GraphicalClientPortfolio] Initializing event listeners');

    // Section toggle functionality
    document.querySelectorAll('[data-section-toggle]').forEach(header => {
      header.addEventListener('click', function() {
        const btn = this.querySelector('.section-toggle-btn');
        const content = this.nextElementSibling;
        if (content && content.hasAttribute('data-section-content')) {
          const isHidden = content.hasAttribute('hidden');
          if (isHidden) {
            content.removeAttribute('hidden');
            btn.innerHTML = '<i class="bi bi-chevron-up"></i>';
          } else {
            content.setAttribute('hidden', '');
            btn.innerHTML = '<i class="bi bi-chevron-down"></i>';
          }
        }
      });
    });

    const portfolioTypeSelect = document.getElementById('portfolioType');
    const productTypeSelect = document.getElementById('productType');
    const btnView = document.getElementById('btnView');
    const btnClear = document.getElementById('btnClear');
    const btnPrint = document.getElementById('btnPrint');
    const btnRefresh = document.getElementById('btnRefresh');
    const btnCloseHeader = document.getElementById('btnCloseHeader');
    const btnExport = document.getElementById('btnExport');

    console.log('[GraphicalClientPortfolio] Elements found:', {
      portfolioTypeSelect: !!portfolioTypeSelect,
      productTypeSelect: !!productTypeSelect,
      btnView: !!btnView,
      btnClear: !!btnClear
    });

    if (portfolioTypeSelect) {
      portfolioTypeSelect.addEventListener('change', onPortfolioTypeChange);
      console.log('[GraphicalClientPortfolio] Portfolio type change listener added');
    } else {
      console.error('[GraphicalClientPortfolio] Portfolio type select not found!');
    }

    if (productTypeSelect) {
      productTypeSelect.addEventListener('change', () => {
        portfolioState.selectedProductTypeID = productTypeSelect.value;
        console.log('[GraphicalClientPortfolio] Product type changed:', portfolioState.selectedProductTypeID);
      });
    }

    if (btnView) {
      btnView.addEventListener('click', onViewClick);
      console.log('[GraphicalClientPortfolio] View button click listener added');
    } else {
      console.error('[GraphicalClientPortfolio] View button not found!');
    }

    if (btnClear) {
      btnClear.addEventListener('click', onClearClick);
      console.log('[GraphicalClientPortfolio] Clear button click listener added');
    }

    if (btnPrint) {
      btnPrint.addEventListener('click', printChart);
    }

    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => {
        console.log('[GraphicalClientPortfolio] Refresh clicked');
        location.reload();
      });
    }

    if (btnCloseHeader) {
      btnCloseHeader.addEventListener('click', () => {
        console.log('[GraphicalClientPortfolio] Close clicked');
        window.parent.postMessage('close-graphical-client-portfolio', '*');
      });
    }

    if (btnExport) {
      btnExport.addEventListener('click', exportChart);
    }

    console.log('[GraphicalClientPortfolio] Event listeners initialized');
  }

  function loadPortfolioDefaults() {
    console.log('[GraphicalClientPortfolio] Loading portfolio defaults');

    // Use robust context retrieval
    const context = getCustomerQueryContext();
    // Require AccountID and OurBranchID, just like Account Guarantors
    if (!context || !context.AccountID || !context.OurBranchID) {
      const main = document.querySelector('.main-container');
      if (main) {
        main.innerHTML = '<div class="alert alert-danger m-4">Unable to retrieve account context (AccountID/OurBranchID) from parent window. Please select an account and re-open from Customer Query.</div>';
      }
      return;
    }

    portfolioState.workingDate = getWorkingDate();
    portfolioState.clientID = context.ClientID;
    portfolioState.branchID = context.OurBranchID || context.BranchID || '';
    portfolioState.ourBranchID = context.OurBranchID || context.BranchID || '';
    portfolioState.clientName = context.ClientName || '';
    portfolioState.operatorID = getOperatorId();
    portfolioState.accountID = context.AccountID;

    // Set hidden fields for fallback (if present)
    if (document.getElementById('clientID')) document.getElementById('clientID').value = portfolioState.clientID;
    if (document.getElementById('clientName')) document.getElementById('clientName').value = portfolioState.clientName;
    if (document.getElementById('branchID')) document.getElementById('branchID').value = portfolioState.branchID;

    // Set default dates (both always visible like legacy)
    const toDateInput = document.getElementById('toDate');
    const fromDateInput = document.getElementById('fromDate');
    if (toDateInput && portfolioState.workingDate) {
      toDateInput.value = portfolioState.workingDate;
    }
    if (fromDateInput && portfolioState.workingDate) {
      fromDateInput.value = portfolioState.workingDate;
    }

    // Load dropdowns from database using LookupService
    Promise.all([
      loadPortfolioTypesFromDatabase(),
      loadProductTypesFromDatabase()
    ]).then(() => {
      console.log('[GraphicalClientPortfolio] All dropdowns loaded successfully');
    }).catch(error => {
      console.error('[GraphicalClientPortfolio] Error loading dropdowns:', error);
    });
  }

  // ==================== CONTEXT RETRIEVAL ====================
  function getParentState() {
    if (window.parent && window.parent.CustomerQueryState) {
      return window.parent.CustomerQueryState;
    }
    if (window.parent && window.parent.selectedAccount) {
      return window.parent.selectedAccount;
    }
    return {};
  }

  function getWorkingDate() {
    if (window.parent && window.parent.WorkingDate) {
      return window.parent.WorkingDate;
    }
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  function getOperatorId() {
    if (window.parent && window.parent.OperatorID) {
      return window.parent.OperatorID;
    }
    if (typeof getOperatorID === 'function') {
      try {
        return getOperatorID();
      } catch (e) {
        console.log('[GraphicalClientPortfolio] getOperatorID() not available');
      }
    }
    if (window.OperatorID) {
      return window.OperatorID;
    }
    return '1';
  }

  // ==================== PRODUCT TYPES LOADING ====================
  /**
   * Load Report Type (Portfolio Type) from database using LookupService
   * CodeID: ClientPortfolioType
   */
  function loadPortfolioTypesFromDatabase() {
    console.log('[GraphicalClientPortfolio] Loading portfolio types from database');

    return new Promise((resolve, reject) => {
      if (!window.LookupService) {
        console.warn('[GraphicalClientPortfolio] LookupService not available, using fallback');
        loadFallbackPortfolioTypes();
        resolve();
        return;
      }

      LookupService.getSystemCodeOptions('PortifolioReportType')
        .then(options => {
          console.log('[GraphicalClientPortfolio] Portfolio types loaded:', options);
          if (options && options.length > 0) {
            populatePortfolioTypeDropdown(options);
            resolve();
          } else {
            console.warn('[GraphicalClientPortfolio] No portfolio types returned, using fallback');
            loadFallbackPortfolioTypes();
            resolve();
          }
        })
        .catch(error => {
          console.error('[GraphicalClientPortfolio] Error loading portfolio types:', error);
          loadFallbackPortfolioTypes();
          resolve();
        });
    });
  }

  function populatePortfolioTypeDropdown(options) {
    console.log('[GraphicalClientPortfolio] Populating portfolio type dropdown');

    const portfolioTypeSelect = document.getElementById('portfolioType');
    if (!portfolioTypeSelect) return;

    portfolioTypeSelect.innerHTML = '<option value="">--Select--</option>';

    options.forEach(option => {
      const optionEl = document.createElement('option');
      optionEl.value = option.value || option.SubCodeID || '';
      optionEl.textContent = option.label || option.CodeDescription || '';
      portfolioTypeSelect.appendChild(optionEl);
    });

    console.log('[GraphicalClientPortfolio] Portfolio type dropdown populated with', options.length, 'items');
  }

  function loadFallbackPortfolioTypes() {
    console.log('[GraphicalClientPortfolio] Loading fallback portfolio types');

    const fallbackOptions = [
      { value: 'PORTFOLIO', label: 'Portfolio' },
      { value: 'PRODUCTTYPE', label: 'Product Type' },
      { value: 'ACCOUNTSTREND', label: 'Accounts Trend' }
    ];

    populatePortfolioTypeDropdown(fallbackOptions);
  }

  /**
   * Load Product Types from database using LookupService
   * CodeID: ProductTypeID
   */
  function loadProductTypesFromDatabase() {
    console.log('[GraphicalClientPortfolio] Loading product types from database');

    return new Promise((resolve, reject) => {
      if (!window.LookupService) {
        console.warn('[GraphicalClientPortfolio] LookupService not available, using fallback');
        loadFallbackProductTypes();
        resolve();
        return;
      }

      LookupService.getSystemCodeOptions('ProductTypeID')
        .then(options => {
          console.log('[GraphicalClientPortfolio] Product types loaded:', options);
          if (options && options.length > 0) {
            portfolioState.productTypes = options;
            populateProductTypeDropdown();
            resolve();
          } else {
            console.warn('[GraphicalClientPortfolio] No product types returned, using fallback');
            loadFallbackProductTypes();
            resolve();
          }
        })
        .catch(error => {
          console.error('[GraphicalClientPortfolio] Error loading product types:', error);
          loadFallbackProductTypes();
          resolve();
        });
    });
  }

  function loadFallbackProductTypes() {
    console.log('[GraphicalClientPortfolio] Loading fallback product types');

    portfolioState.productTypes = [
      { value: 'SB', label: 'Savings Account' },
      { value: 'CA', label: 'Current Account' },
      { value: 'LN', label: 'Loan' },
      { value: 'BD', label: 'Bonds' },
      { value: 'IL', label: 'Investment Loan' }
    ];
    
    // Populate dropdown immediately after loading fallback
    populateProductTypeDropdown();
  }

  function populateProductTypeDropdown() {
    console.log('[GraphicalClientPortfolio] Populating product type dropdown');

    const productTypeSelect = document.getElementById('productType');
    if (!productTypeSelect) return;

    productTypeSelect.innerHTML = '<option value="">--Select--</option>';

    portfolioState.productTypes.forEach(pt => {
      const option = document.createElement('option');
      // Handle both LookupService format and legacy format
      option.value = pt.value || pt.ProductTypeID || pt.Code || '';
      option.textContent = pt.label || pt.ProductTypeDescription || pt.Description || pt.ProductTypeID || '';
      productTypeSelect.appendChild(option);
    });

    console.log('[GraphicalClientPortfolio] Product type dropdown populated with', portfolioState.productTypes.length, 'items');
  }

  // ==================== FORM HANDLERS ====================
  function onPortfolioTypeChange(event) {
    const selectedType = event.target.value;
    portfolioState.selectedPortfolioType = selectedType;

    console.log('[GraphicalClientPortfolio] Portfolio type changed to:', selectedType);

    const productTypeSelect = document.getElementById('productType');
    const fromDateInput = document.getElementById('fromDate');

    // Reset product type selection
    if (productTypeSelect) {
      productTypeSelect.value = '';
    }

    // Manage product type based on portfolio type
    if (selectedType === 'PRODUCTTYPE' || selectedType === 'ACCOUNTSTREND') {
      // Enable and populate product type for these selections
      if (productTypeSelect) {
        productTypeSelect.disabled = false;
        populateProductTypeDropdown();
      }
    } else {
      // Disable product type for PORTFOLIO type
      if (productTypeSelect) {
        productTypeSelect.disabled = true;
      }
    }

    // From Date is always visible, but manage required attribute
    if (fromDateInput) {
      if (selectedType === 'ACCOUNTSTREND') {
        fromDateInput.required = true;
      } else {
        fromDateInput.required = false;
      }
    }

    console.log('[GraphicalClientPortfolio] Form controls adjusted for type:', selectedType);
  }

  function onViewClick() {
    console.log('[GraphicalClientPortfolio] View button clicked');

    const portfolioTypeEl = document.getElementById('portfolioType');
    const productTypeEl = document.getElementById('productType');
    const fromDateEl = document.getElementById('fromDate');
    const toDateEl = document.getElementById('toDate');

    console.log('[GraphicalClientPortfolio] Form elements found:', {
      portfolioType: !!portfolioTypeEl,
      productType: !!productTypeEl,
      fromDate: !!fromDateEl,
      toDate: !!toDateEl
    });

    if (!portfolioTypeEl || !productTypeEl || !fromDateEl || !toDateEl) {
      console.error('[GraphicalClientPortfolio] Missing form elements!');
      showError('Form elements not found. Please refresh the page.');
      return;
    }

    const portfolioType = portfolioTypeEl.value;
    const productType = productTypeEl.value;
    const fromDate = fromDateEl.value;
    const toDate = toDateEl.value;

    console.log('[GraphicalClientPortfolio] Form values:', {
      portfolioType,
      productType,
      fromDate,
      toDate
    });

    // Validate form
    if (!validateForm(portfolioType, productType, fromDate, toDate)) {
      console.log('[GraphicalClientPortfolio] Form validation failed');
      return;
    }

    console.log('[GraphicalClientPortfolio] Form validation passed, fetching data...');

    portfolioState.selectedPortfolioType = portfolioType;
    portfolioState.selectedProductTypeID = productType;
    portfolioState.fromDate = fromDate;
    portfolioState.toDate = toDate;

    fetchPortfolioData(portfolioType, productType, fromDate, toDate);
  }

  function onClearClick() {
    console.log('[GraphicalClientPortfolio] Clear button clicked');

    document.getElementById('portfolioType').value = '';
    document.getElementById('productType').value = '';
    document.getElementById('productType').disabled = true;
    document.getElementById('fromDate').value = portfolioState.workingDate || '';
    document.getElementById('toDate').value = portfolioState.workingDate || '';

    clearChart();
    clearStatistics();
    resetStatistics();

    console.log('[GraphicalClientPortfolio] Form cleared');
  }

  function validateForm(portfolioType, productType, fromDate, toDate) {
    console.log('[GraphicalClientPortfolio] Validating form');

    // Portfolio Type is mandatory
    if (!portfolioType) {
      showError('Please select a Portfolio Type');
      return false;
    }

    // If PRODUCTTYPE or ACCOUNTSTREND, Product Type is mandatory
    if ((portfolioType === 'PRODUCTTYPE' || portfolioType === 'ACCOUNTSTREND') && !productType) {
      showError('Please select a Product Type');
      return false;
    }

    // If ACCOUNTSTREND, both dates are mandatory
    if (portfolioType === 'ACCOUNTSTREND') {
      if (!fromDate || !toDate) {
        showError('Please select both From Date and To Date for Accounts Trend');
        return false;
      }

      if (new Date(fromDate) > new Date(toDate)) {
        showError('From Date cannot be greater than To Date');
        return false;
      }
    } else {
      // For PORTFOLIO and PRODUCTTYPE, only To Date is required
      if (!toDate) {
        showError('Please select a To Date');
        return false;
      }
    }

    console.log('[GraphicalClientPortfolio] Form validation passed');
    return true;
  }

  // ==================== API CALLS ====================
  function fetchPortfolioData(portfolioType, productType, fromDate, toDate) {
    console.log('[GraphicalClientPortfolio] Fetching portfolio data');

    showLoadingIndicator(true);

    // Match stored procedure parameter names exactly (NO p_ prefix!)
    // Also handle date formatting and report type spelling (PORTIFOLIO not PORTFOLIO)
    const requestData = {
      ClientID: portfolioState.clientID,
      OurBranchID: portfolioState.branchID || portfolioState.ourBranchID,
      OperatorID: portfolioState.operatorID,
      ProductTypeID: productType || '',
      ReportType: portfolioType === 'PORTFOLIO' ? 'PORTIFOLIO' : portfolioType,  // Fix spelling: PORTIFOLIO
      FromDate: (fromDate || toDate) + ' 00:00:00',  // Add timestamp format
      ToDate: toDate + ' 00:00:00'  // Add timestamp format
    };

    console.log('[GraphicalClientPortfolio] Request data:', requestData);

    // Use the same pattern as Loan Maintenance: formId + requestData
    const formId = "dbo.p_GetClientPortifolio";
    const envelope = CoreApi.makeRequestEnvelope(formId, requestData);

    CoreApi.post(ENDPOINT, envelope)
      .then(response => {
        console.log('[GraphicalClientPortfolio] API response received');
        handlePortfolioDataResponse(response, portfolioType);
        showLoadingIndicator(false);
      })
      .catch(error => {
        console.error('[GraphicalClientPortfolio] API error:', error);
        showLoadingIndicator(false);
        
        // Show detailed, user-friendly error message
        const errorMessage = error.message || error.toString();
        let userMessage = '';
        
        if (errorMessage.includes('Bad Gateway') || errorMessage.includes('502')) {
          userMessage = 'Unable to connect to the database server. The backend service may be offline. Please contact your system administrator or try again later.';
        } else if (errorMessage.includes('Network') || errorMessage.includes('Failed to fetch')) {
          userMessage = 'Network connection error. Please check your internet connection and try again.';
        } else if (errorMessage.includes('Timeout')) {
          userMessage = 'The request timed out. The server may be busy. Please try again in a moment.';
        } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
          userMessage = 'Your session may have expired. Please refresh the page and log in again.';
        } else {
          userMessage = 'Failed to load portfolio data. Error: ' + errorMessage;
        }
        
        showError(userMessage);
        renderEmptyChart('Unable to load data - ' + errorMessage);
      });
  }

  function handlePortfolioDataResponse(response, portfolioType) {
    console.log('[GraphicalClientPortfolio] Processing response for type:', portfolioType);

    let data = null;

    if (response && response.data && Array.isArray(response.data)) {
      data = response.data;
    } else if (response && response.d && Array.isArray(response.d)) {
      data = response.d;
    } else if (response && Array.isArray(response)) {
      data = response;
    } else if (response && response.Rows && Array.isArray(response.Rows)) {
      data = response.Rows;
    }

    console.log('[GraphicalClientPortfolio] Data extracted:', data ? data.length : 0, 'records');

    if (!data || data.length === 0) {
      console.log('[GraphicalClientPortfolio] No data, rendering empty chart');
      renderEmptyChart('No data found for selected criteria');
      resetStatistics();
      return;
    }

    portfolioState.chartData = data;

    // Render appropriate chart (handle both PORTFOLIO and PORTIFOLIO spelling)
    const reportType = portfolioType === 'PORTIFOLIO' ? 'PORTFOLIO' : portfolioType;
    switch (reportType) {
      case 'PORTFOLIO':
        renderPortfolioChart(data);
        break;
      case 'PRODUCTTYPE':
        renderProductTypeChart(data);
        break;
      case 'ACCOUNTSTREND':
        renderTrendChart(data);
        break;
      default:
        renderEmptyChart('Unknown portfolio type');
    }
  }

  // ==================== CHART RENDERING ====================
  function renderPortfolioChart(data) {
    console.log('[GraphicalClientPortfolio] Rendering portfolio chart');

    // Show chart container, hide placeholder
    const chartPlaceholder = document.getElementById('chartPlaceholder');
    const chartContainer = document.getElementById('portfolioChart');
    if (chartPlaceholder) chartPlaceholder.classList.add('d-none');
    if (chartContainer) chartContainer.classList.remove('d-none');

    const categories = [];
    const seriesData = [];

    // Group by Description
    const grouped = {};

    data.forEach(item => {
      const description = item.Description || item.AccountName || item.ProductName || 'Other';
      const amount = parseFloat(item.Amount) || 0;

      if (!grouped[description]) {
        grouped[description] = 0;
      }
      grouped[description] += amount;
    });

    Object.keys(grouped).forEach(desc => {
      categories.push(desc);
      seriesData.push(grouped[desc]);
    });

    const chartConfig = {
      chart: {
        type: 'column',
        renderTo: 'portfolioChart'
      },
      title: {
        text: 'Portfolio Analysis - As At ' + formatDate(portfolioState.toDate),
        style: { fontSize: '13px', fontWeight: 'bold' }
      },
      subtitle: {
        text: 'Client ID: ' + portfolioState.clientID,
        style: { fontSize: '11px', color: '#666' }
      },
      xAxis: {
        categories: categories,
        title: { text: 'Product/Account' }
      },
      yAxis: {
        title: { text: 'Balances' }
      },
      tooltip: {
        headerFormat: '<b>{point.x}</b><br/>',
        pointFormat: 'Balance: {point.y:,.2f}'
      },
      plotOptions: {
        column: { pointPadding: 0.2, borderWidth: 0 }
      },
      series: [
        { name: 'Balance', data: seriesData, color: '#1e5a96' }
      ]
    };

    Highcharts.chart(chartConfig);
    // updateStatistics(data); // Statistics section removed

    console.log('[GraphicalClientPortfolio] Portfolio chart rendered');
  }

  function renderProductTypeChart(data) {
    console.log('[GraphicalClientPortfolio] Rendering product type chart');

    // Show chart container, hide placeholder
    const chartPlaceholder = document.getElementById('chartPlaceholder');
    const chartContainer = document.getElementById('portfolioChart');
    if (chartPlaceholder) chartPlaceholder.classList.add('d-none');
    if (chartContainer) chartContainer.classList.remove('d-none');

    const categories = [];
    const columnData = [];
    const productTypes = {};

    data.forEach(item => {
      const productType = item.ProductType || item.ProductTypeID || 'Other';
      const amount = parseFloat(item.Amount) || 0;

      if (!productTypes[productType]) {
        productTypes[productType] = 0;
      }
      productTypes[productType] += amount;
    });

    Object.keys(productTypes).forEach(pt => {
      categories.push(pt);
      columnData.push(productTypes[pt]);
    });

    const chartConfig = {
      chart: {
        type: 'column',
        renderTo: 'portfolioChart'
      },
      title: {
        text: 'Product Type Analysis - As At ' + formatDate(portfolioState.toDate),
        style: { fontSize: '13px', fontWeight: 'bold' }
      },
      subtitle: {
        text: 'Client ID: ' + portfolioState.clientID,
        style: { fontSize: '11px', color: '#666' }
      },
      xAxis: {
        categories: categories,
        title: { text: 'Product Type' }
      },
      yAxis: {
        title: { text: 'Balances' }
      },
      tooltip: {
        headerFormat: '<b>{point.x}</b><br/>',
        pointFormat: 'Amount: {point.y:,.2f}'
      },
      plotOptions: {
        column: { pointPadding: 0.2, borderWidth: 0 }
      },
      series: [
        { name: 'Balance by Product Type', data: columnData, color: '#2e7d32' }
      ]
    };

    Highcharts.chart(chartConfig);
    // updateStatistics(data); // Statistics section removed

    console.log('[GraphicalClientPortfolio] Product type chart rendered');
  }

  function renderTrendChart(data) {
    console.log('[GraphicalClientPortfolio] Rendering trend chart');

    // Show chart container, hide placeholder
    const chartPlaceholder = document.getElementById('chartPlaceholder');
    const chartContainer = document.getElementById('portfolioChart');
    if (chartPlaceholder) chartPlaceholder.classList.add('d-none');
    if (chartContainer) chartContainer.classList.remove('d-none');

    // Sort by date
    data.sort((a, b) => new Date(a.DateTo) - new Date(b.DateTo));

    const categories = [];
    const seriesData = [];

    data.forEach(item => {
      const date = item.DateTo || item.Date || '';
      const amount = parseFloat(item.Amount) || 0;

      categories.push(formatDate(date));
      seriesData.push(amount);
    });

    const chartConfig = {
      chart: {
        type: 'column',
        renderTo: 'portfolioChart'
      },
      title: {
        text: 'Account Trend - From ' + formatDate(portfolioState.fromDate) + ' To ' + formatDate(portfolioState.toDate),
        style: { fontSize: '13px', fontWeight: 'bold' }
      },
      subtitle: {
        text: 'Client ID: ' + portfolioState.clientID,
        style: { fontSize: '11px', color: '#666' }
      },
      xAxis: {
        categories: categories,
        title: { text: 'Date' }
      },
      yAxis: {
        title: { text: 'Account Balance' }
      },
      tooltip: {
        headerFormat: '<b>{point.x}</b><br/>',
        pointFormat: 'Balance: {point.y:,.2f}'
      },
      plotOptions: {
        column: { pointPadding: 0.2, borderWidth: 0, color: '#1565c0' }
      },
      series: [
        { name: 'Account Balance', data: seriesData, type: 'column', color: '#1565c0' },
        { name: 'Trend', data: seriesData, type: 'spline', color: '#ff6f00' }
      ]
    };

    Highcharts.chart(chartConfig);
    // updateStatistics(data); // Statistics section removed

    console.log('[GraphicalClientPortfolio] Trend chart rendered');
  }

  function renderEmptyChart(message) {
    console.log('[GraphicalClientPortfolio] Rendering empty chart:', message);

    const chartPlaceholder = document.getElementById('chartPlaceholder');
    const chartContainer = document.getElementById('portfolioChart');
    
    if (chartPlaceholder) {
      chartPlaceholder.classList.remove('d-none');
      const placeholderContent = chartPlaceholder.querySelector('.gcp-placeholder-content p');
      if (placeholderContent) {
        placeholderContent.textContent = message;
      }
    }
    if (chartContainer) {
      chartContainer.classList.add('d-none');
      chartContainer.innerHTML = '';
    }
  }

  function clearChart() {
    console.log('[GraphicalClientPortfolio] Clearing chart');

    const chartContainer = document.getElementById('portfolioChart');
    if (chartContainer) {
      chartContainer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #94a3b8; font-size: 13px;">Select filters and click View to generate chart</div>';
    }
  }

  function clearStatistics() {
    console.log('[GraphicalClientPortfolio] Clearing statistics');
    
    document.getElementById('totalAccounts').textContent = '0';
    document.getElementById('totalBalance').textContent = '0.00';
    document.getElementById('averageBalance').textContent = '0.00';
    document.getElementById('highestBalance').textContent = '0.00';
    
    portfolioState.statistics = {
      totalAccounts: 0,
      totalBalance: 0,
      averageBalance: 0,
      highestBalance: 0
    };
  }

  // function updateStatistics(data) {
  //   // Statistics section removed from HTML, so this function is now obsolete.
  // }

  // ==================== STATISTICS ====================
  // function resetStatistics() {
  //   // Statistics section removed from HTML, so this function is now obsolete.
  // }

  // ==================== UTILITIES ====================
  function formatCurrency(amount) {
    if (!amount) return '0.00';

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  function formatNumber(number) {
    if (!number && number !== 0) return '0';
    return Number(number).toLocaleString();
  }

  function formatDate(dateString) {
    if (!dateString) return '';

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  }

  function showError(message) {
    console.error('[GraphicalClientPortfolio] Error:', message);
    showAlert(message, 'danger');
  }

  function showWarning(message) {
    console.warn('[GraphicalClientPortfolio] Warning:', message);
    showAlert(message, 'warning');
  }

  function showAlert(message, type = 'danger') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.style.margin = '0 0 10px 0';
    alertDiv.innerHTML = `
      <strong>${type === 'danger' ? '⚠️ Error:' : 'ℹ️ Warning:'}</strong> ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    // Try to find alert container first
    let container = document.getElementById('alertContainer');
    
    // Fallback to form if container not found
    if (!container) {
      container = document.getElementById('portfolioForm');
    }
    
    // Final fallback to body
    if (!container) {
      container = document.body;
    }

    if (container) {
      // Clear existing alerts in container
      if (container.id === 'alertContainer') {
        container.innerHTML = '';
        container.appendChild(alertDiv);
      } else {
        container.insertBefore(alertDiv, container.firstChild);
      }
    }

    // Auto-dismiss after 8 seconds for warnings, 10 seconds for errors
    setTimeout(() => {
      if (alertDiv && alertDiv.parentNode) {
        alertDiv.remove();
      }
    }, type === 'warning' ? 8000 : 10000);
  }

  function showLoadingIndicator(show) {
    const indicator = document.getElementById('loadingIndicator');
    if (indicator) {
      if (show) {
        indicator.classList.remove('d-none');
      } else {
        indicator.classList.add('d-none');
      }
    }
  }

  function handleActionClick(event) {
    const action = event.currentTarget.dataset.action;
    console.log('[GraphicalClientPortfolio] Action clicked:', action);

    switch (action) {
      case 'export':
        exportChart();
        break;
      case 'print':
        printChart();
        break;
      case 'refresh':
        location.reload();
        break;
      case 'close':
        window.parent.postMessage('close-graphical-client-portfolio', '*');
        break;
    }
  }

  function exportChart() {
    console.log('[GraphicalClientPortfolio] Exporting chart');

    if (window.Highcharts && window.Highcharts.charts && window.Highcharts.charts[0]) {
      window.Highcharts.charts[0].export();
    } else {
      showError('No chart data to export');
    }
  }

  function printChart() {
    console.log('[GraphicalClientPortfolio] Printing chart');

    const printWindow = window.open('', '_blank');
    const chartContainer = document.getElementById('portfolioChart');

    if (chartContainer && chartContainer.querySelector('svg')) {
      const svg = chartContainer.querySelector('svg');
      const svgString = new XMLSerializer().serializeToString(svg);

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Portfolio Chart</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h2 { text-align: center; }
            svg { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>
          <h2>Graphical Client Portfolio</h2>
          <p>Client ID: ${portfolioState.clientID}</p>
          <p>As At: ${formatDate(portfolioState.toDate)}</p>
          ${svgString}
          <p style="margin-top: 20px; text-align: center;">
            <small>Printed on ${new Date().toLocaleString()}</small>
          </p>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    } else {
      showError('No chart available to print. Please generate a chart first.');
    }
  }

  console.log('[GraphicalClientPortfolio] Module loaded');
})();
