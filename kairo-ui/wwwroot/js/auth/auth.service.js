class AuthService {
    /**
     * Attempt to log in with the provided credentials.
     * @param {string} operatorId 
     * @param {string} password 
     * @param {string} branchId 
     * @returns {Promise<{success: boolean, message?: string, data?: any}>}
     */
    static async login(operatorId, password, branchId) {
        const baseUrl = window.Environment?.baseUrlAuth || 'http://localhost:5177';
        const url = `${baseUrl}/api/Authentication/login`;
        const payload = {
            operatorID: operatorId,
            password: password,
            branchID: branchId
        };

        console.log('🔐 Auth Login Attempt:');
        console.log('  URL:', url);
        console.log('  Operator ID:', operatorId);
        console.log('  Branch:', branchId);

        // Hardcoded credentials for testing/demo
        if (operatorId === '101' && password === '1234') {
            console.log('🟢 Using hardcoded credentials');
            const mockEntity = {
                operatorID: operatorId,
                branchID: branchId,
                name: 'Test Administrator',
                roleName: 'System Admin',
                token: 'mock-jwt-token-for-dev-testing'
            };
            this.setSession(mockEntity);
            return { success: true, data: mockEntity };
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            console.log('✓ Auth Response Status:', response.status, response.statusText);

            // The API might return 200 with an error code inside, or 4xx/5xx
            // But let's check HTTP status first
            if (!response.ok) {
                // Try to read error message if possible
                const errorText = await response.text();
                throw new Error(`Server Error (${response.status}): ${errorText}`);
            }

            const data = await response.json();
            console.log('✓ Auth Response Data:', data);

            // Expected logic: statusCode 200 means success
            if (data.statusCode === 200 && data.entity) {
                this.setSession(data.entity);
                console.log('✓ Login successful, session saved');
                return { success: true, data: data.entity };
            } else {
                console.warn('⚠ Auth returned statusCode:', data.statusCode);
                return { success: false, message: data.message || 'Login failed' };
            }
        } catch (error) {
            console.error('❌ Login error:', error);
            console.error('❌ Error message:', error.message);
            console.error('❌ Auth server URL was:', url);
            return { success: false, message: error.message || 'Network connection failed' };
        }
    }

    /**
     * Save session data to local storage
     * @param {object} sessionData 
     */
    static setSession(sessionData) {
        const storageKey = 'nimble_auth_session';
        localStorage.setItem(storageKey, JSON.stringify(sessionData));
    }

    /**
     * Retrieve session data from local storage
     * @returns {object|null}
     */
    static getSession() {
        try {
            const storageKey = 'nimble_auth_session';
            const sessionStr = localStorage.getItem(storageKey);
            return sessionStr ? JSON.parse(sessionStr) : null;
        } catch (e) {
            console.warn("Corrupt session data", e);
            return null;
        }
    }

    /**
     * Clear user session
     */
    static logout() {
        const storageKey = 'nimble_auth_session';
        localStorage.removeItem(storageKey);
        // Use absolute path to prevent relative path resolution issues in nested modules
        const loginPath = '/login';
        // If inside an iframe, redirect the top window
        if (window.self !== window.top) {
            try {
                window.top.location.replace(loginPath);
            } catch (e) {
                window.location.replace(loginPath);
            }
        } else {
            window.location.replace(loginPath);
        }
    }

    /**
     * Check if user is legally authenticated
     * @returns {boolean}
     */
    static isAuthenticated() {
        //const session = this.getSession();
        // In production, we should check expiry (exp claim in token)
        //return !!session && !!session.token;
        return true;
    }

    /**
     * Generic fetch wrapper that adds Authorization header
     * @param {string} endpoint 
     * @param {object} options 
     */
    static async authFetch(endpoint, options = {}) {
        const session = this.getSession();
        if (!session || !session.token) {
            // Redirect to login if no token? Or let the caller handle it?
            // For now, let's just proceed or throw.
            throw new Error("No active session");
        }

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.token}`,
            ...(options.headers || {})
        };

        const baseUrl = window.Environment?.baseUrlAuth || 'http://localhost:5177';
        const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}/api${endpoint}`;

        const response = await fetch(url, { ...options, headers });
        if (response.status === 401) {
            // Token expired
            this.logout();
        }
        return response;
    }
}
window.AuthService = AuthService;
