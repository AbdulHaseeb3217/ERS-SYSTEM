// screens/BikeRiderMenuScreen.jsx

import React, { useRef, useState, useEffect, useCallback } from "react";
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
import { CommonActions, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GOOGLE_MAPS_APIKEY } from "../services/apiConfig";

import {
  fetchPendingBikeRides,
  acceptBikeRideRequest,
  getActiveBikeRiderSession,
  fetchPendingMedicineDeliveries,
  acceptMedicineDeliveryRequest,
  getActiveMedicineDeliverySession,
} from "../services/bikeRideRequests";

const { width: SCREEN_W } = Dimensions.get("window");

const bikeIcon = require("../assets/sportbike.png");
const PIN_ICON = "https://cdn-icons-png.flaticon.com/512/535/535239.png";

export default function BikeRiderMenuScreen({ navigation, route }) {
  const routeRider = route?.params?.rider || null;
  const preventRedirect = route?.params?.preventRedirect === true;
  const preventMedicineRedirect =
    route?.params?.preventMedicineRedirect === true;

  const [sessionRider, setSessionRider] = useState(routeRider);

  const rider = sessionRider || routeRider || null;

  const displayName = rider?.fullName || rider?.name || "Bike Rider";
  const displayPhone = rider?.phone || "N/A";

  // ===== Drawer =====
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerTrans = useRef(new Animated.Value(0)).current;
  const DRAWER_W = SCREEN_W * 0.72;

  // ===== Bell Notification Dropdown =====
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [seenRequestIds, setSeenRequestIds] = useState([]);

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

  // ===== Availability =====
  const [isOnline, setIsOnline] = useState(false);

  // ===== Requests from backend =====
  const [reqs, setReqs] = useState([]);
  const [loadingReqs, setLoadingReqs] = useState(false);
  const [acceptingId, setAcceptingId] = useState(null);

  const getRequestId = (request) => {
    return String(request?.id || request?._id || "");
  };

  const newPendingCount = isOnline
    ? reqs.filter((request) => !seenRequestIds.includes(getRequestId(request)))
        .length
    : 0;

  const formatDateTime = (iso) => {
    if (!iso) return "";

    const d = new Date(iso);

    const date = d.toLocaleDateString();
    const time = d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    return `${date} • ${time}`;
  };

  const isGenericLocationName = (value) => {
    const text = String(value || "").trim().toLowerCase();

    return [
      "current location",
      "my location",
      "pickup location",
      "selected location",
      "user location",
    ].includes(text);
  };

  const cleanAddressForRider = (address, fallback = "Location not provided") => {
    const raw = String(address || "").trim();

    if (!raw) {
      return fallback;
    }

    let parts = raw
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length > 1 && /^[A-Z0-9]{4}\+[A-Z0-9]{2,4}$/i.test(parts[0])) {
      parts = parts.slice(1);
    }

    parts = parts.filter((part) => part.toLowerCase() !== "pakistan");

    if (parts.length === 0) {
      return raw;
    }

    return parts.slice(0, 3).join(", ");
  };

  const isBadAddress = (value) => {
    const text = String(value || "").trim().toLowerCase();

    return (
      !text ||
      text === "address not available" ||
      text === "patient delivery location not provided" ||
      text === "pharmacy pickup not provided" ||
      text === "current gps location" ||
      text === "current location" ||
      text.startsWith("lat ")
    );
  };

  const getCoordFromLocation = (location) => {
    const coords = location?.coordinates;

    const lat =
      location?.lat ??
      location?.latitude ??
      (Array.isArray(coords) ? coords[1] : null);

    const lng =
      location?.lng ??
      location?.longitude ??
      (Array.isArray(coords) ? coords[0] : null);

    const nLat = Number(lat);
    const nLng = Number(lng);

    if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) return null;
    if (nLat === 0 && nLng === 0) return null;

    return {
      latitude: nLat,
      longitude: nLng,
    };
  };

  const reverseGeocodeAddress = async (coord) => {
    try {
      if (!coord) return "";

      const lat = coord.latitude;
      const lng = coord.longitude;

      if (GOOGLE_MAPS_APIKEY && !String(GOOGLE_MAPS_APIKEY).includes("PASTE")) {
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

      const parts = [
        bigData?.locality,
        bigData?.city,
        bigData?.principalSubdivision,
        bigData?.countryName,
      ].filter(Boolean);

      if (parts.length > 0) return [...new Set(parts)].join(", ");
    } catch (error) {
      console.log("Bike rider delivery reverse geocode error:", error.message);
    }

    return "";
  };

  const resolveMedicineDeliveryAddresses = async (order) => {
    if (!order || order.requestType !== "medicine_delivery") return order;

    const updatedOrder = { ...order };

    const pharmacyAddress =
      order?.pharmacyInfo?.address || order?.pharmacy?.address;

    const pharmacyCoord = getCoordFromLocation(order?.pharmacy?.location);

    if (isBadAddress(pharmacyAddress) && pharmacyCoord) {
      const resolved = await reverseGeocodeAddress(pharmacyCoord);

      if (resolved) {
        updatedOrder.pharmacyInfo = {
          ...(updatedOrder.pharmacyInfo || {}),
          address: resolved,
        };
      }
    }

    const deliveryAddress = order?.deliveryLocation?.address;
    const deliveryCoord = getCoordFromLocation(order?.deliveryLocation);

    if (isBadAddress(deliveryAddress) && deliveryCoord) {
      const resolved = await reverseGeocodeAddress(deliveryCoord);

      if (resolved) {
        updatedOrder.deliveryLocation = {
          ...(updatedOrder.deliveryLocation || {}),
          address: resolved,
        };
      }
    }

    return updatedOrder;
  };

  const getLocationDisplayName = (
    location,
    fallback = "Location not provided",
    options = {}
  ) => {
    const name = String(location?.name || "").trim();
    const address = String(location?.address || "").trim();

    if (options.preferAddressWhenGeneric && isGenericLocationName(name)) {
      return cleanAddressForRider(address, fallback);
    }

    if (name) {
      return name;
    }

    return cleanAddressForRider(address, fallback);
  };

  const getRiderFromStorage = async () => {
    try {
      const sessionRaw = await AsyncStorage.getItem("ERS_SESSION");
      const riderDataRaw = await AsyncStorage.getItem("riderData");

      if (riderDataRaw) {
        return JSON.parse(riderDataRaw);
      }

      if (!sessionRaw) {
        return null;
      }

      const session = JSON.parse(sessionRaw);

      return (
        session?.rider ||
        session?.user ||
        session?.data?.rider ||
        session?.data?.user ||
        null
      );
    } catch (error) {
      console.log("getRiderFromStorage error:", error.message);
      return null;
    }
  };

  const getRiderId = async () => {
    const fromParams = rider?.id || rider?._id;

    if (fromParams) {
      return fromParams;
    }

    try {
      const savedRiderId = await AsyncStorage.getItem("riderId");

      if (savedRiderId) {
        return savedRiderId;
      }

      const sessionRaw = await AsyncStorage.getItem("ERS_SESSION");
      const riderDataRaw = await AsyncStorage.getItem("riderData");

      if (riderDataRaw) {
        const riderData = JSON.parse(riderDataRaw);

        return riderData?.id || riderData?._id || null;
      }

      if (!sessionRaw) {
        return null;
      }

      const session = JSON.parse(sessionRaw);

      return (
        session?.rider?.id ||
        session?.rider?._id ||
        session?.user?.id ||
        session?.user?._id ||
        session?.data?.rider?.id ||
        session?.data?.rider?._id ||
        session?.data?.user?.id ||
        session?.data?.user?._id ||
        session?.id ||
        session?._id ||
        null
      );
    } catch (error) {
      console.log("getRiderId error:", error.message);
      return null;
    }
  };

  // ✅ Active ride resume check
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const checkActiveBikeRide = async () => {
        try {
          const storedRider = await getRiderFromStorage();

          if (storedRider && isActive) {
            setSessionRider((prev) => prev || storedRider);
          }

          const currentRider = rider || storedRider;
          const currentRiderId =
            currentRider?.id || currentRider?._id || (await getRiderId());

          if (!currentRiderId) {
            return;
          }

          if (preventRedirect || preventMedicineRedirect) {
            return;
          }

          const activeRide = await getActiveBikeRiderSession(currentRiderId);

          if (
            activeRide &&
            (activeRide.status === "accepted" ||
              activeRide.status === "arrived_at_pickup" ||
              activeRide.status === "arrived_at_patient" ||
              activeRide.status === "in_progress" ||
              activeRide.status === "navigating_to_hospital" ||
              activeRide.status === "payment_pending")
          ) {
            navigation.replace("ActiveBikeRide", {
              ride: activeRide,
              rider: currentRider || activeRide?.rider || null,
              riderId: currentRiderId,
            });

            return;
          }

          const activeMedicineDelivery =
            await getActiveMedicineDeliverySession(currentRiderId);

          const activeMedicineStatus = String(
            activeMedicineDelivery?.status || ""
          ).toLowerCase();

          if (
            activeMedicineDelivery &&
            [
              "delivering",
              "reached_pharmacy",
              "navigating_to_patient",
              "payment_pending",
            ].includes(activeMedicineStatus)
          ) {
            navigation.replace("ActiveMedicineDelivery", {
              order: activeMedicineDelivery,
              rider: currentRider || activeMedicineDelivery?.rider || null,
              riderId: currentRiderId,
            });

            return;
          }
        } catch (error) {
          console.log("Active bike rider session check error:", error.message);
        }
      };

      checkActiveBikeRide();

      return () => {
        isActive = false;
      };
    }, [navigation, rider, preventRedirect, preventMedicineRedirect])
  );

  const loadRequests = async () => {
    try {
      setLoadingReqs(true);

      const currentRiderId = await getRiderId();
      if (!currentRiderId) throw new Error("Rider ID not found. Please login again.");
      const rideList = await fetchPendingBikeRides();
      const deliveryList = await fetchPendingMedicineDeliveries(currentRiderId);

      const normalizedDeliveryList = (
        Array.isArray(deliveryList) ? deliveryList : []
      ).map((item) => ({
        ...item,
        pricing: {
          medicineAmount: Number(
            item?.pricing?.medicineAmount ??
            item?.medicineAmount ??
            item?.orderPricing?.medicineAmount ??
            0
          ),
          equipmentAmount: Number(
            item?.pricing?.equipmentAmount ??
            item?.pricing?.medicalEquipmentAmount ??
            item?.equipmentAmount ??
            item?.orderPricing?.equipmentAmount ??
            0
          ),
          deliveryCharges: Number(
            item?.pricing?.deliveryCharges ??
            item?.deliveryCharges ??
            item?.riderEarning ??
            item?.orderPricing?.deliveryCharges ??
            0
          ),
          totalAmount: Number(
            item?.pricing?.totalAmount ??
            item?.totalAmount ??
            (
              Number(item?.pricing?.medicineAmount ?? item?.medicineAmount ?? 0) +
              Number(item?.pricing?.equipmentAmount ?? item?.equipmentAmount ?? 0) +
              Number(item?.pricing?.deliveryCharges ?? item?.deliveryCharges ?? item?.riderEarning ?? 0)
            )
          ),
        },
      }));

      const mappedRideRequests = (Array.isArray(rideList) ? rideList : []).map(
        (item) => ({
          ...item,
          requestType: "bike_ride",
        })
      );

      const mappedDeliveryRequestsRaw = normalizedDeliveryList.map((item) => ({
        ...item,
        requestType: "medicine_delivery",
      }));

      const mappedDeliveryRequests = await Promise.all(
        mappedDeliveryRequestsRaw.map((item) =>
          resolveMedicineDeliveryAddresses(item)
        )
      );

      const combinedRequests = [
        ...mappedRideRequests,
        ...mappedDeliveryRequests,
      ];

      setReqs(combinedRequests);

      return combinedRequests;
    } catch (e) {
      console.log("loadRequests error:", e.message);
      Alert.alert("Error", e.message || "Failed to load requests");

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
    let timer;

    if (isOnline) {
      loadRequests();

      timer = setInterval(() => {
        loadRequests();
      }, 8000);
    } else {
      setReqs([]);
      setSeenRequestIds([]);
      setNotificationOpen(false);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isOnline]);

  const handleIgnore = (id) => {
    setReqs((prev) => prev.filter((x) => (x.id || x._id) !== id));
    setSeenRequestIds((prev) => prev.filter((x) => x !== String(id)));
  };

  const handleAccept = async (request) => {
    const isMedicineDelivery = request?.requestType === "medicine_delivery";
    const requestId = request?.id || request?._id;

    if (!requestId) {
      Alert.alert(
        "Error",
        isMedicineDelivery ? "Order ID not found" : "Ride ID not found"
      );
      return;
    }

    try {
      const riderId = await getRiderId();

      if (!riderId) {
        Alert.alert(
          "Error",
          "Rider ID not found. Please logout and login again as bike rider."
        );
        return;
      }

      setAcceptingId(requestId);

      if (isMedicineDelivery) {
        const acceptedOrder = await acceptMedicineDeliveryRequest({
          orderId: requestId,
          riderId,
        });

        setReqs((prev) => prev.filter((x) => (x.id || x._id) !== requestId));
        setSeenRequestIds((prev) =>
          prev.filter((x) => x !== String(requestId))
        );
        setNotificationOpen(false);

        navigation.navigate("ActiveMedicineDelivery", {
          order: acceptedOrder,
          rider: rider || acceptedOrder?.rider || null,
          riderId,
        });

        return;
      }

      const acceptedRide = await acceptBikeRideRequest({
        rideId: requestId,
        riderId,
      });

      setReqs((prev) => prev.filter((x) => (x.id || x._id) !== requestId));
      setSeenRequestIds((prev) => prev.filter((x) => x !== String(requestId)));
      setNotificationOpen(false);

      navigation.navigate("ActiveBikeRide", {
        ride: acceptedRide,
        rider: rider || acceptedRide?.rider || null,
        riderId,
      });
    } catch (error) {
      console.log("handleAccept error:", error.message);

      Alert.alert("Accept Failed", error.message || "Failed to accept request");

      loadRequests();
    } finally {
      setAcceptingId(null);
    }
  };

  // ===== Sidebar navigation =====
  const goProfile = () => {
    navigation.navigate("BikeRiderProfileManagement", { rider });
    closeDrawer();
  };

  const goHistory = () => {
    navigation.navigate("BikeRiderPastHistory", { rider });
    closeDrawer();
  };

  const goSupportChat = async () => {
    const riderId = await getRiderId();

    if (!riderId) {
      Alert.alert(
        "No ID",
        "Rider ID not found. Please login again to open support chat."
      );
      return;
    }

    navigation.navigate("BikeRiderSupportChat", {
      rider,
      riderId,
    });

    closeDrawer();
  };

  const doLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout? Your active ride will continue until you complete or cancel it.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            closeDrawer();

            try {
              await AsyncStorage.multiRemove([
                "ERS_SESSION",
                "riderData",
                "riderId",
              ]);
            } catch (e) {
              console.log("logout storage error:", e.message);
            }

            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: "RoleSelect" }],
              })
            );
          },
        },
      ]
    );
  };

  const renderPendingNotification = (request) => {
    const id = request.id || request._id;
    const isMedicineDelivery = request.requestType === "medicine_delivery";
    const name = request.patientInfo?.name || "Unknown Patient";

    const dt = formatDateTime(
      request.approvedAt || request.requestedAt || request.createdAt
    );

    return (
      <View
        key={id}
        style={[
          s.pendingNotificationCard,
          isMedicineDelivery && s.medicineNotificationCard,
        ]}
      >
        <View style={s.pendingNotificationTop}>
          <Text style={s.pendingNotificationIcon}>
            {isMedicineDelivery ? "💊" : "🏍️"}
          </Text>

          <Text
            style={[
              s.pendingNotificationTitle,
              isMedicineDelivery && s.medicineNotificationTitle,
            ]}
          >
            {isMedicineDelivery
              ? "New Medicine Delivery"
              : "New Bike Ride Request"}
          </Text>
        </View>

        <Text style={s.pendingNotificationMessage}>
          {isMedicineDelivery
            ? `New medicine order request from ${name}`
            : `New bike ride request from ${name}`}
        </Text>

        {!!dt && <Text style={s.pendingNotificationTime}>{dt}</Text>}
      </View>
    );
  };

  const renderRequestCard = (r) => {
    const id = r.id || r._id;

    const isMedicineDelivery = r.requestType === "medicine_delivery";
    const name = r.patientInfo?.name || "Unknown Patient";
    const phone = r.patientInfo?.phone || "";

    const pickup = isMedicineDelivery
      ? cleanAddressForRider(
          r.pharmacyInfo?.address || r.pharmacy?.address,
          "Pharmacy pickup not provided"
        )
      : getLocationDisplayName(r.pickupLocation, "Pickup not provided", {
          preferAddressWhenGeneric: true,
        });

    const dest = isMedicineDelivery
      ? cleanAddressForRider(
          r.deliveryLocation?.address,
          "Patient delivery location not provided"
        )
      : getLocationDisplayName(r.dropoffLocation, "Destination not provided");

    const dt = formatDateTime(r.approvedAt || r.requestedAt || r.createdAt);

    return (
      <View key={id} style={s.reqCard}>
        <View style={s.reqHead}>
          <View
            style={[
              s.pill,
              isMedicineDelivery && { backgroundColor: "#DCFCE7" },
            ]}
          >
            <Text
              style={[s.pillText, isMedicineDelivery && { color: "#166534" }]}
            >
              {isMedicineDelivery ? "Medicine Delivery" : "Ride Request"}
            </Text>
          </View>

          <View style={s.reqMeta}>
            {!!dt && <Text style={s.dtText}>{dt}</Text>}
          </View>
        </View>

        <Text style={s.reqName}>{name}</Text>

        <View style={s.row}>
          <Text style={s.rowIcon}>📞</Text>
          <Text style={s.rowText}>{phone}</Text>
        </View>

        <View style={s.reqDivider} />

        {isMedicineDelivery && (
          <View
            style={{
              backgroundColor: "#F0FDF4",
              borderRadius: 10,
              padding: 10,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: "#86EFAC",
            }}
          >
            <Text style={{ fontWeight: "900", color: "#166534", marginBottom: 6 }}>
              💰 Order Price Breakdown
            </Text>

            <Text style={s.rowStrong}>
              Medicine Amount: Rs. {
                Number(
                  r?.pricing?.medicineAmount ??
                  r?.medicineAmount ??
                  0
                )
              }
            </Text>

            <Text style={s.rowStrong}>
              Medical Equipment Amount: Rs. {
                Number(
                  r?.pricing?.equipmentAmount ??
                  r?.pricing?.medicalEquipmentAmount ??
                  r?.equipmentAmount ??
                  0
                )
              }
            </Text>

            <Text style={s.rowStrong}>
              Delivery Charges (Your Earning): Rs. {
                Number(
                  r?.pricing?.deliveryCharges ??
                  r?.deliveryCharges ??
                  r?.riderEarning ??
                  0
                )
              }
            </Text>

            
           

            <Text style={s.rowStrong}>
              Total Order Amount: Rs. {
                Number(
                  r?.pricing?.totalAmount ??
                  (
                    Number(r?.pricing?.medicineAmount || r?.medicineAmount || 0) +
                    Number(r?.pricing?.equipmentAmount || r?.pricing?.medicalEquipmentAmount || r?.equipmentAmount || 0) +
                    Number(r?.pricing?.deliveryCharges || r?.deliveryCharges || r?.riderEarning || 0)
                  )
                )
              }
            </Text>
          </View>
        )}

        <View style={s.row}>
          <Image
            source={{ uri: PIN_ICON }}
            style={[s.rowIconImg, { tintColor: "#2563EB" }]}
          />

          <View style={{ flex: 1 }}>
            <Text style={s.rowLabel}>
              {isMedicineDelivery ? "Pharmacy Pickup" : "Pickup Location"}
            </Text>

            <Text style={s.rowStrong} numberOfLines={2}>
              {pickup}
            </Text>
          </View>
        </View>

        <View style={[s.row, { marginTop: 10 }]}>
          <Image
            source={{ uri: PIN_ICON }}
            style={[s.rowIconImg, { tintColor: "#16A34A" }]}
          />

          <View style={{ flex: 1 }}>
            <Text style={s.rowLabel}>
              {isMedicineDelivery ? "Patient Delivery" : "Destination"}
            </Text>

            <Text style={s.rowStrong} numberOfLines={2}>
              {dest}
            </Text>
          </View>
        </View>

        <View style={s.actionRow}>
          <TouchableOpacity
            style={[
              s.acceptBtn,
              { marginRight: 10 },
              acceptingId === id && { opacity: 0.7 },
            ]}
            activeOpacity={0.9}
            onPress={() => handleAccept(r)}
            disabled={acceptingId !== null}
          >
            {acceptingId === id ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={s.acceptText}>Accept Request</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.ignoreBtn, acceptingId === id && { opacity: 0.5 }]}
            activeOpacity={0.9}
            onPress={() => handleIgnore(id)}
            disabled={acceptingId !== null}
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
            <Image source={bikeIcon} style={s.brandIcon} />
          </View>

          <View>
            <Text style={s.brandTitle}>Bike Rider</Text>
            <Text style={s.brandSub} numberOfLines={1}>
              {displayName}
            </Text>
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
                      Turn online to receive requests
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
                      New bike ride and medicine delivery requests will appear
                      here
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
              trackColor={{ false: "#E5E7EB", true: "#86EFAC" }}
              thumbColor={isOnline ? "#16A34A" : "#9CA3AF"}
              value={isOnline}
              onValueChange={(v) => setIsOnline(v)}
            />
          </View>

          <Text style={s.statusHint}>
            {isOnline
              ? "You are online and can receive requests"
              : "You are offline and will not receive requests"}
          </Text>

          {isOnline && (
            <TouchableOpacity
              style={s.refreshBtn}
              activeOpacity={0.9}
              onPress={loadRequests}
              disabled={loadingReqs || acceptingId !== null}
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
                  <Image source={bikeIcon} style={s.avatarImg} />
                </View>

                <View>
                  <Text style={s.driverName} numberOfLines={1}>
                    {displayName}
                  </Text>

                  <Text style={s.driverPhone}>{displayPhone}</Text>

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
              <View style={[s.itemIcon, { backgroundColor: "#E8F0FF" }]}>
                <Text style={s.itemIconText}>🕓</Text>
              </View>

              <Text style={s.itemText}>Past History</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.item}
              activeOpacity={0.85}
              onPress={goProfile}
            >
              <View style={[s.itemIcon, { backgroundColor: "#FFF4E6" }]}>
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
                style={[
                  s.itemText,
                  { color: "#B91C1C", fontWeight: "700" },
                ]}
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

const COLORS = {
  brand: "#2563EB",
  bg: "#F6F7F9",
  white: "#FFFFFF",
  border: "#E5E7EB",
  text: "#0F172A",
  sub: "#64748B",
  shadow: "rgba(15,23,42,0.14)",
};

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
    fontWeight: "800",
    fontSize: 15,
  },

  brandSub: {
    color: "#E5E7EB",
    fontSize: 11,
    marginTop: 2,
    maxWidth: 140,
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
    borderColor: "#DBEAFE",
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
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },

  medicineNotificationCard: {
    backgroundColor: "#F0FDF4",
    borderColor: "#86EFAC",
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
    color: "#1E40AF",
  },

  medicineNotificationTitle: {
    color: "#166534",
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
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 3,
  },

  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  statusTitle: {
    color: COLORS.text,
    fontWeight: "800",
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
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
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
    fontWeight: "800",
    fontSize: 14.5,
  },

  reqCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#2563EB",
    padding: 12,
    marginBottom: 12,
  },

  reqHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  pill: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 10,
    height: 22,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  pillText: {
    color: "#1E40AF",
    fontWeight: "800",
    fontSize: 11,
  },

  reqMeta: {
    alignItems: "flex-end",
  },

  dtText: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "700",
  },

  reqName: {
    color: COLORS.text,
    fontWeight: "800",
    marginTop: 10,
    marginBottom: 6,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },

  rowIcon: {
    marginRight: 8,
    fontSize: 13,
    color: "#111827",
  },

  rowText: {
    color: COLORS.text,
  },

  rowIconImg: {
    width: 16,
    height: 16,
    marginRight: 8,
  },

  reqDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
    borderRadius: 1,
  },

  rowLabel: {
    color: COLORS.sub,
    fontSize: 12,
  },

  rowStrong: {
    color: COLORS.text,
    fontWeight: "700",
    marginTop: 2,
    lineHeight: 20,
  },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },

  acceptBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },

  acceptText: {
    color: "#FFF",
    fontWeight: "800",
  },

  ignoreBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },

  ignoreText: {
    color: "#111827",
    fontWeight: "700",
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
    marginTop: 4,
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
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.25,
    shadowOffset: { width: -6, height: 0 },
    shadowRadius: 18,
    elevation: 9000,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
    zIndex: 9000,
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
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarImg: {
    width: 20,
    height: 20,
    tintColor: "#2563EB",
  },

  driverName: {
    color: COLORS.text,
    fontWeight: "800",
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
    fontWeight: "800",
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
    color: "#1F2937",
  },

  itemText: {
    fontSize: 15.5,
    color: "#111827",
    fontWeight: "600",
  },

  drawerDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 10,
    borderRadius: 1,
  },
});