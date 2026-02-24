(() => {
  const form = document.querySelector(".silr-form");
  if (!form) return;

  const actionButtons = {
    view: document.querySelector('[data-action="view"]'),
    add: document.querySelector('[data-action="add"]'),
    edit: document.querySelector('[data-action="edit"]'),
    delete: document.querySelector('[data-action="delete"]'),
    save: document.querySelector('[data-action="save"]'),
    cancel: document.querySelector('[data-action="cancel"]'),
    stop: document.querySelector('[data-action="stop"]'),
    print: document.querySelector('[data-action="print"]')
  };

  const navButtons = {
    seriesPrev: document.querySelector('[data-nav="series-prev"]'),
    seriesNext: document.querySelector('[data-nav="series-next"]'),
    refPrev: document.querySelector('[data-nav="ref-prev"]'),
    refNext: document.querySelector('[data-nav="ref-next"]')
  };

  const editableSelector = ".silr-input:not([readonly]), .silr-select";
  const getEditableControls = () => Array.from(form.querySelectorAll(editableSelector));

  const initialSnapshot = new Map();

  const snapshotValues = () => {
    initialSnapshot.clear();
    getEditableControls().forEach((el) => {
      initialSnapshot.set(el.name || el.id, el.value);
    });
  };

  const restoreValues = () => {
    getEditableControls().forEach((el) => {
      const key = el.name || el.id;
      if (!initialSnapshot.has(key)) return;
      el.value = String(initialSnapshot.get(key) ?? "");
    });
  };

  const setEditMode = (isEditing) => {
    getEditableControls().forEach((el) => {
      el.disabled = !isEditing;
    });

    actionButtons.view && (actionButtons.view.disabled = isEditing);
    actionButtons.add && (actionButtons.add.disabled = isEditing);
    actionButtons.edit && (actionButtons.edit.disabled = isEditing);
    actionButtons.delete && (actionButtons.delete.disabled = isEditing);
    actionButtons.save && (actionButtons.save.disabled = !isEditing);
    actionButtons.cancel && (actionButtons.cancel.disabled = !isEditing);

    // Stop/Print available in view mode.
    actionButtons.stop && (actionButtons.stop.disabled = isEditing);
    actionButtons.print && (actionButtons.print.disabled = isEditing);

    Object.values(navButtons).forEach((btn) => {
      if (btn) btn.disabled = isEditing;
    });
  };

  const clearEditableValues = () => {
    getEditableControls().forEach((el) => {
      if (el.tagName === "SELECT") {
        el.value = "";
      } else {
        el.value = "";
      }
    });
  };

  snapshotValues();
  setEditMode(false);

  actionButtons.view?.addEventListener("click", () => {
    restoreValues();
    setEditMode(false);
  });

  actionButtons.add?.addEventListener("click", () => {
    snapshotValues();
    clearEditableValues();
    setEditMode(true);
    document.getElementById("loanAccountId")?.focus();
  });

  actionButtons.edit?.addEventListener("click", () => {
    snapshotValues();
    setEditMode(true);
    document.getElementById("referenceNo")?.focus();
  });

  actionButtons.cancel?.addEventListener("click", () => {
    restoreValues();
    setEditMode(false);
  });

  actionButtons.save?.addEventListener("click", () => {
    snapshotValues();
    setEditMode(false);
  });

  actionButtons.delete?.addEventListener("click", () => {
    snapshotValues();
    clearEditableValues();
    setEditMode(false);
  });

  actionButtons.stop?.addEventListener("click", () => {
    const status = document.getElementById("standingInstructionStatus");
    if (status) status.value = "Stopped";
  });

  actionButtons.print?.addEventListener("click", () => {
    window.print();
  });

  document.querySelectorAll(".silr-btn-lookup").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-lookup") || "";
      document.getElementById(targetId)?.focus();
    });
  });

  document.querySelectorAll(".silr-title-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-action");
      if (action === "refresh") {
        window.location.reload();
      }
    });
  });

  Object.values(navButtons).forEach((btn) => {
    btn?.addEventListener("click", () => {
      // UI-only placeholder.
    });
  });
})();
