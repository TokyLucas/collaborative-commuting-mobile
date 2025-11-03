import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';

type LatLng = { latitude: number; longitude: number };

type Props = {
  driverStart: LatLng;
  driverEnd: LatLng;
  passengerLocation?: LatLng | null;
};

export default function CondMapScreen({ driverStart, driverEnd, passengerLocation }: Props) {
  const webRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);

  const leafletHTML = `
    <html>
      <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css"/>
        <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
        <style>
          #map { height: 100%; width: 100%; margin:0; padding:0; }
          body { margin:0; }
          .leaflet-popup-content { font-size: 1.3em; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map');
          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
          var bigIcon = L.icon({
            iconUrl: "https://unpkg.com/leaflet/dist/images/marker-icon.png",
            iconSize: [50, 82],
            iconAnchor: [25, 82],
            popupAnchor: [0, -82]
          });
          var start = L.marker([${driverStart.latitude}, ${driverStart.longitude}], {icon: bigIcon})
            .addTo(map).bindPopup("Départ conducteur");
          var end = L.marker([${driverEnd.latitude}, ${driverEnd.longitude}], {icon: bigIcon})
            .addTo(map).bindPopup("Arrivée conducteur");
          var route = L.polyline([
            [${driverStart.latitude}, ${driverStart.longitude}],
            [${driverEnd.latitude}, ${driverEnd.longitude}]
          ], {color: 'blue'}).addTo(map);
          map.fitBounds(route.getBounds());
          document.addEventListener('message', function(e) {
            try {
              var msg = JSON.parse(e.data);
              if (msg.type === 'addPassenger') {
                var p = L.marker([msg.lat, msg.lng], {icon: bigIcon})
                  .addTo(map).bindPopup("Passager");
                map.panTo([msg.lat, msg.lng]);
              }
            } catch (_) {}
          });
        </script>
      </body>
    </html>
  `;

  useEffect(() => {
    if (passengerLocation && webRef.current) {
      webRef.current.postMessage(
        JSON.stringify({ type: 'addPassenger', lat: passengerLocation.latitude, lng: passengerLocation.longitude })
      );
    }
  }, [passengerLocation]);

  return (
    <ThemedView style={styles.container}>
      {loading && <ActivityIndicator style={styles.loaderOverlay} size="large" />}
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html: leafletHTML }}
        style={styles.map}
        onLoadEnd={() => setLoading(false)}
      />
      <TouchableOpacity style={styles.recenterBtn} onPress={() => {
        webRef.current?.postMessage(JSON.stringify({ type: 'recenter' }));
      }}>
        <Ionicons name="locate-outline" size={28} color="#fff" />
      </TouchableOpacity>
    </ThemedView>
  );
}

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
