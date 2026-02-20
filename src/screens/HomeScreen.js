import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
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
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../services/firebaseConfig";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { createGlobalStyles } from "../constants/globalStyles";
import { subscribeToPlans } from "../services/plansService";
import { generateFinancialInsights } from "../services/openaiInsightsService";
import FloatingBackground from "../components/FloatingBackground";

// ─── Mascot images ───
const MILO_IMAGES = [
  require("../../assets/milo/1.webp"),
  require("../../assets/milo/2.webp"),
  require("../../assets/milo/3.webp"),
];

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

// ─── Fade-in card wrapper ───
const FadeInCard = ({ delay = 0, children, style }) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

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

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[style, animStyle]}>{children}</Animated.View>;
};

// ─── Chat entry card ───
const ChatEntryCard = ({ onPress, delay, theme, globalStyles, styles }) => {
  const buttonScale = useSharedValue(1);
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  return (
    <FadeInCard delay={delay} style={[globalStyles.glassCard, styles.card]}>
      <Text style={styles.cardTitle}>Hablar con milo</Text>
      <Text style={styles.cardDescription}>
        Conversa con milo para resolver dudas y recibir guía financiera paso a
        paso.
      </Text>
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
    </FadeInCard>
  );
};

// ─── Markdown-lite renderer for the summary ───
const MarkdownSummary = ({ text, theme }) => {
  if (!text) return null;
  const lines = text.split("\n").filter((l) => l.trim());

  return (
    <View>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        const isHeader =
          /^[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(trimmed);

        const renderBold = (str) => {
          const parts = str.split(/(\*\*[^*]+\*\*)/g);
          return parts.map((part, j) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return (
                <Text
                  key={j}
                  style={{ fontWeight: "800", color: theme.colors.textPrimary }}
                >
                  {part.slice(2, -2)}
                </Text>
              );
            }
            return <Text key={j}>{part}</Text>;
          });
        };

        if (isHeader) {
          return (
            <Text
              key={i}
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: theme.colors.textPrimary,
                marginTop: i === 0 ? 0 : 10,
                marginBottom: 2,
              }}
            >
              {renderBold(trimmed)}
            </Text>
          );
        }
        return (
          <Text
            key={i}
            style={{
              fontSize: 13,
              color: theme.colors.textSecondary,
              lineHeight: 20,
              marginBottom: 2,
              paddingLeft: 4,
            }}
          >
            {renderBold(trimmed)}
          </Text>
        );
      })}
    </View>
  );
};

// ─── Insight card (strengths / improvements) ───
const InsightCard = ({
  title,
  emoji,
  items,
  miloImage,
  accentColor,
  delay,
  theme,
  globalStyles,
  styles,
}) => {
  if (!items || items.length === 0) return null;

  return (
    <FadeInCard delay={delay} style={[globalStyles.glassCard, styles.card]}>
      <View style={styles.insightHeader}>
        <Image
          source={miloImage}
          style={styles.miloSmall}
          resizeMode="contain"
        />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.insightTitle, { color: accentColor }]}>
            {emoji} {title}
          </Text>
        </View>
      </View>
      {items.map((item, i) => (
        <View key={i} style={styles.insightItem}>
          <View style={[styles.insightDot, { backgroundColor: accentColor }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.insightItemTitle}>{item.title}</Text>
            <Text style={styles.insightItemDetail}>{item.detail}</Text>
          </View>
        </View>
      ))}
    </FadeInCard>
  );
};

// ─── Empty insights placeholder ───
const EmptyInsights = ({ styles }) => (
  <View style={styles.emptyInsights}>
    <Image
      source={MILO_IMAGES[0]}
      style={styles.miloEmpty}
      resizeMode="contain"
    />
    <Text style={styles.emptyTitle}>Aún no hay insights</Text>
    <Text style={styles.emptySubtitle}>
      Habla con milo para que conozca tu situación financiera y genere tu
      análisis personalizado.
    </Text>
  </View>
);

// ════════════════════════════════════════════════
// ─── HOME SCREEN ────────────────────────────────
// ════════════════════════════════════════════════

const HomeScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const globalStyles = createGlobalStyles(theme);
  const styles = createStyles(theme);
  const { user, financialProfile, refreshFinancialProfile } = useAuth();

  const [insights, setInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [plans, setPlans] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // ── Welcome animation ──
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

  // ── Subscribe to plans ──
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToPlans(user.uid, (p) => setPlans(p));
    return unsub;
  }, [user?.uid]);

  // ── Load cached insights from Firestore ──
  const loadCachedInsights = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const snap = await getDoc(doc(db, "financialInsights", user.uid));
      if (snap.exists()) {
        const data = snap.data();
        setInsights({
          summary: data.summary || "",
          strengths: data.strengths || [],
          improvements: data.improvements || [],
        });
      }
    } catch {
      // Silently fail
    }
  }, [user?.uid]);

  // ── Generate fresh insights ──
  const generateInsights = useCallback(async () => {
    if (!user?.uid || !financialProfile?.completed) return;

    setLoadingInsights(true);
    try {
      const result = await generateFinancialInsights({
        profileData: financialProfile.profileData || {},
        profileSummary: financialProfile.profileSummary || "",
        capturedFacts: financialProfile.capturedFacts || [],
        plans,
      });

      setInsights(result);

      // Cache in Firestore
      await setDoc(
        doc(db, "financialInsights", user.uid),
        { ...result, updatedAt: serverTimestamp() },
        { merge: true },
      );

      // Mark insights as fresh
      await setDoc(
        doc(db, "financialProfiles", user.uid),
        { insightsStale: false },
        { merge: true },
      );
    } catch (err) {
      console.warn("Error generating insights:", err);
    } finally {
      setLoadingInsights(false);
    }
    // Only depend on uid and plans — financialProfile is read via ref pattern
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // ── On mount: load cached, then check if stale ──
  useEffect(() => {
    loadCachedInsights();
  }, [loadCachedInsights]);

  // Track insightsStale as a primitive to avoid re-running on every profile change
  const insightsStale = financialProfile?.insightsStale;
  const profileCompleted = financialProfile?.completed;

  useEffect(() => {
    if (!profileCompleted) return;
    // Only generate when explicitly marked stale (true) — not on undefined/null
    if (insightsStale === true) {
      generateInsights();
    }
  }, [profileCompleted, insightsStale, generateInsights]);

  // ── Pull to refresh ──
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshFinancialProfile();
    await generateInsights();
    setRefreshing(false);
  }, [refreshFinancialProfile, generateInsights]);

  // ── Derived state ──
  const hasProfile = Boolean(financialProfile?.completed);
  const hasInsights =
    insights &&
    (insights.summary ||
      insights.strengths?.length > 0 ||
      insights.improvements?.length > 0);

  return (
    <LinearGradient
      colors={theme.gradients.background}
      style={globalStyles.screen}
    >
      <FloatingBackground />
      <ScrollView
        style={styles.container}
        contentContainerStyle={globalStyles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        <View style={globalStyles.pageHeader}>
          <Text style={globalStyles.pageTitle}>Milo</Text>
          <Animated.Text style={[styles.welcome, welcomeAnimatedStyle]}>
            Bienvenido, {user?.email || "Usuario"}
          </Animated.Text>
          <Image
            source={MILO_IMAGES[2]}
            style={styles.heroMascot}
            resizeMode="contain"
          />
        </View>

        <ChatEntryCard
          onPress={() => navigation.navigate("Chat")}
          delay={120}
          theme={theme}
          globalStyles={globalStyles}
          styles={styles}
        />

        {/* ── Financial Summary Card ── */}
        {hasInsights && insights.summary ? (
          <FadeInCard delay={240} style={[globalStyles.glassCard, styles.card]}>
            <View style={styles.summaryHeader}>
              <Image
                source={MILO_IMAGES[0]}
                style={styles.miloSmall}
                resizeMode="contain"
              />
              <Text style={styles.summaryTitle}>Tu panorama financiero</Text>
            </View>
            <MarkdownSummary text={insights.summary} theme={theme} />
          </FadeInCard>
        ) : hasProfile && !hasInsights && !loadingInsights ? (
          <EmptyInsights styles={styles} />
        ) : null}

        {/* ── Loading indicator ── */}
        {loadingInsights && !hasInsights ? (
          <FadeInCard
            delay={240}
            style={[globalStyles.glassCard, styles.card, styles.loadingCard]}
          >
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.loadingText}>
              milo está analizando tu situación...
            </Text>
          </FadeInCard>
        ) : null}

        {/* ── Strengths Card ── */}
        {hasInsights ? (
          <InsightCard
            title="Lo que haces bien"
            emoji="💪"
            items={insights.strengths}
            miloImage={MILO_IMAGES[1]}
            accentColor={theme.colors.success}
            delay={360}
            theme={theme}
            globalStyles={globalStyles}
            styles={styles}
          />
        ) : null}

        {/* ── Improvements Card ── */}
        {hasInsights ? (
          <InsightCard
            title="Oportunidades de mejora"
            emoji="🔍"
            items={insights.improvements}
            miloImage={MILO_IMAGES[2]}
            accentColor={theme.isDark ? theme.colors.accent : "#D97706"}
            delay={480}
            theme={theme}
            globalStyles={globalStyles}
            styles={styles}
          />
        ) : null}

        {/* Bottom spacing */}
        <View style={{ height: 24 }} />
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
    summaryHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 14,
    },
    summaryTitle: {
      color: theme.colors.textPrimary,
      fontSize: 17,
      fontWeight: "800",
      marginLeft: 12,
      flex: 1,
    },
    insightHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 14,
    },
    insightTitle: {
      fontSize: 16,
      fontWeight: "800",
    },
    insightItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 10,
      paddingLeft: 4,
    },
    insightDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginTop: 5,
      marginRight: 10,
    },
    insightItemTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginBottom: 2,
    },
    insightItemDetail: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      lineHeight: 19,
    },
    miloSmall: {
      width: 44,
      height: 44,
      borderRadius: 22,
    },
    emptyInsights: {
      alignItems: "center",
      paddingVertical: 24,
      paddingHorizontal: 16,
    },
    miloEmpty: {
      width: 80,
      height: 80,
      marginBottom: 12,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginBottom: 6,
    },
    emptySubtitle: {
      fontSize: 13,
      color: theme.colors.textMuted,
      textAlign: "center",
      lineHeight: 20,
    },
    loadingCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    loadingText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontStyle: "italic",
    },
  });

export default HomeScreen;
