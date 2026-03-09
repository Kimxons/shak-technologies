const CM_PORTFOLIO_BASE = 'Identities/ClientMaintenance/Portfolio';

function invokeClientMaintenancePortfolio(action, requestData) {
    return window.ClientMaintenanceCore.invokeControllerMethod(CM_PORTFOLIO_BASE, action, 'POST', requestData || {});
}

window.ClientMaintenancePortfolioService = {
    get: (requestData) => invokeClientMaintenancePortfolio('get', requestData)
};

window.initClientMaintenancePortfolio = function (moduleRoot, moduleId) {
    if (!moduleRoot) return;

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

    const handleView = async () => {
        const formData = getFormData();
        if (!validateForm(formData)) return;

        const clientId = window.ClientMaintenanceCore?.getClientId?.();
        if (!clientId) {
            window.ToastManager?.showError('Client ID is required');
            return;
        }

        const payload = {
            ClientID: clientId,
            ModuleID: moduleId,
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
        // Auto-load portfolio if client ID is available
        const clientId = window.ClientMaintenanceCore?.getClientId?.() || requestData?.ClientID;
        if (clientId) {
            // Set default report type if available
            const reportTypeDropdown = form?.querySelector('#ddl_portfolioReportType');
            if (reportTypeDropdown && reportTypeDropdown.options.length > 1) {
                reportTypeDropdown.selectedIndex = 1; // Select first non-empty option
            }
        }
    };

    // Event delegation for action buttons
    moduleRoot.addEventListener('click', (e) => {
        const actionBtn = e.target.closest('[data-portfolio-action]');
        if (actionBtn) {
            const action = actionBtn.dataset.portfolioAction;

            switch (action) {
                case 'view':
                    handleView();
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

    // Initial state
    clearChart();
    refreshData({});
};
