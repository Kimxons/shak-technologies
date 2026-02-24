(function (global) {
  if (global.__LoanPayoffLoaded) {
    console.warn("loan-payoff.js already loaded; skipping duplicate execution.");
    return;
  }
  global.__LoanPayoffLoaded = true;

  const formatMoney = (value) => {
    const number = Number(value);
    if (Number.isNaN(number)) return "0.00";
    return number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  function initEmbeddedState() {
    try {
      if (global.self !== global.top) {
        document.body.classList.add("lpo-embedded");
      }
    } catch {
      document.body.classList.add("lpo-embedded");
    }
  }

  function initLoanPayoff() {
    const form = document.getElementById("loanPayoffForm");
    if (!form) return;

    const modeBadge = form.querySelector("[data-form-mode]");

    const buttons = {
      view: form.querySelector("[data-action='view']"),
      add: form.querySelector("[data-action='add']"),
      save: form.querySelector("[data-action='save']"),
      cancel: form.querySelector("[data-action='cancel']"),
      denomination: form.querySelector("[data-action='denomination']"),
      print: form.querySelector("[data-action='print']"),
      proceed: form.querySelector("[data-action='proceed']")
    };

    const rowButtons = {
      new: form.querySelector("[data-row-action='new']"),
      alter: form.querySelector("[data-row-action='alter']"),
      remove: form.querySelector("[data-row-action='remove']"),
      update: form.querySelector("[data-row-action='update']"),
      clear: form.querySelector("[data-row-action='clear']")
    };

    const tables = {
      componentsBody: form.querySelector("[data-components-rows]"),
      componentsEmpty: form.querySelector("[data-components-empty]"),
      trxDetailBody: form.querySelector("[data-trxdetail-rows]"),
      trxDetailEmpty: form.querySelector("[data-trxdetail-empty]")
    };

    const fields = {
      branchId: form.elements.BranchID,
      clientId: form.elements.ClientID,
      accountId: form.elements.AccountID,
      loanSeries: form.elements.LoanSeries,

      transactionType: form.elements.TransactionType,
      till: form.elements.Till,
      contraBranchId: form.elements.ContraBranchID,
      accountType: form.elements.AccountType,
      contraAccountId: form.elements.ContraAccountID,
      referenceNo: form.elements.ReferenceNo,
      fixedAmount: form.elements.FixedAmount,
      localAmount: form.elements.LocalAmount,
      narration: form.elements.Narration,
      exchangeRate: form.elements.ExchangeRate,
      forexGainLoss: form.elements.ForexGainLoss,
      unpostedAmount: form.elements.UnpostedAmount,

      btsLoanAmount: form.elements.BTSLoanAmount,
      btsLoanBalance: form.elements.BTSLoanBalance,
      btsPreclosureStatus: form.elements.BTSPreclosureStatus,
      btsNetAmount: form.elements.BTSNetAmount,
      btsProductId: form.elements.BTSProductID,
      btsCurrencyId: form.elements.BTSCurrencyID
    };

    const state = {
      mode: "view",
      selectedTrxIndex: -1,
      components: [],
      trxDetails: []
    };

    const setBadge = (text, variant = "secondary") => {
      if (!modeBadge) return;
      modeBadge.textContent = text;
      modeBadge.className = `badge text-bg-${variant}`;
    };

    const setFormMode = (mode) => {
      state.mode = mode;
      const inputs = form.querySelectorAll("input, select, textarea");
      inputs.forEach((el) => {
        if (el.hasAttribute("readonly")) return;
        el.disabled = mode === "view";
      });

      // tabs should still be clickable in view mode.
      form.querySelectorAll(".nav-link").forEach((el) => (el.disabled = false));

      if (buttons.save) buttons.save.disabled = mode === "view";
      if (buttons.cancel) buttons.cancel.disabled = mode === "view";
      if (buttons.add) buttons.add.disabled = mode !== "view";

      Object.values(rowButtons).forEach((btn) => {
        if (!btn) return;
        btn.disabled = mode === "view";
      });
      if (buttons.proceed) buttons.proceed.disabled = mode === "view";

      setBadge(mode === "view" ? "View" : "Add", mode === "view" ? "secondary" : "primary");
    };

    const syncUnposted = () => {
      const sum = state.trxDetails.reduce((acc, row) => acc + Number(row.amount || 0), 0);
      if (fields.unpostedAmount) fields.unpostedAmount.value = sum ? formatMoney(sum) : "";
    };

    const renderComponents = () => {
      if (!tables.componentsBody) return;
      tables.componentsBody.innerHTML = "";

      if (!state.components.length) {
        tables.componentsEmpty?.classList.remove("d-none");
        return;
      }

      tables.componentsEmpty?.classList.add("d-none");

      state.components.forEach((row) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${row.component}</td>
          <td class="text-end">${formatMoney(row.actualAmount)}</td>
        `;
        tables.componentsBody.appendChild(tr);
      });
    };

    const renderTrxDetails = () => {
      if (!tables.trxDetailBody) return;
      tables.trxDetailBody.innerHTML = "";

      if (!state.trxDetails.length) {
        tables.trxDetailEmpty?.classList.remove("d-none");
        syncUnposted();
        return;
      }

      tables.trxDetailEmpty?.classList.add("d-none");

      state.trxDetails.forEach((row, index) => {
        const tr = document.createElement("tr");
        tr.className = index === state.selectedTrxIndex ? "table-active" : "";
        tr.innerHTML = `
          <td>${row.contraBranchId}</td>
          <td>${row.trxType}</td>
          <td>${row.accountType}</td>
          <td>${row.contraAccountId}</td>
          <td>${row.name}</td>
          <td class="text-end">${formatMoney(row.amount)}</td>
          <td class="text-end">${formatMoney(row.localAmount)}</td>
          <td class="text-end">${row.exchangeRate}</td>
          <td>${row.referenceNo}</td>
          <td>${row.trxDescription}</td>
        `;
        tr.addEventListener("click", () => {
          state.selectedTrxIndex = index;
          populateTrxEditorFromRow(row);
          renderTrxDetails();
        });
        tables.trxDetailBody.appendChild(tr);
      });

      syncUnposted();
    };

    const populateTrxEditorFromRow = (row) => {
      if (!row) return;
      if (fields.transactionType) fields.transactionType.value = row.trxType;
      if (fields.contraBranchId) fields.contraBranchId.value = row.contraBranchId;
      if (fields.accountType) fields.accountType.value = row.accountType;
      if (fields.contraAccountId) fields.contraAccountId.value = row.contraAccountId;
      if (fields.referenceNo) fields.referenceNo.value = row.referenceNo;
      if (fields.fixedAmount) fields.fixedAmount.value = row.amount;
      if (fields.localAmount) fields.localAmount.value = row.localAmount;
      if (fields.exchangeRate) fields.exchangeRate.value = row.exchangeRate;
      if (fields.narration) fields.narration.value = row.trxDescription;
    };

    const clearTrxEditor = () => {
      [
        "TransactionType",
        "Till",
        "ContraBranchID",
        "AccountType",
        "ContraAccountID",
        "ReferenceNo",
        "FixedAmount",
        "LocalAmount",
        "Narration",
        "ExchangeRate",
        "ForexGainLoss"
      ].forEach((name) => {
        if (form.elements[name]) form.elements[name].value = "";
      });
      // restore select defaults
      if (fields.transactionType) fields.transactionType.value = "Transfer";
      if (fields.accountType) fields.accountType.value = "Customer";
    };

    const handleNewRow = () => {
      if (state.mode === "view") return;
      state.selectedTrxIndex = -1;
      clearTrxEditor();
    };

    const handleUpdateRow = () => {
      if (state.mode === "view") return;

      const contraBranchId = String(fields.contraBranchId?.value || "").trim();
      const contraAccountId = String(fields.contraAccountId?.value || "").trim();
      const amount = Number(fields.fixedAmount?.value || 0);

      if (!contraBranchId) {
        alert("Contra Branch ID is required.");
        fields.contraBranchId?.focus();
        return;
      }
      if (!contraAccountId) {
        alert("Contra Account ID is required.");
        fields.contraAccountId?.focus();
        return;
      }
      if (!amount) {
        alert("Fixed Amount is required.");
        fields.fixedAmount?.focus();
        return;
      }

      const row = {
        contraBranchId,
        trxType: fields.transactionType?.value || "Transfer",
        accountType: fields.accountType?.value || "Customer",
        contraAccountId,
        name: contraAccountId ? `Account ${contraAccountId}` : "",
        amount,
        localAmount: Number(fields.localAmount?.value || amount),
        exchangeRate: String(fields.exchangeRate?.value || ""),
        referenceNo: String(fields.referenceNo?.value || ""),
        trxDescription: String(fields.narration?.value || "Loan Pay-off")
      };

      if (state.selectedTrxIndex >= 0) {
        state.trxDetails[state.selectedTrxIndex] = row;
      } else {
        state.trxDetails.push(row);
        state.selectedTrxIndex = state.trxDetails.length - 1;
      }

      renderTrxDetails();
    };

    const handleRemoveRow = () => {
      if (state.mode === "view") return;
      if (state.selectedTrxIndex < 0) {
        alert("Select a row to remove.");
        return;
      }
      state.trxDetails.splice(state.selectedTrxIndex, 1);
      state.selectedTrxIndex = -1;
      clearTrxEditor();
      renderTrxDetails();
    };

    const handleAlterRow = () => {
      if (state.mode === "view") return;
      if (state.selectedTrxIndex < 0) {
        alert("Select a row to alter.");
        return;
      }
      fields.contraAccountId?.focus();
    };

    const handleClearRow = () => {
      if (state.mode === "view") return;
      state.selectedTrxIndex = -1;
      clearTrxEditor();
      renderTrxDetails();
    };

    const validateProceed = () => {
      const clientId = String(fields.clientId?.value || "").trim();
      const accountId = String(fields.accountId?.value || "").trim();
      if (!clientId) {
        alert("Provide a Client ID.");
        fields.clientId?.focus();
        return false;
      }
      if (!accountId) {
        alert("Provide an Account ID.");
        fields.accountId?.focus();
        return false;
      }
      return true;
    };

    const handleProceed = () => {
      if (state.mode === "view") return;
      if (!validateProceed()) return;

      // Prototype: compute pay-off components based on current trx rows.
      const total = state.trxDetails.reduce((acc, r) => acc + Number(r.amount || 0), 0);
      state.components = [
        { component: "Principal", actualAmount: 0 },
        { component: "Interest", actualAmount: 0 },
        { component: "Penalty", actualAmount: 0 }
      ];

      if (fields.btsNetAmount) fields.btsNetAmount.value = total ? formatMoney(total) : "";
      if (fields.btsPreclosureStatus && !fields.btsPreclosureStatus.value) fields.btsPreclosureStatus.value = "Pending";
      if (fields.btsProductId && !fields.btsProductId.value) fields.btsProductId.value = "LN";
      if (fields.btsCurrencyId && !fields.btsCurrencyId.value) fields.btsCurrencyId.value = "KES";

      renderComponents();

      // Switch user back to components tab so it feels like legacy flow.
      const componentsTab = document.getElementById("tab-components");
      if (componentsTab && global.bootstrap?.Tab) {
        global.bootstrap.Tab.getOrCreateInstance(componentsTab).show();
      }
    };

    const handleSave = () => {
      if (state.mode === "view") return;
      console.log("Saving loan payoff (prototype)", {
        header: {
          BranchID: fields.branchId?.value,
          ClientID: fields.clientId?.value,
          AccountID: fields.accountId?.value,
          LoanSeries: fields.loanSeries?.value
        },
        trxDetails: state.trxDetails,
        components: state.components
      });
      alert("Saved (prototype). Hook up API when ready.");
      setFormMode("view");
    };

    const handleCancel = () => {
      if (state.mode === "view") return;
      if (!confirm("Cancel changes?")) return;
      state.trxDetails = [];
      state.components = [];
      state.selectedTrxIndex = -1;
      clearTrxEditor();
      renderTrxDetails();
      renderComponents();
      setFormMode("view");
    };

    const hookEvents = () => {
      form.querySelectorAll("[data-lookup]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const kind = btn.getAttribute("data-lookup");
          alert(`Lookup: ${kind} (prototype)`);
        });
      });

      buttons.view?.addEventListener("click", () => setFormMode("view"));
      buttons.add?.addEventListener("click", () => setFormMode("add"));
      buttons.save?.addEventListener("click", handleSave);
      buttons.cancel?.addEventListener("click", handleCancel);

      buttons.denomination?.addEventListener("click", () => alert("Denomination (prototype)."));
      buttons.print?.addEventListener("click", () => global.print());
      buttons.proceed?.addEventListener("click", handleProceed);

      rowButtons.new?.addEventListener("click", handleNewRow);
      rowButtons.alter?.addEventListener("click", handleAlterRow);
      rowButtons.remove?.addEventListener("click", handleRemoveRow);
      rowButtons.update?.addEventListener("click", handleUpdateRow);
      rowButtons.clear?.addEventListener("click", handleClearRow);
    };

    // default state
    setFormMode("view");
    renderComponents();
    renderTrxDetails();
    clearTrxEditor();
    hookEvents();
  }

  initEmbeddedState();
  global.addEventListener("DOMContentLoaded", initLoanPayoff);
})(window);
