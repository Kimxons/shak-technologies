(() => {
  if (window.__kairoProductChargesLoaded) return;
  window.__kairoProductChargesLoaded = true;

  console.log("[ProductCharges] script loaded");
  try {
    if (window.parent && window.parent !== window && window.parent.console?.log) {
      window.parent.console.log("[ProductCharges][iframe] script loaded", window.location.href);
    }
  } catch {}

  const state = {
    mode: "view",
    snapshot: null,
    charges: [],
  };

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function extractId(raw) {
    const text = String(raw || "").trim();
    if (!text) return "";
    const first = text.split(/\s+-\s+|\s+\|\s+|\s+/)[0];
    return String(first || "").trim();
  }

  function getGridBody() {
    return qs("[data-pc-grid-body]");
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function escapeXml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function getCheckboxState() {
    const body = getGridBody();
    if (!body) return [];
    return qsa("tr", body).map((row) => {
      const checkbox = row.querySelector('input[type="checkbox"]');
      return {
        checked: Boolean(checkbox?.checked),
      };
    });
  }

  function restoreCheckboxState(snapshot) {
    const body = getGridBody();
    if (!body || !Array.isArray(snapshot)) return;

    qsa("tr", body).forEach((row, idx) => {
      const next = snapshot[idx];
      const checkbox = row.querySelector('input[type="checkbox"]');
      if (checkbox && next) checkbox.checked = Boolean(next.checked);
    });
  }

  function setToast(message, variant = "info") {
    const toast = qs("#pcToast");
    if (!toast) return;
    toast.classList.remove("d-none", "alert-success", "alert-danger", "alert-warning", "alert-info");
    toast.classList.add(`alert-${variant}`);
    toast.textContent = message;
    window.setTimeout(() => toast.classList.add("d-none"), 2200);
  }

  function setMode(nextMode) {
    console.log("[ProductCharges] setMode", { from: state.mode, to: nextMode });
    try {
      if (window.parent && window.parent !== window && window.parent.console?.log) {
        window.parent.console.log("[ProductCharges][iframe] setMode", { from: state.mode, to: nextMode });
      }
    } catch {}
    state.mode = nextMode;

    const isEdit = nextMode === "edit";
    const editBtn = qs('[data-pc-action="edit"]');
    const saveBtn = qs('[data-pc-action="save"]');
    const cancelBtn = qs('[data-pc-action="cancel"]');

    if (editBtn) editBtn.disabled = isEdit;
    if (saveBtn) saveBtn.disabled = !isEdit;
    if (cancelBtn) cancelBtn.disabled = !isEdit;

    // Enable/disable checkboxes based on mode
    qsa('input[type="checkbox"]', getGridBody() || document).forEach((cb) => {
      cb.disabled = !isEdit;
    });
  }

  function renderCharges(charges) {
    const body = getGridBody();
    if (!body) return;

    if (!charges || charges.length === 0) {
      body.innerHTML = '<tr><td colspan="6" class="text-center align-middle text-muted" style="height: 360px;">No charges to display.</td></tr>';
      return;
    }

    body.innerHTML = charges
      .map((charge, idx) => {
        const bankId = escapeHtml(charge.BankID || charge.bankID || "00");
        const productId = escapeHtml(charge.ProductID || charge.productID || "");
        const chargeId = escapeHtml(charge.ChargeID || charge.chargeID || "");
        const description = escapeHtml(charge.ChargeDescription || charge.chargeDescription || charge.Description || charge.description || "");
        const chargeEvent = escapeHtml(charge.ChargeEvent || charge.chargeEvent || "");
        const effectiveDate = escapeHtml(charge.EffectiveDate || charge.effectiveDate || "");
        const effectiveDateId = escapeHtml(charge.EffectiveDateID || charge.effectiveDateID || "");
        const expiryDate = escapeHtml(charge.ExpiryDate || charge.expiryDate || "");
        const isSelected = charge.IsSelected === 1 || charge.IsSelected === true || charge.IsSelected === "true" || charge.isSelected === 1 || charge.isSelected === true;

        return `
          <tr
            data-pc-bank-id="${bankId}"
            data-pc-product-id="${productId}"
            data-pc-charge-id="${chargeId}"
            data-pc-description="${description}"
            data-pc-event="${chargeEvent}"
            data-pc-effective="${effectiveDate}"
            data-pc-effective-id="${effectiveDateId}"
            data-pc-expiry="${expiryDate}"
          >
            <td class="text-center"><input type="checkbox" ${isSelected ? 'checked' : ''} disabled aria-label="Select charge row ${idx + 1}" /></td>
            <td>${chargeId}</td>
            <td>${description}</td>
            <td>${chargeEvent}</td>
            <td>${effectiveDate}</td>
            <td>${expiryDate}</td>
          </tr>`;
      })
      .join("");
  }

  function bindAuditFields(data) {
    const modifiedBy = data?.ModifiedBy || data?.modifiedBy || "";
    const modifiedOn = data?.ModifiedOn || data?.modifiedOn || "";
    const supervisedBy = data?.SupervisedBy || data?.supervisedBy || "";
    const supervisedOn = data?.SupervisedOn || data?.supervisedOn || "";

    const modByField = qs("#PlChgModifiedBy");
    const modOnField = qs("#PlChgModifiedOn");
    const supByField = qs("#PlChgSupervisedBy");
    const supOnField = qs("#PlChgSupervisedOn");

    if (modByField) modByField.value = modifiedBy;
    if (modOnField) modOnField.value = modifiedOn;
    if (supByField) supByField.value = supervisedBy;
    if (supOnField) supOnField.value = supervisedOn;
  }

  async function uiAlert(message, titleOrOptions) {
    const title = typeof titleOrOptions === "string" ? titleOrOptions : titleOrOptions?.title || "Message";

    // Try to use parent page modal if available
    const parentUi = window.parent?.ProductLgLcUi || window.parent;
    if (parentUi && typeof parentUi.uiAlert === "function") {
      return parentUi.uiAlert(message, titleOrOptions);
    }

    // Fallback to browser alert
    window.alert(`${title}\n\n${message}`);
    return Promise.resolve(true);
  }

  async function fetchProductCharges() {
    if (!window.parent || window.parent === window) {
      renderCharges([]);
      return;
    }

    if (!window.parent.ServiceLoader?.loadProductLgLcService) {
      await uiAlert("Service loader is not available.", { title: "Error", variant: "danger" });
      renderCharges([]);
      return;
    }

    const parentProductField = window.parent.document?.getElementById("Product");
    const productId = parentProductField ? extractId(parentProductField.value) : "";

    if (!productId) {
      await uiAlert("No product selected in parent page. Please view a product first.", {
        title: "No Product",
        variant: "warning",
      });
      setToast("No product selected.", "warning");
      renderCharges([]);
      return;
    }

    setToast("Loading product charges...", "info");

    await window.parent.ServiceLoader.loadProductLgLcService();

    if (!window.parent.ProductLgLcService?.getProductCharge) {
      await uiAlert("ProductLgLcService.getProductCharge is not available.", { title: "Error", variant: "danger" });
      renderCharges([]);
      return;
    }

    const session = window.parent.AuthService?.getSession?.() || null;
    const branchId =
      session?.branchID ||
      session?.BranchID ||
      window.parent.Environment?.BranchID ||
      window.parent.Environment?.branchID ||
      "1201";
    const operatorId =
      session?.operatorID ||
      session?.OperatorID ||
      window.parent.Environment?.OperatorID ||
      "JOY_WANJA";

    const requestData = {
      OurBranchID: '1201',
      OperatorID: 'JOY_WANJA',
      ProductID: productId,
    };

    console.log("[ProductCharges] getProductCharge request", requestData);
    try {
      if (window.parent && window.parent !== window && window.parent.console?.log) {
        window.parent.console.log("[ProductCharges][iframe] getProductCharge request", requestData);
      }
    } catch {}

    try {
      const response = await window.parent.ProductLgLcService.getProductCharge(requestData);
      console.log("[ProductCharges] getProductCharge response", response);
      try {
        if (window.parent && window.parent !== window && window.parent.console?.log) {
          window.parent.console.log("[ProductCharges][iframe] getProductCharge response", response);
        }
      } catch {}

      if (!response?.success) {
        const message = response?.message || "Product charges not found.";
        await uiAlert(message, { title: "Not Found", variant: "warning" });
        setToast(message, "warning");
        renderCharges([]);
        return;
      }

      const payload = response?.data || {};
      let rawCharges = [];

      // Try Details01 first (common pattern)
      if (Array.isArray(payload.Details01)) {
        rawCharges = payload.Details01;
      } else if (Array.isArray(payload.Details)) {
        rawCharges = payload.Details;
      } else if (Array.isArray(payload)) {
        rawCharges = payload;
      }

      console.log("[ProductCharges] rawCharges from API", rawCharges);
      try {
        if (window.parent && window.parent !== window && window.parent.console?.log) {
          window.parent.console.log("[ProductCharges][iframe] rawCharges from API", rawCharges);
        }
      } catch {}

      state.charges = rawCharges;
      renderCharges(rawCharges);

      // Bind audit fields if available (typically in first row or top-level)
      if (rawCharges.length > 0) {
        bindAuditFields(rawCharges[0]);
      } else if (payload.ModifiedBy || payload.SupervisedBy) {
        bindAuditFields(payload);
      }

      setToast("Product charges loaded.", "success");
    } catch (err) {
      console.error("[ProductCharges] Fetch failed:", err);
      try {
        if (window.parent && window.parent !== window && window.parent.console?.error) {
          window.parent.console.error("[ProductCharges][iframe] Fetch failed:", err);
        }
      } catch {}
      await uiAlert(`Error loading product charges: ${err.message || err}`, {
        title: "Error",
        variant: "danger",
      });
      setToast("Failed to load data.", "danger");
      renderCharges([]);
    }
  }

  function bindActions() {
    qs('[data-pc-action="back"]')?.addEventListener("click", () => {
      console.log("[ProductCharges] Back clicked");
      try {
        if (window.parent && window.parent !== window && window.parent.console?.log) {
          window.parent.console.log("[ProductCharges][iframe] Back clicked");
        }
      } catch {}
      window.location.href = "product-maintenance-treasury.html";
    });

    qs('[data-pc-action="edit"]')?.addEventListener("click", () => {
      console.log("[ProductCharges] Edit clicked", { mode: state.mode });
      try {
        if (window.parent && window.parent !== window && window.parent.console?.log) {
          window.parent.console.log("[ProductCharges][iframe] Edit clicked", { mode: state.mode });
        }
      } catch {}
      state.snapshot = getCheckboxState();
      setMode("edit");
      setToast("Edit enabled.", "info");
    });

    qs('[data-pc-action="save"]')?.addEventListener("click", async () => {
      console.log("[ProductCharges] Save clicked", { mode: state.mode });
      try {
        if (window.parent && window.parent !== window && window.parent.console?.log) {
          window.parent.console.log("[ProductCharges][iframe] Save clicked", { mode: state.mode });
        }
      } catch {}
      if (state.mode !== "edit") {
        setToast("Click Edit before saving.", "warning");
        return;
      }

      const body = getGridBody();
      const rows = qsa("tr", body || document);
      if (!rows.length) {
        setToast("No records to save.", "warning");
        setMode("view");
        return;
      }

      if (!window.parent || window.parent === window) {
        console.warn("[ProductCharges] No parent window detected; save is only supported from within Product Maintenance iframe.");
        await uiAlert("Save is only available when opened from Product Maintenance.", {
          title: "Save Unavailable",
          variant: "danger",
        });
        return;
      }

      if (!window.parent.ServiceLoader?.loadProductLgLcService) {
        console.error("[ProductCharges] ServiceLoader.loadProductLgLcService not available on parent.");
        await uiAlert("Service loader is not available.", { title: "Error", variant: "danger" });
        return;
      }

      const parentProductField = window.parent.document?.getElementById("Product");
      const productId = parentProductField ? extractId(parentProductField.value) : "";
      if (!productId) {
        console.warn("[ProductCharges] No ProductID found on parent page; aborting save.");
        await uiAlert("No product selected in parent page. Please view a product first.", {
          title: "No Product",
          variant: "warning",
        });
        setToast("No product selected.", "warning");
        return;
      }

      setToast("Saving product charges...", "info");

      await window.parent.ServiceLoader.loadProductLgLcService();
      if (!window.parent.ProductLgLcService?.editProductCharge) {
        console.error("[ProductCharges] ProductLgLcService.editProductCharge is not available on parent.");
        await uiAlert("ProductLgLcService.editProductCharge is not available.", {
          title: "Error",
          variant: "danger",
        });
        return;
      }

      // Get session data for BankID and OperatorID
      const session = window.parent.AuthService?.getSession?.() || null;
      const bankId =
        session?.bankID ||
        session?.BankID ||
        window.parent.Environment?.BankID ||
        window.parent.Environment?.bankID ||
        "00";
      const operatorId =
        session?.operatorID ||
        session?.OperatorID ||
        window.parent.Environment?.OperatorID ||
        "JOY_WANJA";

      // Build XMLData from original loaded charges with updated IsSelected based on current checkbox state
      // Create a map of checkbox states by ChargeID
      const checkboxStates = new Map();
      qsa("tr", body || document).forEach((row) => {
        const chargeId = row.getAttribute("data-pc-charge-id") || "";
        const checkbox = row.querySelector('input[type="checkbox"]');
        if (chargeId && checkbox) {
          checkboxStates.set(chargeId, Boolean(checkbox.checked));
        }
      });

      // Build XML from ALL original charges with updated IsSelected flags
      const allCharges = (state.charges || [])
        .map((charge) => {
          const chargeId = charge.ChargeID || charge.chargeID || "";
          const effectiveDateId = charge.EffectiveDateID || charge.effectiveDateID || "";
          
          if (!chargeId.trim()) return null;

          // Get checkbox state from the map (or default to original IsSelected)
          const isSelected = checkboxStates.has(chargeId) 
            ? checkboxStates.get(chargeId) 
            : (charge.IsSelected === true || charge.IsSelected === "true");

          return {
            bankId: bankId,
            productId: productId,
            chargeId,
            effectiveDateId,
            isSelected,
          };
        })
        .filter(Boolean);

      console.log("[ProductCharges] allCharges from state", allCharges);
      try {
        if (window.parent && window.parent !== window && window.parent.console?.log) {
          window.parent.console.log("[ProductCharges][iframe] allCharges from grid", allCharges);
        }
      } catch {}

      // Build XML in dt_ProductCharge format (without ChargeEvent)
      const xmlRows = allCharges
        .map((charge) => {
          const isSelectedFlag = charge.isSelected ? "true" : "false";
          
          return (
            "<dt_ProductCharge>" +
            `<BankID>${escapeXml(charge.bankId)}</BankID>` +
            `<ProductID>${escapeXml(charge.productId)}</ProductID>` +
            `<ChargeID>${escapeXml(charge.chargeId)}</ChargeID>` +
            `<EffectiveDateID>${escapeXml(charge.effectiveDateId)}</EffectiveDateID>` +
            `<IsSelected>${isSelectedFlag}</IsSelected>` +
            `<IsEditable>true</IsEditable>` +
            `<ButtonMark>A</ButtonMark>` +
            "</dt_ProductCharge>"
          );
        })
        .join("");

      const xmlData = xmlRows;
      console.log("[ProductCharges] XMLData", xmlData);

      const requestData = {
        XMLData: xmlData,
        OperatorID: operatorId,
      };

      console.log("[ProductCharges] editProductCharge RequestData", requestData, "XMLData:", xmlData);
      try {
        if (window.parent && window.parent !== window && window.parent.console?.log) {
          window.parent.console.log("[ProductCharges][iframe] editProductCharge RequestData", requestData, "XMLData:", xmlData);
        }
      } catch {}

      try {
        const response = await window.parent.ProductLgLcService.editProductCharge(requestData);
        console.log("[ProductCharges] editProductCharge response", response);
        try {
          if (window.parent && window.parent !== window && window.parent.console?.log) {
            window.parent.console.log("[ProductCharges][iframe] editProductCharge response", response);
          }
        } catch {}

        if (!response?.success) {
          const message = response?.message || "Failed to save product charges.";
          await uiAlert(message, { title: "Save Failed", variant: "danger" });
          setToast("Save failed.", "danger");
          return;
        }

        setToast("Product charges saved.", "success");
        setMode("view");

        // Optionally, re-fetch to reflect latest state from server
        await fetchProductCharges();
      } catch (err) {
        console.error("[ProductCharges] Save failed:", err);
        try {
          if (window.parent && window.parent !== window && window.parent.console?.error) {
            window.parent.console.error("[ProductCharges][iframe] Save failed:", err);
          }
        } catch {}
        await uiAlert(`Error saving product charges: ${err.message || err}`, {
          title: "Error",
          variant: "danger",
        });
        setToast("Save failed.", "danger");
      }
    });

    qs('[data-pc-action="cancel"]')?.addEventListener("click", () => {
      console.log("[ProductCharges] Cancel clicked", { mode: state.mode });
      try {
        if (window.parent && window.parent !== window && window.parent.console?.log) {
          window.parent.console.log("[ProductCharges][iframe] Cancel clicked", { mode: state.mode });
        }
      } catch {}
      if (state.mode !== "edit") return;
      restoreCheckboxState(state.snapshot);
      state.snapshot = null;
      setToast("Cancelled.", "info");
      setMode("view");
    });
  }

  window.addEventListener("load", () => {
    bindActions();
    setMode("view");
    fetchProductCharges();
  });
})();
