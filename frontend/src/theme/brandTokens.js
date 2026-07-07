/**
 * Tokens de identidade visual — ponto único para futura troca de logo e paleta.
 * Valores temporários neutros/modernos; whitelabel da API sobrescreve primary em App.js.
 */
export const brandTokens = {
  primaryLight: "#2563EB",
  primaryDark: "#60A5FA",
  logo: {
    light: "/vector/logo.svg",
    dark: "/vector/logo-dark.svg",
    favicon: "/vector/favicon.svg"
  },
  neutral: {
    backgroundLight: "#F8FAFC",
    backgroundDark: "#0F172A",
    paperLight: "#FFFFFF",
    paperDark: "#1E293B",
    borderLight: "#E2E8F0",
    borderDark: "#334155",
    textSecondaryLight: "#64748B",
    textSecondaryDark: "#94A3B8"
  },
  shape: {
    borderRadius: 10,
    borderRadiusSm: 8,
    borderRadiusLg: 12
  },
  elevation: {
    card: "0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.06)",
    drawer: "2px 0 8px rgba(15, 23, 42, 0.06)"
  }
};

export default brandTokens;
