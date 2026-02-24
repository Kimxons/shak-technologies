/**
 * Microfinance Service
 * Handles all microfinance-related API operations including:
 * - Exit Types
 * - Other microfinance operations
 */
(function (global) {
  // Check for dependencies
  if (!global.Environment) {
    console.error('❌ MicrofinanceService: Environment not loaded');
    return;
  }
  
  if (!global.CoreApi) {
    console.error('❌ MicrofinanceService: CoreApi not loaded');
    return;
  }
  
  const CoreApi = global.CoreApi;
  const BASE_URL = (global.Environment.baseUrlMicroFinance || "http://localhost:8080").replace(/\/+$/, "");

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  // OldAPI samples commonly show: MM/DD/YYYY HH:mm:ss
  function formatRequestTime(date = new Date()) {
    const mm = pad2(date.getMonth() + 1);
    const dd = pad2(date.getDate());
    const yyyy = String(date.getFullYear());
    const hh = pad2(date.getHours());
    const mi = pad2(date.getMinutes());
    const ss = pad2(date.getSeconds());
    return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
  }
  

  const MicrofinanceService = {
    /**
     * Get Exit Types - Retrieves exit types data
     * @param {Object} requestData - { OurBranchID, BankID, ExitTypeID, OperatorID, Direction }
     * @returns {Promise<Object>} Normalized response with exit types data
     */
    getExitTypes(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetExitTypes", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get Savings Refund Detail - Retrieves savings refund details for a client
     * @param {Object} requestData - { OurBranchID, ClientID, OperatorID }
     * @returns {Promise<Object>} Normalized response with savings refund detail data
     */
    getSavingsRefundDetail(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetSavingsRefundDetail", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get Group Attendance - Retrieves group attendance data for a specific meeting
     * Uses p_GetTrxGroupMinDetail which returns group/center members
     * @param {Object} requestData - { OurBranchID, GroupID, MeetingDate, OperatorID }
     * @returns {Promise<Object>} Normalized response with group attendance data
     */
    getGroupAttendance(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetGroupAttendance", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Validate Officer ID (server-side)
     * Calls dbo.p_GetIDDescription
     * @param {Object} requestData - { OurBranchID, ControlTypeID, ID, BankID, TypeID, AdvanceFilter, LanguageID }
     * @returns {Promise<Object>} Normalized response
     */
    validateOfficerID(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetIDDescription", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Validate Center/Group ID (server-side)
     * Calls dbo.p_GetIDDescription with ControlTypeID: "GroupID"
     * @param {Object} requestData - { OurBranchID, ControlTypeID, ID, BankID, TypeID, AdvanceFilter, LanguageID }
     * @returns {Promise<Object>} Normalized response
     */
    validateCenter(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetIDDescription", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Validate Center ID (server-side)
     * Calls dbo.p_GetIDDescription using explicit envelope shape
     * (kept for modules that require RequestID/FormId/AppName casing)
     * @param {Object} requestData - { OurBranchID, ControlTypeID, ID, BankID, TypeID, AdvanceFilter, LanguageID }
     * @returns {Promise<Object>} Normalized response
     */
    validateCenterID(requestData) {
      const PROC = 'dbo.p_GetIDDescription';

      const envelope = {
        RequestID: PROC,
        FormId: PROC,
        RequestData: requestData || {},
        RequestTime: formatRequestTime(new Date()),
        AppName: 'PROJECT_KAIRO',
        Checksum: ''
      };

      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Validate Group/SubGroup ID (server-side)
     * Calls dbo.p_GetIDDescription using explicit envelope shape
     * @param {Object} requestData - { OurBranchID, ControlTypeID, ID, BankID, TypeID, AdvanceFilter, LanguageID }
     * @returns {Promise<Object>} Normalized response
     */
    validateGroupID(requestData) {
      const PROC = 'dbo.p_GetIDDescription';

      const envelope = {
        RequestID: PROC,
        FormId: PROC,
        RequestData: requestData || {},
        RequestTime: formatRequestTime(new Date()),
        AppName: 'PROJECT_KAIRO',
        Checksum: ''
      };

      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Validate Branch ID (server-side)
     * Calls dbo.p_GetIDDescription using explicit envelope shape
     * @param {Object} requestData - { OurBranchID, ControlTypeID, ID, BankID, TypeID, AdvanceFilter, LanguageID }
     * @returns {Promise<Object>} Normalized response
     */
    validateBranchID(requestData) {
      const PROC = 'dbo.p_GetIDDescription';

      const envelope = {
        RequestID: PROC,
        FormId: PROC,
        RequestData: requestData || {},
        RequestTime: formatRequestTime(new Date()),
        AppName: 'PROJECT_KAIRO',
        Checksum: ''
      };

      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Validate Exit Process Group Client (server-side)
     * Calls dbo.p_GetIDDescription using explicit envelope shape
     * ControlTypeID typically: "GroupClientActiveID"
     * @param {Object} requestData - { OurBranchID, ControlTypeID, ID, BankID, TypeID, AdvanceFilter, LanguageID }
     * @returns {Promise<Object>} Normalized response
     */
    validateExitGroupClient(requestData) {
      const PROC = 'dbo.p_GetIDDescription';

      const envelope = {
        RequestID: PROC,
        FormId: PROC,
        RequestData: requestData || {},
        RequestTime: formatRequestTime(new Date()),
        AppName: 'PROJECT_KAIRO',
        Checksum: ''
      };

      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Save Group Member Attendance
     * Calls dbo.p_AddEditGroupAttendance
     * @param {Object} requestData - { OurBranchID, GroupID, MeetingDate, OfficerID, MeetingPlace, Remarks, AttendanceDetails, OperatedBy, UpdateCount }
     * @returns {Promise<Object>} Normalized response
     */
    saveGroupMemberAttendance(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddEditGroupAttendance", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Remove/Delete Center Meeting Attendance
     * Calls dbo.p_DeleteGroupAttendance
     * @param {Object} requestData - { OurBranchID, GroupID, MeetingDate, UpdateCount }
     * @returns {Promise<Object>} Normalized response
     */
    removeCenterMeeting(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteGroupAttendance", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Search System Branches
     * Calls dbo.pc_SearchSystemBranches
     * @param {Object} requestData - { BankID }
     * @returns {Promise<Object>} Normalized response with branch list
     * Response structure: { Details: [{ OurBranchID, BranchName }, ...] }
     */
    searchSystemBranches(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.pc_SearchSystemBranches", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * View Center Loan / Disbursement Reversal
     * Calls dbo.p_GetGroupLoanReversals
     * @param {Object} requestData - { OurBranchID, GroupID, LoanSchemeID, OperatorID }
     * @returns {Promise<Object>} Normalized response
     */
    viewCenterLoanDisbursementReversal(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetGroupLoanReversals", requestData);
      // Match sample RequestTime format
      envelope.RequestTime = formatRequestTime(new Date());
      // Match requested AppName
      envelope.AppName = "PROJECT_KAIRO";
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Save Center Loan / Disbursement Reversal
     * Calls dbo.p_AddLoanReversalTrx
     * @param {Object} requestData - { OurBranchID, GroupID, LoanSchemeID, LoanRevAppList, LoanReversalReasonID, Remarks, OperatorID, ModuleID }
     * @returns {Promise<Object>} Normalized response
     */
    saveCenterLoanDisburseReversal(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddLoanReversalTrx", requestData);
      envelope.RequestTime = formatRequestTime(new Date());
      envelope.AppName = "PROJECT_KAIRO";
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    }
    ,

    /**
     * Get Client Exit Details
     * Calls dbo.p_GetClientExitDetails
     * @param {Object} requestData - { OurBranchID, GroupID, SubGroupID, ClientID, ExitTypeID, OperatorID }
     * @returns {Promise<Object>} OldAPI response
     */
    getClientExitDetails(requestData) {
      const PROC = 'dbo.p_GetClientExitDetails';

      // Build envelope explicitly to match required casing and sample payloads.
      const envelope = {
        RequestID: PROC,
        FormId: PROC,
        RequestData: requestData || {},
        RequestTime: formatRequestTime(new Date()),
        AppName: 'PROJECT_KAIRO',
        Checksum: ''
      };

      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    }
    ,

    /**
     * Get Exit Transactions
     * Calls dbo.p_GetExitTrx
     * @param {Object} requestData - { OurBranchID, GroupID, SubGroupID, ClientID, RefID, ExitTypeID, ForfeitSavingsAmount, ForfeitCollateralsAmount, SecondaryCollateral, AdditionalCollateral, CreditInterest, TaxOnCreditInterest, DebitInterest, NetPayable, ChargeOffLossAmount, ChargeOffInsuranceAmount }
     * @returns {Promise<Object>} OldAPI response
     */
    getExitTrx(requestData) {
      const PROC = 'dbo.p_GetExitTrx';

      const envelope = {
        RequestID: PROC,
        FormId: PROC,
        RequestData: requestData || {},
        RequestTime: formatRequestTime(new Date()),
        AppName: 'PROJECT_KAIRO',
        Checksum: ''
      };

      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    }
  };

  global.MicrofinanceService = MicrofinanceService;

  console.log('✅ MicrofinanceService loaded');
})(window);
