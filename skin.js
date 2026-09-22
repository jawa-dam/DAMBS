
  const STORAGE_KEY = "gei-academy-skin-v1";
  const GEI_LOGO_URL = "https://assets.zyrosite.com/YZ9jg46Bljs5wOZR/gei-logo-gwP3315oRt91xpE8.png";
  const SKINS = [
    // V2: GEI Hydraulic is the dark instrument identity and the new default.
    { id: "gei-hydraulic", label: "GEI Hydraulic", className: "skin-gei-hydraulic" },
    { id: "academic", label: "Academic", className: "skin-academic" },
    { id: "pink", label: "Hot Pink", className: "skin-pink" },
    { id: "blue", label: "Blue", className: "skin-blue" },
  ];

  const PALETTES = {
    "gei-hydraulic": { bg: "#06070d", surface: "#0a0d16", soft: "#0f1420", text: "#eaf2ff", muted: "#8fa2bd", accent: "#2fd2ff" },
    academic: { bg: "#f7f9fc", surface: "#ffffff", soft: "#f1f4f8", text: "#102a43", muted: "#526b82", accent: "#2fd2ff" },
    pink: { bg: "#fff0f7", surface: "#ffffff", soft: "#ffe5f1", text: "#3b1028", muted: "#70485f", accent: "#ff1493" },
    blue: { bg: "#edf3ff", surface: "#ffffff", soft: "#dbe7ff", text: "#10254d", muted: "#4d6487", accent: "#0057ff" },
    dark: { bg: "#05060a", surface: "#0b0e18", soft: "#111522", text: "#f6f8ff", muted: "#aeb8cb", accent: "#aeb8cb" }
  };

  const state = { active: "academic", initialized: false };
  const state = { active: "gei-hydraulic", initialized: false };

  function readSavedSkin() {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      return SKINS.some((skin) => skin.id === saved) ? saved : "academic";
      return SKINS.some((skin) => skin.id === saved) ? saved : "gei-hydraulic";
    } catch {
      return "academic";
    }
  }

  function applyPalette(id) {
    const palette = PALETTES[id] || PALETTES.academic;
    const palette = PALETTES[id] || PALETTES["gei-hydraulic"];
    Object.entries(palette).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--skin-${key}`, value);
    });

    host.querySelectorAll("[data-skin-option]").forEach((button) => {
      button.addEventListener("click", () => {
        applySkin(button.dataset.skinOption || "academic");
        applySkin(button.dataset.skinOption || "gei-hydraulic");
        closePanel(panel, trigger);
      });
    });
