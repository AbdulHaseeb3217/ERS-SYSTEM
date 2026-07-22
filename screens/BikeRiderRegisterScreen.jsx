// screens/BikeRiderRegisterScreen.jsx
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

const COLORS = {
  blue: "#2563EB",
  blueDark: "#1E40AF",
  badgeBg: "#E8F0FF",
  badgeBorder: "#BFD4FF",
  text: "#111827",
  subtext: "#6B7280",
  inputBg: "#F9FAFB",
  inputBorder: "#E5E7EB",
  white: "#FFFFFF",
  error: "#DC2626",
};

export default function BikeRiderRegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cnic, setCnic] = useState("");
  const [cnicImage, setCnicImage] = useState(null);
  const [license, setLicense] = useState("");
  const [bikeNo, setBikeNo] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

 
  const handleNameChange = (val) => {
    const cleaned = val.replace(/[^A-Za-z\s]/g, "");
    setFullName(cleaned);
  };

  
  const handlePhoneChange = (val) => {
    const cleaned = val.replace(/[^0-9]/g, "").slice(0, 11);
    setPhone(cleaned);
  };

 
  const handleCnicChange = (val) => {
    let digits = val.replace(/\D/g, "").slice(0, 13);
    let formatted = digits;

    if (digits.length > 5) formatted = digits.slice(0, 5) + "-" + digits.slice(5);
    if (digits.length > 12) {
      formatted =
        digits.slice(0, 5) +
        "-" +
        digits.slice(5, 12) +
        "-" +
        digits.slice(12, 13);
    }

    setCnic(formatted);
  };

  
  
  const handleLicenseChange = (val) => {
    // keep only digits
    const allDigits = val.replace(/\D/g, "").slice(0, 16);

    const first13 = allDigits.slice(0, 13); 
    const last3 = allDigits.slice(13, 16);  

    let formatted = first13;

    if (first13.length > 5) formatted = first13.slice(0, 5) + "-" + first13.slice(5);
    if (first13.length > 12) {
      formatted =
        first13.slice(0, 5) +
        "-" +
        first13.slice(5, 12) +
        "-" +
        first13.slice(12, 13);
    }

    
    if (first13.length === 13) {
      formatted = formatted + "#" + last3;
    }

    setLicense(formatted.slice(0, 19)); 
  };

  
  const handleBikeNoChange = (val) => {
    
    let raw = val.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

    
    const letters = raw.replace(/[^A-Z]/g, "").slice(0, 3);
    const digits = raw.replace(/[^0-9]/g, "").slice(0, 4);

    // build stepwise
    let formatted = letters;
    if (letters.length === 3) formatted = letters + "-" + digits;

    setBikeNo(formatted.slice(0, 8));
  };

  const pickCnicImage = async () => {
    try {
      const ImagePicker = await import("react-native-image-picker");

      ImagePicker.launchImageLibrary(
        {
          mediaType: "photo",
          quality: 0.8,
          selectionLimit: 1,
          includeBase64: true,
        },
        (res) => {
          if (res.didCancel) return;

          if (res.errorCode) {
            Alert.alert("Picker Error", res.errorMessage || res.errorCode);
            return;
          }

          const a = res.assets?.[0];
          if (!a) return;

          if (!a.base64) {
            Alert.alert(
              "Image Error",
              "CNIC image base64 not received. Please select another image."
            );
            return;
          }

          const mime = a.type || "image/jpeg";
          const dataUri = `data:${mime};base64,${a.base64}`;

          setCnicImage({
            uri: a.uri,
            fileName: a.fileName || "cnic.jpg",
            base64DataUri: dataUri,
          });

          setErrors((prev) => {
            const next = { ...prev };
            delete next.cnicImage;
            return next;
          });
        }
      );
    } catch (err) {
      console.log("CNIC IMAGE PICK ERROR =>", err);
      Alert.alert("Image Picker Missing", "Run: npm i react-native-image-picker");
    }
  };

  const onRegister = async () => {
    const newErrors = {};

    // Required fields
    if (!fullName.trim()) newErrors.fullName = "Full name is required";
    if (!email.trim()) newErrors.email = "Email is required";
    if (!phone.trim()) newErrors.phone = "Contact number is required";
    if (!cnic.trim()) newErrors.cnic = "CNIC number is required";
    if (!cnicImage?.base64DataUri) newErrors.cnicImage = "CNIC image is required";
    if (!license.trim()) newErrors.license = "License number is required";
    if (!bikeNo.trim()) newErrors.bikeNo = "Bike number is required";
    if (!vehicleType.trim()) newErrors.vehicleType = "Vehicle type is required";
    if (!dateOfBirth.trim()) newErrors.dateOfBirth = "Date of birth is required";
    if (!address.trim()) newErrors.address = "Address is required";
    if (!password) newErrors.password = "Password is required";
    if (!confirm) newErrors.confirm = "Please confirm your password";

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email.trim() && !emailRegex.test(email.trim())) {
      newErrors.email = "Invalid email format";
    }

    // Phone validation (11 digits)
    if (phone.trim() && !/^\d{11}$/.test(phone.trim())) {
      newErrors.phone = "Phone must be 11 digits";
    }

    // CNIC validation
    if (cnic.trim() && !/^\d{5}-\d{7}-\d{1}$/.test(cnic.trim())) {
      newErrors.cnic = "CNIC must be 12345-6789012-3";
    }

    
    if (license.trim() && !/^\d{5}-\d{7}-\d{1}#\d{3}$/.test(license.trim())) {
      newErrors.license = "License must be 12345-6789012-8#512";
    }

    
    if (bikeNo.trim() && !/^[A-Z]{3}-\d{4}$/.test(bikeNo.trim())) {
      newErrors.bikeNo = "Bike number must be ABC-1234";
    }

    // DOB validation
    if (dateOfBirth.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth.trim())) {
      newErrors.dateOfBirth = "Date must be YYYY-MM-DD";
    }

    // Password match
    if (password && confirm && password !== confirm) {
      newErrors.confirm = "Password and confirm password must match";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Alert.alert("Invalid Information", Object.values(newErrors).join("\n"));
      return;
    }

    setErrors({});

    const payload = {
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      cnic: cnic.trim(),
      cnicImageUrl: cnicImage?.base64DataUri,
      licenseNumber: license.trim(),
      bikeNumber: bikeNo.trim(),
      vehicleType: vehicleType.trim(),
      dateOfBirth: dateOfBirth.trim(),
      address: address.trim(),
      password,
    };

    try {
      setLoading(true);

      const res = await fetch(buildUrl("/api/bike_rider/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data = null;
      try {
        data = await res.json();
      } catch (e) {}

      if (!res.ok || !data?.success) {
        Alert.alert("Error", data?.message || "Registration failed!");
        return;
      }

      Alert.alert("Success", "Account created successfully!", [
        {
          text: "OK",
          onPress: () => {
            setFullName("");
            setEmail("");
            setPhone("");
            setCnic("");
            setCnicImage(null);
            setLicense("");
            setBikeNo("");
            setVehicleType("");
            setDateOfBirth("");
            setAddress("");
            setPassword("");
            setConfirm("");
            navigation.navigate("BRiderLogin");
          },
        },
      ]);
    } catch (err) {
      console.log("REGISTER ERROR =>", err);
      Alert.alert("Network Error", "Check your server/WiFi connection");
    } finally {
      setLoading(false);
    }
  };

  const onSignIn = () => navigation.navigate("BRiderLogin");

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
        >
          <View style={styles.badge}>
            <Image
              source={{
                uri: "https://cdn-icons-png.flaticon.com/512/2972/2972185.png",
              }}
              style={{ width: 38, height: 38, tintColor: COLORS.blue }}
            />
          </View>

          <Text style={styles.title}>Bike Rider Registration</Text>
          <Text style={styles.subtitle}>Create your account</Text>

          <Field
            label="Full Name *"
            value={fullName}
            onChangeText={handleNameChange}
            placeholder="Enter full name"
            iconUri="https://cdn-icons-png.flaticon.com/512/1077/1077114.png"
            iconTint={COLORS.blueDark}
            error={errors.fullName}
          />

          <Field
            label="Email *"
            value={email}
            onChangeText={setEmail}
            placeholder="example@gmail.com"
            keyboardType="email-address"
            iconUri="https://cdn-icons-png.flaticon.com/512/732/732200.png"
            iconTint={COLORS.blueDark}
            error={errors.email}
          />

          <Field
            label="Contact Number *"
            value={phone}
            onChangeText={handlePhoneChange}
            placeholder="03XXXXXXXXX"
            keyboardType="number-pad"
            maxLength={11}
            iconUri="https://cdn-icons-png.flaticon.com/512/597/597177.png"
            iconTint={COLORS.blueDark}
            error={errors.phone}
          />

          <Field
            label="CNIC Number *"
            value={cnic}
            onChangeText={handleCnicChange}
            placeholder="12345-6789012-3"
            keyboardType="number-pad"
            maxLength={15}
            iconUri="https://cdn-icons-png.flaticon.com/512/992/992700.png"
            iconTint={COLORS.blueDark}
            error={errors.cnic}
          />

          <View style={styles.row}>
            <Text style={styles.label}>CNIC Image *</Text>

            <TouchableOpacity
              style={[
                styles.cnicUploadBox,
                errors.cnicImage && { borderColor: COLORS.error },
              ]}
              onPress={pickCnicImage}
              activeOpacity={0.85}
            >
              {cnicImage ? (
                <View style={styles.cnicImagePreviewWrap}>
                  <Image
                    source={{ uri: cnicImage.uri }}
                    style={styles.cnicImagePreview}
                  />
                  <Text style={styles.cnicImageName} numberOfLines={1}>
                    {cnicImage.fileName}
                  </Text>
                  <Text style={styles.cnicImageReady}>✓ CNIC image ready</Text>
                </View>
              ) : (
                <View style={styles.cnicUploadInner}>
                  <Image
                    source={{
                      uri: "https://cdn-icons-png.flaticon.com/512/4211/4211783.png",
                    }}
                    style={styles.cnicUploadIcon}
                  />
                  <Text style={styles.cnicUploadText}>
                    Tap to upload CNIC picture
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {errors.cnicImage && (
              <Text style={styles.errorText}>{errors.cnicImage}</Text>
            )}
          </View>

          <Field
            label="License Number *"
            value={license}
            onChangeText={handleLicenseChange}
            placeholder="12345-6789012-8#512"
            maxLength={19}
            keyboardType="number-pad"
            iconUri="https://cdn-icons-png.flaticon.com/512/1250/1250899.png"
            iconTint={COLORS.blueDark}
            error={errors.license}
          />

          <Field
            label="Bike Number *"
            value={bikeNo}
            onChangeText={handleBikeNoChange}
            placeholder="ABC-1234"
            maxLength={8}
            iconUri="https://cdn-icons-png.flaticon.com/512/2329/2329244.png"
            iconTint={COLORS.blueDark}
            error={errors.bikeNo}
          />

          <Field
            label="Vehicle Type *"
            value={vehicleType}
            onChangeText={setVehicleType}
            placeholder="Enter vehicle type (e.g. 125cc)"
            iconUri="https://cdn-icons-png.flaticon.com/512/446/446087.png"
            iconTint={COLORS.blueDark}
            error={errors.vehicleType}
          />

          <Field
            label="Date of Birth * (YYYY-MM-DD)"
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            placeholder="2000-05-15"
            iconUri="https://cdn-icons-png.flaticon.com/512/1250/1250689.png"
            iconTint={COLORS.blueDark}
            error={errors.dateOfBirth}
          />

          <Field
            label="Address *"
            value={address}
            onChangeText={setAddress}
            placeholder="House, street, area, city"
            iconUri="https://cdn-icons-png.flaticon.com/512/535/535239.png"
            iconTint={COLORS.blueDark}
            error={errors.address}
          />

          <Field
            label="Password *"
            value={password}
            onChangeText={setPassword}
            placeholder="Min 6 characters"
            secureTextEntry
            iconUri="https://cdn-icons-png.flaticon.com/512/3064/3064155.png"
            iconTint={COLORS.blueDark}
            error={errors.password}
          />

          <Field
            label="Confirm Password *"
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Re-enter password"
            secureTextEntry
            iconUri="https://cdn-icons-png.flaticon.com/512/3064/3064155.png"
            iconTint={COLORS.blueDark}
            error={errors.confirm}
          />

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={onRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider} />

          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity
            style={styles.outlineBtn}
            onPress={onSignIn}
            disabled={loading}
          >
            <Text style={styles.outlineBtnText}>Sign In</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  iconUri,
  iconTint,
  keyboardType = "default",
  secureTextEntry = false,
  error,
  maxLength,
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>

      <View style={[styles.inputWrap, error && { borderColor: COLORS.error }]}>
        <Image
          source={{ uri: iconUri }}
          style={[styles.icon, { tintColor: iconTint }]}
        />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoCapitalize="none"
          maxLength={maxLength}
          style={styles.input}
        />
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.white },
  container: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 60,
  },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.badgeBg,
    borderWidth: 3,
    borderColor: COLORS.badgeBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: "700", color: COLORS.blueDark },
  subtitle: { fontSize: 14, color: COLORS.subtext, marginBottom: 20 },
  row: { width: "100%", marginTop: 10 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    backgroundColor: COLORS.inputBg,
    paddingHorizontal: 12,
    borderRadius: 10,
    height: 48,
  },
  icon: { width: 20, height: 20, marginRight: 10 },
  input: { flex: 1, fontSize: 14, color: COLORS.text },
  primaryBtn: {
    marginTop: 18,
    backgroundColor: COLORS.blue,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    width: "100%",
  },
  primaryBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  divider: {
    marginVertical: 16,
    height: 1,
    width: "100%",
    backgroundColor: COLORS.inputBorder,
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    height: 46,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  outlineBtnText: { fontSize: 14, fontWeight: "700" },
  footerText: { color: COLORS.subtext, marginBottom: 6 },
  errorText: { color: COLORS.error, fontSize: 11, marginTop: 4 },

  cnicUploadBox: {
    width: "100%",
    minHeight: 130,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 10,
    backgroundColor: COLORS.inputBg,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },

  cnicUploadInner: {
    alignItems: "center",
    justifyContent: "center",
  },

  cnicUploadIcon: {
    width: 26,
    height: 26,
    tintColor: COLORS.blueDark,
    marginBottom: 8,
  },

  cnicUploadText: {
    color: COLORS.subtext,
    fontSize: 13,
    fontWeight: "600",
  },

  cnicImagePreviewWrap: {
    alignItems: "center",
    width: "100%",
  },

  cnicImagePreview: {
    width: 160,
    height: 95,
    borderRadius: 8,
    marginBottom: 6,
    resizeMode: "contain",
    backgroundColor: COLORS.white,
  },

  cnicImageName: {
    maxWidth: 220,
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "600",
  },

  cnicImageReady: {
    marginTop: 4,
    color: "#16A34A",
    fontSize: 12,
    fontWeight: "800",
  },
});
