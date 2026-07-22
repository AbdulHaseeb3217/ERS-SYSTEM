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

const bikeIcon = require("../assets/sportbike.png");

import { buildUrl } from "../services/apiConfig";

const COLORS = {
  blue: "#2563EB",
  blueDark: "#1E40AF",
  text: "#111827",
  subtext: "#6B7280",
  inputBg: "#F9FAFB",
  inputBorder: "#E5E7EB",
  white: "#FFFFFF",
  headerTint: "#E8F0FF",
  headerBorder: "#BFD4FF",
};

export default function BikeRiderLoginScreen({ navigation }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePhoneChange = (val) => {
    const cleaned = val.replace(/[^0-9]/g, "").slice(0, 11);
    setPhone(cleaned);
  };

  const onSignIn = async () => {
    const trimmedPhone = phone.trim();
    const phoneRegex = /^\d{11}$/;

    if (!trimmedPhone || !password) {
      Alert.alert("Missing info", "Please enter phone and password.");
      return;
    }

    if (!phoneRegex.test(trimmedPhone)) {
      Alert.alert("Invalid phone", "Phone must be 11 digits (e.g. 03XXXXXXXXX).");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(buildUrl("/api/bike_rider/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: trimmedPhone, password }),
      });

      let data = null;
      try {
        data = await res.json();
      } catch (e) {}

      if (!res.ok || !data?.success) {
        const msg = data?.message || "Login failed. Please check credentials.";
        Alert.alert("Login Error", msg);
        return;
      }

      const rider = data?.rider || null;
      const riderId = rider?._id || rider?.id || null;

    
      try {
        await AsyncStorage.setItem(
          "ERS_SESSION",
          JSON.stringify({ role: "bike_rider", riderId, rider })
        );
      } catch (e) {}

      Alert.alert("Success", "Login successful.", [
        {
          text: "OK",
          onPress: () => {
           
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: "BikeRiderMenu", params: { riderId, rider } }],
              })
            );
          },
        },
      ]);
    } catch (err) {
      console.log("BIKE RIDER LOGIN ERROR =>", err);
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
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FA" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <View style={styles.headerIconWrap}>
            <Image
              source={ bikeIcon }
              style={styles.headerIcon}
            />
          </View>
          <Text style={styles.headerTitle}>Bike Rider Login</Text>
          <Text style={styles.headerSubtitle}>
            Sign in to manage your rides & deliveries
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>Sign in to continue</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Contact Number</Text>
            <View style={styles.inputContainer}>
              <Image
                source={{
                  uri: "https://cdn-icons-png.flaticon.com/512/597/597177.png",
                }}
                style={styles.leftIcon}
              />
              <TextInput
                value={phone}
                onChangeText={handlePhoneChange}
                keyboardType="phone-pad"
                placeholder="03XXXXXXXXX"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                autoCapitalize="none"
                maxLength={11}
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
                style={styles.leftIcon}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Enter your password"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                autoCapitalize="none"
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

          <TouchableOpacity
            onPress={() => navigation.navigate("BRiderforgot")}
            style={styles.linkRight}
            disabled={loading}
          >
            <Text style={styles.linkText}>Forgot Password?</Text>
          </TouchableOpacity>

          <View style={styles.hr} />

          <Text style={styles.footerText}>
            Don&apos;t have an account?{" "}
            <Text
              onPress={() => navigation.navigate("BRiderRegister")}
              style={styles.registerLink}
            >
              Register Now
            </Text>
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F7FA" },
  container: {
    flex: 1,
    paddingHorizontal: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  header: { alignItems: "center", marginBottom: 14 },
  headerIconWrap: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: COLORS.headerTint,
    borderWidth: 3,
    borderColor: COLORS.headerBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  headerIcon: { width: 44, height: 44, tintColor: COLORS.blue },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.blueDark,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.subtext,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 8,
  },
  card: {
    width: "100%",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    elevation: 3,
  },
  heading: {
    textAlign: "center",
    color: COLORS.subtext,
    marginBottom: 16,
    fontSize: 15,
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
    height: 48,
    paddingHorizontal: 12,
  },
  leftIcon: { width: 20, height: 20, tintColor: COLORS.blueDark, marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: COLORS.text },
  primaryBtn: {
    height: 48,
    backgroundColor: COLORS.blue,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    elevation: 2,
  },
  primaryBtnText: { color: COLORS.white, fontSize: 16, fontWeight: "700" },
  linkRight: { alignSelf: "flex-end", marginTop: 12 },
  linkText: { color: COLORS.blue, fontSize: 13, fontWeight: "600" },
  hr: {
    height: 1,
    backgroundColor: COLORS.inputBorder,
    width: "100%",
    marginVertical: 16,
  },
  footerText: { color: COLORS.subtext, fontSize: 13, textAlign: "center" },
  registerLink: { color: COLORS.blue, fontWeight: "700" },
});
