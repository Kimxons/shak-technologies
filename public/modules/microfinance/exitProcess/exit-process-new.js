/* Exit Process (remodeled to match legacy button layout)
   Note: This file is UI behavior only; data is stubbed in-memory. */

const EXIT_PROCESS_BRANCH_ID = '0603';
const DEBUG_EXIT_PROCESS = false;

const exitProcessData = [
	{
		centerId: 'C001',
		centerName: 'Center 04',
		groupId: 'G001',
		groupName: 'Group 01',
		clientId: 'CLI001',
		clientName: 'Client 01',
		exitReason: 'graduation',
		exitDate: '2025-01-15',
		totalRecoverable: 50000,
		totalPayable: 45000,
		forfeitSavings: 5000,
		forfeitCollateral: 2000,
		chargeOffLoss: 1000,
		chargeOffInsurance: 500,
		netPayable: 40000,
		netReceivable: 5000,
		accounts: [],
		forfeits: [],
		totalForfeitAmount: 0,
		portfolio: {
			primaryCollateral: 0,
			creditInterest: 0,
			tax: 0,
			secondaryCollateral: 0,
			additionalCollateral: 0,
			loanBalance: 0,
			debitInterest: 0,
			others: 0,
			netBalance: 0,
		},
	},
];

let currentData = null;
let editMode = false;

let _exitProcessServicePromise = null;
let _clientServicePromise = null;
let _searchServicePromise = null;
let _microfinanceServicePromise = null;

let _epLookupModalInstance = null;
let _epActiveLookup = null;
let _epBranchCache = null;
let _epPendingLookup = null;

function $(id) {
	return document.getElementById(id);
}

function safeNumber(value) {
	const n = Number(value);
	return Number.isFinite(n) ? n : 0;
}

function showStatus(message, type = 'info') {
	const el = $('statusMsg');
	if (!el) return;

	const textEl = el.querySelector('.status-text');
	if (textEl) textEl.textContent = message;

	el.classList.remove('hidden', 'success', 'error', 'warning', 'info');
	el.classList.add(type);

	window.clearTimeout(showStatus._t);
	showStatus._t = window.setTimeout(() => {
		el.classList.add('hidden');
	}, 4000);
}

function epToast(message, type = 'info', duration = 3500) {
	const msg = String(message ?? '').trim();
	if (!msg) return;

	// Prefer shared toast helpers if present.
	if (typeof window.showToast === 'function') {
		try {
			window.showToast(msg, type === 'error' ? 'danger' : type);
			return;
		} catch {
			// fall through
		}
	}
	if (window.NotificationService && typeof window.NotificationService.showToast === 'function') {
		try {
			window.NotificationService.showToast(msg, type);
			return;
		} catch {
			// fall through
		}
	}

	// Local Bootstrap toast using this page's #toastContainer.
	const container = document.getElementById('toastContainer');
	if (!container || !window.bootstrap) {
		showStatus(msg, type === 'danger' ? 'error' : type);
		return;
	}

	const bsTypeMap = {
		success: 'success',
		warning: 'warning',
		danger: 'danger',
		error: 'danger',
		info: 'info',
	};
	const bsType = bsTypeMap[type] || 'info';

	const toastEl = document.createElement('div');
	toastEl.className = `toast align-items-center text-bg-${bsType} border-0`;
	toastEl.setAttribute('role', 'alert');
	toastEl.setAttribute('aria-live', 'assertive');
	toastEl.setAttribute('aria-atomic', 'true');
	toastEl.innerHTML = `
		<div class="d-flex">
			<div class="toast-body">${msg.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
			<button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
		</div>`;

	container.appendChild(toastEl);
	try {
		const t = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: Number(duration) || 3500 });
		toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove(), { once: true });
		t.show();
	} catch {
		// Fallback
		showStatus(msg, type === 'danger' ? 'error' : type);
		setTimeout(() => toastEl.remove(), Number(duration) || 3500);
	}
}

function epFocus(id) {
	const el = document.getElementById(id);
	if (!el) return;
	try {
		el.focus();
		if (typeof el.select === 'function') el.select();
	} catch {
		// ignore
	}
}

function epValidateRequiredForView() {
	const v = (id) => String(document.getElementById(id)?.value || '').trim();
	const exitReason = String(document.getElementById('exitReason')?.value || '').trim();

	const missing = (msg, focusId) => ({ ok: false, message: msg, focusId });

	if (!v('branchId')) return missing('Branch ID is required', 'branchId');
	if (!v('branchName')) return missing('Branch Name is required', 'branchId');
	if (!v('centerId')) return missing('Center ID is required', 'centerId');
	if (!v('centerName')) return missing('Center Name is required', 'centerId');
	if (!v('groupId')) return missing('Group ID is required', 'groupId');
	if (!v('groupName')) return missing('Group Name is required', 'groupId');
	if (!v('clientId')) return missing('Client ID is required', 'clientId');
	if (!v('clientName')) return missing('Client Name is required', 'clientId');
	if (!exitReason) return missing('Exit Reason is required', 'exitReason');

	return { ok: true };
}

function epSetIdentityDisabled(disabled) {
	['branchId', 'centerId', 'groupId', 'clientId', 'exitReason'].forEach((id) => {
		const el = document.getElementById(id);
		if (el) el.disabled = Boolean(disabled);
	});

	// Also disable lookup buttons for identity fields
	document
		.querySelectorAll('button.search-btn[data-ep-lookup="branch"], button.search-btn[data-ep-lookup="center"], button.search-btn[data-ep-lookup="group"], button.search-btn[data-ep-lookup="client"]')
		.forEach((btn) => {
			btn.disabled = Boolean(disabled);
		});
}

function epExtractUpdateCount(resp) {
	const root = resp?.data ?? resp;
	const details = root?.Details ?? root?.details;
	const first = Array.isArray(details) ? details[0] : null;
	const raw = first?.UpdateCount ?? first?.updateCount;
	const n = Number(raw);
	return Number.isFinite(n) ? n : 0;
}

function epApplyButtonStateAfterView(updateCount) {
	const btnView = $('btnView');
	const btnAdd = $('btnAdd');
	const btnSave = $('btnSave');
	const btnPrint = $('btnPrint');

	if (btnView) btnView.disabled = true;
	if (btnSave) btnSave.disabled = true;

	// Ensure Add is visible so the enable/disable state matters.
	if (btnAdd) btnAdd.hidden = false;

	if (updateCount <= 0) {
		if (btnAdd) btnAdd.disabled = false;
		if (btnPrint) btnPrint.disabled = true;
	} else {
		if (btnAdd) btnAdd.disabled = true;
		if (btnPrint) btnPrint.disabled = false;
	}
}

function getResultDetailsLength(result) {
	const root = result?.data ?? result;
	return Array.isArray(root?.Details) ? root.Details.length : -1;
}

function epExtractOldApiDetails(resp) {
	// OldAPI responses are not consistent across services; sometimes the usable rows
	// are in Details/Details01/etc and sometimes inside nested wrappers.
	const baseRoot = resp?.data ?? resp;
	const rootsToTry = [
		baseRoot,
		baseRoot?.data,
		baseRoot?.Data,
		baseRoot?.result,
		baseRoot?.Result,
		baseRoot?.payload,
		baseRoot?.Payload,
	].filter((x) => x && typeof x === 'object');

	const looksLikeExitTrxRow = (r) => {
		if (!r || typeof r !== 'object') return false;
		const m = normalizeRowKeyMap(r);
		// ExitTrx detail rows commonly include AccountID/AccountName/Amount/TrxDescription.
		return (
			m.accountid !== undefined ||
			m.accountname !== undefined ||
			m.trxdescription !== undefined ||
			m.amount !== undefined ||
			m.trxtypeid !== undefined
		);
	};

	for (const root of rootsToTry) {
		const direct = root?.Details ?? root?.details;
		if (Array.isArray(direct) && direct.some(looksLikeExitTrxRow)) return direct;

		const datasets = collectDetailDatasets(root);
		const match = datasets.find((arr) => Array.isArray(arr) && arr.some(looksLikeExitTrxRow));
		if (match) return match;
	}

	return [];
}

function epExtractOldApiError(resp) {
	// OldAPI errors often come as: { Status: '091', Message: '...' }
	const root = resp?.data ?? resp;
	const status = String(root?.Status ?? root?.status ?? '').trim();
	const message = String(root?.Message ?? root?.message ?? '').trim();
	if (!status) return null;
	if (status === '0' || status === '200') return null;
	// Most screens treat any non-zero status as warning/error.
	return { status, message: message || `Request failed (Status ${status})` };
}

function epMapExitTrxRowsToGrids(detailsRows, { forfeitSavingsAmount = 0 } = {}) {
	const rows = Array.isArray(detailsRows) ? detailsRows : [];
	const forfeitSavings = safeNumber(forfeitSavingsAmount);
	const shouldShowForfeits = forfeitSavings > 0;
	const normalizeBool = (v) => {
		if (typeof v === 'boolean') return v;
		const s = String(v ?? '').trim().toLowerCase();
		if (s === 'true' || s === '1' || s === 'y' || s === 'yes') return true;
		if (s === 'false' || s === '0' || s === 'n' || s === 'no') return false;
		return false;
	};

	const hasIsForfeitField = (r, m) => {
		return (
			(r && typeof r === 'object' && ('IsForfeit' in r || 'isForfeit' in r)) ||
			(m && typeof m === 'object' && 'isforfeit' in m)
		);
	};

	const looksLikeSavingsForfeit = ({ accountName, trxDescription }) => {
		const hay = `${String(accountName || '')} ${String(trxDescription || '')}`.toLowerCase();
		// Heuristic: savings-related trx descriptions/names.
		return (
			hay.includes('savings') ||
			hay.includes('compulsory') ||
			hay.includes('voluntary') ||
			hay.includes('interest payable')
		);
	};

	const mapped = rows
		.map((r) => {
			if (!r || typeof r !== 'object') return null;
			const m = normalizeRowKeyMap(r);
			const apiHasFlag = hasIsForfeitField(r, m);
			const apiFlag = apiHasFlag ? normalizeBool(m.isforfeit ?? r.IsForfeit ?? r.isForfeit) : null;
			const accountId = m.accountid ?? '';
			const accountName = m.accountname ?? '';
			const trxDescription = m.trxdescription ?? m.description ?? '';
			const trxType = m.trxtypeid ?? m.transactiontype ?? '';
			const accountType = m.accounttypeid ?? m.accounttype ?? '';
			const amount = m.amount ?? '';

			let isForfeit = false;
			if (shouldShowForfeits) {
				if (apiFlag !== null) {
					isForfeit = apiFlag;
				} else {
					isForfeit = looksLikeSavingsForfeit({ accountName, trxDescription });
				}
			}

			return {
				isForfeit,
				accountsRow: {
					accountId,
					accountName,
					amount,
					trxDescription,
				},
				forfeitRow: {
					accountType,
					accountId,
					description: trxDescription || accountName,
					transactionType: trxType,
					amount,
				},
			};
		})
		.filter(Boolean);

	const forfeitRows = shouldShowForfeits ? mapped.filter((x) => x.isForfeit).map((x) => x.forfeitRow) : [];
	const trxRows = mapped.filter((x) => !x.isForfeit).map((x) => x.accountsRow);

	return { trxRows, forfeitRows };
}

function epApplyButtonStateAfterExitTrxLoad() {
	const btnAdd = $('btnAdd');
	const btnSave = $('btnSave');
	const btnCancel = $('btnCancel');

	if (btnSave) btnSave.disabled = false;
	if (btnCancel) btnCancel.disabled = false;
	if (btnAdd) btnAdd.disabled = true;
}

async function callExitTrx(service, requestData) {
	return typeof service.getExitTrx === 'function'
		? await service.getExitTrx(requestData)
		: await service.getClientExitDetails(requestData);
}

function getOperatorId() {
	return (
		sessionStorage.getItem('operatorId') ||
		sessionStorage.getItem('operatorID') ||
		sessionStorage.getItem('operator') ||
		'web_portal'
	);
}

function getOurBranchId() {
	return (
		window.Environment?.OurBranchID ||
		window.Environment?.defaultOurBranchId ||
		sessionStorage.getItem('OurBranchID') ||
		sessionStorage.getItem('branchId') ||
		EXIT_PROCESS_BRANCH_ID
	);
}

function getOurBranchName() {
	return (
		window.Environment?.OurBranchName ||
		window.Environment?.defaultOurBranchName ||
		sessionStorage.getItem('OurBranchName') ||
		sessionStorage.getItem('branchName') ||
		''
	);
}

function epGetBankId() {
	return (
		window.Environment?.BankID ||
		window.Environment?.defaultBankId ||
		sessionStorage.getItem('BankID') ||
		sessionStorage.getItem('bankId') ||
		localStorage.getItem('BankID') ||
		localStorage.getItem('bankId') ||
		''
	);
}

function epClearCenterDependents() {
	const gId = document.getElementById('groupId');
	const gName = document.getElementById('groupName');
	if (gId) gId.value = '';
	if (gName) gName.value = '';

	const cId = document.getElementById('clientId');
	const cName = document.getElementById('clientName');
	if (cId) cId.value = '';
	if (cName) cName.value = '';
}

function epClearGroupDependents() {
	const cId = document.getElementById('clientId');
	const cName = document.getElementById('clientName');
	if (cId) cId.value = '';
	if (cName) cName.value = '';
}

function epClearBranchDependents() {
	const centerIdEl = document.getElementById('centerId');
	const centerNameEl = document.getElementById('centerName');
	if (centerIdEl) centerIdEl.value = '';
	if (centerNameEl) centerNameEl.value = '';

	const groupIdEl = document.getElementById('groupId');
	const groupNameEl = document.getElementById('groupName');
	if (groupIdEl) groupIdEl.value = '';
	if (groupNameEl) groupNameEl.value = '';

	epClearGroupDependents();
}

