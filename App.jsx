// App.jsx
import "react-native-gesture-handler";
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

//screens
import SplashScreen from "./screens/SplashScreen";
import PatientLoginScreen from "./screens/PatientLoginScreen";
import PatientRegisterScreen from "./screens/PatientRegisterScreen";
import ForgotPassword from "./screens/ForgotPassword";
import ResetPassword from "./screens/ResetPassword";
import PatientMenuScreen from "./screens/PatientMenuScreen";
import EmergencyAmbulanceScreen from "./screens/EmergencyAmbulanceScreen";
import BikeRideScreen from "./screens/BikeRideScreen";
import OrderMedicineScreen from "./screens/OrderMedicineScreen";
import PatientProfileScreen from "./screens/PatientProfileScreen";
import RoleSelectScreen from "./screens/RoleSelectScreen";
import selectModeScreen from "./screens/SelectModeScreen";
import AmbulanceDriverLoginScreen from "./screens/AmbulanceDriverLoginScreen";
import BikeRiderLoginScreen from "./screens/BikeRiderLoginScreen";
import AmbulanceDriverForgotScreen from "./screens/AmbulanceDriverForgotScreen";
import AmbulanceDriverResetScreen from "./screens/AmbulanceDriverResetScreen";
import AmbulanceDriverRegisterScreen from "./screens/AmbulanceDriverRegisterScreen";
import BikeRiderForgotScreen from "./screens/BikeRiderForgotScreen";
import BikeRiderResetScreen from "./screens/BikeRiderResetScreen";
import BikeRiderRegisterScreen from "./screens/BikeRiderRegisterScreen";
import PatientHistoryScreen from "./screens/PatientHistoryScreen";
import AmbulanceDriverMenuScreen from "./screens/AmbulanceDriverMenuScreen";
import AmbulanceDriverPastRidesScreen from "./screens/AmbulanceDriverPastRidesScreen";
import AmbulanceDriverProfileManagementScreen from "./screens/AmbulanceDriverProfileManagementScreen";
import BikeRiderMenuScreen from "./screens/BikeRiderMenuScreen";
import newscreen from "./screens/newscreen";
import BikeRiderPastHistoryScreen from "./screens/BikeRiderPastHistoryScreen";
import BikeRiderProfileManagementScreen from "./screens/BikeRiderProfileManagementScreen";
import PatientMap from "./screens/PatientMap";
import AmbulanceTrackingScreen from './screens/AmbulanceTrackingScreen';
import NoDriverAvailableScreen from './screens/NoDriverAvailableScreen';
import ActiveAmbulanceRideScreen from "./screens/ActiveAmbulanceRide";
import ActiveBikeRideScreen from "./screens/ActiveBikeRideScreen";
import BikeRiderTrackingScreen from "./screens/BikeRiderTrackingScreen";
import MedicineOrderTrackingScreen from "./screens/MedicineOrderTrackingScreen";
import ActiveMedicineDeliveryScreen from "./screens/ActiveMedicineDeliveryScreen";
import PatientSupportChatScreen from "./screens/PatientSupportChatScreen";
import AmbulanceDriverSupportChatScreen from "./screens/AmbulanceDriverSupportChatScreen";
import BikeRiderSupportChatScreen from "./screens/BikeRiderSupportChatScreen";



function AmbulanceDriverHome() {
  return (
    <Center title="Ambulance Driver Home" subtitle="Build this screen later" />
  );
}
function BikeRiderHome() {
  return <Center title="Bike Rider Home" subtitle="Build this screen later" />;
}


