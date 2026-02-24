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
      const accountService = window.AccountService || window.accountservice || 
        (window.parent && (window.parent.AccountService || window.parent.accountservice));
      
      if (!accountService || typeof accountService.getEffectiveTheme !== "function") {
        console.log("ℹ️ AccountService.getEffectiveTheme not available");
        return;
      }

      // Get user/branch/bank IDs from sessionStorage (fallback to empty string)
      const userId = sessionStorage.getItem('UserId') || "";
      const branchId = sessionStorage.getItem('BranchId') || "";
      const bankId = sessionStorage.getItem('BankId') || "";

      console.log("🎨 [THEME.JS] Loading effective theme from database...", { userId, branchId, bankId });

      const themeRequestData = {
        UserID: userId,
        BranchID: branchId,
        BankID: bankId
      };
      
      const response = await accountService.getEffectiveTheme(themeRequestData);
      
      if (response && response.Data) {
        // Support both single object and array (first row)
        const rawData = response.Data;
        const themeData = Array.isArray(rawData) && rawData.length > 0 ? rawData[0] : rawData;
        
        // If SettingsJson exists, parse and apply it
        if (themeData.SettingsJson) {
          try {
            const themSettings = typeof themeData.SettingsJson === "string" 
              ? JSON.parse(themeData.SettingsJson) 
              : themeData.SettingsJson;
            
            api.setThemeModel(themSettings);
            console.log("✅ [THEME.JS] Effective theme loaded from database:", themSettings);
          } catch (parseError) {
            console.error("❌ [THEME.JS] Error parsing theme settings JSON:", parseError);
          }
        } else {
          console.log("ℹ️ [THEME.JS] No SettingsJson in theme data");
        }
      } else {
        console.log("ℹ️ [THEME.JS] No theme data in response");
      }
    } catch (error) {
      console.error("❌ [THEME.JS] Error loading effective theme:", error);
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
