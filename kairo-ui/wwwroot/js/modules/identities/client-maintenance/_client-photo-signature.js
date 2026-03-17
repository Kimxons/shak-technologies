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

function getPhotoSignatureAppCore() {
    const win = window;
    return win.AppCore ||
        (win.parent && win.parent !== win && win.parent.AppCore) ||
        (win.top && win.top !== win && win.top.AppCore) ||
        null;
}

function getPhotoSignatureClientMaintenanceCore() {
    const win = window;
    return win.ClientMaintenanceCore ||
        (win.parent && win.parent !== win && win.parent.ClientMaintenanceCore) ||
        (win.top && win.top !== win && win.top.ClientMaintenanceCore) ||
        null;
}

function getPhotoSignatureSidebarManager() {
    const win = window;
    try {
        return (win.parent && win.parent !== win && win.parent.SidebarManager) ||
            (win.top && win.top !== win && win.top.SidebarManager) ||
            null;
    } catch (_error) {
        return null;
    }
}

function getPhotoSignatureParentContext() {
    const maintenanceCore = getPhotoSignatureClientMaintenanceCore();
    if (maintenanceCore?.getParentContext) {
        return maintenanceCore.getParentContext();
    }

    const sidebarManager = getPhotoSignatureSidebarManager();
    if (sidebarManager?.getParentContext) {
        return sidebarManager.getParentContext();
    }

    return null;
}

function toPhotoSignatureString(value) {
    return value === undefined || value === null ? '' : String(value).trim();
}

function getPhotoSignatureViewState() {
    return window.ClientPhotoSignatureState || {};
}

function resolvePhotoSignatureContext(requestData, fallbackModuleId) {
    const viewState = getPhotoSignatureViewState();
    const parentContext = getPhotoSignatureParentContext() || {};
    const maintenanceCore = getPhotoSignatureClientMaintenanceCore();

    const moduleId = toPhotoSignatureString(
        requestData?.ModuleID ??
        fallbackModuleId ??
        maintenanceCore?.moduleId ??
        parentContext.moduleId ??
        viewState.ModuleID
    );

    const clientId = toPhotoSignatureString(
        requestData?.ClientID ??
        maintenanceCore?.getClientId?.() ??
        maintenanceCore?.clientId ??
        parentContext.clientId ??
        viewState.ClientID
    );

    const requestId = toPhotoSignatureString(
        requestData?.RequestID ??
        maintenanceCore?.getRequestId?.() ??
        maintenanceCore?.requestId ??
        parentContext.requestId ??
        viewState.RequestID
    );

    return {
        ModuleID: moduleId,
        ClientID: clientId,
        RequestID: requestId,
        AutoLoad: Boolean(viewState.AutoLoad),
        IsStandalone: Boolean(viewState.IsStandalone)
    };
}

function shouldAutoLoadStandalonePhotoSignature(context) {
    return Boolean(context?.IsStandalone && (context?.ClientID || context?.RequestID));
}

function invokeClientMaintenancePhotoSignature(action, requestData) {
    const maintenanceCore = getPhotoSignatureClientMaintenanceCore();
    if (maintenanceCore?.invokeControllerMethod) {
        return maintenanceCore.invokeControllerMethod(CM_PHOTO_SIGNATURE_BASE, action, 'POST', requestData || {});
    }

    const appCore = getPhotoSignatureAppCore();
    if (appCore?.invokeControllerByMethodAsync) {
        return appCore.invokeControllerByMethodAsync(`${CM_PHOTO_SIGNATURE_BASE}/${action}`, 'POST', requestData || {});
    }

    return Promise.reject(new Error('Photo/Signature controller invocation is not available.'));
}

function showPhotoSignatureToast(message, type = 'info') {
    const maintenanceCore = getPhotoSignatureClientMaintenanceCore();
    if (maintenanceCore?.showToast) {
        maintenanceCore.showToast(message, type);
        return;
    }

    if (window.NotificationService?.showToast) {
        window.NotificationService.showToast(message, type, 4000);
        return;
    }

    console.log(`[${type}] ${message}`);
}

function getPhotoSignatureResponseCode(response) {
    return toPhotoSignatureString(response?.ResponseCode ?? response?.responseCode);
}

function getPhotoSignatureResponseMessage(response, fallbackMessage) {
    return response?.ResponseMessage ??
        response?.responseMessage ??
        response?.Message ??
        response?.message ??
        response?.ErrorMessage ??
        response?.errorMessage ??
        fallbackMessage;
}

