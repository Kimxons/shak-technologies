document.addEventListener("DOMContentLoaded", () => {
  const els = {
    imageType: document.getElementById("imageType"),
    status: document.getElementById("status"),
    clientId: document.getElementById("clientId"),
    tempClientId: document.getElementById("tempClientId"),
    description: document.getElementById("description"),
    isExistingClient: document.getElementById("isExistingClient"),

    viewAllBtn: document.getElementById("viewAllBtn"),
    scanBtn: document.getElementById("scanBtn"),
    fileBtn: document.getElementById("fileBtn"),
    captureBtn: document.getElementById("captureBtn"),

    addBtn: document.getElementById("addBtn"),
    saveBtn: document.getElementById("saveBtn"),
    cancelBtn: document.getElementById("cancelBtn"),

    snapshotBtn: document.getElementById("snapshotBtn"),
    cancelSnapshotBtn: document.getElementById("cancelSnapshotBtn"),

    filePicker: document.getElementById("filePicker"),

    imagePlaceholder: document.getElementById("imagePlaceholder"),
    cameraVideo: document.getElementById("cameraVideo"),
    snapshotCanvas: document.getElementById("snapshotCanvas"),
    filePreview: document.getElementById("filePreview")
  };

  const viewAll = {
    overlay: document.getElementById("viewAllOverlay"),
    tbody: document.getElementById("viewAllTbody"),
    table: document.getElementById("viewAllTable"),
    image: document.getElementById("viewAllImage"),
    placeholder: document.getElementById("viewAllImagePlaceholder"),
    closeBtns: document.querySelectorAll("[data-viewall-close]"),
    showBtn: document.getElementById("showImageBtn"),
    deleteBtn: document.getElementById("deleteImageBtn"),
    cancelBtn: document.getElementById("cancelViewAllBtn"),
    backBtn: document.getElementById("backViewAllBtn")
  };

  let cameraStream = null;
  let lastSaved = null;
  let currentImageDataUrl = "";
  let viewAllRecords = [];
  let selectedViewAllKey = "";

  const setStatus = (value) => {
    if (!els.status) return;
    els.status.value = value;
  };

  const stopCamera = () => {
    if (!cameraStream) return;
    cameraStream.getTracks().forEach((t) => t.stop());
    cameraStream = null;
  };

  const showOnly = (target) => {
    const views = [els.cameraVideo, els.snapshotCanvas, els.filePreview];
    views.forEach((el) => {
      if (!el) return;
      el.hidden = el !== target;
    });

    if (els.imagePlaceholder) {
      els.imagePlaceholder.hidden = Boolean(target);
    }
  };

  const clearPreview = () => {
    stopCamera();
    currentImageDataUrl = "";
    if (els.cameraVideo) {
      els.cameraVideo.srcObject = null;
    }
    if (els.snapshotCanvas) {
      const ctx = els.snapshotCanvas.getContext("2d");
      ctx?.clearRect(0, 0, els.snapshotCanvas.width, els.snapshotCanvas.height);
    }
    if (els.filePreview) {
      els.filePreview.removeAttribute("src");
    }
    showOnly(null);

    if (els.snapshotBtn) els.snapshotBtn.disabled = true;
    if (els.cancelSnapshotBtn) els.cancelSnapshotBtn.disabled = true;
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

  const closeViewAll = () => {
    if (!viewAll.overlay) return;
    viewAll.overlay.hidden = true;
  };

  const setViewAllImage = (dataUrl) => {
    if (!viewAll.image || !viewAll.placeholder) return;
    const has = Boolean(dataUrl);
    viewAll.image.hidden = !has;
    viewAll.placeholder.hidden = has;
    if (has) {
      viewAll.image.src = dataUrl;
    } else {
      viewAll.image.removeAttribute("src");
    }
  };

  const selectViewAllRow = (key) => {
    selectedViewAllKey = key || "";
    viewAll.tbody?.querySelectorAll("tr").forEach((tr) => {
      tr.classList.toggle("is-selected", tr.dataset.key === selectedViewAllKey);
    });
    setViewAllImage("");
  };

  const renderViewAll = () => {
    if (!viewAll.tbody) return;
    viewAll.tbody.innerHTML = "";
    selectedViewAllKey = "";
    setViewAllImage("");

    const keys = listAllCaptureKeys();
    const records = keys
      .map((key) => ({ key, record: readAnyRecord(key) }))
      .filter((x) => Boolean(x.record));

    viewAllRecords = records;

    if (records.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 5;
      td.className = "no-records";
      td.textContent = "No records to display.";
      tr.appendChild(td);
      viewAll.tbody.appendChild(tr);
      return;
    }

    records.forEach(({ key, record }) => {
      const tr = document.createElement("tr");
      tr.dataset.key = key;
      tr.innerHTML = `
        <td>${(record.imageType || "").toString()}</td>
        <td>${(record.clientId || "").toString()}</td>
        <td>${(record.clientName || "").toString()}</td>
        <td>${(record.accountId || "").toString()}</td>
        <td>${(record.description || "").toString()}</td>
      `;
      tr.addEventListener("click", () => selectViewAllRow(key));
      tr.addEventListener("dblclick", () => {
        selectViewAllRow(key);
        viewAll.showBtn?.click();
      });
      viewAll.tbody.appendChild(tr);
    });
  };

  const openViewAll = () => {
    if (!viewAll.overlay) return;
    renderViewAll();
    viewAll.overlay.hidden = false;
  };

  const getRecordKey = () => {
    const branchId = (document.getElementById("branchId")?.value || "").trim() || "0101";
    const imageType = (els.imageType?.value || "").trim() || "unknown";
    const clientId = (els.clientId?.value || "").trim();
    const tempClientId = (els.tempClientId?.value || "").trim();
    const id = clientId || tempClientId || "unassigned";
    return `kairo:images:capture:${branchId}:${imageType}:${id}`;
  };

  const readDraft = () => {
    try {
      const raw = localStorage.getItem(getRecordKey());
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const writeDraft = (record) => {
    localStorage.setItem(getRecordKey(), JSON.stringify(record));
  };

  const snapshotFromVideo = () => {
    if (!els.cameraVideo || !els.snapshotCanvas) return;
    const video = els.cameraVideo;
    const canvas = els.snapshotCanvas;

    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;

    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, w, h);

    showOnly(canvas);
    setStatus("Snapshot captured");
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Camera capture is not supported in this browser.");
      return;
    }

    try {
      setStatus("Starting camera...");
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (!els.cameraVideo) return;
      els.cameraVideo.srcObject = cameraStream;
      showOnly(els.cameraVideo);
      if (els.snapshotBtn) els.snapshotBtn.disabled = false;
      if (els.cancelSnapshotBtn) els.cancelSnapshotBtn.disabled = false;
      setStatus("Camera ready");
    } catch (error) {
      console.error(error);
      alert("Unable to access camera. Check permissions.");
      setStatus("Camera permission denied");
      stopCamera();
    }
  };

  const loadFromStorageIfAny = () => {
    const draft = readDraft();
    if (!draft) {
      setStatus("");
      return;
    }

    lastSaved = draft;
    if (els.description && typeof draft.description === "string") els.description.value = draft.description;
    if (els.isExistingClient && typeof draft.isExistingClient === "boolean") els.isExistingClient.checked = draft.isExistingClient;

    setStatus("Loaded saved record");
  };

  els.viewAllBtn?.addEventListener("click", () => {
    openViewAll();
  });

  els.scanBtn?.addEventListener("click", () => {
    alert("Scan is a placeholder in this prototype.");
  });

  els.fileBtn?.addEventListener("click", () => {
    els.filePicker?.click();
  });

  els.filePicker?.addEventListener("change", () => {
    const file = els.filePicker.files?.[0];
    if (!file) return;

    stopCamera();

    const url = URL.createObjectURL(file);
    if (els.filePreview) {
      els.filePreview.src = url;
      showOnly(els.filePreview);
      setStatus("Loaded from file");
    }

    // Persistable preview
    try {
      const reader = new FileReader();
      reader.onload = () => {
        currentImageDataUrl = typeof reader.result === "string" ? reader.result : "";
      };
      reader.readAsDataURL(file);
    } catch {
      currentImageDataUrl = "";
    }

    if (els.snapshotBtn) els.snapshotBtn.disabled = true;
    if (els.cancelSnapshotBtn) els.cancelSnapshotBtn.disabled = false;
  });

  els.captureBtn?.addEventListener("click", () => {
    clearPreview();
    startCamera();
  });

  els.snapshotBtn?.addEventListener("click", () => {
    snapshotFromVideo();
    try {
      currentImageDataUrl = els.snapshotCanvas?.toDataURL("image/png") || "";
    } catch {
      currentImageDataUrl = "";
    }
  });

  els.cancelSnapshotBtn?.addEventListener("click", () => {
    clearPreview();
    setStatus("Capture canceled");
  });

  els.addBtn?.addEventListener("click", () => {
    if (els.clientId) els.clientId.value = "";
    if (els.tempClientId) els.tempClientId.value = "";
    if (els.description) els.description.value = "";
    if (els.imageType) els.imageType.value = "";
    if (els.isExistingClient) els.isExistingClient.checked = false;
    clearPreview();
    setStatus("Ready");
  });

  els.saveBtn?.addEventListener("click", () => {
    const now = new Date().toISOString();
    const branchId = (document.getElementById("branchId")?.value || "").trim() || "0101";
    const record = {
      imageId: (lastSaved && typeof lastSaved.imageId === "string" && lastSaved.imageId.trim())
        ? lastSaved.imageId
        : String(Date.now()),
      branchId,
      imageType: els.imageType?.value || "",
      clientId: els.clientId?.value || "",
      tempClientId: els.tempClientId?.value || "",
      clientName: "",
      accountId: "",
      description: els.description?.value || "",
      isExistingClient: Boolean(els.isExistingClient?.checked),
      imageDataUrl: currentImageDataUrl || "",
      savedOn: now
    };
    writeDraft(record);
    lastSaved = record;
    setStatus("Saved");
  });

  els.cancelBtn?.addEventListener("click", () => {
    if (!lastSaved) {
      if (confirm("Nothing saved yet. Clear the form?")) {
        els.addBtn?.click();
      }
      return;
    }

    if (els.imageType) els.imageType.value = lastSaved.imageType || "";
    if (els.clientId) els.clientId.value = lastSaved.clientId || "";
    if (els.tempClientId) els.tempClientId.value = lastSaved.tempClientId || "";
    if (els.description) els.description.value = lastSaved.description || "";
    if (els.isExistingClient) els.isExistingClient.checked = Boolean(lastSaved.isExistingClient);

    clearPreview();
    setStatus("Reverted");
  });

  // View All controls
  viewAll.closeBtns?.forEach((btn) => btn.addEventListener("click", closeViewAll));
  viewAll.cancelBtn?.addEventListener("click", closeViewAll);
  viewAll.backBtn?.addEventListener("click", closeViewAll);

  viewAll.overlay?.addEventListener("click", (event) => {
    if (event.target === viewAll.overlay) {
      closeViewAll();
    }
  });

  viewAll.showBtn?.addEventListener("click", () => {
    const entry = viewAllRecords.find((x) => x.key === selectedViewAllKey);
    const dataUrl = entry?.record?.imageDataUrl || "";
    setViewAllImage(dataUrl);
    if (!dataUrl) {
      alert("No image captured/saved for this record yet.");
    }
  });

  viewAll.deleteBtn?.addEventListener("click", () => {
    if (!selectedViewAllKey) {
      alert("Select a record first.");
      return;
    }
    const ok = confirm("Delete selected record?");
    if (!ok) return;
    localStorage.removeItem(selectedViewAllKey);
    renderViewAll();
    setStatus("Deleted");
  });

  document.addEventListener("keydown", (event) => {
    if (!viewAll.overlay || viewAll.overlay.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeViewAll();
    }
  });

  window.addEventListener("beforeunload", () => {
    stopCamera();
  });

  loadFromStorageIfAny();
});
