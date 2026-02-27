/* Client 360 View - JavaScript Controller */

const CLIENT360_CONTROLLER_BASE = 'Identities/Client360';
const MODULEID_CLIENT360 = 1234;
function getAppCore() {
    const win = window;
    return win.AppCore ||
        (win.parent && win.parent !== win && win.parent.AppCore) ||
        (win.top && win.top !== win && win.top.AppCore) ||
        null;
}

function invokeClient360Controller(action, requestData) {
    return new Promise((resolve, reject) => {
        const appCore = getAppCore();
        if (!appCore || typeof appCore.invokeController !== 'function') {
            reject(new Error('AppCore is not available (AppCore.invokeController not found)'));
            return;
        }

        const endpoint = `${CLIENT360_CONTROLLER_BASE}/${action}`;
        appCore.invokeController(endpoint, requestData || {}, (error, response) => {
            if (error) {
                reject(error);
            } else {
                resolve(response);
            }
        });
    });
}

const Client360Service = {
    validateClient360(requestData) {
        return invokeClient360Controller('validate-client', requestData);
    },
    viewClient360(requestData) {
        return invokeClient360Controller('view-client-360', requestData);
    }
};

window.Client360Service = Client360Service;
window.client360Service = Client360Service;

// State management
let currentClientData = null;

// ============================================================================
// RECENT ACTIVITIES (Last 10 Recently Viewed Clients)
// ============================================================================

const CLIENT360_RECENTS_STORAGE_KEY = 'kairo.client360.recentClients.v1';
const CLIENT360_RECENTS_MAX = 10;

function loadClient360Recents() {
    try {
        const raw = window.localStorage?.getItem(CLIENT360_RECENTS_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed)
            ? parsed
                .filter(x => x && typeof x === 'object')
                .map(x => ({
                    clientId: String(x.clientId || '').trim(),
                    clientName: String(x.clientName || '').trim(),
                    viewedAt: Number(x.viewedAt) || 0
                }))
                .filter(x => x.clientId)
            : [];
    } catch {
        return [];
    }
}

function saveClient360Recents(items) {
    try {
        const payload = Array.isArray(items) ? items : [];
        window.localStorage?.setItem(CLIENT360_RECENTS_STORAGE_KEY, JSON.stringify(payload));
    } catch {
        // ignore storage errors (private mode/quota/etc.)
    }
}

function addClient360RecentClient({ clientId, clientName } = {}) {
    const id = String(clientId || '').trim();
    const name = String(clientName || '').trim();
    if (!id) return;

    const now = Date.now();
    const existing = loadClient360Recents();
    const filtered = existing.filter(x => String(x.clientId || '').trim() !== id);

    filtered.unshift({ clientId: id, clientName: name, viewedAt: now });
    const next = filtered.slice(0, CLIENT360_RECENTS_MAX);
    saveClient360Recents(next);
}

function formatClient360RecentViewedAt(ts) {
    const n = Number(ts);
    if (!Number.isFinite(n) || n <= 0) return 'Recently accessed';

    const d = new Date(n);
    if (Number.isNaN(d.getTime())) return 'Recently accessed';

    // Compact, readable timestamp.
    try {
        return d.toLocaleString(undefined, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return d.toString();
    }
}

function renderClient360RecentActivities() {
    const listEl = document.querySelector('[data-client360-recent-list]') || $('nav-client360-recent');
    if (!listEl) return;

    const recents = loadClient360Recents();
    listEl.innerHTML = '';

    if (!recents.length) {
        const empty = document.createElement('div');
        empty.className = 'sidebar-item sidebar-item--static sidebar-item--enhanced';
        empty.style.cursor = 'default';
        empty.innerHTML = `
            <div class="sidebar-item__content">
                <i class="bi bi-clock sidebar-item__icon"></i>
                <div class="sidebar-item__text">
                    <div class="sidebar-item__title">No recent clients</div>
                    <div class="sidebar-item__description">Clients you view will appear here</div>
                </div>
            </div>
        `.trim();
        listEl.appendChild(empty);
        return;
    }

    const activeId = String(currentClientData?.clientId || '').trim();

    recents.forEach((r) => {
        const item = document.createElement('div');
        item.className = 'sidebar-item sidebar-item--static sidebar-item--enhanced';
        item.style.cursor = 'pointer';
        item.dataset.clientId = r.clientId;
        item.dataset.clientName = r.clientName;
        if (activeId && activeId === r.clientId) item.classList.add('active');

        const title = r.clientId;
        const descriptionParts = [];
        if (r.clientName) descriptionParts.push(r.clientName);
        const viewed = formatClient360RecentViewedAt(r.viewedAt);
        if (viewed) descriptionParts.push(viewed);

        item.innerHTML = `
            <div class="sidebar-item__content">
                <i class="bi bi-clock sidebar-item__icon"></i>
                <div class="sidebar-item__text">
                    <div class="sidebar-item__title"></div>
                    <div class="sidebar-item__description"></div>
                </div>
            </div>
        `.trim();

        const titleEl = item.querySelector('.sidebar-item__title');
        const descEl = item.querySelector('.sidebar-item__description');
        if (titleEl) titleEl.textContent = title;
        if (descEl) descEl.textContent = descriptionParts.filter(Boolean).join(' • ') || 'Recently accessed';

        item.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            // If a submodule overlay (Statement/Address/Collateral/Guarantors/etc.) is open,
            // close it first so the new client view is immediately visible.
            try {
                const overlayEl = document.getElementById('client360Overlay');
                if (overlayEl && !overlayEl.hidden && typeof setClient360OverlayOpen === 'function') {
                    setClient360OverlayOpen(false);
                }
            } catch (err) {
                console.warn('Failed to close Client 360 overlay before recent load:', err);
            }

            // Also close image zoom if open
            try {
                const zoomEl = document.getElementById('client360ImageZoom');
                if (zoomEl && !zoomEl.hidden) {
                    zoomEl.hidden = true;
                    zoomEl.setAttribute('aria-hidden', 'true');
                }
            } catch (err) {
                console.warn('Failed to close Client 360 zoom before recent load:', err);
            }

            const clickedId = String(item.dataset.clientId || '').trim();
            const clickedName = String(item.dataset.clientName || '').trim();
            if (!clickedId) return;

            setField('clientIdSearch', clickedId);
            setField('clientNameSearch', clickedName);

            // Update active state styling immediately (in case load fails)
            listEl.querySelectorAll('.sidebar-item--static').forEach(x => x.classList.remove('active'));
            item.classList.add('active');

            // Trigger loading this client in the view.
            await handleViewClient();
        });

        listEl.appendChild(item);
    });
}

function setClient360UiState(state) {
    const mode = String(state || '').toLowerCase();
    const isLoaded = mode === 'loaded';

    const clientIdEl = $('clientIdSearch');
    const btnSearch = $('btnClientSearch');
    const btnView = $('btnViewClient');
    const btnPrint = $('btnPrint');
    const btnCancel = $('btnCancel');

    if (clientIdEl) clientIdEl.disabled = isLoaded;
    if (btnSearch) btnSearch.disabled = isLoaded;
    if (btnView) btnView.disabled = isLoaded ? true : false;

    // On initial load (or after cancel), Print and Cancel must be disabled
    if (btnPrint) btnPrint.disabled = !isLoaded;
    if (btnCancel) btnCancel.disabled = !isLoaded;
}

// Utility function
function $(id) {
    return document.getElementById(id);
}

function setField(id, value) {
    const el = $(id);
    if (!el) return;

    const v = value ?? '';
    if ('value' in el) {
        el.value = v;
        return;
    }

    el.textContent = v;
}

function showElementById(id) {
    const el = $(id);
    if (el) el.style.display = 'block';
}

function hideElementById(id) {
    const el = $(id);
    if (el) el.style.display = 'none';
}

function safeNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function parseLooseNumber(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;

    const str = String(value).trim();
    if (!str) return null;

    // Keep digits, minus and dot. Removes commas/currency symbols/text.
    const normalized = str
        .replace(/,/g, '')
        .replace(/[^0-9.-]/g, '');

    if (!normalized || normalized === '-' || normalized === '.' || normalized === '-.') return null;
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
}

function sumByCandidateKeys(rows, candidateKeys) {
    const data = Array.isArray(rows) ? rows : [];
    const keys = (candidateKeys || []).map(k => String(k));
    let total = 0;
    let hasAny = false;

    for (const row of data) {
        const obj = (row && typeof row === 'object') ? row : {};
        for (const k of keys) {
            const n = parseLooseNumber(obj?.[k]);
            if (n === null) continue;
            total += n;
            hasAny = true;
            break;
        }
    }

    return hasAny ? total : null;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(safeNumber(amount));
}

