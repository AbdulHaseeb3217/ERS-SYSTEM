import React, { useCallback, useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { buildUrl } from "../services/apiConfig";
import { useFocusEffect } from "@react-navigation/native";

const COLORS = {
  bg: "#F6F7F9",
  white: "#FFFFFF",
  text: "#0F172A",
  sub: "#64748B",
  border: "#E5E7EB",
  brand: "#DC2626",
  green: "#16A34A",
};

export default function AmbulanceDriverSupportChatScreen({ navigation, route }) {
  const [driver, setDriver] = useState(route?.params?.driver || null);
  const [driverId, setDriverId] = useState(route?.params?.driverId || null);

  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [subject, setSubject] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);

  const loadDriverSession = async () => {
    let savedDriver = null;

    try {
      const session = await AsyncStorage.getItem("ERS_SESSION");

      if (session) {
        const parsed = JSON.parse(session);
        savedDriver =
          parsed?.driver ||
          parsed?.user ||
          parsed?.ambulanceDriver ||
          parsed ||
          null;
      }
    } catch (error) {
      console.log("Driver session parse error:", error.message);
    }

    const finalDriver = driver || savedDriver;
    const finalDriverId =
      driverId || finalDriver?._id || finalDriver?.id || null;

    if (!driver && finalDriver) {
      setDriver(finalDriver);
    }

    if (!driverId && finalDriverId) {
      setDriverId(finalDriverId);
    }

    return {
      id: finalDriverId,
      data: finalDriver,
    };
  };

  const loadChats = async () => {
    try {
      setLoading(true);

      const session = await loadDriverSession();

      if (!session.id) return;

      const res = await fetch(
        buildUrl(`/api/support-chats/user/ambulance_driver/${session.id}`)
      );

      const data = await res.json();

      if (res.ok && data.success) {
        setChats(data.chats || []);
      } else {
        setChats([]);
      }
    } catch (error) {
      console.log("Load ambulance driver support chats error:", error.message);
      setChats([]);
    } finally {
      setLoading(false);
    }
  };

  const openChat = async (chat) => {
    try {
      const res = await fetch(
        buildUrl(`/api/support-chats/${chat.id}?readerType=user`)
      );

      const data = await res.json();

      if (res.ok && data.success) {
        setSelectedChat(data.chat);
        loadChats();
      }
    } catch (error) {
      Alert.alert("Error", "Unable to open chat. Please try again.");
    }
  };

  const createTicket = async () => {
    if (!subject.trim() || !firstMessage.trim()) {
      Alert.alert("Required", "Please enter both the subject and message..");
      return;
    }

    try {
      setCreating(true);

      const session = await loadDriverSession();

      if (!session.id) {
        Alert.alert("Session Error", "Driver ID missing. Please login again.");
        return;
      }

      const res = await fetch(buildUrl("/api/support-chats/create"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: session.id,
          userType: "ambulance_driver",
          userName:
            session.data?.fullName ||
            session.data?.name ||
            "Ambulance Driver",
          userPhone: session.data?.phone || "",
          subject: subject.trim(),
          message: firstMessage.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSubject("");
        setFirstMessage("");
        setSelectedChat(data.chat);
        loadChats();
      } else {
        Alert.alert("Error", data.message || "Failed to send the message. Please try again.");
      }
    } catch (error) {
      Alert.alert("Error", "Network error");
    } finally {
      setCreating(false);
    }
  };

  const sendReply = async () => {
    if (!selectedChat?.id || !replyMessage.trim()) return;

    try {
      setSending(true);

      const res = await fetch(
        buildUrl(`/api/support-chats/${selectedChat.id}/message`),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            senderType: "user",
            senderName:
              driver?.fullName || driver?.name || "Ambulance Driver",
            message: replyMessage.trim(),
          }),
        }
      );

      const data = await res.json();

      if (res.ok && data.success) {
        setReplyMessage("");
        setSelectedChat(data.chat);
        loadChats();
      } else {
        Alert.alert("Error", data.message || "Failed to send the message. Please try again.");
      }
    } catch (error) {
      Alert.alert("Error", "Network error");
    } finally {
      setSending(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadChats();
    }, [driverId])
  );

  useEffect(() => {
    const interval = setInterval(() => {
      loadChats();

      if (selectedChat?.id) {
        openChat(selectedChat);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [selectedChat?.id]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>

        <Text style={styles.topTitle}>Support Chat</Text>

        <TouchableOpacity onPress={loadChats}>
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.createBox}>
          <Text style={styles.sectionTitle}>Create Message</Text>

          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder="Subject e.g. Request issue"
            placeholderTextColor="#64748B"
            style={styles.input}
          />

          <TextInput
            value={firstMessage}
            onChangeText={setFirstMessage}
            placeholder="Describe your issue..."
            placeholderTextColor="#64748B"
            style={[styles.input, styles.textArea]}
            multiline
          />

          <TouchableOpacity
            style={styles.createBtn}
            onPress={createTicket}
            disabled={creating}
          >
            {creating ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.createBtnText}>Send Message</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>My Messages</Text>

        {loading ? (
          <ActivityIndicator color={COLORS.brand} style={{ marginTop: 20 }} />
        ) : chats.length === 0 ? (
          <Text style={styles.emptyText}>No support messages found.</Text>
        ) : (
          chats.map((chat) => (
            <TouchableOpacity
              key={chat.id}
              style={[
                styles.ticketCard,
                selectedChat?.id === chat.id && styles.ticketActive,
              ]}
              onPress={() => openChat(chat)}
            >
              <View style={styles.ticketTop}>
                <Text style={styles.ticketSubject}>{chat.subject}</Text>

                <Text
                  style={[
                    styles.statusBadge,
                    chat.status === "open"
                      ? styles.statusOpen
                      : styles.statusClosed,
                  ]}
                >
                  {chat.status}
                </Text>
              </View>

              <Text style={styles.lastMessage}>{chat.lastMessage}</Text>

              {chat.unreadForUser > 0 && (
                <Text style={styles.unreadText}>
                  {chat.unreadForUser} new reply
                </Text>
              )}
            </TouchableOpacity>
          ))
        )}

        {selectedChat && (
          <View style={styles.chatBox}>
            <Text style={styles.sectionTitle}>{selectedChat.subject}</Text>

            {(selectedChat.messages || []).map((msg) => {
              const isAdmin = msg.senderType === "admin";

              return (
                <View
                  key={msg.id}
                  style={[
                    styles.messageBubble,
                    isAdmin ? styles.adminBubble : styles.userBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      isAdmin && { color: "#FFFFFF" },
                    ]}
                  >
                    {msg.message}
                  </Text>

                  <Text
                    style={[
                      styles.messageTime,
                      isAdmin && { color: "#FEE2E2" },
                    ]}
                  >
                    {msg.createdAt
                      ? new Date(msg.createdAt).toLocaleString()
                      : ""}
                  </Text>
                </View>
              );
            })}

            {selectedChat.status === "closed" ? (
              <Text style={styles.closedText}>
                This message is closed by admin.
              </Text>
            ) : (
              <View style={styles.replyRow}>
                <TextInput
                  value={replyMessage}
                  onChangeText={setReplyMessage}
                  placeholder="Type message..."
                  placeholderTextColor="#64748B"
                  style={styles.replyInput}
                />

                <TouchableOpacity
                  style={styles.sendBtn}
                  onPress={sendReply}
                  disabled={sending}
                >
                  <Text style={styles.sendText}>
                    {sending ? "..." : "Send"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  topbar: {
    height: 70,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 16,
    paddingTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  backText: {
    color: COLORS.brand,
    fontSize: 15,
    fontWeight: "800",
  },

  topTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: COLORS.text,
  },

  refreshText: {
    color: COLORS.green,
    fontSize: 13,
    fontWeight: "800",
  },

  container: {
    padding: 16,
    paddingBottom: 40,
  },

  createBox: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 10,
  },

  input: {
    height: 46,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    color: COLORS.text,
  },

  textArea: {
    height: 90,
    textAlignVertical: "top",
    paddingTop: 10,
  },

  createBtn: {
    height: 46,
    borderRadius: 10,
    backgroundColor: COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
  },

  createBtnText: {
    color: COLORS.white,
    fontWeight: "900",
  },
  emptyText: {
    color: COLORS.sub,
    fontWeight: "700",
    textAlign: "center",
    marginVertical: 20,
  },

  ticketCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },

  ticketActive: {
    borderColor: COLORS.brand,
    backgroundColor: "#FFF1F2",
  },

  ticketTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  ticketSubject: {
    fontSize: 14,
    fontWeight: "900",
    color: COLORS.text,
    flex: 1,
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },

  statusOpen: {
    backgroundColor: "#DCFCE7",
    color: "#166534",
  },

  statusClosed: {
    backgroundColor: "#E5E7EB",
    color: "#374151",
  },

  lastMessage: {
    marginTop: 7,
    color: COLORS.sub,
    fontSize: 12,
  },

  unreadText: {
    marginTop: 6,
    color: "#DC2626",
    fontSize: 11,
    fontWeight: "900",
  },

  chatBox: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
  },

  messageBubble: {
    maxWidth: "85%",
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
  },

  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#FEE2E2",
  },

  adminBubble: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.brand,
  },

  messageText: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 18,
  },

  messageTime: {
    fontSize: 9,
    color: COLORS.sub,
    marginTop: 6,
  },

  replyRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },

  replyInput: {
    flex: 1,
    height: 44,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    color: COLORS.text,
  },

  sendBtn: {
    width: 70,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.green,
    alignItems: "center",
    justifyContent: "center",
  },

  sendText: {
    color: COLORS.white,
    fontWeight: "900",
  },

  closedText: {
    color: "#DC2626",
    fontWeight: "800",
    textAlign: "center",
    marginTop: 10,
  },
});