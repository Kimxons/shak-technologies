const routeMap = {
  login: "/login",
  dashboard: "/dashboard.html",
  productMaintenance: "modules/product-management/product-maintenance.html",
  clientMaintenance: "modules/customer-management/client-maintenance.html",
  accountMaintenance: "modules/account-maintenance/modern-account-maintenance.html",
  customerModuleDashboard: "modules/customer-management/dashboard.html",
  groupInsuranceType: "modules/group-insurance-type/group-insurance-type.html",
  groupInsuranceApplication: "modules/group-insurance-application/group-insurance-application.html",
  bankAccountMaintenance: "modules/bank-account-maintenance/bank-account-maintenance.html",
  bankStatementUploading: "modules/bank-statement-uploading/bank-statement-uploading.html",
  bankReconciliationAuto: "modules/bank-reconciliation-auto/bank-reconciliation-auto.html",
  bankReconciliationManual: "modules/bank-reconciliation-manual/bank-reconciliation-manual.html",
  loanMaintenance: "modules/loans/loan-maintenance/loan-maintenance.html",
  loanRescheduleInitiation: "modules/loans/loan-reschedule-initiation/loan-reschedule-initiation.html",
  rescheduleTrxPosting: "modules/loans/reschedule-trx-posting/reschedule-trx-posting.html",
  loanWriteOff: "modules/loans/loan-write-off/loan-write-off.html",
  loanWaiver: "modules/loans/loan-waiver/loan-waiver.html",
  loanPayoff: "modules/loans/loan-payoff/loan-payoff.html",
  loanDisbursementReversal: "modules/loans/loan-disbursement-reversal/loan-disbursement-reversal.html",
  loanRateChange: "modules/loans/loan-rate-change/loan-rate-change.html"
};

