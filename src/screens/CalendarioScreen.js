import React, { useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import FloatingBackground from "../components/FloatingBackground";

const CalendarioScreen = () => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // Datos de ejemplo para el calendario
  const recordatorios = [
    {
      id: 1,
      tipo: "ahorro",
      titulo: "Guardar para vacaciones",
      descripcion: "Ya casi llegas a tu meta! 🏖️",
      fecha: "HOY",
      hora: "15:00",
      progreso: 75,
      icono: "wallet",
      color: ["#F59E0B", "#FBBF24"],
      completado: false,
    },
    {
      id: 2,
      tipo: "pago",
      titulo: "Pagar tarjeta de crédito",
      descripcion: "No olvides este pago importante",
      fecha: "MAÑANA",
      hora: "10:00",
      progreso: 0,
      icono: "card",
      color: ["#EF4444", "#F87171"],
      completado: false,
    },
    {
      id: 3,
      tipo: "meta",
      titulo: "Revisar presupuesto mensual",
      descripcion: "Vamos a revisar tus gastos juntos!",
      fecha: "VIE 20",
      hora: "18:00",
      progreso: 0,
      icono: "analytics",
      color: ["#8B5CF6", "#A78BFA"],
      completado: false,
    },
    {
      id: 4,
      tipo: "logro",
      titulo: "Racha de 7 días ahorrando",
      descripcion: "Felicidades! Vas por buen camino! 🎉",
      fecha: "AYER",
      hora: "✨",
      progreso: 100,
      icono: "trophy",
      color: ["#10B981", "#34D399"],
      completado: true,
    },
    {
      id: 5,
      tipo: "consejo",
      titulo: "Tip del día: Inversiones",
      descripcion: "Aprende sobre fondos de inversión",
      fecha: "LUN 23",
      hora: "09:00",
      progreso: 0,
      icono: "bulb",
      color: ["#06B6D4", "#22D3EE"],
      completado: false,
    },
  ];

  const [selectedDay, setSelectedDay] = useState("HOY");

  return (
    <LinearGradient
      colors={theme.gradients.background}
      style={styles.screen}
    >
      <FloatingBackground />
      
      <View style={styles.container}>
        {/* Header con Milo */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Tu Plan con milo</Text>
            <Text style={styles.headerSubtitle}>
              ¡Mantente al día con tus metas! 🎯
            </Text>
          </View>
          <Image
            source={require("../../assets/milo/3.webp")}
            style={styles.mascotHeader}
            resizeMode="contain"
          />
        </View>

        {/* Mini calendario semanal */}
        <View style={styles.weekContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.weekScroll}
          >
            {["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"].map((dia, index) => {
              const isToday = index === 2; // Miércoles como ejemplo
              return (
                <TouchableOpacity
                  key={dia}
                  style={[
                    styles.dayBubble,
                    isToday && styles.dayBubbleActive,
                  ]}
                  onPress={() => setSelectedDay(dia)}
                >
                  <Text style={[
                    styles.dayText,
                    isToday && styles.dayTextActive,
                  ]}>
                    {dia}
                  </Text>
                  <Text style={[
                    styles.dayNumber,
                    isToday && styles.dayNumberActive,
                  ]}>
                    {17 + index}
                  </Text>
                  {index === 2 && (
                    <View style={styles.todayDot} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Lista de recordatorios */}
        <ScrollView 
          style={styles.recordatoriosContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.recordatoriosList}>
            {recordatorios.map((recordatorio, index) => (
              <TouchableOpacity
                key={recordatorio.id}
                style={[
                  styles.recordatorioCard,
                  recordatorio.completado && styles.recordatorioCardCompleted,
                ]}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={recordatorio.color}
                  style={styles.recordatorioGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {/* Etiqueta de fecha */}
                  <View style={styles.recordatorioHeader}>
                    <View style={styles.fechaBadge}>
                      <Text style={styles.fechaText}>{recordatorio.fecha}</Text>
                      <Text style={styles.horaText}>{recordatorio.hora}</Text>
                    </View>
                    {recordatorio.completado && (
                      <View style={styles.completedBadge}>
                        <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                      </View>
                    )}
                  </View>

                  {/* Contenido principal */}
                  <View style={styles.recordatorioContent}>
                    <View style={styles.iconContainer}>
                      <View style={styles.iconCircle}>
                        <Ionicons 
                          name={recordatorio.icono} 
                          size={32} 
                          color="#FFF" 
                        />
                      </View>
                    </View>

                    <View style={styles.recordatorioInfo}>
                      <Text style={styles.recordatorioTitulo}>
                        {recordatorio.titulo}
                      </Text>
                      <Text style={styles.recordatorioDescripcion}>
                        {recordatorio.descripcion}
                      </Text>

                      {/* Barra de progreso */}
                      {recordatorio.progreso > 0 && (
                        <View style={styles.progressContainer}>
                          <View style={styles.progressBar}>
                            <View 
                              style={[
                                styles.progressFill,
                                { width: `${recordatorio.progreso}%` }
                              ]}
                            />
                          </View>
                          <Text style={styles.progressText}>
                            {recordatorio.progreso}%
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Decoración de esquina */}
                  <View style={styles.cornerDecoration}>
                    <View style={styles.cornerCircle1} />
                    <View style={styles.cornerCircle2} />
                  </View>
                </LinearGradient>

                {/* Milo pequeño apareciendo en algunas tarjetas */}
                {index === 0 && (
                  <Image
                    source={require("../../assets/milo/face.png")}
                    style={styles.mascotPeek}
                    resizeMode="contain"
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Sección de motivación al final */}
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
                  ¡Vas súper bien! 💪
                </Text>
                <Text style={styles.motivacionTexto}>
                  Has completado 12 de 15 tareas esta semana.
                  ¡Sigue así y alcanzarás todas tus metas!
                </Text>
              </View>
            </LinearGradient>
          </View>

          {/* Espaciado al final */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    </LinearGradient>
  );
};

const createStyles = (theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
    },
    container: {
      flex: 1,
      paddingTop: 60,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      marginBottom: 20,
    },
    headerContent: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "800",
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 15,
      color: theme.colors.textSecondary,
      fontWeight: "600",
    },
    mascotHeader: {
      width: 80,
      height: 80,
      marginLeft: 12,
    },
    weekContainer: {
      marginBottom: 20,
      paddingVertical: 8,
    },
    weekScroll: {
      paddingHorizontal: 16,
      paddingVertical: 4,
    },
    dayBubble: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginHorizontal: 4,
      minWidth: 60,
      borderWidth: 3,
      borderColor: theme.colors.border,
    },
    dayBubbleActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
      transform: [{ scale: 1.05 }],
    },
    dayText: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.colors.textMuted,
      marginBottom: 4,
    },
    dayTextActive: {
      color: "#FFF",
    },
    dayNumber: {
      fontSize: 18,
      fontWeight: "800",
      color: theme.colors.textPrimary,
    },
    dayNumberActive: {
      color: "#FFF",
    },
    todayDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: "#FFF",
      marginTop: 4,
    },
    recordatoriosContainer: {
      flex: 1,
    },
    recordatoriosList: {
      paddingHorizontal: 20,
    },
    recordatorioCard: {
      marginBottom: 16,
      borderRadius: 24,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 10,
    },
    recordatorioCardCompleted: {
      opacity: 0.7,
    },
    recordatorioGradient: {
      padding: 20,
      minHeight: 140,
    },
    recordatorioHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 12,
    },
    fechaBadge: {
      backgroundColor: "rgba(255, 255, 255, 0.3)",
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: "rgba(255, 255, 255, 0.5)",
      flexDirection: "row",
      alignItems: "center",
    },
    fechaText: {
      color: "#FFF",
      fontSize: 12,
      fontWeight: "900",
      marginRight: 8,
    },
    horaText: {
      color: "#FFF",
      fontSize: 12,
      fontWeight: "700",
    },
    completedBadge: {
      backgroundColor: "rgba(255, 255, 255, 0.3)",
      borderRadius: 20,
      padding: 4,
    },
    recordatorioContent: {
      flexDirection: "row",
      alignItems: "center",
    },
    iconContainer: {
      marginRight: 16,
    },
    iconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: "rgba(255, 255, 255, 0.25)",
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 3,
      borderColor: "rgba(255, 255, 255, 0.4)",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
    },
    recordatorioInfo: {
      flex: 1,
    },
    recordatorioTitulo: {
      fontSize: 18,
      fontWeight: "800",
      color: "#FFF",
      marginBottom: 6,
      textShadowColor: "rgba(0, 0, 0, 0.3)",
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 3,
    },
    recordatorioDescripcion: {
      fontSize: 14,
      fontWeight: "600",
      color: "#FFF",
      opacity: 0.95,
      lineHeight: 20,
    },
    progressContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 12,
    },
    progressBar: {
      flex: 1,
      height: 10,
      backgroundColor: "rgba(255, 255, 255, 0.3)",
      borderRadius: 8,
      overflow: "hidden",
      borderWidth: 2,
      borderColor: "rgba(255, 255, 255, 0.4)",
    },
    progressFill: {
      height: "100%",
      backgroundColor: "#FFF",
      borderRadius: 6,
    },
    progressText: {
      color: "#FFF",
      fontSize: 13,
      fontWeight: "800",
      marginLeft: 10,
      textShadowColor: "rgba(0, 0, 0, 0.3)",
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 3,
    },
    cornerDecoration: {
      position: "absolute",
      right: -10,
      bottom: -10,
    },
    cornerCircle1: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: "rgba(255, 255, 255, 0.1)",
    },
    cornerCircle2: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(255, 255, 255, 0.15)",
      position: "absolute",
      top: 10,
      left: 10,
    },
    mascotPeek: {
      position: "absolute",
      width: 50,
      height: 50,
      bottom: -10,
      right: 10,
      transform: [{ rotate: "15deg" }],
    },
    motivacionContainer: {
      paddingHorizontal: 20,
      marginTop: 20,
    },
    motivacionCard: {
      borderRadius: 24,
      padding: 20,
      flexDirection: "row",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 10,
      borderWidth: 3,
      borderColor: "rgba(255, 255, 255, 0.3)",
    },
    mascotMotivacion: {
      width: 70,
      height: 70,
      marginRight: 16,
    },
    motivacionContent: {
      flex: 1,
    },
    motivacionTitulo: {
      fontSize: 18,
      fontWeight: "800",
      color: "#FFF",
      marginBottom: 6,
      textShadowColor: "rgba(0, 0, 0, 0.3)",
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 3,
    },
    motivacionTexto: {
      fontSize: 14,
      fontWeight: "600",
      color: "#FFF",
      opacity: 0.95,
      lineHeight: 20,
    },
  });

export default CalendarioScreen;
