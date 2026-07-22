import React, { useRef, useState, useEffect, memo } from "react";
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";

import { buildUrl } from "../services/apiConfig"; 

const C = {
  bg: "#F6F7F9",
  white: "#FFFFFF",
  text: "#0F172A",
  sub: "#64748B",
  border: "#E5E7EB",
  brand: "#DC2626",
};

const ambulanceIcon = require("../assets/ambulance.png");

const ICONS = {
  person: "https://cdn-icons-png.flaticon.com/512/456/456212.png",
  phone: "https://cdn-icons-png.flaticon.com/512/724/724664.png",
  mail: "https://cdn-icons-png.flaticon.com/512/561/561127.png",
  cnic: "https://cdn-icons-png.flaticon.com/512/992/992700.png",
  id: "https://cdn-icons-png.flaticon.com/512/942/942196.png", 
  plate: "https://cdn-icons-png.flaticon.com/512/3106/3106794.png", 
  calendar: "https://cdn-icons-png.flaticon.com/512/747/747310.png",
  pin: "https://cdn-icons-png.flaticon.com/512/535/535239.png",
  vehicle: "https://cdn-icons-png.flaticon.com/512/3202/3202926.png",
};

const ICON_TINT = {
  person: "#111827",
  phone: "#2563EB",
  mail: "#0EA5E9",
  cnic: "#10B981",
  id: "#0EA5E9",
  plate: "#111827",
  calendar: "#0EA5E9",
  pin: "#16A34A",
  vehicle: "#F59E0B",
};



const toYMD = (d) => {
  if (!d) return "";
  try {
    return new Date(d).toISOString().split("T")[0];
  } catch {
    return "";
  }
};


const sanitizeName = (val) => {
  let s = String(val ?? "");
  s = s.replace(/[^A-Za-z.\-\s]/g, "");
  s = s.replace(/\s+/g, " ").trimStart();
  s = s.replace(/\.{2,}/g, ".").replace(/\-{2,}/g, "-");
  s = s.replace(/^[.\-\s]+/, "");
  return s;
};
const isValidName = (val) =>
  /^[A-Za-z]+(?:[ .-][A-Za-z]+)*$/.test(String(val ?? "").trim());


const sanitizePhone = (val) => String(val ?? "").replace(/\D/g, "").slice(0, 11);
const isValidPhone = (val) => /^\d{11}$/.test(String(val ?? "").trim());


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


const formatAmbulanceNo = (val) => {
  const raw = String(val ?? "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  const letters = raw.replace(/[^A-Z]/g, "").slice(0, 3);
  const digits = raw.replace(/[^0-9]/g, "").slice(0, 3);

  if (!letters) return "";
  if (letters.length < 3) return letters;
  if (!digits) return letters;

  return `${letters}-${digits}`.slice(0, 7);
};
const isValidAmbulanceNo = (val) =>
  /^[A-Z]{3}-\d{3}$/.test(String(val ?? "").trim());


const isValidDOB = (val) => {
  const v = String(val ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split("-").map((x) => parseInt(x, 10));
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d)
    return false;
  if (dt > new Date()) return false;
  return true;
};


const sanitizeVehicleType = (val) =>
  String(val ?? "").replace(/[^a-zA-Z\s]/g, "").replace(/\s{2,}/g, " ");
const isValidVehicleType = (val) =>
  /^[A-Za-z\s]+$/.test(String(val ?? "").trim()) && /[A-Za-z]/.test(val);


const ViewRow = memo(function ViewRow({ label, value }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{value || "-"}</Text>
    </View>
  );
});

const InputRow = memo(function InputRow({
  icon,
  tint,
  label,
  field,
  value,
  setForm,
  keyboardType = "default",
  onLayout,
  onFocus,
  editable = true,
}) {
  const handleChange = (t) => {
    if (!editable) return;

    if (field === "fullName") {
      setForm((p) => ({ ...p, fullName: sanitizeName(t) }));
      return;
    }

    if (field === "phone") {
      setForm((p) => ({ ...p, phone: sanitizePhone(t) }));
      return;
    }

    if (field === "ambulanceNumber") {
      setForm((p) => ({ ...p, ambulanceNumber: formatAmbulanceNo(t) }));
      return;
    }

    if (field === "vehicleType") {
      setForm((p) => ({ ...p, vehicleType: sanitizeVehicleType(t) }));
      return;
    }

   
    setForm((p) => ({ ...p, [field]: t }));
  };

  return (
    <View style={{ marginBottom: 12 }} onLayout={onLayout}>
      <Text style={s.label}>{label}</Text>
      <View style={s.inputWrap}>
        <Image source={{ uri: icon }} style={[s.inputIcon, { tintColor: tint }]} />
        <TextInput
          editable={editable}
          selectTextOnFocus={editable}
          value={String(value ?? "")}
          onChangeText={handleChange}
          style={[s.input, !editable && { color: "#6B7280" }]}
          placeholder={label}
          placeholderTextColor="#9AA5B1"
          keyboardType={keyboardType}
          returnKeyType="next"
          blurOnSubmit={false}
          onFocus={onFocus}
          autoCorrect={false}
          autoCapitalize="words"
          underlineColorAndroid="transparent"
          showSoftInputOnFocus={true}
          disableFullscreenUI={true}
        />
      </View>
    </View>
  );
});