const START_MENU_REGISTRY = {
  customer: {
    title: "Identities",
    items: [
      { label: "Client Maintenance", icon: "fas fa-address-card", modalId: "clientModal" },
      { label: "Client Approval", icon: "fas fa-user-check", modalId: "clientApprovalModal" },
      { label: "Client Supervision", icon: "fas fa-shield-check", modalId: "clientSupervisionModal" },
      { label: "Customer Query", icon: "fas fa-magnifying-glass", modalId: "customerQueryModal" },
      { label: "Client Deduplication", icon: "fas fa-clone", modalId: "clientDeduplicationModal" },
      { label: "Client 360 View", icon: "fas fa-eye", modalId: "client360ViewModal" }
    ]
  },
  account: {
    title: "Account",
    items: [
      { label: "Account Maintenance", icon: "fas fa-wallet", modalId: "accountMaintenanceModal" },
      { label: "Edit Card Status", icon: "fas fa-id-card", modalId: "editCardStatusModal" },
      { label: "Merge Client Accounts", icon: "fas fa-code-merge", modalId: "mergeClientAccountsModal" },
      { type: "divider" },
      { label: "Direct Debit Maintenance", icon: "fas fa-money-check-dollar", modalId: "directDebitMaintenanceModal" },
      { type: "divider" },
      { label: "Standing Instruction Type", icon: "fas fa-list", modalId: "standingInstructionTypeModal" },
      { label: "Standing Instruction Transfer", icon: "fas fa-right-left", modalId: "standingInstructionTransferModal" },
      { label: "Standing Instruction Loan Repayment", icon: "fas fa-building-columns", modalId: "standingInstructionLoanRepaymentModal" },
      { label: "Standing Instruction Demand Draft", icon: "fas fa-file-invoice", modalId: "standingInstructionDemandDraftModal" },
      { label: "Standing Instruction EFT", icon: "fas fa-arrow-right-arrow-left", modalId: "standingInstructionEftModal" }
    ]
  },
  deposit: {
    title: "Deposit",
    items: [
      { label: "Deposit Maintenance", icon: "fas fa-money-bill-wave", modalId: "depositMaintenanceModal" }
    ]
  },
  "recurring-deposit": {
    title: "Recurring Deposit",
    items: [
      { label: "Recurring Deposits Application", icon: "fas fa-file-circle-plus", modalId: "recurringDepositsApplicationModal" },
      { label: "Recurring Deposits Approval", icon: "fas fa-user-check", modalId: "recurringDepositsApprovalModal" },
      { label: "Recurring Maintenance", icon: "fas fa-screwdriver-wrench", modalId: "recurringMaintenanceModal" }
    ]
  },
  "limits-collateral": {
    title: "Limits & Collateral",
    items: [
      { label: "Collateral Types", icon: "fas fa-layer-group", modalId: "collateralTypesModal" },
      { label: "Collateral Maintenance", icon: "fas fa-screwdriver-wrench", modalId: "collateralMaintenanceModal" },
      { label: "Client Limit Verification", icon: "fas fa-circle-check", modalId: "clientLimitVerificationModal" },
      { type: "divider" },
      { label: "Client Limit", icon: "fas fa-scale-balanced", modalId: "clientLimitModal" },
      { label: "Application Client Limit", icon: "fas fa-file-circle-plus", modalId: "applicationClientLimitModal" },
      { label: "Sanction Client Limit", icon: "fas fa-stamp", modalId: "sanctionClientLimitModal" }
    ]
  },
  "workflow-setting": {
    title: "Workflow Setting",
    items: [
      { label: "Workflow Type", icon: "fas fa-diagram-project", modalId: "workflowTypeModal" },
      { label: "Advance Document Rules", icon: "fas fa-file-signature", modalId: "advanceDocumentRulesModal" },
      { label: "Rule Settings", icon: "fas fa-sliders", modalId: "ruleSettingsModal" },
      { label: "Client Rule Setting", icon: "fas fa-user-gear", modalId: "clientRuleSettingModal" }
    ]
  },
  "workflow-loan": {
    title: "Workflow Loan",
    items: [
      { label: "Loan Application", icon: "fas fa-file-circle-plus", modalId: "loanApplicationModal" },
      { label: "Loan Application Syndicate", icon: "fas fa-building-columns", modalId: "loanApplicationSyndicateModal" },
      { label: "Loan Appraisal", icon: "fas fa-clipboard-check", modalId: "loanAppraisalModal" },
      { label: "Loan Approvals", icon: "fas fa-clipboard-check", modalId: "loanApprovalsModal" },
      { label: "Credit Score", icon: "fas fa-chart-line", modalId: "creditScoreModal" },
      { label: "Loan Sanction", icon: "fas fa-stamp", modalId: "loanSanctionModal" },
      { label: "Loan Disbursement", icon: "fas fa-hand-holding-dollar", modalId: "loanDisbursementModal" },
      { label: "Application Status - Individual", icon: "fas fa-user", modalId: "applicationStatusIndividualModal" },
      { label: "Loan Application Rejection", icon: "fas fa-file-circle-xmark", modalId: "loanRejectionModal" },
      { type: "divider" },
      { label: "Group Loan Application Projection", icon: "fas fa-users", modalId: "groupLoanProjectionModal" },
      { label: "Group Loan Appraisal", icon: "fas fa-clipboard-check", modalId: "groupLoanAppraisalModal" },
      { label: "Center Loan Approval", icon: "fas fa-check-circle", modalId: "centerLoanApprovalModal" },
      { label: "Group Loan Sanction", icon: "fas fa-stamp", modalId: "groupLoanSanctionModal" },
      { label: "Group Loan Disbursement", icon: "fas fa-hand-holding-dollar", modalId: "groupLoanDisbursementModal" },
      { label: "Group Loan Pending Application", icon: "fas fa-clipboard-list", modalId: "groupLoanPendingApplicationModal" },
      { label: "Group Loan Application Rejection", icon: "fas fa-x-circle", modalId: "groupLoanRejectionModal" },
      { type: "divider" },
      { label: "Refinance - Initiation", icon: "fas fa-rotate", modalId: "refinanceInitiationModal" }
    ]
  },
  accounts: {
    title: "Accounts Suite",
    items: [
      { label: "Accounts Maintenance", icon: "fas fa-clipboard-list", modalId: "accountMaintenanceModal" },
      { label: "Product Factory", icon: "fas fa-piggy-bank", modalId: "accountsModal" },
      { label: "Templates Library", icon: "fas fa-table-list", modalId: "accountsModal" }
    ]
  },
  loans: {
    title: "Loans",
    items: [
      { label: "Loan Waiver", icon: "fas fa-hand-holding-dollar", modalId: "loanWaiverModal" },
      { label: "Loan Maintenance", icon: "fas fa-screwdriver-wrench", modalId: "loansModal" },
      { label: "Loan / Disbursement - Reversal", icon: "fas fa-rotate-left", modalId: "loanDisbursementReversalModal" },
      { label: "Loan Rate Change", icon: "fas fa-percent", modalId: "loanRateChangeModal" },
      { label: "Loan Pay-off", icon: "fas fa-money-bill-wave", modalId: "loanPayoffModal" },
      { label: "Loan Reschedule - Initiation", icon: "fas fa-calendar-plus", modalId: "loanRescheduleInitiationModal" },
      { label: "Reschedule - Trx Posting", icon: "fas fa-arrow-right-arrow-left", modalId: "rescheduleTrxPostingModal" },
      { label: "Loan Write Off", icon: "fas fa-file-circle-xmark", modalId: "loanWriteOffModal" }
    ]
  },
  overdrafts: {
    title: "Overdrafts",
    items: [
      { label: "Overdraft Application", icon: "fas fa-file-alt", modalId: "overdraftApplicationModal" },
      { label: "Overdraft Sanction", icon: "fas fa-user-check", modalId: "overdraftSanctionModal" },
      { label: "Overdraft Disbursement", icon: "fas fa-money-bill-wave", modalId: "overdraftDisbursementModal" },
      { label: "Overdraft Maintenance", icon: "fas fa-tools", modalId: "overdraftMaintenanceModal" }
    ]
  },
  images: {
    title: "Images",
    items: [
      { label: "Capturing Photo and Signature", icon: "fas fa-camera", modalId: "capturePhotoSignatureModal" },
      { label: "Supervise Photo and Signature", icon: "fas fa-user-check", modalId: "supervisePhotoSignatureModal" },
      { label: "Close Photo and Signature", icon: "fas fa-circle-xmark", modalId: "closePhotoSignatureModal" },
      { label: "Delete Supervise Photo and Signature", icon: "fas fa-trash", modalId: "deleteSupervisePhotoSignatureModal" }
    ]
  },
  transaction: {
    title: "Transaction",
    items: [
      { label: "Cash Transactions", icon: "fas fa-money-bill-wave", modalId: "cashTransactionsModal" },
      { label: "Cash In Transit", icon: "fas fa-truck-moving", modalId: "cashInTransitModal" },
      { type: "divider" },
      { label: "Transfer Transactions", icon: "fas fa-right-left", modalId: "transferTransactionsModal" },
      { label: "Money Transfer", icon: "fas fa-money-bill-transfer", modalId: "moneyTransferModal" },
      { label: "Forex - Bureau De Change", icon: "fas fa-globe", modalId: "forexBureauDeChangeModal" },
      { label: "Cash Payment Order (CPO)", icon: "fas fa-file-invoice-dollar", modalId: "cashPaymentOrderModal" },
      { label: "Cash Payment Order (CPO) Realization / Cancellation", icon: "fas fa-file-circle-check", modalId: "cashPaymentOrderRealizationCancellationModal" },
      { label: "Group Collection", icon: "fas fa-users", modalId: "groupCollectionModal" },
      { label: "Group Collection Allocation", icon: "fas fa-layer-group", modalId: "groupCollectionAllocationModal" },
      { label: "JV Maintenance", icon: "fas fa-book", modalId: "jvMaintenanceModal" },
      { label: "Charge Collection", icon: "fas fa-percent", modalId: "chargeCollectionModal" },
      { label: "JV Maintenance-Interbranch", icon: "fas fa-code-branch", modalId: "jvMaintenanceInterbranchModal" },
      { type: "divider" },
      { label: "Transaction Supervision", icon: "fas fa-clipboard-check", modalId: "transactionSupervisionModal" },
      { label: "Teller Declarations", icon: "fas fa-cash-register", modalId: "tellerDeclarationsModal" },
      { label: "Prompted Supervision", icon: "fas fa-check-circle", modalId: "supervisionTransactionsModal" },
      { label: "Group Collection Reversal", icon: "fas fa-rotate-left", modalId: "groupCollectionReversalModal" },
      { label: "Charge Exemption", icon: "fas fa-ban", modalId: "chargeExemptionModal" },
      { label: "On Demand (Adhoc) Charges", icon: "fas fa-bolt", modalId: "onDemandAdhocChargesModal" },
      { label: "Cash Maintenance", icon: "fas fa-cash-coin", modalId: "cashMaintenanceModal" }
    ]
  },
  microfinance: {
    title: "MicroFinance",
    items: [
      { label: "Center Loan Scheme", icon: "fas fa-list", modalId: "centerLoanSchemeModal" },
      { label: "Center Maintenance", icon: "fas fa-screwdriver-wrench", modalId: "centerMaintenanceModal" },
      { label: "Center Member Maintenance", icon: "fas fa-users", modalId: "centerMemberMaintenanceModal" },
      { label: "Center Attendance", icon: "fas fa-user-check", modalId: "centerAttendanceModal" },
      { type: "divider" },
      { label: "Change Center/Group", icon: "fas fa-right-left", modalId: "changeCenterGroupModal" },
      { type: "divider" },
      { label: "Change Installment Date", icon: "fas fa-calendar-days", modalId: "changeInstallmentDateModal" },
      { type: "divider" },
      { label: "Exit Types", icon: "fas fa-door-open", modalId: "exitTypesModal" },
      { label: "Exit Process", icon: "fas fa-diagram-project", modalId: "exitProcessModal" },
      { label: "Savings Refund", icon: "fas fa-money-bill-wave", modalId: "savingsRefundModal" },
      { label: "Forfeit Recovery", icon: "fas fa-hand-holding-dollar", modalId: "forfeitRecoveryModal" },
      { label: "Center Loan / Disbursement - Reversal", icon: "fas fa-rotate-left", modalId: "centerLoanDisbursementReversalModal" },
      { label: "Center Penalty Interest Waive Off", icon: "fas fa-ban", modalId: "centerPenaltyInterestWaiveOffModal" }
    ]
  },
  process: {
    title: "Process",
    items: [
      { label: "Process Manager", icon: "fas fa-diagram-project", modalId: "processManagerModal" },
      { label: "Process Manager - Batch", icon: "fas fa-layer-group", modalId: "processManagerBatchModal" },
      { label: "Loan Balancing", icon: "fas fa-scale-balanced", modalId: "loanBalancingModal" },
      { label: "Bank Process Setting", icon: "fas fa-sliders", modalId: "bankProcessSettingModal" },
      { label: "System Exception Overriding", icon: "fas fa-triangle-exclamation", modalId: "systemExceptionOverridingModal" },
      { label: "Other Processes", icon: "fas fa-ellipsis", modalId: "otherProcessesModal" }
    ]
  },
  treasury: {
    title: "Treasury",
    items: [
      { label: "Money Market - Front Office", icon: "fas fa-coins", modalId: "moneyMarketFrontOfficeModal" },
      { label: "Money Market Approval", icon: "fas fa-user-check", modalId: "moneyMarketApprovalModal" },
      { label: "Money Market - Back Office", icon: "fas fa-building-columns", modalId: "moneyMarketBackOfficeModal" },
      { type: "divider" },
      { label: "Forex Deal - Front Office", icon: "fas fa-globe", modalId: "forexDealFrontOfficeModal" },
      { label: "Forex Deal - Back Office", icon: "fas fa-building-columns", modalId: "forexDealBackOfficeModal" },
      { label: "Security Maintenance", icon: "fas fa-screwdriver-wrench", modalId: "securityMaintenanceModal" },
      { label: "Security Booking", icon: "fas fa-book", modalId: "securityBookingModal" },
      { type: "divider" }
    ]
  },
  "trade-finance": {
    title: "Trade Finance",
    items: [
      { label: "LC/PO Account Application", icon: "fas fa-file-circle-plus", modalId: "lcpoAccountApplicationModal" },
      { label: "Purchase Order Application (PO)", icon: "fas fa-file-circle-plus", modalId: "purchaseOrderApplicationModal" },
      { label: "LC/PO Amendment/Extension Application", icon: "fas fa-file-pen", modalId: "lcpoAmendmentExtensionApplicationModal" },
      { label: "Export Letter of Credit", icon: "fas fa-file-export", modalId: "exportLcFacilityApplicationModal" },
      { label: "Forex Permit Request", icon: "fas fa-file-circle-plus", modalId: "forexPermitRequestModal" },
      { label: "Advance Payment Maintenance", icon: "fas fa-screwdriver-wrench", modalId: "advancePaymentMaintenanceModal" },
      { label: "Sales Contract Registration", icon: "fas fa-file-signature", modalId: "salesContractRegistrationModal" },
      { label: "LC Facility Application", icon: "fas fa-file-signature", modalId: "lcFacilityApplicationModal" },
      { label: "LC/PO Approval", icon: "fas fa-user-check", modalId: "lcpoApprovalModal" },
      { label: "LC/PO Maintenance/Settlement/Cancellation", icon: "fas fa-file-invoice-dollar", modalId: "lcpoMaintenanceSettlementCancellationModal" },
      { type: "divider" },
      { label: "Bill Account Application", icon: "fas fa-file-circle-plus", modalId: "billAccountApplicationModal" },
      { label: "Bill Inward/Outward Documentary Application", icon: "fas fa-file-lines", modalId: "billInOutDocumentaryApplicationModal" },
      { label: "Bill Contract Maintenance/Liquidation/Cancellation", icon: "fas fa-file-invoice", modalId: "billContractMaintenanceModal" },
      { label: "Bill Contract Messages", icon: "fas fa-envelope", route: "modules/BillDiscounting/form/bill-contract-messages.html" },
      { type: "divider" },
      { label: "LG Account Application", icon: "fas fa-file-circle-plus", modalId: "lgApplicationModal" },
      { label: "LG Facility Application", icon: "fas fa-file-signature", modalId: "lgFacilityApplicationModal" },
      { label: "LG Facility Approval", icon: "fas fa-user-check", modalId: "lgFacilityApprovalModal" },
      { label: "LG Maintenance", icon: "fas fa-screwdriver-wrench", modalId: "lgMaintenanceModal" }
    ]
  },
  "fixed-asset": {
    title: "FixedAsset",
    items: [
      { label: "Fixed Asset Settings", icon: "fas fa-sliders", modalId: "fixedAssetSettingsModal" },
      { label: "Fixed Asset Depreciation Rates", icon: "fas fa-percent", modalId: "fixedAssetDepreciationRatesModal" },
      { label: "Fixed Asset Type", icon: "fas fa-tags", modalId: "fixedAssetTypeModal" },
      { label: "Fixed Asset Sub Type", icon: "fas fa-tag", modalId: "fixedAssetSubTypeModal" },
      { label: "Fixed Asset Maintenance", icon: "fas fa-screwdriver-wrench", modalId: "fixedAssetMaintenanceModal" },
      { label: "Fixed Asset Disposal", icon: "fas fa-trash", modalId: "fixedAssetDisposalModal" },
      { label: "Asset Movement", icon: "fas fa-right-left", modalId: "assetMovementModal" },
      { label: "Asset Reevaluation", icon: "fas fa-arrow-trend-up", modalId: "assetReevaluationModal" }
    ]
  },
  "other-modules": {
    title: "Other Modules",
    items: [
      { label: "Fund Source Maintenance", icon: "fas fa-money-bill-wave", modalId: "fundSourceMaintenanceModal" },
      { label: "Group Insurance Type", icon: "fas fa-tags", modalId: "groupInsuranceTypeModal" },
      { label: "Group Insurance Application", icon: "fas fa-file-circle-plus", route: routeMap.groupInsuranceApplication },
      { label: "Group Insurance Application Process", icon: "fas fa-diagram-project", modalId: "groupInsuranceApplicationProcessModal" },
      { label: "Bank Account Maintenance", icon: "fas fa-bank", modalId: "bankAccountMaintenanceModal" },
      { label: "Bank Statement Uploading", icon: "fas fa-cloud-arrow-up", modalId: "bankStatementUploadingModal" },
      { label: "Bank Reconciliation - Auto", icon: "fas fa-robot", modalId: "bankReconciliationAutoModal" },
      { label: "Bank Reconciliation - Manual", icon: "fas fa-user-check", modalId: "bankReconciliationManualModal" },
      { label: "Purge Reconciliation Data", icon: "fas fa-trash", modalId: "purgeReconciliationDataModal" },
      { label: "BR Gateway Formats", icon: "fas fa-file-lines", modalId: "brGatewayFormatsModal" },
      { label: "BR Gateway Incoming Files", icon: "fas fa-inbox", modalId: "brGatewayIncomingFilesModal" },
      { label: "Maintain Locker", icon: "fas fa-lock", modalId: "maintainLockerModal" },
      { label: "Notification Settings", icon: "fas fa-bell", modalId: "notificationFormatsModal" },
      { label: "Report Mapping", icon: "fas fa-map", modalId: "reportMappingModal" },
      { label: "SPM Risk Acceptance Level", icon: "fas fa-clipboard-check", modalId: "spmRiskAcceptanceLevelModal" },
      { label: "SPM Questions", icon: "fas fa-circle-question", modalId: "spmQuestionsModal" },
      { label: "SPM Questionnaires", icon: "fas fa-rectangle-list", modalId: "spmQuestionnairesModal" }
    ]
  },
  "general-ledger": {
    title: "General Ledger",
    items: [
      { label: "GL Sub Type Group", icon: "fas fa-layer-group", modalId: "glSubTypeGroupModal" },
      { label: "GL Maintenance", icon: "fas fa-screwdriver-wrench", modalId: "glMaintenanceModal" },
      { label: "GL Branch Details", icon: "fas fa-code-branch", modalId: "glBranchDetailsModal" },
      { label: "GL Parameters", icon: "fas fa-sliders", modalId: "glParametersModal" },
      { label: "GL Financial Format", icon: "fas fa-file-lines", modalId: "glFinancialFormatModal" },
      { label: "GL Budget", icon: "fas fa-chart-pie", modalId: "glBudgetModal" },
      { label: "InterBranch GL Parameters", icon: "fas fa-arrows-spin", modalId: "interBranchGLParametersModal" },
      { label: "Nostro Account Maintenance", icon: "fas fa-account-book", modalId: "nostroAccountMaintenanceModal" },
      { label: "Cost Center", icon: "fas fa-sitemap", modalId: "costCenterModal" },
      { label: "GL AccountType Prefix Codes", icon: "fas fa-barcode", modalId: "glAccountTypePrefixCodesModal" },
      { label: "GL Category Prefix Codes", icon: "fas fa-hashtag", modalId: "glCategoryPrefixCodesModal" }
    ]
  },
  product: {
    title: "Product",
    items: [
      {
        label: "Product (SB,CA,CS,SH)",
        icon: "fas fa-coins",
        modalId: "productModal",
        submenu: [
          { label: "Product GL Interface", icon: "fas fa-link", modalId: "productGLInterfaceModal" }
        ]
      },
      { label: "Product Bill Contract", icon: "fas fa-file-contract", modalId: "productBillContractModal" },
      { label: "Product Maintenance - Loan", icon: "fas fa-screwdriver-wrench", modalId: "productMaintenanceLoanModal" },
      { label: "Product (FD,RD,SC)", icon: "fas fa-piggy-bank", modalId: "productFDRDSCModal" },
      { label: "Product (LG,LC)", icon: "fas fa-file-lines", modalId: "productLgLcModal" },
      { label: "Products Maintenance - Treasury", icon: "fas fa-building-columns", modalId: "productMaintenanceTreasuryModal" },
      { label: "Product Branch Details", icon: "fas fa-code-branch", modalId: "productBranchDetailsModal" },
      { label: "Accounting Rule", icon: "fas fa-scale-balanced", modalId: "accountingRuleModal" }
    ]
  },
  "charges-rates": {
    title: "Charges & Rates",
    items: [
      { label: "Base Rates", icon: "fas fa-percent", modalId: "baseRatesModal" },
      { label: "Tax Maintenance", icon: "fas fa-receipt", modalId: "taxMaintenanceModal" },
      { label: "Cess On Tax", icon: "fas fa-tax", modalId: "cessOnTaxModal" },
      { label: "Interest Rate Menu", icon: "fas fa-list", modalId: "interestRateMenuModal" },
      { label: "Interest Calculation Rule", icon: "fas fa-calculator", modalId: "interestCalculationRuleModal" },
      { label: "Loan Interest Calculation Rule", icon: "fas fa-scale-balanced", modalId: "loanInterestCalculationRuleModal" },
      { label: "Loan Penalty Calculation Rule", icon: "fas fa-gavel", modalId: "loanPenaltyCalculationRuleModal" },
      { label: "Charge Maintenance", icon: "fas fa-screwdriver-wrench", modalId: "chargeMaintenanceModal" },
      { label: "Currency Maintenance", icon: "fas fa-money-bill", modalId: "currencyMaintenanceModal" },
      { label: "Exchange Rates - Updation", icon: "fas fa-arrow-right-arrow-left", modalId: "exchangeRatesUpdationModal" },
      { label: "Currency Branch Details", icon: "fas fa-code-branch", modalId: "currencyBranchDetailsModal" },
      { label: "Till Maintenance", icon: "fas fa-cash-register", modalId: "tillMaintenanceModal" },
      { label: "Teller Maintenance", icon: "fas fa-user-tie", modalId: "newTellerMaintenanceModal" }
    ]
  },
  "static-data": {
    title: "Static Data",
    items: [
      { label: "Officers Maintenance", icon: "fas fa-user-tie", modalId: "officersMaintenanceModal" },
      { label: "Region Maintenance", icon: "fas fa-map-location-dot", modalId: "regionMaintenanceModal" },
      { label: "Change Officer Portfolio", icon: "fas fa-person-hiking", modalId: "changeOfficerPortfolioModal" },
      { label: "Branch Settings", icon: "fas fa-sliders", modalId: "branchSettingsModal" },
      { label: "Bank User Code", icon: "fas fa-key", modalId: "bankUserCodeModal" },
      { label: "Branch User Code", icon: "fas fa-code", modalId: "branchUserCodeModal" },
      { label: "Maintain Banks", icon: "fas fa-bank", modalId: "maintainBanksModal" },
      { label: "Insurance companies", icon: "fas fa-shield", modalId: "insuranceCompanyModal" },
      { label: "Loan Classification", icon: "fas fa-layer-group", modalId: "loanClassificationModal" },
      { label: "Loan Analysis", icon: "fas fa-chart-bar", modalId: "loanAnalysisModal" },
      { label: "Maintain Guarantors", icon: "fas fa-user-shield", modalId: "maintainGuarantorsModal" },
      { label: "NGO Maintenance", icon: "fas fa-handshake", modalId: "ngoMaintenanceModal" },
      { label: "Maintain Vendors", icon: "fas fa-handshake-angle", modalId: "maintainVendorsModal" },
      { label: "Client Type WorkFlow", icon: "fas fa-diagram-project", modalId: "clientTypeWorkflowModal" },
      { label: "Transaction Description", icon: "fas fa-file-lines", modalId: "transactionDescriptionModal" },
      { label: "Maintain Identity Types", icon: "fas fa-id-card", modalId: "maintainIdentityTypesModal" },
      { label: "Location", icon: "fas fa-location-dot", modalId: "locationModal" },
      { label: "Contact Person", icon: "fas fa-address-book", modalId: "contactPersonModal" },
      { label: "Channels Transaction Settings", icon: "fas fa-sliders", modalId: "channelsTransactionSettingsModal" },
      { label: "Custodian", icon: "fas fa-person-hiking", modalId: "custodianModal" },
      { label: "Bin Maintenance", icon: "fas fa-dumpster", modalId: "binMaintenanceModal" },
      { label: "Insurance Code", icon: "fas fa-barcode", modalId: "insuranceCodeModal" },
      { label: "Device Maintenance", icon: "fas fa-screwdriver-wrench", modalId: "deviceMaintenanceModal" },
      { label: "Insurance Policy", icon: "fas fa-file-contract", modalId: "insurancePolicyModal" },
      { label: "Third Party Service Providers", icon: "fas fa-building", modalId: "thirdPartyServiceProvidersModal" }
    ]
  },
  "system-security": {
    title: "System Security",
    items: [
      { label: "Role Maintenance", icon: "fas fa-user-shield", modalId: "roleMaintenanceModal" },
      { label: "User Maintenance", icon: "fas fa-user-gear", modalId: "userMaintenanceModal" },
      { label: "Unlock Users", icon: "fas fa-lock-open", modalId: "unlockUsersModal" }
    ]
  },
  utilities: {
    title: "Utilities",
    items: [
      { label: "Unlock System Record Locks", icon: "fas fa-unlock", modalId: "unlockSystemRecordLocksModal" },
      { label: "Data Entry Supervision", icon: "fas fa-user-check", modalId: "dataEntrySupervisionModal" },
      { label: "Unsupervised Data View", icon: "fas fa-eye", modalId: "unsupervisedDataViewModal" },
      { label: "Theme Configuration", icon: "fas fa-palette", modalId: "themeConfigurationModal" },
      { label: "Loan Calculator", icon: "fas fa-calculator", modalId: "loanCalculatorModal" },
      { label: "Deposit Calculator", icon: "fas fa-piggy-bank", modalId: "depositCalculatorModal" },
      { label: "Cross Calculator", icon: "fas fa-exchange-alt", modalId: "crossCalculatorModal" },
      { label: "New Branch Creation", icon: "fas fa-code-branch", modalId: "newBranchCreationModal" },
      { label: "Treasury Calculator", icon: "fas fa-calculator", modalId: "treasuryCalculatorModal" },
      { label: "User Report Grouping", icon: "fas fa-layer-group", modalId: "userReportGroupingModal" },
      { label: "Voucher Printing Format", icon: "fas fa-print", modalId: "voucherPrintingFormatModal" },
      { label: "Foreign-Local GL Mapping", icon: "fas fa-map", modalId: "foreignLocalGLMappingModal" },
      { label: "Registration", icon: "fas fa-file-signature", modalId: "registrationModal" },
      { label: "Premature Clear Effect", icon: "fas fa-circle-xmark", modalId: "prematureClearEffectModal" }
    ]
  },
  "system-audit": {
    title: "System Audit",
    items: [
      { label: "System Auditing: GL Vs SubLedger( Interest Recv)", icon: "fas fa-file-lines", modalId: "glVsSubledgerInterestRecvModal" },
      { label: "System Auditing: GL Vs SubLedger( Withold Prepayments)", icon: "fas fa-file-lines", modalId: "glVsSubledgerWithholdPrepaymentsModal" },
      { label: "System Auditing: GL Vs SubLedger( Unearned Interest)", icon: "fas fa-file-lines", modalId: "glVsSubledgerUnearnedsInterestModal" },
      { label: "System Auditing: GL Vs SubLedger (Interest Payable)", icon: "fas fa-file-lines", modalId: "glVsSubledgerInterestPayableModal" },
      { label: "System Auditing: Customer Balance", icon: "fas fa-scale-balanced", modalId: "customerBalanceModal" },
      { label: "System Auditing: General Ledger Balance", icon: "fas fa-scale-balanced", modalId: "generalLedgerBalanceModal" },
      { label: "System Auditing: Trial Balance", icon: "fas fa-scale-balanced", modalId: "trialBalanceModal" },
      { label: "System Auditing: Unclear Balance", icon: "fas fa-question-circle", modalId: "unclearBalanceModal" },
      { label: "System Auditing: Unposted Transfer Transactions", icon: "fas fa-exchange-alt", modalId: "unpostedTransferTransactionsModal" },
      { label: "System Auditing: Fixed Deposit", icon: "fas fa-piggy-bank", modalId: "fixedDepositModal" },
      { label: "System Auditing: Reconcilable Items", icon: "fas fa-check-double", modalId: "reconcilableItemsModal" },
      { label: "System Auditing: Clearing Transactions", icon: "fas fa-check", modalId: "clearingTransactionsModal" },
      { label: "System Auditing: Interest Suspended", icon: "fas fa-pause", modalId: "interestSuspendedModal" },
      { label: "System Auditing: Currency Position Trx", icon: "fas fa-money-bill", modalId: "currencyPositionTrxModal" },
      { label: "System Auditing: GL Vs Sub Ledger", icon: "fas fa-file-lines", modalId: "glVsSubLedgerModal" }
    ]
  },
  clearing: {
    title: "Clearing",
    items: [
      { label: "Incoming Transactions - Branch Verification", icon: "fas fa-check-circle", modalId: "incomingTransactionsBVModal" },
      { label: "Incoming Transactions - Authorization", icon: "fas fa-user-check", modalId: "incomingTransactionsAuthModal" },
      { label: "Outgoing Cheques", icon: "fas fa-file-invoice", modalId: "outgoingChequesModal" },
      { label: "Outgoing Credit Transfer", icon: "fas fa-arrow-right", modalId: "outgoingCreditTransferModal" }
    ]
  },
  "swift-rtgs": {
    title: "SWIFT & RTGS",
    items: [
      { label: "Swift Outgoing", icon: "fas fa-arrow-up", modalId: "swiftOutgoingModal" },
      { label: "Swift Incoming", icon: "fas fa-arrow-down", modalId: "swiftIncomingModal" },
      { label: "Swift Outgoing Approval", icon: "fas fa-user-check", modalId: "swiftOutgoingApprovalModal" },
      { label: "RTGS Outgoing", icon: "fas fa-paper-plane", modalId: "rtgsOutgoingModal" },
      { label: "RTGS Outgoing Approval", icon: "fas fa-user-check", modalId: "rtgsOutgoingApprovalModal" },
      { label: "Swift Incoming Manual", icon: "fas fa-keyboard", modalId: "swiftIncomingManualModal" }
    ]
  },
  "system-utilities": {
    title: "System Utilities",
    items: [
      { label: "Change Password", icon: "fas fa-key", modalId: "changePasswordModal" },
      { label: "Dash Board Items", icon: "fas fa-chart-line", modalId: "dashboardItemsModal" },
      { label: "System Audit Trail", icon: "fas fa-history", modalId: "systemAuditTrailModal" },
      { label: "Language Setup", icon: "fas fa-language", modalId: "languageSetupModal" },
      { label: "Application Cache Details", icon: "fas fa-database", modalId: "applicationCacheDetailsModal" },
      { label: "Data Cache Details", icon: "fas fa-database", modalId: "dataCacheDetailsModal" },
      { label: "Identity Settings", icon: "fas fa-id-card", modalId: "identitySettingsModal" },
      { label: "System Code Details", icon: "fas fa-barcode", modalId: "systemCodesModal" },
      { label: "User Codes", icon: "fas fa-code", modalId: "userCodesModal" },
      { label: "Maintain Documents", icon: "fas fa-file-lines", modalId: "maintainDocumentsModal" },
      { label: "Duplicate Search Setting", icon: "fas fa-search-minus", modalId: "duplicateSearchSettingModal" },
      { label: "Special Condition Class", icon: "fas fa-layer-group", modalId: "specialConditionClassModal" },
      { label: "Maintain Institutions", icon: "fas fa-bank", modalId: "maintainInstitutionsModal" },
      { label: "User Definable Fields", icon: "fas fa-field-plus", modalId: "userDefinableFieldsModal" },
      { label: "User Definable Module", icon: "fas fa-cube", modalId: "userDefinableModuleModal" },
      { label: "Branch Holidays", icon: "fas fa-calendar-days", modalId: "branchHolidaysModal" },
      { label: "Country Holidays", icon: "fas fa-calendar-alt", modalId: "countryHolidaysModal" },
      { label: "Auto Gen. ID Definition", icon: "fas fa-hashtag", modalId: "idDefinitionModal" }
    ]
  },
  "system-brnet": {
    title: "System BR.NET",
    items: [
      { label: "About BR Net", icon: "fas fa-info-circle" },
      { label: "Switch Branch", icon: "fas fa-code-branch" },
      { label: "Log Off", icon: "fas fa-sign-out-alt" },
      { label: "Close Bankers Realm.Net", icon: "fas fa-times-circle" }
    ]
  },
  workflow: {
    title: "Workflow Desk",
    items: [
      { label: "Work Manager", icon: "fas fa-route", modalId: "workflowModal" },
      { label: "Maker Checker", icon: "fas fa-user-check", modalId: "workflowModal" }
    ]
  },
  security: {
    title: "System Security",
    items: [
      { label: "User Access", icon: "fas fa-user-shield", modalId: "securityModal" },
      { label: "System BR.NET", icon: "fas fa-gear", modalId: "systemModal" }
    ]
  },
  reports: {
    title: "Reports Center",
    items: [
      { label: "Daily KYC Exceptions", icon: "fas fa-file-circle-check", modalId: "reportsModal" },
      { label: "Dormant Clients", icon: "fas fa-user-clock", modalId: "reportsModal" },
      { label: "Maker Checker Items", icon: "fas fa-list-check", modalId: "reportsModal" },
      { label: "Report Writer", icon: "fas fa-file-pen", route: "http://172.16.2.42:9794/" }
    ]
  }
};