function epExtractDetailsArray(resp) {
	const root = resp?.data ?? resp;
	const direct = root?.Details ?? root?.details;
	if (Array.isArray(direct)) return direct;

	const datasets = collectDetailDatasets(root);
	const match = datasets.find((arr) => Array.isArray(arr) && arr.some((r) => r && typeof r === 'object'));
	return Array.isArray(match) ? match : [];
}

async function epValidateCenterIdOnChange(e) {
	const centerIdEl = document.getElementById('centerId');
	const centerNameEl = document.getElementById('centerName');
	if (!centerIdEl) return;

	const centerId = String(centerIdEl.value || '').trim();

	// If empty, just clear name + dependents.
	if (!centerId) {
		if (centerNameEl) centerNameEl.value = '';
		epClearCenterDependents();
		centerIdEl.dataset.epLastValidated = '';
		return;
	}

	// Avoid repeated validations for same value.
	if (centerIdEl.dataset.epLastValidated === centerId) return;

	const branchId = epGetLookupBranchId();
	const bankId = String(epGetBankId() || '00').trim();

	const requestData = {
		OurBranchID: branchId,
		ControlTypeID: 'GroupID',
		ID: centerId,
		BankID: bankId,
		TypeID: '',
		AdvanceFilter: ` OurBranchID='${branchId}'`,
		LanguageID: 'en',
	};

	try {
		const svc = await ensureMicrofinanceServiceLoaded();
		const validateFn =
			typeof svc.validateCenterID === 'function'
				? svc.validateCenterID.bind(svc)
				: typeof svc.validateCenter === 'function'
					? svc.validateCenter.bind(svc)
					: null;

		if (!validateFn) {
			epToast('MicrofinanceService.validateCenterID is not available', 'danger');
			return;
		}

		const resp = await validateFn(requestData);
		if (!resp?.success) {
			epToast(resp?.message || 'Invalid Center', 'warning');
			centerIdEl.value = '';
			if (centerNameEl) centerNameEl.value = '';
			epClearCenterDependents();
			centerIdEl.dataset.epLastValidated = '';
			centerIdEl.focus();
			centerIdEl.select?.();
			return;
		}

		// p_GetIDDescription typically returns { Details: [{ GroupName: ... }] }
		// epExtractOldApiDetails is specialized for ExitTrx datasets and may return [] here.
		const details = epExtractDetailsArray(resp).filter(
			(r) =>
				r &&
				typeof r === 'object' &&
				('GroupName' in r || 'CenterName' in r || 'Name' in r || 'Description' in r)
		);
		if (details.length === 0) {
			epToast('Invalid Center', 'warning');
			centerIdEl.value = '';
			if (centerNameEl) centerNameEl.value = '';
			epClearCenterDependents();
			centerIdEl.dataset.epLastValidated = '';
			centerIdEl.focus();
			centerIdEl.select?.();
			return;
		}

		const row = details[0] || {};
		const centerName = String(row.GroupName || row.CenterName || row.Name || row.Description || '').trim();
		if (!centerName) {
			epToast('Invalid Center', 'warning');
			centerIdEl.value = '';
			if (centerNameEl) centerNameEl.value = '';
			epClearCenterDependents();
			centerIdEl.dataset.epLastValidated = '';
			centerIdEl.focus();
			centerIdEl.select?.();
			return;
		}

		// Valid: populate center name + clear dependents.
		if (centerNameEl) centerNameEl.value = centerName;
		epClearCenterDependents();
		centerIdEl.dataset.epLastValidated = centerId;
	} catch (err) {
		console.warn('[Exit Process] CenterID validation failed:', err);
		epToast(err?.message || 'Center validation failed', 'danger');
	}
}

async function epValidateGroupIdOnChange(e) {
	const groupIdEl = document.getElementById('groupId');
	const groupNameEl = document.getElementById('groupName');
	if (!groupIdEl) return;

	const groupId = String(groupIdEl.value || '').trim();
	const centerId = String(document.getElementById('centerId')?.value || '').trim();

	if (!groupId) {
		if (groupNameEl) groupNameEl.value = '';
		epClearGroupDependents();
		groupIdEl.dataset.epLastValidated = '';
		return;
	}

	// Avoid repeated validations for same value + center combo.
	const comboKey = `${centerId}::${groupId}`;
	if (groupIdEl.dataset.epLastValidated === comboKey) return;

	const branchId = epGetLookupBranchId();
	if (!centerId) {
		epToast('Select Center before Group', 'warning');
		groupIdEl.value = '';
		if (groupNameEl) groupNameEl.value = '';
		epClearGroupDependents();
		groupIdEl.dataset.epLastValidated = '';
		groupIdEl.focus();
		groupIdEl.select?.();
		return;
	}

	const bankId = String(epGetBankId() || '00').trim();
	const requestData = {
		OurBranchID: branchId,
		ControlTypeID: 'SubGroupID',
		ID: groupId,
		BankID: bankId,
		TypeID: '',
		AdvanceFilter: ` OurBranchID='${branchId}' AND GroupID='${centerId}'`,
		LanguageID: 'en',
	};

	try {
		const svc = await ensureMicrofinanceServiceLoaded();
		const validateFn =
			typeof svc.validateGroupID === 'function'
				? svc.validateGroupID.bind(svc)
				: typeof svc.validateCenterID === 'function'
					? svc.validateCenterID.bind(svc)
					: typeof svc.validateCenter === 'function'
						? svc.validateCenter.bind(svc)
						: null;

		if (!validateFn) {
			epToast('MicrofinanceService.validateGroupID is not available', 'danger');
			return;
		}

		const resp = await validateFn(requestData);
		if (!resp?.success) {
			epToast(resp?.message || 'Invalid Group ID', 'warning');
			groupIdEl.value = '';
			if (groupNameEl) groupNameEl.value = '';
			epClearGroupDependents();
			groupIdEl.dataset.epLastValidated = '';
			groupIdEl.focus();
			groupIdEl.select?.();
			return;
		}

		const details = epExtractDetailsArray(resp);
		if (!details.length) {
			epToast('Invalid Group ID', 'warning');
			groupIdEl.value = '';
			if (groupNameEl) groupNameEl.value = '';
			epClearGroupDependents();
			groupIdEl.dataset.epLastValidated = '';
			groupIdEl.focus();
			groupIdEl.select?.();
			return;
		}

		const row = details[0] || {};
		// As requested: load SubGroupID into the Group Name field.
		const label = String(row.SubGroupID || row.SubGroupName || row.GroupName || row.Name || '').trim();
		if (!label) {
			epToast('Invalid Group ID', 'warning');
			groupIdEl.value = '';
			if (groupNameEl) groupNameEl.value = '';
			epClearGroupDependents();
			groupIdEl.dataset.epLastValidated = '';
			groupIdEl.focus();
			groupIdEl.select?.();
			return;
		}

		if (groupNameEl) groupNameEl.value = label;
		epClearGroupDependents();
		groupIdEl.dataset.epLastValidated = comboKey;
	} catch (err) {
		console.warn('[Exit Process] GroupID validation failed:', err);
		epToast(err?.message || 'Group validation failed', 'danger');
	}
}

async function epValidateBranchIdOnChange(e) {
	const branchIdEl = document.getElementById('branchId');
	const branchNameEl = document.getElementById('branchName');
	if (!branchIdEl) return;

	const branchId = String(branchIdEl.value || '').trim();
	if (!branchId) {
		if (branchNameEl) branchNameEl.value = '';
		epClearBranchDependents();
		branchIdEl.dataset.epLastValidated = '';
		return;
	}

	if (branchIdEl.dataset.epLastValidated === branchId) return;

	const bankId = String(epGetBankId() || '00').trim();
	const requestData = {
		OurBranchID: branchId,
		ControlTypeID: 'BranchID',
		ID: branchId,
		BankID: bankId,
		TypeID: '',
		AdvanceFilter: '',
		LanguageID: 'en',
	};

	try {
		const svc = await ensureMicrofinanceServiceLoaded();
		const validateFn = typeof svc.validateBranchID === 'function' ? svc.validateBranchID.bind(svc) : null;
		if (!validateFn) {
			epToast('MicrofinanceService.validateBranchID is not available', 'danger');
			return;
		}

		const resp = await validateFn(requestData);
		if (!resp?.success) {
			epToast(resp?.message || 'Invalid Branch ID', 'warning');
			branchIdEl.value = '';
			if (branchNameEl) branchNameEl.value = '';
			epClearBranchDependents();
			branchIdEl.dataset.epLastValidated = '';
			branchIdEl.focus();
			branchIdEl.select?.();
			return;
		}

		const details = epExtractDetailsArray(resp).filter(
			(r) => r && typeof r === 'object' && ('BranchName' in r || 'Name' in r || 'Description' in r)
		);
		if (!details.length) {
			epToast('Invalid Branch ID', 'warning');
			branchIdEl.value = '';
			if (branchNameEl) branchNameEl.value = '';
			epClearBranchDependents();
			branchIdEl.dataset.epLastValidated = '';
			branchIdEl.focus();
			branchIdEl.select?.();
			return;
		}

		const row = details[0] || {};
		const branchName = String(row.BranchName || row.Name || row.Description || '').trim();
		if (!branchName) {
			epToast('Invalid Branch ID', 'warning');
			branchIdEl.value = '';
			if (branchNameEl) branchNameEl.value = '';
			epClearBranchDependents();
			branchIdEl.dataset.epLastValidated = '';
			branchIdEl.focus();
			branchIdEl.select?.();
			return;
		}

		if (branchNameEl) branchNameEl.value = branchName;
		epClearBranchDependents();
		branchIdEl.dataset.epLastValidated = branchId;
	} catch (err) {
		console.warn('[Exit Process] BranchID validation failed:', err);
		epToast(err?.message || 'Branch validation failed', 'danger');
	}
}

function epGetWorkingDate() {
	const env = window.Environment || {};
	const workingDateStr = env.workingDate || env.WorkingDate || env.systemDate || env.SystemDate;
	if (workingDateStr) {
		const d = new Date(workingDateStr);
		if (!isNaN(d.getTime())) return d;
	}
	return new Date();
}

async function epInitLoggedInBranch() {
	const branchIdEl = document.getElementById('branchId');
	const branchNameEl = document.getElementById('branchName');
	if (!branchIdEl || !branchNameEl) return;

	// Prefer environment/session branch context.
	const loggedInBranchId = String(getOurBranchId() || '').trim();
	const loggedInBranchName = String(getOurBranchName() || '').trim();

	if (!branchIdEl.value.trim() && loggedInBranchId) {
		branchIdEl.value = loggedInBranchId;
		branchIdEl.dataset.epLastValidated = loggedInBranchId;
	}

	if (!branchNameEl.value.trim() && loggedInBranchName) {
		branchNameEl.value = loggedInBranchName;
	}

	// If we have an ID but still no name, resolve via server.
	const finalBranchId = String(branchIdEl.value || '').trim();
	if (finalBranchId && !branchNameEl.value.trim()) {
		try {
			const svc = await ensureMicrofinanceServiceLoaded();
			if (typeof svc.validateBranchID !== 'function') return;

			const bankId = String(epGetBankId() || '00').trim();
			const requestData = {
				OurBranchID: finalBranchId,
				ControlTypeID: 'BranchID',
				ID: finalBranchId,
				BankID: bankId,
				TypeID: '',
				AdvanceFilter: '',
				LanguageID: 'en',
			};

			const resp = await svc.validateBranchID(requestData);
			const details = epExtractDetailsArray(resp).filter(
				(r) => r && typeof r === 'object' && ('BranchName' in r || 'OurBranchName' in r || 'Name' in r || 'Description' in r)
			);
			const row = details[0] || {};
			const name = String(row.BranchName || row.OurBranchName || row.Name || row.Description || '').trim();
			if (name) branchNameEl.value = name;
		} catch (err) {
			console.warn('[Exit Process] Failed to resolve logged-in branch name:', err);
		}
	}
}

function handleCancel() {
	// Clear all data fields and grids
	clearForm({ keepClientId: false });

	// Reset branch to logged-in context
	const loggedInBranchId = String(getOurBranchId() || '').trim();
	const loggedInBranchName = String(getOurBranchName() || '').trim();
	const branchIdEl = document.getElementById('branchId');
	const branchNameEl = document.getElementById('branchName');
	if (branchIdEl) {
		branchIdEl.value = loggedInBranchId;
		branchIdEl.dataset.epLastValidated = loggedInBranchId;
	}
	if (branchNameEl) branchNameEl.value = loggedInBranchName;

	// Clear validation caches for all ID fields
	const centerIdEl = document.getElementById('centerId');
	const groupIdEl = document.getElementById('groupId');
	const clientIdEl = document.getElementById('clientId');
	if (centerIdEl) centerIdEl.dataset.epLastValidated = '';
	if (groupIdEl) groupIdEl.dataset.epLastValidated = '';
	if (clientIdEl) clientIdEl.dataset.epLastValidated = '';

	// Enable identity fields and View button
	const identityFields = ['branchId', 'centerId', 'groupId', 'clientId', 'exitReason'];
	identityFields.forEach((id) => {
		const el = document.getElementById(id);
		if (el) el.disabled = false;
	});
	const btnView = $('btnView');
	if (btnView) btnView.disabled = false;

	// Disable edit/modify buttons
	const disableButtons = ['btnAdd', 'btnSave'];
	disableButtons.forEach((id) => {
		const el = $(id);
		if (el) el.disabled = true;
	});

	// Exit edit mode (if any)
	setEditMode(false);

	showStatus('Cancelled', 'info');
}

