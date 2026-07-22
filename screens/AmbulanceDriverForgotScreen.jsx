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
};

export default function ADriverForgotScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  const handleForgot = async () => {
    const trimmed = email.trim();
    if (!trimmed) { setError("Please enter your registered email."); return; }
    if (!isValidEmail(trimmed)) { setError("Please enter a valid email address."); return; }

    try {
      setError("");
      setLoading(true);

      const res = await fetch(buildUrl("/api/ambulance_driver/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        Alert.alert("Error", data?.message || "Email not found");
        return;
      }

      Alert.alert("Success", data.message || "Email verified", [
        { text: "OK", onPress: () => navigation.navigate("AResetPass", { email: trimmed }) },
      ]);
    } catch (err) {
      console.log("FORGOT ERROR =>", err);
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

      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.content}>
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>Enter your registered email below to reset your password.</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email address</Text>
            <View style={[
              styles.inputContainer,
              focused && { borderColor: COLORS.inputBorderFocus },
              !!error && { borderColor: "#DC2626" },
            ]}>
              <TextInput
                style={styles.input}
                placeholder="driver@example.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={(t) => { setEmail(t); if (error) setError(""); }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
              />
            </View>
            {!!error && <Text style={styles.error}>{error}</Text>}
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
            onPress={handleForgot}
            activeOpacity={0.9}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>RESET PASSWORD</Text>}
          </TouchableOpacity>

          <Text style={styles.helperText}>We’ll verify if this email is registered.</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  backButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 16,
    left: 16,
    zIndex: 10,
    padding: 12,
    borderRadius: 10,
  },
  backButtonText: { fontSize: 28, color: COLORS.text },
  content: { flex: 1, justifyContent: "center", paddingBottom: height * 0.12 },
  title: { fontSize: 28, fontWeight: "800", color: COLORS.text },
  subtitle: { fontSize: 15, color: COLORS.subtext, marginTop: 8, marginBottom: 28 },
  field: { marginTop: 8 },
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
  error: { color: "#DC2626", marginTop: 6, fontSize: 12.5 },
  primaryBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.red,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800", letterSpacing: 0.4 },
  helperText: { marginTop: 12, color: COLORS.subtext, fontSize: 12.5, textAlign: "center" },
});
