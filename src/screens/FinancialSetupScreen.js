import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeOut,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Audio } from "expo-av";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FloatingBackground from "../components/FloatingBackground";
import { createGlobalStyles } from "../constants/globalStyles";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { db } from "../services/firebaseConfig";
import {
  getFinancialOnboardingStep,
  transcribeAudioWithOpenAI,
} from "../services/openaiOnboardingService";

const FIRST_QUESTION =
  "Para empezar, cuéntame tu contexto financiero actual: ingresos, gastos, deudas y metas que más te importan hoy.";
const MAX_ONBOARDING_QUESTIONS = 7;
const FOOTER_HEIGHT = 118;
const MASCOTS = [
  require("../../assets/milo/1.webp"),
  require("../../assets/milo/2.webp"),
  require("../../assets/milo/3.webp"),
];

const FinancialSetupScreen = () => {
  const windowHeight = Dimensions.get("window").height;
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const globalStyles = createGlobalStyles(theme);
  const styles = createStyles(theme);
  const { user, refreshFinancialProfile, logout } = useAuth();

  const [question, setQuestion] = useState(FIRST_QUESTION);
  const [answers, setAnswers] = useState([]);
  const [textMode, setTextMode] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [statusText, setStatusText] = useState("Toca el micrófono para responder.");

  const micScale = useSharedValue(1);
  const mascotFloat = useSharedValue(0);
  const loadingPulse = useSharedValue(1);
  const modePop = useSharedValue(1);

  useEffect(() => {
    mascotFloat.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 1300, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1300, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [mascotFloat]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) => {
      const keyboardTop = event?.endCoordinates?.screenY;
      const fallbackHeight = event?.endCoordinates?.height || 0;
      const overlap =
        typeof keyboardTop === "number"
          ? Math.max(0, windowHeight - keyboardTop)
          : fallbackHeight;
      const measuredHeight = Platform.OS === "android" ? fallbackHeight : overlap;
      setKeyboardHeight(measuredHeight);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [windowHeight]);

  useEffect(() => {
    if (isRecording) {
      micScale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 460, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 460, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
      return;
    }

    micScale.value = withSpring(1, { damping: 14, stiffness: 220 });
  }, [isRecording, micScale]);

  useEffect(() => {
    if (!isProcessing) {
      loadingPulse.value = withTiming(1, { duration: 120 });
      return;
    }

    loadingPulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [isProcessing, loadingPulse]);

  const micAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: micScale.value }],
  }));

  const mascotAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: mascotFloat.value }],
  }));

  const loadingAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: loadingPulse.value }],
  }));

  const modePopStyle = useAnimatedStyle(() => ({
    transform: [{ scale: modePop.value }],
  }));

  const answeredCount = answers.length;
  const currentQuestion = Math.min(answeredCount + 1, MAX_ONBOARDING_QUESTIONS);
  const progressPercent = Math.max(
    (answeredCount / MAX_ONBOARDING_QUESTIONS) * 100,
    4,
  );
  const mascotIndex = answeredCount % MASCOTS.length;

  const processAnswer = async (answer, inputType) => {
    if (!answer?.trim()) return;

    const nextAnswers = [
      ...answers,
      {
        question,
        answer: answer.trim(),
        inputType,
        createdAt: new Date().toISOString(),
      },
    ];

    setAnswers(nextAnswers);
    setIsProcessing(true);

    try {
      const reachedMaxQuestions = nextAnswers.length >= MAX_ONBOARDING_QUESTIONS;
      const step = await getFinancialOnboardingStep({
        history: nextAnswers,
        latestAnswer: answer.trim(),
        maxQuestions: MAX_ONBOARDING_QUESTIONS,
        forceComplete: reachedMaxQuestions,
      });

      if (step.isProfileComplete || reachedMaxQuestions) {
        const payload = {
          completed: true,
          finalQuestionAsked: question,
          profileSummary: step.profileSummary,
          profileData: step.profileData,
          capturedFacts: step.capturedFacts,
          conversation: nextAnswers,
          completionReason: step.completionReason,
          insightsStale: true,
          updatedAt: serverTimestamp(),
          createdBy: user?.uid,
        };

        await setDoc(doc(db, "financialProfiles", user.uid), payload, {
          merge: true,
        });

        await refreshFinancialProfile();
        return;
      }

      setQuestion(step.nextQuestion || FIRST_QUESTION);
      setTextInput("");
      if (!textMode) {
        setStatusText("Toca el micrófono para responder.");
      }
    } catch (error) {
      Alert.alert("Error", error.message || "No se pudo procesar tu respuesta");
      if (!textMode) {
        setStatusText("No se pudo enviar. Inténtalo de nuevo.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendText = async () => {
    await processAnswer(textInput, "text");
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permiso requerido", "Debes permitir acceso al micrófono.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recorder = new Audio.Recording();
      await recorder.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      await recorder.startAsync();
      setRecording(recorder);
      setIsRecording(true);
      setStatusText("Grabando... vuelve a tocar para enviar.");
    } catch (error) {
      Alert.alert("Error", "No se pudo iniciar la grabación.");
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    setIsRecording(false);
    setIsProcessing(true);

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (!uri) {
        throw new Error("No se detectó el audio grabado.");
      }

      const transcript = await transcribeAudioWithOpenAI(uri);
      if (!transcript?.trim()) {
        throw new Error("No se pudo transcribir el audio.");
      }

      await processAnswer(transcript, "audio");
    } catch (error) {
      setIsProcessing(false);
      Alert.alert("Error", error.message || "No se pudo procesar el audio");
      setStatusText("No se pudo enviar el audio. Inténtalo otra vez.");
    }
  };

  const handleMicPress = async () => {
    if (isProcessing) return;
    if (!isRecording) {
      await startRecording();
      return;
    }

    await stopRecording();
  };

  const handleToggleMode = () => {
    if (isRecording) return;

    modePop.value = 0.92;
    modePop.value = withSpring(1, { damping: 12, stiffness: 360 });

    if (textMode) {
      setTextMode(false);
      setStatusText("Toca el micrófono para responder.");
      return;
    }

    setTextMode(true);
  };

  const handleLogout = () => {
    Alert.alert("Cerrar sesión", "¿Quieres cerrar sesión ahora?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar sesión",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
          } catch (error) {
            Alert.alert("Error", "No se pudo cerrar sesión.");
          }
        },
      },
    ]);
  };

  return (
    <LinearGradient colors={theme.gradients.background} style={globalStyles.screen}>
      <FloatingBackground />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.container}>
          <View
            style={[
              styles.content,
              { paddingTop: insets.top + theme.spacing.md + 6 },
            ]}
          >
            <View style={styles.mainArea}>
              <View style={styles.topRow}>
                <Text style={styles.progressLabel}>
                  Pregunta {currentQuestion} de {MAX_ONBOARDING_QUESTIONS}
                </Text>
              </View>

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
              </View>

              {isProcessing ? (
                <Animated.View style={[styles.waitContainer, loadingAnimatedStyle]}>
                  <Image
                    source={MASCOTS[mascotIndex]}
                    style={styles.waitMascot}
                    resizeMode="contain"
                  />
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={styles.waitText}>Esperando a siguiente pregunta...</Text>
                </Animated.View>
              ) : (
                <>
                  <Animated.View style={[styles.mascotContainer, mascotAnimatedStyle]}>
                    <Animated.Image
                      key={`question-mascot-${mascotIndex}`}
                      entering={FadeIn.duration(220)}
                      exiting={FadeOut.duration(160)}
                      source={MASCOTS[mascotIndex]}
                      style={styles.mascot}
                      resizeMode="contain"
                    />
                  </Animated.View>

                  <Animated.View
                    key={`question-${answeredCount}`}
                    entering={FadeIn.duration(240)}
                    exiting={FadeOut.duration(140)}
                    style={styles.questionWrap}
                  >
                    <Text style={styles.questionText}>{question}</Text>
                  </Animated.View>

                  <View style={styles.flexSpacer} />

                  {!textMode ? (
                    <Animated.View style={[styles.micSection, modePopStyle]}>
                      <Animated.View style={micAnimatedStyle}>
                        <TouchableOpacity
                          style={[
                            styles.micButton,
                            isRecording && styles.micButtonRecording,
                          ]}
                          onPress={handleMicPress}
                        >
                          <Ionicons
                            name={isRecording ? "stop" : "mic"}
                            size={40}
                            color={theme.colors.surface}
                          />
                        </TouchableOpacity>
                      </Animated.View>
                      <Text style={styles.statusText}>{statusText}</Text>
                    </Animated.View>
                  ) : null}
                </>
              )}
            </View>

            {!isProcessing && textMode ? (
              <Animated.View
                style={[
                  styles.composerOverlay,
                  modePopStyle,
                  {
                    bottom:
                      keyboardHeight > 0
                        ? keyboardHeight + 6
                        : FOOTER_HEIGHT + insets.bottom + 8,
                  },
                ]}
              >
                <View style={styles.textComposer}>
                  <TextInput
                    value={textInput}
                    onChangeText={setTextInput}
                    placeholder="Escribe tu respuesta"
                    placeholderTextColor={theme.colors.textMuted}
                    style={styles.textInput}
                    multiline
                  />
                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      !textInput.trim() && styles.sendButtonDisabled,
                    ]}
                    onPress={handleSendText}
                    disabled={!textInput.trim()}
                  >
                    <Ionicons
                      name="arrow-forward"
                      size={20}
                      color={theme.colors.surface}
                    />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            ) : null}

            {!isProcessing ? (
              <View style={[styles.fixedFooter, { paddingBottom: insets.bottom + 4 }]}>
                <TouchableOpacity
                  style={styles.switchModeButton}
                  onPress={handleToggleMode}
                  disabled={isRecording}
                >
                  <Text style={styles.switchModeText}>
                    {textMode ? "Prefiero hablar" : "Prefiero escribir"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                  <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableWithoutFeedback>
    </LinearGradient>
  );
};

const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: FOOTER_HEIGHT + theme.spacing.lg,
      alignItems: "center",
    },
    mainArea: {
      flex: 1,
      width: "100%",
      alignItems: "center",
    },
    topRow: {
      width: "100%",
      alignItems: "center",
      marginBottom: theme.spacing.sm,
    },
    progressLabel: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: "800",
    },
    progressTrack: {
      width: "100%",
      height: 10,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surfaceSoft,
      overflow: "hidden",
    },
    progressFill: {
      height: 10,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.success,
    },
    mascotContainer: {
      marginTop: theme.spacing.lg,
      width: 170,
      height: 170,
      alignItems: "center",
      justifyContent: "center",
    },
    mascot: {
      width: 160,
      height: 160,
    },
    questionWrap: {
      marginTop: 2,
      width: "100%",
      minHeight: 108,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      justifyContent: "center",
      ...theme.shadow.card,
    },
    questionText: {
      color: theme.colors.textPrimary,
      fontSize: 24,
      fontWeight: "800",
      lineHeight: 33,
      textAlign: "center",
    },
    micButton: {
      marginTop: theme.spacing.lg,
      width: 110,
      height: 110,
      borderRadius: 55,
      alignSelf: "center",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
      ...theme.shadow.card,
    },
    micSection: {
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: theme.spacing.md,
    },
    micButtonRecording: {
      backgroundColor: theme.colors.danger,
    },
    composerOverlay: {
      position: "absolute",
      left: theme.spacing.lg,
      right: theme.spacing.lg,
      zIndex: 20,
    },
    textComposer: {
      width: "100%",
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 10,
      marginBottom: 8,
    },
    textInput: {
      flex: 1,
      minHeight: 84,
      maxHeight: 120,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      color: theme.colors.textPrimary,
      fontSize: 15,
      paddingHorizontal: 14,
      paddingVertical: 12,
      textAlignVertical: "top",
    },
    sendButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 4,
    },
    sendButtonDisabled: {
      opacity: 0.45,
    },
    statusText: {
      marginTop: theme.spacing.sm,
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontWeight: "600",
      textAlign: "center",
    },
    fixedFooter: {
      position: "absolute",
      left: theme.spacing.lg,
      right: theme.spacing.lg,
      bottom: 0,
      paddingTop: theme.spacing.md,
      gap: 10,
      backgroundColor: "transparent",
    },
    flexSpacer: {
      flex: 0.6,
    },
    switchModeButton: {
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.badgeBackground,
      paddingVertical: 9,
      paddingHorizontal: 12,
    },
    switchModeText: {
      color: theme.colors.primary,
      fontSize: 14,
      fontWeight: "700",
    },
    logoutButton: {
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: theme.radius.pill,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    logoutButtonText: {
      color: theme.colors.danger,
      fontSize: 14,
      fontWeight: "800",
    },
    waitContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.md,
    },
    waitMascot: {
      width: 200,
      height: 200,
    },
    waitText: {
      color: theme.colors.textPrimary,
      fontSize: 20,
      fontWeight: "800",
      textAlign: "center",
      lineHeight: 28,
    },
  });

export default FinancialSetupScreen;
