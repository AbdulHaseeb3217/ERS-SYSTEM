// screens/ActiveMedicineDeliveryScreen.jsx

import React, { useEffect, useRef, useState } from "react";
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  PermissionsAndroid,
  Modal,
  TextInput,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import Geolocation from "@react-native-community/geolocation";
import { CommonActions } from "@react-navigation/native";

import { GOOGLE_MAPS_APIKEY } from "../services/apiConfig";
import {
  updateMedicineDeliveryRiderLiveLocation,
  cancelMedicineDeliveryRequest,
  markMedicineDeliveryReachedPharmacy,
  markMedicineDeliveryNavigatingToPatient,
  markMedicineDeliveryPaymentPending,
  updateMedicineDeliveryPaymentAmount,
  confirmMedicineDeliveryPaymentReceived,
} from "../services/bikeRideRequests";

const bikeIcon = require("../assets/sportbike.png");

const MIN_REAL_MOVEMENT_METERS = 12;
const MAX_ACCEPTABLE_ACCURACY_METERS = 50;

const COLORS = {
  brand: "#2563EB",
  brandDark: "#1D4ED8",
  bg: "#F6F7F9",
  white: "#FFFFFF",
  text: "#0F172A",
  sub: "#64748B",
  border: "#E5E7EB",
  blue: "#2563EB",
  green: "#16A34A",
  danger: "#DC2626",
};

const getMongoId = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value._id || value.id || null;
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

  return { latitude: nLat, longitude: nLng };
};

const normalizeMedicineStatus = (status) =>
  String(status || "").toLowerCase().replace(/-/g, "_");

const getInitialMedicineStage = (status) => {
  const safeStatus = normalizeMedicineStatus(status);
  if (safeStatus === "reached_pharmacy") return "reached_pharmacy";
  if (safeStatus === "navigating_to_patient") return "navigating_to_patient";
  if (safeStatus === "payment_pending") return "payment_pending";
  if (safeStatus === "delivered") return "delivered";
  return "navigating_to_pharmacy";
};

const getInitialProgress = (status) => {
  const safeStatus = normalizeMedicineStatus(status);
  if (safeStatus === "reached_pharmacy") return 45;
  if (safeStatus === "navigating_to_patient") return 65;
  if (safeStatus === "payment_pending") return 90;
  if (safeStatus === "delivered") return 100;
  return 15;
};

