const CM_PHOTO_SIGNATURE_BASE = 'Identities/ClientMaintenance/PhotoSignature';

function invokeClientMaintenancePhotoSignature(action, requestData) {
    return window.ClientMaintenanceCore.invokeControllerMethod(CM_PHOTO_SIGNATURE_BASE, action, 'POST', requestData || {});
}

function normalizeTempImageResponse(raw) {
    const code = raw?.responseCode || raw?.ResponseCode || raw?.code || raw?.Code || '';
    const successFromCode = code ? code === '00' : undefined;
    const success = raw?.success ?? raw?.Success ?? successFromCode ?? false;
    const message = raw?.message || raw?.Message || raw?.responseMessage || raw?.ResponseMessage || raw?.ErrorMessage || '';
    const data = raw?.data || raw?.Data || raw?.details || raw?.Details || raw;
    return { success, code, message, data };
}

function createControllerTempImageService() {
    return {
        async uploadTempImage(imageData) {
            const formData = new FormData();
            formData.append('RequestData.ImageTypeID', imageData.ImageTypeID || '');
            formData.append('RequestData.ImageID', imageData.ImageID || '');
            formData.append('RequestData.Description', imageData.Description || '');
            formData.append('RequestData.ClientID', imageData.ClientID || '');
            formData.append('RequestData.AccountID', imageData.AccountID || '');
            formData.append('RequestData.TempClientID', imageData.TempClientID || '');
            formData.append('RequestData.ModuleID', imageData.ModuleID || '');
            formData.append('RequestData.OurBranchID', imageData.OurBranchID || '');
            formData.append('RequestData.CopyToClientImage', imageData.CopyToClientImage || '');
            formData.append('RequestData.CreatedBy', imageData.CreatedBy || '');
            formData.append('RequestData.CreatedOn', imageData.CreatedOn || '');

            if (imageData.File instanceof File) {
                formData.append('RequestData.File', imageData.File, imageData.File.name);
            }

            const json = await window.ClientMaintenanceCore.invokeControllerMultipart(
                CM_PHOTO_SIGNATURE_BASE,
                'upload-temp-image',
                formData,
                'POST'
            );
            const normalized = normalizeTempImageResponse(json);
            return {
                success: normalized.success,
                code: normalized.code,
                message: normalized.message,
                data: normalized.data
            };
        },

        async getTempImage(tempImageId) {
            const json = await window.ClientMaintenanceCore.invokeControllerGet(
                CM_PHOTO_SIGNATURE_BASE,
                `get-temp-image/${encodeURIComponent(tempImageId)}`,
                {}
            );
            const normalized = normalizeTempImageResponse(json);
            return {
                success: normalized.success,
                code: normalized.code,
                message: normalized.message,
                data: normalized.data
            };
        },

        async downloadTempImage(tempImageId) {
            return await window.ClientMaintenanceCore.invokeControllerDownload(
                CM_PHOTO_SIGNATURE_BASE,
                `download-temp-image/${encodeURIComponent(tempImageId)}`,
                {}
            );
        },

        async deleteTempImage(tempImageId) {
            const json = await window.ClientMaintenanceCore.invokeControllerDelete(
                CM_PHOTO_SIGNATURE_BASE,
                `delete-temp-image/${encodeURIComponent(tempImageId)}`,
                {}
            );
            const normalized = normalizeTempImageResponse(json);
            return {
                success: normalized.success,
                code: normalized.code,
                message: normalized.message,
                data: normalized.data
            };
        }
    };
}

function getTempImageService() {
    const controllerService = createControllerTempImageService();
    const globalService = window.TempImageService;

    return {
        ...(globalService || {}),
        uploadTempImage: controllerService.uploadTempImage,
        getTempImage: controllerService.getTempImage,
        downloadTempImage: controllerService.downloadTempImage,
        deleteTempImage: controllerService.deleteTempImage
    };
}

window.ClientMaintenancePhotoSignatureService = {
    get: (requestData) => invokeClientMaintenancePhotoSignature('get', requestData),
    create: (requestData) => invokeClientMaintenancePhotoSignature('create', requestData),
    update: (requestData) => invokeClientMaintenancePhotoSignature('update', requestData),
    delete: (requestData) => invokeClientMaintenancePhotoSignature('delete', requestData)
};

window.initClientMaintenancePhotoSignatureTab = function (tabRoot, moduleId) {
    bindPhotoSignatureCrud(tabRoot, moduleId);
};

