import React, { useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import FloatingBackground from "../components/FloatingBackground";
import { createGlobalStyles } from "../constants/globalStyles";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

const EmailLoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();
  const globalStyles = createGlobalStyles(theme);
  const styles = createStyles(theme);
  const { signIn } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Por favor ingresa email y contraseña");
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={theme.gradients.background}
      style={globalStyles.screen}
    >
      <FloatingBackground />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Text style={styles.title}>Inicia con tu correo</Text>
              <Text style={styles.subtitle}>
                Accede con tu cuenta para continuar en Foresy.
              </Text>
            </View>

            <View style={[globalStyles.glassCard, styles.form]}>
              <Text style={styles.sectionTitle}>Entrar con correo</Text>

              <TextInput
                style={[globalStyles.input, styles.input]}
                placeholder="Correo electrónico"
                placeholderTextColor={theme.colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TextInput
                style={[globalStyles.input, styles.input]}
                placeholder="Contraseña"
                placeholderTextColor={theme.colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <TouchableOpacity
                style={styles.button}
                onPress={handleLogin}
                disabled={loading}
              >
                <LinearGradient
                  colors={theme.gradients.primary}
                  style={globalStyles.primaryButton}
                >
                  <Text style={globalStyles.primaryButtonText}>
                    {loading ? "Entrando..." : "Entrar"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => navigation.navigate("Register")}
              >
                <Text style={styles.linkText}>Crear cuenta nueva</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </LinearGradient>
  );
};

const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: "center",
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.xl,
    },
    header: {
      marginBottom: theme.spacing.lg,
    },
    badge: {
      alignSelf: "flex-start",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: theme.colors.badgeBackground,
      color: theme.colors.primary,
      fontSize: 11,
      fontWeight: "700",
      marginBottom: theme.spacing.sm,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 34,
      fontWeight: "800",
      lineHeight: 40,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontSize: 15,
      marginTop: 6,
    },
    form: {
      paddingTop: theme.spacing.lg,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontSize: 24,
      fontWeight: "800",
      marginBottom: theme.spacing.md,
    },
    input: {
      marginBottom: theme.spacing.md,
    },
    button: {
      marginTop: theme.spacing.sm,
    },
    linkButton: {
      marginTop: theme.spacing.md,
      alignItems: "center",
    },
    linkText: {
      color: theme.colors.primary,
      fontSize: 14,
      fontWeight: "700",
    },
  });

export default EmailLoginScreen;
