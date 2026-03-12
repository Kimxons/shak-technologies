(function (win) {
    'use strict';

    function toText(value) {
        return value === undefined || value === null ? '' : String(value).trim();
    }

    function appendWindow(targets, candidate) {
        if (!candidate || targets.includes(candidate)) {
            return;
        }

        targets.push(candidate);
    }

    function getReachableWindows() {
        const targets = [];
        appendWindow(targets, win);

        try {
            appendWindow(targets, win.parent && win.parent !== win ? win.parent : null);
        } catch (_error) {
        }

        try {
            appendWindow(targets, win.top && win.top !== win ? win.top : null);
        } catch (_error) {
        }

        return targets;
    }

    function readInputValue(doc, id) {
        if (!doc || !id) {
            return '';
        }

        try {
            const element = doc.getElementById(id);
            return toText(element?.value);
        } catch (_error) {
            return '';
        }
    }

    function mergeContext(target, source) {
        if (!source || typeof source !== 'object') {
            return target;
        }

        if (!target.clientId) {
            target.clientId = toText(source.clientId || source.ClientID);
        }

        if (!target.requestId) {
            target.requestId = toText(source.requestId || source.RequestID);
        }

        if (!target.clientName) {
            target.clientName = toText(source.clientName || source.ClientName);
        }

        return target;
    }

    const STATE_CANDIDATES = [
        'ClientAddressState',
        'ClientRelationsState',
        'ClientPhotoSignatureState',
        'ClientDemiseDetailsState',
        'ClientBankAccountsState',
        'ClientIntroducerState',
        'ClientPortfolioState',
        'ClientProfileChangeState',
        'ClientIdentityTypesState'
    ];

    function mergeKnownStateObjects(target, currentWindow) {
        if (!currentWindow) {
            return target;
        }

        STATE_CANDIDATES.forEach((stateName) => {
            try {
                mergeContext(target, currentWindow[stateName]);
            } catch (_error) {
            }
        });

        return target;
    }

    function resolveStandaloneContext(explicitContext) {
        const resolved = {
            clientId: '',
            requestId: '',
            clientName: ''
        };

        mergeContext(resolved, explicitContext);

        getReachableWindows().forEach((currentWindow) => {
            mergeKnownStateObjects(resolved, currentWindow);

            try {
                mergeContext(resolved, currentWindow.ClientMaintenanceCore?.getParentContext?.());
            } catch (_error) {
            }

            try {
                mergeContext(resolved, currentWindow.SidebarManager?.getParentContext?.());
            } catch (_error) {
            }

            try {
                const doc = currentWindow.document;
                if (!resolved.clientId) {
                    resolved.clientId = readInputValue(doc, 'txt_mainClientId');
                }
                if (!resolved.clientName) {
                    resolved.clientName = readInputValue(doc, 'txt_mainClientName');
                }
                if (!resolved.requestId) {
                    resolved.requestId = readInputValue(doc, 'txt_mainApplicationId');
                }
            } catch (_error) {
            }
        });

        return resolved;
    }

    function buildContextLabel(context) {
        const clientId = toText(context?.clientId);
        const clientName = toText(context?.clientName);
        const requestId = toText(context?.requestId);

        if (clientId && clientName) {
            return clientId + ' - ' + clientName;
        }

        if (clientName) {
            return clientName;
        }

        if (clientId) {
            return clientId;
        }

        if (requestId) {
            return 'Request ' + requestId;
        }

        return '';
    }

    function getBaseTitle(titleContainer) {
        if (!titleContainer) {
            return '';
        }

        const existingBaseTitle = toText(titleContainer.dataset.baseTitle || titleContainer.getAttribute('data-base-title'));
        if (existingBaseTitle) {
            return existingBaseTitle;
        }

        const currentTitle = toText(titleContainer.getAttribute('data-title'));
        if (currentTitle) {
            titleContainer.dataset.baseTitle = currentTitle;
            return currentTitle;
        }

        return '';
    }

    function ensureContextBanner(root) {
        const formCard = root?.querySelector('.form-card');
        if (!formCard) {
            return null;
        }

        let banner = formCard.querySelector('[data-client-context-banner]');
        if (banner) {
            return banner;
        }

        banner = document.createElement('div');
        banner.className = 'small text-muted px-3 py-2 border-bottom bg-light';
        banner.setAttribute('data-client-context-banner', '');
        banner.hidden = true;

        const sectionHeader = formCard.querySelector('.section-header');
        if (sectionHeader) {
            sectionHeader.insertAdjacentElement('afterend', banner);
            return banner;
        }

        formCard.insertBefore(banner, formCard.firstChild);
        return banner;
    }

    function applyContextToStandalone(root, explicitContext) {
        if (!root) {
            return;
        }

        const resolved = resolveStandaloneContext(explicitContext);
        const label = buildContextLabel(resolved);
        const titleContainer = root.querySelector('[data-kairo-titlebar]');

        if (titleContainer) {
            const baseTitle = getBaseTitle(titleContainer);
            const nextTitle = label ? baseTitle + ' - ' + label : baseTitle;
            if (nextTitle) {
                titleContainer.setAttribute('data-title', nextTitle);
            }

            const titleTextElement = root.querySelector('.ktb-title-bar__text');
            if (titleTextElement && nextTitle) {
                titleTextElement.textContent = nextTitle;
                titleTextElement.title = nextTitle;
            }
        }

        const banner = ensureContextBanner(root);
        if (banner) {
            if (label) {
                banner.textContent = 'Current client: ' + label;
                banner.hidden = false;
            } else {
                banner.textContent = '';
                banner.hidden = true;
            }
        }
    }

    function bindStandaloneRoot(root) {
        if (!root || root.dataset.cmContextBound === 'true') {
            return;
        }

        root.dataset.cmContextBound = 'true';
        applyContextToStandalone(root);

        let isUpdatingContext = false;
        const observer = new MutationObserver(() => {
            if (isUpdatingContext) return;
            isUpdatingContext = true;
            try {
                applyContextToStandalone(root);
            } finally {
                // Use a small delay to ensure the DOM changes have settled before allowing next trigger
                setTimeout(() => { isUpdatingContext = false; }, 50);
            }
        });
        observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-title'] });

        win.addEventListener('message', (event) => {
            const data = event?.data;
            if (!data || typeof data !== 'object') {
                return;
            }

            if (data.type !== 'parentContext' && data.action !== 'parentContextLoaded') {
                return;
            }

            const parentData = data.data || {};
            applyContextToStandalone(root, {
                clientId: parentData.clientId,
                requestId: parentData.requestId,
                clientName: parentData.clientName
            });
        });
    }

    function autoBindStandaloneRoots() {
        document.querySelectorAll('[data-ktb-window]').forEach((root) => {
            bindStandaloneRoot(root);
        });
    }

    win.ClientMaintenanceStandaloneContext = {
        refresh(root, explicitContext) {
            applyContextToStandalone(root || document.querySelector('[data-ktb-window]'), explicitContext);
        },
        resolveContext: resolveStandaloneContext,
        bind: bindStandaloneRoot
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoBindStandaloneRoots);
    } else {
        autoBindStandaloneRoots();
    }
})(window);