function bindPhotoSignatureCrud(tabRoot, moduleId) {
    if (!tabRoot) return;

    const state = {
        selectedFile: null,
        cameraStream: null,
        isCapturing: false,
        items: []
    };

    const form = tabRoot.querySelector('[data-photo-signature-form]') || tabRoot;
    const table = tabRoot.querySelector('[data-table="photo-signature"]');

    const getImageTypeId = () => form.querySelector('#imageType')?.value || '';

    const setPreview = (dataUrl) => {
        const previewImg = form.querySelector('#photoPreview');
        const placeholder = form.querySelector('[data-photo-placeholder]');
        if (previewImg) {
            previewImg.src = dataUrl || '';
            previewImg.style.display = dataUrl ? 'block' : 'none';
        }
        if (placeholder) {
            placeholder.style.display = dataUrl ? 'none' : 'block';
        }
    };

    const stopCamera = () => {
        if (state.cameraStream) {
            state.cameraStream.getTracks().forEach((track) => track.stop());
            state.cameraStream = null;
        }
        const video = form.querySelector('#photoCameraVideo');
        if (video) {
            video.srcObject = null;
            video.style.display = 'none';
        }
        const snapshotBtn = form.querySelector('[data-photo-action="snapshot"]');
        const cancelBtn = form.querySelector('[data-photo-action="cancel-snapshot"]');
        if (snapshotBtn) snapshotBtn.disabled = true;
        if (cancelBtn) cancelBtn.disabled = true;
    };

    const clearForm = () => {
        state.selectedFile = null;
        stopCamera();
        const fileInput = form.querySelector('#photoFileInput');
        if (fileInput) fileInput.value = '';
        setPreview('');
    };

    const renderTable = (items) => {
        const tbody = table?.querySelector('tbody') || tabRoot.querySelector('#tbl_clientPhotoSignatureBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (!items.length) {
            const empty = document.createElement('tr');
            empty.innerHTML = '<td colspan="4" class="text-center text-muted">No images uploaded yet.</td>';
            tbody.appendChild(empty);
            return;
        }

        items.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.dataset.index = String(index);
            tr.dataset.payload = JSON.stringify(item);

            const typeLabel = item.ImageTypeDescription || item.ImageTypeID || item.imageTypeId || '';
            const description = item.Description || item.description || '';
            const createdOn = item.CreatedOn || item.createdOn || '';

            tr.innerHTML = `
                <td class="ps-2">${typeLabel}</td>
                <td>${description}</td>
                <td>${createdOn ? new Date(createdOn).toLocaleString() : ''}</td>
                <td class="text-center">
                    <div class="btn-group btn-group-sm">
                        <button type="button" class="btn btn-primary" data-action="view"><i class="bi bi-eye"></i></button>
                        <button type="button" class="btn btn-success" data-action="download"><i class="bi bi-download"></i></button>
                        <button type="button" class="btn btn-danger" data-action="delete"><i class="bi bi-trash"></i></button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    };

    const refreshTable = async () => {
        const clientId = window.ClientMaintenanceCore.clientId || '';
        if (!clientId) {
            renderTable([]);
            return;
        }
        try {
            const response = await window.ClientMaintenancePhotoSignatureService.get({
                ModuleID: moduleId || window.ClientMaintenanceCore.moduleId || '',
                ClientID: clientId
            });
            const rows = response?.Details || response?.data?.Details || response?.data || response || [];
            state.items = Array.isArray(rows) ? rows : [];
            renderTable(state.items);
        } catch (error) {
            window.ClientMaintenanceCore.showToast(`Photo/Signature load failed - ${error.message}`, 'error');
        }
    };

    const uploadImage = async () => {
        const imageTypeId = getImageTypeId();
        if (!imageTypeId) {
            window.ClientMaintenanceCore.showToast('Select an image type first.', 'warning');
            return;
        }
        if (!state.selectedFile) {
            window.ClientMaintenanceCore.showToast('Select an image first.', 'warning');
            return;
        }

        const clientId = window.ClientMaintenanceCore.clientId || '';
        const moduleValue = moduleId || window.ClientMaintenanceCore.moduleId || '';

        const TempImageService = getTempImageService();
        if (TempImageService?.uploadTempImage) {
            try {
                const result = await TempImageService.uploadTempImage({
                    RequestID: '',
                    ImageTypeID: imageTypeId,
                    File: state.selectedFile,
                    Description: state.selectedFile.name,
                    ClientID: clientId,
                    TempClientID: '',
                    ModuleID: moduleValue,
                    OurBranchID: window.Environment?.OurBranchID || '',
                    CreatedBy: window.Environment?.UserID || window.Environment?.UserId || ''
                });
                if (result?.success) {
                    window.ClientMaintenanceCore.showToast('Image uploaded successfully.', 'success');
                    clearForm();
                    await refreshTable();
                    return;
                }
                window.ClientMaintenanceCore.showToast(result?.message || 'Upload failed.', 'error');
            } catch (error) {
                window.ClientMaintenanceCore.showToast(`Upload failed - ${error.message}`, 'error');
            }
            return;
        }

        const payload = {
            ModuleID: moduleValue,
            ClientID: clientId,
            Payload: {
                ImageTypeID: imageTypeId,
                File: state.selectedFile,
                Description: state.selectedFile.name
            }
        };

        try {
            const response = await window.ClientMaintenancePhotoSignatureService.create(payload);
            const success = response?.Success ?? response?.success ?? true;
            if (!success) {
                const error = response?.ErrorMessage || response?.errorMessage || 'Upload failed';
                window.ClientMaintenanceCore.showToast(error, 'error');
                return;
            }
            window.ClientMaintenanceCore.showToast('Image uploaded successfully.', 'success');
            clearForm();
            await refreshTable();
        } catch (error) {
            window.ClientMaintenanceCore.showToast(`Upload failed - ${error.message}`, 'error');
        }
    };

    form.querySelector('[data-photo-action="file"]')?.addEventListener('click', () => {
        if (!getImageTypeId()) {
            window.ClientMaintenanceCore.showToast('Select an image type first.', 'warning');
            return;
        }
        form.querySelector('#photoFileInput')?.click();
    });

    form.querySelector('#photoFileInput')?.addEventListener('change', async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        state.selectedFile = file;
        const reader = new FileReader();
        reader.onload = () => {
            setPreview(reader.result);
        };
        reader.readAsDataURL(file);
    });

    form.querySelector('[data-photo-action="capture"]')?.addEventListener('click', async () => {
        if (!getImageTypeId()) {
            window.ClientMaintenanceCore.showToast('Select an image type first.', 'warning');
            return;
        }
        if (!navigator.mediaDevices?.getUserMedia) {
            window.ClientMaintenanceCore.showToast('Camera not available in this browser.', 'warning');
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            state.cameraStream = stream;
            const video = form.querySelector('#photoCameraVideo');
            if (video) {
                video.srcObject = stream;
                video.style.display = 'block';
            }
            const snapshotBtn = form.querySelector('[data-photo-action="snapshot"]');
            const cancelBtn = form.querySelector('[data-photo-action="cancel-snapshot"]');
            if (snapshotBtn) snapshotBtn.disabled = false;
            if (cancelBtn) cancelBtn.disabled = false;
        } catch (error) {
            window.ClientMaintenanceCore.showToast('Unable to access camera.', 'error');
        }
    });

    form.querySelector('[data-photo-action="snapshot"]')?.addEventListener('click', () => {
        const video = form.querySelector('#photoCameraVideo');
        const canvas = form.querySelector('#photoCameraCanvas');
        if (!video || !canvas) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
            if (!blob) return;
            const file = new File([blob], `snapshot_${Date.now()}.png`, { type: 'image/png' });
            state.selectedFile = file;
            setPreview(canvas.toDataURL('image/png'));
        });
        stopCamera();
    });

    form.querySelector('[data-photo-action="cancel-snapshot"]')?.addEventListener('click', () => {
        stopCamera();
    });

    form.querySelector('[data-photo-action="upload"]')?.addEventListener('click', () => {
        uploadImage();
    });

    form.querySelector('[data-photo-action="clear"]')?.addEventListener('click', () => {
        clearForm();
    });

    table?.addEventListener('click', (event) => {
        const row = event.target.closest('tr[data-index]');
        if (!row) return;
        const index = Number(row.dataset.index);
        const item = state.items[index];
        if (!item) return;

        if (event.target.closest('[data-action="delete"]')) {
            window.ClientMaintenancePhotoSignatureService.delete({
                ModuleID: moduleId || window.ClientMaintenanceCore.moduleId || '',
                ClientID: window.ClientMaintenanceCore.clientId || '',
                Payload: { ID: item.ID ?? item.ImageID ?? item.TempImageID ?? null }
            }).then(() => refreshTable()).catch((error) => {
                window.ClientMaintenanceCore.showToast(`Delete failed - ${error.message}`, 'error');
            });
            return;
        }

        if (event.target.closest('[data-action="view"]')) {
            const TempImageService = getTempImageService();
            if (TempImageService?.getTempImage) {
                const imageId = item.TempImageID || item.ImageID;
                TempImageService.getTempImage(imageId).then((resp) => {
                    const imageData = resp?.data?.Image || resp?.data?.image;
                    if (imageData) {
                        const dataUrl = imageData.startsWith('data:') ? imageData : `data:image/png;base64,${imageData}`;
                        window.open(dataUrl, '_blank');
                    }
                });
            }
            return;
        }

        if (event.target.closest('[data-action="download"]')) {
            const TempImageService = getTempImageService();
            const imageId = item.TempImageID || item.ImageID;
            if (TempImageService?.downloadTempImage && imageId) {
                TempImageService.downloadTempImage(imageId).then((blob) => {
                    const objectUrl = URL.createObjectURL(blob);
                    const anchor = document.createElement('a');
                    anchor.href = objectUrl;
                    anchor.download = `temp-image-${imageId}`;
                    document.body.appendChild(anchor);
                    anchor.click();
                    document.body.removeChild(anchor);
                    URL.revokeObjectURL(objectUrl);
                }).catch((error) => {
                    window.ClientMaintenanceCore.showToast(`Download failed - ${error.message}`, 'error');
                });
            }
            return;
        }

        if (!event.target.closest('button')) {
            const imageData = item.Image || item.image;
            if (imageData) {
                const dataUrl = imageData.startsWith('data:') ? imageData : `data:image/png;base64,${imageData}`;
                setPreview(dataUrl);
            }
        }
    });

    refreshTable();
}
