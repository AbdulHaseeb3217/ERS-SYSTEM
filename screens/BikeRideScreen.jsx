// screens/BikeRideScreen.jsx

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
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  PermissionsAndroid,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Geolocation from "@react-native-community/geolocation";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";

import { buildUrl, GOOGLE_MAPS_APIKEY } from "../services/apiConfig";
import {
  createBikeRideRequest,
  getActiveBikeRideSession,
} from "../services/bikeRideRequests";

const COLORS = {
  bg: "#F5F7FA",
  white: "#FFFFFF",
  text: "#0F172A",
  sub: "#64748B",
  blueSoft: "#EBF2FF",
  blueBorder: "#BFD7FF",
  blueMain: "#2563EB",
  blueDark: "#1D4ED8",
  cardBorder: "#E5E7EB",
  inputBg: "#F9FAFB",
  inputBorder: "#E5E7EB",
};

export default function BikeRideScreen({ navigation, route }) {
  const { width } = useWindowDimensions();

  const pickupRef = useRef(null);
  const dropoffRef = useRef(null);

  const suppressPickupChangeRef = useRef(false);
  const suppressDropoffChangeRef = useRef(false);

  const routePatient = route?.params?.patient || null;
  const routePatientId =
    route?.params?.patientId || routePatient?._id || routePatient?.id || null;

  const [patient, setPatient] = useState(routePatient);
  const [patientId, setPatientId] = useState(routePatientId);
  const [loadingPatient, setLoadingPatient] = useState(true);

  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");

  const [pickupLocation, setPickupLocation] = useState(null);
  const [dropoffLocation, setDropoffLocation] = useState(null);

  const [loadingLoc, setLoadingLoc] = useState(true);
  const [sending, setSending] = useState(false);

  const titleSize = width < 360 ? 18 : width < 400 ? 19 : 20;
  const subtitleSize = width < 360 ? 12 : 13;

  const getSafeRideStatus = (rideObj) => {
    // IMPORTANT:
    // Patient ko BikeRiderTracking screen par sirf tab bhejna hai
    // jab backend ka actual status accepted, arrived_at_patient ya navigating_to_hospital ho.
    // Pending request ko kabhi accepted treat nahi karna,
    // warna request send hotay hi tracking screen open ho jati hai.
    return String(rideObj?.status || "")
      .toLowerCase()
      .replace("-", "_");
  };

  const handleExistingBikeRide = async (activeRide, finalPatient) => {
    if (!activeRide) {
      return false;
    }

    const rideStatus = getSafeRideStatus(activeRide);

    if (rideStatus === "completed") {
      const completedRideId = activeRide?._id || activeRide?.id;
      const paymentStatus = activeRide?.paymentStatus;

      if (paymentStatus === "paid" && completedRideId) {
        const seenKey = `BIKE_PAYMENT_DONE_SEEN_${completedRideId}`;
        const alreadySeen = await AsyncStorage.getItem(seenKey);

        // Agar Payment Done alert pehle show ho chuka hai to completed ride ko ignore karo,
        // taake user Book Bike Ride dubara press kare to new booking form open ho.
        if (alreadySeen) {
          return false;
        }

        await AsyncStorage.setItem(seenKey, "true");

        navigation.replace("BikeRiderTracking", {
          ride: activeRide,
          patient: finalPatient,
          autoCompleted: true,
        });

        return true;
      }

      return false;
    }

    if (
      rideStatus === "accepted" ||
      rideStatus === "arrived_at_pickup" ||
      rideStatus === "arrived_at_patient" ||
      rideStatus === "in_progress" ||
      rideStatus === "navigating_to_hospital" ||
      rideStatus === "payment_pending"
    ) {
      navigation.replace("BikeRiderTracking", {
        ride: activeRide,
        patient: finalPatient,
      });

      return true;
    }

    if (rideStatus === "pending") {
      Alert.alert(
        "Bike Ride Request Pending",
        "Your bike ride request is already pending. Please wait for a bike rider to accept it.",
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]
      );

      return true;
    }

    return false;
  };

  useEffect(() => {
    const initData = async () => {
      try {
        const savedData = await AsyncStorage.getItem("patientData");
        const savedId = await AsyncStorage.getItem("patientId");

        const finalId = patientId || savedId;
        const finalPatient =
          patient || (savedData ? JSON.parse(savedData) : null);

        if (finalPatient) {
          setPatient(finalPatient);
        }

        if (finalId) {
          setPatientId(finalId);
        }

        if (!finalId) {
          Alert.alert("Error", "Session missing. Please login again.");
          setLoadingPatient(false);
          return;
        }

        const activeRide = await getActiveBikeRideSession(finalId);

        if (activeRide) {
          const handled = await handleExistingBikeRide(activeRide, finalPatient);

          if (handled) {
            setLoadingPatient(false);
            return;
          }
        }

        const res = await fetch(buildUrl(`/api/patient/${finalId}`));
        const data = await res.json();

        if (res.ok && data?.success) {
          setPatient(data.patient);
        } else {
          Alert.alert(
            "Error",
            data?.message || "Unable to load patient details."
          );
        }
      } catch (err) {
        console.log("BikeRide patient fetch error:", err);
        Alert.alert(
          "Error",
          "Network error while loading patient details. Please try again."
        );
      } finally {
        setLoadingPatient(false);
      }
    };

    initData();
  }, []);

  const requestAndroidLocationPermission = async () => {
    if (Platform.OS !== "android") {
      return true;
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "Location Permission",
          message: "The Last Hope needs your current location for pickup.",
          buttonPositive: "Allow",
          buttonNegative: "Cancel",
        }
      );

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.log("Location permission error:", error);
      return false;
    }
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      if (!GOOGLE_MAPS_APIKEY || GOOGLE_MAPS_APIKEY.includes("PASTE")) {
        return "";
      }

      const url =
        `https://maps.googleapis.com/maps/api/geocode/json` +
        `?latlng=${lat},${lng}` +
        `&key=${GOOGLE_MAPS_APIKEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data?.status === "OK" && data?.results?.length > 0) {
        return data.results[0].formatted_address;
      }

      return "";
    } catch (error) {
      console.log("Reverse geocode error:", error);
      return "";
    }
  };

  const geocodeAddress = async (address) => {
    try {
      if (!address?.trim()) {
        return null;
      }

      if (!GOOGLE_MAPS_APIKEY || GOOGLE_MAPS_APIKEY.includes("PASTE")) {
        throw new Error("Google Maps API key missing in apiConfig.js");
      }

      const url =
        `https://maps.googleapis.com/maps/api/geocode/json` +
        `?address=${encodeURIComponent(address.trim())}` +
        `&components=country:PK` +
        `&key=${GOOGLE_MAPS_APIKEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data?.status === "OK" && data?.results?.length > 0) {
        const place = data.results[0];
        const loc = place.geometry.location;

        return {
          name: address.trim(),
          address: place.formatted_address || address.trim(),
          lat: Number(loc.lat),
          lng: Number(loc.lng),
        };
      }

      return null;
    } catch (error) {
      console.log("Geocode address error:", error);
      return null;
    }
  };

  const setPickupInputSafely = (displayName, locationObject) => {
    suppressPickupChangeRef.current = true;

    setPickup(displayName);
    setPickupLocation(locationObject);
    pickupRef.current?.setAddressText(displayName);

    setTimeout(() => {
      suppressPickupChangeRef.current = false;
    }, 350);
  };

  const setDropoffInputSafely = (displayName, locationObject) => {
    suppressDropoffChangeRef.current = true;

    setDropoff(displayName);
    setDropoffLocation(locationObject);
    dropoffRef.current?.setAddressText(displayName);

    setTimeout(() => {
      suppressDropoffChangeRef.current = false;
    }, 350);
  };

  const loadCurrentPickupLocation = async () => {
    try {
      setLoadingLoc(true);

      const hasPermission = await requestAndroidLocationPermission();

      if (!hasPermission) {
        Alert.alert(
          "Permission Required",
          "Location permission is required to auto-select pickup location."
        );
        setLoadingLoc(false);
        return;
      }

      const savedRaw = await AsyncStorage.getItem("userLocation");

      if (savedRaw) {
        const saved = JSON.parse(savedRaw);

        if (saved?.latitude && saved?.longitude) {
          const savedCoord = {
            lat: Number(saved.latitude),
            lng: Number(saved.longitude),
          };

          const fullAddress =
            (await reverseGeocode(savedCoord.lat, savedCoord.lng)) ||
            `Lat ${savedCoord.lat.toFixed(5)}, Lng ${savedCoord.lng.toFixed(
              5
            )}`;

          setPickupInputSafely("Current Location", {
            name: "Current Location",
            address: fullAddress,
            ...savedCoord,
          });
        }
      }

      Geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          const coord = {
            lat: Number(latitude),
            lng: Number(longitude),
          };

          await AsyncStorage.setItem(
            "userLocation",
            JSON.stringify({
              latitude: coord.lat,
              longitude: coord.lng,
            })
          );

          const fullAddress =
            (await reverseGeocode(coord.lat, coord.lng)) ||
            `Lat ${coord.lat.toFixed(5)}, Lng ${coord.lng.toFixed(5)}`;

          setPickupInputSafely("Current Location", {
            name: "Current Location",
            address: fullAddress,
            ...coord,
          });

          setLoadingLoc(false);
        },
        (error) => {
          console.log("Current location error:", error.message);
          setLoadingLoc(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 5000,
        }
      );
    } catch (error) {
      console.log("loadCurrentPickupLocation error:", error);
      setLoadingLoc(false);
    }
  };

  useEffect(() => {
    loadCurrentPickupLocation();
  }, []);

  const passengerName = patient?.fullName || "Patient User";
  const passengerPhone = patient?.phone || "N/A";

  const isProbablyAddress = (text) => {
    const value = String(text || "").toLowerCase();

    return (
      value.includes("plot ") ||
      value.includes("sector ") ||
      value.includes("street ") ||
      value.includes(" road") ||
      value.includes(" rd") ||
      value.includes("karachi") ||
      value.includes("pakistan") ||
      /\d/.test(value)
    );
  };

  const getPlaceDisplayName = (data, details) => {
    const detailsName = String(details?.name || "").trim();
    const mainText = String(data?.structured_formatting?.main_text || "").trim();
    const firstDescriptionPart = String(
      data?.description?.split(",")?.[0] || ""
    ).trim();
    const formattedAddress = String(details?.formatted_address || "").trim();

    if (detailsName && !isProbablyAddress(detailsName)) {
      return detailsName;
    }

    if (mainText && !isProbablyAddress(mainText)) {
      return mainText;
    }

    return detailsName || mainText || firstDescriptionPart || formattedAddress || "";
  };

  const getPlaceFullAddress = (data, details) => {
    return (
      details?.formatted_address ||
      data?.description ||
      details?.vicinity ||
      ""
    );
  };

  const handlePlaceSelect = (data, details, type) => {
    if (!details?.geometry?.location) {
      Alert.alert("Location Error", "Could not get selected location details.");
      return;
    }

    const lat = Number(details.geometry.location.lat);
    const lng = Number(details.geometry.location.lng);

    const displayName = getPlaceDisplayName(data, details);
    const fullAddress = getPlaceFullAddress(data, details);

    const locationPayload = {
      name: displayName,
      address: fullAddress || displayName,
      lat,
      lng,
    };

    if (type === "pickup") {
      setPickupInputSafely(displayName, locationPayload);
    }

    if (type === "dropoff") {
      setDropoffInputSafely(displayName, locationPayload);
    }
  };

  const onSubmit = async () => {
    const pickupText = pickup.trim();
    const dropoffText = dropoff.trim();

    if (!pickupText || !dropoffText) {
      Alert.alert(
        "Missing Info",
        "Please enter both pickup and drop-off locations."
      );
      return;
    }

    if (!patientId) {
      Alert.alert("Error", "Patient ID missing. Please login again and try.");
      return;
    }

    try {
      setSending(true);

      let finalPickup = pickupLocation;
      let finalDropoff = dropoffLocation;

      if (!finalPickup?.lat || !finalPickup?.lng) {
        const geoPickup = await geocodeAddress(pickupText);

        if (!geoPickup) {
          Alert.alert(
            "Pickup Location Error",
            "Please select pickup location from suggestions or enter a valid pickup location."
          );
          return;
        }

        finalPickup = geoPickup;
      }

      if (!finalDropoff?.lat || !finalDropoff?.lng) {
        const geoDropoff = await geocodeAddress(dropoffText);

        if (!geoDropoff) {
          Alert.alert(
            "Destination Error",
            "Please select destination from suggestions or enter a valid destination."
          );
          return;
        }

        finalDropoff = geoDropoff;
      }

      const payload = {
        patientId,

        pickupText: finalPickup.name || pickupText,
        dropoffText: finalDropoff.name || dropoffText,

        pickupLocation: {
          name: finalPickup.name || pickupText,
          address: finalPickup.address || pickupText,
          lat: finalPickup.lat,
          lng: finalPickup.lng,
        },

        dropoffLocation: {
          name: finalDropoff.name || dropoffText,
          address: finalDropoff.address || dropoffText,
          lat: finalDropoff.lat,
          lng: finalDropoff.lng,
        },
      };

      const ride = await createBikeRideRequest(payload);

      console.log("Bike ride created:", ride);

      Alert.alert(
        "Ride Requested",
        "Your bike ride request has been sent to nearby riders.",
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err) {
      console.log("Bike ride request error:", err);

      if (err.type === "ACTIVE_BIKE_RIDE_EXISTS") {
        const activeRide = err.activeRide || err.ride;

        if (activeRide) {
          const handled = await handleExistingBikeRide(activeRide, patient);

          if (handled) {
            return;
          }
        }

        Alert.alert(
          "Active Bike Ride",
          "Your previous bike ride request is still active. Please complete or cancel it before creating a new request.",
          [
            {
              text: "OK",
              onPress: () => navigation.goBack(),
            },
          ]
        );

        return;
      }

      Alert.alert("Error", err.message || "Unable to create bike ride request.");
    } finally {
      setSending(false);
    }
  };

  const renderAutocomplete = ({
    refObj,
    value,
    setValue,
    placeholder,
    type,
    zIndex,
  }) => {
    return (
      <View style={[styles.autoWrap, { zIndex }]}>
        <GooglePlacesAutocomplete
          ref={refObj}
          placeholder={placeholder}
          fetchDetails={true}
          enablePoweredByContainer={false}
          debounce={300}
          minLength={2}
          timeout={15000}
          keyboardShouldPersistTaps="handled"
          listViewDisplayed="auto"
          predefinedPlaces={[]}
          GooglePlacesDetailsQuery={{
            fields: "name,formatted_address,geometry",
          }}
          onPress={(data, details = null) => {
            handlePlaceSelect(data, details, type);
          }}
          textInputProps={{
            value,
            onChangeText: (text) => {
              setValue(text);

              if (type === "pickup") {
                if (suppressPickupChangeRef.current) {
                  return;
                }

                setPickupLocation(null);
              }

              if (type === "dropoff") {
                if (suppressDropoffChangeRef.current) {
                  return;
                }

                setDropoffLocation(null);
              }
            },
            placeholderTextColor: "#9CA3AF",
            returnKeyType: type === "pickup" ? "next" : "done",
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
    );
  };

  if (loadingPatient) {
    return (
      <SafeAreaView
        style={[
          styles.safe,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color={COLORS.blueMain} />
        <Text style={{ marginTop: 8, color: COLORS.sub }}>
          Loading patient details...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
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
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.cardWrap}>
            <View style={styles.header}>
              <View style={styles.headerIconCircle}>
                <Image
                  source={{
                    uri: "https://cdn-icons-png.flaticon.com/512/2972/2972185.png",
                  }}
                  style={styles.headerIcon}
                />
              </View>

              <View style={styles.headerTextWrap}>
                <Text style={[styles.title, { fontSize: titleSize }]}>
                  Bike Ride Service
                </Text>
                <Text style={[styles.subtitle, { fontSize: subtitleSize }]}>
                  Quick and affordable bike transport
                </Text>
              </View>
            </View>

            <View style={styles.detailsCard}>
              <Text style={styles.detailsHeading}>Passenger Details</Text>

              <View style={[styles.detailRow, styles.rowAlign]}>
                <Image
                  source={{
                    uri: "https://cdn-icons-png.flaticon.com/512/1077/1077012.png",
                  }}
                  style={styles.infoIcon}
                />
                <Text style={styles.detailValue}>
                  <Text style={styles.detailLabel}>Name: </Text>
                  {passengerName}
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
                  {passengerPhone}
                </Text>
              </View>

              <View style={[styles.detailRow, styles.rowAlign]}>
                <Image
                  source={{
                    uri: "https://cdn-icons-png.flaticon.com/512/535/535239.png",
                  }}
                  style={styles.infoIcon}
                />
                <Text style={styles.detailLabel}>Current Location: </Text>

                {loadingLoc ? (
                  <>
                    <ActivityIndicator
                      size="small"
                      color={COLORS.sub}
                      style={{ marginLeft: 6, marginRight: 2 }}
                    />
                    <Text style={[styles.detailValue, { marginLeft: 4 }]}>
                      Fetching GPS location...
                    </Text>
                  </>
                ) : pickupLocation ? (
                  <Text style={[styles.detailValue, { marginLeft: 4 }]}>
                    Lat {pickupLocation.lat?.toFixed(5)}, Lng{" "}
                    {pickupLocation.lng?.toFixed(5)}
                  </Text>
                ) : (
                  <Text
                    style={[
                      styles.detailValue,
                      { color: COLORS.sub, marginLeft: 4 },
                    ]}
                  >
                    Location unavailable — enter pickup manually
                  </Text>
                )}
              </View>
            </View>

            <View style={[styles.fieldBlock, { zIndex: 20 }]}>
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>Pickup Location</Text>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={loadCurrentPickupLocation}
                  disabled={loadingLoc}
                >
                  <Text style={styles.useCurrentText}>
                    {loadingLoc ? "Fetching..." : "Use Current"}
                  </Text>
                </TouchableOpacity>
              </View>

              {renderAutocomplete({
                refObj: pickupRef,
                value: pickup,
                setValue: setPickup,
                placeholder: "Enter pickup location",
                type: "pickup",
                zIndex: 20,
              })}
            </View>

            <View style={[styles.fieldBlock, { zIndex: 10 }]}>
              <Text style={styles.fieldLabel}>Drop-off Location</Text>

              {renderAutocomplete({
                refObj: dropoffRef,
                value: dropoff,
                setValue: setDropoff,
                placeholder: "Enter destination",
                type: "dropoff",
                zIndex: 10,
              })}
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, sending && { opacity: 0.7 }]}
              onPress={onSubmit}
              activeOpacity={0.9}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Image
                    source={{
                      uri: "https://cdn-icons-png.flaticon.com/512/2972/2972185.png",
                    }}
                    style={styles.btnIcon}
                  />
                  <Text style={styles.primaryText}>Book Bike Ride</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 40,
    marginLeft: 16,
  },

  backArrow: {
    fontSize: 22,
    color: COLORS.sub,
    marginRight: 6,
    marginTop: -5,
  },

  backText: {
    color: COLORS.sub,
    fontSize: 14,
    fontWeight: "600",
  },

  centerWrap: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 20,
  },

  cardWrap: {
    width: "100%",
    maxWidth: 700,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.blueSoft,
    borderWidth: 1,
    borderColor: COLORS.blueBorder,
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },

  headerIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.blueMain,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  headerIcon: {
    width: 22,
    height: 22,
    tintColor: "#FFFFFF",
  },

  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  title: {
    color: COLORS.blueDark,
    fontWeight: "800",
    lineHeight: 24,
    flexShrink: 1,
  },

  subtitle: {
    color: COLORS.sub,
    marginTop: 2,
    lineHeight: 18,
    flexShrink: 1,
  },

  detailsCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },

  detailsHeading: {
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 10,
    fontSize: 15,
  },

  detailRow: {
    marginBottom: 8,
    flexWrap: "wrap",
  },

  rowAlign: {
    flexDirection: "row",
    alignItems: "center",
  },

  infoIcon: {
    width: 16,
    height: 16,
    tintColor: COLORS.blueDark,
    marginRight: 8,
  },

  detailLabel: {
    fontWeight: "800",
    color: COLORS.text,
  },

  detailValue: {
    color: COLORS.text,
    flexShrink: 1,
  },

  fieldBlock: {
    marginBottom: 14,
  },

  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  fieldLabel: {
    color: COLORS.text,
    fontWeight: "700",
    marginBottom: 6,
  },

  useCurrentText: {
    color: COLORS.blueMain,
    fontWeight: "800",
    fontSize: 12,
    marginBottom: 6,
  },

  autoWrap: {
    position: "relative",
  },

  placesContainer: {
    flex: 0,
  },

  placesTextInputContainer: {
    height: 50,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 12,
    alignItems: "center",
    paddingHorizontal: 0,
  },

  inputIconBox: {
    height: 48,
    width: 42,
    alignItems: "center",
    justifyContent: "center",
  },

  inputIcon: {
    width: 18,
    height: 18,
    tintColor: "#6B7280",
  },

  placesTextInput: {
    flex: 1,
    height: 48,
    backgroundColor: "transparent",
    color: COLORS.text,
    fontSize: 15,
    paddingHorizontal: 0,
  },

  placesListView: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 12,
    marginTop: 6,
    elevation: 8,
    zIndex: 9999,
  },

  placesRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },

  placesDescription: {
    color: COLORS.text,
    fontSize: 14,
  },

  placesSeparator: {
    height: 1,
    backgroundColor: COLORS.cardBorder,
  },

  primaryBtn: {
    marginTop: 8,
    backgroundColor: COLORS.blueMain,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    shadowColor: COLORS.blueMain,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 3,
  },

  btnIcon: {
    width: 20,
    height: 20,
    tintColor: "#FFFFFF",
    marginRight: 10,
  },

  primaryText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 15,
    letterSpacing: 0.3,
  },
});