function client360Toast(message, type = 'info') {
    const normalizedType = String(type || 'info').toLowerCase();

    // Prefer centralized NotificationService (used elsewhere in the app)
    if (window.NotificationService && typeof window.NotificationService.showToast === 'function') {
        window.NotificationService.showToast(message, normalizedType, 4000);
        return;
    }

    // Next, use an app-provided global toast if present
    if (typeof window.showToast === 'function') {
        window.showToast(message, normalizedType);
        return;
    }

    // Fallback: Bootstrap 5 toast (no blocking window alerts)
    if (window.bootstrap && typeof window.bootstrap.Toast === 'function') {
        const variantMap = {
            success: 'success',
            info: 'info',
            warning: 'warning',
            warn: 'warning',
            error: 'danger',
            danger: 'danger'
        };
        const variant = variantMap[normalizedType] || 'info';

        let container = document.getElementById('client360-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'client360-toast-container';
            container.className = 'toast-container position-fixed top-0 end-0 p-3';
            container.style.zIndex = '11000';
            document.body.appendChild(container);
        }

        const toastEl = document.createElement('div');
        toastEl.className = `toast align-items-center text-bg-${variant} border-0`;
        toastEl.setAttribute('role', 'alert');
        toastEl.setAttribute('aria-live', 'assertive');
        toastEl.setAttribute('aria-atomic', 'true');
        toastEl.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${String(message ?? '')}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `.trim();

        container.appendChild(toastEl);
        const toast = new window.bootstrap.Toast(toastEl, { delay: 4000 });
        toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
        toast.show();
        return;
    }

    // Last resort: non-blocking console log
    console.log(`[${normalizedType.toUpperCase()}] ${message}`);
}

// Initialize page
document.addEventListener('DOMContentLoaded', function () {
    initializeEventListeners();
    initializeSectionToggles();
    initializeSidebarNavToggles();
    wireClient360SidebarToggle();
    initializeClient360Overlay();
    loadBranchInfo();

    // Recent Activities (sidebar)
    renderClient360RecentActivities();

    // Initial state: Print/Cancel disabled until a client loads successfully
    setClient360UiState('initial');

    // Start with optional sections hidden (shown only when data exists)
    hideElementById('depositsSection');
    hideElementById('loansSection');
    hideElementById('blockedDetailsSection');
    hideElementById('groupMemberSection');
    hideElementById('standingInstructionsSection');
    hideElementById('otherAccountsSection');
});

// ============================================================================
// IN-PAGE OVERLAY (Statement View inside Client 360)
// ============================================================================

let __client360OverlayCurrentUrl = '';

function getClient360OverlayEls() {
    return {
        overlay: document.getElementById('client360Overlay'),
        iframe: document.getElementById('client360OverlayFrame'),
        titleEl: document.getElementById('client360OverlayTitle'),
        loadingEl: document.getElementById('client360OverlayLoading'),
        closeBtn: document.getElementById('client360OverlayClose'),
        popoutBtn: document.getElementById('client360OverlayPopout'),
        mainContainer: document.querySelector('.main-container')
    };
}

function updateClient360OverlayLayout() {
    const { overlay, mainContainer } = getClient360OverlayEls();
    if (!overlay || !mainContainer) return;

    const mainRect = mainContainer.getBoundingClientRect();
    const formContent = document.querySelector('.form-content');
    const actionPanel = document.querySelector('.action-panel');

    const leftCandidates = [formContent, actionPanel]
        .filter(Boolean)
        .map(el => el.getBoundingClientRect().left);

    // Overlay begins where the main content begins (i.e., where the sidebar ends)
    const leftPx = leftCandidates.length
        ? Math.max(0, Math.min(...leftCandidates) - mainRect.left)
        : 0;

    overlay.style.setProperty('--client360-overlay-left', `${leftPx}px`);
}

function setClient360OverlayOpen(isOpen) {
    const { overlay, iframe, loadingEl } = getClient360OverlayEls();
    if (!overlay || !iframe) return;

    overlay.hidden = !isOpen;
    overlay.setAttribute('aria-hidden', isOpen ? 'false' : 'true');

    if (!isOpen) {
        if (loadingEl) loadingEl.hidden = true;
        iframe.onload = null;
        iframe.src = 'about:blank';
        __client360OverlayCurrentUrl = '';
    }
}

function openClient360Overlay(url, { title = 'Details', loadingText = 'Loading...' } = {}) {
    const { overlay, iframe, titleEl, loadingEl } = getClient360OverlayEls();

    if (!overlay || !iframe) {
        // Fallback: keep legacy behavior if overlay markup isn't present
        window.open(String(url || ''), '_blank', 'width=1200,height=800,resizable=yes,scrollbars=yes');
        return;
    }

    updateClient360OverlayLayout();
    setClient360OverlayOpen(true);

    if (titleEl) titleEl.textContent = String(title || 'Details');
    if (loadingEl) {
        const textNode = loadingEl.querySelector('div:last-child');
        if (textNode) textNode.textContent = String(loadingText || 'Loading...');
        loadingEl.hidden = false;
    }

    iframe.onload = () => {
        if (loadingEl) loadingEl.hidden = true;
    };

    // Cache-bust to ensure fresh load inside iframe
    const u = new URL(String(url || ''), window.location.href);
    u.searchParams.set('_', String(Date.now()));
    __client360OverlayCurrentUrl = u.toString();
    iframe.src = __client360OverlayCurrentUrl;
}

function initializeClient360Overlay() {
    const { overlay, closeBtn, popoutBtn } = getClient360OverlayEls();
    if (!overlay) return;

    updateClient360OverlayLayout();

    // Close handlers
    if (closeBtn) closeBtn.addEventListener('click', () => setClient360OverlayOpen(false));
    overlay.querySelectorAll('[data-client360-overlay-close]').forEach((el) => {
        el.addEventListener('click', () => setClient360OverlayOpen(false));
    });

    // Popout (optional)
    if (popoutBtn) {
        popoutBtn.addEventListener('click', () => {
            if (!__client360OverlayCurrentUrl) return;
            window.open(__client360OverlayCurrentUrl, '_blank', 'noopener');
        });
    }

    // ESC closes overlay
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (overlay.hidden) return;
        setClient360OverlayOpen(false);
    });

    // Keep left boundary aligned to sidebar end on resize
    window.addEventListener('resize', () => {
        if (!overlay.hidden) updateClient360OverlayLayout();
    });

    // Allow child pages (e.g., statement-view) to request overlay close
    window.addEventListener('message', (event) => {
        const data = event?.data;
        if (!data) return;

        // Some pages post legacy string messages
        if (
            data === 'close-loan-collaterals' ||
            data === 'close-account-collaterals'
        ) {
            setClient360OverlayOpen(false);
            return;
        }

        // Statement View partial uses these messages in Account Maintenance overlay
        if (
            data.action === 'submoduleClosed' ||
            data.type === 'accountMaintenanceChildClose' ||
            data.type === 'CLOSE_DATAENTRY'
        ) {
            setClient360OverlayOpen(false);
        }
    });
}

function seedClient360ChildState() {
    const ctx = getContext();
    const clientId = currentClientData?.clientId || $('clientIdSearch')?.value?.trim() || '';

    window.Client360State = {
     Source: 'Client360',
        ClientID: clientId,
      ModuleID: MODULEID_CLIENT360,
  OurBranchID: ctx?.OurBranchID || '',
        OperatorID: ctx?.OperatorID || '',
        BankID: ctx?.BankID || '00'
    };
}

function openClientAddressOverlay() {
    const clientId = currentClientData?.clientId || $('clientIdSearch')?.value?.trim() || '';
    if (!clientId) {
 client360Toast('Please load a Client first.', 'warning');
        return;
    }

    try {
 seedClient360ChildState();
        const url = new URL('../customer-management/DataEntry/client-address.html', window.location.href);
        url.searchParams.set('Source', 'Client360');
     url.searchParams.set('ClientID', String(clientId));
        url.searchParams.set('ModuleID', String(MODULEID_CLIENT360));

   openClient360Overlay(url.toString(), {
      title: `Client Address - ${String(clientId)}`,
            loadingText: 'Loading address...'
        });
    } catch (e) {
        console.error('Failed to open client address overlay:', e);
        client360Toast('Failed to open Address: ' + (e?.message || e), 'error');
    }
}

function isAddressQuickLink(link) {
    const rawModuleId = link?.raw?.ModuleID ?? link?.raw?.ModuleId ?? link?.raw?.moduleId ?? link?.raw?.moduleID;
    const moduleIdNum = rawModuleId === null || rawModuleId === undefined || String(rawModuleId).trim() === ''
        ? null
        : Number(rawModuleId);
    if (moduleIdNum === 1010) return true;

    const title = String(link?.title || link?.raw?.MenuDescription || link?.raw?.label || '').trim().toLowerCase();
    const moduleKey = String(link?.moduleKey || '').trim().toLowerCase();
    if (!title && !moduleKey) return false;
    if (title.includes('address')) return true;
    if (moduleKey.includes('address')) return true;
    return false;
}

function initializeSidebarNavToggles() {
    // Behave like Account Maintenance: accordion-style sections (opening one closes others).
    const sections = Array.from(document.querySelectorAll('[data-nav-section].nav-section--card'));

    const setExpanded = (sectionEl, isExpanded) => {
        const arrowBtn = sectionEl?.querySelector?.('.nav-arrow');
        const itemsEl = sectionEl?.querySelector?.('.nav-items--card');
        sectionEl.classList.toggle('expanded', Boolean(isExpanded));
        if (itemsEl) itemsEl.classList.toggle('is-visible', Boolean(isExpanded));
        if (arrowBtn) arrowBtn.setAttribute('aria-expanded', String(Boolean(isExpanded)));
    };

    // Initialize state from markup
    sections.forEach((sectionEl) => {
        const arrowBtn = sectionEl.querySelector('.nav-arrow');
        const initialExpanded = String(arrowBtn?.getAttribute('aria-expanded') || 'false').toLowerCase() === 'true';
        setExpanded(sectionEl, initialExpanded);
    });

    const toggleSection = (sectionEl) => {
        const sidebar = document.getElementById('client360Sidebar');
        if (sidebar?.classList.contains('collapsed')) return; // no accordion toggling while collapsed

        const isExpanded = sectionEl.classList.contains('expanded');
        sections.forEach(s => setExpanded(s, false));
        setExpanded(sectionEl, !isExpanded);
    };

    sections.forEach((sectionEl) => {
        const headerEl = sectionEl.querySelector('.nav-header');
        const arrowBtn = sectionEl.querySelector('.nav-arrow');

        if (headerEl) {
            headerEl.addEventListener('click', (e) => {
                e.preventDefault();
                toggleSection(sectionEl);
            });
        }

        if (arrowBtn) {
            arrowBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleSection(sectionEl);
            });
        }
    });
}

function wireClient360SidebarToggle() {
    const sidebar = document.getElementById('client360Sidebar');
    const toggle = document.getElementById('client360SidebarToggle');
    const mainContainer = document.querySelector('.main-container');
    if (!sidebar || !toggle) return;

    const restoreExpandedState = () => {
        document.querySelectorAll('[data-nav-section].nav-section--card').forEach((sectionEl) => {
            const arrowBtn = sectionEl.querySelector('.nav-arrow');
            const itemsEl = sectionEl.querySelector('.nav-items--card');
            const expanded = String(arrowBtn?.getAttribute('aria-expanded') || 'false').toLowerCase() === 'true';
            sectionEl.classList.toggle('expanded', expanded);
            if (itemsEl) itemsEl.classList.toggle('is-visible', expanded);
        });
    };

    toggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const isCollapsed = sidebar.classList.contains('collapsed');

        if (isCollapsed) {
            // Expanding
            sidebar.classList.remove('collapsed');
            if (mainContainer) mainContainer.classList.remove('sidebar-collapsed');
            toggle.setAttribute('aria-expanded', 'true');
            restoreExpandedState();
        } else {
            // Collapsing
            sidebar.classList.add('collapsed');
            if (mainContainer) mainContainer.classList.add('sidebar-collapsed');
            toggle.setAttribute('aria-expanded', 'false');

            // Force all nav-items visible so icon-only list is usable.
            document.querySelectorAll('.nav-items--card').forEach((itemsEl) => {
                itemsEl.classList.add('is-visible');
            });
        }
    });
}

function isEmptyTag(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
}

function normalizeToArray(tag) {
    if (isEmptyTag(tag)) return [];
    if (Array.isArray(tag)) return tag;
    if (typeof tag === 'object') {
        if (Array.isArray(tag.Details)) return tag.Details;
        if (Array.isArray(tag.Details01)) return tag.Details01;

        const firstArray = Object.values(tag).find(Array.isArray);
        if (firstArray) return firstArray;

        return [tag];
    }
    return [];
}

function getOldApiStatus(payload) {
    const candidates = [];
    if (payload) candidates.push(payload);
    if (Array.isArray(payload?.Details) && payload.Details.length) candidates.push(payload.Details[0]);
    if (Array.isArray(payload?.details) && payload.details.length) candidates.push(payload.details[0]);
    if (Array.isArray(payload?.Details01) && payload.Details01.length) candidates.push(payload.Details01[0]);

    for (const candidate of candidates) {
        const code = candidate?.ResponseCode ?? candidate?.responseCode ?? candidate?.Status ?? candidate?.status ?? candidate?.code;
        if (code === undefined || code === null) continue;
        const normalized = String(code).trim();
        const ok = normalized === '' || normalized === '00' || normalized === '0' || normalized.toLowerCase() === 'ok' || normalized.toLowerCase() === 'success';
        const message = candidate?.ResponseMessage ?? candidate?.responseMessage ?? candidate?.Message ?? candidate?.message ?? '';
        return { ok, code: normalized, message };
    }

    return { ok: true, code: '', message: '' };
}

function clearClient360DynamicUI() {
    const idsToClear = [
        'accountsContainer',
        'depositsContent',
        'loansContent',
        'blockedDetailsContent',
        'groupMemberContent',
        'standingInstructionsContent',
        'otherAccountsContent',
        'quickLinksContainer'
    ];
    idsToClear.forEach(id => {
        const el = $(id);
        if (el) el.innerHTML = '';
    });

    ['depositsSection', 'loansSection', 'blockedDetailsSection', 'groupMemberSection', 'standingInstructionsSection', 'otherAccountsSection']
        .forEach(id => hideElementById(id));
}

function renderTable(containerEl, rows, columns, emptyText = 'No records found') {
    if (!containerEl) return;

    const data = Array.isArray(rows) ? rows : [];
    if (!data.length) {
        if (Array.isArray(payload?.Details) && payload.Details.length) candidates.push(payload.Details[0]);
        containerEl.innerHTML = `<div style="padding: 12px; text-align: center; color: #5A6C7D; font-size: 12px;">${emptyText}</div>`;
        return;
    }

    const cols = Array.isArray(columns) && columns.length
        ? columns
        : Object.keys(data[0] || {}).map(k => ({ key: k, label: k }));

    let html = '<div class="table-responsive"><table class="table table-sm table-striped">';
    html += '<thead><tr>';
    cols.forEach(c => { html += `<th>${c.label}</th>`; });
    html += '</tr></thead><tbody>';

    data.forEach(r => {
        html += '<tr>';
        cols.forEach(c => {
            const keys = Object.keys(r || {});
            const actualKey = keys.find(k => k.toLowerCase() === String(c.key).toLowerCase());
            const v = actualKey ? r[actualKey] : '';
            html += `<td>${v ?? ''}</td>`;
        });
        html += '</tr>';
    });

    html += '</tbody></table></div>';
    containerEl.innerHTML = html;
}

function prettifyKeyLabel(key) {
    return String(key || '')
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .trim();
}

function formatCardValue(key, value) {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'string') {
        const v = value.trim();
        return v === '' ? '-' : v;
    }
    if (typeof value === 'number') {
        const k = String(key || '');
        const looksMoney = /(balance|amount|lien|clear|available|credit|debit)/i.test(k);
        return looksMoney ? formatCurrency(value) : String(value);
    }
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.length ? `[${value.length} items]` : '-';
    if (typeof value === 'object') {
        const keys = Object.keys(value);
        return keys.length ? `{${keys.slice(0, 4).join(', ')}${keys.length > 4 ? ', …' : ''}}` : '-';
    }
    return String(value);
}

function renderCards(containerEl, rows, {
    emptyText = 'No records found',
    titleKeys = [],
    badgeKeys = [],
    maxFields = 10,
    excludeKeys = [],
    actions = null,
    primaryAction = null,
    secondaryAction = null
} = {}) {
    if (!containerEl) return;

    const data = Array.isArray(rows) ? rows : [];
    containerEl.innerHTML = '';

    // Make the section look like a proper panel
    if (!containerEl.classList.contains('client360-products')) {
        containerEl.classList.add('client360-products');
    }

    if (!data.length) {
        containerEl.innerHTML = `<div style="padding: 12px; text-align: center; color: #5A6C7D; font-size: 12px;">${emptyText}</div>`;
        return;
    }

    const grid = document.createElement('div');
    grid.className = 'client360-products-grid';
    containerEl.appendChild(grid);

    const excluded = new Set((excludeKeys || []).map(k => String(k).toLowerCase()));

    const pickFirstValue = (obj, keys) => {
        for (const k of keys || []) {
            const v = obj?.[k];
            if (v !== null && v !== undefined && String(v).trim?.() !== '') return { key: k, value: v };
        }
        return null;
    };

    data.forEach((row, idx) => {
        const card = document.createElement('div');
        card.className = 'client360-product-card';

        const header = document.createElement('div');
        header.className = 'client360-product-card__header';

        const left = document.createElement('div');
        const titleEl = document.createElement('div');
        titleEl.className = 'client360-product-card__title';

        const rowObj = (row && typeof row === 'object') ? row : { Value: row };
        const titlePick = pickFirstValue(rowObj, titleKeys);
        titleEl.textContent = titlePick ? String(titlePick.value) : `Record ${idx + 1}`;

        const subtitleEl = document.createElement('div');
        subtitleEl.className = 'client360-product-card__subtitle';
        subtitleEl.textContent = titlePick?.key ? `${prettifyKeyLabel(titlePick.key)}: ${formatCardValue(titlePick.key, titlePick.value)}` : '';
        left.appendChild(titleEl);
        if (subtitleEl.textContent && subtitleEl.textContent !== titleEl.textContent) left.appendChild(subtitleEl);

        const badgeEl = document.createElement('div');
        badgeEl.className = 'client360-product-card__badge';
        const badgePick = pickFirstValue(rowObj, badgeKeys);
        badgeEl.textContent = badgePick ? String(badgePick.value) : '';
        if (!badgeEl.textContent) badgeEl.style.display = 'none';

        header.appendChild(left);
        header.appendChild(badgeEl);
        card.appendChild(header);

        const kv = document.createElement('div');
        kv.className = 'client360-product-kv';

        const keys = Object.keys(rowObj || {})
            .filter(k => !excluded.has(String(k).toLowerCase()));

        let rendered = 0;
        for (const k of keys) {
            if (rendered >= maxFields) break;
            const keyLabel = prettifyKeyLabel(k);
            const val = formatCardValue(k, rowObj[k]);

            // Avoid repeating the title key in the list unless it adds value
            if (titlePick?.key && String(k).toLowerCase() === String(titlePick.key).toLowerCase()) {
                continue;
            }

            const kEl = document.createElement('div');
            kEl.className = 'client360-product-kv__k';
            kEl.textContent = keyLabel || String(k);

            const vEl = document.createElement('div');
            vEl.className = 'client360-product-kv__v';
            vEl.textContent = val;

            kv.appendChild(kEl);
            kv.appendChild(vEl);
            rendered++;
        }

        card.appendChild(kv);

        const actionsToRender = (Array.isArray(actions) ? actions : [primaryAction, secondaryAction])
            .filter(a => a && typeof a === 'object');

        if (actionsToRender.length) {
            const actionWrap = document.createElement('div');
            actionWrap.className = actionsToRender.length > 1
                ? (actionsToRender.length <= 2
                    ? 'client360-product-actions d-flex flex-nowrap gap-2'
                    : 'client360-product-actions d-flex flex-wrap gap-2')
                : 'client360-product-actions';

            actionsToRender.forEach((actionDef) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = actionDef?.buttonClassName || (actionsToRender.length > 1
                    ? 'btn btn-sm btn-primary'
                    : 'btn btn-sm btn-primary w-100');
                btn.textContent = actionDef?.label || 'view';
                if (actionsToRender.length > 1) {
                    btn.classList.add('flex-fill');
                    // Avoid forcing full-width buttons when we have multiple actions.
                    btn.classList.remove('w-100');
                }

                const isEnabled = (typeof actionDef.isEnabled === 'function')
                    ? !!actionDef.isEnabled(rowObj)
                    : true;
                btn.disabled = !isEnabled;

                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (btn.disabled) return;
                    if (typeof actionDef.onClick === 'function') {
                        actionDef.onClick(rowObj);
                    }
                });

                actionWrap.appendChild(btn);
            });

            card.appendChild(actionWrap);
        }

        grid.appendChild(card);
    });
}

function extractAccountIdFromRow(rowObj) {
    const candidates = [
        rowObj?.AccountID,
        rowObj?.AccountId,
        rowObj?.accountId,
        rowObj?.accountID,
        rowObj?.AcctID,
        rowObj?.AcctId
    ];
    const id = candidates.find(v => v !== null && v !== undefined && String(v).trim() !== '');
    return id ? String(id).trim() : '';
}

function extractBranchIdFromRow(rowObj) {
    const candidates = [
        rowObj?.BranchID,
        rowObj?.BranchId,
        rowObj?.branchId,
        rowObj?.OurBranchID,
        rowObj?.OurBranchId,
        rowObj?.ourBranchId,
        rowObj?.Branch,
        rowObj?.branch
    ];
    const id = candidates.find(v => v !== null && v !== undefined && String(v).trim() !== '');
    return id ? String(id).trim() : '';
}

function extractLoanSeriesFromRow(rowObj) {
    const candidates = [
        rowObj?.LoanSeries,
        rowObj?.Loan_Series,
        rowObj?.LoanSeriesNo,
        rowObj?.LoanSeriesID,
        rowObj?.LoanSeriesId,
        rowObj?.loanSeries,
        rowObj?.loanSeriesNo
    ];
    const series = candidates.find(v => v !== null && v !== undefined && String(v).trim() !== '');
    return series ? String(series).trim() : '';
}

function isLikelyLoanRow(rowObj) {
    if (!rowObj || typeof rowObj !== 'object') return false;

    // Explicit loan identifiers
    const explicitLoanKeys = [
        rowObj?.LoanID,
        rowObj?.LoanId,
        rowObj?.loanId,
        rowObj?.loanID,
        rowObj?.LoanType,
        rowObj?.loanType
    ];
    if (explicitLoanKeys.some(v => v !== null && v !== undefined && String(v).trim() !== '')) return true;

    // Type/category hints
    const typeHint = String(
        rowObj?.ProductTypeID ??
        rowObj?.ProductTypeId ??
        rowObj?.productTypeId ??
        rowObj?.Type ??
        rowObj?.type ??
        rowObj?.AccountType ??
        rowObj?.accountType ??
        rowObj?.Category ??
        rowObj?.category ??
        ''
    ).trim().toLowerCase();

    if (typeHint.includes('loan') || typeHint === 'loan' || typeHint === 'ln') return true;

    // Name/title hints
    const nameHint = String(
        rowObj?.Product ??
        rowObj?.product ??
        rowObj?.AccountName ??
        rowObj?.accountName ??
        rowObj?.ProductName ??
        rowObj?.productName ??
        rowObj?.LoanType ??
        rowObj?.loanType ??
        ''
    ).trim().toLowerCase();

    return nameHint.includes('loan');
}

function getContext() {
    const session = window.AuthService?.getSession?.() || {};
    return {
        OperatorID:
            session.operatorID ||
            session.operatorId ||
            session.OperatorID ||
            window.sessionStorage?.getItem?.('operatorID') ||
            window.Environment?.OperatorID ||
            'web_portal',
        OurBranchID:
            session.branchID ||
            session.branchId ||
            session.OurBranchID ||
            window.sessionStorage?.getItem?.('branchID') ||
            window.Environment?.OurBranchID ||
            '',
        BankID:
            session.bankID ||
            session.bankId ||
            session.BankID ||
            session.BankId ||
            window.sessionStorage?.getItem?.('BankID') ||
            window.localStorage?.getItem?.('BankID') ||
            window.Environment?.BankID ||
            window.Environment?.bankID ||
            '00'
    };
}

let __clientIdValidateTimer = null;
let __lastClientIdValidated = '';
let __clientIdValidateSeq = 0;

function setClientLookupName(name) {
    setField('clientNameSearch', name || '');
}

function setClientLookupId(id) {
    setField('clientIdSearch', id || '');
}

function setViewEnabled(enabled) {
    const btnViewClient = $('btnViewClient');
    if (btnViewClient) btnViewClient.disabled = !enabled;
}

function clearClientLookupFields({ keepFocus = true } = {}) {
    setClientLookupId('');
    setClientLookupName('');
    setViewEnabled(false);
    if (keepFocus) $('clientIdSearch')?.focus?.();
}

function scheduleValidateClientId() {
    if (__clientIdValidateTimer) window.clearTimeout(__clientIdValidateTimer);
    __clientIdValidateTimer = window.setTimeout(() => {
        validateClientIdFromInput({ silentOnBlank: true });
    }, 350);
}

async function validateClientIdFromInput({ silentOnBlank = false } = {}) {
    const clientId = $('clientIdSearch')?.value?.trim() || '';
    if (!clientId) {
        setClientLookupName('');
        setViewEnabled(false);
        if (!silentOnBlank) client360Toast('Client ID cannot be blank', 'warning');
        return { ok: false, name: '' };
    }

    // Avoid re-validating the same value
    if (__lastClientIdValidated === clientId && ($('clientNameSearch')?.value || '').trim() !== '') {
        setViewEnabled(true);
        return { ok: true, name: $('clientNameSearch')?.value?.trim() || '' };
    }

    if (!Client360Service || typeof Client360Service.validateClient360 !== 'function') {
        client360Toast('Client360Service.validateClient360 is not available.', 'error');
        return { ok: false, name: '' };
    }

    const ctx = getContext();
    const seq = ++__clientIdValidateSeq;

    // Clear name while validating to avoid stale display
    setClientLookupName('');
    setViewEnabled(false);

    try {
        const resp = await Client360Service.validateClient360({
            OurBranchID: ctx.OurBranchID,
            ControlTypeID: 'ClientID',
            ID: clientId,
            BankID: ctx.BankID,
            TypeID: '',
            AdvanceFilter: '',
            LanguageID: 'en'
        });

        // Ignore out-of-order responses
        if (seq !== __clientIdValidateSeq) return { ok: false, name: '' };
        console.log(resp)
        const payload = resp?.raw ?? resp?.data ?? resp;
        const status = getOldApiStatus(payload);
        if (!status.ok) {
            client360Toast(status.message || 'Client validation failed.', 'error');
            return { ok: false, name: '' };
        }

        const rawCandidate =
            payload?.Details ??
            payload?.details ??
            payload?.data ??
            payload;

        // `rawCandidate` might be an array (common for p_GetIDDescription via CoreApi.normalizeResponse)
        const list = Array.isArray(rawCandidate)
            ? rawCandidate
            : normalizeToArray(rawCandidate?.Details || rawCandidate?.Details01 || rawCandidate?.details || rawCandidate);

        const name = (list?.[0]?.Name ?? list?.[0]?.name ?? '').toString().trim();

        if (name) {
            __lastClientIdValidated = clientId;
            setClientLookupName(name);
            setViewEnabled(true);
            return { ok: true, name };
        }

        client360Toast('Invalid Client ID', 'warning');
        clearClientLookupFields({ keepFocus: true });
        return { ok: false, name: '' };
    } catch (err) {
        console.error('Client ID validation failed:', err);
        client360Toast('Client validation failed.', 'error');
        return { ok: false, name: '' };
    }
}

function initializeEventListeners() {
    // View Client button
    const btnViewClient = $('btnViewClient');
    if (btnViewClient) {
        btnViewClient.addEventListener('click', handleViewClient);
    }

    // Client Search button
    const btnClientSearch = $('btnClientSearch');
    if (btnClientSearch) {
        btnClientSearch.addEventListener('click', handleClientSearch);
    }

    // Print button
    const btnPrint = $('btnPrint');
    if (btnPrint) {
        btnPrint.addEventListener('click', handlePrint);
    }

    // Cancel button
    const btnCancel = $('btnCancel');
    if (btnCancel) {
        btnCancel.addEventListener('click', handleCancel);
    }

    // Client ID search - Enter key
    const clientIdSearch = $('clientIdSearch');
    if (clientIdSearch) {
        // Validate while typing/pasting
        clientIdSearch.addEventListener('input', () => {
            // User is editing ID: clear any previously validated name
            setClientLookupName('');
            setViewEnabled(false);
            scheduleValidateClientId();
        });

        // Validate on blur (immediate)
        clientIdSearch.addEventListener('blur', () => {
            validateClientIdFromInput({ silentOnBlank: true });
        });

        // Enter: validate then load
        // F2: Open search modal
        clientIdSearch.addEventListener('keydown', async (e) => {
            if (e.key === 'F2') {
                e.preventDefault();
                await handleClientSearch();
            } else if (e.key !== 'Enter') {
                return;
            } else {
                e.preventDefault();
                const res = await validateClientIdFromInput({ silentOnBlank: false });
                if (res.ok) {
                    handleViewClient();
                }
            }
        });
    }
}

function initializeSectionToggles() {
    document.querySelectorAll('[data-section-toggle]').forEach(headerEl => {
        headerEl.addEventListener('click', (e) => {
            // Allow clicking anywhere on the header to toggle
            e.preventDefault();

            const sectionEl = headerEl.closest('.form-section');
            if (!sectionEl) return;
            const contentEl = sectionEl.querySelector('[data-section-content]');
            if (!contentEl) return;

            const toggleBtn = headerEl.querySelector('.section-toggle-btn');
            const isHidden = contentEl.hasAttribute('hidden');

            if (isHidden) {
                contentEl.removeAttribute('hidden');
            } else {
                contentEl.setAttribute('hidden', '');
            }

            if (toggleBtn) {
                const expanded = !contentEl.hasAttribute('hidden');
                toggleBtn.setAttribute('aria-expanded', String(expanded));

                const icon = toggleBtn.querySelector('i');
                if (icon) {
                    icon.className = expanded ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
                }
            }
        });
    });
}

function loadBranchInfo() {
    // Branch info is no longer needed in the UI
    // Client ID will be the primary search field
}

async function handleClientSearch() {
    // Check if SearchModal is available
    if (!window.SearchModal) {
        client360Toast('Search modal is not available (searchModal.js not loaded).', 'error');
        return;
    }

    const appCore = getAppCore();
    if (!appCore) {
        client360Toast('AppCore is not available.', 'error');
        return;
    }

    try {
        // Get current input values to pre-fill search criteria
        const currentClientId = $('clientIdSearch')?.value?.trim() || '';
        const currentClientName = $('clientNameSearch')?.value?.trim() || '';

        // Build initial search key if values are present
        let initialSearchKey = '';
        if (currentClientId) {
            initialSearchKey += `ClientID LIKE '%${currentClientId}%'`;
        }
        if (currentClientName) {
            if (initialSearchKey) initialSearchKey += ' AND ';
            initialSearchKey += `Name LIKE '%${currentClientName}%'`;
        }

        // Initialize the new SearchModal
        const searchModal = new window.SearchModal(appCore);

        // Open the search modal
        const selectedRecord = await searchModal.open({
            tableID: 'ClientID',
            moduleID: MODULEID_CLIENT360,
            whereStmt: '',
            advFilterString: '',
            searchKey: initialSearchKey,
            onSelect: (record) => {
                console.log('[Client360] Client selected:', record);

                // Extract client ID and name from record
                const id = record?.ClientID ?? record?.clientId ?? '';
                const name = record?.Name ?? record?.ClientName ?? record?.clientName ?? '';

                // Populate the search fields
                setField('clientIdSearch', id);
                setField('clientNameSearch', name);
                console.log(record);
                // Enable View button
                const btnViewClient = $('btnViewClient');
                if (btnViewClient) btnViewClient.disabled = false;

                // Show success message
                client360Toast(`Client ${id} selected successfully`, 'success');

                // Optional: auto-load once selected
                if (id) {
                    setTimeout(() => handleViewClient(), 100);
                }
            }
        });

        if (selectedRecord) {
            console.log('[Client360] Modal closed with selection:', selectedRecord);
        } else {
            console.log('[Client360] Modal closed without selection');
        }
    } catch (error) {
        console.error('[Client360] Search modal error:', error);
        client360Toast('Failed to open client search: ' + error.message, 'error');
    }
}

async function handleViewClient() {
    const clientId = $('clientIdSearch')?.value?.trim();
    let clientName = $('clientNameSearch')?.value?.trim();

    if (!clientId) {
        client360Toast('Client ID cannot be blank', 'warning');
        $('clientIdSearch')?.focus();
        return;
    }

    // Always validate on View (covers: user typed ID, pasted ID, or edited after lookup)
    // validateClientIdFromInput() is cached to avoid unnecessary server calls.
    if (!clientName) {
        const res = await validateClientIdFromInput({ silentOnBlank: false });
        if (!res.ok) return;
        clientName = res.name;
    }
    if (!Client360Service || typeof Client360Service.viewClient360 !== 'function') {
        client360Toast('Client360Service.viewClient360 is not available.', 'error');
        return;
    }

    const ctx = getContext();

    try {
        clearClient360DynamicUI();
        client360Toast('Loading client 360...', 'info');

        const resp = await Client360Service.viewClient360({
            OurBranchID: ctx.OurBranchID,
            ClientID: clientId,
            OperatorID: ctx.OperatorID
        });
        console.log(resp);
        const payload = resp?.raw ?? resp?.data ?? resp;
        const status = getOldApiStatus(payload);
        if (!status.ok) {
            client360Toast(status.message || 'Failed to load client 360', 'error');
            return;
        }

        const detailsNode = payload?.Details01?.[0] || payload?.Details?.[0] || payload?.Details || {};
        const member360 = detailsNode?.Member360 || detailsNode || null;
        // Some responses return QuickLinks as a sibling tag next to Member360.
        const quickLinksFromNode = detailsNode?.QuickLinks ?? detailsNode?.Quicklinks ?? detailsNode?.QuickLink ?? null;

        if (!member360) {
            client360Toast('No Member360 data returned.', 'warning');
            return;
        }

        currentClientData = mapMember360ToViewModel(member360, clientId, clientName);
        // Prefer Member360.QuickLinks, but fall back to Details01/Details QuickLinks when present.
        const mappedHasQuickLinks = normalizeToArray(currentClientData?.quickLinks).length > 0;
        const nodeHasQuickLinks = normalizeToArray(quickLinksFromNode).length > 0;
        if (!mappedHasQuickLinks && nodeHasQuickLinks) {
            currentClientData.quickLinks = quickLinksFromNode;
        }
        displayClientData(currentClientData);

        // Update Recent Activities (last 10 viewed clients)
        addClient360RecentClient({ clientId, clientName });
        renderClient360RecentActivities();

        showElementById('client360Container');
        setClient360UiState('loaded');
        client360Toast('Client 360 loaded successfully', 'success');
    } catch (error) {
        console.error('Error loading client 360:', error);
        client360Toast('Error loading client 360: ' + (error?.message || error), 'error');
    }
}

function mapMember360ToViewModel(member360, clientId, clientName) {
    const member = Array.isArray(member360?.MemberDetails) ? member360.MemberDetails[0] : null;
    const tanRaw = member360?.TanAccountDetails;
    // Backward compatible: some payloads treat TanAccountDetails as meta (Branch/TanStatus), others as the savings accounts list.
    const tanMeta = (!Array.isArray(tanRaw) && tanRaw && typeof tanRaw === 'object') ? tanRaw : {};
    const tanAccounts = normalizeToArray(tanRaw);

    const mappedTanAccounts = tanAccounts
        .map(a => ({
            accountId: a?.AccountID ?? a?.accountId ?? '',
            accountName: a?.Product ?? a?.AccountName ?? a?.accountName ?? '',
            branchId: a?.BranchID ?? a?.BranchId ?? a?.OurBranchID ?? a?.OurBranchId ?? a?.branchId ?? null,
            balance: a?.AvailableBalance ?? a?.ClearBalance ?? a?.Balance ?? a?.balance ?? 0,
            clearBalance: a?.ClearBalance ?? null,
            availableBalance: a?.AvailableBalance ?? null,
            lien: a?.Lien ?? null,
            productTypeId: a?.ProductTypeID ?? a?.ProductTypeId ?? a?.productTypeId ?? null
        }))
        .filter(a => a.accountId || a.accountName);

    const accountsBalance = mappedTanAccounts.reduce((sum, a) => sum + safeNumber(a.balance), 0);

    const normalizeImageSrc = (value) => {
        const v = (value ?? '').toString().trim();
        if (!v) return null;
        if (/^data:/i.test(v)) return v;
        if (/^https?:\/\//i.test(v)) return v;
        // Heuristic: if it looks like base64, prefix for browser rendering
        if (/^[a-z0-9+/\r\n]+=*$/i.test(v) && v.length > 50) {
            return `data:image/jpeg;base64,${v}`;
        }
        return v;
    };

    return {
        clientId,
        clientName: member?.Name || clientName || '',
        identificationNumber: member?.ID || '-',
        identificationType: member?.IDType || '-',
        payrollNumber: '-',
        phoneNumber: member?.Mobile || member?.Phone1 || member?.Phone2 || '-',
        memberClass: '-',
        age: member?.Age ?? '-',
        clientStatus: member?.MemberStatus || '-',
        branch: tanMeta?.Branch || '-',
        tanStatus: tanMeta?.TanStatus || '-',
        loanStatus: tanMeta?.LoanStatus || '-',
        employer: member?.EmployerName || '-',
        remarks: '-',
        photo: normalizeImageSrc(member?.Photo),
        signature: normalizeImageSrc(member?.Sign),

        // Treat TanAccountDetails as Savings/Main Products when it comes as a list
        accounts: mappedTanAccounts,
        accountsBalance,

        // Tags (may be object/array)
        deposits: member360?.Deposits ?? [],
        depositsBalance: null,
        loans: member360?.Loans ?? [],
        loansBalance: null,
        blockedDetails: [],
        groupMember: member360?.groups ?? [],
        standingInstructions: member360?.SIDetails ?? [],
        otherAccounts: member360?.OtherAccounts ?? [],
        quickLinks:
            member360?.QuickLinks ??
            member360?.Quicklinks ??
            member360?.QuickLink ??
            []
    };
}

// Legacy mock (kept for development/testing)
async function fetchClientData(clientId) {
    // This is mock data based on the screenshot

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
        success: true,
        data: {
            clientId: clientId,
            clientName: 'LUCKMORE MAKIWA',
            identificationNumber: '11112963017',
            identificationType: 'NATIONAL ID',
            payrollNumber: '090362558',
            phoneNumber: '+254777787873',
            memberClass: 'CLASS A',
            age: '57',
            clientStatus: 'ACTIVE',
            branch: 'KERICHO',
            tanStatus: 'ACTIVE',
            loanStatus: 'NORMAL',
            employer: 'TSC',
            remarks: 'Member to Provide Workstation\nMember to Provide EMAIL Address',

            // Photo and Signature (base64 or URL)
            photo: null,
            signature: null,

            // Accounts data
            accounts: [
                { accountId: 'ACC001', accountName: 'Savings Account', balance: 1055.20, status: 'ACTIVE' }
            ],
            accountsBalance: 1055.20,

            // Deposits data
            deposits: [
                { accountId: 'DEP001', accountName: 'Fixed Deposit', balance: 474621.52, maturityDate: '2026-12-31', status: 'ACTIVE' }
            ],
            depositsBalance: 474621.52,

            // Loans data
            loans: [
                { loanId: 'LOAN001', loanType: 'Personal Loan', balance: -36000.00, status: 'ACTIVE', dueDate: '2026-06-30' }
            ],

            loansBalance: -36000.00,

            // Optional sections (will only show if present)
            blockedDetails: [],
            groupMember: [],
            standingInstructions: [],

            // Quick Links from API response
            quickLinks: [
                { id: 1, label: 'Account Signatories', action: 'viewSignatories' },
                { id: 2, label: 'Activate Windows', action: 'activateWindows' }
            ]
        }
    };
}

function displayClientData(data) {
    if (!data) return;

    // Header
    setField('headerClientId', data.clientId || '');
    setField('headerClientName', data.clientName || '');

    // Update search fields
    setField('clientIdSearch', data.clientId || '');
    setField('clientNameSearch', data.clientName || '');

    // Client Details Section
    setField('clientName', data.clientName || '-');
    setField('identificationNumber', data.identificationNumber || '-');
    setField('payrollNumber', data.payrollNumber || '-');
    setField('phoneNumber', data.phoneNumber || '-');
    setField('memberClass', data.memberClass || '-');
    setField('age', data.age || '-');
    setField('identificationType', data.identificationType || '-');
    setField('clientStatus', data.clientStatus || '-');
    setField('branch', data.branch || '-');
    setField('tanStatus', data.tanStatus || '-');
    setField('loanStatus', data.loanStatus || '-');
    setField('remarks', data.remarks || '-');
    setField('employer', data.employer || '-');

    // Load images
    loadClientImages(data.photo, data.signature);

    // Load accounts sections
    loadAccountsSection(data.accounts, data.accountsBalance);
    loadDepositsSection(data.deposits, data.depositsBalance);
    loadLoansSection(data.loans, data.loansBalance);
    loadBlockedDetailsSection(data.blockedDetails);
    loadGroupMemberSection(data.groupMember);
    loadStandingInstructionsSection(data.standingInstructions);
    loadOtherAccountsSection(data.otherAccounts);

    // Load Quick Links
    loadQuickLinks(data.quickLinks);
}

function loadClientImages(photo, signature) {
    const photoEl = $('clientPhoto');
    const signatureEl = $('clientSignature');

    // Optional print-only targets (rendered near Client ID/Name in print)
    const photoPrintEl = $('clientPhotoPrint');
    const signaturePrintEl = $('clientSignaturePrint');

    const emptyPhotoMarkup = `
        <div style="font-size: 10px; color: #5A6C7D;">
            <i class="bi bi-camera" style="font-size: 22px;"></i>
            <div style="margin-top: 6px; font-weight: 700;">NO IMAGE<br>AVAILABLE</div>
        </div>
    `;

    const emptySignatureMarkup = `
        <div style="font-size: 10px; color: #5A6C7D;">
            <i class="bi bi-pen" style="font-size: 22px;"></i>
            <div style="margin-top: 6px; font-weight: 700;">NO IMAGE<br>AVAILABLE</div>
        </div>
    `;

    const emptyPrintMarkup = `
        <div style="text-align:center; color:#64748b; font-size:10px; font-weight:800; letter-spacing:0.4px;">NO IMAGE</div>
    `;

    if (photo) {
        if (photoEl) photoEl.innerHTML = `<img src="${photo}" alt="Client Photo">`;
        if (photoPrintEl) photoPrintEl.innerHTML = `<img src="${photo}" alt="Client Photo">`;
    } else {
        if (photoEl) photoEl.innerHTML = emptyPhotoMarkup;
        if (photoPrintEl) photoPrintEl.innerHTML = emptyPrintMarkup;
    }

    if (signature) {
        if (signatureEl) signatureEl.innerHTML = `<img src="${signature}" alt="Client Signature" style="object-fit: contain;">`;
        if (signaturePrintEl) signaturePrintEl.innerHTML = `<img src="${signature}" alt="Client Signature" style="object-fit: contain;">`;
    } else {
        if (signatureEl) signatureEl.innerHTML = emptySignatureMarkup;
        if (signaturePrintEl) signaturePrintEl.innerHTML = emptyPrintMarkup;
    }

    // Enable click-to-zoom on images (Client 360 action panel)
    wireClient360ImageZoomTargets();
}

let __client360ImageZoomWired = false;

function getClient360ImageZoomEls() {
    return {
        modal: document.getElementById('client360ImageZoom'),
        title: document.getElementById('client360ImageZoomTitle'),
        img: document.getElementById('client360ImageZoomImg')
    };
}

function closeClient360ImageZoom() {
    const { modal, img } = getClient360ImageZoomEls();
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    if (img) img.removeAttribute('src');
}

function openClient360ImageZoom(src, titleText) {
    const { modal, title, img } = getClient360ImageZoomEls();
    if (!modal || !img) return;
    if (!src || String(src).trim() === '') return;

    if (title) title.textContent = titleText || 'Image';
    img.src = src;
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
}

function wireClient360ImageZoomOnce() {
    if (__client360ImageZoomWired) return;
    const { modal } = getClient360ImageZoomEls();
    if (!modal) return;

    // Click anywhere closes (including the image)
    modal.addEventListener('click', () => {
        closeClient360ImageZoom();
    });

    // ESC closes
    document.addEventListener('keydown', (e) => {
        const key = e && (e.key || e.code);
        if ((key === 'Escape' || key === 'Esc') && !modal.hidden) {
            e.preventDefault();
            closeClient360ImageZoom();
        }
    }, true);

    __client360ImageZoomWired = true;
}

function wireClient360ImageZoomTargets() {
    wireClient360ImageZoomOnce();

    const photoWrap = $('clientPhoto');
    const signatureWrap = $('clientSignature');

    const attach = (wrap, label) => {
        if (!wrap) return;
        const img = wrap.querySelector('img');
        if (!img) return;

        img.style.cursor = 'zoom-in';

        // Avoid duplicate listeners on repeated loads
        if (img.dataset && img.dataset.client360ZoomWired === '1') return;
        if (img.dataset) img.dataset.client360ZoomWired = '1';

        img.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openClient360ImageZoom(img.src, label);
        });
    };

    attach(photoWrap, 'Client Photo');
    attach(signatureWrap, 'Client Signature');
}

function loadAccountsSection(accounts, balance) {
    // Accounts section is always visible
    const container = $('accountsContainer');
    if (!container) return;

    // Header totals (visible even if Accounts Details section is collapsed)
    try {
        const headerSummaryEl = $('accountsHeaderSummary');
        const clearEl = $('accountsClearTotal');
        const availableEl = $('accountsAvailableTotal');
        const lienEl = $('accountsLienTotal');

        const rows = Array.isArray(accounts) ? accounts : [];
        const clearTotal = sumByCandidateKeys(rows, ['ClearBalance', 'clearBalance']);
        const availableTotal = sumByCandidateKeys(rows, ['AvailableBalance', 'availableBalance']);
        const lienTotal = sumByCandidateKeys(rows, ['Lien', 'lien']);

        const hasTotals = (clearTotal !== null) || (availableTotal !== null) || (lienTotal !== null);
        if (headerSummaryEl) headerSummaryEl.style.display = hasTotals ? 'flex' : 'none';
        if (clearEl) clearEl.textContent = clearTotal === null ? '-' : formatCurrency(clearTotal);
        if (availableEl) availableEl.textContent = availableTotal === null ? '-' : formatCurrency(availableTotal);
        if (lienEl) lienEl.textContent = lienTotal === null ? '-' : formatCurrency(lienTotal);
    } catch (e) {
        console.warn('Failed to compute accounts header totals:', e);
    }

    // Ensure consistent base styling across both client-360-view*.html pages
    if (!container.classList.contains('client360-products')) {
        container.classList.add('client360-products');
    }

    // Clear existing content
    container.innerHTML = '';

    if (!accounts || accounts.length === 0) {
        container.innerHTML = '<div style="padding: 12px; text-align: center; color: #5A6C7D; font-size: 12px;">No products available</div>';
        return;
    }

    const grid = document.createElement('div');
    grid.className = 'client360-products-grid';
    container.appendChild(grid);

    const formatMoneyOrDash = (value) => {
        if (value === null || value === undefined || String(value).trim() === '') return '-';
        return formatCurrency(value);
    };

    const addKV = (kvEl, key, value) => {
        const k = document.createElement('div');
        k.className = 'client360-product-kv__k';
        k.textContent = key;
        const v = document.createElement('div');
        v.className = 'client360-product-kv__v';
        v.textContent = value;
        kvEl.appendChild(k);
        kvEl.appendChild(v);
    };

    accounts.forEach(acc => {
        const card = document.createElement('div');
        card.className = 'client360-product-card';

        const header = document.createElement('div');
        header.className = 'client360-product-card__header';

        const left = document.createElement('div');
        const title = document.createElement('div');
        title.className = 'client360-product-card__title';
        title.textContent = acc?.accountName || acc?.product || '';

        const subtitle = document.createElement('div');
        subtitle.className = 'client360-product-card__subtitle';
        subtitle.textContent = acc?.accountId ? `AccountID: ${String(acc.accountId)}` : '';

        left.appendChild(title);
        if (subtitle.textContent) left.appendChild(subtitle);

        const badge = document.createElement('div');
        badge.className = 'client360-product-card__badge';
        badge.textContent = acc?.productTypeId ? String(acc.productTypeId) : 'PRODUCT';

        header.appendChild(left);
        header.appendChild(badge);
        card.appendChild(header);

        const kv = document.createElement('div');
        kv.className = 'client360-product-kv';
        addKV(kv, 'Clear Balance', formatMoneyOrDash(acc?.clearBalance));
        addKV(kv, 'Available Balance', formatMoneyOrDash(acc?.availableBalance));
        addKV(kv, 'Lien', formatMoneyOrDash(acc?.lien));
        addKV(kv, 'Display Balance', formatMoneyOrDash(acc?.balance));
        card.appendChild(kv);

        const actions = document.createElement('div');
        actions.className = 'client360-product-actions d-flex gap-2';

        const statementBtn = document.createElement('button');
        statementBtn.type = 'button';
        statementBtn.className = 'btn btn-sm client360-statement-btn w-100 flex-fill';
        statementBtn.textContent = 'View Statement';
        statementBtn.disabled = !acc?.accountId;
        statementBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!acc?.accountId) {
                client360Toast('AccountID is missing for this product.', 'warning');
                return;
            }
            openAccountStatement(String(acc.accountId), acc?.branchId ? String(acc.branchId) : '');
        });

        actions.appendChild(statementBtn);

        if (!isLikelyLoanRow(acc)) {
            const signBtn = document.createElement('button');
            signBtn.type = 'button';
            signBtn.className = 'btn btn-sm client360-signatories-btn w-100 flex-fill';
            signBtn.textContent = 'Signatories';
            signBtn.disabled = !acc?.accountId;
            signBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!acc?.accountId) {
                    client360Toast('AccountID is missing for this product.', 'warning');
                    return;
                }
                openAccountSignatories(String(acc.accountId), acc?.branchId ? String(acc.branchId) : '');
            });
            actions.appendChild(signBtn);
        }
        card.appendChild(actions);

        grid.appendChild(card);
    });
}

function openAccountStatement(accountId, branchId = '') {
    try {
        const ctx = getContext();
   const statementUrl = new URL('Statement/Index', window.location.origin);

      const branch = (branchId && String(branchId).trim() !== '') ? String(branchId).trim() : (ctx?.OurBranchID || '');
        if (branch) statementUrl.searchParams.set('branchId', branch);
  if (accountId) statementUrl.searchParams.set('accountId', String(accountId));
        statementUrl.searchParams.set('Source', 'Client360');
        statementUrl.searchParams.set('moduleId', String(MODULEID_CLIENT360));

        // Statement module reads AccountMaintenanceState from window.parent when loaded in an iframe.
        // Seed it on the current window before opening the overlay.
  window.AccountMaintenanceState = {
  isAccountLoaded: true,
      OurBranchID: branch || ctx?.OurBranchID || '',
    AccountID: accountId || '',
         OperatorID: ctx?.OperatorID || '',
    ClientID: currentClientData?.clientId || '',
       ModuleID: MODULEID_CLIENT360
        };

        openClient360Overlay(statementUrl.toString(), {
    title: `Statement View - ${String(accountId || '').trim() || 'Account'}`,
loadingText: 'Loading statement...'
});
  } catch (e) {
        console.error('Failed to open statement view:', e);
  client360Toast('Failed to open statement view: ' + (e?.message || e), 'error');
    }
}

function openAccountSignatories(accountId, branchId = '') {
    try {
        const ctx = getContext();
    const url = new URL('../account-maintenance/dataentry/account-signatories.html', window.location.href);

 const branch = (branchId && String(branchId).trim() !== '') ? String(branchId).trim() : (ctx?.OurBranchID || '');
      if (branch) url.searchParams.set('BranchID', branch);
        if (accountId) url.searchParams.set('AccountID', String(accountId));
url.searchParams.set('Source', 'Client360');
        url.searchParams.set('ModuleID', String(MODULEID_CLIENT360));

        // Seed AccountMaintenanceState for embedded submodules
window.AccountMaintenanceState = {
       isAccountLoaded: true,
       OurBranchID: branch || ctx?.OurBranchID || '',
 AccountID: accountId || '',
    OperatorID: ctx?.OperatorID || '',
        ClientID: currentClientData?.clientId || '',
   ModuleID: MODULEID_CLIENT360
        };

    openClient360Overlay(url.toString(), {
          title: `Signatories - ${String(accountId || '').trim() || 'Account'}`,
            loadingText: 'Loading signatories...'
        });
    } catch (e) {
        console.error('Failed to open signatories view:', e);
 client360Toast('Failed to open signatories view: ' + (e?.message || e), 'error');
    }
}

function openLoanStatement(rowOrAccountId) {
    try {
    const ctx = getContext();
  const rowObj = (rowOrAccountId && typeof rowOrAccountId === 'object') ? rowOrAccountId : null;
        const accountId = rowObj ? extractAccountIdFromRow(rowObj) : rowOrAccountId;
  const branchId = rowObj ? extractBranchIdFromRow(rowObj) : '';
        const loanSeries = rowObj ? extractLoanSeriesFromRow(rowObj) : '';
        const url = new URL('../loans/loan-maintenance/view/loan-statement.html', window.location.href);
    url.searchParams.set('ModuleID', String(MODULEID_CLIENT360));

 seedLoanMaintenanceContext({
    branchId: branchId || ctx?.OurBranchID || '',
    accountId: accountId || '',
     loanSeries
        });

    openClient360Overlay(url.toString(), {
            title: `Loan Statement - ${String(accountId || '').trim() || 'Account'}`,
            loadingText: 'Loading loan statement...'
  });
    } catch (e) {
      console.error('Failed to open loan statement view:', e);
        client360Toast('Failed to open loan statement view: ' + (e?.message || e), 'error');
}
}

function openLoanCollaterals(rowObj) {
    try {
   const ctx = getContext();
  const accountId = extractAccountIdFromRow(rowObj);
 const branchId = extractBranchIdFromRow(rowObj) || ctx?.OurBranchID || '';
  const loanSeries = extractLoanSeriesFromRow(rowObj);

        if (!accountId) {
     client360Toast('Missing AccountID for Collaterals.', 'warning');
   return;
        }

        seedLoanMaintenanceContext({ branchId, accountId, loanSeries });

        const url = new URL('../loans/loan-maintenance/view/loan-collaterals.html', window.location.href);
        url.searchParams.set('ModuleID', String(MODULEID_CLIENT360));
        
        openClient360Overlay(url.toString(), {
            title: `Collaterals - ${String(accountId).trim()}`,
          loadingText: 'Loading collaterals...'
     });
    } catch (e) {
console.error('Failed to open loan collaterals view:', e);
        client360Toast('Failed to open Collaterals: ' + (e?.message || e), 'error');
    }
}

function openLoanGuarantors(rowObj) {
    try {
const ctx = getContext();
        const accountId = extractAccountIdFromRow(rowObj);
        const branchId = extractBranchIdFromRow(rowObj) || ctx?.OurBranchID || '';
    const loanSeries = extractLoanSeriesFromRow(rowObj);

        if (!accountId) {
            client360Toast('Missing AccountID for Guarantors.', 'warning');
 return;
     }

  seedLoanMaintenanceContext({ branchId, accountId, loanSeries });

  const url = new URL('../loans/loan-maintenance/view/guarantors.html', window.location.href);
        url.searchParams.set('ModuleID', String(MODULEID_CLIENT360));
     
        openClient360Overlay(url.toString(), {
            title: `Guarantors - ${String(accountId).trim()}`,
          loadingText: 'Loading guarantors...'
        });
    } catch (e) {
    console.error('Failed to open loan guarantors view:', e);
        client360Toast('Failed to open Guarantors: ' + (e?.message || e), 'error');
    }
}

function seedLoanMaintenanceContext({ branchId = '', accountId = '', loanSeries = '' } = {}) {
    const ctx = getContext();
    const ourBranchId = (branchId && String(branchId).trim() !== '') ? String(branchId).trim() : (ctx?.OurBranchID || '');
    const series = (loanSeries && String(loanSeries).trim() !== '') ? String(loanSeries).trim() : '1';
    const operatorId = (ctx?.OperatorID && String(ctx.OperatorID).trim() !== '') ? String(ctx.OperatorID).trim() : 'web_portal';

    // Loan submodules expect values in window.parent.document.
    // When loaded in an iframe, their window.parent is this Client 360 page.
    const ensureHiddenInput = (id, value) => {
        let el = document.getElementById(id);
        if (!el) {
            el = document.createElement('input');
   el.type = 'hidden';
   el.id = id;
          document.body.appendChild(el);
        }
     el.value = value ?? '';
    };

    ensureHiddenInput('BranchID', ourBranchId);
    ensureHiddenInput('AccountID', accountId || '');
    ensureHiddenInput('LoanSeries', series);
    ensureHiddenInput('OperatorID', operatorId);

    // Some loan submodules also look for LoanMaintenanceState.
    window.LoanMaintenanceState = {
      isAccountLoaded: true,
        OurBranchID: ourBranchId,
AccountID: accountId || '',
  LoanSeries: series,
        OperatorID: operatorId,
        ClientID: currentClientData?.clientId || '',
  ModuleID: MODULEID_CLIENT360
    };
}

function loadDepositsSection(deposits, balance) {
    const sectionEl = $('depositsSection');
    const balanceEl = $('depositsBalance');
    const contentEl = $('depositsContent');

    const rows = normalizeToArray(deposits);

    // Only show if deposits exist and are not empty
    if (!rows.length) {
        if (sectionEl) sectionEl.style.display = 'none';
        return;
    }

if (sectionEl) sectionEl.style.display = 'block';
    if (balanceEl) balanceEl.textContent = formatCurrency(balance);

    if (!contentEl) return;

    if (balanceEl) {
        const hasBalance = balance !== undefined && balance !== null && String(balance).trim() !== '';
        balanceEl.textContent = hasBalance ? formatCurrency(balance) : '';
    }

    renderCards(contentEl, rows, {
        emptyText: 'No deposits',
     titleKeys: ['Product', 'DepositProduct', 'AccountName', 'AccountID', 'DepositID', 'Id'],
        badgeKeys: ['Status', 'DepositStatus', 'ProductTypeID', 'Type'],
        maxFields: 10,
   primaryAction: {
    label: 'View Statement',
    buttonClassName: 'btn btn-sm client360-statement-btn w-100',
      isEnabled: (r) => !!extractAccountIdFromRow(r),
            onClick: (r) => openAccountStatement(extractAccountIdFromRow(r), extractBranchIdFromRow(r))
  },
        secondaryAction: {
       label: 'Signatories',
    buttonClassName: 'btn btn-sm client360-signatories-btn w-100',
        isEnabled: (r) => !!extractAccountIdFromRow(r) && !isLikelyLoanRow(r),
 onClick: (r) => openAccountSignatories(extractAccountIdFromRow(r), extractBranchIdFromRow(r))
        }
 });
}

function loadLoansSection(loans, balance) {
    const sectionEl = $('loansSection');
    const balanceEl = $('loansBalance');
    const contentEl = $('loansContent');

    const rows = normalizeToArray(loans);

    // Only show if loans exist and are not empty
    if (!rows.length) {
  if (sectionEl) sectionEl.style.display = 'none';
return;
    }

    if (sectionEl) sectionEl.style.display = 'block';
    if (balanceEl) balanceEl.textContent = formatCurrency(balance);

    // Header totals (visible even if the section is collapsed)
    try {
 const headerSummaryEl = $('loansHeaderSummary');
    const outstandingEl = $('loansOutstandingTotal');
        const borrowedEl = $('loansAmountBorrowedTotal');

        const outstandingTotal = sumByCandidateKeys(rows, [
            'OutstandingLoan',
    'Outstanding Loan',
    'Outstanding_Loan',
    'outstandingLoan',
        'OutstandingBalance',
            'LoanOutstanding',
            'Outstanding'
        ]);

        const amountBorrowedTotal = sumByCandidateKeys(rows, [
       'AmountBorrowed',
   'Amount Borrowed',
      'Amount_Borrowed',
          'amountBorrowed',
     'LoanAmount',
       'DisbursedAmount',
            'Disbursed',
     'Principal',
      'PrincipalAmount'
        ]);

        const hasTotals = (outstandingTotal !== null) || (amountBorrowedTotal !== null);
    if (headerSummaryEl) headerSummaryEl.style.display = hasTotals ? 'flex' : 'none';
        if (outstandingEl) outstandingEl.textContent = outstandingTotal === null ? '-' : formatCurrency(outstandingTotal);
        if (borrowedEl) borrowedEl.textContent = amountBorrowedTotal === null ? '-' : formatCurrency(amountBorrowedTotal);
    } catch (e) {
  console.warn('Failed to compute loan header totals:', e);
    }

  if (!contentEl) return;

    if (balanceEl) {
        const hasBalance = balance !== undefined && balance !== null && String(balance).trim() !== '';
    balanceEl.textContent = hasBalance ? formatCurrency(balance) : '';
    }

    renderCards(contentEl, rows, {
        emptyText: 'No loans',
        titleKeys: ['LoanType', 'Product', 'LoanID', 'LoanId', 'AccountID', 'AccountId'],
        badgeKeys: ['Status', 'LoanStatus', 'ProductTypeID', 'Type'],
      maxFields: 10,
    actions: [
            {
             label: 'View Statement',
      buttonClassName: 'btn btn-sm client360-statement-btn',
      isEnabled: (r) => !!extractAccountIdFromRow(r),
      onClick: (r) => openLoanStatement(r)
   },
            {
 label: 'Collateral',
    buttonClassName: 'btn btn-sm btn-outline-secondary',
      isEnabled: (r) => !!extractAccountIdFromRow(r),
       onClick: (r) => openLoanCollaterals(r)
      },
    {
            label: 'Guarantors',
            buttonClassName: 'btn btn-sm btn-outline-secondary',
       isEnabled: (r) => !!extractAccountIdFromRow(r),
 onClick: (r) => openLoanGuarantors(r)
          }
        ]
    });
}

function loadBlockedDetailsSection(blockedDetails) {
    const sectionEl = $('blockedDetailsSection');
    const contentEl = $('blockedDetailsContent');

    // Only show if blocked details exist and are not empty
    if (!blockedDetails || blockedDetails.length === 0) {
        if (sectionEl) sectionEl.style.display = 'none';
        return;
    }

    if (sectionEl) sectionEl.style.display = 'block';

    if (!contentEl) return;

    const rows = normalizeToArray(blockedDetails);
 renderCards(contentEl, rows, {
        emptyText: 'No blocked details',
  titleKeys: ['blockId', 'BlockID', 'AccountID', 'AccountId', 'Id'],
  badgeKeys: ['status', 'Status'],
 maxFields: 10
    });
}

function loadGroupMemberSection(groupMember) {
    const sectionEl = $('groupMemberSection');
    const contentEl = $('groupMemberContent');

    const rows = normalizeToArray(groupMember);

    // Only show if group member data exists and is not empty
    if (!rows.length) {
        if (sectionEl) sectionEl.style.display = 'none';
        return;
    }

    if (sectionEl) sectionEl.style.display = 'block';

    if (!contentEl) return;

    renderTable(contentEl, rows, null, 'No group memberships');
}

function loadStandingInstructionsSection(standingInstructions) {
    const sectionEl = $('standingInstructionsSection');
    const contentEl = $('standingInstructionsContent');

    const rows = normalizeToArray(standingInstructions);

    // Only show if standing instructions exist and are not empty
    if (!rows.length) {
if (sectionEl) sectionEl.style.display = 'none';
        return;
    }

    if (sectionEl) sectionEl.style.display = 'block';

    if (!contentEl) return;

    renderCards(contentEl, rows, {
        emptyText: 'No standing instructions',
        titleKeys: ['Instruction', 'InstructionType', 'Type', 'AccountID', 'AccountId', 'Id'],
   badgeKeys: ['Status', 'Active', 'Frequency'],
        maxFields: 10
    });
}

function loadOtherAccountsSection(otherAccounts) {
    const sectionEl = $('otherAccountsSection');
    const contentEl = $('otherAccountsContent');

    const rows = normalizeToArray(otherAccounts);
    if (!rows.length) {
   if (sectionEl) sectionEl.style.display = 'none';
        return;
    }

    if (sectionEl) sectionEl.style.display = 'block';
    renderCards(contentEl, rows, {
        emptyText: 'No other accounts',
        titleKeys: ['Product', 'AccountName', 'AccountID', 'AccountId', 'Id'],
   badgeKeys: ['ProductTypeID', 'Type', 'Status'],
 maxFields: 10,
        primaryAction: {
          label: 'View Statement',
      buttonClassName: 'btn btn-sm client360-statement-btn w-100',
         isEnabled: (r) => !!extractAccountIdFromRow(r),
            onClick: (r) => openAccountStatement(extractAccountIdFromRow(r), extractBranchIdFromRow(r))
      },
        secondaryAction: {
        label: 'Signatories',
     buttonClassName: 'btn btn-sm client360-signatories-btn w-100',
   isEnabled: (r) => !!extractAccountIdFromRow(r) && !isLikelyLoanRow(r),
            onClick: (r) => openAccountSignatories(extractAccountIdFromRow(r), extractBranchIdFromRow(r))
}
    });
}

function loadQuickLinks(quickLinks) {
    const container = $('quickLinksContainer');
    if (!container) return;

    // Clear existing links
    container.innerHTML = '';

    const rows = normalizeToArray(quickLinks);

    if (!rows.length) {
   container.innerHTML = '<div style="padding: 8px 6px; color: #64748b; font-size: 11px;">No sub modules</div>';
        return;
    }

    rows.forEach(link => {
        const title = link?.MenuDescription ?? link?.label ?? '';
        const moduleKey = link?.MenuURL ?? link?.action ?? link?.ModuleID ?? link?.ModuleId ?? link?.MenuID ?? link?.MenuId ?? link?.id ?? '';

      const item = document.createElement('div');
        item.className = 'sidebar-item sidebar-item--enhanced';
  item.style.cursor = 'pointer';

    item.innerHTML = `
          <div class="sidebar-item__content">
     <i class="bi bi-link-45deg sidebar-item__icon"></i>
     <div class="sidebar-item__text">
  <div class="sidebar-item__title">${title}</div>
          <div class="sidebar-item__description">Open</div>
                </div>
        </div>
        `;

        item.addEventListener('click', () => handleQuickLinkClick({ title, moduleKey, raw: link }));
      container.appendChild(item);
    });
}

function handleQuickLinkClick(link) {
    const title = link?.title || 'Sub Module';
    const moduleKey = String(link?.moduleKey || '').trim();

    if (!moduleKey) {
   client360Toast(`${title}: route not provided`, 'warning');
  return;
    }

// If MenuURL is a route/file, navigate. Otherwise just surface the key.
    const looksLikeUrl = /^https?:\/\//i.test(moduleKey);
    const looksLikeFile = /\.html(\?|#|$)/i.test(moduleKey);
    const looksLikePath = moduleKey.includes('/') || moduleKey.includes('\\');

    // Address submodule should open inside the Client 360 overlay
    if (isAddressQuickLink(link)) {
        openClientAddressOverlay();
        return;
    }

    if (typeof window.openClient360SubModule === 'function') {
   window.openClient360SubModule(moduleKey, link?.raw);
   return;
    }

    if (looksLikeUrl) {
    window.open(moduleKey, '_blank', 'noopener');
 return;
    }

if (looksLikeFile || looksLikePath) {
  const url = new URL(moduleKey, window.location.href);
 url.searchParams.set('t', String(Date.now()));
        window.location.href = url.toString();
        return;
    }

    client360Toast(`${title}: ${moduleKey}`, 'info');
}

function handlePrint() {
    if (!currentClientData) {
        client360Toast('No client data to print', 'warning');
        return;
    }

  // Print stylesheet handles hiding action panel/search.
    window.print();
}

function handleCancel() {
    // Clear the view
    setField('clientIdSearch', '');
    setField('clientNameSearch', '');
    setField('headerClientId', '');
    setField('headerClientName', '');

    // Clear visible fields
    setField('clientName', '');
    setField('identificationNumber', '');
    setField('payrollNumber', '');
    setField('phoneNumber', '');
 setField('employer', '');
    setField('memberClass', '');
    setField('age', '');
    setField('identificationType', '');
    setField('clientStatus', '');
  setField('branch', '');
    setField('tanStatus', '');
setField('loanStatus', '');
    setField('remarks', '');

    // Clear Passport Photo and Signature
  try { loadClientImages(null, null); } catch (_) {}
    try { closeClient360ImageZoom(); } catch (_) {}

    clearClient360DynamicUI();

    currentClientData = null;

    // Reset UI state
    setClient360UiState('initial');

    hideElementById('depositsSection');
    hideElementById('loansSection');
    hideElementById('blockedDetailsSection');
    hideElementById('groupMemberSection');
    hideElementById('standingInstructionsSection');
    hideElementById('otherAccountsSection');

    // Refresh recent list to clear active highlight
    renderClient360RecentActivities();
    
    client360Toast('View cleared', 'info');
}

// Export functions for external use if needed
window.Client360View = {
    viewClient: handleViewClient,
    refreshData: function() {
    if (currentClientData) {
        handleViewClient();
        }
    }
};