async function epValidateClientIdOnChange(e) {
	const clientIdEl = document.getElementById('clientId');
	const clientNameEl = document.getElementById('clientName');
	if (!clientIdEl) return false;

	const clientId = String(clientIdEl.value || '').trim();
	const branchId = epGetLookupBranchId();
	const centerId = String(document.getElementById('centerId')?.value || '').trim();
	const subGroupId = String(document.getElementById('groupId')?.value || '').trim();

	if (!clientId) {
		if (clientNameEl) clientNameEl.value = '';
		clientIdEl.dataset.epLastValidated = '';
		return true;
	}

	// Avoid repeated validations for same context.
	const comboKey = `${branchId}::${centerId}::${subGroupId}::${clientId}`;
	if (clientIdEl.dataset.epLastValidated === comboKey) return true;

	if (!centerId || !subGroupId) {
		epToast('Select Center and Group before Client', 'warning');
		clientIdEl.value = '';
		if (clientNameEl) clientNameEl.value = '';
		clientIdEl.dataset.epLastValidated = '';
		clientIdEl.focus();
		clientIdEl.select?.();
		return false;
	}

	const bankId = String(epGetBankId() || '00').trim();
	const requestData = {
		OurBranchID: branchId,
		ControlTypeID: 'GroupClientActiveID',
		ID: clientId,
		BankID: bankId,
		TypeID: '',
		AdvanceFilter: ` OurBranchID='${branchId}' AND GroupID='${centerId}' AND SubGroupID='${subGroupId}'`,
		LanguageID: 'en',
	};

	try {
		const svc = await ensureMicrofinanceServiceLoaded();
		const validateFn = typeof svc.validateExitGroupClient === 'function' ? svc.validateExitGroupClient.bind(svc) : null;
		if (!validateFn) {
			epToast('MicrofinanceService.validateExitGroupClient is not available', 'danger');
			return false;
		}

		const resp = await validateFn(requestData);
		if (!resp?.success) {
			epToast(resp?.message || 'Invalid Client ID', 'warning');
			clientIdEl.value = '';
			if (clientNameEl) clientNameEl.value = '';
			clientIdEl.dataset.epLastValidated = '';
			clientIdEl.focus();
			clientIdEl.select?.();
			return false;
		}

		const details = epExtractDetailsArray(resp).filter(
			(r) => r && typeof r === 'object' && ('ClientName' in r || 'CustomerName' in r || 'Name' in r)
		);
		if (!details.length) {
			epToast('Invalid Client ID', 'warning');
			clientIdEl.value = '';
			if (clientNameEl) clientNameEl.value = '';
			clientIdEl.dataset.epLastValidated = '';
			clientIdEl.focus();
			clientIdEl.select?.();
			return false;
		}

		const row = details[0] || {};
		const clientName = String(row.ClientName || row.CustomerName || row.Name || '').trim();
		if (!clientName) {
			epToast('Invalid Client ID', 'warning');
			clientIdEl.value = '';
			if (clientNameEl) clientNameEl.value = '';
			clientIdEl.dataset.epLastValidated = '';
			clientIdEl.focus();
			clientIdEl.select?.();
			return false;
		}

		if (clientNameEl) clientNameEl.value = clientName;
		clientIdEl.dataset.epLastValidated = comboKey;
		return true;
	} catch (err) {
		console.warn('[Exit Process] ClientID validation failed:', err);
		epToast(err?.message || 'Client validation failed', 'danger');
		return false;
	}
}

async function ensureExitProcessServiceLoaded() {
	if (_exitProcessServicePromise) return _exitProcessServicePromise;

	_exitProcessServicePromise = (async () => {
		if (!window.ServiceLoader) {
			throw new Error('ServiceLoader not available (serviceLoader.js not loaded)');
		}
		await window.ServiceLoader.loadCore();
		await window.ServiceLoader.loadExitProcessService();
		if (!window.ExitProcessService) {
			throw new Error('ExitProcessService failed to load');
		}
		return window.ExitProcessService;
	})();

	return _exitProcessServicePromise;
}

async function ensureClientServiceLoaded() {
	if (_clientServicePromise) return _clientServicePromise;

	_clientServicePromise = (async () => {
		if (!window.ServiceLoader) {
			throw new Error('ServiceLoader not available (serviceLoader.js not loaded)');
		}
		await window.ServiceLoader.loadCore();
		await window.ServiceLoader.loadClientService();
		if (!window.ClientService) {
			throw new Error('ClientService failed to load');
		}
		return window.ClientService;
	})();

	return _clientServicePromise;
}

async function ensureSearchServiceLoaded() {
	if (_searchServicePromise) return _searchServicePromise;

	_searchServicePromise = (async () => {
		// Some shells load ServiceLoader slightly after DOMContentLoaded.
		const start = Date.now();
		while (!window.ServiceLoader) {
			if (Date.now() - start > 5000) {
				throw new Error('ServiceLoader not available (timeout waiting for serviceLoader.js)');
			}
			await new Promise((r) => setTimeout(r, 50));
		}
		await window.ServiceLoader.loadCore();
		await window.ServiceLoader.loadSearchService();
		if (!window.SearchService) {
			throw new Error('SearchService failed to load');
		}
		return window.SearchService;
	})();

	return _searchServicePromise;
}

async function ensureMicrofinanceServiceLoaded() {
	if (_microfinanceServicePromise) return _microfinanceServicePromise;

	_microfinanceServicePromise = (async () => {
		// Some shells load ServiceLoader slightly after DOMContentLoaded.
		const start = Date.now();
		while (!window.ServiceLoader) {
			if (Date.now() - start > 5000) {
				throw new Error('ServiceLoader not available (timeout waiting for serviceLoader.js)');
			}
			await new Promise((r) => setTimeout(r, 50));
		}

		await window.ServiceLoader.loadCore();
		if (!window.MicrofinanceService) {
			await window.ServiceLoader.loadScript('/assets/js/services/microfinance/microfinanceService.js');
		}
		if (!window.MicrofinanceService) {
			throw new Error('MicrofinanceService failed to load');
		}
		return window.MicrofinanceService;
	})();

	return _microfinanceServicePromise;
}

function ensureEpLookupModal() {
	const modalEl = document.getElementById('epLookupModal');
	if (!modalEl) throw new Error('Lookup modal markup missing (epLookupModal)');
	if (!_epLookupModalInstance) {
		_epLookupModalInstance = bootstrap.Modal.getOrCreateInstance(modalEl, { backdrop: 'static' });
	}
	return modalEl;
}

function epSetLookupMeta(text) {
	const el = document.getElementById('epLookupMeta');
	if (el) el.textContent = String(text || '');
}

function epClearLookupResults() {
	const body = document.getElementById('epLookupResults');
	if (body) body.innerHTML = '';
}

function escapeSqlLikeTerm(value) {
	return String(value ?? '')
		.trim()
		.replace(/\s+/g, ' ')
		.replace(/[\r\n;]/g, '')
		.replace(/'/g, "''");
}

function epBuildWhereStmt({ idCol, nameCol }) {
	const idVal = String(document.getElementById('epLookupId')?.value || '').trim();
	const idMode = String(document.getElementById('epLookupIdMode')?.value || 'Like');
	const nameVal = String(document.getElementById('epLookupName')?.value || '').trim();
	const nameMode = String(document.getElementById('epLookupNameMode')?.value || 'Like');

	const clauses = [];
	if (idVal) {
		const term = escapeSqlLikeTerm(idVal);
		clauses.push(idMode === 'Exact' ? `${idCol} = '${term}'` : `${idCol} like '%${term}%'`);
	}
	if (nameVal) {
		const term = escapeSqlLikeTerm(nameVal);
		clauses.push(nameMode === 'Exact' ? `${nameCol} = '${term}'` : `${nameCol} like '%${term}%'`);
	}

	return clauses.join(' AND ');
}

function epGetLookupBranchId() {
	const fromField = String(document.getElementById('branchId')?.value || '').trim();
	return fromField || getOurBranchId();
}

function epExtractRows(result) {
	const root = result?.data ?? result;
	const rows = root?.Details ?? root?.details ?? root?.Data ?? root?.data;
	return Array.isArray(rows) ? rows : [];
}

function epRenderLookupRows(rows, { col1, col2, getCol1, getCol2, onSelect }) {
	epClearLookupResults();
	const tbody = document.getElementById('epLookupResults');
	if (!tbody) return;

	const limited = Array.isArray(rows) ? rows.slice(0, 500) : [];
	limited.forEach((row, idx) => {
		const tr = document.createElement('tr');
		tr.tabIndex = 0;

		const tdIdx = document.createElement('td');
		tdIdx.textContent = String(idx + 1);

		const td1 = document.createElement('td');
		td1.textContent = String(getCol1(row) ?? '').trim();
		const td2 = document.createElement('td');
		td2.textContent = String(getCol2(row) ?? '').trim();

		tr.appendChild(tdIdx);
		tr.appendChild(td1);
		tr.appendChild(td2);

		const select = () => {
			try {
				onSelect?.(row);
				_epLookupModalInstance?.hide?.();
			} catch (e) {
				console.warn('[Exit Process] Failed to select lookup row:', e);
			}
		};

		tr.addEventListener('click', (e) => {
			e.preventDefault();
			select();
		});
		tr.addEventListener('dblclick', select);
		tr.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				select();
			}
		});

		tbody.appendChild(tr);
	});

	// Update column headers
	const c1 = document.getElementById('epLookupCol1');
	const c2 = document.getElementById('epLookupCol2');
	if (c1) c1.textContent = col1;
	if (c2) c2.textContent = col2;

	epSetLookupMeta(limited.length ? `${limited.length} result(s)` : 'No records to display.');
}

