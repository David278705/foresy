import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { createGlobalStyles } from "../constants/globalStyles";
import { useTheme } from "../context/ThemeContext";
import FloatingBackground from "../components/FloatingBackground";

const EstadoBaseScreen = () => {
  const { theme } = useTheme();
  const globalStyles = createGlobalStyles(theme);
  const styles = createStyles(theme);

  return (
    <LinearGradient
      colors={theme.gradients.background}
      style={globalStyles.screen}
    >
      <FloatingBackground />
      <ScrollView
        style={styles.container}
        contentContainerStyle={globalStyles.contentContainer}
      >
        <View style={globalStyles.pageHeader}>
          <Text style={globalStyles.pageTitle}>Estado Base</Text>
          <Text style={globalStyles.pageSubtitle}>
            Tu perfil financiero inicial para personalizar recomendaciones de
            IA.
          </Text>
        </View>

        <View style={[globalStyles.glassCard, styles.card]}>
          <Text style={globalStyles.sectionTitle}>📊 Ingresos</Text>
          <Text style={styles.placeholder}>
            Próximamente: Configuración de ingresos.
          </Text>
        </View>

        <View style={[globalStyles.glassCard, styles.card]}>
          <Text style={globalStyles.sectionTitle}>💰 Gastos Fijos</Text>
          <Text style={styles.placeholder}>
            Próximamente: Configuración de gastos fijos.
          </Text>
        </View>

        <View style={[globalStyles.glassCard, styles.card]}>
          <Text style={globalStyles.sectionTitle}>🛒 Gastos Variables</Text>
          <Text style={styles.placeholder}>
            Próximamente: Configuración de gastos variables.
          </Text>
        </View>

        <View style={[globalStyles.glassCard, styles.card]}>
          <Text style={globalStyles.sectionTitle}>🎯 Metas</Text>
          <Text style={styles.placeholder}>
            Próximamente: Configuración de metas financieras.
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    card: {
      marginBottom: theme.spacing.md,
    },
    placeholder: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 22,
    },
  });

export default EstadoBaseScreen;
