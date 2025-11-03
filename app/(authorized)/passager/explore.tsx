import { ThemedView } from '@/components/ThemedView';
import { useAuthSession } from '@/providers/AuthProvider';
import UserService from '@/services/UserService';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';

export default function ExploreScreen() {
  const { token } = useAuthSession();
  const webRef = useRef<WebView>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [markers, setMarkers] = useState<Array<{ id: string; latitude: number; longitude: number; title: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      if (token?.current) {
        UserService.getNearbyUsers(
          { latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 },
          token.current
        )
          .then(res => res.text())
          .then(txt => (txt ? JSON.parse(txt) : []))
          .catch(() => [])
          .then(data => setMarkers(data))
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    })();
  }, [token]);

  const leafletHTML = userLocation
  ? `
  <html>
    <head>
      <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css"/>
      <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
      <style>
        #map { height: 100%; width: 100%; margin:0; padding:0; }
        body { margin:0; }
        .big-popup .leaflet-popup-content {
          font-size: 22px;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map').setView([${userLocation.latitude}, ${userLocation.longitude}], 13);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

        var userMarker = L.marker([${userLocation.latitude}, ${userLocation.longitude}])
          .addTo(map)
          .bindPopup("Vous", { className: "big-popup" })
          .openPopup();

        ${markers.map(m => `
          L.marker([${m.latitude}, ${m.longitude}], {title: "${m.title}"})
            .addTo(map)
            .bindPopup("${m.title}");
        `).join('\n')}

        document.addEventListener('message', function(e) {
          try {
            var msg = JSON.parse(e.data);
            if (msg.type === 'recenter') {
              map.panTo(userMarker.getLatLng());
              userMarker.openPopup();
            }
          } catch (_) {}
        });
      </script>
    </body>
  </html>
`
  : '';



  const recenter = () => {
    if (!userLocation) return;
    webRef.current?.postMessage(JSON.stringify({ type: 'recenter', lat: userLocation.latitude, lng: userLocation.longitude }));
  };

  return (
    <ThemedView style={styles.container}>
      {loading && <ActivityIndicator style={styles.loaderOverlay} size="large" />}
      {!loading && userLocation && <WebView ref={webRef} originWhitelist={['*']} source={{ html: leafletHTML }} style={styles.map} />}
      <TouchableOpacity style={styles.recenterBtn} onPress={recenter}>
        <Ionicons name="locate-outline" size={28} color="#fff" />
      </TouchableOpacity>
    </ThemedView>
  );
}

const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  recenterBtn: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#007AFF',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