async function epRunLookupSearch() {
	if (!_epActiveLookup) return;
	const { type } = _epActiveLookup;
	epClearLookupResults();
	epSetLookupMeta('Searching...');

	if (type === 'branch') {
		// Prefer SearchService (p_GetSearchResult) for branches; it is consistent with other modules.
		try {
			await ensureSearchServiceLoaded();
			const operatorId = getOperatorId();
			const branchId = epGetLookupBranchId();
			const search = window.SearchService;
			const doSearchBranches = async (payload) => {
				if (typeof search.search === 'function') return await search.search(payload);
				if (typeof search.searchClients === 'function') return await search.searchClients(payload);
				throw new Error('SearchService has no supported search method');
			};

			const whereStmt = epBuildWhereStmt({ idCol: 'OurBranchID', nameCol: 'BranchName' });
			const payload = {
				TableID: 'BranchID',
				AdvFilterString: '',
				WhereStmt: whereStmt || '1=1',
				PrevOrNext: '0',
				RefID: '',
				OperatorID: operatorId,
				ModuleID: 1000,
				OurBranchID: branchId,
			};

			const res = await doSearchBranches(payload);
			_epBranchCache = epExtractRows(res);
		} catch (e) {
			console.warn('[Exit Process] Branch lookup SearchService failed:', e);
			_epBranchCache = _epBranchCache || [];
		}

		// Secondary: OldAPI pc_SearchSystemBranches (if available)
		if (!_epBranchCache || _epBranchCache.length === 0) {
			try {
				const svc = await ensureMicrofinanceServiceLoaded();
				const bankId =
					window.Environment?.BankID ||
					window.Environment?.defaultBankId ||
					sessionStorage.getItem('BankID') ||
					sessionStorage.getItem('bankId') ||
					localStorage.getItem('BankID') ||
					localStorage.getItem('bankId') ||
					'';
				const res = await svc.searchSystemBranches({ BankID: bankId });
				_epBranchCache = epExtractRows(res);
			} catch (e) {
				console.warn('[Exit Process] Branch lookup OldAPI fallback failed:', e);
			}
		}

		const idVal = String(document.getElementById('epLookupId')?.value || '').trim().toLowerCase();
		const nameVal = String(document.getElementById('epLookupName')?.value || '').trim().toLowerCase();
		const idMode = String(document.getElementById('epLookupIdMode')?.value || 'Like');
		const nameMode = String(document.getElementById('epLookupNameMode')?.value || 'Like');

		const matches = (field, term, mode) => {
			const f = String(field || '').toLowerCase();
			if (!term) return true;
			return mode === 'Exact' ? f === term : f.includes(term);
		};

		const filtered = (_epBranchCache || []).filter((r) =>
			matches(r.OurBranchID ?? r.BranchID ?? r.ID, idVal, idMode) &&
			matches(r.BranchName ?? r.Name ?? r.Description, nameVal, nameMode)
		);

		epRenderLookupRows(filtered, {
			col1: 'Branch ID',
			col2: 'Branch Name',
			getCol1: (r) => r.OurBranchID ?? r.BranchID ?? r.ID,
			getCol2: (r) => r.BranchName ?? r.Name ?? r.Description,
			onSelect: (r) => {
				const id = String(r.OurBranchID ?? r.BranchID ?? r.ID ?? '').trim();
				const name = String(r.BranchName ?? r.Name ?? r.Description ?? '').trim();
				const idEl = document.getElementById('branchId');
				const nameEl = document.getElementById('branchName');
				if (idEl) idEl.value = id;
				if (nameEl) nameEl.value = name;
			},
		});
		return;
	}

	// Center + Group use SearchService (p_GetSearchResult)
	await ensureSearchServiceLoaded();
	const operatorId = getOperatorId();
	const branchId = epGetLookupBranchId();

	const search = window.SearchService;
	const doSearch = async (payload) => {
		if (typeof search.search === 'function') return await search.search(payload);
		if (typeof search.searchClients === 'function') return await search.searchClients(payload);
		throw new Error('SearchService has no supported search method');
	};

	if (type === 'center') {
		const whereStmt = epBuildWhereStmt({ idCol: 'GroupID', nameCol: 'GroupName' });
		const payload = {
			TableID: 'GroupID',
			AdvFilterString: `OurBranchID='${branchId}' AND GroupStatusID='A'`,
			WhereStmt: whereStmt,
			PrevOrNext: '0',
			RefID: '',
			OperatorID: operatorId,
			ModuleID: 1000,
			OurBranchID: branchId,
		};
		const res = await doSearch(payload);
		const rows = epExtractRows(res);
		epRenderLookupRows(rows, {
			col1: 'Center ID',
			col2: 'Center Name',
			getCol1: (r) => r.GroupID ?? r.CenterID,
			getCol2: (r) => r.GroupName ?? r.CenterName,
			onSelect: (r) => {
				const idEl = document.getElementById('centerId');
				const nameEl = document.getElementById('centerName');
				if (idEl) idEl.value = String(r.GroupID ?? r.CenterID ?? '').trim();
				if (nameEl) nameEl.value = String(r.GroupName ?? r.CenterName ?? '').trim();
				// Clear subgroup when center changes
				const gId = document.getElementById('groupId');
				const gName = document.getElementById('groupName');
				if (gId) gId.value = '';
				if (gName) gName.value = '';

				// Clear client when center changes
				const cId = document.getElementById('clientId');
				const cName = document.getElementById('clientName');
				if (cId) cId.value = '';
				if (cName) cName.value = '';

				// Chain dependent lookups.
				if (_epPendingLookup === 'group') {
					_epPendingLookup = null;
					window.setTimeout(() => epOpenLookup('group'), 150);
				} else if (_epPendingLookup === 'client') {
					// Client lookup requires Group selection first.
					window.setTimeout(() => epOpenLookup('group'), 150);
				}
			},
		});
		return;
	}

	if (type === 'group') {
		const centerId = String(document.getElementById('centerId')?.value || '').trim();
		if (!centerId) {
			epSetLookupMeta('Select Center ID first to load Groups.');
			return;
		}
		const whereStmt = epBuildWhereStmt({ idCol: 'SubGroupID', nameCol: 'SubGroupName' });
		const adv = `OurBranchID='${branchId}' AND GroupID='${escapeSqlLikeTerm(centerId)}'`;
		const payload = {
			TableID: 'SubGroupID',
			AdvFilterString: adv,
			WhereStmt: whereStmt,
			PrevOrNext: '0',
			RefID: '',
			OperatorID: operatorId,
			ModuleID: 1000,
			OurBranchID: branchId,
		};
		const res = await doSearch(payload);
		const rows = epExtractRows(res);
		epRenderLookupRows(rows, {
			col1: 'Group ID',
			col2: 'Group Name',
			getCol1: (r) => r.SubGroupID ?? r.GroupID,
			getCol2: (r) => r.SubGroupName ?? r.GroupName,
			onSelect: (r) => {
				const idEl = document.getElementById('groupId');
				const nameEl = document.getElementById('groupName');
				if (idEl) idEl.value = String(r.SubGroupID ?? r.GroupID ?? '').trim();
				if (nameEl) nameEl.value = String(r.SubGroupName ?? r.GroupName ?? '').trim();

				// Clear client when group changes
				const cId = document.getElementById('clientId');
				const cName = document.getElementById('clientName');
				if (cId) cId.value = '';
				if (cName) cName.value = '';

				// If user requested Client lookup but Group was missing, chain-open Client after selecting Group.
				if (_epPendingLookup === 'client') {
					_epPendingLookup = null;
					window.setTimeout(() => epOpenLookup('client'), 150);
				}
			},
		});
		return;
	}

	if (type === 'client') {
		const centerId = String(document.getElementById('centerId')?.value || '').trim();
		const groupId = String(document.getElementById('groupId')?.value || '').trim();
		if (!centerId || !groupId) {
			epSetLookupMeta(!centerId ? 'Select Center ID first to load Clients.' : 'Select Group ID first to load Clients.');
			return;
		}

		// Client lookup must be scoped: Client.GroupID = CenterID, Client.SubGroupID = GroupID
		const whereStmt = epBuildWhereStmt({ idCol: 'ClientID', nameCol: 'Name' });
		const adv = `OurBranchID='${branchId}' AND GroupID='${escapeSqlLikeTerm(centerId)}' AND SubGroupID='${escapeSqlLikeTerm(groupId)}'`;
		const payload = {
			TableID: 'GroupClientID',
			AdvFilterString: adv,
			WhereStmt: whereStmt || '1=1',
			PrevOrNext: '0',
			RefID: '',
			OperatorID: operatorId,
			ModuleID: 1000,
			OurBranchID: branchId,
		};
		const res = await doSearch(payload);
		const rows = epExtractRows(res);
		epRenderLookupRows(rows, {
			col1: 'Client ID',
			col2: 'Client Name',
			getCol1: (r) => r.ClientID ?? r.GroupClientID ?? r.ID,
			getCol2: (r) => r.Name ?? r.ClientName ?? r.CustomerName ?? r.Description,
			onSelect: (r) => {
				const idEl = document.getElementById('clientId');
				const nameEl = document.getElementById('clientName');
				if (idEl) idEl.value = String(r.ClientID ?? r.GroupClientID ?? r.ID ?? '').trim();
				if (nameEl) nameEl.value = String(r.Name ?? r.ClientName ?? r.CustomerName ?? r.Description ?? '').trim();
			},
		});
		return;
	}
}

function epOpenLookup(type) {
	if (type === 'group') {
		const centerId = String(document.getElementById('centerId')?.value || '').trim();
		if (!centerId) {
			_epPendingLookup = 'group';
			showStatus('Select Center ID first', 'warning');
			return epOpenLookup('center');
		}
	}

	if (type === 'client') {
		const centerId = String(document.getElementById('centerId')?.value || '').trim();
		const groupId = String(document.getElementById('groupId')?.value || '').trim();
		if (!centerId) {
			_epPendingLookup = 'client';
			showStatus('Select Center ID first', 'warning');
			return epOpenLookup('center');
		}
		if (!groupId) {
			_epPendingLookup = 'client';
			showStatus('Select Group ID first', 'warning');
			return epOpenLookup('group');
		}
	}

	const modalEl = ensureEpLookupModal();

	_epActiveLookup = { type };
	epClearLookupResults();
	epSetLookupMeta('');

	// Configure labels
	const label = document.getElementById('epLookupModalLabel');
	const idLabel = document.getElementById('epLookupIdLabel');
	const nameLabel = document.getElementById('epLookupNameLabel');
	const col1 = document.getElementById('epLookupCol1');
	const col2 = document.getElementById('epLookupCol2');

	if (type === 'branch') {
		if (label) label.textContent = 'Branch Lookup';
		if (idLabel) idLabel.textContent = 'Branch ID';
		if (nameLabel) nameLabel.textContent = 'Branch Name';
		if (col1) col1.textContent = 'Branch ID';
		if (col2) col2.textContent = 'Branch Name';
	} else if (type === 'center') {
		if (label) label.textContent = 'Center Lookup';
		if (idLabel) idLabel.textContent = 'Center ID';
		if (nameLabel) nameLabel.textContent = 'Center Name';
		if (col1) col1.textContent = 'Center ID';
		if (col2) col2.textContent = 'Center Name';
	} else if (type === 'client') {
		if (label) label.textContent = 'Client Lookup';
		if (idLabel) idLabel.textContent = 'Client ID';
		if (nameLabel) nameLabel.textContent = 'Client Name';
		if (col1) col1.textContent = 'Client ID';
		if (col2) col2.textContent = 'Client Name';
	} else {
		if (label) label.textContent = 'Group Lookup';
		if (idLabel) idLabel.textContent = 'Group ID';
		if (nameLabel) nameLabel.textContent = 'Group Name';
		if (col1) col1.textContent = 'Group ID';
		if (col2) col2.textContent = 'Group Name';
	}

	// Reset inputs
	const idEl = document.getElementById('epLookupId');
	const nameEl = document.getElementById('epLookupName');
	if (idEl) idEl.value = '';
	if (nameEl) nameEl.value = '';

	_epLookupModalInstance.show();

	// Focus first input
	window.setTimeout(() => idEl?.focus?.(), 0);

	// Auto-run search on open
	window.setTimeout(() => {
		epRunLookupSearch().catch((err) => {
			console.warn('[Exit Process] Lookup auto-search failed:', err);
			epSetLookupMeta(err?.message || String(err));
		});
	}, 50);
}

function extractExitTypeRows(searchResult) {
	const root = searchResult?.data ?? searchResult;
	const rows = root?.Details;
	return Array.isArray(rows) ? rows : [];
}

async function loadExitTypesIntoExitReasonDropdown() {
	const select = $('exitReason');
	if (!select) return;
	if (select.dataset.exitTypesLoaded === '1') return;

	const previousValue = String(select.value ?? '').trim();

	// Preserve the first option (placeholder) if present.
	const placeholder = select.querySelector('option[value=""]');
	select.innerHTML = '';
	if (placeholder) {
		select.appendChild(placeholder);
	} else {
		const opt = document.createElement('option');
		opt.value = '';
		opt.textContent = 'Select Exit Type ID';
		select.appendChild(opt);
	}

	// Temporary loading state
	select.disabled = true;
	const loadingOpt = document.createElement('option');
	loadingOpt.value = '';
	loadingOpt.textContent = 'Loading Exit Types...';
	select.appendChild(loadingOpt);

	try {
		const searchService = await ensureSearchServiceLoaded();

		const buildPayload = (ourBranchId) => ({
			TableID: 'ExitTypeID',
			WhereStmt: '1=1',
			AdvFilterString: '',
			PrevOrNext: '1',
			RefID: '',
			OperatorID: getOperatorId(),
			ModuleID: 1000,
			OurBranchID: ourBranchId,
		});

		// Prefer current branch, but some environments keep master lists under 0101.
		const branchesToTry = [getOurBranchId(), EXIT_PROCESS_BRANCH_ID, '0101']
			.map((b) => String(b || '').trim())
			.filter(Boolean);

		let rows = [];
		let lastResponse = null;
		for (const b of branchesToTry) {
			const res = await searchService.searchClients(buildPayload(b));
			lastResponse = res;
			if (!res?.success) continue;
			rows = extractExitTypeRows(res);
			if (rows.length) break;
		}

		// Normalize + sort
		const normalized = rows
			.map((r) => {
				const id = (r.ExitTypeID || r.ID || r.Id || '').toString().trim();
				const desc = (r.Description || r.Name || r.ExitTypeName || '').toString().trim();
				return { id, desc };
			})
			.filter((x) => x.id);

		normalized.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));

		if (normalized.length === 0) {
			// Don't block the page; leave placeholder and show a helpful message.
			console.warn('[Exit Process] No Exit Types returned for dropdown. Last response:', lastResponse);
			showStatus('No Exit Types found to populate Exit Reason. Check p_GetSearchResult (TableID ExitTypeID).', 'warning');
			return;
		}

		for (const x of normalized) {
			const opt = document.createElement('option');
			opt.value = x.id;
			opt.textContent = x.desc ? `${x.id} - ${x.desc}` : x.id;
			select.appendChild(opt);
		}

		if (previousValue && Array.from(select.options).some((o) => o.value === previousValue)) {
			select.value = previousValue;
		}

		select.dataset.exitTypesLoaded = '1';
	} catch (e) {
		console.warn('[Exit Process] Failed to load Exit Types for dropdown:', e);
		showStatus(`Failed to load Exit Types: ${e?.message || e}`, 'warning');
	} finally {
		// Remove loading option if still present
		Array.from(select.options)
			.filter((o) => o.textContent === 'Loading Exit Types...')
			.forEach((o) => o.remove());
		select.disabled = false;
	}
}

function normalizeRowKeyMap(obj) {
	const out = {};
	if (!obj || typeof obj !== 'object') return out;
	Object.keys(obj).forEach((k) => {
		out[String(k).toLowerCase()] = obj[k];
	});
	return out;
}

function pickValue(row, keys) {
	const map = normalizeRowKeyMap(row);
	for (const key of keys) {
		const v = map[String(key).toLowerCase()];
		if (v !== undefined && v !== null) return v;
	}
	return undefined;
}

function coerceString(v) {
	if (v === undefined || v === null) return '';
	return String(v);
}

function coerceNumberOrBlank(v) {
	if (v === undefined || v === null || v === '') return '';
	const n = Number(v);
	return Number.isFinite(n) ? String(n) : '';
}

function composeClientNameFromRows({ nameRow, personRow } = {}) {
	const direct = coerceString(pickValue(nameRow, ['ClientName', 'CustomerName', 'Name']));
	if (direct) return direct;

	const first = coerceString(pickValue(personRow, ['FirstName']));
	const middle = coerceString(pickValue(personRow, ['MiddleName']));
	const last = coerceString(pickValue(personRow, ['LastName']));
	const title = coerceString(pickValue(personRow, ['TitleID', 'Title']));
	const parts = [title, first, middle, last].map((s) => String(s || '').trim()).filter(Boolean);
	return parts.join(' ');
}

function findFirstRowWithKeys(root, candidateKeys = []) {
	const keysLower = candidateKeys.map((k) => String(k).toLowerCase());
	const datasets = collectDetailDatasets(root);
	for (const arr of datasets) {
		for (const row of arr) {
			if (!row || typeof row !== 'object') continue;
			const m = normalizeRowKeyMap(row);
			if (keysLower.some((k) => m[k] !== undefined && m[k] !== null && String(m[k]).trim() !== '')) {
				return row;
			}
		}
	}
	return null;
}

