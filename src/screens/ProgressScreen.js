import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { createGlobalStyles } from "../constants/globalStyles";
import { subscribeToPlans } from "../services/plansService";
import {
  subscribeToAchievements,
  getTopAchievements,
  buildFinancialCharts,
  ACHIEVEMENT_CONFIG,
} from "../services/achievementsService";
import FloatingBackground from "../components/FloatingBackground";

// ─── Mascot images ───
const MILO_IMAGES = [
  require("../../assets/milo/1.webp"),
  require("../../assets/milo/2.webp"),
  require("../../assets/milo/3.webp"),
];

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

// ─── Format currency ───
const formatCurrency = (num) => {
  if (!num && num !== 0) return "$0";
  return "$" + Math.round(num).toLocaleString("es-CO");
};

// ─── Single achievement row ───
const AchievementRow = ({ achievement, index, theme, styles }) => {
  const config =
    ACHIEVEMENT_CONFIG[achievement.type] ||
    ACHIEVEMENT_CONFIG.personal_milestone;

  const timeAgo = useMemo(() => {
    if (!achievement.date) return "";
    const diff = Date.now() - new Date(achievement.date).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Hoy";
    if (days === 1) return "Ayer";
    if (days < 7) return `Hace ${days} días`;
    if (days < 30) return `Hace ${Math.floor(days / 7)} sem`;
    return `Hace ${Math.floor(days / 30)} mes${Math.floor(days / 30) > 1 ? "es" : ""}`;
  }, [achievement.date]);

  return (
    <FadeInCard
      delay={80 + index * 60}
      style={[
        styles.achievementRow,
        index > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.border },
      ]}
    >
      <View
        style={[
          styles.achievementEmojiBg,
          { backgroundColor: config.color + "18" },
        ]}
      >
        <Text style={styles.achievementEmoji}>{config.emoji}</Text>
      </View>
      <View style={styles.achievementContent}>
        <Text style={styles.achievementTitle} numberOfLines={1}>
          {achievement.title}
        </Text>
        <Text style={styles.achievementDetail} numberOfLines={2}>
          {achievement.detail}
        </Text>
        <Text style={[styles.achievementTime, { color: config.color }]}>
          {config.label} · {timeAgo}
        </Text>
      </View>
    </FadeInCard>
  );
};

// ─── Empty state ───
const EmptyState = ({ styles }) => (
  <View style={styles.emptyContainer}>
    <Image
      source={MILO_IMAGES[0]}
      style={styles.emptyMilo}
      resizeMode="contain"
    />
    <Text style={styles.emptyTitle}>Aún sin logros</Text>
    <Text style={styles.emptySubtitle}>
      Crea un plan, establece un recordatorio o cuéntale a milo algo que lograste.
      Aquí irá apareciendo tu progreso 🦥
    </Text>
  </View>
);

// ════════════════════════════════════════════════
// ─── PROGRESS SCREEN ────────────────────────────
// ════════════════════════════════════════════════

