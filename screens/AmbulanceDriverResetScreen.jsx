import React, { useState } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { buildUrl } from "../services/apiConfig";
const { height } = Dimensions.get("window");

const COLORS = {
  text: "#111827",
  subtext: "#6B7280",
  red: "#DC2626",
  inputBg: "#FFFFFF",
  inputBorder: "#D1D5DB",
  inputBorderFocus: "#DC2626",
  danger: "#DC2626",
};

export default function ADriverResetScreen({ navigation, route }) {
  const email = route?.params?.email ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [focus, setFocus] = useState({ p1: false, p2: false });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!email) return "Email missing. Go back and try again.";
    if (!newPassword || !confirmPassword) return "Please fill out both fields.";
    if (newPassword.length < 6) return "Password must be at least 6 characters.";
    if (newPassword !== confirmPassword) return "Passwords do not match.";
    return "";
  };

  const handleReset = async () => {
    const msg = validate();
    if (msg) { setError(msg); return; }

    try {
      setError("");
      setLoading(true);

      const res = await fetch(buildUrl("/api/ambulance_driver/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), newPassword }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        Alert.alert("Error", data?.message || "Reset failed");
        return;
      }

      Alert.alert("Success", data.message || "Password reset successful", [
        { text: "OK", onPress: () => navigation.replace("ADriverLogin") },
      ]);
    } catch (err) {
      console.log("RESET ERROR =>", err);
      Alert.alert("Network Error", "Server/WiFi check karo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Set New Password</Text>
          <Text style={styles.subtitle}>Create a strong new password for {email}.</Text>

          <View style={styles.field}>
            <Text style={styles.label}>New password</Text>
            <View style={[styles.inputContainer, focus.p1 && { borderColor: COLORS.inputBorderFocus }]}>
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                value={newPassword}
                onChangeText={(t) => { setNewPassword(t); if (error) setError(""); }}
                onFocus={() => setFocus((f) => ({ ...f, p1: true }))}
                onBlur={() => setFocus((f) => ({ ...f, p1: false }))}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Confirm password</Text>
            <View style={[styles.inputContainer, focus.p2 && { borderColor: COLORS.inputBorderFocus }]}>
              <TextInput
                style={styles.input}
                placeholder="Re-enter new password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); if (error) setError(""); }}
                onFocus={() => setFocus((f) => ({ ...f, p2: true }))}
                onBlur={() => setFocus((f) => ({ ...f, p2: false }))}
              />
            </View>
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
            activeOpacity={0.9}
            onPress={handleReset}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>RESET PASSWORD</Text>}
          </TouchableOpacity>

          <Text style={styles.helperText}>Tip: use at least 6 characters.</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  content: { flex: 1, justifyContent: "center", paddingBottom: height * 0.12 },
  backButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 16,
    left: 16,
    zIndex: 10,
    padding: 12,
    borderRadius: 10,
  },
  backButtonText: { fontSize: 28, color: COLORS.text },
  title: { fontSize: 28, fontWeight: "800", color: COLORS.text },
  subtitle: { fontSize: 15, color: COLORS.subtext, marginTop: 8, marginBottom: 28 },
  field: { marginTop: 10 },
  label: { fontSize: 13, color: COLORS.text, fontWeight: "600", marginBottom: 8 },
  inputContainer: {
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  input: { fontSize: 16, color: COLORS.text },
  error: { color: COLORS.danger, marginTop: 8, fontSize: 12.5 },
  primaryBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.red,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800", letterSpacing: 0.4 },
  helperText: { marginTop: 12, color: COLORS.subtext, fontSize: 12.5, textAlign: "center" },
});
