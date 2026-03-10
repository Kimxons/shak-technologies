const CLIENT_SUPERVISION_CONTROLLER_BASE = 'Identities/ClientSupervision';

function getAppCore() {
    const win = window;
    return win.AppCore ||
        (win.parent && win.parent !== win && win.parent.AppCore) ||
        (win.top && win.top !== win && win.top.AppCore) ||
        null;
}

function invokeClientSupervisionController(action, requestData, method = 'POST') {
    return new Promise((resolve, reject) => {
        const appCore = getAppCore();
        if (!appCore) {
            reject(new Error('AppCore is not available'));
            return;
        }

        const endpoint = `${CLIENT_SUPERVISION_CONTROLLER_BASE}/${action}`;

        if (typeof appCore.invokeControllerByMethodAsync === 'function') {
            appCore.invokeControllerByMethodAsync(endpoint, method, requestData || {}, {
                useQueryString: method.toUpperCase() === 'GET'
            }).then(resolve).catch(reject);
            return;
        }

        if (typeof appCore.invokeController === 'function') {
            appCore.invokeController(endpoint, requestData || {}, (error, response) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(response);
                }
            });
            return;
        }

        reject(new Error('AppCore invocation methods are not available'));
    });
}

const ClientSupervisionService = {
    getBranchList(requestData) { return invokeClientSupervisionController('get-branch-list', requestData); },
    getPendingSupervisions(requestData) { return invokeClientSupervisionController('get-pending-supervisions', requestData); },
    approveSupervision(requestData) { return invokeClientSupervisionController('approve-supervision', requestData); },
    rejectSupervision(requestData) { return invokeClientSupervisionController('reject-supervision', requestData); },
    getClientBasicDetails(requestData) { return invokeClientSupervisionController('get-client-basic-details', requestData); },
    getClientIndividualDetails(requestData) { return invokeClientSupervisionController('get-client-individual-details', requestData); },
    getClientCorporateDetails(requestData) { return invokeClientSupervisionController('get-client-corporate-details', requestData); },
    getClientAddressDetails(requestData) { return invokeClientSupervisionController('get-client-address-details', requestData); },
    getClientEmploymentDetails(requestData) { return invokeClientSupervisionController('get-client-employment-details', requestData); },
    getClientOtherDetails(requestData) { return invokeClientSupervisionController('get-client-other-details', requestData); },
    getClientPhotoSignature(requestData) { return invokeClientSupervisionController('get-client-photo-signature', requestData); }
};

window.ClientSupervisionService = ClientSupervisionService;

