// screens/MedicineOrderTrackingScreen.jsx

import React, { useEffect, useRef, useState } from "react";
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { CommonActions } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { buildUrl, GOOGLE_MAPS_APIKEY } from "../services/apiConfig";

const COLORS = {
  bg: "#F5FAF7",
  white: "#FFFFFF",
  text: "#0F172A",
  sub: "#64748B",
  green: "#16A34A",
  greenDark: "#15803D",
  greenSoft: "#ECFDF5",
  greenBorder: "#BBF7D0",
  blue: "#2563EB",
  blueSoft: "#EFF6FF",
  blueBorder: "#BFDBFE",
  border: "#E5E7EB",
  danger: "#DC2626",
};

const normalizeStatus = (status) => String(status || "").toLowerCase().replace(/-/g, "_");

export default function MedicineOrderTrackingScreen({ navigation, route }) {
  const { order: initialOrder, patient } = route?.params || {};

  const mapRef = useRef(null);
  const fullMapRef = useRef(null);
  const mapFittedOnceRef = useRef(false);
  const routeCoordinatesRef = useRef([]);
  const tracksTimerRef = useRef(null);
  const paymentDoneAlertShownRef = useRef(false);

  const [order, setOrder] = useState(initialOrder || null);
  const [loading, setLoading] = useState(false);
  const [resolvedDeliveryAddress, setResolvedDeliveryAddress] = useState("");
  const [resolvedPharmacyAddress, setResolvedPharmacyAddress] = useState("");
  const [eta, setEta] = useState("Calculating...");
  const [distance, setDistance] = useState("Calculating...");
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [snappedRiderCoord, setSnappedRiderCoord] = useState(null);
  const [calculatedHeading, setCalculatedHeading] = useState(0);
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  const orderId = order?._id || order?.id || initialOrder?._id || initialOrder?.id;
  const status = normalizeStatus(order?.status || "pharmacy_processing");

  const isPharmacyProcessing = status === "pharmacy_processing";
  const isApproved = status === "dispatching";
  const isDeliveringToPharmacy = status === "delivering";
  const isReachedPharmacy = status === "reached_pharmacy";
  const isNavigatingToPatient = status === "navigating_to_patient";
  const isPaymentPending = status === "payment_pending";
  const isDelivered = status === "delivered";
  const isCancelled = status === "cancelled";

  const patientName =
    patient?.fullName || order?.patientInfo?.name || order?.patient?.fullName || "Patient";
  const patientPhone =
    patient?.phone || order?.patientInfo?.phone || order?.patient?.phone || "N/A";

  const riderName = order?.riderInfo?.name || order?.rider?.fullName || "Delivery Rider";
  const riderPhone = order?.riderInfo?.phone || order?.rider?.phone || "N/A";
  const bikeNumber = order?.riderInfo?.bikeNumber || order?.rider?.bikeNumber || "N/A";

  const pharmacyName = order?.pharmacyInfo?.name || order?.pharmacy?.pharmacyName || "Pharmacy not assigned yet";
  const pharmacyPhone = order?.pharmacyInfo?.phone || order?.pharmacy?.phone || "N/A";

  const isBadAddress = (value) => {
    const text = String(value || "").trim().toLowerCase();
    return (
      !text ||
      text === "address not available" ||
      text === "delivery location not available" ||
      text === "pharmacy location not available" ||
      text === "current gps location" ||
      text === "current location" ||
      text.startsWith("lat ")
    );
  };

  const getCoordFromLocation = (location) => {
    const coords = location?.coordinates;
    const lat = location?.lat ?? location?.latitude ?? (Array.isArray(coords) ? coords[1] : null);
    const lng = location?.lng ?? location?.longitude ?? (Array.isArray(coords) ? coords[0] : null);
    const nLat = Number(lat);
    const nLng = Number(lng);
    if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) return null;
    if (nLat === 0 && nLng === 0) return null;
    return { latitude: nLat, longitude: nLng };
  };

  const deliveryCoord = getCoordFromLocation(order?.deliveryLocation);
  const pharmacyCoord = getCoordFromLocation(order?.pharmacy?.location);
  const riderCoord =
    getCoordFromLocation(order?.riderLiveLocation) ||
    getCoordFromLocation(order?.rider?.location) ||
    getCoordFromLocation(order?.riderLocation);

  const rawDeliveryAddress = order?.deliveryLocation?.address;
  const rawPharmacyAddress = order?.pharmacyInfo?.address || order?.pharmacy?.address;

  const deliveryAddress = !isBadAddress(rawDeliveryAddress)
    ? rawDeliveryAddress
    : resolvedDeliveryAddress || "Address loading...";

  const pharmacyAddress = !isBadAddress(rawPharmacyAddress)
    ? rawPharmacyAddress
    : resolvedPharmacyAddress || "Pharmacy location loading...";

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
      console.log("Medicine tracking reverse geocode error:", error.message);
    }
    return "";
  };

  const getStatusText = () => {
    if (isPharmacyProcessing) return "Pharmacy Processing";
    if (isApproved) return "Approved";
    if (isDeliveringToPharmacy) return "Rider Assigned";
    if (isReachedPharmacy) return "Reached Pharmacy";
    if (isNavigatingToPatient) return "Navigating to Patient Location";
    if (isPaymentPending) return "Payment Pending";
    if (isDelivered) return "Delivered";
    if (isCancelled) return "Cancelled";
    return order?.status || "Checking...";
  };

  const getProgressWidth = () => {
    if (isPharmacyProcessing) return "20%";
    if (isApproved) return "40%";
    if (isDeliveringToPharmacy) return "55%";
    if (isReachedPharmacy) return "65%";
    if (isNavigatingToPatient) return "80%";
    if (isPaymentPending) return "90%";
    if (isDelivered) return "100%";
    if (isCancelled) return "100%";
    return "20%";
  };

  const loadOrderStatus = async (silent = true) => {
    try {
      if (!orderId) return;
      if (!silent) setLoading(true);

      const res = await fetch(buildUrl(`/api/medicine-orders/status/${orderId}`));
      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.success && data?.order) {
        const latestOrder = data.order;
        setOrder(latestOrder);

        const latestStatus = normalizeStatus(latestOrder?.status);

        // ✅ BikeRideTrackingScreen jaisa one-time success popup:
        // Rider jab Confirm Payment Received press karega, backend status delivered ho jayega.
        // Patient side par polling se delivered milte hi sirf aik dafa alert show hoga.
        if (latestStatus === "delivered" && !paymentDoneAlertShownRef.current) {
          const completedOrderId = latestOrder?._id || latestOrder?.id || orderId;
          const seenKey = completedOrderId
            ? `MEDICINE_PAYMENT_DONE_SEEN_${completedOrderId}`
            : null;
          const alreadySeen = seenKey ? await AsyncStorage.getItem(seenKey) : null;

          if (!alreadySeen) {
            paymentDoneAlertShownRef.current = true;
            if (seenKey) await AsyncStorage.setItem(seenKey, "true");

            Alert.alert(
              "Payment Done Successfully",
              "Your medicine delivery payment has been confirmed and the order is completed.",
              [
                {
                  text: "OK",
                  onPress: () => {
                    navigation.dispatch(
                      CommonActions.reset({
                        index: 0,
                        routes: [
                          {
                            name: "PatientMenu",
                            params: { patient, preventRedirect: true },
                          },
                        ],
                      })
                    );
                  },
                },
              ]
            );
          }
        }
      }
    } catch (error) {
      console.log("Medicine order status fetch error:", error.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const resolveMissingAddresses = async () => {
      if (isBadAddress(order?.deliveryLocation?.address) && deliveryCoord) {
        const address = await reverseGeocodeAddress(deliveryCoord);
        if (!cancelled && address) setResolvedDeliveryAddress(address);
      }

      if (isBadAddress(rawPharmacyAddress) && pharmacyCoord) {
        const address = await reverseGeocodeAddress(pharmacyCoord);
        if (!cancelled && address) setResolvedPharmacyAddress(address);
      }
    };

    resolveMissingAddresses();

    return () => {
      cancelled = true;
    };
  }, [order?._id, order?.id, order?.deliveryLocation?.address, order?.pharmacyInfo?.address, order?.pharmacy?.address]);

  useEffect(() => {
    loadOrderStatus(false);
    const timer = setInterval(() => loadOrderStatus(true), 2500);
    return () => {
      clearInterval(timer);
      if (tracksTimerRef.current) clearTimeout(tracksTimerRef.current);
    };
  }, [orderId]);

  useEffect(() => {
    mapFittedOnceRef.current = false;
    routeCoordinatesRef.current = [];
    setSnappedRiderCoord(null);
  }, [riderCoord?.latitude, riderCoord?.longitude, deliveryCoord?.latitude, deliveryCoord?.longitude, status]);

  const goBackToMenu = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "PatientMenu", params: { patient, preventRedirect: true } }],
      })
    );
  };

  const handleCancelOrder = () => {
    if (!orderId) {
      Alert.alert("Error", "Order ID not found.");
      return;
    }

    if (isDelivered || isCancelled) {
      return;
    }

    Alert.alert(
      "Cancel Order",
      "Are you sure you want to cancel this medicine order?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);

              const res = await fetch(buildUrl("/api/medicine-orders/cancel"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  orderId,
                  patientId: patient?.id || patient?._id || order?.patient?._id || order?.patient,
                }),
              });

              const data = await res.json().catch(() => ({}));

              if (!res.ok || data?.success === false) {
                throw new Error(data?.message || "Failed to cancel medicine order");
              }

              const cancelledOrder = data?.order || data?.delivery;
              if (cancelledOrder) setOrder(cancelledOrder);

              Alert.alert("Order Cancelled", "Your medicine order has been cancelled.", [
                {
                  text: "OK",
                  onPress: () => {
                    navigation.dispatch(
                      CommonActions.reset({
                        index: 0,
                        routes: [
                          {
                            name: "PatientMenu",
                            params: { patient, preventRedirect: true },
                          },
                        ],
                      })
                    );
                  },
                },
              ]);
            } catch (error) {
              Alert.alert("Error", error.message || "Could not cancel order.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const calculateDistanceMeters = (lat1, lng1, lat2, lng2) => {
    const R = 6371000;
    const dLat = ((Number(lat2) - Number(lat1)) * Math.PI) / 180;
    const dLng = ((Number(lng2) - Number(lng1)) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((Number(lat1) * Math.PI) / 180) *
        Math.cos((Number(lat2) * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const getNearestRoutePoint = (location) => {
    if (!location || !routeCoordinatesRef.current?.length) return location;

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

  const flashTracksViewChanges = () => {
    setTracksViewChanges(true);
    if (tracksTimerRef.current) clearTimeout(tracksTimerRef.current);
    tracksTimerRef.current = setTimeout(() => {
      setTracksViewChanges(false);
    }, 500);
  };

  const fitToRoute = (coords, ref = mapRef) => {
    if (!coords || coords.length < 2 || !ref.current) return;
    ref.current.fitToCoordinates(coords, {
      edgePadding: { top: 80, right: 55, bottom: 80, left: 55 },
      animated: true,
    });
  };

  const onDirectionsReady = (result, isFull = false) => {
    routeCoordinatesRef.current = result.coordinates || [];
    const duration = Math.ceil(Number(result.duration || 0));
    const dist = Number(result.distance || 0).toFixed(2);
    setEta(`${duration} mins`);
    setDistance(`${dist} km`);

    // BikeRideTrackingScreen jaisa: rider marker route ke first/nearest point par snap rahega,
    // isliye marker blue line se bahar nahi dikhega.
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
      <View style={[s.droneBikeWrap, { width: size, height: size }]}>
        <View
          style={[
            s.droneBikeShadow,
            {
              width: 30 * scale,
              height: 38 * scale,
              borderRadius: 15 * scale,
            },
          ]}
        />

        <View
          style={[
            s.droneBikeFrontWheel,
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
            s.droneBikeHandlebar,
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
            s.droneBikeBody,
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
              s.droneBikeSeat,
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
              s.droneBikeTank,
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
            s.droneBikeRearWheel,
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

  const renderBikeMarker = (isFull = false) => {
    if (!riderCoord) return null;

    const markerCoord =
      snappedRiderCoord || getNearestRoutePoint(riderCoord) || riderCoord;

    return (
      <Marker
        coordinate={markerCoord}
        title="Delivery Rider"
        description={riderName}
        flat={true}
        anchor={{ x: 0.5, y: 0.5 }}
        rotation={calculatedHeading}
        tracksViewChanges={tracksViewChanges}
        zIndex={5}
      >
        {renderDroneBikeIcon(isFull ? 54 : 46)}
      </Marker>
    );
  };

  const renderPatientMarker = () => {
    if (!deliveryCoord) return null;
    return (
      <Marker coordinate={deliveryCoord} title="Patient Delivery Location" description={deliveryAddress}>
        <View style={s.patientMarker}>
          <Text style={s.patientMarkerText}>👤</Text>
        </View>
      </Marker>
    );
  };

  const renderMap = (isFull = false) => {
    if (!riderCoord || !deliveryCoord || !isNavigatingToPatient) {
      return (
        <View style={s.mapPlaceholder}>
          <ActivityIndicator size="small" color={COLORS.green} />
          <Text style={s.mapPlaceholderTitle}>Live map will appear when rider starts patient delivery</Text>
          <Text style={s.mapPlaceholderSub}>Waiting for rider location and patient delivery location</Text>
        </View>
      );
    }

    return (
      <MapView
        ref={isFull ? fullMapRef : mapRef}
        provider={PROVIDER_GOOGLE}
        style={s.map}
        initialRegion={{
          latitude: riderCoord.latitude,
          longitude: riderCoord.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        }}
      >
        {renderBikeMarker(isFull)}
        {renderPatientMarker()}
        <MapViewDirections
          key={`medicine-patient-route-${riderCoord.latitude}-${riderCoord.longitude}-${deliveryCoord.latitude}-${deliveryCoord.longitude}-${isFull ? "full" : "small"}`}
          origin={riderCoord}
          destination={deliveryCoord}
          apikey={GOOGLE_MAPS_APIKEY}
          strokeWidth={isFull ? 8 : 6}
          strokeColor={COLORS.blue}
          mode="DRIVING"
          optimizeWaypoints={true}
          onReady={(result) => onDirectionsReady(result, isFull)}
          onError={(error) => console.log("Medicine patient tracking directions error:", error)}
        />
      </MapView>
    );
  };

  const renderOrderSummaryItems = () => {
    const medicineItems = Array.isArray(order?.medicineItems) ? order.medicineItems : [];
    const equipmentItems = Array.isArray(order?.equipmentItems) ? order.equipmentItems : [];

    if (medicineItems.length === 0 && equipmentItems.length === 0) {
      return <Text style={s.summaryEmpty}>No medicine/equipment items available.</Text>;
    }

    return (
      <>
        {medicineItems.length > 0 && (
          <View style={s.summaryBlock}>
            <Text style={s.summaryLabel}>Medicines</Text>
            {medicineItems.map((item, index) => (
              <Text key={`medicine-${index}`} style={s.summaryItem}>• {item}</Text>
            ))}
          </View>
        )}
        {equipmentItems.length > 0 && (
          <View style={s.summaryBlock}>
            <Text style={s.summaryLabel}>Medical Equipment</Text>
            {equipmentItems.map((item, index) => (
              <Text key={`equipment-${index}`} style={s.summaryItem}>• {item}</Text>
            ))}
          </View>
        )}
      </>
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <Modal
        visible={isMapFullscreen}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setIsMapFullscreen(false)}
      >
        <View style={s.fullscreen}>
          {renderMap(true)}
          <TouchableOpacity style={s.closeFullBtn} onPress={() => setIsMapFullscreen(false)}>
            <Text style={s.closeFullText}>✕ Close</Text>
          </TouchableOpacity>
          <View style={s.fullEtaBadge}>
            <Text style={s.fullEtaText}>Delivery Rider • {distance} • {eta}</Text>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={s.container}>
        <TouchableOpacity style={s.backBtn} onPress={goBackToMenu}>
          <Text style={s.backText}>← Back to Menu</Text>
        </TouchableOpacity>

        <View style={s.headerCard}>
          <Text style={s.headerTitle}>Medicine Order Service</Text>
          <Text style={s.headerSub}>Order medicines and medical equipment</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Patient Details</Text>
          <Text style={s.line}><Text style={s.bold}>Name: </Text>{patientName}</Text>
          <Text style={s.line}><Text style={s.bold}>Contact: </Text>{patientPhone}</Text>
          <Text style={s.line}><Text style={s.bold}>Delivery Location: </Text>{deliveryAddress}</Text>
        </View>

        <View style={s.progressCard}>
          <View style={s.progressBarBg}>
            <View style={[s.progressBar, { width: getProgressWidth() }]} />
          </View>
          <Text style={s.statusLabel}>Order Status: {getStatusText()}</Text>
        </View>

        {isNavigatingToPatient ? (
          <View style={s.infoBoxBlue}>
            <Text style={s.infoTextBlue}>Rider is on the way with your medicines!</Text>
          </View>
        ) : isPaymentPending ? (
          <View style={s.infoBoxBlue}>
            <Text style={s.infoTextBlue}>Delivery rider has reached your location. Please pay the requested amount.</Text>
          </View>
        ) : isDelivered ? (
          <View style={s.infoBox}>
            <Text style={s.infoText}>✅ Your medicine delivery has been completed.</Text>
          </View>
        ) : isApproved || isDeliveringToPharmacy || isReachedPharmacy ? (
          <View style={s.infoBox}>
            <Text style={s.infoText}>✅ Pharmacy approved your order. Delivery is being processed.</Text>
          </View>
        ) : isCancelled ? (
          <View style={s.infoBoxDanger}>
            <Text style={s.infoTextDanger}>Your medicine order has been cancelled.</Text>
          </View>
        ) : (
          <View style={s.infoBoxPending}>
            <Text style={s.infoTextPending}>Your order request has been sent to nearby pharmacies.</Text>
          </View>
        )}

        {(isApproved || isDeliveringToPharmacy || isReachedPharmacy || isNavigatingToPatient || isPaymentPending || isDelivered) && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Pharmacy Details</Text>
            <Text style={s.line}><Text style={s.bold}>Pharmacy Name: </Text>{pharmacyName}</Text>
            <Text style={s.line}><Text style={s.bold}>Location: </Text>{pharmacyAddress}</Text>
            <Text style={s.line}><Text style={s.bold}>Contact: </Text>{pharmacyPhone}</Text>
          </View>
        )}

        {(
            isApproved ||
            isDeliveringToPharmacy ||
            isReachedPharmacy ||
            isNavigatingToPatient ||
            isPaymentPending ||
            isDelivered
          ) && (
          <>
            <View style={s.card}>
              <Text style={s.cardTitle}>Delivery Rider Information</Text>
              <Text style={s.line}><Text style={s.bold}>Rider Name: </Text>{riderName}</Text>
              <Text style={s.line}><Text style={s.bold}>Bike Number: </Text>{bikeNumber}</Text>
              <Text style={s.line}><Text style={s.bold}>Contact: </Text>{riderPhone}</Text>
              <Text style={s.line}><Text style={s.bold}>Estimated Delivery Time: </Text>{eta}</Text>
            </View>

            <View style={s.card}>
              <Text style={s.cardTitle}>Order Summary</Text>
              <View style={s.summaryBox}>{renderOrderSummaryItems()}</View>
            </View>

            {/* Price Breakdown */}
            <View style={s.card}>
              <Text style={s.cardTitle}>Payment Breakdown</Text>

              <Text style={s.line}>
                <Text style={s.bold}>Medicine Amount: </Text>
                Rs. {Number(order?.pricing?.medicineAmount || 0)}
              </Text>

              <Text style={s.line}>
                <Text style={s.bold}>Medical Equipment Amount: </Text>
                Rs. {Number(order?.pricing?.equipmentAmount || 0)}
              </Text>

              <Text style={s.line}>
                <Text style={s.bold}>Delivery Charges: </Text>
                Rs. {Number(order?.pricing?.deliveryCharges || 0)}
              </Text>

              <Text style={s.line}>
                <Text style={s.bold}>Total Amount: </Text>
                Rs. {Number(
                  order?.pricing?.totalAmount ??
                  (
                    Number(order?.pricing?.medicineAmount || 0) +
                    Number(order?.pricing?.equipmentAmount || 0) +
                    Number(order?.pricing?.deliveryCharges || 0)
                  )
                )}
              </Text>
            </View>

            {isNavigatingToPatient && (
              <View style={s.card}>
                <Text style={s.cardTitle}>Live Rider Route</Text>
                <View style={s.divider} />
                <View style={s.mapBox}>
                  {renderMap(false)}
                  <TouchableOpacity style={s.fullBtn} onPress={() => setIsMapFullscreen(true)}>
                    <Text style={s.fullBtnText}>⛶</Text>
                  </TouchableOpacity>
                </View>
                <Text style={s.mapSubText}>Bike rider to your delivery location • {distance} • {eta}</Text>

              </View>
            )}

            {isPaymentPending && (
              <View style={s.paymentPendingBox}>
                <Text style={s.paymentPendingTitle}>Payment Pending</Text>
                {order?.amount !== undefined && order?.amount !== null ? (
                  <Text style={s.paymentPendingText}>Please pay Rs. {order.amount} to the delivery rider.</Text>
                ) : (
                  <Text style={s.paymentPendingText}>Delivery rider is preparing your payment amount. Please wait.</Text>
                )}
                <Text style={s.paymentPendingSub}>After rider confirms payment, your order will be marked as delivered automatically.</Text>
              </View>
            )}

            {isDelivered && (
              <View style={s.paymentPendingBox}>
                <Text style={s.paymentPendingTitle}>Order Delivered</Text>
                <Text style={s.paymentPendingText}>Your medicine delivery payment has been confirmed.</Text>
              </View>
            )}
          </>
        )}

        {!isDelivered && !isCancelled && (
          <TouchableOpacity style={s.cancelOrderBtn} onPress={handleCancelOrder} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={s.cancelOrderText}>Cancel Order</Text>}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: 16, paddingBottom: 32 },
  backBtn: { marginTop: 28, marginBottom: 12 },
  backText: { color: COLORS.sub, fontWeight: "800", fontSize: 15 },
  headerCard: { backgroundColor: "#DCFCE7", borderColor: COLORS.greenBorder, borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 14 },
  headerTitle: { color: COLORS.green, fontWeight: "900", fontSize: 20 },
  headerSub: { color: COLORS.sub, marginTop: 4 },
  card: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 14, marginBottom: 14 },
  cardTitle: { color: COLORS.text, fontWeight: "900", fontSize: 17, marginBottom: 10 },
  line: { color: COLORS.text, marginBottom: 8, lineHeight: 20 },
  bold: { fontWeight: "900" },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  progressCard: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 14, marginBottom: 14 },
  progressBarBg: { height: 8, backgroundColor: "#E5E7EB", borderRadius: 999, overflow: "hidden" },
  progressBar: { height: 8, backgroundColor: COLORS.green },
  statusLabel: { marginTop: 12, color: COLORS.text, fontWeight: "900", textAlign: "center" },
  infoBox: { backgroundColor: COLORS.greenSoft, borderWidth: 1, borderColor: COLORS.greenBorder, borderRadius: 12, padding: 14, marginBottom: 14 },
  infoText: { color: "#14532D", fontWeight: "800", lineHeight: 21 },
  infoBoxBlue: { backgroundColor: COLORS.blueSoft, borderWidth: 1, borderColor: COLORS.blueBorder, borderRadius: 12, padding: 14, marginBottom: 14 },
  infoTextBlue: { color: "#1E40AF", fontWeight: "900", lineHeight: 21 },
  infoBoxPending: { backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#BFDBFE", borderRadius: 12, padding: 14, marginBottom: 14 },
  infoTextPending: { color: "#1E40AF", fontWeight: "800", lineHeight: 21 },
  infoBoxDanger: { backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA", borderRadius: 12, padding: 14, marginBottom: 14 },
  infoTextDanger: { color: "#14532D", fontWeight: "800", lineHeight: 21 },
  summaryBox: { backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12 },
  summaryBlock: { marginBottom: 10 },
  summaryLabel: { color: COLORS.sub, fontWeight: "900", marginBottom: 5 },
  summaryItem: { color: COLORS.text, fontWeight: "700", marginBottom: 4, lineHeight: 20 },
  summaryEmpty: { color: COLORS.sub, fontWeight: "700" },
  mapBox: { height: 260, borderRadius: 12, overflow: "hidden", backgroundColor: "#E5E7EB" },
  map: { ...StyleSheet.absoluteFillObject },
  mapPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  mapPlaceholderTitle: { marginTop: 8, color: COLORS.sub, fontWeight: "900", textAlign: "center" },
  mapPlaceholderSub: { marginTop: 4, color: COLORS.sub, textAlign: "center", fontSize: 12 },
  fullBtn: { position: "absolute", top: 10, right: 10, width: 42, height: 42, borderRadius: 9, backgroundColor: "rgba(255,255,255,0.94)", alignItems: "center", justifyContent: "center", elevation: 4 },
  fullBtnText: { color: COLORS.text, fontSize: 21, fontWeight: "900", marginTop: -2 },
  mapSubText: { color: COLORS.sub, fontWeight: "800", marginTop: 10, textAlign: "center" },
  droneBikeWrap: { alignItems: "center", justifyContent: "center" },
  droneBikeShadow: {
    position: "absolute",
    backgroundColor: "rgba(15, 23, 42, 0.18)",
    transform: [{ translateY: 2 }],
  },
  droneBikeFrontWheel: { position: "absolute", backgroundColor: "#0F172A", zIndex: 4 },
  droneBikeRearWheel: { position: "absolute", backgroundColor: "#0F172A", zIndex: 4 },
  droneBikeHandlebar: { position: "absolute", backgroundColor: "#0F172A", zIndex: 5 },
  droneBikeBody: {
    position: "absolute",
    backgroundColor: COLORS.blue,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    elevation: 8,
    zIndex: 6,
  },
  droneBikeSeat: { position: "absolute", backgroundColor: "#111827" },
  droneBikeTank: { position: "absolute", backgroundColor: "rgba(255,255,255,0.92)" },
  patientMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    borderWidth: 3,
    borderColor: COLORS.green,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
  },
  patientMarkerText: { fontSize: 24 },
  fullscreen: { flex: 1, backgroundColor: "#000" },
  closeFullBtn: { position: "absolute", top: 45, right: 16, height: 38, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.95)", alignItems: "center", justifyContent: "center", paddingHorizontal: 14, elevation: 5 },
  closeFullText: { color: COLORS.text, fontWeight: "900" },
  fullEtaBadge: { position: "absolute", left: 16, bottom: 28, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.95)", paddingHorizontal: 14, paddingVertical: 9, elevation: 5 },
  fullEtaText: { color: COLORS.text, fontWeight: "900" },
  reachedPatientBtn: { height: 48, backgroundColor: COLORS.green, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 12 },
  reachedPatientText: { color: "#FFF", fontWeight: "900", fontSize: 15 },

  paymentPendingBox: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 14, marginBottom: 14 },
  paymentPendingTitle: { color: COLORS.text, fontWeight: "900", fontSize: 17, marginBottom: 8 },
  paymentPendingText: { color: COLORS.text, fontWeight: "800", lineHeight: 21 },
  paymentPendingSub: { color: COLORS.sub, fontWeight: "700", lineHeight: 20, marginTop: 8 },
  refreshBtn: { height: 48, backgroundColor: COLORS.green, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  refreshText: { color: "#FFF", fontWeight: "900" },
  cancelOrderBtn: {
    height: 52,
    backgroundColor: "#14532D",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    marginBottom: 24,
    shadowColor: "rgba(220,38,38,0.25)",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 3,
  },
  cancelOrderText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
  },

});