const CORPORATE_CLIENT_TYPES = new Set(["C", "B"]);
const CLIENT_SCOPE = {
  INDIVIDUAL: "individual",
  CORPORATE: "corporate"
};

async function handleLogin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const operatorIdField = form.querySelector("[name=operatorId]");
  const branchField = form.querySelector("[name=branchId]");
  const passwordField = form.querySelector("[name=password]");

  const operatorId = operatorIdField?.value.trim() || "";
  const password = passwordField?.value || "";
  const branchId = branchField?.value || "";

  const feedback = form.querySelector("#loginFeedback");
  const loginBtn = form.querySelector("button[type=submit]");

  if (!operatorId || !password || !branchId) {
    feedback.textContent = "Operator ID, password, and branch are all required.";
    feedback.classList.remove("d-none");
    return;
  }

  // Add loading state
  const originalBtnText = loginBtn.textContent;
  loginBtn.disabled = true;
  loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Logging in...';
  feedback.classList.add("d-none");

  try {
    if (typeof AuthService === 'undefined') {
      throw new Error("AuthService not loaded");
    }

    const result = await AuthService.login(operatorId, password, branchId);

    if (result.success) {
      // Clean up branch name for display (e.g., "Head Office (0101)" -> "Head Office")
      let branchName = branchField?.options[branchField.selectedIndex]?.text || "Unknown Branch";
      if (branchName.includes("(")) {
        branchName = branchName.split("(")[0].trim();
      }

      // Save selected branch name into session for dashboard display
      const session = AuthService.getSession();
      if (session) {
        session.selectedBranchName = branchName;
        AuthService.setSession(session);
      }
      window.location.replace(routeMap.dashboard);
    } else {
      feedback.textContent = result.message || "Login failed. Please check your credentials.";
      feedback.classList.remove("d-none");
    }
  } catch (error) {
    console.error("Login Error", error);
    feedback.textContent = "An unexpected error occurred. Please try again.";
    feedback.classList.remove("d-none");
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = originalBtnText;
  }
}

