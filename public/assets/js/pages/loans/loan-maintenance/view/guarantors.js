(function (global) {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Utility to get parent Loan Maintenance values
  function getLoanMaintenanceContext() {
    try {
      const parentDoc = global.parent?.document;
      if (!parentDoc) return {};
      return {
        OurBranchID: parentDoc.getElementById('BranchID')?.value || '',
        AccountID: parentDoc.getElementById('AccountID')?.value || '',
        LoanSeries: parentDoc.getElementById('LoanSeries')?.value || '',
        OperatorID: global.parent?.getOperatorId ? global.parent.getOperatorId() : (parentDoc.getElementById('OperatorID')?.value || 'web_portal')
      };
    } catch {
      return {};
    }
  }

  function renderGuarantors(rows) {
    const tbody = document.querySelector('tbody');
    if (!tbody) return;
    if (!rows || !rows.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-start">No Details Found [No:1011]</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(row => `
      <tr>
        <td>${row.GuarantorID ?? ''}</td>
        <td>${row.GuarantorName ?? ''}</td>
        <td>${row.GuaranteeAmount ?? ''}</td>
        <td>${row.GuarantorType ?? ''}</td>
        <td>${row.GuaranteeSignedBy ?? ''}</td>
        <td>${row.Networth ?? ''}</td>
        <td>${row.Liability ?? ''}</td>
      </tr>
    `).join('');
  }

  function updateFooter() {
    const footer = document.querySelector('.lmis-footer');
    if (footer) footer.textContent = 'Nimble 1.0 Banking';
  }

  document.addEventListener('DOMContentLoaded', async () => {
    updateFooter();
    console.log('[Guarantors] DOMContentLoaded event fired');
    if (!global.GuarantorService) {
      console.warn('[Guarantors] GuarantorService not available');
      return;
    }
    const ctx = getLoanMaintenanceContext();
    console.log('[Guarantors] Parent context:', ctx);
    if (!ctx.OurBranchID || !ctx.AccountID || !ctx.LoanSeries || !ctx.OperatorID) {
      console.warn('[Guarantors] Missing required context values');
      renderGuarantors([]);
      return;
    }
    try {
      console.log('[Guarantors] Calling GuarantorService.getGuarantors with:', ctx);
      const resp = await global.GuarantorService.getGuarantors({
        OurBranchID: ctx.OurBranchID,
        AccountID: ctx.AccountID,
        LoanSeries: ctx.LoanSeries,
        OperatorID: ctx.OperatorID
      });
      
      console.log('[Guarantors] Service response:', resp);
      
      let rows = [];
      // Handle different response formats
      if (Array.isArray(resp)) {
        rows = resp;
      } else if (resp && resp.success) {
        if (Array.isArray(resp.data)) {
          rows = resp.data;
        } else if (Array.isArray(resp.Details)) {
          rows = resp.Details;
        } else if (Array.isArray(resp.Details02)) {
          rows = resp.Details02;
        }
      }
      
      console.log('[Guarantors] Rows to render:', rows);
      renderGuarantors(rows);
    } catch (error) {
      console.error('[Guarantors] Error loading guarantors:', error);
      renderGuarantors([]);
    }
  });
})(window);
(function (global) {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function requestClose() {
    // Send message to parent window to close child form (matches Account Maintenance pattern)
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ action: 'close-child-form' }, '*');
    }
  }

  const buttons = {
    print: $('[data-action="print"]'),
    represent: $('[data-action="represent"]'),
    unpay: $('[data-action="unpay"]'),
    image: $('[data-action="image"]'),
    reverse: $('[data-action="reverse"]'),
    back: $('[data-action="back"]'),
  };

  buttons.print?.addEventListener('click', () => alert('Print (prototype).'));

  // These are disabled by default; handlers are here for completeness.
  buttons.represent?.addEventListener('click', () => alert('Represent Chq (prototype).'));
  buttons.unpay?.addEventListener('click', () => alert('Unpay Trx (prototype).'));
  buttons.image?.addEventListener('click', () => alert('Image (prototype).'));
  buttons.reverse?.addEventListener('click', () => alert('Reverse (prototype).'));

  buttons.back?.addEventListener('click', requestClose);

  // Seed filter selects (prototype)
  const sel1 = $('#Filter1');
  const sel2 = $('#Filter2');
  [sel1, sel2].forEach((sel) => {
    if (!sel) return;
    if (sel.options.length <= 1) {
      sel.add(new Option('--Select--', ''));
      sel.value = '';
    }
  });

  global.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') requestClose();
  });
})(window);
