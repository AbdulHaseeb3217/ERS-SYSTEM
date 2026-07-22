// screens/BikeRiderForgot.jsx  
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { height } = Dimensions.get("window");

import { buildUrl } from "../services/apiConfig";

const COLORS = {
  text: "#111827",
  subtext: "#6B7280",
  blue: "#2563EB",          
  blueDark: "#1E40AF",
  inputBg: "#FFFFFF",
  inputBorder: "#D1D5DB",
  inputBorderFocus: "#2563EB",
  danger: "#DC2626",
};

export default function BikeRiderForgot({ navigation }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState("");

  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  const handleForgotPassword = async () => {
    const trimmed = email.trim();

    if (!trimmed) {
      setError("Please enter your registered email.");
      return;
    }
    if (!isValidEmail(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    setError("");
    try {
      setLoading(true);

      const res = await fetch(buildUrl("/api/bike_rider/forgot"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      let data = null;
      try {
        data = await res.json();
      } catch (e) {
        console.log("FORGOT JSON PARSE ERROR =>", e);
      }

      if (!res.ok || !data?.success) {
        const msg = data?.message || "No rider found with this email.";
        Alert.alert("Error", msg);
        return;
      }

      Alert.alert("Success", data.message || "Proceed to set your new password.", [
        {
          text: "OK",
          onPress: () =>
            navigation.navigate("BRiderReset", {
              email: trimmed,
            }),
        },
      ]);
    } catch (err) {
      console.log("FORGOT PASSWORD ERROR =>", err);
      Alert.alert(
        "Network Error",
        "Unable to connect to server. Make sure server is running and device is on same Wi-Fi."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        activeOpacity={0.7}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            Enter your registered email below to reset your password.
          </Text>

          {/* Email */}
          <View style={styles.field}>
            <Text style={styles.label}>Email address</Text>
            <View
              style={[
                styles.inputContainer,
                focused && { borderColor: COLORS.inputBorderFocus, shadowOpacity: 0.08 },
                !!error && { borderColor: COLORS.danger },
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder="rider@example.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="done"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (error) setError("");
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                accessibilityLabel="Email address"
              />
            </View>
            {!!error && <Text style={styles.error}>{error}</Text>}
          </View>

         
          <TouchableOpacity
            style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
            onPress={handleForgotPassword}
            activeOpacity={0.9}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Reset password"
          >
            <Text style={styles.primaryBtnText}>
              {loading ? "Please wait..." : "RESET PASSWORD"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.helperText}>
            We’ll check if this email is registered and then allow you to set a new password.
          </Text>
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
  backButtonText: { fontSize: 28, color: COLORS.text, fontWeight: "400" },

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
    shadowColor: COLORS.blue,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    shadowOpacity: 0,
  },
  input: { fontSize: 16, color: COLORS.text },

  error: { color: COLORS.danger, marginTop: 6, fontSize: 12.5 },

  primaryBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.blue,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    shadowColor: COLORS.blue,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 3,
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800", letterSpacing: 0.4 },

  helperText: {
    marginTop: 12,
    color: COLORS.subtext,
    fontSize: 12.5,
    textAlign: "center",
  },
});