function requireAuth() {
  if (typeof AuthService === 'undefined') return; // Safety check if script not loaded yet

  const page = document.body?.dataset?.page || '';

  // Skip auth for submodule view pages (they're loaded in iframes from authenticated parent)
  // These pages have data-page ending in '-view' or are known iframe-only pages
  const isSubmoduleView = page.endsWith('-view') || page.includes('submodule');

  // Also check if we're inside an iframe
  let isInIframe = false;
  try {
    isInIframe = window.self !== window.top;
  } catch (e) {
    // Cross-origin iframe - assume we're in iframe
    isInIframe = true;
  }

  if (isInIframe || isSubmoduleView) {
    console.log('[Auth] Skipping auth check - submodule view or iframe context');
    return; // Parent already authenticated
  }

  if (!AuthService.isAuthenticated()) {
    window.location.replace(routeMap.login);
  }
}

function populateUserMeta() {
  if (typeof AuthService === 'undefined') return;

  const session = AuthService.getSession();
  if (!session) return;

  const nameTarget = document.querySelector("[data-user-name]");
  const branchTarget = document.querySelector("[data-branch-name]");
  const dateTarget = document.querySelector("[data-current-date]");

  if (nameTarget) {
    nameTarget.innerText = session.name || session.roleName || session.operatorID || "User";
  }

  if (branchTarget && session.selectedBranchName) {
    branchTarget.innerText = `Branch: ${session.selectedBranchName}`;
  }

  if (dateTarget) {
    const updateTime = () => {
      const now = new Date();
      const options = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
      dateTarget.innerText = `Date: ${now.toLocaleDateString('en-GB', options).replace(/,/g, ' ·')}`;
    };
    updateTime();
    setInterval(updateTime, 1000); // Real-time clock
  }
}

function wireLogoutButtons() {
  document.querySelectorAll("[data-logout]").forEach((button) => {
    button.addEventListener("click", () => {
      if (typeof AuthService !== 'undefined') {
        AuthService.logout();
      } else {
        window.location.replace(routeMap.login);
      }
    });
  });
}

function resolveScopeFromClientType(clientType) {
  if (!clientType) {
    return CLIENT_SCOPE.INDIVIDUAL;
  }

  return CORPORATE_CLIENT_TYPES.has(clientType.trim().toUpperCase())
    ? CLIENT_SCOPE.CORPORATE
    : CLIENT_SCOPE.INDIVIDUAL;
}

function parseScopeList(node) {
  return (node.dataset.clientScope || "all")
    .split(",")
    .map((scope) => scope.trim().toLowerCase())
    .filter(Boolean);
}

function nodeSupportsScope(node, scope) {
  const scopes = parseScopeList(node);
  if (!scopes.length) return true;
  return scopes.includes("all") || scopes.includes(scope);
}

function toggleFieldState(field, shouldDisable) {
  if (shouldDisable) {
    if (field.required) {
      field.dataset.scopeRequired = "true";
      field.required = false;
    }
    if (!field.disabled) {
      field.dataset.scopeDisabled = "true";
      field.disabled = true;
    }
    return;
  }

  if (field.dataset.scopeRequired) {
    field.required = true;
    delete field.dataset.scopeRequired;
  }

  if (field.dataset.scopeDisabled) {
    field.disabled = false;
    delete field.dataset.scopeDisabled;
  }
}

function toggleFieldsWithinNode(node, shouldDisable) {
  const fieldSelector = "input, select, textarea";
  const targets = node.matches(fieldSelector) ? [node] : node.querySelectorAll(fieldSelector);
  targets.forEach((field) => toggleFieldState(field, shouldDisable));
}

function applyScopeToNode(node, scope) {
  const shouldShow = nodeSupportsScope(node, scope);
  const isTabTrigger = node.matches?.("[data-bs-toggle='tab']");
  const isTabPane = node.classList?.contains("tab-pane");

  node.classList.toggle("d-none", !shouldShow);

  if (isTabTrigger) {
    node.classList.toggle("disabled", !shouldShow);
    node.setAttribute("tabindex", shouldShow ? "0" : "-1");
    node.setAttribute("aria-hidden", (!shouldShow).toString());
    if (!shouldShow) {
      node.classList.remove("active");
    }
  } else if (!shouldShow) {
    node.setAttribute("aria-hidden", "true");
  } else {
    node.removeAttribute("aria-hidden");
  }

  if (isTabPane && !shouldShow) {
    node.classList.remove("show", "active");
  }

  toggleFieldsWithinNode(node, !shouldShow);
}

function ensureActiveTabMatchesScope(scope) {
  const activePane = document.querySelector(".tab-pane.active.show");
  if (activePane && nodeSupportsScope(activePane, scope)) {
    return;
  }

  const eligibleButton = Array.from(document.querySelectorAll("[data-bs-toggle='tab'][data-client-scope]"))
    .find((button) => nodeSupportsScope(button, scope));

  if (!eligibleButton) {
    return;
  }

  const bootstrapLib = window.bootstrap;
  if (bootstrapLib?.Tab) {
    const existingInstance = bootstrapLib.Tab.getInstance(eligibleButton) || new bootstrapLib.Tab(eligibleButton);
    existingInstance.show();
  } else {
    eligibleButton.click();
  }
}

function applyClientScope(scope) {
  document.body.dataset.activeClientScope = scope;
  document.querySelectorAll("[data-client-scope]").forEach((node) => applyScopeToNode(node, scope));
  ensureActiveTabMatchesScope(scope);
}

function initClientTypeScopeWatcher() {
  const clientTypeSelect = document.querySelector('select[name="ClientTypeID"]');
  if (!clientTypeSelect) return;

  const handleScopeChange = () => {
    const scope = resolveScopeFromClientType(clientTypeSelect.value);
    applyClientScope(scope);
    if (clientFormModel) {
      clientFormModel.updateField("ClientTypeID", clientTypeSelect.value);
    }
  };

  clientTypeSelect.addEventListener("change", handleScopeChange);
  handleScopeChange();
}

let clientFormModel;

function getFieldValue(input) {
  if (input.type === "checkbox") {
    return input.checked;
  }
  return input.value;
}

function hydrateModelFromForm(form) {
  if (!clientFormModel) return;
  const formData = new FormData(form);
  formData.forEach((value, key) => {
    if (key in clientFormModel.state) {
      clientFormModel.updateField(key, value);
    }
  });
  return clientFormModel;
}

async function handleClientSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const feedback = document.getElementById("formToast");
  hydrateModelFromForm(form);

  const validation = clientFormModel.validate();
  if (!validation.valid) {
    if (feedback) {
      feedback.classList.remove("d-none", "alert-success");
      feedback.classList.add("alert-danger");
      feedback.innerHTML = validation.errors.map((err) => `<div>${err}</div>`).join("");
    }
    return;
  }

  const payload = clientFormModel.toRequestPayload();
  try {
    feedback?.classList.remove("d-none", "alert-danger");
    feedback?.classList.add("alert-info");
    if (feedback) {
      feedback.textContent = "Submitting client details...";
    }

    const response = await window.ClientService?.createClient({ RequestData: payload });
    const isSuccess = response?.ResponseCode === "00";
    if (feedback) {
      feedback.classList.remove("alert-info", "alert-danger");
      feedback.classList.add(isSuccess ? "alert-success" : "alert-warning");
      feedback.textContent = response?.ResponseMessage || (isSuccess ? "Client saved." : "Check response message.");
    }
  } catch (error) {
    console.error("Client submission failed", error);
    if (feedback) {
      feedback.classList.remove("d-none", "alert-success", "alert-info");
      feedback.classList.add("alert-danger");
      feedback.textContent = error?.message || "Failed to save client.";
    }
  }
}

function initClientForm() {
  const form = document.getElementById("client-form");
  if (!form) return;

  if (!window.ClientFormModel) {
    console.warn("ClientFormModel missing. Ensure models/clientFormModel.js is loaded.");
    return;
  }

  clientFormModel = new window.ClientFormModel();

  const syncField = (event) => {
    const input = event.target;
    if (!input?.name || !(input.name in clientFormModel.state)) return;
    clientFormModel.updateField(input.name, getFieldValue(input));
  };

  form.addEventListener("input", syncField);
  form.addEventListener("change", syncField);

  form.addEventListener("submit", handleClientSubmit);
}

function initTabs() {
  const hash = window.location.hash;
  if (!hash) return;
  const trigger = document.querySelector(`button[data-bs-target="${hash}"]`);
  if (trigger) {
    const tab = new bootstrap.Tab(trigger);
    tab.show();
  }
}

