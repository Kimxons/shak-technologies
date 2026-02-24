(function () {
			// If running embedded inside the parent (iframe), hide this page's own title bar
			// so the parent overlay provides the single clean header like Account Maintenance.
			try {
				const isEmbedded = window.self !== window.top;
				if (isEmbedded) {
					document.documentElement.style.setProperty('--title-bar-height', '0px');
					const titleBar = document.querySelector('.title-bar');
					if (titleBar) titleBar.style.display = 'none';
				}
			} catch {
				// ignore
			}

			const close = () => {
				// Primary: Send postMessage to parent
				window.parent?.postMessage?.({ type: 'kairo-dataentry-close' }, '*');
				
				// Fallback: If parent is a Bootstrap modal iframe, try to close the modal directly
				try {
					const modalEl = window.frameElement?.closest?.('.modal');
					if (modalEl) {
						const modal = window.parent?.bootstrap?.Modal.getInstance(modalEl);
						if (modal) {
							modal.hide();
							return;
						}
					}
				} catch (e) {
					// Silently fail if fallback doesn't work
				}
			};

			document.querySelectorAll('[data-dataentry-close]').forEach((btn) => {
				btn.addEventListener('click', (e) => {
					e.preventDefault();
					e.stopPropagation();
					close();
				});
			});

			document.querySelectorAll('[data-cms-lookup]').forEach((btn) => {
				btn.addEventListener('click', () => {
					const which = btn.getAttribute('data-cms-lookup');
					window.alert('Lookup (' + which + ') is a UI stub in this prototype.');
				});
			});

			document.querySelectorAll('[data-cms-de-action]').forEach((btn) => {
				btn.addEventListener('click', () => {
					const type = btn.getAttribute('data-cms-de-action');
					if (type === 'cancel' || type === 'back') {
						close();
						return;
					}

					if (type === 'add') {
						window.alert('Add is a UI stub in this prototype.');
						return;
					}

					window.alert(type + ' is disabled in this prototype.');
				});
			});

			document.querySelectorAll('[data-cms-inline]').forEach((btn) => {
				btn.addEventListener('click', () => {
					const type = btn.getAttribute('data-cms-inline');
					window.alert(type + ' is disabled in this prototype.');
				});
			});

			// Section toggle behavior (matches standardized maintenance screens)
			document.querySelectorAll('[data-section-toggle]').forEach((header) => {
				header.addEventListener('click', (e) => {
					// Let interactive elements inside the header still work normally
					if (e.target && e.target.closest && e.target.closest('button')) {
						e.preventDefault();
					}

					const section = header.closest('.form-section');
					if (!section) return;

					section.classList.toggle('collapsed');
					const isExpanded = !section.classList.contains('collapsed');
					header.setAttribute('aria-expanded', String(isExpanded));
					const toggleBtn = header.querySelector('.section-toggle-btn');
					if (toggleBtn) toggleBtn.setAttribute('aria-expanded', String(isExpanded));
				});
			});
		})();
