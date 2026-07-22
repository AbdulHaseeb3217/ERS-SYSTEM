// screens/RoleSelectScreen.jsx
import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Platform,
} from "react-native";

const COLORS = {
  bg: "#F5F7FA",
  text: "#0F172A",
  sub: "#64748B",
  white: "#FFFFFF",

  blueSoft: "#E9F0FF",
  blueMain: "#2563EB",
  blueBorder: "#C9D7FF",

  redSoft: "#FEECEC",
  redMain: "#DC2626",
  redBorder: "#F5B6B6",
};

export default function RoleSelectScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrap}>
     
        <Image
        
          source={require("../assets/logo.jpg")}
          style={styles.logo}
        />

       
        <Text style={styles.title}>THE LAST HOPE</Text>
        <Text style={styles.subtitle}>Emergency Response System</Text>

        {/* Buttons */}
        <View style={styles.buttons}>
          {/* Patient App */}
          <Pressable
            style={({ pressed }) => [
              styles.card,
              styles.blueCard,
              pressed && styles.pressed,
            ]}
            android_ripple={{ color: "rgba(37, 99, 235, 0.12)" }}
            onPress={() => navigation.navigate("PatientLogin")}
          >
            <View style={styles.leftIconCircleBlue}>
              <Image
                source={{
                  uri: "https://cdn-icons-png.flaticon.com/512/1077/1077012.png",
                }}
                style={styles.leftIcon}
              />
            </View>
            <View style={styles.cardTextWrap}>
              <Text style={[styles.cardTitle, { color: COLORS.blueMain }]}>
                Patient App
              </Text>
              <Text style={styles.cardSub}>
                Book ambulance, rides & order medicine
              </Text>
            </View>
            <Image
              source={{
                uri: "https://cdn-icons-png.flaticon.com/512/271/271228.png",
              }}
              style={[styles.chev, { tintColor: COLORS.blueMain }]}
            />
          </Pressable>

          {/* Driver (Ambulance / Bike) */}
          <Pressable
            style={({ pressed }) => [
              styles.card,
              styles.redCard,
              pressed && styles.pressed,
            ]}
            android_ripple={{ color: "rgba(220, 38, 38, 0.12)" }}
            onPress={() => navigation.navigate("SelectMode")}
          >
            <View style={styles.leftIconCircleRed}>
              <Image
                source={{
                  uri: "https://cdn-icons-png.flaticon.com/512/2966/2966327.png",
                }}
                style={styles.leftIcon}
              />
            </View>
            <View style={styles.cardTextWrap}>
              <Text style={[styles.cardTitle, { color: COLORS.redMain }]}>
                Driver (Ambulance / Bike)
              </Text>
              <Text style={styles.cardSub}>
                Accept jobs, navigate & view history
              </Text>
            </View>
            <Image
              source={{
                uri: "https://cdn-icons-png.flaticon.com/512/271/271228.png",
              }}
              style={[styles.chev, { tintColor: COLORS.redMain }]}
            />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  wrap: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center", 
  },

 
  logo: {
    width: 86,
    height: 86,
    borderRadius: 43,
    marginBottom: 10,
    // subtle ring
    borderWidth: 3,
    borderColor: "#F1C7C7",
    backgroundColor: "#FFF",
  },
  title: {
    fontSize: 23,
    fontWeight: "800",
    color: "#D11F1F",
    textAlign: "center",
  },
  subtitle: {
    color: COLORS.sub,
    marginTop: 4,
    marginBottom: 25,
    textAlign: "center",
  },

  
  buttons: {
    width: "100%",
    gap: 25, 
  },

  /* Cards */
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 19,
    borderWidth: 1,
  },
  blueCard: { backgroundColor: COLORS.blueSoft, borderColor: COLORS.blueBorder },
  redCard: { backgroundColor: COLORS.redSoft, borderColor: COLORS.redBorder },

  leftIconCircleBlue: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.blueMain,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  leftIconCircleRed: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.redMain,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  leftIcon: { width: 22, height: 22, tintColor: "#FFFFFF" },

  cardTextWrap: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 16, fontWeight: "800" },
  cardSub: { marginTop: 4, color: COLORS.sub },

  chev: { width: 18, height: 24, marginLeft: 10, opacity: 0.8 },

  pressed: Platform.select({
    ios: { opacity: 0.85 },
    android: {},
  }),
});
