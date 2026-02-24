document.addEventListener("DOMContentLoaded", () => {
  const els = {
    tbody: document.getElementById("deleteSuperviseTbody"),
    showImageBtn: document.getElementById("showImageBtn"),
    deleteBtn: document.getElementById("deleteBtn"),
    cancelBtn: document.getElementById("cancelBtn"),
    statusText: document.getElementById("statusText"),
    imagePreview: document.getElementById("imagePreview"),
    imagePlaceholder: document.getElementById("imagePlaceholder")
  };

  let rows = [];
  let selectedKey = "";

  const setStatus = (text) => {
    if (!els.statusText) return;
    els.statusText.textContent = text || "";
  };

  const setImage = (dataUrl) => {
    if (!els.imagePreview || !els.imagePlaceholder) return;
    const has = Boolean(dataUrl);
    els.imagePreview.hidden = !has;
    els.imagePlaceholder.hidden = has;
    if (has) {
      els.imagePreview.src = dataUrl;
    } else {
      els.imagePreview.removeAttribute("src");
    }
  };

  const setButtonsEnabled = (enabled) => {
    if (els.showImageBtn) els.showImageBtn.disabled = !enabled;
    if (els.deleteBtn) els.deleteBtn.disabled = !enabled;
  };

  const listAllCaptureKeys = () => {
    const keys = [];
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (key.startsWith("kairo:images:capture:")) {
          keys.push(key);
        }
      }
    } catch {
      // ignore
    }
    return keys.sort();
  };

  const readAnyRecord = (key) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const displayImageId = (record) => {
    const explicit = (record?.imageId || "").toString().trim();
    if (explicit) return explicit;
    const savedOn = (record?.savedOn || "").toString();
    const t = Date.parse(savedOn);
    return Number.isFinite(t) ? String(t) : "";
  };

  const render = () => {
    if (!els.tbody) return;

    els.tbody.innerHTML = "";
    selectedKey = "";
    rows = [];
    setImage("");
    setButtonsEnabled(false);
    setStatus("");

    const keys = listAllCaptureKeys();
    const items = keys
      .map((key) => ({ key, record: readAnyRecord(key) }))
      .filter((x) => Boolean(x.record));

    // This screen is for deleting already-reviewed records.
    const reviewed = items.filter(({ record }) => {
      const status = (record.status || "").toLowerCase();
      const hasImage = Boolean(record.imageDataUrl);
      return hasImage && (status === "supervised" || status === "rejected" || status === "closed");
    });

    if (reviewed.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 6;
      td.className = "no-records";
      td.textContent = "No records to display.";
      tr.appendChild(td);
      els.tbody.appendChild(tr);
      return;
    }

    reviewed.forEach(({ key, record }) => {
      const tr = document.createElement("tr");
      tr.dataset.key = key;
      tr.innerHTML = `
        <td>${displayImageId(record)}</td>
        <td>${(record.clientId || "").toString()}</td>
        <td>${(record.clientName || "").toString()}</td>
        <td>${(record.accountId || "").toString()}</td>
        <td>${(record.description || "").toString()}</td>
        <td>${(record.imageType || "").toString()}</td>
      `;
      tr.addEventListener("click", () => {
        selectedKey = key;
        els.tbody.querySelectorAll("tr").forEach((row) => {
          row.classList.toggle("is-selected", row.dataset.key === selectedKey);
        });
        setImage("");
        setButtonsEnabled(true);
      });
      tr.addEventListener("dblclick", () => {
        selectedKey = key;
        els.showImageBtn?.click();
      });
      els.tbody.appendChild(tr);
      rows.push({ key, record });
    });
  };

  const getSelected = () => rows.find((x) => x.key === selectedKey);

  els.showImageBtn?.addEventListener("click", () => {
    const entry = getSelected();
    if (!entry) {
      alert("Select a record first.");
      return;
    }
    setImage(entry.record.imageDataUrl || "");
    setStatus("Image loaded");
  });

  els.deleteBtn?.addEventListener("click", () => {
    const entry = getSelected();
    if (!entry) {
      alert("Select a record first.");
      return;
    }

    const ok = confirm("Delete selected record?");
    if (!ok) return;

    try {
      localStorage.removeItem(entry.key);
    } catch (e) {
      console.error(e);
      alert("Unable to delete record.");
      return;
    }

    setStatus("Deleted");
    render();
  });

  els.cancelBtn?.addEventListener("click", () => {
    selectedKey = "";
    els.tbody?.querySelectorAll("tr").forEach((row) => row.classList.remove("is-selected"));
    setImage("");
    setButtonsEnabled(false);
    setStatus("");
  });

  render();
});
