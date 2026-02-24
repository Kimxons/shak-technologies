// Collapsible nav for LG Account Application, matching modern-account-maintenance
(function () {
  function setSectionOpen(sectionEl, isOpen) {
    if (!sectionEl) return;
    sectionEl.classList.toggle('is-open', Boolean(isOpen));
    const toggle = sectionEl.querySelector('.cm-nav-toggle');
    const items = sectionEl.querySelector('.cm-nav-items');
    if (toggle) toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    if (items) items.hidden = !isOpen;
  }

  function wireNavSections() {
    const sections = Array.from(document.querySelectorAll('.cm-nav-section'));
    if (!sections.length) return;
    sections.forEach(section => {
      const toggle = section.querySelector('.cm-nav-toggle');
      if (!toggle) return;
      toggle.addEventListener('click', function () {
        const willOpen = !section.classList.contains('is-open');
        // Only one open at a time (optional, comment out next line for multi-open)
        sections.forEach(s => setSectionOpen(s, false));
        setSectionOpen(section, willOpen);
      });
    });
    // Ensure initial state is consistent with markup
    sections.forEach(section => {
      const initiallyOpen = section.classList.contains('is-open');
      setSectionOpen(section, initiallyOpen);
    });
  }

  document.addEventListener('DOMContentLoaded', wireNavSections);
})();
