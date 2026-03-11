(function () {
    'use strict';

    const state = {
        moduleId: '',
        branchId: '',
        branchName: '',
        operatorId: '',
        currentMode: 'VIEW',
        currentRecord: null,
        bankSyndicateData: [],
        selectedBankIndex: null,
        hasClientDetails: false,
        productSlabs: [],
        productInfo: null
    };

    let elements = {};
    let searchModal = null;

    const LOOKUP_CONFIG = {
        Branch: {
            tableID: 'BranchID',
            valueField: 'branchId',
            displayField: 'branchName',
            valueColumn: 'OurBranchID',
            displayColumn: 'BranchName',
            searchFields: [
                { name: 'BranchID', label: 'Branch ID', column: 'OurBranchID' },
                { name: 'BranchName', label: 'Branch Name', column: 'BranchName' }
            ],
            columns: [
                { field: 'OurBranchID', header: 'Branch ID' },
                { field: 'BranchName', header: 'Branch Name' }
            ]
        },
        Application: {
            tableID: 'WFLoanIndvAppID',
            valueField: 'applicationId',
            displayField: 'applicationName',
            valueColumn: 'ApplicationID',
            displayColumn: 'ClientName',
            searchFields: [
                { name: 'ApplicationID', label: 'Application ID', column: 'ApplicationID' },
                { name: 'ClientID', label: 'Client ID', column: 'ClientID' },
                { name: 'ClientName', label: 'Client Name', column: 'ClientName' },
                { name: 'IDNumber', label: 'ID Number', column: 'IDNumber' },
                { name: 'ProductID', label: 'Product ID', column: 'ProductID' }
            ],
            columns: [
                { field: 'ApplicationID', header: 'Application ID' },
                { field: 'ClientID', header: 'Client ID' },
                { field: 'ClientName', header: 'Client Name' },
                { field: 'IDNumber', header: 'ID Number' },
                { field: 'ProductID', header: 'Product ID' }
            ],
            advFilter: () => `OurBranchID='${getOurBranchId()}'`
        },
        ClientBranch: {
            tableID: 'BranchID',
            valueField: 'clientBranchId',
            displayField: 'clientBranchName',
            valueColumn: 'OurBranchID',
            displayColumn: 'BranchName',
            searchFields: [
                { name: 'BranchID', label: 'Branch ID', column: 'OurBranchID' },
                { name: 'BranchName', label: 'Branch Name', column: 'BranchName' }
            ],
            columns: [
                { field: 'OurBranchID', header: 'Branch ID' },
                { field: 'BranchName', header: 'Branch Name' }
            ]
        },
        Client: {
            tableID: 'WFClientExistID',
            valueField: 'clientId',
            displayField: 'clientName',
            valueColumn: 'ClientID',
            displayColumn: 'Name',
            searchFields: [
                { name: 'ClientID', label: 'Client ID', column: 'ClientID' },
                { name: 'Name', label: 'Client Name', column: 'Name' }
            ],
            columns: [
                { field: 'ClientID', header: 'Client ID' },
                { field: 'Name', header: 'Client Name' }
            ]
        },
        Product: {
            tableID: 'WFAdvProductID',
            valueField: 'productId',
            displayField: 'productName',
            valueColumn: 'ProductID',
            displayColumn: 'Description',
            searchFields: [
                { name: 'ProductID', label: 'Product ID', column: 'ProductID' },
                { name: 'Description', label: 'Description', column: 'Description' }
            ],
            advFilter: () => `OurBranchID='${getOurBranchId()}' AND ProductTypeID='LN'`
        },
        Account: {
            tableID: 'RepaymentAccountID',
            valueField: 'mainRepaymentAccountId',
            displayField: 'mainRepaymentAccountName',
            valueColumn: 'AccountID',
            displayColumn: 'AccountName',
            searchFields: [
                { name: 'AccountID', label: 'Account ID', column: 'AccountID' },
                { name: 'AccountName', label: 'Account Name', column: 'AccountName' }
            ],
            columns: [
                { field: 'AccountID', header: 'Account ID' },
                { field: 'AccountName', header: 'Account Name' }
            ],
            advFilter: () => {
                const clientId = getFieldValue('clientId');
                if (!clientId) return '';
                return `ClientID='${clientId}' AND ProductID<>'BML' AND isDormant<>1 AND isBlocked<>1 AND AccountStatusID<>'AC'`;
            }
        },
        Donor: {
            tableID: 'DonorID',
            valueField: 'donorId',
            displayField: 'donorName',
            valueColumn: 'FunderID',
            displayColumn: 'FunderName',
            searchFields: [
                { name: 'FunderID', label: 'Donor ID', column: 'FunderID' },
                { name: 'FunderName', label: 'Donor Name', column: 'FunderName' }
            ],
            advFilter: () => "BankID='00'"
        },
        Officer: {
            tableID: 'ActiveOfficerID',
            valueField: 'officerId',
            displayField: 'officerName',
            valueColumn: 'OfficerID',
            displayColumn: 'Name',
            searchFields: [
                { name: 'OfficerID', label: 'Officer ID', column: 'OfficerID' },
                { name: 'Name', label: 'Officer Name', column: 'Name' }
            ],
            advFilter: () => {
                const branchId = getOurBranchId();
                return branchId ? `BankID='00' AND ReportingBranchID='${branchId}' AND OfficerTypeID='CO'` : "";
            }
        },
        SalesOfficer: {
            tableID: 'AccountID',
            valueField: 'salesOfficer',
            displayField: 'salesOfficerName',
            valueColumn: 'AccountID',
            displayColumn: 'Name',
            searchFields: [
                { name: 'AccountID', label: 'Sales Officer ID', column: 'AccountID' },
                { name: 'Name', label: 'Sales Officer Name', column: 'Name' }
            ]
        },
        Bank: {
            tableID: 'LCBankID',
            valueField: 'bankId',
            displayField: 'bankName',
            valueColumn: 'BankID',
            displayColumn: 'BankName',
            searchFields: [
                { name: 'BankID', label: 'Bank ID', column: 'BankID' },
                { name: 'BankName', label: 'Bank Name', column: 'BankName' }
            ],
            columns: [
                { field: 'BankID', header: 'Bank ID' },
                { field: 'BankName', header: 'Bank Name' },
                { field: 'ShortName', header: 'Short Name' }
            ]
        }
    };

    function init() {
        // Overlay is visible by default in CSS; hide it until an async action starts.
        showLoading(false);

        cacheElements();
        loadContext();

        searchModal = new SearchModal(window.AppCore);

        wireSectionToggles();
        wireLookupButtons();
        wireActionButtons();
        wireFormEvents();
        setDefaultDate();
        wireMoneyFields();
        setupRateCalculations();

        setStateInitial();

        const autoLoadId = getFieldValue('entityId_las') || getFieldValue('requestId_las');
        if (autoLoadId) {
            setFieldValue('applicationId', autoLoadId);
            fetchLoanApplication();
        }
    }

    function cacheElements() {
        elements = {
            branchId: document.getElementById('branchId'),
            branchName: document.getElementById('branchName'),
            applicationId: document.getElementById('applicationId'),
            applicationName: document.getElementById('applicationName'),
            date: document.getElementById('date'),
            clientBranchId: document.getElementById('clientBranchId'),
            clientBranchName: document.getElementById('clientBranchName'),
            clientId: document.getElementById('clientId'),
            clientName: document.getElementById('clientName'),
            productId: document.getElementById('productId'),
            productName: document.getElementById('productName'),
            mainRepaymentAccountId: document.getElementById('mainRepaymentAccountId'),
            mainRepaymentAccountName: document.getElementById('mainRepaymentAccountName'),
            donorId: document.getElementById('donorId'),
            donorName: document.getElementById('donorName'),
            loanPurpose: document.getElementById('loanPurpose'),
            lineOfBusiness: document.getElementById('lineOfBusiness'),
            officerId: document.getElementById('officerId'),
            officerName: document.getElementById('officerName'),
            loanAmount: document.getElementById('loanAmount'),
            currencyId: document.getElementById('currencyId'),
            term: document.getElementById('term'),
            interestRate: document.getElementById('interestRate'),
            commissionRate: document.getElementById('commissionRate'),
            taxRate: document.getElementById('taxRate'),
            effectiveRate: document.getElementById('effectiveRate'),
            disbursementDate: document.getElementById('disbursementDate'),
            monthlyProfit: document.getElementById('monthlyProfit'),
            monthlyTurnOver: document.getElementById('monthlyTurnOver'),
            totalAssets: document.getElementById('totalAssets'),
            businessLocation: document.getElementById('businessLocation'),
            businessStatus: document.getElementById('businessStatus'),
            startupCapitalCollateral: document.getElementById('startupCapitalCollateral'),
            spread: document.getElementById('spread'),
            loanLimitType: document.getElementById('loanLimitType'),
            fileNumber: document.getElementById('fileNumber'),
            applicationStatus: document.getElementById('applicationStatus'),
            salesOfficer: document.getElementById('salesOfficer'),
            salesOfficerName: document.getElementById('salesOfficerName'),
            bankId: document.getElementById('bankId'),
            bankName: document.getElementById('bankName'),
            percentage: document.getElementById('percentage'),
            moreInfoBtn: document.getElementById('moreInfoBtn'),
            viewBtn: document.getElementById('viewBtn'),
            addBtn: document.getElementById('addBtn'),
            editBtn: document.getElementById('editBtn'),
            deleteBtn: document.getElementById('deleteBtn'),
            saveBtn: document.getElementById('saveBtn'),
            cancelBtn: document.getElementById('cancelBtn'),
            newBtn: document.getElementById('newBtn'),
            alterBtn: document.getElementById('alterBtn'),
            removeBtn: document.getElementById('removeBtn'),
            updateBtn: document.getElementById('updateBtn'),
            clearBtn: document.getElementById('clearBtn'),
            bankTableBody: document.getElementById('bankTableBody')
        };
    }

    function loadContext() {
        state.moduleId = getFieldValue('moduleId_las') || '100';

        const serverBranch = getFieldValue('sessionBranchCode_las');
        const serverBranchName = getFieldValue('sessionBranchName_las');
        const serverOperator = getFieldValue('sessionOperatorId_las');

        let session = null;
        try {
            const raw = localStorage.getItem('nimble_auth_session');
            session = raw ? JSON.parse(raw) : null;
        } catch {
            session = null;
        }

        state.branchId = serverBranch || session?.branchID || '';
        state.branchName = serverBranchName || session?.selectedBranchName || '';
        state.operatorId = serverOperator || session?.operatorID || '';

        if (state.branchId && elements.branchId) {
            elements.branchId.value = state.branchId;
        }
        if (state.branchName && elements.branchName) {
            elements.branchName.value = state.branchName;
        }
        if (elements.clientBranchId && state.branchId) {
            elements.clientBranchId.value = state.branchId;
        }
    }

    function wireSectionToggles() {
        document.querySelectorAll('[data-section-toggle]').forEach(header => {
            header.addEventListener('click', () => {
                const section = header.closest('.form-section');
                const content = section?.querySelector('[data-section-content]');
                const icon = header.querySelector('.section-toggle-btn i');
                if (!content) return;
                const isHidden = content.style.display === 'none';
                content.style.display = isHidden ? '' : 'none';
                if (icon) {
                    icon.className = isHidden ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
                }
            });
        });
    }

    function wireLookupButtons() {
        document.querySelectorAll('.btn-lookup[data-lookup]').forEach(button => {
            button.addEventListener('click', () => {
                const lookupKey = button.getAttribute('data-lookup');
                if (lookupKey) {
                    openLookup(lookupKey);
                }
            });
        });
    }

    function wireActionButtons() {
        elements.moreInfoBtn?.addEventListener('click', handleMoreInfo);
        elements.viewBtn?.addEventListener('click', handleView);
        elements.addBtn?.addEventListener('click', handleAdd);
        elements.editBtn?.addEventListener('click', handleEdit);
        elements.deleteBtn?.addEventListener('click', handleDelete);
        elements.saveBtn?.addEventListener('click', handleSave);
        elements.cancelBtn?.addEventListener('click', handleCancel);

        elements.newBtn?.addEventListener('click', handleBankNew);
        elements.alterBtn?.addEventListener('click', handleBankAlter);
        elements.removeBtn?.addEventListener('click', handleBankRemove);
        elements.updateBtn?.addEventListener('click', handleBankUpdate);
        elements.clearBtn?.addEventListener('click', handleBankClear);
    }

    function wireFormEvents() {
        const blurLookups = [
            { id: 'branchId', lookupKey: 'Branch' },
            { id: 'applicationId', lookupKey: 'Application' },
            { id: 'clientBranchId', lookupKey: 'ClientBranch' },
            { id: 'mainRepaymentAccountId', lookupKey: 'Account' },
            { id: 'donorId', lookupKey: 'Donor' },
            { id: 'officerId', lookupKey: 'Officer' },
            { id: 'salesOfficer', lookupKey: 'SalesOfficer' },
            { id: 'bankId', lookupKey: 'Bank' }
        ];

        blurLookups.forEach(({ id, lookupKey }) => {
            const field = document.getElementById(id);
            if (field) {
                field.addEventListener('blur', () => runAutoLookup(lookupKey));
            }
        });

        elements.clientId?.addEventListener('blur', () => {
            const clientId = getFieldValue('clientId');
            if (clientId) {
                loadClientDetails(clientId);
            } else {
                elements.clientName.value = '';
                state.hasClientDetails = false;
                toggleMoreInfo(false);
            }
        });

        elements.productId?.addEventListener('blur', () => {
            const productId = getFieldValue('productId');
            if (productId) {
                loadProductDetails(productId);
            } else {
                resetProductDependentFields();
            }
        });

        elements.term?.addEventListener('blur', handleTermBlur);
        elements.loanAmount?.addEventListener('blur', () => {
            const term = getFieldValue('term');
            const loanAmount = getFieldValue('loanAmount');
            const productId = getFieldValue('productId');
            if (term && loanAmount && productId) {
                checkSlabDetails(productId, term, loanAmount);
            }
        });

        elements.bankTableBody?.addEventListener('click', handleBankRowSelection);

        elements.branchId?.addEventListener('change', () => {
            const branchValue = getFieldValue('branchId');
            if (branchValue && elements.clientBranchId) {
                elements.clientBranchId.value = branchValue;
                runAutoLookup('ClientBranch');
            }
        });

        elements.date?.addEventListener('change', () => {
            const dateValue = getFieldValue('date');
            if (dateValue && elements.disbursementDate) {
                elements.disbursementDate.value = dateValue;
            }
        });
    }

    function openLookup(lookupKey) {
        const config = LOOKUP_CONFIG[lookupKey];
        if (!config) {
            return;
        }

        if (lookupKey === 'Account' && !getFieldValue('clientId')) {
            showToast('Please select Client ID first.', 'warning');
            return;
        }

        const advFilterString = typeof config.advFilter === 'function' ? config.advFilter() : '';

        searchModal.open({
            tableID: config.tableID,
            moduleID: state.moduleId,
            ourbranchId: getOurBranchId(),
            searchFields: config.searchFields,
            columns: config.columns,
            advFilterString,
            autoSearch: true,
            onSelect: (record) => {
                applyLookupSelection(lookupKey, record);
            }
        });
    }

    function applyLookupSelection(lookupKey, record) {
        const config = LOOKUP_CONFIG[lookupKey];
        if (!config || !record) return;

        const value = record[config.valueColumn] || record[config.valueField] || '';
        const displayValue = record[config.displayColumn] || record.Name || record.Description || '';

        setFieldValue(config.valueField, value);
        if (config.displayField) {
            setFieldValue(config.displayField, displayValue);
        }

        if (lookupKey === 'Branch') {
            setFieldValue('clientBranchId', value);
            setFieldValue('clientBranchName', displayValue);
        }

        if (lookupKey === 'Client') {
            loadClientDetails(value);
        }

        if (lookupKey === 'Product') {
            loadProductDetails(value);
        }
    }

    async function runAutoLookup(lookupKey) {
        const config = LOOKUP_CONFIG[lookupKey];
        if (!config) return;

        const value = getFieldValue(config.valueField);
        if (!value) {
            if (config.displayField) setFieldValue(config.displayField, '');
            return;
        }

        const advFilterString = typeof config.advFilter === 'function' ? config.advFilter() : '';
        const whereStmt = `${config.valueColumn || config.valueField} LIKE '%${escapeSqlLike(value)}'`;

        try {
            const response = await AppCore.invokeControllerAsync('SearchModal/Search', {
                TableID: config.tableID,
                WhereStmt: whereStmt,
                AdvFilterString: advFilterString,
                SearchKey: '',
                ModuleID: state.moduleId,
                PageSize: 10,
                RefID: '',
                PrevOrNext: 1,
                OurBranchID: getOurBranchId()
            });

            const results = extractSearchResults(response);
            if (results.length > 0) {
                const record = results[0];
                const displayValue = record[config.displayColumn] || record.Name || record.Description || '';
                if (config.displayField) {
                    setFieldValue(config.displayField, displayValue);
                }
            } else if (config.displayField) {
                setFieldValue(config.displayField, '');
            }
        } catch (error) {
            console.warn('[LoanAppSyndicate] Auto lookup failed:', error);
            if (config.displayField) setFieldValue(config.displayField, '');
        }
    }

    function extractSearchResults(response) {
        if (!response || !response.success) return [];
        const data = response.data;
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.Details)) return data.Details;
        if (data.Details) return [data.Details];
        if (data.details?.SearchResults) return Array.isArray(data.details.SearchResults) ? data.details.SearchResults : [data.details.SearchResults];
        if (Array.isArray(data.Records)) return data.Records;
        return [];
    }

    async function loadClientDetails(clientId) {
        if (!clientId) return;

        try {
            showLoading(true);

            const response = await AppCore.invokeControllerAsync('WorkFlowLoan/LoanApplicationSyndicate/get-client-details', {
                OurBranchID: getOurBranchId(),
                ClientID: clientId
            });

            const details = extractOldApiDetails(response);
            if (!details.length) {
                setFieldValue('clientName', '');
                state.hasClientDetails = false;
                toggleMoreInfo(false);
                return;
            }

            const record = details[0];
            setFieldValue('clientName', record.ClientName || record.Name || '');

            state.hasClientDetails = true;
            window.currentClientInfo = {
                clientId: record.ClientID || '',
                clientBranchId: record.ClientBranchID || '',
                clientTypeId: record.ClientTypeID || '',
                titleId: record.TitleID || '',
                clientName: record.ClientName || '',
                address1: record.Address1 || '',
                address2: record.Address2 || '',
                city: record.City || '',
                cityId: record.CityID || '',
                country: record.Country || '',
                countryId: record.CountryID || '',
                phone1: record.Phone1 || '',
                mobile: record.Mobile || '',
                email: record.Email || '',
                gender: record.Gender || '',
                genderId: record.GenderID || '',
                isDOBGiven: record.IsDOBGiven || false,
                dateOfBirth: record.DateOfBirth || '',
                age: record.Age || '',
                ageAsOn: record.AgeAsOn || '',
                isIndividualClient: record.IsIndividualClient || false,
                clientLimit: record.ClientLimit || ''
            };

            toggleMoreInfo(true);
        } catch (error) {
            showToast('Failed to load client details: ' + error.message, 'error');
        } finally {
            showLoading(false);
        }
    }

    async function loadProductDetails(productId) {
        if (!productId) return;

        try {
            showLoading(true);

            const response = await AppCore.invokeControllerAsync('WorkFlowLoan/LoanApplicationSyndicate/get-product-details', {
                OurBranchID: getOurBranchId(),
                WFAdvTypeID: '',
                ProductID: productId
            });

            const details = extractOldApiDetails(response);
            const slabs = extractOldApiDetailSet(response, ['Details01', 'Details1', 'RateSlabs']);

            state.productSlabs = slabs;

            if (!details.length) {
                resetProductDependentFields();
                return;
            }

            const record = details[0];
            const productInfo = {
                productId: record.ProductID || '',
                productName: record.Description || record.ProductName || '',
                productTypeId: record.ProductTypeID || '',
                loanPeriodId: record.LoanPeriodID || '',
                effectiveRate: record.EffectiveRate || 0,
                defaultTerm: record.DefaultTerm || '',
                interestRate: record.InterestRate || '',
                commissionRate: record.CommissionRate || '',
                taxRate: record.TaxRate || '',
                purpose: record.PurposeCodeID || '',
                currencyId: record.CurrencyID || ''
            };

            state.productInfo = productInfo;

            setFieldValue('productName', productInfo.productName);
            if (productInfo.currencyId) setFieldValue('currencyId', productInfo.currencyId);
            if (productInfo.defaultTerm) setFieldValue('term', productInfo.defaultTerm);
            if (productInfo.purpose) setFieldValue('loanPurpose', productInfo.purpose);

            if (productInfo.effectiveRate) setFieldValue('effectiveRate', productInfo.effectiveRate);
            if (productInfo.interestRate) setFieldValue('interestRate', productInfo.interestRate);
            if (productInfo.commissionRate) setFieldValue('commissionRate', productInfo.commissionRate);
            if (productInfo.taxRate) setFieldValue('taxRate', productInfo.taxRate);

            reformatAllMoneyFields();
        } catch (error) {
            showToast('Failed to load product details: ' + error.message, 'error');
        } finally {
            showLoading(false);
        }
    }

    async function fetchLoanApplication() {
        const applicationId = getFieldValue('applicationId');
        if (!applicationId) {
            showToast('Please enter an Application ID to view.', 'warning');
            return;
        }

        try {
            showLoading(true);
            showToast('Loading application data...', 'info');

            const response = await AppCore.invokeControllerAsync('WorkFlowLoan/LoanApplicationSyndicate/get', {
                OurBranchID: getOurBranchId(),
                ApplicationID: applicationId
            });

            const data = response?.data || {};
            const details = extractDetailArray(data, 'Details');
            const details01 = extractDetailArray(data, 'Details01');
            const details02 = extractDetailArray(data, 'Details02');

            if (details02.length > 0) {
                populateApplicationData(details02[0]);
                state.currentRecord = details02[0];
            }

            if (details01.length > 0) {
                state.bankSyndicateData = details01.map(bank => ({
                    bankId: bank.BankID || '',
                    bankName: bank.BankName || '',
                    percentage: bank.Percentage || ''
                }));
            } else {
                state.bankSyndicateData = [];
            }

            populateBankTable();
            setStateView();

            if (!details02.length) {
                showToast('No application data found.', 'info');
            }
        } catch (error) {
            showToast('Error loading data: ' + error.message, 'error');
        } finally {
            showLoading(false);
        }
    }

    function populateApplicationData(data) {
        setFieldValue('branchId', data.OurBranchID || '');
        setFieldValue('applicationId', data.ApplicationID || '');
        setFieldValue('date', formatDateValue(data.ApplicationDate));
        setFieldValue('clientBranchId', data.ClientBranchID || '');
        setFieldValue('clientId', data.ClientID || '');
        setFieldValue('productId', data.ProductID || '');
        setFieldValue('mainRepaymentAccountId', data.RepaymentAccountID || '');
        setFieldValue('donorId', data.DonorID || '');
        setFieldValue('loanPurpose', data.PurposeCodeID || '');
        setFieldValue('lineOfBusiness', data.BusinessLineID || '');
        setFieldValue('officerId', data.CreditOfficerID || '');
        setFieldValue('loanAmount', data.LoanAmount || '');
        setFieldValue('currencyId', data.CurrencyID || '');
        setFieldValue('term', data.LoanTerm || '');
        setFieldValue('commissionRate', data.CommissionRate || '');
        setFieldValue('taxRate', data.TaxRate || '');
        setFieldValue('effectiveRate', data.EffectiveRate || '');
        setFieldValue('disbursementDate', formatDateValue(data.DisbursementDate));
        setFieldValue('fileNumber', data.FileNumber || '');
        setFieldValue('applicationStatus', data.WFAppStatus || '');
        setFieldValue('salesOfficer', data.SalesOfficerID || '');

        const clientId = data.ClientID || '';
        const productId = data.ProductID || '';
        if (clientId) loadClientDetails(clientId);
        if (productId) loadProductDetails(productId);

        reformatAllMoneyFields();
    }

    function handleMoreInfo() {
        if (!state.hasClientDetails || !window.currentClientInfo) {
            showToast('No client information available. Please select a client first.', 'warning');
            return;
        }

        const clientInfo = window.currentClientInfo;
        const formatValue = (val) => (val && val !== 'N/A') ? val : 'N/A';
        const formatDate = (dateStr) => {
            if (!dateStr || dateStr === 'N/A') return 'N/A';
            try {
                return new Date(dateStr).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            } catch {
                return dateStr;
            }
        };

        setText('modalClientId', formatValue(clientInfo.clientId));
        setText('modalClientName', formatValue(clientInfo.clientName));
        setText('modalClientType', formatValue(clientInfo.clientTypeId));
        setText('modalTitle', formatValue(clientInfo.titleId));
        setText('modalGender', formatValue(clientInfo.gender));
        setText('modalDOB', formatDate(clientInfo.dateOfBirth));
        setText('modalAge', formatValue(clientInfo.age));
        setText('modalBranchId', formatValue(clientInfo.clientBranchId));
        setText('modalAddress1', formatValue(clientInfo.address1));
        setText('modalAddress2', formatValue(clientInfo.address2));
        setText('modalCity', formatValue(clientInfo.city));
        setText('modalCountry', formatValue(clientInfo.country));
        setText('modalPhone', formatValue(clientInfo.phone1));
        setText('modalMobile', formatValue(clientInfo.mobile));
        setText('modalEmail', formatValue(clientInfo.email));
        setText('modalClientLimit', formatValue(clientInfo.clientLimit));

        const modalEl = document.getElementById('clientDetailsModal');
        if (modalEl && window.bootstrap?.Modal) {
            const modal = new window.bootstrap.Modal(modalEl);
            modal.show();
        }
    }

    function handleView() {
        fetchLoanApplication();
    }

    function handleAdd() {
        setStateAdd();
    }

    function handleEdit() {
        if (!state.currentRecord) {
            showToast('Please view a record first before editing.', 'warning');
            return;
        }
        setStateEdit();
    }

    async function handleDelete() {
        const applicationId = getFieldValue('applicationId');
        if (!applicationId) {
            showToast('Please select a record to delete.', 'warning');
            return;
        }

        if (!confirm('Are you sure you want to delete this loan application? This action cannot be undone.')) {
            return;
        }

        try {
            showLoading(true);
            await AppCore.invokeControllerAsync('WorkFlowLoan/LoanApplicationSyndicate/delete', {
                OurBranchID: getOurBranchId(),
                ApplicationId: applicationId,
                UpdateCount: state.currentRecord?.UpdateCount || 1
            });

            showToast('Record deleted successfully.', 'success');
            clearForm();
            setStateInitial();
        } catch (error) {
            showToast('Failed to delete record: ' + error.message, 'error');
        } finally {
            showLoading(false);
        }
    }

    async function handleSave() {
        if (!isFormValid()) return;

        try {
            showLoading(true);

            const mainPayload = buildMainApplicationPayload();
            const mainResponse = await AppCore.invokeControllerAsync('WorkFlowLoan/LoanApplicationSyndicate/save', mainPayload);
            console.log('[LoanApplicationSyndicate] DB response (main save):', mainResponse);
            const savedAppId = extractApplicationId(mainResponse);

            if (!savedAppId) {
                const dbError = extractSaveErrorMessage(mainResponse);
                throw new Error(dbError || 'No Application ID returned from save.');
            }

            if (state.bankSyndicateData.length > 0) {
                const syndicatePayload = buildBankSyndicatePayload(savedAppId);
                const syndicateResponse = await AppCore.invokeControllerAsync('WorkFlowLoan/LoanApplicationSyndicate/save-syndicate', syndicatePayload);
                console.log('[LoanApplicationSyndicate] DB response (syndicate save):', syndicateResponse);
                const syndicateError = extractSaveErrorMessage(syndicateResponse);
                if (syndicateError) {
                    throw new Error(syndicateError);
                }
            }

            setFieldValue('applicationId', savedAppId);
            showToast('Record saved successfully.', 'success');
            setStateInitial();
        } catch (error) {
            const actualError = extractErrorMessage(error);
            showToast('Failed to save record: ' + actualError, 'error');
        } finally {
            showLoading(false);
        }
    }

    function handleCancel() {
        if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
            clearForm();
            setStateInitial();
            showToast('Changes cancelled.', 'info');
        }
    }

    function handleBankNew() {
        setFieldValue('bankId', '');
        setFieldValue('bankName', '');
        setFieldValue('percentage', '');
        state.selectedBankIndex = null;
        elements.bankId?.focus();
    }

    function handleBankAlter() {
        if (state.selectedBankIndex === null) {
            showToast('Please select a bank record to alter.', 'warning');
            return;
        }
        const bank = state.bankSyndicateData[state.selectedBankIndex];
        setFieldValue('bankId', bank.bankId);
        setFieldValue('bankName', bank.bankName);
        setFieldValue('percentage', formatMoney(parseMoneyInput(bank.percentage)));
    }

    function handleBankRemove() {
        if (state.selectedBankIndex === null) {
            showToast('Please select a bank record to remove.', 'warning');
            return;
        }
        if (!confirm('Are you sure you want to remove this bank?')) return;
        state.bankSyndicateData.splice(state.selectedBankIndex, 1);
        populateBankTable();
        handleBankClear();
        showToast('Bank removed successfully.', 'success');
    }

    function handleBankUpdate() {
        const bankId = getFieldValue('bankId');
        const percentage = getFieldValue('percentage');
        if (!bankId || !percentage) {
            showToast('Please enter Bank ID and Percentage.', 'warning');
            return;
        }

        const bankData = {
            bankId,
            bankName: getFieldValue('bankName') || bankId,
            percentage
        };

        if (state.selectedBankIndex !== null) {
            state.bankSyndicateData[state.selectedBankIndex] = bankData;
            showToast('Bank updated successfully.', 'success');
        } else {
            state.bankSyndicateData.push(bankData);
            showToast('Bank added successfully.', 'success');
        }

        populateBankTable();
        handleBankClear();
        reformatAllMoneyFields();
    }

    function handleBankClear() {
        setFieldValue('bankId', '');
        setFieldValue('bankName', '');
        setFieldValue('percentage', '');
        state.selectedBankIndex = null;
        elements.bankTableBody?.querySelectorAll('tr').forEach(row => row.classList.remove('table-active'));
    }

    function handleBankRowSelection(event) {
        const row = event.target.closest('tr');
        if (!row || row.classList.contains('no-records')) return;

        elements.bankTableBody?.querySelectorAll('tr').forEach(r => r.classList.remove('table-active'));
        row.classList.add('table-active');
        state.selectedBankIndex = parseInt(row.dataset.index, 10);

        const bank = state.bankSyndicateData[state.selectedBankIndex];
        setFieldValue('bankId', bank.bankId);
        setFieldValue('bankName', bank.bankName);
        setFieldValue('percentage', formatMoney(parseMoneyInput(bank.percentage)));
    }

    function populateBankTable() {
        if (!elements.bankTableBody) return;
        elements.bankTableBody.innerHTML = '';

        if (!state.bankSyndicateData.length) {
            elements.bankTableBody.innerHTML = '<tr class="no-records"><td colspan="3" class="text-center text-muted py-3">No records to display.</td></tr>';
            return;
        }

        state.bankSyndicateData.forEach((bank, index) => {
            const row = document.createElement('tr');
            row.dataset.index = index;
            row.innerHTML = `
                <td>${bank.bankId}</td>
                <td>${bank.bankName}</td>
                <td>${bank.percentage}</td>
            `;
            elements.bankTableBody.appendChild(row);
        });
    }

    function setStateInitial() {
        enableFieldsById(['branchId', 'applicationId', 'date']);
        disableFieldsById([
            'clientBranchId', 'clientBranchName', 'clientId', 'clientName',
            'productId', 'productName', 'mainRepaymentAccountId', 'mainRepaymentAccountName',
            'donorId', 'donorName', 'loanPurpose', 'lineOfBusiness', 'officerId', 'officerName',
            'loanAmount', 'currencyId', 'term', 'interestRate', 'commissionRate', 'taxRate',
            'effectiveRate', 'disbursementDate', 'monthlyProfit', 'monthlyTurnOver', 'totalAssets',
            'businessLocation', 'businessStatus', 'startupCapitalCollateral', 'spread', 'loanLimitType',
            'fileNumber', 'applicationStatus', 'salesOfficer', 'salesOfficerName',
            'bankId', 'bankName', 'percentage'
        ]);

        toggleActionButtons({ view: true, add: true, edit: false, delete: false, save: false, cancel: false });
        toggleBankButtons(false);
        toggleMoreInfo(false);

        disableLookupButtons(['ClientBranch', 'Client', 'Product', 'Account', 'Donor', 'Officer', 'SalesOfficer', 'Bank']);

        state.currentMode = 'VIEW';
        state.currentRecord = null;
        state.bankSyndicateData = [];
        state.selectedBankIndex = null;
        state.hasClientDetails = false;
        state.productSlabs = [];
        state.productInfo = null;

        populateBankTable();
        showToast('Ready to search. Enter Branch ID and Application ID, then click View.', 'info');
    }

    function setStateAdd() {
        clearForm({ preserveBranchContext: true });

        // New application should retain selected branch context but always start with empty application ID.
        setFieldValue('applicationId', '');
        setFieldValue('applicationName', '');

        disableFieldsById(['branchId', 'applicationId', 'date']);
        enableFieldsById([
            'clientBranchId', 'clientBranchName', 'clientId', 'clientName',
            'productId', 'productName', 'mainRepaymentAccountId', 'mainRepaymentAccountName',
            'donorId', 'donorName', 'loanPurpose', 'lineOfBusiness', 'officerId', 'officerName',
            'loanAmount', 'currencyId', 'term', 'interestRate', 'commissionRate', 'taxRate',
            'effectiveRate', 'disbursementDate', 'monthlyProfit', 'monthlyTurnOver', 'totalAssets',
            'businessLocation', 'businessStatus', 'startupCapitalCollateral', 'spread', 'loanLimitType',
            'fileNumber', 'applicationStatus', 'salesOfficer', 'salesOfficerName',
            'bankId', 'bankName', 'percentage'
        ]);

        toggleActionButtons({ view: false, add: false, edit: false, delete: false, save: true, cancel: true });
        toggleBankButtons(true);
        enableAllLookupButtons();

        state.currentMode = 'NEW';
        state.currentRecord = null;
        state.hasClientDetails = false;

        elements.clientId?.focus();
        showToast('ADD mode: Fill in all required fields and click Save.', 'info');
    }

    function setStateView() {
        disableAllFields();

        toggleActionButtons({ view: true, add: true, edit: true, delete: true, save: false, cancel: false });
        toggleBankButtons(false);
        toggleMoreInfo(true);

        state.currentMode = 'VIEW';
        showToast('Record loaded. Click Edit to modify or Delete to remove.', 'info');
    }

    function setStateEdit() {
        disableFieldsById(['branchId', 'applicationId', 'date']);
        enableFieldsById([
            'clientBranchId', 'clientBranchName', 'clientId', 'clientName',
            'productId', 'productName', 'mainRepaymentAccountId', 'mainRepaymentAccountName',
            'donorId', 'donorName', 'loanPurpose', 'lineOfBusiness', 'officerId', 'officerName',
            'loanAmount', 'currencyId', 'term', 'interestRate', 'commissionRate', 'taxRate',
            'effectiveRate', 'disbursementDate', 'monthlyProfit', 'monthlyTurnOver', 'totalAssets',
            'businessLocation', 'businessStatus', 'startupCapitalCollateral', 'spread', 'loanLimitType',
            'fileNumber', 'applicationStatus', 'salesOfficer', 'salesOfficerName',
            'bankId', 'bankName', 'percentage'
        ]);

        toggleActionButtons({ view: false, add: false, edit: false, delete: false, save: true, cancel: true });
        toggleBankButtons(true);
        enableAllLookupButtons();

        state.currentMode = 'EDIT';
        showToast('EDIT mode: Modify fields and click Save to update.', 'info');
    }

    function enableFieldsById(fieldIds) {
        fieldIds.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) field.disabled = false;
        });
    }

    function disableFieldsById(fieldIds) {
        fieldIds.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field && !field.hasAttribute('data-always-readonly')) {
                field.disabled = true;
            }
        });
    }

    function disableAllFields() {
        document.querySelectorAll('#frm_las input, #frm_las select, #frm_las textarea').forEach(field => {
            if (!field.hasAttribute('data-always-readonly')) {
                field.disabled = true;
            }
        });
    }

    function toggleActionButtons({ view, add, edit, delete: del, save, cancel }) {
        if (elements.viewBtn) elements.viewBtn.disabled = !view;
        if (elements.addBtn) elements.addBtn.disabled = !add;
        if (elements.editBtn) elements.editBtn.disabled = !edit;
        if (elements.deleteBtn) elements.deleteBtn.disabled = !del;
        if (elements.saveBtn) elements.saveBtn.disabled = !save;
        if (elements.cancelBtn) elements.cancelBtn.disabled = !cancel;
    }

    function toggleBankButtons(enabled) {
        if (elements.newBtn) elements.newBtn.disabled = !enabled;
        if (elements.alterBtn) elements.alterBtn.disabled = !enabled;
        if (elements.removeBtn) elements.removeBtn.disabled = !enabled;
        if (elements.updateBtn) elements.updateBtn.disabled = !enabled;
        if (elements.clearBtn) elements.clearBtn.disabled = !enabled;
    }

    function toggleMoreInfo(enabled) {
        if (elements.moreInfoBtn) elements.moreInfoBtn.disabled = !enabled;
    }

    function enableAllLookupButtons() {
        document.querySelectorAll('.btn-lookup[data-lookup]').forEach(btn => {
            btn.disabled = false;
        });
    }

    function disableLookupButtons(lookupKeys) {
        document.querySelectorAll('.btn-lookup[data-lookup]').forEach(btn => {
            const key = btn.getAttribute('data-lookup');
            if (lookupKeys.includes(key)) {
                btn.disabled = true;
            }
        });
    }

    function clearForm(options = {}) {
        const { preserveBranchContext = false } = options;
        const preservedBranchId = preserveBranchContext ? getFieldValue('branchId') : '';
        const preservedBranchName = preserveBranchContext ? getFieldValue('branchName') : '';

        document.querySelectorAll('#frm_las input, #frm_las select, #frm_las textarea').forEach(field => {
            if (field.type === 'hidden') return;
            if (field.hasAttribute('data-always-readonly')) {
                field.value = '';
                return;
            }
            field.value = '';
        });

        if (preserveBranchContext) {
            setFieldValue('branchId', preservedBranchId);
            setFieldValue('branchName', preservedBranchName);
            setFieldValue('clientBranchId', preservedBranchId);
            setFieldValue('clientBranchName', preservedBranchName);
        }

        setDefaultDate();
        state.bankSyndicateData = [];
        populateBankTable();
        state.currentRecord = null;
        state.hasClientDetails = false;
        state.productSlabs = [];
        state.productInfo = null;
    }

    function setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        if (elements.date) elements.date.value = today;
        if (elements.disbursementDate) elements.disbursementDate.value = today;
    }

    function resetProductDependentFields() {
        setFieldValue('term', '');
        setFieldValue('loanAmount', '');
        setFieldValue('interestRate', '');
        setFieldValue('commissionRate', '');
        setFieldValue('taxRate', '');
        setFieldValue('effectiveRate', '');
        setFieldValue('spread', '');
        setFieldValue('monthlyProfit', '');
        setFieldValue('monthlyTurnOver', '');
        setFieldValue('totalAssets', '');
        setFieldValue('businessLocation', '');
        setFieldValue('businessStatus', '');
        setFieldValue('startupCapitalCollateral', '');
        setFieldValue('loanLimitType', '');
        if (elements.disbursementDate) elements.disbursementDate.value = '';
    }

    function isFormValid() {
        const requiredFields = [
            { id: 'branchId', label: 'Branch ID' },
            { id: 'clientId', label: 'Client ID' },
            { id: 'productId', label: 'Product ID' },
            { id: 'officerId', label: 'Officer ID' },
            { id: 'loanAmount', label: 'Loan Amount' },
            { id: 'term', label: 'Term' },
            { id: 'commissionRate', label: 'Commission Rate' },
            { id: 'taxRate', label: 'Tax Rate' }
        ];

        for (const field of requiredFields) {
            const value = getFieldValue(field.id);
            if (!value) {
                showToast(`${field.label} is required.`, 'error');
                document.getElementById(field.id)?.focus();
                return false;
            }
        }

        const numericFields = [
            { id: 'loanAmount', label: 'Loan Amount', min: 0 },
            { id: 'term', label: 'Term', min: 0 },
            { id: 'interestRate', label: 'Interest Rate', min: 0, max: 100 },
            { id: 'commissionRate', label: 'Commission Rate', min: 0, max: 100 },
            { id: 'taxRate', label: 'Tax Rate', min: 0, max: 100 }
        ];

        for (const field of numericFields) {
            const valueRaw = getFieldValue(field.id);
            if (valueRaw) {
                const value = parseFloat(parseMoneyInput(valueRaw));
                if (Number.isNaN(value)) {
                    showToast(`${field.label} must be a valid number.`, 'error');
                    document.getElementById(field.id)?.focus();
                    return false;
                }
                if (field.min !== undefined && value < field.min) {
                    showToast(`${field.label} cannot be less than ${field.min}.`, 'error');
                    document.getElementById(field.id)?.focus();
                    return false;
                }
                if (field.max !== undefined && value > field.max) {
                    showToast(`${field.label} cannot exceed ${field.max}.`, 'error');
                    document.getElementById(field.id)?.focus();
                    return false;
                }
            }
        }

        if (state.bankSyndicateData.length > 0) {
            const totalPercentage = state.bankSyndicateData.reduce((sum, bank) => {
                return sum + (parseFloat(parseMoneyInput(bank.percentage)) || 0);
            }, 0);

            if (Math.abs(totalPercentage - 100) > 0.01) {
                showToast(`Bank syndicate percentages must total 100% (currently ${totalPercentage.toFixed(2)}%).`, 'error');
                return false;
            }
        }

        const applicationDate = new Date(getFieldValue('date'));
        const disbursementDateValue = getFieldValue('disbursementDate');
        const disbursementDate = disbursementDateValue ? new Date(disbursementDateValue) : null;
        if (disbursementDate && disbursementDate < applicationDate) {
            showToast('Disbursement date cannot be before application date.', 'error');
            elements.disbursementDate?.focus();
            return false;
        }

        return true;
    }

    function buildMainApplicationPayload() {
        const applicationDate = getDateValue(elements.date);
        const disbursementDate = getDateValue(elements.disbursementDate);

        const businessDetails = {
            MonthlyProfit: parseFloat(parseMoneyInput(getFieldValue('monthlyProfit'))) || 0,
            MonthlyTurnOver: parseFloat(parseMoneyInput(getFieldValue('monthlyTurnOver'))) || 0,
            TotalAssets: parseFloat(parseMoneyInput(getFieldValue('totalAssets'))) || 0,
            BusinessLocation: getFieldValue('businessLocation') || '',
            BusinessStatus: getFieldValue('businessStatus') || '',
            StartUpCapitalCollatelar: getFieldValue('startupCapitalCollateral') || '',
            LoanLimitType: getFieldValue('loanLimitType') || '',
            CollateralType: 'C'
        };

        return {
            OurBranchID: getOurBranchId(),
            ApplicationID: state.currentMode === 'EDIT' ? getFieldValue('applicationId') : '',
            ApplicationDate: applicationDate,
            WFAdvTypeID: '',
            IsExistingClient: 1,
            ClientID: getFieldValue('clientId'),
            ProductID: getFieldValue('productId'),
            RepaymentAccountID: getFieldValue('mainRepaymentAccountId'),
            PurposeCodeID: getFieldValue('loanPurpose'),
            CreditOfficerID: getFieldValue('officerId'),
            SalesOfficerID: getFieldValue('salesOfficer'),
            LoanAmount: parseFloat(parseMoneyInput(getFieldValue('loanAmount'))) || 0,
            LoanTerm: parseInt(getFieldValue('term'), 10) || 0,
            LoanPeriodID: state.productInfo?.loanPeriodId || state.currentRecord?.LoanPeriodID || 'M',
            DisbursementDate: disbursementDate,
            BusinessLineID: getFieldValue('lineOfBusiness'),
            AccountClassID: state.currentRecord?.AccountClassID || 'CLAL',
            FileNumber: getFieldValue('fileNumber'),
            InterestRate: parseFloat(parseMoneyInput(getFieldValue('interestRate'))) || 0,
            BusinessDetails: JSON.stringify(businessDetails),
            CommissionRate: parseFloat(parseMoneyInput(getFieldValue('commissionRate'))) || 0,
            TaxRate: parseFloat(parseMoneyInput(getFieldValue('taxRate'))) || 0,
            EffectiveRate: parseFloat(parseMoneyInput(getFieldValue('effectiveRate'))) || 0,
            Penalty: '',
            CreatedBy: state.operatorId || '',
            CreatedOn: '',
            ModifiedBy: state.currentMode === 'EDIT' ? (state.operatorId || '') : '',
            ModifiedOn: '',
            LoanTypeID: 'N',
            UpdateCount: state.currentRecord?.UpdateCount || 1,
            ProductEffective: parseFloat(parseMoneyInput(getFieldValue('effectiveRate'))) || 0,
            DonorID: getFieldValue('donorId'),
            GroupID: '',
            SubGroupID: '',
            LoanSchemeID: '',
            IsOutPutRequired: 1
        };
    }

    function buildBankSyndicatePayload(applicationId) {
        const detailRecords = buildBankSyndicateDetailRecordsXml(state.bankSyndicateData);

        return {
            DetailRecords: detailRecords,
            OurBranchID: getOurBranchId(),
            ApplicationID: applicationId || '',
            CreatedBy: state.operatorId || '',
            CreatedOn: '',
            UpdateCount: state.currentRecord?.UpdateCount || 1
        };
    }

    function buildBankSyndicateDetailRecordsXml(records) {
        if (!Array.isArray(records) || records.length === 0) {
            return '';
        }

        const escapeXml = (value) => String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\"/g, '&quot;')
            .replace(/'/g, '&apos;');

        let xml = '';
        records.forEach((bank) => {
            const bankId = escapeXml(bank.bankId || '');
            const percentage = parseFloat(parseMoneyInput(bank.percentage)) || 0;
            xml += '<dt_WFLoanBankSyndicate>';
            xml += `<BankID>${bankId}</BankID>`;
            xml += `<Percentage>${percentage}</Percentage>`;
            xml += '</dt_WFLoanBankSyndicate>';
        });

        return xml;
    }

    function extractApplicationId(response) {
        if (!response) return '';

        // 1) Common direct locations first (fast path)
        const directCandidates = [
            response.ApplicationID,
            response.ApplicationId,
            response.applicationId,
            response.data?.ApplicationID,
            response.data?.ApplicationId,
            response.data?.applicationId,
            response.data?.data?.ApplicationID,
            response.data?.data?.ApplicationId,
            response.data?.data?.applicationId
        ];

        for (const value of directCandidates) {
            const normalized = normalizeApplicationId(value);
            if (normalized) return normalized;
        }

        // 2) Existing Details array pattern
        const details = extractOldApiDetails(response);
        for (const row of details) {
            const normalized = normalizeApplicationId(
                row?.ApplicationID || row?.ApplicationId || row?.applicationId || row?.AppID || row?.AppId
            );
            if (normalized) return normalized;
        }

        // 3) Deep recursive search for any ApplicationID key
        const deepMatch = findApplicationIdDeep(response);
        if (deepMatch) return deepMatch;

        // 4) Try parsing from message text if backend embeds it there
        const textHints = [
            response?.message,
            response?.Message,
            response?.data?.message,
            response?.data?.Message,
            response?.data?.data?.message,
            response?.data?.data?.Message
        ];

        for (const text of textHints) {
            const parsed = parseApplicationIdFromText(text);
            if (parsed) return parsed;
        }

        return '';
    }

    function normalizeApplicationId(value) {
        if (value === null || value === undefined) return '';
        const text = String(value).trim();
        if (!text || text.toLowerCase() === 'null' || text.toLowerCase() === 'undefined') return '';
        return text;
    }

    function findApplicationIdDeep(node, visited = new Set()) {
        if (!node || typeof node !== 'object') return '';
        if (visited.has(node)) return '';
        visited.add(node);

        const keys = Object.keys(node);
        for (const key of keys) {
            if (/^applicationid$/i.test(key) || /^applicationid$/i.test(key.replace(/[^a-z]/gi, ''))) {
                const normalized = normalizeApplicationId(node[key]);
                if (normalized) return normalized;
            }
        }

        for (const key of keys) {
            const child = node[key];
            if (Array.isArray(child)) {
                for (const item of child) {
                    const nested = findApplicationIdDeep(item, visited);
                    if (nested) return nested;
                }
            } else if (child && typeof child === 'object') {
                const nested = findApplicationIdDeep(child, visited);
                if (nested) return nested;
            }
        }

        return '';
    }

    function parseApplicationIdFromText(text) {
        if (!text || typeof text !== 'string') return '';

        // Examples handled:
        // "ApplicationID=0603..." / "Application ID : 0603..." / "AppID-0603..."
        const patterns = [
            /application\s*id\s*[:=\-]\s*([A-Za-z0-9]+)/i,
            /appid\s*[:=\-]\s*([A-Za-z0-9]+)/i
        ];

        for (const rx of patterns) {
            const match = text.match(rx);
            if (match && match[1]) {
                return normalizeApplicationId(match[1]);
            }
        }

        return '';
    }

    function extractSaveErrorMessage(response) {
        if (!response) return '';

        const possibleValues = [
            response.message,
            response.Message,
            response.error,
            response.Error,
            response.errorMessage,
            response.ErrorMessage,
            response.responseMessage,
            response.ResponseMessage,
            response.data?.message,
            response.data?.Message,
            response.data?.error,
            response.data?.Error,
            response.data?.errorMessage,
            response.data?.ErrorMessage,
            response.data?.responseMessage,
            response.data?.ResponseMessage
        ];

        const details = extractOldApiDetails(response);
        if (details.length > 0) {
            const detail = details[0] || {};
            possibleValues.push(
                detail.message,
                detail.Message,
                detail.error,
                detail.Error,
                detail.errorMessage,
                detail.ErrorMessage,
                detail.responseMessage,
                detail.ResponseMessage,
                detail.DBError,
                detail.DbError,
                detail.DBMessage,
                detail.ErrorDescription,
                detail.ErrorDesc,
                detail.ExceptionMessage
            );
        }

        const meaningful = possibleValues.find((v) => typeof v === 'string' && v.trim() && v.trim().toLowerCase() !== 'saved successfully');
        return meaningful ? meaningful.trim() : '';
    }

    function extractErrorMessage(error) {
        if (!error) return 'Unknown error';
        if (typeof error === 'string' && error.trim()) return error.trim();

        const possibleValues = [
            error.message,
            error.Message,
            error.error,
            error.Error,
            error.errorMessage,
            error.ErrorMessage,
            error.response?.data?.message,
            error.response?.data?.Message,
            error.response?.data?.error,
            error.response?.data?.Error,
            error.responseJSON?.message,
            error.responseJSON?.Message
        ];

        const found = possibleValues.find((v) => typeof v === 'string' && v.trim());
        return found ? found.trim() : 'Unknown error';
    }

    function extractOldApiDetails(response) {
        const data = response?.data || response;
        if (!data) return [];
        if (Array.isArray(data.Details)) return data.Details;
        if (Array.isArray(data.details)) return data.details;
        if (data.Details) return [data.Details];
        return [];
    }

    function extractOldApiDetailSet(response, keys) {
        const data = response?.data || response;
        if (!data) return [];
        for (const key of keys) {
            if (Array.isArray(data[key])) return data[key];
        }
        return [];
    }

    function extractDetailArray(data, key) {
        if (!data) return [];
        if (Array.isArray(data[key])) return data[key];
        return [];
    }

    function handleTermBlur() {
        const term = getFieldValue('term');
        const productId = getFieldValue('productId');
        const loanAmount = getFieldValue('loanAmount');

        if (!term || !productId) {
            clearRateFields();
            return;
        }

        if (!loanAmount) {
            return;
        }

        checkSlabDetails(productId, term, loanAmount);
    }

    function checkSlabDetails(productId, term, loanAmount) {
        if (!productId) return false;
        const slabs = state.productSlabs || [];
        if (!slabs.length) {
            showToast('No slab configuration found for this product.', 'warning');
            return false;
        }

        const termValue = parseFloat(term || 0);
        const amountValue = parseFloat(parseMoneyInput(loanAmount || 0));
        let slabCount = 0;

        for (let i = 0; i < slabs.length; i += 1) {
            const slab = slabs[i];
            const termFrom = parseFloat(slab.TermFrom || 0);
            const termTo = parseFloat(slab.TermTo || 0);
            const amountFrom = parseFloat(slab.AmountSlabFrom || 0);
            const amountTo = parseFloat(slab.AmountSlabTo || 0);

            if (termValue >= termFrom && termValue <= termTo) {
                slabCount = 1;
                if (amountValue >= amountFrom && amountValue <= amountTo) {
                    slabCount = 2;

                    if (slab.EffectiveRate !== undefined && slab.EffectiveRate !== null) {
                        setFieldValue('interestRate', slab.EffectiveRate);
                        setReadOnly('interestRate', true);
                    }
                    if (slab.ProductEffectiveRate !== undefined && slab.ProductEffectiveRate !== null) {
                        setFieldValue('effectiveRate', slab.ProductEffectiveRate);
                    }
                    if (slab.CommissionRate !== undefined && slab.CommissionRate !== null) {
                        setFieldValue('commissionRate', slab.CommissionRate);
                        setReadOnly('commissionRate', true);
                    }
                    if (slab.TaxRate !== undefined && slab.TaxRate !== null) {
                        setFieldValue('taxRate', slab.TaxRate);
                        setReadOnly('taxRate', true);
                    }
                    if (slab.MarkingRate !== undefined && slab.MarkingRate !== null) {
                        setFieldValue('spread', slab.MarkingRate);
                    }

                    reformatAllMoneyFields();
                    showToast('Rates populated successfully from product slab.', 'success');
                    return true;
                }
            }
        }

        if (slabCount === 0) {
            clearRateFields();
            showToast('Term does not match any configured slab range.', 'error');
        } else if (slabCount === 1) {
            clearRateFields();
            showToast('Loan amount does not match the amount range for the selected term.', 'error');
        }

        return false;
    }

    function clearRateFields() {
        setFieldValue('interestRate', '');
        setReadOnly('interestRate', false);
        setFieldValue('commissionRate', '');
        setReadOnly('commissionRate', false);
        setFieldValue('taxRate', '');
        setReadOnly('taxRate', false);
    }

    function setReadOnly(fieldId, readOnly) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.readOnly = readOnly;
        }
    }

    function setupRateCalculations() {
        ['interestRate', 'commissionRate', 'taxRate', 'spread'].forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('change', calculateEffectiveRate);
                field.addEventListener('blur', calculateEffectiveRate);
            }
        });
    }

    function calculateEffectiveRate() {
        const interestRate = parseFloat(parseMoneyInput(getFieldValue('interestRate'))) || 0;
        const commissionRate = parseFloat(parseMoneyInput(getFieldValue('commissionRate'))) || 0;
        const taxRate = parseFloat(parseMoneyInput(getFieldValue('taxRate'))) || 0;
        const spread = parseFloat(parseMoneyInput(getFieldValue('spread'))) || 0;

        const effectiveRate = interestRate + commissionRate + taxRate + spread;
        setFieldValue('effectiveRate', formatMoney(effectiveRate.toFixed(4)));
        return effectiveRate;
    }

    function wireMoneyFields() {
        const moneySelectors = [
            'input[data-format="money"]',
            'input[data-format="currency"]'
        ];

        const moneyFields = document.querySelectorAll(moneySelectors.join(','));
        moneyFields.forEach(field => {
            if (field.readOnly || field.disabled) {
                if (field.value) {
                    field.value = formatMoney(parseMoneyInput(field.value));
                }
                return;
            }

            field.addEventListener('blur', function () {
                const raw = parseMoneyInput(this.value);
                if (raw !== '') this.value = formatMoney(raw);
            });

            field.addEventListener('focus', function () {
                const raw = parseMoneyInput(this.value);
                if (raw !== '') this.value = raw;
            });

            if (field.value) {
                field.value = formatMoney(parseMoneyInput(field.value));
            }
        });
    }

    function reformatAllMoneyFields() {
        document.querySelectorAll('input[data-format="money"], input[data-format="currency"]').forEach(field => {
            if (field.value) {
                field.value = formatMoney(parseMoneyInput(field.value));
            }
        });
    }

    function formatMoney(value) {
        if (value === null || value === undefined || value === '') return '';
        const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, '').trim());
        if (Number.isNaN(num)) return '';
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function parseMoneyInput(value) {
        if (value === null || value === undefined || value === '') return '';
        return String(value).replace(/,/g, '').trim();
    }

    function getDateValue(element) {
        if (!element) return '';
        if (element._flatpickr) {
            const dates = element._flatpickr.selectedDates;
            if (dates && dates.length > 0) {
                const date = dates[0];
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
        }
        return element.value || '';
    }

    function formatDateValue(value) {
        if (!value) return '';
        try {
            return new Date(value).toISOString().split('T')[0];
        } catch {
            return value;
        }
    }

    function getOurBranchId() {
        return getFieldValue('branchId') || state.branchId || '';
    }

    function getFieldValue(fieldId) {
        const el = document.getElementById(fieldId);
        return el ? String(el.value || '').trim() : '';
    }

    function setFieldValue(fieldId, value) {
        const el = document.getElementById(fieldId);
        if (el) {
            el.value = value === null || value === undefined ? '' : value;
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    function setText(elementId, value) {
        const el = document.getElementById(elementId);
        if (el) el.textContent = value || '';
    }

    function escapeSqlLike(value) {
        return String(value).replace(/'/g, "''");
    }

    function showLoading(show) {
        const overlay = document.getElementById('pageLoadingOverlay');
        if (overlay) overlay.style.display = show ? 'flex' : 'none';
    }

    function showToast(message, type) {
        if (window.NotificationService?.showToast) {
            window.NotificationService.showToast(message, type || 'info', 5000);
            return;
        }
        const panel = document.getElementById('amMessagePanel');
        const text = document.getElementById('messagePanelText');
        if (panel && text) {
            text.textContent = message;
            panel.classList.add('show');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
