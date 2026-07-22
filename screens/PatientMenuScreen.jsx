// screens/PatientMenuScreen.jsx

import React, { useRef, useState, useCallback, useEffect } from "react";
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
  Alert,
  ActivityIndicator,
} from "react-native";
import {
  useRoute,
  CommonActions,
  useFocusEffect,
} from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { buildUrl } from "../services/apiConfig";
import { getActiveBikeRideSession } from "../services/bikeRideRequests";

const { width: SCREEN_W } = Dimensions.get("window");
const ambulanceIcon = require("../assets/ambulance.png");
const medicineIcon = require("../assets/pill.png");

const COLORS = {
  bg: "#F1F5F9",
  white: "#FFFFFF",
  border: "#E5E7EB",
  text: "#0F172A",
  sub: "#64748B",
  redSoft: "#FEE2E2",
  blueSoft: "#E8F0FF",
  greenSoft: "#E9F8EE",
  alertBg: "#FDECEC",
  alertBorder: "#F8C6C6",
  shadow: "rgba(15, 23, 42, 0.18)",
};

export default function PatientMenuScreen({ navigation }) {
  const route = useRoute();

  const [routePatient, setRoutePatient] = useState(
    route.params?.patient || null
  );

  const [effectivePatientId, setEffectivePatientId] = useState(
    route.params?.patientId ||
      route.params?.patient?._id ||
      route.params?.patient?.id ||
      null
  );

  const displayName = routePatient?.fullName || "Patient User";

  // ✅ Live reference to store the latest ambulance request details for the button handler
  const activeAmbulanceRef = useRef(null);
  const activeBikeRideRef = useRef(null);

  // ===============================
  // ✅ Notifications State
  // ===============================
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationLoading, setNotificationLoading] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const savedId = await AsyncStorage.getItem("patientId");
      const patientId = effectivePatientId || savedId;

      if (!patientId) return;

      const res = await fetch(
        buildUrl(`/api/notifications/patient/${patientId}/unread-count`)
      );

      const data = await res.json();

      if (res.ok && data?.success) {
        setUnreadCount(Number(data.count || 0));
      } else {
        setUnreadCount(0);
      }
    } catch (error) {
      console.log("Fetch unread count error:", error.message);
      setUnreadCount(0);
    }
  }, [effectivePatientId]);

  const fetchNotifications = useCallback(async () => {
    try {
      const savedId = await AsyncStorage.getItem("patientId");
      const patientId = effectivePatientId || savedId;

      if (!patientId) return;

      setNotificationLoading(true);

      const res = await fetch(
        buildUrl(`/api/notifications/patient/${patientId}`)
      );

      const data = await res.json();

      if (res.ok && data?.success) {
        setNotifications(
          Array.isArray(data.notifications) ? data.notifications : []
        );
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.log("Fetch notifications error:", error.message);
      setNotifications([]);
    } fillValue: {
      setNotificationLoading(false);
    }
  }, [effectivePatientId]);

  const markAllNotificationsRead = useCallback(async () => {
    try {
      const savedId = await AsyncStorage.getItem("patientId");
      const patientId = effectivePatientId || savedId;

      if (!patientId) return;

      await fetch(buildUrl(`/api/notifications/patient/${patientId}/read-all`), {
        method: "PATCH",
      });

      setUnreadCount(0);
      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          isRead: true,
        }))
      );
    } catch (error) {
      console.log("Mark all notifications read error:", error.message);
    }
  }, [effectivePatientId]);

  const handleBellPress = async () => {
    const nextOpen = !notificationOpen;
    setNotificationOpen(nextOpen);

    if (nextOpen) {
      await fetchNotifications();
      await markAllNotificationsRead();
    }
  };

  // ✅ Count auto refresh after every 10 seconds
  useEffect(() => {
    fetchUnreadCount();

    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // =========================================================================
  // ✅ FIXED: Direct backend status checker with explicit back manual-override parameter protection
  // =========================================================================
  useFocusEffect(
    useCallback(() => {
      let activeScanInterval = null;

      const checkActiveSession = async () => {
        try {
          const savedData = await AsyncStorage.getItem("patientData");
          const savedId = await AsyncStorage.getItem("patientId");

          const currentId = effectivePatientId || savedId;
          const currentPatient =
            routePatient || (savedData ? JSON.parse(savedData) : null);

          if (savedData && !routePatient) {
            setRoutePatient(currentPatient);
          }

          if (savedId && !effectivePatientId) {
            setEffectivePatientId(currentId);
          }

          if (currentId) {
            fetchUnreadCount();
          }

          if (!currentId) {
            return;
          }

          // 1) AMBULANCE LIVE STATUS SCANNING
          try {
            const res = await fetch(
              buildUrl(`/api/ambulance/active-session/${currentId}`)
            );
            const data = await res.json();

            if (data.success && data.status) {
              const currentStatus = data.status;
              activeAmbulanceRef.current = data; // Keep reference data fresh for button click execution at all times

              // ✅ FIX: Agar user Tracking Screen se back aaya hai toh auto-redirect nahi hone dena
              if (route.params?.preventRedirect) {
                // Skips auto navigation block so patient can wait on menu screen comfortably
              } else {
                if (currentStatus === "no_driver") {
                  navigation.navigate("NoDriverAvailable", {
                    patient: currentPatient,
                  });
                  return;
                }

                if (currentStatus === "pending") {
                  return; 
                }

                if (
                  currentStatus === "accepted" ||
                  currentStatus === "in-progress" ||
                  currentStatus === "in_progress"
                ) {
                  clearInterval(activeScanInterval); 
                  navigation.navigate("AmbulanceTracking", {
                    request: data.request,
                    driver: data.driver,
                    patient: currentPatient,
                  });
                  return;
                }

                if (
                  currentStatus === "arrived_at_patient" ||
                  currentStatus === "navigating_to_hospital" ||
                  currentStatus === "payment_pending"
                ) {
                  clearInterval(activeScanInterval);
                  navigation.navigate("AmbulanceTracking", {
                    request: data.request,
                    driver: data.driver,
                    patient: currentPatient,
                    autoArrived: true,
                  });
                  return;
                }

                if (currentStatus === "completed") {
                  const completedRequestId = data.request?._id || data.request?.id;
                  const paymentStatus = data.request?.paymentStatus;

                  const paymentDoneSeenKey = completedRequestId
                    ? `AMB_PAYMENT_DONE_SEEN_${completedRequestId}`
                    : null;

                  const alreadySeen = paymentDoneSeenKey
                    ? await AsyncStorage.getItem(paymentDoneSeenKey)
                    : null;

                  if (
                    paymentStatus === "paid" &&
                    completedRequestId &&
                    !alreadySeen
                  ) {
                    await AsyncStorage.setItem(paymentDoneSeenKey, "true");

                    navigation.navigate("AmbulanceTracking", {
                      request: data.request,
                      driver: data.driver,
                      patient: currentPatient,
                      autoArrived: true,
                    });
                    return;
                  }
                }
              }
            }
          } catch (ambulanceErr) {
            console.log("Ambulance active session check error:", ambulanceErr.message);
          }

          // 2) BIKE RIDE LIVE STATUS SCANNING
          try {
            const activeBikeRide = await getActiveBikeRideSession(currentId);
            activeBikeRideRef.current = activeBikeRide || null;

            // Same behavior as ambulance: agar tracking screen se back aya hai
            // toh menu par wapis rehne dena hai. Sirf Book Bike Ride button par check hoga.
            if (route.params?.preventRedirect) {
              return;
            }

            if (activeBikeRide?.status === "completed") {
              const completedRideId = activeBikeRide?._id || activeBikeRide?.id;
              const paymentStatus = activeBikeRide?.paymentStatus;

              const bikePaymentDoneSeenKey = completedRideId
                ? `BIKE_PAYMENT_DONE_SEEN_${completedRideId}`
                : null;

              const alreadySeen = bikePaymentDoneSeenKey
                ? await AsyncStorage.getItem(bikePaymentDoneSeenKey)
                : null;

              if (paymentStatus === "paid" && completedRideId && !alreadySeen) {
                await AsyncStorage.setItem(bikePaymentDoneSeenKey, "true");
                navigation.navigate("BikeRiderTracking", {
                  ride: activeBikeRide,
                  patient: currentPatient,
                  autoCompleted: true,
                });
                return;
              }
            }

            if (
              activeBikeRide &&
              (activeBikeRide.status === "accepted" ||
                activeBikeRide.status === "arrived_at_pickup" ||
                activeBikeRide.status === "arrived_at_patient" ||
                activeBikeRide.status === "in_progress" ||
                activeBikeRide.status === "navigating_to_hospital" ||
                activeBikeRide.status === "payment_pending")
            ) {
              clearInterval(activeScanInterval);
              navigation.navigate("BikeRiderTracking", {
                ride: activeBikeRide,
                patient: currentPatient,
              });
              return;
            }
          } catch (bikeErr) {
            console.log("Bike active session check error:", bikeErr.message);
          }

          // 3) MEDICINE ORDER LIVE STATUS SCANNING
          try {
            const medicineRes = await fetch(
              buildUrl(`/api/medicine-orders/active-session/${currentId}`)
            );
            const medicineData = await medicineRes.json();

            if (medicineRes.ok && medicineData?.success && medicineData?.order) {
              const medicineOrder = medicineData.order;
              const medicineStatus = String(medicineOrder.status || "").toLowerCase();

              const activeMedicineStatuses = [
                "pharmacy_processing",
                "dispatching",
                "delivering",
                "reached_pharmacy",
                "navigating_to_patient",
                "payment_pending",
              ];

              if (activeMedicineStatuses.includes(medicineStatus)) {
                clearInterval(activeScanInterval);
                navigation.navigate("MedicineOrderTracking", {
                  order: medicineOrder,
                  patient: currentPatient,
                  patientId: currentId,
                });
                return;
              }

              if (
                medicineStatus === "delivered" &&
                medicineOrder.paymentStatus === "paid"
              ) {
                const completedOrderId = medicineOrder?._id || medicineOrder?.id;
                const seenKey = completedOrderId
                  ? `MEDICINE_PAYMENT_DONE_SEEN_${completedOrderId}`
                  : null;

                const alreadySeen = seenKey ? await AsyncStorage.getItem(seenKey) : null;

                if (!alreadySeen) {
                  clearInterval(activeScanInterval);
                  navigation.navigate("MedicineOrderTracking", {
                    order: medicineOrder,
                    patient: currentPatient,
                    patientId: currentId,
                  });
                  return;
                }
              }
            }
          } catch (medicineErr) {
            console.log("Medicine active session check error:", medicineErr.message);
          }
        } catch (err) {
          console.log("Persistence Check Error:", err);
        }
      };

      checkActiveSession();

      activeScanInterval = setInterval(() => {
        checkActiveSession();
      }, 2500);

      return () => {
        if (activeScanInterval) {
          clearInterval(activeScanInterval);
        }
      };
    }, [effectivePatientId, routePatient, route.params])
  );

  // ===== Drawer state & anim =====
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerTrans = useRef(new Animated.Value(0)).current;
  const DRAWER_W = SCREEN_W * 0.78;

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

  // ===== Card handlers =====
  // ✅ FIXED: Agar accepted request chal rahi ho aur user manual "Call Emergency" click kare, toh foran tracking par redirect kare
  const onEmergency = () => {
    if (!effectivePatientId) {
      Alert.alert(
        "No ID",
        "Patient ID not found. Please login again to use ambulance service."
      );
      return;
    }

    const currentStatus = activeAmbulanceRef.current?.status;
    if (
      activeAmbulanceRef.current?.success &&
      (currentStatus === "accepted" ||
        currentStatus === "in-progress" ||
        currentStatus === "in_progress" ||
        currentStatus === "arrived_at_patient" ||
        currentStatus === "navigating_to_hospital" ||
        currentStatus === "payment_pending")
    ) {
      navigation.navigate("AmbulanceTracking", {
        request: activeAmbulanceRef.current.request,
        driver: activeAmbulanceRef.current.driver,
        patient: routePatient || activeAmbulanceRef.current.patient,
        autoArrived: ["arrived_at_patient", "navigating_to_hospital", "payment_pending"].includes(currentStatus),
      });
      return;
    }

    navigation.navigate("EmergencyAmbulance", {
      patientId: effectivePatientId,
      patient: routePatient,
    });
  };

  const onBikeRide = async () => {
    if (!effectivePatientId) {
      Alert.alert(
        "No ID",
        "Session expired. Please login again to use bike service."
      );
      return;
    }

    try {
      const activeBikeRide = await getActiveBikeRideSession(effectivePatientId);
      activeBikeRideRef.current = activeBikeRide || null;

      const activeStatus = String(activeBikeRide?.status || "")
        .toLowerCase()
        .replace("-", "_");

      if (
        activeBikeRide &&
        [
          "accepted",
          "arrived_at_pickup",
          "arrived_at_patient",
          "in_progress",
          "navigating_to_hospital",
          "payment_pending",
        ].includes(activeStatus)
      ) {
        navigation.navigate("BikeRiderTracking", {
          ride: activeBikeRide,
          patient: routePatient,
        });
        return;
      }

      navigation.navigate("BikeRide", {
        patientId: effectivePatientId,
        patient: routePatient,
      });
    } catch (error) {
      console.log("Bike ride active check error:", error.message);

      navigation.navigate("BikeRide", {
        patientId: effectivePatientId,
        patient: routePatient,
      });
    }
  };

  const onOrderMedicine = () => {
    if (!effectivePatientId) {
      Alert.alert(
        "No ID",
        "Session expired. Please login again to use order medicine service."
      );
      return;
    }

    navigation.navigate("OrderMedicine", {
      patientId: effectivePatientId,
      patient: routePatient,
    });
  };

  // ===== Drawer item handlers =====
  const goProfile = () => {
    if (!effectivePatientId) {
      Alert.alert(
        "No ID",
        "Patient ID not found. Please login again to open your profile."
      );
      return;
    }

    navigation.navigate("PatientProfile", {
      patient: routePatient,
      patientId: effectivePatientId,
    });

    closeDrawer();
  };

  const goHistory = () => {
    if (!effectivePatientId) {
      Alert.alert(
        "No ID",
        "Patient ID not found. Please login again to open history."
      );
      return;
    }

    navigation.navigate("PatientHistory", {
      patient: routePatient,
      patientId: effectivePatientId,
    });

    closeDrawer();
  };

  const goSupportChat = () => {
    if (!effectivePatientId) {
      Alert.alert(
        "No ID",
        "Patient ID not found. Please login again to open support chat."
      );
      return;
    }

    navigation.navigate("PatientSupportChat", {
      patient: routePatient,
      patientId: effectivePatientId,
    });

    closeDrawer();
  };

  const doLogout = () => {
    closeDrawer();

    Alert.alert("Logout", "Are you sure you want to logout?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await AsyncStorage.multiRemove([
              "ERS_SESSION",
              "patientData",
              "patientId",
            ]);
          } catch (e) {
            console.log("Logout storage error:", e.message);
          }

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

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Top Welcome Bar */}
        <View style={styles.header}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>Welcome, {displayName}</Text>
            <Text style={styles.headerSubtitle}>
              Emergency services at your fingertips
            </Text>
          </View>

          <View style={styles.headerActions}>
            <View style={styles.notificationWrapper}>
              <TouchableOpacity
                style={styles.bellButton}
                onPress={handleBellPress}
                activeOpacity={0.85}
                accessibilityLabel="Open notifications"
              >
                <Text style={styles.bellIcon}>🔔</Text>

                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {notificationOpen && (
                <View style={styles.notificationDropdown}>
                  <View style={styles.dropdownHeader}>
                    <Text style={styles.dropdownTitle}>Notifications</Text>
                    <TouchableOpacity
                      onPress={() => setNotificationOpen(false)}
                      style={styles.dropdownClose}
                    >
                      <Text style={styles.dropdownCloseText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {notificationLoading ? (
                    <View style={styles.notificationLoadingBox}>
                      <ActivityIndicator size="small" color="#2563EB" />
                      <Text style={styles.loadingText}>Loading...</Text>
                    </View>
                  ) : notifications.length === 0 ? (
                    <Text style={styles.emptyNotificationText}>
                      No notifications found
                    </Text>
                  ) : (
                    <ScrollView
                      style={styles.notificationList}
                      nestedScrollEnabled
                      showsVerticalScrollIndicator={false}
                    >
                      {notifications.map((item) => (
                        <View
                          key={String(item.id || item._id)}
                          style={[
                            styles.notificationItem,
                            !item.isRead && styles.unreadNotificationItem,
                          ]}
                        >
                          <Text style={styles.notificationTitle}>
                            {item.title || "Notification"}
                          </Text>
                          <Text style={styles.notificationMessage}>
                            {item.message || ""}
                          </Text>
                          <Text style={styles.notificationTime}>
                            {item.createdAt
                              ? new Date(item.createdAt).toLocaleString()
                              : ""}
                          </Text>
                        </View>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.menuBtn}
              accessibilityLabel="Open menu"
              onPress={openDrawer}
              activeOpacity={0.8}
            >
              <View style={styles.menuDot} />
              <View style={styles.menuDot} />
              <View style={styles.menuDot} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Alert banner */}
        <View style={styles.alert}>
          <Text style={styles.alertIcon}>❗</Text>
          <Text style={styles.alertText}>
            In case of life-threatening emergency, call{" "}
            <Text style={styles.alertBold}>1122</Text> or use the Emergency
            Ambulance button below
          </Text>
        </View>

        {/* Cards */}
        <View style={styles.cards}>
          {/* Emergency Ambulance */}
          <View style={[styles.card, styles.cardRed]}>
            <View style={[styles.iconCircle, { backgroundColor: "#DC2626" }]}>
              <Image source={ambulanceIcon} style={styles.iconImg} />
            </View>

            <Text style={[styles.cardTitle, { color: "#B91C1C" }]}>
              Emergency Ambulance
            </Text>

            <Text style={styles.cardDesc}>
              Immediate ambulance dispatch for medical emergencies
            </Text>

            <TouchableOpacity
              onPress={onEmergency}
              activeOpacity={0.9}
              style={[styles.cardBtn, { backgroundColor: "#B91C1C" }]}
            >
              <Text style={styles.cardBtnText}>Call Emergency</Text>
            </TouchableOpacity>
          </View>

          {/* Bike Ride */}
          <View style={[styles.card, styles.cardBlue]}>
            <View style={[styles.iconCircle, { backgroundColor: "#2563EB" }]}>
              <Image
                source={{
                  uri: "https://cdn-icons-png.flaticon.com/512/854/854894.png",
                }}
                style={styles.iconImg}
              />
            </View>

            <Text style={[styles.cardTitle, { color: "#1D4ED8" }]}>
              Bike Ride
            </Text>

            <Text style={styles.cardDesc}>
              Quick bike transport for non-emergency travel
            </Text>

            <TouchableOpacity
              onPress={onBikeRide}
              activeOpacity={0.9}
              style={[styles.cardBtn, { backgroundColor: "#2563EB" }]}
            >
              <Text style={styles.cardBtnText}>Book Bike Ride</Text>
            </TouchableOpacity>
          </View>

          {/* Order Medicine */}
          <View style={[styles.card, styles.cardGreen]}>
            <View style={[styles.iconCircle, { backgroundColor: "#16A34A" }]}>
              <Image source={medicineIcon} style={styles.iconImg} />
            </View>

            <Text style={[styles.cardTitle, { color: "#15803D" }]}>
              Order Medicine
            </Text>

            <Text style={styles.cardDesc}>
              Order medicines and equipment with prescription
            </Text>

            <TouchableOpacity
              onPress={onOrderMedicine}
              activeOpacity={0.9}
              style={[styles.cardBtn, { backgroundColor: "#16A34A" }]}
            >
              <Text style={styles.cardBtnText}>Order Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Drawer */}
      {drawerOpen && (
        <>
          <Pressable
            style={styles.backdrop}
            onPress={closeDrawer}
            accessibilityLabel="Close menu"
          />

          <Animated.View
            style={[styles.drawer, { width: DRAWER_W }, drawerStyle]}
          >
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Menu</Text>
              <TouchableOpacity
                onPress={closeDrawer}
                style={styles.closeBtn}
                accessibilityLabel="Close"
              >
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.item}
              onPress={goProfile}
              activeOpacity={0.85}
            >
              <View style={[styles.itemIcon, { backgroundColor: "#E8F0FF" }]}>
                <Text style={styles.itemIconText}>👤</Text>
              </View>
              <Text style={styles.itemText}>Profile Management</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.item}
              onPress={goHistory}
              activeOpacity={0.85}
            >
              <View style={[styles.itemIcon, { backgroundColor: "#FFF4E6" }]}>
                <Text style={styles.itemIconText}>⏳</Text>
              </View>
              <Text style={styles.itemText}>Past History</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.item}
              onPress={goSupportChat}
              activeOpacity={0.85}
            >
              <View style={[styles.itemIcon, { backgroundColor: "#ECFDF5" }]}>
                <Text style={styles.itemIconText}>💬</Text>
              </View>
              <Text style={styles.itemText}>Support Chat</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={[styles.item, styles.logoutItem]}
              onPress={doLogout}
              activeOpacity={0.85}
            >
              <View style={[styles.itemIcon, { backgroundColor: "#FDECEC" }]}>
                <Text style={[styles.itemIconText, { color: "#B91C1C" }]}>
                  ⎋
                </Text>
              </View>
              <Text
                style={[
                  styles.itemText,
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: 16, paddingBottom: 28 },
  header: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 22,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 3,
    zIndex: 1000,
  },
  headerTextWrap: { flex: 1, paddingRight: 8 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: COLORS.text },
  headerSubtitle: { fontSize: 12, color: COLORS.sub, marginTop: 2 },
  notificationWrapper: { position: "relative", zIndex: 2000 },
  bellButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
  },
  bellIcon: { fontSize: 18 },
  badge: {
    position: "absolute",
    top: -7,
    right: -7,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  badgeText: { color: "#FFFFFF", fontSize: 9, fontWeight: "900" },
  notificationDropdown: {
    position: "absolute",
    top: 46,
    right: -44,
    width: 310,
    maxHeight: 350,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 15,
    zIndex: 3000,
  },
  dropdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  dropdownTitle: { fontSize: 16, fontWeight: "900", color: COLORS.text },
  dropdownClose: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  dropdownCloseText: { fontSize: 13, color: "#111827", fontWeight: "800" },
  notificationLoadingBox: { paddingVertical: 18, alignItems: "center", justifyValue: "center" },
  loadingText: { marginTop: 8, fontSize: 12, color: COLORS.sub },
  emptyNotificationText: {
    fontSize: 13,
    color: COLORS.sub,
    textAlign: "center",
    paddingVertical: 20,
    fontWeight: "600",
  },
  notificationList: { maxHeight: 280 },
  notificationItem: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 8,
  },
  unreadNotificationItem: { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" },
  notificationTitle: { fontSize: 13, fontWeight: "900", color: "#111827" },
  notificationMessage: { fontSize: 12, color: "#475569", marginTop: 4, lineHeight: 16 },
  notificationTime: { fontSize: 10, color: "#94A3B8", marginTop: 6, fontWeight: "600" },
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
  },
  menuDot: {
    width: 16,
    height: 2.2,
    borderRadius: 2,
    backgroundColor: "#475569",
    marginVertical: 1.5,
  },
  alert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.alertBg,
    borderWidth: 1,
    borderColor: COLORS.alertBorder,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  alertIcon: { fontSize: 16, marginRight: 8 },
  alertText: { color: "#7F1D1D", fontSize: 13, flex: 1, lineHeight: 18 },
  alertBold: { fontWeight: "800" },
  cards: { marginTop: 14 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
    alignItems: "center",
  },
  cardRed: { backgroundColor: COLORS.redSoft },
  cardBlue: { backgroundColor: COLORS.blueSoft },
  cardGreen: { backgroundColor: COLORS.greenSoft },
  iconCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  iconImg: { width: 44, height: 44, tintColor: "#FFFFFF" },
  cardTitle: { fontSize: 17, fontWeight: "700", marginTop: 2, textAlign: "center" },
  cardDesc: { color: COLORS.sub, fontSize: 13, textAlign: "center", marginTop: 10, lineHeight: 18 },
  cardBtn: {
    marginTop: 14,
    width: "100%",
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 4,
  },
  cardBtnText: { color: COLORS.white, fontWeight: "900" },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  drawer: {
    position: "absolute",
    top: 40,
    bottom: 10,
    right: 0,
    backgroundColor: COLORS.white,
    paddingTop: 10,
    paddingHorizontal: 16,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.25,
    shadowOffset: { width: -6, height: 0 },
    shadowRadius: 18,
    elevation: 12,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    marginBottom: 8,
  },
  drawerTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  closeBtn: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyValue: "center", backgroundColor: "#f5f3f6ff" },
  closeText: { fontSize: 16, color: "#111827" },
  item: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderRadius: 12, paddingHorizontal: 8, marginVertical: 2 },
  itemIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginRight: 12 },
  itemIconText: { fontSize: 18, color: "#1F2937" },
  itemText: { fontSize: 15.5, color: "#111827", fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 10, borderRadius: 1 },
  logoutItem: { marginTop: 8 },
});