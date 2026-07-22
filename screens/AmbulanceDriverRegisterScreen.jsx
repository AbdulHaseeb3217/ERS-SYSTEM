import React, { useRef, useState } from "react";
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
  red: "#DC2626",
  redDark: "#B91C1C",
  badgeBg: "#FEE2E2",
  badgeBorder: "#FECACA",
  text: "#111827",
  subtext: "#6B7280",
  inputBg: "#F9FAFB",
  inputBorder: "#E5E7EB",
  white: "#FFFFFF",
  err: "#DC2626",
};

/* ---------------- Helpers (format + validation) ---------------- */

const sanitizeName = (val) => {
  return String(val ?? "")
    .replace(/[^a-zA-Z.\-\s]/g, "")
    .replace(/\s{2,}/g, " ");
};

const isValidName = (val) =>
  /^[A-Za-z.\-\s]+$/.test(val) && /[A-Za-z]/.test(val);

const sanitizePhone = (val) =>
  String(val ?? "").replace(/\D/g, "").slice(0, 11);

const isValidPhone = (val) => /^\d{11}$/.test(val);

const isValidEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val);

const formatCNIC = (val) => {
  const d = String(val ?? "").replace(/\D/g, "").slice(0, 13);
  const p1 = d.slice(0, 5);
  const p2 = d.slice(5, 12);
  const p3 = d.slice(12, 13);

  let out = p1;
  if (d.length > 5) out += "-" + p2;
  if (d.length > 12) out += "-" + p3;

  return out;
};

const isValidCNIC = (val) => /^\d{5}-\d{7}-\d{1}$/.test(val);

const formatLicense = (val) => {
  const d = String(val ?? "").replace(/\D/g, "").slice(0, 16);
  const p1 = d.slice(0, 5);
  const p2 = d.slice(5, 12);
  const p3 = d.slice(12, 13);
  const p4 = d.slice(13, 16);

  let out = p1;
  if (d.length > 5) out += "-" + p2;
  if (d.length > 12) out += "-" + p3;
  if (d.length > 13) out += "#" + p4;

  return out;
};

const isValidLicense = (val) =>
  /^\d{5}-\d{7}-\d{1}#\d{3}$/.test(val);

const formatAmbulanceNo = (val) => {
  const raw = String(val ?? "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();

  const letters = raw.replace(/[^A-Z]/g, "").slice(0, 3);
  const digits = raw.replace(/[^0-9]/g, "").slice(0, 3);

  let out = letters;
  if (letters.length === 3 && (digits.length > 0 || raw.length >= 3)) {
    out += "-";
  }

  out += digits;

  return out.slice(0, 7);
};

const isValidAmbulanceNo = (val) => /^[A-Z]{3}-\d{3}$/.test(val);

const isValidDOB = (val) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return false;

  const [y, m, d] = val.split("-").map((x) => parseInt(x, 10));
  const dt = new Date(y, m - 1, d);

  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== m - 1 ||
    dt.getDate() !== d
  ) {
    return false;
  }

  if (dt > new Date()) return false;

  return true;
};

const sanitizeVehicleType = (val) =>
  String(val ?? "")
    .replace(/[^a-zA-Z\s]/g, "")
    .replace(/\s{2,}/g, " ");

const isValidVehicleType = (val) =>
  /^[A-Za-z\s]+$/.test(val) && /[A-Za-z]/.test(val);

const isValidPassword = (val) =>
  /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/.test(val);

