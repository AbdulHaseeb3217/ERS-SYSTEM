import React, { useState } from "react";
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { CommonActions } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { buildUrl } from "../services/apiConfig";

export default function PatientLoginScreen({ navigation }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSignIn = async () => {
    if (!phone.trim() || !password) {
      Alert.alert("Missing Info", "Please enter phone and password.");
      return;
    }

    try {
      setLoading(true);

      const payload = { phone: phone.trim(), password };

      const response = await fetch(buildUrl("/api/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data = null;
      try {
        data = await response.json();
      } catch (e) {}

      if (!response.ok) {
        const msg =
          data?.message ||
          data?.error ||
          "Login failed. Please check your credentials.";
        Alert.alert("Login Failed", msg);
        return;
      }

      const patient = data?.patient;

      
      try {
        await AsyncStorage.setItem(
          "ERS_SESSION",
          JSON.stringify({ role: "patient", patient })
        );

        // 2. Patient ka pura data alag se (New logic for persistence)
        await AsyncStorage.setItem("patientData", JSON.stringify(patient));

        // 3. Patient ID separately (Quick access ke liye)
        if (patient?._id || patient?.id) {
          await AsyncStorage.setItem("patientId", patient._id || patient.id);
        }
      } catch (e) {
        console.log("AsyncStorage Error:", e);
      }

      Alert.alert("Success", data?.message || "Login successful", [
        {
          text: "OK",
          onPress: () => {
            setPhone("");
            setPassword("");

            
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: "PatientMenu", params: { patient } }],
              })
            );
          },
        },
      ]);
    } catch (err) {
      console.log("LOGIN ERROR =>", err);
      Alert.alert(
        "Network Error",
        "Unable to connect to server. Make sure your phone and laptop are on the same Wi-Fi and the server is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const onForgot = () => navigation.navigate("Forgot");
  const onRegister = () => navigation.navigate("PatientRegister");

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.centerBox}>
          <Image
            source={{
              uri: "https://cdn-icons-png.flaticon.com/512/2966/2966327.png",
            }}
            style={styles.logo}
          />

          <Text style={styles.title}>Emergency Response System</Text>
          <Text style={styles.subtitle}>
            Sign in to access emergency services
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputContainer}>
              <Image
                source={{
                  uri: "https://cdn-icons-png.flaticon.com/512/597/597177.png",
                }}
                style={styles.icon}
              />
              <TextInput
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="Enter your phone number"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <Image
                source={{
                  uri: "https://cdn-icons-png.flaticon.com/512/3064/3064155.png",
                }}
                style={styles.icon}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Enter your password"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={onSignIn}
            activeOpacity={0.9}
            style={styles.primaryBtn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={onForgot} style={styles.linkWrap}>
            <Text style={styles.linkText}>Forgot Password?</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <Text style={styles.footerText}>Don't have an account?</Text>
          <TouchableOpacity
            onPress={onRegister}
            activeOpacity={0.85}
            style={styles.outlineBtn}
            disabled={loading}
          >
            <Text style={styles.outlineBtnText}>Register as New Patient</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const COLORS = {
  blue: "#2563EB",
  blueDark: "#1E40AF",
  text: "#111827",
  subtext: "#6B7280",
  inputBg: "#F9FAFB",
  inputBorder: "#E5E7EB",
  white: "#FFFFFF",
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.white },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  centerBox: { width: "100%", alignItems: "center" },
  logo: { width: 100, height: 100, marginBottom: 20 },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.subtext,
    marginTop: 8,
    marginBottom: 18,
    textAlign: "center",
  },
  field: { width: "100%", marginTop: 10 },
  label: {
    fontSize: 13,
    color: COLORS.text,
    marginBottom: 6,
    fontWeight: "600",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    backgroundColor: COLORS.inputBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },
  icon: { width: 20, height: 20, marginRight: 10, tintColor: "#6B7280" },
  input: { flex: 1, fontSize: 15, color: COLORS.text },
  primaryBtn: {
    width: "100%",
    height: 48,
    backgroundColor: COLORS.blue,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    elevation: 2,
  },
  primaryBtnText: { color: COLORS.white, fontSize: 16, fontWeight: "700" },
  linkWrap: { marginTop: 12 },
  linkText: { color: COLORS.blue, fontSize: 13, fontWeight: "600" },
  divider: {
    height: 1,
    backgroundColor: COLORS.inputBorder,
    width: "100%",
    marginVertical: 16,
  },
  footerText: { color: COLORS.subtext, fontSize: 13, marginBottom: 8 },
  outlineBtn: {
    height: 46,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineBtnText: { color: COLORS.blue, fontWeight: "700", fontSize: 14 },
});