import { View, Text, StyleSheet } from "react-native";
import SelectModeScreen from "./screens/SelectModeScreen";
function Center({ title, subtitle }) {
  return (
    <View style={styles.center}>
      <Text style={styles.h1}>{title}</Text>
      <Text style={styles.sub}>{subtitle}</Text>
    </View>
  );
}

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          animation: "fade",
          orientation: "portrait_up",
        }}
      >

        

        <Stack.Screen name="Splash" component={SplashScreen} />


        <Stack.Screen name="newscr" component={newscreen} />

        
        <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />

        <Stack.Screen name="PatientMap" component={PatientMap} />

     
        <Stack.Screen name="PatientLogin" component={PatientLoginScreen} />
        <Stack.Screen name="PatientRegister" component={PatientRegisterScreen} />
        <Stack.Screen name="Forgot" component={ForgotPassword} />
        <Stack.Screen name="Reset" component={ResetPassword} />
        <Stack.Screen
          name="PatientHistory" 
          component={PatientHistoryScreen} 
        />



        
        <Stack.Screen name="PatientMenu" component={PatientMenuScreen} />
        <Stack.Screen name="EmergencyAmbulance" component={EmergencyAmbulanceScreen} />
        <Stack.Screen name="BikeRide" component={BikeRideScreen} />
        <Stack.Screen name="OrderMedicine" component={OrderMedicineScreen} />
        <Stack.Screen name="PatientProfile" component={PatientProfileScreen} />
        <Stack.Screen name="SelectMode" component={SelectModeScreen}/>
        <Stack.Screen name="ADriverLogin" component={AmbulanceDriverLoginScreen} />
        <Stack.Screen name="DForgotPass" component={AmbulanceDriverForgotScreen}/>
        <Stack.Screen name="AResetPass" component={AmbulanceDriverResetScreen}/>
        <Stack.Screen name="BRiderLogin" component={BikeRiderLoginScreen} />
        <Stack.Screen name="BRiderforgot" component={BikeRiderForgotScreen}/>
        <Stack.Screen name="BRiderReset" component={BikeRiderResetScreen}/>
        <Stack.Screen name="ADriverRegister" component={AmbulanceDriverRegisterScreen}/>
        <Stack.Screen name="BRiderRegister" component={BikeRiderRegisterScreen}/>
        <Stack.Screen name="AmbulanceTracking" component={AmbulanceTrackingScreen} />
        <Stack.Screen name="NoDriverAvailable" component={NoDriverAvailableScreen} />
        <Stack.Screen name="ActiveAmbulanceRide" component={ActiveAmbulanceRideScreen} />
        <Stack.Screen name="ActiveBikeRide" component={ActiveBikeRideScreen} />
        <Stack.Screen name="BikeRiderTracking" component={BikeRiderTrackingScreen}/>
        <Stack.Screen name="MedicineOrderTracking" component={MedicineOrderTrackingScreen} />
        <Stack.Screen name="ActiveMedicineDelivery" component={ActiveMedicineDeliveryScreen} />
        <Stack.Screen name="PatientSupportChat" component={PatientSupportChatScreen} />
        <Stack.Screen name="BikeRiderSupportChat" component={BikeRiderSupportChatScreen} />


        <Stack.Screen name="AmbulanceDriverSupportChat" component={AmbulanceDriverSupportChatScreen} />

        <Stack.Screen
          name="BikeRiderMenu"
          component={BikeRiderMenuScreen}
        />
        <Stack.Screen
          name="AmbulanceDriverProfileManagement"
          component={AmbulanceDriverProfileManagementScreen}
        />
        <Stack.Screen
          name="AmbulanceDriverMenu"
          component={AmbulanceDriverMenuScreen}
        />


    <Stack.Screen
          name="AmbulanceDriverPastRides"
          component={AmbulanceDriverPastRidesScreen}
        />
    <Stack.Screen
          name="BikeRiderPastHistory"
          component={BikeRiderPastHistoryScreen}
        />
    <Stack.Screen
          name="BikeRiderProfileManagement"
          component={BikeRiderProfileManagementScreen}
        />
        
       
       
        
      </Stack.Navigator>
    </NavigationContainer>
 
);
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  h1: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
  sub: { marginTop: 8, color: "#64748B" },
});
