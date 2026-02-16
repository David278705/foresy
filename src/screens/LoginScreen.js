import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
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

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();
  const globalStyles = createGlobalStyles(theme);
  const styles = createStyles(theme);
  const { signIn } = useAuth();
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
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.badge}>IA FINANCIERA</Text>
          <Text style={styles.title}>Foresy</Text>
          <Text style={styles.subtitle}>Simula tu vida antes de vivirla</Text>
        </View>

        <Animated.View
          style={[globalStyles.glassCard, styles.form, cardAnimatedStyle]}
        >
          <Text style={globalStyles.sectionTitle}>Iniciar sesión</Text>
          <TextInput
            style={[globalStyles.input, styles.input]}
            placeholder="Email"
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
                {loading ? "Cargando..." : "Iniciar Sesión"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate("Register")}
          >
            <Text style={styles.linkText}>¿No tienes cuenta? Regístrate</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </LinearGradient>
  );
};

const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: theme.spacing.lg,
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
      fontSize: 40,
      fontWeight: "800",
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontSize: 15,
      marginTop: 6,
    },
    form: {
      paddingTop: theme.spacing.lg,
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

export default LoginScreen;
