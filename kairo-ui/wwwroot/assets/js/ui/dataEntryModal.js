/**
 * DataEntry Modal Component
 * Handles the popup modal/slide-in panel for DataEntry navigation items
 */

class DataEntryModal {
  constructor(triggerButtonSelector = '.cm-nav-toggle') {
    this.modalElement = null;
    this.triggerButton = null;
    this.isOpen = false;
    this.initialize(triggerButtonSelector);
  }

  initialize(triggerButtonSelector) {
    this.createModal();
    this.attachEventListeners(triggerButtonSelector);
  }

  createModal() {
    // Create modal backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'de-modal-backdrop';
    backdrop.id = 'dataentry-modal-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');

    // Create modal container
    const modal = document.createElement('div');
    modal.className = 'de-modal';
    modal.id = 'dataentry-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'dataentry-modal-title');

    // Modal header
    const header = document.createElement('div');
    header.className = 'de-modal__header';
    const title = document.createElement('h2');
    title.id = 'dataentry-modal-title';
    title.className = 'de-modal__title';
    title.textContent = 'DataEntry';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'de-modal__close';
    closeBtn.setAttribute('aria-label', 'Close modal');
    closeBtn.innerHTML = '<i class="bi bi-x"></i>';
    closeBtn.addEventListener('click', () => this.close());

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Modal content
    const content = document.createElement('div');
    content.className = 'de-modal__content';
    content.id = 'dataentry-modal-content';

    modal.appendChild(header);
    modal.appendChild(content);

    // Append to body
    document.body.appendChild(backdrop);
    document.body.appendChild(modal);

    this.modalElement = modal;
    this.backdropElement = backdrop;

    // Close on backdrop click
    backdrop.addEventListener('click', () => this.close());
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  attachEventListeners(triggerButtonSelector) {
    // Find the DataEntry toggle button
    const toggleButtons = document.querySelectorAll(triggerButtonSelector);
    
    toggleButtons.forEach(btn => {
      const label = btn.querySelector('.cm-nav-toggle__label');
      if (label && label.textContent.includes('DataEntry')) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.open(btn);
        });
      }
    });
  }

  open(triggerButton) {
    if (this.isOpen) return;

    // Get the nav items from the sidebar
    const navSection = triggerButton.closest('.cm-nav-section');
    const navItems = navSection.querySelector('.cm-nav-items');

    if (!navItems) return;

    // Clone the nav items into the modal
    const itemsClone = navItems.cloneNode(true);
    // Remove the is-collapsed class if present
    itemsClone.classList.remove('is-collapsed');
    itemsClone.classList.add('de-modal__items');

    // Clear previous content
    const contentArea = document.getElementById('dataentry-modal-content');
    contentArea.innerHTML = '';
    contentArea.appendChild(itemsClone);

    // Add click handlers to modal items
    contentArea.querySelectorAll('.cm-legacy-nav__item').forEach(item => {
      item.addEventListener('click', () => {
        this.handleItemClick(item);
      });
    });

    // Show modal
    this.modalElement.classList.add('is-open');
    this.backdropElement.classList.add('is-open');
    this.isOpen = true;

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  close() {
    if (!this.isOpen) return;

    this.modalElement.classList.remove('is-open');
    this.backdropElement.classList.remove('is-open');
    this.isOpen = false;

    // Restore body scroll
    document.body.style.overflow = '';
  }

  handleItemClick(itemElement) {
    // Dispatch custom event for item selection
    const itemText = itemElement.textContent.trim();
    const event = new CustomEvent('dataentry-item-selected', {
      detail: { itemText, itemElement }
    });
    document.dispatchEvent(event);

    // Mark as active
    itemElement.closest('.de-modal__items').querySelectorAll('.cm-legacy-nav__item').forEach(item => {
      item.classList.remove('is-active');
    });
    itemElement.classList.add('is-active');

    // Optionally close after selection (comment out if you want to keep it open)
    // this.close();
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new DataEntryModal();
});