function isPhotoSignatureResponseSuccess(response) {
    const successFlag = response?.Success ?? response?.success;
    if (typeof successFlag === 'boolean') {
        return successFlag;
    }

    const responseCode = getPhotoSignatureResponseCode(response).toUpperCase();
    if (responseCode) {
        return responseCode === '000' || responseCode === '00' || responseCode === 'SUCCESS';
    }

    return true;
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
            const maintenanceCore = getPhotoSignatureClientMaintenanceCore();
            if (!maintenanceCore?.invokeControllerMultipart) {
                throw new Error('Photo/Signature upload is not available in this context.');
            }

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
            formData.append('RequestData.RequestID', imageData.RequestID || '');

            if (imageData.File instanceof File) {
                formData.append('RequestData.File', imageData.File, imageData.File.name);
            }

            const json = await maintenanceCore.invokeControllerMultipart(
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
            const maintenanceCore = getPhotoSignatureClientMaintenanceCore();
            if (!maintenanceCore?.invokeControllerGet) {
                throw new Error('Photo/Signature image preview is not available in this context.');
            }

            const json = await maintenanceCore.invokeControllerGet(
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
            const maintenanceCore = getPhotoSignatureClientMaintenanceCore();
            if (!maintenanceCore?.invokeControllerDownload) {
                throw new Error('Photo/Signature download is not available in this context.');
            }

            return await maintenanceCore.invokeControllerDownload(
                CM_PHOTO_SIGNATURE_BASE,
                `download-temp-image/${encodeURIComponent(tempImageId)}`,
                {}
            );
        },

        async deleteTempImage(tempImageId) {
            const maintenanceCore = getPhotoSignatureClientMaintenanceCore();
            if (!maintenanceCore?.invokeControllerDelete) {
                throw new Error('Photo/Signature delete is not available in this context.');
            }

            const json = await maintenanceCore.invokeControllerDelete(
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

function closePhotoSignatureView() {
    const parentWindowRef = window.parent && window.parent !== window ? window.parent : null;
    let handled = false;

    try {
        if (parentWindowRef?.SidebarManager?.closeChildForm) {
            parentWindowRef.SidebarManager.closeChildForm();
            handled = true;
        }
    } catch (_error) {
    }

    if (!handled) {
        try {
            parentWindowRef?.postMessage({ type: 'submoduleClose', source: 'ClientPhotoSignature' }, '*');
            handled = Boolean(parentWindowRef);
        } catch (_error) {
        }
    }

    try { parentWindowRef?.postMessage({ action: 'submoduleClosed', source: 'ClientPhotoSignature' }, '*'); } catch (_error) { }
    try { parentWindowRef?.postMessage({ type: 'accountMaintenanceChildClose', source: 'ClientPhotoSignature' }, '*'); } catch (_error) { }
    try { parentWindowRef?.postMessage({ type: 'CLOSE_DATAENTRY', source: 'ClientPhotoSignature' }, '*'); } catch (_error) { }

    if (!handled) {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.close();
        }
    }
}

function bindPhotoSignatureActionPanel(tabRoot) {
    if (!tabRoot) return;

    const actionScope =
        tabRoot.closest('.window') ||
        tabRoot.closest('[data-cm-layout="client-photo-signature"]') ||
        tabRoot.parentElement ||
        tabRoot;

    if (!actionScope || actionScope.dataset.cmPhotoSignatureActionDelegated === 'true') return;
    actionScope.dataset.cmPhotoSignatureActionDelegated = 'true';

    const handleRefresh = async (event) => {
        event.preventDefault();
        if (typeof tabRoot._cmRefreshData === 'function') {
            await tabRoot._cmRefreshData();
        }
    };

    actionScope.addEventListener('click', async (event) => {
        const actionButton = event.target.closest('[data-action]');
        if (!actionButton || !actionScope.contains(actionButton)) return;

        const action = String(actionButton.getAttribute('data-action') || '').toLowerCase();
        if (action === 'refresh') {
            await handleRefresh(event);
            return;
        }

        if (action === 'close') {
            event.preventDefault();
            closePhotoSignatureView();
        }
    });

    actionScope.addEventListener('kairo:titlebar:refresh', handleRefresh);
    actionScope.addEventListener('kairo:titlebar:close', (event) => {
        event.preventDefault();
        closePhotoSignatureView();
    });
}

window.ClientMaintenancePhotoSignatureService = {
    get: (requestData) => invokeClientMaintenancePhotoSignature('get', requestData),
    create: (requestData) => invokeClientMaintenancePhotoSignature('create', requestData),
    update: (requestData) => invokeClientMaintenancePhotoSignature('update', requestData),
    delete: (requestData) => invokeClientMaintenancePhotoSignature('delete', requestData)
};

window.initClientMaintenancePhotoSignatureTab = function (tabRoot, moduleId, options = {}) {
    if (!tabRoot || tabRoot.dataset.cmPhotoSignatureInitialized === 'true') return;
    tabRoot.dataset.cmPhotoSignatureInitialized = 'true';

    const configuredModuleId = toPhotoSignatureString(moduleId || options?.moduleId || getPhotoSignatureViewState().ModuleID);
    const initialContext = resolvePhotoSignatureContext(null, configuredModuleId);
    const state = {
        selectedFile: null,
        cameraStream: null,
        isCapturing: false,
        isValidated: false,
        items: [],
        lastContext: { ...initialContext },
        initialLoadApplied: false,
        isStandalone: Boolean(
            options?.isStandalone ??
            getPhotoSignatureViewState().IsStandalone ??
            tabRoot.closest('[data-photosignature-host="standalone"]')
        )
    };

    const form = tabRoot.querySelector('[data-photo-signature-form]') || tabRoot;
    const table = tabRoot.querySelector('[data-table="photo-signature"]');
    const uploadBtn = form.querySelector('[data-photo-action="upload"]');

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
        const maintenanceCore = getPhotoSignatureClientMaintenanceCore();
        if (!maintenanceCore?.invokeControllerMultipart) {
            throw new Error('Photo/Signature validation is not available in this context.');
        }

        const formData = new FormData();
        const fileName = file?.name || `image_${Date.now()}.png`;
        formData.append('file', file, fileName);
        formData.append('imageTypeId', imageTypeId || '');

        const response = await maintenanceCore.invokeControllerMultipart(
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
        const photoFileInput = form.querySelector('#photoFileInput');
        if (photoFileInput) photoFileInput.value = '';
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
                showPhotoSignatureToast(validationResult?.message || 'Validation failed. Upload disabled.', 'warning');
                state.isValidated = false;
                setUploadEnabled(false);
                return false;
            }

            let isValid = false;
            let successMessage = 'Image validated';

            if (imageTypeId === 'P') {
                if (!validationResult.data?.has_face) {
                    hideValidationOverlay();
                    showPhotoSignatureToast('No face detected. Please capture a clear photo showing a face.', 'error');
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
                    showPhotoSignatureToast('No signature detected. Please capture a clear signature.', 'error');
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
            showPhotoSignatureToast('Validation service unavailable. Upload disabled.', 'warning');
            state.isValidated = false;
            setUploadEnabled(false);
            return false;
        }
    };

    const extractPhotoSignatureRows = (response) => {
        const candidates = [
            response?.Details,
            response?.details,
            response?.data?.Details,
            response?.data?.details,
            response?.Data,
            response?.data,
            response
        ];

        for (const candidate of candidates) {
            if (Array.isArray(candidate)) {
                return candidate;
            }
        }

        return [];
    };

    const escapePhotoSignatureHtml = (value) => {
        const text = String(value ?? '');
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
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

            const typeLabel = item.ImageTypeDescription || item.ImageTypeID || item.imageTypeId || '';
            const description = item.Description || item.description || '';
            const createdOn = item.CreatedOn || item.createdOn || '';
            const createdOnLabel = createdOn
                ? (window.GlobalUtils?.formatDateTime
                    ? window.GlobalUtils.formatDateTime(createdOn)
                    : new Date(createdOn).toLocaleString())
                : '';

            tr.innerHTML = `
                <td class="ps-2">${escapePhotoSignatureHtml(typeLabel)}</td>
                <td>${escapePhotoSignatureHtml(description)}</td>
                <td>${escapePhotoSignatureHtml(createdOnLabel)}</td>
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

    const refreshTable = async (requestData = {}, refreshOptions = {}) => {
        const context = resolvePhotoSignatureContext(requestData, configuredModuleId);
        state.lastContext = { ...state.lastContext, ...context };

        if (!context.ClientID && !context.RequestID) {
            state.items = [];
            renderTable([]);
            if (refreshOptions.markInitialLoad) {
                state.initialLoadApplied = true;
            }
            return [];
        }

        try {
            const response = await window.ClientMaintenancePhotoSignatureService.get({
                ModuleID: context.ModuleID,
                ClientID: context.ClientID,
                RequestID: context.RequestID
            });

            const rows = extractPhotoSignatureRows(response);
            state.items = Array.isArray(rows) ? rows : [];
            renderTable(state.items);

            if (refreshOptions.markInitialLoad) {
                state.initialLoadApplied = true;
            }

            return state.items;
        } catch (error) {
            showPhotoSignatureToast(`Photo/Signature load failed - ${error.message}`, 'error');
            return [];
        }
    };

    const uploadImage = async () => {
        const imageTypeId = getImageTypeId();
        if (!imageTypeId) {
            showPhotoSignatureToast('Select an image type first.', 'warning');
            return;
        }
        if (!state.selectedFile) {
            showPhotoSignatureToast('Select an image first.', 'warning');
            return;
        }
        if (!state.isValidated) {
            showPhotoSignatureToast('Image has not been validated. Please select or capture a valid image.', 'error');
            return;
        }

        const context = resolvePhotoSignatureContext(state.lastContext, configuredModuleId);
        if (!context.ClientID && !context.RequestID) {
            showPhotoSignatureToast('No client context is available for Photo/Signature upload.', 'warning');
            return;
        }

        const moduleValue = context.ModuleID;
        const TempImageService = getTempImageService();
        if (TempImageService?.uploadTempImage) {
            try {
                const result = await TempImageService.uploadTempImage({
                    RequestID: context.RequestID || '',
                    ImageTypeID: imageTypeId,
                    File: state.selectedFile,
                    Description: state.selectedFile.name,
                    ClientID: context.ClientID,
                    TempClientID: '',
                    ModuleID: moduleValue,
                    OurBranchID: window.Environment?.OurBranchID || '',
                    CreatedBy: window.Environment?.UserID || window.Environment?.UserId || ''
                });
                if (result?.success) {
                    showPhotoSignatureToast('Image uploaded successfully.', 'success');
                    clearForm();
                    await refreshTable(state.lastContext, { markInitialLoad: state.initialLoadApplied });
                    return;
                }
                showPhotoSignatureToast(result?.message || 'Upload failed.', 'error');
            } catch (error) {
                showPhotoSignatureToast(`Upload failed - ${error.message}`, 'error');
            }
            return;
        }

        //const payload = {
        //    ModuleID: moduleValue,
        //    ClientID: context.ClientID,
        //    RequestID: context.RequestID,
        //    Payload: {
        //        ImageTypeID: imageTypeId,
        //        File: state.selectedFile,
        //        Description: state.selectedFile.name
        //    }
        //};
        const payload = {};
        payload.ModuleID = moduleValue;
        payload.ClientID = context.ClientID;
        payload.RequestID = context.RequestID;
        payload.ImageTypeID = imageTypeId;
        payload.File = state.selectedFile;
        payload.Description = state.selectedFile.name;

        try {
            const response = await window.ClientMaintenancePhotoSignatureService.create(payload);
            if (!isPhotoSignatureResponseSuccess(response)) {
                showPhotoSignatureToast(getPhotoSignatureResponseMessage(response, 'Upload failed'), 'error');
                return;
            }
            showPhotoSignatureToast('Image uploaded successfully.', 'success');
            clearForm();
            await refreshTable(state.lastContext, { markInitialLoad: state.initialLoadApplied });
        } catch (error) {
            showPhotoSignatureToast(`Upload failed - ${error.message}`, 'error');
        }
    };

    const bindStandaloneBootstrap = () => {
        if (!state.isStandalone) {
            return;
        }

        if (typeof tabRoot._cmMaybeAutoLoadPhotoSignature === 'function') {
            void tabRoot._cmMaybeAutoLoadPhotoSignature(initialContext);
        }

        if (tabRoot.dataset.cmPhotoSignatureParentContextBound === 'true') {
            return;
        }

        tabRoot.dataset.cmPhotoSignatureParentContextBound = 'true';
        window.addEventListener('message', (event) => {
            const data = event?.data;
            if (!data || typeof data !== 'object') return;
            if (data.type !== 'parentContext' && data.action !== 'parentContextLoaded') return;

            const parentData = data.data || {};
            const nextContext = resolvePhotoSignatureContext({
                ModuleID: parentData.moduleId,
                ClientID: parentData.clientId,
                RequestID: parentData.requestId
            }, configuredModuleId);

            if (typeof tabRoot._cmMaybeAutoLoadPhotoSignature === 'function') {
                void tabRoot._cmMaybeAutoLoadPhotoSignature(nextContext);
                return;
            }

            if (typeof tabRoot._cmLoadData === 'function') {
                void tabRoot._cmLoadData(nextContext);
            }
        });
    };

    setUploadEnabled(false);
    void ensureFileService();

    form.querySelector('[data-photo-action="file"]')?.addEventListener('click', () => {
        if (!getImageTypeId()) {
            showPhotoSignatureToast('Select an image type first.', 'warning');
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
                showPhotoSignatureToast(validation.message, 'warning');
                return;
            }
        } else if (!file.type.startsWith('image/')) {
            showPhotoSignatureToast('Please select an image file.', 'warning');
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
            showPhotoSignatureToast(error.message || 'Unable to preview selected file.', 'error');
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
            showPhotoSignatureToast('Select an image type first.', 'warning');
            return;
        }
        if (!navigator.mediaDevices?.getUserMedia) {
            showPhotoSignatureToast('Camera not available in this browser.', 'warning');
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
        } catch (_error) {
            showPhotoSignatureToast('Unable to access camera.', 'error');
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
        void uploadImage();
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
            const context = resolvePhotoSignatureContext(state.lastContext, configuredModuleId);
            window.ClientMaintenancePhotoSignatureService.delete({
                ModuleID: context.ModuleID,
                ClientID: context.ClientID,
                RequestID: context.RequestID,
                Payload: { ID: item.ID ?? item.ImageID ?? item.TempImageID ?? null }
            }).then((response) => {
                if (!isPhotoSignatureResponseSuccess(response)) {
                    throw new Error(getPhotoSignatureResponseMessage(response, 'Delete failed'));
                }
                return refreshTable(state.lastContext, { markInitialLoad: state.initialLoadApplied });
            }).catch((error) => {
                showPhotoSignatureToast(`Delete failed - ${error.message}`, 'error');
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
                }).catch((error) => {
                    showPhotoSignatureToast(`Preview failed - ${error.message}`, 'error');
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
                    showPhotoSignatureToast(`Download failed - ${error.message}`, 'error');
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

    tabRoot._cmLoadData = (requestData, refreshOptions = {}) => refreshTable(requestData, {
        markInitialLoad: !state.initialLoadApplied,
        ...refreshOptions
    });
    tabRoot._cmRefreshData = (requestData, refreshOptions = {}) => refreshTable(requestData, {
        markInitialLoad: !state.initialLoadApplied,
        ...refreshOptions
    });
    tabRoot._cmMaybeAutoLoadPhotoSignature = (requestData) => {
        const context = resolvePhotoSignatureContext(requestData, configuredModuleId);
        if (state.initialLoadApplied || !shouldAutoLoadStandalonePhotoSignature(context)) {
            return Promise.resolve([]);
        }

        return refreshTable(context, { markInitialLoad: true });
    };
    tabRoot._cmSetEditMode = () => {
        setUploadEnabled(Boolean(state.isValidated));
    };

    const maintenanceCore = getPhotoSignatureClientMaintenanceCore();
    if (maintenanceCore?.registerTabLoadFunction) {
        maintenanceCore.registerTabLoadFunction('PhotoSignature', (requestData) => refreshTable(requestData));
    }

    bindPhotoSignatureActionPanel(tabRoot);
    bindStandaloneBootstrap();

    if (!state.isStandalone && (initialContext.ClientID || initialContext.RequestID)) {
        void refreshTable(initialContext, { markInitialLoad: true });
    }
};

function autoInitializeStandalonePhotoSignatureView() {
    const standaloneRoot = document.querySelector('[data-photosignature-host="standalone"]');
    if (!standaloneRoot || typeof window.initClientMaintenancePhotoSignatureTab !== 'function') return;

    const viewState = getPhotoSignatureViewState();
    window.initClientMaintenancePhotoSignatureTab(standaloneRoot, viewState.ModuleID || '', { isStandalone: true });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInitializeStandalonePhotoSignatureView);
} else {
    autoInitializeStandalonePhotoSignatureView();
}