function collectDetailDatasets(root) {
	const datasets = [];
	const seen = new Set();
	const push = (arr) => {
		if (!Array.isArray(arr)) return;
		if (seen.has(arr)) return;
		seen.add(arr);
		datasets.push(arr);
	};

	const collectFromObject = (obj) => {
		if (!obj || typeof obj !== 'object') return;
		for (const k of Object.keys(obj)) {
			if (/^Details(\d+)?$/i.test(k)) push(obj[k]);
		}
	};

	push(Array.isArray(root) ? root : null);
	collectFromObject(root);

	// Common wrapper forms
	if (root && typeof root === 'object' && Array.isArray(root.Details) && root.Details.length === 1) {
		collectFromObject(root.Details[0]);
		if (Array.isArray(root.Details[0]?.Details)) push(root.Details[0].Details);
	}

	if (Array.isArray(root)) {
		root.forEach((item) => {
			collectFromObject(item);
			if (item && typeof item === 'object' && Array.isArray(item.Details) && item.Details.length === 1) {
				collectFromObject(item.Details[0]);
				if (Array.isArray(item.Details[0]?.Details)) push(item.Details[0].Details);
			}
		});
	}

	return datasets;
}

function looksLikeHeaderRow(row) {
	if (!row || typeof row !== 'object') return false;
	const m = normalizeRowKeyMap(row);
	return (
		m.clientid !== undefined ||
		m.centerid !== undefined ||
		m.groupid !== undefined ||
		m.exitdate !== undefined ||
		m.netpayable !== undefined ||
		m.forfeitsavingsamount !== undefined ||
		m.forfeitsavings !== undefined
	);
}

function tryApplyApiToFormPayload(payload) {
	if (!payload) return false;

	const root = payload.data ?? payload;
	const datasets = collectDetailDatasets(root);

	if (DEBUG_EXIT_PROCESS) {
		try {
			console.log('[Exit Process] datasets:', datasets.map((d) => ({ len: d.length, keys: d[0] && typeof d[0] === 'object' ? Object.keys(d[0]).slice(0, 20) : [] })));
		} catch {
			// ignore
		}
	}

	let headerRow = null;
	for (const d of datasets) {
		const row = d.find(looksLikeHeaderRow);
		if (row) {
			headerRow = row;
			break;
		}
	}

	// Some procedures (e.g., dbo.p_GetClient) return the client name and group info in
	// separate datasets (Details01/Details02/Details10). Use fallback rows to fill gaps.
	const fallbackNameRow = findFirstRowWithKeys(root, ['ClientName', 'CustomerName', 'Name']);
	const fallbackPersonRow = findFirstRowWithKeys(root, ['FirstName', 'MiddleName', 'LastName', 'TitleID']);
	const fallbackGroupRow = findFirstRowWithKeys(root, ['GroupID', 'GroupName', 'SubGroupID']);

	let didBindAny = false;
	if (headerRow) {
		didBindAny = true;
		$('centerId').value = coerceString(pickValue(headerRow, ['CenterID', 'CenterId', 'centerId']) ?? $('centerId').value);
		$('centerName').value = coerceString(pickValue(headerRow, ['CenterName', 'CenterDescription', 'centerName']) ?? $('centerName').value);
		$('groupId').value = coerceString(pickValue(headerRow, ['GroupID', 'GroupId', 'groupId']) ?? $('groupId').value);
		$('groupName').value = coerceString(pickValue(headerRow, ['GroupName', 'GroupDescription', 'groupName']) ?? $('groupName').value);
		$('clientId').value = coerceString(pickValue(headerRow, ['ClientID', 'ClientId', 'clientId']) ?? $('clientId').value);
		$('clientName').value = coerceString(pickValue(headerRow, ['ClientName', 'CustomerName', 'Name', 'clientName']) ?? $('clientName').value);

		// Exit-type/reason might come back as an ID or description.
		const exitType = pickValue(headerRow, ['ExitTypeID', 'ExitTypeId', 'ExitReason', 'ExitReasonID']);
		if (exitType !== undefined) $('exitReason').value = coerceString(exitType);
		const exitDate = pickValue(headerRow, ['ExitDate', 'ExitDateValue', 'DateOfExit']);
		if (exitDate !== undefined) $('exitDate').value = coerceString(exitDate).slice(0, 10);

		$('totalRecoverable').value = coerceNumberOrBlank(pickValue(headerRow, ['TotalRecoverable']));
		$('totalPayable').value = coerceNumberOrBlank(pickValue(headerRow, ['TotalPayable']));
		$('forfeitSavings').value = coerceNumberOrBlank(pickValue(headerRow, ['ForfeitSavingsAmount', 'ForfeitSavings']));
		$('forfeitCollateral').value = coerceNumberOrBlank(
			pickValue(headerRow, ['ForfeitCollateralsAmount', 'ForfeitCollateralAmount', 'ForfeitCollateral', 'ForfeitCollaterals'])
		);
		$('chargeOffLoss').value = coerceNumberOrBlank(pickValue(headerRow, ['ChargeOffLossAmount', 'ChargeOffLoss', 'ChargeOffLoan']));
		$('chargeOffInsurance').value = coerceNumberOrBlank(
			pickValue(headerRow, ['ChargeOffInsuranceAmount', 'ChargeOffInsurance'])
		);
		$('netPayable').value = coerceNumberOrBlank(pickValue(headerRow, ['NetPayable']));
		$('netReceivable').value = coerceNumberOrBlank(pickValue(headerRow, ['NetReceivable']));
		 
		$('primaryCollateral').value = coerceNumberOrBlank(pickValue(headerRow, ['PrimaryCollateral', 'PrimaryCollateralAmount']));
		$('secondaryCollateral').value = coerceNumberOrBlank(pickValue(headerRow, ['SecondaryCollateral', 'SecondaryCollateralAmount']));
		$('additionalCollateral').value = coerceNumberOrBlank(pickValue(headerRow, ['AdditionalCollateral', 'AdditionalCollateralAmount']));
		$('creditInterest').value = coerceNumberOrBlank(pickValue(headerRow, ['CreditInterest', 'CreditInterestAmount']));
		$('tax').value = coerceNumberOrBlank(pickValue(headerRow, ['TaxOnCreditInterest', 'Tax', 'TaxAmount']));
		$('debitInterest').value = coerceNumberOrBlank(pickValue(headerRow, ['DebitInterest', 'DebitInterestAmount']));
		$('loanBalance').value = coerceNumberOrBlank(pickValue(headerRow, ['LoanBalance', 'DebitLoanBalance']));
	}

	// Fill missing identity fields from fallback datasets.
	if (!$('clientName').value.trim()) {
		const name = composeClientNameFromRows({ nameRow: fallbackNameRow, personRow: fallbackPersonRow });
		if (name) {
			$('clientName').value = name;
			didBindAny = true;
		}
	}
	if (fallbackGroupRow) {
		// Microfinance hierarchy typically: Center (GroupID/GroupName) -> Group/SubGroup (SubGroupID/SubGroupName).
		// dbo.p_GetClient commonly returns membership under Details10 with these fields.
		if (!$('centerId').value.trim()) {
			const centerId = coerceString(pickValue(fallbackGroupRow, ['GroupID', 'GroupId', 'CenterID', 'CenterId']));
			if (centerId) {
				$('centerId').value = centerId;
				didBindAny = true;
			}
		}
		if (!$('centerName').value.trim()) {
			const centerName = coerceString(pickValue(fallbackGroupRow, ['GroupName', 'GroupDescription', 'CenterName', 'CenterDescription']));
			if (centerName) {
				$('centerName').value = centerName;
				didBindAny = true;
			}
		}
		if (!$('groupId').value.trim()) {
			const groupId = coerceString(pickValue(fallbackGroupRow, ['SubGroupID', 'SubGroupId']));
			if (groupId) {
				$('groupId').value = groupId;
				didBindAny = true;
			}
		}
		if (!$('groupName').value.trim()) {
			const groupName = coerceString(pickValue(fallbackGroupRow, ['SubGroupName', 'SubGroupDescription']));
			if (groupName) {
				$('groupName').value = groupName;
				didBindAny = true;
			}
		}
	}

	// Best-effort: find datasets that look like accounts/forfeits.
	{
		const arrays = datasets;

		const looksLikeAccountsRow = (r) => {
			if (!r || typeof r !== 'object') return false;
			const m = normalizeRowKeyMap(r);
			return m.accountid !== undefined || m.accountname !== undefined || m.trxdescription !== undefined;
		};
		const looksLikeForfeitRow = (r) => {
			if (!r || typeof r !== 'object') return false;
			const m = normalizeRowKeyMap(r);
			return m.accounttype !== undefined || m.transactiontype !== undefined || m.amount !== undefined;
		};

		const accountsRows = arrays.find((arr) => arr.some(looksLikeAccountsRow));
		if (accountsRows) {
			didBindAny = true;
			const mapped = accountsRows.map((r) => {
				const m = normalizeRowKeyMap(r);
				return {
					accountId: m.accountid ?? m.acid ?? '',
					accountName: m.accountname ?? m.description ?? '',
					amount: m.amount ?? '',
					trxDescription: m.trxdescription ?? m.trxdesc ?? m.trxtype ?? '',
				};
			});
			renderAccounts(mapped);
		}

		const forfeitRows = arrays.find((arr) => arr.some(looksLikeForfeitRow));
		if (forfeitRows) {
			didBindAny = true;
			const mapped = forfeitRows.map((r) => {
				const m = normalizeRowKeyMap(r);
				return {
					accountType: m.accounttype ?? '',
					accountId: m.accountid ?? '',
					description: m.description ?? m.accountname ?? '',
					transactionType: m.transactiontype ?? '',
					amount: m.amount ?? '',
				};
			});
			renderForfeits(mapped);
		}
	}

	return didBindAny;
}

function hideStatus() {
	const el = $('statusMsg');
	if (!el) return;
	el.classList.add('hidden');
}

function setEditMode(enabled) {
	editMode = Boolean(enabled);

	const editableIds = [
		'exitReason',
		'exitDate',
		'totalRecoverable',
		'totalPayable',
		'forfeitSavings',
		'forfeitCollateral',
		'chargeOffLoss',
		'chargeOffInsurance',
		'netPayable',
		'netReceivable',
		'primaryCollateral',
		'creditInterest',
		'tax',
		'secondaryCollateral',
		'additionalCollateral',
		'loanBalance',
		'debitInterest',
		'others',
		'netBalance',
	];

	editableIds.forEach((id) => {
		const el = $(id);
		if (el) el.disabled = !editMode;
	});

	const btnSave = $('btnSave');
	if (btnSave) btnSave.disabled = !editMode;
}

function clearForm({ keepClientId = false } = {}) {
	const keepId = keepClientId ? $('clientId')?.value ?? '' : '';

	[
		'centerId',
		'centerName',
		'groupId',
		'groupName',
		'clientId',
		'clientName',
		'exitReason',
		'exitDate',
		'totalRecoverable',
		'totalPayable',
		'forfeitSavings',
		'forfeitCollateral',
		'chargeOffLoss',
		'chargeOffInsurance',
		'netPayable',
		'netReceivable',
		'totalForfeitAmount',
		'primaryCollateral',
		'creditInterest',
		'tax',
		'secondaryCollateral',
		'additionalCollateral',
		'loanBalance',
		'debitInterest',
		'others',
		'netBalance',
	].forEach((id) => {
		const el = $(id);
		if (el) el.value = '';
	});

	if (keepClientId && $('clientId')) $('clientId').value = keepId;

	renderAccounts([]);
	renderForfeits([]);
}

function loadForm(data) {
	$('centerId').value = data.centerId ?? '';
	$('centerName').value = data.centerName ?? '';
	$('groupId').value = data.groupId ?? '';
	$('groupName').value = data.groupName ?? '';
	$('clientId').value = data.clientId ?? '';
	$('clientName').value = data.clientName ?? '';
	$('exitReason').value = data.exitReason ?? '';
	$('exitDate').value = data.exitDate ?? '';
	$('totalRecoverable').value = data.totalRecoverable ?? '';
	$('totalPayable').value = data.totalPayable ?? '';
	$('forfeitSavings').value = data.forfeitSavings ?? '';
	$('forfeitCollateral').value = data.forfeitCollateral ?? '';
	$('chargeOffLoss').value = data.chargeOffLoss ?? '';
	$('chargeOffInsurance').value = data.chargeOffInsurance ?? '';
	$('netPayable').value = data.netPayable ?? '';
	$('netReceivable').value = data.netReceivable ?? '';
	$('totalForfeitAmount').value = data.totalForfeitAmount ?? '';

	const p = data.portfolio ?? {};
	$('primaryCollateral').value = p.primaryCollateral ?? '';
	$('creditInterest').value = p.creditInterest ?? '';
	$('tax').value = p.tax ?? '';
	$('secondaryCollateral').value = p.secondaryCollateral ?? '';
	$('additionalCollateral').value = p.additionalCollateral ?? '';
	$('loanBalance').value = p.loanBalance ?? '';
	$('debitInterest').value = p.debitInterest ?? '';
	$('others').value = p.others ?? '';
	$('netBalance').value = p.netBalance ?? '';

	renderAccounts(data.accounts ?? []);
	renderForfeits(data.forfeits ?? []);
}

