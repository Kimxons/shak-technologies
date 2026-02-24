// On Demand Adhoc Charges JavaScript - Modern Blue Edition
(function () {
    let currentMode = 'VIEW';

    function setStatus(msg, className) {
        const el = document.getElementById('statusMessage');
        if (!el) return;
        el.textContent = msg;
        el.className = className || 'text-danger';
    }

    function updateActionButtonsState(activeAction) {
        document.querySelectorAll('.btn-action[data-action]').forEach(btn => {
            const action = btn.dataset.action;
            if (action === 'view-all') {
                btn.disabled = false;
                return;
            }
            if (activeAction === 'Add') {
                btn.disabled = !['save', 'cancel'].includes(action);
            } else {
                btn.disabled = !['view', 'add', 'delete'].includes(action);
            }
        });
    }

    function wireActionButtons() {
        document.querySelectorAll('.btn-action').forEach(btn => {
            btn.addEventListener('click', function () {
                const action = this.dataset.action;
                if (action === 'view') {
                    setStatus('Loading data...', 'text-primary');
                } else if (action === 'add') {
                    currentMode = 'ADD';
                    updateActionButtonsState('Add');
                    setStatus('Add mode active.', 'text-info');
                } else if (action === 'cancel') {
                    currentMode = 'VIEW';
                    updateActionButtonsState('View');
                    setStatus('Operation cancelled.', 'text-secondary');
                } else if (action === 'save') {
                    setStatus('Saving...', 'text-primary');
                    setTimeout(() => {
                        currentMode = 'VIEW';
                        updateActionButtonsState('View');
                        setStatus('Charges saved successfully.', 'text-success');
                    }, 800);
                }
            });
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        wireActionButtons();
        updateActionButtonsState('View');
        console.log('On Demand Adhoc Charges - Modern Blue Edition Initialized');
    });
})();
