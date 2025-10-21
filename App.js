import React, { useEffect, useState, useRef } from "react";
import {
  Platform,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Dimensions,
  Alert,
  ScrollView,
} from "react-native";
import * as Location from "expo-location";
import { db } from "./firebaseConfig";
import { ref, set, onValue, remove } from "firebase/database";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import MapScreen from "./screens/MapScreen";
import SettingsScreen from "./screens/SettingsScreen";
import { StatusBar } from "react-native";

// Import dynamique selon la plateforme (mobile ou web)
let MapView, Marker;
if (Platform.OS !== "web") {
  MapView = require("react-native-maps").default;
  Marker = require("react-native-maps").Marker;
} else {
  const { MapContainer, TileLayer, Marker: LeafletMarker, Popup } = require("react-leaflet");
  MapView = ({ children }) => (
    <MapContainer
      center={[48.8566, 2.3522]}
      zoom={12}
      style={{ width: "100%", height: "100%" }}
      scrollWheelZoom={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap"
      />
      {children}
    </MapContainer>
  );
  Marker = ({ coordinate, title }) => (
    <LeafletMarker position={[coordinate.latitude, coordinate.longitude]}>
      <Popup>{title}</Popup>
    </LeafletMarker>
  );
}

export default function App() {
  const [joined, setJoined] = useState(false);
  const [convoyId, setConvoyId] = useState("");
  const [username, setUsername] = useState("");
  const [location, setLocation] = useState(null);
  const [members, setMembers] = useState({});
  const [destination, setDestination] = useState(null);
  const [destinationInput, setDestinationInput] = useState("");

  const watchRef = useRef(null);
  const userIdRef = useRef("user_" + Math.floor(Math.random() * 100000));
  const Tab = createBottomTabNavigator();

  // 🎨 Thème sombre personnalisé
  const darkTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: "#0d0d0d",
      card: "#111",
      text: "#fff",
      border: "#222",
    },
  };

  // Demande permission localisation
  useEffect(() => {
    (async () => {
      if (Platform.OS !== "web") {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission requise", "Active la localisation pour utiliser Gamji !");
        }
      }
    })();
  }, []);

  const joinConvoy = async () => {
    if (!convoyId) {
      Alert.alert("Erreur", "Entre un nom de convoi.");
      return;
    }

    if (Platform.OS !== "web") {
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
      sendPosition(loc.coords);

      const watch = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Highest, distanceInterval: 5, timeInterval: 5000 },
        (loc) => {
          setLocation(loc.coords);
          sendPosition(loc.coords);
        }
      );
      watchRef.current = watch;
    } else {
      const fake = { latitude: 48.8566, longitude: 2.3522 };
      setLocation(fake);
      sendPosition(fake);
    }

    // Écoute les positions + destination en temps réel
    const convoyRef = ref(db, `convoys/${convoyId}`);
    onValue(convoyRef, (snap) => {
      const val = snap.val() || {};
      setMembers(val.positions || {});
      setDestination(val.destination || null);
    });

    setJoined(true);
  };

  const sendPosition = (coords) => {
    const r = ref(db, `convoys/${convoyId}/positions/${userIdRef.current}`);
    set(r, {
      latitude: coords.latitude,
      longitude: coords.longitude,
      name: username || userIdRef.current,
      timestamp: Date.now(),
    });
  };

  const leaveConvoy = async () => {
    if (watchRef.current) watchRef.current.remove();
    const r = ref(db, `convoys/${convoyId}/positions/${userIdRef.current}`);
    await remove(r);
    setJoined(false);
  };

  const setConvoyDestination = async () => {
    if (!destinationInput.trim()) return;
    let coords = null;

    // Si entrée = coordonnées
    if (destinationInput.includes(",")) {
      const [lat, lon] = destinationInput.split(",").map((x) => parseFloat(x.trim()));
      coords = { latitude: lat, longitude: lon };
    } else {
      // Sinon: API OpenStreetMap simple (geocodage)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destinationInput)}`
        );
        const data = await res.json();
        if (data && data.length > 0) {
          coords = {
            latitude: parseFloat(data[0].lat),
            longitude: parseFloat(data[0].lon),
          };
        } else {
          Alert.alert("Adresse non trouvée", "Essaye d’être plus précis !");
        }
      } catch (e) {
        console.warn(e);
      }
    }

    if (coords) {
      const r = ref(db, `convoys/${convoyId}/destination`);
      await set(r, coords);
      setDestination(coords);
      setDestinationInput("");
    }
  };

  // 🔥 UI principale
  

  return (
    <NavigationContainer theme={darkTheme}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "#111",
            borderTopColor: "#222",
            height: 70,
            paddingBottom: 10,
          },
          tabBarActiveTintColor: "#00bfff",
          tabBarInactiveTintColor: "#777",
          tabBarIcon: ({ color, size }) => {
            let iconName;
            if (route.name === "Carte") iconName = "map";
            else if (route.name === "Paramètres") iconName = "settings";
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarLabelStyle: { fontSize: 12, fontWeight: "bold" },
        })}
      >
        <Tab.Screen
          name="Carte"
          component={MapScreen}
          options={{
            tabBarLabel: "Carte",
          }}
        />
        <Tab.Screen
          name="Paramètres"
          component={SettingsScreen}
          options={{
            tabBarLabel: "Paramètres",
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );


  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <MapView style={styles.map}>
          {location && (
            <Marker coordinate={location} title={username || "Moi"} pinColor="cyan" />
          )}
          {destination && (
            <Marker coordinate={destination} title="Destination" pinColor="orange" />
          )}
          {Object.entries(members).map(([id, info]) => {
            if (!info || !info.latitude) return null;
            const isMe = id === userIdRef.current;
            return (
              <Marker
                key={id}
                coordinate={info}
                title={isMe ? "Moi" : info.name || id}
                pinColor={isMe ? "cyan" : "red"}
              />
            );
          })}
        </MapView>
      </View>

      {Platform.OS === "web" && joined && (
        <ScrollView style={styles.sidePanel}>
          <Text style={styles.sideTitle}>🧍 Membres du convoi</Text>
          {Object.values(members).map((m, i) => (
            <Text key={i} style={styles.sideText}>
              {m.name} 📍 {m.latitude.toFixed(4)}, {m.longitude.toFixed(4)}
            </Text>
          ))}
        </ScrollView>
      )}

      {/* Barre du bas */}
      <View style={styles.bottomPanel}>
        {!joined ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Ton pseudo"
              placeholderTextColor="#aaa"
              value={username}
              onChangeText={setUsername}
            />
            <TextInput
              style={styles.input}
              placeholder="Nom du convoi"
              placeholderTextColor="#aaa"
              value={convoyId}
              onChangeText={setConvoyId}
            />
            <TouchableOpacity style={styles.btn} onPress={joinConvoy}>
              <Text style={styles.btnText}>Rejoindre le convoi</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="Adresse ou lat,lon"
              placeholderTextColor="#aaa"
              value={destinationInput}
              onChangeText={setDestinationInput}
            />
            <TouchableOpacity style={styles.btn} onPress={setConvoyDestination}>
              <Text style={styles.btnText}>📍 Définir destination</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: "#cc3333" }]}
              onPress={leaveConvoy}
            >
              <Text style={styles.btnText}>Quitter le convoi</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111" },
  mapContainer: { flex: 1 },
  map: { width: Dimensions.get("window").width, height: Dimensions.get("window").height },
  bottomPanel: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#222",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  input: {
    backgroundColor: "#333",
    color: "#fff",
    padding: 8,
    marginVertical: 5,
    borderRadius: 6,
  },
  btn: {
    backgroundColor: "#007bff",
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
    marginVertical: 5,
  },
  btnText: { color: "#fff", fontWeight: "700" },
  sidePanel: {
    position: "absolute",
    right: 0,
    top: 0,
    backgroundColor: "#181818",
    width: 250,
    height: "100%",
    padding: 10,
    borderLeftColor: "#333",
    borderLeftWidth: 1,
  },
  sideTitle: { color: "#fff", fontWeight: "700", marginBottom: 10 },
  sideText: { color: "#ccc", marginBottom: 6 },
});
