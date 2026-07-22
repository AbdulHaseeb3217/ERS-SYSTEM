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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CommonActions } from "@react-navigation/native";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";

import { buildUrl } from "../services/apiConfig";

const ambulanceIcon = require("../assets/ambulance.png");

const GOOGLE_MAPS_APIKEY = "AIzaSyA7D56WKApJ8Ash580RI_SroCDi27-MghE";
const SCREEN_WIDTH = Dimensions.get("window").width;

const COLORS = {
  bg: "#F5F7FA",
  white: "#FFFFFF",
  text: "#0F172A",
  sub: "#64748B",
  softRed: "#FEF2F2",
  redBorder: "#FCA5A5",
  redMain: "#DC2626",
  redDark: "#B91C1C",
  cardBorder: "#E5E7EB",
  warnBg: "#FEF9C3",
  warnText: "#854D0E",
  warnBorder: "#FDE68A",
};

const REQUEST_FOR_OPTIONS = [
  { value: "self", label: "For Your Self" },
  { value: "family", label: "For Your Family" },
  { value: "random_person", label: "For Random Person" },
];

export default function EmergencyAmbulanceScreen(props) {
  const navigation = props?.navigation;
  const route = props?.route || {};
  const routeParams = route?.params || {};
  const routePatient = routeParams?.patient || null;

  // All hooks are always called at the top level and in the same order.
  const [patient, setPatient] = useState(routePatient);
  const [location, setLocation] = useState(null);
  const [locationAddress, setLocationAddress] = useState("");
  const [loadingLoc, setLoadingLoc] = useState(true);
  const [loadingPatient, setLoadingPatient] = useState(!routePatient);
  const [sending, setSending] = useState(false);
  const [requestFor, setRequestFor] = useState(null);
  const [isRequestActive, setIsRequestActive] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState(null);

  const locationInputRef = useRef(null);
  const timerRef = useRef(null);

  const patientId =
    routeParams?.patientId || routePatient?._id || routePatient?.id || null;

  const titleSize = SCREEN_WIDTH < 360 ? 18 : SCREEN_WIDTH < 400 ? 19 : 20;
  const subtitleSize = SCREEN_WIDTH < 360 ? 12 : 13;

  const fetchAddressFromCoordinates = async (lat, lng) => {
    try {
      const latitude = Number(lat);
      const longitude = Number(lng);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return "";
      }

      const url =
        "https://maps.googleapis.com/maps/api/geocode/json" +
        `?latlng=${latitude},${longitude}` +
        `&key=${GOOGLE_MAPS_APIKEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data?.status === "OK" && data?.results?.length > 0) {
        return data.results[0]?.formatted_address || "";
      }

      return "";
    } catch (error) {
      console.log("Reverse Geocoding Error:", error);
      return "";
    }
  };

  useEffect(() => {
    let mounted = true;

    const fetchPatient = async () => {
      try {
        let currentId = patientId;

        if (!currentId) {
          currentId = await AsyncStorage.getItem("patientId");
        }

        if (!currentId) {
          return;
        }

        const res = await fetch(buildUrl(`/api/patient/${currentId}`));
        const data = await res.json();

        if (!mounted) return;

        if (data?.success) {
          setPatient(data.patient);
          await AsyncStorage.setItem(
            "patientData",
            JSON.stringify(data.patient)
          );
        } else {
          Alert.alert(
            "Error",
            data?.message || "Unable to load patient details."
          );
        }
      } catch (error) {
        if (mounted) {
          Alert.alert("Error", "Network error while loading patient details.");
        }
      } finally {
        if (mounted) setLoadingPatient(false);
      }
    };

    if (routePatient) {
      setLoadingPatient(false);
    } else {
      fetchPatient();
    }

    return () => {
      mounted = false;
    };
  }, [patientId]);

  useEffect(() => {
    let mounted = true;

    const loadCurrentLocation = async () => {
      try {
        const raw = await AsyncStorage.getItem("userLocation");
        if (!raw) return;

        const parsedLocation = JSON.parse(raw);
        const latitude = Number(
          parsedLocation?.latitude ?? parsedLocation?.lat
        );
        const longitude = Number(
          parsedLocation?.longitude ?? parsedLocation?.lng
        );

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          return;
        }

        let address = String(parsedLocation?.address || "").trim();

        if (!address) {
          address = await fetchAddressFromCoordinates(latitude, longitude);
        }

        if (!mounted) return;

        const normalizedLocation = {
          latitude,
          longitude,
          address,
        };

        setLocation(normalizedLocation);
        setLocationAddress(address);

        if (address) {
          locationInputRef.current?.setAddressText(address);
        }

        await AsyncStorage.setItem(
          "userLocation",
          JSON.stringify(normalizedLocation)
        );
      } catch (error) {
        console.log("Error reading location:", error);
      } finally {
        if (mounted) setLoadingLoc(false);
      }
    };

    loadCurrentLocation();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let intervalId = null;

    if (isRequestActive && activeRequestId) {
      timerRef.current = setTimeout(() => {
        if (intervalId) clearInterval(intervalId);
        setIsRequestActive(false);

        fetch(buildUrl("/api/ambulance/status/update"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId: activeRequestId,
            status: "no_driver",
          }),
        }).catch((error) => console.log("Status update failed", error));

        navigation?.navigate("NoDriverAvailable", { patient });
      }, 30000);

      intervalId = setInterval(async () => {
        try {
          const res = await fetch(
            buildUrl(`/api/ambulance/status/${activeRequestId}`)
          );
          const data = await res.json();

          if (data?.success && data?.status === "accepted") {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (intervalId) clearInterval(intervalId);

            navigation?.navigate("AmbulanceTracking", {
              request: data.request,
              driver: data.driver,
              patient,
            });
          }
        } catch (error) {
          console.log("Polling error:", error);
        }
      }, 3000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isRequestActive, activeRequestId, navigation, patient]);

  const handleBack = () => {
    setIsRequestActive(false);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    navigation?.dispatch(
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
  };

  const handleLocationTextChange = (text) => {
    setLocationAddress(text);

    // As soon as the patient edits the address, old coordinates are invalid.
    setLocation(null);
  };

  const handleLocationSelect = (data, details = null) => {
    const latitude = Number(details?.geometry?.location?.lat);
    const longitude = Number(details?.geometry?.location?.lng);
    const address = String(
      details?.formatted_address || data?.description || details?.name || ""
    ).trim();

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      Alert.alert(
        "Location Error",
        "Unable to get coordinates for the selected address."
      );
      return;
    }

    setLocation({ latitude, longitude, address });
    setLocationAddress(address);
    locationInputRef.current?.setAddressText(address);
  };

  const checkExistingAndSend = async () => {
    try {
      let currentId = patientId || patient?._id || patient?.id;

      if (!currentId) {
        currentId = await AsyncStorage.getItem("patientId");
      }

      if (!currentId) {
        Alert.alert("Error", "Missing patient ID.");
        return;
      }

      if (!locationAddress.trim()) {
        Alert.alert("Location Required", "Please enter a pickup location.");
        return;
      }

      if (
        !location ||
        !Number.isFinite(Number(location.latitude)) ||
        !Number.isFinite(Number(location.longitude))
      ) {
        Alert.alert(
          "Select Location",
          "Please select the pickup address from Google suggestions."
        );
        return;
      }

      if (!requestFor) {
        Alert.alert(
          "Select Patient Type",
          "Please select who needs the emergency ambulance."
        );
        return;
      }

      setSending(true);

      const checkRes = await fetch(
        buildUrl(`/api/ambulance/active-session/${currentId}`)
      );
      const sessionData = await checkRes.json();

      if (sessionData?.success && sessionData?.hasActiveRequest) {
        if (sessionData.status === "pending") {
          setActiveRequestId(
            sessionData.request?._id || sessionData.request?.id
          );
          setIsRequestActive(true);
          return;
        }

        if (
          sessionData.status === "accepted" ||
          sessionData.status === "in-progress"
        ) {
          navigation?.navigate("AmbulanceTracking", {
            request: sessionData.request,
            driver: sessionData.driver,
            patient,
          });
          return;
        }

        if (sessionData.status === "arrived_at_patient") {
          navigation?.navigate("AmbulanceTracking", {
            request: sessionData.request,
            driver: sessionData.driver,
            patient,
            autoArrived: true,
          });
          return;
        }
      }

      let pickupAddress = locationAddress.trim();

      if (!pickupAddress) {
        pickupAddress = await fetchAddressFromCoordinates(
          location.latitude,
          location.longitude
        );
      }

      if (!pickupAddress) {
        Alert.alert("Location Error", "Could not determine pickup address.");
        return;
      }

      const res = await fetch(buildUrl("/api/ambulance/request"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: currentId,
          pickupLocation: {
            lat: Number(location.latitude),
            lng: Number(location.longitude),
            address: pickupAddress,
          },
          requestFor,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        Alert.alert(
          "Error",
          data?.message || "Could not send emergency request."
        );
        return;
      }

      setActiveRequestId(data.request?.id || data.request?._id);
      setIsRequestActive(true);
    } catch (error) {
      console.log("Emergency request error:", error);
      Alert.alert("Network Error", "Check your connection.");
    } finally {
      setSending(false);
    }
  };

  const onConfirmPress = () => {
    if (!locationAddress.trim()) {
      Alert.alert("Location Required", "Please enter a pickup location.");
      return;
    }

    if (!location) {
      Alert.alert(
        "Select Location",
        "Please select the pickup address from Google suggestions."
      );
      return;
    }

    if (!requestFor) {
      Alert.alert(
        "Select Patient Type",
        "Please select who needs the emergency ambulance."
      );
      return;
    }

    Alert.alert(
      "Confirm Emergency Request",
      "Send ambulance request now?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send Request",
          style: "destructive",
          onPress: checkExistingAndSend,
        },
      ]
    );
  };

  const name = patient?.fullName || "Patient User";
  const phone = patient?.phone || "N/A";

  if (loadingPatient) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={COLORS.redMain} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
        <Text style={styles.backArrow}>←</Text>
        <Text style={styles.backText}>Back to Menu</Text>
      </TouchableOpacity>

      <KeyboardAvoidingView
        style={styles.centerWrap}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.cardWrap}>
            <View style={styles.headerRow}>
              <View style={styles.headerIconCircle}>
                <Image source={ambulanceIcon} style={styles.headerIcon} />
              </View>

              <View style={styles.headerTextWrap}>
                <Text style={[styles.headerTitle, { fontSize: titleSize }]}> 
                  Emergency Ambulance Service
                </Text>
                <Text
                  style={[styles.headerSubtitle, { fontSize: subtitleSize }]}
                >
                  Immediate medical emergency response
                </Text>
              </View>
            </View>

            <View style={styles.detailsCard}>
              <Text style={styles.detailsHeading}>Patient Details</Text>

              <View style={[styles.detailRow, styles.rowAlign]}>
                <Image
                  source={{
                    uri: "https://cdn-icons-png.flaticon.com/512/1077/1077012.png",
                  }}
                  style={styles.infoIcon}
                />
                <Text style={styles.detailValue}>
                  <Text style={styles.detailLabel}>Name: </Text>
                  {name}
                </Text>
              </View>

              <View style={[styles.detailRow, styles.rowAlign]}>
                <Image
                  source={{
                    uri: "https://cdn-icons-png.flaticon.com/512/597/597177.png",
                  }}
                  style={styles.infoIcon}
                />
                <Text style={styles.detailValue}>
                  <Text style={styles.detailLabel}>Contact: </Text>
                  {phone}
                </Text>
              </View>

              <Text style={styles.locationLabel}>Pickup Location</Text>

              <View style={styles.autocompleteWrap}>
                <GooglePlacesAutocomplete
                  ref={locationInputRef}
                  placeholder={
                    loadingLoc
                      ? "Fetching current location..."
                      : "Enter pickup location"
                  }
                  fetchDetails
                  enablePoweredByContainer={false}
                  debounce={300}
                  minLength={2}
                  timeout={15000}
                  keyboardShouldPersistTaps="handled"
                  predefinedPlaces={[]}
                  nearbyPlacesAPI="GooglePlacesSearch"
                  GooglePlacesDetailsQuery={{
                    fields: "name,formatted_address,geometry",
                  }}
                  onPress={handleLocationSelect}
                  onFail={(error) =>
                    console.log("Google Places error:", error)
                  }
                  textInputProps={{
                    onChangeText: handleLocationTextChange,
                    placeholderTextColor: "#9CA3AF",
                    returnKeyType: "search",
                  }}
                  query={{
                    key: GOOGLE_MAPS_APIKEY,
                    language: "en",
                    components: "country:pk",
                  }}
                  styles={{
                    container: styles.placesContainer,
                    textInputContainer: styles.placesTextInputContainer,
                    textInput: styles.placesTextInput,
                    listView: styles.placesListView,
                    row: styles.placesRow,
                    description: styles.placesDescription,
                    separator: styles.placesSeparator,
                  }}
                  renderLeftButton={() => (
                    <View style={styles.inputIconBox}>
                      <Image
                        source={{
                          uri: "https://cdn-icons-png.flaticon.com/512/535/535239.png",
                        }}
                        style={styles.inputIcon}
                      />
                    </View>
                  )}
                />
              </View>

              <Text style={styles.requestForLabel}>Ambulance For</Text>

              <View style={styles.radioGroup}>
                {REQUEST_FOR_OPTIONS.map((option) => {
                  const selected = requestFor === option.value;

                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={styles.radioOption}
                      activeOpacity={0.8}
                      onPress={() => setRequestFor(option.value)}
                    >
                      <View style={styles.radioOuter}>
                        {selected ? <View style={styles.radioInner} /> : null}
                      </View>
                      <Text style={styles.radioLabel}>{option.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {isRequestActive ? (
              <View style={styles.activeRequestWrap}>
                <View style={styles.progressBarBg}>
                  <View style={styles.progressBarFill} />
                </View>
                <Text style={styles.requestingStatus}>
                  Request Status: Requesting
                </Text>
                <View style={styles.loadingInfoBox}>
                  <ActivityIndicator size="small" color="#2563EB" />
                  <Text style={styles.loadingInfoText}>
                    Sending request to nearby ambulance drivers... Please wait.
                  </Text>
                </View>
              </View>
            ) : (
              <>
                <View style={styles.warnBar}>
                  <Text style={styles.warnDot}>⚠️</Text>
                  <Text style={styles.warnText}>
                    Press the button below only for genuine medical emergencies.
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.ctaBtn, sending ? styles.disabledButton : null]}
                  onPress={onConfirmPress}
                  disabled={sending}
                >
                  <Image source={ambulanceIcon} style={styles.ctaIcon} />
                  <Text style={styles.ctaText}>
                    {sending ? "SENDING..." : "CALL EMERGENCY AMBULANCE"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  loadingScreen: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 50,
    marginLeft: 16,
  },
  backArrow: {
    fontSize: 25,
    color: COLORS.sub,
    marginRight: 6,
    marginTop: -7,
  },
  backText: { color: COLORS.sub, fontSize: 18, fontWeight: "700" },
  centerWrap: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  cardWrap: {
    width: "100%",
    maxWidth: 700,
    backgroundColor: COLORS.softRed,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.redBorder,
    elevation: 3,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  headerIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.redMain,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerIcon: { width: 34, height: 40, tintColor: "#FFFFFF" },
  headerTextWrap: { flex: 1 },
  headerTitle: { color: COLORS.redDark, fontWeight: "800" },
  headerSubtitle: { color: COLORS.sub, marginTop: 2 },
  detailsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginTop: 8,
    zIndex: 20,
  },
  detailsHeading: {
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 10,
    fontSize: 15,
  },
  detailRow: { marginBottom: 10 },
  rowAlign: { flexDirection: "row", alignItems: "center" },
  detailLabel: { fontWeight: "800", color: COLORS.text },
  detailValue: { color: COLORS.text, fontSize: 14 },
  locationLabel: {
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 4,
    marginBottom: 7,
  },
  autocompleteWrap: { zIndex: 50, marginBottom: 12 },
  placesContainer: { flex: 0, zIndex: 50 },
  placesTextInputContainer: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 8,
  },
  placesTextInput: {
    height: 46,
    backgroundColor: "transparent",
    color: COLORS.text,
    fontSize: 14,
    paddingVertical: 0,
  },
  placesListView: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 10,
    elevation: 10,
    zIndex: 9999,
  },
  placesRow: { paddingVertical: 12, paddingHorizontal: 10 },
  placesDescription: { color: COLORS.text, fontSize: 13 },
  placesSeparator: { height: 1, backgroundColor: COLORS.cardBorder },
  inputIconBox: {
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 2,
    paddingRight: 7,
  },
  inputIcon: { width: 17, height: 17, tintColor: COLORS.redDark },
  requestForLabel: {
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 4,
    marginBottom: 8,
  },
  radioGroup: { marginBottom: 2 },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.redMain,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.redMain,
  },
  radioLabel: { color: COLORS.text, fontSize: 14 },
  infoIcon: {
    width: 16,
    height: 16,
    tintColor: COLORS.redDark,
    marginRight: 8,
  },
  warnBar: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.warnBg,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.warnBorder,
  },
  warnDot: { fontSize: 16, marginRight: 8 },
  warnText: { color: COLORS.warnText, fontSize: 13, flex: 1 },
  ctaBtn: {
    marginTop: 18,
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.redMain,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    elevation: 3,
  },
  disabledButton: { opacity: 0.7 },
  ctaIcon: {
    width: 22,
    height: 25,
    tintColor: "#FFFFFF",
    marginRight: 10,
  },
  ctaText: { color: "#FFFFFF", fontWeight: "900", fontSize: 15 },
  activeRequestWrap: { marginTop: 20 },
  progressBarBg: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    width: "40%",
    backgroundColor: "#0F172A",
  },
  requestingStatus: {
    marginTop: 8,
    fontWeight: "700",
    color: "#64748B",
  },
  loadingInfoBox: {
    marginTop: 15,
    padding: 15,
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  loadingInfoText: {
    marginLeft: 10,
    color: "#1E40AF",
    fontSize: 13,
    flex: 1,
  },
});