// AI Assistant Toggle Logic
const aiButton = document.getElementById('aiAssistantTaskbarButton');
const aiWindow = document.getElementById('aiAssistantWindow');
const closeButton = document.getElementById('closeAiAssistant');
const chatMessages = document.getElementById('aiChatMessages');
const chatInput = document.getElementById('aiChatInput');
const sendButton = document.getElementById('sendAiMessage');

// Toggle AI window
aiButton.addEventListener('click', () => {
    const isVisible = aiWindow.style.display === 'flex';

    if (!isVisible) {
        aiWindow.style.display = 'flex';
        aiWindow.style.animation = 'slideUp 0.3s ease-out';
        chatInput.focus();
    } else {
        aiWindow.style.animation = 'slideDown 0.3s ease-out';
        setTimeout(() => {
            aiWindow.style.display = 'none';
        }, 280);
    }
});

closeButton.addEventListener('click', () => {
    aiWindow.style.animation = 'slideDown 0.3s ease-out';
    setTimeout(() => {
        aiWindow.style.display = 'none';
    }, 280);
});

// Start Menu Logic
const startButton = document.getElementById('startButton');
const startMenu = document.getElementById('startMenu');

// Module Icons Mapping
const moduleIcons = {
    customer: 'fa-address-card',
    account: 'fa-wallet',
    deposit: 'fa-piggy-bank',
    "recurring-deposit": 'fa-calendar-check',
    "limits-collateral": 'fa-scale-balanced',
    "workflow-setting": 'fa-diagram-project',
    "workflow-loan": 'fa-file-signature',
    accounts: 'fa-clipboard-list',
    loans: 'fa-coins',
    overdrafts: 'fa-file-alt',
    images: 'fa-camera',
    transaction: 'fa-money-bill-transfer',
    microfinance: 'fa-hand-holding-dollar',
    process: 'fa-gears',
    treasury: 'fa-building-columns',
    "trade-finance": 'fa-globe',
    "fixed-asset": 'fa-tags',
    "other-modules": 'fa-ellipsis',
    "general-ledger": 'fa-book',
    product: 'fa-cube',
    "charges-rates": 'fa-percent',
    "static-data": 'fa-database',
    "system-security": 'fa-user-shield',
    security: 'fa-shield-halved',
    utilities: 'fa-screwdriver-wrench',
    "system-audit": 'fa-history',
    clearing: 'fa-check-double',
    "swift-rtgs": 'fa-paper-plane',
    "system-utilities": 'fa-gear',
    "system-brnet": 'fa-info-circle',
    workflow: 'fa-route',
    reports: 'fa-list-check'
};

// --- Start Menu View Management ---
let globalSearchDebounce;
function resetStartMenuViews() {
    const mainView = document.getElementById('startMenuMainView');
    const submenuView = document.getElementById('startMenuSubmenu');
    const resultsView = document.getElementById('startMenuSearchResults');
    const searchInput = document.getElementById('startMenuSearch');

    if (mainView) mainView.style.display = 'block';
    if (submenuView) submenuView.style.display = 'none';
    if (resultsView) resultsView.style.display = 'none';
    if (searchInput) {
        searchInput.value = '';
    }
    if (globalSearchDebounce) clearTimeout(globalSearchDebounce);
}

