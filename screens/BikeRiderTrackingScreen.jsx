// screens/BikeRiderTrackingScreen.jsx

import React, { useEffect, useRef, useState } from "react";
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { CommonActions } from "@react-navigation/native";

import { GOOGLE_MAPS_APIKEY } from "../services/apiConfig";
import {
  fetchBikeRideStatus,
  updateBikeRideStatus,
  markBikeRidePaymentPending,
} from "../services/bikeRideRequests";

const COLORS = {
  brand: "#2563EB",
  brandDark: "#1D4ED8",
  bg: "#F6F7F9",
  white: "#FFFFFF",
  text: "#0F172A",
  sub: "#64748B",
  border: "#E5E7EB",
  green: "#16A34A",
  red: "#DC2626",
};

export default function BikeRiderTrackingScreen({ navigation, route }) {
  const { ride: initialRide, patient, autoCompleted } = route.params || {};

  const mapRef = useRef(null);
  const fullMapRef = useRef(null);
  const mapFittedOnceRef = useRef(false);
  const routeCoordinatesRef = useRef([]);
  const completedAlertShownRef = useRef(false);
  // ✅ NEW: timer ref for tracksViewChanges (ambulance-style)
  const tracksTimerRef = useRef(null);

  useEffect(() => {
    if (autoCompleted && !completedAlertShownRef.current) {
      completedAlertShownRef.current = true;
      Alert.alert(
        "Payment Done Successfully",
        "Your bike ride payment has been confirmed and the ride is completed.",
        [
          {
            text: "OK",
            onPress: () => {
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: "PatientMenu", params: { patient, preventRedirect: true } }],
                })
              );
            },
          },
        ]
      );
    }
  }, [autoCompleted, navigation, patient]);


  const [ride, setRide] = useState(initialRide || null);
  const [loading, setLoading] = useState(false);
  const [eta, setEta] = useState("Calculating...");
  const [distance, setDistance] = useState("Calculating...");
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  // ✅ Ambulance-style snapped marker coordinate: route ke first/nearest point par marker rahega.
  const [snappedRiderCoord, setSnappedRiderCoord] = useState(null);
  // ✅ NEW: bearing for marker rotation (ambulance-style)
  const [calculatedHeading, setCalculatedHeading] = useState(0);
  // ✅ NEW: tracksViewChanges management (ambulance-style)
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  const rideId = ride?._id || ride?.id || initialRide?._id || initialRide?.id;

  const passengerName =
    patient?.fullName || ride?.patientInfo?.name || "Patient";

  const riderName =
    ride?.rider?.fullName || ride?.riderInfo?.name || "Bike Rider";

  const riderPhone = ride?.rider?.phone || ride?.riderInfo?.phone || "N/A";

  const getCleanShortAddress = (
    address,
    fallback = "Location not available"
  ) => {
    const raw = String(address || "").trim();

    if (!raw) return fallback;

    let parts = raw
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    if (parts.length > 1 && /^[A-Z0-9]{4,}\+[A-Z0-9]{2,}/i.test(parts[0])) {
      parts = parts.slice(1);
    }

    parts = parts.filter((part) => part.toLowerCase() !== "pakistan");

    return parts.slice(0, 3).join(", ") || raw;
  };

  const getLocationDisplayName = (
    location,
    fallback = "Location not available",
    options = {}
  ) => {
    const name = String(location?.name || "").trim();
    const address = String(location?.address || "").trim();

    const generic =
      name.toLowerCase() === "current location" ||
      name.toLowerCase() === "my location";

    if (name && !generic) return name;

    if (generic && options.useAddressForCurrent && address) {
      return getCleanShortAddress(address, fallback);
    }

    if (name) return name;
    if (address) return getCleanShortAddress(address, fallback);

    return fallback;
  };

  const pickupName = getLocationDisplayName(
    ride?.pickupLocation,
    "Pickup location not available",
    { useAddressForCurrent: true }
  );

  const destinationName = getLocationDisplayName(
    ride?.dropoffLocation,
    "Destination not available"
  );
  const normalizedStatus = String(ride?.status || "")
    .toLowerCase()
    .replace("-", "_");

  const isAccepted = normalizedStatus === "accepted";
  const isArrivedAtPatient =
    normalizedStatus === "arrived_at_patient" ||
    normalizedStatus === "arrived_at_pickup";
  const isNavigatingToHospital =
    normalizedStatus === "navigating_to_hospital" || normalizedStatus === "in_progress";
  const isPaymentPending = normalizedStatus === "payment_pending";

  const getStatusText = () => {
    if (isAccepted) return "Bike rider is coming to your pickup location";
    if (isArrivedAtPatient) return "Reached Patient Location";
    if (isNavigatingToHospital) return "Navigating to Hospital";
    if (isPaymentPending) return "Payment Pending";
    if (normalizedStatus === "completed") return "Ride Completed";
    if (normalizedStatus === "cancelled") return "Ride Cancelled";
    return ride?.status || "Checking...";
  };

  const getBadgeText = () => {
    if (isAccepted) return "Accepted";
    if (isArrivedAtPatient) return "Arrived";
    if (isNavigatingToHospital) return "To Hospital";
    if (isPaymentPending) return "Payment";
    if (normalizedStatus === "completed") return "Completed";
    return "Bike Ride";
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

  const pickupCoord = getCoordFromLocation(ride?.pickupLocation);

  const destinationCoord = getCoordFromLocation(ride?.dropoffLocation);

  const riderCoord =
    getCoordFromLocation(ride?.riderLiveLocation) ||
    getCoordFromLocation(ride?.rider?.location) ||
    getCoordFromLocation(ride?.riderLocation);

  const calculateDistanceMeters = (lat1, lng1, lat2, lng2) => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const getNearestRoutePoint = (location) => {
    if (!location || !routeCoordinatesRef.current?.length) {
      return location;
    }

    let nearestPoint = routeCoordinatesRef.current[0];
    let shortestDistance = Number.MAX_VALUE;

    routeCoordinatesRef.current.forEach((point) => {
      const distance = calculateDistanceMeters(
        location.latitude,
        location.longitude,
        point.latitude,
        point.longitude
      );

      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearestPoint = point;
      }
    });

    return nearestPoint;
  };

  // ✅ NEW: Calculate bearing from route coords (ambulance-style)
  const updateRouteBearing = (coords) => {
    if (!coords || coords.length < 2) return;

    const p1 = coords[0];
    const p2 = coords[1];

    const toRad = (val) => (val * Math.PI) / 180;

    const lat1 = toRad(p1.latitude);
    const lat2 = toRad(p2.latitude);
    const dLng = toRad(p2.longitude - p1.longitude);

    const x = Math.sin(dLng) * Math.cos(lat2);
    const y =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

    const bearing = (Math.atan2(x, y) * (180 / Math.PI) + 360) % 360;
    setCalculatedHeading(bearing);
  };

  // ✅ NEW: Flash tracksViewChanges briefly (ambulance-style)
  const flashTracksViewChanges = () => {
    setTracksViewChanges(true);

    if (tracksTimerRef.current) {
      clearTimeout(tracksTimerRef.current);
    }

    tracksTimerRef.current = setTimeout(() => {
      setTracksViewChanges(false);
    }, 500);
  };

  const fitToRoute = (coords, ref = mapRef) => {
    if (!coords || coords.length < 2 || !ref.current) return;

    ref.current.fitToCoordinates(coords, {
      edgePadding: {
        top: 80,
        right: 60,
        bottom: 80,
        left: 60,
      },
      animated: true,
    });
  };

  const loadRideStatus = async (silent = true) => {
    try {
      if (!rideId) return;

      if (!silent) setLoading(true);

      const latestRide = await fetchBikeRideStatus(rideId);
      setRide(latestRide);

      if (latestRide?.status === "cancelled") {
        Alert.alert("Ride Cancelled", "Bike rider cancelled this ride.", [
          {
            text: "OK",
            onPress: () => {
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: "PatientMenu", params: { patient } }],
                })
              );
            },
          },
        ]);
      }

      if (latestRide?.status === "completed" && !completedAlertShownRef.current) {
        completedAlertShownRef.current = true;
        Alert.alert(
          "Payment Done Successfully",
          "Your bike ride payment has been confirmed and the ride is completed.",
          [
            {
              text: "OK",
              onPress: () => {
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: "PatientMenu", params: { patient, preventRedirect: true } }],
                  })
                );
              },
            },
          ]
        );
      }
    } catch (error) {
      console.log("Bike rider tracking polling error:", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRideStatus(false);

    const timer = setInterval(() => {
      loadRideStatus(true);
    }, 2500);

    return () => {
      clearInterval(timer);
      // ✅ Cleanup timer on unmount
      if (tracksTimerRef.current) {
        clearTimeout(tracksTimerRef.current);
      }
    };
  }, [rideId]);

  useEffect(() => {
    mapFittedOnceRef.current = false;
    setSnappedRiderCoord(null);
    routeCoordinatesRef.current = [];
  }, [
    riderCoord?.latitude,
    riderCoord?.longitude,
    pickupCoord?.latitude,
    pickupCoord?.longitude,
    destinationCoord?.latitude,
    destinationCoord?.longitude,
    normalizedStatus,
  ]);

  // ✅ Same ambulance-style patient tracking logic:
  // Blue route rider live location se patient pickup tak banti hai,
  // aur marker route ke first coordinate par snap hota hai taake blue line se bahar na jaye.
  const onDirectionsReady = (result, isFull = false) => {
    routeCoordinatesRef.current = result.coordinates || [];
    const duration = Math.ceil(result.duration);
    const dist = Number(result.distance).toFixed(2);

    setEta(`${duration} mins`);
    setDistance(`${dist} km`);

    if (result.coordinates && result.coordinates.length >= 2) {
      const p1 = result.coordinates[0];

      setSnappedRiderCoord({
        latitude: p1.latitude,
        longitude: p1.longitude,
      });

      updateRouteBearing(result.coordinates);
      flashTracksViewChanges();
    }

    if (!mapFittedOnceRef.current && result.coordinates?.length > 0) {
      fitToRoute(result.coordinates, isFull ? fullMapRef : mapRef);
      mapFittedOnceRef.current = true;
    }
  };

  const renderDroneBikeIcon = (size = 46) => {
    const scale = size / 46;

    return (
      <View style={[styles.droneBikeWrap, { width: size, height: size }]}> 
        <View
          style={[
            styles.droneBikeShadow,
            {
              width: 30 * scale,
              height: 38 * scale,
              borderRadius: 15 * scale,
            },
          ]}
        />

        <View
          style={[
            styles.droneBikeFrontWheel,
            {
              width: 8 * scale,
              height: 12 * scale,
              borderRadius: 4 * scale,
              top: 2 * scale,
            },
          ]}
        />

        <View
          style={[
            styles.droneBikeHandlebar,
            {
              width: 26 * scale,
              height: 4 * scale,
              top: 10 * scale,
              borderRadius: 2 * scale,
            },
          ]}
        />

        <View
          style={[
            styles.droneBikeBody,
            {
              width: 16 * scale,
              height: 30 * scale,
              borderRadius: 8 * scale,
              top: 8 * scale,
            },
          ]}
        >
          <View
            style={[
              styles.droneBikeSeat,
              {
                width: 10 * scale,
                height: 12 * scale,
                borderRadius: 5 * scale,
                bottom: 5 * scale,
              },
            ]}
          />
          <View
            style={[
              styles.droneBikeTank,
              {
                width: 8 * scale,
                height: 8 * scale,
                borderRadius: 4 * scale,
                top: 6 * scale,
              },
            ]}
          />
        </View>

        <View
          style={[
            styles.droneBikeRearWheel,
            {
              width: 9 * scale,
              height: 14 * scale,
              borderRadius: 4.5 * scale,
              bottom: 1 * scale,
            },
          ]}
        />
      </View>
    );
  };

  const getRouteDestinationCoord = () => {
    if (isNavigatingToHospital) return destinationCoord;
    return pickupCoord;
  };

  const getRouteDestinationTitle = () => {
    if (isNavigatingToHospital) return "Hospital / Destination";
    return "Patient Pickup Location";
  };

  // Route sirf active travelling stages mein draw hogi.
  // payment_pending / completed par route remove rahegi kyunki rider hospital pohanch chuka hota hai.
  const shouldDrawRoute = isAccepted || isNavigatingToHospital;

  const renderMap = (isFull = false) => {
    const routeDestinationCoord = getRouteDestinationCoord();

    if (!riderCoord || !routeDestinationCoord) {
      return (
        <View style={styles.mapPlaceholder}>
          <ActivityIndicator size="small" color={COLORS.brand} />
          <Text style={styles.mapPlaceholderTitle}>Loading Map...</Text>
          <Text style={styles.mapPlaceholderSub}>
            Waiting for bike rider live location / destination
          </Text>
        </View>
      );
    }

    // ✅ Ambulance-style marker behavior:
    // Marker blue route ke nearest/first point par rahega, raw GPS se bahar jump nahi karega.
    const markerCoord =
      snappedRiderCoord ||
      getNearestRoutePoint(riderCoord) ||
      riderCoord;

    return (
      <MapView
        ref={isFull ? fullMapRef : mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: riderCoord.latitude,
          longitude: riderCoord.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        }}
      >
        {pickupCoord && (isAccepted || isArrivedAtPatient) && (
          <Marker
            coordinate={pickupCoord}
            title="Your Pickup Location"
            description={pickupName}
          >
            <View style={styles.patientMarker}>
              <Text style={styles.patientMarkerText}>👤</Text>
            </View>
          </Marker>
        )}

        {(isNavigatingToHospital || isPaymentPending || normalizedStatus === "completed") &&
          destinationCoord && (
            <Marker
              coordinate={destinationCoord}
              title="Hospital / Destination"
              description={destinationName}
            >
              <View style={styles.destinationMarker}>
                <Text style={styles.destinationMarkerText}>🏥</Text>
              </View>
            </Marker>
          )}

        {/* ✅ Bike marker ambulance-style blue route par snap rahega, drone-view icon ke sath. */}
        <Marker
          coordinate={markerCoord}
          title="Bike Rider"
          description={riderName}
          flat={true}
          anchor={{ x: 0.5, y: 0.5 }}
          rotation={calculatedHeading}
          tracksViewChanges={tracksViewChanges}
        >
          {renderDroneBikeIcon(isFull ? 54 : 46)}
        </Marker>

        {shouldDrawRoute && (
          <MapViewDirections
            origin={riderCoord}
            destination={routeDestinationCoord}
            apikey={GOOGLE_MAPS_APIKEY}
            strokeWidth={isFull ? 8 : 6}
            strokeColor={COLORS.brand}
            mode="DRIVING"
            optimizeWaypoints={true}
            onReady={(result) => onDirectionsReady(result, isFull)}
            onError={(error) => {
              console.log("Bike rider tracking directions error:", error);
            }}
          />
        )}
      </MapView>
    );
  };

  const handleMarkAsArrived = async () => {
    try {
      if (!rideId) return;
      setLoading(true);

      const updatedRide = await updateBikeRideStatus({
        rideId,
        status: "arrived_at_patient",
      });

      setRide(updatedRide);
      mapFittedOnceRef.current = false;
      Alert.alert("Arrived", "Bike rider has reached your pickup location.");
    } catch (error) {
      Alert.alert("Error", error.message || "Could not mark ride as arrived.");
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToHospital = async () => {
    try {
      if (!rideId) return;

      if (!destinationCoord) {
        Alert.alert(
          "Destination Missing",
          "Hospital / destination coordinates are not available for this ride."
        );
        return;
      }

      setLoading(true);

      const updatedRide = await updateBikeRideStatus({
        rideId,
        status: "navigating_to_hospital",
      });

      setRide(updatedRide);
      setSnappedRiderCoord(null);
      routeCoordinatesRef.current = [];
      mapFittedOnceRef.current = false;
      Alert.alert("Navigation Started", "Now navigating to hospital / destination.");
    } catch (error) {
      Alert.alert("Error", error.message || "Could not start hospital navigation.");
    } finally {
      setLoading(false);
    }
  };

  const handleReachedHospital = async () => {
    try {
      if (!rideId) return;
      setLoading(true);

      const updatedRide = await markBikeRidePaymentPending({
        rideId,
        riderId: ride?.rider?.id || ride?.rider?._id || ride?.riderInfo?.id || ride?.riderInfo?._id,
      });

      setRide(updatedRide);
      setSnappedRiderCoord(null);
      routeCoordinatesRef.current = [];
      mapFittedOnceRef.current = false;

      Alert.alert(
        "Payment Pending",
        "Ride reached hospital. Please pay the bike rider."
      );
    } catch (error) {
      Alert.alert(
        "Error",
        error.message || "Could not move bike ride to payment pending."
      );
    } finally {
      setLoading(false);
    }
  };

  const getPrimaryActionText = () => {
    if (loading) return "Please wait...";
    if (isAccepted) return "Mark as Arrived";
    if (isArrivedAtPatient) return "Navigate to Hospital";
    if (isNavigatingToHospital) return "Reached Hospital";
    if (isPaymentPending) return "Refresh Payment Status";
    return "Refresh Tracking";
  };

  const handlePrimaryAction = () => {
    if (isAccepted) return handleMarkAsArrived();
    if (isArrivedAtPatient) return handleNavigateToHospital();
    if (isNavigatingToHospital) return handleReachedHospital();
    return loadRideStatus(false);
  };

  const goBackMenu = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: "PatientMenu",
            params: {
              patient,
              preventRedirect: true,
            },
          },
        ],
      })
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.brand} />

      <Modal
        visible={isMapFullscreen}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setIsMapFullscreen(false)}
      >
        <View style={styles.fullscreen}>
          {renderMap(true)}

          <TouchableOpacity
            style={styles.closeFullBtn}
            onPress={() => setIsMapFullscreen(false)}
            activeOpacity={0.85}
          >
            <Text style={styles.closeFullText}>✕ Close</Text>
          </TouchableOpacity>

          <View style={styles.fullEtaBadge}>
            <Text style={styles.fullEtaText}>
              Bike Rider • {distance} • {eta}
            </Text>
          </View>
        </View>
      </Modal>

      <View style={styles.topbar}>
        <View>
          <Text style={styles.topTitle}>Bike Rider Tracking</Text>
          <Text style={styles.topSub}>{passengerName}</Text>
        </View>

        <TouchableOpacity style={styles.backBtn} onPress={goBackMenu}>
          <Text style={styles.backText}>Menu</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Request Status</Text>
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Bike Rider Details</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{getBadgeText()}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.label}>Rider Name</Text>
          <Text style={styles.value}>{riderName}</Text>

          <View style={styles.phoneRow}>
            <Text style={styles.phoneIcon}>📞</Text>
            <Text style={styles.phoneText}>{riderPhone}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Live Location & Route</Text>

          <View style={styles.divider} />

          <View style={styles.mapBox}>
            {renderMap(false)}

            <TouchableOpacity
              style={styles.fullBtn}
              onPress={() => setIsMapFullscreen(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.fullBtnText}>⛶</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.locationRow}>
            <Text style={styles.locationIcon}>📍</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.locationLabel}>Your Pickup Location</Text>
              <Text style={styles.locationValue} numberOfLines={2}>
                {pickupName}
              </Text>
              <Text style={styles.locationSub}>
                {isAccepted ? "Blue route shows rider path to you" : isArrivedAtPatient ? "Bike rider has reached your location" : isPaymentPending ? "Ride reached hospital. Please complete payment." : "Pickup completed"}
              </Text>
            </View>
          </View>

          <View style={styles.locationRow}>
            <Text style={styles.locationIcon}>➤</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.locationLabel}>Destination</Text>
              <Text style={styles.locationValue} numberOfLines={2}>
                {destinationName}
              </Text>
            </View>
          </View>
        </View>


        {isPaymentPending && (
          <View style={styles.paymentPendingBox}>
            <Text style={styles.paymentPendingTitle}>Payment Pending</Text>
            {ride?.fareAmount !== undefined && ride?.fareAmount !== null ? (
              <Text style={styles.paymentPendingText}>
                Please pay Rs. {ride.fareAmount} to bike rider.
              </Text>
            ) : (
              <Text style={styles.paymentPendingText}>
                Bike rider is preparing your payment amount. Please wait.
              </Text>
            )}
            <Text style={styles.paymentPendingSub}>
              After bike rider confirms payment, this ride will be completed automatically.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.refreshBtn, loading && { opacity: 0.65 }]}
          onPress={handlePrimaryAction}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.refreshText}>{getPrimaryActionText()}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  topbar: {
    height: 92,
    backgroundColor: COLORS.brand,
    paddingHorizontal: 16,
    paddingTop: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  topTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },

  topSub: {
    color: "#DBEAFE",
    fontSize: 14,
    marginTop: 2,
  },

  backBtn: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  backText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },

  container: {
    padding: 14,
    paddingBottom: 28,
  },

  statusCard: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },

  statusLabel: {
    color: COLORS.sub,
    fontSize: 13,
    fontWeight: "800",
  },

  statusText: {
    color: COLORS.brandDark,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 5,
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 14,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  cardTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
  },

  badge: {
    backgroundColor: "#DBEAFE",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  badgeText: {
    color: COLORS.brandDark,
    fontSize: 12,
    fontWeight: "900",
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },

  label: {
    color: COLORS.sub,
    fontSize: 13,
    fontWeight: "800",
  },

  value: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 5,
  },

  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },

  phoneIcon: {
    fontSize: 18,
    marginRight: 8,
  },

  phoneText: {
    color: COLORS.brandDark,
    fontSize: 17,
    fontWeight: "900",
  },

  mapBox: {
    height: 260,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
  },

  map: {
    ...StyleSheet.absoluteFillObject,
  },

  mapPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  mapPlaceholderTitle: {
    color: COLORS.sub,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 8,
  },

  mapPlaceholderSub: {
    color: COLORS.sub,
    fontSize: 12,
    marginTop: 4,
  },

  fullBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
  },

  fullBtnText: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "900",
  },

  droneBikeWrap: {
    alignItems: "center",
    justifyContent: "center",
  },

  droneBikeShadow: {
    position: "absolute",
    backgroundColor: "rgba(15, 23, 42, 0.18)",
    transform: [{ translateY: 2 }],
  },

  droneBikeFrontWheel: {
    position: "absolute",
    backgroundColor: "#0F172A",
    zIndex: 4,
  },

  droneBikeRearWheel: {
    position: "absolute",
    backgroundColor: "#0F172A",
    zIndex: 4,
  },

  droneBikeHandlebar: {
    position: "absolute",
    backgroundColor: "#0F172A",
    zIndex: 5,
  },

  droneBikeBody: {
    position: "absolute",
    backgroundColor: COLORS.brand,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    elevation: 8,
    zIndex: 6,
  },

  droneBikeSeat: {
    position: "absolute",
    backgroundColor: "#111827",
  },

  droneBikeTank: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.92)",
  },

  patientMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 3,
    borderColor: COLORS.green,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
  },

  patientMarkerText: {
    fontSize: 24,
  },

  destinationMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 3,
    borderColor: COLORS.red,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
  },

  destinationMarkerText: {
    fontSize: 22,
  },

  locationRow: {
    flexDirection: "row",
    marginTop: 14,
  },

  locationIcon: {
    width: 34,
    fontSize: 21,
  },

  locationLabel: {
    color: COLORS.sub,
    fontSize: 13,
    fontWeight: "900",
  },

  locationValue: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 4,
  },

  locationSub: {
    color: COLORS.sub,
    fontSize: 12,
    marginTop: 4,
  },


  paymentPendingBox: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },

  paymentPendingTitle: {
    color: "#92400E",
    fontSize: 17,
    fontWeight: "900",
  },

  paymentPendingText: {
    color: "#78350F",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 7,
  },

  paymentPendingSub: {
    color: "#92400E",
    fontSize: 12,
    marginTop: 6,
    lineHeight: 18,
  },

  refreshBtn: {
    height: 52,
    borderRadius: 10,
    backgroundColor: COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
  },

  refreshText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },

  fullscreen: {
    flex: 1,
    backgroundColor: "#000000",
  },

  closeFullBtn: {
    position: "absolute",
    top: 45,
    right: 16,
    height: 40,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.96)",
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
  },

  closeFullText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "900",
  },

  fullEtaBadge: {
    position: "absolute",
    left: 16,
    bottom: 30,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.96)",
    paddingHorizontal: 14,
    paddingVertical: 9,
    elevation: 5,
  },

  fullEtaText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "900",
  },
});