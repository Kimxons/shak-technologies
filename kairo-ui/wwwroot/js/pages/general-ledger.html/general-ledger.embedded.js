let currentModal = null;

        /**
         * Open GL Parameters module in modal
         */
        function openGLParameters(event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            const backdrop = document.getElementById('glModalBackdrop');
            const container = document.getElementById('glModalContainer');
            const iframe = document.getElementById('glParametersFrame');

            iframe.src = '/modules/gl-parameters/gl-parameters.html';
            backdrop.classList.add('active');
            container.classList.add('active');
            currentModal = 'glParameters';
        }

        /**
         * Open Cost Center module in modal
         */
        function openCostCenter(event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            const backdrop = document.getElementById('glModalBackdrop');
            const container = document.getElementById('glModalContainer');
            const iframe = document.getElementById('glParametersFrame');

            iframe.src = '/modules/cost-center/cost-center.html';
            backdrop.classList.add('active');
            container.classList.add('active');
            currentModal = 'costCenter';
        }

        /**
         * Close current modal
         */
        function closeCurrentModal() {
            const backdrop = document.getElementById('glModalBackdrop');
            const container = document.getElementById('glModalContainer');
            const iframe = document.getElementById('glParametersFrame');

            backdrop.classList.remove('active');
            container.classList.remove('active');

            setTimeout(() => {
                iframe.src = '';
                currentModal = null;
            }, 300);
        }

        /**
         * Close GL Parameters modal
         */
        function closeGLParameters() {
            closeCurrentModal();
        }

        /**
         * Close Cost Center modal
         */
        function closeCostCenter() {
            closeCurrentModal();
        }

        /**
         * Open Cost Center module in modal (same pattern as GL Parameters)
         */
        function openCostCenter(event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            const backdrop = document.getElementById('glModalBackdrop');
            const container = document.getElementById('ccModalContainer');
            const iframe = document.getElementById('costCenterFrame');

            iframe.src = '/modules/cost-center/cost-center.html';
            backdrop.classList.add('active');
            container.classList.add('active');
            currentModal = 'costCenter';
        }

        // Close modal when pressing Escape
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                closeCurrentModal();
            }
        });