export default function AmbulanceDriverProfileManagementScreen({
  navigation,
  route,
}) {
  const driverFromNav = route?.params?.driver || null;
  const driverId = driverFromNav?.id || driverFromNav?._id;

  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const scrollRef = useRef(null);
  const fieldY = useRef({});

  const goBack = () => {
    if (navigation?.canGoBack && navigation.canGoBack()) navigation.goBack();
    else navigation?.navigate?.("AmbulanceDriverMenu");
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        if (!driverId) {
          setLoading(false);
          Alert.alert(
            "Error",
            "Driver info not found (no ID). Please login again."
          );
          return;
        }

      
        const res = await fetch(
          buildUrl(`/api/ambulance_driver/profile/${driverId}`)
        );
        const json = await res.json();

        if (!res.ok || !json?.success)
          throw new Error(json?.message || "Failed to load profile");

        const d = json.driver;

        const ui = {
          id: d.id || d._id || driverId,
          driverIdText: d.driverId ? `#${d.driverId}` : "-",

          fullName: d.fullName || "",
          phone: d.phone || "",

          email: d.email || "",
          cnic: formatCNIC(d.cnic || ""),
          licenseNumber: formatLicense(d.licenseNumber || ""),

          ambulanceNumber: d.ambulanceNumber || "",
          dateOfBirth: toYMD(d.dateOfBirth),
          address: d.address || "",
          vehicleType: d.vehicleType || "",
        };

        setProfile(ui);
        setForm(ui);
      } catch (err) {
        console.log("LOAD DRIVER PROFILE ERROR =>", err);
        Alert.alert("Error", err.message || "Unable to load profile");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [driverId]);

  const scrollToField = (field) => {
    const y = fieldY.current[field] ?? 0;
    const target = Math.max(0, y - 120);
    setTimeout(
      () => scrollRef.current?.scrollTo({ y: target, animated: true }),
      50
    );
  };

  const onEdit = () => {
    if (!profile) return;
    setForm(profile);
    setIsEditing(true);
  };

  const onCancel = () => {
    setForm(profile);
    setIsEditing(false);
  };

  
  const validateForm = () => {
    const errs = [];

    const name = (form?.fullName || "").trim();
    if (!name) errs.push("Full Name is required.");
    else if (!isValidName(name))
      errs.push(
        "Full Name must be alphabets only. Allowed separators: space, '.' and '-' between words (not at start/end)."
      );

    const ph = (form?.phone || "").trim();
    if (!ph) errs.push("Contact Number is required.");
    else if (!isValidPhone(ph))
      errs.push("Contact Number must be exactly 11 digits (numbers only).");

    const amb = (form?.ambulanceNumber || "").trim();
    if (!amb) errs.push("Ambulance Number is required.");
    else if (!isValidAmbulanceNo(amb))
      errs.push("Ambulance Number format must be: ABC-123");

    const dob = (form?.dateOfBirth || "").trim();
    if (!dob) errs.push("Date of Birth is required.");
    else if (!isValidDOB(dob))
      errs.push("DOB format must be: YYYY-MM-DD (valid date)");

    const addr = (form?.address || "").trim();
    if (!addr) errs.push("Address is required.");

    const vt = (form?.vehicleType || "").trim();
    if (!vt) errs.push("Vehicle Type is required.");
    else if (!isValidVehicleType(vt))
      errs.push(
        "Vehicle Type must contain alphabets only (no numbers). Example: ALS Ambulance"
      );

    if (errs.length) {
      Alert.alert("Invalid Information", errs.join("\n"));
      return false;
    }
    return true;
  };

  const onSave = async () => {
    if (!profile || !form) return;
    if (saving) return;

    if (!validateForm()) return;

    try {
      setSaving(true);

      const payload = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        ambulanceNumber: form.ambulanceNumber.trim(),
        dateOfBirth: form.dateOfBirth.trim(),
        address: form.address.trim(),
        vehicleType: form.vehicleType.trim(),
       
      };

      
      const res = await fetch(
        buildUrl(`/api/ambulance_driver/profile/${profile.id}`),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const json = await res.json();

      if (!res.ok || !json?.success)
        throw new Error(json?.message || "Failed to update profile");

      const d = json.driver;

      const updated = {
        id: d.id || d._id || profile.id,
        driverIdText: d.driverId ? `#${d.driverId}` : profile.driverIdText,

        fullName: d.fullName || "",
        phone: d.phone || "",

        email: d.email || profile.email,
        cnic: formatCNIC(d.cnic || profile.cnic),
        licenseNumber: formatLicense(
          d.licenseNumber || profile.licenseNumber
        ),

        ambulanceNumber: d.ambulanceNumber || "",
        dateOfBirth: toYMD(d.dateOfBirth),
        address: d.address || "",
        vehicleType: d.vehicleType || "",
      };

      setProfile(updated);
      setForm(updated);
      setIsEditing(false);
      Alert.alert("Saved", "Profile updated successfully.");
    } catch (err) {
      console.log("UPDATE DRIVER PROFILE ERROR =>", err);
      Alert.alert("Error", err.message || "Unable to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[s.safe, { justifyContent: "center", alignItems: "center" }]}
      >
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={C.brand} />
        <Text style={{ marginTop: 10, color: C.sub }}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView
        style={[s.safe, { justifyContent: "center", alignItems: "center" }]}
      >
        <StatusBar barStyle="dark-content" />
        <Text style={{ color: C.text, fontWeight: "600" }}>
          Driver profile not available
        </Text>
        <TouchableOpacity
          onPress={goBack}
          style={[s.primaryBtn, { marginTop: 16 }]}
        >
          <Text style={s.primaryText}>Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} importantForAutofill="noExcludeDescendants">
      <StatusBar barStyle="dark-content" />

      <View style={s.topRow}>
        <TouchableOpacity onPress={goBack} style={s.backBtn} activeOpacity={0.85}>
          <Text style={s.backArrow}>←</Text>
          <Text style={s.backText}>Profile Management</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            s.container,
            isEditing ? { paddingBottom: 320 } : { paddingBottom: 24 },
          ]}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator
          removeClippedSubviews={false}
        >
          <View style={s.card}>
            <View style={s.headerWrap}>
              <View style={s.avatar}>
                <Image source={ambulanceIcon} style={s.avatarImg} />
              </View>
              <View>
                <Text style={s.name}>{profile.fullName}</Text>
                <Text style={s.driverId}>Driver ID: {profile.driverIdText}</Text>
              </View>
            </View>

            <View style={s.hr} />

            {!isEditing && (
              <>
                <ViewRow label="Full Name" value={profile.fullName} />
                <View style={s.line} />
                <ViewRow label="Contact Number" value={profile.phone} />
                <View style={s.line} />

                
                <ViewRow label="Email" value={profile.email} />
                <View style={s.line} />
                <ViewRow label="CNIC" value={profile.cnic} />
                <View style={s.line} />
                <ViewRow label="License Number" value={profile.licenseNumber} />
                <View style={s.line} />

                <ViewRow label="Ambulance Number" value={profile.ambulanceNumber} />
                <View style={s.line} />
                <ViewRow label="Date of Birth" value={profile.dateOfBirth} />
                <View style={s.line} />
                <ViewRow label="Address" value={profile.address} />
                <View style={s.line} />
                <ViewRow label="Vehicle Type" value={profile.vehicleType} />

                <TouchableOpacity
                  style={s.primaryBtn}
                  activeOpacity={0.9}
                  onPress={onEdit}
                >
                  <Text style={s.primaryText}>Edit Profile</Text>
                </TouchableOpacity>
              </>
            )}

            {isEditing && form && (
              <>
                <InputRow
                  icon={ICONS.person}
                  tint={ICON_TINT.person}
                  label="Full Name (alphabets, '.' and '-' allowed)"
                  field="fullName"
                  value={form.fullName}
                  setForm={setForm}
                  onLayout={(e) =>
                    (fieldY.current.fullName = e.nativeEvent.layout.y)
                  }
                  onFocus={() => scrollToField("fullName")}
                />

                <InputRow
                  icon={ICONS.phone}
                  tint={ICON_TINT.phone}
                  label="Contact Number (11 digits)"
                  field="phone"
                  value={form.phone}
                  setForm={setForm}
                  keyboardType="phone-pad"
                  onLayout={(e) =>
                    (fieldY.current.phone = e.nativeEvent.layout.y)
                  }
                  onFocus={() => scrollToField("phone")}
                />

           
                <InputRow
                  icon={ICONS.mail}
                  tint={ICON_TINT.mail}
                  label="Email (read-only)"
                  field="email"
                  value={form.email}
                  setForm={setForm}
                  editable={false}
                />
                <InputRow
                  icon={ICONS.cnic}
                  tint={ICON_TINT.cnic}
                  label="CNIC (read-only)"
                  field="cnic"
                  value={form.cnic}
                  setForm={setForm}
                  editable={false}
                />
                <InputRow
                  icon={ICONS.id}
                  tint={ICON_TINT.id}
                  label="License Number (read-only)"
                  field="licenseNumber"
                  value={form.licenseNumber}
                  setForm={setForm}
                  editable={false}
                />

                <InputRow
                  icon={ICONS.plate}
                  tint={ICON_TINT.plate}
                  label="Ambulance Number (ABC-123)"
                  field="ambulanceNumber"
                  value={form.ambulanceNumber}
                  setForm={setForm}
                  onLayout={(e) =>
                    (fieldY.current.ambulanceNumber = e.nativeEvent.layout.y)
                  }
                  onFocus={() => scrollToField("ambulanceNumber")}
                />

                <InputRow
                  icon={ICONS.calendar}
                  tint={ICON_TINT.calendar}
                  label="Date of Birth (YYYY-MM-DD)"
                  field="dateOfBirth"
                  value={form.dateOfBirth}
                  setForm={setForm}
                  onLayout={(e) =>
                    (fieldY.current.dateOfBirth = e.nativeEvent.layout.y)
                  }
                  onFocus={() => scrollToField("dateOfBirth")}
                />

                <InputRow
                  icon={ICONS.pin}
                  tint={ICON_TINT.pin}
                  label="Address"
                  field="address"
                  value={form.address}
                  setForm={setForm}
                  onLayout={(e) =>
                    (fieldY.current.address = e.nativeEvent.layout.y)
                  }
                  onFocus={() => scrollToField("address")}
                />

                <InputRow
                  icon={ICONS.vehicle}
                  tint={ICON_TINT.vehicle}
                  label="Vehicle Type (alphabets only)"
                  field="vehicleType"
                  value={form.vehicleType}
                  setForm={setForm}
                  onLayout={(e) =>
                    (fieldY.current.vehicleType = e.nativeEvent.layout.y)
                  }
                  onFocus={() => scrollToField("vehicleType")}
                />

                <View style={s.btnRow}>
                  <TouchableOpacity
                    style={[
                      s.actionBtn,
                      {
                        backgroundColor: C.brand,
                        opacity: saving ? 0.7 : 1,
                      },
                    ]}
                    onPress={onSave}
                    activeOpacity={0.9}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={[s.actionText, { color: "#FFF" }]}>
                        Save Changes
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.actionBtn, s.ghostBtn]}
                    onPress={onCancel}
                    activeOpacity={0.9}
                    disabled={saving}
                  >
                    <Text style={[s.actionText, { color: C.text }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ---------------- Styles ---------------- */
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  topRow: { paddingHorizontal: 16, paddingTop: 32, paddingBottom: 14 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  backArrow: { fontSize: 24, color: "#5B6B82" },
  backText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#5B6B82",
    letterSpacing: 0.2,
    fontFamily: Platform.OS === "android" ? "sans-serif-medium" : "System",
  },

  container: { paddingHorizontal: 16 },

  card: {
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    shadowColor: "rgba(15,23,42,0.06)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 2,
  },

  headerWrap: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarImg: { width: 22, height: 22, tintColor: C.brand },

  name: {
    color: C.text,
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 0.1,
    fontFamily: Platform.OS === "android" ? "sans-serif-medium" : "System",
  },
  driverId: { color: C.sub, fontSize: 12 },

  hr: {
    height: 1,
    backgroundColor: "#EFF2F6",
    marginVertical: 10,
    borderRadius: 1,
  },

  infoRow: { paddingVertical: 10 },
  label: { color: "#7A8AA3", fontSize: 12.5, marginBottom: 6 },
  value: {
    color: C.text,
    fontWeight: "700",
    lineHeight: 18,
    fontFamily: Platform.OS === "android" ? "sans-serif" : "System",
  },
  line: {
    height: 1,
    backgroundColor: "#EFF2F6",
    marginVertical: 6,
    borderRadius: 1,
  },

  inputWrap: { position: "relative", justifyContent: "center" },
  inputIcon: {
    position: "absolute",
    left: 12,
    width: 18,
    height: 18,
    zIndex: 1,
  },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "#F5F7FA",
    paddingLeft: 42,
    paddingRight: 12,
    color: C.text,
    fontSize: 13.5,
    fontFamily: Platform.OS === "android" ? "sans-serif" : "System",
  },

  primaryBtn: {
    marginTop: 14,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.brand,
  },
  primaryText: {
    color: "#FFF",
    fontWeight: "800",
    letterSpacing: 0.2,
    fontFamily: Platform.OS === "android" ? "sans-serif-medium" : "System",
  },

  btnRow: { flexDirection: "row", gap: 12, marginTop: 6 },
  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostBtn: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: C.border,
  },
  actionText: {
    fontWeight: "800",
    letterSpacing: 0.2,
    fontFamily: Platform.OS === "android" ? "sans-serif-medium" : "System",
  },
});
