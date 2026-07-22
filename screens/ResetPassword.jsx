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
  inputBg: "#FFFFFF",
  inputBorder: "#D1D5DB",
  inputBorderFocus: "#2563EB",
  danger: "#DC2626",
};

export default function ResetPassword({ navigation, route }) {
  const email = route?.params?.email ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [focus, setFocus] = useState({ p1: false, p2: false });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!newPassword || !confirmPassword)
      return "Please fill out both fields.";
    if (newPassword.length < 6)
      return "Password must be at least 6 characters.";
    if (newPassword !== confirmPassword) return "Passwords do not match.";
    return "";
  };

  const handleReset = async () => {
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }
    setError("");

    try {
      setLoading(true);


     
      const res = await fetch(buildUrl("/api/reset_password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          newPassword,
        }),
      });

      let data = null;
      try {
        data = await res.json();
      } catch (e) {}

      if (!res.ok || !data?.success) {
        const errMsg =
          data?.message || "Could not update password. Please try again.";
        Alert.alert("Error", errMsg);
        return;
      }

      Alert.alert(
        "Success",
        data?.message || "Password updated successfully.",
        [
          {
            text: "OK",
            onPress: () => navigation.replace("PatientLogin"),
          },
        ]
      );
    } catch (err) {
      console.log("RESET ERROR =>", err);
      Alert.alert(
        "Network Error",
        "Unable to contact server. Please check your internet/Wi-Fi."
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
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Set New Password</Text>
          <Text style={styles.subtitle}>
            Create a strong new password{email ? ` for ${email}` : ""}.
          </Text>

          {/* New password */}
          <View className="field" style={styles.field}>
            <Text style={styles.label}>New password</Text>
            <View
              style={[
                styles.inputContainer,
                focus.p1 && {
                  borderColor: COLORS.inputBorderFocus,
                  shadowOpacity: 0.08,
                },
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                value={newPassword}
                onChangeText={(t) => {
                  setNewPassword(t);
                  if (error) setError("");
                }}
                onFocus={() => setFocus((f) => ({ ...f, p1: true }))}
                onBlur={() => setFocus((f) => ({ ...f, p1: false }))}
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Confirm password */}
          <View style={styles.field}>
            <Text style={styles.label}>Confirm password</Text>
            <View
              style={[
                styles.inputContainer,
                focus.p2 && {
                  borderColor: COLORS.inputBorderFocus,
                  shadowOpacity: 0.08,
                },
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder="Re-enter new password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                value={confirmPassword}
                onChangeText={(t) => {
                  setConfirmPassword(t);
                  if (error) setError("");
                }}
                onFocus={() => setFocus((f) => ({ ...f, p2: true }))}
                onBlur={() => setFocus((f) => ({ ...f, p2: false }))}
                returnKeyType="done"
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
            <Text style={styles.primaryBtnText}>
              {loading ? "Please wait..." : "RESET PASSWORD"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.helperText}>
            Tip: use at least 6 characters with a mix of letters and numbers.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },

  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },

  content: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: height * 0.12,
  },

  backButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 16,
    left: 16,
    zIndex: 10,
    padding: 12,
    borderRadius: 10,
  },
  backButtonText: { fontSize: 28, color: COLORS.text, fontWeight: "400" },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.subtext,
    marginTop: 8,
    marginBottom: 28,
  },

  field: { marginTop: 10 },
  label: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "600",
    marginBottom: 8,
  },
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
  input: {
    fontSize: 16,
    color: COLORS.text,
  },

  error: {
    color: COLORS.danger,
    marginTop: 8,
    fontSize: 12.5,
  },

  primaryBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.blue,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
    shadowColor: COLORS.blue,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 3,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.4,
  },

  helperText: {
    marginTop: 12,
    color: COLORS.subtext,
    fontSize: 12.5,
    textAlign: "center",
  },
});