class ClientSupervisionController {
    constructor() {
        this.supervisionList = [];
        this.currentClient = null;
        this.selectedBranches = [];
        this.lookupCache = {};
        this.searchModal = null;
        this.photoSignatures = [];
        this.lastMessageKey = null;
        this.lastMessageAt = 0;
    this.moduleId = (document.getElementById('moduleId')?.value || '10587').toString();

        this.elements = {
            messagePanel: document.getElementById('dv_messagePanel'),
            messageText: document.getElementById('spn_messageText'),

            branchFilterBtn: document.getElementById('btn_branchFilter'),
            branchFilterText: document.getElementById('spn_branchFilterText'),
            branchFilterOptions: document.getElementById('dv_branchFilterOptions'),
            branchCheckboxList: document.getElementById('dv_branchCheckboxList'),
            selectAllBranches: document.getElementById('chk_selectAllBranches'),

            clientIdSearch: document.getElementById('txt_clientIdSearch'),
            searchClientBtn: document.getElementById('btn_searchClient'),

            supervisionTableBody: document.getElementById('tbl_supervisionBody'),
            recordCount: document.getElementById('spn_recordCount'),
            clientDetailsSection: document.getElementById('dv_clientDetailsSection'),

            txtClientId: document.getElementById('txt_clientId'),
            ddlClientType: document.getElementById('ddl_clientType'),
            ddlTitle: document.getElementById('ddl_title'),
            txtFirstName: document.getElementById('txt_firstName'),
            txtMiddleName: document.getElementById('txt_middleName'),
            txtLastName: document.getElementById('txt_lastName'),
            txtDob: document.getElementById('txt_dob'),
            ddlGender: document.getElementById('ddl_gender'),
            ddlResident: document.getElementById('ddl_resident'),
            ddlNationality: document.getElementById('ddl_nationality'),
            ddlLiteracyLevel: document.getElementById('ddl_literacyLevel'),
            txtIssuedBy: document.getElementById('txt_issuedBy'),
            ddlIdentificationType: document.getElementById('ddl_identificationType'),
            txtIdentificationNo: document.getElementById('txt_identificationNo'),
            txtIdentificationIssueDate: document.getElementById('txt_identificationIssueDate'),
            txtIdentificationExpiryDate: document.getElementById('txt_identificationExpiryDate'),
            ddlMaritalStatus: document.getElementById('ddl_maritalStatus'),
            txtMotherName: document.getElementById('txt_motherName'),

            txtCorpClientId: document.getElementById('txt_corpClientId'),
            ddlCorpClientType: document.getElementById('ddl_corpClientType'),
            txtCorpClientName: document.getElementById('txt_corpClientName'),
            txtCorpCompanyName: document.getElementById('txt_corpCompanyName'),
            ddlCorpConstitution: document.getElementById('ddl_corpConstitution'),
            ddlCorpLineOfBusiness: document.getElementById('ddl_corpLineOfBusiness'),
            ddlCorpIdentificationType: document.getElementById('ddl_corpIdentificationType'),
            txtCorpIdentificationNo: document.getElementById('txt_corpIdentificationNo'),
            txtCorpRegDate: document.getElementById('txt_corpRegDate'),
            txtCorpIssuedBy: document.getElementById('txt_corpIssuedBy'),
            txtCorpIdentificationIssueDate: document.getElementById('txt_corpIdentificationIssueDate'),
            txtCorpIdentificationExpiryDate: document.getElementById('txt_corpIdentificationExpiryDate'),
            txtCorpTin: document.getElementById('txt_corpTin'),
            txtCorpCountry: document.getElementById('txt_corpCountry'),

            ddlAddressType: document.getElementById('ddl_addressType'),
            txtAddress1: document.getElementById('txt_address1'),
            ddlAddressCountry: document.getElementById('ddl_addressCountry'),
            ddlAddressRegion: document.getElementById('ddl_addressRegion'),
            txtAddressCity: document.getElementById('txt_addressCity'),
            txtAddressSubCity: document.getElementById('txt_addressSubCity'),
            txtAddressWereda: document.getElementById('txt_addressWereda'),
            txtAddressKebele: document.getElementById('txt_addressKebele'),
            txtAddressHouseNo: document.getElementById('txt_addressHouseNo'),
            txtAddressMobile: document.getElementById('txt_addressMobile'),

            ddlEmpStatus: document.getElementById('ddl_empStatus'),
            ddlEmpCompanyType: document.getElementById('ddl_empCompanyType'),
            ddlEmpOccupation: document.getElementById('ddl_empOccupation'),
            txtEmpPosition: document.getElementById('txt_empPosition'),
            txtEmpMonthlyIncome: document.getElementById('txt_empMonthlyIncome'),
            txtEmpAnnualIncome: document.getElementById('txt_empAnnualIncome'),

            ddlPep: document.getElementById('ddl_pep'),
            ddlUsPerson: document.getElementById('ddl_usPerson'),
            ddlDataCleansed: document.getElementById('ddl_dataCleansed'),

            imgPhotoPreview: document.getElementById('img_photoPreview'),
            dvNoPhotoText: document.getElementById('dv_noPhotoText'),
            imgSignaturePreview: document.getElementById('img_signaturePreview'),
            dvNoSignatureText: document.getElementById('dv_noSignatureText'),
            tblPhotoSignatureBody: document.getElementById('tbl_photoSignatureBody'),

            viewBtn: document.getElementById('btn_view'),
            approveBtn: document.getElementById('btn_approve'),
            rejectBtn: document.getElementById('btn_reject'),
            closeBtn: document.getElementById('btn_close'),

            rejectModal: document.getElementById('mdl_supervisionReject'),
            rejectForm: document.getElementById('frm_supervisionReject'),
            rejectRemarks: document.getElementById('txa_supervisionRejectRemarks'),
            confirmRejectBtn: document.getElementById('btn_confirmSupervisionReject')
        };

        this.rejectModalInstance = this.elements.rejectModal ? new bootstrap.Modal(this.elements.rejectModal) : null;
        this.initialize();
    }

    initialize() {
        this.initializeEventListeners();
        this.initializeSectionToggles();
        this.initializeSearchModal();
        this.initializeLookups();
        this.loadBranches();
        if (this.elements.clientDetailsSection) {
            this.elements.clientDetailsSection.style.display = 'none';
        }
    }