function AmbulanceDriverRegister({ navigation }) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cnic, setCnic] = useState("");
  const [cnicImage, setCnicImage] = useState(null);
  const [license, setLicense] = useState("");
  const [ambulanceNo, setAmbulanceNo] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // ---- Keyboard scroll helpers ----
  const scrollRef = useRef(null);
  const fieldY = useRef({});

  const scrollToField = (fieldKey) => {
    const y = fieldY.current[fieldKey] ?? 0;
    const target = Math.max(0, y - 120);

    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: target, animated: true });
    }, 50);
  };

  const clearFieldError = (key) => {
    setErrors((p) => {
      const x = { ...p };
      delete x[key];
      return x;
    });
  };

  const validateAll = () => {
    const e = {};

    const name = fullName.trim();
    const ph = phone.trim();
    const em = email.trim().toLowerCase();
    const cn = cnic.trim();
    const lic = license.trim();
    const amb = ambulanceNo.trim();
    const db = dob.trim();
    const addr = address.trim();
    const vt = vehicleType.trim();
    const pw = password;
    const cf = confirm;

    if (!name) {
      e.fullName = "Full Name is required.";
    } else if (!isValidName(name)) {
      e.fullName =
        "Name only alphabets allowed. Special chars allowed: . and - (numbers not allowed).";
    }

    if (!ph) {
      e.phone = "Contact Number is required.";
    } else if (!isValidPhone(ph)) {
      e.phone = "Contact Number must be exactly 11 digits (numbers only).";
    }

    if (!em) {
      e.email = "Email is required.";
    } else if (!isValidEmail(em)) {
      e.email = "Invalid email. Example: driver@gmail.com";
    }

    if (!cn) {
      e.cnic = "CNIC is required.";
    } else if (!isValidCNIC(cn)) {
      e.cnic = "CNIC format must be: 12345-1234567-1";
    }

    if (!cnicImage?.base64DataUri) {
      e.cnicImage = "CNIC image is required.";
    }

    if (!lic) {
      e.license = "License Number is required.";
    } else if (!isValidLicense(lic)) {
      e.license = "License format must be: 12345-1234567-8#901";
    }

    if (!amb) {
      e.ambulanceNo = "Ambulance Number is required.";
    } else if (!isValidAmbulanceNo(amb)) {
      e.ambulanceNo = "Ambulance Number format must be: ABC-123";
    }

    if (!db) {
      e.dob = "Date of Birth is required.";
    } else if (!isValidDOB(db)) {
      e.dob = "DOB format must be: YYYY-MM-DD (valid date)";
    }

    if (!addr) {
      e.address = "Address is required.";
    }

    if (!vt) {
      e.vehicleType = "Vehicle Type is required.";
    } else if (!isValidVehicleType(vt)) {
      e.vehicleType =
        "Vehicle Type must contain alphabets only (no numbers). Example: ALS Ambulance";
    }

    if (!pw) {
      e.password = "Password is required.";
    } else if (!isValidPassword(pw)) {
      e.password =
        "Password must be minimum 6 and alphanumeric (letters + numbers). Example: Abc123";
    }

    if (!cf) {
      e.confirm = "Confirm Password is required.";
    } else if (pw !== cf) {
      e.confirm = "Password mismatch. Both passwords must match.";
    }

    setErrors(e);

    const firstKey = Object.keys(e)[0];
    if (firstKey) scrollToField(firstKey);

    return Object.keys(e).length === 0;
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

          if (errors.cnicImage) clearFieldError("cnicImage");
        }
      );
    } catch (err) {
      console.log("CNIC IMAGE PICK ERROR =>", err);
      Alert.alert("Image Picker Missing", "Run: npm i react-native-image-picker");
    }
  };

  const onRegister = async () => {
    if (submitting) return;
    if (!validateAll()) return;

    try {
      setSubmitting(true);

      const payload = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        cnic: cnic.trim(),
        cnicImageUrl: cnicImage?.base64DataUri,
        licenseNumber: license.trim(),
        ambulanceNumber: ambulanceNo.trim(),
        dateOfBirth: dob.trim(),
        address: address.trim(),
        vehicleType: vehicleType.trim(),
        password: password,
      };

      const res = await fetch(buildUrl("/api/ambulance_driver/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        Alert.alert(
          "Registration Failed",
          data?.message || "Could not register driver. Please try again."
        );
        return;
      }

      Alert.alert("Success", "Account created successfully.", [
        { text: "OK", onPress: () => navigation.replace("ADriverLogin") },
      ]);

      // clear
      setFullName("");
      setPhone("");
      setEmail("");
      setCnic("");
      setCnicImage(null);
      setLicense("");
      setAmbulanceNo("");
      setDob("");
      setAddress("");
      setVehicleType("");
      setPassword("");
      setConfirm("");
      setErrors({});
    } catch (err) {
      console.log("REGISTER ERROR =>", err);
      Alert.alert(
        "Network Error",
        "Backend unreachable. Check Wi-Fi/IP and server running."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onSignIn = () => navigation.navigate("ADriverLogin");

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.container, { paddingBottom: 320 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.badge}>
            <Image
              source={{
                uri: "https://cdn-icons-png.flaticon.com/512/2966/2966327.png",
              }}
              style={{ width: 38, height: 38, tintColor: COLORS.red }}
            />
          </View>

          <Text style={styles.title}>Ambulance Driver Registration</Text>
          <Text style={styles.subtitle}>Create your account</Text>

          {/* Full Name */}
          <Field
            label="Full Name *"
            value={fullName}
            onChangeText={(t) => {
              const v = sanitizeName(t);
              setFullName(v);
              if (errors.fullName) clearFieldError("fullName");
            }}
            placeholder="Enter your full name (e.g., Ali Raza)"
            iconUri="https://cdn-icons-png.flaticon.com/512/1077/1077114.png"
            fieldKey="fullName"
            onLayout={(y) => (fieldY.current.fullName = y)}
            onFocus={() => scrollToField("fullName")}
            error={errors.fullName}
          />

          {/* Contact Number */}
          <Field
            label="Contact Number *"
            value={phone}
            onChangeText={(t) => {
              const v = sanitizePhone(t);
              setPhone(v);
              if (errors.phone) clearFieldError("phone");
            }}
            placeholder="03XXXXXXXXX (11 digits)"
            keyboardType="phone-pad"
            iconUri="https://cdn-icons-png.flaticon.com/512/597/597177.png"
            fieldKey="phone"
            onLayout={(y) => (fieldY.current.phone = y)}
            onFocus={() => scrollToField("phone")}
            error={errors.phone}
          />

          {/* Email */}
          <Field
            label="Email *"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (errors.email) clearFieldError("email");
            }}
            placeholder="e.g., driver@gmail.com"
            keyboardType="email-address"
            iconUri="https://cdn-icons-png.flaticon.com/512/561/561127.png"
            fieldKey="email"
            onLayout={(y) => (fieldY.current.email = y)}
            onFocus={() => scrollToField("email")}
            error={errors.email}
          />

          {/* CNIC Number - old field same */}
          <Field
            label="CNIC Number *"
            value={cnic}
            onChangeText={(t) => {
              const v = formatCNIC(t);
              setCnic(v);
              if (errors.cnic) clearFieldError("cnic");
            }}
            placeholder="e.g., 12345-6789012-3"
            keyboardType="number-pad"
            iconUri="https://cdn-icons-png.flaticon.com/512/992/992700.png"
            fieldKey="cnic"
            onLayout={(y) => (fieldY.current.cnic = y)}
            onFocus={() => scrollToField("cnic")}
            error={errors.cnic}
          />

          {/* CNIC Image - new field */}
          <View
            style={styles.row}
            onLayout={(e) => {
              fieldY.current.cnicImage = e.nativeEvent.layout.y;
            }}
          >
            <View style={styles.col}>
              <Text style={styles.label}>CNIC Image *</Text>

              <TouchableOpacity
                style={[
                  styles.cnicUploadBox,
                  errors.cnicImage && styles.inputWrapError,
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
                    <Text style={styles.cnicImageReady}>
                      ✓ CNIC image ready
                    </Text>
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

              {!!errors.cnicImage && (
                <Text style={styles.errorText}>{errors.cnicImage}</Text>
              )}
            </View>
          </View>

          {/* License */}
          <Field
            label="License Number *"
            value={license}
            onChangeText={(t) => {
              const v = formatLicense(t);
              setLicense(v);
              if (errors.license) clearFieldError("license");
            }}
            placeholder="e.g., 12345-1234567-8#901"
            keyboardType="number-pad"
            iconUri="https://cdn-icons-png.flaticon.com/512/1250/1250899.png"
            fieldKey="license"
            onLayout={(y) => (fieldY.current.license = y)}
            onFocus={() => scrollToField("license")}
            error={errors.license}
          />

          {/* Ambulance Number */}
          <Field
            label="Ambulance Number *"
            value={ambulanceNo}
            onChangeText={(t) => {
              const v = formatAmbulanceNo(t);
              setAmbulanceNo(v);
              if (errors.ambulanceNo) clearFieldError("ambulanceNo");
            }}
            placeholder="e.g., ABC-123"
            iconUri="https://cdn-icons-png.flaticon.com/512/2329/2329244.png"
            fieldKey="ambulanceNo"
            onLayout={(y) => (fieldY.current.ambulanceNo = y)}
            onFocus={() => scrollToField("ambulanceNo")}
            error={errors.ambulanceNo}
          />

          {/* DOB */}
          <Field
            label="Date of Birth (YYYY-MM-DD) *"
            value={dob}
            onChangeText={(t) => {
              setDob(t);
              if (errors.dob) clearFieldError("dob");
            }}
            placeholder="e.g., 1998-05-12"
            iconUri="https://cdn-icons-png.flaticon.com/512/747/747310.png"
            fieldKey="dob"
            onLayout={(y) => (fieldY.current.dob = y)}
            onFocus={() => scrollToField("dob")}
            error={errors.dob}
          />

          {/* Address */}
          <Field
            label="Address *"
            value={address}
            onChangeText={(t) => {
              setAddress(t);
              if (errors.address) clearFieldError("address");
            }}
            placeholder="House/Street/Area, City"
            iconUri="https://cdn-icons-png.flaticon.com/512/535/535239.png"
            fieldKey="address"
            onLayout={(y) => (fieldY.current.address = y)}
            onFocus={() => scrollToField("address")}
            error={errors.address}
          />

          {/* Vehicle Type */}
          <Field
            label="Vehicle Type *"
            value={vehicleType}
            onChangeText={(t) => {
              const v = sanitizeVehicleType(t);
              setVehicleType(v);
              if (errors.vehicleType) clearFieldError("vehicleType");
            }}
            placeholder="e.g., ALS Ambulance"
            iconUri="https://cdn-icons-png.flaticon.com/512/3202/3202926.png"
            fieldKey="vehicleType"
            onLayout={(y) => (fieldY.current.vehicleType = y)}
            onFocus={() => scrollToField("vehicleType")}
            error={errors.vehicleType}
          />

          {/* Password */}
          <Field
            label="Password *"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (errors.password) clearFieldError("password");
            }}
            placeholder="Min 6, letters+numbers (e.g., Abc123)"
            secureTextEntry
            iconUri="https://cdn-icons-png.flaticon.com/512/3064/3064155.png"
            fieldKey="password"
            onLayout={(y) => (fieldY.current.password = y)}
            onFocus={() => scrollToField("password")}
            error={errors.password}
          />

          {/* Confirm */}
          <Field
            label="Confirm Password *"
            value={confirm}
            onChangeText={(t) => {
              setConfirm(t);
              if (errors.confirm) clearFieldError("confirm");
            }}
            placeholder="Re-enter your password"
            secureTextEntry
            iconUri="https://cdn-icons-png.flaticon.com/512/3064/3064155.png"
            fieldKey="confirm"
            onLayout={(y) => (fieldY.current.confirm = y)}
            onFocus={() => scrollToField("confirm")}
            error={errors.confirm}
          />

          <TouchableOpacity
            style={[styles.primaryBtn, submitting && { opacity: 0.7 }]}
            onPress={onRegister}
            activeOpacity={0.9}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider} />

          <Text style={styles.footerText}>Already have an account? </Text>

          <TouchableOpacity
            style={styles.outlineBtn}
            onPress={onSignIn}
            activeOpacity={0.85}
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
  keyboardType = "default",
  secureTextEntry = false,
  onLayout,
  onFocus,
  error,
}) {
  return (
    <View
      style={styles.row}
      onLayout={(e) => {
        const y = e.nativeEvent.layout.y;
        onLayout && onLayout(y);
      }}
    >
      <View style={styles.col}>
        <Text style={styles.label}>{label}</Text>

        <View style={[styles.inputWrap, error && styles.inputWrapError]}>
          <Image
            source={{ uri: iconUri }}
            style={[styles.icon, error && { tintColor: COLORS.err }]}
          />

          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            keyboardType={keyboardType}
            secureTextEntry={secureTextEntry}
            autoCapitalize="none"
            returnKeyType="next"
            blurOnSubmit={false}
            onFocus={() => onFocus && onFocus()}
            underlineColorAndroid="transparent"
            showSoftInputOnFocus={true}
            disableFullscreenUI={true}
          />
        </View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    </View>
  );
}

