// screens/OrderMedicineScreen.jsx
import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  useWindowDimensions,
  Platform,
  ScrollView,
  ActivityIndicator,
  PermissionsAndroid,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CommonActions } from "@react-navigation/native";
import Geolocation from "@react-native-community/geolocation";

const medicineIcon = require("../assets/pill.png");


import { buildUrl, GOOGLE_MAPS_APIKEY } from "../services/apiConfig";

const COLORS = {
  bg: "#F5FAF7",
  white: "#FFFFFF",
  text: "#0F172A",
  sub: "#64748B",
  greenSoft: "#ECFDF5",
  greenBorder: "#BBF7D0",
  greenMain: "#16A34A",
  greenDark: "#15803D",
  cardBorder: "#E5E7EB",
  inputBg: "#F9FAFB",
  inputBorder: "#E5E7EB",
  noteBg: "#F0FDF4",
  noteBorder: "#BBF7D0",
  noteText: "#14532D",
};


 
const validateMedicinesFormat = (text) => {
  if (!text) return false;

  const parts = text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length === 0) return false;

  for (const item of parts) {
    const tokens = item.split(/\s+/).filter(Boolean);
    if (tokens.length < 2) return false;

    const last = tokens[tokens.length - 1]; 
    if (!/^\d+/.test(last)) return false;
  }

  return true;
};


const validateEquipmentFormat = (text) => {
  if (!text) return true;
  const trimmed = text.trim();
  if (!trimmed) return true;

  if (trimmed.endsWith(",")) return false;

  const parts = trimmed.split(",");
  for (const p of parts) {
    if (!p.trim()) return false;
  }

  return true;
};

