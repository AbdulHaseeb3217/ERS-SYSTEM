import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { buildUrl } from "../services/apiConfig";

const C = {
  bg: "#F6FAFF",
  white: "#FFFFFF",
  text: "#0F172A",
  sub: "#64748B",
  border: "#E6EEF8",
  green: "#16A34A",
  red: "#DC2626",
  blue: "#2563EB",
};

const PIN_URL = "https://cdn-icons-png.flaticon.com/512/535/535239.png";

const AMB_LOCAL = require("../assets/ambulance.png");
const BIKE_LOCAL = require("../assets/sportbike.png");
const MED_LOCAL = require("../assets/pill.png");

export default function PatientHistoryScreen({ navigation }) {
  const route = useRoute();
  const routePatient = route.params?.patient || null;
  const routePatientId =
    route.params?.patientId || routePatient?._id || routePatient?.id || null;

  const [tab, setTab] = useState("ambulance");

  const [ambRides, setAmbRides] = useState([]);
  const [loadingAmb, setLoadingAmb] = useState(false);

  const [bikeRides, setBikeRides] = useState([]);
  const [loadingBike, setLoadingBike] = useState(false);

  const [medOrders, setMedOrders] = useState([]);
  const [loadingMed, setLoadingMed] = useState(false);

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

  const normalizeRideStatus = (status) =>
    String(status || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/-/g, "_");

  const isCompletedOrCancelled = (status) => {
    const normalized = normalizeRideStatus(status);

    return ["completed", "cancelled", "canceled"].includes(normalized);
  };

  const normalizeStatus = (status) => {
    const normalized = normalizeRideStatus(status);

    if (!normalized) return "Completed";
    if (normalized === "cancelled" || normalized === "canceled") {
      return "Cancelled";
    }
    if (normalized === "completed") return "Completed";

    const text = normalized.replace(/_/g, " ");

    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  const safeJson = async (res) => {
    const text = await res.text();

    try {
      return JSON.parse(text);
    } catch (error) {
      console.log("❌ Backend non-JSON response:", text.slice(0, 250));

      throw new Error(
        `Backend JSON response nahi de raha. Status: ${res.status}`
      );
    }
  };

  const fetchJsonWithFallback = async (paths = []) => {
    let lastError = null;

    for (const path of paths) {
      try {
        const url = buildUrl(path);
        console.log("HISTORY API HIT =>", url);

        const res = await fetch(url);
        const data = await safeJson(res);

        if (res.ok && data?.success) {
          return data;
        }

        lastError = new Error(data?.message || `Request failed: ${res.status}`);
      } catch (error) {
        lastError = error;
        console.log("History API failed:", path, error.message);
      }
    }

    throw lastError || new Error("History fetch failed");
  };

  const getPatientId = async () => {
    if (routePatientId) return routePatientId;

    const sessionRaw = await AsyncStorage.getItem("ERS_SESSION");

    if (sessionRaw) {
      const session = JSON.parse(sessionRaw);

      return session?.patient?._id || session?.patient?.id || null;
    }

    return null;
  };

  const fetchPatientAmbHistory = async () => {
    try {
      const patientId = await getPatientId();

      if (!patientId) return;

      setLoadingAmb(true);

      const data = await fetchJsonWithFallback([
        `/api/ambulance/patient/completed-rides/${patientId}`,
      ]);

      const rawRides = Array.isArray(data.rides)
        ? data.rides
        : Array.isArray(data.history)
        ? data.history
        : Array.isArray(data.requests)
        ? data.requests
        : Array.isArray(data.items)
        ? data.items
        : [];

      const completedAndCancelledRides = rawRides.filter((ride) =>
        isCompletedOrCancelled(ride?.status)
      );

      setAmbRides(completedAndCancelledRides);
    } catch (error) {
      console.error("Error fetching ambulance history:", error.message);
      setAmbRides([]);
    } finally {
      setLoadingAmb(false);
    }
  };

  const fetchPatientBikeHistory = async () => {
    try {
      const patientId = await getPatientId();

      if (!patientId) return;

      setLoadingBike(true);

      const data = await fetchJsonWithFallback([
        `/api/bike-rides/patient/history/${patientId}`,
        `/api/patients/patient/${patientId}/bike-history`,
        `/api/patient/patient/${patientId}/bike-history`,
        `/api/patients/${patientId}/bike-history`,
        `/api/patient/${patientId}/bike-history`,
      ]);

      const rawRides = Array.isArray(data.rides)
        ? data.rides
        : Array.isArray(data.history)
        ? data.history
        : Array.isArray(data.items)
        ? data.items
        : Array.isArray(data.data)
        ? data.data
        : [];

      const completedAndCancelledBikeRides = rawRides.filter((ride) =>
        isCompletedOrCancelled(ride?.status)
      );

      setBikeRides(completedAndCancelledBikeRides);
    } catch (error) {
      console.error("Error fetching bike ride history:", error.message);
      setBikeRides([]);
    } finally {
      setLoadingBike(false);
    }
  };

  const fetchPatientMedicineHistory = async () => {
    try {
      const patientId = await getPatientId();

      if (!patientId) return;

      setLoadingMed(true);

      const data = await fetchJsonWithFallback([
        `/api/patients/patient/${patientId}/medicine-history`,
        `/api/patient/patient/${patientId}/medicine-history`,
        `/api/patients/${patientId}/medicine-history`,
        `/api/patient/${patientId}/medicine-history`,
      ]);

      setMedOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (error) {
      console.error("Error fetching medicine order history:", error.message);
      setMedOrders([]);
    } finally {
      setLoadingMed(false);
    }
  };

  useEffect(() => {
    if (tab === "ambulance") fetchPatientAmbHistory();
    if (tab === "bike") fetchPatientBikeHistory();
    if (tab === "med") fetchPatientMedicineHistory();
  }, [tab]);

  const goBack = () => {
    if (navigation && navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("PatientMenu", {
        patient: routePatient,
        patientId: routePatientId,
      });
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <TouchableOpacity onPress={goBack} style={s.backRow} activeOpacity={0.8}>
        <Text style={s.backArrow}>←</Text>
        <Text style={s.backText}>Back to Menu</Text>
      </TouchableOpacity>

      <View style={s.container}>
        <Text style={s.title}>Service History</Text>
        <Text style={s.subtitle}>View all your past bookings and orders</Text>

        <View style={s.tabs}>
          <TabBtn
            icon={AMB_LOCAL}
            active={tab === "ambulance"}
            label="Ambulance"
            onPress={() => setTab("ambulance")}
          />

          <TabBtn
            icon={BIKE_LOCAL}
            active={tab === "bike"}
            label="Bike Rides"
            onPress={() => setTab("bike")}
          />

          <TabBtn
            icon={MED_LOCAL}
            active={tab === "med"}
            label="Medicines"
            onPress={() => setTab("med")}
          />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {tab === "ambulance" &&
            (loadingAmb ? (
              <LoadingState text="Fetching ambulance history..." />
            ) : ambRides.length === 0 ? (
              <EmptyState
                title="No ambulance rides found"
                sub="Your ambulance rides will show here."
              />
            ) : (
              ambRides.map((x) => {
                const driverName =
                  x?.driver?.fullName ||
                  x?.driver?.name ||
                  x?.driverInfo?.name ||
                  "Unknown Driver";

                const vehicleNo =
                  x?.driver?.ambulanceNumber ||
                  x?.driver?.vehiclePlateAddress ||
                  x?.driver?.vehicleNo ||
                  x?.driver?.vehicleNumber ||
                  "N/A";

                const pickupAddress = x?.pickupLocation?.address || "N/A";

                const dropAddress =
                  x?.selectedHospital?.name ||
                  x?.hospitalName ||
                  x?.dropoffLocation?.address ||
                  "N/A";

                const formattedFare = Number(
                  x?.fareAmount || x?.fare || 0
                ).toLocaleString("en-PK");

                const rideTime = formatDateTime(
                  x?.completedAt ||
                    x?.cancelledAt ||
                    x?.canceledAt ||
                    x?.cancelAt ||
                    x?.updatedAt ||
                    x?.requestedAt ||
                    x?.createdAt
                );

                return (
                  <TransportCard
                    key={x._id || x.id}
                    tone="ambulance"
                    leftTop1={`Driver: ${driverName}`}
                    leftTop2={`Ambulance: ${vehicleNo}`}
                    pick={pickupAddress}
                    drop={dropAddress}
                    datetime={rideTime}
                    fare={`Rs. ${formattedFare}`}
                    status={normalizeStatus(x.status)}
                  />
                );
              })
            ))}

          {tab === "bike" &&
            (loadingBike ? (
              <LoadingState text="Fetching bike ride history..." />
            ) : bikeRides.length === 0 ? (
              <EmptyState
                title="No bike ride history found"
                sub="Your bike rides will show here."
              />
            ) : (
              bikeRides.map((x) => (
                <TransportCard
                  key={x.id || x._id || x.rideCode}
                  tone="bike"
                  leftTop1={`Rider: ${x.riderName || "Unknown Rider"}`}
                  leftTop2={`Bike: ${x.bikeNumber || "N/A"}`}
                  pick={x.pickupLocation || "N/A"}
                  drop={x.dropoffLocation || "N/A"}
                  datetime={formatDateTime(
                    x.dateTime ||
                      x.completedAt ||
                      x.cancelledAt ||
                      x.canceledAt ||
                      x.updatedAt ||
                      x.requestedAt ||
                      x.createdAt
                  )}
                  fare={
                    x.fare ||
                    `Rs. ${Number(x.fareAmount || 0).toLocaleString("en-PK")}`
                  }
                  status={normalizeStatus(x.status)}
                />
              ))
            ))}

          {tab === "med" &&
            (loadingMed ? (
              <LoadingState text="Fetching medicine history..." />
            ) : medOrders.length === 0 ? (
              <EmptyState
                title="No medicine order history found"
                sub="Your medicine orders will show here."
              />
            ) : (
              medOrders.map((x) => (
                <MedicineCard
                  key={x.id || x._id || x.orderCode}
                  pharmacy={x.pharmacyName || "Unknown Pharmacy"}
                  deliveredBy={x.deliveredBy || "Not assigned yet"}
                  items={x.items || "Medicine / Equipment"}
                  amount={
                    x.amount ||
                    `Rs. ${Number(x.amountRaw || 0).toLocaleString("en-PK")}`
                  }
                  datetime={formatDateTime(
                    x.dateTime || x.deliveredAt || x.requestedAt
                  )}
                  status={normalizeStatus(x.status)}
                />
              ))
            ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function LoadingState({ text }) {
  return (
    <View style={s.spinnerState}>
      <ActivityIndicator size="small" color={C.blue} />
      <Text style={s.loadingTxt}>{text}</Text>
    </View>
  );
}

function EmptyState({ title, sub }) {
  return (
    <View style={s.emptyCard}>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptySub}>{sub}</Text>
    </View>
  );
}

function TabBtn({ active, label, icon, onPress }) {
  const source = typeof icon === "string" ? { uri: icon } : icon;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[s.tabBtn, active && s.tabActive]}
    >
      <Image source={source} style={s.tabIcon} />
      <Text style={[s.tabText, active && s.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Pill({ text }) {
  const statusText = String(text || "").toLowerCase();

  const isCancelled =
    statusText.includes("cancelled") || statusText.includes("canceled");

  const isCompleted = statusText.includes("completed");

  const bgColor = isCancelled
    ? "#FEE2E2"
    : isCompleted
    ? "#DCFCE7"
    : "#DBEAFE";

  const textColor = isCancelled
    ? "#991B1B"
    : isCompleted
    ? "#166534"
    : "#1E40AF";

  return (
    <View style={[s.pill, { backgroundColor: bgColor }]}>
      <Text style={[s.pillText, { color: textColor }]}>{text}</Text>
    </View>
  );
}

function TransportCard({
  tone = "ambulance",
  leftTop1,
  leftTop2,
  pick,
  drop,
  datetime,
  fare,
  status,
}) {
  const accent = tone === "bike" ? C.blue : C.red;

  return (
    <View style={s.card}>
      <View style={s.cardHead}>
        <View style={s.cardHeadLeft}>
          <View style={[s.roundIcon, { borderColor: accent }]}>
            <Text style={{ fontSize: 12 }}>
              {tone === "bike" ? "🏍️" : "🚑"}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={s.headLine1}>{leftTop1}</Text>
            <Text style={s.headLine2}>{leftTop2}</Text>
          </View>
        </View>

        <Pill text={status} />
      </View>

      <View style={s.divider} />

      <View style={s.twoCol}>
        <View style={s.col}>
          <Text style={s.rowSmallLabel}>Pickup Location</Text>

          <View style={s.pinRow}>
            <Image
              source={{ uri: PIN_URL }}
              style={[s.pinIcon, { tintColor: C.green }]}
            />
            <Text style={s.rowStrong}>{pick}</Text>
          </View>
        </View>

        <View style={s.col}>
          <Text style={s.rowSmallLabel}>Drop Location</Text>

          <View style={s.pinRow}>
            <Image
              source={{ uri: PIN_URL }}
              style={[s.pinIcon, { tintColor: C.red }]}
            />
            <Text style={s.rowStrong}>{drop}</Text>
          </View>
        </View>
      </View>

      <View style={s.twoCol}>
        <View style={s.col}>
          <Text style={s.rowSmallLabel}>Date & Time</Text>
          <Text style={s.rowStrong}>📅 {datetime}</Text>
        </View>

        <View style={s.col}>
          <Text style={s.rowSmallLabel}>Fare</Text>
          <Text style={s.rowStrong}>💵 {fare}</Text>
        </View>
      </View>
    </View>
  );
}

function MedicineCard({
  pharmacy,
  deliveredBy,
  items,
  amount,
  datetime,
  status,
}) {
  return (
    <View style={s.card}>
      <View style={s.cardHead}>
        <View style={s.cardHeadLeft}>
          <View style={[s.roundIcon, { borderColor: C.green }]}>
            <Text style={{ fontSize: 12 }}>💊</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={s.headLine1}>{pharmacy}</Text>
            <Text style={s.headLine2}>Delivered by: {deliveredBy}</Text>
          </View>
        </View>

        <Pill text={status} />
      </View>

      <View style={s.divider} />

      <View style={s.twoCol}>
        <View style={s.col}>
          <Text style={s.rowSmallLabel}>Items</Text>
          <Text style={s.rowStrong}>📝 {items}</Text>
        </View>

        <View style={s.col}>
          <Text style={s.rowSmallLabel}>Amount</Text>
          <Text style={s.rowStrong}>💰 {amount}</Text>
        </View>
      </View>

      <View style={s.twoCol}>
        <View style={s.col}>
          <Text style={s.rowSmallLabel}>Date</Text>
          <Text style={s.rowStrong}>📅 {datetime}</Text>
        </View>

        <View style={s.col} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },

  backRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  backArrow: {
    fontSize: 24,
    color: "#5B6B82",
    marginRight: 8,
  },

  backText: {
    color: "#5B6B82",
    fontSize: 14,
    fontWeight: "600",
  },

  container: {
    padding: 16,
    flex: 1,
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    color: C.text,
    marginTop: 8,
  },

  subtitle: {
    fontSize: 13,
    color: "#6B7C93",
    marginTop: 4,
  },

  tabs: {
    flexDirection: "row",
    backgroundColor: "#ECF3FF",
    borderRadius: 20,
    padding: 6,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#D9E6FF",
    shadowColor: "rgba(15,23,42,0.04)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 1,
  },

  tabBtn: {
    flex: 1,
    height: 38,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },

  tabActive: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: "#DDE7F6",
  },

  tabIcon: {
    width: 14,
    height: 14,
    tintColor: "#475569",
  },

  tabText: {
    color: "#5B6B82",
    fontWeight: "700",
    fontSize: 13,
  },

  tabTextActive: {
    color: C.text,
  },

  card: {
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginTop: 14,
    shadowColor: "rgba(15,23,42,0.04)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },

  cardHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },

  cardHeadLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  roundIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: "#FFFFFF",
  },

  headLine1: {
    color: C.text,
    fontWeight: "800",
    fontSize: 14,
  },

  headLine2: {
    color: "#78879C",
    marginTop: 1,
    fontSize: 12,
  },

  pill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 99,
    alignItems: "center",
    justifyContent: "center",
  },

  pillText: {
    fontSize: 11,
    fontWeight: "800",
  },

  divider: {
    height: 1,
    backgroundColor: "#ECF1F8",
    marginVertical: 12,
  },

  twoCol: {
    flexDirection: "row",
    gap: 16,
    marginTop: 8,
  },

  col: {
    flex: 1,
  },

  rowSmallLabel: {
    color: "#94A3B8",
    fontSize: 11.5,
    fontWeight: "600",
  },

  rowStrong: {
    color: C.text,
    fontWeight: "700",
    fontSize: 13,
    marginTop: 2,
    flexWrap: "wrap",
  },

  pinRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },

  pinIcon: {
    width: 13,
    height: 13,
    marginRight: 5,
  },

  spinnerState: {
    alignItems: "center",
    marginTop: 40,
  },

  loadingTxt: {
    color: C.sub,
    fontSize: 12,
    marginTop: 8,
    fontWeight: "600",
  },

  emptyCard: {
    backgroundColor: C.white,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginTop: 20,
    borderWidth: 1,
    borderColor: C.border,
  },

  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: C.text,
  },

  emptySub: {
    fontSize: 12,
    color: C.sub,
    marginTop: 4,
    textAlign: "center",
  },
});