(function (global) {
  if (global.__LoanWriteOffLoaded) {
    console.warn("loan-write-off.js already loaded; skipping duplicate execution.");
    return;
  }
  global.__LoanWriteOffLoaded = true;

  const formatMoney = (value) => {
    const number = Number(value);
    if (Number.isNaN(number)) return "0.00";
    return number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  function initEmbeddedState() {
    try {
      if (global.self !== global.top) {
        document.body.classList.add("lwo-embedded");
      }
    } catch {
      document.body.classList.add("lwo-embedded");
    }
  }

  function initLoanWriteOff() {
    const form = document.getElementById("loanWriteOffForm");
    if (!form) return;

    const modeBadge = form.querySelector("[data-form-mode]");

    const actionButtons = {
      view: form.querySelector("[data-action='view']"),
      add: form.querySelector("[data-action='add']"),
      save: form.querySelector("[data-action='save']"),
      cancel: form.querySelector("[data-action='cancel']"),
      generate: form.querySelector("[data-action='generate']")
    };

    const componentRowsBody = form.querySelector("[data-component-rows]");
    const componentEmpty = form.querySelector("[data-component-empty]");
    const trxRowsBody = form.querySelector("[data-trx-rows]");
    const trxEmpty = form.querySelector("[data-trx-empty]");

    const fields = {
      branchId: form.elements.BranchID,
      branchName: form.elements.BranchName,
      clientId: form.elements.ClientID,
      accountId: form.elements.AccountID,
      loanSeries: form.elements.LoanSeries,
      remarks: form.elements.Remarks,
      btsLoanAmount: form.elements.BTSLoanAmount,
      btsProductId: form.elements.BTSProductID,
      btsMaturityDate: form.elements.BTSMaturityDate,
      btsLoanBalance: form.elements.BTSLoanBalance,
      btsCurrencyId: form.elements.BTSCurrencyID,
      btsArrearDays: form.elements.BTSArrearDays,
      btsRiskClassification: form.elements.BTSRiskClassification
    };

    const state = {
      mode: "view",
      components: [],
      transactions: []
    };

    const setBadge = (text, variant = "secondary") => {
      if (!modeBadge) return;
      modeBadge.textContent = text;
      modeBadge.className = `lwo-modebadge badge text-bg-${variant}`;
    };

    const setFormMode = (mode) => {
      state.mode = mode;

      const inputs = form.querySelectorAll("input, select, textarea");
      inputs.forEach((el) => {
        if (el.hasAttribute("readonly")) return;
        el.disabled = mode === "view";
      });

      if (actionButtons.generate) actionButtons.generate.disabled = mode === "view";
      if (actionButtons.save) actionButtons.save.disabled = mode === "view";
      if (actionButtons.cancel) actionButtons.cancel.disabled = mode === "view";
      if (actionButtons.add) actionButtons.add.disabled = mode !== "view";

      setBadge(mode === "view" ? "View" : "Add", mode === "view" ? "secondary" : "primary");
    };

    const renderComponents = () => {
      if (!componentRowsBody) return;
      componentRowsBody.innerHTML = "";

      if (!state.components.length) {
        componentEmpty?.classList.remove("d-none");
        return;
      }

      componentEmpty?.classList.add("d-none");

      state.components.forEach((row) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${row.component}</td>
          <td class="text-end">${formatMoney(row.actualAmount)}</td>
          <td class="text-end">${formatMoney(row.settlementAmount)}</td>
          <td>${row.isEditable ? "True" : "False"}</td>
        `;
        componentRowsBody.appendChild(tr);
      });
    };

    const renderTransactions = () => {
      if (!trxRowsBody) return;
      trxRowsBody.innerHTML = "";

      if (!state.transactions.length) {
        trxEmpty?.classList.remove("d-none");
        return;
      }

      trxEmpty?.classList.add("d-none");

      state.transactions.forEach((row) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${row.accountType}</td>
          <td>${row.branchId}</td>
          <td>${row.accountId}</td>
          <td>${row.name}</td>
          <td>${row.description}</td>
          <td>${row.transactionType}</td>
          <td class="text-end">${formatMoney(row.amount)}</td>
          <td class="text-end">${formatMoney(row.localAmount)}</td>
        `;
        trxRowsBody.appendChild(tr);
      });
    };

    const syncBehindTheScene = () => {
      // Placeholder values for prototype.
      const loanAmount = 0;
      const balance = 0;

      if (fields.btsLoanAmount) fields.btsLoanAmount.value = loanAmount ? formatMoney(loanAmount) : "";
      if (fields.btsLoanBalance) fields.btsLoanBalance.value = balance ? formatMoney(balance) : "";
      if (fields.btsProductId && !fields.btsProductId.value) fields.btsProductId.value = "LN";
      if (fields.btsMaturityDate && !fields.btsMaturityDate.value) fields.btsMaturityDate.value = "";
      if (fields.btsCurrencyId && !fields.btsCurrencyId.value) fields.btsCurrencyId.value = "KES";
      if (fields.btsArrearDays && !fields.btsArrearDays.value) fields.btsArrearDays.value = "0";
      if (fields.btsRiskClassification && !fields.btsRiskClassification.value) fields.btsRiskClassification.value = "Normal";
    };

    const validateGenerate = () => {
      const accountId = String(fields.accountId?.value || "").trim();
      const clientId = String(fields.clientId?.value || "").trim();

      if (!clientId) {
        alert("Provide a Client ID before generating.");
        fields.clientId?.focus();
        return false;
      }

      if (!accountId) {
        alert("Provide an Account ID before generating.");
        fields.accountId?.focus();
        return false;
      }

      return true;
    };

    const handleGenerate = () => {
      if (state.mode === "view") return;
      if (!validateGenerate()) return;

      // Demo data based on the legacy screen structure.
      state.components = [
        { component: "Principal", actualAmount: 0, settlementAmount: 0, isEditable: true },
        { component: "Interest", actualAmount: 0, settlementAmount: 0, isEditable: true },
        { component: "Penalty", actualAmount: 0, settlementAmount: 0, isEditable: false }
      ];

      state.transactions = [
        {
          accountType: "Customer",
          branchId: fields.branchId?.value || "0101",
          accountId: fields.accountId?.value || "",
          name: fields.clientId?.value ? `Client ${fields.clientId.value}` : "",
          description: "Loan write off",
          transactionType: "JV",
          amount: 0,
          localAmount: 0
        }
      ];

      renderComponents();
      renderTransactions();
      syncBehindTheScene();
    };

    const clearEditableFields = () => {
      ["ClientID", "AccountID", "LoanSeries", "Remarks"].forEach((name) => {
        if (form.elements[name]) form.elements[name].value = "";
      });

      state.components = [];
      state.transactions = [];

      renderComponents();
      renderTransactions();
      syncBehindTheScene();
    };

    const handleSave = () => {
      if (state.mode === "view") return;

      if (!state.components.length && !state.transactions.length) {
        alert("Nothing to save. Click Generate first.");
        return;
      }

      console.log("Saving loan write off (prototype)", {
        header: {
          BranchID: fields.branchId?.value,
          ClientID: fields.clientId?.value,
          AccountID: fields.accountId?.value,
          LoanSeries: fields.loanSeries?.value,
          Remarks: fields.remarks?.value
        },
        components: state.components,
        transactions: state.transactions
      });

      alert("Saved (prototype). Hook up API when ready.");
      setFormMode("view");
    };

    const hookEvents = () => {
      form.querySelectorAll("[data-lookup]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const kind = btn.getAttribute("data-lookup");
          alert(`Lookup (${kind}) not wired yet.`);
        });
      });

      actionButtons.view?.addEventListener("click", () => setFormMode("view"));
      actionButtons.add?.addEventListener("click", () => {
        clearEditableFields();
        setFormMode("add");
        fields.clientId?.focus();
      });
      actionButtons.cancel?.addEventListener("click", () => {
        if (state.mode === "view") return;
        if (confirm("Cancel changes? Unsaved changes will be lost.")) {
          clearEditableFields();
          setFormMode("view");
        }
      });
      actionButtons.save?.addEventListener("click", handleSave);
      actionButtons.generate?.addEventListener("click", handleGenerate);
    };

    initEmbeddedState();
    hookEvents();
    syncBehindTheScene();
    renderComponents();
    renderTransactions();
    setFormMode("view");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLoanWriteOff);
  } else {
    initLoanWriteOff();
  }
})(window);