export default function OrderMedicineScreen({ navigation, route }) {
  const { width } = useWindowDimensions();
  const isSmall = width < 380;

  const routePatient = route?.params?.patient || null;
  const routePatientId =
    route?.params?.patientId || routePatient?._id || routePatient?.id || null;

  // ✅ persistence ke liye local states
  const [patient, setPatient] = useState(routePatient);
  const [patientId, setPatientId] = useState(routePatientId);
  const [loading, setLoading] = useState(true);

  const patientName =
    routePatient?.fullName || route?.params?.name || "Patient User";
  const patientPhone =
    routePatient?.phone || route?.params?.phone || "03001234567";

  const [medicines, setMedicines] = useState("");
  const [equip, setEquip] = useState("");

  
  const [upload, setUpload] = useState(null);

  const [coords, setCoords] = useState(null);
  const [priority, setPriority] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const savedData = await AsyncStorage.getItem("patientData");
        const savedId = await AsyncStorage.getItem("patientId");
        const rawLoc = await AsyncStorage.getItem("userLocation");

        if (savedData && !patient) setPatient(JSON.parse(savedData));
        if (savedId && !patientId) setPatientId(savedId);
        if (rawLoc) setCoords(JSON.parse(rawLoc));
      } catch (err) {
        console.log("PATIENT DATA AND LOC LOAD ERROR =>", err);
      }finally {
        setLoading(false);
      }
    };
    loadSavedData();
  }, [patientId]);

  const handleBack = () => {
    if (navigation?.canGoBack && navigation.canGoBack()) navigation.goBack();
    else
      navigation.reset({
        index: 0,
        routes: [{ name: "PatientMenu" }],
      });
  };

  const requestAndroidLocationPermission = async () => {
    if (Platform.OS !== "android") return true;

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "Location Permission",
          message:
            "The Last Hope needs your current location for medicine delivery.",
          buttonPositive: "Allow",
          buttonNegative: "Cancel",
        }
      );

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.log("Medicine order location permission error:", error);
      return false;
    }
  };

  const reverseGeocodeAddress = async (lat, lng) => {
    try {
      if (GOOGLE_MAPS_APIKEY && !GOOGLE_MAPS_APIKEY.includes("PASTE")) {
        const url =
          `https://maps.googleapis.com/maps/api/geocode/json` +
          `?latlng=${lat},${lng}` +
          `&key=${GOOGLE_MAPS_APIKEY}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data?.status === "OK" && data?.results?.length > 0) {
          return data.results[0].formatted_address;
        }
      }

      const bigDataUrl =
        `https://api.bigdatacloud.net/data/reverse-geocode-client` +
        `?latitude=${lat}&longitude=${lng}&localityLanguage=en`;

      const bigDataResponse = await fetch(bigDataUrl);
      const bigData = await bigDataResponse.json();

      const bigDataParts = [
        bigData?.locality,
        bigData?.city,
        bigData?.principalSubdivision,
        bigData?.countryName,
      ].filter(Boolean);

      if (bigDataParts.length > 0) {
        return [...new Set(bigDataParts)].join(", ");
      }

      const osmUrl =
        `https://nominatim.openstreetmap.org/reverse` +
        `?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;

      const osmResponse = await fetch(osmUrl, {
        headers: { Accept: "application/json" },
      });
      const osmData = await osmResponse.json();

      if (osmData?.display_name) {
        return osmData.display_name;
      }

      return "Address not available";
    } catch (error) {
      console.log("Medicine order reverse geocode error:", error);
      return "Address not available";
    }
  };

  const getFreshDeliveryLocation = async () => {
    const allowed = await requestAndroidLocationPermission();

    if (!allowed) {
      return null;
    }

    return new Promise((resolve) => {
      Geolocation.getCurrentPosition(
        async (position) => {
          const lat = Number(position.coords.latitude);
          const lng = Number(position.coords.longitude);
          let address = await reverseGeocodeAddress(lat, lng);

          const savedAddress = String(coords?.address || "").trim();
          const isBadAddress =
            !address ||
            address === "Address not available" ||
            address.toLowerCase() === "current gps location" ||
            address.toLowerCase() === "current location";

          if (isBadAddress && savedAddress &&
              savedAddress !== "Address not available" &&
              savedAddress.toLowerCase() !== "current gps location" &&
              savedAddress.toLowerCase() !== "current location") {
            address = savedAddress;
          }

          resolve({
            latitude: lat,
            longitude: lng,
            address,
          });
        },
        (error) => {
          console.log("Medicine order current location error:", error.message);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  };

  
  const pickImage = async () => {
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
            console.log("Picker error:", res.errorCode, res.errorMessage);
            Alert.alert("Picker Error", res.errorMessage || res.errorCode);
            return;
          }

          const a = res.assets?.[0];
          if (!a) return;

         
          if (!a.base64) {
            Alert.alert(
              "Base64 Missing",
              "Image base64 not received. Please reinstall picker or try another image."
            );
            return;
          }

          const mime = a.type || "image/jpeg";
          const dataUri = `data:${mime};base64,${a.base64}`;

          setUpload({
            uri: a.uri, // preview
            fileName: a.fileName || "prescription.jpg",
            base64DataUri: dataUri, 
          });
        }
      );
    } catch (err) {
      console.log("IMG PICK ERROR =>", err);
      Alert.alert("Image Picker Missing", "Run: npm i react-native-image-picker");
    }
  };

  const onSubmit = async () => {
    if (submitting) return;

    if (!patientId) {
      Alert.alert(
        "No Patient",
        "Patient ID missing. Please login again and open Order Medicine."
      );
      return;
    }

    try {
      const activeRes = await fetch(
        buildUrl(`/api/medicine-orders/active-session/${patientId}`)
      );
      const activeData = await activeRes.json().catch(() => ({}));
      const activeStatus = String(activeData?.order?.status || "").toLowerCase();

      if (
        activeRes.ok &&
        activeData?.success &&
        activeData?.order &&
        ["pharmacy_processing", "dispatching", "delivering"].includes(activeStatus)
      ) {
        Alert.alert(
          "Request Already Active",
          "Your medicine request is already active now. You can't do new request until you complete or cancel your previous request.",
          [
            {
              text: "View Request",
              onPress: () => {
                navigation.navigate("MedicineOrderTracking", {
                  order: activeData.order,
                  patient,
                  patientId,
                });
              },
            },
            { text: "OK" },
          ]
        );
        return;
      }
    } catch (activeErr) {
      console.log("Active medicine request check error:", activeErr.message);
    }

    const medsText = medicines.trim();
    const equipText = equip.trim();

    if (!medsText) {
      Alert.alert(
        "Required medicines",
        "Please enter medicines like: Panadol 500mg, Augmentin 625mg."
      );
      return;
    }

    if (!validateMedicinesFormat(medsText)) {
      Alert.alert(
        "Invalid medicines format",
        "Write medicines like this: Panadol 500mg, Augmentin 625mg."
      );
      return;
    }

    if (!validateEquipmentFormat(equipText)) {
      Alert.alert(
        "Invalid equipment format",
        "Write equipment names separated by commas, e.g. Blood pressure monitor, Thermometer."
      );
      return;
    }

    if (!upload?.base64DataUri) {
      Alert.alert(
        "Prescription required",
        "Please upload a prescription image before submitting."
      );
      return;
    }

    if (!priority) {
      Alert.alert(
        "Select Type",
        "Please select Emergency Prescription or Regular Prescription."
      );
      return;
    }

    try {
      setSubmitting(true);

      const freshLocation = await getFreshDeliveryLocation();

      let deliveryLocation = null;

      if (freshLocation) {
        deliveryLocation = {
          lat: freshLocation.latitude,
          lng: freshLocation.longitude,
          address: freshLocation.address,
        };

        setCoords(freshLocation);
        await AsyncStorage.setItem("userLocation", JSON.stringify(freshLocation));
      } else if (coords) {
        deliveryLocation = {
          lat: coords.latitude,
          lng: coords.longitude,
          address: coords.address || "Address not available",
        };
      }

      if (!deliveryLocation) {
        Alert.alert(
          "Location Required",
          "Please allow location permission so pharmacy can see your delivery address and distance."
        );
        setSubmitting(false);
        return;
      }

      const body = {
        patientId,
        medicinesText: medsText,
        equipmentText: equipText,
        priority,
        deliveryLocation,
        prescriptionImageUrl: upload.base64DataUri,
      };

      const res = await fetch(buildUrl("/api/medicine-orders"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      let data = null;
      try {
        data = await res.json();
      } catch (e) {}

      if (!res.ok || !data?.success) {
        const msg = data?.message || "Could not submit order. Please try again.";
        Alert.alert("Error", msg);
        return;
      }

      Alert.alert("Order Submitted", "Prescription sent to nearby pharmacies.", [
        {
          text: "OK",
          onPress: () => {
            navigation.replace("MedicineOrderTracking", {
              order: data.order,
              patient,
              patientId,
            });
          },
        },
      ]);

      setMedicines("");
      setEquip("");
      setUpload(null);
      setPriority(null);
    } catch (err) {
      console.log("MED ORDER SUBMIT ERROR =>", err);
      Alert.alert(
        "Network Error",
        "Unable to submit order. Please check your Wi-Fi/backend."
      );
    } finally {
      setSubmitting(false);
    }
  };

  
  const titleSize = isSmall ? 18 : 20;
  const subtitleSize = isSmall ? 12 : 13;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <TouchableOpacity
        style={styles.backBtn}
        onPress={handleBack}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.backArrow}>←</Text>
        <Text style={styles.backText}>Back to Menu</Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: isSmall ? 12 : 16 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.cardWrap, { padding: isSmall ? 14 : 16 }]}>
          {/* Header */}
          <View
            style={[
              styles.header,
              {
                padding: isSmall ? 10 : 12,
                borderRadius: isSmall ? 10 : 12,
              },
            ]}
          >
            <View
              style={[
                styles.headerIconCircle,
                {
                  width: isSmall ? 42 : 46,
                  height: isSmall ? 42 : 46,
                  borderRadius: 999,
                },
              ]}
            >
              <Image
                source={medicineIcon}
                style={{
                  width: isSmall ? 20 : 22,
                  height: isSmall ? 20 : 22,
                  tintColor: "#fff",
                }}
              />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={[styles.title, { fontSize: titleSize }]}>
                Medicine Order Service
              </Text>
              <Text style={[styles.subtitle, { fontSize: subtitleSize }]}>
                Order medicines and medical equipment
              </Text>
            </View>
          </View>

          {/* Patient Details */}
          <View style={styles.detailsCard}>
            <Text style={styles.detailsHeading}>Patient Details</Text>

            <View style={[styles.row, { marginBottom: 6 }]}>
              <Image
                source={{
                  uri: "https://cdn-icons-png.flaticon.com/512/1077/1077012.png",
                }}
                style={styles.infoIcon}
              />
              <Text style={styles.detailLine}>
                <Text style={styles.detailBold}>Name: </Text>
                {patientName}
              </Text>
            </View>

            <View style={[styles.row, { marginBottom: 6 }]}>
              <Image
                source={{
                  uri: "https://cdn-icons-png.flaticon.com/512/597/597177.png",
                }}
                style={styles.infoIcon}
              />
              <Text style={styles.detailLine}>
                <Text style={styles.detailBold}>Contact: </Text>
                {patientPhone}
              </Text>
            </View>

            <View style={[styles.row, { marginTop: 4 }]}>
              <Image
                source={{
                  uri: "https://cdn-icons-png.flaticon.com/512/535/535239.png",
                }}
                style={styles.infoIcon}
              />
              <Text style={styles.detailLine}>
                <Text style={styles.detailBold}>Delivery Location: </Text>
                {coords?.address || "Current GPS location"}
              </Text>
            </View>
          </View>

          {/* Medicines */}
          <Text style={styles.sectionLabel}>Required Medicines</Text>
          <View style={styles.inputWrap}>
            <TextInput
              value={medicines}
              onChangeText={setMedicines}
              placeholder="List required medicines (e.g., Panadol 500mg, Augmentin 625mg)"
              placeholderTextColor="#9CA3AF"
              style={styles.inputMultiline}
              multiline
              numberOfLines={Platform.OS === "android" ? 3 : undefined}
              textAlignVertical="top"
              importantForAutofill="no"
              autoComplete="off"
              autoCorrect={false}
            />
          </View>

          {/* Equipment */}
          <Text style={styles.sectionLabel}>Medical Equipment (Optional)</Text>
          <View style={styles.inputWrap}>
            <TextInput
              value={equip}
              onChangeText={setEquip}
              placeholder="List required equipment (e.g., Blood pressure monitor, Thermometer)"
              placeholderTextColor="#9CA3AF"
              style={styles.inputMultiline}
              multiline
              numberOfLines={Platform.OS === "android" ? 3 : undefined}
              textAlignVertical="top"
              importantForAutofill="no"
              autoComplete="off"
              autoCorrect={false}
            />
          </View>

          {/* Upload */}
          <Text style={styles.sectionLabel}>Upload Prescription</Text>
          <TouchableOpacity
            style={[styles.uploadBox, { height: isSmall ? 120 : 140 }]}
            onPress={pickImage}
            activeOpacity={0.8}
          >
            {upload ? (
              <View style={{ alignItems: "center" }}>
                <Image source={{ uri: upload.uri }} style={styles.uploadImage} />
                <Text style={styles.uploadName} numberOfLines={1}>
                  {upload.fileName}
                </Text>

               
                <Text style={{ marginTop: 4, fontSize: 11, color: "#16a34a", fontWeight: "800" }}>
                  ✓ Image ready (Base64)
                </Text>
              </View>
            ) : (
              <View style={{ alignItems: "center" }}>
                <Image
                  source={{
                    uri: "https://cdn-icons-png.flaticon.com/512/4211/4211783.png",
                  }}
                  style={{
                    width: 26,
                    height: 26,
                    tintColor: COLORS.sub,
                    marginBottom: 8,
                  }}
                />
                <Text style={styles.uploadText}>
                  <Text style={styles.uploadLink}>Tap to upload</Text> or drag
                  and drop
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Prescription Type */}
          <Text style={styles.sectionLabel}>Prescription Type</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={styles.radioOption}
              activeOpacity={0.8}
              onPress={() => setPriority("emergency")}
            >
              <View style={styles.radioOuter}>
                {priority === "emergency" && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.radioLabel}>Emergency Prescription</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.radioOption}
              activeOpacity={0.8}
              onPress={() => setPriority("regular")}
            >
              <View style={styles.radioOuter}>
                {priority === "regular" && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.radioLabel}>Regular Prescription</Text>
            </TouchableOpacity>
          </View>

          {/* Note */}
          <View style={styles.noteBox}>
            <Text style={styles.noteText}>
              Your prescription will be sent to nearby pharmacies. Once
              approved, medicines will be delivered to your location.
            </Text>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.primaryBtn, submitting && { opacity: 0.7 }]}
            onPress={onSubmit}
            activeOpacity={0.9}
            disabled={submitting}
          >
            <Image
              source={{
                uri: "https://cdn-icons-png.flaticon.com/512/751/751463.png",
              }}
              style={{
                width: 18,
                height: 18,
                tintColor: "#fff",
                marginRight: 10,
              }}
            />
            <Text style={styles.primaryText}>
              {submitting ? "Submitting..." : "Submit Order"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg, paddingBottom: 40 },

  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 40,
    marginLeft: 16,
  },
  backArrow: { fontSize: 22, color: COLORS.sub, marginRight: 6, marginTop: -5 },
  backText: { color: COLORS.sub, fontSize: 14, fontWeight: "600" },

  scrollContent: {
    paddingTop: 10,
    paddingBottom: 24,
    alignItems: "center",
  },

  cardWrap: {
    width: "100%",
    maxWidth: 700,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.greenSoft,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    borderRadius: 12,
    marginBottom: 12,
  },
  headerIconCircle: {
    backgroundColor: COLORS.greenMain,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTextWrap: { flex: 1, minWidth: 0 },
  title: {
    color: COLORS.greenDark,
    fontWeight: "800",
    lineHeight: 24,
    flexShrink: 1,
  },
  subtitle: { color: COLORS.sub, marginTop: 2, lineHeight: 18, flexShrink: 1 },

  detailsCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  detailsHeading: {
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 8,
    fontSize: 15,
  },
  detailLine: { color: COLORS.text, flexShrink: 1 },
  detailBold: { fontWeight: "800", color: COLORS.text },
  row: { flexDirection: "row", alignItems: "center" },
  infoIcon: { width: 16, height: 16, tintColor: COLORS.greenDark, marginRight: 8 },

  sectionLabel: {
    color: COLORS.text,
    fontWeight: "700",
    marginBottom: 6,
    marginTop: 6,
  },

  inputWrap: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  inputMultiline: {
    fontSize: 15.5,
    color: COLORS.text,
    minHeight: 56,
    paddingVertical: Platform.select({ android: 8, ios: 12 }),
  },

  uploadBox: {
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderStyle: "dashed",
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    paddingHorizontal: 12,
    width: "100%",
  },
  uploadImage: { width: 90, height: 90, borderRadius: 8, marginBottom: 6 },
  uploadName: { color: COLORS.text, maxWidth: 220 },
  uploadText: { color: COLORS.sub },
  uploadLink: { color: COLORS.greenDark, fontWeight: "700" },

  radioGroup: { marginBottom: 8 },
  radioOption: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: COLORS.inputBorder,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    backgroundColor: COLORS.white,
  },
  radioInner: { width: 10, height: 10, borderRadius: 999, backgroundColor: COLORS.greenMain },
  radioLabel: { color: COLORS.text, fontSize: 14 },

  noteBox: {
    backgroundColor: COLORS.noteBg,
    borderWidth: 1,
    borderColor: COLORS.noteBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  noteText: { color: COLORS.noteText, fontSize: 13, lineHeight: 18 },

  primaryBtn: {
    height: 54,
    borderRadius: 12,
    backgroundColor: COLORS.greenMain,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    shadowColor: COLORS.greenMain,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 3,
  },
  primaryText: { color: "#FFFFFF", fontWeight: "900", fontSize: 15, letterSpacing: 0.3 },
});
