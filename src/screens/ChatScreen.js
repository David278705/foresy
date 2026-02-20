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
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import {
  createPlan,
  deletePlan,
  subscribeToPlans,
  updatePlan,
} from "../services/plansService";
import FloatingBackground from "../components/FloatingBackground";

const CHAT_COLLECTION = "chatConversations";
const INTRO_MESSAGE =
  "Hey 🦥 Soy milo. Cuéntame qué tienes en mente sobre tu plata y lo pensamos juntos.";
const INTRO_TYPING_SPEED = 22;
const WAVE_BAR_COUNT = 5;
const TAP_TO_LOCK_MS = 650;
const MOVE_TOLERANCE_PX = 22;
const AI_TYPING_CHARS_PER_SEC = 46;
const PAGE_SIZE = 30;
const CACHE_KEY_PREFIX = "@foresy_chat_";

// ─── Cache helpers ───
const getCacheKey = (uid) => `${CACHE_KEY_PREFIX}${uid}`;

const saveMessagesToCache = async (uid, messages) => {
  try {
    await AsyncStorage.setItem(getCacheKey(uid), JSON.stringify(messages));
  } catch {}
};

const loadMessagesFromCache = async (uid) => {
  try {
    const raw = await AsyncStorage.getItem(getCacheKey(uid));
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
};

// ─── Date separator helper ───
// Use local date parts to avoid UTC→local timezone shift bugs
const getDateKey = (timestamp) => {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatDateSeparator = (dateKey) => {
  // dateKey = "YYYY-MM-DD" — parse as local (add T00:00 avoids UTC)
  const parts = dateKey.split("-").map(Number);
  const target = new Date(parts[0], parts[1] - 1, parts[2]);
  if (isNaN(target.getTime())) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((today - target) / 86400000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Ayer";
  const dayNames = [
    "domingo",
    "lunes",
    "martes",
    "miércoles",
    "jueves",
    "viernes",
    "sábado",
  ];
  const monthNames = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ];
  if (diff > 0 && diff < 7)
    return (
      dayNames[target.getDay()].charAt(0).toUpperCase() +
      dayNames[target.getDay()].slice(1)
    );
  return `${target.getDate()} ${monthNames[target.getMonth()]} ${target.getFullYear()}`;
};

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
  const [assistantTypingText, setAssistantTypingText] = useState("");
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);
  const [userPlans, setUserPlans] = useState([]);
  const [deletingPlanId, setDeletingPlanId] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const messagesRef = useRef([]);
  const plansRef = useRef([]);
  const pendingPlanRef = useRef(null);
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
  const isNearBottomRef = useRef(true);

  const micDragX = useSharedValue(0);
  const micDragY = useSharedValue(0);
  const lockHintProgress = useSharedValue(0);
  const micPressScale = useSharedValue(1);
  const mascotPulse = useSharedValue(1);

  // ── Wave bars: 5 independent animated heights ──
  const waveBar0 = useSharedValue(6);
  const waveBar1 = useSharedValue(6);
  const waveBar2 = useSharedValue(6);
  const waveBar3 = useSharedValue(6);
  const waveBar4 = useSharedValue(6);
  const waveBarValues = [waveBar0, waveBar1, waveBar2, waveBar3, waveBar4];
  const WAVE_HEIGHTS = [10, 18, 26, 18, 10]; // symmetric bell shape
  const WAVE_DURATIONS = [380, 280, 220, 300, 420]; // different speeds

  const waveBarStyles = waveBarValues.map((val) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAnimatedStyle(() => ({ height: val.value }))
  );

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    plansRef.current = userPlans;
  }, [userPlans]);

  // Subscribe to user plans from Firestore
  useEffect(() => {
    if (!user?.uid) {
      setUserPlans([]);
      return;
    }
    const unsub = subscribeToPlans(user.uid, (plans) => {
      setUserPlans(plans);
    });
    return () => unsub();
  }, [user?.uid]);

  // ── Inverted FlatList: index 0 = bottom = most recent message ──
  // scrollToOffset(0) = go to bottom (most recent)
  const scrollToBottom = useCallback((animated = true) => {
    listRef.current?.scrollToOffset?.({ offset: 0, animated });
  }, []);

  const scrollToBottomIfNear = useCallback(
    (animated = true) => {
      if (isNearBottomRef.current) {
        scrollToBottom(animated);
      }
    },
    [scrollToBottom],
  );

  const handleScroll = useCallback((e) => {
    const { contentOffset } = e.nativeEvent;
    // In inverted list, offset 0 = bottom. Near bottom = small offset.
    isNearBottomRef.current = contentOffset.y < 120;
  }, []);

  // Keyboard: only scroll if already near bottom
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () =>
      scrollToBottomIfNear(false),
    );
    return () => {
      showSub.remove();
    };
  }, [scrollToBottomIfNear]);

  const persistMessages = useCallback(
    async (nextMessages) => {
      if (!user?.uid) return;

      // Save to local cache first (fast)
      saveMessagesToCache(user.uid, nextMessages);

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
      setVisibleCount((prev) => prev + items.length);
      try {
        await persistMessages(next);
      } catch (error) {}
      scrollToBottom(true);
    },
    [persistMessages, scrollToBottom],
  );

  const handleDeletePlan = useCallback(
    async (planId) => {
      try {
        setDeletingPlanId(planId);
        await deletePlan(planId);
        const next = messagesRef.current.filter(
          (m) => !(m.role === "plan-notice" && m.planId === planId),
        );
        setMessages(next);
        try {
          await persistMessages(next);
        } catch (e) {}
      } catch (error) {
        // silently fail
      } finally {
        setDeletingPlanId(null);
      }
    },
    [persistMessages],
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

        // 1. Load from cache immediately (instant)
        const cached = await loadMessagesFromCache(user.uid);
        if (alive && Array.isArray(cached) && cached.length > 0) {
          setMessages(cached);
          setVisibleCount(Math.min(cached.length, PAGE_SIZE));
          setHasStartedChat(true);
          setHydrated(true);
          // Inverted list auto-shows bottom — no manual scroll needed
        }

        // 2. Then sync from Firestore in background
        const chatRef = doc(db, CHAT_COLLECTION, user.uid);
        const chatSnap = await getDoc(chatRef);

        if (!alive) return;

        const stored = chatSnap.data()?.messages;
        if (Array.isArray(stored) && stored.length > 0) {
          const cachedLen = cached?.length || 0;
          if (stored.length !== cachedLen || !cached) {
            setMessages(stored);
            setVisibleCount(Math.min(stored.length, PAGE_SIZE));
            saveMessagesToCache(user.uid, stored);
          }
          setHasStartedChat(true);
        } else if (!cached || cached.length === 0) {
          setMessages([]);
          setHasStartedChat(false);
        }
      } catch (error) {
        if (alive && (!messages || messages.length === 0)) {
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

  // Inverted list starts at bottom automatically — no hydration scroll needed

  useEffect(() => {
    if (!sending) return;
    scrollToBottomIfNear(false);
  }, [scrollToBottomIfNear, sending]);

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

  // ── Wave bar animation: start looping when recording, stop when done ──
  useEffect(() => {
    if (isRecording) {
      waveBarValues.forEach((bar, i) => {
        const minH = 4;
        const maxH = WAVE_HEIGHTS[i];
        const dur = WAVE_DURATIONS[i];
        bar.value = withRepeat(
          withSequence(
            withTiming(maxH, { duration: dur, easing: Easing.inOut(Easing.ease) }),
            withTiming(minH, { duration: dur, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          false,
        );
      });
    } else {
      waveBarValues.forEach((bar) => {
        bar.value = withTiming(6, { duration: 150 });
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

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

  // ── Paginated data for INVERTED FlatList ──
  // Inverted FlatList renders index 0 at bottom.
  // We reverse the slice so newest messages come first (index 0 = bottom).
  // Date separators go AFTER a group's last message (visually ABOVE it when inverted).
  const paginatedData = useMemo(() => {
    const total = messages.length;
    const startIdx = Math.max(0, total - visibleCount);
    const slice = messages.slice(startIdx); // chronological order

    // Build reversed array with date separators
    const result = [];
    let lastDateKey = null;

    // Walk from newest to oldest
    for (let i = slice.length - 1; i >= 0; i--) {
      const msg = slice[i];
      const dateKey = msg.createdAt ? getDateKey(msg.createdAt) : null;

      result.push(msg);

      // Check if next message (older) has a different date → insert separator
      const olderMsg = i > 0 ? slice[i - 1] : null;
      const olderDateKey = olderMsg?.createdAt
        ? getDateKey(olderMsg.createdAt)
        : null;

      if (dateKey && dateKey !== olderDateKey) {
        // This is the first message of this day (chronologically), so place
        // the separator above it. In inverted list, "above" = after in array.
        const label = formatDateSeparator(dateKey);
        if (label) {
          result.push({
            id: `sep-${dateKey}`,
            role: "date-separator",
            text: label,
          });
        }
      }
    }
    return result;
  }, [messages, visibleCount]);

  const canLoadOlder = messages.length > visibleCount;

  const loadOlderMessages = useCallback(() => {
    if (loadingOlder || !canLoadOlder) return;
    setLoadingOlder(true);
    // In inverted FlatList, adding items to the end of the data array
    // (older messages) does NOT shift the scroll position.
    // The user stays where they are — exactly like WhatsApp.
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, messages.length));
      setLoadingOlder(false);
    }, 250);
  }, [loadingOlder, canLoadOlder, messages.length]);

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

    // updateSummary describes WHAT changed, not the full profile summary.
    // Keep the existing profileSummary intact; store updateSummary only in the trace.
    const existingSummary =
      financialProfile?.profileSummary ||
      "Contexto financiero actualizado en conversación.";

    const nextFacts = mergeUniqueFacts(
      financialProfile?.capturedFacts,
      newFacts,
    );
    const traceEntry = {
      at: new Date().toISOString(),
      source: "chat-milo",
      summary: updateSummary || "Actualización desde chat.",
      fields: Object.keys(profileDataPatch || {}).filter((key) =>
        Boolean(`${profileDataPatch?.[key] || ""}`.trim()),
      ),
    };

    await setDoc(
      doc(db, "financialProfiles", user.uid),
      {
        completed: true,
        profileData: mergedData,
        profileSummary: existingSummary,
        capturedFacts: nextFacts,
        insightsStale: true,
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
            // Only scroll every ~8 chars and only if user is near bottom
            if (index % 8 === 0 && isNearBottomRef.current) {
              listRef.current?.scrollToOffset?.({ offset: 0, animated: false });
            }
          }

          if (index >= text.length) {
            assistantTypingFrameRef.current = null;
            setIsAssistantTyping(false);
            setAssistantTypingText("");
            scrollToBottomIfNear(false);
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
    isNearBottomRef.current = true; // user just sent a message, force scroll
    scrollToBottom(true);

    try {
      const ai = await getMiloChatResponse({
        userMessage: userText,
        financialProfile,
        recentMessages: optimisticMessages,
        existingPlans: plansRef.current,
        pendingPlan: pendingPlanRef.current,
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

      // ── Handle plan creation OR modification (AI-driven confirmation) ──
      let createdPlanId = null;
      let finalPlanData = null;
      let updatedPlanId = null;

      if (ai.userConfirmedPlan && pendingPlanRef.current) {
        const pending = pendingPlanRef.current;

        if (pending._isUpdate && pending._planId) {
          // ── MODIFY existing plan ──
          const { _isUpdate, _planId, ...fieldsToUpdate } = pending;
          try {
            await updatePlan(_planId, fieldsToUpdate);
            updatedPlanId = _planId;
          } catch (planError) {
            // Plan update failed silently
          }
        } else {
          // ── CREATE new plan ──
          finalPlanData = pending;
          if (user?.uid && finalPlanData) {
            try {
              createdPlanId = await createPlan(user.uid, finalPlanData);
            } catch (planError) {
              // Plan creation failed silently
            }
          }
        }
        pendingPlanRef.current = null;
      } else if (ai.planUpdateData && ai.planUpdateData.planId) {
        // AI proposes modifying an existing plan → store for confirmation
        const { planId, ...updateFields } = ai.planUpdateData;
        pendingPlanRef.current = {
          _isUpdate: true,
          _planId: planId,
          ...updateFields,
        };
      } else if (ai.pendingPlanData) {
        // AI proposes a new plan → store for later confirmation
        pendingPlanRef.current = ai.pendingPlanData;
      } else if (!ai.pendingPlanData && !ai.userConfirmedPlan && !ai.planUpdateData) {
        // No plan activity — user rejected, topic changed, or no plan context
        if (pendingPlanRef.current) {
          pendingPlanRef.current = null;
        }
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

      if (updatedPlanId) {
        next.push({
          id: `n-upd-${Date.now()}`,
          role: "notice",
          text: "Plan actualizado ✅",
          createdAt: Date.now(),
        });
      }

      if (createdPlanId && finalPlanData) {
        const planType = finalPlanData?.type || "reminder";
        const mascotIndex =
          planType === "reminder" ? 1 : planType === "checklist" ? 2 : 3;
        const planNoticeText =
          planType === "reminder"
            ? `📅 Recordatorio creado: ${finalPlanData.title}`
            : planType === "checklist"
              ? `📋 Plan creado: ${finalPlanData.title}`
              : `🗓️ Sesión programada: ${finalPlanData.title}`;
        next.push({
          id: `p-${Date.now()}`,
          role: "plan-notice",
          text: planNoticeText,
          planId: createdPlanId,
          planType,
          mascotIndex,
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
      const recordingOptions = Audio.RecordingOptionsPresets.HIGH_QUALITY;
      await recording.prepareToRecordAsync(recordingOptions);
      recording.setOnRecordingStatusUpdate((status) => {
        if (!status?.isRecording) return;
        if (typeof status.durationMillis === "number") {
          setRecordingDurationMs(status.durationMillis);
        }
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
          inverted
          data={paginatedData}
          keyExtractor={(item, index) => `${item?.id ?? index}`}
          style={styles.messagesArea}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onScroll={handleScroll}
          scrollEventThrottle={16}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          onEndReached={() => {
            // In inverted list, "end" = scrolling up = older messages
            if (canLoadOlder && !loadingOlder) {
              loadOlderMessages();
            }
          }}
          onEndReachedThreshold={0.3}
          renderItem={({ item }) => {
            if (item.role === "date-separator") {
              return (
                <View style={styles.dateSeparatorWrap}>
                  <View style={styles.dateSeparatorLine} />
                  <Text style={styles.dateSeparatorText}>{item.text}</Text>
                  <View style={styles.dateSeparatorLine} />
                </View>
              );
            }
            if (item.role === "notice") {
              return (
                <View style={styles.noticeWrap}>
                  <Text style={styles.noticeText}>{item.text}</Text>
                </View>
              );
            }

            if (item.role === "plan-notice") {
              const mascotSources = {
                1: require("../../assets/milo/1.webp"),
                2: require("../../assets/milo/2.webp"),
                3: require("../../assets/milo/3.webp"),
              };
              const planColors = {
                reminder: ["#EF4444", "#F87171"],
                checklist: ["#F59E0B", "#FBBF24"],
                session: ["#8B5CF6", "#A78BFA"],
              };
              const planIcons = {
                reminder: "notifications",
                checklist: "checkbox",
                session: "chatbubble-ellipses",
              };
              const colors = planColors[item.planType] || planColors.reminder;
              const icon = planIcons[item.planType] || "notifications";
              const mascot =
                mascotSources[item.mascotIndex] || mascotSources[1];
              const isDeleting = deletingPlanId === item.planId;

              return (
                <View style={styles.planNoticeContainer}>
                  <LinearGradient
                    colors={colors}
                    style={styles.planNoticeCard}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.planNoticeHeader}>
                      <View style={styles.planNoticeIconCircle}>
                        <Ionicons name={icon} size={22} color="#FFF" />
                      </View>
                      <View style={styles.planNoticeTextWrap}>
                        <Text style={styles.planNoticeTitle}>
                          {item.planType === "reminder"
                            ? "📌 Recordatorio creado"
                            : item.planType === "checklist"
                              ? "🎯 Plan de ahorro creado"
                              : "💬 Sesión programada"}
                        </Text>
                        <Text style={styles.planNoticeDescription}>
                          {item.text}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.planDeleteButton}
                      onPress={() => {
                        if (isDeleting) return;
                        // Show inline confirmation
                        setMessages((prev) =>
                          prev.map((m) =>
                            m.id === item.id
                              ? { ...m, confirmDelete: !m.confirmDelete }
                              : m,
                          ),
                        );
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={14}
                        color="rgba(255,255,255,0.9)"
                      />
                    </TouchableOpacity>
                    {item.confirmDelete && (
                      <View style={styles.planConfirmRow}>
                        <Text style={styles.planConfirmText}>
                          ¿Eliminar este plan?
                        </Text>
                        <TouchableOpacity
                          style={styles.planConfirmYes}
                          onPress={() => handleDeletePlan(item.planId)}
                        >
                          <Text style={styles.planConfirmYesText}>
                            {isDeleting ? "..." : "Sí, eliminar"}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.planConfirmNo}
                          onPress={() => {
                            setMessages((prev) =>
                              prev.map((m) =>
                                m.id === item.id
                                  ? { ...m, confirmDelete: false }
                                  : m,
                              ),
                            );
                          }}
                        >
                          <Text style={styles.planConfirmNoText}>Cancelar</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    {/* Corner decoration */}
                    <View style={styles.planCornerDeco}>
                      <View style={styles.planCornerCircle1} />
                      <View style={styles.planCornerCircle2} />
                    </View>
                  </LinearGradient>
                  <Image
                    source={mascot}
                    style={styles.planMascotPeek}
                    resizeMode="contain"
                  />
                </View>
              );
            }

            return (
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
            );
          }}
          ListHeaderComponent={
            sending || isAssistantTyping ? (
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
                ) : (
                  <View style={styles.typingWrapLong}>
                    <View style={styles.typingMascotFixed}>
                      <Animated.Image
                        source={require("../../assets/milo/face.png")}
                        style={[styles.typingMascot, typingMascotStyle]}
                        resizeMode="contain"
                      />
                    </View>
                    <View style={styles.typingBubbleContainer}>
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
                  </View>
                )}
              </View>
            ) : null
          }
          ListFooterComponent={
            <View>
              {loadingOlder ? (
                <View style={styles.loadOlderWrap}>
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.primary}
                  />
                </View>
              ) : null}
              {showIntroTyping ? (
                <View style={styles.introTypingWrap}>
                  <Image
                    source={require("../../assets/milo/face.png")}
                    style={styles.introMascot}
                    resizeMode="contain"
                  />
                  <View
                    style={[
                      styles.messageBubble,
                      styles.assistantMessageBubble,
                    ]}
                  >
                    <Text
                      style={[styles.messageText, styles.assistantMessageText]}
                    >
                      {introTypingText}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            !showIntroTyping ? (
              <View style={styles.emptyStateInverted}>
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
                {waveBarStyles.map((animStyle, i) => (
                  <Animated.View
                    key={`wb-${i}`}
                    style={[styles.waveBar, animStyle]}
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
      gap: theme.spacing.sm,
    },
    emptyState: {
      alignItems: "center",
      maxWidth: 320,
      alignSelf: "center",
    },
    emptyStateInverted: {
      alignItems: "center",
      maxWidth: 320,
      alignSelf: "center",
      transform: [{ scaleY: -1 }],
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
        lineHeight: 23,
      },
      paragraph: {
        marginTop: 2,
        marginBottom: 10,
      },
      strong: {
        color: theme.colors.textPrimary,
        fontWeight: "800",
      },
      em: {
        color: theme.colors.textSecondary,
        fontStyle: "italic",
      },
      heading1: {
        fontSize: 20,
        fontWeight: "800",
        color: theme.colors.textPrimary,
        marginTop: 12,
        marginBottom: 8,
      },
      heading2: {
        fontSize: 18,
        fontWeight: "800",
        color: theme.colors.textPrimary,
        marginTop: 10,
        marginBottom: 6,
      },
      heading3: {
        fontSize: 16,
        fontWeight: "700",
        color: theme.colors.textPrimary,
        marginTop: 8,
        marginBottom: 4,
      },
      bullet_list: {
        marginTop: 4,
        marginBottom: 10,
      },
      ordered_list: {
        marginTop: 4,
        marginBottom: 10,
      },
      list_item: {
        marginBottom: 6,
      },
      bullet_list_icon: {
        marginLeft: 4,
        marginRight: 8,
        color: theme.colors.primary,
        fontSize: 15,
        lineHeight: 23,
      },
      ordered_list_icon: {
        marginLeft: 4,
        marginRight: 8,
        color: theme.colors.primary,
        fontWeight: "700",
        fontSize: 15,
        lineHeight: 23,
      },
      code_inline: {
        backgroundColor: theme.colors.border,
        borderRadius: 4,
        paddingHorizontal: 5,
        paddingVertical: 2,
        fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
        fontSize: 13,
        color: theme.colors.primary,
      },
      fence: {
        backgroundColor: theme.colors.border,
        borderRadius: 8,
        padding: 12,
        marginVertical: 8,
      },
      blockquote: {
        backgroundColor: theme.colors.badgeBackground || "rgba(0,0,0,0.04)",
        borderLeftWidth: 3,
        borderLeftColor: theme.colors.primary,
        paddingLeft: 12,
        paddingVertical: 6,
        marginVertical: 8,
        borderRadius: 4,
      },
      hr: {
        marginVertical: 12,
        backgroundColor: theme.colors.border,
        height: 1,
      },
      link: {
        color: theme.colors.primary,
        textDecorationLine: "underline",
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
      gap: 6,
      alignSelf: "flex-start",
      maxWidth: "95%",
    },
    typingBubble: {
      paddingVertical: 10,
    },
    typingMascotFixed: {
      width: 22,
      height: 22,
      flexShrink: 0,
      marginBottom: 4,
    },
    typingBubbleContainer: {
      flex: 1,
      maxWidth: "90%",
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
      gap: 3,
      flex: 1,
      maxWidth: 60,
    },
    waveBar: {
      width: 3,
      borderRadius: 2,
      backgroundColor: theme.colors.primary,
      height: 6,
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
    // ── Plan notice card (Duolingo-style) ──
    planNoticeContainer: {
      alignSelf: "stretch",
      marginVertical: 8,
      position: "relative",
    },
    planNoticeCard: {
      borderRadius: 20,
      padding: 16,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 8,
    },
    planNoticeHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    planNoticeIconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: "rgba(255,255,255,0.25)",
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: "rgba(255,255,255,0.4)",
    },
    planNoticeTextWrap: {
      flex: 1,
    },
    planNoticeTitle: {
      color: "#FFF",
      fontSize: 14,
      fontWeight: "900",
      marginBottom: 3,
      textShadowColor: "rgba(0,0,0,0.2)",
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 2,
    },
    planNoticeDescription: {
      color: "#FFF",
      fontSize: 13,
      fontWeight: "600",
      opacity: 0.95,
      lineHeight: 18,
    },
    planDeleteButton: {
      position: "absolute",
      top: 10,
      right: 10,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: "rgba(0,0,0,0.2)",
      justifyContent: "center",
      alignItems: "center",
    },
    planConfirmRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 12,
      gap: 8,
    },
    planConfirmText: {
      color: "#FFF",
      fontSize: 13,
      fontWeight: "700",
      flex: 1,
    },
    planConfirmYes: {
      backgroundColor: "rgba(0,0,0,0.3)",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
    },
    planConfirmYesText: {
      color: "#FFF",
      fontSize: 12,
      fontWeight: "800",
    },
    planConfirmNo: {
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    planConfirmNoText: {
      color: "rgba(255,255,255,0.8)",
      fontSize: 12,
      fontWeight: "700",
    },
    planCornerDeco: {
      position: "absolute",
      right: -8,
      bottom: -8,
    },
    planCornerCircle1: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: "rgba(255,255,255,0.1)",
    },
    planCornerCircle2: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: "rgba(255,255,255,0.15)",
      position: "absolute",
      top: 8,
      left: 8,
    },
    planMascotPeek: {
      position: "absolute",
      width: 44,
      height: 44,
      bottom: -6,
      right: 8,
      transform: [{ rotate: "12deg" }],
    },
    // ── Date separators (WhatsApp-style) ──
    dateSeparatorWrap: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 12,
      paddingHorizontal: 8,
      gap: 10,
    },
    dateSeparatorLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
    },
    dateSeparatorText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: "700",
      paddingHorizontal: 8,
      paddingVertical: 3,
      backgroundColor: theme.colors.surfaceSoft || theme.colors.background,
      borderRadius: theme.radius.pill,
      overflow: "hidden",
    },
    // ── Load older messages ──
    loadOlderWrap: {
      alignSelf: "center",
      paddingVertical: 10,
      paddingHorizontal: 18,
      marginBottom: 6,
    },
    loadOlderText: {
      color: theme.colors.primary,
      fontSize: 13,
      fontWeight: "700",
    },
  });

export default ChatScreen;