    initializeEventListeners() {
        this.elements.branchFilterBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleBranchDropdown();
        });

        document.addEventListener('click', (e) => {
            if (!this.elements.branchFilterOptions?.contains(e.target) && !this.elements.branchFilterBtn?.contains(e.target)) {
                this.closeBranchDropdown();
            }
        });

        this.elements.selectAllBranches?.addEventListener('change', () => {
            this.elements.branchCheckboxList?.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
                checkbox.checked = this.elements.selectAllBranches.checked;
            });
            this.updateSelectedBranches();
        });

        this.elements.searchClientBtn?.addEventListener('click', () => this.openClientSearch());
        this.elements.clientIdSearch?.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                this.searchClient();
            }
        });

        this.elements.viewBtn?.addEventListener('click', () => this.handleView());
        this.elements.approveBtn?.addEventListener('click', () => this.handleApprove());
        this.elements.rejectBtn?.addEventListener('click', () => this.showRejectModal());
        this.elements.closeBtn?.addEventListener('click', () => this.postClose());
        this.elements.confirmRejectBtn?.addEventListener('click', () => this.handleReject());
    }

    initializeSectionToggles() {
        document.querySelectorAll('[data-section-toggle]').forEach((header) => {
            header.addEventListener('click', (event) => {
                if (event.target.tagName === 'INPUT' || event.target.tagName === 'BUTTON' || event.target.tagName === 'SELECT') {
                    return;
                }

                const section = header.closest('.form-section');
                const toggleBtn = header.querySelector('.section-toggle-btn');
                const content = section?.querySelector('[data-section-content], .section-content');
                if (!section || !content) return;

                const isCollapsed = section.classList.toggle('collapsed');
                content.style.display = isCollapsed ? 'none' : '';
                if (toggleBtn) {
                    toggleBtn.setAttribute('aria-expanded', String(!isCollapsed));
                    const icon = toggleBtn.querySelector('i');
                    if (icon) {
                        icon.className = isCollapsed ? 'bi bi-chevron-down' : 'bi bi-chevron-up';
                    }
                }
            });
        });
    }

    initializeSearchModal() {
        try {
            const appCore = getAppCore();
            if (!appCore || !window.SearchModal) return;
            this.searchModal = new window.SearchModal(appCore);
        } catch (error) {
            console.warn('[ClientSupervision] SearchModal init error:', error);
        }
    }

    async initializeLookups() {
        const hasServerOptions = (element) => !!element && (element.options?.length || 0) > 1;
        if (!hasServerOptions(this.elements.ddlClientType)) {
            console.warn('[ClientSupervision] Dropdown options were not preloaded from Index action');
        }
    }

    async loadBranches() {
        try {
            const response = await ClientSupervisionService.getBranchList({});
            const branches = this.extractDetails(response);

            this.elements.branchCheckboxList.innerHTML = '';
            const branchItems = Array.isArray(branches) ? branches : [];
            branchItems.forEach((branch, index) => {
                const branchId = branch.SubCodeID || branch.BranchID || branch.OurBranchID || branch.BranchCode || '';
                const branchName = branch.Description || branch.BranchName || branchId;
                const selected = index === 0;
                this.addBranchOption(branchId, branchName, selected);
            });

            if (!branchItems.length) {
                this.showMessage('No branches available for current session', 'warning');
            }

            this.updateSelectedBranches();
        } catch (error) {
            console.error('[ClientSupervision] Error loading branches:', error);
            this.showMessage('Error loading branches', 'warning');
        }
    }

    addBranchOption(branchId, branchName, selected) {
        if (!branchId) return;

        const label = document.createElement('label');
        label.className = 'multi-select-option';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = branchId;
        checkbox.dataset.branchName = branchName;
        checkbox.checked = !!selected;
        checkbox.addEventListener('change', () => this.updateSelectedBranches());

        const span = document.createElement('span');
        span.textContent = `${branchId} - ${branchName}`;

        label.appendChild(checkbox);
        label.appendChild(span);
        this.elements.branchCheckboxList.appendChild(label);
    }

    toggleBranchDropdown() {
        if (!this.elements.branchFilterOptions) return;

        const isOpen = this.elements.branchFilterOptions.style.display === 'block';
        if (isOpen) {
            this.closeBranchDropdown();
            return;
        }

        const buttonRect = this.elements.branchFilterBtn.getBoundingClientRect();
        this.elements.branchFilterOptions.style.top = `${buttonRect.bottom + 4}px`;
        this.elements.branchFilterOptions.style.left = `${buttonRect.left}px`;
        this.elements.branchFilterOptions.style.minWidth = `${buttonRect.width}px`;
        this.elements.branchFilterOptions.style.display = 'block';
        document.getElementById('dv_branchDropdown')?.classList.add('open');
    }

    closeBranchDropdown() {
        if (this.elements.branchFilterOptions) {
            this.elements.branchFilterOptions.style.display = 'none';
        }
        document.getElementById('dv_branchDropdown')?.classList.remove('open');
    }

    updateSelectedBranches() {
        const checked = this.elements.branchCheckboxList?.querySelectorAll('input[type="checkbox"]:checked') || [];
        const all = this.elements.branchCheckboxList?.querySelectorAll('input[type="checkbox"]') || [];

        this.selectedBranches = Array.from(checked).map((item) => ({
            id: item.value,
            name: item.dataset.branchName || item.value
        }));

        if (this.selectedBranches.length === 0) {
            this.elements.branchFilterText.textContent = '--Select Branches--';
        } else if (this.selectedBranches.length === 1) {
            this.elements.branchFilterText.textContent = `${this.selectedBranches[0].id} - ${this.selectedBranches[0].name}`;
        } else {
            this.elements.branchFilterText.textContent = `${this.selectedBranches.length} branches selected`;
        }

        if (this.elements.selectAllBranches) {
            this.elements.selectAllBranches.checked = all.length > 0 && checked.length === all.length;
        }

        this.loadSupervisionList();
    }

    async loadSupervisionList() {
        if (!this.selectedBranches.length) {
            this.supervisionList = [];
            this.renderSupervisionTable();
            return;
        }

        try {
            const branchList = this.selectedBranches.map((item) => item.id).join(',');
            const response = await ClientSupervisionService.getPendingSupervisions({
                MainModuleID: '',
                BranchList: branchList
            });

            const items = this.extractDetails(response);
            this.supervisionList = (Array.isArray(items) ? items : [])
                .filter((item) => item && (item.ClientID || item.clientid || item.Searchkey || item.SearchKey));

            this.renderSupervisionTable();
        } catch (error) {
            console.error('[ClientSupervision] Error loading supervisions:', error);
            this.supervisionList = [];
            this.renderSupervisionTable();
            this.showMessage('Error loading supervision list', 'danger');
        }
    }

    renderSupervisionTable() {
        const tbody = this.elements.supervisionTableBody;
        tbody.innerHTML = '';
        this.elements.recordCount.textContent = `${this.supervisionList.length} records`;

        if (!this.supervisionList.length) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted"><i class="bi bi-inbox"></i> No pending supervisions found</td></tr>';
            this.updateActionButtons();
            return;
        }

        this.supervisionList.forEach((item, index) => {
            const clientId = item.ClientID || item.clientid || item.Searchkey || '';
            const row = document.createElement('tr');
            row.style.cursor = 'pointer';
            row.innerHTML = `
                <td><input type="radio" class="form-check-input supervision-radio" name="rdo_supervision" data-index="${index}"></td>
                <td>${this.escapeHtml(clientId)}</td>
                <td>${this.escapeHtml(item.ClientTypeID || '')}</td>
                <td>${this.escapeHtml(item.AccountID || '')}</td>
                <td>${this.escapeHtml(item.Name || '')}</td>
                <td>${this.escapeHtml(item.status || item.Status || '')}</td>
                <td>${this.escapeHtml(item.OpeningDate || '')}</td>
                <td>${this.escapeHtml(item.OurBranchID || '')}</td>
                <td>${this.escapeHtml(item.Inputter || '')}</td>
            `;

            row.addEventListener('click', async (event) => {
                if (event.target.type !== 'radio') {
                    const radio = row.querySelector('.supervision-radio');
                    radio.checked = true;
                }
                this.currentClient = item;
                this.updateActionButtons();
                await this.loadClientDetails(clientId);
            });

            tbody.appendChild(row);
        });

        this.updateActionButtons();
    }

    async openClientSearch() {
        // Require at least one branch to be selected
        if (!this.selectedBranches || this.selectedBranches.length === 0) {
            this.showMessage('Please select at least one branch first', 'warning');
            return;
        }

        if (!this.searchModal) {
            this.searchClient();
            return;
        }

        // Build branch filter based on selected branches
        const branchIds = this.selectedBranches.map(b => `'${(b.id || '').replace(/'/g, "''")}'`).join(',');
        const advFilterString = `OurBranchID IN (${branchIds})`;

        const currentClientId = this.elements.clientIdSearch.value || '';
        this.searchModal.open({
            title: 'Find Client - Pending Supervision',
            tableID: 'ClientID',
            moduleID: this.moduleId,
            advFilterString: advFilterString,
            searchFields: [
                { name: 'ClientID', label: 'Client ID', column: 'ClientID', value: currentClientId },
                { name: 'Name', label: 'Client Name', column: 'Name' }
            ],
            autoSearch: true,
            onSelect: async (record) => {
                const clientId = record.ClientID || '';
                this.elements.clientIdSearch.value = clientId;
                await this.loadClientDetails(clientId);
            }
        });
    }

    async searchClient() {
        // Require at least one branch to be selected
        if (!this.selectedBranches || this.selectedBranches.length === 0) {
            this.showMessage('Please select at least one branch first', 'warning');
            return;
        }

        const query = (this.elements.clientIdSearch.value || '').trim().toLowerCase();
        if (!query) {
            return;
        }

        const matched = this.supervisionList.find((item) => String(item.ClientID || item.clientid || '').toLowerCase().includes(query));
        if (!matched) {
            this.showMessage('Client not found in pending supervisions', 'warning');
            return;
        }

        this.currentClient = matched;
        this.updateActionButtons();
        await this.loadClientDetails(matched.ClientID || matched.clientid || '');
    }

    async loadClientDetails(clientId) {
        if (!clientId) return;

        try {
            const requestData = {
                ClientID: clientId,
                RequestID: `supervision_${Date.now()}`
            };

            const basic = this.extractDetails(await ClientSupervisionService.getClientBasicDetails(requestData));
            const basicItem = Array.isArray(basic) ? basic[0] : basic;
            if (!basicItem) {
                this.showMessage('No client details found', 'warning');
                return;
            }

            this.clearDetailFields();

            this.bindPersonal(basicItem);
            this.bindCorporate(basicItem);

            const isCorporate = ['B', 'C'].includes(String(basicItem.ClientTypeID || '').toUpperCase());
            if (isCorporate) {
                const corp = this.extractDetails(await ClientSupervisionService.getClientCorporateDetails(requestData));
                this.bindCorporate(Array.isArray(corp) ? corp[0] : corp, basicItem);
                document.getElementById('btn_tabCorporate')?.click();
            } else {
                const individual = this.extractDetails(await ClientSupervisionService.getClientIndividualDetails(requestData));
                this.bindPersonal(Array.isArray(individual) ? individual[0] : individual, basicItem);
                document.getElementById('btn_tabPersonal')?.click();
            }

            const addresses = this.extractDetails(await ClientSupervisionService.getClientAddressDetails(requestData));
            this.bindAddress(Array.isArray(addresses) ? addresses[0] : addresses);

            const employment = this.extractDetails(await ClientSupervisionService.getClientEmploymentDetails(requestData));
            this.bindEmployment(Array.isArray(employment) ? employment[0] : employment);

            const other = this.extractDetails(await ClientSupervisionService.getClientOtherDetails(requestData));
            this.bindOther(Array.isArray(other) ? other[0] : other);

            const images = this.extractDetails(await ClientSupervisionService.getClientPhotoSignature(requestData));
            this.bindImages(Array.isArray(images) ? images : []);

            this.elements.clientDetailsSection.style.display = 'block';
            this.showMessage('Client details loaded successfully', 'success');
        } catch (error) {
            console.error('[ClientSupervision] Error loading client details:', error);
            this.showMessage('Error loading client details', 'danger');
        }
    }

    bindPersonal(data, basic) {
        const item = data || {};
        const root = basic || {};
        this.setElementValue(this.elements.txtClientId, item.ClientID || root.ClientID || '');
        this.setElementValue(this.elements.ddlClientType, item.ClientTypeID || root.ClientTypeID || '');
        this.setElementValue(this.elements.ddlTitle, item.TitleID || item.Title || '');
        this.setElementValue(this.elements.txtFirstName, item.FirstName || '');
        this.setElementValue(this.elements.txtMiddleName, item.MiddleName || '');
        this.setElementValue(this.elements.txtLastName, item.LastName || '');
        this.setElementValue(this.elements.txtDob, item.DateOfBirth || item.DOB || '');
        this.setElementValue(this.elements.ddlGender, item.GenderID || item.Gender || '');
        this.setElementValue(this.elements.ddlResident, item.ResidentID || item.Resident || '');
        this.setElementValue(this.elements.ddlNationality, item.NationalityID || item.Nationality || '');
        this.setElementValue(this.elements.ddlLiteracyLevel, item.LiteracyLevelID || item.LiteracyLevel || '');
        this.setElementValue(this.elements.txtIssuedBy, item.IssuedBy || '');
        this.setElementValue(this.elements.ddlIdentificationType, item.IdentificationTypeID || root.IdentificationTypeID || '');
        this.setElementValue(this.elements.txtIdentificationNo, item.IdentificationNo || root.IdentificationNo || '');
        this.setElementValue(this.elements.txtIdentificationIssueDate, item.IdentificationIssueDate || '');
        this.setElementValue(this.elements.txtIdentificationExpiryDate, item.IdentificationExpiryDate || '');
        this.setElementValue(this.elements.ddlMaritalStatus, item.MaritalStatusID || item.MaritalStatus || '');
        this.setElementValue(this.elements.txtMotherName, item.MotherName || item.MothersName || '');
    }

    bindCorporate(data, basic) {
        const item = data || {};
        const root = basic || {};
        this.setElementValue(this.elements.txtCorpClientId, item.ClientID || root.ClientID || '');
        this.setElementValue(this.elements.ddlCorpClientType, item.ClientTypeID || root.ClientTypeID || '');
        this.setElementValue(this.elements.txtCorpClientName, item.ClientName || root.Name || '');
        this.setElementValue(this.elements.txtCorpCompanyName, item.CompanyName || item.TradingName || '');
        this.setElementValue(this.elements.ddlCorpConstitution, item.ConstitutionID || item.Constitution || '');
        this.setElementValue(this.elements.ddlCorpLineOfBusiness, item.LineOfBusinessID || item.LineOfBusiness || '');
        this.setElementValue(this.elements.ddlCorpIdentificationType, item.IdentificationTypeID || root.IdentificationTypeID || '');
        this.setElementValue(this.elements.txtCorpIdentificationNo, item.IdentificationNo || root.IdentificationNo || '');
        this.setElementValue(this.elements.txtCorpRegDate, item.DateOfRegistration || item.RegistrationDate || '');
        this.setElementValue(this.elements.txtCorpIssuedBy, item.IssuedBy || '');
        this.setElementValue(this.elements.txtCorpIdentificationIssueDate, item.IdentificationIssueDate || '');
        this.setElementValue(this.elements.txtCorpIdentificationExpiryDate, item.IdentificationExpiryDate || '');
        this.setElementValue(this.elements.txtCorpTin, item.TINNumber || item.TIN || '');
        this.setElementValue(this.elements.txtCorpCountry, item.CountryOfIncorporationID || item.CountryOfIncorporation || '');
    }

    bindAddress(data) {
        const item = data || {};
        this.setElementValue(this.elements.ddlAddressType, item.AddressTypeID || item.AddressType || '');
        this.setElementValue(this.elements.txtAddress1, item.Address1 || item.Address || '');
        this.setElementValue(this.elements.ddlAddressCountry, item.CountryID || item.Country || '');
        this.setElementValue(this.elements.ddlAddressRegion, item.RegionID || item.Region || '');
        this.setElementValue(this.elements.txtAddressCity, item.City || '');
        this.setElementValue(this.elements.txtAddressSubCity, item.SubCityID || item.SubCity || item.Zone || '');
        this.setElementValue(this.elements.txtAddressWereda, item.WeredaID || item.Wereda || '');
        this.setElementValue(this.elements.txtAddressKebele, item.KebeleID || item.Kebele || '');
        this.setElementValue(this.elements.txtAddressHouseNo, item.HouseNumber || item.HouseNo || '');
        this.setElementValue(this.elements.txtAddressMobile, item.Mobile || item.MobileNo || '');
    }

    bindEmployment(data) {
        const item = data || {};
        this.setElementValue(this.elements.ddlEmpStatus, item.EmploymentStatusID || item.EmploymentStatus || '');
        this.setElementValue(this.elements.ddlEmpCompanyType, item.CompanyTypeID || item.CompanyType || '');
        this.setElementValue(this.elements.ddlEmpOccupation, item.OccupationID || item.Occupation || '');
        this.setElementValue(this.elements.txtEmpPosition, item.Position || item.PositionID || '');
        this.setElementValue(this.elements.txtEmpMonthlyIncome, item.MonthlyIncome || item.AverageMonthlyIncome || '');
        this.setElementValue(this.elements.txtEmpAnnualIncome, item.AnnualIncome || item.AverageAnnualIncome || '');
    }

    bindOther(data) {
        const item = data || {};
        this.setElementValue(this.elements.ddlPep, item.PoliticallyExposedPerson || item.IsPEP || '');
        this.setElementValue(this.elements.ddlUsPerson, item.USPerson || item.IsUSPerson || '');
        this.setElementValue(this.elements.ddlDataCleansed, item.DataCleansed || item.IsDataCleansed || '');
    }

    bindImages(items) {
        this.photoSignatures = Array.isArray(items) ? items : [];
        this.elements.tblPhotoSignatureBody.innerHTML = '';

        this.displayImagePreviews();

        if (!this.photoSignatures.length) {
            this.elements.tblPhotoSignatureBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3"><i class="bi bi-image"></i> No images found</td></tr>';
            return;
        }

        this.photoSignatures.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="ps-2">${index + 1}</td>
                <td>${this.escapeHtml(this.getImageTypeLabel(this.getImageType(item)))}</td>
                <td>${this.escapeHtml(item.Description || item.description || '')}</td>
                <td>${this.escapeHtml(item.CreatedDate || item.UploadedOn || item.uploadedOn || '')}</td>
                <td class="text-center">
                    <button type="button" class="btn btn-outline-primary btn-sm" data-view-index="${index}" aria-label="View image">
                        <i class="bi bi-eye"></i>
                    </button>
                </td>
            `;
            tr.querySelector('[data-view-index]')?.addEventListener('click', () => this.viewImage(index));
            this.elements.tblPhotoSignatureBody.appendChild(tr);
        });
    }

    async viewImage(index) {
        const item = this.photoSignatures[index];
        if (!item) return;

        const imageData = await this.resolveImageData(item);
        if (!imageData?.image) {
            this.showMessage('Image content not available', 'warning');
            return;
        }

        const imageUrl = this.buildDataUrl(imageData.image, imageData.mimeType || 'image/png');
        const win = window.open('', '_blank');
        if (!win) {
            this.showMessage('Popup blocked. Please allow popups to view image.', 'warning');
            return;
        }

        win.document.write(`<!DOCTYPE html><html><head><title>Image Preview</title><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f1f5f9;}img{max-width:100%;max-height:100vh;object-fit:contain;}</style></head><body><img src="${imageUrl}" alt="Image Preview" /></body></html>`);
        win.document.close();
    }

    clearDetailFields() {
        const fieldKeys = [
            'txtClientId', 'ddlClientType', 'ddlTitle', 'txtFirstName', 'txtMiddleName', 'txtLastName',
            'txtDob', 'ddlGender', 'ddlResident', 'ddlNationality', 'ddlLiteracyLevel', 'txtIssuedBy',
            'ddlIdentificationType', 'txtIdentificationNo', 'txtIdentificationIssueDate', 'txtIdentificationExpiryDate', 'ddlMaritalStatus', 'txtMotherName',
            'txtCorpClientId', 'ddlCorpClientType', 'txtCorpClientName', 'txtCorpCompanyName', 'ddlCorpConstitution', 'ddlCorpLineOfBusiness',
            'ddlCorpIdentificationType', 'txtCorpIdentificationNo', 'txtCorpRegDate', 'txtCorpIssuedBy', 'txtCorpIdentificationIssueDate', 'txtCorpIdentificationExpiryDate',
            'txtCorpTin', 'txtCorpCountry',
            'ddlAddressType', 'txtAddress1', 'ddlAddressCountry', 'ddlAddressRegion', 'txtAddressCity', 'txtAddressSubCity', 'txtAddressWereda', 'txtAddressKebele', 'txtAddressHouseNo', 'txtAddressMobile',
            'ddlEmpStatus', 'ddlEmpCompanyType', 'ddlEmpOccupation', 'txtEmpPosition', 'txtEmpMonthlyIncome', 'txtEmpAnnualIncome',
            'ddlPep', 'ddlUsPerson', 'ddlDataCleansed'
        ];

        fieldKeys.forEach((key) => this.setElementValue(this.elements[key], ''));
    }

    setElementValue(element, value) {
        if (!element) return;
        const normalizedValue = value == null ? '' : String(value);

        if (element.tagName === 'SELECT') {
            if (normalizedValue && !Array.from(element.options).some((option) => option.value === normalizedValue)) {
                const option = document.createElement('option');
                option.value = normalizedValue;
                option.textContent = normalizedValue;
                element.appendChild(option);
            }
            element.value = normalizedValue;
            return;
        }

        element.value = normalizedValue;
    }

    buildDataUrl(imageData, mimeType) {
        if (!imageData) return '';
        if (String(imageData).startsWith('data:')) return imageData;
        return `data:${mimeType || 'image/png'};base64,${imageData}`;
    }

    getImageType(item) {
        return String(item?.ImageTypeID || item?.imageTypeId || item?.imageTypeID || item?.imageType || item?.Type || '').toUpperCase();
    }

    getImageTypeLabel(type) {
        const normalized = String(type || '').toUpperCase();
        if (normalized === 'P' || normalized === 'PHOTO') return 'Photo';
        if (normalized === 'S' || normalized === 'SIGNATURE') return 'Signature';
        return type || '';
    }

    getTempImageId(item) {
        return item?.TempImageID || item?.tempImageId || item?.tempImageID || '';
    }

    async displayImagePreviews() {
        const photo = this.photoSignatures.find((item) => {
            const type = this.getImageType(item);
            return type === 'P' || type === 'PHOTO';
        });
        const signature = this.photoSignatures.find((item) => {
            const type = this.getImageType(item);
            return type === 'S' || type === 'SIGNATURE';
        });

        const photoData = await this.resolveImageData(photo);
        if (photoData?.image) {
            this.elements.imgPhotoPreview.src = this.buildDataUrl(photoData.image, photoData.mimeType);
            this.elements.imgPhotoPreview.classList.remove('sv-hidden');
            this.elements.dvNoPhotoText.classList.add('sv-hidden');
        } else {
            this.elements.imgPhotoPreview.classList.add('sv-hidden');
            this.elements.dvNoPhotoText.classList.remove('sv-hidden');
        }

        const signatureData = await this.resolveImageData(signature);
        if (signatureData?.image) {
            this.elements.imgSignaturePreview.src = this.buildDataUrl(signatureData.image, signatureData.mimeType);
            this.elements.imgSignaturePreview.classList.remove('sv-hidden');
            this.elements.dvNoSignatureText.classList.add('sv-hidden');
        } else {
            this.elements.imgSignaturePreview.classList.add('sv-hidden');
            this.elements.dvNoSignatureText.classList.remove('sv-hidden');
        }
    }

    async resolveImageData(item) {
        if (!item) return null;

        const inlineImage = item.Image || item.image || item.sImage || '';
        const inlineMimeType = item.MimeType || item.mimeType || 'image/png';
        if (inlineImage) {
            return { image: inlineImage, mimeType: inlineMimeType };
        }

        const tempImageId = this.getTempImageId(item);
        const tempImageService = window.TempImageService;
        if (!tempImageId || !tempImageService?.getTempImage) {
            return null;
        }

        try {
            const response = await tempImageService.getTempImage(tempImageId);
            if (!response?.success || !response?.data) return null;
            return {
                image: response.data.Image || response.data.image || response.data.sImage || '',
                mimeType: response.data.MimeType || response.data.mimeType || 'image/png'
            };
        } catch {
            return null;
        }
    }

    updateActionButtons() {
        const hasSelection = !!this.currentClient;
        this.elements.viewBtn.disabled = !hasSelection;
        this.elements.approveBtn.disabled = !hasSelection;
        this.elements.rejectBtn.disabled = !hasSelection;
    }

    async handleView() {
        if (!this.currentClient) return;
        const clientId = this.currentClient.ClientID || this.currentClient.clientid || this.currentClient.Searchkey || '';
        await this.loadClientDetails(clientId);
    }

    async handleApprove() {
        if (!this.currentClient) return;

        const clientId = this.currentClient.ClientID || this.currentClient.clientid || '';
        const result = await Swal.fire({
            title: 'Approve Supervision',
            html: `Are you sure you want to approve supervision for <strong>${this.escapeHtml(clientId)}</strong>?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: '<i class="bi bi-check-circle"></i> Yes, Approve',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#6c757d'
        });

        if (!result.isConfirmed) return;

        try {
            const response = await ClientSupervisionService.approveSupervision({
                ClientID: clientId,
                strSearchKey: this.currentClient.SearchKey || this.currentClient.Searchkey || clientId
            });

            if (this.isSuccess(response)) {
                this.showMessage(this.getMessage(response, 'Supervision approved successfully!'), 'success');
                this.currentClient = null;
                this.updateActionButtons();
                await this.loadSupervisionList();
            } else {
                this.showMessage(this.getMessage(response, 'Failed to approve supervision'), 'danger');
            }
        } catch (error) {
            console.error('[ClientSupervision] Approval error:', error);
            this.showMessage('Error approving supervision', 'danger');
        }
    }

    showRejectModal() {
        if (!this.currentClient) return;
        this.elements.rejectRemarks.value = '';
        this.elements.rejectForm.classList.remove('was-validated');
        this.rejectModalInstance?.show();
    }

    async handleReject() {
        if (!this.currentClient) return;
        if (!this.elements.rejectForm.checkValidity()) {
            this.elements.rejectForm.classList.add('was-validated');
            return;
        }

        const remarks = (this.elements.rejectRemarks.value || '').trim();
        if (remarks.length < 10) {
            this.showMessage('Rejection remarks must be at least 10 characters', 'warning');
            return;
        }

        const clientId = this.currentClient.ClientID || this.currentClient.clientid || '';
        try {
            const response = await ClientSupervisionService.rejectSupervision({
                ClientID: clientId,
                strSearchkey: this.currentClient.SearchKey || this.currentClient.Searchkey || clientId,
                RejectReson: remarks
            });

            this.rejectModalInstance?.hide();
            if (this.isSuccess(response)) {
                this.showMessage(this.getMessage(response, 'Supervision rejected successfully!'), 'success');
                this.currentClient = null;
                this.updateActionButtons();
                await this.loadSupervisionList();
            } else {
                this.showMessage(this.getMessage(response, 'Failed to reject supervision'), 'danger');
            }
        } catch (error) {
            console.error('[ClientSupervision] Rejection error:', error);
            this.showMessage('Error rejecting supervision', 'danger');
        }
    }

    postClose() {
        try {
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'accountMaintenanceChildClose', source: 'ClientSupervision' }, '*');
            }
            setTimeout(() => {
                try { window.close(); } catch { }
            }, 100);
        } catch (error) {
            console.error('[ClientSupervision] Close error:', error);
        }
    }

    showMessage(message, type = 'info') {
        const now = Date.now();
        const messageKey = `${type}:${message}`;
        if (this.lastMessageKey === messageKey && (now - this.lastMessageAt) < 1500) {
            return;
        }

        this.lastMessageKey = messageKey;
        this.lastMessageAt = now;
        this.elements.messageText.textContent = message;
        this.elements.messagePanel.className = `am-message-panel am-message-panel--${type}`;
        this.elements.messagePanel.style.display = 'block';
        setTimeout(() => { this.elements.messagePanel.style.display = 'none'; }, 4500);
    }

    populateSelect(selectElement, options) {
        if (!selectElement) return;
        selectElement.innerHTML = '';
        options.forEach((option) => {
            const element = document.createElement('option');
            element.value = option.value;
            element.textContent = option.label;
            selectElement.appendChild(element);
        });
    }

    extractDetails(response) {
        const payload = response?.Details || response?.data?.Details || response?.data || response || [];
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload?.Details)) return payload.Details;
        return payload ? [payload] : [];
    }

    isSuccess(response) {
        return response?.Success === true || response?.success === true;
    }

    getMessage(response, fallback) {
        return response?.Message || response?.message || fallback;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ClientSupervisionController();
});