let modalIndex = 1050;
//Global openKairoWindow function to open menu windows
function openKairoWindow(module) {
    let kmodal = '  <div class="modal fade legacy-modal legacy-modal--workspace" id="modal_' + module.modalId + '" data-window-title="' + module.label + '"		'
        + ' data-window-icon="fas fa-users" tabindex="-1" aria-hidden="true">                                                         '
        + '<div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">                                          '
        + '    <div class="modal-content">                                                                                            '
        + '        <div class="modal-header">                                                                                         '
        + '            <h4 class="modal-title mb-0">' + module.label + '</h4>                                                           '
        + '            <div class="window-controls" data-window-controls>                                                             '
        + '                <button type="button" class="window-control" data-window-action="refresh" aria-label="Refresh window">     '
        + '                    <i class="fas fa-sync-alt"></i>                                                                        '
        + '                </button>                                                                                                  '
        + '                <button type="button" class="window-control" data-window-action="minimize" aria-label="Minimize window">   '
        + '                    <i class="finvokeControllerAsyncar fa-window-minimize"></i>                                                                 '
        + '                </button>                                                                                                  '
        + '                <button type="button" class="window-control" data-window-action="maximize" aria-label="Maximize window">   '
        + '                    <i class="far fa-square"></i>                                                                          '
        + '                </button>                                                                                                  '
        + '                <button type="button" class="window-control window-control--close" data-window-action="close"              '
        + '                        aria-label="Close window">                                                                         '
        + '                    <i class="far fa-times-circle"></i>                                                                    '
        + '                </button>                                                                                                  '
        + '            </div>                                                                                                         '
        + '        </div>                                                                                                             '
        //+ '        <div class="modal-body modal-body-content" style="height:75vh;">                                                                        '
        + '        <div class="modal-body modal-body--iframe" >                                                                        '
        + '            <iframe class="legacy-modal__iframe" src="' + module.route + '"                  '
        + '                    title="' + module.label + '" loading="lazy"></iframe>                                          '
        + '        </div>                                                                                                             '
        + '    </div>                                                                                                                 '
        + '</div>                                                                                                                     '
        + '</div>';

    $("#karioModalContainer").append(kmodal);
    //window.AppCore.invokeControllerGetView(module.route, {}, function (error, response, status) {
    //    if (error) {
    //        console.error('Fetch failed:', error);
    //        return;
    //    }

    //    $(".modal-body-content").html(response);
    //});

    var $newModal = $(".legacy-modal").last();

    modalIndex += 10;

    $newModal.css("z-index", modalIndex);

    $newModal.on("shown.bs.modal", function () {
        $(".modal-backdrop").not(".stacked").last()
            .css("z-index", modalIndex - 1)
            .addClass("stacked");
    });

    var modal = new bootstrap.Modal($newModal[0]);
    modal.show();

    // // Remove from DOM when closed
    // $newModal.on("hidden.bs.modal", function () {
    // $newModal.remove();
    // });

    if (startMenu) startMenu.style.display = 'none';
    resetStartMenuViews();

}
// Global showSubmenu function - defined early so inline onclick handlers can call it
function showSubmenu(module) {
    console.log('[Dashboard] showSubmenu called:', module);
    console.log(module);

    // Handle different data structures from Razor vs START_MENU_REGISTRY
    if (Array.isArray(module)) {
        // Raw array from Razor model - transform to module object
        module = {
            //title: document.querySelector("[data-module-id='"+module[0].MainModuleID+"']").getElementsByTagName("span")[0].textContent, // Use generic title or extract from context
            title: module[0].MainModuleDescription,
            items: module.map(item => ({
                label: item.MenuDescription,
                icon: item.ModuleIcon ?? 'fas fa-circle',
                route: item.MenuURL,
                modalId: item.ModuleID
            }))
        };
    }

    // Get DOM elements lazily to ensure they're available
    const resultsView = document.getElementById('startMenuSearchResults');
    const searchInput = document.getElementById('startMenuSearch');
    const submenuTitle = document.getElementById('submenuTitle');
    const submenuList = document.getElementById('submenuList');
    const mainView = document.getElementById('startMenuMainView');
    const submenuView = document.getElementById('startMenuSubmenu');
    const startMenu = document.getElementById('startMenu');

    // Validate that required DOM elements exist
    if (!submenuTitle || !submenuList || !mainView || !submenuView) {
        console.error('[Dashboard] Required DOM elements not found for showSubmenu');
        return;
    }

    // Clear search state
    if (resultsView) resultsView.style.display = 'none';
    if (searchInput) searchInput.value = '';

    // Set submenu title
    submenuTitle.textContent = module.title || 'Menu';
    submenuList.innerHTML = '';

    // Populate submenu items
    if (module.items && Array.isArray(module.items) && module.items.length > 0) {
        module.items.forEach(item => {
            if (item.type === 'divider') {
                const div = document.createElement('div');
                div.style.height = '1px';
                div.style.background = 'var(--dash-card-border)';
                div.style.margin = '4px 0';
                submenuList.appendChild(div);
                return;
            }

            const btn = document.createElement('button');
            btn.className = 'submenu-item';
            //btn.innerHTML = `<i class="${item.icon || 'fas fa-circle'}" style="color: var(--dash-accent);"></i> ${item.label}`;
            var dparser = new DOMParser();
            const doc = dparser.parseFromString(item.icon, 'text/html');
            const micon = doc.querySelector("i");
            micon.setAttribute("style", "color: var(--dash-accent);");
            btn.innerHTML = `${micon.outerHTML}${item.label}`;

            btn.addEventListener('click', () => {
                console.log('[Dashboard] Start Menu Item Clicked:', item.label);
                console.log(item);
                if (item.modalId) {
                    console.log('[Dashboard] Attempting to open modal:', item.modalId);
                    openKairoWindow(item)
                    // const modalEl = document.getElementById(item.modalId);
                    // if (modalEl) {
                    //   try {
                    //     const modal = new bootstrap.Modal(modalEl);
                    //     modal.show();
                    //     console.log('[Dashboard] Modal opened successfully:', item.modalId);

                    //     const iframe = modalEl.querySelector('iframe');
                    //     if (iframe) {
                    //       console.log('[Dashboard] Reloading iframe for:', item.modalId);
                    //       iframe.src = iframe.src;
                    //     }
                    //   } catch (err) {
                    //     console.error('[Dashboard] Error opening modal:', err);
                    //   }
                    //   if (startMenu) startMenu.style.display = 'none';
                    //   resetStartMenuViews();
                    // } else {
                    //   console.warn(`[Dashboard] Modal ${item.modalId} not found in DOM`);
                    // }
                } else if (item.route) {
                    if (item.route.startsWith('http')) {
                        window.open(item.route, '_blank');
                    } else {
                        window.location.href = item.route;
                    }
                    if (startMenu) startMenu.style.display = 'none';
                    resetStartMenuViews();
                }
            });

            submenuList.appendChild(btn);
        });
    } else {
        submenuList.innerHTML = '<div style="padding: 1rem; color: var(--dash-muted); text-align: center;">No items available</div>';
    }

    // Switch views
    mainView.style.display = 'none';
    submenuView.style.display = 'flex';
}

