(() => {
  const TOAST_ID = "fprToast";

  function byId(id) {
    return document.getElementById(id);
  }

  function showToast(message, tone = "info") {
    const el = byId(TOAST_ID);
    if (!el) return;

    el.classList.remove("d-none", "alert-info", "alert-warning", "alert-danger", "alert-success");

    const cls = {
      info: "alert-info",
      warning: "alert-warning",
      danger: "alert-danger",
      success: "alert-success"
    }[tone] || "alert-info";

    el.classList.add(cls);
    el.textContent = message;

    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => {
      el.classList.add("d-none");
    }, 2400);
  }

  function setEditable(enabled) {
    document.querySelectorAll("[data-editable='true']").forEach((control) => {
      if (control.id === "BranchID" || control.id === "branchId" || control.id === "OurBranchID") {
        control.disabled = false;
        control.readOnly = false;
        return;
      }

      if (control.matches("select")) {
        control.disabled = !enabled;
        return;
      }

      if (control.matches("input[type='checkbox']")) {
        control.disabled = !enabled;
        return;
      }

      control.readOnly = !enabled;
    });

    document.querySelectorAll("[data-lookup], [data-fpr-browse-image]").forEach((btn) => {
      if (btn.getAttribute("data-lookup") === "branch") {
        btn.disabled = false;
        return;
      }

      btn.disabled = !enabled;
    });
  }

  function validateRequired() {
    const form = byId("fpr-form");
    if (!form) return true;

    const required = Array.from(form.querySelectorAll("[required]"));
    const invalid = required.filter((el) => {
      if (el.disabled) return false;
      if (el.matches("select")) return !String(el.value || "").trim();
      return !String(el.value || "").trim();
    });

    if (!invalid.length) return true;

    invalid[0].focus();
    showToast("Please fill all required fields.", "warning");
    return false;
  }

  function setMode(mode) {
    const buttons = Array.from(document.querySelectorAll("[data-fpr-action]"));
    const get = (action) => buttons.find((b) => b.dataset.fprAction === action);

    const viewBtn = get("view");
    const addBtn = get("add");
    const editBtn = get("edit");
    const deleteBtn = get("delete");
    const saveBtn = get("save");
    const cancelBtn = get("cancel");

    if (mode === "view") {
      setEditable(false);
      if (viewBtn) viewBtn.disabled = false;
      if (addBtn) addBtn.disabled = false;
      if (editBtn) editBtn.disabled = false;
      if (deleteBtn) deleteBtn.disabled = false;
      if (saveBtn) saveBtn.disabled = true;
      if (cancelBtn) cancelBtn.disabled = true;
      return;
    }

    if (mode === "add" || mode === "edit") {
      setEditable(true);
      if (viewBtn) viewBtn.disabled = false;
      if (addBtn) addBtn.disabled = true;
      if (editBtn) editBtn.disabled = true;
      if (deleteBtn) deleteBtn.disabled = true;
      if (saveBtn) saveBtn.disabled = false;
      if (cancelBtn) cancelBtn.disabled = false;
      return;
    }
  }

  function wireTabs() {
    const tabButtons = Array.from(document.querySelectorAll(".elc-tablist [data-bs-toggle='tab']"));
    const panes = Array.from(document.querySelectorAll(".elc-tabcontent .tab-pane"));

    if (!tabButtons.length || !panes.length) return;

    tabButtons.forEach((tabBtn) => {
      tabBtn.addEventListener("click", (ev) => {
        ev.preventDefault();

        const targetSelector = tabBtn.getAttribute("data-bs-target");
        if (!targetSelector) return;

        const targetPane = document.querySelector(targetSelector);
        if (!targetPane) return;

        tabButtons.forEach((btn) => btn.classList.remove("active"));
        panes.forEach((pane) => pane.classList.remove("show", "active"));

        tabBtn.classList.add("active");
        targetPane.classList.add("show", "active");
      });
    });
  }

  function wireLookups() {
    document.querySelectorAll("[data-lookup]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const type = btn.dataset.lookup;
        showToast(`Lookup: ${type} (demo).`);
      });
    });

    const browse = document.querySelector("[data-fpr-browse-image]");
    if (browse) {
      browse.addEventListener("click", () => {
        showToast("Browse document image (demo).", "info");
      });
    }
  }

  function wireActions() {
    document.querySelectorAll("[data-fpr-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.fprAction;

        if (action === "view") {
          setMode("view");
          showToast("View mode.");
          return;
        }

        if (action === "add") {
          setMode("add");
          showToast("Add mode.");
          return;
        }

        if (action === "edit") {
          setMode("edit");
          showToast("Edit mode.");
          return;
        }

        if (action === "save") {
          if (!validateRequired()) return;
          setMode("view");
          showToast("Saved (demo).", "success");
          return;
        }

        if (action === "cancel") {
          setMode("view");
          showToast("Cancelled.");
          return;
        }

        showToast("Action not wired yet.", "warning");
      });
    });
  }

  function init() {
    setMode("add");
    wireTabs();
    wireLookups();
    wireActions();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
