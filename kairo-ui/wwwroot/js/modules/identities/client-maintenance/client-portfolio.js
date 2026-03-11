const CM_PORTFOLIO_BASE = 'Identities/ClientMaintenance/Portfolio';

function getPortfolioAppCore() {
    const win = window;
    return win.AppCore ||
        (win.parent && win.parent !== win && win.parent.AppCore) ||
        (win.top && win.top !== win && win.top.AppCore) ||
        null;
}

function getPortfolioClientMaintenanceCore() {
    const win = window;
    return win.ClientMaintenanceCore ||
        (win.parent && win.parent !== win && win.parent.ClientMaintenanceCore) ||
        (win.top && win.top !== win && win.top.ClientMaintenanceCore) ||
        null;
}

function getPortfolioSidebarManager() {
    const win = window;
    try {
        return (win.parent && win.parent !== win && win.parent.SidebarManager) ||
            (win.top && win.top !== win && win.top.SidebarManager) ||
            null;
    } catch (_error) {
        return null;
    }
}

function getPortfolioParentContext() {
    const maintenanceCore = getPortfolioClientMaintenanceCore();
    if (maintenanceCore?.getParentContext) {
        return maintenanceCore.getParentContext();
    }

    const sidebarManager = getPortfolioSidebarManager();
    if (sidebarManager?.getParentContext) {
        return sidebarManager.getParentContext();
    }

    return null;
}

function toPortfolioString(value) {
    return value === undefined || value === null ? '' : String(value).trim();
}

function resolvePortfolioContext(requestData, fallbackModuleId) {
    const parentContext = getPortfolioParentContext() || {};
    const maintenanceCore = getPortfolioClientMaintenanceCore();

    const moduleId = toPortfolioString(
        requestData?.ModuleID ??
        fallbackModuleId ??
        maintenanceCore?.moduleId ??
        parentContext.moduleId
    );

    const clientId = toPortfolioString(
        requestData?.ClientID ??
        maintenanceCore?.getClientId?.() ??
        maintenanceCore?.clientId ??
        parentContext.clientId
    );

    const requestId = toPortfolioString(
        requestData?.RequestID ??
        maintenanceCore?.getRequestId?.() ??
        maintenanceCore?.requestId ??
        parentContext.requestId
    );

    return {
        ModuleID: moduleId,
        ClientID: clientId,
        RequestID: requestId
    };
}

function invokeClientMaintenancePortfolio(action, requestData) {
    const maintenanceCore = getPortfolioClientMaintenanceCore();
    if (maintenanceCore?.invokeControllerMethod) {
        return maintenanceCore.invokeControllerMethod(CM_PORTFOLIO_BASE, action, 'POST', requestData || {});
    }

    const appCore = getPortfolioAppCore();
    if (appCore?.invokeControllerByMethodAsync) {
        return appCore.invokeControllerByMethodAsync(`${CM_PORTFOLIO_BASE}/${action}`, 'POST', requestData || {});
    }

    return Promise.reject(new Error('Portfolio controller invocation is not available.'));
}

window.ClientMaintenancePortfolioService = {
    get: (requestData) => invokeClientMaintenancePortfolio('get', requestData)
};

function closePortfolioView() {
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
            parentWindowRef?.postMessage({ type: 'submoduleClose', source: 'ClientPortfolio' }, '*');
            handled = Boolean(parentWindowRef);
        } catch (_error) {
        }
    }

    try { parentWindowRef?.postMessage({ action: 'submoduleClosed', source: 'ClientPortfolio' }, '*'); } catch (_error) { }
    try { parentWindowRef?.postMessage({ type: 'accountMaintenanceChildClose', source: 'ClientPortfolio' }, '*'); } catch (_error) { }
    try { parentWindowRef?.postMessage({ type: 'CLOSE_DATAENTRY', source: 'ClientPortfolio' }, '*'); } catch (_error) { }

    if (!handled) {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.close();
        }
    }
}

function bindPortfolioActionPanel(moduleRoot) {
    if (!moduleRoot) return;

    const actionScope =
        moduleRoot.closest('.window') ||
        moduleRoot.closest('[data-cm-layout="client-portfolio"]') ||
        moduleRoot.parentElement ||
        moduleRoot;

    if (!actionScope || actionScope.dataset.cmPortfolioActionDelegated === 'true') return;
    actionScope.dataset.cmPortfolioActionDelegated = 'true';

    const handleRefresh = async (event) => {
        event.preventDefault();
        if (typeof moduleRoot._cmRefreshData === 'function') {
            await moduleRoot._cmRefreshData();
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
            closePortfolioView();
        }
    });

    actionScope.addEventListener('kairo:titlebar:refresh', handleRefresh);
    actionScope.addEventListener('kairo:titlebar:close', (event) => {
        event.preventDefault();
        closePortfolioView();
    });
}