if (startButton && startMenu) {
    // Toggle Menu
    startButton.addEventListener('click', (e) => {
        try {
            e.stopPropagation();
            const isVisible = startMenu.style.display === 'flex';

            if (!isVisible) {
                console.log('[StartMenu] Opening...');
                startMenu.style.display = 'flex';
                startMenu.style.zIndex = '2147483647';
                startMenu.style.animation = 'slideUp 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)';

                resetStartMenuViews(); // This also clears timeouts
                const searchInput = document.getElementById('startMenuSearch');
                if (searchInput) {
                    searchInput.value = '';
                    setTimeout(() => {
                        searchInput.focus();
                        console.log('[StartMenu] Focused search input');
                    }, 300);
                }
            } else {
                console.log('[StartMenu] Closing...');
                startMenu.style.animation = 'slideDown 0.2s ease-out';
                setTimeout(() => {
                    startMenu.style.display = 'none';
                    resetStartMenuViews();
                }, 180);
            }
        } catch (err) {
            console.error('[StartMenu] Critical Error in Toggle:', err);
        }
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (startMenu.style.display === 'flex' && !startMenu.contains(e.target) && !startButton.contains(e.target)) {
            startMenu.style.animation = 'slideDown 0.2s ease-out';
            setTimeout(() => { startMenu.style.display = 'none'; }, 180);
        }
    });

    // Wire up logout button
    const startLogoutBtn = startMenu.querySelector('[data-logout]');
    if (startLogoutBtn) {
        startLogoutBtn.addEventListener('click', () => {
            if (typeof AuthService !== 'undefined') {
                AuthService.logout();
            } else {
                window.location.href = '/login';
            }
        });
    }
}

