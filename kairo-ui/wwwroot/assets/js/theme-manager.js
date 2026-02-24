/**
 * Global Theme Manager
 * Loads and applies saved theme on every page load
 * Should be included in every HTML page <head>
 */

(function() {
  'use strict';

  const THEME_STORAGE_KEY = 'kairo_theme_preset';
  const DEFAULT_THEME_TOKENS = {
    '--color-header': '#4a7c95',
    '--color-primary': '#4a7c95',
    '--color-border': '#e3e9ed',
    '--color-text': '#1e293b',
    '--color-label-default': '#4a7c95',
    '--color-label-mandatory': '#2563eb',
    '--color-label-conditional': '#1e293b',
    '--color-label-optional': '#1e293b',
    '--color-error': '#ef4444',
    '--color-warning': '#f59e0b',
    '--label-font-family': "'Segoe UI', Tahoma, Arial, sans-serif",
    '--label-font-size': '12px',
    '--label-font-weight': '700'
  };

  /** Setting key to CSS variable mapping (used for sync bootstrap and loadSavedTheme) */
  var SETTING_KEY_TO_CSS = {
    'Color.Header': '--color-header',
    'Color.Primary': '--color-primary',
    'Color.Border': '--color-border',
    'Color.Text': '--color-text',
    'Color.LabelDefault': '--color-label-default',
    'Color.LabelMandatory': '--color-label-mandatory',
    'Color.LabelConditional': '--color-label-conditional',
    'Color.LabelOptional': '--color-label-optional',
    'Label.FontFamily': '--label-font-family',
    'Label.FontSize': '--label-font-size',
    'Label.FontWeight': '--label-font-weight',
  };

  /**
   * Get theme tokens from localStorage only (no DOM). Use for sync apply before first paint.
   */
  function getThemeTokensFromStorage() {
    try {
      var raw = typeof localStorage !== 'undefined' && localStorage.getItem(THEME_STORAGE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      var tokens = {};
      if (data.settings && Array.isArray(data.settings)) {
        data.settings.forEach(function(s) {
          var key = s.SettingKey || s.settingKey;
          var value = s.SettingValue || s.settingValue;
          if (key === 'Behaviour.FormRowHover' || key === 'Behaviour.CompactView' || key === 'Enhancement.Glassmorphism') return;
          var cssVar = SETTING_KEY_TO_CSS[key] || (key && String(key).indexOf('--') === 0 ? key : null);
          if (cssVar && value) tokens[cssVar] = value;
        });
      }
      if (data.tokens && typeof data.tokens === 'object') {
        Object.keys(data.tokens).forEach(function(k) {
          if (k.indexOf('--') === 0 && data.tokens[k]) tokens[k] = data.tokens[k];
        });
      }
      if (!tokens['--label-font-family']) tokens['--label-font-family'] = "'Segoe UI', Tahoma, Arial, sans-serif";
      if (!tokens['--label-font-size']) tokens['--label-font-size'] = '12px';
      if (!tokens['--label-font-weight']) tokens['--label-font-weight'] = '700';
      return Object.keys(tokens).length ? tokens : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Apply theme to document root only (no body, no style element). Used before first paint.
   */
  function applyTokensToRoot(root, tokens) {
    if (!root || !tokens) return;
    Object.keys(tokens).forEach(function(k) {
      if (k.indexOf('--') === 0) root.style.setProperty(k, tokens[k], 'important');
    });
  }

  // Apply theme synchronously before first paint so the page never flashes default colors
  (function bootstrapTheme() {
    var root = document.documentElement;
    if (!root) return;
    var tokens = getThemeTokensFromStorage();
    applyTokensToRoot(root, tokens && Object.keys(tokens).length ? tokens : DEFAULT_THEME_TOKENS);
  })();

  /**
   * Apply CSS variables to a document (main or iframe)
   */
  function applyThemeToDocument(doc, tokens, docName = 'main') {
    if (!tokens || typeof tokens !== 'object') {
      return false;
    }

    try {
      const root = doc.documentElement;
      let appliedCount = 0;

      // Apply as inline styles on root - this has highest specificity
      Object.entries(tokens).forEach(([key, value]) => {
        if (key.startsWith('--')) {
          root.style.setProperty(key, value, 'important');
          appliedCount++;
        }
      });
      
      // Note: Glassmorphism class is managed separately via checkbox, not through tokens
      

      // Also inject as a style element with CSS variables in :root
      // This overrides module-level :root definitions
      let styleEl = doc.getElementById('kairo-theme-vars');
      if (!styleEl) {
        styleEl = doc.createElement('style');
        styleEl.id = 'kairo-theme-vars';
        doc.head.appendChild(styleEl);
      }

      // Map our theme colors to common module variables
      // Note: Label colors are NOT mapped to error/warning - they are applied directly
      const moduleColorMappings = {
        '--color-header': ['--theme-primary', '--cm-bg-header', '--cm-primary', '--ktb-bg', '--am-primary'],
        '--color-primary': ['--theme-primary', '--cm-primary', '--kairo-primary-color', '--ktb-bg', '--am-primary'],
        '--color-border': ['--theme-border', '--cm-border'],
        '--color-text': ['--theme-text-main', '--cm-text-main'],
        '--color-error': ['--theme-error'],
        '--color-warning': ['--theme-warning', '--cm-warning'],
        '--color-label-optional': ['--theme-text-secondary', '--cm-text-secondary']
      };

      // Build comprehensive CSS with both original and mapped variables
      let cssVars = ':root {\n';
      
      // Add original variables
      Object.entries(tokens).forEach(([key, value]) => {
        if (key.startsWith('--')) {
          cssVars += `  ${key}: ${value} !important;\n`;
        }
      });

      // Add mapped variables for module compatibility
      Object.entries(moduleColorMappings).forEach(([ourVar, moduleVars]) => {
        if (tokens[ourVar]) {
          // Handle array of module variables
          const varList = Array.isArray(moduleVars) ? moduleVars : [moduleVars];
          varList.forEach(moduleVar => {
            cssVars += `  ${moduleVar}: ${tokens[ourVar]} !important;\n`;
          });
        }
      });

      // Add common fallback variables
      cssVars += `  --kairo-primary-color: ${tokens['--color-primary'] || '#2563eb'} !important;\n`;
      cssVars += `  --de-bg-section: #f8fafc !important;\n`;
      cssVars += `  --theme-bg-main: #f0f2f5 !important;\n`;
      cssVars += `  --theme-bg-card: #ffffff !important;\n`;
      
      // Map title bar and search icon colors to theme
      if (tokens['--color-header']) {
        cssVars += `  --ktb-bg: ${tokens['--color-header']} !important;\n`;
        cssVars += `  --ktb-bg-dark: color-mix(in srgb, ${tokens['--color-header']} 85%, black 15%) !important;\n`;
        cssVars += `  --am-primary: ${tokens['--color-header']} !important;\n`;
        cssVars += `  --am-primary-dark: color-mix(in srgb, ${tokens['--color-header']} 85%, black 15%) !important;\n`;
        
        // Direct styling for headers that need immediate theme application - highest specificity
        cssVars += `  .am-header { background: linear-gradient(180deg, ${tokens['--color-header']} 0%, color-mix(in srgb, ${tokens['--color-header']} 85%, black 15%) 100%) !important; }\n`;
        cssVars += `  .window .am-header, .de-window .am-header, body .am-header, iframe .am-header { background: linear-gradient(180deg, ${tokens['--color-header']} 0%, color-mix(in srgb, ${tokens['--color-header']} 85%, black 15%) 100%) !important; }\n`;
        cssVars += `  .legacy-status-bar { background: linear-gradient(135deg, ${tokens['--color-header']} 0%, color-mix(in srgb, ${tokens['--color-header']} 85%, black 15%) 100%) !important; }\n`;
        cssVars += `  body.copilot-theme[data-page="module-dashboard"] .legacy-status-bar { background: linear-gradient(135deg, ${tokens['--color-header']} 0%, color-mix(in srgb, ${tokens['--color-header']} 85%, black 15%) 100%) !important; }\n`;
        cssVars += `  .modal-header { background: linear-gradient(135deg, ${tokens['--color-header']} 0%, color-mix(in srgb, ${tokens['--color-header']} 85%, black 15%) 100%) !important; color: #ffffff !important; }\n`;
        cssVars += `  .modal-header.bg-primary { background: linear-gradient(135deg, ${tokens['--color-header']} 0%, color-mix(in srgb, ${tokens['--color-header']} 85%, black 15%) 100%) !important; color: #ffffff !important; }\n`;
        cssVars += `  .copilot-theme .modal-header, .legacy-modal .modal-header { background: linear-gradient(135deg, ${tokens['--color-header']} 0%, color-mix(in srgb, ${tokens['--color-header']} 85%, black 15%) 100%) !important; color: #ffffff !important; }\n`;
      } else if (tokens['--color-primary']) {
        cssVars += `  --ktb-bg: ${tokens['--color-primary']} !important;\n`;
        cssVars += `  --ktb-bg-dark: color-mix(in srgb, ${tokens['--color-primary']} 85%, black 15%) !important;\n`;
        cssVars += `  --am-primary: ${tokens['--color-primary']} !important;\n`;
        cssVars += `  --am-primary-dark: color-mix(in srgb, ${tokens['--color-primary']} 85%, black 15%) !important;\n`;
        
        // Direct styling for headers that need immediate theme application - highest specificity
        cssVars += `  .am-header { background: linear-gradient(180deg, ${tokens['--color-primary']} 0%, color-mix(in srgb, ${tokens['--color-primary']} 85%, black 15%) 100%) !important; }\n`;
        cssVars += `  .window .am-header, .de-window .am-header, body .am-header, iframe .am-header { background: linear-gradient(180deg, ${tokens['--color-primary']} 0%, color-mix(in srgb, ${tokens['--color-primary']} 85%, black 15%) 100%) !important; }\n`;
        cssVars += `  .legacy-status-bar { background: linear-gradient(135deg, ${tokens['--color-primary']} 0%, color-mix(in srgb, ${tokens['--color-primary']} 85%, black 15%) 100%) !important; }\n`;
        cssVars += `  body.copilot-theme[data-page="module-dashboard"] .legacy-status-bar { background: linear-gradient(135deg, ${tokens['--color-primary']} 0%, color-mix(in srgb, ${tokens['--color-primary']} 85%, black 15%) 100%) !important; }\n`;
        cssVars += `  .modal-header { background: linear-gradient(135deg, ${tokens['--color-primary']} 0%, color-mix(in srgb, ${tokens['--color-primary']} 85%, black 15%) 100%) !important; color: #ffffff !important; }\n`;
        cssVars += `  .modal-header.bg-primary { background: linear-gradient(135deg, ${tokens['--color-primary']} 0%, color-mix(in srgb, ${tokens['--color-primary']} 85%, black 15%) 100%) !important; color: #ffffff !important; }\n`;
        cssVars += `  .copilot-theme .modal-header, .legacy-modal .modal-header { background: linear-gradient(135deg, ${tokens['--color-primary']} 0%, color-mix(in srgb, ${tokens['--color-primary']} 85%, black 15%) 100%) !important; color: #ffffff !important; }\n`;
      }
      
      cssVars += `}\n`;
      
      // Add explicit label color rules with high specificity to ensure they override module CSS
      // These are outside :root so they can target specific classes
      if (tokens['--color-label-default'] || tokens['--color-label-mandatory'] || tokens['--color-label-conditional'] || tokens['--color-label-optional']) {
        cssVars += `\n/* Label color overrides - highest specificity */\n`;
        /* Default/general labels – "Labels" in theme config */
        if (tokens['--color-label-default']) {
          cssVars += `.form-label, .label-default-preview, label span:not(.required):not([class*="required"]):not(.bts-info-btn):not([class*="info"]) { color: ${tokens['--color-label-default']} !important; }\n`;
        }
        /* .label-blue = mandatory labels (including span elements) */
        if (tokens['--color-label-mandatory']) {
          cssVars += `.label-blue, [class*="label--blue"], span.label-blue, span[class*="label--blue"] { color: ${tokens['--color-label-mandatory']} !important; }\n`;
          cssVars += `.label-blue span:not(.required):not([class*="required"]):not(.bts-info-btn):not([class*="info"]), [class*="label--blue"] span:not(.required):not([class*="required"]):not(.bts-info-btn):not([class*="info"]) { color: ${tokens['--color-label-mandatory']} !important; }\n`;
        }
        if (tokens['--color-label-mandatory']) {
          cssVars += `.label-mandatory, [class*="label-mandatory"], span.label-mandatory, span[class*="label-mandatory"] { color: ${tokens['--color-label-mandatory']} !important; }\n`;
          cssVars += `.label-mandatory span:not(.required):not([class*="required"]):not(.bts-info-btn):not([class*="info"]), [class*="label-mandatory"] span:not(.required):not([class*="required"]):not(.bts-info-btn):not([class*="info"]) { color: ${tokens['--color-label-mandatory']} !important; }\n`;
        }
        if (tokens['--color-label-conditional']) {
          cssVars += `.label-conditional, [class*="label-conditional"], .label-orange, span.label-conditional, span[class*="label-conditional"], span.label-orange { color: ${tokens['--color-label-conditional']} !important; }\n`;
          cssVars += `.label-conditional span:not(.required):not([class*="required"]):not(.bts-info-btn):not([class*="info"]), [class*="label-conditional"] span:not(.required):not([class*="required"]):not(.bts-info-btn):not([class*="info"]), .label-orange span:not(.required):not([class*="required"]):not(.bts-info-btn):not([class*="info"]) { color: ${tokens['--color-label-conditional']} !important; }\n`;
        }
        if (tokens['--color-label-optional']) {
          cssVars += `.label-optional, [class*="label-optional"], .label-gray, span.label-optional, span[class*="label-optional"], span.label-gray { color: ${tokens['--color-label-optional']} !important; }\n`;
          cssVars += `.label-optional span:not(.required):not([class*="required"]):not(.bts-info-btn):not([class*="info"]), [class*="label-optional"] span:not(.required):not([class*="required"]):not(.bts-info-btn):not([class*="info"]), .label-gray span:not(.required):not([class*="required"]):not(.bts-info-btn):not([class*="info"]) { color: ${tokens['--color-label-optional']} !important; }\n`;
        }
        /* Nested contexts – label-blue uses mandatory color (including spans) */
        if (tokens['--color-label-mandatory']) {
          cssVars += `.bts-group-grid .behind-scene-item label.label-blue, .bts-group-grid .behind-scene-item label.label-blue span { color: ${tokens['--color-label-mandatory']} !important; }\n`;
          cssVars += `label.label-blue, label.label-blue span, .section-content label.label-blue, .section-content label.label-blue span, .form-content label.label-blue, .form-content label.label-blue span, .form-section label.label-blue, .form-section label.label-blue span { color: ${tokens['--color-label-mandatory']} !important; }\n`;
        }
      }
      
      // Add label typography rules (including .form-label)
      if (tokens['--label-font-family'] || tokens['--label-font-size'] || tokens['--label-font-weight']) {
        cssVars += `\n/* Label typography overrides */\n`;
        const labelProps = [];
        if (tokens['--label-font-family']) labelProps.push(`font-family: ${tokens['--label-font-family']} !important`);
        if (tokens['--label-font-size']) labelProps.push(`font-size: ${tokens['--label-font-size']} !important`);
        if (tokens['--label-font-weight']) labelProps.push(`font-weight: ${tokens['--label-font-weight']} !important`);
        if (labelProps.length > 0) {
          cssVars += `.form-label, .label-blue, .label-mandatory, .label-conditional, .label-optional, [class*="label--blue"], [class*="label-mandatory"], [class*="label-conditional"], [class*="label-optional"], span.label-blue, span.label-mandatory, span.label-conditional, span.label-optional, label span:not(.required):not([class*="required"]):not(.bts-info-btn):not([class*="info"]) { ${labelProps.join('; ')}; }\n`;
        }
      }
      

      styleEl.textContent = cssVars;

      if (appliedCount > 0) {
        console.log(`🎨 Theme applied to ${docName}: ${appliedCount} tokens + mapped variables`);
        
        // Force aggressive repaint on all elements
        try {
          // Trigger reflow on body
          void doc.body.offsetHeight;
          
          // Find all elements that might have color-based styling
          const elementsToRepaint = doc.querySelectorAll('[style*="color"], [class*="color"], [class*="btn"], [class*="header"], [class*="card"], button, input, textarea, select, label, h1, h2, h3, h4, h5, h6, .am-header, .card-header, .btn-primary, .form-control');
          
          elementsToRepaint.forEach(el => {
            // Toggle a style property to force repaint
            const originalOpacity = el.style.opacity;
            el.style.opacity = '0.99';
            void el.offsetHeight; // Force reflow
            el.style.opacity = originalOpacity || '';
          });
          
          console.log(`🔄 Forced repaint on ${elementsToRepaint.length} elements`);
        } catch (e) {
          console.log('Could not force full repaint:', e.message);
        }
      }

      try {
        if (doc.body) {
          const stored = localStorage.getItem(THEME_STORAGE_KEY);
          let formRowHoverEnabled = true;
          let compactViewEnabled = false;
          let glassmorphismEnabled = true; // Default to enabled
          if (stored) {
            const themeData = JSON.parse(stored);
            if (themeData.settings && Array.isArray(themeData.settings)) {
              const sHover = themeData.settings.find(function(x) { return (x.SettingKey || x.settingKey) === 'Behaviour.FormRowHover'; });
              const vHover = sHover ? (sHover.SettingValue || sHover.settingValue) : null;
              formRowHoverEnabled = vHover === undefined || vHover === null || String(vHover).toLowerCase() === 'true';
              const sCompact = themeData.settings.find(function(x) { return (x.SettingKey || x.settingKey) === 'Behaviour.CompactView'; });
              const vCompact = sCompact ? (sCompact.SettingValue || sCompact.settingValue) : null;
              compactViewEnabled = vCompact !== undefined && vCompact !== null && String(vCompact).toLowerCase() === 'true';
              const sGlass = themeData.settings.find(function(x) { return (x.SettingKey || x.settingKey) === 'Enhancement.Glassmorphism'; });
              const vGlass = sGlass ? (sGlass.SettingValue || sGlass.settingValue) : null;
              // Default to true if not explicitly set to false
              glassmorphismEnabled = vGlass === undefined || vGlass === null || String(vGlass).toLowerCase() === 'true';
            }
          }
          doc.body.classList.toggle('form-row-hover-on', formRowHoverEnabled);
          doc.body.classList.toggle('theme-compact-view', compactViewEnabled);
          doc.body.classList.toggle('glass-enabled', glassmorphismEnabled);
        }
      } catch (e) { /* ignore */ }
      
      return appliedCount > 0;
    } catch (error) {
      console.warn(`❌ Error applying theme to ${docName}:`, error);
      return false;
    }
  }

  /**
   * Apply glassmorphism enhancement globally (main document + iframes + nested iframes)
   * @param {boolean} enabled - Whether to enable glassmorphism
   */
  function applyGlassmorphism(enabled) {
    try {
      // Apply to main document
      if (document.body) {
        document.body.classList.toggle('glass-enabled', enabled);
      }
      
      // Apply to all iframes recursively
      const applyToAllIframes = (doc) => {
        const allIframes = doc.querySelectorAll('iframe');
        allIframes.forEach((iframe) => {
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (iframeDoc && iframeDoc !== doc && iframeDoc.body) {
              iframeDoc.body.classList.toggle('glass-enabled', enabled);
              applyToAllIframes(iframeDoc);
            }
          } catch (e) {
            // Cross-origin iframes - expected
          }
        });
      };
      applyToAllIframes(document);
    } catch (e) {
      console.warn('Error applying glassmorphism:', e);
    }
  }

  /**
   * Apply CSS variables globally (main document + iframes + nested iframes)
   */
  function applyThemeGlobally(tokens) {
    if (!tokens || typeof tokens !== 'object') {
      console.warn('Invalid theme tokens, using defaults');
      return false;
    }

    console.log('🎨 Applying theme globally to all documents (including nested)...');
    let totalApplied = 0;

    // Apply to main document
    if (applyThemeToDocument(document, tokens, 'main document')) {
      totalApplied++;
    }

    // Recursively apply to all iframes (including nested ones)
    const applyToAllIframes = (doc, level = 0) => {
      const iframes = doc.querySelectorAll('iframe');
      console.log(`Found ${iframes.length} iframes at level ${level}`);

      iframes.forEach((iframe, index) => {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          
          if (iframeDoc) {
            const iframeName = iframe.id || iframe.src || `iframe-${index}`;
            if (applyThemeToDocument(iframeDoc, tokens, `${iframeName} (level ${level})`)) {
              totalApplied++;
            }
            
            // Recursively apply to nested iframes within this iframe
            applyToAllIframes(iframeDoc, level + 1);
          }
        } catch (error) {
          // Cross-origin iframes will throw - this is expected
          const iframeSrc = iframe.src || 'unknown';
          console.log(`ℹ️ Cannot access iframe (${iframeSrc}) - likely cross-origin`);
        }
      });
    };

    // Start recursive application from main document
    applyToAllIframes(document, 0);

    console.log(`✅ Theme loaded on ${totalApplied} document(s)`);
    return totalApplied > 0;
  }

  /**
   * Load saved theme from storage
   * Combines tokens from settings (DB-derived) and themeData.tokens (e.g. label-only saves)
   */
  function loadSavedTheme() {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored) {
        const themeData = JSON.parse(stored);
        console.log('📦 Found saved theme:', themeData.preset);
        
        let tokens = {};
        
        // Extract tokens from settings array (from DB / preset apply)
        var formRowHoverFound = false;
        var compactViewFound = false;
        var glassmorphismFound = false;
        if (themeData.settings && Array.isArray(themeData.settings)) {
          themeData.settings.forEach(setting => {
            const key = setting.SettingKey || setting.settingKey;
            const value = setting.SettingValue || setting.settingValue;
            if (key === 'Behaviour.FormRowHover') {
              formRowHoverFound = true;
              const enabled = value === undefined || value === null || String(value).toLowerCase() === 'true';
              document.body.classList.toggle('form-row-hover-on', enabled);
            } else if (key === 'Behaviour.CompactView') {
              compactViewFound = true;
              const enabled = value !== undefined && value !== null && String(value).toLowerCase() === 'true';
              document.body.classList.toggle('theme-compact-view', enabled);
            } else if (key === 'Enhancement.Glassmorphism') {
              glassmorphismFound = true;
              // Default to true if not explicitly set to false
              const enabled = value === undefined || value === null || String(value).toLowerCase() === 'true';
              document.body.classList.toggle('glass-enabled', enabled);
            } else {
              const cssVar = settingKeyToCssVar(key);
              if (cssVar && value) tokens[cssVar] = value;
            }
          });
          if (!formRowHoverFound) document.body.classList.add('form-row-hover-on');
          // Default glassmorphism to enabled if not found in settings
          if (!glassmorphismFound) document.body.classList.add('glass-enabled');
        }
        
        // Merge themeData.tokens (e.g. label settings saved separately)
        if (themeData.tokens && typeof themeData.tokens === 'object') {
          tokens = Object.assign({}, tokens, themeData.tokens);
        }
        
        
        // Ensure font settings are included even if not in tokens (use defaults if missing)
        if (!tokens['--label-font-family']) tokens['--label-font-family'] = 'Segoe UI, Tahoma, Arial, sans-serif';
        if (!tokens['--label-font-size']) tokens['--label-font-size'] = '12px';
        if (!tokens['--label-font-weight']) tokens['--label-font-weight'] = '700';
        
        if (Object.keys(tokens).length > 0) {
          return tokens;
        }
      }
    } catch (error) {
      console.warn('Could not load saved theme:', error);
    }

    return null;
  }

  /**
   * Map database setting key to CSS variable
   */
  function settingKeyToCssVar(settingKey) {
    return SETTING_KEY_TO_CSS[settingKey] || (settingKey && String(settingKey).startsWith('--') ? settingKey : null);
  }

  /**
   * Load theme from database and apply it
   */
  async function loadThemeFromDatabase() {
    try {
      // Check if AccountService is available
      const accountService = window.AccountService || window.accountservice || 
        (window.parent && (window.parent.AccountService || window.parent.accountservice));
      
      if (!accountService || typeof accountService.getEffectiveTheme !== 'function') {
        console.log('ℹ️ AccountService.getEffectiveTheme not available, using cached theme');
        return null;
      }

      // Get user/branch/bank IDs from sessionStorage
      const userId = sessionStorage.getItem('UserId') || '';
      const branchId = sessionStorage.getItem('BranchId') || '';
      const bankId = sessionStorage.getItem('BankId') || '';

      console.log('🎨 [THEME LOAD] Fetching effective theme from database...', { userId, branchId, bankId });

      const response = await accountService.getEffectiveTheme({
        UserID: userId,
        BranchID: branchId,
        BankID: bankId
      });

      if (!response || !response.Data) {
        console.log('ℹ️ No theme data from database');
        return null;
      }

      // Support both single object and array (first row)
      const rawData = response.Data;
      const themeData = Array.isArray(rawData) && rawData.length > 0 ? rawData[0] : rawData;

      if (!themeData.SettingsJson) {
        console.log('ℹ️ No SettingsJson in theme data');
        return null;
      }

      // Parse settings
      let settings = [];
      try {
        settings = typeof themeData.SettingsJson === 'string' 
          ? JSON.parse(themeData.SettingsJson) 
          : themeData.SettingsJson;
      } catch (parseError) {
        console.error('❌ Error parsing SettingsJson:', parseError);
        return null;
      }

      if (!Array.isArray(settings) || settings.length === 0) {
        console.log('ℹ️ SettingsJson is empty or not an array');
        return null;
      }

      // Build tokens from settings
      const tokens = {};
      settings.forEach(setting => {
        const key = setting.SettingKey || setting.settingKey;
        const value = setting.SettingValue || setting.settingValue;
        const cssVar = settingKeyToCssVar(key);
        if (cssVar && value) {
          tokens[cssVar] = value;
        }
      });

      // Update localStorage with database theme
      const stored = JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) || '{}');
      stored.settings = settings;
      stored.tokens = Object.assign(stored.tokens || {}, tokens);
      stored.preset = stored.preset || 'original';
      stored.timestamp = new Date().toISOString();
      
      // Store scope if available
      const scope = themeData.ScopeType || themeData.scopeType || themeData.Scope || themeData.scope;
      if (scope) {
        stored.scope = scope;
        try {
          localStorage.setItem('kairo_theme_last_scope', scope);
        } catch (e) {
          console.warn('Could not store scope:', e);
        }
      }
      
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(stored));

      console.log('✅ [THEME LOAD] Theme loaded from database:', Object.keys(tokens).length, 'tokens');
      return tokens;
    } catch (error) {
      console.error('❌ [THEME LOAD] Error loading theme from database:', error);
      return null;
    }
  }

  /**
   * Initialize theme on page load
   */
  async function initTheme() {
    console.log('🎨 Theme Manager initializing...');

    // First try to load from database (this updates localStorage)
    const dbTokens = await loadThemeFromDatabase();
    
    // Then load from localStorage (which may have been updated by database load)
    const savedTokens = loadSavedTheme();
    
    // Use database tokens if available, otherwise use cached tokens, otherwise defaults
    const tokensToApply = dbTokens || savedTokens || DEFAULT_THEME_TOKENS;
    
    if (tokensToApply && Object.keys(tokensToApply).length > 0) {
      applyThemeGlobally(tokensToApply);
      console.log('✅ Theme applied:', Object.keys(tokensToApply).length, 'tokens');
    } else {
      console.log('No theme found, using defaults');
      applyThemeGlobally(DEFAULT_THEME_TOKENS);
    }
  }

  /**
   * Watch for new iframes being added and apply theme to them
   */
  function watchForNewIframes() {
    // Get saved tokens once
    const savedTokens = loadSavedTheme();
    const tokens = (savedTokens && Object.keys(savedTokens).length > 0) 
      ? savedTokens 
      : DEFAULT_THEME_TOKENS;

    // Apply to currently existing iframes
    document.querySelectorAll('iframe').forEach(iframe => {
      attachThemeToIframe(iframe, tokens);
    });

    // Watch for new iframes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            // Check if this node is an iframe
            if (node.tagName === 'IFRAME') {
              console.log('📺 New iframe detected, attaching theme...');
              attachThemeToIframe(node, tokens);
            }
            
            // Recursively check descendants for iframes
            if (node.querySelectorAll && node.querySelectorAll('iframe')) {
              node.querySelectorAll('iframe').forEach((iframe) => {
                attachThemeToIframe(iframe, tokens);
              });
            }
          });
        }
      });
    });

    // Start watching for mutations in the entire document
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log('👁️ Watching for new iframes...');
  }

  /**
   * Setup a continuous theme enforcement for open iframes (including nested)
   */
  function setupContinuousEnforcement() {
    // Re-apply theme every 2 seconds to any open iframes
    // This ensures module CSS loading doesn't override our theme
    setInterval(() => {
      const savedTokens = loadSavedTheme();
      if (!savedTokens) return;

      // Check all iframes recursively
      const checkIframes = (doc, level = 0) => {
        const iframes = doc.querySelectorAll('iframe');
        
        iframes.forEach((iframe, index) => {
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            if (iframeDoc && iframeDoc.readyState === 'complete') {
              // Check if this iframe still has our theme vars
              const root = iframeDoc.documentElement;
              const themeVar = root.style.getPropertyValue('--color-primary');
              
              // If theme is missing or different, re-apply it
              if (!themeVar || themeVar !== savedTokens['--color-primary']) {
                console.log(`🔄 Continuous enforcement (level ${level}): Re-applying theme to iframe ${index}`);
                applyThemeToDocument(iframeDoc, savedTokens, `iframe-${index}-level${level}`);
              }
              
              // Recursively check nested iframes
              checkIframes(iframeDoc, level + 1);
            }
          } catch (e) {
            // Cross-origin or error - skip
          }
        });
      };

      checkIframes(document, 0);
    }, 2000);

    console.log('🔄 Continuous theme enforcement started (every 2s, recursive)');
  }

  /**
   * Attach theme to iframe with onload handler and enforcement
   */
  function attachThemeToIframe(iframe, tokens) {
    const originalOnload = iframe.onload;
    
    // Track if we've already attached
    if (iframe.hasThemeListener) {
      return;
    }
    iframe.hasThemeListener = true;

    iframe.onload = function() {
      // Call original onload if it existed
      if (originalOnload && typeof originalOnload === 'function') {
        originalOnload.call(this);
      }

      // Apply theme immediately on load (0ms) so form never flashes default colors
      try {
        const iframeDoc = this.contentDocument || this.contentWindow.document;
        if (iframeDoc) {
          const iframeName = this.id || this.src || 'iframe';
          applyThemeToDocument(iframeDoc, tokens, iframeName);
          // Re-apply after CSS loads (modules often load CSS dynamically)
          setTimeout(() => applyThemeToDocument(iframeDoc, tokens, iframeName), 300);
          setTimeout(() => applyThemeToDocument(iframeDoc, tokens, iframeName), 800);
        }
      } catch (error) {
        console.log('ℹ️ Cannot apply theme to iframe (cross-origin or not ready)');
      }
    };

    // If iframe is already loaded, apply theme immediately and repeatedly
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      if (iframeDoc) {
        const iframeName = iframe.id || iframe.src || 'iframe';
        console.log(`📺 Iframe already loaded, applying theme: ${iframeName}`);
        applyThemeToDocument(iframeDoc, tokens, iframeName);
        
        // Enforce again after CSS loads
        setTimeout(() => {
          console.log(`🔄 Re-enforcing theme on ${iframeName} after CSS load...`);
          applyThemeToDocument(iframeDoc, tokens, iframeName);
        }, 300);
        
        setTimeout(() => {
          console.log(`🔄 Final theme enforcement on ${iframeName}...`);
          applyThemeToDocument(iframeDoc, tokens, iframeName);
        }, 800);
      }
    } catch (error) {
      // Cross-origin or not ready yet
    }
  }

  // Initialize immediately when DOM is ready
  // Wait for AccountService to be available before loading from database
  let initAttempts = 0;
  const MAX_INIT_ATTEMPTS = 20; // Try for up to 2 seconds (20 * 100ms)
  
  function initializeThemeManager() {
    initAttempts++;
    
    // Check if AccountService is available
    const accountService = window.AccountService || window.accountservice || 
      (window.parent && (window.parent.AccountService || window.parent.accountservice));
    
    // If AccountService not available and we haven't exceeded max attempts, wait and retry
    if (!accountService && initAttempts < MAX_INIT_ATTEMPTS) {
      setTimeout(initializeThemeManager, 100);
      return;
    }
    
    // Initialize theme (will load from database if AccountService is available, otherwise from cache)
    initTheme();
    watchForNewIframes();
    setupContinuousEnforcement();
    
    if (accountService) {
      console.log('✅ Theme Manager initialized with AccountService');
    } else {
      console.log('ℹ️ Theme Manager initialized without AccountService (using cached theme)');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeThemeManager);
  } else {
    // If DOM is already loaded, start initialization
    initializeThemeManager();
  }

  // Export globally for use in other scripts
  window.ThemeManager = {
    applyThemeGlobally,
    applyThemeToDocument,
    loadSavedTheme,
    applyGlassmorphism,
    THEME_STORAGE_KEY
  };
})();
