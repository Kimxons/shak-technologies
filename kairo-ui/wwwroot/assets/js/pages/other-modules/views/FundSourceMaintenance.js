(function () {
  if (window.__FundSourceMaintenanceLoaded) {
    console.warn('[FundSourceMaintenance] Script already loaded; skipping duplicate execution.');
    return;
  }
  window.__FundSourceMaintenanceLoaded = true;

  console.log('[FundSourceMaintenance] Script loaded');

  (async function initFundSourceMaintenance() {
    const { ServiceLoader } = window;
    // Prefer direct script tags on the page. Only fall back to ServiceLoader when something is missing.
    // This avoids blocking the whole screen when ServiceLoader fails (e.g., due to a 404 or base path issue).
    const ensureDependencies = async () => {
      const needCore = !window.CoreApi;
      const needOtherModules = !window.OtherModuleService?.getDonors;
      const needLookups = !window.LookupService?.getCities || !window.LookupService?.getCountries;
      if (!needCore && !needOtherModules && !needLookups) return;

      if (!ServiceLoader) {
        console.error('[FundSourceMaintenance] Missing dependencies and ServiceLoader is not available.', {
          needCore,
          needOtherModules,
          needLookups
        });
        return;
      }

      try {
        if (needCore) await ServiceLoader.loadCore();
        if (needOtherModules) await ServiceLoader.loadOtherModuleService();
        if (needLookups && ServiceLoader.loadLookupService) {
          await ServiceLoader.loadLookupService();
        }
        if (ServiceLoader.waitForService && needOtherModules) {
          await ServiceLoader.waitForService('OtherModuleService', 5000);
        }
      } catch (error) {
        console.error('[FundSourceMaintenance] ServiceLoader failed to load dependencies', error);
      }
    };

    await ensureDependencies();

    const byId = (id) => document.getElementById(id);

    const fields = {
      funderId: byId('funderId'),
      funderName: byId('funderName'),
      address1: byId('address1'),
      address2: byId('address2'),
      city: byId('city'),
      country: byId('country'),
      zipCode: byId('zipCode'),
      emailId: byId('emailId'),
      phone1: byId('phone1'),
      phone2: byId('phone2'),
      mobile: byId('mobile'),
      faxNo: byId('faxNo'),
      contactPerson: byId('contactPerson'),
      remarks: byId('remarks'),

      createdBy: byId('createdBy'),
      createdOn: byId('createdOn'),
      modifiedBy: byId('modifiedBy'),
      modifiedOn: byId('modifiedOn'),
      supervisedBy: byId('supervisedBy'),
      supervisedOn: byId('supervisedOn')
    };

    function setToast(message, variant = "info") {
      const toast = document.getElementById("fsmToast");
      if (!toast) {
        console.log(`[FundSourceMaintenance] Toast (${variant}): ${message}`);
        return;
      }
      toast.textContent = message;
      toast.className = `fa-alert show ${variant}`;
      window.setTimeout(() => toast.classList.remove("show"), 5000);
    }

    const populateSelectOptions = (selectEl, options = []) => {
      if (!selectEl || selectEl.tagName !== 'SELECT') return;

      const currentValue = String(selectEl.value ?? '').trim();

      // Keep the first placeholder option if present, otherwise create one.
      const firstOpt = selectEl.options?.[0];
      selectEl.innerHTML = '';

      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = firstOpt?.textContent?.trim() || '--Select--';
      selectEl.appendChild(placeholder);

      for (const opt of options || []) {
        if (!opt) continue;
        const value = opt.value ?? opt.SubCodeID ?? opt.CodeID;
        const label = opt.label ?? opt.CodeDescription ?? opt.Description ?? value;
        if (value === undefined || value === null) continue;

        const optionEl = document.createElement('option');
        optionEl.value = String(value);
        optionEl.textContent = label == null ? String(value) : String(label);
        selectEl.appendChild(optionEl);
      }

      // Restore selection if there was one
      if (currentValue) {
        selectEl.value = currentValue;
      }
    };

    const loadCityCountryLookups = async () => {
      const lookup = window.LookupService;
      if (!lookup?.getCities || !lookup?.getCountries) {
        console.warn('[FundSourceMaintenance] LookupService not available; City/Country dropdowns will not be populated.');
        return;
      }

      try {
        const [cities, countries] = await Promise.all([
          lookup.getCities(),
          lookup.getCountries()
        ]);

        populateSelectOptions(fields.city, Array.isArray(cities) ? cities : []);
        populateSelectOptions(fields.country, Array.isArray(countries) ? countries : []);
        console.log('[FundSourceMaintenance] City/Country lookups loaded');
      } catch (error) {
        console.error('[FundSourceMaintenance] Failed to load City/Country lookups', error);
      }
    };

    await loadCityCountryLookups();

    const getActionButton = (label) => {
      const desired = String(label || '').trim().toLowerCase();
      return Array.from(document.querySelectorAll('.cm-legacy-actions__group .cm-shell__action')).find(
        (btn) => (btn.textContent || '').trim().toLowerCase() === desired
      );
    };

    const addBtn = getActionButton('Add');
    const editBtn = getActionButton('Edit');
    const deleteBtn = getActionButton('Delete');
    const saveBtn = getActionButton('Save');
    const cancelBtn = getActionButton('Cancel');
    const viewBtn = getActionButton('View');

    const setButtonDisabled = (btn, disabled) => {
      if (!btn) return;
      btn.disabled = Boolean(disabled);
    };

    const setFormDisabled = (disabled, { keepFunderIdEnabled = true } = {}) => {
      const editableEls = [
        fields.funderId,
        fields.funderName,
        fields.address1,
        fields.address2,
        fields.city,
        fields.country,
        fields.zipCode,
        fields.emailId,
        fields.phone1,
        fields.phone2,
        fields.mobile,
        fields.faxNo,
        fields.contactPerson,
        fields.remarks
      ].filter(Boolean);

      for (const el of editableEls) {
        if (!el) continue;
        // Always keep funderId enabled for data entry
        if (el === fields.funderId) {
          el.disabled = false;
        } else {
          el.disabled = Boolean(disabled);
        }
      }
    };

    const prevBtn = document.querySelector('.fsm-actions-top .fsm-nav-btn[aria-label="Previous record"]');
    const nextBtn = document.querySelector('.fsm-actions-top .fsm-nav-btn[aria-label="Next record"]');

    const isViewButton = (target) => {
      const btn = target?.closest?.('.cm-legacy-actions__group .cm-shell__action');
      if (!btn) return null;
      const text = (btn.textContent || '').trim().toLowerCase();
      return text === 'view' ? btn : null;
    };

    const getFirstDefined = (obj, keys) => {
      if (!obj) return undefined;
      for (const key of keys) {
        if (obj[key] !== undefined && obj[key] !== null) return obj[key];
      }
      return undefined;
    };

    const setValue = (el, value) => {
      if (!el) return;
      if (value === undefined || value === null) return;
      el.value = String(value);
    };

    const ensureSelectValue = (el, value) => {
      if (!el) return;
      if (value === undefined || value === null) return;
      const strValue = String(value);
      if (!strValue) return;

      // If the select doesn't already have this option, add it so the value displays.
      if (el.tagName === 'SELECT') {
        const exists = Array.from(el.options).some((o) => o.value === strValue);
        if (!exists) {
          const opt = document.createElement('option');
          opt.value = strValue;
          opt.textContent = strValue;
          el.appendChild(opt);
        }
      }

      el.value = strValue;
    };

    const extractRows = (data) => {
      if (!data) return [];
      if (Array.isArray(data)) return data;

      // Some endpoints return { Details: [...] } or multi-details payloads.
      if (Array.isArray(data.Details)) return data.Details;

      // Some OldAPI responses use Details01/Details02 instead of Details.
      if (Array.isArray(data.Details01)) return data.Details01;
      if (Array.isArray(data.Details1)) return data.Details1;

      // If it's a single record object, treat as one-row.
      if (typeof data === 'object') return [data];

      return [];
    };

    let rows = [];
    let rowIndex = 0;
    let mode = 'view'; // 'view' | 'add' | 'edit'
    let lastLoadedDonor = null;
    let isSearching = false; // Flag to track if we're in search mode (view mode but no record loaded)
    let currentUpdateCount = 0; // Track UpdateCount from fetched record for add/edit/delete operations

    const updateActionState = () => {
      const hasRecord = Boolean(lastLoadedDonor);

      // Helper to set opacity based on enabled/disabled state for visual consistency
      const setBtnState = (btn, isEnabled) => {
        if (!btn) return;
        btn.disabled = !isEnabled;
        // The CSS might handle opacity via :disabled, but specific requirements mention opacity.
        // Usually framework CSS handles opacity for disabled buttons. 
      };

      // 4. Add Mode
      if (mode === 'add') {
        setFormDisabled(false);
        // Fields enabled (except maybe some specific ones if needed, but 'add' suggests all writable)
        if (fields.funderId) fields.funderId.disabled = false;

        setBtnState(viewBtn, false);
        setBtnState(addBtn, false);
        setBtnState(editBtn, false);
        setBtnState(deleteBtn, false);
        setBtnState(saveBtn, true);
        setBtnState(cancelBtn, true); // ACTIVE
        return;
      }

      // 5. Edit Mode
      if (mode === 'edit') {
        setFormDisabled(false);
        // Keep DonorID stable during Edit
        if (fields.funderId) fields.funderId.disabled = true;

        setBtnState(viewBtn, false);
        setBtnState(addBtn, false);
        setBtnState(editBtn, false);
        setBtnState(deleteBtn, false);
        setBtnState(saveBtn, true);
        setBtnState(cancelBtn, true); // ACTIVE
        return;
      }

      // View Mode States
      setFormDisabled(true, { keepFunderIdEnabled: true });
      // Cancel always active
      setBtnState(cancelBtn, true);
      setBtnState(saveBtn, false);

      if (hasRecord) {
        // 3. Record Found State - View button disabled since record is already loaded
        setBtnState(viewBtn, false);
        setBtnState(addBtn, false);
        setBtnState(editBtn, true);
        setBtnState(deleteBtn, true);
      } else if (isSearching) {
        // 2. Record Not Found State
        setBtnState(viewBtn, true);
        setBtnState(addBtn, true);
        setBtnState(editBtn, false);
        setBtnState(deleteBtn, false);
      } else {
        // 1. Default State (Page Load)
        setBtnState(viewBtn, true);
        setBtnState(addBtn, false);
        setBtnState(editBtn, false);
        setBtnState(deleteBtn, false);
      }
    };

    const renderRow = () => {
      const row = rows[rowIndex];
      if (!row) return;

      lastLoadedDonor = row;

      setValue(fields.funderId, getFirstDefined(row, ['FunderID', 'FunderId', 'FUNDERID', 'DonorID', 'DonorId', 'ID', 'Id']));
      setValue(fields.funderName, getFirstDefined(row, ['FunderName', 'FUNDERNAME', 'DonorName', 'Donor', 'Name']));
      setValue(fields.address1, getFirstDefined(row, ['Address1', 'ADDRESS1']));
      setValue(fields.address2, getFirstDefined(row, ['Address2', 'ADDRESS2']));
      setValue(fields.zipCode, getFirstDefined(row, ['ZipCode', 'ZIPCODE', 'Zip', 'PostalCode']));
      setValue(fields.emailId, getFirstDefined(row, ['EmailID', 'EmailId', 'EMAILID', 'Email']));
      setValue(fields.phone1, getFirstDefined(row, ['Phone1', 'PHONE1']));
      setValue(fields.phone2, getFirstDefined(row, ['Phone2', 'PHONE2']));
      setValue(fields.mobile, getFirstDefined(row, ['Mobile', 'MOBILE']));
      setValue(fields.faxNo, getFirstDefined(row, ['FaxNo', 'Fax', 'FAXNO']));
      setValue(fields.contactPerson, getFirstDefined(row, ['ContactPerson', 'CONTACTPERSON', 'Contact']));
      setValue(fields.remarks, getFirstDefined(row, ['Remarks', 'REMARKS']));

      setValue(fields.createdBy, getFirstDefined(row, ['CreatedBy', 'CREATEDBY']));
      setValue(fields.createdOn, getFirstDefined(row, ['CreatedOn', 'CREATEDON']));
      setValue(fields.modifiedBy, getFirstDefined(row, ['ModifiedBy', 'MODIFIEDBY']));
      setValue(fields.modifiedOn, getFirstDefined(row, ['ModifiedOn', 'MODIFIEDON']));
      setValue(fields.supervisedBy, getFirstDefined(row, ['SupervisedBy', 'SUPERVISEDBY']));
      setValue(fields.supervisedOn, getFirstDefined(row, ['SupervisedOn', 'SUPERVISEDON']));

      // City/Country are selects in the UI; ensure the option exists so it displays.
      ensureSelectValue(fields.city, getFirstDefined(row, ['City', 'CITY', 'CityID', 'CityId', 'DonorCity', 'DonorCityID', 'DonorCityId']));
      ensureSelectValue(fields.country, getFirstDefined(row, ['Country', 'COUNTRY', 'CountryID', 'CountryId', 'DonorCountry', 'DonorCountryID', 'DonorCountryId']));

      updateActionState();
    };

    const clampIndex = () => {
      if (!rows.length) {
        rowIndex = 0;
        return;
      }
      if (rowIndex < 0) rowIndex = 0;
      if (rowIndex >= rows.length) rowIndex = rows.length - 1;
    };

    const updateNavDisabled = () => {
      if (prevBtn) prevBtn.disabled = rows.length <= 1 || rowIndex <= 0;
      if (nextBtn) nextBtn.disabled = rows.length <= 1 || rowIndex >= rows.length - 1;
    };

    prevBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      rowIndex -= 1;
      clampIndex();
      renderRow();
      updateNavDisabled();
    });

    nextBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      rowIndex += 1;
      clampIndex();
      renderRow();
      updateNavDisabled();
    });

    const getSession = () => {
      try {
        const key = window.CoreBankingConfig?.auth?.storageKey || 'nimble_auth_session';
        const raw = window.localStorage?.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    };

    const CONTEXT_KEY = 'kairo_other_modules_context';
    const getCachedContext = () => {
      try {
        const raw = window.localStorage?.getItem(CONTEXT_KEY);
        return raw ? JSON.parse(raw) : {};
      } catch {
        return {};
      }
    };

    const setCachedContext = (next) => {
      try {
        window.localStorage?.setItem(CONTEXT_KEY, JSON.stringify(next || {}));
      } catch {
        // ignore
      }
    };

    const getFirstNonEmpty = (...vals) => {
      for (const v of vals) {
        if (v === undefined || v === null) continue;
        const s = String(v).trim();
        if (s) return s;
      }
      return '';
    };

    function getOperatorId() {
      try {
        const session = window.AuthService?.getSession?.();
        return session?.operatorId || session?.operatorID || 'CSADM';
      } catch {
        return 'CSADM';
      }
    }

    const clearForm = () => {
      console.log('[FundSourceMaintenance] Robustly clearing form...');
      const form = document.getElementById('fund-source-form');
      if (form) {
        form.reset();
        const allElements = form.querySelectorAll("input, select, textarea");
        allElements.forEach(el => {
          if (el.type === 'checkbox' || el.type === 'radio') {
            el.checked = false;
          } else {
            el.value = "";
          }
        });
        // Handle select2 or other dynamic selects if they exist
        form.querySelectorAll("select").forEach(s => { s.selectedIndex = -1; });
      } else {
        // Fallback to manual clearing if form ID is somehow missing
        Object.values(fields).forEach(field => {
          if (field) field.value = '';
        });
        [fields.city, fields.country].forEach(select => {
          if (select) select.selectedIndex = 0;
        });
      }
      console.log('[FundSourceMaintenance] Form cleared');
    };

    const buildAddEditPayload = () => {
      const session = getSession() || {};
      const cached = getCachedContext();
      const bankId = getFirstNonEmpty(
        session.BankID,
        session.BankId,
        session.bankID,
        session.bankId,
        window.Environment?.bankId,
        window.Environment?.bankID,
        cached.BankID
      );

      return {
        BankID: bankId,
        DonorID: (fields.funderId?.value || '').trim(),
        DonorName: (fields.funderName?.value || '').trim(),
        ContactPerson: (fields.contactPerson?.value || '').trim(),
        Address1: (fields.address1?.value || '').trim(),
        Address2: (fields.address2?.value || '').trim(),
        CityID: (fields.city?.value || '').trim(),
        CountryID: (fields.country?.value || '').trim(),
        ZipCode: (fields.zipCode?.value || '').trim(),
        Phone1: (fields.phone1?.value || '').trim(),
        Phone2: (fields.phone2?.value || '').trim(),
        Mobile: (fields.mobile?.value || '').trim(),
        Email: (fields.emailId?.value || '').trim(),
        Fax: (fields.faxNo?.value || '').trim(),
        Remarks: (fields.remarks?.value || '').trim(),
        CreatedBy: getOperatorId(),
        CreatedOn: (fields.createdOn?.value || '').trim(),
        ModifiedBy: mode === 'edit' ? getOperatorId() : (fields.modifiedBy?.value || '').trim(),
        ModifiedOn: (fields.modifiedOn?.value || '').trim(),
        SupervisedBy: (fields.supervisedBy?.value || '').trim(),
        NewRecord: mode === 'add' ? 1 : currentUpdateCount // Use 1 for new records, UpdateCount for edits
      };
    };

    const isActionButton = (target) => {
      const btn = target?.closest?.('.cm-legacy-actions__group .cm-shell__action');
      if (!btn) return null;
      const text = (btn.textContent || '').trim().toLowerCase();
      return { btn, text };
    };

    // Use event delegation so the handler still works even if the button is re-rendered/replaced.
    document.addEventListener('click', async (e) => {
      const action = isActionButton(e.target);
      if (!action) return;

      if (action.btn.disabled) return;
      e.preventDefault();

      if (action.text === 'add') {
        // Preserve the Funder ID that was entered
        const preservedFunderId = fields.funderId?.value || '';

        mode = 'add';
        lastLoadedDonor = null;
        isSearching = false;
        currentUpdateCount = 0; // Reset for new record
        clearForm();

        // Restore the Funder ID after clearing
        if (fields.funderId && preservedFunderId) {
          fields.funderId.value = preservedFunderId;
        }

        updateActionState();
        setToast("Add mode active", "info");
        return;
      }

      if (action.text === 'edit') {
        if (!lastLoadedDonor) {
          window.alert('Load a record first (click View), then Edit.');
          return;
        }
        mode = 'edit';
        updateActionState();
        setToast("Edit mode active", "info");
        return;
      }

      if (action.text === 'cancel') {
        console.log('[FundSourceMaintenance] Cancel triggered');

        // 5. Edit Mode Cancel -> Revert to last loaded data and Return to Record Found
        if (mode === 'edit' && lastLoadedDonor) {
          populateFundSourceForm(lastLoadedDonor);
          mode = 'view';
          setToast("Edit cancelled. Record restored.", "info");
          updateActionState();
          return;
        }

        // For Default, Record Not Found, Record Found (View Mode), and Add Mode:
        // Clear everything and return to Default State.
        clearForm();
        lastLoadedDonor = null;
        isSearching = false;
        currentUpdateCount = 0;
        rows = [];
        rowIndex = 0;
        mode = 'view';
        setToast("Screen cleared", "success");
        updateActionState();
        updateNavDisabled();
        return;
      }

      if (action.text === 'save') {
        if (!window.OtherModuleService?.addEditDonors) {
          window.alert('OtherModuleService.addEditDonors is not available. Check service script loading.');
          return;
        }

        const payload = buildAddEditPayload();
        if (!payload.BankID) {
          window.alert('Missing BankID.');
          return;
        }
        if (!payload.DonorID) {
          window.alert('DonorID (Funder ID) is required.');
          return;
        }

        console.log('[FundSourceMaintenance] Calling dbo.p_AddEditDonors', payload);
        const result = await window.OtherModuleService.addEditDonors(payload);
        console.log('[FundSourceMaintenance] addEditDonors result', result);
        if (!result?.success) {
          setToast(result?.message || 'Save failed.', "danger");
          return;
        }

        setToast("Record saved successfully", "success");

        // After save: clear form and reset state
        clearForm();
        lastLoadedDonor = null;
        isSearching = false;
        currentUpdateCount = 0;
        rows = [];
        rowIndex = 0;
        mode = 'view';
        updateActionState();
        updateNavDisabled();
        return;
      }

      if (action.text === 'delete') {
        console.log('[FundSourceMaintenance] Delete clicked');

        if (!lastLoadedDonor) {
          alert('No record loaded to delete.');
          return;
        }

        const donorId = (fields.funderId?.value || '').trim();
        if (!donorId) {
          alert('No Funder ID specified.');
          return;
        }

        const confirmed = confirm(`Are you sure you want to delete Funder ID: ${donorId}?`);
        if (!confirmed) return;

        if (!window.OtherModuleService?.deleteDonors) {
          alert('Delete service not available.');
          return;
        }

        const session = getSession() || {};
        const cached = getCachedContext();
        const deletePayload = {
          BankID: getFirstNonEmpty(session.BankID, session.BankId, window.Environment?.bankId, cached.BankID),
          DonorID: donorId,
          NewRecord: currentUpdateCount // Use UpdateCount from fetched record
        };

        console.log('[FundSourceMaintenance] Calling dbo.p_DeleteDonors', deletePayload);
        const result = await window.OtherModuleService.deleteDonors(deletePayload);
        console.log('[FundSourceMaintenance] deleteDonors result', result);

        if (!result?.success) {
          setToast(`Delete failed: ${result?.message || 'Unknown error'}`, "danger");
          return;
        }

        setToast('Funder deleted successfully.', "success");
        clearForm();
        lastLoadedDonor = null;
        currentUpdateCount = 0;
        rows = [];
        rowIndex = 0;
        mode = 'view';
        updateActionState();
        updateNavDisabled();
        return;
      }

      if (action.text !== 'view') return;

      console.log('[FundSourceMaintenance] View clicked');

      // Defensive: if the service isn't loaded for any reason, attempt to load it now.
      if (!window.OtherModuleService?.getDonors) {
        try {
          await ServiceLoader.loadOtherModuleService();
          if (ServiceLoader.waitForService) {
            await ServiceLoader.waitForService('OtherModuleService', 5000);
          }
        } catch (error) {
          console.error('[FundSourceMaintenance] Unable to load OtherModuleService on demand', error);
        }
      }

      if (!window.OtherModuleService?.getDonors) {
        window.alert('OtherModuleService is not loaded; cannot call getDonors. Check Console (network/script load errors).');
        return;
      }

      const session = getSession() || {};
      const cached = getCachedContext();
      const requestData = {
        BankID: getFirstNonEmpty(session.BankID, session.BankId, session.bankID, session.bankId, window.Environment?.bankId, window.Environment?.bankID, cached.BankID),
        // OurBranchID: getFirstNonEmpty(session.OurBranchID, session.OurBranchId, session.BranchID, session.BranchId, session.branchID, session.branchId, cached.OurBranchID),
        OurBranchID: "0101",
        DonorID: (fields.funderId?.value || '').trim(),
        // OperatorID: getFirstNonEmpty(session.OperatorID, session.OperatorId, session.operatorID, session.operatorId, cached.OperatorID),
        OperatorID: getOperatorId(),
        Direction: 0
      };

      // If the auth session doesn't carry these (common in some environments), prompt once and cache.
      if (!requestData.BankID) {
        const v = window.prompt('Enter BankID (required):', cached.BankID || '');
        requestData.BankID = (v || '').trim();
      }
      if (!requestData.OurBranchID) {
        const v = window.prompt('Enter BranchID / OurBranchID (required):', cached.OurBranchID || '');
        requestData.OurBranchID = (v || '').trim();
      }
      if (!requestData.OperatorID) {
        const v = window.prompt('Enter OperatorID (required):', cached.OperatorID || '');
        requestData.OperatorID = (v || '').trim();
      }

      if (!requestData.BankID || !requestData.OurBranchID || !requestData.OperatorID) {
        window.alert('Cannot proceed without BankID, OurBranchID, and OperatorID.');
        return;
      }

      setCachedContext({
        BankID: requestData.BankID,
        OurBranchID: requestData.OurBranchID,
        OperatorID: requestData.OperatorID
      });

      console.log('[FundSourceMaintenance] Calling dbo.p_GetDonors', requestData);
      const result = await window.OtherModuleService.getDonors(requestData);
      console.log('[FundSourceMaintenance] getDonors result', result);

      if (!result?.success) {
        console.error('OtherModuleService.getDonors failed', result);
        window.alert(result?.message || 'Failed to load fund sources.');
        return;
      }
      // const address1 = result?.data?.Details01?.[0]?.Address1;

      // if (address1 !== undefined) {
      //   document.getElementById('address1').value = address1;
      // }

      const donor = result?.data?.Details01?.[0];
      lastLoadedDonor = donor || null;

      // Store UpdateCount from fetched record for use in add/edit/delete operations
      currentUpdateCount = donor?.UpdateCount ?? 0;
      console.log('[FundSourceMaintenance] UpdateCount from fetched record:', currentUpdateCount);

      // Check if no donor record was found
      if (!donor) {
        // Preserve the Funder ID before clearing the form
        const preservedFunderId = fields.funderId?.value || '';
        const wasIdProvided = (requestData.DonorID || '').trim().length > 0;

        if (wasIdProvided) {
          isSearching = true;
          setToast("Record doesn't exist", "warning");
        } else {
          isSearching = false;
          setToast("No records found.", "info");
        }

        clearForm();

        // Restore the Funder ID after clearing so user can add a new record with this ID
        if (fields.funderId && preservedFunderId) {
          fields.funderId.value = preservedFunderId;
        }

        updateActionState();
        return;
      }

      populateFundSourceForm(donor);

      rows = extractRows(result.data);
      rowIndex = 0;

      if (!rows.length) {
        window.alert('No records to display.');
        updateNavDisabled();
        return;
      }

      renderRow();
      console.log('[FundSourceMaintenance] Bound row to form', rows[0]);
      mode = 'view';
      isSearching = true;
      updateActionState();
      updateNavDisabled();
    });

    function populateFundSourceForm(donor) {
      if (!donor) return;

      // Update state for the loaded record
      lastLoadedDonor = donor;
      currentUpdateCount = donor.UpdateCount ?? 0;
      console.log('[FundSourceMaintenance] UpdateCount from fetched record:', currentUpdateCount);

      // Log the incoming donor object to debug field names
      console.log('[FundSourceMaintenance] populateFundSourceForm - donor fields:', Object.keys(donor), donor);

      // Helper to get value from donor with multiple possible field names
      const getValue = (...keys) => {
        for (const key of keys) {
          if (donor[key] !== undefined && donor[key] !== null) {
            return donor[key];
          }
        }
        return '';
      };

      // Map fields with fallback field names (API may return different naming conventions)
      const setField = (elementId, ...dataKeys) => {
        const el = document.getElementById(elementId);
        if (!el) return;
        el.value = getValue(...dataKeys);
      };

      // Main form fields
      setField('funderId', 'DonorID', 'DonorId', 'DONORID', 'FunderID', 'FunderId');
      setField('funderName', 'DonorName', 'DONORNAME', 'FunderName', 'Name');
      setField('address1', 'Address1', 'ADDRESS1', 'AddressLine1');
      setField('address2', 'Address2', 'ADDRESS2', 'AddressLine2');
      setField('city', 'CityID', 'CityId', 'CITYID', 'City');
      setField('country', 'CountryID', 'CountryId', 'COUNTRYID', 'Country');
      setField('zipCode', 'ZipCode', 'ZIPCODE', 'Zipcode', 'PostalCode');
      setField('emailId', 'Email', 'EMAIL', 'EmailID', 'EmailId', 'EmailAddress');
      setField('phone1', 'Phone1', 'PHONE1', 'PhoneNo1', 'Telephone1');
      setField('phone2', 'Phone2', 'PHONE2', 'PhoneNo2', 'Telephone2');
      setField('mobile', 'Mobile', 'MOBILE', 'MobileNo', 'CellPhone');
      setField('faxNo', 'Fax', 'FAX', 'FaxNo', 'FAXNO');
      setField('contactPerson', 'ContactPerson', 'CONTACTPERSON', 'Contact');
      setField('remarks', 'Remarks', 'REMARKS', 'Notes');

      // Behind The Scene audit fields
      setField('createdBy', 'CreatedBy', 'CREATEDBY', 'CreateBy');
      setField('createdOn', 'CreatedOn', 'CREATEDON', 'CreateDate');
      setField('modifiedBy', 'ModifiedBy', 'MODIFIEDBY', 'UpdatedBy', 'EditedBy');
      setField('modifiedOn', 'ModifiedOn', 'MODIFIEDON', 'UpdatedOn', 'EditedOn');
      setField('supervisedBy', 'SupervisedBy', 'SUPERVISEDBY', 'ApprovedBy');
      setField('supervisedOn', 'SupervisedOn', 'SUPERVISEDON', 'ApprovedOn');
    }



    updateNavDisabled();
    // Initial state
    updateActionState();
    // Do NOT trigger view button click on load

    // Listen for FUNDER_SELECTED messages from the search modal iframe
    window.addEventListener('message', async function (event) {
      // Only handle FUNDER_SELECTED messages
      if (!event.data || event.data.type !== 'FUNDER_SELECTED') return;

      console.log('[FundSourceMaintenance] Received FUNDER_SELECTED message:', event.data);

      const selectedData = event.data.data;
      if (!selectedData) {
        console.warn('[FundSourceMaintenance] No data in FUNDER_SELECTED message');
        return;
      }

      // Get the DonorID from the search result
      const donorId = selectedData.FunderID || selectedData.DonorID || '';
      if (!donorId) {
        console.warn('[FundSourceMaintenance] No DonorID in search result');
        setToast('No Funder ID in search result', 'warning');
        return;
      }

      // Fetch the complete record using getDonors API
      // (Search API only returns minimal fields like ID and Name)
      try {
        // Ensure OtherModuleService is loaded
        if (!window.OtherModuleService?.getDonors) {
          if (ServiceLoader?.loadOtherModuleService) {
            await ServiceLoader.loadOtherModuleService();
            if (ServiceLoader.waitForService) {
              await ServiceLoader.waitForService('OtherModuleService', 5000);
            }
          }
        }

        if (!window.OtherModuleService?.getDonors) {
          setToast('Service not available. Please refresh.', 'danger');
          return;
        }

        const session = getSession() || {};
        const cached = getCachedContext();

        const requestData = {
          BankID: getFirstNonEmpty(session.BankID, session.BankId, session.bankID, session.bankId, window.Environment?.bankId, window.Environment?.bankID, cached.BankID),
          OurBranchID: '0101',
          DonorID: donorId,
          OperatorID: getOperatorId(),
          Direction: 0
        };

        console.log('[FundSourceMaintenance] Fetching complete record for DonorID:', donorId, requestData);
        const result = await window.OtherModuleService.getDonors(requestData);
        console.log('[FundSourceMaintenance] getDonors result:', result);

        if (!result?.success) {
          console.error('[FundSourceMaintenance] getDonors failed', result);
          setToast(result?.message || 'Failed to load funder details', 'danger');
          return;
        }

        const donor = result?.data?.Details01?.[0];
        if (!donor) {
          setToast(`Funder ${donorId} not found`, 'warning');
          return;
        }

        // Populate the form with the complete funder data
        populateFundSourceForm(donor);

        // Update state - record is now loaded
        lastLoadedDonor = donor;
        currentUpdateCount = donor.UpdateCount ?? 0;
        rows = [donor];
        rowIndex = 0;
        mode = 'view';
        isSearching = true; // We have a record, so enable Edit/Delete

        setToast(`Funder ${donorId} loaded`, 'success');
        console.log('[FundSourceMaintenance] UpdateCount from fetched record:', currentUpdateCount);
        updateActionState();
        updateNavDisabled();

        console.log('[FundSourceMaintenance] Form populated with complete record:', donor);
      } catch (error) {
        console.error('[FundSourceMaintenance] Error fetching funder details:', error);
        setToast('Error loading funder details: ' + error.message, 'danger');
      }
    });
  })();
})();
