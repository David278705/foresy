import React, { useEffect, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import Constants from "expo-constants";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { createGlobalStyles } from "../constants/globalStyles";
import { useTheme } from "../context/ThemeContext";
import FloatingBackground from "../components/FloatingBackground";

WebBrowser.maybeCompleteAuthSession();

const createNonce = (size = 32) => {
  const charset =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._";
  let nonce = "";
  for (let i = 0; i < size; i += 1) {
    nonce += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return nonce;
};

const LoginScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState("");
  const [appleAvailable, setAppleAvailable] = useState(false);
  const { theme } = useTheme();
  const globalStyles = createGlobalStyles(theme);
  const styles = createStyles(theme);
  const { signInWithGoogle, signInWithApple } = useAuth();
  const cardOpacity = useSharedValue(0);
  const cardY = useSharedValue(20);
  const googleConfig = Constants.expoConfig?.extra?.googleAuth || {};

  const [, , promptAsync] = Google.useAuthRequest({
    expoClientId: googleConfig.expoClientId,
    iosClientId: googleConfig.iosClientId,
    androidClientId: googleConfig.androidClientId,
    webClientId: googleConfig.webClientId,
    scopes: ["openid", "profile", "email"],
    selectAccount: true,
  });

  useEffect(() => {
    cardOpacity.value = withTiming(1, {
      duration: 380,
      easing: Easing.out(Easing.cubic),
    });
    cardY.value = withTiming(0, {
      duration: 380,
      easing: Easing.out(Easing.cubic),
    });

    AppleAuthentication.isAvailableAsync()
      .then((available) => setAppleAvailable(available))
      .catch(() => setAppleAvailable(false));
  }, [cardOpacity, cardY]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardY.value }],
  }));

  const handleGoogleSignIn = async () => {
    if (!googleConfig.expoClientId && !googleConfig.iosClientId) {
      Alert.alert(
        "Google no configurado",
        "Configura los client IDs de Google en app.json > expo.extra.googleAuth.",
      );
      return;
    }

    try {
      setSocialLoading("google");
      const result = await promptAsync();

      if (result?.type !== "success") {
        setSocialLoading("");
        return;
      }

      const idToken =
        result?.authentication?.idToken || result?.params?.id_token;

      if (!idToken) {
        throw new Error("No se recibió token de Google.");
      }

      await signInWithGoogle(idToken);
    } catch (error) {
      Alert.alert("Error", error.message || "No se pudo iniciar con Google");
    } finally {
      setSocialLoading("");
    }
  };

  const handleAppleSignIn = async () => {
    if (!appleAvailable) {
      Alert.alert(
        "Apple no disponible",
        "Apple Sign-In solo está disponible en dispositivos Apple compatibles.",
      );
      return;
    }

    try {
      setSocialLoading("apple");
      const rawNonce = createNonce();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      );

      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!appleCredential.identityToken) {
        throw new Error("No se recibió token de Apple.");
      }

      await signInWithApple({
        idToken: appleCredential.identityToken,
        rawNonce,
      });
    } catch (error) {
      if (error?.code === "ERR_REQUEST_CANCELED") {
        return;
      }
      Alert.alert("Error", error.message || "No se pudo iniciar con Apple");
    } finally {
      setSocialLoading("");
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
              <Text style={styles.badge}>NUEVO INICIO</Text>
              <Image
                source={require("../../assets/milo/face.png")}
                style={styles.mascot}
                resizeMode="contain"
              />
              <Text style={styles.title}>Aprende y decide mejor</Text>
              <Text style={styles.subtitle}>
                Entra a Foresy y mejora tus finanzas paso a paso.
              </Text>
            </View>

            <Animated.View
              style={[globalStyles.glassCard, styles.form, cardAnimatedStyle]}
            >
              <Text style={styles.sectionTitle}>Elige cómo entrar</Text>

              <TouchableOpacity
                style={[styles.socialButton, styles.googleButton]}
                onPress={handleGoogleSignIn}
                disabled={socialLoading === "google" || loading}
              >
                <Ionicons
                  name="logo-google"
                  size={18}
                  color={theme.colors.accent}
                />
                <Text style={styles.socialButtonText}>
                  {socialLoading === "google"
                    ? "Conectando con Google..."
                    : "Continuar con Google"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialButton, styles.appleButton]}
                onPress={handleAppleSignIn}
                disabled={socialLoading === "apple" || loading}
              >
                <Ionicons
                  name="logo-apple"
                  size={18}
                  color={theme.colors.textPrimary}
                />
                <Text style={styles.socialButtonText}>
                  {socialLoading === "apple"
                    ? "Conectando con Apple..."
                    : "Continuar con Apple"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialButton, styles.emailOptionButton]}
                onPress={() => navigation.navigate("EmailLogin")}
                disabled={Boolean(socialLoading) || loading}
              >
                <Ionicons
                  name="mail"
                  size={18}
                  color={theme.colors.textPrimary}
                />
                <Text style={styles.socialButtonText}>Continuar con correo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => navigation.navigate("Register")}
              >
                <Text style={styles.linkText}>Crear cuenta nueva</Text>
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
      alignItems: "center",
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
      fontSize: 36,
      fontWeight: "800",
      lineHeight: 42,
      textAlign: "center",
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontSize: 15,
      marginTop: 6,
      textAlign: "center",
    },
    mascot: {
      width: 90,
      height: 90,
      marginBottom: theme.spacing.sm,
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
    socialButton: {
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      paddingVertical: 13,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      marginBottom: theme.spacing.sm,
    },
    googleButton: {
      backgroundColor: theme.colors.surfaceElevated,
    },
    appleButton: {
      backgroundColor: theme.colors.surfaceElevated,
    },
    emailOptionButton: {
      backgroundColor: theme.colors.surfaceElevated,
    },
    socialButtonText: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: "700",
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

export default LoginScreen;
