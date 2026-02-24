// ============================================================
// AI Service - MCP Server Integration
// ============================================================
// Handles communication with the MCP AI server for intelligent
// responses based on user context and banking data
// ============================================================

(function (global) {
    const Environment = global.Environment || {};

    if (!Environment.baseUrlMcp) {
        console.error("❌ [AiService] baseUrlMcp is not configured in Environment");
        return;
    }

    // Get MCP server base URL
    const MCP_BASE_URL = Environment.baseUrlMcp.replace(/\/+$/, "");

    // Define endpoints
    const endpoints = {
        ask: `${MCP_BASE_URL}/api/ask`
    };

    // Generate unique session IDs
    const generateSessionId = () => {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    };

    /**
     * AI Service for MCP server communication
     */
    const AiService = {
        /**
         * Ask a question to the MCP AI server
         * @param {string} question - The user's question
         * @param {object} context - User context (ClientID, BankID, UserID, etc.)
         * @param {string} sessionId - Optional session ID for conversation continuity
         * @returns {Promise<object>} { success: boolean, answer: string, error?: string }
         */
        async ask(question, context = {}, sessionId = null) {
            // Validate inputs
            if (!question || typeof question !== 'string' || !question.trim()) {
                return {
                    success: false,
                    answer: "",
                    error: "Question cannot be empty"
                };
            }

            // Use provided session ID or generate new one
            const sid = sessionId || generateSessionId();

            // Build request payload matching MCP server format
            const payload = {
                session_id: sid,
                question: question.trim(),
                context: {
                    ClientID: context.ClientID || Environment.defaultClientId || "",
                    BankID: context.BankID || Environment.defaultBankId || "00",
                    UserID: context.UserID || Environment.UserID || "GUEST",
                    OurBranchID: context.OurBranchID || Environment.OurBranchID || "",
                    // Include any additional context
                    ...context
                }
            };

            console.log("🤖 [AiService] Sending question to MCP server:", {
                endpoint: endpoints.ask,
                question: question,
                sessionId: sid
            });

            try {
                const response = await fetch(endpoints.ask, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error("❌ [AiService] MCP server error:", {
                        status: response.status,
                        statusText: response.statusText,
                        body: errorText
                    });

                    return {
                        success: false,
                        answer: "",
                        error: `Server error: ${response.status} ${response.statusText}`
                    };
                }

                const result = await response.json();

                console.log("✅ [AiService] MCP server response:", result);

                // MCP server returns { answer: "..." }
                if (result.answer) {
                    return {
                        success: true,
                        answer: result.answer,
                        sessionId: sid
                    };
                } else {
                    return {
                        success: false,
                        answer: "",
                        error: "No answer received from server"
                    };
                }

            } catch (error) {
                console.error("❌ [AiService] Network error:", error);
                return {
                    success: false,
                    answer: "",
                    error: `Network error: ${error.message}`
                };
            }
        },

        /**
         * Get current session context from page/environment
         * @returns {object} Context object with user/client information
         */
        getCurrentContext() {
            // Try to get context from various sources
            const context = {
                ClientID: sessionStorage.getItem('currentClientId') || 
                          Environment.defaultClientId || "",
                BankID: sessionStorage.getItem('currentBankId') || 
                        Environment.defaultBankId || "00",
                UserID: sessionStorage.getItem('currentUserId') || 
                        Environment.UserID || "GUEST",
                OurBranchID: sessionStorage.getItem('currentBranchId') || 
                             Environment.OurBranchID || ""
            };

            console.log("📋 [AiService] Current context:", context);
            return context;
        },

        /**
         * LEGACY METHOD - For backward compatibility
         * @deprecated Use ask() instead
         */
        async sendMessage(message) {
            console.warn("⚠️ [AiService] sendMessage() is deprecated. Use ask() instead.");
            const context = this.getCurrentContext();
            return this.ask(message, context);
        }
    };

    // Expose to global scope
    global.AiService = AiService;

    console.log("✅ [AiService] Initialized successfully with MCP server");

})(window);
