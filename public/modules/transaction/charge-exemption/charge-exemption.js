// Charge Exemption JavaScript - Modern Blue Edition
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
            if (activeAction === 'Edit') {
                btn.disabled = !['save', 'cancel'].includes(action);
            } else {
                btn.disabled = !['view', 'edit'].includes(action);
            }
        });
    }

    function wireActionButtons() {
        document.querySelectorAll('.btn-action').forEach(btn => {
            btn.addEventListener('click', function () {
                const action = this.dataset.action;
                if (action === 'view') {
                    setStatus('Loading data...', 'text-primary');
                    setTimeout(() => setStatus('Data loaded.', 'text-success'), 500);
                } else if (action === 'edit') {
                    currentMode = 'EDIT';
                    updateActionButtonsState('Edit');
                    setStatus('Edit mode active.', 'text-info');
                } else if (action === 'cancel') {
                    currentMode = 'VIEW';
                    updateActionButtonsState('View');
                    setStatus('Operation cancelled.', 'text-secondary');
                } else if (action === 'save') {
                    setStatus('Saving...', 'text-primary');
                    setTimeout(() => {
                        currentMode = 'VIEW';
                        updateActionButtonsState('View');
                        setStatus('Exemption details saved successfully.', 'text-success');
                    }, 800);
                }
            });
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        wireActionButtons();
        updateActionButtonsState('View');
        console.log('Charge Exemption - Modern Blue Edition Initialized');
    });
})();
