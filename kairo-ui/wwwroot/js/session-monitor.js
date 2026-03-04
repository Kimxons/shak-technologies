/**
 * Session Expiry Monitor
 * Monitors HTTP response codes and checks session status
 * Shows re-authentication modal when session expires
 * Allows user to re-authenticate or logout
 */

(function() {
    // Configuration
    const config = {
        checkInterval: 30000,  // Check session every 30 seconds
        warningThreshold: 60000,  // Warn user 1 minute before expiry
        sessionTimeoutMs: 30 * 60 * 1000,  // Default 30 min (will be overridden by server config)
        apiEndpoint: '/api/session'
    };

    let sessionCheckInterval;
    let isShowingModal = false;
    let sessionLastActivityTime = Date.now();

    /**
     * Initialize session monitor
     */
    function initializeSessionMonitor() {
        console.log('[SessionMonitor] Initializing session expiry monitor');

        // Intercept all HTTP requests to detect 401/403 responses
        interceptHttpRequests();

        // Start periodic session check
        startSessionCheckInterval();

        // Track user activity
        trackUserActivity();

        // Set up event listeners
        setupEventListeners();
    }

    /**
     * Intercept HTTP requests to detect session expiry (401/403)
     */
    function interceptHttpRequests() {
        // For Fetch API
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
            return originalFetch.apply(this, args)
                .then(response => {
                    if (response.status === 401 || response.status === 403) {
                        console.log('[SessionMonitor] Detected 401/403 response - Session likely expired');
                        showSessionExpiredModal();
                    }
                    return response;
                })
                .catch(error => {
                    console.error('[SessionMonitor] Fetch error:', error);
                    throw error;
                });
        };

        // For jQuery AJAX (if used)
        if (window.jQuery) {
            jQuery(document).ajaxError(function(event, jqXHR) {
                if (jqXHR.status === 401 || jqXHR.status === 403) {
                    console.log('[SessionMonitor] Detected 401/403 via jQuery - Session expired');
                    showSessionExpiredModal();
                }
            });
        }
    }

    /**
     * Start periodic session check interval
     */
    function startSessionCheckInterval() {
        if (sessionCheckInterval) {
            clearInterval(sessionCheckInterval);
        }

        sessionCheckInterval = setInterval(async function() {
            if (isShowingModal) {
                return;  // Don't check if modal is already showing
            }

            try {
                const response = await fetch(`${config.apiEndpoint}/check`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.json();

                if (!data.isValid) {
                    console.log('[SessionMonitor] Session check indicates expired session');
                    showSessionExpiredModal();
                } else {
                    console.log('[SessionMonitor] Session is valid');
                    sessionLastActivityTime = Date.now();
                }
            } catch (error) {
                console.error('[SessionMonitor] Error checking session:', error);
            }
        }, config.checkInterval);
    }

    /**
     * Track user activity to detect idle sessions
     */
    function trackUserActivity() {
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

        events.forEach(event => {
            document.addEventListener(event, function() {
                sessionLastActivityTime = Date.now();
            }, false);
        });
    }

    /**
     * Setup modal event listeners
     */
    function setupEventListeners() {
        // Close button
        const closeBtn = document.getElementById('sessionExpiredClose');
        if (closeBtn) {
            closeBtn.addEventListener('click', handleModalCancel);
        }

        // Cancel button
        const cancelBtn = document.getElementById('sessionExpiredCancel');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', handleModalCancel);
        }

        // Re-authenticate button
        const submitBtn = document.getElementById('sessionExpiredSubmit');
        if (submitBtn) {
            submitBtn.addEventListener('click', handleReAuthenticate);
        }

        // Password field - allow Enter key to submit
        const passwordInput = document.getElementById('sessionExpiredPassword');
        if (passwordInput) {
            passwordInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    handleReAuthenticate();
                }
            });
        }
    }

    /**
     * Show session expired modal
     */
    async function showSessionExpiredModal() {
        if (isShowingModal) {
            return;  // Modal already showing
        }

        isShowingModal = true;
        console.log('[SessionMonitor] Displaying session expiry modal');

        // Get current user information
        try {
            const response = await fetch(`${config.apiEndpoint}/current-user`, {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const userData = await response.json();
                updateModalWithUserInfo(userData.username);
            } else {
                updateModalWithUserInfo('User');
            }
        } catch (error) {
            console.error('[SessionMonitor] Error fetching user info:', error);
            updateModalWithUserInfo('User');
        }

        // Show the modal
        const modal = document.getElementById('sessionExpiredModal');
        if (modal) {
            modal.style.display = 'block';
            // Focus password field
            const passwordInput = document.getElementById('sessionExpiredPassword');
            if (passwordInput) {
                passwordInput.focus();
                passwordInput.value = '';  // Clear any previous input
            }
        }

        // Clear session check interval while modal is showing
        if (sessionCheckInterval) {
            clearInterval(sessionCheckInterval);
        }
    }

    /**
     * Update modal with user information
     */
    function updateModalWithUserInfo(username) {
        const usernameDisplay = document.getElementById('sessionExpiredUsername');
        if (usernameDisplay) {
            usernameDisplay.textContent = username;
        }
    }

    /**
     * Handle modal cancel/close
     */
    function handleModalCancel() {
        console.log('[SessionMonitor] User declined re-authentication - redirecting to login');

        const modal = document.getElementById('sessionExpiredModal');
        if (modal) {
            modal.style.display = 'none';
        }

        isShowingModal = false;

        // Redirect to login
        redirectToLogin();
    }

    /**
     * Handle re-authentication attempt
     */
    async function handleReAuthenticate() {
        const passwordInput = document.getElementById('sessionExpiredPassword');
        const password = passwordInput?.value;

        if (!password) {
            showModalError('Password is required');
            return;
        }

        // Disable button and show loading state
        const submitBtn = document.getElementById('sessionExpiredSubmit');
        const originalText = submitBtn?.textContent;
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Authenticating...';
        }

        try {
            const response = await fetch(`${config.apiEndpoint}/renew`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    password: password,
                    branchId: getBranchIdFromPage()
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                console.log('[SessionMonitor] Session renewed successfully');
                
                // Hide modal and continue
                const modal = document.getElementById('sessionExpiredModal');
                if (modal) {
                    modal.style.display = 'none';
                }

                isShowingModal = false;

                // Clear password field
                if (passwordInput) {
                    passwordInput.value = '';
                }

                // Restart session check
                startSessionCheckInterval();

                // Show success message
                showModalSuccess('Session renewed. You can continue working.');

                // Reload page or restore previous state
                window.location.reload();
            } else {
                console.log('[SessionMonitor] Re-authentication failed:', data.message);
                showModalError(data.message || 'Invalid credentials. Please try again.');
            }
        } catch (error) {
            console.error('[SessionMonitor] Error during re-authentication:', error);
            showModalError('Error: ' + error.message);
        } finally {
            // Re-enable button
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText || 'Re-Authenticate';
            }
        }
    }

    /**
     * Show error message in modal
     */
    function showModalError(message) {
        const errorElem = document.getElementById('sessionExpiredError');
        if (errorElem) {
            errorElem.textContent = message;
            errorElem.style.display = 'block';
        }
    }

    /**
     * Show success message
     */
    function showModalSuccess(message) {
        // You could show a toast notification here
        console.log('[SessionMonitor] Success:', message);
    }

    /**
     * Get branch ID from page (if available)
     */
    function getBranchIdFromPage() {
        // Try to get branch ID from various sources
        const branchInput = document.getElementById('branchId') || 
                          document.querySelector('[data-branch-id]') ||
                          document.querySelector('input[name="BranchId"]');
        
        return branchInput ? branchInput.value : 0;
    }

    /**
     * Redirect to login page
     */
    function redirectToLogin() {
        console.log('[SessionMonitor] Redirecting to login');
        window.location.href = '/login';
    }

    /**
     * Expose public API
     */
    window.SessionMonitor = {
        init: initializeSessionMonitor,
        showModal: showSessionExpiredModal,
        checkSession: function() {
            return fetch(`${config.apiEndpoint}/check`, {
                method: 'GET',
                credentials: 'include'
            }).then(r => r.json());
        },
        renewSession: function(password, branchId) {
            return fetch(`${config.apiEndpoint}/renew`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, branchId })
            }).then(r => r.json());
        }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeSessionMonitor);
    } else {
        initializeSessionMonitor();
    }
})();