function initLegacyModuleDashboard() {
  const startToggle = document.querySelector("[data-start-toggle]");
  const startMenu = document.querySelector("[data-start-menu]");
  const startOverlay = document.querySelector("[data-start-overlay]");
  const startMenuLayout = document.querySelector(".start-menu__layout");
  const navPanel = document.querySelector("[data-nav-panel]");
  const shell = document.querySelector("[data-shell]");
  const bootstrapLib = window.bootstrap;
  const guardedWindowModals = new WeakSet();
  let navHoverTimeout = null;
  let navPinned = false;
  const modalOptions = {
    backdrop: false,
    focus: false,
    keyboard: true
  };

  const ensureWindowModalGuard = (modalEl) => {
    if (!modalEl || guardedWindowModals.has(modalEl)) return;
    guardedWindowModals.add(modalEl);

    modalEl.addEventListener("hide.bs.modal", (event) => {
      if (modalEl.dataset.childLock === "true") {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    });
  };

  window.addEventListener("message", (event) => {
    const data = event?.data;
    if (!data) return;

    if (data.type === "kairo-modal-lock") {
      const modalId = data.modalId;
      if (!modalId) return;
      const modalEl = document.getElementById(modalId);
      if (!modalEl) return;

      ensureWindowModalGuard(modalEl);

      const current = Number(modalEl.dataset.childLockCount || "0");
      const next = Math.max(0, current + (data.locked ? 1 : -1));
      modalEl.dataset.childLockCount = String(next);
      modalEl.dataset.childLock = next > 0 ? "true" : "false";
    }

    // Handle window actions (minimize, maximize, close, refresh) from iframes
    if (data.type === "kairo-action" && ["minimize", "maximize", "close", "refresh"].includes(data.action)) {
      const action = data.action;
      const modals = document.querySelectorAll(".legacy-modal");
      modals.forEach((modalEl) => {
        const iframe = modalEl.querySelector("iframe");
        if (iframe && iframe.contentWindow === event.source) {
          if (action === "minimize" && typeof minimizeModal === "function") {
            minimizeModal(modalEl);
          } else if (action === "maximize" && typeof toggleMaximizeModal === "function") {
            const btnMaximize = modalEl.querySelector('[data-window-action="maximize"]');
            toggleMaximizeModal(modalEl, btnMaximize);
          } else if (action === "close" && typeof closeModalWindow === "function") {
            closeModalWindow(modalEl);
          } else if (action === "refresh") {
            const btnRefresh = modalEl.querySelector('[data-window-action="refresh"]');
            // Reuse the refresh logic already in app.js if possible
            if (btnRefresh) {
              btnRefresh.click();
            } else {
              // Fallback refresh logic
              const src = iframe.src;
              iframe.src = src;
            }
          }
        }
      });
    }
  });

  const refreshModalIframes = (modalEl) => {
    if (!modalEl) return;
    const iframes = modalEl.querySelectorAll("iframe[data-refresh-on-open='true']");
    if (!iframes.length) return;

    const cacheBust = Date.now();
    iframes.forEach((iframe) => {
      const currentSrc = iframe.getAttribute("src") || "";
      const baseSrc = iframe.dataset.src || currentSrc;
      if (!baseSrc) return;
      if (!iframe.dataset.src) {
        iframe.dataset.src = baseSrc;
      }

      const [urlPart, hashPart] = iframe.dataset.src.split("#");
      const joiner = urlPart.includes("?") ? "&" : "?";
      iframe.src = `${urlPart}${joiner}v=${cacheBust}${hashPart ? `#${hashPart}` : ""}`;

      // Apply theme to iframe when it's refreshed
      if (window.ThemeManager && typeof window.ThemeManager.applyThemeGlobally === 'function') {
        // Apply immediately
        setTimeout(() => {
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (iframeDoc && window.ThemeManager) {
              console.log('🎨 Applying theme to refreshed modal iframe');
              window.ThemeManager.applyThemeToDocument(iframeDoc, window.ThemeManager.loadSavedTheme(), iframe.id || 'modal-iframe');
            }
          } catch (e) {
            console.log('Theme application to modal iframe pending iframe load');
          }
        }, 50);

        // Re-apply after module CSS loads
        setTimeout(() => {
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (iframeDoc && window.ThemeManager) {
              console.log('🔄 Re-enforcing theme on modal iframe after CSS load');
              window.ThemeManager.applyThemeToDocument(iframeDoc, window.ThemeManager.loadSavedTheme(), iframe.id || 'modal-iframe');
            }
          } catch (e) { }
        }, 300);

        // Final enforcement
        setTimeout(() => {
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (iframeDoc && window.ThemeManager) {
              console.log('🔄 Final theme enforcement on modal iframe');
              window.ThemeManager.applyThemeToDocument(iframeDoc, window.ThemeManager.loadSavedTheme(), iframe.id || 'modal-iframe');
            }
          } catch (e) { }
        }, 800);
      }
    });
  };

  const openModal = (modalId) => {
    if (!modalId) {
      console.warn('[StartMenu] openModal called without modalId');
      return;
    }

    console.log(`[StartMenu] Opening modal: ${modalId}`);

    const tryOpenInWindow = (targetWindow, windowName) => {
      if (!targetWindow) {
        console.log(`[StartMenu] ${windowName}: window is null`);
        return false;
      }
      const targetBootstrap = targetWindow.bootstrap;
      if (!targetBootstrap?.Modal) {
        console.log(`[StartMenu] ${windowName}: Bootstrap Modal not found`);
        return false;
      }
      const targetModalEl = targetWindow.document?.getElementById(modalId);
      if (!targetModalEl) {
        console.log(`[StartMenu] ${windowName}: Modal element '${modalId}' not found in DOM`);
        return false;
      }

      console.log(`[StartMenu] ${windowName}: Found modal element, opening...`);
      refreshModalIframes(targetModalEl);

      if (typeof targetWindow.minimizeOtherWindows === "function") {
        targetWindow.minimizeOtherWindows(targetModalEl.id);
      }
      const instance = targetBootstrap.Modal.getOrCreateInstance(targetModalEl, modalOptions);
      instance.show();
      console.log(`[StartMenu] Modal '${modalId}' opened successfully`);
      return true;
    };

    if (tryOpenInWindow(window, 'current')) return;
    if (window.parent && window.parent !== window && tryOpenInWindow(window.parent, 'parent')) return;
    if (window.top && window.top !== window && tryOpenInWindow(window.top, 'top')) return;

    console.warn(`[StartMenu] Modal not found in any window: ${modalId}`);
  };

  // Expose openModal globally for iframe communication
  window.openKairoModal = openModal;

  const closeStartMenu = () => {
    if (!startMenu) return;
    startMenu.classList.remove("is-visible");
    startOverlay?.classList.remove("is-visible");
  };

  const closeLaunchPanels = () => {
    closeStartMenu();
    if (navPanel) {
      navPinned = false;
      hideNavPanel(true);
    }
  };

  const revealNavPanel = () => {
    if (!navPanel) return;
    if (navHoverTimeout) {
      clearTimeout(navHoverTimeout);
      navHoverTimeout = null;
    }
    navPanel.classList.add("is-visible");
    shell?.classList.add("nav-visible");
  };

  const hideNavPanel = (force = false) => {
    if (!navPanel) return;
    if (!force && navPinned) return;
    if (navHoverTimeout) {
      clearTimeout(navHoverTimeout);
    }
    navHoverTimeout = setTimeout(() => {
      navPanel.classList.remove("is-visible");
      shell?.classList.remove("nav-visible");
    }, force ? 0 : 120);
  };

  if (startToggle && startMenu) {
    startToggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      // Primary UX: clicking Start should behave like hover (open the nav panel).
      if (navPanel) {
        navPinned = !navPinned;
        closeStartMenu();
        if (navPinned) {
          revealNavPanel();
        } else {
          hideNavPanel(true);
        }
        return;
      }

      // Fallback: if a page doesn't have the nav panel, use the start menu overlay.
      const isVisible = startMenu.classList.toggle("is-visible");
      if (isVisible) {
        startOverlay?.classList.add("is-visible");
      } else {
        startOverlay?.classList.remove("is-visible");
      }
    });

    startOverlay?.addEventListener("click", closeStartMenu);

    document.addEventListener("click", (event) => {
      const target = event.target;

      // Close start menu if click is outside
      if (startMenu && startToggle && !startMenu.contains(target) && !startToggle.contains(target)) {
        closeStartMenu();
      }

      // Unpin + close nav panel if click is outside
      if (navPanel && startToggle && !navPanel.contains(target) && !startToggle.contains(target)) {
        navPinned = false;
        hideNavPanel(true);
      }
    });
  }

  const startModules = document.querySelectorAll(".start-module[data-module]");
  const startModulesPanel = document.querySelector(".start-menu__modules");
  const submenuPanel = document.querySelector("[data-submenu-panel]");
  const submenuTitle = document.querySelector("[data-submenu-title]");
  const submenuList = document.querySelector("[data-submenu-list]");
  const navModuleButtons = document.querySelectorAll(".nav-item[data-module]");
  const navSubTitle = document.querySelector("[data-nav-subtitle]");
  const navSubList = document.querySelector("[data-nav-sub-list]");
  const taskbarContainer = document.querySelector("[data-taskbar]");
  let activeStartModuleButton = null;

  const renderSubmenu = (moduleKey) => {
    if (!submenuList) return;
    submenuList.innerHTML = "";
    const moduleConfig = START_MENU_REGISTRY[moduleKey];
    if (!moduleConfig) {
      if (submenuTitle) {
        submenuTitle.textContent = "Select module";
      }
      return;
    }

    if (submenuTitle) {
      submenuTitle.textContent = moduleConfig.title;
    }

    const appendStartItem = (item, depth = 0) => {
      if (item?.type === "divider") {
        const divider = document.createElement("div");
        divider.className = "submenu-divider";
        divider.setAttribute("aria-hidden", "true");
        submenuList.appendChild(divider);
        return;
      }

      const button = document.createElement("button");
      button.type = "button";
      button.className = depth > 0 ? "start-tile start-tile--child" : "start-tile";
      button.dataset.depth = String(depth);
      if (item.modalId) {
        button.dataset.launchModal = item.modalId;
      }
      button.innerHTML = `<i class="${item.icon}"></i><span>${item.label}</span>`;
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (item.modalId) {
          openModal(item.modalId);
          closeLaunchPanels();
        } else if (item.route) {
          window.location.href = item.route;
          closeLaunchPanels();
        }
      });
      submenuList.appendChild(button);

      if (Array.isArray(item.children)) {
        item.children.forEach((child) => appendStartItem(child, depth + 1));
      }
    };

    moduleConfig.items.forEach((item) => appendStartItem(item, 0));
  };

  const setStartSubmenuPosition = (targetButton) => {
    if (!submenuPanel || !startMenuLayout || !targetButton) return;
    const layoutRect = startMenuLayout.getBoundingClientRect();
    const buttonRect = targetButton.getBoundingClientRect();

    // Align the submenu panel with the hovered button, clamped to the layout bounds.
    let top = buttonRect.top - layoutRect.top;

    // After render, submenuPanel has a height; clamp so it doesn't overflow below the menu.
    const panelHeight = submenuPanel.offsetHeight || 0;
    const maxTop = Math.max(0, startMenuLayout.clientHeight - panelHeight);
    top = Math.min(Math.max(0, top), maxTop);

    submenuPanel.style.setProperty("--start-menu-submenu-top", `${Math.round(top)}px`);
  };

  const openStartSubmenu = (targetButton) => {
    if (!submenuPanel) return;
    submenuPanel.classList.add("is-open");
    // Ensure position is computed after DOM updates.
    requestAnimationFrame(() => setStartSubmenuPosition(targetButton));
  };

  const closeStartSubmenu = () => {
    submenuPanel?.classList.remove("is-open");
  };

  const activateStartModule = (targetButton) => {
    startModules.forEach((button) => {
      const isActive = button === targetButton;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  };

  startModules.forEach((button) => {
    const moduleKey = button.dataset.module;
    const selectModule = () => {
      activeStartModuleButton = button;
      activateStartModule(button);
      renderSubmenu(moduleKey);
      openStartSubmenu(button);
    };
    button.addEventListener("mouseenter", selectModule);
    button.addEventListener("focus", selectModule);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      selectModule();
    });
  });

  const defaultModuleButton = document.querySelector(".start-module[data-default]") || startModules[0];
  if (defaultModuleButton) {
    activeStartModuleButton = defaultModuleButton;
    activateStartModule(defaultModuleButton);
    renderSubmenu(defaultModuleButton.dataset.module);
    openStartSubmenu(defaultModuleButton);
  }

  // Keep flyout aligned during scroll/resize.
  startModulesPanel?.addEventListener("scroll", () => {
    if (activeStartModuleButton) {
      setStartSubmenuPosition(activeStartModuleButton);
    }
  });

  window.addEventListener("resize", () => {
    if (activeStartModuleButton) {
      setStartSubmenuPosition(activeStartModuleButton);
    }
  });

  // If the user moves outside the start menu, hide the flyout until the next hover.
  startMenu?.addEventListener("mouseleave", () => {
    closeStartSubmenu();
  });

  startMenu?.addEventListener("mouseenter", () => {
    if (activeStartModuleButton) {
      openStartSubmenu(activeStartModuleButton);
    }
  });

  const renderNavSubmenu = (moduleKey) => {
    if (!navSubList) return;
    navSubList.innerHTML = "";
    const moduleConfig = START_MENU_REGISTRY[moduleKey];
    if (!moduleConfig) {
      if (navSubTitle) {
        navSubTitle.textContent = "Sub Modules";
      }
      const placeholder = document.createElement("p");
      placeholder.className = "nav-sub-placeholder";
      placeholder.textContent = "No shortcuts configured for this module.";
      navSubList.appendChild(placeholder);
      return;
    }

    if (navSubTitle) {
      navSubTitle.textContent = moduleConfig.title;
    }

    const appendNavItem = (item, depth = 0) => {
      if (item?.type === "divider") {
        const divider = document.createElement("div");
        divider.className = "nav-sub-divider";
        divider.setAttribute("aria-hidden", "true");
        navSubList.appendChild(divider);
        return;
      }

      const button = document.createElement("button");
      button.type = "button";
      button.className = depth > 0 ? "nav-sub-item nav-sub-item--child" : "nav-sub-item";
      button.dataset.depth = String(depth);
      button.innerHTML = `<i class="${item.icon}"></i><span>${item.label}</span>`;
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (item.modalId) {
          openModal(item.modalId);
          closeLaunchPanels();
        } else if (item.route) {
          window.location.href = item.route;
          closeLaunchPanels();
        }
      });
      navSubList.appendChild(button);

      if (Array.isArray(item.children)) {
        item.children.forEach((child) => appendNavItem(child, depth + 1));
      }
    };

    moduleConfig.items.forEach((item) => appendNavItem(item, 0));
  };

  const highlightNavModule = (targetButton) => {
    navModuleButtons.forEach((button) => {
      const isActive = button === targetButton;
      button.classList.toggle("is-highlight", isActive);
    });
  };

  navModuleButtons.forEach((button) => {
    const moduleKey = button.dataset.module;
    const showSubmodules = () => {
      highlightNavModule(button);
      renderNavSubmenu(moduleKey);
    };
    button.addEventListener("mouseenter", showSubmodules);
    button.addEventListener("focus", showSubmodules);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      const modalId = button.dataset.launchModal;
      if (modalId) {
        openModal(modalId);
        closeLaunchPanels();
        return;
      }
      showSubmodules();
    });
  });

  const defaultNavButton = document.querySelector(".nav-item[data-nav-default]") || navModuleButtons[0];
  if (defaultNavButton) {
    highlightNavModule(defaultNavButton);
    renderNavSubmenu(defaultNavButton.dataset.module);
  }

  const getTaskbarButton = (modalId) => taskbarContainer?.querySelector(`[data-taskbar-modal='${modalId}']`);

  const removeTaskbarButton = (modalId) => {
    const button = getTaskbarButton(modalId);
    if (button) {
      button.remove();
    }
  };

  const setTaskbarState = (modalId, isActive) => {
    const button = getTaskbarButton(modalId);
    if (button) {
      button.classList.toggle("is-active", Boolean(isActive));
    }
  };

  const ensureTaskbarButton = (modalEl) => {
    if (!taskbarContainer || !modalEl?.id) return null;
    let button = getTaskbarButton(modalEl.id);
    if (button) return button;
    const iconClass = modalEl.dataset.windowIcon || "far fa-window-maximize";
    const title = modalEl.dataset.windowTitle || modalEl.querySelector(".modal-title")?.textContent?.trim() || "Window";
    button = document.createElement("button");
    button.type = "button";
    button.className = "taskbar-item";
    button.dataset.taskbarModal = modalEl.id;
    button.innerHTML = `<i class="${iconClass}"></i> <span>${title}</span>`;
    button.addEventListener("click", () => {
      const isVisible = modalEl.classList.contains("show");
      if (isVisible) {
        minimizeModal(modalEl);
      } else {
        minimizeOtherWindows(modalEl.id);
        modalEl.dataset.windowState = "active";
        bootstrapLib?.Modal.getOrCreateInstance(modalEl, modalOptions).show();
      }
    });
    taskbarContainer.appendChild(button);
    return button;
  };

  const minimizeModal = (modalEl) => {
    if (!modalEl) return;
    modalEl.dataset.windowState = "minimized";
    ensureTaskbarButton(modalEl);
    closeStartMenu();
    bootstrapLib?.Modal.getOrCreateInstance(modalEl, modalOptions)?.hide();
  };

  const minimizeOtherWindows = (nextModalId) => {
    document.querySelectorAll(".legacy-modal.show").forEach((modalEl) => {
      if (!modalEl.id || modalEl.id === nextModalId) return;
      minimizeModal(modalEl);
    });
  };

  // Expose for openModal() which can target parent/top windows.
  window.minimizeOtherWindows = minimizeOtherWindows;

  const toggleMaximizeModal = (modalEl, trigger) => {
    if (!modalEl) return;
    const dialog = modalEl.querySelector(".modal-dialog");
    if (!dialog) return;

    // Reset any drag positioning so maximize can take full control.
    dialog.style.removeProperty("position");
    dialog.style.removeProperty("left");
    dialog.style.removeProperty("top");
    dialog.style.removeProperty("margin");

    const isMaximized = dialog.classList.toggle("is-maximized");
    const icon = trigger?.querySelector("i");
    if (icon) {
      icon.classList.toggle("fa-square", !isMaximized);
      icon.classList.toggle("fa-clone", isMaximized);
    }
  };

  const closeModalWindow = (modalEl) => {
    if (!modalEl) return;
    modalEl.dataset.windowState = "closing";
    bootstrapLib?.Modal.getOrCreateInstance(modalEl, modalOptions)?.hide();
  };

  // Use event delegation for window controls to ensure it works even for dynamically added modals
  document.addEventListener("click", (event) => {
    const control = event.target.closest("[data-window-action]");
    if (!control) return;

    event.preventDefault();
    event.stopPropagation();

    const modalEl = control.closest(".legacy-modal");
    if (!modalEl) return;

    const action = control.dataset.windowAction;
    if (action === "minimize") {
      minimizeModal(modalEl);
    } else if (action === "maximize") {
      toggleMaximizeModal(modalEl, control);
    } else if (action === "refresh") {
      const iframe = modalEl.querySelector("iframe");
      if (!iframe) return;

      // Avoid cache issues by forcing a URL change on the iframe.
      // This works even when the browser aggressively caches iframe resources.
      const src = iframe.getAttribute("src") || iframe.src;
      if (!src) return;

      const parts = src.split("#");
      const base = parts[0];
      const hash = parts.length > 1 ? `#${parts.slice(1).join("#")}` : "";

      const cacheBust = `__r=${Date.now()}`;
      let nextBase;
      if (/[?&]__r=\d+/.test(base)) {
        nextBase = base.replace(/([?&])__r=\d+/, `$1${cacheBust}`);
      } else {
        nextBase = `${base}${base.includes("?") ? "&" : "?"}${cacheBust}`;
      }

      iframe.setAttribute("src", `${nextBase}${hash}`);
    } else if (action === "close") {
      closeModalWindow(modalEl);
    }
  });

  if (startToggle && navPanel) {
    startToggle.addEventListener("mouseenter", revealNavPanel);
    startToggle.addEventListener("mouseleave", () => hideNavPanel(false));
  }

  // Only allow mouseenter on the navPanel to KEEP it open if already visible, 
  // but don't let it trigger the initial reveal from the empty top area.
  if (navPanel) {
    navPanel.addEventListener("mouseenter", () => {
      if (navPanel.classList.contains("is-visible") || navPinned) {
        revealNavPanel();
      }
    });
    navPanel.addEventListener("mouseleave", () => hideNavPanel(false));
  }

  document.querySelectorAll("[data-launch-modal]").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openModal(trigger.dataset.launchModal);
      closeLaunchPanels();
    });
  });

  // Handle submenu modal launches (e.g., Overdraft submenu items)
  const submenuTriggers = document.querySelectorAll("[data-submenu-launch]");
  console.log("Found submenu triggers:", submenuTriggers.length);

  submenuTriggers.forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const targetModalId = trigger.dataset.submenuLaunch;
      console.log("Submenu clicked, target modal:", targetModalId);

      const parentModal = trigger.closest(".modal");

      if (parentModal && bootstrapLib?.Modal) {
        console.log("Parent modal found, closing it first");
        // Close the parent submenu modal first
        const parentModalInstance = bootstrapLib.Modal.getInstance(parentModal);
        if (parentModalInstance) {
          // Listen for when parent modal is fully hidden, then open target modal
          const openTargetModal = () => {
            parentModal.removeEventListener("hidden.bs.modal", openTargetModal);
            console.log("Parent modal hidden, now opening:", targetModalId);
            // Small delay to ensure smooth transition
            setTimeout(() => {
              openModal(targetModalId);
            }, 150);
          };
          parentModal.addEventListener("hidden.bs.modal", openTargetModal);
          parentModalInstance.hide();
        } else {
          console.log("No parent modal instance, opening directly");
          // No instance found, try to open directly
          openModal(targetModalId);
        }
      } else {
        console.log("No parent modal, opening directly");
        // No parent modal, just open the target
        openModal(targetModalId);
      }
    });
  });

  // Expose openModal globally for use from iframes
  window.openModal = openModal;
  window.closeModalWindow = closeModalWindow;

  document.querySelectorAll(".legacy-modal").forEach((modalEl) => {
    // Enable dragging windows by grabbing their header.
    // We do this once per modal via a data flag.
    if (!modalEl.dataset.dragEnabled) {
      modalEl.dataset.dragEnabled = "true";

      const header = modalEl.querySelector(".modal-header");
      const dialog = modalEl.querySelector(".modal-dialog");

      if (header && dialog) {
        const startDrag = (event) => {
          // Only primary button drags.
          if (event.button !== 0) return;
          // Don't start drag from window controls.
          if (event.target.closest("[data-window-controls], .window-controls, .window-control")) return;
          // Don't drag when maximized.
          if (dialog.classList.contains("is-maximized")) return;

          const rect = dialog.getBoundingClientRect();
          const startX = event.clientX;
          const startY = event.clientY;
          const originLeft = rect.left;
          const originTop = rect.top;

          // Switch to fixed positioning for consistent dragging.
          dialog.style.position = "fixed";
          dialog.style.margin = "0";
          dialog.style.left = `${originLeft}px`;
          dialog.style.top = `${originTop}px`;

          const onMove = (moveEvent) => {
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;
            dialog.style.left = `${originLeft + dx}px`;
            dialog.style.top = `${originTop + dy}px`;
          };

          const onUp = () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            header.releasePointerCapture?.(event.pointerId);
          };

          header.setPointerCapture?.(event.pointerId);
          window.addEventListener("pointermove", onMove);
          window.addEventListener("pointerup", onUp, { once: true });
        };

        header.addEventListener("pointerdown", startDrag);
      }
    }

    modalEl.setAttribute("data-bs-backdrop", "false");
    modalEl.setAttribute("data-bs-focus", "false");
    modalEl.setAttribute("data-bs-keyboard", "true");
    modalEl.addEventListener("show.bs.modal", () => {
      minimizeOtherWindows(modalEl.id);
      modalEl.dataset.windowState = "active";

      const cacheBustUrl = (src) => {
        const url = String(src || "").trim();
        if (!url) return url;

        const parts = url.split("#");
        const base = parts[0];
        const hash = parts.length > 1 ? `#${parts.slice(1).join("#")}` : "";

        const cacheBust = `__r=${Date.now()}`;
        let nextBase;
        if (/[?&]__r=\d+/.test(base)) {
          nextBase = base.replace(/([?&])__r=\d+/, `$1${cacheBust}`);
        } else {
          nextBase = `${base}${base.includes("?") ? "&" : "?"}${cacheBust}`;
        }

        return `${nextBase}${hash}`;
      };

      // Some iframe-based legacy screens can retain stale state (scroll/tab position)
      // across modal opens because the iframe isn't destroyed when the modal hides.
      // For Availment (Settlement), always refresh the iframe on open.
      if (modalEl.id === "availmentSettlementModal") {
        const iframe = modalEl.querySelector("iframe.legacy-modal__iframe");
        if (iframe) {
          const baseSrc = iframe.dataset.baseSrc || iframe.getAttribute("src") || "";
          if (baseSrc) {
            iframe.dataset.baseSrc = baseSrc;
            const cleanSrc = baseSrc.split("?")[0];
            iframe.src = `${cleanSrc}?ts=${Date.now()}`;
          }
        }
      }

      // Clear retained data for Collateral Maintenance when reopened.
      // The dashboard modal keeps the iframe alive by default, so we force
      // a reload of the module iframe each time the modal is shown.
      if (modalEl.id === "collateralMaintenanceModal") {
        const iframe = modalEl.querySelector("iframe.legacy-modal__iframe") || modalEl.querySelector("iframe");
        if (iframe) {
          const baseSrc = iframe.dataset.baseSrc || iframe.getAttribute("src") || "";
          if (baseSrc) {
            iframe.dataset.baseSrc = baseSrc;
            iframe.setAttribute("src", cacheBustUrl(baseSrc));
          }
        }
      }

      // Account Maintenance: only reload iframe when it was cleared (full close).
      // When restoring from minimize, iframe still has content - do NOT reload to preserve state.
      if (modalEl.id === "accountMaintenanceModal") {
        const iframe = modalEl.querySelector("iframe.legacy-modal__iframe") || modalEl.querySelector("iframe");
        if (iframe) {
          const currentSrc = (iframe.getAttribute("src") || "").trim();
          const baseSrc = (iframe.dataset.baseSrc || currentSrc).split("?")[0];
          const wasCleared = !currentSrc || currentSrc === "about:blank" || currentSrc.startsWith("about:");
          if (baseSrc && baseSrc !== "about:blank" && wasCleared) {
            iframe.dataset.baseSrc = baseSrc;
            iframe.setAttribute("src", cacheBustUrl(baseSrc));
          }
        }
      }
    });

    modalEl.addEventListener("shown.bs.modal", () => {
      modalEl.dataset.windowState = "active";
      const button = ensureTaskbarButton(modalEl);
      if (button) {
        button.classList.add("is-active");
      }
    });

    modalEl.addEventListener("hide.bs.modal", () => {
      if (modalEl.dataset.windowState !== "minimized") {
        modalEl.dataset.windowState = "closing";
      }
    });

    modalEl.addEventListener("hidden.bs.modal", () => {
      const wasMinimized = modalEl.dataset.windowState === "minimized";
      if (!wasMinimized) {
        removeTaskbarButton(modalEl.id);
        const dialog = modalEl.querySelector(".modal-dialog");
        dialog?.classList.remove("is-maximized");

        // Clear any drag positioning when the window closes.
        if (dialog) {
          dialog.style.removeProperty("position");
          dialog.style.removeProperty("left");
          dialog.style.removeProperty("top");
          dialog.style.removeProperty("margin");
        }

        // Reset module iframe after close so reopening starts clean.
        if (modalEl.id === "collateralMaintenanceModal") {
          const iframe = modalEl.querySelector("iframe.legacy-modal__iframe") || modalEl.querySelector("iframe");
          const baseSrc = iframe?.dataset.baseSrc || iframe?.getAttribute("src") || "";
          if (iframe && baseSrc) {
            iframe.setAttribute("src", baseSrc);
          }
        }

        // Account Maintenance: kill iframe on close so reopening loads fresh without previous data.
        if (modalEl.id === "accountMaintenanceModal") {
          const iframe = modalEl.querySelector("iframe.legacy-modal__iframe") || modalEl.querySelector("iframe");
          if (iframe) {
            const baseSrc = iframe.dataset.baseSrc || (iframe.getAttribute("src") || "").split("?")[0];
            if (baseSrc && baseSrc !== "about:blank") {
              iframe.dataset.baseSrc = baseSrc;
              iframe.src = "about:blank";
            }
          }
        }
      }
      setTaskbarState(modalEl.id, false);
      delete modalEl.dataset.windowState;
      // Clear the stored modal if this is the current one
      if (window.currentOpenModal === modalEl.id) {
        window.currentOpenModal = null;
      }
    });
  });
}

