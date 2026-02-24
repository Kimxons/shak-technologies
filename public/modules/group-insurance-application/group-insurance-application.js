(function () {
  const navButtons = Array.from(document.querySelectorAll('[data-gia-nav]'));

  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      navButtons.forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
    });
  });
})();
