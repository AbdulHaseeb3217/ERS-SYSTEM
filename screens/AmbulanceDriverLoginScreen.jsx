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
  ActivityIndicator,
  Alert,
} from "react-native";
import { CommonActions } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { buildUrl } from "../services/apiConfig";

const COLORS = {
  red: "#DC2626",
  redDark: "#B91C1C",
  text: "#111827",
  subtext: "#6B7280",
  inputBg: "#F9FAFB",
  inputBorder: "#E5E7EB",
  white: "#FFFFFF",
};

export default function AmbulanceDriverLoginScreen({ navigation }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePhoneChange = (val) => {
    const cleaned = val.replace(/[^0-9]/g, "").slice(0, 11);
    setPhone(cleaned);
  };

  const onSignIn = async () => {
    const p = phone.trim();
    const pass = password;

    if (!p || !pass) {
      Alert.alert("Missing info", "Phone and password are required");
      return;
    }

    if (!/^\d{11}$/.test(p)) {
      Alert.alert("Invalid phone", "Phone must be 11 digits (03XXXXXXXXX)");
      return;
    }

    if (pass.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(buildUrl("/api/ambulance_driver/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: p, password: pass }),
      });

      let data = null;
      try {
        data = await res.json();
      } catch (e) {}

      if (!res.ok || !data?.success) {
        Alert.alert("Login Failed", data?.message || "Invalid credentials");
        return;
      }

      const driver = data?.driver;
      const driverId = driver?.id || driver?._id;

      // ✅ FIX: Login hote hi Splash se location utha kar backend par update karna
      try {
        const rawLoc = await AsyncStorage.getItem("userLocation");

        if (rawLoc) {
          const loc = JSON.parse(rawLoc);

          await fetch(buildUrl("/api/ambulance_driver/update-location"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              driverId: driver.id || driver._id,
              lat: loc.latitude,
              lng: loc.longitude,
            }),
          });
        }
      } catch (locErr) {
        console.log("Location Update Error during login:", locErr);
      }

      try {
        await AsyncStorage.setItem(
          "ERS_SESSION",
          JSON.stringify({ role: "ambulance_driver", driver })
        );
      } catch (e) {}

      let activeRideData = null;

      try {
        if (driverId) {
          const activeRes = await fetch(
            buildUrl(`/api/ambulance/active-driver-session/${driverId}`)
          );

          const activeData = await activeRes.json();

          if (activeRes.ok && activeData?.success && activeData?.hasActiveRide) {
            const activeRideStatus =
              activeData?.status || activeData?.request?.status;

            const allowedActiveStatuses = [
              "accepted",
              "in-progress",
              "arrived_at_patient",
              "navigating_to_hospital",
              "payment_pending",
            ];

            if (allowedActiveStatuses.includes(activeRideStatus)) {
              activeRideData = activeData;
            }
          }
        }
      } catch (activeErr) {
        console.log("Active Driver Session Check Error:", activeErr);
      }

      Alert.alert("Success", "Login successful!", [
        {
          text: "OK",
          onPress: () => {
            if (activeRideData?.hasActiveRide) {
              const activeRideStatus =
                activeRideData?.status || activeRideData?.request?.status;

              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [
                    {
                      name: "ActiveAmbulanceRide",
                      params: {
                        request: activeRideData.request,
                        driver: activeRideData.driver || driver,
                        autoHospitalSelection:
                          activeRideStatus === "arrived_at_patient" ||
                          activeRideStatus === "navigating_to_hospital" ||
                          activeRideStatus === "payment_pending",
                      },
                    },
                  ],
                })
              );
            } else {
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: "AmbulanceDriverMenu", params: { driver } }],
                })
              );
            }
          },
        },
      ]);
    } catch (e) {
      console.log("LOGIN ERROR =>", e);
      Alert.alert("Network Error", "Check your server / WiFi connection");
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
              source={{
                uri: "https://cdn-icons-png.flaticon.com/512/2966/2966327.png",
              }}
              style={styles.headerIcon}
            />
          </View>

          <Text style={styles.headerTitle}>Ambulance Driver Login</Text>

          <Text style={styles.headerSubtitle}>
            Access your rides, deliveries & job details
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
                editable={!loading}
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
                editable={!loading}
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={onSignIn}
            activeOpacity={0.9}
            style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("DForgotPass")}
            style={styles.linkRight}
            disabled={loading}
          >
            <Text style={styles.linkText}>Forgot Password?</Text>
          </TouchableOpacity>

          <View style={styles.hr} />

          <Text style={styles.footerText}>
            Don&apos;t have an account?{" "}
            <Text
              onPress={() => navigation.navigate("ADriverRegister")}
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
  safe: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },

  container: {
    flex: 1,
    paddingHorizontal: 22,
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    alignItems: "center",
    marginBottom: 14,
  },

  headerIconWrap: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: "#FEECEC",
    borderWidth: 3,
    borderColor: "#F5B6B6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  headerIcon: {
    width: 42,
    height: 42,
    tintColor: COLORS.red,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.redDark,
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

  field: {
    width: "100%",
    marginTop: 10,
  },

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

  leftIcon: {
    width: 20,
    height: 20,
    tintColor: COLORS.redDark,
    marginRight: 10,
  },

  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },

  primaryBtn: {
    height: 48,
    backgroundColor: COLORS.red,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    elevation: 2,
  },

  primaryBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
  },

  linkRight: {
    alignSelf: "flex-end",
    marginTop: 12,
  },

  linkText: {
    color: COLORS.red,
    fontSize: 13,
    fontWeight: "600",
  },

  hr: {
    height: 1,
    backgroundColor: COLORS.inputBorder,
    width: "100%",
    marginVertical: 16,
  },

  footerText: {
    color: COLORS.subtext,
    fontSize: 13,
    textAlign: "center",
  },

  registerLink: {
    color: COLORS.red,
    fontWeight: "700",
  },
});