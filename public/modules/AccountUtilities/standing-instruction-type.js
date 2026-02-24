(() => {
  const form = document.querySelector(".sit-form");
  if (!form) return;

  const actionButtons = {
    view: document.querySelector('[data-action="view"]'),
    add: document.querySelector('[data-action="add"]'),
    edit: document.querySelector('[data-action="edit"]'),
    delete: document.querySelector('[data-action="delete"]'),
    save: document.querySelector('[data-action="save"]'),
    cancel: document.querySelector('[data-action="cancel"]')
  };

  const navButtons = {
    prev: document.querySelector('[data-nav="prev"]'),
    next: document.querySelector('[data-nav="next"]')
  };

  const titleButtons = document.querySelectorAll(".sit-title-btn");

  const editableSelector = ".sit-input:not([readonly]), .sit-select, .sit-checkbox";

  const getEditableControls = () => Array.from(form.querySelectorAll(editableSelector));

  const initialSnapshot = new Map();

  const snapshotValues = () => {
    initialSnapshot.clear();
    getEditableControls().forEach((el) => {
      if (el.type === "checkbox") {
        initialSnapshot.set(el.name || el.id, el.checked);
      } else {
        initialSnapshot.set(el.name || el.id, el.value);
      }
    });
  };

  const restoreValues = () => {
    getEditableControls().forEach((el) => {
      const key = el.name || el.id;
      if (!initialSnapshot.has(key)) return;
      const value = initialSnapshot.get(key);
      if (el.type === "checkbox") {
        el.checked = Boolean(value);
      } else {
        el.value = String(value ?? "");
      }
    });
  };

  const setEditMode = (isEditing) => {
    getEditableControls().forEach((el) => {
      el.disabled = !isEditing;
    });

    if (actionButtons.view) actionButtons.view.disabled = isEditing;
    if (actionButtons.add) actionButtons.add.disabled = isEditing;
    if (actionButtons.edit) actionButtons.edit.disabled = isEditing;
    if (actionButtons.delete) actionButtons.delete.disabled = isEditing;
    if (actionButtons.save) actionButtons.save.disabled = !isEditing;
    if (actionButtons.cancel) actionButtons.cancel.disabled = !isEditing;

    if (navButtons.prev) navButtons.prev.disabled = isEditing;
    if (navButtons.next) navButtons.next.disabled = isEditing;
  };

  const clearEditableValues = () => {
    getEditableControls().forEach((el) => {
      if (el.type === "checkbox") {
        el.checked = false;
      } else if (el.tagName === "SELECT") {
        el.value = "";
      } else {
        el.value = "";
      }
    });
  };

  // Default state
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
    const first = form.querySelector("#instructionTypeId");
    first?.focus();
  });

  actionButtons.edit?.addEventListener("click", () => {
    snapshotValues();
    setEditMode(true);
    const first = form.querySelector("#description");
    first?.focus();
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
    // UI only: no data source wired.
    snapshotValues();
    clearEditableValues();
    setEditMode(false);
  });

  document.querySelectorAll(".sit-btn-lookup").forEach((btn) => {
    btn.addEventListener("click", () => {
      // Placeholder hook.
      const targetId = btn.getAttribute("data-lookup") || "";
      const target = document.getElementById(targetId);
      target?.focus();
    });
  });

  Object.values(navButtons).forEach((btn) => {
    btn?.addEventListener("click", () => {
      // Placeholder hook.
    });
  });

  titleButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      // Placeholder window controls.
      const action = btn.getAttribute("data-action");
      if (action === "refresh") {
        window.location.reload();
      }
    });
  });
})();
