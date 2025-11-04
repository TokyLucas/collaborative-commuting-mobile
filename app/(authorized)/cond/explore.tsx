import { ThemedView } from '@/components/ThemedView';
import { useAuthSession } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';

type Marker = {
  id: string;
  pointDepart: string;
  latDepart: number;
  lngDepart: number;
  pointArrivee: string;
  latArrivee: number;
  lngArrivee: number;
  heureDepartEstimee: string;
  placesDisponibles: number;
  statut: string;
  carBrand: string;
  carModel: string;
  carColor: string;
  carNbPlaces: number;
};

export default function ExploreScreen() {
  const { token, user } = useAuthSession();
  const webRef = useRef<WebView>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [loading, setLoading] = useState(true);
  const [disponibilite, setDisponibilite] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let subscription: Location.LocationSubscription;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError("Permission de localisation refusée");
          setLoading(false);
          return;
        }
        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Highest, timeInterval: 1000, distanceInterval: 0 },
          async (loc) => {
            const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            setUserLocation(coords);

            if (token?.current && user?.current) {
              try {
                const res = await fetch(
                  `${process.env.EXPO_PUBLIC_API_BASEURL}/api/disponibilites/conducteur/${user.current}`,
                  { headers: { Authorization: `Bearer ${token.current}` } }
                );
                if (res.ok) {
                  setDisponibilite(await res.json());
                } else if (res.status === 404) {
                  setDisponibilite(null); 
                } else {
                  const text = await res.text();
                  console.error("Erreur GET dispo:", res.status, text);
                  setError("Impossible de récupérer la disponibilité");
                }
              } catch (e) {
                console.error("Erreur réseau GET dispo:", e);
                setError("Erreur réseau");
              }
            }

            setLoading(false);
          }
        );
      } catch (e) {
        console.error("Erreur init localisation:", e);
        setError("Erreur de localisation");
        setLoading(false);
      }
    })();
    return () => {
      subscription && subscription.remove();
    };
  }, [token, user]);

  const leafletHTML = userLocation
  ? `
    <html>
      <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css"/>
        <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
        <style>
          #map { height: 100%; width: 100%; margin:0; padding:0; }
          body { margin:0; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          // Expose à window pour y accéder depuis le recenter
          window.map = L.map('map').setView([${userLocation.latitude}, ${userLocation.longitude}], 30);
          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(window.map);
          window.userMarker = L.marker([${userLocation.latitude}, ${userLocation.longitude}]).addTo(window.map).bindPopup("Vous").openPopup();

          // Écoute les messages du WebView
          function handleMessage(event) {
            try {
              var data = JSON.parse(event.data);
              if (data.type === 'recenter' && data.lat && data.lng) {
                window.map.setView([data.lat, data.lng], window.map.getZoom());
                if (window.userMarker) {
                  window.userMarker.setLatLng([data.lat, data.lng]);
                }
              }
            } catch (e) { /* ignore */ }
          }

          // Android: document.addEventListener('message')
          document.addEventListener('message', handleMessage);
          // iOS: window.addEventListener('message')
          window.addEventListener('message', handleMessage);
        </script>
      </body>
    </html>
  `
  : '';


    const recenter = () => {
      if (!userLocation || !webRef.current) return;
      const js = `
        if (window.map) {
          window.map.setView([${userLocation.latitude}, ${userLocation.longitude}], window.map.getZoom());
          if (window.userMarker) { window.userMarker.setLatLng([${userLocation.latitude}, ${userLocation.longitude}]); }
        }
        true; // nécessaire pour iOS
      `;
      webRef.current.injectJavaScript(js);
    };
    

  const toggleDisponibilite = async () => {
    if (!userLocation || !token?.current || !user?.current) return;
  
    try {
      const check = await fetch(
        `${process.env.EXPO_PUBLIC_API_BASEURL}/api/disponibilites/conducteur/${user.current}`,
        { headers: { Authorization: `Bearer ${token.current}` } }
      );
  
      if (check.ok) {
        const existing = await check.json();
        setDisponibilite(existing);
  
        const newStatut = existing.statut === "AVAILABLE" ? "UNAVAILABLE" : "AVAILABLE";
        const res = await fetch(
          `${process.env.EXPO_PUBLIC_API_BASEURL}/api/disponibilites/statut/${user.current}?statut=${newStatut}`,
          { method: "PUT", headers: { Authorization: `Bearer ${token.current}` } }
        );
        if (res.ok) {
          setDisponibilite(await res.json());
        }
      } else if (check.status === 404) {
        const body = {
          conducteurId: user.current,
          position: { type: "Point", coordinates: [userLocation.longitude, userLocation.latitude] },
          statut: "AVAILABLE"
        };
        const res = await fetch(`${process.env.EXPO_PUBLIC_API_BASEURL}/api/disponibilites`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token.current}` },
          body: JSON.stringify(body)
        });
        if (res.ok) {
          setDisponibilite(await res.json());
        }
      }
    } catch (e) {
      console.error("Erreur toggleDisponibilite:", e);
    }
  };

  const updatePosition = async () => {
    if (!userLocation || !disponibilite || !token?.current || !user?.current) return;
    try {
      const body = {
        conducteurId: user.current,
        position: { type: "Point", coordinates: [userLocation.longitude, userLocation.latitude] },
        statut: disponibilite.statut
      };
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_BASEURL}/api/disponibilites/position/${user.current}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token.current}` },
          body: JSON.stringify(body)
        }
      );
      if (res.ok) {
        setDisponibilite(await res.json());
      }
    } catch (e) {
      console.error("Erreur update position:", e);
    }
  };

  return (
    <ThemedView style={styles.container}>
      {loading && <ActivityIndicator style={styles.loaderOverlay} size="large" />}
      {error && <Text style={{ color: "red", textAlign: "center" }}>{error}</Text>}
      {!loading && userLocation && leafletHTML ? (
        <WebView ref={webRef} originWhitelist={['*']} source={{ html: leafletHTML }} style={styles.map} />
      ) : (
        !loading && <Text style={{ textAlign: 'center', marginTop: 20 }}>Chargement de la carte...</Text>
      )}

      {disponibilite && (
        <Text style={styles.statusText}>
          Statut actuel : {disponibilite.statut === "AVAILABLE" ? "Disponible" : "Plein"}
        </Text>
      )}

      {disponibilite && (
        <TouchableOpacity style={styles.toggleBtn} onPress={toggleDisponibilite}>
          <Text style={styles.dispoBtnText}>
            {disponibilite.statut === "AVAILABLE" ? "Rendre inactif" : "Rendre actif"}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.bottomRightBtns}>
        <TouchableOpacity style={styles.recenterBtn} onPress={recenter}>
          <Ionicons name="locate-outline" size={28} color="#fff" />
        </TouchableOpacity>

        {disponibilite && (
          <TouchableOpacity style={styles.updateBtn} onPress={updatePosition}>
            <Text style={styles.dispoBtnText}>Mettre à jour</Text>
          </TouchableOpacity>
        )}
      </View>

      {!disponibilite && (
        <TouchableOpacity style={styles.initBtn} onPress={toggleDisponibilite}>
          <Text style={styles.dispoBtnText}>Initier une disponibilité</Text>
        </TouchableOpacity>
      )}
    </ThemedView>
  );
}


const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  statusText: {
    position: 'absolute',
    top: 40,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    fontSize: 14,
  },

  toggleBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: '#FF9500',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    elevation: 4,
  },

  bottomRightBtns: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  recenterBtn: {
    backgroundColor: '#007AFF',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },

  updateBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    elevation: 4,
    marginLeft: 10,
  },

  initBtn: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    backgroundColor: '#34C759',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    elevation: 4,
  },

  dispoBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