export default function ActiveMedicineDeliveryScreen({ navigation, route }) {
  const { order, rider, riderId: routeRiderId } = route?.params || {};

  const mapRef = useRef(null);
  const fullMapRef = useRef(null);
  const lastRiderLocationRef = useRef(null);
  const locationWatchIdRef = useRef(null);
  const lastBackendLocationUpdateRef = useRef(0);
  const routeCoordinatesRef = useRef([]);
  const mapFittedOnceRef = useRef(false);
  const tracksTimerRef = useRef(null);

  const orderId = getMongoId(order);
  const riderId = routeRiderId || getMongoId(rider) || getMongoId(order?.rider);

  const pharmacyName =
    order?.pharmacyInfo?.name || order?.pharmacy?.pharmacyName || "Pharmacy";
  const pharmacyPhone =
    order?.pharmacyInfo?.phone || order?.pharmacy?.phone || "N/A";
  const patientName =
    order?.patientInfo?.name || order?.patient?.fullName || "Patient";
  const patientPhone =
    order?.patientInfo?.phone || order?.patient?.phone || "N/A";

  const pharmacyCoord = getCoordFromLocation(order?.pharmacy?.location);
  const patientCoord = getCoordFromLocation(order?.deliveryLocation);

  const [resolvedPharmacyAddress, setResolvedPharmacyAddress] = useState("");
  const [resolvedDeliveryAddress, setResolvedDeliveryAddress] = useState("");
  const [resolvedRiderAddress, setResolvedRiderAddress] = useState("");

  const [riderLocation, setRiderLocation] = useState(null);
  const [markerCoord, setMarkerCoord] = useState(null);
  const [calculatedHeading, setCalculatedHeading] = useState(0);
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  const [routeRefreshKey, setRouteRefreshKey] = useState(0);
  const [loadingMap, setLoadingMap] = useState(true);
  const [liveETA, setLiveETA] = useState("Calculating...");
  const [liveDistance, setLiveDistance] = useState("Calculating...");
  const [medicineStage, setMedicineStage] = useState(getInitialMedicineStage(order?.status));
  const [progress, setProgress] = useState(getInitialProgress(order?.status));
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(
    order?.amount !== undefined && order?.amount !== null ? String(order.amount) : ""
  );
  const [paymentAmountSaved, setPaymentAmountSaved] = useState(
    order?.amount !== undefined && order?.amount !== null
  );
  const [savingPaymentAmount, setSavingPaymentAmount] = useState(false);
  const [confirmingPaymentReceived, setConfirmingPaymentReceived] = useState(false);

  const isReachedPharmacy = medicineStage === "reached_pharmacy";
  const isNavigatingToPatient = medicineStage === "navigating_to_patient";
  const isNavigatingToPharmacy = medicineStage === "navigating_to_pharmacy";
  const isPaymentPending = medicineStage === "payment_pending";
  const isDelivered = medicineStage === "delivered";
  const shouldShowRoute = isNavigatingToPharmacy || isNavigatingToPatient;

  const getCurrentDestinationCoord = () => {
    if (isNavigatingToPatient || isPaymentPending || isDelivered) return patientCoord;
    return pharmacyCoord;
  };

  const getStatusText = () => {
    if (isPaymentPending) return "Payment Pending";
    if (isDelivered) return "Medicine Delivered";
    if (isNavigatingToPatient) return "Navigating to Patient Location";
    if (isReachedPharmacy) return "Reached Pharmacy";
    return "Navigating to Pharmacy";
  };

  const isBadAddress = (value) => {
    const text = String(value || "").trim().toLowerCase();
    return (
      !text ||
      text === "address not available" ||
      text === "pharmacy address not available" ||
      text === "patient delivery location" ||
      text === "patient delivery location not provided" ||
      text === "current gps location" ||
      text === "current location" ||
      text.startsWith("lat ")
    );
  };

  const rawPharmacyAddress =
    order?.pharmacyInfo?.address || order?.pharmacy?.address;

  const pharmacyAddress = !isBadAddress(rawPharmacyAddress)
    ? rawPharmacyAddress
    : resolvedPharmacyAddress || "Pharmacy address loading...";

  const patientDeliveryAddress = !isBadAddress(order?.deliveryLocation?.address)
    ? order.deliveryLocation.address
    : resolvedDeliveryAddress || "Patient delivery address loading...";

  const calculateDistanceMeters = (lat1, lng1, lat2, lng2) => {
    if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return 0;

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
      console.log("Active medicine delivery reverse geocode error:", error.message);
    }
    return "";
  };

  useEffect(() => {
    let cancelled = false;

    const resolveMissingAddresses = async () => {
      if (isBadAddress(rawPharmacyAddress) && pharmacyCoord) {
        const address = await reverseGeocodeAddress(pharmacyCoord);
        if (!cancelled && address) setResolvedPharmacyAddress(address);
      }

      if (isBadAddress(order?.deliveryLocation?.address) && patientCoord) {
        const address = await reverseGeocodeAddress(patientCoord);
        if (!cancelled && address) setResolvedDeliveryAddress(address);
      }
    };

    resolveMissingAddresses();
    return () => {
      cancelled = true;
    };
  }, [orderId, rawPharmacyAddress, order?.deliveryLocation?.address]);

  useEffect(() => {
    let cancelled = false;

    const resolveRiderAddress = async () => {
      if (!riderLocation) return;
      const address = await reverseGeocodeAddress(riderLocation);
      if (!cancelled && address) setResolvedRiderAddress(address);
    };

    resolveRiderAddress();
    return () => {
      cancelled = true;
    };
  }, [riderLocation?.latitude, riderLocation?.longitude]);

  const requestAndroidLocationPermission = async () => {
    if (Platform.OS !== "android") return true;

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "Location Permission",
          message: "The Last Hope needs your location for medicine delivery navigation.",
          buttonPositive: "Allow",
          buttonNegative: "Cancel",
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.log("Location permission error:", error.message);
      return false;
    }
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

  const updateMarkerCoord = (coord) => {
    if (!coord) return;
    setMarkerCoord(coord);
    flashTracksViewChanges();
  };

  const refreshRouteFromCurrentLocation = () => {
    setRouteRefreshKey((prev) => prev + 1);
  };

  const pushLocationToBackend = async (coord, force = false) => {
    try {
      if (!coord || !orderId || !riderId) return;

      const now = Date.now();
      if (
        !force &&
        lastBackendLocationUpdateRef.current &&
        now - lastBackendLocationUpdateRef.current < 3000
      ) {
        return;
      }

      lastBackendLocationUpdateRef.current = now;

      await updateMedicineDeliveryRiderLiveLocation({
        orderId,
        riderId,
        lat: coord.latitude,
        lng: coord.longitude,
      });
    } catch (error) {
      console.log("Medicine delivery live location update error:", error.message);
    }
  };

  const handleNewLocation = (latestLocation) => {
    if (!latestLocation) return;

    const previousLocation = lastRiderLocationRef.current;

    if (!previousLocation) {
      lastRiderLocationRef.current = latestLocation;
      setRiderLocation(latestLocation);
      updateMarkerCoord(latestLocation);
      refreshRouteFromCurrentLocation();
      pushLocationToBackend(latestLocation, true);
      setLoadingMap(false);
      return;
    }

    const movedMeters = calculateDistanceMeters(
      previousLocation.latitude,
      previousLocation.longitude,
      latestLocation.latitude,
      latestLocation.longitude
    );

    if (movedMeters >= MIN_REAL_MOVEMENT_METERS) {
      lastRiderLocationRef.current = latestLocation;
      setRiderLocation(latestLocation);
      const snappedPoint = getNearestRoutePoint(latestLocation);
      updateMarkerCoord(snappedPoint || latestLocation);
      refreshRouteFromCurrentLocation();
      pushLocationToBackend(latestLocation, true);
    }

    setLoadingMap(false);
  };

  useEffect(() => {
    let cancelled = false;

    const startLocationWatch = async () => {
      setLoadingMap(true);

      const allowed = await requestAndroidLocationPermission();
      if (!allowed || cancelled) {
        setLoadingMap(false);
        Alert.alert(
          "Location Required",
          "Please allow location permission to navigate to pharmacy."
        );
        return;
      }

      Geolocation.getCurrentPosition(
        (position) => {
          if (cancelled) return;
          const { latitude, longitude, accuracy } = position.coords || {};
          if (accuracy && accuracy > 100) return;
          handleNewLocation({
            latitude: Number(latitude),
            longitude: Number(longitude),
          });
        },
        (error) => {
          console.log("Initial medicine delivery location error:", error.message);
          const fallback = getCoordFromLocation(order?.riderLiveLocation);
          if (fallback && !cancelled) {
            lastRiderLocationRef.current = fallback;
            setRiderLocation(fallback);
            updateMarkerCoord(fallback);
          }
          setLoadingMap(false);
        },
        { enableHighAccuracy: true, timeout: 25000, maximumAge: 0 }
      );

      locationWatchIdRef.current = Geolocation.watchPosition(
        (position) => {
          if (cancelled) return;
          const { latitude, longitude, accuracy } = position.coords || {};
          if (
            accuracy != null &&
            Number(accuracy) > MAX_ACCEPTABLE_ACCURACY_METERS &&
            lastRiderLocationRef.current
          ) {
            setLoadingMap(false);
            return;
          }

          handleNewLocation({
            latitude: Number(latitude),
            longitude: Number(longitude),
          });
        },
        (error) => {
          console.log("Medicine delivery watch error:", error.message);
          setLoadingMap(false);
        },
        {
          enableHighAccuracy: true,
          distanceFilter: 3,
          interval: 3000,
          fastestInterval: 1500,
          maximumAge: 0,
        }
      );
    };

    startLocationWatch();

    return () => {
      cancelled = true;
      if (locationWatchIdRef.current !== null) {
        Geolocation.clearWatch(locationWatchIdRef.current);
      }
      if (tracksTimerRef.current) clearTimeout(tracksTimerRef.current);
    };
  }, [orderId, riderId]);

  const handleMenuPress = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: "BikeRiderMenu",
            params: {
              rider,
              riderId,
              preventRedirect: true,
              preventMedicineRedirect: true,
            },
          },
        ],
      })
    );
  };

  const handleReachedPharmacy = () => {
    Alert.alert(
      "Reached Pharmacy",
      "Are you sure you have reached the pharmacy pickup location?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            try {
              setUpdatingStatus(true);

              await markMedicineDeliveryReachedPharmacy({
                orderId,
                riderId,
              });

              routeCoordinatesRef.current = [];
              mapFittedOnceRef.current = false;
              setMedicineStage("reached_pharmacy");
              setProgress(45);
              setLiveETA("Arrived");
              setLiveDistance("0 km");
              setMarkerCoord(riderLocation || markerCoord);

              Alert.alert("Reached Pharmacy", "Request status updated to Reached Pharmacy.");
            } catch (error) {
              Alert.alert("Error", error.message || "Could not update reached pharmacy status.");
            } finally {
              setUpdatingStatus(false);
            }
          },
        },
      ]
    );
  };

  const handleNavigateToPatient = async () => {
    if (!patientCoord) {
      Alert.alert("Location Missing", "Patient delivery location is not available.");
      return;
    }

    try {
      setUpdatingStatus(true);

      await markMedicineDeliveryNavigatingToPatient({
        orderId,
        riderId,
      });

      routeCoordinatesRef.current = [];
      mapFittedOnceRef.current = false;
      setMarkerCoord(riderLocation || markerCoord);
      setMedicineStage("navigating_to_patient");
      setProgress(65);
      setLiveETA("Calculating...");
      setLiveDistance("Calculating...");
      setRouteRefreshKey((prev) => prev + 1);

      Alert.alert("Navigation Started", "Now navigating to patient delivery location.");
    } catch (error) {
      Alert.alert("Error", error.message || "Could not start navigation to patient.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleReachedPatient = () => {
    Alert.alert(
      "Reached Patient",
      "You have reached the patient delivery location. Move this delivery to payment pending?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            try {
              setUpdatingStatus(true);

              const updatedOrder = await markMedicineDeliveryPaymentPending({
                orderId,
                riderId,
              });

              routeCoordinatesRef.current = [];
              mapFittedOnceRef.current = false;
              setMarkerCoord(riderLocation || markerCoord);
              setMedicineStage("payment_pending");
              setProgress(90);
              setLiveETA("Arrived");
              setLiveDistance("0 km");

              if (
                updatedOrder?.amount !== undefined &&
                updatedOrder?.amount !== null
              ) {
                setPaymentAmount(String(updatedOrder.amount));
                setPaymentAmountSaved(true);
              }

              Alert.alert(
                "Payment Pending",
                "Delivery reached patient. Please collect payment from patient."
              );
            } catch (error) {
              Alert.alert("Error", error.message || "Could not move delivery to payment pending.");
            } finally {
              setUpdatingStatus(false);
            }
          },
        },
      ]
    );
  };

  const handleSavePaymentAmount = async () => {
    const amount = Number(paymentAmount);

    if (!paymentAmount || Number.isNaN(amount) || amount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid payment amount in PKR.");
      return;
    }

    try {
      setSavingPaymentAmount(true);

      const updatedOrder = await updateMedicineDeliveryPaymentAmount({
        orderId,
        riderId,
        amount,
      });

      setPaymentAmount(String(updatedOrder?.amount ?? amount));
      setPaymentAmountSaved(true);

      Alert.alert(
        "Amount Sent",
        `Payment amount Rs. ${updatedOrder?.amount ?? amount} has been sent to patient.`
      );
    } catch (error) {
      Alert.alert("Error", error.message || "Could not save payment amount.");
    } finally {
      setSavingPaymentAmount(false);
    }
  };

  const handleConfirmPaymentReceived = () => {
    const amount = Number(paymentAmount);

    if (!paymentAmount || Number.isNaN(amount) || amount <= 0) {
      Alert.alert("Invalid Amount", "Please enter and send payment amount first.");
      return;
    }

    if (!paymentAmountSaved) {
      Alert.alert(
        "Send Amount First",
        "Please tap Send Amount to Patient before confirming payment."
      );
      return;
    }

    Alert.alert("Confirm Payment", "Have you received the payment from patient?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Received",
        onPress: async () => {
          try {
            setConfirmingPaymentReceived(true);

            await confirmMedicineDeliveryPaymentReceived({
              orderId,
              riderId,
            });

            setMedicineStage("delivered");
            setProgress(100);
            routeCoordinatesRef.current = [];
            mapFittedOnceRef.current = false;
            setLiveETA("Completed");
            setLiveDistance("0 km");

            Alert.alert("Completed", "Payment confirmed and medicine delivery completed.", [
              {
                text: "OK",
                onPress: () => {
                  navigation.dispatch(
                    CommonActions.reset({
                      index: 0,
                      routes: [
                        {
                          name: "BikeRiderMenu",
                          params: { rider, riderId, preventRedirect: true, preventMedicineRedirect: true },
                        },
                      ],
                    })
                  );
                },
              },
            ]);
          } catch (error) {
            Alert.alert("Error", error.message || "Could not confirm payment.");
          } finally {
            setConfirmingPaymentReceived(false);
          }
        },
      },
    ]);
  };

  const handleCancelDelivery = () => {
    Alert.alert(
      "Cancel Delivery",
      "Are you sure you want to cancel this medicine delivery request?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              setUpdatingStatus(true);

              await cancelMedicineDeliveryRequest({
                orderId,
                riderId,
              });

              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [
                    {
                      name: "BikeRiderMenu",
                      params: {
                        rider,
                        riderId,
                        preventRedirect: true,
                        preventMedicineRedirect: true,
                      },
                    },
                  ],
                })
              );
            } catch (error) {
              Alert.alert("Error", error.message || "Could not cancel delivery.");
            } finally {
              setUpdatingStatus(false);
            }
          },
        },
      ]
    );
  };

  const onRouteReady = (result) => {
    const duration = Math.ceil(Number(result.duration || 0));
    const distance = Number(result.distance || 0).toFixed(2);

    setLiveETA(`${duration} mins`);
    setLiveDistance(`${distance} km`);

    // Progress must not jump based on ETA.
    // While navigating to pharmacy it should stay 15%, even after logout/login resume.
    if (medicineStage === "navigating_to_pharmacy") {
      setProgress(15);
    }

    if (medicineStage === "navigating_to_patient") {
      setProgress(65);
    }

    if (result.coordinates && result.coordinates.length >= 2) {
      routeCoordinatesRef.current = result.coordinates;

      const p1 = result.coordinates[0];
      const snappedPoint = {
        latitude: p1.latitude,
        longitude: p1.longitude,
      };

      updateMarkerCoord(snappedPoint);
      updateRouteBearing(result.coordinates);

      if (mapFittedOnceRef.current && mapRef.current) {
        mapRef.current.animateToRegion(
          {
            latitude: snappedPoint.latitude,
            longitude: snappedPoint.longitude,
            latitudeDelta: 0.008,
            longitudeDelta: 0.008,
          },
          800
        );
      }
    }

    if (!mapFittedOnceRef.current && mapRef.current && result.coordinates) {
      mapRef.current.fitToCoordinates(result.coordinates, {
        edgePadding: { right: 50, bottom: 50, left: 50, top: 80 },
        animated: true,
      });
      mapFittedOnceRef.current = true;
    }
  };

  const onFullscreenRouteReady = (result) => {
    if (result.coordinates && result.coordinates.length >= 2) {
      routeCoordinatesRef.current = result.coordinates;

      const p1 = result.coordinates[0];
      const snappedPoint = {
        latitude: p1.latitude,
        longitude: p1.longitude,
      };

      updateMarkerCoord(snappedPoint);
      updateRouteBearing(result.coordinates);

      if (fullMapRef.current) {
        fullMapRef.current.fitToCoordinates(result.coordinates, {
          edgePadding: { right: 70, bottom: 90, left: 70, top: 110 },
          animated: true,
        });
      }
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

  const renderBikeMarker = (size = 46) => {
    if (!riderLocation) return null;

    // Route stages mein marker blue line par snap rahega.
    // Reached Pharmacy / Payment stages mein raw current location use hogi,
    // taake fullscreen map par marker purani route coordinate par stuck na ho.
    const shouldUseSnappedMarker = shouldShowRoute;
    const bikeMarkerCoordinate =
      shouldUseSnappedMarker && markerCoord ? markerCoord : riderLocation;

    return (
      <Marker
        coordinate={bikeMarkerCoordinate}
        title="Bike Rider"
        flat={shouldUseSnappedMarker}
        anchor={{ x: 0.5, y: 0.5 }}
        rotation={shouldUseSnappedMarker ? calculatedHeading : 0}
        tracksViewChanges={true}
        zIndex={5}
      >
        {renderDroneBikeIcon(size)}
      </Marker>
    );
  };

  const renderPharmacyMarker = (size = 34) => {
    // Pharmacy marker should remain visible even after Reached Pharmacy.
    // Only the blue route line and Pharmacy Pickup row are hidden in reached_pharmacy stage.
    if (!pharmacyCoord) return null;

    return (
      <Marker coordinate={pharmacyCoord} title="Pharmacy Pickup">
        <View style={[s.pharmacyMarker, { width: size + 12, height: size + 12 }]}>
          <Text style={[s.markerEmoji, { fontSize: size - 8 }]}>💊</Text>
        </View>
      </Marker>
    );
  };


  const renderPatientMarker = (size = 34) => {
    if (!patientCoord) return null;

    return (
      <Marker
        coordinate={patientCoord}
        title="Patient Delivery Location"
        description={patientDeliveryAddress}
        tracksViewChanges={true}
      >
        <View style={[s.patientMarker, { width: size + 12, height: size + 12 }]}>
          <Text style={[s.patientMarkerText, { fontSize: size - 4 }]}>👤</Text>
        </View>
      </Marker>
    );
  };

  const renderDirections = (isFullScreen = false) => {
    const currentDestination = getCurrentDestinationCoord();

    if (!riderLocation || !currentDestination || !shouldShowRoute) return null;

    return (
      <MapViewDirections
        key={`medicine-route-${medicineStage}-${routeRefreshKey}-${riderLocation.latitude}-${riderLocation.longitude}-${currentDestination.latitude}-${currentDestination.longitude}-${isFullScreen ? "full" : "small"}`}
        origin={{
          latitude: riderLocation.latitude,
          longitude: riderLocation.longitude,
        }}
        destination={currentDestination}
        apikey={GOOGLE_MAPS_APIKEY}
        strokeWidth={isFullScreen ? 8 : 6}
        strokeColor={COLORS.blue}
        optimizeWaypoints={true}
        mode="DRIVING"
        onReady={isFullScreen ? onFullscreenRouteReady : onRouteReady}
        onError={(errorMessage) => {
          console.log("Medicine delivery directions error:", errorMessage);
        }}
      />
    );
  };

  const renderMap = (isFullScreen = false) => {
    if (loadingMap && !riderLocation) {
      return (
        <View style={s.mapFallback}>
          <ActivityIndicator color={COLORS.brand} />
          <Text style={s.mapFallbackTitle}>Loading Map...</Text>
          <Text style={s.mapFallbackSub}>Fetching rider current location</Text>
        </View>
      );
    }

    const currentDestination = getCurrentDestinationCoord();

    if (!riderLocation || !currentDestination) {
      return (
        <View style={s.mapFallback}>
          <Text style={s.mapIcon}>◎</Text>
          <Text style={s.mapFallbackTitle}>Google Maps View</Text>
          <Text style={s.mapFallbackSub}>
            Rider current location or route destination is not available
          </Text>
        </View>
      );
    }

    return (
      <MapView
        ref={isFullScreen ? fullMapRef : mapRef}
        provider={PROVIDER_GOOGLE}
        style={s.map}
        initialRegion={{
          latitude: riderLocation.latitude,
          longitude: riderLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {renderBikeMarker(isFullScreen ? 48 : 42)}

        {/* Pharmacy icon Navigating to Pharmacy + Reached Pharmacy dono mein show hoga.
            Navigating to Patient par pharmacy icon hide ho jayega. */}
        {(isNavigatingToPharmacy || isReachedPharmacy) &&
          renderPharmacyMarker(isFullScreen ? 38 : 34)}

        {/* Patient icon Reached Pharmacy par show nahi hoga.
            Sirf Navigating to Patient / Payment / Delivered stages mein show hoga. */}
        {(isNavigatingToPatient || isPaymentPending || isDelivered) &&
          renderPatientMarker(isFullScreen ? 38 : 34)}

        {renderDirections(isFullScreen)}
      </MapView>
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.brand} />

      <Modal
        visible={isMapFullscreen}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setIsMapFullscreen(false)}
      >
        <View style={s.fullscreenContainer}>
          <StatusBar
            barStyle="dark-content"
            backgroundColor="transparent"
            translucent
          />

          {renderMap(true)}

          <TouchableOpacity
            style={s.closeFullscreenBtn}
            onPress={() => setIsMapFullscreen(false)}
            activeOpacity={0.85}
          >
            <Text style={s.closeFullscreenIcon}>✕</Text>
            <Text style={s.closeFullscreenText}>Close</Text>
          </TouchableOpacity>

          <View style={s.fullscreenETABadge}>
            <Text style={s.fullscreenETAText}>
              {getStatusText()} • {liveDistance} • {liveETA}
            </Text>
          </View>
        </View>
      </Modal>

      <View style={s.topbar}>
        <View style={s.leftBrand}>
          <View style={s.brandCircle}>
            <Image source={bikeIcon} style={s.brandIcon} />
          </View>
          <View>
            <Text style={s.brandTitle}>Bike Rider</Text>
            <Text style={s.brandSub}>Medicine Delivery</Text>
          </View>
        </View>

        <TouchableOpacity style={s.menuBtn} onPress={handleMenuPress}>
          <Text style={s.menuText}>Menu</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
        <View style={s.progressCard}>
          <View style={s.progressTop}>
            <Text style={s.progressTitle}>Request Status</Text>
            <Text style={s.progressPercent}>{progress}%</Text>
          </View>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={s.statusText}>Request Status: {getStatusText()}</Text>
        </View>

        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Pharmacy Details</Text>
            <View style={s.badge}>
              <Text style={s.badgeText}>Pickup</Text>
            </View>
          </View>
          <Text style={s.label}>Pharmacy Name</Text>
          <Text style={s.nameText}>{pharmacyName}</Text>
          <Text style={s.phoneText}>📞 {pharmacyPhone}</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Location & Navigation</Text>
          <View style={s.divider} />

          <View style={s.mapBox}>
            {renderMap(false)}

            <TouchableOpacity
              style={s.fullscreenBtn}
              onPress={() => setIsMapFullscreen(true)}
              activeOpacity={0.85}
            >
              <Text style={s.fullscreenBtnText}>⛶</Text>
            </TouchableOpacity>
          </View>

          <View style={s.locationRow}>
            <Text style={s.locationIcon}>🏍️</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.locationLabel}>Rider Current Location</Text>
              <Text style={s.locationValue} numberOfLines={3}>
                {resolvedRiderAddress || "Rider current location loading..."}
              </Text>
            </View>
          </View>

          {isNavigatingToPharmacy && (
            <View style={s.locationRow}>
              <Text style={s.locationIcon}>💊</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.locationLabel}>Pharmacy Pickup</Text>
                <Text style={s.locationValue} numberOfLines={3}>{pharmacyAddress}</Text>
                <Text style={s.locationSub}>{liveDistance} • {liveETA}</Text>
              </View>
            </View>
          )}

          <View style={s.locationRow}>
            <Text style={s.locationIcon}>📍</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.locationLabel}>Patient Delivery</Text>
              <Text style={s.locationValue} numberOfLines={3}>{patientDeliveryAddress}</Text>
              {isNavigatingToPatient && <Text style={s.locationSub}>{liveDistance} • {liveETA}</Text>}
            </View>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Patient Details</Text>
          <Text style={s.label}>Patient Name</Text>
          <Text style={s.nameText}>{patientName}</Text>
          <Text style={s.phoneText}>📞 {patientPhone}</Text>
        </View>

        {/* NEW: Order Price Breakdown */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Order Price Breakdown</Text>

          <Text style={s.label}>
            Medicine Amount
          </Text>
          <Text style={s.nameText}>
            Rs. {Number(order?.pricing?.medicineAmount || 0)}
          </Text>

          <Text style={s.label}>
            Medical Equipment Amount
          </Text>
          <Text style={s.nameText}>
            Rs. {Number(order?.pricing?.equipmentAmount || 0)}
          </Text>

          <Text style={s.label}>
            Delivery Charges (Your Earning)
          </Text>
          <Text style={s.nameText}>
            Rs. {Number(
              order?.pricing?.deliveryCharges ||
              order?.riderEarning ||
              0
            )}
          </Text>

          <Text style={s.label}>
            Total Order Amount
          </Text>
          <Text style={s.nameText}>
            Rs. {Number(
              order?.pricing?.totalAmount ||
              order?.amount ||
              0
            )}
          </Text>
        </View>

        {isPaymentPending && (
          <View style={s.paymentBox}>
            <Text style={s.paymentTitle}>Payment Collection</Text>
            <Text style={s.paymentSub}>
              Enter the payment amount in PKR and send it to the patient. After receiving payment, confirm it below.
            </Text>

            <Text style={s.paymentLabel}>Payment Amount in PKR</Text>
            <TextInput
              style={s.paymentInput}
              value={paymentAmount}
              onChangeText={(value) => {
                setPaymentAmount(value.replace(/[^0-9]/g, ""));
                setPaymentAmountSaved(false);
              }}
              keyboardType="numeric"
              placeholder="Example: 1500"
              placeholderTextColor="#94A3B8"
            />

            {paymentAmountSaved && paymentAmount ? (
              <View style={s.paymentAmountBadge}>
                <Text style={s.paymentAmountText}>Sent Amount: Rs. {paymentAmount}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[s.paymentActionBtn, savingPaymentAmount && { opacity: 0.65 }]}
              activeOpacity={0.85}
              onPress={handleSavePaymentAmount}
              disabled={savingPaymentAmount}
            >
              {savingPaymentAmount ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={s.reachedBtnText}>Send Amount to Patient</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.confirmPaymentBtn, confirmingPaymentReceived && { opacity: 0.65 }]}
              activeOpacity={0.85}
              onPress={handleConfirmPaymentReceived}
              disabled={confirmingPaymentReceived}
            >
              {confirmingPaymentReceived ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={s.reachedBtnText}>Confirm Payment Received</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {isNavigatingToPharmacy ? (
          <TouchableOpacity
            style={[s.reachedBtn, updatingStatus && { opacity: 0.65 }]}
            activeOpacity={0.9}
            onPress={handleReachedPharmacy}
            disabled={updatingStatus}
          >
            {updatingStatus ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={s.reachedBtnText}>Reached Pharmacy</Text>
            )}
          </TouchableOpacity>
        ) : isReachedPharmacy ? (
          <TouchableOpacity
            style={[s.navigateBtn, updatingStatus && { opacity: 0.65 }]}
            activeOpacity={0.9}
            onPress={handleNavigateToPatient}
            disabled={updatingStatus}
          >
            {updatingStatus ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={s.navigateBtnText}>Navigate to Patient</Text>
            )}
          </TouchableOpacity>
        ) : isNavigatingToPatient ? (
          <TouchableOpacity
            style={[s.reachedBtn, updatingStatus && { opacity: 0.65 }]}
            activeOpacity={0.9}
            onPress={handleReachedPatient}
            disabled={updatingStatus}
          >
            <Text style={s.reachedBtnText}>Reached Patient</Text>
          </TouchableOpacity>
        ) : null}

        {!isPaymentPending && !isDelivered && (
          <TouchableOpacity
            style={[s.cancelBtn, updatingStatus && { opacity: 0.65 }]}
            activeOpacity={0.9}
            onPress={handleCancelDelivery}
            disabled={updatingStatus}
          >
            {updatingStatus ? (
              <ActivityIndicator color={COLORS.danger} />
            ) : (
              <Text style={s.cancelBtnText}>Cancel Delivery</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  topbar: {
    height: 85,
    backgroundColor: COLORS.brand,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 30,
  },
  leftBrand: { flexDirection: "row", alignItems: "center" },
  brandCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFFFFF20",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  brandIcon: { width: 20, height: 20, tintColor: "#FFF" },
  brandTitle: { color: "#FFF", fontWeight: "900", fontSize: 18 },
  brandSub: { color: "#E5E7EB", fontSize: 13, marginTop: 2 },
  menuBtn: {
    backgroundColor: "#FFFFFF20",
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  menuText: { color: "#FFF", fontWeight: "900" },
  container: { padding: 16, paddingBottom: 28 },

  progressCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  progressTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressTitle: { color: COLORS.sub, fontWeight: "900", fontSize: 14 },
  progressPercent: { color: COLORS.brandDark, fontWeight: "900", fontSize: 13 },
  progressTrack: {
    height: 10,
    backgroundColor: "#DBEAFE",
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 12,
    marginBottom: 12,
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.brand,
    borderRadius: 999,
  },
  statusText: { color: COLORS.text, fontWeight: "900", fontSize: 17 },

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
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitle: { color: COLORS.text, fontWeight: "900", fontSize: 18 },
  badge: {
    backgroundColor: "#DBEAFE",
    borderRadius: 999,
    paddingHorizontal: 12,
    height: 30,
    justifyContent: "center",
  },
  badgeText: { color: COLORS.brand, fontWeight: "900" },
  label: { color: COLORS.sub, fontWeight: "800", marginTop: 8 },
  nameText: { color: COLORS.text, fontWeight: "900", fontSize: 17, marginTop: 4 },
  phoneText: { color: COLORS.brand, fontWeight: "900", fontSize: 16, marginTop: 8 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },

  mapBox: {
    height: 260,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
  },
  map: { ...StyleSheet.absoluteFillObject },
  mapFallback: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  mapIcon: { fontSize: 34, color: "#9CA3AF" },
  mapFallbackTitle: { marginTop: 8, color: COLORS.sub, fontWeight: "900", fontSize: 16 },
  mapFallbackSub: { marginTop: 4, color: COLORS.sub, textAlign: "center" },

  fullscreenBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 42,
    height: 42,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.94)",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  fullscreenBtnText: { color: COLORS.text, fontSize: 21, fontWeight: "900", marginTop: -2 },
  fullscreenContainer: { flex: 1, backgroundColor: "#000" },
  closeFullscreenBtn: {
    position: "absolute",
    top: 45,
    right: 16,
    height: 38,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.95)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    elevation: 5,
  },
  closeFullscreenIcon: { color: COLORS.text, fontSize: 15, fontWeight: "900", marginRight: 6 },
  closeFullscreenText: { color: COLORS.text, fontSize: 13, fontWeight: "900" },
  fullscreenETABadge: {
    position: "absolute",
    left: 16,
    bottom: 28,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 14,
    paddingVertical: 9,
    elevation: 5,
  },
  fullscreenETAText: { color: COLORS.text, fontSize: 13, fontWeight: "900" },

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
    backgroundColor: COLORS.brand,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    elevation: 8,
    zIndex: 6,
  },
  droneBikeSeat: { position: "absolute", backgroundColor: "#111827" },
  droneBikeTank: { position: "absolute", backgroundColor: "rgba(255,255,255,0.92)" },

  pharmacyMarker: {
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: COLORS.green,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
  },
  patientMarker: {
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: COLORS.danger,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
  },
  markerEmoji: { textAlign: "center" },

  locationRow: { flexDirection: "row", marginTop: 14 },
  locationIcon: { fontSize: 22, marginRight: 10, width: 30 },
  locationLabel: { color: COLORS.sub, fontWeight: "900" },
  locationValue: { color: COLORS.text, fontWeight: "800", marginTop: 3 },
  locationSub: { color: COLORS.sub, marginTop: 3 },


  paymentBox: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 14,
  },
  paymentTitle: { color: COLORS.text, fontSize: 18, fontWeight: "900" },
  paymentSub: { color: COLORS.sub, fontSize: 13, lineHeight: 19, marginTop: 6 },
  paymentLabel: { color: COLORS.sub, fontSize: 13, fontWeight: "900", marginTop: 14, marginBottom: 7 },
  paymentInput: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
  },
  paymentAmountBadge: {
    marginTop: 10,
    borderRadius: 999,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  paymentAmountText: { color: "#166534", fontSize: 13, fontWeight: "900" },
  paymentActionBtn: {
    height: 50,
    borderRadius: 10,
    backgroundColor: COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  confirmPaymentBtn: {
    height: 50,
    borderRadius: 10,
    backgroundColor: COLORS.green,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },

  reachedBtn: {
    backgroundColor: COLORS.green,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  reachedBtnText: { color: COLORS.white, fontSize: 16, fontWeight: "900" },
  navigateBtn: {
    backgroundColor: COLORS.brand,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  navigateBtnText: { color: COLORS.white, fontSize: 16, fontWeight: "900" },
  cancelBtn: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  cancelBtnText: { color: COLORS.danger, fontSize: 16, fontWeight: "900" },
});
