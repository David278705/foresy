import React, { useEffect } from "react";
import {
  Image,
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

const ChatEntryCard = ({
  onPress,
  delay,
  description,
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
      <Text style={styles.cardTitle}>Hablar con milo</Text>
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
          <Text style={globalStyles.primaryButtonText}>Ir al chat</Text>
        </LinearGradient>
      </AnimatedTouchableOpacity>
    </Animated.View>
  );
};

const HomeScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const globalStyles = createGlobalStyles(theme);
  const styles = createStyles(theme);
  const { user, financialProfile } = useAuth();

  const welcomeOpacity = useSharedValue(0);
  const welcomeTranslateY = useSharedValue(16);
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
            Tu copiloto financiero conversacional.
          </Text>
        </View>

        <Animated.Text style={[styles.welcome, welcomeAnimatedStyle]}>
          Bienvenido, {user?.email || "Usuario"}
        </Animated.Text>

        <Image
          source={require("../../assets/milo/3.webp")}
          style={styles.heroMascot}
          resizeMode="contain"
        />

        <ChatEntryCard
          description="Conversa con milo para resolver dudas y recibir guía financiera paso a paso."
          onPress={() => navigation.navigate("Chat")}
          delay={120}
          theme={theme}
          globalStyles={globalStyles}
          styles={styles}
        />

        {financialProfile?.profileSummary ? (
          <View style={[globalStyles.glassCard, styles.summaryCard]}>
            <Text style={styles.summaryTitle}>Tu resumen financiero IA</Text>
            <Text style={styles.summaryText}>
              {financialProfile.profileSummary}
            </Text>
          </View>
        ) : null}
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
      marginBottom: theme.spacing.md,
    },
    heroMascot: {
      width: "100%",
      height: 220,
      marginBottom: theme.spacing.md,
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
    summaryCard: {
      marginBottom: theme.spacing.md,
    },
    summaryTitle: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      fontWeight: "800",
      marginBottom: theme.spacing.sm,
    },
    summaryText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 22,
    },
  });

export default HomeScreen;
