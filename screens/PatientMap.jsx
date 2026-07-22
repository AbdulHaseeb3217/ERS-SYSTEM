import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, Text, StyleSheet, Dimensions } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';

const { width, height } = Dimensions.get('window');

const PatientMap = () => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true); 

  useEffect(() => {
    // Function to fetch location
    const fetchLocation = async () => {
      try {
        Geolocation.getCurrentPosition(
          (position) => {
            setLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            });
            setLoading(false); // Location fetched, stop loading
          },
          (error) => {
            Alert.alert("Location Error", "Failed to get your location.");
            setLoading(false); // Error occurred, stop loading
            console.error(error);
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
      } catch (error) {
        setLoading(false); 
        console.log("Error fetching location:", error);
      }
    };

    fetchLocation();
  }, []);

  if (loading) {
    return <Text>Loading map...</Text>; // Show loading text until location is fetched
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Text style={{ textAlign: 'center', margin: 20 }}>Patient's Current Location</Text>
      <View style={{ flex: 1 }}>
        {location && (
          <MapView
            style={{ width, height }}
            initialRegion={location}
            showsUserLocation={true}
          >
            <Marker coordinate={location} />
          </MapView>
        )}
      </View>
    </SafeAreaView>
  );
};

export default PatientMap;
