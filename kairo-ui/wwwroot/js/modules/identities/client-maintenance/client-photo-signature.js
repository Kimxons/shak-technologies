const CM_PHOTO_SIGNATURE_BASE = 'Identities/ClientMaintenance/PhotoSignature';
const CLIENT_PHOTO_SIGNATURE_SCRIPT_CACHE = new Map();

function loadScriptOnce(src) {
    if (!src) return Promise.resolve();

    const existingPromise = CLIENT_PHOTO_SIGNATURE_SCRIPT_CACHE.get(src);
    if (existingPromise) return existingPromise;

    const alreadyLoaded = Array.from(document.scripts || []).some((script) => {
        const scriptSrc = script.getAttribute('src') || '';
        return scriptSrc.includes(src);
    });

    if (alreadyLoaded) {
        const resolved = Promise.resolve();
        CLIENT_PHOTO_SIGNATURE_SCRIPT_CACHE.set(src, resolved);
        return resolved;
    }

    const promise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.head.appendChild(script);
    });

    CLIENT_PHOTO_SIGNATURE_SCRIPT_CACHE.set(src, promise);
    return promise;
}

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
        isValidated: false,
        items: []
    };

    const form = tabRoot.querySelector('[data-photo-signature-form]') || tabRoot;
    const table = tabRoot.querySelector('[data-table="photo-signature"]');
    const uploadBtn = form.querySelector('[data-photo-action="upload"]');

    const showToast = (message, level = 'info') => {
        window.ClientMaintenanceCore.showToast(message, level);
    };

    const setUploadEnabled = (enabled) => {
        if (uploadBtn) {
            uploadBtn.disabled = !enabled;
        }
    };

    const getValidationNodes = () => ({
        overlay: form.querySelector('#validationOverlay'),
        spinner: form.querySelector('#validationSpinner'),
        success: form.querySelector('#validationSuccess'),
        successMessage: form.querySelector('#validationSuccessMessage')
    });

    const showValidationSpinner = () => {
        const { overlay, spinner, success } = getValidationNodes();
        if (!overlay || !spinner) return;
        if (success) success.style.display = 'none';
        spinner.style.display = 'block';
        overlay.style.display = 'flex';
        overlay.style.animation = 'cmValidationFadeIn 0.3s ease-in';
    };

    const showValidationSuccess = (message) => {
        const { spinner, success, successMessage } = getValidationNodes();
        if (spinner) spinner.style.display = 'none';
        if (successMessage) successMessage.textContent = message;
        if (success) success.style.display = 'block';
    };

    const hideValidationOverlay = () => {
        const { overlay } = getValidationNodes();
        if (overlay) overlay.style.display = 'none';
    };

    const ensureFileService = async () => {
        if (window.FileService) return window.FileService;
        try {
            await loadScriptOnce('/js/services/shared/fileService.js');
        } catch (error) {
            console.warn('[ClientPhotoSignature] FileService could not be loaded:', error);
        }
        return window.FileService || null;
    };

    const normalizeValidationResponse = (raw) => {
        const success = raw?.success ?? raw?.Success ?? false;
        const code = raw?.code || raw?.Code || '';
        const message = raw?.message || raw?.Message || raw?.errorMessage || raw?.ErrorMessage || '';
        const data = raw?.data || raw?.Data || {};
        return { success, code, message, data };
    };

    const validateImageViaController = async (file, imageTypeId) => {
        const formData = new FormData();
        const fileName = file?.name || `image_${Date.now()}.png`;
        formData.append('file', file, fileName);
        formData.append('imageTypeId', imageTypeId || '');

        const response = await window.ClientMaintenanceCore.invokeControllerMultipart(
            CM_PHOTO_SIGNATURE_BASE,
            'validate-image',
            formData,
            'POST'
        );

        return normalizeValidationResponse(response);
    };

    const getImageTypeId = () => form.querySelector('#imageType')?.value || '';

    const setPreview = (dataUrl) => {
        const previewImg = form.querySelector('#photoPreview');
        const placeholder = form.querySelector('[data-photo-placeholder]');
        const video = form.querySelector('#photoCameraVideo');
        if (previewImg) {
            previewImg.src = dataUrl || '';
            previewImg.style.display = dataUrl ? 'block' : 'none';
        }
        if (video && dataUrl) {
            video.style.display = 'none';
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
        const previewImg = form.querySelector('#photoPreview');
        const placeholder = form.querySelector('[data-photo-placeholder]');
        if (video) {
            video.srcObject = null;
            video.style.display = 'none';
        }
        if (placeholder && previewImg?.style.display !== 'block') {
            placeholder.style.display = 'block';
        }
        const snapshotBtn = form.querySelector('[data-photo-action="snapshot"]');
        const cancelBtn = form.querySelector('[data-photo-action="cancel-snapshot"]');
        if (snapshotBtn) snapshotBtn.disabled = true;
        if (cancelBtn) cancelBtn.disabled = true;
    };

    const clearForm = () => {
        state.selectedFile = null;
        state.isValidated = false;
        stopCamera();
        const fileInput = form.querySelector('#photoFileInput');
        if (fileInput) fileInput.value = '';
        hideValidationOverlay();
        setUploadEnabled(false);
        setPreview('');
    };

    const validateSelectedImage = async () => {
        const imageTypeId = (getImageTypeId() || '').toUpperCase();

        if (!imageTypeId || !state.selectedFile) {
            state.isValidated = false;
            setUploadEnabled(false);
            return false;
        }

        showValidationSpinner();

        try {
            const validationResult = await validateImageViaController(state.selectedFile, imageTypeId);

            if (!validationResult?.success) {
                hideValidationOverlay();
                showToast(validationResult?.message || 'Validation failed. Upload disabled.', 'warning');
                state.isValidated = false;
                setUploadEnabled(false);
                return false;
            }

            let isValid = false;
            let successMessage = 'Image validated';

            if (imageTypeId === 'P') {
                if (!validationResult.data?.has_face) {
                    hideValidationOverlay();
                    showToast('No face detected. Please capture a clear photo showing a face.', 'error');
                    state.isValidated = false;
                    setUploadEnabled(false);
                    return false;
                }
                const count = validationResult.data?.count || 1;
                successMessage = `Face detected (${count} face${count > 1 ? 's' : ''})`;
                isValid = true;
            } else if (imageTypeId === 'S') {
                if (!validationResult.data?.has_signature) {
                    hideValidationOverlay();
                    showToast('No signature detected. Please capture a clear signature.', 'error');
                    state.isValidated = false;
                    setUploadEnabled(false);
                    return false;
                }
                successMessage = 'Signature detected';
                isValid = true;
            } else {
                isValid = true;
            }

            if (isValid) {
                state.isValidated = true;
                setUploadEnabled(true);
                showValidationSuccess(successMessage);
                setTimeout(() => {
                    hideValidationOverlay();
                }, 1800);
                return true;
            }

            state.isValidated = false;
            setUploadEnabled(false);
            return false;
        } catch (error) {
            console.error('[ClientPhotoSignature] Validation error:', error);
            hideValidationOverlay();
            showToast('Validation service unavailable. Upload disabled.', 'warning');
            state.isValidated = false;
            setUploadEnabled(false);
            return false;
        }
    };

    setUploadEnabled(false);
    void ensureFileService();

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

    const refreshTable = async (requestData) => {
        // Get client ID and request ID from parent context
        const clientId = requestData?.ClientID || window.ClientMaintenanceCore?.clientId || '';
        const requestId = requestData?.RequestID || window.ClientMaintenanceCore?.requestId || '';
        
        // Need at least one identifier (ClientID or RequestID) to fetch photo/signature
        if (!clientId && !requestId) {
            renderTable([]);
            return;
        }
        try {
            const response = await window.ClientMaintenancePhotoSignatureService.get({
                ModuleID: moduleId || window.ClientMaintenanceCore.moduleId || '',
                ClientID: clientId,
                RequestID: requestId
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
            showToast('Select an image type first.', 'warning');
            return;
        }
        if (!state.selectedFile) {
            showToast('Select an image first.', 'warning');
            return;
        }
        if (!state.isValidated) {
            showToast('Image has not been validated. Please select or capture a valid image.', 'error');
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
                    showToast('Image uploaded successfully.', 'success');
                    clearForm();
                    await refreshTable();
                    return;
                }
                showToast(result?.message || 'Upload failed.', 'error');
            } catch (error) {
                showToast(`Upload failed - ${error.message}`, 'error');
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
                showToast(error, 'error');
                return;
            }
            showToast('Image uploaded successfully.', 'success');
            clearForm();
            await refreshTable();
        } catch (error) {
            showToast(`Upload failed - ${error.message}`, 'error');
        }
    };

    form.querySelector('[data-photo-action="file"]')?.addEventListener('click', () => {
        if (!getImageTypeId()) {
            showToast('Select an image type first.', 'warning');
            return;
        }
        form.querySelector('#photoFileInput')?.click();
    });

    form.querySelector('#photoFileInput')?.addEventListener('change', async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const fileService = await ensureFileService();
        if (fileService?.validateFileType) {
            const validation = fileService.validateFileType(file, ['image/*']);
            if (!validation.valid) {
                showToast(validation.message, 'warning');
                return;
            }
        } else if (!file.type.startsWith('image/')) {
            showToast('Please select an image file.', 'warning');
            return;
        }

        state.selectedFile = file;
        state.isValidated = false;
        setUploadEnabled(false);

        try {
            const dataUrl = fileService?.fileToDataUrl
                ? await fileService.fileToDataUrl(file)
                : await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = () => reject(new Error('Failed to read selected image.'));
                    reader.readAsDataURL(file);
                });

            setPreview(dataUrl);
            await validateSelectedImage();
        } catch (error) {
            showToast(error.message || 'Unable to preview selected file.', 'error');
        }
    });

    form.querySelector('#imageType')?.addEventListener('change', async () => {
        state.isValidated = false;
        setUploadEnabled(false);
        if (state.selectedFile) {
            await validateSelectedImage();
        }
    });

    form.querySelector('[data-photo-action="capture"]')?.addEventListener('click', async () => {
        if (!getImageTypeId()) {
            showToast('Select an image type first.', 'warning');
            return;
        }
        if (!navigator.mediaDevices?.getUserMedia) {
            showToast('Camera not available in this browser.', 'warning');
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            state.cameraStream = stream;
            const video = form.querySelector('#photoCameraVideo');
            const previewImg = form.querySelector('#photoPreview');
            const placeholder = form.querySelector('[data-photo-placeholder]');
            if (video) {
                video.srcObject = stream;
                video.style.display = 'block';
            }
            if (previewImg) previewImg.style.display = 'none';
            if (placeholder) placeholder.style.display = 'none';
            const snapshotBtn = form.querySelector('[data-photo-action="snapshot"]');
            const cancelBtn = form.querySelector('[data-photo-action="cancel-snapshot"]');
            if (snapshotBtn) snapshotBtn.disabled = false;
            if (cancelBtn) cancelBtn.disabled = false;
        } catch (error) {
            showToast('Unable to access camera.', 'error');
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
            state.isValidated = false;
            setUploadEnabled(false);
            setPreview(canvas.toDataURL('image/png'));
            void validateSelectedImage();
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

    tabRoot._cmLoadData = (requestData) => refreshTable(requestData);
    window.ClientMaintenanceCore.registerTabLoadFunction('PhotoSignature', (requestData) => refreshTable(requestData));

    // Edit mode handler - called from main client maintenance view
    tabRoot._cmSetEditMode = (isEditMode) => {
        // Photo/Signature upload is available in edit mode
        // No table row selection needed here
    };
}
