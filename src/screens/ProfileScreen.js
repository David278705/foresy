import React from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import FloatingBackground from "../components/FloatingBackground";
import { createGlobalStyles } from "../constants/globalStyles";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

const RowItem = ({ icon, title, subtitle, onPress, rightElement, theme }) => {
  const styles = createStyles(theme);

  return (
    <TouchableOpacity
      style={[styles.row, styles.rowBorder]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.rowLeft}>
        <View style={styles.rowIconWrap}>
          <Ionicons name={icon} size={18} color={theme.colors.primary} />
        </View>
        <View>
          <Text style={styles.rowTitle}>{title}</Text>
          {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {rightElement || (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={theme.colors.textMuted}
        />
      )}
    </TouchableOpacity>
  );
};

const ProfileScreen = () => {
  const { mode, setMode, theme } = useTheme();
  const { replayIntro, logout } = useAuth();
  const globalStyles = createGlobalStyles(theme);
  const styles = createStyles(theme);

  const handleLogout = () => {
    Alert.alert("Cerrar sesión", "¿Quieres cerrar tu sesión ahora?", [
      {
        text: "Cancelar",
        style: "cancel",
      },
      {
        text: "Cerrar sesión",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
          } catch (error) {
            Alert.alert(
              "Error",
              "No se pudo cerrar sesión. Inténtalo nuevamente.",
            );
          }
        },
      },
    ]);
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
      >
        <View style={globalStyles.pageHeader}>
          <Text style={globalStyles.pageTitle}>Perfil</Text>
          <Text style={globalStyles.pageSubtitle}>
            Configuración, preferencias y opciones legales de la aplicación.
          </Text>
        </View>

        <View style={[globalStyles.glassCard, styles.block]}>
          <Text style={globalStyles.sectionTitle}>Preferencias</Text>
          <RowItem
            icon="sunny"
            title="Modo Oscuro"
            subtitle="Personaliza tu vista"
            theme={theme}
            rightElement={
              <Switch
                value={mode === "dark"}
                onValueChange={(enabled) => setMode(enabled ? "dark" : "light")}
                thumbColor={mode === "dark" ? theme.colors.primary : "#ffffff"}
                trackColor={{
                  false: "#CBD5E1",
                  true: `${theme.colors.primary}88`,
                }}
              />
            }
          />
          <RowItem
            icon="sparkles"
            title="Repetir introducción"
            subtitle="Mostrar onboarding animado"
            theme={theme}
            onPress={() => {
              replayIntro();
            }}
          />
        </View>

        <View style={[globalStyles.glassCard, styles.block]}>
          <Text style={globalStyles.sectionTitle}>Cuenta</Text>
          <RowItem
            icon="person"
            title="Editar perfil"
            subtitle="Nombre, foto y datos personales"
            theme={theme}
            onPress={() =>
              Alert.alert("Próximamente", "Aquí podrás editar tu perfil.")
            }
          />
          <RowItem
            icon="notifications"
            title="Notificaciones"
            subtitle="Recordatorios y alertas inteligentes"
            theme={theme}
            onPress={() =>
              Alert.alert(
                "Próximamente",
                "Aquí podrás configurar notificaciones.",
              )
            }
          />
          <RowItem
            icon="log-out"
            title="Cerrar sesión"
            subtitle="Salir de tu cuenta en este dispositivo"
            theme={theme}
            onPress={handleLogout}
          />
        </View>

        <View style={[globalStyles.glassCard, styles.block]}>
          <Text style={globalStyles.sectionTitle}>Legal</Text>
          <RowItem
            icon="document-text"
            title="Términos y condiciones"
            subtitle="Condiciones de uso de Foresy"
            theme={theme}
            onPress={() =>
              Alert.alert("Términos", "Documento disponible próximamente.")
            }
          />
          <RowItem
            icon="shield-checkmark"
            title="Política de privacidad"
            subtitle="Cómo protegemos tus datos"
            theme={theme}
            onPress={() =>
              Alert.alert("Privacidad", "Documento disponible próximamente.")
            }
          />
          <RowItem
            icon="information-circle"
            title="Licencias"
            subtitle="Librerías de terceros"
            theme={theme}
            onPress={() =>
              Alert.alert(
                "Licencias",
                "Listado de licencias disponible próximamente.",
              )
            }
          />
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
    block: {
      marginBottom: theme.spacing.md,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
    },
    rowBorder: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    rowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flex: 1,
      paddingRight: 12,
    },
    rowIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: theme.colors.badgeBackground,
      alignItems: "center",
      justifyContent: "center",
    },
    rowTitle: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: "700",
    },
    rowSubtitle: {
      color: theme.colors.textSecondary,
      marginTop: 2,
      fontSize: 13,
    },
  });

export default ProfileScreen;
