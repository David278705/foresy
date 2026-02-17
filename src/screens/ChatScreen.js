import React, { useState } from "react";
import {
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
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
import { createGlobalStyles } from "../constants/globalStyles";
import { useTheme } from "../context/ThemeContext";
import FloatingBackground from "../components/FloatingBackground";

const ChatScreen = () => {
  const { theme } = useTheme();
  const globalStyles = createGlobalStyles(theme);
  const styles = createStyles(theme);
  const [messageText, setMessageText] = useState("");
  const messages = [];

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
            data={messages}
            keyExtractor={(item, index) => `${item?.id ?? index}`}
            style={styles.messagesArea}
            contentContainerStyle={[
              styles.messagesContent,
              messages.length === 0 && styles.emptyMessagesContent,
            ]}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <View
                style={[
                  styles.messageBubble,
                  item.role === "user"
                    ? styles.userMessageBubble
                    : styles.assistantMessageBubble,
                ]}
              >
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
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Image
                  source={require("../../assets/milo/2.webp")}
                  style={styles.emptyMascot}
                  resizeMode="contain"
                />
                <Text style={styles.emptyTitle}>Comienza tu chat</Text>
                <Text style={styles.emptyText}>
                  Hola, soy milo. Estoy listo para ayudarte a tomar mejores
                  decisiones financieras.
                </Text>
              </View>
            }
          />

          <View style={styles.inputBar}>
            <TextInput
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Escribe un mensaje..."
              placeholderTextColor={theme.colors.textMuted}
              style={styles.input}
              returnKeyType="send"
              blurOnSubmit={false}
            />
            <TouchableOpacity style={styles.sendButton}>
              <Ionicons name="send" size={18} color={theme.colors.surface} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
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
    inputBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
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
  });

export default ChatScreen;
