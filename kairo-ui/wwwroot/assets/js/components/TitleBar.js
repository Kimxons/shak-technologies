/**
 * Kairo TitleBar Component
 * Reusable title bar for all DataEntry and View forms
 * Version: 1.0.0 - January 2026
 * 
 * Features:
 * - Consistent enterprise UI styling
 * - Refresh, Maximize/Restore, Close buttons
 * - Title truncation with ellipsis
 * - Keyboard accessible (Tab, Enter, Space)
 * - No absolute positioning - uses flexbox
 * - Minimal hover feedback
 * 
 * Usage:
 *   <div data-kairo-titlebar 
 *        data-title="Form Title" 
 *        data-icon="bi-file-text"
 *        data-check-unsaved="true">
 *   </div>
 * 
 * Or programmatically:
 *   KairoTitleBar.init({ 
 *     container: document.querySelector('.my-container'),
 *     title: 'My Form',
 *     icon: 'bi-file-text',
 *     onRefresh: () => loadData(),
 *     onClose: () => closeForm(),
 *     checkUnsaved: true
 *   });
 */

const KairoTitleBar = (function() {
  'use strict';

  // Track all initialized title bars
  const instances = new Map();
  
  // Default configuration
  const defaults = {
    title: 'Untitled',
    icon: 'bi-window',
    checkUnsaved: false,
    onRefresh: null,
    onMaximize: null,
    onClose: null
  };

  /**
   * Create the title bar HTML structure
   * @param {Object} config - Configuration options
   * @returns {HTMLElement} - Title bar element
   */
  function createTitleBarElement(config) {
    const titleBar = document.createElement('div');
    titleBar.className = 'ktb-title-bar';
    titleBar.setAttribute('role', 'banner');
    titleBar.setAttribute('aria-label', 'Window title bar');

    titleBar.innerHTML = `
      <div class="ktb-title-bar__left">
        <i class="bi ${config.icon} ktb-title-bar__icon" aria-hidden="true"></i>
        <span class="ktb-title-bar__text" title="${config.title}">${config.title}</span>
      </div>
      <div class="ktb-title-bar__right" role="toolbar" aria-label="Window controls">
        <button class="ktb-btn" type="button" data-action="refresh" title="Refresh" aria-label="Refresh data">
          <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
        </button>
        <button class="ktb-btn" type="button" data-action="maximize" title="Maximize" aria-label="Maximize window">
          <i class="bi bi-square" aria-hidden="true"></i>
        </button>
        <button class="ktb-btn ktb-btn--close" type="button" data-action="close" title="Close" aria-label="Close window">
          <i class="bi bi-x-lg" aria-hidden="true"></i>
        </button>
      </div>
    `;

    return titleBar;
  }

  /**
   * Handle title bar button clicks
   * @param {Event} e - Click event
   * @param {Object} instance - Title bar instance
   */
  function handleButtonClick(e, instance) {
    const btn = e.target.closest('.ktb-btn');
    if (!btn) return;

    const action = btn.getAttribute('data-action');
    
    switch (action) {
      case 'refresh':
        handleRefresh(instance);
        break;
      case 'maximize':
        handleMaximize(btn, instance);
        break;
      case 'close':
        handleClose(instance);
        break;
    }
  }

  /**
   * Handle refresh action
   * @param {Object} instance - Title bar instance
   */
  function handleRefresh(instance) {
    // Dispatch custom event
    const event = new CustomEvent('kairo:titlebar:refresh', {
      bubbles: true,
      cancelable: true,
      detail: { instance }
    });
    
    instance.element.dispatchEvent(event);
    
    // Call custom handler if provided
    if (typeof instance.config.onRefresh === 'function') {
      instance.config.onRefresh();
    }
    
    // Default: dispatch dataentry:refresh for backward compatibility
    document.dispatchEvent(new CustomEvent('dataentry:refresh'));
  }

  /**
   * Handle maximize/restore action
   * @param {HTMLElement} btn - The button element
   * @param {Object} instance - Title bar instance
   */
  function handleMaximize(btn, instance) {
    const windowEl = instance.windowElement;
    if (!windowEl) return;

    const isMaximized = windowEl.classList.toggle('ktb-window--maximized');
    
    // Also toggle de-window--maximized for backward compatibility
    windowEl.classList.toggle('de-window--maximized', isMaximized);
    windowEl.classList.toggle('asg-window--maximized', isMaximized);
    
    // Update button icon and tooltip
    const icon = btn.querySelector('i');
    if (icon) {
      icon.className = isMaximized ? 'bi bi-fullscreen-exit' : 'bi bi-square';
    }
    btn.title = isMaximized ? 'Restore' : 'Maximize';
    btn.setAttribute('aria-label', isMaximized ? 'Restore window' : 'Maximize window');
    
    // Dispatch event
    const event = new CustomEvent('kairo:titlebar:maximize', {
      bubbles: true,
      detail: { instance, maximized: isMaximized }
    });
    instance.element.dispatchEvent(event);
    
    // Call custom handler
    if (typeof instance.config.onMaximize === 'function') {
      instance.config.onMaximize(isMaximized);
    }
  }

  /**
   * Handle close action with unsaved changes check
   * @param {Object} instance - Title bar instance
   */
  function handleClose(instance) {
    // Check for unsaved changes if configured
    if (instance.config.checkUnsaved && typeof instance.config.hasUnsavedChanges === 'function') {
      if (instance.config.hasUnsavedChanges()) {
        const confirmed = confirm('You have unsaved changes. Are you sure you want to close?');
        if (!confirmed) return;
      }
    }
    
    // Dispatch custom event (cancelable)
    const event = new CustomEvent('kairo:titlebar:close', {
      bubbles: true,
      cancelable: true,
      detail: { instance }
    });
    
    const notCancelled = instance.element.dispatchEvent(event);
    
    if (notCancelled) {
      // Call custom handler if provided
      if (typeof instance.config.onClose === 'function') {
        instance.config.onClose();
      } else {
        // Default close behavior
        closeForm();
      }
    }
  }

  /**
   * Default close form behavior
   */
  function closeForm() {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'accountMaintenanceChildClose' }, '*');
    } else {
      window.close();
    }
  }

  /**
   * Bind keyboard events for accessibility
   * @param {Object} instance - Title bar instance
   */
  function bindKeyboardEvents(instance) {
    instance.element.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const btn = e.target.closest('.ktb-btn');
        if (btn) {
          e.preventDefault();
          btn.click();
        }
      }
    });
  }

  /**
   * Initialize a title bar
   * @param {Object} options - Configuration options
   * @returns {Object} - Title bar instance
   */
  function init(options = {}) {
    const config = { ...defaults, ...options };
    
    // Get or create container
    let container = config.container;
    if (typeof container === 'string') {
      container = document.querySelector(container);
    }
    
    if (!container) {
      console.warn('[KairoTitleBar] Container not found');
      return null;
    }

    // Find the window element (parent container)
    const windowElement = container.closest('.de-window, .asg-window, .ktb-window, [data-ktb-window]') 
      || container.parentElement;

    // Create title bar element
    const element = createTitleBarElement(config);
    
    // Create instance
    const instance = {
      id: `ktb-${Date.now()}`,
      element,
      container,
      windowElement,
      config
    };

    // Bind events
    element.addEventListener('click', (e) => handleButtonClick(e, instance));
    bindKeyboardEvents(instance);

    // Insert into container
    container.innerHTML = '';
    container.appendChild(element);

    // Store instance
    instances.set(instance.id, instance);

    return instance;
  }

  /**
   * Initialize all title bars with data-kairo-titlebar attribute
   */
  function initAll() {
    document.querySelectorAll('[data-kairo-titlebar]').forEach((container) => {
      const title = container.getAttribute('data-title') || defaults.title;
      const icon = container.getAttribute('data-icon') || defaults.icon;
      const checkUnsaved = container.getAttribute('data-check-unsaved') === 'true';
      
      init({
        container,
        title,
        icon,
        checkUnsaved
      });
    });
  }

  /**
   * Update title text
   * @param {Object} instance - Title bar instance
   * @param {string} newTitle - New title text
   */
  function setTitle(instance, newTitle) {
    if (!instance || !instance.element) return;
    const textEl = instance.element.querySelector('.ktb-title-bar__text');
    if (textEl) {
      textEl.textContent = newTitle;
      textEl.title = newTitle;
    }
  }

  /**
   * Destroy a title bar instance
   * @param {Object} instance - Title bar instance
   */
  function destroy(instance) {
    if (!instance) return;
    
    if (instance.element && instance.element.parentNode) {
      instance.element.parentNode.removeChild(instance.element);
    }
    
    instances.delete(instance.id);
  }

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    // DOM already loaded, init immediately
    setTimeout(initAll, 0);
  }

  // Public API
  return {
    init,
    initAll,
    setTitle,
    destroy,
    closeForm,
    VERSION: '1.0.0'
  };
})();

// Export for ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KairoTitleBar;
}
