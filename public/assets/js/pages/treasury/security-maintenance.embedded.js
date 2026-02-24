document.addEventListener('DOMContentLoaded', () => {
      const couponBtn = document.getElementById('smCouponScheduleBtn');
      const modalEl = document.getElementById('smCouponScheduleModal');
      const frameEl = document.getElementById('smCouponScheduleFrame');

      if (!couponBtn || !modalEl || !frameEl) return;

      const modal = new bootstrap.Modal(modalEl, {
        backdrop: 'static',
        keyboard: true
      });

      couponBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!frameEl.getAttribute('src')) {
          frameEl.setAttribute('src', '../data-entry/security-maintenance-coupon-schedule.html');
        }
        modal.show();
      });

      modalEl.addEventListener('hidden.bs.modal', () => {
        frameEl.removeAttribute('src');
      });
    });
