(function (global) {
  const CoreApi = global.CoreApi;
  const BASE_URL = (Environment.baseUrlCommon || "http://localhost:3306").replace(/\/+$/, "");

  /**
   * Overdraft State Manager
   * Stores and shares common parameters across all overdraft sub-modules
   */
  const OverdraftState = {
    // Current application context
    context: {
      OurBranchID: "",
      AccountID: "",
      ApplicationID: "",
      OperatorID: "web_portal",
      ModuleID: null,
      Direction: 1
    },

    /**
     * Set the current overdraft application context
     * @param {Object} params - Application parameters
     */
    setContext(params) {
      this.context = { ...this.context, ...params };
      console.log("Overdraft context set:", this.context);
    },

    /**
     * Get the current context
     * @returns {Object} Current application context
     */
    getContext() {
      return { ...this.context };
    },

    /**
     * Clear the context
     */
    clearContext() {
      this.context = {
        OurBranchID: "",
        AccountID: "",
        ApplicationID: "",
        OperatorID: "web_portal",
        ModuleID: null,
        Direction: 1
      };
      console.log("Overdraft context cleared");
    },

    /**
     * Merge context with additional parameters
     * @param {Object} additionalParams - Additional parameters to merge
     * @returns {Object} Merged parameters
     */
    mergeParams(additionalParams = {}) {
      return { ...this.context, ...additionalParams };
    },

    /**
     * Check if context is set (has required fields)
     * @returns {boolean} True if context has AccountID and ApplicationID
     */
    isContextSet() {
      return !!(this.context.AccountID && this.context.ApplicationID);
    }
  };

  const OverdraftService = {
    // Expose the state manager
    State: OverdraftState,

    /**
     * Set the current overdraft application context
     * @param {Object} params - Application parameters (OurBranchID, AccountID, ApplicationID, OperatorID)
     */
    setContext(params) {
      OverdraftState.setContext(params);
    },

    /**
     * Get the current context
     * @returns {Object} Current application context
     */
    getContext() {
      return OverdraftState.getContext();
    },

    /**
     * Clear the context
     */
    clearContext() {
      OverdraftState.clearContext();
    },

    /**
     * Fetch overdraft application data from backend
     * @param {Object} requestData - { OurBranchID, AccountID, ApplicationID, OperatorID, Direction }
     *                               If omitted, uses current context from State
     * @returns {Promise<Object>} Normalized response
     */
    getOverdraftApplication(requestData = {}) {
      const params = OverdraftState.mergeParams(requestData);
      // Remove ModuleID as it's not a parameter for p_GetOverDraftApplication
      const { ModuleID, ...cleanParams } = params;
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetOverDraftApplication", cleanParams);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Fetch overdraft application interest rate data from backend
     * @param {Object} requestData - { TrxTypeID, EffectiveDate, RefNo, ... }
     *                               Common params (AccountID, ApplicationID) auto-merged from context
     * @returns {Promise<Object>} Normalized response
     */
    getODApplicationInterestRate(requestData = {}) {
      const params = OverdraftState.mergeParams(requestData);
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetODApplicationInterestRate", params);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Fetch overdraft application guarantors data from backend
     * @param {Object} requestData - { GuarantorID, ModuleID, ... }
     *                               Common params (AccountID, ApplicationID) auto-merged from context
     * @returns {Promise<Object>} Normalized response
     */
    getODApplicationGuarantors(requestData = {}) {
      const params = OverdraftState.mergeParams(requestData);
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetODApplicationGuarantors", params);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get overdraft application documents
     * @param {Object} requestData - { DocumentID, ... }
     *                               Common params (AccountID, ApplicationID) auto-merged from context
     * @returns {Promise<Object>} Normalized response with success, code, message, and data
     * Response data structure: { Details, Details01, Details02, Details03 }
     * Details02 contains the main document records
     */
    getApplicationDocuments(requestData = {}) {
      const params = OverdraftState.mergeParams(requestData);
      // Remove ModuleID as it's not a parameter for p_GetODApplicationDocuments
      const { ModuleID, ...cleanParams } = params;
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetODApplicationDocuments", cleanParams);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Parse the response from getApplicationDocuments to extract document details
     * @param {Object} response - The API response
     * @returns {Object} Parsed document data with Details02 as primary documents
     */
    parseDocumentResponse(response) {
      if (!response.success || !response.data) {
        return {
          documents: [],
          details: [],
          details01: [],
          details03: []
        };
      }

      return {
        documents: response.data.Details02 || [],
        details: response.data.Details || [],
        details01: response.data.Details01 || [],
        details03: response.data.Details03 || []
      };
    },

    /**
     * Open guarantor modal with ClientID from parent form
     * @param {string} clientId - ClientID from parent form (will be passed as GuarantorID)
     * @param {string} modalId - ID of the guarantor modal to open
     * @param {Function} callback - Optional callback after data is loaded
     */
    async openGuarantorModal(clientId, modalId = "guarantorModal", callback = null) {
      try {
        // Fetch guarantor data using ClientID as GuarantorID
        const result = await this.getODApplicationGuarantors({
          GuarantorID: clientId,
          ModuleID: 1000
        });

        if (result.success) {
          // Populate modal with guarantor data
          this.populateGuarantorModal(result.data, clientId);
          
          // Open the modal
          const modal = document.getElementById(modalId);
          if (modal) {
            modal.classList.remove("hidden");
            document.body.style.overflow = 'hidden';
          }

          // Execute callback if provided
          if (callback && typeof callback === "function") {
            callback(result.data);
          }

          return result;
        } else {
          console.error("Failed to load guarantor data:", result.message);
          alert(`Error: ${result.message}`);
          return result;
        }
      } catch (error) {
        console.error("Error opening guarantor modal:", error);
        alert("An error occurred while loading guarantor data");
        throw error;
      }
    },

    /**
     * Populate guarantor modal fields with data
     * @param {Object} data - Guarantor data from API
     * @param {string} clientId - ClientID to display as GuarantorID
     */
    populateGuarantorModal(data, clientId) {
      // Set GuarantorID field (with Modal suffix for the modal form)
      const guarantorIdField = document.getElementById("guarantorIdModal");
      if (guarantorIdField) {
        guarantorIdField.value = clientId;
        // Make it readonly since it comes from parent
        guarantorIdField.setAttribute("readonly", true);
      }

      // Get context for other fields
      const context = OverdraftState.getContext();
      
      // Populate hidden context fields from parent form/state
      const contextFields = {
        guarantorBranchIdModal: context.OurBranchID,
        guarantorAccountIdModal: context.AccountID,
        guarantorApplicationIdModal: context.ApplicationID,
        guarantorOperatorIdModal: context.OperatorID
      };

      Object.keys(contextFields).forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
          field.value = contextFields[fieldId] || "";
        }
      });

      // Populate the guarantor table with list from Details01
      if (data && data.Details01 && data.Details01.length > 0) {
        this.populateGuarantorTable(data.Details01);
        
        // Populate main guarantor fields from first record in Details01
        const guarantorInfo = data.Details01[0];
        this.populateGuarantorMainFields(guarantorInfo);
      }

      // Populate Behind The Scene (audit) fields from Details02
      if (data && data.Details02 && data.Details02.length > 0) {
        const guarantorAudit = data.Details02[0];
        this.populateGuarantorAuditFields(guarantorAudit);
      }
    },

    /**
     * Populate the guarantor table with guarantor list
     * @param {Array} guarantorList - Array of guarantor objects from Details01
     */
    populateGuarantorTable(guarantorList) {
      const tableBody = document.querySelector('#guarantorTableModal tbody');
      if (!tableBody) return;

      // Clear existing rows
      tableBody.innerHTML = '';

      if (!guarantorList || guarantorList.length === 0) {
        tableBody.innerHTML = `
          <tr class="empty-row">
            <td colspan="5">No guarantor records found.</td>
          </tr>
        `;
        return;
      }

      // Populate table with guarantor data
      guarantorList.forEach(guarantor => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${guarantor.GuarantorRelevantID || ''}</td>
          <td>${guarantor.GuarantorTypeID || ''}</td>
          <td>${guarantor.MaxGuaranteeAmount ? guarantor.MaxGuaranteeAmount.toLocaleString() : '0'}</td>
          <td>${guarantor.NoOfLoansAlreadyGuaranted || 0} / ${guarantor.MaxNoOfLoans || 0}</td>
          <td>${guarantor.GuaranteeSignedBy || ''}</td>
        `;
        row.style.cursor = 'pointer';
        tableBody.appendChild(row);
      });
    },

    /**
     * Populate main guarantor form fields from Details01
     * @param {Object} guarantorInfo - Guarantor info object from Details01
     */
    populateGuarantorMainFields(guarantorInfo) {
      const fieldMapping = {
        guaranteeAmountModal: guarantorInfo.MaxGuaranteeAmount,
        signedByModal: guarantorInfo.GuaranteeSignedBy,
        maxGuaranteeAmountModal: guarantorInfo.MaxGuaranteeAmount,
        maxLoansNumberModal: guarantorInfo.MaxNoOfLoans,
        loansGuaranteedModal: guarantorInfo.NoOfLoansAlreadyGuaranted,
        liabilityModal: guarantorInfo.Liability,
        netWorthModal: guarantorInfo.NetWorth
      };

      Object.keys(fieldMapping).forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field && fieldMapping[fieldId] !== undefined && fieldMapping[fieldId] !== null) {
          field.value = fieldMapping[fieldId] || "";
        }
      });
    },

    /**
     * Populate Behind The Scene (audit) fields from Details02
     * @param {Object} guarantorAudit - Guarantor audit data from Details02
     */
    populateGuarantorAuditFields(guarantorAudit) {
      const auditFieldMapping = {
        guarantorRemarksModal: guarantorAudit.Remarks,
        guarantorCreatedByModal: guarantorAudit.CreatedBy,
        guarantorCreatedOnModal: guarantorAudit.CreatedOn,
        guarantorModifiedByModal: guarantorAudit.ModifiedBy,
        guarantorModifiedOnModal: guarantorAudit.ModifiedOn,
        guarantorSupervisedByModal: guarantorAudit.SupervisedBy,
        guarantorSupervisedOnModal: guarantorAudit.SupervisedOn
      };

      Object.keys(auditFieldMapping).forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field && auditFieldMapping[fieldId] !== undefined && auditFieldMapping[fieldId] !== null) {
          field.value = auditFieldMapping[fieldId] || "";
        }
      });
    },

    /**
     * Close guarantor modal and optionally refresh parent data
     * @param {string} modalId - ID of the modal to close
     * @param {boolean} refreshParent - Whether to refresh parent form data
     */
    closeGuarantorModal(modalId = "guarantorModal", refreshParent = false) {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.style.display = "none";
        modal.classList.remove("show");
      }

      if (refreshParent && typeof window.refreshParentData === "function") {
        window.refreshParentData();
      }
    },

    /**
     * Open documents modal and load document data
     * @param {string} documentId - Optional DocumentID to load specific document
     * @param {string} modalId - ID of the documents modal to open
     * @param {Function} callback - Optional callback after data is loaded
     */
    async openDocumentsModal(documentId = "", modalId = "documentsModal", callback = null) {
      try {
        console.log('OverdraftService.openDocumentsModal called with:', { documentId, modalId });
        console.log('Current context:', OverdraftState.getContext());
        
        // Fetch documents data
        const result = await this.getApplicationDocuments({
          DocumentID: documentId || ""
        });

        console.log('getApplicationDocuments result:', result);

        if (result.success) {
          // Parse and populate modal with documents data
          const parsedData = this.parseDocumentResponse(result);
          console.log('Parsed document data:', parsedData);
          
          this.populateDocumentsModal(parsedData, documentId);
          
          // Open the modal
          const modal = document.getElementById(modalId);
          if (modal) {
            modal.classList.remove("hidden");
            document.body.style.overflow = 'hidden';
          }

          // Execute callback if provided
          if (callback && typeof callback === "function") {
            callback(parsedData);
          }

          return result;
        } else {
          console.error("Failed to load documents data:", result.message);
          alert(`Error: ${result.message}`);
          return result;
        }
      } catch (error) {
        console.error("Error opening documents modal:", error);
        console.error("Error stack:", error.stack);
        alert(`An error occurred while loading documents data\n\nDetails: ${error.message}`);
        throw error;
      }
    },

    /**
     * Populate documents modal fields and table with data
     * @param {Object} parsedData - Parsed documents data from parseDocumentResponse
     * @param {string} documentId - DocumentID if viewing specific document
     */
    populateDocumentsModal(parsedData, documentId = "") {
      // Populate the documents table
      this.populateDocumentsTable(parsedData.documents);

      // Populate the form fields with the first document if available
      if (parsedData.documents.length > 0) {
        const document = parsedData.documents[0];
        this.populateDocumentFields(document);
      }
    },

    /**
     * Populate the documents table with document records
     * @param {Array} documents - Array of document objects
     */
    populateDocumentsTable(documents) {
      const tableBody = document.querySelector("#documentsTable tbody");
      if (!tableBody) return;

      // Clear existing rows
      tableBody.innerHTML = "";

      if (!documents || documents.length === 0) {
        tableBody.innerHTML = `
          <tr class="empty-row">
            <td colspan="5">No document records found.</td>
          </tr>
        `;
        return;
      }

      // Populate table with document data
      documents.forEach(doc => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${doc.DocumentID || ""}</td>
          <td>${doc.DocumentTypeID || ""}</td>
          <td>${doc.DocumentClassID || ""}</td>
          <td>${doc.ReceivedDate || ""}</td>
          <td>${doc.LocationID || ""}</td>
        `;
        tableBody.appendChild(row);
      });
    },

    /**
     * Populate individual document form fields
     * @param {Object} docData - Document data object
     */
    populateDocumentFields(docData) {
      const fieldMapping = {
        documentId: docData.DocumentID,
        documentType: docData.DocumentTypeID,
        documentClass: docData.DocumentClassID,
        receivedBy: docData.ReceivedBy,
        location: docData.LocationID,
        documentImage: docData.ImageID,
        documentRemarks: docData.Remarks || docData.Description,
        docCreatedBy: docData.CreatedBy,
        docCreatedOn: docData.CreatedOn,
        docModifiedBy: docData.ModifiedBy,
        docModifiedOn: docData.ModifiedOn,
        docSupervisedBy: docData.SupervisedBy,
        docSupervisedOn: docData.SupervisedOn
      };

      Object.keys(fieldMapping).forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field && fieldMapping[fieldId] !== undefined && fieldMapping[fieldId] !== null) {
          field.value = fieldMapping[fieldId] || "";
        }
      });

      // Handle receivedDate separately since it might be a date string from API
      // but the HTML field is a select dropdown
      const receivedDateField = document.getElementById('receivedDate');
      if (receivedDateField && docData.ReceivedDate) {
        // If it's an input field, set the date value directly
        if (receivedDateField.tagName === 'INPUT') {
          receivedDateField.value = docData.ReceivedDate;
        } else if (receivedDateField.tagName === 'SELECT') {
          // For select dropdown, we'll set to custom or add the date as display
          receivedDateField.value = 'custom';
        }
      }
    },

    /**
     * Close documents modal and optionally refresh parent data
     * @param {string} modalId - ID of the modal to close
     * @param {boolean} refreshParent - Whether to refresh parent form data
     */
    closeDocumentsModal(modalId = "documentsModal", refreshParent = false) {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.style.display = "none";
        modal.classList.remove("show");
        modal.classList.add("hidden");
        document.body.style.overflow = '';
      }

      if (refreshParent && typeof window.refreshParentData === "function") {
        window.refreshParentData();
      }
    }
  };

  global.OverdraftService = OverdraftService;
})(window);
