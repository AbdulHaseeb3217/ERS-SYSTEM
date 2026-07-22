// ActiveAmbulanceRide.jsx

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
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import Geolocation from "@react-native-community/geolocation";
import { CommonActions } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { buildUrl } from "../services/apiConfig";

const ambulanceIcon = require("../assets/ambulance.png");
const ambulanceIconInMap = require("../assets/ambulanceinmap.png");

const { width: SCREEN_W } = Dimensions.get("window");

const GOOGLE_MAPS_APIKEY = "AIzaSyA7D56WKApJ8Ash580RI_SroCDi27-MghE";

const MIN_REAL_MOVEMENT_METERS = 12;
const MAX_ACCEPTABLE_ACCURACY_METERS = 50;
const MAX_FIRST_FIX_ACCURACY_METERS = 80;

const COLORS = {
  brand: "#DC2626",
  brandDark: "#B91C1C",
  bg: "#F6F7F9",
  white: "#FFFFFF",
  text: "#0F172A",
  sub: "#64748B",
  border: "#E5E7EB",
  blue: "#2563EB",
  green: "#16A34A",
};

export default function ActiveAmbulanceRide({ navigation, route }) {
  const { request, driver, autoHospitalSelection } = route.params || {};

  const savedDriverLat = Number(
    driver?.location?.coordinates?.[1] ||
      request?.driver?.location?.coordinates?.[1] ||
      0
  );

  const savedDriverLng = Number(
    driver?.location?.coordinates?.[0] ||
      request?.driver?.location?.coordinates?.[0] ||
      0
  );

  const initialDriverCoordinate =
    Number.isFinite(savedDriverLat) &&
    Number.isFinite(savedDriverLng) &&
    savedDriverLat !== 0 &&
    savedDriverLng !== 0
      ? {
          latitude: savedDriverLat,
          longitude: savedDriverLng,
        }
      : null;

  const mapRef = useRef(null);
  const fullMapRef = useRef(null);
  const lastDriverLocationRef = useRef(initialDriverCoordinate);
  const mapFittedOnceRef = useRef(false);
  const routeCoordinatesRef = useRef([]);
  const tracksTimerRef = useRef(null);
  const autoHospitalSelectionHandledRef = useRef(false);
  const appliedPatientHospitalRef = useRef(null);
  const hospitalRouteOriginRef = useRef(null);
  const latestDriverLocationRef = useRef(initialDriverCoordinate);
  const nearbyHospitalsRef = useRef([]);
  const hospitalFetchInProgressRef = useRef(false);
  const arrivedHospitalsLoadedRef = useRef(false);

  const requestId = request?._id || request?.id;
  const driverId = driver?._id || driver?.id;

  const driverName = driver?.fullName || "Ambulance Driver";
  const driverPhone = driver?.phone || "03XXXXXXXXX";

  const initialStatus = request?.status;

  const [driverLocation, setDriverLocation] = useState(
    initialDriverCoordinate
  );
  const [markerCoord, setMarkerCoord] = useState(initialDriverCoordinate);
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  const [calculatedHeading, setCalculatedHeading] = useState(0);
  const [liveETA, setLiveETA] = useState("Calculating...");
  const [liveDistance, setLiveDistance] = useState("Calculating...");
  const [progress, setProgress] = useState(
    initialStatus === "payment_pending"
      ? 90
      : initialStatus === "navigating_to_hospital"
      ? 75
      : 14
  );
  const [loadingMap, setLoadingMap] = useState(
    !initialDriverCoordinate
  );
  const [rideStatusText, setRideStatusText] = useState(
    initialStatus === "payment_pending"
      ? "Payment Pending"
      : initialStatus === "navigating_to_hospital"
      ? "Navigating to Hospital"
      : "Navigating to Patient Location"
  );
  const [rideReached, setRideReached] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  const [hospitalSelectionMode, setHospitalSelectionMode] = useState(
    initialStatus === "payment_pending"
  );
  const [nearbyHospitals, setNearbyHospitals] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [routedHospital, setRoutedHospital] = useState(null);
  const [loadingHospitalDetails, setLoadingHospitalDetails] = useState(false);
  const [hospitalRouteCoords, setHospitalRouteCoords] = useState(null);
  const [selectedHospitalCoord, setSelectedHospitalCoord] = useState(null);
  const [loadingDirection, setLoadingDirection] = useState(false);
  const [patientLockedHospital, setPatientLockedHospital] = useState(
    initialStatus === "payment_pending"
  );
  const [savedPatientHospital, setSavedPatientHospital] = useState(null);
  const [confirmingHospital, setConfirmingHospital] = useState(false);
  const [showHospitalDetailsCard, setShowHospitalDetailsCard] = useState(false);
  const [isNavigatingToHospital, setIsNavigatingToHospital] = useState(
    initialStatus === "navigating_to_hospital"
  );

  const [isPaymentPending, setIsPaymentPending] = useState(
    initialStatus === "payment_pending"
  );
  const [requestForValue, setRequestForValue] = useState(
    request?.requestFor || ""
  );
  const [paymentAmount, setPaymentAmount] = useState(
    request?.fareAmount !== undefined && request?.fareAmount !== null
      ? String(request.fareAmount)
      : ""
  );
  const [paymentAmountSaved, setPaymentAmountSaved] = useState(
    request?.fareAmount !== undefined && request?.fareAmount !== null
  );
  const [savingPaymentAmount, setSavingPaymentAmount] = useState(false);
  const [confirmingPaymentReceived, setConfirmingPaymentReceived] =
    useState(false);

  // ===== Drawer =====
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

  const patientName = request?.patientInfo?.name || "Patient";
  const patientPhone = request?.patientInfo?.phone || "N/A";

  const requestForLabel =
    requestForValue === "self"
      ? "For Yourself"
      : requestForValue === "family"
      ? "For Your Family"
      : requestForValue === "random_person"
      ? "For Random Person"
      : requestForValue
      ? String(requestForValue)
          .replace(/_/g, " ")
          .replace(/\b\w/g, (letter) => letter.toUpperCase())
      : "Not specified";

  const patientLat = Number(
    request?.pickupLocation?.coordinates?.[1] || request?.pickupLocation?.lat || 0
  );

  const patientLng = Number(
    request?.pickupLocation?.coordinates?.[0] || request?.pickupLocation?.lng || 0
  );

  const pickupAddress =
    request?.pickupLocation?.address || "Patient pickup location not available";

  const routedHospitalName =
    hospitalRouteCoords && hospitalRouteCoords.length > 0
      ? selectedHospitalCoord?.name
      : null;

  const hospitalBottomName =
    selectedHospital?.name || routedHospitalName || "Select nearest hospital";

  const destination =
    hospitalSelectionMode
      ? selectedHospital?.name || routedHospitalName || "Select hospital from map"
      : request?.hospitalName || request?.destination?.address || "Hospital not selected yet";

  const lockedHospitalLabel =
    selectedHospital?.selectedBy === "driver"
      ? "Hospital selected by driver"
      : selectedHospital?.selectedBy === "patient"
      ? "Hospital selected by patient"
      : "Hospital selected";

  const shouldHidePatientMarker = isNavigatingToHospital || isPaymentPending;
  const shouldShowLockedHospital =
    patientLockedHospital || isNavigatingToHospital || isPaymentPending;

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

  const calculateDistanceKm = (lat1, lng1, lat2, lng2) => {
    const meters = calculateDistanceMeters(lat1, lng1, lat2, lng2);
    return (meters / 1000).toFixed(2);
  };

  const getTodayOpeningTime = (weekdayText) => {
    if (!weekdayText || !Array.isArray(weekdayText) || weekdayText.length === 0) {
      return "Opening timing not available";
    }

    const jsDay = new Date().getDay();
    const googleDayIndex = jsDay === 0 ? 6 : jsDay - 1;

    return weekdayText[googleDayIndex] || "Opening timing not available";
  };

  const closeHospitalDetails = () => {
    if (patientLockedHospital || isNavigatingToHospital || isPaymentPending) {
      setShowHospitalDetailsCard(false);
      return;
    }

    setSelectedHospital(null);
    setShowHospitalDetailsCard(false);
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

  const getNearestRoutePoint = (location) => {
    const routeCoordinates = routeCoordinatesRef.current;

    if (!location || !Array.isArray(routeCoordinates) || routeCoordinates.length === 0) {
      return null;
    }

    let nearestPoint = null;
    let nearestDistance = Infinity;

    routeCoordinates.forEach((point) => {
      const distance = calculateDistanceMeters(
        location.latitude,
        location.longitude,
        point.latitude,
        point.longitude
      );

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestPoint = point;
      }
    });

    return nearestPoint;
  };

  const updateMarkerCoord = (coord) => {
    if (!coord) return;

    setMarkerCoord(coord);
    flashTracksViewChanges();
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

  const syncDriverLocationToBackend = async (latitude, longitude, heading) => {
    try {
      if (driverId) {
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
      }
    } catch (error) {
      console.log("Driver location sync error:", error);
    }
  };

  useEffect(() => {
    setLoadingMap(!latestDriverLocationRef.current);

    const watchId = Geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, heading, accuracy } = position.coords;

        const latestLocation = {
          latitude: Number(latitude),
          longitude: Number(longitude),
        };

        const previousLocation = lastDriverLocationRef.current;

        if (
          previousLocation &&
          accuracy != null &&
          Number(accuracy) > MAX_ACCEPTABLE_ACCURACY_METERS
        ) {
          return;
        }

        if (!previousLocation) {
          lastDriverLocationRef.current = latestLocation;
          latestDriverLocationRef.current = latestLocation;
          setDriverLocation(latestLocation);
          updateMarkerCoord(latestLocation);
          setLoadingMap(false);

          await syncDriverLocationToBackend(latitude, longitude, heading);
          return;
        }

        const movedMeters = calculateDistanceMeters(
          previousLocation.latitude,
          previousLocation.longitude,
          latestLocation.latitude,
          latestLocation.longitude
        );

        if (movedMeters >= MIN_REAL_MOVEMENT_METERS) {
          lastDriverLocationRef.current = latestLocation;
          latestDriverLocationRef.current = latestLocation;

          setDriverLocation(latestLocation);
          const snappedPoint = getNearestRoutePoint(latestLocation);
          updateMarkerCoord(snappedPoint || latestLocation);
          setLoadingMap(false);

          await syncDriverLocationToBackend(latitude, longitude, heading);
        } else {
          setLoadingMap(false);
        }
      },
      (error) => {
        console.log("Driver Geolocation Watch Error:", error.message);
        setLoadingMap(false);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 5,
        interval: 3000,
        fastestInterval: 1500,
      }
    );

    const mapLoadingFallbackTimer = setTimeout(() => {
      setLoadingMap(false);
    }, 1500);

    return () => {
      Geolocation.clearWatch(watchId);
      clearTimeout(mapLoadingFallbackTimer);

      if (tracksTimerRef.current) {
        clearTimeout(tracksTimerRef.current);
      }
    };
  }, [driverId]);

  const fetchNearbyHospitals = async (lat, lng) => {
    const latitude = Number(lat);
    const longitude = Number(lng);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude === 0 ||
      longitude === 0 ||
      hospitalFetchInProgressRef.current
    ) {
      return false;
    }

    hospitalFetchInProgressRef.current = true;

    try {
      const url =
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
        `?location=${latitude},${longitude}` +
        `&radius=3000` +
        `&type=hospital` +
        `&key=${GOOGLE_MAPS_APIKEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK" || data.status === "ZERO_RESULTS") {
        const hospitals = Array.isArray(data.results) ? data.results : [];
        nearbyHospitalsRef.current = hospitals;
        setNearbyHospitals(hospitals);
        arrivedHospitalsLoadedRef.current = true;
        return true;
      }

      console.log("Hospitals API response:", data.status, data.error_message);
      return false;
    } catch (error) {
      console.log("Hospitals API Error:", error);
      return false;
    } finally {
      hospitalFetchInProgressRef.current = false;
    }
  };

  const normalizeSavedHospital = (hospital) => {
    if (!hospital) return null;

    const coords = hospital?.location?.coordinates;

    const lat =
      hospital.lat ??
      hospital.latitude ??
      (Array.isArray(coords) ? coords[1] : null);

    const lng =
      hospital.lng ??
      hospital.longitude ??
      (Array.isArray(coords) ? coords[0] : null);

    if (lat == null || lng == null) return null;

    return {
      placeId: hospital.placeId || hospital.place_id || "",
      name: hospital.name || "Selected Hospital",
      address: hospital.address || hospital?.location?.address || "Address not available",
      rating: hospital.rating || "Rating not available",
      openNow:
        hospital.openNow === true
          ? true
          : hospital.openNow === false
          ? false
          : null,
      openingTime: hospital.openingTime || "Opening timing not available",
      phone: hospital.phone || "",
      lat: Number(lat),
      lng: Number(lng),
      selectedBy: hospital.selectedBy || "",
    };
  };

  const showRouteToHospital = async (hospital, fitMap = true) => {
    if (!hospital) return;

    if (!driverLocation) {
      Alert.alert("Location Required", "Driver current location is not available yet.");
      return;
    }

    try {
      setLoadingDirection(true);

      const origin = `${driverLocation.latitude},${driverLocation.longitude}`;
      const destinationPoint = `${hospital.lat},${hospital.lng}`;

      const url =
        `https://maps.googleapis.com/maps/api/directions/json` +
        `?origin=${origin}` +
        `&destination=${destinationPoint}` +
        `&mode=driving` +
        `&key=${GOOGLE_MAPS_APIKEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK" && data.routes.length > 0) {
        const route = data.routes[0];
        const points = route.overview_polyline.points;
        const coords = decodePolyline(points);

        const leg = route.legs?.[0];
        const distanceText = leg?.distance?.text || "Calculating...";
        const durationText = leg?.duration?.text || "Calculating...";

        const distanceKm = calculateDistanceKm(
          driverLocation.latitude,
          driverLocation.longitude,
          hospital.lat,
          hospital.lng
        );

        const hospitalWithDistance = {
          ...hospital,
          distanceKm,
        };

        routeCoordinatesRef.current = coords;
        hospitalRouteOriginRef.current = {
          latitude: driverLocation.latitude,
          longitude: driverLocation.longitude,
        };

        setLiveDistance(distanceText);
        setLiveETA(durationText);
        setHospitalRouteCoords(coords);
        setSelectedHospital(hospitalWithDistance);
        setRoutedHospital(hospitalWithDistance);
        setSelectedHospitalCoord({
          latitude: Number(hospital.lat),
          longitude: Number(hospital.lng),
          name: hospital.name,
        });

        updateRouteBearing(coords);

        const allCoords = [
          {
            latitude: Number(driverLocation.latitude),
            longitude: Number(driverLocation.longitude),
          },
          {
            latitude: Number(hospital.lat),
            longitude: Number(hospital.lng),
          },
          ...coords,
        ];

        if (fitMap && mapRef.current) {
          mapRef.current.fitToCoordinates(allCoords, {
            edgePadding: { right: 60, bottom: 80, left: 60, top: 80 },
          });
        }

        if (fitMap && fullMapRef.current) {
          fullMapRef.current.fitToCoordinates(allCoords, {
            edgePadding: { right: 80, bottom: 120, left: 80, top: 120 },
          });
        }
      } else {
        Alert.alert("Direction Error", "Could not find route to this hospital.");
      }
    } catch (error) {
      console.log("Direction API Error:", error);
      Alert.alert("Error", "Could not fetch direction.");
    } finally {
      setLoadingDirection(false);
    }
  };

  const fetchSelectedHospitalFromBackend = async () => {
    try {
      if (!requestId) return;

      const res = await fetch(buildUrl(`/api/ambulance/status/${requestId}`));
      const data = await res.json();

      if (data?.success && data?.request?.requestFor) {
        setRequestForValue(data.request.requestFor);
      }

      if (data?.success && data?.request?.status === "payment_pending") {
        setIsPaymentPending(true);
        setIsNavigatingToHospital(false);
        setRideStatusText("Payment Pending");
        setProgress(90);
        setRideReached(true);
        setHospitalSelectionMode(true);
        setPatientLockedHospital(true);
        setNearbyHospitals([]);
        setShowHospitalDetailsCard(false);

        if (
          data?.request?.fareAmount !== undefined &&
          data?.request?.fareAmount !== null
        ) {
          setPaymentAmount(String(data.request.fareAmount));
          setPaymentAmountSaved(true);
        }
      }

      if (data?.success && data?.request?.status === "navigating_to_hospital") {
        setIsNavigatingToHospital(true);
        setIsPaymentPending(false);
        setRideStatusText("Navigating to Hospital");
        setProgress(75);
        setRideReached(true);
        setHospitalSelectionMode(true);
      }

      const hospital = data?.request?.selectedHospital;

      if (data?.success && hospital) {
        setSavedPatientHospital(hospital);
      }
    } catch (error) {
      console.log("Selected hospital polling error:", error);
    }
  };

  useEffect(() => {
    let interval;

    if (hospitalSelectionMode && requestId && !patientLockedHospital) {
      fetchSelectedHospitalFromBackend();
      interval = setInterval(fetchSelectedHospitalFromBackend, 4000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [hospitalSelectionMode, requestId, patientLockedHospital]);

  useEffect(() => {
    if (!hospitalSelectionMode || !savedPatientHospital || !driverLocation) {
      return;
    }

    const hospital = normalizeSavedHospital(savedPatientHospital);
    if (!hospital) return;

    const hospitalKey = `${hospital.placeId || hospital.name}-${hospital.lat}-${hospital.lng}`;

    const distanceKm = calculateDistanceKm(
      driverLocation.latitude,
      driverLocation.longitude,
      hospital.lat,
      hospital.lng
    );

    const hospitalForDriver = {
      ...hospital,
      distanceKm,
    };

    if (!isPaymentPending) {
      setIsNavigatingToHospital(true);
      setRideStatusText("Navigating to Hospital");
      setProgress(75);
    }

    setPatientLockedHospital(true);
    setNearbyHospitals([]);
    setSelectedHospital(hospitalForDriver);
    setShowHospitalDetailsCard(false);
    setSelectedHospitalCoord({
      latitude: hospitalForDriver.lat,
      longitude: hospitalForDriver.lng,
      name: hospitalForDriver.name,
    });

    if (appliedPatientHospitalRef.current !== hospitalKey) {
      appliedPatientHospitalRef.current = hospitalKey;
      showRouteToHospital(hospitalForDriver, true);
    }
  }, [savedPatientHospital, driverLocation, hospitalSelectionMode, isPaymentPending]);

  useEffect(() => {
    const hospital = selectedHospital || routedHospital;

    if (
      !isNavigatingToHospital ||
      isPaymentPending ||
      !hospitalSelectionMode ||
      !patientLockedHospital ||
      !driverLocation ||
      !hospital
    ) {
      return;
    }

    const lastOrigin = hospitalRouteOriginRef.current;

    const movedMeters = lastOrigin
      ? calculateDistanceMeters(
          lastOrigin.latitude,
          lastOrigin.longitude,
          driverLocation.latitude,
          driverLocation.longitude
        )
      : 9999;

    if (!lastOrigin || movedMeters >= 25) {
      showRouteToHospital(hospital, false);
    }
  }, [
    driverLocation?.latitude,
    driverLocation?.longitude,
    isNavigatingToHospital,
    isPaymentPending,
    hospitalSelectionMode,
    patientLockedHospital,
    selectedHospital?.lat,
    selectedHospital?.lng,
    routedHospital?.lat,
    routedHospital?.lng,
  ]);

  useEffect(() => {
    if (request?.status === "payment_pending") {
      setIsPaymentPending(true);
      setIsNavigatingToHospital(false);
      setRideStatusText("Payment Pending");
      setProgress(90);
      setRideReached(true);
      setHospitalSelectionMode(true);
      setPatientLockedHospital(true);
      setNearbyHospitals([]);
      setShowHospitalDetailsCard(false);

      if (
        request?.fareAmount !== undefined &&
        request?.fareAmount !== null
      ) {
        setPaymentAmount(String(request.fareAmount));
        setPaymentAmountSaved(true);
      }

      if (request?.selectedHospital && driverLocation) {
        setSavedPatientHospital(request.selectedHospital);
      }
    }
  }, [request?.status, request?.fareAmount, request?.selectedHospital, driverLocation]);

  useEffect(() => {
    const shouldAutoOpenHospitalSelection =
      autoHospitalSelection === true ||
      request?.status === "arrived_at_patient" ||
      request?.status === "navigating_to_hospital" ||
      request?.status === "payment_pending";

    if (
      shouldAutoOpenHospitalSelection &&
      !autoHospitalSelectionHandledRef.current &&
      driverLocation &&
      patientLat !== 0 &&
      patientLng !== 0
    ) {
      autoHospitalSelectionHandledRef.current = true;

      setRideReached(true);
      setHospitalSelectionMode(true);

      if (request?.status === "payment_pending") {
        setIsPaymentPending(true);
        setIsNavigatingToHospital(false);
        setRideStatusText("Payment Pending");
        setProgress(90);
        setPatientLockedHospital(true);
        setNearbyHospitals([]);
        setShowHospitalDetailsCard(false);
      } else if (request?.status === "navigating_to_hospital") {
        setIsPaymentPending(false);
        setIsNavigatingToHospital(true);
        setRideStatusText("Navigating to Hospital");
        setProgress(75);
      } else {
        setIsPaymentPending(false);
        setIsNavigatingToHospital(false);
        setRideStatusText("Select Nearest Hospital");
        setProgress(42);
      }

      setSelectedHospital(null);
      setHospitalRouteCoords(null);
      setRoutedHospital(null);
      setSelectedHospitalCoord(null);
      setShowHospitalDetailsCard(
        request?.status !== "navigating_to_hospital" &&
          request?.status !== "payment_pending"
      );
      setSavedPatientHospital(null);
      appliedPatientHospitalRef.current = null;
      hospitalRouteOriginRef.current = null;

      if (request?.selectedHospital) {
        setSavedPatientHospital(request.selectedHospital);
        return;
      }

      if (
        request?.status !== "navigating_to_hospital" &&
        request?.status !== "payment_pending"
      ) {
        fetchNearbyHospitals(driverLocation.latitude, driverLocation.longitude);
      }
    }
  }, [
    autoHospitalSelection,
    request?.status,
    request?.selectedHospital,
    driverLocation,
    patientLat,
    patientLng,
  ]);

  const handleHospitalPress = async (hospital) => {
    if (patientLockedHospital || isNavigatingToHospital || isPaymentPending) {
      return;
    }

    if (!driverLocation) {
      Alert.alert("Location Required", "Driver current location is not available yet.");
      return;
    }

    const hospitalLat = hospital?.geometry?.location?.lat;
    const hospitalLng = hospital?.geometry?.location?.lng;

    const distanceKm = calculateDistanceKm(
      driverLocation.latitude,
      driverLocation.longitude,
      hospitalLat,
      hospitalLng
    );

    setSelectedHospital({
      placeId: hospital.place_id,
      name: hospital.name,
      address: hospital.vicinity || "Address not available",
      distanceKm,
      rating: hospital.rating || "Rating not available",
      openNow:
        hospital.opening_hours?.open_now === true
          ? true
          : hospital.opening_hours?.open_now === false
          ? false
          : null,
      openingTime: "Loading opening timing...",
      lat: hospitalLat,
      lng: hospitalLng,
    });

    setShowHospitalDetailsCard(true);

    setHospitalRouteCoords(null);
    setRoutedHospital(null);
    hospitalRouteOriginRef.current = null;
    setSelectedHospitalCoord({
      latitude: hospitalLat,
      longitude: hospitalLng,
      name: hospital.name,
    });

    try {
      setLoadingHospitalDetails(true);

      const url =
        `https://maps.googleapis.com/maps/api/place/details/json` +
        `?place_id=${hospital.place_id}` +
        `&fields=name,formatted_address,rating,opening_hours,formatted_phone_number` +
        `&key=${GOOGLE_MAPS_APIKEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.result) {
        const details = data.result;

        setSelectedHospitalCoord({
          latitude: hospitalLat,
          longitude: hospitalLng,
          name: details.name || hospital.name,
        });

        setSelectedHospital({
          placeId: hospital.place_id,
          name: details.name || hospital.name,
          address:
            details.formatted_address ||
            hospital.vicinity ||
            "Address not available",
          distanceKm,
          rating: details.rating || hospital.rating || "Rating not available",
          openNow:
            details.opening_hours?.open_now === true
              ? true
              : details.opening_hours?.open_now === false
              ? false
              : hospital.opening_hours?.open_now === true
              ? true
              : hospital.opening_hours?.open_now === false
              ? false
              : null,
          openingTime: getTodayOpeningTime(details.opening_hours?.weekday_text),
          phone: details.formatted_phone_number || "",
          lat: hospitalLat,
          lng: hospitalLng,
        });

        setShowHospitalDetailsCard(true);
      }
    } catch (error) {
      console.log("Hospital Details API Error:", error);
    } finally {
      setLoadingHospitalDetails(false);
    }
  };

  const decodePolyline = (encoded) => {
    const poly = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      poly.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }

    return poly;
  };

  const handleGetDirection = async () => {
    if (!selectedHospital) return;

    if (!driverLocation) {
      Alert.alert("Location Required", "Driver current location is not available yet.");
      return;
    }

    await showRouteToHospital(selectedHospital, true);
  };

  const onRouteReady = async (result) => {
    const duration = Math.ceil(result.duration);
    const distance = Number(result.distance).toFixed(2);

    setLiveETA(`${duration} mins`);
    setLiveDistance(`${distance} km`);

    if (!rideReached) {
      if (duration <= 2) {
        setProgress(85);
      } else if (duration <= 5) {
        setProgress(65);
      } else if (duration <= 10) {
        setProgress(45);
      } else {
        setProgress(25);
      }
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

    try {
      if (requestId) {
        await fetch(buildUrl("/api/ambulance/travel-info/update"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId,
            distance,
            duration,
          }),
        });
      }
    } catch (error) {
      console.log("Travel info update error:", error);
    }
  };

  const onFullscreenRouteReady = async (result) => {
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


  // ===== LIVE AMBULANCE STATUS SYNC =====
  // Keeps driver screen in sync with patient actions without logout/login
  useEffect(() => {
    if (!requestId) return;

    let statusInterval = null;

    const refreshRideStatus = async () => {
      try {
        const res = await fetch(buildUrl(`/api/ambulance/status/${requestId}`));
        const data = await res.json();

        if (!data?.success || !data?.request) return;

        const backendStatus = data.request.status;

        if (data.driver) {
          // keep latest driver data if backend sends it
        }

        if (backendStatus === "accepted") {
          setRideStatusText("Navigating to Patient Location");
          setProgress(14);
          setRideReached(false);
          setHospitalSelectionMode(false);
          setIsNavigatingToHospital(false);
          setIsPaymentPending(false);
          arrivedHospitalsLoadedRef.current = false;
        }

        if (
          backendStatus === "in-progress" ||
          backendStatus === "in_progress"
        ) {
          setRideStatusText("Navigating to Patient Location");
          setProgress(14);
          setRideReached(false);
          setHospitalSelectionMode(false);
          setIsNavigatingToHospital(false);
          setIsPaymentPending(false);
          arrivedHospitalsLoadedRef.current = false;
        }

        if (backendStatus === "arrived_at_patient") {
          setRideReached(true);
          setRideStatusText("Reached Patient Location");
          setProgress(100);
          setHospitalSelectionMode(true);
          setIsNavigatingToHospital(false);
          setIsPaymentPending(false);
          setPatientLockedHospital(false);

          // The polling callback previously captured the first render's
          // driverLocation (usually null). Always search around the patient's
          // selected pickup coordinates, with latest driver GPS only as fallback.
          if (
            !arrivedHospitalsLoadedRef.current &&
            nearbyHospitalsRef.current.length === 0
          ) {
            const latestDriverLocation = latestDriverLocationRef.current;
            const searchLat =
              patientLat !== 0
                ? patientLat
                : latestDriverLocation?.latitude;
            const searchLng =
              patientLng !== 0
                ? patientLng
                : latestDriverLocation?.longitude;

            if (searchLat != null && searchLng != null) {
              await fetchNearbyHospitals(searchLat, searchLng);
            }
          }
        }

        if (backendStatus === "navigating_to_hospital") {
          setRideReached(true);
          setHospitalSelectionMode(true);
          setIsNavigatingToHospital(true);
          setIsPaymentPending(false);
          setRideStatusText("Navigating to Hospital");
          setProgress(75);

          if (data.request.selectedHospital) {
            setSavedPatientHospital(data.request.selectedHospital);
          }
        }

        if (backendStatus === "payment_pending") {
          setRideReached(true);
          setHospitalSelectionMode(true);
          setIsNavigatingToHospital(false);
          setIsPaymentPending(true);
          setPatientLockedHospital(true);
          setRideStatusText("Payment Pending");
          setProgress(90);

          if (
            data.request.fareAmount !== undefined &&
            data.request.fareAmount !== null
          ) {
            setPaymentAmount(String(data.request.fareAmount));
            setPaymentAmountSaved(true);
          }
        }

        if (backendStatus === "completed") {
          setRideStatusText("Completed");
          setProgress(100);
          setIsPaymentPending(false);
          setIsNavigatingToHospital(false);
        }
      } catch (error) {
        console.log("Driver live status refresh error:", error);
      }
    };

    refreshRideStatus();
    statusInterval = setInterval(refreshRideStatus, 4000);

    return () => {
      if (statusInterval) clearInterval(statusInterval);
    };
  }, [requestId]);

  const handleContinue = async () => {
    if (rideReached && !hospitalSelectionMode) {
      if (!driverLocation) {
        Alert.alert("Location Required", "Driver current location is not available yet.");
        return;
      }

      setHospitalSelectionMode(true);
      setRideStatusText("Select Nearest Hospital");
      setProgress(42);
      setSelectedHospital(null);
      setHospitalRouteCoords(null);
      setRoutedHospital(null);
      setSelectedHospitalCoord(null);
      setShowHospitalDetailsCard(true);
      setPatientLockedHospital(false);
      setSavedPatientHospital(null);
      setIsNavigatingToHospital(false);
      setIsPaymentPending(false);
      appliedPatientHospitalRef.current = null;
      hospitalRouteOriginRef.current = null;

      try {
        if (requestId) {
          const res = await fetch(buildUrl(`/api/ambulance/status/${requestId}`));
          const data = await res.json();

          if (data?.success && data?.request?.status === "payment_pending") {
            setIsPaymentPending(true);
            setIsNavigatingToHospital(false);
            setRideStatusText("Payment Pending");
            setProgress(90);
          }

          if (data?.success && data?.request?.status === "navigating_to_hospital") {
            setIsPaymentPending(false);
            setIsNavigatingToHospital(true);
            setRideStatusText("Navigating to Hospital");
            setProgress(75);
          }

          if (data?.success && data?.request?.selectedHospital) {
            setSavedPatientHospital(data.request.selectedHospital);
            return;
          }
        }
      } catch (error) {
        console.log("Initial selected hospital check error:", error);
      }

      fetchNearbyHospitals(driverLocation.latitude, driverLocation.longitude);

      return;
    }

    try {
      if (requestId) {
        await fetch(buildUrl("/api/ambulance/status/update"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId,
            status: "arrived_at_patient",
          }),
        });
      }

      setRideStatusText("Reached Patient Location");
      setProgress(100);
      setRideReached(true);
      setHospitalSelectionMode(true);
      setPatientLockedHospital(false);
      setIsNavigatingToHospital(false);
      setIsPaymentPending(false);
      setSelectedHospital(null);
      setHospitalRouteCoords(null);
      setRoutedHospital(null);
      setSelectedHospitalCoord(null);
      setShowHospitalDetailsCard(false);
      nearbyHospitalsRef.current = [];
      arrivedHospitalsLoadedRef.current = false;

      // Load hospitals immediately when the driver reaches the patient.
      // The patient's selected pickup point is the correct search centre.
      const latestDriverLocation = latestDriverLocationRef.current;
      const searchLat =
        patientLat !== 0 ? patientLat : latestDriverLocation?.latitude;
      const searchLng =
        patientLng !== 0 ? patientLng : latestDriverLocation?.longitude;

      if (searchLat != null && searchLng != null) {
        await fetchNearbyHospitals(searchLat, searchLng);
      }

      if (mapRef.current && patientLat !== 0 && patientLng !== 0) {
        mapRef.current.animateToRegion(
          {
            latitude: patientLat,
            longitude: patientLng,
            latitudeDelta: 0.055,
            longitudeDelta: 0.055,
          },
          700
        );
      }

      // ✅ Reached patient par driver-patient blue route remove kar do.
      // Hospital select hone tak koi blue line show nahi hogi.
      routeCoordinatesRef.current = [];
      setHospitalRouteCoords(null);
      setRoutedHospital(null);
      setSelectedHospitalCoord(null);

      Alert.alert("Ride Status", "Reached Patient Location.");
    } catch (error) {
      Alert.alert("Error", "Could not update ride status.");
    }
  };

  const handleConfirmHospitalSelection = async () => {
    const hospitalToConfirm = selectedHospital || routedHospital;

    if (!hospitalToConfirm) {
      Alert.alert("Error", "Please select a hospital first.");
      return;
    }

    if (!hospitalRouteCoords || hospitalRouteCoords.length === 0) {
      Alert.alert("Error", "Please tap Get Direction before confirming hospital.");
      return;
    }

    const hospitalLat =
      hospitalToConfirm?.lat ??
      hospitalToConfirm?.latitude ??
      selectedHospitalCoord?.latitude;

    const hospitalLng =
      hospitalToConfirm?.lng ??
      hospitalToConfirm?.longitude ??
      selectedHospitalCoord?.longitude;

    if (hospitalLat == null || hospitalLng == null) {
      Alert.alert("Error", "Selected hospital location is missing. Please select hospital again.");
      return;
    }

    if (patientLockedHospital || isNavigatingToHospital || isPaymentPending) {
      Alert.alert(
        "Hospital Selected",
        `${hospitalToConfirm?.name || routedHospitalName} selected successfully.`
      );
      return;
    }

    try {
      setConfirmingHospital(true);

      const res = await fetch(buildUrl("/api/ambulance/hospital/select"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          selectedHospital: {
            placeId: hospitalToConfirm?.placeId || "",
            name: hospitalToConfirm?.name || routedHospitalName || "",
            address: hospitalToConfirm?.address || "",
            rating: hospitalToConfirm?.rating,
            openNow: hospitalToConfirm?.openNow,
            openingTime: hospitalToConfirm?.openingTime || "",
            phone: hospitalToConfirm?.phone || "",
            lat: Number(hospitalLat),
            lng: Number(hospitalLng),
          },
          selectedBy: "driver",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        Alert.alert("Error", data.message || "Could not confirm hospital selection.");
        return;
      }

      const savedHospitalFromResponse =
        data?.request?.selectedHospital || data?.selectedHospital;

      const lockedHospital = savedHospitalFromResponse
        ? normalizeSavedHospital(savedHospitalFromResponse)
        : {
            ...hospitalToConfirm,
            lat: Number(hospitalLat),
            lng: Number(hospitalLng),
            selectedBy: "driver",
          };

      if (lockedHospital) {
        const distanceKm = calculateDistanceKm(
          driverLocation.latitude,
          driverLocation.longitude,
          lockedHospital.lat,
          lockedHospital.lng
        );

        const hospitalForDriver = {
          ...lockedHospital,
          distanceKm,
        };

        setSelectedHospital(hospitalForDriver);
        setRoutedHospital(hospitalForDriver);
        setSavedPatientHospital(savedHospitalFromResponse || hospitalForDriver);
        setSelectedHospitalCoord({
          latitude: hospitalForDriver.lat,
          longitude: hospitalForDriver.lng,
          name: hospitalForDriver.name,
        });

        await showRouteToHospital(hospitalForDriver, true);
      }

      setIsNavigatingToHospital(true);
      setIsPaymentPending(false);
      setRideStatusText("Navigating to Hospital");
      setProgress(75);
      setPatientLockedHospital(true);
      setNearbyHospitals([]);
      setHospitalSelectionMode(true);
      setShowHospitalDetailsCard(false);

      Alert.alert(
        "Hospital Selected",
        `${hospitalToConfirm?.name || routedHospitalName} selected successfully.`
      );
    } catch (error) {
      Alert.alert("Error", "Network error while confirming hospital.");
    } finally {
      setConfirmingHospital(false);
    }
  };

  const handleRideCompleted = async () => {
    Alert.alert("Complete Ride", "Are you sure this ride is completed?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Complete",
        onPress: async () => {
          try {
            if (requestId) {
              const res = await fetch(buildUrl("/api/ambulance/payment/pending"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  requestId,
                }),
              });

              const data = await res.json();

              if (!res.ok || !data.success) {
                Alert.alert("Error", data.message || "Could not move to payment pending.");
                return;
              }

              if (
                data?.request?.fareAmount !== undefined &&
                data?.request?.fareAmount !== null
              ) {
                setPaymentAmount(String(data.request.fareAmount));
                setPaymentAmountSaved(true);
              }
            }

            setRideStatusText("Payment Pending");
            setProgress(90);
            setIsNavigatingToHospital(false);
            setIsPaymentPending(true);
            setPatientLockedHospital(true);
            setHospitalSelectionMode(true);
            setNearbyHospitals([]);
            setShowHospitalDetailsCard(false);

            Alert.alert(
              "Payment Pending",
              "Ride reached hospital. Please collect payment from patient."
            );
          } catch (error) {
            Alert.alert("Error", "Network error while moving to payment pending.");
          }
        },
      },
    ]);
  };

  const handleSavePaymentAmount = async () => {
    const amount = Number(paymentAmount);

    if (!paymentAmount || Number.isNaN(amount) || amount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid payment amount in PKR.");
      return;
    }

    try {
      setSavingPaymentAmount(true);

      const res = await fetch(buildUrl("/api/ambulance/payment/amount/update"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          fareAmount: amount,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        Alert.alert("Error", data.message || "Could not save payment amount.");
        return;
      }

      setPaymentAmount(String(data?.fareAmount ?? amount));
      setPaymentAmountSaved(true);
      setRideStatusText("Payment Pending");
      setProgress(90);

      Alert.alert(
        "Amount Sent",
        `Payment amount Rs. ${data?.fareAmount ?? amount} has been sent to patient.`
      );
    } catch (error) {
      Alert.alert("Error", "Network error while saving payment amount.");
    } finally {
      setSavingPaymentAmount(false);
    }
  };

  const handleConfirmPaymentReceived = async () => {
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
        text: "Yes, Payment Received",
        onPress: async () => {
          try {
            setConfirmingPaymentReceived(true);

            const res = await fetch(buildUrl("/api/ambulance/payment/confirm"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                requestId,
              }),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
              Alert.alert("Error", data.message || "Could not confirm payment.");
              return;
            }

            setRideStatusText("Completed");
            setProgress(100);
            setIsPaymentPending(false);
            setIsNavigatingToHospital(false);
            setPatientLockedHospital(true);
            setHospitalSelectionMode(false);
            setShowHospitalDetailsCard(false);

            Alert.alert("Payment Received", "Ride completed successfully.", [
              {
                text: "OK",
                onPress: () => {
                  navigation.dispatch(
                    CommonActions.reset({
                      index: 0,
                      routes: [{ name: "AmbulanceDriverMenu", params: { driver } }],
                    })
                  );
                },
              },
            ]);
          } catch (error) {
            Alert.alert("Error", "Network error while confirming payment.");
          } finally {
            setConfirmingPaymentReceived(false);
          }
        },
      },
    ]);
  };

  const handleCancelRide = () => {
    Alert.alert("Cancel Ride", "Are you sure you want to cancel this ride?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            if (requestId) {
              await fetch(buildUrl("/api/ambulance/status/update"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  requestId,
                  status: "cancelled",
                  cancelledBy: "driver",
                  cancelledByName: driverName,
                }),
              });
            }

            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: "AmbulanceDriverMenu", params: { driver } }],
              })
            );
          } catch (error) {
            Alert.alert("Error", "Could not cancel ride.");
          }
        },
      },
    ]);
  };

  const goProfile = () => {
    navigation.navigate("AmbulanceDriverProfileManagement", { driver });
    closeDrawer();
  };

  const goHistory = () => {
    navigation.navigate("AmbulanceDriverPastRides", { driver });
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

  const renderHospitalRoute = () => (
    <>
      {!isPaymentPending && hospitalRouteCoords && hospitalRouteCoords.length > 0 && (
        <Polyline
          coordinates={hospitalRouteCoords}
          strokeColor={COLORS.blue}
          strokeWidth={5}
        />
      )}
    </>
  );

  const renderHospitalMarker = (h, i, size = 24) => {
    const hospitalLat = h?.geometry?.location?.lat;
    const hospitalLng = h?.geometry?.location?.lng;

    return (
      <Marker
        key={h.place_id || i}
        coordinate={{ latitude: hospitalLat, longitude: hospitalLng }}
        onPress={() => handleHospitalPress(h)}
        tracksViewChanges={true}
      >
        <View style={styles.hospitalPinWrap}>
          <View style={[styles.hospitalPinCircle, { width: size + 12, height: size + 12 }]}>
            <Text style={[styles.hospitalPinText, { fontSize: size - 4 }]}>✚</Text>
          </View>
          <View style={styles.hospitalPinTail} />
        </View>
      </Marker>
    );
  };

  const renderSelectedHospitalMarker = () => {
    if (!selectedHospitalCoord) return null;

    return (
      <Marker
        coordinate={{
          latitude: Number(selectedHospitalCoord.latitude),
          longitude: Number(selectedHospitalCoord.longitude),
        }}
        title={selectedHospitalCoord.name || "Selected Hospital"}
        tracksViewChanges={true}
        onPress={() => setShowHospitalDetailsCard(true)}
      >
        <View style={styles.hospitalPinWrap}>
          <View style={[styles.hospitalPinCircle, { width: 36, height: 36 }]}>
            <Text style={[styles.hospitalPinText, { fontSize: 20 }]}>✚</Text>
          </View>
          <View style={styles.hospitalPinTail} />
        </View>
      </Marker>
    );
  };

  const renderHospitalDetailsCard = (isFullScreen = false) => {
    if (!selectedHospital) return null;

    return (
      <View
        style={[
          styles.hospitalDetailsOverlay,
          isFullScreen ? styles.fullscreenHospitalDetailsOverlay : null,
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.calloutOuter}>
          <View style={styles.calloutBox}>
            <TouchableOpacity
              style={styles.closeDetailsBtn}
              onPress={closeHospitalDetails}
              activeOpacity={0.8}
            >
              <Text style={styles.closeDetailsText}>×</Text>
            </TouchableOpacity>

            <Text style={styles.calloutTitle}>{selectedHospital?.name}</Text>

            <View style={styles.calloutRow}>
              <Text style={styles.calloutIcon}>⌖</Text>
              <Text style={styles.calloutText}>
                {selectedHospital?.address || "Address not available"}
              </Text>
            </View>

            <View style={styles.calloutRow}>
              <Text style={styles.calloutIconBlue}>↝</Text>
              <Text style={styles.calloutDistance}>{selectedHospital?.distanceKm} km</Text>
              <Text style={styles.calloutText}> from current location</Text>
            </View>

            <View style={styles.calloutDivider} />

            <View style={styles.calloutRatingRow}>
              <View style={styles.calloutRatingLeft}>
                <Text style={styles.starIcon}>★</Text>
                <Text style={styles.calloutRatingText}>
                  {selectedHospital?.rating || "Rating not available"}
                </Text>
              </View>

              <View style={styles.calloutVerticalDivider} />

              <View style={styles.calloutRatingRight}>
                <Text
                  style={[
                    styles.calloutOpenText,
                    selectedHospital?.openNow === false ? styles.calloutClosedText : null,
                  ]}
                >
                  {selectedHospital?.openNow === true
                    ? "Open now"
                    : selectedHospital?.openNow === false
                    ? "Closed now"
                    : "Open/closed status not available"}
                </Text>
              </View>
            </View>

            <View style={styles.calloutDivider} />

            <View style={styles.calloutRow}>
              <Text style={styles.calloutClock}>◷</Text>
              <Text style={styles.calloutText}>
                {loadingHospitalDetails
                  ? "Loading opening timing..."
                  : selectedHospital?.openingTime}
              </Text>
            </View>

            {selectedHospital?.phone ? (
              <View style={styles.calloutRow}>
                <Text style={styles.calloutIcon}>☎</Text>
                <Text style={styles.calloutText}>{selectedHospital.phone}</Text>
              </View>
            ) : null}

            {!patientLockedHospital && !isNavigatingToHospital && !isPaymentPending && (
              <TouchableOpacity
                style={[
                  styles.directionBtn,
                  loadingDirection ? styles.directionBtnLoading : null,
                  hospitalRouteCoords ? styles.directionBtnActive : null,
                ]}
                onPress={handleGetDirection}
                activeOpacity={0.85}
              >
                <Text style={styles.directionBtnIcon}>↗</Text>
                <Text style={styles.directionBtnText}>
                  {loadingDirection
                    ? "Getting direction..."
                    : hospitalRouteCoords
                    ? "Route shown on map"
                    : "Get Direction"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderPaymentCollectionForm = () => {
    return (
      <View style={styles.paymentBox}>
        <Text style={styles.paymentTitle}>Payment Collection</Text>

        <Text style={styles.paymentSub}>
          Enter the payment amount in PKR and send it to the patient. After receiving payment, confirm it below.
        </Text>

        <View style={styles.requestForBox}>
          <Text style={styles.requestForTitle}>Request For</Text>
          <Text style={styles.requestForValue}>{requestForLabel}</Text>
        </View>

        <Text style={styles.paymentLabel}>Payment Amount in PKR</Text>

        <TextInput
          style={styles.paymentInput}
          placeholder="Enter amount"
          placeholderTextColor="#94A3B8"
          keyboardType="numeric"
          value={paymentAmount}
          onChangeText={(text) => {
            setPaymentAmount(text);
            setPaymentAmountSaved(false);
          }}
        />

        {paymentAmountSaved && paymentAmount ? (
          <View style={styles.paymentAmountBadge}>
            <Text style={styles.paymentAmountText}>
              Sent Amount: Rs. {paymentAmount}
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[
            styles.paymentActionBtn,
            savingPaymentAmount ? styles.disabledBtn : null,
          ]}
          onPress={handleSavePaymentAmount}
          disabled={savingPaymentAmount}
          activeOpacity={0.85}
        >
          <Text style={styles.continueText}>
            {savingPaymentAmount ? "Sending..." : "Send Amount to Patient"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.confirmPaymentBtn,
            confirmingPaymentReceived ? styles.disabledBtn : null,
          ]}
          onPress={handleConfirmPaymentReceived}
          disabled={confirmingPaymentReceived}
          activeOpacity={0.85}
        >
          <Text style={styles.continueText}>
            {confirmingPaymentReceived
              ? "Confirming..."
              : "Confirm Payment Received"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const hasPatientLocation = patientLat !== 0 && patientLng !== 0;

  const canConfirmHospital =
    !patientLockedHospital &&
    !isNavigatingToHospital &&
    !isPaymentPending &&
    (selectedHospital || routedHospital) &&
    hospitalRouteCoords &&
    hospitalRouteCoords.length > 0;

  const primaryButtonText = hospitalSelectionMode
    ? confirmingHospital
      ? "Confirming..."
      : isNavigatingToHospital
      ? "Ride Completed"
      : patientLockedHospital
      ? "Navigating to Hospital"
      : "Confirm Hospital Selection"
    : rideReached
    ? "Select Nearest Hospital"
    : "Continue";

  const ambulanceMarkerCoordinate =
    (isNavigatingToHospital || isPaymentPending) && driverLocation
      ? driverLocation
      : markerCoord || driverLocation;

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
          <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

          {driverLocation && hasPatientLocation ? (
            <MapView
              ref={fullMapRef}
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={{
                latitude: driverLocation.latitude,
                longitude: driverLocation.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              onPress={
                patientLockedHospital || isNavigatingToHospital || isPaymentPending
                  ? undefined
                  : closeHospitalDetails
              }
            >
              <Marker
                coordinate={ambulanceMarkerCoordinate}
                title="Ambulance Driver"
                rotation={calculatedHeading}
                flat={true}
                anchor={{ x: 0.5, y: 0.5 }}
                tracksViewChanges={tracksViewChanges}
              >
                <Image source={ambulanceIconInMap} style={styles.fullscreenAmbulanceIcon} />
              </Marker>

              {!shouldHidePatientMarker && (
                <Marker
                  coordinate={{
                    latitude: patientLat,
                    longitude: patientLng,
                  }}
                  title="Patient Pickup Location"
                >
                  <Text style={styles.fullscreenPatientMarker}>👤</Text>
                </Marker>
              )}

              {!hospitalSelectionMode &&
                !rideReached &&
                !isNavigatingToHospital &&
                !isPaymentPending && (
                <MapViewDirections
                  origin={{
                    latitude: driverLocation.latitude,
                    longitude: driverLocation.longitude,
                  }}
                  destination={{
                    latitude: patientLat,
                    longitude: patientLng,
                  }}
                  apikey={GOOGLE_MAPS_APIKEY}
                  strokeWidth={8}
                  strokeColor={COLORS.blue}
                  optimizeWaypoints={true}
                  mode="DRIVING"
                  onReady={onFullscreenRouteReady}
                  onError={(errorMessage) => {
                    console.log("Fullscreen Map Direction Error:", errorMessage);
                  }}
                />
              )}

              {hospitalSelectionMode &&
                !patientLockedHospital &&
                !isNavigatingToHospital &&
                !isPaymentPending &&
                nearbyHospitals.map((h, i) => renderHospitalMarker(h, i, 28))}

              {hospitalSelectionMode && shouldShowLockedHospital && renderSelectedHospitalMarker()}

              {hospitalSelectionMode && renderHospitalRoute()}
            </MapView>
          ) : (
            <View style={styles.fullscreenPlaceholder}>
              <ActivityIndicator size="small" color={COLORS.brand} />
              <Text style={styles.fullscreenPlaceholderText}>Map Loading...</Text>
            </View>
          )}

          {hospitalSelectionMode &&
            selectedHospital &&
            showHospitalDetailsCard &&
            renderHospitalDetailsCard(true)}

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
              {isPaymentPending
                ? "Payment Pending"
                : hospitalSelectionMode
                ? isNavigatingToHospital
                  ? `${liveDistance} • ${liveETA}`
                  : hospitalBottomName
                : `${liveDistance} • ${liveETA}`}
            </Text>
          </View>
        </View>
      </Modal>

      <View style={styles.topbar}>
        <View style={styles.leftBrand}>
          <View style={styles.brandCircle}>
            <Image source={ambulanceIcon} style={styles.brandIcon} />
          </View>

          <View>
            <Text style={styles.brandTitle}>Ambulance Driver</Text>
            <Text style={styles.brandSub}>{driverName}</Text>
          </View>
        </View>

        <TouchableOpacity activeOpacity={0.85} style={styles.menuBtn} onPress={openDrawer}>
          <View style={styles.menuDash} />
          <View style={styles.menuDash} />
          <View style={styles.menuDash} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
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
            <Text style={styles.sectionTitle}>Patient Details</Text>
            <View style={styles.emergencyBadge}>
              <Text style={styles.emergencyBadgeText}>Emergency</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.infoLabel}>Patient Name</Text>
          <Text style={styles.infoValue}>{patientName}</Text>

          <View style={styles.phoneRow}>
            <Text style={styles.phoneIcon}>📞</Text>
            <Text style={styles.phoneText}>{patientPhone}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Location & Navigation</Text>

          <View style={styles.divider} />

          <View style={styles.mapBox}>
            {loadingMap ? (
              <View style={styles.mapPlaceholder}>
                <ActivityIndicator size="small" color={COLORS.brand} />
                <Text style={styles.mapPlaceholderTitle}>Loading Map...</Text>
                <Text style={styles.mapPlaceholderSub}>Fetching driver location</Text>
              </View>
            ) : driverLocation && hasPatientLocation ? (
              <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={{
                  latitude: driverLocation.latitude,
                  longitude: driverLocation.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                onPress={
                  patientLockedHospital || isNavigatingToHospital || isPaymentPending
                    ? undefined
                    : closeHospitalDetails
                }
              >
                <Marker
                  coordinate={ambulanceMarkerCoordinate}
                  title="Ambulance Driver"
                  rotation={calculatedHeading}
                  flat={true}
                  anchor={{ x: 0.5, y: 0.5 }}
                  tracksViewChanges={tracksViewChanges}
                >
                  <Image source={ambulanceIconInMap} style={styles.ambulanceMapIcon} />
                </Marker>

                {!shouldHidePatientMarker && (
                  <Marker
                    coordinate={{
                      latitude: patientLat,
                      longitude: patientLng,
                    }}
                    title="Patient Pickup Location"
                  >
                    <Text style={styles.patientMarker}>👤</Text>
                  </Marker>
                )}

                {!hospitalSelectionMode &&
                  !rideReached &&
                  !isNavigatingToHospital &&
                  !isPaymentPending && (
                  <MapViewDirections
                    origin={{
                      latitude: driverLocation.latitude,
                      longitude: driverLocation.longitude,
                    }}
                    destination={{
                      latitude: patientLat,
                      longitude: patientLng,
                    }}
                    apikey={GOOGLE_MAPS_APIKEY}
                    strokeWidth={6}
                    strokeColor={COLORS.blue}
                    optimizeWaypoints={true}
                    mode="DRIVING"
                    onReady={onRouteReady}
                    onError={(errorMessage) => {
                      console.log("Map Direction Error:", errorMessage);
                    }}
                  />
                )}

                {hospitalSelectionMode &&
                  !patientLockedHospital &&
                  !isNavigatingToHospital &&
                  !isPaymentPending &&
                  nearbyHospitals.map((h, i) => renderHospitalMarker(h, i, 22))}

                {hospitalSelectionMode && shouldShowLockedHospital && renderSelectedHospitalMarker()}

                {hospitalSelectionMode && renderHospitalRoute()}
              </MapView>
            ) : (
              <View style={styles.mapPlaceholder}>
                <Text style={styles.mapIcon}>◎</Text>
                <Text style={styles.mapPlaceholderTitle}>Google Maps View</Text>
                <Text style={styles.mapPlaceholderSub}>
                  Driver or patient location is not available
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.fullscreenBtn}
              onPress={() => setIsMapFullscreen(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.fullscreenBtnText}>⛶</Text>
            </TouchableOpacity>

            {hospitalSelectionMode &&
              selectedHospital &&
              showHospitalDetailsCard &&
              renderHospitalDetailsCard(false)}
          </View>

          <View style={styles.locationBlock}>
            <Text style={styles.locationIconRed}>📍</Text>
            <View style={styles.locationTextWrap}>
              <Text style={styles.locationLabel}>
                {hospitalSelectionMode ? "Current Location" : "Patient Location"}
              </Text>
              <Text style={styles.locationValue}>{pickupAddress}</Text>
              <Text style={styles.locationSub}>
                {isPaymentPending
                  ? "Payment collection pending"
                  : hospitalSelectionMode
                  ? isNavigatingToHospital
                    ? `${liveDistance} • ${liveETA}`
                    : patientLockedHospital
                    ? lockedHospitalLabel
                    : "Select hospital and tap Get Direction"
                  : `${liveDistance} • ${liveETA}`}
              </Text>
            </View>
          </View>

          <View style={styles.locationBlock}>
            <Text style={styles.locationIconGreen}>➤</Text>
            <View style={styles.locationTextWrap}>
              <Text style={styles.locationLabel}>Destination</Text>
              <Text style={styles.locationValue}>{destination}</Text>
            </View>
          </View>
        </View>

        {isPaymentPending ? (
          renderPaymentCollectionForm()
        ) : (
          <TouchableOpacity
            style={[
              styles.continueBtn,
              rideReached && !hospitalSelectionMode && styles.reachedBtn,
              hospitalSelectionMode &&
                !isNavigatingToHospital &&
                (!canConfirmHospital || confirmingHospital || patientLockedHospital) &&
                styles.disabledBtn,
              isNavigatingToHospital && styles.reachedBtn,
            ]}
            activeOpacity={0.85}
            onPress={
              isNavigatingToHospital
                ? handleRideCompleted
                : hospitalSelectionMode
                ? handleConfirmHospitalSelection
                : handleContinue
            }
            disabled={
              hospitalSelectionMode &&
              !isNavigatingToHospital &&
              (!canConfirmHospital || confirmingHospital || patientLockedHospital)
            }
          >
            <Text style={styles.continueText}>{primaryButtonText}</Text>
          </TouchableOpacity>
        )}

        {!isPaymentPending && (
          <TouchableOpacity style={styles.cancelBtn} activeOpacity={0.85} onPress={handleCancelRide}>
            <Text style={styles.cancelText}>Cancel Ride</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {drawerOpen && (
        <>
          <Pressable style={styles.backdrop} onPress={closeDrawer} />

          <Animated.View style={[styles.drawer, { width: DRAWER_W }, drawerStyle]}>
            <View style={styles.driverBox}>
              <View style={styles.driverLeft}>
                <View style={styles.avatar}>
                  <Image source={ambulanceIcon} style={styles.avatarImg} />
                </View>

                <View>
                  <Text style={styles.driverName}>{driverName}</Text>
                  <Text style={styles.driverPhone}>{driverPhone}</Text>

                  <View style={styles.badgeInline}>
                    <Text style={styles.badgeText}>Active Ride</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity onPress={closeDrawer} style={styles.closeBtn} activeOpacity={0.8}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.item} activeOpacity={0.85} onPress={goHistory}>
              <View style={[styles.itemIcon, { backgroundColor: "#FFE4E6" }]}>
                <Text style={styles.itemIconText}>🕓</Text>
              </View>
              <Text style={styles.itemText}>Past Rides</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.item} activeOpacity={0.85} onPress={goProfile}>
              <View style={[styles.itemIcon, { backgroundColor: "#FFF1F2" }]}>
                <Text style={styles.itemIconText}>👤</Text>
              </View>
              <Text style={styles.itemText}>Profile Management</Text>
            </TouchableOpacity>

            <View style={styles.drawerDivider} />

            <TouchableOpacity style={[styles.item, { marginTop: 6 }]} activeOpacity={0.85} onPress={doLogout}>
              <View style={[styles.itemIcon, { backgroundColor: "#FDECEC" }]}>
                <Text style={[styles.itemIconText, { color: "#B91C1C" }]}>⎋</Text>
              </View>
              <Text style={[styles.itemText, { color: "#B91C1C", fontWeight: "700" }]}>Logout</Text>
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
    height: 85,
    backgroundColor: COLORS.brand,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 30,
  },

  leftBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
    paddingHorizontal: 14,
    paddingVertical: 14,
    paddingBottom: 28,
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
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
    fontSize: 11,
    fontWeight: "700",
  },

  progressPercent: {
    color: "#BE123C",
    fontSize: 11,
    fontWeight: "900",
  },

  progressBg: {
    height: 5,
    borderRadius: 4,
    backgroundColor: "#D1D5DB",
    overflow: "hidden",
    marginTop: 8,
  },

  progressFill: {
    height: "100%",
    backgroundColor: COLORS.text,
  },

  progressText: {
    textAlign: "center",
    color: COLORS.text,
    fontSize: 12,
    marginTop: 10,
    fontWeight: "700",
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  sectionTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
  },

  emergencyBadge: {
    backgroundColor: "#FFE4E6",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  emergencyBadgeText: {
    color: COLORS.brand,
    fontSize: 10,
    fontWeight: "900",
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 10,
  },

  infoLabel: {
    color: COLORS.sub,
    fontSize: 11,
    fontWeight: "700",
  },

  infoValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 4,
  },

  phoneRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  phoneIcon: {
    fontSize: 13,
    marginRight: 7,
    color: COLORS.brand,
  },

  phoneText: {
    color: COLORS.brand,
    fontSize: 13,
    fontWeight: "800",
  },

  mapBox: {
    height: 220,
    borderRadius: 8,
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
    fontSize: 14,
    fontWeight: "800",
    marginTop: 8,
  },

  mapPlaceholderSub: {
    color: COLORS.sub,
    fontSize: 11,
    marginTop: 5,
  },

  ambulanceMapIcon: {
    width: 42,
    height: 42,
    resizeMode: "contain",
  },

  patientMarker: {
    fontSize: 34,
  },

  locationBlock: {
    flexDirection: "row",
    marginTop: 12,
  },

  locationIconRed: {
    width: 24,
    fontSize: 15,
    color: COLORS.brand,
  },

  locationIconGreen: {
    width: 24,
    fontSize: 15,
    color: COLORS.green,
  },

  locationTextWrap: {
    flex: 1,
  },

  locationLabel: {
    color: COLORS.sub,
    fontSize: 11,
    fontWeight: "800",
  },

  locationValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 3,
  },

  locationSub: {
    color: COLORS.sub,
    fontSize: 11,
    marginTop: 3,
  },

  continueBtn: {
    height: 42,
    borderRadius: 7,
    backgroundColor: COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  reachedBtn: {
    backgroundColor: COLORS.green,
  },

  disabledBtn: {
    backgroundColor: "#9CA3AF",
  },

  continueText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },

  cancelBtn: {
    height: 42,
    borderRadius: 7,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },

  paymentBox: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 12,
  },

  paymentTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "900",
  },

  paymentSub: {
    color: COLORS.sub,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 18,
  },

  requestForBox: {
    marginTop: 12,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  requestForTitle: {
    color: COLORS.sub,
    fontSize: 11,
    fontWeight: "800",
  },

  requestForValue: {
    color: COLORS.brandDark,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 3,
  },

  paymentLabel: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 14,
    marginBottom: 6,
  },

  paymentInput: {
    height: 42,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
  },

  paymentAmountBadge: {
    marginTop: 10,
    borderRadius: 7,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#86EFAC",
  },

  paymentAmountText: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
  },

  paymentActionBtn: {
    height: 42,
    borderRadius: 7,
    backgroundColor: COLORS.blue,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },

  confirmPaymentBtn: {
    height: 42,
    borderRadius: 7,
    backgroundColor: COLORS.green,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },

  fullscreenBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 7,
    backgroundColor: "rgba(255,255,255,0.94)",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },

  fullscreenBtnText: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
    marginTop: -2,
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

  fullscreenAmbulanceIcon: {
    width: 56,
    height: 56,
    resizeMode: "contain",
  },

  fullscreenPatientMarker: {
    fontSize: 40,
  },

  fullscreenPlaceholder: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  fullscreenPlaceholderText: {
    marginTop: 8,
    color: COLORS.sub,
    fontSize: 14,
    fontWeight: "800",
  },

  hospitalPinWrap: {
    alignItems: "center",
    justifyContent: "center",
  },

  hospitalPinCircle: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },

  hospitalPinText: {
    color: COLORS.brand,
    fontWeight: "900",
    marginTop: -1,
  },

  hospitalPinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 12,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#FFFFFF",
    marginTop: -2,
  },

  hospitalDetailsOverlay: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    zIndex: 20,
    elevation: 20,
    alignItems: "center",
  },

  fullscreenHospitalDetailsOverlay: {
    top: 105,
    left: 16,
    right: 16,
  },

  closeDetailsBtn: {
    position: "absolute",
    top: 5,
    right: 8,
    zIndex: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },

  closeDetailsText: {
    fontSize: 18,
    color: "#64748B",
    fontWeight: "900",
    lineHeight: 20,
  },

  calloutOuter: {
    alignItems: "center",
  },

  calloutBox: {
    width: 290,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },

  calloutTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 7,
    paddingRight: 22,
  },

  calloutRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },

  calloutIcon: {
    width: 22,
    fontSize: 15,
    color: "#64748B",
  },

  calloutIconBlue: {
    width: 22,
    fontSize: 15,
    color: COLORS.blue,
    fontWeight: "900",
  },

  calloutClock: {
    width: 22,
    fontSize: 15,
    color: "#64748B",
  },

  calloutText: {
    fontSize: 13,
    color: "#64748B",
    flexShrink: 1,
  },

  calloutDistance: {
    fontSize: 13,
    color: COLORS.blue,
    fontWeight: "800",
  },

  calloutDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 8,
  },

  calloutRatingRow: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 32,
  },

  calloutRatingLeft: {
    flex: 1.05,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 8,
  },

  calloutRatingRight: {
    flex: 1.35,
    justifyContent: "center",
    paddingLeft: 10,
  },

  calloutVerticalDivider: {
    width: 1,
    backgroundColor: "#E5E7EB",
    alignSelf: "stretch",
  },

  starIcon: {
    width: 22,
    fontSize: 15,
    color: "#EAB308",
  },

  calloutRatingText: {
    flex: 1,
    fontSize: 13,
    color: "#64748B",
    fontWeight: "700",
    flexShrink: 1,
    flexWrap: "wrap",
    lineHeight: 17,
  },

  calloutOpenText: {
    fontSize: 13,
    color: COLORS.green,
    fontWeight: "800",
    flexShrink: 1,
    flexWrap: "wrap",
    lineHeight: 17,
  },

  calloutClosedText: {
    color: COLORS.brand,
  },

  directionBtn: {
    marginTop: 7,
    height: 32,
    borderRadius: 7,
    flexDirection: "row",
    backgroundColor: COLORS.blue,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  directionBtnLoading: {
    backgroundColor: "#93C5FD",
  },

  directionBtnActive: {
    backgroundColor: COLORS.green,
  },

  directionBtnIcon: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "900",
  },

  directionBtnText: {
    color: "#FFFFFF",
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
    backgroundColor: "#DCFCE7",
  },

  badgeText: {
    fontWeight: "900",
    fontSize: 11,
    color: "#166534",
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