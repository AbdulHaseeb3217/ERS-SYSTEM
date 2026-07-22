// screens/ActiveBikeRideScreen.jsx

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
  Animated,
  Easing,
  Dimensions,
  Pressable,
  Modal,
  TextInput,
  Platform,
  PermissionsAndroid,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import Geolocation from "@react-native-community/geolocation";
import { CommonActions } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { GOOGLE_MAPS_APIKEY } from "../services/apiConfig";
import {
  fetchBikeRideStatus,
  updateBikeRideStatus,
  updateBikeRiderLiveLocation,
  markBikeRidePaymentPending,
  updateBikeRidePaymentAmount,
  confirmBikeRidePaymentReceived,
} from "../services/bikeRideRequests";

const bikeIcon = require("../assets/sportbike.png");

const { width: SCREEN_W } = Dimensions.get("window");

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

  if (typeof value === "string") {
    return value;
  }

  return value._id || value.id || null;
};

const normalizeRideStatus = (status) =>
  String(status || "").toLowerCase().replace("-", "_");

const getInitialRideStage = (status) => {
  const safeStatus = normalizeRideStatus(status);

  if (safeStatus === "arrived_at_patient" || safeStatus === "arrived_at_pickup") {
    return "arrived_pickup";
  }

  if (safeStatus === "navigating_to_hospital" || safeStatus === "in_progress") {
    return "to_destination";
  }

  if (safeStatus === "payment_pending") {
    return "payment_pending";
  }

  if (safeStatus === "completed") {
    return "completed";
  }

  return "to_pickup";
};

const getInitialProgress = (status) => {
  const safeStatus = normalizeRideStatus(status);

  if (safeStatus === "arrived_at_patient" || safeStatus === "arrived_at_pickup") return 42;
  if (safeStatus === "navigating_to_hospital" || safeStatus === "in_progress") return 60;
  if (safeStatus === "payment_pending") return 90;
  if (safeStatus === "completed") return 100;

  return 14;
};

const getInitialStatusText = (status) => {
  const safeStatus = normalizeRideStatus(status);

  if (safeStatus === "arrived_at_patient" || safeStatus === "arrived_at_pickup") {
    return "Reached Patient Location";
  }

  if (safeStatus === "navigating_to_hospital" || safeStatus === "in_progress") {
    return "Navigating to Hospital";
  }

  if (safeStatus === "payment_pending") {
    return "Payment Pending";
  }

  if (safeStatus === "completed") {
    return "Ride Completed";
  }

  return "Navigating to Patient Location";
};

