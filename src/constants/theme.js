const baseTheme = {
  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 20,
    pill: 999,
  },
  typography: {
    h1: 34,
    h2: 24,
    h3: 18,
    body: 15,
    caption: 13,
  },
  shadow: {
    card: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.22,
      shadowRadius: 20,
      elevation: 8,
    },
  },
};

const lightColors = {
  background: "#F2F5FF",
  surface: "#FFFFFF",
  surfaceElevated: "#F8FAFF",
  surfaceSoft: "#EEF3FF",
  border: "#D9E2F5",
  primary: "#2563EB",
  primaryStrong: "#1D4ED8",
  accent: "#06B6D4",
  textPrimary: "#0F172A",
  textSecondary: "#334155",
  textMuted: "#64748B",
  success: "#16A34A",
  danger: "#DC2626",
  badgeBackground: "rgba(37,99,235,0.12)",
  tabBackground: "#FFFFFF",
};

const darkColors = {
  background: "#050816",
  surface: "#0F172A",
  surfaceElevated: "#111B34",
  surfaceSoft: "#1A2645",
  border: "#22325F",
  primary: "#5EEAD4",
  primaryStrong: "#2DD4BF",
  accent: "#60A5FA",
  textPrimary: "#F8FAFC",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  success: "#22C55E",
  danger: "#EF4444",
  badgeBackground: "rgba(45,212,191,0.14)",
  tabBackground: "#091327",
};

const lightGradients = {
  background: ["#F5F8FF", "#EEF3FF", "#EAF1FF"],
  card: ["#FFFFFF", "#F5F8FF"],
  primary: ["#2563EB", "#06B6D4"],
};

const darkGradients = {
  background: ["#040712", "#0A0F1F", "#0B1430"],
  card: ["#0E1A33", "#111E3B"],
  primary: ["#2DD4BF", "#60A5FA"],
};

export const getTheme = (mode = "light") => {
  const isDark = mode === "dark";
  const colors = isDark ? darkColors : lightColors;
  return {
    ...baseTheme,
    mode,
    isDark,
    colors,
    gradients: isDark ? darkGradients : lightGradients,
  };
};
