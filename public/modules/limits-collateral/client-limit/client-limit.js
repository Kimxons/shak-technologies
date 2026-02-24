/* Client Limit Modern Logic - strictly mapping Image 1 fields */ document.addEventListener(
  "DOMContentLoaded",
  function () {
    // BASIC WIRING ONLY (Cash Transaction style):
    // - Keep normal form flow UI (VIEW/ADD/EDIT) for button + field enable/disable.
    // - Do NOT call services / APIs (Load/Next/Previous/Save/Withdraw are not wired).
    // - Toasts are reserved for warnings/errors, not for every click.
    const BASIC_WIRING_ONLY = false;
    const { ServiceLoader } = window;

    // Load Flatpickr dependencies
    async function setupDatePickers() {
      // Load CSS
      if (!document.querySelector("#flatpickr-css")) {
        const link = document.createElement("link");
        link.id = "flatpickr-css";
        link.rel = "stylesheet";
        link.href =
          "https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css";
        document.head.appendChild(link);
      }

      // Load JS
      if (!window.flatpickr) {
        await new Promise((resolve) => {
          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/npm/flatpickr";
          script.onload = resolve;
          script.onerror = () => {
            console.warn("Failed to load flatpickr");
            resolve();
          };
          document.head.appendChild(script);
        });
      }

      if (window.flatpickr) {
        const inputs = document.querySelectorAll("[data-date-picker]");
        inputs.forEach((el) => {
          // Initialize flatpickr with DD-MMM-YYYY format to match GlobalUtils.formatDate
          const fp = flatpickr(el, {
            dateFormat: "d-M-Y",
            allowInput: true,
            disableMobile: true,
          });
          // Set initial value if present
          if (el.value) {
            fp.setDate(el.value);
          }
        });
      }
    }

    function notifyParent(action, payload) {
      if (!action) return;
      if (window.parent === window) return;
      try {
        window.parent.postMessage(
          {
            type: "kairo-action",
            module: "client-limit",
            action,
            payload: payload || null,
          },
          "*",
        );
      } catch {
        // Ignore cross-window messaging issues.
      }
    }

    function openDatePickerById(id) {
      const input = document.getElementById(id);
      if (!input) {
        console.warn(`[ClientLimit] Date input not found: ${id} `);
        return;
      }
      // Check if flatpickr is available on the element
      const fp = input._flatpickr;
      // If enabled, try to show proper picker
      if (!input.disabled && !input.hasAttribute("readonly")) {
        if (fp) {
          fp.open();
        } else {
          input.focus();
          input.click();
        }
      } else {
        // Provide feedback if disabled
        showMessage("Enable Editing (Add/Edit) to change dates.", "warning");
      }
    }

    function wireDatePickerButtons() {
      // Use a broad selector to catch all date buttons
      const btns = document.querySelectorAll(".btn-date, [data-open-date]");
      console.log(`[ClientLimit] Wiring ${btns.length} date picker buttons`);
      btns.forEach((btn) => {
        // Remove old listeners to prevent duplicates (cloning usually works but this is safer)
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation(); // Stop bubbling
          const id = newBtn.getAttribute("data-open-date");
          if (id) {
            console.log(`[ClientLimit] Date button clicked for: ${id} `);
            openDatePickerById(id);
          } else {
            console.warn(
              "[ClientLimit] Date button clicked but no data-open-date attribute found",
            );
          }
        });
      });
    }

    // Signal load to the dashboard immediately (useful for verification)
    notifyParent("init", { href: window.location?.href || null });

    // Load necessary services (kept for non-basic mode)
    let LimitsCollateralService = null;
    let servicesReady = false;
    let servicesLoading = false;
    let serviceLoadError = null;
    let isBusy = false;

    function setBusyState(busy) {
      isBusy = !!busy;
      const disable = !!busy;
      const btns = [
        els.btnWithdraw,
        els.btnView,
        els.btnAdd,
        els.btnEdit,
        els.btnSave,
        els.btnCancel,
        els.btnPrevious,
        els.btnNext,
      ];
      btns.forEach((b) => {
        if (!b) return;
        b.disabled = disable;
      });
    }

    async function startServiceLoading() {
      if (servicesLoading || servicesReady) return;
      servicesLoading = true;

      // Try to hide the redundant modal header in the parent shell
      try {
        if (window.parent && window.parent.document) {
          // Find potential parent modal containers
          const parentModal = window.parent.document.querySelector(
            '#clientLimitModal, [id*="clientLimit"]',
          );
          if (parentModal) {
            const parentHeader = parentModal.querySelector(
              ".modal-header, .cbs-modal-header",
            );
            if (parentHeader) {
              parentHeader.style.display = "none";
              // Ensure the modal content expands to fill the space
              const modalBody = parentModal.querySelector(
                ".modal-body, .cbs-modal-body",
              );
              if (modalBody) modalBody.style.padding = "0";
            }
          }
        }
      } catch (e) {
        console.warn(
          "[ClientLimit] Note: Parent header not hidden (likely cross-origin or already hidden)",
        );
      }

      notifyParent("services-loading");

      if (!ServiceLoader) {
        serviceLoadError = new Error("ServiceLoader not found");
        console.error("[ClientLimit] ServiceLoader not found");
        showMessage("Services not available (ServiceLoader missing).", "error");
        notifyParent("services-error", {
          message: String(serviceLoadError?.message || serviceLoadError),
        });
        return;
      }

      try {
        await ServiceLoader.loadCore();
        await ServiceLoader.loadLimitsCollateralService();
        await ServiceLoader.loadSearchService(); // Load search service for search modals
        await ServiceLoader.loadLookupService(); // Load lookup service for system codes

        // Wait briefly for the global LimitsCollateralService to be registered
        try {
          await ServiceLoader.waitForService("LimitsCollateralService", 5000);
        } catch (waitErr) {
          // timeout - proceed to check anyway
        }

        LimitsCollateralService = window.LimitsCollateralService || null;
        servicesReady = !!LimitsCollateralService;

        // Populate system dropdowns
        if (servicesReady) {
          void loadSystemDropdowns();
        }

        notifyParent("services-ready", { ok: servicesReady });

        if (!servicesReady) {
          serviceLoadError = new Error(
            "LimitsCollateralService not found after loading scripts",
          );
          console.error(
            "[ClientLimit] LimitsCollateralService missing after load",
          );
          showMessage(
            "Services loaded but LimitsCollateralService missing.",
            "error",
          );
          notifyParent("services-error", {
            message: String(serviceLoadError?.message || serviceLoadError),
          });
        }
      } catch (err) {
        serviceLoadError = err;
        console.error("[ClientLimit] Failed to load services:", err);
        showMessage(
          "Failed to load services. Buttons still work, but data actions may fail.",
          "error",
        );
        notifyParent("services-error", {
          message: String(err?.message || err),
        });
      }
    }

    function getCurrentOperatorId() {
      const nimbleSessionStr = localStorage.getItem("nimble_auth_session");
      const nimbleSession = JSON.parse(nimbleSessionStr || "{}");
      return (
        nimbleSession.operatorID ||
        nimbleSession.operatorId ||
        nimbleSession.userId ||
        "ADMIN"
      );
    }

    function getCurrentOperatorName() {
      const nimbleSessionStr = localStorage.getItem("nimble_auth_session");
      const nimbleSession = JSON.parse(nimbleSessionStr || "{}");
      return (
        nimbleSession.fullName || nimbleSession.operatorName || "System Admin"
      );
    }

    function getCurrentBranchId() {
      const nimbleSessionStr = localStorage.getItem("nimble_auth_session");
      const nimbleSession = JSON.parse(nimbleSessionStr || "{}");
      return nimbleSession.branchID || nimbleSession.branchId || "000";
    }

    function getCurrentBranchName() {
      const nimbleSessionStr = localStorage.getItem("nimble_auth_session");
      const nimbleSession = JSON.parse(nimbleSessionStr || "{}");
      return nimbleSession.branchName || "HEAD OFFICE-ADMIN";
    }

    async function loadSystemDropdowns() {
      if (!window.LookupService) {
        return;
      }
      try {
        const dpOptions =
          await window.LookupService.getSystemCodeOptions("DPDefinitionID");
        if (dpOptions && dpOptions.length > 0) {
          const select = els.dpDefinition;
          if (select) {
            // Keep the default --Select--
            select.innerHTML = '<option value="">--Select--</option>';
            dpOptions.forEach((opt) => {
              const o = document.createElement("option");
              o.value = opt.value;
              o.textContent = opt.label;
              select.appendChild(o);
            });
          }
        } else {
          console.warn("[ClientLimit] No options returned for DPDefinitionID");
        }
      } catch (err) {
        console.error("[ClientLimit] Error loading dynamic dropdowns:", err);
      }
    }

    const branchMap = {
      "000": "HEAD OFFICE-ADMIN",
      "0325": "Tillil",
      "000001": "BANCHAMLEAK TADLLEL",
      "0101": "Head Office",
      "0603": "Main Branch",
    };

    function updateBranchName() {
      if (!els.branchId || !els.branchName) return;
      const code = els.branchId.value.trim();
      const name =
        branchMap[code] ||
        (code === getCurrentBranchId() ? getCurrentBranchName() : "");
      els.branchName.value = name;
    }

    function requireValue(value, label) {
      const v = (value || "").toString().trim();
      if (!v) {
        showMessage(`${label} is required`, "error");
        return null;
      }
      return v;
    }

    function setElValue(el, value) {
      if (!el) return;
      const val = value == null ? "" : String(value);
      if (
        el.tagName === "INPUT" ||
        el.tagName === "SELECT" ||
        el.tagName === "TEXTAREA"
      ) {
        el.value = val;
      } else {
        // For span elements (used in audit section)
        el.textContent = val;
      }
    }

    function setDateValue(el, value) {
      if (!el) return;
      const dateStr = value == null ? "" : String(value);
      // Set the value directly
      el.value = dateStr;
      // If flatpickr is initialized, sync it
      if (el._flatpickr) {
        el._flatpickr.setDate(dateStr, false);
      }
      // Force a re-render
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }

    function coalesceValue(...values) {
      for (const v of values) {
        if (v == null) continue;
        const s = String(v).trim();
        if (s !== "") return v;
      }
      return "";
    }

    function parseDate(val) {
      if (!val) return "";
      // Use GlobalUtils.formatDate for consistent date formatting (DD-MMM-YYYY)
      if (window.GlobalUtils && window.GlobalUtils.formatDate) {
        return window.GlobalUtils.formatDate(val);
      }
      // Fallback if GlobalUtils is not available
      let d = new Date(val);
      if (isNaN(d.getTime()) && typeof val === "string" && val.includes("-")) {
        d = new Date(val.replace(/-/g, " "));
      }
      if (isNaN(d.getTime())) return "";
      const day = String(d.getDate()).padStart(2, "0");
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    }

    function formatDateForAPI(val) {
      if (!val) return null;
      // If it's already YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val;
      // Handle dd/M/yyyy
      const d = new Date(val.replace(/\//g, " "));
      if (isNaN(d.getTime())) return null;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year} -${month} -${day} `;
    }

    function setDropdownValue(selectEl, value) {
      if (!selectEl || value == null) return;
      const valStr = String(value).trim();
      if (valStr === "") return;
      let found = false;
      const opts = selectEl.options;
      for (let i = 0; i < opts.length; i++) {
        // Check value or label (case insensitive for label)
        if (
          opts[i].value === valStr ||
          opts[i].textContent.trim().toLowerCase() === valStr.toLowerCase()
        ) {
          selectEl.selectedIndex = i;
          found = true;
          break;
        }
      }
      if (!found && valStr !== "--Select--") {
        const opt = document.createElement("option");
        opt.value = valStr;
        opt.textContent = valStr;
        selectEl.appendChild(opt);
        selectEl.value = valStr;
      }
    }

    function populateFormAndGrid(respData) {
      if (!respData) return;
      // CoreApi.normalizeResponse puts details in data, details01, etc.
      const details = respData.Details || [];
      const details01 = respData.Details01 || [];
      const details02 = respData.Details02 || [];

      // Primary record object (for header fields)
      const d =
        (Array.isArray(details02) ? details02[0] : details02) ||
        (Array.isArray(details01) ? details01[0] : details01) ||
        (Array.isArray(details) ? details[0] : details) ||
        {};

      // Search / Header
      setElValue(
        els.branchId,
        coalesceValue(
          d.OurBranchID,
          d.OurBranchId,
          d.BranchID,
          els.branchId?.value,
        ),
      );
      setElValue(
        els.limitId,
        coalesceValue(d.LimitID, d.LimitId, d.limitid, els.limitId?.value),
      );
      setElValue(
        els.referenceNo,
        coalesceValue(d.RefNo, d.referenceNo, d.Refno, 0),
      );
      setElValue(
        els.clientId,
        coalesceValue(d.ClientID, d.ClientId, d.clientid),
      );
      setElValue(
        els.clientName,
        coalesceValue(d.ClientName, d.Name, d.clientname),
      );
      setElValue(
        els.currencyId,
        coalesceValue(d.CurrencyID, d.CurrencyId, d.currencyid),
      );
      setElValue(
        els.currencyName,
        coalesceValue(d.CurrencyName, d.Description, d.currencyname),
      );

      // Dropdowns / Dates
      setElValue(
        els.limitLevel,
        coalesceValue(d.LimitLevel, d.limitLevel, "0000"),
      );
      setDropdownValue(
        els.limitType,
        coalesceValue(d.LimitTypeID, d.LimitType, d.limittypeid, "Revolving"),
      );

      // Log the raw date values before parsing
      console.log("[ClientLimit] Raw date values from API:");
      console.log(
        "  EffectiveDate:",
        d.EffectiveDate,
        "effectivedate:",
        d.effectivedate,
      );
      console.log("  ExpiryDate:", d.ExpiryDate, "expirydate:", d.expirydate);
      console.log(
        "  SanctionedDate:",
        d.SanctionedDate,
        "sanctioneddate:",
        d.sanctioneddate,
      );

      setDateValue(
        els.effectiveDate,
        parseDate(coalesceValue(d.EffectiveDate, d.effectivedate)),
      );
      setDateValue(
        els.expiryDate,
        parseDate(coalesceValue(d.ExpiryDate, d.expirydate)),
      );
      setDateValue(
        els.sanctionedDate,
        parseDate(coalesceValue(d.SanctionedDate, d.sanctioneddate)),
      );
      setDropdownValue(
        els.dpDefinition,
        coalesceValue(
          d.DPDefinitionID,
          d.DpDefinitionID,
          d.DPDefinition,
          d.dpdefinitionid,
          "Sanctioned Limit",
        ),
      );

      // After setting DP Definition, trigger the change event to show/hide appropriate grids
      if (els.dpDefinition) {
        els.dpDefinition.dispatchEvent(new Event("change"));
      }

      // Amounts
      setElValue(
        els.sanctionedLimit,
        formatNum(
          coalesceValue(
            d.Sanctionedlimit,
            d.SanctionedLimit,
            d.sanctionedlimit,
          ),
        ),
      );
      setElValue(
        els.drawingPower,
        formatNum(coalesceValue(d.DrawingPower, d.drawingpower, 0)),
      );
      setElValue(els.remarks, coalesceValue(d.Remarks, d.remarks, ""));

      // Status / Totals
      setElValue(els.status, coalesceValue(d.Status, d.status, "Active"));
      setElValue(
        els.netCollateral,
        formatNum(
          coalesceValue(
            d.NetCollateralValue,
            d.NetCollateral,
            d.netcollateral,
            0,
          ),
        ),
      );

      // BTS / Audit
      setElValue(els.createdBy, coalesceValue(d.CreatedBy, d.createdby, ""));
      setElValue(els.createdOn, coalesceValue(d.CreatedOn, d.createdon, ""));
      setElValue(els.modifiedBy, coalesceValue(d.ModifiedBy, d.modifiedby, ""));
      setElValue(els.modifiedOn, coalesceValue(d.ModifiedOn, d.modifiedon, ""));

      // Limit Details Table (The Grid)
      // We always fetch the specific details for the grid because the main 'getLimitClients'
      // response often contains incomplete or summary data in Details01.
      // This ensures we match the legacy application's behavior.
      void loadLimitClientDetails();
      currentData = d;
    }

    let currentGridRows = [];
    function renderLimitDetailsGrid(rows, isEditable = false) {
      currentGridRows = rows || []; // Update global store
      const tbody = document.getElementById("LimitDetailsTableBody");
      if (!tbody) return;
      tbody.innerHTML = "";

      const list = Array.isArray(rows) ? rows : [];
      if (list.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="8" class="text-center">No limit details found.</td></tr>';
        return;
      }

      const getVal = (obj, key) => {
        if (!obj) return "";
        return (
          obj[key] ||
          obj[key.toLowerCase()] ||
          obj[key.toUpperCase()] ||
          obj[key.charAt(0).toLowerCase() + key.slice(1)] ||
          ""
        );
      };
      const getNum = (obj, key) => formatNumGrid(getVal(obj, key));
      const getShorthandType = (val) => {
        if (!val) return "";
        const v = String(val).trim().toLowerCase();
        if (v.includes("non")) return "N";
        if (v.includes("rev")) return "R";
        return val.charAt(0).toUpperCase();
      };
      const getShorthandStatus = (val) => {
        if (!val) return "";
        const v = String(val).trim().toLowerCase();
        if (v.includes("active") || v.includes("activate") || v === "a")
          return "A";
        if (v.includes("inactive") || v.includes("deactivate") || v === "i")
          return "I";
        return val.charAt(0).toUpperCase();
      };

      list.forEach((row, index) => {
        const tr = document.createElement("tr");
        if (!isEditable) {
          // Read-only mode
          tr.innerHTML = `
                    <td>${getVal(row, "LimitID")}</td>
                    <td>${getVal(row, "ProductID")}</td>
                    <td class="text-right">${getNum(row, "LimitAmount")}</td>
                    <td class="text-right">${getNum(row, "UtilizedAmount")}</td>
                    <td class="text-center">${getShorthandType(getVal(row, "LimitTypeID"))}</td>
                    <td class="text-center">${getShorthandStatus(getVal(row, "LimitStatusID"))}</td>
                    <td>${getVal(row, "WithdrawnBy")}</td>
                    <td>${getVal(row, "WithdrawnReason")}</td>
`;
        } else {
          // Editable mode
          const limitAmount = getVal(row, "LimitAmount");
          const limitType = getVal(row, "LimitTypeID");
          const limitStatus = getVal(row, "LimitStatusID");
          tr.innerHTML = `
                    <td>${getVal(row, "LimitID")}</td>
                    <td>${getVal(row, "ProductID")}</td>
                    <td class="text-right">
                        <input type="text" class="form-control form-control-sm text-right money-field"
                                value="${formatNum(limitAmount)}"
                                data-row-index="${index}" data-field="LimitAmount">
                    </td>
                    <td class="text-right">${getNum(row, "UtilizedAmount")}</td>
                    <td class="text-center">
                        <select class="form-select form-select-sm" data-row-index="${index}" data-field="LimitTypeID">
                            <option value="Revolving" ${limitType === "Revolving" || limitType === "R" ? "selected" : ""}>Revolving</option>
                            <option value="Non Revolving" ${limitType === "Non Revolving" || limitType === "N" ? "selected" : ""}>Non Revolving</option>
                        </select>
                    </td>
                    <td class="text-center">
                        <select class="form-select form-select-sm" data-row-index="${index}" data-field="LimitStatusID">
                            <option value="A" ${limitStatus === "A" || limitStatus === "Active" || limitStatus === "Activate" ? "selected" : ""}>Activate</option>
                            <option value="I" ${limitStatus === "I" || limitStatus === "Inactive" || limitStatus === "Deactivate" ? "selected" : ""}>Deactivate</option>
                        </select>
                    </td>
                    <td>${getVal(row, "WithdrawnBy")}</td>
                    <td>${getVal(row, "WithdrawnReason")}</td>
`;
        }
        tbody.appendChild(tr);
      });

      // Re-attach money field listeners if editable
      if (isEditable) {
        tbody.querySelectorAll(".money-field").forEach((f) => {
          f.addEventListener("blur", function () {
            if (this.value) this.value = formatNum(this.value);
          });
          f.addEventListener("focus", function () {
            if (this.value) this.value = this.value.replace(/,/g, "");
          });
        });
      }
    }

    async function loadLimitClientDetails() {
      const clientId = (els.clientId?.value || "").trim();
      if (!clientId) {
        renderLimitDetailsGrid([]);
        return;
      }
      if (!LimitsCollateralService) {
        console.warn(
          "[ClientLimit] LimitsCollateralService not ready for details fetch",
        );
        return;
      }
      try {
        const requestData = {
          OurBranchID: els.branchId?.value || getCurrentBranchId(),
          ClientID: clientId,
          LimitID: (els.limitId?.value || "").trim() || "N",
          OperatorID: getCurrentOperatorId(),
        };
        const resp =
          await LimitsCollateralService.getLimitClientDetails(requestData);
        if (resp.success) {
          // Handle various response structures
          let rows = [];
          if (Array.isArray(resp.data)) {
            rows = resp.data;
          } else if (resp.data) {
            rows =
              resp.data.Details ||
              resp.data.Details01 ||
              resp.data.details ||
              [];
          }
          renderLimitDetailsGrid(rows);
        } else {
          console.warn(
            "[ClientLimit] getLimitClientDetails failed:",
            resp.message,
          );
          renderLimitDetailsGrid([]);
        }
      } catch (err) {
        console.error("[ClientLimit] Error loading details:", err);
        renderLimitDetailsGrid([]);
      }
    }

    async function viewRecord() {
      if (isBusy) return;
      if (!servicesReady) await startServiceLoading();
      if (!LimitsCollateralService) {
        showMessage("Services not ready (cannot view record).", "error");
        return;
      }

      const OurBranchID = els.branchId?.value || getCurrentBranchId();
      const LimitID = (els.limitId?.value || "").trim();
      const ClientID = (els.clientId?.value || "").trim();
      const OperatorID = getCurrentOperatorId();

      if (!LimitID) {
        showMessage("Please enter a Limit ID", "warning");
        return;
      }

      const requestData = {
        OurBranchID,
        LimitID,
        RefNo: els.referenceNo?.value || "0",
        ClientID: ClientID || "N", // 'N' for search-all-by-limit if needed
        OperatorID,
        Direction: "0",
      };

      showMessage("Fetching record...", "info");
      setBusyState(true);
      try {
        const result =
          await LimitsCollateralService.getLimitClients(requestData);
        if (!result || !result.success) {
          showMessage(result?.message || "Failed to fetch record.", "error");
          return;
        }
        if (!result.data) {
          showMessage("No record found.", "warning");
          return;
        }
        populateFormAndGrid(result.data);
        switchMode("VIEW");
        showMessage("Record loaded.", "success");
      } catch (err) {
        console.error("[ClientLimit] View error:", err);
        showMessage(`Error loading data: ${err.message || err} `, "error");
      } finally {
        setBusyState(false);
      }
    }

    // Form State
    let currentMode = "VIEW";
    let currentData = null;
    let toastTimer = null;

    // DOM References
    const els = {
      // Search/Nav
      branchId: document.getElementById("BranchId"),
      branchName: document.getElementById("BranchName"),
      limitId: document.getElementById("LimitId"),
      referenceNo: document.getElementById("ReferenceNo"),
      clientId: document.getElementById("ClientId"),
      clientName: document.getElementById("ClientName"),
      currencyId: document.getElementById("CurrencyId"),
      currencyName: document.getElementById("CurrencyName"),

      // Dropdowns
      limitLevel: document.getElementById("LimitLevel"),
      limitType: document.getElementById("LimitType"),
      effectiveDate: document.getElementById("EffectiveDate"),
      expiryDate: document.getElementById("ExpiryDate"),
      sanctionedDate: document.getElementById("SanctionedDate"),
      dpDefinition: document.getElementById("DpDefinition"),

      // Amounts
      sanctionedLimit: document.getElementById("SanctionedLimit"),
      drawingPower: document.getElementById("DrawingPower"),
      remarks: document.getElementById("Remarks"),
      collateralContainer: document.getElementById(
        "CollateralDetailsContainer",
      ),

      // BTS
      netCollateral: document.getElementById("NetCollateralValue"),

      status: document.getElementById("Status"),
      withdrawnDate: document.getElementById("WithdrawnDate"),
      withdrawnReason: document.getElementById("WithdrawnReason"),
      createdBy: document.getElementById("CreatedBy"),
      modifiedBy: document.getElementById("ModifiedBy"),
      supervisedBy: document.getElementById("SupervisedBy"),
      createdOn: document.getElementById("CreatedOn"),
      modifiedOn: document.getElementById("ModifiedOn"),
      supervisedOn: document.getElementById("SupervisedOn"),

      // Actions
      btnWithdraw: document.getElementById("btnWithdraw"),
      btnView: document.getElementById("btnView"),
      btnAdd: document.getElementById("btnAdd"),
      btnEdit: document.getElementById("btnEdit"),
      btnSave: document.getElementById("btnSave"),
      btnCancel: document.getElementById("btnCancel"),
      btnPrevious: document.getElementById("btnPrevious"),
      btnNext: document.getElementById("btnNext"),
      btnRefresh: document.getElementById("btnRefresh"),
      btnMinimize: document.getElementById("btnMinimize"),
      btnMaximize: document.getElementById("btnMaximize"),
      btnCloseWin: document.querySelector("[data-window-action='close']"),

      // UI Helpers
      toast: document.getElementById("formToast"),

      // Limit Details Actions
      btnAlterLimit: document.getElementById("btnAlterLimit"),
      btnUpdateLimit: document.getElementById("btnUpdateLimit"),
      limitDetailsContainer: document.getElementById("LimitDetailsContainer"),
      limitDetailsActions: document.getElementById("LimitDetailsActions"),

      // Collateral Details Elements
      collateralId: document.getElementById("CollateralId"),
      collateralRefNo: document.getElementById("CollateralRefNo"),
      apportionedRatio: document.getElementById("ApportionedRatio"),
      collateralMargin: document.getElementById("CollateralMargin"),
      apportionedValue: document.getElementById("ApportionedValue"),
      apportionedCollateralValue: document.getElementById(
        "ApportionedCollateralValue",
      ),
      assignedDate: document.getElementById("AssignedDate"),
      limitCollateralValue: document.getElementById("LimitCollateralValue"),
      btnCollateralNew: document.getElementById("btnCollateralNew"),
      btnCollateralAlter: document.getElementById("btnCollateralAlter"),
      btnCollateralUpdate: document.getElementById("btnCollateralUpdate"),
      btnCollateralRemove: document.getElementById("btnCollateralRemove"),
      btnCollateralClear: document.getElementById("btnCollateralClear"),
      btnCollateralWithdraw: document.getElementById("btnCollateralWithdraw"),
    };

    // --- Data Logic ---
    function switchMode(mode) {
      currentMode = mode.toUpperCase();
      notifyParent("mode", { mode: currentMode });
      const isView = currentMode === "VIEW";
      const isAdd = currentMode === "ADD";
      const isEdit = currentMode === "EDIT";

      // Buttons
      // Keep View action available even in VIEW mode (it performs READ).
      if (els.btnView) els.btnView.disabled = false;
      if (els.btnAdd) els.btnAdd.disabled = isAdd;
      // Basic wiring mode: allow Edit even without a loaded record.
      if (els.btnEdit)
        els.btnEdit.disabled = BASIC_WIRING_ONLY
          ? isEdit
          : isEdit || !currentData;
      if (els.btnSave) els.btnSave.disabled = isView;
      if (els.btnCancel) els.btnCancel.disabled = false;
      if (els.btnWithdraw) els.btnWithdraw.disabled = isAdd || !currentData;

      // Collateral Buttons
      const colButtons = [
        els.btnCollateralNew,
        els.btnCollateralAlter,
        els.btnCollateralRemove,
        els.btnCollateralClear,
        els.btnCollateralWithdraw,
      ];
      colButtons.forEach((btn) => {
        if (btn) btn.disabled = isView;
      });

      // Form Fields
      const fields = [
        els.branchId,
        els.limitId,
        els.referenceNo,
        els.clientId,
        els.currencyId,
        els.limitLevel,
        els.limitType,
        els.effectiveDate,
        els.expiryDate,
        els.sanctionedDate,
        els.dpDefinition,
        els.sanctionedLimit,
        els.drawingPower,
        els.remarks,
        // Collateral fields
        els.collateralId,
        els.collateralRefNo,
        els.apportionedRatio,
        els.collateralMargin,
        els.apportionedValue,
        els.apportionedCollateralValue,
        els.assignedDate,
        els.limitCollateralValue,
      ];

      const editableInView = new Set([
        els.branchId,
        els.limitId,
        els.referenceNo,
        els.clientId,
      ]);

      fields.forEach((f) => {
        if (!f) return;
        const isDatePicker = f.hasAttribute("data-date-picker");
        if (isView) {
          if (editableInView.has(f)) {
            f.removeAttribute("readonly");
            if (f.tagName === "SELECT") f.disabled = false;
            if (isDatePicker) {
              f.style.pointerEvents = "auto";
              f.style.opacity = "1";
            }
          } else {
            f.setAttribute("readonly", "true");
            if (f.tagName === "SELECT") f.disabled = true;
            if (isDatePicker) {
              f.style.pointerEvents = "none";
              f.style.opacity = "0.8";
            }
          }
        } else {
          f.removeAttribute("readonly");
          if (f.tagName === "SELECT") f.disabled = false;
          if (isDatePicker) {
            f.style.pointerEvents = "auto";
            f.style.opacity = "1";
          }
          // Primary Key protection
          if (isEdit && f === els.limitId) f.setAttribute("readonly", "true");
        }

        // Also toggle associated lookup buttons if they exist
        if (
          f.parentElement &&
          f.parentElement.classList.contains("lookup-group")
        ) {
          const btn = f.parentElement.querySelector(".btn-lookup");
          if (btn) {
            // In view mode, allow lookup ONLY for search fields
            if (isView && editableInView.has(f)) {
              btn.disabled = false;
              btn.style.pointerEvents = "auto";
              btn.style.opacity = "1";
            } else if (isView) {
              btn.disabled = true;
              btn.style.pointerEvents = "none";
              btn.style.opacity = "0.6";
            } else {
              // Add/Edit mode
              btn.disabled = false;
              btn.style.pointerEvents = "auto";
              btn.style.opacity = "1";
            }
          }
        }
      });

      if (isAdd) {
        clearForm();
        // Pre-populate BranchId and CreatedBy from the current session
        const brId = getCurrentBranchId();
        const opName = getCurrentOperatorName();
        if (els.branchId) {
          els.branchId.value = brId;
          updateBranchName();
        }
        if (els.createdBy) {
          els.createdBy.value = opName;
        }
        // Always prompt for Client ID when adding
        if (els.clientId) {
          setTimeout(() => {
            els.clientId.focus();
            showMessage(
              "Please enter or search for a Client ID to start.",
              "info",
            );
          }, 100);
        }
      }
    }

    function clearForm() {
      // Broad clear for all inputs in the form
      document
        .querySelectorAll(".form-content input, .form-content select")
        .forEach((el) => {
          el.value = "";
        });

      // Reset grids
      renderLimitDetailsGrid([]);
      renderCollateralDetailsGrid([]);
      collateralRecords = [];

      // Hide containers
      if (els.limitDetailsContainer)
        els.limitDetailsContainer.classList.add("hidden");
      if (els.limitDetailsActions)
        els.limitDetailsActions.classList.add("hidden");
      if (els.collateralContainer)
        els.collateralContainer.classList.add("hidden");

      currentData = null;
      console.log("[ClientLimit] Form and data cleared");
    }

    async function loadRecord(silent = false) {
      const id = (els.limitId?.value || "").trim();
      if (!id) {
        if (!silent) showMessage("Please enter a Limit ID", "warning");
        return;
      }
      if (!LimitsCollateralService) {
        if (!silent)
          showMessage("Services not ready (cannot load record).", "error");
        return;
      }

      if (!silent) showMessage("Fetching record...", "info");
      try {
        const resp = await LimitsCollateralService.getLimitClients({
          OurBranchID: els.branchId.value,
          LimitID: id,
          OperatorID: getCurrentOperatorId(),
          Direction: "1",
        });
        if (resp.success && resp.data) {
          populateFormAndGrid(resp.data);
          switchMode("VIEW");
          if (!silent) showMessage("Record loaded.", "success");
        } else {
          if (!silent) showMessage("No record found.", "warning");
        }
      } catch (err) {
        if (!silent)
          showMessage(`Error loading data: ${err.message || err} `, "error");
      }
    }

    async function navigate(direction) {
      if (!els.limitId) return;
      const currentId = (els.limitId.value || "").trim();
      if (!currentId) {
        showMessage("Please enter a Limit ID first.", "warning");
        return;
      }
      if (!LimitsCollateralService) {
        showMessage("Services not ready (cannot navigate).", "error");
        return;
      }

      const dir = String(direction) === "0" ? "0" : "1";
      showMessage(
        dir === "1" ? "Loading next record..." : "Loading previous record...",
        "info",
      );
      notifyParent(dir === "1" ? "next" : "previous", { from: currentId });

      try {
        const resp = await LimitsCollateralService.getLimitClients({
          OurBranchID: els.branchId.value,
          LimitID: currentId,
          OperatorID: getCurrentOperatorId(),
          Direction: dir,
        });
        if (resp.success && resp.data) {
          populateFormAndGrid(resp.data);
          switchMode("VIEW");
          showMessage("Record loaded.", "success");
        } else {
          showMessage("No more records found.", "warning");
        }
      } catch (err) {
        console.error("[ClientLimit] Navigate error:", err);
        showMessage(`Error loading data: ${err.message || err} `, "error");
      }
    }

    async function saveRecord() {
      if (currentMode === "VIEW") {
        console.warn("[ClientLimit] Save ignored: in VIEW mode");
        return;
      }
      notifyParent("save");

      if (!LimitsCollateralService) {
        console.error(
          "[ClientLimit] Save aborted: LimitsCollateralService missing",
        );
        showMessage("Services not ready (cannot save record).", "error");
        return;
      }

      // Validate form before saving
      if (!validateForm()) {
        console.warn("[ClientLimit] Save aborted: form validation failed");
        return;
      }

      showMessage("Saving record...", "info");
      // Disable button during save
      if (els.btnSave) {
        els.btnSave.disabled = true;
      }

      // Prepare data according to API specification
      const data = {
        OurBranchID: els.branchId.value || getCurrentBranchId(),
        LimitID: currentMode === "ADD" ? null : els.limitId.value,
        RefNo: els.referenceNo.value || 0,
        ClientID: els.clientId.value,
        CurrencyID: els.currencyId.value,
        EffectiveDate: formatDateForAPI(els.effectiveDate.value),
        ExpiryDate: formatDateForAPI(els.expiryDate.value),
        LimitTypeID: els.limitType.value,
        SanctionedDate: formatDateForAPI(els.sanctionedDate.value),
        SanctionedLimit:
          parseFloat(els.sanctionedLimit.value.replace(/,/g, "")) || 0,
        DPDefinitionID: els.dpDefinition.value || null,
        DrawingPower: parseFloat(els.drawingPower.value.replace(/,/g, "")) || 0,
        Remarks: els.remarks.value || "",
        WorkingDate: new Date().toISOString().split("T")[0] + " 00:00:00",
        IsChildLimit: 0,
        ParentLimitID: null,
        LimitLevel: els.limitLevel.value || "0000",
        CreatedBy: getCurrentOperatorId(),
        CreatedOn: null,
        SupervisedBy: null,
        NewRecord: currentMode === "ADD" ? 1 : 0,
      };

      try {
        // Use addClientLimit for ADD operation
        const result = await LimitsCollateralService.addClientLimit(data);
        if (result.success) {
          // Extract the generated LimitID from response (for new records)
          if (currentMode === "ADD") {
            const resData = result.data;
            const details01 = resData?.Details01?.[0];
            const details = resData?.Details?.[0];
            const topLevel = resData;
            const generatedLimitID =
              details01?.LimitID ||
              details01?.LimitId ||
              details01?.limitid ||
              details?.LimitID ||
              details?.LimitId ||
              details?.limitid ||
              topLevel?.LimitID ||
              topLevel?.LimitId ||
              topLevel?.limitid ||
              (Array.isArray(resData)
                ? resData[0]?.LimitID || resData[0]?.LimitId
                : null);

            if (generatedLimitID) {
              els.limitId.value = generatedLimitID;
              showMessage(
                `Record saved successfully.Limit ID: ${generatedLimitID} `,
                "success",
              );
            } else {
              console.warn(
                "[ClientLimit] LimitID not found in response:",
                result,
              );
              // Fallback: If we don't have a LimitID, we can't loadRecord, but we might still be okay if the user provides one?
              // showMessage('Record saved but LimitID not returned.', 'warning');
            }
          } else {
            showMessage("Record updated successfully.", "success");
          }
          currentData = data;
          switchMode("VIEW");
          // Reload to get complete record with server-generated fields
          if (els.limitId.value) {
            await loadRecord(true);
          }
        } else {
          showMessage(result.message || "Failed to save record", "error");
        }
      } catch (err) {
        console.error("[ClientLimit] Error saving record:", err);
        showMessage("Error saving record.", "error");
      } finally {
        // Re-enable button
        if (els.btnSave) {
          els.btnSave.disabled = false;
        }
      }
    }

    function validateForm() {
      const requiredFields = [
        { field: els.branchId, name: "Branch ID" },
        { field: els.clientId, name: "Client ID" },
        { field: els.currencyId, name: "Currency ID" },
        { field: els.limitType, name: "Limit Type" },
        { field: els.sanctionedLimit, name: "Sanctioned Limit" },
      ];

      // Remove previous validation states
      requiredFields.forEach(({ field }) => {
        if (field) {
          field.classList.remove("is-invalid");
          field.classList.remove("is-valid");
        }
      });

      // Validate each field
      let isValid = true;
      let firstInvalidField = null;
      const invalidFields = [];

      for (const { field, name } of requiredFields) {
        if (!field) {
          console.warn(
            `[ClientLimit] Validation: Field element not found for ${name}`,
          );
          continue;
        }
        const value = field.value ? field.value.trim() : "";
        if (!value || value === "" || value === "--Select--") {
          field.classList.add("is-invalid");
          invalidFields.push(name);
          if (!firstInvalidField) {
            firstInvalidField = field;
            showMessage(`${name} is required`, "error");
          }
          isValid = false;
        } else {
          field.classList.add("is-valid");
        }
      }

      if (firstInvalidField) {
        firstInvalidField.focus();
        console.error(
          `[ClientLimit] Validation failed.Missing fields: `,
          invalidFields,
        );
      } else {
      }

      return isValid;
    }

    async function withdrawRecord() {
      if (!currentData) return;
      if (!confirm("Are you sure you want to withdraw this limit?")) return;
      notifyParent("withdraw", { limitId: els.limitId?.value || null });

      if (!LimitsCollateralService) {
        showMessage("Services not ready (cannot withdraw).", "error");
        return;
      }

      showMessage("Withdrawing limit...", "info");
      // Logic to call LimitsCollateralService.withdrawLimitClient(...)
      setTimeout(() => {
        showMessage("Limit withdrawn successfully.", "success");
        loadRecord();
      }, 1000);
    }

    function mapToUI(d) {
      if (!d) return;
      // Helper to find value regardless of case
      const getVal = (key) => {
        const lowerKey = key.toLowerCase();
        const actualKey = Object.keys(d).find(
          (k) => k.toLowerCase() === lowerKey,
        );
        return actualKey ? d[actualKey] : null;
      };

      setElValue(els.limitId, getVal("LimitID") || "");
      setElValue(els.referenceNo, getVal("RefNo") || "");
      setElValue(els.clientId, getVal("ClientID") || "");
      setElValue(els.clientName, getVal("ClientName") || "");
      setElValue(els.currencyId, getVal("CurrencyID") || "");
      setElValue(els.currencyName, getVal("CurrencyName") || "");
      setElValue(els.sanctionedLimit, formatNum(getVal("SanctionedLimit")));
      setElValue(els.drawingPower, formatNum(getVal("DrawingPower")));
      setElValue(els.remarks, getVal("Remarks") || "");

      // BTS
      setElValue(els.status, getVal("Status") || "");
      setElValue(els.createdBy, getVal("CreatedBy") || "");
      setElValue(els.createdOn, getVal("CreatedOn") || "");
    }

    function formatNum(v) {
      if (v == null || v === "") return "0.00";
      const n =
        typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, ""));
      if (Number.isNaN(n)) return "0.00";
      return n.toLocaleString("en-US", { minimumFractionDigits: 2 });
    }

    /**
     * Legacy format for grid numbers (no commas)
     */
    function formatNumGrid(v) {
      if (v == null || v === "") return "0.00";
      const n =
        typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, ""));
      if (Number.isNaN(n)) return "0.00";
      return n.toFixed(2);
    }

    /**
     * Auto-generate the next Limit ID
     * Calls p_GetNextLimitID stored procedure
     */
    async function generateNextLimitId() {
      if (!servicesReady || !LimitsCollateralService) {
        showMessage("Services not ready. Please wait...", "warning");
        return null;
      }

      try {
        showMessage("Generating Limit ID...", "info");
        const requestData = {
          OurBranchID: els.branchId?.value || getCurrentBranchId(),
          OperatorID: getCurrentOperatorId(),
        };
        const response =
          await LimitsCollateralService.getNextLimitId(requestData);

        if (response.success && response.data) {
          // Try different possible response formats
          const nextLimitId =
            response.data.LimitID ||
            response.data.NextLimitID ||
            response.data.limitid ||
            response.data.nextlimitid ||
            (response.data.Details && response.data.Details[0]?.LimitID) ||
            (response.data.Details && response.data.Details[0]?.NextLimitID);

          if (nextLimitId) {
            setElValue(els.limitId, nextLimitId);
            showMessage(`Limit ID generated: ${nextLimitId} `, "success");
            return nextLimitId;
          } else {
            console.warn(
              "[ClientLimit] Limit ID not found in response:",
              response.data,
            );
            showMessage(
              "Limit ID generated but format unexpected. Check console.",
              "warning",
            );
            return null;
          }
        } else {
          const errorMsg = response.message || "Failed to generate Limit ID";
          showMessage(errorMsg, "error");
          console.error("[ClientLimit] Generate Limit ID failed:", response);
          return null;
        }
      } catch (error) {
        console.error("[ClientLimit] Error generating Limit ID:", error);
        showMessage(
          "Error generating Limit ID: " + (error.message || error),
          "error",
        );
        return null;
      }
    }

    function showMessage(msg, type = "info") {
      if (!els.toast) return;

      if (toastTimer) {
        clearTimeout(toastTimer);
        toastTimer = null;
      }

      // Add icon based on type
      let icon = "bi-info-circle";
      if (type === "success") icon = "bi-check-circle";
      if (type === "error") icon = "bi-x-circle";
      if (type === "warning") icon = "bi-exclamation-triangle";

      els.toast.innerHTML = `<i class="bi ${icon}"></i><span class="message-text">${msg}</span>`;
      els.toast.className = `am-message-panel ${type} show`;
      els.toast.setAttribute("role", "alert");
      els.toast.setAttribute("aria-live", "assertive");

      // Click-to-dismiss
      els.toast.onclick = () => {
        els.toast.classList.remove("show");
        toastTimer = setTimeout(() => {
          els.toast.classList.add("hidden");
        }, 300);
      };

      // Ensure visible even if previously hidden
      els.toast.classList.remove("hidden");
      void els.toast.offsetWidth; // Force reflow

      toastTimer = setTimeout(() => {
        els.toast.classList.remove("show");
        toastTimer = setTimeout(() => {
          els.toast.classList.add("hidden");
        }, 300);
      }, 4000);
    }

    function validateClientLimitForm() {
      const required = [
        { el: els.limitId, label: "Limit ID" },
        { el: els.clientId, label: "Client ID" },
        { el: els.currencyId, label: "Currency ID" },
        { el: els.limitLevel, label: "Limit Level" },
        { el: els.limitType, label: "Limit Type" },
        { el: els.effectiveDate, label: "Effective Date" },
        { el: els.expiryDate, label: "Expiry Date" },
        { el: els.sanctionedDate, label: "Sanctioned Date" },
        { el: els.dpDefinition, label: "DP Definition" },
        { el: els.sanctionedLimit, label: "Sanctioned Limit" },
      ];

      const missing = [];
      required.forEach(({ el, label }) => {
        if (!el) return;
        const v = (el.value || "").trim();
        const ok = v !== "" && v !== "--Select--";
        el.style.borderColor = ok ? "" : "var(--danger)";
        if (!ok) missing.push(label);
      });

      if (missing.length) {
        showMessage(
          `Please fill required fields: ${missing.join(", ")} `,
          "warning",
        );
        return false;
      }
      return true;
    }

    // --- Collateral Details Auto-Generation Logic ---
    // --- Collateral Details Logic ---
    async function handleDerivedCollateralGeneration() {
      const select = els.dpDefinition;
      if (!select) return;

      const selectedOption = select.options[select.selectedIndex];
      const selectedText = (selectedOption?.textContent || "").trim();
      const sanctionedLimitVal =
        parseFloat((els.sanctionedLimit.value || "0").replace(/,/g, "")) || 0;

      // Hide both by default (on load when --Select-- is chosen)
      if (els.limitDetailsContainer) {
        els.limitDetailsContainer.classList.add("hidden");
      }
      if (els.limitDetailsActions) {
        els.limitDetailsActions.classList.add("hidden");
      }
      if (els.collateralContainer) {
        els.collateralContainer.classList.add("hidden");
      }

      if (selectedText.toLowerCase().includes("fixed value")) {
        // State: Fixed Value (Show Limit Details, Hide Collateral)
        if (els.limitDetailsContainer) {
          els.limitDetailsContainer.classList.remove("hidden");
        }
        if (els.limitDetailsActions) {
          els.limitDetailsActions.classList.remove("hidden");
        }
        // In Fixed Value, Drawing Power is often the Sanctioned Limit
        setElValue(els.drawingPower, formatNum(sanctionedLimitVal));
        renderCollateralDetailsGrid([]);
      } else if (selectedText.toLowerCase().includes("derived from linked collateral")) {
        // State: Derived From Linked Collaterals (Show Collateral, Hide Limit Details)
        if (els.collateralContainer) {
          els.collateralContainer.classList.remove("hidden");
        }
        await loadLinkedCollaterals();
      } else {
        // Default (--Select--): Keep both hidden
        renderCollateralDetailsGrid([]);
      }
    }

    async function loadLinkedCollaterals() {
      const LimitID = (els.limitId?.value || "").trim();
      const ClientID = (els.clientId?.value || "").trim();
      const OurBranchID = els.branchId?.value || getCurrentBranchId();

      if (!LimitID || !ClientID || LimitID === "N") {
        renderCollateralDetailsGrid([]);
        return;
      }

      if (!LimitsCollateralService) {
        console.warn(
          "[ClientLimit] LimitsCollateralService not ready for collaterals",
        );
        return;
      }

      try {
        const resp = await LimitsCollateralService.getLimitCollaterals({
          OurBranchID,
          LimitID,
          OperatorID: getCurrentOperatorId(),
          Direction: "0",
        });

        if (resp.success) {
          const rows = resp.data || resp.Details || [];
          renderCollateralDetailsGrid(rows);
          calculateDPFromCollaterals(rows);
        }
      } catch (err) {
        console.error("[ClientLimit] Failed to load collaterals:", err);
      }
    }

    function renderCollateralDetailsGrid(rows) {
      const tbody = document.getElementById("CollateralDetailsTableBody");
      if (!tbody) return;
      tbody.innerHTML = "";

      const list = Array.isArray(rows) ? rows : [];
      if (list.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="6" class="text-center">No linked collaterals found.</td></tr>';
        return;
      }

      list.forEach((row) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
                    <td>${row.CollateralID || row.collateralid || ""}</td>
                    <td>${row.ReferenceNo || row.RefNo || row.refno || ""}</td>
                    <td class="text-right">${formatNumGrid(row.ApportionedRatio || row.apportionedratio || 0)}</td>
                    <td class="text-right">${formatNumGrid(row.ApportionedValue || row.apportionedvalue || 0)}</td>
                    <td class="text-right">${formatNumGrid(row.Margin || row.margin || 0)}</td>
                    <td class="text-right">${formatNumGrid(row.NetCollateralValue || row.netcollateralvalue || 0)}</td>
`;
        tbody.appendChild(tr);
      });
    }

    function calculateDPFromCollaterals(rows) {
      let totalVal = 0;
      rows.forEach((row) => {
        totalVal +=
          parseFloat(row.ApportionedValue || row.apportionedvalue || 0) || 0;
      });
      setElValue(els.drawingPower, formatNum(totalVal));
    }

    // Wire listeners
    els.dpDefinition?.addEventListener(
      "change",
      handleDerivedCollateralGeneration,
    );
    els.sanctionedLimit?.addEventListener("input", () => {
      const select = els.dpDefinition;
      if (!select) return;
      const selectedOption = select.options[select.selectedIndex];
      const selectedText = (selectedOption?.textContent || "").trim();
      if (selectedText === "Sanctioned Limit") {
        const val =
          parseFloat((els.sanctionedLimit.value || "0").replace(/,/g, "")) || 0;
        setElValue(els.drawingPower, formatNum(val));
      }
    });
    els.sanctionedLimit?.addEventListener("blur", () => {
      const select = els.dpDefinition;
      if (!select) return;
      const selectedOption = select.options[select.selectedIndex];
      const selectedText = (selectedOption?.textContent || "").trim();
      if (selectedText === "Sanctioned Limit") {
        const val =
          parseFloat((els.sanctionedLimit.value || "0").replace(/,/g, "")) || 0;
        setElValue(els.drawingPower, formatNum(val));
      }
    });

    // --- Init ---
    if (!BASIC_WIRING_ONLY) {
      // Mode Switches
      if (els.btnAdd)
        els.btnAdd.addEventListener("click", () => {
          notifyParent("add");
          switchMode("ADD");
        });
      if (els.btnView)
        els.btnView.addEventListener("click", () => {
          notifyParent("view");
          void viewRecord();
        });
      if (els.btnEdit)
        els.btnEdit.addEventListener("click", () => {
          notifyParent("edit");
          switchMode("EDIT");
        });
      if (els.btnCancel) {
        els.btnCancel.addEventListener("click", () => {
          notifyParent("cancel");
          clearForm();
          switchMode("VIEW");
          showMessage("Operation cancelled.", "warning");
        });
      }
      if (els.btnSave) els.btnSave.addEventListener("click", saveRecord);
      if (els.btnWithdraw)
        els.btnWithdraw.addEventListener("click", withdrawRecord);
      if (els.btnPrevious)
        els.btnPrevious.addEventListener("click", () => navigate("0"));
      if (els.btnNext)
        els.btnNext.addEventListener("click", () => navigate("1"));
    } else {
      // Basic wiring with normal flow UI rules.
      if (els.btnAdd) {
        els.btnAdd.addEventListener("click", () => {
          notifyParent("add");
          switchMode("ADD");
        });
      }
      if (els.btnView) {
        els.btnView.addEventListener("click", () => {
          notifyParent("view");
          void viewRecord();
        });
      }
      if (els.btnEdit) {
        els.btnEdit.addEventListener("click", () => {
          notifyParent("edit");
          switchMode("EDIT");
        });
      }
      if (els.btnCancel) {
        els.btnCancel.addEventListener("click", () => {
          notifyParent("cancel");
          if (currentMode === "VIEW") {
            // Even in VIEW mode, clicking cancel should clear the search results
            clearForm();
            showMessage("Screen cleared.", "info");
            return;
          }
          clearForm();
          switchMode("VIEW");
          showMessage("Operation cancelled.", "warning");
        });
      }
      if (els.btnSave) {
        els.btnSave.addEventListener("click", () => {
          notifyParent("save");
          if (currentMode === "VIEW") {
            showMessage("Warning: Click Add/Edit before Save.", "warning");
            return;
          }
          if (!validateClientLimitForm()) return;
          showMessage(
            "Validation passed, but Save is not wired (basic wiring only).",
            "warning",
          );
        });
      }
      if (els.btnWithdraw) {
        els.btnWithdraw.addEventListener("click", () => {
          notifyParent("withdraw");
          if (!currentData) {
            showMessage("Warning: Load a record before Withdraw.", "warning");
            return;
          }
          showMessage(
            "Warning: Withdraw is not wired (basic wiring only).",
            "warning",
          );
        });
      }
      if (els.btnPrevious) {
        els.btnPrevious.addEventListener("click", () => {
          notifyParent("previous");
          showMessage(
            "Warning: Previous/Next navigation is not wired (basic wiring only).",
            "warning",
          );
        });
      }
      if (els.btnNext) {
        els.btnNext.addEventListener("click", () => {
          notifyParent("next");
          showMessage(
            "Warning: Previous/Next navigation is not wired (basic wiring only).",
            "warning",
          );
        });
      }
    }

    // Refresh Handler
    if (els.btnRefresh) {
      els.btnRefresh.addEventListener("click", () => {
        clearForm();
        showMessage("Form cleared", "info");
      });
    }

    if (els.btnMinimize) {
      els.btnMinimize.addEventListener("click", () => {
        notifyParent("minimize");
      });
    }

    if (els.btnMaximize) {
      els.btnMaximize.addEventListener("click", () => {
        const icon = els.btnMaximize.querySelector("i");
        if (icon) {
          const isMaximized = icon.classList.toggle("bi-window-stack");
          icon.classList.toggle("bi-square", !isMaximized);
        }
        notifyParent("maximize");
      });
    }

    if (els.btnCloseWin) {
      els.btnCloseWin.addEventListener("click", () => {
        notifyParent("close");
      });
    }

    // Load Record on Enter
    els.limitId?.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        notifyParent("load");
        void viewRecord();
      }
    });

    // Money auto-format
    document.querySelectorAll(".money-field").forEach((f) => {
      f.addEventListener("blur", function () {
        if (this.value) this.value = formatNum(this.value);
      });
      f.addEventListener("focus", function () {
        if (this.value) this.value = this.value.replace(/,/g, "");
      });
    });

    // ═══════════════════════════════════════════════════════════════
    // COLLATERAL DETAILS TABLE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════
    let collateralRecords = [];
    let selectedCollateralIndex = null;

    function addCollateralToTable() {
      // Validate required fields
      if (!els.collateralId?.value?.trim()) {
        showMessage("Please enter a Collateral ID", "warning");
        els.collateralId?.focus();
        return;
      }

      // Get values from form
      const collateralData = {
        CollateralID: els.collateralId.value.trim(),
        ReferenceNo: els.collateralRefNo?.value?.trim() || "",
        ApportionedRatio: els.apportionedRatio?.value?.trim() || "0",
        ApportionedValue: els.apportionedValue?.value?.trim() || "0",
        Margin: els.collateralMargin?.value?.trim() || "0",
        ApportionedCollateralValue:
          els.apportionedCollateralValue?.value?.trim() || "0",
        AssignedDate: els.assignedDate?.value || "",
        LimitCollateralValue: els.limitCollateralValue?.value?.trim() || "0",
      };

      // Add to records array
      collateralRecords.push(collateralData);

      // Render the table
      renderCollateralTable();

      // Clear the form fields
      clearCollateralForm();
      showMessage("Collateral added to table", "success");
    }

    function renderCollateralTable() {
      const tbody = document.getElementById("CollateralDetailsTableBody");
      if (!tbody) return;

      if (collateralRecords.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="6" class="text-center" style="color: #999;">No records to display.</td></tr>';
        return;
      }

      tbody.innerHTML = collateralRecords
        .map(
          (record, index) => `
    <tr data-index="${index}" style="cursor: pointer;" class="${selectedCollateralIndex === index ? "selected-row" : ""}">
                <td>${record.CollateralID}</td>
                <td>${record.ReferenceNo}</td>
                <td class="text-right">${record.ApportionedRatio}</td>
                <td class="text-right">${formatNumGrid(record.ApportionedValue)}</td>
                <td class="text-right">${record.Margin}</td>
                <td class="text-right">${formatNumGrid(record.ApportionedCollateralValue)}</td>
            </tr>
    `,
        )
        .join("");

      // Add click handlers to rows
      tbody.querySelectorAll("tr[data-index]").forEach((row) => {
        row.addEventListener("click", function () {
          const index = parseInt(this.dataset.index);
          selectCollateralRow(index);
        });
      });
    }

    function selectCollateralRow(index) {
      selectedCollateralIndex = index;
      const record = collateralRecords[index];

      // Populate form with selected record
      if (els.collateralId) els.collateralId.value = record.CollateralID;
      if (els.collateralRefNo) els.collateralRefNo.value = record.ReferenceNo;
      if (els.apportionedRatio)
        els.apportionedRatio.value = record.ApportionedRatio;
      if (els.apportionedValue)
        els.apportionedValue.value = record.ApportionedValue;
      if (els.collateralMargin) els.collateralMargin.value = record.Margin;
      if (els.apportionedCollateralValue)
        els.apportionedCollateralValue.value =
          record.ApportionedCollateralValue;
      if (els.assignedDate) els.assignedDate.value = record.AssignedDate;
      if (els.limitCollateralValue)
        els.limitCollateralValue.value = record.LimitCollateralValue;

      // Enable Update button
      if (els.btnCollateralUpdate) els.btnCollateralUpdate.disabled = false;

      // Re-render to show selection
      renderCollateralTable();
    }

    function updateCollateralInTable() {
      if (selectedCollateralIndex === null) {
        showMessage("Please select a row to update", "warning");
        return;
      }
      if (!els.collateralId?.value?.trim()) {
        showMessage("Please enter a Collateral ID", "warning");
        return;
      }

      // Update the record
      collateralRecords[selectedCollateralIndex] = {
        CollateralID: els.collateralId.value.trim(),
        ReferenceNo: els.collateralRefNo?.value?.trim() || "",
        ApportionedRatio: els.apportionedRatio?.value?.trim() || "0",
        ApportionedValue: els.apportionedValue?.value?.trim() || "0",
        Margin: els.collateralMargin?.value?.trim() || "0",
        ApportionedCollateralValue:
          els.apportionedCollateralValue?.value?.trim() || "0",
        AssignedDate: els.assignedDate?.value || "",
        LimitCollateralValue: els.limitCollateralValue?.value?.trim() || "0",
      };

      renderCollateralTable();
      clearCollateralForm();
      selectedCollateralIndex = null;
      if (els.btnCollateralUpdate) els.btnCollateralUpdate.disabled = true;
      showMessage("Collateral updated", "success");
    }

    function removeCollateralFromTable() {
      if (selectedCollateralIndex === null) {
        showMessage("Please select a row to remove", "warning");
        return;
      }
      if (confirm("Are you sure you want to remove this collateral record?")) {
        collateralRecords.splice(selectedCollateralIndex, 1);
        selectedCollateralIndex = null;
        renderCollateralTable();
        clearCollateralForm();
        if (els.btnCollateralUpdate) els.btnCollateralUpdate.disabled = true;
        showMessage("Collateral removed", "success");
      }
    }

    function clearCollateralForm() {
      if (els.collateralId) els.collateralId.value = "";
      if (els.collateralRefNo) els.collateralRefNo.value = "";
      if (els.apportionedRatio) els.apportionedRatio.value = "";
      if (els.apportionedValue) els.apportionedValue.value = "";
      if (els.collateralMargin) els.collateralMargin.value = "";
      if (els.apportionedCollateralValue)
        els.apportionedCollateralValue.value = "";
      if (els.assignedDate) els.assignedDate.value = "";
      if (els.limitCollateralValue) els.limitCollateralValue.value = "";
      selectedCollateralIndex = null;
      if (els.btnCollateralUpdate) els.btnCollateralUpdate.disabled = true;
    }

    // Wire up collateral buttons
    if (els.btnCollateralNew) {
      els.btnCollateralNew.addEventListener("click", addCollateralToTable);
    }
    if (els.btnCollateralUpdate) {
      els.btnCollateralUpdate.addEventListener(
        "click",
        updateCollateralInTable,
      );
    }
    if (els.btnCollateralRemove) {
      els.btnCollateralRemove.addEventListener(
        "click",
        removeCollateralFromTable,
      );
    }
    if (els.btnCollateralClear) {
      els.btnCollateralClear.addEventListener("click", clearCollateralForm);
    }
    if (els.btnCollateralAlter) {
      els.btnCollateralAlter.addEventListener("click", () => {
        if (selectedCollateralIndex === null) {
          showMessage("Please select a row to alter", "warning");
        } else {
          showMessage(
            "Alter mode enabled - modify the fields and click Update",
            "info",
          );
        }
      });
    }
    if (els.btnCollateralWithdraw) {
      els.btnCollateralWithdraw.addEventListener("click", () => {
        showMessage("Withdraw functionality not yet implemented", "info");
      });
    }

    // Initialize empty table
    renderCollateralTable();

    // ═══════════════════════════════════════════════════════════════
    // SEARCH MODAL INITIALIZATION
    // ═══════════════════════════════════════════════════════════════
    let searchModal = null;

    // Initialize SearchModal after services are loaded
    function initializeSearchModal() {
      if (!window.SearchModal) {
        console.warn("[ClientLimit] SearchModal class not available");
        return;
      }
      searchModal = new window.SearchModal({
        prefix: "client-limit",
        moduleID: "1000", // Limits & Collateral module ID
        getOperatorId: getCurrentOperatorId,
        getOurBranchId: () => {
          const config = searchModal?.currentConfig;
          if (config && config.allBranches) return "";
          return els.branchId?.value || getCurrentBranchId();
        },
        onError: (err) => showMessage(String(err), "error"),
      });
    }

    // Search Configurations
    const searchConfigs = {
      branch: {
        title: "Branch Search",
        tableID: "BranchID",
        allBranches: true,
        whereStmt: "",
        searchFields: [
          { name: "branchId", label: "Branch ID", column: "OurBranchID" },
          { name: "branchName", label: "Branch Name", column: "BranchName" },
        ],
        displayFields: [
          { key: "OurBranchID", label: "Branch ID" },
          { key: "BranchName", label: "Branch Name" },
        ],
        onSelect: (record) => {
          const branchId =
            record.OurBranchID ||
            record.ourbranchid ||
            record.BranchID ||
            record.branchid ||
            "";
          const branchName = record.BranchName || record.branchname || "";
          setElValue(els.branchId, branchId);
          setElValue(els.branchName, branchName);
          showMessage("Branch selected", "success");
        },
      },
      limit: {
        title: "Limit Search",
        tableID: "ApplicationClientLimitID",
        uniqueBy: "LimitID",
        allBranches: true,
        whereStmt: "",
        searchFields: [
          { name: "limitId", label: "Limit ID", column: "LimitID" },
          { name: "clientId", label: "Client ID", column: "ClientID" },
          { name: "clientName", label: "Client Name", column: "Name" },
        ],
        displayFields: [
          { key: "LimitID", label: "Limit ID" },
          { key: "ClientID", label: "Client ID" },
          { key: "Name", label: "Client Name" },
          { key: "EffectiveDate", label: "Effective Date" },
        ],
        onSelect: (record) => {
          const limitId = record.LimitID || record.limitid || "";
          setElValue(els.limitId, limitId);
          // Update Branch ID if available
          const branchId = record.OurBranchID || record.ourbranchid || record.BranchID || record.branchid || "";
          if (branchId) setElValue(els.branchId, branchId);
          // Populate client fields
          if (record.ClientID || record.clientid) {
            setElValue(els.clientId, record.ClientID || record.clientid);
          }
          if (record.Name || record.name || record.ClientName || record.clientname) {
            setElValue(els.clientName, record.Name || record.name || record.ClientName || record.clientname);
          }
          showMessage("Limit selected", "success");
          // Automatically fetch full record details
          void viewRecord();
        },
      },
      client: {
        title: "Client Search",
        tableID: "Client",
        uniqueBy: "ClientID",
        allBranches: true,
        whereStmt: "",
        searchFields: [
          { name: "clientId", label: "Client ID", column: "ClientID" },
          { name: "clientName", label: "Client Name", column: "Name" },
        ],
        displayFields: [
          { key: "ClientID", label: "ClientID" },
          { key: "Name", label: "ClientName" },
        ],
        onSelect: (record) => {
          const clientId =
            record.ClientID || record.clientId || record.clientid || "";
          const clientName =
            record.Name ||
            record.name ||
            record.ClientName ||
            record.clientname ||
            record.fullName ||
            "";
          setElValue(els.clientId, clientId);
          setElValue(els.clientName, clientName);
          showMessage("Client selected", "success");
          // Auto-generate Limit Details for this client
          void loadLimitClientDetails();
        },
      },
      currency: {
        title: "Currency Search",
        tableID: "MastCurrencyID",
        whereStmt: "",
        searchFields: [
          { name: "currencyId", label: "Currency ID", column: "CurrencyID" },
          {
            name: "currencyDescription",
            label: "Description",
            column: "Description",
          },
        ],
        displayFields: [
          { key: "CurrencyID", label: "Currency ID" },
          { key: "Description", label: "Description" },
        ],
        onSelect: (record) => {
          const currencyId = record.CurrencyID || record.currencyid || "";
          const currencyName =
            record.Description ||
            record.description ||
            record.CurrencyName ||
            record.currencyname ||
            "";
          setElValue(els.currencyId, currencyId);
          setElValue(els.currencyName, currencyName);
          showMessage("Currency selected", "success");
        },
      },
      collateral: {
        title: "Collateral Search",
        tableID: "CollateralID",
        whereStmt: "",
        searchFields: [
          {
            name: "collateralId",
            label: "Collateral ID",
            column: "CollateralID",
          },
          { name: "description", label: "Description", column: "Description" },
        ],
        displayFields: [
          { key: "CollateralID", label: "Collateral ID" },
          { key: "Description", label: "Description" },
          { key: "OwnerClientID", label: "Owner" },
        ],
        onSelect: (record) => {
          const collateralId = record.CollateralID || record.collateralid || "";
          const refNo =
            record.Description || record.description || "";
          setElValue(els.collateralId, collateralId);
          setElValue(els.collateralRefNo, refNo);
          showMessage("Collateral selected", "success");
        },
      },
    };

    // Wire Search Buttons
    function wireSearchButtons() {
      if (!searchModal) {
        console.warn(
          "[ClientLimit] SearchModal not initialized, cannot wire search buttons",
        );
        return;
      }

      // Branch search button
      const branchSearchBtn = document
        .querySelector("#BranchId")
        ?.parentElement?.querySelector(".btn-lookup");
      if (branchSearchBtn) {
        branchSearchBtn.addEventListener("click", (e) => {
          e.preventDefault();
          searchModal.open(searchConfigs.branch);
        });
      }

      // Limit ID search button
      const limitSearchBtn = document
        .querySelector("#LimitId")
        ?.parentElement?.querySelector(".btn-lookup");
      if (limitSearchBtn) {
        limitSearchBtn.addEventListener("click", (e) => {
          e.preventDefault();
          searchModal.open(searchConfigs.limit);
        });
      }

      // Client search button
      const clientSearchBtn = document
        .querySelector("#ClientId")
        ?.parentElement?.querySelector(".btn-lookup");
      if (clientSearchBtn) {
        clientSearchBtn.addEventListener("click", (e) => {
          e.preventDefault();
          searchModal.open(searchConfigs.client);
        });
      }

      // Currency search button
      const currencySearchBtn = document
        .querySelector("#CurrencyId")
        ?.parentElement?.querySelector(".btn-lookup");
      if (currencySearchBtn) {
        currencySearchBtn.addEventListener("click", (e) => {
          e.preventDefault();
          searchModal.open(searchConfigs.currency);
        });
      }

      // Collateral search button
      const collateralSearchBtn = document
        .querySelector("#CollateralId")
        ?.parentElement?.querySelector(".btn-lookup");
      if (collateralSearchBtn) {
        collateralSearchBtn.addEventListener("click", (e) => {
          e.preventDefault();
          searchModal.open(searchConfigs.collateral);
        });
      }
    }

    // Initialize search modal and wire buttons after a short delay to ensure DOM is ready
    setTimeout(() => {
      initializeSearchModal();
      wireSearchButtons();
    }, 100);

    function wireCollapseButtons() {
      document.querySelectorAll(".section-header").forEach((header) => {
        header.addEventListener("click", function (e) {
          // Find the nearest card container (could be a .form-card or a div with ID like LimitDetailsContainer)
          const card = this.closest(".form-card") || this.parentElement;
          if (card) {
            card.classList.toggle("collapsed");
            // Toggle the chevron icon direction
            const toggleBtn = this.querySelector(".section-toggle-btn i");
            if (toggleBtn) {
              toggleBtn.classList.toggle("bi-chevron-up");
              toggleBtn.classList.toggle("bi-chevron-down");
            }
          }
        });
      });
    }

    wireDatePickerButtons();
    wireCollapseButtons();

    // Limit Details Action Buttons
    if (els.btnAlterLimit) {
      els.btnAlterLimit.addEventListener("click", () => {
        // Logic to enable editing of the grid
        if (currentGridRows && currentGridRows.length > 0) {
          renderLimitDetailsGrid(currentGridRows, true); // Render in editable mode
          if (els.btnUpdateLimit) els.btnUpdateLimit.disabled = false;
          // Scroll to table to make it obvious
          // document.getElementById('LimitDetailsContainer')?.scrollIntoView({ behavior: 'smooth' });
        } else {
          showMessage("No limit details to alter.", "warning");
        }
      });
    }

    if (els.btnUpdateLimit) {
      els.btnUpdateLimit.addEventListener("click", () => {
        void updateLimitDetails();
      });
    }

    async function updateLimitDetails() {
      if (isBusy) {
        console.warn(
          "[ClientLimit] Update already in progress, ignoring duplicate call",
        );
        return;
      }
      if (!currentGridRows || currentGridRows.length === 0) return;

      showMessage("Updating limit details...", "info");
      setBusyState(true);

      const limitDetailsArray = [];
      const tbody = document.getElementById("LimitDetailsTableBody");
      const rows = tbody.querySelectorAll("tr");

      // Build JSON array of all product limits
      rows.forEach((tr, index) => {
        const rowData = currentGridRows[index];
        if (!rowData) return;

        // Get edited values from the form
        const amountInput = tr.querySelector(
          `input[data - field= "LimitAmount"]`,
        );
        const typeSelect = tr.querySelector(
          `select[data - field= "LimitTypeID"]`,
        );
        const statusSelect = tr.querySelector(
          `select[data - field= "LimitStatusID"]`,
        );

        const limitAmount = amountInput
          ? parseFloat(amountInput.value.replace(/,/g, ""))
          : parseFloat(rowData.LimitAmount) || 0;
        const limitType = typeSelect
          ? typeSelect.value
          : rowData.LimitTypeID || "R";
        const limitStatus = statusSelect
          ? statusSelect.value
          : rowData.LimitStatusID || "A";

        // Build the detail object matching the legacy format
        const detailObj = {
          OurBranchID:
            rowData.OurBranchID || els.branchId?.value || getCurrentBranchId(),
          LimitID: rowData.LimitID || els.limitId?.value,
          ClientID: rowData.ClientID || els.clientId?.value,
          AccountID: rowData.AccountID || null,
          ProductID: rowData.ProductID || rowData.productid || "",
          LimitAmount: limitAmount.toFixed(2),
          LimitTypeID: limitType,
          UtilizedAmount: rowData.UtilizedAmount || "0.00",
          LimitStatusID: limitStatus,
          WithdrawnBy: rowData.WithdrawnBy || "",
          WithdrawnDate: rowData.WithdrawnDate || "",
          WithdrawnReason: rowData.WithdrawnReason || "",
        };
        console.log(`[ClientLimit] Row ${index} detail: `, detailObj);
        limitDetailsArray.push(detailObj);
      });

      try {
        // Call the correct stored procedure with JSON array
        const payload = {
          OurBranchID: els.branchId?.value || getCurrentBranchId(),
          ClientID: els.clientId?.value,
          LimitID: els.limitId?.value,
          RefNo: 0,
          LimitDetails: JSON.stringify(limitDetailsArray),
          OperatorID: getCurrentOperatorId(),
          NewRecord: 0,
        };
        console.log(
          "[ClientLimit] Updating all product limits with payload:",
          payload,
        );
        console.log("[ClientLimit] LimitDetails JSON:", payload.LimitDetails);

        const result =
          await LimitsCollateralService.updateLimitClientDetails(payload);
        console.log("[ClientLimit] Update result:", result);
        setBusyState(false);

        if (result.success) {
          showMessage("Successfully updated all limit details.", "success");
          if (els.btnUpdateLimit) els.btnUpdateLimit.disabled = true;
          // Reload to show updated values
          setTimeout(() => void loadLimitClientDetails(), 500);
        } else {
          showMessage(
            `Failed to update limit details: ${result.message || "Unknown error"} `,
            "error",
          );
          console.error("[ClientLimit] Update failed:", result);
        }
      } catch (err) {
        setBusyState(false);
        showMessage(`Error updating limit details: ${err.message} `, "error");
        console.error("[ClientLimit] Update error:", err);
      }
    }

    // Default state: View mode (Save/Cancel disabled; fields read-only)
    switchMode("VIEW");

    if (!BASIC_WIRING_ONLY) {
      // Kick off service loading in the background (do NOT block wiring)
      void startServiceLoading();
    }

    // Final wiring for branch name auto-population
    if (els.branchId) {
      els.branchId.addEventListener("change", updateBranchName);
      els.branchId.addEventListener("blur", updateBranchName);
      if (els.branchId.value) updateBranchName();
    }

    if (els.clientId) {
      els.clientId.addEventListener("blur", loadLimitClientDetails);
      els.clientId.addEventListener("change", loadLimitClientDetails);
    }

    // Wire DP Definition dropdown to show/hide Collateral Details and Limit Details
    if (els.dpDefinition) {
      els.dpDefinition.addEventListener("change", function () {
        const selectedText = this.options[this.selectedIndex]?.text || "";
        const selectedValue = this.value || "";

        // Default: Hide both on initial load or when --Select-- is chosen
        let showCollateral = false;
        let showLimitDetails = false;

        // Show collateral container if "Derived from Linked Collaterals" is selected
        if (
          selectedText.toLowerCase().includes("derived from linked collateral") ||
          selectedText.toLowerCase().includes("linked collateral") ||
          selectedValue.toLowerCase().includes("collateral")
        ) {
          showCollateral = true;
          showLimitDetails = false;
        }
        // Show limit details if "Fixed Value" is selected
        else if (
          selectedText.toLowerCase().includes("fixed value") ||
          selectedText.toLowerCase().includes("sanction")
        ) {
          showCollateral = false;
          showLimitDetails = true;
        }

        // Toggle Collateral Details
        if (els.collateralContainer) {
          if (showCollateral) {
            els.collateralContainer.classList.remove("hidden");
          } else {
            els.collateralContainer.classList.add("hidden");
          }
        }

        // Toggle Limit Details
        if (els.limitDetailsContainer) {
          if (showLimitDetails) {
            els.limitDetailsContainer.classList.remove("hidden");
          } else {
            els.limitDetailsContainer.classList.add("hidden");
          }
        }
        if (els.limitDetailsActions) {
          if (showLimitDetails) {
            els.limitDetailsActions.classList.remove("hidden");
          } else {
            els.limitDetailsActions.classList.add("hidden");
          }
        }

        console.log(
          "[ClientLimit] DP Definition changed:",
          selectedText,
          "| Show collateral:",
          showCollateral,
          "| Show limit details:",
          showLimitDetails,
        );
      });
      // Trigger on page load to set initial state (both hidden when --Select--)
      els.dpDefinition.dispatchEvent(new Event("change"));
    }

    // Initialize components
    setTimeout(() => {
      setupDatePickers();
    }, 100);

    // Listen for messages from parent frame (for button actions)
    window.addEventListener("message", function (event) {
      if (!event.data || event.data.type !== "kairo-button-action") return;
      const action = event.data.action;
      console.log("[ClientLimit] Received button action from parent:", action);

      switch (action) {
        case "cancel":
          clearForm();
          switchMode("VIEW");
          showMessage("Cancelled", "info");
          break;
        case "view":
          clearForm();
          switchMode("VIEW");
          break;
        case "save":
          // After save completes successfully, clear the form
          // This will be called by the parent after save succeeds
          clearForm();
          switchMode("VIEW");
          showMessage("Saved successfully", "success");
          break;
      }
    });

    // Expose clearForm globally for parent frame to call directly
    window.clientLimitClearForm = clearForm;

    // --- Boot ---
    void startServiceLoading();
  },
);