// --- Date picker support (calendar dropdown for date/month/year) ---
// Usage: add `data-date-picker` to any <input> that should open a calendar.
// We lazy-load Flatpickr via CDN to avoid wiring every page manually.
let __flatpickrLoadPromise = null;

function ensureFlatpickrLoaded() {
  if (window.flatpickr) return Promise.resolve(true);
  if (__flatpickrLoadPromise) return __flatpickrLoadPromise;

  __flatpickrLoadPromise = new Promise((resolve, reject) => {
    try {
      const doc = document;

      // Inject CSS once
      if (!doc.querySelector('link[data-flatpickr-css="true"]')) {
        const link = doc.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css';
        link.setAttribute('data-flatpickr-css', 'true');
        doc.head?.appendChild(link);
      }

      // Inject JS once
      const existing = doc.querySelector('script[data-flatpickr-js="true"]');
      if (existing) {
        // If another copy is already loading, wait a tick and resolve when present.
        const check = () => {
          if (window.flatpickr) return resolve(true);
          setTimeout(check, 50);
        };
        check();
        return;
      }

      const script = doc.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/flatpickr';
      script.defer = true;
      script.setAttribute('data-flatpickr-js', 'true');
      script.onload = () => resolve(Boolean(window.flatpickr));
      script.onerror = () => reject(new Error('Failed to load flatpickr'));
      doc.head?.appendChild(script);
    } catch (e) {
      reject(e);
    }
  });

  return __flatpickrLoadPromise;
}

