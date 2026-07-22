import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

import { buildUrl } from "../services/apiConfig";

const formatDateYMD = (value) => {
  if (!value) return "";

  try {
    const d = new Date(value);

    if (isNaN(d.getTime())) return value;

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    return `${y}-${m}-${day}`;
  } catch {
    return value;
  }
};

export default function PatientProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  const routePatient = route.params?.patient || null;

  const routePatientId =
    route.params?.patientId || routePatient?._id || routePatient?.id || null;

  const patientId = routePatientId;

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [emergency, setEmergency] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");

  const [totalEmergencyCalls, setTotalEmergencyCalls] = useState(0);
  const [totalBikeRides, setTotalBikeRides] = useState(0);
  const [totalMedicineOrders, setTotalMedicineOrders] = useState(0);

  const [editable, setEditable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [draft, setDraft] = useState({
    fullName: "",
    phone: "",
    email: "",
    address: "",
    emergency: "",
    dateOfBirth: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!patientId) {
        setLoading(false);
        Alert.alert(
          "No ID",
          "Patient ID not found. Please login again to load profile."
        );
        return;
      }

      try {
        const res = await fetch(buildUrl(`/api/patient/${patientId}`));

        let data = null;

        try {
          data = await res.json();
        } catch (error) {
          console.log("PROFILE LOAD NON JSON RESPONSE");
        }

        if (!res.ok || !data?.success) {
          const msg =
            data?.message || "Could not load profile. Please try again.";
          Alert.alert("Error", msg);
          setLoading(false);
          return;
        }

        const p = data.patient;

        setFullName(p.fullName || "");
        setPhone(p.phone || "");
        setEmail(p.email || "");
        setAddress(p.address || "");
        setEmergency(p.emergencyContact || "");
        setDateOfBirth(formatDateYMD(p.dateOfBirth));

        setTotalEmergencyCalls(p.totalEmergencyCalls ?? 0);
        setTotalBikeRides(p.totalBikeRides ?? 0);
        setTotalMedicineOrders(p.totalMedicineOrders ?? 0);

        setDraft({
          fullName: p.fullName || "",
          phone: p.phone || "",
          email: p.email || "",
          address: p.address || "",
          emergency: p.emergencyContact || "",
          dateOfBirth: formatDateYMD(p.dateOfBirth),
        });
      } catch (err) {
        console.log("PROFILE LOAD ERROR =>", err);
        Alert.alert(
          "Network Error",
          "Unable to connect to server. Please check your Wi-Fi/backend."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [patientId]);

  const startEdit = () => {
    setDraft({
      fullName,
      phone,
      email,
      address,
      emergency,
      dateOfBirth,
    });

    setEditable(true);
  };

  const onCancel = () => {
    setDraft({
      fullName,
      phone,
      email,
      address,
      emergency,
      dateOfBirth,
    });

    setEditable(false);
  };

  const bind = (key) => ({
    value: editable
      ? draft[key]
      : {
          fullName,
          phone,
          email,
          address,
          emergency,
          dateOfBirth,
        }[key],
    onChangeText: editable
      ? (v) => setDraft((d) => ({ ...d, [key]: v }))
      : undefined,
    editable,
  });

  const onSave = async () => {
    if (!editable) return;

    if (
      !draft.fullName.trim() ||
      !draft.phone.trim() ||
      !draft.email.trim() ||
      !draft.address.trim() ||
      !draft.dateOfBirth.trim()
    ) {
      Alert.alert(
        "Missing Info",
        "Please fill all required fields before saving."
      );
      return;
    }

    const nameRegex = /^[a-zA-Z\s]+$/;

    if (!nameRegex.test(draft.fullName.trim())) {
      Alert.alert("Invalid Name", "Full Name should contain only alphabets.");
      return;
    }

    const phoneRegex = /^[0-9]{11}$/;

    if (!phoneRegex.test(draft.phone.trim())) {
      Alert.alert(
        "Invalid Phone Number",
        "Phone Number should be exactly 11 digits."
      );
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;

    if (!emailRegex.test(draft.email.trim())) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    if (!phoneRegex.test(draft.emergency.trim())) {
      Alert.alert(
        "Invalid Emergency Number",
        "Emergency contact should be exactly 11 digits."
      );
      return;
    }

    const dobRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (!dobRegex.test(draft.dateOfBirth.trim())) {
      Alert.alert(
        "Invalid Date",
        "Please enter Date of Birth in YYYY-MM-DD format."
      );
      return;
    }

    if (!patientId) {
      Alert.alert("No ID", "Patient ID missing. Cannot update profile.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        fullName: draft.fullName.trim(),
        phone: draft.phone.trim(),
        email: draft.email.trim(),
        emergencyContact: draft.emergency.trim(),
        address: draft.address.trim(),
        dateOfBirth: draft.dateOfBirth.trim(),
      };

      // ✅ FIXED API CALL
      const res = await fetch(buildUrl(`/api/patient/${patientId}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      let data = null;

      try {
        data = await res.json();
      } catch (error) {
        console.log("PROFILE UPDATE NON JSON RESPONSE");
      }

      if (!res.ok || !data?.success) {
        const msg =
          data?.message || "Could not update profile. Please try again.";
        Alert.alert("Error", msg);
        return;
      }

      const updated = data.patient || payload;

      setFullName(updated.fullName || "");
      setPhone(updated.phone || "");
      setEmail(updated.email || "");
      setAddress(updated.address || "");
      setEmergency(updated.emergencyContact || "");
      setDateOfBirth(formatDateYMD(updated.dateOfBirth));

      setDraft({
        fullName: updated.fullName || "",
        phone: updated.phone || "",
        email: updated.email || "",
        address: updated.address || "",
        emergency: updated.emergencyContact || "",
        dateOfBirth: formatDateYMD(updated.dateOfBirth),
      });

      setEditable(false);

      Alert.alert("Success", data.message || "Profile updated successfully.");
    } catch (err) {
      console.log("PROFILE UPDATE ERROR =>", err);
      Alert.alert(
        "Network Error",
        "Unable to connect to server. Please check your Wi-Fi/backend."
      );
    } finally {
      setSaving(false);
    }
  };

  const initials =
    fullName
      ?.split(" ")
      ?.map((p) => p[0])
      ?.join("")
      ?.slice(0, 2)
      ?.toUpperCase() || "PU";

  const goBackToMenu = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("PatientMenu", {
        patient: routePatient,
        patientId,
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[s.safe, { justifyContent: "center", alignItems: "center" }]}
      >
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{ marginTop: 10, color: "#6B7280" }}>
          Loading profile...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />

      <TouchableOpacity
        style={s.backBtn}
        onPress={goBackToMenu}
        activeOpacity={0.8}
        accessibilityLabel="Go back to Patient Menu"
      >
        <Text style={s.backIcon}>←</Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={s.container}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={s.header}>
          <View>
            <Text style={s.title}>Profile Management</Text>
            <Text style={s.subtitle}>
              View and update your personal information
            </Text>
          </View>

          {!editable ? (
            <TouchableOpacity
              onPress={startEdit}
              activeOpacity={0.9}
              style={s.editBtn}
            >
              <Text style={s.editBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.actionsRow}>
              <TouchableOpacity
                onPress={onSave}
                activeOpacity={0.9}
                style={[s.saveBtn, saving && { opacity: 0.7 }]}
                disabled={saving}
              >
                <Text style={s.saveBtnText}>
                  {saving ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onCancel}
                activeOpacity={0.9}
                style={s.cancelBtn}
                disabled={saving}
              >
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={s.avatarWrap}>
          <View style={s.avatarCircle}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
        </View>

        <View style={s.card}>
          <LabeledInput label="Full Name" icon="👤" {...bind("fullName")} />

          <LabeledInput
            label="Phone Number"
            icon="📞"
            keyboardType="phone-pad"
            {...bind("phone")}
          />

          <LabeledInput
            label="Email Address"
            icon="✉️"
            keyboardType="email-address"
            autoCapitalize="none"
            {...bind("email")}
          />

          <LabeledInput label="Home Address" icon="📍" {...bind("address")} />

          <LabeledInput
            label="Emergency Contact"
            icon="🆘"
            keyboardType="phone-pad"
            {...bind("emergency")}
          />

          <LabeledInput
            label="Date of Birth (YYYY-MM-DD)"
            icon="🎂"
            placeholder="2000-04-06"
            {...bind("dateOfBirth")}
          />
        </View>

        <Text style={s.sectionHeading}>Account Statistics</Text>

        <View style={s.statsRow}>
          <StatBox
            color="#fee2e2"
            strong="#dc2626"
            value={totalEmergencyCalls.toString()}
            label="Ambulance Rides"
          />

          <StatBox
            color="#e8f0ff"
            strong="#2563eb"
            value={totalBikeRides.toString()}
            label="Bike Rides"
          />

          <StatBox
            color="#e9f8ee"
            strong="#16a34a"
            value={totalMedicineOrders.toString()}
            label="Medicine Orders"
          />
        </View>

        <View style={{ height: Platform.OS === "android" ? 84 : 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function LabeledInput({ label, icon, style, editable = false, ...props }) {
  const locked = !editable;

  return (
    <View style={[{ marginBottom: 12 }, style]}>
      <Text style={s.label}>{label}</Text>

      <View style={[s.inputWrap, editable && s.inputWrapEditing]}>
        <Text style={s.leading}>{icon}</Text>

        <TextInput
          style={s.input}
          placeholderTextColor="#94a3b8"
          editable={editable}
          focusable={editable}
          showSoftInputOnFocus={editable}
          selectTextOnFocus={false}
          caretHidden={locked}
          pointerEvents={locked ? "none" : "auto"}
          {...props}
        />
      </View>
    </View>
  );
}

function StatBox({ color, strong, value, label }) {
  return (
    <View style={[s.statBox, { backgroundColor: color, borderColor: strong }]}>
      <Text style={[s.statValue, { color: strong }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F3F6FB",
  },

  backBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 6 : 8,
    left: 10,
    zIndex: 999,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: "transparent",
    elevation: 0,
  },

  backIcon: {
    fontSize: 50,
    color: "#9c141bff",
    fontWeight: "700",
  },

  container: {
    padding: 16,
    paddingTop: Platform.OS === "ios" ? 12 : 16,
    paddingBottom: 40,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E6EBF2",
    marginTop: 50,
    shadowColor: "rgba(15,23,42,0.08)",
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },

  title: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 8,
  },

  subtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },

  editBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 8,
  },

  editBtnText: {
    fontWeight: "700",
    color: "#0F172A",
  },

  actionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },

  saveBtn: {
    backgroundColor: "#16a34a",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },

  saveBtnText: {
    color: "#fff",
    fontWeight: "800",
  },

  cancelBtn: {
    backgroundColor: "lightgrey",
    borderWidth: 1.2,
    borderColor: "#E5E7EB",
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 10,
  },

  cancelBtnText: {
    color: "#111827",
    fontWeight: "800",
  },

  avatarWrap: {
    alignItems: "center",
    marginTop: 16,
    marginBottom: 8,
  },

  avatarCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#E8F0FF",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontSize: 26,
    fontWeight: "800",
    color: "#2563EB",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E6EBF2",
    shadowColor: "rgba(15,23,42,0.06)",
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },

  label: {
    fontSize: 14,
    color: "#334155",
    marginBottom: 6,
    fontWeight: "700",
  },

  inputWrap: {
    height: 50,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },

  inputWrapEditing: {
    borderColor: "#93C5FD",
  },

  leading: {
    fontSize: 16,
    marginRight: 8,
  },

  input: {
    flex: 1,
    fontSize: 15.5,
    color: "#0F172A",
  },

  sectionHeading: {
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  statBox: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    marginHorizontal: 4,
  },

  statValue: {
    fontSize: 22,
    fontWeight: "900",
  },

  statLabel: {
    marginTop: 6,
    fontSize: 12,
    color: "#475569",
    textAlign: "center",
  },
});