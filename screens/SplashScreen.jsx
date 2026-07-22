import React, { useEffect, useState } from "react";
import {
  View,
  Image,
  Text,
  StyleSheet,
  Alert,
  PermissionsAndroid,
  Platform,
} from "react-native";
import Geolocation from "@react-native-community/geolocation"; 
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Splash({ navigation }) {
  const [loading, setLoading] = useState(true); 

  useEffect(() => {
    
    const requestPermission = async () => {
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: "Location Permission",
            message: "We need your location to provide services.",
            buttonPositive: "OK",
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            "Permission Denied",
            "Please enable location permission in Settings."
          );
          return false;
        }

       
        const backgroundGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION
        );
        if (backgroundGranted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            "Background Location Permission",
            "Please enable background location permission in Settings."
          );
          return false;
        }
      }
      return true;
    };

    
    const tryGetLocation = (enableHighAccuracy, attempt) => {
      console.log(`📍 Attempt ${attempt}: enableHighAccuracy=${enableHighAccuracy}`);
      return new Promise((resolve, reject) => {
        Geolocation.getCurrentPosition(
          (pos) => resolve(pos.coords),
          (error) => reject(error),
          { enableHighAccuracy, timeout: 20000, maximumAge: 10000 }
        );
      });
    };

    
    const getLocationAndSave = async () => {
      const hasPermission = await requestPermission();
      if (!hasPermission) return false;

      const attempts = [
        { accuracy: true, label: "High" },
        { accuracy: false, label: "Medium" },
        { accuracy: false, label: "Low" },
      ];

      
      for (let i = 0; i < attempts.length; i++) {
        try {
          const coords = await tryGetLocation(attempts[i].accuracy, i + 1);
          console.log(`✅ Success on ${attempts[i].label} accuracy:`, coords);
          await AsyncStorage.setItem("userLocation", JSON.stringify(coords));
          return true; // Got location
        } catch (error) {
          console.warn(`⚠️ Attempt ${i + 1} failed (${attempts[i].label}):`, error.message);
          if (i === attempts.length - 1) {
            Alert.alert(
              "Location Error",
              "Unable to determine your location. Please check GPS or network settings and try again."
            );
          }
        }
      }
      return false;
    };

    
    const run = async () => {
      setLoading(true); 
      const hasLocationSaved = await getLocationAndSave();
      if (!hasLocationSaved) {
        Alert.alert("Error", "Failed to get location. Please check your permissions.");
      }
      setLoading(false); 
      
      navigation.replace("RoleSelect");
    };

    const t = setTimeout(run, 600); 
    return () => clearTimeout(t);
  }, [navigation]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Image
          source={require("../assets/logo.jpg")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.moto}>
          The Last Hope – Quick Help in Every Emergency.
        </Text>
      </View>
    );
  }

  return null; 
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white", justifyContent: "center", alignItems: "center" },
  logo: { width: 350, height: 350 },
  moto: {
    marginTop: 24,
    fontSize: 20,
    fontWeight: "700",
    color: "#11304C", 
    fontStyle: "italic",
    textAlign: "center",
    letterSpacing: 1.1,
    paddingHorizontal: 30,
  },
});
