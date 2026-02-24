(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.KairoThemeCore = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  const HEX_COLOR_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
  const CSS_SIZE_RE = /^\d+(\.\d+)?(px|rem|em|%)$/i;
  const SAFE_IMAGE_REF_RE = /^(|data:image\/[a-z0-9+.-]+;base64,[a-z0-9+/=\s]+|\.\/?assets\/[\w./% -]+|\/assets\/[\w./% -]+)$/i;

  const DEFAULT_THEME_MODEL = Object.freeze({
    // Colors
    // Match the default palette in `assets/css/styles.css` (Copilot/Nimble theme variables)
    primary: "#2563eb",
    primaryHover: "#1d4ed8",
    secondary: "#4f46e5",

    // Semantic action colors (used for buttons/status)
    success: "#27ae60",
    warning: "#f39c12",
    danger: "#e74c3c",
    info: "#3498db",

    text: "#1e293b",
    muted: "#64748b",

    // `styles.css` uses a 2-stop gradient; we model it as 3 stops.
    bgStart: "#f3f4f6",
    bgMid: "#eef2ff",
    bgEnd: "#eef2ff",

    surface: "rgba(255, 255, 255, 0.7)",
    border: "rgba(255, 255, 255, 0.5)",

    // Form backgrounds (Account Maintenance + DataEntry)
    formCanvasBg: "#f4f5f7",
    formSurfaceBg: "#ffffff",
    formActionsBg: "#f5f7fa",

    tableHeadBg: "#f2f6ff",
    tableHeadText: "#1f2a44",

    // Typography
    fontFamily: "Montserrat, sans-serif",
    fontSize: "14px",

    // Dashboard background image (optional)
    // Allowed: empty, data:image/* base64, or relative /assets/* paths.
    dashboardBackgroundImage: "",

    // Label category colors
    // - Mandatory: blue (default)
    // - Conditional mandatory: bold black
    // - Optional: normal black
    labelMandatory: "#4a90e2",
    labelConditionalMandatory: "#000000",
    labelOptional: "#000000",

    // Unified form control tokens (drive bs-* controls)
    // Keep these as hex colors so the Theme Configuration UI can manage them.
    controlBg: "#ffffff",
    controlBorder: "#dde6ed",
    controlText: "#2c3e50",
    controlPlaceholder: "#5a6c7d",
    controlFocus: "#4a90e2",
    controlDisabledBg: "#f2f4f7",
    controlDisabledText: "#5a6c7d",

    // Text color for filled buttons
    onPrimary: "#ffffff",
    onDanger: "#ffffff",

    // Unified control spacing/layout tokens (applied only in unified mode)
    controlPaddingX: "0.5rem",
    controlPaddingY: "0.35rem",
    controlMarginY: "0px",
    controlRadius: "6px",
    controlBorderWidth: "1px",
    focusRingSize: "0.2rem",

    btnPaddingX: "0.6rem",
    btnPaddingY: "0.35rem",
    btnMarginY: "0px",
    btnRadius: "6px",
    btnBorderWidth: "1px"
  });

  const DEFAULT_THEME_PRESETS = Object.freeze({
    nimble: DEFAULT_THEME_MODEL
  });

  function isValidHexColor(value) {
    return typeof value === "string" && HEX_COLOR_RE.test(value.trim());
  }


  function isValidCssSize(value) {
    return typeof value === "string" && CSS_SIZE_RE.test(value.trim());
  }

  function isValidCssString(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function isValidImageRef(value) {
    return typeof value === "string" && SAFE_IMAGE_REF_RE.test(value.trim());
  }

  function cssUrlFromRef(value) {
    const ref = typeof value === "string" ? value.trim() : "";
    if (!ref) return "none";
    if (!isValidImageRef(ref)) return "none";

    // Prevent breaking out of url("...") in CSS.
    const safe = ref
      .replaceAll("\\", "%5C")
      .replaceAll('"', "%22")
      .replaceAll("\n", "")
      .replaceAll("\r", "");

    return `url("${safe}")`;
  }

  function normalizeThemeModel(input, { presetId } = {}) {
    const preset = (presetId && DEFAULT_THEME_PRESETS[presetId]) || DEFAULT_THEME_MODEL;
    const model = Object.assign({}, preset, input || {});

    // Validate / fallback
    model.primary = isValidHexColor(model.primary) ? model.primary : preset.primary;
    model.primaryHover = isValidHexColor(model.primaryHover) ? model.primaryHover : preset.primaryHover;
    model.secondary = isValidHexColor(model.secondary) ? model.secondary : preset.secondary;

    model.success = isValidHexColor(model.success) ? model.success : preset.success;
    model.warning = isValidHexColor(model.warning) ? model.warning : preset.warning;
    model.danger = isValidHexColor(model.danger) ? model.danger : preset.danger;
    model.info = isValidHexColor(model.info) ? model.info : preset.info;

    model.text = isValidHexColor(model.text) ? model.text : preset.text;
    model.muted = isValidHexColor(model.muted) ? model.muted : preset.muted;

    model.bgStart = isValidHexColor(model.bgStart) ? model.bgStart : preset.bgStart;
    model.bgMid = isValidHexColor(model.bgMid) ? model.bgMid : preset.bgMid;
    model.bgEnd = isValidHexColor(model.bgEnd) ? model.bgEnd : preset.bgEnd;

    model.tableHeadBg = isValidCssString(model.tableHeadBg) ? model.tableHeadBg : preset.tableHeadBg;
    model.tableHeadText = isValidHexColor(model.tableHeadText) ? model.tableHeadText : preset.tableHeadText;

    model.surface = isValidCssString(model.surface) ? model.surface : preset.surface;
    model.border = isValidCssString(model.border) ? model.border : preset.border;

    model.formCanvasBg = isValidHexColor(model.formCanvasBg) ? model.formCanvasBg : preset.formCanvasBg;
    model.formSurfaceBg = isValidHexColor(model.formSurfaceBg) ? model.formSurfaceBg : preset.formSurfaceBg;
    model.formActionsBg = isValidHexColor(model.formActionsBg) ? model.formActionsBg : preset.formActionsBg;

    model.fontFamily = isValidCssString(model.fontFamily) ? model.fontFamily : preset.fontFamily;
    model.fontSize = isValidCssSize(model.fontSize) ? model.fontSize : preset.fontSize;

    model.dashboardBackgroundImage = isValidImageRef(model.dashboardBackgroundImage)
      ? model.dashboardBackgroundImage.trim()
      : preset.dashboardBackgroundImage;

    model.labelMandatory = isValidHexColor(model.labelMandatory) ? model.labelMandatory : preset.labelMandatory;
    model.labelConditionalMandatory = isValidHexColor(model.labelConditionalMandatory)
      ? model.labelConditionalMandatory
      : preset.labelConditionalMandatory;
    model.labelOptional = isValidHexColor(model.labelOptional) ? model.labelOptional : preset.labelOptional;

    model.controlBg = isValidHexColor(model.controlBg) ? model.controlBg : preset.controlBg;
    model.controlBorder = isValidHexColor(model.controlBorder) ? model.controlBorder : preset.controlBorder;
    model.controlText = isValidHexColor(model.controlText) ? model.controlText : preset.controlText;
    model.controlPlaceholder = isValidHexColor(model.controlPlaceholder) ? model.controlPlaceholder : preset.controlPlaceholder;
    model.controlFocus = isValidHexColor(model.controlFocus) ? model.controlFocus : preset.controlFocus;
    model.controlDisabledBg = isValidHexColor(model.controlDisabledBg) ? model.controlDisabledBg : preset.controlDisabledBg;
    model.controlDisabledText = isValidHexColor(model.controlDisabledText) ? model.controlDisabledText : preset.controlDisabledText;

    model.onPrimary = isValidHexColor(model.onPrimary) ? model.onPrimary : preset.onPrimary;
    model.onDanger = isValidHexColor(model.onDanger) ? model.onDanger : preset.onDanger;

    model.controlPaddingX = isValidCssSize(model.controlPaddingX) ? model.controlPaddingX : preset.controlPaddingX;
    model.controlPaddingY = isValidCssSize(model.controlPaddingY) ? model.controlPaddingY : preset.controlPaddingY;
    model.controlMarginY = isValidCssSize(model.controlMarginY) ? model.controlMarginY : preset.controlMarginY;
    model.controlRadius = isValidCssSize(model.controlRadius) ? model.controlRadius : preset.controlRadius;
    model.controlBorderWidth = isValidCssSize(model.controlBorderWidth) ? model.controlBorderWidth : preset.controlBorderWidth;
    model.focusRingSize = isValidCssSize(model.focusRingSize) ? model.focusRingSize : preset.focusRingSize;

    model.btnPaddingX = isValidCssSize(model.btnPaddingX) ? model.btnPaddingX : preset.btnPaddingX;
    model.btnPaddingY = isValidCssSize(model.btnPaddingY) ? model.btnPaddingY : preset.btnPaddingY;
    model.btnMarginY = isValidCssSize(model.btnMarginY) ? model.btnMarginY : preset.btnMarginY;
    model.btnRadius = isValidCssSize(model.btnRadius) ? model.btnRadius : preset.btnRadius;
    model.btnBorderWidth = isValidCssSize(model.btnBorderWidth) ? model.btnBorderWidth : preset.btnBorderWidth;

    return model;
  }

  function validateThemeModel(input) {
    const errors = [];
    if (!isValidHexColor(input.primary)) errors.push("primary");
    if (!isValidHexColor(input.primaryHover)) errors.push("primaryHover");
    if (!isValidHexColor(input.secondary)) errors.push("secondary");
    if (!isValidHexColor(input.success)) errors.push("success");
    if (!isValidHexColor(input.warning)) errors.push("warning");
    if (!isValidHexColor(input.danger)) errors.push("danger");
    if (!isValidHexColor(input.info)) errors.push("info");
    if (!isValidHexColor(input.text)) errors.push("text");
    if (!isValidHexColor(input.muted)) errors.push("muted");
    if (!isValidHexColor(input.bgStart)) errors.push("bgStart");
    if (!isValidHexColor(input.bgMid)) errors.push("bgMid");
    if (!isValidHexColor(input.bgEnd)) errors.push("bgEnd");
    if (!isValidCssString(input.surface)) errors.push("surface");
    if (!isValidCssString(input.border)) errors.push("border");

    if (!isValidHexColor(input.formCanvasBg)) errors.push("formCanvasBg");
    if (!isValidHexColor(input.formSurfaceBg)) errors.push("formSurfaceBg");
    if (!isValidHexColor(input.formActionsBg)) errors.push("formActionsBg");
    if (!isValidCssString(input.tableHeadBg)) errors.push("tableHeadBg");
    if (!isValidHexColor(input.tableHeadText)) errors.push("tableHeadText");
    if (!isValidCssString(input.fontFamily)) errors.push("fontFamily");
    if (!isValidCssSize(input.fontSize)) errors.push("fontSize");
    if (!isValidImageRef(input.dashboardBackgroundImage)) errors.push("dashboardBackgroundImage");
    if (!isValidHexColor(input.labelMandatory)) errors.push("labelMandatory");
    if (!isValidHexColor(input.labelConditionalMandatory)) errors.push("labelConditionalMandatory");
    if (!isValidHexColor(input.labelOptional)) errors.push("labelOptional");

    if (!isValidHexColor(input.controlBg)) errors.push("controlBg");
    if (!isValidHexColor(input.controlBorder)) errors.push("controlBorder");
    if (!isValidHexColor(input.controlText)) errors.push("controlText");
    if (!isValidHexColor(input.controlPlaceholder)) errors.push("controlPlaceholder");
    if (!isValidHexColor(input.controlFocus)) errors.push("controlFocus");
    if (!isValidHexColor(input.controlDisabledBg)) errors.push("controlDisabledBg");
    if (!isValidHexColor(input.controlDisabledText)) errors.push("controlDisabledText");

    if (!isValidHexColor(input.onPrimary)) errors.push("onPrimary");
    if (!isValidHexColor(input.onDanger)) errors.push("onDanger");

    if (!isValidCssSize(input.controlPaddingX)) errors.push("controlPaddingX");
    if (!isValidCssSize(input.controlPaddingY)) errors.push("controlPaddingY");
    if (!isValidCssSize(input.controlMarginY)) errors.push("controlMarginY");
    if (!isValidCssSize(input.controlRadius)) errors.push("controlRadius");
    if (!isValidCssSize(input.controlBorderWidth)) errors.push("controlBorderWidth");
    if (!isValidCssSize(input.focusRingSize)) errors.push("focusRingSize");

    if (!isValidCssSize(input.btnPaddingX)) errors.push("btnPaddingX");
    if (!isValidCssSize(input.btnPaddingY)) errors.push("btnPaddingY");
    if (!isValidCssSize(input.btnMarginY)) errors.push("btnMarginY");
    if (!isValidCssSize(input.btnRadius)) errors.push("btnRadius");
    if (!isValidCssSize(input.btnBorderWidth)) errors.push("btnBorderWidth");

    return { ok: errors.length === 0, errors };
  }

  function themeModelToCssVars(model) {
    const bgGradient = `linear-gradient(135deg, ${model.bgStart} 0%, ${model.bgMid} 45%, ${model.bgEnd} 100%)`;

    return {
      // Backward compatible variables already used in `assets/css/styles.css`
      "--copilot-bg-gradient": bgGradient,
      "--copilot-primary": model.primary,
      "--copilot-primary-hover": model.primaryHover,
      "--copilot-secondary": model.secondary,
      "--copilot-card-bg": model.surface,
      "--copilot-card-border": `1px solid ${model.border}`,
      "--copilot-text-main": model.text,
      "--copilot-text-muted": model.muted,

      "--dashboard-primary": model.primary,
      "--dashboard-secondary": model.secondary,
      "--dashboard-card": "var(--copilot-card-bg)",

      // Unified tokens
      "--kairo-border-color": model.border,
      "--kairo-table-head-bg": model.tableHeadBg,
      "--kairo-table-head-text": model.tableHeadText,

      // Form background overrides (used by Account Maintenance + DataEntry)
      "--kairo-form-canvas-bg": model.formCanvasBg,
      "--kairo-form-surface-bg": model.formSurfaceBg,
      "--kairo-form-actions-bg": model.formActionsBg,

      // Semantic tokens
      "--kairo-success": model.success,
      "--kairo-warning": model.warning,
      "--kairo-danger": model.danger,
      "--kairo-info": model.info,

      // Bootstrap token bridge
      "--bs-success": model.success,
      "--bs-warning": model.warning,
      "--bs-danger": model.danger,
      "--bs-info": model.info,

      // Typography vars used by themes
      "--kairo-font-family": model.fontFamily,
      "--kairo-font-size": model.fontSize,

      // Dashboard background image
      "--kairo-dashboard-bg-image": cssUrlFromRef(model.dashboardBackgroundImage),

      // Label category vars
      "--kairo-label-mandatory": model.labelMandatory,
      "--kairo-label-conditional": model.labelConditionalMandatory,
      "--kairo-label-optional": model.labelOptional,

      // Unified bs-* form control vars
      "--kairo-control-bg": model.controlBg,
      "--kairo-control-border": model.controlBorder,
      "--kairo-control-text": model.controlText,
      "--kairo-control-placeholder": model.controlPlaceholder,
      "--kairo-control-focus": model.controlFocus,
      "--kairo-control-disabled-bg": model.controlDisabledBg,
      "--kairo-control-disabled-text": model.controlDisabledText,

      // Button text colors
      "--kairo-on-primary": model.onPrimary,
      "--kairo-on-danger": model.onDanger,

      // Unified spacing/layout vars
      "--kairo-control-padding-x": model.controlPaddingX,
      "--kairo-control-padding-y": model.controlPaddingY,
      "--kairo-control-margin-y": model.controlMarginY,
      "--kairo-control-radius": model.controlRadius,
      "--kairo-control-border-width": model.controlBorderWidth,
      "--kairo-focus-ring-size": model.focusRingSize,

      "--kairo-btn-padding-x": model.btnPaddingX,
      "--kairo-btn-padding-y": model.btnPaddingY,
      "--kairo-btn-margin-y": model.btnMarginY,
      "--kairo-btn-radius": model.btnRadius,
      "--kairo-btn-border-width": model.btnBorderWidth
    };
  }

  function hexToRgb(hex) {
    if (!isValidHexColor(hex)) return null;
    const raw = hex.trim().slice(1);
    if (raw.length === 3) {
      const r = parseInt(raw[0] + raw[0], 16);
      const g = parseInt(raw[1] + raw[1], 16);
      const b = parseInt(raw[2] + raw[2], 16);
      return { r, g, b };
    }
    const r = parseInt(raw.slice(0, 2), 16);
    const g = parseInt(raw.slice(2, 4), 16);
    const b = parseInt(raw.slice(4, 6), 16);
    return { r, g, b };
  }

  function srgbToLinear(channel) {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function relativeLuminance({ r, g, b }) {
    const R = srgbToLinear(r);
    const G = srgbToLinear(g);
    const B = srgbToLinear(b);
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  }

  function contrastRatioHex(foregroundHex, backgroundHex) {
    const fg = hexToRgb(foregroundHex);
    const bg = hexToRgb(backgroundHex);
    if (!fg || !bg) return null;

    const L1 = relativeLuminance(fg);
    const L2 = relativeLuminance(bg);
    const lighter = Math.max(L1, L2);
    const darker = Math.min(L1, L2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  return {
    DEFAULT_THEME_MODEL,
    DEFAULT_THEME_PRESETS,
    normalizeThemeModel,
    validateThemeModel,
    themeModelToCssVars,
    contrastRatioHex
  };
});