// Populate Start Menu Grid
window.addEventListener('load', () => {
    //if (typeof START_MENU_REGISTRY === 'undefined') {
    //    console.error("START_MENU_REGISTRY not found.");
    //    return;
    //}
    console.log("hapa ndipo");
    const grid = document.getElementById('startMenuGrid');
    const submenuView = document.getElementById('startMenuSubmenu');
    const mainView = document.getElementById('startMenuMainView');
    const submenuList = document.getElementById('submenuList');
    const submenuTitle = document.getElementById('submenuTitle');
    const backBtn = document.getElementById('backToGrid');

    //// Render Cards
    //Object.entries(START_MENU_REGISTRY).forEach(([key, module]) => {
    //    const card = document.createElement('div');
    //    card.className = 'module-card';
    //    const iconClass = moduleIcons[key] || 'fa-circle';

    //    card.innerHTML = `
    //            <i class="fas ${iconClass} module-icon"></i>
    //            <span class="module-title">${module.title}</span>
    //        `;

    //    card.addEventListener('click', () => {
    //        showSubmenu(module);
    //    });

    //    grid.appendChild(card);
    //});



    backBtn.addEventListener('click', () => {
        submenuView.style.display = 'none';
        mainView.style.display = 'block';
    });

    // Search Logic
    const searchInput = document.getElementById('startMenuSearch');
    const searchResultsView = document.getElementById('startMenuSearchResults');
    const searchResultsList = document.getElementById('startMenuSearchResultsList');

    // Force focus on click to bypass any traps
    if (searchInput) {
        searchInput.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            setTimeout(() => searchInput.focus(), 10);
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            if (globalSearchDebounce) clearTimeout(globalSearchDebounce);
            const query = e.target.value.trim().toLowerCase();

            // Optimization: Min 2 characters for search
            if (query.length < 2) {
                searchResultsView.style.display = 'none';
                submenuView.style.display = 'none';
                mainView.style.display = 'block';
                searchResultsList.innerHTML = '';
                return;
            }

            globalSearchDebounce = setTimeout(() => {
                try {
                    // Switch to Search View
                    mainView.style.display = 'none';
                    submenuView.style.display = 'none';
                    searchResultsView.style.display = 'flex';
                    searchResultsList.innerHTML = '';

                    let hasResults = false;
                    let resultCount = 0;
                    const MAX_RESULTS = 30; // Limit results to prevent UI hang

                    // Helper to search items recursively
                    function searchItems(items, moduleTitle, parentLabel = "") {
                        if (!items || !Array.isArray(items) || resultCount >= MAX_RESULTS) return;

                        items.forEach(item => {
                            if (item.type === 'divider' || resultCount >= MAX_RESULTS) return;

                            // Search the item itself
                            if (item.label && item.label.toLowerCase().includes(query)) {
                                const detail = parentLabel ? `${moduleTitle} > ${parentLabel}` : moduleTitle;
                                renderSearchResult(item.label, detail, () => triggerItemAction(item), item.icon);
                                hasResults = true;
                                resultCount++;
                            }

                            // Search nested submenu
                            if (item.submenu && Array.isArray(item.submenu) && resultCount < MAX_RESULTS) {
                                searchItems(item.submenu, moduleTitle, item.label);
                            }
                        });
                    }

                    //if (typeof START_MENU_REGISTRY !== 'undefined') {
                    //    Object.entries(START_MENU_REGISTRY).forEach(([key, module]) => {
                    //        if (!module) return;

                    //        // Check Module Title
                    //        if (module.title && module.title.toLowerCase().includes(query)) {
                    //            renderSearchResult(module.title, "Module", () => showSubmenu(module), 'fa-layer-group');
                    //            hasResults = true;
                    //        }

                    //        // Check Items
                    //        if (module.items) {
                    //            searchItems(module.items, module.title);
                    //        }
                    //    });
                    //}

                    if (!hasResults) {
                        searchResultsList.innerHTML = `
                                                                                                                 <div style="padding: 2rem; text-align: center; color: var(--dash-muted);">
                                                                                                                     <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                                                                                                                     <p>No results found for "${query}"</p>
                                                                                                                 </div>
                                                                                                             `;
                    }
                } catch (err) {
                    console.error("Search Error:", err);
                    if (searchResultsList) {
                        searchResultsList.innerHTML = '<div style="color:red; padding:1rem;">Error searching modules</div>';
                    }
                }
            }, 300); // 300ms debounce
        });
    }

    function renderSearchResult(title, subtitle, onClick, iconClass) {
        const btn = document.createElement('button');
        btn.className = 'submenu-item'; // Reuse styling
        btn.style.display = 'flex';
        btn.style.flexDirection = 'column';
        btn.style.alignItems = 'flex-start';
        btn.style.gap = '4px';
        btn.innerHTML = `
                                                                                                   <div style="display: flex; align-items: center; gap: 10px; width: 100%;">
                                                                                                       <i class="${iconClass || 'fas fa-circle'}" style="color: var(--dash-accent); width: 20px; text-align: center;"></i>
                                                                                                       <span style="font-weight: 500;">${title}</span>
                                                                                                   </div>
                                                                                                   <div style="font-size: 0.75rem; color: var(--dash-muted); margin-left: 30px;">${subtitle}</div>
                                                                                               `;
        btn.addEventListener('click', onClick);
        searchResultsList.appendChild(btn);
    }

    function triggerItemAction(item) {
        if (item.modalId) {
            const modalEl = document.getElementById(item.modalId);
            if (modalEl) {
                const modal = bootstrap.Modal.getOrCreateInstance(modalEl, {
                    focus: false,
                    backdrop: false
                });
                modal.show();
                startMenu.style.display = 'none';
                resetStartMenuViews();
            } else {
                console.warn(`Modal ${item.modalId} not found`);
            }
        } else if (item.route) {
            if (item.route.startsWith('http')) {
                window.open(item.route, '_blank');
            } else {
                window.location.href = item.route;
            }
            startMenu.style.display = 'none';
            resetStartMenuViews();
        }
    }
});

// ---------------------------------------------------------
// SYSTEM TASKBAR & WINDOW MANAGER LOGIC (REFACTORED)
// ---------------------------------------------------------
const taskbarApps = document.getElementById('taskbarApps');
const windowState = new Map(); // modalId -> { minimized: bool, minimizing: bool }
let activeModalId = null;
const modalIconMap = new Map();

//// 1. Build Icon Map
//window.addEventListener('load', () => {
//    if (typeof START_MENU_REGISTRY !== 'undefined') {
//        Object.values(START_MENU_REGISTRY).forEach(module => {
//            if (module.items) {
//                module.items.forEach(item => {
//                    if (item.modalId && item.icon) modalIconMap.set(item.modalId, item.icon);
//                });
//            }
//        });
//    }
//});

