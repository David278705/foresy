import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import Markdown from "react-native-markdown-display";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import {
  arrayUnion,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { createGlobalStyles } from "../constants/globalStyles";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { db } from "../services/firebaseConfig";
import { getMiloChatResponse } from "../services/openaiChatService";
import { transcribeAudioWithOpenAI } from "../services/openaiOnboardingService";
import FloatingBackground from "../components/FloatingBackground";

const CHAT_COLLECTION = "chatConversations";
const INTRO_MESSAGE =
  "Hey 🦥 Soy milo. Cuéntame qué tienes en mente sobre tu plata y lo pensamos juntos.";
const INTRO_TYPING_SPEED = 22;
const AUDIO_WAVE_BARS = 11;
const TAP_TO_LOCK_MS = 650;
const MOVE_TOLERANCE_PX = 22;
const AI_TYPING_CHARS_PER_SEC = 46;

const ChatScreen = () => {
  const { theme } = useTheme();
  const { user, financialProfile, refreshFinancialProfile } = useAuth();
  const globalStyles = createGlobalStyles(theme);
  const styles = createStyles(theme);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([]);
  const [hydrated, setHydrated] = useState(false);
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [introTypingText, setIntroTypingText] = useState("");
  const [showIntroTyping, setShowIntroTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingLocked, setIsRecordingLocked] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [recordingCancelled, setRecordingCancelled] = useState(false);
  const [audioMeterLevel, setAudioMeterLevel] = useState(0.2);
  const [assistantTypingText, setAssistantTypingText] = useState("");
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const messagesRef = useRef([]);
  const introTimerRef = useRef(null);
  const recordingRef = useRef(null);
  const transcribingMessageIdRef = useRef(null);
  const micPressStartedAtRef = useRef(0);
  const micMovedRef = useRef(false);
  const pendingReleaseActionRef = useRef(null);
  const micPressActiveRef = useRef(false);
  const micPressSequenceRef = useRef(0);
  const releaseFallbackTimerRef = useRef(null);
  const assistantTypingFrameRef = useRef(null);

  const micDragX = useSharedValue(0);
  const micDragY = useSharedValue(0);
  const lockHintProgress = useSharedValue(0);
  const micPressScale = useSharedValue(1);

  const mascotPulse = useSharedValue(1);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd?.({ animated });
      setTimeout(() => {
        listRef.current?.scrollToEnd?.({ animated });
      }, 70);
      setTimeout(() => {
        listRef.current?.scrollToEnd?.({ animated });
      }, 160);
    });
  }, []);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () =>
      scrollToBottom(false),
    );
    return () => {
      showSub.remove();
    };
  }, [scrollToBottom]);

  const persistMessages = useCallback(
    async (nextMessages) => {
      if (!user?.uid) return;

      await setDoc(
        doc(db, CHAT_COLLECTION, user.uid),
        {
          userId: user.uid,
          messages: nextMessages,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    },
    [user?.uid],
  );

  const appendMessages = useCallback(
    async (items) => {
      if (!Array.isArray(items) || items.length === 0) return;
      const next = [...messagesRef.current, ...items];
      setMessages(next);
      try {
        await persistMessages(next);
      } catch (error) {}
      scrollToBottom(true);
    },
    [persistMessages, scrollToBottom],
  );

  useEffect(() => {
    if (!user?.uid) {
      setMessages([]);
      setHydrated(true);
      return;
    }

    let alive = true;

    const loadChat = async () => {
      try {
        setHydrated(false);
        const chatRef = doc(db, CHAT_COLLECTION, user.uid);
        const chatSnap = await getDoc(chatRef);

        if (!alive) return;

        const stored = chatSnap.data()?.messages;
        if (Array.isArray(stored) && stored.length > 0) {
          setMessages(stored);
          setHasStartedChat(true);
        } else {
          setMessages([]);
          setHasStartedChat(false);
        }
      } catch (error) {
        if (alive) {
          setMessages([]);
          setHasStartedChat(false);
        }
      } finally {
        if (alive) {
          setHydrated(true);
        }
      }
    };

    loadChat();

    return () => {
      alive = false;
      if (releaseFallbackTimerRef.current) {
        clearTimeout(releaseFallbackTimerRef.current);
        releaseFallbackTimerRef.current = null;
      }
      if (assistantTypingFrameRef.current) {
        cancelAnimationFrame(assistantTypingFrameRef.current);
        assistantTypingFrameRef.current = null;
      }
      if (introTimerRef.current) {
        clearInterval(introTimerRef.current);
        introTimerRef.current = null;
      }
    };
  }, [user?.uid]);

  const startIntroTyping = useCallback(() => {
    if (showIntroTyping || messagesRef.current.length > 0) return;

    let charIndex = 0;
    setHasStartedChat(true);
    setShowIntroTyping(true);
    setIntroTypingText("");

    introTimerRef.current = setInterval(() => {
      charIndex += 1;
      const nextText = INTRO_MESSAGE.slice(0, charIndex);
      setIntroTypingText(nextText);

      if (charIndex >= INTRO_MESSAGE.length) {
        if (introTimerRef.current) {
          clearInterval(introTimerRef.current);
          introTimerRef.current = null;
        }

        setShowIntroTyping(false);

        appendMessages([
          {
            id: "welcome",
            role: "assistant",
            text: INTRO_MESSAGE,
            isIntro: true,
            createdAt: Date.now(),
          },
        ]);
      }
    }, INTRO_TYPING_SPEED);
  }, [appendMessages, showIntroTyping]);

  useEffect(() => {
    if (!hydrated) return;
    scrollToBottom(false);
  }, [hydrated, messages.length, scrollToBottom]);

  useEffect(() => {
    if (!sending) return;
    scrollToBottom(false);
  }, [scrollToBottom, sending]);

  useEffect(() => {
    if (sending) {
      mascotPulse.value = withRepeat(
        withSequence(
          withTiming(1.06, {
            duration: 500,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
      return;
    }

    mascotPulse.value = withTiming(1, { duration: 180 });
  }, [mascotPulse, sending]);

  const typingMascotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: mascotPulse.value }],
  }));

  const canSend = useMemo(
    () =>
      Boolean(messageText.trim()) &&
      !sending &&
      !isTranscribing &&
      hasStartedChat &&
      !showIntroTyping &&
      !isRecording,
    [
      hasStartedChat,
      isRecording,
      isTranscribing,
      messageText,
      sending,
      showIntroTyping,
    ],
  );

  const showMicButton = useMemo(() => !messageText.trim(), [messageText]);

  const waveBars = useMemo(() => {
    return Array.from({ length: AUDIO_WAVE_BARS }, (_, index) => {
      const ratio = (index + 1) / AUDIO_WAVE_BARS;
      const amplitude = 8 + ratio * 20 * audioMeterLevel;
      return Math.max(6, Math.min(26, Math.round(amplitude)));
    });
  }, [audioMeterLevel]);

  const formatDuration = (durationMs) => {
    const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  const mergeUniqueFacts = (baseFacts = [], newFacts = []) => {
    const all = [...baseFacts, ...newFacts]
      .map((item) => `${item || ""}`.trim())
      .filter(Boolean);
    return [...new Set(all)].slice(0, 80);
  };

  const applyProfileUpdate = async ({
    profileDataPatch,
    updateSummary,
    newFacts,
  }) => {
    if (!user?.uid) return false;

    const previousData = financialProfile?.profileData || {};
    const mergedData = {
      ...previousData,
      ...profileDataPatch,
    };

    const nextSummary =
      updateSummary ||
      financialProfile?.profileSummary ||
      "Contexto financiero actualizado en conversación.";

    const nextFacts = mergeUniqueFacts(
      financialProfile?.capturedFacts,
      newFacts,
    );
    const traceEntry = {
      at: new Date().toISOString(),
      source: "chat-milo",
      summary: nextSummary,
      fields: Object.keys(profileDataPatch || {}).filter((key) =>
        Boolean(`${profileDataPatch?.[key] || ""}`.trim()),
      ),
    };

    await setDoc(
      doc(db, "financialProfiles", user.uid),
      {
        completed: true,
        profileData: mergedData,
        profileSummary: nextSummary,
        capturedFacts: nextFacts,
        contextUpdateHistory: arrayUnion(traceEntry),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    await refreshFinancialProfile();
    return true;
  };

  const hasMeaningfulPatch = (patch = {}) => {
    const allowedKeys = [
      "personalContext",
      "incomeContext",
      "expenseContext",
      "debtContext",
      "savingsAndInvestments",
      "goals",
      "riskAndConcerns",
      "decisionStyle",
    ];

    return allowedKeys.some((key) => {
      const value = `${patch?.[key] || ""}`.trim();
      return Boolean(value);
    });
  };

  const animateAssistantMessage = useCallback(
    (fullText) =>
      new Promise((resolve) => {
        const text = `${fullText || ""}`;
        if (!text.trim()) {
          resolve();
          return;
        }

        if (assistantTypingFrameRef.current) {
          cancelAnimationFrame(assistantTypingFrameRef.current);
          assistantTypingFrameRef.current = null;
        }

        let index = 0;
        let carry = 0;
        let lastTs = 0;
        let pauseUntil = 0;

        setIsAssistantTyping(true);
        setAssistantTypingText("");

        const frame = (ts) => {
          if (!lastTs) {
            lastTs = ts;
          }

          const delta = ts - lastTs;
          lastTs = ts;

          if (ts < pauseUntil) {
            assistantTypingFrameRef.current = requestAnimationFrame(frame);
            return;
          }

          carry += (delta / 1000) * AI_TYPING_CHARS_PER_SEC;
          let changed = false;

          while (carry >= 1 && index < text.length) {
            index += 1;
            carry -= 1;
            changed = true;

            const prev = text.charAt(index - 1);
            if (prev === "." || prev === "!" || prev === "?") {
              pauseUntil = ts + 85;
              break;
            }
            if (prev === "," || prev === ";" || prev === ":") {
              pauseUntil = ts + 48;
              break;
            }
            if (prev === "\n") {
              pauseUntil = ts + 60;
              break;
            }
          }

          if (changed) {
            setAssistantTypingText(text.slice(0, index));
            if (index % 2 === 0) {
              listRef.current?.scrollToEnd?.({ animated: true });
            }
          }

          if (index >= text.length) {
            assistantTypingFrameRef.current = null;
            setIsAssistantTyping(false);
            setAssistantTypingText("");
            scrollToBottom(false);
            resolve();
            return;
          }

          assistantTypingFrameRef.current = requestAnimationFrame(frame);
        };

        assistantTypingFrameRef.current = requestAnimationFrame(frame);
      }),
    [scrollToBottom],
  );

  const sendUserText = async (textToSend, options = {}) => {
    const { existingUserMessageId } = options;
    const userText = `${textToSend || ""}`.trim();
    if (!userText || sending || showIntroTyping || !hasStartedChat) return;

    Keyboard.dismiss();

    setMessageText("");
    inputRef.current?.clear();

    setSending(true);

    const optimisticMessages = existingUserMessageId
      ? messagesRef.current
      : [
          ...messagesRef.current,
          {
            id: `u-${Date.now()}`,
            role: "user",
            text: userText,
            createdAt: Date.now(),
          },
        ];
    setMessages(optimisticMessages);
    try {
      await persistMessages(optimisticMessages);
    } catch (error) {}
    scrollToBottom(true);

    try {
      const ai = await getMiloChatResponse({
        userMessage: userText,
        financialProfile,
        recentMessages: optimisticMessages,
      });

      const assistantMessageText =
        ai.requiresClarification && ai.clarifyingQuestion
          ? `${ai.assistantMessage}\n\n${ai.clarifyingQuestion}`
          : ai.assistantMessage;

      let didUpdateProfile = false;
      if (
        ai.shouldUpdateProfile &&
        !ai.requiresClarification &&
        hasMeaningfulPatch(ai.profileDataPatch)
      ) {
        didUpdateProfile = await applyProfileUpdate({
          profileDataPatch: ai.profileDataPatch,
          updateSummary: ai.updateSummary,
          newFacts: ai.newFacts,
        });
      }

      setSending(false);
      await animateAssistantMessage(assistantMessageText);

      const next = [
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: assistantMessageText,
          createdAt: Date.now(),
        },
      ];

      if (didUpdateProfile) {
        next.push({
          id: `n-${Date.now()}`,
          role: "notice",
          text: ai.updateNotice || "He actualizado tu situación financiera 🦥",
          createdAt: Date.now(),
        });
      }

      await appendMessages(next);
    } catch (error) {
      setSending(false);
      await appendMessages([
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          text: "Tuve un problema para responderte ahora mismo. Intentemos de nuevo en un momento 🙏",
          createdAt: Date.now(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    await sendUserText(messageText, {});
  };

  const resetRecordingUIState = () => {
    micDragX.value = withTiming(0, { duration: 120 });
    micDragY.value = withTiming(0, { duration: 120 });
    lockHintProgress.value = withTiming(0, { duration: 120 });
    micPressScale.value = withTiming(1, { duration: 120 });
    setAudioMeterLevel(0.2);
  };

  const triggerHaptic = async (kind = "soft") => {
    const isAndroid = Platform.OS === "android";

    try {
      if (kind === "soft") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (isAndroid) Vibration.vibrate(18);
      } else if (kind === "strong") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (isAndroid) Vibration.vibrate(30);
      } else if (kind === "success") {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        if (isAndroid) Vibration.vibrate([0, 20, 40, 20]);
      } else if (kind === "warning") {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning,
        );
        if (isAndroid) Vibration.vibrate([0, 25, 35, 25]);
      }
    } catch (error) {
      if (kind === "soft") {
        Vibration.vibrate(18);
        return;
      }

      if (kind === "strong") {
        Vibration.vibrate(30);
        return;
      }

      Vibration.vibrate([0, 25, 35, 25]);
    }
  };

  const upsertTranscribingBubble = async ({
    text,
    pending,
    failed = false,
  }) => {
    const messageId = transcribingMessageIdRef.current;
    if (!messageId) return;

    const updated = messagesRef.current.map((message) =>
      message.id === messageId
        ? {
            ...message,
            text,
            pending,
            failed,
          }
        : message,
    );

    setMessages(updated);
    try {
      await persistMessages(updated);
    } catch (error) {}
    scrollToBottom(false);
  };

  const pushTranscribingBubble = async () => {
    const transcribingId = `u-audio-${Date.now()}`;
    transcribingMessageIdRef.current = transcribingId;
    await appendMessages([
      {
        id: transcribingId,
        role: "user",
        text: "Transcribiendo audio...",
        pending: true,
        createdAt: Date.now(),
      },
    ]);
  };

  const cancelAudioRecording = async () => {
    const activeRecording = recordingRef.current;
    triggerHaptic("warning");
    micPressActiveRef.current = false;
    pendingReleaseActionRef.current = null;
    setRecordingCancelled(true);
    setIsRecording(false);
    setIsRecordingLocked(false);
    setRecordingDurationMs(0);
    resetRecordingUIState();

    try {
      if (activeRecording) {
        activeRecording.setOnRecordingStatusUpdate(null);
        await activeRecording.stopAndUnloadAsync();
      }
    } catch (error) {
    } finally {
      recordingRef.current = null;
      setAudioMeterLevel(0.2);
      setTimeout(() => setRecordingCancelled(false), 350);
    }
  };

  const startAudioRecording = async (pressSequence) => {
    if (!hasStartedChat || showIntroTyping || sending || isTranscribing) return;

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      const baseOptions = Audio.RecordingOptionsPresets.HIGH_QUALITY;
      const recordingOptions = {
        ...baseOptions,
        ios: {
          ...(baseOptions.ios || {}),
          isMeteringEnabled: true,
        },
      };

      await recording.prepareToRecordAsync(recordingOptions);
      recording.setOnRecordingStatusUpdate((status) => {
        if (!status?.isRecording) return;

        if (typeof status.durationMillis === "number") {
          setRecordingDurationMs(status.durationMillis);
        }

        const metering =
          typeof status.metering === "number" ? status.metering : -60;
        const normalized = Math.max(0.08, Math.min(1, (metering + 60) / 60));
        setAudioMeterLevel(normalized);
      });
      recording.setProgressUpdateInterval(120);
      await recording.startAsync();

      recordingRef.current = recording;
      setIsRecording(true);
      setIsRecordingLocked(false);
      setRecordingCancelled(false);
      resetRecordingUIState();

      const pendingAction = pendingReleaseActionRef.current;

      if (
        pendingAction?.pressSequence === pressSequence &&
        pendingAction?.type === "lock"
      ) {
        pendingReleaseActionRef.current = null;
        lockRecording(true);
      } else if (
        pendingAction?.pressSequence === pressSequence &&
        pendingAction?.type === "finish"
      ) {
        pendingReleaseActionRef.current = null;
        finishAudioRecording();
      } else if (!micPressActiveRef.current) {
        finishAudioRecording();
      }
    } catch (error) {
      setIsRecording(false);
      setIsRecordingLocked(false);
      recordingRef.current = null;
      pendingReleaseActionRef.current = null;
      micPressActiveRef.current = false;
    }
  };

  const finishAudioRecording = async () => {
    const activeRecording = recordingRef.current;
    if (!activeRecording) return;

    micPressActiveRef.current = false;
    pendingReleaseActionRef.current = null;
    if (releaseFallbackTimerRef.current) {
      clearTimeout(releaseFallbackTimerRef.current);
      releaseFallbackTimerRef.current = null;
    }
    setIsRecording(false);
    setIsRecordingLocked(false);
    setIsTranscribing(true);
    resetRecordingUIState();

    try {
      activeRecording.setOnRecordingStatusUpdate(null);
      await activeRecording.stopAndUnloadAsync();
      const audioUri = activeRecording.getURI();
      recordingRef.current = null;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      if (!audioUri) {
        setIsTranscribing(false);
        return;
      }

      await pushTranscribingBubble();

      const transcript = await transcribeAudioWithOpenAI(audioUri);
      const normalizedTranscript = `${transcript || ""}`.trim();

      if (!normalizedTranscript) {
        await upsertTranscribingBubble({
          text: "No pude transcribir el audio.",
          pending: false,
          failed: true,
        });
        return;
      }

      const existingUserMessageId = transcribingMessageIdRef.current;

      await upsertTranscribingBubble({
        text: normalizedTranscript,
        pending: false,
      });
      transcribingMessageIdRef.current = null;
      await sendUserText(normalizedTranscript, { existingUserMessageId });
    } catch (error) {
      await upsertTranscribingBubble({
        text: "No pude procesar el audio.",
        pending: false,
        failed: true,
      });
    } finally {
      transcribingMessageIdRef.current = null;
      setIsTranscribing(false);
      setRecordingDurationMs(0);
    }
  };

  const lockRecording = (force = false) => {
    if (!force && !isRecording) return;
    triggerHaptic("warning");
    setIsRecordingLocked(true);
    lockHintProgress.value = withTiming(1, { duration: 130 });
    micDragY.value = withSpring(-84);
  };

  const audioOverlayStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: micDragX.value }],
  }));

  const lockIndicatorStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isRecording ? 1 : 0, { duration: 120 }),
    transform: [{ translateY: micDragY.value }],
  }));

  const micPressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: micPressScale.value }],
  }));

  const micPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () =>
          showMicButton &&
          hasStartedChat &&
          !showIntroTyping &&
          !sending &&
          !isTranscribing,
        onMoveShouldSetPanResponder: () =>
          showMicButton &&
          hasStartedChat &&
          !showIntroTyping &&
          !sending &&
          !isTranscribing,
        onPanResponderGrant: () => {
          if (!isRecording) {
            micPressSequenceRef.current += 1;
            pendingReleaseActionRef.current = null;
            micPressActiveRef.current = true;
            micPressStartedAtRef.current = Date.now();
            micMovedRef.current = false;
            triggerHaptic("warning");
            micPressScale.value = withTiming(1.1, {
              duration: 140,
              easing: Easing.out(Easing.ease),
            });
            startAudioRecording(micPressSequenceRef.current);
          }
        },
        onPanResponderMove: (_, gestureState) => {
          if (!isRecording || isRecordingLocked) return;

          if (
            Math.abs(gestureState.dx) > MOVE_TOLERANCE_PX ||
            Math.abs(gestureState.dy) > MOVE_TOLERANCE_PX
          ) {
            micMovedRef.current = true;
          }

          micDragX.value = Math.min(0, gestureState.dx);
          micDragY.value = Math.min(0, gestureState.dy);

          if (gestureState.dx < -85) {
            cancelAudioRecording();
            return;
          }

          if (gestureState.dy < -64) {
            lockRecording();
          }
        },
        onPanResponderRelease: () => {
          micPressActiveRef.current = false;
          micPressScale.value = withTiming(1, {
            duration: 140,
            easing: Easing.out(Easing.ease),
          });
          if (recordingCancelled) return;

          const pressDuration = Date.now() - micPressStartedAtRef.current;
          const isTapToLock =
            !micMovedRef.current && pressDuration <= TAP_TO_LOCK_MS;

          if (isTapToLock && !isRecordingLocked) {
            if (isRecording) {
              lockRecording();
            } else {
              pendingReleaseActionRef.current = {
                type: "lock",
                pressSequence: micPressSequenceRef.current,
              };

              if (releaseFallbackTimerRef.current) {
                clearTimeout(releaseFallbackTimerRef.current);
              }
              const currentSequence = micPressSequenceRef.current;
              releaseFallbackTimerRef.current = setTimeout(() => {
                if (
                  micPressSequenceRef.current === currentSequence &&
                  recordingRef.current &&
                  !isRecordingLocked
                ) {
                  lockRecording(true);
                }
              }, 320);
            }
            return;
          }

          if (isRecording && !isRecordingLocked) {
            finishAudioRecording();
            return;
          }

          if (!isRecording && !isRecordingLocked) {
            pendingReleaseActionRef.current = {
              type: "finish",
              pressSequence: micPressSequenceRef.current,
            };
          }
        },
        onPanResponderTerminate: () => {
          micPressActiveRef.current = false;
          micPressScale.value = withTiming(1, {
            duration: 140,
            easing: Easing.out(Easing.ease),
          });
          if (recordingCancelled) return;
          if (isRecording && !isRecordingLocked) {
            finishAudioRecording();
            return;
          }

          if (!isRecording && !isRecordingLocked) {
            pendingReleaseActionRef.current = {
              type: "finish",
              pressSequence: micPressSequenceRef.current,
            };
          }
        },
      }),
    [
      hasStartedChat,
      isRecording,
      isRecordingLocked,
      isTranscribing,
      micPressScale,
      recordingCancelled,
      sending,
      showIntroTyping,
      showMicButton,
    ],
  );

  return (
    <LinearGradient
      colors={theme.gradients.background}
      style={globalStyles.screen}
    >
      <FloatingBackground />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <View style={styles.chatHeader}>
          <Image
            source={require("../../assets/milo/face.png")}
            style={styles.avatar}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.headerTitle}>milo</Text>
            <Text style={styles.headerSubtitle}>Asistente financiero IA</Text>
          </View>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item, index) => `${item?.id ?? index}`}
          style={styles.messagesArea}
          contentContainerStyle={[
            styles.messagesContent,
            messages.length === 0 && styles.emptyMessagesContent,
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onContentSizeChange={() => {
            if (isAssistantTyping) {
              listRef.current?.scrollToEnd?.({ animated: true });
            }
          }}
          renderItem={({ item }) =>
            item.role === "notice" ? (
              <View style={styles.noticeWrap}>
                <Text style={styles.noticeText}>{item.text}</Text>
              </View>
            ) : (
              <View style={item.isIntro ? styles.introMessageWrap : undefined}>
                {item.isIntro ? (
                  <Image
                    source={require("../../assets/milo/face.png")}
                    style={styles.introMascot}
                    resizeMode="contain"
                  />
                ) : null}
                <View
                  style={[
                    styles.messageBubble,
                    item.role === "user"
                      ? styles.userMessageBubble
                      : styles.assistantMessageBubble,
                  ]}
                >
                  {item.role === "assistant" ? (
                    <Markdown style={styles.markdownAssistant}>
                      {item.text}
                    </Markdown>
                  ) : (
                    <Text
                      style={[
                        styles.messageText,
                        item.role === "user"
                          ? styles.userMessageText
                          : styles.assistantMessageText,
                      ]}
                    >
                      {item.text}
                    </Text>
                  )}
                  {item.pending ? (
                    <ActivityIndicator
                      size="small"
                      color={
                        item.role === "user"
                          ? theme.colors.surface
                          : theme.colors.primary
                      }
                      style={styles.pendingLoader}
                    />
                  ) : null}
                </View>
              </View>
            )
          }
          ListFooterComponent={
            <View>
              {sending ? (
                <View style={styles.typingWrap}>
                  <Animated.Image
                    source={require("../../assets/milo/face.png")}
                    style={[styles.typingMascot, typingMascotStyle]}
                    resizeMode="contain"
                  />
                  <Text style={styles.typingText}>milo está pensando...</Text>
                </View>
              ) : isAssistantTyping ? (
                <View style={styles.typingWrapLong}>
                  <Animated.Image
                    source={require("../../assets/milo/face.png")}
                    style={[styles.typingMascot, typingMascotStyle]}
                    resizeMode="contain"
                  />
                  <View
                    style={[
                      styles.messageBubble,
                      styles.assistantMessageBubble,
                      styles.typingBubble,
                    ]}
                  >
                    <Markdown style={styles.markdownAssistant}>
                      {assistantTypingText}
                    </Markdown>
                  </View>
                </View>
              ) : null}
              <View style={styles.listBottomSpacer} />
            </View>
          }
          ListHeaderComponent={
            showIntroTyping ? (
              <View style={styles.introTypingWrap}>
                <Image
                  source={require("../../assets/milo/face.png")}
                  style={styles.introMascot}
                  resizeMode="contain"
                />
                <View
                  style={[styles.messageBubble, styles.assistantMessageBubble]}
                >
                  <Text
                    style={[styles.messageText, styles.assistantMessageText]}
                  >
                    {introTypingText}
                  </Text>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            !showIntroTyping ? (
              <View style={styles.emptyState}>
                <Image
                  source={require("../../assets/milo/2.webp")}
                  style={styles.emptyMascot}
                  resizeMode="contain"
                />
                <Text style={styles.emptyTitle}>Comienza tu chat</Text>
                <Text style={styles.emptyText}>
                  Inicia formalmente tu aventura con milo para conversar sobre
                  decisiones y mantener tu contexto actualizado.
                </Text>
                <TouchableOpacity
                  style={styles.startButton}
                  onPress={startIntroTyping}
                  disabled={!hydrated || hasStartedChat}
                >
                  <Text style={styles.startButtonText}>
                    Iniciar aventura con milo
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />

        <View style={styles.inputBar}>
          {isRecording ? (
            <Animated.View style={[styles.recordingOverlay, audioOverlayStyle]}>
              <Ionicons name="mic" size={16} color={theme.colors.error} />
              <Text style={styles.recordingTimerTextLarge}>
                {formatDuration(recordingDurationMs)}
              </Text>
              <View style={styles.waveTrack}>
                {waveBars.map((barHeight, index) => (
                  <View
                    key={`wave-${index}`}
                    style={[
                      styles.waveBar,
                      {
                        height: barHeight,
                        opacity: 0.35 + (index + 1) / (AUDIO_WAVE_BARS + 2),
                      },
                    ]}
                  />
                ))}
              </View>
              {isRecordingLocked ? (
                <View style={styles.lockedBadge}>
                  <Ionicons
                    name="lock-closed"
                    size={12}
                    color={theme.colors.success}
                  />
                </View>
              ) : null}
            </Animated.View>
          ) : (
            <TextInput
              ref={inputRef}
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Escribe un mensaje..."
              placeholderTextColor={theme.colors.textMuted}
              style={styles.input}
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={handleSend}
              editable={
                hasStartedChat &&
                !showIntroTyping &&
                !isRecording &&
                !isTranscribing
              }
            />
          )}

          {showMicButton ? (
            isRecordingLocked ? (
              <>
                <TouchableOpacity
                  style={styles.trashButtonInline}
                  onPress={cancelAudioRecording}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={theme.colors.error}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.sendButton,
                    styles.recordingButton,
                    (!hasStartedChat || showIntroTyping || sending) &&
                      styles.sendButtonDisabled,
                  ]}
                  disabled={
                    !hasStartedChat ||
                    showIntroTyping ||
                    sending ||
                    isTranscribing
                  }
                  onPress={finishAudioRecording}
                >
                  <Ionicons
                    name="send"
                    size={18}
                    color={theme.colors.surface}
                  />
                </TouchableOpacity>
              </>
            ) : (
              <Animated.View
                {...micPanResponder.panHandlers}
                style={[
                  styles.sendButton,
                  micPressStyle,
                  (isRecording || isTranscribing) && styles.recordingButton,
                  (!hasStartedChat || showIntroTyping || sending) &&
                    styles.sendButtonDisabled,
                ]}
              >
                <Ionicons name="mic" size={18} color={theme.colors.surface} />
              </Animated.View>
            )
          ) : (
            <TouchableOpacity
              style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!canSend || !hasStartedChat || showIntroTyping}
            >
              <Ionicons name="send" size={18} color={theme.colors.surface} />
            </TouchableOpacity>
          )}

          {isRecording && !isRecordingLocked ? (
            <Animated.View style={[styles.lockIndicator, lockIndicatorStyle]}>
              <Ionicons
                name="arrow-up"
                size={12}
                color={theme.colors.textSecondary}
              />
            </Animated.View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: theme.spacing.xl + 12,
    },
    chatHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      gap: 12,
    },
    avatar: {
      width: 46,
      height: 46,
    },
    headerTitle: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      fontWeight: "800",
    },
    headerSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      marginTop: 2,
    },
    messagesArea: {
      flex: 1,
    },
    messagesContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      paddingBottom: theme.spacing.lg + 34,
      gap: theme.spacing.sm,
    },
    listBottomSpacer: {
      height: 34,
    },
    emptyMessagesContent: {
      justifyContent: "center",
      flexGrow: 1,
    },
    emptyState: {
      alignItems: "center",
      maxWidth: 320,
      alignSelf: "center",
    },
    emptyMascot: {
      width: 150,
      height: 150,
      marginBottom: 10,
    },
    emptyTitle: {
      color: theme.colors.textPrimary,
      fontSize: 22,
      fontWeight: "800",
      marginBottom: 8,
    },
    emptyText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 22,
      textAlign: "center",
      marginBottom: theme.spacing.md,
    },
    startButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 18,
      paddingVertical: 12,
      alignSelf: "center",
    },
    startButtonText: {
      color: theme.colors.surface,
      fontSize: 14,
      fontWeight: "800",
    },
    messageBubble: {
      maxWidth: "84%",
      borderRadius: theme.radius.lg,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    userMessageBubble: {
      alignSelf: "flex-end",
      backgroundColor: theme.colors.primary,
      borderBottomRightRadius: 6,
    },
    assistantMessageBubble: {
      alignSelf: "flex-start",
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderBottomLeftRadius: 6,
    },
    introMessageWrap: {
      alignSelf: "flex-start",
      gap: 6,
      marginBottom: 2,
    },
    introTypingWrap: {
      alignSelf: "flex-start",
      gap: 6,
      marginBottom: theme.spacing.sm,
    },
    introMascot: {
      width: 28,
      height: 28,
      marginLeft: 6,
    },
    messageText: {
      fontSize: 15,
      lineHeight: 21,
    },
    userMessageText: {
      color: theme.colors.surface,
    },
    assistantMessageText: {
      color: theme.colors.textPrimary,
    },
    markdownAssistant: {
      body: {
        color: theme.colors.textPrimary,
        fontSize: 15,
        lineHeight: 22,
      },
      paragraph: {
        marginTop: 0,
        marginBottom: 6,
      },
      strong: {
        color: theme.colors.textPrimary,
        fontWeight: "800",
      },
      bullet_list: {
        marginTop: 0,
        marginBottom: 4,
      },
      list_item: {
        marginBottom: 2,
      },
    },
    pendingLoader: {
      marginTop: 6,
      alignSelf: "flex-end",
    },
    noticeWrap: {
      alignSelf: "center",
      backgroundColor: theme.colors.badgeBackground,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    noticeText: {
      color: theme.colors.primary,
      fontSize: 12,
      fontWeight: "700",
    },
    typingWrap: {
      marginTop: theme.spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      alignSelf: "flex-start",
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    typingWrapLong: {
      marginTop: theme.spacing.sm,
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 8,
      alignSelf: "flex-start",
      maxWidth: "95%",
    },
    typingBubble: {
      maxWidth: "86%",
      paddingVertical: 10,
    },
    typingMascot: {
      width: 20,
      height: 20,
    },
    typingText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: "700",
    },
    inputBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      position: "relative",
    },
    recordingOverlay: {
      flex: 1,
      height: 42,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surfaceSoft,
      borderWidth: 1,
      borderColor: theme.colors.border,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      zIndex: 5,
      gap: 8,
      marginRight: 4,
    },
    recordingTimerTextLarge: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: "800",
      minWidth: 56,
      letterSpacing: 0.4,
    },
    waveTrack: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      flex: 1,
      maxWidth: 90,
      marginRight: 4,
    },
    waveBar: {
      width: 3,
      borderRadius: 2,
      backgroundColor: theme.colors.primary,
    },
    recordingSlideHint: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: "700",
      width: 152,
      textAlign: "right",
    },
    lockedBadge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.badgeBackground,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    input: {
      flex: 1,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.surfaceSoft,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
    },
    sendButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    sendButtonDisabled: {
      opacity: 0.45,
    },
    recordingButton: {
      backgroundColor: theme.colors.success,
    },
    lockIndicator: {
      position: "absolute",
      right: 20,
      bottom: 108,
      backgroundColor: theme.colors.surfaceSoft,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.pill,
      width: 24,
      height: 24,
      justifyContent: "center",
      flexDirection: "row",
      alignItems: "center",
      zIndex: 6,
    },
    trashButtonInline: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceSoft,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 6,
    },
  });

export default ChatScreen;
