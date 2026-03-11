(function () {
  "use strict";

  const state = {
    cards: [],
    selectedIndex: null,
    searchModal: null,
    accountService: null,
    context: {
      operatorId: "",
      branchId: "",
      bankId: "00",
      moduleId: "20",
      closeMode: "window"
    }
  };

  const elements = {};

  function cacheElements() {
    elements.host = document.getElementById("editCardStatusModule");
    if (!elements.host) return;

    const scope = elements.host;
    elements.stageFilter = scope.querySelector("#stageFilter");
    elements.recordCount = scope.querySelector("#recordCount");
    elements.kpiTotal = scope.querySelector("#kpiTotal");
    elements.kpiApproved = scope.querySelector("#kpiApproved");
    elements.kpiActive = scope.querySelector("#kpiActive");
    elements.kpiCollected = scope.querySelector("#kpiCollected");
    elements.cardStatusGrid = scope.querySelector("#cardStatusGrid");
    elements.selectAllCards = scope.querySelector("#selectAllCards");
    elements.loadingOverlay = scope.querySelector("#loadingOverlay");
    elements.messagePanel = scope.querySelector("#amMessagePanel");
    elements.messagePanelIcon = scope.querySelector("#messagePanelIcon");
    elements.messagePanelText = scope.querySelector("#messagePanelText");
    elements.messagePanelClose = scope.querySelector("#messagePanelClose");
    elements.statusBar = scope.querySelector("#editCardStatusBar");
    elements.createdBy = scope.querySelector("#createdBy");
    elements.createdOn = scope.querySelector("#createdOn");
    elements.approvedBy = scope.querySelector("#approvedBy");
    elements.approvedOn = scope.querySelector("#approvedOn");
    elements.exportedBy = scope.querySelector("#exportedBy");
    elements.exportedOn = scope.querySelector("#exportedOn");
    elements.activatedBy = scope.querySelector("#activatedBy");
    elements.activatedOn = scope.querySelector("#activatedOn");
    elements.disbursedBy = scope.querySelector("#disbursedBy");
    elements.disbursedOn = scope.querySelector("#disbursedOn");
    elements.localViewBtn = scope.querySelector('aside.action-panel [data-action="view"]');
    elements.localEditBtn = scope.querySelector('aside.action-panel [data-action="edit"]');
    elements.localApproveBtn = scope.querySelector('aside.action-panel [data-action="approve"]');
    elements.localCancelBtn = scope.querySelector('aside.action-panel [data-action="cancel"]');
    elements.localCloseBtn = scope.querySelector('aside.action-panel [data-action="close"]');
  }

  function readStorageValue() {
    const keys = Array.prototype.slice.call(arguments);
    const stores = [window.sessionStorage, window.localStorage];

    for (let storeIndex = 0; storeIndex < stores.length; storeIndex += 1) {
      const store = stores[storeIndex];
      if (!store) continue;

      for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
        const key = keys[keyIndex];
        if (!key) continue;

        try {
          const value = store.getItem(key);
          if (value !== null && String(value).trim() !== "") {
            return String(value).trim();
          }
        } catch (error) {
          console.warn("[EditCardStatus] Unable to read storage key", key, error);
        }
      }
    }

    return "";
  }

  function getEnvironmentValue() {
    const keys = Array.prototype.slice.call(arguments);
    const environment = window.Environment || {};

    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      const value = environment[key];
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        return String(value).trim();
      }
    }

    return "";
  }

  function resolveOperatorId() {
    return (
      (elements.host && elements.host.dataset.operatorId) ||
      (window.AppCore && typeof window.AppCore.getCurrentUserId === "function" ? window.AppCore.getCurrentUserId() : "") ||
      readStorageValue("currentOperatorID", "UserId", "UserID", "OperatorID", "user_name", "user_id") ||
      getEnvironmentValue("UserID") ||
      "web_portal"
    );
  }

  function resolveBranchId() {
    return (
      (elements.host && elements.host.dataset.branchId) ||
      readStorageValue("currentBranchID", "OurBranchID", "branch_code", "branch_id", "BranchID") ||
      getEnvironmentValue("OurBranchID", "defaultOurBranchId") ||
      ""
    );
  }

  function resolveBankId() {
    return (
      (elements.host && elements.host.dataset.bankId) ||
      readStorageValue("BankId", "BankID", "bank_id", "bank_code") ||
      getEnvironmentValue("defaultBankId") ||
      "00"
    );
  }

  function resolveModuleId() {
    return (
      (elements.host && elements.host.dataset.moduleId) ||
      readStorageValue("ModuleID", "module_id") ||
      "20"
    );
  }

  function buildSharedSearchContext() {
    return {
      prefix: "editcardstatus",
      moduleID: state.context.moduleId,
      getOperatorId: resolveOperatorId,
      getOurBranchId: resolveBranchId,
      onError: function (error) {
        console.error("[EditCardStatus] Search helper error:", error);
      }
    };
  }

  function ensureSearchModal() {
    if (state.searchModal) {
      return state.searchModal;
    }

    if (typeof window.SearchModal !== "function") {
      return null;
    }

    state.searchModal = new window.SearchModal(buildSharedSearchContext());
    return state.searchModal;
  }

  function readContext() {
    if (!elements.host) return;

    state.context.operatorId = resolveOperatorId();
    state.context.branchId = resolveBranchId();
    state.context.bankId = resolveBankId();
    state.context.moduleId = resolveModuleId();
    state.context.closeMode = elements.host.dataset.closeMode || "window";

    ensureSearchModal();
  }

  function getAccountService() {
    return state.accountService || window.accountservice || window.AccountService || window.parent?.accountservice || window.parent?.AccountService || null;
  }

  function resolveApiBasePath() {
    const configuredBase = elements.host && elements.host.dataset ? String(elements.host.dataset.apiBase || "").trim() : "";
    if (configuredBase) {
      return configuredBase;
    }

    const path = String(window.location.pathname || "");
    if (path.indexOf("/MoneaSys/EditCardStatus") === 0) {
      return "/MoneaSys/EditCardStatus";
    }

    return "/EditCardStatus";
  }

  async function postControllerJson(endpoint, payload) {
    const response = await fetch(resolveApiBasePath() + endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest"
      },
      credentials: "same-origin",
      body: JSON.stringify(payload || {})
    });

    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    const responseBody = contentType.indexOf("application/json") >= 0
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const message = typeof responseBody === "string"
        ? responseBody
        : getResponseMessage(responseBody, "Request failed.");
      throw new Error(message || ("Request failed with status " + response.status));
    }

    return responseBody;
  }

  function createControllerBackedAccountService() {
    return {
      getElectronicCards: function (payload) {
        return postControllerJson("/api/get-electronic-cards-stagewise", payload);
      },
      addEditElectronicCard: function (payload) {
        return postControllerJson("/api/edit-card-status", payload);
      }
    };
  }

  async function ensureAccountService() {
    const existingService = getAccountService();
    if (existingService) {
      state.accountService = existingService;
      return existingService;
    }

    state.accountService = createControllerBackedAccountService();
    return state.accountService;
  }

  function showLoading(show) {
    if (elements.loadingOverlay) {
      elements.loadingOverlay.hidden = !show;
    }
  }

  function updateStatusBar(message) {
    if (elements.statusBar) {
      elements.statusBar.textContent = message;
    }
  }

  function showMessage(message, type) {
    const variant = type || "info";

    if (elements.messagePanel) {
      if (elements.messagePanelText) {
        elements.messagePanelText.textContent = message;
      }

      if (elements.messagePanelIcon) {
        elements.messagePanelIcon.className = resolveMessageIconClass(variant);
      }

      elements.messagePanel.className = "am-message-panel show " + variant;
      elements.messagePanel.hidden = false;

      window.clearTimeout(elements.messagePanel._hideTimer);
      elements.messagePanel._hideTimer = window.setTimeout(function () {
        elements.messagePanel.hidden = true;
        elements.messagePanel.classList.remove("show", "info", "success", "warning", "error");
      }, 4000);
    }

    if (window.showSystemToast) {
      window.showSystemToast(message, { variant: variant });
    }
  }

  function resolveMessageIconClass(type) {
    const level = String(type || "info").toLowerCase();

    if (level === "success") return "bi bi-check-circle-fill am-message-panel__icon";
    if (level === "error") return "bi bi-exclamation-octagon-fill am-message-panel__icon";
    if (level === "warning") return "bi bi-exclamation-triangle-fill am-message-panel__icon";

    return "bi bi-info-circle-fill am-message-panel__icon";
  }

  function showConfirmDialog(title, message, confirmLabel, cancelLabel) {
    if (window.AppCore && typeof window.AppCore.showDialog === "function") {
      return window.AppCore.showDialog({
        type: "custom",
        title: title || "Confirm action",
        message: message || "",
        buttons: {
          list: [
            { label: cancelLabel || "Cancel", variant: "outline-secondary", value: false },
            { label: confirmLabel || "OK", variant: "primary", value: true }
          ]
        }
      }).then(function (result) {
        return result === true;
      });
    }

    if (window.AppCore && typeof window.AppCore.showConfirmation === "function") {
      return window.AppCore.showConfirmation(title || "Confirm action", message || "").then(function (result) {
        return result === true;
      });
    }

    return Promise.resolve(window.confirm(message));
  }

  function isTruthy(value) {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;

    const normalized = String(value || "").trim().toUpperCase();
    return normalized === "Y" || normalized === "YES" || normalized === "TRUE" || normalized === "1";
  }

  function pick(record) {
    if (!record) return "";

    const recordKeys = Object.keys(record);

    for (let i = 1; i < arguments.length; i += 1) {
      const key = arguments[i];
      if (record[key] !== undefined && record[key] !== null && String(record[key]).trim() !== "") {
        return record[key];
      }

      const actualKey = recordKeys.find(function (name) {
        return name.toLowerCase() === String(key).toLowerCase();
      });

      if (actualKey && record[actualKey] !== undefined && record[actualKey] !== null && String(record[actualKey]).trim() !== "") {
        return record[actualKey];
      }
    }

    return "";
  }

  function formatAuditValue(value) {
    if (!value) return "-";

    if (window.GlobalUtils && typeof window.GlobalUtils.formatDateTime === "function") {
      return window.GlobalUtils.formatDateTime(value);
    }

    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    }

    return String(value);
  }

  function getCurrentTimestamp() {
    if (window.GlobalUtils && typeof window.GlobalUtils.getCurrentDateTime === "function") {
      return window.GlobalUtils.getCurrentDateTime();
    }

    return new Date().toISOString();
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeNullable(value, fallback) {
    const normalized = String(value == null ? "" : value).trim();
    if (!normalized || normalized.toLowerCase() === "null" || normalized.toLowerCase() === "undefined") {
      return fallback || "";
    }
    return normalized;
  }

  function escapeXml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function isCardLike(record) {
    return !!record && typeof record === "object" && (
      record.TrackingCardID !== undefined ||
      record.TrackingID !== undefined ||
      record.CardID !== undefined ||
      record.CardName !== undefined ||
      record.CardProvider !== undefined
    );
  }

  function findCardArray(node, depth) {
    const currentDepth = depth || 0;
    if (currentDepth > 5 || node == null) return null;

    if (Array.isArray(node)) {
      if (node.length === 0) return [];
      if (node.some(isCardLike)) return node;

      for (let i = 0; i < node.length; i += 1) {
        const nested = findCardArray(node[i], currentDepth + 1);
        if (nested) return nested;
      }
      return null;
    }

    if (typeof node !== "object") {
      return null;
    }

    const priorityKeys = ["data", "Data", "Details01", "details01", "Details1", "details1", "Details", "details"];
    for (let i = 0; i < priorityKeys.length; i += 1) {
      const key = priorityKeys[i];
      if (Object.prototype.hasOwnProperty.call(node, key)) {
        const nested = findCardArray(node[key], currentDepth + 1);
        if (nested) return nested;
      }
    }

    const values = Object.values(node);
    for (let i = 0; i < values.length; i += 1) {
      const nested = findCardArray(values[i], currentDepth + 1);
      if (nested) return nested;
    }

    return null;
  }

  function isSuccessResponse(payload) {
    if (!payload) return false;
    if (payload.success === false || payload.Success === false || payload.IsSuccess === false || payload.IsSuccessful === false) {
      return false;
    }

    if (payload.success === true || payload.Success === true || payload.IsSuccess === true || payload.IsSuccessful === true) {
      return true;
    }

    const codes = [
      payload.Status,
      payload.status,
      payload.ResponseCode,
      payload.responseCode,
      payload.code,
      payload.Code,
      payload.data && payload.data.ResponseCode,
      payload.data && payload.data.responseCode,
      payload.data && payload.data.Status,
      payload.data && payload.data.status,
      payload.Data && payload.Data.ResponseCode,
      payload.Data && payload.Data.responseCode,
      payload.Data && payload.Data.Status,
      payload.Data && payload.Data.status
    ];

    for (let i = 0; i < codes.length; i += 1) {
      const code = codes[i];
      if (code !== undefined && code !== null && code !== "") {
        const normalized = String(code).trim().toUpperCase();
        return normalized === "00" || normalized === "0" || normalized === "000" || normalized === "SUCCESS" || normalized === "S";
      }
    }

    return true;
  }

  function normalizeCard(record) {
    return {
      raw: record,
      trackingCardId: pick(record, "TrackingCardID", "TrackingID", "TrackingId"),
      cardId: pick(record, "CardID", "CardId"),
      cardName: pick(record, "CardName", "Name"),
      provider: pick(record, "CardProvider", "Provider"),
      branchId: pick(record, "BranchID", "OurBranchID"),
      accountId: pick(record, "AccountID", "AccountId"),
      status: pick(record, "CardStatus", "Status"),
      isApproved: isTruthy(pick(record, "IsApproved", "Approved")),
      isActive: isTruthy(pick(record, "IsActive", "Active")),
      isCollected: isTruthy(pick(record, "IsCollected", "Collected")),
      updateCount: pick(record, "UpdateCount", "updateCount") || 0,
      createdBy: pick(record, "CreatedBy", "MakerID"),
      createdOn: pick(record, "CreatedOn", "MakerDT"),
      approvedBy: pick(record, "ApprovedBy", "CheckerID"),
      approvedOn: pick(record, "ApprovedOn", "ApprovalDate", "CheckerDT"),
      exportedBy: pick(record, "ExportedBy", "ModifiedBy", "ModifierID"),
      exportedOn: pick(record, "ExportedOn", "CardExportedDate", "ModifiedOn", "ModifierDT"),
      activatedBy: pick(record, "ActivatedBy"),
      activatedOn: pick(record, "ActivatedOn", "ActvationDate", "ActivationDate"),
      disbursedBy: pick(record, "DisbursedBy", "ClientExportedBy"),
      disbursedOn: pick(record, "DisbursedOn", "ClientExportedDate")
    };
  }

  function renderEmptyState(message) {
    if (!elements.cardStatusGrid) return;

    elements.cardStatusGrid.innerHTML =
      '<tr class="table-empty"><td colspan="11"><i class="bi bi-inbox" aria-hidden="true"></i><div>' + escapeHtml(message) + "</div></td></tr>";
    if (elements.selectAllCards) {
      elements.selectAllCards.checked = false;
    }
    updateRecordCount(0);
    updateSummary();
  }

  function renderNoDetailsState() {
    if (!elements.cardStatusGrid) return;

    elements.cardStatusGrid.innerHTML =
      '<tr class="table-empty"><td colspan="11">' +
      '<i class="bi bi-search" aria-hidden="true"></i>' +
      '<div>No details Found [No:1011]</div>' +
      '<small style="display:block; margin-top:4px; color:#64748b; font-size:11px;">Select stage, click View to load.</small>' +
      "</td></tr>";

    if (elements.selectAllCards) {
      elements.selectAllCards.checked = false;
    }

    updateRecordCount(0);
    updateSummary();
  }

  function getResponseCode(payload) {
    if (!payload) return "";

    const codes = [
      payload.ResponseCode,
      payload.responseCode,
      payload.Code,
      payload.code,
      payload.data && payload.data.ResponseCode,
      payload.data && payload.data.responseCode,
      payload.Data && payload.Data.ResponseCode,
      payload.Details01 && payload.Details01.ResponseCode,
      payload.details01 && payload.details01.responseCode
    ];

    for (let i = 0; i < codes.length; i += 1) {
      const code = codes[i];
      if (code !== undefined && code !== null && String(code).trim() !== "") {
        return String(code).trim();
      }
    }

    return "";
  }

  function getResponseMessage(payload, fallback) {
    const message = pick(
      payload,
      "Message",
      "message",
      "ResponseMessage",
      "responseMessage",
      "ErrorMessage",
      "errorMessage"
    ) ||
      pick(payload && payload.data, "Message", "message", "ResponseMessage", "responseMessage", "ErrorMessage", "errorMessage") ||
      pick(payload && payload.Data, "Message", "message", "ResponseMessage", "responseMessage", "ErrorMessage", "errorMessage");

    return message ? String(message) : String(fallback || "Request failed.");
  }

  function updateRecordCount(count) {
    if (!elements.recordCount) return;
    const total = Number(count) || 0;
    elements.recordCount.textContent = total + " record" + (total === 1 ? "" : "s");
  }

  function updateSummary() {
    const cards = state.cards || [];
    const approved = cards.filter(function (card) { return card.isApproved; }).length;
    const active = cards.filter(function (card) { return card.isActive; }).length;
    const collected = cards.filter(function (card) { return card.isCollected; }).length;

    if (elements.kpiTotal) elements.kpiTotal.textContent = String(cards.length);
    if (elements.kpiApproved) elements.kpiApproved.textContent = String(approved);
    if (elements.kpiActive) elements.kpiActive.textContent = String(active);
    if (elements.kpiCollected) elements.kpiCollected.textContent = String(collected);
  }

  function renderBooleanText(value) {
    return value ? "true" : "false";
  }

  function renderStatusText(status) {
    const normalized = String(status || "").trim();
    return escapeHtml(normalized || "-");
  }

  function renderGrid() {
    if (!elements.cardStatusGrid) return;

    if (!state.cards.length) {
      renderEmptyState("No records to display.");
      return;
    }

    const rows = state.cards.map(function (card, index) {
      const selectedClass = state.selectedIndex === index ? "table-active" : "";
      return (
        '<tr data-index="' + index + '" class="' + selectedClass + '">' +
        '<td class="ecs-cell-center"><input type="checkbox" class="form-check-input card-checkbox" data-index="' + index + '"' +
        (state.selectedIndex === index ? " checked" : "") + " /></td>" +
        "<td>" + escapeHtml(card.trackingCardId || "-") + "</td>" +
        "<td>" + escapeHtml(card.cardId || "-") + "</td>" +
        "<td>" + escapeHtml(card.cardName || "-") + "</td>" +
        "<td>" + escapeHtml(card.provider || "-") + "</td>" +
        "<td>" + escapeHtml(card.branchId || "-") + "</td>" +
        "<td>" + escapeHtml(card.accountId || "-") + "</td>" +
        "<td>" + renderStatusText(card.status) + "</td>" +
        '<td class="ecs-cell-center">' + renderBooleanText(card.isApproved) + "</td>" +
        '<td class="ecs-cell-center">' + renderBooleanText(card.isActive) + "</td>" +
        '<td class="ecs-cell-center">' + renderBooleanText(card.isCollected) + "</td>" +
        "</tr>"
      );
    }).join("");

    elements.cardStatusGrid.innerHTML = rows;
    updateRecordCount(state.cards.length);
    updateSummary();
    if (elements.selectAllCards) {
      elements.selectAllCards.checked = state.selectedIndex !== null;
    }
  }

  function setAuditField(element, value) {
    if (!element) return;

    const resolvedValue = value || "-";
    if ("value" in element) {
      element.value = resolvedValue;
      return;
    }

    element.textContent = resolvedValue;
  }

  function updateAuditTrail(card) {
    const selected = card || null;

    setAuditField(elements.createdBy, selected ? (selected.createdBy || "-") : "-");
    setAuditField(elements.createdOn, selected ? formatAuditValue(selected.createdOn) : "-");
    setAuditField(elements.approvedBy, selected ? (selected.approvedBy || "-") : "-");
    setAuditField(elements.approvedOn, selected ? formatAuditValue(selected.approvedOn) : "-");
    setAuditField(elements.exportedBy, selected ? (selected.exportedBy || "-") : "-");
    setAuditField(elements.exportedOn, selected ? formatAuditValue(selected.exportedOn) : "-");
    setAuditField(elements.activatedBy, selected ? (selected.activatedBy || "-") : "-");
    setAuditField(elements.activatedOn, selected ? formatAuditValue(selected.activatedOn) : "-");
    setAuditField(elements.disbursedBy, selected ? (selected.disbursedBy || "-") : "-");
    setAuditField(elements.disbursedOn, selected ? formatAuditValue(selected.disbursedOn) : "-");
  }

  function getParentButtons() {
    return {
      edit: document.getElementById("submoduleBtnEdit"),
      approve: document.getElementById("submoduleBtnApprove")
    };
  }

  function syncActionButtons() {
    const hasSelection = state.selectedIndex !== null && state.cards[state.selectedIndex];
    const parentButtons = getParentButtons();

    if (elements.localEditBtn) elements.localEditBtn.disabled = !hasSelection;
    if (elements.localApproveBtn) elements.localApproveBtn.disabled = !hasSelection;
    if (parentButtons.edit) parentButtons.edit.disabled = !hasSelection;
    if (parentButtons.approve) parentButtons.approve.disabled = !hasSelection;
  }

  function setSelectedCard(index) {
    if (index < 0 || index >= state.cards.length) return;

    state.selectedIndex = index;
    renderGrid();
    updateAuditTrail(state.cards[index]);
    syncActionButtons();
  }

  function buildStageSearchPayload(stageId) {
    return {
      BankID: state.context.bankId,
      OurBranchID: state.context.branchId,
      StageID: stageId,
      OperatorID: state.context.operatorId
    };
  }

  function buildApprovedCardPayload(card) {
    const raw = card.raw || {};
    const timestamp = getCurrentTimestamp();
    const operatorId = state.context.operatorId || "web_portal";

    return {
      TrackingCardID: normalizeNullable(pick(raw, "TrackingCardID", "TrackingID", "TrackingId"), "0"),
      CardName: pick(raw, "CardName", "Name") || card.cardName || "",
      CardID: pick(raw, "CardID", "CardId") || card.cardId || "",
      CardProvider: pick(raw, "CardProvider", "Provider") || card.provider || "",
      CardType: pick(raw, "CardType") || "",
      BranchID: pick(raw, "BranchID", "OurBranchID") || card.branchId || state.context.branchId,
      AccountID: pick(raw, "AccountID", "AccountId") || card.accountId || "",
      Remarks: pick(raw, "Remarks", "CardRemarks") || "",
      CreatedBy: pick(raw, "CreatedBy", "MakerID") || card.createdBy || operatorId,
      CreatedOn: normalizeNullable(pick(raw, "CreatedOn", "MakerDT") || card.createdOn, ""),
      ModifiedBy: operatorId,
      ModifiedOn: timestamp,
      IsNew: "EDIT",
      IsActive: isTruthy(pick(raw, "IsActive", "Active")) || card.isActive ? 1 : 0,
      ActvationDate: normalizeNullable(pick(raw, "ActvationDate", "ActivationDate", "ActivatedOn") || card.activatedOn, ""),
      StartDate: normalizeNullable(pick(raw, "StartDate"), ""),
      ExpiryDate: normalizeNullable(pick(raw, "ExpiryDate"), ""),
      IsCollected: isTruthy(pick(raw, "IsCollected", "Collected")) || card.isCollected ? 1 : 0,
      CollectionDate: normalizeNullable(pick(raw, "CollectionDate"), ""),
      CardBlockDate: normalizeNullable(pick(raw, "CardBlockDate", "DeactivationDate"), ""),
      CardBlockReasonID: normalizeNullable(pick(raw, "CardBlockReasonID"), "null"),
      ReactivationDate: normalizeNullable(pick(raw, "ReactivationDate"), ""),
      ReactivationRemarks: pick(raw, "ReactivationRemarks") || "",
      IsApproved: 1,
      ApprovalDate: timestamp,
      ApprovedBy: operatorId,
      CardStatus: "APPROVED",
      UpdateCount: Number(card.updateCount) || 0
    };
  }

  async function searchCardsByStage(stageId) {
    if (!stageId) {
      state.cards = [];
      state.selectedIndex = null;
      renderNoDetailsState();
      updateAuditTrail(null);
      syncActionButtons();
      updateStatusBar("select stage, click view to load");
      return;
    }

    showLoading(true);
    updateStatusBar("Loading card status...");

    try {
      const accountService = await ensureAccountService();
      if (typeof accountService.getElectronicCards !== "function") {
        throw new Error("AccountService.getElectronicCards is not available.");
      }

      const response = await accountService.getElectronicCards(buildStageSearchPayload(stageId));

      const rawCards = findCardArray(response, 0) || [];
      state.cards = rawCards.filter(isCardLike).map(normalizeCard);
      state.selectedIndex = null;

      const responseCode = getResponseCode(response);

      if (!state.cards.length && responseCode === "1011") {
        renderNoDetailsState();
        updateAuditTrail(null);
        syncActionButtons();
        updateStatusBar("No details Found [No:1011]");
        showMessage("No details Found [No:1011]", "warning");
        return;
      }

      renderGrid();
      updateAuditTrail(null);
      syncActionButtons();

      if (!state.cards.length && !isSuccessResponse(response)) {
        throw new Error(getResponseMessage(response, "The card status request did not complete successfully."));
      }

      if (!state.cards.length) {
        renderNoDetailsState();
        updateStatusBar("No details Found [No:1011]");
      } else {
        setSelectedCard(0);
        updateStatusBar("Found " + state.cards.length + " card(s)");
      }
    } catch (error) {
      state.cards = [];
      state.selectedIndex = null;
      renderEmptyState("Unable to load card status records.");
      updateAuditTrail(null);
      syncActionButtons();
      updateStatusBar("Error searching cards");
      showMessage("Error searching cards: " + error.message, "error");
    } finally {
      showLoading(false);
    }
  }

  function getSelectedCard() {
    if (state.selectedIndex === null) return null;
    return state.cards[state.selectedIndex] || null;
  }

  function view() {
    const stageId = elements.stageFilter ? String(elements.stageFilter.value || "").trim() : "";

    if (!stageId) {
      renderNoDetailsState();
      updateAuditTrail(null);
      updateStatusBar("select stage, click view to load");
      showMessage("select stage, click view to load", "warning");
      return;
    }

    if (!state.cards.length) {
      searchCardsByStage(stageId);
      return;
    }

    const card = getSelectedCard();
    if (!card) {
      showMessage("Select a row to view details in Behind The Scene.", "info");
      return;
    }

    updateAuditTrail(card);
    updateStatusBar("Viewing " + (card.cardId || card.cardName || "selected card"));
  }

  function edit() {
    const card = getSelectedCard();
    if (!card) {
      showMessage("Please select a card first.", "warning");
      return;
    }

    showMessage("Edit mode is not defined for this workflow. Use Approve for the selected card.", "info");
    updateStatusBar("Selected " + (card.cardId || card.cardName || "card"));
  }

  async function approve() {
    const card = getSelectedCard();
    if (!card) {
      showMessage("Please select a card first.", "warning");
      return;
    }

    const trackingCardId = Number(normalizeNullable(pick(card.raw, "TrackingCardID", "TrackingID", "TrackingId"), "0"));
    if (!Number.isFinite(trackingCardId) || trackingCardId <= 0) {
      showMessage("Selected card has invalid TrackingCardID. Approval cannot continue.", "warning");
      updateStatusBar("Approval blocked: invalid tracking ID");
      return;
    }

    const confirmText = "You are about to approve the selected card status. Proceed?";
    const confirmed = await showConfirmDialog("Confirm approval", confirmText, "OK", "Cancel");
    if (!confirmed) {
      updateStatusBar("Approval cancelled.");
      return;
    }

    showLoading(true);
    updateStatusBar("Approving card status...");

    try {
      const accountService = await ensureAccountService();
      if (typeof accountService.addEditElectronicCard !== "function") {
        throw new Error("AccountService.addEditElectronicCard is not available.");
      }

      const response = await accountService.addEditElectronicCard(buildApprovedCardPayload(card));

      if (!isSuccessResponse(response)) {
        const message = getResponseMessage(response, "Approval failed.");
        throw new Error(message);
      }

      showMessage("Card " + (card.cardId || card.cardName || card.trackingCardId) + " approved successfully.", "success");
      await searchCardsByStage(elements.stageFilter ? elements.stageFilter.value : "");
    } catch (error) {
      updateStatusBar("Approval failed");
      showMessage("Error approving card: " + error.message, "error");
    } finally {
      showLoading(false);
    }
  }

  function closeHost() {
    if (state.context.closeMode === "submodule") {
      if (window.parent && window.parent.AccountMaintenanceCore && typeof window.parent.AccountMaintenanceCore.closeSubmodule === "function") {
        window.parent.AccountMaintenanceCore.closeSubmodule();
        return;
      }

      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ action: "submoduleClosed", source: "Edit Card Status" }, "*");
        return;
      }
    }

    try {
      const hostModal = window.frameElement && typeof window.frameElement.closest === "function"
        ? window.frameElement.closest(".legacy-modal, .modal")
        : null;

      if (window.parent && typeof window.parent.closeModalWindow === "function") {
        window.parent.closeModalWindow(hostModal);
        return;
      }

      if (window.parent && window.parent.bootstrap && hostModal) {
        window.parent.bootstrap.Modal.getOrCreateInstance(hostModal).hide();
        return;
      }
    } catch (error) {
      console.warn("[EditCardStatus] Unable to close host modal cleanly.", error);
    }

    window.close();
  }

  function cancel() {
    clearSelection(false);
  }

  function clearSelection(silent) {
    const quietly = !!silent;
    const hadSelection = state.selectedIndex !== null;

    state.selectedIndex = null;
    renderGrid();
    updateAuditTrail(null);
    syncActionButtons();

    if (!quietly) {
      showMessage(hadSelection ? "Selection cleared." : "No selected card to clear.", "info");
    }
  }

  function refresh() {
    const currentStage = elements.stageFilter ? elements.stageFilter.value : "";
    searchCardsByStage(currentStage);
  }

  function wireGridEvents() {
    if (!elements.cardStatusGrid) return;

    elements.cardStatusGrid.addEventListener("click", function (event) {
      const row = event.target.closest("tr[data-index]");
      if (!row) return;

      const index = Number(row.getAttribute("data-index"));
      if (!Number.isNaN(index)) {
        setSelectedCard(index);
      }
    });
  }

  function wireSectionToggles() {
    document.querySelectorAll('#editCardStatusModule [data-section-toggle]').forEach(function (toggle) {
      toggle.addEventListener("click", function () {
        const section = toggle.closest(".form-section");
        const content = section ? section.querySelector("[data-section-content]") || section.querySelector(".section-content") : null;
        const icon = toggle.querySelector(".section-toggle-btn i");
        const button = toggle.querySelector(".section-toggle-btn");

        if (!content) return;

        const willExpand = content.style.display === "none";
        content.style.display = willExpand ? "block" : "none";
        if (icon) {
          icon.className = willExpand ? "bi bi-chevron-up" : "bi bi-chevron-down";
        }
        if (button) {
          button.setAttribute("aria-expanded", willExpand ? "true" : "false");
        }
      });
    });
  }

  function wireWindowControls() {
    document.querySelectorAll('#editCardStatusModule .am-header [data-action="refresh"]').forEach(function (button) {
      button.addEventListener("click", refresh);
    });

    document.querySelectorAll('#editCardStatusModule .am-header [data-action="close"]').forEach(function (button) {
      button.addEventListener("click", function () {
        clearSelection(true);
        closeHost();
      });
    });

    document.querySelectorAll('#editCardStatusModule .am-header [data-action="maximize"]').forEach(function (button) {
      button.addEventListener("click", function () {
        const windowElement = elements.host ? elements.host.querySelector(".window") : null;
        if (!windowElement) return;

        const maximized = windowElement.classList.toggle("maximized");
        const icon = button.querySelector("i");
        if (icon) {
          icon.className = maximized ? "bi bi-fullscreen-exit" : "bi bi-square";
        }
      });
    });
  }

  function wireLocalButtons() {
    if (elements.localViewBtn) elements.localViewBtn.addEventListener("click", view);
    if (elements.localEditBtn) elements.localEditBtn.addEventListener("click", edit);
    if (elements.localApproveBtn) elements.localApproveBtn.addEventListener("click", approve);
    if (elements.localCancelBtn) elements.localCancelBtn.addEventListener("click", cancel);
    if (elements.localCloseBtn) elements.localCloseBtn.addEventListener("click", closeHost);
  }

  function wireFilterEvents() {
    if (elements.stageFilter) {
      elements.stageFilter.addEventListener("change", function (event) {
        const stageId = String(event.target.value || "").trim();
        state.cards = [];
        state.selectedIndex = null;
        updateAuditTrail(null);
        syncActionButtons();

        if (!stageId) {
          renderNoDetailsState();
          updateStatusBar("select stage, click view to load");
          return;
        }

        renderEmptyState("select stage, click view to load");
        updateStatusBar("select stage, click view to load");
      });
    }

    if (elements.selectAllCards) {
      elements.selectAllCards.addEventListener("change", function (event) {
        if (!state.cards.length) return;

        if (event.target.checked) {
          setSelectedCard(0);
        } else {
          state.selectedIndex = null;
          renderGrid();
          updateAuditTrail(null);
          syncActionButtons();
        }
      });
    }
  }

  function init() {
    cacheElements();
    if (!elements.host) return;

    readContext();
    ensureAccountService().catch(function (error) {
      console.warn("[EditCardStatus] AccountService preload failed.", error);
    });
    wireGridEvents();
    wireSectionToggles();
    wireWindowControls();
    wireLocalButtons();
    wireFilterEvents();
    elements.messagePanelClose?.addEventListener("click", function () {
      if (elements.messagePanel) {
        elements.messagePanel.hidden = true;
        elements.messagePanel.classList.remove("show", "info", "success", "warning", "error");
      }
    });
    renderNoDetailsState();
    updateAuditTrail(null);
    syncActionButtons();
    updateSummary();
    updateStatusBar("Ready");
  }

  window.EditCardStatusModule = {
    init: init,
    view: view,
    edit: edit,
    approve: approve,
    cancel: cancel,
    close: closeHost,
    refresh: refresh,
    getSearchContext: buildSharedSearchContext,
    getSearchModal: ensureSearchModal,
    syncActionButtons: syncActionButtons
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      window.EditCardStatusModule.init();
    });
  } else {
    window.EditCardStatusModule.init();
  }
})();