function getFormData() {
	return {
		centerId: $('centerId').value.trim(),
		centerName: $('centerName').value.trim(),
		groupId: $('groupId').value.trim(),
		groupName: $('groupName').value.trim(),
		clientId: $('clientId').value.trim(),
		clientName: $('clientName').value.trim(),
		exitReason: $('exitReason').value,
		exitDate: $('exitDate').value,
		totalRecoverable: safeNumber($('totalRecoverable').value),
		totalPayable: safeNumber($('totalPayable').value),
		forfeitSavings: safeNumber($('forfeitSavings').value),
		forfeitCollateral: safeNumber($('forfeitCollateral').value),
		chargeOffLoss: safeNumber($('chargeOffLoss').value),
		chargeOffInsurance: safeNumber($('chargeOffInsurance').value),
		netPayable: safeNumber($('netPayable').value),
		netReceivable: safeNumber($('netReceivable').value),
		accounts: currentData?.accounts ?? [],
		forfeits: currentData?.forfeits ?? [],
		totalForfeitAmount: safeNumber($('totalForfeitAmount')?.value),
		portfolio: {
			primaryCollateral: safeNumber($('primaryCollateral').value),
			creditInterest: safeNumber($('creditInterest').value),
			tax: safeNumber($('tax').value),
			secondaryCollateral: safeNumber($('secondaryCollateral').value),
			additionalCollateral: safeNumber($('additionalCollateral').value),
			loanBalance: safeNumber($('loanBalance').value),
			debitInterest: safeNumber($('debitInterest').value),
			others: safeNumber($('others').value),
			netBalance: safeNumber($('netBalance').value),
		},
	};
}

function renderAccounts(rows) {
	const body = $('accountsBody');
	if (!body) return;

	const items = Array.isArray(rows) ? rows : [];
	body.innerHTML = '';

	if (items.length === 0) {
		const tr = document.createElement('tr');
		const td = document.createElement('td');
		td.colSpan = 4;
		td.className = 'empty-row';
		td.textContent = 'No records to display.';
		tr.appendChild(td);
		body.appendChild(tr);
		return;
	}

	items.forEach((r) => {
		const tr = document.createElement('tr');
		['accountId', 'accountName', 'amount', 'trxDescription'].forEach((k) => {
			const td = document.createElement('td');
			if (k === 'amount') td.className = 'text-end';
			td.textContent = r?.[k] ?? '';
			tr.appendChild(td);
		});
		body.appendChild(tr);
	});
}

function renderForfeits(rows) {
	const body = $('forfeitBody');
	if (!body) return;

	const items = Array.isArray(rows) ? rows : [];
	body.innerHTML = '';

	if (items.length === 0) {
		const tr = document.createElement('tr');
		const td = document.createElement('td');
		td.colSpan = 5;
		td.className = 'empty-row';
		td.textContent = 'No records to display.';
		tr.appendChild(td);
		body.appendChild(tr);
		$('totalForfeitAmount').value = '';
		return;
	}

	let total = 0;
	items.forEach((r) => {
		const tr = document.createElement('tr');
		['accountType', 'accountId', 'description', 'transactionType', 'amount'].forEach((k) => {
			const td = document.createElement('td');
			if (k === 'amount') td.className = 'text-end';
			td.textContent = r?.[k] ?? '';
			tr.appendChild(td);
		});
		body.appendChild(tr);
		total += safeNumber(r?.amount);
	});

	$('totalForfeitAmount').value = String(total);
}

// ---------------------------------------------------------------------------
// Center lookup (SearchService TableID = GroupID)
// ---------------------------------------------------------------------------

let _centerLookupModalInstance = null;

function getCenterLookupModalInstance() {
	const modalEl = document.getElementById('centerLookupModal');
	if (!modalEl) return null;
	if (!_centerLookupModalInstance) {
		_centerLookupModalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
	}
	return _centerLookupModalInstance;
}

function sanitizeLookupInput(value, maxLen = 80) {
	return String(value ?? '')
		.trim()
		.replace(/\s+/g, ' ')
		.replace(/[;\r\n]/g, '')
		.slice(0, maxLen);
}

function escapeSqlLiteral(value) {
	return String(value ?? '').replace(/'/g, "''");
}

function buildCenterLookupWhereStmt({ centerId, centerName }) {
	const buildClause = (col, mode, rawValue) => {
		const value = sanitizeLookupInput(rawValue, col === 'GroupName' ? 120 : 80);
		if (!value) return '';
		const escaped = escapeSqlLiteral(value);
		if (String(mode || 'Like') === 'Exact') return `${col} = '${escaped}'`;
		return `${col} LIKE '%${escaped}%'`;
	};

	const clauses = [];
	const idClause = buildClause('GroupID', centerId?.mode, centerId?.value);
	const nameClause = buildClause('GroupName', centerName?.mode, centerName?.value);
	[idClause, nameClause].forEach((c) => c && clauses.push(c));

	return clauses.join(' AND ');
}

function extractCenterLookupRows(searchResult) {
	const root = searchResult?.data ?? searchResult;
	const rows = root?.Details;
	return Array.isArray(rows) ? rows : [];
}

function normalizeCenterLookupRow(row) {
	const centerId = coerceString(pickValue(row, ['GroupID', 'GroupId', 'CenterID', 'CenterId', 'ID']));
	const centerName = coerceString(
		pickValue(row, ['GroupName', 'GroupDescription', 'CenterName', 'CenterDescription', 'Name'])
	);
	return { centerId, centerName };
}

function closeCenterLookupModal() {
	getCenterLookupModalInstance()?.hide();
}

function resetCenterLookupPanel() {
	const idEl = document.getElementById('centerSearchId');
	const nameEl = document.getElementById('centerSearchName');
	const modeIdEl = document.getElementById('centerSearchModeId');
	const modeNameEl = document.getElementById('centerSearchModeName');
	const resultsEl = document.getElementById('centerSearchResults');
	const emptyEl = document.getElementById('centerSearchEmpty');
	const loadingEl = document.getElementById('centerSearchLoading');

	if (idEl) idEl.value = '';
	if (nameEl) nameEl.value = '';
	if (modeIdEl) modeIdEl.value = 'Like';
	if (modeNameEl) modeNameEl.value = 'Like';
	if (resultsEl) resultsEl.innerHTML = '';
	if (emptyEl) {
		emptyEl.textContent = 'Enter a filter and click Search to query centers.';
		emptyEl.classList.remove('d-none');
	}
	if (loadingEl) loadingEl.classList.add('d-none');
}

function renderCenterLookupResults(rows) {
	const resultsEl = document.getElementById('centerSearchResults');
	const emptyEl = document.getElementById('centerSearchEmpty');
	if (!resultsEl || !emptyEl) return;

	resultsEl.innerHTML = '';

	if (!rows.length) {
		emptyEl.textContent = 'No records to display.';
		emptyEl.classList.remove('d-none');
		return;
	}

	emptyEl.classList.add('d-none');

	rows.forEach((r) => {
		const tr = document.createElement('tr');
		tr.tabIndex = 0;

		const tdId = document.createElement('td');
		tdId.textContent = r.centerId;
		const tdName = document.createElement('td');
		tdName.textContent = r.centerName;
		const tdAction = document.createElement('td');
		tdAction.className = 'text-end';

		const btn = document.createElement('button');
		btn.type = 'button';
		btn.className = 'btn btn-sm';
		btn.setAttribute(
			'style',
			'background: var(--primary); border: 1px solid var(--primary); color: white; font-size: 11px; height: 22px; padding: 0 8px;'
		);
		btn.textContent = 'Select';
		tdAction.appendChild(btn);

		tr.appendChild(tdId);
		tr.appendChild(tdName);
		tr.appendChild(tdAction);

		const select = () => {
			if (r.centerId) $('centerId').value = r.centerId;
			$('centerName').value = r.centerName || '';
			closeCenterLookupModal();
		};

		btn.addEventListener('click', (e) => {
			e.preventDefault();
			select();
		});
		tr.addEventListener('dblclick', select);
		tr.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') select();
		});
		resultsEl.appendChild(tr);
	});
}

async function performCenterLookupSearch(event, forceLoadAll = false) {
	if (event) event.preventDefault();

	const idValue = (document.getElementById('centerSearchId')?.value || '').trim();
	const nameValue = (document.getElementById('centerSearchName')?.value || '').trim();
	const idMode = document.getElementById('centerSearchModeId')?.value || 'Like';
	const nameMode = document.getElementById('centerSearchModeName')?.value || 'Like';
	const resultsEl = document.getElementById('centerSearchResults');
	const emptyEl = document.getElementById('centerSearchEmpty');
	const loadingEl = document.getElementById('centerSearchLoading');

	if (!resultsEl || !emptyEl || !loadingEl) {
		showStatus('Center lookup UI is missing in HTML', 'error');
		return;
	}

	resultsEl.innerHTML = '';
	emptyEl.classList.add('d-none');
	loadingEl.classList.remove('d-none');

	const whereStmt = buildCenterLookupWhereStmt({
		centerId: { mode: idMode, value: idValue },
		centerName: { mode: nameMode, value: nameValue },
	});

	if (!whereStmt && !forceLoadAll) {
		loadingEl.classList.add('d-none');
		emptyEl.textContent = 'Enter a filter and click Search to query centers.';
		emptyEl.classList.remove('d-none');
		return;
	}

	const finalWhereStmt = forceLoadAll && !whereStmt ? '1=1' : whereStmt;

	try {
		const searchService = await ensureSearchServiceLoaded();
		const basePayload = {
			TableID: 'GroupID',
			WhereStmt: finalWhereStmt,
			AdvFilterString: '',
			PrevOrNext: '1',
			RefID: '',
			OperatorID: getOperatorId(),
			ModuleID: 1000,
		};

		const branchesToTry = [getOurBranchId(), EXIT_PROCESS_BRANCH_ID, '0101']
			.map((b) => String(b || '').trim())
			.filter(Boolean);

		let res = null;
		let lastErrorMsg = '';
		let normalized = [];
		for (const b of branchesToTry) {
			res = await searchService.searchClients({ ...basePayload, OurBranchID: b });
			if (!res?.success) {
				lastErrorMsg = res?.message || 'Search failed';
				continue;
			}
			normalized = extractCenterLookupRows(res)
				.map(normalizeCenterLookupRow)
				.filter((r) => r.centerId || r.centerName);
			if (normalized.length) break;
		}

		loadingEl.classList.add('d-none');

		if (!res?.success) {
			const msg = lastErrorMsg || res?.message || 'Search failed';
			showStatus(msg, 'warning');
			emptyEl.textContent = msg;
			emptyEl.classList.remove('d-none');
			return;
		}

		renderCenterLookupResults(normalized);
	} catch (e) {
		loadingEl.classList.add('d-none');
		const msg = e?.message || 'Center lookup failed';
		showStatus(msg, 'error');
		emptyEl.textContent = msg;
		emptyEl.classList.remove('d-none');
	}
}

function openCenterLookupModal() {
	const modal = getCenterLookupModalInstance();
	if (!modal) {
		showStatus('Center lookup modal not found', 'error');
		return;
	}

	const idEl = document.getElementById('centerSearchId');
	const nameEl = document.getElementById('centerSearchName');
	if (idEl) idEl.value = ($('centerId')?.value ?? '').trim();
	if (nameEl) nameEl.value = ($('centerName')?.value ?? '').trim();
	resetCenterLookupPanel();
	// Restore prefill after reset
	if (idEl) idEl.value = ($('centerId')?.value ?? '').trim();
	if (nameEl) nameEl.value = ($('centerName')?.value ?? '').trim();
	modal.show();

	// Display data on open (same behavior as clicking Refresh).
	// Uses first page from p_GetSearchResult; avoids forcing users to click Search.
	window.setTimeout(() => {
		performCenterLookupSearch(null, true);
	}, 50);

	window.setTimeout(() => {
		idEl?.focus();
		idEl?.select();
	}, 200);
}

function handleCenterSearch() {
	openCenterLookupModal();
}

function handleGroupSearch() {
	showStatus('Lookup (Group) is a UI stub', 'info');
}