const ProgressScreen = () => {
  const { theme } = useTheme();
  const globalStyles = createGlobalStyles(theme);
  const styles = createStyles(theme);
  const { user, financialProfile } = useAuth();

  const [plans, setPlans] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // ── Subscriptions ──
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToPlans(user.uid, (p) => setPlans(p));
    return unsub;
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToAchievements(user.uid, (a) => setAchievements(a));
    return unsub;
  }, [user?.uid]);

  // ── Charts (100% local) ──
  const charts = useMemo(
    () => buildFinancialCharts(financialProfile, plans),
    [financialProfile, plans],
  );

  const topAchievements = useMemo(
    () => getTopAchievements(achievements, 3),
    [achievements],
  );

  const hasAchievements = achievements.length > 0;
  const hasCharts =
    charts.distribution ||
    charts.planProgress ||
    charts.reminders ||
    charts.savingsRate;

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

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
        {/* ── Header ── */}
        <View style={globalStyles.pageHeader}>
          <Text style={globalStyles.pageTitle}>Progreso</Text>
          <Text style={globalStyles.pageSubtitle}>
            Tus logros y panorama financiero
          </Text>
        </View>

        {/* ── Milo banner ── */}
        <FadeInCard delay={0} style={[globalStyles.glassCard, styles.bannerCard]}>
          <Image
            source={MILO_IMAGES[1]}
            style={styles.bannerMilo}
            resizeMode="contain"
          />
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>Lo que has logrado</Text>
            <Text style={styles.bannerSubtitle}>
              {hasAchievements
                ? `${achievements.length} logro${achievements.length > 1 ? "s" : ""} registrado${achievements.length > 1 ? "s" : ""} con milo`
                : "Tus logros aparecerán aquí automáticamente"}
            </Text>
          </View>
        </FadeInCard>

        {/* ── Achievements ── */}
        {hasAchievements ? (
          <FadeInCard
            delay={60}
            style={[globalStyles.glassCard, styles.card]}
          >
            <Text style={styles.cardLabel}>🏅 Logros recientes</Text>
            {topAchievements.map((ach, i) => (
              <AchievementRow
                key={`${ach.type}-${ach.title}-${i}`}
                achievement={ach}
                index={i}
                theme={theme}
                styles={styles}
              />
            ))}
            {achievements.length > 3 ? (
              <Text style={styles.moreText}>
                +{achievements.length - 3} logro
                {achievements.length - 3 > 1 ? "s" : ""} más
              </Text>
            ) : null}
          </FadeInCard>
        ) : (
          <EmptyState styles={styles} />
        )}

        {/* ── Distribution Chart ── */}
        {charts.distribution ? (
          <FadeInCard
            delay={160}
            style={[globalStyles.glassCard, styles.card]}
          >
            <Text style={styles.cardLabel}>
              💰 {charts.distribution.title}
            </Text>
            <Text style={styles.incomeLabel}>
              Ingreso mensual:{" "}
              <Text style={styles.incomeValue}>
                {formatCurrency(charts.distribution.income)}
              </Text>
            </Text>
            {/* Segmented bar */}
            <View style={styles.segBar}>
              {charts.distribution.segments.map((seg, i) => {
                const pct =
                  (seg.value / charts.distribution.income) * 100;
                return (
                  <View
                    key={i}
                    style={[
                      styles.segBarItem,
                      {
                        backgroundColor: seg.color,
                        width: `${Math.max(pct, 3)}%`,
                        borderTopLeftRadius: i === 0 ? 8 : 0,
                        borderBottomLeftRadius: i === 0 ? 8 : 0,
                        borderTopRightRadius:
                          i === charts.distribution.segments.length - 1
                            ? 8
                            : 0,
                        borderBottomRightRadius:
                          i === charts.distribution.segments.length - 1
                            ? 8
                            : 0,
                      },
                    ]}
                  />
                );
              })}
            </View>
            <View style={styles.legend}>
              {charts.distribution.segments.map((seg, i) => {
                const pct = Math.round(
                  (seg.value / charts.distribution.income) * 100,
                );
                return (
                  <View key={i} style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendDot,
                        { backgroundColor: seg.color },
                      ]}
                    />
                    <Text style={styles.legendText}>
                      {seg.label} {pct}%
                    </Text>
                  </View>
                );
              })}
            </View>
          </FadeInCard>
        ) : null}

        {/* ── Plan Progress ── */}
        {charts.planProgress ? (
          <FadeInCard
            delay={240}
            style={[globalStyles.glassCard, styles.card]}
          >
            <Text style={styles.cardLabel}>
              📋 {charts.planProgress.title}
            </Text>
            {charts.planProgress.plans.map((plan, i) => (
              <View key={plan.id || i} style={styles.progressItem}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressTitle} numberOfLines={1}>
                    {plan.title}
                  </Text>
                  <Text
                    style={[
                      styles.progressPct,
                      {
                        color:
                          plan.percent === 100
                            ? theme.colors.success
                            : theme.colors.primary,
                      },
                    ]}
                  >
                    {plan.percent}%
                  </Text>
                </View>
                <View style={styles.progressBg}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${plan.percent}%`,
                        backgroundColor:
                          plan.percent === 100
                            ? theme.colors.success
                            : theme.colors.primary,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressSteps}>
                  {plan.done}/{plan.total} pasos
                </Text>
              </View>
            ))}
          </FadeInCard>
        ) : null}

        {/* ── Reminders summary ── */}
        {charts.reminders ? (
          <FadeInCard
            delay={320}
            style={[globalStyles.glassCard, styles.card]}
          >
            <Text style={styles.cardLabel}>
              🔔 {charts.reminders.title}
            </Text>
            <View style={styles.reminderTotal}>
              <Text style={styles.reminderTotalLabel}>Total mensual</Text>
              <Text style={styles.reminderTotalValue}>
                {formatCurrency(charts.reminders.totalMonthly)}
              </Text>
            </View>
            {charts.reminders.items.map((item, i) => {
              const freq =
                item.frequency === "monthly"
                  ? "/mes"
                  : item.frequency === "biweekly"
                    ? "/quin."
                    : item.frequency === "weekly"
                      ? "/sem"
                      : item.frequency === "yearly"
                        ? "/año"
                        : "";
              return (
                <View key={i} style={styles.reminderRow}>
                  <Text style={styles.reminderName} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.reminderAmount}>
                    {formatCurrency(item.amount)}
                    <Text style={styles.reminderFreq}>{freq}</Text>
                  </Text>
                </View>
              );
            })}
          </FadeInCard>
        ) : null}

        {/* ── Savings Rate ── */}
        {charts.savingsRate ? (
          <FadeInCard
            delay={400}
            style={[globalStyles.glassCard, styles.card]}
          >
            <Text style={styles.cardLabel}>
              🏦 {charts.savingsRate.title}
            </Text>
            <View style={styles.savingsRow}>
              <View
                style={[
                  styles.savingsCircle,
                  {
                    borderColor:
                      charts.savingsRate.rate >= 20
                        ? theme.colors.success
                        : charts.savingsRate.rate >= 10
                          ? "#F59E0B"
                          : theme.colors.danger,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.savingsPct,
                    {
                      color:
                        charts.savingsRate.rate >= 20
                          ? theme.colors.success
                          : charts.savingsRate.rate >= 10
                            ? "#F59E0B"
                            : theme.colors.danger,
                    },
                  ]}
                >
                  {charts.savingsRate.rate}%
                </Text>
              </View>
              <View style={styles.savingsInfo}>
                <Text style={styles.savingsDetail}>
                  Ahorrás{" "}
                  <Text style={{ fontWeight: "800" }}>
                    {formatCurrency(charts.savingsRate.savings)}
                  </Text>{" "}
                  de{" "}
                  <Text style={{ fontWeight: "800" }}>
                    {formatCurrency(charts.savingsRate.income)}
                  </Text>
                </Text>
                <Text style={styles.savingsHint}>
                  {charts.savingsRate.rate >= 20
                    ? "Excelente — estás por encima del estándar 💪"
                    : charts.savingsRate.rate >= 10
                      ? "Buen ritmo — el objetivo ideal es 20%+"
                      : "Hay oportunidad de mejorar — ¡paso a paso!"}
                </Text>
              </View>
            </View>
          </FadeInCard>
        ) : null}

        {/* ── No charts yet ── */}
        {!hasCharts && hasAchievements ? (
          <FadeInCard
            delay={200}
            style={[globalStyles.glassCard, styles.card, styles.noChartsCard]}
          >
            <Text style={styles.noChartsEmoji}>📊</Text>
            <Text style={styles.noChartsTitle}>Las gráficas aparecerán pronto</Text>
            <Text style={styles.noChartsSubtitle}>
              Cuéntale a milo tus ingresos, gastos y metas para ver tu panorama financiero aquí.
            </Text>
          </FadeInCard>
        ) : null}

        <View style={{ height: 24 }} />
      </ScrollView>
    </LinearGradient>
  );
};

const createStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1 },

    // Banner
    bannerCard: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: theme.spacing.md,
      padding: theme.spacing.md,
    },
    bannerMilo: {
      width: 56,
      height: 56,
      borderRadius: 28,
      marginRight: 14,
    },
    bannerText: { flex: 1 },
    bannerTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: theme.colors.textPrimary,
    },
    bannerSubtitle: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginTop: 3,
      lineHeight: 18,
    },

    // Cards
    card: { marginBottom: theme.spacing.md },
    cardLabel: {
      fontSize: 15,
      fontWeight: "800",
      color: theme.colors.textPrimary,
      marginBottom: 14,
    },

    // Achievement rows
    achievementRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
    },
    achievementEmojiBg: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    achievementEmoji: { fontSize: 22 },
    achievementContent: { flex: 1 },
    achievementTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginBottom: 2,
    },
    achievementDetail: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      lineHeight: 17,
    },
    achievementTime: {
      fontSize: 11,
      fontWeight: "600",
      marginTop: 3,
    },
    moreText: {
      fontSize: 12,
      color: theme.colors.textMuted,
      textAlign: "center",
      marginTop: 10,
      fontStyle: "italic",
    },

    // Distribution
    incomeLabel: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginBottom: 10,
    },
    incomeValue: {
      fontWeight: "800",
      color: theme.colors.textPrimary,
    },
    segBar: {
      flexDirection: "row",
      height: 22,
      borderRadius: 8,
      overflow: "hidden",
      marginBottom: 12,
    },
    segBarItem: { height: 22 },
    legend: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 5,
    },
    legendText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: "600",
    },

    // Plan progress
    progressItem: { marginBottom: 16 },
    progressHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 6,
    },
    progressTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      flex: 1,
      marginRight: 8,
    },
    progressPct: {
      fontSize: 14,
      fontWeight: "800",
    },
    progressBg: {
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.surfaceSoft,
      overflow: "hidden",
    },
    progressFill: {
      height: 10,
      borderRadius: 5,
    },
    progressSteps: {
      fontSize: 11,
      color: theme.colors.textMuted,
      marginTop: 4,
    },

    // Reminders
    reminderTotal: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    reminderTotalLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontWeight: "600",
    },
    reminderTotalValue: {
      fontSize: 18,
      fontWeight: "800",
      color: theme.colors.textPrimary,
    },
    reminderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 6,
    },
    reminderName: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      flex: 1,
      marginRight: 8,
    },
    reminderAmount: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    reminderFreq: {
      fontSize: 11,
      fontWeight: "400",
      color: theme.colors.textMuted,
    },

    // Savings rate
    savingsRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    savingsCircle: {
      width: 76,
      height: 76,
      borderRadius: 38,
      borderWidth: 5,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surfaceSoft,
      marginRight: 16,
    },
    savingsPct: {
      fontSize: 20,
      fontWeight: "800",
    },
    savingsInfo: { flex: 1 },
    savingsDetail: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    savingsHint: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: 4,
      lineHeight: 17,
    },

    // Empty state
    emptyContainer: {
      alignItems: "center",
      paddingVertical: 32,
      paddingHorizontal: 16,
    },
    emptyMilo: {
      width: 90,
      height: 90,
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 13,
      color: theme.colors.textMuted,
      textAlign: "center",
      lineHeight: 21,
    },

    // No charts placeholder
    noChartsCard: {
      alignItems: "center",
      paddingVertical: 20,
    },
    noChartsEmoji: {
      fontSize: 32,
      marginBottom: 8,
    },
    noChartsTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginBottom: 6,
    },
    noChartsSubtitle: {
      fontSize: 13,
      color: theme.colors.textMuted,
      textAlign: "center",
      lineHeight: 20,
    },
  });

export default ProgressScreen;
