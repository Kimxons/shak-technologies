(function (global) {
  const BANK_USER_CODE_TYPES = [
    { ID: "BankChargeTypeID", Description: "Bank Charge Type" },
    { ID: "BankRegionID", Description: "Bank Region" },
    { ID: "BIN", Description: "BIN (Bank Identification Number)" },
    { ID: "ClearingCenterID", Description: "Clearing Center" },
    { ID: "GLTypeGroupID", Description: "GL Type Group" },
    { ID: "LOCALE", Description: "Locale" },
    { ID: "WFChargeID", Description: "WF Charge" },
    { ID: "LimitTypeID", Description: "Limit Type" },
    { ID: "DPDefinitionID", Description: "DP Definition" },
    { ID: "CollateralCategoryID", Description: "Collateral Category" },
    { ID: "CollateralTypeID", Description: "Collateral Type" },
    { ID: "CollateralValueTypeID", Description: "Collateral Value Type" },
    { ID: "PaymentTypeID", Description: "Payment Type" },
    { ID: "TransactionTypeID", Description: "Transaction Type" },
    { ID: "TrxCategoryID", Description: "Transaction Category" },
    { ID: "ClientTypeID", Description: "Client Type" },
    { ID: "TitleID", Description: "Title" },
    { ID: "GenderID", Description: "Gender" },
    { ID: "MaritalStatusID", Description: "Marital Status" },
    { ID: "IdentificationTypeID", Description: "Identification Type" },
    { ID: "RelationID", Description: "Relation" },
    { ID: "OccupationID", Description: "Occupation" },
    { ID: "SectorID", Description: "Sector" },
    { ID: "SubSectorID", Description: "Sub Sector" },
    { ID: "PurposeID", Description: "Purpose" },
    { ID: "BusinessLineID", Description: "Business Line" },
    { ID: "GuarantorTypeID", Description: "Guarantor Type" },
    { ID: "AccountTypeID", Description: "Account Type" },
    { ID: "GLAccountTypeID", Description: "GL Account Type" },
    { ID: "NatureOfChargeID", Description: "Nature Of Charge" },
    { ID: "CityID", Description: "City" },
    { ID: "CountryID", Description: "Country" },
    { ID: "BDTypeID", Description: "Bill Discounting Type" },
    { ID: "AllocationTypeID", Description: "Allocation Type" },
    { ID: "CashOrTrf", Description: "Cash Or Transfer" },
    { ID: "LoanPeriodID", Description: "Loan Period" },
    { ID: "LoanTypeID", Description: "Loan Type" },
    { ID: "BankTypeID", Description: "Bank Type" },
    { ID: "ResidentID", Description: "Resident Status" },
    { ID: "LiteracyLevelID", Description: "Literacy Level" },
    { ID: "BuildingTypeID", Description: "Building Type" },
    { ID: "SupervisionCategoryID", Description: "Supervision Category" }
  ];

  const svc = (global.SystemUtilitiesService = global.SystemUtilitiesService || {});

  const BRANCH_USER_CODE_TYPES_URL = "/StaticData/BranchUserCode/api/code-types";
  let branchUserCodeTypesCache = null;
  let branchUserCodeTypesPromise = null;

  function postJson(url, payload) {
    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest"
      },
      credentials: "same-origin",
      body: JSON.stringify(payload || {})
    }).then(function (response) {
      if (!response.ok) {
        throw new Error("Request failed with status " + response.status);
      }
      return response.json();
    });
  }

  function extractCodeTypeOptions(response) {
    const payload = response && (response.Data || response.data || response);
    const values = payload && (payload.Data || payload.data || payload);
    return Array.isArray(values) ? values : [];
  }

  svc.getBankUserCodeTypes = function getBankUserCodeTypes() {
    return Promise.resolve(BANK_USER_CODE_TYPES.slice());
  };

  svc.findBankUserCodeType = function findBankUserCodeType(codeId) {
    const normalizedCodeId = String(codeId || "").trim().toLowerCase();
    if (!normalizedCodeId) {
      return null;
    }

    return BANK_USER_CODE_TYPES.find(function (item) {
      return String(item.ID || "").trim().toLowerCase() === normalizedCodeId;
    }) || null;
  };

  svc.searchBankUserCodeTypes = function searchBankUserCodeTypes(criteria) {
    const searchCriteria = criteria || {};
    const codeIdValue = String(searchCriteria.codeId || "").trim().toLowerCase();
    const codeIdMode = String(searchCriteria.codeIdMode || "Like").trim().toLowerCase();
    const descriptionValue = String(searchCriteria.description || "").trim().toLowerCase();
    const descriptionMode = String(searchCriteria.descriptionMode || "Like").trim().toLowerCase();

    const results = BANK_USER_CODE_TYPES.filter(function (item) {
      const itemId = String(item.ID || "").toLowerCase();
      const itemDescription = String(item.Description || "").toLowerCase();

      if (codeIdValue) {
        const codeIdMatches = codeIdMode === "exact"
          ? itemId === codeIdValue
          : itemId.indexOf(codeIdValue) >= 0;

        if (!codeIdMatches) {
          return false;
        }
      }

      if (descriptionValue) {
        const descriptionMatches = descriptionMode === "exact"
          ? itemDescription === descriptionValue
          : itemDescription.indexOf(descriptionValue) >= 0;

        if (!descriptionMatches) {
          return false;
        }
      }

      return true;
    });

    return Promise.resolve(results);
  };

  svc.getBranchUserCodeTypes = function getBranchUserCodeTypes(options) {
    const config = options || {};

    if (!config.forceRefresh && Array.isArray(branchUserCodeTypesCache)) {
      return Promise.resolve(branchUserCodeTypesCache.slice());
    }

    if (!config.forceRefresh && branchUserCodeTypesPromise) {
      return branchUserCodeTypesPromise.then(function (items) {
        return items.slice();
      });
    }

    branchUserCodeTypesPromise = postJson(BRANCH_USER_CODE_TYPES_URL, {})
      .then(function (response) {
        const items = extractCodeTypeOptions(response);
        branchUserCodeTypesCache = items.slice();
        return branchUserCodeTypesCache;
      })
      .finally(function () {
        branchUserCodeTypesPromise = null;
      });

    return branchUserCodeTypesPromise.then(function (items) {
      return items.slice();
    });
  };

  svc.findBranchUserCodeType = function findBranchUserCodeType(codeId) {
    const normalizedCodeId = String(codeId || "").trim().toLowerCase();
    if (!normalizedCodeId || !Array.isArray(branchUserCodeTypesCache)) {
      return null;
    }

    return branchUserCodeTypesCache.find(function (item) {
      return String(item.ID || "").trim().toLowerCase() === normalizedCodeId;
    }) || null;
  };

  svc.searchBranchUserCodeTypes = function searchBranchUserCodeTypes(criteria) {
    const searchCriteria = criteria || {};
    const codeIdValue = String(searchCriteria.codeId || "").trim().toLowerCase();
    const codeIdMode = String(searchCriteria.codeIdMode || "Like").trim().toLowerCase();
    const descriptionValue = String(searchCriteria.description || "").trim().toLowerCase();
    const descriptionMode = String(searchCriteria.descriptionMode || "Like").trim().toLowerCase();

    return svc.getBranchUserCodeTypes().then(function (items) {
      const results = (items || []).filter(function (item) {
        const itemId = String(item.ID || "").toLowerCase();
        const itemDescription = String(item.Description || "").toLowerCase();

        if (codeIdValue) {
          const codeIdMatches = codeIdMode === "exact"
            ? itemId === codeIdValue
            : itemId.indexOf(codeIdValue) >= 0;

          if (!codeIdMatches) {
            return false;
          }
        }

        if (descriptionValue) {
          const descriptionMatches = descriptionMode === "exact"
            ? itemDescription === descriptionValue
            : itemDescription.indexOf(descriptionValue) >= 0;

          if (!descriptionMatches) {
            return false;
          }
        }

        return true;
      });

      return results;
    });
  };

})(window);