async function handleClientSearch() {
	const clientId = $('clientId').value.trim();
	if (!clientId) {
		$('clientId')?.focus?.();
		return;
	}

	// Force Exit Process to use branch 0603 regardless of Environment/session branch.
	const branchId = EXIT_PROCESS_BRANCH_ID;
	showStatus(`Loading exit details (Branch ${branchId})...`, 'info');

	try {
		const service = await ensureExitProcessServiceLoaded();
		const getValue = (id) => ($(`${id}`)?.value ?? '').toString().trim();
		const getAmount = (id) => {
			const raw = getValue(id);
			if (raw === '') return 0;
			const n = Number(raw);
			return Number.isFinite(n) ? n : 0;
		};

		// If Group/Center/Client names are missing, fetch client master info to enrich request.
		// This helps because dbo.p_GetExitTrx commonly returns empty Details when GroupID is blank.
		let resolvedCenterId = getValue('centerId');
		let resolvedSubGroupId = getValue('groupId');
		try {
			const clientService = await ensureClientServiceLoaded();
			const clientResult = await clientService.getClient({
				OurBranchID: branchId,
				ClientID: clientId,
				OperatorID: getOperatorId(),
				Direction: 0,
			});
			if (clientResult?.success) {
				const root = clientResult.data ?? clientResult;
				const groupRow = findFirstRowWithKeys(root, ['GroupID']);
				const nameRow = findFirstRowWithKeys(root, ['ClientName', 'CustomerName', 'Name']);
				const personRow = findFirstRowWithKeys(root, ['FirstName', 'MiddleName', 'LastName', 'TitleID']);

				const centerIdFromApi = coerceString(pickValue(groupRow, ['GroupID', 'GroupId', 'CenterID', 'CenterId']));
				const centerNameFromApi = coerceString(pickValue(groupRow, ['GroupName', 'GroupDescription', 'CenterName', 'CenterDescription']));
				const subGroupIdFromApi = coerceString(pickValue(groupRow, ['SubGroupID', 'SubGroupId']));
				const subGroupNameFromApi = coerceString(pickValue(groupRow, ['SubGroupName', 'SubGroupDescription']));
				const clientNameFromApi = composeClientNameFromRows({ nameRow, personRow });

				if (!resolvedCenterId && centerIdFromApi) {
					$('centerId').value = centerIdFromApi;
					resolvedCenterId = centerIdFromApi;
				}
				if (!$('centerName').value.trim() && centerNameFromApi) $('centerName').value = centerNameFromApi;
				if (!resolvedSubGroupId && subGroupIdFromApi) {
					$('groupId').value = subGroupIdFromApi;
					resolvedSubGroupId = subGroupIdFromApi;
				}
				if (!$('groupName').value.trim() && subGroupNameFromApi) $('groupName').value = subGroupNameFromApi;
				if (!$('clientName').value.trim() && clientNameFromApi) $('clientName').value = clientNameFromApi;
			}
		} catch (e) {
			if (DEBUG_EXIT_PROCESS) console.warn('[Exit Process] ClientService enrichment failed:', e);
		}

		const requestData = {
			OurBranchID: branchId,
			GroupID: resolvedCenterId,
			SubGroupID: resolvedSubGroupId,
			ClientID: clientId,
			RefID: 0,
			ExitTypeID: getValue('exitReason'),
			ForfeitSavingsAmount: getAmount('forfeitSavings'),
			ForfeitCollateralsAmount: getAmount('forfeitCollateral'),
			SecondaryCollateral: getAmount('secondaryCollateral'),
			AdditionalCollateral: getAmount('additionalCollateral'),
			CreditInterest: getAmount('creditInterest'),
			TaxOnCreditInterest: getAmount('tax'),
			DebitInterest: getAmount('debitInterest'),
			NetPayable: getAmount('netPayable'),
			ChargeOffLossAmount: getAmount('chargeOffLoss'),
			ChargeOffInsuranceAmount: getAmount('chargeOffInsurance')
		};

		let result = await callExitTrx(service, requestData);
		// If the API returns success but no rows, retry without ExitTypeID (it often acts as a filter).
		if (result?.success && getResultDetailsLength(result) === 0 && requestData.ExitTypeID) {
			const retryData = { ...requestData, ExitTypeID: '' };
			const retry = await callExitTrx(service, retryData);
			if (retry?.success && getResultDetailsLength(retry) > 0) {
				result = retry;
			}
		}
		if (!result?.success) {
			const msg = result?.message || 'Request failed';
			const code = String(result?.code ?? '').trim();
			showStatus(code ? `${msg} (Code ${code})` : msg, 'warning');
			const btnPrint = $('btnPrint');
			if (btnPrint) btnPrint.disabled = true;
			return;
		}

		// Best-effort bind; still allow the page to function even if the response shape changes.
		const didBind = tryApplyApiToFormPayload(result);
		currentData = { clientId, api: result };
		setEditMode(false);

		const btnPrint = $('btnPrint');
		if (btnPrint) btnPrint.disabled = false;

		if (didBind) {
			showStatus(`Loaded exit process for client '${clientId}'`, 'success');
		} else {
			const sentExitType = String(requestData.ExitTypeID || '').trim();
			showStatus(
				`No exit trx rows for Client '${clientId}' (Branch ${branchId}). Sent Center(GroupID)='${requestData.GroupID || ''}' SubGroupID='${requestData.SubGroupID || ''}' ExitTypeID='${sentExitType}'. Response Details=[] means the backend returned no records for these parameters.`,
				'warning'
			);
		}
	} catch (e) {
		console.error('[Exit Process] View failed:', e);
		showStatus(`Failed to load: ${e?.message || e}`, 'error');
	}
}

async function handleView() {
	const validation = epValidateRequiredForView();
	if (!validation.ok) {
		epToast(validation.message, 'warning');
		if (validation.focusId) epFocus(validation.focusId);
		return;
	}

	const branchId = String($('branchId')?.value || '').trim();
	const centerId = String($('centerId')?.value || '').trim();
	const groupId = String($('groupId')?.value || '').trim();
	const clientId = String($('clientId')?.value || '').trim();
	const exitTypeId = String($('exitReason')?.value || '').trim();
	const operatorId = getOperatorId();

	try {
		const svc = await ensureMicrofinanceServiceLoaded();
		if (typeof svc.getClientExitDetails !== 'function') {
			epToast('MicrofinanceService.getClientExitDetails is not available', 'danger');
			return;
		}

		const requestData = {
			OurBranchID: branchId,
			GroupID: centerId,
			SubGroupID: groupId,
			ClientID: clientId,
			ExitTypeID: exitTypeId,
			OperatorID: operatorId,
		};

		epToast('Loading exit details...', 'info');
		const resp = await svc.getClientExitDetails(requestData);

		// Invalid response example: { Status: '091', Message: '...' }
		const status = String(resp?.Status ?? resp?.status ?? '').trim();
		const message = String(resp?.Message ?? resp?.message ?? '').trim();
		if (status === '091') {
			epToast(message || 'Primary Loan Scheme is not defined', 'warning');
			return;
		}
		if (status && status !== '0' && status !== '200' && (message || resp?.success === false)) {
			epToast(message || `Request failed (Status ${status})`, 'warning');
			return;
		}

		const didBind = tryApplyApiToFormPayload(resp);
		if (!didBind) {
			epToast('No records returned for the given parameters.', 'warning');
			return;
		}

		currentData = { clientId, api: resp };
		setEditMode(false);
		epSetIdentityDisabled(true);

		const updateCount = epExtractUpdateCount(resp);
		epApplyButtonStateAfterView(updateCount);
		epToast('Exit details loaded.', 'success');
	} catch (e) {
		console.error('[Exit Process] View failed:', e);
		epToast(e?.message || 'Failed to load exit details', 'danger');
	}
}

async function handleAdd() {
	const validation = epValidateRequiredForView();
	if (!validation.ok) {
		epToast(validation.message, 'warning');
		if (validation.focusId) epFocus(validation.focusId);
		return;
	}

	const branchId = String($('branchId')?.value || '').trim();
	const centerId = String($('centerId')?.value || '').trim();
	const groupId = String($('groupId')?.value || '').trim();
	const clientId = String($('clientId')?.value || '').trim();
	const exitTypeId = String($('exitReason')?.value || '').trim();

	const getValue = (id) => (document.getElementById(id)?.value ?? '').toString().trim();
	const getAmount = (id) => {
		const raw = getValue(id);
		if (raw === '') return 0;
		const n = Number(raw);
		return Number.isFinite(n) ? n : 0;
	};

	try {
		const svc = await ensureMicrofinanceServiceLoaded();
		if (typeof svc.getExitTrx !== 'function') {
			epToast('MicrofinanceService.getExitTrx is not available', 'danger');
			return;
		}

		const forfeitSavingsAmount = getAmount('forfeitSavings');
		const requestData = {
			OurBranchID: branchId,
			GroupID: centerId,
			SubGroupID: groupId,
			ClientID: clientId,
			RefID: '1',
			ExitTypeID: exitTypeId,
			ForfeitSavingsAmount: forfeitSavingsAmount,
			ForfeitCollateralsAmount: getAmount('forfeitCollateral'),
			SecondaryCollateral: getAmount('secondaryCollateral'),
			AdditionalCollateral: getAmount('additionalCollateral'),
			CreditInterest: getAmount('creditInterest'),
			TaxOnCreditInterest: getAmount('tax'),
			DebitInterest: getAmount('debitInterest'),
			NetPayable: getAmount('netPayable'),
			ChargeOffLossAmount: getAmount('chargeOffLoss'),
			ChargeOffInsuranceAmount: getAmount('chargeOffInsurance'),
		};

		epToast('Loading exit transactions...', 'info');
		const resp = await svc.getExitTrx(requestData);

		const apiErr = epExtractOldApiError(resp);
		if (apiErr) {
			epToast(apiErr.message, apiErr.status === '091' ? 'warning' : 'danger');
			return;
		}

		const details = epExtractOldApiDetails(resp);
		const { trxRows, forfeitRows } = epMapExitTrxRowsToGrids(details, { forfeitSavingsAmount });

		renderAccounts(trxRows);
		renderForfeits(forfeitRows);

		currentData = {
			clientId,
			accounts: trxRows,
			forfeits: forfeitRows,
			api: resp,
		};

		// User flow after successful Add: allow Save/Cancel, lock other actions.
		setEditMode(true);
		epSetIdentityDisabled(true);
		epApplyButtonStateAfterExitTrxLoad();

		const btnPrint = $('btnPrint');
		if (btnPrint) btnPrint.disabled = false;
	} catch (e) {
		console.error('[Exit Process] Add/getExitTrx failed:', e);
		epToast(e?.message || 'Failed to load exit transactions', 'danger');
	}
}

function handleSave() {
	const formData = getFormData();
	if (!formData.clientId) {
		showStatus('Client ID required', 'error');
		return;
	}

	const idx = exitProcessData.findIndex((e) => e.clientId === formData.clientId);
	if (idx >= 0) {
		exitProcessData[idx] = { ...exitProcessData[idx], ...formData };
	} else {
		exitProcessData.push(formData);
	}

	currentData = JSON.parse(JSON.stringify(formData));
	setEditMode(false);

	const btnPrint = $('btnPrint');
	if (btnPrint) btnPrint.disabled = false;

	showStatus('Exit process saved (stub)', 'success');
}

