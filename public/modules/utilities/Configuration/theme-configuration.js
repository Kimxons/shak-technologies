(function () {
  'use strict';

  // ==================== DOM ELEMENT REFERENCES ====================
  const form = document.getElementById('theme-form') || document.getElementById('themeConfigForm');
  const colorInputs = document.querySelectorAll('.theme-color-input');
  const sectionButtons = document.querySelectorAll('[data-section].btn-action, [data-section][role="tab"]');
  const sections = document.querySelectorAll('.theme-config-section[data-section]');
  const messagePanel = document.querySelector('.am-message-panel');
  const messagePanelText = document.getElementById('messagePanelText');
  const cancelBtn = document.querySelector('[data-action="cancel"]');
  const applyBtn = document.querySelector('[data-action="apply-theme-model"], [data-action="apply-theme"]');

  // ==================== UTILITY FUNCTIONS ====================

  /**
   * Convert any color format to 6-digit hex
   */
  function toHex(color) {
    if (!color) return '#000000';

    const c = String(color).trim().toLowerCase();
    
    // Already hex - ensure 6 digits
    if (c.startsWith('#')) {
      if (c.length === 4) {
        // Expand #abc to #aabbcc
        return '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
      }
      if (c.length === 7) {
        return c;
      }
      return '#000000';
    }
    
    // RGB or RGBA format
    if (c.startsWith('rgb')) {
      const match = c.match(/\d+(?:\.\d+)?/g);
      if (match && match.length >= 3) {
        const [r, g, b] = match.slice(0, 3).map(x => {
          const num = Math.round(parseFloat(x));
          return Math.max(0, Math.min(255, num));
        });
        return '#' + [r, g, b].map(x => {
          const h = x.toString(16);
          return h.length === 1 ? '0' + h : h;
        }).join('');
      }
    }
    
    console.warn('Could not parse color:', color);
    return '#000000';
  }

  /**
   * Get actual computed color from a specific CSS property
   * ONLY reads from real rendered DOM elements
   * Returns null if element not found or color is invalid
   */
  function readColorFromElement(selector, cssProperty) {
    try {
      const el = document.querySelector(selector);
      if (!el) {
        console.log(`Element not found: ${selector}`);
        return null;
      }

      const computed = window.getComputedStyle(el);
      const colorValue = computed.getPropertyValue(cssProperty).trim();

      if (!colorValue) {
        console.log(`No ${cssProperty} value on ${selector}`);
        return null;
      }

      const hex = toHex(colorValue);
      console.log(`✓ Read ${cssProperty} from ${selector}: ${colorValue} → ${hex}`);
      return hex;
    } catch (e) {
      console.warn(`Error reading ${cssProperty} from ${selector}:`, e);
      return null;
    }
  }

  /**
   * Get CSS variable value from :root
   * This is the PRIMARY source of truth for theme colors
   */
  function readCSSVariable(varName) {
    try {
      const value = getComputedStyle(document.documentElement)
        .getPropertyValue(varName)
        .trim();

      if (!value) {
        console.log(`CSS variable ${varName} not found in :root`);
        return null;
      }

      const hex = toHex(value);
      console.log(`✓ Read CSS variable ${varName}: ${value} → ${hex}`);
      return hex;
    } catch (e) {
      console.warn(`Error reading CSS variable ${varName}:`, e);
      return null;
    }
  }

  /**
   * Resolve color from multiple sources (in order of preference)
   * 1. CSS variables (PRIMARY - source of truth)
   * 2. DOM elements (SECONDARY - fallback)
   * Returns first valid color found, or null if none found
   */
  function resolveColor(cssVar, selectorList, cssProperty) {
    // PRIMARY: Try CSS variable first
    console.log(`  Trying CSS variable: ${cssVar}`);
    const cssVarColor = readCSSVariable(cssVar);
    if (cssVarColor && cssVarColor !== '#000000') {
      return cssVarColor;
    }

    // SECONDARY: Try DOM elements as fallback
    console.log(`  CSS variable not found, trying DOM elements...`);
    if (Array.isArray(selectorList)) {
      for (const selector of selectorList) {
        const color = readColorFromElement(selector, cssProperty);
        if (color && color !== '#000000') {
          return color;
        }
      }
    }

    console.warn(`Could not resolve ${cssVar} from any source`);
    return null;
  }

  /**
   * Show message in panel
   */
  function showMessage(text, type = 'info') {
    if (messagePanel) {
      messagePanel.className = 'am-message-panel show ' + type;
      if (messagePanelText) messagePanelText.textContent = text;
      setTimeout(() => {
        messagePanel.classList.remove('show');
      }, 4000);
    } else {
      console.log('[Theme]', text);
    }
  }

  // ==================== SECTION NAVIGATION ====================

  function setupSectionNavigation() {
    sectionButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const sectionName = btn.dataset.section;
        if (!sectionName) return;
        
        // Hide all sections
        sections.forEach(s => {
          s.style.display = 'none';
          s.classList.remove('active');
        });
        
        // Show selected section
        const targetSection = document.querySelector(`.theme-config-section[data-section="${sectionName}"]`);
        if (targetSection) {
          targetSection.style.display = 'block';
          targetSection.classList.add('active');
        }
        
        // Update active button
        sectionButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        console.log('Switched to section:', sectionName);
      });
    });
  }

  // ==================== COLOR LOADING ====================

  /**
   * Load colors from CSS variables (PRIMARY) and DOM elements (SECONDARY)
   * Must be called AFTER DOMContentLoaded AND requestAnimationFrame
   * to ensure CSS is painted and elements are available
   */
  function loadColorsFromUI() {
    console.log('\n=== LOADING COLORS FROM CSS + DOM ===\n');

    // Color resolution: CSS var for each color + selector list as fallback
    const colorMappings = {
      headerColor: {
        cssVar: '--color-header',
        selectors: ['.am-header', '[data-page="theme-configuration"] .am-card-header', '.card-header'],
        property: 'background-color',
        description: 'Page header background'
      },
      primaryColor: {
        cssVar: '--color-primary',
        selectors: ['.btn-primary', '[data-action="apply-theme"]', '.list-group-item.active'],
        property: 'background-color',
        description: 'Primary button background'
      },
      borderColor: {
        cssVar: '--color-border',
        selectors: ['.form-control', '.card', 'input[type="text"]'],
        property: 'border-color',
        description: 'Input/card border color'
      },
      textColor: {
        cssVar: '--color-text',
        selectors: ['body', '.card-body', '.form-label'],
        property: 'color',
        description: 'Body text color'
      },
      mandatoryColor: {
        cssVar: '--color-label-mandatory',
        selectors: ['.text-danger', '.badge-danger', 'label[class*="required"]'],
        property: 'color',
        description: 'Mandatory field indicator color'
      },
      conditionalColor: {
        cssVar: '--color-label-conditional',
        selectors: ['.text-warning', '.badge-warning', 'label[class*="conditional"]'],
        property: 'color',
        description: 'Conditional field indicator color'
      },
      optionalColor: {
        cssVar: '--color-label-optional',
        selectors: ['.text-secondary', '.badge-secondary', 'label[class*="optional"]'],
        property: 'color',
        description: 'Optional field indicator color'
      }
    };

    let successCount = 0;
    let failureCount = 0;

    colorInputs.forEach(input => {
      const colorName = input.dataset.themeColor;
      const mapping = colorMappings[colorName];

      if (!mapping) {
        console.error(`❌ No mapping defined for: ${colorName}`);
        failureCount++;
        return;
      }

      console.log(`\n→ Resolving ${colorName} (${mapping.description}):`);

      // Try CSS variable first, then DOM elements
      const resolvedColor = resolveColor(
        mapping.cssVar,
        mapping.selectors,
        mapping.property
      );

      if (resolvedColor && resolvedColor !== '#000000') {
        // Success: set the color picker and display
        input.value = resolvedColor;
        const displayInput = document.getElementById('value' + colorName.charAt(0).toUpperCase() + colorName.slice(1));
        if (displayInput) {
          displayInput.value = resolvedColor.toUpperCase();
        }
        console.log(`✓ SUCCESS: ${colorName} = ${resolvedColor}\n`);
        successCount++;
      } else {
        // Failed to resolve - show error but don't crash
        console.warn(`⚠ FAILED: Could not resolve color from CSS or DOM for ${colorName}\n`);
        input.value = '#cccccc'; // Gray fallback so it's not black
        const displayInput = document.getElementById('value' + colorName.charAt(0).toUpperCase() + colorName.slice(1));
        if (displayInput) {
          displayInput.value = '#CCCCCC';
        }
        failureCount++;
      }
    });

    console.log(`\n=== COLOR LOADING COMPLETE ===`);
    console.log(`✓ Loaded: ${successCount} colors`);
    console.log(`⚠ Failed: ${failureCount} colors\n`);

    // Show message
    if (successCount > 0) {
      showMessage(`Loaded ${successCount} colors from theme`, 'success');
    } else if (failureCount > 0) {
      showMessage(`Warning: Only ${successCount} of ${successCount + failureCount} colors found`, 'warning');
    }
  }

  // ==================== COLOR INPUT HANDLERS ====================

  function setupColorInputs() {
    colorInputs.forEach(input => {
      input.addEventListener('input', (e) => {
        const colorName = e.target.dataset.themeColor;
        const cssVar = e.target.dataset.cssVar;
        const hexColor = toHex(e.target.value);

        if (cssVar) {
          // Update CSS variable for live preview
          document.documentElement.style.setProperty(cssVar, hexColor);
          
          // Update display value
          const valueInput = document.getElementById('value' + colorName.charAt(0).toUpperCase() + colorName.slice(1));
          if (valueInput) {
            valueInput.value = hexColor.toUpperCase();
          }
        }
      });

      input.addEventListener('change', (e) => {
        const colorName = e.target.dataset.themeColor;
        const cssVar = e.target.dataset.cssVar;
        const hexColor = toHex(e.target.value);

        if (cssVar) {
          document.documentElement.style.setProperty(cssVar, hexColor);
          
          const valueInput = document.getElementById('value' + colorName.charAt(0).toUpperCase() + colorName.slice(1));
          if (valueInput) {
            valueInput.value = hexColor.toUpperCase();
          }
        }
      });
    });
  }

  // ==================== PRESET THEMES ====================

  /**
   * Built-in preset themes
   */
  const PRESET_THEMES = {
    original: {
      name: 'Original',
      description: 'Default system theme',
      isSystemPreset: true,
      tags: ['light', 'corporate'],
      tokens: {
        '--color-header': '#4a7c95',
        '--color-primary': '#4a7c95',
        '--color-border': '#e3e9ed',
        '--color-text': '#1e293b',
        '--color-label-mandatory': '#ef4444',
        '--color-label-conditional': '#f59e0b',
        '--color-label-optional': '#94a3b8'
      }
    },
    professional: {
      name: 'Professional Blue',
      description: 'Corporate blue theme',
      isSystemPreset: true,
      tags: ['light', 'corporate'],
      tokens: {
        '--color-header': '#2563eb',
        '--color-primary': '#3b82f6',
        '--color-border': '#e5e7eb',
        '--color-text': '#1f2937',
        '--color-label-mandatory': '#dc2626',
        '--color-label-conditional': '#f59e0b',
        '--color-label-optional': '#6b7280'
      }
    },
    dark: {
      name: 'Dark Mode',
      description: 'Dark theme for night work',
      isSystemPreset: true,
      tags: ['dark'],
      tokens: {
        '--color-header': '#1e293b',
        '--color-primary': '#0f172a',
        '--color-border': '#334155',
        '--color-text': '#f1f5f9',
        '--color-label-mandatory': '#ef4444',
        '--color-label-conditional': '#f97316',
        '--color-label-optional': '#94a3b8'
      }
    },
    green: {
      name: 'Green Accent',
      description: 'Environmental green theme',
      isSystemPreset: true,
      tags: ['light', 'corporate'],
      tokens: {
        '--color-header': '#059669',
        '--color-primary': '#10b981',
        '--color-border': '#d1fae5',
        '--color-text': '#064e3b',
        '--color-label-mandatory': '#dc2626',
        '--color-label-conditional': '#d97706',
        '--color-label-optional': '#6b7280'
      }
    },
    purple: {
      name: 'Purple Theme',
      description: 'Creative purple theme',
      isSystemPreset: true,
      tags: ['light', 'creative'],
      tokens: {
        '--color-header': '#7c3aed',
        '--color-primary': '#a855f7',
        '--color-border': '#e9d5ff',
        '--color-text': '#4c1d95',
        '--color-label-mandatory': '#dc2626',
        '--color-label-conditional': '#f59e0b',
        '--color-label-optional': '#6b7280'
      }
    },
    glassmorphism: {
      name: 'Glassmorphism',
      description: 'Premium frosted-glass aesthetic – professional, enterprise-ready',
      isSystemPreset: true,
      tags: ['light', 'creative'],
      tokens: {
        '--color-header': '#4338ca',
        '--color-primary': '#6366f1',
        '--color-border': '#c7d2fe',
        '--color-text': '#1e1b4b',
        '--color-label-mandatory': '#dc2626',
        '--color-label-conditional': '#f59e0b',
        '--color-label-optional': '#64748b'
      }
    }
  };

  /**
   * Apply theme tokens to document
   * @param {Object} tokens - CSS variable key-value pairs
   */
  function applyTheme(tokens) {
    const root = document.documentElement;
    
    if (!tokens || typeof tokens !== 'object') {
      console.error('Invalid tokens provided to applyTheme', tokens);
      return false;
    }

    try {
      console.log('🎨 Applying theme tokens:', tokens);
      let appliedCount = 0;

      Object.entries(tokens).forEach(([key, value]) => {
        if (key.startsWith('--')) {
          try {
            root.style.setProperty(key, value, 'important');
            appliedCount++;
            console.log(`✓ Set ${key} = ${value}`);
          } catch (e) {
            console.error(`✗ Failed to set ${key}:`, e.message);
          }
        }
      });
      
      // Also set title bar and search icon variables to match theme
      if (tokens['--color-header']) {
        root.style.setProperty('--ktb-bg', tokens['--color-header'], 'important');
        root.style.setProperty('--ktb-bg-dark', `color-mix(in srgb, ${tokens['--color-header']} 85%, black 15%)`, 'important');
        root.style.setProperty('--am-primary', tokens['--color-header'], 'important');
        root.style.setProperty('--am-primary-dark', `color-mix(in srgb, ${tokens['--color-header']} 85%, black 15%)`, 'important');
        console.log(`✓ Set title bar and search icon colors from --color-header`);
      } else if (tokens['--color-primary']) {
        root.style.setProperty('--ktb-bg', tokens['--color-primary'], 'important');
        root.style.setProperty('--ktb-bg-dark', `color-mix(in srgb, ${tokens['--color-primary']} 85%, black 15%)`, 'important');
        root.style.setProperty('--am-primary', tokens['--color-primary'], 'important');
        root.style.setProperty('--am-primary-dark', `color-mix(in srgb, ${tokens['--color-primary']} 85%, black 15%)`, 'important');
        console.log(`✓ Set title bar and search icon colors from --color-primary`);
      }
      
      // Force a complete repaint
      console.log('🔄 Forcing repaint...');
      
      // Trigger reflow/repaint
      void document.body.offsetHeight;
      
      // Force style recalculation on all elements using CSS variables
      const elementsToUpdate = document.querySelectorAll('[style*="var(--color"]');
      console.log(`Found ${elementsToUpdate.length} elements with inline color vars`);
      
      // Update elements that might have inline styles
      elementsToUpdate.forEach(el => {
        el.style.opacity = '0.99';
        setTimeout(() => { el.style.opacity = '1'; }, 5);
      });

      // Verify tokens were set
      console.log('📋 Verifying tokens:');
      Object.entries(tokens).forEach(([key]) => {
        const value = getComputedStyle(root).getPropertyValue(key).trim();
        console.log(`${key} = ${value}`);
      });

      console.log(`✅ Theme applied: ${appliedCount}/${Object.keys(tokens).length} tokens`);
      return appliedCount > 0;
    } catch (error) {
      console.error('❌ Error applying theme:', error);
      return false;
    }
  }

  /**
   * Get currently active preset ID from localStorage
   */
  function getActivePresetId() {
    try {
      const stored = localStorage.getItem('kairo_theme_preset');
      if (stored) {
        const data = JSON.parse(stored);
        return data.preset || null;
      }
    } catch (e) { /* ignore */ }
    return 'original';
  }

  /**
   * Render preset theme cards
   * @param {string} filter - 'all' | 'light' | 'dark' | 'corporate' | 'creative'
   */
  function renderPresetThemes(filter) {
    const container = document.getElementById('presetsContainer');
    if (!container) return;

    const activeId = getActivePresetId();
    filter = filter || 'all';

    let entries = Object.entries(PRESET_THEMES);
    if (filter !== 'all') {
      entries = entries.filter(([, preset]) => preset.tags && preset.tags.includes(filter));
    }

    container.innerHTML = '';

    entries.forEach(([key, preset]) => {
      const isActive = key === activeId;
      const colorKeys = ['--color-header', '--color-primary', '--color-border', '--color-text'];
      const colors = colorKeys.map(k => preset.tokens[k] || '#ccc');
      const card = document.createElement('div');
      card.className = 'col-6 col-md-4 col-lg-3 col-xl-2';

      card.innerHTML = `
        <div class="preset-theme-card card h-100 shadow-sm ${isActive ? 'is-active' : ''}" data-preset-id="${key}">
          <div class="card-body">
            <div class="d-flex align-items-center gap-2 mb-1 flex-wrap">
              <h6 class="mb-0 fw-bold">${preset.name}</h6>
              ${preset.isSystemPreset ? '<span class="badge bg-primary badge-active">System</span>' : ''}
              ${isActive ? '<span class="badge bg-success badge-active">Active</span>' : ''}
            </div>
            <p class="text-muted small">${preset.description}</p>
            <div class="color-preview mb-2">
              ${colors.map(c => `<div class="color-swatch" style="background-color:${c || '#ccc'}"></div>`).join('')}
            </div>
            <button type="button" class="btn ${isActive ? 'btn-applied btn-success' : 'btn-primary'} preset-apply-btn" ${isActive ? 'disabled' : ''} data-preset-id="${key}">
              <i class="bi bi-check-circle me-1"></i>${isActive ? 'Applied' : 'Apply Theme'}
            </button>
          </div>
        </div>
      `;

      const applyBtn = card.querySelector('.preset-apply-btn');
      if (applyBtn && !isActive) {
        applyBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          await applyPresetTheme(key);
        });
      }

      container.appendChild(card);
    });
  }

  /**
   * Setup filter tabs and toolbar
   */
  function setupThemeFilters() {
    const tabs = document.querySelectorAll('.theme-filter-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderPresetThemes(tab.dataset.filter || 'all');
      });
    });

    const compactCheck = document.getElementById('themeCompactMode');
    if (compactCheck) {
      compactCheck.checked = localStorage.getItem('kairo_theme_compact') === 'true';
      compactCheck.addEventListener('change', () => {
        localStorage.setItem('kairo_theme_compact', compactCheck.checked ? 'true' : 'false');
        document.body.classList.toggle('theme-compact-view', compactCheck.checked);
      });
      if (compactCheck.checked) document.body.classList.add('theme-compact-view');
    }
  }

  /**
   * Validate theme save request data
   * @param {Object} requestData - The data to validate
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  function validateThemeSaveRequest(requestData) {
    const errors = [];

    if (!requestData) {
      errors.push('Request data is null or undefined');
      return { valid: false, errors };
    }

    // Check required fields
    if (!requestData.ScopeType) {
      errors.push('ScopeType is required (e.g., "SYSTEM", "USER", "BRANCH")');
    }

    if (requestData.ScopeRefID === null || requestData.ScopeRefID === undefined) {
      errors.push('ScopeRefID is required (e.g., 0 for SYSTEM scope)');
    }

    if (!requestData.ThemeName) {
      errors.push('ThemeName is required');
    }

    if (!requestData.SettingsJson) {
      errors.push('SettingsJson is required');
    }

    if (requestData.OperatorID === null || requestData.OperatorID === undefined) {
      errors.push('OperatorID is required - ensure user is logged in');
    }

    // Validate SettingsJson format
    if (requestData.SettingsJson) {
      try {
        const settings = typeof requestData.SettingsJson === 'string' 
          ? JSON.parse(requestData.SettingsJson) 
          : requestData.SettingsJson;

        if (!Array.isArray(settings)) {
          errors.push('SettingsJson must be a JSON array of setting objects');
        } else if (settings.length === 0) {
          errors.push('SettingsJson cannot be empty');
        } else {
          // Validate each setting object
          settings.forEach((setting, idx) => {
            if (!setting.SettingKey) {
              errors.push(`Setting[${idx}]: SettingKey is required`);
            }
            if (!setting.SettingValue) {
              errors.push(`Setting[${idx}]: SettingValue is required`);
            }
            if (!setting.ValueType) {
              errors.push(`Setting[${idx}]: ValueType is required`);
            }
          });
        }
      } catch (parseError) {
        errors.push(`SettingsJson is not valid JSON: ${parseError.message}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Save theme settings with fallback
   */
  async function saveThemeSettingsWithFallback(requestData) {
    console.log('🎨 [THEME SAVE] Starting save process via ThemeConfigurationController...');
    
    // Validate request first
    const validation = validateThemeSaveRequest(requestData);
    if (!validation.valid) {
      console.error('❌ [VALIDATION ERROR] Request data validation failed:', validation.errors);
      validation.errors.forEach(err => console.error('  ❌', err));
      return {
        success: false,
        message: 'Request validation failed',
        errors: validation.errors,
        method: 'validation'
      };
    }

    console.log('✅ [VALIDATION] Request data is valid');
    console.log('📊 Request data:', {
      ScopeType: requestData.ScopeType,
      ScopeRefID: requestData.ScopeRefID,
      ThemeName: requestData.ThemeName,
      OperatorID: requestData.OperatorID,
      SettingsCount: (JSON.parse(requestData.SettingsJson) || []).length
    });

    try {
      // Try primary method: View Controller API via ThemeConfigurationController
      if (window.ThemeConfigurationController && typeof window.ThemeConfigurationController.saveThemeSettings === 'function') {
        console.log('💾 Attempting theme save via ThemeConfigurationController (invokes API through view controller)...');
        
        try {
          const response = await window.ThemeConfigurationController.saveThemeSettings(requestData);
          
          console.log('📦 API response received:', {
            Success: response?.Success,
            Message: response?.Message,
            ErrorMessage: response?.ErrorMessage,
            FullResponse: response
          });
          
          if (response && response.Success) {
            console.log('✅ [THEME SAVE SUCCESS] Theme saved via API endpoint');
            return { success: true, response, method: 'api' };
          } else if (response && (response.ErrorMessage || response.Message)) {
            const errorMsg = response.ErrorMessage || response.Message;
            console.warn('⚠️ [THEME SAVE ERROR] API returned error:', errorMsg);
            return { success: false, message: errorMsg, response, method: 'api' };
          } else {
            console.warn('⚠️ [THEME SAVE ERROR] API response invalid:', response);
            return { success: false, message: 'Invalid response from API', response, method: 'api' };
          }
        } catch (apiError) {
          console.error('❌ [API ERROR] Theme configuration API call failed:', {
            Message: apiError.message,
            Stack: apiError.stack,
            Name: apiError.name
          });
          throw apiError;
        }
      } else {
        console.warn('⚠️ ThemeConfigurationController.saveThemeSettings not available');
        throw new Error('ThemeConfigurationController not available');
      }
    } catch (error) {
      console.warn('⚠️ [PRIMARY SAVE FAILED] Falling back to localStorage:', error.message);
      
      // Fallback: Save to localStorage
      try {
        const themePreferences = {
          preset: requestData.ThemeName,
          timestamp: new Date().toISOString(),
          settings: JSON.parse(requestData.SettingsJson),
          savedBy: requestData.OperatorID,
          scope: requestData.ScopeType
        };
        
        const storageKey = `kairo_theme_${requestData.ScopeType}_${requestData.ScopeRefID}`;
        localStorage.setItem(storageKey, JSON.stringify(themePreferences));
        
        console.log('💾 [FALLBACK] Theme saved to localStorage:', storageKey);
        
        // Also save to the legacy key for compatibility
        localStorage.setItem('kairo_theme_preset', JSON.stringify(themePreferences));
        
        return {
          success: false,
          fallback: true,
          message: 'Database save failed - Theme cached locally. Administrator will need to sync settings.',
          method: 'localStorage',
          error: error.message
        };
      } catch (storageError) {
        console.error('❌ [CRITICAL] Even localStorage save failed:', storageError.message);
        return {
          success: false,
          message: `Failed to save theme: ${error.message}`,
          method: 'none',
          primaryError: error.message,
          fallbackError: storageError.message
        };
      }
    }
  }

  /**
   * Apply a preset theme
   */
  async function applyPresetTheme(presetId) {
    const preset = PRESET_THEMES[presetId];
    if (!preset) {
      showMessage('Preset theme not found', 'error');
      return;
    }

    // STEP 1: Apply CSS variables immediately to this iframe (no reload)
    if (!applyTheme(preset.tokens)) {
      showMessage('Failed to apply theme', 'error');
      return;
    }
    
    console.log('✅ Step 1: Theme applied to configuration module');

    // STEP 2: Save to localStorage FIRST so it's available immediately
    try {
      const settings = [];
      Object.entries(preset.tokens).forEach(([cssVar, value]) => {
        const settingKey = cssVarToSettingKey(cssVar);
        settings.push({
          SettingKey: settingKey,
          SettingValue: value,
          ValueType: 'COLOR'
        });
      });

      const themeData = {
        preset: presetId,
        presetName: preset.name,
        timestamp: new Date().toISOString(),
        settings: settings,
        tokens: preset.tokens
      };
      localStorage.setItem('kairo_theme_preset', JSON.stringify(themeData));
      console.log('✅ Step 2: Theme saved to localStorage');
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }

    // STEP 3: Aggressively apply to ALL windows and iframes immediately (including nested)
    const applyToAllFrames = (tokens) => {
      // Try to get parent window's ThemeManager
      const parentWindow = window.parent || window.top;
      
      if (parentWindow && parentWindow !== window && parentWindow.ThemeManager) {
        console.log('🌍 Applying to parent window and all its iframes (including nested)...');
        
        // Apply to parent document
        try {
          parentWindow.ThemeManager.applyThemeToDocument(parentWindow.document, tokens, 'parent-main');
        } catch (e) {
          console.log('Could not apply to parent document:', e.message);
        }
        
        // Recursively find and apply to ALL iframes
        const applyToNestedIframes = (doc, level = 0) => {
          const allIframes = doc.querySelectorAll('iframe');
          console.log(`Found ${allIframes.length} iframes at level ${level}`);
          
          allIframes.forEach((iframe, idx) => {
            try {
              const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
              if (iframeDoc) {
                const iframeSrc = iframe.src || iframe.id || `iframe-${idx}`;
                console.log(`📺 Forcing theme on: ${iframeSrc} (level ${level})`);
                
                // Apply theme
                parentWindow.ThemeManager.applyThemeToDocument(iframeDoc, tokens, iframeSrc);
                
                // Force immediate repaint
                try {
                  const root = iframeDoc.documentElement;
                  root.style.display = 'none';
                  void root.offsetHeight;
                  root.style.display = '';
                } catch (e) {}
                
                // Recursively apply to nested iframes
                applyToNestedIframes(iframeDoc, level + 1);
              }
            } catch (e) {
              console.log(`Cannot access iframe ${idx}:`, e.message);
            }
          });
        };

        applyToNestedIframes(parentWindow.document, 0);
        
        // Re-apply after 100ms to catch any CSS that loaded
        setTimeout(() => {
          applyToNestedIframes(parentWindow.document, 0);
        }, 100);
        
        // Final application after 500ms
        setTimeout(() => {
          applyToNestedIframes(parentWindow.document, 0);
        }, 500);
      }
    };

    applyToAllFrames(preset.tokens);

    // Update UI color inputs to reflect the preset
    updateColorInputsFromTheme(preset.tokens);

    // Refresh theme cards to show Applied state
    const activeTab = document.querySelector('.theme-filter-tab.active');
    renderPresetThemes(activeTab ? activeTab.dataset.filter : 'all');

    // STEP 4: Save to database in background
    try {
      const settings = [];
      
      Object.entries(preset.tokens).forEach(([cssVar, value]) => {
        const settingKey = cssVarToSettingKey(cssVar);
        settings.push({
          SettingKey: settingKey,
          SettingValue: value,
          ValueType: 'COLOR'
        });
      });

      const requestData = {
        ScopeType: 'SYSTEM',
        ScopeRefID: 0,
        ThemeName: preset.name,
        SettingsJson: JSON.stringify(settings),
        OperatorID: sessionStorage.getItem('UserId') || 0
      };

      console.log('🎨 [PRESET THEME] Attempting to save preset theme:', preset.name);
      const saveResult = await saveThemeSettingsWithFallback(requestData);

      if (saveResult.success) {
        console.log('✅ [PRESET SAVE] Database save successful');
        showMessage(`✅ Theme "${preset.name}" applied and saved to database`, 'success');
      } else if (saveResult.fallback) {
        console.log('⚠️ [PRESET SAVE] Database save failed, using fallback');
        showMessage(`⚠️ Theme "${preset.name}" applied. Save to database failed - theme cached locally. Please contact administrator.`, 'warning');
      } else {
        console.error('❌ [PRESET SAVE] Complete failure:', saveResult);
        showMessage(`✅ Theme "${preset.name}" applied visually. However, database save failed: ${saveResult.message}`, 'warning');
      }
    } catch (error) {
      console.error('❌ Error saving preset theme:', error);
      showMessage(`✅ Theme "${preset.name}" applied visually. (Database save error: ${error.message})`, 'success');
    }
  }

  /**
   * Convert CSS variable name to setting key
   */
  function cssVarToSettingKey(cssVar) {
    const mapping = {
      '--color-header': 'Color.Header',
      '--color-primary': 'Color.Primary',
      '--color-border': 'Color.Border',
      '--color-text': 'Color.Text',
      '--color-label-mandatory': 'Color.LabelMandatory',
      '--color-label-conditional': 'Color.LabelConditional',
      '--color-label-optional': 'Color.LabelOptional'
    };
    
    return mapping[cssVar] || cssVar;
  }

  /**
   * Update color input values from theme tokens
   */
  function updateColorInputsFromTheme(tokens) {
    colorInputs.forEach(input => {
      const cssVar = input.dataset.cssVar;
      if (tokens[cssVar]) {
        input.value = tokens[cssVar];
        
        // Update display value
        const displayInput = document.getElementById('value' + input.dataset.themeColor.charAt(0).toUpperCase() + input.dataset.themeColor.slice(1));
        if (displayInput) {
          displayInput.value = tokens[cssVar];
        }
      }
    });
  }

  // ==================== SAVE THEME ====================

  /**
   * Save theme settings to database
   */
  async function saveThemeSettings() {
    try {
      const settings = [];
      
      colorInputs.forEach(input => {
        const colorName = input.dataset.themeColor;
        const cssVar = input.dataset.cssVar;
        const hexColor = toHex(input.value);
        
        const settingKey = mapColorNameToSettingKey(colorName);
        settings.push({
          SettingKey: settingKey,
          SettingValue: hexColor,
          ValueType: 'COLOR'
        });
      });

      if (!window.ThemeConfigurationController || typeof window.ThemeConfigurationController.saveThemeSettings !== 'function') {
        showMessage('Error: Theme configuration service not available', 'error');
        return;
      }

      const response = await window.ThemeConfigurationController.saveThemeSettings({
        ScopeType: 'USER',
        ScopeRefID: sessionStorage.getItem('UserId') || 0,
        ThemeName: 'Custom Theme',
        SettingsJson: JSON.stringify(settings),
        OperatorID: sessionStorage.getItem('UserId') || 0
      });

      if (response && response.Success) {
        showMessage('Theme settings saved successfully', 'success');
      } else {
        const errorMsg = response ? (response.Message || 'Failed to save theme settings') : 'Unknown error';
        showMessage(errorMsg, 'error');
      }
    } catch (error) {
      console.error('Error saving theme:', error);
      showMessage('Error saving theme: ' + error.message, 'error');
    }
  }

  /**
   * Map color name to database setting key
   */
  function mapColorNameToSettingKey(colorName) {
    const mapping = {
      'headerColor': 'Color.Header',
      'primaryColor': 'Color.Primary',
      'borderColor': 'Color.Border',
      'textColor': 'Color.Text',
      'mandatoryColor': 'Color.LabelMandatory',
      'conditionalColor': 'Color.LabelConditional',
      'optionalColor': 'Color.LabelOptional'
    };
    
    return mapping[colorName] || colorName;
  }

  // ==================== EVENT HANDLERS ====================

  function setupEventHandlers() {
    if (cancelBtn) {
      cancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.history.back();
      });
    }

    if (applyBtn) {
      applyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        saveThemeSettings();
      });
    }
  }

  // ==================== INITIALIZATION ====================

  function init() {
    console.log('=== Theme Configuration Init ===');
    console.log('Found color inputs:', colorInputs.length);
    console.log('Found section buttons:', sectionButtons.length);
    console.log('Found sections:', sections.length);
    
    // Setup UI interactions immediately
    setupSectionNavigation();
    setupColorInputs();
    setupEventHandlers();
    setupThemeFilters();
    renderPresetThemes('all');
    
    // Show preset themes section by default
    const presetsSection = document.querySelector('.theme-config-section[data-section="presets"]');
    if (presetsSection) {
      presetsSection.style.display = 'block';
      presetsSection.classList.add('active');
    }
    
    // Activate preset themes button
    const presetsBtn = document.querySelector('[data-section="presets"].btn-action');
    if (presetsBtn) {
      presetsBtn.classList.add('active');
    }
    
    console.log('UI handlers setup complete\n');
    
    // Load colors AFTER ensuring CSS is painted
    // requestAnimationFrame ensures browser has painted
    // then setTimeout gives final assurance
    requestAnimationFrame(() => {
      setTimeout(() => {
        loadColorsFromUI();
      }, 25);
    });
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