// 2. Window Manager: Handle Show (AUTO-MINIMIZE OTHERS)
document.body.addEventListener('show.bs.modal', (e) => {
    const modalId = e.target.id;
    if (!modalId || !taskbarApps) return;

    const state = windowState.get(modalId) || {};
    console.log('[SHOW] Modal:', modalId, 'State:', state);

    // If modal is NOT being restored from minimize, clear it first
    if (!state.minimized) {
        console.log('[SHOW] Fresh open - clearing form data first');
        e.target.querySelectorAll('form').forEach(f => f.reset());
        e.target.querySelectorAll('input, select, textarea').forEach(input => {
            if (['text', 'password', 'email', 'number', 'search', 'tel', 'url', 'date', 'time', 'datetime-local'].includes(input.type)) {
                input.value = '';
                input.removeAttribute('value');
            } else if (input.type === 'checkbox' || input.type === 'radio') {
                input.checked = false;
            } else if (input.tagName === 'SELECT') {
                input.selectedIndex = 0;
            }
        });
    }

    // Initialize State
    if (!windowState.has(modalId)) {
        windowState.set(modalId, { minimized: false, minimizing: false });
    }

    // AUTO-MINIMIZE: Minimize other active window
    const currentActive = document.querySelector('.modal.show');
    if (currentActive && currentActive.id !== modalId) {
        minimizeWindow(currentActive.id);
    }

    // A. Setup Minimize Button - Find the minimize button specifically
    const header = e.target.querySelector('.modal-header');
    console.log('[SETUP] Modal:', modalId, 'Header found:', !!header);
    if (header) {
        // Get ALL buttons in header
        const allButtons = header.querySelectorAll('button');
        console.log('[SETUP] Found', allButtons.length, 'buttons in header');

        // Find minimize button by attribute or class
        let minBtn = null;
        allButtons.forEach(btn => {
            const action = btn.getAttribute('data-window-action');
            const isClose = btn.classList.contains('window-control--close') ||
                btn.classList.contains('btn-close') ||
                action === 'close';
            console.log('[SETUP] Button action:', action, 'class:', btn.className, 'is close?', isClose);

            if (action === 'minimize' || (action === 'toggle-min' || action === 'dock')) {
                minBtn = btn;
            }
        });

        if (!minBtn) {
            console.log('[SETUP] No minimize button found by action, creating one');
            minBtn = document.createElement('button');
            minBtn.type = 'button';
            minBtn.className = 'btn-minimize window-control';
            minBtn.setAttribute('data-window-action', 'minimize');
            minBtn.innerHTML = '<i class="fas fa-minus"></i>';
            minBtn.style.marginRight = '8px';
            minBtn.style.background = 'transparent';
            minBtn.style.border = 'none';
            minBtn.style.color = '#6b7280';
            minBtn.style.padding = '0.375rem 0.5rem';
            minBtn.style.cursor = 'pointer';

            const closeBtn = header.querySelector('.btn-close, [data-bs-dismiss="modal"], .window-control--close');
            if (closeBtn) header.insertBefore(minBtn, closeBtn);
            else header.appendChild(minBtn);
        }

        console.log('[SETUP] Button element:', minBtn, 'Has data-bs-dismiss:', minBtn.hasAttribute('data-bs-dismiss'));

        // Critical: Remove dismiss attribute from button AND children
        minBtn.removeAttribute('data-bs-dismiss');
        minBtn.querySelectorAll('*').forEach(child => child.removeAttribute('data-bs-dismiss'));
        console.log('[SETUP] Removed data-bs-dismiss from button and children');

        // Handler - use mousedown to fire BEFORE Bootstrap's click handler
        const handler = (ev) => {
            console.log('[MINIMIZE] Mousedown on:', ev.target.tagName, 'modalId:', modalId);
            ev.preventDefault();
            ev.stopPropagation();
            ev.stopImmediatePropagation();

            // Set flag IMMEDIATELY
            const state = windowState.get(modalId) || {};
            state.minimizing = true;
            state.minimized = true;
            windowState.set(modalId, state);

            // Hide modal
            const modal = bootstrap.Modal.getOrCreateInstance(e.target);
            modal.hide();
        };

        // Attach to button and all children using mousedown (SOCIALLY DISTANCED: only once!)
        if (!minBtn.dataset.handlerAttached) {
            minBtn.addEventListener('mousedown', handler, true);
            minBtn.querySelectorAll('*').forEach(child => {
                child.addEventListener('mousedown', handler, true);
            });
            minBtn.dataset.handlerAttached = "true";
            console.log('[SETUP] Mousedown handler attached to button +', minBtn.querySelectorAll('*').length, 'children');
        }
    }

    // B. Add to Taskbar
    if (!document.getElementById(`taskbar-btn-${modalId}`)) {
        createTaskbarItem(modalId, e.target);
    }

    // C. Set Active
    setActiveWindow(modalId);
}, true);