function handlePrint() {
	if (!currentData) {
		showStatus('Load a record first', 'error');
		return;
	}

	// Gather all data from the form
	const branchId = $('branchId')?.value || '';
	const branchName = $('branchName')?.value || '';
	const centerId = $('centerId')?.value || '';
	const centerName = $('centerName')?.value || '';
	const groupId = $('groupId')?.value || '';
	const groupName = $('groupName')?.value || '';
	const clientId = $('clientId')?.value || '';
	const clientName = $('clientName')?.value || '';
	const exitReason = $('exitReason')?.options[$('exitReason')?.selectedIndex]?.text || '';
	const exitDate = $('exitDate')?.value || '';

	// Exit Details
	const totalRecoverable = $('totalRecoverable')?.value || '0';
	const totalPayable = $('totalPayable')?.value || '0';
	const forfeitSavings = $('forfeitSavings')?.value || '0';
	const forfeitCollateral = $('forfeitCollateral')?.value || '0';
	const chargeOffLoss = $('chargeOffLoss')?.value || '0';
	const chargeOffInsurance = $('chargeOffInsurance')?.value || '0';
	const netPayable = $('netPayable')?.value || '0';
	const netReceivable = $('netReceivable')?.value || '0';

	// Portfolio Details
	const primaryCollateral = $('primaryCollateral')?.value || '0';
	const loanBalance = $('loanBalance')?.value || '0';
	const creditInterest = $('creditInterest')?.value || '0';
	const debitInterest = $('debitInterest')?.value || '0';
	const tax = $('tax')?.value || '0';
	const others = $('others')?.value || '0';
	const secondaryCollateral = $('secondaryCollateral')?.value || '0';
	const netBalance = $('netBalance')?.value || '0';
	const additionalCollateral = $('additionalCollateral')?.value || '0';

	// Get Transactions (Accounts)
	const accountsBody = $('accountsBody');
	const accountRows = accountsBody ? Array.from(accountsBody.querySelectorAll('tr')) : [];
	let accountsHtml = '';
	if (accountRows.length > 0 && !accountRows[0].querySelector('.empty-row')) {
		accountRows.forEach(row => {
			const cells = Array.from(row.querySelectorAll('td'));
			if (cells.length >= 4) {
				accountsHtml += `
					<tr>
						<td>${cells[0].textContent}</td>
						<td>${cells[1].textContent}</td>
						<td class="text-end">${cells[2].textContent}</td>
						<td>${cells[3].textContent}</td>
					</tr>
				`;
			}
		});
	} else {
		accountsHtml = '<tr><td colspan="4" class="text-center">No records to display.</td></tr>';
	}

	// Get Forfeits
	const forfeitBody = $('forfeitBody');
	const forfeitRows = forfeitBody ? Array.from(forfeitBody.querySelectorAll('tr')) : [];
	let forfeitsHtml = '';
	if (forfeitRows.length > 0 && !forfeitRows[0].querySelector('.empty-row')) {
		forfeitRows.forEach(row => {
			const cells = Array.from(row.querySelectorAll('td'));
			if (cells.length >= 5) {
				forfeitsHtml += `
					<tr>
						<td>${cells[0].textContent}</td>
						<td>${cells[1].textContent}</td>
						<td>${cells[2].textContent}</td>
						<td>${cells[3].textContent}</td>
						<td class="text-end">${cells[4].textContent}</td>
					</tr>
				`;
			}
		});
	} else {
		forfeitsHtml = '<tr><td colspan="5" class="text-center">No records to display.</td></tr>';
	}

	const totalForfeitAmount = $('totalForfeitAmount')?.value || '0';

	// Create print content
	const printContent = `
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="UTF-8">
			<title>Exit Process Report</title>
			<style>
				* { margin: 0; padding: 0; box-sizing: border-box; }
				body { 
					font-family: Arial, sans-serif; 
					padding: 20px; 
					font-size: 12px;
					line-height: 1.4;
				}
				.report-header { 
					text-align: center; 
					margin-bottom: 20px; 
					border-bottom: 2px solid #333;
					padding-bottom: 10px;
				}
				.report-header h1 { 
					font-size: 20px; 
					margin-bottom: 5px;
				}
				.client-info {
					margin-bottom: 15px;
					display: grid;
					grid-template-columns: repeat(2, 1fr);
					gap: 8px;
					background: #f5f5f5;
					padding: 10px;
					border: 1px solid #ddd;
				}
				.info-row {
					display: flex;
					gap: 5px;
				}
				.info-label {
					font-weight: bold;
					min-width: 120px;
				}
				.section {
					margin-bottom: 20px;
					page-break-inside: avoid;
				}
				.section-title {
					background: #4a5568;
					color: white;
					padding: 8px;
					font-weight: bold;
					font-size: 14px;
					margin-bottom: 10px;
				}
				table {
					width: 100%;
					border-collapse: collapse;
					margin-bottom: 10px;
				}
				th, td {
					border: 1px solid #ddd;
					padding: 6px;
					text-align: left;
				}
				th {
					background: #e2e8f0;
					font-weight: bold;
				}
				.text-end {
					text-align: right;
				}
				.text-center {
					text-align: center;
				}
				.portfolio-grid {
					display: grid;
					grid-template-columns: repeat(4, 1fr);
					gap: 10px;
				}
				.portfolio-item {
					display: flex;
					flex-direction: column;
					border: 1px solid #ddd;
					padding: 6px;
					background: #f9f9f9;
				}
				.portfolio-label {
					font-size: 10px;
					color: #666;
					margin-bottom: 2px;
				}
				.portfolio-value {
					font-weight: bold;
					text-align: right;
				}
				.exit-details-grid {
					display: grid;
					grid-template-columns: repeat(4, 1fr);
					gap: 10px;
					margin-bottom: 10px;
				}
				.exit-item {
					display: flex;
					flex-direction: column;
					border: 1px solid #ddd;
					padding: 6px;
					background: #f9f9f9;
				}
				.exit-label {
					font-size: 10px;
					color: #666;
					margin-bottom: 2px;
				}
				.exit-value {
					font-weight: bold;
					text-align: right;
				}
				.total-row {
					background: #e2e8f0;
					font-weight: bold;
				}
				@media print {
					body { padding: 10px; }
					.section { page-break-inside: avoid; }
				}
			</style>
		</head>
		<body>
			<div class="report-header">
				<h1>Exit Process Report</h1>
				<p>Generated on ${new Date().toLocaleString()}</p>
			</div>

			<div class="client-info">
				<div class="info-row">
					<span class="info-label">Branch ID:</span>
					<span>${branchId}</span>
				</div>
				<div class="info-row">
					<span class="info-label">Branch Name:</span>
					<span>${branchName}</span>
				</div>
				<div class="info-row">
					<span class="info-label">Center ID:</span>
					<span>${centerId}</span>
				</div>
				<div class="info-row">
					<span class="info-label">Center Name:</span>
					<span>${centerName}</span>
				</div>
				<div class="info-row">
					<span class="info-label">Group ID:</span>
					<span>${groupId}</span>
				</div>
				<div class="info-row">
					<span class="info-label">Group Name:</span>
					<span>${groupName}</span>
				</div>
				<div class="info-row">
					<span class="info-label">Client ID:</span>
					<span>${clientId}</span>
				</div>
				<div class="info-row">
					<span class="info-label">Client Name:</span>
					<span>${clientName}</span>
				</div>
				<div class="info-row">
					<span class="info-label">Exit Reason:</span>
					<span>${exitReason}</span>
				</div>
				<div class="info-row">
					<span class="info-label">Exit Date:</span>
					<span>${exitDate}</span>
				</div>
			</div>

			<div class="section">
				<div class="section-title">Client Portfolio Details</div>
				<div class="portfolio-grid">
					<div class="portfolio-item">
						<span class="portfolio-label">Primary Collateral</span>
						<span class="portfolio-value">${primaryCollateral}</span>
					</div>
					<div class="portfolio-item">
						<span class="portfolio-label">Loan Balance</span>
						<span class="portfolio-value">${loanBalance}</span>
					</div>
					<div class="portfolio-item">
						<span class="portfolio-label">Credit Interest</span>
						<span class="portfolio-value">${creditInterest}</span>
					</div>
					<div class="portfolio-item">
						<span class="portfolio-label">Debit Interest</span>
						<span class="portfolio-value">${debitInterest}</span>
					</div>
					<div class="portfolio-item">
						<span class="portfolio-label">Tax</span>
						<span class="portfolio-value">${tax}</span>
					</div>
					<div class="portfolio-item">
						<span class="portfolio-label">Others</span>
						<span class="portfolio-value">${others}</span>
					</div>
					<div class="portfolio-item">
						<span class="portfolio-label">Secondary Collateral</span>
						<span class="portfolio-value">${secondaryCollateral}</span>
					</div>
					<div class="portfolio-item">
						<span class="portfolio-label">Net Balance</span>
						<span class="portfolio-value">${netBalance}</span>
					</div>
					<div class="portfolio-item">
						<span class="portfolio-label">Additional Collateral</span>
						<span class="portfolio-value">${additionalCollateral}</span>
					</div>
				</div>
			</div>

			<div class="section">
				<div class="section-title">Exit Details</div>
				<div class="exit-details-grid">
					<div class="exit-item">
						<span class="exit-label">Total Recoverable</span>
						<span class="exit-value">${totalRecoverable}</span>
					</div>
					<div class="exit-item">
						<span class="exit-label">Total Payable</span>
						<span class="exit-value">${totalPayable}</span>
					</div>
					<div class="exit-item">
						<span class="exit-label">Forfeit Savings</span>
						<span class="exit-value">${forfeitSavings}</span>
					</div>
					<div class="exit-item">
						<span class="exit-label">Forfeit Collateral</span>
						<span class="exit-value">${forfeitCollateral}</span>
					</div>
					<div class="exit-item">
						<span class="exit-label">Charge-Off Loss</span>
						<span class="exit-value">${chargeOffLoss}</span>
					</div>
					<div class="exit-item">
						<span class="exit-label">Charge-Off Insurance</span>
						<span class="exit-value">${chargeOffInsurance}</span>
					</div>
					<div class="exit-item">
						<span class="exit-label">Net Payable</span>
						<span class="exit-value">${netPayable}</span>
					</div>
					<div class="exit-item">
						<span class="exit-label">Net Receivable</span>
						<span class="exit-value">${netReceivable}</span>
					</div>
				</div>
			</div>

			<div class="section">
				<div class="section-title">Transactions</div>
				<table>
					<thead>
						<tr>
							<th>Account ID</th>
							<th>Account Name</th>
							<th class="text-end">Amount</th>
							<th>Transaction Description</th>
						</tr>
					</thead>
					<tbody>
						${accountsHtml}
					</tbody>
				</table>
			</div>

			<div class="section">
				<div class="section-title">Forfeit Details</div>
				<table>
					<thead>
						<tr>
							<th>Account Type</th>
							<th>Account ID</th>
							<th>Description</th>
							<th>Transaction Type</th>
							<th class="text-end">Amount</th>
						</tr>
					</thead>
					<tbody>
						${forfeitsHtml}
					</tbody>
					<tfoot>
						<tr class="total-row">
							<td colspan="4" class="text-end">Total Forfeit Amount:</td>
							<td class="text-end">${totalForfeitAmount}</td>
						</tr>
					</tfoot>
				</table>
			</div>
		</body>
		</html>
	`;

	// Create iframe for printing
	const iframe = document.createElement('iframe');
	iframe.style.position = 'absolute';
	iframe.style.width = '0';
	iframe.style.height = '0';
	iframe.style.border = 'none';
	document.body.appendChild(iframe);

	const iframeDoc = iframe.contentWindow.document;
	iframeDoc.open();
	iframeDoc.write(printContent);
	iframeDoc.close();

	// Wait for content to load then print
	iframe.onload = () => {
		setTimeout(() => {
			iframe.contentWindow.focus();
			iframe.contentWindow.print();
			
			// Remove iframe after printing
			setTimeout(() => {
				document.body.removeChild(iframe);
			}, 100);
		}, 100);
	};
}

function switchTab(index) {
	document.querySelectorAll('.tab-button').forEach((btn, i) => {
		btn.classList.toggle('active', i === index);
	});
	document.querySelectorAll('.tab-content').forEach((content, i) => {
		content.classList.toggle('active', i === index);
	});

	// Legacy layout behavior: accounts grid is visible on Exit Details, hidden on Forfeit Details.
	const accountsSection = document.getElementById('accountsSection');
	if (accountsSection) {
		accountsSection.style.display = index === 0 ? '' : 'none';
	}
}

window.switchTab = switchTab;

document.addEventListener('DOMContentLoaded', () => {
	// Lookup modal wiring (Branch/Center/Group)
	try {
		const lookupForm = document.getElementById('epLookupForm');
		const idInput = document.getElementById('epLookupId');
		const nameInput = document.getElementById('epLookupName');

		lookupForm?.addEventListener('submit', (e) => {
			e.preventDefault();
			epRunLookupSearch().catch((err) => {
				console.warn('[Exit Process] Lookup search failed:', err);
				epSetLookupMeta(err?.message || String(err));
			});
		});

		const onEnter = (e) => {
			if (e.key !== 'Enter') return;
			e.preventDefault();
			epRunLookupSearch().catch((err) => {
				console.warn('[Exit Process] Lookup search failed:', err);
				epSetLookupMeta(err?.message || String(err));
			});
		};
		idInput?.addEventListener('keydown', onEnter);
		nameInput?.addEventListener('keydown', onEnter);
	} catch (e) {
		console.warn('[Exit Process] Lookup wiring failed:', e);
	}

	// Wire search buttons
	document
		.querySelector('button.search-btn[data-ep-lookup="branch"]')
		?.addEventListener('click', (e) => {
			e.preventDefault();
			epOpenLookup('branch');
		});
	document
		.querySelector('button.search-btn[data-ep-lookup="center"]')
		?.addEventListener('click', (e) => {
			e.preventDefault();
			epOpenLookup('center');
		});
	document
		.querySelector('button.search-btn[data-ep-lookup="group"]')
		?.addEventListener('click', (e) => {
			e.preventDefault();
			epOpenLookup('group');
		});
	document
		.querySelector('button.search-btn[data-ep-lookup="client"]')
		?.addEventListener('click', (e) => {
			e.preventDefault();
			epOpenLookup('client');
		});

	// Wire action buttons
	$('btnView')?.addEventListener('click', handleView);
	$('btnAdd')?.addEventListener('click', handleAdd);
	$('btnSave')?.addEventListener('click', handleSave);
	$('btnPrint')?.addEventListener('click', handlePrint);
	$('btnCancel')?.addEventListener('click', handleCancel);

	// Client ID validation (change/blur/Enter). Enter validates first, then runs View if still valid.
	$('clientId')?.addEventListener('change', epValidateClientIdOnChange);
	$('clientId')?.addEventListener('blur', epValidateClientIdOnChange);
	$('clientId')?.addEventListener('keydown', async (e) => {
		if (e.key !== 'Enter') return;
		e.preventDefault();
		const ok = await epValidateClientIdOnChange(e);
		if (ok && String(document.getElementById('clientId')?.value || '').trim()) {
			handleView();
		}
	});

	// Typed Branch ID validation (change/blur/Enter)
	$('branchId')?.addEventListener('change', epValidateBranchIdOnChange);
	$('branchId')?.addEventListener('blur', epValidateBranchIdOnChange);
	$('branchId')?.addEventListener('keydown', (e) => {
		if (e.key !== 'Enter') return;
		e.preventDefault();
		epValidateBranchIdOnChange(e);
	});

	// Typed Center ID validation (change/blur)
	$('centerId')?.addEventListener('change', epValidateCenterIdOnChange);
	$('centerId')?.addEventListener('blur', epValidateCenterIdOnChange);
	$('centerId')?.addEventListener('keydown', (e) => {
		if (e.key !== 'Enter') return;
		e.preventDefault();
		epValidateCenterIdOnChange(e);
	});

	// Typed Group ID validation (change/blur)
	$('groupId')?.addEventListener('change', epValidateGroupIdOnChange);
	$('groupId')?.addEventListener('blur', epValidateGroupIdOnChange);
	$('groupId')?.addEventListener('keydown', (e) => {
		if (e.key !== 'Enter') return;
		e.preventDefault();
		epValidateGroupIdOnChange(e);
	});

	// Initial state
	setEditMode(false);
	renderAccounts([]);
	renderForfeits([]);
	switchTab(0);

	// Disable Add button on page load
	const btnAdd = $('btnAdd');
	if (btnAdd) btnAdd.disabled = true;

	// Set Exit Date to System Working Date on page load
	const exitDateEl = $('exitDate');
	if (exitDateEl && !exitDateEl.value) {
		const workingDate = epGetWorkingDate();
		const year = workingDate.getFullYear();
		const month = String(workingDate.getMonth() + 1).padStart(2, '0');
		const day = String(workingDate.getDate()).padStart(2, '0');
		exitDateEl.value = `${year}-${month}-${day}`;
	}

	// Populate Exit Reason dropdown from Exit Types (ExitTypeID)
	loadExitTypesIntoExitReasonDropdown();
	$('exitReason')?.addEventListener('focus', loadExitTypesIntoExitReasonDropdown);
	$('exitReason')?.addEventListener('click', loadExitTypesIntoExitReasonDropdown);

	// On load: populate logged-in branch context
	epInitLoggedInBranch();

	// Center lookup modal wiring
	document.getElementById('centerLookupForm')?.addEventListener('submit', performCenterLookupSearch);
	document.getElementById('centerSearchReset')?.addEventListener('click', resetCenterLookupPanel);
	document.getElementById('centerSearchRefresh')?.addEventListener('click', () => performCenterLookupSearch(null, true));
	document.getElementById('centerSearchCancel')?.addEventListener('click', closeCenterLookupModal);
});
