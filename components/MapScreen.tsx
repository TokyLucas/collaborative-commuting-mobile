import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Disponibilite, fetchNearbyDisponibilites } from '../services/disponibiliteService';

export default function MapScreen() {
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [markers, setMarkers] = useState<Disponibilite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Permission localisation refusée');
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });

      const nearby = await fetchNearbyDisponibilites(loc.coords.latitude, loc.coords.longitude);
      setMarkers(nearby);
      setLoading(false);
    })();
  }, []);

  if (loading || !userLocation) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const leafletHTML = `
    <html>
      <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css"/>
        <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
        <style> #map { height: 100%; width: 100%; margin:0; padding:0; } body { margin:0; } </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map').setView([${userLocation.latitude}, ${userLocation.longitude}], 13);
          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

          // Marqueur utilisateur
          L.marker([${userLocation.latitude}, ${userLocation.longitude}], {title: "Vous"}).addTo(map);

          // Marqueurs dynamiques
          ${markers.map(m => {
            const [lng, lat] = m.position.coordinates;
            return `L.marker([${lat}, ${lng}], {title: "ID: ${m.conducteurId}"}).addTo(map).bindPopup("${m.statut}");`;
          }).join('\n')}
        </script>
      </body>
    </html>
  `;

  return <WebView originWhitelist={['*']} source={{ html: leafletHTML }} style={{ flex: 1 }} />;
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