// 2.5. Clear form AFTER modal is fully shown (to override any repopulation)
document.body.addEventListener('shown.bs.modal', (e) => {
    const modalId = e.target.id;
    if (!modalId) return;

    const state = windowState.get(modalId) || {};

    // If this was a fresh open (not restore from minimize), clear again
    if (!state.wasMinimized) {
        console.log('[SHOWN] Fresh open complete - final clear for:', modalId);
        e.target.querySelectorAll('form').forEach(f => f.reset());
        e.target.querySelectorAll('input, select, textarea').forEach(input => {
            if (['text', 'password', 'email', 'number', 'search', 'tel', 'url', 'date', 'time', 'datetime-local'].includes(input.type)) {
                input.value = '';
                input.removeAttribute('value');
            } else if (input.type === 'checkbox' || input.type === 'radio') {
                input.checked = false;
            } else if (input.tagName === 'SELECT') {
                input.selectedIndex = 0;
            }
        });
    }

    // Reset the flag
    if (state.wasMinimized) {
        state.wasMinimized = false;
        windowState.set(modalId, state);
    }
});

// 3. Window Manager: Handle Hide
document.body.addEventListener('hide.bs.modal', (e) => {
    const modalId = e.target.id;
    if (!modalId) return;

    const state = windowState.get(modalId) || {};
    console.log('[HIDE] Modal:', modalId, 'minimizing=', state.minimizing);

    if (state.minimizing) {
        // DOCKING (Minimize)
        const btn = document.getElementById(`taskbar-btn-${modalId}`);
        if (btn) {
            btn.classList.add('minimized');
            btn.classList.remove('active-window');
        }

        state.minimizing = false; // Reset flag
        state.minimized = true;
        windowState.set(modalId, state);

        if (activeModalId === modalId) activeModalId = null;
    } else {
        // CLOSING (Remove & Reset)
        const btn = document.getElementById(`taskbar-btn-${modalId}`);
        if (btn) btn.remove();
        windowState.delete(modalId);
        if (activeModalId === modalId) activeModalId = null;


        // RESET FORM DATA
        console.log('[CLOSE] Resetting form data for:', modalId);
        const forms = e.target.querySelectorAll('form');
        forms.forEach(f => {
            console.log('[CLOSE] Resetting form:', f);
            f.reset();
        });

        // Clear all inputs thoroughly
        e.target.querySelectorAll('input, select, textarea').forEach(input => {
            if (['text', 'password', 'email', 'number', 'search', 'tel', 'url', 'date', 'time', 'datetime-local'].includes(input.type)) {
                input.value = '';
            } else if (input.type === 'checkbox' || input.type === 'radio') {
                input.checked = false;
            } else if (input.tagName === 'SELECT') {
                input.selectedIndex = 0;
            }
        });
        console.log('[CLOSE] Form data cleared');
    }
});

// Additional cleanup after modal is FULLY hidden
document.body.addEventListener('hidden.bs.modal', (e) => {
    const modalId = e.target.id;
    if (!modalId) return;

    const state = windowState.get(modalId);
    // Only clear if modal was closed (not minimized)
    if (!state || !state.minimized) {
        console.log('[HIDDEN] Final cleanup for closed modal:', modalId);
        // Clear any programmatically set values
        e.target.querySelectorAll('input, select, textarea').forEach(input => {
            if (input.type === 'text' || input.type === 'email' || input.type === 'password' ||
                input.type === 'number' || input.type === 'tel' || input.type === 'url') {
                input.value = '';
                input.removeAttribute('value');
            } else if (input.type === 'checkbox' || input.type === 'radio') {
                input.checked = false;
            } else if (input.tagName === 'SELECT') {
                input.selectedIndex = 0;
            }
        });
    }
});

// 4. Helper Functions
function createTaskbarItem(modalId, modalEl) {
    const title = modalEl.querySelector('.modal-title')?.textContent.trim() || 'Window';
    const icon = modalIconMap.get(modalId) || 'fa-window-maximize';

    const btn = document.createElement('button');
    btn.id = `taskbar-btn-${modalId}`;
    btn.className = 'taskbar-app-btn';
    btn.innerHTML = `<i class="fas ${icon}"></i> <span>${title}</span>`;

    btn.onclick = () => handleTaskbarClick(modalId);
    taskbarApps.appendChild(btn);
}

function handleTaskbarClick(modalId) {
    const state = windowState.get(modalId) || {};

    if (state.minimized) {
        restoreWindow(modalId);
    } else {
        minimizeWindow(modalId);
    }
}

function minimizeWindow(modalId) {
    const modalEl = document.getElementById(modalId);
    // Robust instance retrieval
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl, {
        focus: false,
        backdrop: false
    });
    if (modal) {
        const state = windowState.get(modalId) || {};
        state.minimizing = true; // CRITICAL FLAG
        state.minimized = true;
        windowState.set(modalId, state);

        modal.hide();
    }
}

