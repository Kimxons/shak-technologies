(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  const BASE_URL = (Environment.baseUrlAccount || Environment.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "");
  const ACCOUNT_ENDPOINT = `${BASE_URL}/api/OldAPI`;

  console.log('[AccountNotificationService] Loaded, endpoint:', ACCOUNT_ENDPOINT);

  const AccountNotificationService = {
    /**
     * Get product notification details for an account
     * @param {Object} requestData - { ProductID, ModuleID, AccountID }
     * @returns {Promise} API response with notification records
     */
    async getProductNotificationDetails(requestData) {
      const formId = "dbo.p_GetProductNotificationDetails";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, "PROJECT_KAIRO");
      console.log('[AccountNotificationService] getProductNotificationDetails envelope:', JSON.stringify(envelope, null, 2));
      
      const response = await CoreApi.post(ACCOUNT_ENDPOINT, envelope);
      console.log('[AccountNotificationService] getProductNotificationDetails response:', response);
      console.log('[AccountNotificationService] Raw response stringified:', JSON.stringify(response, null, 2));
      return response;
    },

    /**
     * Save/update account notification settings
     * @param {Object} requestData - { notifications: Array, ProductID, AccountID, OperatorID, BranchID }
     * @returns {Promise} API response
     */
    async saveNotificationSettings(requestData) {
      const formId = "dbo.p_EditAccountProductNotification";
      
      // Build XML from notifications array
      const xmlData = this.buildNotificationXml(requestData.notifications);
      
      // Get OperatorID and BranchID from session if not provided
      let operatorId = requestData.OperatorID || 'CSADM';
      let branchId = requestData.BranchID || '0101';
      try {
        const session = global.AuthService?.getSession?.();
        if (session) {
          operatorId = session.operatorId || operatorId;
          branchId = session.branchId || branchId;
        }
      } catch (e) {
        console.warn('[AccountNotificationService] Could not get session:', e);
      }
      
      const envelope = CoreApi.makeRequestEnvelope(formId, {
        XMLData: xmlData,
        OperatorID: operatorId,
        ProductID: requestData.ProductID || 'null',
        BranchID: branchId,
        AccountID: requestData.AccountID || 'null'
      }, "PROJECT_KAIRO");
      
      console.log('[AccountNotificationService] saveNotificationSettings envelope:', JSON.stringify(envelope, null, 2));
      const response = await CoreApi.post(ACCOUNT_ENDPOINT, envelope);
      console.log('[AccountNotificationService] saveNotificationSettings response:', response);
      return response;
    },

    /**
     * Build XML string from notification data
     * @param {Array} notifications - Array of notification objects
     * @returns {string} XML string
     */
    buildNotificationXml(notifications) {
      if (!notifications || notifications.length === 0) return '';
      
      return notifications.map(n => {
        return `<dt_NotificationFormat>` +
          `<NotificationID>${n.NotificationID || ''}</NotificationID>` +
          `<NotificationType>${n.NotificationType || ''}</NotificationType>` +
          `<NotificationMessage>${this.escapeXml(n.NotificationMessage || '')}</NotificationMessage>` +
          `<IsSelected>${n.IsSelected ? 1 : 0}</IsSelected>` +
          `<IsEditable>${n.IsEditable ? 1 : 0}</IsEditable>` +
          `<ProductLevel>${n.ProductLevel ? 1 : 0}</ProductLevel>` +
          `<NotificationFrequency>${n.NotificationFrequency || ''}</NotificationFrequency>` +
          `<NotificationDuration>${n.NotificationDuration || ''}</NotificationDuration>` +
          `<ExecutionDate>${n.ExecutionDate || ''}</ExecutionDate>` +
          `<ButtonMark>${n.ButtonMark || 'A'}</ButtonMark>` +
          `</dt_NotificationFormat>`;
      }).join('');
    },

    /**
     * Escape special XML characters
     * @param {string} str - String to escape
     * @returns {string} Escaped string
     */
    escapeXml(str) {
      if (!str) return '';
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    }
  };

  global.AccountNotificationService = AccountNotificationService;
  console.log('[AccountNotificationService] Registered on window:', !!global.AccountNotificationService);
})(window);
