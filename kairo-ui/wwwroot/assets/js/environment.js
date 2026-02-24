
(function (global) {

  const environment = {
    production: false,
    name: 'LOCAL',

    // Base URLs for different services
    baseUrlAuth: "http://172.17.50.10:6802",
    baseUrlClient: "http://172.16.2.31:3306",
    baseUrlClientDocuments: "http://172.16.2.31:5102",
    baseUrlClient: "http://172.16.2.31:3306",
    baseUrlClientDocuments: "http://172.16.2.31:5102",
    baseUrlClientSpm: "http://172.16.2.31:3306",
    baseUrlSystemCodes: "http://172.16.2.31:3306",
    baseUrlCommon: "http://172.16.2.31:3306",
    baseUrlMicroFinance: "http://172.16.2.31:3308",
    baseUrlProduct: "http://172.16.2.31:3306",
    baseUrlOtherModules: "http://172.16.2.31:3306", // Bank Account Maintenance, etc.
    baseUrlCharges: "http://172.16.2.31:3306",
    baseUrlAccount: "http://172.16.2.31:3307",
    baseUrlImageDetection: "http://172.17.50.15:5104", // Face and signature detection API
    workingDate: "2025-05-08",
    // Temporary default until authentication/session wiring is complete
    defaultBankId: "00",
    OurBranchID: "0603",
    defaultOurBranchId: "0101",
    UserID: "KAIROADMIN",
  };

  // ============================
  // TEST/DEV ENVIRONMENT
  // ============================
  //  const environment = {
  //    production: false,
  //    name: 'TEST',
    
  //    // Base URLs for different services - UPDATE THESE WITH YOUR TEST SERVER IPs/DOMAINS
  //   baseUrlAuth: "http://172.17.50.10:6802",
  //   baseUrlClient: "http://172.17.50.15:3306",
  //   baseUrlClientDocuments: "http://172.17.50.15:5102",
  //   baseUrlClient: "http://172.17.50.15:3306",
  //   baseUrlClientDocuments: "http://172.17.50.15:5102",
  //   baseUrlClientSpm: "http://172.17.50.15:3306",
  //   baseUrlSystemCodes: "http://172.17.50.15:3306",
  //   baseUrlCommon: "http://172.17.50.15:3306",
  //   baseUrlMicroFinance: "http://172.17.50.15:3308",
  //   baseUrlProduct: "http://172.17.50.15:3306",
  //   baseUrlOtherModules: "http://172.17.50.15:3306", // Bank Account Maintenance, etc.
  //   baseUrlCharges: "http://172.17.50.15:3306",
  //   baseUrlAccount: "http://172.17.50.15:3307",
  //   baseUrlImageDetection: "http://172.17.50.15:5104", // Face and signature detection API
  //   workingDate: "2025-05-08",
  //   // Temporary default until authentication/session wiring is complete
  //   defaultBankId: "00",
  //   OurBranchID: "0603",
  //   defaultOurBranchId: "0101",
  //   UserID: "KAIROADMIN",
  //  };

  // ============================
  // UAT ENVIRONMENT
  // ============================
  // const environment = {
  //   production: false,
  //   name: 'UAT',
  //   
  //   // Base URLs for different services
  //   baseUrlAuth: "http://172.17.50.10:5177",
  //   baseUrlClient: "http://172.17.50.10:6902",
  //   baseUrlSystemCodes: "http://172.17.50.10:5059"
  // };

  global.Environment = environment;

  console.log(`🌍 Environment: ${environment.name}`);
})(window);