export default AmbulanceDriverRegister;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

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
    backgroundColor: COLORS.badgeBg,
    borderWidth: 3,
    borderColor: COLORS.badgeBorder,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.redDark,
    textAlign: "center",
  },

  subtitle: {
    fontSize: 14,
    color: COLORS.subtext,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 14,
  },

  row: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 10,
  },

  col: {
    flex: 1,
  },

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

  inputWrapError: {
    borderColor: COLORS.err,
  },

  icon: {
    width: 20,
    height: 20,
    marginRight: 10,
    tintColor: COLORS.redDark,
  },

  input: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    paddingVertical: 0,
  },

  errorText: {
    marginTop: 6,
    color: COLORS.err,
    fontSize: 12.5,
    fontWeight: "600",
  },

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
    tintColor: COLORS.redDark,
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

  primaryBtn: {
    marginTop: 16,
    width: "100%",
    height: 48,
    backgroundColor: COLORS.red,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: COLORS.red,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
  },

  primaryBtnText: {
    color: COLORS.white,
    fontSize: 15.5,
    fontWeight: "700",
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.inputBorder,
    width: "100%",
    marginVertical: 16,
  },

  footerText: {
    color: COLORS.subtext,
    fontSize: 13,
    marginBottom: 8,
  },

  outlineBtn: {
    height: 46,
    width: "100%",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    alignItems: "center",
    justifyContent: "center",
  },

  outlineBtnText: {
    fontWeight: "700",
    fontSize: 14,
    color: COLORS.text,
  },
});