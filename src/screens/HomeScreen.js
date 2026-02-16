import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useAuth } from "../context/AuthContext";
import { createGlobalStyles } from "../constants/globalStyles";
import { useTheme } from "../context/ThemeContext";
import FloatingBackground from "../components/FloatingBackground";

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

const ActionCard = ({
  title,
  description,
  buttonLabel,
  onPress,
  delay,
  theme,
  globalStyles,
  styles,
}) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(24);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }),
    );
    translateY.value = withDelay(
      delay,
      withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) }),
    );
  }, [delay, opacity, translateY]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  return (
    <Animated.View
      style={[globalStyles.glassCard, styles.card, cardAnimatedStyle]}
    >
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDescription}>{description}</Text>
      <AnimatedTouchableOpacity
        style={[styles.button, buttonAnimatedStyle]}
        onPress={onPress}
        onPressIn={() => {
          buttonScale.value = withSpring(0.97, { damping: 16, stiffness: 240 });
        }}
        onPressOut={() => {
          buttonScale.value = withSpring(1, { damping: 16, stiffness: 240 });
        }}
      >
        <LinearGradient
          colors={theme.gradients.primary}
          style={globalStyles.primaryButton}
        >
          <Text style={globalStyles.primaryButtonText}>{buttonLabel}</Text>
        </LinearGradient>
      </AnimatedTouchableOpacity>
    </Animated.View>
  );
};

const HomeScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const globalStyles = createGlobalStyles(theme);
  const styles = createStyles(theme);
  const { user, logout } = useAuth();

  const welcomeOpacity = useSharedValue(0);
  const welcomeTranslateY = useSharedValue(16);
  const logoutScale = useSharedValue(1);

  useEffect(() => {
    welcomeOpacity.value = withTiming(1, {
      duration: 240,
      easing: Easing.out(Easing.cubic),
    });
    welcomeTranslateY.value = withTiming(0, {
      duration: 240,
      easing: Easing.out(Easing.cubic),
    });
  }, [welcomeOpacity, welcomeTranslateY]);

  const welcomeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: welcomeOpacity.value,
    transform: [{ translateY: welcomeTranslateY.value }],
  }));

  const logoutAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoutScale.value }],
  }));

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
          <Text style={styles.miniTitle}>DASHBOARD IA</Text>
          <Text style={globalStyles.pageTitle}>Foresy</Text>
          <Text style={globalStyles.pageSubtitle}>
            Visión inteligente de decisiones financieras en tiempo real.
          </Text>
        </View>

        <Animated.Text style={[styles.welcome, welcomeAnimatedStyle]}>
          Bienvenido, {user?.email || "Usuario"}
        </Animated.Text>

        <ActionCard
          title="Tu Estado Base"
          description="Configura ingresos, gastos y metas para que el motor de simulación aprenda tu contexto."
          buttonLabel="Configurar"
          onPress={() => navigation.navigate("EstadoBase")}
          delay={100}
          theme={theme}
          globalStyles={globalStyles}
          styles={styles}
        />

        <ActionCard
          title="Simulaciones"
          description="Proyecta escenarios y compara resultados antes de tomar decisiones importantes."
          buttonLabel="Simular"
          onPress={() => navigation.navigate("Simulaciones")}
          delay={180}
          theme={theme}
          globalStyles={globalStyles}
          styles={styles}
        />

        <ActionCard
          title="Comparador"
          description="Contrasta alternativas A/B/C con enfoque en impacto financiero y riesgo."
          buttonLabel="Comparar"
          onPress={() => navigation.navigate("Comparador")}
          delay={260}
          theme={theme}
          globalStyles={globalStyles}
          styles={styles}
        />

        <AnimatedTouchableOpacity
          style={[styles.logoutButton, logoutAnimatedStyle]}
          onPress={logout}
          onPressIn={() => {
            logoutScale.value = withSpring(0.97, {
              damping: 16,
              stiffness: 240,
            });
          }}
          onPressOut={() => {
            logoutScale.value = withSpring(1, { damping: 16, stiffness: 240 });
          }}
        >
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </AnimatedTouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
};

const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    miniTitle: {
      alignSelf: "flex-start",
      backgroundColor: theme.colors.badgeBackground,
      color: theme.colors.primary,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      fontSize: 11,
      fontWeight: "700",
      marginBottom: theme.spacing.sm,
    },
    welcome: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.lg,
    },
    card: {
      marginBottom: theme.spacing.md,
    },
    cardTitle: {
      fontSize: 21,
      fontWeight: "bold",
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.sm,
    },
    cardDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.md,
      lineHeight: 22,
    },
    button: {
      borderRadius: theme.radius.md,
      overflow: "hidden",
    },
    logoutButton: {
      marginTop: theme.spacing.sm,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceElevated,
      paddingVertical: 14,
      alignItems: "center",
    },
    logoutButtonText: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: "700",
    },
  });

export default HomeScreen;
