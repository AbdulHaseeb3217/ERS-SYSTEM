import React, { useEffect, useState } from "react";
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
  Alert,
  RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { buildUrl } from "../services/apiConfig";

const C = {
  bg: "#F6F7F9",
  white: "#FFFFFF",
  text: "#0F172A",
  sub: "#64748B",
  border: "#E5E7EB",
  blue: "#2563EB",
  blueSoft: "#E8F0FF",
  green: "#16A34A",
  greenSoft: "#E9F8EE",
  red: "#DC2626",
  redSoft: "#FEE2E2",
  redText: "#B91C1C",
};

const ICONS = {
  delivery: require("../assets/delivery.png"),
  bike: require("../assets/sportbike.png"),
  pin: require("../assets/location.png"),
  money: require("../assets/money.png"),
};

export default function BikeRiderPastHistoryScreen({ navigation, route }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const routeRider = route?.params?.rider || null;

  const routeRiderId =
    route?.params?.riderId || routeRider?._id || routeRider?.id || null;

  const goBack = () => {
    if (navigation?.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("BikeRiderMenu");
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

  const tightDT = (dt) =>
    String(dt || "N/A").replace(" AM", "\u00A0AM").replace(" PM", "\u00A0PM");

  const fetchJsonWithFallback = async (paths = []) => {
    let lastError = null;

    for (const path of paths) {
      try {
        const url = buildUrl(path);
        console.log("BIKE RIDER HISTORY API =>", url);

        const res = await fetch(url);
        const text = await res.text();

        let data = null;

        try {
          data = JSON.parse(text);
        } catch (error) {
          console.log("❌ Non JSON Response:", res.status, text.slice(0, 250));
          lastError = new Error(`API route not found. Status: ${res.status}`);
          continue;
        }

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

  const getRiderId = async () => {
    if (routeRiderId) return routeRiderId;

    const sessionRaw = await AsyncStorage.getItem("ERS_SESSION");

    if (!sessionRaw) return null;

    let session = null;

    try {
      session = JSON.parse(sessionRaw);
    } catch (error) {
      console.log("❌ Invalid ERS_SESSION:", error.message);
      return null;
    }

    return (
      session?.rider?._id ||
      session?.rider?.id ||
      session?.bikeRider?._id ||
      session?.bikeRider?.id ||
      session?.user?._id ||
      session?.user?.id ||
      null
    );
  };

  const fetchPastHistory = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      const riderId = await getRiderId();

      if (!riderId) {
        Alert.alert("Error", "Rider ID not found. Please login again.");
        setItems([]);
        return;
      }

      const data = await fetchJsonWithFallback([
        `/api/bike-rides/rider/${riderId}/past-history`,
        `/api/bike-ride/rider/${riderId}/past-history`,
        `/api/bike-rides/rider/past-history/${riderId}`,
        `/api/bike-ride/rider/past-history/${riderId}`,
        `/api/bike-rides/history/${riderId}`,
        `/api/bike-ride/history/${riderId}`,
        `/api/bike-rides/history/past/${riderId}`,
        `/api/bike-ride/history/past/${riderId}`,
      ]);

      const list = Array.isArray(data.items) ? data.items : [];
      setItems(list);
    } catch (error) {
      console.log("Bike Rider Past History Error:", error);
      Alert.alert("Network Error", error.message || "Could not fetch history.");
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPastHistory(false);
  };

  useEffect(() => {
    fetchPastHistory(true);
  }, []);

  const isDeliveryItem = (item) => item?.kind === "delivery";

  const isCancelledItem = (item) =>
    String(item?.status || "").toLowerCase() === "cancelled";

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />

      <View style={s.topRow}>
        <TouchableOpacity onPress={goBack} style={s.backBtn} activeOpacity={0.85}>
          <Text style={s.backArrow}>←</Text>
          <Text style={s.backText}>Past History</Text>
        </TouchableOpacity>
      </View>

      <View style={s.pageHeader}>
        <Text style={s.title}>Your Past Deliveries & Rides</Text>
        <Text style={s.subtitle}>
          Completed and cancelled deliveries/rides will show here.
        </Text>
      </View>

      {loading ? (
        <View style={s.centerBox}>
          <ActivityIndicator size="small" color={C.blue} />
          <Text style={s.loadingText}>Loading past history...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.container}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {items.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyTitle}>No past history found</Text>
              <Text style={s.emptySub}>
                Completed and cancelled rides/deliveries will appear here.
              </Text>
            </View>
          ) : (
            items.map((it, index) => {
              const isDelivery = isDeliveryItem(it);
              const cancelled = isCancelledItem(it);

              return (
                <View key={String(it.id || index)} style={s.card}>
                  <View style={s.cardHead}>
                    <View style={s.cardHeadLeft}>
                      <View
                        style={[
                          s.iconCircle,
                          {
                            backgroundColor: isDelivery
                              ? C.greenSoft
                              : C.blueSoft,
                          },
                        ]}
                      >
                        <Image
                          source={isDelivery ? ICONS.delivery : ICONS.bike}
                          style={[
                            s.typeIcon,
                            { tintColor: isDelivery ? C.green : C.blue },
                          ]}
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <View style={s.headRow}>
                          <Text style={s.cardTitle}>
                            {it.title ||
                              (isDelivery ? "Order Delivery" : "Bike Ride")}
                          </Text>

                          <View
                            style={[
                              s.tag,
                              {
                                backgroundColor: isDelivery
                                  ? C.greenSoft
                                  : C.blueSoft,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                s.tagText,
                                { color: isDelivery ? C.green : C.blue },
                              ]}
                            >
                              {isDelivery ? "Delivery" : "Ride"}
                            </Text>
                          </View>
                        </View>

                        {!!it.subline && (
                          <Text style={s.subline}>{it.subline}</Text>
                        )}
                      </View>
                    </View>

                    <View style={[s.pill, cancelled && s.cancelPill]}>
                      <Text style={[s.pillText, cancelled && s.cancelPillText]}>
                        {cancelled ? "Cancelled" : "Completed"}
                      </Text>
                    </View>
                  </View>

                  <View style={s.hr} />

                  <View style={s.twoCol}>
                    <View style={s.col}>
                      <Text style={s.smallLabel}>
                        {it.pickupLabel || "Pickup"}
                      </Text>

                      <View style={s.iconRow}>
                        <Image
                          source={ICONS.pin}
                          style={[s.smallIcon, { tintColor: C.red }]}
                        />
                        <Text style={s.strong}>{it.pickup || "N/A"}</Text>
                      </View>
                    </View>

                    <View style={s.col}>
                      <Text style={s.smallLabel}>
                        {it.dropLabel || "Destination"}
                      </Text>

                      <View style={s.iconRow}>
                        <Image
                          source={ICONS.pin}
                          style={[s.smallIcon, { tintColor: C.green }]}
                        />
                        <Text style={s.strong}>{it.drop || "N/A"}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={[s.twoCol, { marginTop: 12 }]}>
                    <View style={s.col}>
                      <Text style={s.smallLabel}>
                        {cancelled ? "Cancelled Date" : "Date & Time"}
                      </Text>

                      <Text style={[s.strong, s.nowrap]}>
                        📅 {tightDT(formatDateTime(it.datetime))}
                      </Text>
                    </View>

                    <View style={s.col}>
                      <Text style={s.smallLabel}>Fare</Text>

                      <View style={s.iconRow}>
                        <Image
                          source={ICONS.money}
                          style={[
                            s.smallIcon,
                            { tintColor: isDelivery ? C.green : C.blue },
                          ]}
                        />
                        <Text
                          style={[
                            s.strong,
                            {
                              color: isDelivery ? C.green : C.blue,
                              fontWeight: "800",
                            },
                          ]}
                        >
                          PKR {it.fare || "0"}
                        </Text>
                      </View>
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
    paddingTop: 20,
    paddingBottom: 10,
  },

  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  backArrow: {
    fontSize: 24,
    color: "#5B6B82",
    paddingTop: 15,
  },

  backText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#5B6B82",
    paddingTop: 20,
  },

  pageHeader: {
    paddingHorizontal: 16,
    marginBottom: 4,
  },

  title: {
    color: C.text,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 4,
  },

  subtitle: {
    color: "#6B7C93",
    fontSize: 12,
    marginTop: 2,
  },

  container: {
    paddingHorizontal: 14,
    paddingBottom: 24,
  },

  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
  },

  loadingText: {
    marginTop: 8,
    color: C.sub,
    fontSize: 13,
    fontWeight: "600",
  },

  emptyCard: {
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    marginTop: 18,
    alignItems: "center",
  },

  emptyTitle: {
    color: C.text,
    fontSize: 15,
    fontWeight: "800",
  },

  emptySub: {
    color: C.sub,
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
  },

  card: {
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 10,
    shadowColor: "rgba(15,23,42,0.08)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
  },

  cardHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  cardHeadLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },

  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  typeIcon: {
    width: 18,
    height: 18,
  },

  headRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  cardTitle: {
    color: C.text,
    fontWeight: "800",
    fontSize: 14.5,
  },

  subline: {
    color: C.sub,
    fontSize: 12,
    marginTop: 2,
  },

  tag: {
    height: 18,
    paddingHorizontal: 8,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  tagText: {
    fontSize: 10.5,
    fontWeight: "800",
  },

  pill: {
    paddingHorizontal: 10,
    height: 22,
    borderRadius: 999,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },

  pillText: {
    color: "#166534",
    fontSize: 11,
    fontWeight: "800",
  },

  cancelPill: {
    backgroundColor: C.redSoft,
  },

  cancelPillText: {
    color: C.redText,
  },

  hr: {
    height: 1,
    backgroundColor: "#ECF1F8",
    marginVertical: 10,
    borderRadius: 1,
  },

  twoCol: {
    flexDirection: "row",
    gap: 14,
    marginTop: 2,
  },

  col: {
    flex: 1,
  },

  smallLabel: {
    color: "#7A8AA3",
    fontSize: 11.5,
    marginBottom: 4,
  },

  strong: {
    color: C.text,
    fontWeight: "700",
    fontSize: 12.5,
    flexWrap: "wrap",
  },

  nowrap: {
    flexShrink: 1,
  },

  iconRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  smallIcon: {
    width: 15,
    height: 15,
    marginRight: 6,
  },
});