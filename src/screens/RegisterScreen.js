import React, { useEffect, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useAuth } from "../context/AuthContext";
import { createGlobalStyles } from "../constants/globalStyles";
import { useTheme } from "../context/ThemeContext";
import FloatingBackground from "../components/FloatingBackground";

const RegisterScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();
  const globalStyles = createGlobalStyles(theme);
  const styles = createStyles(theme);
  const { signUp } = useAuth();
  const cardOpacity = useSharedValue(0);
  const cardY = useSharedValue(20);

  useEffect(() => {
    cardOpacity.value = withTiming(1, {
      duration: 380,
      easing: Easing.out(Easing.cubic),
    });
    cardY.value = withTiming(0, {
      duration: 380,
      easing: Easing.out(Easing.cubic),
    });
  }, [cardOpacity, cardY]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardY.value }],
  }));

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert("Error", "Por favor completa todos los campos");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Las contraseñas no coinciden");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password);
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
              <Text style={styles.badge}>BIENVENIDO</Text>
              <Text style={styles.title}>Crea tu cuenta</Text>
              <Text style={styles.subtitle}>
                Empieza tu plan financiero inteligente hoy.
              </Text>
            </View>

            <Animated.View
              style={[globalStyles.glassCard, styles.form, cardAnimatedStyle]}
            >
              <Text style={styles.sectionTitle}>Registro con correo</Text>
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
              <TextInput
                style={[globalStyles.input, styles.input]}
                placeholder="Confirmar contraseña"
                placeholderTextColor={theme.colors.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />

              <TouchableOpacity
                style={styles.button}
                onPress={handleRegister}
                disabled={loading}
              >
                <View style={[globalStyles.primaryButton, { backgroundColor: theme.colors.primary }]}>
                  <Text style={globalStyles.primaryButtonText}>
                    {loading ? "Creando cuenta..." : "Crear cuenta"}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => navigation.navigate("Login")}
              >
                <Text style={styles.linkText}>Ya tengo una cuenta</Text>
              </TouchableOpacity>
            </Animated.View>
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
      color: theme.colors.accent,
      fontSize: 11,
      fontWeight: "700",
      marginBottom: theme.spacing.sm,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 35,
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
      fontSize: 23,
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

export default RegisterScreen;
