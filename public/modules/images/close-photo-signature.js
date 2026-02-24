document.addEventListener("DOMContentLoaded", () => {
  const els = {
    branchId: document.getElementById("branchId"),
    branchName: document.getElementById("branchName"),
    imageType: document.getElementById("imageType"),
    clientId: document.getElementById("clientId"),
    description: document.getElementById("description"),
    branchLookupBtn: document.getElementById("branchLookupBtn"),
    clientLookupBtn: document.getElementById("clientLookupBtn"),

    viewBtn: document.getElementById("viewBtn"),
    closeImageBtn: document.getElementById("closeImageBtn"),
    cancelBtn: document.getElementById("cancelBtn"),

    statusText: document.getElementById("statusText"),
    imagePreview: document.getElementById("imagePreview"),
    imagePlaceholder: document.getElementById("imagePlaceholder")
  };

  let currentKey = "";
  let currentRecord = null;

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

  const clearSelection = () => {
    currentKey = "";
    currentRecord = null;
    setImage("");
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

  const normalize = (v) => (v || "").toString().trim().toLowerCase();

  const recordMatchesFilters = (record) => {
    const branchFilter = (els.branchId?.value || "").trim();
    const imageTypeFilter = normalize(els.imageType?.value);
    const clientIdFilter = normalize(els.clientId?.value);
    const descriptionFilter = normalize(els.description?.value);

    const recordBranch = (record.branchId || "").toString().trim();
    if (branchFilter && recordBranch && branchFilter !== recordBranch) return false;

    const recordImageType = normalize(record.imageType);
    if (imageTypeFilter && imageTypeFilter !== recordImageType) return false;

    const recordClientId = normalize(record.clientId);
    if (clientIdFilter && clientIdFilter !== recordClientId) return false;

    const recordDescription = normalize(record.description);
    if (descriptionFilter && !recordDescription.includes(descriptionFilter)) return false;

    const status = normalize(record.status);
    if (status === "closed" || status === "rejected") return false;

    return Boolean(record.imageDataUrl);
  };

  const recordTime = (record) => {
    const t = Date.parse((record.savedOn || "").toString());
    return Number.isFinite(t) ? t : 0;
  };

  const findBestMatch = () => {
    const keys = listAllCaptureKeys();
    const candidates = keys
      .map((key) => ({ key, record: readAnyRecord(key) }))
      .filter((x) => Boolean(x.record))
      .filter(({ record }) => recordMatchesFilters(record));

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => recordTime(b.record) - recordTime(a.record));
    return candidates[0];
  };

  els.branchLookupBtn?.addEventListener("click", () => {
    alert("Branch lookup is a placeholder in this prototype.");
  });

  els.clientLookupBtn?.addEventListener("click", () => {
    alert("Client lookup is a placeholder in this prototype.");
  });

  els.viewBtn?.addEventListener("click", () => {
    const match = findBestMatch();
    if (!match) {
      clearSelection();
      setStatus("No matching record found");
      alert("No matching record found.");
      return;
    }

    currentKey = match.key;
    currentRecord = match.record;
    setImage(match.record.imageDataUrl || "");
    setStatus("Loaded");
  });

  els.closeImageBtn?.addEventListener("click", () => {
    if (!currentKey || !currentRecord) {
      alert("View an image first.");
      return;
    }

    const record = { ...currentRecord };
    record.status = "Closed";
    record.statusOn = new Date().toISOString();

    try {
      localStorage.setItem(currentKey, JSON.stringify(record));
    } catch (e) {
      console.error(e);
      alert("Unable to close image.");
      return;
    }

    clearSelection();
    setStatus("Closed");
  });

  els.cancelBtn?.addEventListener("click", () => {
    if (els.imageType) els.imageType.value = "";
    if (els.clientId) els.clientId.value = "";
    if (els.description) els.description.value = "";
    clearSelection();
    setStatus("");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      if (document.activeElement && [els.clientId, els.description, els.imageType].includes(document.activeElement)) {
        event.preventDefault();
        els.viewBtn?.click();
      }
    }
  });

  // Default branch values (matches screenshot)
  if (els.branchId && !els.branchId.value) els.branchId.value = "0101";
  if (els.branchName && !els.branchName.value) els.branchName.value = "Head Office";

  setStatus("");
  setImage("");
});
