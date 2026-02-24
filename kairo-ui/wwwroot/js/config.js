(function (global) {
  // Get environment settings (loaded from environment.js)
  const env = global.Environment || {};

  // ============================
  // APPLICATION CONFIG
  // ============================
  const config = {
    appName: "CLIENT_DATA",
    environment: env.name || "LOCAL",
    enableLogging: !env.production,
    requestDefaults: {
      channel: "WEB_PORTAL",
      locale: "en-KE"
    },

    // API Endpoints (for backward compatibility)
    // Note: Services should now use Environment directly
    apiHostUrl: env.baseUrlSystemCodes || "http://localhost:5059",
    apiBaseUrl: env.baseUrlAuth ? `${env.baseUrlAuth}/api` : "http://localhost:5177/api",
    clientUrl: env.baseUrlClient || "http://localhost:6902",
    oldApiUrl: env.baseUrlOldApi || "http://localhost:3306",

    // Authentication
    auth: {
      endpoints: {
        login: "/api/Authentication/login"
      },
      storageKey: "nimble_auth_session"
    }
  };

  // ============================
  // UAT ENVIRONMENT (EXAMPLE)
  // Uncomment this block and comment the LOCAL one when deploying to UAT
  // ============================
  // const config = {
  //   appName: "CLIENT_DATA",
  //   environment: "UAT",
  //   enableLogging: true,
  //   requestDefaults: {
  //     channel: "WEB_PORTAL",
  //     locale: "en-KE"
  //   },
  //
  //   apiHostUrl: "http://172.17.40.51:5059",
  //   apiBaseUrl: "http://172.17.40.51:5177/api",
  //   clientUrl: "http://172.17.50.10:6902",
  //
  //   auth: {
  //     endpoints: {
  //       login: "/Authentication/login"
  //     },
  //     storageKey: "nimble_auth_session"
  //   }
  // };

  // ============================
  // PROD ENVIRONMENT (EXAMPLE)
  // ============================
  // const config = {
  //   appName: "CLIENT_DATA",
  //   environment: "PROD",
  //   enableLogging: false,
  //   requestDefaults: {
  //     channel: "WEB_PORTAL",
  //     locale: "en-KE"
  //   },
  //
  //   apiHostUrl: "http://your-prod-host:5059",
  //   apiBaseUrl: "http://your-prod-host:5177/api",
  //   clientUrl: "http://your-client-host:6902",
  //
  //   auth: {
  //     endpoints: {
  //       login: "/Authentication/login"
  //     },
  //     storageKey: "nimble_auth_session"
  //   }
  // };

  global.CoreBankingConfig = Object.freeze(config);
})(window);
