import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { buildUrl } from "../services/apiConfig";

const C = {
  bg: "#F8FAFC",
  white: "#FFFFFF",
  text: "#1E293B",
  sub: "#64748B",
  border: "#E2E8F0",
  green: "#22C55E",
  greenBg: "#DCFCE7",
  greenText: "#15803D",
  red: "#EF4444",
  redBg: "#FEE2E2",
  redText: "#B91C1C",
};

export default function AmbulanceDriverPastRidesScreen({ navigation, route }) {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);

  const routeDriver = route?.params?.driver || null;

  const goBack = () => {
    if (navigation?.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("AmbulanceDriverMenu");
    }
  };

  const formatDateTime = (dateValue) => {
    if (!dateValue) return "N/A";

    const d = new Date(dateValue);
    if (Number.isNaN(d.getTime())) return "N/A";

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";

    hours = hours % 12;
    hours = hours ? hours : 12;

    return `${yyyy}-${mm}-${dd} ${String(hours).padStart(
      2,
      "0"
    )}:${minutes} ${ampm}`;
  };

  const safeJson = async (res) => {
    const text = await res.text();

    try {
      return JSON.parse(text);
    } catch (error) {
      console.log("❌ Non JSON response:", text.slice(0, 250));
      throw new Error(
        `Backend JSON response nahi de raha. Status: ${res.status}`
      );
    }
  };

  const getDriverFromSession = async () => {
    if (routeDriver) return routeDriver;

    const sessionRaw = await AsyncStorage.getItem("ERS_SESSION");

    if (!sessionRaw) return null;

    const session = JSON.parse(sessionRaw);

    return session?.driver || session?.ambulanceDriver || session?.user || null;
  };

  const fetchPastRides = async () => {
    try {
      setLoading(true);

      const driver = await getDriverFromSession();

      const driverId =
        driver?._id ||
        driver?.id ||
        driver?.driverId ||
        route?.params?.driverId ||
        null;

      if (!driverId) {
        Alert.alert("Error", "Driver ID not found. Please login again.");
        setRides([]);
        return;
      }

      const url = buildUrl(`/api/ambulance/driver/completed-rides/${driverId}`);
      console.log("AMBULANCE PAST RIDES API =>", url);

      const res = await fetch(url);
      const data = await safeJson(res);

      if (!res.ok || !data?.success) {
        Alert.alert("Error", data?.message || "Could not fetch past rides.");
        setRides([]);
        return;
      }

      const pastRides = Array.isArray(data.rides)
        ? data.rides.filter((ride) => {
            const status = String(ride?.status || "").toLowerCase();
            return (
              status === "completed" ||
              status === "cancelled" ||
              status === "canceled"
            );
          })
        : [];

      setRides(pastRides);
    } catch (error) {
      console.log("Past Rides Fetch Error:", error);
      Alert.alert(
        "Network Error",
        error.message || "Could not fetch past rides."
      );
      setRides([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPastRides();
  }, []);

  const getPatientName = (ride) => {
    return (
      ride?.patientInfo?.name ||
      ride?.patient?.fullName ||
      ride?.patient?.name ||
      ride?.patientName ||
      "Patient"
    );
  };

  const getPickupAddress = (ride) => {
    return (
      ride?.pickupLocation?.address ||
      ride?.pickupLocation?.name ||
      ride?.pickupAddress ||
      "N/A"
    );
  };

  const getDropAddress = (ride) => {
    return (
      ride?.selectedHospital?.name ||
      ride?.selectedHospital?.address ||
      ride?.dropoffLocation?.address ||
      ride?.dropoffLocation?.name ||
      ride?.hospitalName ||
      ride?.dropoffAddress ||
      "N/A"
    );
  };

  const getFare = (ride) => {
    const fare = Number(
      ride?.fareAmount || ride?.fare || ride?.paymentAmount || ride?.amount || 0
    );

    return Number.isFinite(fare) ? fare.toLocaleString("en-PK") : "0";
  };

  const isCancelledRide = (ride) => {
    const status = String(ride?.status || "").toLowerCase();
    return status === "cancelled" || status === "canceled";
  };

  const getStatusLabel = (ride) => {
    return isCancelledRide(ride) ? "Cancelled" : "Completed";
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <View style={s.topRow}>
        <TouchableOpacity onPress={goBack} style={s.backBtn} activeOpacity={0.7}>
          <Text style={s.backArrow}>←</Text>
          <Text style={s.backText}>Past Rides</Text>
        </TouchableOpacity>
      </View>

      <View style={s.pageHeader}>
        <Text style={s.title}>Your past ambulance rides</Text>
        <Text style={s.subtitle}>
          Review completed and cancelled ride details.
        </Text>
      </View>

      {loading ? (
        <View style={s.centerBox}>
          <ActivityIndicator size="small" color={C.red} />
          <Text style={s.loadingText}>Loading past rides...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.container}
          showsVerticalScrollIndicator={false}
        >
          {rides.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyTitle}>No past rides yet</Text>
              <Text style={s.emptySub}>
                Completed and cancelled ambulance rides will appear here.
              </Text>
            </View>
          ) : (
            rides.map((ride) => {
              const rideId = ride?._id || ride?.id || ride?.requestCode;
              const patientName = getPatientName(ride);
              const pickup = getPickupAddress(ride);
              const drop = getDropAddress(ride);
              const fare = getFare(ride);
              const cancelled = isCancelledRide(ride);

              const datetime = formatDateTime(
                ride?.completedAt ||
                  ride?.cancelledAt ||
                  ride?.updatedAt ||
                  ride?.createdAt ||
                  ride?.requestedAt
              );

              return (
                <View key={rideId} style={s.card}>
                  <View style={s.headerRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.patientText}>Patient: {patientName}</Text>
                      <Text style={s.rideCodeText}>
                        Ride ID:{" "}
                        {ride?.requestCode ||
                          ride?.orderCode ||
                          String(rideId || "").slice(-6).toUpperCase()}
                      </Text>
                    </View>

                    <View style={[s.pill, cancelled && s.cancelPill]}>
                      <Text style={[s.pillText, cancelled && s.cancelPillText]}>
                        {getStatusLabel(ride)}
                      </Text>
                    </View>
                  </View>

                  <View style={s.row}>
                    <View style={s.col}>
                      <Text style={s.label}>Pickup Location</Text>
                      <Text style={s.value} numberOfLines={3}>
                        <Text style={{ color: C.red }}>📍</Text> {pickup}
                      </Text>
                    </View>

                    <View style={s.col}>
                      <Text style={s.label}>Drop-off Location</Text>
                      <Text style={s.value} numberOfLines={3}>
                        <Text style={{ color: C.green }}>🏥</Text> {drop}
                      </Text>
                    </View>
                  </View>

                  <View style={s.row}>
                    <View style={s.col}>
                      <Text style={s.label}>Fare</Text>
                      <Text style={s.fareValue}>💰 Rs. {fare}</Text>
                    </View>

                    <View style={s.col}>
                      <Text style={s.label}>
                        {cancelled ? "Cancelled Date" : "Completed Date"}
                      </Text>
                      <Text style={s.dateValue}>📅 {datetime}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },

  topRow: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },

  backBtn: {
    flexDirection: "row",
    alignItems: "center",
  },

  backArrow: {
    fontSize: 22,
    color: "#475569",
    fontWeight: "600",
  },

  backText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#475569",
    marginLeft: 8,
  },

  pageHeader: {
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 12,
  },

  title: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "800",
  },

  subtitle: {
    color: C.sub,
    fontSize: 13,
    marginTop: 3,
    lineHeight: 18,
  },

  container: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
  },

  loadingText: {
    marginTop: 8,
    color: C.sub,
    fontSize: 13,
    fontWeight: "600",
  },

  emptyCard: {
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 24,
    marginTop: 20,
    alignItems: "center",
  },

  emptyTitle: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "700",
  },

  emptySub: {
    color: C.sub,
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },

  card: {
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginTop: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 10,
    marginBottom: 10,
    gap: 10,
  },

  patientText: {
    color: C.sub,
    fontSize: 13,
    fontWeight: "700",
  },

  rideCodeText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 3,
  },

  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: C.greenBg,
  },

  pillText: {
    color: C.greenText,
    fontSize: 11,
    fontWeight: "700",
  },

  cancelPill: {
    backgroundColor: C.redBg,
  },

  cancelPillText: {
    color: C.redText,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    marginTop: 8,
  },

  col: {
    flex: 1,
  },

  label: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  value: {
    color: "#334155",
    fontWeight: "700",
    fontSize: 13.5,
    marginTop: 3,
    lineHeight: 17,
  },

  fareValue: {
    color: "#1E293B",
    fontWeight: "800",
    fontSize: 14,
    marginTop: 3,
  },

  dateValue: {
    color: "#334155",
    fontWeight: "600",
    fontSize: 12.5,
    marginTop: 3,
    lineHeight: 17,
  },
});