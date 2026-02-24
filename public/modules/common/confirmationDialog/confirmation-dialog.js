(function(global) {
    'use strict';

    class ConfirmationDialog {
        constructor() {
            this.modal = null;
            this.resolvePromise = null;
            this.rejectPromise = null;
            this.init();
        }

        init() {
            // Check if modal already exists in DOM
            this.modal = document.getElementById('confirmationModal');
            if (!this.modal) {
                // Inject the modal HTML directly
                this.injectModal();
            } else {
                this.setupEventListeners();
            }
        }

        injectModal() {
            const modalHTML = `
                <div class="modal fade" id="confirmationModal" tabindex="-1" aria-labelledby="confirmationModalLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-body" id="confirmationModalBody">
                                Are you sure you want to proceed?
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" id="confirmationCancelBtn">Cancel</button>
                                <button type="button" class="btn btn-danger" id="confirmationOkBtn">OK</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            this.modal = document.getElementById('confirmationModal');
            this.setupEventListeners();
        }

        setupEventListeners() {
            if (!this.modal) return;

            const okBtn = this.modal.querySelector('#confirmationOkBtn');
            const cancelBtn = this.modal.querySelector('#confirmationCancelBtn');

            const handleConfirm = () => {
                this.hide();
                if (this.resolvePromise) {
                    this.resolvePromise(true);
                    this.resolvePromise = null;
                    this.rejectPromise = null;
                }
            };

            const handleCancel = () => {
                this.hide();
                if (this.resolvePromise) {
                    this.resolvePromise(false);
                    this.resolvePromise = null;
                    this.rejectPromise = null;
                }
            };

            okBtn?.addEventListener('click', handleConfirm);
            cancelBtn?.addEventListener('click', handleCancel);

            // Also handle modal hide event
            this.modal.addEventListener('hidden.bs.modal', () => {
                if (this.resolvePromise) {
                    this.resolvePromise(false);
                    this.resolvePromise = null;
                    this.rejectPromise = null;
                }
            });
        }

        show(title = 'Confirm Action', message = 'Are you sure you want to proceed?', type = 'danger') {
            return new Promise((resolve, reject) => {
                this.resolvePromise = resolve;
                this.rejectPromise = reject;

                if (!this.modal) {
                    reject(new Error('Modal not initialized'));
                    return;
                }

                // Update modal content
                const titleElement = this.modal.querySelector('#confirmationModalLabel');
                const bodyElement = this.modal.querySelector('#confirmationModalBody');
                const okBtn = this.modal.querySelector('#confirmationOkBtn');

                if (titleElement) titleElement.textContent = title;

                if (bodyElement) bodyElement.textContent = message;

                // Update button style based on type
                if (okBtn) {
                    okBtn.className = `btn btn-${type}`;
                }

                // Show modal
                const bsModal = new bootstrap.Modal(this.modal);
                bsModal.show();
            });
        }

        hide() {
            if (this.modal) {
                const bsModal = bootstrap.Modal.getInstance(this.modal);
                if (bsModal) {
                    bsModal.hide();
                }
            }
        }
    }

    // Create global instance
    const confirmationDialog = new ConfirmationDialog();

    // Expose global function
    global.showConfirmationDialog = function(title, message, type) {
        return confirmationDialog.show(title, message, type);
    };

})(window);