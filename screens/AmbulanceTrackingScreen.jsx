// AmbulanceTrackingScreen.jsx

import React, { useEffect, useState, useRef } from "react";
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Modal,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CommonActions } from "@react-navigation/native";
import { buildUrl } from "../services/apiConfig";

const ambulanceIcon = require("../assets/ambulance.png");
const ambulanceIconInMap = require("../assets/ambulanceinmap.png");

const GOOGLE_MAPS_APIKEY = "AIzaSyA7D56WKApJ8Ash580RI_SroCDi27-MghE";

const COLORS = {
  bg: "#EEF3F4",
  white: "#FFFFFF",
  text: "#0F172A",
  sub: "#64748B",
  redMain: "#DC2626",
  greenSoft: "#DCFCE7",
  greenText: "#166534",
  greenBorder: "#86EFAC",
  border: "#E5E7EB",
  softRed: "#FEF2F2",
  redBorder: "#FCA5A5",
  orangeMain: "#F97316",
};

export default function AmbulanceTrackingScreen({ navigation, route }) {
  const { request, driver: initialDriver, patient: initialPatient, autoArrived } =
    route.params || {};

  const initialStatus = request?.status;

  const [currentPatient, setCurrentPatient] = useState(initialPatient || null);

  const [isTracking, setIsTracking] = useState(false);
  const [statusText, setStatusText] = useState(
    initialStatus === "payment_pending"
      ? "Payment Pending"
      : initialStatus === "completed"
      ? "Completed"
      : initialStatus === "navigating_to_hospital"
      ? "Navigating to Hospital"
      : "Accepted"
  );
  const [driver, setDriver] = useState(initialDriver || null);

  const [liveETA, setLiveETA] = useState("Calculating...");
  const [liveDistance, setLiveDistance] = useState("Calculating...");
  const [calculatedHeading, setCalculatedHeading] = useState(0);

  const [snappedDriverCoord, setSnappedDriverCoord] = useState(null);

  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  const [nearbyHospitals, setNearbyHospitals] = useState([]);
  const [isArrived, setIsArrived] = useState(
    initialStatus === "arrived_at_patient" ||
      initialStatus === "navigating_to_hospital" ||
      initialStatus === "payment_pending" ||
      initialStatus === "completed"
  );
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [routedHospital, setRoutedHospital] = useState(null);
  const [hospitalConfirmed, setHospitalConfirmed] = useState(
    !!request?.selectedHospital ||
      initialStatus === "payment_pending" ||
      initialStatus === "completed"
  );
  const [confirmedHospitalSource, setConfirmedHospitalSource] = useState(null);
  const [isNavigatingToHospital, setIsNavigatingToHospital] = useState(
    initialStatus === "navigating_to_hospital"
  );
  const [isPaymentPending, setIsPaymentPending] = useState(
    initialStatus === "payment_pending"
  );
  const [loadingHospitalDetails, setLoadingHospitalDetails] = useState(false);

  const [hospitalRouteCoords, setHospitalRouteCoords] = useState(null);
  const [selectedHospitalCoord, setSelectedHospitalCoord] = useState(null);
  const [loadingDirection, setLoadingDirection] = useState(false);
  const [confirmingHospital, setConfirmingHospital] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(
    request?.fareAmount !== undefined && request?.fareAmount !== null
      ? String(request.fareAmount)
      : ""
  );

  const mapRef = useRef(null);
  const fullMapRef = useRef(null);
  const autoArrivedHandledRef = useRef(false);
  const appliedSelectedHospitalRef = useRef(null);
  const hospitalRouteOriginRef = useRef(null);
  const cancellationHandledRef = useRef(false);

  const requestId = request?._id || request?.id;

  const patientName =
    currentPatient?.fullName || request?.patientInfo?.name || "Patient User";
  const patientPhone =
    currentPatient?.phone || request?.patientInfo?.phone || "N/A";

  const patientLat =
    request?.pickupLocation?.coordinates?.[1] || request?.pickupLocation?.lat;
  const patientLng =
    request?.pickupLocation?.coordinates?.[0] || request?.pickupLocation?.lng;

  const driverLat = Number(driver?.location?.coordinates?.[1] || 0);
  const driverLng = Number(driver?.location?.coordinates?.[0] || 0);

  const hasDriverLiveLocation = driverLat !== 0 && driverLng !== 0;
  const shouldHidePatientMarker = isNavigatingToHospital || isPaymentPending;

  useEffect(() => {
    const recoverPatientData = async () => {
      if (!currentPatient) {
        try {
          const savedData = await AsyncStorage.getItem("patientData");
          if (savedData) setCurrentPatient(JSON.parse(savedData));
        } catch (e) {
          console.log("Recovery Error:", e);
        }
      }
    };

    recoverPatientData();
  }, []);

  useEffect(() => {
    let pollInterval;

    if (isTracking && !isArrived) {
      pollInterval = setInterval(async () => {
        try {
          if (!requestId) return;

          const res = await fetch(buildUrl(`/api/ambulance/status/${requestId}`));
          const data = await res.json();

          if (data.success && data.driver) {
            setDriver(data.driver);
          }
        } catch (err) {
          console.log("Polling Error:", err);
        }
      }, 5000);
    }

    return () => clearInterval(pollInterval);
  }, [isTracking, isArrived, requestId]);

  const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
      return "0.00";
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
    return (R * c).toFixed(2);
  };

  const calculateDistanceMeters = (lat1, lng1, lat2, lng2) => {
    const km = Number(calculateDistanceKm(lat1, lng1, lat2, lng2));
    return km * 1000;
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
    setSelectedHospital(null);
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

      poly.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }

    return poly;
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

  const fetchHospitalRouteFromOrigin = async (
    originLat,
    originLng,
    hospital,
    fitMap = false
  ) => {
    if (!hospital || originLat == null || originLng == null) return;

    const hospitalLat = Number(hospital.lat);
    const hospitalLng = Number(hospital.lng);

    if (Number.isNaN(hospitalLat) || Number.isNaN(hospitalLng)) return;

    try {
      setLoadingDirection(true);

      const origin = `${originLat},${originLng}`;
      const destination = `${hospitalLat},${hospitalLng}`;

      const url =
        `https://maps.googleapis.com/maps/api/directions/json` +
        `?origin=${origin}` +
        `&destination=${destination}` +
        `&mode=driving` +
        `&key=${GOOGLE_MAPS_APIKEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK" && data.routes.length > 0) {
        const route = data.routes[0];
        const points = route.overview_polyline.points;
        const routeCoords = decodePolyline(points);

        const leg = route.legs?.[0];
        const distanceText = leg?.distance?.text || "Calculating...";
        const durationText = leg?.duration?.text || "Calculating...";

        setLiveDistance(distanceText);
        setLiveETA(durationText);
        setHospitalRouteCoords(routeCoords);
        setSelectedHospitalCoord({
          latitude: hospitalLat,
          longitude: hospitalLng,
        });
        setRoutedHospital({
          ...hospital,
          lat: hospitalLat,
          lng: hospitalLng,
          distanceKm: calculateDistanceKm(
            Number(originLat),
            Number(originLng),
            hospitalLat,
            hospitalLng
          ),
        });

        setSelectedHospital((prev) => {
          if (!prev) return prev;

          return {
            ...prev,
            distanceKm: calculateDistanceKm(
              Number(originLat),
              Number(originLng),
              hospitalLat,
              hospitalLng
            ),
          };
        });

        updateRouteBearing(routeCoords);

        const allCoords = [
          {
            latitude: Number(originLat),
            longitude: Number(originLng),
          },
          {
            latitude: hospitalLat,
            longitude: hospitalLng,
          },
          ...routeCoords,
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
      }
    } catch (error) {
      console.log("Hospital live route error:", error);
    } finally {
      setLoadingDirection(false);
    }
  };

  const handleHospitalPress = async (hospital) => {
    if (hospitalConfirmed || isNavigatingToHospital || isPaymentPending) {
      return;
    }

    const hospitalLat = hospital?.geometry?.location?.lat;
    const hospitalLng = hospital?.geometry?.location?.lng;

    const distanceKm = calculateDistanceKm(
      patientLat,
      patientLng,
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

    setHospitalRouteCoords(null);
    setSelectedHospitalCoord({ latitude: hospitalLat, longitude: hospitalLng });
    setRoutedHospital(null);
    hospitalRouteOriginRef.current = null;

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
      }
    } catch (error) {
      console.log("Hospital Details API Error:", error);
    } finally {
      setLoadingHospitalDetails(false);
    }
  };

  const handleGetDirection = async () => {
    if (!selectedHospital || !patientLat || !patientLng) return;

    await fetchHospitalRouteFromOrigin(
      Number(patientLat),
      Number(patientLng),
      selectedHospital,
      true
    );
  };

  const restoreSavedHospitalRoute = async (
    savedHospital,
    forceDriverOrigin = false
  ) => {
    if (!savedHospital || !patientLat || !patientLng) return;

    const coords = savedHospital?.location?.coordinates;

    const hospitalLat =
      savedHospital.lat ??
      savedHospital.latitude ??
      (Array.isArray(coords) ? coords[1] : null);

    const hospitalLng =
      savedHospital.lng ??
      savedHospital.longitude ??
      (Array.isArray(coords) ? coords[0] : null);

    if (hospitalLat == null || hospitalLng == null) return;

    const useDriverOrigin =
      forceDriverOrigin || request?.status === "navigating_to_hospital";

    const originLat =
      useDriverOrigin && hasDriverLiveLocation ? driverLat : Number(patientLat);

    const originLng =
      useDriverOrigin && hasDriverLiveLocation ? driverLng : Number(patientLng);

    const hospital = {
      placeId: savedHospital.placeId || "",
      name: savedHospital.name || "Selected Hospital",
      address:
        savedHospital.address ||
        savedHospital?.location?.address ||
        "Address not available",
      rating: savedHospital.rating || "Rating not available",
      openNow:
        savedHospital.openNow === true
          ? true
          : savedHospital.openNow === false
          ? false
          : null,
      openingTime: savedHospital.openingTime || "Opening timing not available",
      phone: savedHospital.phone || "",
      lat: Number(hospitalLat),
      lng: Number(hospitalLng),
      distanceKm: calculateDistanceKm(
        Number(originLat),
        Number(originLng),
        Number(hospitalLat),
        Number(hospitalLng)
      ),
      selectedBy: savedHospital.selectedBy || null,
    };

    setHospitalConfirmed(true);
    setConfirmedHospitalSource(savedHospital.selectedBy || null);
    setNearbyHospitals([]);
    setSelectedHospital(hospital);
    setRoutedHospital(hospital);
    setSelectedHospitalCoord({
      latitude: Number(hospitalLat),
      longitude: Number(hospitalLng),
    });

    if (useDriverOrigin && !hasDriverLiveLocation) {
      return;
    }

    await fetchHospitalRouteFromOrigin(originLat, originLng, hospital, true);
  };

  const handleConfirmHospitalSelection = async () => {
    const hospitalToConfirm = selectedHospital || routedHospital;

    if (
      !hospitalToConfirm ||
      !hospitalRouteCoords ||
      hospitalRouteCoords.length === 0
    ) {
      Alert.alert(
        "Select Hospital",
        "Please select a hospital and tap Get Direction before confirming."
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
            placeId: hospitalToConfirm.placeId,
            name: hospitalToConfirm.name,
            address: hospitalToConfirm.address,
            rating: hospitalToConfirm.rating,
            openNow: hospitalToConfirm.openNow,
            openingTime: hospitalToConfirm.openingTime,
            phone: hospitalToConfirm.phone,
            lat: hospitalToConfirm.lat,
            lng: hospitalToConfirm.lng,
          },
          selectedBy: "patient",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        Alert.alert("Error", data.message || "Could not confirm hospital selection.");
        return;
      }

      setHospitalConfirmed(true);
      setConfirmedHospitalSource("patient");
      setIsNavigatingToHospital(true);
      setIsPaymentPending(false);
      setStatusText("Navigating to Hospital");
      setNearbyHospitals([]);
      setSelectedHospital(hospitalToConfirm);
      setRoutedHospital(hospitalToConfirm);
      setSelectedHospitalCoord({
        latitude: Number(hospitalToConfirm.lat),
        longitude: Number(hospitalToConfirm.lng),
      });

      if (data?.driver) {
        setDriver(data.driver);
      }

      if (data?.driver?.location?.coordinates?.length === 2) {
        const latestDriverLat = Number(data.driver.location.coordinates[1]);
        const latestDriverLng = Number(data.driver.location.coordinates[0]);

        if (latestDriverLat !== 0 && latestDriverLng !== 0) {
          hospitalRouteOriginRef.current = {
            latitude: latestDriverLat,
            longitude: latestDriverLng,
          };

          await fetchHospitalRouteFromOrigin(
            latestDriverLat,
            latestDriverLng,
            hospitalToConfirm,
            true
          );
        }
      }

      Alert.alert(
        "Hospital Confirmed",
        `${hospitalToConfirm.name} has been shared with the ambulance driver.`
      );
    } catch (error) {
      console.log("Confirm Hospital Error:", error);
      Alert.alert("Error", "Network error while confirming hospital.");
    } finally {
      setConfirmingHospital(false);
    }
  };

  const fetchNearbyHospitals = async (lat, lng) => {
    try {
      const url =
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=3000&type=hospital&key=${GOOGLE_MAPS_APIKEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.results) setNearbyHospitals(data.results);
    } catch (error) {
      console.log("Hospitals API Error:", error);
    }
  };

  useEffect(() => {
    let interval;

    const checkHospitalStatus = async () => {
      try {
        if (!requestId) return;

        const res = await fetch(buildUrl(`/api/ambulance/status/${requestId}`));
        const data = await res.json();

        if (data?.success && data?.driver) {
          setDriver(data.driver);
        }

        const backendStatus = data?.request?.status;

        // Live backend status refresh (same behavior as PatientMenu active-session check)
        if (data?.success && backendStatus === "accepted") {
          setStatusText("Accepted");
          setIsTracking(true);
          setIsArrived(false);
          setIsNavigatingToHospital(false);
          setIsPaymentPending(false);
        }

        if (
          data?.success &&
          (backendStatus === "in-progress" || backendStatus === "in_progress")
        ) {
          setStatusText("Tracking");
          setIsTracking(true);
          setIsArrived(false);
          setIsNavigatingToHospital(false);
          setIsPaymentPending(false);
        }

        if (data?.success && backendStatus === "arrived_at_patient") {
          setStatusText("Arrived");
          setIsArrived(true);
          setIsNavigatingToHospital(false);
          setIsPaymentPending(false);

          if (!nearbyHospitals.length) {
            fetchNearbyHospitals(patientLat, patientLng);
          }
        }

        if (
          data?.success &&
          backendStatus === "cancelled" &&
          !cancellationHandledRef.current
        ) {
          cancellationHandledRef.current = true;

          const cancelledDriverName =
            data?.request?.driver?.fullName ||
            data?.driver?.fullName ||
            "Ambulance Driver";

          Alert.alert(
            "Emergency Ambulance Request Cancelled",
            `Your Emergency Ambulance Request has been cancelled by the driver ${cancelledDriverName}.`,
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
                          params: {
                            patient: currentPatient,
                          },
                        },
                      ],
                    })
                  );
                },
              },
            ]
          );

          return;
        }

        if (data?.success && backendStatus === "completed") {
          setStatusText("Completed");
          setIsNavigatingToHospital(false);
          setIsPaymentPending(false);
          setIsArrived(true);
          setHospitalConfirmed(true);
          setNearbyHospitals([]);
          return;
        }

        if (data?.success && backendStatus === "payment_pending") {
          setStatusText("Payment Pending");
          setIsPaymentPending(true);
          setIsNavigatingToHospital(false);
          setIsArrived(true);
          setHospitalConfirmed(true);
          setNearbyHospitals([]);

          if (
            data?.request?.fareAmount !== undefined &&
            data?.request?.fareAmount !== null
          ) {
            setPaymentAmount(String(data.request.fareAmount));
          }

          const savedHospital = data?.request?.selectedHospital;

          if (savedHospital) {
            const coords = savedHospital?.location?.coordinates;

            const hospitalLat =
              savedHospital.lat ??
              savedHospital.latitude ??
              (Array.isArray(coords) ? coords[1] : null);

            const hospitalLng =
              savedHospital.lng ??
              savedHospital.longitude ??
              (Array.isArray(coords) ? coords[0] : null);

            const hospitalKey = `${savedHospital.placeId || savedHospital.name}-${hospitalLat}-${hospitalLng}-${savedHospital.selectedBy || ""}`;

            if (hospitalKey !== appliedSelectedHospitalRef.current) {
              appliedSelectedHospitalRef.current = hospitalKey;
              restoreSavedHospitalRoute(savedHospital, false);
            }
          }

          return;
        }

        if (data?.success && backendStatus === "navigating_to_hospital") {
          setStatusText("Navigating to Hospital");
          setIsNavigatingToHospital(true);
          setIsPaymentPending(false);
          setIsArrived(true);
        }

        const savedHospital = data?.request?.selectedHospital;

        if (data?.success && savedHospital) {
          const coords = savedHospital?.location?.coordinates;

          const hospitalLat =
            savedHospital.lat ??
            savedHospital.latitude ??
            (Array.isArray(coords) ? coords[1] : null);

          const hospitalLng =
            savedHospital.lng ??
            savedHospital.longitude ??
            (Array.isArray(coords) ? coords[0] : null);

          const hospitalKey = `${savedHospital.placeId || savedHospital.name}-${hospitalLat}-${hospitalLng}-${savedHospital.selectedBy || ""}`;

          if (hospitalKey !== appliedSelectedHospitalRef.current) {
            appliedSelectedHospitalRef.current = hospitalKey;
            restoreSavedHospitalRoute(
              savedHospital,
              backendStatus === "navigating_to_hospital"
            );
          }
        }
      } catch (error) {
        console.log("Hospital status polling error:", error);
      }
    };

    if (requestId) {
      checkHospitalStatus();
      interval = setInterval(checkHospitalStatus, 4000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isArrived, requestId, patientLat, patientLng, nearbyHospitals.length]);

  useEffect(() => {
    const hospital = routedHospital || selectedHospital;

    if (
      !isNavigatingToHospital ||
      isPaymentPending ||
      !hospitalConfirmed ||
      !hospital ||
      !hasDriverLiveLocation
    ) {
      return;
    }

    const lastOrigin = hospitalRouteOriginRef.current;

    const movedMeters = lastOrigin
      ? calculateDistanceMeters(
          lastOrigin.latitude,
          lastOrigin.longitude,
          driverLat,
          driverLng
        )
      : 9999;

    if (!lastOrigin || movedMeters >= 25) {
      hospitalRouteOriginRef.current = {
        latitude: driverLat,
        longitude: driverLng,
      };

      fetchHospitalRouteFromOrigin(driverLat, driverLng, hospital, false);
    }
  }, [
    driverLat,
    driverLng,
    isNavigatingToHospital,
    isPaymentPending,
    hospitalConfirmed,
    routedHospital?.lat,
    routedHospital?.lng,
    selectedHospital?.lat,
    selectedHospital?.lng,
  ]);

  const handleBack = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: "PatientMenu",
            params: { patient: currentPatient, preventRedirect: true },
          },
        ],
      })
    );
  };

  const startTracking = () => {
    setIsTracking(true);
    setStatusText("Tracking");
    Alert.alert("Tracking Started", "Live location of ambulance is now being updated.");
  };

  const onDirectionsReady = async (result) => {
    const duration = Math.ceil(result.duration);
    const distance = result.distance.toFixed(2);

    setLiveETA(`${duration} mins`);
    setLiveDistance(`${distance} km`);

    if (result.coordinates && result.coordinates.length >= 2) {
      const p1 = result.coordinates[0];

      setSnappedDriverCoord({
        latitude: p1.latitude,
        longitude: p1.longitude,
      });

      updateRouteBearing(result.coordinates);
    }

    if (mapRef.current) {
      mapRef.current.fitToCoordinates(result.coordinates, {
        edgePadding: { right: 50, bottom: 50, left: 50, top: 100 },
      });
    }

    try {
      await fetch(buildUrl("/api/ambulance/travel-info/update"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          distance: distance,
          duration: duration,
        }),
      });
    } catch (err) {
      console.log("Travel Info Sync Error:", err);
    }
  };

  const onFullscreenDirectionsReady = async (result) => {
    if (result.coordinates && result.coordinates.length >= 2) {
      const p1 = result.coordinates[0];

      setSnappedDriverCoord({
        latitude: p1.latitude,
        longitude: p1.longitude,
      });

      updateRouteBearing(result.coordinates);
    }

    if (fullMapRef.current) {
      fullMapRef.current.fitToCoordinates(result.coordinates, {
        edgePadding: { right: 80, bottom: 120, left: 80, top: 120 },
      });
    }
  };

  const markAsArrived = async () => {
    Alert.alert("Confirm Arrival", "Has the ambulance arrived at your location?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes",
        onPress: async () => {
          try {
            const res = await fetch(buildUrl("/api/ambulance/status/update"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                requestId,
                status: "arrived_at_patient",
              }),
            });

            const data = await res.json();

            if (data.success) {
              setStatusText("Arrived");
              setIsArrived(true);
              fetchNearbyHospitals(patientLat, patientLng);
              Alert.alert("Success", "Ambulance arrived. Check nearby hospitals.");
            }
          } catch (err) {
            Alert.alert("Error", "Could not update status on server.");
          }
        },
      },
    ]);
  };

  const canConfirmHospital =
    !hospitalConfirmed &&
    !isPaymentPending &&
    (selectedHospital || routedHospital) &&
    hospitalRouteCoords &&
    hospitalRouteCoords.length > 0;

  useEffect(() => {
    const shouldOpenArrivedScreen =
      autoArrived === true ||
      request?.status === "arrived_at_patient" ||
      request?.status === "navigating_to_hospital" ||
      request?.status === "payment_pending";

    if (
      shouldOpenArrivedScreen &&
      !autoArrivedHandledRef.current &&
      patientLat &&
      patientLng
    ) {
      autoArrivedHandledRef.current = true;

      setIsTracking(false);
      setIsArrived(true);

      if (request?.status === "payment_pending") {
        setStatusText("Payment Pending");
        setIsPaymentPending(true);
        setIsNavigatingToHospital(false);
        setHospitalConfirmed(true);
        setNearbyHospitals([]);

        if (
          request?.fareAmount !== undefined &&
          request?.fareAmount !== null
        ) {
          setPaymentAmount(String(request.fareAmount));
        }
      } else if (request?.status === "navigating_to_hospital") {
        setStatusText("Navigating to Hospital");
        setIsNavigatingToHospital(true);
        setIsPaymentPending(false);
      } else {
        setStatusText("Arrived");
        setIsPaymentPending(false);
      }

      if (request?.selectedHospital) {
        const coords = request.selectedHospital?.location?.coordinates;
        const hospitalLat =
          request.selectedHospital.lat ??
          request.selectedHospital.latitude ??
          (Array.isArray(coords) ? coords[1] : null);
        const hospitalLng =
          request.selectedHospital.lng ??
          request.selectedHospital.longitude ??
          (Array.isArray(coords) ? coords[0] : null);

        appliedSelectedHospitalRef.current = `${request.selectedHospital.placeId || request.selectedHospital.name}-${hospitalLat}-${hospitalLng}-${request.selectedHospital.selectedBy || ""}`;
        restoreSavedHospitalRoute(
          request.selectedHospital,
          request?.status === "navigating_to_hospital"
        );
      } else if (
        request?.status !== "navigating_to_hospital" &&
        request?.status !== "payment_pending"
      ) {
        fetchNearbyHospitals(patientLat, patientLng);
      }
    }
  }, [
    autoArrived,
    request?.status,
    request?.fareAmount,
    request?.selectedHospital,
    patientLat,
    patientLng,
  ]);

  const renderHospitalRoute = () => (
    <>
      {!isPaymentPending && hospitalRouteCoords && hospitalRouteCoords.length > 0 && (
        <Polyline coordinates={hospitalRouteCoords} strokeColor="#2563EB" strokeWidth={5} />
      )}
    </>
  );

  const renderPaymentPendingBox = () => {
    return (
      <View style={styles.paymentPendingBox}>
        <Text style={styles.paymentPendingTitle}>
          {statusText === "Completed" ? "Payment Done Successfully" : "Payment Pending"}
        </Text>

        {statusText === "Completed" ? (
          <Text style={styles.paymentPendingText}>
            Your ambulance ride has been completed successfully.
          </Text>
        ) : paymentAmount ? (
          <>
            <Text style={styles.paymentPendingText}>
              Please pay the following amount to the ambulance driver.
            </Text>

            <View style={styles.amountBox}>
              <Text style={styles.amountLabel}>Amount to Pay</Text>
              <Text style={styles.amountValue}>Rs. {paymentAmount}</Text>
            </View>
          </>
        ) : (
          <Text style={styles.paymentPendingText}>
            Waiting for ambulance driver to send payment amount.
          </Text>
        )}
      </View>
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
              <Text style={styles.calloutDistance}>
                {selectedHospital?.distanceKm} km
              </Text>
              <Text style={styles.calloutText}>
                {isNavigatingToHospital
                  ? " from ambulance location"
                  : " from your location"}
              </Text>
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
                    selectedHospital?.openNow === false
                      ? styles.calloutClosedText
                      : null,
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

            {!hospitalConfirmed && !isNavigatingToHospital && !isPaymentPending && (
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

  const renderSelectedHospitalMarker = (size = 24) => {
    if (!selectedHospitalCoord) return null;

    return (
      <Marker
        coordinate={{
          latitude: Number(selectedHospitalCoord.latitude),
          longitude: Number(selectedHospitalCoord.longitude),
        }}
        title={routedHospital?.name || selectedHospital?.name || "Selected Hospital"}
        tracksViewChanges={true}
        onPress={() => {
          if (!selectedHospital && routedHospital) {
            setSelectedHospital(routedHospital);
          }
        }}
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

  const renderAmbulanceLiveMarker = (size = 40) => {
    if (!isArrived || !hospitalConfirmed || driverLat === 0 || driverLng === 0) {
      return null;
    }

    return (
      <Marker
        coordinate={{ latitude: driverLat, longitude: driverLng }}
        title="Ambulance"
        rotation={calculatedHeading}
        flat={true}
        anchor={{ x: 0.5, y: 0.5 }}
        tracksViewChanges={false}
      >
        <Image
          source={ambulanceIconInMap}
          style={{ width: size, height: size, resizeMode: "contain" }}
        />
      </Marker>
    );
  };

  const mapInitialRegion = {
    latitude:
      (isNavigatingToHospital || isPaymentPending) && hasDriverLiveLocation
        ? driverLat
        : Number(patientLat),
    longitude:
      (isNavigatingToHospital || isPaymentPending) && hasDriverLiveLocation
        ? driverLng
        : Number(patientLng),
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <Modal
        visible={isMapFullscreen}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setIsMapFullscreen(false)}
      >
        <View style={styles.fullscreenContainer}>
          <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

          {patientLat && patientLng ? (
            <MapView
              ref={fullMapRef}
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={mapInitialRegion}
              onPress={closeHospitalDetails}
            >
              {!shouldHidePatientMarker && (
                <Marker
                  coordinate={{ latitude: Number(patientLat), longitude: Number(patientLng) }}
                  title="Your Pickup Point"
                >
                  <Text style={{ fontSize: 40 }}>👤</Text>
                </Marker>
              )}

              {!isArrived && isTracking && driverLat !== 0 && (
                <>
                  <Marker
                    coordinate={
                      snappedDriverCoord
                        ? snappedDriverCoord
                        : { latitude: driverLat, longitude: driverLng }
                    }
                    title="Ambulance"
                    rotation={calculatedHeading}
                    flat={true}
                    anchor={{ x: 0.5, y: 0.5 }}
                    tracksViewChanges={false}
                  >
                    <Image
                      source={ambulanceIconInMap}
                      style={{ width: 56, height: 56, resizeMode: "contain" }}
                    />
                  </Marker>

                  <MapViewDirections
                    origin={{ latitude: driverLat, longitude: driverLng }}
                    destination={{ latitude: patientLat, longitude: patientLng }}
                    apikey={GOOGLE_MAPS_APIKEY}
                    strokeWidth={8}
                    strokeColor="#2563EB"
                    optimizeWaypoints={true}
                    onReady={onFullscreenDirectionsReady}
                  />
                </>
              )}

              {renderAmbulanceLiveMarker(56)}

              {isArrived &&
                !hospitalConfirmed &&
                !isNavigatingToHospital &&
                !isPaymentPending &&
                nearbyHospitals.map((h, i) => renderHospitalMarker(h, i, 28))}
              {isArrived && hospitalConfirmed && renderSelectedHospitalMarker(28)}
              {isArrived && renderHospitalRoute()}
            </MapView>
          ) : (
            <View style={styles.mapPlaceholder}>
              <Text>Map Loading...</Text>
            </View>
          )}

          {isArrived && selectedHospital && renderHospitalDetailsCard(true)}

          <TouchableOpacity
            style={styles.closeFullscreenBtn}
            onPress={() => setIsMapFullscreen(false)}
            activeOpacity={0.85}
          >
            <Text style={styles.closeFullscreenIcon}>✕</Text>
            <Text style={styles.closeFullscreenText}>Close</Text>
          </TouchableOpacity>

          {isTracking && !isArrived && (
            <View style={styles.fullscreenETABadge}>
              <Text style={styles.fullscreenETAText}>⏱️ ETA: {liveETA}</Text>
            </View>
          )}

          {isNavigatingToHospital && (
            <View style={styles.fullscreenETABadge}>
              <Text style={styles.fullscreenETAText}>
                {liveDistance} • {liveETA}
              </Text>
            </View>
          )}

          {isPaymentPending && (
            <View style={styles.fullscreenETABadge}>
              <Text style={styles.fullscreenETAText}>Payment Pending</Text>
            </View>
          )}
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.backText}>Back to Menu</Text>
        </TouchableOpacity>

        <View style={styles.centerWrap}>
          <View style={styles.cardWrap}>
            <View style={styles.headerRow}>
              <View style={styles.headerIconCircle}>
                <Image source={ambulanceIcon} style={styles.headerIcon} />
              </View>

              <View style={styles.headerTextWrap}>
                <Text style={styles.headerTitle}>Emergency Ambulance Service</Text>
                <Text style={styles.headerSubtitle}>
                  Immediate medical emergency response
                </Text>
              </View>
            </View>

            <View style={styles.detailsCard}>
              <Text style={styles.detailsHeading}>Patient Details</Text>

              <View style={styles.detailRow}>
                <View style={styles.rowAlign}>
                  <Text style={styles.rowIcon}>👤</Text>
                  <Text style={styles.detailValue}>
                    <Text style={styles.detailLabel}>Name: </Text>
                    {patientName}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.rowAlign}>
                  <Text style={styles.rowIcon}>📞</Text>
                  <Text style={styles.detailValue}>
                    <Text style={styles.detailLabel}>Contact: </Text>
                    {patientPhone}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.rowAlign}>
                  <Text style={styles.rowIcon}>📍</Text>
                  <Text style={styles.detailLabel}>Pickup Location: </Text>
                </View>

                <View style={styles.locationValuesContainer}>
                  <Text style={styles.detailValue}>
                    {patientLat}, {patientLng}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: statusText === "Completed" ? "100%" : isPaymentPending ? "95%" : isArrived ? "100%" : isTracking ? "85%" : "72%" },
                ]}
              />
            </View>

            <Text style={styles.requestStatusText}>Request Status: {statusText}</Text>

            <View style={styles.acceptedBanner}>
              <Text style={styles.acceptedIcon}>✅</Text>

              <Text style={styles.acceptedText}>
                {statusText === "Completed"
                  ? "Payment done successfully. Ride has been completed."
                  : isPaymentPending
                  ? "Payment is pending. Please pay the amount shown below."
                  : isNavigatingToHospital
                  ? "Ambulance is navigating to the selected hospital."
                  : isArrived
                  ? "Ambulance has arrived at your location!"
                  : "Driver accepted your request!"}
              </Text>
            </View>

            <View style={styles.driverSection}>
              <Text style={styles.driverHeading}>
                {statusText === "Completed"
                  ? "Payment Done Successfully"
                  : isPaymentPending
                  ? "Payment Pending"
                  : isNavigatingToHospital
                  ? "Hospital Navigation"
                  : isArrived
                  ? "Nearby Hospitals"
                  : "Driver Information"}
              </Text>

              {!isArrived && (
                <>
                  <View style={styles.detailRow}>
                    <View style={styles.rowAlign}>
                      <Text style={styles.rowIcon}>👨‍✈️</Text>
                      <Text style={styles.detailValue}>
                        <Text style={styles.detailLabel}>Driver Name: </Text>
                        {driver?.fullName || "Abdul Haseeb"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.rowAlign}>
                      <Text style={styles.rowIcon}>🚑</Text>
                      <Text style={styles.detailValue}>
                        <Text style={styles.detailLabel}>Ambulance No: </Text>
                        {driver?.ambulanceNumber || "HJN-963"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.rowAlign}>
                      <Text style={styles.rowIcon}>📞</Text>
                      <Text style={styles.detailValue}>
                        <Text style={styles.detailLabel}>Contact No: </Text>
                        {driver?.phone || "N/A"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.rowAlign}>
                      <Text style={styles.rowIcon}>⏱️</Text>
                      <Text style={styles.detailValue}>
                        <Text style={styles.detailLabel}>ETA: </Text>
                        {isTracking ? liveETA : "Calculating..."}
                      </Text>
                    </View>
                  </View>
                </>
              )}

              <View style={styles.mapContainer}>
                {patientLat && patientLng ? (
                  <MapView
                    ref={mapRef}
                    provider={PROVIDER_GOOGLE}
                    style={styles.map}
                    initialRegion={mapInitialRegion}
                    onPress={closeHospitalDetails}
                  >
                    {!shouldHidePatientMarker && (
                      <Marker
                        coordinate={{
                          latitude: Number(patientLat),
                          longitude: Number(patientLng),
                        }}
                        title="Your Pickup Point"
                      >
                        <Text style={{ fontSize: 30 }}>👤</Text>
                      </Marker>
                    )}

                    {!isArrived && isTracking && driverLat !== 0 && (
                      <>
                        <Marker
                          coordinate={
                            snappedDriverCoord
                              ? snappedDriverCoord
                              : { latitude: driverLat, longitude: driverLng }
                          }
                          title="Ambulance"
                          rotation={calculatedHeading}
                          flat={true}
                          anchor={{ x: 0.5, y: 0.5 }}
                          tracksViewChanges={false}
                        >
                          <Image
                            source={ambulanceIconInMap}
                            style={{ width: 40, height: 40, resizeMode: "contain" }}
                          />
                        </Marker>

                        <MapViewDirections
                          origin={{ latitude: driverLat, longitude: driverLng }}
                          destination={{ latitude: patientLat, longitude: patientLng }}
                          apikey={GOOGLE_MAPS_APIKEY}
                          strokeWidth={6}
                          strokeColor="#2563EB"
                          optimizeWaypoints={true}
                          onReady={onDirectionsReady}
                        />
                      </>
                    )}

                    {renderAmbulanceLiveMarker(40)}

                    {isArrived &&
                      !hospitalConfirmed &&
                      !isNavigatingToHospital &&
                      !isPaymentPending &&
                      nearbyHospitals.map((h, i) => renderHospitalMarker(h, i, 22))}
                    {isArrived && hospitalConfirmed && renderSelectedHospitalMarker(22)}
                    {isArrived && renderHospitalRoute()}
                  </MapView>
                ) : (
                  <View style={styles.mapPlaceholder}>
                    <Text>Map Loading...</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.fullscreenBtn}
                  onPress={() => setIsMapFullscreen(true)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.fullscreenBtnText}>⛶</Text>
                </TouchableOpacity>

                {isArrived && selectedHospital && renderHospitalDetailsCard(false)}
              </View>

              {isArrived && (
                <View style={styles.noteBox}>
                  <Text style={styles.noteText}>
                    {statusText === "Completed"
                      ? "✅ Payment done successfully. Your ride has been completed."
                      : isPaymentPending
                      ? paymentAmount
                        ? `ℹ️ Please pay Rs. ${paymentAmount} to the ambulance driver.`
                        : "ℹ️ Waiting for ambulance driver to send payment amount."
                      : isNavigatingToHospital
                      ? `ℹ️ Ambulance is moving toward the selected hospital. Distance: ${liveDistance} • ETA: ${liveETA}`
                      : "ℹ️ Driver will take you to the nearest hospital. Please prepare cash for payment."}
                  </Text>
                </View>
              )}

              {(isPaymentPending || statusText === "Completed") && renderPaymentPendingBox()}

              {!isArrived ? (
                !isTracking ? (
                  <TouchableOpacity
                    style={styles.trackBtn}
                    onPress={startTracking}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.trackBtnText}>Track Ambulance Live</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.arrivedBtn}
                    onPress={markAsArrived}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.trackBtnText}>Mark as Arrived</Text>
                  </TouchableOpacity>
                )
              ) : isNavigatingToHospital ||
                isPaymentPending ||
                statusText === "Completed" ? null : (
                <TouchableOpacity
                  style={[
                    styles.paymentBtn,
                    (hospitalConfirmed || !canConfirmHospital || confirmingHospital) &&
                      styles.disabledBtn,
                  ]}
                  onPress={handleConfirmHospitalSelection}
                  disabled={hospitalConfirmed || !canConfirmHospital || confirmingHospital}
                  activeOpacity={0.8}
                >
                  <Text style={styles.trackBtnText}>
                    {hospitalConfirmed
                      ? confirmedHospitalSource === "driver"
                        ? "Hospital Selected by Driver"
                        : "Hospital Selection Confirmed"
                      : confirmingHospital
                      ? "Confirming..."
                      : "Confirm Hospital Selection"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { flexGrow: 1, justifyContent: "center", paddingBottom: 26 },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 45,
    marginLeft: 20,
    marginBottom: 10,
  },
  backArrow: { fontSize: 28, color: "#334155", marginRight: 8, marginTop: -4 },
  backText: { color: "#334155", fontSize: 16, fontWeight: "700" },
  centerWrap: { paddingHorizontal: 22 },
  cardWrap: {
    width: "100%",
    backgroundColor: COLORS.softRed,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.redBorder,
    overflow: "hidden",
    elevation: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#FDEAEA",
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.redMain,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  headerIcon: {
    width: 18,
    height: 20,
    tintColor: "#FFFFFF",
    resizeMode: "contain",
  },
  headerTextWrap: { flex: 1 },
  headerTitle: { color: COLORS.redMain, fontWeight: "800", fontSize: 16 },
  headerSubtitle: { color: COLORS.sub, marginTop: 1, fontSize: 11 },
  detailsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 22,
    marginHorizontal: 12,
  },
  detailsHeading: {
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 8,
    fontSize: 11,
  },
  detailRow: { marginBottom: 7 },
  rowAlign: { flexDirection: "row", alignItems: "center" },
  rowIcon: { fontSize: 16, width: 22, marginRight: 4, textAlign: "center" },
  detailLabel: { fontWeight: "800", color: COLORS.text, fontSize: 11 },
  detailValue: { color: COLORS.text, fontSize: 11, flexShrink: 1 },
  locationValuesContainer: { marginLeft: 26, marginTop: 1 },
  progressBarBg: {
    height: 6,
    backgroundColor: "#D1D5DB",
    borderRadius: 3,
    overflow: "hidden",
    marginHorizontal: 12,
    marginTop: 15,
  },
  progressBarFill: { height: "100%", backgroundColor: "#0F172A" },
  requestStatusText: {
    marginTop: 8,
    marginHorizontal: 12,
    fontWeight: "600",
    color: "#64748B",
    fontSize: 11,
  },
  acceptedBanner: {
    marginTop: 12,
    marginHorizontal: 12,
    backgroundColor: COLORS.greenSoft,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  acceptedIcon: { fontSize: 12, marginRight: 6 },
  acceptedText: {
    color: COLORS.greenText,
    fontSize: 11,
    fontWeight: "700",
    flex: 1,
  },
  driverSection: {
    backgroundColor: "#F0FDF4",
    borderRadius: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    marginTop: 10,
    marginHorizontal: 12,
    marginBottom: 14,
  },
  driverHeading: {
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 10,
    fontSize: 12,
  },
  mapContainer: {
    height: 160,
    backgroundColor: "#E5E7EB",
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
  },
  map: { ...StyleSheet.absoluteFillObject },
  mapPlaceholder: { flex: 1, justifyContent: "center", alignItems: "center" },
  trackBtn: {
    height: 44,
    backgroundColor: "#2563EB",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  arrivedBtn: {
    height: 44,
    backgroundColor: COLORS.orangeMain,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  trackBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
  paymentBtn: {
    height: 44,
    backgroundColor: "#16A34A",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  disabledBtn: { backgroundColor: "#9CA3AF" },
  paymentPendingBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  paymentPendingTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "900",
  },
  paymentPendingText: {
    color: COLORS.sub,
    fontSize: 11,
    marginTop: 6,
    lineHeight: 16,
  },
  amountBox: {
    marginTop: 10,
    backgroundColor: "#DCFCE7",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#86EFAC",
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  amountLabel: {
    color: "#166534",
    fontSize: 11,
    fontWeight: "800",
  },
  amountValue: {
    color: "#166534",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 3,
  },
  hospitalPinWrap: { alignItems: "center", justifyContent: "center" },
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
  hospitalPinText: { color: "#DC2626", fontWeight: "900", marginTop: -1 },
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
  calloutOuter: { alignItems: "center" },
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
  calloutIcon: { width: 22, fontSize: 15, color: "#64748B" },
  calloutIconBlue: {
    width: 22,
    fontSize: 15,
    color: "#2563EB",
    fontWeight: "900",
  },
  calloutClock: { width: 22, fontSize: 15, color: "#64748B" },
  calloutText: { fontSize: 13, color: "#64748B", flexShrink: 1 },
  calloutDistance: {
    fontSize: 13,
    color: "#2563EB",
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
  starIcon: { width: 22, fontSize: 15, color: "#EAB308" },
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
    color: "#16A34A",
    fontWeight: "800",
    flexShrink: 1,
    flexWrap: "wrap",
    lineHeight: 17,
  },
  calloutClosedText: { color: "#DC2626" },
  directionBtn: {
    marginTop: 7,
    height: 32,
    borderRadius: 7,
    flexDirection: "row",
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  directionBtnLoading: { backgroundColor: "#93C5FD" },
  directionBtnActive: { backgroundColor: "#16A34A" },
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
  fullscreenBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 6,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  fullscreenBtnText: { fontSize: 18, color: "#0F172A" },
  fullscreenContainer: { flex: 1, backgroundColor: "#000" },
  closeFullscreenBtn: {
    position: "absolute",
    top: 50,
    left: 16,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    elevation: 6,
  },
  closeFullscreenIcon: {
    fontSize: 16,
    color: "#0F172A",
    marginRight: 6,
    fontWeight: "900",
  },
  closeFullscreenText: { fontSize: 14, color: "#0F172A", fontWeight: "800" },
  fullscreenETABadge: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    elevation: 6,
  },
  fullscreenETAText: { fontSize: 16, color: "#0F172A", fontWeight: "800" },
  noteBox: {
    backgroundColor: "#FFF",
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  noteText: { fontSize: 11, color: COLORS.sub, lineHeight: 16 },
});