export default function ActiveBikeRideScreen({ navigation, route }) {
  const routeParams = route?.params || {};
  const { ride: initialRide, rider } = routeParams;

  // Live backend status updates ke liye current ride state
  // (initial route param ko immutable rakhte hue)
  const [ride, setRide] = useState(initialRide || null);

  const mapRef = useRef(null);
  const fullMapRef = useRef(null);
  const mapFittedOnceRef = useRef(false);
  const tracksTimerRef = useRef(null);
  const lastBackendLocationUpdateRef = useRef(0);
  const routeCoordinatesRef = useRef([]);

  const riderId =
    getMongoId(rider) ||
    getMongoId(routeParams.rider) ||
    routeParams.riderId ||
    getMongoId(ride?.rider) ||
    getMongoId(ride?.riderInfo);

  const rideId = getMongoId(ride) || routeParams.rideId || routeParams.requestId;

  const riderName =
    rider?.fullName ||
    rider?.name ||
    ride?.rider?.fullName ||
    ride?.riderInfo?.name ||
    "Bike Rider";

  const riderPhone =
    rider?.phone ||
    ride?.rider?.phone ||
    ride?.riderInfo?.phone ||
    "N/A";

  const passengerName = ride?.patientInfo?.name || "Passenger";
  const passengerPhone = ride?.patientInfo?.phone || "N/A";

  const getCleanShortAddress = (address, fallback = "Location not available") => {
    const raw = String(address || "").trim();

    if (!raw) {
      return fallback;
    }

    const parts = raw
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    const cleanedParts = parts.filter((part) => {
      const plusCodeRegex = /^[A-Z0-9]{4,}\+[A-Z0-9]{2,}/i;
      return !plusCodeRegex.test(part);
    });

    const finalParts = cleanedParts.length > 0 ? cleanedParts : parts;

    return finalParts.slice(0, 3).join(", ") || fallback;
  };

  const getLocationDisplayName = (
    location,
    fallback = "Location not available",
    options = {}
  ) => {
    const name = String(location?.name || "").trim();
    const address = String(location?.address || "").trim();

    const isGenericCurrent =
      name.toLowerCase() === "current location" ||
      name.toLowerCase() === "my location";

    if (name && !isGenericCurrent) {
      return name;
    }

    if (options.useAddressForCurrent && address) {
      return getCleanShortAddress(address, fallback);
    }

    if (name) {
      return name;
    }

    if (address) {
      return getCleanShortAddress(address, fallback);
    }

    return fallback;
  };

  const pickupName = getLocationDisplayName(
    ride?.pickupLocation,
    "Pickup location not available",
    { useAddressForCurrent: true }
  );

  const destinationName = getLocationDisplayName(
    ride?.dropoffLocation,
    "Destination not available",
    { useAddressForCurrent: false }
  );

  const destinationFullAddress =
    ride?.dropoffLocation?.address || destinationName;

  const pickupLat = Number(
    ride?.pickupLocation?.coordinates?.[1] ??
      ride?.pickupLocation?.lat ??
      ride?.pickupLocation?.latitude ??
      0
  );

  const pickupLng = Number(
    ride?.pickupLocation?.coordinates?.[0] ??
      ride?.pickupLocation?.lng ??
      ride?.pickupLocation?.longitude ??
      0
  );

  const initialDestinationLat = Number(
    ride?.dropoffLocation?.coordinates?.[1] ??
      ride?.dropoffLocation?.lat ??
      ride?.dropoffLocation?.latitude ??
      0
  );

  const initialDestinationLng = Number(
    ride?.dropoffLocation?.coordinates?.[0] ??
      ride?.dropoffLocation?.lng ??
      ride?.dropoffLocation?.longitude ??
      0
  );

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

  // Backend ki purani rider location sirf emergency fallback ke liye hai.
  // First map load par marker/blue route hamesha device ki fresh current GPS location se banega.
  const initialRiderCoord =
    getCoordFromLocation(ride?.riderLiveLocation) ||
    getCoordFromLocation(ride?.rider?.location) ||
    getCoordFromLocation(ride?.riderLocation) ||
    getCoordFromLocation(rider?.location);

  const lastRiderLocationRef = useRef(initialRiderCoord);

  const [riderLocation, setRiderLocation] = useState(initialRiderCoord);
  const [markerCoord, setMarkerCoord] = useState(initialRiderCoord);
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  // ✅ NEW: calculatedHeading for marker rotation (ambulance-style)
  const [calculatedHeading, setCalculatedHeading] = useState(0);
  const [loadingMap, setLoadingMap] = useState(!initialRiderCoord);
  const [liveETA, setLiveETA] = useState("Calculating...");
  const [liveDistance, setLiveDistance] = useState("Calculating...");
  const [progress, setProgress] = useState(getInitialProgress(ride?.status));
  const [rideStage, setRideStage] = useState(getInitialRideStage(ride?.status));
  const [rideStatusText, setRideStatusText] = useState(
    getInitialStatusText(ride?.status)
  );
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  // ✅ Force MapViewDirections to redraw when rider GPS changes during active navigation.
  // Without this, the marker can move but the blue route may stay on the old origin.
  const [routeRefreshKey, setRouteRefreshKey] = useState(0);
  const [destinationCoord, setDestinationCoord] = useState(
    initialDestinationLat && initialDestinationLng
      ? {
          latitude: initialDestinationLat,
          longitude: initialDestinationLng,
        }
      : null
  );
  const [paymentAmount, setPaymentAmount] = useState(
    ride?.fareAmount !== undefined && ride?.fareAmount !== null
      ? String(ride.fareAmount)
      : ""
  );
  const [paymentAmountSaved, setPaymentAmountSaved] = useState(
    ride?.fareAmount !== undefined && ride?.fareAmount !== null
  );
  const [savingPaymentAmount, setSavingPaymentAmount] = useState(false);
  const [confirmingPaymentReceived, setConfirmingPaymentReceived] = useState(false);


  // ===== LIVE BIKE RIDE STATUS SYNC =====
  // Same behaviour as ActiveAmbulanceRide:
  // Patient side se status change ho to rider screen bina logout/login ke update ho.
  useEffect(() => {
    if (!rideId) return;

    let statusInterval;

    const refreshRideStatus = async () => {
      try {
        const latestRide = await fetchBikeRideStatus(rideId);

        if (!latestRide) return;

        const backendStatus = normalizeRideStatus(latestRide.status);

        setRide(latestRide);

        if (backendStatus === "accepted") {
          setRideStage("to_pickup");
          setProgress(14);
          setRideStatusText("Navigating to Patient Location");
        }

        if (
          backendStatus === "arrived_at_patient" ||
          backendStatus === "arrived_at_pickup"
        ) {
          setRideStage("arrived_pickup");
          setProgress(42);
          setRideStatusText("Reached Patient Location");
        }

        if (
          backendStatus === "in_progress" ||
          backendStatus === "navigating_to_hospital"
        ) {
          setRideStage("to_destination");
          setProgress(60);
          setRideStatusText("Navigating to Hospital");
        }

        if (backendStatus === "payment_pending") {
          setRideStage("payment_pending");
          setProgress(90);
          setRideStatusText("Payment Pending");
        }

        if (backendStatus === "completed") {
          setRideStage("completed");
          setProgress(100);
          setRideStatusText("Ride Completed");
        }

        if (
          latestRide.fareAmount !== undefined &&
          latestRide.fareAmount !== null
        ) {
          setPaymentAmount(String(latestRide.fareAmount));
          setPaymentAmountSaved(true);
        }

      } catch (error) {
        console.log("Bike rider live status refresh error:", error.message);
      }
    };

    refreshRideStatus();

    statusInterval = setInterval(refreshRideStatus, 4000);

    return () => {
      if (statusInterval) clearInterval(statusInterval);
    };
  }, [rideId]);


  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerTrans = useRef(new Animated.Value(0)).current;
  const DRAWER_W = SCREEN_W * 0.72;

  const openDrawer = () => {
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

  const calculateDistanceMeters = (lat1, lng1, lat2, lng2) => {
    if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) {
      return 0;
    }

    const R = 6371000;
    const dLat = ((Number(lat2) - Number(lat1)) * Math.PI) / 180;
    const dLng = ((Number(lng2) - Number(lng1)) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((Number(lat1) * Math.PI) / 180) *
        Math.cos((Number(lat2) * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
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

  // ✅ NEW: Calculate bearing from route coordinates (ambulance-style)
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

    if (tracksTimerRef.current) {
      clearTimeout(tracksTimerRef.current);
    }

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
    // ✅ Only redraw route while rider is actively travelling.
    if (rideStage === "to_pickup" || rideStage === "to_destination") {
      setRouteRefreshKey((prev) => prev + 1);
    }
  };

  const pushRiderLocationToBackend = async (coord, force = false) => {
    try {
      if (!coord || !rideId || !riderId) {
        console.log("Missing rideId/riderId for live location update:", {
          rideId,
          riderId,
          coord,
          rideRider: ride?.rider,
          routeRider: rider,
        });
        return;
      }

      const now = Date.now();

      if (
        !force &&
        lastBackendLocationUpdateRef.current !== 0 &&
        now - lastBackendLocationUpdateRef.current < 3000
      ) {
        return;
      }

      lastBackendLocationUpdateRef.current = now;

      await updateBikeRiderLiveLocation({
        rideId,
        riderId,
        lat: coord.latitude,
        lng: coord.longitude,
      });

      console.log("Bike rider live location updated to backend:", {
        rideId,
        riderId,
        lat: coord.latitude,
        lng: coord.longitude,
      });
    } catch (error) {
      console.log(
        "Bike rider live location backend update error:",
        error.message
      );
    }
  };

  const getCurrentDestination = () => {
    if (rideStage === "to_pickup" || rideStage === "arrived_pickup") {
      return {
        latitude: pickupLat,
        longitude: pickupLng,
      };
    }

    return destinationCoord;
  };

  const getDestinationTitle = () => {
    if (rideStage === "to_pickup" || rideStage === "arrived_pickup") {
      return "Patient Pickup";
    }

    return "Hospital / Destination";
  };

  const getPrimaryButtonText = () => {
    if (updatingStatus) return "Please wait...";
    if (rideStage === "to_pickup") return "Continue";
    if (rideStage === "arrived_pickup") return "Start Ride";
    if (rideStage === "to_destination") return "Reached Hospital";
    if (rideStage === "payment_pending") return "Back to Menu";
    return "Back to Menu";
  };

  const fitMapToRoute = (coords, ref = mapRef) => {
    if (!coords || coords.length < 2 || !ref.current) return;

    ref.current.fitToCoordinates(coords, {
      edgePadding: {
        right: 55,
        bottom: 60,
        left: 55,
        top: 85,
      },
      animated: true,
    });
  };

  const geocodeDestinationAddress = async () => {
    try {
      if (
        !destinationFullAddress ||
        destinationFullAddress === "Destination not available"
      ) {
        return null;
      }

      const url =
        `https://maps.googleapis.com/maps/api/geocode/json` +
        `?address=${encodeURIComponent(destinationFullAddress)}` +
        `&key=${GOOGLE_MAPS_APIKEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK" && data.results?.length > 0) {
        const loc = data.results[0].geometry.location;

        const coord = {
          latitude: Number(loc.lat),
          longitude: Number(loc.lng),
        };

        setDestinationCoord(coord);
        return coord;
      }

      return null;
    } catch (error) {
      console.log("Destination geocode error:", error);
      return null;
    }
  };

  const handleNewRiderLocation = (latestLocation) => {
    const previousLocation = lastRiderLocationRef.current;

    // ✅ Same as ActiveAmbulanceRide:
    // First GPS fix par actual location set hogi aur backend par update hogi.
    if (!previousLocation) {
      lastRiderLocationRef.current = latestLocation;
      setRiderLocation(latestLocation);
      updateMarkerCoord(latestLocation);
      refreshRouteFromCurrentLocation();
      pushRiderLocationToBackend(latestLocation, true);
      setLoadingMap(false);
      return;
    }

    const movedMeters = calculateDistanceMeters(
      previousLocation.latitude,
      previousLocation.longitude,
      latestLocation.latitude,
      latestLocation.longitude
    );

    // ✅ Same ambulance-style movement logic:
    // Rider jab 20 meters ya zyada move karega tabhi current location update hogi,
    // backend par live location save hogi, aur route/marker refresh hoga.
    if (movedMeters >= MIN_REAL_MOVEMENT_METERS) {
      lastRiderLocationRef.current = latestLocation;

      setRiderLocation(latestLocation);
      const snappedPoint = getNearestRoutePoint(latestLocation);
      updateMarkerCoord(snappedPoint || latestLocation);
      refreshRouteFromCurrentLocation();
      setLoadingMap(false);

      // ✅ Backend update se patient tracking screen par bhi rider location live update hogi.
      pushRiderLocationToBackend(latestLocation, true);
    } else {
      setLoadingMap(false);
    }
  };

  const requestAndroidLocationPermission = async () => {
    if (Platform.OS !== "android") {
      return true;
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "Location Permission",
          message: "The Last Hope needs bike rider current location for live route.",
          buttonPositive: "Allow",
          buttonNegative: "Cancel",
        }
      );

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.log("Bike rider location permission error:", error.message);
      return false;
    }
  };

  useEffect(() => {
    let watchId = null;
    let isMounted = true;

    const startLocationTracking = async () => {
      setLoadingMap(!lastRiderLocationRef.current);

      const hasPermission = await requestAndroidLocationPermission();

      if (!isMounted) return;

      if (!hasPermission) {
        if (initialRiderCoord) {
          lastRiderLocationRef.current = initialRiderCoord;
          setRiderLocation(initialRiderCoord);
          updateMarkerCoord(initialRiderCoord);
        }

        setLoadingMap(false);
        Alert.alert(
          "Location Permission Required",
          "Please allow location permission so bike rider route can update live."
        );
        return;
      }

      Geolocation.getCurrentPosition(
        (position) => {
          if (!isMounted) return;

          const { latitude, longitude } = position.coords;

          const latestLocation = {
            latitude: Number(latitude),
            longitude: Number(longitude),
          };

          handleNewRiderLocation(latestLocation);
        },
        (error) => {
          console.log("Initial bike rider location error:", error.message);

          if (initialRiderCoord && isMounted) {
            lastRiderLocationRef.current = initialRiderCoord;
            setRiderLocation(initialRiderCoord);
            updateMarkerCoord(initialRiderCoord);
          }

          if (isMounted) setLoadingMap(false);
        },
        {
          enableHighAccuracy: false,
          timeout: 6000,
          maximumAge: 60000,
        }
      );

      watchId = Geolocation.watchPosition(
        (position) => {
          if (!isMounted) return;

          const { latitude, longitude, accuracy } = position.coords;

          if (
            accuracy != null &&
            Number(accuracy) > MAX_ACCEPTABLE_ACCURACY_METERS &&
            lastRiderLocationRef.current
          ) {
            setLoadingMap(false);
            return;
          }

          const latestLocation = {
            latitude: Number(latitude),
            longitude: Number(longitude),
          };

          handleNewRiderLocation(latestLocation);
        },
        (error) => {
          console.log("Bike Rider Geolocation Watch Error:", error.message);
          if (isMounted) setLoadingMap(false);
        },
        {
          enableHighAccuracy: true,
          distanceFilter: 3,
          interval: 3000,
          fastestInterval: 1500,
        }
      );
    };

    startLocationTracking();

    const mapLoadingFallbackTimer = setTimeout(() => {
      if (isMounted) {
        setLoadingMap(false);
      }
    }, 1500);

    return () => {
      isMounted = false;
      clearTimeout(mapLoadingFallbackTimer);

      if (watchId != null) {
        Geolocation.clearWatch(watchId);
      }

      if (tracksTimerRef.current) {
        clearTimeout(tracksTimerRef.current);
      }
    };
  }, [rideId, riderId]);

  // ✅ Same as ActiveAmbulanceRide:
  // Route blue line rider current location se pickup/dropoff tak banti hai.
  // Marker route ke first coordinate par snap hota hai, taake marker blue line se bahar na jaye.
  const onRouteReady = (result) => {
    const duration = Math.ceil(result.duration);
    const distance = Number(result.distance).toFixed(2);

    setLiveETA(`${duration} mins`);
    setLiveDistance(`${distance} km`);

    if (rideStage === "to_pickup") {
      if (duration <= 2) setProgress(85);
      else if (duration <= 5) setProgress(65);
      else if (duration <= 10) setProgress(45);
      else setProgress(25);
    }

    if (rideStage === "to_destination") {
      if (duration <= 2) setProgress(95);
      else if (duration <= 5) setProgress(88);
      else if (duration <= 10) setProgress(78);
      else setProgress(70);
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
        });
      }
    }
  };

  const handleContinue = async () => {
    if (updatingStatus) return;

    if (rideStage === "to_pickup") {
      try {
        setUpdatingStatus(true);

        if (riderLocation) {
          await pushRiderLocationToBackend(riderLocation, true);
        }

        await updateBikeRideStatus({
          rideId,
          riderId,
          status: "arrived_at_patient",
        });

        setRideStage("arrived_pickup");
        setProgress(42);
        setRideStatusText("Reached Patient Location");

        Alert.alert("Arrived", "You have reached patient pickup location.");
      } catch (error) {
        Alert.alert(
          "Error",
          error.message || "Could not update arrival status."
        );
      } finally {
        setUpdatingStatus(false);
      }

      return;
    }

    if (rideStage === "arrived_pickup") {
      let finalDestination = destinationCoord;

      if (!finalDestination) {
        finalDestination = await geocodeDestinationAddress();
      }

      if (!finalDestination) {
        Alert.alert(
          "Destination Missing",
          "Destination coordinates are not available. Please create a new ride after selecting destination from suggestions."
        );
        return;
      }

      try {
        setUpdatingStatus(true);

        await updateBikeRideStatus({
          rideId,
          riderId,
          status: "navigating_to_hospital",
        });

        mapFittedOnceRef.current = false;
        setRideStage("to_destination");
        setProgress(60);
        setRideStatusText("Navigating to Hospital");

        Alert.alert("Ride Started", "Now navigating to hospital / destination.");
      } catch (error) {
        Alert.alert("Error", error.message || "Could not start ride.");
      } finally {
        setUpdatingStatus(false);
      }

      return;
    }

    if (rideStage === "to_destination") {
      try {
        setUpdatingStatus(true);

        const updatedRide = await markBikeRidePaymentPending({
          rideId,
          riderId,
        });

        setRideStage("payment_pending");
        setProgress(90);
        setRideStatusText("Payment Pending");
        // Payment pending par rider hospital pohanch chuka hota hai, isliye blue route remove.
        routeCoordinatesRef.current = [];
        setMarkerCoord(null);
        mapFittedOnceRef.current = false;
        setLiveETA("Arrived");
        setLiveDistance("0 km");

        if (
          updatedRide?.fareAmount !== undefined &&
          updatedRide?.fareAmount !== null
        ) {
          setPaymentAmount(String(updatedRide.fareAmount));
          setPaymentAmountSaved(true);
        }

        Alert.alert(
          "Payment Pending",
          "Ride reached hospital. Please collect payment from patient."
        );
      } catch (error) {
        Alert.alert("Error", error.message || "Could not move ride to payment pending.");
      } finally {
        setUpdatingStatus(false);
      }

      return;
    }

    if (rideStage === "payment_pending") {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "BikeRiderMenu", params: { rider } }],
        })
      );
      return;
    }

    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "BikeRiderMenu", params: { rider } }],
      })
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

      const updatedRide = await updateBikeRidePaymentAmount({
        rideId,
        riderId,
        fareAmount: amount,
      });

      setPaymentAmount(String(updatedRide?.fareAmount ?? amount));
      setPaymentAmountSaved(true);

      Alert.alert(
        "Amount Sent",
        `Payment amount Rs. ${updatedRide?.fareAmount ?? amount} has been sent to patient.`
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

            await confirmBikeRidePaymentReceived({
              rideId,
              riderId,
            });

            setRideStage("completed");
            setProgress(100);
            setRideStatusText("Ride Completed");

            Alert.alert("Completed", "Payment confirmed and bike ride completed.", [
              {
                text: "OK",
                onPress: () => {
                  navigation.dispatch(
                    CommonActions.reset({
                      index: 0,
                      routes: [{ name: "BikeRiderMenu", params: { rider } }],
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

  const handleCancelRide = () => {
    Alert.alert("Cancel Ride", "Are you sure you want to cancel this ride?", [
      {
        text: "No",
        style: "cancel",
      },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            setUpdatingStatus(true);

            await updateBikeRideStatus({
              rideId,
              riderId,
              status: "cancelled",
              cancelledBy: "rider",
            });

            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: "BikeRiderMenu", params: { rider } }],
              })
            );
          } catch (error) {
            Alert.alert("Error", error.message || "Could not cancel ride.");
          } finally {
            setUpdatingStatus(false);
          }
        },
      },
    ]);
  };

  // ✅ Top-down / drone-view bike icon like ride-hailing apps.
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

  const renderBikeMarker = (size = 46) => {
    if (!riderLocation) return null;

    // ✅ Travel stages mein marker blue route par snap rahega.
    // ✅ Reached Patient / Payment / Completed mein old snapped point use nahi hoga,
    // warna fullscreen map par marker purani route location par show hota hai.
    const shouldUseSnappedMarker =
      rideStage === "to_pickup" || rideStage === "to_destination";

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

  const renderPassengerMarker = (size = 31) => {
    // ✅ Navigating to Hospital / Payment / Completed par patient marker hide rahega.
    // Is stage par rider patient ko pickup kar chuka hota hai.
    if (rideStage === "to_destination" || rideStage === "payment_pending" || rideStage === "completed") {
      return null;
    }

    if (!pickupLat || !pickupLng) return null;

    return (
      <Marker
        coordinate={{
          latitude: pickupLat,
          longitude: pickupLng,
        }}
        title="Patient Pickup Location"
        description={pickupName}
        tracksViewChanges={true}
      >
        <View
          style={[
            styles.passengerMarkerWrap,
            { width: size + 12, height: size + 12 },
          ]}
        >
          <Text style={[styles.passengerMarkerText, { fontSize: size - 4 }]}> 
            👤
          </Text>
        </View>
      </Marker>
    );
  };

  const renderDestinationMarker = (size = 30) => {
    // ✅ Accepted / Reached Patient state mein hospital marker map par show nahi hoga.
    // Hospital marker sirf hospital navigation/payment/completed stage mein show hoga.
    if (!destinationCoord) return null;
    if (
      rideStage !== "to_destination" &&
      rideStage !== "payment_pending" &&
      rideStage !== "completed"
    ) {
      return null;
    }

    return (
      <Marker
        coordinate={destinationCoord}
        title="Hospital / Destination"
        description={destinationName}
        tracksViewChanges={true}
      >
        <View
          style={[
            styles.destinationMarkerWrap,
            { width: size + 12, height: size + 12 },
          ]}
        >
          <Text style={[styles.destinationMarkerText, { fontSize: size - 6 }]}>
            🏥
          </Text>
        </View>
      </Marker>
    );
  };

  const renderDirections = (isFullScreen = false) => {
    const currentDestination = getCurrentDestination();

    if (!riderLocation || !currentDestination) return null;

    if (rideStage === "arrived_pickup" || rideStage === "payment_pending" || rideStage === "completed") {
      return null;
    }

    return (
      <MapViewDirections
        key={`bike-route-${rideStage}-${routeRefreshKey}-${riderLocation.latitude}-${riderLocation.longitude}-${currentDestination.latitude}-${currentDestination.longitude}-${isFullScreen ? "full" : "small"}`}
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
          console.log("Bike Ride Direction Error:", errorMessage);
        }}
      />
    );
  };

  const renderMap = (isFullScreen = false) => {
    const currentDestination = getCurrentDestination();

    if (loadingMap && !riderLocation) {
      return (
        <View style={styles.mapPlaceholder}>
          <ActivityIndicator size="small" color={COLORS.brand} />
          <Text style={styles.mapPlaceholderTitle}>Loading Map...</Text>
          <Text style={styles.mapPlaceholderSub}>Fetching rider location</Text>
        </View>
      );
    }

    if (!riderLocation || !currentDestination) {
      return (
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapIcon}>◎</Text>
          <Text style={styles.mapPlaceholderTitle}>Google Maps View</Text>
          <Text style={styles.mapPlaceholderSub}>
            Rider current location or route destination is not available
          </Text>
        </View>
      );
    }

    return (
      <MapView
        ref={isFullScreen ? fullMapRef : mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: riderLocation.latitude,
          longitude: riderLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {renderBikeMarker(42)}
        {renderPassengerMarker(isFullScreen ? 36 : 31)}
        {renderDestinationMarker(isFullScreen ? 36 : 30)}
        {renderDirections(isFullScreen)}
      </MapView>
    );
  };

  const hasPickupLocation = pickupLat !== 0 && pickupLng !== 0;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.brand} />

      <Modal
        visible={isMapFullscreen}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setIsMapFullscreen(false)}
      >
        <View style={styles.fullscreenContainer}>
          <StatusBar
            barStyle="dark-content"
            backgroundColor="transparent"
            translucent
          />

          {renderMap(true)}

          <TouchableOpacity
            style={styles.closeFullscreenBtn}
            onPress={() => setIsMapFullscreen(false)}
            activeOpacity={0.85}
          >
            <Text style={styles.closeFullscreenIcon}>✕</Text>
            <Text style={styles.closeFullscreenText}>Close</Text>
          </TouchableOpacity>

          <View style={styles.fullscreenETABadge}>
            <Text style={styles.fullscreenETAText}>
              {getDestinationTitle()} • {liveDistance} • {liveETA}
            </Text>
          </View>
        </View>
      </Modal>

      <View style={styles.topbar}>
        <View style={styles.leftBrand}>
          <View style={styles.brandCircle}>
            <Image source={bikeIcon} style={styles.brandIcon} />
          </View>

          <View>
            <Text style={styles.brandTitle}>Bike Rider</Text>
            <Text style={styles.brandSub} numberOfLines={1}>
              {riderName}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.menuBtn}
          onPress={openDrawer}
        >
          <View style={styles.menuDash} />
          <View style={styles.menuDash} />
          <View style={styles.menuDash} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.progressTop}>
            <Text style={styles.smallLabel}>Progress</Text>
            <Text style={styles.progressPercent}>{progress}%</Text>
          </View>

          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>

          <Text style={styles.progressText}>{rideStatusText}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Passenger Details</Text>

            <View style={styles.rideBadge}>
              <Text style={styles.rideBadgeText}>Bike Ride</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.infoLabel}>Passenger Name</Text>
          <Text style={styles.infoValue}>{passengerName}</Text>

          <View style={styles.phoneRow}>
            <Text style={styles.phoneIcon}>📞</Text>
            <Text style={styles.phoneText}>{passengerPhone}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Location & Navigation</Text>

          <View style={styles.divider} />

          <View style={styles.mapBox}>
            {renderMap(false)}

            <TouchableOpacity
              style={styles.fullscreenBtn}
              onPress={() => setIsMapFullscreen(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.fullscreenBtnText}>⛶</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.locationBlock}>
            <Text style={styles.locationIconRed}>👤</Text>

            <View style={styles.locationTextWrap}>
              <Text style={styles.locationLabel}>Patient Pickup</Text>
              <Text style={styles.locationValue} numberOfLines={2}>
                {pickupName}
              </Text>
              <Text style={styles.locationSub}>
                {hasPickupLocation
                  ? `${liveDistance} • ${liveETA}`
                  : "Pickup coordinates not available"}
              </Text>
            </View>
          </View>

          <View style={styles.locationBlock}>
            <Text style={styles.locationIconGreen}>➤</Text>

            <View style={styles.locationTextWrap}>
              <Text style={styles.locationLabel}>Destination</Text>
              <Text style={styles.locationValue} numberOfLines={2}>
                {destinationName}
              </Text>
              <Text style={styles.locationSub}>
                {destinationCoord
                  ? "Destination location ready"
                  : "Destination coordinates not available yet"}
              </Text>
            </View>
          </View>
        </View>


        {rideStage === "payment_pending" && (
          <View style={styles.paymentBox}>
            <Text style={styles.paymentTitle}>Payment Collection</Text>
            <Text style={styles.paymentSub}>
              Enter the payment amount in PKR and send it to the patient. After receiving payment, confirm it below.
            </Text>

            <Text style={styles.paymentLabel}>Payment Amount in PKR</Text>
            <TextInput
              style={styles.paymentInput}
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
              <View style={styles.paymentAmountBadge}>
                <Text style={styles.paymentAmountText}>Sent Amount: Rs. {paymentAmount}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.paymentActionBtn, savingPaymentAmount && { opacity: 0.65 }]}
              activeOpacity={0.85}
              onPress={handleSavePaymentAmount}
              disabled={savingPaymentAmount}
            >
              {savingPaymentAmount ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.continueText}>Send Amount to Patient</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmPaymentBtn, confirmingPaymentReceived && { opacity: 0.65 }]}
              activeOpacity={0.85}
              onPress={handleConfirmPaymentReceived}
              disabled={confirmingPaymentReceived}
            >
              {confirmingPaymentReceived ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.continueText}>Confirm Payment Received</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.continueBtn,
            rideStage === "completed" && styles.completedBtn,
            updatingStatus && { opacity: 0.65 },
          ]}
          activeOpacity={0.85}
          onPress={handleContinue}
          disabled={updatingStatus}
        >
          {updatingStatus ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.continueText}>{getPrimaryButtonText()}</Text>
          )}
        </TouchableOpacity>

        {rideStage !== "completed" && rideStage !== "payment_pending" && (
          <TouchableOpacity
            style={[styles.cancelBtn, updatingStatus && { opacity: 0.65 }]}
            activeOpacity={0.85}
            onPress={handleCancelRide}
            disabled={updatingStatus}
          >
            <Text style={styles.cancelText}>Cancel Ride</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {drawerOpen && (
        <>
          <Pressable style={styles.backdrop} onPress={closeDrawer} />

          <Animated.View
            style={[styles.drawer, { width: DRAWER_W }, drawerStyle]}
          >
            <View style={styles.driverBox}>
              <View style={styles.driverLeft}>
                <View style={styles.avatar}>
                  <Image source={bikeIcon} style={styles.avatarImg} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.driverName} numberOfLines={1}>
                    {riderName}
                  </Text>

                  <Text style={styles.driverPhone}>{riderPhone}</Text>

                  <View style={styles.badgeInline}>
                    <Text style={styles.badgeText}>Active Ride</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                onPress={closeDrawer}
                style={styles.closeBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.item}
              activeOpacity={0.85}
              onPress={() => {
                navigation.navigate("BikeRiderPastHistory", { rider });
                closeDrawer();
              }}
            >
              <View style={[styles.itemIcon, { backgroundColor: "#E8F0FF" }]}>
                <Text style={styles.itemIconText}>🕓</Text>
              </View>

              <Text style={styles.itemText}>Past History</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.item}
              activeOpacity={0.85}
              onPress={() => {
                navigation.navigate("BikeRiderProfileManagement", { rider });
                closeDrawer();
              }}
            >
              <View style={[styles.itemIcon, { backgroundColor: "#FFF4E6" }]}>
                <Text style={styles.itemIconText}>👤</Text>
              </View>

              <Text style={styles.itemText}>Profile Management</Text>
            </TouchableOpacity>

            <View style={styles.drawerDivider} />

            <TouchableOpacity
              style={[styles.item, { marginTop: 6 }]}
              activeOpacity={0.85}
              onPress={() => {
                Alert.alert("Logout", "Are you sure you want to logout?", [
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
                        await AsyncStorage.removeItem("ERS_SESSION");
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
                ]);
              }}
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
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  topbar: {
    height: 92,
    backgroundColor: COLORS.brand,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 30,
  },

  leftBrand: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  brandCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF20",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  brandIcon: {
    width: 22,
    height: 22,
    tintColor: "#FFFFFF",
  },

  brandTitle: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 20,
  },

  brandSub: {
    color: "#DBEAFE",
    fontSize: 14,
    marginTop: 2,
    maxWidth: 180,
  },

  menuBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF20",
  },

  menuDash: {
    width: 24,
    height: 3,
    backgroundColor: "#FFFFFF",
    marginVertical: 2.5,
    borderRadius: 2,
  },

  container: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    paddingBottom: 28,
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 14,
  },

  progressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  smallLabel: {
    color: COLORS.sub,
    fontSize: 13,
    fontWeight: "800",
  },

  progressPercent: {
    color: COLORS.brandDark,
    fontSize: 13,
    fontWeight: "900",
  },

  progressBg: {
    height: 6,
    borderRadius: 4,
    backgroundColor: "#D1D5DB",
    overflow: "hidden",
    marginTop: 10,
  },

  progressFill: {
    height: "100%",
    backgroundColor: COLORS.text,
  },

  progressText: {
    textAlign: "center",
    color: COLORS.text,
    fontSize: 15,
    marginTop: 14,
    fontWeight: "800",
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
  },

  rideBadge: {
    backgroundColor: "#DBEAFE",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },

  rideBadgeText: {
    color: COLORS.brandDark,
    fontSize: 12,
    fontWeight: "900",
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },

  infoLabel: {
    color: COLORS.sub,
    fontSize: 13,
    fontWeight: "800",
  },

  infoValue: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 5,
  },

  phoneRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  phoneIcon: {
    fontSize: 15,
    marginRight: 9,
  },

  phoneText: {
    color: COLORS.brandDark,
    fontSize: 16,
    fontWeight: "900",
  },

  mapBox: {
    height: 245,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
  },

  map: {
    ...StyleSheet.absoluteFillObject,
  },

  mapPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  mapIcon: {
    fontSize: 34,
    color: "#9CA3AF",
  },

  mapPlaceholderTitle: {
    color: COLORS.sub,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 8,
  },

  mapPlaceholderSub: {
    color: COLORS.sub,
    fontSize: 12,
    marginTop: 5,
  },

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

  fullscreenBtnText: {
    color: COLORS.text,
    fontSize: 21,
    fontWeight: "900",
    marginTop: -2,
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

  passengerMarkerWrap: {
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
  },

  passengerMarkerText: {
    textAlign: "center",
  },

  destinationMarkerWrap: {
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: COLORS.green,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
  },

  destinationMarkerText: {
    textAlign: "center",
  },

  locationBlock: {
    flexDirection: "row",
    marginTop: 14,
  },

  locationIconRed: {
    width: 30,
    fontSize: 20,
  },

  locationIconGreen: {
    width: 30,
    fontSize: 20,
    color: COLORS.green,
  },

  locationTextWrap: {
    flex: 1,
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

  continueBtn: {
    height: 50,
    borderRadius: 8,
    backgroundColor: COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  completedBtn: {
    backgroundColor: COLORS.green,
  },

  continueText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },

  cancelBtn: {
    height: 50,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "900",
  },


  paymentBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 14,
  },

  paymentTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
  },

  paymentSub: {
    color: COLORS.sub,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },

  paymentLabel: {
    color: COLORS.sub,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 14,
    marginBottom: 7,
  },

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

  paymentAmountText: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "900",
  },

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

  fullscreenContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },

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

  closeFullscreenIcon: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "900",
    marginRight: 6,
  },

  closeFullscreenText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "900",
  },

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

  fullscreenETAText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "900",
  },

  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.25)",
    zIndex: 1,
  },

  drawer: {
    position: "absolute",
    top: 40,
    bottom: 10,
    right: 0,
    backgroundColor: COLORS.white,
    paddingTop: 12,
    paddingHorizontal: 16,
    shadowColor: "rgba(15,23,42,0.14)",
    shadowOpacity: 0.25,
    shadowOffset: { width: -6, height: 0 },
    shadowRadius: 18,
    elevation: 12,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
    zIndex: 2,
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
    flex: 1,
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
    tintColor: COLORS.brand,
  },

  driverName: {
    color: COLORS.text,
    fontWeight: "800",
  },

  driverPhone: {
    color: COLORS.sub,
    fontSize: 12,
    marginTop: 2,
  },

  badgeInline: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 10,
    height: 22,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DBEAFE",
  },

  badgeText: {
    fontWeight: "800",
    fontSize: 11,
    color: COLORS.brandDark,
  },

  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F3F6",
    marginLeft: 6,
  },

  closeText: {
    fontSize: 16,
    color: COLORS.text,
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
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  itemIconText: {
    fontSize: 18,
    color: COLORS.text,
  },

  itemText: {
    fontSize: 15.5,
    color: COLORS.text,
    fontWeight: "600",
  },

  drawerDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 10,
    borderRadius: 1,
  },
});