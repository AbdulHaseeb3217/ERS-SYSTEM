// screens/PatientRegisterScreen.jsx
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
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
} from "react-native";

import { buildUrl } from "../services/apiConfig";

export default function PatientRegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [emergency, setEmergency] = useState("");
  const [address, setAddress] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const onRegister = async () => {
    const newErrors = {};

    // ===== Required checks =====
    if (!fullName.trim()) newErrors.fullName = "Full name is required";
    if (!phone.trim()) newErrors.phone = "Phone number is required";
    if (!email.trim()) newErrors.email = "Email is required";
    if (!address.trim()) newErrors.address = "Address is required";
    if (!dateOfBirth.trim())
      newErrors.dateOfBirth = "Date of birth is required";
    if (!password) newErrors.password = "Password is required";
    if (!confirm) newErrors.confirm = "Please confirm your password";

    // ===== Format validations =====

    
    const cleanName = fullName.trim();
    const nameRegex = /^[A-Za-z ]+$/;
    if (cleanName && !nameRegex.test(cleanName)) {
      newErrors.fullName = "Name can only contain letters and spaces";
    }

    
    const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dateOfBirth.trim() && !dobRegex.test(dateOfBirth.trim())) {
      newErrors.dateOfBirth = "Use YYYY-MM-DD format (e.g. 2002-05-15)";
    }

    
    const cleanPhone = phone.trim();
    const phoneRegex = /^\d{11}$/;
    if (cleanPhone && !phoneRegex.test(cleanPhone)) {
      newErrors.phone = "Phone must be 11 digits (e.g. 03XXXXXXXXX)";
    }

    
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.com$/i;
    if (cleanEmail && !emailRegex.test(cleanEmail)) {
      newErrors.email =
        "Enter a valid .com email (e.g. user@example.com)";
    }

    
    if (password && password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

   
    if (password && confirm && password !== confirm) {
      newErrors.confirm = "Password and confirm password do not match";
    }

    // ===== If any error, stop submit =====
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const allMsgs = Object.values(newErrors).join("\n");
      Alert.alert("Missing or invalid information", allMsgs);
      return;
    }

    setErrors({});

    // ===== Payload for backend =====
    const payload = {
      fullName: cleanName,
      phone: cleanPhone,
      email: cleanEmail,
      emergencyContact: emergency.trim() || undefined,
      address: address.trim(),
      dateOfBirth: dateOfBirth.trim(),
      password,
    };

    try {
      setLoading(true);

      const response = await fetch(buildUrl("/api/create_patient"), {
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
          "Registration failed. Please try again.";
        Alert.alert("Error", msg);
        return;
      }

      Alert.alert(
        "Registered",
        "Your patient account has been created successfully.",
        [
          {
            text: "OK",
            onPress: () => {
              setFullName("");
              setPhone("");
              setEmail("");
              setEmergency("");
              setAddress("");
              setDateOfBirth("");
              setPassword("");
              setConfirm("");
              setErrors({});
              navigation.navigate("PatientLogin");
            },
          },
        ]
      );
    } catch (err) {
      console.log("REGISTER ERROR =>", err);
      Alert.alert(
        "Network Error",
        "Unable to connect to server. Make sure your phone and laptop are on the same Wi-Fi and the server is running on port 5000."
      );
    } finally {
      setLoading(false);
    }
  };

  const onSignIn = () => {
    navigation.navigate("PatientLogin");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* top round ambulance icon */}
          <View style={styles.badge}>
            <Image
              source={{
                uri: "https://cdn-icons-png.flaticon.com/512/2966/2966327.png",
              }}
              style={{ width: 38, height: 38 }}
            />
          </View>

          <Text style={styles.title}>Patient Registration</Text>
          <Text style={styles.subtitle}>
            Create your account to access emergency services
          </Text>

          {/* Full Name */}
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Full Name *</Text>
              <View
                style={[
                  styles.inputWrap,
                  errors.fullName && { borderColor: "red" },
                ]}
              >
                <Image
                  source={{
                    uri: "https://cdn-icons-png.flaticon.com/512/1077/1077114.png",
                  }}
                  style={styles.icon}
                />
                <TextInput
                  value={fullName}
                  onChangeText={(val) =>
                    setFullName(val.replace(/[^A-Za-z ]/g, ""))
                  } // <-- sirf letters + space
                  placeholder="Enter your full name"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                />
              </View>
              {errors.fullName && (
                <Text style={styles.errorText}>{errors.fullName}</Text>
              )}
            </View>
          </View>

          {/* Phone Number */}
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Phone Number *</Text>
              <View
                style={[
                  styles.inputWrap,
                  errors.phone && { borderColor: "red" },
                ]}
              >
                <Image
                  source={{
                    uri: "https://cdn-icons-png.flaticon.com/512/597/597177.png",
                  }}
                  style={styles.icon}
                />
                <TextInput
                  value={phone}
                  onChangeText={(val) =>
                    setPhone(val.replace(/[^0-9]/g, "").slice(0, 11))
                  } // digits only, max 11
                  keyboardType="number-pad"
                  maxLength={11}
                  placeholder="03XXXXXXXXX"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                />
              </View>
              {errors.phone && (
                <Text style={styles.errorText}>{errors.phone}</Text>
              )}
            </View>
          </View>

          {/* Email */}
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Email *</Text>
              <View
                style={[
                  styles.inputWrap,
                  errors.email && { borderColor: "red" },
                ]}
              >
                <Image
                  source={{
                    uri: "https://cdn-icons-png.flaticon.com/512/561/561127.png",
                  }}
                  style={styles.icon}
                />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="your.email@example.com"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                />
              </View>
              {errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
            </View>
          </View>

          {/* Emergency Contact (optional) */}
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Emergency Contact</Text>
              <View style={styles.inputWrap}>
                <Image
                  source={{
                    uri: "https://cdn-icons-png.flaticon.com/512/455/455705.png",
                  }}
                  style={styles.icon}
                />
                <TextInput
                  value={emergency}
                  onChangeText={(val) =>
                    setEmergency(val.replace(/[^0-9]/g, "").slice(0, 11))
                  }
                  keyboardType="number-pad"
                  maxLength={11}
                  placeholder="Family member's phone"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                />
              </View>
            </View>
          </View>

          {/* Address */}
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Address *</Text>
              <View
                style={[
                  styles.inputWrap,
                  errors.address && { borderColor: "red" },
                ]}
              >
                <Image
                  source={{
                    uri: "https://cdn-icons-png.flaticon.com/512/535/535239.png",
                  }}
                  style={styles.icon}
                />
                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Your home address"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                />
              </View>
              {errors.address && (
                <Text style={styles.errorText}>{errors.address}</Text>
              )}
            </View>
          </View>

          {/* Date of Birth */}
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>
                Date of Birth (YYYY-MM-DD) *
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  errors.dateOfBirth && { borderColor: "red" },
                ]}
              >
                <Image
                  source={{
                    uri: "https://cdn-icons-png.flaticon.com/512/1250/1250689.png",
                  }}
                  style={styles.icon}
                />
                <TextInput
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                  placeholder="2002-05-15"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                />
              </View>
              {errors.dateOfBirth && (
                <Text style={styles.errorText}>{errors.dateOfBirth}</Text>
              )}
            </View>
          </View>

          {/* Password */}
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Password *</Text>
              <View
                style={[
                  styles.inputWrap,
                  errors.password && { borderColor: "red" },
                ]}
              >
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
                  placeholder="Minimum 6 characters"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                />
              </View>
              {errors.password && (
                <Text style={styles.errorText}>{errors.password}</Text>
              )}
            </View>
          </View>

          {/* Confirm Password */}
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Confirm Password *</Text>
              <View
                style={[
                  styles.inputWrap,
                  errors.confirm && { borderColor: "red" },
                ]}
              >
                <Image
                  source={{
                    uri: "https://cdn-icons-png.flaticon.com/512/3064/3064155.png",
                  }}
                  style={styles.icon}
                />
                <TextInput
                  value={confirm}
                  onChangeText={setConfirm}
                  secureTextEntry
                  placeholder="Re-enter password"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                />
              </View>
              {errors.confirm && (
                <Text style={styles.errorText}>{errors.confirm}</Text>
              )}
            </View>
          </View>

          {/* Register button */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={onRegister}
            activeOpacity={0.9}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Register Account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider} />

          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity
            style={styles.outlineBtn}
            onPress={onSignIn}
            activeOpacity={0.85}
            disabled={loading}
          >
            <Text style={styles.outlineBtnText}>Sign In</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const COLORS = {
  blue: "#2563EB",
  text: "#111827",
  subtext: "#6B7280",
  inputBg: "#F9FAFB",
  inputBorder: "#E5E7EB",
  white: "#FFFFFF",
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.white },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 70,
  },
  badge: {
    marginTop: 0,
    marginBottom: 10,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#E0EAFF",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.subtext,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 14,
  },
  row: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 10,
  },
  col: { flex: 1 },
  label: {
    fontSize: 13,
    color: COLORS.text,
    marginBottom: 6,
    fontWeight: "600",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  icon: { width: 20, height: 20, marginRight: 10, tintColor: "#6B7280" },
  input: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    paddingVertical: 0,
  },
  primaryBtn: {
    marginTop: 16,
    width: "100%",
    height: 48,
    backgroundColor: COLORS.blue,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  primaryBtnText: { color: COLORS.white, fontSize: 15.5, fontWeight: "700" },
  divider: {
    height: 1,
    backgroundColor: COLORS.inputBorder,
    width: "100%",
    marginVertical: 16,
  },
  footerText: { color: COLORS.subtext, fontSize: 13, marginBottom: 8 },
  outlineBtn: {
    height: 46,
    width: "100%",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineBtnText: { fontWeight: "700", fontSize: 14, color: COLORS.text },
  errorText: {
    color: "red",
    fontSize: 11,
    marginTop: 4,
  },
});
