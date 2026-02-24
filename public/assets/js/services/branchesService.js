(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  if (!CoreApi) {
    console.error("CoreApi is not loaded. Ensure coreApi.js is included before branchesService.js.");
    return;
  }

  const resolveOldApiEndpoint = () => {
    try {
      if (Environment.useLocalOldApiProxy === true) return '/api/OldAPI';
      const base = (Environment.baseUrlCommon || "").toString().replace(/\/+$/, "");
      return base ? `${base}/api/OldAPI` : '/api/OldAPI';
    } catch {
      return '/api/OldAPI';
    }
  };

  const formatLegacyRequestTime = (d = new Date()) => {
    const pad2 = (n) => String(n).padStart(2, "0");
    const mm = pad2(d.getMonth() + 1);
    const dd = pad2(d.getDate());
    const yyyy = d.getFullYear();
    const hh = pad2(d.getHours());
    const mi = pad2(d.getMinutes());
    const ss = pad2(d.getSeconds());
    return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
  };

  const BranchesService = {
    /**
     * Get Branches.
     * RequestData:
     * {
     *   OurBranchID: "BranchID",
     *   BankID: "BankID",
     *   BranchID: "BranchID",
     *   OperatorID: "OperatorID",
     *   Direction: "smallint"
     * }
     */
    getBranches(requestData = {}) {
      const formId = "dbo.p_GetBranches";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, "PROJECT_KAIRO");

      // Align with legacy sample payload.
      envelope.RequestID = formId;
      envelope.FormID = formId;
      envelope.FormId = formId;
      envelope.RequestTime = formatLegacyRequestTime();

      return CoreApi.post(resolveOldApiEndpoint(), envelope);
    }
  };

  global.BranchesService = BranchesService;
})(window);
