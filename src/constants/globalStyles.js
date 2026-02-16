import { StyleSheet } from "react-native";

export const createGlobalStyles = (theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    contentContainer: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xl,
    },
    pageHeader: {
      paddingTop: theme.spacing.xl + 14,
      paddingBottom: theme.spacing.lg,
    },
    pageTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.h1,
      fontWeight: "800",
      letterSpacing: 0.2,
    },
    pageSubtitle: {
      marginTop: theme.spacing.sm,
      color: theme.colors.textSecondary,
      fontSize: theme.typography.body,
      lineHeight: 22,
    },
    glassCard: {
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.card,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.h3,
      fontWeight: "700",
      marginBottom: theme.spacing.md,
    },
    input: {
      backgroundColor: theme.colors.surfaceSoft,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      color: theme.colors.textPrimary,
      paddingHorizontal: 14,
      paddingVertical: 14,
      fontSize: theme.typography.body,
    },
    primaryButton: {
      borderRadius: theme.radius.md,
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryButtonText: {
      color: "#FFFFFF",
      fontSize: theme.typography.body,
      fontWeight: "800",
    },
  });