function initDatePickers() {
  const isDateFieldName = (value) => /date/i.test(String(value || ''));

  const isAuditDateFieldName = (value) => {
    const v = String(value || '').trim().toLowerCase();
    if (!v) return false;
    return (
      v === 'createdon' ||
      v === 'modifiedon' ||
      v === 'supervisedon' ||
      v === 'approvedon' ||
      v === 'authorizedon' ||
      v === 'authorisedon' ||
      v === 'createddate' ||
      v === 'modifieddate'
    );
  };

  const formatDdMmmYyyy = (dt) => {
    const d = dt.getDate();
    const day = String(d).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mon = months[dt.getMonth()] || 'Jan';
    const year = dt.getFullYear();
    return `${day} ${mon} ${year}`;
  };

  const parseAnyDate = (value) => {
    const s = String(value || '').trim();
    if (!s) return null;

    // ISO date or datetime
    const isoDate = /^\d{4}-\d{2}-\d{2}$/;
    if (isoDate.test(s)) {
      const [y, m, d] = s.split('-').map((v) => parseInt(v, 10));
      const dt = new Date(y, m - 1, d);
      return Number.isNaN(dt.getTime()) ? null : dt;
    }

    // Handle ISO datetime and other Date-parsable strings.
    let dt = new Date(s);
    if (!Number.isNaN(dt.getTime())) return dt;

    // DD/MM/YYYY or DD/M/YYYY
    const slashed = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/;
    const m1 = s.match(slashed);
    if (m1) {
      const d = parseInt(m1[1], 10);
      const m = parseInt(m1[2], 10);
      let y = parseInt(m1[3], 10);
      if (y < 100) y += 2000;
      dt = new Date(y, m - 1, d);
      return Number.isNaN(dt.getTime()) ? null : dt;
    }

    // DD/MMM/YYYY
    const ddMmm = /^(\d{1,2})\/[A-Za-z]{3}\/(\d{2}|\d{4})$/;
    if (ddMmm.test(s)) {
      const normalized = s.replace(/\//g, ' ');
      dt = new Date(normalized);
      return Number.isNaN(dt.getTime()) ? null : dt;
    }

    return null;
  };

  const decorateAuditDateFields = () => {
    const valueDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    const originalGet = valueDescriptor?.get;
    const originalSet = valueDescriptor?.set;
    if (!originalGet || !originalSet) return;

    const inputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'));
    for (const el of inputs) {
      const id = el.getAttribute('id') || '';
      const name = el.getAttribute('name') || '';
      if (!isAuditDateFieldName(id) && !isAuditDateFieldName(name)) continue;
      if (el.dataset.kairoAuditDate === 'true') continue;

      el.dataset.kairoAuditDate = 'true';
      const initialRaw = String(originalGet.call(el) || '');

      Object.defineProperty(el, 'value', {
        configurable: true,
        enumerable: true,
        get() {
          return String(this.dataset.kairoRawValue ?? '');
        },
        set(v) {
          const raw = v == null ? '' : String(v);
          this.dataset.kairoRawValue = raw;
          const dt = parseAnyDate(raw);
          const display = dt ? formatDdMmmYyyy(dt) : raw;
          originalSet.call(this, display);
        }
      });

      // Initialize: store raw and show formatted display.
      el.value = initialRaw;
    }
  };

  const isPlaceholderText = (text) => {
    const t = String(text || '').trim().toLowerCase();
    if (!t) return true;
    return t === '--select--' || t === 'select' || t.includes('select');
  };

  const isDateLikeText = (text) => {
    const t = String(text || '').trim();
    if (!t) return false;
    return (
      /^\d{4}-\d{2}-\d{2}$/.test(t) ||
      /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(t) ||
      /^\d{1,2}\/[A-Za-z]{3}\/(\d{2}|\d{4})$/.test(t)
    );
  };

  const upgradeLegacyDateSelects = () => {
    const selects = Array.from(document.querySelectorAll('select'));
    for (const sel of selects) {
      const id = sel.getAttribute('id') || '';
      const name = sel.getAttribute('name') || '';
      if (!isDateFieldName(id) && !isDateFieldName(name)) continue;
      if (sel.disabled) continue;

      // Heuristic: if it's a "date" select, it usually has only a placeholder option.
      const options = Array.from(sel.options || []);
      if (options.length > 3) continue;

      const optionTexts = options.map((o) => (o.textContent || '').trim());
      const hasNonPlaceholder = optionTexts.some((t) => !isPlaceholderText(t));
      const hasRealList = options.some((o) => (o.value || '').trim() && !isPlaceholderText(o.textContent));

      // Only auto-convert when it does NOT look like a real enumerated list.
      if (hasRealList) continue;

      // If all we have is placeholders (or placeholder + default date like 01/Jan/0001), convert.
      if (!hasNonPlaceholder || optionTexts.every((t) => isPlaceholderText(t) || isDateLikeText(t))) {
        const input = document.createElement('input');
        input.type = 'text';

        // Keep identity stable for existing scripts
        if (id) input.id = id;
        if (name) input.name = name;

        // Preserve common attributes
        input.className = (sel.className || '').replace(/\bform-select\b/g, 'form-control').trim() || 'form-control';
        if (sel.hasAttribute('required')) input.setAttribute('required', '');
        if (sel.getAttribute('aria-label')) input.setAttribute('aria-label', sel.getAttribute('aria-label'));
        if (sel.getAttribute('aria-describedby')) input.setAttribute('aria-describedby', sel.getAttribute('aria-describedby'));

        // Carry dataset
        for (const [k, v] of Object.entries(sel.dataset || {})) {
          input.dataset[k] = v;
        }

        input.setAttribute('data-date-picker', '');
        input.setAttribute('placeholder', 'dd mmm yyyy');

        // Best-effort initial value if a date-like option is present.
        const dateLike = optionTexts.find((t) => isDateLikeText(t));
        if (dateLike && !isPlaceholderText(dateLike) && dateLike !== '01/Jan/0001') {
          input.value = dateLike;
        }

        sel.replaceWith(input);
      }
    }
  };

  const upgradeNativeDateInputs = () => {
    const dateInputs = Array.from(document.querySelectorAll('input[type="date"]'));
    for (const input of dateInputs) {
      if (input.hasAttribute('data-date-picker')) continue;
      input.type = 'text';
      input.setAttribute('data-date-picker', '');
      if (!input.getAttribute('placeholder')) input.setAttribute('placeholder', 'dd mmm yyyy');
    }
  };

  // Upgrade old date dropdowns and auto-mark date text fields.
  upgradeLegacyDateSelects();
  upgradeNativeDateInputs();

  // Format audit fields like CreatedOn/ModifiedOn/SupervisedOn without breaking scripts
  // that read/write their raw values.
  decorateAuditDateFields();

  for (const el of Array.from(document.querySelectorAll('input[type="text"], input:not([type])'))) {
    const id = el.getAttribute('id') || '';
    const name = el.getAttribute('name') || '';
    if (!isDateFieldName(id) && !isDateFieldName(name)) continue;
    if (!el.hasAttribute('data-date-picker')) {
      el.setAttribute('data-date-picker', '');
      if (!el.getAttribute('placeholder')) el.setAttribute('placeholder', 'dd mmm yyyy');
    }
  }

  const inputs = Array.from(document.querySelectorAll('input[data-date-picker]'));
  if (inputs.length === 0) return;

  ensureFlatpickrLoaded()
    .then((ok) => {
      if (!ok || !window.flatpickr) {
        // Fallback: try native date inputs if Flatpickr isn't available.
        for (const el of inputs) {
          if (el.type === 'text') el.type = 'date';
        }
        return;
      }

      for (const el of inputs) {
        if (el._flatpickr) continue;

        const parseDate = (dateString) => {
          const s = String(dateString || '').trim();
          if (!s) return null;

          // ISO: YYYY-MM-DD
          const iso = /^\d{4}-\d{2}-\d{2}$/;
          if (iso.test(s)) {
            const [y, m, d] = s.split('-').map((v) => parseInt(v, 10));
            const dt = new Date(y, m - 1, d);
            return Number.isNaN(dt.getTime()) ? null : dt;
          }

          // DD/MM/YYYY or DD/M/YYYY
          const slashed = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/;
          const m1 = s.match(slashed);
          if (m1) {
            const d = parseInt(m1[1], 10);
            const m = parseInt(m1[2], 10);
            let y = parseInt(m1[3], 10);
            if (y < 100) y += 2000;
            const dt = new Date(y, m - 1, d);
            return Number.isNaN(dt.getTime()) ? null : dt;
          }

          // DD/MMM/YYYY (legacy)
          const slashedMmm = /^(\d{1,2})\/[A-Za-z]{3}\/(\d{2}|\d{4})$/;
          if (slashedMmm.test(s)) {
            const normalized = s.replace(/\//g, ' ');
            const dt = new Date(normalized);
            return Number.isNaN(dt.getTime()) ? null : dt;
          }

          // DD MMM YYYY (target UI) and other Date-parsable strings.
          const dt = new Date(s);
          return Number.isNaN(dt.getTime()) ? null : dt;
        };

        window.flatpickr(el, {
          allowInput: !(el.hasAttribute('readonly') || el.disabled),
          dateFormat: 'Y-m-d',
          altInput: true,
          altFormat: 'd-M-Y',
          altInputClass: el.className || 'form-control',
          parseDate,
          disableMobile: true,
          monthSelectorType: 'dropdown',
          clickOpens: !(el.hasAttribute('readonly') || el.disabled),
          onReady: (_selectedDates, _dateStr, instance) => {
            if (instance?.altInput) {
              instance.altInput.readOnly = el.hasAttribute('readonly');
              instance.altInput.disabled = el.disabled;
              if (el.getAttribute('aria-label')) instance.altInput.setAttribute('aria-label', el.getAttribute('aria-label'));
              if (el.getAttribute('aria-describedby')) instance.altInput.setAttribute('aria-describedby', el.getAttribute('aria-describedby'));
            }
          },
          formatDate: (date) => {
            if (!date) return '';
            const d = new Date(date);
            if (isNaN(d.getTime())) return '';
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const day = String(d.getDate()).padStart(2, '0');
            const month = months[d.getMonth()];
            const year = d.getFullYear();
            return `${day}-${month}-${year}`;
          }
        });
      }
    })
    .catch((err) => {
      console.warn('[DatePicker] Failed to initialize date pickers', err);
    });
}

function initApp() {
  const page = document.body.dataset.page;

  if (page === "login") {
    const loginForm = document.getElementById("loginForm");
    loginForm?.addEventListener("submit", handleLogin);
    return;
  }

  //requireAuth();
  //populateUserMeta();
  //wireLogoutButtons();

  // Enable calendar pickers wherever inputs are marked.
  initDatePickers();

  // Ensure embedded iframe modules also get the unified date picker formatting.
  (function wireIframeDatePickers() {
    const injectInto = (iframe) => {
      try {
        const doc = iframe?.contentDocument;
        const win = iframe?.contentWindow;
        if (!doc || !win) return;

        if (!doc.querySelector('script[data-kairo-date-pickers="true"]')) {
          const script = doc.createElement('script');
          script.src = '/assets/js/ui/date-pickers.js';
          script.defer = true;
          script.setAttribute('data-kairo-date-pickers', 'true');
          script.onload = () => {
            try {
              win.KairoDatePickers?.init?.();
            } catch (_e) {
              // ignore
            }
          };
          (doc.head || doc.documentElement).appendChild(script);
        } else {
          win.KairoDatePickers?.init?.();
        }
      } catch (_e) {
        // Cross-origin or inaccessible iframe
      }
    };

    const wire = (iframe) => {
      if (!iframe || iframe.dataset.kairoDatePickersWired === 'true') return;
      iframe.dataset.kairoDatePickersWired = 'true';
      iframe.addEventListener('load', () => injectInto(iframe));

      // If already loaded, try immediately.
      try {
        if (iframe.contentDocument?.readyState === 'complete') injectInto(iframe);
      } catch (_e) {
        // ignore
      }
    };

    document.querySelectorAll('iframe').forEach(wire);

    // If iframes are created dynamically, observe and wire them too.
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of Array.from(m.addedNodes || [])) {
          if (node && node.tagName === 'IFRAME') {
            wire(node);
          } else if (node && node.querySelectorAll) {
            node.querySelectorAll('iframe').forEach(wire);
          }
        }
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  })();

  if (page === "client") {
    const startClientFlows = () => {
      initClientForm();
      initTabs();
      initClientTypeScopeWatcher();
    };

    if (typeof window.initLookupFields === "function") {
      window
        .initLookupFields()
        .then(startClientFlows)
        .catch((error) => {
          console.error("Lookup initialization failed", error);
          startClientFlows();
        });
    } else {
      startClientFlows();
    }
  }

  if (page === "module-dashboard") {
    initLegacyModuleDashboard();
  }
}

document.addEventListener("DOMContentLoaded", initApp);

// Handle postMessage from iframes to open modals
window.addEventListener('message', function (event) {
  // Generic action telemetry from embedded iframes
  if (event.data && event.data.type === 'kairo-action' && event.data.module && event.data.action) {
    if (event.data.module === 'cash-transaction') {
      console.log(`Cash Transaction (iframe): ${event.data.action} button clicked`);
    } else {
      console.log(`Iframe action: ${event.data.module}:${event.data.action}`);
    }
    return;
  }

  if (event.data && event.data.action === 'openModal' && event.data.modalId) {
    const modalId = event.data.modalId;
    const bootstrapLib = window.bootstrap;

    if (typeof window.minimizeOtherWindows === "function") {
      window.minimizeOtherWindows(modalId);
    }

    if (!bootstrapLib?.Modal) {
      console.error("Bootstrap Modal not available");
      return;
    }

    const modalEl = document.getElementById(modalId);
    if (!modalEl) {
      console.error("Modal not found:", modalId);
      return;
    }

    const modalInstance = bootstrapLib.Modal.getOrCreateInstance(modalEl, {
      backdrop: false,
      focus: false,
      keyboard: true
    });
    modalInstance.show();
  }

  // Handle kairo-open-modal message type
  if (event.data && event.data.type === 'kairo-open-modal' && event.data.modalId) {
    const modalId = event.data.modalId;

    // Try to use window.openKairoModal or fallback to bootstrap
    if (typeof window.openKairoModal === 'function') {
      window.openKairoModal(modalId);
    } else {
      // Fallback to direct bootstrap modal opening
      const bootstrapLib = window.bootstrap;
      if (!bootstrapLib?.Modal) {
        console.error("Bootstrap Modal not available");
        return;
      }

      const modalEl = document.getElementById(modalId);
      if (!modalEl) {
        console.error("Modal not found:", modalId);
        return;
      }

      const modalInstance = bootstrapLib.Modal.getOrCreateInstance(modalEl, {
        backdrop: false,
        focus: false,
        keyboard: true
      });
      modalInstance.show();
    }
  }

  // Handle close modal message from iframes
  if (event.data && (event.data.action === 'closeModal' || event.data.type === 'kairo-close-modal')) {
    const bootstrapLib = window.bootstrap;
    if (!bootstrapLib?.Modal) return;

    // Find the modal containing the iframe that sent the message
    const modals = document.querySelectorAll('.legacy-modal');
    modals.forEach(modalEl => {
      const iframe = modalEl.querySelector('iframe');
      if (iframe && iframe.contentWindow === event.source) {
        bootstrapLib.Modal.getOrCreateInstance(modalEl).hide();
      }
    });
  }
});

/**
 * Global function to launch a submodule modal from a parent menu modal
 * @param {string} targetModalId - The ID of the modal to open
 * @param {string} parentModalId - The ID of the parent modal to close first
 */
window.launchSubmodule = function (targetModalId, parentModalId) {
  console.log("launchSubmodule called:", targetModalId, parentModalId);

  const bootstrapLib = window.bootstrap;
  if (!bootstrapLib?.Modal) {
    console.error("Bootstrap Modal not available");
    return;
  }

  const parentModalEl = document.getElementById(parentModalId);
  const targetModalEl = document.getElementById(targetModalId);

  if (!targetModalEl) {
    console.error("Target modal not found:", targetModalId);
    return;
  }

  const openTargetModal = () => {
    console.log("Opening target modal:", targetModalId);
    if (typeof window.minimizeOtherWindows === "function") {
      window.minimizeOtherWindows(targetModalId);
    }
    const targetInstance = bootstrapLib.Modal.getOrCreateInstance(targetModalEl, {
      backdrop: false,
      focus: false,
      keyboard: true
    });
    targetInstance.show();
  };

  if (parentModalEl) {
    const parentInstance = bootstrapLib.Modal.getInstance(parentModalEl);
    if (parentInstance) {
      // Close parent first, then open target
      parentModalEl.addEventListener("hidden.bs.modal", function onHidden() {
        parentModalEl.removeEventListener("hidden.bs.modal", onHidden);
        setTimeout(openTargetModal, 100);
      });
      parentInstance.hide();
    } else {
      // Parent not shown as modal, just open target
      openTargetModal();
    }
  } else {
    // No parent modal, just open target
    openTargetModal();
  }
};