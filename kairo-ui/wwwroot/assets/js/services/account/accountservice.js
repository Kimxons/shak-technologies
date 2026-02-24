(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  const BASE_URL = (Environment.baseUrlAccount).replace(/\/+$/, "");
  const ACCOUNT_ENDPOINT = `${BASE_URL}/api/OldAPI`;

  const AccountService = {
    getAccount(requestData) {
      const formId = "dbo.p_GetAccountCustomers";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    saveAccount(requestData) {
      const formId = "dbo.p_AddEditAccountCustomers";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    
    getAccountOpeningDetails(requestData) {
      const formId = "dbo.p_GetAccountOpeningDetails";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    getAccountDocuments(requestData) {
      const formId = "dbo.p_GetAccountDocuments";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    addEditAccountDocuments(requestData) {
      const formId = "dbo.p_AddEditAccountDocuments";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    getUnClearBalance(requestData) {
      const formId = "dbo.p_GetUnClearBalance";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    getUnsupervised(requestData) {
      const formId = "dbo.p_GetUnsupervised";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    getAccountFreezeTrx(requestData) {
      const formId = "dbo.p_GetAccountFreezeTrx";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    getPendingCharges(requestData) {
      const formId = "dbo.p_GetPendingCharges";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    getODAccountDetail(requestData) {
      const formId = "dbo.p_GetODAccountDetail";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    getAccountOperatedBy(requestData) {
      const formId = "dbo.p_GetAccountOperatedBy";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    getSignatoryTypes(requestData) {
      const formId = "dbo.p_getSignatoryTypes";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },


    addEditChequeBookRequests(requestData) {
      const formId = "dbo.p_AddEditChequeBookRequests";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    /**
     * Get account transactions for statement view
     * @param {Object} requestData - { OurBranchID, AccountID, FromDate, ToDate, OperatorID }
     * @returns {Promise} API response with transaction records
     */
    getAccountTransactions(requestData) {
      const formId = "dbo.p_GetAccountTransactions";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    /**
     * Get client portfolio data
     * @param {Object} requestData - { OurBranchID, ClientID, OperatorID, Base }
     * @returns {Promise} API response with portfolio records
     */
    getClientPortfolio(requestData) {
      const formId = "dbo.p_GetClientPortfolio";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    getLoanRepaymentDetails(requestData) {
      const formId = "dbo.p_SILoanDetailView";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    getDebitInterestWorksheet(requestData) {
      const formId = "dbo.p_GetDebitInterestWorksheet";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },


    getCreditInterestWorksheet(requestData) {
      const formId = "dbo.p_GetCreditInterestWorksheet";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    /**
     * Get account signatories
     * @param {Object} requestData - { OurBranchID, AccountID, OperatorID }
     * @returns {Promise} API response with signatory records
     */
    getAccountSignatories(requestData) {
      const formId = "dbo.p_GetAccountSignatories";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    getSignatoryImage(requestData) {
      const formId = "dbo.p_GetSignatoryImage";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    /**
     * Get account sweeping configuration
     * @param {Object} requestData - { OurBranchID, AccountID, OperatorID }
     * @returns {Promise} API response with sweeping records
     */
    getAccountSweeping(requestData) {
      const formId = "dbo.p_GetAccountSweeping";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    /**
     * Add or edit account sweeping configuration
     * @param {Object} requestData - Sweeping configuration data
     * @returns {Promise} API response
     */
    addEditAccountSweeping(requestData) {
      const formId = "dbo.p_AddEditAccountSweeping";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    /**
     * Add or edit account nominee
     * @param {Object} requestData - Nominee data payload
     * @returns {Promise} API response
     */
    addEditAccountNominee(requestData) {
      const formId = "dbo.p_AddEditAccountNominee";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    /**
     * Get account notes
     * @param {Object} requestData - { OurBranchID, ModuleID, SearchID }
     * @returns {Promise} API response with notes content
     */
    getAccountNotes(requestData) {
      const formId = "dbo.p_GetNotes";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    /**
     * Update account notes
     * @param {Object} requestData - { OurBranchID, ModuleID, Searchkey, Notes, CreatedBy, CreatedOn, ModifiedBy, ModifiedOn, SupervisedBy, SupervisedOn, UpdateCount }
     * @returns {Promise} API response
     */
    updateAccountNotes(requestData) {
      const formId = "dbo.p_UpdateNotes";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    /**
     * Edit account product notifications
     * @param {Object} requestData - { XMLData, OperatorID, ProductID, BranchID, AccountID }
     * @returns {Promise} API response
     */
    editAccountProductNotification(requestData) {
      const formId = "dbo.p_EditAccountProductNotification";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    /**
     * Get account special conditions
     * @param {Object} requestData - { OurBranchID, AccountID, OperatorID }
     * @returns {Promise} API response
     */
    getAccountSpecialConditions(requestData) {
      const formId = "dbo.p_GetAccountSpecialConditions";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    /**
     * Edit account special conditions
     * @param {Object} requestData - { OurBranchID, AccountID, CreatedBy, CreatedOn, ModifiedBy, ModifiedOn, SupervisedBy, SupervisedOn, UpdateCount, DetailRecords }
     * @returns {Promise} API response
     */
    editAccountSpecialConditions(requestData) {
      const formId = "dbo.p_EditAccountSpecialConditions";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    /**
     * Get account closing details
     * @param {Object} requestData - { OurBranchID, AccountID, OperatorID, InsertYN }
     * @returns {Promise} API response
     */
    getAccountClosingDetails(requestData) {
      const formId = "dbo.P_GetAcClosingDetails";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    /**
     * Save account closing details
     * @param {Object} requestData - { OurBranchID, AccountID, CloseReasonID, CloseReason, ClosedBy, UpdateCount, SysTrx, UserTrx }
     * @returns {Promise} API response
     */
    saveAccountClosing(requestData) {
      const formId = "dbo.p_AddAcClosingDetails";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    /**
     * Get batch transaction list details
     * @param {Object} requestData - { OurBranchID, BatchID, ModuleID, TrxDate, TrxRowID }
     * @returns {Promise} API response
     */
    getBatchTrxList(requestData) {
      const formId = "dbo.p_GetBatchTrxList";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    /**
     * Get account reminders
     * @param {Object} requestData - { OurBranchID, AccountID, ReminderID, OperatorID, Direction }
     * @returns {Promise} API response with reminder records
     */
    getAccountReminders(requestData) {
      const formId = "dbo.p_GetAccountReminders";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    /**
     * Save account reminder (create/update)
     * @param {Object} requestData - Reminder data including { OurBranchID, AccountID, ReminderID, Reminder, ColorID, ReminderStartDate, ReminderEndDate, CreatedBy, CreatedOn, ModifiedBy, ModifiedOn, SupervisedBy, NewRecord }
     * @returns {Promise} API response
     */
    saveAccountReminder(requestData) {
      const formId = "dbo.p_AddEditAccountReminders";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    /**
     * Delete account reminder
     * @param {Object} requestData - { OurBranchID, AccountID, ReminderID, NewRecord }
     * @returns {Promise} API response with delete status
     */
    deleteAccountReminders(requestData) {
      const formId = "dbo.p_DeleteAccountReminders";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    /**
     * Get account activation details
     * @param {Object} requestData - { OurBranchID, AccountID, OperatorID }
     * @returns {Promise} API response with account activation data
     */
    getAccountActivation(requestData) {
      const formId = "dbo.p_GetAccountActivation";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    /**
     * Edit account activation data
     * @param {Object} requestData - { OurBranchID, AccountID, ReferenceID, ActivatedDate, ActivatedBy, InstructedBy, Comments, TrxRowID, ModifiedOn, SupervisedBy, NewRecord }
     * @returns {Promise} API response with save status
     */
    editAccountActivation(requestData) {
      const formId = "dbo.p_EditAccountActivation";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    /**
     * Save theme settings/configuration
     * @param {Object} requestData - { ScopeType, ScopeRefID, ThemeName, SettingsJson (pre-stringified), OperatorID }
     * @returns {Promise} API response with save status
     */
    async saveThemeSettings(requestData) {
      const formId = "dbo.p_SaveThemeSettings";
      console.log("=== saveThemeSettings INPUT ===");
      console.log("requestData:", requestData);
      console.log("SettingsJson type:", typeof requestData.SettingsJson);
      console.log("SettingsJson value:", requestData.SettingsJson);

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);

      console.log("=== ENVELOPE CREATED ===");
      console.log("Full envelope:", JSON.stringify(envelope, null, 2));
      console.log("===============================");

      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    /**
     * Get account charge rate details
     * @param {Object} requestData - { OurBranchID, AccountID, ApplicationID, ChargeID, EffectiveDate, EffectiveDateID, OperatorID }
     * @returns {Promise} API response with charge rate data
     */
    getAccountChargeRate(requestData) {
      const formId = "dbo.p_GetAccountChargeRate";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    /**
     * Get effective theme settings for user/branch/bank
     * @param {Object} requestData - { UserID, BranchID, BankID }
     * @returns {Promise} API response with effective theme configuration
     */
    async getEffectiveTheme(requestData) {
      const formId = "dbo.p_GetEffectiveTheme";

      console.log("🎨 [THEME LOAD] Fetching effective theme settings");
      console.log("📊 Request data:", {
        UserID: requestData?.UserID,
        BranchID: requestData?.BranchID,
        BankID: requestData?.BankID
      });

      try {
        const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
        const response = await CoreApi.post(ACCOUNT_ENDPOINT, envelope);

        console.log("✅ [THEME LOAD] Response received");
        console.log("📋 Theme response:", response);

        return response;
      } catch (error) {
        console.error("❌ [THEME LOAD] Failed to fetch theme:", {
          Message: error.message,
          Status: error.status,
          Stack: error.stack
        });

        throw error;
      }
    },

    /**
     * Add or edit account charge rate
     * @param {Object} requestData - { OurBranchID, AccountID, ApplicationID, ChargeID, EffectiveDate, EffectiveDateID, ExpiryDate, OperatorID, XMLData }
     * @returns {Promise} API response
     */
    addEditAccountChargeRate(requestData) {
      const formId = "dbo.p_AddEditAccountChargeRate";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    getIDDescription(requestData) {
      const formId = "dbo.p_GetIDDescription";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },
    // ========================================================================
    // ELECTRONIC CARD OPERATIONS
    // ========================================================================

    /**
     * Get electronic cards by stage (for Edit Card Status module)
     * @param {Object} requestData - { BankID, OurBranchID, StageID, OperatorID }
     * @returns {Promise} API response with electronic card records
     */
    getElectronicCards(requestData) {
      const formId = "dbo.p_GetElectronicCardsStageWise";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    /**
     * Get electronic cards for a specific account (for Card Maintenance within Account Maintenance)
     * @param {Object} requestData - { AccountID }
     * @returns {Promise} API response with electronic card records
     */
    getAccountElectronicCards(requestData) {
      const formId = "dbo.p_GetAccountElectronicCards";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    /**
     * Get next tracking card ID for new electronic card
     * @param {Object} requestData - { BankID, OurBranchID, AccountID }
     * @returns {Promise} API response with next TrackingCardID
     */
    getNextTrackingCardID(requestData) {
      const formId = "dbo.p_GetNextTrackingCardID";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    /**
     * Add or edit electronic card
     * @param {Object} requestData - { TrackingCardID, CardName, CardID, CardProvider, CardType, BranchID, AccountID, Remarks, CreatedBy, CreatedOn, ModifiedBy, ModifiedOn, IsNew, CardBlockReasonID, ReactivationRemarks, IsActive, IsCollected, ActvationDate, CollectionDate, CardBlockDate, StartDate, ExpiryDate, ReactivationDate }
     * @returns {Promise} API response
     */
    addEditElectronicCard(requestData) {
      const formId = "dbo.p_AddEditElectronicCard";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    /**
     * Delete electronic card
     * @param {Object} requestData - { TrackingCardID, BranchID, AccountID }
     * @returns {Promise} API response
     */
    deleteElectronicCard(requestData) {
      const formId = "dbo.p_DeleteElectronicCard";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    /**
     * Edit electronic card status
     * @param {Object} requestData - { BranchID, UpdateCount, DetailRecords (XML) }
     * DetailRecords XML format: <Root><Record><TrackingCardID>...</TrackingCardID><Status>...</Status><UpdateCount>...</UpdateCount></Record></Root>
     * @returns {Promise} API response
     */
    editCardStatus(requestData) {
      const formId = "dbo.p_EditCardStatus";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    }
  };

  // Export as both AccountService and accountservice for compatibility
  global.AccountService = AccountService;
  global.accountservice = AccountService;
})(window);

