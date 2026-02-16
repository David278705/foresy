import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { createGlobalStyles } from "../constants/globalStyles";
import { useTheme } from "../context/ThemeContext";
import FloatingBackground from "../components/FloatingBackground";

const SimulacionesScreen = () => {
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
          <Text style={globalStyles.pageTitle}>Simulaciones</Text>
          <Text style={globalStyles.pageSubtitle}>
            Modela escenarios “what-if” y anticipa impactos antes de actuar.
          </Text>
        </View>

        <View style={[globalStyles.glassCard, styles.card]}>
          <Text style={globalStyles.sectionTitle}>💡 Escenarios Populares</Text>
          <Text style={styles.cardText}>• ¿Qué pasa si cambio de trabajo?</Text>
          <Text style={styles.cardText}>• ¿Qué pasa si me mudo de ciudad?</Text>
          <Text style={styles.cardText}>• ¿Qué pasa si pido un crédito?</Text>
          <Text style={styles.cardText}>• ¿Qué pasa si reduzco gastos?</Text>
        </View>

        <View style={[globalStyles.glassCard, styles.card]}>
          <Text style={globalStyles.sectionTitle}>📈 Motor de Simulación</Text>
          <Text style={styles.placeholder}>
            Próximamente: simulador interactivo con visualizaciones avanzadas.
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
    cardText: {
      fontSize: 15,
      color: theme.colors.textSecondary,
      marginBottom: 12,
      lineHeight: 22,
    },
    placeholder: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 22,
    },
  });

export default SimulacionesScreen;
