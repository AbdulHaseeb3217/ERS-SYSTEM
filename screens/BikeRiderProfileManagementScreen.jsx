// screens/BikeRiderProfileManagementScreen.jsx
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

/* ---------- Theme (blue) ---------- */
const C = {
  bg: "#F6F7F9",
  white: "#FFFFFF",
  text: "#0F172A",
  sub: "#64748B",
  border: "#E5E7EB",
  brand: "#2563EB",
};

const bikeIcon = require("../assets/sportbike.png");

const ICONS = {
  person: "https://cdn-icons-png.flaticon.com/512/456/456212.png",
  phone: "https://cdn-icons-png.flaticon.com/512/597/597177.png",
  mail: "https://cdn-icons-png.flaticon.com/512/561/561127.png",
  cnic: "https://cdn-icons-png.flaticon.com/512/992/992700.png",
  id: "https://cdn-icons-png.flaticon.com/512/1250/1250899.png",
  plate: "https://cdn-icons-png.flaticon.com/512/3106/3106794.png",
  calendar: "https://cdn-icons-png.flaticon.com/512/747/747310.png",
  pin: "https://cdn-icons-png.flaticon.com/512/535/535239.png",
  vehicle: "https://cdn-icons-png.flaticon.com/512/3202/3202926.png",
};

const ICON_TINT = {
  person: "#1F2937",
  phone: "#2563EB",
  mail: "#1D4ED8",
  cnic: "#10B981",
  id: "#0EA5E9",
  plate: "#F59E0B",
  calendar: "#8B5CF6",
  pin: "#16A34A",
  vehicle: "#F59E0B",
};

/* ---------- Helpers ---------- */
const toYMD = (d) => {
  if (!d) return "";
  try {
    return new Date(d).toISOString().split("T")[0];
  } catch {
    return "";
  }
};


const formatBikeNumber = (val) => {
  let raw = String(val ?? "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const letters = raw.replace(/[^A-Z]/g, "").slice(0, 3);
  const digits = raw.replace(/[^0-9]/g, "").slice(0, 4);
  if (letters.length === 3) return `${letters}-${digits}`.slice(0, 8);
  return letters.slice(0, 3);
};


const sanitizeFullName = (val) => {
  let s = String(val ?? "");

  // allow: letters + space + dot + hyphen
  s = s.replace(/[^A-Za-z.\-\s]/g, "");

 
  s = s.replace(/\s+/g, " ").trimStart();

 
  s = s.replace(/\.{2,}/g, ".").replace(/\-{2,}/g, "-");


  s = s.replace(/^[.\-]+/, "");

  return s;
};


const normalizeVehicleType = (val) =>
  String(val ?? "").replace(/\s+/g, "").toLowerCase();

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
      const cleaned = sanitizeFullName(t);
      setForm((p) => ({ ...p, [field]: cleaned }));
      return;
    }

    
    if (field === "bikeNumber") {
      const formatted = formatBikeNumber(t);
      setForm((p) => ({ ...p, [field]: formatted }));
      return;
    }

   
    if (field === "vehicleType") {
      const cleaned = normalizeVehicleType(t);
      setForm((p) => ({ ...p, [field]: cleaned }));
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
        />
      </View>
    </View>
  );
});

