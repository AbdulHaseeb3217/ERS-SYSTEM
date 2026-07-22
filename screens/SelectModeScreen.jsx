// screens/SelectModeScreen.jsx
import React, { useRef } from "react";
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Pressable,
  Platform,
} from "react-native";

const C = {
  bg: "#F8FAFC",
  white: "#FFFFFF",
  text: "#0F172A",
  sub: "#6B7C93",
  red: "#DC2626",
  blue: "#2563EB",
  border: "#E5E7EB",
  tintBlue: "rgba(37,99,235,0.09)",
  tintRed: "rgba(220,38,38,0.08)",
  tintLight: "rgba(255,255,255,0.6)",
};

const ambulanceIcon = require("../assets/ambulance.png");
const bikeIcon = require("../assets/sportbike.png");

export default function SelectModeScreen({ navigation }) {
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />

      
      <View style={s.bgLayerBlue} />
      <View style={s.bgLayerRed} />
      <View style={s.bgLayerWhite} />

      <View style={s.wrap}>
        <Text style={s.heading}>Select Your Mode</Text>
        <Text style={s.subheading}>Choose how you’d like to continue</Text>

        
        <BounceCard
          baseStyle={s.cardAmb}
          pressedStyle={s.cardPressedAmb}  
          onPress={() => navigation.navigate("ADriverLogin")}
        >
          <View style={s.cardInner}>
            <View style={s.iconCircleAmb}>
              <Image source={ambulanceIcon} style={[s.iconImg, { tintColor: "#FFF" }]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitleAmb}>Ambulance Driver</Text>
              <Text style={s.cardSub}>Emergency medical transport service</Text>
            </View>
          </View>
        </BounceCard>

       
        <BounceCard
          baseStyle={s.cardBike}
          pressedStyle={s.cardPressedBike}
          onPress={() => navigation.navigate("BRiderLogin")}
        >
          <View style={s.cardInner}>
            <View style={s.iconCircleBike}>
              <Image source={bikeIcon} style={[s.iconImg, { tintColor: "#FFF" }]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitleBike}>Bike Rider</Text>
              <Text style={s.cardSub}>Fast transport & delivery services</Text>
            </View>
          </View>
        </BounceCard>

        <Text style={s.footer}>Version 1.0  |  © 2025 The Last Hope ERS</Text>
      </View>
    </SafeAreaView>
  );
}


function BounceCard({ baseStyle, pressedStyle, onPress, children }) {
  const scale = useRef(new Animated.Value(0)).current; 
  const animateTo = (to) => {
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: true, 
      speed: 18,
      bounciness: 6,
    }).start();
  };

  const transformStyle = {
    transform: [
      {
        scale: scale.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] }),
      },
    ],
  };

  return (
    <Pressable
      onPressIn={() => animateTo(1)}
      onPressOut={() => animateTo(0)}
      onPress={onPress}
      style={({ pressed }) => [
        baseStyle,
        pressed && pressedStyle, 
      ]}
    >
      <Animated.View style={transformStyle}>{children}</Animated.View>
    </Pressable>
  );
}


const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  bgLayerBlue: {
    position: "absolute",
    top: -100,
    right: -60,
    width: 300,
    height: 300,
    borderRadius: 200,
    backgroundColor: C.tintBlue,
  },
  bgLayerRed: {
    position: "absolute",
    bottom: -120,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: 200,
    backgroundColor: C.tintRed,
  },
  bgLayerWhite: {
    position: "absolute",
    top: "40%",
    left: "20%",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: C.tintLight,
  },

  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  heading: {
    color: C.text,
    fontWeight: "800",
    fontSize: 22,
    textAlign: "center",
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  subheading: {
    color: C.sub,
    fontSize: 13.5,
    textAlign: "center",
    marginBottom: 28,
  },

  cardInner: {
    flexDirection: "row",
    alignItems: "center",
  },

  
  cardAmb: {
    width: "92%",
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 18,
    marginVertical: 12,
    shadowColor: "rgba(220,38,38,0.35)",
    shadowOpacity: Platform.OS === "ios" ? 0.25 : 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    borderLeftWidth: 5,
    borderColor: C.red,
  },
  cardPressedAmb: {
    elevation: 10,
    shadowRadius: 18,
    shadowOpacity: Platform.OS === "ios" ? 0.35 : 0.28,
  },
  iconCircleAmb: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.red,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  cardTitleAmb: { color: C.red, fontWeight: "800", fontSize: 17 },

  // 🏍 Bike Card
  cardBike: {
    width: "92%",
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 18,
    marginVertical: 10,
    shadowColor: "rgba(37,99,235,0.35)",
    shadowOpacity: Platform.OS === "ios" ? 0.22 : 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    borderLeftWidth: 5,
    borderColor: C.blue,
  },
  cardPressedBike: {
    elevation: 10,
    shadowRadius: 18,
    shadowOpacity: Platform.OS === "ios" ? 0.32 : 0.26,
  },
  iconCircleBike: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.blue,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  cardTitleBike: { color: C.blue, fontWeight: "800", fontSize: 17 },

  // shared
  iconImg: { width: 26, height: 26, resizeMode: "contain" },
  cardSub: { color: C.sub, fontSize: 13, marginTop: 3 },

  footer: {
    position: "absolute",
    bottom: 18,
    color: C.sub,
    fontSize: 11.5,
    textAlign: "center",
  },
});