function restoreWindow(modalId) {
    const modalEl = document.getElementById(modalId);
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl, {
        focus: false,
        backdrop: false
    });

    const state = windowState.get(modalId) || {};
    state.minimized = false;
    state.wasMinimized = true; // Flag to prevent clearing on restore
    windowState.set(modalId, state);

    const btn = document.getElementById(`taskbar-btn-${modalId}`);
    if (btn) btn.classList.remove('minimized');

    modal.show();
    setActiveWindow(modalId);
}

function setActiveWindow(modalId) {
    activeModalId = modalId;
    document.querySelectorAll('.taskbar-app-btn').forEach(b => b.classList.remove('active-window'));
    const btn = document.getElementById(`taskbar-btn-${modalId}`);
    if (btn) btn.classList.add('active-window');
}

// Send message function
function sendAiMessage(message) {
    const userMessage = message || chatInput.value.trim();
    if (!userMessage) return;

    // Add user message
    const userMessageDiv = document.createElement('div');
    userMessageDiv.style.cssText = 'display: flex; justify-content: flex-end; animation: slideInRight 0.4s ease-out;';
    userMessageDiv.innerHTML = `
                                                                                           <div style="max-width: 75%;">
                                                                                             <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 1rem 1.25rem; border-radius: 16px; border-bottom-right-radius: 4px;">
                                                                                               <p style="margin: 0; color: white; font-size: 0.9375rem; line-height: 1.6;">${userMessage}</p>
                                                                                             </div>
                                                                                             <span style="color: #9ca3af; font-size: 0.75rem; margin-top: 0.5rem; display: block; text-align: right;">Just now</span>
                                                                                           </div>
                                                                                         `;
    chatMessages.appendChild(userMessageDiv);
    chatInput.value = '';

    // Auto-scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Simulate AI response (placeholder)
    setTimeout(() => {
        const aiResponseDiv = document.createElement('div');
        aiResponseDiv.style.cssText = 'display: flex; gap: 0.75rem; animation: slideInLeft 0.4s ease-out;';
        aiResponseDiv.innerHTML = `
                                                                                             <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                                                                               <i class="fas fa-robot" style="color: white; font-size: 1rem;"></i>
                                                                                             </div>
                                                                                             <div style="flex: 1;">
                                                                                               <div style="background: linear-gradient(135deg, #667eea15 0%, #764ba220 100%); padding: 1rem 1.25rem; border-radius: 16px; border-top-left-radius: 4px; border: 1px solid #667eea30;">
                                                                                                 <p style="margin: 0; color: #1f2937; font-size: 0.9375rem; line-height: 1.6;">
                                                                                                   I understand you want to "${userMessage}". This feature will be available soon! For now, you can navigate using the menu on the left.
                                                                                                 </p>
                                                                                               </div>
                                                                                               <span style="color: #9ca3af; font-size: 0.75rem; margin-top: 0.5rem; display: block;">Just now</span>
                                                                                             </div>
                                                                                           `;
        chatMessages.appendChild(aiResponseDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 1000);
}

// Send on button click
sendButton.addEventListener('click', () => sendAiMessage());

// Send on Enter key
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendAiMessage();
});

// Real-Time Date/Time Updater
function updateDateTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const timeEl = document.getElementById('currentTime');
    const dateEl = document.getElementById('currentDate');

    if (timeEl) timeEl.textContent = timeStr;
    if (dateEl) dateEl.textContent = dateStr;
}

// Update immediately and then every second
updateDateTime();
setInterval(updateDateTime, 1000);

// --- Dynamic Quick Actions Logic ---
const DEFAULT_QUICK_ACTIONS = [
    { id: 'clientModal', label: 'New Client', icon: 'fas fa-user-plus' },
    { id: 'accountMaintenanceModal', label: 'New Account', icon: 'fas fa-wallet' },
    { id: 'transferTransactionsModal', label: 'Transfer', icon: 'fas fa-money-bill-transfer' },
    { id: 'loansModal', label: 'Loan', icon: 'fas fa-coins' }
];

function getQuickActions() {
    try {
        const stored = localStorage.getItem('kairo_quick_actions');
        return stored ? JSON.parse(stored) : DEFAULT_QUICK_ACTIONS;
    } catch (e) {
        return DEFAULT_QUICK_ACTIONS;
    }
}

function renderQuickActions() {
    const grid = document.getElementById('quickActionsGrid');
    if (!grid) return;

    const actions = getQuickActions();
    grid.innerHTML = '';

    if (actions.length === 0) {
        grid.innerHTML = '<div class="col-12 text-center py-3 opacity-50 small italic">No shortcuts added. Click Customize to add some.</div>';
        return;
    }

    actions.forEach(action => {
        const col = document.createElement('div');
        col.className = 'col-6';
        col.innerHTML = `
                                                                                             <button class="btn w-100 quick-action-btn" onclick="window.openQuickAction('${action.id}')"
                                                                                               style="padding: 1rem 0.75rem; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;">
                                                                                               <i class="${action.icon || 'fas fa-circle'}" style="font-size: 1.5rem;"></i>
                                                                                               <span style="font-size: 0.8125rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%;">${action.label}</span>
                                                                                             </button>
                                                                                           `;
        grid.appendChild(col);
    });
}

