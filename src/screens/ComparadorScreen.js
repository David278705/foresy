import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { createGlobalStyles } from "../constants/globalStyles";
import { useTheme } from "../context/ThemeContext";
import FloatingBackground from "../components/FloatingBackground";

const ComparadorScreen = () => {
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
          <Text style={globalStyles.pageTitle}>Comparador</Text>
          <Text style={globalStyles.pageSubtitle}>
            Contrasta alternativas con criterios financieros y escenarios
            proyectados.
          </Text>
        </View>

        <View style={[globalStyles.glassCard, styles.card]}>
          <Text style={globalStyles.sectionTitle}>
            ⚖️ Comparaciones Típicas
          </Text>
          <Text style={styles.cardText}>• Trabajo actual vs nueva oferta</Text>
          <Text style={styles.cardText}>• Arriendo opción 1 vs opción 2</Text>
          <Text style={styles.cardText}>• Comprar vs alquilar</Text>
          <Text style={styles.cardText}>
            • Carro propio vs transporte público
          </Text>
        </View>

        <View style={[globalStyles.glassCard, styles.card]}>
          <Text style={globalStyles.sectionTitle}>📊 Análisis Comparativo</Text>
          <Text style={styles.placeholder}>
            Próximamente: herramienta de comparación con métricas y score de
            decisión.
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

export default ComparadorScreen;
