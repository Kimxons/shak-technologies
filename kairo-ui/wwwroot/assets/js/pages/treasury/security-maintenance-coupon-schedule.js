(function () {
  const winEl = document.getElementById('cscWindow');
  const sendClose = () => {
    try {
      window.parent?.postMessage({ type: 'securityMaintenanceChildClose', child: 'couponSchedule' }, '*');
    } catch {
      // ignore
    }
  };

  document.querySelectorAll('[data-csc-title-action="refresh"]').forEach((btn) => {
    btn.addEventListener('click', () => window.location.reload());
  });

  document.querySelectorAll('[data-csc-title-action="minimize"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!winEl) return;
      winEl.classList.toggle('acd-window--minimized');
    });
  });

  document.querySelectorAll('[data-csc-title-action="close"]').forEach((btn) => {
    btn.addEventListener('click', () => sendClose());
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') sendClose();
  });

  // Coupon Schedule View Logic
  const tableBody = document.querySelector('#cscTable tbody');
  const instNoInput = document.getElementById('InstNo');
  const periodInput = document.getElementById('Period');
  const couponDateInput = document.getElementById('CouponDate');
  const percentageInput = document.getElementById('Percentage');
  const isFinalInput = document.getElementById('IsFinal');
  const isMultipleRedemptionInput = document.getElementById('IsMultipleRedemption');

  // Utility: Get parent window data (simulate)
  function getParentSecurityData() {
    // This should be replaced with actual parent window data fetch
    // For demo, return a sample bond type
    return {
      IssueNumber: window.parent?.securityIssueNumber || '',
      SecurityType: window.parent?.securityType || 'bond',
      OurBranchID: window.parent?.ourBranchID || '1201',
      OperatorID: window.parent?.operatorID || 'OP001'
    };
  }

  // Treasury Service API call
  async function fetchCouponSchedule(issueNumber, branchID, operatorID) {
    if (!window.ServiceLoader?.loadTreasuryService) return null;
    await window.ServiceLoader.loadTreasuryService();
    if (!window.TreasuryService) return null;
    const req = {
      RequestID: 'dbo.p_GetCouponScheduleCustom ',
      FormId: 'dbo.p_GetCouponScheduleCustom ',
      RequestData: {
        IssueNumber: issueNumber,
        OurBranchID: '1201',
        OperatorID: 'JOY_WANJA',
      },
      RequestTime: new Date().toLocaleString('en-US', { hour12: false }),
      AppName: 'PROJECT_KAIRO',
      Checksum: ''
    };
    try {
      const resp = await window.TreasuryService.getCouponScheduleCustom(req.RequestData);
      return resp?.data || [];
    } catch (e) {
      return [];
    }
  }

  // Render table rows
  function renderTableRows(rows) {
    tableBody.innerHTML = '';
    if (!rows || !rows.length) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="3" class="csc-muted">No records to display.</td>';
      tableBody.appendChild(tr);
      return;
    }
    rows.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${row.InstNo || ''}</td><td>${row.IsMultipleRedemption ? 'Yes' : 'No'}</td><td>${row.CouponDate || ''}</td>`;
      tableBody.appendChild(tr);
    });
  }

  // On load: fetch and display coupon schedule if parent is bond
  document.addEventListener('DOMContentLoaded', async function () {
    const parentData = getParentSecurityData();
    if (parentData.SecurityType === 'bond' && parentData.IssueNumber) {
      const rows = await fetchCouponSchedule(parentData.IssueNumber, parentData.OurBranchID, parentData.OperatorID);
      renderTableRows(rows);
    }
  });

  // TODO: Implement Edit, Reset, Save button logic
})();
