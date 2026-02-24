(() => {
  if (window.__kairoProductDocumentsLoaded) return;
  window.__kairoProductDocumentsLoaded = true;

  console.log("[ProductDocuments] script loaded");
  try {
    if (window.parent && window.parent !== window && window.parent.console?.log) {
      window.parent.console.log("[ProductDocuments][iframe] script loaded", window.location.href);
    }
  } catch {}

  const state = {
    mode: "view",
    snapshot: null,
    documents: [],
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
    return qs("[data-pd-grid-body]");
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function getCheckboxState() {
    const body = getGridBody();
    if (!body) return [];
    return qsa("tr", body).map((row) => {
      const applicable = row.querySelector('[data-pd-cell="applicable"] input[type="checkbox"]');
      const mandatory = row.querySelector('[data-pd-cell="mandatory"] input[type="checkbox"]');
      return {
        applicable: Boolean(applicable?.checked),
        mandatory: Boolean(mandatory?.checked),
      };
    });
  }

  function restoreCheckboxState(snapshot) {
    const body = getGridBody();
    if (!body || !Array.isArray(snapshot)) return;

    qsa("tr", body).forEach((row, idx) => {
      const next = snapshot[idx];
      const applicable = row.querySelector('[data-pd-cell="applicable"] input[type="checkbox"]');
      const mandatory = row.querySelector('[data-pd-cell="mandatory"] input[type="checkbox"]');
      if (applicable && next) applicable.checked = Boolean(next.applicable);
      if (mandatory && next) mandatory.checked = Boolean(next.mandatory);
    });
  }

  function renderRows(rows) {
    const body = getGridBody();
    if (!body) return;

    body.innerHTML = rows
      .map((row, idx) => {
        const rowNum = idx + 1;
        const description = row?.description ? escapeHtml(row.description) : "";
        const isApplicable = Boolean(row?.isApplicable);
        const isMandatory = Boolean(row?.isMandatory);
        const documentClassId = row?.documentClassId || row?.DocumentClassID || row?.DocumentClassId || "";
        const bankId = row?.bankId || row?.BankID || "";
        const productId = row?.productId || row?.ProductID || "";
        const updateCount = row?.UpdateCount ?? row?.updateCount ?? 0;
        
        // Check for IsSelected and IsEditable flags (normalized to boolean)
        const isSelected = Boolean(row?.IsSelected);
        const isEditable = Boolean(row?.IsEditable);
        
        // Checkbox should be checked if (isSelected AND isEditable) OR isApplicable/isMandatory
        const applicableChecked = (isSelected && isEditable) || isApplicable;
        const mandatoryChecked = (isSelected && isEditable) || isMandatory;

        return `
          <tr
            data-pd-doc-class-id="${escapeHtml(documentClassId)}"
            data-pd-bank-id="${escapeHtml(bankId)}"
            data-pd-product-id="${escapeHtml(productId)}"
            data-pd-update-count="${String(updateCount)}"
          >
            <td data-pd-cell="description">${description || "&nbsp;"}</td>
            <td class="pd-flag" data-pd-cell="applicable">
              <input type="checkbox" ${applicableChecked ? "checked" : ""} disabled aria-label="IsApplicable row ${rowNum}" />
            </td>
            <td class="pd-flag" data-pd-cell="mandatory">
              <input type="checkbox" ${mandatoryChecked ? "checked" : ""} disabled aria-label="Is Mandatory row ${rowNum}" />
            </td>
          </tr>`;
      })
      .join("");
  }

  function ensureBlankRows(count = 10) {
    const body = getGridBody();
    if (!body) return;
    if (body.children.length) return;
    renderRows(
      Array.from({ length: count }, () => ({
        description: "",
        isApplicable: false,
        isMandatory: false,
        documentClassId: "",
        bankId: "",
        productId: "",
        UpdateCount: 0,
      }))
    );
  }

  function escapeXml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function formatLegacyDateTime(d = new Date()) {
    const pad2 = (n) => String(n).padStart(2, "0");
    const mm = pad2(d.getMonth() + 1);
    const dd = pad2(d.getDate());
    const yyyy = d.getFullYear();
    const hh = pad2(d.getHours());
    const mi = pad2(d.getMinutes());
    const ss = pad2(d.getSeconds());
    return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
  }

  function setToast(message, variant = "info") {
    const toast = qs("#pdToast");
    if (!toast) return;
    toast.classList.remove("d-none", "alert-success", "alert-danger", "alert-warning", "alert-info");
    toast.classList.add(`alert-${variant}`);
    toast.textContent = message;
    window.setTimeout(() => toast.classList.add("d-none"), 2200);
  }

  function setMode(nextMode) {
    console.log("[ProductDocuments] setMode", { from: state.mode, to: nextMode });
    try {
      if (window.parent && window.parent !== window && window.parent.console?.log) {
        window.parent.console.log("[ProductDocuments][iframe] setMode", { from: state.mode, to: nextMode });
      }
    } catch {}
    state.mode = nextMode;

    const isEdit = nextMode === "edit";
    const editBtn = qs('[data-pd-action="edit"]');
    const saveBtn = qs('[data-pd-action="save"]');
    const cancelBtn = qs('[data-pd-action="cancel"]');

    if (editBtn) editBtn.disabled = isEdit;
    if (saveBtn) saveBtn.disabled = !isEdit;
    if (cancelBtn) cancelBtn.disabled = !isEdit;

    // No prefilled records: if grid is empty, there is nothing to toggle.
    // If rows are added later, keep checkboxes locked until Edit.
    qsa('input[type="checkbox"]', getGridBody() || document).forEach((cb) => {
      cb.disabled = !isEdit;
    });
  }

  function bindActions() {
    qs('[data-pd-action="edit"]')?.addEventListener("click", () => {
      console.log("[ProductDocuments] Edit clicked", { mode: state.mode });
      try {
        if (window.parent && window.parent !== window && window.parent.console?.log) {
          window.parent.console.log("[ProductDocuments][iframe] Edit clicked", { mode: state.mode });
        }
      } catch {}
      state.snapshot = getCheckboxState();
      setMode("edit");
      setToast("Edit enabled.", "info");
    });

    qs('[data-pd-action="save"]')?.addEventListener("click", async () => {
      console.log("[ProductDocuments] Save clicked", { mode: state.mode });
      try {
        if (window.parent && window.parent !== window && window.parent.console?.log) {
          window.parent.console.log("[ProductDocuments][iframe] Save clicked", { mode: state.mode });
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
        console.warn("[ProductDocuments] No parent window detected; save is only supported from within Product Maintenance iframe.");
        await uiAlert("Save is only available when opened from Product Maintenance.", {
          title: "Save Unavailable",
          variant: "danger",
        });
        return;
      }

      if (!window.parent.ServiceLoader?.loadProductLgLcService) {
        console.error("[ProductDocuments] ServiceLoader.loadProductLgLcService not available on parent.");
        await uiAlert("Service loader is not available.", { title: "Error", variant: "danger" });
        return;
      }

      const parentProductField = window.parent.document?.getElementById("Product");
      const productId = parentProductField ? extractId(parentProductField.value) : "";
      if (!productId) {
        console.warn("[ProductDocuments] No ProductID found on parent page; aborting save.");
        await uiAlert("No product selected in parent page. Please view a product first.", {
          title: "No Product",
          variant: "warning",
        });
        setToast("No product selected.", "warning");
        return;
      }

      setToast("Saving product documents...", "info");

      await window.parent.ServiceLoader.loadProductLgLcService();
      if (!window.parent.ProductLgLcService?.editProductDocuments) {
        console.error("[ProductDocuments] ProductLgLcService.editProductDocuments is not available on parent.");
        await uiAlert("ProductLgLcService.editProductDocuments is not available.", {
          title: "Error",
          variant: "danger",
        });
        return;
      }

      // Build DetailRecords XML from the current grid state
      const detailItems = rows.map((row, idx) => {
        const descCell = row.querySelector('[data-pd-cell="description"]');
        const applicableCb = row.querySelector('[data-pd-cell="applicable"] input[type="checkbox"]');
        const mandatoryCb = row.querySelector('[data-pd-cell="mandatory"] input[type="checkbox"]');

        const docClassId = row.getAttribute("data-pd-doc-class-id") || "";
        const rowBankId = row.getAttribute("data-pd-bank-id") || "";
        const rowProductId = row.getAttribute("data-pd-product-id") || "";
        const rowUpdateCountAttr = row.getAttribute("data-pd-update-count");
        const rowUpdateCount =
          rowUpdateCountAttr != null && !Number.isNaN(Number(rowUpdateCountAttr))
            ? Number(rowUpdateCountAttr)
            : 0;

        const description = (descCell?.textContent || "").trim();
        const isApplicable = !!applicableCb?.checked;
        const isMandatory = !!mandatoryCb?.checked;

        return {
          bankId: rowBankId,
          productId: rowProductId,
          updateCount: rowUpdateCount,
          documentClassId: docClassId,
          description,
          isApplicable,
          isMandatory,
        };
      });

      console.log("[ProductDocuments] detailItems from grid", detailItems);
      try {
        if (window.parent && window.parent !== window && window.parent.console?.log) {
          window.parent.console.log("[ProductDocuments][iframe] detailItems from grid", detailItems);
        }
      } catch {}

      const detailXmlRows = detailItems
        .map((row) => {
          const hasKey = !!String(row.documentClassId || "").trim();
          if (!hasKey) return "";
          // Backend sample expects:
          // set @p7 = convert(xml, N'<dt_ProductDocuments><DocumentClassID>DOC1</DocumentClassID><IsMandatory>false</IsMandatory></dt_ProductDocuments>')
          const mandatoryFlag = row.isMandatory ? "true" : "false";
          return (
            "<dt_ProductDocuments>" +
            `<DocumentClassID>${escapeXml(row.documentClassId)}</DocumentClassID>` +
            `<IsMandatory>${mandatoryFlag}</IsMandatory>` +
            "</dt_ProductDocuments>"
          );
        })
        .filter(Boolean)
        .join("");
      console.log("detailXmlRows (dt_ProductDocuments)", detailXmlRows);

      // DetailRecords is the raw XML fragment; SP does its own convert(xml, N'<dt_ProductDocuments>...')
      const detailRecords = detailXmlRows;

      const session = window.parent.AuthService?.getSession?.() || null;
      const bankId =
        session?.bankID ||
        session?.BankID ||
        window.parent.Environment?.BankID ||
        window.parent.Environment?.bankID ||
        "00";
      const operatorId =
        "JOY_WANJA";

      let updateCount = 0;
      if (Array.isArray(state.documents) && state.documents.length) {
        const counts = state.documents
          .map((d) => {
            const raw = d.UpdateCount ?? d.updateCount;
            const n = raw != null && !Number.isNaN(Number(raw)) ? Number(raw) : 0;
            return n;
          })
          .filter((n) => n >= 0);
        if (counts.length) {
          updateCount = Math.max(...counts);
        }
      }

      const requestData = {
        BankID: bankId,
        ProductID: productId,
        OperatedBy: operatorId,
        OperatedOn: formatLegacyDateTime(),
        SupervisedBy: operatorId,
        UpdateCount: updateCount,
        DetailRecords: detailRecords,
      };

      console.log("editProductDocuments RequestData", requestData, "DetailRecords XML:", detailRecords);
      // try {
      //   if (window.parent && window.parent !== window && window.parent.console?.log) {
      //     window.parent.console.log("[ProductDocuments][iframe] editProductDocuments RequestData", requestData, "DetailRecords XML:", detailRecords);
      //   }
      // } catch {}

      try {
        const response = await window.parent.ProductLgLcService.editProductDocuments(requestData);
        console.log("[ProductDocuments] editProductDocuments response", response);
        // try {
        //   if (window.parent && window.parent !== window && window.parent.console?.log) {
        //     window.parent.console.log("[ProductDocuments][iframe] editProductDocuments response", response);
        //   }
        // } catch {}

        if (!response?.success) {
          const message = response?.message || "Failed to save product documents.";
          await uiAlert(message, { title: "Save Failed", variant: "danger" });
          setToast("Save failed.", "danger");
          return;
        }

        setToast("Product documents saved.", "success");
        setMode("view");

        // Optionally, re-fetch to reflect latest state from server
        // await fetchProductDocuments();
      } catch (err) {
        console.error("[ProductDocuments] Save failed:", err);

        // await uiAlert(`Error saving product documents: ${err.message || err}` , {
        //   title: "Error",
        //   variant: "danger",
        // });
        setToast("Save failed.", "danger");
      }
    });

    qs('[data-pd-action="cancel"]')?.addEventListener("click", () => {
      console.log("[ProductDocuments] Cancel clicked", { mode: state.mode });
      try {
        if (window.parent && window.parent !== window && window.parent.console?.log) {
          window.parent.console.log("[ProductDocuments][iframe] Cancel clicked", { mode: state.mode });
        }
      } catch {}
      if (state.mode !== "edit") return;
      restoreCheckboxState(state.snapshot);
      state.snapshot = null;
      setToast("Cancelled.", "info");
      setMode("view");
    });

    qs('[data-pd-action="back"]')?.addEventListener("click", () => {
      console.log("[ProductDocuments] Back clicked");
      try {
        if (window.parent && window.parent !== window && window.parent.console?.log) {
          window.parent.console.log("[ProductDocuments][iframe] Back clicked");
        }
      } catch {}
      window.location.href = "product-maintenance-treasury.html";
    });
  }

  async function uiAlert(message, titleOrOptions) {
    const title = typeof titleOrOptions === "string" ? titleOrOptions : titleOrOptions?.title || "Message";

    // Try to use parent page modal if available
    if (window.parent?.uiAlert && window.parent !== window) {
      return window.parent.uiAlert(message, titleOrOptions);
    }

    // Fallback to browser alert
    window.alert(`${title}\n\n${message}`);
    return Promise.resolve(true);
  }

  async function fetchProductDocuments() {
    if (!window.parent || window.parent === window) {
      ensureBlankRows(4);
      return;
    }

    if (!window.parent.ServiceLoader?.loadProductLgLcService) {
      await uiAlert("Service loader is not available.", { title: "Error", variant: "danger" });
      ensureBlankRows(4);
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
      ensureBlankRows(4);
      return;
    }

    setToast("Loading product documents...", "info");

    await window.parent.ServiceLoader.loadProductLgLcService();

    if (!window.parent.ProductLgLcService?.getProductDocuments) {
      await uiAlert("ProductLgLcService.getProductDocuments is not available.", { title: "Error", variant: "danger" });
      ensureBlankRows(4);
      return;
    }

    const session = window.parent.AuthService?.getSession?.() || null;
    const bankId =
      session?.bankID ||
      session?.BankID ||
      window.parent.Environment?.BankID ||
      window.parent.Environment?.bankID ||
      "00";
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
      BankID: bankId,
      OurBranchID: branchId,
      ProductID: productId,
      OperatorID: operatorId,
    };

    console.log("[ProductDocuments] getProductDocuments request", requestData);
    try {
      if (window.parent && window.parent !== window && window.parent.console?.log) {
        window.parent.console.log("[ProductDocuments][iframe] getProductDocuments request", requestData);
      }
    } catch {}

    try {
      const response = await window.parent.ProductLgLcService.getProductDocuments(requestData);
      console.log("[ProductDocuments] getProductDocuments response", response);
      try {
        if (window.parent && window.parent !== window && window.parent.console?.log) {
          window.parent.console.log("[ProductDocuments][iframe] getProductDocuments response", response);
        }
      } catch {}

      if (!response?.success) {
        const message = response?.message || "Product documents not found.";
        await uiAlert(message, { title: "Not Found", variant: "warning" });
        setToast(message, "warning");
        ensureBlankRows(4);
        return;
      }

      const payload = response?.data || {};
      let rawRows = [];

      if (Array.isArray(payload.Details01)) {
        rawRows = payload.Details01;
      } else if (Array.isArray(payload.Details)) {
        rawRows = payload.Details;
      } else if (Array.isArray(payload)) {
        rawRows = payload;
      }

      console.log("[ProductDocuments] rawRows from API", rawRows);
      try {
        if (window.parent && window.parent !== window && window.parent.console?.log) {
          window.parent.console.log("[ProductDocuments][iframe] rawRows from API", rawRows);
        }
      } catch {}

      const documents = rawRows.map((row) => {
        const documentClassId =
          row?.DocumentClassID ||
          row?.DocumentClassId ||
          row?.DocClassID ||
          row?.DocClassId ||
          "";
        const rowBankId = row?.BankID || "";
        const rowProductId = row?.ProductID || "";
        const desc =
          row?.Description ||
          row?.DocumentDescription ||
          row?.DocDescription ||
          "";

        const isApplicableRaw = row?.IsApplicable ?? row?.Applicable;
        const isMandatoryRaw = row?.IsMandatory ?? row?.Mandatory;

        const normalizeFlag = (val) =>
          val === true || val === 1 || val === "1" || val === "Y" || val === "y";

        const updateCount = row?.UpdateCount ?? row?.updateCount ?? 0;
        
        // Preserve IsSelected and IsEditable flags
        const isSelectedRaw = row?.IsSelected ?? row?.isSelected;
        const isEditableRaw = row?.IsEditable ?? row?.isEditable;

        return {
          documentClassId,
          bankId: rowBankId,
          productId: rowProductId,
          description: desc,
          isApplicable: normalizeFlag(isApplicableRaw),
          isMandatory: normalizeFlag(isMandatoryRaw),
          UpdateCount: updateCount,
          IsSelected: normalizeFlag(isSelectedRaw),
          IsEditable: normalizeFlag(isEditableRaw),
        };
      });

      console.log("[ProductDocuments] normalized documents", documents);
      try {
        if (window.parent && window.parent !== window && window.parent.console?.log) {
          window.parent.console.log("[ProductDocuments][iframe] normalized documents", documents);
        }
      } catch {}
      state.documents = documents;

      if (!documents.length) {
        ensureBlankRows(4);
      } else {
        renderRows(documents);
      }

      setToast("Product documents loaded.", "success");
    } catch (err) {
      console.error("[ProductDocuments] Fetch failed:", err);
      try {
        if (window.parent && window.parent !== window && window.parent.console?.error) {
          window.parent.console.error("[ProductDocuments][iframe] Fetch failed:", err);
        }
      } catch {}
      await uiAlert(`Error loading product documents: ${err.message || err}` , {
        title: "Error",
        variant: "danger",
      });
      setToast("Failed to load data.", "danger");
      ensureBlankRows(4);
    }
  }

  window.addEventListener("load", () => {
    bindActions();
    setMode("view");
    fetchProductDocuments();
  });
})();