window.initClientMaintenancePortfolio = function (moduleRoot, moduleId) {
    if (!moduleRoot || moduleRoot.dataset.cmPortfolioInitialized === 'true') return;
    moduleRoot.dataset.cmPortfolioInitialized = 'true';

    const state = {
        portfolioData: null,
        chart: null
    };

    const form = moduleRoot.querySelector('[data-portfolio-form]');
    const chartContainer = document.getElementById('portfolioChartContainer');

    const clearForm = () => {
        if (!form) return;
        form.reset();
        clearChart();
    };

    const getFormData = () => {
        if (!form) return {};
        return {
            portfolioReportType: form.querySelector('#ddl_portfolioReportType')?.value || '',
            productType: form.querySelector('#ddl_productType')?.value || '',
            fromDate: form.querySelector('#txt_fromDate')?.value || '',
            toDate: form.querySelector('#txt_toDate')?.value || ''
        };
    };

    const validateForm = (formData) => {
        if (!formData.portfolioReportType) {
            window.ToastManager?.showWarning('Report Type is required');
            form?.querySelector('#ddl_portfolioReportType')?.focus();
            return false;
        }
        return true;
    };

    const clearChart = () => {
        if (state.chart) {
            state.chart.destroy();
            state.chart = null;
        }
        if (chartContainer) {
            chartContainer.innerHTML = '<div class="text-center text-muted py-5"><i class="bi bi-graph-up" style="font-size: 3rem;"></i><p class="mt-3">Select filters and click "View" to display portfolio chart</p></div>';
        }
    };

    const renderChart = (data) => {
        if (!chartContainer || !data) return;

        // Clear existing chart
        if (state.chart) {
            state.chart.destroy();
            state.chart = null;
        }

        // Parse the data structure - adjust based on actual API response
        const chartData = parsePortfolioData(data);

        if (!chartData || chartData.length === 0) {
            chartContainer.innerHTML = '<div class="text-center text-muted py-5"><i class="bi bi-inbox" style="font-size: 3rem;"></i><p class="mt-3">No portfolio data available</p></div>';
            return;
        }

        // Create Highcharts chart
        state.chart = Highcharts.chart('portfolioChartContainer', {
            chart: {
                type: 'pie',
                backgroundColor: 'transparent'
            },
            title: {
                text: 'Client Portfolio Distribution',
                style: {
                    fontSize: '18px',
                    fontWeight: 'bold'
                }
            },
            tooltip: {
                pointFormat: '<b>{point.y}</b> ({point.percentage:.1f}%)'
            },
            accessibility: {
                point: {
                    valueSuffix: '%'
                }
            },
            plotOptions: {
                pie: {
                    allowPointSelect: true,
                    cursor: 'pointer',
                    dataLabels: {
                        enabled: true,
                        format: '<b>{point.name}</b>: {point.percentage:.1f}%'
                    },
                    showInLegend: true
                }
            },
            series: [{
                name: 'Portfolio',
                colorByPoint: true,
                data: chartData
            }],
            credits: {
                enabled: false
            },
            exporting: {
                enabled: true,
                buttons: {
                    contextButton: {
                        menuItems: ['downloadPNG', 'downloadJPEG', 'downloadPDF', 'downloadSVG']
                    }
                }
            }
        });
    };

    const parsePortfolioData = (data) => {
        // This function should parse the API response into Highcharts-compatible format
        // Adjust based on actual API response structure
        
        if (!data) return [];

        // If data is an array of objects with Name and Value properties
        if (Array.isArray(data)) {
            return data.map(item => ({
                name: item?.Name || item?.ProductName || item?.Category || 'Unknown',
                y: parseFloat(item?.Value || item?.Amount || item?.Balance || 0)
            }));
        }

        // If data has a specific structure like { Categories: [], Values: [] }
        if (data?.Categories && data?.Values) {
            return data.Categories.map((name, index) => ({
                name: name || 'Unknown',
                y: parseFloat(data.Values[index] || 0)
            }));
        }

        // If data is a single object with portfolio breakdown
        if (typeof data === 'object' && !Array.isArray(data)) {
            return Object.keys(data)
                .filter(key => key !== 'Total' && key !== 'ClientID')
                .map(key => ({
                    name: key,
                    y: parseFloat(data[key] || 0)
                }))
                .filter(item => item.y > 0);
        }

        return [];
    };

    const handleView = async (requestData = {}) => {
        const formData = getFormData();
        if (!validateForm(formData)) return;

        const context = resolvePortfolioContext(requestData, moduleId);
        if (!context.ClientID && !context.RequestID) {
            window.ToastManager?.showError('Client or request context is required');
            return;
        }

        const payload = {
            ModuleID: context.ModuleID,
            ClientID: context.ClientID,
            RequestID: context.RequestID,
            PortfolioReportTypeID: formData.portfolioReportType,
            ProductTypeID: formData.productType || null,
            FromDate: formData.fromDate || null,
            ToDate: formData.toDate || null
        };

        try {
            const result = await window.ClientMaintenancePortfolioService.get(payload);

            if (result?.success || result?.Success) {
                const data = result?.data || result?.Data;
                state.portfolioData = data;
                renderChart(data);
            } else {
                window.ToastManager?.showError(result?.message || result?.ErrorMessage || 'Failed to load portfolio data');
                clearChart();
            }
        } catch (error) {
            console.error('Error loading portfolio data:', error);
            window.ToastManager?.showError('An error occurred while loading portfolio data');
            clearChart();
        }
    };

    const handleClear = () => {
        clearForm();
    };

    const handlePrint = () => {
        if (!state.chart) {
            window.ToastManager?.showWarning('No chart to print. Please view portfolio first.');
            return;
        }
        state.chart.print();
    };

    const refreshData = async (requestData = {}) => {
        const context = resolvePortfolioContext(requestData, moduleId);
        if (!context.ClientID && !context.RequestID) {
            clearChart();
            return;
        }

        const reportTypeDropdown = form?.querySelector('#ddl_portfolioReportType');
        if (reportTypeDropdown && !reportTypeDropdown.value) {
            const firstValidOption = Array.from(reportTypeDropdown.options || []).find((option) => {
                return Boolean(String(option?.value || '').trim());
            });

            if (firstValidOption) {
                reportTypeDropdown.value = firstValidOption.value;
            }
        }

        if (!reportTypeDropdown?.value) {
            clearChart();
            return;
        }

        await handleView(context);
    };

    const bindStandaloneBootstrap = () => {
        if (moduleRoot.dataset.cmPortfolioParentContextBound === 'true') {
            return;
        }

        moduleRoot.dataset.cmPortfolioParentContextBound = 'true';
        window.addEventListener('message', (event) => {
            const data = event?.data;
            if (!data || typeof data !== 'object') return;
            if (data.type !== 'parentContext' && data.action !== 'parentContextLoaded') return;

            const parentData = data.data || {};
            if (typeof moduleRoot._cmLoadData === 'function') {
                void moduleRoot._cmLoadData({
                    ModuleID: parentData.moduleId,
                    ClientID: parentData.clientId,
                    RequestID: parentData.requestId
                });
            }
        });
    };

    // Event delegation for action buttons
    moduleRoot.addEventListener('click', (e) => {
        const actionBtn = e.target.closest('[data-portfolio-action]');
        if (actionBtn) {
            const action = actionBtn.dataset.portfolioAction;

            switch (action) {
                case 'view':
                    handleView({});
                    break;
                case 'clear':
                    handleClear();
                    break;
                case 'print':
                    handlePrint();
                    break;
            }
        }
    });

    // Register load function for external calls
    moduleRoot._cmLoadData = (requestData) => refreshData(requestData);
    moduleRoot._cmRefreshData = (requestData) => refreshData(requestData);

    // Initial state
    clearChart();
    bindPortfolioActionPanel(moduleRoot);
    bindStandaloneBootstrap();
    refreshData({});
};

function autoInitializeStandalonePortfolioView() {
    const moduleRoot = document.querySelector('[data-section="client-portfolio"]');
    if (!moduleRoot || typeof window.initClientMaintenancePortfolio !== 'function') return;

    const moduleId = document.getElementById('moduleIdPortfolio')?.value || '';
    window.initClientMaintenancePortfolio(moduleRoot, moduleId);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInitializeStandalonePortfolioView);
} else {
    autoInitializeStandalonePortfolioView();
}
