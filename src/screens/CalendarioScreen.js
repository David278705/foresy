import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../services/firebaseConfig";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import FloatingBackground from "../components/FloatingBackground";
import {
  buildCalendarEvents,
  deletePlan,
  subscribeToPlans,
  toggleChecklistStep,
  today as getToday,
  addDaysToDate,
} from "../services/plansService";

const DAY_NAMES_SHORT = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];

const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const friendlyDate = (dateStr) => {
  const todayStr = getToday();
  const tomorrowStr = addDaysToDate(todayStr, 1);
  if (dateStr === todayStr) return "HOY";
  if (dateStr === tomorrowStr) return "MAÑANA";
  const d = new Date(dateStr + "T12:00:00");
  return `${DAY_NAMES_SHORT[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
};

const buildWeekDays = () => {
  const todayDate = new Date();
  const startOfWeek = new Date(todayDate);
  const day = startOfWeek.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  startOfWeek.setDate(startOfWeek.getDate() + diff);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    days.push({
      label: DAY_NAMES_SHORT[d.getDay()],
      number: d.getDate(),
      dateStr: iso,
      isToday: iso === getToday(),
    });
  }
  return days;
};

const CalendarioScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const styles = createStyles(theme);

  const [plans, setPlans] = useState([]);
  const weekDays = useMemo(() => buildWeekDays(), []);

  useEffect(() => {
    if (!user?.uid) {
      setPlans([]);
      return;
    }
    const unsub = subscribeToPlans(user.uid, setPlans);
    return unsub;
  }, [user?.uid]);

  const events = useMemo(() => buildCalendarEvents(plans), [plans]);
  const todayStr = getToday();

  const sections = useMemo(() => {
    const map = {};
    events.forEach((ev) => {
      if (!map[ev.date]) map[ev.date] = [];
      map[ev.date].push(ev);
    });
    const sorted = Object.keys(map).sort();
    return sorted.map((date) => ({
      date,
      label: friendlyDate(date),
      data: map[date],
    }));
  }, [events]);

  const datesWithEvents = useMemo(() => {
    const s = new Set();
    events.forEach((ev) => s.add(ev.date));
    return s;
  }, [events]);

  const handleDelete = (planId) => {
    Alert.alert("Eliminar plan", "¿Seguro que quieres eliminar este plan?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePlan(planId);
          } catch (e) {
            Alert.alert("Error", "No se pudo eliminar");
          }
        },
      },
    ]);
  };

  const handleToggleStep = async (planId, stepIndex) => {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;
    try {
      await toggleChecklistStep(planId, stepIndex, plan.steps || []);

      // Check if all steps will be completed after this toggle
      const steps = plan.steps || [];
      const willBeComplete = steps.every((s, i) =>
        i === stepIndex ? !s.done : s.done,
      );
      if (willBeComplete && user?.uid) {
        await setDoc(
          doc(db, "financialProfiles", user.uid),
          { insightsStale: true },
          { merge: true },
        );
      }
    } catch (e) {
      console.warn("Toggle step error:", e);
    }
  };

  const handleGoToChat = () => {
    navigation.navigate("Chat");
  };

  return (
    <LinearGradient colors={theme.gradients.background} style={styles.screen}>
      <FloatingBackground />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Tu Plan con milo</Text>
            <Text style={styles.headerSubtitle}>
              {plans.length > 0
                ? `Tienes ${plans.length} plan${plans.length > 1 ? "es" : ""} activo${plans.length > 1 ? "s" : ""} 🎯`
                : "¡Crea planes hablando con milo! 🦥"}
            </Text>
          </View>
          <Image
            source={require("../../assets/milo/3.webp")}
            style={styles.mascotHeader}
            resizeMode="contain"
          />
        </View>

        {/* Mini weekly calendar */}
        <View style={styles.weekContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.weekScroll}
          >
            {weekDays.map((day) => (
              <View
                key={day.dateStr}
                style={[styles.dayBubble, day.isToday && styles.dayBubbleActive]}
              >
                <Text style={[styles.dayText, day.isToday && styles.dayTextActive]}>
                  {day.label}
                </Text>
                <Text style={[styles.dayNumber, day.isToday && styles.dayNumberActive]}>
                  {day.number}
                </Text>
                {datesWithEvents.has(day.dateStr) && (
                  <View style={[styles.eventDot, day.isToday && styles.eventDotActive]} />
                )}
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Events list */}
        <ScrollView style={styles.eventsContainer} showsVerticalScrollIndicator={false}>
          {sections.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Image
                source={require("../../assets/milo/2.webp")}
                style={styles.emptyMascot}
                resizeMode="contain"
              />
              <Text style={styles.emptyTitle}>
                Aún no tienes planes activos
              </Text>
              <Text style={styles.emptySubtitle}>
                Habla con milo para crear recordatorios de pago, metas de ahorro
                o sesiones periódicas 💬
              </Text>
              <TouchableOpacity style={styles.emptyButton} onPress={handleGoToChat} activeOpacity={0.8}>
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.accent]}
                  style={styles.emptyButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="chatbubble-ellipses" size={20} color="#FFF" />
                  <Text style={styles.emptyButtonText}>Hablar con milo</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            sections.map((section) => (
              <View key={section.date} style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionLabel, section.date === todayStr && styles.sectionLabelToday]}>
                    {section.label}
                  </Text>
                  <View style={styles.sectionLine} />
                </View>

                {section.data.map((event, idx) => (
                  <TouchableOpacity
                    key={`${event.planId}-${event.date}-${idx}`}
                    style={styles.eventCard}
                    activeOpacity={0.85}
                    onPress={event.type === "session" ? handleGoToChat : undefined}
                    onLongPress={() => handleDelete(event.planId)}
                  >
                    <LinearGradient
                      colors={event.colors}
                      style={styles.eventGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={styles.eventRow}>
                        <View style={styles.eventIconCircle}>
                          <Ionicons name={event.icon} size={28} color="#FFF" />
                        </View>
                        <View style={styles.eventInfo}>
                          <Text style={styles.eventTitle}>{event.title}</Text>
                          <Text style={styles.eventDescription}>{event.description}</Text>

                          {event.type === "reminder" && event.amount && (
                            <View style={styles.amountBadge}>
                              <Text style={styles.amountText}>
                                ${Number(event.amount).toLocaleString()}
                              </Text>
                            </View>
                          )}

                          {event.type === "checklist" && (
                            <View style={styles.checklistRow}>
                              <TouchableOpacity
                                style={[styles.checkToggle, event.done && styles.checkToggleDone]}
                                onPress={() => handleToggleStep(event.planId, event.stepIndex)}
                              >
                                <Ionicons
                                  name={event.done ? "checkmark-circle" : "ellipse-outline"}
                                  size={22}
                                  color="#FFF"
                                />
                                <Text style={styles.checkToggleText}>
                                  {event.done ? "Hecho" : "Marcar"}
                                </Text>
                              </TouchableOpacity>
                              <Text style={styles.checkProgress}>
                                {event.completedSteps}/{event.totalSteps}
                              </Text>
                            </View>
                          )}

                          {event.type === "session" && (
                            <View style={styles.sessionCTA}>
                              <Ionicons name="chatbubble" size={14} color="#FFF" />
                              <Text style={styles.sessionCTAText}>Abrir chat</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDelete(event.planId)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={16} color="rgba(255,255,255,0.7)" />
                      </TouchableOpacity>

                      <View style={styles.cornerDeco}>
                        <View style={styles.cornerCircle1} />
                        <View style={styles.cornerCircle2} />
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>
            ))
          )}

          {plans.length > 0 && (
            <View style={styles.motivacionContainer}>
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.accent]}
                style={styles.motivacionCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Image
                  source={require("../../assets/milo/2.webp")}
                  style={styles.mascotMotivacion}
                  resizeMode="contain"
                />
                <View style={styles.motivacionContent}>
                  <Text style={styles.motivacionTitulo}>
                    ¡Vas por buen camino! 💪
                  </Text>
                  <Text style={styles.motivacionTexto}>
                    Sigue así y cumplirás todas tus metas financieras. milo está contigo.
                  </Text>
                </View>
              </LinearGradient>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    </LinearGradient>
  );
};

const createStyles = (theme) =>
  StyleSheet.create({
    screen: { flex: 1 },
    container: { flex: 1, paddingTop: 60 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 20 },
    headerContent: { flex: 1 },
    headerTitle: { fontSize: 28, fontWeight: "800", color: theme.colors.textPrimary, marginBottom: 4 },
    headerSubtitle: { fontSize: 15, color: theme.colors.textSecondary, fontWeight: "600" },
    mascotHeader: { width: 80, height: 80, marginLeft: 12 },
    weekContainer: { marginBottom: 20, paddingVertical: 8 },
    weekScroll: { paddingHorizontal: 16, paddingVertical: 4 },
    dayBubble: { alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface, borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16, marginHorizontal: 4, minWidth: 60, borderWidth: 3, borderColor: theme.colors.border },
    dayBubbleActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary, transform: [{ scale: 1.05 }] },
    dayText: { fontSize: 11, fontWeight: "700", color: theme.colors.textMuted, marginBottom: 4 },
    dayTextActive: { color: "#FFF" },
    dayNumber: { fontSize: 18, fontWeight: "800", color: theme.colors.textPrimary },
    dayNumberActive: { color: "#FFF" },
    eventDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.primary, marginTop: 4 },
    eventDotActive: { backgroundColor: "#FFF" },
    eventsContainer: { flex: 1 },
    sectionContainer: { marginBottom: 8, paddingHorizontal: 20 },
    sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12, marginTop: 4 },
    sectionLabel: { fontSize: 14, fontWeight: "800", color: theme.colors.textSecondary, textTransform: "uppercase", letterSpacing: 1, marginRight: 10 },
    sectionLabelToday: { color: theme.colors.primary },
    sectionLine: { flex: 1, height: 1, backgroundColor: theme.colors.border },
    eventCard: { marginBottom: 14, borderRadius: 22, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
    eventGradient: { padding: 18, minHeight: 110, position: "relative" },
    eventRow: { flexDirection: "row", alignItems: "flex-start" },
    eventIconCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.25)", justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.4)", marginRight: 14 },
    eventInfo: { flex: 1 },
    eventTitle: { fontSize: 17, fontWeight: "800", color: "#FFF", marginBottom: 4, textShadowColor: "rgba(0,0,0,0.25)", textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
    eventDescription: { fontSize: 13, fontWeight: "600", color: "#FFF", opacity: 0.92, lineHeight: 19, marginBottom: 6 },
    amountBadge: { backgroundColor: "rgba(255,255,255,0.3)", alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.5)", marginTop: 4 },
    amountText: { color: "#FFF", fontSize: 15, fontWeight: "900" },
    checklistRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
    checkToggle: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.4)" },
    checkToggleDone: { backgroundColor: "rgba(255,255,255,0.45)" },
    checkToggleText: { color: "#FFF", fontWeight: "700", fontSize: 13, marginLeft: 6 },
    checkProgress: { color: "#FFF", fontSize: 13, fontWeight: "800", marginLeft: 10, opacity: 0.85 },
    sessionCTA: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.2)", alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, marginTop: 4 },
    sessionCTAText: { color: "#FFF", fontSize: 13, fontWeight: "700", marginLeft: 6 },
    deleteButton: { position: "absolute", top: 12, right: 12, backgroundColor: "rgba(0,0,0,0.15)", borderRadius: 14, padding: 6 },
    cornerDeco: { position: "absolute", right: -10, bottom: -10 },
    cornerCircle1: { width: 50, height: 50, borderRadius: 25, backgroundColor: "rgba(255,255,255,0.1)" },
    cornerCircle2: { width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.15)", position: "absolute", top: 10, left: 10 },
    emptyContainer: { alignItems: "center", justifyContent: "center", paddingHorizontal: 40, paddingTop: 60 },
    emptyMascot: { width: 120, height: 120, marginBottom: 20 },
    emptyTitle: { fontSize: 20, fontWeight: "800", color: theme.colors.textPrimary, marginBottom: 10, textAlign: "center" },
    emptySubtitle: { fontSize: 15, fontWeight: "600", color: theme.colors.textSecondary, textAlign: "center", lineHeight: 22, marginBottom: 24 },
    emptyButton: { borderRadius: 24, overflow: "hidden" },
    emptyButtonGradient: { flexDirection: "row", alignItems: "center", paddingHorizontal: 24, paddingVertical: 14, borderRadius: 24 },
    emptyButtonText: { color: "#FFF", fontSize: 16, fontWeight: "800", marginLeft: 8 },
    motivacionContainer: { paddingHorizontal: 20, marginTop: 20 },
    motivacionCard: { borderRadius: 24, padding: 20, flexDirection: "row", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 10, borderWidth: 3, borderColor: "rgba(255,255,255,0.3)" },
    mascotMotivacion: { width: 70, height: 70, marginRight: 16 },
    motivacionContent: { flex: 1 },
    motivacionTitulo: { fontSize: 18, fontWeight: "800", color: "#FFF", marginBottom: 6, textShadowColor: "rgba(0,0,0,0.3)", textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
    motivacionTexto: { fontSize: 14, fontWeight: "600", color: "#FFF", opacity: 0.95, lineHeight: 20 },
  });

export default CalendarioScreen;