import { ThemedView } from '@/components/ThemedView';
import { useAuthSession } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import CarService from '../../../services/CarService';
import TrajetConducteurService from '../../../services/TrajetConducteurService';

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
  const { token } = useAuthSession();
  const webRef = useRef<WebView>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let subscription: Location.LocationSubscription;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLoading(false);
        return;
      }
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Highest, timeInterval: 5000, distanceInterval: 0 },
        async (loc) => {
          const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setUserLocation(coords);
          try {
            const nearbyDrivers: any[] = []; // à remplacer par ton fetch réel
            const enriched: Marker[] = await Promise.all(
              nearbyDrivers.map(async (d: any) => {
                let car = null;
                let trajet = null;
                if (token?.current) {
                  try {
                    car = await CarService.getById(d.id, token.current);
                  } catch {}
                  try {
                    const res = await TrajetConducteurService.getByConducteurId(d.id, token.current);
                    trajet = await res.json();
                  } catch {}
                }
                return {
                  id: trajet?.id || d.id,
                  pointDepart: trajet?.pointDepart || "",
                  latDepart: trajet?.latDepart || 0,
                  lngDepart: trajet?.lngDepart || 0,
                  pointArrivee: trajet?.pointArrivee || "",
                  latArrivee: trajet?.latArrivee || 0,
                  lngArrivee: trajet?.lngArrivee || 0,
                  heureDepartEstimee: trajet?.heureDepartEstimee || "",
                  placesDisponibles: trajet?.placesDisponibles || 0,
                  statut: trajet?.statut || "",
                  carBrand: car?.brand || "",
                  carModel: car?.model || "",
                  carColor: car?.color || "",
                  carNbPlaces: car?.nbPlaces || 0,
                };
              })
            );
            setMarkers(enriched);
          } catch (e) {}
          setLoading(false);
        }
      );
    })();
    return () => {
      subscription && subscription.remove();
    };
  }, [token]);

  const markersHTML = markers
    .map((m) => {
      const brandModel = m.carBrand && m.carModel ? `${m.carBrand} ${m.carModel}` : "Voiture inconnue";
      const color = m.carColor || "";
      const nbPlaces = m.carNbPlaces || "";
      const dispo = m.placesDisponibles ?? "";
      const depart = m.pointDepart || "";
      const arrivee = m.pointArrivee || "";
      const heure = m.heureDepartEstimee ? new Date(m.heureDepartEstimee).toLocaleString() : "";
      return `
        L.marker([${m.latDepart}, ${m.lngDepart}], { icon: bigIcon })
          .addTo(map)
          .bindPopup("<b>${brandModel}</b><br/>Couleur: ${color}<br/>Places: ${nbPlaces} (restantes: ${dispo})<br/>${depart} ➝ ${arrivee}<br/>Départ: ${heure}");
      `;
    })
    .join('\n');

  const leafletHTML = userLocation
    ? `
  <html>
    <head>
      <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css"/>
      <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
      <style>
        #map { height: 100%; width: 100%; margin:0; padding:0; }
        body { margin:0; }
        .leaflet-popup-content { font-size: 1.5em; } /* popup 2x plus grand */
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map').setView([${userLocation.latitude}, ${userLocation.longitude}], 19);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

        // Icône personnalisée (x2)
        var bigIcon = L.icon({
          iconUrl: "https://unpkg.com/leaflet/dist/images/marker-icon.png",
          iconSize: [50, 82],
          iconAnchor: [25, 82],
          popupAnchor: [0, -82]
        });

        var userMarker = L.marker([${userLocation.latitude}, ${userLocation.longitude}], { icon: bigIcon })
          .addTo(map)
          .bindPopup("Vous", { className: "big-popup" })
          .openPopup();

        ${markersHTML}

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
    webRef.current?.postMessage(
      JSON.stringify({ type: 'recenter', lat: userLocation.latitude, lng: userLocation.longitude })
    );
  };

  return (
    <ThemedView style={styles.container}>
      {loading && <ActivityIndicator style={styles.loaderOverlay} size="large" />}
      {!loading && userLocation && (
        <WebView ref={webRef} originWhitelist={['*']} source={{ html: leafletHTML }} style={styles.map} />
      )}
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