window.openQuickActionCustomizer = function () {
    const modalEl = document.getElementById('quickActionCustomizerModal');
    if (!modalEl) return;
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    renderAvailableActions();
    modal.show();
};

function renderAvailableActions(searchQuery = '') {
    const container = document.getElementById('availableActionsList');
    if (!container) return;

    const currentActions = getQuickActions().map(a => a.id);
    container.innerHTML = '';

    // Flatten registry to get all actionable items
    const allItems = [];
    //if (typeof START_MENU_REGISTRY !== 'undefined') {
    //    Object.values(START_MENU_REGISTRY).forEach(module => {
    //        if (module.items) {
    //            module.items.forEach(item => {
    //                if (item.label && item.modalId) {
    //                    // Avoid duplicates by label+id
    //                    if (!allItems.find(existing => existing.modalId === item.modalId && existing.label === item.label)) {
    //                        allItems.push(item);
    //                    }
    //                }
    //            });
    //        }
    //    });
    //}

    const filtered = allItems.filter(i => i.label.toLowerCase().includes(searchQuery.toLowerCase()));

    if (filtered.length === 0) {
        container.innerHTML = '<div class="col-12 text-center py-5 text-muted">No items match your search.</div>';
        return;
    }

    filtered.forEach(item => {
        const col = document.createElement('div');
        col.className = 'col-md-6';
        const isActive = currentActions.includes(item.modalId);
        col.innerHTML = `
                                                                                             <div class="d-flex align-items-center p-3 border rounded-3 bg-white h-100 transition-all cursor-pointer available-action-item ${isActive ? 'border-primary bg-primary-subtle' : ''}"
                                                                                                  style="cursor: pointer; transition: all 0.2s;">
                                                                                               <div class="form-check w-100 d-flex align-items-center gap-3 mb-0">
                                                                                                 <input class="form-check-input flex-shrink-0" type="checkbox" value="${item.modalId}"
                                                                                                        data-label="${item.label}" data-icon="${item.icon}" ${isActive ? 'checked' : ''}
                                                                                                        style="width: 18px; height: 18px; cursor: pointer;">
                                                                                                 <div class="d-flex align-items-center gap-2 overflow-hidden">
                                                                                                   <i class="${item.icon || 'fas fa-circle'}" style="width: 20px; text-align: center; color: var(--dash-accent); font-size: 1.1rem;"></i>
                                                                                                   <span class="fw-semibold text-dark text-truncate" style="font-size: 0.9rem;">${item.label}</span>
                                                                                                 </div>
                                                                                               </div>
                                                                                             </div>
                                                                                           `;

        const itemDiv = col.firstElementChild;
        itemDiv.addEventListener('click', (e) => {
            if (e.target.tagName !== 'INPUT') {
                const input = itemDiv.querySelector('input');
                input.checked = !input.checked;
                // Toggle visual state
                itemDiv.classList.toggle('border-primary', input.checked);
                itemDiv.classList.toggle('bg-primary-subtle', input.checked);
            }
        });

        container.appendChild(col);
    });
}

// Wiring up customizer buttons
document.addEventListener('DOMContentLoaded', () => {
    renderQuickActions();

    const searchInput = document.getElementById('customizerSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderAvailableActions(e.target.value);
        });
    }

    const saveBtn = document.getElementById('saveActionsBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const container = document.getElementById('availableActionsList');
            const checked = container.querySelectorAll('input:checked');
            const newActions = Array.from(checked).map(input => ({
                id: input.value,
                label: input.dataset.label,
                icon: input.dataset.icon
            }));

            if (newActions.length > 8) {
                alert('Please select up to 8 actions for the best layout.');
                return;
            }

            localStorage.setItem('kairo_quick_actions', JSON.stringify(newActions));
            renderQuickActions();

            const modal = bootstrap.Modal.getInstance(document.getElementById('quickActionCustomizerModal'));
            if (modal) modal.hide();
        });
    }

    const resetBtn = document.getElementById('resetActionsBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('Reset quick actions to defaults?')) {
                localStorage.removeItem('kairo_quick_actions');
                renderQuickActions();
                renderAvailableActions();
            }
        });
    }
});

// Global helper for Quick Actions
window.openQuickAction = function (modalId) {
    const modalEl = document.getElementById(modalId);
    if (modalEl) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl, {
            focus: false,
            backdrop: false
        });
        modal.show();
    } else {
        console.warn('Quick Action: Modal not found', modalId);
    }
};