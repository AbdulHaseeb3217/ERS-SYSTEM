import React, { useRef, useState, useEffect } from "react";
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Animated,
  Easing,
  Dimensions,
  Pressable,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { CommonActions } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Geolocation from "@react-native-community/geolocation";

import { fetchPendingRequests } from "../services/ambulanceRequests";
import { buildUrl } from "../services/apiConfig";

const { width: SCREEN_W } = Dimensions.get("window");
const ambulanceIcon = require("../assets/ambulance.png");
const PIN_ICON = "https://cdn-icons-png.flaticon.com/512/535/535239.png";

const COLORS = {
  brand: "#DC2626",
  bg: "#F6F7F9",
  white: "#FFFFFF",
  border: "#E5E7EB",
  text: "#0F172A",
  sub: "#64748B",
  shadow: "rgba(15,23,42,0.14)",
};

export default function AmbulanceDriverMenuScreen({ navigation, route }) {
  const driver = route?.params?.driver || null;
  const driverId = driver?._id || driver?.id;
  const driverName = driver?.fullName || "Ambulance Driver";
  const driverPhone = driver?.phone || "03XXXXXXXXX";

  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerTrans = useRef(new Animated.Value(0)).current;
  const DRAWER_W = SCREEN_W * 0.72;

  const [notificationOpen, setNotificationOpen] = useState(false);
  const [seenRequestIds, setSeenRequestIds] = useState([]);

  const [isOnline, setIsOnline] = useState(false);

  const [reqs, setReqs] = useState([]);
  const [loadingReqs, setLoadingReqs] = useState(false);
  const [acceptingId, setAcceptingId] = useState(null);

  const [currentDriverLocation, setCurrentDriverLocation] = useState(null);
  const [isScreenFocused, setIsScreenFocused] = useState(true);

  const openDrawer = () => {
    setNotificationOpen(false);
    setDrawerOpen(true);

    Animated.timing(drawerTrans, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeDrawer = () => {
    Animated.timing(drawerTrans, {
      toValue: 0,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setDrawerOpen(false));
  };

  const drawerStyle = {
    transform: [
      {
        translateX: drawerTrans.interpolate({
          inputRange: [0, 1],
          outputRange: [DRAWER_W, 0],
        }),
      },
    ],
  };

  const getRequestId = (request) => String(request?.id || request?._id || "");

  const newPendingCount = isOnline
    ? reqs.filter((request) => !seenRequestIds.includes(getRequestId(request)))
        .length
    : 0;

  const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
      return null;
    }

    const R = 6371;
    const dLat = ((Number(lat2) - Number(lat1)) * Math.PI) / 180;
    const dLon = ((Number(lon2) - Number(lon1)) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((Number(lat1) * Math.PI) / 180) *
        Math.cos((Number(lat2) * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const getPickupLatLng = (request) => {
    const coords = request?.pickupLocation?.coordinates;

    if (Array.isArray(coords) && coords.length === 2) {
      return {
        lat: Number(coords[1]),
        lng: Number(coords[0]),
      };
    }

    if (
      request?.pickupLocation?.lat != null &&
      request?.pickupLocation?.lng != null
    ) {
      return {
        lat: Number(request.pickupLocation.lat),
        lng: Number(request.pickupLocation.lng),
      };
    }

    return null;
  };

  const getDistanceEtaForRequest = (request) => {
    if (
      request?.distanceKmToPatient != null &&
      request?.etaMinutesToPatient != null
    ) {
      return {
        km: Number(request.distanceKmToPatient),
        eta: Number(request.etaMinutesToPatient),
      };
    }

    if (!currentDriverLocation) {
      return {
        km: null,
        eta: null,
      };
    }

    const pickup = getPickupLatLng(request);

    if (!pickup) {
      return {
        km: null,
        eta: null,
      };
    }

    const distanceKm = calculateDistanceKm(
      currentDriverLocation.latitude,
      currentDriverLocation.longitude,
      pickup.lat,
      pickup.lng
    );

    if (distanceKm == null) {
      return {
        km: null,
        eta: null,
      };
    }

    const averageSpeedKmH = 35;
    const etaMinutes = Math.max(
      1,
      Math.ceil((distanceKm / averageSpeedKmH) * 60)
    );

    return {
      km: distanceKm,
      eta: etaMinutes,
    };
  };

  const loadRequests = async () => {
    try {
      setLoadingReqs(true);

      const list = await fetchPendingRequests(driverId);
      const safeList = Array.isArray(list) ? list : [];

      setReqs(safeList);

      return safeList;
    } catch (e) {
      console.log("loadRequests error:", e.message);
      return [];
    } finally {
      setLoadingReqs(false);
    }
  };

  const handleBellPress = async () => {
    const nextOpen = !notificationOpen;
    setNotificationOpen(nextOpen);

    if (nextOpen) {
      let latestRequests = reqs;

      if (isOnline) {
        latestRequests = await loadRequests();
      }

      const currentIds = latestRequests.map((request) => getRequestId(request));

      setSeenRequestIds((prev) =>
        Array.from(new Set([...prev, ...currentIds]))
      );
    }
  };

  useEffect(() => {
    const unsubscribeFocus = navigation.addListener("focus", () => {
      setIsScreenFocused(true);
    });

    const unsubscribeBlur = navigation.addListener("blur", () => {
      setIsScreenFocused(false);
      setNotificationOpen(false);
    });

    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation]);

  useEffect(() => {
    let locationTimer;
    let requestsTimer;

    if (isOnline && isScreenFocused) {
      loadRequests();
      requestsTimer = setInterval(loadRequests, 8000);

      locationTimer = setInterval(() => {
        Geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude, heading } = position.coords;

            setCurrentDriverLocation({
              latitude,
              longitude,
            });

            try {
              await fetch(buildUrl("/api/ambulance_driver/update-location"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  driverId,
                  lat: latitude,
                  lng: longitude,
                  heading: heading || 0,
                }),
              });

              console.log(
                "📍 Location & Heading synced to server:",
                latitude,
                longitude,
                heading
              );
            } catch (err) {
              console.log("❌ Sync error:", err);
            }
          },
          (error) => console.log("Geolocation Error:", error.message),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
      }, 4000);
    } else {
      setReqs([]);
      setCurrentDriverLocation(null);
      setNotificationOpen(false);
      setSeenRequestIds([]);
    }

    return () => {
      if (requestsTimer) clearInterval(requestsTimer);
      if (locationTimer) clearInterval(locationTimer);
    };
  }, [isOnline, driverId, isScreenFocused]);

  const handleIgnore = (id) => {
    setReqs((prev) => prev.filter((x) => (x.id || x._id) !== id));
    setSeenRequestIds((prev) => prev.filter((x) => x !== String(id)));
  };

  const handleAccept = async (requestId) => {
    if (!driverId) {
      Alert.alert("Error", "Driver session missing.");
      return;
    }

    try {
      setAcceptingId(requestId);

      const res = await fetch(buildUrl("/api/ambulance/accept"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, driverId }),
      });

      const data = await res.json();

      if (data.success) {
        Alert.alert("Success", "Request assigned successfully!");

        setReqs((prev) => prev.filter((x) => (x.id || x._id) !== requestId));
        setSeenRequestIds((prev) => prev.filter((x) => x !== String(requestId)));
        setNotificationOpen(false);

        navigation.navigate("ActiveAmbulanceRide", {
          request: data.request,
          driver,
        });
      } else {
        Alert.alert(
          "Unavailable",
          data.message || "This request was already taken."
        );
        loadRequests();
      }
    } catch (err) {
      Alert.alert("Error", "Network problem while accepting.");
      console.log("Accept Error:", err);
    } finally {
      setAcceptingId(null);
    }
  };

  const goProfile = () => {
    navigation.navigate("AmbulanceDriverProfileManagement", { driver });
    closeDrawer();
  };

  const goHistory = () => {
    navigation.navigate("AmbulanceDriverPastRides", { driver });
    closeDrawer();
  };

  const goSupportChat = () => {
    if (!driverId) {
      Alert.alert(
        "No ID",
        "Driver ID not found. Please login again to open support chat."
      );
      return;
    }

    navigation.navigate("AmbulanceDriverSupportChat", {
      driver,
      driverId,
    });

    closeDrawer();
  };

  const doLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          closeDrawer();

          try {
            await AsyncStorage.removeItem("ERS_SESSION");
          } catch (e) {}

          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: "RoleSelect" }],
            })
          );
        },
      },
    ]);
  };

  const formatDateTime = (iso) => {
    if (!iso) return "Just now";

    const d = new Date(iso);
    const date = d.toLocaleDateString();
    const time = d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    return `${date} • ${time}`;
  };

  const renderPendingNotification = (request) => {
    const id = request.id || request._id;
    const name = request.patientInfo?.name || "Unknown Patient";
    const dateTime = formatDateTime(request.requestedAt || request.createdAt);

    return (
      <View key={id} style={s.pendingNotificationCard}>
        <View style={s.pendingNotificationTop}>
          <Text style={s.pendingNotificationIcon}>🚑</Text>
          <Text style={s.pendingNotificationTitle}>New Pending Request</Text>
        </View>

        <Text style={s.pendingNotificationMessage}>
          New pending request received from {name}
        </Text>

        <Text style={s.pendingNotificationTime}>{dateTime}</Text>
      </View>
    );
  };

  const renderRequestCard = (r) => {
    const id = r.id || r._id;
    const name = r.patientInfo?.name || "Unknown Patient";
    const phone = r.patientInfo?.phone || "No Phone";
    const pickup = r.pickupLocation?.address || "Pickup location not provided";
    const dest = r.hospitalName || "Hospital not selected yet";
    const dateTime = formatDateTime(r.requestedAt || r.createdAt);

    const distanceEta = getDistanceEtaForRequest(r);

    const km =
      distanceEta.km != null
        ? `${Number(distanceEta.km).toFixed(1)} km`
        : "";

    const eta =
      distanceEta.eta != null
        ? `${Math.ceil(Number(distanceEta.eta))} mins away`
        : "";

    return (
      <View key={id} style={s.reqCardRed}>
        <View style={s.reqTopRow}>
          <View style={s.reqTypePill}>
            <Text style={s.reqTypeText}>Emergency Request</Text>
          </View>

          <View style={{ alignItems: "flex-end" }}>
            {!!km && <Text style={s.kmText}>{km}</Text>}
            {!!eta && <Text style={s.etaText}>{eta}</Text>}
            <Text style={s.dtText}>{dateTime}</Text>
          </View>
        </View>

        <Text style={s.reqNameBig}>{name}</Text>

        <View style={s.phoneRow}>
          <Text style={s.phoneIcon}>📞</Text>
          <Text style={s.phoneText}>{phone}</Text>
        </View>

        <View style={s.hr} />

        <View style={s.locRow}>
          <Image
            source={{ uri: PIN_ICON }}
            style={[s.pin, { tintColor: COLORS.brand }]}
          />
          <View style={{ flex: 1 }}>
            <Text style={s.locLabel}>Pickup Location</Text>
            <Text style={s.locValue}>{pickup}</Text>
          </View>
        </View>

        <View style={[s.locRow, { marginTop: 10 }]}>
          <Image
            source={{ uri: PIN_ICON }}
            style={[s.pin, { tintColor: "#16A34A" }]}
          />
          <View style={{ flex: 1 }}>
            <Text style={s.locLabel}>Destination</Text>
            <Text style={s.locValue}>{dest}</Text>
          </View>
        </View>

        <View style={s.actionRow}>
          <TouchableOpacity
            style={[s.acceptBtnRed, acceptingId === id && { opacity: 0.6 }]}
            activeOpacity={0.9}
            onPress={() => handleAccept(id)}
            disabled={!!acceptingId}
          >
            {acceptingId === id ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={s.acceptText}>Accept Request</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={s.ignoreBtnLight}
            activeOpacity={0.9}
            onPress={() => handleIgnore(id)}
            disabled={!!acceptingId}
          >
            <Text style={s.ignoreText}>Ignore</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.brand} />

      <View style={s.topbar}>
        <View style={s.leftBrand}>
          <View style={s.brandCircle}>
            <Image source={ambulanceIcon} style={s.brandIcon} />
          </View>

          <View>
            <Text style={s.brandTitle}>Ambulance Driver</Text>
            <Text style={s.brandSub}>{driverName}</Text>
          </View>
        </View>

        <View style={s.topActions}>
          <View style={s.notificationWrap}>
            <TouchableOpacity
              onPress={handleBellPress}
              activeOpacity={0.85}
              style={s.bellBtn}
            >
              <Text style={s.bellIcon}>🔔</Text>

              {newPendingCount > 0 && (
                <View style={s.countBadge}>
                  <Text style={s.countBadgeText}>
                    {newPendingCount > 99 ? "99+" : newPendingCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {notificationOpen && (
              <View style={s.notificationDropdown}>
                <View style={s.dropdownHeader}>
                  <Text style={s.dropdownTitle}>Notifications</Text>

                  <TouchableOpacity
                    onPress={() => setNotificationOpen(false)}
                    style={s.dropdownCloseBtn}
                  >
                    <Text style={s.dropdownCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {!isOnline ? (
                  <View style={s.dropdownEmptyBox}>
                    <Text style={s.dropdownEmptyIcon}>🔕</Text>
                    <Text style={s.dropdownEmptyTitle}>You are offline</Text>
                    <Text style={s.dropdownEmptySub}>
                      Turn online to receive ambulance requests
                    </Text>
                  </View>
                ) : loadingReqs && reqs.length === 0 ? (
                  <View style={s.dropdownEmptyBox}>
                    <ActivityIndicator color={COLORS.brand} />
                    <Text style={s.dropdownEmptySub}>Loading requests...</Text>
                  </View>
                ) : reqs.length === 0 ? (
                  <View style={s.dropdownEmptyBox}>
                    <Text style={s.dropdownEmptyIcon}>🔔</Text>
                    <Text style={s.dropdownEmptyTitle}>No pending request</Text>
                    <Text style={s.dropdownEmptySub}>
                      New emergency requests will appear here
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    style={s.dropdownList}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                  >
                    {reqs.map((request) => renderPendingNotification(request))}
                  </ScrollView>
                )}
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={openDrawer}
            activeOpacity={0.85}
            style={s.menuBtn}
          >
            <View style={s.menuDash} />
            <View style={s.menuDash} />
            <View style={s.menuDash} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.container}>
        <View style={s.statusCard}>
          <View style={s.statusRow}>
            <Text style={s.statusTitle}>Availability Status</Text>

            <Switch
              trackColor={{ false: "#E5E7EB", true: "#FCA5A5" }}
              thumbColor={isOnline ? "#DC2626" : "#9CA3AF"}
              value={isOnline}
              onValueChange={(v) => setIsOnline(v)}
            />
          </View>

          <Text style={s.statusHint}>
            {isOnline
              ? "You are online and can receive emergency requests"
              : "You are offline and will not receive requests"}
          </Text>

          {isOnline && (
            <TouchableOpacity
              style={s.refreshBtn}
              activeOpacity={0.9}
              onPress={loadRequests}
              disabled={loadingReqs}
            >
              {loadingReqs ? (
                <ActivityIndicator color={COLORS.brand} />
              ) : (
                <Text style={s.refreshText}>Refresh Requests</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {isOnline && (
          <View style={{ marginTop: 14 }}>
            <Text style={s.sectionTitle}>Incoming Requests</Text>

            {loadingReqs && reqs.length === 0 ? (
              <View style={s.emptyBox}>
                <ActivityIndicator size="small" color={COLORS.brand} />
                <Text style={s.emptySub}>Loading requests...</Text>
              </View>
            ) : reqs.length === 0 ? (
              <View style={s.emptyBox}>
                <Text style={s.emptyBell}>🔔</Text>
                <Text style={s.emptyTitle}>
                  No requests available at the moment
                </Text>
                <Text style={s.emptySub}>
                  You'll be notified when a request arrives
                </Text>
              </View>
            ) : (
              reqs.map((r) => renderRequestCard(r))
            )}
          </View>
        )}
      </ScrollView>

      {drawerOpen && (
        <>
          <Pressable style={s.backdrop} onPress={closeDrawer} />

          <Animated.View style={[s.drawer, { width: DRAWER_W }, drawerStyle]}>
            <View style={s.driverBox}>
              <View style={s.driverLeft}>
                <View style={s.avatar}>
                  <Image source={ambulanceIcon} style={s.avatarImg} />
                </View>

                <View>
                  <Text style={s.driverName}>{driverName}</Text>
                  <Text style={s.driverPhone}>{driverPhone}</Text>

                  <View
                    style={[
                      s.badgeInline,
                      { backgroundColor: isOnline ? "#DCFCE7" : "#FEE2E2" },
                    ]}
                  >
                    <Text
                      style={[
                        s.badgeText,
                        { color: isOnline ? "#166534" : "#991B1B" },
                      ]}
                    >
                      {isOnline ? "Online" : "Offline"}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                onPress={closeDrawer}
                style={s.closeBtn}
                activeOpacity={0.8}
              >
                <Text style={s.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={s.item}
              activeOpacity={0.85}
              onPress={goHistory}
            >
              <View style={[s.itemIcon, { backgroundColor: "#FFE4E6" }]}>
                <Text style={s.itemIconText}>🕓</Text>
              </View>

              <Text style={s.itemText}>Past Rides</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.item}
              activeOpacity={0.85}
              onPress={goProfile}
            >
              <View style={[s.itemIcon, { backgroundColor: "#FFF1F2" }]}>
                <Text style={s.itemIconText}>👤</Text>
              </View>

              <Text style={s.itemText}>Profile Management</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.item}
              activeOpacity={0.85}
              onPress={goSupportChat}
            >
              <View style={[s.itemIcon, { backgroundColor: "#ECFDF5" }]}>
                <Text style={s.itemIconText}>💬</Text>
              </View>

              <Text style={s.itemText}>Support Chat</Text>
            </TouchableOpacity>

            <View style={s.drawerDivider} />

            <TouchableOpacity
              style={[s.item, { marginTop: 6 }]}
              activeOpacity={0.85}
              onPress={doLogout}
            >
              <View style={[s.itemIcon, { backgroundColor: "#FDECEC" }]}>
                <Text style={[s.itemIconText, { color: "#B91C1C" }]}>⎋</Text>
              </View>

              <Text
                style={[s.itemText, { color: "#B91C1C", fontWeight: "700" }]}
              >
                Logout
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  topbar: {
    height: 85,
    backgroundColor: COLORS.brand,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 30,
    zIndex: 100,
    elevation: 4,
  },

  leftBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },

  brandCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF20",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  brandIcon: {
    width: 16,
    height: 16,
    tintColor: "#FFF",
  },

  brandTitle: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 15,
  },

  brandSub: {
    color: "#FFE4E6",
    fontSize: 12,
    marginTop: 1,
  },

  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  notificationWrap: {
    position: "relative",
    zIndex: 5000,
  },

  bellBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF20",
  },

  bellIcon: {
    fontSize: 18,
    color: "#FFF",
  },

  countBadge: {
    position: "absolute",
    top: -7,
    right: -7,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },

  countBadgeText: {
    color: COLORS.brand,
    fontSize: 9,
    fontWeight: "900",
  },

  notificationDropdown: {
    position: "absolute",
    top: 42,
    right: -42,
    width: 330,
    maxHeight: 430,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 20,
    zIndex: 6000,
  },

  dropdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  dropdownTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
  },

  dropdownCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  dropdownCloseText: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "900",
  },

  dropdownList: {
    maxHeight: 360,
  },

  pendingNotificationCard: {
    backgroundColor: "#FFF7F7",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },

  pendingNotificationTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },

  pendingNotificationIcon: {
    fontSize: 17,
    marginRight: 7,
  },

  pendingNotificationTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#991B1B",
  },

  pendingNotificationMessage: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "700",
    lineHeight: 18,
  },

  pendingNotificationTime: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "700",
    marginTop: 6,
  },

  dropdownEmptyBox: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  dropdownEmptyIcon: {
    fontSize: 26,
  },

  dropdownEmptyTitle: {
    marginTop: 8,
    color: COLORS.text,
    fontWeight: "900",
    fontSize: 14,
  },

  dropdownEmptySub: {
    marginTop: 6,
    color: COLORS.sub,
    fontSize: 12,
    textAlign: "center",
  },

  menuBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF20",
  },

  menuDash: {
    width: 18,
    height: 2,
    backgroundColor: "#FFF",
    marginVertical: 2.2,
    borderRadius: 2,
  },

  container: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 14,
  },

  statusCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    elevation: 3,
  },

  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  statusTitle: {
    color: COLORS.text,
    fontWeight: "900",
    fontSize: 14.5,
  },

  statusHint: {
    color: COLORS.sub,
    fontSize: 12.5,
    marginTop: 6,
  },

  refreshBtn: {
    marginTop: 12,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    alignItems: "center",
    justifyContent: "center",
  },

  refreshText: {
    color: COLORS.brand,
    fontWeight: "900",
  },

  sectionTitle: {
    marginBottom: 8,
    color: COLORS.text,
    fontWeight: "900",
    fontSize: 14.5,
  },

  reqCardRed: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.brand,
    padding: 14,
    marginBottom: 12,
  },

  reqTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  reqTypePill: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    height: 26,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  reqTypeText: {
    color: "#991B1B",
    fontWeight: "900",
    fontSize: 12,
  },

  kmText: {
    color: "#991B1B",
    fontWeight: "900",
  },

  etaText: {
    color: "#64748B",
    marginTop: 2,
  },

  dtText: {
    color: "#6B7280",
    marginTop: 2,
    fontSize: 12,
    fontWeight: "700",
  },

  reqNameBig: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
  },

  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },

  phoneIcon: {
    fontSize: 14,
    marginRight: 8,
  },

  phoneText: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "800",
  },

  hr: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 14,
  },

  locRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  pin: {
    width: 18,
    height: 18,
    marginRight: 10,
  },

  locLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
  },

  locValue: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 3,
  },

  actionRow: {
    flexDirection: "row",
    marginTop: 14,
  },

  acceptBtnRed: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  acceptText: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 16,
  },

  ignoreBtnLight: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },

  ignoreText: {
    color: "#111827",
    fontWeight: "900",
    fontSize: 16,
  },

  emptyBox: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 28,
    alignItems: "center",
  },

  emptyBell: {
    fontSize: 26,
    color: "#94A3B8",
  },

  emptyTitle: {
    marginTop: 10,
    color: "#1F2937",
    fontWeight: "700",
  },

  emptySub: {
    marginTop: 8,
    color: "#64748B",
    fontSize: 12.5,
  },

  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.25)",
    zIndex: 8000,
    elevation: 8000,
  },

  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.white,
    paddingTop: 55,
    paddingHorizontal: 16,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
    zIndex: 9000,
    elevation: 9000,
  },

  driverBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },

  driverLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarImg: {
    width: 20,
    height: 20,
    tintColor: COLORS.brand,
  },

  driverName: {
    color: COLORS.text,
    fontWeight: "900",
  },

  driverPhone: {
    color: COLORS.sub,
    fontSize: 12,
  },

  badgeInline: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 10,
    height: 22,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  badgeText: {
    fontWeight: "900",
    fontSize: 11,
  },

  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F3F6",
    marginTop: -35,
  },

  closeText: {
    fontSize: 16,
    color: "#111827",
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    paddingHorizontal: 8,
    marginVertical: 2,
  },

  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  itemIconText: {
    fontSize: 18,
  },

  itemText: {
    fontSize: 15.5,
    color: "#111827",
    fontWeight: "700",
  },

  drawerDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 10,
  },
});