/**
 * Rule Details Data Entry Module
 * Handles CRUD operations for Accounting Rule Details
 */
(() => {
  if (window.__kairoRuleDetailsLoaded) return;
  window.__kairoRuleDetailsLoaded = true;

  console.log("[RuleDetails] Script loaded");

  // ============================================
  // CONSTANTS
  // ============================================
  const MODES = {
    VIEW: "View",
    ADD: "Add",
    UPDATE: "Update",
  };

  // ============================================
  // STATE
  // ============================================
  const state = {
    mode: MODES.VIEW,
    currentRecord: null,
    selectedRowIndex: -1,
    hasLoadedRecord: false,
    hasAttemptedView: false,
    editModeActive: false, // true when Edit button clicked - enables New/Alter/Remove
    saveOrigin: null, // 'edit' or 'add' - tracks which flow initiated the save
    parentData: null,
    // Dropdown data
    events: [],
    components: [],
    accountTags: [],
    // Grid data
    ruleDetails: [],
  };

  // ============================================
  // HELPERS
  // ============================================
  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function getFieldValue(fieldId) {
    const field = qs(`#${fieldId}`);
    if (!field) return "";
    if (field.type === "checkbox") return field.checked;
    return (field.value || "").trim();
  }

  function setFieldValue(fieldId, value) {
    const field = qs(`#${fieldId}`);
    if (!field) {
      console.log(`[RuleDetails] Field not found: ${fieldId}`);
      return;
    }
    
    // Handle span elements (for display-only fields like audit info)
    if (field.tagName === "SPAN") {
      field.textContent = value == null ? "" : String(value);
      console.log(`[RuleDetails] Set SPAN#${fieldId} to: "${value}"`);
    } else if (field.type === "checkbox") {
      field.checked = value === true || value === 1 || value === "1" || value === "Y";
      console.log(`[RuleDetails] Set CHECKBOX#${fieldId} to: ${field.checked}`);
    } else {
      field.value = value == null ? "" : String(value);
      console.log(`[RuleDetails] Set ${field.tagName}#${fieldId} value to: "${field.value}"`);
    }
  }

  function showLoading(show = true) {
    const overlay = qs("#loadingOverlay");
    if (overlay) {
      overlay.hidden = !show;
    }
  }

  function showMessage(message, variant = "info") {
    // Use the improved kairo-toast system (same as fixed-asset-type.js)
    // Try to get container from document first
    let container = document.querySelector('.kairo-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'kairo-toast-container';
      // Add inline styles as fallback to ensure visibility
      container.style.cssText = `
        position: fixed;
        top: 14px;
        right: 14px;
        z-index: 99999;
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-width: min(420px, calc(100vw - 28px));
      `;
      document.body.appendChild(container);
    }
    
    // Remove any existing toasts - only show one at a time
    container.querySelectorAll('.kairo-toast').forEach(existingToast => {
      existingToast.classList.remove('is-show');
      setTimeout(() => existingToast.remove(), 200);
    });
    
    // Map "error" to "danger" for consistency
    const normalizedVariant = variant === 'error' ? 'danger' : variant;
    
    const variantClass = normalizedVariant === 'danger' || normalizedVariant === 'warning' ? 'kairo-toast--danger' 
                       : normalizedVariant === 'success' ? 'kairo-toast--success' 
                       : '';
    
    const titleText = normalizedVariant === 'danger' ? 'Error' 
                    : normalizedVariant === 'warning' ? 'Warning' 
                    : normalizedVariant === 'success' ? 'Success' 
                    : 'Info';
    
    // Set colors based on variant
    const borderColor = normalizedVariant === 'danger' || normalizedVariant === 'warning' ? '#E74C3C' 
                      : normalizedVariant === 'success' ? '#1F8A5B' 
                      : '#4A90E2';
    const textColor = normalizedVariant === 'danger' || normalizedVariant === 'warning' ? '#E74C3C' 
                    : normalizedVariant === 'success' ? '#1F8A5B' 
                    : '#2C3E50';
    
    const toast = document.createElement('div');
    toast.className = `kairo-toast ${variantClass}`;
    // Add inline styles as fallback
    toast.style.cssText = `
      background: rgba(255, 255, 255, 0.98);
      border: 1px solid #DDE6ED;
      border-left: 4px solid ${borderColor};
      border-radius: 10px;
      box-shadow: 0 14px 28px rgba(44, 62, 80, 0.25);
      padding: 12px 14px;
      color: ${textColor};
      opacity: 1;
      min-width: 280px;
    `;
    toast.innerHTML = `
      <div class="kairo-toast__title" style="display: flex; align-items: center; justify-content: space-between; font-weight: 700; margin-bottom: 6px; color: ${textColor};">
        <span>${titleText}</span>
        <button class="kairo-toast__close" type="button" style="width: 26px; height: 26px; border-radius: 8px; border: 1px solid #DDE6ED; background: rgba(255,255,255,0.6); cursor: pointer;">&times;</button>
      </div>
      <div class="kairo-toast__body" style="color: ${textColor}; line-height: 1.35;">${message}</div>
    `;
    
    container.appendChild(toast);
    
    // Close button
    toast.querySelector('.kairo-toast__close')?.addEventListener('click', () => {
      toast.remove();
    });
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 5000);
    
    console.log(`[RuleDetails] Toast (${variant}): ${message}`);
  }

  function clearFormFields() {
    setFieldValue("Event", "");
    setFieldValue("Component", "");
    setFieldValue("DebitAccountTag", "");
    setFieldValue("CreditAccountTag", "");
    setFieldValue("Narration", "");
    qs("#ComponentDetails").textContent = "Component details will appear here";
  }

  function clearRuleDetailFields() {
    // Clear only the rule detail fields, NOT the Event field
    setFieldValue("Component", "");
    setFieldValue("DebitAccountTag", "");
    setFieldValue("CreditAccountTag", "");
    setFieldValue("Narration", "");
    qs("#ComponentDetails").textContent = "Component details will appear here";
  }

  function setFormFieldsEnabled(enabled) {
    // Enable/disable rule detail fields
    const fields = ["Component", "DebitAccountTag", "CreditAccountTag", "Narration"];
    fields.forEach((id) => {
      const field = qs(`#${id}`);
      if (field) field.disabled = !enabled;
    });

    // When in ADD mode, freeze Event and ProductTypes (the filter fields)
    if (state.mode === MODES.ADD) {
      const eventField = qs("#Event");
      const productTypesField = qs("#ProductTypes");
      if (eventField) {
        eventField.disabled = true;
        console.log("[RuleDetails] Event field frozen in ADD mode");
      }
      if (productTypesField) {
        productTypesField.disabled = true;
        console.log("[RuleDetails] ProductTypes field frozen in ADD mode");
      }
    }

    // Inline button states are managed by updateInlineButtons()
  }

  // ============================================
  // API CALLS - Using ProductLgLcService
  // ============================================
  async function callApi(formId, requestData) {
    try {
      // Use ProductLgLcService for API calls
      if (formId === "dbo.p_GetProductAcRuleDetail") {
        console.log("[RuleDetails] Calling ProductLgLcService.getProductAcRuleDetail");
        const response = await ProductLgLcService.getProductAcRuleDetail(requestData);
        
        console.log("[RuleDetails] Raw response from service:", response);
        
        // Handle response - CoreApi returns normalized response with 'success' and 'code' fields
        if (response?.success === true || response?.code === "00" || response?.ResponseCode === "00" || response?.responseCode === "00") {
          // The response.data field contains the raw API response
          // Details01 contains the actual records, Details contains metadata
          let data = [];
          
          if (response?.data?.Details01 && Array.isArray(response.data.Details01) && response.data.Details01.length > 0) {
            // Primary: Look for Details01 array (actual detail records)
            data = response.data.Details01;
            console.log("[RuleDetails] Extracted Details01 from response.data.Details01:", data);
          } else if (response?.Details01 && Array.isArray(response.Details01) && response.Details01.length > 0) {
            // Secondary: Details01 directly on response
            data = response.Details01;
            console.log("[RuleDetails] Extracted Details01 from response.Details01:", data);
          } else if (response?.data && Array.isArray(response.data) && response.data.length > 0) {
            // Fallback: data is already the array
            data = response.data;
            console.log("[RuleDetails] Using response.data directly:", data);
          } else {
            // No detail records found - this is expected when event has no records yet
            console.log("[RuleDetails] No detail records found in response (Details01 is empty)");
            data = [];
          }
          
          return {
            success: true,
            data: data || [],
          };
        }
        
        return {
          success: false,
          message: response?.message || response?.ResponseMessage || response?.responseMessage || "API call failed",
          data: null,
        };
      }

      // Handle dbo.p_GetProductAcRuleTrx API call
      if (formId === "dbo.p_GetProductAcRuleTrx") {
        console.log("[RuleDetails] Calling ProductLgLcService.getProductAcRuleTrx with requestData:", requestData);
        const response = await ProductLgLcService.getProductAcRuleTrx(requestData);
        
        console.log("[RuleDetails] TrxIds response from service:", response);
        
        // Handle response - extract the appropriate data structure
        if (response?.success === true || response?.code === "00" || response?.ResponseCode === "00" || response?.responseCode === "00") {
          let data = [];
          
          // Try different possible response structures for transaction data
          if (response?.data?.Details02) {
            data = response.data.Details02;
            console.log("[RuleDetails] Extracted Details02 (TrxIds):", data);
          } else if (response?.Details02) {
            data = response.Details02;
            console.log("[RuleDetails] Extracted Details02 from response:", data);
          } else if (response?.data?.Details) {
            data = response.data.Details;
            console.log("[RuleDetails] Extracted Details from response.data:", data);
          } else if (response?.Details) {
            data = response.Details;
            console.log("[RuleDetails] Extracted Details from response:", data);
          } else if (response?.data && Array.isArray(response.data)) {
            data = response.data;
            console.log("[RuleDetails] Using response.data directly:", data);
          }
          
          return {
            success: true,
            data: data || [],
          };
        }
        
        return {
          success: false,
          message: response?.message || response?.ResponseMessage || response?.responseMessage || "Failed to fetch transaction IDs",
          data: null,
        };
      }

      // Handle dbo.p_GetSystemComponentDetails API call
      if (formId === "dbo.p_GetSystemComponentDetails") {
        console.log("[RuleDetails] Calling dbo.p_GetSystemComponentDetails with requestData:", requestData);
        
        // Try using ProductLgLcService if available (check both local and window scope)
        let response;
        const service = window.ProductLgLcService || ProductLgLcService;
        if (service && typeof service.getSystemComponentDetails === "function") {
          console.log("[RuleDetails] Using ProductLgLcService.getSystemComponentDetails");
          response = await service.getSystemComponentDetails(requestData);
        } else {
          console.log("[RuleDetails] ProductLgLcService.getSystemComponentDetails not available, using CoreApi directly");
          const BASE_URL = (window.Environment?.baseUrlCommon || "http://localhost:5059").replace(/\/+$/, "");
          const PRODUCT_ENDPOINT = `${BASE_URL}/api/OldAPI`;
          const envelope = {
            RequestID: formId,
            FormId: formId,
            RequestData: requestData,
            RequestTime: new Date().toISOString().split(".")[0],
            AppName: "PROJECT_KAIRO",
            Checksum: "",
          };
          response = await CoreApi.post(PRODUCT_ENDPOINT, envelope);
        }
        
        console.log("[RuleDetails] SystemComponentDetails response:", response);
        console.log("[RuleDetails] Response structure - success:", response?.success, "code:", response?.code);
        console.log("[RuleDetails] Response.data:", response?.data);
        console.log("[RuleDetails] Response.Details:", response?.Details);
        
        // Handle response - extract the Details array which contains component TrxID data
        if (response?.success === true || response?.code === "00" || response?.ResponseCode === "00" || response?.responseCode === "00") {
          let data = [];
          
          // Try different possible response structures
          if (response?.data?.Details) {
            data = response.data.Details;
            console.log("[RuleDetails] Extracted Details from response.data.Details:", data);
          } else if (response?.Details) {
            data = response.Details;
            console.log("[RuleDetails] Extracted Details from response.Details:", data);
          } else if (response?.data && Array.isArray(response.data)) {
            data = response.data;
            console.log("[RuleDetails] Using response.data directly:", data);
          } else {
            console.warn("[RuleDetails] Could not extract Details from response structure");
          }
          
          return {
            success: true,
            data: data || [],
          };
        }
        
        return {
          success: false,
          message: response?.message || response?.ResponseMessage || response?.responseMessage || "Failed to fetch component details",
          data: null,
        };
      }

      // Handle dbo.p_AddEditProductAcRuleDetail API call
      if (formId === "dbo.p_AddEditProductAcRuleDetail") {
        console.log("[RuleDetails] Calling dbo.p_AddEditProductAcRuleDetail with requestData:", requestData);
        console.log("[RuleDetails] DetailRecords XML content:", requestData.DetailRecords);
        
        // Try using ProductLgLcService if available (check both local and window scope)
        let response;
        const service = window.ProductLgLcService || ProductLgLcService;
        if (service && typeof service.addEditProductAcRuleDetail === "function") {
          console.log("[RuleDetails] Using ProductLgLcService.addEditProductAcRuleDetail");
          response = await service.addEditProductAcRuleDetail(requestData);
          console.log("[RuleDetails] Service response envelope would contain:", response);
        } else {
          console.log("[RuleDetails] ProductLgLcService.addEditProductAcRuleDetail not available, using CoreApi directly");
          const BASE_URL = (window.Environment?.baseUrlCommon || "http://localhost:5059").replace(/\/+$/, "");
          const PRODUCT_ENDPOINT = `${BASE_URL}/api/OldAPI`;
          
          const formatLegacyRequestTime = (d = new Date()) => {
            const pad2 = (n) => String(n).padStart(2, "0");
            const mm = pad2(d.getMonth() + 1);
            const dd = pad2(d.getDate());
            const yyyy = d.getFullYear();
            const hh = pad2(d.getHours());
            const mi = pad2(d.getMinutes());
            const ss = pad2(d.getSeconds());
            return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
          };
          
          const envelope = {
            RequestID: formId,
            FormId: formId,
            RequestData: requestData,
            RequestTime: formatLegacyRequestTime(),
            AppName: "PROJECT_KAIRO",
            Checksum: "",
          };
          response = await CoreApi.post(PRODUCT_ENDPOINT, envelope);
        }
        
        console.log("[RuleDetails] AddEditProductAcRuleDetail response:", response);
        
        if (response?.success === true || response?.code === "00" || response?.ResponseCode === "00" || response?.responseCode === "00") {
          return {
            success: true,
            data: response?.data || response?.Details || [],
          };
        }
        
        return {
          success: false,
          message: response?.message || response?.ResponseMessage || response?.responseMessage || "Failed to save rule details",
          data: null,
        };
      }

      // Handle dbo.p_DeleteProductAcRuleDetail API call
      if (formId === "dbo.p_DeleteProductAcRuleDetail") {
        console.log("[RuleDetails] Calling dbo.p_DeleteProductAcRuleDetail with requestData:", requestData);
        
        // Try using ProductLgLcService if available (check both local and window scope)
        let response;
        const service = window.ProductLgLcService || ProductLgLcService;
        if (service && typeof service.deleteProductAcRuleDetail === "function") {
          console.log("[RuleDetails] Using ProductLgLcService.deleteProductAcRuleDetail");
          response = await service.deleteProductAcRuleDetail(requestData);
          console.log("[RuleDetails] Service response:", response);
        } else {
          console.log("[RuleDetails] ProductLgLcService.deleteProductAcRuleDetail not available, using CoreApi directly");
          const BASE_URL = (window.Environment?.baseUrlCommon || "http://localhost:5059").replace(/\/+$/, "");
          const PRODUCT_ENDPOINT = `${BASE_URL}/api/OldAPI`;
          
          const formatLegacyRequestTime = (d = new Date()) => {
            const pad2 = (n) => String(n).padStart(2, "0");
            const mm = pad2(d.getMonth() + 1);
            const dd = pad2(d.getDate());
            const yyyy = d.getFullYear();
            const hh = pad2(d.getHours());
            const mi = pad2(d.getMinutes());
            const ss = pad2(d.getSeconds());
            return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
          };
          
          const envelope = {
            RequestID: formId,
            FormId: formId,
            RequestData: requestData,
            RequestTime: formatLegacyRequestTime(),
            AppName: "PROJECT_KAIRO",
            Checksum: "",
          };
          response = await CoreApi.post(PRODUCT_ENDPOINT, envelope);
        }
        
        console.log("[RuleDetails] DeleteProductAcRuleDetail response:", response);
        
        if (response?.success === true || response?.code === "00" || response?.ResponseCode === "00" || response?.responseCode === "00") {
          return {
            success: true,
            data: response?.data || response?.Details || [],
          };
        }
        
        return {
          success: false,
          message: response?.message || response?.ResponseMessage || response?.responseMessage || "Failed to delete rule details",
          data: null,
        };
      }

      // Fallback for other API calls if needed
      const env = window.Environment || {};
      const baseUrl = env.baseUrlSystemCodes || "http://localhost:5059";

      const envelope = {
        RequestID: formId,
        FormId: formId,
        RequestData: requestData,
        RequestTime: new Date().toISOString().split(".")[0],
        AppName: "PROJECT_KAIRO",
        Checksum: "",
      };

      console.log(`[RuleDetails] API Call - ${formId}:`, envelope);

      const response = await fetch(`${baseUrl}/api/PostRequest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          skipToken: "true",
        },
        body: JSON.stringify(envelope),
      });

      const data = await response.json();
      console.log(`[RuleDetails] API Response - ${formId}:`, data);

      // Normalize response
      if (data?.ResponseCode === "00" || data?.responseCode === "00") {
        return {
          success: true,
          data: data.Details || data.details || data,
        };
      }

      return {
        success: false,
        message: data?.ResponseMessage || data?.responseMessage || "API call failed",
        data: null,
      };
    } catch (error) {
      console.error(`[RuleDetails] API Error - ${formId}:`, error);
      return {
        success: false,
        message: error.message || "Network error",
        data: null,
      };
    }
  }

  // ============================================
  // DROPDOWN POPULATION
  // ============================================
  function populateDropdown(selectId, items, valueKey, textKey, placeholder = "--Select--") {
    const select = qs(`#${selectId}`);
    if (!select) return;

    console.log(`[RuleDetails] Populating dropdown #${selectId} with ${items?.length || 0} items (valueKey: ${valueKey}, textKey: ${textKey})`);

    select.innerHTML = "";
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = placeholder;
    select.appendChild(opt);

    (items || []).forEach((item) => {
      const option = document.createElement("option");
      option.value = item[valueKey] || "";
      option.textContent = item[textKey] || item[valueKey] || "";
      select.appendChild(option);
      console.log(`[RuleDetails]   Option: value="${option.value}", text="${option.textContent}"`);
    });
  }

  // Sample response data mapping
  const SAMPLE_RESPONSE_DATA = {
    events: [ // Details
      { SubCodeID: "AC_PRINT_STMNT", Description: "Account Statement Printing" },
      { SubCodeID: "TR_BOOKING", Description: "Treasury Booking" },
      { SubCodeID: "TR_CLOSURE", Description: "Treasury Closure" },
      { SubCodeID: "TR_DBINTACCRL", Description: "Treasury Debit Interest Accrual" },
      { SubCodeID: "TR_DBINTAPPL", Description: "Treasury Debit Interest Application" },
    ],
    accountTags: [ // Details01
      { SubCodeID: "ADV_INT_RBLE", Description: "Advance Interest receivable" },
      { SubCodeID: "CONTROL_AC", Description: "Control Account" },
      { SubCodeID: "CUSTOMER_AC", Description: "Customer Account" },
      { SubCodeID: "DISC_PUR_AC", Description: "Discount On Purchase" },
      { SubCodeID: "PREM_EXP_AC", Description: "Expense On Premium" },
      { SubCodeID: "DISC_INC_AC", Description: "Income On Discount" },
      { SubCodeID: "INT_INC_AC", Description: "Interest income" },
      { SubCodeID: "INT_EXP_AC", Description: "Interest paid account" },
      { SubCodeID: "INT_PBLE_AC", Description: "Interest payable account" },
      { SubCodeID: "INT_RBLE_AC", Description: "Interest receivable account" },
      { SubCodeID: "PREM_PUR_AC", Description: "Premium On Purchase" },
      { SubCodeID: "SETTLEMENT_AC", Description: "Settlement Account" },
    ],
    components: [ // Details02
      { SubCodeID: "TR_ACTCASH", Description: "Actual Cash paid" },
      { SubCodeID: "TR_ADV_INT", Description: "Treasury Advance Interest" },
      { SubCodeID: "TR_DISCOUNT", Description: "Treasury Discount" },
      { SubCodeID: "TR_DISC_AMOT", Description: "Treasury Discount Amortization" },
      { SubCodeID: "TR_FACEVALUE", Description: "Treasury Face Value" },
      { SubCodeID: "TR_INTEREST", Description: "Treasury Interest" },
      { SubCodeID: "TR_PREMIUM", Description: "Treasury Premium" },
      { SubCodeID: "TR_PREM_AMOT", Description: "Treasury Premium Amortization" },
    ],
    eventComponentMap: [ // Details03
      { EventID: "TR_BOOKING", ComponentID: "TR_ACTCASH", Description: "Actual Cash paid" },
      { EventID: "TR_CLOSURE", ComponentID: "TR_ACTCASH", Description: "Actual Cash paid" },
      { EventID: "TR_MUTIPLE_REDEEM", ComponentID: "TR_ACTCASH", Description: "Actual Cash paid" },
      { EventID: "TR_SELLING", ComponentID: "TR_ACTCASH", Description: "Actual Cash paid" },
      { EventID: "TR_BOOKING", ComponentID: "TR_DISCOUNT", Description: "Treasury Discount" },
      { EventID: "TR_CLOSURE", ComponentID: "TR_DISCOUNT", Description: "Treasury Discount" },
      { EventID: "TR_MUTIPLE_REDEEM", ComponentID: "TR_DISCOUNT", Description: "Treasury Discount" },
      { EventID: "TR_SELLING", ComponentID: "TR_DISCOUNT", Description: "Treasury Discount" },
      { EventID: "TR_CRINTACCRL", ComponentID: "TR_DISC_AMOT", Description: "Treasury Discount Amortization" },
      { EventID: "TR_CRINTAPPL", ComponentID: "TR_DISC_AMOT", Description: "Treasury Discount Amortization" },
      { EventID: "TR_DBINTACCRL", ComponentID: "TR_DISC_AMOT", Description: "Treasury Discount Amortization" },
      { EventID: "TR_DBINTAPPL", ComponentID: "TR_DISC_AMOT", Description: "Treasury Discount Amortization" },
      { EventID: "TR_BOOKING", ComponentID: "TR_FACEVALUE", Description: "Treasury Face Value" },
      { EventID: "TR_CLOSURE", ComponentID: "TR_FACEVALUE", Description: "Treasury Face Value" },
      { EventID: "TR_MUTIPLE_REDEEM", ComponentID: "TR_FACEVALUE", Description: "Treasury Face Value" },
      { EventID: "TR_SELLING", ComponentID: "TR_FACEVALUE", Description: "Treasury Face Value" },
      { EventID: "TR_BOOKING", ComponentID: "TR_INTEREST", Description: "Treasury Interest" },
      { EventID: "TR_CLOSURE", ComponentID: "TR_INTEREST", Description: "Treasury Interest" },
      { EventID: "TR_CRINTACCRL", ComponentID: "TR_INTEREST", Description: "Treasury Interest" },
      { EventID: "TR_CRINTAPPL", ComponentID: "TR_INTEREST", Description: "Treasury Interest" },
      { EventID: "TR_DBINTACCRL", ComponentID: "TR_INTEREST", Description: "Treasury Interest" },
      { EventID: "TR_DBINTAPPL", ComponentID: "TR_INTEREST", Description: "Treasury Interest" },
      { EventID: "TR_INTAPPL", ComponentID: "TR_INTEREST", Description: "Treasury Interest" },
      { EventID: "TR_MUTIPLE_REDEEM", ComponentID: "TR_INTEREST", Description: "Treasury Interest" },
      { EventID: "TR_SELLING", ComponentID: "TR_INTEREST", Description: "Treasury Interest" },
      { EventID: "TR_BOOKING", ComponentID: "TR_PREMIUM", Description: "Treasury Premium" },
      { EventID: "TR_CLOSURE", ComponentID: "TR_PREMIUM", Description: "Treasury Premium" },
      { EventID: "TR_MUTIPLE_REDEEM", ComponentID: "TR_PREMIUM", Description: "Treasury Premium" },
      { EventID: "TR_SELLING", ComponentID: "TR_PREMIUM", Description: "Treasury Premium" },
      { EventID: "TR_CRINTACCRL", ComponentID: "TR_PREM_AMOT", Description: "Treasury Premium Amortization" },
      { EventID: "TR_CRINTAPPL", ComponentID: "TR_PREM_AMOT", Description: "Treasury Premium Amortization" },
      { EventID: "TR_DBINTACCRL", ComponentID: "TR_PREM_AMOT", Description: "Treasury Premium Amortization" },
      { EventID: "TR_DBINTAPPL", ComponentID: "TR_PREM_AMOT", Description: "Treasury Premium Amortization" },
    ],
  };

  async function loadEvents() {
    // Load events from sample data
    state.events = SAMPLE_RESPONSE_DATA.events.map((item) => ({
      EventID: item.SubCodeID,
      EventDescription: item.Description,
    }));
    populateDropdown("Event", state.events, "EventID", "EventDescription");
  }

  async function loadComponents() {
    // Load components from sample data
    state.components = SAMPLE_RESPONSE_DATA.components.map((item) => ({
      ComponentID: item.SubCodeID,
      ComponentDescription: item.Description,
    }));
    populateDropdown("Component", state.components, "ComponentID", "ComponentDescription");
  }

  function filterComponentsByEvent(eventId) {
    // Filter components based on selected event
    if (!eventId) {
      // No event selected, show all components
      populateDropdown("Component", state.components, "ComponentID", "ComponentDescription");
      return;
    }

    // Get components for this event from the mapping
    const filteredComponentIds = new Set(
      SAMPLE_RESPONSE_DATA.eventComponentMap
        .filter((map) => map.EventID === eventId)
        .map((map) => map.ComponentID)
    );

    // Filter state.components to only include those in the map
    const filteredComponents = state.components.filter((comp) =>
      filteredComponentIds.has(comp.ComponentID)
    );

    populateDropdown("Component", filteredComponents, "ComponentID", "ComponentDescription");
  }

  async function loadAccountTags() {
    // Load account tags from sample data
    state.accountTags = SAMPLE_RESPONSE_DATA.accountTags.map((item) => ({
      TagID: item.SubCodeID,
      TagDescription: item.Description,
    }));
    populateDropdown("DebitAccountTag", state.accountTags, "TagID", "TagDescription");
    populateDropdown("CreditAccountTag", state.accountTags, "TagID", "TagDescription");
  }

  // ============================================
  // GRID / TABLE
  // ============================================
  function renderGrid() {
    const tbody = qs("#RuleDetailsBody");
    if (!tbody) return;

    if (state.ruleDetails.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="py-2">No records to display.</td>
        </tr>
      `;
      updateRecordCount();
      return;
    }

    tbody.innerHTML = state.ruleDetails
      .map(
        (row, index) => `
        <tr data-row-index="${index}" class="${index === state.selectedRowIndex ? "table-primary" : ""}">
          <td>${row.ComponentDescription || row.Component || ""}</td>
          <td>${row.DebitAccountTagDescription || row.DebitAccountTag || ""}</td>
          <td>${row.CreditAccountTagDescription || row.CreditAccountTag || ""}</td>
          <td>${row.DebitTrxID || ""}</td>
          <td>${row.CreditTrxID || ""}</td>
        </tr>
      `
      )
      .join("");

    // Attach click handlers to rows
    qsa("#RuleDetailsBody tr[data-row-index]").forEach((tr) => {
      tr.addEventListener("click", () => {
        const index = parseInt(tr.getAttribute("data-row-index"), 10);
        selectRow(index);
      });
    });

    updateRecordCount();
  }

  function updateRecordCount() {
    const countEl = qs("#recordCount");
    if (countEl) {
      countEl.textContent = `${state.ruleDetails.length} record${state.ruleDetails.length !== 1 ? "s" : ""}`;
    }
  }

  function selectRow(index) {
    console.log("[RuleDetails] selectRow called with index:", index);
    state.selectedRowIndex = index;
    const record = state.ruleDetails[index];
    
    console.log("[RuleDetails] Selected record:", record);

    // Highlight selected row
    qsa("#RuleDetailsBody tr").forEach((tr, i) => {
      tr.classList.toggle("table-primary", i === index);
    });

    // Populate form with selected row data
    if (record) {
      console.log("[RuleDetails] Populating form fields for record:", {
        ComponentID: record.ComponentID,
        DebitAccountTagID: record.DebitAccountTagID,
        CreditAccountTagID: record.CreditAccountTagID,
        Narration: record.Narration
      });
      
      setFieldValue("Component", record.ComponentID || record.Component || "");
      setFieldValue("DebitAccountTag", record.DebitAccountTagID || record.DebitAccountTag || "");
      setFieldValue("CreditAccountTag", record.CreditAccountTagID || record.CreditAccountTag || "");
      setFieldValue("Narration", record.Narration || "");

      // Verify the values were set
      const componentField = qs("#Component");
      const debitField = qs("#DebitAccountTag");
      const creditField = qs("#CreditAccountTag");
      const narrationField = qs("#Narration");
      
      console.log("[RuleDetails] Field values after setFieldValue:", {
        Component: componentField?.value,
        DebitAccountTag: debitField?.value,
        CreditAccountTag: creditField?.value,
        Narration: narrationField?.value
      });

      // Update component details
      const componentDetails = qs("#ComponentDetails");
      if (componentDetails) {
        componentDetails.textContent = record.ComponentDescription || record.Component || "Component details";
      }

      // Update audit fields (Behind the Scene section)
      setFieldValue("CreatedBy", record.CreatedBy || "");
      setFieldValue("ModifiedBy", record.SupervisedBy || "");
      setFieldValue("SupervisedBy", record.SupervisedBy || "");
      setFieldValue("CreatedOn", record.CreatedOn ? formatDate(record.CreatedOn) : "");
      setFieldValue("ModifiedOn", record.SupervisedOn ? formatDate(record.SupervisedOn) : "");
      setFieldValue("SupervisedOn", record.SupervisedOn ? formatDate(record.SupervisedOn) : "");
      
      console.log("[RuleDetails] Audit fields updated");
    } else {
      console.log("[RuleDetails] No record found at index:", index);
    }

    // Update button states
    setFormFieldsEnabled(state.mode !== MODES.VIEW);
    updateActionPanelButtons();
  }

  // Helper function to format dates
  function formatDate(dateString) {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      const pad = (n) => String(n).padStart(2, "0");
      const mm = pad(date.getMonth() + 1);
      const dd = pad(date.getDate());
      const yyyy = date.getFullYear();
      const hh = pad(date.getHours());
      const mi = pad(date.getMinutes());
      const ss = pad(date.getSeconds());
      return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
    } catch (e) {
      return dateString;
    }
  }

  // ============================================
  // LOAD RULE DETAILS
  // ============================================
  async function loadRuleDetails() {
    // Get the selected event
    const selectedEventId = getFieldValue("Event");
    
    console.log("[RuleDetails] Loading rule details for event:", selectedEventId);
    
    if (!selectedEventId) {
      showMessage("Please select an Event first", "warning");
      return;
    }

    if (!state.parentData?.RequestData?.AcRuleID && !state.parentData?.RequestData?.AccountingRuleId) {
      showMessage("No Accounting Rule ID provided", "warning");
      return;
    }

    showLoading(true);

    // Map the rule ID - could be AcRuleID or AccountingRuleId
    const ruleId = state.parentData.RequestData.AccountingRuleId || state.parentData.RequestData.AcRuleID;
    
    // Get values from parentData first, then Environment as fallback
    const bankId = state.parentData.RequestData.BankID || window.Environment?.bankId || "";
    const ourBranchId = state.parentData.RequestData.OurBranchID || window.Environment?.ourBranchId || "";
    const operatorId = state.parentData.RequestData.OperatorID || window.Environment?.operatorId || "";

    console.log("[RuleDetails] Calling dbo.p_GetProductAcRuleDetail with:", {
      BankID: bankId,
      AcRuleID: ruleId,
      SysEventID: selectedEventId,
      OurBranchID: ourBranchId,
      OperatorID: operatorId,
    });
    
    const result = await callApi("dbo.p_GetProductAcRuleDetail", {
      BankID: bankId,
      AcRuleID: ruleId,
      SysEventID: selectedEventId,
      OurBranchID: ourBranchId,
      OperatorID: operatorId,
    });

    showLoading(false);

    console.log("[RuleDetails] API Response:", result);
    console.log("[RuleDetails] API Response - Full Details structure:", {
      Details: result.Details,
      Details01: result.data,
      dataArray: result.data,
    });

    // Check if we have data in Details (metadata) instead of Details01 (detail records)
    let detailRecords = [];
    if (result.success) {
      // Try to extract from Details01 first (expected location)
      if (Array.isArray(result.data) && result.data.length > 0) {
        detailRecords = result.data;
        console.log("[RuleDetails] Using Details01 data:", detailRecords);
      }
      // If Details01 is empty, try Details array
      else if (Array.isArray(result.Details) && result.Details.length > 0) {
        detailRecords = result.Details;
        console.log("[RuleDetails] Using Details data:", detailRecords);
      }
      else {
        console.log("[RuleDetails] No detail records found for this event - user can add new ones");
        detailRecords = [];
      }
    }

    if (detailRecords.length > 0) {
      // The API returns the details in Details01 array
      state.ruleDetails = detailRecords.map((item) => ({
        // Map API response fields to our internal field names
        BankID: item.BankID,
        AcRuleID: item.AcRuleID,
        EventID: item.EventID,
        ComponentID: item.ComponentID,
        Component: item.Component,
        ComponentDescription: item.Component,
        DebitAccountTagID: item.DrAccountTagID,
        DebitAccountTag: item.DrAccountTag,
        DebitAccountTagDescription: item.DrAccountTag,
        CreditAccountTagID: item.CrAccountTagID,
        CreditAccountTag: item.CrAccountTag,
        CreditAccountTagDescription: item.CrAccountTag,
        DebitTrxID: item.DrTrxDescriptionID,
        DebitTrxDescription: item.DrTrxDescription,
        CreditTrxID: item.CrTrxDescriptionID,
        CreditTrxDescription: item.CrTrxDescription,
        Narration: item.Narration,
        CreatedBy: item.CreatedBy,
        CreatedOn: item.CreatedOn,
        SupervisedBy: item.SupervisedBy,
        SupervisedOn: item.SupervisedOn,
        UpdateCount: item.UpdateCount,
        SLNo: item.SLNo,
        // Store original data for comparison
        _original: item,
      }));
      
      // IMPORTANT: After loading rule details, ensure the dropdowns contain
      // all components and account tags from the API response so that selectRow
      // can properly set the field values
      const allComponentIdsFromAPI = new Set(state.ruleDetails.map(r => r.ComponentID).filter(Boolean));
      const allDebitTagIdsFromAPI = new Set(state.ruleDetails.map(r => r.DebitAccountTagID).filter(Boolean));
      const allCreditTagIdsFromAPI = new Set(state.ruleDetails.map(r => r.CreditAccountTagID).filter(Boolean));
      
      console.log("[RuleDetails] Component IDs from API:", Array.from(allComponentIdsFromAPI));
      console.log("[RuleDetails] Debit Account Tag IDs from API:", Array.from(allDebitTagIdsFromAPI));
      console.log("[RuleDetails] Credit Account Tag IDs from API:", Array.from(allCreditTagIdsFromAPI));
      
      // Filter Component dropdown based on selected event
      const selectedEventId = getFieldValue("Event");
      filterComponentsByEvent(selectedEventId);
      
      // Re-populate account tag dropdowns with all available tags
      populateDropdown("DebitAccountTag", state.accountTags, "TagID", "TagDescription");
      populateDropdown("CreditAccountTag", state.accountTags, "TagID", "TagDescription");
      
      state.hasLoadedRecord = true;
      state.selectedRowIndex = -1;
      
      // Preserve the ProductTypes field before clearing
      const productType = getFieldValue("ProductTypes");
      
      clearRuleDetailFields();
      
      // Restore ProductTypes field
      setFieldValue("ProductTypes", productType);
      
      renderGrid();
      console.log("[RuleDetails] Grid populated with", state.ruleDetails.length, "records");
      
      // Automatically select and display the first record in the form fields
      if (state.ruleDetails.length > 0) {
        console.log("[RuleDetails] Auto-selecting first record");
        selectRow(0);
      }
      
      state.hasAttemptedView = true;
      showMessage(`Loaded ${state.ruleDetails.length} rule detail(s)`, "success");
    } else {
      state.ruleDetails = [];
      renderGrid();
      state.hasAttemptedView = true;
      console.log("[RuleDetails] No data returned from API");
      showMessage(result.message || "No rule details found for this event", "info");
    }

    // Reset edit mode - user must click Edit to enable New/Alter/Remove
    state.editModeActive = false;
    setFormFieldsEnabled(false);
    updateActionPanelButtons();
  }

  // ============================================
  // INLINE ACTIONS (New, Alter, Remove, Update, Clear)
  // ============================================
  function handleNew() {
    state.mode = MODES.ADD;
    state.selectedRowIndex = -1;
    clearRuleDetailFields();
    
    // Enable rule detail fields but freeze Event and ProductTypes
    const ruleFields = ["Component", "DebitAccountTag", "CreditAccountTag", "Narration"];
    ruleFields.forEach((id) => {
      const field = qs(`#${id}`);
      if (field) field.disabled = false;
    });
    
    const eventField = qs("#Event");
    const productTypesField = qs("#ProductTypes");
    if (eventField) eventField.disabled = true;
    if (productTypesField) productTypesField.disabled = true;
    
    console.log("[RuleDetails] ADD mode: Rule detail fields enabled, Event/ProductTypes frozen");
    
    setFormFieldsEnabled(true);
    updateActionPanelButtons();  // Update side panel buttons (Add, Edit, Delete, Save)

    // Focus on first field
    const componentField = qs("#Component");
    if (componentField) componentField.focus();

    showMessage("Enter new rule detail. Click Update or Clear", "info");
  }

  function handleAlter() {
    if (state.selectedRowIndex < 0 || !state.ruleDetails[state.selectedRowIndex]) {
      showMessage("Please select a record from the grid first before clicking Alter", "danger");
      console.log("[RuleDetails] Alter blocked - no row selected. selectedRowIndex:", state.selectedRowIndex);
      return;
    }

    state.mode = MODES.UPDATE;
    
    // Enable rule detail fields but freeze Event and ProductTypes
    const ruleFields = ["Component", "DebitAccountTag", "CreditAccountTag", "Narration"];
    ruleFields.forEach((id) => {
      const field = qs(`#${id}`);
      if (field) field.disabled = false;
    });
    
    const eventField = qs("#Event");
    const productTypesField = qs("#ProductTypes");
    if (eventField) eventField.disabled = true;
    if (productTypesField) productTypesField.disabled = true;
    
    console.log("[RuleDetails] UPDATE mode: Rule detail fields enabled, Event/ProductTypes frozen");
    
    setFormFieldsEnabled(true);
    updateActionPanelButtons();  // Update side panel buttons
    showMessage("Modify the selected record and click Update or Clear", "info");
  }

  function handleRemove() {
    if (state.selectedRowIndex < 0) {
      showMessage("Please select a row to remove", "warning");
      return;
    }

    if (confirm("Are you sure you want to remove this record?")) {
      // Remove the record
      state.ruleDetails.splice(state.selectedRowIndex, 1);
      state.selectedRowIndex = -1;
      
      // Clear only rule detail fields, keeping Event and ProductTypes intact
      clearRuleDetailFields();
      
      // Refresh grid
      renderGrid();
      
      // Update button states - only New and Cancel should be active
      qsa("[data-inline-action]").forEach((btn) => {
        const action = btn.getAttribute("data-inline-action");
        if (action === "new") {
          btn.disabled = false;  // Enable New
        } else if (action === "clear" || action === "alter" || action === "remove" || action === "update") {
          btn.disabled = true;   // Disable all others
        }
      });
      
      // Update side panel buttons - only Cancel should be active
      qsa(".action-panel [data-action]").forEach((btn) => {
        const action = btn.getAttribute("data-action");
        if (action === "cancel") {
          btn.disabled = false;  // Enable Cancel
        } else {
          btn.disabled = true;   // Disable all others (including Add, Edit, Delete, Save)
        }
      });
      
      console.log("[RuleDetails] After Remove - New and Cancel buttons enabled, Event preserved");
      showMessage("Record removed. Click Save to persist changes.", "success");
    }
  }

  function handleUpdate() {
    if (state.mode === MODES.ADD) {
      // Add new record - fetch TrxIDs from API
      const componentId = getFieldValue("Component");
      
      if (!componentId) {
        showMessage("Please select a component", "warning");
        return;
      }

      // Fetch DebitTrxID and CreditTrxID from API
      fetchTrxIds(componentId);
    } else if (state.mode === MODES.UPDATE && state.selectedRowIndex >= 0) {
      // Update existing record - fetch TrxIDs from API
      const componentId = getFieldValue("Component");
      
      if (!componentId) {
        showMessage("Please select a component", "warning");
        return;
      }

      // Fetch TrxIDs and update the selected record
      fetchTrxIds(componentId, true);
    }
  }

  async function fetchTrxIds(componentId, isUpdate = false) {
    const selectedEventId = getFieldValue("Event");
    
    if (!selectedEventId) {
      showMessage("Please select an Event first", "warning");
      return;
    }

    showLoading(true);

    console.log("[RuleDetails] fetchTrxIds - Getting TrxIDs for component:", componentId);

    let debitTrxId = "";
    let creditTrxId = "";
    let debitTrxDescription = "";
    let creditTrxDescription = "";

    try {
      // Call p_GetSystemComponentDetails to get TrxIDs for the component
      const result = await callApi("dbo.p_GetSystemComponentDetails", {
        ComponentID: componentId,
        Module: "BI",
        LanguageID: state.parentData?.RequestData?.LanguageID || "UserSubID",
      });

      console.log("[RuleDetails] SystemComponentDetails Response:", result);

      if (result.success && Array.isArray(result.data) && result.data.length > 0) {
        const componentData = result.data[0]; // Get first matching record
        
        console.log("[RuleDetails] Found component data:", componentData);
        
        // Note: The API returns DebitTrxDescriptionID for Credit and CreditTrxDescriptionID for Debit
        // So we swap them during assignment
        debitTrxId = componentData.CreditTrxDescriptionID || "";
        creditTrxId = componentData.DebitTrxDescriptionID || "";
        debitTrxDescription = componentData.CreditTrxDescription || "";
        creditTrxDescription = componentData.DebitTrxDescription || "";

        console.log("[RuleDetails] Extracted TrxIDs - Debit:", debitTrxId, "Credit:", creditTrxId);
      } else {
        console.warn("[RuleDetails] No component details found, proceeding with empty TrxIDs");
      }
    } catch (error) {
      console.warn("[RuleDetails] Error fetching component details:", error.message);
    } finally {
      showLoading(false);
    }

    // Create or update the record with or without TrxIDs
    // Validate all required fields before creating the record
    const debitAccountTagId = getFieldValue("DebitAccountTag");
    const creditAccountTagId = getFieldValue("CreditAccountTag");
    
    if (!componentId || !debitAccountTagId || !creditAccountTagId) {
      showMessage("Please fill in all required fields: Component, Debit Account Tag, and Credit Account Tag", "warning");
      return;
    }

    const newRecord = {
      ComponentID: componentId,
      Component: getFieldValue("Component"),
      ComponentDescription: qs("#Component option:checked")?.textContent || getFieldValue("Component"),
      DebitAccountTagID: debitAccountTagId,
      DebitAccountTag: getFieldValue("DebitAccountTag"),
      DebitAccountTagDescription: qs("#DebitAccountTag option:checked")?.textContent || getFieldValue("DebitAccountTag"),
      CreditAccountTagID: creditAccountTagId,
      CreditAccountTag: getFieldValue("CreditAccountTag"),
      CreditAccountTagDescription: qs("#CreditAccountTag option:checked")?.textContent || getFieldValue("CreditAccountTag"),
      DebitTrxID: debitTrxId,
      DebitTrxDescription: debitTrxDescription,
      DebitTrxDescriptionID: debitTrxId, // Alias for XML builder
      CreditTrxID: creditTrxId,
      CreditTrxDescription: creditTrxDescription,
      CreditTrxDescriptionID: creditTrxId, // Alias for XML builder
      Narration: getFieldValue("Narration"),
    };

    console.log("[RuleDetails] New record to add/update:", newRecord);

    if (isUpdate && state.selectedRowIndex >= 0) {
      // Update existing record
      state.ruleDetails[state.selectedRowIndex] = newRecord;
      console.log("[RuleDetails] Updated record at index", state.selectedRowIndex);
      showMessage("Record updated. Click Save to persist changes.", "success");
    } else {
      // Add new record
      state.ruleDetails.push(newRecord);
      state.selectedRowIndex = state.ruleDetails.length - 1;
      console.log("[RuleDetails] Added new record at index", state.selectedRowIndex);
      showMessage("Record added. Click Save to persist changes.", "success");
    }

    console.log("[RuleDetails] Total records now:", state.ruleDetails.length);
    renderGrid();
    
    // Keep the current mode (ADD or UPDATE) so Save button stays enabled
    // Clear form fields for next entry but keep mode active for saving
    clearRuleDetailFields();
    state.selectedRowIndex = -1;
    
    // Event and ProductTypes remain frozen in ADD/UPDATE mode
    // setFormFieldsEnabled is already configured to handle this
    updateActionPanelButtons();
    
    console.log("[RuleDetails] Record added to grid, mode remains " + state.mode + ", ready to Save or add more");
  }

  function handleClear() {
    console.log("[RuleDetails] Clear button clicked - returning to state before Edit");
    
    // Clear only rule detail form fields, preserving Event and ProductTypes
    clearRuleDetailFields();
    
    // Deselect any highlighted row
    state.selectedRowIndex = -1;
    qsa("#RuleDetailsBody tr").forEach((tr) => tr.classList.remove("table-primary"));
    
    // Reset mode to VIEW (keep grid data intact, but keep editModeActive so user can continue editing)
    state.mode = MODES.VIEW;
    
    // Disable rule detail fields since we're not editing
    setFormFieldsEnabled(false);
    
    // Enable Event dropdown so user can select another event if needed
    const eventField = qs("#Event");
    if (eventField) eventField.disabled = false;
    
    // Update all button states (this will re-enable New/Alter/Remove since editModeActive is still true)
    updateActionPanelButtons();
    
    showMessage("Cleared - click New, Alter, or Remove to continue editing", "info");
  }

  // ============================================
  // ORDER CONTROLS
  // ============================================
  function handleOrderUp() {
    // Validate edit mode is active
    if (!state.editModeActive) {
      showMessage("Please click Edit first to enable reordering", "danger");
      return;
    }
    
    // Validate a row is selected
    if (state.selectedRowIndex < 0) {
      showMessage("Please select a record from the grid first before reordering", "danger");
      return;
    }
    
    // Validate not already at top
    if (state.selectedRowIndex === 0) {
      showMessage("Record is already at the top", "warning");
      return;
    }

    // Swap with previous record
    const temp = state.ruleDetails[state.selectedRowIndex];
    state.ruleDetails[state.selectedRowIndex] = state.ruleDetails[state.selectedRowIndex - 1];
    state.ruleDetails[state.selectedRowIndex - 1] = temp;
    state.selectedRowIndex--;
    renderGrid();
    updateOrderButtons();
    showMessage("Record moved up - click Save to persist the new order", "success");
  }

  function handleOrderDown() {
    // Validate edit mode is active
    if (!state.editModeActive) {
      showMessage("Please click Edit first to enable reordering", "danger");
      return;
    }
    
    // Validate a row is selected
    if (state.selectedRowIndex < 0) {
      showMessage("Please select a record from the grid first before reordering", "danger");
      return;
    }
    
    // Validate not already at bottom
    if (state.selectedRowIndex >= state.ruleDetails.length - 1) {
      showMessage("Record is already at the bottom", "warning");
      return;
    }

    // Swap with next record
    const temp = state.ruleDetails[state.selectedRowIndex];
    state.ruleDetails[state.selectedRowIndex] = state.ruleDetails[state.selectedRowIndex + 1];
    state.ruleDetails[state.selectedRowIndex + 1] = temp;
    state.selectedRowIndex++;
    renderGrid();
    updateOrderButtons();
    showMessage("Record moved down - click Save to persist the new order", "success");
  }
  
  function updateOrderButtons() {
    // Update order button states based on selection and position
    const hasRowSelected = state.selectedRowIndex >= 0;
    const isAtTop = state.selectedRowIndex === 0;
    const isAtBottom = state.selectedRowIndex >= state.ruleDetails.length - 1;
    
    qsa("[data-order-action]").forEach((btn) => {
      const action = btn.getAttribute("data-order-action");
      if (action === "up") {
        // Disable if not in edit mode, no row selected, or already at top
        btn.disabled = !state.editModeActive || !hasRowSelected || isAtTop;
      } else if (action === "down") {
        // Disable if not in edit mode, no row selected, or already at bottom
        btn.disabled = !state.editModeActive || !hasRowSelected || isAtBottom;
      }
    });
  }

  // ============================================
  // ACTION PANEL (View, Add, Edit, Delete, Save, Cancel, Back)
  // ============================================
  function handleView() {
    loadRuleDetails();
    updateActionPanelButtons();
  }

  function handleAdd() {
    if (!state.hasAttemptedView) {
      showMessage("Please click View first to load rule details", "warning");
      return;
    }
    state.saveOrigin = 'add'; // Track that save will come from Add flow
    handleNew();
    updateActionPanelButtons();
  }

  function handleEdit() {
    console.log("[RuleDetails] Edit button clicked");
    if (!state.hasAttemptedView) {
      showMessage("Please click View first to load rule details", "warning");
      return;
    }
    if (state.ruleDetails.length === 0) {
      showMessage("No records available to edit", "warning");
      return;
    }
    // Set editModeActive to enable inline buttons (New, Alter, Remove)
    state.editModeActive = true;
    state.saveOrigin = 'edit'; // Track that save will come from Edit flow
    updateInlineButtons();
    console.log("[RuleDetails] Edit mode activated - New, Alter, Remove buttons enabled");
    showMessage("Now you can manage records - click New, Alter, or Remove", "info");
  }

  async function handleDelete() {
    // Get the selected event
    const selectedEventId = getFieldValue("Event");
    
    if (!selectedEventId) {
      showMessage("Please select an Event first before deleting", "danger");
      return;
    }
    
    if (state.ruleDetails.length === 0) {
      showMessage("No records to delete for this event", "warning");
      return;
    }
    
    // Confirm deletion
    const confirmMessage = `Are you sure you want to delete all ${state.ruleDetails.length} record(s) for event "${selectedEventId}"?\n\nThis action cannot be undone.`;
    if (!confirm(confirmMessage)) {
      return;
    }
    
    showLoading(true);
    
    try {
      // Get values from parentData first, then Environment as fallback
      const bankId = state.parentData?.RequestData?.BankID || window.Environment?.bankId || "";
      const acRuleId = state.parentData?.RequestData?.AccountingRuleId || state.parentData?.RequestData?.AcRuleID || "";
      
      if (!acRuleId) {
        showMessage("No Accounting Rule ID found - cannot delete", "danger");
        console.error("[RuleDetails] Delete aborted - AcRuleID is empty");
        showLoading(false);
        return;
      }
      
      // Get UpdateCount from the first loaded record (same pattern as add/edit)
      const updateCount = state.ruleDetails.length > 0 && state.ruleDetails[0].UpdateCount 
        ? parseInt(state.ruleDetails[0].UpdateCount, 10) || 0 
        : 0;
      
      const deleteRequest = {
        BankID: bankId,
        AcRuleID: acRuleId,
        EventID: selectedEventId,
        UpdateCount: updateCount,
      };
      
      console.log("[RuleDetails] Delete request:", deleteRequest);
      
      const result = await callApi("dbo.p_DeleteProductAcRuleDetail", deleteRequest);
      
      console.log("[RuleDetails] Delete API Result:", result);
      
      if (result.success) {
        showMessage("Records deleted successfully", "success");
        
        // Preserve ProductTypes and Event before clearing
        const preservedProductTypes = getFieldValue("ProductTypes");
        const preservedEvent = getFieldValue("Event");
        
        // Reset state (same pattern as save)
        state.selectedRowIndex = -1;
        state.mode = MODES.VIEW;
        state.editModeActive = false;
        state.saveOrigin = null;
        state.hasAttemptedView = false;
        
        // Reload records from database to confirm deletion and show remaining data
        await loadRuleDetails();
        
        // Render grid with reloaded data (will be empty if all records deleted)
        renderGrid();
        
        // Clear form fields
        clearRuleDetailFields();
        setFieldValue("Event", ""); // Clear Event
        
        // Restore only ProductTypes
        setFieldValue("ProductTypes", preservedProductTypes);
        
        // Disable rule detail editing fields
        setFormFieldsEnabled(false);
        
        // Enable Event dropdown for next selection
        const eventField = qs("#Event");
        if (eventField) eventField.disabled = false;
        
        // Update all button states - only View and Back will be enabled
        updateActionPanelButtons();
        
        console.log("[RuleDetails] ========== DELETE COMPLETE ==========");
        console.log("[RuleDetails] Grid shows", state.ruleDetails.length, "records after reload");
        console.log("[RuleDetails] Only View and Back buttons enabled");
      } else {
        showMessage(result.message || "Failed to delete records", "danger");
      }
    } catch (error) {
      console.error("[RuleDetails] Error deleting records:", error);
      showMessage("Error deleting records: " + error.message, "danger");
    } finally {
      showLoading(false);
    }
  }

  async function handleSave() {
    if (state.ruleDetails.length === 0) {
      showMessage("No records to save", "warning");
      return;
    }

    // Capture Event ID early - before any DOM changes
    const selectedEventId = getFieldValue("Event");
    const selectedProductTypes = getFieldValue("ProductTypes");
    
    // Validate EventID is present
    if (!selectedEventId) {
      showMessage("No event selected - cannot save", "error");
      console.error("[RuleDetails] Save aborted - EventID is empty");
      return;
    }
    
    console.log("[RuleDetails] ========== SAVE STARTING ==========");
    console.log("[RuleDetails] saveOrigin:", state.saveOrigin);
    console.log("[RuleDetails] EventID:", selectedEventId);
    console.log("[RuleDetails] ProductTypes:", selectedProductTypes);
    console.log("[RuleDetails] Records in grid:", state.ruleDetails.length);

    showLoading(true);

    try {
      // Build XML DetailRecords from grid records
      const detailRecordsXml = buildDetailRecordsXml();
      
      console.log("[RuleDetails] Saving records with XML:", detailRecordsXml);
      console.log("[RuleDetails] Total records to save:", state.ruleDetails.length);
      console.log("[RuleDetails] Grid records:", JSON.stringify(state.ruleDetails));

      // Format date as ISO string for SQL Server smalldatetime compatibility
      const now = new Date();
      const operatedOn = now.toISOString().slice(0, 19).replace('T', ' '); // '2026-02-06 10:51:22'
      
      // Get values from parentData first, then Environment as fallback
      const bankId = state.parentData?.RequestData?.BankID || window.Environment?.bankId || "";
      const acRuleId = state.parentData?.RequestData?.AccountingRuleId || state.parentData?.RequestData?.AcRuleID || "";
      const operatorId = state.parentData?.RequestData?.OperatorID || window.Environment?.operatorId || "";
      
      if (!acRuleId) {
        showMessage("No Accounting Rule ID found - cannot save", "error");
        console.error("[RuleDetails] Save aborted - AcRuleID is empty");
        showLoading(false);
        return;
      }
      
      const saveRequest = {
        BankID: bankId,
        AcRuleID: acRuleId,
        EventID: selectedEventId,
        OperatedBy: operatorId,
        OperatedOn: operatedOn,
        SupervisedBy: operatorId,
        UpdateCount: 0,
        DetailRecords: detailRecordsXml,
      };
      
      console.log("[RuleDetails] Save request data:", saveRequest);
      console.log("[RuleDetails] parentData.RequestData:", state.parentData?.RequestData);
      console.log("[RuleDetails] AcRuleID being saved:", saveRequest.AcRuleID);

      const result = await callApi("dbo.p_AddEditProductAcRuleDetail", saveRequest);

      console.log("[RuleDetails] Save API Result:", result);

      if (result.success) {
        showMessage("Records saved successfully", "success");
        
        // Use the EventID we captured at the start of save (before any DOM changes)
        const eventToReload = selectedEventId;
        const preservedProductTypes = selectedProductTypes;
        
        console.log("[RuleDetails] Save successful - reloading records for Event:", eventToReload);
        
        // Reset state flags
        state.mode = MODES.VIEW;
        state.editModeActive = false;
        state.saveOrigin = null;
        
        // Reload records from database
        const requestData = {
          BankID: state.parentData?.RequestData?.BankID || window.Environment?.bankId || "",
          AcRuleID: state.parentData?.RequestData?.AccountingRuleId || state.parentData?.RequestData?.AcRuleID || "",
          SysEventID: eventToReload,
          OurBranchID: state.parentData?.RequestData?.OurBranchID || window.Environment?.ourBranchId || "",
          OperatorID: state.parentData?.RequestData?.OperatorID || window.Environment?.operatorId || "",
        };
        
        console.log("[RuleDetails] Reload request:", JSON.stringify(requestData));
        const reloadResult = await callApi("dbo.p_GetProductAcRuleDetail", requestData);
        console.log("[RuleDetails] Reload result - success:", reloadResult.success, "data length:", reloadResult.data?.length);
        
        if (reloadResult.success && reloadResult.data && reloadResult.data.length > 0) {
          // Map the reloaded data
          state.ruleDetails = reloadResult.data.map((item) => ({
            BankID: item.BankID,
            AcRuleID: item.AcRuleID,
            EventID: item.EventID,
            ComponentID: item.ComponentID,
            Component: item.Component,
            ComponentDescription: item.Component,
            DebitAccountTagID: item.DrAccountTagID,
            DebitAccountTag: item.DrAccountTag,
            CreditAccountTagID: item.CrAccountTagID,
            CreditAccountTag: item.CrAccountTag,
            DebitTrxID: item.DrTrxDescriptionID,
            DebitTrxDescription: item.DrTrxDescription,
            CreditTrxID: item.CrTrxDescriptionID,
            CreditTrxDescription: item.CrTrxDescription,
            DebitTrxDescriptionID: item.DrTrxDescriptionID,
            CreditTrxDescriptionID: item.CrTrxDescriptionID,
            Narration: item.Narration,
            SLNo: item.SLNo,
          }));
          console.log("[RuleDetails] Loaded " + state.ruleDetails.length + " records from database");
        } else {
          state.ruleDetails = [];
          console.warn("[RuleDetails] No records found after reload - this may indicate save failed to insert data");
          console.warn("[RuleDetails] Reload response:", JSON.stringify(reloadResult));
        }
        
        // Render the grid with reloaded data
        renderGrid();
        
        // Clear form fields and Event
        clearRuleDetailFields();
        setFieldValue("Event", ""); // Clear Event
        
        // Restore only ProductTypes
        setFieldValue("ProductTypes", preservedProductTypes);
        
        // Reset to initial state - only View and Back enabled
        state.hasAttemptedView = false;
        state.selectedRowIndex = -1;
        
        // Disable rule detail editing fields
        setFormFieldsEnabled(false);
        
        // Enable Event dropdown for next selection
        const eventField = qs("#Event");
        if (eventField) eventField.disabled = false;
        
        // Update all button states - only View and Back will be enabled
        updateActionPanelButtons();
        
        console.log("[RuleDetails] ========== SAVE COMPLETE ==========");
        console.log("[RuleDetails] Grid shows " + state.ruleDetails.length + " records");
        console.log("[RuleDetails] Only View and Back buttons enabled");
      } else {
        showMessage(result.message || "Failed to save records", "error");
      }
    } catch (error) {
      console.error("[RuleDetails] Error saving records:", error);
      showMessage("Error saving records: " + error.message, "error");
    } finally {
      showLoading(false);
    }
  }

  function buildDetailRecordsXml() {
    if (state.ruleDetails.length === 0) {
      console.log("[RuleDetails] No records to build XML for");
      return "";
    }

    // SP expects: @DetailRecords.nodes('/dt_ProductAcRuleDetail')
    // For multiple records, SQL Server XML fragments can have multiple root elements
    // Each record is a dt_ProductAcRuleDetail element
    let xml = "";
    
    state.ruleDetails.forEach((record, index) => {
      // Extract and clean values before building XML
      const componentId = cleanValue(record.ComponentID);
      const slNo = (index + 1).toString();
      const drAccountTagId = cleanValue(record.DebitAccountTagID);
      const crAccountTagId = cleanValue(record.CreditAccountTagID);
      // TrxDescriptionID should be a numeric string - ensure it's clean
      const drTrxDescId = cleanValue(record.DebitTrxDescriptionID || record.DebitTrxID) || "0";
      const crTrxDescId = cleanValue(record.CreditTrxDescriptionID || record.CreditTrxID) || "0";
      const narration = cleanValue(record.Narration);
      
      console.log("[RuleDetails] Building XML for record", index + 1, {
        ComponentID: componentId,
        SLNo: slNo,
        DrAccountTagID: drAccountTagId,
        CrAccountTagID: crAccountTagId,
        DrTrxDescriptionID: drTrxDescId,
        CrTrxDescriptionID: crTrxDescId,
        Narration: narration
      });
      
      // Build XML without any extra whitespace
      xml += "<dt_ProductAcRuleDetail>" +
             "<ComponentID>" + escapeXml(componentId) + "</ComponentID>" +
             "<SLNo>" + slNo + "</SLNo>" +
             "<DrAccountTagID>" + escapeXml(drAccountTagId) + "</DrAccountTagID>" +
             "<CrAccountTagID>" + escapeXml(crAccountTagId) + "</CrAccountTagID>" +
             "<DrTrxDescriptionID>" + escapeXml(drTrxDescId) + "</DrTrxDescriptionID>" +
             "<CrTrxDescriptionID>" + escapeXml(crTrxDescId) + "</CrTrxDescriptionID>" +
             "<Narration>" + escapeXml(narration) + "</Narration>" +
             "</dt_ProductAcRuleDetail>";
    });
    
    console.log("[RuleDetails] Built DetailRecords XML:", xml);
    console.log("[RuleDetails] XML length:", xml.length);
    
    // DEBUG: Also log character codes of first few chars to check for BOM or hidden chars
    const firstChars = xml.substring(0, 30);
    console.log("[RuleDetails] First 30 chars as codes:", Array.from(firstChars).map(c => c.charCodeAt(0)).join(','));
    
    return xml;
  }
  
  function cleanValue(value) {
    if (value === null || value === undefined) return "";
    return String(value).trim();
  }

  function escapeXml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  // ============================================
  // ORDER CONTROLS
  // ============================================

  function handleCancel() {
    console.log("[RuleDetails] Cancel button clicked - calling refresh");
    handleRefresh();
  }

  function handleRefresh() {
    console.log("[RuleDetails] Refresh/Cancel - resetting screen");
    state.mode = MODES.VIEW;
    state.selectedRowIndex = -1;
    state.ruleDetails = [];
    state.hasAttemptedView = false;
    state.editModeActive = false; // Reset edit mode
    state.saveOrigin = null; // Reset save origin
    setFieldValue("Event", ""); // Clear Event but keep ProductTypes
    clearRuleDetailFields(); // Only clears rule detail fields, preserves Event and ProductTypes
    renderGrid();
    setFormFieldsEnabled(false);
    // Explicitly enable Event dropdown after refresh so user can select again
    const eventField = qs("#Event");
    if (eventField) {
      eventField.disabled = false;
    }
    updateActionPanelButtons();
    showMessage("Screen cleared - select an event and click View", "info");
  }

  function updateInlineButtons() {
    // Centralized inline button state management
    // state.editModeActive is true when Edit button was clicked (enables New/Alter/Remove)
    const isEditing = state.mode === MODES.ADD || state.mode === MODES.UPDATE;
    const hasRowSelected = state.selectedRowIndex >= 0;
    
    qsa("[data-inline-action]").forEach((btn) => {
      const action = btn.getAttribute("data-inline-action");
      switch (action) {
        case "new":
          // New: enabled only when editModeActive (Edit clicked) and not in ADD/UPDATE
          btn.disabled = !state.editModeActive || isEditing;
          break;
        case "alter":
          // Alter: enabled when editModeActive and not in ADD/UPDATE mode
          btn.disabled = !state.editModeActive || isEditing;
          break;
        case "remove":
          // Remove: enabled when editModeActive and not in ADD/UPDATE mode
          btn.disabled = !state.editModeActive || isEditing;
          break;
        case "update":
          // Update: enabled only in ADD or UPDATE mode (actively editing a record)
          btn.disabled = !isEditing;
          break;
        case "clear":
          // Clear: enabled only in ADD or UPDATE mode (to cancel current edit)
          btn.disabled = !isEditing;
          break;
      }
    });
    
    // Also update order buttons
    updateOrderButtons();
  }

  function updateActionPanelButtons() {
    // Mirrors accounting-rule.js button logic pattern
    const isEditable = state.mode === MODES.ADD || state.mode === MODES.UPDATE;
    const hasLoaded = state.hasAttemptedView && state.ruleDetails.length > 0;
    const noRecordsFound = state.hasAttemptedView && state.ruleDetails.length === 0;
    const hasRecordsToSave = state.ruleDetails.length > 0;
    
    // Update inline buttons as well
    updateInlineButtons();
    
    // Enable/disable action panel buttons based on current state
    qsa(".action-panel [data-action]").forEach((btn) => {
      const action = btn.getAttribute("data-action");
      
      switch (action) {
        case "view":
          // View: disabled in ADD/UPDATE mode or after View was attempted
          btn.disabled = isEditable || (state.mode === MODES.VIEW && state.hasAttemptedView);
          break;
        case "add":
          // Add: disabled in ADD/UPDATE mode, only enabled when no records found after View
          btn.disabled = isEditable || !(state.mode === MODES.VIEW && noRecordsFound);
          console.log("[RuleDetails] Add button state: disabled=" + btn.disabled + ", hasAttemptedView=" + state.hasAttemptedView + ", noRecordsFound=" + noRecordsFound + ", mode=" + state.mode);
          break;
        case "edit":
          // Edit: disabled in ADD/UPDATE mode, enabled in VIEW mode when records are loaded
          btn.disabled = isEditable || !(state.mode === MODES.VIEW && hasLoaded);
          console.log("[RuleDetails] Edit button state: disabled=" + btn.disabled + ", hasAttemptedView=" + state.hasAttemptedView + ", hasRecords=" + (state.ruleDetails.length > 0) + ", mode=" + state.mode);
          break;
        case "delete":
          // Delete: disabled in ADD/UPDATE mode, enabled in VIEW mode when records are loaded
          btn.disabled = isEditable || !(state.mode === MODES.VIEW && hasLoaded);
          break;
        case "save":
          // Save: enabled only when in ADD/UPDATE mode AND there are records in the grid
          btn.disabled = !(isEditable && hasRecordsToSave);
          break;
        case "cancel":
          // Cancel: enabled in ADD/UPDATE mode, or in VIEW mode after View with records
          btn.disabled = !(isEditable || (state.mode === MODES.VIEW && hasLoaded));
          console.log("[RuleDetails] Cancel button state: disabled=" + btn.disabled + ", mode=" + state.mode);
          break;
        case "back":
          // Back always enabled
          btn.disabled = false;
          break;
      }
    });
  }

  function handleBack() {
    closeSubmodule();
  }

  function closeSubmodule() {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        {
          action: "submoduleClosed",
          source: "rule-details",
        },
        "*"
      );
    } else {
      window.location.href = "../product/accounting-rule.html";
    }
  }

  // ============================================
  // EVENT HANDLERS
  // ============================================
  function handleComponentChange() {
    const componentId = getFieldValue("Component");
    const component = state.components.find((c) => c.ComponentID === componentId);
    const detailsEl = qs("#ComponentDetails");
    if (detailsEl) {
      detailsEl.textContent = component?.ComponentDescription || "Component details will appear here";
    }
    
    // Auto-populate Narration field with component description
    if (component?.ComponentDescription) {
      setFieldValue("Narration", component.ComponentDescription);
      console.log("[RuleDetails] Narration auto-populated with:", component.ComponentDescription);
    }
  }

  function handleEventChange() {
    const eventId = getFieldValue("Event");
    console.log("[RuleDetails] Event changed:", eventId);
    // Filter components based on selected event
    filterComponentsByEvent(eventId);
    // Clear component selection when event changes
    setFieldValue("Component", "");
    qs("#ComponentDetails").textContent = "Component details will appear here";
  }

  // ============================================
  // INITIALIZATION
  // ============================================
  function bindEventHandlers() {
    // Title bar buttons (refresh, maximize, close)
    qsa(".de-title-btn[data-action]").forEach((btn) => {
      const action = btn.getAttribute("data-action");
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        if (action === "refresh") {
          handleRefresh();
        }
        // Other buttons like maximize and close are handled elsewhere
      });
    });

    // Inline actions
    qsa("[data-inline-action]").forEach((btn) => {
      const action = btn.getAttribute("data-inline-action");
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        switch (action) {
          case "new":
            handleNew();
            break;
          case "alter":
            handleAlter();
            break;
          case "remove":
            handleRemove();
            break;
          case "update":
            handleUpdate();
            break;
          case "clear":
            handleClear();
            break;
        }
      });
    });

    // Order controls
    qsa("[data-order-action]").forEach((btn) => {
      const action = btn.getAttribute("data-order-action");
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        if (action === "up") handleOrderUp();
        if (action === "down") handleOrderDown();
      });
    });

    // Action panel
    qsa(".action-panel [data-action]").forEach((btn) => {
      const action = btn.getAttribute("data-action");
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        switch (action) {
          case "view":
            handleView();
            break;
          case "add":
            handleAdd();
            break;
          case "edit":
            handleEdit();
            break;
          case "delete":
            handleDelete();
            break;
          case "save":
            handleSave();
            break;
          case "cancel":
            handleCancel();
            break;
          case "back":
            handleBack();
            break;
        }
      });
    });

    // Field change handlers
    const componentSelect = qs("#Component");
    if (componentSelect) {
      componentSelect.addEventListener("change", handleComponentChange);
    }

    const eventSelect = qs("#Event");
    if (eventSelect) {
      eventSelect.addEventListener("change", handleEventChange);
    }
  }

  async function init(parentData) {
    console.log("[RuleDetails] Initializing with data:", parentData);

    state.parentData = parentData;

    // Set product type from parent - this should be the description/name of the product type
    if (parentData?.RequestData?.ProductTypeDescription) {
      const productType = parentData.RequestData.ProductTypeDescription;
      console.log("[RuleDetails] Setting ProductTypes to:", productType);
      setFieldValue("ProductTypes", productType);
    } else {
      console.warn("[RuleDetails] No ProductTypeDescription found in parent data");
    }

    // Bind event handlers
    bindEventHandlers();

    // Load dropdowns
    showLoading(true);
    await Promise.all([loadEvents(), loadComponents(), loadAccountTags()]);
    showLoading(false);

    // Set initial button states - only View enabled on page load
    qsa(".action-panel [data-action]").forEach((btn) => {
      const action = btn.getAttribute("data-action");
      if (action === "view") {
        btn.disabled = false;  // ONLY View is enabled
        console.log("[RuleDetails] View button ENABLED");
      } else if (action === "back") {
        btn.disabled = false;  // Back is always enabled
        console.log("[RuleDetails] Back button ENABLED");
      } else {
        btn.disabled = true;   // All others disabled: Add, Edit, Delete, Save, Cancel
        console.log(`[RuleDetails] ${action} button DISABLED`);
      }
    });
    
    // Also disable all inline action buttons on page load
    qsa("[data-inline-action]").forEach((btn) => {
      btn.disabled = true;
      console.log(`[RuleDetails] ${btn.getAttribute("data-inline-action")} inline button DISABLED`);
    });

    setFormFieldsEnabled(false);
    showMessage("Click View to load rule details", "info");
  }

  // ============================================
  // MESSAGE LISTENER
  // ============================================
  window.addEventListener("message", function (event) {
    if (event.data?.type === "init") {
      console.log("[RuleDetails] Received init message:", event.data);
      init(event.data.data);
    }
  });

  // ============================================
  // EXPOSE FOR DEBUGGING
  // ============================================
  window.RuleDetailsModule = {
    state,
    init,
    loadRuleDetails,
    handleNew,
    handleAlter,
    handleRemove,
    handleUpdate,
    handleClear,
    handleSave,
  };

  console.log("[RuleDetails] Module ready");
})();
