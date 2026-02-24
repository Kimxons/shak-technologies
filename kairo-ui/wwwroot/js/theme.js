(function(root){
  const Core = root.KairoThemeCore;
  const STORAGE_KEY_MODEL = "kairo.theme.model";
  const STORAGE_KEY_UNIFIED = "kairo.theme.unifiedCss";
  const STORAGE_KEY_TYPO = "kairo.theme.typography";

  function dispatch(target, name, detail){
    try {
      const evt = new CustomEvent(name, { detail });
      target.dispatchEvent(evt);
    } catch {}
  }

  function applyCssVars(vars){
    const docEl = document.documentElement;
    Object.entries(vars || {}).forEach(([k,v])=>{
      docEl.style.setProperty(k, v);
    });
  }

  function readJson(key, fallback){
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  }
  function writeJson(key, obj){
    try { localStorage.setItem(key, JSON.stringify(obj)); } catch {}
  }

  const api = {
    DEFAULT_FONT_FAMILY: Core?.DEFAULT_THEME_MODEL?.fontFamily || "Arial, sans-serif",
    DEFAULT_FONT_SIZE: Core?.DEFAULT_THEME_MODEL?.fontSize || "16px",
    DEFAULT_UNIFIED_CSS: true,

    getTypography(){
      const saved = readJson(STORAGE_KEY_TYPO, null);
      if (saved && saved.fontFamily && saved.fontSize) return saved;
      const model = this.getThemeModel();
      return { fontFamily: model.fontFamily, fontSize: model.fontSize };
    },
    setTypography({ fontFamily, fontSize }){
      const model = this.getThemeModel();
      const next = Core?.normalizeThemeModel({
        fontFamily: fontFamily ?? model.fontFamily,
        fontSize: fontSize ?? model.fontSize
      }) || { fontFamily, fontSize };
      writeJson(STORAGE_KEY_TYPO, { fontFamily: next.fontFamily, fontSize: next.fontSize });
      const merged = this.setThemeModel({ fontFamily: next.fontFamily, fontSize: next.fontSize });
      dispatch(window, "kairo-typography-changed", { fontFamily: merged.fontFamily, fontSize: merged.fontSize });
      return merged;
    },

    getUnifiedCssEnabled(){
      const raw = localStorage.getItem(STORAGE_KEY_UNIFIED);
      if (raw === null || raw === undefined) return this.DEFAULT_UNIFIED_CSS;
      return raw === "true";
    },
    setUnifiedCssEnabled(enabled){
      try { localStorage.setItem(STORAGE_KEY_UNIFIED, !!enabled); } catch {}
      dispatch(window, "kairo-unified-css-changed", { enabled: !!enabled });
      return !!enabled;
    },

    getThemeModel(){
      const saved = readJson(STORAGE_KEY_MODEL, null);
      const normalized = Core?.normalizeThemeModel(saved || {}, { presetId: "nimble" }) || (saved || {});
      return normalized;
    },
    setThemeModel(partial){
      const current = this.getThemeModel();
      const next = Core?.normalizeThemeModel({ ...current, ...(partial||{}) }, { presetId: "nimble" }) || { ...current, ...(partial||{}) };
      writeJson(STORAGE_KEY_MODEL, next);
      const vars = Core?.themeModelToCssVars(next) || {};
      applyCssVars(vars);
      dispatch(window, "kairo-theme-model-changed", { model: next });
      return next;
    }
  };

  // Initialize on page load with saved model
  const initial = api.getThemeModel();
  const initialVars = Core?.themeModelToCssVars(initial) || {};
  applyCssVars(initialVars);

  // Load effective theme from database on page load
  async function loadEffectiveThemeOnPageLoad() {
    try {
      const themeService = window.ThemeService || window.themeService ||
        (window.parent && (window.parent.ThemeService || window.parent.themeService));
      
      if (!themeService || typeof themeService.getEffectiveTheme !== "function") {
        return;
      }

      // Get user/branch/bank IDs from sessionStorage; use fallbacks so backend returns USER/BANK theme
      let userId = sessionStorage.getItem('UserId') || sessionStorage.getItem('UserID') || "";
      const branchId = sessionStorage.getItem('BranchId') || sessionStorage.getItem('BranchID') || "";
      let bankId = sessionStorage.getItem('BankId') || sessionStorage.getItem('BankID') || "";
      if (!userId || userId === '0') userId = 'CSADM';
      if (!bankId || bankId === '0') bankId = 'DEFAULT';

      // Note: Procedure doesn't support ScopePreference yet, so we send both UserID and BankID
      const themeRequestData = { UserID: userId, BranchID: branchId, BankID: bankId };

      const response = await themeService.getEffectiveTheme(themeRequestData);
      let rawData = response && (response.Data || response.data || response.Details || response.details);
      if (rawData && typeof rawData === "object" && !Array.isArray(rawData)) {
        var arr = rawData.Details || rawData.details || Object.keys(rawData).map(function (k) { return rawData[k]; }).filter(function (v) { return Array.isArray(v) && v.length > 0; })[0];
        if (arr && arr.length) rawData = arr;
      }
      if (rawData) {
        // Support both single object and array (first row)
        const themeData = Array.isArray(rawData) && rawData.length > 0 ? rawData[0] : rawData;
        
        // If SettingsJson exists, parse and apply it
        if (themeData.SettingsJson) {
          try {
            const themSettings = typeof themeData.SettingsJson === "string" 
              ? JSON.parse(themeData.SettingsJson) 
              : themeData.SettingsJson;
            
            api.setThemeModel(themSettings);
          } catch (parseError) {
            // Silently ignore parse errors
          }
        }
      }
    } catch (error) {
      // Continue with existing theme if load fails
    }
  }

  // Load theme on DOM ready or immediately if already loaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadEffectiveThemeOnPageLoad);
  } else {
    loadEffectiveThemeOnPageLoad();
  }

  root.KairoTheme = api;
})(window);
