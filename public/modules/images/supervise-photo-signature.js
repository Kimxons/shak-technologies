document.addEventListener("DOMContentLoaded", () => {
  const els = {
    tbody: document.getElementById("superviseTbody"),
    showImageBtn: document.getElementById("showImageBtn"),
    superviseBtn: document.getElementById("superviseBtn"),
    rejectBtn: document.getElementById("rejectBtn"),
    cancelBtn: document.getElementById("cancelBtn"),
    statusText: document.getElementById("statusText"),
    imagePreview: document.getElementById("imagePreview"),
    imagePlaceholder: document.getElementById("imagePlaceholder")
  };

  let records = [];
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
    setImage("");

    const keys = listAllCaptureKeys();
    const items = keys
      .map((key) => ({ key, record: readAnyRecord(key) }))
      .filter((x) => Boolean(x.record));

    // Only show items that have an image and are not supervised/rejected.
    records = items.filter(({ record }) => {
      const status = (record.status || "").toLowerCase();
      const hasImage = Boolean(record.imageDataUrl);
      const isDone = status === "supervised" || status === "rejected";
      return hasImage && !isDone;
    });

    if (records.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 6;
      td.className = "no-records";
      td.textContent = "No records to display.";
      tr.appendChild(td);
      els.tbody.appendChild(tr);
      return;
    }

    records.forEach(({ key, record }) => {
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
      });
      tr.addEventListener("dblclick", () => {
        selectedKey = key;
        els.showImageBtn?.click();
      });
      els.tbody.appendChild(tr);
    });
  };

  const getSelected = () => records.find((x) => x.key === selectedKey);

  els.showImageBtn?.addEventListener("click", () => {
    const entry = getSelected();
    if (!entry) {
      alert("Select a record first.");
      return;
    }
    setImage(entry.record.imageDataUrl || "");
    setStatus("Image loaded");
  });

  const updateSelectedStatus = (nextStatus) => {
    const entry = getSelected();
    if (!entry) {
      alert("Select a record first.");
      return;
    }

    const record = { ...entry.record };
    record.status = nextStatus;
    record.statusOn = new Date().toISOString();

    try {
      localStorage.setItem(entry.key, JSON.stringify(record));
    } catch (e) {
      console.error(e);
      alert("Unable to update record.");
      return;
    }

    setImage("");
    setStatus(nextStatus);
    render();
  };

  els.superviseBtn?.addEventListener("click", () => updateSelectedStatus("Supervised"));
  els.rejectBtn?.addEventListener("click", () => updateSelectedStatus("Rejected"));

  els.cancelBtn?.addEventListener("click", () => {
    selectedKey = "";
    els.tbody?.querySelectorAll("tr").forEach((row) => row.classList.remove("is-selected"));
    setImage("");
    setStatus("");
  });

  render();
});
