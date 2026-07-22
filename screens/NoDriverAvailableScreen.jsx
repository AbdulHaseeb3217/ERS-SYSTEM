import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Linking,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CommonActions } from "@react-navigation/native";

const ambulanceIcon = require("../assets/ambulance.png");

const COLORS = {
  bg: "#F5F7FA",
  white: "#FFFFFF",
  text: "#0F172A",
  sub: "#64748B",
  softRed: "#FEF2F2",
  redBorder: "#FCA5A5",
  redMain: "#DC2626",
  redDark: "#B91C1C",
  cardBorder: "#E5E7EB",
  errorBg: "#FEE2E2",
  errorText: "#991B1B",
  errorBorder: "#FECACA",
  greenMain: "#16A34A",
  blueMain: "#2563EB",
};

export default function NoDriverAvailableScreen({ navigation, route }) {
  const patient = route.params?.patient || null;
  const [location, setLocation] = useState(null);
  const [loadingLoc, setLoadingLoc] = useState(true);

  const displayName = patient?.fullName || "Patient User";
  const displayPhone = patient?.phone || "+92 300 1234567";

  // AsyncStorage se location fetch karna
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem("userLocation");
        if (raw) {
          setLocation(JSON.parse(raw));
        }
      } catch (e) {
        console.log("Error reading location:", e);
      } finally {
        setLoadingLoc(false);
      }
    })();
  }, []);

  const dialNumber = (num) => {
    Linking.openURL(`tel:${num}`);
  };

  // ✅ Fix for "White Screen" - Clear stack and navigate fresh
  const handleTryAgain = () => {
    navigation.replace("EmergencyAmbulance", { patient });
  };

  // ✅ Fix for "No ID" error on Menu
  const handleBackToMenu = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "PatientMenu", params: { patient, preventRedirect: true } }],
      })
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* Header Back Button */}
      <TouchableOpacity
        style={styles.backBtnTop}
        onPress={handleBackToMenu}
      >
        <Text style={styles.backArrow}>←</Text>
        <Text style={styles.backText}>Back to Menu</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.cardWrap}>
          {/* Main Title Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerIconCircle}>
              <Image source={ambulanceIcon} style={styles.headerIcon} />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerTitle}>Emergency Ambulance Service</Text>
              <Text style={styles.headerSubtitle}>
                Immediate medical emergency response
              </Text>
            </View>
          </View>

          {/* Patient Details Section */}
          <View style={styles.detailsCard}>
            <Text style={styles.detailsHeading}>Patient Details</Text>
            <View style={styles.detailRow}>
              <Image source={{ uri: "https://cdn-icons-png.flaticon.com/512/1077/1077012.png" }} style={styles.infoIcon} />
              <Text style={styles.detailText}>
                <Text style={styles.detailLabel}>Name: </Text>{displayName}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Image source={{ uri: "https://cdn-icons-png.flaticon.com/512/597/597177.png" }} style={styles.infoIcon} />
              <Text style={styles.detailText}>
                <Text style={styles.detailLabel}>Contact: </Text>{displayPhone}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Image
                source={{ uri: "https://cdn-icons-png.flaticon.com/512/535/535239.png" }}
                style={styles.infoIcon}
              />
              <Text style={styles.detailLabel}>Current Location: </Text>
              <Text style={styles.detailValue}>
                {loadingLoc
                  ? "Fetching GPS location..."
                  : location
                  ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
                  : "Location unavailable"}
              </Text>
            </View>
          </View>

          {/* Status Line */}
          <View style={styles.statusDivider} />
          <Text style={styles.requestStatusText}>Request Status: No driver</Text>

          {/* Error Message Box */}
          <View style={styles.errorBox}>
            <View style={styles.errorHeader}>
              <Text style={styles.errorIconCircle}>🛈</Text>
              <Text style={styles.errorTitle}>No driver accepted your request!</Text>
            </View>
            <Text style={styles.errorSubText}>
              Our ambulance drivers are currently unavailable. Please contact
              alternative emergency services immediately.
            </Text>
          </View>

          {/* Alternative Services Section */}
          <Text style={styles.altHeading}>Alternative Emergency Services</Text>
          <Text style={styles.altSubHeading}>You can manually dial these emergency numbers:</Text>

          {/* Service Rows */}
          {[
            { name: "Rescue 1122", sub: "National Emergency Service", num: "1122" },
            { name: "Edhi Ambulance", sub: "Free Ambulance Service", num: "115" },
            { name: "Chhipa Ambulance", sub: "24/7 Emergency Response", num: "1020" },
            { name: "Aman Ambulance", sub: "Private Emergency Service", num: "1021" },
          ].map((item, index) => (
            <View key={index} style={styles.serviceRow}>
              <View style={styles.serviceIconWrap}>
                <Text style={styles.phoneIconRed}>📞</Text>
              </View>
              <View style={styles.serviceTextWrap}>
                <Text style={styles.serviceName}>{item.name}</Text>
                <Text style={styles.serviceSub}>{item.sub}</Text>
              </View>
              <TouchableOpacity
                style={styles.dialBtn}
                onPress={() => dialNumber(item.num)}
              >
                <Text style={styles.dialBtnText}>📞 {item.num}</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* Bottom Action Buttons */}
          <View style={styles.bottomActions}>
            <TouchableOpacity
              style={styles.tryAgainBtn}
              onPress={handleTryAgain}
            >
              <Text style={styles.tryAgainText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backMenuBtn}
              onPress={handleBackToMenu}
            >
              <Text style={styles.backMenuText}>Back to Menu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  backBtnTop: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    marginLeft: 16,
    marginBottom: 5,
  },
  backArrow: { fontSize: 22, color: COLORS.text, marginRight: 8 },
  backText: { fontSize: 14, color: COLORS.text, fontWeight: "500" },
  scrollContent: { padding: 12, paddingBottom: 30 },
  cardWrap: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.redBorder,
    // Soft red background like Pic 3
    backgroundColor: "#FFFAFA",
  },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  headerIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.redMain,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerIcon: { width: 25, height: 25, tintColor: "#FFF" },
  headerTitle: { color: COLORS.redMain, fontWeight: "700", fontSize: 18 },
  headerSubtitle: { color: COLORS.sub, fontSize: 12 },

  detailsCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  detailsHeading: { color: COLORS.sub, fontSize: 12, marginBottom: 8 },
  detailText: { fontSize: 14, color: COLORS.text, marginBottom: 4 },
  detailLabel: { fontWeight: "700" },
  detailRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  infoIcon: { width: 14, height: 14, marginRight: 5, tintColor: COLORS.redDark },
  detailValue: { fontSize: 13, color: COLORS.text },

  statusDivider: { height: 3, backgroundColor: "#CBD5E1", borderRadius: 2 },
  requestStatusText: {
    fontSize: 12,
    color: COLORS.sub,
    marginTop: 8,
    marginBottom: 15,
  },

  errorBox: {
    backgroundColor: COLORS.errorBg,
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.errorBorder,
    marginBottom: 20,
  },
  errorHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  errorIconCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: COLORS.text,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "bold",
    marginRight: 8,
  },
  errorTitle: { fontWeight: "700", color: COLORS.text, fontSize: 14 },
  errorSubText: { color: "#7F1D1D", fontSize: 12, lineHeight: 18 },

  altHeading: { fontWeight: "700", color: COLORS.redMain, fontSize: 14 },
  altSubHeading: { color: COLORS.sub, fontSize: 11, marginBottom: 15, marginTop: 4 },

  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    elevation: 1,
  },
  serviceIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.errorBg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  phoneIconRed: { fontSize: 16 },
  serviceTextWrap: { flex: 1 },
  serviceName: { fontWeight: "700", fontSize: 14, color: COLORS.text },
  serviceSub: { fontSize: 10, color: COLORS.sub },
  dialBtn: {
    backgroundColor: COLORS.greenMain,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  dialBtnText: { color: "#FFF", fontWeight: "700", fontSize: 13 },

  bottomActions: {
    flexDirection: "row",
    marginTop: 15,
    justifyContent: "space-between",
  },
  tryAgainBtn: {
    backgroundColor: COLORS.blueMain,
    flex: 1,
    height: 45,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  tryAgainText: { color: "#FFF", fontWeight: "700" },
  backMenuBtn: {
    backgroundColor: COLORS.white,
    flex: 1,
    height: 45,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  backMenuText: { color: COLORS.text, fontWeight: "500" },
});