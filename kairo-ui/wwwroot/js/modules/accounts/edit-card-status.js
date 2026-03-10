(function () {
  "use strict";

  const state = {
    cards: [],
    selectedIndex: null,
    context: {
      operatorId: "",
      branchId: "",
      bankId: "00",
      apiBase: "",
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
    elements.approveConfirmModal = scope.querySelector("#approveConfirmModal");
    elements.approveConfirmTitle = scope.querySelector("#approveConfirmTitle");
    elements.approveConfirmText = scope.querySelector("#approveConfirmText");
    elements.approveConfirmOk = scope.querySelector("#approveConfirmOk");
    elements.approveConfirmCancel = scope.querySelector("#approveConfirmCancel");
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

  function getDefaultApiBase() {
    const path = String(window.location.pathname || "").toLowerCase();

    if (path.indexOf("/moneasys/frmeditcardstatus.aspx") !== -1) {
      return "/MoneaSys/frmEditCardStatus.aspx/api";
    }

    if (path.indexOf("/moneasys/editcardstatus") !== -1) {
      return "/MoneaSys/EditCardStatus/api";
    }

    if (path.indexOf("/account/editcardstatus") !== -1) {
      return "/Account/EditCardStatus/api";
    }

    return "/EditCardStatus/api";
  }

  function readContext() {
    if (!elements.host) return;

    state.context.operatorId = elements.host.dataset.operatorId || "";
    state.context.branchId = elements.host.dataset.branchId || "";
    state.context.bankId = elements.host.dataset.bankId || "00";
    state.context.apiBase = elements.host.dataset.apiBase || getDefaultApiBase();
    state.context.closeMode = elements.host.dataset.closeMode || "window";
  }

  function buildApiUrl(path) {
    const base = String(state.context.apiBase || getDefaultApiBase()).replace(/\/+$/, "");
    const suffix = String(path || "").replace(/^\/+/, "");
    return base + "/" + suffix;
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
    if (!elements.approveConfirmModal || !elements.approveConfirmText || !elements.approveConfirmOk || !elements.approveConfirmCancel) {
      return Promise.resolve(window.confirm(message));
    }

    return new Promise((resolve) => {
      const modal = elements.approveConfirmModal;

      if (elements.approveConfirmTitle) {
        elements.approveConfirmTitle.textContent = title || "Confirm action";
      }

      elements.approveConfirmText.textContent = message;
      elements.approveConfirmOk.textContent = confirmLabel || "OK";
      elements.approveConfirmCancel.textContent = cancelLabel || "Cancel";

      modal.hidden = false;
      window.requestAnimationFrame(function () {
        modal.classList.add("show");
      });

      function teardown() {
        elements.approveConfirmOk.removeEventListener("click", onConfirm);
        elements.approveConfirmCancel.removeEventListener("click", onCancel);
        modal.removeEventListener("click", onBackdrop);
        document.removeEventListener("keydown", onKey);
      }

      function close(result) {
        teardown();
        modal.classList.remove("show");
        window.setTimeout(function () {
          modal.hidden = true;
        }, 180);
        resolve(result);
      }

      function onConfirm() { close(true); }
      function onCancel() { close(false); }

      function onBackdrop(event) {
        if (event.target === modal || event.target.closest('[data-confirm-dismiss="backdrop"]')) {
          close(false);
        }
      }

      function onKey(event) {
        if (event.key === "Escape") {
          event.preventDefault();
          close(false);
          return;
        }

        if (event.key === "Enter") {
          event.preventDefault();
          close(true);
        }
      }

      elements.approveConfirmOk.addEventListener("click", onConfirm);
      elements.approveConfirmCancel.addEventListener("click", onCancel);
      modal.addEventListener("click", onBackdrop);
      document.addEventListener("keydown", onKey);
      elements.approveConfirmOk.focus();
    });
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

  async function postJson(url, payload) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest"
      },
      body: JSON.stringify(payload || {})
    });

    const bodyText = await response.text();
    let responseData = {};

    try {
      responseData = bodyText ? JSON.parse(bodyText) : {};
    } catch (error) {
      responseData = { RawBody: bodyText };
    }

    if (!response.ok) {
      throw new Error(getResponseMessage(responseData, "Server returned " + response.status + " " + response.statusText));
    }

    return responseData;
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
      const response = await postJson(buildApiUrl("get-electronic-cards-stagewise"), {
        BankID: state.context.bankId,
        OurBranchID: state.context.branchId,
        StageID: stageId,
        OperatorID: state.context.operatorId
      });

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

  function buildApproveXml(card) {
    const raw = card.raw || {};
    const timestamp = new Date().toISOString();
    const operatorId = state.context.operatorId || "web_portal";
    const trackingCardId = normalizeNullable(pick(raw, "TrackingCardID", "TrackingID", "TrackingId"), "0");
    const cardBlockReasonId = normalizeNullable(pick(raw, "CardBlockReasonID"), "null");
    const modifiedOn = normalizeNullable(pick(raw, "ModifiedOn", "Modifiedon", "ModifierDT"), timestamp);

    return (
      "<dt_Cards>" +
      "<TrackingCardID>" + escapeXml(trackingCardId) + "</TrackingCardID>" +
      "<CardName>" + escapeXml(pick(raw, "CardName", "Name")) + "</CardName>" +
      "<CardProvider>" + escapeXml(pick(raw, "CardProvider", "Provider")) + "</CardProvider>" +
      "<CardType>" + escapeXml(pick(raw, "CardType")) + "</CardType>" +
      "<BranchID>" + escapeXml(pick(raw, "BranchID", "OurBranchID") || card.branchId || state.context.branchId) + "</BranchID>" +
      "<AccountID>" + escapeXml(pick(raw, "AccountID", "AccountId") || card.accountId) + "</AccountID>" +
      "<CreatedBy>" + escapeXml(pick(raw, "CreatedBy") || card.createdBy) + "</CreatedBy>" +
      "<CreatedOn>" + escapeXml(pick(raw, "CreatedOn") || card.createdOn || "1900-01-01T00:00:00") + "</CreatedOn>" +
      "<ModifiedBy>" + escapeXml(operatorId) + "</ModifiedBy>" +
      "<ModifiedOn>" + escapeXml(modifiedOn) + "</ModifiedOn>" +
      "<CardBlockReasonID>" + escapeXml(cardBlockReasonId) + "</CardBlockReasonID>" +
      "<IsApproved>true</IsApproved>" +
      "<IsClientExported>" + (isTruthy(pick(raw, "IsClientExported")) ? "true" : "false") + "</IsClientExported>" +
      "<IsAccountExported>" + (isTruthy(pick(raw, "IsAccountExported")) ? "true" : "false") + "</IsAccountExported>" +
      "<IsCardExported>" + (isTruthy(pick(raw, "IsCardExported")) ? "true" : "false") + "</IsCardExported>" +
      "<IsActive>" + (isTruthy(pick(raw, "IsActive")) || card.isActive ? "true" : "false") + "</IsActive>" +
      "<IsCollected>" + (isTruthy(pick(raw, "IsCollected", "Collected")) || card.isCollected ? "true" : "false") + "</IsCollected>" +
      "<ApprovalDate>" + escapeXml(timestamp) + "</ApprovalDate>" +
      "<ClientExportedDate>" + escapeXml(pick(raw, "ClientExportedDate") || "1900-01-01T00:00:00") + "</ClientExportedDate>" +
      "<AccountExportedDate>" + escapeXml(pick(raw, "AccountExportedDate") || "1900-01-01T00:00:00") + "</AccountExportedDate>" +
      "<CardExportedDate>" + escapeXml(pick(raw, "CardExportedDate", "ExportedOn") || card.exportedOn || "1900-01-01T00:00:00") + "</CardExportedDate>" +
      "<ActvationDate>" + escapeXml(pick(raw, "ActvationDate", "ActivationDate", "ActivatedOn") || card.activatedOn || "1900-01-01T00:00:00") + "</ActvationDate>" +
      "<CollectionDate>" + escapeXml(pick(raw, "CollectionDate") || "1900-01-01T00:00:00") + "</CollectionDate>" +
      "<StartDate>" + escapeXml(pick(raw, "StartDate") || "1900-01-01T00:00:00") + "</StartDate>" +
      "<ExpiryDate>" + escapeXml(pick(raw, "ExpiryDate") || "1900-01-01T00:00:00") + "</ExpiryDate>" +
      "<CardStatus>APPROVED</CardStatus>" +
      "<UpdateCount>" + escapeXml(card.updateCount || 0) + "</UpdateCount>" +
      "<ButtonMark>N</ButtonMark>" +
      "<ApprovedBy>" + escapeXml(operatorId) + "</ApprovedBy>" +
      "<ApprovedOn>" + escapeXml(timestamp) + "</ApprovedOn>" +
      "</dt_Cards>"
    );
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
      const response = await postJson(buildApiUrl("edit-card-status"), {
        BranchID: state.context.branchId,
        OurBranchID: state.context.branchId,
        BankID: state.context.bankId,
        OperatorID: state.context.operatorId,
        UpdateCount: Number(card.updateCount) || 0,
        DetailRecords: buildApproveXml(card)
      });

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
