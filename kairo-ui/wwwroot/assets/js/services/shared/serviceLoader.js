/**
 * Service Loader Utility
 * Dynamically loads service scripts and manages dependencies
 */
; (function (global) {
  const loadedScripts = new Set();
  const loadingPromises = new Map();

  function getAssetsJsBaseUrl() {
    const current = document.currentScript && document.currentScript.src;
    if (current) {
      try {
        // serviceLoader.js: .../assets/js/services/shared/serviceLoader.js
        // Need to go up 2 levels: shared -> services -> js (we want /assets/js/)
        // Using '../../' resolves to the assets/js base directory
        const base = new URL('../../', current).href;
        console.log('[ServiceLoader] Calculated base from currentScript:', base);
        return base;
      } catch (e) {
        console.warn('[ServiceLoader] Failed to calc base from currentScript:', e);
      }
    }

    const scripts = Array.from(document.getElementsByTagName('script'));
    const match = scripts
      .map(s => s.src)
      .find(src => src && src.includes('assets/js/services/shared/serviceLoader.js'));

    if (match) {
      try {
        // From .../assets/js/services/shared/serviceLoader.js go up 2 levels
        const base = new URL('../../', match).href;
        console.log('[ServiceLoader] Calculated base from script search:', base);
        return base;
      } catch (e) {
        console.warn('[ServiceLoader] Failed to calc base from script search:', e);
      }
    }

    // Fallback: use absolute path
    const origin = window.location.origin;
    const fallback = `${origin}/assets/js/`;
    console.log('[ServiceLoader] Using fallback base:', fallback);
    return fallback;
  }

  const ASSETS_JS_BASE = getAssetsJsBaseUrl();
  console.log('[ServiceLoader] ASSETS_JS_BASE:', ASSETS_JS_BASE);

  function assetUrl(pathWithinAssetsJs) {
    const url = new URL(String(pathWithinAssetsJs).replace(/^\/+/, ''), ASSETS_JS_BASE).href;
    console.log('[ServiceLoader] assetUrl:', pathWithinAssetsJs, '->', url);
    return url;
  }

  /**
   * Load a JavaScript file dynamically
   * @param {string} src - Script source path
   * @returns {Promise} Resolves when script is loaded
   */
  function loadScript(src) {
    // Return cached promise if already loading
    if (loadingPromises.has(src)) {
      return loadingPromises.get(src);
    }

    // Return immediately if already loaded
    if (loadedScripts.has(src)) {
      return Promise.resolve();
    }

    const promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => {
        loadedScripts.add(src);
        loadingPromises.delete(src);
        resolve();
      };
      script.onerror = () => {
        loadingPromises.delete(src);
        reject(new Error(`Failed to load script: ${src}`));
      };
      document.head.appendChild(script);
    });

    loadingPromises.set(src, promise);
    return promise;
  }

  /**
   * Load multiple scripts in sequence
   * @param {string[]} scripts - Array of script paths
   * @returns {Promise} Resolves when all scripts are loaded
   */
  async function loadScripts(scripts) {
    for (const script of scripts) {
      await loadScript(script);
    }
  }

  /**
   * Get the base path for assets
   * @returns {string} Base path (absolute from root)
   */
  function getBasePath() {
    return ASSETS_JS_BASE;
  }

  function resolveCoreScriptsToLoad() {
    const scripts = [];

    // Some pages include these scripts via relative paths (e.g. ../../assets/js/environment.js)
    // which bypasses our internal caching (different URL string). Avoid re-loading by checking globals.
    if (!global.Environment) scripts.push(assetUrl('environment.js'));
    if (!global.CoreBankingConfig) scripts.push(assetUrl('config.js'));
    if (!global.CoreApi) scripts.push(assetUrl('services/shared/coreApi.js'));

    return scripts;
  }

  /**
   * Load core dependencies (Environment, Config, CoreApi)
   * @returns {Promise} Resolves when core dependencies are loaded
   */
  async function loadCore() {
    const scripts = resolveCoreScriptsToLoad();
    if (scripts.length) {
      await loadScripts(scripts);
    }
  }

  /**
   * Load Auth service
   */
  async function loadAuthService() {
    await loadCore();
    await loadScript(assetUrl('auth/auth.service.js'));
  }

  /**
   * Load client service
   * @returns {Promise} Resolves when client service is loaded
   */
  async function loadClientService() {
    await loadCore();
    await loadScript(assetUrl('services/client/clientService.js'));
  }

  /**
   * Load client document service (multipart/form-data API)
   * @returns {Promise} Resolves when client document service is loaded
   */
  async function loadClientDocumentService() {
    await loadCore();
    await loadScript(assetUrl('services/client/clientDocumentService.js'));
  }

  /**
   * Load temp image service (Photo & Signature uploads)
   * @returns {Promise} Resolves when temp image service is loaded
   */
  async function loadTempImageService() {
    await loadCore();
    await loadScript(assetUrl('services/client/tempImageService.js'));
  }

  /**
   * Load client approval service (Approve/Reject clients)
   * @returns {Promise} Resolves when client approval service is loaded
   */
  async function loadClientApprovalService() {
    await loadCore();
    await loadScript(assetUrl('services/client/clientApprovalService.js'));
  }

  /**
   * Load file service (Base64 conversions, file handling)
   * @returns {Promise} Resolves when file service is loaded
   */
  async function loadFileService() {
    return loadScript(assetUrl('services/shared/fileService.js'));
  }

  /**
   * Load image detection service (face and signature detection)
   * @returns {Promise} Resolves when image detection service is loaded
   */
  async function loadImageDetectionService() {
    return loadScript(assetUrl('services/shared/imageDetectionService.js'));
  }

  /**
   * Load recent activity service (track and retrieve recent activities)
   * @returns {Promise} Resolves when recent activity service is loaded
   */
  async function loadRecentActivityService() {
    await loadCore();
    return loadScript(assetUrl('services/shared/recentActivityService.js'));
  }

  /**
   * Load lookup service
   * @returns {Promise} Resolves when lookup service is loaded
   */
  async function loadLookupService() {
    await loadCore();
    await loadScript(assetUrl('services/shared/lookupService.js'));
  }


  /**
   * Load custom dropdown codes lookup service
   * @returns {Promise} Resolves when custom codes lookup service is loaded
   */
  async function loadCustomCodesLookupService() {
    await loadCore();
    await loadScript(assetUrl('services/shared/customCodesLookupService.js'));
  }

  // Backward-compatible alias (older mixed-case name)
  async function loadCustomCodesLookUPSERCH() {
    return loadCustomCodesLookupService();
  }

  /**
   * Load search service
   * @returns {Promise} Resolves when search service is loaded
   */
  async function loadSearchService() {
    await loadCore();
    await loadScript(assetUrl('services/shared/searchService.js'));
  }

  /**
   * Load bank search service
   * @returns {Promise} Resolves when bank search service is loaded
   */
  async function loadBankSearchService() {
    await loadCore();
    await loadScript(assetUrl('services/bankSearchService.js'));
  }

  /**
   * Load branch service
   * @returns {Promise} Resolves when branch service is loaded
   */
  async function loadBranchService() {
    await loadCore();
    await loadScript(assetUrl('services/branch/branchService.js'));
  }

  /**
   * Load center service
   * @returns {Promise} Resolves when center service is loaded
   */
  async function loadCenterService() {
    await loadCore();
    await loadScript(assetUrl('services/center/centerService.js'));
  }

  /**
   * Load group collection service
   * @returns {Promise} Resolves when group collection service is loaded
   */
  async function loadGroupCollectionService() {
    await loadCore();
    await loadScript(assetUrl('services/groupCollection/groupCollectionService.js'));
  }

  /**
   * Load till service
   * @returns {Promise} Resolves when till service is loaded
   */
  async function loadTillService() {
    await loadCore();
    await loadScript(assetUrl('services/till/tillService.js'));
  }

  /**
   * Load loans service
   * @returns {Promise} Resolves when loans service is loaded
   */
  async function loadLoansService() {
    await loadCore();
    await loadScript(assetUrl('services/loans/loansService.js'));
  }

  /**
   * Load treasury service
   * @returns {Promise} Resolves when treasury service is loaded
   */
  async function loadTreasuryService() {
    await loadCore();
    await loadScript(assetUrl('services/treasury/treasuryService.js'));
  }

  /**
   * Load deposit service
   * @returns {Promise} Resolves when deposit service is loaded
   */
  async function loadDepositService() {
    await loadCore();
    await loadScript(assetUrl('services/deposit/depositService.js'));
  }

  /**
   * Load blocking/unblocking service
   * @returns {Promise} Resolves when blocking/unblocking service is loaded
   */
  async function loadBlockingUnblockingService() {
    await loadCore();
    await loadScript(assetUrl('services/account/blockingUnblockingService.js'));
  }

  /**
   * Load General Ledger service
   * @returns {Promise} Resolves when GL service is loaded
   */
  async function loadGeneralLedgerService() {
    await loadCore();
    await loadScript(assetUrl('services/generalLedger/generalLedgerService.js'));
  }

  /**
   * Load Group Insurance Type service
   * @returns {Promise} Resolves when group insurance type service is loaded
   */
  async function loadGroupInsuranceTypeService() {
    await loadCore();
    await loadScript(assetUrl('services/groupInsuranceType/groupInsuranceTypeService.js'));
  }

  /**
   * Load Group service
   * @returns {Promise} Resolves when group service is loaded
   */
  async function loadGroupService() {
    await loadCore();
    await loadScript('/assets/js/services/microfinance/groupService.js');
  }

  /**
   * Load Product service (FD, RD, SC)
   * @returns {Promise} Resolves when Product service is loaded
   */
  async function loadProductService() {
    await loadCore();
    await loadScript(assetUrl('services/products/productService.js'));
  }

  /**
   * Load Product LG/LC service
   * @returns {Promise} Resolves when product LG/LC service is loaded
   */
  async function loadProductLgLcService() {
    await loadCore();
    await loadScript(assetUrl('services/product/productLgLcService.js'));
  }

  /**
   * Load Product Loan service
   * @returns {Promise} Resolves when Product Loan service is loaded
   */
  async function loadProductLoanService() {
    await loadCore();
    await loadScript(assetUrl('services/products/productLoanService.js'));
  }

  /**
   * Load exit type service
   * @returns {Promise} Resolves when exit type service is loaded
   */
  async function loadExitTypeService() {
    await loadCore();
    await loadScript(assetUrl('services/microfinance/exitTypeService.js'));
  }

  /**
   * Load unlock system record locks service
   * @returns {Promise} Resolves when unlock service is loaded
   */
  async function loadUnlockSystemRecordLocksService() {
    await loadCore();
    await loadScript('/assets/js/services/utilities/unlockSystemRecordLocksService.js');
  }

  /**
   * Load unsupervised data view service
   * @returns {Promise} Resolves when unsupervised data view service is loaded
   */
  async function loadUnsupervisedDataViewService() {
    await loadCore();
    await loadScript('/assets/js/services/utilities/unsupervisedDataViewService.js');
  }

  /**
   * Load loan application service (workflow)
   * @returns {Promise} Resolves when loan application service is loaded
   */
  async function loadLoanApplicationService() {
    await loadCore();
    await loadScript('/assets/js/services/workflow/loanApplicationService.js');
  }

  /**
   * Load repayment accounts service (loan application)
   * @returns {Promise} Resolves when repayment accounts service is loaded
   */
  async function loadRepaymentAccountsService() {
    await loadCore();
    await loadScript('/modules/loan-application/repaymentAccountsService.js');
  }


  /**
   * Load application status individual service (workflow)
   * @returns {Promise} Resolves when application status individual service is loaded
   */
  async function loadApplicationStatusIndividualService() {
    await loadCore();
    await loadScript('/assets/js/services/workflow/applicationStatusIndividualService.js');
  }

  /**
   * Load premature clear effect service (utilities)
   * @returns {Promise} Resolves when premature clear effect service is loaded
   */
  async function loadPrematureClearEffectService() {
    await loadCore();
    await loadScript('/assets/js/services/utilities/prematureClearEffectService.js');
  }

  /**
   * Load loan appraisal service (workflow)
   * @returns {Promise} Resolves when loan appraisal service is loaded
   */
  async function loadLoanAppraisalService() {
    await loadCore();
    await loadScript('/assets/js/services/workflow/loanAppraisalService.js');
  }

  /**
   * Load loan utilization service (workflow)
   * @returns {Promise} Resolves when loan utilization service is loaded
   */
  async function loadLoanUtilizationService() {
    await loadCore();
    await loadScript('/assets/js/services/workflow/loanUtilizationService.js');
  }

  /**
   * Load loan approvals service (workflow)
   * @returns {Promise} Resolves when loan approvals service is loaded
   */
  async function loadLoanApprovalsService() {
    await loadCore();
    await loadScript('/assets/js/services/workflow/loanApprovalsService.js');
  }

  /**
   * Load application search service
   * @returns {Promise} Resolves when application search service is loaded
   */
  async function loadApplicationSearchService() {
    await loadCore();
    await loadScript('/assets/js/services/workflow/applicationSearchService.js');
  }

  /**
   * Load client search service
   * @returns {Promise} Resolves when client search service is loaded
   */
  async function loadClientSearchService() {
    await loadCore();
    await loadScript('/assets/js/services/workflow/clientSearchService.js');
  }

  /**
   * Load loan collaterals service (workflow/loans)
   * @returns {Promise} Resolves when loan collaterals service is loaded
   */
  async function loadLoanCollateralsService() {
    await loadCore();
    await loadScript('/assets/js/services/workflow/loanCollateralsService.js');
  }

  /**
   * Load Product Bill Contract service
   * @returns {Promise} Resolves when Product Bill Contract service is loaded
   */
  async function loadProductBillContractService() {
    await loadCore();
    await loadScript(assetUrl('services/products/productBillContractService.js'));
  }

  /**
   * Load Product (SB, CA, CS, SH) service
   * @returns {Promise} Resolves when Product (SB, CA, CS, SH) service is loaded
   */
  async function loadProductSBCACSService() {
    await loadCore();
    await loadScript(assetUrl('services/products/productSBCACSService.js'));
  }

  /**
   * Load other modules service
   * @returns {Promise} Resolves when other modules service is loaded
   */
  async function loadOtherModulesService() {
    await loadCore();
    try {
      await loadScript(assetUrl('services/otherModules/otherModulesService.js'));
    } catch (error) {
      try {
        // Some branches use a hyphenated folder name.
        await loadScript(assetUrl('services/other-modules/otherModulesService.js'));
      } catch (error2) {
        // Some branches use a singular folder name.
        await loadScript(assetUrl('services/otherModuleService/otherModuleService.js'));
      }
    }
  }

  /**
   * Load cost center service
   * @returns {Promise} Resolves when cost center service is loaded
   */
  async function loadCostCenterService() {
    await loadCore();
    return loadScript(`${getBasePath()}services/cost-center/costCenterService.js?v=20260122`);
  }

  /**
   * Load bill account service
   * @returns {Promise} Resolves when bill account service is loaded
   */
  async function loadBillAccountService() {
    await loadCore();
    await loadScript(assetUrl('services/bill/billAccountService.js'));
  }

  /**
   * Load charges and rates service
   * @returns {Promise} Resolves when charges and rates service is loaded
   */
  async function loadChargesRatesService() {
    await loadCore();
    await loadScript(assetUrl('services/charges-rates/chargesRatesService.js'));
  }

  /**
   * Load account charge rate service
   * @returns {Promise} Resolves when account charge rate service is loaded
   */
  async function loadAccountChargeRateService() {
    await loadCore();
    await loadScript(assetUrl('services/account/accountChargeRateService.js'));
  }

  /**
   * Load transaction supervision service
   * @returns {Promise} Resolves when transaction supervision service is loaded
   */
  async function loadTransactionSupervisionService() {
    await loadCore();
    await loadScript(assetUrl('services/transactionSupervision/transactionSupervisionService.js'));
  }

  /**
   * Load charge service
   * @returns {Promise} Resolves when charge service is loaded
   */
  async function loadChargeService() {
    await loadCore();
    await loadScript(assetUrl('services/charges/chargeService.js'));
  }

  /**
   * Load overdraft service
   * @returns {Promise} Resolves when overdraft service is loaded
   */
  async function loadOverdraftService() {
    await loadCore();
    await loadScript(assetUrl('services/Overdraft/overdraftService.js'));
  }

  /**
   * Load system audit service
   * @returns {Promise} Resolves when system audit service is loaded
   */
  async function loadSystemAuditService() {
    await loadCore();
    await loadScript(assetUrl('services/System_Audit/systemAuditService.js'));
  }

  /**
   * Load user service
   * @returns {Promise} Resolves when user service is loaded
   */
  async function loadUserService() {
    await loadCore();
    await loadScript(assetUrl('services/user/userService.js'));
  }

  /**
   * Load role service
   * @returns {Promise} Resolves when role service is loaded
   */
  async function loadRoleService() {
    await loadCore();
    await loadScript(assetUrl('services/role/roleService.js'));
  }

  /**
   * Load base rates service
   * @returns {Promise} Resolves when base rates service is loaded
   */
  async function loadBaseRatesService() {
    await loadCore();
    await loadScript(assetUrl('services/baseRates/baseRatesService.js'));
  }

  /**
   * Load Static Data service
   * @returns {Promise} Resolves when static data service is loaded
   */
  async function loadStaticDataService() {
    await loadCore();
    // Consolidated static-data service (covers all static-data submodules)
    await loadScript(assetUrl('services/static-data/staticDataService.js'));
  }

  /**
   * Load Other Static Data service
   * @returns {Promise} Resolves when other static data service is loaded
   */
  async function loadOtherStaticDataService() {
    await loadCore();
    await loadScript(assetUrl('services/static-data/otherStaticDataService.js'));
  }

  /**
   * Load System Utilities service
   * @returns {Promise} Resolves when system utilities service is loaded
   */
  async function loadSystemUtilitiesService() {
    await loadCore();
    // Consolidated system-utilities service (covers all system-utilities submodules)
    await loadScript(assetUrl('services/system-utilities/systemUtilitiesService.js'));
  }

  /**
   * Load limits & collateral service
   * @returns {Promise} Resolves when limits & collateral service is loaded
   */
  async function loadLimitsCollateralService() {
    await loadCore();
    await loadScript('/assets/js/services/limits-collateral/limitsCollateralService.js');
  }

  /**
   * Load System Auditing: Customer Balance service
   * @returns {Promise} Resolves when CustomerBalanceService is loaded
   */
  async function loadCustomerBalanceService() {
    await loadCore();
    await loadScript('/assets/js/services/system-audit/customerBalanceService.js');
  }

  /**
   * Load System Branches service
   * @returns {Promise} Resolves when SystemBranchesService is loaded
   */
  async function loadSystemBranchesService() {
    await loadCore();
    await loadScript('/assets/js/services/system-audit/systemBranchesService.js');
  }

  /**
   * Load collateral service
   * @returns {Promise} Resolves when collateral service is loaded
   */
  async function loadCollateralService() {
    await loadCore();
    await loadScript('/assets/js/services/collateral/collateralService.js');
  }

  /**
   * Load letter of guarantee service
   * @returns {Promise} Resolves when letter of guarantee service is loaded
   */
  async function loadLetterOfGuaranteeService() {
    await loadCore();
    await loadScript('/assets/js/services/letterOfGuarantee/letterOfGuaranteeService.js');
  }

  /**
   * Load collateral service
   * @returns {Promise} Resolves when collateral service is loaded
   */
  async function loadCollateralService() {
    await loadCore();
    await loadScript('/assets/js/services/collateral/collateralService.js');
  }

  /**
   * Load images service
   * @returns {Promise} Resolves when images service is loaded
   */
  async function loadImagesService() {
    await loadCore();
    await loadScript(assetUrl('services/images/imagesService.js'));
  }

  /**
   * Load common services (Client, Lookup, Search)
   * @returns {Promise} Resolves when all common services are loaded
   */
  async function loadCommonServices() {
    await loadCore();
    await loadScripts([
      assetUrl('services/client/clientService.js'),
      assetUrl('services/shared/lookupService.js'),
      assetUrl('services/shared/searchService.js')
    ]);
  }

  /**
   * Load UI components
   * @param {string[]} components - Array of component names
   * @returns {Promise} Resolves when all components are loaded
   */

  /**
   * Load fixed assets service
   * @returns {Promise} Resolves when fixed assets service is loaded
   */
  async function loadFixedAssetsService() {
    await loadCore();
    await loadScript(assetUrl('services/fixedAssets/fixedAssetsService.js'));
  }

  /**
   * Load account classification service
   * @returns {Promise} Resolves when account classification service is loaded
   */
  async function loadAccountClassificationService() {
    await loadCore();
    await loadScript(assetUrl('services/account/accountClassificationService.js'));
  }

  /**
   * Load SPM Risk Acceptance Level service
   * @returns {Promise} Resolves when SPM Risk Acceptance Level service is loaded
   */
  async function loadSPMRiskAcceptanceLevelService() {
    await loadCore();
    await loadScript(assetUrl('services/otherModuleService/spmRiskAcceptanceLevelService.js'));
  }

  /**
   * Load SPM Questions service
   * @returns {Promise} Resolves when SPM Questions service is loaded
   */
  async function loadSPMQuestionsService() {
    await loadCore();
    await loadScript(assetUrl('services/otherModuleService/spmQuestionsService.js'));
  }

  /**
   * Load SPM Questionnaires service
   * @returns {Promise} Resolves when SPM Questionnaires service is loaded
   */
  async function loadSPMQuestionnairesService() {
    await loadCore();
    await loadScript(assetUrl('services/otherModuleService/spmQuestionnairesService.js'));
  }

  async function loadUIComponents(components = []) {
    const scripts = components.map(comp => assetUrl(`ui/${comp}.js`));
    await loadScripts(scripts);
  }

  /**
   * Check if a service is loaded
   * @param {string} serviceName - Service name on window object
   * @returns {boolean} True if service is available
   */
  function isServiceLoaded(serviceName) {
    return typeof global[serviceName] !== 'undefined';
  }

  /**
   * Wait for a service to be available
   * @param {string} serviceName - Service name on window object
   * @param {number} timeout - Timeout in milliseconds (default: 5000)
   * @returns {Promise} Resolves when service is available
   */
  function waitForService(serviceName, timeout = 5000) {
    return new Promise((resolve, reject) => {
      if (isServiceLoaded(serviceName)) {
        resolve(global[serviceName]);
        return;
      }

      const startTime = Date.now();
      const interval = setInterval(() => {
        if (isServiceLoaded(serviceName)) {
          clearInterval(interval);
          resolve(global[serviceName]);
        } else if (Date.now() - startTime > timeout) {
          clearInterval(interval);
          reject(new Error(`Timeout waiting for ${serviceName}`));
        }
      }, 50);
    });
  }


  const ServiceLoader = {
    loadScript,
    loadScripts,
    loadCore,
    loadAuthService,
    loadClientService,
    loadClientDocumentService,
    loadImagesService,
    loadTempImageService,
    loadClientApprovalService,
    loadFileService,
    loadImageDetectionService,
    loadRecentActivityService,
    loadBillAccountService,
    loadLookupService,
    loadCustomCodesLookUPSERCH,
    loadCustomCodesLookupService,
    loadSearchService,
    loadBankSearchService,
    loadBranchService,
    loadCenterService,
    loadGroupCollectionService,
    loadTillService,
    loadLoansService,
    loadCustomerBalanceService,
    loadSystemBranchesService,
    loadLimitsCollateralService,
    loadUnlockSystemRecordLocksService,
    loadUnsupervisedDataViewService,
    loadLoanApplicationService,
    loadApplicationStatusIndividualService,
    loadPrematureClearEffectService,
    loadLoanAppraisalService,
    loadLoanUtilizationService,
    loadLoanApprovalsService,
    loadApplicationSearchService,
    loadClientSearchService,
    loadLoanCollateralsService,
    loadProductService,
    loadProductLoanService,
    loadProductBillContractService,
    loadProductSBCACSService,
    loadSystemAuditService,
    loadUserService,
    loadBaseRatesService,
    loadRoleService,
    loadChargesRatesService,
    loadAccountChargeRateService,
    loadOtherModulesService,
    loadCostCenterService,
    loadTransactionSupervisionService,
    loadChargeService,
    loadOverdraftService,
    loadSystemAuditService,
    loadStaticDataService,
    loadOtherStaticDataService,
    loadSystemUtilitiesService,
    loadFixedAssetsService,
    loadAccountClassificationService,
    loadGroupInsuranceTypeService,
    loadGroupService,
    loadGeneralLedgerService,
    loadSPMRiskAcceptanceLevelService,
    loadSPMQuestionsService,
    loadSPMQuestionnairesService,
    loadCollateralService,
    loadLetterOfGuaranteeService,
    loadDepositService,
    loadBlockingUnblockingService,
    loadTreasuryService,
    loadProductLgLcService,
    loadExitTypeService,
    loadRepaymentAccountsService,

    loadCommonServices,
    loadUIComponents,
    isServiceLoaded,
    waitForService,
    getBasePath,
  };

  global.ServiceLoader = ServiceLoader;
  console.log('[ServiceLoader] Registered on window:', !!global.ServiceLoader);
})(window);