/* ---------- Screen ---------- */
export default function BikeRiderProfileManagementScreen({ navigation, route }) {
  const riderFromNav = route?.params?.rider || null;
  const riderId = riderFromNav?.id || riderFromNav?._id;

  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const scrollRef = useRef(null);
  const fieldY = useRef({});

  useEffect(() => {
    const loadProfile = async () => {
      try {
        if (!riderId) {
          setLoading(false);
          Alert.alert("Error", "Rider info not found (no ID)");
          return;
        }
       
          const res = await fetch(buildUrl(`/api/bike_rider/${riderId}`));
        const json = await res.json();
       

        if (!res.ok || !json?.success) {
          throw new Error(json?.message || "Failed to load profile");
        }

        const r = json.rider;
        const uiProfile = {
          id: r.id || r._id,
          fullName: r.fullName || "",
          riderCode: r.riderId ? `#${r.riderId}` : "-",
          email: r.email || "",
          phone: r.phone || "",
          cnic: r.cnic || "",
          licenseNumber: r.licenseNumber || "",
          bikeNumber: r.bikeNumber || "",
          dateOfBirth: toYMD(r.dateOfBirth),
          address: r.address || "",
          vehicleType: normalizeVehicleType(r.vehicleType || ""),
        };

        setProfile(uiProfile);
        setForm(uiProfile);
      } catch (err) {
        console.log("LOAD PROFILE ERROR =>", err);
        Alert.alert("Error", err.message || "Unable to load rider profile");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [riderId]);

  const goBack = () => {
    if (navigation?.canGoBack && navigation.canGoBack()) navigation.goBack();
    else navigation?.navigate?.("BikeRiderMenu");
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
    const errors = [];

    const name = (form?.fullName || "").trim();
    if (!name) errors.push("Full Name is required");

    
    if (name) {
      const ok = /^[A-Za-z]+(?:[ .-][A-Za-z]+)*$/.test(name);
      if (!ok) {
        errors.push(
          "Full Name can contain only alphabets. Special characters allowed: (.) and (-) between words. Numbers not allowed."
        );
      }
    }

    if (!form?.phone?.trim()) errors.push("Contact Number is required");
    if (form?.phone && !/^\d{11}$/.test(form.phone.trim())) {
      errors.push("Contact Number must be 11 digits");
    }

    if (form?.bikeNumber && !/^[A-Z]{3}-\d{4}$/.test(form.bikeNumber.trim())) {
      errors.push("Bike Number must be ABC-1234 (3 letters + '-' + 4 digits)");
    }

    if (form?.dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(form.dateOfBirth)) {
      errors.push("Date of Birth must be in YYYY-MM-DD format");
    }

    if (!form?.address?.trim()) errors.push("Address is required");

    
    const vt = normalizeVehicleType(form?.vehicleType || "");
    if (!vt) errors.push("Vehicle Type is required");
    else if (!/^\d{2,3}cc$/.test(vt)) {
      errors.push("Vehicle Type must be like 70cc or 125cc (2-3 digits + cc)");
    }

    if (errors.length) {
      Alert.alert("Invalid Information", errors.join("\n"));
      return false;
    }
    return true;
  };

  const onSave = async () => {
    if (!profile) return;
    if (!validateForm()) return;

    try {
      setSaving(true);

      const payload = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        address: form.address?.trim() || "",
        bikeNumber: form.bikeNumber?.trim() || "",
        vehicleType: normalizeVehicleType(form.vehicleType || ""),
        dateOfBirth: form.dateOfBirth?.trim() || "",
      };

      const res = await fetch(buildUrl(`/api/bike_rider/${profile.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Failed to update profile");
      }

      const r = json.rider;

      const updated = {
        id: r.id || r._id || profile.id,
        fullName: r.fullName || "",
        riderCode: r.riderId ? `#${r.riderId}` : profile.riderCode,
        email: r.email || profile.email,
        phone: r.phone || "",
        cnic: r.cnic || profile.cnic,
        licenseNumber: r.licenseNumber || profile.licenseNumber,
        bikeNumber: r.bikeNumber || "",
        dateOfBirth: toYMD(r.dateOfBirth),
        address: r.address || "",
        vehicleType: normalizeVehicleType(r.vehicleType || ""),
      };

      setProfile(updated);
      setForm(updated);
      setIsEditing(false);
      Alert.alert("Success", "Profile updated successfully");
    } catch (err) {
      console.log("SAVE PROFILE ERROR =>", err);
      Alert.alert("Error", err.message || "Unable to update profile");
    } finally {
      setSaving(false);
    }
  };

  const scrollToField = (field) => {
    const y = fieldY.current[field] ?? 0;
    const target = Math.max(0, y - 120);
    setTimeout(() => scrollRef.current?.scrollTo({ y: target, animated: true }), 50);
  };

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, { justifyContent: "center", alignItems: "center" }]}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={C.brand} />
        <Text style={{ marginTop: 10, color: C.sub }}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={[s.safe, { justifyContent: "center", alignItems: "center" }]}>
        <StatusBar barStyle="dark-content" />
        <Text style={{ color: C.text, fontWeight: "600" }}>Rider profile not available</Text>
        <TouchableOpacity onPress={goBack} style={[s.primaryBtn, { marginTop: 16 }]}>
          <Text style={s.primaryText}>Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
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
        >
          <View style={s.card}>
            <View style={s.headerWrap}>
              <View style={[s.avatar, { backgroundColor: "#E8F0FF" }]}>
                <Image source={bikeIcon} style={[s.avatarImg, { tintColor: C.brand }]} />
              </View>
              <View>
                <Text style={s.name}>{profile.fullName}</Text>
                <Text style={s.idLine}>Rider ID: {profile.riderCode || "#-"}</Text>
              </View>
            </View>

            <View style={s.hr} />

            {!isEditing && (
              <>
                <ViewRow label="Full Name" value={profile.fullName} />
                <View style={s.line} />
                <ViewRow label="Email" value={profile.email} />
                <View style={s.line} />
                <ViewRow label="Contact Number" value={profile.phone} />
                <View style={s.line} />
                <ViewRow label="CNIC (13 digits)" value={profile.cnic} />
                <View style={s.line} />
                <ViewRow label="License Number" value={profile.licenseNumber} />
                <View style={s.line} />
                <ViewRow label="Bike Number" value={profile.bikeNumber} />
                <View style={s.line} />
                <ViewRow label="Date of Birth" value={profile.dateOfBirth} />
                <View style={s.line} />
                <ViewRow label="Address" value={profile.address} />
                <View style={s.line} />
                <ViewRow label="Vehicle Type" value={profile.vehicleType} />

                <TouchableOpacity
                  style={[s.primaryBtn, { backgroundColor: C.brand }]}
                  onPress={onEdit}
                  activeOpacity={0.9}
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
                  onLayout={(e) => (fieldY.current.fullName = e.nativeEvent.layout.y)}
                  onFocus={() => scrollToField("fullName")}
                />

                <InputRow
                  icon={ICONS.phone}
                  tint={ICON_TINT.phone}
                  label="Contact Number"
                  field="phone"
                  value={form.phone}
                  setForm={setForm}
                  keyboardType="phone-pad"
                  onLayout={(e) => (fieldY.current.phone = e.nativeEvent.layout.y)}
                  onFocus={() => scrollToField("phone")}
                />

                {/* Read-only */}
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
                  label="Bike Number (ABC-1234)"
                  field="bikeNumber"
                  value={form.bikeNumber}
                  setForm={setForm}
                  onLayout={(e) => (fieldY.current.bikeNumber = e.nativeEvent.layout.y)}
                  onFocus={() => scrollToField("bikeNumber")}
                />

                <InputRow
                  icon={ICONS.calendar}
                  tint={ICON_TINT.calendar}
                  label="Date of Birth (YYYY-MM-DD)"
                  field="dateOfBirth"
                  value={form.dateOfBirth}
                  setForm={setForm}
                  onLayout={(e) => (fieldY.current.dateOfBirth = e.nativeEvent.layout.y)}
                  onFocus={() => scrollToField("dateOfBirth")}
                />

                <InputRow
                  icon={ICONS.pin}
                  tint={ICON_TINT.pin}
                  label="Address"
                  field="address"
                  value={form.address}
                  setForm={setForm}
                  onLayout={(e) => (fieldY.current.address = e.nativeEvent.layout.y)}
                  onFocus={() => scrollToField("address")}
                />

                <InputRow
                  icon={ICONS.vehicle}
                  tint={ICON_TINT.vehicle}
                  label="Vehicle Type (e.g., 70cc / 125cc)"
                  field="vehicleType"
                  value={form.vehicleType}
                  setForm={setForm}
                  onLayout={(e) => (fieldY.current.vehicleType = e.nativeEvent.layout.y)}
                  onFocus={() => scrollToField("vehicleType")}
                />

                <View style={s.btnRow}>
                  <TouchableOpacity
                    style={[
                      s.actionBtn,
                      { backgroundColor: C.brand, opacity: saving ? 0.7 : 1 },
                    ]}
                    onPress={onSave}
                    activeOpacity={0.9}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={[s.actionText, { color: "#FFF" }]}>Save Changes</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.actionBtn, s.ghostBtn]}
                    onPress={onCancel}
                    activeOpacity={0.9}
                    disabled={saving}
                  >
                    <Text style={[s.actionText, { color: C.text }]}>Cancel</Text>
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

/* ---------- Styles ---------- */
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  topRow: { paddingHorizontal: 16, paddingTop: 32, paddingBottom: 12 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  backArrow: { fontSize: 24, color: "#5B6B82" },
  backText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#5B6B82",
    letterSpacing: 0.2,
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
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarImg: { width: 22, height: 22 },

  name: { color: C.text, fontWeight: "800", fontSize: 15, letterSpacing: 0.1 },
  idLine: { color: C.sub, fontSize: 12 },

  hr: {
    height: 1,
    backgroundColor: "#EFF2F6",
    marginVertical: 10,
    borderRadius: 1,
  },

  infoRow: { paddingVertical: 10 },
  label: { color: "#7A8AA3", fontSize: 12.5, marginBottom: 6 },
  value: { color: C.text, fontWeight: "700", lineHeight: 18 },

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
  },

  primaryBtn: {
    marginTop: 14,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.brand,
  },
  primaryText: { color: "#FFF", fontWeight: "800", letterSpacing: 0.2 },

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
  actionText: { fontWeight: "800", letterSpacing: 0.2 },
});



