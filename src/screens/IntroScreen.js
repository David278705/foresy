import React, { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { createGlobalStyles } from "../constants/globalStyles";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import FloatingBackground from "../components/FloatingBackground";

const INTRO_STEPS = [
  {
    id: 1,
    title: "Conoce a milo",
    text: "Tu asistente te acompaña para convertir decisiones financieras complejas en acciones claras y medibles.",
    image: require("../../assets/milo/1.webp"),
  },
  {
    id: 2,
    title: "Pregunta en lenguaje natural",
    text: "Escribe como hablas. milo entiende tu contexto y te responde con pasos claros y accionables.",
    image: require("../../assets/milo/2.webp"),
  },
  {
    id: 3,
    title: "Avanza con claridad",
    text: "Recibe recomendaciones rápidas para decidir mejor en tu día a día financiero, todo desde el chat.",
    image: require("../../assets/milo/3.webp"),
  },
];

const IntroScreen = () => {
  const { theme } = useTheme();
  const globalStyles = createGlobalStyles(theme);
  const styles = createStyles(theme);
  const { markIntroSeen } = useAuth();

  const [stepIndex, setStepIndex] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  const currentStep = INTRO_STEPS[stepIndex];

  const cursorOpacity = useSharedValue(1);
  const mascotPopScale = useSharedValue(0.86);

  useEffect(() => {
    cursorOpacity.value = withRepeat(
      withSequence(
        withTiming(0.2, { duration: 420 }),
        withTiming(1, { duration: 420 }),
      ),
      -1,
      false,
    );
  }, [cursorOpacity]);

  useEffect(() => {
    mascotPopScale.value = 0.86;
    mascotPopScale.value = withSpring(1, {
      damping: 18,
      stiffness: 220,
      mass: 0.72,
    });
  }, [stepIndex, mascotPopScale]);

  useEffect(() => {
    const fullText = currentStep.text;
    let index = 0;
    setTypedText("");
    setIsTyping(true);

    const interval = setInterval(() => {
      index += 1;
      setTypedText(fullText.slice(0, index));
      if (index >= fullText.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 16);

    return () => clearInterval(interval);
  }, [currentStep]);

  const cursorStyle = useAnimatedStyle(() => ({
    opacity: cursorOpacity.value,
  }));

  const mascotPopStyle = useAnimatedStyle(() => ({
    transform: [{ scale: mascotPopScale.value }],
  }));

  const progress = useMemo(
    () => ((stepIndex + 1) / INTRO_STEPS.length) * 100,
    [stepIndex],
  );

  const handleNext = () => {
    if (stepIndex < INTRO_STEPS.length - 1) {
      setStepIndex((current) => current + 1);
      return;
    }

    markIntroSeen();
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      setStepIndex((current) => current - 1);
    }
  };

  return (
    <LinearGradient
      colors={theme.gradients.background}
      style={globalStyles.screen}
    >
      <FloatingBackground />

      <View style={styles.container}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={markIntroSeen} style={styles.skipButton}>
            <Text style={styles.skipText}>Saltar</Text>
          </TouchableOpacity>
          <Text style={styles.stepTag}>
            Paso {stepIndex + 1} de {INTRO_STEPS.length}
          </Text>
        </View>

        <View style={[globalStyles.glassCard, styles.heroCard]}>
          <Animated.View
            key={currentStep.id}
            entering={FadeIn.duration(180).easing(Easing.out(Easing.cubic))}
            exiting={FadeOut.duration(140).easing(Easing.in(Easing.cubic))}
            style={styles.mascotTransitionWrap}
          >
            <Animated.View style={[styles.mascotWrap, mascotPopStyle]}>
              <Image
                source={currentStep.image}
                style={styles.mascot}
                resizeMode="contain"
              />
            </Animated.View>
          </Animated.View>

          <Animated.View
            key={`text-${currentStep.id}`}
            entering={FadeIn.duration(220)}
            exiting={FadeOut.duration(160)}
            style={styles.textTransitionWrap}
          >
            <Text style={styles.title}>{currentStep.title}</Text>
            <Text style={styles.bodyText}>
              {typedText}
              {isTyping ? (
                <Animated.Text style={[styles.cursor, cursorStyle]}>
                  ▋
                </Animated.Text>
              ) : null}
            </Text>
          </Animated.View>
        </View>

        <View style={styles.bottomSection}>
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
          </View>
          <View style={styles.footerActions}>
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                stepIndex === 0 && styles.disabledButton,
              ]}
              onPress={handleBack}
              disabled={stepIndex === 0}
            >
              <Ionicons
                name="arrow-back"
                size={16}
                color={theme.colors.textPrimary}
              />
              <Text style={styles.secondaryButtonText}>Anterior</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryButtonWrap}
              onPress={handleNext}
            >
              <View style={[globalStyles.primaryButton, { backgroundColor: theme.colors.primary }]}>
                <Text style={globalStyles.primaryButtonText}>
                  {stepIndex < INTRO_STEPS.length - 1 ? "Siguiente" : "Empezar"}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
};

const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xl + 12,
      paddingBottom: theme.spacing.xl,
      justifyContent: "flex-start",
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: theme.spacing.md,
    },
    skipButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.badgeBackground,
    },
    skipText: {
      color: theme.colors.primary,
      fontWeight: "700",
      fontSize: 13,
    },
    stepTag: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: "600",
    },
    heroCard: {
      height: 500,
      justifyContent: "space-between",
      paddingBottom: theme.spacing.xl,
    },
    mascotTransitionWrap: {
      alignItems: "center",
      justifyContent: "center",
      minHeight: 272,
    },
    textTransitionWrap: {
      minHeight: 168,
      maxHeight: 168,
      justifyContent: "flex-start",
    },
    mascotWrap: {
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
      marginBottom: 8,
    },
    mascot: {
      width: "92%",
      maxWidth: 360,
      height: 260,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 28,
      fontWeight: "800",
      marginBottom: 12,
      letterSpacing: 0.2,
    },
    bodyText: {
      color: theme.colors.textSecondary,
      fontSize: 16,
      lineHeight: 25,
      minHeight: 116,
      maxHeight: 116,
    },
    cursor: {
      color: theme.colors.primary,
      fontSize: 15,
    },
    bottomSection: {
      marginTop: "auto",
    },
    progressWrap: {
      marginTop: theme.spacing.lg,
    },
    progressTrack: {
      width: "100%",
      height: 8,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surfaceSoft,
      overflow: "hidden",
    },
    progressFill: {
      height: 8,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.primary,
    },
    footerActions: {
      marginTop: theme.spacing.lg,
      flexDirection: "row",
      gap: 10,
    },
    secondaryButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      width: 120,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceElevated,
      borderRadius: theme.radius.md,
    },
    secondaryButtonText: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "700",
    },
    disabledButton: {
      opacity: 0.45,
    },
    primaryButtonWrap: {
      flex: 1,
      borderRadius: theme.radius.md,
      overflow: "hidden",
    },
  });

export default IntroScreen;
